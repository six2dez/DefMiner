---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-26T22:30:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  previous_verified: 2026-08-26T17:50:00Z
  round: 10
  verification_pass: 11
  history: "pass 4 (round 3) -> pass 5 (round 4) -> pass 6 (round 5) -> pass 7 (round 6) -> pass 8 (round 7) -> pass 9 (round 8) -> pass 10 (round 9) -> pass 11 (round 10). The score has read 8/9 for NINE consecutive passes and the open truth has been the same one every time: truth 9, CORE-11 outbound enforcement. CORE-11's box has been flipped and reverted THREE times — `e7cc4b6`, `faca607`, `4105fd0` — and has now stood at `[ ]` for FOUR consecutive rounds with the pin, the ledger row and every verification agreeing."
  gaps_closed:
    - "CR-23 — CLOSED, AND I WATCHED BOTH SIDES GO RED RATHER THAN READING THE DIFF. Round 9's two `.from` assertions compared `EXCLUSIONS[n].from` against the same prefix expression `EXCLUSIONS` was built from. Wave 43 replaced both with full-line equalities proved unique before use. I planted BOTH decoys against the shipped file, restoring between runs. (1) `export const RESOLVER_REGISTRY_SHADOW: readonly number[] = Object.freeze([1]);` at line 4057, 104 lines above the real opener: `Tests 1 failed | 440 passed (441)`, `exclusion three's realized \\`from\\` is 4057 while RESOLVER_REGISTRY's own opening line … is 4162 … expected 4057 to be 4162`. Pass 10 ran that identical decoy at 439 of 439 GREEN. (2) `export const UNBOUNDED_QUANTIFIERS_LEGACY …` planted 25 lines above the list: `Tests 2 failed | 439 passed (441)`, `exclusion two's realized \\`from\\` is 5960 while UNBOUNDED_QUANTIFIERS' own opening line … is 5986`. The two sides ARE independent expressions — `startsWith` inside `EXCLUSIONS`, `===` against a full-line literal carrying the type annotation and the `Object.freeze([` tail — and the file says so in its own bytes at `:10348-10352`. The tautology is gone. THE FIXTURE WRITTEN TO DEFEND THIS FIX IS A SEPARATE MATTER AND IT IS A BLOCKER: see CR-28 in `gaps`."
    - "CR-22 PART 1 — CLOSED, BOTH SURFACES, READ IN THE BYTES. Limit (5) at `:9090-9111` and the `constructAnchorFor` docblock at `:9382-9399` both now publish the residual as the ANCHOR'S SHADOW and say in their own bytes that `THE 234 IS CORRECT AND IT IS NOT A BOUND — it is the largest distance any shipped sentence HAPPENS to sit from its anchor, and it bounds nothing`. Neither surface still infers a bound from the 234. The site-identity claim is retired in both places it appeared, and the retirement bracket at `:10633-10645` names the enumeration behind it rather than asserting completeness without one — though its stated completeness exceeds its executed completeness by three, which is CR-27."
    - "CR-22 PART 2, THE MECHANISM — CLOSED, AND I PUSHED AT IT FROM FOUR DIRECTIONS BEFORE SAYING SO. `WIDEST_ANCHOR_SHADOW = 574` at `:10204` is pinned by exact equality over a grouping of every element of `SURFACE_LINES`, and it is a REAL detector on the maximum. One `//` line inserted at `:500`: `Tests 1 failed | 440 passed (441)`, `THE WIDEST ANCHOR SHADOW IS NOW 575 SURFACE LINES AND THIS GATE PINS IT AT 574 … spanning raw lines 419..1575`. A `BEGIN DERIVED RESIDUAL` sentinel decoy planted inside the block comment at `:961`, sliding `EXCLUSIONS[0].from` by 23 lines: RED at 552. I could not construct a growth of the maximum that it did not catch. The arithmetic reproduces exactly: `1156 - 582 = 574`, raw span `419..1574`, four shipped occurrences. WHAT THE PIN DOES NOT WATCH IS CR-25 AND CR-26, and those are blockers."
    - "WR-55 — CLOSED IN SUBSTANCE, AND I RE-RAN THE SWEEP MYSELF RATHER THAN CARRYING IT. Both sites (`:9262-9282`, `:10671-10687`) now state the executed bound — exactly one line resolves to the sentinel and it is line 1 — with the mechanism named (recogniser (5) accepts line 1 unconditionally, so from line 2 downward the forward walk returns on its first iteration) and the dependence WATCHED rather than cited (blanking line 1 grows the set to `[1, 2, 3]`). I evaluated the shipped `constructAnchorFor` at every line of the live file from inside the suite: `{\"gateLines\":11517,\"hits\":[1]}`. The result holds. THE PUBLISHED SCOPE OF THAT SWEEP DOES NOT — see WR-61 in `gaps`."
    - "WR-60 — THE NUMBERS ARE CLOSED AND THE BRANCH IS THE RIGHT ONE. `01-39-SUMMARY.md:531` and its discrepancy row `D-1` at `:931` both exist and both say what wave 43 says they say: 57 is the delete-first frame, 58 the unmodified frame, neither wrong about its own measurement. No number changed and each site gained its frame. The executor also disclosed, in its own bytes at `01-43-SUMMARY.md:527`, that branch B WAS the smaller edit and that this is precisely why the plan forbids choosing on edit size — a round declining to hide the convenient fact. THE SENTENCE ADDED TO SETTLE IT INTRODUCED A FALSE LIVE LOCATOR: see CR-24 in `gaps`."
    - "WR-58 — PARTIALLY CLOSED, AND THE GAP IS ONE BOUNDARY VALUE. The census `constructHalf` at `:10814-10822` now throws a named MALFORMATION error instead of silently returning the key minus its last character, and the round distinguished malformation from ambiguity in both directions in its prose. The second `constructHalf` at `:10989-10990` is left unguarded with the reason stated as a fact about today's inputs, which I verified is true. THE GUARD IS `at < 0` WHERE THE FINDING PRESCRIBED `at <= 0` — see WR-63 in `gaps`, which I executed."
    - "F-11 — CONFIRMED, AND NOTHING WAS ROUNDED TO MAKE THE PLAN TRUE. `:10021-10032` now reads: the case resolves through SEVEN locator expressions, FOUR proved unique (registry closer, nine entry literals, registry opener, list opener), THREE not (`EXCLUSIONS`' two prefix openers, `CLOSES_FROZEN_ARRAY`), and at wave 43's arrival it was FIVE of which TWO were proved. The plan had said five/three. The measured pair is in the bytes and the divergence is recorded as open finding F-11 in `.planning/WINDOWS.md:82`. That is the discipline this phase asks for."
    - "BASELINE — RE-ESTABLISHED INDEPENDENTLY THIS SESSION, NOT CARRIED FORWARD. `pnpm test` 31 files / 1381 tests exit 0, run BEFORE any mutation and again after every restore. `pnpm exec tsc --build` exit 0. `pnpm check:bundle` -> `packages/backend/dist/index.js: 1 import specifier(s): crypto`. Gate suite alone: 441 passed (441). `find packages/*/src -name '*.ts' ! -name '*.spec.ts' | wc -l` -> 23, walked at ZERO violations inside the green suite. Prior-phase regression: `tests/go-no-go.spec.ts tests/pins.spec.ts tests/spike-results.spec.ts` -> 3 files / 80 tests passed. `git diff --name-only 4105fd0..HEAD -- packages/ scripts/ | grep -v '\\.spec\\.ts$'` is EMPTY — NO SHIPPED SOURCE BYTE CHANGED THIS ROUND, seventeen commits, one file. Debt markers: `TBD|FIXME|XXX` 0, `TODO|HACK|PLACEHOLDER` 0, `.skip(|.only(|.todo(` 0."
  gaps_remaining:
    - "UAT gap 2 / truth 9 (CORE-11 outbound enforcement) — STILL OPEN, for the NINTH consecutive round. Criteria (1) DERIVED and (2) DRIFT-DETECTABLE remain discharged and I found no evidence against either. Criterion (3) THE SOLE BOUND is STILL unmet, and for the FOURTH consecutive round it is the MECHANISM leg alone. Round 10 was the operator's EXIT 2 — stop claiming a site, correct the disclosure — chosen as a cheap bounded close of four edits. It delivered two genuine mechanism fixes (CR-23's endpoint pins, CR-22's shadow pin) and then produced FIVE BLOCKERS, EVERY ONE OF THEM IN PROSE THE ROUND ITSELF WROTE, in the round whose entire purpose was to stop claiming more than the code executes. I reproduced all five on the real tree. CORE-11's `[x]` is NOT earned and the box must stay `[ ]`."
  regressions:
    - "NO behavioural regression. Truths 1-8 re-checked this session against the live files; no shipped source byte changed since pass 10; the full suite grew 1379 -> 1381 with zero failures and the gate suite 439 -> 441."
    - "NO ledger regression. `.planning/REQUIREMENTS.md:46` reads `- [ ] **CORE-11**`, `CORE11_BOX_EXPECTED` at `:11414` reads `\"- [ ] **CORE-11**\"`, and the suite asserts the row against the pin. Round 10 did not flip it and neither plan ran `requirements mark-complete`."
    - "NO regression in the must-NOT itself, RE-EXECUTED THROUGH THE SHIPPED `auditSource` IN A THROWAWAY IN-TREE SPEC, since deleted. `(ok && globalThis).fetch(url)` -> [\"outbound-fetch\"]; `(globalThis ?? self).fetch(url)` -> [\"outbound-fetch\"]; `(ok && navigator).sendBeacon(u,d)` -> [\"outbound-beacon\"]; `fetch.call(null,url)` -> [\"outbound-fetch\"]; `const f = fetch; f.call(null,url)` -> [\"outbound-fetch\"]; `const m=\"send\"+\"Beacon\"; navigator[m](u,d)` -> [\"outbound-unanalysable\"]; `sdk.requests.send(req)` -> [\"outbound-send\"]; clean source -> []. `WebSocket.call(null,u)` -> [] and remains the disclosed named row `silence-outbound-ctor-receiver-position` at `:5696`, one of 26 `measured-silence` rows in a 61-row registry; `silence-operator-around-global-receiver` has ZERO `id:` occurrences and its absence is asserted by a named case at `:9935`."
    - "ONE CORRECTION TO THE REVIEWER, MADE BY EXECUTION AND RECORDED AGAINST MY OWN SIDE AS WELL. CR-26's report says the shrink happened `and the gate said nothing`. At the reviewer's own placement it is true of the PIN and FALSE of the SUITE: I reproduced that exact two-line edit inside `419..1574` and got `Tests 2 failed | 440 passed (442)` — the exemption case fired, naming two shipped occurrences whose anchored keys had changed. The reviewer measured with an out-of-tree harness that computes only the pin, so it could not see that. I then found a placement where the suite IS silent, and it is strictly worse than the one filed: see CR-26 in `gaps`."
gaps:
  - truth: "No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)"
    status: partial
    reason: "I WAS ASKED TO ADJUDICATE CR-24 THROUGH CR-28 BY REPRODUCING OR REFUTING EACH ON THE REAL TREE RATHER THAN INHERITING THEM. ALL FIVE REPRODUCE. Nine mutations were planted in `packages/backend/src/outbound-prohibition.spec.ts` and all nine restored; `git diff --exit-code -- packages/` returns 0 and the file's md5 matches its pre-session backup byte for byte. CR-28 REPRODUCED IN TWO STEPS, BOTH GREEN. Step 1: `:10362` `const registryOpen = lineOf((l) => l === REGISTRY_OPEN);` swapped to `lineOf((l) => l.startsWith(\"export const RESOLVER_REGISTRY\"))` -> `Tests 441 passed (441)`. Step 2: with that in place, `export const RESOLVER_REGISTRY_SHADOW: readonly number[] = Object.freeze([1]);` planted at line 4057 -> `Tests 441 passed (441)`. CR-23's tautology restored, its decoy back in the tree, and I measured the damage from inside the suite by instrumenting `SURFACE_LINES`: `{\"surface\":9285,\"excl\":[[983,1564],[5985,5995],[4161,5793]]}` without the decoy, `{\"surface\":9181,\"excl\":[[983,1564],[5986,5996],[4057,5794]]}` with it — ONE HUNDRED AND FOUR pre-existing gate-file lines silently off the scanned surface, exclusion three's opening endpoint slid 4161 -> 4057, at 441 of 441 green. The fixture at `:10441-10500`, whose comment at `:10433-10434` says `a future author who swaps either pin above back to a prefix matcher makes that case a tautology again; this one turns red instead of arguing`, said nothing, because it never looked: it declares its own `REAL_OPENER` at `:10442-10443`, its own prefix finder at `:10461-10463` and its own full-line finder at `:10464`, all over a frozen seven-element literal three lines above, and reads NOTHING from the case it claims to protect. Its four assertions are facts about a hardcoded array and about `String.prototype.startsWith`. CR-24 REPRODUCED BY MEASUREMENT WITH THE SHIPPED BUILDER. `:11225-11227` asserts, present tense and dated `today, 2026-08-26 wave 43`, that `the two identically-headed table headers sit at lines 299 and 361`. Measured through the shipped `normalizeGateLine` and `constructAnchorFor` from inside the suite: `{\"n299\":\"SPELLING (rebind, receiver-key position) RESOLVED BY REPORTS\",\"n361\":\"SPELLING (??=, receiver-key position) RESOLVED BY REPORTS\",\"identical\":false,\"a304\":\"SPELLING (rebind, …)\",\"a305\":\"SPELLING (rebind, …)\",\"a363\":\"SPELLING (??=, …)\"}`. Not identical, and `:304`/`:305` resolve to a DIFFERENT anchor from `:363`, so a cell moved between them would NOT keep a byte-identical key — which is the entire property the sentence exists to illustrate. I then swept the property rather than the pair: for every ruled table in the file I took the recogniser-(4) header (the nearest non-blank non-rule row above the rule), normalized it and grouped. `{\"ruledTables\":25,\"dupes\":[[\"}\",[4037,6429]],[\"});\",[6563,6892,6998,7093,7183,7321,8979,9939,11324,11383]],[\");\",[9685,9881]]]}` — the only repeated headers in this file are closing punctuation lines, which are not tables, and no pair of them is 57 or 58 lines apart. ZERO non-trivial duplicate headers exist. CR-25 REPRODUCED AT THE EXACT BOUNDARY. Reach statement (2) at `:10173-10175` publishes a silent-growth ceiling: `the second-widest measured at 283 surface lines at wave 42, and it may grow to 573 without this case reporting a thing`. I inserted 291 filler `//` lines into the second-widest shadow's region (`2..284`, predecessors already `//` so recogniser (5) does not accept them) and measured from inside the suite: `{\"surface\":9585,\"top\":[[574,2,575,\"packages/backend/src/outbound-prohibition.spec.ts — CORE-11'\"],[574,710,1865,\"SPELLING (operator, by POSITION) RESOLVED BY REPORTS\"],[202,7303,9238,\"it.each([\"],[133,9277,9409,…]]}` — TWO shadows at 574, one of them DOUBLED in width, and the shipped pin case reported `✓`. Limit (5) states the same fact correctly 1,065 lines away at `:9110-9111`: `a non-maximal shadow may grow UP TO THAT MAXIMUM with nothing reporting`. Two numbers for one measurement inside one round, which is WR-60's exact shape, in the round that closed WR-60 for it. CR-26 REPRODUCED AND STRENGTHENED — THIS IS MY SHARPEST RESULT OF THE SESSION. The rationale at `:10165-10168` says `an upper bound hides a shadow that SHRANK … an exact equality makes both directions loud`. It makes the MAXIMUM's directions loud and says nothing about any particular shadow, including the only one the file ever names. The reviewer measured 574 -> 492 with the pin green. I measured a strictly worse case AT FULL-SUITE GREEN: I grew the title shadow by 291 lines to hold the maximum at 574, and inserted one blank line plus one `// a new prose block opening here` at raw line 700 — BELOW all four shipped occurrences (`:436`, `:468`, `:523`, `:600`) so no occurrence's anchor changes. Result: `Tests 441 passed (441)`, and the measurement is `[[574,2,575,\"…CORE-11'\"],[292,994,1867,\"a new prose block opening here\"],[284,710,993,\"SPELLING (operator, by POSITION) RESOLVED BY REPORTS\"],[202,…]]`. THE `:417` SHADOW — the one holding all four shipped occurrences, the one five prose sites and a shipped failure message name as 574 — FELL FROM 574 TO 284, a 290-line collapse of more than half, and the ENTIRE SUITE was silent, not merely the pin. The identity is asserted as live fact at `:9097-9098`, `:9390`, `:10162`/`:10198-10200`, `:10624` and — inside a shipped failure message a reader sees while the suite is red — `:10651`. Nothing pins it. The pin's own failure message at `:10252` compounds it: `If the number FELL, that is equally reportable: the equality is exact so that a shadow which shrank is visible too` — true of the maximum, false of the shadow the file names, and I measured it false. CR-27 REPRODUCED BY GREP AND READING. The retirement bracket at `:10633-10645` closes with `NOTHING WAS DELETED SILENTLY … it found ONE positive site claim, written in TWO places … and FIVE negative ones … none of them claims that a well-formed anchor identifies anything`. The five negative statements check out and the executors' own mid-wave correction from four to five is honest. But `:10985`, `:10999` and `:11136` each assert by contraposition that the anchor's normal behaviour IS to resolve the ENCLOSING construct — a containment the same wave's reach statement (5) at `:10182-10184` denies in its own bytes and the anchoring docblock disowns BY NAME at `:9396-9398` (`the word \\`enclosing\\` would claim a containment this scan does not compute`). WR-49 got that word out of the docblock in round 8; it was never taken out of the failure messages, and the enumeration underwriting `nothing was deleted silently` did not reach them. Two further instances sit at `:9242` and `:9411`. SEVERITY, STATED THE SAME WAY EVERY ROUND AND NOT INFLATED: NOTHING LEAKS, AND I RE-ESTABLISHED IT RATHER THAN CARRYING IT. `pnpm test` 31 files / 1381 tests exit 0; `tsc --build` exit 0; `pnpm check:bundle` reports the shipped bundle's entire import set as ONE specifier, `crypto`; 23 shipped modules across both SOURCE_ROOTS walked at ZERO violations; no shipped source byte changed this round; every outbound shape I probed through the shipped `auditSource` reports. Every finding here is a defect in a TEST-ONLY gate's enforcement or disclosure of its own description. It is a blocker on the claim-versus-enforcement standard this phase set for itself and has now enforced eleven times, and on nothing else."
    severity: major
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-28 — BLOCKER, REPRODUCED IN TWO STEPS AT 441/441 GREEN BOTH TIMES, AND THIS IS THE MOST IMPORTANT ONE. `:10433-10434` states, as the fixture's reason for existing, that a future author who swaps either opening pin back to a prefix matcher `makes that case a tautology again; this one turns red instead of arguing`. It cannot. The fixture (`:10441-10500`) declares its own `REAL_OPENER`, its own prefix finder and its own full-line finder over a frozen seven-element literal and reads NOTHING from the case above — not `REGISTRY_OPEN`, not `registryOpen`, not `EXCLUSIONS`. Executed: `:10362` swapped to `startsWith(...)` -> 441/441 green; then `RESOLVER_REGISTRY_SHADOW` planted at `:4057` -> 441/441 green, with `EXCLUSIONS[2].from` slid 4161 -> 4057 and SURFACE_LINES 9285 -> 9181 measured from inside the suite. CR-23's tautology restored, its decoy back, 104 lines off the scanned surface, fixture silent. This is CR-23's defect one layer out: CR-23 was a pin compared against an expression derived from what it pins; CR-28 is a fixture that pins nothing at all, under a comment naming the exact edit it catches. A permanent case whose justification is false is worse than no case, because the next reviewer reads the justification."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-26 — BLOCKER, REPRODUCED AND STRENGTHENED BY ME AT FULL-SUITE GREEN. `:10165-10168` claims `an exact equality makes both directions loud`. Executed: the `:417` shadow — the residual the file names in FIVE prose sites (`:9097-9098`, `:9390`, `:10162`/`:10198-10200`, `:10624`) and in a shipped failure message (`:10651`) — FELL FROM 574 TO 284 with `Tests 441 passed (441)`. Two inserted lines below all four shipped occurrences, plus 291 lines holding the maximum. More than half the published residual vanished and the whole suite was silent. The reviewer measured 574 -> 492 and could only observe the pin; I measured 574 -> 284 and observed the suite. NOTHING PINS THE IDENTITY. The pin's own failure message at `:10252` restates the false generalization — `a shadow which shrank is visible too` — in the sentence a person reads while the suite is red."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-24 — BLOCKER, REPRODUCED BY MEASUREMENT WITH THE SHIPPED BUILDER. `:11225-11227` and `:10777-10779` assert, present tense and dated as a live re-check, that `the two identically-headed table headers sit at lines 299 and 361`. Measured: `:299` normalizes to `SPELLING (rebind, receiver-key position) RESOLVED BY REPORTS`, `:361` to `SPELLING (??=, receiver-key position) RESOLVED BY REPORTS`; `constructAnchorFor` at 304 and 305 gives the first, at 363 the second. A sweep over all 25 recogniser-(4) table headers in the file finds ZERO non-trivial duplicates — the only repeats are `}`, `});` and `);`, none of which is a table and none of which is 57 or 58 lines from another. WR-60's per-frame reconciliation (correct on the record at `01-39-SUMMARY.md:531`/`:931`) now rests on a locator the file falsifies. Instance eleven of the signature defect, inside the finding written to close instance ten."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-25 — BLOCKER, REPRODUCED AT THE EXACT BOUNDARY. Reach statement (2) at `:10173-10175` publishes a silent-growth ceiling of 573, implying growth to 574 would report. Executed: 291 filler lines took the second-widest shadow to exactly 574 — two shadows at the maximum, one doubled — and the pin reported `✓`. Limit (5) at `:9110-9111` states the same fact correctly (`up to that maximum`) 1,065 lines away. The re-scoped bar asks for a disclosure accurate AND contradicted nowhere; this one is both inaccurate and contradicted, by its own round, in the round that closed WR-60 for exactly that shape."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-27 — BLOCKER (disclosure completeness), CONFIRMED BY GREP. The retirement bracket at `:10633-10645` claims a bounded enumeration found ONE positive site claim in TWO places and FIVE negative ones, `none of them claims that a well-formed anchor identifies anything`. Three shipped assertion messages — `:10985`, `:10999`, `:11136` — assert by contraposition that the anchor's normal behaviour IS to resolve the ENCLOSING construct, the containment reach statement (5) denies at `:10182-10184` and the docblock disowns by name at `:9396-9398`. Two more sit at `:9242` and `:9411`. An enumeration whose stated completeness exceeds its executed completeness is the signature defect one meta-level up, and it is load-bearing: the bracket IS the evidence that exit 2 was taken cleanly."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-61 — WARNING, CONFIRMED BY MEASUREMENT. Both published sweep scopes were stale in the commit that wrote them. `:9095` and `:10196` say `over all 8,846 surface lines`; measured today, 9,277 (`9277 - 8846 = 431`, round 10's own net line count). `:9270-9271` and `:10680-10681` say `11,417 elements of gateLines (wc -l 11,416)`; measured today, 11,503 and `wc -l` 11,502 (`11503 - 11417 = 86`, commit `137c427`'s own diffstat — the sweep ran, then the 86 lines describing it were added to the file it had just swept). BOTH RESULTS STILL HOLD — I re-ran both. What is wrong is the stated scope of two sweeps whose whole value is that they were exhaustive."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-63 — WARNING, EXECUTED BY ME RATHER THAN READ, AND IT IS WR-58's OWN MISDIAGNOSIS ONE BOUNDARY VALUE OVER. The guard at `:10815-10822` is `if (at < 0)` where the round-9 fix text prescribed `at <= 0`. `EXEMPTION_ANCHOR_SEP` is `\" §§ \"`. I planted the hand-written key `\" §§ some line :: q3\"` into `HEADER_QUANTIFIER_EXEMPTIONS`: `Tests 3 failed | 438 passed (441)`, and the census fired with the AMBIGUITY message on an EMPTY construct half — `1 anchor(s) IN USE are not produced by exactly one line … \"\" produced by 0 line(s) … A ZERO PRODUCER COUNT IS THIS SAME FAILURE FROM THE OTHER SIDE: the key was hand-written against a header that is not in the file` — which is the exact misdiagnosis WR-58 was raised to end. MY OWN ADDITION: the prefix case at `:10740-10741` has the mirror defect. Its guard `toBeGreaterThan(0)` correctly catches `at === 0`, but its message reads `carries no \" §§ \" separator`, which is false of a key that OPENS with one. The correctly-guarded site has the wrong message and the correctly-messaged site has the wrong guard."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-62 — WARNING, EXECUTED, AND THE REVIEWER'S HONESTY ON IT IS CONFIRMED. `EXCLUSIONS`' exclusion ONE — the largest at 582 lines — has BOTH endpoints located by unpinned `startsWith` prefix matchers (`:10060-10061`) while `:10029-10030` describes what was left as `EXCLUSIONS' own TWO opening locators`. I planted a bare `BEGIN DERIVED RESIDUAL` decoy inside the block comment at `:961`. It slid `EXCLUSIONS[0].from` and took 23 lines off the surface, and EXACTLY ONE case reported: the new 574 pin, `THE WIDEST ANCHOR SHADOW IS NOW 552 … PINS IT AT 574`. NO endpoint pin fired. The reviewer's `luck of geometry` reading is right — exclusion one lies inside the widest shadow's raw span, so any slide of it moves the 574 — and nothing in the file discloses that this is where the protection comes from. The correct locator already exists as `DERIVED_BEGIN` at `:6043`."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-65 — WARNING, EXECUTED. `:10186-10192` argues `a pin that must be re-derived on routine edits is a pin nobody trusts and everybody re-derives without reading`, eighteen lines above a pin that is exactly that for the 574 lines it names. One `//` comment line inserted at `:500` — inside this file's opening header prose, which is edited most rounds — gives `Tests 1 failed | 440 passed (441)`. The behaviour is defensible on the merits and I would keep the pin; what is not defensible is supplying, in the pin's own comment block, the argument the next round will quote while ripping it out."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-64 — WARNING, CONFIRMED IN THE BYTES. `:10201-10203` says every surface line in `419..1574` resolves to the `:417` anchor `because between the rule at :418 and the imports no line at all is accepted by any of the five recognisers`. Measured, exactly one line in that range IS accepted: `:1573`, the `/**` opening the `THE SOURCE ROOTS THE PLUGIN SHIPS` docblock — and it sits BELOW the imports at `:1567-1571`, not between them and the rule. The real mechanism for the last two lines is the WR-53 extension (`constructTokenOf(\"/**\")` is null, so the walk falls through and the backward scan continues). `:10250-10254` instructs a future author to re-derive the pin against growth attributed line by line; an author re-deriving from the stated reason gets the geometry wrong at the boundary."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "IN-45, IN-46, IN-47, IN-48, IN-49 — INFO, REPORTED BY THE REVIEWER AND NOT INDEPENDENTLY RE-EXECUTED BY ME, RECORDED AS SUCH. Two of the pin's `FOUR COUNTS` of non-vacuity are unreachable and one says so in its own message; `lo`/`hi` are printed as `raw lines` when they are surface-subset extremes; `EVERY LINE OF THE SYNTHETIC ARRAY IS AN INDENTED, QUOTED STRING ELEMENT` is false of element five (`REAL_OPENER,`, a bare identifier — I did confirm this one by reading `:10448`); `constructHalf` is now declared twice with DIVERGENT bodies, which is worse than the duplication WR-57 was raised about; and one measurement is spelled `1,129` four times and `~1,130` once. None changes the verdict, and I did not spend execution budget on them while five blockers were open."
    missing:
      - "CORE-11 STAYS `[ ]`. A NINTH ROUND, AND NOT A FOURTH REVERT: the box is already `[ ]` at `4105fd0`, `CORE11_BOX_EXPECTED` at `:11414` already agrees, round 10 did not flip it and neither plan ran `requirements mark-complete`. THE DETERMINATION IS MINE TO STATE AND I AM STATING IT: THE BOX MAY NOT MOVE. Criterion (3) is unmet on its MECHANISM leg. The single sharpest fact is this: the residual the file publishes in five prose sites and in a shipped failure message — the `:417` anchor's 574-line shadow — fell to 284 under a two-line edit at 441 of 441 GREEN, measured by me this session. The number the file publishes as its residual is not watched by anything."
      - "CR-28 — THE ONLY ONE OF THE FIVE THAT IS A CODE FIX, AND IT IS THE ONE TO DO FIRST. Make the fixture read the SHIPPED expression instead of re-declaring it: hoist `REGISTRY_OPEN` and its full-line finder to the enclosing `describe` and have the fixture assert THAT, so swapping the shipped resolution to a prefix matcher makes `fullLineHit` equal `prefixHit` and the case goes red — which is what `:10434` already says happens. If that is not done, DELETE the sentence at `:10433-10434`; do not leave a permanent case whose justification is false."
      - "CR-26 — TWO CHANGES, ONE CODE AND ONE DELETION. (1) Pin the IDENTITY as well as the size, in one line in the same case, against a masked token rather than a line number, so the five prose sites and the shipped failure message at `:10651` have something under them. (2) Correct the rationale at `:10166-10168` to what it executes — the equality makes both directions of THE MAXIMUM loud; a non-maximal shadow that shrank, INCLUDING the one that used to be the maximum, is not seen at all — and cite the executed 574 -> 284."
      - "CR-24, CR-25, CR-27 — CLOSE THESE THREE BY DELETION, NOT BY REPLACEMENT, AND THE REASON IS IN THE CONVERGENCE FINDING BELOW. CR-24: delete the present-tense locator at `:10777-10779` and `:11225-11227`; the 57/58 pair stands on `01-39-SUMMARY.md:531`/`:931` alone and needs no live re-check. CR-25: delete the `573` clause from reach statement (2); limit (5) at `:9110-9111` already states the fact correctly and a second statement of one measurement is the defect. CR-27: delete the word `enclosing` from `:10985`, `:10999`, `:11136` and correct the bracket's own count. Each of these can be closed by removing bytes. Adding a longer, truer sentence in their place is what rounds 8, 9 and 10 each did, and see below."
      - "WR-63: `if (at <= 0)`, and widen BOTH messages — the census guard's and the prefix case's at `:10740` — to name both shapes. WR-61: re-derive both sweep scopes at the end of the round that publishes them, or stop publishing totals and publish only results. WR-62: pin exclusion one with the `DERIVED_BEGIN` constant that already exists at `:6043`, and correct `:10029-10030`. WR-64, WR-65: state the boundary mechanism, and pre-authorise the routine bump so the rationale stops arguing against its own pin."
      - "DO NOT RE-OPEN THE 2026-08-25 RE-SCOPE, AND I DID NOT. Passes 8, 9 and 10 tested or upheld it; I did not re-test it and I am not reporting it as a defect. The `[x]` is unearned because criterion (3)'s mechanism is bypassable, not because the bar is wrong. I ALSO DID NOT REPORT THE ABSENCE OF AST, PARSER, CONTAINMENT OR RECOGNISER-NARROWING WORK AS A DEFECT, and none of the fixes above asks for any. Round 10 respected that decision in its bytes — reach statement (5) at `:10182-10184` says so explicitly — and so does this report."
      - "THE CONVERGENCE JUDGEMENT, STATED BECAUSE IT WAS ASKED FOR AND BECAUSE THE OPERATOR WILL ACT ON IT. See `## Is exit 2 converging?` in the body. Short form: exit 2's MECHANISM half converged and its DISCLOSURE half did not, and the rate is 1 -> 2 -> 5. The residue IS bounded and closable in one more round, but only under a DELETION-ONLY discipline, because under this file's own standard every corrective sentence is itself a new assertable claim, and that is what has generated the last three rounds of blockers. I also state, as a finding with reasoning, that criterion (3) as written — accurate AND contradicted nowhere, over 11,502 monotonically growing lines of hand-written prose checked by hand-written greps — may not be dischargeable by any amount of prose correction, for a reason this file itself documents at `:5975-5979` about a structurally identical guard."
deferred: []
behavior_unverified_items: []
coincidental_reliance_items:
  - truth: "URL userinfo does not reach `observations.url`"
    reason: undeclared-precondition
    harden: "Carried forward from rounds 3-10 unchanged and still correct. The `://` precondition is DECLARED at `schema.spec.ts:115-123` rather than assumed, but the guarantee still rests on `consumer.ts` handing over an absolute `rr.request.getUrl()`. Advisory, no score effect."
  - truth: "The derived residual states the whole bound on CORE-11"
    reason: undeclared-precondition
    harden: "REOPENED ONE LEVEL FURTHER IN FOR THE SIXTH CONSECUTIVE ROUND, AND THE LEVEL IT MOVED TO THIS TIME IS DIFFERENT IN KIND. Round 5: nothing bound a `clause` to its branch. Round 6: the guards scanned only `RESOLVER_REGISTRY[].clause`. Round 7: the whole-file guard reached the prose but its exemption map was unanchored. Round 8: the anchor was a masked LINE, not a site — 7 of 29 relocatable. Round 9: self-anchoring and ambiguity both measured to zero; the residual moved to the ANCHOR'S SHADOW. ROUND 10: the shadow is now MEASURED AND PINNED at its maximum, and that pin is real — I could not push the maximum past it from four directions. The residual has stopped moving DOWN the mechanism and moved SIDEWAYS into the file's own description of the fix. Five of five blockers this round are in prose round 10 wrote; zero are in the anchoring. Advisory, no score effect, but it is the single most informative line in this file: the layer that is not getting thinner is no longer the mechanism."
  - truth: "The head-side truncation residual is disclosed accurately"
    reason: fixture-only
    harden: "WR-39, carried from round 6. Plan 01-34 reports the ten-character coincidence removed from all three surfaces and the discriminator re-derived across four parameter-name lengths; I did not re-execute that sweep this pass and it is not on the critical path for truth 9. Advisory, no score effect — the REDACTION itself is unaffected and STORE-03's sweep evidence stands."
prohibitions:
  - requirement_id: CORE-11
    statement: "No code that ships in the plugin issues an outbound network request in this phase — no `caido:http` fetch, no `sdk.requests.send` in any spelling, no method of an identified `requests` or `net` receiver outside a read-only allowlist, no global `fetch` by any receiver or alias, no `XMLHttpRequest`/`WebSocket`/`EventSource`, no `navigator.sendBeacon`, no dynamic code construction, and no speculative retrieval of any kind."
    verification: gate
    declared_status: unresolved
    status: unverified
    flagged: true
    evidence: "FAIL-CLOSED for the tenth consecutive round, and for the third round running THE LEDGER AND I AGREE — `.planning/REQUIREMENTS.md:46` says `[ ]`, `CORE11_BOX_EXPECTED` at `:11414` says `[ ]`, and I find criterion (3) unmet. THE MUST-NOT ITSELF HOLDS AND I RE-ESTABLISHED IT INDEPENDENTLY: `pnpm test` 31 files / 1381 tests exit 0; `tsc --build` exit 0; `pnpm check:bundle` -> ONE specifier, `crypto`; 23 shipped non-spec modules across both SOURCE_ROOTS walked at ZERO violations; prior-phase regression 3 files / 80 tests green; `git diff --name-only 4105fd0..HEAD -- packages/ scripts/` filtered of `.spec.ts` is EMPTY. RE-EXECUTED THROUGH THE SHIPPED `auditSource` THIS SESSION IN A THROWAWAY IN-TREE SPEC, SINCE DELETED: `(ok && globalThis).fetch(url)`, `(globalThis ?? self).fetch(url)`, `fetch.call(null,url)` and `const f = fetch; f.call(null,url)` all -> [\"outbound-fetch\"]; `(ok && navigator).sendBeacon(u,d)` -> [\"outbound-beacon\"]; `sdk.requests.send(req)` -> [\"outbound-send\"]; `const m=\"send\"+\"Beacon\"; navigator[m](u,d)` -> [\"outbound-unanalysable\"]; clean source -> []. STILL SILENT AND STILL PROPERLY DISCLOSED: `WebSocket.call(null,u)` -> `[]`, carried as `silence-outbound-ctor-receiver-position` at `:5696`, one of 26 `measured-silence` rows in a 61-row registry, with `silence-operator-around-global-receiver` at ZERO `id:` occurrences and its absence asserted by a named case at `:9935`. WHY THIS IS STILL `unverified`: the re-scoped bar admits an `[x]` ONLY when the residual is DERIVED, DRIFT-DETECTABLE and THE SOLE BOUND. (1) and (2) hold. (3)'s DOCUMENT leg stays discharged. (3)'s MECHANISM leg is not: the residual the file publishes in five places and in a shipped failure message fell from 574 to 284 at 441/441 green under a two-line edit; a non-maximal shadow grown to exactly the published ceiling-plus-one stayed green; the fixture written to defend the CR-23 pins is green for every possible state of those pins, and I restored CR-23's tautology and its 104-line surface amputation through it in two reverted steps at 441/441 green; and a present-tense live locator added this round is falsified by the file's own bytes. A `verification: gate` prohibition whose own acceptance criterion is unmet is not verified, and the box correctly reads `[ ]`."
  - requirement_id: STORE-03
    statement: "MUST NOT persist a query-string VALUE from a target-controlled URL into observations.url. Parameter names, path, scheme and host are retained; every value is replaced before the row is written."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "HOLDS. Carried forward from rounds 6-10. `packages/backend/src/store/observations.ts` has been byte-identical in its non-comment lines since wave 26 and no shipped source changed this round, so round 6's 3,612-input sweep (four parameter-name lengths x 301 offsets x three grammars, zero occurrences of the secret in 7,224 outputs, zero outputs over `URL_MAX`), round 5's 16,160-input sweep and wave 35's 19,772-input re-measurement all apply unchanged. Regression-checked this round inside the green 1,381-test suite. WR-39 remains a DISCLOSURE defect about which offsets are unstable, not a failure of the prohibition."
  - requirement_id: STORE-07
    statement: "MUST NOT render a caught exception into a persisted or logged string without passing it through describeError first."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "Carried forward from rounds 4-10, where the gate's own `auditSource` was executed in both directions: `flag ? e.message : \"none\"`, `e.message ?? \"none\"`, `e.message || \"none\"` and `flag && e.message` all report `unredacted-concat`, and every `describeError` twin stays quiet. No shipped source changed this round. Regression-checked inside the green 1,381-test suite."
  - requirement_id: CORE-10
    statement: "MUST NOT present partial passive coverage as complete."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Carried forward unchanged and previously accepted by the operator at UAT test 3. Nothing changed this round. Counter identifiers remain honest — `proxiedResponsesObserved`, and the cap-drop counter at `telemetry.ts:100` is labelled `CORE-03 visible overflow`, which I re-read this session. Judgment-tier, autonomous run: NON-AUTHORITATIVE LLM-judge verdict, human review recommended."
  - requirement_id: STORE-01
    statement: "MUST NOT retain operator browsing evidence beyond what the analysis needs — no body bytes, headers, cookies, or column capable of holding a secret."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Carried forward from rounds 3-10 substantially unchanged; nothing changed this round. The column-shape half is gated (PRAGMA-read allowlist + forbidden-name check). The 'capable of holding a secret' half is honestly bounded rather than contradicted: `observations.url` can still hold a path-embedded token and a retained parameter NAME, both named in the OPEN list, both pinned, the second kept BY POLICY under the operator's 2026-08-21 UAT decision. Judgment-tier: NON-AUTHORITATIVE, human review recommended."
---

# Phase 1: Skeleton, Persistence & Compatibility — Verification Report

**Phase Goal:** A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Verified:** 2026-08-26T22:30:00Z
**Status:** gaps_found
**Re-verification:** Yes — verification pass 11, after gap-closure ROUND 10 (waves 42, 43), commits `2940ceb..HEAD`

---

## THE VERDICT, FIRST

**CORE-11's box may NOT move. It reads `[ ]`, and it stays `[ ]`.**

Ninth consecutive pass at **8/9**, the same truth every time. Round 10 was the operator's
**EXIT 2** — stop claiming a site, correct the disclosure — chosen as a cheap, bounded close of
four edits, all green on arrival.

**Two of its four items closed on the mechanism, and I proved both by watching them fail.**
CR-23's endpoint pins are real: I planted both decoys and both went red. CR-22's shadow pin is
real: I could not push the maximum past it from four directions.

**And it produced five blockers, every one of them in prose the round itself wrote.**

| Criterion 3 leg | Pass 9 | Pass 10 | Pass 11 |
| --- | --- | --- | --- |
| Document surfaces | ✓ CLOSED | ✓ still closed | ✓ still closed |
| The mechanism | ✗ 7 of 29 relocatable | ✗ shadow 574, unpinned | **⚖ pinned at the maximum and REAL — but the residual it names fell 574 → 284 at 441/441 green** |

**Criterion (3) THE SOLE BOUND is unmet on its MECHANISM leg, for the fourth consecutive round.**

---

## Everything below is a command I ran this session, on the real tree

**Baseline, established BEFORE any mutation and re-established AFTER every restore:**

```
$ pnpm test                → Test Files 31 passed (31) · Tests 1381 passed (1381) · exit 0
$ pnpm exec tsc --build    → exit 0
$ pnpm check:bundle        → packages/backend/dist/index.js: 1 import specifier(s): crypto
$ pnpm exec vitest run …/outbound-prohibition.spec.ts   → Tests 441 passed (441)
$ find packages/*/src -name '*.ts' ! -name '*.spec.ts' | wc -l   → 23
$ pnpm exec vitest run tests/go-no-go tests/pins tests/spike-results
                           → Test Files 3 passed (3) · Tests 80 passed (80)
$ wc -l …/outbound-prohibition.spec.ts   → 11502
$ git diff --name-only 4105fd0..HEAD -- packages/ scripts/ | grep -v '\.spec\.ts$'   → EMPTY
```

Seventeen commits since `4105fd0` touch `packages/`; all seventeen touch one file, the gate
spec. **No shipped source byte changed this round.**

---

## The reviewer's five BLOCKERs — reproduced, all five

Nine mutations planted in `packages/backend/src/outbound-prohibition.spec.ts`, run, and
restored between every one. Final state: `git diff --exit-code -- packages/` returns 0 and the
file's md5 matches its pre-session backup byte for byte.

### CR-28 — CONFIRMED. Two steps, both green. The most important of the five.

The fixture at `:10441-10500` is introduced with:

> *"A future author who swaps either pin above back to a prefix matcher makes that case a
> tautology again; **this one turns red instead of arguing**."*

It cannot. It declares its own `REAL_OPENER` (`:10442-10443`), its own prefix finder
(`:10461-10463`) and its own full-line finder (`:10464`) over a frozen seven-element literal
three lines above. It reads **nothing** from the case it claims to protect.

```
1. :10362  const registryOpen = lineOf((l) => l === REGISTRY_OPEN);
   ->      const registryOpen = lineOf((l) => l.startsWith("export const RESOLVER_REGISTRY"));
                                                        → Tests 441 passed (441)

2. + line 4057: export const RESOLVER_REGISTRY_SHADOW: readonly number[] = Object.freeze([1]);
                                                        → Tests 441 passed (441)
```

I then measured the damage **from inside the suite**, instrumenting `SURFACE_LINES`:

```
without decoy:  {"surface":9285,"excl":[[983,1564],[5985,5995],[4161,5793]]}
with decoy:     {"surface":9181,"excl":[[983,1564],[5986,5996],[4057,5794]]}
```

**CR-23's tautology restored, its decoy back in the tree, 104 pre-existing lines silently off
the scanned surface — and the fixture written to make that "turn red instead of arguing" argued
nothing, because it never looked.**

This is CR-23's defect one layer out. CR-23 was a pin compared against an expression derived
from the thing it pins. CR-28 is a fixture that pins **nothing at all**, under a comment naming
the exact edit it catches. A permanent case whose justification is false is worse than no case,
because the next reviewer reads the justification.

### CR-26 — CONFIRMED, and I have a strictly sharper instance than the one filed.

The rationale at `:10165-10168`: *"an exact equality makes both directions loud."* It makes
**the maximum's** directions loud.

The reviewer measured 574 → 492 with the pin green, from an out-of-tree harness that computes
only the pin. I ran it in the tree and went further: I placed the new prose block opening
**below all four shipped occurrences** (`:436`, `:468`, `:523`, `:600`) so no occurrence's
anchor changes, and grew the title shadow 291 lines to hold the maximum at 574.

```
$ 2 lines inserted at raw 700, + 291 filler lines at raw 250
  → Tests 441 passed (441)

  {"surface":9585,"top":[
     [574,   2,  575, "…outbound-prohibition.spec.ts — CORE-11'"],
     [292, 994, 1867, "a new prose block opening here"],
     [284, 710,  993, "SPELLING (operator, by POSITION) RESOLVED BY REPORTS"],
     [202,7305, 9240, "it.each(["]]}
```

**The `:417` shadow — the one holding all four shipped occurrences, the one five prose sites
and a shipped failure message name as 574 — fell to 284. A 290-line collapse, more than half
the published residual, and the ENTIRE SUITE was silent.**

*One correction to the reviewer, against my own side too.* At the reviewer's own placement the
statement "the gate said nothing" is true of the pin and **false of the suite**: I ran that
exact two-line edit and got `Tests 2 failed | 440 passed (442)` — the exemption case fired,
naming two shipped occurrences whose anchored keys had changed. An out-of-tree harness cannot
see that. The finding survives; its reach statement needed narrowing, which is the same defect
class, in the review.

The identity is asserted as live fact at `:9097-9098`, `:9390`, `:10162`/`:10198-10200`,
`:10624`, and — inside a shipped failure message a person reads while the suite is red —
`:10651`. **Nothing pins it.** The pin's own message at `:10252` compounds it:
*"a shadow which shrank is visible too"* — true of the maximum, false of the shadow the file
names, and I measured it false.

### CR-24 — CONFIRMED by measurement with the shipped builder.

`:11225-11227` asserts, present tense and dated *"today, 2026-08-26 wave 43"*, that
*"the two identically-headed table headers sit at lines 299 and 361."*

```
{"n299":"SPELLING (rebind, receiver-key position) RESOLVED BY REPORTS",
 "n361":"SPELLING (??=, receiver-key position) RESOLVED BY REPORTS",
 "identical":false,
 "a304":"SPELLING (rebind, …)","a305":"SPELLING (rebind, …)","a363":"SPELLING (??=, …)"}
```

Not identical, and `:304`/`:305` resolve to a **different** anchor from `:363` — so a cell moved
between them would not keep a byte-identical key, which is the entire property the sentence
exists to illustrate. I then swept the property rather than the pair, over every ruled table:

```
{"ruledTables":25,
 "dupes":[["}",[4037,6429]],
          ["});",[6563,6892,6998,7093,7183,7321,8979,9939,11324,11383]],
          [");",[9685,9881]]]}
```

**Zero non-trivial duplicate headers exist.** The only repeats are closing punctuation, none of
which is a table and none of which is 57 or 58 lines from another. WR-60's per-frame
reconciliation is correct on the record (`01-39-SUMMARY.md:531`, `:931` — I read both) and now
rests on a locator the file falsifies.

### CR-25 — CONFIRMED at the exact boundary.

Reach statement (2) at `:10173-10175`: *"the second-widest … may grow to **573** without this
case reporting a thing."* The pin is over the **maximum**, so a non-maximal shadow reaching
exactly **574** leaves the maximum at 574 and nothing reports.

```
$ 291 filler // lines into the second-widest shadow's region (2..284)
  → Tests 441 passed (441),  ✓ the WIDEST ANCHOR SHADOW … is PINNED

  top: [574 @2..575 "…CORE-11'"] [574 @710..1865 "SPELLING (operator, by POSITION)…"] [202 …]
```

Two shadows at 574, one doubled in width, pin silent. Limit (5) states the same fact **correctly**
1,065 lines away at `:9110-9111`: *"a non-maximal shadow may grow **up to that maximum** with
nothing reporting."* Two numbers for one measurement inside one round — WR-60's exact shape, in
the round that closed WR-60 for it.

### CR-27 — CONFIRMED.

The retirement bracket at `:10633-10645` claims a bounded enumeration found *"ONE positive site
claim, written in TWO places … and FIVE negative ones … none of them claims that a well-formed
anchor identifies anything."* The five negative statements check out and the mid-wave correction
from four to five is honest. But `:10985`, `:10999` and `:11136` each assert by contraposition
that the anchor's normal behaviour **is** to resolve the ENCLOSING construct — the containment
reach statement (5) denies at `:10182-10184` and the docblock disowns **by name** at
`:9396-9398`. Two more sit at `:9242` and `:9411`.

An enumeration whose stated completeness exceeds its executed completeness is the signature
defect one meta-level up, and it is load-bearing: **that bracket is the evidence that exit 2 was
taken cleanly.**

### The reviewer's central framing — adjudicated

> *"the 574 pin survived on the axis it was built for, and not on the axis it advertises."*

**Correct, and I tested both axes.**

*The axis it was built for* is the maximum, which is what pass 10's `missing:` prescribed
(*"group SURFACE_LINES by resolved anchor and assert the maximum against a pinned value"*). It
holds under everything I could throw at it:

```
one // line at :500                                   → RED, 575 vs 574
BEGIN DERIVED RESIDUAL decoy at :961 (slides EXCL[0]) → RED, 552 vs 574
```

*The axis it advertises* is the identity — `:417`, 574 surface lines, four shipped occurrences —
stated as live fact in five prose sites and one shipped failure message. Nothing watches it, and
I collapsed it by half at full-suite green.

**The reviewer is also right that CR-23 is genuinely closed**, and I confirmed it the hard way,
both sides:

```
RESOLVER_REGISTRY_SHADOW at :4057   → 1 failed | 440 passed, "expected 4057 to be 4162"
UNBOUNDED_QUANTIFIERS_LEGACY 25 up  → 2 failed | 439 passed, "expected 5960 to be 5986"
```

Both sides are independent expressions and the file says so in its own bytes. Pass 10 ran the
first of those at 439 of 439 **green**. That is a real fix.

---

## Pass 10's four items — closed or not, each by execution

### 1. CR-22 part 1 — **CLOSED.** Both 234 surfaces replaced; site-identity retired in both places.

`:9090-9111` and `:9382-9399` both publish the shadow and both say in their own bytes that *"THE
234 IS CORRECT AND IT IS NOT A BOUND."* Neither still infers a bound from it. The site-identity
claim is retired in both places (F-7) with a dated bracket naming the enumeration behind it —
which is CR-27's problem, not this item's.

### 2. CR-22 part 2 — **CLOSED on the mechanism, RE-OPENED on the disclosure.**

The pin is real (four RED demonstrations above; the arithmetic `1156 − 582 = 574` and the four
occurrences at `:436/:468/:523/:600` all reproduce). Its self-description carries **CR-25** and
**CR-26**, both blockers, plus **WR-64** and **WR-65**.

### 3. CR-23 — **CLOSED.** Both endpoints, both watched RED by me, both sides independent.

The synthetic fixture guarding them is **CR-28** and it is a blocker. That does not re-open
CR-23: the shipped pins assert today. It means the file's own defence of them is a false
justification, and I restored the tautology through it in two steps.

### 4. WR-55 — **CLOSED in substance.** Reach restated to the executed bound.

Sweep re-run by me over the live file: `{"gateLines":11517,"hits":[1]}`. The result holds; the
mechanism is named; the dependence was watched (blanking line 1 grows the set to `[1,2,3]`).
The **stated scope** of that sweep, and of wave 42's, were both stale on arrival — **WR-61**.

### 5. WR-58 / WR-60 — **WR-58 partial, WR-60 numbers closed.**

WR-58's guard exists and throws a named malformation error, but it is `at < 0` where the finding
prescribed `at <= 0`. I executed the gap:

```
$ plant hand-written key " §§ some line :: q3" in HEADER_QUANTIFIER_EXEMPTIONS
  → Tests 3 failed | 438 passed (441)
    "1 anchor(s) IN USE are not produced by exactly one line …
       "" produced by 0 line(s) …
     A ZERO PRODUCER COUNT IS THIS SAME FAILURE FROM THE OTHER SIDE: the key was
     hand-written against a header that is not in the file"
```

**The exact misdiagnosis WR-58 was raised to end, one boundary value over.** My own addition:
the prefix case at `:10740-10741` has the mirror defect — its guard `toBeGreaterThan(0)` is
right and its message (*"carries no `§§` separator"*) is wrong. One site has the right guard and
the wrong message; the other has the right message and the wrong guard.

WR-60's numbers are settled correctly on the record and the executor disclosed, in its own bytes
at `01-43-SUMMARY.md:527`, that branch B **was** the smaller edit and that this is precisely why
the plan forbids choosing on edit size. That is a round declining to hide the convenient fact,
and it counts. The sentence added to settle it is **CR-24**.

### F-11 — **confirmed, nothing rounded.**

`:10021-10032` records seven locator expressions, four proved unique, three not, and states that
at arrival it was five of which two were proved. The plan said five/three. The divergence is
open in the ledger at `.planning/WINDOWS.md:82`. Nothing was adjusted to make the plan's number
true, which is the whole point.

---

## Is exit 2 converging?

**Asked for explicitly. Stated as a finding with reasoning, not as an instruction.**

### The measured rate

| round | what it was asked to do | blocker-tier instances of the signature defect it produced |
| --- | --- | --- |
| 8 | close CR-17 | 1 (CR-20) |
| 9 | close CR-20 | 2 (CR-22, CR-23) |
| 10 | close CR-22/CR-23 — four disclosure edits, "cheap and bounded" | **5** (CR-24, CR-25, CR-26, CR-27, CR-28) |

**The rate is 1 → 2 → 5 and it is not decaying.** More sharply: **five of five blockers this
round are defects in prose round 10 itself wrote. Zero are pre-existing.** Round 10 shipped
+451/−20 lines to close four items and opened fifteen findings.

### But the answer is not simply "no", and the split matters

**Exit 2's MECHANISM half converged.** Round 10 delivered two genuine, executable fixes and I
verified both adversarially: CR-23's endpoint pins go red against their decoys, and the 574 pin
goes red on every growth of the maximum I could construct. Those are code, and code held.

**Exit 2's DISCLOSURE half did not, and the reason is structural rather than about discipline.**
Under this file's own standard, *a sentence stating a measured reach is itself an assertable
claim held to the same bar as the code*. So every corrective sentence is new attack surface, and
the corrective act **is** the generative act. That is why the count rises with the size of the
fix rather than falling with the number of fixes: rounds 8, 9 and 10 each closed their finding
by writing a longer, truer paragraph, and each of those paragraphs became the next round's
blocker.

### So: is the residue bounded and closable in one more round?

**Yes — but only under a discipline nobody has tried yet: close by DELETION, not by replacement.**

Three of the five blockers can be closed by **removing bytes**, which adds no new assertable
claim:

- **CR-24** — delete the present-tense locator at both sites. The 57/58 pair stands on
  `01-39-SUMMARY.md:531`/`:931` and needs no live re-check.
- **CR-25** — delete the `573` clause. `:9110-9111` already states the fact correctly; a second
  statement of one measurement **is** the defect.
- **CR-27** — delete the word `enclosing` from three messages and correct one count.

The other two are **code**, and code is checkable:

- **CR-28** — hoist the shipped locator and have the fixture assert it, so the swap at `:10362`
  goes red. One-line change plus a hoist.
- **CR-26** — pin the identity as well as the size, one line, against a masked token.

That is a bounded, mechanically verifiable round with a **negative** prose delta. It is the first
round in four that would not be structurally guaranteed to produce its own successor.

### And the harder finding, which the operator asked for explicitly

**Criterion (3) as written may not be dischargeable by any amount of prose correction, and this
file already documents why.**

Under exit 2's reading, criterion (3) SOLE BOUND requires the disclosure to be **accurate and
contradicted nowhere**. "Contradicted nowhere" is a universal quantifier over 11,502
monotonically growing lines of hand-written natural language, checked by hand-written
natural-language greps.

That is structurally the same object as `UNBOUNDED_QUANTIFIERS`, and the file caveats **that**
guard, correctly, in its own bytes at `:5975-5979`:

> *"ITS REACH IS THE DECLARED PHRASINGS AND NO FURTHER … English has many spellings for one
> universal. A clause asserting one OUTSIDE this list is unmatched, raises no obligation and
> passes silently. NO SENTENCE IN THIS FILE MAY CLAIM THIS GUARD CATCHES EVERY UNIVERSAL."*

Round 10 is the empirical confirmation. Wave 41's own case-**insensitive** sweep found `:981`,
invisible to every case-sensitive grep in the plan, in the review and in pass 9. CR-27's
enumeration missed three messages. WR-61's two published scopes were stale in the commit that
wrote them. **Each of those is the same failure: a hand-written grep asserting completeness over
prose it cannot enumerate.**

So the operator has, as I read it, three options, and none of them is "narrow the anchoring
further":

1. **Close by deletion, one round, as above.** Bounded and checkable. It does not make
   criterion (3) *provable*; it makes the currently-known contradictions zero. Whether that is
   enough is the operator's call, not mine.
2. **Bound criterion (3)'s "contradicted nowhere" to a mechanically checked region** rather than
   the whole file — a named, closed set of statements plus a gate that fails when a reach claim
   is authored outside it. This file already has exactly that artifact: the machine-owned derived
   span, generated and byte-compared. Extending that shape to the disclosure would convert a
   universal over prose into a closed set, which is the only route I can see that makes the
   criterion *dischargeable* rather than merely *currently unfalsified*.
3. **Accept the state with a recorded override.** The must-NOT holds and I re-established it this
   session; 22 of 23 requirements are green; nothing leaks; the entire residue is a test-only
   gate's description of itself. An override on truth 9's criterion (3), naming the measured
   residual, would be an honest close — and it is the only one of the three that stops the phase
   from spending a fifth round on a file that has not shipped a byte of production code since
   `4105fd0`.

**My reading, offered and not acted on:** option 1 followed by a decision between 2 and 3. What
I would *not* expect to work is a fourth round of replacing a wrong sentence with a longer right
one. That has now been run three times and produced 1, then 2, then 5.

**I have not moved CORE-11's checkbox and I am not instructing anyone to. It is `[ ]`.**

---

## Goal Achievement — the seven ROADMAP success criteria plus two

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `onInterceptResponse` non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `hooks/passive.ts:117` — *"NOT async — it returns `undefined`, never a Promise"*; wired at `index.ts:322` `sdk.events.onInterceptResponse(...)`, registered last per `index.ts:31`. Green in 1381 tests. |
| 2 | Work queue bounded, overflow count visible, never unbounded | ✓ VERIFIED | `hooks/passive.ts:40` — *"BOUNDED. The queue drops the oldest entry at cap"*; `telemetry.ts:100` — *"(CORE-03 visible overflow)"*. Re-read this session. |
| 3 | 200-chunk SPA leaves plugin UI and RPC responsive; max synchronous slice recorded, under the Phase 0 threshold | ✓ VERIFIED | `results/spa-load.json` (6,185 bytes), taken from **outside** the process by an external REST prober (decision P5-D3) against `caido-cli 0.57.1` with a pinned sha256. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `store/analyses.ts:113` — `ON CONFLICT (project_id, sha256, detector_set_hash) DO NOTHING`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; non-UTF-8 fixture round-trips | ✓ VERIFIED | `ingest/consumer.ts:189` `const raw = body.toRaw();`. |
| 6 | CI gate fails the build if the backend bundle imports a specifier outside the Phase 0 allowlist | ✓ VERIFIED | **Executed this session:** `packages/backend/dist/index.js: 1 import specifier(s): crypto`. |
| 7 | Below-minimum Caido produces a clear message, not an obscure failure | ✓ VERIFIED | `compat.ts:43` `export const MIN_CAIDO = "0.57.1";`, user-facing message at `:332`. |
| 8 | Redaction: no query-string value from a target-controlled URL reaches `observations.url` | ✓ VERIFIED | STORE-03. `observations.ts` untouched this round; sweep evidence from rounds 5-7 applies unchanged. |
| 9 | **No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)** | **✗ FAILED (partial)** | **The one that does not hold.** The must-NOT holds and I re-executed nine probes through the shipped `auditSource`. Criterion (3)'s **mechanism** does not: 574 → 284 at 441/441 green, a non-maximal shadow at 574 green, and CR-23's tautology restored in two steps at 441/441 green. |

**Score: 8/9 truths verified.** Ninth consecutive pass at 8/9, the same truth each time.

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `packages/backend/src/hooks/passive.ts` | Non-async hook, cheap gates, bounded enqueue | ✓ VERIFIED | Wired from `index.ts:322`. Untouched this round. |
| `packages/backend/src/ingest/consumer.ts` | `toRaw()` byte path | ✓ VERIFIED | Wired; feeds the digest. Untouched. |
| `packages/backend/src/store/analyses.ts` | `project_id`-keyed persistence, hash-once | ✓ VERIFIED | Composite key is the conflict target. Untouched. |
| `packages/backend/src/store/observations.ts` | URL redaction before write | ✓ VERIFIED | Non-comment bytes unchanged since wave 26. |
| `packages/backend/src/compat.ts` | Minimum-version gate with a clear message | ✓ VERIFIED | Wired. Untouched. |
| `scripts/ci/check-bundle-imports.mjs` | Allowlist gate | ✓ VERIFIED | Executed: 1 specifier, `crypto`. |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 enforcement + derived, drift-detectable, singular disclosure | ⚠️ **PARTIAL** | Enforcement green over 23 real modules, 0 violations; every must-NOT probe reports. Criteria (1) and (2) hold. **Criterion (3)'s mechanism: the residual it publishes in six places is unwatched and collapsed by half at full-suite green; the fixture defending its endpoint pins pins nothing; a live locator it added is falsified by the file's own bytes.** |
| `.planning/REQUIREMENTS.md:46` | The ledger row for CORE-11 | ✓ VERIFIED | `- [ ] **CORE-11**`. Row states no box state of its own. |
| `packages/backend/src/…:11414` | `CORE11_BOX_EXPECTED` | ✓ VERIFIED | `"- [ ] **CORE-11**"`, asserted against the row by a named case at `:11474`. |

### Behavioural Spot-Checks — every row is a command I ran this session

| Behaviour | Command | Result | Status |
| --- | --- | --- | --- |
| Full suite green | `pnpm test` | 31 files / **1381 tests** exit 0 | ✓ PASS |
| Types sound | `pnpm exec tsc --build` | exit 0 | ✓ PASS |
| Bundle allowlist | `pnpm check:bundle` | `1 import specifier(s): crypto` | ✓ PASS |
| Gate suite alone | `pnpm exec vitest run …/outbound-prohibition.spec.ts` | **441 passed (441)** | ✓ PASS |
| Prior-phase regression | `vitest run tests/go-no-go tests/pins tests/spike-results` | 3 files / **80 tests** | ✓ PASS |
| Shipped modules walked | `find packages/*/src -name '*.ts' ! -name '*.spec.ts'` | **23** across both roots | ✓ PASS |
| No shipped code changed | `git diff --name-only 4105fd0..HEAD …` filtered of `.spec.ts` | **EMPTY** | ✓ PASS |
| CORE-11 must-NOT, 9 probes through shipped `auditSource` | throwaway in-tree spec, since deleted | 8 report as documented, clean source `[]` | ✓ PASS |
| Disclosed residual still silent | `WebSocket.call(null,u)` | `[]` — named row `:5696` | ✓ PASS (disclosed) |
| Registry census | `grep -c 'kind: "measured-silence"'` / `grep -c '^    id: "'` | **26 of 61**; removed row 0 `id:` hits | ✓ PASS |
| **CR-28 step 1** — `:10362` swapped to a prefix matcher | gate suite | **441 passed (441)** | ✗ **FAIL — fixture should have gone red** |
| **CR-28 step 2** — `RESOLVER_REGISTRY_SHADOW` at `:4057` on top of step 1 | gate suite | **441 passed (441)** | ✗ **FAIL — tautology restored, decoy back** |
| **CR-28** surface amputation, measured from inside the suite | instrumented `SURFACE_LINES` | **9285 → 9181** (104 lines) | ✗ **FAIL — silent** |
| **CR-26** `:417` shadow shrunk below all four occurrences | gate suite + live-builder probe | **574 → 284**, `441 passed (441)` | ✗ **FAIL — whole suite silent** |
| **CR-25** second-widest grown to exactly 574 | gate suite + live-builder probe | two shadows at 574, pin `✓` | ✗ **FAIL — ceiling published as 573** |
| **CR-24** `:299` / `:361` normalized, anchors at 304/305/363 | live builder from inside the suite | headers **differ**; 304/305 ≠ 363 | ✗ **FAIL — locator falsified** |
| **CR-24** sweep for byte-identical ruled-table headers | live builder, all 25 tables | **zero** non-trivial duplicates | ✗ **FAIL — property does not exist** |
| **WR-63** key opening with the separator | plant `" §§ some line :: q3"` | **3 failed \| 438 passed**, census reports AMBIGUITY on `""` | ✗ **FAIL — `at < 0`, not `<= 0`** |
| **WR-61** published sweep scopes | live measurement | surface **9,277** (published 8,846); `gateLines` **11,503** / `wc -l` **11,502** (published 11,417 / 11,416) | ✗ **FAIL — stale on arrival** |
| CR-23 closure, endpoint one | `RESOLVER_REGISTRY_SHADOW` at `:4057`, pin intact | **1 failed \| 440 passed**, `expected 4057 to be 4162` | ✓ PASS — **CLOSED** (was green at 439/439) |
| CR-23 closure, endpoint two | `UNBOUNDED_QUANTIFIERS_LEGACY` 25 lines up | **2 failed \| 439 passed**, `expected 5960 to be 5986` | ✓ PASS — **CLOSED** |
| CR-22 pin is real, growth | one `//` line at `:500` | **1 failed \| 440 passed**, `575 … PINS IT AT 574` | ✓ PASS |
| CR-22 pin is real, exclusion slide | `BEGIN DERIVED RESIDUAL` decoy at `:961` | **1 failed \| 440 passed**, `552 … PINS IT AT 574` | ✓ PASS (and see WR-62 — no endpoint pin fired) |
| WR-55 sweep, live file | shipped builder at every line, from inside the suite | `{"gateLines":11517,"hits":[1]}` | ✓ PASS — **CLOSED** |
| Wave-42 arithmetic | live-builder probe | `1156 − 582 = 574`, `419..1574`, four occurrences | ✓ PASS — reproduces exactly |
| Ledger / pin agreement | `REQUIREMENTS.md:46` and `:11414` | both `- [ ] **CORE-11**` | ✓ PASS |

### Requirements Coverage

All 23 requirement ids the phase is tagged with resolve in `REQUIREMENTS.md` and appear in at
least one plan. **No orphans, no unclaimed ids.**

| Requirement | Box | Status |
| --- | --- | --- |
| CORE-01 … CORE-10 | `[x]` | ✓ SATISFIED (CORE-10 judgment-tier, flagged) |
| **CORE-11** (`:46`) | **`[ ]`** | ✗ **BLOCKED — criterion (3) mechanism leg** |
| STORE-01 … STORE-07 | `[x]` | ✓ SATISFIED (STORE-01 judgment-tier, flagged) |
| COMPAT-01, COMPAT-02 | `[x]` | ✓ SATISFIED |
| ENC-01 | `[x]` | ✓ SATISFIED |
| DIST-05, DIST-06 | `[x]` | ✓ SATISFIED |

**22 of 23 boxes read `[x]`, and CORE-11's correctly reads `[ ]`.** The ledger, the pin and this
report agree, for the third consecutive pass.

The `01-PROBE.md` no-silent-drop equality — 38 applicable items == 27 authored into `must_haves`
+ 11 surfaced as flagged assumptions — is stated in the file's own opening and its 11
unclassified rows were confirmed still-acceptable at UAT test 4. Unchanged this round.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `outbound-prohibition.spec.ts` | 10433-10434, 10441-10500 | A permanent fixture whose stated purpose is false — it reads nothing from what it claims to protect | 🛑 Blocker | CR-28, executed in two steps at 441/441 green |
| `outbound-prohibition.spec.ts` | 10165-10168 + five identity sites + `:10252` | The residual's own attribution left unpinned by the case written to pin the residual | 🛑 Blocker | CR-26, executed — 574 → 284 at full-suite green |
| `outbound-prohibition.spec.ts` | 10777-10779, 11225-11227 | A present-tense live locator the file's own bytes falsify | 🛑 Blocker | CR-24, measured — zero such header pairs exist |
| `outbound-prohibition.spec.ts` | 10173-10175 | One measurement stated twice with different values, in the round that closed WR-60 for that shape | 🛑 Blocker | CR-25, executed at exactly 574 |
| `outbound-prohibition.spec.ts` | 10633-10645 vs 10985/10999/11136 | An enumeration whose stated completeness exceeds its executed completeness | 🛑 Blocker | CR-27 — and the bracket is the evidence exit 2 was taken cleanly |
| `outbound-prohibition.spec.ts` | 9095, 10196, 9270-9271, 10680-10681 | Two exhaustive sweeps publishing a scope that was stale in the commit that wrote it | ⚠️ Warning | WR-61, measured |
| `outbound-prohibition.spec.ts` | 10815, 10740 | Guard `at < 0` where `<= 0` was prescribed; mirror site has the right guard and the wrong message | ⚠️ Warning | WR-63, executed |
| `outbound-prohibition.spec.ts` | 10060-10061, 10029-10030 | Exclusion one's endpoints neither proved unique nor pinned; today's protection is incidental | ⚠️ Warning | WR-62, executed — only the 574 pin fired |
| `outbound-prohibition.spec.ts` | 10186-10192 | A rationale that argues against the pin eighteen lines below it | ⚠️ Warning | WR-65, executed |
| `outbound-prohibition.spec.ts` | 10201-10203 | The stated reason for contiguity does not cover the top of the range it explains | ⚠️ Warning | WR-64 |
| `outbound-prohibition.spec.ts` | various | IN-45 … IN-49 | ℹ️ Info | Reviewer-reported; **not** independently re-executed by me except IN-47, and recorded as such |

**No debt markers** — `TBD|FIXME|XXX` → 0, `TODO|HACK|PLACEHOLDER` → 0, `.skip(|.only(|.todo(`
→ 0, over `packages/*/src` and `scripts/`.

### Working tree

`git diff --exit-code -- packages/ scripts/ tests/` returns **0**, and the gate file's md5
matches its pre-session backup byte for byte (`d340da72079b7a567d475226c8cfe597`). Nine
mutations were planted and all nine restored; the throwaway probe spec was deleted. Untracked
`.gsd/` is pre-existing and not mine; `01-REVIEW.md` carries the reviewer's just-filed round-10
section, also not mine.

---

## On severity — a defect in the enforcement of a claim, not a live vulnerability

**Nothing leaks, and I re-established that this session rather than carrying it forward.**
31 files / 1381 tests exit 0 with the gate walking 23 shipped modules across both `SOURCE_ROOTS`
at zero violations; `tsc --build` exit 0; the shipped bundle's entire import set is one
specifier, `crypto`; every outbound shape I probed through the shipped `auditSource` reports;
prior-phase regression is green at 3 files / 80 tests; and **no shipped source byte changed this
round** — seventeen commits, one test file.

Every finding in this report is a defect in a **test-only gate's enforcement or disclosure of its
own description**. The five blockers are blockers because they falsify the central claims of the
work under review — and because CR-28, executed, restores a 104-line silent amputation of the
surface that work is measured over — not because anything reaches a network.

## Human Verification Required

None newly raised. The judgment-tier prohibitions (CORE-10, STORE-01) remain flagged
`unverified` with NON-AUTHORITATIVE LLM-judge verdicts, carried forward and previously accepted
by the operator at UAT test 3; nothing about them changed this round.

The one thing that **does** want an operator decision is not a verification item — it is the
convergence choice recorded above. I have stated it and taken no action on it.

## Gaps Summary

One gap, the same truth for the ninth consecutive pass.

**Round 10 did two real things and I proved both by watching them fail.** CR-23's endpoint pins
go red against their own decoys, both sides independent expressions. The 574 shadow pin goes red
on every growth of the maximum I could construct from four directions. Those are code, and code
held. WR-55's sweep re-runs to the same answer; WR-60's numbers are settled correctly on the
record and the executor disclosed the inconvenient fact that its branch was also the smaller
edit; F-11's arithmetic was corrected against the plan rather than the plan's number laundered
into the file.

**What did not close is the disclosure, and it did not close because in this file the corrective
act is the generative act.** Five blockers, all five in prose round 10 wrote. The residual the
file names in five places and in a shipped failure message fell from 574 to **284** at 441 of 441
green. A non-maximal shadow reached exactly the published ceiling-plus-one, green. A fixture
whose comment names the edit it catches is green for every state of the pins it claims to
protect — and through it I restored CR-23's tautology, its decoy and a 104-line silent amputation
of the scanned surface, at 441 of 441 green. A present-tense locator dated this round is
falsified by the file's own bytes: the property it asserts does not exist anywhere in this file.

**The rate is 1 → 2 → 5.** The residue is closable in one more round, and I believe it is closable
only by **deletion** — three of the five blockers are closed by removing bytes, and the other two
are one-line code changes. What has now been tried three times, and produced 1, then 2, then 5,
is replacing a wrong sentence with a longer right one.

**CORE-11's box stays `[ ]`.** Not a fourth revert — it is already `[ ]`, the pin agrees, the
ledger row agrees, and round 10 correctly declined to move it. The determination is:
**criterion (3)'s mechanism leg is unmet, so the box may not move.**

---

_Verified: 2026-08-26T22:30:00Z_
_Verifier: Claude (gsd-verifier), verification pass 11_
