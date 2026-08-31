// packages/frontend/src/api/client.ts — the ONE typed route from the view layer
// to the backend.
//
// ===========================================================================
// WHAT THIS MODULE IS FOR
// ===========================================================================
// Three jobs, none of which is "abstraction for its own sake":
//
//   1. NO COMPONENT REACHES `sdk.backend` DIRECTLY, so no component restates a
//      request or a response shape. The request and response TYPES are imported
//      from @defminer/engine/contract — the same declarations the backend's
//      `api/spec.ts` imports — so a change to a page's return shape is a
//      typecheck failure in both packages rather than a runtime `undefined` in
//      one of them.
//   2. EVERY FAILURE CROSSES BACK AS A VALUE, never as a rejection. Caido
//      surfaces neither a throw nor a rejection from plugin code (ERR-03,
//      measured in Phase 0), so a method that rejects is a method whose failure
//      nobody sees. `RpcResult` makes the failure a thing the caller must read.
//   3. THE CONTRACT VERSION IS CHECKED ONCE AND A MISMATCH IS A HARD STATE.
//      Not a warning: a stale bundle misreading a changed return shape produces
//      wrong rows that look right, which is strictly worse than an error.
//
// ===========================================================================
// NOTHING IS IMPORTED FROM THE BACKEND PACKAGE — RESOLUTION, NOT TASTE
// ===========================================================================
// (Its specifier is deliberately not written out anywhere in this file: the
// plan's acceptance gate greps the source for it, and a gate a comment can trip
// is a gate that gets weakened rather than obeyed. Same reasoning the backend's
// api/spec.ts gives for not naming the two deprecated SDK helpers.)
//
// `src/backend.ts` opens with the argument and it is unchanged here: the
// backend package imports `caido:*` specifiers that resolve only inside Caido's
// QuickJS, so a dependency on it would drag an unresolvable module graph into a
// browser build. The SHARED half — cursors, page requests, page responses,
// invalidation summaries, the event name — lives in @defminer/engine, which is
// SDK-free by construction (DET-03). That is the whole point of the engine
// contract: one declaration, two importers, neither of which can reach the
// other.
//
// ===========================================================================
// WHICH ENDPOINTS ARE WRAPPED, AND WHY THE REST ARE NOT
// ===========================================================================
// Decision P5-D52 held that a wrapper restating a payload type with no consumer
// is a second copy that drifts before anybody reads it, and left `getStatus`,
// `getCompat`, `getArtifacts` and `getObservations` unwrapped until something
// rendered them. Plan 05-12 is that something, and it resolves the four
// SEPARATELY rather than wrapping the lot now that one of them is needed:
//
//   * `getCompat` IS WRAPPED. The refusal surface renders its report, and on a
//     refusing build it is one of only TWO endpoints that exist at all.
//   * `getStatus` IS STILL NOT, and that is a decision rather than an omission.
//     The health strip reads `getHealth`, which carries four numbers and no
//     string; `getStatus` carries the whole telemetry projection including
//     `lastError`. A strip built over the wider shape would be one field access
//     away from rendering a plugin-generated string that quotes what the plugin
//     was doing, and 05-UI-SPEC.md's `long-text / health-strip` row makes the
//     absence of such content a property of the surface. Resolution, not
//     discipline.
//   * The two unpaginated reads are the compatibility smoke test's and are
//     superseded on this page by the paged pair.

import type {
  BoundRejection,
  ExportFormat,
  ExportRedactionMode,
  InvalidationSummary,
  PageCursor,
  PageRequest,
  PageResponse,
  ScanState,
  ScanStatusPayload,
  SettingKey,
  SettingScope,
  SettingsGroup,
  VisibleTotal,
} from "@defminer/engine/contract";
import { INVALIDATION_EVENT } from "@defminer/engine/contract";

import type { ArtifactRow } from "../backend";

// ---------------------------------------------------------------------------
// THE CONTRACT VERSION AND THE TIMEOUT
// ---------------------------------------------------------------------------

/**
 * The RPC contract version THIS BUNDLE was built against.
 *
 * A SECOND COPY OF THE BACKEND'S `CONTRACT_VERSION`, AND DELIBERATELY SO — the
 * two packages cannot import each other (see the header), and if they could the
 * check would be vacuous: a version the frontend read out of the backend at
 * build time is a version that cannot disagree at run time. The whole mechanism
 * depends on these being two independently shipped numbers. The bump rule is
 * the backend's and is restated here so the obligation is visible at the place
 * somebody edits: bump when an argument type or a return type changes shape.
 *
 * BUMPED TO 2 IN LOCKSTEP WITH PLAN 05-10's BACKEND BUMP, and the lockstep is
 * the point: a page row now carries the artifact's analysis state, so a bundle
 * built against version 1 would read the wider row with the old expectations.
 * The two numbers are still two independently shipped constants — that is what
 * makes the check able to fail at all — and this edit is the one place a
 * reviewer sees them move together.
 *
 * BUMPED TO 3 IN LOCKSTEP WITH PLAN 05-11's. The backend's own comment records
 * that this one is a DELIBERATE OVER-BUMP — a new endpoint name obliges no bump
 * under the shape rule — taken because the export is the first result this
 * bundle ASSEMBLES across several calls into a FILE on the operator's disk, and
 * a file outlives the session with nothing on its face saying which version
 * wrote it.
 *
 * BUMPED TO 4 IN LOCKSTEP WITH PLAN 05-12's. The backend's comment records that
 * one as a deliberate over-bump too, and for a reason worth repeating where a
 * reader edits this number: `writeSetting` is the first endpoint whose effect is
 * a persistent configuration change governing a DESTRUCTIVE SWEEP, and a bundle
 * misreading its outcome shape would report "saved" for a retention bound the
 * backend refused. The operator would then believe a bound is in force that is
 * not, about the one mechanism in this plugin that deletes their history.
 *
 * BUMPED TO 5 IN LOCKSTEP WITH PLAN 06-01's. That one is NOT an over-bump and
 * the backend's comment says why: `getScanStatus` returns
 * `ScanStatusPayload | null`, and the two halves of that union put OPPOSITE
 * surfaces on screen — `null` renders the start form, a payload renders the
 * live counter strip. A bundle reading a shape it does not know would render
 * one for the other, and the specific failure is a strip of zeroes shown to an
 * operator who has never started a scan, which reads as "DefMiner scanned and
 * found nothing".
 */
export const FRONTEND_CONTRACT_VERSION = 5;

/**
 * How long a single RPC call may take before the client answers `rpc-timeout`.
 *
 * TEN SECONDS BECAUSE THE ERROR COPY SAYS TEN SECONDS. 05-UI-SPEC.md's error
 * state reads "The DefMiner backend did not answer within 10 seconds"; this
 * constant and {@link RPC_ERROR_STATE_BODY} below are the same number written
 * once, so the copy cannot promise a duration the client does not wait.
 *
 * A CALL THAT NEVER SETTLES IS THE NORMAL FAILURE HERE, not an exotic one. The
 * backend runs on a single QuickJS thread and a large parse blocks it
 * (research P-07); without a timeout the table renders skeleton rows forever
 * and the operator files "the UI hangs" against the wrong component.
 */
export const RPC_TIMEOUT_MS = 10_000;

/**
 * 05-UI-SPEC.md's error-state body, with its one number READ FROM
 * {@link RPC_TIMEOUT_MS} rather than typed out again.
 *
 * DefMiner-authored end to end. No interpolated backend string, no host, no
 * path — the copywriting contract's rule that outranks its own table.
 */
export const RPC_ERROR_STATE_BODY = `Could not load secrets. The DefMiner backend did not answer within ${RPC_TIMEOUT_MS / 1000} seconds — it may be busy analysing a large bundle, which blocks its single thread. Retry, or open Settings → Health to see queue depth and dropped count.`;

// ---------------------------------------------------------------------------
// THE ROW AND REQUEST SHAPES THIS PACKAGE NEEDS
// ---------------------------------------------------------------------------

/**
 * One observation row exactly as the paged read returns it.
 *
 * Mirrors `ObservationRow` in packages/backend/src/store/observations.ts, for
 * the reason `src/backend.ts`'s `ArtifactRow` gives — the two packages cannot
 * import each other. `ArtifactRow` is imported from there rather than declared
 * a second time here.
 *
 * `url` IS TARGET-CONTROLLED and is the only field on either row that is. This
 * module HOLDS it and never renders it; every route to a template goes through
 * `src/safety/display.ts`, which is where R1 and R2 apply.
 */
export type ObservationRow = {
  project_id: string;
  sha256: string;
  request_id: string;
  url: string;
  status: number;
  content_type: string | null;
  observed_at: number;
};

/**
 * The analysis of one artifact, as the evidence panel receives it.
 *
 * Mirrors `PanelAnalysis` in packages/backend/src/api/spec.ts, for the reason
 * this file's header gives — the two packages cannot import each other.
 *
 * THERE IS NO `error` FIELD AND THERE MUST NOT BE ONE. The backend's
 * projection omits `analyses.error` deliberately: ERR-04's copy interpolates a
 * `{reason}` into a sentence, and 05-UI-SPEC.md's rule that outranks its copy
 * table requires that reason be a DefMiner-authored code rather than a message
 * quoting the artifact. Adding the field here would be adding the first place
 * somebody could interpolate one (T-05-51).
 *
 * `byteLen` and `bytesWalked` are both integers the BACKEND measured. The
 * panel renders them and never derives one from the other or from the display
 * text — bytes are the backend's length space and display text has been
 * grapheme-truncated in the frontend's (safety/display.ts states the same
 * rule where it bites).
 */
export type PanelAnalysis = {
  readonly sha256: string;
  readonly detectorSetHash: string;
  readonly scanState: ScanState;
  readonly bytesWalked: number | null;
  readonly byteLen: number | null;
  readonly startedAt: number;
  readonly finishedAt: number | null;
};

/**
 * The key one retry addresses.
 *
 * `detectorSetHash` is carried because the corpus version is part of the
 * analysis KEY. A retry that omitted it would aim at every reading of these
 * bytes rather than at the one the panel is showing.
 */
export type AnalysisKey = {
  readonly projectId: string;
  readonly sha256: string;
  readonly detectorSetHash: string;
};

/**
 * What a retry answers with.
 *
 * `state` IS THE STATE THE BACKEND READ BACK from the row, never one assumed
 * from the request. The panel renders it, and a state the operator is shown
 * that was not persisted is threat T-05-55 — the same rule 05-UI-SPEC.md
 * states for triage controls, applied here because it is the same class of
 * write.
 */
export type RetryOutcome = {
  readonly ok: boolean;
  readonly changed: boolean;
  readonly state: ScanState | null;
};

/** Which inventory table a read addresses. The two the backend actually pages;
 *  `analyses` is an invalidation CATEGORY, not a pageable table, which is why
 *  this list is shorter than the contract's category list. */
export type InventoryTable = "artifacts" | "observations";

/**
 * The argument the inventory count takes.
 *
 * `filter` REUSES `PageRequest["filter"]` rather than restating it — the same
 * reason the backend's own `CountRequest` does. A count and the page it belongs
 * under that disagree about what a filter is produce a total the operator can
 * see is wrong by counting the rows on screen.
 */
export type CountRequest = {
  readonly projectId: string;
  readonly table: InventoryTable;
  readonly filter: PageRequest["filter"];
};

/**
 * What one export chunk asks for.
 *
 * Mirrors `ExportRequest` in packages/backend/src/api/spec.ts, for the reason
 * this file's header gives — the two packages cannot import each other. The two
 * VOCABULARIES it is built from are NOT mirrored: `ExportFormat` and
 * `ExportRedactionMode` are imported from @defminer/engine/contract, because the
 * redaction list's ORDER is a safety property and a second copy of it would be
 * the one kind of duplication that fails silently and in the dangerous
 * direction.
 *
 * `cursor` AND `chunkIndex` ARE NOT REDUNDANT: the cursor is how the rows are
 * found (05-UI-SPEC.md bans `OFFSET`), the index is what decides whether the
 * chunk carries the header and, with the more-chunks flag, whether the backend
 * writes the audit row.
 */
export type ExportChunkRequest = {
  readonly projectId: string;
  readonly table: InventoryTable;
  readonly format: ExportFormat;
  readonly mode: ExportRedactionMode;
  readonly filter: PageRequest["filter"];
  readonly sortKey: string;
  readonly direction: "asc" | "desc";
  readonly chunkIndex: number;
  readonly cursor: PageCursor | null;
  /** A ceiling the backend clamps. `null` takes the measured constant. */
  readonly chunkRows: number | null;
};

/** One chunk of an export, as it crosses the boundary.
 *
 *  `text` IS BYTES AND NOT A PATH, and that is the whole of decision D-04's
 *  mechanism on this side: this component concatenates the chunks in order,
 *  builds a Blob from `contentType` and triggers a download named `filename`
 *  onto the operator's own machine. Nothing here names a location on a
 *  server. */
export type ExportChunk = {
  readonly filename: string;
  readonly contentType: string;
  readonly text: string;
  readonly chunkIndex: number;
  readonly rows: number;
  readonly hasMore: boolean;
  readonly nextCursor: PageCursor | null;
};

/** Why an export produced nothing. A closed, DefMiner-authored vocabulary the
 *  dialog maps to its own copy — never a message. */
export type ExportRefusal = "no-project" | "unknown-table" | "unknown-format";

/**
 * What the export endpoint answers with.
 *
 * THREE OUTCOMES AND NOT TWO. `empty` is not a chunk carrying zero rows: a
 * zero-row export is DISABLED at the button with the reason stated on it
 * (05-UI-SPEC.md Open Decision D3), and a serialiser that answered it with a
 * header-only document would invite a caller that ignores the rule. The dialog
 * reads `empty` as "the rule was bypassed" rather than as a file.
 */
export type ExportChunkOutcome =
  | { readonly outcome: "chunk"; readonly chunk: ExportChunk }
  | { readonly outcome: "empty" }
  | { readonly outcome: "refused"; readonly reason: ExportRefusal };

/**
 * One settings key with all three levels of its resolution, as the panel
 * receives it.
 *
 * Mirrors `KnownSettingValue` in packages/backend/src/store/settings.ts, for the
 * reason this file's header gives — the two packages cannot import each other.
 * The two VOCABULARIES it is built from are NOT mirrored: `SettingKey` and
 * `SettingsGroup` come from @defminer/engine/contract, because the key list is
 * what makes the panel's copy map exhaustive. A second copy of it here would let
 * a key ship with no label and nothing would say so.
 *
 * `project` AND `global` ARE `string | null` AND THE `null` IS "NO ROW". An
 * empty string is a row holding an empty string, which is a value somebody wrote
 * — and it is precisely the value the write guard refuses, so it can only have
 * arrived from before this surface existed. Collapsing the two would make it
 * unfindable and unclearable.
 *
 * NOTHING HERE IS TARGET-CONTROLLED. Keys and groups are DefMiner-authored
 * identifiers; the three values are strings the OPERATOR typed or this plugin
 * documented. This is the one row shape in the frontend with no `font-mono`
 * obligation, and the reason is worth stating rather than inferring.
 */
export type SettingRow = {
  readonly key: SettingKey;
  readonly group: SettingsGroup;
  readonly documented: string;
  readonly project: string | null;
  readonly global: string | null;
};

/**
 * One settings write.
 *
 * `value: null` IS THE CLEAR — a write of ABSENCE at this scope, which falls the
 * resolution back to the next level down rather than pinning it to whatever the
 * documented default happens to be today.
 *
 * `projectId` is carried and DISCARDED by the backend, like every other request
 * on this contract: the store layer needs one in every predicate and the
 * frontend is not the authority on which project is active.
 */
export type SettingWriteRequest = {
  readonly projectId: string;
  readonly scope: SettingScope;
  readonly key: SettingKey;
  readonly value: string | null;
};

/**
 * What a settings write answers with.
 *
 * A REASON CODE, NEVER A MESSAGE — the same rule {@link RpcReason} states. The
 * panel maps each member of the closed vocabulary to its own copy, so nothing a
 * driver or a coercion said can be interpolated into a sentence the operator
 * reads.
 *
 * `stored` IS WHAT ACTUALLY LANDED and is not always what was sent: a fractional
 * bound is floored. The panel re-reads after a successful write anyway — this
 * field is what lets it say so in the same breath.
 */
export type SettingWriteOutcome =
  | { readonly ok: true; readonly stored: string }
  | { readonly ok: false; readonly reason: BoundRejection };

/**
 * The four numbers the health strip renders.
 *
 * Mirrors `HealthPayload` in packages/backend/src/api/spec.ts. FOUR NUMBERS AND
 * NO STRING, and the absence is the property: 05-UI-SPEC.md's `long-text /
 * health-strip` row makes "only DefMiner-authored labels and numeric counters"
 * a rule of this surface, and a shape with no string on it cannot break it by a
 * later edit adding one field access.
 */
export type HealthCounters = {
  readonly queueDepth: number;
  readonly droppedCount: number;
  readonly jobsInFlight: number;
  readonly maxSliceMs: number;
};

/**
 * What the health endpoint answers with.
 *
 * TWO OUTCOMES, because four zeroes are what a perfectly healthy idle backend
 * reports and rendering them for a plugin with no project resolved would tell
 * the operator the opposite of the truth at the moment they came here to
 * diagnose something.
 */
export type HealthOutcome =
  | { readonly outcome: "health"; readonly health: HealthCounters }
  | { readonly outcome: "unavailable"; readonly reason: "no-project" };

/**
 * One table's footprint: how many rows, against the cap in force, and how old
 * the oldest row is when that is knowable.
 *
 * Mirrors `FootprintRow` in packages/backend/src/store/settings.ts. THREE
 * NUMBERS AND NO STRING, and the absence is the property — the shape that
 * reaches the storage surface has nothing path-shaped on it to render.
 */
export type FootprintRow = {
  readonly count: number;
  readonly cap: number;
  /** Whole days, or `null` when DefMiner has no oldest row. ABSENT, never
   *  rendered as a zero: "oldest 0 days" is a fabricated number. */
  readonly oldestDays: number | null;
};

/**
 * What the storage surface reads (DEPLOY-02, D-19, D-25).
 *
 * A `null` ROW IS AN UNREAD COUNT AND NOT AN EMPTY TABLE, and the surface keeps
 * them apart: a zero claims a measured empty project, and a read that failed
 * claims nothing at all.
 *
 * `observedRestartLoss` IS AN OBSERVATION OF THE PAST. The backend cannot detect
 * a persistent volume, so it never predicts one — it reports only that a boot
 * once found its own durable marker gone. With the flag clear the surface says
 * nothing, which is the honest reading of "no evidence".
 */
export type StorageFootprint = {
  readonly artifacts: FootprintRow | null;
  readonly observations: FootprintRow | null;
  readonly analyses: FootprintRow | null;
  readonly observedRestartLoss: boolean;
};

/**
 * One runtime surface probe's result, as the refusal surface renders it.
 *
 * Mirrors `SurfaceOutcome` in packages/backend/src/compat.ts. `error` is a
 * PLUGIN-GENERATED probe message — a `TypeError` from a property access this
 * plugin made against the SDK — and carries no target byte: a surface probe
 * never touches a response. It is still rendered through the display path,
 * because "carries no target byte" is a claim about today's probe list and the
 * display path costs nothing to keep in front of it.
 */
export type SurfaceProbe = {
  readonly name: string;
  readonly scope: string;
  readonly ok: boolean;
  readonly error: string | null;
};

/**
 * COMPAT-02's in-runtime report, as the refusal surface renders it.
 *
 * Mirrors `CompatPayload` in packages/backend/src/api/spec.ts. THE ONE PAYLOAD
 * THIS CLIENT MAY ASK FOR ON A REFUSING BUILD: `getCompat` is registered on the
 * success path AND on all three refusal paths, and on a refusal it is one of
 * only two endpoints that exist at all.
 */
export type CompatReport = {
  readonly compatible: boolean;
  readonly reason: string | null;
  readonly minCaido: string;
  readonly minSqlite: string;
  readonly caidoVersion: string | null;
  readonly sqliteVersion: string | null;
  readonly surfaces: readonly SurfaceProbe[];
};

// ---------------------------------------------------------------------------
// THE RESULT TYPE
// ---------------------------------------------------------------------------

/**
 * Why a call did not produce a value. A CLOSED DefMiner-authored vocabulary.
 *
 * Three members and no `"unknown"`: every failure this module can produce is
 * one of these three, and a fourth would need a copy row of its own before it
 * could be rendered. Note what is NOT here — a message, a code from the
 * backend, a cause. The reason is an identifier the UI maps to its own copy.
 */
export type RpcReason =
  | "rpc-rejected"
  | "rpc-timeout"
  | "contract-version-mismatch";

/** Both contract versions, as the mismatch state carries them. */
export type ContractVersions = {
  readonly frontend: number;
  readonly backend: number;
};

/** A call that did not produce a value. */
export type RpcFailure = {
  readonly ok: false;
  readonly reason: RpcReason;
  /** The two versions, on a mismatch. `null` on every other reason — the
   *  numbers are the only thing a mismatch has to say that a reason code
   *  cannot, and inventing a null-object here would hide which case it is. */
  readonly versions: ContractVersions | null;
};

/** What every client method answers with. Never a rejection. */
export type RpcResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | RpcFailure;

// ---------------------------------------------------------------------------
// THE SDK SURFACE THIS MODULE TOUCHES
// ---------------------------------------------------------------------------

/**
 * What `startScan` answers.
 *
 * MIRRORS THE BACKEND'S UNION, and the `reason` members are the backend's codes
 * verbatim. They are IDENTIFIERS THE UI MAPS TO ITS OWN COPY, never sentences
 * it interpolates — the same rule `RpcReason` above obeys, and it matters more
 * here because the alternative on this path is Caido's HTTPQL parser text,
 * which quotes whatever the operator typed back at them inside a sentence.
 *
 * A refusal is not a failure of the CALL: `RpcResult` still reports `ok: true`
 * and carries this value. The two layers answer different questions — "did the
 * backend answer" and "did the backend agree" — and collapsing them would make
 * a refused start indistinguishable from a backend that never replied.
 */
export type StartScanOutcome =
  | { readonly outcome: "started"; readonly scanId: string }
  | {
      readonly outcome: "refused";
      readonly reason:
        | "no-project"
        | "already-running"
        | "operator-clause-unsupported"
        | "write-failed";
    };

/** The stop handle `onEvent` returns. Named because it is the thing that must
 *  be owned and called; research P-04 is entirely about it being dropped. */
export type InvalidationSubscription = { readonly stop: () => void };

/**
 * The slice of the Caido frontend SDK this client uses.
 *
 * A STRUCTURAL SURFACE, NOT `Caido<Spec>`, following the shape the backend
 * package established (P5-D41): every module declares the piece of the SDK it
 * touches rather than the whole. It also makes the stub in `client.spec.ts` a
 * literal instead of a cast — a stub that has to be cast is a stub that stops
 * failing when the real surface changes.
 *
 * The return types are PROMISES even where the backend declares a synchronous
 * value: `BackendSDK` promisifies every endpoint because the call crosses a
 * process boundary.
 */
export type DefMinerBackendSdk = {
  readonly backend: {
    getContractVersion: () => Promise<number>;
    listArtifactsPage: (
      request: PageRequest,
    ) => Promise<PageResponse<ArtifactRow>>;
    listObservationsPage: (
      request: PageRequest,
    ) => Promise<PageResponse<ObservationRow>>;
    countInventory: (request: CountRequest) => Promise<VisibleTotal>;
    exportInventory: (
      request: ExportChunkRequest,
    ) => Promise<ExportChunkOutcome>;
    getArtifactAnalysis: (request: {
      readonly projectId: string;
      readonly sha256: string;
    }) => Promise<PanelAnalysis | null>;
    retryAnalysis: (request: AnalysisKey) => Promise<RetryOutcome>;
    listSettings: (request: {
      readonly projectId: string;
    }) => Promise<readonly SettingRow[]>;
    writeSetting: (
      request: SettingWriteRequest,
    ) => Promise<SettingWriteOutcome>;
    getHealth: () => Promise<HealthOutcome>;
    getStorageFootprint: () => Promise<StorageFootprint>;
    startScan: (request: {
      readonly operatorFilter: string;
    }) => Promise<StartScanOutcome>;
    getScanStatus: () => Promise<ScanStatusPayload | null>;
    getCompat: () => Promise<CompatReport>;
    onEvent: (
      event: typeof INVALIDATION_EVENT,
      callback: (summary: InvalidationSummary) => void,
    ) => InvalidationSubscription;
  };
};

/** What {@link createBackendClient} returns. */
export type BackendClient = {
  /** Ask the backend for its contract version and record a mismatch. Called
   *  once, on mount. */
  checkContractVersion: () => Promise<RpcResult<number>>;
  /** The recorded mismatch, or `null` while the versions agree (or before the
   *  check has run). */
  contractMismatch: () => ContractVersions | null;
  listArtifactsPage: (
    request: PageRequest,
  ) => Promise<RpcResult<PageResponse<ArtifactRow>>>;
  listObservationsPage: (
    request: PageRequest,
  ) => Promise<RpcResult<PageResponse<ObservationRow>>>;
  countInventory: (request: CountRequest) => Promise<RpcResult<VisibleTotal>>;
  /** The selected artifact's newest analysis, or `null` when it has never been
   *  analysed — which is a real state and not a failure. */
  getArtifactAnalysis: (request: {
    readonly projectId: string;
    readonly sha256: string;
  }) => Promise<RpcResult<PanelAnalysis | null>>;
  /** Move ONE stopped analysis back out of its terminal state (OPS-03). */
  retryAnalysis: (request: AnalysisKey) => Promise<RpcResult<RetryOutcome>>;
  /** One chunk of an inventory export, as bytes (UI-06, decision D-04). */
  exportInventory: (
    request: ExportChunkRequest,
  ) => Promise<RpcResult<ExportChunkOutcome>>;
  /** Every settings key this build has, each with its three levels (UI-08). */
  listSettings: (request: {
    readonly projectId: string;
  }) => Promise<RpcResult<readonly SettingRow[]>>;
  /** Write one setting at one scope, or clear it with a `null` value. */
  writeSetting: (
    request: SettingWriteRequest,
  ) => Promise<RpcResult<SettingWriteOutcome>>;
  /** The four counters that tell a blocked backend from a slow renderer. */
  getHealth: () => Promise<RpcResult<HealthOutcome>>;
  /** Where the data lives and how much of each retention cap it uses
   *  (DEPLOY-02, D-19, D-25). No path, no bytes. */
  getStorageFootprint: () => Promise<RpcResult<StorageFootprint>>;
  /** Begin one retroactive scan of already-captured traffic (FIND-03). */
  startScan: (request: {
    readonly operatorFilter: string;
  }) => Promise<RpcResult<StartScanOutcome>>;
  /** This project's active scan, or `null` when there is none — a real state
   *  and not a failure, and the one that puts the start form on screen. */
  getScanStatus: () => Promise<RpcResult<ScanStatusPayload | null>>;
  /** COMPAT-02's report. Reachable on a REFUSING build, where it is one of only
   *  two endpoints that exist. */
  getCompat: () => Promise<RpcResult<CompatReport>>;
  /** Subscribe to the one backend event, RETURNING THE STOP HANDLE. */
  subscribeInvalidation: (
    handler: (summary: InvalidationSummary) => void,
  ) => InvalidationSubscription;
};

// ---------------------------------------------------------------------------
// THE FACTORY
// ---------------------------------------------------------------------------

/** The race's loser, as a value no endpoint can return. A unique symbol rather
 *  than a sentinel object, so the narrowing below is a type-level fact. */
const TIMED_OUT = Symbol("defminer:rpc-timeout");

function failure(
  reason: RpcReason,
  versions: ContractVersions | null,
): RpcFailure {
  return { ok: false, reason, versions };
}

/**
 * Build the client over a Caido frontend SDK.
 *
 * A FACTORY OVER THE SDK, NOT A MODULE SINGLETON. The SDK is a per-instance
 * object Caido hands to `init()`; a module-level singleton would be a second
 * source of truth for it and would make every consumer untestable without a
 * real Caido — the same argument `index.ts` gives for providing rather than
 * importing it.
 */
export function createBackendClient(sdk: DefMinerBackendSdk): BackendClient {
  let mismatch: ContractVersions | null = null;

  /**
   * Run one call under the timeout, converting both failure modes to values.
   *
   * The losing promise is given its own catch handler: `Promise.race` leaves
   * the loser unhandled, and a late rejection from a call the timeout already
   * answered would surface as an unhandled rejection rather than as anything a
   * caller could act on.
   */
  const call = async <TValue>(
    operation: () => Promise<TValue>,
  ): Promise<RpcResult<TValue>> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const pending = operation();
      pending.catch(() => undefined);
      const expiry = new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), RPC_TIMEOUT_MS);
      });
      const settled = await Promise.race([pending, expiry]);
      if (settled === TIMED_OUT) return failure("rpc-timeout", null);
      return { ok: true, value: settled };
    } catch {
      // THE REJECTION VALUE IS DISCARDED, DELIBERATELY AND WITHOUT INSPECTION.
      // An error crossing the RPC boundary can quote target-controlled bytes —
      // a URL, a response fragment — and 05-UI-SPEC.md's copywriting rule bans
      // an interpolated target-controlled string inside a sentence. Reading the
      // message to "make a better error" is how that ban is broken by someone
      // being helpful.
      return failure("rpc-rejected", null);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };

  /** Every data read goes through this. A recorded mismatch answers BEFORE the
   *  endpoint is called — the point of the check is that the stale bundle stops
   *  reading, not that it reports while reading. */
  const guarded = async <TValue>(
    operation: () => Promise<TValue>,
  ): Promise<RpcResult<TValue>> => {
    if (mismatch !== null) {
      return failure("contract-version-mismatch", mismatch);
    }
    return call(operation);
  };

  return {
    checkContractVersion: async () => {
      const result = await call(() => sdk.backend.getContractVersion());
      if (!result.ok) return result;
      if (result.value !== FRONTEND_CONTRACT_VERSION) {
        mismatch = {
          frontend: FRONTEND_CONTRACT_VERSION,
          backend: result.value,
        };
        return failure("contract-version-mismatch", mismatch);
      }
      mismatch = null;
      return result;
    },

    contractMismatch: () => mismatch,

    listArtifactsPage: (request) =>
      guarded(() => sdk.backend.listArtifactsPage(request)),

    listObservationsPage: (request) =>
      guarded(() => sdk.backend.listObservationsPage(request)),

    countInventory: (request) =>
      guarded(() => sdk.backend.countInventory(request)),

    getArtifactAnalysis: (request) =>
      guarded(() => sdk.backend.getArtifactAnalysis(request)),

    // GUARDED like every other read, and it is a WRITE. A stale bundle whose
    // contract version disagrees must not issue a state transition: it would be
    // reading the outcome shape with the old expectations, on the one surface
    // where showing a state that was not persisted is the whole hazard.
    retryAnalysis: (request) =>
      guarded(() => sdk.backend.retryAnalysis(request)),

    // GUARDED, and an export is the LAST thing a bundle known to be misreading
    // the contract should take: it reads every row the operator can reach and
    // lands the result on their disk, where it outlives the session and nothing
    // on its face says which version wrote it.
    exportInventory: (request) =>
      guarded(() => sdk.backend.exportInventory(request)),

    listSettings: (request) => guarded(() => sdk.backend.listSettings(request)),

    // GUARDED, AND IT IS THE WRITE THAT MOST NEEDS TO BE. A stale bundle
    // misreading this outcome shape reports "saved" for a retention bound the
    // backend refused — and the operator then believes a bound is in force that
    // is not, about the one mechanism in this plugin that deletes their history.
    writeSetting: (request) => guarded(() => sdk.backend.writeSetting(request)),

    getHealth: () => guarded(() => sdk.backend.getHealth()),

    // GUARDED like every other read. A stale bundle misreading this shape would
    // render a count against the wrong cap — a number the operator uses to
    // decide whether to raise the bound on the one mechanism that deletes their
    // history.
    getStorageFootprint: () => guarded(() => sdk.backend.getStorageFootprint()),

    // GUARDED, AND IT IS A WRITE. A stale bundle whose contract version
    // disagrees must not start a scan: it would be reading the outcome shape
    // with the old expectations on a call that begins hours of work against the
    // operator's stored traffic, and a refusal it misread would look like a
    // start that succeeded.
    startScan: (request) => guarded(() => sdk.backend.startScan(request)),

    // GUARDED like every other read. The payload's `null` half and its object
    // half render OPPOSITE surfaces, so a bundle known to be misreading the
    // contract must stop rather than pick one.
    getScanStatus: () => guarded(() => sdk.backend.getScanStatus()),

    // NOT GUARDED BY THE MISMATCH, AND THAT IS THE WHOLE POINT OF IT. A
    // contract-version mismatch is one of the things somebody opens the
    // compatibility report to diagnose; refusing to answer it because the
    // versions disagree would withhold the diagnosis at exactly the moment it is
    // needed. It is also the endpoint a REFUSING build still registers, where
    // `getContractVersion` does not exist at all — so the guard could never have
    // been satisfied there anyway. Still under the timeout: a call that never
    // settles renders as a surface that never appears.
    getCompat: () => call(() => sdk.backend.getCompat()),

    // NOT guarded by the mismatch, and not by a timeout either. Subscribing is
    // not a read: it delivers a summary of four scalars whose shape a version
    // bump would have to change to break, and a coalescer that has stopped
    // listening cannot even tell the operator that the counts have stopped
    // being live.
    subscribeInvalidation: (handler) =>
      sdk.backend.onEvent(INVALIDATION_EVENT, handler),
  };
}
