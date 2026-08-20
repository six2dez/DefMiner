import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// THE PHASE 0 EXIT GATE.
//
// go-no-go.json is the only Phase 0 artifact later phases are permitted to
// import, and its threshold ids become the names every tunable constant in
// DefMiner traces to. Everything here must FAIL, never skip, when unmet: a
// skipped assertion on this file is indistinguishable from a passing one at the
// point where it matters, which is eleven phases downstream.

const RESULTS = ".planning/phases/00-runtime-reality-check/results";
const AGGREGATE = join(RESULTS, "go-no-go.json");
const SCHEMA = join(RESULTS, "go-no-go.schema.json");
const RENDERED = ".planning/phases/00-runtime-reality-check/00-GO-NO-GO.md";
const EXPECTED_CAIDO_VERSION = "0.57.1";

// The thirteen Phase 0 requirement ids. SPIKE-04b is a first-class sub-spike
// with its own REQUIREMENTS.md line, so it gets its own gate.
const PHASE0_SPIKES = [
  "SPIKE-01", "SPIKE-02", "SPIKE-03", "SPIKE-04", "SPIKE-04b", "SPIKE-05",
  "SPIKE-06", "SPIKE-07", "SPIKE-08", "SPIKE-09", "SPIKE-10", "SPIKE-11",
  "SPIKE-12",
];

const CROSS_DAY = "CACHE_HIT_RATE_CROSS_DAY";
const SAMPLE_DAYS = "CACHE_SAMPLE_DAYS";
const DENOMINATOR = "CACHE_CROSS_DAY_DENOMINATOR";
const ASSUMED = "CACHE_HIT_RATE_ASSUMED";

function loadJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("Phase 0 exit gate: go-no-go.json", () => {
  it("exists — the phase's entire deliverable", () => {
    // Not a skip. An absent aggregate means Phase 0 produced no importable
    // answer, which must fail loudly rather than pass vacuously.
    expect(existsSync(AGGREGATE), `${AGGREGATE} missing — run scripts/spike/aggregate.py`)
      .toBe(true);
  });

  const d = existsSync(AGGREGATE) ? loadJson(AGGREGATE) : null;

  it("has one gate for each of the thirteen Phase 0 requirement ids", () => {
    const have = (d?.gates ?? []).map((g: any) => g.spike).sort();
    expect(have).toEqual([...PHASE0_SPIKES].sort());
  });

  it("every gate states an answer and what changes if it is wrong", () => {
    for (const g of d?.gates ?? []) {
      expect(g.question?.trim(), `${g.spike}: empty question`).toBeTruthy();
      expect(g.answer?.trim(), `${g.spike}: empty answer`).toBeTruthy();
      expect(
        g.changes_if_wrong?.trim(),
        `${g.spike}: empty changes_if_wrong — a gate that cannot say what changes ` +
          `if it is wrong will not protect the phases built on it`,
      ).toBeTruthy();
    }
  });

  it("no threshold has confidence PENDING", () => {
    const pending = Object.entries(d?.thresholds ?? {})
      .filter(([, t]: [string, any]) => t.confidence === "PENDING")
      .map(([k]) => k);
    expect(
      pending,
      `PENDING fails the exit gate and communicates nothing about WHY a threshold is ` +
        `unresolved. Record the measurement, or record it as inconclusive with a ` +
        `revisit date: ${pending.join(", ")}`,
    ).toEqual([]);
  });

  it(`no threshold other than ${CROSS_DAY} has a null value`, () => {
    const nulls = Object.entries(d?.thresholds ?? {})
      .filter(([k, t]: [string, any]) => t.value === null && k !== CROSS_DAY)
      .map(([k]) => k);
    expect(
      nulls,
      `A measured negative encodes as a VALUE — "none", "neither", false — never as ` +
        `null. null is reserved for genuinely unmeasured, and conflating the two lets ` +
        `a later phase read an unmeasured field as a fact: ${nulls.join(", ")}`,
    ).toEqual([]);
  });

  it("every threshold id is in the closed enum", () => {
    const enumIds: string[] =
      loadJson(SCHEMA).properties.thresholds.propertyNames.enum;
    const unknown = Object.keys(d?.thresholds ?? {}).filter(
      (k) => !enumIds.includes(k),
    );
    expect(
      unknown,
      `a typo must fail validation rather than create an orphan threshold nothing ` +
        `downstream will ever read: ${unknown.join(", ")}`,
    ).toEqual([]);
  });

  it("every threshold declared inconclusive carries a revisit date", () => {
    const bad = Object.entries(d?.thresholds ?? {})
      .filter(([, t]: [string, any]) => t.status === "inconclusive" && !t.revisit_after)
      .map(([k]) => k);
    expect(
      bad,
      `an unmeasured threshold must name when it gets measured: ${bad.join(", ")}`,
    ).toEqual([]);
  });

  it(`${DENOMINATOR} is present and non-null`, () => {
    const denom = d?.thresholds?.[DENOMINATOR];
    expect(denom, `${DENOMINATOR} is missing`).toBeDefined();
    expect(
      denom?.value,
      `${DENOMINATOR} is null. It is the count of content hashes seen on two or more ` +
        `distinct days, and without it the cross-day outcome cannot be classified at all`,
    ).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // THE BICONDITIONAL, ASSERTED IN BOTH DIRECTIONS.
  //
  // The day count, the denominator and the cross-day value are a biconditional,
  // not a one-way permission. Guarding only the null direction leaves two
  // fabrication paths wide open, and both would otherwise pass every other
  // assertion in this file:
  //
  //   * a one-day run reporting a confident-looking number — the within-session
  //     rate wearing the cross-day name, with the 0.40 pessimistic default
  //     silently dropped
  //   * a multi-day run reporting 0.0 for a rate whose denominator was zero — an
  //     undefined rate reported as a measured zero, which tells CORE-08 that
  //     caching measurably never works
  //
  // Both mis-size Phase 1's CPU budget by the exact 90%-against-40% factor
  // SPIKE-10 exists to prevent, silently, across eleven downstream phases.
  // ---------------------------------------------------------------------------
  it(`${CROSS_DAY} is non-null EXACTLY when it was measurable`, () => {
    const t = d?.thresholds ?? {};
    const days = t[SAMPLE_DAYS]?.value;
    const denom = t[DENOMINATOR]?.value;
    const cross = t[CROSS_DAY];

    expect(cross, `${CROSS_DAY} is missing`).toBeDefined();
    expect(typeof days, `${SAMPLE_DAYS} is not a number`).toBe("number");
    expect(typeof denom, `${DENOMINATOR} is not a number`).toBe("number");

    const measurable = days >= 2 && denom > 0;

    if (measurable) {
      expect(
        cross.value,
        `${SAMPLE_DAYS}=${days} and ${DENOMINATOR}=${denom}: the rate WAS measurable, ` +
          `so a null here means a real measurement was discarded`,
      ).not.toBeNull();
      return;
    }

    const why = days < 2 ? `${SAMPLE_DAYS}=${days} is below 2` : `${DENOMINATOR}=0`;
    expect(
      cross.value,
      `${CROSS_DAY} is non-null but ${why}, so the rate is UNDEFINED and this value ` +
        `is a fabrication. 0.0 is its most plausible disguise. Record value:null with ` +
        `status:inconclusive instead.`,
    ).toBeNull();
    expect(
      cross.status,
      `${CROSS_DAY} is null but not declared inconclusive`,
    ).toBe("inconclusive");
    expect(
      cross.revisit_after,
      `${CROSS_DAY} is inconclusive but names no date by which it gets measured`,
    ).toBeTruthy();
    expect(
      t[ASSUMED]?.value,
      `${CROSS_DAY} is inconclusive but ${ASSUMED} is missing or not 0.40. Phase 1's ` +
        `CORE-08 must budget for the worst case until the real number lands; without ` +
        `it Phase 1 is blocked or, worse, guesses.`,
    ).toBe(0.4);
  });

  it("an inconclusive cross-day rate names WHICH of the two causes applies", () => {
    const cross = d?.thresholds?.[CROSS_DAY];
    if (cross?.value !== null) return expect(cross?.value).not.toBeNull();
    const rationale = (cross.rationale ?? "").toLowerCase();
    const named =
      rationale.includes("fewer than two distinct days sampled") ||
      rationale.includes("no content hash recurred across them");
    expect(
      named,
      `"too few days" and "enough days but nothing recurred" are different findings ` +
        `implying different follow-ups — the first says keep collecting, the second ` +
        `says the method itself needs revisiting. A later reader must be able to tell ` +
        `them apart without re-deriving it from the raw log.`,
    ).toBe(true);
  });

  it(`caido_version is ${EXPECTED_CAIDO_VERSION} and every source run agrees`, () => {
    expect(d?.caido_version).toBe(EXPECTED_CAIDO_VERSION);
    expect(d?.provenance?.binary?.reported_version).toBe(EXPECTED_CAIDO_VERSION);
    expect(d?.provenance?.binary?.expected_version).toBe(EXPECTED_CAIDO_VERSION);

    for (const spike of PHASE0_SPIKES) {
      const file = join(RESULTS, `${spike}.json`);
      expect(existsSync(file), `${file} missing but ${spike} has a gate`).toBe(true);
      const r = loadJson(file);
      expect(
        r.binary?.reported_version,
        `${file}: measured against ${r.binary?.reported_version}, not ` +
          `${EXPECTED_CAIDO_VERSION}. Bare caido-cli on this machine is a stale 0.55.3.`,
      ).toBe(EXPECTED_CAIDO_VERSION);

      // The aggregate must not have invented, dropped or reordered a run id.
      const declared = d.source_runs?.[spike] ?? [];
      const actual = (r.instances ?? []).map((i: any) => i.run_id);
      expect(declared, `${spike}: source_runs disagrees with the result's instances`)
        .toEqual(actual);
    }
  });

  it("00-GO-NO-GO.md is current — regenerating produces no diff", () => {
    expect(existsSync(RENDERED), `${RENDERED} missing`).toBe(true);
    const regenerated = execFileSync(
      "python3",
      ["scripts/spike/render-go-no-go.py", "--stdout"],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    const onDisk = readFileSync(RENDERED, "utf8");
    expect(
      regenerated === onDisk,
      `${RENDERED} is generated and must never be hand-edited. It differs from what ` +
        `scripts/spike/render-go-no-go.py produces from go-no-go.json, which means the ` +
        `prose and the data have diverged. Re-run the renderer.`,
    ).toBe(true);
  });
});

describe("credential containment in the results tree (threat T-00-45)", () => {
  // Scoped to GIT-TRACKED files, which is what T-00-45 specifies and what the
  // claim is actually about: no COMMITTED artifact carries credential material.
  // The untracked raw host logs under runs/ echo the text of the loginAsGuest
  // GraphQL query — the field NAME, never a token value — and are excluded from
  // git precisely so they never ship.
  const TOKEN_SHAPED = /caido_[A-Za-z0-9_-]{16,}/;
  const CAPTURED_TOKEN = /accessToken/;

  function trackedResultFiles(): string[] {
    try {
      return execFileSync("git", ["ls-files", RESULTS], { encoding: "utf8" })
        .split("\n")
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  it("finds files to check", () => {
    expect(trackedResultFiles().length).toBeGreaterThan(0);
  });

  it("no git-tracked artifact under results/ carries credential material", () => {
    const dirty: string[] = [];
    for (const f of trackedResultFiles()) {
      let text: string;
      try {
        text = readFileSync(f, "latin1");
      } catch {
        continue;
      }
      if (TOKEN_SHAPED.test(text) || CAPTURED_TOKEN.test(text)) dirty.push(f);
    }
    expect(
      dirty,
      `credential-shaped material in committed artifacts: ${dirty.join(", ")}`,
    ).toEqual([]);
  });
});

describe("result inventory", () => {
  it("every SPIKE-*.json in the results tree has a gate", () => {
    const files = readdirSync(RESULTS).filter((f) => /^SPIKE-\d\d[a-z]?\.json$/.test(f));
    const spikes = files.map((f) => f.replace(/\.json$/, "")).sort();
    // Catches the reverse of the coverage test above: a result file that exists
    // but never made it into the aggregate is an answer nobody downstream reads.
    expect(spikes).toEqual([...PHASE0_SPIKES].sort());
  });
});
