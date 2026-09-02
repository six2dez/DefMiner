// packages/backend/src/store/export.spec.ts — the export serialiser's
// behavioural gate (UI-06, UISEC-02), and one of 05-UI-SPEC.md's six 🧪 backstop
// rows.
//
// ===========================================================================
// THIS FILE CARRIES THE EXECUTED EVIDENCE FOR BACKSTOP ROW
// `long-text / export-dialog`
// ===========================================================================
// The row reads: "R3's formula neutralisation (apostrophe prefix then
// quote-wrap, in that order) and R2's control-character strip, exercised by the
// hostile-content fixture: HTML tags, a `<script>` payload, a CSV formula
// payload, C0 controls and bidi overrides in one pass."
//
// A BACKSTOP ROW WITHOUT EXECUTED EVIDENCE RESOLVES TO `human_needed` AT VERIFY
// TIME AND NEVER TO A SILENT PASS. So the sweep below drives EVERY case in the
// SHARED hostile fixture through BOTH formats in BOTH redaction modes and
// asserts, per case, that no field's first content character is one of R3's six
// dangerous leads and that no C0/C1 control and no bidi override survives into
// the bytes. It asserts the exercised id set EQUALS `HOSTILE_CASE_IDS`, so a
// case added to the corpus fails here until it is accounted for.
//
// ===========================================================================
// WHAT THE STATIC GATES ALREADY COVER, SO THIS FILE DOES NOT
// ===========================================================================
// `sql-discipline.spec.ts` audits every non-spec `.ts` in this package —
// `export.ts` contains no SQL at all, which is the point rather than an
// accident: it reads through `reads.ts`'s audited statement matrix and adds no
// statement of its own. `error-redaction.spec.ts` asserts no error-shaped
// binding is rendered without `describeError`. `outbound-prohibition.spec.ts`
// asserts the shipped source issues no outbound call. None of them can assert
// what the module is FOR, which is what is here.

import { readFileSync } from "node:fs";

import type { PageRequest } from "@defminer/engine/contract";
import {
  EXPORT_REDACTION_MODES,
  EXPORT_TABLES,
} from "@defminer/engine/contract";
import { DANGEROUS_LEADS } from "@defminer/engine/csv";
import {
  HOSTILE_CASE_IDS,
  HOSTILE_CASES,
} from "@defminer/engine/hostile.fixture";
import {
  BIDI_OVERRIDES_ISOLATES,
  C0_C1_CONTROLS,
} from "@defminer/engine/sanitise";
import { SOURCES_LABEL_CASES } from "@defminer/engine/sourcemap/map-fixture";
import { beforeEach, describe, expect, it } from "vitest";

// A SPEC-ONLY cross-package import, and deliberately so: `isProtocolShapedLabel`
// restates this function's `"protocol"` branch because the shipped backend
// cannot depend on `@defminer/frontend`, and the drift gate below is what keeps
// the restatement honest. Nothing this import touches reaches shipped code.
import { sourcePathShape } from "../../../frontend/src/sourcemap/tree";
import { createFixtureDb } from "../../test/fixtures/sqlite-fixture";

import {
  EXPORT_COLUMNS,
  EXPORT_CONTENT_TYPES,
  EXPORT_QUERY_REDACTION,
  EXPORT_RPC_CHUNK_ROWS,
  type ExportableRow,
  type ExportChunkRequest,
  exportFilename,
  floorStatement,
  isProtocolShapedLabel,
  readExportChunk,
  redactSourceLabelForExport,
  redactUrlForExport,
  serialiseRows,
} from "./export";
import { migrate } from "./migrations";
import { QUERY_VALUE_REDACTION } from "./observations";
import { INVENTORY_TABLES } from "./reads";

const PROJECT = "proj-alpha";
const NOW = 1_767_000_000_000;

/** Neither regex may be used with `.test` directly: both carry `/g`, so
 *  `lastIndex` survives a call and every second probe answers `false`. Rebuilt
 *  without the flag, from the SAME source, so the ranges cannot drift. */
const ANY_CONTROL = new RegExp(C0_C1_CONTROLS.source);
const ANY_BIDI = new RegExp(BIDI_OVERRIDES_ISOLATES.source);

/** Every quoted field in a CSV document, in order. A regex rather than a split
 *  on `,`: a field may legitimately contain a comma, and a split would report a
 *  field that never existed. */
function csvFields(text: string): string[] {
  return text.match(/"(?:[^"]|"")*"/g) ?? [];
}

/** The CONTENT of a quoted field — the wrapping quotes removed and the doubled
 *  quotes undoubled. This is what a spreadsheet's parser hands the formula
 *  engine, which is the thing R3 is about. */
function fieldContent(field: string): string {
  return field.slice(1, -1).replaceAll('""', '"');
}

const NO_DEGRADATION = { total: 12, degraded: 0 } as const;
const SOME_DEGRADATION = { total: 12, degraded: 3 } as const;

function observationRow(overrides: Partial<ExportableRow> = {}): ExportableRow {
  return {
    project_id: PROJECT,
    sha256: "a".repeat(64),
    request_id: "req_1",
    url: "https://assets.example.test/app.js",
    status: 200,
    content_type: "application/javascript",
    observed_at: NOW,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// THE DELIMITED FORMAT
// ---------------------------------------------------------------------------

describe("the delimited format (UISEC-02, R3)", () => {
  it("emits one header row and one row per input row, every field quote-wrapped", () => {
    const text = serialiseRows({
      table: "observations",
      format: "csv",
      mode: "redacted",
      rows: [observationRow(), observationRow({ request_id: "req_2" })],
      chunkIndex: 0,
      lastChunk: true,
      counts: NO_DEGRADATION,
    });

    const lines = text.split("\r\n").filter((l) => l !== "");
    expect(lines).toHaveLength(3);

    const columns = EXPORT_COLUMNS.observations;
    // Every line carries exactly one field per column, and every field is
    // quoted. An unquoted field is not a cosmetic difference: it is a field a
    // bare comma can split.
    for (const line of lines) {
      const fields = csvFields(line);
      expect(fields).toHaveLength(columns.length);
      expect(fields.every((f) => f.startsWith('"') && f.endsWith('"'))).toBe(
        true,
      );
    }
    expect(csvFields(lines[0] ?? "").map(fieldContent)).toEqual(
      columns.map((c) => c.name),
    );
  });

  it("apostrophe-prefixes a dangerous lead BEFORE quoting — the ORDER, positionally", () => {
    const text = serialiseRows({
      table: "observations",
      format: "csv",
      mode: "raw",
      rows: [observationRow({ url: "=cmd|' /C calc'!A0" })],
      chunkIndex: 0,
      lastChunk: true,
      counts: NO_DEGRADATION,
    });

    const urlIndex = EXPORT_COLUMNS.observations.findIndex(
      (c) => c.name === "url",
    );
    const row = text.split("\r\n")[1] ?? "";
    const field = csvFields(row)[urlIndex] ?? "";

    // THE ORDERING, NOT THE PRESENCE. Reverse the two steps and the apostrophe
    // still appears — inside the quotes, after the `=`, where it changes
    // nothing. Index 0 is the wrapping quote, index 1 must be the apostrophe
    // and index 2 the character it neutralises.
    expect(field[0]).toBe('"');
    expect(field[1]).toBe("'");
    expect(field[2]).toBe("=");
  });
});

// ---------------------------------------------------------------------------
// THE STRUCTURED FORMAT
// ---------------------------------------------------------------------------

describe("the structured format", () => {
  it("emits one object per row with the same field values, control-stripped and NOT formula-neutralised", () => {
    const rows = [
      observationRow({ url: "=cmd|' /C calc'!A0" }),
      observationRow({ request_id: "req_2" }),
    ];
    const json = serialiseRows({
      table: "observations",
      format: "json",
      mode: "raw",
      rows,
      chunkIndex: 0,
      lastChunk: true,
      counts: NO_DEGRADATION,
    });

    const parsed = JSON.parse(json) as { rows: Record<string, string>[] };
    expect(parsed.rows).toHaveLength(2);
    expect(Object.keys(parsed.rows[0] ?? {})).toEqual(
      EXPORT_COLUMNS.observations.map((c) => c.name),
    );

    // R3's third bullet: the structured format needs the control strip and does
    // NOT need the neutralisation. An apostrophe here would be a value the
    // consumer has to know to strip.
    expect(parsed.rows[0]?.url).toBe("=cmd|' /C calc'!A0");

    // The SAME value the delimited format carries, once the CSV syntax is
    // removed. Two formats that disagree about a field value are two exports of
    // two different things.
    const csv = serialiseRows({
      table: "observations",
      format: "csv",
      mode: "raw",
      rows,
      chunkIndex: 0,
      lastChunk: true,
      counts: NO_DEGRADATION,
    });
    const urlIndex = EXPORT_COLUMNS.observations.findIndex(
      (c) => c.name === "url",
    );
    const csvUrl = fieldContent(
      csvFields(csv.split("\r\n")[1] ?? "")[urlIndex] ?? "",
    );
    expect(csvUrl).toBe(`'${parsed.rows[0]?.url ?? ""}`);
  });

  it("strips C0/C1 controls and bidi overrides from a structured field", () => {
    const json = serialiseRows({
      table: "observations",
      format: "json",
      mode: "raw",
      rows: [observationRow({ url: "a\u0000b\u009Fc\u202Ed" })],
      chunkIndex: 0,
      lastChunk: true,
      counts: NO_DEGRADATION,
    });
    const parsed = JSON.parse(json) as { rows: Record<string, string>[] };
    expect(parsed.rows[0]?.url).toBe("abcd");
  });
});

// ---------------------------------------------------------------------------
// REDACTION — AND WHAT NO MODE CAN RECOVER
// ---------------------------------------------------------------------------

describe("the two redaction modes (UI-06)", () => {
  it("names the redacted mode FIRST, so a positional mistake fails safe", () => {
    expect(EXPORT_REDACTION_MODES[0]).toBe("redacted");
    expect([...EXPORT_REDACTION_MODES]).toEqual(["redacted", "raw"]);
  });

  it("emits a covered field redacted in the redacted mode and as stored in the raw one", () => {
    const url = "https://assets.example.test/app.js?v=<redacted>&build=1";
    const of = (mode: "redacted" | "raw") =>
      JSON.parse(
        serialiseRows({
          table: "observations",
          format: "json",
          mode,
          rows: [observationRow({ url })],
          chunkIndex: 0,
          lastChunk: true,
          counts: NO_DEGRADATION,
        }),
      ) as { rows: Record<string, string>[] };

    expect(of("raw").rows[0]?.url).toBe(url);
    expect(of("redacted").rows[0]?.url).toBe(
      `https://assets.example.test/app.js${EXPORT_QUERY_REDACTION}`,
    );
  });

  it("cannot recover a value that was redacted at WRITE time — identical in BOTH modes (P-06, D-07)", () => {
    // `observations.ts` replaced the query VALUE with `QUERY_VALUE_REDACTION`
    // before the row was ever stored. The raw mode lifts the redaction applied
    // at EXPORT time and there is nothing else for it to lift: the original
    // bytes are not in the database. This is the fact the amended confirmation
    // copy states, and it is asserted rather than described.
    const stored = `https://assets.example.test/a.js?token=${QUERY_VALUE_REDACTION}`;
    const raw = JSON.parse(
      serialiseRows({
        table: "observations",
        format: "json",
        mode: "raw",
        rows: [observationRow({ url: stored })],
        chunkIndex: 0,
        lastChunk: true,
        counts: NO_DEGRADATION,
      }),
    ) as { rows: Record<string, string>[] };

    expect(raw.rows[0]?.url).toContain(QUERY_VALUE_REDACTION);
    expect(raw.rows[0]?.url).not.toContain("token=secret");
    // And the helper itself: a URL with no query is the same string in both
    // modes, because there is nothing there to withhold.
    const plain = "https://assets.example.test/a.js";
    expect(redactUrlForExport(plain)).toBe(plain);
  });

  it("produces byte-identical output in both modes for a table with NO covered column", () => {
    // `artifacts` carries no target-controlled column at all. The two modes are
    // therefore the same file, and the ceremony in front of the raw one is
    // unchanged — an operator should not have to learn which tables are "safe",
    // because that knowledge stops being true the moment a table with a covered
    // column is added.
    const rows: ExportableRow[] = [
      {
        project_id: PROJECT,
        sha256: "b".repeat(64),
        byte_len: 1024,
        kind: "script",
        first_seen_at: NOW,
        last_seen_at: NOW,
        seen_count: 2,
        scan_state: "done",
      },
    ];
    const of = (mode: "redacted" | "raw") =>
      serialiseRows({
        table: "artifacts",
        format: "csv",
        mode,
        rows,
        chunkIndex: 0,
        lastChunk: true,
        counts: NO_DEGRADATION,
      });
    expect(of("raw")).toBe(of("redacted"));
    expect(EXPORT_COLUMNS.artifacts.every((c) => c.redact === null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// THE EMBEDDED FLOOR STATEMENT (UI-09)
// ---------------------------------------------------------------------------

describe("the floor statement the FILE carries (UI-09)", () => {
  it("emits none in either format when every contributing artifact is complete", () => {
    expect(floorStatement(NO_DEGRADATION)).toBeNull();

    const csv = serialiseRows({
      table: "observations",
      format: "csv",
      mode: "redacted",
      rows: [observationRow()],
      chunkIndex: 0,
      lastChunk: true,
      counts: NO_DEGRADATION,
    });
    expect(csv.startsWith("#")).toBe(false);

    const json = JSON.parse(
      serialiseRows({
        table: "observations",
        format: "json",
        mode: "redacted",
        rows: [observationRow()],
        chunkIndex: 0,
        lastChunk: true,
        counts: NO_DEGRADATION,
      }),
    ) as Record<string, unknown>;
    // ABSENT, not null. A `null` floor is a field a reader has to interpret;
    // an absent one says the question did not arise.
    expect(Object.prototype.hasOwnProperty.call(json, "floor")).toBe(false);
  });

  it("carries the statement as a leading comment line in the delimited format", () => {
    const statement = floorStatement(SOME_DEGRADATION);
    expect(statement).not.toBeNull();
    expect(statement).toContain("3");
    expect(statement).toContain("12");
    expect(statement).toContain("floor, not a total");

    const csv = serialiseRows({
      table: "observations",
      format: "csv",
      mode: "redacted",
      rows: [observationRow()],
      chunkIndex: 0,
      lastChunk: true,
      counts: SOME_DEGRADATION,
    });
    const first = csv.split("\r\n")[0] ?? "";
    expect(first.startsWith("# ")).toBe(true);
    expect(first).toContain(statement ?? "");
    // The comment cannot break the row grammar. The statement is
    // DefMiner-authored, and this is what makes that a fact rather than a
    // promise.
    expect(first).not.toContain('"');
    expect(ANY_CONTROL.test(first)).toBe(false);
  });

  it("carries the same statement as a top-level field in the structured format", () => {
    const json = JSON.parse(
      serialiseRows({
        table: "observations",
        format: "json",
        mode: "redacted",
        rows: [observationRow()],
        chunkIndex: 0,
        lastChunk: true,
        counts: SOME_DEGRADATION,
      }),
    ) as { floor?: string; rows: unknown[] };
    expect(json.floor).toBe(floorStatement(SOME_DEGRADATION));
    expect(json.rows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// CHUNKING
// ---------------------------------------------------------------------------

describe("chunking costs no correctness", () => {
  const rows = Array.from({ length: 6 }, (_, i) =>
    observationRow({ request_id: `req_${String(i)}` }),
  );

  for (const format of ["csv", "json"] as const) {
    it(`${format}: two chunks concatenated are byte-identical to one pass, header ONCE`, () => {
      const single = serialiseRows({
        table: "observations",
        format,
        mode: "redacted",
        rows,
        chunkIndex: 0,
        lastChunk: true,
        counts: SOME_DEGRADATION,
      });
      const first = serialiseRows({
        table: "observations",
        format,
        mode: "redacted",
        rows: rows.slice(0, 4),
        chunkIndex: 0,
        lastChunk: false,
        counts: SOME_DEGRADATION,
      });
      const second = serialiseRows({
        table: "observations",
        format,
        mode: "redacted",
        rows: rows.slice(4),
        chunkIndex: 1,
        lastChunk: true,
        counts: SOME_DEGRADATION,
      });

      expect(first + second).toBe(single);
      expect(Buffer.byteLength(first + second, "utf8")).toBe(
        Buffer.byteLength(single, "utf8"),
      );

      if (format === "csv") {
        const header = csvFields(single.split("\r\n")[1] ?? "")
          .map(fieldContent)
          .join(",");
        const headerLines = (first + second)
          .split("\r\n")
          .filter(
            (line) =>
              csvFields(line).map(fieldContent).join(",") === header &&
              line !== "",
          ).length;
        expect(headerLines, "the header must appear exactly once").toBe(1);
        // And the floor comment, likewise: two of them would read as two
        // different claims about the same file.
        expect(
          (first + second).split("\r\n").filter((l) => l.startsWith("# "))
            .length,
        ).toBe(1);
      } else {
        expect(
          (JSON.parse(first + second) as { rows: unknown[] }).rows,
        ).toHaveLength(6);
      }
    });
  }

  it("keeps the measured chunk constant, and keeps it in PRODUCTION code", () => {
    // Plan 05-02 derived this from a serialisation that actually ran: 20,000
    // rows x 366.87 measured worst-case bytes/row = 7.00 MiB against an 8 MiB
    // per-call BUDGET, and 25,000 would be 8.75 MiB. The 8 MiB figure is a
    // budget this project SETS, not a ceiling it measured from Caido — the real
    // ceiling is live-only. Its home moved here from `tests/` because
    // production code must not import from a spec.
    expect(EXPORT_RPC_CHUNK_ROWS).toBe(20_000);
    expect(Math.ceil(50_000 / EXPORT_RPC_CHUNK_ROWS)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// THE HOSTILE SWEEP — THE BACKSTOP ROW'S EXECUTED EVIDENCE
// ---------------------------------------------------------------------------

describe("🧪 backstop `long-text / export-dialog` — the whole hostile fixture, both formats, both modes", () => {
  const exercised = new Set<string>();

  for (const hostileCase of HOSTILE_CASES) {
    for (const format of ["csv", "json"] as const) {
      for (const mode of EXPORT_REDACTION_MODES) {
        it(`${hostileCase.id} / ${format} / ${mode} — ${hostileCase.why}`, () => {
          const text = serialiseRows({
            table: "observations",
            format,
            mode,
            rows: [observationRow({ url: hostileCase.value })],
            chunkIndex: 0,
            lastChunk: true,
            counts: NO_DEGRADATION,
          });

          const values =
            format === "csv"
              ? csvFields(text).map(fieldContent)
              : Object.values(
                  (JSON.parse(text) as { rows: Record<string, string>[] })
                    .rows[0] ?? {},
                );

          expect(values.length).toBeGreaterThan(0);
          for (const value of values) {
            // R2 step 1 and step 2: nothing invisible survives into the bytes.
            expect(ANY_CONTROL.test(value), "a control survived").toBe(false);
            expect(ANY_BIDI.test(value), "a bidi override survived").toBe(
              false,
            );
            if (format === "csv") {
              // R3: no field's first CONTENT character is a dangerous lead. A
              // neutralised field's first content character is the apostrophe,
              // which is the whole point.
              expect(
                DANGEROUS_LEADS.includes(value.slice(0, 1)),
                `a dangerous lead reached the spreadsheet: ${JSON.stringify(value.slice(0, 8))}`,
              ).toBe(false);
            }
          }
          exercised.add(hostileCase.id);
        });
      }
    }
  }

  it("exercised EVERY id in HOSTILE_CASE_IDS, not a subset", () => {
    expect([...exercised].sort()).toEqual([...HOSTILE_CASE_IDS].sort());
  });
});

// ---------------------------------------------------------------------------
// READING A CHUNK OUT OF THE DATABASE
// ---------------------------------------------------------------------------

describe("readExportChunk over real rows", () => {
  let fx: ReturnType<typeof createFixtureDb>;

  beforeEach(async () => {
    fx = createFixtureDb();
    const report = await migrate(fx.db);
    expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  });

  function seedObservation(i: number): void {
    fx.raw
      .prepare(
        "INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        PROJECT,
        String(i).padStart(64, "0"),
        `req_${String(i).padStart(4, "0")}`,
        `https://assets.example.test/a${String(i)}.js?v=${QUERY_VALUE_REDACTION}`,
        200,
        "application/javascript",
        NOW + i,
      );
  }

  const BASE: Omit<ExportChunkRequest, "chunkIndex" | "cursor"> = {
    projectId: PROJECT,
    table: "observations",
    format: "csv",
    mode: "redacted",
    filter: null as PageRequest["filter"],
    sortKey: "observed_at",
    direction: "asc",
    chunkRows: 2,
    // NULL ON THE INVENTORY TABLES. The manifest's own cases set it; a scope on
    // a table that has none would be a field nothing reads.
    scopeSha256: null,
    counts: NO_DEGRADATION,
    nowMs: NOW,
  };

  it("answers the EXPLICIT empty outcome for zero rows — never a header-only document", async () => {
    const result = await readExportChunk(fx.db, {
      ...BASE,
      chunkIndex: 0,
      cursor: null,
    });
    expect(result.outcome).toBe("empty");
  });

  it("fails closed when no project is resolved", async () => {
    const result = await readExportChunk(fx.db, {
      ...BASE,
      projectId: "",
      chunkIndex: 0,
      cursor: null,
    });
    expect(result).toEqual({ outcome: "refused", reason: "no-project" });
  });

  it("emits the header on chunk zero and NOT on a later chunk", async () => {
    for (let i = 0; i < 4; i += 1) seedObservation(i);

    const first = await readExportChunk(fx.db, {
      ...BASE,
      chunkIndex: 0,
      cursor: null,
    });
    expect(first.outcome).toBe("chunk");
    if (first.outcome !== "chunk") return;
    expect(first.chunk.text.split("\r\n")[0]).toContain('"project_id"');
    expect(first.chunk.hasMore).toBe(true);
    expect(first.chunk.nextCursor).not.toBeNull();

    const second = await readExportChunk(fx.db, {
      ...BASE,
      chunkIndex: 1,
      cursor: first.chunk.nextCursor,
    });
    expect(second.outcome).toBe("chunk");
    if (second.outcome !== "chunk") return;
    expect(second.chunk.text).not.toContain('"project_id"');
    expect(second.chunk.chunkIndex).toBe(1);
  });

  it("concatenates chunk by chunk into the SAME bytes a single pass produces, over REAL rows", async () => {
    for (let i = 0; i < 6; i += 1) seedObservation(i);

    const whole = await readExportChunk(fx.db, {
      ...BASE,
      chunkRows: EXPORT_RPC_CHUNK_ROWS,
      chunkIndex: 0,
      cursor: null,
    });
    expect(whole.outcome).toBe("chunk");
    if (whole.outcome !== "chunk") return;
    expect(whole.chunk.hasMore).toBe(false);

    let joined = "";
    let cursor = null as ExportChunkRequest["cursor"];
    let index = 0;
    for (;;) {
      const part = await readExportChunk(fx.db, {
        ...BASE,
        chunkIndex: index,
        cursor,
      });
      expect(part.outcome).toBe("chunk");
      if (part.outcome !== "chunk") return;
      joined += part.chunk.text;
      if (!part.chunk.hasMore) break;
      cursor = part.chunk.nextCursor;
      index += 1;
      expect(index, "the chunk loop did not terminate").toBeLessThan(20);
    }

    expect(joined).toBe(whole.chunk.text);
    // FOUR CALLS FOR SIX ROWS AT A CEILING OF TWO, AND THE FOURTH IS NOT WASTE.
    // A keyset page that FILLS cannot know whether the partition ended at its
    // last row, so the call that returns zero rows is the call that learns the
    // export is over — and in the structured format it is also the call that
    // CLOSES the document. Asserting three here would be asserting a lookahead
    // this module deliberately does not do, because a lookahead costs the same
    // page read one call earlier.
    expect(index + 1).toBe(4);
  });

  it("names the file and the content type itself — DefMiner-authored, no target bytes", () => {
    const name = exportFilename("observations", "raw", "csv", NOW);
    expect(name).toMatch(/^defminer-observations-raw-\d{8}T\d{6}Z\.csv$/);
    expect(EXPORT_CONTENT_TYPES.csv).toContain("text/csv");
    expect(EXPORT_CONTENT_TYPES.json).toContain("application/json");
  });
});

// ---------------------------------------------------------------------------
// THE MANIFEST — MAP-07's SECOND HALF, AND NOTHING ELSE ABOUT THIS PATH MOVED
// ---------------------------------------------------------------------------
//
// The whole point of the third table is that it needed almost no code: the
// chunking, the field escaping, the floor statement, the filename, the raw
// ceremony and the two audit kinds are the shipped ones. So the cases below are
// in two halves — what the new entry IS, and what is asserted UNCHANGED around
// it. The second half is the one that would otherwise rot.

/** One manifest row, as `readOnePage` projects it. */
function manifestRow(over: Partial<ExportableRow> = {}): ExportableRow {
  return {
    artifact_sha256: "a".repeat(64),
    map_sha256: "b".repeat(64),
    source_index: 0,
    sources_verbatim: "webpack://app/src/secret.ts",
    source_sha256: "c".repeat(64),
    byte_len: 128,
    line_count: 9,
    producibility: "producible",
    recovered_at: NOW,
    ...over,
  };
}

describe("the manifest export table (D-20, MAP-07)", () => {
  it("EXPORT_COLUMNS has exactly three tables and the manifest lists nine columns in order", () => {
    expect(Object.keys(EXPORT_COLUMNS).sort()).toEqual([
      "artifacts",
      "observations",
      "sources",
    ]);
    expect(EXPORT_COLUMNS.sources.map((c) => c.name)).toEqual([
      "artifact_sha256",
      "map_sha256",
      "source_index",
      "sources_verbatim",
      "source_sha256",
      "byte_len",
      "line_count",
      "producibility",
      "recovered_at",
    ]);
  });

  it("the export table list is the INVENTORY list plus the manifest, checked rather than described", () => {
    // Two lists that merely happen to agree today are two lists that drift. The
    // export set is defined as the pageable inventory plus one manifest, so the
    // relationship is asserted in that direction.
    expect(EXPORT_TABLES.slice(0, INVENTORY_TABLES.length)).toEqual([
      ...INVENTORY_TABLES,
    ]);
    expect(EXPORT_TABLES.length).toBe(INVENTORY_TABLES.length + 1);
    expect(Object.keys(EXPORT_COLUMNS).sort()).toEqual(
      [...EXPORT_TABLES].sort(),
    );
  });

  it("the label column carries the SHIPPED marker through a NARROWED application — still no per-column exemption", () => {
    const label = EXPORT_COLUMNS.sources.find(
      (c) => c.name === "sources_verbatim",
    );
    // LO-04 moved this from `redactUrlForExport` to a function that CALLS it,
    // and the distinction is the whole finding: the column is not exempt from
    // redaction, the redactor is applied where its subject exists. Both facts
    // are asserted, because "it delegates" is what stops this from becoming the
    // second spelling of the marker that the no-exemption argument refuses.
    expect(label?.redact).toBe(redactSourceLabelForExport);
    expect(redactSourceLabelForExport("webpack://app/x.ts?a=1")).toBe(
      redactUrlForExport("webpack://app/x.ts?a=1"),
    );
    // And it is the ONLY covered column on this table: eight DefMiner
    // measurements and one target-controlled string.
    expect(
      EXPORT_COLUMNS.sources
        .filter((c) => c.redact !== null)
        .map((c) => c.name),
    ).toEqual(["sources_verbatim"]);
  });

  it("redacts a webpack:// label's query in redacted mode", () => {
    const text = serialiseRows({
      table: "sources",
      format: "csv",
      mode: "redacted",
      rows: [
        manifestRow({
          sources_verbatim: "webpack://app/src/secret.ts?token=hunter2",
        }),
      ],
      chunkIndex: 0,
      lastChunk: true,
      counts: NO_DEGRADATION,
    });
    expect(text).toContain(
      `webpack://app/src/secret.ts${EXPORT_QUERY_REDACTION}`,
    );
    expect(text).not.toContain("hunter2");
  });

  // =========================================================================
  // LO-04 — THE WITHHELD MARKER MUST MEAN WHAT IT SAYS
  // =========================================================================
  // The shipped URL redactor cuts at the first `?` OR `#`, because in a URL
  // those characters BEGIN the query and the fragment. A `sources` label is a
  // URL only when it is protocol-shaped; `src/components/Button#new.tsx` is a
  // legal filename and has neither axis. Cutting it did two wrong things at
  // once: it DISCARDED a legal path tail, and it printed a marker telling the
  // reader a query had been withheld when there had never been one. An exported
  // record that misdescribes its own redaction is a worse artifact than one
  // that redacts nothing, because the reader cannot tell which claim to trust.

  /** The manifest's one target-controlled field, exported and read back. JSON
   *  rather than CSV so the assertion is on the VALUE and not on a substring of
   *  a quoted cell. */
  const manifestLabelField = (
    label: string,
    mode: "redacted" | "raw",
  ): string | null => {
    const parsed = JSON.parse(
      serialiseRows({
        table: "sources",
        format: "json",
        mode,
        rows: [manifestRow({ sources_verbatim: label })],
        chunkIndex: 0,
        lastChunk: true,
        counts: NO_DEGRADATION,
      }),
    ) as { rows: Record<string, string | null>[] };
    return parsed.rows[0]?.sources_verbatim ?? null;
  };

  /** One corpus label, looked up BY ID. A spec that repeated the label string
   *  would keep passing if the case were renamed or deleted, which is precisely
   *  the silent un-covering this lookup exists to turn into a failure. Same
   *  idiom as `tree.spec.ts`'s `rowOf`. */
  const labelCaseValue = (id: string): string => {
    const found = SOURCES_LABEL_CASES.find((labelCase) => labelCase.id === id);
    if (found === undefined) {
      throw new Error(
        `map-fixture.ts no longer exports a case with id "${id}". This spec ` +
          `asserts WR-03's direction over the corpus by NAME, so a rename must ` +
          `fail here rather than silently un-cover the branch 07-16 narrowed.`,
      );
    }
    return found.value;
  };

  /** The corpus ids whose redacted and raw forms are expected to DIFFER, named
   *  rather than claimed to be empty. Under the operator's option A that is
   *  exactly the corpus labels carrying a `?`, and `loader-query` is the only
   *  one. Stated as a list so the two-mode sweep below can say what it covers
   *  instead of implying it. */
  const CORPUS_IDS_CUT_IN_REDACTED_MODE = ["loader-query"] as const;

  it.each([
    // NONE OF THESE HAS A QUERY AXIS TO WITHHOLD, so nothing is withheld and
    // nothing is claimed. The `#` tails survive because `#` is a legal filename
    // character — LO-04's finding, and this list is where it is pinned.
    //
    // `src/gen/what?.ts` USED TO BE IN THIS LIST and is not any more: WR-03
    // moved it, because under the operator's option A a `?` on a non-protocol
    // label IS cut. Its new home is the direction block below, asserted in both
    // modes rather than merely asserted whole.
    ["relative, legal `#` in the filename", "src/components/Button#new.tsx"],
    ["absolute-posix, legal `#`", "/srv/app/src/Button#new.tsx"],
    ["windows-drive, legal `#`", "C:\\Temp\\Button#new.tsx"],
    ["windows-unc, legal `#`", "\\\\server\\share\\Button#new.tsx"],
    // A `/` BEFORE the `://` is not an authority separator — this is a path
    // segment that merely contains a colon, and the frontend classifier reads
    // it as `relative` for the same reason.
    ["relative segment containing `://`", "src/a://b#c.ts"],
  ])(
    "leaves a NON-URL label whole in redacted mode — %s",
    (_why, label: string) => {
      expect(manifestLabelField(label, "redacted")).toBe(label);
      expect(manifestLabelField(label, "redacted")).not.toContain(
        EXPORT_QUERY_REDACTION,
      );
    },
  );

  it.each([
    [
      "webpack:// with a real query",
      "webpack:///./src/app.js?v=2",
      `webpack:///./src/app.js${EXPORT_QUERY_REDACTION}`,
    ],
    [
      "webpack:// with a real fragment",
      "webpack:///./src/app.js#L5",
      `webpack:///./src/app.js${EXPORT_QUERY_REDACTION}`,
    ],
    [
      "http:// with a credential-shaped query",
      "http://evil.example/app.js?token=hunter2",
      `http://evil.example/app.js${EXPORT_QUERY_REDACTION}`,
    ],
    [
      "webpack: with no authority separator, still a scheme",
      "webpack:app.js?v=2",
      `webpack:app.js${EXPORT_QUERY_REDACTION}`,
    ],
    // A URL-SHAPED LABEL WITH NOTHING TO WITHHOLD IS ALSO LEFT WHOLE. The
    // marker is a statement about this value, not about this column.
    [
      "file:// with no query and no fragment",
      "file:///etc/defminer-escape.txt",
      "file:///etc/defminer-escape.txt",
    ],
  ])(
    "still withholds a URL-shaped label's query axis in redacted mode — %s",
    (_why, label: string, expected: string) => {
      expect(manifestLabelField(label, "redacted")).toBe(expected);
    },
  );

  // =========================================================================
  // WR-03 — THE QUERY AXIS EXISTS ON A LABEL THAT IS NOT A URL
  // =========================================================================
  // 07-16 narrowed this column's redaction to protocol-shaped labels on the
  // premise that a label which is not a URL has NEITHER axis. Half of that
  // premise was false. `src/App.vue?vue&type=script&lang.ts` is the ordinary
  // vite/webpack loader-query shape, `classify()` puts it in `relative`, and
  // between 07-16 and this plan it exported VERBATIM in the mode an operator
  // picks precisely because the artifact is going to be shared.
  //
  // The operator chose option A on 2026-09-02 — split the two axes. The query
  // axis is cut on EVERY label; the fragment axis only on URL-shaped ones,
  // because `#` is a legal filename character and LO-04's fix for that stands.
  // What follows pins BOTH halves, so neither can slide back without a failure.

  it("cuts the CORPUS's loader-query label at its `?` in redacted mode, and returns it whole in raw — WR-03, by id", () => {
    const label = labelCaseValue("loader-query");
    const cut = label.indexOf("?");
    expect(
      cut,
      "the loader-query case no longer carries a query axis, so this pin covers nothing",
    ).toBeGreaterThan(-1);
    expect(manifestLabelField(label, "redacted")).toBe(
      `${label.slice(0, cut)}${EXPORT_QUERY_REDACTION}`,
    );
    // The raw option remains the only route to the unredacted bytes, and it is
    // asserted separately: "redacted leaked" and "raw withheld" are different
    // failures and must not be able to mask one another.
    expect(manifestLabelField(label, "raw")).toBe(label);
  });

  it.each([
    // 1 — RELATIVE, QUERY AND NO FRAGMENT. WR-03's shape in its generic form.
    //     Cut at the `?`, marker appended, tail withheld. This label was in the
    //     "leaves a NON-URL label whole" list until this plan.
    [
      "relative, a loader query on the filename",
      "src/gen/what?.ts",
      `src/gen/what${EXPORT_QUERY_REDACTION}`,
    ],
    // 2 — RELATIVE, FRAGMENT AND NO QUERY. LO-04's fix, UNMOVED. `#` is a legal
    //     filename character, so there is nothing to withhold and the marker
    //     would be a false statement about this field.
    [
      "relative, a legal `#` in the filename and no query",
      "src/components/Button#new.tsx",
      "src/components/Button#new.tsx",
    ],
    // 3 — RELATIVE DESPITE A COLON-SLASH-SLASH. The `/` before the `://` makes
    //     this a path segment, not an authority; both classifiers agree. Its
    //     `#` tail stays for exactly the reason case 2's does.
    [
      "relative segment containing `://`, fragment only",
      "src/a://b#c.ts",
      "src/a://b#c.ts",
    ],
    // 4 — PROTOCOL-SHAPED, WITH A QUERY. Untouched by WR-03: a URL-shaped label
    //     still delegates to the shared redactor, which cuts on EITHER axis.
    [
      "protocol-shaped, a credential-shaped query",
      "http://evil.example/app.js?token=hunter2",
      `http://evil.example/app.js${EXPORT_QUERY_REDACTION}`,
    ],
  ])(
    "pins WR-03's direction per shape, in BOTH modes — %s",
    (_why, label: string, redacted: string) => {
      expect(manifestLabelField(label, "redacted")).toBe(redacted);
      expect(manifestLabelField(label, "raw")).toBe(label);
    },
  );

  it("agrees with the FRONTEND classifier on every corpus label — the two implementations, diffed", () => {
    // THE DRIFT GATE FOR A CLASSIFICATION THAT EXISTS TWICE.
    // `isProtocolShapedLabel` restates `sourcePathShape`'s `"protocol"` branch
    // because the backend cannot import the frontend (see the comment at the
    // constant). A second implementation nobody diffs is a second
    // implementation that silently becomes wrong, so this diffs them — in a
    // SPEC, where a cross-package import costs nothing that ships.
    const extra = [
      "src/components/Button#new.tsx",
      "src/a://b#c.ts",
      "webpack:app.js?v=2",
      "webpack:///./src/app.js?v=2",
      "http://evil.example/app.js?token=hunter2",
      "file:///etc/defminer-escape.txt",
    ];
    for (const value of [
      ...SOURCES_LABEL_CASES.map((c) => c.value),
      ...extra,
    ]) {
      expect(
        isProtocolShapedLabel(value),
        `the two shape classifiers disagree on ${JSON.stringify(value)}`,
      ).toBe(sourcePathShape(value) === "protocol");
    }
  });

  it("returns every hostile-corpus label byte-identical in BOTH modes EXCEPT the ids that carry a query axis, which it NAMES", () => {
    // WHAT THIS TEST USED TO SAY, AND WHY IT WAS REWRITTEN RATHER THAN DELETED.
    // Until 07-22 its title ended "none of them has a query axis" and its
    // comment promised that "a future corpus entry that does carry a query
    // fails here loudly rather than acquiring a marker nobody expected".
    //
    // 07-21 added exactly such an entry — `loader-query`, the ordinary vite and
    // webpack shape — and it did NOT fail loudly. 07-16's narrowing let it
    // through both modes identically, so the title and the promise were both
    // false while the assertion underneath them still passed. That is not a
    // defect in the corpus; it is the direct evidence for WR-03, and a blanket
    // property is what let it hide.
    //
    // So the exception set is NAMED. It is stated explicitly whether or not it
    // is empty, and it is checked against the corpus first, so this test says
    // what it covers instead of implying it — and a renamed or deleted case
    // fails here rather than quietly widening the byte-identity claim.
    const differing = new Set<string>(CORPUS_IDS_CUT_IN_REDACTED_MODE);
    for (const id of differing) {
      expect(
        SOURCES_LABEL_CASES.some((c) => c.id === id),
        `the exception set names "${id}", which the corpus no longer contains`,
      ).toBe(true);
    }
    for (const c of SOURCES_LABEL_CASES) {
      if (differing.has(c.id)) {
        expect(
          manifestLabelField(c.value, "redacted"),
          `corpus case ${c.id} is named as cut in redacted mode but came back byte-identical to raw`,
        ).not.toBe(manifestLabelField(c.value, "raw"));
        continue;
      }
      expect(
        manifestLabelField(c.value, "redacted"),
        `corpus case ${c.id} acquired or lost bytes in redacted mode`,
      ).toBe(manifestLabelField(c.value, "raw"));
    }
  });

  it("bounds a redacted manifest field at RAW + one marker — the payload-budget question, answered by arithmetic", () => {
    // THE ONE WAY LO-04 COULD HAVE COST BYTES. A redacted label that keeps its
    // path body is longer than one cut at the first `#`, and those bytes land in
    // an operator-visible export measured against
    // `tests/export-payload-budget.spec.ts`.
    //
    // THE CEILING DID NOT MOVE, and the arithmetic is worth stating exactly,
    // because the obvious invariant — "redacted is never longer than raw" — is
    // FALSE and was false before LO-04: the marker is APPENDED, so
    // `webpack:///./src/app.js?v=2` (27) redacts to 39. What actually holds,
    // before LO-04, after it, and after WR-03 too, is
    // `redacted <= raw + EXPORT_QUERY_REDACTION`. With L = raw length:
    //
    //   before LO-04   L when there is no `?`/`#`, else cut + 16
    //   after  LO-04   L, unless the label is URL-shaped and carries one of
    //                  those two, in which case cut + 16
    //   after  WR-03   L, unless there is a cut — the first `?`/`#` on a
    //                  URL-shaped label, the first `?` on any other
    //   all three      <= L + 16, because cut < L whenever there is one
    //
    // And `store/sources.ts` caps the STORED label at SOURCES_LABEL_MAX (4,096
    // code points) at write time, so the per-field ceiling is 4,112 across all
    // three behaviours. Both changes redistribute bytes inside a bound neither
    // raises: LO-04 gave a bare path its tail back and gave up the marker, and
    // WR-03 hands the marker back on the query axis alone.
    //
    // SIXTEEN, NOT THE SEVENTEEN THIS COMMENT CARRIED UNTIL WR-03.
    // `EXPORT_QUERY_REDACTION` is `<query-redacted>` — sixteen characters, which
    // is why the worked example above lands on 39 (23 + 16) rather than 40, and
    // why the stored-cap ceiling is 4,112 rather than the 4,113 stated here
    // before. The ASSERTION was never wrong: it reads
    // `EXPORT_QUERY_REDACTION.length` rather than a literal. Only the prose
    // beside it was, and a round that closes four false comments does not get to
    // leave a fifth standing in a file it is already editing.
    //
    // Asserted over the corpus plus the shapes this plan added, because an
    // arithmetic argument nobody executes is an argument that rots.
    const extra = [
      "src/components/Button#new.tsx",
      "src/gen/what?.ts",
      "src/a://b#c.ts",
      "webpack:///./src/app.js?v=2",
      "webpack:///./src/app.js#L5",
      "http://evil.example/app.js?token=hunter2",
    ];
    for (const value of [
      ...SOURCES_LABEL_CASES.map((c) => c.value),
      ...extra,
    ]) {
      const redacted = (manifestLabelField(value, "redacted") ?? "").length;
      const raw = (manifestLabelField(value, "raw") ?? "").length;
      expect(
        redacted,
        `redacting ${JSON.stringify(value)} grew the field past raw + one marker`,
      ).toBeLessThanOrEqual(raw + EXPORT_QUERY_REDACTION.length);
      // The marker is appended ONCE or not at all — never twice, which is the
      // shape a second redaction pass over an already-redacted value would make.
      expect(redacted).toBeGreaterThanOrEqual(
        Math.min(raw, EXPORT_QUERY_REDACTION.length),
      );
    }
  });

  it("leaves `observations.url` BYTE-IDENTICAL — the shared redactor did not move under LO-04", () => {
    // THE REGRESSION PIN. LO-04 changed which function the MANIFEST column
    // carries and changed `redactUrlForExport` not at all, so the observed-URL
    // column must be exactly what it has always been — query cut, fragment cut,
    // marker appended, nothing else. If this ever fails, a manifest fix reached
    // a column it has no business touching.
    const of = (url: string, mode: "redacted" | "raw") =>
      (
        JSON.parse(
          serialiseRows({
            table: "observations",
            format: "json",
            mode,
            rows: [observationRow({ url })],
            chunkIndex: 0,
            lastChunk: true,
            counts: NO_DEGRADATION,
          }),
        ) as { rows: Record<string, string>[] }
      ).rows[0]?.url;

    for (const [url, redacted] of [
      [
        "https://assets.example.test/app.js?v=1",
        `https://assets.example.test/app.js${EXPORT_QUERY_REDACTION}`,
      ],
      [
        "https://assets.example.test/app.js#L5",
        `https://assets.example.test/app.js${EXPORT_QUERY_REDACTION}`,
      ],
      // A URL is a URL whatever it looks like, and this is the case that would
      // silently change if the manifest's shape test ever leaked into this
      // column: a path-shaped value on the OBSERVED-URL axis is still cut.
      [
        "not-really-a-url/app.js#L5",
        `not-really-a-url/app.js${EXPORT_QUERY_REDACTION}`,
      ],
      [
        "https://assets.example.test/app.js",
        "https://assets.example.test/app.js",
      ],
    ] as const) {
      expect(of(url, "redacted"), `observations.url moved for ${url}`).toBe(
        redacted,
      );
      expect(of(url, "raw")).toBe(url);
    }
  });

  it("returns the label BYTE-IDENTICAL in raw mode — what the raw option is for", () => {
    // D-06's evidence is retrievable through the raw option, which is the whole
    // reason no per-column exemption was invented. The two modes are asserted as
    // two tests rather than one comparison, because the failure that matters is
    // "redacted leaked" and it is a different fact from "raw withheld".
    const label = "webpack://app/src/secret.ts?token=hunter2";
    const of = (mode: "redacted" | "raw") =>
      serialiseRows({
        table: "sources",
        format: "csv",
        mode,
        rows: [manifestRow({ sources_verbatim: label })],
        chunkIndex: 0,
        lastChunk: true,
        counts: NO_DEGRADATION,
      });
    expect(of("raw")).toContain(label);
    expect(of("raw")).not.toBe(of("redacted"));
  });

  it("two exports of an unchanged row set are BYTE-IDENTICAL", () => {
    const rows = [
      manifestRow({ source_index: 0 }),
      manifestRow({ source_index: 1, sources_verbatim: null }),
      manifestRow({ source_index: 2, source_sha256: null, byte_len: null }),
    ];
    const once = () =>
      serialiseRows({
        table: "sources",
        format: "csv",
        mode: "redacted",
        rows,
        chunkIndex: 0,
        lastChunk: true,
        counts: NO_DEGRADATION,
      });
    expect(once()).toBe(once());
  });

  it("a null label and a null digest export as the EMPTY value, never the word null", () => {
    // The two Pitfall-3 nulls reach a file here, and a reader who saw the
    // string `null` would read it as a label a bundler emitted.
    const text = serialiseRows({
      table: "sources",
      format: "json",
      mode: "redacted",
      rows: [manifestRow({ sources_verbatim: null, source_sha256: null })],
      chunkIndex: 0,
      lastChunk: true,
      counts: NO_DEGRADATION,
    });
    const parsed = JSON.parse(text) as { rows: Record<string, string>[] };
    expect(parsed.rows[0]?.sources_verbatim).toBe("");
    expect(parsed.rows[0]?.source_sha256).toBe("");
    expect(text).not.toContain('"null"');
  });

  it("crosses the chunk seam byte-identically at EXPORT_RPC_CHUNK_ROWS + 1", () => {
    // ONE ROW MORE THAN THE MEASURED CHUNK CONSTANT, serialised as two chunks
    // and as one pass, compared as bytes. That is the whole of the chunking
    // contract and the manifest rides it unchanged: the header belongs to chunk
    // zero and to no other, and concatenating the chunks reproduces the file.
    const rows: ExportableRow[] = [];
    for (let i = 0; i < EXPORT_RPC_CHUNK_ROWS + 1; i += 1) {
      rows.push(manifestRow({ source_index: i }));
    }
    const single = serialiseRows({
      table: "sources",
      format: "csv",
      mode: "redacted",
      rows,
      chunkIndex: 0,
      lastChunk: true,
      counts: NO_DEGRADATION,
    });
    const first = serialiseRows({
      table: "sources",
      format: "csv",
      mode: "redacted",
      rows: rows.slice(0, EXPORT_RPC_CHUNK_ROWS),
      chunkIndex: 0,
      lastChunk: false,
      counts: NO_DEGRADATION,
    });
    const second = serialiseRows({
      table: "sources",
      format: "csv",
      mode: "redacted",
      rows: rows.slice(EXPORT_RPC_CHUNK_ROWS),
      chunkIndex: 1,
      lastChunk: true,
      counts: NO_DEGRADATION,
    });
    expect(first + second).toBe(single);
    // NON-VACUITY: the seam was actually crossed.
    expect(second.length).toBeGreaterThan(0);
    expect(rows.length).toBe(EXPORT_RPC_CHUNK_ROWS + 1);
  });

  it("names the file from the table, with no target byte anywhere near it", () => {
    const name = exportFilename("sources", "raw", "csv", NOW);
    expect(name).toMatch(/^defminer-sources-raw-\d{8}T\d{6}Z\.csv$/);
  });
});

describe("readExportChunk over a real manifest", () => {
  let fx: ReturnType<typeof createFixtureDb>;

  beforeEach(async () => {
    fx = createFixtureDb();
    const report = await migrate(fx.db);
    expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  });

  const ART = "a".repeat(64);
  const MAP = "b".repeat(64);

  function seedSighting(index: number, label: string | null): void {
    fx.raw
      .prepare(
        "INSERT INTO source_sightings (project_id, map_sha256, source_index, artifact_sha256, request_id, source_sha256, sources_verbatim, producibility, producibility_at, recovered_at) " +
          "VALUES (?, ?, ?, ?, 'req-1', NULL, ?, 'producible', NULL, ?)",
      )
      .run(PROJECT, MAP, index, ART, label, NOW + index);
  }

  const MANIFEST: Omit<ExportChunkRequest, "chunkIndex" | "cursor"> = {
    projectId: PROJECT,
    table: "sources",
    format: "csv",
    mode: "redacted",
    filter: null as PageRequest["filter"],
    // IGNORED BY THE MANIFEST ARM, and set to a real inventory value on purpose:
    // a sort key that silently took effect here would reorder the evidence.
    sortKey: "observed_at",
    direction: "asc",
    scopeSha256: ART,
    chunkRows: 2,
    counts: NO_DEGRADATION,
    nowMs: NOW,
  };

  it("emits rows in the map's own index order, ascending", async () => {
    // THE ORDER IS THE EVIDENCE. Seeded out of order so the assertion is about
    // the statement's ORDER BY rather than about insertion order.
    for (const i of [2, 0, 1]) {
      seedSighting(i, `webpack://app/src/${String(i)}.ts`);
    }
    const result = await readExportChunk(fx.db, {
      ...MANIFEST,
      chunkRows: 100,
      chunkIndex: 0,
      cursor: null,
    });
    expect(result.outcome).toBe("chunk");
    if (result.outcome !== "chunk") return;
    const indexes = [...result.chunk.text.matchAll(/src\/(\d)\.ts/g)].map((m) =>
      Number(m[1]),
    );
    expect(indexes).toEqual([0, 1, 2]);
  });

  it("two exports of an unchanged DATABASE are byte-identical", async () => {
    for (let i = 0; i < 5; i += 1) {
      seedSighting(i, `webpack://app/src/${String(i)}.ts`);
    }
    const once = async () => {
      const result = await readExportChunk(fx.db, {
        ...MANIFEST,
        chunkRows: 100,
        chunkIndex: 0,
        cursor: null,
      });
      return result.outcome === "chunk" ? result.chunk.text : "";
    };
    expect(await once()).toBe(await once());
    expect((await once()).length).toBeGreaterThan(0);
  });

  it("a manifest with NO SCOPE answers the explicit empty outcome, never a header-only file", async () => {
    for (let i = 0; i < 3; i += 1) seedSighting(i, "webpack://app/src/x.ts");
    const result = await readExportChunk(fx.db, {
      ...MANIFEST,
      scopeSha256: null,
      chunkIndex: 0,
      cursor: null,
    });
    // Open decision D3's rule unchanged: the reason goes ON the control and no
    // file is written. A header-only document would invite a caller that
    // ignores the rule.
    expect(result).toEqual({ outcome: "empty" });
  });

  it("an artifact with ZERO recovered sources answers empty rather than a header-only file", async () => {
    const result = await readExportChunk(fx.db, {
      ...MANIFEST,
      scopeSha256: "f".repeat(64),
      chunkIndex: 0,
      cursor: null,
    });
    expect(result).toEqual({ outcome: "empty" });
  });

  it("redacts the label in redacted mode and returns it byte-identical in raw", async () => {
    seedSighting(0, "webpack://app/src/secret.ts?token=hunter2");
    const of = async (mode: "redacted" | "raw") => {
      const result = await readExportChunk(fx.db, {
        ...MANIFEST,
        mode,
        chunkRows: 100,
        chunkIndex: 0,
        cursor: null,
      });
      return result.outcome === "chunk" ? result.chunk.text : "";
    };
    expect(await of("redacted")).not.toContain("hunter2");
    expect(await of("redacted")).toContain(EXPORT_QUERY_REDACTION);
    expect(await of("raw")).toContain(
      "webpack://app/src/secret.ts?token=hunter2",
    );
  });

  it("fails closed with no project, exactly as the inventory tables do", async () => {
    seedSighting(0, "webpack://app/src/x.ts");
    const result = await readExportChunk(fx.db, {
      ...MANIFEST,
      projectId: "",
      chunkIndex: 0,
      cursor: null,
    });
    expect(result).toEqual({ outcome: "refused", reason: "no-project" });
  });

  it("pages across the chunk seam with no duplicate and no gap", async () => {
    for (let i = 0; i < 5; i += 1) {
      seedSighting(i, `webpack://app/src/${String(i)}.ts`);
    }
    const seen: number[] = [];
    let cursor: ExportChunkRequest["cursor"] = null;
    let chunkIndex = 0;
    for (;;) {
      const result = await readExportChunk(fx.db, {
        ...MANIFEST,
        chunkRows: 2,
        chunkIndex,
        cursor,
      });
      expect(result.outcome).toBe("chunk");
      if (result.outcome !== "chunk") return;
      for (const m of result.chunk.text.matchAll(/src\/(\d)\.ts/g)) {
        seen.push(Number(m[1]));
      }
      if (!result.chunk.hasMore) break;
      cursor = result.chunk.nextCursor;
      chunkIndex += 1;
    }
    expect(chunkIndex).toBeGreaterThan(0);
    expect(seen).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe("the shipped export path is UNCHANGED by the manifest", () => {
  it("does not add or rename an audit kind — `audit` is written only on destruction", () => {
    // `AUDIT_KINDS` is a CLOSED CHECK inside a one-way migration, and the two
    // export kinds already exist. A third kind here would have been a migration
    // for a disclosure the two existing words already name.
    const audit = readFileSync("packages/backend/src/store/audit.ts", "utf8");
    expect(audit).toContain('"export_raw"');
    expect(audit).toContain('"export_redacted"');
    expect(audit.match(/"export_raw"/g)?.length).toBe(1);
    expect(audit).not.toContain("export_sources");
    expect(audit).not.toContain("export_manifest");
  });

  it("needs nothing new from the frontend download path", () => {
    // D-04's mechanism is a Blob and an anchor over bytes the backend returned.
    // A manifest is bytes exactly as an inventory export is, so this module has
    // nothing to learn about a third table — and the assertion is that it does
    // not know about one.
    const download = readFileSync(
      "packages/frontend/src/components/export-download.ts",
      "utf8",
    );
    expect(download).not.toContain("sources");
    expect(download).not.toContain("manifest");
    expect(download).toContain("browserDownload");
  });

  it("writes no second field escaper — the manifest rides the engine's csv rule", () => {
    const exporter = readFileSync(
      "packages/backend/src/store/export.ts",
      "utf8",
    );
    // ONE import of the field rule, and no local re-implementation of it.
    expect(exporter).toContain('from "@defminer/engine/csv"');
    expect(exporter.match(/function csvField/g)).toBeNull();
    // And the chunk constant is not restated for the new table.
    expect(exporter.match(/EXPORT_RPC_CHUNK_ROWS = /g)?.length).toBe(1);
  });
});
