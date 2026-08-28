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
// WHY ONLY FIVE OF THE EIGHT ENDPOINTS ARE WRAPPED
// ===========================================================================
// `getStatus`, `getCompat`, `getArtifacts` and `getObservations` are registered
// by the backend and are deliberately NOT wrapped here (decision P5-D52).
// Wrapping one means restating its payload type in this package — `StatusPayload`
// alone is eleven fields over `SlimStatus` — and a restated type with no
// consumer is a second copy that drifts before anybody reads it. The Health tab
// (plan 05-12) is the first consumer of the status pair and wraps them then,
// against a shape it actually renders. The two unpaginated reads are the
// compatibility smoke test's and are superseded on this page by the paged pair.

import type {
  InvalidationSummary,
  PageRequest,
  PageResponse,
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
 */
export const FRONTEND_CONTRACT_VERSION = 1;

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

    // NOT guarded by the mismatch, and not by a timeout either. Subscribing is
    // not a read: it delivers a summary of four scalars whose shape a version
    // bump would have to change to break, and a coalescer that has stopped
    // listening cannot even tell the operator that the counts have stopped
    // being live.
    subscribeInvalidation: (handler) =>
      sdk.backend.onEvent(INVALIDATION_EVENT, handler),
  };
}
