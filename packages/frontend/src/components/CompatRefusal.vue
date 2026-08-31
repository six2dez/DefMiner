<script setup lang="ts">
// packages/frontend/src/components/CompatRefusal.vue — COMPAT-01's visible
// refusal surface, and the discharge of the debt Phase 1 wrote into
// `packages/backend/src/index.ts`:
//
//     // getStatus is the ONLY thing registered. No hook, no database.
//     // COMPAT-01's "clear message" is this log line plus this RPC; the
//     // visible surface is owed to Phase 5 (decision P1-D5).
//
// Until this component existed, a build that refused to run said so in a
// `sdk.console.log` line nobody reads and in one remote-procedure response
// nothing rendered. What the operator saw was a plugin that is installed,
// enabled, and silently doing nothing — which is precisely the obscure failure
// COMPAT-01 forbids, and it is worse than a crash: a crash gets reported.
//
// ===========================================================================
// WHY THIS MAY DEPEND ON `getCompat` AND ON NOTHING ELSE
// ===========================================================================
// 05-RESEARCH.md P-08: `sdk.api.register` rejects a duplicate name, so every
// endpoint is registered on exactly one path — and all three refusal paths keep
// registering the minimal `getStatus` / `getCompat` pair precisely so a refusing
// build stays diagnosable. A refusal surface that needed a third endpoint could
// not render on the only build it exists for. `api/client.ts` holds the matching
// half deliberately: `getCompat` is the one read NOT gated by the
// contract-version check, because `getContractVersion` does not exist on a
// refusing build either, so the guard could never have been satisfied there.
//
// ===========================================================================
// WHY THE PROBE MATRIX IS HERE AND NOT ONLY IN A LOG
// ===========================================================================
// A version number is a CLAIM ABOUT A BUILD; the matrix is a MEASUREMENT OF
// WHAT THAT BUILD EXPOSES. `compat.ts`'s header records why the difference is
// load-bearing: Phase 0 measured 100 globals inside Caido 0.57.1 while the type
// package declares roughly six, so a type package is not a capability list. The
// matrix is the thing somebody debugging a refusing build actually needs to
// read, and it is the reason the refusal path registers `getCompat` at all.
//
// ===========================================================================
// THE TWO STRINGS ON THIS SURFACE THAT DEFMINER DID NOT AUTHOR WORD FOR WORD
// ===========================================================================
// `reason` and each probe's `error` are PLUGIN-GENERATED — built by `compat.ts`
// from DefMiner-authored sentences with a host-reported version or a caught
// `TypeError` message interpolated. Neither carries a target byte: a surface
// probe never touches a response, and the version comes from `sdk.runtime`. They
// are still routed through the display path and rendered in their own
// `font-mono` element, for the reason `api/client.ts` gives about `SurfaceProbe`:
// "carries no target byte" is a claim about today's probe list, and the display
// path costs nothing to keep in front of it. `forPanel` rather than `forCell`,
// because the cell cap is 256 graphemes and the refusal reasons run past it —
// truncating the explanation of a refusal at the point it starts naming the
// missing surfaces would defeat the surface.

import { computed } from "vue";

import type { CompatReport, SurfaceProbe } from "../api/client";
import { forPanel, truncationNotice } from "../safety/display";

import {
  DETECTED_CAIDO_LABEL,
  DETECTED_SQLITE_LABEL,
  DIAGNOSTIC_TEXT_CLASS,
  MIN_CAIDO_LABEL,
  MIN_SQLITE_LABEL,
  PROBE_ERROR_LABEL,
  REASON_HEADING,
  REFUSAL_BODY,
  REFUSAL_HEADING,
  SURFACE_MISSING,
  SURFACE_PRESENT,
  SURFACES_HEADING,
  SURFACES_NOTE,
  UNKNOWN_VERSION,
  VERSIONS_HEADING,
} from "./compat-contract";

const { report } = defineProps<{
  /**
   * COMPAT-02's report, or `null` while it has not been read.
   *
   * `null` IS NOT "COMPATIBLE". It is "not yet known", and the surface renders
   * nothing for it — an operator on a healthy build must never see a refusal
   * flash between mount and the first answer, because a refusal that appears and
   * disappears is a refusal they will remember and act on.
   */
  report: CompatReport | null;
}>();

/**
 * Whether to render at all.
 *
 * EXPLICITLY `compatible === false`, never `!compatible`. `null` and
 * `undefined` are both falsy and both mean "no answer"; a negation would turn a
 * missing field into a refusal banner on a build that is running fine.
 */
const refusing = computed<boolean>(
  () => report !== null && report.compatible === false,
);

/** The reason, through the display path and capped at the panel's 2,048. */
const reason = computed<{ text: string; notice: string | undefined } | null>(
  () => {
    if (report === null || report.reason === null) return null;
    const displayed = forPanel(report.reason);
    return { text: displayed.text, notice: truncationNotice(displayed) };
  },
);

const probes = computed<readonly SurfaceProbe[]>(() => report?.surfaces ?? []);

/** A version, or the words that say none was reported. A BLANK CELL WOULD HIDE
 *  the very fact that caused the refusal being explained above it — "reports no
 *  version at all" is one of `checkCompat`'s own refusal reasons. */
function version(value: string | null): string {
  return value === null || value === "" ? UNKNOWN_VERSION : value;
}

/** One probe's own error text, through the same display path. The backend caps
 *  it at 160 characters already; this is the second cap, not the only one. */
function probeError(error: string): string {
  return forPanel(error).text;
}

function probeId(name: string): string {
  return "defminer-compat-surface-" + name.split(".").join("-");
}

// NO COMMENT AT THE TOP OF THE `<template>`: a comment there is a node, which
// makes the component a fragment and leaves every root-class assertion reading
// `[]` (the trap safety/HighlightSlices.vue records).
</script>

<template>
  <section
    v-if="refusing && report !== null"
    class="flex flex-col gap-4 border border-danger-500 p-4"
    role="alert"
    aria-live="assertive"
    data-defminer-compat-refusal
  >
    <div class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold leading-snug text-danger-500">
        {{ REFUSAL_HEADING }}
      </h2>
      <p>{{ REFUSAL_BODY }}</p>
    </div>

    <!-- THE REASON, IN ITS OWN DEDICATED ELEMENT. The copywriting rule that
         outranks the copy table: a plugin-generated string is never interpolated
         into a DefMiner sentence — it gets an element of its own, in mono, with
         the display path in front of it. -->
    <div v-if="reason !== null" class="flex flex-col gap-1">
      <h3 class="text-xs font-semibold">{{ REASON_HEADING }}</h3>
      <p :class="DIAGNOSTIC_TEXT_CLASS" data-defminer-compat-reason>
        {{ reason.text }}
      </p>
      <p v-if="reason.notice !== undefined" class="text-xs text-surface-400">
        {{ reason.notice }}
      </p>
    </div>

    <!-- BOTH MINIMUMS AND BOTH DETECTED VALUES. The minimums alone would tell
         the operator what DefMiner wants; the pair tells them what to change. -->
    <div class="flex flex-col gap-1" data-defminer-compat-versions>
      <h3 class="text-xs font-semibold">{{ VERSIONS_HEADING }}</h3>
      <dl class="flex flex-col gap-1">
        <div class="flex gap-2">
          <dt class="text-xs font-semibold">{{ MIN_CAIDO_LABEL }}</dt>
          <dd class="font-mono">{{ report.minCaido }}</dd>
        </div>
        <div class="flex gap-2">
          <dt class="text-xs font-semibold">{{ DETECTED_CAIDO_LABEL }}</dt>
          <dd class="font-mono">{{ version(report.caidoVersion) }}</dd>
        </div>
        <div class="flex gap-2">
          <dt class="text-xs font-semibold">{{ MIN_SQLITE_LABEL }}</dt>
          <dd class="font-mono">{{ report.minSqlite }}</dd>
        </div>
        <div class="flex gap-2">
          <dt class="text-xs font-semibold">{{ DETECTED_SQLITE_LABEL }}</dt>
          <dd class="font-mono">{{ version(report.sqliteVersion) }}</dd>
        </div>
      </dl>
    </div>

    <!-- THE SURFACE MATRIX. Rendered whether or not it is empty of failures:
         on the isolation refusal path every probe passes, and an operator
         reading a full matrix beside a refusal learns something true — the
         build is fine and the refusal is about something else. -->
    <div class="flex flex-col gap-2" data-defminer-compat-surfaces>
      <h3 class="text-xs font-semibold">{{ SURFACES_HEADING }}</h3>
      <p class="text-surface-400">{{ SURFACES_NOTE }}</p>
      <ul class="flex flex-col gap-1">
        <li
          v-for="probe in probes"
          :id="probeId(probe.name)"
          :key="probe.name"
          class="flex flex-col gap-1"
        >
          <div class="flex items-center gap-2">
            <!-- COLOUR IS NEVER THE SOLE CARRIER OF MEANING. The word is the
                 carrier; the tint is the redundant half. -->
            <span
              class="text-xs font-semibold"
              :class="probe.ok ? 'text-surface-400' : 'text-danger-500'"
              >{{ probe.ok ? SURFACE_PRESENT : SURFACE_MISSING }}</span
            >
            <span class="font-mono whitespace-pre overflow-hidden">{{
              probe.name
            }}</span>
            <span class="text-xs text-surface-400">{{ probe.scope }}</span>
          </div>
          <p v-if="probe.error !== null" class="text-xs">
            <span class="text-surface-400">{{ PROBE_ERROR_LABEL }}</span>
            <span :class="DIAGNOSTIC_TEXT_CLASS">{{
              probeError(probe.error)
            }}</span>
          </p>
        </li>
      </ul>
    </div>
  </section>
</template>
