// packages/engine/src/contract.ts — what the WORKSPACE needs from an entity
// table, declared by the only thing that reads it.
//
// ===========================================================================
// THIS IS A READ CONTRACT. IT IS NOT A STORAGE SCHEMA. (D-05(2))
// ===========================================================================
// `entities` and `evidence` do not exist. `EXPECTED_TABLES` in
// packages/backend/src/store/schema.spec.ts is the exact set
// ["analyses", "artifacts", "observations", "settings"], and adding a table is
// a deliberate two-place edit that was made an operator-visible decision at
// plan 01-01's one-way checkpoint. So nothing here defines a column, a key, a
// CHECK constraint or an index. PHASE 4 OWNS THE COLUMNS (plan 04-03) and
// PHASE 3 OWNS THE SIGNAL VOCABULARY (plan 03-03).
//
// What this module DOES declare is the shape those phases must hand the
// workspace: four columns in render order, a cursor tuple, an invalidation
// summary, a score-explanation frame and an evidence-panel frame. Phase 5 is
// the only consumer of all five, which is why writing them is Phase 5's job
// and not a guess made on Phase 4's behalf — 05-UI-SPEC.md § "Table contract"
// declined to invent an entity column list for exactly this reason, and
// inventing one here would be the same mistake wearing a type annotation.
//
// ===========================================================================
// A FRAME IS FIXED HERE. A VOCABULARY IS NOT. (UI-SPEC FLAG F1)
// ===========================================================================
// 05-UI-SPEC.md § "Checker Sign-Off" F1: "The evidence panel has no fixed
// frame for the score explanation... UI-03's artifact version and byte offsets
// are covered by R1 as a mechanism but never listed as mandatory panel fields."
// {@link EvidencePanelFrame} and {@link ScoreExplanation} are that frame. The
// SIGNAL IDS AND LABELS ARE PHASE 3'S; this file says what shape they arrive
// in, so Phase 3 binds to the frame instead of the UI guessing at the payload.
//
// ===========================================================================
// WHY THIS LIVES IN packages/engine (D-05(2))
// ===========================================================================
// Phases 3 and 4 must import it without acquiring a Caido dependency. The
// engine is SDK-free by construction and boundary.spec.ts holds that with four
// independent mechanisms (eslint scope, tsconfig `types`, an AST scan over
// every non-spec source, and a manifest assertion). A contract module in the
// backend would drag the SDK into the packages that implement it.
//
// TYPE-ONLY, DELIBERATELY. Everything below is a type, an `as const`
// vocabulary, or a derived predicate over one. There is no I/O and no
// behaviour to test, so contract.spec.ts asserts the things that can DRIFT —
// vocabulary membership, ordering, casing and exhaustiveness.

// ---------------------------------------------------------------------------
// THE SCAN-STATE VOCABULARY
// ---------------------------------------------------------------------------

/**
 * The closed `scan_state` vocabulary, enforced by a CHECK constraint in
 * migration step v2 (packages/backend/src/store/migrations.ts).
 *
 * MOVED HERE FROM packages/backend/src/store/analyses.ts BY PLAN 05-09, AND
 * THE REASON IS A RESOLUTION FACT RATHER THAN A PREFERENCE. The frontend must
 * bind its status badge to the SHIPPED values — 05-UI-SPEC.md § "Status
 * vocabulary" says so explicitly, and UI-09 turns it into a correctness rule:
 * a state added to the database with no badge here would render as nothing,
 * which is a degraded analysis silently presented as complete. But the
 * frontend package cannot import the backend package at all: the backend
 * imports `caido:*` specifiers that resolve only inside Caido's QuickJS, so a
 * dependency on it drags an unresolvable module graph into a browser build
 * (packages/frontend/src/backend.ts opens with the argument, and the backend's
 * own api/spec.ts keeps the specifier out of the frontend's source entirely).
 *
 * So the vocabulary is here, in the one module BOTH packages already import,
 * and `analyses.ts` consumes it rather than declaring it. That is strictly
 * better than the situation this replaces: {@link EntityLead}'s `state` field
 * had to be typed `string` and carry a paragraph explaining that it was
 * "really" a member of a vocabulary it could not name. It can name it now.
 *
 * `pending` is what makes the analyses table double as the DURABLE JOB QUEUE
 * that Phase 2's ERR-02 recovery and CORE-09 both need, for the cost of one
 * column: a `pending` row that survives a plugin restart IS the record that
 * work was claimed and never finished. OBS-02 formally owns this vocabulary in
 * Phase 2 — these values are picked now and must not be contradicted there.
 */
export const SCAN_STATES = [
  "pending",
  "running",
  "done",
  "partial",
  "failed",
] as const;

/** One scan state. Derived from {@link SCAN_STATES}, never restated. */
export type ScanState = (typeof SCAN_STATES)[number];

// ===========================================================================
// TWO VOCABULARIES, ONE WORD "SCAN", AND ONE SHARED MEMBER
// ===========================================================================
// READ THIS BEFORE TOUCHING EITHER LIST. `SCAN_STATES` above is the ANALYSIS
// state of one artifact — has this digest been through the detectors. The list
// immediately below is the LIFECYCLE state of a retroactive backfill — is that
// job running, paused, finished or thrown away. They are different closed
// vocabularies about different subjects, and `running` is a literal member of
// BOTH.
//
// The two declarations are adjacent DELIBERATELY, so the collision is visible
// at the point of declaration rather than discovered at a call site three
// packages away. Four more mechanisms keep them apart downstream and each is
// load-bearing: the database column is `state` and never `scan_state`
// (`analyses.scan_state` already exists and would have accepted the second
// vocabulary silently); no operator-facing label is shared OR is a prefix of
// another — `completed` renders as **Finished** and never "Completed", because
// the analysis vocabulary already ships "Complete" and a one-character
// difference between two states that mean opposite things is not a
// difference; the lifecycle gets its own presentation map, its own renderer
// and its own `data-defminer-*` marker rather than widening `StatusBadge`'s
// prop; and no surface renders both — the analysis state lives in an entity
// table's leading cell and in the evidence panel, the lifecycle state in the
// toolbar indicator and on the Scan tab.
//
// The temptation this note exists to refuse is merging them. They cannot be
// merged: `pending` and `partial` are meaningless for a backfill, `suspended`
// and `discarded` are meaningless for an analysis, and a union of the two
// would give the compiler nothing to check at exactly the sites where a wrong
// state is invisible.

/**
 * The four states a retroactive scan can be in (D-09, FIND-03).
 *
 * ORDER IS THE LIFECYCLE and it is also the order migration step v5 writes
 * into `CHECK (state IN (...))`, so a reordering here is a diff a reviewer can
 * put beside the DDL. The database's CHECK constraint is the ENFORCEMENT; this
 * array is the one declaration every surface binds to, and `scans.spec.ts`
 * reads the constraint back out of the schema and compares it member by member
 * rather than trusting the two to stay in step.
 *
 * ALL FOUR, THOUGH TWO HAVE NO CALLER IN THE TRACER. `completed` and
 * `discarded` are written by plans 06-05 and 06-09. They are here anyway for
 * the reason `AUDIT_KINDS` gives at length: an unused member costs nothing at
 * run time, while a MISSING one costs a second permanent step in a ladder whose
 * entries can never be edited — and this list is inside a one-way migration.
 */
export const SCAN_LIFECYCLE_STATES = [
  /** Walking, or holding at the backpressure watermark. */
  "running",
  /** Stopped with its place kept, and resumable. Reached by the operator
   *  (D-10), by a project change (D-04), by a restart (D-11) or by retention
   *  eviction (D-08) — and a suspension always says which. */
  "suspended",
  /** Reached the end of the filter's range. Rendered **Finished**, never
   *  "Completed": see the collision note above. */
  "completed",
  /** Thrown away by the operator. The POSITION is gone; the artifacts and
   *  observations it already produced are not touched. */
  "discarded",
] as const;

/** One retroactive-scan lifecycle state. Derived from
 *  {@link SCAN_LIFECYCLE_STATES}, never restated. */
export type ScanLifecycleState = (typeof SCAN_LIFECYCLE_STATES)[number];

/**
 * Why a scan is `suspended` — a CLOSED, DefMiner-authored code set.
 *
 * A CODE AND NEVER A SENTENCE, for the reason `RpcReason` gives on the other
 * side of the boundary: the frontend maps each of these to its own copy, so a
 * fifth reason needs a copy row before it can be rendered. Caido's own error
 * text never reaches this column and never crosses the RPC — anything caught
 * goes through `describeError` and stays in the log.
 *
 * EVERY MEMBER NAMES AN AGENT. A suspension the operator did not perform is
 * the case that matters: three of these four are things that happened TO the
 * scan, and a scan that stopped for a reason nobody can see is the
 * frozen-looking page one level up.
 */
export const SUSPEND_REASONS = [
  /** The operator pressed Pause (D-10). */
  "operator_paused",
  /** The Caido project changed underneath it (D-04). Nothing was written under
   *  the new project; the scan kept its place in the old one. */
  "project_changed",
  /** Caido restarted while it was running (D-11). DefMiner never resumes a scan
   *  on its own — this is ERR-02's rule applied to the one table that needs it
   *  now, and Phase 2 inherits the pattern rather than inventing a second. */
  "process_restarted",
  /** The retention cap was deleting this scan's own results (D-08): the
   *  backfill was consuming itself. */
  "retention_eviction",
] as const;

/** One suspension reason. Derived from {@link SUSPEND_REASONS}. */
export type SuspendReason = (typeof SUSPEND_REASONS)[number];

/**
 * DefMiner's OWN narrowing, as one HTTPQL clause (D-05, FIND-03).
 *
 * ===========================================================================
 * WHY THIS STRING LIVES IN THE ENGINE AND NOT IN THE BACKEND
 * ===========================================================================
 * D-05's promise is that the operator may NARROW the scan and never widen it,
 * and 06-UI-SPEC.md § "The start form" makes the check mechanical: the read-only
 * "DefMiner always scans for" field renders this exact clause before a scan
 * exists, so the operator can see what they are adding to. A promise the
 * operator cannot check is a promise; the string is a fact.
 *
 * The frontend cannot import the backend — the backend imports `caido:*`
 * specifiers that resolve only inside Caido's QuickJS — and there is no scan
 * row to carry the clause across the RPC before the first scan starts. So it
 * belongs here, in the one module BOTH packages already import, for exactly
 * the reason `SCAN_STATES` moved here in plan 05-09. The alternative was a
 * second copy in the frontend, which is a second declaration of the one string
 * whose whole job is that both halves agree about it.
 *
 * THIS IS A CONSTANT, NOT A COMPOSITION. `packages/backend/src/scan/filter.ts`
 * remains the ONLY producer of a scan filter STRING; nothing here concatenates
 * an operator's input, and nothing outside that module may.
 *
 * ===========================================================================
 * WHY THESE SEVEN TERMS AND NOT `req.ext.eq`
 * ===========================================================================
 * The push-down must be a SUPERSET of `admit()`'s kind axis or the retroactive
 * scan silently never sees an artifact the live path would have taken. Two
 * substring terms cover the extensions and five cover the media-type essences
 * `isScriptish` accepts, and all of them use the case-INSENSITIVE `cont`
 * family. `req.ext.eq` is documented case sensitive and would miss `/APP.JS`,
 * which `isScriptish` accepts because it lowercases before comparing a suffix —
 * so the clause would be a strict subset and the miss would be invisible.
 *
 * The 2xx bound mirrors `admit()`'s first axis and is worth more here than
 * there: on this runtime every returned page transfers full response bodies,
 * so a status the gate would reject anyway is a body DefMiner paid to move.
 *
 * NO REGULAR EXPRESSION AND NO COMMENT TOKEN. `//` and `/* *\/` are HTTPQL
 * comments and are the one construct that can reach across a parenthesis; a
 * comment inside DefMiner's own clause would comment DefMiner's narrowing away.
 * `contract.spec.ts` asserts both are absent.
 */
export const SCAN_KIND_CLAUSE =
  '(req.path.cont:".js" OR req.path.cont:".mjs" ' +
  'OR resp.raw.cont:"javascript" OR resp.raw.cont:"ecmascript" ' +
  'OR resp.raw.cont:"jscript" OR resp.raw.cont:"livescript" ' +
  'OR resp.raw.cont:"text/js") ' +
  "AND resp.code.gte:200 AND resp.code.lt:300";

/**
 * What the Scan tab reads — one retroactive scan, as the operator sees it.
 *
 * EVERY FIELD IS AN INTEGER, A CLOSED-VOCABULARY WORD, OR THE OPERATOR'S OWN
 * CLAUSE (T-06-04). No response byte, no header, no URL and no target-authored
 * string crosses on this shape, which is what lets the readout render without a
 * display-path call — a property of the SHAPE rather than a discipline.
 */
export type ScanStatusPayload = {
  readonly scanId: string;
  readonly state: ScanLifecycleState;
  /** `null` while the scan is not suspended. A code, never a sentence. */
  readonly suspendReason: SuspendReason | null;
  /** What the operator typed, or `""`. Echoed only inside its own `font-mono`
   *  element after sanitisation — never interpolated into a sentence. */
  readonly operatorFilter: string;
  /** The EXACT string that was sent, in the exact order. This is what makes
   *  D-05's "narrow, never widen" checkable rather than merely promised. */
  readonly composedFilter: string;
  readonly pagesWalked: number;
  readonly seen: number;
  readonly admitted: number;
  readonly skippedDone: number;
  readonly rejected: number;
  readonly queued: number;
  /**
   * How many of this scan's admissions have finished analysis — or `null` when
   * DefMiner does not know.
   *
   * `number | null` AND NOT `number`, deliberately. There is no `analysed`
   * column on `scans`: the number belongs to the consumer at the other end of
   * the queue, not to the producer, and plan 06-06 wires it. Until then the
   * honest value is ABSENT. A zero would render as "nothing has been analysed"
   * on a scan that is analysing, which is 06-UI-SPEC.md D2's rule — a number
   * DefMiner does not have is absent, never zero — broken on the one counter
   * whose whole job is to show the far end of the pipe.
   */
  readonly analysed: number | null;
  /**
   * The capture time of the oldest request walked so far, in ms.
   *
   * FROM `request.getCreatedAt()`, NEVER FROM THE CLOCK. The consumer stamps
   * every persisted row with `Date.now()`, so a position built from a stored
   * row would read "now scanning traffic from today" for the entire walk.
   * `null` before the first page resolves — absent, never the epoch.
   */
  readonly lastCreatedAt: number | null;
  readonly startedAt: number;
  readonly updatedAt: number;
  readonly finishedAt: number | null;
  /**
   * Is the producer withholding pages because the queue is at the watermark?
   *
   * REQUIRED, AND NOT OPTIONAL. 06-UI-SPEC.md § "The scan status payload —
   * required fields" is binding and this is the field it binds. From outside
   * the backend a scan holding at the watermark and a scan whose QuickJS thread
   * is blocked are indistinguishable: both show counters that stop advancing.
   * Without this signal "Waiting for the analysis queue" can never render,
   * every legitimate hold falls through to "Not advancing", and the stall
   * marker cries wolf on the single most common healthy state of a long
   * backfill. An operator who learns to ignore a stall marker is worse off than
   * one who never had it.
   *
   * The tracer always reports `false`; plan 06-03 adds the watermark that makes
   * it true.
   */
  readonly heldAtWatermark: boolean;
};

/**
 * States that mean "this digest has been through the detectors at this corpus
 * version; do not re-analyse it".
 *
 * `failed` is TERMINAL HERE, deliberately. Phase 1 has no retry policy and no
 * failure taxonomy — ERR-02 is Phase 2 — so treating `failed` as re-analysable
 * today would mean re-walking the same bytes on every sighting, for ever, with
 * nothing to break the loop. The row is still there, still says `failed`, and
 * still carries its `error`; Phase 2 decides which failures are worth retrying
 * and gets to make that decision with a taxonomy in hand.
 */
export const TERMINAL_SCAN_STATES: readonly ScanState[] = [
  "done",
  "partial",
  "failed",
];

/**
 * The state an operator-invoked retry returns a stopped analysis to.
 *
 * DECLARED HERE, IN THE MODULE THAT OWNS THE VOCABULARY, AND NOWHERE ELSE.
 * `packages/backend/src/store/retry.ts` binds this constant into its update
 * statement rather than writing the word: a retry path that spelled a state
 * out would be a second declaration of a closed vocabulary whose whole value
 * is that the database's CHECK constraint and every surface agree on one list.
 * contract.spec.ts asserts it is a member of {@link SCAN_STATES} and is NOT
 * terminal — a retry that moved a row to a terminal state would put it
 * straight back where it started.
 */
export const RETRY_TARGET_SCAN_STATE: ScanState = "pending";

/**
 * States a retry is allowed to move OUT of. DERIVED, never restated.
 *
 * The intersection of {@link TERMINAL_SCAN_STATES} and
 * {@link isDegradedScanState}: the two terminal states that did not inspect
 * every byte. `done` is terminal and complete, so retrying it would discard a
 * finished result to redo work whose answer is already known; `pending` and
 * `running` are not terminal at all, and resetting a RUNNING walk underneath
 * itself is threat T-05-50.
 *
 * The guard that uses this list lives INSIDE the update statement, not in a
 * caller-side check before it. A caller-side check is two operations this
 * driver cannot make atomic, and the interleaving it permits is exactly the
 * running walk being reset.
 */
export const RETRYABLE_SCAN_STATES: readonly ScanState[] =
  TERMINAL_SCAN_STATES.filter((state) => isDegradedScanState(state));

/**
 * The single filter that narrows an inventory to its degraded analyses.
 *
 * ONE OBJECT, DECLARED ONCE, IMPORTED BY BOTH PACKAGES. The frontend's
 * "Show only affected artifacts" action binds it and the backend's statement
 * matrix answers it; a column name spelled in two places is a filter that
 * silently returns nothing the day one of them is edited (the backend answers
 * an unrecognised filter column with an empty exhausted page, by design — see
 * P5-D39 — so the failure is silent by construction).
 *
 * WHY A SECOND FILTER COLUMN RATHER THAN A CLEVERER FIRST ONE. `PageRequest`
 * carries at most ONE column filter with ONE bound value, deliberately: that
 * is what keeps the statement matrix linear in filter columns instead of
 * exponential in their combinations. A degraded analysis is TWO states, which
 * a single equality cannot express, so it gets its own column rather than a
 * conditional predicate inside the scan-state one. A conditional predicate
 * would be the null-guard shape 05-RESEARCH § O-01 disqualified by
 * measurement.
 */
export const DEGRADED_ANALYSIS_FILTER = Object.freeze({
  column: "analysis_degraded",
  value: "yes",
});

/**
 * The one failure reason code Phase 1 can honestly emit.
 *
 * ERR-04's copy reads "Analysis failed: {reason}." and 05-UI-SPEC.md's rule
 * that outranks its own copy table requires `{reason}` be a DefMiner-authored
 * reason code, NEVER a message quoting the artifact. Phase 1 has no failure
 * taxonomy — ERR-02 is Phase 2's, and `TERMINAL_SCAN_STATES` already records
 * that the failed state is terminal here for exactly that reason — so the
 * honest code is one that says the classification does not exist yet rather
 * than one invented to look informative.
 *
 * The stored `analyses.error` column is NOT this string and never reaches the
 * frontend: the analysis projection the panel reads omits it entirely, so the
 * class of bytes T-05-51 is about cannot arrive at the panel to be
 * interpolated by mistake.
 */
export const UNCLASSIFIED_ANALYSIS_FAILURE_REASON = "unclassified";

/**
 * States that mean the analysis did NOT inspect every byte.
 *
 * The predicate behind UI-09's floor statement, defined once beside the
 * vocabulary rather than re-derived at each surface — the same role
 * {@link isOperatorDecided} plays for {@link TRIAGE_STATES}. `partial` stopped
 * early and `failed` inspected nothing at all, and both make an aggregate over
 * the containing view a FLOOR rather than a total.
 *
 * `pending` and `running` are NOT degraded: they are not finished, which is a
 * different claim and one the badge already carries in words.
 *
 * THE `never` FALLTHROUGH IS THE POINT. Adding a sixth state without adding a
 * case is a typecheck error here, so a vocabulary change cannot land silently
 * and leave the floor statement judging five of six states.
 */
export function isDegradedScanState(state: ScanState): boolean {
  switch (state) {
    case "partial":
    case "failed":
      return true;
    case "pending":
    case "running":
    case "done":
      return false;
    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}

// ---------------------------------------------------------------------------
// THE FOUR ALWAYS-PRESENT COLUMNS
// ---------------------------------------------------------------------------

/**
 * The leading column: a state OR a score, never both, and the discriminant
 * says which.
 *
 * 05-UI-SPEC.md § "Visual Hierarchy" makes this column and the next one the
 * focal point of the whole page — "the entire product thesis is signal quality
 * high enough that the operator reads every finding". A table whose rows carry
 * an analysis lifecycle state (artifacts, observations) renders `state`; a
 * table whose rows carry a scored entity renders `score`.
 *
 * `state` IS {@link ScanState} AND NO LONGER A BARE `string`. It was typed
 * `string` while the vocabulary lived in the backend, which the engine may not
 * import; plan 05-09 moved `SCAN_STATES` here for the frontend's sake and this
 * field is the second beneficiary. A lead state outside the shipped five is now
 * a typecheck error rather than a badge that renders as nothing.
 *
 * `tier` is a DefMiner-authored word rendered beside the numeral. Its
 * vocabulary is Phase 3's (plan 03-03), for the same reason the signal labels
 * are.
 */
export type EntityLead =
  | { readonly kind: "state"; readonly state: ScanState }
  | { readonly kind: "score"; readonly score: number; readonly tier: string };

/**
 * The four columns every entity table row carries, in the order the UI renders
 * them. Fixed and binding by 05-UI-SPEC.md § "Table contract":
 *
 *   `[state/score] [target-controlled value] [last seen] [triage state]`
 *
 * Entity-specific columns are ADDED BY THE PHASE THAT DEFINES THEM and are not
 * fixed here. What is binding on every one of them: these four are always
 * present in this order, EXACTLY ONE COLUMN CARRIES THE TARGET-CONTROLLED
 * VALUE, and every column rendering target-controlled bytes obeys
 * 05-UI-SPEC.md § "Rendering Safety Contract" R1 and R2.
 *
 * TARGET-CONTROLLED: `value`, AND NOTHING ELSE ON THIS TYPE. That sentence is
 * the reason this is a type and not a paragraph — "exactly one column carries
 * the target-controlled value" is a rule somebody has to remember unless it is
 * somewhere they can read it while adding a column. A second target-controlled
 * column added to an entity table without R1/R2 applied is threat T-05-15.
 */
export type EntityRowBase = {
  /**
   * Column 1. DefMiner-authored in both arms — a lifecycle state word or a
   * score numeral plus a tier word. Never target-controlled.
   */
  readonly lead: EntityLead;

  /**
   * Column 2. **TARGET-CONTROLLED.** The one field on this type that came off
   * the wire from a host that may be hostile.
   *
   * Rendered through `forDisplay` from ./sanitise at
   * `TABLE_CELL_MAX_GRAPHEMES`, in `font-mono` (a security control per
   * 05-UI-SPEC.md § "Typography", not a style preference), with
   * `white-space: pre` so an embedded newline cannot grow the fixed 32px row.
   * NEVER in a tooltip, a `title` attribute or a `data-*` attribute, and never
   * as an `href` — R1's "an extracted URL is data to be displayed, never a
   * destination to be offered".
   *
   * This is the REDACTED form. The raw value is never persisted and never
   * crosses an event boundary (SEC-04, project-wide); reveal is panel-only and
   * re-verifies the artifact body hash (UI-SPEC Open Decision D1).
   */
  readonly value: string;

  /**
   * Column 3. Epoch milliseconds, wall clock. Formatted by the frontend; a
   * pre-formatted date string would be a locale decision made in the wrong
   * package.
   */
  readonly lastSeenAt: number;

  /** Column 4. The operator's own triage decision. Never target-controlled. */
  readonly triage: TriageState;
};

// ---------------------------------------------------------------------------
// THE TRIAGE VOCABULARY
// ---------------------------------------------------------------------------

/**
 * The closed triage vocabulary, in the same shape and the same snake_case
 * style as the shipped {@link SCAN_STATES} above:
 * an `as const` array plus a type derived from it.
 *
 * Fixed by 05-UI-SPEC.md § "Triage & suppression". **Nothing anywhere may
 * restate these four strings** — not a component, not an RPC handler, not a
 * CHECK constraint written by hand. The DDL that eventually carries them is
 * generated from this list or asserted against it, the way `scan_state`'s
 * CHECK is asserted against `SCAN_STATES`.
 *
 * WHAT THIS LIST DOES NOT SAY, AND MUST NOT BE READ AS SAYING: what triage is
 * KEYED on. D-05(4) is explicit that the triage table shape and write
 * discipline may be designed now and the key may not be fixed, because it
 * depends on the stable entity identity Phase 4's plan 04-03 defines. The one
 * negative 05-UI-SPEC.md does fix is carried in the deferral register: triage
 * is keyed on stable entity identity and NEVER on `detector_set_hash`,
 * because `analyses`'s primary key is `(project_id, sha256,
 * detector_set_hash)` and hanging triage off an analysis row would inherit the
 * corpus hash and discard every triage decision on a bump — exactly what
 * OPS-04 forbids (threat T-05-19).
 */
export const TRIAGE_STATES = [
  "new",
  "reviewed",
  "false_positive",
  "accepted",
] as const;

/** One triage state. Derived from {@link TRIAGE_STATES}, never restated. */
export type TriageState = (typeof TRIAGE_STATES)[number];

/**
 * True when the operator has made a decision about this row.
 *
 * `new` is the absence of a decision — it is the state a row is born in and
 * the only one 05-UI-SPEC.md § "Copywriting Contract" gives no CTA to. The
 * other three are the three triage CTAs.
 *
 * THE `never` FALLTHROUGH IS THE POINT. This function is the compile-time
 * guard on {@link TRIAGE_STATES}: adding a fifth member without adding a case
 * makes `const unhandled: never = state` a typecheck error, so a vocabulary
 * change cannot land silently and leave a consumer switch handling four of
 * five states. Same role {@link TERMINAL_SCAN_STATES} and
 * {@link isDegradedScanState} play for {@link SCAN_STATES} — a derived
 * predicate over a closed vocabulary, defined once beside it.
 */
export function isOperatorDecided(state: TriageState): boolean {
  switch (state) {
    case "new":
      return false;
    case "reviewed":
    case "false_positive":
    case "accepted":
      return true;
    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}

// ---------------------------------------------------------------------------
// PAGINATION — THE ROW-VALUE KEYSET CURSOR
// ---------------------------------------------------------------------------

/**
 * The cursor tuple a keyset page carries: the sort key's value and the
 * tie-break value of the last row the statement scanned.
 *
 * A ROW-VALUE COMPARISON REQUIRES A UNIFORM SORT DIRECTION, AND APPLYING ONE
 * TO A MIXED-DIRECTION SORT IS SILENTLY WRONG RATHER THAN SLOW. SQLite's
 * `(a, b) < (?, ?)` compares the tuple lexicographically in ONE direction; a
 * statement ordered `a DESC, b ASC` and cursored with that predicate skips
 * rows and duplicates others, and nothing errors. That is why
 * {@link PageRequest} carries ONE `direction` governing both terms rather than
 * one per term.
 *
 * The shipped list statements in artifacts.ts / observations.ts use a MIXED
 * tie-break direction and are therefore not cursorable as they stand. Plan
 * 05-06 adds separate uniform-direction statements rather than editing them,
 * and 05-02 measured the alternative: a mixed-direction index costs both a
 * sorter and the second cursor term.
 *
 * PROVENANCE OF THE MEASUREMENTS BEHIND THIS DESIGN, STATED RATHER THAN
 * IMPLIED. The query plans were measured on SQLite 3.51.0 and 3.53.4, NOT on
 * Caido's 3.46.0 — no 3.46 binary is reachable from this repo. The operator
 * chose to proceed with that residual DISCLOSED rather than closed. Nothing
 * here is verified on the shipped runtime; the gap is narrowed to a
 * 3.46 -> 3.51 window and is an executed assertion in
 * tests/sqlite-346-query-plans.spec.ts, not a footnote.
 */
export type PageCursor = {
  /** The value of the sort key column on the last scanned row. */
  readonly sortValue: string | number;
  /**
   * The value of the deterministic tie-break column on the last scanned row.
   * Every list query in this package already breaks ties deterministically
   * (`sha256 ASC`, `request_id ASC`); keyset pagination depends on exactly
   * that property and would drift without it.
   */
  readonly tieBreak: string | number;
};

/**
 * One page request.
 *
 * AT MOST ONE COLUMN FILTER, AND THAT IS A TYPE-LEVEL FACT RATHER THAN A
 * CONVENTION. `filter` is a single optional object and not a record of
 * filters, because the statement matrix is enumerated literally: one literal
 * per filter COLUMN turns an exponential `2^k` matrix into a linear `k + 1`,
 * and a type that permits two filters invites a call that has no statement
 * behind it. The SQL discipline gate (sql-discipline.spec.ts) bans the builder
 * that would otherwise absorb the combination, so the type is where the bound
 * has to live.
 */
export type PageRequest = {
  /** Every multi-row read in this package is project-scoped. No exceptions. */
  readonly projectId: string;
  /**
   * Which column to sort on. A DefMiner-authored identifier from a closed set
   * the implementing table declares — never an operator string and never
   * interpolated into SQL. It selects a literal statement from a frozen lookup.
   */
  readonly sortKey: string;
  /**
   * The sort direction, governing the sort key AND the tie-break together.
   * ONE field, not two: see {@link PageCursor} for why a mixed direction makes
   * the row-value cursor silently wrong.
   */
  readonly direction: "asc" | "desc";
  /**
   * The single column filter, or null. See the type's own note: one filter
   * column, never a combination.
   */
  readonly filter: {
    /** A DefMiner-authored column identifier, never an operator string. */
    readonly column: string;
    /** The value to match. Always BOUND, never interpolated. */
    readonly value: string;
  } | null;
  /** The cursor from the previous page's response, or null for the first page. */
  readonly cursor: PageCursor | null;
  /**
   * Rows requested. 100 per keyset page per 05-UI-SPEC.md § "Table contract".
   * The response may carry FEWER while more exist — see {@link PageResponse}.
   */
  readonly limit: number;
};

/**
 * One page response.
 *
 * `scanned` AND `exhausted` EXIST BECAUSE THE CANDIDATE WINDOW IS BOUNDED, AND
 * WITHOUT THEM THE UI CANNOT TELL END-OF-DATA FROM A FULLY-FILTERED WINDOW.
 * Every non-sargable filter — a `NOT EXISTS` suppression arm, a `LIKE`
 * substring search — walks the whole project partition when it matches
 * nothing, on the single QuickJS thread. The fix is to bound the SCANNED
 * window inside the statement, not just the returned one: measured at
 * 4,000,023 VM steps unbounded against 15,527 bounded in the pathological case
 * (100% of rows suppressed, page returns 0), a 258x reduction whose real
 * property is that the cost stops depending on filter selectivity.
 *
 * The cost is a SHORT PAGE: the statement may return fewer than `limit` rows
 * while more exist. The cursor advances to the last SCANNED row and the caller
 * refetches until it has a full page or `exhausted` is true. That is a real
 * change to 05-UI-SPEC.md's "100-row keyset pages" and it is stated in this
 * return shape rather than left to a caller to discover.
 */
export type PageResponse<TRow> = {
  /** The rows that survived the filter. May be shorter than the request limit. */
  readonly rows: readonly TRow[];
  /** The cursor for the next page, or null when there is nothing after this. */
  readonly nextCursor: PageCursor | null;
  /**
   * How many candidate rows the statement examined inside its bounded window.
   * `scanned > rows.length` means the window was partly filtered; `scanned`
   * reaching the window bound with a short page means REFETCH, not end of data.
   */
  readonly scanned: number;
  /**
   * True only when the underlying partition is genuinely exhausted. A short
   * page with `exhausted: false` is a refetch, NOT an empty state — rendering
   * the empty state there tells the operator nothing was found when the window
   * simply ran out.
   */
  readonly exhausted: boolean;
};

// ---------------------------------------------------------------------------
// THE INVALIDATION SUMMARY (UI-07)
// ---------------------------------------------------------------------------

/**
 * The name of the single backend -> frontend event this plugin emits.
 *
 * ONE event carrying a category, not one event per category: the frontend
 * coalescer keys on {@link InvalidationSummary.category}, and a per-category
 * event name would mean a subscription list that has to be edited by every
 * phase that adds a table. Plan 05-07 emits under this constant and plan 05-08
 * subscribes under it; neither restates the string.
 */
export const INVALIDATION_EVENT = "defminer:invalidated";

/**
 * The categories THIS phase actually emits — one per shipped table with rows
 * the workspace renders.
 *
 * ENTITY CATEGORIES ARE APPENDED BY THE PHASE THAT ADDS THE TABLE, NOT GUESSED
 * AT HERE. There is no `entities` and no `evidence` member below, and adding
 * one before the table exists would be the schema invention D-05(2) forbids.
 * contract.spec.ts asserts this list holds exactly these three and nothing
 * entity-shaped, so a speculative member fails rather than lands.
 */
export const INVALIDATION_CATEGORIES = [
  "artifacts",
  "observations",
  "analyses",
] as const;

/** One invalidation category. Derived from {@link INVALIDATION_CATEGORIES}. */
export type InvalidationCategory = (typeof INVALIDATION_CATEGORIES)[number];

/**
 * The entire event payload. Four scalars.
 *
 * SUMMARY ONLY. NO FINDINGS PAYLOAD, NO BODIES, NO ROWS. (UI-07, threat
 * T-05-17.) The event says THAT something changed and how much; the frontend
 * re-queries a page when it decides to, through the same project-scoped,
 * redacted read path everything else uses. An event that pushed rows would be
 * a second data path out of the backend with none of the first one's controls
 * on it — and it would carry target-controlled bytes to a listener that has
 * not sanitised them.
 *
 * `newestId` is a row identifier (a digest, a request id), never a value and
 * never a URL.
 */
export type InvalidationSummary = {
  readonly projectId: string;
  readonly category: InvalidationCategory;
  readonly changedCount: number;
  readonly newestId: string;
  /**
   * THE DISCRIMINATOR, DECLARED ON THIS VARIANT AND NEVER EMITTED ON IT.
   *
   * `?: undefined` and not a literal, deliberately. Both variants of
   * {@link InvalidationEventPayload} declare the tag — which is what makes
   * {@link isScanProgressPayload} a narrowing predicate rather than a cast —
   * while the object this type describes is still EXACTLY the four scalars
   * above at run time. `ingest/consumer.ts` builds it as a four-key literal and
   * `index.spec.ts` asserts that key set; giving the summary a real tag would
   * have widened the shipped payload UI-07 fixed, to buy a narrowing the
   * optional form already provides.
   */
  readonly kind?: undefined;
};

// ---------------------------------------------------------------------------
// THE SECOND PAYLOAD VARIANT — SCAN PROGRESS (FIND-04, D-15)
// ---------------------------------------------------------------------------
//
// ===========================================================================
// WHY THIS IS A VARIANT AND NOT A FOURTH CATEGORY
// ===========================================================================
// D-15 asks for retroactive-scan progress to ride the frontend coalescer "as a
// new category", and says in the same breath that the never-re-order-while-a-
// row-is-selected rule must NOT apply to it, so progress lands immediately
// rather than accruing into the coalescing pill.
//
// TAKEN LITERALLY, THOSE TWO HALVES CONTRADICT EACH OTHER, and the contradiction
// is mechanical rather than a matter of taste. `stores/coalescer.ts` checks its
// triage lock TWICE and both checks are BEFORE the debounce window: a summary
// arriving while a row is selected is counted into `pending` and never enters
// the window at all. A `scans` category added to the list below would therefore
// accrue into the pill and never land — the exact opposite of what D-15 asks
// for. 06-UI-SPEC.md § "Named Conflicts" records the resolution: progress rides
// the SAME EVENT, which is D-15's actual reason (one backend -> frontend
// mechanism), and is NOT an {@link InvalidationCategory}, which is D-15's
// mechanism and cannot deliver its own intent.
//
// THE CATEGORY LIST IS THE GATE AND IT IS NOT TOUCHED. `INVALIDATION_CATEGORIES`
// exists to stop speculative categories arriving through the back door, and a
// progress payload has NO ROWS TO INVALIDATE — there is no table to re-query, no
// cursor to protect and no pill to increment. It is not a member of that
// vocabulary in any sense except that it travels on the same wire.

/**
 * The discriminator that tells the two payload variants apart.
 *
 * NOT NAMESPACED like {@link INVALIDATION_EVENT}. It is a tag INSIDE a payload
 * on one already-namespaced event, and a `defminer:` prefix here would invite a
 * reader to mistake it for a second event name — which is the one thing D-15
 * spends its argument forbidding.
 */
export const SCAN_PROGRESS_KIND = "scan-progress";

/**
 * One retroactive scan's progress, as the producer reports it after each page
 * it has actually walked.
 *
 * EVERY FIELD IS AN INTEGER, A BOOLEAN, A CLOSED-VOCABULARY WORD OR AN
 * IDENTIFIER THIS PLUGIN OWNS (T-06-44) — the same property
 * {@link ScanStatusPayload} has and for the same reason: the readout renders
 * without a display-path call because of the SHAPE, not because of a discipline
 * somebody has to keep. NO FINDINGS PAYLOAD, NO RESPONSE BODIES, NO ROWS, and
 * no URL, host, header or body anywhere on it.
 *
 * THE COUNTERS ARE CUMULATIVE, read off the `scans` row rather than off one
 * call's totals. A walk that holds at the backpressure watermark re-enters, and
 * a payload carrying the re-entry's own deltas would reset the operator's strip
 * to a small number every time the queue filled.
 */
export type ScanProgressPayload = {
  readonly kind: typeof SCAN_PROGRESS_KIND;
  readonly projectId: string;
  readonly scanId: string;
  readonly state: ScanLifecycleState;
  readonly pagesWalked: number;
  readonly seen: number;
  readonly admitted: number;
  readonly skippedDone: number;
  readonly rejected: number;
  readonly queued: number;
  /**
   * ABSENT, NEVER A LYING ZERO — and absent for the same reason
   * {@link ScanStatusPayload.analysed} is.
   *
   * `analyses` rows carry NO SCAN ATTRIBUTION: the primary key is
   * `(project_id, sha256, detector_set_hash)` and nothing on it says which scan
   * offered the work. Counting them honestly needs either a new `scans` column
   * — another permanent step in a one-way migration ladder — or provenance on
   * the queue entry itself, and neither is a thing to invent on the side of a
   * progress payload. The field is declared here so wiring it later is one edit
   * in one place rather than a shape change on the wire.
   */
  readonly analysed: number | null;
  /**
   * The capture time of the oldest request walked so far, in ms.
   *
   * FROM `request.getCreatedAt()`, NEVER FROM THE CLOCK — the walk is
   * descending, so this date marches BACKWARDS into history, and that motion is
   * the narrative the missing denominator was going to carry. `null` before the
   * first page resolves: absent, never the epoch.
   */
  readonly lastCreatedAt: number | null;
  /** Is the producer withholding pages because the queue is at the watermark?
   *  {@link ScanStatusPayload.heldAtWatermark} states at length why this cannot
   *  be derived by the reader. */
  readonly heldAtWatermark: boolean;
};

/**
 * Everything {@link INVALIDATION_EVENT} can carry. TWO VARIANTS, ONE CHANNEL.
 *
 * The events map in `packages/backend/src/api/spec.ts` is typed against THIS,
 * so a third variant added without a handler on the frontend's single
 * subscription site is a typecheck failure rather than a payload nobody routes.
 */
export type InvalidationEventPayload =
  | InvalidationSummary
  | ScanProgressPayload;

/**
 * Narrow one event payload to the progress variant.
 *
 * THE PREDICATE IS THE ROUTING MECHANISM. The frontend discriminates at its ONE
 * subscription site and dispatches: progress to its own leading-throttled store,
 * invalidation summaries to the coalescer. A progress payload therefore never
 * reaches `onSummary` and never touches `pending`, which is what leaves both of
 * the coalescer's triage-lock early returns literally unmodified.
 */
export function isScanProgressPayload(
  payload: InvalidationEventPayload,
): payload is ScanProgressPayload {
  return payload.kind === SCAN_PROGRESS_KIND;
}

// ---------------------------------------------------------------------------
// THE SCORE-EXPLANATION FRAME (UI-04) — FRAME ONLY, NO VOCABULARY
// ---------------------------------------------------------------------------

/**
 * One signal that fired, as the panel renders it.
 *
 * THE IDS AND LABELS ARE PHASE 3'S (plan 03-03, "Multi-signal confidence
 * scorer with explanations"). This type says what shape they arrive in and
 * nothing about what they say. Inventing a signal vocabulary here would be the
 * same failure as inventing a column list, and 05-UI-SPEC.md already declined
 * it for that reason.
 */
export type ScoreSignal = {
  /**
   * A stable DefMiner-authored identifier. Not displayed; it is what a test,
   * an export or a bug report refers to when the label is translated or
   * reworded.
   */
  readonly signalId: string;
  /** The human-readable label. DefMiner-authored. Never target-controlled. */
  readonly label: string;
  /**
   * Whether this signal pushed the score up or down. A direction, not a
   * weight: 05-UI-SPEC.md forbids colour as the sole carrier of meaning, so
   * the panel renders this as a word and may reinforce it with colour.
   */
  readonly direction: "raised" | "lowered";
  /**
   * Optional detail. **TARGET-CONTROLLED when present** — a matched substring,
   * a surrounding-context fragment. Rendered through `forEvidence` from
   * ./sanitise in `font-mono`, at the panel cap. Never in a tooltip, a `title`
   * or a `data-*` attribute.
   */
  readonly detail?: string;
};

/**
 * The UI-04 score explanation: "which signals fired and why it scored as it
 * did", as a frame.
 *
 * THE OPEN PRECISION QUESTION, RECORDED RATHER THAN INVENTED. A score renders
 * as a NUMERAL PLUS A TIER WORD (05-UI-SPEC.md § "Visual Hierarchy" makes that
 * pair the focal point of the page). The numeral's rounding and tie-breaking
 * contract — how many decimals, which way a boundary rounds, what happens when
 * a value sits exactly on a tier edge — IS PHASE 3'S TO STATE, and the UI
 * renders the numeral it is given. This frame requires Phase 3 to declare it;
 * it does not declare it on Phase 3's behalf, because a rounding rule invented
 * here would be a rule the scorer never agreed to and could not honour.
 */
export type ScoreExplanation = {
  /** The score. Rendered as given — see the type's note on rounding. */
  readonly score: number;
  /** The tier word rendered beside the numeral. Phase 3's vocabulary. */
  readonly tier: string;
  /**
   * The signals that fired, in the order the panel renders them. Ordering is
   * the producer's: an explanation whose order changed between two reads of
   * the same entity would read as a different explanation.
   */
  readonly signals: readonly ScoreSignal[];
};

// ---------------------------------------------------------------------------
// THE EVIDENCE-PANEL FRAME (UI-03 + UI-04) — THE ANSWER TO CHECKER FLAG F1
// ---------------------------------------------------------------------------

/**
 * The evidence panel's mandatory field set — F1's "two-line evidence-panel
 * frame (mandatory fields, which are target-controlled, which carry
 * `font-mono`)".
 *
 * MANDATORY: every field below. They are non-optional on this type, and
 * {@link EVIDENCE_PANEL_MANDATORY_FIELDS} names them so the requirement is
 * assertable rather than only readable.
 *
 * TARGET-CONTROLLED: `snippet`, and `detail` on any {@link ScoreSignal} inside
 * `scoreExplanation`. Nothing else. `sourceRequest` is an ID, `artifactVersion`
 * is a pair of hashes, `byteRange` is two integers.
 *
 * `font-mono`: EVERY TARGET-CONTROLLED FIELD, without exception — the two
 * above. Mandatory monospace on target-controlled strings is a security
 * control in 05-UI-SPEC.md § "Typography", not a style preference: it is what
 * makes a homograph or a padded-whitespace value legible as what it is.
 *
 * WHAT DOES NOT EXIST YET, STATED SO IT CANNOT BE MISTAKEN FOR SHIPPED.
 * `byteRange` and `snippet` come from Phase 4's `evidence` table (plan 04-03).
 * There are no byte offsets to link to today, which is the same gap F1 names.
 * The frame is publishable now precisely because a frame is not its contents:
 * plan 05-10 builds the panel REGION, its fixed-height skeleton, its ERR-04
 * failure copy and the artifact-version line, and the deferred pass fills in
 * the two fields above.
 */
export type EvidencePanelFrame = {
  /**
   * UI-03's "links back to its source request". A REQUEST ID handed to a Caido
   * navigation call — never an `<a href>` built from an extracted URL, per R1.
   * D-02 fixes which observation this points at: the newest whose request
   * still resolves.
   */
  readonly sourceRequest: { readonly requestId: string };
  /**
   * UI-03's "artifact version". The content hash identifies the bytes; the
   * detector-set hash identifies which corpus produced this reading of them.
   * Together they are what makes a stale panel detectable.
   */
  readonly artifactVersion: {
    readonly sha256: string;
    readonly detectorSetHash: string;
  };
  /**
   * UI-03's "byte offsets", as a half-open range over the RAW BYTES of the
   * artifact — offsets and hashes derive from bytes and never from text
   * (ENC-01, and decode.ts's banner says so first).
   *
   * These are also the offsets R1's match highlighting slices at: the snippet
   * is split into three plain strings rendered into three sibling elements,
   * NEVER by building a `<mark>` string. The values themselves come from
   * Phase 4's evidence table and do not exist yet.
   */
  readonly byteRange: { readonly start: number; readonly end: number };
  /**
   * **TARGET-CONTROLLED.** The evidence excerpt. `forEvidence` from
   * ./sanitise at `EVIDENCE_PANEL_MAX_GRAPHEMES`, `font-mono`, with the byte
   * range of what is shown stated beside it (R2 step 3). Never the raw secret
   * value — the redacted preview only (SEC-04).
   */
  readonly snippet: string;
  /** UI-04's explanation. See {@link ScoreExplanation}. */
  readonly scoreExplanation: ScoreExplanation;
};

/**
 * The mandatory panel fields, named. F1 asked for a list; this is the list, in
 * a form a test can hold the panel to.
 *
 * `satisfies` keeps it honest in one direction (no member that is not a field)
 * and contract.spec.ts's exhaustive record keeps it honest in the other (no
 * field that is not a member), so a sixth mandatory field cannot be added to
 * the frame without appearing here.
 */
export const EVIDENCE_PANEL_MANDATORY_FIELDS = [
  "sourceRequest",
  "artifactVersion",
  "byteRange",
  "snippet",
  "scoreExplanation",
] as const satisfies readonly (keyof EvidencePanelFrame)[];

// ---------------------------------------------------------------------------
// THE NUMBER BEHIND THE FILTERED-EMPTY COPY
// ---------------------------------------------------------------------------

/**
 * The counts behind 05-UI-SPEC.md's filtered-empty body,
 * "{total} secrets exist on this target. Clear the filters to see them all."
 *
 * THE APPROVED COPY STRING IS UNCHANGED — the operator reviewed the objection
 * to it and chose to keep it, and that decision is not re-opened here. What
 * the operator explicitly left to the planner is WHAT THE NUMBER COUNTS, and
 * this type is that answer.
 *
 * THE HEADLINE NUMBER COUNTS ROWS THE OPERATOR CAN CURRENTLY REACH.
 * SUPPRESSED ROWS ARE NOT INSIDE IT. A suppressed finding is one the operator
 * has said is not a finding; counting it makes the number wrong in the
 * direction that erodes trust — they clear the filters, see fewer rows than
 * the number promised, and have nothing on screen explaining the difference.
 * `hiddenBySuppression` is the SEPARATE SECOND LINE that closes that gap
 * instead of hiding it.
 *
 * Both counts derive from the same bounded query with and without its
 * `NOT EXISTS` arm, so they cannot disagree about what a row is.
 *
 * The shipped `artifacts` and `observations` tables have no suppression
 * mechanism, so for them `hiddenBySuppression` and `suppressionRuleCount` are
 * both 0 and the second line renders nothing. They become real on the entity
 * tables, which are the deferred pass's.
 */
export type VisibleTotal = {
  /** Rows the operator can currently reach. Excludes suppressed rows. */
  readonly visible: number;
  /** Rows hidden by an active suppression rule. The second line's number. */
  readonly hiddenBySuppression: number;
  /** How many rules are doing the hiding. Zero means no second line at all. */
  readonly suppressionRuleCount: number;
};

// ---------------------------------------------------------------------------
// THE EXPORT'S TWO VOCABULARIES (UI-06, decision D-04)
// ---------------------------------------------------------------------------
//
// DECLARED HERE AND NOT IN THE EXPORTER, FOR THE REASON EVERY OTHER VOCABULARY
// IN THIS FILE IS. Both packages need these as VALUES — the backend to select a
// serialiser and to name an audit kind, the frontend to render the two radio
// options in the order the design contract fixes — and the two packages cannot
// import each other. A second copy in the frontend would be a second copy of a
// list whose ORDER is a safety property, which is the one kind of duplication
// that fails silently and in the dangerous direction.

/**
 * The two export formats, as a closed set.
 *
 * The delimited format needs R3's formula neutralisation and the structured one
 * does not; both need R2's control strip. That difference lives in the
 * serialiser — this list is only the vocabulary the two sides agree on.
 */
export const EXPORT_FORMATS = ["csv", "json"] as const;

/** One member of {@link EXPORT_FORMATS}. */
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/**
 * The two redaction modes, REDACTED FIRST.
 *
 * THE ORDER IS A SAFETY PROPERTY AND NOT ALPHABETICAL LUCK. The first member is
 * what a positional mistake lands on — an index, a default, a `[0]`, a radio
 * group rendered by iteration — and the one it must land on is the one that
 * WITHHOLDS. 05-UI-SPEC.md R3 states the same rule in words: redacted is the
 * default and the pre-selected radio, and raw requires actively choosing the
 * second option and then confirming the destructive dialog. There is no
 * "remember this choice" for raw.
 *
 * WHAT THE RAW MODE LIFTS, PRECISELY: the redaction applied at EXPORT time, and
 * nothing else. Query values in observed URLs were replaced at WRITE time and
 * are not in the database at all, so no mode can recover them — which is why the
 * design contract's raw-export confirmation had to be amended (decision D-07).
 */
export const EXPORT_REDACTION_MODES = ["redacted", "raw"] as const;

/** One member of {@link EXPORT_REDACTION_MODES}. */
export type ExportRedactionMode = (typeof EXPORT_REDACTION_MODES)[number];

// ---------------------------------------------------------------------------
// UI-08 — THE SETTINGS VOCABULARY
// ---------------------------------------------------------------------------
//
// DECLARED HERE AND NOT IN `store/settings.ts`, FOR THE REASON EVERY OTHER
// VOCABULARY IN THIS FILE IS. Both packages need these as VALUES — the backend
// to enumerate what it can read and write, the frontend to render one section
// per group and one labelled field per key — and the two packages cannot import
// each other.
//
// AND THE EXHAUSTIVENESS IS THE POINT, NOT THE SHARING. The frontend's copy map
// is `Record<OperatorSettingKey, ...>`. A key added below without copy is a
// TYPECHECK FAILURE in the frontend rather than a field that renders with a
// blank label, which is what makes this surface grow by ADDITION when a later
// phase ships a toggle instead of by somebody remembering to edit two files.
//
// THE MAP IS OVER `OperatorSettingKey` AND NOT `SettingKey`, AS OF PLAN 06-08.
// The closed list now holds two KINDS of key — ones the operator sets, and
// internal durable state this plugin writes to observe whether its own database
// survives a restart (O-02, D-19). Only the first kind is rendered, so only the
// first kind owes copy. The growth mechanism is unchanged for the kind it was
// written for.

/**
 * The settings groups this build has.
 *
 * ONE MEMBER TODAY, AND THAT IS THE HONEST LIST. 05-UI-SPEC.md's `empty /
 * settings-form` row: the shell renders only the sections whose owning phase has
 * shipped, and a phase that has contributed no controls contributes NO EMPTY
 * SECTION — an empty labelled box reads as a missing control rather than as an
 * absent feature. Phases 2-4 add their thresholds and budgets by adding a member
 * here and the keys that belong to it.
 *
 * ORDER IS DECLARATION ORDER and is never sorted at runtime, so a section does
 * not move under an operator who reaches for it by position.
 */
export const SETTINGS_GROUPS = ["retention"] as const;

/** One member of {@link SETTINGS_GROUPS}. */
export type SettingsGroup = (typeof SETTINGS_GROUPS)[number];

/**
 * Maximum rows per table per project.
 *
 * The literal lives HERE rather than in the store module that reads it, so the
 * key the sweep resolves and the key the settings surface writes are one string
 * and not two. A key spelled twice is a setting the operator changes and the
 * sweep never sees — and nothing anywhere reports that, because an unresolved
 * key is indistinguishable from an unset one by construction.
 */
export const RETENTION_MAX_ROWS_KEY = "retention.max_rows_per_table";

/** Maximum row age in milliseconds. Applies to every table EXCEPT `audit`. */
export const RETENTION_MAX_AGE_MS_KEY = "retention.max_age_ms";

/**
 * The audit table's own row bound — its ONLY bound.
 *
 * A SEPARATE KEY, NOT A REUSE OF {@link RETENTION_MAX_ROWS_KEY}, and there is
 * deliberately NO audit AGE key to sit beside it. Decision D-06: the audit log
 * answers "when did I project this permanent Finding, and what did I export",
 * which is asked long after ninety days about actions that are themselves
 * irreversible. `retention.ts` states the same exception where it bites, and the
 * absence of an age statement there is asserted three ways.
 *
 * A SETTINGS SURFACE THAT OFFERED AN AUDIT AGE BOUND WOULD CONTRADICT THAT. The
 * key list below is what the surface renders, so the exception is enforced by
 * the vocabulary rather than by a rule somebody has to remember.
 */
export const AUDIT_RETENTION_MAX_ROWS_KEY = "retention.audit_max_rows";

/**
 * Every settings key the OPERATOR sets.
 *
 * THREE KEYS, AND NOT ONE INVENTED ONE. Each has a shipped consumer —
 * `getRetentionBounds` resolves all three — and `settings.spec.ts` asserts that
 * by running every listed key through the shipped resolution function. A key for
 * a phase that has not shipped its control would be a field the operator can set
 * and nothing reads, which is worse than an absent field: it looks like it works.
 *
 * THIS ARRAY IS THE ONE THE SETTINGS SURFACE RENDERS FROM, and that is now a
 * load-bearing statement rather than a description — see
 * {@link INTERNAL_SETTING_KEYS} below.
 */
export const OPERATOR_SETTING_KEYS = [
  RETENTION_MAX_ROWS_KEY,
  RETENTION_MAX_AGE_MS_KEY,
  AUDIT_RETENTION_MAX_ROWS_KEY,
] as const;

/** One member of {@link OPERATOR_SETTING_KEYS} — a key the operator SETS. */
export type OperatorSettingKey = (typeof OPERATOR_SETTING_KEYS)[number];

// ---------------------------------------------------------------------------
// O-02's DURABLE MARKER — INTERNAL STATE, ON THE SAME TABLE, IN A SEPARATE LIST
// ---------------------------------------------------------------------------
//
// WHY THESE KEYS EXIST AT ALL. Phase 6's D-19 owes the operator a sentence about
// whether this deployment keeps their findings across a restart. The backend
// cannot ANSWER that by introspection: research O-02 read the complete SDK
// member list and found a version string and two server path strings and no
// durability signal of any kind, `os` has no `hostname()`, `process` does not
// load, and `/.dockerenv` is unreachable under D-18 by construction — and would
// only distinguish container-from-not, never volume-from-no-volume.
//
// But persistence is not an introspectable property. It is an OBSERVED one. A
// marker written at first boot and read back on every later boot turns "does
// this deployment keep data" into a fact about the PAST, which is strictly
// stronger than a guess and strictly weaker than a prediction.
//
// WHY THEY ARE IN THEIR OWN ARRAY AND NOT IN {@link OPERATOR_SETTING_KEYS}.
// `store/settings.ts`'s `KNOWN_SETTINGS` is what the Settings panel renders, and
// its `key` field is typed {@link OperatorSettingKey} — so an internal marker
// cannot reach the rendered list without a typecheck failure rather than without
// somebody remembering. An internal value on an operator-editable surface would
// be a field they can change and nothing sensibly reads, which is the exact
// failure the operator-key list's own doc comment above refuses.
//
// THEY ARE STILL IN THE CLOSED VOCABULARY. {@link SETTING_KEYS} is the union, so
// the store's resolution sweep still covers them: a marker key nothing could
// resolve would be a row nothing can find.

/**
 * Identifies ONE install of DefMiner's database. Minted once, then never
 * rewritten while the row survives.
 *
 * Written at the RESERVED GLOBAL SCOPE (`project_id = ''`), which `settings` and
 * only `settings` permits, because the question it answers is about the DATABASE
 * and not about any project inside it.
 */
export const STORAGE_INSTALL_ID_KEY = "storage.install_id";

/** How many boots this install has seen. Monotonic while the row survives. */
export const STORAGE_BOOT_COUNT_KEY = "storage.boot_count";

/**
 * Set once a boot has found this process's OWN marker missing.
 *
 * THE RECORDED OBSERVATION, NOT THE INFERENCE. It is written only by a boot that
 * had already read or written a marker in this process's lifetime and then found
 * it gone, so it cannot fire on a genuine first install — the one false positive
 * that would make the sentence it feeds untrustworthy.
 */
export const STORAGE_OBSERVED_LOSS_KEY = "storage.observed_restart_loss";

/**
 * The internal durable state this plugin writes about its own deployment.
 *
 * NEVER RENDERED AS AN OPERATOR-EDITABLE SETTING. `settings.spec.ts` asserts
 * that in both directions, and `KnownSetting.key`'s type makes it structural.
 */
export const INTERNAL_SETTING_KEYS = [
  STORAGE_INSTALL_ID_KEY,
  STORAGE_BOOT_COUNT_KEY,
  STORAGE_OBSERVED_LOSS_KEY,
] as const;

/** One member of {@link INTERNAL_SETTING_KEYS} — state this plugin WRITES. */
export type InternalSettingKey = (typeof INTERNAL_SETTING_KEYS)[number];

/**
 * Every settings key this build ACTUALLY HAS, of either kind.
 *
 * ONE CLOSED LIST, TWO ARRAYS, AND THE DIFFERENCE IS WHICH ARRAY A KEY IS IN.
 * Everything the store reads or writes on the `settings` table is here, so the
 * resolution sweep in `settings.spec.ts` still covers the whole vocabulary. What
 * the SURFACE renders is {@link OPERATOR_SETTING_KEYS} alone.
 *
 * A PHASE THAT ADDS A TOGGLE adds its key to {@link OPERATOR_SETTING_KEYS}, and
 * the frontend's `Record<OperatorSettingKey, …>` copy map is then a TYPECHECK
 * FAILURE until the new field has a label. A phase that adds internal durable
 * state adds it to {@link INTERNAL_SETTING_KEYS} and renders nothing.
 */
export const SETTING_KEYS = [
  ...OPERATOR_SETTING_KEYS,
  ...INTERNAL_SETTING_KEYS,
] as const;

/** One member of {@link SETTING_KEYS}. */
export type SettingKey = (typeof SETTING_KEYS)[number];

/**
 * The two scopes a setting can be written at.
 *
 * PROJECT FIRST, and the order is not arbitrary: the narrower scope is what a
 * positional mistake should land on, by the same argument
 * {@link EXPORT_REDACTION_MODES} makes. A write that lands on `global` by
 * accident changes every project the operator has.
 *
 * The three-level resolution the store ships — project row, then global row,
 * then the documented default — was written three-level specifically so this
 * surface could offer an operator-wide default with a per-project override
 * without any call site changing. These are the two levels it exposes; the third
 * is not writable, because a default nobody can overwrite is what makes a
 * cleared override recoverable.
 */
export const SETTING_SCOPES = ["project", "global"] as const;

/** One member of {@link SETTING_SCOPES}. */
export type SettingScope = (typeof SETTING_SCOPES)[number];

/**
 * Why a bound was not stored. A CLOSED, DefMiner-authored vocabulary.
 *
 * REASONS, NEVER MESSAGES — the same rule the RPC client's `RpcReason` states.
 * The frontend maps each member to its own copy, so nothing a driver said can be
 * interpolated into a sentence the operator reads.
 *
 * THE FIRST FIVE ARE WHY THIS SURFACE VALIDATES AT ALL. The store's shipped read
 * guard already refuses to APPLY a bad bound, and it says why: a stored bound is
 * a string some future interface wrote, and `Number("")` is 0 and `Number("abc")`
 * is NaN — either one silently applied as a retention bound would delete
 * everything. This surface IS that future interface, so it validates at the write
 * edge as well, and reports which of the five it was rather than substituting the
 * default and reporting success.
 *
 * ZERO AND NEGATIVE ARE TWO MEMBERS AND NOT ONE. "0" is what an operator types
 * when they mean "no limit", and that is the single most dangerous thing they can
 * mean here — the copy for it has to say so. "-1" is a typo.
 */
export const BOUND_REJECTIONS = [
  "empty",
  "not-numeric",
  "not-finite",
  "zero",
  "negative",
  "no-project",
  "write-failed",
] as const;

/** One member of {@link BOUND_REJECTIONS}. */
export type BoundRejection = (typeof BOUND_REJECTIONS)[number];
