// tests/pins.spec.ts — DIST-06's gate.
//
// Two dependency traps cost nothing to disarm now and a day to discover in
// Phase 5 [01-RESEARCH.md, citing .planning/research/STACK.md:485-500]:
//
//   primevue     — @caido/primevue peer-depends on EXACTLY 4.1.0. Not a range.
//   tailwindcss  — @caido/tailwindcss hard-depends on 3.4.13 and uses a v3 API
//                  that v4 removed.
//
// NEITHER PACKAGE IS INSTALLED TODAY, and that is precisely why the pins exist
// now: the failure mode is a Phase 5 transitive resolution picking a version
// that breaks a hard peer, with no direct manifest change to point at. An
// override written after the fact is a debugging session; an override written
// before is a non-event.
//
// The pins live in pnpm-workspace.yaml and NOT under a `pnpm.overrides` key in
// package.json. pnpm 11 no longer reads package.json's `pnpm` field — it
// ignores it with a warning (measured while executing plan 01-02: the install
// printed `The "pnpm" field in package.json is no longer read by pnpm. The
// following keys were ignored: "pnpm.overrides"`). A pin in the old location is
// not a weaker pin, it is NO pin, which is worse than none because it reads as
// protection. There is an assertion below that the dead key has not come back.
//
// Style follows tests/schema.spec.ts and tests/go-no-go.spec.ts: FAIL, NEVER
// SKIP, and every assertion carries its remedy as the message argument.
//
// The two YAML files are read with a deliberately tiny block reader rather than
// a YAML library. Adding `yaml` as a direct dependency would put a package into
// this tree that Phase 1's package-legitimacy audit never covered, to parse two
// flat `key: value` maps. Every reader below is guarded by a non-vacuity
// assertion, so a reader that silently found nothing fails rather than passes.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const ROOT_PKG = "package.json";
const ENGINE_PKG = "packages/engine/package.json";
const BACKEND_PKG = "packages/backend/package.json";
const WORKSPACE = "pnpm-workspace.yaml";
const LOCKFILE = "pnpm-lock.yaml";

const REINSTALL = "re-run `pnpm install`";

type Manifest = Record<string, unknown>;

function loadJson(path: string): Manifest {
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw) as Manifest;
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${(err as Error).message}`);
  }
}

/**
 * The `key: value` pairs indented one level under a top-level `key:` line.
 * Comments and blank lines are skipped; the block ends at the first non-comment
 * line that is not indented.
 */
function yamlBlock(text: string, key: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = text.split("\n");
  let inBlock = false;
  for (const line of lines) {
    if (!inBlock) {
      if (line.trimEnd() === `${key}:`) inBlock = true;
      continue;
    }
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) break;
    const m = /^\s+([A-Za-z0-9@._/-]+):\s*(\S.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** The `- item` entries indented one level under a top-level `key:` line. */
function yamlList(text: string, key: string): string[] {
  const out: string[] = [];
  const lines = text.split("\n");
  let inBlock = false;
  for (const line of lines) {
    if (!inBlock) {
      if (line.trimEnd() === `${key}:`) inBlock = true;
      continue;
    }
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) break;
    const m = /^\s+-\s+(\S.*?)\s*$/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

/** An exact version: three dot-separated numbers, optional pre-release suffix. */
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const RANGEY = /[\^~><*|]|\blatest\b|\bnext\b|\s-\s/;

const workspaceText = readFileSync(WORKSPACE, "utf8");
const lockText = readFileSync(LOCKFILE, "utf8");

describe("DIST-06 — the two dependency traps are disarmed", () => {
  const overrides = yamlBlock(workspaceText, "overrides");

  it("pnpm-workspace.yaml declares an overrides block", () => {
    // Non-vacuity: a reader that found nothing must fail, not pass by omission.
    expect(
      Object.keys(overrides).length,
      `no \`overrides:\` block found in ${WORKSPACE}. DIST-06's pins live there, not under package.json's \`pnpm\` key — pnpm 11 ignores that key entirely.`,
    ).toBeGreaterThan(0);
  });

  it("primevue is pinned to EXACTLY 4.1.0, with no range operator", () => {
    expect(
      overrides.primevue,
      `${WORKSPACE} overrides.primevue must be the literal "4.1.0": @caido/primevue peer-depends on exactly that version, so any range at all can resolve to something its peer rejects.`,
    ).toBe("4.1.0");
    expect(
      RANGEY.test(overrides.primevue ?? ""),
      `${WORKSPACE} overrides.primevue carries a range operator. An exact peer dependency needs an exact pin.`,
    ).toBe(false);
  });

  it("tailwindcss is pinned to EXACTLY 3.4.13, with no range operator", () => {
    expect(
      overrides.tailwindcss,
      `${WORKSPACE} overrides.tailwindcss must be the literal "3.4.13": @caido/tailwindcss uses a v3 API that v4 removed, so a v4 resolution is a build break, not a warning.`,
    ).toBe("3.4.13");
    expect(
      RANGEY.test(overrides.tailwindcss ?? ""),
      `${WORKSPACE} overrides.tailwindcss carries a range operator. ${REINSTALL} after fixing it.`,
    ).toBe(false);
  });

  it("the lockfile agrees with both overrides", () => {
    const locked = yamlBlock(lockText, "overrides");
    expect(
      Object.keys(locked).length,
      `no \`overrides:\` block in ${LOCKFILE}. The pins were written but never resolved — ${REINSTALL}.`,
    ).toBeGreaterThan(0);
    expect(
      locked.primevue,
      `${LOCKFILE} disagrees with ${WORKSPACE} on primevue. ${REINSTALL}.`,
    ).toBe("4.1.0");
    expect(
      locked.tailwindcss,
      `${LOCKFILE} disagrees with ${WORKSPACE} on tailwindcss. ${REINSTALL}.`,
    ).toBe("3.4.13");
  });

  it("package.json carries no dead `pnpm` key", () => {
    // pnpm 11 IGNORES this key. A pin here reads as protection and provides
    // none, which is the worst of both.
    expect(
      loadJson(ROOT_PKG).pnpm,
      `${ROOT_PKG} has a \`pnpm\` key. pnpm 11 does not read it — move its contents into ${WORKSPACE}, where they take effect.`,
    ).toBeUndefined();
  });
});

describe("every declared version is an exact pin", () => {
  const manifests: Array<[string, Manifest]> = [
    [ROOT_PKG, loadJson(ROOT_PKG)],
    [ENGINE_PKG, loadJson(ENGINE_PKG)],
    [BACKEND_PKG, loadJson(BACKEND_PKG)],
  ];

  const entries: Array<[string, string, string, string]> = [];
  for (const [path, pkg] of manifests) {
    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
    ]) {
      const block = pkg[field] as Record<string, string> | undefined;
      if (!block) continue;
      for (const [name, range] of Object.entries(block)) {
        entries.push([path, field, name, range]);
      }
    }
  }

  it("found dependencies to check", () => {
    // NON-VACUITY. Without this the suite passes by iterating an empty list —
    // exactly the shape Phase 0's review rounds kept finding.
    expect(
      entries.length,
      "no dependency entries were read from any manifest; this suite would pass having asserted nothing.",
    ).toBeGreaterThan(10);
  });

  it.each(entries)(
    "%s %s.%s is an exact version",
    (path, field, name, range) => {
      if (range.startsWith("workspace:")) return; // resolved by pnpm, not by a registry range
      expect(
        EXACT.test(range),
        `${path} ${field}.${name} is "${range}". Every version in this tree is an exact pin — a range is how a transitive resolution changes underneath a passing test suite.`,
      ).toBe(true);
    },
  );
});

describe("the typescript pin honours knip's declared bound", () => {
  const root = loadJson(ROOT_PKG);
  const rootDev = (root.devDependencies ?? {}) as Record<string, string>;

  it("is exactly 5.8.3 (decision P2-D2)", () => {
    expect(
      rootDev.typescript,
      `typescript must be exactly "5.8.3": knip@5.86.0 declares \`typescript >=5.0.4 <7\` and the repo had no tsconfig at all before plan 01-02, so the downgrade could not break an existing gate.`,
    ).toBe("5.8.3");
  });

  it("satisfies >=5.0.4 <7", () => {
    const [maj, min, patch] = String(rootDev.typescript)
      .split(".")
      .map((n) => Number(n));
    expect(
      maj < 7,
      `typescript major ${maj} violates knip@5.86.0's \`<7\` bound; knip is the only mechanical enforcement of the engine boundary.`,
    ).toBe(true);
    expect(
      maj > 5 || (maj === 5 && (min > 0 || (min === 0 && patch >= 4))),
      "typescript is below knip@5.86.0's `>=5.0.4` bound.",
    ).toBe(true);
  });
});

describe("the workspace conversion did not disturb the build allowlist", () => {
  it("declares packages/*", () => {
    const packages = yamlList(workspaceText, "packages");
    expect(
      packages.length,
      `${WORKSPACE} has no \`packages:\` list. Without it pnpm treats this repo as single-package again and packages/engine stops being a real boundary.`,
    ).toBeGreaterThan(0);
    expect(
      packages,
      `${WORKSPACE} \`packages:\` must include "packages/*".`,
    ).toContain("packages/*");
  });

  it("still carries BOTH allowBuilds decisions, unchanged", () => {
    // `packages` and `allowBuilds` are INDEPENDENT controls. Phase 0 gated its
    // install set through a package-legitimacy checkpoint and recorded a
    // deliberate true/false per package; regenerating this file from a template
    // would blanket-approve sharp and silently reverse that.
    const allowBuilds = yamlBlock(workspaceText, "allowBuilds");
    expect(
      Object.keys(allowBuilds).length,
      `${WORKSPACE} has no \`allowBuilds:\` block. Adding \`packages:\` must not remove it — they are independent controls.`,
    ).toBe(2);
    expect(
      allowBuilds.esbuild,
      "allowBuilds.esbuild must stay `true`: vitest and tsup both need its platform-binary install script, and the binary is pinned in pnpm-lock.yaml.",
    ).toBe("true");
    expect(
      allowBuilds.sharp,
      "allowBuilds.sharp must stay `false`: it is transitive via @caido-community/dev for plugin ICON processing only, and Phase 0 declined it EXPLICITLY rather than ignoring it.",
    ).toBe("false");
  });

  it("both packages reached the lockfile as workspace importers", () => {
    for (const importer of ["packages/engine", "packages/backend"]) {
      expect(
        lockText.includes(`\n  ${importer}:`),
        `${LOCKFILE} has no importer for ${importer}. The workspace conversion did not take — ${REINSTALL}.`,
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// WR-21 — the tracer's own no-version-literal rule, ENFORCED
// ---------------------------------------------------------------------------
// `scripts/phase1/tracer-e2e.sh` produces this phase's citeable evidence, and its
// header states a RULE: no Caido version literal lives in that file, because decision
// P7-D5 moved `P1_EXPECT_VERSION` once already and the prose did not follow, leaving a
// reader to find one build in the comment and another in the environment — which makes
// every number in the artifact unciteable.
//
// UNTIL 2026-08-22 THE HEADER ALSO CLAIMED THE RULE WAS ENFORCED — "a `grep -c` for the
// superseded one returning zero is how that is enforced" — AND NOTHING PERFORMED THAT
// GREP. A search for the script's own name over `*.ts`, `*.mjs`, `*.sh` and `*.json`
// outside `.planning/` returned seven hits and every one was prose; the verifier
// confirmed it independently. That is worse than a stale literal, which a reader can
// SEE is stale: a claim that a check EXISTS is the claim a reader will not re-verify,
// and it sat in the file whose entire purpose is producing citeable evidence. This
// block is that check. The header now names it.
//
// COMMENT LINES ARE DELIBERATELY *NOT* FILTERED OUT, AND THAT INVERSION IS STATED HERE
// SO THE NEXT AUTHOR DOES NOT "FIX" IT. The usual hygiene for a count-based source gate
// is to strip comments first, because a mention in prose is not an execution. Here the
// rule is ABOUT THE PROSE: the defect WR-15 recorded was a comment naming a build the
// script no longer ran on. A gate that skipped comments would scan past the only place
// the bug can live and report clean forever — a green-because-it-cannot-fail gate, the
// shape this phase has already had to remove four times (T-01-34). The scan reads the
// whole file as raw text.
//
// SCOPE: `scripts/phase1/tracer-e2e.sh` ONLY, and the one nearby file that is
// deliberately outside it is `scripts/phase1/env.sh`. That file's usage example sets
// `P1_EXPECT_VERSION` on the command line, which DEMONSTRATES OVERRIDING the variable —
// the exact opposite of embedding a claim about the build a measurement was taken on —
// and it sits inside the P7-D5 block whose subject is that both builds exist and which
// is which. Widening the scan to it would delete the documentation of the rule in order
// to enforce the rule.
//
// WHAT A VERSION LITERAL IS, stated as a rule rather than as one superseded number: a
// dotted-numeric run of EXACTLY THREE components. `127.0.0.1` is four and is the
// loopback address this script cannot do without; `0.25` is two and is a sleep
// interval. Pinning the scan to one superseded literal would be a gate that goes quiet
// the day somebody pastes the CURRENT build in, which is precisely how the rule was
// broken the first time.
describe("WR-21 — the tracer's own no-version-literal rule is ENFORCED, not merely claimed", () => {
  const TRACER = "scripts/phase1/tracer-e2e.sh";
  const tracerText = readFileSync(TRACER, "utf8");

  /** Maximal dotted-numeric runs, e.g. "0.57.1", "127.0.0.1", "0.25". */
  const DOTTED_NUMERIC = /\d+(?:\.\d+)+/g;
  /** The marker that makes the scan non-vacuous: the variable the prose must cite. */
  const VERSION_VARIABLE = "P1_EXPECT_VERSION";

  it("is scanning the real script, and the script still cites the variable", () => {
    // NON-VACUITY, FIRST AND DELIBERATELY BEFORE THE RULE ITSELF. A renamed, moved
    // or emptied script would otherwise scan nothing and report clean — the failure
    // mode that makes a gate worse than no gate. Two independent facts, so neither a
    // truncation nor a rename can pass quietly.
    expect(
      tracerText.length,
      `${TRACER} read as empty. The no-version-literal scan below would pass having read nothing — restore the script or update this path.`,
    ).toBeGreaterThan(1000);
    expect(
      tracerText.includes(VERSION_VARIABLE),
      `${TRACER} no longer mentions \`${VERSION_VARIABLE}\`. Either the script moved (update TRACER here) or its version handling was rewritten — the scan below cannot be trusted until one of those is resolved.`,
    ).toBe(true);
  });

  it("names no Caido version literal anywhere, COMMENTS INCLUDED", () => {
    const hits = (tracerText.match(DOTTED_NUMERIC) ?? []).filter(
      (run) => run.split(".").length === 3,
    );
    expect(
      hits,
      `${TRACER} names version literal(s) ${hits.join(", ")}. Its header states that a literal in that file is a bug: decision P7-D5 moved \`${VERSION_VARIABLE}\` once and the prose did not follow, so a reader found one build in the comment and another in the environment and every number in the artifact became unciteable. Cite \`${VERSION_VARIABLE}\` instead — the RESOLVED value is written into every run directory as \`caido-version.txt\`, so the evidence carries the build rather than a comment claiming it.`,
    ).toEqual([]);
  });
});

describe("DET-03 — the engine declares no Caido dependency of any kind", () => {
  const engine = loadJson(ENGINE_PKG);

  it("has no @caido/* entry in any dependency field", () => {
    const names: string[] = [];
    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
    ]) {
      names.push(...Object.keys(engine[field] ?? {}));
    }
    const caido = names.filter((n) => n.startsWith("@caido/"));
    expect(
      caido,
      `${ENGINE_PKG} declares ${caido.join(", ")}. packages/engine must run under plain vitest on Node with no Caido present; move whatever needs the SDK into packages/backend.`,
    ).toEqual([]);
  });

  it("does not depend on the backend", () => {
    const deps = Object.keys(engine.dependencies ?? {});
    expect(
      deps.includes("@defminer/backend"),
      `${ENGINE_PKG} depends on @defminer/backend. The dependency edge runs backend -> engine and never the other way.`,
    ).toBe(false);
  });
});
