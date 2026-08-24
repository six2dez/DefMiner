---
phase: 01-skeleton-persistence-compatibility
plan: 25
subsystem: testing
tags: [typescript-ast, static-analysis, security-gate, outbound-prohibition, WR-27]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "the CORE-11 outbound gate, its `receiverKind`/`keyReceiver`/`initializerReceiver` resolvers, the round-4 conditional KEY and conditional INITIALIZER controls, and the wave-24 residual (plans 01-09, 01-12, 01-16, 01-18, 01-19, 01-23, 01-24)"
provides:
  - "`operatorReceiver` — ONE definition of how an operator expression is read for a receiver, reached from call position, key position and initializer position alike"
  - "`? :`, `??`, `||` and `&&` read in CALL-RECEIVER position, where they returned `undefined` — the state every caller reads as `not a receiver`"
  - "THE COLLAPSE: `initializerReceiver` is now a name for `receiverKind`; the element-access arm calls `keyReceiver`; three copies of one idea reduced to one"
  - "a precedence bug NO residual list named, found by reading the three copies side by side: `??` does not skip `UNREADABLE_RECEIVER`, so an unreadable LEFT branch shadowed a NAMED RIGHT branch in initializer position only"
  - "`RECEIVER_OPERATORS`, a named frozen set; `&&` included BY MEASUREMENT with both readings run and the deciding shape named"
  - "`keyReceiver`'s own recursion, making its single-definition docblock claim true of the code — a nested conditional key resolves"
  - "a NEWLY MEASURED, PREVIOUSLY UNNAMED residual: the descent is not reached from `isGlobalReceiver`/`isFetchExpression`/`isNavigatorReceiver`, so an operator around a GLOBAL receiver is still silent"
  - "the residual re-derived from the resolver branches, authored ONCE and rendered programmatically into the gate header and `WINDOWS.md` entry 28"
affects: [wave 26 IN-26 and store/pins/tracer, wave 27 derivation, wave 28 CORE-11 flip]

actuals:
  tokens: 61000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A descent parameterised by its LEAF RESOLVER, so one function serves three positions and each caller passes itself for recursion"
    - "A sentinel for `this is not the shape at all`, distinct from `this shape resolved to nothing`, so no caller re-tests the node kind"
    - "An operator-class decision made by implementing BOTH readings and running them, with the run that did NOT discriminate said so plainly"
    - "Probing where a widening STOPS rather than assuming it is universal, and disclosing what that finds on the same day"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/WINDOWS.md

key-decisions:
  - "P25-D1: the descent HOISTED into `operatorReceiver` — one function taking the caller's leaf resolver — rather than a fourth copy"
  - "P25-D2: `&&` IS IN the operator set, decided by measurement; the real tree did NOT discriminate and the shapes did"
  - "P25-D3: the three-state precedence copied from the element-access arm, not reinvented — which surfaced initializer position's own `??` bug"
  - "P25-D4: the global-receiver operator silence DISCLOSED and pinned rather than closed — out of this plan's scope, open and unowned"
  - "P25-D5: `REQUIREMENTS.md` and `STATE.md` deliberately NOT amended — wave 27 derives, wave 28 reconciles both in one move"

patterns-established:
  - "When a plan assigns a shape to task N and it actually closes at task N-1, the fixture says so in its own body and the mutation table names it as MEASURED NON-EVIDENCE"
  - "A widening's must-stay-quiet twin ships in the SAME commit, one twin per operator in the set"

requirements-completed: []

coverage:
  - id: D1
    description: "An operator written directly as the callee's receiver resolves — `? :`, `??`, `||` and `&&` — where it returned `undefined`, the state every caller reads as `not a receiver`"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through operatorReceiver in CALL position: `(b ? sdk.requests : sdk.net).send(req)` reports outbound-send — WR-27, the third face of the operator"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through RECEIVER_OPERATORS: `(sdk.requests ?? sdk.net).send(req)` and the `||` form report — the same operator class, the same descent"
        status: pass
      - kind: other
        ref: "MC1 3 RED, MD1 2 RED — each restored, `git diff --exit-code` clean, each re-run green"
        status: pass
    human_judgment: false
  - id: D2
    description: "The three-state answer is asserted in all three directions — named receiver, unreadable, not a receiver — not only where the widening fires"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through operatorReceiver in CALL position … (assertions 3-6: NAMED both sides, UNREADABLE, NOT-A-RECEIVER)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The collapse: one descent serves call, key and initializer position, and the precedence initializer position had to itself is gone"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through THE COLLAPSE: initializer position and call position now give the SAME answer, and the `??` precedence initializer position had to ITSELF is gone"
        status: pass
      - kind: other
        ref: "MC2 1 RED — the collapse undone, `initializerReceiver` carrying its own copy again; restored, re-run green"
        status: pass
    human_judgment: false
  - id: D4
    description: "`&&` settled by measurement with both readings implemented and run, and the cost of the chosen reading pinned by its own assertion"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through RECEIVER_OPERATORS: `&&` IS IN THE SET, DECIDED BY MEASUREMENT — and this pins BOTH what that buys and what it costs"
        status: pass
      - kind: other
        ref: "both readings executed against 20 shapes and against the real tree; table in section 3"
        status: pass
    human_judgment: false
  - id: D5
    description: "A nested conditional key resolves and `keyReceiver`'s single-definition docblock claim is true of the code"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through keyReceiver's OWN recursion: `sdk[b ? (c ? \"requests\" : \"x\") : \"y\"]` resolves — the docblock's single-definition claim made TRUE of the code"
        status: pass
      - kind: other
        ref: "MD2 4 RED — the recursion removed; restored, re-run green. MEASURED NON-EVIDENCE under MD1, named as such"
        status: pass
    human_judgment: false
  - id: D6
    description: "Every widening has a must-stay-quiet twin in the same commit: an operator over ordinary objects in all four spellings, and an ordinary object defining `send`"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#an operator expression over two ORDINARY objects, in call position reports ZERO violations"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the `??` / `||` fallback idiom and the `&&` GUARD idiom over ordinary collaborators report ZERO violations"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#an ORDINARY object defining a method named send reports ZERO violations"
        status: pass
    human_judgment: false
  - id: D7
    description: "The real tree still reports ZERO over both SOURCE_ROOTS after every widening, with the four measured-exempt sites confirmed quiet by name"
    requirement: "CORE-11"
    verification:
      - kind: integration
        ref: "packages/backend/src/outbound-prohibition.spec.ts#<file> reaches no outbound surface (23 files, both roots) + standalone probe reporting files=23 violations=0 after each task"
        status: pass
    human_judgment: false
  - id: D8
    description: "The residual states the operator class closed in all four positions, records the omission as the finding inside the residual block, and names the one shape this wave opened"
    verification:
      - kind: other
        ref: "canon-in-header true, canon-in-entry-28 true (whitespace-normalised); windows fixed 27 / append / status -> exactly ONE open entry on this gate file"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through NOTHING: the operator descent reaches the RECEIVER and KEY resolvers and STOPS THERE — the GLOBAL receivers are untouched by it — A MEASURED SILENCE"
        status: pass
    human_judgment: false
  - id: D9
    description: "The green baseline is restored: 31 files / 1143 tests, typecheck / lint / knip clean, bundle at exactly one specifier"
    verification:
      - kind: other
        ref: "pnpm test (31 files, 1143 tests, 0 failures); typecheck/lint/knip exit 0; check:bundle -> 1 specifier: crypto"
        status: pass
    human_judgment: false

duration: 21 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 25: The third face of the operator Summary

**One operator descent — `? :`, `??`, `||` and the measured `&&` — hoisted into `operatorReceiver` and reached from call position, key position and initializer position alike, with the three copies collapsed to one, a precedence bug no residual named found in the collapse, and the omission recorded as the finding where the list is.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-08-24T14:12:00Z
- **Completed:** 2026-08-24T14:33:00Z
- **Tasks:** 3
- **Files modified:** 2

## SEVERITY, STATED PLAINLY AND NOT INFLATED

**Nothing leaks.** No outbound call exists in any non-spec source under either root, the gate runs green over the real tree (23 files, **ZERO** violations) inside a 1143-test suite, and `pnpm check:bundle` reports the shipped bundle's entire import set as **one specifier, `crypto`**. WR-27 is a **prospective blindness in a test-only gate** — a class of source the gate would not have caught had anyone written it — not an exposure. No sentence here may be read otherwise.

**THIS IS A WIDENING OF A SELF-DECLARED-OPEN ENUMERATION, NOT THE CORRECTION OF A FALSE CLAIM.** No residual list ever asserted that a call-position operator was covered; none of them named the shape at all. Round 4's wave 21 framed WR-24 the same way and the verifier credited it, and CR-09 — a residual that *asserted* something false — is the heavier finding this round does not borrow weight from. Equally, an omitted shape is not a harmless one: a residual list is trusted for its completeness, and a reader enumerating this gate's blind spots would have finished the list and stopped.

**This closes WR-27's INSTANCE and not the CLASS.** It is the **seventh** consecutive round in which a bound was authored rather than derived. **Wave 27 owns the derivation**; this plan does not borrow that claim.

## Accomplishments

- `operatorReceiver` added as THE ONE definition of how an operator expression is read for a receiver, parameterised by the caller's leaf resolver so call, key and initializer position all reach it
- the three copies collapsed: `initializerReceiver` is now a name for `receiverKind`, and the element-access arm's hand-written conditional block is `keyReceiver`'s own recursion
- `&&` settled by implementing and running **both** readings — the real tree did **not** discriminate and that is said plainly; the shapes did
- a precedence bug **no residual list named**, found by reading the three copies side by side: `??` does not skip `UNREADABLE_RECEIVER`
- a shape this wave **opened** by probing where the descent stops, disclosed the same day rather than left for a later round's finding
- **four** separate mutation proofs, each RED by title, each restored `git diff --exit-code` clean, each re-run green
- the residual authored ONCE and rendered programmatically into both surfaces, identity **asserted** rather than eyeballed

---

## 1. THE SHAPES — EXECUTED BEFORE AND AFTER, PASTED, NOT ASSERTED IN PROSE

Executed through `auditSource` from a throwaway probe spec (deleted before any commit; never committed). BEFORE is measured against `278a0d2~1`.

| id | source | BEFORE | AFTER |
|---|---|---|---|
| W1 | `(b ? sdk.requests : sdk.net).send(req)` | `[]` | `["outbound-send"]` |
| W2 | `(sdk.requests ?? sdk.net).send(req)` | `[]` | `["outbound-send"]` |
| W3 | `(sdk.requests \|\| sdk.net).send(req)` | `[]` | `["outbound-send"]` |
| W4 | `(sdk.requests && sdk.net).send(req)` | `[]` | `["outbound-send"]` |
| W4b | `(ok && sdk.requests).send(req)` — the guard form | `[]` | `["outbound-send"]` |
| W5 | `sdk[b ? (c ? "requests" : "x") : "y"].send(req)` | `[]` | `["outbound-send"]` |
| N1 | `const r = sdk.requests ?? sdk.net; r.send(req)` | `[]` | `["outbound-send"]` |
| N2 | `const r = sdk.requests \|\| sdk.net; r.send(req)` | `[]` | `["outbound-send"]` |
| N3 | `const r = ok && sdk.requests; r.send(req)` | `[]` | `["outbound-send"]` |
| N4 | `sdk[k ?? "requests"].send(req)` | `[]` | `["outbound-send"]` |

### The two round-4 controls — MEASURED FIRST, and this time the plan's prediction held

Wave 24 found its plan's stated CONTROL was wrong when measured. This wave's two were measured before anything was touched and both were as claimed:

```
C1  sdk[b ? "requests" : "net"].send(req)              BEFORE ["outbound-send"]   AFTER ["outbound-send"]
C2  const r = b ? sdk.requests : sdk.net; r.send(req)  BEFORE ["outbound-send"]   AFTER ["outbound-send"]
```

Both are re-asserted inside the COLLAPSE fixture, because a widening that breaks the cases it was built beside has widened nothing.

### THE THREE-STATE ANSWER, asserted in all three directions and not only the firing one

```
T1  (b ? sdk.requests : cache).send(req)   BEFORE []   AFTER ["outbound-send"]         NAMED
T1b (b ? cache : sdk.requests).send(req)   BEFORE []   AFTER ["outbound-send"]         NAMED, other side
T2  (b ? sdk[k1 + k2] : cache).send(req)   BEFORE []   AFTER ["outbound-unanalysable"] UNREADABLE
T3  (b ? cache : client).send(req)         BEFORE []   AFTER []                        NOT A RECEIVER
U1  (sdk[k1 + k2] ?? cache).send(req)      BEFORE []   AFTER ["outbound-unanalysable"] UNREADABLE, binary
```

### THE MUST-STAY-QUIET TWINS, written in the SAME commits as the widenings

```
Q1  (useCache ? cache : client).send(payload)          BEFORE []   AFTER []
Q2  (cache ?? client).send(payload)                    BEFORE []   AFTER []
Q2b (cache || client).send(payload)                    BEFORE []   AFTER []
Q2c (ready && cache).send(payload)                     BEFORE []   AFTER []
Q3  const bus = { send(x) { return x; } }; bus.send(line)
                                                       BEFORE []   AFTER []
Q4  sdk[b ? (c ? "aaa" : "x") : "y"].send(req)         BEFORE []   AFTER []
```

### A NOTE ON THE `await` SPELLING, recorded because it looks like a miss and is not

```
W1a await (b ? sdk.requests : sdk.net).send(req)       BEFORE []   AFTER []
```

`await (X).send(req)` does not parse as an await of a parenthesised expression — TypeScript reads `await(X)` as a CALL and `.send` as a member of its result. This is already documented in `unwrap`'s docblock and is why the round-1 comma fixtures omit `await` too. **It is a parsing fact, not a gate blindness**, and it is recorded here so nobody counts it as one in either direction. Every fixture this wave added omits `await` and says why in its own body.

## 2. THE PRECEDENCE BUG THE COLLAPSE FOUND, WHICH NO RESIDUAL LIST NAMED AND WHICH THIS PLAN DID NOT PREDICT

The plan required the copies be collapsed so the three cannot disagree. **Measured before the collapse, they already did**, in a way nothing had recorded:

```
I1  const r = b ? sdk[k1 + k2] : sdk.net;  r.send(req)   BEFORE ["outbound-unanalysable"]   AFTER ["outbound-net"]
I2  const r = b ? sdk.net : sdk[k1 + k2];  r.send(req)   BEFORE ["outbound-net"]            AFTER ["outbound-net"]
```

**Two spellings of one shape, answered differently by operand ORDER.** `initializerReceiver` was written as `receiverKind(whenTrue) ?? receiverKind(whenFalse)`, and `??` does not skip `UNREADABLE_RECEIVER` — a symbol is neither `null` nor `undefined` — so an UNREADABLE LEFT branch shadowed a NAMED RIGHT branch in initializer position and in no other position. The element-access arm, three hundred lines up, preferred NAMED over UNREADABLE whichever side it sat on.

This was found the way wave 24 found its own live silent miss: **by listing the copies before touching them.** It is exactly the class of defect three copies of one rule produce, and it is the second one in this wave (the first being the untaught third face itself). Both directions REPORTED before and after, so the correction changed *which rule is named* and **nothing went quiet** — stated because a precedence change that quietly silenced one side would be a far larger change than this is. Pinned by `through THE COLLAPSE: …`.

## 3. THE `&&` DECISION, WITH THE MEASUREMENT THAT DECIDED IT

**Both readings were implemented and run** rather than one implemented and the other reasoned about.

| shape | READING A — `&&` IN (implemented) | READING B — `&&` OUT (rejected) |
|---|---|---|
| `(sdk.requests && sdk.net).send(req)` | `["outbound-send"]` | **`[]`** |
| `(ok && sdk.requests).send(req)` — the guard form | `["outbound-send"]` | **`[]`** |
| `(sdk.requests && ok).send(req)` — the mirror | `["outbound-send"]` | **`[]`** |
| `const r = ok && sdk.requests; r.send(req)` | `["outbound-send"]` | **`[]`** |
| `(ok && cache).send(req)` — the twin | `[]` | `[]` |
| `(sdk.requests ?? sdk.net).send(req)` | `["outbound-send"]` | `["outbound-send"]` |
| `sdk[b ? "requests" : "net"]` (control) | `["outbound-send"]` | `["outbound-send"]` |
| the four measured-exempt sites | `[]` | `[]` |
| **real tree, both `SOURCE_ROOTS`** | **23 files, 0 violations** | **23 files, 0 violations** |
| whole gate file | 208 passed | 208 passed |

**THE REAL TREE DID NOT DISCRIMINATE, AND THAT IS SAID PLAINLY RATHER THAN DRESSED UP.** Both readings run ZERO over shipped source, so nothing about this codebase chose `&&`. **The shapes discriminated.** `(ok && sdk.requests).send(req)` is the ordinary way to write a guarded outbound call; it has `sdk.requests` written out in full; reading B calls it "not a receiver" — **which is WR-27's own finding reproduced one operator over, inside the wave closing it.** Excluding `&&` would have shipped the defect being fixed.

**THE COST IS DISCLOSED AND PINNED, NOT GLOSSED.** `(sdk.requests && ok).send(req)` — receiver as guard, value as something else — REPORTS. That OVER-approximates. It is the direction every other set in this file errs in, and it has its own assertion inside the `&&` fixture rather than being left implicit. `&&` is therefore **not** in the residual as an exclusion; the over-approximation is in the residual as a cost.

**The sibling gate corroborates and did not decide.** `store/error-redaction.spec.ts`'s `derivesFrom` (WR-24, plan 01-21) descends this exact set of four with either-side semantics, and its docblock cites `initializerReceiver` in *this* file as its reason: *"stating the symmetry here is what keeps the two gates from drifting into disagreeing about the same operator."* Excluding `&&` would have manufactured the disagreement that sentence exists to prevent. That is corroboration; the measurement above is the reason.

## 4. FOUR SEPARATE MUTATION PROOFS — EXECUTED, NEVER COMBINED

Each mutation applied **alone** against the **committed** file, run, restored with `git checkout --`, cross-checked with `git diff --exit-code`, re-run green.

### MC1 — the operator descent removed from `receiverKind`

```
    const operator = operatorReceiver(inner, receiverKind);
    if (operator !== NOT_AN_OPERATOR) return operator;
→   // MUTATION MC1

      Tests  3 failed | 198 passed (201)
```

RED, by title and message:

```
× an outbound receiver, however it was bound > fires on a CONDITIONAL initializer
    AssertionError: expected [] to include 'outbound-send'
× through operatorReceiver in CALL position: `(b ? sdk.requests : sdk.net).send(req)` reports
  outbound-send — WR-27, the third face of the operator
    AssertionError: (b ? sdk.requests : sdk.net).send(req) still reports clean:
                    expected [] to include 'outbound-send'
× through THE COLLAPSE: initializer position and call position now give the SAME answer, and the
  `??` precedence initializer position had to ITSELF is gone
    AssertionError: an UNREADABLE left branch is shadowing a NAMED right branch again:
                    expected [] to include 'outbound-net'

MC1 RESTORE: git diff --exit-code CLEAN (exit 0)
re-run:       Tests  201 passed (201)
```

`fires on a CONDITIONAL initializer` is a **round-4 fixture**, and its going red here is the collapse working: initializer position now depends on the shared descent rather than on its own copy.

### MC2 — the collapse UNDONE, `initializerReceiver` carrying its own copy again

Not a branch removal: the pre-collapse structure restored as a mutation. **This is the only mutation that isolates the collapse from the descent.**

```
  const initializerReceiver = (node) => receiverKind(node);
→ const initializerReceiver = (node) => {
      const inner = unwrap(node);
      if (ts.isConditionalExpression(inner))
        return receiverKind(inner.whenTrue) ?? receiverKind(inner.whenFalse);
      return receiverKind(inner);
    };

      Tests  1 failed | 200 passed (201)

× through THE COLLAPSE: initializer position and call position now give the SAME answer, and the
  `??` precedence initializer position had to ITSELF is gone
    AssertionError: an UNREADABLE left branch is shadowing a NAMED right branch again:
                    expected [ 'outbound-unanalysable' ] to include 'outbound-net'

MC2 RESTORE: git diff --exit-code CLEAN (exit 0)
re-run:       Tests  201 passed (201)
```

**The collapse is load-bearing, not cosmetic**, and this is the proof: with the copy restored the file still passes 200 of 201, and the one that fails is the precedence the copy carried.

### MD1 — the binary-operator set EMPTIED

```
const RECEIVER_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.AmpersandAmpersandToken,
→ // MUTATION MD1 — the set EMPTIED
]);

      Tests  2 failed | 206 passed (208)

× through RECEIVER_OPERATORS: `(sdk.requests ?? sdk.net).send(req)` and the `||` form report —
  the same operator class, the same descent
    AssertionError: expected [] to include 'outbound-send'
× through RECEIVER_OPERATORS: `&&` IS IN THE SET, DECIDED BY MEASUREMENT — and this pins BOTH
  what that buys and what it costs
    AssertionError: the guarded outbound call — the shape that decided `&&`:
                    expected [] to include 'outbound-send'

MD1 RESTORE: git diff --exit-code CLEAN (exit 0)
re-run:       Tests  208 passed (208)
```

The `&&` fixture goes red **by its deciding assertion**, which is the one the measurement in section 3 turned on.

### MD2 — `keyReceiver`'s own recursion removed

```
    const operatorKey = operatorReceiver(unwrap(key), keyReceiver);
    if (operatorKey !== NOT_AN_OPERATOR) return operatorKey;
→   // MUTATION MD2 — keyReceiver's own recursion removed

      Tests  4 failed | 204 passed (208)

× through the CONDITIONAL resolver: `sdk[b ? "requests" : "net"]` hides nothing, so it reports
  outbound-send
    AssertionError: sdk[b ? "requests" : "net"].send(req) still reports clean:
                    expected [] to include 'outbound-send'
× through THE COLLAPSE: initializer position and call position now give the SAME answer …
    AssertionError: expected [] to include 'outbound-send'
× through RECEIVER_OPERATORS: `(sdk.requests ?? sdk.net).send(req)` and the `||` form report …
    AssertionError: expected [] to include 'outbound-send'
× through keyReceiver's OWN recursion: `sdk[b ? (c ? "requests" : "x") : "y"]` resolves — the
  docblock's single-definition claim made TRUE of the code
    AssertionError: expected [] to include 'outbound-send'

MD2 RESTORE: git diff --exit-code CLEAN (exit 0)
re-run:       Tests  208 passed (208)
```

### THE CASE THAT STAYED GREEN UNDER THE MUTATION IT SITS BESIDE — recorded on its own terms

| case | green under | proven instead by | why |
|---|---|---|---|
| `… keyReceiver's OWN recursion: sdk[b ? (c ? "requests" : "x") : "y"] …` | **MD1** | **MD2** and **MC1** | The plan assigned the nested key to **task 2**, alongside the binary operators. **Measured: it closed in TASK 1**, the moment the element-access arm stopped hand-rolling its own conditional block and started calling `keyReceiver` — the recursion and the collapse are one edit seen from two sides. Emptying the binary-operator set therefore cannot touch it, because the shape is `? :` and not `??`. **MEASURED NON-EVIDENCE under MD1, named as such**, and the fixture says so in its own body so no later reader re-derives the plan's version of the timeline. |

Every other new positive case went RED under the mutation it sits beside.

## 5. THE COLLAPSE, SHOWN BY THE DIFF

```
$ git diff 278a0d2~1 HEAD -- packages/backend/src/outbound-prohibition.spec.ts
+    const operatorKey = operatorReceiver(unwrap(key), keyReceiver);      ← keyReceiver's recursion
+    const operator = operatorReceiver(inner, receiverKind);              ← the third face, taught
-      if (ts.isConditionalExpression(key)) {                             ← the hand-written block,
-        const whenTrue = keyReceiver(key.whenTrue);                         gone
+      return keyReceiver(inner.argumentExpression);                      ← the arm now delegates
-  const initializerReceiver = (node: ts.Expression): ReceiverKind => {   ← the third copy,
-      return receiverKind(inner.whenTrue) ?? receiverKind(inner.whenFalse);  gone
+  const initializerReceiver = (node: ts.Expression): ReceiverKind =>     ← now a NAME for
+    receiverKind(node);                                                     receiverKind
```

**No fourth copy exists.** `operatorOperands` is the single answer to *what counts as an operator*; `operatorReceiver` is the single answer to *how its operands combine*; `receiverKind` and `keyReceiver` each pass **themselves** as the leaf resolver, which is what makes nesting work without a second recursion being written anywhere.

`initializerReceiver` was **kept as a name rather than inlined** at its three call sites: "the receiver an INITIALIZER denotes" is the question those sites ask, and the surviving name is the disclosure that the answer is now the same one call position gets.

## 6. THE SHAPE THIS WAVE *OPENED*, BY MEASURING WHERE THE DESCENT STOPS

The plan required the widening be measured rather than assumed. Probing **where `operatorReceiver` is reached from** — rather than assuming it is universal — found a residual nothing had named:

```
                                          BEFORE (278a0d2~1)   AFTER
(ok && globalThis).fetch(url)                    []              []
(g ?? globalThis)["fetch"](url)                  []              []
(b ? globalThis : x).fetch(url)                  []              []
(b ? navigator : x).sendBeacon(u, d)             []              []
(b ? fetch : x)(url)                             []              []
(b ? eval : x)(src)                              []              []

THE CONTRAST that shows the boundary is the RESOLVER and not the operator:
(b ? sdk.requests : x).send(req)                 []              ["outbound-send"]
```

`operatorReceiver` is reached from `receiverKind` and `keyReceiver` **and from nowhere else**. `isGlobalReceiver`, `isFetchExpression` and `isNavigatorReceiver` resolve their own spellings through the alias sets and never consult it. **This wave neither closed these nor broke them and claims no credit for them** — identical before and after, measured against `278a0d2~1`.

It is **open and unowned**: no plan in this phase claims it. It is disclosed in the residual, given a mechanism-table row, and pinned by `through NOTHING: the operator descent reaches the RECEIVER and KEY resolvers and STOPS THERE — … A MEASURED SILENCE`. Recorded on the day it was found rather than left to be a later round's finding, because a residual that narrows in one place while quietly widening in another is the omission this round exists to stop.

One further thing this wave deliberately did **not** do: closing it means widening the global/navigator/fetch resolvers, which is the alias machinery CR-09 and IN-20 both fought over, and is outside this plan's `files_modified` intent. Disclosing it is the honest move; closing it silently inside a wave scoped elsewhere would not be.

## 7. THE REAL TREE, ZERO, AFTER EVERY TASK, WITH THE FOUR MEASURED-EXEMPT SITES NAMED

```
$ (standalone probe over both SOURCE_ROOTS, after task 1)
REALTREE files=23 violations=0
$ (after task 2, with the binary operators and `&&` landed)
REALTREE files=23 violations=0
$ (after task 3)
REALTREE files=23 violations=0

EXEMPT compat.ts cur[key] + ctx[root]     packages/backend/src/compat.ts                 -> []
EXEMPT observations.ts segments[i]        packages/backend/src/store/observations.ts     -> []
EXEMPT MIGRATIONS[MIGRATIONS.length - 1]  packages/backend/src/store/migrations.ts       -> []
```

23 files — `packages/backend/src` (14) and `packages/engine/src` (9). An operator descent in call-receiver position is the widening most likely to fire on ordinary shipped code, so this was the acceptance criterion and not a formality. **It fired on nothing**, under both `&&` readings.

## 8. EVERY EXISTING FIXTURE IN THE THREE POSITIONS STILL PASSES, BY BLOCK NAME

```
✓ an outbound receiver, however it was bound > fires on a CONDITIONAL initializer
✓ a receiver the walk cannot read is REPORTED, not dropped > through the CONDITIONAL resolver:
    `sdk[b ? "requests" : "net"]` hides nothing, so it reports outbound-send
✓ a receiver the walk cannot read is REPORTED, not dropped > through the COMMA SEQUENCE rule plus
    constStrings: `sdk[(0, "requests")]` is its rightmost operand
✓ a receiver the walk cannot read is REPORTED, not dropped > through constStrings' WHOLE-FILE
    BINDINGS: a name REBOUND to a receiver name IS one — CR-10 shape 1 of 5
✓ … the `var` spelling of the same rebinding — CR-10 shape 2 of 5
✓ … through constStrings' ASSIGNMENT-SIDE WRITE: the control that proves the misses were real
✓ … through assembledNames' COMPOUND-ASSIGNMENT branch — CR-10 shape 4 of 5
✓ … through assembledNames OVER constStrings — THE PRECEDENCE, settled
✓ … through literalOf's SINGLE-VALUED contract: THE ALLOWLIST STILL HOLDS
✓ … through ANY-BINDING-WINS and literalOf together: THE WIDENING CREATED NO NEW SILENCE
✓ the RECEIVER the alias sets sit on … > through constStrings' WHOLE-FILE BINDINGS in GLOBAL-KEY
    position — CR-10 shape 3 of 5
✓ the shapes that MUST stay quiet — all 25 rows, including the four new operator twins
```

**Plans 01-23's and 01-24's fixtures all still pass.** Shown by the gate file's full green run: 208 of 208.

## 9. THE MECHANISM TABLE'S ADDED OPERATOR ROWS

The table had **exactly one** operator row — the conditional KEY — so a reader checking this gate's treatment of an operator would have found it, matched their shape against it and stopped. Two of the four positions were silent. That is the substitution the table exists to prevent, running one position out instead of one spelling out.

```
SPELLING (operator, by POSITION)         RESOLVED BY          REPORTS
-------------------------------------    -----------------    ---------------------
(b ? sdk.requests : sdk.net).send(req)   operatorReceiver     outbound-send
  CALL-RECEIVER position                   via receiverKind     — WR-27, and it was
                                                                 `[]` before wave 25
(sdk.requests ?? sdk.net).send(req)      operatorReceiver     outbound-send
(sdk.requests || sdk.net).send(req)        via receiverKind,    — the same class as the
(ok && sdk.requests).send(req)             RECEIVER_OPERATORS    conditional; `&&` is in
  CALL-RECEIVER position                                         the set BY MEASUREMENT
sdk[b ? "requests" : "net"]              operatorReceiver     outbound-send
  KEY position                             via keyReceiver
const r = b ? sdk.requests : sdk.net;    operatorReceiver     outbound-send
  r.send(req)                              via receiverKind,    — initializerReceiver is
  INITIALIZER position                      which initializer-    now a NAME for
                                            Receiver now IS      receiverKind
sdk[b ? (c ? "requests" : "x") : "y"]    operatorReceiver     outbound-send
  NESTED KEY position                      via keyReceiver      — keyReceiver passes
                                           recursing on itself   ITSELF as the resolver,
                                                                 so nesting resolves at
                                                                 any depth
(b ? cache : client).send(req)           operatorReceiver     [] — the third state:
(cache ?? client).send(req)                returns undefined    NOT A RECEIVER, and the
(ready && cache).send(req)                                      twin of every row above
(ok && globalThis).fetch(url)            NOTHING              [] — the descent is NOT
(b ? navigator : x).sendBeacon(u, d)                            reached from
(b ? eval : x)(src)                                             isGlobalReceiver /
  an operator around a GLOBAL receiver                          isFetchExpression /
                                                                isNavigatorReceiver.
                                                                OPEN and UNOWNED,
                                                                MEASURED IDENTICAL
                                                                before and after wave 25
```

**And one existing row was CORRECTED because the mechanism moved**, rather than left naming a block that no longer exists:

```
sdk[b ? "requests" : "net"]              operatorReceiver     outbound-send
                                         via keyReceiver      — ROW CORRECTED
                                                                2026-08-24 (WR-27):
                                                                the mechanism MOVED.
                                                                It named a hand-written
                                                                block in receiverKind's
                                                                element-access arm; that
                                                                block is gone and the arm
                                                                calls keyReceiver, which
                                                                descends through the ONE
                                                                shared operator resolver.
                                                                Behaviour unchanged.
```

## 10. THE NARROWED RESIDUAL — RE-DERIVED FROM THE BRANCHES, AND THE SAME WORDS IN BOTH SURFACES

**THE RE-DERIVATION METHOD, RECORDED.** The residual was read off `receiverKind`'s four arms, `keyReceiver`'s steps including the new operator step above step 0, `initializerReceiver`, `operatorReceiver` and the `RECEIVER_OPERATORS` set. It was **not** narrowed from the previous paragraph — that is the method plan 01-21 recorded as having enumerated two classes while missing a third in the same function.

**AND IT WAS AUTHORED ONCE.** Written to a single canonical file and rendered into both surfaces programmatically, so "the same words rather than two paraphrases" is a machine check:

```
canonical text length: 10205
canon in GATE HEADER      : true
canon in WINDOWS entry 28 : true

--- first 320 chars, gate header ---
CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the
phrase is not an absolute and must not be read as one. RE-DERIVED FOR WAVE 25 BY READING THE
BRANCHES: `receiverKind`'s four arms, `keyReceiver`'s steps including the operator step above step 0,
`initializerReceiver` (whi

--- same span, WINDOWS entry 28 ---
CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the
phrase is not an absolute and must not be read as one. RE-DERIVED FOR WAVE 25 BY READING THE
BRANCHES: `receiverKind`'s four arms, `keyReceiver`'s steps including the operator step above step 0,
`initializerReceiver` (whi
```

### THE OMISSION, RECORDED AS THE FINDING, INSIDE THE RESIDUAL BLOCK ITSELF

Pasted from the residual, where a reader auditing this list for completeness will be standing — not only from this summary:

> AND THE SHAPE THIS WAVE CLOSED WAS NAMED BY NO PRIOR RESIDUAL LIST AT ALL — NOT UNDERSTATED BY THEM, OMITTED FROM THEM. Before wave 25 no clause here named a call-position operator: not the two-hop clause, not the function-boundary clause, not the parameter or loop-binding clauses, not the another-file clause. A reader enumerating this gate's blind spots would have finished the list and stopped, and been wrong. THAT OMISSION IS THE FINDING, and it is recorded here where the list is rather than only in a summary, because an enumeration that grows silently is one nobody can audit for completeness in either direction. WHAT THIS IS NOT, SAID SO THE ROUND DOES NOT INFLATE ITSELF: it is not the correction of a false sentence. This list declares itself open and WR-27 WIDENED it, exactly as round 4's wave 21 framed WR-24; CR-09 by contrast was a residual that ASSERTED something false, which is the heavier finding, and this wave does not borrow its weight. Equally, an omitted shape is not a harmless one — completeness in both directions is precisely what a residual list is trusted for.

### THE OPERATOR CLASS, STATED CLOSED

> THE OPERATOR CLASS IS CLOSED IN ALL FOUR POSITIONS AS OF WAVE 25, THROUGH ONE DESCENT AND NOT THREE COPIES. `? :`, `??`, `||` and `&&` are read in CALL-RECEIVER position (`(b ? sdk.requests : sdk.net).send(req)`), in KEY position (`sdk[b ? "requests" : "net"]`), in INITIALIZER position (`const r = sdk.requests ?? sdk.net; r.send(req)`) and in NESTED KEY position (`sdk[b ? (c ? "requests" : "x") : "y"]`), by `operatorReceiver` — ONE function, reached from `receiverKind` and from `keyReceiver`, each passing ITSELF as the leaf resolver so nesting resolves at any depth. THE THREE-STATE ANSWER, in the order the element-access arm already used and copied from there rather than reinvented: any operand naming a receiver makes the expression THAT RECEIVER; else any operand the walk cannot read makes it UNREADABLE; else it is NOT A RECEIVER.

**No operator was excluded by the measurement**, so no operator appears in the residual as an exclusion. What appears instead is the **cost** of including `&&`, pinned by its own assertion.

### WHAT IS STILL OPEN, AND WHO OWNS IT

> STILL OPEN AFTER THIS WAVE, EACH NAMED WITH THE WAVE THAT OWNS IT OR WITH THE FACT THAT NOTHING DOES, because a residual that narrows in one place while quietly widening in another is the omission this round exists to stop: the DESTRUCTURED KEY BINDING, `const { k } = o; sdk[k].send(req)` — WAVE 26 (IN-26); the OPERATOR AROUND A GLOBAL RECEIVER, above — OPEN AND UNOWNED, no plan in this phase claims it, and wave 27's derivation is what will carry it forward rather than rediscover it. Wave 26 also owns `packages/backend/src/store/*`, `tests/pins.spec.ts` and `scripts/phase1/tracer-e2e.sh`.

### AND WAVE 27 NAMED AS THE OWNER OF THE DERIVATION

> WAVE 27 REPLACES THIS AUTHORED TEXT WITH ONE DERIVED FROM THE CODE. This wave closes WR-27's INSTANCE and does not close the class that produced it — an authored bound nobody re-derived — which is now SEVEN consecutive rounds.

## 11. `WINDOWS.md` — CLOSED AND REPLACED THROUGH THE TOOL, NEVER HAND-EDITED

```
$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows fixed 27
ok=true
(second invocation, for confirmation:)
Error: Window 27 is already fixed (resolved_at=2026-08-24T12:30:02.396Z).
$ ... windows status --raw
open_count=18 waived_count=0 fixed_count=9 total_count=27

$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows append --kind deviation --phase 01 \
    --file packages/backend/src/outbound-prohibition.spec.ts \
    --description "<supersession header + the canonical residual>"
ok=true open_count=19 waived_count=0 fixed_count=9 total_count=28
new entry id: 28 status: open kind=deviation file=packages/backend/src/outbound-prohibition.spec.ts

$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows status
open_count=19 waived_count=0 fixed_count=9 total_count=28
  id=13 status=fixed kind=deviation
  id=20 status=fixed kind=deviation
  id=22 status=fixed kind=deviation
  id=23 status=fixed kind=deviation
  id=25 status=fixed kind=deviation
  id=26 status=fixed kind=deviation
  id=27 status=fixed kind=deviation
  id=28 status=open  kind=deviation
OPEN entries on this gate file: 28
```

**Exactly one open entry on `outbound-prohibition.spec.ts`.** The tool refused nothing. The file was **not hand-edited**: `git diff --stat` shows `39 insertions(+), 5 deletions(-)` — the JSON block's new entry plus entry 27's status flip, with the frontmatter counters (`open_count: 19`, `fixed_count: 9`, `total_count: 28`, `last_updated`) updated in the same tool write.

The entry's supersession header states, in the ledger rather than only here, that **nothing in entry 27 is falsified by entry 28** and why that is the point.

## 12. `REQUIREMENTS.md` AND `STATE.md`, DELIBERATELY UNTOUCHED

```
$ git diff --exit-code .planning/REQUIREMENTS.md .planning/STATE.md
(no output; exit 0)
```

**In one sentence, the reason:** both carry an authored residual, wave 27 replaces the authored text with a derived one and wave 28 reconciles both requirement-tier ledgers to it in a single move, so a further hand-authored copy written here would be another place the next drift can start. CORE-11's box stays `[ ]`; wave 28 owns the flip and only against the derived text.

## 13. FROZEN ARTEFACTS UNTOUCHED

```
$ git diff --exit-code packages/backend/src/store packages/engine/src tests/ scripts/
(exit 0)
$ git diff --exit-code 01-01-PLAN.md … 01-24-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md
(exit 0)
```

## Task Commits

1. **Task 1: the descent, the collapse, the twin and the real tree** — `278a0d2` (test)
2. **Task 2: the binary operators, the measured `&&`, the nested key** — `1067f4f` (test)
3. **Task 3: the residual and the ledger** — `1cc6e27` (docs)

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — `operatorReceiver`, `operatorOperands`, `NOT_AN_OPERATOR`, `RECEIVER_OPERATORS`; `receiverKind`, `keyReceiver` and `initializerReceiver` collapsed onto one descent; six new fixtures and four new must-stay-quiet rows; the mechanism table's operator rows and one corrected row; THE FINAL RESIDUAL replaced
- `.planning/WINDOWS.md` — entry 27 closed, entry 28 appended, both through the tool

## Decisions Made

- **P25-D1** The descent HOISTED into one function parameterised by the caller's leaf resolver, rather than taught in a third place. Three copies of one idea is what left the third face untaught while the other two were taught in the same round; a fourth copy would have set up the fourth.
- **P25-D2** `&&` IS IN the set, by measurement. The real tree did not discriminate and that is stated; the shapes did, and the deciding one is the guarded outbound call that reading B leaves silent.
- **P25-D3** The three-state precedence copied from the element-access arm rather than reinvented — which is what surfaced initializer position's own `??` bug.
- **P25-D4** The global-receiver operator silence disclosed and pinned rather than closed. Closing it means widening the alias machinery, which is outside this plan; disclosing it on the day it was measured is the honest move.
- **P25-D5** `REQUIREMENTS.md` and `STATE.md` deliberately not amended — wave 27 derives, wave 28 reconciles.

## Deviations from Plan

### Recorded discrepancies between the plan's predictions and the measurement

**1. [Rule 1 — Bug found by measurement] `initializerReceiver`'s `??` precedence**
- **Found during:** Task 1, while listing the three copies before collapsing them
- **Issue:** `receiverKind(whenTrue) ?? receiverKind(whenFalse)` does not skip `UNREADABLE_RECEIVER`, so an unreadable LEFT branch shadowed a NAMED RIGHT branch in initializer position and in no other position. Named by no residual list and not predicted by this plan.
- **Fix:** the collapse itself removes it — one ordering now exists instead of two
- **Verification:** measured before and after (`I1`/`I2`, section 2), pinned by `through THE COLLAPSE: …`, mutation-proven by MC2
- **Committed in:** `278a0d2`

**2. [Plan/measurement discrepancy — recorded, not absorbed] The nested key closed at task 1, not task 2**
- The plan assigned `sdk[b ? (c ? "requests" : "x") : "y"]` to task 2. It closed in task 1, when the element-access arm began delegating to `keyReceiver`. The recursion and the collapse are one edit seen from two sides. Recorded in the fixture's own body and in the mutation table as MEASURED NON-EVIDENCE under MD1.

**3. [Scope — disclosed, not closed] The global-receiver operator silence**
- Measuring where the descent stops found six spellings still silent, identical before and after this wave. Out of this plan's scope to close; disclosed in the residual, given a mechanism-table row and pinned by a MEASURED SILENCE fixture, named open and unowned.

**4. [Recorded so it is not miscounted] The `await` parsing quirk**
- `await (b ? sdk.requests : sdk.net).send(req)` is `[]` before and after. `await(X)` parses as a call, not an await of a parenthesised expression. A parsing fact already documented in `unwrap`'s docblock, not a gate blindness — stated so nobody counts it as one in either direction.

---

**Total deviations:** 1 auto-fixed (Rule 1 — a precedence bug the collapse exposed), 3 measurement discrepancies recorded rather than absorbed.
**Impact on plan:** No scope creep. The one fix was inside the function the plan directed be collapsed; the three records are the plan's own evidence discipline producing findings it did not predict.

## Issues Encountered

None. The plan's two stated controls both measured as claimed, which is the first wave in this run where that was true on the first attempt.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The operator class is closed in all four positions through one descent; wave 26 can take IN-26 (the destructured key binding) and the store/pins/tracer surfaces without touching this resolver.
- **Wave 27 must carry forward the newly opened, unowned shape** — an operator around a GLOBAL receiver — when it replaces this authored residual with a derived one. It is named in the residual and in the mechanism table so the derivation has something to find.
- CORE-11's box remains `[ ]`. Wave 28 owns the flip, and only against wave 27's derived text.

## Final verification

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1143 passed (1143)

$ pnpm typecheck   → exit 0
$ pnpm lint        → exit 0
$ pnpm knip        → exit 0

$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto

$ (standalone real-tree probe, both SOURCE_ROOTS)
REALTREE files=23 violations=0
```

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*
