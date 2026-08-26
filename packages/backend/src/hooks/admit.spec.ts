// packages/backend/src/hooks/admit.spec.ts — CORE-02's gate, one case per reason.
//
// The table below is the whole point. A gate with six rejection reasons and four
// spot-checks looks tested and is not: the reasons that go untested are exactly
// the ones whose counters read zero forever because nothing can reach them. So
// the cases are driven from a table, and the LAST test in this file compares the
// set of reasons that table exercises against `REJECT_REASONS` — a seventh reason
// added to the union with no case fails here rather than in production.

import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { PASSIVE_MAX_BYTES } from "@defminer/engine/thresholds";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  makeFake304,
  makeFakeRequest,
  makeFakeResponse,
  makeFakeSdk,
} from "../../test/fixtures/fake-sdk";

import {
  admit,
  type AdmitResult,
  contentTypeOf,
  DEFAULT_ADMIT_CONFIG,
  isScriptish,
  KIND_JS,
  REJECT_REASONS,
  type RejectReason,
} from "./admit";

type Case = {
  name: string;
  /** `null` when the case is an accept. */
  reason: RejectReason | null;
  run: () => AdmitResult;
};

const JS_URL = "https://example.test/static/app.js";

/** The boring accept, with one thing changed per case. */
function call(
  opts: {
    code?: number;
    headers?: Record<string, string | string[]>;
    bodyBytes?: Uint8Array | string;
    bodyLength?: number;
    noBody?: boolean;
    url?: string;
    inScope?: boolean;
    response?: ReturnType<typeof makeFakeResponse>;
  } = {},
): AdmitResult {
  const sdk = makeFakeSdk({
    inScope: () => (opts.inScope === undefined ? true : opts.inScope),
  });
  const request = makeFakeRequest({ url: opts.url ?? JS_URL });
  const response =
    opts.response ??
    makeFakeResponse({
      code: opts.code,
      headers: opts.headers,
      bodyBytes: opts.bodyBytes,
      bodyLength: opts.bodyLength,
      noBody: opts.noBody,
    });
  return admit(sdk, request, response, DEFAULT_ADMIT_CONFIG);
}

const CASES: Case[] = [
  // --- accepts --------------------------------------------------------------
  {
    name: "a 200 JavaScript response with a lowercase content-type",
    reason: null,
    run: () =>
      call({ headers: { "content-type": ["application/javascript"] } }),
  },
  {
    name: "the same response with the ALTERNATE header casing",
    reason: null,
    run: () =>
      call({ headers: { "Content-Type": ["application/javascript"] } }),
  },
  {
    name: "the same response with a BARE STRING header value, not an array",
    reason: null,
    // The SDK types headers as Record<string, Array<string>>; the production
    // recorder found both shapes in the field. Both were observed, so both are
    // covered.
    run: () => call({ headers: { "content-type": "application/javascript" } }),
  },
  {
    name: "a .js URL carrying a cache-busting query, with no content-type at all",
    reason: null,
    run: () =>
      call({ headers: {}, url: "https://example.test/app.js?v=8c1f2a" }),
  },
  {
    name: "a .mjs URL with a fragment and a query",
    reason: null,
    run: () =>
      call({ headers: {}, url: "https://example.test/m.mjs?a=1#frag" }),
  },
  {
    name: "a body of EXACTLY PASSIVE_MAX_BYTES",
    reason: null,
    run: () => call({ bodyLength: PASSIVE_MAX_BYTES }),
  },

  // --- one case per reason --------------------------------------------------
  {
    name: "a 304 carrying NO content-type header — its own reason, not a kind miss",
    reason: "revalidation",
    run: () => call({ response: makeFake304() }),
  },
  {
    name: "a 500",
    reason: "status",
    run: () => call({ code: 500 }),
  },
  {
    name: "a 302 redirect",
    reason: "status",
    run: () => call({ code: 302 }),
  },
  {
    name: "a 200 with no body at all",
    reason: "empty",
    run: () => call({ noBody: true }),
  },
  {
    name: "a 200 with a zero-length body",
    reason: "empty",
    run: () => call({ bodyBytes: new Uint8Array(0) }),
  },
  {
    name: "a body one byte above PASSIVE_MAX_BYTES",
    reason: "too_large",
    run: () => call({ bodyLength: PASSIVE_MAX_BYTES + 1 }),
  },
  {
    name: "an HTML response at a URL with no script extension",
    reason: "not_scriptish",
    run: () =>
      call({
        headers: { "content-type": ["text/html; charset=utf-8"] },
        url: "https://example.test/index.html",
      }),
  },
  {
    name: "a JavaScript response the operator's scope excludes",
    reason: "out_of_scope",
    run: () => call({ inScope: false }),
  },
];

describe("admit — one case per outcome", () => {
  it.each(CASES.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const result = c.run();
    if (c.reason === null) {
      expect(
        result,
        `expected an accept, got ${JSON.stringify(result)}`,
      ).toMatchObject({ ok: true, kind: KIND_JS });
      if (result.ok) expect(result.bytes).toBeGreaterThan(0);
      return;
    }
    expect(result.ok, `expected a reject, got ${JSON.stringify(result)}`).toBe(
      false,
    );
    if (!result.ok) expect(result.reason).toBe(c.reason);
  });
});

describe("the 304 axis ordering (decision P3-D2)", () => {
  it("a 304 is `revalidation` and NOT `not_scriptish`", () => {
    // It fails status, size AND kind simultaneously — zero-length body, no
    // content-type, non-2xx status — so only a status-first ordering can give it
    // an honest reason. Folding it into the content-type miss would make a
    // revalidation of a bundle we already know indistinguishable from a
    // stylesheet, and that count is what Phase 6's retroactive scanner works from.
    const result = call({ response: makeFake304() });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("revalidation");
      expect(result.reason).not.toBe("not_scriptish");
      expect(result.reason).not.toBe("empty");
      expect(result.reason).not.toBe("status");
    }
  });

  it("a 304 at a .js URL is STILL revalidation", () => {
    // Status wins over kind even when kind would have accepted.
    const result = call({
      response: makeFake304(),
      url: "https://example.test/app.js",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("revalidation");
  });
});

describe("the size axis is a boundary, stated", () => {
  it("accepts at exactly the ceiling and rejects one byte above", () => {
    const at = call({ bodyLength: PASSIVE_MAX_BYTES });
    const above = call({ bodyLength: PASSIVE_MAX_BYTES + 1 });
    expect(at.ok).toBe(true);
    expect(above.ok).toBe(false);
    if (!above.ok) expect(above.reason).toBe("too_large");
  });

  it("reads body.length only — a declared-length body is never decoded", () => {
    // makeDeclaredLengthBody's toRaw()/toText() throw. A gate that decoded would
    // surface here as an exception rather than as a slow test (T-01-14).
    expect(() => call({ bodyLength: 4096 })).not.toThrow();
  });

  it("honours a config ceiling that is not the default", () => {
    const sdk = makeFakeSdk();
    const request = makeFakeRequest({ url: JS_URL });
    const response = makeFakeResponse({ bodyLength: 2048 });
    expect(admit(sdk, request, response, { maxBytes: 2048 }).ok).toBe(true);
    const tight = admit(sdk, request, response, { maxBytes: 2047 });
    expect(tight.ok).toBe(false);
    if (!tight.ok) expect(tight.reason).toBe("too_large");
  });
});

describe("header casing and array values resolve identically", () => {
  it("three spellings produce the same accept", () => {
    // The acceptance criterion asks for three table rows producing the SAME
    // accept, so they are compared to each other rather than each to a literal.
    const lower = call({
      headers: { "content-type": ["application/javascript"] },
      url: "https://example.test/nope.css",
    });
    const upper = call({
      headers: { "Content-Type": ["application/javascript"] },
      url: "https://example.test/nope.css",
    });
    const bare = call({
      headers: { "content-type": "application/javascript" },
      url: "https://example.test/nope.css",
    });
    expect(lower).toEqual(upper);
    expect(upper).toEqual(bare);
    expect(lower.ok).toBe(true);
  });

  it("contentTypeOf unwraps arrays, honours both casings, and survives undefined", () => {
    expect(contentTypeOf({ "content-type": ["text/js"] })).toBe("text/js");
    expect(contentTypeOf({ "Content-Type": ["text/js"] })).toBe("text/js");
    expect(contentTypeOf({ "content-type": "text/js" })).toBe("text/js");
    expect(contentTypeOf({})).toBeNull();
    expect(contentTypeOf(undefined)).toBeNull();
    expect(contentTypeOf({ "content-type": [] })).toBeNull();
  });
});

describe("isScriptish", () => {
  it.each([
    ["application/javascript", null, true],
    ["text/javascript; charset=utf-8", null, true],
    ["application/ecmascript", null, true],
    ["application/x-ecmascript", null, true],
    ["application/x-javascript", null, true],
    ["text/ecmascript", null, true],
    ["text/javascript1.5", null, true],
    ["text/jscript", null, true],
    ["text/livescript", null, true],
    ["text/x-ecmascript", null, true],
    ["text/x-javascript", null, true],
    ["text/js", null, true],
    [" APPLICATION/JAVASCRIPT ; charset=utf-8", null, true],
    ["text/html", null, false],
    ["text/css", null, false],
    ["multipart/form-data; boundary=module-part", null, false],
    ["application/json; profile=javascript", null, false],
    ["text/html; note=ecmascript", null, false],
    [null, "https://x.test/a.js", true],
    [null, "https://x.test/a.mjs", true],
    [null, "https://x.test/a.js?v=2", true],
    [null, "https://x.test/a.js#frag", true],
    [null, "https://x.test/a.json", false],
    [null, "https://x.test/a.jsx", false],
    [null, "https://x.test/", false],
    [null, null, false],
  ])("(%s, %s) -> %s", (ct, url, expected) => {
    expect(isScriptish(ct, url)).toBe(expected);
  });
});

describe("the gate touches Caido's scope engine and nothing else", () => {
  it("calls sdk.requests.inScope exactly once, with the request object", () => {
    const sdk = makeFakeSdk();
    const request = makeFakeRequest({ url: JS_URL });
    admit(sdk, request, makeFakeResponse(), DEFAULT_ADMIT_CONFIG);
    expect(sdk.calls.inScope.length).toBe(1);
    expect(sdk.calls.inScope[0]).toBe(request);
  });

  it("does NOT reach the scope engine when an earlier axis already failed", () => {
    // First-failure-wins is not only about the reason: an axis that runs anyway
    // costs work on the one thread CORE-01 exists to protect.
    const sdk = makeFakeSdk();
    admit(sdk, makeFakeRequest(), makeFake304(), DEFAULT_ADMIT_CONFIG);
    expect(sdk.calls.inScope.length).toBe(0);
  });
});

/**
 * Every `.toRaw()` / `.toText()` CALL in a TypeScript file, sorted and unique.
 *
 * Parsed with the TypeScript compiler for the same reason `boundary.spec.ts`
 * does: acorn cannot parse `.ts` at all, and a text scan cannot tell a call from
 * the comment that explains why the call is forbidden.
 */
const FORBIDDEN_DECODES = new Set(["toRaw", "toText"]);

function decodeCallsIn(path: string): string[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const found = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      FORBIDDEN_DECODES.has(node.expression.name.text)
    ) {
      found.add(node.expression.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...found].sort();
}

describe("static discipline over packages/backend/src/hooks/", () => {
  const HOOKS = fileURLToPath(new URL("./", import.meta.url));
  const files = readdirSync(HOOKS)
    .filter((n) => n.endsWith(".ts") && !n.endsWith(".spec.ts"))
    .sort();

  it("found hook sources to scan", () => {
    // NON-VACUITY. An enumeration that returned nothing would let both scans
    // below pass having read no file at all.
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s never calls toRaw() or toText()", (name) => {
    // AST, not a text scan, and the difference is load-bearing: both files
    // DISCUSS `toRaw()` and `toText()` by name in the comments that explain why
    // they are forbidden. A substring scan would fail on its own documentation,
    // and the only way to make it pass would be to delete the reasoning — which
    // is precisely backwards. So the gate looks for a CALL, the way
    // boundary.spec.ts looks for an import.
    const called = decodeCallsIn(join(HOOKS, name));
    expect(
      called,
      `${name} calls ${called.join(", ")}. The admission gate reads body.length and never ` +
        `decodes: materialising megabytes here runs on the one thread that also serves every RPC ` +
        `and every timer, and the size comparison is what keeps an oversized body from aborting ` +
        `caido-cli under panic = "abort" (T-01-14).`,
    ).toEqual([]);
  });

  it("the AST scan FAILS on a file that does call toRaw() or toText()", () => {
    // Execute the failing path. A scan that silently matched nothing would let
    // every case above pass having proven nothing at all — and the fixture lives
    // in the OS temp directory, not in src/, so a crash mid-test cannot leave a
    // stray module behind for `tsc --build` to trip over.
    const violation = join(
      mkdtempSync(join(tmpdir(), "defminer-admit-gate-")),
      "violation.ts",
    );
    writeFileSync(
      violation,
      "export const a = (b: { toRaw(): Uint8Array }): number => b.toRaw().length;\n" +
        "export const c = (b: { toText(): string }): string => b.toText();\n",
      "utf8",
    );
    try {
      expect(decodeCallsIn(violation)).toEqual(["toRaw", "toText"]);
    } finally {
      rmSync(violation, { force: true });
    }
  });

  // Every way a pattern can actually RUN. A literal that is never executed cannot
  // hang anything, so the scan looks for execution rather than for syntax — which
  // also means it needs no pattern of its own to find one (this list is matched
  // with `includes`, not with a regex).
  const PATTERN_EXECUTION = [
    "RegExp(",
    ".test(",
    ".match(",
    ".matchAll(",
    ".exec(",
    ".search(",
  ];

  it.each(files)("%s never executes a regular expression", (name) => {
    const source = readFileSync(join(HOOKS, name), "utf8");
    // REDOS_RECOVERY is `kill` — SPIKE-01 measured that a catastrophic pattern
    // hangs the QuickJS thread with no interrupt, that togglePlugin never returns
    // and that installPluginPackage fails rather than recovering. SIGKILL was the
    // only teardown that worked, and it takes `caido-cli` down with the operator's
    // real project data. So classification here is indexOf/endsWith and there is
    // no pattern to audit in the first place.
    const found = PATTERN_EXECUTION.filter((p) => source.includes(p));
    expect(
      found,
      `${name} executes a pattern via ${found.join(", ")}. There is no interrupt handler in this ` +
        `runtime and REDOS_RECOVERY is "kill": classification in the hooks is indexOf/endsWith only ` +
        `(T-01-13). DET-05's static check lands in Phase 5; the discipline starts here.`,
    ).toEqual([]);
  });
});

describe("every reject reason has a case", () => {
  it("the table exercises exactly the members of REJECT_REASONS", () => {
    const exercised = new Set(
      CASES.map((c) => c.reason).filter((r): r is RejectReason => r !== null),
    );
    const declared = new Set<RejectReason>(REJECT_REASONS);
    const untested = [...declared].filter((r) => !exercised.has(r));
    const stray = [...exercised].filter((r) => !declared.has(r));
    expect(
      untested,
      `these reject reasons have no case in CASES: ${untested.join(", ")}. ` +
        `A reason with no test is a counter that reads zero forever, and nobody can tell ` +
        `that from "it never happened".`,
    ).toEqual([]);
    expect(
      stray,
      `these cases assert a reason that is not in REJECT_REASONS: ${stray.join(", ")}.`,
    ).toEqual([]);
  });

  it("every case's asserted reason is actually produced", () => {
    // Guards the guard: the set comparison above would still pass if a case's
    // `reason` field were aspirational and its `run()` returned something else.
    for (const c of CASES) {
      const result = c.run();
      if (c.reason === null) {
        expect(result.ok, c.name).toBe(true);
      } else {
        expect(result.ok, c.name).toBe(false);
        if (!result.ok) expect(result.reason, c.name).toBe(c.reason);
      }
    }
  });
});
