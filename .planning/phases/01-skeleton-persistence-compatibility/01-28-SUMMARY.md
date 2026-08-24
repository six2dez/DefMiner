---
phase: 01-skeleton-persistence-compatibility
plan: 28
subsystem: testing
tags: [core-11, outbound-prohibition, derived-residual, discharge-table, requirements-ledger, vitest]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "wave 27's deriveResidual(RESOLVER_REGISTRY), the 38-row registry, and the two byte-compared surfaces the flip had to rest on"
  - phase: 01-skeleton-persistence-compatibility
    provides: "waves 23-26's closures — CR-09's binding-order correction, CR-10's whole-file string bindings, WR-27's operator collapse, IN-26's binding-pattern reads — four of which are discharge rows"
provides:
  - "An item-by-item discharge of CORE-11's own first sentence: 8 enumerated rows + 8 round-5 rows + 2 evidence rows, every probe executed in this session"
  - "A NAMED BLOCKING ROW rather than a deferral: `no global fetch by ANY RECEIVER or alias`, blocked by silence-operator-around-global-receiver"
  - "CORE-11's box left `[ ]` as the measured outcome, with a dated correction stating what makes this third checking different from both reverts"
  - "A measured discrepancy in the DERIVED text itself, recorded rather than absorbed: `(0, globalThis).fetch(url)` REPORTS, so that entry's `silent in every spelling` overreaches"
  - "A completion note in the gate header pointing at the discharge table and the generated span, restating no bound"
affects: [phase-01-verification, gap-closure-round-6, core-11]

actuals:
  tokens: 9500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A conditional flip whose automated verify is state-agnostic, so the honest `[ ]` cannot fail its own gate"
    - "A discharge row is three columns of evidence — executed probe + rule id, fixture title, and the summary that watched that fixture fail — never a paraphrase"
    - "An OPEN AND UNOWNED silence in the derived block is an unclosed finding, not a bound"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "The box stays `[ ]`. Seven of the eight enumerated rows discharged; the global-fetch row did not, because `(ok && globalThis).fetch(url)` and four twins report NOTHING while the SDK twins of the identical operator class report `outbound-send`."
  - "That silence is decisive rather than a judgement call: it is the ONE entry of the derived block's seven labelled OPEN AND UNOWNED rather than carried as residual (a), (b) or (b2), and plan 01-18 held this same box open over the structurally identical `const e = eval; e(s)`."
  - "The same silence blocks a SECOND enumerated clause, `no navigator.sendBeacon`: `(ok && navigator).sendBeacon(u, d)` reports nothing."
  - "The two byte comparisons were run and observed GREEN BEFORE the box was examined, not after — the ordering `faca607` existed to force."
  - "No mutation was planted and no rule, fixture, resolver or registry row was touched; the entire gate-file diff is one comment above the sentinel."

patterns-established:
  - "State-agnostic task verify + condition-guarded acceptance criteria: the honest outcome passes its own gate"
  - "Anchor-grep proof of append-never-rewrite across two ledgers before either is committed"

requirements-completed: []

coverage:
  - id: D1
    description: "CORE-11's first sentence discharged item by item — 8 enumerated surfaces, each with an executed probe, the rule identifier it produced, the fixture title that asserts it, and the plan+summary that watched that fixture fail"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "auditSource probe harness, 46 shapes, output pasted in §2 of this SUMMARY"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts — 262/262"
        status: pass
    human_judgment: false
  - id: D2
    description: "The blocking row identified and named: `no global fetch by ANY RECEIVER or alias` (and `no navigator.sendBeacon`), blocked by silence-operator-around-global-receiver"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "blocker probe, 10 shapes incl. SDK counter-probes, output pasted in §4"
        status: pass
    human_judgment: false
  - id: D3
    description: "CORE-11's box left `[ ]` with a dated correction binding `in any spelling`, naming both reverts, stating the limits of a derived residual, and naming STORE-03/STORE-07 as still deferred"
    requirement: "CORE-11"
    verification:
      - kind: other
        ref: "grep -c '^- \\[ \\] \\*\\*CORE-11\\*\\*' .planning/REQUIREMENTS.md -> 1; grep -cE '^- \\[[ x]\\] \\*\\*CORE-11\\*\\*' -> 1"
        status: pass
    human_judgment: true
    rationale: "Whether an OPEN AND UNOWNED silence on an enumerated clause should hold the box open is the exact call two reverts were about. The evidence is mechanical; the ruling is a human's. Verification must confirm the reading rather than inherit it."
  - id: D4
    description: "A measured discrepancy inside the machine-owned derived text, recorded and not fixed here: the OPEN AND UNOWNED entry's prose says an operator around a global receiver is silent `in every spelling`, and `(0, globalThis).fetch(url)` REPORTS outbound-fetch"
    verification:
      - kind: unit
        ref: "blocker probe B5, output pasted in §4"
        status: pass
    human_judgment: true
    rationale: "Correcting it means editing a registry row's prose, which wave 28 is forbidden to touch. Round 6 must own it; a verifier has to decide whether it is a new finding or an amendment to the existing entry."
  - id: D5
    description: "Both dated histories point at the discharge without restating a bound; the machine-owned span is unchanged and append-never-rewrite is proven positively"
    verification:
      - kind: other
        ref: "anchor greps (5 REQUIREMENTS.md, 5 STATE.md) each returning 1; git diff --numstat = 1 line each; gate-header byte comparison green"
        status: pass
    human_judgment: false

duration: 8 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 28: CORE-11's Item-by-Item Discharge Summary

**A named blocking row was found and the box was left `[ ]`: seven of CORE-11's eight enumerated surfaces
discharged against executed evidence, and the eighth — `no global fetch by ANY RECEIVER or alias` — did not,
because `(ok && globalThis).fetch(url)` and four twins report NOTHING while the SDK twins of the identical
operator class report `outbound-send`, and that silence is the one entry of the derived block's seven that
the block itself labels OPEN AND UNOWNED.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-24T13:59:00Z
- **Completed:** 2026-08-24T14:06:56Z
- **Tasks:** 2
- **Files modified:** 4

## 1. THE ORDERING — the byte comparisons ran GREEN BEFORE the box was examined

This is stated first because it is the ordering `faca607` existed to force, and a flip (or a hold) recorded
before it is a decision against an unverified sentence.

```
$ pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts -t "byte for byte"
 RUN  v4.1.11 /Users/six2dez/Tools/DefMiner

 ✓ packages/backend/src/outbound-prohibition.spec.ts (262 tests | 260 skipped) 2ms

 Test Files  1 passed (1)
      Tests  2 passed | 260 skipped (262)
```

Two comparisons, both green: the gate header's span and `.planning/REQUIREMENTS.md`'s span each equal
`deriveResidual(RESOLVER_REGISTRY)` byte for byte. Run at 15:59:05, before any file in this plan was touched.

## 2. THE DISCHARGE TABLE — CORE-11's first sentence, item by item

**Executed** is `auditSource("probe.ts", src).map(v => v.rule)`, run in **this session** through a transient
probe harness (deleted before any commit; `git status --porcelain packages/` clean afterwards, pasted in §6).
No rule identifier below is quoted from an earlier summary. **Observed failing in** names the plan AND the
summary that records the mutation run in which that fixture was watched going RED.

| # | Surface CORE-11 names | Probe executed here | Reports | Fixture that asserts it | Observed failing in | Verdict |
|---|---|---|---|---|---|---|
| 1 | `caido:http` fetch | `import { RequestSpec } from "caido:http";` / `await import("caido:http");` | `["outbound-import"]` (both) | `outbound-import fires on all four specifier forms` | **01-12**, `01-12-SUMMARY.md` §3 mutation 2 family — a `caido:http` import planted in a real shipped module, red with file+rule+reason, reverted | **DISCHARGED** |
| 2 | `sdk.requests.send` **in any spelling** | `sdk.requests.send(req)` / `sdk["requests"]["send"](req)` / `const { requests } = sdk; requests.send(req)` | `["outbound-send"]` (all three) | `outbound-send fires on the direct call`; `outbound-send fires on the element-access form`; `outbound-send fires through a RECEIVER ALIAS`; `outbound-send fires on a DESTRUCTURED method` | **01-12**, `01-12-SUMMARY.md` §3 mutation 1 (destructured form into real `hooks/passive.ts`); **01-18**, `01-18-SUMMARY.md` §3 mutations 1–3 (`assembledNames`, conditional resolver, comma arm — each reverted separately, each RED) | **DISCHARGED** (bounded — see §3) |
| 3 | any method of an identified `requests`/`net` receiver outside `get`/`query`/`inScope` | `sdk.requests.post(req)` / `sdk.net.connect(host)` / control `sdk.requests.get(id)` | `["outbound-send"]` / `["outbound-net"]` / `[]` | `outbound-net fires on sdk.net.connect and on any other method of that receiver`; `outbound-send does NOT fire on sdk.requests.get — the reload the consumer depends on` | **01-12**, `01-12-SUMMARY.md` §3 mutation 3 (`sdk.requests.sendRaw(req)` into the real `ingest/consumer.ts`) | **DISCHARGED** |
| 4 | global `fetch` **by any receiver or alias** | `fetch(url)` / `globalThis.fetch(url)` / `const f = fetch; f(url)` | `["outbound-fetch"]` (all three) | `outbound-fetch fires on a call to the bare global`; `through globalThisAliases: …` | **01-12**, `01-12-SUMMARY.md` §3 mutation 2 (`globalThis.fetch(url)` into the real `packages/engine/src/pipeline.ts`); **01-19**, `01-19-SUMMARY.md` §4 mutation 3 (`globalThisAliases` removed from `isGlobalReceiverIn`) | **UNDISCHARGED — see §4** |
| 5 | `XMLHttpRequest`, `WebSocket`, `EventSource` | `new XMLHttpRequest()` / `new WebSocket(url)` / `new EventSource(url)` | `["outbound-global-ctor"]` (all three) | `outbound-global-ctor` rows in `the outbound globals CORE-11 "of any kind" covers`; `through globalAliases plus globalNameOf, in the new rule` | **01-19**, `01-19-SUMMARY.md` §4 mutation 2 (`outboundCtorOf` + `dynamicCodeOf` lookups removed from the `new` rule) | **DISCHARGED** |
| 6 | `navigator.sendBeacon` | `navigator.sendBeacon(url, data)` | `["outbound-beacon"]` | `the beacon surface — receiver-anchored, not member-name-only`; `outbound-beacon fires on a one-hop alias of navigator` | **01-16**, `01-16-SUMMARY.md` §5 (the beacon rule's own per-widening mutation); **01-26**, `01-26-SUMMARY.md` §5 mutation 4 (`navigatorAliases`/`globalAliases` grown from the root only — RED, four fixtures named) | **UNDISCHARGED — see §4** |
| 7 | dynamic code construction (`eval`, `new Function`) | `eval("x")` / `new Function("a", src)` / `const e = eval; e("x")` | `["outbound-dynamic-code"]` (all three) | `dynamic code construction — refused rather than analysed`; `through globalAliases plus globalNameOf, in the CALL rule`; `… in the new rule` | **01-16**, `01-16-SUMMARY.md` §5 (the bare rule); **01-19**, `01-19-SUMMARY.md` §4 mutations 1 and 2 (the alias spellings — WR-23) | **DISCHARGED** |
| 8 | no speculative retrieval **of any kind** | real-tree walk over both `SOURCE_ROOTS` + `pnpm build:backend && pnpm check:bundle` | 23 files, **0 violations**; bundle **1 specifier: `crypto`** | `CORE-11 — no outbound surface is reachable from …` (`it.each(files)`); the four exempt sites asserted quiet by name | executed in **this session**, §5 below | **DISCHARGED** |

### The shapes gap-closure round 5 closed — one row each, same three columns

| # | Shape | Probe executed here | Reports | Fixture that asserts it | Observed failing in | Verdict |
|---|---|---|---|---|---|---|
| R1 | a use written ABOVE its binding (CR-09), five spellings | `s.send(req);\nconst s = sdk.requests;` · `sdk[r].send(req);\nconst r="requests";` · `g.fetch(url);\nconst g=globalThis;` · `n.sendBeacon(u,d);\nconst n=navigator;` · `e("x");\nconst e=eval;` | `outbound-send` · `outbound-send` · `outbound-fetch` · `outbound-beacon` · `outbound-dynamic-code` | `through receiverAliases: A USE ABOVE ITS OWN BINDING REPORTS … CR-09 shape 5 of 7`; `through constStrings: … shape 3 of 7`; `through globalThisAliases: MOVING THE READ CHANGES NOTHING`; `through navigatorAliases: … shape 6 of 7`; `through globalAliases: … shape 7 of 7` | **01-23**, `01-23-SUMMARY.md` §6 mutations M1/M2 (RED: `MOVING THE READ CHANGES NOTHING`, `THE THREE-CASE DISCRIMINATION`, `globalThisAliases' TRANSITIVITY`); **01-26**, `01-26-SUMMARY.md` §5 mutation 4 (RED: `through navigatorAliases: A USE ABOVE ITS OWN BINDING REPORTS … CR-09 shape 6 of 7`) | **DISCHARGED** |
| R2 | a receiver key REBOUND after a harmless literal (CR-10 shapes 1–3) | `let k="harmless"; k="requests"; sdk[k].send(req)` · `var` twin · `let k="harmless"; k="fetch"; globalThis[k](url)` | `outbound-send` · `outbound-send` · `outbound-unanalysable` | `through constStrings' WHOLE-FILE BINDINGS: a name REBOUND to a receiver name IS one — CR-10 shape 1 of 5`; `… the var spelling — shape 2 of 5`; `… in GLOBAL-KEY position — CR-10 shape 3 of 5` | **01-24**, `01-24-SUMMARY.md` §4 mutations MA1/MA2/MA3 (all three titles in the RED lists) | **DISCHARGED** |
| R3 | a COMPOUND ASSIGNMENT building a key (CR-10 shape 4) | `let k="req"; k+="uests"; sdk[k].send(req)` | `outbound-unanalysable` | `through assembledNames' COMPOUND-ASSIGNMENT branch: a += that builds a string is an ASSEMBLY — CR-10 shape 4 of 5` | **01-24**, `01-24-SUMMARY.md` §4 (RED by that exact title) | **DISCHARGED** |
| R4 | a CONDITIONAL receiver in CALL position and its operator twins (WR-27) | `(b ? sdk.requests : sdk.net).send(req)` · `(sdk.requests ?? sdk.net).send(req)` · `\|\|` twin · `(ok && sdk.requests).send(req)` | `outbound-send` (all four) | `through operatorReceiver in CALL position: … WR-27, the third face of the operator`; `through THE COLLAPSE: …`; `through RECEIVER_OPERATORS: (sdk.requests ?? sdk.net).send(req) and the \|\| form report`; `through RECEIVER_OPERATORS: && IS IN THE SET, DECIDED BY MEASUREMENT` | **01-25**, `01-25-SUMMARY.md` §4 mutations MC1/MC2/MD1 (all four titles in the RED lists) | **DISCHARGED** |
| R5 | a NESTED conditional key | `sdk[b ? (c ? "requests" : "x") : "y"].send(req)` · flat twin `sdk[b ? "requests" : "net"]` | `outbound-send` (both) | `through keyReceiver's OWN recursion: sdk[b ? (c ? "requests" : "x") : "y"] resolves`; `through the CONDITIONAL resolver: sdk[b ? "requests" : "net"] hides nothing` | **01-25**, `01-25-SUMMARY.md` §4 mutation MD2 (RED by title). **Recorded honestly:** 01-25 titled the recursion case MEASURED NON-EVIDENCE under MD1 — it closed a task earlier than the plan predicted — and it is MD2, not MD1, that is its proof | **DISCHARGED** |
| R6 | a DESTRUCTURED key binding (IN-26) | `const { k } = { k: "req"+"uests" }; sdk[k].send(req)` · `const [k] = ["req"+"uests"]; …` | `outbound-unanalysable` (both) | `through assembledNames' BINDING-PATTERN branches: the two DESTRUCTURE spellings of a declared assembly report … IN-26` | **01-26**, `01-26-SUMMARY.md` §5 mutation 3 (RED, named `FAIL outbound-prohibition.spec.ts > a receiver the walk cannot read is REPORTED, not dropped > through assembledNames' BINDING-PATTERN branches …`) | **DISCHARGED** |
| R7 | a WHOLE-FILE rebound specifier / member name (CR-10, wave 24) | `let s="harmless"; s="caido:http"; await import(s)` · `let m="harmless"; m="send"; sdk.requests[m](req)` | `outbound-unanalysable` (both) | `through literalOf's SINGLE-VALUED contract: a SPECIFIER rebound mid-file …`; `… a MEMBER name rebound mid-file becomes UNREADABLE …` | **01-24**, `01-24-SUMMARY.md` §4 (both titles RED). This is the live silent miss 01-24 found that CR-10 never enumerated | **DISCHARGED** |
| R8 | the four MEASURED-EXEMPT sites, quiet **by name** | real-tree audit of each site's own file, this session | all four `[]` | the `it.each(files)` per-file cases + `the shapes that MUST stay quiet` | executed in **this session**, §5 | **DISCHARGED** |

**Row-count arithmetic:** 8 enumerated rows + 8 round-5 rows = 16. **14 discharged, 2 undischarged** (rows 4
and 6, blocked by the same single silence).

## 3. THE BOUND ON ROW 2's ABSOLUTE — where it comes from, and why it is not a get-out for row 4

Row 2's clause is `no sdk.requests.send IN ANY SPELLING`. That phrase is not an absolute; what bounds it is
the machine-owned span in `REQUIREMENTS.md`, whose **seven** named silences are the whole of the bound. Six of
them carry a residual classification and a reason:

```
* silence-two-hop-key                      - residual (a), KEY half
* silence-function-boundary                - residual (a), FUNCTION half
* silence-parameter-key                    - residual (b)
* silence-loop-binding-key                 - residual (b)
* silence-destructured-plain-literal-key   - residual (b2), NAMED BY MEASUREMENT in wave 26
* silence-inverted-binding-order           - what actually bounds an ALIAS chain, corrected in wave 23
* silence-operator-around-global-receiver  - OPEN AND UNOWNED, opened by measurement in wave 25 and
                                             unchanged since
```

Executed confirmations of the six bounded ones, this session:

```
S2  const { k } = { k: "requests" }; sdk[k].send(req);   -> [] - nothing   (residual b2)
S3  const a = "requests"; const k = a; sdk[k].send(req); -> [] - nothing   (residual a, key half)
S4  const b = a; const a = fetch; b(url);                -> [] - nothing   (inverted binding order)
S5  sdk[k].send(req);                                    -> [] - nothing   (residual b)
```

Those four are **disclosed bounds**: each carries a residual class, a reason, a probe and a counter-probe, and
each is regenerated from the registry. A bounded silence does not block a discharge row — that is the whole
design wave 27 built. **The seventh is different in kind**, and the difference is the block's own word:
`OPEN AND UNOWNED`.

## 4. THE BLOCKING ROW — executed

```
BLK|B1 (ok && globalThis).fetch(url)                  |[] - NOTHING
BLK|B2 (globalThis ?? self).fetch(url)                |[] - NOTHING
BLK|B3 (globalThis || self).fetch(url)                |[] - NOTHING
BLK|B4 (b ? globalThis : self).fetch(url)             |[] - NOTHING
BLK|B5 (0, globalThis).fetch(url)                     |["outbound-fetch"]
BLK|B6 (ok && window).fetch(url)                      |[] - NOTHING
BLK|B7 (ok && navigator).sendBeacon(u,d)              |[] - NOTHING
BLK|C1 COUNTER bare globalThis.fetch                  |["outbound-fetch"]
BLK|C2 COUNTER SDK twin (ok && sdk.requests).send     |["outbound-send"]
BLK|C3 COUNTER SDK twin (b ? sdk.requests : sdk.net).send |["outbound-send"]
```

**Why this holds the box open, stated as an argument a reader can check rather than as a preference.**

1. CORE-11's sentence enumerates `no global fetch by ANY RECEIVER or alias`. `(ok && globalThis)` **is** a
   receiver. The gate cannot go red on it.
2. This phase's own recorded prohibition — carried in this plan's frontmatter and enforced five times — is:
   *MUST NOT mark a `verification: gate` prohibition complete while its gate cannot go red on a shape the
   prohibition's own statement enumerates.* That is the arithmetic `e7cc4b6` reverted.
3. The precedent is exact, not analogous. Plan 01-18 **deliberately left this same box `[ ]`** over
   `const e = eval; e(s)` — a single indirection on a surface whose direct spelling already reported, with the
   rule already present. `(ok && globalThis).fetch(url)` is that case one round later: `outbound-fetch` fires
   on bare, on `globalThis.`, on a one-hop alias, on an aliased receiver and on a whole-file rebound key in
   global position (all executed above), and is silent through one operator wrapper.
4. The asymmetry is what makes it a finding rather than a bound. Wave 25 closed **this exact operator class**
   for the SDK receiver — C2 and C3 report — and did not reach the global one. The derived block says so:
   *"the boundary is the RESOLVER, not the operator."*
5. It is labelled `OPEN AND UNOWNED` by the registry itself. Every other silence carries a residual class; this
   one carries an ownership gap.
6. **It blocks a second enumerated clause.** B7 shows `(ok && navigator).sendBeacon(u, d)` is silent, so
   `no navigator.sendBeacon` is blocked by the same resolver gap.

**A measured discrepancy inside the DERIVED text, recorded rather than absorbed, and deliberately not fixed
here.** That entry's prose says an operator wrapping a global receiver is silent *"in every spelling"*. **B5
falsifies that phrase:** `(0, globalThis).fetch(url)` reports `outbound-fetch`, because the comma sequence is
unwrapped by `unwrap` before the receiver resolvers are reached, so it never meets `operatorReceiver` at all.
The entry's own probe and counter-probe are executed and green — the suite is not wrong — it is the
**summarising phrase** that overreaches, and it overreaches in the **safe** direction: the gate reaches
further than its text says, the same direction as wave 23's correction. Wave 28 changes no registry row, so
this is written into `REQUIREMENTS.md`'s correction and left for round 6 to own rather than silently patched.

## 5. THE REAL TREE AND THE BUNDLE — row 8, executed this session

```
REALTREE|files=23|violations=0
SITE|cur as Record<string, unknown>)[key]  |packages/backend/src/compat.ts             |[]
SITE|ctx[root]                             |packages/backend/src/compat.ts             |[]
SITE|segments[i]                           |packages/backend/src/store/observations.ts |[]
SITE|MIGRATIONS[MIGRATIONS.length - 1]     |packages/backend/src/store/migrations.ts   |[]
```

All four measured-exempt sites quiet **by name**, each read out of its real file.

```
$ pnpm build:backend && pnpm check:bundle
$ node scripts/ci/check-bundle-imports.mjs
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

## 6. NO MUTATION WAS PLANTED — the gate-file diff is comment-only

```
$ git diff --stat packages/backend/src/outbound-prohibition.spec.ts
 packages/backend/src/outbound-prohibition.spec.ts | 14 ++++++++++++++
 1 file changed, 14 insertions(+)
```

Fourteen added lines, all inside the `/* … */` block **above** the BEGIN sentinel — the completion note. Zero
lines removed. No rule, no fixture, no resolver, no registry row. Both byte comparisons pass unchanged.

The probe harnesses were transient files created, run and deleted inside the session:

```
$ rm -f packages/backend/src/__discharge-probe.spec.ts packages/backend/src/__realtree-probe.spec.ts
$ git status --porcelain packages/
CLEAN-PACKAGES
```

## 7. THE BOX, AND THE GREPS

```
$ grep -c '^- \[ \] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
1
$ grep -cE '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
1
$ grep -c 'BEGIN DERIVED RESIDUAL' .planning/REQUIREMENTS.md
1
```

The state-specific grep for the outcome that occurred returns 1; the state-agnostic grep returns 1. The task's
own `<automated>` verify is state-agnostic by design, so the honest `[ ]` passes its own gate.

### The correction's four required sentences, pasted

**`in any spelling`, bound in its own sentence:**

> THE PHRASE `IN ANY SPELLING`, BOUND IN THIS SENTENCE RATHER THAN TWO PARAGRAPHS BELOW BECAUSE ITS UNBOUNDED
> READING IS WHAT DISQUALIFIED THIS REQUIREMENT AT `e7cc4b6`: this requirement's clause
> `no sdk.requests.send IN ANY SPELLING` is NOT AN ABSOLUTE and must not be read as one — what bounds it is the
> machine-owned span between the two generated-residual sentinels below …, whose seven named silences (two-hop
> key, function boundary, parameter key, loop-binding key, destructured plain literal key, inverted binding
> order, and the OPEN AND UNOWNED operator around a global receiver) are the whole of the bound, each carrying
> an executed probe and counter-probe.

**Both reverts named and all three checkings distinguished:**

> … the first `[x]` (reverted at `e7cc4b6`) rested on a gate that could not go red on an enumerated shape and
> nobody had executed the shape; the second (reverted at `faca607`) rested on an authored eight-row residual,
> three of whose sentences the next verifier falsified by execution …, and that falsified text had been copied
> verbatim into this entry; this third checking rests on the machine-owned span below, generated by
> `deriveResidual(RESOLVER_REGISTRY)` from a 38-row registry whose every row is executed against the walk,
> byte-compared against THIS FILE'S OWN BYTES by the suite — a comparison run GREEN BEFORE the box was
> examined, not after — and on a discharge table naming a fixture and a summary for every row. The difference
> is that this time the `[ ]` is a MEASURED result with a named blocking row, not a deferral.

**The limits paragraph:**

> THE LIMITS OF WHAT A DERIVED RESIDUAL BUYS …: a derived residual makes DRIFT mechanically detectable and does
> not CLOSE the class. It does not prove the registry enumerates every mechanism the walk has; the coverage
> guard reaches two enumerated populations and names its exemptions rather than covering every shape a resolver
> can be written in; and each row's probes are examples, not a proof of that resolver's domain. When this box is
> eventually `[x]`, it will mean the must-NOT holds, the enforcement covers every surface this sentence
> enumerates with a fixture that has been watched failing, and the residual is disclosed in a form that cannot
> silently drift — it will NOT mean that no shape is missed.

**STORE-03 / STORE-07, in one sentence:**

> AND ONE FLIPPED BOX WOULD NOT MEAN A CLEAN LEDGER: STORE-03's and STORE-07's text-versus-usage collisions
> remain DEFERRED WITH AN OWNER — the operator, at the next requirements pass, by the same STORE-01 → STORE-08
> route — and are untouched by this wave.

**The same sentence, restated here as the plan requires:** STORE-03's and STORE-07's text-versus-usage ledger
collisions remain **deferred with their owner** — the operator, at the next requirements pass, by the
STORE-01 → STORE-08 route — and nothing in this plan touches them.

### Append-never-rewrite, proven positively

```
$ for a in "CORRECTION 2026-08-22, plan 01-16" "CORRECTION 2026-08-24, plan 01-18" \
           "CORRECTION 2026-08-24, plan 01-19" "CORRECTION 2026-08-24, plan 01-23" \
           "FALSIFIED 2026-08-24 (CR-09)"    "CORRECTION 2026-08-24, plan 01-28"; do
      grep -cF "$a" .planning/REQUIREMENTS.md; done
1
1
1
1
1
1

$ git diff --numstat .planning/REQUIREMENTS.md
1	1	.planning/REQUIREMENTS.md          # exactly one line: the CORE-11 row, appended to
```

The machine-owned span is untouched — proven not by inspection but by the suite: both byte comparisons are
green in the post-edit run (§9).

### STATE.md's fifth pointer amendment

```
$ for a in "POINTER AMENDMENT 2026-08-24 (gap-closure round 4, plan 01-18 task 3)" \
           "SECOND POINTER AMENDMENT 2026-08-24 (gap-closure round 4, plan 01-19 task 3)" \
           "THIRD POINTER AMENDMENT 2026-08-24 (gap-closure round 5, plan 01-23 task 3)" \
           "FOURTH POINTER AMENDMENT 2026-08-24 (gap-closure round 5, plan 01-27 task 3)" \
           "FIFTH POINTER AMENDMENT 2026-08-24 (gap-closure round 5, plan 01-28 task 2)"; do
      grep -cF "$a" .planning/STATE.md; done
1
1
1
1
1

$ git diff --numstat .planning/STATE.md
1	1	.planning/STATE.md
```

The fifth amendment restates **no bound**: it records the discharge, names `01-28-SUMMARY.md` as where the
table lives, names the generated block as the residual of record, names the blocking row, and records the
ordering. Four prior amendments byte-identical.

## 8. WINDOWS.md — every command and its raw output

```
$ gsd-tools windows fixed 32
  … "id": 32, "status": "fixed", "resolved_at": "2026-08-24T14:05:59.280Z"

$ gsd-tools windows append --kind deviation --phase 01 \
    --file packages/backend/src/outbound-prohibition.spec.ts \
    --description "POINTER, NOT A COPY — WAVE 28 (plan 01-28). SUPERSEDES ENTRY 32 …"
  … "recorded_at": "2026-08-24T14:05:59.349Z", "resolved_at": null

$ gsd-tools windows status
entries: 33
31 deviation fixed  THE NARROWING AFTER WAVE 26 (plan 01-26, closing IN-26). …
32 deviation fixed  POINTER, NOT A COPY — WAVE 27 (plan 01-27). SUPERSEDES ENTRY 31, …
33 deviation open   POINTER, NOT A COPY — WAVE 28 (plan 01-28). SUPERSEDES ENTRY 32, …

$ sed -n '1,8p' .planning/WINDOWS.md
---
schema_version: 1
open_count: 19
waived_count: 0
fixed_count: 14
total_count: 33
last_updated: 2026-08-24T14:05:59.349Z
---
```

**Not hand-edited:** `git diff --numstat .planning/WINDOWS.md` reports `18 5`, which is the frontmatter counter
block (`open_count`, `fixed_count`, `total_count`, `last_updated`), entry 32's status/`resolved_at` cells, the
new row 33, and the mirrored JSON block — exactly the surfaces the tool writes. Entry 33 is a **pointer**: it
names the table, the outcome and the blocking row, and restates no bound.

## 9. FINAL GATE RESULTS

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1200 passed (1200)

$ pnpm typecheck   -> exit 0
$ pnpm lint        -> exit 0
$ pnpm knip        -> exit 0

$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto

$ git diff --exit-code .planning/phases/…/01-*-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md
CLEAN
$ git diff --exit-code packages/backend/src/store packages/engine/src tests/ scripts/
CLEAN
```

`COVERAGE.md` **was checked and needs no edit**, and the check is recorded here rather than assumed. Rows 9,
27 and 38 are the CORE-11 rows; this round changed no external-API capability surface — it hardened the gate's
internal resolvers only — and the three rows already cite the gate that enforces them. Last touched by
`0ec1e02` (plan 01-16), unchanged since, unchanged by this wave.

## Task Commits

1. **Task 1: the discharge table + gate-header completion note** — `2648543` (docs)
2. **Task 2: the conditional flip, the correction, and the two histories** — `ba64b9d` (docs)

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — one comment paragraph above the BEGIN sentinel: the
  discharge happened, the table is in this summary, the generated span is the residual of record, and this note
  restates no bound
- `.planning/REQUIREMENTS.md` — CORE-11's dated plan-01-28 correction appended to the existing entry; box
  unchanged at `[ ]`; machine-owned span untouched
- `.planning/STATE.md` — P9-D3's fifth pointer amendment
- `.planning/WINDOWS.md` — entry 32 marked fixed, entry 33 appended (tool-owned)

## Decisions Made

See `key-decisions` in the frontmatter. The load-bearing one: **an `OPEN AND UNOWNED` silence in the derived
block is an unclosed finding, not a bound**, and it therefore blocks a discharge row where a classified
residual does not.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The correction's own prose broke the byte guard by quoting a sentinel**

- **Found during:** Task 2, immediately after appending the correction
- **Issue:** The first draft of the `in any spelling` sentence read "the machine-owned span between the BEGIN
  and END DERIVED RESIDUAL sentinels below". `extractDerivedBlock` bounds the span by **searching this file's
  own bytes** for those marker lines, so the prose created a **second** `END DERIVED RESIDUAL` occurrence —
  above the real span — and the ledger byte comparison went RED:
  ```
  × the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte
  ✓ the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY), byte for byte
  $ grep -c 'END DERIVED RESIDUAL' .planning/REQUIREMENTS.md
  2
  ```
- **Fix:** Reworded to "between the two generated-residual sentinels below", and the reason was written **into
  the sentence itself** so the next author does not rediscover it. Sentinel counts back to `BEGIN=1 END=1`;
  262/262 green.
- **Why this is worth recording rather than quietly fixing:** the guard wave 27 built to catch a **drifting**
  span caught its own **reader** instead. That is the same class of self-catch wave 23 recorded when its ledger
  entry reproduced the defect its own grep was hunting, and it is direct evidence the mechanism is load-bearing
  rather than decorative.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Committed in:** `ba64b9d`

**2. [Rule 3 - Blocking] `auditSource` had to be reached through transient probe specs**

- **Found during:** Task 1
- **Issue:** The plan requires every row's rule identifier to be **executed in this session**, but `auditSource`
  is only reachable as a module export from a `.spec.ts` file, and `shippedFiles()` is not exported at all.
- **Fix:** Three transient spec files importing `auditSource` (and, for the real tree, walking `SOURCE_ROOTS`
  directly), each run and then deleted. `git status --porcelain packages/` verified clean before any commit;
  `pnpm knip` exits 0.
- **Files modified:** none persisted
- **Committed in:** n/a (deleted before commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** None on scope. Deviation 1 produced a finding worth keeping — the byte guard demonstrably
fires on a real edit. Deviation 2 was mechanical.

## Issues Encountered

**The working tree was not clean at plan start**, contrary to `<verification>` item 1:

```
 M .planning/config.json
?? .planning/milestone.lock
?? .planning/phases/00-runtime-reality-check/00-VERIFICATION.md
?? .planning/phases/00-runtime-reality-check/results/runs/recorder-20260820T180307Z/
?? .planning/phases/01-skeleton-persistence-compatibility/results/runs/20260821T075936Z-12874/
```

All five are **pre-existing and unrelated** to this plan — orchestrator config state, a milestone lock, and
Phase 0/1 spike result directories. Per the scope boundary they were left untouched and nothing in this plan
staged them. `git status --porcelain packages/` was verified clean at plan start and after every probe run.

## Known Stubs

None. This plan wrote no code.

## Threat Flags

None. This plan introduced no network endpoint, auth path, file-access pattern or schema change. It changed one
comment and three planning ledgers.

## User Setup Required

None.

## Next Phase Readiness

**CORE-11 is `[ ]` with a named blocking row, and that is the deliverable — not a deferral.** What a round 6 (or
verification) inherits, stated so nothing has to be re-derived:

1. **The blocking row is one resolver gap, and it is scoped.** `operatorReceiver` is reached from `receiverKind`
   and `keyReceiver` and from nowhere else. Reaching it from the **global** receiver path would close B1, B2, B3,
   B4, B6 and B7 in one edit, and it would unblock **both** undischarged rows. Wave 25 already built the descent;
   it was never wired to the global resolver.
2. **The 14 discharged rows do not need re-doing.** Each names its fixture and the summary that watched it fail.
3. **One prose defect is live inside the machine-owned text** and wave 28 was forbidden to touch it: the
   `silence-operator-around-global-receiver` entry says "silent in every spelling" and `(0, globalThis).fetch(url)`
   reports. It errs safely, but it is an authored overreach inside derived text and it should be corrected at the
   registry row.
4. **Nothing leaks, and nothing in this summary claims otherwise.** The must-NOT holds: 23 files, ZERO violations
   over both source roots; `check:bundle` at exactly one specifier, `crypto`. The blocking row is prospective
   blindness in a test-only gate.
5. **The round's arithmetic, without a claim that the pattern is over.** Round 5 closed CR-09, CR-10, WR-27
   through WR-31 and IN-23 through IN-26, and changed how the residual is produced — from authored to generated
   and byte-checked. Whether it opened anything is verification's call, not this plan's. What this plan can say
   is that for the first time the box's state was decided by a measurement with a named blocking row rather than
   by an argument, and the measurement said `[ ]`.

## Self-Check: PASSED

- `packages/backend/src/outbound-prohibition.spec.ts` — FOUND
- `.planning/REQUIREMENTS.md` — FOUND
- `.planning/STATE.md` — FOUND
- `.planning/WINDOWS.md` — FOUND
- commit `2648543` — FOUND in `git log --oneline --all`
- commit `ba64b9d` — FOUND in `git log --oneline --all`
- All Task 1 and Task 2 acceptance criteria re-run against the final committed tree; the plan-level
  `<verification>` list executed in full, results in §9. Item 1 (clean tree at start) failed for pre-existing
  unrelated reasons and is documented under Issues Encountered.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*
