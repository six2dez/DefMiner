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
  ScanState,
  VisibleTotal,
} from "@defminer/engine/contract";
import { DEGRADED_ANALYSIS_FILTER } from "@defminer/engine/contract";
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

/**
 * The analysis-state filter column on `artifacts`.
 *
 * NOT A COLUMN OF `artifacts`. It is the state of the artifact's newest
 * analysis, carried into every artifact statement by a correlated scalar
 * subquery on the `analyses` primary key — see the statement matrix's header.
 * A filter over it is applied on the OUTER arm of the same bounded candidate
 * window every other filter uses, so it costs what the other filters cost and
 * needs no index of its own (which is why migration step v4's stated decision
 * not to add filter-leading indexes still holds).
 */
export const ARTIFACT_SCAN_STATE_FILTER_COLUMN = "scan_state";

/**
 * Every filterable column on `artifacts`, in one list.
 *
 * THREE COLUMNS, THREE STATEMENTS PER SLOT — LINEAR, NOT EXPONENTIAL. That is
 * the property {@link ARTIFACT_FILTER_COLUMN}'s note is about and it is the
 * reason a second simultaneous filter is a type-level impossibility rather
 * than a convention: `k` filter columns cost `k + 1` literals per slot, and
 * `k` filter COMBINATIONS would cost `2^k`.
 *
 * The third member is {@link DEGRADED_ANALYSIS_FILTER}'s column and it exists
 * because a degraded analysis is TWO states — `partial` and `failed` — which
 * one bound equality cannot express. It gets its own complete literal rather
 * than a conditional predicate inside the scan-state one: a predicate that
 * branches on a bound value is the null-guard shape `05-RESEARCH § O-01`
 * disqualified by measurement (2,000,025 VM steps to return an EMPTY page over
 * a 200,000-row partition, against 24 on a leading index).
 */
export const ARTIFACT_FILTER_COLUMNS: readonly string[] = [
  ARTIFACT_FILTER_COLUMN,
  ARTIFACT_SCAN_STATE_FILTER_COLUMN,
  DEGRADED_ANALYSIS_FILTER.column,
];

/** The single filterable column on `observations`. See
 *  {@link ARTIFACT_FILTER_COLUMN}. */
export const OBSERVATION_FILTER_COLUMN = "content_type";

/** Every filterable column on `observations`. One, today: there is no analysis
 *  state to filter an observation by — an observation is a SIGHTING of an
 *  artifact, and the artifact is where the analysis lives. */
export const OBSERVATION_FILTER_COLUMNS: readonly string[] = [
  OBSERVATION_FILTER_COLUMN,
];

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
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
       (SELECT an.scan_state FROM analyses an
        WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
        ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
FROM artifacts
WHERE project_id = ?
ORDER BY last_seen_at DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_NEXT = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
       (SELECT an.scan_state FROM analyses an
        WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
        ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
FROM artifacts
WHERE project_id = ? AND (last_seen_at, sha256) < (?, ?)
ORDER BY last_seen_at DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_FIRST_FILTERED_BY_KIND = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY last_seen_at DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.last_seen_at DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_FIRST_FILTERED_BY_SCAN_STATE = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY last_seen_at DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.scan_state = ?
ORDER BY e.last_seen_at DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_FIRST_FILTERED_BY_DEGRADED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY last_seen_at DESC, sha256 DESC
  LIMIT ?
) e
WHERE CASE WHEN e.scan_state IN ('partial', 'failed') THEN 'yes' ELSE 'no' END = ?
ORDER BY e.last_seen_at DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_NEXT_FILTERED_BY_KIND = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (last_seen_at, sha256) < (?, ?)
  ORDER BY last_seen_at DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.last_seen_at DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_NEXT_FILTERED_BY_SCAN_STATE = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (last_seen_at, sha256) < (?, ?)
  ORDER BY last_seen_at DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.scan_state = ?
ORDER BY e.last_seen_at DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_DESC_NEXT_FILTERED_BY_DEGRADED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (last_seen_at, sha256) < (?, ?)
  ORDER BY last_seen_at DESC, sha256 DESC
  LIMIT ?
) e
WHERE CASE WHEN e.scan_state IN ('partial', 'failed') THEN 'yes' ELSE 'no' END = ?
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
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
       (SELECT an.scan_state FROM analyses an
        WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
        ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
FROM artifacts
WHERE project_id = ?
ORDER BY last_seen_at ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_NEXT = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
       (SELECT an.scan_state FROM analyses an
        WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
        ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
FROM artifacts
WHERE project_id = ? AND (last_seen_at, sha256) > (?, ?)
ORDER BY last_seen_at ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_FIRST_FILTERED_BY_KIND = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY last_seen_at ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.last_seen_at ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_FIRST_FILTERED_BY_SCAN_STATE = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY last_seen_at ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.scan_state = ?
ORDER BY e.last_seen_at ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_FIRST_FILTERED_BY_DEGRADED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY last_seen_at ASC, sha256 ASC
  LIMIT ?
) e
WHERE CASE WHEN e.scan_state IN ('partial', 'failed') THEN 'yes' ELSE 'no' END = ?
ORDER BY e.last_seen_at ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_NEXT_FILTERED_BY_KIND = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (last_seen_at, sha256) > (?, ?)
  ORDER BY last_seen_at ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.last_seen_at ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_NEXT_FILTERED_BY_SCAN_STATE = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (last_seen_at, sha256) > (?, ?)
  ORDER BY last_seen_at ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.scan_state = ?
ORDER BY e.last_seen_at ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_LAST_SEEN_ASC_NEXT_FILTERED_BY_DEGRADED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (last_seen_at, sha256) > (?, ?)
  ORDER BY last_seen_at ASC, sha256 ASC
  LIMIT ?
) e
WHERE CASE WHEN e.scan_state IN ('partial', 'failed') THEN 'yes' ELSE 'no' END = ?
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
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
       (SELECT an.scan_state FROM analyses an
        WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
        ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
FROM artifacts
WHERE project_id = ?
ORDER BY byte_len DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_NEXT = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
       (SELECT an.scan_state FROM analyses an
        WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
        ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
FROM artifacts
WHERE project_id = ? AND (byte_len, sha256) < (?, ?)
ORDER BY byte_len DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_FIRST_FILTERED_BY_KIND = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY byte_len DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.byte_len DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_FIRST_FILTERED_BY_SCAN_STATE = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY byte_len DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.scan_state = ?
ORDER BY e.byte_len DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_FIRST_FILTERED_BY_DEGRADED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY byte_len DESC, sha256 DESC
  LIMIT ?
) e
WHERE CASE WHEN e.scan_state IN ('partial', 'failed') THEN 'yes' ELSE 'no' END = ?
ORDER BY e.byte_len DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_NEXT_FILTERED_BY_KIND = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (byte_len, sha256) < (?, ?)
  ORDER BY byte_len DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.byte_len DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_NEXT_FILTERED_BY_SCAN_STATE = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (byte_len, sha256) < (?, ?)
  ORDER BY byte_len DESC, sha256 DESC
  LIMIT ?
) e
WHERE e.scan_state = ?
ORDER BY e.byte_len DESC, e.sha256 DESC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_DESC_NEXT_FILTERED_BY_DEGRADED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (byte_len, sha256) < (?, ?)
  ORDER BY byte_len DESC, sha256 DESC
  LIMIT ?
) e
WHERE CASE WHEN e.scan_state IN ('partial', 'failed') THEN 'yes' ELSE 'no' END = ?
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
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
       (SELECT an.scan_state FROM analyses an
        WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
        ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
FROM artifacts
WHERE project_id = ?
ORDER BY byte_len ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_NEXT = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
       (SELECT an.scan_state FROM analyses an
        WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
        ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
FROM artifacts
WHERE project_id = ? AND (byte_len, sha256) > (?, ?)
ORDER BY byte_len ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_FIRST_FILTERED_BY_KIND = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY byte_len ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.byte_len ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_FIRST_FILTERED_BY_SCAN_STATE = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY byte_len ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.scan_state = ?
ORDER BY e.byte_len ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_FIRST_FILTERED_BY_DEGRADED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ?
  ORDER BY byte_len ASC, sha256 ASC
  LIMIT ?
) e
WHERE CASE WHEN e.scan_state IN ('partial', 'failed') THEN 'yes' ELSE 'no' END = ?
ORDER BY e.byte_len ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_NEXT_FILTERED_BY_KIND = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (byte_len, sha256) > (?, ?)
  ORDER BY byte_len ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.kind = ?
ORDER BY e.byte_len ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_NEXT_FILTERED_BY_SCAN_STATE = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (byte_len, sha256) > (?, ?)
  ORDER BY byte_len ASC, sha256 ASC
  LIMIT ?
) e
WHERE e.scan_state = ?
ORDER BY e.byte_len ASC, e.sha256 ASC
LIMIT ?
`;

const ARTIFACTS_BYTE_LEN_ASC_NEXT_FILTERED_BY_DEGRADED = `
SELECT e.project_id, e.sha256, e.byte_len, e.kind, e.first_seen_at, e.last_seen_at, e.seen_count, e.scan_state
FROM (
  SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count,
         (SELECT an.scan_state FROM analyses an
          WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
          ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) AS scan_state
  FROM artifacts
  WHERE project_id = ? AND (byte_len, sha256) > (?, ?)
  ORDER BY byte_len ASC, sha256 ASC
  LIMIT ?
) e
WHERE CASE WHEN e.scan_state IN ('partial', 'failed') THEN 'yes' ELSE 'no' END = ?
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

/** The statements one (sort key, direction, cursor presence) slot needs. */
type SlotStatements = {
  /** The unfiltered page. Its own `LIMIT` is the page size. */
  readonly page: string;
  /**
   * The filtered pages, ONE COMPLETE LITERAL PER FILTER COLUMN, keyed by that
   * column's DefMiner-authored identifier.
   *
   * A RECORD RATHER THAN A SINGLE STATEMENT, and the record is what keeps the
   * matrix linear: adding a filter column adds one literal per slot, never a
   * literal per combination. The key is the same identifier `PageRequest`
   * carries, so the lookup IS the validation — a request naming a column with
   * no literal behind it reads an empty exhausted page rather than falling
   * back to a wider one.
   */
  readonly filtered: Readonly<Record<string, string>>;
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
    for (const slot of [dir.first, dir.next]) {
      // The per-filter-column record is a LEVEL OF ITS OWN and is frozen here
      // rather than left as the one writable leaf. It holds the statements a
      // request actually reaches, which makes it the single most valuable
      // thing on this object to be able to reassign.
      Object.freeze(slot.filtered);
      Object.freeze(slot);
    }
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
          filtered: {
            [ARTIFACT_FILTER_COLUMN]:
              ARTIFACTS_LAST_SEEN_DESC_FIRST_FILTERED_BY_KIND,
            [ARTIFACT_SCAN_STATE_FILTER_COLUMN]:
              ARTIFACTS_LAST_SEEN_DESC_FIRST_FILTERED_BY_SCAN_STATE,
            [DEGRADED_ANALYSIS_FILTER.column]:
              ARTIFACTS_LAST_SEEN_DESC_FIRST_FILTERED_BY_DEGRADED,
          },
          window: ARTIFACTS_LAST_SEEN_DESC_FIRST_WINDOW,
        },
        next: {
          page: ARTIFACTS_LAST_SEEN_DESC_NEXT,
          filtered: {
            [ARTIFACT_FILTER_COLUMN]:
              ARTIFACTS_LAST_SEEN_DESC_NEXT_FILTERED_BY_KIND,
            [ARTIFACT_SCAN_STATE_FILTER_COLUMN]:
              ARTIFACTS_LAST_SEEN_DESC_NEXT_FILTERED_BY_SCAN_STATE,
            [DEGRADED_ANALYSIS_FILTER.column]:
              ARTIFACTS_LAST_SEEN_DESC_NEXT_FILTERED_BY_DEGRADED,
          },
          window: ARTIFACTS_LAST_SEEN_DESC_NEXT_WINDOW,
        },
      },
      asc: {
        first: {
          page: ARTIFACTS_LAST_SEEN_ASC_FIRST,
          filtered: {
            [ARTIFACT_FILTER_COLUMN]:
              ARTIFACTS_LAST_SEEN_ASC_FIRST_FILTERED_BY_KIND,
            [ARTIFACT_SCAN_STATE_FILTER_COLUMN]:
              ARTIFACTS_LAST_SEEN_ASC_FIRST_FILTERED_BY_SCAN_STATE,
            [DEGRADED_ANALYSIS_FILTER.column]:
              ARTIFACTS_LAST_SEEN_ASC_FIRST_FILTERED_BY_DEGRADED,
          },
          window: ARTIFACTS_LAST_SEEN_ASC_FIRST_WINDOW,
        },
        next: {
          page: ARTIFACTS_LAST_SEEN_ASC_NEXT,
          filtered: {
            [ARTIFACT_FILTER_COLUMN]:
              ARTIFACTS_LAST_SEEN_ASC_NEXT_FILTERED_BY_KIND,
            [ARTIFACT_SCAN_STATE_FILTER_COLUMN]:
              ARTIFACTS_LAST_SEEN_ASC_NEXT_FILTERED_BY_SCAN_STATE,
            [DEGRADED_ANALYSIS_FILTER.column]:
              ARTIFACTS_LAST_SEEN_ASC_NEXT_FILTERED_BY_DEGRADED,
          },
          window: ARTIFACTS_LAST_SEEN_ASC_NEXT_WINDOW,
        },
      },
    }),
    byte_len: freezeDirections({
      desc: {
        first: {
          page: ARTIFACTS_BYTE_LEN_DESC_FIRST,
          filtered: {
            [ARTIFACT_FILTER_COLUMN]:
              ARTIFACTS_BYTE_LEN_DESC_FIRST_FILTERED_BY_KIND,
            [ARTIFACT_SCAN_STATE_FILTER_COLUMN]:
              ARTIFACTS_BYTE_LEN_DESC_FIRST_FILTERED_BY_SCAN_STATE,
            [DEGRADED_ANALYSIS_FILTER.column]:
              ARTIFACTS_BYTE_LEN_DESC_FIRST_FILTERED_BY_DEGRADED,
          },
          window: ARTIFACTS_BYTE_LEN_DESC_FIRST_WINDOW,
        },
        next: {
          page: ARTIFACTS_BYTE_LEN_DESC_NEXT,
          filtered: {
            [ARTIFACT_FILTER_COLUMN]:
              ARTIFACTS_BYTE_LEN_DESC_NEXT_FILTERED_BY_KIND,
            [ARTIFACT_SCAN_STATE_FILTER_COLUMN]:
              ARTIFACTS_BYTE_LEN_DESC_NEXT_FILTERED_BY_SCAN_STATE,
            [DEGRADED_ANALYSIS_FILTER.column]:
              ARTIFACTS_BYTE_LEN_DESC_NEXT_FILTERED_BY_DEGRADED,
          },
          window: ARTIFACTS_BYTE_LEN_DESC_NEXT_WINDOW,
        },
      },
      asc: {
        first: {
          page: ARTIFACTS_BYTE_LEN_ASC_FIRST,
          filtered: {
            [ARTIFACT_FILTER_COLUMN]:
              ARTIFACTS_BYTE_LEN_ASC_FIRST_FILTERED_BY_KIND,
            [ARTIFACT_SCAN_STATE_FILTER_COLUMN]:
              ARTIFACTS_BYTE_LEN_ASC_FIRST_FILTERED_BY_SCAN_STATE,
            [DEGRADED_ANALYSIS_FILTER.column]:
              ARTIFACTS_BYTE_LEN_ASC_FIRST_FILTERED_BY_DEGRADED,
          },
          window: ARTIFACTS_BYTE_LEN_ASC_FIRST_WINDOW,
        },
        next: {
          page: ARTIFACTS_BYTE_LEN_ASC_NEXT,
          filtered: {
            [ARTIFACT_FILTER_COLUMN]:
              ARTIFACTS_BYTE_LEN_ASC_NEXT_FILTERED_BY_KIND,
            [ARTIFACT_SCAN_STATE_FILTER_COLUMN]:
              ARTIFACTS_BYTE_LEN_ASC_NEXT_FILTERED_BY_SCAN_STATE,
            [DEGRADED_ANALYSIS_FILTER.column]:
              ARTIFACTS_BYTE_LEN_ASC_NEXT_FILTERED_BY_DEGRADED,
          },
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
          filtered: {
            [OBSERVATION_FILTER_COLUMN]:
              OBSERVATIONS_OBSERVED_AT_DESC_FIRST_FILTERED,
          },
          window: OBSERVATIONS_OBSERVED_AT_DESC_FIRST_WINDOW,
        },
        next: {
          page: OBSERVATIONS_OBSERVED_AT_DESC_NEXT,
          filtered: {
            [OBSERVATION_FILTER_COLUMN]:
              OBSERVATIONS_OBSERVED_AT_DESC_NEXT_FILTERED,
          },
          window: OBSERVATIONS_OBSERVED_AT_DESC_NEXT_WINDOW,
        },
      },
      asc: {
        first: {
          page: OBSERVATIONS_OBSERVED_AT_ASC_FIRST,
          filtered: {
            [OBSERVATION_FILTER_COLUMN]:
              OBSERVATIONS_OBSERVED_AT_ASC_FIRST_FILTERED,
          },
          window: OBSERVATIONS_OBSERVED_AT_ASC_FIRST_WINDOW,
        },
        next: {
          page: OBSERVATIONS_OBSERVED_AT_ASC_NEXT,
          filtered: {
            [OBSERVATION_FILTER_COLUMN]:
              OBSERVATIONS_OBSERVED_AT_ASC_NEXT_FILTERED,
          },
          window: OBSERVATIONS_OBSERVED_AT_ASC_NEXT_WINDOW,
        },
      },
    }),
    status: freezeDirections({
      desc: {
        first: {
          page: OBSERVATIONS_STATUS_DESC_FIRST,
          filtered: {
            [OBSERVATION_FILTER_COLUMN]:
              OBSERVATIONS_STATUS_DESC_FIRST_FILTERED,
          },
          window: OBSERVATIONS_STATUS_DESC_FIRST_WINDOW,
        },
        next: {
          page: OBSERVATIONS_STATUS_DESC_NEXT,
          filtered: {
            [OBSERVATION_FILTER_COLUMN]: OBSERVATIONS_STATUS_DESC_NEXT_FILTERED,
          },
          window: OBSERVATIONS_STATUS_DESC_NEXT_WINDOW,
        },
      },
      asc: {
        first: {
          page: OBSERVATIONS_STATUS_ASC_FIRST,
          filtered: {
            [OBSERVATION_FILTER_COLUMN]: OBSERVATIONS_STATUS_ASC_FIRST_FILTERED,
          },
          window: OBSERVATIONS_STATUS_ASC_FIRST_WINDOW,
        },
        next: {
          page: OBSERVATIONS_STATUS_ASC_NEXT,
          filtered: {
            [OBSERVATION_FILTER_COLUMN]: OBSERVATIONS_STATUS_ASC_NEXT_FILTERED,
          },
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

// THE SAME PREDICATE THE PAGE USES, NOT A CHEAPER ONE OVER `analyses`.
//
// `idx_analyses_state (project_id, scan_state, started_at)` would answer
// "how many analyses are failed" as an index seek, which is far cheaper — and
// a different question. The page selects each ARTIFACT's NEWEST analysis and
// filters on that; a count over `analyses` would count every analysis at every
// corpus version, and the two would disagree by exactly the rows a corpus bump
// produced. A total the operator can see is wrong by counting the rows on
// screen is worse than a slow one (P5-D45's argument, applied one level down).
//
// So this is a correlated seek per candidate row on top of the O(partition)
// cost P5-D40 already accepted for a filtered count. It is called once per
// filter change, never once per page. If it becomes the thing that stalls the
// thread the fix is a materialised state column on `artifacts`, not a
// truncated total.
const COUNT_ARTIFACTS_BY_SCAN_STATE = `
SELECT COUNT(*) AS n
FROM artifacts
WHERE project_id = ?
  AND (SELECT an.scan_state FROM analyses an
       WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
       ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1) = ?
`;

const COUNT_ARTIFACTS_BY_DEGRADED = `
SELECT COUNT(*) AS n
FROM artifacts
WHERE project_id = ?
  AND CASE WHEN (SELECT an.scan_state FROM analyses an
                 WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256
                 ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1)
                IN ('partial', 'failed') THEN 'yes' ELSE 'no' END = ?
`;

/**
 * The count statement for one `artifacts` filter column, by the same lookup
 * rule the page statements use: no statement means no read.
 */
const ARTIFACT_COUNTS: Readonly<Record<string, string>> = Object.freeze({
  [ARTIFACT_FILTER_COLUMN]: COUNT_ARTIFACTS_BY_KIND,
  [ARTIFACT_SCAN_STATE_FILTER_COLUMN]: COUNT_ARTIFACTS_BY_SCAN_STATE,
  [DEGRADED_ANALYSIS_FILTER.column]: COUNT_ARTIFACTS_BY_DEGRADED,
});

const COUNT_OBSERVATIONS_ALL = `SELECT COUNT(*) AS n FROM observations WHERE project_id = ?`;

const COUNT_OBSERVATIONS_BY_CONTENT_TYPE = `SELECT COUNT(*) AS n FROM observations WHERE project_id = ? AND content_type = ?`;

/** As {@link ARTIFACT_COUNTS}. One entry, because `observations` has one
 *  filter column. */
const OBSERVATION_COUNTS: Readonly<Record<string, string>> = Object.freeze({
  [OBSERVATION_FILTER_COLUMN]: COUNT_OBSERVATIONS_BY_CONTENT_TYPE,
});

// ---------------------------------------------------------------------------
// THE READS
// ---------------------------------------------------------------------------

/**
 * One artifact row AS THE WORKSPACE PAGES IT.
 *
 * `ArtifactRow` plus the state of the artifact's newest analysis. Declared
 * here rather than added to `artifacts.ts`'s row type on purpose: `scan_state`
 * is NOT a column of `artifacts` and never becomes one by being read beside
 * it. The shipped `listArtifacts` still answers the shipped shape, byte for
 * byte, and `artifacts.ts` is untouched.
 *
 * `scan_state` IS `null` FOR AN ARTIFACT THAT HAS NEVER BEEN ANALYSED, and
 * that is a real state rather than a missing value: a sighting writes an
 * artifact row before any analysis is claimed. The frontend reads `null` as
 * UNKNOWN and renders nothing (P5-D66) — never as "Complete", which is the
 * silence UI-09 forbids.
 */
export type ArtifactPageRow = ArtifactRow & {
  scan_state: ScanState | null;
};

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

  // THE LOOKUP IS THE VALIDATION. There is one complete literal per filter
  // column and a request naming a column with no literal behind it reads
  // nothing — the same fail-closed rule an unrecognised sort key gets, and for
  // the same reason: ignoring an unrecognised filter would return MORE rows
  // than the caller narrowed to, which is the opposite of what a filter is for
  // (P5-D39). `hasOwnProperty` rather than a truthiness check, so an inherited
  // property name cannot resolve to a statement this file did not write.
  const filteredSql = Object.prototype.hasOwnProperty.call(
    slot.filtered,
    req.filter.column,
  )
    ? slot.filtered[req.filter.column]
    : undefined;
  if (filteredSql === undefined) return emptyPage<TRow>();

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

  const pageStmt = await db.prepare(filteredSql);
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
): Promise<PageResponse<ArtifactPageRow>> {
  return readPage<ArtifactPageRow>(
    db,
    ARTIFACT_READS,
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

  let unfiltered: string;
  let byColumn: Readonly<Record<string, string>>;
  if (table === "artifacts") {
    unfiltered = COUNT_ARTIFACTS_ALL;
    byColumn = ARTIFACT_COUNTS;
  } else if (table === "observations") {
    unfiltered = COUNT_OBSERVATIONS_ALL;
    byColumn = OBSERVATION_COUNTS;
  } else {
    return none;
  }

  // The SAME lookup-is-the-validation rule the page reads use, over the same
  // column identifiers, so the count and the page it belongs under cannot
  // disagree about which filters exist.
  let sql: string;
  if (filter === null) {
    sql = unfiltered;
  } else {
    const found = Object.prototype.hasOwnProperty.call(byColumn, filter.column)
      ? byColumn[filter.column]
      : undefined;
    if (found === undefined) return none;
    sql = found;
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

// ---------------------------------------------------------------------------
// PHASE 7 — THE RECOVERED-SOURCE READ THE DRILL-DOWN CONSUMES (MAP-06, MAP-07)
// ---------------------------------------------------------------------------
//
// NOT ADDED TO THE STATEMENT MATRIX ABOVE, AND THE REASON IS THE READ'S OWN
// CONTRACT RATHER THAN CONVENIENCE. That matrix exists because `artifacts` and
// `observations` are SORTABLE and FILTERABLE: it enumerates one complete literal
// per (sort key x direction x cursor position x filter column) so a request can
// never reach a statement this file did not write. This read has none of those
// axes. `07-UI-SPEC.md § "The source list read"` fixes the order as the map's own
// `sources` declaration order — WHICH IS THE EVIDENCE — so the list is not
// sortable, will not become sortable, and offers no filter. Two literals is the
// complete matrix, and adding four unreachable slots to make it look like its
// neighbours would be enumerating axes the contract forbids.
//
// WHAT IS COPIED IS THE PART THAT IS EASY TO GET WRONG: keyset and never OFFSET,
// the deterministic tie-break, the shared `KEYSET_PAGE_ROWS` re-read rather than
// restated, and the cursor-advance rule — a short page IS the end here, because
// with no filter every row the statement scans is a row it returns.

/**
 * One recovered source, as the drill-down reads it.
 *
 * CARRIES NO CONTENT, WHICH IS WHAT MAKES THE EAGER LOAD AFFORDABLE. Under D-07
 * the bytes are never stored, so a row is a label, two digests, three integers
 * and a vocabulary word — small enough that `07-UI-SPEC.md`'s policy of drawing
 * pages eagerly to a 2,000-row bound costs a bounded amount of metadata rather
 * than an unbounded amount of source code.
 *
 * `source_sha256` and `sources_verbatim` are NULLABLE and the two nulls mean
 * different things (07-RESEARCH.md § Pitfall 3): no content was shipped for that
 * index, and the map declared the label as null. Neither is collapsed here.
 *
 * @internal
 */
export type RecoveredSourceRow = {
  source_sha256: string | null;
  sources_verbatim: string | null;
  source_index: number;
  map_sha256: string;
  byte_len: number | null;
  line_count: number | null;
  producibility: string;
  recovered_at: number;
};

// A LEFT JOIN, NOT AN INNER ONE. A sighting whose index carried no content has
// no `sources` row to join to, and an inner join would silently drop exactly the
// rows the tombstone path exists to render — the failure mode would be an
// operator seeing a shorter list than the map declared with nothing saying so.
// `byte_len` and `line_count` come back NULL for those rows, which is a
// different fact from zero and is typed as such above.
//
// ORDER BY source_index ASC, TIE-BROKEN ON map_sha256 ASC. The index is the
// map's own declaration order and is the evidence. The tie-break is needed
// because one artifact can carry MORE THAN ONE map — a bundle plus its vendor
// chunk — and `source_index` is only unique within a map; without it two rows at
// the same index would order arbitrarily and the keyset cursor would skip or
// repeat across a page boundary. `idx_source_sightings_artifact` is
// `(project_id, artifact_sha256, source_index)`, which matches this scope and
// this leading sort column exactly.
const RECOVERED_SOURCES_FIRST = `
SELECT sg.source_sha256, sg.sources_verbatim, sg.source_index, sg.map_sha256,
       s.byte_len, s.line_count, sg.producibility, sg.recovered_at
FROM source_sightings sg
LEFT JOIN sources s
  ON s.project_id = sg.project_id AND s.source_sha256 = sg.source_sha256
WHERE sg.project_id = ? AND sg.artifact_sha256 = ?
ORDER BY sg.source_index ASC, sg.map_sha256 ASC
LIMIT ?
`;

// THE KEYSET, NEVER `OFFSET`. The half-open comparison is the standard
// lexicographic form: strictly past the cursor's index, or at the same index and
// strictly past its tie-break. `OFFSET` would re-scan every row already served,
// and — worse for a list that is being written to while it is read — it would
// shift under a concurrent insert and hand the operator a duplicate or a hole.
const RECOVERED_SOURCES_NEXT = `
SELECT sg.source_sha256, sg.sources_verbatim, sg.source_index, sg.map_sha256,
       s.byte_len, s.line_count, sg.producibility, sg.recovered_at
FROM source_sightings sg
LEFT JOIN sources s
  ON s.project_id = sg.project_id AND s.source_sha256 = sg.source_sha256
WHERE sg.project_id = ? AND sg.artifact_sha256 = ?
  AND (sg.source_index > ? OR (sg.source_index = ? AND sg.map_sha256 > ?))
ORDER BY sg.source_index ASC, sg.map_sha256 ASC
LIMIT ?
`;

// ZERO AND UNKNOWN ARE DIFFERENT ROWS, WHICH IS WHY THIS DOES NOT GROUP OVER
// `source_sightings`. The obvious statement — `SELECT artifact_sha256, COUNT(*)
// ... GROUP BY artifact_sha256` — can only ever emit artifacts that HAVE
// sightings, so the resolved zero it is supposed to carry is exactly the row it
// cannot produce. It would have looked correct, returned plausible numbers, and
// silently collapsed "DefMiner looked and found none" into "DefMiner has not
// looked".
//
// So the statement is driven from `artifacts` and admits a row on either of two
// grounds, each an EXISTS scoped by `project_id`: the artifact has sightings (we
// know the count), or it has a FINISHED analysis (we know the count is zero).
// `done` and not the other terminal states, bound rather than written in:
// `partial` and `failed` mean the walk stopped early, so the honest answer for
// an artifact with neither sightings nor a completed analysis is UNKNOWN — no
// entry — rather than a zero the operator would read as a finding about the
// bundle.
const COUNT_RECOVERED_SOURCES_BY_ARTIFACT = `
SELECT ar.sha256 AS artifact_sha256,
       (SELECT COUNT(*) FROM source_sightings sg
        WHERE sg.project_id = ar.project_id AND sg.artifact_sha256 = ar.sha256) AS n
FROM artifacts ar
WHERE ar.project_id = ?
  AND (EXISTS (SELECT 1 FROM source_sightings sx
               WHERE sx.project_id = ar.project_id AND sx.artifact_sha256 = ar.sha256)
       OR EXISTS (SELECT 1 FROM analyses an
                  WHERE an.project_id = ar.project_id AND an.sha256 = ar.sha256
                    AND an.scan_state = ?))
`;

/** The analysis state that makes a zero RESOLVED rather than unknown. Read from
 *  the shipped vocabulary, never spelled out at the bind site. */
const RESOLVED_ANALYSIS_STATE: ScanState = "done";

/**
 * One keyset page of an artifact's recovered sources, in the map's own order.
 *
 * SCOPED TO THE PARENT ARTIFACT, because that is what the drill-down is: the
 * operator opened one bundle and is looking at what came out of it.
 *
 * NEVER SORTED BY LABEL, AND NOT SORTABLE. `source_index` is the position the map
 * itself declared, so the order carries information — it is the evidence, not a
 * presentation choice — and a sortable column here would let the operator destroy
 * that information with one click and no way back. `07-UI-SPEC.md` fixes this.
 *
 * Does NOT try/catch, following this module's split: writes report their own
 * outcome and list reads do not.
 */
export async function listRecoveredSourcesPage(
  db: Database,
  projectId: string,
  artifactSha256: string,
  cursor: PageCursor | null,
  limit: number,
): Promise<PageResponse<RecoveredSourceRow>> {
  if (projectId === "") return emptyPage<RecoveredSourceRow>();

  // RE-READ, NEVER RESTATED. `clampLimit` holds the page size at
  // `KEYSET_PAGE_ROWS`, which the frontend's virtual scroller is sized against;
  // a second literal at this call site is how the two come to disagree.
  const bounded = clampLimit(limit);

  const stmt = await db.prepare(
    cursor === null ? RECOVERED_SOURCES_FIRST : RECOVERED_SOURCES_NEXT,
  );
  const rows =
    cursor === null
      ? await stmt.all<RecoveredSourceRow>(projectId, artifactSha256, bounded)
      : await stmt.all<RecoveredSourceRow>(
          projectId,
          artifactSha256,
          // SPREAD, never one array. `source_index` is bound TWICE because the
          // half-open comparison names it twice and this driver has no named
          // parameters to reuse it with.
          cursor.sortValue,
          cursor.sortValue,
          cursor.tieBreak,
          bounded,
        );

  const last = rows[rows.length - 1];
  // NO CANDIDATE WINDOW, so a short page is genuinely the end. The
  // filtered-read distinction between "the window ran out" and "the data ran
  // out" does not arise here, because there is no filter that could have
  // excluded a scanned row.
  const exhausted = rows.length < bounded;
  return {
    rows,
    nextCursor:
      exhausted || last === undefined
        ? null
        : cursorOf(last.source_index, last.map_sha256),
    scanned: rows.length,
    exhausted,
  };
}

/**
 * How many recovered sources each artifact in this project has.
 *
 * ITS OWN STATEMENT, DELIBERATELY, AND THE REASON IS THE PRECEDENT RATHER THAN A
 * PREFERENCE. `reads.ts`'s paged statements each select a FIXED column set, and
 * joining a source count into them would mean editing that literal statement
 * matrix — every sort key, every direction, every cursor position, every filter
 * column — to add a column only one caller wants. `ArtifactsTable.vue` already
 * met this exact situation and resolved it the same way: the shipped `analyses`
 * prop is an optional lookup map built by its own read, not a column welded onto
 * the page statement.
 *
 * THE MAP DISTINGUISHES ZERO FROM UNKNOWN, WHICH IS THE WHOLE POINT OF RETURNING
 * A MAP RATHER THAN A NUMBER. An artifact whose map parsed and yielded nothing
 * gets an entry with value 0 — a RESOLVED zero, meaning DefMiner looked and
 * there was nothing. An artifact never analysed has NO ENTRY at all, meaning
 * DefMiner has not looked. Collapsing the second into the first would tell the
 * operator "no sources here" about a bundle nothing has read yet, which is the
 * "nothing found versus analysis broke" confusion in its most expensive form.
 *
 * @internal
 */
export async function countRecoveredSourcesByArtifact(
  db: Database,
  projectId: string,
): Promise<ReadonlyMap<string, number>> {
  const out = new Map<string, number>();
  if (projectId === "") return out;
  const stmt = await db.prepare(COUNT_RECOVERED_SOURCES_BY_ARTIFACT);
  const rows = await stmt.all<{ artifact_sha256: string; n: number }>(
    projectId,
    RESOLVED_ANALYSIS_STATE,
  );
  for (const row of rows) out.set(row.artifact_sha256, Number(row.n));
  return out;
}
