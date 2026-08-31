// packages/backend/src/scan/filter.ts — the ONE producer of a scan filter
// string (D-05, O-06, FIND-03).
//
// ===========================================================================
// NOTHING ELSE IN THIS PACKAGE CONCATENATES HTTPQL. NOTHING.
// ===========================================================================
// Not a template literal with a substitution, not a `+`, not a `.join()`, not a
// helper that "just" appends a term. Every HTTPQL string that reaches
// `sdk.requests.query().filter(...)` is produced HERE, by {@link composeScanFilter},
// and by no other function in DefMiner. Plan 06-04 makes that mechanical with a
// static gate in `sql-discipline.spec.ts`'s idiom — an AST walk whose sink set
// is `{"filter"}` and whose one allowlisted producer is this module. Until it
// lands the rule is this paragraph, and it is not advisory: a second producer
// is a second place the operator's clause can be placed FIRST.
//
// ===========================================================================
// WHY ORDER IS THE MITIGATION AND NOT A STYLE CHOICE (T-06-01)
// ===========================================================================
// HTTPQL supports comments — Caido's reference names both `//` and the
// multi-line form. An operator clause ending in a line comment, placed BEFORE
// DefMiner's clause, would comment DefMiner's narrowing away: the scan would
// then run WIDER than the operator was shown, which is precisely the widening
// D-05 forbids. Placed LAST, the same input can only comment out the trailing
// parenthesis, producing an unbalanced expression — and `execute()` "throws if
// a query parameter is invalid". It FAILS CLOSED.
//
// So the order is DefMiner first, operator last, and it is load-bearing rather
// than tidy.
//
// ===========================================================================
// WHY EVERY CLAUSE IS PARENTHESISED
// ===========================================================================
// Caido's own HTTPQL reference contradicts itself on one page: under "Logical
// Operators" it says AND and OR have "the same priority", and under "Logical
// Grouping" immediately below it works two examples in which AND binds tighter.
// DefMiner must therefore not depend on precedence AT ALL. Wrapping each clause
// in its own parentheses makes the composition mean the same thing under either
// reading — a derivation, not a preference, and the answer to D-05's
// requirement that the composition rule be part of the scan RPC's contract.
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
// NO REGULAR EXPRESSION ANYWHERE ON THIS PATH. `hooks/admit.ts` states the
// reason at length and it applies unchanged: REDOS_RECOVERY is `kill`, and a
// catastrophic pattern hangs the QuickJS thread with no interrupt — SIGKILL was
// the only teardown that worked and it takes the operator's real project data
// with it. Everything below is array work and template substitution over
// DefMiner-authored strings.

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
 * @param position - `row.id.lt:<id>`, or `""` on a first page. DefMiner-built
 * from an integer identifier; never operator input.
 * @param operator - The operator's own HTTPQL, or `""`. Validated BEFORE it
 * reaches here — plan 06-04 owns the validator, and until it ships the only
 * value the RPC accepts is `""`.
 */
export function composeScanFilter(position: string, operator: string): string {
  const terms = [`(${SCAN_KIND_CLAUSE})`];
  if (position !== "") terms.push(`(${position})`);
  // LAST, unconditionally, and only when it is non-empty. Both halves matter:
  // last is what makes a trailing comment fail closed, and the emptiness check
  // is what keeps `()` off the wire.
  if (operator !== "") terms.push(`(${operator})`);
  return terms.join(" AND ");
}
