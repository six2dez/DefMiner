// packages/frontend/src/components/settings-contract.ts — UI-08's copy, its
// provenance vocabulary, and the left-truncating server-path rule.
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
// `Record<SettingKey, …>` and `Record<BoundRejection, …>` are `Record`s over
// closed unions declared in @defminer/engine/contract, so a key or a rejection
// reason added by a later phase is a TYPECHECK FAILURE here rather than a field
// that renders with a blank label or an error that renders as nothing. That is
// the whole growth mechanism for this surface: it grows by addition, and the
// addition cannot be half-done.
//
// ===========================================================================
// THE RULE THAT OUTRANKS THE COPY TABLE APPLIES TO EVERY STRING BELOW
// ===========================================================================
// No copy on this page contains an interpolated target-controlled string inside
// a sentence. Nothing on this surface is target-controlled at all: the keys and
// groups are DefMiner-authored identifiers, and the three values are strings the
// OPERATOR typed or this plugin documented. The one string that is neither is a
// filesystem path belonging to the HOST, and R5 below is the rule for it.

import type {
  BoundRejection,
  SettingKey,
  SettingScope,
  SettingsGroup,
} from "@defminer/engine/contract";
import {
  AUDIT_RETENTION_MAX_ROWS_KEY,
  RETENTION_MAX_AGE_MS_KEY,
  RETENTION_MAX_ROWS_KEY,
} from "@defminer/engine/contract";

import { forCellText } from "../safety/display";

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
export const FIELD_COPY: Record<SettingKey, FieldCopy> = {
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
 * How a filesystem path is labelled on this surface.
 *
 * 05-UI-SPEC.md R5: any path the settings surface displays is labelled "on the
 * Caido server" and is NEVER presented as a path on the operator's machine.
 * Caido is client/server — the backend may be a remote VPS or a container — so a
 * server path shown as a local one sends the operator looking on the wrong disk,
 * and on a remote deployment there is no such file on their machine at all.
 */
export const SERVER_PATH_LABEL = "on the Caido server";

/** The storage note, which renders whether or not a path is available. */
export const STORAGE_NOTE =
  "DefMiner's database lives on the Caido server, not on this machine. On a remote or containerised Caido that is a different disk from the one you are reading this on.";

/** UISEC-03's affordance, reused here: the full value reaches the clipboard and
 *  never the document. */
export const COPY_PATH_LABEL = "Copy full path";

/** Said after a successful copy. A state, not a toast that disappears. */
export const COPIED_LABEL = "Copied";

/** Said when the clipboard is unavailable. `display.ts` refuses to fall back to
 *  the `execCommand` path, because that one copies by putting the full value
 *  into the document and R2 forbids the untruncated value ever entering it. */
export const COPY_FAILED_LABEL = "Clipboard unavailable";

/**
 * How many characters of a path are shown before it is cut.
 *
 * Not one of the two grapheme caps in `@defminer/engine/sanitise`: those bound
 * TARGET-CONTROLLED text in a table cell and in the evidence panel. This bounds
 * a host filesystem path in a settings row, which is a different subject at a
 * different width.
 */
export const PATH_DISPLAY_CHARS = 48;

/** What replaces the cut-off head of a path. A single character, so the cut is
 *  visible without the marker itself being mistaken for part of the path. */
export const PATH_ELISION = "…";

/**
 * Cut a path at its LEFT end, so the filename stays visible.
 *
 * THE DIRECTION IS THE WHOLE RULE. Paths differ at the end and agree at the
 * start — every plugin data file under one Caido install shares its first sixty
 * characters — so right-truncation shows the operator the part that is the same
 * for everything and hides the part that identifies the file.
 *
 * SANITISED FIRST, THEN CUT. `forCellText` strips C0/C1 controls and bidi
 * overrides and is grapheme-safe; a bidi override surviving into a path
 * rendered beside a copy action would be a path that reads as one thing and
 * copies as another. The path is the host's and not the target's, so this is
 * belt-and-braces rather than the primary control — which is exactly why it
 * costs nothing to keep in front of it.
 *
 * THE FULL VALUE IS NEVER PUT IN A `title`, A TOOLTIP OR A `data-*` ATTRIBUTE.
 * R2 is categorical about that, and the copy action is the only route to it.
 */
export function truncatePathLeft(path: string): string {
  const safe = forCellText(path);
  if (safe.length <= PATH_DISPLAY_CHARS) return safe;
  return PATH_ELISION + safe.slice(safe.length - PATH_DISPLAY_CHARS);
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
