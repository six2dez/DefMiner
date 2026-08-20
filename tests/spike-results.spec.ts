import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const RESULTS = ".planning/phases/00-runtime-reality-check/results";
const TERMINAL = ["pass", "fail", "inconclusive", "blocked"];

// Data-driven over WHATEVER result files exist. Plans 00-02 and 00-03 run in
// parallel and add SPIKE-*.json files independently, so this must never assume a
// particular spike is present. No plan other than 00-01 edits this file.
function resultFiles(): string[] {
  if (!existsSync(RESULTS)) return [];
  return readdirSync(RESULTS)
    .filter((f) => /^SPIKE-\d\d\.json$/.test(f))
    .sort()
    .map((f) => join(RESULTS, f));
}

const files = resultFiles();

describe("spike result quality", () => {
  it("there is at least one result to check", () => {
    expect(files.length, `no SPIKE-NN.json under ${RESULTS}`).toBeGreaterThan(0);
  });

  it.each(files)("%s carries a usable answer", (file) => {
    const d = JSON.parse(readFileSync(file, "utf8"));

    expect(TERMINAL, `${file}: status "${d.status}" is not terminal`).toContain(d.status);

    // A spike that records a number but not what the number MEANS is not an
    // answer; the phase's whole output is a table later phases read.
    expect(d.verdict?.answer?.trim(), `${file}: verdict.answer is empty`).toBeTruthy();

    // if_wrong is what makes "what changes if this is wrong" machine-readable
    // rather than narrated prose nobody re-reads.
    expect(d.verdict?.if_wrong?.trim(), `${file}: verdict.if_wrong is empty`).toBeTruthy();

    expect(
      Array.isArray(d.requirements_affected) && d.requirements_affected.length > 0,
      `${file}: requirements_affected is empty — nothing traces to this measurement`,
    ).toBe(true);

    for (const t of d.verdict?.thresholds_set ?? []) {
      // A threshold value may be null in exactly one sanctioned case: a
      // measurement that genuinely could not be taken, declared as such.
      // Anything else null cannot be folded into go-no-go.json.
      //
      // This encodes the B8 rule rather than relaxing the assertion. The
      // alternative — forcing a number into a slot where no measurement
      // exists — is the fabrication path the whole cross-day gate was
      // built over three review rounds to close. A sentinel value would
      // be that same fabrication wearing a different name.
      expect(t.value, `${file}: threshold ${t.id} has an undefined value`).toBeDefined();

      if (t.value === null) {
        expect(
          t.status,
          `${file}: threshold ${t.id} is null but not declared inconclusive — ` +
            `a null value is only permitted for a measurement that could not be taken`,
        ).toBe("inconclusive");
        expect(
          t.revisit_after,
          `${file}: threshold ${t.id} is inconclusive but carries no revisit_after — ` +
            `an unmeasured threshold must name when it gets measured`,
        ).toBeTruthy();
      }
    }
  });

  it.each(files)("%s references at least one real run", (file) => {
    const d = JSON.parse(readFileSync(file, "utf8"));
    expect(
      Array.isArray(d.instances) && d.instances.length > 0,
      `${file}: no instances recorded`,
    ).toBe(true);

    // run_id uniqueness across the array is what proves no two measurements
    // shared a runtime. SPIKE-04 spans three fresh instances and SPIKE-06 one
    // per size point; if two collapsed onto one runtime the numbers are blended.
    const ids = d.instances.map((i: any) => i.run_id);
    expect(new Set(ids).size, `${file}: duplicate run_id in instances: ${ids}`).toBe(
      ids.length,
    );

    for (const inst of d.instances) {
      // Never 0.0.0.0, and never the operator's desktop port.
      expect(inst.listen, `${file}: instance listens on ${inst.listen}`).toMatch(
        /^127\.0\.0\.1:\d+$/,
      );
      expect(inst.listen, `${file}: an instance bound port 8080`).not.toBe(
        "127.0.0.1:8080",
      );
    }
  });
});
