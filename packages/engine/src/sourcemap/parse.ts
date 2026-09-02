// packages/engine/src/sourcemap/parse.ts — D-04's decode and MAP-02's reconstruction.
//
// ---------------------------------------------------------------------------
// NO PATTERN HERE EITHER, FOR THE REASON `announce.ts` STATES AT LENGTH.
// ---------------------------------------------------------------------------
// REDOS_INTERRUPTIBLE is false and REDOS_RECOVERY is `kill`. The base64
// alphabet check below is a character loop over code points rather than the
// one-line pattern it obviously wants to be, and the XSSI prefix is stripped by
// `startsWith` plus `indexOf` of a newline. `parse.spec.ts` parses THIS FILE
// with the TypeScript compiler and asserts zero pattern literals and zero
// `new RegExp` constructions.
//
// ---------------------------------------------------------------------------
// REASONS, NEVER MESSAGES (T-07-10)
// ---------------------------------------------------------------------------
// Every refusal below is a member of {@link MAP_PARSE_REASONS} — a CLOSED,
// DefMiner-authored vocabulary — and NEVER a caught exception's text.
// `contract.ts` states the rule for the settings surface and it is the same rule
// here: the frontend maps each member to its own copy, so nothing a driver said
// can be interpolated into a sentence the operator reads. Plan 07-05 writes
// these codes into `analyses.error` and plan 07-08 maps them to copy.
//
// ---------------------------------------------------------------------------
// SDK-FREE (DET-03). A string in, a result out. No Caido, no filesystem, no
// network — which is what lets the whole MAP-05 hostile corpus run under plain
// vitest on Node on every commit.

import { decodeBase64 } from "../decode";

/**
 * The `data:` forms D-04 accepts, and there are exactly two.
 *
 * ANY OTHER `data:` FORM IS NOT DECODED and is reported as an external
 * announcement — including `;charset=iso-8859-1;base64,`, the percent-encoded
 * (non-base64) form, and `data:application/json,` with no encoding at all. That
 * is a deliberate narrowing: an announcement DefMiner does not decode costs a
 * counter increment (D-03), while a decoder that accepts every `data:` spelling
 * is a second parser for target-controlled bytes.
 *
 * MATCHED CASE-INSENSITIVELY OVER THE PREFIX REGION ONLY. RFC 2397 makes the
 * scheme, the media type and the parameter names case-insensitive, and
 * `;charset=UTF-8;base64,` is a spelling real bundlers emit — refusing it would
 * lose maps for a reason that is not a property of the map. The comparison
 * lower-cases at most {@link B64_PREFIX_MAX} characters: lower-casing a whole
 * multi-megabyte data URI to test a 43-byte prefix would allocate a second copy
 * of the payload on the proxy thread.
 */
export const B64_PREFIXES: readonly string[] = Object.freeze([
  "data:application/json;base64,",
  "data:application/json;charset=utf-8;base64,",
]);

/** The longest prefix, so the case-insensitive compare never copies the payload. */
const B64_PREFIX_MAX = Math.max(...B64_PREFIXES.map((p) => p.length));

/**
 * Why a map was not reconstructed. A CLOSED, DefMiner-authored vocabulary.
 *
 * Declared once as a runtime array with the type DERIVED from it, in
 * `OPERATOR_CLAUSE_REJECTIONS`' idiom, because that is what makes the
 * "every reason has a case" gate in `parse.spec.ts` mechanical: a ninth reason
 * added here with no case fails immediately, and a hand-maintained parallel
 * union would drift silently.
 *
 * `empty` appears in two positions and that is deliberate rather than an
 * overload: it is a whole-map refusal when the payload decodes to nothing, and a
 * PER-INDEX skip reason when a legal map simply has no content at that index.
 * Both mean the same thing to the operator — there is nothing there — and
 * splitting them would be two words for one fact.
 */
export const MAP_PARSE_REASONS = Object.freeze([
  "too_large",
  "too_deep",
  "too_many_sources",
  "malformed_json",
  "malformed_base64",
  "nested_sections",
  "not_a_map",
  "empty",
] as const);

/** One member of {@link MAP_PARSE_REASONS}. */
export type MapParseReason = (typeof MAP_PARSE_REASONS)[number];

/** What {@link decodeInlineMap} found at the end of an announcement. */
export type InlineMapResult =
  | { readonly kind: "inline"; readonly json: string }
  | { readonly kind: "external"; readonly json: null }
  | {
      readonly kind: "refused";
      readonly reason: MapParseReason;
      readonly json: null;
    };

const EXTERNAL: InlineMapResult = Object.freeze({
  kind: "external",
  json: null,
});

function refused(reason: MapParseReason): InlineMapResult {
  return { kind: "refused", reason, json: null };
}

/**
 * The largest ENCODED payload that could decode to `maxBytes` bytes.
 *
 * `Math.ceil(maxBytes * 4 / 3) + 4` — base64 expands 4:3, and the `+ 4` is one
 * whole quantum of slack so the boundary is never crossed by rounding alone.
 * Exported so a spec can state the boundary by the same expression the gate
 * uses, rather than by a copied number that would stop tracking `MAP_MAX_BYTES`
 * the first time the ladder is re-run.
 */
export function encodedCeiling(maxBytes: number): number {
  return Math.ceil((maxBytes * 4) / 3) + 4;
}

/**
 * Is `payload` canonical, fully-padded base64?
 *
 * IT MUST BE CHECKED BEFORE DECODING, because `Buffer.from(x, "base64")` is
 * LENIENT: it silently skips characters outside the alphabet and returns a
 * SHORTER buffer rather than failing. A map with one stray byte would decode to
 * a truncated document, `JSON.parse` would report a syntax error somewhere
 * unrelated, and the reason the operator saw would describe the symptom instead
 * of the cause — or worse, the truncation would land on a boundary that still
 * parses.
 *
 * A CHARACTER LOOP, NOT A PATTERN. See this file's header.
 *
 * STRICT ON PADDING, and the residual is stated rather than hidden: an unpadded
 * but otherwise legal payload is refused as `malformed_base64`. Every emitter
 * that matters here pads — `Buffer.toString("base64")` and `btoa` both do — and
 * requiring it is what makes "a truncated final quantum" distinguishable from
 * "a short last group", which is exactly the silent-shortening this check
 * exists to catch. If the field ever shows unpadded inline maps, relax to
 * accept `length % 4` of 2 or 3 and say so here.
 */
function isCanonicalBase64(payload: string): boolean {
  if (payload.length % 4 !== 0) return false;
  let pad = 0;
  while (
    pad < payload.length &&
    payload.charCodeAt(payload.length - 1 - pad) === 0x3d
  ) {
    pad += 1;
  }
  if (pad > 2) return false;
  const end = payload.length - pad;
  for (let i = 0; i < end; i += 1) {
    const code = payload.charCodeAt(i);
    const inAlphabet =
      (code >= 0x41 && code <= 0x5a) || // A-Z
      (code >= 0x61 && code <= 0x7a) || // a-z
      (code >= 0x30 && code <= 0x39) || // 0-9
      code === 0x2b || // +
      code === 0x2f; // /
    if (!inAlphabet) return false;
  }
  return true;
}

/**
 * The payload of an inline announcement, decoded — or a tag saying why not.
 *
 * THE ENCODED-LENGTH GATE FIRES FIRST, BEFORE ANYTHING IS ALLOCATED. That is the
 * whole shape of this function: a map that will be refused for size never has
 * its decoded buffer materialised, so the refusal costs a comparison rather than
 * a multi-megabyte allocation on the proxy thread (T-07-02).
 *
 * REFUSE, NEVER TRUNCATE. A truncated map decodes to WRONG POSITIONS rather
 * than to an error, which is the quiet-wrongness class every gate in this
 * codebase exists to prevent.
 *
 * @param maxBytes the decoded ceiling — `MAP_MAX_BYTES` in production, which
 *   `thresholds.ts` derives from the D-10 probe's measured stall bound.
 */
export function decodeInlineMap(
  url: string,
  maxBytes: number,
): InlineMapResult {
  const head = (
    url.length > B64_PREFIX_MAX ? url.slice(0, B64_PREFIX_MAX) : url
  ).toLowerCase();
  let payload: string | null = null;
  for (const prefix of B64_PREFIXES) {
    if (head.startsWith(prefix)) {
      payload = url.slice(prefix.length);
      break;
    }
  }
  // Not an inline base64 map. D-01 refuses every fetch and D-03 makes this a
  // counter increment and nothing else, so there is nothing further to do and
  // nothing was decoded.
  if (payload === null) return EXTERNAL;

  if (payload.length === 0) return refused("empty");
  if (payload.length > encodedCeiling(maxBytes)) return refused("too_large");
  if (!isCanonicalBase64(payload)) return refused("malformed_base64");

  const json = decodeBase64(payload);
  if (json.length === 0) return refused("empty");
  // BYTES, not UTF-16 code units. `maxBytes` is a byte bound and `json.length`
  // under-counts every character outside the Basic Latin block — a map of
  // CJK-commented sources would pass a length check while being well over the
  // ceiling in the units the ceiling was measured in.
  if (Buffer.byteLength(json, "utf8") > maxBytes) return refused("too_large");
  return { kind: "inline", json };
}

/** One recovered original source: its index, its label as delivered, its content. */
export type RecoveredSource = {
  readonly sourcesIndex: number;
  /**
   * The `sources` entry VERBATIM, or null.
   *
   * NOT sanitised, NOT normalised, NOT rewritten. It is evidence, and D-06 puts
   * sanitisation at display time only. Null when the map declares the label as
   * null — which ECMA-426 permits ("null if the source name is not known") — and
   * the null is a value, never the string "null".
   */
  readonly sourcesVerbatim: string | null;
  readonly content: string;
};

/** An index that carried no content, and why. */
export type SkippedSource = {
  readonly sourcesIndex: number;
  readonly reason: MapParseReason;
};

/** The bounds `parseSourceMap` enforces, passed in rather than imported. */
export type ParseLimits = {
  /** `SOURCE_ROWS_PER_MAP_MAX` in production. A ROW bound, enforced in rows. */
  readonly maxSourceRows: number;
};

/**
 * How many rows ONE recovered source writes, under D-05.
 *
 * One `sources` row per new content hash and one `source_sightings` row per
 * `(map, index)`. Named here rather than written as a bare 2 at the comparison,
 * because it is the exact quantity `thresholds.ts` uses to derive
 * `SOURCE_ROWS_PER_MAP_MAX` from the probe's source density and the one
 * `ROWS_INSERTED_PER_ITERATION_MAX` sums over. A literal at each of those three
 * sites is how the units came apart in the first place (07-REVIEW.md MD-01).
 */
const ROWS_PER_RECOVERED_SOURCE = 2;

/** Reconstructed, or refused with a named reason. */
export type MapParseResult =
  | {
      readonly ok: true;
      readonly recovered: readonly RecoveredSource[];
      readonly skipped: readonly SkippedSource[];
      readonly declaredSources: number;
      readonly sectioned: boolean;
    }
  | { readonly ok: false; readonly reason: MapParseReason };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The XSSI guard ECMA-426 permits a server to prepend, through end-of-line. */
const XSSI_PREFIX = ")]}'";

/**
 * Strip a leading `)]}'` line, by `startsWith` and `indexOf`. Never a pattern.
 *
 * ECMA-426 attaches this to HTTP(S) delivery, which D-01 excludes outright — so
 * it SHOULD NEVER OCCUR inside a `data:` URI. It is handled anyway, because
 * "should never occur" is not a property of target-controlled input, and the
 * cost of handling it is one `startsWith` against a four-character literal.
 *
 * A document that is nothing but the guard line, with no newline after it,
 * strips to the empty string and is then refused `malformed_json` — which is
 * what it is.
 */
function stripXssiPrefix(json: string): string {
  if (!json.startsWith(XSSI_PREFIX)) return json;
  const newline = json.indexOf("\n");
  return newline < 0 ? "" : json.slice(newline + 1);
}

/**
 * Which reason a thrown value maps to. DefMiner's word, never the exception's.
 *
 * `RangeError` means the parser ran out of stack, which for target-controlled
 * JSON means a nesting depth chosen to exhaust it (T-07-03). Everything else a
 * `JSON.parse` can throw is a badly-formed document.
 *
 * SPIKE-06 measured the QuickJS failure directly: 710 nested brackets parsed and
 * 718 did not, the `failure_class` was `catchable-stack-throw` at EVERY failing
 * depth, and the host survived all 18 probes. Catch-and-degrade is therefore
 * available and a pre-parse depth gate is not required — but the catch has to
 * EXIST, and the mapping has to be executed by something rather than described.
 *
 * IT IS EXPORTED SO IT CAN BE, and the reason is worth stating: V8's
 * `JSON.parse` is ITERATIVE and does not throw on nesting at any depth, so no
 * document can drive this branch from the front door on Node. Calling the
 * classifier directly with a real `RangeError` is the only honest way to run a
 * branch whose trigger the test runtime cannot produce.
 */
export function reasonForParseError(error: unknown): MapParseReason {
  return error instanceof RangeError ? "too_deep" : "malformed_json";
}

/** The rows collected so far, across one map or across one level of sections. */
type Accumulator = {
  readonly recovered: RecoveredSource[];
  readonly skipped: SkippedSource[];
  /** How many `sources` entries the document DECLARED, summed across sections. */
  declared: number;
  /** The next aggregate index to hand out. Equals `i` for a non-sectioned map. */
  next: number;
};

/**
 * Absorb one map's `sources` / `sourcesContent` pair into `acc`.
 *
 * ITERATES `sources` AND GUARDS ON THE CONTENT ARRAY'S LENGTH. Never the other
 * way round: `sourcesContent` may legally be SHORTER than `sources` — the spec
 * conditions on `sourcesContentCount > index` — so a loop over the content array
 * that indexed into `sources` would read `undefined` labels for a map that is
 * entirely well-formed.
 *
 * @returns a refusal reason, or null to continue.
 */
function absorb(
  map: Record<string, unknown>,
  acc: Accumulator,
  limits: ParseLimits,
): MapParseReason | null {
  const sources = map["sources"];
  // A section whose map declares no sources contributes nothing and is not an
  // error: the aggregate is what matters, and one empty section does not make a
  // bundle unreadable.
  if (!Array.isArray(sources)) return null;

  acc.declared += sources.length;
  // IN ROWS, WHICH IS THE UNIT THE BOUND IS DERIVED IN (07-REVIEW.md MD-01).
  // `SOURCE_ROWS_PER_MAP_MAX` is computed from the probe's source density as a
  // ROW figure — "471 sources and 942 rows" — and this comparison used to hand
  // it the declared SOURCE count instead. The two units differ by exactly
  // ROWS_PER_RECOVERED_SOURCE, so the reachable ceiling was twice the documented
  // one and `ROWS_INSERTED_PER_ITERATION_MAX` carried a `2 *` to compensate.
  //
  // The conversion is on the LEFT and the bound is bare on the RIGHT, because
  // the bound is declared in rows: halving the right-hand side would compute the
  // same answer while reading as a source-count bound wearing a row bound's
  // name, which is the confusion MD-01 is about.
  //
  // ON THE DECLARED COUNT, BEFORE ANY ENTRY IS VISITED. The
  // `million-tiny-sources` fixture is a legal map with a million one-character
  // labels; walking it to discover it is too big is the cost the bound exists to
  // avoid. Summed across sections so an index map cannot get under the bound by
  // splitting.
  if (acc.declared * ROWS_PER_RECOVERED_SOURCE > limits.maxSourceRows) {
    return "too_many_sources";
  }

  const contents = map["sourcesContent"];
  const hasContents = Array.isArray(contents);

  for (let i = 0; i < sources.length; i += 1) {
    const sourcesIndex = acc.next;
    acc.next += 1;
    const content: unknown = hasContents ? contents[i] : undefined;
    if (typeof content !== "string") {
      // `sourcesContent` absent, SHORT, or null at this index — three different
      // documents, one outcome per index, and NONE of them a failure.
      acc.skipped.push({ sourcesIndex, reason: "empty" });
      continue;
    }
    const label: unknown = sources[i];
    acc.recovered.push({
      sourcesIndex,
      // A null label is a NULL, never the string "null". Anything that is not a
      // string is recorded the same way: the content is still recoverable and the
      // label is simply not a name.
      sourcesVerbatim: typeof label === "string" ? label : null,
      content,
    });
  }
  return null;
}

/**
 * Reconstruct the original sources a map document carries.
 *
 * ZERO RECOVERED SOURCES IS A SUCCESS, NOT A FAILURE. `sourcesContent` is
 * OPTIONAL in ECMA-426, so a map that parses and yields nothing has done
 * everything it can, and the operator must be told that rather than shown an
 * error (Pitfall 3, UI-09). The refusal vocabulary and the empty result list are
 * therefore different outcomes and `parse.spec.ts` asserts they stay so.
 *
 * `sections` IS READ BEFORE `sources`. An index map has no top-level `sources`
 * at all, so reading `map.sources` first gets `undefined` and reports "no
 * sources" for a map that has hundreds (Pitfall 5).
 *
 * THE RECURSION BOUND IS 1, BY SPECIFICATION AND NOT BY BUDGET. ECMA-426 defines
 * a section's `map` as a complete source map and index maps DO NOT NEST; the
 * current spec has only an embedded `map` field with no `url` alternative, so
 * there is no fetch to refuse and no external reference to resolve. Exactly one
 * level is iterated and a nested `sections` is refused with its own reason — and
 * the fixture proves the parser ENFORCES that rather than trusting the input.
 *
 * `ignoreList` AND ITS LEGACY SPELLING `x_google_ignoreList` ARE IGNORED. Not
 * used, not validated, not failed on. Said out loud because "ignored" and
 * "unimplemented" look identical from outside, and the field is newer than most
 * of this corpus.
 */
export function parseSourceMap(
  json: string,
  limits: ParseLimits,
): MapParseResult {
  let parsed: unknown;
  try {
    // The catch is scoped to the smallest expression that can throw. A `RangeError`
    // here is a nesting depth chosen to exhaust the stack, and the host survives it.
    parsed = JSON.parse(stripXssiPrefix(json));
  } catch (error) {
    return { ok: false, reason: reasonForParseError(error) };
  }
  if (!isRecord(parsed)) return { ok: false, reason: "not_a_map" };

  const acc: Accumulator = { recovered: [], skipped: [], declared: 0, next: 0 };

  const sections = parsed["sections"];
  if (Array.isArray(sections)) {
    for (const section of sections) {
      if (!isRecord(section)) continue;
      const map = section["map"];
      // A section whose `map` is null, absent or not an object is SKIPPED.
      // `section.map.sources` would throw on a document that is otherwise
      // well-formed JSON, so the guard belongs on the member and not on the parse.
      if (!isRecord(map)) continue;
      // FAIL-CLOSED ON PRESENCE, not on shape. A `sections` member inside a
      // section's map is not something a legitimate emitter writes in any
      // spelling, and the bound is a specification fact rather than a budget.
      if (map["sections"] !== undefined) {
        return { ok: false, reason: "nested_sections" };
      }
      const refusal = absorb(map, acc, limits);
      if (refusal !== null) return { ok: false, reason: refusal };
    }
    // NOT SORTED. The spec says sections "shall be sorted by starting position
    // and the represented sections shall not overlap" — and a SHALL is what a
    // hostile map violates. The order is INPUT: document order is preserved, so
    // the outcome is defined rather than merely non-fatal.
    return {
      ok: true,
      recovered: acc.recovered,
      skipped: acc.skipped,
      declaredSources: acc.declared,
      sectioned: true,
    };
  }

  if (!Array.isArray(parsed["sources"])) {
    return { ok: false, reason: "not_a_map" };
  }
  const refusal = absorb(parsed, acc, limits);
  if (refusal !== null) return { ok: false, reason: refusal };

  return {
    ok: true,
    recovered: acc.recovered,
    skipped: acc.skipped,
    declaredSources: acc.declared,
    sectioned: false,
  };
}
