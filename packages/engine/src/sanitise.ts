// packages/engine/src/sanitise.ts — target-controlled bytes, made safe to show.
//
// ===========================================================================
// STRIP FIRST. TRUNCATE SECOND. NEVER THE OTHER WAY. (UISEC-03, R2)
// ===========================================================================
// 05-UI-SPEC.md § "Rendering Safety Contract" R2 lists four steps in an order,
// and the order is the rule. Truncating first can leave a HALF-STRIPPED sequence
// sitting on the boundary: cut a string at 256 UTF-16 code units and the 256th
// may be the first half of a surrogate pair, or a base character whose combining
// mark fell on the other side of the cut, or the opening half of a bidi
// override whose terminator is gone. Stripping afterwards then operates on a
// string that no longer contains what it was looking for.
//
// It also changes what the operator is TOLD. `total` is measured after the
// strip, so a value made entirely of control characters reports `total === 0` —
// "there is nothing here" — instead of "showing 256 of 4,000" for a value that
// renders as empty. `sanitise.spec.ts` asserts exactly that case, because it is
// the one assertion that fails under truncate-first and passes under
// strip-first.
//
// WHY BIDI IS A SECURITY CONTROL AND NOT A TIDINESS RULE. U+202E
// (RIGHT-TO-LEFT OVERRIDE) makes `evil.com` render as `moc.live`. The column an
// operator triages on is the hostname column; a hostile bundle that can choose
// its own strings can choose that one. Threat T-05-11.
//
// ===========================================================================
// Intl.Segmenter IS A BROWSER API AND IS ABSENT FROM CAIDO'S QuickJS
// ===========================================================================
// MEASURED, not assumed, and recorded here with its provenance the way
// `decode.ts` records TEXTDECODER_MODULE. Phase 0's capability probe enumerated
// the runtime's global set at 100 entries and there is NO `Intl` among them
// (`.../results/runs/20260820T121824Z-31596/raw/capabilities.json`;
// 05-RESEARCH.md carries it forward as assumption A6, and its "Architectural
// Responsibility Map" assigns grapheme segmentation to the frontend for this
// reason alone).
//
// So this module resolves the segmenter FROM THE GLOBAL OBJECT AT CALL TIME and
// falls back to code-point iteration when it is not there. In the frontend that
// is grapheme segmentation; in the backend it is code points. Code-point
// iteration is still surrogate-safe — `for (const c of s)` never yields half a
// pair — so the worst the backend can do is split a combining sequence, which
// is a rendering blemish and not a broken code unit. That difference is a
// CAPABILITY difference and deliberately not an API one: nothing on the
// returned object says which path ran, because a caller that could tell would
// start branching on it.
//
// The absence is an ABSENCE ARGUMENT, and it is stated as one. If it is ever
// wrong — if some future Caido build ships Intl — the backend silently gets
// grapheme segmentation too. That is a widening, not a break.
//
// ===========================================================================
// TWO CAPS, NO DEFAULT
// ===========================================================================
// R2 sets 256 for a table cell and 2,048 for the evidence panel. Both are
// exported by name and NEITHER is a default parameter, so a caller has to say
// which surface it is truncating for. A default is precisely how a 2,048-char
// panel cap ends up inside a fixed 32px table row by omission, and the omission
// is invisible at the call site.
//
// ===========================================================================
// THE ONE FULL WALK, AND WHY IT IS NOT THE SHAPE DET-07 BANS
// ===========================================================================
// `capped()` walks the whole stripped string once, because `total` is part of
// R2's contract — "showing 256 of 4,194,304" cannot be said without counting to
// 4,194,304 — while the array it builds stops growing at the cap, so a 4 MiB
// value is never rebuilt in memory. Measured: ~170 ms for 4 MiB through
// `Intl.Segmenter`, and `sanitise.spec.ts` holds it under a named ceiling so a
// rewrite that loses the early stop fails rather than merely runs slowly.
//
// DET-07 bans PER-CHARACTER INDEX READS (`charCodeAt`, `codePointAt`,
// `.charAt(`, `fromCharCode`) in engine source, and `digest.spec.ts` enforces
// that by scanning this file. There are none here: the strip is a native regex
// pass, the escape lookup is a prebuilt table keyed by the character itself, and
// the walk is an iterator. What DET-07's measurement was about — a hand-rolled
// hash loop reading code units one at a time — is not what this does.
//
// ===========================================================================
// WHAT COMES BACK, AND WHAT DELIBERATELY DOES NOT
// ===========================================================================
// `{ text, shown, total }` and nothing else. The untruncated remainder is not a
// property, not a symbol, not a closure the caller can reach. R2 says the full
// value is never placed in the DOM, never in a `title` attribute and never in a
// `data-*` attribute; the cheapest way to keep that true is for the object the
// sink receives to not contain it at all. Threat T-05-13, asserted over
// `getOwnPropertyNames` and `getOwnPropertySymbols`.

/**
 * C0 and C1 control characters — R2 step 1.
 *
 * EXPORTED so the frontend's rendering gate and the backend's export serialiser
 * can assert they strip the SAME range rather than each declaring their own.
 * Two copies of a security rule drift; `csv.ts` imports this one.
 *
 * Carries the `g` flag for `replace`. Use it with `replace`, never with `test`
 * — a global regex's `test` is stateful through `lastIndex`.
 */
// THE CONTROL CHARACTERS ARE THE SUBJECT. `no-control-regex` exists to catch a
// control character that got into a pattern by accident; this pattern IS R2
// step 1 and cannot be written without them. The exemption sits on the
// declaration, where anyone editing the range will read it, rather than in a
// config file they will not.
// eslint-disable-next-line no-control-regex
export const C0_C1_CONTROLS = /[\u0000-\u001F\u007F-\u009F]/g;

/**
 * Unicode bidirectional overrides (U+202A-U+202E) and isolates
 * (U+2066-U+2069) — R2 step 2. Nine characters across the two ranges.
 *
 * Same export rationale, and the same `replace`-only caveat, as
 * {@link C0_C1_CONTROLS}.
 */
export const BIDI_OVERRIDES_ISOLATES = /[\u202A-\u202E\u2066-\u2069]/g;

/** R2's table-cell cap. Imported by name by the table (05-09) and its hostile
 *  render spec (05-05) — never restated as a literal at a call site. */
export const TABLE_CELL_MAX_GRAPHEMES = 256;

/** R2's evidence-panel cap. Imported by name by the evidence panel (05-10) for
 *  its `long-text / evidence-panel` backstop. */
export const EVIDENCE_PANEL_MAX_GRAPHEMES = 2048;

/**
 * What a rendering sink receives. Three fields, deliberately.
 *
 * `shown` and `total` are counted in the SAME unit as one another — graphemes
 * where a segmenter exists, code points where it does not — so `shown < total`
 * is a statement a caller can render ("showing 256 of 4,194,304") without
 * knowing which runtime it is on.
 */
type Displayed = {
  /** The safe, capped string. The only value that may reach a sink. */
  text: string;
  /** How many units `text` contains. */
  shown: number;
  /** How many units existed AFTER stripping. Never the raw input's length. */
  total: number;
};

/**
 * Every control character in both ranges, mapped to the escape the evidence
 * panel shows instead of it. Seven get the conventional two-character letter;
 * the other fifty-eight get `\xHH`, so nothing is ever raw and nothing is ever
 * silently dropped by this path.
 *
 * KEYED BY THE CHARACTER, NOT BY ITS CODE UNIT, AND BUILT ONCE. `digest.spec.ts`
 * enforces DET-07 across every non-spec module in this package by banning
 * `charCodeAt`, `codePointAt`, `.charAt(` and `fromCharCode` in engine source —
 * Phase 0 measured a per-character JS loop at 9 ms/MB EMPTY on a runtime with no
 * interrupt (SPIKE-01), so a per-character index read inside a hot path is a
 * banned shape here whatever it is computing. A lookup table built at module
 * load from sixty-five constants costs nothing per call and needs no index read
 * at all: the regex engine finds the character natively and this map answers in
 * one hop.
 */
const CONTROL_ESCAPES: ReadonlyMap<string, string> = buildControlEscapes();

function buildControlEscapes(): ReadonlyMap<string, string> {
  const conventional = new Map<number, string>([
    [0x00, "\\0"],
    [0x08, "\\b"],
    [0x09, "\\t"],
    [0x0a, "\\n"],
    [0x0b, "\\v"],
    [0x0c, "\\f"],
    [0x0d, "\\r"],
  ]);
  const table = new Map<string, string>();
  const add = (codePoint: number): void => {
    const hex = codePoint.toString(16).toUpperCase().padStart(2, "0");
    table.set(
      String.fromCodePoint(codePoint),
      conventional.get(codePoint) ?? `\\x${hex}`,
    );
  };
  // The SAME two ranges C0_C1_CONTROLS matches, so the table is total over that
  // pattern and the lookup in forEvidence can never miss.
  for (let codePoint = 0x00; codePoint <= 0x1f; codePoint++) add(codePoint);
  for (let codePoint = 0x7f; codePoint <= 0x9f; codePoint++) add(codePoint);
  return table;
}

/** The shape of `Intl.Segmenter` this module uses, declared structurally so no
 *  lib type is required and the fallback path stays honest. */
type GraphemeSegmenter = {
  segment(input: string): Iterable<{ segment: string }>;
};

type SegmenterConstructor = new (
  locales: undefined,
  options: { granularity: "grapheme" },
) => GraphemeSegmenter;

// Cached against the CONSTRUCTOR that produced it, not against a boolean.
// Constructing a segmenter per call is measurable at table-render rates, and
// keying the cache on the constructor is what lets a spec remove `Intl` from
// the global object and get the fallback path on the very next call.
let cachedConstructor: unknown;
let cachedSegmenter: GraphemeSegmenter | undefined;

function graphemeSegmenter(): GraphemeSegmenter | undefined {
  const intl = (globalThis as { Intl?: { Segmenter?: unknown } }).Intl;
  const constructor = intl?.Segmenter;
  if (typeof constructor !== "function") {
    cachedConstructor = undefined;
    cachedSegmenter = undefined;
    return undefined;
  }
  if (cachedConstructor !== constructor || cachedSegmenter === undefined) {
    cachedSegmenter = new (constructor as SegmenterConstructor)(undefined, {
      granularity: "grapheme",
    });
    cachedConstructor = constructor;
  }
  return cachedSegmenter;
}

function assertCap(maxGraphemes: number): void {
  if (!Number.isInteger(maxGraphemes) || maxGraphemes < 1) {
    throw new RangeError(
      `sanitise: the cap must be a positive integer, received ` +
        `${String(maxGraphemes)}. There is no default cap on purpose — pass ` +
        `TABLE_CELL_MAX_GRAPHEMES or EVIDENCE_PANEL_MAX_GRAPHEMES so the ` +
        `surface being truncated for is named at the call site (R2).`,
    );
  }
}

/**
 * Measure and truncate an ALREADY-STRIPPED string.
 *
 * ONE PASS. `total` needs the whole string walked, so the walk is not
 * short-circuited — but `kept` stops growing at the cap, which is what keeps a
 * 4 MiB value from being rebuilt in memory. The elapsed-time ceiling in
 * `sanitise.spec.ts` exists so a rewrite that loses this property fails rather
 * than merely runs slowly.
 */
function capped(stripped: string, cap: number): Displayed {
  const segmenter = graphemeSegmenter();
  const kept: string[] = [];
  let total = 0;

  if (segmenter === undefined) {
    // Code points. Surrogate-safe, not combining-safe. The backend path.
    for (const codePoint of stripped) {
      total++;
      if (total <= cap) kept.push(codePoint);
    }
  } else {
    for (const { segment } of segmenter.segment(stripped)) {
      total++;
      if (total <= cap) kept.push(segment);
    }
  }

  return { text: kept.join(""), shown: Math.min(total, cap), total };
}

/**
 * R2 in full, for every surface EXCEPT the evidence panel: strip C0/C1, strip
 * bidi, measure, then truncate grapheme-safe at `maxGraphemes`.
 *
 * @param raw target-controlled and assumed hostile.
 * @param maxGraphemes {@link TABLE_CELL_MAX_GRAPHEMES} or
 *   {@link EVIDENCE_PANEL_MAX_GRAPHEMES}. No default — see the header.
 */
export function forDisplay(raw: string, maxGraphemes: number): Displayed {
  assertCap(maxGraphemes);
  const stripped = raw
    .replace(C0_C1_CONTROLS, "")
    .replace(BIDI_OVERRIDES_ISOLATES, "");
  return capped(stripped, maxGraphemes);
}

/**
 * R2 for the ONE surface that is deliberately showing whitespace.
 *
 * Identical to {@link forDisplay} except that C0/C1 characters are rendered as
 * VISIBLE ESCAPES rather than removed — R2 step 1's stated exception. Bidi is
 * still stripped: an isolate reorders a panel exactly as it reorders a cell.
 *
 * The escape expansion happens BEFORE the length is computed, so a value that
 * is nothing but newlines occupies two units per newline instead of silently
 * occupying zero of the cap and reporting itself as empty.
 */
export function forEvidence(raw: string, maxGraphemes: number): Displayed {
  assertCap(maxGraphemes);
  const escaped = raw
    // CONTROL_ESCAPES is total over C0_C1_CONTROLS, so the `??` arm is
    // unreachable. It is written as "" rather than as a throw because the fallen
    // -back behaviour must be the SAFE one — removing the character, exactly
    // what forDisplay does — and not a render path that throws on hostile input.
    .replace(
      C0_C1_CONTROLS,
      (character) => CONTROL_ESCAPES.get(character) ?? "",
    )
    .replace(BIDI_OVERRIDES_ISOLATES, "");
  return capped(escaped, maxGraphemes);
}
