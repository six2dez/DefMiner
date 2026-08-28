// packages/backend/src/telemetry.ts — the in-memory counter surface, the max
// synchronous slice, and the projection `getStatus` returns. Nothing else.
//
// ===========================================================================
// THE NAMING RULE, AND IT IS LOAD-BEARING (decision P5-D1)
// ===========================================================================
// Every counter and every RPC field below is named for PROXIED RESPONSES
// OBSERVED. Not "responses on this target", not "total", not "all", not
// "complete". No identifier in this file — or any file that reads it — may
// contain a word asserting completeness, and {@link FORBIDDEN_COMPLETENESS_WORDS}
// is the list `telemetry.spec.ts` enforces that with.
//
// This is not style. DefMiner's coverage is STRUCTURALLY partial, measured twice
// in Phase 0:
//
//   SURFACES_FIRING_INTERCEPT = "proxy"  — Replay, Automate, workflows,
//     plugin-originated sends and `caido:http` fetch all reach the origin and
//     deliver NOTHING to the hook. Seven surfaces were driven; one fired.
//   CACHED_RESPONSES_REACH_HOOK = false — a browser-cache hit never enters
//     Caido at all, which is why RETROACTIVE_SCAN_MANDATORY is true and Phase 6
//     has to exist.
//
// So a counter named for what the plugin has SEEN is honest, and a counter named
// for what is ON THE TARGET is a lie the operator has no way to detect. The
// naming decision is made here, in the file somebody would edit, because it gets
// expensive the moment a UI, an export and Phase 2's vocabulary all reference it.
//
// ===========================================================================
// CLOCK DISCIPLINE — TWO CLOCKS, NEVER MIXED
// ===========================================================================
// Elapsed figures come from the MONOTONIC clock (`performance.now()` where it
// exists). Correlation timestamps come from the WALL clock (`Date.now()`). A
// timestamp is NEVER computed from the monotonic clock's origin, because
// `performance.timeOrigin` is not a Unix epoch on this build.
//
// ===========================================================================
// WHAT THIS FILE DELIBERATELY DOES NOT DO
// ===========================================================================
// No health surface, no degradation vocabulary, no diagnostics export. Those are
// OBS-01, OBS-02 and OBS-03 and they belong to Phase 2. Phase 1's obligation is
// narrow and cheap: the counters must EXIST and be REACHABLE, so Phase 2 does
// not have to retrofit them through code that has already been reviewed. The
// seam is left open, not filled.

import { REJECT_REASONS, type RejectReason } from "./hooks/admit";

/**
 * Words that may never appear in a counter name, an RPC field name or a string
 * this module projects.
 *
 * Compared WORD BY WORD after splitting camelCase and snake_case, not as raw
 * substrings: a substring rule fails on the first innocent identifier that
 * happens to contain "all", and a rule that cries wolf gets deleted.
 */
export const FORBIDDEN_COMPLETENESS_WORDS = [
  "all",
  "any",
  "complete",
  "completeness",
  "comprehensive",
  "entire",
  "every",
  "everything",
  "exhaustive",
  "full",
  "total",
  "whole",
] as const;

/** Longest error text this module will ever carry. Truncation is not cosmetic:
 *  an untruncated `String(e)` can carry a response body fragment across the RPC
 *  boundary, which is the one thing the projection exists to prevent. */
export const ERROR_TEXT_LIMIT = 240;

/**
 * The reject counters, DERIVED from a list rather than hand-declared.
 *
 * A pure function over the list so `telemetry.spec.ts` can execute the
 * derivation against a SYNTHETIC reason set and watch a new reason acquire a
 * counter — which is the thing being claimed. A hand-maintained parallel object
 * would drift silently, and a counter keyed on a typo'd reason is invisible: it
 * just reads zero forever.
 */
export function zeroedRejectCounters(
  reasons: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of reasons) out[r] = 0;
  return out;
}

/** @internal */
export type Counters = {
  /** Proxied responses this hook was handed. */
  proxiedResponsesObserved: number;
  /** Admitted to the queue. */
  admitted: number;
  /** Rejected, by reason. Keyed on `admit.ts`'s closed union, so a counter for a
   *  reason that does not exist is a compile error rather than a silent zero. */
  rejected: Record<RejectReason, number>;
  /** Entries the queue dropped because it was at cap (CORE-03 visible overflow). */
  queueOverflow: number;
  /** Proxied responses observed while NO project was active, so nothing could be
   *  admitted. Not a reject reason: `admit.ts`'s union is closed and describes
   *  the RESPONSE, whereas this describes the plugin's own state (CORE-09). */
  noProjectSelected: number;
  /** Iterations abandoned part-way because a project change landed while the
   *  consumer was mid-`await` (CORE-09, T-01-25). */
  abandonedOnProjectChange: number;
  /** Throws caught inside the hook. Caido surfaces none of them itself. */
  hookErrors: number;
  /** Entries the consumer drained to completion. */
  processed: number;
  /** `sdk.requests.get(id)` returned a usable request+response. */
  reloadHit: number;
  /** `sdk.requests.get(id)` itself resolved `undefined`. */
  reloadMissing: number;
  /** `sdk.requests.get(id)` resolved a pair whose `response` was `undefined`.
   *  A SEPARATE counter from {@link reloadMissing} on purpose: the SDK types
   *  those as two different optionality points and conflating them hides which
   *  one is happening. */
  reloadNoResponse: number;
  /** Reloaded but the body was absent or zero-length. */
  reloadEmptyBody: number;
  /** Artifacts skipped because this digest was already analysed at the current
   *  DETECTOR_CORPUS_VERSION (CORE-08). */
  analysisCacheHit: number;
  /** Analyses this consumer claimed and walked. */
  analysisStarted: number;
  /**
   * Sightings of a digest whose `analyses` row is claimed but NOT terminal — a
   * claim nobody finished, or one retention removed between the insert and the
   * read.
   *
   * Its own counter rather than a cache hit, which is what it used to be
   * counted as. A walk cancelled by a project change or killed with the runtime
   * leaves `scan_state = 'pending'`, and `pending` is not terminal, so the
   * artifact is never re-analysed at this corpus version — not on the next
   * sighting, not after a restart, until the row ages out at 90 days. Reporting
   * that as `analysisCacheHit` both corrupts the CORE-08 hit rate Phase 1 exists
   * to start measuring and makes the stuck state read as a success. ERR-02
   * (Phase 2) owns the reconciliation; this owns the visibility.
   */
  analysisStale: number;
  /** Walks that hit ARTIFACT_DEADLINE_MS and persisted a `partial` state. */
  analysisPartial: number;
  /** Retention sweep passes actually run from the consumer loop (STORE-06). */
  retentionSweeps: number;
  /** Rows those passes deleted. */
  retentionDeleted: number;
  /** Store writes that reported a failure. */
  storeErrors: number;
  /** Throws caught inside a consumer iteration. */
  consumerErrors: number;
  /** `body.length` from the hook disagreed with `toRaw().length` in the consumer.
   *  BODY_LENGTH_EQUALS_RAW_LENGTH measured them equal across 24 round trips, so
   *  a non-zero value here means that measurement no longer holds. */
  byteLenMismatch: number;
};

function createCounters(): Counters {
  return {
    proxiedResponsesObserved: 0,
    admitted: 0,
    rejected: zeroedRejectCounters(REJECT_REASONS),
    queueOverflow: 0,
    noProjectSelected: 0,
    abandonedOnProjectChange: 0,
    hookErrors: 0,
    processed: 0,
    reloadHit: 0,
    reloadMissing: 0,
    reloadNoResponse: 0,
    reloadEmptyBody: 0,
    analysisCacheHit: 0,
    analysisStarted: 0,
    analysisStale: 0,
    analysisPartial: 0,
    retentionSweeps: 0,
    retentionDeleted: 0,
    storeErrors: 0,
    consumerErrors: 0,
    byteLenMismatch: 0,
  };
}

/**
 * THE counter object. There is exactly one, and `telemetry.spec.ts` proves it
 * over the AST of every file in this package.
 *
 * Plans 01-01 and 01-03 kept a local object inside the consumer because this
 * file did not exist yet; plan 01-05 REPLACED it rather than shadowing it.
 * Leaving both would end the phase with one object that is written and never
 * read and another that is read and never written, with {@link slimStatus}
 * projecting the empty one — green everywhere, and zero on the RPC.
 */
export const counters: Counters = createCounters();

/** The running maximum synchronous slice, in float milliseconds (CORE-10). */
let maxSliceMs = 0;

/** The most recent error any part of the pipeline reported, class name first and
 *  truncated. Overwritten, not accumulated: durable failure recording is ERR-04
 *  in Phase 2, and a growing in-memory list here would be a worse version of it. */
let lastError: string | null = null;

/** Test seam. Module state is process-global, so a spec that did not reset it
 *  would inherit the previous case's counts. Mutates IN PLACE, because every
 *  importer holds a reference to this exact object. */
export function resetTelemetryForTest(): void {
  Object.assign(counters, createCounters());
  maxSliceMs = 0;
  lastError = null;
}

/**
 * Fold one measured span into the running maximum (CORE-10).
 *
 * Initialised to 0 and only ever RAISED — a later, shorter slice never lowers
 * it, because the question the number answers is "what is the worst this plugin
 * has done to the one thread", not "what did it do most recently".
 *
 * Stores the float EXACTLY as computed: no rounding, no truncation, no unit
 * conversion. `ms` is a delta between two reads of the monotonic clock; a value
 * that is not a number is ignored rather than poisoning the maximum with NaN
 * (`NaN > x` is false, so the comparison already does this — it is stated here
 * so nobody "fixes" it into a Math.max).
 */
export function recordSlice(ms: number): void {
  if (ms > maxSliceMs) maxSliceMs = ms;
}

/** What a redacted URL reads as in an error string. */
export const URL_REDACTION = "<url-redacted>";

/**
 * Strip anything URL-shaped out of a string bound for the RPC.
 *
 * NOT paranoia, and not hypothetical: `telemetry.spec.ts` found this by
 * throwing an `Error("failed loading https://victim.example/private/app.js?token=secret")`
 * at the projection and watching the whole thing come out the other side. Store
 * and reload failures interpolate the thing they were working on, and the thing
 * this pipeline works on IS a target URL — often with a session token in the
 * query. `slimStatus()` is the only channel by which internal state leaves the
 * plugin in Phase 1 (T-01-26), so the redaction belongs here rather than at each
 * of the call sites that might one day build a message.
 *
 * ONE quantifier before a literal `://` and one after, no nesting and no
 * alternation. That shape is stated for the reader — but it is NOT the evidence,
 * and this paragraph used to offer it as though it were. Reasoning about a
 * pattern's shape is precisely what `REDOS_RECOVERY = "kill"` makes
 * insufficient: an argued-linear pattern is the one nobody re-checks, and there
 * is no interrupt handler on this runtime, so SIGKILL is the only exit and it
 * takes `caido-cli` down with the operator's live project data.
 *
 * THE EVIDENCE IS A MEASUREMENT. `telemetry.spec.ts`'s case "renders a
 * 200,000-character adversarial near-miss input inside 250 ms" runs this pattern
 * over an input built from runs that repeatedly ALMOST satisfy `://`, under a
 * ceiling roughly three orders of magnitude above the observed time — loose
 * enough that only catastrophic backtracking trips it, never a busy machine.
 *
 * THIS IS THE ONE REGEX LITERAL THIS MODULE IS PERMITTED, and the permission is
 * enforced rather than described: `observations.spec.ts`'s `auditPatternUse`
 * runs over this file and allows exactly one literal, anchored INSIDE this
 * declaration. Moving it, renaming this function, or adding a second pattern
 * anywhere in this module fails that gate — which is the moment whoever did it
 * is required to add a linearity measurement for whatever they moved.
 */
function redactUrls(text: string): string {
  return text.replace(/[a-z][a-z0-9+.-]*:\/\/\S*/gi, URL_REDACTION);
}

/**
 * What the operator sees when a value refuses to be rendered at all.
 *
 * ONE literal, referenced by both {@link describeError} and {@link recordError}
 * (IN-17). It was previously written out inside `recordError` only, which was
 * fine while that was the only fallback; the moment `describeError` grew its own
 * the two could have drifted into two different words for one condition.
 */
const UNRENDERABLE_ERROR = "unrenderable error";

/** What a redacted absolute filesystem path reads as in an error string.
 *
 *  Shaped to rhyme with {@link URL_REDACTION} so the two redactions on this path
 *  read as ONE policy rather than two accidents, and distinct from it so a
 *  reader can tell WHICH rule fired. */
export const PATH_REDACTION = "<path-redacted>";

/** The characters this scan treats as whitespace. Written out rather than
 *  matched, because a character class is a pattern and this module is allowed
 *  exactly one (see {@link redactSensitiveTokens}). */
const WHITESPACE_CHARS = " \t\n\r\f\v";

/** Punctuation stripped from a token's ends before it is judged, and re-attached
 *  afterwards. Named rather than inlined so the set is reviewable: these are the
 *  characters a path arrives WRAPPED in, and SQLite's `SQLITE_CANTOPEN` message
 *  wraps its path in the first of them. */
const PATH_TRIM_PUNCTUATION = "'\"`()[],;:";

const POSIX_PATH_SEPARATOR = "/";
const WINDOWS_PATH_SEPARATOR = "\\";

function countCharacter(text: string, character: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === character) count += 1;
  }
  return count;
}

function isAsciiLetter(character: string | undefined): boolean {
  if (character === undefined) return false;
  const code = character.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isAbsolutePath(core: string): boolean {
  if (
    core.startsWith(POSIX_PATH_SEPARATOR) &&
    countCharacter(core, POSIX_PATH_SEPARATOR) >= 2
  ) {
    return true;
  }

  if (
    core.startsWith(WINDOWS_PATH_SEPARATOR + WINDOWS_PATH_SEPARATOR) &&
    countCharacter(core, WINDOWS_PATH_SEPARATOR) >= 3
  ) {
    return true;
  }

  if (
    core.length >= 3 &&
    isAsciiLetter(core[0]) &&
    core[1] === ":" &&
    (core[2] === POSIX_PATH_SEPARATOR || core[2] === WINDOWS_PATH_SEPARATOR)
  ) {
    return countCharacter(core, core[2]) >= 2;
  }

  return false;
}

function isSchemelessHostReference(core: string): boolean {
  let separator = core.length;
  for (let i = 0; i < core.length; i += 1) {
    if (
      core[i] === POSIX_PATH_SEPARATOR ||
      core[i] === "?" ||
      core[i] === "#"
    ) {
      separator = i;
      break;
    }
  }
  if (separator === core.length || separator === 0) return false;

  const authority = core.slice(0, separator);
  if (
    authority.includes("=") ||
    authority.includes("'") ||
    authority.includes('"')
  ) {
    return false;
  }

  const afterUserInfo = authority.slice(authority.lastIndexOf("@") + 1);
  if (afterUserInfo.startsWith("[")) {
    const close = afterUserInfo.indexOf("]");
    return close > 1;
  }

  const colon = afterUserInfo.lastIndexOf(":");
  const host = colon > 0 ? afterUserInfo.slice(0, colon) : afterUserInfo;
  if (host === "localhost") return true;
  const firstDot = host.indexOf(".");
  return firstDot > 0 && firstDot < host.length - 1;
}

function sensitiveMarker(core: string): string | null {
  if (isAbsolutePath(core)) return PATH_REDACTION;
  if (isSchemelessHostReference(core)) return URL_REDACTION;
  return null;
}

/**
 * Judge ONE token and redact it if it is an absolute path or a schemeless host
 * reference.
 *
 * Strip the wrapping punctuation, then recognise POSIX paths, Windows drive
 * paths, UNC paths and dotted host references followed by `/`, `?` or `#`.
 * Absolute paths need enough separators to distinguish them from a lone mount
 * point. Those conditions carry their weight:
 *
 *   requiring an absolute prefix is what keeps `2026/08/21` and
 *   `store/observations.ts` readable, while covering the server-side paths
 *   DEPLOY-02 actually cares about;
 *
 *   requiring multiple separators is what keeps a lone `/data`, `/tmp` or
 *   `C:\\data` readable. One segment is a location, not a user-bearing path.
 *
 * The stripped punctuation is RE-ATTACHED. A rule that ate the quotes would make
 * `unable to open database file: <path-redacted>` read as though the driver had
 * said something it did not.
 */
function redactSensitiveToken(token: string): string {
  let start = 0;
  let end = token.length;
  while (start < end && PATH_TRIM_PUNCTUATION.includes(token[start]))
    start += 1;
  while (end > start && PATH_TRIM_PUNCTUATION.includes(token[end - 1]))
    end -= 1;

  let sensitiveStart = start;
  let marker = sensitiveMarker(token.slice(sensitiveStart, end));

  if (marker === null) {
    const core = token.slice(start, end);
    const labelEnd = core.indexOf("=");
    if (labelEnd >= 0) {
      sensitiveStart = start + labelEnd + 1;
      while (
        sensitiveStart < end &&
        PATH_TRIM_PUNCTUATION.includes(token[sensitiveStart])
      ) {
        sensitiveStart += 1;
      }
      marker = sensitiveMarker(token.slice(sensitiveStart, end));
    }
  }

  return marker === null
    ? token
    : token.slice(0, sensitiveStart) + marker + token.slice(end);
}

/**
 * Strip sensitive filesystem paths and schemeless host references out of a
 * string bound for the RPC.
 *
 * WHY THIS EXISTS, and it is the half of WR-03's OWN RATIONALE that WR-03's fix
 * did not deliver. {@link redactUrls} requires a literal `://`, so a filesystem
 * path is not URL-shaped to it and passes through whole — including
 * `sdk.meta.path()`, which on every real deployment carries the OPERATOR'S OS
 * USERNAME:
 *
 *   /Users/<name>/Library/Application Support/io.caido.Caido/plugins/<uuid>/data.db
 *
 * DEPLOY-02 says the backend filesystem is SERVER-SIDE. Presenting it across the
 * `getStatus` RPC as if it were the operator's own machine is a disclosure, and
 * `telemetry.spec.ts` proves the closure at the RPC level rather than at this
 * function — driving the real `init()` with a `meta.db()` rejection and walking
 * every string of the object the registered RPC returns.
 *
 * A STRING SCAN, WITH NO NEW PATTERN, and that choice is forced rather than
 * stylistic. WR-12 suggested `(?:\/[A-Za-z0-9._-]+){2,}` — a quantifier nested
 * inside a quantifier, which contradicts this file's own no-nesting discipline
 * one function away, and which is exactly the kind of thing nobody re-derives at
 * 2am on a runtime where the recovery from getting it wrong is SIGKILL.
 * SPIKE-01 measured that a catastrophic pattern hangs the QuickJS thread with no
 * interrupt handler. `observations.spec.ts`'s `auditPatternUse` ENFORCES this on
 * this module: `telemetry.ts` may hold exactly ONE regex literal, the one inside
 * {@link redactUrls}, so a future rewrite of this function into WR-12's shape
 * fails a gate rather than depending on somebody re-reading this paragraph.
 *
 * COVERAGE AND LIMITS. The scan now closes the residual families found during
 * review: Windows drive/UNC paths, schemeless dotted-host references, quoted
 * paths containing spaces and labelled `path=`/`url=` values.
 * `telemetry.spec.ts` executes every shape.
 *
 * An unquoted path containing spaces still ends at the first whitespace. Its
 * leading user-bearing segment is redacted when it has enough separators, but
 * the non-sensitive tail remains diagnostic text. Conversely, a relative source
 * reference whose first segment itself looks like a dotted hostname is redacted:
 * the grammar is ambiguous without a scheme, and this RPC chooses target-data
 * safety over that narrow diagnostic case. Ordinary relative source paths,
 * dates and single-segment mount points remain readable and are pinned below.
 */
function redactSensitiveTokens(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    let j = i;
    if (WHITESPACE_CHARS.includes(text[i])) {
      // A whitespace run, copied through verbatim so the message's own shape —
      // including newlines in a stack-shaped string — is preserved exactly.
      while (j < text.length && WHITESPACE_CHARS.includes(text[j])) j += 1;
      out += text.slice(i, j);
    } else {
      while (j < text.length && !WHITESPACE_CHARS.includes(text[j])) {
        const quote = text[j];
        const previous = j === i ? undefined : text[j - 1];
        const isOpeningQuote =
          (quote === "'" || quote === '"') &&
          (j === i ||
            previous === "=" ||
            previous === ":" ||
            previous === "(" ||
            previous === "[" ||
            previous === "{" ||
            previous === ",");
        if (isOpeningQuote) {
          const closing = text.indexOf(quote, j + 1);
          if (closing !== -1) {
            j = closing + 1;
            break;
          }
        }
        j += 1;
      }
      out += redactSensitiveToken(text.slice(i, j));
    }
    i = j;
  }
  return out;
}

/**
 * Render an error with its CLASS NAME in front, and no target data behind it.
 *
 * `String(e)` alone loses the constructor name, and the class name is usually
 * the whole diagnosis — a `TypeError` and a `RangeError` from the same line mean
 * completely different things. Copied deliberately from
 * `tier1/parse/src/index.ts:101`, which is where that lesson was learned.
 *
 * Redact FIRST, truncate SECOND: truncating first would leave the front half of
 * a URL in the output, which is the half carrying the host — and the front half
 * of a PATH, which is the half carrying the operator's OS username.
 *
 * URLS FIRST, SENSITIVE TOKENS SECOND, and the order is load-bearing rather than
 * arbitrary. A `file:///Users/…` or an `https://host/a/b` must be consumed WHOLE
 * as a URL; with the token scan running first it would be shredded into a path
 * marker with the scheme still attached, which reads like a different failure
 * than the one that happened. `telemetry.spec.ts` asserts both orderings.
 *
 * IT CANNOT THROW, and that was made true on 2026-08-22 (IN-17) rather than
 * assumed. BOTH of its reads could raise: `String(e)` raises
 * `TypeError: Cannot convert object to primitive value` for a null-prototype
 * object and propagates whatever a hostile `toString` throws, and
 * `e.constructor?.name` runs a proxy trap. `recordError` below wraps its call and
 * falls back; the SIX store call sites do not, so a HANDLED store failure would
 * have become an UNHANDLED REJECTION out of `recordObservation` — the containment
 * inverted at exactly the point it is load-bearing. Each read is wrapped
 * separately, so a hostile `toString` still yields the class name and only the
 * body is lost.
 *
 * ONE FALLBACK STRING, {@link UNRENDERABLE_ERROR}, referenced from here and from
 * `recordError`. Two literals would drift, and the operator would eventually see
 * two different words for the same condition.
 */
export function describeError(e: unknown): string {
  let name = "";
  try {
    name =
      e !== null && e !== undefined && typeof e === "object"
        ? (e.constructor?.name ?? "")
        : "";
  } catch {
    name = "";
  }

  let body: string;
  try {
    body = String(e);
  } catch {
    // The value refuses to render. Say so, and keep whatever class name the read
    // above survived to produce.
    body = UNRENDERABLE_ERROR;
  }

  const text = name === "" || body.startsWith(name) ? body : name + ": " + body;
  return redactSensitiveTokens(redactUrls(text)).slice(0, ERROR_TEXT_LIMIT);
}

/** Record the most recent error. Never throws — it is the error path.
 *
 *  The `try` here is now a BELT-AND-BRACES second line rather than the only one:
 *  {@link describeError} cannot throw as of 2026-08-22 (IN-17). It is kept
 *  because "cannot throw" is a claim about code somebody will edit, which is the
 *  same reason `compat.ts` catches around a probe documented as total. */
export function recordError(e: unknown): void {
  try {
    lastError = describeError(e);
  } catch {
    lastError = UNRENDERABLE_ERROR;
  }
}

/**
 * What {@link slimStatus} returns. Numbers and one truncated string.
 *
 * @internal
 */
export type SlimStatus = {
  counters: Counters;
  /** The largest uninterrupted synchronous stretch observed, float ms. */
  maxSliceMs: number;
  lastError: string | null;
};

/**
 * The projection `getStatus` returns.
 *
 * STRIPS EVERYTHING THAT IS NOT A COUNT. No URL, no header value, no body
 * content of any kind, and the one string it does carry is truncated. This is
 * the ONLY channel by which internal state leaves the plugin in Phase 1
 * (T-01-26), and `telemetry.spec.ts` walks the returned object recursively
 * rather than trusting a reading of this function.
 *
 * Spread rather than hand-listed, deliberately: a hand-listed projection silently
 * stops carrying a counter somebody adds later, and a counter nobody can see is
 * the same as no counter.
 */
export function slimStatus(): SlimStatus {
  return {
    counters: { ...counters, rejected: { ...counters.rejected } },
    maxSliceMs,
    lastError,
  };
}
