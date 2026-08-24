---
phase: 01-skeleton-persistence-compatibility
plan: 21
subsystem: testing
tags: [static-gate, typescript-ast, error-redaction, store-07, wr-24, in-22]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "`derivesFrom` following the binding rather than matching it (01-13, CR-05), and the `+=` / `.concat()` / push-then-join render forms plus the second re-derivation of the render-form residual (01-16, WR-17)"
provides:
  - "`derivesFrom` descends the OPERATOR class — a `? :` conditional's two branches and a `??` / `||` / `&&` binary's two operands — with either-side semantics"
  - "the four executed WR-24 shapes plus the `&&` spelling as failing fixtures, in BOTH the object-literal and RETURN positions"
  - "seven `describeError` safe twins at the new operator depths, asserted quiet in the same commit as the branches"
  - "IN-22's two limits PINNED by executed cases that assert `[]` today and go red the day either is closed"
  - "the render-form residual re-derived a THIRD time, from the branches of `derivesFrom` rather than from the previous paragraph, with its derivation method written down"
affects: [phase-2-finishAnalysis, phase-2-ERR-03, phase-2-ERR-04, store-07-gate]

actuals:
  tokens: 4200
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "either-side operator descent in a static gate: a render unsafe on one path is unsafe"
    - "a residual list that records its own DERIVATION METHOD, not just its contents"
    - "PINNED residuals for single shapes, deliberately UNPINNED residuals for open classes — the distinction recorded in the residual itself"

key-files:
  created: []
  modified:
    - packages/backend/src/store/error-redaction.spec.ts

key-decisions:
  - "Descend a conditional's two BRANCHES but never its CONDITION — `e instanceof Error` renders nothing, only the branch that becomes the value can carry the error's bytes into `analyses.error`."
  - "Either-side semantics for both new branches, matching `initializerReceiver` in `../outbound-prohibition.spec.ts` one package away, so the two gates do not drift into disagreeing about the same operator."
  - "PIN IN-22's two limits with executed `RESIDUAL, PINNED (IN-22)` cases; deliberately do NOT pin residual items 1-3, because each names an open CLASS and one fixture would pin an example while reading as though it pinned the class. Both halves of the decision are recorded in the residual paragraph itself, not only here."
  - "Recursion rather than the loop's `continue` for both new branches: a conditional and a binary each have TWO sub-expressions and the loop carries only one `current`. Re-entering `derivesFrom` from the top is also what preserves `isSafeRenderCall` at every new depth."

patterns-established:
  - "Mutation proofs run SEPARATELY per branch, so the RED titles attribute failure to the branch that was reverted"
  - "A residual paragraph states HOW it was enumerated (from which code branches, on what date), making it checkable rather than trustable"

requirements-completed: [STORE-07]

coverage:
  - id: D1
    description: "The four operator shapes WR-24 executed — bare `e.message`, the `instanceof` narrowing conditional, `?? \"x\"` and `|| \"x\"` — plus the `&&` spelling, all report in the object-literal position"
    requirement: STORE-07
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#CONDITIONAL branch — flags the standard narrowing idiom as an OBJECT-LITERAL value (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#LOGICAL-OPERATOR branch — flags OBJECT-LITERAL value — e.message ?? \"x\" (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#LOGICAL-OPERATOR branch — flags OBJECT-LITERAL value — e.message || \"x\" (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#LOGICAL-OPERATOR branch — flags OBJECT-LITERAL value — e.message && \"x\" (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#the already-covered bare `error: e.message` still reports — the widening broke nothing (WR-24)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The same four shapes report in the RETURN position — both positions boundary 2 names are exercised, not just the object-literal one"
    requirement: STORE-07
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#CONDITIONAL branch — flags the standard narrowing idiom RETURNED (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#LOGICAL-OPERATOR branch — flags RETURNED — e.message ?? \"x\" (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#LOGICAL-OPERATOR branch — flags RETURNED — e.message || \"x\" (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#LOGICAL-OPERATOR branch — flags RETURNED — e.message && \"x\" (WR-24)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The SAFE form stays invisible to the gate at every new operator depth — `describeError(e)` and `describeError(e).slice(0, 200)` in a conditional branch, a `??`, a `||` and an `&&` operand"
    requirement: STORE-07
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#SAFE TWIN — stays quiet on describeError(e) in a CONDITIONAL branch (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#SAFE TWIN — stays quiet on describeError(e) as a `??` operand (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#SAFE TWIN — stays quiet on describeError(e) as a `||` operand (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#SAFE TWIN — stays quiet on describeError(e) as an `&&` operand (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#SAFE TWIN — stays quiet on describeError(e).slice(0, 200) in a CONDITIONAL branch (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#SAFE TWIN — stays quiet on describeError(e).slice(0, 200) as a `??` operand (WR-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#SAFE TWIN — stays quiet on describeError(e).slice(0, 200) as a `||` operand (WR-24)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Each new branch is load-bearing ON ITS OWN — proven by two SEPARATE reverts, each observed RED by test title and each restored green"
    requirement: STORE-07
    verification:
      - kind: other
        ref: "transient revert of the ConditionalExpression branch → 3 failed | 83 passed; restored → 86 passed (pasted below)"
        status: pass
      - kind: other
        ref: "transient revert of the `??`/`||`/`&&` branch → 6 failed | 80 passed; restored → 86 passed (pasted below)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The widened descent does not fire on real shipped source — a recorded zero over the 7 store modules, which are full of ordinary `??` and `||` defaulting"
    requirement: STORE-07
    verification:
      - kind: integration
        ref: "packages/backend/src/store/error-redaction.spec.ts#reports ZERO violations across the store layer"
        status: pass
      - kind: other
        ref: "transient probe: REAL TREE 7 modules scanned, VIOLATIONS: 0 [] (pasted below)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#enumerates a NON-EMPTY set of store modules, by name"
        status: pass
    human_judgment: false
  - id: D6
    description: "IN-22's two limits are PINNED — the bare-identifier push receiver and the document-order dependence each assert `[]` today and go red the day either is closed"
    requirement: STORE-07
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#RESIDUAL, PINNED (IN-22): a push onto a MEMBER receiver is unseen — the push rule needs a bare identifier"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#RESIDUAL, PINNED (IN-22): a `join` appearing BEFORE its `push` in document order is missed"
        status: pass
    human_judgment: false
  - id: D7
    description: "The render-form residual is re-derived a third time from the code's branches, names the operator class as covered and IN-22's two limits as open, states its derivation method, and preserves the non-closed-enumeration sentence byte-identical"
    requirement: STORE-07
    verification: []
    human_judgment: true
    rationale: "Prose disclosure. Whether the residual's five items are a FAITHFUL enumeration of what `derivesFrom` now stops at is a reading of code against prose that no assertion in this repository performs — that is the same class of judgment the verifier exercised to find WR-24 in the first place. The mechanical half IS checked: the byte-identical sentence is verified by grep and by a scoped `git diff` that does not touch it (both pasted below), and the two pinned IN-22 items are D6. The completeness of items 1-3 is what needs a human."

duration: 12 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 21: The Operator Class of Render Summary

**`derivesFrom` now descends a `? :` conditional's two branches and a `??` / `||` / `&&` binary's two operands with either-side semantics, so the standard `useUnknownInCatchVariables` narrowing idiom — `e instanceof Error ? e.message : String(e)` — is visible to the STORE-07 gate while `describeError(e)` stays invisible at every new depth.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-24T09:17:40Z
- **Completed:** 2026-08-24T09:29:41Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- The OPERATOR class of render is covered: all four shapes WR-24 executed, plus the `&&` spelling, in both the object-literal and RETURN positions.
- The safe/unsafe distinction survives the widening — seven `describeError` twins asserted quiet in the same commit as the branches.
- Each branch proven load-bearing on its own by two SEPARATE reverts.
- The widened descent reports zero over the real store tree.
- The render-form residual re-derived a third time from the code's branches, with its derivation method written down and IN-22's two limits named and pinned.

## Task Commits

1. **Task 1 (tracer): the operator descent, its safe twin, and the real tree** — `194287a` (fix)
2. **Task 2: the residual, re-derived a third time** — `79961ff` (docs)

## Files Created/Modified

- `packages/backend/src/store/error-redaction.spec.ts` — STORE-07's redaction gate. `derivesFrom` gained two branches; the header's RENDER FORMS list gained the operator class; the residual paragraph was re-derived; 18 fixtures added (+273 / −4 lines across both commits).

---

## THE FRAMING, STATED FIRST BECAUSE IT CUTS AGAINST THIS ROUND'S GRAIN

**This was a WIDENING of a bounded enumeration, not the correction of a false claim.** The
render-form list states in its own words that it "is an ENUMERATION and it does not claim to be
closed; what it claims is that everything on it is executed below" — and everything on it was, and
is, executed below. The verifier drew exactly this distinction when it declined to score WR-24 as a
blocker: *"A bounded enumeration that under-reaches is a warning; it is not the schema.spec.ts-style
overclaim that makes a blocker."* Four rounds of this phase have caught claims wider than their
enforcement. Writing this one up as a fix for dishonest prose would be the same defect running the
other way, in the round whose entire subject is claims outrunning evidence.

What WAS a finding, and is fixed here, is narrower and specific: the residual shipped in WR-17's own
commit announced it had been *"RE-DERIVED against the widened rules rather than carried forward"*,
enumerated two classes, and missed a third that was sitting in the same function. A list that says
it was re-derived is trusted for its completeness. That is the sentence this plan corrects.

**Severity, stated honestly.** Nothing leaks today. The real-tree run below is zero, and the three
renders outside `store/` each carry a named owner with a checkable requirement id. This is a gate
that would have stayed quiet on a render somebody writes in Phase 2.

---

## 1. THE RULE LIST, BEFORE AND AFTER — EXECUTED, NOT REASONED ABOUT

Both tables produced by a transient probe spec importing `auditSource` from the gate, run under
`pnpm vitest`, deleted after use. Every source string is the review's exact catch-block shape.

### BEFORE (at `HEAD` = `401ead1`, before any change)

```
OBJ  catch(e){ return { ok:false, error: e.message }; }                  ["unredacted-object-value"]
OBJ  catch(e){ return { ok:false, error: e instanceof Error ? e.message : "x" }; } []
OBJ  catch(e){ return { ok:false, error: e.message ?? "x" }; }           []
OBJ  catch(e){ return { ok:false, error: e.message || "x" }; }           []
OBJ  catch(e){ return { ok:false, error: e.message && "x" }; }           []
RET  catch(e){ return e instanceof Error ? e.message : "x"; }            []
RET  catch(e){ return e.message ?? "x"; }                                []
RET  catch(e){ return e.message || "x"; }                                []
RET  catch(e){ return e.message && "x"; }                                []
SAFE OBJ conditional  describeError(e)                                   []
SAFE OBJ ?? operand   describeError(e)                                   []
SAFE OBJ || operand   describeError(e)                                   []
SAFE OBJ && operand   describeError(e)                                   []
SAFE OBJ conditional  describeError(e).slice(0, 200)                     []
SAFE OBJ ?? operand   describeError(e).slice(0, 200)                     []
SAFE OBJ || operand   describeError(e).slice(0, 200)                     []
IN-22 push onto MEMBER receiver  o.parts.push(e.message); o.parts.join("") []
IN-22 join BEFORE push in document order                                 []
```

Eight of the nine unsafe shapes reported clean. Only the bare `error: e.message` — the one with no
operator in the path — was seen.

### AFTER (with the operator descent in place)

```
OBJ  catch(e){ return { ok:false, error: e.message }; }                  ["unredacted-object-value"]
OBJ  catch(e){ return { ok:false, error: e instanceof Error ? e.message : "x" }; } ["unredacted-object-value"]
OBJ  catch(e){ return { ok:false, error: e.message ?? "x" }; }           ["unredacted-object-value"]
OBJ  catch(e){ return { ok:false, error: e.message || "x" }; }           ["unredacted-object-value"]
OBJ  catch(e){ return { ok:false, error: e.message && "x" }; }           ["unredacted-object-value"]
RET  catch(e){ return e instanceof Error ? e.message : "x"; }            ["unredacted-return"]
RET  catch(e){ return e.message ?? "x"; }                                ["unredacted-return"]
RET  catch(e){ return e.message || "x"; }                                ["unredacted-return"]
RET  catch(e){ return e.message && "x"; }                                ["unredacted-return"]
SAFE OBJ conditional  describeError(e)                                   []
SAFE OBJ ?? operand   describeError(e)                                   []
SAFE OBJ || operand   describeError(e)                                   []
SAFE OBJ && operand   describeError(e)                                   []
SAFE OBJ conditional  describeError(e).slice(0, 200)                     []
SAFE OBJ ?? operand   describeError(e).slice(0, 200)                     []
SAFE OBJ || operand   describeError(e).slice(0, 200)                     []
IN-22 push onto MEMBER receiver  o.parts.push(e.message); o.parts.join("") []
IN-22 join BEFORE push in document order                                 []
```

**Read the two tables together.** Rows 2–9 moved from `[]` to a violation. Rows 1 and 10–16 did not
move: the already-covered shape is still covered, and every `describeError` twin — including
`describeError(e).slice(0, 200)`, the call-on-a-member-of-a-call case, re-run at each new operator
depth — is still quiet. Rows 17–18 did not move either, and that is deliberate: they are IN-22's two
limits, pinned rather than closed (§4).

## 2. THE SAFE TWINS — THE OTHER HALF OF THE WIDENING

A descent that reached PAST a `describeError(...)` call would have broken the gate rather than
widened it. `isSafeRenderCall` still terminates at every new depth because each branch and each
operand **re-enters `derivesFrom` from the top**, where the safe-call check is the first statement.
All seven twins ship in the SAME commit as the branches (`194287a`), never after — the enumeration's
own stated discipline is that the fixtures extend together with the rules, *"every time, or the file
becomes the thing it protects against"*.

```
 ✓ SAFE TWIN — stays quiet on describeError(e) in a CONDITIONAL branch (WR-24)
 ✓ SAFE TWIN — stays quiet on describeError(e) as a `??` operand (WR-24)
 ✓ SAFE TWIN — stays quiet on describeError(e) as a `||` operand (WR-24)
 ✓ SAFE TWIN — stays quiet on describeError(e) as an `&&` operand (WR-24)
 ✓ SAFE TWIN — stays quiet on describeError(e).slice(0, 200) in a CONDITIONAL branch (WR-24)
 ✓ SAFE TWIN — stays quiet on describeError(e).slice(0, 200) as a `??` operand (WR-24)
 ✓ SAFE TWIN — stays quiet on describeError(e).slice(0, 200) as a `||` operand (WR-24)
```

The negative fixture that matters most also still passes untouched — `analyses.ts`'s real shape,
`return error === null ? null : describeError(error).slice(0, 300)`, is itself a CONDITIONAL, and it
is now descended. It stays quiet because both branches resolve to non-derivations:

```
 ✓ stays quiet on an error-shaped parameter passed to describeError — analyses.ts:228's real shape
 ✓ does NOT flag an error-shaped parameter passed to describeError
```

## 3. TWO SEPARATE MUTATION PROOFS — EACH BRANCH LOAD-BEARING ON ITS OWN

A single combined revert cannot show that each branch is load-bearing by itself, and this gate has
shipped an assertion that could not fail before. Both reverts DELETE the branch entirely (not a
flag), and each was restored from a byte-copy and re-run before the next was applied.

### Proof 1 — the `ConditionalExpression` branch removed

```
MUTATION 1 APPLIED: conditional descent removed
     × CONDITIONAL branch — flags the standard narrowing idiom as an OBJECT-LITERAL value (WR-24) 2ms
     × CONDITIONAL branch — flags the standard narrowing idiom RETURNED (WR-24) 0ms
     × CONDITIONAL branch — flags the binding in EITHER branch, not just the first (WR-24) 0ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
 FAIL … > CONDITIONAL branch — flags the standard narrowing idiom as an OBJECT-LITERAL value (WR-24)
AssertionError: expected [] to include 'unredacted-object-value'
 FAIL … > CONDITIONAL branch — flags the standard narrowing idiom RETURNED (WR-24)
AssertionError: expected [] to include 'unredacted-return'
 FAIL … > CONDITIONAL branch — flags the binding in EITHER branch, not just the first (WR-24)
AssertionError: expected [] to include 'unredacted-object-value'
      Tests  3 failed | 83 passed (86)
```

Restored:

```
RESTORED
 ✓ packages/backend/src/store/error-redaction.spec.ts (86 tests) 40ms
      Tests  86 passed (86)
```

### Proof 2 — the `??` / `||` / `&&` branch removed

```
MUTATION 2 APPLIED: logical-operator descent removed
     × LOGICAL-OPERATOR branch — flags OBJECT-LITERAL value — e.message ?? "x" (WR-24) 3ms
     × LOGICAL-OPERATOR branch — flags OBJECT-LITERAL value — e.message || "x" (WR-24) 0ms
     × LOGICAL-OPERATOR branch — flags OBJECT-LITERAL value — e.message && "x" (WR-24) 0ms
     × LOGICAL-OPERATOR branch — flags RETURNED — e.message ?? "x" (WR-24) 0ms
     × LOGICAL-OPERATOR branch — flags RETURNED — e.message || "x" (WR-24) 0ms
     × LOGICAL-OPERATOR branch — flags RETURNED — e.message && "x" (WR-24) 0ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯
 FAIL … > LOGICAL-OPERATOR branch — flags OBJECT-LITERAL value — e.message ?? "x" (WR-24)
AssertionError: OBJECT-LITERAL value — e.message ?? "x" still reports clean: expected [] to include 'unredacted-object-value'
 FAIL … > LOGICAL-OPERATOR branch — flags OBJECT-LITERAL value — e.message || "x" (WR-24)
AssertionError: OBJECT-LITERAL value — e.message || "x" still reports clean: expected [] to include 'unredacted-object-value'
 FAIL … > LOGICAL-OPERATOR branch — flags OBJECT-LITERAL value — e.message && "x" (WR-24)
AssertionError: OBJECT-LITERAL value — e.message && "x" still reports clean: expected [] to include 'unredacted-object-value'
 FAIL … > LOGICAL-OPERATOR branch — flags RETURNED — e.message ?? "x" (WR-24)
AssertionError: RETURNED — e.message ?? "x" still reports clean: expected [] to include 'unredacted-return'
 FAIL … > LOGICAL-OPERATOR branch — flags RETURNED — e.message || "x" (WR-24)
AssertionError: RETURNED — e.message || "x" still reports clean: expected [] to include 'unredacted-return'
 FAIL … > LOGICAL-OPERATOR branch — flags RETURNED — e.message && "x" (WR-24)
AssertionError: RETURNED — e.message && "x" still reports clean: expected [] to include 'unredacted-return'
      Tests  6 failed | 80 passed (86)
```

Restored:

```
RESTORED
 ✓ packages/backend/src/store/error-redaction.spec.ts (86 tests) 37ms
      Tests  86 passed (86)
```

**What the SEPARATION bought, and it is not a formality.** Under proof 1 the six LOGICAL-OPERATOR
fixtures stayed GREEN; under proof 2 the three CONDITIONAL fixtures stayed GREEN. Neither branch is
covering for the other, and neither set of fixtures is passing for a reason other than the branch it
sits beside. A combined revert would have turned all nine red and shown exactly that fact about
neither.

**Restore cross-check.** After both proofs, `git diff --exit-code` over
`packages/backend/src/outbound-prohibition.spec.ts`, `packages/backend/src/store/observations.ts`,
`packages/backend/src/store/observations.spec.ts`, `tests/` and `scripts/` printed `SCOPE-CLEAN`, and
`git status --porcelain packages/` listed exactly one modified file:

```
SCOPE-CLEAN
 M packages/backend/src/store/error-redaction.spec.ts
```

## 4. THE REAL-TREE RUN — A ZERO THAT IS A RECORDED RUN, NOT AN ARGUMENT

`derivesFrom` now descends three more forms and the store tree is full of ordinary `??` and `||`
defaulting. A gate that fires on that gets deleted rather than fixed, so it was run:

```
REAL TREE: 7 modules scanned: analyses.ts, artifacts.ts, db.ts, migrations.ts, observations.ts, retention.ts, settings.ts
REAL TREE VIOLATIONS: 0 []
```

**Nothing fired**, so there is no site-fix-versus-narrowing decision to record. The in-suite form of
the same run is the permanent one:

```
 ✓ reports ZERO violations across the store layer
```

**And the zero is not vacuous.** The gate's by-name non-vacuity list still passes, so a widening that
silently stopped scanning a file cannot hide behind a convincing zero:

```
 ✓ enumerates a NON-EMPTY set of store modules, by name
 ✓ finds error-shaped bindings to audit — the gate is not scanning inert files
```

## 5. THE AMENDED RENDER FORMS LIST AND RESIDUAL, PASTED WHOLE

Verbatim from `packages/backend/src/store/error-redaction.spec.ts` after `79961ff`. The first
paragraph is unchanged from WR-17 and is included so the addition can be read in place.

```
//      - RENDER FORMS, and this enumeration is the reason this gate's residual
//        reads as a BOUND rather than as an overclaim — so it is extended in the
//        same commit as the rules, every time, or the file becomes the thing it
//        protects against. As of 2026-08-22 they are: `String(x)`,
//        `JSON.stringify(x)`, `[x].join(…)`, a template span, a `+` operand, a
//        `+=` operand, `x.concat(…)`/`"…".concat(x)`, and `a.push(x)` followed by
//        `a.join(…)` — the last three added on that date (WR-17). `JSON.stringify`
//        on an `Error` is worse than the others, not better: it serialises
//        enumerable own properties, and a driver rejection's are exactly the
//        bound parameters. The three added forms are not exotic: `m += e.message`
//        inside a catch is a complete, green, end-to-end path from a driver
//        rejection into `StoreWriteResult.error`, and it was invisible while the
//        one-line `"…" + e` beside it was caught. `a.push(x)` GROWS the tracked
//        names by one — the array becomes the binding — which is what lets the
//        join rule reach a container rather than only an array literal.
//
//        AND SINCE 2026-08-22 (WR-24), THE OPERATOR CLASS: any form on that list
//        reached THROUGH an operator — a `? :` branch, or a `??`, `||` or `&&`
//        operand — counts as reaching the binding, because `derivesFrom` now
//        descends both branches of a conditional and both operands of those
//        three logical operators. Listed here beside the methods and the
//        accumulators rather than in `derivesFrom`'s docblock alone, because it
//        is the same kind of coverage fact they are: `{ error: e.message }`
//        reported and `{ error: e instanceof Error ? e.message : "x" }` did not,
//        and the second is what `useUnknownInCatchVariables` pushes an author
//        toward. The CONDITION of a `? :` is deliberately not descended — it
//        renders nothing.
//
//        THE RESIDUAL OF THE RENDER-FORM LIST, RE-DERIVED A THIRD TIME on
//        2026-08-22 (WR-24). HOW IT WAS DERIVED, so the next reader can repeat
//        the derivation rather than trust the list: every item below was read
//        off the BRANCHES of `derivesFrom` and the receiver test in the `push`
//        rule, in that order, as of this date. That method is written down
//        because the previous re-derivation was done from the PREVIOUS
//        PARAGRAPH — it enumerated two classes and missed a third sitting in
//        the same function, which is exactly what enumerating from prose rather
//        than from code produces.
//          1. A render through a method this list does not name — `padEnd`,
//             `repeat`, `replace`.
//          2. A CALL WHOSE CALLEE IS A BARE IDENTIFIER: `fmt(e)`, `helper(e)`.
//             The descent follows a call only when its callee is a MEMBER, so
//             the RESULT of a user helper is not the binding. `String(x)` and
//             `JSON.stringify(x)` have their own render rules and
//             `describeError(x)` is the safe form; this is the residual for
//             every helper the gate has never heard of.
//          3. AN OPERATOR OUTSIDE THE FOUR now descended, or a container that
//             is not the `push`/`join` pair: a comma expression, an `await`, an
//             accumulator that is neither a `+=` nor a `.push`, and a value
//             routed through an object or array LITERAL.
//          4. IN-22, FIRST LIMIT — the `push` rule grows the tracked names only
//             when the unwrapped receiver is a BARE IDENTIFIER, so
//             `o.parts.push(e.message); o.parts.join("")` is unseen.
//          5. IN-22, SECOND LIMIT — the tracked names GROW DURING THE WALK, so
//             a `join` appearing BEFORE its `push` in document order,
//             `const out = a.join(""); a.push(e.message)`, is missed.
//        Both IN-22 limits sit inside the document-order bound this boundary
//        already states below, and saying so here is what keeps the residual and
//        the boundary from becoming two statements that disagree.
//
//        PINNED, AND THE DECISION IS RECORDED RATHER THAN LEFT IMPLICIT. Items
//        4 and 5 are pinned by executed cases titled "RESIDUAL, PINNED (IN-22)"
//        below, which assert those two shapes report `[]` TODAY and therefore go
//        RED the day somebody closes one. The reason is `schema.spec.ts`'s OPEN
//        list one directory away, which pins each of its open grammars for
//        exactly this reason: a residual naming a limit with nothing asserting
//        it is a sentence that can rot without anyone noticing. Items 1-3 are
//        deliberately NOT pinned, and that is the other half of the decision:
//        each names an open CLASS rather than one shape, so a fixture would pin
//        one example while READING as though it pinned the class — a narrower
//        guarantee wearing a wider claim, which is the defect this whole round
//        is about. A render taking any of those five shapes is not
//        seen. The list is an ENUMERATION and it does not claim to be closed;
//        what it claims is that everything on it is executed below.
```

### The `push` rule's source, pasted beside items 4 and 5 so the descriptions can be CHECKED

```ts
      // ---- ACCUMULATOR: `a.push(x)` makes `a` the binding too. --------------
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "push" &&
        node.arguments.some((argument) => derives(argument))
      ) {
        const receiver = unwrap(node.expression.expression);
        if (ts.isIdentifier(receiver)) names.add(receiver.text);
      }
```

**Item 4 checked against it:** `names.add(receiver.text)` is guarded by
`ts.isIdentifier(receiver)`. For `o.parts.push(e.message)` the unwrapped receiver is the
`PropertyAccessExpression` `o.parts`, not an identifier, so nothing is added to `names` and the
`join` below reaches nothing. The residual's wording — *"grows the tracked names only when the
unwrapped receiver is a BARE IDENTIFIER"* — is that guard restated, not an approximation of it.

**Item 5 checked against it:** `names` is a mutable `Set` populated DURING the walk (`names.add`
above; the same for the one-hop-copy rule). At the moment a `join` node is visited, `names` holds
only what earlier nodes added. So `const out = a.join(""); a.push(e.message)` has `a` untracked at
the join and tracked only afterwards. The residual's wording — *"the tracked names GROW DURING THE
WALK, so a `join` appearing BEFORE its `push` in document order … is missed"* — is that restated.
Both limits sit inside boundary 2's own document-order statement (*"`names` starts as the one
binding and GROWS by one hop as the walk meets a `const`/`let` initialised from it. Document order
is what makes that sound"*), which is why the residual points at it rather than restating it as a
second, separately-drifting sentence.

### THE PINNING DECISION, RECORDED WITH ITS REASON

**Decision: PIN items 4 and 5; deliberately do NOT pin items 1–3.** Recorded in the residual
paragraph itself (above), not only here — an undisclosed decision about disclosure is the recursion
this phase keeps finding at the bottom of its findings.

- **Why pin 4 and 5.** `schema.spec.ts` one directory away pins each of its OPEN grammars with an
  assertion that goes red the day somebody closes it. Items 4 and 5 are single, exactly-specified
  SHAPES, so a case can assert precisely them. They now exist and are executed:

  ```
   ✓ RESIDUAL, PINNED (IN-22): a push onto a MEMBER receiver is unseen — the push rule needs a bare identifier
   ✓ RESIDUAL, PINNED (IN-22): a `join` appearing BEFORE its `push` in document order is missed
  ```

  Each asserts `.toEqual([])` today. Close either limit and the case goes RED, and whoever closes it
  updates the residual deliberately rather than leaving a sentence that has quietly become false.

- **Why NOT pin 1–3.** Each names an open CLASS, not a shape. A fixture for `padEnd` would pin
  `padEnd` while READING as though it pinned "every method this list does not name" — a narrower
  guarantee wearing a wider claim. That is precisely the defect this round exists to find, and
  writing it into the file in the name of thoroughness would be committing it deliberately.

## 6. THE NON-CLOSED-ENUMERATION SENTENCE IS BYTE-IDENTICAL

The sentence is what makes WR-24 a warning rather than an overclaim, and deleting or softening it in
the name of tidiness would convert an honest bound into a claim the gate cannot support. It survives
untouched, shown two ways:

```
$ grep -c '^//        seen\. The list is an ENUMERATION and it does not claim to be closed;$' packages/backend/src/store/error-redaction.spec.ts
1
$ grep -c '^//        what it claims is that everything on it is executed below\.$' packages/backend/src/store/error-redaction.spec.ts
1
```

```
$ git diff packages/backend/src/store/error-redaction.spec.ts \
    | grep -E '^[-+].*(ENUMERATION and it does not claim to be closed|everything on it is executed below)'
UNTOUCHED BY THE DIFF
```

The full set of lines the task-2 diff REMOVED — four lines, none of them the sentence:

```
$ git diff -U0 packages/backend/src/store/error-redaction.spec.ts | grep '^-' | grep -v '^---'
-//        THE RESIDUAL OF THE RENDER-FORM LIST, RE-DERIVED against the widened
-//        rules rather than carried forward: a render that goes through a method
-//        this list does not name (`padEnd`, `repeat`, `replace`, a user helper),
-//        or through an accumulator that is neither a `+=` nor a `.push`, is not
```

## 7. THE GREEN BASELINE, RESTORED AND RECORDED

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1101 passed (1101)
   Duration  1.09s
```

Entering the wave the baseline was 31 files / 1082 tests. It is now 31 files / **1101** tests — the
19 added here (3 conditional + 6 logical-operator + 1 already-covered control + 7 safe twins +
2 pinned residuals). No file count change: the plan modified exactly one existing spec.

```
$ pnpm typecheck   → tsc --build            exit 0
$ pnpm lint        → eslint .               exit 0
$ pnpm knip        → knip                   exit 0
$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

### Scope containment

```
$ git diff --exit-code packages/backend/src/outbound-prohibition.spec.ts \
    packages/backend/src/store/observations.ts packages/backend/src/store/observations.spec.ts \
    tests/ scripts/
SCOPE-CLEAN

$ git diff --exit-code -- 01-01-PLAN.md … 01-20-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md
PLANNING-ARTIFACTS-CLEAN
```

## Decisions Made

1. **Descend a conditional's BRANCHES, never its CONDITION.** `e instanceof Error` renders nothing;
   only the branch that becomes the value can carry the error's bytes into `analyses.error`.
   Descending the condition would have added a false-positive class for zero coverage.
2. **Either-side semantics for both branches.** A render that is unsafe on one path is unsafe. This
   matches `initializerReceiver` in `../outbound-prohibition.spec.ts` one package away, and the
   symmetry is stated in the docblock so the two gates cannot drift into disagreeing about the same
   operator.
3. **Recursion rather than the loop's `continue`.** A conditional and a binary each have TWO
   sub-expressions; the loop carries one `current`. Re-entering `derivesFrom` from the top is also
   what preserves `isSafeRenderCall` at every new depth for free, since the safe-call check is the
   function's first statement.
4. **`+` and `+=` deliberately NOT added to the descent.** They are handled as RENDER FORMS by their
   own rule. `derivesFrom` answers "does this VALUE derive from the binding", and `"x" + e` is a
   render, not a passthrough. Stated in the code so the omission reads as a decision.
5. **Pin IN-22's two shapes; do not pin the three open classes.** Both halves recorded in the
   residual paragraph itself. Reasoning in §5.

## Deviations from Plan

None — plan executed exactly as written. No deviation rule was triggered: no bug surfaced, no
missing critical functionality was found, nothing blocked, and no architectural change was needed.

**Total deviations:** 0.
**Impact on plan:** none.

## Issues Encountered

None affecting the work. Two shell-environment notes, recorded because they cost time and the next
executor on this machine will hit them: `rm` and `cp` are aliased to their `-i` forms, so a
non-interactive `rm probe.spec.ts` blocks on a confirmation prompt and a `cp -f` restore silently
declines to overwrite. Both were resolved with `command rm -f` / `command cp -f`, and the restore
after each mutation was verified by `grep` for the reverted branch plus a re-run to green rather than
assumed from the copy's exit status.

## Known Stubs

None. Every rule added has an executed failing path, every new failing path has an executed safe
twin, and every residual item is either pinned by an executed case (items 4–5) or disclosed with a
recorded reason for not being pinned (items 1–3).

## Threat Flags

None. This plan modified one `.spec.ts` gate file; it added no network endpoint, no auth path, no
file access pattern and no schema change. Every threat in the plan's register (T-01-120 … T-01-124,
T-01-34) is discharged by the evidence in §1–§6; T-01-SC is not applicable — no package was
installed and no manifest was touched.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for plan 01-22** (`tests/pins.spec.ts`, `scripts/phase1/tracer-e2e.sh`), which this plan does
not touch. Baseline handed over: 31 files / 1101 tests green, typecheck / lint / knip clean, bundle
at exactly one import specifier.

**Carried forward, unchanged and with owners:**

- **STORE-07 ledger collision.** `REQUIREMENTS.md:58` reads "All SQL uses positional `?` parameters"
  and says nothing about rendered-error redaction. Recorded as a deferral WITH AN OWNER (the
  operator, at the next requirements pass, by the STORE-01 → STORE-08 route). This plan did not fix
  it and does not pretend to.
- **The three renders outside `store/`** — `compat.ts:317` (Phase 2, ERR-04),
  `hooks/passive.ts:171` (Phase 2, ERR-03) and `telemetry.ts:422` (correct by construction, no
  owner). Each named in boundary 1 with a checkable requirement id. Not re-owned here.
- **Residual items 1–3**, disclosed and deliberately unpinned; **items 4–5** (IN-22), disclosed and
  pinned by executed cases.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*

## Self-Check: PASSED

- `packages/backend/src/store/error-redaction.spec.ts` — FOUND on disk.
- `.planning/phases/01-skeleton-persistence-compatibility/01-21-SUMMARY.md` — FOUND on disk.
- Commits `194287a`, `79961ff`, `d5a70e7` — all FOUND in `git log --oneline --all`.
- 13 `WR-24` markers and 2 `RESIDUAL, PINNED (IN-22)` cases present in the gate file.
