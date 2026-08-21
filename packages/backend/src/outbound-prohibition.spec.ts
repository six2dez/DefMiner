// packages/backend/src/outbound-prohibition.spec.ts — CORE-01's wired gate.
//
// THE RULE: no non-spec module under `packages/backend/src` may reach an outbound
// network surface. There are four of them and CORE-01's statement covers all four
// in one breath — "no caido:http fetch, no sdk.requests.send, no sdk.net.connect,
// no global fetch, no speculative retrieval of any kind".
//
// WHY THIS NEEDS A GATE AT ALL, when the phase ships no outbound call today.
// Three facts measured in Phase 0 make a regression here worse than it sounds:
//
//   SURFACES_FIRING_INTERCEPT = "proxy" — plugin-originated sends do NOT come
//     back through `onInterceptResponse`. Traffic this plugin generated would be
//     invisible to this plugin: there is no counter anywhere that would move.
//   `sdk.requests.send()` does not re-fire the hook under any save/plugins
//     combination, so there is no self-observation to fall back on either.
//   caido/caido#2211 was filed against 0.57.1 — the exact target build — and
//     cumulative sends can abort `caido-cli`, taking the operator's real project
//     data with it.
//
// So the failure is SILENT in the tool whose entire pitch to the operator is that
// it is passive. Reading the SOURCE catches every call site including the ones
// written next year, which is the argument `store/sql-discipline.spec.ts` makes
// for itself and the reason this file copies its SHAPE — a pure
// `auditSource(file, source)`, a named non-vacuity assertion, and every rule's
// failing path executed against an inline fixture — rather than its rules.
//
// ===========================================================================
// WHY AN AST WALK AND NOT A TEXT SCAN, AND IT IS LOAD-BEARING HERE
// ===========================================================================
// `packages/backend/src/telemetry.ts` NAMES `caido:http` in its header comment,
// in the paragraph explaining why the plugin's coverage is structurally partial.
// A substring scan would fail on that documentation and the only way to make it
// pass would be deleting the reasoning — which is precisely backwards. It is
// asserted below as its own case, the same way `hooks/admit.spec.ts` asserts it
// for `toRaw()`/`toText()`. A regex also misses a template that spans a line
// break, an `export ... from`, and any call whose receiver is on the previous
// line: the three shapes prettier is most likely to produce in this package.
//
// ===========================================================================
// WHAT THIS GATE IS NOT: `scripts/ci/check-bundle-imports.mjs`
// ===========================================================================
// That gate answers a DIFFERENT question — which specifiers Caido's QuickJS was
// MEASURED to resolve — and `caido:http` is on its allowlist because the Phase 0
// probe loaded it successfully. It is deliberately left alone: removing an entry
// would quietly redefine it from "measured loadable" to "permitted". The bundle
// gate bounds what can LOAD; this one bounds what the source may CALL. They
// coexist, and the asymmetry is why this one has to exist at all —
// `sdk.requests.send` needs no import, so no bundle gate can ever see it.
//
// ===========================================================================
// THREE BOUNDARIES, STATED RATHER THAN LEFT TO BE DISCOVERED
// ===========================================================================
// 1. IT SKIPS `.spec.ts`. That is what lets this file's own fixtures — which
//    necessarily contain the forbidden shapes as source text — live inline with
//    no temp file and no stray module for `tsc --build` to trip over. It costs
//    something real: a spec file could call an outbound surface unnoticed. That
//    residual is bounded by `pnpm check:bundle`, which reports the shipped
//    bundle's entire import set (one specifier, `crypto`) and which specs never
//    enter.
// 2. SCOPE HANDLING IS SHALLOW, and saying so matters more than the gap does.
//    The walk does not build a symbol table, so an alias rebound in an inner
//    scope is outside its reach — the same bound `consumer.spec.ts`'s CORE-05
//    audit works within. Claiming a precision the walk does not have is worse
//    than the gap, because it gets trusted.
// 3. `backendFiles()` below duplicates `store/sql-discipline.spec.ts`'s private
//    walk by about fifteen lines, DELIBERATELY. Exporting one gate's internals
//    into another means one gate's refactor can silently change the other's
//    scope; the named non-vacuity assertion is the real protection against a
//    walk that shrinks.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const BACKEND_SRC = "packages/backend/src";

// The four surfaces, as tokens the walk matches on, so the data table below and
// the walk cannot drift apart.
const SEND_RECEIVER = "requests";
const SEND_METHOD = "send";
const NET_RECEIVER = "net";
const FETCH_GLOBAL = "fetch";
const HTTP_SPECIFIER = "caido:http";

const RECEIVERS = new Set<string>([SEND_RECEIVER, NET_RECEIVER]);

/**
 * The rule set as DATA a reader can enumerate rather than logic they must trace.
 *
 * A fifth outbound surface discovered in a later phase is one entry here plus one
 * branch in the walk, and the `why` travels with it into the failure message —
 * which is the difference between a gate that explains itself at 2am and a bare
 * rule id.
 */
export const FORBIDDEN_OUTBOUND = Object.freeze([
  Object.freeze({
    rule: "outbound-send",
    surface: `sdk.${SEND_RECEIVER}.${SEND_METHOD}`,
    why:
      "plugin-originated traffic does not come back through onInterceptResponse " +
      '(SURFACES_FIRING_INTERCEPT = "proxy"), so a leak would move no counter in this ' +
      "plugin and leave no trace in its own telemetry; and caido/caido#2211, filed " +
      "against 0.57.1, means cumulative sends can abort caido-cli with the operator's " +
      "project data. Active retrieval is Phase 8 (ACTIVE-*) and it arrives with the send " +
      "counter and the write-ahead journal Phase 0 built for it — not by someone adding a call.",
  }),
  Object.freeze({
    rule: "outbound-net",
    surface: `sdk.${NET_RECEIVER}.*`,
    why:
      "a raw outbound connection is outbound traffic by any definition and is invisible " +
      "to this plugin's own counters for the same measured reason. COVERAGE.md row 27 " +
      "places it under the same prohibition as sdk.requests.send.",
  }),
  Object.freeze({
    rule: "outbound-fetch",
    surface: `the global ${FETCH_GLOBAL}()`,
    why:
      "the global fetch reaches any host, including one that is not the target at all. " +
      "The operator authorised a PASSIVE observer; this is a boundary they were told " +
      "does not exist. COVERAGE.md row 38 places it under the same prohibition.",
  }),
  Object.freeze({
    rule: "outbound-import",
    surface: `an import of "${HTTP_SPECIFIER}"`,
    why:
      "caido:http loads successfully inside Caido, and the DIST-05 bundle allowlist " +
      "admits it because Phase 0 MEASURED it loadable — a different question from " +
      "whether it is permitted. Phase 0 also measured that traffic it issues delivers " +
      "nothing back to onInterceptResponse.",
  }),
]);

type Violation = { file: string; rule: string; detail: string };

/**
 * Every non-spec module in the BACKEND PACKAGE, at any depth.
 *
 * The package, not a directory: `sdk.requests.send` needs no import, so the
 * surface it could appear on is every module the plugin ships, and `hooks/` and
 * `ingest/` are where a regression would most plausibly land.
 */
function backendFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".spec.ts")
      ) {
        out.push(full);
      }
    }
  };
  walk(BACKEND_SRC);
  return out.sort();
}

/**
 * Audit one source file.
 *
 * PURE — takes text, returns findings — which is what makes every fixture below
 * possible without touching the filesystem, and what lets the failing path of
 * every rule actually RUN. A gate whose failure path has never run is a gate
 * nobody has tested, and this phase has been bitten by exactly that four times.
 */
export function auditSource(file: string, source: string): Violation[] {
  const violations: Violation[] = [];

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const visit = (node: ts.Node): void => {
    // RED: no rule is implemented yet. Every firing case below must fail.
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return violations;
}

// ---------------------------------------------------------------------------
// THE REAL TREE
// ---------------------------------------------------------------------------
describe("CORE-01 — no outbound surface is reachable from packages/backend/src", () => {
  const files = backendFiles();

  it("enumerates a NON-EMPTY set of backend modules, BY NAME", () => {
    // Without this the whole gate passes by measuring nothing. Names rather than
    // a count, so a rename or a moved directory is a VISIBLE change instead of a
    // silently shrunk scanned set.
    expect(
      files.length,
      `no .ts modules found under ${BACKEND_SRC}`,
    ).toBeGreaterThan(0);
    for (const expected of [
      "index.ts",
      "lifecycle.ts",
      "telemetry.ts",
      "compat.ts",
      "hooks/admit.ts",
      "hooks/passive.ts",
      "ingest/consumer.ts",
      "store/observations.ts",
      "store/retention.ts",
    ]) {
      expect(
        files.some((f) => f.endsWith(`/${expected}`)),
        `${expected} is not being audited`,
      ).toBe(true);
    }
  });

  it("the walk really DESCENDED into subdirectories", () => {
    // A non-recursive read would enumerate index.ts, lifecycle.ts, telemetry.ts
    // and compat.ts and pass every rule below having never opened the hook, the
    // consumer or the store.
    const relative = files.map((f) => f.slice(BACKEND_SRC.length + 1));
    expect(
      relative.filter((r) => r.includes("/")),
      "no enumerated path contains a directory separator, so the walk is flat",
    ).not.toEqual([]);
  });

  it.each(backendFiles())("%s reaches no outbound surface", (file) => {
    const violations = auditSource(file, readFileSync(file, "utf8"));
    expect(
      violations.map((v) => `${v.rule}: ${v.detail}`),
      `${file} reaches an outbound network surface, which CORE-01 forbids`,
    ).toEqual([]);
  });

  it("telemetry.ts NAMES caido:http in prose and still reports clean", () => {
    // The documentation hazard, live and asserted on the real file. If the header
    // is ever reworded this fails loudly rather than leaving a case that proves
    // nothing — the same reason sql-discipline.spec.ts asserts its PRAGMA
    // exemption is still exercised.
    const file = join(BACKEND_SRC, "telemetry.ts");
    const source = readFileSync(file, "utf8");
    expect(
      source,
      "telemetry.ts no longer names caido:http, so the AST-vs-text case below is vacuous",
    ).toContain(HTTP_SPECIFIER);
    expect(auditSource(file, source)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EVERY RULE'S FAILING PATH, EXECUTED — plus the legal shape it must stay quiet on
// ---------------------------------------------------------------------------
describe("the gate's own failure paths", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  // --- outbound-send -------------------------------------------------------

  it("outbound-send fires on the direct call", () => {
    expect(rulesOf("await sdk.requests.send(req);")).toContain("outbound-send");
  });

  it("outbound-send fires on the element-access form", () => {
    // `sdk.requests["send"](req)` is the same call and the obvious way around a
    // rule that only matched a property access.
    expect(rulesOf('await sdk.requests["send"](req);')).toContain(
      "outbound-send",
    );
  });

  it("outbound-send fires through a RECEIVER ALIAS", () => {
    expect(
      rulesOf("const r = sdk.requests;\nawait r.send(req);"),
    ).toContain("outbound-send");
  });

  it("outbound-send fires on a DESTRUCTURED method", () => {
    expect(
      rulesOf("const { send } = sdk.requests;\nawait send(req);"),
    ).toContain("outbound-send");
    // …including the renamed form, which is the same lift with a different label.
    expect(
      rulesOf("const { send: go } = sdk.requests;\nawait go(req);"),
    ).toContain("outbound-send");
  });

  it("outbound-send does NOT fire on sdk.requests.get — the reload the consumer depends on", () => {
    // THE most important false positive to rule out. A gate that broke the CORE-05
    // reload path would be reverted within the hour, and rightly.
    expect(rulesOf("const rr = await sdk.requests.get(id);")).toEqual([]);
  });

  it("outbound-send does NOT fire on other requests methods, or on a send elsewhere", () => {
    expect(rulesOf("await sdk.requests.query();")).toEqual([]);
    expect(rulesOf("await sdk.requests.inScope(request);")).toEqual([]);
    // `send` on an unrelated receiver is not an outbound surface at all.
    expect(rulesOf("logger.send(line);")).toEqual([]);
    expect(rulesOf("const { send } = logger;\nsend(line);")).toEqual([]);
  });

  // --- outbound-net --------------------------------------------------------

  it("outbound-net fires on sdk.net.connect and on any other method of that receiver", () => {
    expect(rulesOf("await sdk.net.connect(host, port);")).toContain(
      "outbound-net",
    );
    expect(rulesOf("await sdk.net.somethingElse(host);")).toContain(
      "outbound-net",
    );
    expect(rulesOf("const n = sdk.net;\nawait n.connect(host, port);")).toContain(
      "outbound-net",
    );
  });

  it("outbound-net does NOT fire on an identifier merely NAMED net", () => {
    expect(
      rulesOf("const net = { port: 443 };\nreturn net.port;"),
    ).toEqual([]);
  });

  // --- outbound-fetch ------------------------------------------------------

  it("outbound-fetch fires on a call to the bare global", () => {
    expect(rulesOf("const res = await fetch(url);")).toContain(
      "outbound-fetch",
    );
  });

  it("outbound-fetch does NOT fire on a fetch METHOD of some object", () => {
    // `cache.fetch(url)` is a method on an object, not the global, and reaches
    // nothing outside the process.
    expect(rulesOf("const res = await cache.fetch(url);")).toEqual([]);
  });

  // --- outbound-import -----------------------------------------------------

  it("outbound-import fires on all four specifier forms", () => {
    expect(rulesOf('import { fetch } from "caido:http";')).toContain(
      "outbound-import",
    );
    expect(rulesOf('export { fetch } from "caido:http";')).toContain(
      "outbound-import",
    );
    expect(rulesOf('const m = await import("caido:http");')).toContain(
      "outbound-import",
    );
    expect(rulesOf('const m = require("caido:http");')).toContain(
      "outbound-import",
    );
  });

  it("outbound-import does NOT fire on any other specifier, crypto included", () => {
    expect(rulesOf('import { createHash } from "crypto";')).toEqual([]);
    expect(rulesOf('export { x } from "./telemetry";')).toEqual([]);
    expect(rulesOf('const m = await import("node:fs");')).toEqual([]);
    expect(rulesOf('const m = require("sqlite");')).toEqual([]);
  });

  // --- the documentation case ----------------------------------------------

  it("a file that DISCUSSES the forbidden surfaces in comments yields ZERO violations", () => {
    // The case that would have caught the mistake. This is what proves the gate
    // reads the AST and not the text, and it is why telemetry.ts can keep the
    // paragraph explaining the prohibition.
    const documented = [
      "// This module deliberately does NOT import caido:http and does NOT call",
      "// sdk.requests.send(request) — see CORE-01 and the header of telemetry.ts.",
      "/*",
      " * Historical note: an earlier draft called sdk.requests.send(req), reached",
      ' * sdk.net.connect(host, port), used fetch(url), and imported "caido:http".',
      " * Every one of those was removed before the phase shipped.",
      " */",
      "export const passive = true;",
    ].join("\n");
    expect(auditSource("documented.ts", documented)).toEqual([]);
  });

  // --- the failure message -------------------------------------------------

  it("a violation names the file, the surface and WHY, not a bare rule id", () => {
    const [v] = auditSource(
      "packages/backend/src/hooks/passive.ts",
      "await sdk.requests.send(req);",
    );
    expect(v).toBeDefined();
    expect(v.file).toBe("passive.ts");
    expect(v.detail).toContain("packages/backend/src/hooks/passive.ts");
    expect(v.detail).toContain("sdk.requests.send");
    expect(v.detail).toContain("onInterceptResponse");
  });
});

describe("the rule set is data, not logic to trace", () => {
  it("FORBIDDEN_OUTBOUND enumerates exactly the four surfaces CORE-01 names", () => {
    expect(FORBIDDEN_OUTBOUND.map((f) => f.rule)).toEqual([
      "outbound-send",
      "outbound-net",
      "outbound-fetch",
      "outbound-import",
    ]);
    // Every entry carries a consequence, because that is what the failure text is
    // built from. An entry with an empty `why` would produce a bare rule id.
    for (const f of FORBIDDEN_OUTBOUND) {
      expect(f.why.length, `${f.rule} carries no reason`).toBeGreaterThan(40);
      expect(f.surface.length).toBeGreaterThan(0);
    }
  });
});
