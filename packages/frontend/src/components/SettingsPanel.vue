<script setup lang="ts">
// packages/frontend/src/components/SettingsPanel.vue — UI-08's surface, and the
// discharge of a debt Phase 1 wrote into the code.
//
// ===========================================================================
// WHAT THIS COMPONENT IS ACTUALLY FOR
// ===========================================================================
// `packages/backend/src/store/settings.ts` shipped with two comments recording
// what was owed here. The resolution is three levels deep "because Phase 5 will
// want an operator-wide default that a single project can override", and each
// retention default is deliberately conservative because "there is no UI to
// change this until Phase 5 (decision P1-D5), so a default that deletes
// aggressively would silently destroy the operator's history with no way to opt
// out". This is that UI. The defaults are unchanged — they were picked to be
// survivable without a way to change them, and a way to change them is not a
// reason to make them less survivable.
//
// ===========================================================================
// THREE RULES THAT ARE NOT PREFERENCES
// ===========================================================================
//   1. A GROUP WITH NO CONTROLS RENDERS NO SECTION. Not an empty labelled box:
//      that reads as a missing control, which is a different and worse claim
//      than an absent feature. The section list is derived from the KEYS THE
//      BACKEND RETURNED, which is why the key list lives there and is not
//      guessed here.
//   2. A FAILED SAVE KEEPS EVERY EDIT. The design contract is explicit and the
//      failure mode is a naive form reset: reverting the fields to their stored
//      values loses work AND reads as success. So the re-read happens on the
//      SUCCESS path only — never on a rejection and never on an RPC failure.
//   3. THE PROVENANCE IS VISIBLE. A three-level resolution the operator cannot
//      see is one they will misconfigure; they cannot otherwise tell a value
//      they set for this project from an operator-wide default from a number
//      DefMiner picked, and those three behave differently the moment one of
//      them changes elsewhere.
//
// ===========================================================================
// NOTHING ON THIS SURFACE IS TARGET-CONTROLLED
// ===========================================================================
// The keys and groups are DefMiner-authored identifiers and the three values are
// strings the OPERATOR typed or this plugin documented. That is why there is no
// `font-mono` obligation on the values and no display-path call on them — and it
// is worth stating, because "no mono here" would otherwise look like an
// oversight beside every other surface in this package. The ONE exception is a
// filesystem path, which belongs to the HOST rather than the target, and which
// R5 governs.

import type {
  SettingKey,
  SettingScope,
  SettingsGroup,
} from "@defminer/engine/contract";
import { SETTING_SCOPES, SETTINGS_GROUPS } from "@defminer/engine/contract";
import { computed, onMounted, ref } from "vue";

import type {
  RpcResult,
  SettingRow,
  SettingWriteOutcome,
  SettingWriteRequest,
} from "../api/client";
import { copyToClipboard } from "../safety/display";

import {
  CLEAR_LABEL,
  COPIED_LABEL,
  COPY_FAILED_LABEL,
  COPY_PATH_LABEL,
  FIELD_COPY,
  fieldId,
  GROUP_COPY,
  groupId,
  LOAD_FAILED_BODY,
  LOADING_LABEL,
  type Provenance,
  PROVENANCE_COPY,
  REJECTION_COPY,
  SAVE_FAILED_BODY,
  SAVE_LABEL,
  SAVING_LABEL,
  SCOPE_COPY,
  SERVER_PATH_LABEL,
  STORAGE_NOTE,
  truncatePathLeft,
} from "./settings-contract";
import { FOCUS_RING_CLASS } from "./table-contract";

const { projectId, load, save, storagePath } = defineProps<{
  /**
   * The project id the panel asks under.
   *
   * DELIBERATELY NOT THE ANSWER TO "WHICH PROJECT". The backend discards the
   * caller's `projectId` and substitutes its own lifecycle-resolved value on
   * both the read and the write — trusting the field would let anything holding
   * the RPC handle read and rewrite ANOTHER project's retention bounds out of
   * the one shared SQLite file (threats T-05-34, T-05-67). It is a required
   * field on a request whose scope the server decides.
   */
  projectId: string;
  /** Read every known key with its three levels. Answers a VALUE on every path
   *  — a component that had to catch is a component whose failure Caido
   *  swallows. */
  load: () => Promise<RpcResult<readonly SettingRow[]>>;
  /** Write one setting at one scope, or clear it with a `null` value. */
  save: (
    request: SettingWriteRequest,
  ) => Promise<RpcResult<SettingWriteOutcome>>;
  /**
   * A filesystem path on the CAIDO SERVER, or `null` when none is available.
   *
   * `null` TODAY, AND FOR A STATED REASON RATHER THAN AN UNFINISHED ONE. No
   * endpoint supplies a server path, deliberately: `telemetry.ts` strips
   * `sdk.meta.path()` out of everything crossing the RPC because on every real
   * deployment it carries the operator's OS username, and `telemetry.spec.ts`
   * proves that closure at the RPC level rather than at the function. Adding a
   * path-bearing field would contradict a shipped, gated decision, and
   * DEPLOY-02 (Phase 6) is where a server-storage surface belongs.
   *
   * The RULE is honoured now because it is free now and expensive later
   * (05-UI-SPEC.md R5 says so in as many words): when a path does arrive, it
   * arrives into a renderer that already labels it, already cuts it from the
   * left, already keeps it out of every attribute and already routes the full
   * value through the clipboard alone.
   */
  storagePath: string | null;
}>();

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------

const rows = ref<readonly SettingRow[]>([]);
const loading = ref(true);
const loadFailed = ref(false);

/**
 * The operator's UNSAVED edits, by key.
 *
 * SEPARATE FROM `rows`, AND THAT SEPARATION IS RULE 2. A field with a draft
 * renders the draft; a field without one renders the stored value. So a re-read
 * that lands while another field is mid-edit cannot touch it, and a failure path
 * that does not re-read cannot touch anything at all. A design that bound the
 * inputs straight to `rows` would make "keep the operator's edits" a thing that
 * has to be remembered at every write site rather than a property of the shape.
 */
const drafts = ref<Map<SettingKey, string>>(new Map());

/** The scope each field will write at. Initialised to the narrower of the two,
 *  which is `SETTING_SCOPES[0]` rather than a literal: the order is the safety
 *  property, and a positional mistake must land on "this project only". */
const scopes = ref<Map<SettingKey, SettingScope>>(new Map());

/** The key whose write is in flight, or `null`. PER FIELD, not per form: three
 *  independent writes, and locking all three would lock two fields nobody is
 *  writing. */
const saving = ref<SettingKey | null>(null);

/** Why the last write for this key did not land. Cleared when it does. */
const failures = ref<Map<SettingKey, string>>(new Map());

const copyState = ref<"idle" | "copied" | "failed">("idle");

// ---------------------------------------------------------------------------
// READING
// ---------------------------------------------------------------------------

async function reload(): Promise<void> {
  const result = await load();
  if (!result.ok) {
    // AN EXPLICIT FAILURE, NEVER AN EMPTY FORM. An empty settings surface means
    // "this build has no settings", and presenting a read failure that way tells
    // the operator the opposite of the truth about what they are looking at.
    loadFailed.value = true;
    loading.value = false;
    return;
  }
  loadFailed.value = false;
  rows.value = result.value;
  loading.value = false;
}

onMounted(() => {
  // Not awaited in an async hook: the section chrome must be on screen before
  // this resolves, and `load` answers with a VALUE on every path so the failure
  // is a rendered state rather than a rejection Caido would swallow.
  void reload();
});

// ---------------------------------------------------------------------------
// DERIVED
// ---------------------------------------------------------------------------

/**
 * The groups that HAVE controls, in the vocabulary's declaration order.
 *
 * A group with zero returned keys is absent from this list and therefore renders
 * no section. Order is `SETTINGS_GROUPS`'s and is never sorted at runtime, so a
 * section does not move under an operator who reaches for it by position.
 */
const groups = computed<readonly SettingsGroup[]>(() =>
  SETTINGS_GROUPS.filter((group) =>
    rows.value.some((row) => row.group === group),
  ),
);

function fieldsIn(group: SettingsGroup): readonly SettingRow[] {
  return rows.value.filter((row) => row.group === group);
}

/** Which of the three levels supplied the value in force. */
function provenanceOf(row: SettingRow): Provenance {
  if (row.project !== null) return "project";
  if (row.global !== null) return "global";
  return "documented";
}

/** The value in force, by the SAME order the backend resolves in. */
function storedValue(row: SettingRow): string {
  if (row.project !== null) return row.project;
  if (row.global !== null) return row.global;
  return row.documented;
}

/** What clearing this project's override would leave in force. Stated on the
 *  action BEFORE it is pressed: a fallback the operator discovers afterwards is
 *  a fallback they did not choose. */
function fallbackValue(row: SettingRow): string {
  return row.global ?? row.documented;
}

function valueOf(row: SettingRow): string {
  return drafts.value.get(row.key) ?? storedValue(row);
}

function scopeOf(key: SettingKey): SettingScope {
  return scopes.value.get(key) ?? SETTING_SCOPES[0];
}

function failureOf(key: SettingKey): string | undefined {
  return failures.value.get(key);
}

/**
 * Read the typed value off an input event WITHOUT naming a DOM type.
 *
 * TWO CONSTRAINTS MEET HERE AND EACH RULES OUT THE OBVIOUS ANSWER. A TypeScript
 * cast inside a `<template>` (`($event.target as HTMLInputElement).value`) is a
 * PARSE ERROR to vue-eslint-parser, and naming `HTMLInputElement` in a `.vue`
 * script fails the lint program, which carries no DOM lib — the same wall
 * `safety/display.ts`'s `copyToClipboard` and `export-download.ts` both
 * document. So the event is taken as `unknown` and narrowed STRUCTURALLY, which
 * is true under both programs.
 */
function onInput(key: SettingKey, event: unknown): void {
  const target = (event as { target?: { value?: unknown } } | null)?.target;
  setDraft(key, typeof target?.value === "string" ? target.value : "");
}

function setDraft(key: SettingKey, value: string): void {
  const next = new Map(drafts.value);
  next.set(key, value);
  drafts.value = next;
}

function setScope(key: SettingKey, scope: SettingScope): void {
  const next = new Map(scopes.value);
  next.set(key, scope);
  scopes.value = next;
}

function setFailure(key: SettingKey, message: string | undefined): void {
  const next = new Map(failures.value);
  if (message === undefined) next.delete(key);
  else next.set(key, message);
  failures.value = next;
}

function scopeRadioId(key: SettingKey, scope: SettingScope): string {
  return `${fieldId(key)}-scope-${scope}`;
}

// ---------------------------------------------------------------------------
// WRITING
// ---------------------------------------------------------------------------

/**
 * Write one field, or clear it.
 *
 * THE RE-READ IS ON THE SUCCESS PATH ONLY. That placement IS rule 2: a re-read
 * after a rejection or an RPC failure would replace the operator's edits with
 * the stored values, which loses their work and reads as success. On the way
 * out of a successful write the draft is DROPPED rather than overwritten, so
 * the field falls back to whatever the re-read actually stored — which is not
 * always what was typed, because a fractional bound is floored.
 */
async function commit(row: SettingRow, value: string | null): Promise<void> {
  // THE DOUBLE-SUBMIT GUARD, AT THE HANDLER. The disabled attribute is what the
  // operator sees; this is what holds when anything else calls in.
  if (saving.value !== null) return;
  saving.value = row.key;
  setFailure(row.key, undefined);

  const result = await save({
    projectId,
    scope: value === null ? "project" : scopeOf(row.key),
    key: row.key,
    value,
  });

  saving.value = null;

  if (!result.ok) {
    // THE RPC ITSELF FAILED. Nothing was stored, every edit stays, and no
    // re-read happens.
    setFailure(row.key, SAVE_FAILED_BODY);
    return;
  }
  if (!result.value.ok) {
    // THE BOUND WAS REFUSED. The typed value stays in the field — it is what
    // the operator has to correct, and replacing it with the stored value would
    // hide what they got wrong.
    setFailure(row.key, REJECTION_COPY[result.value.reason]);
    return;
  }

  const next = new Map(drafts.value);
  next.delete(row.key);
  drafts.value = next;
  await reload();
}

function onSave(row: SettingRow): void {
  void commit(row, valueOf(row));
}

/** Clear this project's override. A write of ABSENCE, always at the project
 *  scope: clearing the operator-wide default is not something a per-project
 *  field should be able to do by accident. */
function onClear(row: SettingRow): void {
  void commit(row, null);
}

// ---------------------------------------------------------------------------
// R5 — THE ONE UNBOUNDED STRING
// ---------------------------------------------------------------------------

const shownPath = computed<string | null>(() =>
  storagePath === null ? null : truncatePathLeft(storagePath),
);

/** The full value reaches the CLIPBOARD and never the document. `display.ts`
 *  refuses to fall back to the `execCommand` route for exactly that reason, so
 *  the unavailable case is a rendered state rather than a silent degradation. */
async function onCopyPath(): Promise<void> {
  if (storagePath === null) return;
  try {
    await copyToClipboard(storagePath);
    copyState.value = "copied";
  } catch {
    copyState.value = "failed";
  }
}

const copyLabel = computed<string>(() => {
  if (copyState.value === "copied") return COPIED_LABEL;
  if (copyState.value === "failed") return COPY_FAILED_LABEL;
  return COPY_PATH_LABEL;
});

// NO COMMENT AT THE TOP OF THE `<template>`: a comment there is a node, which
// makes the component a fragment and leaves every root-class assertion reading
// `[]` (the trap safety/HighlightSlices.vue records).
</script>

<template>
  <div class="flex flex-col gap-6 overflow-y-auto" data-defminer-settings>
    <p v-if="loading" class="text-surface-400">{{ LOADING_LABEL }}</p>

    <!-- A READ FAILURE IS SAID IN WORDS. Never an empty form, which would mean
         "this build has no settings". -->
    <p
      v-else-if="loadFailed"
      class="border border-danger-500 px-2 py-1 text-danger-500"
      role="alert"
      data-defminer-settings-load-failed
    >
      {{ LOAD_FAILED_BODY }}
    </p>

    <!-- ONE SECTION PER GROUP THAT HAS CONTROLS, AND NOTHING FOR ONE THAT DOES
         NOT. `groups` is derived from the keys the backend returned, so a phase
         that has shipped no toggle contributes no empty labelled box. -->
    <section
      v-for="group in groups"
      :id="groupId(group)"
      :key="group"
      class="flex flex-col gap-6 border border-surface-600 p-6"
    >
      <div class="flex flex-col gap-1">
        <h2 class="text-lg font-semibold leading-snug">
          {{ GROUP_COPY[group].title }}
        </h2>
        <p class="text-surface-400">{{ GROUP_COPY[group].blurb }}</p>
      </div>

      <div
        v-for="row in fieldsIn(group)"
        :id="`${fieldId(row.key)}-field`"
        :key="row.key"
        class="flex flex-col gap-2"
      >
        <label :for="fieldId(row.key)" class="text-xs font-semibold">{{
          FIELD_COPY[row.key].label
        }}</label>

        <div class="flex items-center gap-2">
          <input
            :id="fieldId(row.key)"
            type="text"
            inputmode="numeric"
            :class="[
              FOCUS_RING_CLASS,
              'border border-surface-600 bg-surface-900 px-2 py-1',
            ]"
            :value="valueOf(row)"
            @input="onInput(row.key, $event)"
          />
          <span class="text-xs text-surface-400">{{
            FIELD_COPY[row.key].unit
          }}</span>
          <!-- THE PROVENANCE, IN WORDS. Colour is never the sole carrier of
               meaning, so this is a sentence and not a tint. -->
          <span
            :id="`${fieldId(row.key)}-provenance`"
            class="text-xs text-surface-400"
            >{{ PROVENANCE_COPY[provenanceOf(row)] }}</span
          >
        </div>

        <!-- BOTH SCOPES, EXPLICIT, WITH NO DEFAULT LEFT TO A POSITION. A write
             that lands operator-wide by accident changes every project. -->
        <fieldset class="flex items-center gap-2 border-0 p-0">
          <legend class="sr-only">
            {{ FIELD_COPY[row.key].label }}
          </legend>
          <label
            v-for="scope in SETTING_SCOPES"
            :key="scope"
            class="flex items-center gap-1 text-xs"
            :for="scopeRadioId(row.key, scope)"
          >
            <input
              :id="scopeRadioId(row.key, scope)"
              type="radio"
              :name="`${fieldId(row.key)}-scope`"
              :class="FOCUS_RING_CLASS"
              :checked="scopeOf(row.key) === scope"
              @change="setScope(row.key, scope)"
            />
            {{ SCOPE_COPY[scope] }}
          </label>
        </fieldset>

        <p class="text-surface-400">{{ FIELD_COPY[row.key].help }}</p>

        <div class="flex items-center gap-2">
          <!-- A TEXT LABEL, never an icon. In flight it takes its OWN label and
               is disabled; the handler refuses a second call regardless. -->
          <button
            :id="`${fieldId(row.key)}-save`"
            type="button"
            :class="[
              FOCUS_RING_CLASS,
              'border border-surface-600 px-2 py-1 text-xs font-semibold',
            ]"
            :disabled="saving === row.key"
            @click="onSave(row)"
          >
            {{ saving === row.key ? SAVING_LABEL : SAVE_LABEL }}
          </button>

          <!-- OFFERED ONLY WHEN THERE IS AN OVERRIDE TO CLEAR, and it states
               the value it would fall back to before it is pressed. -->
          <button
            v-if="row.project !== null"
            :id="`${fieldId(row.key)}-clear`"
            type="button"
            :class="[
              FOCUS_RING_CLASS,
              'border border-surface-600 px-2 py-1 text-xs font-semibold',
            ]"
            :disabled="saving === row.key"
            @click="onClear(row)"
          >
            {{ CLEAR_LABEL }} ({{ fallbackValue(row) }})
          </button>
        </div>

        <p
          v-if="failureOf(row.key) !== undefined"
          :id="`${fieldId(row.key)}-failure`"
          class="text-danger-500"
          role="alert"
        >
          {{ failureOf(row.key) }}
        </p>
      </div>
    </section>

    <!-- R5 — SERVER-SIDE STORAGE LABELLING. The note renders whether or not a
         path is available, because "the database is not on your machine" is
         true and useful on its own; the path element renders only when there is
         a path to render. -->
    <section
      class="flex flex-col gap-2 border border-surface-600 p-6"
      data-defminer-server-path
    >
      <h2 class="text-lg font-semibold leading-snug">
        Storage {{ SERVER_PATH_LABEL }}
      </h2>
      <p class="text-surface-400">{{ STORAGE_NOTE }}</p>
      <div v-if="shownPath !== null" class="flex items-center gap-2">
        <!-- CUT AT THE LEFT END so the filename stays visible, `font-mono` so a
             lookalike character is legible, and NO `title` and no `data-*`
             carrying the full value — the copy action is the only route to it. -->
        <span
          class="whitespace-pre overflow-hidden font-mono"
          data-defminer-server-path-value
          >{{ shownPath }}</span
        >
        <button
          type="button"
          :class="[
            FOCUS_RING_CLASS,
            'border border-surface-600 px-2 py-1 text-xs font-semibold',
          ]"
          data-defminer-server-path-copy
          @click="void onCopyPath()"
        >
          {{ copyLabel }}
        </button>
      </div>
    </section>
  </div>
</template>
