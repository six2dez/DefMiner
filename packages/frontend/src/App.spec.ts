// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// REWRITTEN BY PLAN 05-09. The assertions below used to drive the tracer's
// single `getArtifacts` endpoint and its inline row rendering. Both are gone —
// App.vue now mounts the real tables over the keyset stores — so the stub is the
// client's declared SDK surface (`DefMinerBackendSdk`) and the row assertions
// live where the rows are rendered. What is UNCHANGED is every claim this file
// was making: the strip renders on first paint without counts, a tab is never
// removed on error, the failure surfaces in the body, and no rejection text
// reaches the page.

import type {
  InvalidationSummary,
  PageRequest,
  PageResponse,
  VisibleTotal,
} from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";

import type {
  AnalysisKey,
  CompatReport,
  DefMinerBackendSdk,
  ExportChunkOutcome,
  ExportChunkRequest,
  HealthOutcome,
  ObservationRow,
  PanelAnalysis,
  RetryOutcome,
  SettingRow,
} from "./api/client";
import { FRONTEND_CONTRACT_VERSION } from "./api/client";
import App from "./App.vue";
import type { ArtifactRow } from "./backend";
import { SDK_INJECTION_KEY } from "./backend";
import {
  DETECTED_CAIDO_LABEL,
  MIN_CAIDO_LABEL,
  MIN_SQLITE_LABEL,
  REFUSAL_HEADING,
  SURFACE_MISSING,
  SURFACE_PRESENT,
  UNKNOWN_VERSION,
} from "./components/compat-contract";
import { EXPORT_CTA } from "./components/export-contract";
import {
  counterId,
  HEALTH_HEADING,
  HEALTH_UNAVAILABLE_BODY,
} from "./components/health-contract";
import { EVIDENCE_PANEL_HEIGHT_CLASS } from "./components/panel-contract";

/**
 * Two rows with DELIBERATELY LOOKALIKE digests.
 *
 * `…0O0O…` against `…O0O0…` is the exact confusion the mandatory `font-mono`
 * rule exists to prevent. They are also distinct strings, so an assertion that
 * both are rendered cannot be satisfied by rendering one of them twice.
 */
const ROWS: ArtifactRow[] = [
  {
    project_id: "p1",
    sha256: "a1b2c30O0O4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7",
    byte_len: 4096,
    kind: "script",
    first_seen_at: 1_756_000_000_000,
    last_seen_at: 1_756_000_500_000,
    seen_count: 3,
    scan_state: "failed",
  },
  {
    project_id: "p1",
    sha256: "a1b2c3O0O04d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7",
    byte_len: 128,
    kind: "inline",
    first_seen_at: 1_756_000_100_000,
    last_seen_at: 1_756_000_600_000,
    seen_count: 1,
    scan_state: null,
  },
];

const TAB_LABELS = ["Artifacts", "Observations", "Health", "Settings"];

const TOTAL: VisibleTotal = {
  visible: 2,
  hiddenBySuppression: 0,
  suppressionRuleCount: 0,
};

/** The passthrough that stands in for `RecycleScroller` — see
 *  InventoryTable.spec.ts's header for why the real one renders nothing here. */
const ScrollerStub = defineComponent({
  name: "RecycleScroller",
  props: {
    items: { type: Array, required: true },
    itemSize: { type: Number, required: true },
    keyField: { type: String, required: true },
    buffer: { type: Number, default: 0 },
  },
  template: `<div><template v-for="(item, index) in items" :key="index"><slot :item="item" :index="index" /></template></div>`,
});

/** A build that runs. The refusal surface must be ABSENT against this. */
const COMPATIBLE_REPORT: CompatReport = {
  compatible: true,
  reason: null,
  minCaido: "0.57.1",
  minSqlite: "3.24.0",
  caidoVersion: "0.58.0",
  sqliteVersion: "3.46.0",
  surfaces: [],
};

type StubOptions = {
  readonly artifacts?: readonly ArtifactRow[];
  /** Reject every paged read — the RPC failure path. */
  readonly reject?: boolean;
  /** The analysis `getArtifactAnalysis` answers with, per digest. */
  readonly analyses?: ReadonlyMap<string, PanelAnalysis>;
  /** What a retry answers with. Defaults to a persisted move to `pending`. */
  readonly retryOutcome?: RetryOutcome;
  /** Records every retry the page issued, so a case can assert the KEY. */
  readonly retries?: AnalysisKey[];
  /** Receives the invalidation handler the page subscribed, so a case can
   *  emit a summary the way the backend would. */
  readonly captureHandler?: (
    handler: (summary: InvalidationSummary) => void,
  ) => void;
  /** Every export request the page issued, in order. The toolbar action must
   *  add NOTHING to this list — it opens the dialog and never exports. */
  readonly exports?: ExportChunkRequest[];
  /** Outcomes handed back in order, one per call. An exhausted queue answers
   *  the empty outcome, which is the safe end of the range. */
  readonly exportOutcomes?: ExportChunkOutcome[];
  /** When true the export endpoint rejects, so the dialog's failure path is
   *  exercised through the real client rather than around it. */
  readonly exportReject?: boolean;
  /** The settings rows `listSettings` answers with. */
  readonly settings?: readonly SettingRow[];
  /** What the health endpoint answers with. Defaults to four zero counters,
   *  which is what a healthy idle backend genuinely reports. */
  readonly health?: HealthOutcome;
  /** The compatibility report. Defaults to a COMPATIBLE build, so the refusal
   *  surface is absent unless a case asks for a refusing one. */
  readonly compat?: CompatReport;
  /** When true every endpoint EXCEPT `getCompat` rejects — the shape of a build
   *  that refused to run, where the compatibility report is one of only two
   *  endpoints that exist at all. */
  readonly onlyCompatAnswers?: boolean;
};

/**
 * A LITERAL stub of `DefMinerBackendSdk`, never a cast.
 *
 * The client declares the structural slice of the SDK it touches (P5-D41), and
 * a stub that has to be cast is a stub that stops failing when that surface
 * changes.
 */
function stubSdk(options: StubOptions = {}): DefMinerBackendSdk {
  const rows = options.artifacts ?? [];
  /**
   * A refusing build's answer to every name it never registered.
   *
   * ON `getContractVersion` TOO, AND THAT IS THE POINT RATHER THAN THOROUGHNESS.
   * `init()` returns from a refusal path having registered `getStatus` and
   * `getCompat` and nothing else, so a bundle that could still read a contract
   * version off a refusing build would be a stub describing a runtime that does
   * not exist — and the refusal surface would be under-tested in exactly the
   * direction that matters, since `getCompat` is deliberately the one read NOT
   * gated by that version check.
   */
  const refused = <TValue>(): Promise<TValue> =>
    Promise.reject(new Error("backend refused to run"));
  const refusing = options.onlyCompatAnswers === true;

  const page = <TRow>(items: readonly TRow[]): Promise<PageResponse<TRow>> =>
    options.reject === true || refusing
      ? Promise.reject(new Error("backend exploded"))
      : Promise.resolve({
          rows: items,
          nextCursor: null,
          scanned: items.length,
          exhausted: true,
        });

  return {
    backend: {
      getContractVersion: () =>
        refusing
          ? refused<number>()
          : Promise.resolve(FRONTEND_CONTRACT_VERSION),
      listArtifactsPage: (_request: PageRequest) => page(rows),
      listObservationsPage: (_request: PageRequest) => page<ObservationRow>([]),
      getArtifactAnalysis: (request: { readonly sha256: string }) =>
        Promise.resolve(options.analyses?.get(request.sha256) ?? null),
      retryAnalysis: (request: AnalysisKey) => {
        options.retries?.push(request);
        return Promise.resolve(
          options.retryOutcome ?? {
            ok: true,
            changed: true,
            state: "pending" as const,
          },
        );
      },
      countInventory: () =>
        options.reject === true || refusing
          ? Promise.reject(new Error("backend exploded"))
          : Promise.resolve(TOTAL),
      exportInventory: (request: ExportChunkRequest) => {
        options.exports?.push(request);
        if (options.exportReject === true) {
          return Promise.reject(new Error("backend exploded"));
        }
        const next = options.exportOutcomes?.shift();
        return Promise.resolve<ExportChunkOutcome>(
          next ?? { outcome: "empty" },
        );
      },
      listSettings: () =>
        refusing
          ? refused<readonly SettingRow[]>()
          : Promise.resolve(options.settings ?? []),
      writeSetting: () =>
        refusing
          ? refused<{ ok: true; stored: string }>()
          : Promise.resolve({ ok: true as const, stored: "1" }),
      getHealth: () =>
        refusing
          ? refused<HealthOutcome>()
          : Promise.resolve(
              options.health ?? {
                outcome: "health" as const,
                health: {
                  queueDepth: 0,
                  droppedCount: 0,
                  jobsInFlight: 0,
                  maxSliceMs: 0,
                },
              },
            ),
      // ANSWERS EVEN WHEN NOTHING ELSE DOES. That is not a convenience of the
      // stub, it is the shape of a refusing build: `init()` registers only
      // `getStatus` and `getCompat` on all three refusal paths.
      getCompat: () => Promise.resolve(options.compat ?? COMPATIBLE_REPORT),
      onEvent: (
        _event: "defminer:invalidated",
        callback: (summary: InvalidationSummary) => void,
      ) => {
        options.captureHandler?.(callback);
        return { stop: () => undefined };
      },
    },
  };
}

function mountWith(sdk: DefMinerBackendSdk | undefined): VueWrapper {
  return mount(App, {
    global: {
      provide: { [SDK_INJECTION_KEY]: sdk },
      stubs: { RecycleScroller: ScrollerStub },
    },
  });
}

async function settle(wrapper: VueWrapper): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
}

describe("App", () => {
  it("renders every tab label on first paint, before any query resolves", () => {
    // Synchronously, with no `flushPromises` and no `await` anywhere above. If
    // the tab strip waited on the query — the defect this asserts against —
    // nothing below would be on screen, and the operator would be looking at an
    // empty page while the backend chews through a large bundle.
    const wrapper = mountWith(stubSdk());

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(TAB_LABELS.length);
    expect(tabs.map((t) => t.text())).toEqual(TAB_LABELS);

    // And NO count on any of them. A count that is still resolving must render
    // as ABSENT, never as `0` — a zero reads as "nothing found here" and stops
    // the operator opening the one tab that had the finding.
    for (const tab of tabs) {
      expect(tab.text()).not.toMatch(/\d/);
    }
  });

  it("renders both artifact rows as text once the page resolves", async () => {
    const wrapper = mountWith(stubSdk({ artifacts: ROWS }));
    await settle(wrapper);

    const text = wrapper.text();
    for (const row of ROWS) {
      expect(text).toContain(row.sha256);
    }
    expect(text).toContain("4096");
    expect(text).toContain("script");
    expect(text).toContain("inline");
  });

  it("renders every target-derived digest in font-mono", async () => {
    const wrapper = mountWith(stubSdk({ artifacts: ROWS }));
    await settle(wrapper);

    for (const row of ROWS) {
      // SOME element holding this exact text carries `font-mono`. Not the
      // outermost: the grid cell is layout and the text lives one level in,
      // inside HighlightSlices' own `font-mono` span. Asserting on the
      // outermost would be asserting where the class is, which is a fact about
      // this component's markup rather than about what the operator sees.
      const holders = wrapper
        .findAll("span")
        .filter((span) => span.text() === row.sha256);
      expect(holders.length).toBeGreaterThan(0);
      expect(
        holders.some((span) => span.classes().includes("font-mono")),
        `no font-mono element holds ${row.sha256}`,
      ).toBe(true);
    }
  });

  it("keeps every tab rendered and routable when the query fails", async () => {
    const wrapper = mountWith(stubSdk({ reject: true }));
    await settle(wrapper);

    // A tab is NEVER removed on error. The failure belongs in the body region.
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((t) => t.text())).toEqual(TAB_LABELS);

    expect(wrapper.text()).toContain("Could not load secrets");
    expect(wrapper.text()).toContain("blocks its single thread");

    // And the rejection's own message is NOT rendered. An error crossing the
    // RPC boundary can quote target-controlled bytes, and no sentence on this
    // page ever interpolates one.
    expect(wrapper.text()).not.toContain("backend exploded");
  });

  it("still routes to another tab after the query fails", async () => {
    const wrapper = mountWith(stubSdk({ reject: true }));
    await settle(wrapper);

    const health = wrapper
      .findAll('[role="tab"]')
      .find((t) => t.text() === "Health");
    expect(health).toBeDefined();
    await health!.trigger("click");

    expect(health!.attributes("aria-selected")).toBe("true");
    // AND THE HEALTH BODY IS THE REAL ONE. Until plan 05-12 this asserted the
    // tracer's empty-state placeholder, which was the honest assertion while
    // the tab routed to nothing; asserting it now would assert that the tab
    // still routes to nothing.
    await settle(wrapper);
    expect(wrapper.text()).toContain(HEALTH_HEADING);
  });

  it("routes to Health when the table's Open Health action is used", async () => {
    // The TABLE asks and the PAGE moves. A table that switched tabs itself
    // would be a component writing to a sibling's state.
    const wrapper = mountWith(stubSdk({ reject: true }));
    await settle(wrapper);

    const action = wrapper
      .findAll("button")
      .find((b) => b.text() === "Open Health");
    expect(action).toBeDefined();
    await action!.trigger("click");

    const health = wrapper
      .findAll('[role="tab"]')
      .find((t) => t.text() === "Health");
    expect(health!.attributes("aria-selected")).toBe("true");
  });

  it("renders the empty state when the backend answers an empty page", async () => {
    const wrapper = mountWith(stubSdk({ artifacts: [] }));
    await settle(wrapper);

    expect(wrapper.findAll('[role="tab"]')).toHaveLength(TAB_LABELS.length);
    expect(wrapper.text()).toContain("Nothing analysed on this target yet");
  });

  it("renders the ERROR state, not the empty one, when no SDK was provided", async () => {
    // A page mounted without a provider is not a page with nothing on it. An
    // empty state there would tell the operator the target is clean when in
    // fact nothing was asked.
    const wrapper = mountWith(undefined);
    await settle(wrapper);

    expect(wrapper.findAll('[role="tab"]')).toHaveLength(TAB_LABELS.length);
    expect(wrapper.text()).toContain("Could not load secrets");
    expect(wrapper.text()).not.toContain("Nothing analysed on this target yet");
  });

  it("wraps the tab strip instead of scrolling it or hiding tabs behind a menu", () => {
    const wrapper = mountWith(stubSdk());
    const nav = wrapper.find("nav");

    expect(nav.classes()).toContain("flex-wrap");
    // A horizontal scroll container or an overflow menu both hide a tab behind
    // an interaction, and a hidden tab is a finding the operator never opens.
    expect(nav.classes()).not.toContain("overflow-x-auto");
    expect(nav.classes()).not.toContain("overflow-x-scroll");
  });

  it("marks exactly one tab active, with the accent token", () => {
    const wrapper = mountWith(stubSdk());
    const tabs = wrapper.findAll('[role="tab"]');

    const active = tabs.filter((t) => t.attributes("aria-selected") === "true");
    expect(active).toHaveLength(1);
    expect(active[0].text()).toBe("Artifacts");
    expect(active[0].classes()).toContain("text-primary-500");

    // Accent is reserved. Every other tab is surface-toned.
    for (const tab of tabs.filter(
      (t) => t.attributes("aria-selected") !== "true",
    )) {
      expect(tab.classes()).not.toContain("text-primary-500");
      expect(tab.classes()).toContain("text-surface-400");
    }
  });

  it("renders no markup from row data — every cell is text", async () => {
    const hostile: ArtifactRow[] = [
      {
        ...ROWS[0],
        sha256: "<img src=x onerror=alert(1)>",
        kind: "<script>alert(2)</script>",
      },
    ];
    const wrapper = mountWith(stubSdk({ artifacts: hostile }));
    await settle(wrapper);

    // The bytes are VISIBLE as text…
    expect(wrapper.text()).toContain("<img src=x onerror=alert(1)>");
    // …and inert as markup. No element was created from them.
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.element.querySelector("script")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// THE SPLIT BODY, AND THE FLAGS THE COALESCER READS
// ---------------------------------------------------------------------------

describe("App — the split body (05-UI-SPEC § Data & Interaction Contract)", () => {
  const analysisOf = (
    sha256: string,
    over: Partial<PanelAnalysis> = {},
  ): PanelAnalysis => ({
    sha256,
    detectorSetHash: "phase1-no-corpus",
    scanState: "failed",
    bytesWalked: 0,
    byteLen: 4096,
    startedAt: 1_756_000_000_000,
    finishedAt: 1_756_000_100_000,
    ...over,
  });

  const panel = (wrapper: VueWrapper) =>
    wrapper.get("#defminer-evidence-panel");

  it("renders the table and the panel side by side, at the spacing-scale gap", async () => {
    const wrapper = mountWith(stubSdk({ artifacts: ROWS }));
    await settle(wrapper);

    // `gap-4` is the design contract's `lg` step, and the split body is the one
    // place it separates two REGIONS rather than two controls.
    const body = wrapper.get('[role="tabpanel"]').element.parentElement;
    expect(body?.className).toContain("gap-4");
    expect(panel(wrapper).classes()).toContain(EVIDENCE_PANEL_HEIGHT_CLASS);
  });

  it("opens the panel on a row click without navigating away", async () => {
    const wrapper = mountWith(
      stubSdk({
        artifacts: ROWS,
        analyses: new Map([[ROWS[0].sha256, analysisOf(ROWS[0].sha256)]]),
      }),
    );
    await settle(wrapper);

    const before = window.location.href;
    const activeBefore = wrapper
      .findAll('[role="tab"]')
      .find((t) => t.attributes("aria-selected") === "true")
      ?.text();

    await wrapper.get('[role="row"][tabindex="0"]').trigger("click");
    await settle(wrapper);

    // A ROW CLICK OPENS THE PANEL AND DOES NOT NAVIGATE. The panel is a region
    // of this page, not a destination.
    expect(window.location.href).toBe(before);
    expect(
      wrapper
        .findAll('[role="tab"]')
        .find((t) => t.attributes("aria-selected") === "true")
        ?.text(),
    ).toBe(activeBefore);
    expect(wrapper.text()).toContain("Analysis failed");
  });

  it("accrues an invalidation summary into the pill instead of reacting, while the panel is open", async () => {
    let emitSummary: ((summary: InvalidationSummary) => void) | undefined;
    const wrapper = mountWith(
      stubSdk({
        artifacts: ROWS,
        analyses: new Map([[ROWS[0].sha256, analysisOf(ROWS[0].sha256)]]),
        captureHandler: (handler) => {
          emitSummary = handler;
        },
      }),
    );
    await settle(wrapper);
    expect(emitSummary).toBeDefined();

    await wrapper.get('[role="row"][tabindex="0"]').trigger("click");
    await settle(wrapper);

    // The suppression rule keys on exactly the two flags the row click sets. A
    // panel that opened WITHOUT setting them would leave the operator exposed
    // to the row shift the coalescer exists to prevent (T-05-54).
    emitSummary?.({
      projectId: "server-scoped",
      category: "artifacts",
      changedCount: 7,
      newestId: "d1",
    });
    await new Promise((resolve) => setTimeout(resolve, 700));
    await wrapper.vm.$nextTick();

    const pill = wrapper.get("#defminer-coalescing-pill");
    expect(pill.text()).toContain("7 new since you opened this");
    // ZERO REACTIONS: the rows on screen are the rows that were on screen when
    // the operator clicked.
    expect(wrapper.text()).toContain(ROWS[0].sha256);
  });

  it("closing the panel clears both flags and applies nothing by itself", async () => {
    let emitSummary: ((summary: InvalidationSummary) => void) | undefined;
    const wrapper = mountWith(
      stubSdk({
        artifacts: ROWS,
        analyses: new Map([[ROWS[0].sha256, analysisOf(ROWS[0].sha256)]]),
        captureHandler: (handler) => {
          emitSummary = handler;
        },
      }),
    );
    await settle(wrapper);

    await wrapper.get('[role="row"][tabindex="0"]').trigger("click");
    await settle(wrapper);
    emitSummary?.({
      projectId: "server-scoped",
      category: "artifacts",
      changedCount: 3,
      newestId: "d1",
    });
    await new Promise((resolve) => setTimeout(resolve, 700));
    await wrapper.vm.$nextTick();

    await wrapper.get("#defminer-evidence-close").trigger("click");
    await wrapper.vm.$nextTick();

    // The panel is back to its unselected frame…
    expect(wrapper.get("#defminer-evidence-panel").text()).toContain(
      "No row selected",
    );
    // …and the pending count is STILL PENDING. The pill never auto-applies
    // (UI-SPEC Open Decision D4); closing is not the operator asking.
    expect(wrapper.get("#defminer-coalescing-pill").text()).toContain(
      "3 new since you opened this",
    );
  });

  it("keeps the panel region across a selection change and a tab change", async () => {
    const wrapper = mountWith(
      stubSdk({
        artifacts: ROWS,
        analyses: new Map([
          [ROWS[0].sha256, analysisOf(ROWS[0].sha256)],
          [ROWS[1].sha256, analysisOf(ROWS[1].sha256, { scanState: "done" })],
        ]),
      }),
    );
    await settle(wrapper);

    const region = panel(wrapper).element.parentElement;
    const classes = [...panel(wrapper).classes()].sort();

    const rows = wrapper.findAll('[role="row"][tabindex="0"]');
    await rows[0].trigger("click");
    await settle(wrapper);
    await rows[1].trigger("click");
    await settle(wrapper);

    expect(panel(wrapper).element.parentElement).toBe(region);
    expect([...panel(wrapper).classes()].sort()).toEqual(classes);

    const observations = wrapper
      .findAll('[role="tab"]')
      .find((t) => t.text() === "Observations");
    await observations?.trigger("click");
    await settle(wrapper);

    // ACROSS A TAB CHANGE TOO. The panel is a region of the page, not of the
    // table it happens to be beside.
    expect(panel(wrapper).element.parentElement).toBe(region);
    expect([...panel(wrapper).classes()].sort()).toEqual(classes);
  });

  it("updates the panel on a successful retry WITHOUT re-ordering the table", async () => {
    const retries: AnalysisKey[] = [];
    const wrapper = mountWith(
      stubSdk({
        artifacts: ROWS,
        analyses: new Map([[ROWS[0].sha256, analysisOf(ROWS[0].sha256)]]),
        retries,
      }),
    );
    await settle(wrapper);

    /** ORDER, BY IDENTITY. The row's TEXT is expected to change — the badge
     *  updates in place, which is the point — so comparing whole rows would
     *  assert the opposite of what this case is about. */
    const order = (): string[] =>
      wrapper
        .findAll('[role="row"][tabindex="0"]')
        .map(
          (row) =>
            ROWS.find((r) => row.text().includes(r.sha256))?.sha256 ?? "?",
        );
    const orderBefore = order();

    await wrapper.get('[role="row"][tabindex="0"]').trigger("click");
    await settle(wrapper);
    await wrapper.get("#defminer-evidence-retry").trigger("click");
    await settle(wrapper);

    expect(retries).toEqual([
      {
        projectId: "server-scoped",
        sha256: ROWS[0].sha256,
        detectorSetHash: "phase1-no-corpus",
      },
    ]);
    expect(wrapper.get("#defminer-evidence-state").text()).toContain("Queued");

    // THE TABLE IS UNMOVED. A retry happens with the panel open by
    // construction, so refetching the page to pick the new state up would
    // re-order the rows at the exact moment the operator is mid-triage.
    expect(order()).toEqual(orderBefore);

    // AND THE ROW'S OWN BADGE MOVED WITH THE PANEL, in place. The state the
    // backend read back reaches the table through an overlay rather than
    // through a refetch, so the marking is current without the rows shifting.
    expect(
      wrapper.findAll("[data-defminer-status-badge]").map((b) => b.text()),
    ).toEqual(["Queued"]);
  });

  it("marks UI-09's degradation on the running page, from the paged rows", async () => {
    // THE GAP PLAN 05-09 RECORDED AND COULD NOT CLOSE. Its components were
    // fully exercised against fixtures; nothing was marked on the page because
    // the reads carried no state. These rows carry one.
    const wrapper = mountWith(stubSdk({ artifacts: ROWS }));
    await settle(wrapper);

    // ROWS[0] is `failed`; ROWS[1] has never been analysed.
    expect(
      wrapper.findAll("[data-defminer-status-badge]").map((b) => b.text()),
    ).toEqual(["Failed"]);
    const banner = wrapper.get("[data-defminer-partial-banner]");
    expect(banner.text()).toContain("are Partial or Failed");
    expect(banner.text()).toContain("a floor, not a total");
    // The narrowing action is offered, because a scan-state filter column now
    // exists behind it.
    expect(banner.text()).toContain("Show only affected artifacts");
  });
});

// ---------------------------------------------------------------------------
// UI-06 — THE TOOLBAR ACTION, AND WHAT IT MUST NOT DO
// ---------------------------------------------------------------------------

describe("the export action opens the dialog and never exports (UI-06)", () => {
  it("renders the primary action with the design contract's label", () => {
    const wrapper = mountWith(stubSdk());
    expect(wrapper.get("#defminer-export-open").text()).toBe(EXPORT_CTA);
  });

  it("does not mount the dialog until the action is pressed", () => {
    const wrapper = mountWith(stubSdk());
    expect(wrapper.find("#defminer-export-dialog").exists()).toBe(false);
  });

  it("OPENS the dialog and issues NO export call — the whole point of the row", async () => {
    // The copy row says "opens the redaction dialog, never exports directly",
    // and this is the assertion that makes that a fact: an export reachable from
    // one press of a toolbar button is a raw export one mis-click away, and the
    // two deliberate acts would begin from the wrong place.
    const exports: ExportChunkRequest[] = [];
    const wrapper = mountWith(stubSdk({ exports }));

    await wrapper.get("#defminer-export-open").trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.find("#defminer-export-dialog").exists()).toBe(true);
    expect(exports, "the toolbar action exported directly").toHaveLength(0);
  });

  it("does NOT take the accent — 05-UI-SPEC.md § Color names the export button in the list accent is not used for", () => {
    const wrapper = mountWith(stubSdk());
    const classes =
      wrapper.get("#defminer-export-open").attributes("class") ?? "";
    // The focus RING is accent by rule 3 of the five; the button's own border
    // and text are not.
    expect(classes).toContain("border-surface-600");
    expect(classes.replace(/focus:ring-primary-500/g, "")).not.toContain(
      "primary-500",
    );
  });

  it("closes on the dialog's own dismissal", async () => {
    const wrapper = mountWith(stubSdk());
    await wrapper.get("#defminer-export-open").trigger("click");
    await wrapper.vm.$nextTick();
    await wrapper.get("#defminer-export-cancel").trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.find("#defminer-export-dialog").exists()).toBe(false);
  });

  it("carries the ACTIVE table and its filter into the export request", async () => {
    const exports: ExportChunkRequest[] = [];
    const wrapper = mountWith(
      stubSdk({
        exports,
        exportOutcomes: [
          {
            outcome: "chunk",
            chunk: {
              filename: "defminer-artifacts-redacted-20260829T000000Z.csv",
              contentType: "text/csv;charset=utf-8",
              text: "x\r\n",
              chunkIndex: 0,
              rows: 1,
              hasMore: false,
              nextCursor: null,
            },
          },
        ],
      }),
    );

    await wrapper.get("#defminer-export-open").trigger("click");
    await wrapper.vm.$nextTick();
    await wrapper.get("#defminer-export-confirm").trigger("click");
    await wrapper.vm.$nextTick();

    expect(exports).toHaveLength(1);
    expect(exports[0]?.table).toBe("artifacts");
    expect(exports[0]?.mode, "the default is not redacted").toBe("redacted");
    expect(exports[0]?.sortKey).toBe("last_seen");
  });
});

// ---------------------------------------------------------------------------
// OBS-01 — THE HEALTH TAB'S REAL BODY
// ---------------------------------------------------------------------------

describe("the health tab mounts the real strip (OBS-01, research P-07)", () => {
  it("renders the four counters once the tab is opened", async () => {
    const wrapper = mountWith(
      stubSdk({
        artifacts: ROWS,
        health: {
          outcome: "health",
          health: {
            queueDepth: 4_096,
            droppedCount: 12,
            jobsInFlight: 1,
            maxSliceMs: 987,
          },
        },
      }),
    );
    await settle(wrapper);

    const health = wrapper
      .findAll('[role="tab"]')
      .find((t) => t.text() === "Health");
    await health!.trigger("click");
    await settle(wrapper);

    expect(wrapper.get(`#${counterId("queueDepth")}`).text()).toContain(
      "4,096",
    );
    expect(wrapper.get(`#${counterId("droppedCount")}`).text()).toContain("12");
    expect(wrapper.get(`#${counterId("jobsInFlight")}`).text()).toContain("1");
    expect(wrapper.get(`#${counterId("maxSliceMs")}`).text()).toContain(
      "987 ms",
    );
  });

  it("carries the endpoint's `unavailable` outcome through to the page", async () => {
    // The page must not flatten the two outcomes into counters. Four zeroes for
    // a plugin with no project resolved would be the opposite of the truth.
    const wrapper = mountWith(
      stubSdk({
        health: { outcome: "unavailable", reason: "no-project" },
      }),
    );
    await settle(wrapper);

    const health = wrapper
      .findAll('[role="tab"]')
      .find((t) => t.text() === "Health");
    await health!.trigger("click");
    await settle(wrapper);

    expect(wrapper.text()).toContain(HEALTH_UNAVAILABLE_BODY);
  });

  it("leaves the two entity tabs mounting their own bodies", async () => {
    // The health body replaced a placeholder shared by two tabs. This is the
    // assertion that the replacement did not take the wrong branch with it.
    const wrapper = mountWith(stubSdk({ artifacts: ROWS }));
    await settle(wrapper);

    expect(wrapper.text(), "the artifacts table stopped rendering").toContain(
      ROWS[0].sha256,
    );
    expect(wrapper.text()).not.toContain(HEALTH_HEADING);
  });

  it("routes from the table's error action STRAIGHT to a rendered strip", async () => {
    // The copy row promises "open Settings → Health to see queue depth and
    // dropped count". One action, and the numbers are on screen — the whole
    // point of routing the error state here rather than to a paragraph.
    const wrapper = mountWith(stubSdk({ reject: true }));
    await settle(wrapper);

    const action = wrapper
      .findAll("button")
      .find((b) => b.text() === "Open Health");
    await action!.trigger("click");
    await settle(wrapper);

    expect(wrapper.find("[data-defminer-health-strip]").exists()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// COMPAT-01 — THE VISIBLE REFUSAL SURFACE
// ---------------------------------------------------------------------------
//
// The debt `packages/backend/src/index.ts` recorded as owed to this phase:
// "COMPAT-01's 'clear message' is this log line plus this RPC; the visible
// surface is owed to Phase 5 (decision P1-D5)."

/** A build that refused, with the reason `checkCompat` actually produces and a
 *  probe matrix that has both a present and a missing surface in it. */
const REFUSING_REPORT: CompatReport = {
  compatible: false,
  reason:
    "DefMiner requires Caido 0.57.1 or newer; this instance reports 0.55.3. " +
    "Passive analysis is disabled.",
  minCaido: "0.57.1",
  minSqlite: "3.24.0",
  caidoVersion: "0.55.3",
  sqliteVersion: null,
  surfaces: [
    {
      name: "sdk.events.onInterceptResponse",
      scope: "sdk",
      ok: true,
      error: null,
    },
    {
      name: "sdk.events.onProjectChange",
      scope: "sdk",
      ok: false,
      // A PROBE THAT THREW rather than one that merely found nothing. Both are
      // reported as missing by `probeSurfaces`, and only this one has an error
      // to render — so without it here the branch that renders one is a branch
      // no test reaches.
      error:
        "TypeError: Cannot read properties of undefined (reading 'onProjectChange')",
    },
  ],
};

describe("the compatibility refusal surface (COMPAT-01, debt P1-D5)", () => {
  it("renders when ONLY the compatibility endpoint answers", async () => {
    // The shape of a refusing build: `init()` returned having registered
    // `getStatus` and `getCompat` and nothing else, so the surface may depend
    // on `getCompat` and on nothing the refusal path does not register.
    const wrapper = mountWith(
      stubSdk({ onlyCompatAnswers: true, compat: REFUSING_REPORT }),
    );
    await settle(wrapper);

    expect(wrapper.find("[data-defminer-compat-refusal]").exists()).toBe(true);
    expect(wrapper.text()).toContain(REFUSAL_HEADING);
  });

  it("names both minimum versions and the reason the backend gave", async () => {
    const wrapper = mountWith(
      stubSdk({ onlyCompatAnswers: true, compat: REFUSING_REPORT }),
    );
    await settle(wrapper);

    const text = wrapper.text();
    expect(text).toContain(MIN_CAIDO_LABEL);
    expect(text).toContain("0.57.1");
    expect(text).toContain(MIN_SQLITE_LABEL);
    expect(text).toContain("3.24.0");
    expect(text, "the reason is not on the surface").toContain(
      REFUSING_REPORT.reason,
    );
  });

  it("says a version was not reported rather than leaving the cell blank", async () => {
    // "No version reported" is itself one of the refusal reasons, so a blank
    // would hide the fact that caused the refusal being explained above it.
    const wrapper = mountWith(
      stubSdk({ onlyCompatAnswers: true, compat: REFUSING_REPORT }),
    );
    await settle(wrapper);

    expect(wrapper.text()).toContain(UNKNOWN_VERSION);
    expect(wrapper.text()).toContain(DETECTED_CAIDO_LABEL);
  });

  it("renders the probe matrix, marking each surface in WORDS", async () => {
    // Colour is never the sole carrier of meaning. The tint is the redundant
    // half; the word is the carrier.
    const wrapper = mountWith(
      stubSdk({ onlyCompatAnswers: true, compat: REFUSING_REPORT }),
    );
    await settle(wrapper);

    const matrix = wrapper.get("[data-defminer-compat-surfaces]").text();
    expect(matrix).toContain("sdk.events.onInterceptResponse");
    expect(matrix).toContain(SURFACE_PRESENT);
    expect(matrix).toContain("sdk.events.onProjectChange");
    expect(matrix).toContain(SURFACE_MISSING);
  });

  it("renders a probe's own error text, through the display path", async () => {
    // A probe that THREW has something to say that a probe that merely found
    // nothing does not. It is plugin-generated — a caught TypeError from a
    // property access this plugin made — so it gets its own element rather than
    // an interpolation into a DefMiner sentence.
    const wrapper = mountWith(
      stubSdk({ onlyCompatAnswers: true, compat: REFUSING_REPORT }),
    );
    await settle(wrapper);

    expect(wrapper.get("[data-defminer-compat-surfaces]").text()).toContain(
      "Cannot read properties of undefined",
    );
  });

  it("truncates an over-long reason and SAYS it truncated", async () => {
    // The panel cap is 2,048 graphemes and no shipped refusal reason is near
    // it — but a cap the operator cannot see is a cap that silently eats the
    // half of a sentence naming the missing surfaces.
    const wrapper = mountWith(
      stubSdk({
        onlyCompatAnswers: true,
        compat: { ...REFUSING_REPORT, reason: "x".repeat(2100) },
      }),
    );
    await settle(wrapper);

    const text = wrapper.get("[data-defminer-compat-refusal]").text();
    expect(text).toContain("Truncated at 2,048 of 2,100 characters.");
  });

  it("is ABSENT when the build is compatible", async () => {
    const wrapper = mountWith(stubSdk({ artifacts: ROWS }));
    await settle(wrapper);

    expect(wrapper.find("[data-defminer-compat-refusal]").exists()).toBe(false);
    expect(wrapper.text()).not.toContain(REFUSAL_HEADING);
  });

  it("keeps the tab strip rendered and routable on a refusing build", async () => {
    // A tab is never removed, and least of all here: the operator's next
    // question after "why is nothing happening" is often "what did it record
    // before it stopped".
    const wrapper = mountWith(
      stubSdk({ onlyCompatAnswers: true, compat: REFUSING_REPORT }),
    );
    await settle(wrapper);

    expect(wrapper.findAll('[role="tab"]').map((t) => t.text())).toEqual(
      TAB_LABELS,
    );
  });

  it("renders no rejection text from the endpoints that refused", async () => {
    // Every other call rejected. None of their messages reaches the page —
    // an error crossing the RPC boundary can quote target-controlled bytes.
    const wrapper = mountWith(
      stubSdk({ onlyCompatAnswers: true, compat: REFUSING_REPORT }),
    );
    await settle(wrapper);

    expect(wrapper.text()).not.toContain("backend refused to run");
    expect(wrapper.text()).not.toContain("backend exploded");
  });
});
