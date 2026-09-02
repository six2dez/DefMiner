// packages/backend/src/sourcemap/derive.ts — D-14's SECOND entry point into the
// pipeline, and O-05's sibling refusal vocabulary.
//
// ===========================================================================
// WHY A RECOVERED SOURCE DOES NOT GO THROUGH `admit()` (D-14)
// ===========================================================================
// `hooks/admit.ts` answers FIVE questions about a proxied response: its status,
// whether it has a body, its size, whether it is script-ish, and whether it is in
// scope. A recovered `.ts`, `.vue` or `.scss` has NO STATUS — it was never
// served — no scope of its own, and a kind that is whatever the developer wrote
// rather than what a `Content-Type` header claimed. Three of those five axes have
// no answer that is not INVENTED, and an invented answer to an admission question
// is worse than no answer: it is a fact the rest of the pipeline will reason from.
//
// So the derived path carries a SIZE BOUND ONLY, plus the two things a size bound
// cannot express — a source with nothing in it, and D-13's re-entry limit.
//
// ===========================================================================
// WHY `REJECT_REASONS` IS NOT EXTENDED, AND THE ARGUMENT HAS FOUR PARTS
// ===========================================================================
// The obvious move is to add `depth_exceeded` to `hooks/admit.ts`'s
// `REJECT_REASONS` and be done. Each of the four reasons below is on its own
// sufficient, and together they are why this file exists at all.
//
//   1. THE TEST WOULD HAVE TO LIE. `admit.spec.ts:436-455` runs an
//      every-reason-has-a-case gate: for each member of `REJECT_REASONS` there
//      must be a CASE whose `run()` actually PRODUCES that reason from `admit()`.
//      There is no `admit()` call anywhere on the derived path — that is the
//      whole of D-14 — so no case could produce a derived reason honestly. The
//      only way to make the gate pass would be a case that asserts something
//      `admit()` cannot do, which converts a mechanical gate into a decorative
//      one for every reason it already covers.
//
//   2. THE ADMISSION COUNTERS WOULD DESCRIBE SOMETHING ADMISSION NEVER DID.
//      `telemetry.ts` keys `rejected` — and `retro.rejected` — as
//      `Record<RejectReason, number>`, derived from the union. A derived reason
//      added to that union acquires a counter in BOTH maps, on the one surface
//      an operator consults to answer "is DefMiner keeping up with my browsing".
//      That is precisely the corruption D-02's retro split exists to prevent,
//      arriving by another door.
//
//   3. 06-11's PUSH-DOWN SUPERSET PROOF HAS NO STATEMENT ABOUT IT. That proof
//      reasons about which responses the HTTPQL pre-filter can and cannot let
//      through relative to `admit()`'s own verdict: the push-down is a superset
//      of what admission accepts, and every member of `REJECT_REASONS` sits
//      inside that statement. A member HTTPQL never sees — because it describes
//      a source recovered from a body rather than a response — is outside the
//      proof's subject entirely. Widening the union would put a member inside a
//      proof that says nothing about it, which reads as coverage and is not.
//
//   4. `too_large` AND `empty` ARE WORD-IDENTICAL TO `REJECT_REASONS` MEMBERS,
//      AND THAT IS CORRECT. It is the same situation `packages/engine/src/
//      contract.ts:88-120` documents at length for `running`, which is a literal
//      member of both `SCAN_STATES` and `SCAN_LIFECYCLE_STATES`. Two closed
//      vocabularies about DIFFERENT SUBJECTS may share a word; what keeps them
//      apart is the four mechanisms that file names, and all four hold here:
//
//        ADJACENT DECLARATION — this array is declared beside the entry point
//        that produces it, so the collision is visible where it is decided
//        rather than discovered at a call site three packages away.
//
//        A DISTINCT COLUMN NAME — nothing here writes `analyses.error` directly;
//        `ingest/consumer.ts` namespaces every code it writes to that column, so
//        a derived `too_large` and an admission `too_large` cannot arrive as the
//        same string.
//
//        NON-PREFIX LABELS — plan 07-08 renders these under recovered-source
//        copy, and no label it uses is another vocabulary's label or a prefix of
//        one.
//
//        SEPARATE PRESENTATION MAPS — `counters.sourcemap.derivedRejected` is
//        its own sub-map, not a widening of `counters.rejected`.
//
// THE PROJECT'S RULE IS NOT "ONE VOCABULARY". This repository ships eleven closed
// vocabularies today — `REJECT_REASONS`, `SCAN_STATES`, `SCAN_LIFECYCLE_STATES`,
// `OPERATOR_CLAUSE_REJECTIONS`, `INVALIDATION_CATEGORIES`, `MAP_PARSE_REASONS`,
// `SOURCE_PRODUCIBILITY_STATES` and the rest. The rule is ONE VOCABULARY PER
// SUBJECT, and a twelfth for a twelfth subject is the rule being followed rather
// than bent.

import { MAP_MAX_BYTES } from "@defminer/engine/thresholds";

/**
 * Why a recovered source did not enter the pipeline. A CLOSED, DefMiner-authored
 * vocabulary, and a SIBLING of `hooks/admit.ts`'s `REJECT_REASONS` rather than an
 * extension of it — see this file's header for the four-part argument.
 *
 * Declared once as a runtime array with the type DERIVED from it, in
 * `scan/filter.ts`'s `OPERATOR_CLAUSE_REJECTIONS` idiom, because that is what
 * makes the every-reason-has-a-case gate in `derive.spec.ts` MECHANICAL: a
 * fourth reason added here with no case fails immediately, and a hand-maintained
 * parallel union and list would drift silently.
 *
 * SMALL AND HONEST. D-14 says the derived path carries a size bound only, so
 * three members is what the path can actually produce. A vocabulary that
 * anticipated refusals nobody has implemented would be codes plan 07-08 renders
 * for a situation that cannot arise.
 */
export const DERIVED_REJECT_REASONS = Object.freeze([
  "too_large",
  "empty",
  "depth_exceeded",
] as const);

/** One member of {@link DERIVED_REJECT_REASONS}. */
export type DerivedRejectReason = (typeof DERIVED_REJECT_REASONS)[number];

/**
 * The largest recovered source this path admits, in BYTES.
 *
 * DECLARED HERE AND NOT IN `thresholds.ts`, deliberately. `thresholds.ts` holds
 * PROJECT POLICY — the numbers a whole phase is derived against, each with a
 * measured term in `POLICY_DERIVED_FROM`. This is a property of ONE ENTRY POINT:
 * how big a thing this particular gate will let through. Putting it in the
 * policy set would make every future reader look for a measurement that answers
 * "how big may a recovered source be" as a project question, and there isn't
 * one — the answer is a consequence of `MAP_MAX_BYTES`.
 *
 * DERIVATION, AND IT IS AN INEQUALITY RATHER THAN A CHOICE:
 *
 *   A SINGLE RECOVERED SOURCE CANNOT EXCEED THE MAP THAT CARRIED IT. Every byte
 *   of `sourcesContent[i]` is a byte of the decoded map document, and the map
 *   document is refused above {@link MAP_MAX_BYTES} before it is parsed. So
 *   `MAP_MAX_BYTES` is already an upper bound on this quantity, and any smaller
 *   number here would be a SECOND, tighter policy that nothing measured.
 *
 *   THE PROBE SAYS A SMALLER ONE IS NOT NEEDED. `sources_materialise` came out
 *   at 2.3975 ms/MB across the D-10 ladder
 *   [.planning/phases/07-sourcemap-reconstruction/results/map-bytes.json,
 *   `derivation.op_ms_per_mb`], the CHEAPEST of the five measured operations. At
 *   `MAP_MAX_BYTES` (2,621,440 bytes = 2.5 MiB) materialising one source of that
 *   size costs ~6.0 ms against a `MAX_SYNC_SLICE_MS` of 25 — so the stall
 *   argument that binds `MAP_MAX_BYTES` does not bind again here. If the ladder
 *   is re-run and that curve moves, LOWER THIS and cite the artifact; the
 *   relationship, not the number, is what has to hold.
 *
 * SO IT IS `MAP_MAX_BYTES` ITSELF, and the equality is the statement: the
 * derived path refuses exactly what the map path already refused, and nothing
 * further. `derive.spec.ts` asserts the relation rather than the literal, so a
 * re-run ladder cannot leave this behind.
 */
export const DERIVED_SOURCE_MAX_BYTES = MAP_MAX_BYTES;

/**
 * How many levels of reconstruction may run. D-13's bound, and it is ONE.
 *
 * A bundle is reconstructed. The sources that come out are analysed. If one of
 * THEM announces a map, that announcement is NOT followed — the stage refuses
 * with {@link DERIVED_REJECT_REASONS} `depth_exceeded` and never calls
 * `findAnnouncement` at all.
 *
 * THE RECURSION LIMIT IS THE VALUABLE HALF OF MAP-06 AND IT IS FULLY TESTABLE
 * TODAY, which is why it is wired now rather than left for Phase 3 to add under
 * pressure: an attacker-controlled body that recovers to another
 * attacker-controlled body is unbounded work on the proxy thread (T-07-31), and
 * a bound written after the path exists is a bound somebody has to remember.
 */
export const DERIVED_MAX_DEPTH = 1;

/** Admitted, or refused with a named code. Never a sentence, never an exception's
 *  text — the same rule `scan/filter.ts` states for the operator clause. */
export type DerivedAdmitResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: DerivedRejectReason };

const ADMITTED: DerivedAdmitResult = Object.freeze({ ok: true });

function refused(reason: DerivedRejectReason): DerivedAdmitResult {
  return { ok: false, reason };
}

/** One recovered source, as the reconstruction stage holds it.
 *
 *  @internal */
export type DerivedSource = {
  /** The content VERBATIM, exactly as `sourcesContent[i]` delivered it. */
  readonly content: string;
  /**
   * Its length in BYTES, computed by the caller.
   *
   * BYTES AND NOT `content.length`. `String.length` counts UTF-16 code units and
   * under-counts every character outside the Basic Latin block, so a source of
   * CJK identifiers would pass a length check while being well over the ceiling
   * in the units the ceiling was measured in — the same trap
   * `sourcemap/parse.ts` names at its own decoded-size gate. Passed in rather
   * than computed here because the caller already has the encoded buffer: it
   * needs it for the content digest, and encoding twice would double the
   * allocation this gate exists to bound.
   */
  readonly byteLen: number;
};

/**
 * May a reconstruction stage RUN at this depth? D-13's re-entry bound.
 *
 * SEPARATE FROM {@link admitDerived} BECAUSE IT ANSWERS A DIFFERENT QUESTION
 * about a different subject — "may this STAGE run" rather than "may this SOURCE
 * enter" — while drawing on the SAME vocabulary, because both are refusals of
 * the derived path and the operator sees one list. Folding them into one
 * function would mean handing it a fabricated source to ask the depth question,
 * which is the invented-answer problem this file's header refuses.
 */
export function admitDerivedDepth(depth: number): DerivedAdmitResult {
  return depth >= DERIVED_MAX_DEPTH ? refused("depth_exceeded") : ADMITTED;
}

/**
 * May this recovered source enter the pipeline? D-14's size bound, and nothing
 * else.
 *
 * IT DOES NOT CALL `admit()` AND IT NEVER WILL. See this file's header: three of
 * admission's five axes have no answer here that is not invented.
 *
 * ORDER: emptiness before size. An empty source is not a small source — it is a
 * map declaring a file it did not ship, which ECMA-426 permits — and reporting
 * it as `too_large`'s complement rather than by its own name would make the
 * commonest legal shape in the corpus read as a size decision.
 */
export function admitDerived(source: DerivedSource): DerivedAdmitResult {
  // BOTH SPELLINGS OF "NOTHING THERE", one reason. `sourcemap/parse.ts` routes a
  // null or absent `sourcesContent[i]` to its own skip list, so what reaches
  // here is the EMPTY STRING — and a zero-byte content is the same fact by
  // another route. Splitting them would be two words for one thing, which is the
  // argument `MAP_PARSE_REASONS` makes for its own `empty`.
  if (source.content.length === 0 || source.byteLen === 0) {
    return refused("empty");
  }
  // `>` AND NOT `>=`: the ceiling is the largest source this path admits, not
  // the smallest it refuses — the same boundary `hooks/admit.ts` states for
  // `PASSIVE_MAX_BYTES` and `sourcemap/parse.ts` for `MAP_MAX_BYTES`. A stricter
  // comparison here would refuse a source of exactly the size the map gate
  // already accepted.
  if (source.byteLen > DERIVED_SOURCE_MAX_BYTES) return refused("too_large");
  return ADMITTED;
}
