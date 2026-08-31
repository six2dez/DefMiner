// packages/frontend/src/components/compat-contract.ts — COMPAT-01's visible
// refusal surface, in words.
//
// ===========================================================================
// THE DEBT THIS DISCHARGES, AND WHERE IT IS WRITTEN DOWN
// ===========================================================================
// `packages/backend/src/index.ts`, at the first of three refusal paths:
//
//     // getStatus is the ONLY thing registered. No hook, no database.
//     // COMPAT-01's "clear message" is this log line plus this RPC; the
//     // visible surface is owed to Phase 5 (decision P1-D5).
//
// Until this surface existed, a build that refused to run said so in a
// `sdk.console.log` line and in one remote-procedure response. COMPAT-01 calls
// that the obscure failure it forbids: the operator sees a plugin that is
// installed, enabled, and silently doing nothing, and has no way to learn that
// the refusal was deliberate or why.
//
// ===========================================================================
// THERE ARE THREE REFUSAL PATHS AND THIS SURFACE COVERS ALL THREE
// ===========================================================================
// `init()` returns early, having registered only `getStatus` and `getCompat`,
// in three places:
//
//   1. `checkCompat` — the Caido build is below the measured minimum, or an
//      SDK-scope surface the pipeline calls is missing.
//   2. `checkRuntimeSurfaces` — a Database's or a Statement's method set, the
//      SQLite build, or the native hash. It necessarily runs after `meta.db()`,
//      because a Database's methods are not discoverable without a Database.
//   3. project isolation unavailable — `onProjectChange` could not be
//      registered, so a project switch would go unnoticed and the plugin would
//      write one project's traffic under another's id.
//
// All three set the same `compatible: false` and the same `reason`, so this
// surface renders all three without knowing which it is looking at. That is
// deliberate: the operator's question is "why is nothing happening", and the
// answer is the reason string, not the branch.
//
// ===========================================================================
// WHY IT MAY DEPEND ON `getCompat` AND ON NOTHING ELSE
// ===========================================================================
// 05-RESEARCH.md P-08: `sdk.api.register` rejects a duplicate name, so every
// endpoint is registered on exactly one path — and the refusal paths keep only
// the minimal `getStatus` / `getCompat` pair precisely so a refusing build stays
// diagnosable. A refusal surface that needed a third endpoint would be a refusal
// surface that cannot render on a refusing build, which is the only build it
// exists for. `api/client.ts` states the matching half: `getCompat` is the one
// read NOT gated by the contract-version check, because `getContractVersion`
// does not exist on a refusing build either.

/** The heading. It says the plugin is not running, not that something "failed"
 *  — the refusal is deliberate, and a word implying breakage would send the
 *  operator looking for a bug rather than reading the reason. */
export const REFUSAL_HEADING = "DefMiner is not running on this Caido build";

/**
 * The body, above the reason.
 *
 * IT SAYS WHAT IS AND IS NOT HAPPENING, in that order. An operator who does not
 * know that ingestion is off will keep browsing the target expecting results;
 * one who does not know their existing data is untouched may reinstall and lose
 * it. Both are worth a sentence.
 */
export const REFUSAL_BODY =
  "Passive analysis is disabled and nothing is being recorded. This is deliberate: every DefMiner budget was measured on a specific Caido build, and running without a surface the pipeline calls would produce silently wrong results rather than an error. Anything DefMiner already stored is untouched.";

/** The heading over the reason string the backend supplied. */
export const REASON_HEADING = "Why";

/** The heading over the version table. */
export const VERSIONS_HEADING = "Versions";

/** The heading over the probe matrix. */
export const SURFACES_HEADING = "Required runtime surfaces";

/**
 * Why the probe matrix is on this surface at all.
 *
 * It is the thing somebody debugging a refusing build actually needs, and it is
 * the reason the refusal path registers `getCompat` rather than only
 * `getStatus`. A version number is a claim about a build; the matrix is a
 * measurement of what that build actually exposes.
 */
export const SURFACES_NOTE =
  "Measured inside this Caido runtime, not inferred from a version number. A missing surface is one DefMiner's pipeline calls and this build does not provide.";

/** Row labels for the version table. `Record`-free on purpose: four labels with
 *  no shared vocabulary behind them would be a `Record` over an enum invented
 *  to justify the `Record`. */
export const MIN_CAIDO_LABEL = "Minimum Caido";
export const DETECTED_CAIDO_LABEL = "This Caido reports";
export const MIN_SQLITE_LABEL = "Minimum SQLite";
export const DETECTED_SQLITE_LABEL = "This SQLite reports";

/**
 * What a version reads as when the build reported none.
 *
 * A WORD, NOT AN EMPTY CELL. "No version reported" is itself one of the
 * refusal reasons — `checkCompat` refuses a build whose `sdk.runtime.version` is
 * missing or empty — so a blank here would hide the very fact that caused the
 * refusal being explained above it.
 */
export const UNKNOWN_VERSION = "no version reported";

/** A probe that found its surface. */
export const SURFACE_PRESENT = "Present";

/**
 * A probe that did not.
 *
 * A WORD, because colour is never the sole carrier of meaning on this page. The
 * row is also tinted, and the tint is the redundant half.
 */
export const SURFACE_MISSING = "Missing";

/** The heading over a probe's own error text, when it threw. */
export const PROBE_ERROR_LABEL = "probe error";

/**
 * The classes a plugin-generated diagnostic string renders with.
 *
 * `font-mono` because the two strings on this surface DefMiner did not author
 * word for word quote a version number and a caught runtime message, and a
 * lookalike character in either — `0`/`O` in "0.57.1", `l`/`1` in a symbol name
 * — is exactly what the mandatory monospace rule exists to make visible.
 *
 * `whitespace-pre-wrap` AND NOT `whitespace-pre`, which is the one place this
 * surface deliberately differs from a table cell. A cell must not wrap because
 * a variable row height costs the virtualised list its geometry; a refusal
 * explanation must wrap, because the alternative is an `overflow-hidden` cut
 * through the sentence naming the missing surfaces — the single most useful
 * line on the page — with no affordance to see the rest.
 */
export const DIAGNOSTIC_TEXT_CLASS =
  "font-mono whitespace-pre-wrap break-words";
