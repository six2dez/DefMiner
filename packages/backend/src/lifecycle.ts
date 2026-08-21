// packages/backend/src/lifecycle.ts — CORE-09. The two events that can silently
// corrupt everything else: a project switch, and a project going away.
//
// ===========================================================================
// WHY THIS FILE EXISTS
// ===========================================================================
// `sdk.meta.db()` is ONE database for the plugin across EVERY project. It is
// never garbage-collected by Caido, is not deleted when a project is deleted,
// and survives a force-reinstall. So a project switch that does not cancel
// in-flight work and swap the active id writes client A's artifacts into a
// session where the operator is looking at client B. `project_id` being part of
// every primary key is the second line of defence; this file is the first.
//
// ===========================================================================
// `null` IS A STATE, NOT A DEFENSIVE CHECK
// ===========================================================================
// The SDK declares the callback as
// `(sdk, project: Project | null) => MaybePromise<void>` and its own doc comment
// says why: "It can happen that the project is null if the user deleted the
// currently selected one." That is a thing an operator does, not a thing that
// cannot happen — so it gets a real branch with real consequences rather than a
// guard that returns early.
//
// It is worth being honest about what that branch buys. A Caido instance with no
// project selected fails ALL proxying and never fires `onInterceptResponse` at
// all (Phase 0, measured), so the hook was never going to be handed anything in
// that state. The branch exists so the plugin's REPORTED state is honest and so
// nothing queued under the deleted project survives into whatever is selected
// next — not to keep it working.
//
// ===========================================================================
// THE ORDERING IS THE DESIGN, AND IT IS SYNCHRONOUS FOR A REASON
// ===========================================================================
//   1. ABORT   the in-flight walk, with a reason naming the change.
//   2. DISCARD every queued entry — see {@link applyProjectChange}.
//   3. SWAP    the active project id (and bump the epoch).
//   4. ALLOW   admission again, by installing a fresh controller.
//
// `applyProjectChange` contains NO `await`. That is the whole guarantee: this
// runtime has one thread, so with no suspension point between step 1 and step 4
// there is no window in which a write can observe a half-applied swap. An async
// version of this function would have to defend against interleaving at every
// step; a synchronous one cannot be interleaved at all.
//
// The database handle is NOT reset here, and that is a decision rather than an
// omission: `sdk.meta.db()` is one database for the plugin across every project,
// `index.ts` resolves it once and hands that object to the consumer and to both
// read RPCs, and isolation is `project_id` in the key. See store/db.ts.
//
// ===========================================================================
// ISOLATION IS NOT OPTIONAL, SO ITS INSTALLATION IS NOT BEST-EFFORT
// ===========================================================================
// If `sdk.events.onProjectChange` cannot be registered, this file cannot ever
// learn that the operator switched project. `activeProjectId` stays pinned to
// whatever boot resolved, `epoch` never moves, and EVERY re-check the consumer
// makes against it becomes a constant `true` — so the plugin keeps writing, and
// writes project B's bundles and URLs keyed on project A. That is the exact
// Information Disclosure this file exists to prevent, arrived at by a route that
// leaves every downstream guard looking healthy.
//
// So a failed registration DISARMS the pipeline rather than degrading it: the
// active id goes to `null` (admissionAllowed() -> false), the current token is
// aborted, and `projectChangeArmed: false` comes back so `init()` can refuse to
// register the hook at all and say why on getStatus(). A plugin that cannot
// notice a switch is not "still useful for the project it resolved" — it cannot
// tell whether that project is still the current one.
//
// NOT DONE HERE, DELIBERATELY: a `scan_state` row left `running` or `pending` by
// a killed runtime is NOT reconciled. That is ERR-02 in Phase 2, which owns
// stale-job detection; the column already exists, and Phase 1's restart
// obligation is only that artifacts persist and the plugin re-attaches.

import type { AbortLike } from "@defminer/engine/pipeline";
import type { BoundedQueue } from "@defminer/engine/queue";

import type { EnqueueClock } from "./hooks/passive";
// Redact-then-truncate. Error text on this path routinely quotes the thing the
// plugin was working on, and the thing this pipeline works on is a target URL
// (T-01-26). The host log is a channel the threat model covers too, not only the
// RPC projection.
import { describeError } from "./telemetry";

/**
 * The narrow slice of `Project` this file reads.
 *
 * Deliberately not the SDK's `Project`: the only thing lifecycle needs is the
 * id, and a narrow parameter is what lets the fake in
 * `test/fixtures/fake-sdk.ts` stay small enough to read.
 */
export type LifecycleProject = { getId(): string };

/** What `sdk.events.onProjectChange` hands us, `null` included. */
export type ProjectOrNull = LifecycleProject | null | undefined;

export type LifecycleSdk = {
  projects: { getCurrent(): Promise<unknown> };
  events: {
    onProjectChange(
      fn: (sdk: unknown, project: ProjectOrNull) => unknown,
    ): void;
  };
  console: { log(msg: string): void };
};

export type LifecycleDeps = {
  /** Drained on every change. Entries queued under the previous project are
   *  DISCARDED rather than re-attributed (decision P5-D2). */
  queue: BoundedQueue;
  /** Enqueue instants for those entries. Cleared with them, or the map keeps
   *  timestamps for ids nothing will ever take. */
  enqueuedAt: EnqueueClock;
  log?: (msg: string) => void;
};

/** What one applied change did, for the log line and for the specs. */
export type ProjectChangeSummary = {
  previous: string | null;
  next: string | null;
  /** Queue entries thrown away because they belong to `previous`. */
  discarded: number;
};

/**
 * What `installLifecycle` resolved, plus the ONE fact `init()` has to branch on.
 *
 * `projectChangeArmed` is false when `sdk.events.onProjectChange` could not be
 * registered. It is returned rather than logged because a log line is not a
 * control-flow signal: the caller has to REFUSE, and it can only refuse if it is
 * told. See this file's header for what an unarmed lifecycle costs.
 */
export type LifecycleInstallation = ProjectChangeSummary & {
  projectChangeArmed: boolean;
};

/** A cancellation token in the shape `walk()` reads.
 *
 *  Structural rather than `AbortController`: Phase 0's capability probe
 *  enumerated this runtime's globals and `AbortController` was NOT among them,
 *  so binding the lifecycle to it would be an assumption dressed as a type. */
type Controller = { aborted: boolean; reason?: unknown };

let deps: LifecycleDeps | undefined;
let activeProjectId: string | null = null;
let controller: Controller = { aborted: false };
/** Bumped by every applied change. The consumer captures it once per iteration
 *  and re-checks it before each write, which is how a change that lands while
 *  the consumer is mid-`await` cannot produce a row under the old project. */
let epoch = 0;

function log(msg: string): void {
  try {
    deps?.log?.("[defminer] " + msg.slice(0, 200));
  } catch {
    /* sdk.console.log can throw during teardown; nothing left to do */
  }
}

/** The active project id, or `null` when none is selected.
 *
 *  `null` and not `""`: an empty string is a project id that happens to be
 *  blank, which is a different claim from "there is no project". */
export function currentProjectId(): string | null {
  return activeProjectId;
}

/** The cancellation token in force RIGHT NOW.
 *
 *  Read once per walk, never cached across walks: `applyProjectChange` aborts
 *  the current token and then installs a FRESH one, so a walk that captured the
 *  old object still sees `aborted === true` at its next window boundary while
 *  work started afterwards runs uncancelled. */
export function currentSignal(): AbortLike {
  return controller;
}

/** How many project changes have been applied. See {@link epoch}. */
export function projectEpoch(): number {
  return epoch;
}

/**
 * May the hook admit anything right now?
 *
 * FALSE while no project is active, so there is no window in which a write can
 * land with a stale or absent id — the check is at the mouth of the pipeline
 * rather than at the four write sites downstream.
 */
export function admissionAllowed(): boolean {
  return activeProjectId !== null;
}

/** Test seam. Module state is process-global, so a spec that did not reset it
 *  would inherit the previous case's project, controller and epoch. */
export function resetLifecycleForTest(): void {
  deps = undefined;
  activeProjectId = null;
  controller = { aborted: false };
  epoch = 0;
}

/**
 * Apply one project change. SYNCHRONOUS — see this file's header.
 *
 * Exported so `installLifecycle` can route BOTH the initial resolution and every
 * later event through the identical code path. Two paths would drift, and the
 * one that drifts is always the one nobody drives in a test.
 */
export function applyProjectChange(
  project: ProjectOrNull,
): ProjectChangeSummary {
  const previous = activeProjectId;
  const next =
    project === null || project === undefined ? null : String(project.getId());

  // --- 1. ABORT -------------------------------------------------------------
  // The reason NAMES the transition. `walk` renders it into the `Cancelled`
  // message, and HANDLER_ERROR_SURFACED is "neither" — Caido writes down nothing
  // of its own — so this string is the entire record of why a walk stopped.
  controller.aborted = true;
  controller.reason =
    "project change: " + (previous ?? "<none>") + " -> " + (next ?? "<none>");

  // --- 2. DISCARD -----------------------------------------------------------
  // Every queued entry was admitted against the PREVIOUS project's scope, so
  // re-attributing it would import one client's traffic into another's view —
  // the exact failure this isolation exists to prevent (decision P5-D2).
  let discarded = 0;
  if (deps !== undefined) {
    for (;;) {
      const entry = deps.queue.take();
      if (entry === undefined) break;
      deps.enqueuedAt.delete(entry.id);
      discarded += 1;
    }
    // Anything still stamped belongs to an entry the queue already dropped at
    // cap; it would never be taken and its timestamp would leak.
    deps.enqueuedAt.clear();
  }

  // --- 3. SWAP --------------------------------------------------------------
  activeProjectId = next;
  epoch += 1;

  // --- 4. ALLOW -------------------------------------------------------------
  // LAST. Admission is gated on the active id, and in-flight work is gated on
  // the token installed here — so nothing that started before this line can
  // write after it under the old project.
  controller = { aborted: false };

  return { previous, next, discarded };
}

/**
 * Resolve the current project and start listening for changes.
 *
 * ORDER: resolve FIRST, register SECOND. The other way round, an event arriving
 * while `getCurrent()` is still in flight would be applied and then overwritten
 * by the stale initial answer — which is the one shape of this bug that leaves
 * the plugin pointing at a project the operator has already left.
 *
 * `init()` calls this after `migrate()` and before the ready latch, so no
 * intercept event can arrive while the project id is unresolved.
 */
export async function installLifecycle(
  sdk: LifecycleSdk,
  d: LifecycleDeps,
): Promise<LifecycleInstallation> {
  deps = d;

  // The initial resolution goes through applyProjectChange, so `init()` on an
  // instance with NO project selected reaches exactly the state an explicit null
  // change reaches — not a similar one.
  let initial: ProjectOrNull = null;
  try {
    initial = (await sdk.projects.getCurrent()) as ProjectOrNull;
  } catch (e) {
    // A failed read is "no project", not a crash: with none selected the proxy
    // fails every request anyway, so the honest state is the null one.
    log("projects.getCurrent() failed: " + describeError(e));
    initial = null;
  }
  const summary = applyProjectChange(initial);

  let projectChangeArmed = true;
  try {
    sdk.events.onProjectChange((_sdk: unknown, project: ProjectOrNull) => {
      const applied = applyProjectChange(project);
      log(
        "project change " +
          (applied.previous ?? "<none>") +
          " -> " +
          (applied.next ?? "<none>") +
          "; discarded " +
          String(applied.discarded) +
          " queued entries admitted under the previous project",
      );
    });
  } catch (e) {
    // Registration failing must not take init() down — but it must not be
    // downgraded to a log line either. Without this event the active id can
    // silently become the WRONG id: nothing here would learn about a switch,
    // `epoch` would never move, and every epoch re-check in the consumer would
    // be a constant `true` while the pipeline wrote the new project's traffic
    // under the old project's key.
    //
    // So ISOLATION FAILING DISARMS INGESTION, in this exact order:
    projectChangeArmed = false;
    activeProjectId = null; // admissionAllowed() -> false
    controller.aborted = true;
    controller.reason = "project isolation could not be installed";
    log(
      "onProjectChange could not be registered (" +
        describeError(e) +
        ") — ingestion is DISABLED because project isolation cannot be " +
        "maintained",
    );
  }

  log(
    projectChangeArmed
      ? "lifecycle installed; active project " +
          (summary.next ?? "<none>") +
          (summary.next === null
            ? " — nothing will be admitted until a project is selected"
            : "")
      : "lifecycle NOT installed; ingestion disabled",
  );
  // `next` reports where the plugin ACTUALLY ended up, which on the disarmed
  // path is `null` and not the id boot happened to resolve.
  return { ...summary, next: activeProjectId, projectChangeArmed };
}
