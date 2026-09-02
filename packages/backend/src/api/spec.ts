// packages/backend/src/api/spec.ts — the plugin package specification: the
// manifest id, the API map and the events map, declared once as types.
//
// WHY THIS FILE EXISTS. Until now the four RPC endpoints were registered against
// `sdk: any` and none of them took an argument, so nothing anywhere said what a
// caller may send or what it gets back. The first endpoint that takes a
// `PageRequest` and returns a `PageResponse` makes that untenable: a frontend
// that constructs a cursor by hand, or reads `rows` off a response that no longer
// has one, fails at runtime on a platform where `HANDLER_ERROR_SURFACED` is
// "neither" — no throw, no rejection, no log line. The type is the only place
// that failure can be made loud.
//
// USE THE PLUGIN PACKAGE SPECIFICATION HELPER, NOT THE TWO OLDER API AND EVENTS
// DEFINITION HELPERS. Both of the older ones carry
// `@deprecated Use DefinePluginPackageSpec instead.` in the pinned
// `@caido/sdk-shared@0.2.2` — grep that package for `@deprecated` and they are
// the only two hits. This is worth stating rather than leaving implicit because
// the reference community plugin `caido-community/scanner` still uses the older
// form, so the wrong shape is exactly what a reader who goes looking for prior
// art will find and copy. (The deprecated identifiers are deliberately not
// written out here: the plan's acceptance gate greps this file for them, and a
// gate that a comment can trip is a gate that gets weakened rather than obeyed.)
//
// THIS MODULE CONTAINS NO RUNTIME LOGIC beyond {@link CONTRACT_VERSION}. It is a
// type surface plus one integer.

import type { DefinePluginPackageSpec } from "@caido/sdk-shared";
import type {
  DeriveSourceResult,
  ExportFormat,
  ExportRedactionMode,
  INVALIDATION_EVENT,
  InvalidationEventPayload,
  OperatorSettingKey,
  PageCursor,
  PageRequest,
  PageResponse,
  ScanLifecycleState,
  ScanState,
  ScanStatusPayload,
  SettingScope,
  SuspendReason,
  VisibleTotal,
} from "@defminer/engine/contract";
import type { APISDK } from "caido:plugin";
import type { Database } from "sqlite";

import type { SurfaceOutcome } from "../compat";
import type { LifecycleSdk } from "../lifecycle";
import type { OperatorClauseRejection } from "../scan/filter";
import type { ScanQuery } from "../scan/producer";
import type { ArtifactRow } from "../store/artifacts";
import type { ExportChunkResult } from "../store/export";
import type { ObservationRow } from "../store/observations";
import type { ArtifactPageRow, InventoryTable } from "../store/reads";
import type {
  BoundedSettingOutcome,
  KnownSettingValue,
  StorageFootprint,
} from "../store/settings";
import type { SlimStatus } from "../telemetry";

/**
 * The RPC contract's version.
 *
 * WHAT OBLIGES A BUMP: any change to an argument type or a return type in
 * {@link Spec}'s `api` map, and any change to the payload type in its `events`
 * map. Adding a whole new endpoint does not — a frontend that does not know a
 * name simply never calls it — but changing the SHAPE of an existing one does,
 * because a stale frontend bundle will read the new shape with the old
 * expectations and get `undefined` where it expected a field. On this runtime
 * that is silent.
 *
 * WHY A VERSION ENDPOINT AT ALL, WHEN THE UPGRADE STORY IS A LATER PHASE. The
 * check is cheap and the SEAM is free right now and expensive to retrofit: once
 * a frontend ships without it there is no version to compare against, so the
 * first mismatch cannot be detected even in principle. Plan 05-08 adds the
 * frontend half; UPGRADE-01 is Phase 11.
 *
 * BUMPED TO 2 BY PLAN 05-10, and by the SHAPE rule rather than by the
 * endpoint-count one. `listArtifactsPage` now answers rows carrying the
 * artifact's analysis state, so a frontend built against version 1 would read
 * the new shape with the old expectations — and on this runtime that is
 * silent. The two endpoints added in the same plan (`retryAnalysis`,
 * `getArtifactAnalysis`) would not have obliged a bump on their own: a
 * frontend that does not know a name simply never calls it.
 *
 * BUMPED TO 3 BY PLAN 05-11, AND THIS ONE IS A DELIBERATE OVER-BUMP RATHER
 * THAN AN APPLICATION OF THE SHAPE RULE ABOVE — recorded as such, because a bump
 * whose justification is invented after the fact is how the rule stops meaning
 * anything. Strictly, `exportInventory` is a NEW NAME and adding one obliges no
 * bump: a frontend that does not know a name never calls it. It is bumped anyway
 * for a reason the rule does not cover: the export is the first endpoint whose
 * result the frontend must ASSEMBLE ACROSS SEVERAL CALLS, concatenating chunk
 * bytes in order and closing a document it did not open, and a bundle pairing
 * that loop with a backend it was not built against would produce a FILE — on
 * the operator's own disk, outliving the session, with nothing on its face
 * saying which version wrote it. The cost of the bump is one forced reload; the
 * cost of the other choice is a file somebody trusts.
 *
 * BUMPED TO 4 BY PLAN 05-12, AND THIS ONE IS AN OVER-BUMP TOO — recorded as
 * one, for the reason the last one gives: a bump whose justification is invented
 * after the fact is how the rule stops meaning anything. Strictly, `listSettings`,
 * `writeSetting` and `getHealth` are three NEW NAMES and adding a name obliges no
 * bump. It is bumped anyway because `writeSetting` is the first endpoint whose
 * effect is a PERSISTENT CONFIGURATION CHANGE GOVERNING A DESTRUCTIVE SWEEP: a
 * stale bundle reading {@link Spec}'s outcome shape with the old expectations
 * would read `undefined` where the rejection reason is and report "saved" for a
 * retention bound that was refused. The operator would then believe a bound is in
 * force that is not — about the one mechanism in this plugin that deletes their
 * history. The cost of the bump is one forced reload.
 *
 * BUMPED TO 5 BY PLAN 06-01, AND THIS ONE IS NOT AN OVER-BUMP. `startScan` and
 * `getScanStatus` are two new names, which under the shape rule would oblige no
 * bump at all — but `getScanStatus` returns `ScanStatusPayload | null`, and the
 * two halves of that union mean OPPOSITE things on the surface that reads it:
 * `null` puts the start form on screen, a payload puts the live counter strip
 * there. A stale bundle reading a shape it does not know would render one for
 * the other, and the specific failure is the one 06-UI-SPEC.md spends a section
 * refusing — a counter strip full of zeroes shown to an operator who has never
 * started a scan, which reads as "DefMiner scanned and found nothing". The
 * payload also carries `heldAtWatermark`, whose absence in an older reading
 * collapses a healthy backpressure hold into the stall marker.
 *
 * NOT BUMPED BY PLAN 06-05, AND THAT IS AN APPLICATION OF THE RULE RATHER THAN
 * AN EXEMPTION FROM IT. 06-05 widens `startScan`'s outcome union and adds four
 * names (`pauseScan`, `resumeScan`, `discardScan`, `listScans`). Adding a name
 * obliges no bump; widening a UNION would, against a bundle built for the
 * narrower one — but the version that carries the scan surface at all is 5, and
 * 5 was bumped by plan 06-01 IN THIS SAME PHASE. There is no shipped frontend
 * bundle anywhere that has seen version 5's narrower `startScan` and not 06-05's
 * wider one; they are two halves of one release. Bumping again here would spend
 * a forced reload on a mismatch that cannot exist, and would make the NEXT bump
 * — the one that does protect somebody — one number harder to reason about.
 *
 * NOT BUMPED BY PLAN 06-08 EITHER, AND FOR THE SAME REASON APPLIED AGAIN.
 * 06-08 adds ONE name (`getStorageFootprint`) and widens no existing union — it
 * NARROWS `writeSetting`'s `key` from `SettingKey` to `OperatorSettingKey`,
 * which removes nothing a shipped reader can currently send: the internal keys
 * that narrowing excludes did not exist before this plan. Adding a name obliges
 * no bump, and a narrowing that excludes only members introduced in the same
 * commit is not a shape change any reader can be holding.
 *
 * The rule the next author needs: bump when a SHIPPED reader could hold the old
 * shape. Within one phase's own surface, it cannot.
 *
 * BUMPED TO 6 BY PLAN 07-06, AS A DELIBERATE OVER-BUMP — recorded as one, for
 * the reason the two before it give: a bump whose justification is invented
 * after the fact is how the rule stops meaning anything. Strictly, `deriveSource`
 * is a NEW NAME and adding one obliges no bump.
 *
 * It is bumped anyway because of WHAT THE NEW SHAPE MEANS. `DeriveSourceResult`
 * is a four-armed union whose arms render MUTUALLY EXCLUSIVE surfaces that
 * 07-UI-SPEC.md forbids collapsing — content, a tombstone that is permanent, a
 * fail-closed refusal, and a call that did not answer. A bundle reading a shape
 * it does not know reads `undefined` where the discriminant is, and on this
 * runtime that is silent. The specific failure is the one the design contract
 * spends its most emphatic sentence refusing: a failed call painted as a
 * tombstone, which is a durable-looking claim made from an absence of evidence.
 * The cost of the bump is one forced reload; the cost of the other choice is an
 * operator told a source is gone for ever because a call timed out.
 *
 * Monotonically increasing. Never reused, never decremented.
 */
export const CONTRACT_VERSION = 6;

/**
 * What `getStatus` returns.
 *
 * TYPED FOR THE FIRST TIME. It was previously a `Record<string, unknown>` built
 * by spreading, which meant the frontend read every field through a cast and a
 * renamed field was a runtime `undefined` rather than a typecheck failure.
 *
 * `projectId` is `null`, never `""`. An empty string is a project id that happens
 * to be blank, which is a different claim from "there is no project selected".
 *
 * Carries NO payload of any kind (T-01-26): `counters`, `maxSliceMs` and
 * `lastError` arrive through {@link SlimStatus}, which is the projection —
 * never the live telemetry object and never a body.
 */
export type StatusPayload = SlimStatus & {
  readonly compatible: boolean;
  readonly reason: string | null;
  readonly minCaido: string;
  readonly sqliteVersion: string | null;
  readonly schemaVersion: number | null;
  readonly projectId: string | null;
  readonly queueDepth: number;
  readonly queueCap: number;
  readonly queueOverflowCount: number;
  readonly maxEventToReloadMs: number;
  readonly caidoVersion: string | null;
};

/**
 * What `getCompat` returns — COMPAT-02's in-runtime report.
 *
 * `surfaces` reuses `compat.ts`'s own `SurfaceOutcome` rather than restating its
 * five fields. A parallel shape here would be a second copy of a probe result
 * that only ever changes in one of the two places; the contract's job is to say
 * that the probe outcomes cross the boundary, not to re-describe them.
 *
 * Registered on the refusal paths as well as the success path, deliberately: a
 * build that refuses is exactly the build whose surface matrix somebody needs to
 * read, and leg C of the compatibility smoke test has no other way to see it.
 */
export type CompatPayload = {
  readonly compatible: boolean;
  readonly reason: string | null;
  readonly minCaido: string;
  readonly minSqlite: string;
  readonly caidoVersion: string | null;
  readonly sqliteVersion: string | null;
  readonly surfaces: readonly SurfaceOutcome[];
};

/** The argument the inventory count takes: which table, and the same at-most-one
 *  filter a page request carries. Reusing `PageRequest["filter"]` rather than
 *  restating it means the count and the page it belongs under cannot disagree
 *  about what a filter is.
 *
 *  Not exported, for the reason {@link Spec} is not: the registration site infers
 *  this shape from the API map rather than importing it, so an export would have
 *  no cross-module consumer and knip runs with `ignoreExportsUsedInFile: false`. */
type CountRequest = {
  readonly projectId: string;
  readonly table: InventoryTable;
  readonly filter: PageRequest["filter"];
};

/**
 * The key of one analysis, as the panel and the retry action address it.
 *
 * `projectId` is carried for the same reason `PageRequest` carries it and is
 * DISCARDED for the same reason (P5-D43): the store layer needs one in every
 * predicate; the frontend is not the authority on which project is active.
 *
 * `detectorSetHash` is part of the analysis KEY, not a column beside it — a
 * corpus bump must invalidate exactly the analyses at the old value — so a
 * retry that omitted it would be a retry aimed at every reading of these
 * bytes rather than at the one the operator is looking at.
 */
type AnalysisKey = {
  readonly projectId: string;
  readonly sha256: string;
  readonly detectorSetHash: string;
};

/** The subject the panel asks about: one artifact, in the active project. */
type ArtifactAnalysisRequest = {
  readonly projectId: string;
  readonly sha256: string;
};

/**
 * The analysis as the EVIDENCE PANEL receives it.
 *
 * A PROJECTION, NOT THE ROW. `analyses.error` is deliberately absent: it is a
 * plugin-generated diagnostic, already redacted by `describeError` before it
 * was stored, and it is still the one string on that row whose text is
 * ADJACENT to the artifact. ERR-04's copy interpolates a `{reason}` into a
 * sentence, and 05-UI-SPEC.md's rule that outranks its copy table requires
 * that reason be a DefMiner-authored code. Keeping the column on the backend
 * means the class of bytes T-05-51 is about cannot reach the panel to be
 * interpolated by a later edit — the guarantee is resolution, not discipline.
 *
 * `bytesWalked` and `byteLen` are the two numbers UI-09's degraded marker
 * renders ("Analysis stopped at {bytes_walked} of {byte_len} bytes"). Both are
 * integers the backend measured; neither is derived in the frontend.
 *
 * NOT EXPORTED, for the reason {@link Spec} is not: the registration site
 * infers this shape from the API map rather than importing it, so an export
 * would have no cross-module consumer and knip runs with
 * `ignoreExportsUsedInFile: false`.
 */
type PanelAnalysis = {
  readonly sha256: string;
  readonly detectorSetHash: string;
  readonly scanState: ScanState;
  readonly bytesWalked: number | null;
  readonly byteLen: number | null;
  readonly startedAt: number;
  readonly finishedAt: number | null;
};

/**
 * What an operator-invoked retry answers with.
 *
 * `state` IS READ BACK FROM THE ROW, never assumed from the request — this
 * driver cannot report what a write did, and the panel renders this value. A
 * state the operator is shown that was not persisted is threat T-05-55.
 *
 * NO MESSAGE FIELD, DELIBERATELY. A driver rejection is logged on the backend
 * and reported here as `ok: false` and nothing more; the panel maps that to
 * its own DefMiner-authored copy. A message crossing this boundary is a
 * sentence somebody eventually interpolates.
 */
export type RetryOutcome = {
  readonly ok: boolean;
  /** True only when the guard let the row move. */
  readonly changed: boolean;
  /** The row's state AFTER the write, or `null` when there is no such row. */
  readonly state: ScanState | null;
};

/**
 * What one export chunk asks for.
 *
 * `projectId` is carried and DISCARDED for the reason `PageRequest`'s is
 * (P5-D43): the store layer needs one in every predicate and the frontend is not
 * the authority on which project is active.
 *
 * `cursor` AND `chunkIndex` BOTH EXIST AND THEY ARE NOT REDUNDANT. The cursor is
 * how the rows are FOUND — 05-UI-SPEC.md's table contract bans `OFFSET` and
 * `reads.ts` has no offset statement to answer one with — while the index is
 * what decides two things a cursor cannot: whether this chunk carries the header
 * and the embedded floor comment, and, together with the more-chunks flag,
 * whether this is the call that writes the audit row.
 *
 * `chunkRows` is a CEILING a caller may only LOWER. It is clamped into
 * `[1, EXPORT_RPC_CHUNK_ROWS]` by the serialiser, so nothing crossing this
 * boundary can raise what crosses it.
 *
 * NOT EXPORTED, for the reason {@link Spec} is not: the registration site infers
 * this shape from the API map rather than importing it, and knip runs with
 * `ignoreExportsUsedInFile: false`.
 */
type ExportRequest = {
  readonly projectId: string;
  readonly table: InventoryTable;
  readonly format: ExportFormat;
  readonly mode: ExportRedactionMode;
  readonly filter: PageRequest["filter"];
  readonly sortKey: string;
  readonly direction: "asc" | "desc";
  readonly chunkIndex: number;
  readonly cursor: PageCursor | null;
  readonly chunkRows: number | null;
};

/**
 * The SIGHTING one derivation addresses (D-07, D-24).
 *
 * THREE FIELDS, AND THE TWO THAT ARE ABSENT ARE THE DESIGN. There is no
 * `requestId` here and no `artifactSha256`, and neither omission is an
 * oversight: the backend reads BOTH out of `source_sightings`, which is what
 * makes D-24 an integrity control instead of a tautology. A request the caller
 * named, compared against a digest the caller also named, proves nothing — it
 * would let anything holding the RPC handle be shown any stored body, presented
 * as this bundle's. `store/sources.ts`'s `readSightingOrigin` carries the full
 * argument beside the statement.
 *
 * `projectId` is carried and DISCARDED for the reason `PageRequest`'s is
 * (P5-D43): the store layer needs one in every predicate and the frontend is not
 * the authority on which project is active. That matters here for the same
 * reason it matters on the settings surface — a caller that could name the
 * project could read ANOTHER project's recovered source out of the one shared
 * SQLite file (T-07-09).
 *
 * NOT EXPORTED, for the reason {@link Spec} is not: the registration site infers
 * this shape from the API map, and knip runs with `ignoreExportsUsedInFile: false`.
 */
type SourceRef = {
  readonly projectId: string;
  readonly mapSha256: string;
  readonly sourceIndex: number;
};

/**
 * What the settings surface asks for when it lists.
 *
 * `projectId` is carried and DISCARDED for the reason `PageRequest`'s is
 * (P5-D43): the store layer needs one in every predicate and the frontend is not
 * the authority on which project is active. That matters more here than
 * anywhere else on this contract — a caller that could name the project could
 * read and write ANOTHER project's configuration out of the one shared SQLite
 * file (threat T-05-67).
 *
 * NOT EXPORTED, for the reason {@link Spec} is not: the registration site infers
 * this shape from the API map, and knip runs with `ignoreExportsUsedInFile: false`.
 */
type SettingsRequest = {
  readonly projectId: string;
};

/**
 * One settings write, at exactly one scope.
 *
 * `value` IS `string | null` AND THE `null` IS THE CLEAR. Clearing a
 * project-scoped override is a write of ABSENCE, not a write of the documented
 * default: writing the default over an override would pin the value and quietly
 * stop tracking the operator-wide default the operator meant to return to. One
 * endpoint rather than two because they are one operation on one row — "what
 * should be stored here" — and splitting them would let a caller clear at one
 * scope while believing it wrote at the other.
 *
 * `scope` IS EXPLICIT AND HAS NO DEFAULT. A missing scope defaulting to anything
 * is a project write that lands operator-wide, or the reverse, and both are
 * silent (threat T-05-67). `key` is the closed vocabulary, so an unknown key is a
 * typecheck failure at the only two call sites there are.
 *
 * NOT EXPORTED, for the reason above.
 */
type SettingWriteRequest = {
  readonly projectId: string;
  readonly scope: SettingScope;
  /** OPERATOR keys only. The closed vocabulary gained a second kind of key in
   *  plan 06-08 — internal durable state this plugin writes about its own
   *  deployment — and narrowing here means the write endpoint structurally
   *  cannot be pointed at one (T-06-41). */
  readonly key: OperatorSettingKey;
  readonly value: string | null;
};

/**
 * What `getHealth` answers with — OBS-01's four numbers, and nothing else.
 *
 * WHY THIS EXISTS BESIDE `getStatus`, WHICH ALREADY CARRIES THEM. `getStatus`
 * carries the whole {@link SlimStatus} projection: every counter, the last error
 * string, the compatibility verdict and the schema version. The health strip
 * renders four numbers and 05-UI-SPEC.md's `long-text / health-strip` row makes
 * that a PROPERTY of the surface — it carries only DefMiner-authored labels and
 * numeric counters, and no target-controlled content reaches it. A strip built
 * over `getStatus` would be one field access away from rendering `lastError`,
 * which is a plugin-generated string that quotes what the plugin was doing.
 * Resolution, not discipline: the shape that reaches the strip has no string on
 * it at all.
 *
 * NO NEW MEASUREMENT. Every number here is already measured — the queue's own
 * depth and overflow count, the consumer's drain flag, and the running maximum
 * `recordSlice` keeps. OBS-01 formally belongs to Phase 2; this exposes what
 * exists rather than instrumenting anything.
 */
export type HealthPayload = {
  /** Entries waiting in the bounded queue right now. */
  readonly queueDepth: number;
  /** Entries the queue refused because it was at cap, since boot (CORE-03). */
  readonly droppedCount: number;
  /** Artifacts the consumer is part-way through. Zero or one, by construction —
   *  QuickJS is single-threaded and CPU-bound analysis is strictly serial. */
  readonly jobsInFlight: number;
  /** The largest uninterrupted synchronous stretch observed, in float ms. THE
   *  NUMBER THAT DISTINGUISHES A BLOCKED BACKEND FROM A SLOW RENDERER. */
  readonly maxSliceMs: number;
};

/**
 * What the health endpoint answers with.
 *
 * FAIL CLOSED WITH AN EXPLICIT OUTCOME, NOT ZEROES. Four zeroes are a perfectly
 * healthy backend, and rendering them for a plugin that has no project resolved
 * would tell the operator the opposite of the truth at the exact moment they are
 * trying to diagnose why nothing is happening. `reason` is a closed
 * DefMiner-authored code the strip maps to its own copy, never a message.
 */
export type HealthOutcome =
  | { readonly outcome: "health"; readonly health: HealthPayload }
  | { readonly outcome: "unavailable"; readonly reason: "no-project" };

/**
 * What `startScan` takes.
 *
 * ONE FIELD, and it is the operator's own HTTPQL or `""`. The project is NOT
 * on this request and must not be: the backend substitutes its own
 * lifecycle-resolved project on every call for the reason `scopedTo` states —
 * trusting a caller-supplied id would let anything holding the RPC handle start
 * a scan in another project out of the one shared SQLite file (T-05-34).
 *
 * Not exported, for the reason {@link Spec} is not: the registration site
 * infers this shape from the API map rather than importing it, so an export
 * would have no cross-module consumer and knip runs with
 * `ignoreExportsUsedInFile: false`.
 */
type StartScanRequest = {
  /** The operator's clause, or `""`. D-05: they may NARROW the scan and never
   *  widen it. VALIDATED BEFORE ANYTHING IS WRITTEN, by `validateOperatorClause`
   *  — a clause that does not pass is refused with one of its closed codes and
   *  no row is created. `""` is a complete, valid input and the common one. */
  readonly operatorFilter: string;
};

/**
 * What `startScan` answers.
 *
 * Not exported, for the reason {@link Spec} and `StartScanRequest` are not:
 * the registration site infers this shape from the API map rather than
 * importing it, so an export would have no cross-module consumer and knip runs
 * with `ignoreExportsUsedInFile: false`. The FRONTEND declares its own mirror in
 * `api/client.ts`, because it cannot import this package at all.
 *
 * A DISCRIMINATED UNION AND A CLOSED REASON SET. `reason` is a
 * DefMiner-authored code the frontend maps to its own sentence — never Caido's
 * parser text and never the driver's constraint message, both of which quote
 * the values that were bound (T-06-04). A refusal is not an exception: three of
 * the four reasons below are ordinary states the surface renders in words.
 */
type StartScanOutcome =
  | { readonly outcome: "started"; readonly scanId: string }
  /** THE CLAUSE WAS TURNED AWAY AND NOTHING WAS STARTED — its own arm, not a
   *  reason folded in beside the occupancy refusals. The two are different
   *  events with different copy and different next actions: a rejected clause
   *  is "That filter was not accepted: {reason}. Nothing was started." with the
   *  clause echoed back for editing, while an occupied slot points at a scan
   *  that already exists. `reason` is a member of `OPERATOR_CLAUSE_REJECTIONS` —
   *  a DefMiner-authored code, never Caido's parser text (T-06-20). */
  | {
      readonly outcome: "clause-rejected";
      readonly reason: OperatorClauseRejection;
    }
  | {
      readonly outcome: "refused";
      readonly reason: /** No project is open, so there is nothing to scan. */
        | "no-project"
        /** A scan is RUNNING on this project. DefMiner runs one at a time —
         *  pause or discard it first. */
        | "already-running"
        /** A SUSPENDED scan is holding its place. Distinguished from the
         *  running case because the operator's next action is different — resume
         *  or discard, not pause — and 06-UI-SPEC.md's start form has a separate
         *  sentence for each. Collapsing them would tell the operator to press a
         *  control that is not on screen. */
        | "already-suspended"
        /** The write itself failed. Logged in full on the backend; the caller
         *  gets the code. */
        | "write-failed";
    };

/**
 * One scan, named. The subject of every lifecycle command.
 *
 * `projectId` is carried and DISCARDED for the reason `PageRequest`'s is
 * (P5-D43): the store layer needs one in every predicate, and the frontend is
 * not the authority on which project is active. It matters as much here as on
 * the settings surface — a caller that could name the project could PAUSE OR
 * DISCARD another project's scan out of the one shared SQLite file (T-05-34,
 * T-06-03), and one of those three commands destroys a cursor.
 *
 * `scanId` is NOT discarded, and the asymmetry is the point: the operator is
 * acting on a row they are looking at, and the backend substitutes the project
 * rather than the row.
 *
 * NOT EXPORTED, for the reason {@link Spec} is not: the registration site infers
 * this shape from the API map, and knip runs with `ignoreExportsUsedInFile: false`.
 */
type ScanRef = {
  readonly projectId: string;
  readonly scanId: string;
};

/**
 * What the scan history read asks for.
 *
 * `limit` IS A CEILING A CALLER MAY ONLY LOWER, the shape
 * {@link ExportRequest}'s `chunkRows` already uses on this contract.
 * `listScans` clamps it into `[1, SCAN_LIST_DEFAULT_LIMIT]`, so nothing crossing
 * this boundary can raise what crosses it — the list is BOUNDED AT READ and not
 * at render, which is what P5-D20 established for the suppressions list. `null`
 * takes the default.
 *
 * NOT EXPORTED, for the reason above.
 */
type ScanListRequest = {
  readonly projectId: string;
  readonly limit: number | null;
};

/**
 * One scan as the HISTORY LIST renders it — a projection, never the row.
 *
 * MAPPED FIELD BY FIELD at the registration site, the rule `PanelAnalysis`
 * already follows: a spread would carry every column this table grows across the
 * boundary on the day somebody adds one. `epoch`, `last_cursor` and
 * `last_request_id` are deliberately absent — they are the backend's own
 * bookkeeping and the surface has nothing to say about any of them.
 *
 * EVERY FIELD IS AN INTEGER, A CLOSED-VOCABULARY CODE, OR THE OPERATOR'S OWN
 * CLAUSE (T-06-04). No response byte, no header, no URL and no target-authored
 * string crosses on this shape. `operatorFilter` is the one unbounded string and
 * it is the operator's own; 06-UI-SPEC.md's R2 routes it through `forCellText`
 * in its own `font-mono` element and never into a sentence, a `title` or a
 * `data-*` attribute.
 *
 * `lastCreatedAt` is the capture time of the oldest request walked — FROM
 * `request.getCreatedAt()`, never from the clock — and it is what the row's
 * "reached {date}" clause renders. `null` before the first page resolved, and on
 * a scan that never walked one: absent, never the epoch.
 */
export type ScanHistoryRow = {
  readonly scanId: string;
  readonly state: ScanLifecycleState;
  /** `null` while the scan is not suspended. A code, never a sentence. */
  readonly suspendReason: SuspendReason | null;
  /** What the operator typed, or `""`. */
  readonly operatorFilter: string;
  readonly pagesWalked: number;
  readonly seen: number;
  readonly admitted: number;
  readonly skippedDone: number;
  readonly rejected: number;
  readonly queued: number;
  readonly lastCreatedAt: number | null;
  readonly startedAt: number;
  readonly finishedAt: number | null;
};

/**
 * Why a lifecycle command did nothing — a CLOSED, DefMiner-authored code set.
 *
 * NONE OF THESE IS AN EXCEPTION AND NONE OF THEM IS A MESSAGE. A driver
 * rejection is logged on the backend, already redacted by `describeError`, and
 * reported here as a code; the panel maps that to its own copy. A message
 * crossing this boundary is a sentence somebody eventually interpolates
 * (T-06-26).
 */
type ScanCommandRefusal =
  /** No project is open, so there is no scan to command. */
  | "no-project"
  /** No such scan in this project — a stale id, one already swept, or a scan
   *  belonging to a DIFFERENT project. That last case is D-04's other half and
   *  it needs no code of its own: the backend substitutes `currentProjectId()`
   *  on every call, so a scan the operator switched away from is simply not in
   *  the partition the command reads, and "Resume it from that project" is
   *  enforced by the predicate rather than by a rule somebody has to remember. */
  | "no-scan"
  /** The guard declined: the row is not in a state this command can move it
   *  from. Pausing a suspended scan and completing a discarded one both land
   *  here, and neither is an error. */
  | "guard-declined"
  /** The write itself failed. Logged in full on the backend; the caller gets
   *  the code. */
  | "write-failed";

/**
 * What a pause, a resume or a discard answers with.
 *
 * `state` IS READ BACK FROM THE ROW, never assumed from the request — this
 * driver cannot report what a write did, and the Scan tab renders this value. A
 * state the operator is shown that was not persisted is threat T-06-28, and it
 * is the same argument {@link RetryOutcome} makes one table over.
 *
 * `changed` AND `ok` ARE NOT THE SAME CLAIM. A pause against an already-paused
 * scan is `ok: true, changed: false` — the guard declining is the guard working,
 * and it is an operator double-click rather than a failure. A write that could
 * not be attempted at all is `ok: false`.
 */
export type ScanCommandOutcome = {
  readonly ok: boolean;
  /** True only when the guard let the row move. */
  readonly changed: boolean;
  /** The row's state AFTER the write, or `null` when there is no such scan. */
  readonly state: ScanLifecycleState | null;
  /** The row's suspension reason after the write. A code, never a sentence. */
  readonly suspendReason: SuspendReason | null;
  /** Why nothing happened, when nothing happened. `null` on success. */
  readonly reason: ScanCommandRefusal | null;
};

/**
 * The plugin package specification.
 *
 * NOT EXPORTED, deliberately. Nothing outside this module can consume it — the
 * frontend is a separate package with its own resolution path — and knip runs
 * with `ignoreExportsUsedInFile: false`, so an export with no cross-module
 * consumer is a gate failure rather than a harmless seam. What IS exported is
 * everything a caller in this package actually needs: the payload types, the
 * count request, {@link PluginSdk} and {@link CONTRACT_VERSION}.
 *
 * THE FOUR EXISTING ENDPOINT NAMES ARE UNCHANGED. Renaming one is a frontend
 * break with no upside, and `sdk.api.register` REJECTS A DUPLICATE NAME — so a
 * rename that left the old registration in place would not be a cosmetic
 * mistake, it would abort initialisation, invisibly.
 *
 * THE EVENTS MAP HAS EXACTLY ONE ENTRY AND ITS PAYLOAD CARRIES NO CONTENT. No
 * findings payload, no response bodies, no rows, no target-controlled string
 * (UI-07, threat T-05-17 / T-05-35 / T-06-44). The frontend re-queries a page
 * when it decides to, through the same project-scoped, redacted read path
 * everything else uses. An event that pushed rows would be a second data path
 * out of the backend with none of the first one's controls on it. The event NAME
 * is not restated here either: it comes from the engine contract's
 * `INVALIDATION_EVENT` constant, so the emitter in `index.ts` and the subscriber
 * in the frontend bind to one string rather than to two copies of one.
 *
 * ITS PAYLOAD IS NOW A UNION OF TWO VARIANTS, AND THE SPIRIT OF THE RULE IS
 * EXACTLY PRESERVED WHILE THE SHAPE IS NOT. The first variant is the shipped
 * invalidation summary — THAT something changed, in which category, how much,
 * and the newest row's identifier. The second is one retroactive scan's
 * progress: DefMiner-authored INTEGERS, one boolean, two identifiers this
 * plugin owns, and ONE DefMiner-formatted timestamp derived from
 * `request.getCreatedAt()`. Still no findings payload, still no bodies, still
 * nothing a target influenced.
 *
 * THE UPSTREAM CONTRACT IS AMENDED RATHER THAN QUIETLY EXCEEDED.
 * `05-UI-SPEC.md` § "Data & Interaction Contract" said verbatim that
 * backend -> frontend events carry an invalidation summary ONLY; plan 06-09
 * amends that sentence in the same commit as the code, so the approved document
 * never describes a build that no longer exists (06-UI-SPEC.md § "Amendments",
 * rows A2 and A3). An exceeded contract nobody edited is how a security
 * property becomes folklore.
 *
 * ONE EVENT AND NOT TWO, WHICH IS D-15's ACTUAL REASON. A second event name
 * would mean a second subscription list edited by every phase that adds a
 * surface. What D-15 asked for LITERALLY — a `scans` `InvalidationCategory` —
 * is NOT done, and the engine contract states at length why it delivers the
 * opposite of D-15's own intent. `INVALIDATION_CATEGORIES` holds ENTITY tables
 * only and still holds nothing scan-shaped.
 *
 * THE SENTENCE HERE USED TO READ "a fourth `InvalidationCategory`" and "still
 * holds exactly three members", and plan 07-04 made both false in the same edit
 * — it appended `sources` and `source_sightings` for the two tables it created,
 * under that list's own rule that entity categories are added by the phase that
 * adds the table. Amended rather than left standing, because a contract comment
 * that describes a build which no longer exists is how a security property
 * becomes folklore (06-UI-SPEC.md § "Amendments"). The claim this paragraph
 * actually makes — scan progress is a payload VARIANT and never a category —
 * is untouched by that growth and is asserted in contract.spec.ts by the
 * property, not by the count.
 */
type Spec = DefinePluginPackageSpec<{
  manifestId: "defminer";
  api: {
    /** The plugin's own state. Registered on every path, including refusals. */
    getStatus: () => StatusPayload;
    /** The measured runtime surface matrix. Registered on every path. */
    getCompat: () => CompatPayload;
    /** The whole recent artifact list, unpaginated. The pre-Phase-5 read, kept
     *  because it is what the compatibility smoke test drives. */
    getArtifacts: () => Promise<readonly ArtifactRow[]>;
    /** The whole recent observation list, unpaginated. As `getArtifacts`. */
    getObservations: () => Promise<readonly ObservationRow[]>;
    /** One keyset page of `artifacts`, each row carrying the analysis state
     *  UI-09 marks it with. */
    listArtifactsPage: (
      req: PageRequest,
    ) => Promise<PageResponse<ArtifactPageRow>>;
    /** One keyset page of `observations`. */
    listObservationsPage: (
      req: PageRequest,
    ) => Promise<PageResponse<ObservationRow>>;
    /** How many rows the operator can currently reach, for one table and one
     *  filter — the number behind the filtered-empty copy. */
    countInventory: (req: CountRequest) => Promise<VisibleTotal>;
    /** The newest analysis of one artifact, as the evidence panel renders it.
     *  `null` when the artifact has never been analysed — which is a real
     *  state and not an error. */
    getArtifactAnalysis: (
      req: ArtifactAnalysisRequest,
    ) => Promise<PanelAnalysis | null>;
    /** Move ONE stopped analysis back out of its terminal state, on operator
     *  command (OPS-03). Nothing re-analyses on its own as a result. */
    retryAnalysis: (req: AnalysisKey) => Promise<RetryOutcome>;
    /** ONE recovered source, DERIVED ON DEMAND (D-07, MAP-07, UI-05).
     *
     *  NOTHING IS HELD AT REST AND NOTHING IS CACHED. Every call reloads the
     *  originating request, re-verifies the reloaded body's sha256 against the
     *  digest DefMiner recorded (D-24) and re-reads the map. A mismatch is
     *  answered with the `changed` arm and NO CONTENT — never with content
     *  re-derived from the new body, which would show the operator source
     *  attributed to a bundle it did not come from.
     *
     *  FOUR ARMS, AND THE FOURTH WRITES NOTHING. `unavailable` is "could not
     *  ask"; only a reload that genuinely returns missing-or-no-response makes
     *  the permanent D-23 tombstone. A call that did not answer is not evidence
     *  of a refusal. */
    deriveSource: (req: SourceRef) => Promise<DeriveSourceResult>;
    /** One chunk of an inventory export, as BYTES (UI-06, decision D-04).
     *
     *  NOTHING IS WRITTEN ON THE SERVER. The backend serialises and returns; the
     *  frontend concatenates the chunks, builds a Blob and triggers a download
     *  onto the operator's own machine. There is no path in the request, none in
     *  the response, and none in the module behind it. */
    exportInventory: (req: ExportRequest) => Promise<ExportChunkResult>;
    /** Every settings key this build ACTUALLY has, each with its project row,
     *  its global row and its documented default as three distinguishable
     *  fields (UI-08). The list is the backend's, so the surface cannot render
     *  a control for a phase that has not shipped one. */
    listSettings: (
      req: SettingsRequest,
    ) => Promise<readonly KnownSettingValue[]>;
    /** Write one setting at one scope, or clear it with a `null` value. A
     *  retention bound is VALIDATED BEFORE IT IS STORED and a rejection reports
     *  which of the closed reasons it was — the shipped read guard is a
     *  backstop, and a backstop that turns a typo into "saved, and quietly
     *  ignored" is doing the operator no favours. */
    writeSetting: (req: SettingWriteRequest) => Promise<BoundedSettingOutcome>;
    /** The four numbers that tell a blocked backend thread from a slow
     *  renderer (research P-07). Adds no measurement; projects what exists. */
    getHealth: () => HealthOutcome;
    /** WHERE the data lives and HOW MUCH of each cap it uses (DEPLOY-02, D-19,
     *  D-25) — three row counts against their retention caps, each with the age
     *  of its oldest row when that is knowable, plus whether a restart has ever
     *  been OBSERVED to lose this database.
     *
     *  THERE IS NO PATH ON THIS SHAPE AND THERE NEVER WILL BE. D-19 removed the
     *  Settings surface's path renderer entirely rather than labelling it: the
     *  operator cannot reach a server path, and `sdk.meta.path()` carries an OS
     *  username, which is the string `telemetry.spec.ts`'s guard exists to keep
     *  off this contract. NO BYTES EITHER — D-25 rejected `PRAGMA page_count`
     *  because it buys a SQL-discipline allowlist argument for a number
     *  derivable from the counts. */
    getStorageFootprint: () => Promise<StorageFootprint>;
    /** Begin one retroactive scan of traffic Caido captured before DefMiner was
     *  installed (FIND-03). ONE PER PROJECT: the second start is refused by a
     *  partial unique index inside the insert, not by a check before it, so
     *  there is no window in which two scans can both believe they started. */
    startScan: (req: StartScanRequest) => Promise<StartScanOutcome>;
    /** This project's active scan, or `null` when there is none.
     *
     *  `null` IS A REAL STATE AND NOT AN ERROR — it is what puts the start form
     *  on screen. It is deliberately not a zero-filled payload: `0 seen,
     *  0 admitted` describes a scan that started and found nothing, which is
     *  the opposite of the truth for a project that has never run one. */
    getScanStatus: () => Promise<ScanStatusPayload | null>;
    /** SUSPEND a scan and KEEP ITS PLACE (D-10). THIS IS A PAUSE. The position
     *  is kept and {@link Spec} says so here rather than in a wiki, so a reader
     *  of the contract learns D-10 without leaving the file: a resume continues
     *  from exactly where this stopped, which is what makes a mis-clicked pause
     *  on a multi-hour backfill cost nothing. Never named "cancel" anywhere on
     *  this contract, because the word promises something else. */
    pauseScan: (req: ScanRef) => Promise<ScanCommandOutcome>;
    /** Return a suspended scan to running, on explicit operator command. THE
     *  ONLY WAY BACK: DefMiner never resumes a scan on its own after a restart
     *  (D-11), a project change (D-04) or a retention eviction (D-08). */
    resumeScan: (req: ScanRef) => Promise<ScanCommandOutcome>;
    /** Throw a scan away. IT DESTROYS THE WALKED POSITION AND NOTHING ELSE —
     *  the artifacts and observations the scan produced went through the same
     *  admission gate, digest and store path the live hook uses (D-01) and are
     *  NOT touched. A separate endpoint from {@link Spec}'s `pauseScan` with its
     *  own name, so the destructive control can never be reached by mis-clicking
     *  the pause one (D-10, T-06-28). */
    discardScan: (req: ScanRef) => Promise<ScanCommandOutcome>;
    /** This project's scan history — BOUNDED AT READ, newest first, with every
     *  `suspended` scan included regardless of age. The bound is the backend's
     *  and a caller may only lower it: a suspended scan's row IS its cursor, and
     *  one hidden below a display cap is unfinished work the operator has no way
     *  to learn about (U6-1, D-26). */
    listScans: (req: ScanListRequest) => Promise<readonly ScanHistoryRow[]>;
    /** {@link CONTRACT_VERSION}. Cheap, and the only thing that prevents a stale
     *  frontend bundle silently misreading a changed return shape. */
    getContractVersion: () => number;
  };
  // A MAPPED TYPE OVER THE CONSTANT'S LITERAL TYPE, not the string written out
  // again. `[K in typeof INVALIDATION_EVENT]` resolves to the one key the engine
  // contract declares, so renaming the event there is a typecheck failure here
  // rather than a silent mismatch between an emitter and a subscriber that both
  // compile. The import is `import type`, so nothing is added to the bundle by
  // this file.
  events: {
    [K in typeof INVALIDATION_EVENT]: (
      payload: InvalidationEventPayload,
    ) => void;
  };
}>;

/**
 * The SDK surface `init()` actually touches, with the RPC half TYPED AGAINST
 * {@link Spec} through the SDK's own generic.
 *
 * WHY A NAMED STRUCTURAL SURFACE AND NOT `SDK<Api, Events>` WHOLESALE. Phase 0
 * measured how badly the shipped type packages under-declare this runtime, and
 * Phase 1 recorded the consequence as a decision: `sdk: any` at the wide boundary
 * is the honest annotation, and every module that takes a piece of the SDK
 * (`MetaSdk`, `LifecycleSdk`, `PassiveSdk`) declares the piece it uses rather
 * than the whole. This type follows that established shape instead of breaking
 * it — it is the union of those pieces plus the one part where a precise type
 * buys something real.
 *
 * THE PART WHERE IT BUYS SOMETHING REAL IS `api`. `APISDK<Spec["api"],
 * Spec["events"]>` makes
 * `register` reject an endpoint name that is not in the contract and a callback
 * whose signature does not match, and makes `send` reject an event name or a
 * payload shape the contract does not declare. Before this, both took `string`
 * and `unknown`: a typo in an endpoint name registered a second, unreachable
 * endpoint and nothing said so, on a runtime that surfaces neither a throw nor a
 * rejection from plugin code.
 *
 * `runtime` is optional at both levels DELIBERATELY. `checkCompat` reads it
 * through a dotted-path walk precisely because a build may not expose it, and
 * declaring it as present would turn the guard that exists for that case into
 * dead code the linter then offers to delete.
 */
export type PluginSdk = Omit<LifecycleSdk, "events"> & {
  runtime?: { version?: string | null };
  requests: {
    get(id: string): Promise<unknown>;
    inScope(request: unknown): boolean;
    /**
     * The retroactive walk's page read (FIND-03).
     *
     * WIDENED NARROWLY, AND NOT BY ADOPTING `SDK<...>` WHOLESALE. The paragraph
     * above states why this type is a named structural surface: Phase 0
     * measured how badly the shipped type packages under-declare this runtime,
     * and every module here takes the PIECE of the SDK it uses. This adds one
     * more piece for the same reason — `init()` is where {@link ScanQuery}'s
     * only production caller is constructed, and without it `sdk.requests` is
     * declared as `get` and `inScope` and the producer has no driver that can
     * typecheck.
     *
     * The RETURN TYPE is `scan/producer.ts`'s own declaration rather than a
     * second copy of the builder's shape, so widening the walk is one edit. The
     * import is `import type`, so nothing is added to the shipped bundle.
     */
    query(): ScanQuery;
  };
  meta: { db(): Promise<Database> };
  api: APISDK<Spec["api"], Spec["events"]>;
  events: LifecycleSdk["events"] & {
    onInterceptResponse(
      fn: (sdk: unknown, request: unknown, response: unknown) => unknown,
    ): void;
  };
};
