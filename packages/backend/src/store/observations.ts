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
 * is redacted by construction, so no length of bare segment survives and there is
 * no "shorter than the bound" left for a future credential format to hide in.
 * This is a POLICY change, not a bug fix: decision P7-D2 was a faithful reading of
 * the operator's UAT words ("keeping the path and the parameter names"), and the
 * words were re-opened. Enforced by `observations.spec.ts`'s
 * `BARE_CREDENTIAL_SHAPES` block, one executed case per format.
 */
export const QUERY_NAME_MAX = 64;

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
    const eq = segment.indexOf("=");
    if (eq === -1) {
      // No `=` — a VALUE WITH NO NAME, and it is redacted whole (decision
      // P10-D1, operator, 2026-08-21). An unknown segment is exactly where a
      // pasted token lands, and the segment carries no name to be worth keeping.
      //
      // An EMPTY segment pushes the empty string, not the marker: there is
      // nothing there to redact, and `<redacted>` would invent a parameter that
      // was never sent. `a=1&&b=2` came in with three segments and leaves with
      // three.
      //
      // Idempotent for free: `QUERY_VALUE_REDACTION` contains no `=`, so on a
      // second pass it arrives here itself and is replaced with the same bytes.
      out.push(segment === "" ? "" : QUERY_VALUE_REDACTION);
      continue;
    }
    // The FIRST `=` only, so an `=` inside a value cannot fabricate a second
    // parameter and expose half a value as a "name".
    out.push(
      segment.slice(0, eq).slice(0, QUERY_NAME_MAX) +
        "=" +
        QUERY_VALUE_REDACTION,
    );
  }
  return head + "?" + out.join("&");
}

/**
 * Strip the fragment, redact the query VALUES, then bound the length — in that
 * order.
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
 */
export function normaliseObservedUrl(url: string): string {
  return redactQueryValues(String(url).split("#")[0]).slice(0, URL_MAX);
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
