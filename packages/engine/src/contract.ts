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
};

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
