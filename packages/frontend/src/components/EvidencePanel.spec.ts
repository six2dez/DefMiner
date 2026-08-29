// @vitest-environment jsdom
//
// packages/frontend/src/components/EvidencePanel.spec.ts — UI-03's frame,
// ERR-04's copy, OPS-03's action, and one of 05-UI-SPEC.md's six 🧪 backstop
// rows.
//
// ===========================================================================
// THIS FILE CARRIES THE EXECUTED EVIDENCE FOR BACKSTOP ROW
// `long-text / evidence-panel`
// ===========================================================================
// The row reads: "UISEC-03 at the 2,048-character panel cap, with R2's
// grapheme-safe rule and the stated byte range. Same adversarial fixture as
// the table row."
//
// A BACKSTOP ROW WITHOUT EXECUTED EVIDENCE RESOLVES TO `human_needed` AT
// VERIFY TIME AND NEVER TO A SILENT PASS. So the sweep below drives the
// SHARED hostile fixture's three long-text cases through the REAL MOUNTED
// PANEL — not through `forPanel` in isolation, which `safety/hostile.spec.ts`
// already does — and reports, per case, the cap read by import, an unsplit
// grapheme at the boundary, the stated byte range, the panel's height class
// unchanged, and the elapsed time inside a named bound.
//
// ===========================================================================
// WHY THE "MEASURED HEIGHT" ASSERTIONS ARE CLASS AND NODE IDENTITY, NOT PIXELS
// ===========================================================================
// P5-D65, measured in plan 05-09: jsdom has no layout and reports every box as
// 0x0. `getBoundingClientRect().height` therefore compares 0 with 0 in every
// state, including the state where the panel collapsed — a test that passes by
// measuring an empty set, which is the failure that decision was written for.
//
// What is asserted instead is STRONGER and is not vacuous: the root element is
// the SAME DOM NODE across the loading/loaded transition (so it was not
// unmounted and remounted), its class list is byte-identical (so it still
// carries the one fixed-height utility), and the component instance survives a
// selection change. Real geometry belongs in the browser spec, where the table
// surface's already is.

import {
  DEGRADED_ANALYSIS_FILTER,
  UNCLASSIFIED_ANALYSIS_FAILURE_REASON,
} from "@defminer/engine/contract";
import { HOSTILE_CASES } from "@defminer/engine/hostile.fixture";
import { EVIDENCE_PANEL_MAX_GRAPHEMES } from "@defminer/engine/sanitise";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import type {
  AnalysisKey,
  PanelAnalysis,
  RetryOutcome,
  RpcResult,
} from "../api/client";

import EvidencePanel from "./EvidencePanel.vue";
import {
  ARTIFACT_VERSION_LABEL,
  BYTE_RANGE_PENDING,
  degradedMarker,
  EVIDENCE_PANEL_HEIGHT_CLASS,
  EVIDENCE_PANEL_HEIGHT_PX,
  failureDetail,
  LOAD_FAILED_BODY,
  LOADING_LABEL,
  NEVER_ANALYSED_BODY,
  NO_SELECTION_BODY,
  type PanelEvidence,
  RE_ANALYSE_LABEL,
  RE_ANALYSING_LABEL,
  RETRY_FAILED_BODY,
  SCORE_PENDING,
  SNIPPET_PENDING,
  SOURCE_REQUEST_PENDING,
} from "./panel-contract";

const SHA = "a".repeat(64);
const OTHER_SHA = "b".repeat(64);
const CORPUS = "phase1-no-corpus";

function analysis(over: Partial<PanelAnalysis> = {}): PanelAnalysis {
  return {
    sha256: SHA,
    detectorSetHash: CORPUS,
    scanState: "done",
    bytesWalked: 8192,
    byteLen: 8192,
    startedAt: 1_756_000_000_000,
    finishedAt: 1_756_000_100_000,
    ...over,
  };
}

const OK_RETRY = (state: RetryOutcome["state"]): RpcResult<RetryOutcome> => ({
  ok: true,
  value: { ok: true, changed: true, state },
});

type Props = {
  selectedSha256?: string | null;
  analysis?: PanelAnalysis | null;
  loading?: boolean;
  failed?: boolean;
  evidence?: PanelEvidence | null;
  sourceRequestId?: string | null;
  retry?: (key: AnalysisKey) => Promise<RpcResult<RetryOutcome>>;
};

function mountPanel(props: Props = {}): VueWrapper {
  return mount(EvidencePanel, {
    props: {
      projectId: "server-scoped",
      selectedSha256: props.selectedSha256 ?? null,
      analysis: props.analysis ?? null,
      loading: props.loading ?? false,
      failed: props.failed ?? false,
      evidence: props.evidence ?? null,
      sourceRequestId: props.sourceRequestId ?? null,
      retry: props.retry ?? (() => Promise.resolve(OK_RETRY("pending"))),
    },
  });
}

/** Let the panel's own in-flight promise settle. */
async function settle(wrapper: VueWrapper): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
}

const root = (wrapper: VueWrapper) => wrapper.get("#defminer-evidence-panel");

describe("EvidencePanel — the persistent region (UI-03, 05-UI-SPEC § Data & Interaction Contract)", () => {
  it("resolves its height class from the one height constant", () => {
    // P5-D64's mechanism, applied to the panel. An interpolated arbitrary
    // value is invisible to Tailwind's JIT, which emits no rule and renders the
    // region at its content's height — the collapsing panel the contract
    // forbids, arriving through a build that SUCCEEDED.
    expect(EVIDENCE_PANEL_HEIGHT_PX).toBeGreaterThan(0);
    expect(EVIDENCE_PANEL_HEIGHT_CLASS).not.toBe("");
    expect(EVIDENCE_PANEL_HEIGHT_CLASS).toMatch(/^h-/);
  });

  it("renders its frame at the fixed height with no row selected", () => {
    const wrapper = mountPanel();
    expect(root(wrapper).classes()).toContain(EVIDENCE_PANEL_HEIGHT_CLASS);
    expect(wrapper.text()).toContain(NO_SELECTION_BODY);
  });

  it("keeps the SAME element and the SAME classes while a row's evidence loads", async () => {
    const wrapper = mountPanel({ selectedSha256: SHA, loading: true });

    const loadingNode = root(wrapper).element;
    const loadingClasses = [...root(wrapper).classes()].sort();
    expect(wrapper.text()).toContain(LOADING_LABEL);
    expect(wrapper.find("#defminer-evidence-skeleton").exists()).toBe(true);

    await wrapper.setProps({ loading: false, analysis: analysis() });

    // THE SAME DOM NODE. A panel that collapsed and re-expanded would produce a
    // different element here, and the split body would reflow on every row
    // click — the same defect the table's no-spinner rule exists to prevent,
    // on a surface the operator clicks thousands of times.
    expect(root(wrapper).element).toBe(loadingNode);
    expect([...root(wrapper).classes()].sort()).toEqual(loadingClasses);
    expect(wrapper.find("#defminer-evidence-skeleton").exists()).toBe(false);
  });

  it("does not collapse when a second row is selected while the first is loading", async () => {
    const wrapper = mountPanel({ selectedSha256: SHA, loading: true });
    const before = root(wrapper).element;

    await wrapper.setProps({ selectedSha256: OTHER_SHA, loading: true });

    expect(root(wrapper).element).toBe(before);
    expect(root(wrapper).classes()).toContain(EVIDENCE_PANEL_HEIGHT_CLASS);
  });

  it("scrolls INSIDE its own body rather than growing the page", () => {
    const wrapper = mountPanel({ selectedSha256: SHA, analysis: analysis() });
    const body = wrapper.get("#defminer-evidence-body");
    // The overflow rule is a property of the panel's LAYOUT, not of any value
    // it renders: it holds for an empty panel and a 4 MiB one alike.
    expect(body.classes()).toContain("overflow-y-auto");
    expect(root(wrapper).classes()).toContain(EVIDENCE_PANEL_HEIGHT_CLASS);
  });

  it("says a failed LOAD failed, rather than rendering an empty frame", () => {
    const wrapper = mountPanel({ selectedSha256: SHA, failed: true });
    expect(wrapper.text()).toContain(LOAD_FAILED_BODY);
    // An empty panel over a failed load tells the operator there is no
    // evidence, which is a different and false claim.
    expect(wrapper.text()).not.toContain(NO_SELECTION_BODY);
  });

  it("says so when the artifact has never been analysed", () => {
    const wrapper = mountPanel({ selectedSha256: SHA, analysis: null });
    expect(wrapper.text()).toContain(NEVER_ANALYSED_BODY);
  });
});

describe("EvidencePanel — ERR-04, in words (05-UI-SPEC § Copywriting Contract)", () => {
  it("renders the failure sentence verbatim, with the re-analyse action beside it", () => {
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis({ scanState: "failed", bytesWalked: 0 }),
    });

    // THE FULL SENTENCE. The distinction between a clean result and a failed
    // one is stated in words and is never left to a badge colour.
    expect(wrapper.get("#defminer-evidence-failure").text()).toBe(
      failureDetail(UNCLASSIFIED_ANALYSIS_FAILURE_REASON),
    );
    expect(wrapper.get("#defminer-evidence-failure").text()).toContain(
      "nothing was inspected",
    );
    expect(wrapper.get("#defminer-evidence-retry").text()).toBe(
      RE_ANALYSE_LABEL,
    );
  });

  it("interpolates a DefMiner-authored reason code, never a message", () => {
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis({ scanState: "failed" }),
    });
    const text = wrapper.get("#defminer-evidence-failure").text();
    expect(text).toContain(UNCLASSIFIED_ANALYSIS_FAILURE_REASON);
    // The reason is an identifier the UI maps to its own copy. A code that had
    // grown into a message is a message that can quote an artifact (T-05-51).
    expect(UNCLASSIFIED_ANALYSIS_FAILURE_REASON).toMatch(/^[a-z][a-z-]*[a-z]$/);
  });

  it("renders UI-09's degraded marker for a partial analysis, with both byte counts", () => {
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis({
        scanState: "partial",
        bytesWalked: 4096,
        byteLen: 1_048_576,
      }),
    });

    expect(wrapper.get("#defminer-evidence-degraded").text()).toBe(
      degradedMarker(4096, 1_048_576, UNCLASSIFIED_ANALYSIS_FAILURE_REASON),
    );
    expect(wrapper.get("#defminer-evidence-degraded").text()).toContain(
      "a floor, not a total",
    );
  });

  it("marks nothing for a complete analysis", () => {
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis({ scanState: "done" }),
    });
    expect(wrapper.find("#defminer-evidence-degraded").exists()).toBe(false);
    expect(wrapper.find("#defminer-evidence-failure").exists()).toBe(false);
    expect(wrapper.find("#defminer-evidence-retry").exists()).toBe(false);
  });
});

describe("EvidencePanel — the re-analyse action (OPS-03)", () => {
  it("calls the retry with the SELECTED row's key and reflects the state read back", async () => {
    const calls: AnalysisKey[] = [];
    const retry = (key: AnalysisKey): Promise<RpcResult<RetryOutcome>> => {
      calls.push(key);
      return Promise.resolve(OK_RETRY("pending"));
    };
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis({ scanState: "failed" }),
      retry,
    });

    await wrapper.get("#defminer-evidence-retry").trigger("click");
    await settle(wrapper);

    expect(calls).toEqual([
      { projectId: "server-scoped", sha256: SHA, detectorSetHash: CORPUS },
    ]);
    // The state the BACKEND read back, not the one the click assumed.
    expect(wrapper.get("#defminer-evidence-state").text()).toContain("Queued");
    expect(wrapper.emitted("retried")).toEqual([["pending"]]);
  });

  it("cannot be double-submitted: disabled in flight, with its own label", async () => {
    let resolveRetry: (value: RpcResult<RetryOutcome>) => void = () =>
      undefined;
    const retry = vi.fn(
      () =>
        new Promise<RpcResult<RetryOutcome>>((resolve) => {
          resolveRetry = resolve;
        }),
    );
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis({ scanState: "failed" }),
      retry,
    });

    const button = wrapper.get("#defminer-evidence-retry");
    await button.trigger("click");
    await wrapper.vm.$nextTick();

    expect(button.attributes("disabled")).toBeDefined();
    expect(button.text()).toBe(RE_ANALYSING_LABEL);

    await button.trigger("click");
    await wrapper.vm.$nextTick();
    expect(retry).toHaveBeenCalledTimes(1);

    // RESOLVED WITH A STATE THAT IS STILL DEGRADED, deliberately: the action
    // is offered only for the states the backend's guard will move, so a
    // successful retry to `pending` UNMOUNTS the button and there would be
    // nothing left to assert had re-enabled. A decline that read the row back
    // unchanged keeps it on screen, which is the case this assertion is for.
    resolveRetry({
      ok: true,
      value: { ok: true, changed: false, state: "failed" },
    });
    await settle(wrapper);
    const after = wrapper.get("#defminer-evidence-retry");
    expect(after.attributes("disabled")).toBeUndefined();
    expect(after.text()).toBe(RE_ANALYSE_LABEL);
  });

  it("removes the action once the row is no longer in a state the guard would move", async () => {
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis({ scanState: "failed" }),
    });
    expect(wrapper.find("#defminer-evidence-retry").exists()).toBe(true);

    await wrapper.get("#defminer-evidence-retry").trigger("click");
    await settle(wrapper);

    // Offering a re-analyse on a queued analysis would teach the operator that
    // the affordance does nothing — the same argument the partial banner makes
    // for hiding its narrowing action when no narrowing filter exists.
    expect(wrapper.get("#defminer-evidence-state").text()).toContain("Queued");
    expect(wrapper.find("#defminer-evidence-retry").exists()).toBe(false);
  });

  it("leaves the PRIOR state visibly in place when the retry fails", async () => {
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis({ scanState: "failed" }),
      retry: () =>
        Promise.resolve({
          ok: false as const,
          reason: "rpc-timeout" as const,
          versions: null,
        }),
    });

    const before = wrapper.get("#defminer-evidence-state").text();
    await wrapper.get("#defminer-evidence-retry").trigger("click");
    await settle(wrapper);

    // NEVER A STATE THAT WAS NOT PERSISTED (T-05-55). The failure surfaces and
    // the prior state stays exactly where it was.
    expect(wrapper.get("#defminer-evidence-state").text()).toBe(before);
    expect(wrapper.get("#defminer-evidence-retry-failure").text()).toBe(
      RETRY_FAILED_BODY,
    );
    expect(wrapper.emitted("retried")).toBeUndefined();
  });

  it("also leaves the prior state in place when the backend declined to move the row", async () => {
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis({ scanState: "failed" }),
      retry: () =>
        Promise.resolve({
          ok: true as const,
          value: { ok: false, changed: false, state: null },
        }),
    });

    await wrapper.get("#defminer-evidence-retry").trigger("click");
    await settle(wrapper);

    expect(wrapper.get("#defminer-evidence-state").text()).toContain("Failed");
    expect(wrapper.find("#defminer-evidence-retry-failure").exists()).toBe(
      true,
    );
  });
});

describe("EvidencePanel — the published frame (EvidencePanelFrame, UI-SPEC FLAG F1)", () => {
  it("renders the artifact version in monospace", () => {
    const wrapper = mountPanel({ selectedSha256: SHA, analysis: analysis() });
    const version = wrapper.get("#defminer-artifact-version");
    expect(version.text()).toContain(CORPUS);
    expect(version.text()).toContain(ARTIFACT_VERSION_LABEL);
    // `font-mono` is a SECURITY control on a target-derived string, not a
    // typographic preference: two digests differing only in 0/O are the same
    // picture in a proportional face.
    expect(
      wrapper
        .findAll("span")
        .some(
          (span) =>
            span.text().includes(CORPUS) &&
            span.classes().includes("font-mono"),
        ),
    ).toBe(true);
  });

  it("names what each deferred slot is waiting on rather than rendering nothing", () => {
    const wrapper = mountPanel({ selectedSha256: SHA, analysis: analysis() });
    const text = wrapper.text();
    // AN EMPTY REGION READS AS "NO EVIDENCE FOR THIS ROW", which is a different
    // and false claim from "the table that holds it does not exist yet".
    for (const line of [
      SOURCE_REQUEST_PENDING,
      BYTE_RANGE_PENDING,
      SNIPPET_PENDING,
      SCORE_PENDING,
    ]) {
      expect(line.length).toBeGreaterThan(0);
      expect(text).toContain(line);
    }
  });

  it("carries no title attribute and no data-prefixed attribute anywhere in its subtree", () => {
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis({ scanState: "partial" }),
      evidence: {
        value: "a hostile value",
        byteRange: { start: 0, end: 15 },
        byteTotal: 4096,
      },
      sourceRequestId: null,
    });

    // R2's absolute: no target-controlled content in a tooltip, a `title` or a
    // `data-*` attribute — EVER. Asserted over the RENDERED SUBTREE rather
    // than over the source, because a component this one embeds could carry one
    // (StatusBadge does, which is why this panel does not use it).
    const offenders: string[] = [];
    for (const element of root(wrapper).element.querySelectorAll("*")) {
      for (const attribute of element.attributes) {
        const name = String(attribute.name).toLowerCase();
        if (name === "title" || name.startsWith("data-")) {
          offenders.push(`${String(element.tagName)}[${name}]`);
        }
      }
    }
    for (const attribute of root(wrapper).element.attributes) {
      const name = String(attribute.name).toLowerCase();
      if (name === "title" || name.startsWith("data-")) {
        offenders.push(`ROOT[${name}]`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("states the byte range from what the BACKEND supplied, not from the display text", () => {
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis(),
      evidence: {
        value: "const key = EXAMPLE",
        byteRange: { start: 128, end: 147 },
        byteTotal: 1_048_576,
      },
    });

    const stated = wrapper.get("#defminer-evidence-byte-range").text();
    // P5-D26, owed by this plan and paid here. `forPanel`'s object carries NO
    // byte count on purpose — bytes are the backend's length space and the
    // display text has been grapheme-truncated in the frontend's, and one
    // object carrying both invites silently-wrong arithmetic. All three
    // integers below came from the backend beside the value.
    expect(stated).toContain("128");
    expect(stated).toContain("147");
    expect(stated).toContain("1,048,576");
  });
});

// ---------------------------------------------------------------------------
// 🧪 BACKSTOP — `long-text / evidence-panel`
// ---------------------------------------------------------------------------

describe("EvidencePanel — the hostile long-text sweep, through the REAL panel", () => {
  /** The three long-text cases the backstop row names, by fixture id. */
  const LONG_TEXT_IDS = [
    "multi-megabyte-single-line",
    "embedded-newlines-and-tabs",
    "four-byte-grapheme",
  ] as const;

  /** The bound this sweep reports against. Generous on purpose: the claim is
   *  "no renderer freeze", and a tight budget would make this a flaky
   *  performance test rather than a freeze backstop. */
  const FREEZE_BOUND_MS = 2_000;

  const graphemes = (text: string): number =>
    [
      ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
        text,
      ),
    ].length;

  it("covers exactly the three long-text cases the backstop row names", () => {
    // NON-VACUITY. A sweep that quietly stopped covering a case would keep
    // passing; this makes an edit to the shared fixture fail here.
    for (const id of LONG_TEXT_IDS) {
      expect(
        HOSTILE_CASES.some((c) => c.id === id),
        `${id} is not in the shared hostile fixture`,
      ).toBe(true);
    }
  });

  for (const id of LONG_TEXT_IDS) {
    it(`renders \`${id}\` truncated at the panel cap, unsplit, with its byte range stated`, () => {
      const hostile = HOSTILE_CASES.find((c) => c.id === id);
      expect(hostile, `${id} missing`).toBeDefined();
      if (hostile === undefined) return;

      const byteTotal = new TextEncoder().encode(hostile.value).length;
      const started = Date.now();
      const wrapper = mountPanel({
        selectedSha256: SHA,
        analysis: analysis(),
        evidence: {
          value: hostile.value,
          byteRange: { start: 0, end: byteTotal },
          byteTotal,
        },
      });
      const elapsed = Date.now() - started;

      const snippet = wrapper.get("#defminer-evidence-snippet").text();

      // 1 — THE CAP, READ BY IMPORT. Never restated here.
      expect(graphemes(snippet)).toBeLessThanOrEqual(
        EVIDENCE_PANEL_MAX_GRAPHEMES,
      );

      // 2 — NO SPLIT GRAPHEME AT THE BOUNDARY. A naive slice on a four-byte
      // grapheme leaves a lone surrogate, which renders as a replacement
      // character and is the defect UISEC-03 names.
      expect(snippet).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
      expect(snippet).not.toMatch(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);

      // 3 — THE STATED BYTE RANGE, from the backend's integers.
      expect(wrapper.get("#defminer-evidence-byte-range").text()).not.toBe("");

      // 4 — NO LAYOUT BREAK: the fixed-height class survives the value.
      expect(root(wrapper).classes()).toContain(EVIDENCE_PANEL_HEIGHT_CLASS);

      // 5 — NO RENDERER FREEZE, inside a named bound.
      expect(elapsed, `${id} took ${String(elapsed)}ms to mount`).toBeLessThan(
        FREEZE_BOUND_MS,
      );
    });
  }

  it("states the truncation affordance when the value was cut, and not when it was not", () => {
    const short = mountPanel({
      selectedSha256: SHA,
      analysis: analysis(),
      evidence: {
        value: "short",
        byteRange: { start: 0, end: 5 },
        byteTotal: 5,
      },
    });
    expect(short.find("#defminer-evidence-truncation").exists()).toBe(false);

    const long = mountPanel({
      selectedSha256: SHA,
      analysis: analysis(),
      evidence: {
        value: "x".repeat(EVIDENCE_PANEL_MAX_GRAPHEMES + 1),
        byteRange: { start: 0, end: EVIDENCE_PANEL_MAX_GRAPHEMES + 1 },
        byteTotal: EVIDENCE_PANEL_MAX_GRAPHEMES + 1,
      },
    });
    // TWO SENTENCES, TWO LENGTH SPACES, NEITHER DERIVED FROM THE OTHER. The
    // truncation affordance counts GRAPHEMES (the frontend's space); the byte
    // range counts BYTES (the backend's).
    expect(long.get("#defminer-evidence-truncation").text()).toContain(
      "characters",
    );
    expect(long.get("#defminer-evidence-byte-range").text()).toContain("bytes");
  });

  it("routes the evidence value through the panel display path, not raw", () => {
    const wrapper = mountPanel({
      selectedSha256: SHA,
      analysis: analysis(),
      evidence: {
        value: "‮moc.live‬",
        byteRange: { start: 0, end: 12 },
        byteTotal: 12,
      },
    });
    // R2 step 2. A bidi override left in place makes `evil.com` render as
    // `moc.live` on the surface the operator triages on (T-05-11).
    const snippet = wrapper.get("#defminer-evidence-snippet").text();
    expect(snippet).not.toMatch(/[‪-‮⁦-⁩]/);
  });
});

describe("EvidencePanel — the narrowing filter it shares with the banner", () => {
  it("uses the one declared degraded filter rather than a second spelling", () => {
    // Not a rendering claim: a guard that the panel and the banner narrow by
    // the SAME column identifier. The backend answers an unrecognised filter
    // column with an empty exhausted page, by design, so a second spelling
    // fails silently.
    expect(DEGRADED_ANALYSIS_FILTER.column).not.toBe("");
    expect(Object.isFrozen(DEGRADED_ANALYSIS_FILTER)).toBe(true);
  });
});
