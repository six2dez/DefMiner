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

import type { PageRequest } from "@defminer/engine/contract";
import { DANGEROUS_LEADS } from "@defminer/engine/csv";
import {
  HOSTILE_CASE_IDS,
  HOSTILE_CASES,
} from "@defminer/engine/hostile.fixture";
import {
  BIDI_OVERRIDES_ISOLATES,
  C0_C1_CONTROLS,
} from "@defminer/engine/sanitise";
import { beforeEach, describe, expect, it } from "vitest";

import { createFixtureDb } from "../../test/fixtures/sqlite-fixture";

import {
  EXPORT_COLUMNS,
  EXPORT_CONTENT_TYPES,
  EXPORT_QUERY_REDACTION,
  EXPORT_REDACTION_MODES,
  EXPORT_RPC_CHUNK_ROWS,
  type ExportableRow,
  type ExportChunkRequest,
  exportFilename,
  floorStatement,
  readExportChunk,
  redactUrlForExport,
  serialiseRows,
} from "./export";
import { migrate } from "./migrations";
import { QUERY_VALUE_REDACTION } from "./observations";

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
        expect((JSON.parse(first + second) as { rows: unknown[] }).rows).toHaveLength(
          6,
        );
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
            expect(ANY_BIDI.test(value), "a bidi override survived").toBe(false);
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
    expect(index + 1).toBe(3);
  });

  it("names the file and the content type itself — DefMiner-authored, no target bytes", () => {
    const name = exportFilename("observations", "raw", "csv", NOW);
    expect(name).toMatch(/^defminer-observations-raw-\d{8}T\d{6}Z\.csv$/);
    expect(EXPORT_CONTENT_TYPES.csv).toContain("text/csv");
    expect(EXPORT_CONTENT_TYPES.json).toContain("application/json");
  });
});
