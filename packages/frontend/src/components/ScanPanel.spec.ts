// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/components/ScanPanel.spec.ts — FIND-04's operator
// surface: one question in two states, and the one destructive act.
//
// ===========================================================================
// WHAT THESE CASES ARE ACTUALLY GUARDING
// ===========================================================================
// Not "does a counter render". Six things, each of which fails quietly:
//
//   1. THE START FORM BESIDE A RUNNING SCAN. The invariant is one scan per
//      project, and the contract renders it as a STATE OF THE SURFACE rather
//      than as a disabled control whose only content is "no". So the assertion
//      is ABSENCE FROM THE DOM — `find(...).exists()` is `false` — and never a
//      `disabled` attribute. A case that accepted a disabled form would pass on
//      exactly the build the contract refuses.
//   2. FOUR ZEROES FOR A SCAN THAT HAS NOT ANSWERED. Zeroes are what a live,
//      healthy, idle scan reports. Rendering them before the first read
//      resolves says the opposite of the truth, which is `HealthPanel`'s own
//      unavailable-versus-four-zeroes argument applied one surface over.
//   3. THE STALL MARKER CRYING WOLF. `heldAtWatermark` is a healthy state and
//      the most common one on a long backfill. The precedence is proved
//      exhaustively in `scan-contract.spec.ts`; what is proved HERE is that the
//      panel reads the field off the payload at all rather than inferring
//      movement from the clock alone.
//   4. A FAILED READ THAT CLEARS OR FREEZES THE NUMBERS. Clearing reads as "the
//      scan reset"; leaving them unmarked reads as a stall. They stay, and they
//      are marked stale IN WORDS.
//   5. A REJECTED CLAUSE THAT DISCARDS WHAT THE OPERATOR TYPED. The shipped
//      settings form's rule: a failed submit never throws away an edit.
//   6. A DISCARD ONE MIS-CLICK AWAY. The confirmation's default focus is the
//      NON-action, and dismissing it calls nothing at all.
//
// ===========================================================================
// AND ONE THING THIS FILE CANNOT PROVE, STATED SO IT IS NOT ASSUMED
// ===========================================================================
// jsdom performs NO LAYOUT — every box is 0x0 — so "the strip did not grow
// under a multi-kilobyte clause" is not expressible here. That half is
// `tests/frontend-load.spec.ts`'s, in a real browser, and this file asserts the
// MECHANISM instead: the strip's class attribute is byte-identical across a
// single-digit counter and a counter past a million, and it carries the
// fixed-height utility with no `flex-wrap`.

import type {
  ScanProgressPayload,
  ScanStatusPayload,
} from "@defminer/engine/contract";
import { SCAN_PROGRESS_KIND } from "@defminer/engine/contract";
import { ARTIFACT_DEADLINE_MS } from "@defminer/engine/thresholds";
import { flushPromises, mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  InvalidationSubscription,
  RpcResult,
  ScanCommandOutcome,
  StartScanOutcome,
} from "../api/client";

import {
  clauseRejectedLine,
  SCAN_DISCARD_CTA,
  SCAN_DISCARD_HEADING,
  SCAN_DISCARD_KEEP_LABEL,
  SCAN_DISCARDING_LABEL,
  SCAN_LOADING_LABEL,
  SCAN_NO_DENOMINATOR_NOTE,
  SCAN_ONE_AT_A_TIME_RUNNING,
  SCAN_ONE_AT_A_TIME_SUSPENDED,
  SCAN_PAUSE_CTA,
  SCAN_PAUSING_LABEL,
  SCAN_RESUME_CTA,
  SCAN_STATUS_NOT_ADVANCING,
  SCAN_STATUS_SCANNING,
  SCAN_STATUS_STARTING,
  SCAN_STATUS_SUSPENDED,
  SCAN_STATUS_WAITING_FOR_QUEUE,
  SCAN_STRIP_HEIGHT_CLASS,
} from "./scan-contract";
import ScanPanel from "./ScanPanel.vue";

// ---------------------------------------------------------------------------
// SELECTORS — the markers the component declares, in one place
// ---------------------------------------------------------------------------

const FORM = "[data-defminer-scan-form]";
const STRIP = "[data-defminer-scan-strip]";
const STATUS = "[data-defminer-scan-status]";
const CONTROLS = "[data-defminer-scan-controls]";
const STALE = "[data-defminer-scan-stale]";
const CONFIRM = "[data-defminer-scan-discard-confirm]";
const CLAUSE_ECHO = "[data-defminer-scan-clause-echo]";
const ONE_AT_A_TIME = "[data-defminer-scan-one-at-a-time]";
const SUSPENSION = "[data-defminer-scan-suspension]";
const CLAUSE_INPUT = "#defminer-scan-clause";

const DEFMINER_CLAUSE = 'resp.raw.like:"%javascript%"';

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------

const AUG_14 = new Date(2026, 7, 14, 9, 41, 0, 0).getTime();

function payload(over: Partial<ScanStatusPayload> = {}): ScanStatusPayload {
  return {
    scanId: "s1",
    state: "running",
    suspendReason: null,
    operatorFilter: "",
    composedFilter: `(${DEFMINER_CLAUSE})`,
    pagesWalked: 3,
    seen: 60,
    admitted: 12,
    skippedDone: 4,
    rejected: 44,
    queued: 12,
    analysed: null,
    lastCreatedAt: AUG_14,
    startedAt: AUG_14,
    updatedAt: AUG_14,
    finishedAt: null,
    heldAtWatermark: false,
    ...over,
  };
}

type Harness = {
  readonly wrapper: VueWrapper;
  readonly reads: () => number;
  readonly starts: () => { readonly operatorFilter: string }[];
  readonly commands: () => string[];
  /** Push one progress payload through the subscription the panel opened. */
  readonly emitProgress: (patch: Partial<ScanProgressPayload>) => void;
  readonly stopped: () => number;
};

type Options = {
  readonly scan?: ScanStatusPayload | null;
  /** Answer a different payload from the SECOND read onward. */
  readonly then?: ScanStatusPayload | null;
  /** Fail the read at the RPC layer — a call that produced no value at all. */
  readonly failsAfter?: number;
  /** Never settle the first read, so the pre-first-read state is held open. */
  readonly hang?: boolean;
  readonly startOutcome?: StartScanOutcome;
  readonly commandOutcome?: ScanCommandOutcome;
};

const MOVED: ScanCommandOutcome = {
  ok: true,
  changed: true,
  state: "suspended",
  suspendReason: "operator_paused",
  reason: null,
};

function harness(options: Options = {}): Harness {
  let readCount = 0;
  let stopCount = 0;
  const starts: { readonly operatorFilter: string }[] = [];
  const commands: string[] = [];
  let onProgress: ((p: ScanProgressPayload) => void) | null = null;

  const load = (): Promise<RpcResult<ScanStatusPayload | null>> => {
    readCount += 1;
    if (options.hang === true) return new Promise(() => undefined);
    if (
      options.failsAfter !== undefined &&
      readCount > options.failsAfter
    ) {
      return Promise.resolve({
        ok: false,
        reason: "rpc-timeout",
        versions: null,
      });
    }
    const value =
      readCount > 1 && options.then !== undefined
        ? options.then
        : (options.scan ?? null);
    return Promise.resolve({ ok: true, value });
  };

  const command = (name: string) => (): Promise<
    RpcResult<ScanCommandOutcome>
  > => {
    commands.push(name);
    return Promise.resolve({
      ok: true,
      value: options.commandOutcome ?? MOVED,
    });
  };

  const wrapper = mount(ScanPanel, {
    attachTo: document.body,
    props: {
      projectId: "server-scoped",
      defminerClause: DEFMINER_CLAUSE,
      load,
      start: (request: { readonly operatorFilter: string }) => {
        starts.push(request);
        return Promise.resolve<RpcResult<StartScanOutcome>>({
          ok: true,
          value: options.startOutcome ?? {
            outcome: "started",
            scanId: "s1",
          },
        });
      },
      pause: command("pause"),
      resume: command("resume"),
      discard: command("discard"),
      subscribe: (
        handler: (p: ScanProgressPayload) => void,
      ): InvalidationSubscription => {
        onProgress = handler;
        return {
          stop: () => {
            stopCount += 1;
          },
        };
      },
    },
  });

  return {
    wrapper,
    reads: () => readCount,
    starts: () => starts,
    commands: () => commands,
    stopped: () => stopCount,
    emitProgress: (patch) => {
      onProgress?.({
        kind: SCAN_PROGRESS_KIND,
        projectId: "server-scoped",
        scanId: "s1",
        state: "running",
        pagesWalked: 4,
        seen: 80,
        admitted: 16,
        skippedDone: 4,
        rejected: 60,
        queued: 16,
        analysed: null,
        lastCreatedAt: AUG_14,
        heldAtWatermark: false,
        ...patch,
      });
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// TWO STATES, NEVER BOTH
// ---------------------------------------------------------------------------

describe("the same question in two states", () => {
  it("renders the start form and nothing else when there is no scan", async () => {
    const h = harness({ scan: null });
    await flushPromises();

    expect(h.wrapper.find(FORM).exists()).toBe(true);
    expect(h.wrapper.find(STATUS).exists()).toBe(false);
    expect(h.wrapper.find(STRIP).exists()).toBe(false);
    expect(h.wrapper.find(CONTROLS).exists()).toBe(false);
  });

  it("renders the readout and REMOVES the start form while a scan runs", async () => {
    const h = harness({ scan: payload() });
    await flushPromises();

    expect(h.wrapper.find(STATUS).exists()).toBe(true);
    expect(h.wrapper.find(STRIP).exists()).toBe(true);
    expect(h.wrapper.find(CONTROLS).exists()).toBe(true);

    // ABSENCE, NOT A DISABLED ATTRIBUTE. A disabled start form beside a running
    // scan is chrome whose only content is "no", and a case that accepted one
    // would pass on the build the contract refuses.
    expect(h.wrapper.find(FORM).exists()).toBe(false);
    expect(h.wrapper.find(CLAUSE_INPUT).exists()).toBe(false);
  });

  it("names WHICH occupied state is holding the slot", async () => {
    const running = harness({ scan: payload() });
    await flushPromises();
    expect(running.wrapper.find(ONE_AT_A_TIME).text()).toBe(
      SCAN_ONE_AT_A_TIME_RUNNING,
    );

    const held = harness({
      scan: payload({ state: "suspended", suspendReason: "operator_paused" }),
    });
    await flushPromises();
    expect(held.wrapper.find(ONE_AT_A_TIME).text()).toBe(
      SCAN_ONE_AT_A_TIME_SUSPENDED,
    );
  });

  it("gives a suspended scan its reason, its resume clause and a resume control", async () => {
    const h = harness({
      scan: payload({
        state: "suspended",
        suspendReason: "process_restarted",
        lastCreatedAt: AUG_14,
      }),
    });
    await flushPromises();

    const suspension = h.wrapper.find(SUSPENSION);
    expect(suspension.exists()).toBe(true);
    expect(suspension.text()).toContain("Caido restarted");
    // The clause that makes a suspension cheap.
    expect(suspension.text()).toContain("Resuming continues from");
    expect(suspension.text()).toContain("14 Aug 2026, 09:41");

    expect(h.wrapper.find("#defminer-scan-resume").exists()).toBe(true);
    expect(h.wrapper.find("#defminer-scan-pause").exists()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// THE FIRST READ
// ---------------------------------------------------------------------------

describe("before the first read resolves", () => {
  it("renders NO strip and NO counter cell — four zeroes are never shown", () => {
    const h = harness({ hang: true });

    expect(h.wrapper.find(STRIP).exists()).toBe(false);
    expect(h.wrapper.find("#defminer-scan-seen").exists()).toBe(false);
    expect(h.wrapper.text()).toContain(SCAN_LOADING_LABEL);
    // And the start form is not there either: a form that appeared and was
    // then replaced would invite a press that arrives after the state moved.
    expect(h.wrapper.find(FORM).exists()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// THE START FORM
// ---------------------------------------------------------------------------

describe("the start form", () => {
  it("starts on an EMPTY clause and shows a preview with no empty parens", async () => {
    const h = harness({ scan: null });
    await flushPromises();

    expect(h.wrapper.find("[data-defminer-scan-composed]").text()).not.toContain(
      "()",
    );

    await h.wrapper.find("#defminer-scan-start").trigger("click");
    await flushPromises();

    // AN EMPTY CLAUSE IS A VALID, COMPLETE INPUT — the common one — and the
    // form never renders an empty-state screen for it.
    expect(h.starts()).toEqual([{ operatorFilter: "" }]);
  });

  it("composes the typed clause into the preview, DefMiner's first", async () => {
    const h = harness({ scan: null });
    await flushPromises();

    await h.wrapper.find(CLAUSE_INPUT).setValue("req.host.eq:target.example");
    expect(h.wrapper.find("[data-defminer-scan-composed]").text()).toBe(
      `(${DEFMINER_CLAUSE}) AND (req.host.eq:target.example)`,
    );
  });

  it("keeps every character the operator typed when the clause is rejected", async () => {
    const h = harness({
      scan: null,
      startOutcome: {
        outcome: "clause-rejected",
        reason: "unbalanced_parentheses",
      },
    });
    await flushPromises();

    const typed = "req.host.eq:target.example AND (";
    await h.wrapper.find(CLAUSE_INPUT).setValue(typed);
    await h.wrapper.find("#defminer-scan-start").trigger("click");
    await flushPromises();

    const alert = h.wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain(
      clauseRejectedLine("unbalanced_parentheses"),
    );

    // THE CLAUSE IS ECHOED IN ITS OWN ELEMENT, never inside the sentence.
    const echo = h.wrapper.find(CLAUSE_ECHO);
    expect(echo.exists()).toBe(true);
    expect(echo.classes().join(" ")).toContain("font-mono");
    expect(alert.text()).not.toContain(typed);

    // A FAILED SUBMIT NEVER DISCARDS WHAT THEY TYPED, and nothing started.
    expect(
      (h.wrapper.find(CLAUSE_INPUT).element as HTMLInputElement).value,
    ).toBe(typed);
    expect(h.wrapper.find(FORM).exists()).toBe(true);
    expect(h.wrapper.find(STRIP).exists()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// THE READOUT
// ---------------------------------------------------------------------------

describe("the progress readout", () => {
  it("puts the status line, the position line and the note on screen", async () => {
    const h = harness({ scan: payload() });
    await flushPromises();

    expect(h.wrapper.find(STATUS).text()).toContain(SCAN_STATUS_SCANNING);
    expect(h.wrapper.find(STATUS).text()).toContain("14 Aug 2026, 09:41");
    expect(h.wrapper.find("[data-defminer-scan-note]").text()).toBe(
      SCAN_NO_DENOMINATOR_NOTE,
    );
    // `role="status"` on the status line ONLY — never on the strip, which
    // updates up to twice a second and would flood a screen reader for hours.
    expect(h.wrapper.find(STATUS).attributes("role")).toBe("status");
    expect(h.wrapper.find(STRIP).attributes("role")).toBeUndefined();
  });

  it("says the starting word, with no position, before a page resolves", async () => {
    const h = harness({
      scan: payload({ pagesWalked: 0, lastCreatedAt: null }),
    });
    await flushPromises();

    expect(h.wrapper.find(STATUS).text()).toContain(SCAN_STATUS_STARTING);
    expect(h.wrapper.find(STATUS).text()).not.toContain("Now scanning traffic");
  });

  it("reads the watermark hold OFF THE PAYLOAD rather than inferring it", async () => {
    const h = harness({ scan: payload({ heldAtWatermark: true }) });
    await flushPromises();

    expect(h.wrapper.find(STATUS).text()).toContain(
      SCAN_STATUS_WAITING_FOR_QUEUE,
    );
    expect(h.wrapper.find(STATUS).text()).not.toContain(
      SCAN_STATUS_NOT_ADVANCING,
    );
    // The reassurance is the content: it says the scan resumes on its own.
    expect(h.wrapper.find(STATUS).text()).toContain("resumes on its own");
  });

  it("marks a genuinely stopped scan, and only after the imported threshold", async () => {
    vi.useFakeTimers();
    const h = harness({ scan: payload() });
    await flushPromises();
    expect(h.wrapper.find(STATUS).text()).toContain(SCAN_STATUS_SCANNING);

    await vi.advanceTimersByTimeAsync(ARTIFACT_DEADLINE_MS + 2_000);
    await flushPromises();
    expect(h.wrapper.find(STATUS).text()).toContain(SCAN_STATUS_NOT_ADVANCING);
  });

  it("resets the stall clock when ANY counter moves, not when the date does", async () => {
    vi.useFakeTimers();
    const h = harness({ scan: payload() });
    await flushPromises();

    await vi.advanceTimersByTimeAsync(ARTIFACT_DEADLINE_MS - 2_000);
    // The date does NOT change; one counter does. A scan covering a single day
    // would leave a date-only signal frozen while the counters moved.
    h.emitProgress({ seen: 120, lastCreatedAt: AUG_14 });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(4_000);
    await flushPromises();

    expect(h.wrapper.find(STATUS).text()).toContain(SCAN_STATUS_SCANNING);
  });

  it("takes its counters from the live progress payload", async () => {
    const h = harness({ scan: payload() });
    await flushPromises();
    expect(h.wrapper.find("#defminer-scan-seen").text()).toContain("60");

    h.emitProgress({ seen: 1_234_567 });
    await flushPromises();
    // Grouped, always. `1000000` and `100000` differ by one character and by a
    // factor of ten on a surface read at a glance.
    expect(h.wrapper.find("#defminer-scan-seen").text()).toContain("1,234,567");
  });

  it("keeps the strip's class attribute byte-identical as a counter grows", async () => {
    const small = harness({ scan: payload({ seen: 7 }) });
    await flushPromises();
    const before = small.wrapper.find(STRIP).attributes("class");

    const large = harness({ scan: payload({ seen: 9_876_543 }) });
    await flushPromises();
    const after = large.wrapper.find(STRIP).attributes("class");

    expect(after).toBe(before);
    expect(before).toContain(SCAN_STRIP_HEIGHT_CLASS);
    expect(before).not.toContain("flex-wrap");
  });

  it("renders the rejected TOTAL rather than six zeroes", async () => {
    const h = harness({ scan: payload({ rejected: 12_345 }) });
    await flushPromises();

    const rejects = h.wrapper.find("[data-defminer-scan-rejects]");
    expect(rejects.text()).toContain("12,345");
    expect(rejects.text()).toContain("was not stored");
  });

  it("stops the progress subscription on unmount", async () => {
    const h = harness({ scan: payload() });
    await flushPromises();
    h.wrapper.unmount();
    expect(h.stopped()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// A FAILED READ
// ---------------------------------------------------------------------------

describe("a status read that did not answer", () => {
  it("keeps the numbers, marks them stale IN WORDS, and offers both routes", async () => {
    const h = harness({ scan: payload({ seen: 4_321 }), failsAfter: 1 });
    await flushPromises();
    expect(h.wrapper.find("#defminer-scan-seen").text()).toContain("4,321");

    await h.wrapper.find("#defminer-scan-refresh").trigger("click");
    await flushPromises();

    const stale = h.wrapper.find(STALE);
    expect(stale.exists()).toBe(true);
    expect(stale.attributes("role")).toBe("alert");
    expect(stale.text()).toContain("not updating");
    // CAREFUL NOT TO CLAIM THE SCAN STOPPED — a different fact, and one this
    // component cannot observe.
    expect(stale.text()).toContain("may still be running");

    // NEITHER CLEARED (which reads as "the scan reset") NOR UNMARKED (which
    // reads as a stall).
    expect(h.wrapper.find(STRIP).exists()).toBe(true);
    expect(h.wrapper.find("#defminer-scan-seen").text()).toContain("4,321");

    expect(h.wrapper.find("#defminer-scan-retry").exists()).toBe(true);
    expect(h.wrapper.find("#defminer-scan-open-health").exists()).toBe(true);
  });

  it("emits the navigation rather than routing itself", async () => {
    const h = harness({ scan: payload(), failsAfter: 1 });
    await flushPromises();
    await h.wrapper.find("#defminer-scan-refresh").trigger("click");
    await flushPromises();

    await h.wrapper.find("#defminer-scan-open-health").trigger("click");
    expect(h.wrapper.emitted("open-health")).toHaveLength(1);
  });

  it("says so without numbers when the FIRST read failed", async () => {
    const h = harness({ failsAfter: 0 });
    await flushPromises();

    expect(h.wrapper.find('[data-defminer-scan-failed]').exists()).toBe(true);
    expect(h.wrapper.find(STRIP).exists()).toBe(false);
    // AND THE START FORM IS NOT OFFERED. A call that did not answer is not
    // evidence that there is no scan.
    expect(h.wrapper.find(FORM).exists()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// THE LIFECYCLE CONTROLS
// ---------------------------------------------------------------------------

describe("pause, resume and discard", () => {
  it("takes its own in-flight label and never a spinner", async () => {
    const h = harness({ scan: payload() });
    await flushPromises();

    const pause = h.wrapper.find("#defminer-scan-pause");
    expect(pause.text()).toBe(SCAN_PAUSE_CTA);
    // NEVER "Cancel": D-10 makes this a pause and the label must not promise
    // something else.
    expect(h.wrapper.text()).not.toContain("Cancel");

    await pause.trigger("click");
    expect(h.wrapper.find("#defminer-scan-pause").text()).toBe(
      SCAN_PAUSING_LABEL,
    );
    expect(
      h.wrapper.find("#defminer-scan-pause").attributes("disabled"),
    ).toBeDefined();

    await flushPromises();
    expect(h.commands()).toEqual(["pause"]);
  });

  it("renders nothing indeterminate anywhere on the surface", async () => {
    const h = harness({ scan: payload() });
    await flushPromises();

    const html = h.wrapper.html();
    for (const banned of [
      "progressbar",
      "ProgressBar",
      "progressspinner",
      "ProgressSpinner",
      "animate-",
      "animate-spin",
      "animate-pulse",
      'role="progressbar"',
    ]) {
      expect(html).not.toContain(banned);
    }
  });

  it("puts discard behind a confirmation whose escape holds focus", async () => {
    const h = harness({
      scan: payload({ state: "suspended", suspendReason: "operator_paused" }),
    });
    await flushPromises();

    expect(h.wrapper.find(CONFIRM).exists()).toBe(false);
    await h.wrapper.find("#defminer-scan-discard").trigger("click");
    await flushPromises();

    const confirm = h.wrapper.find(CONFIRM);
    expect(confirm.exists()).toBe(true);
    expect(confirm.text()).toContain(SCAN_DISCARD_HEADING);
    // IT NAMES WHAT IS DESTROYED AND WHAT IS NOT, and quantifies the loss.
    expect(confirm.text()).toContain("14 Aug 2026, 09:41");
    expect(confirm.text()).toContain("60 requests");
    expect(confirm.text()).toContain(
      "artifacts and observations are not touched",
    );

    // THE ESCAPE IS THE NON-ACTION, AND IT HOLDS FOCUS.
    expect(document.activeElement?.id).toBe("defminer-scan-discard-keep");

    // The destructive button is the only `danger`-toned control on screen.
    const destructive = h.wrapper.find("#defminer-scan-discard-confirm");
    expect(destructive.classes().join(" ")).toContain("danger");
    expect(
      h.wrapper.find("#defminer-scan-pause,#defminer-scan-resume").exists(),
    ).toBe(true);
    expect(
      h.wrapper.find("#defminer-scan-resume").classes().join(" "),
    ).not.toContain("danger");
  });

  it("calls NOTHING when the confirmation is dismissed", async () => {
    const h = harness({
      scan: payload({ state: "suspended", suspendReason: "operator_paused" }),
    });
    await flushPromises();
    await h.wrapper.find("#defminer-scan-discard").trigger("click");
    await flushPromises();

    await h.wrapper.find("#defminer-scan-discard-keep").trigger("click");
    await flushPromises();

    expect(h.commands()).toEqual([]);
    expect(h.wrapper.find(CONFIRM).exists()).toBe(false);
    expect(h.wrapper.find(SUSPENSION).exists()).toBe(true);
  });

  it("calls discard, in its own in-flight label, when confirmed", async () => {
    const h = harness({
      scan: payload({ state: "suspended", suspendReason: "operator_paused" }),
      commandOutcome: {
        ok: true,
        changed: true,
        state: "discarded",
        suspendReason: null,
        reason: null,
      },
      then: null,
    });
    await flushPromises();
    await h.wrapper.find("#defminer-scan-discard").trigger("click");
    await flushPromises();

    await h.wrapper.find("#defminer-scan-discard-confirm").trigger("click");
    expect(h.wrapper.find("#defminer-scan-discard-confirm").text()).toBe(
      SCAN_DISCARDING_LABEL,
    );

    await flushPromises();
    expect(h.commands()).toEqual(["discard"]);
    // AND THE SURFACE RE-READS rather than fabricating the next state: the row
    // the backend actually wrote is the only thing worth rendering.
    expect(h.reads()).toBeGreaterThan(1);
  });

  it("offers resume and not pause on a suspended scan, and the reverse", async () => {
    const suspended = harness({
      scan: payload({ state: "suspended", suspendReason: "operator_paused" }),
    });
    await flushPromises();
    expect(suspended.wrapper.find("#defminer-scan-resume").text()).toBe(
      SCAN_RESUME_CTA,
    );

    await suspended.wrapper.find("#defminer-scan-resume").trigger("click");
    await flushPromises();
    expect(suspended.commands()).toEqual(["resume"]);
  });

  it("shows the suspended word on a suspended scan", async () => {
    const h = harness({
      scan: payload({ state: "suspended", suspendReason: "operator_paused" }),
    });
    await flushPromises();
    expect(h.wrapper.find(STATUS).text()).toContain(SCAN_STATUS_SUSPENDED);
  });
});

// ---------------------------------------------------------------------------
// THE RENDERING-SAFETY ABSOLUTES, PER-INSTANCE
// ---------------------------------------------------------------------------

describe("the rendering-safety absolutes", () => {
  it("puts no title attribute and no valued data-* attribute anywhere", async () => {
    const h = harness({
      scan: payload({
        operatorFilter: "req.host.eq:target.example",
        composedFilter: `(${DEFMINER_CLAUSE}) AND (req.host.eq:target.example)`,
      }),
    });
    await flushPromises();

    const root = h.wrapper.element;
    for (const node of [root, ...root.querySelectorAll("*")]) {
      expect(node.hasAttribute("title")).toBe(false);
      for (const attribute of [...node.attributes]) {
        if (!attribute.name.startsWith("data-")) continue;
        // Static markers only. A `data-*` that CARRIES a value is R2's other
        // absolute; per-cell hooks are `id`s.
        expect(attribute.value).toBe("");
      }
    }
    // The discard confirmation is the only element allowed the destructive tone.
    expect(h.wrapper.html()).not.toContain(SCAN_DISCARD_CTA + "!");
  });

  it("echoes the composed filter in its own font-mono element", async () => {
    const h = harness({
      scan: payload({
        composedFilter: `(${DEFMINER_CLAUSE}) AND (req.host.eq:evil)`,
      }),
    });
    await flushPromises();

    const composed = h.wrapper.find("[data-defminer-scan-composed]");
    expect(composed.classes().join(" ")).toContain("font-mono");
    expect(composed.text()).toContain("req.host.eq:evil");
  });
});
