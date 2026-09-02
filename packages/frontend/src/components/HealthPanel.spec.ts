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

import type {
  HealthCounters,
  HealthOutcome,
  RpcResult,
  SourcemapHealthCounters,
} from "../api/client";

import {
  counterId,
  counterText,
  HEALTH_COUNTERS,
  HEALTH_FAILED_BODY,
  HEALTH_HEADING,
  HEALTH_PURPOSE,
  HEALTH_REFRESH_LABEL,
  HEALTH_REFRESHING_LABEL,
  HEALTH_STRIP_HEIGHT_CLASS,
  HEALTH_UNAVAILABLE_BODY,
  SOURCEMAP_COUNTERS,
  SOURCEMAP_HEADING,
  SOURCEMAP_PURPOSE,
} from "./health-contract";
import HealthPanel from "./HealthPanel.vue";

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------

/** No reconstruction has happened yet. */
const NO_RECONSTRUCTION: SourcemapHealthCounters = {
  announcedInline: 0,
  announcedExternal: 0,
  mapRefusedTooLarge: 0,
  mapMalformed: 0,
  sourcesRecovered: 0,
  sightingsRecorded: 0,
};

/**
 * The shape of a REAL session, which is the shape the D-03 row exists for:
 * every announcement seen was external, so nothing was recovered and nothing
 * went wrong. Zero of the eight pinned production bundles carries an inline
 * map, so this is the ordinary case rather than a pathological one.
 */
const ALL_EXTERNAL: SourcemapHealthCounters = {
  announcedInline: 0,
  announcedExternal: 8,
  mapRefusedTooLarge: 0,
  mapMalformed: 0,
  sourcesRecovered: 0,
  sightingsRecorded: 0,
};

/** What a perfectly idle, perfectly healthy backend reports. */
const IDLE: HealthCounters = {
  queueDepth: 0,
  droppedCount: 0,
  jobsInFlight: 0,
  maxSliceMs: 0,
  sourcemap: NO_RECONSTRUCTION,
};

/** A backend in the state this surface exists for: the queue is deep, the
 *  drops have started, one job is stuck in flight and the worst slice is
 *  measured in seconds. */
const IN_TROUBLE: HealthCounters = {
  queueDepth: 1_234_567,
  droppedCount: 8_901,
  jobsInFlight: 1,
  maxSliceMs: 12_345,
  sourcemap: {
    announcedInline: 12,
    announcedExternal: 1_234,
    mapRefusedTooLarge: 3,
    mapMalformed: 2,
    sourcesRecovered: 4_211,
    sightingsRecorded: 9_876,
  },
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

// ---------------------------------------------------------------------------
// PHASE 7's SIX RECONSTRUCTION COUNTERS, AND D-03's ROW
// ---------------------------------------------------------------------------
//
// The load-bearing one is `External maps announced`. Under D-01 an external
// `.map` announcement is DISCOVERED and not consumed, on purpose — DefMiner
// never fetches a `.map`, because that would be a request the target can see —
// so the number is the MEASUREMENT of how much of MAP-01 this phase hands to
// Phase 8. It is neither good news nor bad news, and the cases below assert
// that the surface says so: the label reads as a fact, the help line explains
// why the number exists, and NOTHING about the row is toned as a degradation.

const SOURCEMAP_BLOCK = "[data-defminer-health-sourcemap]";
const SOURCEMAP_ROW = "[data-defminer-health-sourcemap-row]";

describe("HealthPanel — the reconstruction counters (D-03, MAP-01)", () => {
  it("renders SIX rows, each with its label, its grouped value and its help", async () => {
    const { wrapper } = harness({ counters: IN_TROUBLE });
    await settle(wrapper);

    expect(
      SOURCEMAP_COUNTERS,
      "the contract lists fewer than six",
    ).toHaveLength(6);
    expect(wrapper.findAll(SOURCEMAP_ROW)).toHaveLength(6);

    for (const counter of SOURCEMAP_COUNTERS) {
      const row = wrapper.get(`#${counterId(counter.id)}`);
      expect(row.text(), `${counter.id} has no label`).toContain(counter.label);
      expect(row.text(), `${counter.id} has no help line`).toContain(
        counter.help,
      );
      expect(row.text(), `${counter.id} has no value`).toContain(
        counterText(counter, IN_TROUBLE.sourcemap[counter.id]),
      );
    }

    // AND THE NUMBERS ARE GROUPED, for the reason the strip's own case gives:
    // `1234` and `12345` differ by one character and by a factor of ten.
    const block = wrapper.get(SOURCEMAP_BLOCK).text();
    expect(block).toContain("1,234");
    expect(block).toContain("4,211");
    expect(block).toContain("9,876");
  });

  it("names D-03's row so it reads as a MEASUREMENT, not as a failure", async () => {
    const { wrapper } = harness({ counters: IN_TROUBLE });
    await settle(wrapper);

    const row = wrapper.get("#defminer-health-announcedExternal");
    expect(row.text()).toContain("External maps announced");
    // THE EXPLANATION IS PRESENT AND IT SAYS WHY THE NUMBER EXISTS. Without it
    // a large external count reads as a large number of failures.
    expect(row.text()).toContain("DefMiner does not fetch them");
    expect(row.text()).toContain("not a count of anything that went wrong");
    // AND NO FAILURE VOCABULARY ANYWHERE ON IT.
    for (const word of ["error", "Error", "failed", "Failed", "refused"]) {
      expect(row.text(), `the row uses the word "${word}"`).not.toContain(word);
    }
  });

  it("gives D-03's row NO degradation tone — not danger, not info, not a role", async () => {
    const { wrapper } = harness({ counters: IN_TROUBLE });
    await settle(wrapper);

    const external = wrapper.get("#defminer-health-announcedExternal");
    // A NUMBER COLOURED AS A FAULT IS A NUMBER AN OPERATOR FILES A BUG ABOUT.
    // Asserted over the row's WHOLE subtree, so a toned child fails too.
    const html = external.html();
    expect(html).not.toContain("danger-");
    expect(html).not.toContain("info-");
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('role="status"');

    // AND IT IS INDISTINGUISHABLE FROM ITS SIBLINGS. The strongest form of
    // "no special tone": the row's classes EQUAL another row's.
    const inline = wrapper.get("#defminer-health-announcedInline");
    expect(external.attributes("class")).toBe(inline.attributes("class"));
  });

  it("says on the surface WHY a low recovered count is the expected result", async () => {
    // Open Question 2, pre-empted where the operator will actually ask it: a
    // zero recovered count beside eight external announcements is the ordinary
    // outcome on production traffic, not a broken feature.
    const { wrapper } = harness({
      counters: { ...IDLE, sourcemap: ALL_EXTERNAL },
    });
    await settle(wrapper);

    const block = wrapper.get(SOURCEMAP_BLOCK).text();
    expect(block).toContain("It never fetches a .map file");
    expect(block).toContain("not a fault");
    // The two numbers that make the sentence necessary are both on screen.
    expect(wrapper.get("#defminer-health-announcedExternal").text()).toContain(
      "8",
    );
    expect(wrapper.get("#defminer-health-sourcesRecovered").text()).toContain(
      "0",
    );
  });

  it("renders the rows as ABSENT while the read has not answered — never as zeroes", async () => {
    // THE SHIPPED STILL-RESOLVING RULE, INHERITED RATHER THAN RESTATED. A zero
    // is a measured claim; a read that has not returned has made none. The
    // block is under the same `v-if` the strip is, so this is a property of
    // the arrangement rather than of six separate guards.
    const { wrapper } = harness({ hang: true });
    await wrapper.vm.$nextTick();

    expect(wrapper.find(SOURCEMAP_BLOCK).exists()).toBe(false);
    expect(wrapper.findAll(SOURCEMAP_ROW)).toHaveLength(0);
    for (const counter of SOURCEMAP_COUNTERS) {
      expect(wrapper.find(`#${counterId(counter.id)}`).exists()).toBe(false);
    }
    // AND NO ZERO ANYWHERE IN THE PANEL, which is what "absent, not zero"
    // actually means on a surface whose whole subject is numbers.
    expect(wrapper.text()).not.toContain("0");
  });

  it("renders the rows as ABSENT on a FAILED read and on `unavailable`", async () => {
    const failed = harness({ fails: true });
    await settle(failed.wrapper);
    expect(failed.wrapper.find(SOURCEMAP_BLOCK).exists()).toBe(false);

    const none = harness({ unavailable: true });
    await settle(none.wrapper);
    expect(none.wrapper.find(SOURCEMAP_BLOCK).exists()).toBe(false);
  });

  it("keeps the reconstruction rows OUT of the fixed-height strip", async () => {
    // The `overflow / health-strip` row requires a height that comes from one
    // utility and never wraps. Six long labels in that strip would either wrap
    // it or clip them, so they are rows below it — asserted by containment
    // rather than described.
    const { wrapper } = harness({ counters: IN_TROUBLE });
    await settle(wrapper);

    const strip = wrapper.get(STRIP).element;
    for (const counter of SOURCEMAP_COUNTERS) {
      const row = wrapper.get(`#${counterId(counter.id)}`).element;
      expect(strip.contains(row), `${counter.id} is inside the strip`).toBe(
        false,
      );
    }
    // And the strip still carries exactly the four it shipped with.
    expect(strip.querySelectorAll("[id^='defminer-health-']")).toHaveLength(
      HEALTH_COUNTERS.length,
    );
  });

  it("carries NO string from the payload — the rows are integers and copy only", async () => {
    // `long-text / health-strip`'s property, extended to the new block and
    // still a property of the SHAPE: `SourcemapHealthCounters` is six numbers
    // and no string, so there is no field here a later edit could render.
    const { wrapper } = harness({ counters: IN_TROUBLE });
    await settle(wrapper);

    const authored = new Set<string>();
    for (const counter of SOURCEMAP_COUNTERS) {
      authored.add(counter.label);
      authored.add(counter.help);
      authored.add(counterText(counter, IN_TROUBLE.sourcemap[counter.id]));
    }
    authored.add(SOURCEMAP_HEADING);
    authored.add(SOURCEMAP_PURPOSE);

    const texts: string[] = [];
    const walk = (node: Node): void => {
      if (node.nodeType === 3) {
        const text = (node.nodeValue ?? "").trim();
        if (text.length > 0) texts.push(text);
        return;
      }
      for (const child of node.childNodes) walk(child);
    };
    walk(wrapper.get(SOURCEMAP_BLOCK).element);

    expect(texts.length).toBeGreaterThan(12);
    for (const text of texts) {
      expect(
        authored.has(text),
        `unexpected string in the block: ${text}`,
      ).toBe(true);
    }
  });
});
