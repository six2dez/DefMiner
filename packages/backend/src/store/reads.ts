// packages/backend/src/store/reads.ts — the paginated reads the workspace pages
// with (UI-02, UI-07).
//
// Three things a later reader will otherwise have to rediscover, stated here
// because each of them is load-bearing and none of them is visible from a single
// statement:
//
// 1. EVERY STATEMENT IN THIS FILE IS A COMPLETE LITERAL, AND SELECTION IS AN
//    OBJECT LOOKUP OVER A FROZEN RECORD — NOT SQL CONSTRUCTION.
//    `05-RESEARCH.md § O-01` disqualified the two alternatives by execution
//    rather than by argument. The null-guard predicate `(? IS NULL OR col = ?)`
//    measured 2,000,025 SQLite VM steps to return an EMPTY page over a
//    200,000-row partition, against 24 for the same filter on a leading index —
//    2.6x worse than the offset form 05-UI-SPEC.md bans, and reached by an
//    operator typing a filter value that matches nothing. The allowlisted
//    fragment builder was disqualified for a different and worse reason: driving
//    `sql-discipline.spec.ts`'s own exported `auditSource` against three builder
//    shapes returned ZERO violations on all three, so a builder cannot earn an
//    exemption from a gate that is structurally blind to it — it can only create
//    an ungated SQL surface that reports green forever. What is left is the fixed
//    matrix, and the matrix is not a new pattern here: `observations.ts` already
//    carries two complete literals chosen between, with a comment recording that
//    writing the digest filter as an optional clause would have made that module
//    the first exception to a rule whose value is that it has none.
//
//    The lookup below is plain TypeScript over a deeply frozen record. It is
//    invisible to no gate, which is precisely why it is the approach that
//    survives review rather than the one that survives detection.
//
// 2. THE PAGINATED STATEMENTS USE A UNIFORM TIE-BREAK DIRECTION. THE SHIPPED LIST
//    STATEMENTS USE A MIXED ONE. THESE ARE SEPARATE STATEMENTS AND THE SHIPPED
//    ONES ARE NOT EDITED HERE.
//    `listArtifacts` orders `last_seen_at DESC, sha256 ASC` and
//    `listObservations` orders `observed_at DESC, request_id ASC`. A row-value
//    comparison `(a, b) < (?, ?)` means `a < ? OR (a = ? AND b < ?)`, so applying
//    one to a mixed-direction sort SKIPS ROWS AND DUPLICATES OTHERS AND NOTHING
//    ERRORS — it is silently wrong, not slow. Those statements serve a
//    whole-page read and keep their own indexes; the statements here are new and
//    uniform, and they match the direction-explicit composite indexes the
//    migration ladder ships. Tidying the two families into one would reintroduce
//    exactly the defect the separation exists to prevent.
//
// 3. EVERY FILTERED STATEMENT WRAPS A BOUNDED CANDIDATE WINDOW.
//    None of the filter columns here leads an index — `kind` and `content_type`
//    are applied as a filter during the scan, not as a seek. A non-sargable
//    filter that matches nothing therefore walks the WHOLE project partition, on
//    the single QuickJS thread, inside one synchronous driver call with no yield
//    point and no interrupt handler. Bounding the SCANNED window inside the
//    statement — not just the returned window — is what makes the cost stop
//    depending on filter selectivity. See {@link CANDIDATE_WINDOW_ROWS}.
//
// PROVENANCE OF EVERY NUMBER ABOVE, STATED RATHER THAN IMPLIED. The query plans
// and VM-step counts were measured on SQLite 3.51.0 and 3.53.4, NOT on Caido's
// shipped 3.46.0 — no 3.46 binary is reachable from this repo. The operator chose
// at the Wave 1 boundary to proceed with that residual DISCLOSED rather than
// closed. Nothing here is verified on the shipped runtime; the gap is narrowed to
// a 3.46 -> 3.51 window and is an executed assertion in
// `tests/sqlite-346-query-plans.spec.ts`. The CORRECTNESS properties below — the
// tie-block behaviour, the project scoping, the cursor advance — do not depend on
// a query plan and are asserted directly in `reads.spec.ts`.
//
// THE DRIVER CONSTRAINTS THIS FILE INHERITS, unchanged from `artifacts.ts`:
// positional `?` only (named parameters never bind and nothing reports it);
// `Database.exec` takes no bind values at all; `prepare()` INSIDE each call
// because `sdk.meta.db()` is a pool over worker threads; no `RETURNING`, no
// `last_insert_rowid()`; every multi-row statement scoped by `project_id` because
// one SQLite file serves every Caido project.
//
// Caught exceptions render through `describeError`, never a bare stringification
// (`error-redaction.spec.ts`). There are no caught exceptions in this module: the
// package's split is that WRITES report their own outcome and LIST READS do not
// try/catch, and these are list reads.

import type {
  PageCursor,
  PageRequest,
  PageResponse,
  VisibleTotal,
} from "@defminer/engine/contract";
import type { Database } from "sqlite";

import type { ArtifactRow } from "./artifacts";
import type { ObservationRow } from "./observations";

// ---------------------------------------------------------------------------
// THE TWO BOUNDS
// ---------------------------------------------------------------------------

/**
 * Rows in one keyset page.
 *
 * 100 per `05-UI-SPEC.md § "Data & Interaction Contract"`, which fixes 100-row
 * keyset pages inside a 2,000-row in-memory window. It is also the MAXIMUM this
 * module will serve: a request for more is clamped rather than honoured, because
 * the page size is a contract the frontend's virtual scroller is sized against
 * and not a knob a caller gets to widen.
 */
export const KEYSET_PAGE_ROWS = 100;

/**
 * How many candidate rows a FILTERED statement may examine before it stops.
 *
 * MEASURED, and the measurement is the whole justification. In the pathological
 * case — a filter that excludes every row, so the page returns nothing — the
 * unbounded form cost 4,000,023 SQLite VM steps and the bounded form cost 15,527:
 * a 258x reduction. The number that matters is not 258. It is that the bounded
 * form's cost STOPS DEPENDING ON FILTER SELECTIVITY: it scanned 500 candidates at
 * a 25,000-row partition and 500 at a 200,000-row partition, against 25,000 and
 * 200,000 unbounded. A filter matching nothing then costs the same as a filter
 * matching everything, which is the property that makes an operator typo
 * survivable on a single-threaded runtime.
 *
 * THE PRICE IS A SHORT PAGE, AND IT IS SURFACED RATHER THAN HIDDEN. The statement
 * may return fewer than {@link KEYSET_PAGE_ROWS} rows while more exist. The
 * cursor then advances to the last row the window SCANNED — not to the last row
 * it returned, which would leave the cursor stuck behind a fully-filtered window
 * and never advance at all — and `PageResponse.exhausted` tells the caller
 * whether to refetch or to render the empty state. See
 * `@defminer/engine/contract`'s `PageResponse` doc comment, which is where that
 * contract change is written down.
 *
 * 500 rather than a larger number because the whole window is materialised into
 * the outer query's scan on a thread that also serves every RPC and every timer,
 * and because 500 is the bound this package already treats as "well above any UI
 * page and well below anything that would stall the single thread"
 * ({@link ArtifactRow}'s module, `ARTIFACT_LIST_DEFAULT_LIMIT`).
 */
export const CANDIDATE_WINDOW_ROWS = 500;

// ---------------------------------------------------------------------------
// THE CLOSED VOCABULARIES
// ---------------------------------------------------------------------------

/** The two shipped tables the workspace pages over. */
export const INVENTORY_TABLES = ["artifacts", "observations"] as const;

/** One pageable table. */
export type InventoryTable = (typeof INVENTORY_TABLES)[number];

/**
 * Sort keys for `artifacts`.
 *
 * DefMiner-authored identifiers from a closed set, exactly as
 * `PageRequest.sortKey` requires. They select a literal statement from the frozen
 * record below; nothing here is ever interpolated into SQL.
 */
export const ARTIFACT_SORT_KEYS = ["last_seen", "byte_len"] as const;

/** One `artifacts` sort key. */
export type ArtifactSortKey = (typeof ARTIFACT_SORT_KEYS)[number];

/** Sort keys for `observations`. Same rule as {@link ARTIFACT_SORT_KEYS}. */
export const OBSERVATION_SORT_KEYS = ["observed_at", "status"] as const;

/** One `observations` sort key. */
export type ObservationSortKey = (typeof OBSERVATION_SORT_KEYS)[number];

/**
 * The single filterable column on `artifacts`.
 *
 * ONE COLUMN, NOT A COMBINATION, AND THAT IS WHAT KEEPS THE MATRIX LINEAR. One
 * literal per filter COLUMN turns an exponential `2^k` matrix into a linear
 * `k + 1`, and `PageRequest`'s single optional `filter` — one object, never a
 * record of filters — is what makes "at most one filter at a time" a type-level
 * fact rather than a convention somebody remembers. Plan 05-04 shaped the request
 * that way deliberately so this file could be dimensioned this way.
 */
export const ARTIFACT_FILTER_COLUMN = "kind";

/** The single filterable column on `observations`. See
 *  {@link ARTIFACT_FILTER_COLUMN}. */
export const OBSERVATION_FILTER_COLUMN = "content_type";

// ---------------------------------------------------------------------------
// THE STATEMENT MATRIX — ARTIFACTS
// ---------------------------------------------------------------------------
//
// Dimensioned exactly as `05-RESEARCH.md § O-01`'s recommendation numbers them:
// one literal per sort key per direction (points 1 and 2), TWO per sort — a
// first-page statement with no cursor predicate and a next-page statement with
// the row-value cursor predicate — and one literal per filter COLUMN (point 3),
// never per filter combination.
//
// THE FIRST/NEXT PAIR IS NOT FOLDED INTO ONE WITH A SENTINEL BIND, deliberately.
// A sentinel greater than any digest encodes a hidden assumption about the digest
// alphabet, and this package's whole discipline is that a reader can see what
// binds where.
//
// A THIRD STATEMENT PER SLOT — the `window` read — exists only for the filtered
// path. It returns the candidate window's KEY COLUMNS ONLY, from the covering
// keyset index, and it is what makes `scanned` a measured number and the cursor
// advance to the window's edge rather than to the last surviving row. Without it
// a filter matching nothing would return an empty page whose cursor had not
// moved, and the caller would refetch the same window forever.

const ARTIFACTS_LAST_SEEN_DESC_FIRST = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ?
ORDER BY last_seen_at DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_NEXT = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ? AND (last_seen_at, sha256) < (?, ?)
ORDER BY last_seen_at DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_FIRST_FILTERED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
  FROM artifacts
  WHERE project_id = ?
  ORDER BY last_seen_at DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.last_seen_at DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_NEXT_FILTERED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
  FROM artifacts
  WHERE project_id = ? AND (last_seen_at, sha256) < (?, ?)
  ORDER BY last_seen_at DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.last_seen_at DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_FIRST_WINDOW = `
SELECT last_seen_at AS sort_value, sha256 AS tie_break
FROM artifacts
WHERE project_id = ?
ORDER BY last_seen_at DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_NEXT_WINDOW = `
SELECT last_seen_at AS sort_value, sha256 AS tie_break
FROM artifacts
WHERE project_id = ? AND (last_seen_at, sha256) < (?, ?)
ORDER BY last_seen_at DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_FIRST = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ?
ORDER BY last_seen_at ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_NEXT = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ? AND (last_seen_at, sha256) > (?, ?)
ORDER BY last_seen_at ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_FIRST_FILTERED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
  FROM artifacts
  WHERE project_id = ?
  ORDER BY last_seen_at ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.last_seen_at ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_NEXT_FILTERED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
  FROM artifacts
  WHERE project_id = ? AND (last_seen_at, sha256) > (?, ?)
  ORDER BY last_seen_at ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.last_seen_at ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_FIRST_WINDOW = `
SELECT last_seen_at AS sort_value, sha256 AS tie_break
FROM artifacts
WHERE project_id = ?
ORDER BY last_seen_at ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_NEXT_WINDOW = `
SELECT last_seen_at AS sort_value, sha256 AS tie_break
FROM artifacts
WHERE project_id = ? AND (last_seen_at, sha256) > (?, ?)
ORDER BY last_seen_at ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_FIRST = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ?
ORDER BY byte_len DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_NEXT = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ? AND (byte_len, sha256) < (?, ?)
ORDER BY byte_len DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_FIRST_FILTERED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
  FROM artifacts
  WHERE project_id = ?
  ORDER BY byte_len DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.byte_len DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_NEXT_FILTERED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
  FROM artifacts
  WHERE project_id = ? AND (byte_len, sha256) < (?, ?)
  ORDER BY byte_len DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.byte_len DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_FIRST_WINDOW = `
SELECT byte_len AS sort_value, sha256 AS tie_break
FROM artifacts
WHERE project_id = ?
ORDER BY byte_len DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_NEXT_WINDOW = `
SELECT byte_len AS sort_value, sha256 AS tie_break
FROM artifacts
WHERE project_id = ? AND (byte_len, sha256) < (?, ?)
ORDER BY byte_len DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_FIRST = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ?
ORDER BY byte_len ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_NEXT = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ? AND (byte_len, sha256) > (?, ?)
ORDER BY byte_len ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_FIRST_FILTERED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
  FROM artifacts
  WHERE project_id = ?
  ORDER BY byte_len ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.byte_len ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_NEXT_FILTERED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
  FROM artifacts
  WHERE project_id = ? AND (byte_len, sha256) > (?, ?)
  ORDER BY byte_len ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.byte_len ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_FIRST_WINDOW = `
SELECT byte_len AS sort_value, sha256 AS tie_break
FROM artifacts
WHERE project_id = ?
ORDER BY byte_len ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_NEXT_WINDOW = `
SELECT byte_len AS sort_value, sha256 AS tie_break
FROM artifacts
WHERE project_id = ? AND (byte_len, sha256) > (?, ?)
ORDER BY byte_len ASC, sha256 ASC
LIMIT ?
`;

// ---------------------------------------------------------------------------
// THE STATEMENT MATRIX — OBSERVATIONS
// ---------------------------------------------------------------------------
//
// The same four dimensions over the second shipped table. The tie-break is
// `request_id` — `observed_at` alone is not a total order and two sightings in
// the same millisecond would otherwise be free to swap between runs, which is the
// same reason `listObservations` has one. Keyset pagination depends on exactly
// that property and would drift without it.

const OBSERVATIONS_OBSERVED_AT_DESC_FIRST = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ?
ORDER BY observed_at DESC, request_id DESC
LIMIT ?
`;

const OBSERVATIONS_OBSERVED_AT_DESC_NEXT = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ? AND (observed_at, request_id) < (?, ?)
ORDER BY observed_at DESC, request_id DESC
LIMIT ?
`;

const OBSERVATIONS_OBSERVED_AT_DESC_FIRST_FILTERED = `
SELECT e.project_id, e.sha256, e.request_id, e.url, e.status, e.content_type, e.observed_at
FROM (
  SELECT project_id, sha256, request_id, url, status, content_type, observed_at
  FROM observations
  WHERE project_id = ?
  ORDER BY observed_at DESC, request_id DESC
  LIMIT ?
) e
WHERE e.content_type = ?
ORDER BY e.observed_at DESC, e.request_id DESC
LIMIT ?
`;

const OBSERVATIONS_OBSERVED_AT_DESC_NEXT_FILTERED = `
SELECT e.project_id, e.sha256, e.request_id, e.url, e.status, e.content_type, e.observed_at
FROM (
  SELECT project_id, sha256, request_id, url, status, content_type, observed_at
  FROM observations
  WHERE project_id = ? AND (observed_at, request_id) < (?, ?)
  ORDER BY observed_at DESC, request_id DESC
  LIMIT ?
) e
WHERE e.content_type = ?
ORDER BY e.observed_at DESC, e.request_id DESC
LIMIT ?
`;

const OBSERVATIONS_OBSERVED_AT_DESC_FIRST_WINDOW = `
SELECT observed_at AS sort_value, request_id AS tie_break
FROM observations
WHERE project_id = ?
ORDER BY observed_at DESC, request_id DESC
LIMIT ?
`;

const OBSERVATIONS_OBSERVED_AT_DESC_NEXT_WINDOW = `
SELECT observed_at AS sort_value, request_id AS tie_break
FROM observations
WHERE project_id = ? AND (observed_at, request_id) < (?, ?)
ORDER BY observed_at DESC, request_id DESC
LIMIT ?
`;

const OBSERVATIONS_OBSERVED_AT_ASC_FIRST = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ?
ORDER BY observed_at ASC, request_id ASC
LIMIT ?
`;

const OBSERVATIONS_OBSERVED_AT_ASC_NEXT = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ? AND (observed_at, request_id) > (?, ?)
ORDER BY observed_at ASC, request_id ASC
LIMIT ?
`;

const OBSERVATIONS_OBSERVED_AT_ASC_FIRST_FILTERED = `
SELECT e.project_id, e.sha256, e.request_id, e.url, e.status, e.content_type, e.observed_at
FROM (
  SELECT project_id, sha256, request_id, url, status, content_type, observed_at
  FROM observations
  WHERE project_id = ?
  ORDER BY observed_at ASC, request_id ASC
  LIMIT ?
) e
WHERE e.content_type = ?
ORDER BY e.observed_at ASC, e.request_id ASC
LIMIT ?
`;

const OBSERVATIONS_OBSERVED_AT_ASC_NEXT_FILTERED = `
SELECT e.project_id, e.sha256, e.request_id, e.url, e.status, e.content_type, e.observed_at
FROM (
  SELECT project_id, sha256, request_id, url, status, content_type, observed_at
  FROM observations
  WHERE project_id = ? AND (observed_at, request_id) > (?, ?)
  ORDER BY observed_at ASC, request_id ASC
  LIMIT ?
) e
WHERE e.content_type = ?
ORDER BY e.observed_at ASC, e.request_id ASC
LIMIT ?
`;

const OBSERVATIONS_OBSERVED_AT_ASC_FIRST_WINDOW = `
SELECT observed_at AS sort_value, request_id AS tie_break
FROM observations
WHERE project_id = ?
ORDER BY observed_at ASC, request_id ASC
LIMIT ?
`;

const OBSERVATIONS_OBSERVED_AT_ASC_NEXT_WINDOW = `
SELECT observed_at AS sort_value, request_id AS tie_break
FROM observations
WHERE project_id = ? AND (observed_at, request_id) > (?, ?)
ORDER BY observed_at ASC, request_id ASC
LIMIT ?
`;

const OBSERVATIONS_STATUS_DESC_FIRST = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ?
ORDER BY status DESC, request_id DESC
LIMIT ?
`;

const OBSERVATIONS_STATUS_DESC_NEXT = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ? AND (status, request_id) < (?, ?)
ORDER BY status DESC, request_id DESC
LIMIT ?
`;

const OBSERVATIONS_STATUS_DESC_FIRST_FILTERED = `
SELECT e.project_id, e.sha256, e.request_id, e.url, e.status, e.content_type, e.observed_at
FROM (
  SELECT project_id, sha256, request_id, url, status, content_type, observed_at
  FROM observations
  WHERE project_id = ?
  ORDER BY status DESC, request_id DESC
  LIMIT ?
) e
WHERE e.content_type = ?
ORDER BY e.status DESC, e.request_id DESC
LIMIT ?
`;

const OBSERVATIONS_STATUS_DESC_NEXT_FILTERED = `
SELECT e.project_id, e.sha256, e.request_id, e.url, e.status, e.content_type, e.observed_at
FROM (
  SELECT project_id, sha256, request_id, url, status, content_type, observed_at
  FROM observations
  WHERE project_id = ? AND (status, request_id) < (?, ?)
  ORDER BY status DESC, request_id DESC
  LIMIT ?
) e
WHERE e.content_type = ?
ORDER BY e.status DESC, e.request_id DESC
LIMIT ?
`;

const OBSERVATIONS_STATUS_DESC_FIRST_WINDOW = `
SELECT status AS sort_value, request_id AS tie_break
FROM observations
WHERE project_id = ?
ORDER BY status DESC, request_id DESC
LIMIT ?
`;

const OBSERVATIONS_STATUS_DESC_NEXT_WINDOW = `
SELECT status AS sort_value, request_id AS tie_break
FROM observations
WHERE project_id = ? AND (status, request_id) < (?, ?)
ORDER BY status DESC, request_id DESC
LIMIT ?
`;

const OBSERVATIONS_STATUS_ASC_FIRST = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ?
ORDER BY status ASC, request_id ASC
LIMIT ?
`;

const OBSERVATIONS_STATUS_ASC_NEXT = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ? AND (status, request_id) > (?, ?)
ORDER BY status ASC, request_id ASC
LIMIT ?
`;

const OBSERVATIONS_STATUS_ASC_FIRST_FILTERED = `
SELECT e.project_id, e.sha256, e.request_id, e.url, e.status, e.content_type, e.observed_at
FROM (
  SELECT project_id, sha256, request_id, url, status, content_type, observed_at
  FROM observations
  WHERE project_id = ?
  ORDER BY status ASC, request_id ASC
  LIMIT ?
) e
WHERE e.content_type = ?
ORDER BY e.status ASC, e.request_id ASC
LIMIT ?
`;

const OBSERVATIONS_STATUS_ASC_NEXT_FILTERED = `
SELECT e.project_id, e.sha256, e.request_id, e.url, e.status, e.content_type, e.observed_at
FROM (
  SELECT project_id, sha256, request_id, url, status, content_type, observed_at
  FROM observations
  WHERE project_id = ? AND (status, request_id) > (?, ?)
  ORDER BY status ASC, request_id ASC
  LIMIT ?
) e
WHERE e.content_type = ?
ORDER BY e.status ASC, e.request_id ASC
LIMIT ?
`;

const OBSERVATIONS_STATUS_ASC_FIRST_WINDOW = `
SELECT status AS sort_value, request_id AS tie_break
FROM observations
WHERE project_id = ?
ORDER BY status ASC, request_id ASC
LIMIT ?
`;

const OBSERVATIONS_STATUS_ASC_NEXT_WINDOW = `
SELECT status AS sort_value, request_id AS tie_break
FROM observations
WHERE project_id = ? AND (status, request_id) > (?, ?)
ORDER BY status ASC, request_id ASC
LIMIT ?
`;

// ---------------------------------------------------------------------------
// THE LOOKUP — PLAIN TYPESCRIPT OVER A DEEPLY FROZEN RECORD
// ---------------------------------------------------------------------------

/** The three statements one (sort key, direction, cursor presence) slot needs. */
type SlotStatements = {
  /** The unfiltered page. Its own `LIMIT` is the page size. */
  readonly page: string;
  /** The filtered page: the outer filter over the bounded candidate window. */
  readonly filtered: string;
  /** The candidate window's key columns — {@link CANDIDATE_WINDOW_ROWS} rows at
   *  most, from the covering keyset index. Read ONLY on the filtered path. */
  readonly window: string;
};

/** Cursor presence, as a lookup key. */
type CursorSlot = {
  readonly first: SlotStatements;
  readonly next: SlotStatements;
};

/** Direction, as a lookup key. */
type DirectionSlot = { readonly asc: CursorSlot; readonly desc: CursorSlot };

/**
 * Deep-freeze one sort key's four slots.
 *
 * FROZEN AT EVERY LEVEL, not just the top. A shallow freeze leaves the leaves
 * writable, and the whole security property of this module is that the statement
 * a request reaches is a statement this file wrote — an assignable leaf would put
 * that back in play.
 */
function freezeDirections(d: DirectionSlot): DirectionSlot {
  for (const dir of [d.asc, d.desc]) {
    Object.freeze(dir.first);
    Object.freeze(dir.next);
    Object.freeze(dir);
  }
  return Object.freeze(d);
}

const ARTIFACT_READS: Readonly<Record<ArtifactSortKey, DirectionSlot>> =
  Object.freeze({
    last_seen: freezeDirections({
      desc: {
        first: {
          page: ARTIFACTS_LAST_SEEN_DESC_FIRST,
          filtered: ARTIFACTS_LAST_SEEN_DESC_FIRST_FILTERED,
          window: ARTIFACTS_LAST_SEEN_DESC_FIRST_WINDOW,
        },
        next: {
          page: ARTIFACTS_LAST_SEEN_DESC_NEXT,
          filtered: ARTIFACTS_LAST_SEEN_DESC_NEXT_FILTERED,
          window: ARTIFACTS_LAST_SEEN_DESC_NEXT_WINDOW,
        },
      },
      asc: {
        first: {
          page: ARTIFACTS_LAST_SEEN_ASC_FIRST,
          filtered: ARTIFACTS_LAST_SEEN_ASC_FIRST_FILTERED,
          window: ARTIFACTS_LAST_SEEN_ASC_FIRST_WINDOW,
        },
        next: {
          page: ARTIFACTS_LAST_SEEN_ASC_NEXT,
          filtered: ARTIFACTS_LAST_SEEN_ASC_NEXT_FILTERED,
          window: ARTIFACTS_LAST_SEEN_ASC_NEXT_WINDOW,
        },
      },
    }),
    byte_len: freezeDirections({
      desc: {
        first: {
          page: ARTIFACTS_BYTE_LEN_DESC_FIRST,
          filtered: ARTIFACTS_BYTE_LEN_DESC_FIRST_FILTERED,
          window: ARTIFACTS_BYTE_LEN_DESC_FIRST_WINDOW,
        },
        next: {
          page: ARTIFACTS_BYTE_LEN_DESC_NEXT,
          filtered: ARTIFACTS_BYTE_LEN_DESC_NEXT_FILTERED,
          window: ARTIFACTS_BYTE_LEN_DESC_NEXT_WINDOW,
        },
      },
      asc: {
        first: {
          page: ARTIFACTS_BYTE_LEN_ASC_FIRST,
          filtered: ARTIFACTS_BYTE_LEN_ASC_FIRST_FILTERED,
          window: ARTIFACTS_BYTE_LEN_ASC_FIRST_WINDOW,
        },
        next: {
          page: ARTIFACTS_BYTE_LEN_ASC_NEXT,
          filtered: ARTIFACTS_BYTE_LEN_ASC_NEXT_FILTERED,
          window: ARTIFACTS_BYTE_LEN_ASC_NEXT_WINDOW,
        },
      },
    }),
  });

const OBSERVATION_READS: Readonly<Record<ObservationSortKey, DirectionSlot>> =
  Object.freeze({
    observed_at: freezeDirections({
      desc: {
        first: {
          page: OBSERVATIONS_OBSERVED_AT_DESC_FIRST,
          filtered: OBSERVATIONS_OBSERVED_AT_DESC_FIRST_FILTERED,
          window: OBSERVATIONS_OBSERVED_AT_DESC_FIRST_WINDOW,
        },
        next: {
          page: OBSERVATIONS_OBSERVED_AT_DESC_NEXT,
          filtered: OBSERVATIONS_OBSERVED_AT_DESC_NEXT_FILTERED,
          window: OBSERVATIONS_OBSERVED_AT_DESC_NEXT_WINDOW,
        },
      },
      asc: {
        first: {
          page: OBSERVATIONS_OBSERVED_AT_ASC_FIRST,
          filtered: OBSERVATIONS_OBSERVED_AT_ASC_FIRST_FILTERED,
          window: OBSERVATIONS_OBSERVED_AT_ASC_FIRST_WINDOW,
        },
        next: {
          page: OBSERVATIONS_OBSERVED_AT_ASC_NEXT,
          filtered: OBSERVATIONS_OBSERVED_AT_ASC_NEXT_FILTERED,
          window: OBSERVATIONS_OBSERVED_AT_ASC_NEXT_WINDOW,
        },
      },
    }),
    status: freezeDirections({
      desc: {
        first: {
          page: OBSERVATIONS_STATUS_DESC_FIRST,
          filtered: OBSERVATIONS_STATUS_DESC_FIRST_FILTERED,
          window: OBSERVATIONS_STATUS_DESC_FIRST_WINDOW,
        },
        next: {
          page: OBSERVATIONS_STATUS_DESC_NEXT,
          filtered: OBSERVATIONS_STATUS_DESC_NEXT_FILTERED,
          window: OBSERVATIONS_STATUS_DESC_NEXT_WINDOW,
        },
      },
      asc: {
        first: {
          page: OBSERVATIONS_STATUS_ASC_FIRST,
          filtered: OBSERVATIONS_STATUS_ASC_FIRST_FILTERED,
          window: OBSERVATIONS_STATUS_ASC_FIRST_WINDOW,
        },
        next: {
          page: OBSERVATIONS_STATUS_ASC_NEXT,
          filtered: OBSERVATIONS_STATUS_ASC_NEXT_FILTERED,
          window: OBSERVATIONS_STATUS_ASC_NEXT_WINDOW,
        },
      },
    }),
  });

// ---------------------------------------------------------------------------
// THE COUNTS
// ---------------------------------------------------------------------------
//
// THE ONE UNBOUNDED READ IN THIS MODULE, and it is unbounded on purpose. A count
// is a count: there is no exact total of a non-indexed predicate that does not
// look at every candidate row, and a capped count ("2000+") would make the
// UI-SPEC's `{total} secrets exist on this target` copy a claim the number does
// not support. The filtered count is therefore O(partition) and is called once
// per filter change, never once per page. If it ever becomes the thing that
// stalls the thread, the fix is a leading index on the filter column, not a
// silently truncated total.

const COUNT_ARTIFACTS_ALL = `SELECT COUNT(*) AS n FROM artifacts WHERE project_id = ?`;

const COUNT_ARTIFACTS_BY_KIND = `SELECT COUNT(*) AS n FROM artifacts WHERE project_id = ? AND kind = ?`;

const COUNT_OBSERVATIONS_ALL = `SELECT COUNT(*) AS n FROM observations WHERE project_id = ?`;

const COUNT_OBSERVATIONS_BY_CONTENT_TYPE = `SELECT COUNT(*) AS n FROM observations WHERE project_id = ? AND content_type = ?`;

// ---------------------------------------------------------------------------
// THE READS
// ---------------------------------------------------------------------------

/** One row of a candidate-window read: the two key columns and nothing else. */
type WindowRow = {
  sort_value: string | number;
  tie_break: string | number;
};

/** `{ n }`, as every COUNT statement here returns it. */
type CountRow = { n: number };

/** The empty page, for every request this module has no statement for.
 *
 *  FAIL CLOSED, ONE RULE, NO GUESSING. An unrecognised sort key, an unrecognised
 *  filter column and an absent project id are all answered the same way: there is
 *  no statement, so there is no read. Falling back to a default sort would answer
 *  a question nobody asked, and ignoring an unrecognised filter would return MORE
 *  rows than the caller narrowed to — the opposite of what a filter is for. */
function emptyPage<TRow>(): PageResponse<TRow> {
  return { rows: [], nextCursor: null, scanned: 0, exhausted: true };
}

/** The page size actually served. Clamped rather than honoured: see
 *  {@link KEYSET_PAGE_ROWS}. */
function clampLimit(requested: number): number {
  if (!Number.isFinite(requested)) return KEYSET_PAGE_ROWS;
  const n = Math.floor(requested);
  if (n < 1) return 1;
  if (n > KEYSET_PAGE_ROWS) return KEYSET_PAGE_ROWS;
  return n;
}

/** The cursor a row of this shape produces. */
function cursorOf(
  sortValue: string | number,
  tieBreak: string | number,
): PageCursor {
  return { sortValue, tieBreak };
}

/**
 * The shared page algorithm, over one table's frozen statement record.
 *
 * Generic over the row type and given the two accessors that turn a row into its
 * cursor, because the ONLY thing that differs between the two tables is which
 * columns those are. The control flow — and in particular the cursor-advance rule
 * below, which is the part that is easy to get subtly wrong — exists once.
 */
async function readPage<TRow extends object>(
  db: Database,
  reads: Readonly<Record<string, DirectionSlot>>,
  filterColumn: string,
  req: PageRequest,
  sortValueOf: (row: TRow) => string | number,
  tieBreakOf: (row: TRow) => string | number,
): Promise<PageResponse<TRow>> {
  if (req.projectId === "") return emptyPage<TRow>();

  const bySort = Object.prototype.hasOwnProperty.call(reads, req.sortKey)
    ? reads[req.sortKey]
    : undefined;
  if (bySort === undefined) return emptyPage<TRow>();

  const byDirection = req.direction === "asc" ? bySort.asc : bySort.desc;
  const slot = req.cursor === null ? byDirection.first : byDirection.next;
  const limit = clampLimit(req.limit);

  // --- the unfiltered path ------------------------------------------------
  //
  // No candidate window: the statement's own LIMIT is the page, so every row it
  // scans is a row it returns and `scanned` IS the page length. A short page here
  // means the partition ran out, which is the one case where `exhausted` is true.
  if (req.filter === null) {
    const stmt = await db.prepare(slot.page);
    const rows =
      req.cursor === null
        ? await stmt.all<TRow>(req.projectId, limit)
        : await stmt.all<TRow>(
            req.projectId,
            req.cursor.sortValue,
            req.cursor.tieBreak,
            limit,
          );
    const last = rows[rows.length - 1];
    const exhausted = rows.length < limit;
    return {
      rows,
      nextCursor:
        exhausted || last === undefined
          ? null
          : cursorOf(sortValueOf(last), tieBreakOf(last)),
      scanned: rows.length,
      exhausted,
    };
  }

  if (req.filter.column !== filterColumn) return emptyPage<TRow>();

  // --- the filtered path --------------------------------------------------
  //
  // TWO STATEMENTS, AND THE SECOND IS NOT OPTIONAL. The window read measures how
  // many candidates the filter actually examined and where the window ENDED. The
  // page read returns the survivors. Without the window read the cursor could
  // only ever advance to the last SURVIVING row — so a filter matching nothing
  // would return an empty page whose cursor had not moved, and the caller would
  // refetch the same window forever. That is the bug the bounded window would
  // otherwise introduce while fixing the cost one.
  const windowStmt = await db.prepare(slot.window);
  const windowRows =
    req.cursor === null
      ? await windowStmt.all<WindowRow>(req.projectId, CANDIDATE_WINDOW_ROWS)
      : await windowStmt.all<WindowRow>(
          req.projectId,
          req.cursor.sortValue,
          req.cursor.tieBreak,
          CANDIDATE_WINDOW_ROWS,
        );

  const pageStmt = await db.prepare(slot.filtered);
  const rows =
    req.cursor === null
      ? await pageStmt.all<TRow>(
          req.projectId,
          CANDIDATE_WINDOW_ROWS,
          req.filter.value,
          limit,
        )
      : await pageStmt.all<TRow>(
          req.projectId,
          req.cursor.sortValue,
          req.cursor.tieBreak,
          CANDIDATE_WINDOW_ROWS,
          req.filter.value,
          limit,
        );

  const scanned = windowRows.length;
  const windowEdge = windowRows[scanned - 1];
  const windowExhausted = scanned < CANDIDATE_WINDOW_ROWS;

  // THE CURSOR ADVANCE RULE, in two cases and no more.
  //
  //   a) The page came back FULL. The outer limit cut it, not the window, so
  //      there may be survivors left inside this same window. Advance to the last
  //      RETURNED row, or they would be skipped.
  //   b) The page came back SHORT. The whole window was consumed and filtered, so
  //      advance to the window's EDGE — and if the window itself was short, the
  //      partition is genuinely exhausted and there is no next cursor at all.
  if (rows.length >= limit) {
    const last = rows[rows.length - 1];
    return {
      rows,
      nextCursor:
        last === undefined
          ? null
          : cursorOf(sortValueOf(last), tieBreakOf(last)),
      scanned,
      exhausted: false,
    };
  }

  if (windowExhausted || windowEdge === undefined) {
    return { rows, nextCursor: null, scanned, exhausted: true };
  }

  return {
    rows,
    nextCursor: cursorOf(windowEdge.sort_value, windowEdge.tie_break),
    scanned,
    exhausted: false,
  };
}

/**
 * One keyset page of `artifacts`, most recently seen first by default.
 *
 * Sort keys: {@link ARTIFACT_SORT_KEYS}. Filter column:
 * {@link ARTIFACT_FILTER_COLUMN}. A request naming anything else gets an empty
 * exhausted page — see {@link emptyPage}.
 *
 * Does NOT try/catch. This package's split is that writes report their own
 * outcome and list reads do not, and this is a list read.
 */
export async function listArtifactsPage(
  db: Database,
  req: PageRequest,
): Promise<PageResponse<ArtifactRow>> {
  return readPage<ArtifactRow>(
    db,
    ARTIFACT_READS,
    ARTIFACT_FILTER_COLUMN,
    req,
    (row) => (req.sortKey === "byte_len" ? row.byte_len : row.last_seen_at),
    (row) => row.sha256,
  );
}

/**
 * One keyset page of `observations`, most recently observed first by default.
 *
 * Sort keys: {@link OBSERVATION_SORT_KEYS}. Filter column:
 * {@link OBSERVATION_FILTER_COLUMN}.
 *
 * A CONTENT-TYPE FILTER CANNOT SELECT THE ROWS THAT HAVE NONE. `content_type` is
 * nullable — a 304 reaches the hook with no content-type at all — and `= ?` never
 * matches NULL in SQL. The chip list the operator picks from is built from
 * observed values, so the case does not arise through the UI; it is stated here
 * because a caller constructing a request by hand would otherwise read an empty
 * page as "there are none" rather than as "that is not expressible".
 */
export async function listObservationsPage(
  db: Database,
  req: PageRequest,
): Promise<PageResponse<ObservationRow>> {
  return readPage<ObservationRow>(
    db,
    OBSERVATION_READS,
    OBSERVATION_FILTER_COLUMN,
    req,
    (row) => (req.sortKey === "status" ? row.status : row.observed_at),
    (row) => row.request_id,
  );
}

/**
 * How many rows the operator can currently reach, for one table and one filter.
 *
 * THE SEMANTICS THE CONTRACT FIXES: `visible` counts rows the operator can
 * CURRENTLY REACH. Suppressed rows are not inside it, because a suppressed
 * finding is one the operator has said is not a finding, and counting it makes
 * the number wrong in the direction that erodes trust — they clear the filters,
 * see fewer rows than the number promised, and have nothing on screen explaining
 * the difference. `hiddenBySuppression` is the separate second line that closes
 * that gap instead of hiding it.
 *
 * FOR THESE TWO TABLES THE REACHABLE COUNT IS THE WHOLE COUNT. There is no
 * suppression mechanism over `artifacts` or `observations`, so
 * `hiddenBySuppression` and `suppressionRuleCount` are both 0 and the
 * hidden-by-suppression line has nothing to render. That is a real state of a
 * real table, not a placeholder for a missing feature: the entity tables that DO
 * have suppression are the deferred pass's, and the second line becomes real
 * there.
 *
 * An unrecognised table or filter column counts nothing, for the same fail-closed
 * reason {@link emptyPage} exists.
 */
export async function countInventory(
  db: Database,
  projectId: string,
  table: InventoryTable,
  filter: PageRequest["filter"],
): Promise<VisibleTotal> {
  const none: VisibleTotal = {
    visible: 0,
    hiddenBySuppression: 0,
    suppressionRuleCount: 0,
  };
  if (projectId === "") return none;

  const expectedColumn =
    table === "artifacts" ? ARTIFACT_FILTER_COLUMN : OBSERVATION_FILTER_COLUMN;
  if (filter !== null && filter.column !== expectedColumn) return none;

  let sql: string;
  if (table === "artifacts") {
    sql = filter === null ? COUNT_ARTIFACTS_ALL : COUNT_ARTIFACTS_BY_KIND;
  } else if (table === "observations") {
    sql =
      filter === null
        ? COUNT_OBSERVATIONS_ALL
        : COUNT_OBSERVATIONS_BY_CONTENT_TYPE;
  } else {
    return none;
  }

  const stmt = await db.prepare(sql);
  const row =
    filter === null
      ? await stmt.get<CountRow>(projectId)
      : await stmt.get<CountRow>(projectId, filter.value);

  return {
    visible: row === undefined ? 0 : Number(row.n),
    hiddenBySuppression: 0,
    suppressionRuleCount: 0,
  };
}
