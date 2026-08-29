// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/components/FindingsTable.spec.ts — the status badge,
// UI-09's degradation marking, and the two shipped tables.
//
// ===========================================================================
// THE BADGE CASES ARE TABLE-DRIVEN OVER THE SHIPPED VOCABULARY
// ===========================================================================
// The suite iterates `SCAN_STATES` itself and asserts the id-set it exercised
// EQUALS that list. Iterating a hand-written array of five strings would pass
// unchanged the day a sixth state is added, which is precisely the day the badge
// starts rendering nothing for a real row — and under UI-09 a degraded analysis
// rendering as nothing is a degraded analysis silently presented as complete.
// The `Record<ScanState, …>` in StatusBadge.vue makes that a typecheck failure;
// this file makes it a test failure too, because the two fail at different
// moments and a reader of one should not have to trust the other.
//
// ===========================================================================
// WHAT THE ANALYSES MAP IS, AND WHY THE SHIPPED PAGE HAS NONE
// ===========================================================================
// The paged reads in packages/backend/src/store/reads.ts select no `scan_state`
// and no endpoint returns one. The tables therefore take the state as a REQUIRED
// NULLABLE prop, and App.vue passes `null` — an explicit "nothing to report"
// rather than a silent default. The fixtures here pass a populated map, so what
// is proved below is that the wiring renders correctly when the data exists; the
// data itself is a backend change no plan has made yet, and the SUMMARY records
// it rather than letting a green suite imply otherwise.

import type {
  PageRequest,
  PageResponse,
  ScanState,
  VisibleTotal,
} from "@defminer/engine/contract";
import { SCAN_STATES } from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";

import type { ObservationRow, RpcResult } from "../api/client";
import type { ArtifactRow } from "../backend";
import type { InventoryStore, PageReader } from "../stores/inventory";
import { createInventoryStore } from "../stores/inventory";

import ArtifactsTable from "./ArtifactsTable.vue";
import ObservationsTable from "./ObservationsTable.vue";
import PartialBanner from "./PartialBanner.vue";
import StatusBadge from "./StatusBadge.vue";

/** The labels 05-UI-SPEC.md § "Status vocabulary" fixes, restated HERE and only
 *  here — the component derives its map from `SCAN_STATES` and must not restate
 *  the members, so the copy has to be asserted from the outside. */
const EXPECTED_LABELS: Readonly<Record<ScanState, string>> = {
  pending: "Queued",
  running: "Analysing",
  done: "Complete",
  partial: "Partial",
  failed: "Failed",
};

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

const TOTAL: VisibleTotal = {
  visible: 3,
  hiddenBySuppression: 0,
  suppressionRuleCount: 0,
};

function digest(index: number): string {
  return String(index).padStart(2, "0").repeat(32);
}

function artifactRows(count: number): ArtifactRow[] {
  const rows: ArtifactRow[] = [];
  for (let index = 0; index < count; index++) {
    rows.push({
      project_id: "p1",
      sha256: digest(index),
      byte_len: 1024 + index,
      kind: "script",
      first_seen_at: 1_756_000_000_000,
      last_seen_at: 1_756_000_500_000 + index,
      scan_state: null,
      seen_count: 1,
    });
  }
  return rows;
}

function observationRows(count: number): ObservationRow[] {
  const rows: ObservationRow[] = [];
  for (let index = 0; index < count; index++) {
    rows.push({
      project_id: "p1",
      sha256: digest(index),
      request_id: `req-${String(index)}`,
      url: `https://target.example/app-${String(index)}.js`,
      status: 200,
      content_type: index === 0 ? null : "application/javascript",
      observed_at: 1_756_000_500_000 + index,
    });
  }
  return rows;
}

type Harness<TRow> = {
  readonly store: InventoryStore<TRow>;
  readonly requests: PageRequest[];
};

function harness<TRow>(
  rows: readonly TRow[],
  table: "artifacts" | "observations",
  sortKey: string,
): Harness<TRow> {
  const requests: PageRequest[] = [];
  const readPage: PageReader<TRow> = (request) => {
    requests.push(request);
    return Promise.resolve({
      ok: true,
      value: {
        rows,
        nextCursor: null,
        scanned: rows.length,
        exhausted: true,
      } satisfies PageResponse<TRow>,
    } satisfies RpcResult<PageResponse<TRow>>);
  };

  return {
    store: createInventoryStore<TRow>({
      projectId: "p1",
      table,
      sortKey,
      direction: "desc",
      readPage,
      countRows: () => Promise.resolve({ ok: true, value: TOTAL }),
    }),
    requests,
  };
}

async function settle(wrapper: VueWrapper): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

describe("StatusBadge — the SHIPPED vocabulary, exhaustively", () => {
  const exercised: ScanState[] = [];

  it.each(SCAN_STATES.map((state) => [state] as const))(
    "renders %s with the label the contract fixes, as TEXT",
    (state) => {
      exercised.push(state);
      const wrapper = mount(StatusBadge, { props: { state } });

      // COLOUR IS NEVER THE SOLE CARRIER. Strip every class and the badge is
      // still readable, which is what the operator with a restyled theme, a
      // monochrome screenshot or a colour vision deficiency actually has.
      expect(wrapper.text()).toBe(EXPECTED_LABELS[state]);
      expect(wrapper.classes().length).toBeGreaterThan(0);
    },
  );

  it("exercised EVERY member of the vocabulary, by set equality", () => {
    // The difference between "iterates the vocabulary" and "iterates the part
    // of it somebody wrote a case for".
    expect([...exercised].sort()).toEqual([...SCAN_STATES].sort());
  });

  it("uses the two semantic colours and the destructive one, and never the accent", () => {
    const toneOf = (state: ScanState): string[] =>
      mount(StatusBadge, { props: { state } }).classes();

    expect(toneOf("done")).toContain("text-success-500");
    // THE PALETTE HAS NO `warning` ROLE, so the stopped-early state is `info`
    // plus its mandatory word rather than a yellow.
    expect(toneOf("partial")).toContain("text-info-500");
    expect(toneOf("failed")).toContain("text-danger-500");
    // The two not-yet-finished states share the level-4 surface tone: neither
    // good news nor bad.
    expect(toneOf("pending")).toContain("text-surface-400");
    expect(toneOf("running")).toContain("text-surface-400");

    for (const state of SCAN_STATES) {
      for (const token of toneOf(state)) {
        expect(token, `${state} spends the reserved accent`).not.toContain(
          "primary-",
        );
      }
    }
  });

  it("stays inside the fixed row — no cell wraps", () => {
    for (const state of SCAN_STATES) {
      expect(mount(StatusBadge, { props: { state } }).classes()).toContain(
        "whitespace-pre",
      );
    }
  });
});

// ---------------------------------------------------------------------------
// PartialBanner
// ---------------------------------------------------------------------------

describe("PartialBanner — UI-09's floor statement", () => {
  const banner = (
    props: Partial<{
      affected: number;
      total: number;
      includesFailed: boolean;
      canNarrow: boolean;
    }> = {},
  ) =>
    mount(PartialBanner, {
      props: {
        affected: 2,
        total: 9,
        includesFailed: false,
        canNarrow: true,
        ...props,
      },
    });

  it("states the counts and says FLOOR, NOT A TOTAL, in words", () => {
    expect(banner().text()).toContain(
      "Partial view — 2 of 9 artifacts on this target are Partial or Failed. The counts below are a floor, not a total.",
    );
  });

  it("agrees in number at one — never `1 artifact(s)`", () => {
    const text = banner({ affected: 1, total: 1 }).text();
    expect(text).toContain("1 of 1 artifact on this target");
    expect(text).not.toContain("artifact(s)");
    expect(text).not.toContain("1 artifacts");
  });

  it("keeps the chrome INFORMATIONAL and takes DESTRUCTIVE only on the count — FLAG F3", () => {
    // Two elements, two rules, and the precedence stated rather than left to be
    // rediscovered from two contract rows that both name this banner.
    const partialOnly = banner({ includesFailed: false });
    expect(partialOnly.classes()).toContain("border-info-500");
    expect(
      partialOnly.find("[data-defminer-partial-count]").classes(),
    ).toContain("text-info-500");

    const withFailed = banner({ includesFailed: true });
    // Chrome unchanged…
    expect(withFailed.classes()).toContain("border-info-500");
    // …count escalated, because `failed` means NOTHING was inspected.
    expect(
      withFailed.find("[data-defminer-partial-count]").classes(),
    ).toContain("text-danger-500");
  });

  it("carries the narrowing action as a TEXT label, never an icon", () => {
    const action = banner().find("button");
    expect(action.exists()).toBe(true);
    expect(action.text()).toBe("Show only affected artifacts");
    expect(action.classes()).toContain("focus:ring-primary-500");
  });

  it("offers NO action when no filter can narrow the list", () => {
    // A button that cannot change the list teaches the operator that the
    // affordance does nothing. The sentence still renders — the floor statement
    // is the point, and it is true with or without a way to act on it.
    const withoutNarrowing = banner({ canNarrow: false });
    expect(withoutNarrowing.find("button").exists()).toBe(false);
    expect(withoutNarrowing.text()).toContain("a floor, not a total");
  });

  it("emits show-only-affected rather than filtering the store itself", async () => {
    const wrapper = banner();
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("show-only-affected")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// ArtifactsTable
// ---------------------------------------------------------------------------

const mountArtifacts = (
  store: InventoryStore<ArtifactRow>,
  analyses: ReadonlyMap<string, ScanState> | null,
  affectedFilter: PageRequest["filter"] = null,
): VueWrapper =>
  mount(ArtifactsTable, {
    props: { store, analyses, affectedFilter },
    global: { stubs: { RecycleScroller: ScrollerStub } },
  });

describe("ArtifactsTable — the bound column shape", () => {
  it("renders the four always-present columns first, in the bound order", async () => {
    const h = harness(artifactRows(2), "artifacts", "last_seen");
    const wrapper = mountArtifacts(h.store, null);
    await h.store.loadFirstPage();
    await settle(wrapper);

    const headers = wrapper
      .findAll('[role="columnheader"]')
      .map((c) => c.text().split(" ")[0]);
    expect(headers.slice(0, 4)).toEqual([
      "Analysis",
      "Digest",
      "Last",
      "Triage",
    ]);
    // Entity-specific columns follow the four, never precede them.
    expect(headers.slice(4)).toEqual(["Bytes", "Kind"]);
  });

  it("carries EXACTLY ONE target-controlled column, rendered in monospace", async () => {
    const h = harness(artifactRows(1), "artifacts", "last_seen");
    const wrapper = mountArtifacts(h.store, null);
    await h.store.loadFirstPage();
    await settle(wrapper);

    // The shell throws on any count other than one (asserted in
    // InventoryTable.spec.ts), so a successful mount IS the count assertion.
    // What this adds is that the column it marked is the one actually rendered
    // in `font-mono`.
    const mono = wrapper
      .findAll("span")
      .filter((s) => s.classes().includes("font-mono"));
    expect(mono.length).toBeGreaterThan(0);
    expect(mono.some((s) => s.text() === digest(0))).toBe(true);

    // And the OTHER columns are not mono — mono is a security control on the
    // target-controlled column, not a house style.
    const bytesCell = wrapper
      .findAll('[role="gridcell"]')
      .find((c) => c.text() === "1024");
    expect(bytesCell).toBeDefined();
    expect(bytesCell!.classes()).not.toContain("font-mono");
  });

  it("renders NO badge for a row whose analysis state is unknown", async () => {
    // The honest rendering. Inventing "Complete" here is the silence UI-09
    // forbids; inventing "Unknown" is the UI-only synonym the vocabulary bans.
    const h = harness(artifactRows(2), "artifacts", "last_seen");
    const wrapper = mountArtifacts(h.store, null);
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.findAll("[data-defminer-status-badge]")).toHaveLength(0);
    for (const label of Object.values(EXPECTED_LABELS)) {
      expect(wrapper.text()).not.toContain(label);
    }
  });
});

describe("ArtifactsTable — UI-09's degradation marking", () => {
  const analysesOf = (
    ...states: readonly ScanState[]
  ): ReadonlyMap<string, ScanState> =>
    new Map(states.map((state, index) => [digest(index), state]));

  it("shows NO banner when every contributing artifact is complete", async () => {
    const h = harness(artifactRows(3), "artifacts", "last_seen");
    const wrapper = mountArtifacts(h.store, analysesOf("done", "done", "done"));
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.find("[data-defminer-partial-banner]").exists()).toBe(false);
    // Every row is still badged — the badge is per-row and says "Complete".
    expect(wrapper.findAll("[data-defminer-status-badge]")).toHaveLength(3);
  });

  it("shows the banner when ONE contributing artifact is partial", async () => {
    const h = harness(artifactRows(3), "artifacts", "last_seen");
    const wrapper = mountArtifacts(
      h.store,
      analysesOf("done", "partial", "done"),
    );
    await h.store.loadFirstPage();
    await settle(wrapper);

    const banner = wrapper.find("[data-defminer-partial-banner]");
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain("1 of 3 artifacts");
    expect(banner.text()).toContain("a floor, not a total");
  });

  it("escalates the banner's COUNT when the affected set includes a failure", async () => {
    const h = harness(artifactRows(3), "artifacts", "last_seen");
    const wrapper = mountArtifacts(
      h.store,
      analysesOf("done", "partial", "failed"),
    );
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.find("[data-defminer-partial-count]").classes()).toContain(
      "text-danger-500",
    );
    expect(wrapper.find("[data-defminer-partial-banner]").classes()).toContain(
      "border-info-500",
    );
  });

  it("badges a partial row even when the banner is NOT showing", async () => {
    // The two mechanisms are independent by design. `pending` is not degraded —
    // it is unfinished, which is a different claim — so no banner renders, and
    // the row is still marked.
    const h = harness(artifactRows(2), "artifacts", "last_seen");
    const wrapper = mountArtifacts(h.store, analysesOf("pending", "done"));
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.find("[data-defminer-partial-banner]").exists()).toBe(false);
    const badges = wrapper.findAll("[data-defminer-status-badge]");
    expect(badges.map((b) => b.text())).toEqual(["Queued", "Complete"]);
  });

  it("sets EXACTLY ONE filter on the store when show-only-affected is used", async () => {
    const h = harness(artifactRows(2), "artifacts", "last_seen");
    const affected: PageRequest["filter"] = {
      column: "scan_state",
      value: "partial",
    };
    const wrapper = mountArtifacts(
      h.store,
      analysesOf("partial", "done"),
      affected,
    );
    await h.store.loadFirstPage();
    await settle(wrapper);

    const action = wrapper
      .findAll("button")
      .find((b) => b.text() === "Show only affected artifacts");
    expect(action).toBeDefined();
    await action!.trigger("click");
    await settle(wrapper);

    // ONE filter, not two. `PageRequest["filter"]` is a single object rather
    // than a record precisely because the backend's statement matrix is
    // enumerated literally and a second simultaneous filter has no statement.
    expect(h.store.filter.value).toEqual(affected);
    const latest = h.requests[h.requests.length - 1];
    expect(latest.filter).toEqual(affected);
    // From the FIRST page: the window is discarded, never re-arranged.
    expect(latest.cursor).toBeNull();
  });

  it("does nothing when asked to narrow with no filter available", async () => {
    const h = harness(artifactRows(2), "artifacts", "last_seen");
    const wrapper = mountArtifacts(
      h.store,
      analysesOf("partial", "done"),
      null,
    );
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(
      wrapper
        .findAll("button")
        .some((b) => b.text() === "Show only affected artifacts"),
    ).toBe(false);
    expect(h.store.filter.value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ObservationsTable
// ---------------------------------------------------------------------------

describe("ObservationsTable — the observed URL is the genuine article", () => {
  const mountObservations = (
    store: InventoryStore<ObservationRow>,
    analyses: ReadonlyMap<string, ScanState> | null = null,
  ): VueWrapper =>
    mount(ObservationsTable, {
      props: { store, analyses, affectedFilter: null },
      global: { stubs: { RecycleScroller: ScrollerStub } },
    });

  it("renders the four always-present columns first, in the bound order", async () => {
    const h = harness(observationRows(2), "observations", "observed_at");
    const wrapper = mountObservations(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    const headers = wrapper
      .findAll('[role="columnheader"]')
      .map((c) => c.text().split(" ")[0]);
    expect(headers.slice(0, 4)).toEqual([
      "Analysis",
      "Observed",
      "Last",
      "Triage",
    ]);
  });

  it("renders the observed URL in monospace, through the display path", async () => {
    const h = harness(observationRows(2), "observations", "observed_at");
    const wrapper = mountObservations(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    const mono = wrapper
      .findAll("span")
      .filter((s) => s.classes().includes("font-mono"));
    expect(
      mono.some((s) => s.text() === "https://target.example/app-0.js"),
    ).toBe(true);
  });

  it("never offers the observed URL as a DESTINATION", async () => {
    // R1: an extracted URL is data to be displayed, never somewhere to send the
    // operator. The static gate reports a bound href/src; this asserts the
    // rendered DOM, which is the claim the operator actually depends on.
    const h = harness(observationRows(2), "observations", "observed_at");
    const wrapper = mountObservations(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.findAll("a")).toHaveLength(0);
    expect(wrapper.element.querySelector("[href]")).toBeNull();
    expect(wrapper.element.querySelector("[title]")).toBeNull();
  });

  it("renders a hostile URL as inert text, with the bidi override stripped", async () => {
    const hostile: ObservationRow[] = [
      {
        ...observationRows(1)[0],
        url: "‮moc.live‬/<img src=x onerror=alert(1)>",
      },
    ];
    const h = harness(hostile, "observations", "observed_at");
    const wrapper = mountObservations(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    // The spoofing character is gone before the DOM — it is what makes
    // `evil.com` render as `moc.live` in the column the operator triages on.
    expect(wrapper.html()).not.toContain("‮");
    // The markup payload is VISIBLE as text and INERT as markup.
    expect(wrapper.text()).toContain("<img src=x onerror=alert(1)>");
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("states a missing content type in DefMiner's own words", async () => {
    // `null` here is a fact about the response, not a missing value, and the
    // sentence saying so is DefMiner-authored — no target-controlled string
    // appears inside it.
    const h = harness(observationRows(2), "observations", "observed_at");
    const wrapper = mountObservations(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.text()).toContain("not declared");
    expect(wrapper.text()).toContain("application/javascript");
  });
});
