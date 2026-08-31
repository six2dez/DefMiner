// packages/frontend/src/components/settings-contract.ts — UI-08's copy, its
// provenance vocabulary, and DEPLOY-02's storage statement.
//
// ===========================================================================
// WHY THE COPY LIVES HERE AND NOT IN THE COMPONENT
// ===========================================================================
// The argument `panel-contract.ts` and `export-contract.ts` both make: a string
// typed into a template is a string a spec has to retype to assert, and two
// typings of one sentence are two sentences.
//
// ===========================================================================
// THE HELP TEXT IS NOT INVENTED HERE — IT IS CARRIED
// ===========================================================================
// Each retention bound already has a paragraph in
// `packages/backend/src/store/settings.ts` explaining why its default is
// conservative and what the consequence of changing it is: this database is the
// ONLY bound on its own growth, Caido never garbage-collects it, it is not
// deleted when a project is deleted, and it survives a force-reinstall. That is
// exactly what an operator needs to know before raising or lowering the number,
// and it was already written. What is below is that reasoning carried into the
// interface, not a fresh summary of it.
//
// ===========================================================================
// EVERY MAP HERE IS EXHAUSTIVE OVER A SHARED VOCABULARY, DELIBERATELY
// ===========================================================================
// `Record<OperatorSettingKey, …>` and `Record<BoundRejection, …>` are `Record`s
// over closed unions declared in @defminer/engine/contract, so a key or a
// rejection reason added by a later phase is a TYPECHECK FAILURE here rather
// than a field that renders with a blank label or an error that renders as
// nothing. That is the whole growth mechanism for this surface: it grows by
// addition, and the addition cannot be half-done.
//
// OVER `OperatorSettingKey` AND NOT `SettingKey`, AS OF PLAN 06-08. The closed
// list now holds a second kind of key — internal durable state the backend
// writes to observe whether its own database survives a restart (O-02, D-19) —
// and that kind is never rendered, so it never owes copy. The exhaustiveness
// obligation is unchanged for the kind it was written for.
//
// ===========================================================================
// THE RULE THAT OUTRANKS THE COPY TABLE APPLIES TO EVERY STRING BELOW
// ===========================================================================
// No copy on this page contains an interpolated target-controlled string inside
// a sentence. Nothing on this surface is target-controlled at all: the keys and
// groups are DefMiner-authored identifiers, and the three values are strings the
// OPERATOR typed or this plugin documented.
//
// AND AS OF PLAN 06-08 THERE IS NO UNBOUNDED STRING ON THIS SURFACE AT ALL.
// Phase 5 recorded that "the one string that is neither is a filesystem path
// belonging to the HOST", and specified left-truncation, no `title` and
// clipboard-only access for it. D-19 deletes the path, so every string here is
// now a bounded DefMiner-authored sentence, an operator-typed value or a grouped
// integer. R5's RULE survives its implementation's deletion and binds any later
// phase that displays a path.

import type {
  BoundRejection,
  OperatorSettingKey,
  SettingKey,
  SettingScope,
  SettingsGroup,
} from "@defminer/engine/contract";
import {
  AUDIT_RETENTION_MAX_ROWS_KEY,
  RETENTION_MAX_AGE_MS_KEY,
  RETENTION_MAX_ROWS_KEY,
} from "@defminer/engine/contract";

import { counted, groupThousands } from "./table-contract";

// ---------------------------------------------------------------------------
// SECTIONS
// ---------------------------------------------------------------------------

/** One settings section's heading and its one-line subject.
 *
 * @internal
 */
export type GroupCopy = {
  readonly title: string;
  readonly blurb: string;
};

/**
 * One section per shipped group, and NOTHING for a group with no controls.
 *
 * The panel derives which sections to render from the KEYS THE BACKEND
 * RETURNED, not from this map — a group listed here with zero controls renders
 * no section at all. 05-UI-SPEC.md's `empty / settings-form` row is explicit:
 * an empty labelled box implies a missing control, which is a different and
 * worse claim than an absent feature.
 */
export const GROUP_COPY: Record<SettingsGroup, GroupCopy> = {
  retention: {
    title: "Retention",
    blurb:
      "How much history DefMiner keeps. These bounds are the only limit on this database's growth.",
  },
};

// ---------------------------------------------------------------------------
// FIELDS
// ---------------------------------------------------------------------------

/** One field's label, its unit, and the reasoning behind its default.
 *
 * @internal
 */
export type FieldCopy = {
  readonly label: string;
  /** The unit the stored number is in. Rendered beside the input, because the
   *  stored value is the number the sweep obeys and this surface does not
   *  convert it — see {@link FIELD_COPY}. */
  readonly unit: string;
  readonly help: string;
};

/**
 * The three fields this build has, with the rationale from the shipped code.
 *
 * NO UNIT CONVERSION, AND THAT IS A DECISION RATHER THAN LAZINESS. The age bound
 * is stored and obeyed in MILLISECONDS, and a surface that showed it in days
 * would have to convert on the way in and on the way out. A conversion bug on
 * this particular number does not produce a wrong label — it produces a sweep
 * that deletes ninety times too much, on the one mechanism in this plugin that
 * deletes anything. The number the operator sees is the number the sweep obeys.
 */
export const FIELD_COPY: Record<OperatorSettingKey, FieldCopy> = {
  [RETENTION_MAX_ROWS_KEY]: {
    label: "Maximum rows per table, per project",
    unit: "rows",
    help: "Retention is the only bound on this database's growth: Caido never garbage-collects it, does not delete it when a project is deleted, and it survives a force-reinstall. The default errs high because a bound that deletes aggressively destroys history you cannot get back.",
  },
  [RETENTION_MAX_AGE_MS_KEY]: {
    label: "Maximum row age",
    unit: "milliseconds",
    help: "Rows older than this are swept. This bound and the row bound both apply, and whichever binds first wins — a project under the row cap can still hold rows past the age cap. The default is 90 days.",
  },
  [AUDIT_RETENTION_MAX_ROWS_KEY]: {
    label: "Maximum audit rows, per project",
    unit: "rows",
    help: "The audit log records what you projected and what you exported, and it is bounded by rows alone — there is deliberately no age bound on it. Those questions get asked long after 90 days, about actions that cannot be undone. The default is four times the per-table bound for exactly that reason.",
  },
};

// ---------------------------------------------------------------------------
// PROVENANCE — WHICH OF THE THREE LEVELS IS IN FORCE
// ---------------------------------------------------------------------------

/** Which level supplied the value currently in force. */
export type Provenance = "project" | "global" | "documented";

/**
 * What each level reads as beside the field.
 *
 * A THREE-LEVEL RESOLUTION THE OPERATOR CANNOT SEE IS ONE THEY WILL
 * MISCONFIGURE. Without this they cannot tell a value they set for this project
 * from an operator-wide default from a number DefMiner picked — and those three
 * behave differently the moment they change one of them elsewhere.
 */
export const PROVENANCE_COPY: Record<Provenance, string> = {
  project: "Set for this project",
  global: "From your operator-wide default",
  documented: "DefMiner's default",
};

/** What each scope's write does, said in words rather than left to a position. */
export const SCOPE_COPY: Record<SettingScope, string> = {
  project: "This project only",
  global: "All projects (operator-wide default)",
};

// ---------------------------------------------------------------------------
// ACTIONS AND STATES
// ---------------------------------------------------------------------------

/** The save action at rest. */
export const SAVE_LABEL = "Save";

/**
 * The save action in flight. ITS OWN LABEL, not a spinner beside the old one.
 *
 * 05-UI-SPEC.md's `loading / settings-form` row: save enters a disabled
 * in-flight state with its own label and cannot be double-submitted.
 */
export const SAVING_LABEL = "Saving…";

/** Clear this project's override and fall back to the next level down. */
export const CLEAR_LABEL = "Clear this project's override";

/** The heading a section carries while the first read is in flight. */
export const LOADING_LABEL = "Loading settings…";

/**
 * What a failed READ says.
 *
 * AN EXPLICIT FAILURE, NEVER AN EMPTY FORM. An empty settings surface means
 * "this build has no settings", and presenting a load failure that way tells the
 * operator the opposite of the truth about what they are looking at — the same
 * argument the design contract makes about an errored suppressions list
 * rendering as empty.
 */
export const LOAD_FAILED_BODY =
  "Could not read settings. The DefMiner backend did not answer. Your stored settings are unchanged — nothing below has been applied.";

/**
 * What a failed WRITE says.
 *
 * IT SAYS THE EDITS ARE STILL THERE, because they are. 05-UI-SPEC.md's `error /
 * settings-form` row: a failed save names the cause and RETAINS the operator's
 * edits — it never silently discards them or reverts the fields to their stored
 * values, which would lose work and read as success.
 */
export const SAVE_FAILED_BODY =
  "Could not save. The DefMiner backend did not answer, so nothing was stored. Your edits are still in the fields below.";

/**
 * Why a bound was refused, one sentence per closed reason.
 *
 * SIX REASONS AND SIX SENTENCES. "0" gets its own because it is not a typo — it
 * is what somebody types when they mean "no limit", and that is the single most
 * dangerous thing they can mean about a bound on a database nothing else
 * garbage-collects. Telling them "invalid number" would answer a question they
 * did not ask.
 */
export const REJECTION_COPY: Record<BoundRejection, string> = {
  empty:
    "Enter a number. Leaving this blank does not remove the bound — use “Clear this project's override” for that.",
  "not-numeric": "That is not a number. Enter digits only.",
  "not-finite": "That number is too large to store. Enter a whole number.",
  zero: "A bound of 0 is not “no limit” — it would sweep everything on the next pass. Enter the number of rows you want to keep.",
  negative: "Enter a number above zero.",
  "no-project":
    "No project is open, so there is nothing to set this for. Open a project, or save this as your operator-wide default.",
  "write-failed": "The backend could not store this. Nothing was changed.",
};

// ---------------------------------------------------------------------------
// R5 — SERVER-SIDE STORAGE LABELLING
// ---------------------------------------------------------------------------

/**
 * ===========================================================================
 * D-19 — THE SETTINGS SURFACE NEVER SHOWS A PATH, AND NOW IT CANNOT
 * ===========================================================================
 *
 * WHAT USED TO BE HERE, AND WHY IT IS GONE. Phase 5 shipped a path renderer for
 * this section: a `SERVER_PATH_LABEL`, a copy action with its copied and
 * unavailable labels, a character bound, an elision character and a left-cutting
 * helper. All seven existed to render one string — a filesystem path on the
 * Caido server — and DEPLOY-02 says server-side storage is labelled as such and
 * NEVER presented as a path on the operator's machine.
 *
 * D-19 satisfies that by SUBTRACTION rather than by labelling. The operator
 * cannot reach a server path: on a remote or containerised Caido there is no
 * such file on the disk they are reading this on, and `sdk.meta.path()` carries
 * an OS username, which is exactly the string `telemetry.spec.ts`'s guard exists
 * to keep off the RPC. A path shown here would be a string that is useless at
 * best and identifying at worst.
 *
 * 05-UI-SPEC.md's R5 — "any filesystem path the Settings surface displays is
 * labelled 'on the Caido server'" — SURVIVES ITS IMPLEMENTATION'S DELETION. It
 * is vacuously satisfied by displaying none, and it binds any later phase that
 * displays one. And `05-VERIFICATION.md`'s DEPLOY-02 `behavior_unverified` item,
 * which names `App.vue`'s hardcoded null storage path, is CLOSED BY DELETION,
 * NOT BY SUPPLYING A VALUE.
 *
 * WHAT THE SURFACE SAYS INSTEAD: where the data lives, whether a restart has
 * ever been observed to lose it, and how much of each retention cap is used.
 */

/**
 * The storage section's heading. ONE AUTHORED CONSTANT.
 *
 * It replaces the shipped `"Storage " + SERVER_PATH_LABEL` composition, which
 * built a heading out of a label whose subject was a path. There is no path, so
 * there is no label, so the heading is a sentence somebody wrote.
 */
export const STORAGE_HEADING = "Storage on the Caido server";

/** The storage note, which renders whether or not a path is available. */
export const STORAGE_NOTE =
  "DefMiner's database lives on the Caido server, not on this machine. On a remote or containerised Caido that is a different disk from the one you are reading this on.";

/**
 * The ONE persistence sentence, and it is an OBSERVATION OF THE PAST.
 *
 * RENDERED ONLY WHEN EVIDENCE EXISTS (U6-2). Research O-02 established that the
 * backend cannot detect a persistent volume — the metadata path reveals OS
 * family and nothing about bind mounts, the OS module has no hostname accessor,
 * the process global does not load, and the container marker file is unreachable
 * under D-18 by construction. A persistence CLAIM would therefore be a
 * prediction, and it would be false on exactly the deployment shape the
 * DEPLOY-01 matrix tests: Docker without a volume.
 *
 * So the only sentence that renders is one about something that already
 * happened: a boot that found no durable marker where a previous boot wrote one.
 * With the flag clear, NOTHING renders in its place — an absent sentence claims
 * nothing, and "we have not observed a loss" is not "your data is safe".
 */
export const PERSISTENCE_OBSERVED_LOSS =
  "A previous restart of this Caido lost DefMiner's database, so this deployment does not keep data across restarts. Export anything you need to keep.";

// ---------------------------------------------------------------------------
// D-25 — WHAT DEFMINER IS STORING, AGAINST THE CAPS
// ---------------------------------------------------------------------------

/** The footprint block's heading. */
export const FOOTPRINT_HEADING = "What DefMiner is storing";

/** One footprint row's identity, its TERM and its noun in both numbers. */
export type FootprintRowCopy = {
  /** The stable half of the row's element id. */
  readonly id: "artifacts" | "observations" | "analyses";
  /**
   * What the row is ABOUT — the `<dt>` of a genuine term/definition pair, the
   * same shape `HealthPanel.vue`'s reference rows use.
   *
   * NOT A REPEAT OF THE NOUN. "Artifacts" beside "12,400 of 50,000 artifact
   * rows" would be one string said twice; the term names the thing and the
   * definition measures it.
   */
  readonly term: string;
  readonly singular: string;
  readonly plural: string;
};

/**
 * The three rows, IN THE ORDER THEY RENDER.
 *
 * DECLARATION ORDER IS THE RENDER ORDER and is never sorted at runtime, the same
 * rule `SETTINGS_GROUPS` and `KNOWN_SETTINGS` already follow: a row does not move
 * under an operator who reaches for it by position. Artifacts first because it is
 * the count the retention cap bites on first and the one a scan suspended by
 * D-08 is about.
 */
export const FOOTPRINT_ROWS: readonly FootprintRowCopy[] = Object.freeze([
  {
    id: "artifacts",
    term: "Scripts DefMiner has seen",
    singular: "artifact row",
    plural: "artifact rows",
  },
  {
    id: "observations",
    term: "Where it saw them",
    singular: "observation row",
    plural: "observation rows",
  },
  {
    id: "analyses",
    term: "Times it read them",
    singular: "analysis row",
    plural: "analysis rows",
  },
] as const);

/**
 * One footprint row's sentence: the count, the cap, the noun, and the age when
 * DefMiner has one.
 *
 * BOTH NUMBERS ALWAYS RENDER, including when they are equal. "50,000 of 50,000"
 * is the state an operator most needs to see — it is the one where the next
 * write evicts something — and collapsing it to one number would hide exactly
 * that.
 *
 * THE NOUN AGREES WITH THE CAP, which is the number it sits beside. `counted` is
 * the shipped helper and the only one permitted: 05-UI-SPEC.md forbids the
 * parenthesised "row(s)" suffix outright.
 *
 * THE AGE CLAUSE IS ABSENT RATHER THAN FABRICATED (U6-3). A `null` age is a
 * number DefMiner does not have — an empty table genuinely has no oldest row —
 * and the sentence ends at the count. Never "oldest 0 days", never a placeholder
 * character standing in for a number.
 */
export function footprintRowText(
  copy: FootprintRowCopy,
  count: number,
  cap: number,
  oldestDays: number | null,
): string {
  const head = `${groupThousands(count)} of ${counted(cap, copy.singular, copy.plural)}`;
  if (oldestDays === null) return head;
  return `${head}, oldest ${counted(oldestDays, "day", "days")}`;
}

/**
 * A stable element id for one footprint row.
 *
 * AN `id` AND NOT A `data-*` ATTRIBUTE, for the reason {@link groupId} states
 * below: the static gate reports ANY bound `data-*` binding categorically, and
 * the per-row hooks on this surface are ids.
 */
export function footprintRowId(copy: FootprintRowCopy): string {
  return "defminer-footprint-" + copy.id;
}

/**
 * A stable element id for one settings key.
 *
 * The keys are dotted (`retention.max_rows_per_table`), and a dot in an id is
 * legal HTML but is a class selector to every query written by hand. Replaced
 * once, here, rather than at each of the several call sites that would
 * otherwise each have to remember.
 */
export function fieldId(key: SettingKey): string {
  return "defminer-setting-" + key.split(".").join("-");
}

/**
 * A stable element id for one settings section.
 *
 * AN `id` AND NOT A `data-*` ATTRIBUTE, and that is R2 rather than taste. The
 * static gate in `frontend-safety.spec.ts` reports ANY bound `data-*` binding,
 * categorically — it does not ask whether the bound expression happens to be a
 * DefMiner-authored identifier, because an attribute escapes every text-node
 * protection R2 buys and a rule that asked would be a rule somebody argues
 * with. So the per-row hooks on this surface are ids, which is what the rest of
 * this package already uses for the same purpose.
 */
export function groupId(group: SettingsGroup): string {
  return "defminer-settings-group-" + group;
}
