---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-27T08:40:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  previous_verified: 2026-08-26T22:30:00Z
  round: 11
  verification_pass: 12
  history: "pass 4 (round 3) -> pass 5 (round 4) -> pass 6 (round 5) -> pass 7 (round 6) -> pass 8 (round 7) -> pass 9 (round 8) -> pass 10 (round 9) -> pass 11 (round 10) -> pass 12 (round 11). The score has read 8/9 for TEN consecutive passes and the open truth has been the same one every time: truth 9, CORE-11 outbound enforcement. CORE-11's box has been flipped and reverted THREE times — `e7cc4b6`, `faca607`, `4105fd0` — and has now stood at `[ ]` for FIVE consecutive rounds with the pin, the ledger row and every verification agreeing. PASS 12 IS THE FIRST ROUND IN WHICH EVERY FINDING THE PREVIOUS PASS RAISED CLOSED. Five blockers (CR-24…CR-28) and five warnings (WR-61…WR-65) all reproduce-then-close under execution here, and the round opened exactly ONE new finding, CR-29 — down from five. The pattern of a round closing N and opening N is broken; what is NOT broken is criterion (3), and the reason is a surface nobody had measured."
  gaps_closed:
    - "CR-28 — CLOSED, AND I WATCHED IT GO RED ON THE EXACT MUTATION THAT WAS GREEN AT PASS 11. Wave 44 hoisted `REGISTRY_OPEN` (`:9950-9951`) and `registryOpenIndex` (`:9952-9953`) into the enclosing `describe`, and BOTH the endpoint pin (`:10383-10385`) and the CR-23-shape fixture (`:10465`, `:10478-10481`) now read that one shared binding. Executed: I swapped `:9953` from `line === REGISTRY_OPEN` to `line.startsWith(\"export const RESOLVER_REGISTRY\")` against the shipped file — `Tests 1 failed | 441 passed (442)`, `over the synthetic array the prefix finder resolved to index 1 and the full-line finder to index 1. They are meant to DIFFER`. Pass 11 ran that identical step-1 mutation at 441 of 441 GREEN and then planted the `RESOLVER_REGISTRY_SHADOW` decoy on top of it, also green. The fixture now reads the shipped expression instead of re-declaring it, which is precisely what pass 11 prescribed. The comment at `:10437-10440` was ALSO rewritten to stop overclaiming: it now says the fixture goes red on a change to the shared binding AND that an author who inlines a fresh prefix predicate at the pin's own call site still bypasses it. That second half is a disclosure of the fixture's real reach, and it is accurate."
    - "CR-26 — CLOSED, AND I REPRODUCED PASS 11's OWN SHARPEST MUTATION TO PROVE IT. Wave 45 added `WIDEST_ANCHOR_TOKEN = \"SPELLING (operator, by POSITION) RESOLVED BY REPORTS\"` (`:10233-10235`) and a second assertion at `:10276-10279` pinning the OWNER of the maximum, not only its size. Executed in two steps against the shipped file. Step 1, the plain split — a blank plus `// a new prose block opening here` inserted at raw 700: `Tests 1 failed | 441 passed (442)`, size pin fires at 293 vs 574. Step 2, PASS 11's ACTUAL CR-26 SHAPE — 291 filler `//` lines inserted at line 11 to hold the maximum, plus that same split: `Tests 1 failed | 441 passed (442)`, and the failure is the IDENTITY assertion, `THE WIDEST ANCHOR SHADOW EXPECTED OWNER \"SPELLING (operator, by POSITION) RESOLVED BY REPORTS\" BUT FOUND \"packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi…\"`. Pass 11 measured that exact edit at `Tests 441 passed (441)` with the `:417` shadow collapsing 574 -> 284 and the whole suite silent. It is silent no longer. The rationale at `:10182-10185` was also corrected to what it executes — `the equality makes both directions of THE MAXIMUM loud; the identity pin makes a change in WHICH anchor owns that maximum loud; every other non-maximal shadow remains unseen — pass 11 measured the named shadow falling from 574 to 284 at 441 of 441 green` — which cites the executed number rather than restating the false generalization."
    - "CR-25 — CLOSED BY DELETION, CONFIRMED BY CENSUS. Reach statement (2) at `:10190` now reads `IT DOES NOT BOUND A NON-MAXIMAL SHADOW` and carries no number. The `573` clause is gone: a case-insensitive sweep of the whole file for `573` returns exactly ONE hit, `:10217`, and it is the substring of the raw line number `1573` in the boundary-mechanism sentence. Limit (5) at `:9109-9110` still states the fact correctly (`a non-maximal shadow may grow up to that maximum with nothing reporting`), and it is now the only statement of that measurement in the file. The second, wrong statement of one measurement — which was WR-60's shape reproduced in the round that closed WR-60 — no longer exists."
    - "CR-24 — CLOSED BY DELETION AT BOTH SITES, CONFIRMED BY GREP AND BY READING. The present-tense live locator `the two identically-headed table headers sit at lines 299 and 361` is absent from the file: a grep for `299 and 361`, `lines 299` and `identically-headed` returns four hits (`:10775`, `:11208`, `:11217`, `:11246`) and NONE of them asserts a live line pair. `:10770-10782` now attributes the 58 to the unmodified frame and cites `01-39-SUMMARY.md:531` and `:931`; `:11217-11227` attributes the 57 to the delete-first frame and cites the same two. I verified both citations exist and say what is claimed — `01-39-SUMMARY.md:531` carries the reconciliation paragraph and `:931` carries discrepancy row `D-1`. The fixture at `:11208` demonstrates the ambiguous-token shape over a SYNTHETIC six-element array (`:11230`) and claims no live pair at all, so the property it shows no longer rests on a locator the file falsifies."
    - "CR-27 — CLOSED, AND I AUDITED THE ORCHESTRATOR-APPLIED HALF RATHER THAN TAKING IT. The retirement bracket's overclaiming enumeration (`NOTHING WAS DELETED SILENTLY … ONE positive site claim … FIVE negative ones`) is GONE — a grep for that sentence returns nothing, and the bracket at `:10631-10652` now states the withdrawal and its reason without asserting a count it did not execute. On `efe93e8`, the closure this pass was told to check: MEASURED, a case-insensitive census of `enclos` over the live file returns exactly THREE hits — `:9380` (`NOT THE SAME AS THE FINEST ENCLOSING CONSTRUCT`, a NEGATION drawing the disowning statement's own distinction), `:9395` (the disowning statement itself), and `:11129` (`when its enclosing construct changed`, describing the construct a relocated sentence SITS IN, not what the scan resolves). The four sites the commit names — `:9242`, `:9409`, `:9463`, `:10761` — all now read `the next construct ABOVE`, the file's own non-containment vocabulary already in use at `:9238`. The commit's arithmetic (7 -> 3) reproduces exactly, the diff is comment-only, and `wc -l` is 11502 / `gateLines` 11503, unchanged. CR-27's specific contradiction — `constructAnchorFor`'s docblock disowning a word its own body used 68 lines below — is DISCHARGED."
    - "WR-61 — CLOSED BY DELETION. Both stale published sweep scopes are gone. A grep for `8,846`, `8846`, `11,417`, `11417`, `11,416` and `11416` over the whole file returns ZERO hits. `:9276-9280` and `:10689-10692` now publish the RESULT of each sweep without a total that goes stale the moment the commit publishing it adds lines to the file it just swept. That is the second of the two remedies pass 11 offered and it is the one that cannot rot."
    - "WR-62 — CLOSED, AND I PLANTED PASS 11's OWN DECOY TO PROVE IT. Exclusion one's endpoints are now pinned by full-line equalities against `DERIVED_BEGIN` / `DERIVED_END` — the constants that already existed at `:6043` — in a dedicated case at `:10092-10113`, with a uniqueness assertion on each sentinel before the pin. Executed: I planted a bare `BEGIN DERIVED RESIDUAL` line at `:961`, exactly where pass 11 planted it. Pass 11 got ONE report, from the 574 pin, by the luck of geometry. I got TWO: `exclusion one's realized FROM endpoint is line 961, but its opening sentinel's own full line is 984 — a gap of -23 line(s)` fires FIRST, from the endpoint pin itself. The protection no longer comes from an accident of where exclusion one happens to sit."
    - "WR-63 — CLOSED AT THE BOUNDARY VALUE, BOTH SIDES. The census guard at `:10817` is now `if (at <= 0)` where pass 11 measured `at < 0`, and its message at `:10819` names BOTH shapes (`either carries no \" §§ \" separator or opens with that separator and therefore has an EMPTY construct half`). The mirror defect pass 11 added on its own account is fixed too: the prefix case's message at `:10745` now carries the same two-shape wording instead of the false `carries no \" §§ \" separator`. The correctly-guarded site and the correctly-messaged site are now the same two sites."
    - "WR-64 — CLOSED. `:10214-10218` no longer claims that no line in `419..1574` is accepted. It states the measured truth and the mechanism: `this session's evaluation of all five recognisers accepts only the /** docblock opener at 1573; its null token makes WR-53's forward walk fall through and the backward scan continue, so every surface line in that range resolves to the header`. An author re-deriving the pin from the stated reason now gets the boundary right."
    - "WR-65 — CLOSED BY DELETION AND BY PRE-AUTHORISATION. The sentence `a pin that must be re-derived on routine edits is a pin nobody trusts and everybody re-derives without reading` is gone — grep returns zero. In its place, `:10202-10208` pre-authorises the routine bump under a condition: `A bump to the pinned value attributable line by line to lines the same commit added inside the anchor's raw span is authorised, needs no finding, and requires that attribution in the commit; an unattributable bump is not authorised.` The pin's comment block no longer supplies the argument the next round would quote while removing it."
    - "T-01-286 — NOT A GAP, AND I CHECKED IT BECAUSE `01-SECURITY.md` CARRIED IT AS OPEN-BUT-BELOW-THRESHOLD. Its claim is that one bound is published at two values, `573` at `:10174` against `574` at `:9110`. Measured, the `573` half no longer exists (see CR-25 above), so the two-value publication it describes is not in the tree. The row is stale rather than live; it is recorded here so a thirteenth pass does not spend a finding on it."
  gaps_remaining:
    - "Truth 9 — CORE-11 outbound enforcement. Criterion (3) THE SOLE BOUND is unmet on its MECHANISM leg for the FIFTH consecutive round, but NOT for the reason the last four rounds gave and NOT for the reason `01-SECURITY.md` gave. See CR-29."
  regressions: []
gaps:
  - truth: "No shipped code can introduce outbound traffic without failing a gate (CORE-11)"
    status: partial
    reason: "The must-NOT itself holds and I re-established it by execution: `pnpm check:bundle` reports the shipped bundle's ENTIRE import set as one specifier, `crypto`; 23 modules over both `SOURCE_ROOTS` walk at ZERO violations inside a green 31-file / 1390-test suite; every outbound shape I probed through the shipped `auditSource` reports. Criteria (1) DERIVED and (2) DRIFT-DETECTABLE are discharged and I re-confirmed both by mutation. Criterion (3) THE SOLE BOUND — `the disclosure is the only bound stated on every surface a reader touches, contradicted nowhere` — is NOT discharged, because the gate file's own hand-written header tells a reader that three outbound spellings the walk CATCHES are uncaught, and labels them OPEN and UNOWNED."
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-29 — BLOCKER. Lines `:440-447` of the header's live reference table `SPELLING (operator, by POSITION) / RESOLVED BY / REPORTS` assert that `(ok && globalThis).fetch(url)`, `(b ? navigator : x).sendBeacon(u, d)` and `(b ? eval : x)(src)` are RESOLVED BY `NOTHING` and REPORT `[]`, under the label `OPEN and UNOWNED, MEASURED IDENTICAL before and after wave 25`. EXECUTED THROUGH THE SHIPPED `auditSource` THIS SESSION: `(ok && globalThis).fetch(url)` -> `[\"outbound-fetch\"]`; `(b ? navigator : x).sendBeacon(u, d)` -> `[\"outbound-beacon\"]`; `(b ? eval : x)(src)` -> `[\"outbound-dynamic-code\"]`. All three REPORT. Three further spellings of the same class report too: `(globalThis ?? self).fetch(url)`, `(globalThis || self).fetch(url)` and `(ok && window).fetch(url)`, all `[\"outbound-fetch\"]`. The file's OWN GUARD at `:9930-9936` says so in its own bytes: it asserts `silence-operator-around-global-receiver` must never return to the registry because `every spelling it named now reports through operatorOperandMatching`. So `:440-447` and `:9930-9936` are a direct contradiction inside one file, and `:449-452` compounds it by asserting that `Everything in the NOTHING rows … are asserted below as silences and labelled as such` — the row those three rest on was DELETED at wave 32 (`:5777`) and is asserted below as a silence NOWHERE."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-29(b) — the same block, one level up. `:454-460` opens the header's residual with `This is THE ONE BOUND, and the same statement appears in REQUIREMENTS.md's CORE-11 correction, in .planning/STATE.md's P9-D3 amendment, and in the WINDOWS.md entry appended by plan 01-18. If a reader finds those four disagreeing, the code wins and the prose is the defect.` Measured: (i) the `WINDOWS.md` entry appended by plan 01-18 is entry 22, whose own first clause reads `SUPERSEDED IN WAVE 19 BY PLAN 01-19` and whose status is `fixed`; (ii) `:958-968`, 504 lines below, states the wave-27 surface decision — `The DERIVED text ships in exactly TWO surfaces` and `.planning/STATE.md and .planning/WINDOWS.md carry a POINTER to those two and restate NO bound of their own`; (iii) the header's own closed enumeration at `:745-755` (`WHAT REMAINS SILENT, READ OFF THE BRANCHES: TWO HOPS OF KEY …; a value crossing a FUNCTION BOUNDARY; a PARAMETER; a LOOP BINDING; and a name bound in ANOTHER FILE`) names FIVE silences where the derived span at `:983-1564` enumerates TWENTY-SIX by id. Two bounds on one surface, one of them 21 silences short, the shorter one self-declared as THE ONE BOUND. Criterion (3) says the disclosure must be the ONLY bound stated on every surface a reader touches."
      - path: ".planning/STATE.md"
        issue: "CR-29(c) — the claim that closed CR-14 is false of the live bytes. STATE.md's P9-D3 amendment dated 2026-08-25 (wave 33) states `THE GATE FILE'S HAND-WRITTEN HEADER NOW STATES NO BOUND OF ITS OWN. Three paragraphs were DELETED rather than corrected: the two carrying CR-14 (an operator wrapping a global receiver asserted STILL SILENT in six named spellings, when wave 32 had closed the shape…).` The gate file records the same deletion in its own bytes at `:757-767`. Wave 33 deleted the two PROSE paragraphs and left the eight-line TABLE saying the same thing 320 lines above them. CR-14 was closed in the prose and not in the table."
    missing:
      - "Correct or delete `:440-447`. The three global-receiver rows must state what `auditSource` executes — `outbound-fetch`, `outbound-beacon`, `outbound-dynamic-code` — or come out of the table. The label `OPEN and UNOWNED` must go with them: it tells a reader an unclosed finding exists where none does. DELETION IS THE ROUTE THIS PASS RECOMMENDS, on wave 33's own precedent and pass 11's: a corrected row is still an authored bound standing beside a derived one, and the derived span at `:983-1564` already carries every one of these shapes."
      - "Correct `:449-452`. `They are asserted below as silences and labelled as such` is false for the three rows above it; the registry row they rested on was removed at wave 32 and a guard at `:9930-9936` asserts it stays removed."
      - "Resolve `:454-460`. Either delete `This is THE ONE BOUND` and its four-surface citation — the `WINDOWS.md` entry it cites has been self-marked SUPERSEDED since wave 19 — or reconcile it with `:958-968`, which says the derived span is the bound and that STATE.md and WINDOWS.md restate none."
      - "Resolve `:745-755`. A five-item closed enumeration standing 228 lines above a 26-item derived one is the shape criterion (3) forbids. The registry's own WR-37 sibling rows say as much at `:5554-5557` (`THEY SAY SO HERE BECAUSE RESIDUAL (b) DOES NOT`), 4,800 lines away from the list that needs the caveat."
      - "Once and only once all four are done, re-measure criterion (3) across the four surfaces in one session and, if it discharges, flip `.planning/REQUIREMENTS.md:46` and `CORE11_BOX_EXPECTED` at `packages/backend/src/outbound-prohibition.spec.ts:11414` IN THE SAME COMMIT."
deferred:
  - truth: "STORE-08 — schema coverage for `entities`, `evidence` and `audit`"
    addressed_in: "Phase 4 (SEC-*) and Phase 5"
    evidence: "REQUIREMENTS.md:790 — \"`entities` and `evidence` are owned by Phase 4 (SEC-*); `audit` by Phase 5. Building them empty in Phase 1 would ship three tables with no writer.\" Its `[ ]` is by design, not a phase-01 gap."
human_verification: []
---

# Phase 01: Skeleton, Persistence & Compatibility — Verification Report (PASS 12)

**Phase Goal:** A Caido plugin skeleton that ingests passively, persists per project, and refuses to run on an unsupported host — with no outbound traffic of any kind.
**Verified:** 2026-08-27T08:40:00Z
**Status:** gaps_found
**Re-verification:** Yes — round 11, verification pass 12, superseding pass 11 of 2026-08-26T22:30Z.

---

## Baseline, re-established rather than inherited

| Command | Expected | Measured | Status |
| --- | --- | --- | --- |
| `pnpm test` | 31 files / 1390 tests, exit 0 | `Test Files 31 passed (31)`, `Tests 1390 passed (1390)`, exit 0 | ✓ |
| `pnpm typecheck` | exit 0 | `tsc --build`, exit 0 | ✓ |
| `pnpm lint` | exit 0 | `eslint .`, exit 0 | ✓ |
| `pnpm check:bundle` | exactly one specifier, `crypto` | `packages/backend/dist/index.js: 1 import specifier(s): crypto` | ✓ |

**Tree discipline.** Nine mutations were planted in `packages/backend/src/outbound-prohibition.spec.ts` across this session and all nine restored. One temporary probe spec (`packages/backend/src/zz-probe-verifier.spec.ts`) was created to reach the exported `auditSource` and was deleted. Final state: `git diff --exit-code -- packages/` returns 0, `git status --short` shows only the pre-existing untracked `.gsd/`, and the gate file's md5 is `9e87eb24d0e8bf69dc01cb77b611ced2`, byte-identical to the backup taken before the first mutation.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `onInterceptResponse` non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `hooks/passive.ts:117` — *"NOT async — it returns `undefined`, never a Promise"*; wired at `index.ts:321` `sdk.events.onInterceptResponse(...)`, registered last per `index.ts:31`. Green in 1390 tests. |
| 2 | Work queue bounded, overflow count visible, never unbounded | ✓ VERIFIED | `hooks/passive.ts:40` — *"BOUNDED. The queue drops the oldest entry at cap"*; `telemetry.ts:100` — *"(CORE-03 visible overflow)"*. Re-read this session. |
| 3 | 200-chunk SPA leaves plugin UI and RPC responsive; max synchronous slice recorded | ✓ VERIFIED | `results/spa-load.json` (6,185 bytes), taken from **outside** the process by an external REST prober (decision P5-D3) against `caido-cli 0.57.1` with a pinned sha256. Re-confirmed present. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `store/analyses.ts:113` — `ON CONFLICT (project_id, sha256, detector_set_hash) DO NOTHING`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; non-UTF-8 fixture round-trips | ✓ VERIFIED | `ingest/consumer.ts:189` `const raw = body.toRaw();`. |
| 6 | CI gate fails the build if the backend bundle imports outside the Phase 0 allowlist | ✓ VERIFIED | **Executed this session:** `packages/backend/dist/index.js: 1 import specifier(s): crypto`, exit 0. |
| 7 | Below-minimum Caido produces a clear message, not an obscure failure | ✓ VERIFIED | `compat.ts:45` `export const MIN_CAIDO = "0.57.1";` with the user-facing message downstream. |
| 8 | Redaction: no query-string value from a target-controlled URL reaches `observations.url` | ✓ VERIFIED | `store/observations.ts:55` `QUERY_VALUE_REDACTION`, applied at `:205`. Re-confirmed live on Caido 0.58.2 by UAT round-2 test 7 (run `20260826T224147Z-25836`), every tracer dye absent from both the raw SQLite column and the RPC projection. |
| 9 | **No shipped code can introduce outbound traffic without failing a gate (CORE-11)** | **✗ FAILED (partial)** | **The one that does not hold, for the tenth pass running.** The must-NOT holds and I re-executed it. Criteria (1) and (2) discharge. Criterion (3) does not — see CR-29 below. |

**Score:** 8/9 truths verified (0 present, behavior-unverified)

---

## The question this pass was asked, answered

### What `efe93e8` claimed, and what it actually did

The claim was that `T-01-263` — `enclosing`-construct language contradicting the statement that disowns it — was closed in the bytes. **It was, and I measured it rather than reading the commit message.**

A case-insensitive census of `enclos` over the live file returns **exactly three** hits, down from seven:

| Line | Text | Adjudication |
| --- | --- | --- |
| `:9380` | `NOT THE SAME AS THE FINEST ENCLOSING CONSTRUCT` | A **negation**, drawing the same distinction the disowning statement draws. Correct as written. |
| `:9395` | `` the word `enclosing` would claim a containment this scan does not compute `` | The disowning statement itself. |
| `:11129` | `when its enclosing construct changed` | Describes the construct a **relocated sentence sits in**, a fact about the source text, not a claim about what the scan resolves. Outside the disowning statement's scope. |

The four sites the commit names — `:9242`, `:9409`, `:9463`, `:10761` — all now read *"the next construct ABOVE"*, the file's own non-containment vocabulary already in use at `:9238`. `:9463` is the one that mattered most: a **resolution** claim inside `constructAnchorFor`'s own body, 68 lines below the docblock disowning the word, and uncited by the threat row that named the other three. The diff is comment-only; `wc -l` is 11502 and `gateLines` 11503, unchanged.

**Criterion (3)'s mechanism leg is discharged on the `enclosing` question.** The single-function contradiction the security auditor isolated on 2026-08-27 no longer exists.

### And it is still not enough, because a different contradiction survives — and this one is FALSE, not merely redundant

The security auditor looked at `constructAnchorFor`. Nobody looked at the header's **reference table** — the one whose title line, `SPELLING (operator, by POSITION) RESOLVED BY REPORTS` at `:417`, is the very anchor `WIDEST_ANCHOR_TOKEN` pins and the entire 574-line-shadow apparatus watches.

Twenty-three lines under that title, the table says:

```
:440   (ok && globalThis).fetch(url)            NOTHING              [] — the descent is NOT
:441   (b ? navigator : x).sendBeacon(u, d)                            reached from
:442   (b ? eval : x)(src)                                             isGlobalReceiver /
:443     an operator around a GLOBAL receiver                          isFetchExpression /
:444                                                                   isNavigatorReceiver.
:445                                                                   OPEN and UNOWNED,
:446                                                                   MEASURED IDENTICAL
:447                                                                   before and after wave 25
```

**Executed through the shipped `auditSource` this session:**

| Header table says | Measured |
| --- | --- |
| `(ok && globalThis).fetch(url)` → `NOTHING` / `[]` | `["outbound-fetch"]` |
| `(b ? navigator : x).sendBeacon(u, d)` → `NOTHING` / `[]` | `["outbound-beacon"]` |
| `(b ? eval : x)(src)` → `NOTHING` / `[]` | `["outbound-dynamic-code"]` |
| *(control, correctly `[]`)* `(ready && cache).send(req)` | `[]` |
| *(control, correctly `[]`)* `(b ? cache : client).send(req)` | `[]` |
| `(globalThis ?? self).fetch(url)` | `["outbound-fetch"]` |
| `(globalThis || self).fetch(url)` | `["outbound-fetch"]` |
| `(ok && window).fetch(url)` | `["outbound-fetch"]` |

All three "NOTHING" rows are false. The two control rows in the same table are correct, so this is not a stale table — it is three stale rows inside a live one.

**The file's own guard says so, 9,490 lines below.** At `:9930-9936`:

> *"row `silence-operator-around-global-receiver` is BACK in the registry. It was removed on 2026-08-24 (CR-11) because the silence it measured stopped existing — **every spelling it named now reports** through `operatorOperandMatching`."*

And `:449-452` compounds it:

> *"Everything in the NOTHING rows is a measured silence, not a bound … **They are asserted below as silences and labelled as such**, so none of them can ever again be cited as evidence that some rule holds."*

The row those three rest on was deleted at wave 32 (`:5777` records the deletion). They are asserted below as silences **nowhere**. The sentence that promises a reader they are is the sentence that makes the table trustworthy.

### Why this is criterion (3) and not a cosmetic nit

Criterion (3) is *"THE SOLE BOUND — the disclosure is the only bound stated on every surface a reader touches, contradicted nowhere."*

The gate file is the surface a reader of CORE-11 touches first. On it, three statements of the bound coexist:

1. **`:440-447`** — a table row asserting three global-receiver spellings are silent and the finding is **OPEN and UNOWNED**. Measured: all three report; the finding is closed.
2. **`:454-460` and `:745-755`** — a hand-written residual declaring itself *"**This is THE ONE BOUND**"* and closing with a five-item enumeration (`TWO HOPS OF KEY …; a FUNCTION BOUNDARY; a PARAMETER; a LOOP BINDING; and a name bound in ANOTHER FILE`).
3. **`:983-1564`** — the machine-owned derived span, which enumerates **twenty-six** named silences by id and is byte-compared to `deriveResidual(RESOLVER_REGISTRY)`.

Statement 2 is 21 silences short of statement 3 and calls itself the only one. Among the 21 it omits are the five that STATE.md and `WINDOWS.md` entry 37 both name as *the reason the box stays `[ ]`* — the WR-37 receiver siblings, which I re-executed and confirmed still silent:

```
const [q] = [sdk.requests]; q.send(req);                      -> []
const o = { q: sdk.requests }; o.q.send(req);                 -> []
class C { q = sdk.requests; m() { this.q.send(req); } }       -> []
function f(q = sdk.requests) { q.send(req); }                 -> []
for (const q of [sdk.requests]) { q.send(req); }              -> []
```

Statement 2 also cites, present tense, *"the `WINDOWS.md` entry appended by plan 01-18"* as carrying "the same statement". That is `WINDOWS.md` entry 22, whose own opening clause reads **"SUPERSEDED IN WAVE 19 BY PLAN 01-19"** and whose status field is `fixed`. And `:958-968`, 504 lines below statement 2, states the opposite of it: *"The DERIVED text ships in exactly TWO surfaces"* and *"`.planning/STATE.md` and `.planning/WINDOWS.md` carry a POINTER to those two and restate NO bound of their own."*

By the header's own rule at `:459-460` — *"If a reader finds those four disagreeing, the code wins and the prose is the defect"* — this is the defect.

### The direction of the error, stated so severity is not inflated

CR-29 runs in the **safe direction**: the gate reaches FURTHER than its header claims. Nobody can ship an outbound call believing it would be caught when it would not — the reverse. Nothing leaked, no outbound call exists in any non-spec source under either root, `check:bundle` reports one specifier, and the walk catches every one of the three shapes the table disowns.

It is a blocker on **criterion (3) as the operator wrote it**, which asks for a disclosure *contradicted nowhere* and does not condition on direction. It is also the exact shape of finding this phase has now caught twelve times: prose claiming something different from what the code executes, on a surface a reader trusts. And it is CR-14's own shape — the finding wave 33 recorded as closed, closed in the two prose paragraphs and left standing in the table 320 lines above them.

### What I did NOT find, recorded so a thirteenth pass does not re-spend the effort

- The `enclosing` contradiction is genuinely gone (three defensible survivors, censused above).
- `T-01-286`'s two-valued shadow bound is gone: a sweep for `573` returns one hit and it is the substring of `1573`.
- No debt marker — `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, `PLACEHOLDER` — exists anywhere under `packages/backend/src` or `packages/engine/src`.
- Every one of pass 11's five blockers and five warnings closes under execution. This is the first round in eleven that closed all of them.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `packages/backend/src/hooks/passive.ts` | non-async hook, bounded queue | ✓ VERIFIED | `:117`, `:40`; wired at `index.ts:321` |
| `packages/backend/src/ingest/consumer.ts` | reload by id, raw bytes | ✓ VERIFIED | `:189` `body.toRaw()` |
| `packages/backend/src/store/analyses.ts` | project-keyed, dedup | ✓ VERIFIED | `:113` `ON CONFLICT … DO NOTHING` |
| `packages/backend/src/store/observations.ts` | query-value redaction | ✓ VERIFIED | `:55`, `:205`; 64 assertions in `observations.spec.ts` |
| `packages/backend/src/compat.ts` | min-version refusal | ✓ VERIFIED | `:45` `MIN_CAIDO = "0.57.1"` |
| `packages/backend/src/telemetry.ts` | overflow counter, slice max | ✓ VERIFIED | `:100` |
| `scripts/ci/check-bundle-imports.mjs` | one specifier | ✓ VERIFIED | executed: `crypto` |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 gate, derived + drift-detectable + sole bound | ⚠️ **PARTIAL** | derived ✓, drift-detectable ✓, **sole bound ✗ — CR-29 at `:440-447`, `:449-452`, `:454-460`, `:745-755`** |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `index.ts:321` | `hooks/passive.ts:117` | `sdk.events.onInterceptResponse` | ✓ WIRED | registered last, per the ordering note at `index.ts:31` |
| gate registry | `REQUIREMENTS.md` CORE-11 span | `deriveResidual(RESOLVER_REGISTRY)` byte compare | ✓ WIRED | proved by mutation: sentinel decoy at `:961` fires two cases |
| gate registry | gate header span `:983-1564` | same byte compare | ✓ WIRED | 582 lines, 26 named silences |
| gate header prose `:440-447` | shipped `auditSource` | *(nothing — prose, no assertion)* | ✗ **NOT WIRED** | three rows false; nothing in the suite can see them. `:449-452` promises they are "asserted below as silences"; the row they rested on was deleted at wave 32 |
| `CORE11_BOX_EXPECTED:11414` | `REQUIREMENTS.md:46` | full-line `startsWith` | ✓ WIRED | pins `- [ ] **CORE-11**`; a box flip without changing this constant in the same commit turns the suite red |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full suite | `pnpm test` | 31 files / 1390 tests, exit 0 | ✓ PASS |
| Types | `pnpm typecheck` | exit 0 | ✓ PASS |
| Lint | `pnpm lint` | exit 0 | ✓ PASS |
| Bundle import set | `pnpm check:bundle` | `1 import specifier(s): crypto` | ✓ PASS |
| CR-28 detector live | swap `:9953` to prefix matcher | `Tests 1 failed \| 441 passed (442)` — CR-23-shape fixture red | ✓ PASS (was green at pass 11) |
| CR-26 identity pin live | 291 filler lines + split at raw 700 | `Tests 1 failed \| 441 passed (442)` — identity assertion red | ✓ PASS (was green at pass 11) |
| WR-62 endpoint pin live | bare `BEGIN DERIVED RESIDUAL` at `:961` | `Tests 2 failed \| 440 passed (442)` — endpoint pin fires first | ✓ PASS |
| CR-29 probes | 3 header-table "NOTHING" rows through `auditSource` | `outbound-fetch`, `outbound-beacon`, `outbound-dynamic-code` | ✗ **FAIL** — table says `[]` |
| WR-37 sibling silences | 5 receiver-binding probes | all `[]` | ✓ PASS (silences hold; disclosed in derived span, absent from header list) |

### Probe Execution

| Probe | Command | Result | Status |
| --- | --- | --- | --- |
| `scripts/*/tests/probe-*.sh` | `find scripts -path '*/tests/probe-*.sh'` | no conventional probe scripts declared for this phase | ? SKIP |

### Requirements Coverage

24 requirement IDs are declared across the 45 plan frontmatters. All 24 exist in `REQUIREMENTS.md`; none is orphaned; no plan claims an ID the ledger does not carry.

| Requirement | Status | Evidence |
| --- | --- | --- |
| `CORE-01`…`CORE-10`, `COMPAT-01/02`, `DIST-05/06`, `ENC-01`, `STORE-01`…`STORE-07` | ✓ SATISFIED | 22 of 24, all `[x]` in the ledger, all covered by truths 1-8 above |
| `CORE-11` | ✗ **BLOCKED** | `[ ]` at `REQUIREMENTS.md:46`. Criterion (3) unmet — CR-29. |
| `STORE-08` | ⤳ DEFERRED | `[ ]` by design; `entities`/`evidence` owned by Phase 4, `audit` by Phase 5 (`REQUIREMENTS.md:790`) |

The 111 further IDs in `REQUIREMENTS.md` that no phase-01 plan claims (`ACTIVE-*`, `DET-*`, `MAP-*`, `SEC-*`, `SPIKE-*`, …) belong to later phases and are correctly outside this phase's scope.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `packages/backend/src/outbound-prohibition.spec.ts` | 440-447 | three reference-table rows asserting `NOTHING` / `[]` for shapes that report, labelled `OPEN and UNOWNED` | 🛑 Blocker | tells a reader an unclosed finding exists where none does, on the gate's most-consulted surface |
| `packages/backend/src/outbound-prohibition.spec.ts` | 449-452 | "asserted below as silences and labelled as such" — the row was deleted at wave 32 | 🛑 Blocker | the sentence that makes the table trustworthy is the false one |
| `packages/backend/src/outbound-prohibition.spec.ts` | 454-460 | "This is THE ONE BOUND", citing a `WINDOWS.md` entry self-marked SUPERSEDED since wave 19 | 🛑 Blocker | second bound on a surface criterion (3) requires to carry one |
| `packages/backend/src/outbound-prohibition.spec.ts` | 745-755 | five-item closed enumeration of silences beside a 26-item derived one | 🛑 Blocker | reads exhaustive; omits the five WR-37 receiver siblings the ledger names as the box's blockers |
| `.planning/STATE.md` | P9-D3, wave-33 amendment | "THE GATE FILE'S HAND-WRITTEN HEADER NOW STATES NO BOUND OF ITS OWN" | ⚠️ Warning | false of the live bytes; CR-14 closed in the prose, left standing in the table |
| shipped source (`packages/backend/src`, `packages/engine/src`) | — | `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` | ℹ️ Info | **zero occurrences** |

### Human Verification Required

None. UAT round 2 (`01-UAT.md`, 2026-08-27) ran 18 operator-observable checkpoints at 18 passed / 0 issues, and at test 18 the operator explicitly confirmed CORE-11 is a VERIFICATION item rather than a UAT gap. Every remaining question on this phase is programmatically measurable and was measured here.

---

## Gaps Summary

**One truth is open and it is the same one for the tenth pass: CORE-11's outbound enforcement.**

What changed this round is the arithmetic behind it. Pass 11 raised five blockers and five warnings. **All ten close**, each reproduced-then-refuted by execution against the shipped file rather than read out of a summary: CR-28's fixture now goes red on the mutation that was green last pass; CR-26's identity pin fires on the 574 → 284 collapse the whole suite slept through; CR-24, CR-25 and CR-27 closed by deletion exactly as prescribed; WR-61 through WR-65 all measurably fixed. The round opened **one** finding rather than five. `efe93e8`, the orchestrator-applied closure this pass was told to audit, does what it says — I censused it rather than trusting it.

**And criterion (3) is still unmet, for a reason no previous pass named.** Every round since 2026-08-25 has hunted the mechanism leg inside the anchoring machinery — `constructAnchorFor`, the shadow pin, the exemption keys. The contradiction that actually survives is 9,000 lines above all of that, in the header's live reference table, and it is not a redundancy or a paraphrase: **it is false**. Three rows tell a reader that `(ok && globalThis).fetch(url)`, `(b ? navigator : x).sendBeacon(u, d)` and `(b ? eval : x)(src)` are caught by `NOTHING` and report `[]`, under the label `OPEN and UNOWNED`. Executed through the shipped `auditSource`, they report `outbound-fetch`, `outbound-beacon` and `outbound-dynamic-code`. The file's own guard at `:9930-9936` asserts, in its own bytes, that every spelling that row named now reports.

Three of the surfaces CORE-11's first sentence enumerates by name — *"no global `fetch` by any receiver or alias"*, *"no `navigator.sendBeacon`"*, *"no dynamic code construction"* — are described to a reader as unenforced in a table whose stated purpose is that *"a reader can now see that all four go through ONE descent, so the next operator question is answered in one place or in none."* A reader gets it answered in one place, and gets the wrong answer.

**Nothing leaked and the severity is not inflated.** The error runs in the safe direction: the gate reaches further than its header admits. The must-NOT holds — 23 modules over both `SOURCE_ROOTS` at zero violations, one bundle import specifier, `crypto`, a green 1,390-test suite. CR-29 is a false disclosure inside a test-only gate.

**But `[ ]` is a correct outcome and an unexamined `[x]` is not** — the gate says so in its own failure message at `:11489`, and the fix is four deletions, not a wave of new machinery.

**The box is NOT earned.** `.planning/REQUIREMENTS.md:46` stays `- [ ] **CORE-11**` and `CORE11_BOX_EXPECTED` at `packages/backend/src/outbound-prohibition.spec.ts:11414` stays `"- [ ] **CORE-11**"`. When criterion (3) does discharge, both change in the same commit.

---

_Verified: 2026-08-27T08:40:00Z_
_Verifier: Claude (gsd-verifier), verification pass 12_
