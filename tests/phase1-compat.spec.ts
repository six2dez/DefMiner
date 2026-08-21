// tests/phase1-compat.spec.ts — the gate over COMPAT-01 and COMPAT-02.
//
// FAIL, NEVER SKIP. Every message names the remedy, because a gate that fails
// without saying what to run is a gate somebody deletes.
//
// This file asserts THREE independent things, and the third is the one that
// makes the other two durable:
//
//   1. Legs A and B each ran against the binary they claim, and every surface
//      they exercised succeeded.
//   2. Leg C — the below-minimum build — refused, in a named way, with a message
//      an operator can act on, having written nothing.
//   3. The surface list in the artifact equals `REQUIRED_SURFACES` in
//      packages/backend/src/compat.ts, AND that list agrees with the INTEGRATE
//      rows of COVERAGE.md. A surface cannot be integrated in the matrix and
//      quietly dropped from the compatibility test, and cannot be dropped from
//      the guard without the matrix noticing.

import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { MIN_SQLITE, REQUIRED_SURFACES } from "../packages/backend/src/compat";

const PHASE = ".planning/phases/01-skeleton-persistence-compatibility";
const RESULT = `${PHASE}/results/compat-smoke.json`;
const COVERAGE = `${PHASE}/COVERAGE.md`;
const REMEDY = "run: bash scripts/phase1/compat-smoke.sh";

/** The recorded artifact's shape. Declared rather than reached for with `any`,
 *  so a field renamed by compat-smoke.sh is a typecheck failure here and not a
 *  silently-undefined assertion that passes. */
type SurfaceRecord = {
  name: string;
  scope: string;
  coverage_row: number | null;
  probe_ok: boolean;
  exercised: boolean;
  outcome: string;
  evidence: string;
  error: string | null;
};

type FullLeg = {
  ran: boolean;
  reason?: string;
  expected_version?: string;
  reported_version?: string;
  compatible?: boolean;
  sqlite_version?: string | null;
  schema_version?: number | null;
  artifact_rows_after_first_body?: number;
  artifact_rows_after_second_body?: number;
  observation_rows_after_first_body?: number;
  surfaces?: SurfaceRecord[];
};

type BelowMinimumLeg = {
  ran: boolean;
  reason?: string;
  expected_version?: string;
  reported_version?: string | null;
  refusal_mode?: string | null;
  message?: string | null;
  guard_reached?: boolean;
  artifact_rows_after_proxied_js?: number | null;
  database_file_present?: boolean;
  host_log_incompatible_lines?: number;
};

type SmokeDoc = {
  current_release?: string;
  legs?: { A?: FullLeg; B?: FullLeg; C?: BelowMinimumLeg };
};

function loadResult(): SmokeDoc {
  if (!existsSync(RESULT)) {
    throw new Error(
      `${RESULT} is missing. COMPAT-02 is not closed without it — ${REMEDY}`,
    );
  }
  try {
    return JSON.parse(readFileSync(RESULT, "utf8")) as SmokeDoc;
  } catch (err) {
    throw new Error(
      `${RESULT} is not valid JSON: ${(err as Error).message} — ${REMEDY}`,
    );
  }
}

/** Three-part numeric comparison, duplicated here ON PURPOSE. The gate must not
 *  import the comparison it is gating, or a broken comparison would agree with
 *  itself and the assertion would pass. */
function cmp3(a: string, b: string): number {
  const seg = (v: string): number[] =>
    v
      .split(".")
      .slice(0, 3)
      .map((s) => {
        const m = /^(\d+)/.exec(s);
        return m === null ? Number.NaN : Number.parseInt(m[1], 10);
      });
  const x = seg(a);
  const y = seg(b);
  for (let i = 0; i < 3; i++) {
    const xi = x.length > i ? x[i] : 0;
    const yi = y.length > i ? y[i] : 0;
    if (Number.isNaN(xi) || Number.isNaN(yi)) return Number.NaN;
    if (xi !== yi) return xi - yi;
  }
  return 0;
}

const doc = loadResult();

// ---------------------------------------------------------------------------
// Legs A and B — the two builds
// ---------------------------------------------------------------------------

const LEGS: Array<{ label: "A" | "B"; version: string }> = [
  { label: "A", version: "0.57.1" },
  { label: "B", version: "0.58.0" },
];

describe.each(LEGS)("leg $label — Caido $version", ({ label, version }) => {
  const leg = doc.legs?.[label];

  it("ran at all — a leg that did not run is null with a reason, never an empty success", () => {
    expect(leg, `${RESULT} has no leg ${label} — ${REMEDY}`).toBeTruthy();
    expect(
      leg.ran,
      `leg ${label} did not run: ${String(leg?.reason)} — ${REMEDY}`,
    ).toBe(true);
  });

  it("was measured against the binary it claims, and its expectation was not moved", () => {
    if (leg === undefined) throw new Error(`leg ${label} missing — ${REMEDY}`);
    // TWO assertions, exactly as tests/schema.spec.ts does it for Phase 0. The
    // first catches a leg recorded against the wrong binary — the stale 0.55.3
    // owns `caido-cli` on PATH, so this is a live hazard and not a hypothetical
    // one. The second catches an expectation quietly edited to match whatever
    // was measured, which would make the first assertion self-fulfilling.
    expect(
      leg.reported_version,
      `leg ${label} reported ${String(leg.reported_version)}, expected ${leg.expected_version} — ${REMEDY}`,
    ).toBe(leg.expected_version);
    expect(
      leg.expected_version,
      `leg ${label}'s expected_version is ${String(leg.expected_version)}, but leg ${label} is the ${version} leg`,
    ).toBe(version);
  });

  it("found the build compatible and opened the schema", () => {
    if (leg === undefined) throw new Error(`leg ${label} missing — ${REMEDY}`);
    expect(leg.compatible, `leg ${label}: ${String(leg.reason)}`).toBe(true);
    expect(
      leg.schema_version,
      `leg ${label} never reached schema v2 — the DDL ladder did not run`,
    ).toBeGreaterThanOrEqual(2);
  });

  it(`reports a SQLite at or above ${MIN_SQLITE}`, () => {
    // The upsert this whole storage design rests on landed in 3.24 and has no
    // fallback below it. A bundled-SQLite change between Caido releases is
    // exactly the kind of thing a type diff cannot see, which is why leg B
    // re-reads it rather than inheriting leg A's answer.
    if (leg === undefined) throw new Error(`leg ${label} missing — ${REMEDY}`);
    const v = leg.sqlite_version;
    expect(
      typeof v,
      `leg ${label} recorded no sqlite_version — ${REMEDY}`,
    ).toBe("string");
    const c = cmp3(String(v), MIN_SQLITE);
    expect(
      Number.isNaN(c),
      `leg ${label} sqlite_version ${String(v)} is unparseable`,
    ).toBe(false);
    expect(
      c,
      `leg ${label} runs SQLite ${String(v)}, below the ${MIN_SQLITE} that ON CONFLICT DO UPDATE requires`,
    ).toBeGreaterThanOrEqual(0);
  });

  it("exercised EVERY surface, and every one succeeded", () => {
    const surfaces = leg?.surfaces ?? [];
    expect(
      surfaces.length,
      `leg ${label} recorded no surfaces — ${REMEDY}`,
    ).toBeGreaterThan(0);
    const notExercised = surfaces
      .filter((s) => s.exercised !== true)
      .map((s) => s.name);
    expect(
      notExercised,
      `leg ${label}: these surfaces were probed but never EXERCISED — presence is not behaviour`,
    ).toEqual([]);
    const failed = surfaces
      .filter((s) => s.outcome !== "ok")
      .map((s) => `${s.name} (${String(s.error ?? s.evidence)})`);
    expect(failed, `leg ${label}: surfaces with a failing outcome`).toEqual([]);
  });

  it("wrote rows for both distinct bodies, hashed to the host's own digest", () => {
    // The digest assertion lives inside the surface evidence for
    // crypto.createHash; this is the row-shape half of the same claim.
    if (leg === undefined) throw new Error(`leg ${label} missing — ${REMEDY}`);
    expect(
      leg.artifact_rows_after_first_body,
      `leg ${label}`,
    ).toBeGreaterThanOrEqual(1);
    expect(
      leg.artifact_rows_after_second_body,
      `leg ${label}`,
    ).toBeGreaterThanOrEqual(2);
    expect(
      leg.observation_rows_after_first_body,
      `leg ${label}`,
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("legs A and B agree", () => {
  const a = doc.legs?.A;
  const b = doc.legs?.B;

  it("recorded the SAME surface-name set — a surface dropped from one leg fails here", () => {
    const na = (a?.surfaces ?? []).map((s) => s.name).sort();
    const nb = (b?.surfaces ?? []).map((s) => s.name).sort();
    expect(
      nb,
      "leg B's surface set differs from leg A's — one leg silently skipped a surface",
    ).toEqual(na);
  });

  it("equals the exported REQUIRED_SURFACES list", () => {
    // Derived from the source, never restated. This is the assertion that makes
    // "the smoke test covers what the plugin calls" mechanical.
    const expected = REQUIRED_SURFACES.map((s) => s.name).sort();
    const recorded = (a?.surfaces ?? []).map((s) => s.name).sort();
    expect(
      recorded,
      "the recorded surface set is not REQUIRED_SURFACES — either compat.ts gained/lost a " +
        `surface without re-running the smoke test, or the reverse. ${REMEDY}`,
    ).toEqual(expected);
  });

  it("records leg B against the release api.caido.io calls CURRENT", () => {
    // Without this the smoke test silently becomes a test of a release that is
    // no longer current, which is COMPAT-02's exact failure mode (T-01-35).
    expect(
      doc.current_release,
      `${RESULT} did not record the current release — ${REMEDY}`,
    ).toBeTruthy();
    expect(
      b?.expected_version,
      `leg B tested ${String(b?.expected_version)} but api.caido.io says the current release is ` +
        `${String(doc.current_release)}. COMPAT-02 requires the CURRENT release. ` +
        `Run: bash scripts/phase1/fetch-caido.sh ${String(doc.current_release)} && ${REMEDY}`,
    ).toBe(doc.current_release);
  });
});

// ---------------------------------------------------------------------------
// Leg C — the below-minimum refusal
// ---------------------------------------------------------------------------

describe("leg C — Caido 0.55.3, below the declared minimum", () => {
  const c = doc.legs?.C;
  const MODES = [
    "guard_refused",
    "install_rejected",
    "plugin_not_reached",
    "instance_failed",
  ];

  it("ran and recorded a refusal mode from the CLOSED value set", () => {
    expect(c?.ran, `leg C did not run: ${String(c?.reason)} — ${REMEDY}`).toBe(
      true,
    );
    expect(
      MODES,
      `leg C recorded refusal_mode=${String(c?.refusal_mode)}, which is not one of the four ` +
        `legitimate outcomes. A reader must not have to INFER which refusal this was.`,
    ).toContain(c?.refusal_mode);
  });

  it("was measured against 0.55.3 itself, not a faked version string", () => {
    // COMPAT-01's whole value is that the refusal is observed on a real old
    // binary. A unit test with `version: "0.55.3"` proves the comparison; only
    // this proves the plugin behaves that way inside an actual old Caido.
    expect(c?.expected_version).toBe("0.55.3");
    expect(
      c?.reported_version,
      `leg C reported ${String(c?.reported_version)} — it was not run against the 0.55.3 binary`,
    ).toBe("0.55.3");
  });

  it("names BOTH the required and the reported version when the guard was reached", () => {
    if (c?.guard_reached !== true) {
      // A legitimate alternative outcome. Recorded, not silently tolerated: the
      // message must still say what happened.
      expect(
        c?.message,
        `leg C did not reach the guard (mode ${String(c?.refusal_mode)}) and recorded no message`,
      ).toBeTruthy();
      return;
    }
    const msg = String(c.message ?? "");
    expect(msg, "leg C reached the guard but recorded no message").not.toBe("");
    expect(msg, "the refusal does not name the REQUIRED version").toContain(
      "0.57.1",
    );
    expect(msg, "the refusal does not name the REPORTED version").toContain(
      "0.55.3",
    );
    // The clause that makes it an explanation rather than an error code.
    expect(
      msg.toLowerCase(),
      "the refusal does not say WHY the difference matters — that clause is the " +
        "difference between a clear message and an obscure failure, and it is the requirement",
    ).toContain("measured");
    expect(
      c.host_log_incompatible_lines,
      "the refusal never reached the host log, which is COMPAT-01's only " +
        "operator-visible surface in Phase 1 (decision P6-D2)",
    ).toBeGreaterThanOrEqual(1);
  });

  it("wrote ZERO artifact rows after a JavaScript response was proxied", () => {
    // The refusal asserted as something that did NOT happen. `database_file_present:
    // false` is the stronger form of the same claim — the guard returned before
    // sdk.meta.db() was ever called, so there is no file to count rows in.
    expect(
      c?.artifact_rows_after_proxied_js,
      `leg C wrote ${String(c?.artifact_rows_after_proxied_js)} artifact row(s) on a build ` +
        `below the declared minimum. The guard did not guard.`,
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// REQUIRED_SURFACES vs COVERAGE.md — the reconciliation, mechanised
// ---------------------------------------------------------------------------

type CoverageRow = { row: number; name: string; disposition: string };

/**
 * Parse COVERAGE.md's three tables.
 *
 * NORMALISATION, stated so it is reproducible rather than magic: take the
 * backticked spans of the Surface cell. One span is the name, with any
 * parenthesised parameter list stripped (`Database.exec(sql)` -> `Database.exec`).
 * Two spans are a module and its member, joined with a dot
 * (`` `crypto` (bare) — `createHash` `` -> `crypto.createHash`).
 */
function parseCoverage(): CoverageRow[] {
  if (!existsSync(COVERAGE)) throw new Error(`${COVERAGE} is missing`);
  const out: CoverageRow[] = [];
  for (const line of readFileSync(COVERAGE, "utf8").split("\n")) {
    const m = /^\|\s*(\d+)\s*\|(.+?)\|(.+?)\|/.exec(line);
    if (m === null) continue;
    const spans = [...m[2].matchAll(/`([^`]+)`/g)].map((x) => x[1]);
    if (spans.length === 0) continue;
    const name =
      spans.length >= 2
        ? `${spans[0]}.${spans[1]}`
        : spans[0].replace(/\(.*\)$/, "");
    out.push({
      row: Number.parseInt(m[1], 10),
      name,
      disposition: m[3].trim(),
    });
  }
  return out;
}

describe("REQUIRED_SURFACES reconciles with COVERAGE.md", () => {
  const rows = parseCoverage();
  const integrate = rows.filter((r) => r.disposition === "**INTEGRATE**");

  it("parses the matrix at all", () => {
    expect(
      rows.length,
      `${COVERAGE} parsed to ${String(rows.length)} rows; the table shape changed and this gate ` +
        `is no longer reading it. Fix the parser in this file, do not delete the assertion.`,
    ).toBe(40);
    expect(integrate.length, "no INTEGRATE rows parsed").toBeGreaterThan(0);
  });

  it("every INTEGRATE row appears in REQUIRED_SURFACES, at the row number it claims", () => {
    // COVERAGE.md's own enforcement clause, made mechanical: "a surface marked
    // INTEGRATE must appear in REQUIRED_SURFACES". Row NUMBER as well as name,
    // so a row renumbered by an insertion is caught too.
    const byRow = new Map(
      REQUIRED_SURFACES.filter((s) => s.coverageRow !== null).map((s) => [
        s.coverageRow,
        s.name,
      ]),
    );
    const missing = integrate.filter((r) => byRow.get(r.row) !== r.name);
    expect(
      missing.map(
        (r) => `row ${String(r.row)} ${r.name} -> ${String(byRow.get(r.row))}`,
      ),
      "COVERAGE.md marks these INTEGRATE but REQUIRED_SURFACES does not carry them at that row. " +
        "Either add them to packages/backend/src/compat.ts or change their disposition in " +
        "COVERAGE.md with a reason — silently dropping one is the thing this gate exists to stop.",
    ).toEqual([]);
  });

  it("every row-carrying REQUIRED_SURFACES entry is an INTEGRATE row", () => {
    // The other direction. A surface the guard requires but the matrix marks
    // OPT-OUT means the matrix is describing a plugin that no longer exists.
    const integrateRows = new Set(integrate.map((r) => r.row));
    const orphans = REQUIRED_SURFACES.filter(
      (s) => s.coverageRow !== null && !integrateRows.has(s.coverageRow),
    ).map((s) => `${s.name} (claims COVERAGE.md row ${String(s.coverageRow)})`);
    expect(
      orphans,
      "REQUIRED_SURFACES requires these at runtime but COVERAGE.md does not mark them INTEGRATE",
    ).toEqual([]);
  });

  it("a capability that is not an API surface carries no row, and is the only such entry", () => {
    // sqlite >= 3.24 is a required CAPABILITY, not one of the 40 enumerated API
    // surfaces, so it has no row to point at. Asserted as exactly one, so a
    // future entry cannot slip through the COVERAGE.md cross-check by setting
    // coverageRow to null.
    const rowless = REQUIRED_SURFACES.filter((s) => s.coverageRow === null);
    expect(
      rowless.map((s) => s.name),
      "an entry with no COVERAGE.md row escapes the cross-check above; only the " +
        "SQLite capability is allowed to",
    ).toEqual([`sqlite.version>=${MIN_SQLITE}`]);
    expect(rowless[0].scope).toBe("capability");
  });

  it("the summary counts match the rows they summarise", () => {
    // This table previously read INTEGRATE 16 against 17 marked rows, and its
    // opt-out buckets summed to 24 against 23 opt-out rows — adding to 40 only
    // because two errors cancelled. Corrected during 01-06 and now gated, so it
    // cannot drift from the table again.
    const md = readFileSync(COVERAGE, "utf8");
    const count = (label: string): number => {
      const m = new RegExp(`\\|\\s*${label}[^|]*\\|\\s*(\\d+)\\s*\\|`).exec(md);
      if (m === null)
        throw new Error(`${COVERAGE} has no summary row for "${label}"`);
      return Number.parseInt(m[1], 10);
    };
    const gated = count("INTEGRATE \\(in ");
    const sourceOnly = count("INTEGRATE \\(source-only");
    expect(
      gated,
      "the summary's gated-INTEGRATE count does not match the marked rows",
    ).toBe(integrate.length);
    expect(
      gated,
      "the summary's gated-INTEGRATE count does not match REQUIRED_SURFACES",
    ).toBe(REQUIRED_SURFACES.filter((s) => s.coverageRow !== null).length);
    expect(
      sourceOnly,
      "the source-only count does not match the rows marked INTEGRATE (source-only)",
    ).toBe(rows.filter((r) => r.disposition.includes("source-only")).length);
    const optOut = rows.filter((r) =>
      r.disposition.startsWith("OPT-OUT"),
    ).length;
    const buckets =
      count("OPT-OUT \\(deferred") +
      count("OPT-OUT \\(prohibited") +
      count("OPT-OUT \\(structurally") +
      count("OPT-OUT \\(available");
    expect(
      buckets,
      "the opt-out buckets do not sum to the number of OPT-OUT rows",
    ).toBe(optOut);
    expect(
      gated + sourceOnly + optOut,
      "the dispositions do not account for all 40 rows",
    ).toBe(rows.length);
  });
});
