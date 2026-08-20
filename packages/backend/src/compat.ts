// packages/backend/src/compat.ts — the COMPAT-01 version guard.
//
// Plan 01-06 expands this file (pre-release suffixes, the SDK surface probe, the
// live below-minimum leg). Export NAMES here are stable; do not rename them.

/** The build every Phase 0 threshold was measured on. Running below it would
 *  produce silently wrong results rather than an error, which is why this is a
 *  hard floor and not a warning. */
export const MIN_CAIDO = "0.57.1";

export type CompatResult = { ok: true } | { ok: false; reason: string };

/**
 * Compare two three-segment versions numerically.
 *
 * Numeric, never a string compare: `"0.6.0" < "0.57.1"` lexicographically, which
 * gets the answer backwards for every release from 0.6.0 onwards. Also never a
 * float parse, which gets 0.10.0 versus 0.9.0 backwards.
 *
 * Returns a negative number when a < b, 0 when equal, positive when a > b, and
 * NaN when either side has a segment that is not a run of ASCII digits — the
 * caller must treat NaN as "cannot compare", never as "equal".
 */
export function cmpCaidoVersion(a: string, b: string): number {
  const seg = (v: string): number[] =>
    String(v)
      .split(".")
      .slice(0, 3)
      .map((s) => (/^\d+$/.test(s) ? Number(s) : Number.NaN));
  const x = seg(a);
  const y = seg(b);
  for (let i = 0; i < 3; i++) {
    const xi = x[i] ?? 0;
    const yi = y[i] ?? 0;
    if (Number.isNaN(xi) || Number.isNaN(yi)) return Number.NaN;
    if (xi !== yi) return xi - yi;
  }
  return 0;
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
export function checkCompat(sdk: {
  runtime?: { version?: string };
}): CompatResult {
  const reported = sdk?.runtime?.version;
  if (typeof reported !== "string" || reported.length === 0) {
    return {
      ok: false,
      reason:
        `DefMiner requires Caido ${MIN_CAIDO} or newer; this instance reports no version at all. ` +
        `Passive analysis is disabled.`,
    };
  }
  const c = cmpCaidoVersion(reported, MIN_CAIDO);
  if (Number.isNaN(c)) {
    return {
      ok: false,
      reason:
        `DefMiner requires Caido ${MIN_CAIDO} or newer; this instance reports "${reported}", ` +
        `which is not a three-part numeric version. Passive analysis is disabled.`,
    };
  }
  if (c < 0) {
    return {
      ok: false,
      reason:
        `DefMiner requires Caido ${MIN_CAIDO} or newer; this instance reports ${reported}. ` +
        `Passive analysis is disabled. Every DefMiner budget was measured on ${MIN_CAIDO}; ` +
        `running below it would produce silently wrong results rather than an error.`,
    };
  }
  return { ok: true };
}
