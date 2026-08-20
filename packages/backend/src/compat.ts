// packages/backend/src/compat.ts — COMPAT-01's runtime guard and COMPAT-02's
// capability probe.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A RUNTIME CHECK AND NOT A MANIFEST FIELD
// ---------------------------------------------------------------------------
// The Caido plugin manifest schema has NO minimum-version field. There is no
// declarative option, so `sdk.runtime.version` read at `init()` time is the only
// mechanism that exists. That is not a workaround; it is the whole surface.
//
// ---------------------------------------------------------------------------
// WHY A VERSION CHECK IS NOT ENOUGH ON ITS OWN
// ---------------------------------------------------------------------------
// A version number is a claim about a build, not about the surface that build
// exposes. Phase 0 measured `globals_count = 100` inside Caido 0.57.1 while
// `@caido/quickjs-types@0.26.0` declares roughly six — so the TYPE PACKAGE IS
// NOT A CAPABILITY LIST, and the only honest way to know a surface is present is
// to look for it. REQUIRED_SURFACES is that list, and it is the same list
// `scripts/phase1/compat-smoke.sh` exercises against a live Caido, derived from
// this file rather than restated, so a surface cannot be integrated here and
// quietly dropped from the compatibility test.
//
// ---------------------------------------------------------------------------
// THE TWO STAGES, AND WHY THERE ARE TWO
// ---------------------------------------------------------------------------
// `checkCompat(sdk)` runs FIRST in `init()` and covers the version plus every
// surface reachable on the SDK object itself. Its refusal must leave the plugin
// with no hook registered AND no database opened — so it may not call anything,
// only read properties.
//
// `checkRuntimeSurfaces(ctx)` covers what cannot be known without actually
// having a handle: a `Database`'s methods, a `Statement`'s methods, the SQLite
// build underneath, and the native hash the digest path depends on. You cannot
// discover a Database's method set without a Database, so this stage necessarily
// runs after `sdk.meta.db()`. Saying that plainly is better than a probe that
// pretends to check a Statement it never obtained.
//
// Its refusal is just as hard: `init()` registers no hook either way.

/** The build every Phase 0 threshold was measured on. Running below it would
 *  produce silently wrong results rather than an error, which is why this is a
 *  hard floor and not a warning. */
export const MIN_CAIDO = "0.57.1";

/** `ON CONFLICT ... DO UPDATE` — the ONLY legal write shape on a driver with no
 *  transaction primitive — landed in SQLite 3.24. The storage design has no
 *  fallback below it, so this is a required capability and not a diagnostic.
 *  Plan 01-01 measured 3.46.0 inside Caido 0.57.1. */
export const MIN_SQLITE = "3.24.0";

export type CompatResult = { ok: true } | { ok: false; reason: string };

/**
 * Compare two three-segment versions numerically.
 *
 * Numeric, never a string compare, and never a float parse. Both traps are real
 * and both are asserted in compat.spec.ts:
 *
 *   STRING TRAP — `"0.6.0" > "0.57.1"` is TRUE in JavaScript, because '6' sorts
 *   after '5'. Caido's minor version has passed 6 and is now 58, so a string
 *   compare would ACCEPT 0.6.0 as newer than the measured minimum. It is a
 *   guard that silently stops guarding.
 *
 *   FLOAT TRAP — `parseFloat("0.10.0")` is 0.1 and `parseFloat("0.9.0")` is 0.9,
 *   so a float compare puts 0.10.0 BELOW 0.9.0.
 *
 * Returns a negative number when a < b, 0 when equal, positive when a > b, and
 * NaN when either side has a segment with no leading ASCII digit — the caller
 * must treat NaN as "cannot compare", never as "equal". Segments beyond the
 * third are ignored; a pre-release or build suffix compares on its segment's
 * numeric core, so 0.58.0-beta.1 and 0.58.0+build3 both compare equal to 0.58.0.
 */
export function cmpCaidoVersion(a: string, b: string): number {
  // The LEADING DIGIT RUN, not the whole segment. `/^\d+$/` would make every
  // pre-release build unparseable, and an unparseable version is refused — so a
  // stricter test here is not "safer", it is a refusal of builds that are fine.
  const core = (segment: string): number => {
    const m = /^(\d+)/.exec(segment);
    return m === null ? Number.NaN : Number.parseInt(m[1], 10);
  };
  const seg = (v: string): number[] =>
    String(v).split(".").slice(0, 3).map(core);
  const x = seg(a);
  const y = seg(b);
  for (let i = 0; i < 3; i++) {
    // A version with fewer than three segments is not unparseable: 0.58 means
    // 0.58.0. Absent is 0; present-but-non-numeric is NaN. Different claims.
    const xi = x.length > i ? x[i] : 0;
    const yi = y.length > i ? y[i] : 0;
    if (Number.isNaN(xi) || Number.isNaN(yi)) return Number.NaN;
    if (xi !== yi) return xi - yi;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// REQUIRED_SURFACES
// ---------------------------------------------------------------------------

/** Where a surface lives, which decides WHEN it can be probed. */
export type SurfaceScope = "sdk" | "db" | "module" | "capability";

/** Everything a probe may look at. Every field optional: a probe whose context
 *  is absent reports MISSING, never "probably fine". */
export type SurfaceContext = {
  sdk?: unknown;
  db?: unknown;
  statement?: unknown;
  sqliteVersion?: string | null;
  createHash?: unknown;
};

export type RequiredSurface = {
  /** The surface's name, spelled exactly as
   *  `.planning/phases/01-skeleton-persistence-compatibility/COVERAGE.md`
   *  spells it. `tests/phase1-compat.spec.ts` parses that table and asserts the
   *  two sets are equal, so a rename here without a rename there fails. */
  name: string;
  scope: SurfaceScope;
  /** The COVERAGE.md row number this surface is, or `null` for a capability
   *  that is not an API surface and therefore has no row. */
  coverageRow: number | null;
  /** Total: returns a boolean and never throws. {@link probeSurfaces} catches
   *  anyway, because "never throws" is a claim about code somebody will edit. */
  probe: (ctx: SurfaceContext) => boolean;
};

/** Walk a dotted path without throwing on a missing intermediate. */
function at(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const key of path.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

const fnAt =
  (root: keyof SurfaceContext, path: string) =>
  (ctx: SurfaceContext): boolean =>
    typeof at(ctx[root], path) === "function";

/**
 * Every surface the SHIPPED backend bundle reaches, plus the one capability the
 * storage design cannot run without.
 *
 * WHAT IS NOT HERE, AND WHY (reconciled against COVERAGE.md during 01-06):
 * `string_decoder.StringDecoder` (row 35) and `buffer.Buffer` (row 36) are
 * marked INTEGRATE in COVERAGE.md, but `packages/engine/src/decode.ts` has no
 * consumer in the shipped path yet (Broken Windows entry 8), so both are
 * tree-shaken out — `grep -c StringDecoder packages/backend/dist/index.js` is 0.
 * They are NOT required here, because the only way to require them would be a
 * static import of two modules the plugin does not use, and a module-load
 * failure on a future Caido would then take the whole plugin down to satisfy a
 * probe. COVERAGE.md records them as INTEGRATE (source-only) with that reason.
 */
export const REQUIRED_SURFACES: readonly RequiredSurface[] = [
  // --- scope "sdk": readable from the SDK object, before anything is opened ---
  {
    name: "sdk.events.onInterceptResponse",
    scope: "sdk",
    coverageRow: 1,
    probe: fnAt("sdk", "events.onInterceptResponse"),
  },
  {
    name: "sdk.events.onProjectChange",
    scope: "sdk",
    coverageRow: 2,
    probe: fnAt("sdk", "events.onProjectChange"),
  },
  {
    name: "sdk.requests.get",
    scope: "sdk",
    coverageRow: 5,
    probe: fnAt("sdk", "requests.get"),
  },
  {
    name: "sdk.requests.inScope",
    scope: "sdk",
    coverageRow: 6,
    probe: fnAt("sdk", "requests.inScope"),
  },
  {
    name: "sdk.projects.getCurrent",
    scope: "sdk",
    coverageRow: 10,
    probe: fnAt("sdk", "projects.getCurrent"),
  },
  {
    name: "sdk.meta.db",
    scope: "sdk",
    coverageRow: 11,
    // Checked as a FUNCTION and deliberately not CALLED. Calling it here would
    // open the database inside the guard whose whole contract is that a refusal
    // opens nothing.
    probe: fnAt("sdk", "meta.db"),
  },
  {
    name: "sdk.runtime.version",
    scope: "sdk",
    coverageRow: 17,
    probe: (ctx) => {
      const v = at(ctx.sdk, "runtime.version");
      return typeof v === "string" && v.length > 0;
    },
  },
  {
    name: "sdk.console.log",
    scope: "sdk",
    coverageRow: 18,
    probe: fnAt("sdk", "console.log"),
  },
  {
    name: "sdk.api.register",
    scope: "sdk",
    coverageRow: 19,
    probe: fnAt("sdk", "api.register"),
  },

  // --- scope "db": needs a real handle, so probed after sdk.meta.db() --------
  {
    name: "Database.exec",
    scope: "db",
    coverageRow: 28,
    probe: fnAt("db", "exec"),
  },
  {
    name: "Database.prepare",
    scope: "db",
    coverageRow: 29,
    probe: fnAt("db", "prepare"),
  },
  {
    name: "Statement.run",
    scope: "db",
    coverageRow: 30,
    probe: fnAt("statement", "run"),
  },
  {
    name: "Statement.get",
    scope: "db",
    coverageRow: 31,
    probe: fnAt("statement", "get"),
  },
  {
    name: "Statement.all",
    scope: "db",
    coverageRow: 32,
    probe: fnAt("statement", "all"),
  },

  // --- scope "module": a runtime module the bundle genuinely imports ---------
  {
    name: "crypto.createHash",
    scope: "module",
    coverageRow: 34,
    // DET-07 forbids the JS hash loop Phase 0 measured at 187 ms/MB against
    // 0.34 ms/MB native, so this is load-bearing rather than a convenience.
    probe: (ctx) => typeof ctx.createHash === "function",
  },

  // --- scope "capability": not an API surface, so no COVERAGE.md row ---------
  {
    name: "sqlite.version>=" + MIN_SQLITE,
    scope: "capability",
    coverageRow: null,
    probe: (ctx) => {
      const v = ctx.sqliteVersion;
      if (typeof v !== "string" || v.length === 0) return false;
      const c = cmpCaidoVersion(v, MIN_SQLITE);
      return !Number.isNaN(c) && c >= 0;
    },
  },
];

/** One surface's probe result, in the shape recorded into
 *  `results/compat-smoke.json` and returned by the `getCompat` RPC. */
export type SurfaceOutcome = {
  name: string;
  scope: SurfaceScope;
  coverage_row: number | null;
  ok: boolean;
  error: string | null;
};

/**
 * Run every probe (optionally filtered by scope) and report each one.
 *
 * A probe that throws is reported as MISSING with its message, never allowed to
 * propagate: Caido surfaces neither a synchronous throw nor an async rejection
 * from plugin code, so an exception escaping here would be completely invisible
 * and the plugin would half-run.
 */
export function probeSurfaces(
  ctx: SurfaceContext,
  scopes?: readonly SurfaceScope[],
): SurfaceOutcome[] {
  const wanted =
    scopes === undefined
      ? REQUIRED_SURFACES
      : REQUIRED_SURFACES.filter((s) => scopes.includes(s.scope));
  return wanted.map((s) => {
    try {
      return {
        name: s.name,
        scope: s.scope,
        coverage_row: s.coverageRow,
        ok: s.probe(ctx) === true,
        error: null,
      };
    } catch (e) {
      return {
        name: s.name,
        scope: s.scope,
        coverage_row: s.coverageRow,
        ok: false,
        error: String(e).slice(0, 160),
      };
    }
  });
}

function missingReason(
  missing: readonly SurfaceOutcome[],
  reported: string,
): string {
  return (
    `DefMiner cannot run on this Caido build (reported ${reported}): ` +
    `${String(missing.length)} required SDK surface(s) are missing — ` +
    missing.map((m) => m.name).join(", ") +
    `. Passive analysis is disabled. Every DefMiner budget was measured on ` +
    `Caido ${MIN_CAIDO}; running without a surface the pipeline calls would ` +
    `produce silently wrong results rather than an error.`
  );
}

/**
 * The guard `init()` calls BEFORE it registers a hook or opens the database.
 *
 * `sdk.runtime?.version` is read through an optional chain on purpose: a build
 * with no `runtime` object must produce the incompatibility message, not a
 * TypeError thrown out of `init()` — and Caido surfaces NEITHER a synchronous
 * throw nor an async rejection from plugin code (HANDLER_ERROR_SURFACED =
 * "neither"), so that TypeError would be completely invisible.
 */
export function checkCompat(sdk: unknown): CompatResult {
  const reported = at(sdk, "runtime.version");
  if (typeof reported !== "string" || reported.length === 0) {
    return {
      ok: false,
      reason:
        `DefMiner requires Caido ${MIN_CAIDO} or newer; this instance reports no version at all ` +
        `(the required surface sdk.runtime.version is missing or empty). ` +
        `Passive analysis is disabled. Every DefMiner budget was measured on Caido ${MIN_CAIDO}; ` +
        `running below it would produce silently wrong results rather than an error.`,
    };
  }
  const c = cmpCaidoVersion(reported, MIN_CAIDO);
  if (Number.isNaN(c)) {
    return {
      ok: false,
      reason:
        `DefMiner requires Caido ${MIN_CAIDO} or newer; this instance reports "${reported}", ` +
        `which is not a three-part numeric version, so it cannot be compared. ` +
        `Passive analysis is disabled.`,
    };
  }
  if (c < 0) {
    return {
      ok: false,
      reason:
        `DefMiner requires Caido ${MIN_CAIDO} or newer; this instance reports ${reported}. ` +
        `Passive analysis is disabled. Every DefMiner budget was measured on Caido ${MIN_CAIDO}; ` +
        `running below it would produce silently wrong results rather than an error.`,
    };
  }
  const missing = probeSurfaces({ sdk }, ["sdk"]).filter((s) => !s.ok);
  if (missing.length > 0) {
    return { ok: false, reason: missingReason(missing, reported) };
  }
  return { ok: true };
}

/**
 * The second stage: the surfaces that cannot be known without a handle.
 *
 * Called by `init()` right after `sdk.meta.db()` and the `sqlite_version()`
 * read, and BEFORE `onInterceptResponse` is registered — so a build that opens a
 * database but cannot prepare a statement still observes nothing.
 */
export function checkRuntimeSurfaces(ctx: SurfaceContext): CompatResult {
  const missing = probeSurfaces(ctx, ["db", "module", "capability"]).filter(
    (s) => !s.ok,
  );
  if (missing.length === 0) return { ok: true };
  const reported =
    typeof at(ctx.sdk, "runtime.version") === "string"
      ? String(at(ctx.sdk, "runtime.version"))
      : "unknown";
  return {
    ok: false,
    reason:
      missingReason(missing, reported) +
      (ctx.sqliteVersion === undefined || ctx.sqliteVersion === null
        ? " SQLite version could not be read."
        : ` SQLite reports ${ctx.sqliteVersion}, minimum ${MIN_SQLITE}.`),
  };
}
