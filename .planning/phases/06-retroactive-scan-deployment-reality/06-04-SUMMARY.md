---
phase: 06-retroactive-scan-deployment-reality
plan: 04
subsystem: scan
tags: [httpql, security, static-analysis, typescript-ast, validation, caido-sdk]

requires:
  - phase: 06-retroactive-scan-deployment-reality
    provides: "plan 06-01's `composeScanFilter`, `SCAN_KIND_CLAUSE` in the engine contract, `scan/producer.ts`'s one `query().filter()` call site, and the module header prohibition this plan mechanises"
  - phase: 01-tracer-and-the-passive-path
    provides: "`hooks/admit.ts`'s `REJECT_REASONS` closed-vocabulary idiom, its no-regex prohibition and its reason, and `isScriptish` / `SCRIPTISH_MEDIA_TYPES` — the predicate the push-down must be a superset of"
  - phase: 05-inventory-evidence-and-the-operator-surface
    provides: "`store/sql-discipline.spec.ts`'s static-gate shape (file walk, closed rule names, one-entry head-matched allowlist) and `outbound-prohibition.spec.ts`'s `RULES` record and four-assertion non-vacuity block"
provides:
  - "`validateOperatorClause` and the closed `OPERATOR_CLAUSE_REJECTIONS` vocabulary — comment_construct, unbalanced_parentheses, whitespace_only, too_long"
  - "`OPERATOR_CLAUSE_MAX_CHARS` — the cap, derived from the surface that must render the clause in full"
  - "A `composeScanFilter` that re-validates and OMITS, so an unvalidated operator clause cannot reach the wire even if a caller forgets"
  - "The seventeen-essence to five-substring superset derivation, written out term by term where it can name `hooks/admit.ts`"
  - "`packages/backend/src/scan/httpql-discipline.spec.ts` — `auditHttpqlSource`, `HTTPQL_SINKS`, and the three rule ids `httpql-interpolation`, `httpql-concatenation`, `httpql-foreign-producer`"
affects: [06-05 startScan wiring and the RPC rejection codes, 06-03 producer loop, 06-11 push-down fixture proof, 06-12 scan history clause rendering]

actuals:
  tokens: 17187
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A second static AST gate written as a SIBLING of the first rather than an extension, with the measured reason the first is silent quoted in its header"
    - "A syntactic array-vs-query discriminator (function-valued argument = Array.prototype.filter) that errs toward REPORTING, with the direction stated"
    - "A gate that audits its OWN prose and asserts clean — the mechanical proof it walks the AST rather than scanning strings"
    - "A cap ASSERTED equal to a display constant rather than imported from it, so drift is loud without coupling the query path to the rendering module"
    - "Defence-in-depth by OMISSION rather than by throwing, chosen because the caller composes outside its own try block"

key-files:
  created:
    - packages/backend/src/scan/filter.spec.ts
    - packages/backend/src/scan/httpql-discipline.spec.ts
  modified:
    - packages/backend/src/scan/filter.ts

key-decisions:
  - "The new gate polices COMPOSITION AT THE SINK, not where HTTPQL fragments live — which is what makes it fit `SCAN_KIND_CLAUSE`'s shipped position in the engine contract rather than contradict it"
  - "`composeScanFilter` re-validates the operator clause and OMITS it on failure rather than throwing, because `runScanProducer` composes outside the try that wraps `execute()`; omission narrows to DefMiner's own clause and can never widen"
  - "`OPERATOR_CLAUSE_MAX_CHARS` is 2048, derived from `EVIDENCE_PANEL_MAX_GRAPHEMES` so the operator is never shown a truncated version of the one string they must check, and asserted equal in the spec rather than imported"
  - "The comment check is deliberately NOT quote-aware while the parenthesis counter is — the asymmetry is the safe direction, because refusing `req.path.cont:\"//\"` costs one edit while a mis-tracked string state costs the scan"
  - "The term-by-term superset derivation lives in `scan/filter.ts` and not beside the constant, because the argument is about `hooks/admit.ts` and the engine cannot import the backend (DET-03)"
  - "The `operator-clause-unsupported` refusal in `index.ts` was assessed and deliberately LEFT IN PLACE — plan 06-05 owns removing it, and removing it here without 06-05's outcome shape and RPC union would ship a half-wired endpoint"

patterns-established:
  - "Sibling-not-extension: when an existing static gate is silent about a new hazard, quote the measured reason it is silent (its sink set, its keyword test) in the new gate's header and write a new file rather than teaching one file two grammars"
  - "Allowlist liveness by MUTATION: audit the real call site, then audit the same source with the allowlisted name replaced, and assert the second FIRES — which proves the first result is the allowlist working rather than the gate never reaching the call"
  - "Load-bearing-defence labelling: a spec header that names WHICH of two defences is load-bearing, so a later reader deciding whether an edge case is a security hole knows where to look"

requirements-completed: [FIND-03]

coverage:
  - id: D1
    description: "`validateOperatorClause` refuses every member of a closed, frozen rejection vocabulary, and every member is exercised by a case asserted mechanically against the array"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#the table exercises exactly the members of OPERATOR_CLAUSE_REJECTIONS"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#OPERATOR_CLAUSE_REJECTIONS is a closed, duplicate-free vocabulary"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#refuses EVERY comment grammar the reference names, anywhere in the clause"
        status: pass
    human_judgment: false
  - id: D2
    description: "An EMPTY operator clause is a valid, complete input: it composes to DefMiner's terms alone and never emits an empty parenthesis pair"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#an EMPTY clause is a valid, complete input — not an empty one"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#omits an absent operator clause rather than emitting an empty parenthesis pair"
        status: pass
    human_judgment: false
  - id: D3
    description: "The parenthesis balance is counted OUTSIDE quoted strings, so a clause whose parentheses are text is accepted and the same characters outside quotes are refused"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#parentheses INSIDE a double-quoted string are text, not structure"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#the SAME characters outside quotes that are legal inside them"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#a closing parenthesis with nothing open — refused at the point it goes negative"
        status: pass
    human_judgment: false
  - id: D4
    description: "A declared character cap, exported, asserted against the constant and equal to the number the clause is rendered within"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#accepts a clause of EXACTLY the cap and refuses the next character"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#OPERATOR_CLAUSE_MAX_CHARS matches the evidence-panel display cap"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every clause is individually parenthesised and the operator's is LAST, so the composition means the same thing under either reading of Caido's self-contradictory precedence documentation"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#parenthesises EVERY clause, so the meaning survives either precedence reading"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#puts the OPERATOR's clause LAST, and that order is the mitigation"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#puts the OPERATOR's clause LAST, and that order is the mitigation"
        status: pass
    human_judgment: false
  - id: D6
    description: "A comment-bearing or paren-unbalanced clause fails CLOSED: it is refused before composition, the composer omits it if a caller forgets, and the producer answers a value rather than an escaping rejection when execute() throws"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#REFUSES to emit a clause that would not have passed the validator"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#answers a VALUE when execute() throws, and writes nothing"
        status: pass
    human_judgment: true
    rationale: "The DefMiner half is fully tested — refusal, omission, and the producer's handling of a rejected execute(). The Caido half is NOT: that `execute()` actually throws on an unbalanced expression is CITED from the SDK's own JSDoc (`@throws {Error} If a query parameter is invalid`, requests.d.ts:635-639) and has never been executed against a real parser in this repo. Plan 06-11's fixture suite over `sdk.requests.matches()` is where that becomes measured. A verifier should not read D6 as parser-level proof."
  - id: D7
    description: "No HTTPQL string reaches `.filter()` from anywhere except the single allowlisted composer, enforced by a static AST walk over every shipped backend module"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#%s composes no HTTPQL outside the one allowlisted producer"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#enumerates a NON-EMPTY set of shipped modules, BY NAME"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#finds filter sinks to audit — the gate is not measuring an empty set"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#the per-file cases iterate the SAME binding the assertions above measured"
        status: pass
    human_judgment: false
  - id: D8
    description: "The gate's rule-name set is closed and every rule has both a firing fixture and a legal fixture it must stay quiet on"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#emits exactly the rules it claims to — the gate's REACH, named"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#httpql-interpolation FIRES on a template literal with a substitution"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#httpql-concatenation FIRES on an Array.join(...) result"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#httpql-foreign-producer FIRES on a bare string literal at a sink"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#httpql-foreign-producer stays QUIET on the one allowlisted composer"
        status: pass
    human_judgment: false
  - id: D9
    description: "`Array.prototype.filter` — the single most important false positive — reports the EMPTY ARRAY, on fixtures and on the real modules that use it"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#Array.prototype.filter reports NOTHING — the single most important false positive"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#the REAL array filters in this package report nothing"
        status: pass
    human_judgment: false
  - id: D10
    description: "The one-entry allowlist is LIVE and load-bearing, proved by mutating the real producer's source and asserting the gate then fires"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#the ONE allowlisted producer is real, and the allowlist is LIVE"
        status: pass
    human_judgment: false
  - id: D11
    description: "The gate cannot be tripped by documentation: it audits its own header and fixture prose — which name every forbidden shape — and reports clean"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/httpql-discipline.spec.ts#this file NAMES every forbidden shape in prose and still reports clean"
        status: pass
    human_judgment: false
  - id: D12
    description: "The kind clause stays on the case-insensitive `cont` family, carries both extension terms, and uses no `eq` operator on a path or extension field"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#contains no `req.ext.eq` and no eq operator on a path or extension field"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#covers BOTH extensions, because `.mjs` does not contain `.js`"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/filter.spec.ts#carries the five media-type substrings that cover all seventeen essences"
        status: pass
    human_judgment: false

duration: 11 min
completed: 2026-08-31
status: complete
---

# Phase 06 Plan 04: The Operator Clause and the HTTPQL Gate Summary

**A closed four-code validator over the operator's HTTPQL, a composer that re-validates and omits rather than throws, and a TypeScript-AST gate that fails on any string reaching `.filter()` from anywhere but the one composer — with every rule's firing path executed and `Array.prototype.filter` proved quiet.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-08-31T16:44:27Z
- **Completed:** 2026-08-31T16:55:51Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- **`validateOperatorClause` with a closed, frozen four-member vocabulary** — `comment_construct`, `unbalanced_parentheses`, `whitespace_only`, `too_long` — in `hooks/admit.ts`'s `REJECT_REASONS` idiom, with the type derived from the array and a spec gate that fails the moment a fifth reason is added without a case. Comment detection is `indexOf` over three markers; the parenthesis counter is a quote-aware depth walk that honours the backslash escape; neither uses a pattern (T-06-22).
- **A composer that cannot emit an unvalidated clause.** `composeScanFilter` re-runs the validator and OMITS the operator term when it does not pass. The claim "no unvalidated operator clause reaches the wire" is now a property of the function rather than a discipline every future caller has to remember.
- **`packages/backend/src/scan/httpql-discipline.spec.ts`** — 698 lines, three rules, a one-entry head-matched allowlist, a four-assertion non-vacuity block, a firing and a legal fixture per rule, and the gate auditing its own prose to prove it walks the AST rather than scanning strings.
- **The precedence contradiction and the superset derivation written out.** Both Caido boxes quoted verbatim in `filter.ts`'s header, and the seventeen `SCRIPTISH_MEDIA_TYPES` essences mapped term by term onto the five `resp.raw.cont` substrings with the arithmetic shown (10 + 4 + 1 + 1 + 1 = 17), plus why `.mjs` needs its own term and why `req.ext.eq` is excluded.

## Task Commits

1. **Task 1 (RED): the failing spec** — `21cc281` (test) — 21 failed / 9 passed
2. **Task 1 (GREEN): the validator and the hardened composer** — `adb8bf7` (feat) — 30 passed
3. **Task 2: the HTTPQL composition gate** — `3a20c56` (test) — 42 passed

No REFACTOR commit: the GREEN implementation needed no cleanup, and a commit with no change is a commit that teaches nobody anything.

## Files Created/Modified

- `packages/backend/src/scan/filter.ts` — `OPERATOR_CLAUSE_MAX_CHARS`, the frozen `OPERATOR_CLAUSE_REJECTIONS` array, `OperatorClauseRejection`, `validateOperatorClause`, and a `composeScanFilter` that re-validates. Plus the header work: both precedence boxes verbatim, the comment grammar quoted, the term-by-term superset derivation, and the statement of which defence is load-bearing.
- `packages/backend/src/scan/filter.spec.ts` — 30 cases. The case table, the closed-set gate, the cap boundary, the composition contract, the kind-clause assertions, and `positionClause`.
- `packages/backend/src/scan/httpql-discipline.spec.ts` — 42 cases. `auditHttpqlSource`, the independent `httpqlSinkCallTexts` walk used for non-vacuity, `HTTPQL_SINKS`, `RULES`, `HTTPQL_PRODUCER_ALLOWLIST`.

## The question the plan asked to be answered explicitly

**Does the gate police COMPOSITION, or FRAGMENT LOCATION? It polices composition, at the sink — and that is what the plan intended, so nothing needed adjusting.**

The tracer's executor was right, and the reasoning is worth restating because it is the thing that makes this gate correct rather than merely green:

- Plan 06-01's deviation 2 moved `SCAN_KIND_CLAUSE` — a literal HTTPQL fragment — into `packages/engine/src/contract.ts`, because the start form must render it before any scan row exists and the frontend cannot import the backend. A gate asserting "every HTTPQL fragment lives in `scan/filter.ts`" would fail on the shipped tree on its first run.
- It would also be asserting the wrong thing. **A fragment cannot hurt anyone.** It is DefMiner-authored, it is a constant, and it cannot place the operator's clause first. The hazard named in the plan's own `<objective>` and in `T-06-21` is *"a future call site"* joining DefMiner's narrowing to operator input and getting the order or the parenthesisation wrong — a second **composer**.
- So the plan's own rule definitions are already sink-side: `httpql-interpolation` fires on "a template literal carrying any substitution **reaching a `filter` sink**", `httpql-concatenation` on a `+` or `.join()` **reaching a `filter` sink**, and `httpql-foreign-producer` on "any argument **to a `filter` sink**". The word "reaching" is doing the work, and it was already there. The gate as shipped implements exactly that.

This is stated in the gate's own header (`WHAT IT POLICES: COMPOSITION AT THE SINK — NOT WHERE FRAGMENTS LIVE`) so the next reader does not have to re-derive it from a summary.

## Carry-forward assessed and deliberately DECLINED

**The `operator-clause-unsupported` refusal in `index.ts:692` was left in place.** The orchestrator's brief said this plan removes it. It does not, and the reason is that a later plan in this same phase already owns it:

`06-05-PLAN.md` (wave 3, `depends_on: ["06-01", "06-04"]`) lists `packages/backend/src/api/spec.ts` and `packages/backend/src/index.ts` in its `files_modified` and states in its own action: *"Extend `startScan` to run the operator clause through `validateOperatorClause` before anything is written, and to return either the started scan or a closed rejection code."* Its acceptance criteria include *"`startScan` with an operator clause containing a comment construct returns a rejection whose reason is a member of `OPERATOR_CLAUSE_REJECTIONS`"*.

Removing the refusal here would have meant either duplicating that work or shipping half of it. The half is the problem: the rejection has to arrive through a `ScanCommandOutcome` that distinguishes a clause rejection from the one-scan-at-a-time refusal, the union in `api/spec.ts` and `frontend/src/api/client.ts` has to grow the four new codes, and `frontend/src/components/scan-contract.ts` needs copy for each — none of which this plan's `files_modified` names, and all of which 06-05 and the UI plans do. A `startScan` that accepted a clause it had no outcome shape to report on would be the stub this project's own rules forbid.

**D-05 is delivered by the end of the phase, not by the end of this plan** — and it is delivered on this plan's foundations: the validator, the vocabulary the RPC will return, and the gate that keeps the composer singular all exist and are tested. Recorded in `.planning/WINDOWS.md` so it cannot be lost between plans.

**WINDOWS entry 68 is NOT yet dischargeable.** It records that 06-02 could not measure `body.length` through the real producer because `startScan` refuses a non-empty clause AND `runScanProducer` has no caller. This plan closes neither: the refusal is 06-05's (above) and the caller is 06-03's watermark-gated loop. The measurement becomes repeatable once both land, and both are in wave 3.

## Decisions Made

1. **The cap is 2048, derived from `EVIDENCE_PANEL_MAX_GRAPHEMES`, and asserted rather than imported.** The clause is the one unbounded operator-authored string on this path and the per-scan detail must render it in full; a cap above the panel's would let an operator type a clause DefMiner then shows them truncated — on the one string whose whole job is that they can check it against the composed filter. It is asserted equal in `filter.spec.ts` rather than imported into `filter.ts`, because the cap is a **cost** bound that merely coincides with a **display** bound, and coupling the backend's query path to the frontend's rendering module for a coincidence is the wrong dependency. The units differ (UTF-16 code units vs graphemes) and the difference errs safe: a grapheme is never fewer than one code unit.

2. **The comment check is not quote-aware; the parenthesis counter is.** The asymmetry is deliberate and stated at the declaration. Refusing the unusual-but-legal `req.path.cont:"//"` costs the operator one edit and a named reason; a quote-aware comment check that mis-tracks a string state costs the scan.

3. **The composer omits rather than throws.** `runScanProducer` composes the filter *outside* the `try` that wraps `execute()` — deliberately, so the epoch guard is checked before paying for a full-body page transfer. A throw from the composer would escape `runScanProducer` entirely rather than being reported as a scan failure, and Caido surfaces neither a throw nor a rejection from plugin code. Omission has the right failure direction: it narrows to DefMiner's own clause and can never widen, and the operator is not misled because `composedFilter` on the status payload is this function's output.

4. **The allowlist is matched on the CALLEE NAME, not on file + head text.** `sql-discipline.spec.ts`'s `INTERPOLATION_ALLOWLIST` matches `{ file, head }` because its exemption is a specific statement in a specific file. Here the exemption is a specific *producer* called from a *different* file (`scan/producer.ts` calls `scan/filter.ts`'s composer), so file-matching would exempt the wrong thing. The one-entry, head-text-matched *shape* is preserved — a lookalike (`composeScanFilterUnsafe`) is asserted NOT to inherit it.

5. **The array/HTTPQL discriminator is the argument's shape, and it errs toward reporting.** A function-valued argument — arrow, function expression, or a local name bound to one — is an array filter. Everything else is an HTTPQL sink. An array `.filter(pred)` given an *imported* named predicate would be reported; the fix is a one-line rewrite or a deliberate allowlist entry. Under-reporting costs a widened scan; over-reporting costs one line. Stated as boundary 2 in the gate's header, and asserted non-hypothetical: every enumerated file reports clean.

6. **`OperatorClauseVerdict` is declared but not exported.** See deviation 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical] `composeScanFilter` re-validates the operator clause**

- **Found during:** Task 1 (GREEN).
- **Issue:** The plan's action says "harden `composeScanFilter` to take the validated clause and keep the contract explicit in the header". Taken literally that is a documentation change: the composer would still happily emit `(req.host.eq:"a" //)` if any caller forgot to validate. The whole thesis of this plan is fail-closed composition, and a composer that depends on caller discipline for its central property is the shape the static gate exists to prevent — one seam away from the hazard, protected only by a comment.
- **Fix:** The composer calls `validateOperatorClause` and omits the term when it does not pass. Omission and not a throw, for the measured reason in Decision 3.
- **Files modified:** `packages/backend/src/scan/filter.ts`, `packages/backend/src/scan/filter.spec.ts`
- **Verification:** `filter.spec.ts#REFUSES to emit a clause that would not have passed the validator` — four bad clauses (comment, unbalanced, whitespace-only, over-cap), each asserted to produce exactly DefMiner's two terms with no `//` anywhere and balanced parentheses. `packages/backend/src/scan` — 59 passed.
- **Committed in:** `adb8bf7`

**2. [Rule 3 — Blocking] The named verdict type failed `pnpm knip`**

- **Found during:** Task 1 (GREEN), running the plan's own `<verification>`.
- **Issue:** Exporting `OperatorClauseVerdict` produced `Unused exported types (1)` and a non-zero knip exit. This repo runs with `ignoreExportsUsedInFile: false` — plan 05-01 closed that hole deliberately, recording that "a per-export exemption states which one and invites the question why; a global flag hides the whole class". A type referenced only inside its own module is a dead export by that rule, and it *is* dead until something outside the file names it rather than inferring it.
- **Fix:** Dropped the `export` keyword and recorded the reason at the declaration, naming plan 06-05's `startScan` as the first caller that will justify exporting it. `validateOperatorClause`'s signature is unchanged and callers get the same inferred type — which is exactly the union the plan's action spells out inline.
- **Files modified:** `packages/backend/src/scan/filter.ts`
- **Verification:** `pnpm knip` exit 0 (matching the pre-change baseline of 13 tag hints and nothing else); `pnpm typecheck` exit 0.
- **Committed in:** `adb8bf7`

**3. [Rule 2 — Missing critical] The superset derivation had no home the plan anticipated**

- **Found during:** Task 1.
- **Issue:** The plan's action says to write the term-by-term derivation into `scan/filter.ts` beside the kind clause. The clause is no longer there — plan 06-01's deviation 2 moved it to `packages/engine/src/contract.ts`. The contract's own header already carries the *conclusion* ("two substring terms cover the extensions and five cover the media-type essences") but not the mapping, and it cannot carry the mapping honestly: the argument is about `hooks/admit.ts`'s `SCRIPTISH_MEDIA_TYPES`, and the engine declares no dependencies at all and cannot import the backend (DET-03, knip-enforced).
- **Fix:** The derivation lives in `scan/filter.ts` — the backend module that composes the constant into what goes on the wire — with a paragraph stating why it lives there rather than beside the constant. `contract.ts` was not touched.
- **Files modified:** `packages/backend/src/scan/filter.ts`
- **Verification:** `filter.spec.ts#carries the five media-type substrings that cover all seventeen essences`, `#covers BOTH extensions, because .mjs does not contain .js` (which asserts the premise `".mjs".includes(".js") === false` directly), and `#contains no req.ext.eq and no eq operator on a path or extension field`.
- **Committed in:** `adb8bf7`

---

**Total deviations:** 3 auto-fixed (2 × Rule 2, 1 × Rule 3).
**Impact on plan:** No scope creep — every file touched is one the plan's `files_modified` names. Deviation 1 strengthens the plan's own central property; deviation 2 is a gate the plan's `<verification>` block asked to be run, working as designed; deviation 3 is a placement question created by an upstream plan's deviation and resolved without moving anything.

## Issues Encountered

None beyond the three deviations. The RED run failed exactly as intended (21 failed / 9 passed — the nine that passed are the `composeScanFilter`, `positionClause` and `SCAN_KIND_CLAUSE` assertions that plan 06-01 already satisfied, which is the correct RED shape for a plan that HARDENS an existing function rather than creating one). `eslint --fix` reformatted both spec files after they were written; the gate's self-audit case still reported clean afterwards, which is a small piece of evidence that it really is reading the AST.

## Verification

Every command in the plan's `<verification>` block, run on the final tree:

| Command | Result |
|---|---|
| `pnpm vitest run packages/backend/src/scan --reporter=dot` | **59 passed** (2 files) |
| `pnpm vitest run packages/backend/src/scan/httpql-discipline.spec.ts packages/backend/src/store/sql-discipline.spec.ts` | **86 passed** (2 files), zero violations over the shipped tree |
| `grep -v '^\s*//' packages/backend/src/scan/filter.ts \| grep -c 'new RegExp'` | **0** |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 |
| `pnpm test` (full suite) | **2433 passed** / 63 files — up from the 2361 baseline by exactly the 72 cases this plan added |
| `pnpm build` / `check:bundle` / `check:css` / `check:externals` | exit 0, 0, 0, 0 |

## Known Stubs

None. Both artifacts are complete against their contracts. The one thing that is *not* wired — `startScan` still refusing a non-empty operator clause — is plan 06-05's deliverable, not a stub in this plan's output; see "Carry-forward assessed and deliberately DECLINED" above.

## Threat Flags

None. Every file touched sits inside a trust boundary this plan's `<threat_model>` already names, and every `mitigate` disposition has an implementation and a test:

| Threat | Where it landed |
|---|---|
| T-06-HTTPQL-INJ (tampering, `composeScanFilter`) | Operator clause last, every clause parenthesised, comment and paren-balance refusals before composition, plus the composer's own re-validation. Six spec cases across `filter.spec.ts` and `scans.spec.ts`. |
| T-06-19 (DoS, the page walk) | `OPERATOR_CLAUSE_MAX_CHARS`, the operator-last order, and the validator. Framed in both file headers as a COST control, which is the honest framing — `admit()` still runs on every returned item. |
| T-06-20 (disclosure, the rejection message) | The rejection vocabulary is four DefMiner-authored words. Nothing in `validateOperatorClause` can throw, so no caught exception exists on this path to leak; `producer.ts`'s existing `describeError(e).slice(0, 200)` remains the only place a Caido message is handled, and it redacts before truncating. |
| T-06-21 (tampering, a future call site) | `httpql-discipline.spec.ts`, over every non-spec `.ts` under `packages/backend/src`, with the allowlist proved live by mutation. |
| T-06-22 (DoS, clause validation) | `indexOf` and a character loop. `grep -c 'new RegExp'` over non-comment lines is 0, and there is no pattern literal in the file. |
| T-06-SC (supply chain) | No package installed; `pnpm-lock.yaml` untouched. |

## User Setup Required

None — no external service configuration required, no package installed, no environment variable added.

## Next Phase Readiness

**Ready.** The three wave-3 plans that depend on this one each pick up a finished seam:

- **06-05** imports `validateOperatorClause` and `OPERATOR_CLAUSE_REJECTIONS` into `startScan`, replaces the `operator-clause-unsupported` refusal with the four real codes, and grows the `ScanCommandOutcome` union and `api/spec.ts` to carry them. `OperatorClauseVerdict` gets its `export` keyword there, which is the visible one-word edit deviation 2 describes.
- **06-03** adds the watermark-gated loop around `runScanProducer`. It touches `producer.ts` — the one file the new gate has a live assertion about — so it should expect `httpql-discipline.spec.ts` to have an opinion if the `.filter(...)` call site is rewritten. Composing through `composeScanFilter` keeps it quiet; anything else fires `httpql-foreign-producer` by design.
- **06-11** owns what this plan could only argue: whether the push-down is actually a superset of `admit()`'s kind axis. `scan/filter.ts` now states, term by term, exactly what 06-11 is supposed to be proving, including the two unmeasured facts (whether `req.path` strips the query, whether `cont` is byte-wise or Unicode case-folded) and the two non-vacuity fixtures the suite needs.

**One thing a later plan should not have to rediscover:** the gate skips `.spec.ts`, which is what lets its fixtures live inline. A spec file could compose HTTPQL unnoticed. The residual is bounded — specs never enter the shipped bundle, and `scan/producer.ts` is the only module in the package that holds an `sdk.requests.query()` to call `.filter()` on at all — and it is stated as boundary 1 in the gate's own header rather than only here.

---
*Phase: 06-retroactive-scan-deployment-reality*
*Completed: 2026-08-31*
