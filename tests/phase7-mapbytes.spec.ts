import { existsSync, readFileSync } from "node:fs";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

// THE PHASE 7 MAP-BYTES GATE — D-10's evidence, kept honest.
//
// This file measures nothing. `scripts/phase7/map-bytes.sh` does, one fresh
// Caido instance per ladder point, because nothing inside vitest can observe
// what `JSON.parse` costs on Caido's QuickJS thread: "how expensive is the
// inline sourcemap path inside the runtime that ships" is an external-harness
// question with no answer derivable by reading code.
//
// FAIL, NEVER SKIP, and name the remedy in every message. That is the doctrine
// `tests/go-no-go.spec.ts` set and `tests/phase6-matrix.spec.ts` carries; an
// absent or unreadable artifact must fail here rather than pass vacuously.
//
// WHY THE VERSION CONSTANT BELOW IS THIS PROBE'S OWN (D-21, a second time).
// `tests/phase1-load.spec.ts`, `tests/phase1-runtime.spec.ts`,
// `tests/schema.spec.ts`, `tests/phase1-compat.spec.ts` and
// `tests/go-no-go.spec.ts` all pin "0.57.1", and `tests/phase6-matrix.spec.ts`
// pins "0.58.2". Neither is a value to reuse. 0.57.1 is a deliberate
// fail-closed tripwire over artifacts whose numbers were MEASURED on 0.57.1 —
// reusing it here would make every point fail by design, and editing it would
// contaminate the tripwire. 0.58.2 is the desktop app bundle, which drifts with
// its auto-updater and can never be reproduced by a later reader. This probe
// targets the in-repo, sha512-verified `.caido-bin/0.58.0/caido-cli`, declares
// its own constant, and touches neither of the other two.
//
// THE THREE THINGS THIS GATE EXISTS TO CATCH, all of which look like a pass:
//
//   1. TWO POINTS THAT SHARED AN INSTANCE. `fresh: true` is recorded per point
//      and would be `true` on both. RSS is a high-water mark that never falls,
//      the allocator does not return pages to the OS, and there is no `gc()` —
//      so a reused instance makes every point after the first meaningless while
//      reading as measured. `scripts/spike/ladder.sh:12-19` says a PROSE-ONLY
//      version of that rule passed review twice while the contamination it
//      forbids stayed possible. The assertion is run_id UNIQUENESS.
//   2. A POINT MISSING AN OPERATION. An `op_cost` object that quietly lost a
//      key still validates as an object of numbers, and the ms/MB slope fitted
//      from what remains is a different quantity wearing the same name. Every
//      declared operation is asserted present BY NAME, and the failure says
//      which one is gone.
//   3. AN ARTIFACT WRITTEN AGAINST THE WRONG BUILD. `~/.caido/caido-cli` on
//      this machine is a stale 0.55.3 and `scripts/spike/instance.sh:83` names
//      it as the trap. The binary block is asserted three ways — expected
//      equals reported, both equal this file's constant — and no string
//      anywhere in the artifact may carry a home-directory path.
//
// AND WHY THIS ARTIFACT IS NOT IN THE PHASE 0 RESULTS DIRECTORY.
// `tests/spike-results.spec.ts` globs `/^SPIKE-\d\d[a-z]?\.json$/` under
// `.planning/phases/00-runtime-reality-check/results` and pins 0.57.1. A Phase 7
// measurement landing there — even a correct one — would be gated by a spec
// that pins the wrong build, and it would blur the boundary between "measured
// on the build the thresholds belong to" and "measured on today's build".

const RESULT =
  ".planning/phases/07-sourcemap-reconstruction/results/map-bytes.json";
const SCHEMA =
  ".planning/phases/07-sourcemap-reconstruction/results/map-bytes.schema.json";

/** THIS PROBE'S OWN PINNED BUILD. See the header. */
const MAP_PROBE_EXPECTED_VERSION = "0.58.0";

const REMEASURE = "re-run `bash scripts/phase7/map-bytes.sh`";
const STATUSES = ["pass", "fail", "inconclusive", "not_run"];

/**
 * The operations the tracer declares, in the FIXED order the probe runs them.
 *
 * ORDER IS ASSERTED, not merely membership. RSS never falls in this runtime and
 * there is no `gc()`, so each step delta is only meaningful as an increment on
 * what came before — an operation that moved makes every reading after it a
 * different quantity, and a set comparison cannot see that.
 */
const DECLARED_OPS = ["announce_scan", "b64_decode_buffer", "json_parse"];

/** The structural ceiling, restated so the gate can check the artifact's copy. */
const PASSIVE_MAX_BYTES = 8_388_608;
const STRUCTURAL_CEILING = Math.floor((PASSIVE_MAX_BYTES * 3) / 4);

/* eslint-disable @typescript-eslint/no-explicit-any --
   The artifact is plain recorded JSON written by a shell script and two python
   helpers, with no shipped type. A parallel interface here would be a second
   hand-maintained copy of that shape, and the gate would then be checking the
   copy. */

function loadJson(path: string): any {
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${(err as Error).message}`);
  }
}

const d = existsSync(RESULT) ? loadJson(RESULT) : null;

/** Every string anywhere in the artifact, with its path. */
function strings(
  value: unknown,
  path = "$",
  out: Array<{ path: string; value: string }> = [],
): Array<{ path: string; value: string }> {
  if (typeof value === "string") out.push({ path, value });
  else if (Array.isArray(value)) {
    value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      strings(v, `${path}.${k}`, out);
    }
  }
  return out;
}

// The home-directory shapes, with NO exemption anywhere. This is what catches a
// run against the stale `$HOME/.caido` 0.55.3, and it is also the privacy
// control: the artifact ships in git and must carry nothing about this machine.
const HOME_PATH = /\/(?:Users|home)\/[^/\s"']+/;

function ajv() {
  const a = new Ajv2020({ allErrors: true, strict: false });
  addFormats(a);
  return a;
}

// ---------------------------------------------------------------------------
// Fixture skeletons. Hand-built, so the SCHEMA is tested by validation rather
// than by reading its keywords back — a constraint that is present but
// mis-wired reads identical to a correct one.
// ---------------------------------------------------------------------------

function pointFixture(over: Record<string, unknown> = {}): any {
  return {
    label: "p1500k",
    run_id: "20260101T000000Z-1",
    fixture: ".spike/maps/inline-p1500k.js",
    decoded_bytes: 1_572_864,
    op_cost: Object.fromEntries(DECLARED_OPS.map((op) => [op, 1.5])),
    op_ok: Object.fromEntries(DECLARED_OPS.map((op) => [op, true])),
    rss_step: Object.fromEntries(
      DECLARED_OPS.map((op) => [op, { bytes: 0, reason: null }]),
    ),
    call_rc: 0,
    host_alive_after: true,
    ...over,
  };
}

function docFixture(points: any[], over: Record<string, unknown> = {}): any {
  return {
    spike: "MAP-BYTES",
    status: "pass",
    recorded_at: "2026-09-01T00:00:00Z",
    binary: {
      path: `.caido-bin/${MAP_PROBE_EXPECTED_VERSION}/caido-cli`,
      expected_version: MAP_PROBE_EXPECTED_VERSION,
      reported_version: MAP_PROBE_EXPECTED_VERSION,
      sha256: "0".repeat(64),
    },
    host: { os: "darwin", arch: "arm64" },
    instances: points.map((p) => ({
      run_id: p.run_id,
      listen: "127.0.0.1:8941",
      fresh: true,
    })),
    method: "fixture",
    measurements: [{ name: "json_parse", value: 1.5, unit: "ms" }],
    points,
    verdict: { answer: "fixture", if_wrong: "fixture" },
    requirements_affected: ["MAP-01"],
    ...over,
  };
}

/**
 * THE run_id UNIQUENESS RULE, as a function rather than as prose.
 *
 * Written once and used by BOTH the hand-built fixtures and the live artifact.
 * Two copies — one checking a fixture, one checking the recorded run — is how a
 * gate ends up proving that its fixtures are well-formed while the artifact
 * goes unchecked.
 *
 * Returns the duplicated ids; empty means every point had its own instance.
 */
function duplicateRunIds(points: any[]): string[] {
  const seen = new Map<string, number>();
  for (const p of points ?? []) {
    const id = String(p?.run_id ?? "");
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

/** The declared operations a point is MISSING, by name. */
function missingOps(point: any): string[] {
  const costs = point?.op_cost ?? {};
  return DECLARED_OPS.filter((op) => typeof costs[op] !== "number");
}

describe("the map-bytes result schema", () => {
  it("compiles", () => {
    expect(existsSync(SCHEMA), `${SCHEMA} missing`).toBe(true);
    expect(() => ajv().compile(loadJson(SCHEMA))).not.toThrow();
  });

  it("accepts a well-formed single-point document — the checker is not vacuously strict", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    const ok = validate(docFixture([pointFixture()]));
    expect(
      ok,
      `${SCHEMA} rejected a well-formed document: ${JSON.stringify(validate.errors)}. ` +
        `A schema that rejects everything catches nothing.`,
    ).toBe(true);
  });

  it("REFUSES a Phase 0 SPIKE-NN identifier", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    expect(
      validate(docFixture([pointFixture()], { spike: "SPIKE-06" })),
      `${SCHEMA}: an artifact identifying itself as SPIKE-06 validated. Phase 0's ` +
        `results directory holds the threshold artifacts every later phase budgets ` +
        `against, tests/spike-results.spec.ts globs /^SPIKE-\\d\\d[a-z]?\\.json$/ there ` +
        `and pins 0.57.1, and an artifact that CAN be mistaken for one of those is an ` +
        `artifact that gets read as one.`,
    ).toBe(false);
  });

  it("REQUIRES at least one point", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    expect(
      validate(docFixture([], { points: [] })),
      `${SCHEMA}: a document with an EMPTY points array validated. Every derived ` +
        `figure in the verdict is fitted from those points; with none, the verdict is ` +
        `a sentence with no measurement behind it.`,
    ).toBe(false);
  });

  it("REQUIRES a point to carry run_id, decoded_bytes and op_cost", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    for (const key of ["run_id", "decoded_bytes", "op_cost", "rss_step"]) {
      const bare = pointFixture();
      delete bare[key];
      expect(
        validate(docFixture([bare])),
        `${SCHEMA}: a point with no \`${key}\` validated. That field is not ` +
          `decoration — it is what makes the point attributable to a run, a size and ` +
          `a cost.`,
      ).toBe(false);
    }
  });

  it("REQUIRES the verdict to carry both an answer and an if_wrong", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    for (const key of ["answer", "if_wrong"]) {
      const doc = docFixture([pointFixture()]);
      delete doc.verdict[key];
      expect(
        validate(doc),
        `${SCHEMA}: a verdict with no \`${key}\` validated. A measurement with no ` +
          `stated consequence for being wrong is a number nobody can act on.`,
      ).toBe(false);
    }
  });

  it("REFUSES an observation whose status reads as a pass", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    expect(
      validate(
        docFixture([pointFixture()], {
          observations: [
            {
              id: "OQ-1-request-retention",
              status: "pass",
              question: "fixture",
              finding: "fixture",
            },
          ],
        }),
      ),
      `${SCHEMA}: an observation with status "pass" validated. An observation is ` +
        `NOT a gate result. RESEARCH Open Question 1 says do not block on the ` +
        `request-retention question — recording it with a pass-shaped status is ` +
        `exactly how it would come to be cited as a settled retention policy.`,
    ).toBe(false);
  });
});

describe("the run_id uniqueness rule — the contamination `fresh: true` cannot see", () => {
  it("accepts distinct run_ids", () => {
    expect(
      duplicateRunIds([
        pointFixture({ run_id: "a" }),
        pointFixture({ run_id: "b" }),
      ]),
      "the uniqueness checker rejected two genuinely distinct runs.",
    ).toEqual([]);
  });

  it("CATCHES two points that shared an instance while both claim fresh: true", () => {
    expect(
      duplicateRunIds([
        pointFixture({ run_id: "same", fresh: true }),
        pointFixture({ run_id: "same", fresh: true }),
      ]),
      "two points sharing a run_id were not caught. This is the whole assertion: " +
        "RSS is a high-water mark that never falls and there is no gc(), so a reused " +
        "instance makes every point after the first meaningless — and `fresh: true` " +
        "is recorded per point and stays true on both.",
    ).toEqual(["same"]);
  });
});

describe("the missing-operation rule", () => {
  it("names the operation that is gone rather than reporting a shorter object", () => {
    const gap = pointFixture();
    delete gap.op_cost.json_parse;
    expect(
      missingOps(gap),
      "a point that lost `json_parse` was not reported as missing it. An op_cost " +
        "object with a key removed still validates as an object of numbers, and the " +
        "ms/MB slope fitted from what remains is a different quantity wearing the " +
        "same name.",
    ).toEqual(["json_parse"]);
  });

  it("reports nothing for a complete point", () => {
    expect(
      missingOps(pointFixture()),
      "the missing-operation checker fired on a complete point. A checker that " +
        "rejects everything catches nothing.",
    ).toEqual([]);
  });
});

describe("the map-bytes artifact", () => {
  it("exists — D-10 has no other evidence", () => {
    expect(
      existsSync(RESULT),
      `${RESULT} missing — ${REMEASURE}. That script fetches the SHA-256-pinned ` +
        `vendor maps (\`bash scripts/phase7/fetch-maps.sh\`), synthesises the inline ` +
        `fixtures, and launches one fresh Caido ` +
        `${MAP_PROBE_EXPECTED_VERSION} per ladder point. If the binary is absent, ` +
        `run \`bash scripts/phase1/fetch-caido.sh ${MAP_PROBE_EXPECTED_VERSION}\` first, ` +
        `and \`pnpm exec caido-dev build\` to produce dist/plugin_package.`,
    ).toBe(true);
  });

  it("parses", () => {
    expect(d, `${RESULT} did not parse — ${REMEASURE}`).not.toBeNull();
  });

  it("validates against its own schema", () => {
    const validate = ajv().compile(loadJson(SCHEMA));
    const ok = validate(d);
    if (!ok) {
      throw new Error(
        `${RESULT} failed schema validation — ${REMEASURE}:\n` +
          (validate.errors ?? [])
            .map((e) => `  ${e.instancePath || "/"} ${e.message}`)
            .join("\n"),
      );
    }
    expect(ok).toBe(true);
  });

  it("carries a terminal status", () => {
    expect(
      STATUSES,
      `${RESULT}: status "${d?.status}" is not one of ${STATUSES.join(", ")}. ${REMEASURE}.`,
    ).toContain(d?.status);
  });

  it("pins THIS probe's build, not Phase 1's tripwire and not Phase 6's app bundle", () => {
    expect(
      d?.binary?.expected_version,
      `${RESULT}: binary.expected_version is ${JSON.stringify(d?.binary?.expected_version)}, ` +
        `not ${MAP_PROBE_EXPECTED_VERSION}. If it reads 0.57.1 the probe has been pointed ` +
        `at the Phase 1 tripwire constant, which pins the build the Phase 0 THRESHOLDS were ` +
        `measured on; if it reads 0.58.2 it has been pointed at the desktop app bundle, ` +
        `which drifts with its auto-updater and cannot be reproduced. ${REMEASURE}.`,
    ).toBe(MAP_PROBE_EXPECTED_VERSION);
    expect(
      d?.binary?.reported_version,
      `${RESULT}: the binary REPORTED ${JSON.stringify(d?.binary?.reported_version)} ` +
        `against an expectation of ${JSON.stringify(d?.binary?.expected_version)}. Do not ` +
        `edit the file — ${REMEASURE}.`,
    ).toBe(d?.binary?.expected_version);
    expect(
      d?.binary?.reported_version,
      `${RESULT}: the binary reported ${JSON.stringify(d?.binary?.reported_version)}, not ` +
        `${MAP_PROBE_EXPECTED_VERSION}. The usual cause is bare \`caido-cli\` from PATH or ` +
        `\`~/.caido/caido-cli\`, a STALE 0.55.3 on this machine that ` +
        `scripts/spike/instance.sh:83 names as the trap. ${REMEASURE}.`,
    ).toBe(MAP_PROBE_EXPECTED_VERSION);
    expect(
      String(d?.binary?.path ?? ""),
      `${RESULT}: binary.path is ${JSON.stringify(d?.binary?.path)}. The probe must target ` +
        `the in-repo, sha512-verified .caido-bin build — that is what makes the measurement ` +
        `reproducible by anyone who runs \`bash scripts/phase1/fetch-caido.sh ` +
        `${MAP_PROBE_EXPECTED_VERSION}\`.`,
    ).toContain(`.caido-bin/${MAP_PROBE_EXPECTED_VERSION}/`);
  });

  it("carries no home-directory path anywhere — the machine it ran on does not ship", () => {
    const leaks = strings(d).filter((s) => HOME_PATH.test(s.value));
    expect(
      leaks.map((l) => `${l.path} = ${l.value.slice(0, 120)}`),
      `${RESULT} carries home-directory paths. That is BOTH a privacy control (the ` +
        `artifact ships in git) and the tripwire for a run against \`~/.caido/caido-cli\`, ` +
        `the stale 0.55.3. ${REMEASURE}.`,
    ).toEqual([]);
  });
});

describe("the ladder points", () => {
  it("are present and non-empty", () => {
    expect(
      Array.isArray(d?.points) ? d.points.length : 0,
      `${RESULT}: no points recorded. Every derived figure in the verdict is fitted ` +
        `from them — with none, this suite would pass having asserted nothing. ${REMEASURE}.`,
    ).toBeGreaterThan(0);
  });

  it("each ran on its OWN instance — run_id UNIQUENESS, not merely fresh: true", () => {
    const dupes = duplicateRunIds(d?.points ?? []);
    expect(
      dupes,
      `${RESULT}: ladder points share the run_id(s) ${JSON.stringify(dupes)}. ONE FRESH ` +
        `INSTANCE PER SIZE POINT is non-negotiable: RSS is a high-water mark that never ` +
        `falls, the allocator does not return pages to the OS, and there is no gc() to ` +
        `force a collection before a reading, so reusing an instance makes every point ` +
        `after the first meaningless. \`fresh: true\` cannot see this — it is recorded per ` +
        `point and stays true on both. ${REMEASURE}.`,
    ).toEqual([]);
  });

  it("each has an instance record of its own", () => {
    const pointIds = (d?.points ?? []).map((p: any) => p?.run_id).sort();
    const instanceIds = (d?.instances ?? []).map((i: any) => i?.run_id).sort();
    expect(
      instanceIds,
      `${RESULT}: the instances array does not match the points array run-for-run. ` +
        `An instance record without a point is a run whose result was dropped; a point ` +
        `without an instance record is a measurement nobody can attribute to a launch. ` +
        `${REMEASURE}.`,
    ).toEqual(pointIds);
  });

  it("each carries EVERY declared operation, and names the one that is missing", () => {
    for (const p of d?.points ?? []) {
      const gaps = missingOps(p);
      expect(
        gaps,
        `${RESULT}: point "${p?.label}" (run ${p?.run_id}) has no numeric op_cost for ` +
          `${JSON.stringify(gaps)}. The declared order is ${DECLARED_OPS.join(" -> ")}, ` +
          `heaviest last, and it is fixed: RSS never falls here and each step delta is ` +
          `only meaningful as an increment on what came before. ${REMEASURE}.`,
      ).toEqual([]);
    }
  });

  it("each records the operations in the DECLARED ORDER", () => {
    for (const p of d?.points ?? []) {
      expect(
        Object.keys(p?.op_cost ?? {}),
        `${RESULT}: point "${p?.label}" records its operations in a different order ` +
          `than the declared ${DECLARED_OPS.join(" -> ")}. Order is asserted rather ` +
          `than membership because an operation that MOVED makes every RSS step after ` +
          `it a different quantity, and a set comparison cannot see that. ${REMEASURE}.`,
      ).toEqual(DECLARED_OPS);
    }
  });

  it("each ran against a size at or below the structural ceiling", () => {
    for (const p of d?.points ?? []) {
      expect(
        p?.decoded_bytes,
        `${RESULT}: point "${p?.label}" measured ${p?.decoded_bytes} decoded bytes, above ` +
          `the structural ceiling of ${STRUCTURAL_CEILING} = floor(PASSIVE_MAX_BYTES * 3/4). ` +
          `An inline map's decoded JSON cannot exceed that — base64 expands 4:3 and admit() ` +
          `refuses any body over PASSIVE_MAX_BYTES — so a point above it prices a case that ` +
          `cannot reach this code.`,
      ).toBeLessThanOrEqual(STRUCTURAL_CEILING);
    }
  });

  it("each found an INLINE announcement — a fixture that lost its map measures nothing", () => {
    for (const p of d?.points ?? []) {
      expect(
        p?.announcement?.inline,
        `${RESULT}: point "${p?.label}" did not find an inline announcement ` +
          `(${JSON.stringify(p?.announcement)}). The synthesised fixture must end in ` +
          `\`//# sourceMappingURL=data:application/json;base64,<payload>\` with NO trailing ` +
          `newline. Without it the decode and parse operations ran on an empty string and ` +
          `every cost below is a measurement of nothing. ${REMEASURE}.`,
      ).toBe(true);
    }
  });

  it("each survived its own measurement", () => {
    for (const p of d?.points ?? []) {
      expect(
        p?.host_alive_after,
        `${RESULT}: the Caido instance for point "${p?.label}" was NOT alive after the ` +
          `call (exit_code ${p?.exit_code}; 134 is SIGABRT, the caido/caido#2211 crash ` +
          `signature). A probe that kills its host is a RESULT — but it is not a cost ` +
          `measurement, and the ms figures recorded beside it describe a run that did not ` +
          `finish.`,
      ).toBe(true);
    }
  });
});

describe("the verdict", () => {
  it("states a numeric MAP_MAX_BYTES", () => {
    expect(
      typeof d?.verdict?.map_max_bytes,
      `${RESULT}: verdict.map_max_bytes is ${JSON.stringify(d?.verdict?.map_max_bytes)}. ` +
        `D-10 mandates a MEASURED number and this artifact is where it lives — ` +
        `packages/engine/src/thresholds.ts cites this file by path as MAP_MAX_BYTES's ` +
        `derivation. ${REMEASURE}.`,
    ).toBe("number");
    expect(
      d?.verdict?.map_max_bytes,
      `${RESULT}: verdict.map_max_bytes is not a positive integer.`,
    ).toBeGreaterThan(0);
  });

  it("never exceeds the structural ceiling", () => {
    expect(
      d?.verdict?.map_max_bytes,
      `${RESULT}: verdict.map_max_bytes (${d?.verdict?.map_max_bytes}) is above the ` +
        `structural ceiling ${STRUCTURAL_CEILING} = floor(PASSIVE_MAX_BYTES * 3/4). ` +
        `MAP_MAX_BYTES is min(measured_stall_bound, measured_rss_bound, ceiling); a value ` +
        `above the ceiling means the min was not taken.`,
    ).toBeLessThanOrEqual(STRUCTURAL_CEILING);
  });

  it("says whether the bound is BINDING, so a ceiling value never reads as 'not measured'", () => {
    expect(
      typeof d?.verdict?.binding,
      `${RESULT}: verdict.binding is ${JSON.stringify(d?.verdict?.binding)}. If the probe ` +
        `found the parse affordable across the whole range then MAP_MAX_BYTES IS the ` +
        `structural ceiling — a legitimate outcome that must be recorded as MEASURED TO BE ` +
        `NON-BINDING. Without this boolean, "6291456" and "nobody measured" look identical.`,
    ).toBe("boolean");
  });

  it("carries a non-empty if_wrong naming both O-03 outcomes", () => {
    const w = String(d?.verdict?.if_wrong ?? "");
    expect(
      w.length,
      `${RESULT}: verdict.if_wrong is empty. ${REMEASURE}.`,
    ).toBeGreaterThan(0);
    expect(
      w,
      `${RESULT}: verdict.if_wrong does not mention the below-ceiling outcome. RESEARCH ` +
        `§ O-03 names two: below the ceiling means the phase recovers source from a ` +
        `MINORITY of inline maps and the UI must say so; at the ceiling means the bound is ` +
        `non-binding and the D-02 window is the full base64 span.`,
    ).toMatch(/minority/i);
    expect(
      w,
      `${RESULT}: verdict.if_wrong does not mention the at-ceiling outcome.`,
    ).toMatch(/non-binding/i);
  });

  it("records O-04 — MAP-02's parenthetical was NOT measured in Caido", () => {
    const o4 = String(d?.verdict?.o_04_map02_parenthetical ?? "");
    expect(
      o4.length,
      `${RESULT}: verdict.o_04_map02_parenthetical is empty. MAP-02 carries ` +
        `"781 sources / 12.66 MB / 21 ms" unqualified, and leaving that beside a ` +
        `requirement THIS phase implements is the precise defect Phase 0 exists to ` +
        `prevent — a number that READS as a Caido measurement and is not one.`,
    ).toBeGreaterThan(0);
    expect(
      o4,
      `${RESULT}: the O-04 record does not name the harness. It was standalone ` +
        `quickjs-ng 0.16.1 (.planning/research/STACK.md:546), not Caido.`,
    ).toMatch(/quickjs-ng/i);
    expect(
      o4,
      `${RESULT}: the O-04 record does not state that the case cannot arise on the ` +
        `inline path. 12.66 MB of map JSON base64-encodes to ~16.9 MB, which admit() ` +
        `refuses against PASSIVE_MAX_BYTES = ${PASSIVE_MAX_BYTES} by more than 2x.`,
    ).toMatch(/16\.9/);
  });
});

describe("the derivation is written down, not asserted", () => {
  it("names the structural ceiling and computes it from PASSIVE_MAX_BYTES", () => {
    expect(
      d?.derivation?.structural_ceiling_bytes,
      `${RESULT}: derivation.structural_ceiling_bytes is ` +
        `${JSON.stringify(d?.derivation?.structural_ceiling_bytes)}, not ` +
        `${STRUCTURAL_CEILING}. It is floor(PASSIVE_MAX_BYTES * 3/4) and nothing else — ` +
        `not a preference, a consequence of two shipped constants.`,
    ).toBe(STRUCTURAL_CEILING);
    expect(
      d?.derivation?.passive_max_bytes,
      `${RESULT}: derivation.passive_max_bytes disagrees with the shipped ` +
        `PASSIVE_MAX_BYTES (${PASSIVE_MAX_BYTES}). The whole ceiling argument rests on it.`,
    ).toBe(PASSIVE_MAX_BYTES);
  });

  it("records a reason for every bound it could NOT fit", () => {
    for (const [value, reason] of [
      ["measured_stall_bound_bytes", "measured_stall_bound_reason"],
      ["measured_rss_bound_bytes", "measured_rss_bound_reason"],
    ]) {
      if (
        d?.derivation?.[value] === null ||
        d?.derivation?.[value] === undefined
      ) {
        expect(
          String(d?.derivation?.[reason] ?? "").length,
          `${RESULT}: derivation.${value} is null and derivation.${reason} is empty. ` +
            `A bound nobody could fit is a legitimate outcome; a bound nobody could fit ` +
            `AND nobody explained is indistinguishable from one that was skipped.`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("says how many ladder points it fitted from, and whether that is the whole ladder", () => {
    expect(
      d?.derivation?.ladder_points,
      `${RESULT}: derivation.ladder_points is missing. A rate fitted from fewer points ` +
        `than the ladder declares is a rate with an unstated error bar.`,
    ).toBe((d?.points ?? []).length);
    expect(
      typeof d?.derivation?.ladder_complete,
      `${RESULT}: derivation.ladder_complete is not a boolean. It is what stops a ` +
        `partial run being read as the full measurement.`,
    ).toBe("boolean");
  });
});
