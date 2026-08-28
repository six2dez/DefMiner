// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import App from "./App.vue";
import type { ArtifactRow } from "./backend";
import { SDK_INJECTION_KEY } from "./backend";

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
  },
  {
    project_id: "p1",
    sha256: "a1b2c3O0O04d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7",
    byte_len: 128,
    kind: "inline",
    first_seen_at: 1_756_000_100_000,
    last_seen_at: 1_756_000_600_000,
    seen_count: 1,
  },
];

const TAB_LABELS = ["Artifacts", "Observations", "Health", "Settings"];

function mountWith(getArtifacts: () => Promise<ArtifactRow[]>) {
  return mount(App, {
    global: {
      provide: { [SDK_INJECTION_KEY]: { backend: { getArtifacts } } },
    },
  });
}

describe("App", () => {
  it("renders every tab label on first paint, before any query resolves", () => {
    // A promise that NEVER settles. If the tab strip waited on the query — the
    // defect this asserts against — nothing below would be on screen, and the
    // operator would be looking at an empty page while the backend chews
    // through a large bundle.
    const wrapper = mountWith(() => new Promise<ArtifactRow[]>(() => {}));

    // Synchronously, with no `flushPromises` and no `await` anywhere above.
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

  it("renders both artifact rows as text once the query resolves", async () => {
    const wrapper = mountWith(() => Promise.resolve(ROWS));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    const text = wrapper.text();
    for (const row of ROWS) {
      expect(text).toContain(row.sha256);
    }
    expect(text).toContain("4096");
    expect(text).toContain("script");
    expect(text).toContain("inline");
  });

  it("renders every target-derived digest in font-mono", async () => {
    const wrapper = mountWith(() => Promise.resolve(ROWS));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    for (const row of ROWS) {
      const cell = wrapper
        .findAll("span")
        .find((span) => span.text() === row.sha256);
      expect(cell).toBeDefined();
      expect(cell!.classes()).toContain("font-mono");
    }
  });

  it("keeps every tab rendered and routable when the query fails", async () => {
    const wrapper = mountWith(() =>
      Promise.reject(new Error("backend exploded")),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    // A tab is NEVER removed on error. The failure belongs in the body region.
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((t) => t.text())).toEqual(TAB_LABELS);

    expect(wrapper.text()).toContain("Could not load artifacts");

    // And the rejection's own message is NOT rendered. An error crossing the
    // RPC boundary can quote target-controlled bytes, and no sentence on this
    // page ever interpolates one.
    expect(wrapper.text()).not.toContain("backend exploded");
  });

  it("still routes to another tab after the query fails", async () => {
    const wrapper = mountWith(() =>
      Promise.reject(new Error("backend exploded")),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const health = wrapper
      .findAll('[role="tab"]')
      .find((t) => t.text() === "Health");
    expect(health).toBeDefined();
    await health!.trigger("click");

    expect(health!.attributes("aria-selected")).toBe("true");
    expect(wrapper.text()).toContain("Nothing analysed on this target yet");
  });

  it("renders the shell with an empty body when no project has been resolved", async () => {
    // The shipped endpoint returns `[]` rather than throwing when there is no
    // project, so this is the real not-yet-resolved path and not a synthetic
    // one.
    const wrapper = mountWith(() => Promise.resolve([]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('[role="tab"]')).toHaveLength(TAB_LABELS.length);
    expect(wrapper.text()).toContain("Nothing analysed on this target yet");
  });

  it("wraps the tab strip instead of scrolling it or hiding tabs behind a menu", () => {
    const wrapper = mountWith(() => Promise.resolve([]));
    const nav = wrapper.find("nav");

    expect(nav.classes()).toContain("flex-wrap");
    // A horizontal scroll container or an overflow menu both hide a tab behind
    // an interaction, and a hidden tab is a finding the operator never opens.
    expect(nav.classes()).not.toContain("overflow-x-auto");
    expect(nav.classes()).not.toContain("overflow-x-scroll");
  });

  it("marks exactly one tab active, with the accent token", () => {
    const wrapper = mountWith(() => Promise.resolve([]));
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
    const wrapper = mountWith(() => Promise.resolve(hostile));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    // The bytes are VISIBLE as text…
    expect(wrapper.text()).toContain("<img src=x onerror=alert(1)>");
    // …and inert as markup. No element was created from them.
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.element.querySelector("script")).toBeNull();
  });
});
