// packages/backend/src/compat.spec.ts — COMPAT-01's unit gate.
//
// The refusal is asserted as things that did NOT happen — zero calls to
// `onInterceptResponse` and zero calls to `meta.db` — and not merely as a string
// coming back. A guard that returns the right message while the hook is already
// registered has not guarded anything.

import { describe, expect, it } from "vitest";

import { type FakeSdk, makeFakeSdk } from "../test/fixtures/fake-sdk";

import {
  checkCompat,
  checkRuntimeSurfaces,
  cmpCaidoVersion,
  MIN_CAIDO,
  MIN_SQLITE,
  probeSurfaces,
  REQUIRED_SURFACES,
  type SurfaceContext,
} from "./compat";
import { PATH_REDACTION, URL_REDACTION } from "./telemetry";

import { init } from "./index";

// ---------------------------------------------------------------------------
// cmpCaidoVersion
// ---------------------------------------------------------------------------

describe("cmpCaidoVersion", () => {
  it("returns 0 for the declared minimum against itself — equal is SUPPORTED", () => {
    // MIN_CAIDO is the build every Phase 0 threshold was measured on, so the
    // boundary case is the ONE version we know is fine. A guard written with `>`
    // instead of `>=` would refuse exactly the build it was calibrated against.
    expect(cmpCaidoVersion(MIN_CAIDO, MIN_CAIDO)).toBe(0);
    expect(cmpCaidoVersion("0.57.1", "0.57.1")).toBe(0);
  });

  it("orders the release immediately below and immediately above the minimum", () => {
    expect(cmpCaidoVersion("0.57.0", "0.57.1")).toBeLessThan(0);
    expect(cmpCaidoVersion("0.57.2", "0.57.1")).toBeGreaterThan(0);
  });

  it("survives the STRING-COMPARE trap at 0.6.0", () => {
    // THE TRAP, EXECUTED RATHER THAN DESCRIBED. JavaScript's own relational
    // operator says "0.6.0" is GREATER than "0.57.1", because '6' sorts after
    // '5'. That is wrong: Caido's minor version passed 6 long ago and is now 58,
    // so 0.6.0 is an ancient build. A string-compare guard would ACCEPT it.
    expect("0.6.0" > "0.57.1").toBe(true); // the trap is real
    expect(cmpCaidoVersion("0.6.0", "0.57.1")).toBeLessThan(0); // we avoid it
    // ...and the guard therefore REFUSES 0.6.0, which is the consequence that
    // actually matters.
    const r = checkCompat(makeFakeSdk({ version: "0.6.0" }));
    expect(r.ok).toBe(false);
  });

  it("survives the FLOAT-PARSE trap at 0.10.0 vs 0.9.0", () => {
    // parseFloat("0.10.0") is 0.1 and parseFloat("0.9.0") is 0.9, so a float
    // compare puts 0.10.0 BELOW 0.9.0. Executed, not asserted by comment.
    expect(Number.parseFloat("0.10.0")).toBeLessThan(
      Number.parseFloat("0.9.0"),
    );
    expect(cmpCaidoVersion("0.10.0", "0.9.0")).toBeGreaterThan(0);
  });

  it("ignores segments beyond the third rather than truncating or invalidating", () => {
    expect(cmpCaidoVersion("0.58.0.4", "0.58.0")).toBe(0);
    expect(cmpCaidoVersion("0.58.1.4", "0.58.0")).toBeGreaterThan(0);
  });

  it("compares a pre-release or build suffix on its segment's numeric core", () => {
    expect(cmpCaidoVersion("0.58.0-beta.1", "0.58.0")).toBe(0);
    expect(cmpCaidoVersion("0.58.0+build3", "0.58.0")).toBe(0);
    expect(cmpCaidoVersion("0.59.0-rc.1", "0.58.0")).toBeGreaterThan(0);
  });

  it("treats a missing segment as zero, not as unparseable", () => {
    expect(cmpCaidoVersion("0.58", "0.58.0")).toBe(0);
    expect(cmpCaidoVersion("0.58", "0.58.1")).toBeLessThan(0);
  });

  it("returns NaN — never 0 — for a segment with no leading digit", () => {
    // NaN and 0 are the whole point. If an unparseable version compared EQUAL,
    // `c < 0` would be false and the guard would silently accept anything.
    expect(Number.isNaN(cmpCaidoVersion("not-a-version", MIN_CAIDO))).toBe(
      true,
    );
    expect(Number.isNaN(cmpCaidoVersion("0.x.1", MIN_CAIDO))).toBe(true);
    expect(Number.isNaN(cmpCaidoVersion(MIN_CAIDO, "beta"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkCompat — the version axis, driven as a table
// ---------------------------------------------------------------------------

type VersionCase = {
  label: string;
  version: string | null | undefined;
  accepted: boolean;
  /** A substring the reason must carry, beyond MIN_CAIDO. */
  names?: string;
};

const VERSION_CASES: VersionCase[] = [
  { label: "exactly the minimum", version: "0.57.1", accepted: true },
  {
    label: "one patch below the minimum",
    version: "0.57.0",
    accepted: false,
    names: "0.57.0",
  },
  { label: "one patch above the minimum", version: "0.57.2", accepted: true },
  { label: "the current release", version: "0.58.0", accepted: true },
  // The string-compare trap, as an ACCEPT/REFUSE decision rather than a number.
  {
    label: "0.6.0 — the string-compare trap",
    version: "0.6.0",
    accepted: false,
    names: "0.6.0",
  },
  {
    label: "0.55.3 — the real old binary on this machine",
    version: "0.55.3",
    accepted: false,
    names: "0.55.3",
  },
  { label: "a four-segment version", version: "0.58.0.4", accepted: true },
  {
    label: "a pre-release of the current release",
    version: "0.58.0-beta.1",
    accepted: true,
  },
  {
    label: "a build-metadata suffix",
    version: "0.58.0+build3",
    accepted: true,
  },
  {
    label: "a non-numeric segment",
    version: "not-a-version",
    accepted: false,
    names: "not-a-version",
  },
  { label: "an empty-string version", version: "", accepted: false },
  { label: "an undefined version", version: null, accepted: false },
];

describe("checkCompat — version axis", () => {
  it.each(VERSION_CASES)("$label", (c) => {
    const sdk = makeFakeSdk({ version: c.version === null ? null : c.version });
    const r = checkCompat(sdk);
    expect(
      r.ok,
      `expected ${c.label} to be ${c.accepted ? "accepted" : "refused"}`,
    ).toBe(c.accepted);
    if (!r.ok) {
      expect(r.reason.length).toBeGreaterThan(0);
      expect(r.reason).toContain(MIN_CAIDO);
      if (c.names !== undefined) expect(r.reason).toContain(c.names);
    }
    // NOTHING happened. Not on the refusal path and not on the accept path
    // either: checkCompat reads properties and calls nothing at all.
    expect(sdk.calls.interceptResponseHandlers).toHaveLength(0);
    expect(sdk.calls.metaDb).toBe(0);
  });

  it("throws nothing when `runtime` is absent entirely", () => {
    // Not the same as `version: undefined`. An old build may have no `runtime`
    // object, and `sdk.runtime.version` would then be a TypeError thrown out of
    // init() — which Caido surfaces NOWHERE (HANDLER_ERROR_SURFACED = neither).
    const sdk = makeFakeSdk();
    delete (sdk as unknown as Record<string, unknown>).runtime;
    let r: ReturnType<typeof checkCompat> | undefined;
    expect(() => {
      r = checkCompat(sdk);
    }).not.toThrow();
    expect(r?.ok).toBe(false);
    if (r !== undefined && !r.ok) expect(r.reason).toContain(MIN_CAIDO);
    expect(sdk.calls.metaDb).toBe(0);
  });

  it("throws nothing when the sdk itself is null or undefined", () => {
    for (const bad of [null, undefined, 0, "sdk"]) {
      const r = checkCompat(bad);
      expect(r.ok).toBe(false);
    }
  });

  it("names BOTH the required and the reported version in every refusal", () => {
    for (const c of VERSION_CASES.filter((x) => !x.accepted)) {
      const r = checkCompat(
        makeFakeSdk({ version: c.version === null ? null : c.version }),
      );
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.reason).toContain(MIN_CAIDO);
        if (typeof c.version === "string" && c.version.length > 0) {
          expect(r.reason).toContain(c.version);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// REQUIRED_SURFACES
// ---------------------------------------------------------------------------

/** Delete a dotted path from a plain object, so a fake SDK can be missing one
 *  named surface and nothing else. */
function without<T>(obj: T, path: string): T {
  const parts = path.split(".");
  const last = parts.pop() as string;
  let cur: Record<string, unknown> = obj as unknown as Record<string, unknown>;
  for (const p of parts) cur = cur[p] as Record<string, unknown>;
  delete cur[last];
  return obj;
}

/** Every sdk-scope surface name mapped to the property path that provides it. */
const SDK_SURFACE_PATHS: Record<string, string> = {
  "sdk.events.onInterceptResponse": "events.onInterceptResponse",
  "sdk.events.onProjectChange": "events.onProjectChange",
  "sdk.requests.get": "requests.get",
  "sdk.requests.inScope": "requests.inScope",
  "sdk.projects.getCurrent": "projects.getCurrent",
  "sdk.meta.db": "meta.db",
  "sdk.runtime.version": "runtime.version",
  "sdk.console.log": "console.log",
  "sdk.api.register": "api.register",
};

/** A context in which every non-sdk surface is present, so a case can remove
 *  exactly one and prove the removal is what failed. */
function fullContext(sdk: FakeSdk): SurfaceContext {
  return {
    sdk,
    db: { exec: () => undefined, prepare: () => undefined },
    statement: {
      run: () => undefined,
      get: () => undefined,
      all: () => undefined,
    },
    sqliteVersion: "3.46.0",
    createHash: () => undefined,
  };
}

describe("REQUIRED_SURFACES", () => {
  it("is non-empty and every name is unique", () => {
    expect(REQUIRED_SURFACES.length).toBeGreaterThan(0);
    const names = REQUIRED_SURFACES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("covers exactly the sdk-scope surfaces this spec knows how to remove", () => {
    // A surface added to the table without a removal path here would be
    // untested by the negative cases below, which is the way a probe rots.
    const sdkNames = REQUIRED_SURFACES.filter((s) => s.scope === "sdk")
      .map((s) => s.name)
      .sort();
    expect(sdkNames).toEqual(Object.keys(SDK_SURFACE_PATHS).sort());
  });

  it("every probe is total: no context at all returns false, never a throw", () => {
    for (const s of REQUIRED_SURFACES) {
      expect(
        () => s.probe({}),
        `${s.name} threw on an empty context`,
      ).not.toThrow();
      expect(s.probe({}), `${s.name} passed with NOTHING supplied`).toBe(false);
    }
  });

  it("every probe passes against a complete context", () => {
    const results = probeSurfaces(fullContext(makeFakeSdk()));
    const failed = results.filter((r) => !r.ok).map((r) => r.name);
    expect(failed, "surfaces that failed against a complete fake").toEqual([]);
    expect(results).toHaveLength(REQUIRED_SURFACES.length);
  });

  it.each(Object.entries(SDK_SURFACE_PATHS))(
    "removing %s from a fake SDK produces a refusal that NAMES it",
    (name, path) => {
      const sdk = without(makeFakeSdk(), path);
      const r = checkCompat(sdk);
      expect(r.ok, `${name} was removed and checkCompat still said ok`).toBe(
        false,
      );
      if (!r.ok) expect(r.reason).toContain(name);
      // The refusal is observable as things NOT happening.
      expect(sdk.calls.interceptResponseHandlers).toHaveLength(0);
      expect(sdk.calls.metaDb).toBe(0);
    },
  );

  it.each([
    ["Database.exec", "db", "exec"],
    ["Database.prepare", "db", "prepare"],
    ["Statement.run", "statement", "run"],
    ["Statement.get", "statement", "get"],
    ["Statement.all", "statement", "all"],
  ])("removing %s produces a refusal that NAMES it", (name, root, key) => {
    const ctx = fullContext(makeFakeSdk());
    delete (ctx[root as "db" | "statement"] as Record<string, unknown>)[key];
    const r = checkRuntimeSurfaces(ctx);
    expect(
      r.ok,
      `${name} was removed and checkRuntimeSurfaces still said ok`,
    ).toBe(false);
    if (!r.ok) expect(r.reason).toContain(name);
  });

  it("removing crypto.createHash produces a refusal that names it", () => {
    const ctx = fullContext(makeFakeSdk());
    delete ctx.createHash;
    const r = checkRuntimeSurfaces(ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("crypto.createHash");
  });

  it("refuses a SQLite below 3.24 and names both the found and the required build", () => {
    // The upsert this whole storage design rests on landed in 3.24, and there is
    // no fallback below it. Treated as a REQUIRED SURFACE, not an assumption.
    for (const v of ["3.23.9", "3.7.17", "2.8.17"]) {
      const ctx = { ...fullContext(makeFakeSdk()), sqliteVersion: v };
      const r = checkRuntimeSurfaces(ctx);
      expect(r.ok, `SQLite ${v} was accepted`).toBe(false);
      if (!r.ok) {
        expect(r.reason).toContain(MIN_SQLITE);
        expect(r.reason).toContain(v);
      }
    }
  });

  it("accepts the SQLite Phase 0 actually measured, and the 3.24 boundary itself", () => {
    for (const v of ["3.24.0", "3.46.0", "3.9.0"]) {
      const ctx = { ...fullContext(makeFakeSdk()), sqliteVersion: v };
      const expected = v !== "3.9.0";
      expect(checkRuntimeSurfaces(ctx).ok, `SQLite ${v}`).toBe(expected);
    }
  });

  it("refuses an unreadable SQLite version rather than assuming it is fine", () => {
    for (const v of [null, undefined, ""]) {
      const ctx = { ...fullContext(makeFakeSdk()), sqliteVersion: v };
      expect(checkRuntimeSurfaces(ctx).ok, `sqliteVersion ${String(v)}`).toBe(
        false,
      );
    }
  });

  it("reports a throwing probe as MISSING with its message, never propagating", () => {
    const ctx: SurfaceContext = {
      get sdk(): unknown {
        throw new Error("exploding context");
      },
    };
    let out: ReturnType<typeof probeSurfaces> | undefined;
    expect(() => {
      out = probeSurfaces(ctx, ["sdk"]);
    }).not.toThrow();
    expect(out?.every((o) => !o.ok)).toBe(true);
    expect(
      out?.some((o) => (o.error ?? "").includes("exploding context")),
    ).toBe(true);
  });

  it("redacts URL and absolute-path details from a throwing probe", () => {
    const ctx: SurfaceContext = {
      get sdk(): unknown {
        throw new Error(
          "probe https://private.example/app.js?token=probe-secret " +
            "/Users/private-user/Library/Application Support/Caido/data.db",
        );
      },
    };

    const out = probeSurfaces(ctx, ["sdk"]);
    const errors = out.map((o) => o.error ?? "").join("\n");
    expect(errors).toContain(URL_REDACTION);
    expect(errors).toContain(PATH_REDACTION);
    expect(errors).not.toContain("private.example");
    expect(errors).not.toContain("probe-secret");
    expect(errors).not.toContain("private-user");
  });
});

// ---------------------------------------------------------------------------
// The refusal, through the REAL init()
// ---------------------------------------------------------------------------

describe("init() on an incompatible build", () => {
  it.each(["0.57.0", "0.55.3", "0.6.0", "not-a-version", ""])(
    "version %s: registers NO hook, opens NO database, and only exposes status RPCs",
    async (version) => {
      const sdk = makeFakeSdk({ version });
      await init(sdk);
      expect(
        sdk.calls.interceptResponseHandlers,
        "a hook was registered",
      ).toHaveLength(0);
      expect(sdk.calls.metaDb, "the database was opened").toBe(0);
      // The message reaches the host log, which is COMPAT-01's operator-visible
      // surface in Phase 1 (decision P6-D2 — the backend QuickJS surface has no
      // toast or notification API at all).
      const logged = sdk.calls.consoleLog.join("\n");
      expect(logged).toContain("INCOMPATIBLE");
      expect(logged).toContain(MIN_CAIDO);
      // getStatus AND getCompat: the surface matrix of a build that refuses is
      // exactly the matrix somebody needs to read.
      expect(sdk.calls.apiRegister).toContain("getStatus");
      expect(sdk.calls.apiRegister).toContain("getCompat");
      expect(sdk.calls.apiRegister).not.toContain("getArtifacts");
    },
  );

  it("a MISSING SURFACE — not a version — also registers no hook", async () => {
    const sdk = without(makeFakeSdk({ version: "0.58.0" }), "requests.inScope");
    await init(sdk);
    expect(sdk.calls.interceptResponseHandlers).toHaveLength(0);
    expect(sdk.calls.metaDb).toBe(0);
    expect(sdk.calls.consoleLog.join("\n")).toContain("sdk.requests.inScope");
  });
});
