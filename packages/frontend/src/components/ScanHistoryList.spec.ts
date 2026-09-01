// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/components/ScanHistoryList.spec.ts — every state the
// contract names for the scan history, and the two design facts asserted
// MECHANICALLY rather than by reading the source.
//
// ===========================================================================
// TWO OF THESE CASES ARE NOT ABOUT WHAT RENDERS
// ===========================================================================
// `does not call the shipped column assertion` and `renders no virtual
// scroller` are assertions about the SHAPE of the component rather than its
// output, and they exist because both facts are one careless import away from
// being untrue. The first drives a column set the assertion would THROW on and
// proves the mount survives it; the second walks the rendered output for the
// scroller's own element. A comment saying "we do not use the table contract"
// would go stale in silence; these do not.
//
// ===========================================================================
// AND ONE PAIR IS ASSERTED BY ITS TEXT, NOT BY ITS PRESENCE
// ===========================================================================
// The empty screen and the failed screen must be DISTINGUISHABLE BY THEIR TEXT
// ALONE. A case that merely asserted "something rendered" would pass on a
// component that showed the empty copy for a load failure — which is the exact
// defect the copy exists to prevent, because an empty scan history means "you
// have never run a scan" and a suspended scan the operator cannot see is a
// resumable cursor they will never resume. So each case asserts its own copy IS
// present AND the other copy is NOT.

import { flushPromises, mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type { RpcResult, ScanHistoryRow } from "../api/client";

import {
  dateOnlyText,
  resumePositionClause,
  SCAN_HISTORY_CLAUSE_LABEL,
  SCAN_HISTORY_COUNTERS,
  SCAN_HISTORY_DISCARDED_POSITION_BODY,
  SCAN_HISTORY_EMPTY_BODY,
  SCAN_HISTORY_EMPTY_HEADING,
  SCAN_HISTORY_FAILED_BODY,
  SCAN_HISTORY_HEADING,
  SCAN_HISTORY_HIDE_DETAIL_LABEL,
  SCAN_HISTORY_LIMIT,
  SCAN_HISTORY_LOADING_LABEL,
  SCAN_HISTORY_NO_CLAUSE_BODY,
  SCAN_HISTORY_SHOW_DETAIL_LABEL,
  SCAN_OPEN_HEALTH_LABEL,
  SCAN_RETRY_LABEL,
  SCAN_STATUS_DISCARDED,
  SCAN_STATUS_FINISHED,
  SCAN_STATUS_SCANNING,
  SCAN_STATUS_SUSPENDED,
  SCAN_SUSPEND_COPY,
  scanHistoryDetailId,
  scanHistoryRowId,
  scanHistoryToggleId,
  scanHistoryTruncatedLine,
} from "./scan-contract";
import ScanHistoryList from "./ScanHistoryList.vue";
import { assertColumnContract } from "./table-contract";

const AUG_14 = new Date(2026, 7, 14, 9, 41, 0, 0).getTime();
const JUL_02 = new Date(2026, 6, 2, 18, 5, 0, 0).getTime();

function row(over: Partial<ScanHistoryRow> = {}): ScanHistoryRow {
  return {
    scanId: "s1",
    state: "completed",
    suspendReason: null,
    operatorFilter: "",
    pagesWalked: 3,
    seen: 8412,
    admitted: 120,
    skippedDone: 40,
    rejected: 8252,
    queued: 120,
    lastCreatedAt: AUG_14,
    startedAt: AUG_14,
    finishedAt: AUG_14,
    ...over,
  };
}

type Options = {
  readonly rows?: readonly ScanHistoryRow[];
  readonly fails?: boolean;
  /** Never settle, so the pre-first-read state is held open. */
  readonly hang?: boolean;
  /** Succeed on the first read and fail from the second — a failure arriving
   *  after rows are already on screen. */
  readonly failsAfter?: number;
  /** Fail ONLY the first read, so the retry path's success can be driven. */
  readonly failsFirst?: boolean;
};

type Harness = {
  readonly wrapper: VueWrapper;
  readonly limits: () => number[];
  readonly reads: () => number;
};

function harness(options: Options = {}): Harness {
  const limits: number[] = [];
  let reads = 0;

  const wrapper = mount(ScanHistoryList, {
    props: {
      load: (limit: number): Promise<RpcResult<readonly ScanHistoryRow[]>> => {
        limits.push(limit);
        reads += 1;
        if (options.hang === true) return new Promise(() => undefined);
        const shouldFail =
          options.fails === true ||
          (options.failsFirst === true && reads === 1) ||
          (options.failsAfter !== undefined && reads > options.failsAfter);
        if (shouldFail) {
          return Promise.resolve({
            ok: false,
            reason: "rpc-timeout",
            versions: null,
          });
        }
        return Promise.resolve({ ok: true, value: options.rows ?? [] });
      },
    },
  });

  return { wrapper, limits: () => limits, reads: () => reads };
}

describe("ScanHistoryList — the four screens, and they are four", () => {
  it("renders the heading before any read resolves", () => {
    const { wrapper } = harness({ hang: true });
    expect(wrapper.text()).toContain(SCAN_HISTORY_HEADING);
  });

  it("renders SKELETON ROWS and no spinner while the first read is open", () => {
    const { wrapper } = harness({ hang: true });

    expect(wrapper.text()).toContain(SCAN_HISTORY_LOADING_LABEL);
    expect(
      wrapper.findAll("[data-defminer-scan-history-skeleton]").length,
    ).toBeGreaterThan(0);
    // NEVER A SPINNER, matching the shipped inventory tables and the
    // phase-wide ban on indeterminate indicators.
    // ASSERTED OVER THE NODES AND NOT OVER `html()`, deliberately: `html()`
    // includes the template's own comments, and the comment beside the skeleton
    // block says the word "spinner" while explaining why there is not one. A
    // string search over the markup would fail on the explanation.
    const root = wrapper.element;
    for (const node of [root, ...root.querySelectorAll("*")]) {
      expect(node.getAttribute("role")).not.toBe("progressbar");
      expect(node.getAttribute("role")).not.toBe("status");
      expect(String(node.className)).not.toContain("animate-");
      expect(String(node.className)).not.toContain("transition");
    }
  });

  it("renders the EMPTY screen for zero scans, and NOT the error copy", async () => {
    const { wrapper } = harness({ rows: [] });
    await flushPromises();

    expect(wrapper.text()).toContain(SCAN_HISTORY_EMPTY_HEADING);
    expect(wrapper.text()).toContain(SCAN_HISTORY_EMPTY_BODY);
    // THE HALF THAT MAKES THIS CASE WORTH WRITING. Swapping the two copies in
    // the component would leave the first two assertions passing.
    expect(wrapper.text()).not.toContain(SCAN_HISTORY_FAILED_BODY);
    expect(wrapper.find("[data-defminer-scan-history-failed]").exists()).toBe(
      false,
    );
  });

  it("renders the ERROR screen for a failed load, and NOT the empty copy", async () => {
    const { wrapper } = harness({ fails: true });
    await flushPromises();

    expect(wrapper.text()).toContain(SCAN_HISTORY_FAILED_BODY);
    // AN EMPTY LIST IS NOT WHAT A FAILED READ MEANS. This is the assertion the
    // suppressions list's own rule is carried by.
    expect(wrapper.text()).not.toContain(SCAN_HISTORY_EMPTY_HEADING);
    expect(wrapper.text()).not.toContain(SCAN_HISTORY_EMPTY_BODY);
    expect(wrapper.find("[data-defminer-scan-history-empty]").exists()).toBe(
      false,
    );
    // AND IT IS A LIVE REGION WITH BOTH ACTIONS THE COPY NAMES.
    expect(wrapper.get('[role="alert"]').text()).toContain(
      SCAN_HISTORY_FAILED_BODY,
    );
    expect(wrapper.get("#defminer-scan-history-retry").text()).toBe(
      SCAN_RETRY_LABEL,
    );
    expect(wrapper.get("#defminer-scan-history-health").text()).toBe(
      SCAN_OPEN_HEALTH_LABEL,
    );
  });

  it("emits open-health rather than navigating itself", async () => {
    const { wrapper } = harness({ fails: true });
    await flushPromises();

    await wrapper.get("#defminer-scan-history-health").trigger("click");
    expect(wrapper.emitted("open-health")).toHaveLength(1);
  });

  it("re-reads on Retry", async () => {
    const h = harness({ fails: true });
    await flushPromises();
    expect(h.reads()).toBe(1);

    await h.wrapper.get("#defminer-scan-history-retry").trigger("click");
    await flushPromises();
    expect(h.reads()).toBe(2);
  });

  // WHY THERE IS NO CASE FOR "A READ FAILS AFTER A SUCCESS".
  //
  // It is NOT REACHABLE through this component, and saying so is better than
  // asserting it through the internals. The only re-read is the Retry button,
  // and Retry only exists while the error is on screen — so the sequence a
  // reader might look for here (rows, then a failure) cannot be driven from the
  // surface. The component is nonetheless BUILT for it: `showRows` does not
  // consult `failed`, so a failure arriving with rows already loaded renders
  // ABOVE them rather than instead of them, and `read` never clears the rows.
  // That is the shape a later Refresh control would need, and it is written
  // into the component rather than left to be rediscovered.

  it("replaces a FAILED first read with the rows once a retry succeeds", async () => {
    const h = harness({ rows: [row()], failsFirst: true });
    await flushPromises();
    expect(h.wrapper.text()).toContain(SCAN_HISTORY_FAILED_BODY);

    await h.wrapper.get("#defminer-scan-history-retry").trigger("click");
    await flushPromises();

    expect(h.wrapper.text()).not.toContain(SCAN_HISTORY_FAILED_BODY);
    expect(h.wrapper.find(`#${scanHistoryRowId(0)}`).exists()).toBe(true);
  });
});

describe("ScanHistoryList — the rows", () => {
  it("asks for the declared bound and renders in the order it was given", async () => {
    const rows = [
      row({ scanId: "newest", lastCreatedAt: AUG_14 }),
      row({ scanId: "older", lastCreatedAt: JUL_02 }),
    ];
    const h = harness({ rows });
    await flushPromises();

    expect(h.limits()).toEqual([SCAN_HISTORY_LIMIT]);
    // NO RE-SORT. The backend's ORDER BY pins every suspended scan in and
    // breaks every tie deterministically; a second ordering here would be a
    // second answer to a question with one authority.
    const rendered = h.wrapper.findAll("[data-defminer-scan-history-rows] > *");
    expect(rendered[0].attributes("id")).toBe(scanHistoryRowId(0));
    expect(rendered[0].text()).toContain(String(dateOnlyText(AUG_14)));
    expect(rendered[1].text()).toContain(String(dateOnlyText(JUL_02)));
  });

  it("renders NO position element for a scan that resolved no page", async () => {
    const { wrapper } = harness({
      rows: [row({ lastCreatedAt: null, seen: 0 })],
    });
    await flushPromises();

    // THE ROW STILL RENDERS. A row is never hidden because part of it is
    // missing — an absent position is an absent element, never a placeholder
    // date and never the epoch.
    expect(wrapper.find(`#${scanHistoryRowId(0)}`).exists()).toBe(true);
    expect(wrapper.text()).toContain(SCAN_STATUS_FINISHED);
    expect(wrapper.text()).not.toContain("reached");
    expect(wrapper.text()).not.toContain("1970");
  });

  it("renders the counters GROUPED and the lifecycle word from the one map", async () => {
    const { wrapper } = harness({ rows: [row({ seen: 8412 })] });
    await flushPromises();

    const text = wrapper.get(`#${scanHistoryRowId(0)}`).text();
    expect(text).toContain("8,412 seen");
    // FINISHED, NEVER "Completed" — the analysis vocabulary already ships
    // "Complete" and the guard is a case-insensitive PREFIX check.
    expect(text).toContain(SCAN_STATUS_FINISHED);
    expect(text).not.toContain("Completed");
    // AND NEVER A PARENTHESISED PLURAL SUFFIX, anywhere on the surface.
    expect(wrapper.text()).not.toContain("(s)");
  });

  it("states that a DISCARDED row's position is gone", async () => {
    const { wrapper } = harness({ rows: [row({ state: "discarded" })] });
    await flushPromises();

    const text = wrapper.get(`#${scanHistoryRowId(0)}`).text();
    expect(text).toContain(SCAN_STATUS_DISCARDED);
    expect(text).toContain(SCAN_HISTORY_DISCARDED_POSITION_BODY);
  });

  it("states a SUSPENDED row's reason and what resuming continues from", async () => {
    const rows = [
      row({
        state: "suspended",
        suspendReason: "retention_eviction",
        finishedAt: AUG_14,
      }),
    ];
    const { wrapper } = harness({ rows });
    await flushPromises();

    const text = wrapper.get(`#${scanHistoryRowId(0)}`).text();
    expect(text).toContain(SCAN_STATUS_SUSPENDED);
    expect(text).toContain(
      SCAN_SUSPEND_COPY.retention_eviction({ at: AUG_14, rowCap: null }),
    );
    expect(text).toContain(String(resumePositionClause(AUG_14)));
  });

  it("renders a RUNNING row with the scanning word", async () => {
    const { wrapper } = harness({ rows: [row({ state: "running" })] });
    await flushPromises();

    expect(wrapper.get(`#${scanHistoryRowId(0)}`).text()).toContain(
      SCAN_STATUS_SCANNING,
    );
  });
});

describe("ScanHistoryList — the bound, said in words", () => {
  it("renders the truncation sentence when the count REACHES the bound", async () => {
    const rows = Array.from({ length: SCAN_HISTORY_LIMIT }, (_v, i) =>
      row({ scanId: `s${String(i)}` }),
    );
    const { wrapper } = harness({ rows });
    await flushPromises();

    expect(wrapper.text()).toContain(scanHistoryTruncatedLine(rows.length));
    // AND IT SAYS THE PART THAT MATTERS. An operator who counts fifty rows has
    // no way to know their suspended scan is not the fifty-first.
    expect(wrapper.text()).toContain(
      "Every suspended scan is shown regardless of age",
    );
  });

  it("does NOT render it below the bound", async () => {
    const rows = Array.from({ length: SCAN_HISTORY_LIMIT - 1 }, (_v, i) =>
      row({ scanId: `s${String(i)}` }),
    );
    const { wrapper } = harness({ rows });
    await flushPromises();

    expect(
      wrapper.find("[data-defminer-scan-history-truncated]").exists(),
    ).toBe(false);
  });
});

describe("ScanHistoryList — the inline disclosure", () => {
  it("opens one row's detail and closes any other open one", async () => {
    const rows = [row({ scanId: "a" }), row({ scanId: "b" })];
    const { wrapper } = harness({ rows });
    await flushPromises();

    expect(wrapper.find(`#${scanHistoryDetailId(0)}`).exists()).toBe(false);
    expect(wrapper.get(`#${scanHistoryToggleId(0)}`).text()).toBe(
      SCAN_HISTORY_SHOW_DETAIL_LABEL,
    );

    await wrapper.get(`#${scanHistoryToggleId(0)}`).trigger("click");
    expect(wrapper.find(`#${scanHistoryDetailId(0)}`).exists()).toBe(true);
    // THE LABEL CHANGES BETWEEN ITS TWO STATES — a toggle whose label never
    // moved would be a control the operator cannot read the state of.
    expect(wrapper.get(`#${scanHistoryToggleId(0)}`).text()).toBe(
      SCAN_HISTORY_HIDE_DETAIL_LABEL,
    );

    await wrapper.get(`#${scanHistoryToggleId(1)}`).trigger("click");
    // ONE AT A TIME.
    expect(wrapper.find(`#${scanHistoryDetailId(0)}`).exists()).toBe(false);
    expect(wrapper.find(`#${scanHistoryDetailId(1)}`).exists()).toBe(true);

    await wrapper.get(`#${scanHistoryToggleId(1)}`).trigger("click");
    expect(wrapper.find(`#${scanHistoryDetailId(1)}`).exists()).toBe(false);
  });

  it("renders the full counter set in the detail", async () => {
    const { wrapper } = harness({ rows: [row()] });
    await flushPromises();
    await wrapper.get(`#${scanHistoryToggleId(0)}`).trigger("click");

    const detail = wrapper.get(`#${scanHistoryDetailId(0)}`);
    for (const counter of SCAN_HISTORY_COUNTERS) {
      expect(detail.text()).toContain(counter.label);
    }
    expect(detail.text()).toContain("8,252");
  });

  it("states that no clause was added rather than rendering an empty element", async () => {
    const { wrapper } = harness({ rows: [row({ operatorFilter: "" })] });
    await flushPromises();
    await wrapper.get(`#${scanHistoryToggleId(0)}`).trigger("click");

    const detail = wrapper.get(`#${scanHistoryDetailId(0)}`);
    expect(detail.text()).toContain(SCAN_HISTORY_CLAUSE_LABEL);
    expect(detail.text()).toContain(SCAN_HISTORY_NO_CLAUSE_BODY);
    expect(
      wrapper.find("[data-defminer-scan-history-detail-clause]").exists(),
    ).toBe(false);
  });

  it("renders the operator's clause in font-mono, in the row and in the detail", async () => {
    const clause = 'req.host.cont:"example.test"';
    const { wrapper } = harness({ rows: [row({ operatorFilter: clause })] });
    await flushPromises();
    await wrapper.get(`#${scanHistoryToggleId(0)}`).trigger("click");

    const cell = wrapper.get("[data-defminer-scan-history-clause]");
    expect(cell.text()).toBe(clause);
    expect(cell.classes().join(" ")).toContain("font-mono");

    const panel = wrapper.get("[data-defminer-scan-history-detail-clause]");
    expect(panel.text()).toBe(clause);
    expect(panel.classes().join(" ")).toContain("font-mono");
  });
});

describe("ScanHistoryList — the two design facts, asserted mechanically", () => {
  it("does NOT run the shipped column assertion over its own shape", async () => {
    // THE ASSERTION THROWS ON THIS COLUMN SET, and that is what makes the case
    // meaningful rather than rhetorical: every column of a scan history is
    // DefMiner- or operator-authored, so ZERO are target-controlled, and
    // `assertColumnContract` binds EXACTLY ONE. First: prove the gate really
    // would reject this list.
    expect(() =>
      assertColumnContract("scan-history", [
        {
          id: "state",
          label: "State",
          widthClass: "w-24",
          targetControlled: false,
          sortKey: null,
          text: () => "",
        },
        {
          id: "seen",
          label: "Seen",
          widthClass: "w-24",
          targetControlled: false,
          sortKey: null,
          text: () => "",
        },
      ]),
    ).toThrow(/EXACTLY ONE/);

    // Then: the real component mounts and renders rows anyway, which it could
    // not do if it were running that gate over its own columns. Forcing a
    // column to claim `targetControlled: true` to get past the assertion would
    // be lying to a gate — and would make the gate's own message false for the
    // next person who read it looking for the column carrying a host's bytes.
    const { wrapper } = harness({ rows: [row()] });
    await flushPromises();
    expect(wrapper.find(`#${scanHistoryRowId(0)}`).exists()).toBe(true);
  });

  it("renders NO virtual scroller and NO sort control", async () => {
    const rows = Array.from({ length: 12 }, (_v, i) =>
      row({ scanId: `s${String(i)}` }),
    );
    const { wrapper } = harness({ rows });
    await flushPromises();

    // EVERY ROW IS IN THE DOM. A virtualised list would render a window.
    expect(
      wrapper.findAll("[data-defminer-scan-history-rows] > *"),
    ).toHaveLength(rows.length);
    const html = wrapper.html().toLowerCase();
    expect(html).not.toContain("recyclescroller");
    expect(html).not.toContain("vue-recycle-scroller");
    // AND NO SORT AFFORDANCE. The list renders newest-first, always: a scan
    // history's only meaningful order is chronological.
    expect(html).not.toContain("aria-sort");
    expect(wrapper.text().toLowerCase()).not.toContain("sort");
  });

  it("uses `id` hooks and binds no `data-*` to a value, on any state", async () => {
    const { wrapper } = harness({
      rows: [row({ operatorFilter: 'req.host.cont:"example.test"' })],
    });
    await flushPromises();
    await wrapper.get(`#${scanHistoryToggleId(0)}`).trigger("click");

    const root = wrapper.element;
    for (const node of [root, ...root.querySelectorAll("*")]) {
      expect(node.hasAttribute("title")).toBe(false);
      for (const attribute of [...node.attributes]) {
        if (!String(attribute.name).startsWith("data-")) continue;
        // BARE MARKERS ONLY. A `data-*` carrying a value is threat T-06-69 and
        // the shipped six-rule static gate reports any bound one categorically.
        expect(String(attribute.value)).toBe("");
      }
    }
  });
});
