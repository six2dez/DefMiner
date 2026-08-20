// packages/backend/src/telemetry.spec.ts — CORE-10's unit half, plus the gate
// that keeps there being exactly ONE counter object in this plugin.
//
// The AST scan at the bottom is the important one. Plans 01-01 and 01-03 built a
// local counters object inside the hook because `telemetry.ts` did not exist
// yet; plan 01-05 REPLACED it. The failure this gate exists to prevent is the
// half-done version of that rewire — one object that is written and never read
// sitting next to another that is read and never written, with `slimStatus()`
// projecting the empty one. Every test in the repo stays green and every number
// on the RPC reads zero.
//
// It is a scan over the AST rather than a grep because the shapes that hide a
// second counters object from a regular expression are the ordinary ones: a
// multi-line object literal, a factory called from another module, a property
// whose key spans a line break.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { MAX_SYNC_SLICE_MS } from "@defminer/engine/thresholds";
import ts from "typescript";
import { beforeEach, describe, expect, it } from "vitest";

import { REJECT_REASONS } from "./hooks/admit";
import {
  counters,
  describeError,
  ERROR_TEXT_LIMIT,
  FORBIDDEN_COMPLETENESS_WORDS,
  measured,
  recordError,
  recordSlice,
  resetTelemetryForTest,
  slimStatus,
  URL_REDACTION,
  zeroedRejectCounters,
} from "./telemetry";

const BACKEND_SRC = "packages/backend/src";
const TELEMETRY_FILE = join(BACKEND_SRC, "telemetry.ts");

beforeEach(() => {
  resetTelemetryForTest();
});

// ===========================================================================
// 1. THE MAXIMUM SLICE
// ===========================================================================

describe("recordSlice keeps a running maximum", () => {
  it("starts at 0 — an unmeasured plugin reports nothing, not something", () => {
    expect(slimStatus().maxSliceMs).toBe(0);
  });

  it("records 25 exactly when given 25, and is not lowered by a subsequent 3", () => {
    recordSlice(25);
    expect(slimStatus().maxSliceMs).toBe(25);
    recordSlice(3);
    expect(
      slimStatus().maxSliceMs,
      "a shorter slice lowered the maximum. The number answers 'what is the " +
        "worst this plugin has done to the one thread'.",
    ).toBe(25);
  });

  it("stores the float EXACTLY — no rounding, no truncation, no unit conversion", () => {
    // A real `performance.now()` delta, not a tidy number. Compared with exact
    // equality on purpose: `toBeCloseTo` would pass for an implementation that
    // rounded to three places, and the whole point of CORE-10 is that the
    // recorded value is the value the pipeline computed.
    const exact = 25.0009999871253967;
    recordSlice(exact);
    expect(slimStatus().maxSliceMs).toBe(exact);
    expect(String(slimStatus().maxSliceMs)).toBe(String(exact));
  });

  it("records a slice exactly equal to MAX_SYNC_SLICE_MS as that value", () => {
    recordSlice(MAX_SYNC_SLICE_MS);
    expect(slimStatus().maxSliceMs).toBe(MAX_SYNC_SLICE_MS);
    expect(MAX_SYNC_SLICE_MS).toBe(25);
  });

  it("ignores a non-numeric value rather than poisoning the maximum with NaN", () => {
    recordSlice(12);
    recordSlice(Number.NaN);
    expect(
      slimStatus().maxSliceMs,
      "NaN reached the maximum. Every later comparison against it is false, so " +
        "the number would freeze at NaN for the rest of the plugin's life.",
    ).toBe(12);
  });
});

// ===========================================================================
// 2. THE REJECT COUNTERS ARE DERIVED, NOT LISTED
// ===========================================================================

describe("reject counters", () => {
  it("have exactly the keys of the reject-reason union", () => {
    expect(Object.keys(counters.rejected).sort()).toEqual(
      [...REJECT_REASONS].sort(),
    );
  });

  it("all start at 0", () => {
    for (const r of REJECT_REASONS) {
      expect(counters.rejected[r], "rejected." + r).toBe(0);
    }
  });

  it("acquire a counter for a NEW reason automatically — the failing path, executed", () => {
    // The claim is that the counters are DERIVED from the list rather than
    // hand-maintained beside it. Run the derivation against a synthetic union
    // with one extra member and watch the counter appear.
    const withNew = zeroedRejectCounters([...REJECT_REASONS, "brand_new"]);
    expect(withNew.brand_new).toBe(0);
    expect(Object.keys(withNew).length).toBe(REJECT_REASONS.length + 1);

    // And the shipped object is the derivation over the REAL list, so a reason
    // added to `admit.ts` with no counter is not expressible.
    expect(Object.keys(counters.rejected).sort()).toEqual(
      Object.keys(zeroedRejectCounters(REJECT_REASONS)).sort(),
    );
  });
});

// ===========================================================================
// 3. THE PROJECTION — T-01-26
// ===========================================================================

/** Every (path, value) pair in an object, recursively. */
function walkValues(
  value: unknown,
  path = "$",
  out: Array<{ path: string; value: unknown }> = [],
): Array<{ path: string; value: unknown }> {
  out.push({ path, value });
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkValues(v, path + "." + k, out);
    }
  }
  return out;
}

/** Every KEY in an object, recursively. */
function walkKeys(value: unknown, out: string[] = []): string[] {
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out.push(k);
      walkKeys(v, out);
    }
  }
  return out;
}

/** Split an identifier into lowercase words across camelCase and snake_case.
 *
 *  WORDS, not substrings: a substring rule fires on the first innocent
 *  identifier containing "all", and a gate that cries wolf gets deleted. */
function words(identifier: string): string[] {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+|\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.toLowerCase());
}

describe("slimStatus is a PROJECTION, not a window onto internal state", () => {
  it("carries no string that parses as a URL", () => {
    recordError(
      new Error(
        "failed loading https://victim.example/private/app.js?token=secret",
      ),
    );
    recordSlice(4);

    // The error text is the ONE string this projection carries, and the case
    // above deliberately put a URL inside it — so this assertion is about what
    // the projection does with hostile input, not about a happy path.
    const urls = walkValues(slimStatus())
      .filter((e) => typeof e.value === "string")
      .filter((e) => /https?:\/\//i.test(e.value as string));
    expect(
      urls,
      "a URL survived into the getStatus projection. This RPC is the only " +
        "channel by which internal state leaves the plugin in Phase 1 " +
        "(T-01-26), and a URL is target data — often with a session token in " +
        "the query, as the fixture above has.",
    ).toEqual([]);
    // Non-vacuity: the redaction happened rather than the message vanishing.
    expect(slimStatus().lastError).toContain(URL_REDACTION);
    expect(slimStatus().lastError).not.toContain("victim.example");
    expect(slimStatus().lastError).not.toContain("token=secret");
  });

  it("redacts the URL before truncating, so no host survives in the front half", () => {
    // Truncating first would leave `https://victim.example/very/long/...` intact
    // up to the limit — and the front half is the half carrying the host.
    recordError(
      new Error(
        "write failed for https://victim.example/a.js " + "z".repeat(9_000),
      ),
    );
    expect(slimStatus().lastError).not.toContain("victim.example");
    expect(slimStatus().lastError).toContain(URL_REDACTION);
  });

  it("carries no value longer than the documented truncation limit", () => {
    recordError(new Error("x".repeat(5_000)));
    const long = walkValues(slimStatus())
      .filter((e) => typeof e.value === "string")
      .filter((e) => (e.value as string).length > ERROR_TEXT_LIMIT);
    expect(
      long.map((e) => e.path + " (" + String((e.value as string).length) + ")"),
      "a string longer than ERROR_TEXT_LIMIT crossed the RPC boundary. An " +
        "untruncated String(e) can carry a response-body fragment with it.",
    ).toEqual([]);
  });

  it("carries only numbers besides the one error string", () => {
    recordSlice(9);
    recordError(new TypeError("boom"));
    const bad = walkValues(slimStatus())
      .filter((e) => e.path !== "$" && e.path !== "$.counters")
      .filter((e) => e.path !== "$.counters.rejected")
      .filter((e) => typeof e.value !== "number")
      .filter((e) => e.path !== "$.lastError");
    expect(
      bad.map((e) => e.path),
      "the projection carries a value that is neither a count nor the error " +
        "string. Anything else is a payload.",
    ).toEqual([]);
  });

  it("is a COPY — mutating what getStatus returned cannot reach the counters", () => {
    const projected = slimStatus();
    projected.counters.processed = 9_999;
    projected.counters.rejected.status = 9_999;
    expect(counters.processed).toBe(0);
    expect(counters.rejected.status).toBe(0);
  });

  it("carries every counter, because it spreads rather than hand-listing", () => {
    // A hand-listed projection silently stops carrying a counter somebody adds
    // later, and a counter nobody can see is the same as no counter.
    expect(Object.keys(slimStatus().counters).sort()).toEqual(
      Object.keys(counters).sort(),
    );
  });
});

// ===========================================================================
// 4. NO NAME MAY ASSERT COMPLETENESS — decision P5-D1
// ===========================================================================

describe("no identifier in the projection claims completeness", () => {
  it("has a non-empty forbidden-word list", () => {
    // Asserted because a gate over an empty list passes vacuously and reads
    // exactly like one that works.
    expect(FORBIDDEN_COMPLETENESS_WORDS.length).toBeGreaterThan(0);
    expect([...FORBIDDEN_COMPLETENESS_WORDS]).toContain("all");
    expect([...FORBIDDEN_COMPLETENESS_WORDS]).toContain("complete");
  });

  it("uses no forbidden word in any key", () => {
    recordSlice(1);
    recordError(new Error("nope"));
    const offenders: string[] = [];
    for (const key of walkKeys(slimStatus())) {
      for (const w of words(key)) {
        if ((FORBIDDEN_COMPLETENESS_WORDS as readonly string[]).includes(w)) {
          offenders.push(key + " contains the word '" + w + "'");
        }
      }
    }
    expect(
      offenders,
      "a counter or RPC field is named in a way that implies DefMiner has seen " +
        "everything on a target. It has not and structurally cannot: only " +
        "proxied traffic reaches the hook (SURFACES_FIRING_INTERCEPT = 'proxy') " +
        "and a browser-cache hit never enters Caido at all " +
        "(CACHED_RESPONSES_REACH_HOOK = false). Counters are named for PROXIED " +
        "RESPONSES OBSERVED (decision P5-D1).",
    ).toEqual([]);
  });

  it("splits identifiers into WORDS, so an innocent substring is not a false positive", () => {
    // The rule's own failing and passing paths, both executed.
    expect(words("proxiedResponsesObserved")).toEqual([
      "proxied",
      "responses",
      "observed",
    ]);
    expect(words("out_of_scope")).toEqual(["out", "of", "scope"]);
    expect(words("totalResponses")).toContain("total");
    expect(words("smallBodies")).not.toContain("all");
  });

  it("names the primary counter for what the hook was HANDED", () => {
    expect(Object.keys(counters)).toContain("proxiedResponsesObserved");
  });
});

// ===========================================================================
// 5. ERRORS KEEP THEIR CLASS NAME
// ===========================================================================

describe("measured", () => {
  it("returns the value and reports ok on the happy path", () => {
    const m = measured("ok", () => 41 + 1);
    expect(m.ok).toBe(true);
    expect(m.out).toBe(42);
    expect(m.err).toBeNull();
    expect(m.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("never lets fn throw past, and keeps the error's CONSTRUCTOR NAME", () => {
    const m = measured("boom", () => {
      throw new RangeError("out of range");
    });
    expect(m.ok).toBe(false);
    expect(m.out).toBeNull();
    expect(
      m.err,
      "a bare String(e) loses the constructor name, and the class name is " +
        "usually the whole diagnosis — a TypeError and a RangeError from the " +
        "same line mean completely different things.",
    ).toMatch(/^RangeError/);
    expect(slimStatus().lastError).toMatch(/^RangeError/);
  });

  it("truncates the captured error", () => {
    const m = measured("long", () => {
      throw new Error("y".repeat(9_000));
    });
    expect(m.err?.length).toBe(ERROR_TEXT_LIMIT);
  });

  it("renders a thrown non-Error without inventing a class name", () => {
    const m = measured("string-throw", () => {
      // A bare string throw is DELIBERATE here. Plugin code cannot control what
      // the SDK or a driver throws, and `describeError` has to render a
      // non-Error without inventing a class name for it. The rule is right
      // about production code and wrong about this fixture.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "just a string";
    });
    expect(m.err).toBe("just a string");
  });

  it("carries BOTH clocks — elapsed monotonic, timestamps wall-clock", () => {
    const before = Date.now();
    const m = measured("clocks", () => 1);
    const after = Date.now();
    expect(m.startedAt).toBeGreaterThanOrEqual(before);
    expect(m.finishedAt).toBeLessThanOrEqual(after);
    // `performance.timeOrigin` is not a Unix epoch on this build, so an elapsed
    // figure must never be usable as a timestamp.
    expect(m.elapsedMs).toBeLessThan(m.startedAt);
  });
});

describe("describeError", () => {
  it("does not double the class name when String(e) already carries it", () => {
    expect(describeError(new TypeError("nope"))).toBe("TypeError: nope");
  });

  it("handles null and undefined without throwing", () => {
    expect(describeError(null)).toBe("null");
    expect(describeError(undefined)).toBe("undefined");
  });
});

// ===========================================================================
// 6. THE PHASE 2 SEAM IS LEFT OPEN, NOT FILLED
// ===========================================================================

describe("telemetry.ts stops where Phase 2 begins", () => {
  const src = readFileSync(TELEMETRY_FILE, "utf8");

  it("exposes no health surface, no vocabulary and no export function", () => {
    const exported = [
      ...src.matchAll(/^export (?:function|const|type) (\w+)/gm),
    ]
      .map((m) => m[1])
      .sort();
    const forbidden = exported.filter((name) =>
      /^(health|getHealth|degrad|exportDiagnostics|toDiagnostics|diagnostics|vocabulary)/i.test(
        name,
      ),
    );
    expect(
      forbidden,
      "OBS-01 (health surface), OBS-02 (degradation vocabulary) and OBS-03 " +
        "(diagnostics export) are Phase 2's. Phase 1's obligation is only that " +
        "the counters EXIST and are REACHABLE.",
    ).toEqual([]);
    // Non-vacuity: the scan found something to look at.
    expect(exported).toContain("recordSlice");
    expect(exported).toContain("slimStatus");
  });
});

// ===========================================================================
// 7. EXACTLY ONE COUNTERS OBJECT — the AST scan
// ===========================================================================

/** Every non-generated `.ts` file under `packages/backend/src`, specs included.
 *
 *  Specs are IN SCOPE deliberately: a spec that builds its own counters object
 *  is the easiest place for the second one to reappear, and it would be just as
 *  misleading — the spec would assert against an object production never
 *  touches. */
function backendTsFiles(dir = BACKEND_SRC, out: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) backendTsFiles(full, out);
    else if (name.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** The canonical counter key set, taken from the live object rather than
 *  re-typed — so a counter added tomorrow strengthens this gate for free. */
const COUNTER_KEYS = new Set(Object.keys(counters));
/** How many canonical keys an object literal needs before it IS a counter set.
 *  Three, not one: `{ processed: 0 }` alone is an ordinary object. */
const COUNTER_LITERAL_THRESHOLD = 3;

type Finding = { file: string; line: number; what: string };

function scanFile(file: string): Finding[] {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const found: Finding[] = [];
  const at = (node: ts.Node): number =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const visit = (node: ts.Node): void => {
    // RULE A — a binding literally called `counters`. After the rewire the only
    // one is telemetry.ts's export; `import { counters }` is an ImportSpecifier,
    // not a VariableDeclaration, so re-using the name by importing it is fine.
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "counters"
    ) {
      found.push({
        file,
        line: at(node),
        what: "declares a `counters` binding",
      });
    }

    // RULE B — an object literal SHAPED like a counter set, whatever it is
    // called. This is what catches a second object introduced under another
    // name, which is the realistic way the rewire goes half-done.
    if (ts.isObjectLiteralExpression(node)) {
      let hits = 0;
      for (const prop of node.properties) {
        const name = prop.name;
        if (name === undefined) continue;
        const text = ts.isIdentifier(name)
          ? name.text
          : ts.isStringLiteral(name)
            ? name.text
            : "";
        if (COUNTER_KEYS.has(text)) hits += 1;
      }
      if (hits >= COUNTER_LITERAL_THRESHOLD) {
        found.push({
          file,
          line: at(node),
          what:
            "an object literal with " +
            String(hits) +
            " canonical counter keys",
        });
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

describe("there is exactly ONE counters object in packages/backend", () => {
  const files = backendTsFiles();
  const findings = files.flatMap(scanFile);

  it("scans a non-empty set of files, telemetry.ts among them", () => {
    expect(files.length).toBeGreaterThan(5);
    expect(files).toContain(TELEMETRY_FILE);
  });

  it("finds the counters binding only in telemetry.ts", () => {
    const bindings = findings.filter((f) => f.what.includes("binding"));
    expect(
      bindings.map((f) => f.file + ":" + String(f.line)),
      "the local counters object plans 01-01 and 01-03 created must be GONE, " +
        "not shadowed. Two objects means one is written and never read while " +
        "the other is read and never written, and slimStatus() projects the " +
        "empty one — green everywhere, zero on the RPC.",
    ).toEqual([TELEMETRY_FILE + ":" + String(bindings[0]?.line ?? 0)]);
    expect(bindings.length).toBe(1);
  });

  it("finds a counter-shaped object literal only in telemetry.ts", () => {
    const literals = findings.filter((f) => f.what.includes("literal"));
    expect(literals.length).toBe(1);
    expect(literals[0].file).toBe(TELEMETRY_FILE);
  });

  it("would flag a second object — the failing path, executed", () => {
    // The gate's own failure mode, run against a synthetic file rather than
    // asserted. A gate whose failing path has never run is a gate nobody has
    // tested, and this one guards the single highest-risk change in the plan.
    const keys = [...COUNTER_KEYS].slice(0, COUNTER_LITERAL_THRESHOLD);
    const synthetic =
      "const shadow = {\n" +
      keys.map((k) => "  " + k + ": 0,").join("\n") +
      "\n};\nconst counters = shadow;\n";
    const sf = ts.createSourceFile(
      "synthetic.ts",
      synthetic,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    let literals = 0;
    let bindings = 0;
    const visit = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === "counters"
      ) {
        bindings += 1;
      }
      if (ts.isObjectLiteralExpression(node)) {
        const hits = node.properties.filter(
          (p) =>
            p.name !== undefined &&
            ts.isIdentifier(p.name) &&
            COUNTER_KEYS.has(p.name.text),
        ).length;
        if (hits >= COUNTER_LITERAL_THRESHOLD) literals += 1;
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    expect(literals).toBe(1);
    expect(bindings).toBe(1);
  });

  it("proves recordSlice has a call site OUTSIDE telemetry.ts", () => {
    const callers = backendTsFiles()
      .filter((f) => f !== TELEMETRY_FILE && !f.endsWith(".spec.ts"))
      .filter((f) => /\brecordSlice\s*\(/.test(readFileSync(f, "utf8")));
    expect(
      callers,
      "recordSlice is called by nothing in production. getStatus().maxSliceMs " +
        "would stay 0 for ever, and tests/phase1-load.spec.ts treats a 0 as an " +
        "instrument failure — discovered after a live Caido run and a " +
        "200-chunk load, the most expensive moment in the phase.",
    ).toContain(join(BACKEND_SRC, "ingest", "consumer.ts"));
  });
});
