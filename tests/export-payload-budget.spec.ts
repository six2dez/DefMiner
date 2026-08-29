// tests/export-payload-budget.spec.ts — what an export can actually carry across
// the RPC, measured rather than assumed.
//
// ---------------------------------------------------------------------------
// THE QUESTION D-04 LEFT OPEN
// ---------------------------------------------------------------------------
// `05-CONTEXT.md` D-04 fixes that an export is a browser download over the RPC and
// that NO server-side file is written: the backend serialises, the frontend builds
// a Blob and triggers a download onto the operator's own machine. It closes with
// "the export size is bounded by the row count that crosses the RPC in memory" —
// which names the bound without giving it a number. `05-RESEARCH.md § Open
// Questions` item 3 is the same question restated: does the export cross as ONE
// string, and does the RPC have a payload ceiling? Not documented in the SDK
// typings.
//
// ---------------------------------------------------------------------------
// WHAT THIS SPEC CAN AND CANNOT ANSWER — STATED, NOT IMPLIED
// ---------------------------------------------------------------------------
// CAN: how many bytes and how many UTF-16 code units a 50,000-row export IS, and
// how long serialising it takes. Those are properties of the data and the
// serialiser, and this file measures all three and ASSERTS bounds on them, so a
// regression is a failure rather than a log line.
//
// CANNOT: whether Caido's RPC accepts a payload of that size. That is LIVE-ONLY,
// for exactly the reason `packages/backend/test/fixtures/sqlite-fixture.ts` gives
// about pool affinity — a fixture that faked it would teach the specs a wrong
// lesson. So the ceiling below is a BUDGET this project sets, not a limit this
// project discovered, and it is labelled as one. What the measurement does is
// decide the CONSTANT from that budget instead of from a guess: change the field
// widths and the derivation assertion fails.
//
// ---------------------------------------------------------------------------
// THE OUTCOME THIS MEASUREMENT PRODUCED: CHUNKED.
// ---------------------------------------------------------------------------
// A 50,000-row export is ~13.9 MiB of CSV and ~17.5 MiB of JSON (the exact
// numbers are asserted below and printed in the failure messages). Nothing
// measured here says a 17.5 MiB string crosses the RPC safely, and "probably
// fine" is not a measurement — so the export is chunked, at
// EXPORT_RPC_CHUNK_ROWS rows per call, and the frontend concatenates before
// building the Blob. D-04 is preserved EXACTLY: still no server file, still a
// browser download, still bounded by what crosses in memory. The only thing that
// changes is that "what crosses in memory" is now one chunk instead of one export.
//
// The chunk boundary is proved byte-identical to a single pass below, in both
// formats, because chunking whose seams have never been compared is chunking
// nobody has tested.

import { describe, expect, it } from "vitest";

import { EXPORT_RPC_CHUNK_ROWS } from "../packages/backend/src/store/export";

/** The largest export the product contemplates — the figure `§ Open Questions`
 *  item 3 names and the size everything below is measured at. */
const ROW_COUNT = 50_000;

// ---------------------------------------------------------------------------
// THE BOUNDS. Each is a named constant with its rationale on one line, because a
// bound whose reason is not written down is a number the next person will "fix".
// ---------------------------------------------------------------------------

/** Serialised size ceiling for a 50,000-row export in EITHER format. ~1.6x the
 *  measured JSON payload: loose enough to survive ordinary field drift, tight
 *  enough to fail if a column stops being truncated. */
const MAX_SERIALISED_BYTES = 28 * 1024 * 1024;

/** Peak single JS string, in UTF-16 code units — what the single QuickJS thread
 *  actually holds. Separate from the byte bound because UTF-8 bytes and UTF-16
 *  units differ for every non-ASCII row, and the fixture below contains some. */
const MAX_PEAK_STRING_CHARS = 24 * 1024 * 1024;

/** Serialisation wall-clock ceiling. Deliberately ~100x the measured figure: this
 *  bound exists to catch an ALGORITHM change (quadratic string building), not to
 *  benchmark whatever machine CI happens to run on. */
const MAX_SERIALISE_MS = 5_000;

/**
 * The per-RPC-call payload BUDGET. 8 MiB.
 *
 * A BUDGET, NOT A DISCOVERED LIMIT — see the header. Chosen so that: it sits
 * below the measured 50,000-row payload in both formats, so the chunk seam is
 * exercised by the largest export the product contemplates rather than being a
 * code path nobody runs; and it keeps the peak string on the single QuickJS
 * thread in single-digit megabytes, the order of magnitude every other bound in
 * this codebase lives at.
 */
const MAX_RPC_PAYLOAD_BYTES = 8 * 1024 * 1024;

/**
 * THE CONSTANT NOW LIVES IN PRODUCTION CODE, AND THIS FILE STILL DERIVES IT.
 *
 * `EXPORT_RPC_CHUNK_ROWS` was exported from THIS SPEC while no production
 * statement needed it. Plan 05-11 moved it to
 * `packages/backend/src/store/export.ts` — production code must not import from
 * `tests/` — and the derivation stayed here, where the 50,000-row measurement
 * it is derived FROM lives. Moving the derivation too would have meant carrying
 * a copy of that fixture into the backend package, which is the second copy this
 * whole file exists to avoid.
 *
 * So: the value is the exporter's, and the tests below still multiply it by the
 * MEASURED worst-case bytes-per-row and assert the product fits inside
 * {@link MAX_RPC_PAYLOAD_BYTES} AND that one step larger would not. It is
 * derived from a serialisation that actually ran, and it goes stale loudly
 * rather than silently if the row shape widens.
 */

/** The step used to prove the constant is near its budget rather than
 *  arbitrarily conservative. */
const CHUNK_STEP = 5_000;

// ---------------------------------------------------------------------------
// THE FIXTURE — observation-shaped, with realistic field widths.
// ---------------------------------------------------------------------------

/** One observation row as `observations.ts` stores it (`ObservationRow`). */
type ObservationRow = {
  project_id: string;
  sha256: string;
  request_id: string;
  url: string;
  status: number;
  content_type: string | null;
  observed_at: number;
};

const COLUMNS: (keyof ObservationRow)[] = [
  "project_id",
  "sha256",
  "request_id",
  "url",
  "status",
  "content_type",
  "observed_at",
];

const HEX = "0123456789abcdef";

function syntheticRow(i: number): ObservationRow {
  let sha = "";
  for (let k = 0; k < 64; k += 1) sha += HEX[(i * 7 + k * 13) % 16];

  const host = `assets${String(i % 37)}.cdn.example.test`;
  const path = `/static/js/chunk-${String(i % 997).padStart(4, "0")}/bundle.${sha.slice(0, 8)}.min.js`;

  // Every 250th row carries multi-byte UTF-8 in the path. Not decoration: it is
  // what makes the byte bound and the UTF-16 bound two DIFFERENT measurements
  // rather than the same number written twice, and an export of real target URLs
  // will contain non-ASCII.
  const unicode = i % 250 === 0 ? "/ドキュメント/naïve-résumé" : "";

  return {
    project_id: `proj_${String(i % 3).padStart(2, "0")}_9f2c1ab4`,
    sha256: sha,
    request_id: `req_${String(1_000_000 + i)}`,
    // QUERY VALUES ARE ALREADY REDACTED AT WRITE TIME (`QUERY_VALUE_REDACTION` in
    // observations.ts). D-07 amended the export copy for exactly this reason: a
    // "raw" export cannot un-redact what was never stored. The fixture therefore
    // models the redacted shape, which is also the shape whose WIDTH matters here.
    url: `https://${host}${path}${unicode}?v=<redacted>&locale=<redacted>&build=<redacted>`,
    status: 200,
    content_type: "application/javascript; charset=utf-8",
    observed_at: 1_700_000_000_000 + i * 37,
  };
}

const ROWS: ObservationRow[] = Array.from({ length: ROW_COUNT }, (_, i) =>
  syntheticRow(i),
);

// ---------------------------------------------------------------------------
// THE SERIALISERS — a MEASUREMENT-ONLY stand-in, labelled as one.
// ---------------------------------------------------------------------------
// `packages/engine/src/csv.ts` (UISEC-02) is plan 05-03's and does not exist yet.
// This file needs bytes on the floor now, so it carries the smallest serialiser
// that produces the RIGHT SIZE: RFC 4180 quoting plus UISEC-02's leading-
// `=`/`+`/`-`/`@`/TAB/CR apostrophe prefix applied BEFORE quoting. Modelling the
// prefix matters for the measurement as well as for the rule — it is a byte per
// affected cell, and a serialiser that omitted it would under-report.
//
// When 05-03 lands, plan 05-11 replaces this with the engine's implementation and
// re-runs these bounds. The escaping ORDER is asserted below so this stand-in
// cannot be silently wrong about the rule it stands in for.

const RISKY_LEAD = /^[=+\-@\t\r]/;

function csvCell(value: string | number | null): string {
  let s = value === null ? "" : String(value);
  if (RISKY_LEAD.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function csvRow(row: ObservationRow): string {
  return COLUMNS.map((c) => csvCell(row[c])).join(",");
}

const CSV_HEADER = COLUMNS.map((c) => csvCell(c)).join(",");

/** CSV for a slice. `withHeader` is the whole chunking contract in one flag: the
 *  header belongs to the FIRST chunk and to no other. */
function toCsv(rows: ObservationRow[], withHeader: boolean): string {
  const out: string[] = [];
  if (withHeader) out.push(CSV_HEADER);
  for (const r of rows) out.push(csvRow(r));
  return `${out.join("\r\n")}\r\n`;
}

/** The BODY of a JSON array — the elements, comma-joined, without the brackets.
 *  A JSON export cannot be chunked by concatenating complete arrays; the seam has
 *  to be inside the brackets, which is what this shape makes possible. */
function toJsonBody(rows: ObservationRow[]): string {
  return rows.map((r) => JSON.stringify(r)).join(",");
}

function toJson(rows: ObservationRow[]): string {
  return `[${toJsonBody(rows)}]`;
}

/** Serialise, and report how long it took and how big the result is. */
function measure(fn: () => string): {
  text: string;
  bytes: number;
  chars: number;
  ms: number;
} {
  const started = Date.now();
  const text = fn();
  const ms = Date.now() - started;
  return {
    text,
    bytes: Buffer.byteLength(text, "utf8"),
    chars: text.length,
    ms,
  };
}

const CSV = measure(() => toCsv(ROWS, true));
const JSON_OUT = measure(() => toJson(ROWS));

/** The worst case of the two formats, per row — what the budget must be spent
 *  against. Budgeting on the cheaper format would under-count by ~26%. */
const WORST_BYTES_PER_ROW = Math.max(CSV.bytes, JSON_OUT.bytes) / ROW_COUNT;

describe("what a 50,000-row export actually costs", () => {
  it("is bounded in serialised BYTES, in both formats", () => {
    expect(
      CSV.bytes,
      `CSV: ${String(CSV.bytes)} bytes (${(CSV.bytes / 1048576).toFixed(2)} MiB) for ${String(ROW_COUNT)} rows`,
    ).toBeLessThanOrEqual(MAX_SERIALISED_BYTES);
    expect(
      JSON_OUT.bytes,
      `JSON: ${String(JSON_OUT.bytes)} bytes (${(JSON_OUT.bytes / 1048576).toFixed(2)} MiB) for ${String(ROW_COUNT)} rows`,
    ).toBeLessThanOrEqual(MAX_SERIALISED_BYTES);

    // Non-vacuity: a bound over an empty or collapsed payload passes trivially.
    expect(CSV.bytes, "the CSV payload is implausibly small").toBeGreaterThan(
      1024 * 1024,
    );
  });

  it("is bounded in PEAK SINGLE-STRING length, which is not the same number", () => {
    expect(
      CSV.chars,
      `CSV: ${String(CSV.chars)} UTF-16 units held as one string`,
    ).toBeLessThanOrEqual(MAX_PEAK_STRING_CHARS);
    expect(
      JSON_OUT.chars,
      `JSON: ${String(JSON_OUT.chars)} UTF-16 units held as one string`,
    ).toBeLessThanOrEqual(MAX_PEAK_STRING_CHARS);

    // The two measurements are genuinely different, because the fixture carries
    // multi-byte rows. If this ever becomes an equality, the non-ASCII rows have
    // been dropped and the byte bound has quietly stopped measuring anything the
    // char bound does not.
    expect(
      JSON_OUT.bytes,
      "bytes equal chars — the non-ASCII rows are gone from the fixture",
    ).toBeGreaterThan(JSON_OUT.chars);
  });

  it("is bounded in ELAPSED SERIALISATION TIME", () => {
    expect(
      CSV.ms,
      `CSV serialisation took ${String(CSV.ms)} ms`,
    ).toBeLessThanOrEqual(MAX_SERIALISE_MS);
    expect(
      JSON_OUT.ms,
      `JSON serialisation took ${String(JSON_OUT.ms)} ms`,
    ).toBeLessThanOrEqual(MAX_SERIALISE_MS);
  });
});

describe("EXPORT_RPC_CHUNK_ROWS is DERIVED from the measurement", () => {
  it("is a positive integer no greater than the export size", () => {
    expect(Number.isInteger(EXPORT_RPC_CHUNK_ROWS)).toBe(true);
    expect(EXPORT_RPC_CHUNK_ROWS).toBeGreaterThan(0);
    expect(EXPORT_RPC_CHUNK_ROWS).toBeLessThanOrEqual(ROW_COUNT);
  });

  it("fits the measured per-row cost inside the RPC payload budget", () => {
    const payload = EXPORT_RPC_CHUNK_ROWS * WORST_BYTES_PER_ROW;
    expect(
      payload,
      `${String(EXPORT_RPC_CHUNK_ROWS)} rows x ${WORST_BYTES_PER_ROW.toFixed(1)} measured bytes/row = ` +
        `${(payload / 1048576).toFixed(2)} MiB, budget ${String(MAX_RPC_PAYLOAD_BYTES / 1048576)} MiB. ` +
        `Lower EXPORT_RPC_CHUNK_ROWS.`,
    ).toBeLessThanOrEqual(MAX_RPC_PAYLOAD_BYTES);
  });

  it("is NEAR the budget, not arbitrarily conservative", () => {
    // The other half. A constant of 1 would pass the test above and make the
    // export 50,000 RPC round-trips, so "fits" on its own proves nothing about
    // whether the number was chosen or merely made small.
    const nextStep = (EXPORT_RPC_CHUNK_ROWS + CHUNK_STEP) * WORST_BYTES_PER_ROW;
    expect(
      nextStep,
      `${String(EXPORT_RPC_CHUNK_ROWS + CHUNK_STEP)} rows would still fit the budget — ` +
        `EXPORT_RPC_CHUNK_ROWS is lower than the measurement requires.`,
    ).toBeGreaterThan(MAX_RPC_PAYLOAD_BYTES);
  });

  it("records the outcome: the export is CHUNKED, not one call", () => {
    // The measurement produced the second of D-04's two outcomes. Asserted rather
    // than narrated, so a later widening of the budget that flips the answer back
    // to a single call fails here and gets written down.
    expect(
      EXPORT_RPC_CHUNK_ROWS,
      "a single call now carries the whole export — update the header and 05-11",
    ).toBeLessThan(ROW_COUNT);
    expect(Math.ceil(ROW_COUNT / EXPORT_RPC_CHUNK_ROWS)).toBe(3);
  });
});

describe("chunking is byte-identical to a single pass", () => {
  const chunks: ObservationRow[][] = [];
  for (let i = 0; i < ROW_COUNT; i += EXPORT_RPC_CHUNK_ROWS) {
    chunks.push(ROWS.slice(i, i + EXPORT_RPC_CHUNK_ROWS));
  }

  it("CSV: concatenated chunks equal the single pass, header included ONCE", () => {
    const joined = chunks.map((rows, i) => toCsv(rows, i === 0)).join("");
    expect(joined).toBe(CSV.text);
    expect(Buffer.byteLength(joined, "utf8")).toBe(CSV.bytes);

    // The header is a LINE, counted as a line — not a substring, which would also
    // match a row that happened to contain the header text.
    const headerLines = joined
      .split("\r\n")
      .filter((line) => line === CSV_HEADER).length;
    expect(headerLines, "the CSV header must appear exactly once").toBe(1);
    expect(joined.startsWith(`${CSV_HEADER}\r\n`)).toBe(true);
  });

  it("JSON: concatenated chunk BODIES equal the single pass", () => {
    // The seam is inside the brackets. Concatenating complete `[...]` arrays would
    // produce `][`, which is why the backend returns bodies and the frontend wraps.
    const joined = `[${chunks.map((rows) => toJsonBody(rows)).join(",")}]`;
    expect(joined).toBe(JSON_OUT.text);
    expect(Buffer.byteLength(joined, "utf8")).toBe(JSON_OUT.bytes);
    // And it is still parseable JSON of the right length, so "byte-identical" is
    // not accidentally identical to something malformed.
    expect((JSON.parse(joined) as unknown[]).length).toBe(ROW_COUNT);
  });

  it("the chunk seam is real — every chunk is non-empty and they partition the rows", () => {
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length > 0)).toBe(true);
    expect(chunks.reduce((n, c) => n + c.length, 0)).toBe(ROW_COUNT);
  });
});

describe("the CSV stand-in models UISEC-02's rule, not an approximation of it", () => {
  // This serialiser exists to produce the right SIZE, but a size derived from the
  // wrong escaping is the wrong size. `packages/engine/src/csv.ts` (plan 05-03)
  // replaces it; until then these four cases pin the behaviour it stands in for.
  it("apostrophe-prefixes a formula lead and THEN quotes", () => {
    expect(csvCell("=1+1")).toBe(`"'=1+1"`);
    expect(csvCell("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
    expect(csvCell("-2")).toBe(`"'-2"`);
    expect(csvCell("\tlead")).toBe(`"'\tlead"`);
  });

  it("doubles embedded quotes and leaves an ordinary value alone", () => {
    expect(csvCell('say "hi"')).toBe(`"say ""hi"""`);
    expect(csvCell("https://example.test/a.js")).toBe(
      `"https://example.test/a.js"`,
    );
    expect(csvCell(null)).toBe(`""`);
  });
});
