---
phase: 01-skeleton-persistence-compatibility
plan: 23
subsystem: testing
tags: [typescript-ast, static-analysis, security-gate, outbound-prohibition, CR-09]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "the CORE-11 outbound gate and the four artifacts that copy its residual (plans 01-09, 01-12, 01-16, 01-18, 01-19)"
provides:
  - "The gate's alias bound restated from `collect`/`visit` in all five in-file locations: a chain resolves to ANY DEPTH provided each link's DECLARATION follows the declaration of the name it is grown from, and the use site's position is irrelevant"
  - "The `:2798` chain fixture split into a binding-order half and a read-position half, each sensitive to the variable its title names, plus a three-case discrimination"
  - "All seven CR-09 shapes pinned, each under the resolver family that resolves it"
  - "An inline `FALSIFIED 2026-08-24 (CR-09)` marker at the falsified clause in BOTH requirement-tier ledgers, under one grep-able token"
  - "`WINDOWS.md` entry 23 closed through the tool and replaced with a corrected residual"
affects: [wave 24 CR-10, wave 25 WR-27, wave 26 store/pins/tracer, wave 27 derivation, wave 28 CORE-11 flip]

actuals:
  tokens: 41000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A fixture pair that varies ONE variable per half — one holds the read fixed and inverts the bindings, the other holds the bindings in dependency order and moves the read"
    - "An inline FALSIFIED marker INSERTED beside a falsified clause rather than a rewrite of it, under one token shared by every ledger"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "P23-D1: the two requirement-tier ledgers are treated IDENTICALLY — the same inline marker token in both — because the asymmetry an earlier draft proposed rested on a reading convention, and this round exists because a sentence propagated by being read out of order"
  - "P23-D2: `WINDOWS.md` entry 25 (this correction's own first draft) QUOTED the superseded wording instead of naming it, and was closed through the tool and superseded by entry 26 rather than hand-edited"
  - "P23-D3: CORE-11's box stays `[ ]` — wave 28 owns the flip and only against wave 27's DERIVED residual"

patterns-established:
  - "A correction paragraph NAMES the clause it supersedes (THE READ-POSITION BOUND) and cites where its exact words are preserved, rather than quoting it — so the removal is grep-checkable"
  - "A silence no mutation can turn red is TITLED A MEASURED SILENCE and may never be cited as evidence that a rule holds"

requirements-completed: []

coverage:
  - id: D1
    description: "The gate states the bound it has: any depth in declaration-dependency order, with the use site's position irrelevant because the collect pass completes before the violation pass begins — in all five in-file locations"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through globalThisAliases: MOVING THE READ CHANGES NOTHING"
        status: pass
      - kind: other
        ref: 'grep -in "read BEFORE its root" packages/backend/src/outbound-prohibition.spec.ts (no lines)'
        status: pass
      - kind: other
        ref: 'grep -in "out of document order" packages/backend/src/outbound-prohibition.spec.ts (no lines)'
        status: pass
    human_judgment: false
  - id: D2
    description: "The chain fixture is two cases, one varying the bindings and one varying the read, each sensitive to the variable its title names"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through NOTHING: INVERTED BINDING ORDER is what silences an alias chain"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through NOTHING then globalThisAliases: THE THREE-CASE DISCRIMINATION"
        status: pass
    human_judgment: false
  - id: D3
    description: "All seven CR-09 shapes are pinned, each in the block of the mechanism that resolves it, each titled with that mechanism"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#CR-09 shape 3 of 7 / 4 of 7 / 5 of 7 / 6 of 7 / 7 of 7 plus the two fetch spellings in MOVING THE READ CHANGES NOTHING"
        status: pass
    human_judgment: false
  - id: D4
    description: "Seven separate mutation proofs — the collect/visit ordering, the globalThisAliases live-set consultation, and the five resolver-family growth sites — each observed RED by title, restored, re-run green"
    requirement: "CORE-11"
    verification:
      - kind: other
        ref: "M1 43 RED, M2 1 RED, MK1 6 RED, MK2 6 RED, MK3 7 RED, MK4 3 RED, MK5 6 RED; each `git diff --exit-code` clean after restore"
        status: pass
    human_judgment: false
  - id: D5
    description: "The falsified clause is marked-but-preserved under one grep-able token in BOTH REQUIREMENTS.md and STATE.md, with every prior correction and amendment surviving byte-identical apart from the insertion"
    verification:
      - kind: other
        ref: "grep -c 'FALSIFIED 2026-08-24 (CR-09)' returns 1 in each; four REQUIREMENTS.md anchor phrases each grep exactly once; both P9-D3 prior amendment openers each grep exactly once"
        status: pass
    human_judgment: false
  - id: D6
    description: "WINDOWS.md entry 23 closed through the tool and replaced with a corrected residual; exactly one OPEN entry on this gate file, and it does not carry the falsified clause"
    verification:
      - kind: other
        ref: "gsd-tools windows fixed 23 / fixed 25 / append / status — entries 13, 20, 22, 23, 25 fixed; 26 open"
        status: pass
    human_judgment: false
  - id: D7
    description: "The green baseline is restored: 31 files / 1117 tests, typecheck / lint / knip clean, bundle at exactly one specifier"
    verification:
      - kind: other
        ref: "pnpm test (31 files, 1117 tests, 0 failures); pnpm typecheck / lint / knip exit 0; pnpm check:bundle -> 1 specifier: crypto"
        status: pass
    human_judgment: false

duration: 15 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 23: The READ-position bound deleted and replaced with the `collect`/`visit` bound Summary

**The gate's alias bound restated from the code's two-pass structure — a chain resolves to any depth provided each link's DECLARATION follows the declaration it is grown from, the use site's position being irrelevant — written into all five in-file locations, both requirement-tier ledgers under one FALSIFIED marker, and a tool-closed WINDOWS entry; with the chain fixture split so one half varies the bindings and the other varies the read.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-24T11:23:00Z
- **Completed:** 2026-08-24T11:38:42Z
- **Tasks:** 3
- **Files modified:** 4

## SEVERITY, STATED PLAINLY AND NOT INFLATED

**Nothing leaks.** No outbound call exists in any non-spec source under either root, the gate runs green over the real tree (23 files, ZERO violations) inside a 1117-test suite, and `pnpm check:bundle` reports the shipped bundle's entire import set as **one specifier, `crypto`**. CR-09 was a false **disclosure** about a test-only gate, not an exposure. No sentence in this summary may be read otherwise.

**This closes CR-09's INSTANCE and not the CLASS.** It is the fifth consecutive round in which a bound was authored rather than derived and turned out false. **Wave 27 owns the derivation** that makes the class detectable rather than reviewer-detectable; this plan does not borrow that claim.

## Accomplishments

- The READ-position bound deleted from all five in-file locations and replaced, in one set of words, with the bound measured from `collect(sf)` at `:1521` completing before `visit(sf)` at `:1726`
- The `:2798` fixture split in two — an INVERTED BINDING ORDER half (measured silence) and a MOVING THE READ CHANGES NOTHING half (positive) — plus a three-case discrimination that separates binding order from read order
- All seven CR-09 shapes pinned, each under the resolver family that resolves it, each titled with that mechanism
- Seven separate mutation proofs executed, each RED by title, each restored with `git diff --exit-code` clean, each re-run green
- Both requirement-tier ledgers marked at the falsified clause under one identical token; `WINDOWS.md` entry 23 closed through the tool and replaced

---

## 1. THE SEVEN CR-09 SHAPES — EXECUTED, PASTED, NOT ASSERTED IN PROSE

Executed through `auditSource` from a throwaway probe spec (deleted before any commit; never committed):

```
A1 fn-wrapped read above binding               => ["outbound-fetch"]
A2 swapped-binding negation                    => []
B1 bare read above binding                     => ["outbound-fetch"]
B2 receiver key above binding                  => ["outbound-send"]
B3 assembled key above binding                 => ["outbound-unanalysable"]
B4 receiver alias above binding                => ["outbound-send"]
B5 navigator alias above binding               => ["outbound-beacon"]
B6 eval alias above binding                    => ["outbound-dynamic-code"]
C1 four-hop dep-order, use above all           => ["outbound-fetch"]
C2 four-hop dep-order, use last                => ["outbound-fetch"]
D1 inverted bindings, use LAST                 => []
D2 inverted bindings, use FIRST                => []
D3 dep-order bindings, use FIRST               => ["outbound-fetch"]
E1 :2798 body as-is                            => []
E2 :2798 wrapper removed, read last            => []
E3 :2798 wrapper kept, root bound directly     => ["outbound-fetch"]
```

Sources, in the same order:

| id | source | rule list |
|---|---|---|
| A1 | `function z() { return g.fetch(u); }\nconst g = globalThis;` | `["outbound-fetch"]` |
| A2 | `const g = a;\nconst a = globalThis;\ng.fetch(u);` | `[]` |
| B1 | `g.fetch(u);\nconst g = globalThis;` | `["outbound-fetch"]` |
| B2 | `sdk[r].send(req);\nconst r = "requests";` | `["outbound-send"]` |
| B3 | `sdk[k].send(req);\nconst k = "req"+"uests";` | `["outbound-unanalysable"]` |
| B4 | `s.send(req);\nconst s = sdk.requests;` | `["outbound-send"]` |
| B5 | `n.sendBeacon(u,d);\nconst n = navigator;` | `["outbound-beacon"]` |
| B6 | `e("x");\nconst e = eval;` | `["outbound-dynamic-code"]` |

**A1 is the tracer shape and A2 is its swapped-binding negation**, both required by task 1's first acceptance criterion, both pasted from a run.

**C1 is the four-hop resolving case**: `d(u);\nconst a = fetch;\nconst b = a;\nconst c = b;\nconst d = c;` → `["outbound-fetch"]`. The use is written **above all four declarations** and it still reports.

**D1/D2/D3 is the three-case discrimination**:

| case | source | result |
|---|---|---|
| inverted bindings, read LAST | `const b = a;\nconst a = fetch;\nb(u);` | `[]` |
| inverted bindings, read FIRST | `b(u);\nconst b = a;\nconst a = fetch;` | `[]` |
| dependency-ordered, read FIRST | `b(u);\nconst a = fetch;\nconst b = a;` | `["outbound-fetch"]` |

D1↔D2 holds the bindings inverted and moves the read: **no change** — the read is not the mechanism. D2↔D3 holds the read first and fixes the bindings: **silence flips to a report** — the bindings are the mechanism.

**E1/E2/E3 is the two-way diagnosis of the `:2798` fixture**, reproduced independently of the verifier. E1 is the fixture's body as it stood; E2 removes the wrapper and moves the read last (still `[]`); E3 keeps the wrapper and binds the root directly (reports). The title named the read; the body varied the bindings.

## 2. THE FIXTURE IS TWO CASES, NOT ONE — BOTH TITLES PASTED

```
through NOTHING: INVERTED BINDING ORDER is what silences an alias chain — the intermediate is
  declared before its root, so the root is not yet in the live set — A MEASURED SILENCE

through globalThisAliases: MOVING THE READ CHANGES NOTHING — a use written ABOVE its own
  binding REPORTS, because `collect(sf)` completes before `visit(sf)` begins
```

**Which variable each half varies:**

| half | held FIXED | VARIED | asserts |
|---|---|---|---|
| INVERTED BINDING ORDER | the read (asserted at both positions, so the read is provably not the variable) | the BINDING ORDER — `g` grown from `a` before `a` is in the set | `[]` — a measured silence |
| MOVING THE READ CHANGES NOTHING | the bindings, held in dependency order | the READ position — function-wrapped, bare-above, and above four declarations | `outbound-fetch` |

Plus the third case, which contains the discrimination in one place:

```
through NOTHING then globalThisAliases: THE THREE-CASE DISCRIMINATION that separates binding
  order from read order — inverted+last `[]`, inverted+first `[]`, dependency-ordered+first REPORTS
```

Neither half carries a title naming a variable its body is insensitive to. The transitivity fixture at `~:2772` was retitled from *"resolves to ANY depth in document order"* to *"resolves to ANY depth when each link's DECLARATION follows the declaration it is grown from"* so it agrees with the corrected sentence; **its body is unchanged and it still passes**, as does the two-hops-of-KEY fixture.

## 3. THE FALSIFIED CLAUSES ARE ABSENT FROM THE GATE FILE

```
$ grep -in "read BEFORE its root" packages/backend/src/outbound-prohibition.spec.ts
(no lines; exit 1)

$ grep -in "out of document order" packages/backend/src/outbound-prohibition.spec.ts
(no lines; exit 1)
```

Residual (b)'s middle exemption was **deleted, not softened**. The correction paragraphs **name** the superseded clause as THE READ-POSITION BOUND and cite `01-VERIFICATION.md`'s CR-09 entry as where its exact words are preserved; none of them requotes it.

## 4. THE MEASURED BOUND, FROM ALL FOUR IN-FILE LOCATIONS, UNDER ONE HEADING

### (1) residual (a)

> CORRECTED 2026-08-24 (CR-09), AND THE CORRECTION IS THE SAME DEFECT ONE LEVEL DEEPER. The sentence that stood here bounded the walk by WHERE A NAME IS READ — call it THE READ-POSITION BOUND; its exact superseded words are preserved in `01-VERIFICATION.md`'s CR-09 entry and are deliberately NOT requoted here, because a file that states a bound and also quotes its own false version of it gives a skimmer two sentences and no way to tell which is live. It was FALSE, and the mechanism says so in two lines of code: `auditSource` runs `collect(sf)` to COMPLETION and only THEN runs `visit(sf)`. Every alias set, every string map and every poisoned name is fully populated before the first violation is considered, so the position of a USE bounds NOTHING AT ALL — it may sit above every declaration in the file. WHAT ACTUALLY BOUNDS AN ALIAS CHAIN, measured: the DECLARATION ORDER OF THE BINDINGS RELATIVE TO EACH OTHER. Because each set is grown by consulting the LIVE set during that one document-order collect pass, a chain resolves to ANY DEPTH provided each link's DECLARATION appears after the declaration of the name it is grown from. `const a = fetch; const b = a; const c = b; const d = c;` reports at four hops with `d(u)` written ABOVE all four. Invert one link — `const b = a; const a = fetch;` — and it is silent whether `b(u)` is read first or last, because `a` is not yet in the set when `b`'s declaration is read. Asserted below as a three-case discrimination that varies the bindings and the read SEPARATELY, which is the pair the single case here before could not distinguish.

### (2) residual (b)

> (b) A KEY THE WALK NEVER SAW BOUND — a parameter, a `for…of` or `for(;;)` loop binding, or a name bound in another file — is NOT reported. NARROWED BY DELETION 2026-08-24 (CR-09): this list used to carry a third item between the loop binding and the other file, exempting a name by WHERE IN THE FILE its binding sits. That item was THE READ-POSITION BOUND wearing an exemption's clothes and it was false for the reason (a) now states — the collect pass finishes first, so a binding anywhere in the file is seen. It is deleted, not softened. The two items that remain are unchanged.

### (3) THE FINAL RESIDUAL, AFTER PLAN 01-23

> CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, provided each link's DECLARATION appears after the declaration of the name it is grown from. The MECHANISM is why, and it is stated here rather than only its consequence, because a consequence on its own is what the last four rounds each paraphrased wrongly: `auditSource` runs `collect(sf)` to COMPLETION and only then runs `visit(sf)`, and every alias set is grown by consulting the LIVE set during that one collect pass. So `const a = globalThis; const b = a; const g = b; g.fetch(u)` reports, the `sdk.requests` twin reports, and a four-hop chain reports with the USE written ABOVE all four declarations — the use site's POSITION IS IRRELEVANT. What is silent is an INVERTED BINDING: `const b = a; const a = fetch; b(u)` reports nothing, because `a` is not yet in the set when `b`'s declaration is read, and it stays silent wherever the read is placed. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary `+` indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19 and again in plan 01-23: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name.

### (4) `assembledNames`' docblock

> WHAT ACTUALLY BOUNDS A KEY, CORRECTED 2026-08-24 (CR-09). The paragraph that stood here bounded key resolution by where a declaration is read RELATIVE TO A USE — THE READ-POSITION BOUND, whose superseded words are preserved in `01-VERIFICATION.md`'s CR-09 entry and are not requoted here. It was false: `collect(sf)` completes before `visit(sf)` begins, so a binding anywhere in the file is seen from anywhere in the file, use sites included above it. `sdk[k].send(req);\nconst k = "req"+"uests";` reports. What DOES bound a key is the ONE HOP above, and the mechanism behind it is the mechanism that makes keys different from aliases: this collector and `constStrings` read the INITIALIZER'S SHAPE and never the live set, so a key cannot be grown from a name already in the set and therefore cannot chain — while every ALIAS set is grown FROM the live set and therefore chains to any depth. Bindings remain file-wide, which over-approximates (a name bound anywhere counts everywhere), which is the posture every other set in this pass already takes.

**All four state the MECHANISM** — `collect` completes before `visit`; the sets are grown from the live set — **and not only the consequence.**

## 5. THE SEVEN CR-09 SHAPES, EACH UNDER THE MECHANISM THAT RESOLVES IT

| # | fixture title | resolver family | rule asserted |
|---|---|---|---|
| 1, 2 | `through globalThisAliases: MOVING THE READ CHANGES NOTHING — a use written ABOVE its own binding REPORTS, because \`collect(sf)\` completes before \`visit(sf)\` begins` | `globalThisAliases` / `fetchAliases` | `outbound-fetch` |
| 3 | ``through constStrings: A USE ABOVE ITS OWN BINDING REPORTS — `sdk[r].send(req);` written before `const r = "requests";` — CR-09 shape 3 of 7`` | `constStrings` | `outbound-send` |
| 4 | ``through assembledNames: A USE ABOVE ITS OWN BINDING REPORTS — `sdk[k].send(req);` written before `const k = "req" + "uests";` — CR-09 shape 4 of 7`` | `assembledNames` | `outbound-unanalysable` |
| 5 | ``through receiverAliases: A USE ABOVE ITS OWN BINDING REPORTS — `s.send(req);` written before `const s = sdk.requests;` — CR-09 shape 5 of 7`` | `receiverAliases` | `outbound-send` |
| 6 | ``through navigatorAliases: A USE ABOVE ITS OWN BINDING REPORTS — `n.sendBeacon(u, d);` written before `const n = navigator;` — CR-09 shape 6 of 7`` | `navigatorAliases` | `outbound-beacon` |
| 7 | ``through globalAliases: A USE ABOVE ITS OWN BINDING REPORTS — `e("x");` written before `const e = eval;` — CR-09 shape 7 of 7`` | `globalAliases` | `outbound-dynamic-code` |

**A correction to the plan's own count, recorded rather than smoothed over.** Task 2's action text says task 1 landed one shape and six remain. Task 1's positive half landed **two** — both `fetch` spellings, the function-wrapped one (A1) and the bare one (B1) — so **five** remained, not six. The total is seven either way, and all seven are pinned.

Also added, per family:

```
through receiverAliases' TRANSITIVITY: FOUR HOPS in dependency order, with the use written ABOVE
  all four declarations, REPORTS
through NOTHING: the receiver chain's negation — ONE INVERTED LINK silences four hops, wherever
  the read sits — A MEASURED SILENCE
through NOTHING: the KEY contrast — TWO HOPS is still silent whichever side of the bindings the
  use sits on — A MEASURED SILENCE
through navigatorAliases' TRANSITIVITY vs its negation: dependency-ordered chain REPORTS, one
  inverted link is A MEASURED SILENCE
through globalAliases' TRANSITIVITY vs its negation: dependency-ordered chain REPORTS, one
  inverted link is A MEASURED SILENCE
```

**The key-versus-alias contrast is stated in ONE comment beside the key cases** and names both mechanisms:

> KEYS DO NOT CHAIN because `constStrings` and `assembledNames` read the INITIALIZER'S SHAPE — is this a string literal, is this an assembly — and never consult the live set. A key therefore cannot be grown from a name already in a set, so `const a = "requests"; const b = a; sdk[b]` is silent at two hops and always will be.
> ALIASES DO CHAIN because every alias set is grown BY CONSULTING THE LIVE SET (`isFetchExpression`, `isNavigatorReceiver`, `aliasedGlobalOf`, `isGlobalReceiver`, `initializerReceiver`), so each new binding can resolve from the previous one to any depth.
> And because `collect(sf)` runs to COMPLETION before `visit(sf)` begins, NEITHER of them is bounded by the position of a use.

## 6. SEVEN SEPARATE MUTATION PROOFS — EXECUTED, NEVER COMBINED

Each mutation was applied alone against the **committed** file, run, restored with `git checkout --`, cross-checked with `git diff --exit-code`, and re-run green.

### M1 — the collect/visit ordering (`visit(sf)` hoisted above `collect(sf)`)

```
  // MUTATION M1: visit runs BEFORE collect
  ...
  visit(sf);
  collect(sf);

      Tests  43 failed | 129 passed (172)
```

RED, by title and message, including every case this plan added on the positive side:

```
× through globalThisAliases: MOVING THE READ CHANGES NOTHING — a use written ABOVE its own
  binding REPORTS, because `collect(sf)` completes before `visit(sf)` begins
    AssertionError: expected [] to include 'outbound-fetch'
    ❯ outbound-prohibition.spec.ts:2882:7

× through NOTHING then globalThisAliases: THE THREE-CASE DISCRIMINATION that separates binding
  order from read order — inverted+last `[]`, inverted+first `[]`, dependency-ordered+first REPORTS
    AssertionError: expected [] to include 'outbound-fetch'
    ❯ outbound-prohibition.spec.ts:2905:62

× through globalThisAliases' TRANSITIVITY: an alias CHAIN resolves to ANY depth when each link's
  DECLARATION follows the declaration it is grown from
    AssertionError: expected [] to include 'outbound-fetch'
```

plus 40 others (`outbound-send fires through a RECEIVER ALIAS`, `outbound-net fires on sdk.net.connect…`, the whole `assembledNames` block, the six IN-20 `globalThisAliases` rows, …).

```
M1 RESTORE: git diff --exit-code CLEAN (exit 0)
re-run:       Tests  172 passed (172)
```

**MEASURED SILENCE under M1, recorded rather than smoothed:** `through NOTHING: INVERTED BINDING ORDER is what silences an alias chain …` stayed **GREEN**. That is what a measured silence is — a mutation that makes everything silent cannot turn a silence red. It is titled A MEASURED SILENCE and may not be cited as evidence that a rule holds.

### M2 — the live-set consultation removed from the `globalThisAliases` growth site

```
if (isGlobalReceiverIn(init, new Set<string>())) globalThisAliases.add(node.name.text);
// MUTATION M2: live-set consultation removed from this growth site

      Tests  1 failed | 171 passed (182 → 172 at this point)
```

```
× through globalThisAliases' TRANSITIVITY: an alias CHAIN resolves to ANY depth when each link's
  DECLARATION follows the declaration it is grown from — MEASURED, and not what residual (a) used to say
    AssertionError: expected [] to include 'outbound-fetch'
    ❯ outbound-prohibition.spec.ts:2831:7
       rulesOf("const a = globalThis;\nconst g = a;\nawait g.fetch(u);")

M2 RESTORE: git diff --exit-code CLEAN (exit 0)
re-run:       Tests  172 passed (172)
```

**MEASURED NON-EVIDENCE under M2, named as such:** the positive `MOVING THE READ CHANGES NOTHING` half stayed **GREEN**. Its first two assertions are one-hop `const g = globalThis`, which `GLOBAL_RECEIVERS` still answers without the live set; its third is a four-hop chain through `fetchAliases`, which M2 does not touch. That half is proven by M1, not by M2, and this is stated rather than left for a reader to assume the mutation covered it — exactly the correction wave 19 was forced to make about two of its own rows.

### MK1–MK5 — one per resolver family, five separate reverts

| id | growth site reverted | result | new CR-09 case RED? |
|---|---|---|---|
| MK1 | `constStrings.set(node.name.text, literal)` | 6 failed / 176 passed | **yes — shape 3** |
| MK2 | `assembledNames.add(node.name.text)` | 6 failed / 176 passed | **yes — shape 4** |
| MK3 | `receiverAliases.set(node.name.text, kind)` | 7 failed / 175 passed | **yes — shape 5 and the four-hop case** |
| MK4 | `if (isNavigatorReceiver(init)) navigatorAliases.add(...)` | 3 failed / 179 passed | **yes — shape 6 and its transitivity pair** |
| MK5 | `if (aliased !== undefined) globalAliases.set(...)` | 6 failed / 176 passed | **yes — shape 7 and its transitivity pair** |

Full RED lists, by title:

```
### MK1 — constStrings growth site
RED: previously MISSED — const r = "requests"; sdk[r].send(q) now reports
RED: fires on a receiver resolved through a single-hop const string
RED: outbound-send fires on a computed member
RED: outbound-import fires on a specifier resolved one hop
RED: through constStrings: a key bound ONE HOP to a LITERAL is a NAMED receiver, not an unreadable one
RED: through constStrings: A USE ABOVE ITS OWN BINDING REPORTS — `sdk[r].send(req);` written before `const r = "requests";` — CR-09 shape 3 of 7
MK1 RESTORE: git diff --exit-code CLEAN
re-run:       Tests  182 passed (182)

### MK2 — assembledNames declaration growth site
RED: through assembledNames: an assembled KEY survives no const — `const k = "req" + "uests"; sdk[k].send(req)`
RED: through assembledNames: every spelling of a bound assembly is unreadable — a `+` concatenation
RED: through assembledNames: every spelling of a bound assembly is unreadable — a TEMPLATE interpolation
RED: through assembledNames: every spelling of a bound assembly is unreadable — an ARRAY join
RED: through assembledNames: every spelling of a bound assembly is unreadable — an opaque CALL result
RED: through assembledNames: A USE ABOVE ITS OWN BINDING REPORTS — `sdk[k].send(req);` written before `const k = "req" + "uests";` — CR-09 shape 4 of 7
MK2 RESTORE: git diff --exit-code CLEAN
re-run:       Tests  182 passed (182)

### MK3 — receiverAliases declaration growth site
RED: outbound-send fires through a RECEIVER ALIAS
RED: outbound-net fires on sdk.net.connect and on any other method of that receiver
RED: control — const r = sdk.requests; r.send(q) is still caught
RED: fires on a CONDITIONAL initializer
RED: through receiverAliases: A USE ABOVE ITS OWN BINDING REPORTS — `s.send(req);` written before `const s = sdk.requests;` — CR-09 shape 5 of 7
RED: through receiverAliases' TRANSITIVITY: FOUR HOPS in dependency order, with the use written ABOVE all four declarations, REPORTS
RED: through globalThisAliases' TRANSITIVITY: an alias CHAIN resolves to ANY depth when each link's DECLARATION follows the declaration it is grown from
MK3 RESTORE: git diff --exit-code CLEAN
re-run:       Tests  182 passed (182)

### MK4 — navigatorAliases declaration growth site
RED: outbound-beacon fires on a one-hop alias of navigator
RED: through navigatorAliases: A USE ABOVE ITS OWN BINDING REPORTS — `n.sendBeacon(u, d);` written before `const n = navigator;` — CR-09 shape 6 of 7
RED: through navigatorAliases' TRANSITIVITY vs its negation: dependency-ordered chain REPORTS, one inverted link is A MEASURED SILENCE
MK4 RESTORE: git diff --exit-code CLEAN
re-run:       Tests  182 passed (182)

### MK5 — globalAliases declaration growth site
RED: through globalAliases plus globalNameOf, in the CALL rule: dynamic code survives no binding — the DECLARATION spelling — `const e = eval; e(s)`
RED: through globalAliases plus globalNameOf, in the `new` rule: `const F = Function; new F(...)` is a construction of Function
RED: through globalNameOf: a spelling the walk resolves is NAMED as an alias in the violation detail
RED: through globalAliases: A USE ABOVE ITS OWN BINDING REPORTS — `e("x");` written before `const e = eval;` — CR-09 shape 7 of 7
RED: through globalAliases' TRANSITIVITY vs its negation: dependency-ordered chain REPORTS, one inverted link is A MEASURED SILENCE
RED: through globalAliases plus globalNameOf, in the `new` rule: an outbound CONSTRUCTOR survives no binding — the DECLARATION spelling — `const W = WebSocket; new W(url)`
MK5 RESTORE: git diff --exit-code CLEAN
re-run:       Tests  182 passed (182)
```

### The check the plan required be stated explicitly rather than omitted

**Every new POSITIVE case went RED under the mutation it sits beside.** There is no new positive case that stayed green under its neighbouring family mutation, so there is nothing to retitle as measured non-evidence on that axis. The two exceptions above are recorded on their own terms and are of a different kind: the `INVERTED BINDING ORDER` half is a **measured silence** (green under M1 by construction), and the positive `MOVING THE READ` half is **measured non-evidence under M2 specifically** (proven by M1 instead, because M2 reaches only the chained growth of `globalThisAliases`).

### Cases no mutation could drive RED — titled as MEASURED SILENCES, with what was tried

| case | what was tried | outcome |
|---|---|---|
| `through NOTHING: INVERTED BINDING ORDER is what silences an alias chain …` | M1 (visit before collect), M2 (live-set consultation removed), MK1–MK5 | green throughout — a silence, not a bound. Titled A MEASURED SILENCE. |
| `through NOTHING: the receiver chain's negation — ONE INVERTED LINK silences four hops …` | MK3 and the six others | green throughout. Titled A MEASURED SILENCE. |
| `through NOTHING: the KEY contrast — TWO HOPS is still silent …` | MK1, MK2 and the five others | green throughout. Titled A MEASURED SILENCE. |

## 7. REAL-TREE RUN, ZERO, WITH THE FOUR MEASURED-EXEMPT SITES NAMED

```
$ pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts --reporter=verbose
real-tree files audited: 23   violations: 0
```

23 files over both `SOURCE_ROOTS` — `packages/backend/src` (14) and `packages/engine/src` (9) — every one `✓ … reaches no outbound surface`. The four measured-exempt sites, quiet **by name**:

| site | fixture | result |
|---|---|---|
| `compat.ts`'s `at()` `cur[key]` (a `for…of` binding) | `compat.ts's documented dotted-path walk reports ZERO violations` | ✓ `[]` |
| `compat.ts:141`'s `ctx[root]` (a PARAMETER) | `through NOTHING, and that is residual (b): an ordinary DYNAMIC lookup is not an assembled key and stays quiet` | ✓ `[]` |
| `observations.ts`'s `segments[i]` | same case, plus `array indexing through a name reports ZERO violations` | ✓ `[]` |
| `MIGRATIONS[MIGRATIONS.length - 1]` | same case (held quiet by `isProvablyNumeric`) | ✓ `[]` |

No rule changed in this plan, so the zero is the expected result; it is recorded either way.

## 8. THE TWO REQUIREMENT-TIER LEDGERS, MARKED IDENTICALLY

### `REQUIREMENTS.md` — the marked span, the falsified clause's own words intact beside it

```
FALSIFIED 2026-08-24 (CR-09) — the clause that begins here and ends at “no second pass” was
EXECUTED and DISPROVED; its words below are preserved byte-for-byte as the record of what was
believed, and the measured bound that replaces it is in the plan 01-23 correction at the end of
this entry.** A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in DOCUMENT ORDER:
`const a = globalThis; const b = a; const g = b; g.fetch(u)` reports and so does the
`sdk.requests` twin, while a chain read BEFORE its root is bound is SILENT, because there is no
symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly
in every spelling, a conditional, a comma …
```

### `STATE.md` — the same token, the same treatment

```
FALSIFIED 2026-08-24 (CR-09) — the clause that begins here and ends at “no second pass” was
EXECUTED and DISPROVED; its words below are preserved byte-for-byte as the record of what was
accepted and when, and the measured bound that replaces it is in the THIRD pointer amendment at
the end of this decision.** A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in
DOCUMENT ORDER: `const a = globalThis; const b = a; const g = b; g.fetch(u)` reports and so does
the `sdk.requests` twin, while a chain read BEFORE its root is bound is SILENT, because there is
no symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an
assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. O…
```

### One repository-wide grep finds every falsified clause

```
$ grep -c 'FALSIFIED 2026-08-24 (CR-09)' .planning/REQUIREMENTS.md
1
$ grep -c 'FALSIFIED 2026-08-24 (CR-09)' .planning/STATE.md
1
$ grep -rn --include='*.md' --include='*.ts' -F 'FALSIFIED 2026-08-24 (CR-09)' . --exclude-dir=node_modules --exclude-dir=.git
.planning/REQUIREMENTS.md
.planning/STATE.md
.planning/phases/01-skeleton-persistence-compatibility/01-23-PLAN.md   (×8 — the plan specifying the token)
```

**Both ledgers carry it.** A marker in one and not the other would have failed this criterion, and the asymmetry an earlier draft of this plan proposed was dropped for the reason recorded as **P23-D1** below.

### APPEND-NEVER-REWRITE, VERIFIED POSITIVELY

```
$ grep -Fc "CORRECTION 2026-08-22, plan 01-16:"                       .planning/REQUIREMENTS.md → 1
$ grep -Fc "CORRECTION 2026-08-24, plan 01-18:"                       .planning/REQUIREMENTS.md → 1
$ grep -Fc "CORRECTION 2026-08-24, plan 01-19:"                       .planning/REQUIREMENTS.md → 1
$ grep -Fc "reverted from \`[x]\` to \`[ ]\` at commit \`e7cc4b6\`"   .planning/REQUIREMENTS.md → 1
```

And in `STATE.md`, the two previous P9-D3 amendments plus the falsified clause's own words:

```
$ grep -Fc "POINTER AMENDMENT 2026-08-24 (gap-closure round 4, plan 01-18 task 3)"        → 1
$ grep -Fc "SECOND POINTER AMENDMENT 2026-08-24 (gap-closure round 4, plan 01-19 task 3)" → 1
$ grep -Fc "THIRD POINTER AMENDMENT 2026-08-24 (gap-closure round 5, plan 01-23 task 3)"  → 1
$ grep -Fc "while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass" → 1
```

The clause is **preserved beside the marker, not reworded**. The marker is an INSERTION; no prior word in either file was rewritten.

### CORE-11's box

```
$ grep -cE '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
1
$ grep -oE '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
- [ ] **CORE-11**
```

`[ ]`, deliberately, and this plan says why: `faca607` reverted it because the `[x]` had been flipped against the text CR-09 falsified. **Wave 28 owns the flip, and only against wave 27's derived residual.** This plan does not flip it and does not argue that it could be flipped.

### THE UNGUARDED LIMIT, NAMED

From the `STATE.md` third amendment, verbatim:

> THE UNGUARDED LIMIT, NAMED RATHER THAN LEFT IMPLICIT: from wave 27 onward the rule for `STATE.md` and `WINDOWS.md` is that they carry a POINTER and restate NO bound — and that rule is a PROHIBITION WITH NO MECHANICAL CHECK, because wave 27's byte comparison reaches only the gate header and `REQUIREMENTS.md`, so nothing stops a round-6 author writing a fresh bound into either history.

The same sentence appears in the `REQUIREMENTS.md` correction.

## 9. `WINDOWS.md` — CLOSED AND REPLACED THROUGH THE TOOL, NEVER HAND-EDITED

```
$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows fixed 23
ok=True open_count=18 fixed_count=6 total_count=24
entry 23 status: fixed

$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows append --kind deviation --phase 01 \
    --file packages/backend/src/outbound-prohibition.spec.ts --description "<corrected residual>"
ok=True open_count=19 waived_count=0 fixed_count=6 total_count=25
new entry id: 25 status: open
```

**A defect in this plan's own first draft, caught by its own acceptance criterion and corrected through the tool.** Entry 25's description **quoted** the superseded wording (`… an alias chain read BEFORE its root is bound is silent …`) instead of naming it, which put the falsified clause on an **open** entry — the very thing criterion 11 forbids, and the same restate-rather-than-name mistake the gate file's own rule exists to prevent. It was **not hand-edited**. It was closed through the tool and superseded:

```
$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows fixed 25
ok=True open_count=18 fixed_count=7 total_count=25
entry 25 status: fixed

$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows append --kind deviation --phase 01 \
    --file packages/backend/src/outbound-prohibition.spec.ts --description "<corrected, naming not quoting>"
ok=True open_count=19 waived_count=0 fixed_count=7 total_count=26
new entry id: 26 status: open
```

`status` afterwards:

```
$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows status
open_count=19  waived_count=0  fixed_count=7  total_count=26

  id=13  status=fixed   Accepted residual T-01-51: a value crossing a function boundary or more than one hop …
  id=20  status=fixed   WR-19 narrowed from every-non-reducing-key to ASSEMBLED-KEY …
  id=22  status=fixed   THE RECEIVER-KEY RESIDUAL AS OF WAVE 18 (plan 01-18, CR-08) …
  id=23  status=fixed   THE FINAL RESIDUAL AFTER WAVE 19 (plan 01-19, closing WR-23, WR-26 and IN-20) …
  id=25  status=fixed   THE FINAL RESIDUAL AFTER WAVE 23 (plan 01-23, closing CR-09) — first draft, superseded …
  id=26  status=open    THE FINAL RESIDUAL AFTER WAVE 23 (plan 01-23, closing CR-09) …

OPEN entries on this gate file: 1   → [(26, 'open')]
```

The falsified-clause grep, scoped as the criterion requires:

```
$ grep -in "read BEFORE its root" .planning/WINDOWS.md
40:| 23 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts | …
42:| 25 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts | …
317:    "description": "THE FINAL RESIDUAL AFTER WAVE 19 …
341:    "description": "THE FINAL RESIDUAL AFTER WAVE 23 … (first draft) …

entries carrying the falsified clause: [(23, 'fixed'), (25, 'fixed')]
any NON-fixed carrier: NONE
```

**Every line carrying the falsified clause belongs to a `fixed` entry. The one OPEN entry on this gate file (26) does not carry it.**

`WINDOWS.md` was **not hand-edited**: the frontmatter counters and the JSON block were written together by the tool on every call —

```
---
schema_version: 1
open_count: 19
waived_count: 0
fixed_count: 7
total_count: 26
last_updated: 2026-08-24T11:36:40.870Z
---
```

— and those figures match `windows status`'s own report exactly.

## 10. STORE-03 / STORE-07, AND `COVERAGE.md`

**STORE-03's and STORE-07's text-versus-usage ledger collisions remain DEFERRED WITH THEIR OWNER** — the operator, at the next requirements pass, by the STORE-01 → STORE-08 route (`WINDOWS.md` entry 17, still open). Nothing in this correction should be read as the ledger now being clean.

**`COVERAGE.md` was checked and is unchanged.** This is a gate-hardening round that changes no external-API capability surface; `git status --porcelain .planning/phases/01-skeleton-persistence-compatibility/COVERAGE.md` returns nothing.

## Task Commits

1. **Task 1: the corrected sentence in four in-file locations and the split fixture** — `181530f` (test)
2. **Task 1 formatting** — `ca0e485` (style — `eslint --fix` output only, no assertion or title changed)
3. **Task 2: the remaining five CR-09 shapes, depth and inversion pairs** — `af8dd5b` (test)
4. **Task 3: both ledgers marked, all four artifacts corrected, WINDOWS closed through the tool** — `f3d3a06` (docs)

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — the bound corrected in five locations, the chain fixture split, twelve new fixtures added (170 → 182 tests)
- `.planning/REQUIREMENTS.md` — inline FALSIFIED marker plus the plan 01-23 correction on CORE-11; box left `[ ]`
- `.planning/STATE.md` — the same marker at P9-D3's falsified clause plus a third pointer amendment
- `.planning/WINDOWS.md` — entries 23 and 25 closed, entry 26 appended (tool-owned throughout)

## Decisions Made

- **P23-D1 — the two ledgers are treated identically.** An earlier draft marked `REQUIREMENTS.md` and left `STATE.md` unmarked, on the reasoning that a decision log is read as a history in date order where the newest amendment is live by construction. That is a **reading convention**, and this round exists because a sentence propagated by being copied and read **out** of order across four artifacts — an argument that holds for one ledger holds for the other. The marker is an INSERTION and preserves the words exactly, so it costs append-never-rewrite nothing in either file; the asymmetry bought no protection it would otherwise lose. One token, one grep, both ledgers.
- **P23-D2 — `WINDOWS.md` entry 25 was superseded through the tool, not edited.** Its description quoted the clause it supersedes. Closing it via `windows fixed` and appending a corrected entry keeps the ledger's own tooling authoritative and leaves the mistake visible in the record; hand-editing the JSON block would have desynchronised the frontmatter counters and hidden the error.
- **P23-D3 — CORE-11's box stays `[ ]`.** Wave 28 owns the flip, and only against wave 27's derived residual. Flipping here would repeat the act `faca607` undid.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `WINDOWS.md` entry 25 carried the falsified clause on an OPEN entry**
- **Found during:** Task 3, by running the plan's own criterion (`grep -in "read BEFORE its root" .planning/WINDOWS.md` must return only `fixed` entries)
- **Issue:** The first appended replacement entry **quoted** the superseded wording rather than naming it, so an OPEN ledger entry carried the falsified clause — the exact defect the entry existed to remove
- **Fix:** `gsd-tools windows fixed 25`, then `gsd-tools windows append` with a description that **names** THE READ-POSITION BOUND and cites entries 23/25 and `01-VERIFICATION.md` for its exact words. No hand-editing.
- **Files modified:** `.planning/WINDOWS.md` (tool-written)
- **Verification:** `windows status` shows carriers `[(23, 'fixed'), (25, 'fixed')]`, non-fixed carriers `NONE`, one OPEN entry on the gate file
- **Committed in:** `f3d3a06`

**2. [Rule 3 - Blocking] Prettier violation on the split fixture blocked `pnpm lint`**
- **Found during:** Task 1 verification
- **Issue:** `pnpm lint` exited 1 on one `prettier/prettier` error in the new `INVERTED BINDING ORDER` half
- **Fix:** `pnpm exec eslint --fix` on that file — formatting only
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** `pnpm lint` exit 0; 172 tests still passing
- **Committed in:** `ca0e485`

**3. [Rule 1 - Bug] The transitivity fixture's title still named "document order" as the bound**
- **Found during:** Task 1
- **Issue:** `~:2772`'s title read *"resolves to ANY depth in document order"* — written in round 4 alongside the falsified bound and reading as a statement of it, so the gate file would still have carried the false claim in a fixture title after the five named locations were corrected (must_have truth 4: *"the gate file no longer contains the falsified clause anywhere"*)
- **Fix:** retitled to *"resolves to ANY depth when each link's DECLARATION follows the declaration it is grown from"*. **Body unchanged** — the plan requires that case stay as it is, and it does.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** the case still passes; it goes RED under MK3 and M2, so it is still mutation-anchored
- **Committed in:** `181530f`

**4. [Not a deviation — a correction to the plan's own arithmetic]** Task 2's action text says task 1 landed one shape and six remain. Task 1's positive half landed **two** (both `fetch` spellings), so **five** remained. All seven are pinned; the discrepancy is recorded rather than silently absorbed.

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking) + 1 recorded plan-arithmetic correction
**Impact on plan:** All three were required by the plan's own acceptance criteria or its must-have truths. No scope creep — no rule changed, no production source touched.

## Issues Encountered

None beyond the deviations above. The plan's prediction that the fixture split would need each half to isolate one variable was borne out by measurement: M1 drives the positive half RED and leaves the silence half GREEN, and M2 drives the transitivity case RED and leaves the positive half GREEN. Both asymmetries are recorded on their own terms.

## Final verification

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1117 passed (1117)
exit 0

$ pnpm typecheck   → exit 0
$ pnpm lint        → exit 0
$ pnpm knip        → exit 0

$ pnpm build:backend → exit 0
$ pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto
exit 0

$ git diff --exit-code packages/backend/src/store packages/engine/src tests/ scripts/
CLEAN (exit 0)

$ git diff --exit-code 01-01-PLAN.md … 01-22-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md
CLEAN (exit 0) — 22 plans + VERIFICATION + REVIEW + UAT byte-identical
```

Suite grew 1105 → 1117 across this wave (170 → 182 in the gate spec); 31 files throughout.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Wave 24 (CR-10)** may now narrow a residual that is true. `keyReceiver`'s literal-first ordering and `constStrings` are untouched by this plan.
- **Wave 25 (WR-27)** — `receiverKind`'s conditional handling — untouched.
- **Wave 26** — `packages/backend/src/store/*`, `tests/pins.spec.ts`, `scripts/phase1/tracer-e2e.sh` — untouched, verified by `git diff --exit-code`.
- **Wave 27** owns the derivation machinery and the byte comparison. Its comparison will reach the gate header and `REQUIREMENTS.md`; the fact that it reaches **neither** `STATE.md` **nor** `WINDOWS.md` is written down in both the `REQUIREMENTS.md` correction and the `STATE.md` amendment as an unguarded limit, so wave 27 can decide deliberately whether to widen it.
- **Wave 28** owns CORE-11's flip, against wave 27's derived residual. The box is `[ ]`.
- **Carried forward, open:** STORE-03 / STORE-07's ledger collisions (`WINDOWS.md` 17) and the corrected CORE-11 residual (`WINDOWS.md` 26).

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*
