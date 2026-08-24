---
phase: 01-skeleton-persistence-compatibility
plan: 24
subsystem: testing
tags: [typescript-ast, static-analysis, security-gate, outbound-prohibition, CR-10]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "the CORE-11 outbound gate, its `constStrings`/`assembledNames` collectors and the wave-23 residual (plans 01-09, 01-12, 01-16, 01-18, 01-19, 01-23)"
provides:
  - "`constStrings` is a `Map<string, Set<string>>` holding EVERY literal a name is bound to anywhere in the file, written at the declaration AND the assignment branch"
  - "`keyReceiver` reports if ANY binding of a name names an outbound receiver — the property boundary 2 claimed for file-wide bindings and did not have"
  - "a `+=` whose right operand is not provably numeric marks the name assembled, under the same numeric guard the poisoning arm uses"
  - "THE PRECEDENCE: a watched assembly beats a literal binding of the same name, stated as step 0 of the ordering docblock and pinned by one fixture"
  - "`literalOf` is single-valued — two bindings answer 'could not read', which REPORTS at every one of its call sites"
  - "boundary 2's approximation direction restated PER COLLECTOR FAMILY; the mechanism table gains 13 rows"
  - "the residual re-derived from the branches, authored once and rendered byte-identically into the gate header and `WINDOWS.md` entry 27"
affects: [wave 25 WR-27, wave 26 IN-26 and store/pins/tracer, wave 27 derivation, wave 28 CORE-11 flip]

actuals:
  tokens: 63000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A collector whose map holds a SET per name rather than a value, with each caller choosing its own unknown-direction — any-binding-wins where reporting is safe, single-valued-or-unreadable where unreadable reports"
    - "One canonical residual text authored ONCE and rendered into every surface programmatically, with `canon in surface` asserted rather than eyeballed"
    - "A mutation that swaps in the REJECTED alternative mechanism, as the proof for a fixture no branch-removal can turn red"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/WINDOWS.md

key-decisions:
  - "P24-D1: ANY-BINDING-WINS chosen over a poisoned map BY MEASUREMENT — the poisoned map left CR-10's own shapes 1 and 2 silent"
  - "P24-D2: THE PRECEDENCE — a watched assembly beats a literal binding of the same name; both report, and unanalysable is the true one"
  - "P24-D3: `literalOf` made single-valued rather than any-binding-wins, because at its callers `undefined` already means REPORT"
  - "P24-D4: `REQUIREMENTS.md` and `STATE.md` deliberately NOT amended — wave 27 derives, wave 28 reconciles both in one move"
  - "P24-D5: `keyReceiver`'s step 3 deleted as unreachable rather than left standing beside the identical step 0"

patterns-established:
  - "A fixture the plan called a CONTROL is MEASURED before it is relied on; when it turns out silent, the discrepancy is titled into the fixture rather than absorbed"
  - "The mirror of a widening is asserted in the same commit as the widening, with the direction it errs in written into its own title"

requirements-completed: []

coverage:
  - id: D1
    description: "A name the walk watched being rebound to an outbound receiver name is treated as one, in the `let`, `var`, bare-assignment and global-key spellings"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through constStrings' WHOLE-FILE BINDINGS: a name REBOUND to a receiver name IS one — CR-10 shape 1 of 5"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through constStrings' WHOLE-FILE BINDINGS: the `var` spelling of the same rebinding — CR-10 shape 2 of 5"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through constStrings' WHOLE-FILE BINDINGS in GLOBAL-KEY position — CR-10 shape 3 of 5"
        status: pass
      - kind: other
        ref: "MA1 7 RED, MA2 2 RED — each restored, `git diff --exit-code` clean, each re-run green"
        status: pass
    human_judgment: false
  - id: D2
    description: "A `+=` that builds a string is an assembly; a `+=` that adds integers is still exempt"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through assembledNames' COMPOUND-ASSIGNMENT branch — CR-10 shape 4 of 5"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through isProvablyNumeric's guard on the COMPOUND-ASSIGNMENT branch: an INTEGER accumulator built with `+=` is an INDEX and stays quiet"
        status: pass
      - kind: other
        ref: "MB1 1 RED (shape 4 by title), restored, re-run green"
        status: pass
    human_judgment: false
  - id: D3
    description: "The precedence between a stale literal and a watched assembly is decided, implemented, asserted and written into the ordering docblock as step 0"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through assembledNames OVER constStrings — THE PRECEDENCE, settled"
        status: pass
      - kind: other
        ref: "MB2 1 RED (the precedence fixture by title), restored, re-run green"
        status: pass
    human_judgment: false
  - id: D4
    description: "The mirror shape has a fixture, its direction is disclosed, and the widening was measured to create NO new silence in any of the four positions where a name can now resolve differently"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through constStrings' WHOLE-FILE BINDINGS, ANY-BINDING-WINS — THE MIRROR, and it errs by OVER-approximating"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through ANY-BINDING-WINS and literalOf together: THE WIDENING CREATED NO NEW SILENCE — every mirror position REPORTS, measured in all four"
        status: pass
      - kind: other
        ref: "MA3 4 RED — the REJECTED poisoned-map mechanism swapped in; the mirror is green under MA1 and MA2 and is proven by MA3 alone"
        status: pass
    human_judgment: false
  - id: D5
    description: "The three falsified disclosures state what the branches do: boundary 2 per collector family, the assembly sentence, and the collector's covered-by-construction comment; the mechanism table gains one row per spelling closed plus the mirror"
    requirement: "CORE-11"
    verification:
      - kind: other
        ref: 'grep -c "over-approximates rather than under-approximates" packages/backend/src/outbound-prohibition.spec.ts -> 0 (exit 1)'
        status: pass
    human_judgment: false
  - id: D6
    description: "The real tree still reports ZERO over both SOURCE_ROOTS with the four measured-exempt sites confirmed quiet by name, after every widening"
    requirement: "CORE-11"
    verification:
      - kind: integration
        ref: "packages/backend/src/outbound-prohibition.spec.ts#<file> reaches no outbound surface (23 files, both roots) + the standalone probe reporting files=23 violations=0"
        status: pass
    human_judgment: false
  - id: D7
    description: "One narrowed residual, re-derived from the branches, byte-identical in the gate header and the tool-owned ledger, naming what is still open and who owns it"
    verification:
      - kind: other
        ref: "canon-in-header True, canon-in-entry-27 True after whitespace normalisation; windows fixed 26 / append / status -> exactly one OPEN entry on this gate file"
        status: pass
    human_judgment: false
  - id: D8
    description: "The green baseline is restored: 31 files / 1132 tests, typecheck / lint / knip clean, bundle at exactly one specifier"
    verification:
      - kind: other
        ref: "pnpm test (31 files, 1132 tests, 0 failures); typecheck/lint/knip exit 0; check:bundle -> 1 specifier: crypto"
        status: pass
    human_judgment: false

duration: 22 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 24: The stale first literal that shadowed every later rebinding Summary

**`constStrings` made a set-per-name written at both the declaration and the assignment branch, `keyReceiver` reporting if ANY binding names a receiver, `+=` read as the assembly it is, and the precedence between a stale literal and a watched assembly settled — with the mirror measured, the rejected mechanism measured beside it, and the residual re-derived from the branches into two byte-identical surfaces.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-24T11:47:00Z
- **Completed:** 2026-08-24T12:09:00Z
- **Tasks:** 3
- **Files modified:** 2

## SEVERITY, STATED PLAINLY AND NOT INFLATED

**Nothing leaks.** No outbound call exists in any non-spec source under either root, the gate runs green over the real tree (23 files, **ZERO** violations) inside a 1132-test suite, and `pnpm check:bundle` reports the shipped bundle's entire import set as **one specifier, `crypto`**. CR-10 was a **prospective blindness in a test-only gate** — a class of source the gate would not have caught had anyone written it — not an exposure. No sentence in this summary may be read otherwise.

**This closes CR-10's INSTANCE and not the CLASS.** It is the **sixth** consecutive round in which a bound was authored rather than derived and turned out false. **Wave 27 owns the derivation**; this plan does not borrow that claim.

## Accomplishments

- `constStrings` became `Map<string, Set<string>>` written at BOTH collector branches, so a name's current binding stops being invisible behind its first
- `keyReceiver` step 1 widened to ANY-BINDING-WINS and step 0 added as THE PRECEDENCE; step 3 deleted as unreachable rather than left standing
- the compound-assignment branch added under the same numeric guard the poisoning arm beside it uses — the WR-17 argument, one directory over
- the three falsified disclosures corrected, boundary 2's error direction restated PER COLLECTOR FAMILY, and the mechanism table given 13 new rows
- **five** separate mutation proofs, each RED by title, each restored `git diff --exit-code` clean, each re-run green
- the residual authored ONCE and rendered programmatically into both surfaces, with identity ASSERTED rather than eyeballed

---

## 1. THE SIX SHAPES AND THE FOUR CONTROLS — EXECUTED BEFORE AND AFTER, PASTED, NOT ASSERTED IN PROSE

Executed through `auditSource` from a throwaway probe spec (deleted before any commit; never committed).

| id | source | BEFORE | AFTER |
|---|---|---|---|
| S1 | `let k = "harmless";`<br>`k = "requests";`<br>`sdk[k].send(req);` | `[]` | `["outbound-send"]` |
| S2 | `let k = "harmless";`<br>`k = "req" + "uests";`<br>`sdk[k].send(req);` | `[]` | `["outbound-unanalysable"]` |
| S3 | `let k = "req";`<br>`k += "uests";`<br>`sdk[k].send(req);` | `[]` | `["outbound-unanalysable"]` |
| S4 | `var k = "harmless";`<br>`k = "requests";`<br>`sdk[k].send(req);` | `[]` | `["outbound-send"]` |
| S5 | `let k = "harmless";`<br>`k = "fetch";`<br>`globalThis[k](url);` | `[]` | `["outbound-unanalysable"]` |
| S6 | `let m = "harmless";`<br>`m = "send";`<br>`sdk.requests[m](req);` | `["outbound-send"]` | `["outbound-unanalysable"]` |
| S7 | `let s = "harmless";`<br>`s = "caido:http";`<br>`await import(s);` | `[]` | `["outbound-unanalysable"]` |

**S6 and S7 were not enumerated by CR-10 and not predicted by this plan.** They were found by listing every caller of the string map before touching it, which is why task 1 required the call sites be enumerated first. S7 is the sharper of the two: a dynamic import of the forbidden specifier, **silent**, because the specifier was rebound after its declaration.

### The four controls — and the plan's prediction for one of them was WRONG

| id | source | BEFORE | AFTER |
|---|---|---|---|
| C1 | `let k;`<br>`k = "requests";`<br>`sdk[k].send(req);` | **`[]`** | `["outbound-send"]` |
| C2 | `let k;`<br>`k = "req" + "uests";`<br>`sdk[k].send(req);` | `["outbound-unanalysable"]` | `["outbound-unanalysable"]` |
| C3 | `let k = 1;`<br>`k = "req" + "uests";`<br>`sdk[k].send(req);` | `["outbound-unanalysable"]` | `["outbound-unanalysable"]` |
| C4 | `let k;`<br>`k = "fetch";`<br>`globalThis[k](url);` | `["outbound-unanalysable"]` | `["outbound-fetch"]` |

**THE DISCREPANCY, RECORDED RATHER THAN ABSORBED.** `01-REVIEW.md`'s CR-10 entry and this plan's own objective both list **C1 as a control that already reported `["outbound-send"]`**, offered as the proof that S1–S5 were genuine misses rather than a fixture artefact. **Measured before any change: C1 reported `[]`.**

The reason is one line stronger than CR-10 said. It was not that a stale literal beat a later one — **the assignment branch never wrote `constStrings` at all**. A name bound to a string only by assignment resolved to nothing whatever. So the branch carried *two* defects: the stale-literal shadow (S1, S4 — real, and pinned) and a missing write entirely (C1). Both close with the same assignment-side write. The control is now a fixture in its own right, titled with the discrepancy so no later reader re-derives the plan's version of it:

```
through constStrings' ASSIGNMENT-SIDE WRITE: the control that proves the misses were real —
  `let k; k = "requests"; sdk[k].send(req)` — AND THE PLAN'S OWN PREDICTION FOR IT WAS WRONG
```

C4's improvement (`outbound-unanalysable` → `outbound-fetch`) is the same write seen from the other side: the walk can now name the surface instead of only knowing something was hidden.

### Step 1's case, intact — and the mirror

```
STEP1  const r = "requests"; sdk[r].send(req)      BEFORE ["outbound-send"]   AFTER ["outbound-send"]
                                                   and NOT "outbound-unanalysable", asserted explicitly

MIRROR let k = "requests"; k = "harmless";
       sdk[k].send(req)                            BEFORE ["outbound-send"]   AFTER ["outbound-send"]

NUM    let i = 0; i += 1; MIGRATIONS[i]            BEFORE []                  AFTER []
NUM    let i = 0; i += 1; sdk[i]                   BEFORE []                  AFTER []
PREC   let k = "requests"; k = a + b;
       sdk[k].send(req)                            BEFORE ["outbound-send"]   AFTER ["outbound-unanalysable"]
```

## 2. THE MECHANISM DECISION, WITH THE MEASUREMENT THAT DECIDED IT

**Two mechanisms were honest and BOTH WERE IMPLEMENTED AND RUN** rather than one implemented and the other reasoned about.

**IMPLEMENTED — ANY-BINDING-WINS.** `constStrings` holds every literal a name is bound to anywhere in the file; `keyReceiver` reports if any of them names a receiver.

**REJECTED — A POISONED MAP**, in the shape of `poisonedNumericNames` beside it: a name with more than one binding stops resolving through the map and falls through to the branches below. It was implemented, run against the same probe, and its full result is below.

| shape | ANY-BINDING-WINS (implemented) | POISONED MAP (rejected) |
|---|---|---|
| S1 `let k = "harmless"; k = "requests"` | `["outbound-send"]` | **`[]`** |
| S4 `var` spelling | `["outbound-send"]` | **`[]`** |
| S2 assignment-assembly | `["outbound-unanalysable"]` | `["outbound-unanalysable"]` |
| S5 global-key | `["outbound-unanalysable"]` | `["outbound-unanalysable"]` |
| C1 `let k; k = "requests"` | `["outbound-send"]` | `["outbound-send"]` |
| STEP1 `const r = "requests"` | `["outbound-send"]` | `["outbound-send"]` |
| **MIRROR** `let k = "requests"; k = "harmless"` | `["outbound-send"]` | **`[]`** |
| the four measured-exempt sites | `[]` | `[]` |
| **real tree, both `SOURCE_ROOTS`** | **23 files, 0 violations** | **23 files, 0 violations** |

**THE MEASUREMENT DECIDED IT AND IT WAS NOT CLOSE.** The poisoned map leaves **CR-10's own shapes 1 and 2 silent** — the shapes the finding is about — and **creates a NEW silence at the mirror**. Any-binding-wins closes both and errs by over-approximating, which is the direction every other set in this pass already errs in and the direction boundary 2 already claimed. Both mechanisms produce a zero real tree, so the real tree did not discriminate between them; the shapes did.

**`literalOf` DOES use the rejected mechanism, deliberately, and that is not an inconsistency.** Member names and module specifiers need one string, not a set, so `literalOf` answers `undefined` for a name with two bindings. **At those call sites `undefined` already means COULD NOT READ, which REPORTS.** The single principle: *each caller's unknown-direction is the reporting direction.* Any-binding-wins is that direction at the key resolver; single-valued-or-unreadable is that direction at the member and specifier resolvers.

## 3. EVERY OTHER CALLER OF THE STRING MAP, ENUMERATED FIRST AND RE-RUN BY BLOCK NAME

Call sites of `literalOf`, listed before the map was touched:

```
:1345  memberName            — the member name a property or element access reads
:1622  the static import / `export ... from` rule
:1794  the dynamic `import()` / `require()` specifier rule
       (the collect-pass declaration site was rewritten to use `bindString` directly)
```

Each block re-run and shown passing, by name:

```
✓ the gate's own failure paths > outbound-import fires on all four specifier forms
✓ the gate's own failure paths > outbound-import does NOT fire on any other specifier, crypto included
✓ the gate's own failure paths > outbound-send does NOT fire on sdk.requests.get — the reload the consumer depends on
✓ any non-allowlisted member of a positively identified receiver > outbound-send fires on sendRaw
✓ any non-allowlisted member of a positively identified receiver > outbound-send fires on replay
✓ any non-allowlisted member of a positively identified receiver > outbound-send fires on .call
✓ any non-allowlisted member of a positively identified receiver > outbound-send fires on .apply
✓ any non-allowlisted member of a positively identified receiver > outbound-send fires on Reflect.apply
✓ any non-allowlisted member of a positively identified receiver > outbound-send fires on an aliased member
✓ any non-allowlisted member of a positively identified receiver > outbound-send fires on a member returned from an arrow
✓ any non-allowlisted member of a positively identified receiver > outbound-send fires on a computed member
✓ a module specifier the walk can resolve, and one it cannot > outbound-import fires on a specifier resolved one hop
✓ a module specifier the walk can resolve, and one it cannot > outbound-unanalysable fires on an ASSEMBLED specifier
✓ a module specifier the walk can resolve, and one it cannot > outbound-unanalysable fires on a computed member of an identified receiver
✓ a receiver the walk cannot read is REPORTED, not dropped > through constStrings: a key bound ONE HOP to a LITERAL is a NAMED receiver, not an unreadable one
```

**THE ALLOWLIST WAS THE ONE THAT COULD HAVE GOT THIS GATE DELETED**, and it holds because two bindings of the *same* string are one entry in the set:

```
let m = "get"; m = "get";    sdk.requests[m](id)   => []                          ← resolves, allowlist answers
let m = "get"; m = "getRaw"; sdk.requests[m](id)   => ["outbound-unanalysable"]   ← two strings, will not guess
```

Both pinned by `through literalOf's SINGLE-VALUED contract: THE ALLOWLIST STILL HOLDS`.

## 4. FIVE SEPARATE MUTATION PROOFS — EXECUTED, NEVER COMBINED

Each mutation applied **alone** against the **committed** file, run, restored with `git checkout --`, cross-checked with `git diff --exit-code`, re-run green.

### MA1 — the assignment-side `constStrings` write removed

```
      const assignedString = unwrap(node.right);
      if (ts.isStringLiteralLike(assignedString)) {
        bindString(node.left.text, assignedString.text);
      }
→     // MUTATION MA1

      Tests  7 failed | 190 passed (197)
```

RED, by title and message:

```
× through literalOf's SINGLE-VALUED contract: a SPECIFIER rebound mid-file no longer resolves to
  the stale first literal — `let s = "harmless"; s = "caido:http"; await import(s)` — A WIDENING
  THIS PLAN MEASURED RATHER THAN PREDICTED
    AssertionError: expected [] to include 'outbound-unanalysable'
× through literalOf's SINGLE-VALUED contract: a MEMBER name rebound mid-file becomes UNREADABLE
  rather than resolving to the stale first literal — `let m = "harmless"; m = "send"; sdk.requests[m](req)`
    AssertionError: expected [ 'outbound-send' ] to include 'outbound-unanalysable'
× through constStrings' WHOLE-FILE BINDINGS: a name REBOUND to a receiver name IS one —
  `let k = "harmless"; k = "requests"; sdk[k].send(req)` — CR-10 shape 1 of 5
    AssertionError: expected [] to include 'outbound-send'
× through constStrings' WHOLE-FILE BINDINGS: the `var` spelling of the same rebinding — CR-10 shape 2 of 5
    AssertionError: expected [] to include 'outbound-send'
× through constStrings' ASSIGNMENT-SIDE WRITE: the control that proves the misses were real —
  `let k; k = "requests"; sdk[k].send(req)` — AND THE PLAN'S OWN PREDICTION FOR IT WAS WRONG
    AssertionError: expected [] to include 'outbound-send'
× through literalOf's SINGLE-VALUED contract: THE ALLOWLIST STILL HOLDS — a name bound TWICE TO
  THE SAME STRING resolves, so `sdk.requests.get` stays quiet
    AssertionError: expected [] to include 'outbound-unanalysable'
× through ANY-BINDING-WINS and literalOf together: THE WIDENING CREATED NO NEW SILENCE — every
  mirror position REPORTS, measured in all four
    AssertionError: expected [ 'outbound-fetch', 'outbound-fetch' ] to include 'outbound-unanalysable'

MA1 RESTORE: git diff --exit-code CLEAN (exit 0)
re-run:       Tests  197 passed (197)
```

### MA2 — the resolution rule reverted to FIRST-BINDING-WINS

```
    for (const literal of literalsOf(key)) {
      if (RECEIVERS.has(literal)) return literal;      →   return RECEIVERS.has(literal) ? literal : undefined;
    }

      Tests  2 failed | 195 passed (197)

× through constStrings' WHOLE-FILE BINDINGS: a name REBOUND to a receiver name IS one — CR-10 shape 1 of 5
    AssertionError: expected [] to include 'outbound-send'
× through constStrings' WHOLE-FILE BINDINGS: the `var` spelling of the same rebinding — CR-10 shape 2 of 5
    AssertionError: expected [] to include 'outbound-send'

MA2 RESTORE: git diff --exit-code CLEAN (exit 0)
re-run:       Tests  197 passed (197)
```

### MA3 — step 1 swapped to the REJECTED poisoned-map mechanism

Not a branch removal: the alternative mechanism itself, run as a mutation. **This is the only mutation that reaches the mirror.**

```
      Tests  4 failed | 193 passed (197)

× through constStrings' WHOLE-FILE BINDINGS: a name REBOUND to a receiver name IS one — CR-10 shape 1 of 5
    AssertionError: expected [] to include 'outbound-send'
× through constStrings' WHOLE-FILE BINDINGS: the `var` spelling of the same rebinding — CR-10 shape 2 of 5
    AssertionError: expected [] to include 'outbound-send'
× through constStrings' WHOLE-FILE BINDINGS, ANY-BINDING-WINS — THE MIRROR, and it errs by
  OVER-approximating: `let k = "requests"; k = "harmless"; sdk[k].send(req)` REPORTS
    AssertionError: expected [] to include 'outbound-send'
× through ANY-BINDING-WINS and literalOf together: THE WIDENING CREATED NO NEW SILENCE — every
  mirror position REPORTS, measured in all four
    AssertionError: expected [] to not deeply equal []

MA3 RESTORE: git diff --exit-code CLEAN (exit 0)
re-run:       Tests  197 passed (197)
```

### MB1 — the compound-assignment branch removed

```
      Tests  1 failed | 196 passed (197)

× through assembledNames' COMPOUND-ASSIGNMENT branch: a `+=` that builds a string is an ASSEMBLY —
  `let k = "req"; k += "uests"; sdk[k].send(req)` — CR-10 shape 4 of 5
    AssertionError: expected [] to include 'outbound-unanalysable'

MB1 RESTORE: git diff --exit-code CLEAN (exit 0)
re-run:       Tests  197 passed (197)
```

### MB2 — the precedence inverted (step 0 moved BELOW step 1)

```
      Tests  1 failed | 196 passed (197)

× through assembledNames OVER constStrings — THE PRECEDENCE, settled: a WATCHED ASSEMBLY beats a
  LITERAL BINDING of the same name — `let k = "requests"; k = a + b; sdk[k].send(req)` is
  UNANALYSABLE, not send
    AssertionError: expected [ 'outbound-send' ] to include 'outbound-unanalysable'

MB2 RESTORE: git diff --exit-code CLEAN (exit 0)
re-run:       Tests  197 passed (197)
```

### The check the plan required be stated explicitly rather than omitted

**Three cases stayed GREEN under a mutation they sit beside, and each is recorded on its own terms rather than left to look covered.**

| case | green under | proven instead by | why |
|---|---|---|---|
| `… ANY-BINDING-WINS — THE MIRROR …` | **MA1 and MA2** | **MA3** | Its receiver-naming literal is the DECLARATION binding, so removing the assignment write (MA1) and taking the FIRST binding (MA2) both leave it reporting. Only swapping in the rejected mechanism silences it. **MEASURED NON-EVIDENCE under MA1 and MA2, named as such.** |
| `… COMPOUND-ASSIGNMENT branch … CR-10 shape 4 of 5` | **MB2** | **MB1** | `k`'s literal is `"req"`, which names no receiver, so the literal loop finds nothing and falls through to the assembled check whichever order the two run in. **MEASURED NON-EVIDENCE under MB2.** |
| `… assembledNames' ASSIGNMENT branch … CR-10 shape 5 of 5` | **MB1 and MB2** | **MA2** | Same reason — `"harmless"` names no receiver. This shape flipped from `[]` at **task 1**, when the literal lookup stopped early-returning, **not** at the compound-assignment branch it sits beside. Its fixture says so in its own body. |

Every other new positive case went RED under the mutation it sits beside.

## 5. THE REAL TREE, ZERO, WITH THE FOUR MEASURED-EXEMPT SITES NAMED — AND THE MIRROR DIRECTION MEASURED RATHER THAN ARGUED

```
$ (standalone probe over both SOURCE_ROOTS, after every widening)
REALTREE files=23 violations=0
```

23 files — `packages/backend/src` (14) and `packages/engine/src` (9) — every one `✓ … reaches no outbound surface` in the gate's own per-file cases. The four measured-exempt sites, quiet **by name**:

| site | fixture | result |
|---|---|---|
| `compat.ts`'s `at()` `cur[key]` (a `for…of` binding) | `compat.ts's documented dotted-path walk reports ZERO violations` | ✓ `[]` |
| `compat.ts:141`'s `ctx[root]` (a PARAMETER) | `through NOTHING, and that is residual (b): an ordinary DYNAMIC lookup is not an assembled key and stays quiet` | ✓ `[]` |
| `observations.ts`'s `segments[i]` | `array indexing through a name reports ZERO violations` | ✓ `[]` |
| `MIGRATIONS[MIGRATIONS.length - 1]` | same case (held quiet by `isProvablyNumeric`) | ✓ `[]` |

### THE MIRROR DIRECTION, MEASURED — AND IT IS NARROWER THAN THE PLAN EXPECTED, SAID PLAINLY

The plan required the widening direction be measured, not argued quiet. Both halves were:

```
MIRROR files=23  multiBoundStringNames=0  assignmentStringBindings=1  plusEqualsSites=34
  ASSIGNED-STRING packages/backend/src/telemetry.ts: name = ""
```

**`multiBoundStringNames = 0` across all 23 shipped files.** The any-binding-wins widening — the one with a mirror, the one that could over-report — **reaches nothing at all on the real tree today.** Exactly one site exercises the new assignment-side write (`name = ""` in `telemetry.ts`) and it is not used as a key. That is a smaller footprint than the plan anticipated and it is stated rather than dressed up: **the zero is real, and it is partly real because there is currently nothing there to fire on.** The widening's value is prospective, which is also what CR-10 was.

**The `+=` branch is the half that DOES fire on shipped code**, and it is named by name:

```
PLUSEQ packages/backend/src/store/retention.ts: violations=[]
   marked assembled: examined += cascade.examined      deleted += cascade.deleted
   marked assembled: deleted += await remove(DELETE_OBSERVATION_SQL, [ …    (×4 await forms)
   marked assembled: examined += obs.examined          deleted += obs.deleted
   marked assembled: examined += ana.examined          deleted += ana.deleted
PLUSEQ packages/backend/src/telemetry.ts: violations=[]
   marked assembled: out += text.slice(i, j)           out += redactPathToken(text.slice(i, j))
PLUSEQ packages/engine/src/chunker.ts: violations=[]
   marked assembled: start += step
```

`examined`, `deleted`, `out` and `start` now enter `assembledNames` on the real tree. **All three files still report `[]`**, because none of those names is ever used as a receiver key. (The probe's numeric test is a deliberate over-approximation of `isProvablyNumeric` — it recognises only numeric literals and `.length`/`.size` — so the list above is an upper bound on what the branch marks. The zero is the gate's own answer, not the probe's.)

## 6. THE THREE FALSIFIED DISCLOSURES, CORRECTED — AND THE GREP THAT PROVES ONE IS GONE

```
$ grep -n "over-approximates rather than under-approximates" packages/backend/src/outbound-prohibition.spec.ts
(no lines; exit 1)
```

### (1) Boundary 2's approximation-direction sentence, replaced PER COLLECTOR FAMILY

The superseded clause is **named, not requoted** — THE SINGLE-DIRECTION CLAIM — with its exact words preserved in `01-REVIEW.md`'s CR-10 entry. The replacement:

> WHICH DIRECTION THAT ERRS IN IS A FACT ABOUT EACH COLLECTOR FAMILY AND NOT ABOUT THE GATE, CORRECTED 2026-08-24 (CR-10). […] It was HALF TRUE, which is why it survived five rounds: true of the ALIAS families, false of the STRING maps, and a reader could not tell because one sentence covered both. The two families, each with the direction it errs in:
>   **ALIAS FAMILIES** — `receiverAliases`, `fetchAliases`, `navigatorAliases`, `globalAliases`, `globalThisAliases`, `unreadableAliases`. Grown from the LIVE set at both the declaration and the assignment branch, never removed from. They **OVER-approximate**: a name bound to an outbound receiver anywhere in the file is treated as one everywhere in it, inner scopes and later rebindings included.
>   **STRING MAPS** — `constStrings` and `assembledNames`. These **UNDER-approximated** until 2026-08-24. `constStrings` held ONE literal per name, written only at the declaration branch, and `keyReceiver` read it FIRST — so `let k = "harmless"; k = "requests"; sdk[k].send(req)` resolved `k` to "harmless" forever and was SILENT, which is exactly the direction the old sentence told a reader could not happen. As of CR-10 `constStrings` holds EVERY literal a name is bound to anywhere in the file and reports if ANY of them names a receiver, so this family now errs in the SAME direction as the alias families and the old sentence has become true of it — but it is stated per family rather than for the gate, because the next collector added here can err either way and one sentence covering both is what let this one sit under a disclosure claiming it could not happen.
>   **`literalOf`, THE SINGLE-VALUED READER, IS THE ONE DELIBERATE EXCEPTION AND IT ALSO ERRS TOWARD REPORTING.** […] `undefined` means COULD NOT READ at every one of its call sites, which reports. Both families and the reader now err toward reporting; they simply do it by different mechanisms.

### (2) The assembly sentence in the receiver-key list

> — a key bound ONE HOP to an assembly, in EVERY spelling — `+`, a template, `.join("")`, an opaque call — and through a declaration, an assignment, or a COMPOUND ASSIGNMENT (`assembledNames`).
>   CORRECTED AND WIDENED 2026-08-24 (CR-10), READ OFF THE BRANCHES RATHER THAN OFF THIS PARAGRAPH. The clause here said "either a declaration or an assignment" and the collector's own comment said the assignment spelling was covered by construction. BOTH WERE FALSE IN THE SAME WAY: the assignment branch's `assembledNames` write did exist, but `keyReceiver` consulted the stale declaration literal FIRST and returned before reaching it — so the assignment spelling was defeated by ANY preceding string initializer. It is reachable now because that lookup no longer early-returns and because a WATCHED ASSEMBLY takes precedence over a literal binding of the same name.
>   AND `+=` WAS NEVER READ AT ALL, in a paragraph claiming every spelling. […] The sibling gate one directory away closed exactly this gap for exactly this reason at WR-17.

### (3) The collector comment at the assignment branch

> THE CLAIM THAT STOOD HERE WAS FALSE AND IS CORRECTED 2026-08-24 (CR-10). It said this spelling was "covered by construction rather than by a second edit". **The WRITE was covered by construction; the READ was not.** `keyReceiver` consulted the declaration's stale literal first and returned, so this line was UNREACHABLE for any name whose declaration carried a string initializer — `let k = "harmless"; k = "req"+"uests"; sdk[k].send(req)` was silent while `let k; k = "req"+"uests"` reported. Covered by construction is a claim about the whole path, and this branch only ever owned half of it.

### (4) The ordering docblock, which now carries THE PRECEDENCE beside its four steps

> **0.** a key the walk WATCHED BEING ASSEMBLED — at a declaration, an assignment, or a COMPOUND ASSIGNMENT — is UNREADABLE (`assembledNames`). **THE PRECEDENCE**, added 2026-08-24 (CR-10), and it exists only because step 1 widened: a name can now carry BOTH a literal binding and a watched assembly, and something has to win. **THE ASSEMBLY DOES.** A name the walk watched being reassembled is a name whose literal answer stopped being trustworthy, so an assembly it SAW is stronger evidence than a literal it saw earlier — the site reports `outbound-unanalysable` rather than naming a surface off a string the file has since rebuilt. Both directions REPORT; this one is the true one. **It is numbered 0 rather than renumbering the four below**, because "step 1" names the literal lookup in three other docblocks and in the fixtures, and silently renumbering a load-bearing order is its own small version of this file's recurring defect.
> **STEP 1's CASE IS UNTOUCHED BY IT:** `const r = "requests"` is never in `assembledNames`, so a single-hop literal binding still reports `outbound-send` and is still never downgraded.

**Step 3 was deleted, not left standing.** Once step 0 ran first it tested the identical condition and was unreachable. The deletion is recorded in place, because two identical tests in one function is how a reader learns to stop trusting the order the docblock calls load-bearing.

## 7. THE MECHANISM TABLE'S ADDED ROWS

The table enumerated the `const` spellings and said nothing about `let`, nothing about a rebinding and nothing about a compound assignment — so a reader had no row to check this round's shapes against, which is exactly the substitution the table exists to prevent, running one spelling out. Thirteen rows added:

```
SPELLING (in receiver-key position)      RESOLVED BY          REPORTS
-------------------------------------    -----------------    ---------------------
let k = "requests"; sdk[k]               constStrings         outbound-send
let k = "harmless";                      constStrings,        outbound-send
  k = "requests"; sdk[k]                   ANY-BINDING-WINS
var k = "harmless";                      constStrings,        outbound-send
  k = "requests"; sdk[k]                   ANY-BINDING-WINS
let k; k = "requests"; sdk[k]            constStrings'        outbound-send
                                           ASSIGNMENT WRITE
let k = "requests";                      constStrings,        outbound-send
  k = "harmless"; sdk[k]                   ANY-BINDING-WINS   — THE MIRROR, and it
                                                                errs by OVER-approximating
let k = "harmless";                      assembledNames'      outbound-unanalysable
  k = "req"+"uests"; sdk[k]                ASSIGNMENT branch,
                                           reachable at last
let k = "req"; k += "uests"; sdk[k]      assembledNames'      outbound-unanalysable
                                           COMPOUND-ASSIGNMENT
                                           branch
let k = "requests"; k = a + b; sdk[k]    assembledNames       outbound-unanalysable
                                           OVER constStrings  — THE PRECEDENCE
let i = 0; i += 1; sdk[i]                isProvablyNumeric    [] — an index, not a name
let k = "harmless"; k = "fetch";         constStrings via     outbound-unanalysable
  globalThis[k](url)                       literalOf, which     (two bindings — the walk
                                           is SINGLE-VALUED     will not pick one)
let k; k = "fetch"; globalThis[k](url)   constStrings via     outbound-fetch
                                           literalOf            (one binding — resolves)
let m = "harmless"; m = "send";          literalOf returns    outbound-unanalysable
  sdk.requests[m](req)                     undefined
let s = "harmless"; s = "caido:http";    literalOf returns    outbound-unanalysable
  await import(s)                          undefined
```

## 8. THE MIRROR CREATED NO NEW SILENCE — CHECKED RATHER THAN OMITTED

Task 3 required this be stated explicitly whichever way it landed. **It created none.** Every position where a name can now resolve differently was probed:

```
receiver-key  let k = "requests"; k = "harmless"; sdk[k].send(req)     => ["outbound-send"]
member        let m = "send";     m = "harmless"; sdk.requests[m](req) => ["outbound-unanalysable"]
specifier     let s = "caido:http"; s = "harmless"; await import(s)    => ["outbound-unanalysable"]
global-key    let k = "fetch";    k = "harmless"; globalThis[k](url)   => ["outbound-unanalysable"]
alias grown   let k = "fetch"; k = "harmless"; const f = globalThis[k];
              f(u)                                                     => ["outbound-unanalysable"]
navigator     let k = "navigator"; k = "harmless"; const n = globalThis[k];
              n.sendBeacon(u, d)                                       => ["outbound-unanalysable"]
eval          let k = "eval"; k = "harmless"; const e = globalThis[k];
              e("x")                                                   => ["outbound-unanalysable"]
receiver expr let k = "requests"; k = "harmless"; const r = sdk[k];
              r.send(req)                                              => ["outbound-send"]
```

The **rule NAME** changes — a named surface becomes `outbound-unanalysable` where the walk read two strings and will not pick one — but **nothing went quiet.** Pinned by `through ANY-BINDING-WINS and literalOf together: THE WIDENING CREATED NO NEW SILENCE — every mirror position REPORTS, measured in all four`.

## 9. THE NARROWED RESIDUAL — RE-DERIVED FROM THE BRANCHES, AND THE SAME WORDS IN BOTH SURFACES

**THE RE-DERIVATION METHOD, RECORDED.** The residual was read off `keyReceiver`'s four steps plus step 0, the two `constStrings` write sites (the declaration branch and the assignment branch, both through `bindString`), the three `assembledNames` write sites (declaration, assignment, compound assignment) and `literalOf` itself. It was **not** narrowed from the previous paragraph — that is the method plan 01-21 recorded as having enumerated two classes while missing a third in the same function.

**AND IT WAS AUTHORED ONCE.** The canonical text was written to a single file and both surfaces were rendered from it programmatically, so "the same words rather than two paraphrases" is a machine check rather than a promise:

```
canonical text length: 5248
gate header contains the canonical residual VERBATIM :  True
WINDOWS entry 27 contains the canonical residual VERBATIM: True

--- first 320 chars, gate header ---
CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the
phrase is not an absolute and must not be read as one. RE-DERIVED FOR WAVE 24 BY READING THE
BRANCHES: `keyReceiver`'s four steps, the two `constStrings` write sites, the three `assembledNames`
write sites and `literalOf`

--- same span, WINDOWS entry 27 ---
CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the
phrase is not an absolute and must not be read as one. RE-DERIVED FOR WAVE 24 BY READING THE
BRANCHES: `keyReceiver`'s four steps, the two `constStrings` write sites, the three `assembledNames`
write sites and `literalOf`
```

The residual in full, as it stands in both:

> CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. RE-DERIVED FOR WAVE 24 BY READING THE BRANCHES: `keyReceiver`'s four steps, the two `constStrings` write sites, the three `assembledNames` write sites and `literalOf` itself — not by narrowing the previous paragraph, which is the method plan 01-21 recorded as having enumerated two classes while missing a third sitting in the same function.
>
> A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, provided each link's DECLARATION appears after the declaration of the name it is grown from. UNCHANGED BY THIS WAVE. The mechanism is that `auditSource` runs `collect(sf)` to COMPLETION before `visit(sf)` begins, while every alias set is grown by consulting the LIVE set during that one collect pass — so a four-hop chain reports with the USE written ABOVE all four declarations and the use site's POSITION IS IRRELEVANT. What is silent is an INVERTED BINDING: `const b = a; const a = fetch; b(u)` reports nothing, wherever the read sits.
>
> A RECEIVER KEY RESOLVES ONE HOP, AND WHAT ONE HOP MEANS WIDENED IN WAVE 24. It resolves: a literal; a literal bound at a DECLARATION OR AN ASSIGNMENT, in the `const`, `let` and `var` spellings; a name REBOUND, because ANY binding of a name that names an outbound receiver now makes the key one, so `let k = "harmless"; k = "requests"; sdk[k].send(req)` reports where it was silent; an assembly inline; an assembly bound or assigned; AN ASSEMBLY ACCUMULATED WITH `+=`; a conditional; and a comma sequence. Where a name carries BOTH a literal binding and a watched assembly, THE ASSEMBLY WINS and the site reports `outbound-unanalysable` rather than naming a surface off a string the file has since rebuilt.
>
> `literalOf`, which resolves MEMBER NAMES and MODULE SPECIFIERS through that same map, IS SINGLE-VALUED: a name carrying more than one distinct binding answers "could not read", and "could not read" REPORTS at every one of its call sites. Measured in all four positions where a name can now resolve differently, THE WAVE-24 WIDENING CREATED NO NEW SILENCE — a named surface becomes `outbound-unanalysable` where the walk read two strings, and nothing went quiet. THE MIRROR of the widening, `let k = "requests"; k = "harmless"`, REPORTS: any-binding-wins OVER-approximates, which is the direction every other set in this pass already errs in. The rejected alternative — a POISONED map in the shape of `poisonedNumericNames` — was MEASURED and would have left CR-10's own shapes silent and created a new silence at the mirror.
>
> WHAT REMAINS SILENT, READ OFF THE BRANCHES: TWO HOPS OF KEY — `const a = "requests"; const b = a; sdk[b]` — because `constStrings` and `assembledNames` read the INITIALIZER'S SHAPE and never the live set, so a key cannot be grown from a name already in a set; a value crossing a FUNCTION BOUNDARY; a PARAMETER; a LOOP BINDING; and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was measured to change nothing except to re-poison ordinary `+` indexing.
>
> STILL OPEN AFTER THIS WAVE, EACH NAMED WITH THE WAVE THAT OWNS IT, because a residual that narrows without saying what is still open is the omission this round exists to stop: the CONDITIONAL RECEIVER IN CALL POSITION with its `??` and `||` twins — WAVE 25 (WR-27); the NESTED CONDITIONAL KEY — WAVE 25; the DESTRUCTURED KEY BINDING, `const { k } = o; sdk[k].send(req)` — WAVE 26 (IN-26). Wave 26 also owns `packages/backend/src/store/*`, `tests/pins.spec.ts` and `scripts/phase1/tracer-e2e.sh`.
>
> Every exemption here is preserved BY MEASUREMENT, re-run after each widening and again in wave 24: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name. The `+=` branch DOES fire on shipped code — it marks `examined` and `deleted` in `store/retention.ts`, `out` in `telemetry.ts` and `start` in `engine/src/chunker.ts` as assembled — and all four files still report ZERO, because none of those names is ever used as a receiver key. That is measured, not argued.
>
> WAVE 27 REPLACES THIS AUTHORED TEXT WITH ONE DERIVED FROM THE CODE. This wave closes CR-10's INSTANCE and does not close the class that produced it — an authored bound nobody re-derived — which is now SIX consecutive rounds. `REQUIREMENTS.md` and `STATE.md` are deliberately NOT amended in this wave: both carry an authored residual, wave 27 derives the replacement and wave 28 reconciles both ledgers to it in one move, and a fourth hand-authored copy would be another place the next drift can start. CORE-11's box stays `[ ]`; wave 28 owns the flip and only against the derived text. NOTHING LEAKED: CR-10 is a PROSPECTIVE BLINDNESS in a test-only gate, no outbound call exists in any non-spec source under either root, the gate runs green over the real tree inside a 1132-test suite, and `pnpm check:bundle` reports one specifier, `crypto`.

**The three superseded clauses are NAMED, never requoted** — THE SINGLE-DIRECTION CLAIM, THE EVERY-SPELLING CLAIM, THE COVERED-BY-CONSTRUCTION CLAIM — with their exact words preserved in `01-REVIEW.md`'s CR-10 entry, in `01-VERIFICATION.md`, and in the correction paragraphs at each of the three sites. **This is P23-D2's lesson applied on the first draft rather than after the criterion caught it.**

## 10. `WINDOWS.md` — CLOSED AND REPLACED THROUGH THE TOOL, NEVER HAND-EDITED

```
$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows fixed 26
ok=True open_count=18 waived_count=0 fixed_count=8 total_count=26
entry 26 status: fixed resolved_at=2026-08-24T12:04:10.683Z

$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows append --kind deviation --phase 01 \
    --file packages/backend/src/outbound-prohibition.spec.ts --description "<the canonical residual>"
ok=True open_count=19 waived_count=0 fixed_count=8 total_count=27
new entry id: 27 status: open

$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows status
open_count=19  waived_count=0  fixed_count=8  total_count=27

  id=13  status=fixed   Accepted residual T-01-51: a value crossing a function boundary or more than o ...
  id=20  status=fixed   WR-19 narrowed from every-non-reducing-key to ASSEMBLED-KEY; a merely dynamic  ...
  id=22  status=fixed   THE RECEIVER-KEY RESIDUAL AS OF WAVE 18 (plan 01-18, CR-08) — SUPERSEDED IN WA ...
  id=23  status=fixed   THE FINAL RESIDUAL AFTER WAVE 19 (plan 01-19, closing WR-23, WR-26 and IN-20). ...
  id=25  status=fixed   THE FINAL RESIDUAL AFTER WAVE 23 (plan 01-23, closing CR-09). SUPERSEDES ENTRY ...
  id=26  status=fixed   THE FINAL RESIDUAL AFTER WAVE 23 (plan 01-23, closing CR-09). SUPERSEDES ENTRY ...
  id=27  status=open    THE FINAL RESIDUAL AFTER WAVE 24 (plan 01-24, closing CR-10). SUPERSEDES ENTRY ...

OPEN entries on this gate file: 1  -> [(27, 'open')]
```

**No tool call was refused.** `WINDOWS.md` was **not hand-edited**: the frontmatter counters and the JSON block were written together on every call, and the figures match `windows status`'s own report exactly —

```
$ head -8 .planning/WINDOWS.md
---
schema_version: 1
open_count: 19
waived_count: 0
fixed_count: 8
total_count: 27
last_updated: 2026-08-24T12:04:22.861Z
---

$ git diff .planning/WINDOWS.md | grep -E "^[-+](fixed_count|total_count|last_updated)"
-fixed_count: 7
-total_count: 26
-last_updated: 2026-08-24T11:36:40.870Z
+fixed_count: 8
+total_count: 27
+last_updated: 2026-08-24T12:04:22.861Z
```

## 11. WHY `REQUIREMENTS.md` AND `STATE.md` ARE DELIBERATELY UNTOUCHED IN THIS WAVE

```
$ git diff --exit-code .planning/REQUIREMENTS.md .planning/STATE.md
(exit 0)
```

Both ledgers carry an **authored** residual today, and both are wrong by exactly one wave as of this commit — they still state the wave-23 bound. That is a known, bounded, one-wave staleness, and correcting it here would cost more than it buys: wave 27 replaces the authored text with a **derived** one and wave 28 reconciles both requirement-tier ledgers to it **in a single move**. Hand-writing a fourth copy of a paragraph in wave 24 would put another hand-copied sentence into circulation eleven days after the fifth one turned out false, and **every copy is a place the next drift can start** — that is the mechanism by which this file has now produced six consecutive false bounds. The two surfaces that DO carry this wave's narrowing are the gate header (the code, which wins any disagreement) and the tool-owned ledger (which the ship gate reads). The requirement-tier ledgers are one wave behind on purpose, and this paragraph is the record of that choice. **CORE-11's box stays `[ ]`** — wave 28 owns the flip, and only against wave 27's derived text.

## 12. WHAT THIS ROUND HAS AND HAS NOT DONE

**CR-10 is closed.** The class that produced it — an authored bound nobody re-derived — **is not closed by closing it.** This is the sixth consecutive round in which a bound stated in prose was falsified by executing it. **Wave 27 owns the derivation** that makes the class detectable rather than reviewer-detectable, and both this summary and the appended ledger entry name it in one clause rather than borrowing its claim.

## Task Commits

1. **Task 1: the whole-file string collectors, the mechanism chosen by measurement** — `482fc26` (test)
2. **Task 2: `+=` as an assembly, THE PRECEDENCE, and the three falsified sentences** — `c151ce3` (test)
3. **Task 3: the re-derived residual in the gate header and the tool-owned ledger** — `e657cc9` (docs)

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — `constStrings` set-per-name, the assignment-side string write, the compound-assignment branch, `literalsOf`/`bindString`, `literalOf` made single-valued, `keyReceiver` step 0 + widened step 1 + dead step 3 removed, three corrected disclosures, 13 new table rows, 14 new fixtures (183 → 197 tests in this file)
- `.planning/WINDOWS.md` — entry 26 closed, entry 27 appended (tool-owned throughout)

## Decisions Made

- **P24-D1 — ANY-BINDING-WINS was chosen over a POISONED MAP by measurement, and both were run.** The plan offered two honest mechanisms and required the choice be measured. It was not close: the poisoned map leaves CR-10's own shapes 1 and 2 silent and creates a new silence at the mirror, while any-binding-wins closes both and errs by over-approximating — the direction every other set in this pass already errs in. Both produce a zero real tree, so the real tree did not discriminate; the shapes did. The rejected mechanism is preserved as mutation MA3, which is the only mutation that reaches the mirror fixture.
- **P24-D2 — THE PRECEDENCE: a watched assembly beats a literal binding of the same name.** Task 1 created a case that could not exist before — a name carrying both. Both directions report, so the choice is between naming a surface off a string the file has since rebuilt and admitting the walk can no longer read the site. The second is true. Written into the ordering docblock as step 0 and pinned by one fixture whose title names both mechanisms.
- **P24-D3 — `literalOf` uses the REJECTED mechanism, deliberately.** Member names and specifiers need one string, not a set, and at those call sites `undefined` already means COULD NOT READ, which reports. One principle covers both: *each caller's unknown-direction is the reporting direction.* Asserted by the allowlist fixture, which is the one that decides whether this is safe or gate-deleting.
- **P24-D4 — `REQUIREMENTS.md` and `STATE.md` are not amended.** Section 11.
- **P24-D5 — `keyReceiver`'s step 3 was deleted, not left standing.** Once step 0 tested the identical condition first, step 3 was unreachable. Two identical tests in one function is how a reader learns to stop trusting an order the docblock calls load-bearing. The deletion is recorded in place; the behaviour is unchanged and asserted by the same fixtures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's control C1 did not report, and the reason was a second defect in the same branch**

- **Found during:** Task 1, by measuring the controls before relying on them
- **Issue:** Both `01-REVIEW.md`'s CR-10 entry and this plan's objective state that `let k; k = "requests"; sdk[k].send(req)` reports `["outbound-send"]`, offered as the control proving S1–S5 were genuine misses. Measured, it reported `[]`. The assignment branch never wrote `constStrings` **at all** — so it was not only that a stale literal beat a later one, but that a name bound to a string solely by assignment resolved to nothing whatever.
- **Fix:** The assignment-side `bindString` write closes both. The control became a fixture titled with the discrepancy so no later reader re-derives the plan's version of it.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** MA1 drives it RED by title; the before/after pair is pasted in section 1
- **Committed in:** `482fc26`

**2. [Rule 2 - Missing critical] Two callers of the string map were changed by the fix and neither was enumerated by CR-10**

- **Found during:** Task 1, by listing every `literalOf` call site before touching the map (a task requirement)
- **Issue:** `memberName` and the dynamic-import specifier rule both resolve through `constStrings`. The member case silently changed direction (`outbound-send` → `outbound-unanalysable`, both reporting) and the **specifier case was a live miss**: `let s = "harmless"; s = "caido:http"; await import(s)` reported `[]` — a dynamic import of the forbidden specifier, silent, because it was rebound after its declaration.
- **Fix:** `literalOf` made single-valued so both err toward reporting; both pinned by fixtures naming the contract; the allowlist twin asserted still quiet.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** Both RED under MA1 by title; the allowlist twin asserted in its own fixture
- **Committed in:** `482fc26`

**3. [Rule 1 - Bug] `keyReceiver`'s step 3 became unreachable dead code**

- **Found during:** Task 3, reading the resolver to re-derive the residual from the branches
- **Issue:** Task 2's step 0 tests the identical condition as CR-08's step 3 and returns first, leaving two identical tests in one function whose docblock calls the order load-bearing.
- **Fix:** Deleted, with the deletion and its reason recorded in place. Behaviour unchanged.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** 197/197 green before and after; MB1 and MB2 re-run against the final file
- **Committed in:** `e657cc9`

---

**Total deviations:** 3 auto-fixed (2 × Rule 1 - Bug, 1 × Rule 2 - Missing critical)
**Impact on plan:** All three were found by executing the plan's own required checks rather than by extending scope — measuring the controls, enumerating the call sites, and re-deriving from the branches. Deviation 2 closed a live silent miss that the finding did not enumerate. No scope creep: no file outside `files_modified` was touched.

## Issues Encountered

**A prettier violation blocked `pnpm lint` on the new fixture titles** (single-quoted strings containing both `'` and `"`). Fixed with `pnpm exec eslint --fix`; no assertion, title text or comment was changed by the formatter. Note that `npx eslint --fix` fails on this repo (`EBADDEVENGINES` — the root `devEngines` block pins pnpm); `pnpm exec` is the working form.

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired component was introduced; every fixture added asserts a measured rule list.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for **wave 25 (WR-27)** — the conditional receiver in call position and its `??` / `||` twins, plus the nested conditional key. Both are named in the residual with their owning wave.

Carried forward, unchanged and named rather than implied:

- **The class is still open.** Six consecutive rounds of authored-not-derived bounds. Wave 27 owns the derivation.
- **`REQUIREMENTS.md` and `STATE.md` are one wave stale by design** (section 11). Wave 28 reconciles both to the derived text.
- **CORE-11's box is `[ ]`**, deliberately. Wave 28 owns the flip.
- **STORE-03 / STORE-07** ledger collisions remain deferred with their owner (`WINDOWS.md` entry 17, still open).

## Final Gate Results

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1132 passed (1132)

$ pnpm typecheck    exit 0
$ pnpm lint         exit 0
$ pnpm knip         exit 0

$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto

$ git diff --exit-code packages/backend/src/store packages/engine/src tests/ scripts/        exit 0
$ git diff --exit-code .planning/REQUIREMENTS.md .planning/STATE.md                          exit 0
$ git diff --exit-code 01-01..01-24-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md        exit 0
$ grep -c "over-approximates rather than under-approximates" <gate file>                     0 (exit 1)
```

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*

## Self-Check: PASSED

All modified files exist on disk; all four commits (`482fc26`, `c151ce3`, `e657cc9`, `f1f99d1`) are present in `git log --oneline --all`. Every `<acceptance_criteria>` from all three tasks was re-run against the final committed file, including the five mutation proofs, each restored `git diff --exit-code` clean. The plan-level `<verification>` list was executed in full; its results are in the Final Gate Results section above.
