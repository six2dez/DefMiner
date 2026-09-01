// packages/engine/src/sourcemap/announce.ts — D-02's discovery half (MAP-01).
//
// ---------------------------------------------------------------------------
// ONE THING THIS FILE MAY NEVER DO: USE A PATTERN.
// ---------------------------------------------------------------------------
// REDOS_INTERRUPTIBLE is false and REDOS_RECOVERY is `kill`. SPIKE-01 measured
// that a catastrophic pattern hangs the QuickJS thread with NO interrupt, that
// `togglePlugin(enabled:false)` never returns and that `installPluginPackage`
// fails rather than recovering — SIGKILL was the only teardown that worked, and
// it takes `caido-cli` down with the operator's real project data. The input
// here is a multi-megabyte response body a target chose. So the scan below is
// `lastIndexOf`, `startsWith`, `indexOf` and `slice`, and nothing else.
//
// ECMA-426 states the announcement as the pattern `^[@#]\s*sourceMappingURL=
// (\S*?)\s*$`, and that spelling is DELIBERATELY NOT IMPLEMENTED. Two fixed
// marker strings cover every announcement the corpus contains (babel, monaco and
// tfjs all emit `//# sourceMappingURL=`), and the residual — an announcement
// with unusual whitespace between the marker and the URL — is a missed map,
// which is a counter that reads low. A pattern is a hung proxy. The two failures
// are not comparable and this file picks the first one on purpose.
//
// `announce.spec.ts` does not take that on trust: it parses THIS FILE with the
// TypeScript compiler and asserts zero regular-expression literals and zero
// `new RegExp` constructions, with a non-vacuity assertion on the node count.
//
// ---------------------------------------------------------------------------
// SDK-FREE, AND THAT IS WHAT MAKES THE HOSTILE CORPUS AFFORDABLE (DET-03)
// ---------------------------------------------------------------------------
// This module is pure: a string in, an offset and a string out. No Caido
// surface, no filesystem, no network. That is why every boundary case runs under
// plain vitest on Node, in CI, on every commit, with no Caido present.

/**
 * The two announcement spellings, current first and legacy second.
 *
 * `//@ sourceMappingURL=` is legal and consumers accept it — ECMA-426's pattern
 * is `[@#]`. None of the three corpus bundles uses it, which is exactly why it
 * is here: a scan for `//#` alone would pass every fixture in this repo and miss
 * the spelling a hand-written or older bundle carries.
 *
 * FROZEN, and both members are the same length. {@link findAnnouncement} takes
 * the URL from `at + MARKERS[0].length`, so a third spelling of a different
 * length would read from the wrong offset — silently, and only for the new
 * spelling. `announce.spec.ts` asserts the equal-length property so that edit
 * cannot land quietly.
 */
export const MARKERS: readonly string[] = Object.freeze([
  "//# sourceMappingURL=",
  "//@ sourceMappingURL=",
]);

/**
 * The 16-byte substring both markers share, and its offset inside either one.
 *
 * THE A2 PREFILTER, AND IT IS AN EVIDENCED OPTIMISATION RATHER THAN A
 * PRECAUTION. RESEARCH assumption A2 guessed the tail-window scan was cheap and
 * named this mitigation in advance in case it was not. The D-10 probe settled
 * it: `announce_scan` came out the MOST EXPENSIVE of the five measured
 * operations at 3.80 ms/MB — above `json_parse`'s 2.91 — and 43% of the whole
 * inline path
 * [.planning/phases/07-sourcemap-reconstruction/results/map-bytes.json,
 * `derivation.op_ms_per_mb`]. The probe's scan ran TWO full `lastIndexOf` calls
 * over the body, and on every one of its four fixtures the legacy marker was
 * absent — so one of the two scans always read the entire body to return -1.
 * That failing scan is the cost.
 *
 * The prefilter buys two things and neither is speculative:
 *
 *   NO ANNOUNCEMENT AT ALL — one scan instead of two, and the function returns
 *   before either marker search runs.
 *
 *   AN ANNOUNCEMENT AT THE LAST OCCURRENCE, which is every real bundle — the
 *   prefilter's own backwards scan stops within a few dozen bytes of EOF, two
 *   `startsWith` calls settle which spelling it is, and NEITHER full marker
 *   search runs. This is the case the ladder measured.
 *
 * The two full searches remain, as the FALLBACK, for the one shape the fast path
 * cannot settle: a body whose last `sourceMappingURL` occurrence is not preceded
 * by a marker — a string literal, a variable name, a comment — while an EARLIER
 * occurrence is a real announcement. `announce.spec.ts` names that fixture and
 * asserts the whole function against a naive two-full-scan reference over every
 * case, so the fast path is proven EQUIVALENT rather than assumed to be.
 */
const COMMON = "sourceMappingURL";
const COMMON_OFFSET = 4;

/** Where an announcement is, and what it announces. */
export type Announcement = {
  /** The offset of the MARKER, not of the URL. */
  readonly at: number;
  /** The URL as delivered, trimmed. Never decoded, never resolved, never fetched. */
  readonly url: string;
};

/** Does either marker begin at `index`? */
function markerAt(body: string, index: number): boolean {
  if (index < 0) return false;
  for (const marker of MARKERS) {
    if (body.startsWith(marker, index)) return true;
  }
  return false;
}

/**
 * The LAST announcement at or after the window start, or null.
 *
 * THE LAST ONE WINS, which is the rule bundlers rely on: a body carrying several
 * announcements is announcing the last of them, and an announcement that is not
 * the last one is not the announcement. It is also the reason a corpus fixture
 * built by CONCATENATION is not valid JavaScript — monaco ends with an
 * announcement and NO trailing newline, so the next file's opening token is
 * swallowed into that line comment. This function is robust to that shape rather
 * than surprised by it: the URL runs to end-of-line, so a swallowed file makes
 * the URL match no `data:` prefix and the map is reported external and decoded
 * not at all.
 *
 * THE WINDOW IS APPLIED AS AN OFFSET TEST, NOT AS A SLICE. `lastIndexOf` has no
 * "stop at" parameter, so a genuinely windowed backwards search would have to
 * materialise the tail — a multi-megabyte copy of target-controlled bytes, on
 * the proxy thread, for a search that is already backwards. Searching the whole
 * body and then testing `at >= windowStart` is EXACTLY equivalent: every marker
 * occurrence the sliced search could find is at or after the window start, and
 * the last occurrence in the whole body is the last occurrence in the window
 * whenever one is there at all.
 *
 * @param windowBytes how far back from EOF an announcement is still an
 *   announcement — `SOURCEMAP_TAIL_WINDOW_BYTES` in production, which
 *   `thresholds.ts` DERIVES from `MAP_MAX_BYTES` rather than choosing. A
 *   sensible-looking small window finds every EXTERNAL announcement and no
 *   INLINE one, and inline is the only kind D-01 consumes.
 */
export function findAnnouncement(
  body: string,
  windowBytes: number,
): Announcement | null {
  if (body.length === 0) return null;
  const windowStart = body.length > windowBytes ? body.length - windowBytes : 0;

  // The prefilter. One backwards scan for the substring both markers share.
  const common = body.lastIndexOf(COMMON);
  if (common < 0) return null;
  const candidate = common - COMMON_OFFSET;
  // Every marker occurrence starts COMMON_OFFSET before an occurrence of COMMON,
  // and this is the LAST occurrence — so if it is already out of the window, so
  // is every marker.
  if (candidate < windowStart) return null;

  let at: number;
  if (markerAt(body, candidate)) {
    at = candidate;
  } else {
    // The fallback: one `lastIndexOf` per marker, and the LATER offset wins.
    // The two offsets can never be EQUAL — the marker strings differ at index 2 —
    // so there is no tie to break and no tie-break branch to get wrong.
    at = -1;
    for (const marker of MARKERS) {
      const found = body.lastIndexOf(marker);
      if (found > at) at = found;
    }
    if (at < windowStart) return null;
  }

  const urlStart = at + MARKERS[0].length;
  const newline = body.indexOf("\n", urlStart);
  const raw =
    newline < 0 ? body.slice(urlStart) : body.slice(urlStart, newline);
  // Trimmed, so a `\r\n` line ending does not put a carriage return inside the
  // URL. An announcement whose URL is the EMPTY STRING is still an announcement:
  // this function reports what it found, and the caller decides it is unusable.
  return { at, url: raw.trim() };
}
