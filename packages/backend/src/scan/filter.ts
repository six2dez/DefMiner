// packages/backend/src/scan/filter.ts — the ONE producer of a scan filter
// string, and the ONE validator of the operator's clause (D-05, O-06, FIND-03).
//
// ===========================================================================
// NOTHING ELSE IN THIS PACKAGE CONCATENATES HTTPQL. NOTHING.
// ===========================================================================
// Not a template literal with a substitution, not a `+`, not a `.join()`, not a
// helper that "just" appends a term. Every HTTPQL string that reaches
// `sdk.requests.query().filter(...)` is produced HERE, by {@link composeScanFilter},
// and by no other function in DefMiner.
//
// THAT IS NOW MECHANICAL. `packages/backend/src/scan/httpql-discipline.spec.ts`
// walks the TypeScript AST of every shipped backend module and fails on any
// interpolated, concatenated or joined string reaching a `filter` sink from
// anywhere but this module's composer. It is a SIBLING of
// `store/sql-discipline.spec.ts` and not an extension of it: that gate's
// `SQL_SINKS` is `{prepare, exec, run, get, all}` with no `filter` entry, and
// its `looksLikeSql()` requires a SQL keyword no HTTPQL clause contains, so it
// is silent here by construction rather than by oversight.
//
// The gate polices COMPOSITION AT THE SINK, not where HTTPQL fragments live.
// That distinction is deliberate and it is the reason the gate still fits after
// plan 06-01 moved `SCAN_KIND_CLAUSE` into the engine contract: a fragment in a
// shared constant is not a hazard, because a fragment cannot place the
// operator's clause first. A second COMPOSER is the hazard, and a second
// composer is what the gate reports.
//
// ===========================================================================
// WHY ORDER IS THE MITIGATION AND NOT A STYLE CHOICE (T-06-HTTPQL-INJ)
// ===========================================================================
// HTTPQL supports comments — Caido's reference names both `//` and the
// multi-line form:
//
//   "Caido supports both single-line and multi-line comments in HTTPQL queries."
//   "Comments can be used to write descriptions or temporarily disable certain
//    query statements."
//   [https://docs.caido.io/app/reference/httpql]
//
// An operator clause ending in a line comment, placed BEFORE DefMiner's clause,
// would comment DefMiner's narrowing away: the scan would then run WIDER than
// the operator was shown, which is precisely the widening D-05 forbids. Placed
// LAST, the same input can only comment out the trailing parenthesis, producing
// an unbalanced expression — and `execute()` "@throws {Error} If a query
// parameter is invalid". It FAILS CLOSED.
//
// So the order is DefMiner first, operator last, and it is load-bearing rather
// than tidy. THE ORDER IS THE MITIGATION; the validator below is a better error
// message and a cost bound. A reader deciding whether some edge in
// `validateOperatorClause` is a security hole should start from that sentence:
// the answer is almost always "no, it is a worse error message" — the hole
// would be in the ORDER.
//
// ===========================================================================
// WHY EVERY CLAUSE IS PARENTHESISED
// ===========================================================================
// Caido's own HTTPQL reference contradicts itself on one page. Under "Logical
// Operators":
//
//   "Operators are case insensitive. Both have the same priority."
//
// Under "Logical Grouping", immediately below, worked out twice:
//
//   "Caido supports the priority of operations: AND has a higher priority than
//    OR. `<Clause1> AND <Clause2> OR <Clause3>` is equivalent to
//    `((<Clause1> AND <Clause2>) OR <Clause3>)`."
//   [https://docs.caido.io/app/reference/httpql — both boxes quoted verbatim]
//
// The two worked examples are internally consistent with AND-binds-tighter; the
// "same priority" box contradicts them, and DefMiner has no way to find out
// which is true short of measuring the parser. So DefMiner must not depend on
// precedence AT ALL. Wrapping each clause in its own parentheses makes the
// composition mean the same thing under either reading — a DERIVATION, not a
// preference, and the answer to D-05's requirement that the composition rule be
// part of the scan RPC's contract.
//
// ===========================================================================
// AND WHY AN ABSENT CLAUSE IS OMITTED RATHER THAN EMITTED EMPTY
// ===========================================================================
// A scan that has not walked yet has no position, and most scans carry no
// operator clause. `(<kind>) AND ()` is a syntax error the operator would meet
// as an unexplained failure on the first press of Start scan. The term is
// SKIPPED instead — which is also why this function takes the clauses rather
// than the values they were built from: the decision "is there a term here" is
// made once, here.
//
// NO REGULAR EXPRESSION ANYWHERE ON THIS PATH (T-06-22). `hooks/admit.ts` states
// the reason at length and it applies unchanged: REDOS_RECOVERY is `kill`, and a
// catastrophic pattern hangs the QuickJS thread with no interrupt — SIGKILL was
// the only teardown that worked and it takes the operator's real project data
// with it. Everything below is `indexOf`, a character loop, and template
// substitution over DefMiner-authored strings. `filter.spec.ts` and the shipped
// no-regex habit are what keep it that way: there is no pattern literal and no
// dynamic pattern construction below, and none may be added.

import { SCAN_KIND_CLAUSE } from "@defminer/engine/contract";

// THE CLAUSE ITSELF IS NOT DECLARED HERE, AND THAT IS DELIBERATE. It lives in
// `@defminer/engine/contract` because the FRONTEND renders it — the start form's
// read-only "DefMiner always scans for" field shows it before any scan exists,
// which is what makes D-05's "you can narrow, you cannot widen" checkable rather
// than merely promised. There is no scan row to carry it across the RPC at that
// moment, and the frontend cannot import this package at all: the backend
// imports `caido:*` specifiers that resolve only inside Caido's QuickJS. The one
// module both packages already import is the engine contract, which is exactly
// the argument that moved `SCAN_STATES` there in plan 05-09.
//
// It is NOT re-exported from here either. A re-export with no consumer is a dead
// export knip reports, and a re-export WITH consumers would give the constant two
// import paths — which is how a codebase ends up with half its call sites on one
// and half on the other. Backend callers that need the bare clause import it from
// the contract; callers that need a COMPOSED filter call the function below, and
// that is the only asymmetry worth having.
//
// ===========================================================================
// THE SUPERSET DERIVATION, TERM BY TERM — AND WHY IT LIVES HERE
// ===========================================================================
// The constant lives in the engine; the ARGUMENT for its terms lives here,
// because the argument is about `hooks/admit.ts` — `SCRIPTISH_MEDIA_TYPES` and
// `isScriptish` — and the engine cannot import the backend (DET-03: the engine
// declares no dependencies at all, and knip fails the build if it reaches for
// one). A derivation that names a module it cannot see would be a comment
// nobody could check.
//
// The push-down must be a SUPERSET of `admit()`'s kind axis, or the retroactive
// scan silently never sees an artifact the live path would have taken. Silently
// is the operative word: a subset returns FEWER rows, not an error.
//
// `isScriptish` accepts on either of two branches. Each has its own terms:
//
//   BRANCH 1 — the URL suffix, on a fragment- and query-stripped, LOWERCASED
//   URL: `.js` or `.mjs`.
//     req.path.like:"%.js%"   covers  .js
//     req.path.like:"%.mjs%"  covers  .mjs
//   TWO terms and not one, because `.mjs` does NOT contain `.js` — the
//   characters are `.`,`m`,`j`,`s` and the substring needs `.` immediately
//   followed by `j`. 06-RESEARCH § O-03 records catching that error rather than
//   silently correcting it, and `filter.spec.ts` asserts the premise directly.
//   `req.path` excludes the query string (`req.query` is a separate field),
//   matching `isScriptish`'s query-stripping — MEASURED, see below. It
//   over-matches `/x.jsonp` — harmless, and in the SAFE direction.
//
//   BRANCH 2 — the MIME essence, parameters stripped and lowercased, exact-
//   matched against seventeen values. There is NO `resp.content_type` field in
//   HTTPQL at all, so the only reachable surface is `resp.raw`, defined as "The
//   full raw data of the response (includes response line, headers, and body
//   data)". FIVE substrings cover all seventeen:
//
//     "javascript"  (10) application/javascript, application/x-javascript,
//                        text/javascript, text/javascript1.0 … 1.5 (six),
//                        text/x-javascript
//     "ecmascript"   (4) application/ecmascript, application/x-ecmascript,
//                        text/ecmascript, text/x-ecmascript
//     "jscript"      (1) text/jscript          — NOT a substring of "javascript"
//                        (j-s-c-r-i-p-t vs j-a-v-a-s-c-r-i-p-t), so it needs its
//                        own term
//     "livescript"   (1) text/livescript
//     "text/js"      (1) text/js               — the one essence none of the
//                        other four reach
//                       10 + 4 + 1 + 1 + 1 = 17.
//
//   Each is spelled `resp.raw.like:"%<needle>%"`. The `%` are LIKE wildcards and
//   no needle contains a `%` or `_` of its own, so no escape clause is needed —
//   `filter.spec.ts` asserts that premise rather than assuming it.
//
//   `resp.raw` matches the BODY as well as the headers, so an HTML page
//   containing the word "javascript" matches too. That over-matches in the SAFE
//   direction — the push-down is an optimisation and `admit()` still runs on
//   every returned item — and it is why the clause is weakly selective rather
//   than wrong.
//
// AND WHY `req.ext.eq` IS EXCLUDED. It is the obvious term and it is the one
// that breaks the relation: `eq` is documented CASE SENSITIVE, while
// `isScriptish` lowercases before its suffix test. A response at `/APP.JS` is
// admitted by `admit()` and MISSED by `req.ext.eq:".js"` — a strict subset, and
// an invisible one. No `eq` operator appears on a path or extension field in
// this clause, and `filter.spec.ts` asserts that mechanically.
//
// ===========================================================================
// AND WHY `cont` IS EXCLUDED TOO — THE PART THAT HAD TO BE MEASURED
// ===========================================================================
// `cont` was this clause's original operator, on the reference's own word:
//
//   "cont / ncont — Case insensitive."
//   [https://docs.caido.io/app/reference/httpql]
//
// IT IS NOT, ON CAIDO 0.58.2. Plan 06-11 asked Caido rather than the docs, by
// handing the clause to `sdk.requests.matches()` inside a plugin against a
// captured fixture corpus. With the `cont` clause the evaluator returned FALSE
// for a response served at `/F02-UPPER.JS` and for one served
// `Content-Type: TEXT/JAVASCRIPT` — both of which `isScriptish` ACCEPTS. The
// same probe evaluated the terms side by side: `req.path.cont:".js"` and
// `req.path.cont:".JS"` returned DISJOINT match sets, which settles it.
//
// So the clause is on `like` — SQLite LIKE, whose ASCII case folding the same
// probe measured directly: `req.path.like:"%.js%"` and `req.path.like:"%.JS%"`
// returned the IDENTICAL match set. ASCII folding is a COMPLETE cover of
// `toLowerCase()` for these seven needles, because every character in `.js`,
// `.mjs` and the seventeen essences is ASCII and no non-ASCII character
// lowercases INTO one of them; a header spelled `TEXT/JAVASCRİPT` folds to
// `text/javascri̇pt`, which `isScriptish` rejects too, so nothing is owed there.
//
// THE RECORD: `.planning/phases/06-retroactive-scan-deployment-reality/results/
// pushdown-superset.json`. THE STANDING GATE: `tests/phase6-pushdown.spec.ts`.
//
// THE 2xx BOUND is not part of the kind axis and is safe for a separate reason:
// `admit()` rejects anything outside 200–299 on its FIRST axis, before the kind
// axis is reached, so filtering to 2xx cannot drop anything `admit()` would
// accept. 304s are correctly excluded — `admit()` turns them away under
// `revalidation`, also before the kind axis.
//
// THIS WAS AN ARGUMENT AND IT IS NOW A MEASUREMENT. Plan 06-11's fixture suite
// over `sdk.requests.matches()` ran it, and two of the three things this comment
// used to assert on the documentation's word turned out to be false — which is
// precisely why D-06 required the suite instead of the comment. What is now
// MEASURED on 0.58.2, per fixture, in
// `results/pushdown-superset.json`:
//   * `req.path` DOES exclude the query string — `/f05-query.js?v=2` matched on
//     the path term alone.
//   * A fragment never crosses the wire at all, so no term is owed one.
//   * `cont` is CASE SENSITIVE, contradicting the reference. `like` folds ASCII
//     case, as SQLite LIKE does. Both directions measured with paired terms.
// `tests/phase6-pushdown.spec.ts` re-derives the superset relation on every
// `pnpm test` by importing THIS clause and the shipped `isScriptish` and joining
// them to the recorded verdicts by fixture id. A term that stops covering the
// kind axis is a red test naming the fixture and its URL.

/**
 * The longest operator clause DefMiner will compose.
 *
 * THE NUMBER IS DERIVED FROM WHAT THE OPERATOR CAN BE SHOWN BACK. The clause is
 * the one unbounded operator-authored string on the scan path, and the surface
 * that has to render it in full is the per-scan detail, which sanitises through
 * `forPanel` at `EVIDENCE_PANEL_MAX_GRAPHEMES` (2048). A cap above that number
 * would let an operator type a clause DefMiner then shows them TRUNCATED — on
 * the one string whose whole job is that they can check it against the composed
 * filter. So the cap is that number.
 *
 * ASSERTED IN `filter.spec.ts` RATHER THAN IMPORTED. This module does not import
 * the sanitiser: the cap is a COST bound (T-06-19 — a widened clause turns a
 * targeted scan into a pull of every stored body in history, on a runtime where
 * every page transfers full bodies) that happens to coincide with a DISPLAY
 * bound. Coupling the backend's query path to the frontend's rendering module
 * for a coincidence would be the wrong dependency; the spec asserts the equality
 * so drift is loud instead.
 *
 * The units differ and the difference errs SAFE: `String.length` counts UTF-16
 * code units, the display cap counts graphemes, and a grapheme is never fewer
 * than one code unit — so a clause within this cap is always within the panel's
 * cap.
 */
export const OPERATOR_CLAUSE_MAX_CHARS = 2048;

/**
 * Every reason an operator's clause can be turned away — a CLOSED set, declared
 * once as a runtime array with the type DERIVED from it.
 *
 * The `REJECT_REASONS` idiom from `hooks/admit.ts`, for the same reason: it is
 * what makes the "every reason has a case" gate in `filter.spec.ts` mechanical.
 * A fifth reason added here with no case fails immediately, and a hand-
 * maintained parallel union and list would drift silently.
 *
 * THESE ARE THE `{reason}` THE START FORM RENDERS. 06-UI-SPEC.md's copywriting
 * contract — "That filter was not accepted: {reason}. Nothing was started." —
 * requires `{reason}` to be a DefMiner-authored code and never Caido's parser
 * text (T-06-20). That is a property of this array: every member is a word
 * chosen here, and no rejection path anywhere quotes a caught exception.
 */
export const OPERATOR_CLAUSE_REJECTIONS = Object.freeze([
  "comment_construct",
  "unbalanced_parentheses",
  "whitespace_only",
  "too_long",
] as const);

export type OperatorClauseRejection =
  (typeof OPERATOR_CLAUSE_REJECTIONS)[number];

/**
 * Accepted, or refused with a named code. Never a sentence, never a parser
 * message.
 *
 * NOT EXPORTED YET, AND THAT IS KNIP'S RULE RATHER THAN A STYLE CHOICE. This
 * repo runs with `ignoreExportsUsedInFile: false`, so an export referenced only
 * inside its own module is reported as dead — and it IS dead until something
 * outside this file names the type rather than inferring it. Plan 06-05's
 * `startScan` is the first caller that will, and exporting it THEN is a visible
 * one-word edit; exporting it now would be a dead export that has to be
 * exempted, and an exemption nobody needs is how the next real finding gets
 * hidden.
 */
type OperatorClauseVerdict =
  | { ok: true }
  | { ok: false; reason: OperatorClauseRejection };

/** The three comment grammars the HTTPQL reference names. Checked by index scan,
 *  never by pattern — see this file's header on REDOS_RECOVERY. */
const COMMENT_MARKERS = ["//", "/*", "*/"] as const;

/**
 * Does every parenthesis close, counting OUTSIDE double-quoted strings?
 *
 * QUOTE-AWARE ON PURPOSE. `req.path.cont:"(("` is a perfectly legal clause whose
 * parentheses are TEXT being searched for, not structure. A naive tally would
 * refuse it, and refusing legal clauses is how a validator teaches operators to
 * work around it rather than with it.
 *
 * The backslash escape is honoured. Whether HTTPQL actually supports `\"` inside
 * a string is UNMEASURED — the reference does not say. The direction that
 * ambiguity errs in is the reason it does not matter much: if this counter loses
 * track of the string state, the worst outcome is that it ACCEPTS a clause whose
 * parentheses do not really balance, and an unbalanced clause fails CLOSED at
 * `execute()` because the operator's clause is LAST. The counter is a better
 * error message; the ORDER is the mitigation.
 *
 * An UNTERMINATED string (`req.path.cont:"x`) is likewise accepted here and
 * likewise fails closed downstream: everything after it, including the composer's
 * trailing `)`, becomes part of the string and the expression never closes.
 */
function parenthesesBalance(raw: string): boolean {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (ch === "\\") i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "(") {
      depth += 1;
    } else if (ch === ")") {
      depth -= 1;
      // Refused at the point it goes NEGATIVE and not only at the end: `) AND (`
      // ends at depth zero and is not balanced in any sense that matters.
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

/** Is every character whitespace? `indexOf`-free and pattern-free by construction. */
function isWhitespaceOnly(raw: string): boolean {
  return raw.trim() === "";
}

/**
 * Decide whether an operator's HTTPQL clause may be composed.
 *
 * `""` is ACCEPTED and is a valid, complete input — most scans carry no operator
 * clause, and {@link composeScanFilter} omits the term entirely rather than
 * emitting `()`. That is the handling of an ABSENT clause. A clause the operator
 * TYPED and that means nothing is a different thing and gets its own code.
 *
 * The four checks, in this order:
 *
 * 1. COMMENT CONSTRUCTS. DefMiner has no use for an operator comment, and a
 *    comment is the one construct that can reach across a parenthesis. Refused
 *    ANYWHERE in the clause, including inside a quoted string: this check is
 *    deliberately NOT quote-aware, unlike the parenthesis counter. The asymmetry
 *    is intentional and it is the safe direction — refusing the unusual clause
 *    `req.path.cont:"//"` costs the operator one edit and a named reason, while
 *    a quote-aware check that mis-tracks a string state costs the scan.
 * 2. PARENTHESIS BALANCE, quote-aware — see {@link parenthesesBalance}.
 * 3. WHITESPACE-ONLY, refused rather than normalised to absent. Composing
 *    without the third term is the correct handling of an absent clause; a
 *    clause of spaces is a mistake worth naming, and 06-UI-SPEC.md has already
 *    written the copy for naming it.
 * 4. LENGTH, against the declared cap.
 *
 * The order costs nothing to state and is worth stating: a clause that is both
 * over the cap AND carries a comment reports the comment, because that is the
 * more useful thing to be told.
 *
 * @param raw - Exactly what the operator typed. Never trimmed, never normalised,
 * never rewritten — a validator that silently edits input is a validator whose
 * output the operator cannot check against the composed filter they are shown.
 */
export function validateOperatorClause(raw: string): OperatorClauseVerdict {
  for (const marker of COMMENT_MARKERS) {
    if (raw.indexOf(marker) !== -1) {
      return { ok: false, reason: "comment_construct" };
    }
  }
  if (!parenthesesBalance(raw)) {
    return { ok: false, reason: "unbalanced_parentheses" };
  }
  // `raw !== ""` first: an ABSENT clause is not a whitespace-only one, and
  // conflating them would refuse the most common input in the product.
  if (raw !== "" && isWhitespaceOnly(raw)) {
    return { ok: false, reason: "whitespace_only" };
  }
  if (raw.length > OPERATOR_CLAUSE_MAX_CHARS) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true };
}

/**
 * Build the position clause for a resume boundary.
 *
 * `lt` AND NOT `lte`. The walk is descending on `row.id`, so the boundary is
 * the LAST request the previous page walked; `lte` would re-walk it as the
 * first item of every subsequent page, once per page, for the whole backfill.
 * Anything wider than `lt` would leave a gap. The two errors are not
 * symmetrical — a repeat costs a wasted full-body transfer, a gap costs an
 * artifact the operator will never be told was missed — but `lt` has neither.
 *
 * `""` for a scan that has not walked yet, so {@link composeScanFilter} omits
 * the term rather than emitting an empty one.
 *
 * The id is interpolated because it is Caido's own opaque identifier for a
 * stored request, read back out of a column this plugin wrote — it is never
 * operator input and never target-controlled. HTTPQL has no bind parameters at
 * all, so there is no alternative shape available even in principle.
 */
export function positionClause(lastRequestId: string): string {
  return lastRequestId === "" ? "" : `row.id.lt:${lastRequestId}`;
}

/**
 * Compose the filter one page of the retroactive scan will be executed under.
 *
 * DefMiner's kind clause is ALWAYS first and is never omitted. The position
 * clause is second when there is one. The operator's clause is LAST and is
 * skipped entirely when it is `""` — see this file's header for why each of
 * those three sentences is a security property rather than a formatting rule.
 *
 * THE OPERATOR'S CLAUSE IS RE-VALIDATED HERE, AND OMITTED IF IT DOES NOT PASS.
 * Defence in depth: `startScan` validates before it writes a row, so this path
 * is unreachable through the shipped RPC, and that is exactly why it is worth
 * having — the claim "no unvalidated operator clause reaches the wire" becomes a
 * property of this function instead of a discipline every future caller has to
 * remember.
 *
 * IT OMITS RATHER THAN THROWS, for a measured reason and not a stylistic one.
 * `runScanProducer` composes the filter OUTSIDE the `try` that wraps
 * `execute()` — deliberately, because checking the epoch guard after paying for
 * a full-body page transfer is the expensive half of the mistake. A throw here
 * would escape `runScanProducer` entirely rather than being caught and reported
 * as a scan failure. And the direction omission fails in is the one D-05 cares
 * about: dropping the operator's term NARROWS the scan to DefMiner's own clause.
 * It can never widen it. The operator is not misled either — `composedFilter` on
 * the status payload is this function's output, so the readout shows the exact
 * string that was sent.
 *
 * @param position - `row.id.lt:<id>`, or `""` on a first page. DefMiner-built
 * from an integer identifier; never operator input.
 * @param operator - The operator's own HTTPQL, or `""`. Validated by
 * {@link validateOperatorClause} at the RPC boundary before it is persisted, and
 * again here before it is composed.
 */
export function composeScanFilter(position: string, operator: string): string {
  const terms = [`(${SCAN_KIND_CLAUSE})`];
  if (position !== "") terms.push(`(${position})`);
  // LAST, unconditionally, and only when it is non-empty AND valid. All three
  // halves matter: last is what makes a trailing comment fail closed, the
  // emptiness check is what keeps `()` off the wire, and the re-validation is
  // what keeps the claim in this function's JSDoc true without trusting callers.
  if (operator !== "" && validateOperatorClause(operator).ok) {
    terms.push(`(${operator})`);
  }
  return terms.join(" AND ");
}
