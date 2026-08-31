// @vitest-environment jsdom
//
// packages/frontend/src/components/HealthPanel.spec.ts — OBS-01's four numbers,
// and the strip that must not grow.
//
// ===========================================================================
// WHAT THESE CASES ARE ACTUALLY GUARDING
// ===========================================================================
// Not "does a number render". Four things:
//
//   1. THE STRIP THAT GROWS. 05-UI-SPEC.md's `overflow / health-strip` row:
//      counters are bounded integers in a FIXED-HEIGHT strip, and a large queue
//      depth or dropped count never wraps the strip or reflows the toolbar. The
//      failure is quiet — it looks fine at 0 and at 12, and appears the first
//      time a backend is actually in trouble, which is the only time anybody
//      opens this tab.
//   2. THE UNSEPARATED NUMBER. `1000000` and `100000` differ by one character
//      and by a factor of ten, on a surface read at a glance by somebody who
//      already thinks something is broken.
//   3. FOUR ZEROES STANDING IN FOR "NO PROJECT". Four zeroes are what a
//      perfectly idle, perfectly healthy backend reports. Rendering them for a
//      plugin that has resolved no project tells the operator the opposite of
//      the truth at the moment they came here to find out why nothing is
//      happening — which is why the endpoint has two outcomes at all.
//   4. THE FAILED READ RENDERED AS HEALTH. A call that never answers is itself
//      a finding about the backend; presented as an empty panel it would read as
//      "nothing to report".
//
// ===========================================================================
// HOW "FIXED HEIGHT" IS ASSERTED IN jsdom, AND WHY IT IS NOT `offsetHeight`
// ===========================================================================
// jsdom performs NO LAYOUT: `offsetHeight` is 0 for every element on the page,
// always, for a strip that wraps and for one that does not. An assertion over it
// would pass unconditionally and would look like the strongest test in the file.
//
// So the contract is asserted at the level where it is actually decided — the
// classes. The strip's height comes from ONE utility and its cells are
// prevented from wrapping by TWO more, none of which is conditional on any
// value; the assertion is that the rendered class attribute of the strip is
// BYTE-IDENTICAL across a single-digit counter and a counter above one million,
// and that it carries the fixed-height utility and no `flex-wrap`. A change that
// made the height depend on the content would have to change one of those
// strings, which is what these cases would catch.

import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type { HealthCounters, HealthOutcome, RpcResult } from "../api/client";

import {
  counterId,
  HEALTH_COUNTERS,
  HEALTH_FAILED_BODY,
  HEALTH_HEADING,
  HEALTH_PURPOSE,
  HEALTH_REFRESH_LABEL,
  HEALTH_REFRESHING_LABEL,
  HEALTH_STRIP_HEIGHT_CLASS,
  HEALTH_UNAVAILABLE_BODY,
} from "./health-contract";
import HealthPanel from "./HealthPanel.vue";

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------

/** What a perfectly idle, perfectly healthy backend reports. */
const IDLE: HealthCounters = {
  queueDepth: 0,
  droppedCount: 0,
  jobsInFlight: 0,
  maxSliceMs: 0,
};

/** A backend in the state this surface exists for: the queue is deep, the
 *  drops have started, one job is stuck in flight and the worst slice is
 *  measured in seconds. */
const IN_TROUBLE: HealthCounters = {
  queueDepth: 1_234_567,
  droppedCount: 8_901,
  jobsInFlight: 1,
  maxSliceMs: 12_345,
};

const STRIP = "[data-defminer-health-strip]";

type Harness = {
  readonly wrapper: VueWrapper;
  /** How many times the panel read. */
  readonly reads: () => number;
};

type Options = {
  readonly counters?: HealthCounters;
  /** Answer the `unavailable` outcome instead of counters. */
  readonly unavailable?: boolean;
  /** Reject at the RPC layer — a call that produced no value at all. */
  readonly fails?: boolean;
  /** When set the read never settles, so the in-flight state is held open. */
  readonly hang?: boolean;
};

function harness(options: Options = {}): Harness {
  let readCount = 0;

  const load = (): Promise<RpcResult<HealthOutcome>> => {
    readCount += 1;
    if (options.hang === true) return new Promise(() => undefined);
    if (options.fails === true) {
      return Promise.resolve({
        ok: false,
        reason: "rpc-timeout",
        versions: null,
      });
    }
    if (options.unavailable === true) {
      return Promise.resolve({
        ok: true,
        value: { outcome: "unavailable", reason: "no-project" },
      });
    }
    return Promise.resolve({
      ok: true,
      value: { outcome: "health", health: options.counters ?? IDLE },
    });
  };

  return {
    wrapper: mount(HealthPanel, { props: { load } }),
    reads: () => readCount,
  };
}

async function settle(wrapper: VueWrapper): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
}

// ---------------------------------------------------------------------------
// THE FOUR COUNTERS
// ---------------------------------------------------------------------------

describe("HealthPanel — the four counters (OBS-01, research P-07)", () => {
  it("renders every counter with a DefMiner-authored label and its value", async () => {
    const { wrapper } = harness({ counters: IN_TROUBLE });
    await settle(wrapper);

    expect(HEALTH_COUNTERS, "the contract lists fewer than four").toHaveLength(
      4,
    );

    for (const counter of HEALTH_COUNTERS) {
      const cell = wrapper.get(`#${counterId(counter.id)}`);
      expect(cell.text(), `${counter.id} has no label`).toContain(
        counter.label,
      );
    }

    // And the four numbers themselves, each grouped.
    const stripText = wrapper.get(STRIP).text();
    expect(stripText).toContain("1,234,567");
    expect(stripText).toContain("8,901");
    expect(stripText).toContain("12,345");
  });

  it("says why the operator is looking at this, on the surface itself", async () => {
    // The tab is reached from the table's error action, by an operator who
    // already suspects the interface. This sentence is what redirects them.
    const { wrapper } = harness();
    await settle(wrapper);

    expect(wrapper.text()).toContain(HEALTH_HEADING);
    expect(wrapper.text()).toContain(HEALTH_PURPOSE);
  });

  it("renders a large counter WITH thousands separators", async () => {
    // `1000000` and `100000` differ by one character and by a factor of ten.
    const { wrapper } = harness({ counters: IN_TROUBLE });
    await settle(wrapper);

    const depth = wrapper.get(`#${counterId("queueDepth")}`).text();
    expect(depth).toContain("1,234,567");
    expect(depth, "the ungrouped number is rendered").not.toContain("1234567");
  });

  it("renders the slice with its unit and the counts without one", async () => {
    // The slice is milliseconds and the others are bare counts. A number with a
    // unit nobody stated is a number the operator has to guess the scale of.
    const { wrapper } = harness({ counters: IN_TROUBLE });
    await settle(wrapper);

    expect(wrapper.get(`#${counterId("maxSliceMs")}`).text()).toContain(
      "12,345 ms",
    );
    expect(
      wrapper.get(`#${counterId("jobsInFlight")}`).text(),
      "a bare count grew a unit",
    ).not.toContain("ms");
  });

  it("renders four zeroes for a genuinely idle backend — which is the truth", async () => {
    const { wrapper } = harness({ counters: IDLE });
    await settle(wrapper);

    for (const counter of HEALTH_COUNTERS) {
      expect(wrapper.get(`#${counterId(counter.id)}`).text()).toContain("0");
    }
    expect(wrapper.find("[data-defminer-health-unavailable]").exists()).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// THE STRIP THAT MUST NOT GROW
// ---------------------------------------------------------------------------

describe("HealthPanel — the fixed-height strip (05-UI-SPEC `overflow / health-strip`)", () => {
  it("renders the strip with the SAME classes at one digit and above one million", async () => {
    // jsdom lays nothing out, so the height is asserted where it is decided.
    // See this file's header for why `offsetHeight` would be a test that
    // passes unconditionally.
    const small = harness({ counters: IDLE });
    await settle(small.wrapper);
    const large = harness({ counters: IN_TROUBLE });
    await settle(large.wrapper);

    const smallClasses = small.wrapper.get(STRIP).attributes("class") ?? "";
    const largeClasses = large.wrapper.get(STRIP).attributes("class") ?? "";

    expect(smallClasses, "the strip carries no fixed height").toContain(
      HEALTH_STRIP_HEIGHT_CLASS,
    );
    expect(
      largeClasses,
      "the strip's classes depend on the counter magnitude",
    ).toBe(smallClasses);
  });

  it("does not wrap and does not scroll horizontally", async () => {
    // A strip that wraps has become two strips and has reflowed everything
    // below it; one that scrolls has hidden a counter behind an interaction.
    const { wrapper } = harness({ counters: IN_TROUBLE });
    await settle(wrapper);

    const classes = wrapper.get(STRIP).attributes("class") ?? "";
    expect(classes, "the strip wraps").not.toContain("flex-wrap");
    expect(classes, "the strip scrolls").not.toContain("overflow-x-auto");
    expect(classes, "the strip scrolls").not.toContain("overflow-x-scroll");
  });

  it("keeps every cell from wrapping, whatever the number", async () => {
    const { wrapper } = harness({ counters: IN_TROUBLE });
    await settle(wrapper);

    for (const counter of HEALTH_COUNTERS) {
      const classes =
        wrapper.get(`#${counterId(counter.id)}`).attributes("class") ?? "";
      expect(classes, `${counter.id} may wrap`).toContain("whitespace-pre");
      expect(classes, `${counter.id} may overflow`).toContain(
        "overflow-hidden",
      );
    }
  });

  it("carries only DefMiner-authored text — no title attribute anywhere on it", async () => {
    // `long-text / health-strip`: only DefMiner-authored labels and numeric
    // counters reach the strip. R2's title ban is absolute regardless.
    const { wrapper } = harness({ counters: IN_TROUBLE });
    await settle(wrapper);

    const strip = wrapper.get(STRIP);
    expect(strip.attributes("title")).toBeUndefined();
    for (const element of strip.findAll("*")) {
      expect(element.attributes("title")).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// THE TWO STATES THAT ARE NOT COUNTERS
// ---------------------------------------------------------------------------

describe("HealthPanel — the states four zeroes would lie about", () => {
  it("says NO PROJECT rather than rendering four zeroes", async () => {
    const { wrapper } = harness({ unavailable: true });
    await settle(wrapper);

    expect(wrapper.find("[data-defminer-health-unavailable]").exists()).toBe(
      true,
    );
    expect(wrapper.text()).toContain(HEALTH_UNAVAILABLE_BODY);
    expect(
      wrapper.find(STRIP).exists(),
      "counters rendered for a plugin with no project resolved",
    ).toBe(false);
  });

  it("says the read FAILED rather than rendering an empty panel", async () => {
    const { wrapper } = harness({ fails: true });
    await settle(wrapper);

    expect(wrapper.find("[data-defminer-health-failed]").exists()).toBe(true);
    expect(wrapper.text()).toContain(HEALTH_FAILED_BODY);
    expect(wrapper.find(STRIP).exists()).toBe(false);
  });

  it("renders no backend-supplied text on any path — there is none to render", async () => {
    // `HealthCounters` carries four numbers and no string, so this is a
    // property of the shape rather than a discipline. Asserted anyway, because
    // "there is no string on it" is a claim about a type somebody will widen.
    const { wrapper } = harness({ fails: true });
    await settle(wrapper);
    expect(wrapper.text()).not.toContain("rpc-timeout");
  });
});

// ---------------------------------------------------------------------------
// RE-READING
// ---------------------------------------------------------------------------

describe("HealthPanel — re-reading", () => {
  it("reads once on mount", async () => {
    const h = harness();
    await settle(h.wrapper);
    expect(h.reads()).toBe(1);
  });

  it("re-reads on the refresh action — one sample cannot show a queue draining", async () => {
    // The whole diagnosis is "does the number move". A surface that read once
    // on mount and never again could not answer it.
    const h = harness();
    await settle(h.wrapper);

    await h.wrapper.get("#defminer-health-refresh").trigger("click");
    await settle(h.wrapper);

    expect(h.reads()).toBe(2);
  });

  it("takes its own in-flight label and issues no second read while one is open", async () => {
    const h = harness({ hang: true });
    await h.wrapper.vm.$nextTick();

    const action = h.wrapper.get("#defminer-health-refresh");
    expect(action.text()).toBe(HEALTH_REFRESHING_LABEL);
    expect(action.attributes("disabled")).toBeDefined();

    await action.trigger("click");
    await h.wrapper.vm.$nextTick();

    expect(h.reads(), "a second read was issued while one was in flight").toBe(
      1,
    );
  });

  it("returns to its rest label once the read settles", async () => {
    const h = harness();
    await settle(h.wrapper);

    const action = h.wrapper.get("#defminer-health-refresh");
    expect(action.text()).toBe(HEALTH_REFRESH_LABEL);
    expect(action.attributes("disabled")).toBeUndefined();
  });
});
