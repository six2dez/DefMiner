// packages/backend/src/store/observations.ts — the artifact -> request -> URL edge.
//
// This table is what makes "durably remembers what it saw" true. An artifact row
// on its own records that some bytes were seen but not WHERE, and identity is
// decoupled from URL because the URL lives on this edge — not because it was
// discarded (decisions P1-D1, P1-D6).

import type { Database } from "sqlite";

import { describeError } from "../telemetry";

// Caught exceptions render through `describeError`, never a bare stringification.
// The reasoning — a driver rejection carries the bound parameters, and one of them
// is the observation URL — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`.

import type { StoreWriteResult } from "./artifacts";

// ADDITIVE ONLY (plan 01-04). `recordObservation`'s signature and SQL are exactly
// as plan 01-01 shipped them and as plan 01-03's consumer calls them. Everything
// added below is a READ.

/** `content_type` is TARGET-CONTROLLED. Truncated to a bounded length so a
 *  hostile origin cannot push an unbounded string into the operator's database. */
const CONTENT_TYPE_MAX = 120;
/** So is the URL. Bounded for the same reason; 2048 is comfortably above any real
 *  bundle URL and below anything worth storing. */
const URL_MAX = 2048;

// Same discipline as the artifact upsert: one statement, positional `?` only,
// prepared inside the write, parameters SPREAD into run().
const RECORD_OBSERVATION_SQL = `
INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (project_id, sha256, request_id) DO UPDATE SET
  observed_at = excluded.observed_at
`;

/**
 * What a query VALUE reads as once it has crossed the persistence boundary.
 *
 * Named and shaped to rhyme with `telemetry.ts`'s exported `URL_REDACTION` so the
 * two redactions read as ONE policy rather than two accidents.
 *
 * Deliberately carries no length, no hash and no fingerprint of the original: a
 * length leaks a token's scheme, and an unsalted digest of a low-entropy value
 * (`?debug=true`, `?user=alice`) is a rainbow-table lookup. The keyed-fingerprint
 * option is SEC-04's HMAC and it belongs to Phase 4 — `01-RESEARCH.md`'s security
 * domain says in as many words that Phase 1 must not create a key it will then
 * have to migrate.
 *
 * Idempotence falls out for free: the value is replaced regardless of what it
 * was, so a second pass produces the same bytes.
 */
export const QUERY_VALUE_REDACTION = "<redacted>";

/**
 * The bound on the NAME HALF of a `name=value` segment. That is now its ONLY job,
 * and the justification changed on 2026-08-21 — so it is restated here rather than
 * left to be inferred from a number that outlived its reason.
 *
 * WHAT IT USED TO CLAIM. This constant was the answer to a bare (`=`-less)
 * segment: such a segment is syntactically a name, so a values-only rule kept it,
 * and this bound was what stopped a pasted token from surviving verbatim (T-01-31).
 *
 * WHY THAT WAS NOT AN ANSWER. Every common credential format is SHORTER than 64.
 * A GitHub PAT is 40 characters, an AWS access key id 20, a Stripe secret ~32, a
 * session id 26-32, a UUID 36, a compact JWT 43. Executed through
 * `normaliseObservedUrl`, all eight shapes came back byte-for-byte. A bound is not
 * a rule: picking the number is picking which credentials are acceptable to keep,
 * and no number both catches a 12-character token and leaves
 * `enableExperimentalFeature` readable.
 *
 * WHAT REPLACED IT: decision P10-D1 (operator, 2026-08-21, at a
 * `gate="blocking-human"` checkpoint) — a bare segment is a VALUE WITH NO NAME and
 * is redacted by construction. This is a POLICY change, not a bug fix: decision
 * P7-D2 was a faithful reading of the operator's UAT words ("keeping the path and
 * the parameter names"), and the words were re-opened. Enforced by
 * `observations.spec.ts`'s `BARE_CREDENTIAL_SHAPES` block, one executed case per
 * format.
 *
 * AMENDED 2026-08-22 (CR-07) — amended in place, because the sentence being
 * removed is worth being able to read. This block used to END the paragraph above
 * with:
 *
 *   "…so no length of bare segment survives and there is no 'shorter than the
 *    bound' left for a future credential format to hide in."
 *
 * THAT SENTENCE WAS FALSE AS EXECUTED, and it was false in the direction that
 * gets trusted: it tells the reader most likely to add a credential grammar not
 * to bother looking. What P10-D1's CONSTRUCTION actually tested was the presence
 * of an `=` BYTE — `indexOf("=") === -1` — and an `=` byte is not the same fact as
 * a `name=value` pair. Standard base64 pads with `=`, so the most common shape of
 * an opaque credential on the wire took the OTHER branch and was promoted into the
 * retained name half: `?dXNlcjpwYTU1dzByZA==` was written into this column as
 * `?dXNlcjpwYTU1dzByZA=<redacted>`, and one re-pad plus one `base64 -d` returns
 * `user:pa55w0rd`. This bound never caught it — standard base64 of a 32-byte
 * secret is 44 characters, comfortably inside 64.
 *
 * WHAT PROVED IT: the code review executed it through the shipped
 * `normaliseObservedUrl` on both delimiters, and the end-to-end case titled
 * "a PADDED credential does not reach the column on EITHER delimiter" was written
 * RED against a real SQLite row before the branch that closes it existed.
 *
 * WHAT THE CORRECTED CONSTRUCTION TESTS: whether the segment is a GENUINE PAIR,
 * which it is only when the value half is non-empty and not entirely `=` padding.
 * A segment that is not a genuine pair is redacted whole on both delimiters. What
 * is still kept, and kept BY POLICY rather than by oversight, is the NAME half of
 * a genuine pair — see {@link redactDelimitedSegment}.
 */
export const QUERY_NAME_MAX = 64;

/**
 * THE per-segment rule. ONE policy, and every delimiter that needs it calls
 * THIS — the query loop on `&` and the path loop on `;`.
 *
 * Factored out rather than duplicated, and that is the whole reason it exists:
 * "one policy, two delimiters" is a claim, and a shared implementation is what
 * makes it TRUE rather than asserted. Two copies of these six lines would drift
 * into two policies the first time one of them was amended, and the drift would
 * be invisible — both halves would still pass their own cases.
 *
 * With an `=`: the name half is kept, bounded by {@link QUERY_NAME_MAX}, and the
 * value is replaced. The FIRST `=` only, so an `=` inside a value cannot
 * fabricate a second parameter and expose half a value as a "name".
 *
 * With no `=`: decision P10-D1 (operator, 2026-08-21) — a VALUE WITH NO NAME,
 * redacted whole. An EMPTY segment pushes the empty string instead: there is
 * nothing there to redact and `<redacted>` would invent a parameter that was
 * never sent.
 *
 * CORRECTED 2026-08-22 (CR-07). This block used to state the `=`-less branch as
 * "with no `=` it is a VALUE WITH NO NAME" and leave the CONVERSE to be assumed —
 * that WITH an `=` it is a name and a value. The converse was assumed and it was
 * false, and one whole class of credential lives in the gap. So the predicate is
 * stated here in BOTH directions rather than in one:
 *
 *   A segment is a GENUINE PAIR when, and only when, its value half — everything
 *   after the FIRST `=` — is non-empty and is not entirely `=`. Only a genuine
 *   pair keeps its name half.
 *
 *   Everything else — no `=` at all, an empty value half, a value half of
 *   nothing but padding — was never a pair and is redacted WHOLE.
 *
 * THE RESIDUAL THIS DELIBERATELY LEAVES, named here because a reader of this
 * helper is the reader who needs it: the name half of a genuine pair is retained
 * up to {@link QUERY_NAME_MAX} WHATEVER IT CONTAINS, including a credential
 * pasted where a parameter name goes, and including the prefix of a token that
 * happens to carry an interior `=`. "Every VALUE is replaced" is NOT the sentence
 * "no authorization token reaches this column", and the difference is kept by
 * policy — parameter names are the analytic value the operator's UAT decision of
 * 2026-08-21 chose to keep. Listed as an OPEN grammar in `schema.spec.ts` and
 * pinned by the executed cases titled "RESIDUAL, PINNED: the retained NAME half
 * of a GENUINE pair is kept whatever it contains" and "RESIDUAL, PINNED: the
 * retained NAME half, second face", so the day somebody closes it they go RED and
 * it is closed deliberately.
 *
 * WITH AN `=` THAT WAS PADDING RATHER THAN A SEPARATOR (added 2026-08-22, CR-07):
 * redacted whole, exactly as the `=`-less branch does. A pair whose VALUE half is
 * empty, or whose value half is nothing but `=`, was never a pair. Standard
 * base64 pads with `=`, so the most common shape of an opaque credential on the
 * wire is exactly this shape — and before this branch existed
 * `?dXNlcjpwYTU1dzByZA==` was stored as `?dXNlcjpwYTU1dzByZA=<redacted>`, from
 * which one re-pad and one `base64 -d` returns `user:pa55w0rd`.
 *
 * THE ACCEPTED COST, stated here rather than left to be discovered. A parameter
 * with an EMPTY value — `?debug=` — now loses its NAME as well as its value, and
 * that is one analytic signal the operator's decision did not explicitly price.
 * It is the faithful reading of decision P10-D1 rather than an extension of it:
 * `?debug` with NO `=` at all is ALREADY redacted whole under that decision, and
 * treating `?debug=` differently would make the policy turn on a byte that
 * carries nothing. Pinned by the executed case titled "ACCEPTED COST (CR-07):
 * `?debug=` loses its NAME as well as its value".
 *
 * IDEMPOTENT IN ALL THREE BRANCHES — OF THIS HELPER, AND OF THIS HELPER ONLY.
 * `QUERY_VALUE_REDACTION` contains no `=`, so on a second pass it arrives here as
 * a bare segment and is replaced with the same bytes.
 *
 * SCOPED 2026-08-22 (WR-22) rather than deleted, because the reasoning above is
 * sound and worth keeping — what was wrong was the sentence's SCOPE, and a reader
 * needs to see which. It ended this docblock unqualified, and a reader took it for
 * the function the durable column is actually written through. It was TRUE here
 * and FALSE of {@link normaliseObservedUrl}, which TRUNCATES after redacting: a cut
 * landing just after a `=` handed the second pass a segment with an EMPTY value
 * half, which the padding branch immediately below redacts WHOLE — destroying the
 * retained name. Swept at 900 parameters before the repair, 25 of 40
 * parameter-name lengths were not fixed points, the first at n=4:
 *
 *   pass1  "…p111=<redacted>&pppp112="   len 2048
 *   pass2  "…p111=<redacted>&<redacte"   len 2048
 *
 * NOTHING LEAKED and no sentence here should be read as saying otherwise: the half
 * destroyed is a parameter NAME, which policy retains anyway, and
 * `recordObservation` applies the composition ONCE per row.
 *
 * THE COMPOSED FUNCTION'S FIXED POINT IS NOT CLAIMED HERE. It is asserted by the
 * sweep in `observations.spec.ts` titled "IDEMPOTENT AT THE `URL_MAX` CUT: swept
 * across parameter-name length, not hard-coded (WR-22)", which proves it across the
 * range it swept and no wider. The classes that sweep does not reach are DISCLOSED
 * in `schema.spec.ts`'s `observations.url` entry and pinned by executed cases —
 * never claimed away by a sentence in this module.
 */
function redactDelimitedSegment(segment: string): string {
  const eq = segment.indexOf("=");
  if (eq === -1) return segment === "" ? "" : QUERY_VALUE_REDACTION;

  // WAS THAT `=` A SEPARATOR OR WAS IT PADDING? The VALUE half answers it, and
  // nothing else can. Walk it: if it is EMPTY, or if every byte in it is `=`,
  // the segment was never a `name=value` pair — it is one opaque token that
  // happens to end in base64 padding, and the whole segment goes.
  //
  // A plain character loop, never a pattern: `REDOS_RECOVERY` is "kill" on this
  // runtime and the shipped bundle's entire import set is one specifier.
  let valueIsOnlyPadding = true;
  for (let i = eq + 1; i < segment.length; i += 1) {
    if (segment[i] !== "=") {
      valueIsOnlyPadding = false;
      break;
    }
  }
  if (valueIsOnlyPadding) return QUERY_VALUE_REDACTION;

  return (
    segment.slice(0, eq).slice(0, QUERY_NAME_MAX) + "=" + QUERY_VALUE_REDACTION
  );
}

/**
 * Redact the URL HEAD — everything before the first `?`. Two grammars: URL
 * userinfo, and `;`-delimited path parameters.
 *
 * WHY THIS EXISTS. `redactQueryValues` keys entirely off the first `?`, so
 * everything credential-bearing a URL can carry BEFORE it passed through
 * untouched. `01-REVIEW.md` WR-11 executed all three shapes against the shipped
 * function and all three came back byte-for-byte:
 *
 *   `https://user:pa55w0rd@cdn.test/app.js`            — HTTP Basic credentials
 *   `https://cdn.test/a.js;jsessionid=SECRETSESSION`   — RFC 3986 path parameter
 *   `https://cdn.test/download/eyJ…SECRET/app.js`      — a path-embedded token
 *
 * WHY IT IS A SEPARATE FUNCTION FROM {@link redactQueryValues} rather than one
 * redactor over the whole string. `observations.spec.ts` carries an assertion
 * that `redactQueryValues` leaves the scheme, host and path BYTE-IDENTICAL, and
 * that assertion is worth keeping true of the function it was written about. One
 * function rewriting both halves would make it untestable. They are composed in
 * {@link normaliseObservedUrl} instead.
 *
 * USERINFO IS RESOLVED INSIDE THE AUTHORITY COMPONENT, never by searching the
 * whole string for an `@`. The authority begins after the first `://` and ends
 * at the first `/`, `?` or `#` after it; with no `://` there is no authority and
 * the userinfo step does nothing at all. An `@`-anywhere rule is the obvious
 * wrong implementation and it would silently corrupt `https://cdn.test/@vite/client.js`
 * — which is what a Vite dev server serves — and every scoped npm package path.
 *
 * BOTH HALVES OF THE USERINFO GO, never just the password. A username is the
 * same class of disclosure as the OS username `telemetry.ts`'s `redactPaths`
 * strips out of the error path one module away. The `@` is KEPT: it records that
 * the URL carried userinfo without carrying it — strictly more signal than
 * WR-11's own recommendation, which was to drop userinfo entirely — and it is
 * what makes the step idempotent, since a second pass finds `<redacted>` as the
 * userinfo and replaces it with itself.
 *
 * THE PATH-EMBEDDED TOKEN IS A RESIDUAL AND IT IS NOT CLOSED HERE. The reason is
 * specific, and "out of scope" is not it: telling a signed-URL segment from a
 * legitimate path segment needs either ENTROPY SCORING — for which Phase 1 has
 * no measured false-positive rate, and which would silently destroy the analytic
 * core of this column by shredding ordinary hashed asset names — or a PATTERN,
 * which `REDOS_RECOVERY = "kill"` forbids in this module. It is pinned by an
 * executed case, `observations.spec.ts`'s "RESIDUAL, PINNED: a token embedded in
 * a path SEGMENT is NOT redacted", which goes RED the day somebody closes it.
 *
 * STRING SPLITTING ONLY, for the reasons stated at length on
 * {@link redactQueryValues}: no pattern, no `RegExp`, no `URL` constructor, no
 * new import. Percent-encoded bytes stay opaque in the head exactly as they do
 * in the query (T-01-32).
 */
export function redactUrlHead(head: string): string {
  const s = String(head);

  // Bound the work to the head even when handed a whole URL. The query belongs
  // to `redactQueryValues` and is passed through untouched — double-processing
  // it is exactly what would turn `?a=1;token=SECRET`, which is ALREADY correct,
  // into two fabricated parameters.
  const q = s.indexOf("?");
  if (q !== -1) return redactUrlHead(s.slice(0, q)) + s.slice(q);

  // --- the authority component ------------------------------------------
  const schemeSep = s.indexOf("://");
  let authority = "";
  let pathStart = 0;
  let prefix = "";
  if (schemeSep !== -1) {
    const authStart = schemeSep + 3;
    let end = s.length;
    for (const d of ["/", "?", "#"]) {
      const i = s.indexOf(d, authStart);
      if (i !== -1 && i < end) end = i;
    }
    prefix = s.slice(0, authStart);
    authority = s.slice(authStart, end);
    pathStart = end;
  }

  // The LAST `@` inside the authority, so an `@` in the userinfo itself cannot
  // leave a tail of credential behind.
  const at = authority.lastIndexOf("@");
  if (at !== -1) {
    authority = QUERY_VALUE_REDACTION + authority.slice(at);
  }

  // --- `;` path parameters, by the SAME rule as a query parameter --------
  // Split the path on `/`; within each segment split on `;`. The first piece is
  // the segment itself and is kept verbatim; every subsequent piece is a
  // parameter and goes through `redactDelimitedSegment` — the same helper the
  // query loop calls, which is what makes `;` a second DELIMITER rather than a
  // second POLICY.
  const path = s.slice(pathStart);
  const segments = path.split("/");
  for (let i = 0; i < segments.length; i += 1) {
    const parts = segments[i].split(";");
    if (parts.length === 1) continue;
    for (let j = 1; j < parts.length; j += 1) {
      parts[j] = redactDelimitedSegment(parts[j]);
    }
    segments[i] = parts.join(";");
  }

  return prefix + authority + segments.join("/");
}

/**
 * Replace every query-string VALUE; keep every NAME of a `name=value` pair, in
 * order. A segment with NO `=` is a value with no name and is replaced too.
 *
 * The operator's UAT decision of 2026-08-21 (WR-07), as amended by decision
 * P10-D1 the same day. Parameter names carry analytic value — an endpoint that
 * takes an `access_token` parameter is worth being able to see — and values are
 * credentials.
 *
 * THE BARE-SEGMENT HALF, because it is the half that was wrong first. A segment
 * with no `=` used to be treated as a name and kept up to `QUERY_NAME_MAX`. Every
 * common credential format is shorter than that bound and survived verbatim into
 * a column `db.ts` documents as never garbage-collected, surviving project
 * deletion and force-reinstall. P10-D1 replaced the bound with a rule. The cost
 * was accepted with its name on it: `?debug`, `?nocache` and `?prod` are genuine
 * feature-flag signal on a bundle URL and they now read `<redacted>`.
 *
 * STRING SPLITTING ONLY — no pattern execution of any kind, and this is not
 * stylistic. `REDOS_RECOVERY` is "kill" on this runtime: SPIKE-01 measured that a
 * catastrophic pattern hangs the QuickJS thread with no interrupt handler and
 * that SIGKILL is the only exit, taking `caido-cli` down with the operator's real
 * project data. `admit.ts` holds the hooks to indexOf/endsWith for exactly this
 * reason and the store has no licence the hooks do not.
 *
 * The `URL` constructor is not used either, from `node:url` or from `globalThis`:
 * the shipped bundle's entire import set is ONE specifier (`crypto`) and
 * `check-bundle-imports.mjs` asserts it, and a global `URL` in Caido's QuickJS
 * has never been measured on this build.
 *
 * Percent-encoded input is neither decoded nor re-encoded. Decoding would let an
 * encoded `&` inside a value split into a fake parameter, whose "name" half would
 * be a surviving slice of a real value (T-01-32). The bytes stay opaque.
 */
export function redactQueryValues(url: string): string {
  const s = String(url);
  const q = s.indexOf("?");
  if (q === -1) return s;

  const head = s.slice(0, q);
  const out: string[] = [];
  // Empty segments are PRESERVED as empty segments: `a=1&&b=2` came in with three
  // and leaves with three. The function does not normalise the query's shape.
  for (const segment of s.slice(q + 1).split("&")) {
    // THE SHARED HELPER, not a local copy of it. `;` path parameters in
    // {@link redactUrlHead} call the same function, so the two delimiters cannot
    // drift into two policies — including the `=`-less branch, which is decision
    // P10-D1 (operator, 2026-08-21) and whose reasoning lives on the helper.
    out.push(redactDelimitedSegment(segment));
  }
  return head + "?" + out.join("&");
}

/**
 * Strip the fragment, redact the HEAD, redact the query VALUES, then bound the
 * length — in that order.
 *
 * THE HEAD STEP (plan 01-11): {@link redactUrlHead} covers the two grammars a
 * URL can carry before the first `?` — userinfo, and `;`-delimited path
 * parameters. Both were reaching this column verbatim while the query half was
 * being redacted, which made the guarantee narrower than the sentence describing
 * it. The two functions are kept separate so each keeps its own assertions; see
 * {@link redactUrlHead} for why.
 *
 * WHAT CHANGED AND WHY, because the comment this replaced said the opposite. It
 * read "Strip the fragment; KEEP the query", on the reasoning that a cache-busting
 * parameter is what makes a re-served bundle a MISS and dropping it would inflate
 * the hit rate. Half of that survives and half of it was wrong. The parameter
 * NAMES and their order are kept, and they are enough to see that a URL is
 * cache-busted; what actually decides a hit or a miss is the content DIGEST, not
 * the URL. The VALUES are credentials and they are gone.
 *
 * The asymmetry that forced this, named so the next reader finds the reason and
 * not just the rule: `telemetry.ts` already redacts a URL out of a 240-character
 * error string before it crosses the RPC, while this function was writing the same
 * value verbatim into a database `db.ts` documents as never garbage-collected,
 * surviving project deletion and surviving force-reinstall. The DURABLE store must
 * not be looser than the TRANSIENT channel. Operator decision, UAT 2026-08-21,
 * gap WR-07; enforced by `observations.spec.ts` and, end to end against the
 * database file, by `scripts/phase1/tracer-e2e.sh`.
 *
 * REDACT FIRST, TRUNCATE SECOND — decision P5-D8, restated here. `telemetry.ts`
 * learned by measurement that truncating first leaves the front half of the
 * string. Here the ordering also decides whether parameter names past the bound
 * survive at all, and it is what keeps the guarantee intact the moment any future
 * redactor preserves a prefix or a length of a value.
 *
 * TRUNCATE ON A SEGMENT BOUNDARY (amended 2026-08-22, WR-22). The truncation used
 * to be one `slice(0, URL_MAX)` and that cost this function its FIXED POINT. Both
 * halves of the reason are executed, not argued:
 *
 *   a cut landing just after a `=` leaves a segment whose value half is EMPTY,
 *   and {@link redactDelimitedSegment}'s CR-07 branch redacts such a segment
 *   WHOLE — so the retained name is destroyed on a second pass and the string
 *   SHRINKS;
 *
 *   a cut landing inside a parameter NAME leaves a segment with no `=` at all,
 *   which decision P10-D1 redacts whole for the same reason.
 *
 * Swept before the change over parameter-name lengths 1..40 at 900 parameters:
 * 25 of the 40 lengths were not fixed points, the first at n=4 —
 * `…p111=<redacted>&pppp112=` on the first pass, `…p111=<redacted>&<redacte` on
 * the second. It is a WARNING and not a leak: nothing new is disclosed, the half
 * destroyed is a parameter NAME, and `recordObservation` applies this function
 * ONCE per row. What was wrong was the CLAIM, not the bytes.
 *
 * THE RULE. Cut to `URL_MAX`; if that cut severed a query segment, drop back to
 * the last `&` so the result ends on a WHOLE segment rather than inside one. At
 * most ONE trailing segment is lost beyond the byte cut, and a cut that already
 * landed exactly on a segment boundary loses nothing.
 *
 * THE NO-SEPARATOR BRANCH, decided rather than left to fall out. When the cut
 * lands in the HEAD (no `?` inside it) or inside a query with no `&` inside it,
 * there is no boundary to drop back to. The byte cut STANDS, unchanged from the
 * old rule. The alternative — dropping back to the last `/` or to the `?` — would
 * truncate an oversized path back to its authority and discard far more than one
 * trailing segment's worth of output, which is a different decision from the one
 * this change is: retain strictly LESS, bounded at one segment. So this branch
 * retains exactly what it retained before.
 *
 * WHAT THIS BRANCH LEAVES OPEN, stated against the CONDITION rather than against
 * the fixture that found it (WR-28, WR-29). The condition is `q === -1 || amp <= q`:
 * there is no `&` INSIDE THE CUT. That is a statement about WHERE THE CUT LANDS —
 * before the query's first `&` — and NOT about how many parameters the query has.
 * A three-parameter query with one long first parameter is in this class exactly as
 * a one-parameter query is; the earlier disclosure scoped it to a query of one
 * segment only, and that scoping was too narrow.
 *
 * Inside the class there are two shapes and only one of them is a fixed point:
 *
 *   a cut landing inside a `;` parameter's `<redacted>` MARKER is stable — the
 *   second pass re-expands the marker and re-truncates to the same byte;
 *
 *   a cut landing inside a parameter NAME is NOT stable — the second pass sees a
 *   segment with no `=`, decision P10-D1 redacts it WHOLE, and the stored value can
 *   SHRINK by a byte.
 *
 * Both shapes are DISCLOSED in `schema.spec.ts`'s `observations.url` entry and
 * pinned by SWEEPS — not by chosen offsets — in `observations.spec.ts`. The sweeps
 * also assert the half that HOLDS: zero secret survivals at either pass across every
 * offset they walk, head-side and multi-segment alike. Nothing here is an exposure;
 * `recordObservation` applies this function ONCE per row, so no production path ever
 * takes the second pass.
 *
 * `URL_MAX` IS NOW AN UPPER BOUND, NOT AN OUTPUT LENGTH. Every assertion that read
 * `toBe(URL_MAX)` was re-derived one at a time rather than relaxed in bulk; see
 * `observations.spec.ts`.
 *
 * The fixed point is asserted by the SWEEP in `observations.spec.ts` — titled
 * "IDEMPOTENT AT THE `URL_MAX` CUT: swept across parameter-name length, not
 * hard-coded (WR-22)" — and NOT by any sentence in this module. A bounded sweep
 * proves a fixed point across the range it swept; it does not prove one for every
 * possible input, and the classes it did not reach are disclosed rather than
 * claimed.
 */
export function normaliseObservedUrl(url: string): string {
  const redacted = redactQueryValues(redactUrlHead(String(url).split("#")[0]));
  if (redacted.length <= URL_MAX) return redacted;

  // The cut fell exactly between two segments: nothing was severed, so nothing
  // is dropped back. Checked against the FULL string, because that is the only
  // place the byte after the cut still exists.
  if (redacted[URL_MAX] === "&") return redacted.slice(0, URL_MAX);

  const cut = redacted.slice(0, URL_MAX);
  const q = cut.indexOf("?");
  const amp = cut.lastIndexOf("&");
  // `amp > q` and not `amp !== -1`: an `&` BEFORE the first `?` is a byte in the
  // path, not a query separator, and dropping back to it would cut the head.
  // With `q === -1` the cut never reached the query at all.
  if (q === -1 || amp <= q) return cut;

  return cut.slice(0, amp);
}

/**
 * Record that this artifact was seen on this request at this URL.
 *
 * Called on the SAME consumer iteration as {@link upsertArtifact} and never
 * conditionally: an artifact written without its observation is the failure this
 * pairing exists to prevent. They are two statements because they MUST be — this
 * driver has no transaction primitive — so each reports its own outcome and the
 * caller counts and logs a failure of either rather than leaving the other
 * silently orphaned.
 */
export async function recordObservation(
  db: Database,
  projectId: string,
  sha256: string,
  requestId: string,
  url: string,
  status: number,
  contentType: string | null,
  observedAt: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(RECORD_OBSERVATION_SQL);
    const res = await stmt.run(
      projectId,
      sha256,
      requestId,
      normaliseObservedUrl(url),
      status,
      contentType === null
        ? null
        : String(contentType).slice(0, CONTENT_TYPE_MAX),
      observedAt,
    );
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/** One observation row, as it is stored. */
export type ObservationRow = {
  project_id: string;
  sha256: string;
  request_id: string;
  url: string;
  status: number;
  content_type: string | null;
  observed_at: number;
};

/** Same reasoning as {@link ARTIFACT_LIST_DEFAULT_LIMIT}: an unbounded read over a
 *  table whose size the TARGET drives is a cost we do not control. */
export const OBSERVATION_LIST_DEFAULT_LIMIT = 500;

// TWO COMPLETE LITERAL STATEMENTS, chosen between — never one string assembled
// from a condition. Concatenating a fragment onto SQL at runtime is the exact
// shape `sql-discipline.spec.ts` fails, and writing the digest filter as an
// optional clause would have made this module the first exception to a rule whose
// value is that it has none.
const LIST_OBSERVATIONS_SQL = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ?
ORDER BY observed_at DESC, request_id ASC
LIMIT ?
`;

const LIST_OBSERVATIONS_FOR_DIGEST_SQL = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ? AND sha256 = ?
ORDER BY observed_at DESC, request_id ASC
LIMIT ?
`;

/**
 * Where this project saw things, most recently first.
 *
 * With `sha256` given, the sightings of ONE artifact — which is the read the
 * retention cascade and any future "where did this bundle come from" surface both
 * want. Without it, the project's whole recent edge set.
 *
 * `request_id ASC` is the tie-break, for the same reason `listArtifacts` has one:
 * `observed_at` alone is not a total order, and two sightings in the same
 * millisecond would otherwise be free to swap between runs.
 */
export async function listObservations(
  db: Database,
  projectId: string,
  sha256?: string,
  limit: number = OBSERVATION_LIST_DEFAULT_LIMIT,
): Promise<ObservationRow[]> {
  if (sha256 === undefined) {
    const stmt = await db.prepare(LIST_OBSERVATIONS_SQL);
    return stmt.all<ObservationRow>(projectId, limit);
  }
  const stmt = await db.prepare(LIST_OBSERVATIONS_FOR_DIGEST_SQL);
  return stmt.all<ObservationRow>(projectId, sha256, limit);
}

const COUNT_OBSERVATIONS_SQL = `SELECT COUNT(*) AS n FROM observations WHERE project_id = ?`;

/** How many observations this project holds. The retention sweep's row-count bound
 *  is per table per project, so it needs this before it deletes anything. */
export async function countObservations(
  db: Database,
  projectId: string,
): Promise<number> {
  const stmt = await db.prepare(COUNT_OBSERVATIONS_SQL);
  const row = await stmt.get<{ n: number }>(projectId);
  return Number(row?.n ?? 0);
}
