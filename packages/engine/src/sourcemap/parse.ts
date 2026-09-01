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
  /** `SOURCE_ROWS_PER_MAP_MAX` in production. */
  readonly maxSourceRows: number;
};

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

/**
 * Reconstruct the original sources a map document carries.
 *
 * ZERO RECOVERED SOURCES IS A SUCCESS, NOT A FAILURE. `sourcesContent` is
 * OPTIONAL in ECMA-426, so a map that parses and yields nothing has done
 * everything it can and the operator must be told that rather than shown an
 * error (Pitfall 3, UI-09).
 */
export function parseSourceMap(
  json: string,
  limits: ParseLimits,
): MapParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "malformed_json" };
  }
  if (!isRecord(parsed)) return { ok: false, reason: "not_a_map" };

  const sources = parsed["sources"];
  if (!Array.isArray(sources)) return { ok: false, reason: "not_a_map" };
  if (sources.length > limits.maxSourceRows) {
    return { ok: false, reason: "too_many_sources" };
  }

  const contents = parsed["sourcesContent"];
  const hasContents = Array.isArray(contents);
  const recovered: RecoveredSource[] = [];
  const skipped: SkippedSource[] = [];

  for (let i = 0; i < sources.length; i += 1) {
    const content: unknown = hasContents ? contents[i] : undefined;
    if (typeof content !== "string") {
      skipped.push({ sourcesIndex: i, reason: "empty" });
      continue;
    }
    const label: unknown = sources[i];
    recovered.push({
      sourcesIndex: i,
      sourcesVerbatim: typeof label === "string" ? label : null,
      content,
    });
  }

  return {
    ok: true,
    recovered,
    skipped,
    declaredSources: sources.length,
    sectioned: false,
  };
}
