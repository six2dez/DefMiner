---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-26T14:40:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  previous_verified: 2026-08-26T09:45:00Z
  round: 8
  verification_pass: 9
  history: "pass 4 (round 3) -> pass 5 (round 4) -> pass 6 (round 5) -> pass 7 (round 6) -> pass 8 (round 7) -> pass 9 (round 8). Score has read 8/9 for SEVEN consecutive passes and the open truth has been the same one every time: truth 9, CORE-11 outbound enforcement. CORE-11's box has been flipped and reverted THREE times — `e7cc4b6`, `faca607`, `4105fd0`."
  gaps_closed:
    - "CR-18 — CLOSED, AND I MEASURED THE ROW RATHER THAN READING THE SUMMARY. `.planning/REQUIREMENTS.md:46` no longer STATES the box's state. The row is 23,966 bytes and still contains the strings `THE BOX IS DELIBERATELY STILL`, `WHY THE BOX IS` and `When this box is eventually` exactly ONCE each — but I extracted the surrounding bytes of all three and every one falls inside a SINGLE enumeration sentence that NAMES them as the passages removed: `THREE PASSAGES LEFT THIS ROW IN THIS CORRECTION and NONE was deleted: the passage opening \\`WHY THE BOX IS\\`, the passage opening \\`THE BOX IS DELIBERATELY STILL\\`, and the sentence opening \\`When this box is eventually\\``. That is MENTION, not USE. The three passages themselves are relocated and live at `:190`, `:192`, `:194` as `PASSAGE ONE/TWO/THREE`, in a dated block attributed to plan 01-38. The row's checkbox reads `- [ ] **CORE-11**` and the row asserts no state of its own. This is the cheaper of the two dispositions pass 8 prescribed and it is the one that was taken."
    - "CR-19 — CLOSED, AND I RE-EXECUTED ALL SIX PROBES MYSELF THROUGH THE SHIPPED `auditSource` RATHER THAN ACCEPTING PLAN 01-38's REPORT OF HAVING DONE SO. `(ok && globalThis).fetch(url)` -> [\"outbound-fetch\"]; `(globalThis ?? self).fetch(url)` -> [\"outbound-fetch\"]; `(globalThis || self).fetch(url)` -> [\"outbound-fetch\"]; `(b ? globalThis : self).fetch(url)` -> [\"outbound-fetch\"]; `(ok && window).fetch(url)` -> [\"outbound-fetch\"]; `(ok && navigator).sendBeacon(u,d)` -> [\"outbound-beacon\"]. SIX OF SIX REPORT, which is what the corrected line now says. I also re-counted the registry rather than trusting the count: 61 rows, 26 of `kind: \"measured-silence\"`, and `id: \"silence-operator-around-global-receiver\"` returns ZERO hits — the one in-range occurrence at `:5751` is a tombstone COMMENT recording the removal, not a row. The line that was FALSE is now true and it does not instruct anyone to restore the row."
    - "WR-48 — CLOSED, AND ITS CORRECTION IS HONEST, WHICH I CHECKED BY MEASURING BOTH NUMBERS. `CLOSES_FROZEN_ARRAY = /^\\]( as [^)]*)?\\);$/` matches `] as readonly ResolverRecord[]);` at `:5767`, so exclusion three now resolves 4135..5767 = 1633 lines, matching limit (4)'s restated figure to the line. I then sliced the 117 returned lines (5768..5884) and counted every one of the nine `UNBOUNDED_QUANTIFIERS` phrasings across them: `anywhere in the file` 0, `everywhere in the file` 0, `any depth` 0, `every literal` 0, `ANY of them` 0, `every spelling` 0, `every reachable spelling` 0, `ANY string literal` 0, `ANY-BINDING-WINS` 0. TOTAL ZERO — the docblock's `MEASURED AFTER THE CHANGE rather than predicted before it: ZERO` is accurate. Round 8 corrected a false description and its correction survived my measurement, which rounds 5 through 7 could not say."
    - "THE ROUND OPENED AGAINST A MEASURED RED AND SAID SO. 01-36 reports HEAD `4105fd0` at 2 failed of 1372 — the box reverted without `CORE11_BOX_EXPECTED` moving — and regenerated the span before doing anything else. The pin now reads `const CORE11_BOX_EXPECTED = \"- [ ] **CORE-11**\";` at `:10311` and agrees with the shipped row. Measuring your own handoff RED before claiming to build on it is the discipline this phase keeps asking for."
    - "NO REGRESSION, RE-ESTABLISHED INDEPENDENTLY AND NOT CARRIED FORWARD. `pnpm test` 31 files / 1374 tests exit 0. `pnpm exec tsc --build` exit 0. `pnpm check:bundle` -> `packages/backend/dist/index.js: 1 import specifier(s): crypto`. The gate suite alone: 434 passed (434). The walk covers 23 shipped non-spec modules across both SOURCE_ROOTS at ZERO violations. NO SHIPPED CODE CHANGED THIS ROUND — `git diff --name-only 9b3ff46..HEAD -- packages/ scripts/ | grep -v '\\.spec\\.ts$'` is EMPTY; the round's entire code delta is one test file, +467/-43."
  gaps_remaining:
    - "UAT gap 2 / truth 9 (CORE-11 outbound enforcement) — STILL OPEN, for the SEVENTH consecutive round. Criteria (1) DERIVED and (2) DRIFT-DETECTABLE remain discharged and I found no evidence against either. Criterion (3) THE SOLE BOUND is STILL unmet, and this round it fails on BOTH of its legs again — but they are not the same two legs. The DOCUMENT leg that failed in pass 8 (CR-18, CR-19) is genuinely CLOSED. The MECHANISM leg that failed in pass 8 (CR-17) is NOT: the fix built to close it narrowed the hole from 29 of 29 entries to 22 of 29 and I drove TWO fabricated relocations through the remainder at 434/434 green, plus a third through the sentinel the same wave introduced. CORE-11's `[x]` is NOT earned and the box must stay `[ ]`."
  regressions:
    - "NO behavioural regression. Truths 1-8 re-checked this session; no shipped source byte changed since pass 8, and the full suite grew 1372 -> 1374 with zero failures."
    - "NO ledger regression this round. Pass 8's ledger regression (the `[x]` on a self-contradicting row) is gone: the box reads `[ ]`, the pin reads `[ ]`, and the row states no box state at all."
    - "ONE NEW FINDING AGAINST ROUND 8's OWN CORRECTION, FOUND BY EXECUTION AND NOT BY THE REVIEWER (WR-54, below). WR-48's corrected recogniser is pinned by NOTHING. I reverted `CLOSES_FROZEN_ARRAY` to its pre-fix form `/^\\]\\);$/` — re-introducing the exact 117-line over-walk WR-48 was filed about — and the suite stayed GREEN at 434 of 434. Not the `proof` token, not the band, and not the clause-count equality the reviewer names as the mechanism that caught it. Warning, and it errs safe, but the correction can silently revert."
gaps:
  - truth: "No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)"
    status: partial
    reason: "I WAS ASKED TO ADJUDICATE CR-20 AND CR-21 BY EXECUTION RATHER THAN INHERIT THEM, AND THE REVIEWER USED AN OUT-OF-TREE HARNESS, SO I REPRODUCED BOTH BY MUTATING THE REAL FILE AND RUNNING THE REAL SUITE. BOTH HOLD. CR-20 (a) — SELF-ANCHORING, EXECUTED. I took the shipped occurrence at `:1838`, ` * Every non-spec module the plugin SHIPS, under either source root, at any depth.`, DELETED it from the docblock at `:1837` that describes the FILE WALK's directory recursion, and planted it verbatim as `// Every non-spec module the plugin SHIPS, under either source root, at any depth.` at `:7102`, immediately above an `it(` about `receiverAliases`' logical-assignment branch inside `describe(\"an outbound receiver, however it was bound\")` — a completely different construct 5,264 lines away, in a region about the OUTBOUND walk's resolution rather than the file walk's. RESULT: 434 passed (434), zero failures. Restored; 434 passed. That exemption's whole reason is construct-dependent — it reads `Not a claim about the OUTBOUND WALK's resolution reach at all: it describes the FILE WALK's directory recursion` — and the relocated sentence makes that reason FALSE while the key does not move. This is CR-17's mutation, one construct over, AFTER the fix. THE CAUSE, READ OFF THE CODE: `constructAnchorFor` opens its backward scan at `for (let i = lineNumber; i >= 1; i--)` (`:9226`) and then walks FORWARD from the header to the first line that names anything, `for (let k = head; k <= lineNumber; k++)` (`:9245`). For an occurrence that is the first content line of a docblock, or is itself an `it(` title, that forward walk lands on the occurrence's OWN line and the construct half becomes a 64-character prefix of the line half. It carries no positional information whatsoever. Three shipped keys are visibly of this shape on the face of the map — `Every non-spec module the plugin SHIPS, under either source root… §§ Every non-spec module the plugin SHIPS, under either source root, at {q2}. :: q2`, and the two `it(` titles at `:9094` and `:9100` whose halves are likewise prefix-and-whole of one line. CR-20 (b) — AMBIGUOUS ANCHOR TOKENS, ALSO EXECUTED. The anchor is a line of text and lines repeat. `grep -c '^\\s*it\\.each(\\[$'` returns 10, and the token `SPELLING (in receiver-key position) RESOLVED BY REPORTS` is produced by three table headers at `:283`, `:299` and `:361`. I moved the shipped occurrence at `:305` — the `var` twin cell `k = \"requests\"; sdk[k]  ANY-BINDING-WINS`, whose exemption reason reads `The same table cell one row down, for the \\`var\\` spelling` — out of the CR-10 table under `:299` and into the WAVE-34 LOGICAL-ASSIGNMENT table under `:361`, 58 lines down and about `??=` spellings rather than `var` rebinding. RESULT: 434 passed (434). Two different tables, two different subjects, one byte-identical key. CR-20 (c) — THE DISCLOSURE IS WRONG, NOT MERELY INCOMPLETE, AND THIS IS WHAT MAKES IT A BLOCKER RATHER THAN A WARNING. Limit (5) at `:9029-9036` states, flatly, `an exemption written for one construct is NOT discharged by an occurrence sitting under a DIFFERENT one`, and states the residual as `TWO OCCURRENCES UNDER THE SAME CONSTRUCT REMAIN INTERCHANGEABLE`. I executed two cross-construct relocations that the first sentence forbids and the second does not describe. That is a stated reach exceeding an executed reach, in the paragraph written to state the reach of the fix for that exact defect — this phase's signature failure, now two levels deep. CR-21 — CONFIRMED, EXECUTED IN TWO STEPS AGAINST THE REAL FILE. First the arithmetic, run rather than read: `nameableRemainder(\"!NO-PRECEDING-CONSTRUCT! §§ {q2}\")` = `\"NOPRECEDINGCONSTRUCT\"`, length 20, so the case at `:9971` (`no exemption key's ANCHOR reduces to nothing`) PASSES it. Then the mutation. STEP 1: I planted a bare docblock `/**` + ` * any depth` + ` */` at `:7102` — whose occurrence line masks entirely to `{q2}` so the forward walk finds nothing nameable and the builder returns the sentinel — and added the matching entry `\"!NO-PRECEDING-CONSTRUCT! §§ {q2} :: q2\"` to `HEADER_QUANTIFIER_EXEMPTIONS`. RESULT: 434 passed (434). STEP 2: with the exemption entry UNCHANGED, I moved that docblock ~1,800 lines away into the middle of an `it.each` parameter table. RESULT: 434 passed (434). `\"!NO-PRECEDING-CONSTRUCT! §§ {q2} :: q2\"` is precisely the `\"{q2} :: q2\"` shape CR-17 was filed about with twenty letters of decoration bolted on, it names no construct and no line, and it is laundered through the ONE case added in the SAME WAVE to forbid that shape. I also confirmed the second half of CR-21 by grep: `NO_PRECEDING_CONSTRUCT` returns exactly FOUR hits — the declaration at `:9167` and the two `return` sites at `:9251` and `:9253`. No `expect`, no assertion, nothing observes it. The docblock's claim that the empty-anchor shape `may not be produced silently by the builder itself` asserts a mechanism that does not exist. WHERE I DISAGREE WITH THE REVIEWER, STATED PLAINLY BECAUSE I WAS ASKED TO ADJUDICATE AND NOT TO INHERIT: WR-52's sharper claim is FALSE AS WRITTEN. The reviewer says the new fixture `would be green with constructAnchorFor reduced to (lines, n) => maskQuantifiers(normalizeGateLine(lines[n - 1] ?? \"\"))`. I applied exactly that reduction to the real file and ran the fixture by name: it FAILED, with `AssertionError: the anchored key did NOT change when the occurrence moved from one construct to another` — 1 failed, 433 skipped. The fixture's probe side is REAL and it catches a line-copying anchor. What is true of WR-52 is the narrower charge: the fixture deliberately chooses an occurrence that `is not its own construct header`, so it is structurally blind to the three shipped occurrences that ARE, and its coverage sentence `This fixture proves the CROSS-CONSTRUCT case` overclaims. Coverage overclaim, not vacuity. SEVERITY, STATED THE SAME WAY IT HAS BEEN EVERY ROUND AND NOT INFLATED: NOTHING LEAKS, AND I RE-ESTABLISHED THAT RATHER THAN CARRYING IT FORWARD. `pnpm test` 31 files / 1374 tests exit 0; `tsc --build` exit 0; `pnpm check:bundle` reports the shipped bundle's entire import set as ONE specifier, `crypto`; the walk covers 23 shipped modules across both SOURCE_ROOTS at zero violations; and no shipped source byte changed this round. Every finding here is a defect in a TEST-ONLY gate's enforcement of its own description. It is a blocker on the claim-versus-enforcement standard this phase set for itself and has now enforced nine times, and on nothing else."
    severity: major
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-20 — BLOCKER, REPRODUCED TWICE BY ME AT 434/434 GREEN AGAINST THE REAL FILE. `constructAnchorFor` (`:9210-9254`) resolves a masked LINE OF TEXT truncated to 64 chars, not a site. (a) The backward scan opens at `i = lineNumber` (`:9226`) and the forward walk is bounded by the occurrence (`:9245`), so an occurrence on its own construct header — or the first content line of a docblock — anchors to ITSELF; three shipped keys are of this shape and I relocated `:1838` across 5,264 lines into an unrelated construct for a byte-identical key. (b) Anchor tokens repeat: `it.each([` is produced by 10 lines and `SPELLING (in receiver-key position) RESOLVED BY REPORTS` by 3 (`:283`, `:299`, `:361`); I relocated `:305` between two of them for a byte-identical key. Seven of 29 entries are relocatable across constructs. (c) Limit (5) at `:9029-9036` states the opposite and discloses none of it."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-21 — BLOCKER, REPRODUCED IN TWO STEPS AT 434/434 GREEN EACH. `NO_PRECEDING_CONSTRUCT = \"!NO-PRECEDING-CONSTRUCT!\"` (`:9167`) is made of letters, so `nameableRemainder` scores it 20 and the `no exemption key's ANCHOR reduces to nothing` case at `:9971` — added in the SAME commit to forbid the empty-anchor shape — passes the sentinel key. Planted a sentinel-producing occurrence plus its exemption: green. Relocated it ~1,800 lines into an unrelated construct with the exemption unchanged: green. Separately, `grep -n NO_PRECEDING_CONSTRUCT` returns four hits — one declaration, two returns, and nothing that observes the value — so the docblock's claim at `:9163-9166` that it `may not be produced silently by the builder itself` names a mechanism that does not exist."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-54 (NEW THIS PASS, FOUND BY MY OWN EXECUTION, AND IT SHARPENS THE REVIEWER'S WR-50 RATHER THAN REPEATING IT). WR-48's corrected recogniser is pinned by NOTHING. I reverted `CLOSES_FROZEN_ARRAY` at `:9762` to its pre-fix form `/^\\]\\);$/`, re-introducing the exact 117-line over-walk WR-48 was filed about, and the suite stayed GREEN at 434 of 434. The reviewer's WR-50 is right that the `proof` assertion (`:9840`, `gateLines.slice(from-1, to).some(l => l.includes(proof))`) is monotone in range width and cannot detect an over-walk, and right that exclusion three's `[500, 3000]` band already failed on WR-48's 1750 — but WR-50 names the clause-count equality as `what caught it, and what would catch the next one`, and MEASURED, it would not: the 117 lines carry zero phrasings and zero clauses, so nothing moves. The comment's closing claim at `:9758-9761` that the two exclusions are `pinned by their \\`proof\\` tokens and their bands against the day that difference matters` is false in the over-walk direction, and there is no third mechanism to name in its place. Warning: it errs safe today, because the lines it wrongly excludes raise no obligations."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-51 — CONFIRMED BY MUTATION OF THE REAL FILE. I replaced the body of `preAnchoringExemptionKeyForFixtureOnly` (`:9304-9315`) with `return \"CONSTANT\";` and ran the gate suite: 434 passed (434). The counter-probe at `:10126-10152` is satisfied by any constant function, so the docblock's structural claim at `:9297-9303` — that it is `exemptionKeyFor` with the construct half removed — is asserted nowhere and nothing keeps the two builders in step."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-52 — PARTIALLY REFUTED AND PARTIALLY CONFIRMED, BY EXECUTION. REFUTED: the reviewer's claim that the fixture would be green under `constructAnchorFor` reduced to a line copy is FALSE — I applied that reduction and ran the fixture by name; it failed with `the anchored key did NOT change when the occurrence moved from one construct to another` (1 failed, 433 skipped). The probe side is real. CONFIRMED: the fixture's own comment at `:10019-10021` states it deliberately picks an occurrence that `is not its own construct header`, which is precisely the shape CR-20(a) breaks, so its coverage sentence at `:9998-10001` (`This fixture proves the CROSS-CONSTRUCT case`) overclaims. Restate the coverage; add the own-header shape."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WINDOWS 41 / P38-D2 — ROUND 8's OWN DISCLOSURE, REPRODUCED EXACTLY AND WEIGHED AS A DISCLOSURE. Criterion (3)(d)'s re-run came back NON-CLEAN and said so. `:803` reads `CORE-11's box stays \\`[ ]\\`; wave 28 owns the flip` and `:901` reads `CORE-11's box stays \\`[ ]\\``, both unmarked, both present-tense, both attributing a flip to a wave 28 that never owned it. `:911` — TEN LINES BELOW `:901` — asserts `THE BOX'S STATE IS NOW STATED IN EXACTLY TWO PLACES`. I counted the sites that state it: `:803`, `:901`, `CORE11_BOX_EXPECTED` at `:10311`, and `REQUIREMENTS.md:46`'s checkbox. FOUR, all agreeing on `[ ]`. No contradiction of FACT, so this is not what keeps the box at `[ ]` — but `:911` is itself a false standing statement on a reader surface, which is the class criterion (3) is about. Recorded rather than repaired because the gate file was closed after 01-37 and 01-38 was prohibited from editing it; that is the right call and it was disclosed before I looked."
    missing:
      - "CORE-11 STAYS `[ ]`. A SEVENTH ROUND, AND — UNLIKE PASS 8 — NOT A FOURTH REVERT: the box is ALREADY `[ ]` at `4105fd0`, the pin at `:10311` already agrees, and round 8 did not flip it. Plan 01-38's P38-D3 deliberately left `requirements mark-complete` unrun and handed the determination here. That is the correct handoff and I am making the determination: the box may NOT move. Criterion (3) is unmet on its MECHANISM leg. Two of the three criteria are discharged, the document leg of the third is now discharged too, and what remains is one seam."
      - "CR-20: MAKE THE ANCHOR IDENTIFY A SITE. Two changes, both small, and the file's own reviewer wrote both. (1) Open the backward scan STRICTLY ABOVE the occurrence — `for (let i = lineNumber - 1; i >= 1; i--)` — so an occurrence sitting ON a title or docblock line resolves to the `describe`/`const` that encloses THAT, which is what `the construct it sits under` means. (2) Make an ambiguous token LOUD: census every line's token and assert that each anchor in use is produced by exactly ONE line of the file. Then restate limit (5) to what executes. My two relocations — `:1838` -> `:7102` and `:305` -> under the `:361` table — should both land as failing-path fixtures, because a guard against relocation that has never been watched failing is the same unwatched assertion this file has spent ten waves removing, and round 8 built one such fixture while excluding the shape that breaks it."
      - "CR-21: EXCLUDE THE SENTINEL FROM `nameableRemainder`'s NOTION OF NAMING SOMETHING, and assert the sentinel is never produced by an occurrence on the scanned surface. Both are green on arrival — I measured zero shipped occurrences resolving to it today — so this costs nothing now and is a real guard from the next sentence someone writes. Also correct the constant's docblock on two counts: it does not describe the `:9251` return (which fires when a construct DID resolve but named nothing), and it claims an observability the code does not have."
      - "WR-54 + WR-50: PIN THE RECOGNISER ITSELF, and stop naming mechanisms that do not hold. I re-introduced WR-48's over-walk and the suite stayed green, so exclusion three's WIDTH is currently pinned by nothing at all. Assert the resolved range directly — `expect(closingBracketAfter(registryStart)).toBe(lineOf(l => l.startsWith('] as readonly ResolverRecord[]);')))`, or pin the size — and rewrite the closing sentence at `:9758-9761`: the `proof` token is monotone in width and cannot catch an over-walk, the band did not catch 1750, and the clause-count equality would not have caught this one either because the swallowed lines carry no clauses."
      - "WR-51: PIN THE COUNTER-PROBE TO THE LIVE BUILDER'S LINE HALF, so the contrast is against the format CR-17 was actually measured in rather than against any constant."
      - "WR-52: ADD THE OWN-HEADER SHAPE AS A SECOND ARRAY IN THE SAME CASE and restate the coverage sentence to name the 26/3 split. Note when doing so that the fixture's probe side IS real — I falsified the reviewer's stronger reading of this finding — so this is a widening, not a rebuild."
      - "WINDOWS 41: SWEEP `:803-804` AND `:901`, AND CORRECT `:911`. The gate file is open again now that the round is closed. Either mark the two occurrences as history in their own bytes, per P38-D1's line-granularity rule, or delete them under wave 33's own pointer-not-a-bound disposition — and change `EXACTLY TWO PLACES` to the measured count or to a form that does not state a count."
      - "DO NOT RE-OPEN THE RE-SCOPE. Pass 8 tested it for a quietly-lowered bar and found none; I did not re-test it and I am not reporting it as a defect. The `[x]` is unearned because criterion (3)'s mechanism is bypassable, not because the bar is wrong. What I will add is that round 8 is EVIDENCE FOR the re-scope rather than against it: the two document legs closed in one round, and they closed against my measurement and not merely against a summary."
deferred: []
behavior_unverified_items: []
coincidental_reliance_items:
  - truth: "URL userinfo does not reach `observations.url`"
    reason: undeclared-precondition
    harden: "Carried forward from rounds 3-7 unchanged and still correct. The `://` precondition is DECLARED at `schema.spec.ts:115-123` rather than assumed, but the guarantee still rests on `consumer.ts` handing over an absolute `rr.request.getUrl()`. Advisory, no score effect."
  - truth: "The derived residual states the whole bound on CORE-11"
    reason: undeclared-precondition
    harden: "REOPENED ONE LEVEL FURTHER IN FOR THE FOURTH CONSECUTIVE ROUND, and the pattern is now the finding. Round 5: nothing bound a `clause` to its branch — closed by wave 29. Round 6: the guards scanned only `RESOLVER_REGISTRY[].clause` while 3,464 hand-written lines stated bounds — closed by wave 33 deleting them. Round 7: the whole-file guard reached those lines but its EXEMPTION MAP was unanchored — addressed by wave 36's `constructAnchorFor`. Round 8: the anchor is a masked LINE, not a site, so 7 of 29 entries still relocate invisibly and the sentinel added beside it re-opens the original shape verbatim. Each round the undeclared precondition moves one layer down the SAME mechanism, and each round the layer is thinner: 29 of 29 relocatable, then 7 of 29. Harden by making the anchor a site — a strictly-above scan plus a uniqueness census — and note that this is now a two-line change rather than a new mechanism."
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
    evidence: "FAIL-CLOSED for the eighth consecutive round, but this round THE LEDGER AND I AGREE — the row says `[ ]`, the pin says `[ ]`, and I find criterion (3) unmet. THE MUST-NOT ITSELF HOLDS AND I RE-ESTABLISHED IT INDEPENDENTLY: `pnpm test` 31 files / 1374 tests exit 0; `tsc --build` exit 0; `pnpm check:bundle` -> ONE specifier, `crypto`; the walk covers 23 shipped non-spec modules across both SOURCE_ROOTS at ZERO violations; and `git diff --name-only 9b3ff46..HEAD -- packages/ scripts/` filtered of `.spec.ts` is EMPTY, so no shipped byte moved this round. RE-CONFIRMED BY MY OWN PROBES THROUGH THE SHIPPED `auditSource`: all six operator-around-a-global shapes report; `fetch.call(null, url)` and `const f = fetch; f.call(null, url)` -> [\"outbound-fetch\"]; `const m = \"send\"+\"Beacon\"; navigator[m](u,d)` -> [\"outbound-unanalysable\"]. STILL SILENT AND STILL PROPERLY DISCLOSED: `WebSocket.call(null, u)` -> `[]`, carried as the named row `silence-outbound-ctor-receiver-position` with an executed probe and counter-probe, one of 26 `measured-silence` rows in a 61-row registry. WHY THIS IS STILL `unverified`: the re-scoped bar admits an `[x]` ONLY when the residual is DERIVED, DRIFT-DETECTABLE and THE SOLE BOUND. (1) and (2) hold. (3)'s DOCUMENT leg is now discharged — CR-18 and CR-19 both closed against my own measurement. (3)'s MECHANISM leg is not: I planted a shipped sentence into an unrelated construct 5,264 lines away for a byte-identical key (434/434 green), relocated a shipped table cell between two identically-headed tables for a byte-identical key (434/434 green), and drove the `!NO-PRECEDING-CONSTRUCT!` sentinel — CR-17's `\"{q2} :: q2\"` shape with twenty letters bolted on — through the very case added in the same wave to forbid it (434/434 green, twice). A `verification: gate` prohibition whose own acceptance criterion is unmet is not verified, and the box correctly reads `[ ]`."
  - requirement_id: STORE-03
    statement: "MUST NOT persist a query-string VALUE from a target-controlled URL into observations.url. Parameter names, path, scheme and host are retained; every value is replaced before the row is written."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "HOLDS. Carried forward from rounds 6-7. `packages/backend/src/store/observations.ts` has been byte-identical in its non-comment lines since wave 26 and no shipped source changed this round, so round 6's 3,612-input sweep (four parameter-name lengths x 301 offsets x three grammars, zero occurrences of the secret in 7,224 outputs, zero outputs over `URL_MAX`), round 5's 16,160-input sweep and wave 35's 19,772-input re-measurement all apply unchanged. Regression-checked this round inside the green 1,374-test suite. WR-39 remains a DISCLOSURE defect about which offsets are unstable, not a failure of the prohibition."
  - requirement_id: STORE-07
    statement: "MUST NOT render a caught exception into a persisted or logged string without passing it through describeError first."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "Carried forward from rounds 4-7, where the gate's own `auditSource` was executed in both directions: `flag ? e.message : \"none\"`, `e.message ?? \"none\"`, `e.message || \"none\"` and `flag && e.message` all report `unredacted-concat`, and every `describeError` twin stays quiet. No shipped source changed this round. Regression-checked inside the green 1,374-test suite."
  - requirement_id: CORE-10
    statement: "MUST NOT present partial passive coverage as complete."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Carried forward unchanged and previously accepted by the operator at UAT test 3. Nothing changed this round. Counter identifiers remain honest — `proxiedResponsesObserved`, and the cap-drop counter at `telemetry.ts:100` is labelled `CORE-03 visible overflow`. Judgment-tier, autonomous run: NON-AUTHORITATIVE LLM-judge verdict, human review recommended."
  - requirement_id: STORE-01
    statement: "MUST NOT retain operator browsing evidence beyond what the analysis needs — no body bytes, headers, cookies, or column capable of holding a secret."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Carried forward from rounds 3-7 substantially unchanged; nothing changed this round. The column-shape half is gated (PRAGMA-read allowlist + forbidden-name check). The 'capable of holding a secret' half is honestly bounded rather than contradicted: `observations.url` can still hold a path-embedded token and a retained parameter NAME, both named in the OPEN list, both pinned, the second kept BY POLICY under the operator's 2026-08-21 UAT decision. Judgment-tier: NON-AUTHORITATIVE, human review recommended."
---

# Phase 1: Skeleton, Persistence, Compatibility — Verification Report

**Phase Goal:** A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Verified:** 2026-08-26T14:40:00Z
**Status:** gaps_found
**Re-verification:** Yes — verification pass 9, after gap-closure ROUND 8 (waves 36, 37, 38), commits `6c2c5ce..e0d17b8`

---

## THE VERDICT, FIRST

**CORE-11's box may NOT move. It reads `[ ]`, and it stays `[ ]`.**

This is the seventh consecutive round at **8/9**, and the same truth every time. But it is
**not a fourth revert** — round 8 did not flip the box, `4105fd0` had already reverted it,
`CORE11_BOX_EXPECTED` at `:10311` already agrees, and plan 01-38's P38-D3 deliberately left
`requirements mark-complete` unrun and handed the determination here. That is the correct
handoff, and this is the determination.

**Criterion (3) THE SOLE BOUND is unmet on its MECHANISM leg. The DOCUMENT leg is closed.**

That split is the whole practical content of this report, and it is new:

| Criterion 3 leg | Pass 8 | Pass 9 |
| --- | --- | --- |
| Document surfaces — `REQUIREMENTS.md:46` (CR-18), `STATE.md:366` (CR-19) | ✗ both failed | **✓ both CLOSED, against my own measurement** |
| The exemption-anchoring mechanism (CR-17) | ✗ failed, 29 of 29 relocatable | ✗ **still failed, 7 of 29 relocatable** (CR-20, CR-21) |

Round 8 closed two of the three things pass 8 asked for, and its correction of the third
narrowed the hole from twenty-nine entries to seven. It did not close it.

---

## The two Critical findings, adjudicated by MY OWN EXECUTION against the real file

The reviewer used an out-of-tree scratch harness that lifted the round-8 helpers verbatim.
I was asked to reproduce or refute against the real tree, so **every result below comes from
a mutation planted in `packages/backend/src/outbound-prohibition.spec.ts` and the real gate
suite run over it.** All mutations were restored; `git diff --exit-code -- packages/ scripts/ tests/`
returns 0 at the end of this session.

**Baseline, established before any mutation:** `pnpm test` → 31 files / **1374 tests**, exit 0.
`pnpm exec tsc --build` → exit 0. `pnpm check:bundle` → `packages/backend/dist/index.js: 1 import specifier(s): crypto`.
Gate suite alone → **434 passed (434)**.

### CR-20 — CONFIRMED. Both legs, both executed, both green.

#### (a) Self-anchoring — a shipped sentence moved 5,264 lines into a different construct, invisibly

I deleted the shipped occurrence at `:1838`:

```
 * Every non-spec module the plugin SHIPS, under either source root, at any depth.
```

from the docblock at `:1837` that describes the **FILE WALK's directory recursion**, and
planted it verbatim at `:7102`, immediately above an `it(` about `receiverAliases`' logical-assignment
branch, inside `describe("an outbound receiver, however it was bound")`:

```
  // Every non-spec module the plugin SHIPS, under either source root, at any depth.
```

**Result: `Tests 434 passed (434)`. Zero failures.** Restored; 434 passed.

That exemption's entire reason is construct-dependent — it reads *"Not a claim about the
OUTBOUND WALK's resolution reach at all: it describes the FILE WALK's directory recursion"*.
Relocated, the sentence becomes a false universal about the outbound walk, sitting in the
outbound walk's own describe block. **The reason is now false and the key did not move.**

**The cause, read off the code rather than guessed.** `constructAnchorFor` opens its backward
scan **at** the occurrence, and its forward walk is bounded **by** the occurrence:

```ts
for (let i = lineNumber; i >= 1; i--) {        // :9226 — starts AT the occurrence
  ...
  for (let k = head; k <= lineNumber; k++) {   // :9245 — bounded BY the occurrence
```

For a docblock's first content line, or for an `it(` title, that forward walk lands on the
occurrence's **own line**, and the construct half becomes a 64-character prefix of the line
half. Three shipped keys are visibly of this shape on the face of the map — you can read the
duplication without running anything:

```
"Every non-spec module the plugin SHIPS, under either source root… §§ Every non-spec module the plugin SHIPS, under either source root, at {q2}. :: q2"
```

#### (b) Ambiguous anchor tokens — a table cell moved between two identically-headed tables, invisibly

The anchor is a line of text, and lines repeat. Measured against the real file:

```
$ grep -c '^\s*it\.each(\[$'  →  10
```

and `SPELLING (in receiver-key position) RESOLVED BY REPORTS` is produced by three table
headers at `:283`, `:299` and `:361`.

I moved the shipped occurrence at `:305` — the `var` twin cell
``//        k = "requests"; sdk[k]                   ANY-BINDING-WINS`` — out of the CR-10
table headed at `:299` and into the **wave-34 logical-assignment table** headed at `:361`,
which is about `??=` spellings. Its exemption reason reads *"The same table cell one row
down, for the `var` spelling"* — false in its new home.

**Result: `Tests 434 passed (434)`.**

#### (c) The disclosure is wrong, not merely incomplete — and that is what makes this a blocker

Limit (5) at `:9029-9036` says, flatly:

> an exemption written for one construct is **NOT** discharged by an occurrence sitting under
> a DIFFERENT one. IT DOES NOT FOLLOW THAT AN EXEMPTION CANNOT BE DISCHARGED BY A DIFFERENT
> OCCURRENCE: TWO OCCURRENCES UNDER THE SAME CONSTRUCT REMAIN INTERCHANGEABLE

I executed two cross-construct relocations that the first sentence forbids and the second
does not describe. **This is a stated reach exceeding an executed reach, inside the paragraph
written to state the reach of the fix for that exact defect.** Two levels deep now.

### CR-21 — CONFIRMED. Two steps, both green, plus the grep.

**The arithmetic, run rather than read:**

```
anchor    = "!NO-PRECEDING-CONSTRUCT! §§ {q2}"
remainder = "NOPRECEDINGCONSTRUCT"   len 20
passes toBeGreaterThan(0)?  true
```

So the case at `:9971` — *"no exemption key's ANCHOR reduces to nothing"*, added in the **same
commit** as the sentinel, to forbid exactly this shape — passes it.

**Step 1.** Planted a bare docblock whose occurrence line masks away entirely, so the forward
walk finds nothing nameable and the builder returns the sentinel, plus the matching exemption
entry `"!NO-PRECEDING-CONSTRUCT! §§ {q2} :: q2"`:

```
  /**
   * any depth
   */
```

**Result: 434 passed (434).**

**Step 2.** With the exemption entry **unchanged**, moved that docblock ~1,800 lines away into
the middle of an `it.each` parameter table — a completely unrelated construct.

**Result: 434 passed (434).**

`"!NO-PRECEDING-CONSTRUCT! §§ {q2} :: q2"` is precisely CR-17's `"{q2} :: q2"` with twenty
letters of decoration bolted on. It names no construct and no line, and it is laundered
through the one case that exists to catch it.

**And nothing observes the sentinel.** `grep -n "NO_PRECEDING_CONSTRUCT"` returns **four**
hits: the declaration at `:9167` and the two `return` sites at `:9251` and `:9253`. No
`expect`, no assertion. The docblock's claim that an empty anchor *"may not be produced
silently by the builder itself"* names a mechanism that does not exist.

---

## Where I DISAGREE with the reviewer, stated plainly

I was asked to adjudicate, not inherit, and one finding does not survive execution.

**WR-52's sharper claim is FALSE as written.** The reviewer says the new fixture *"would be
green with `constructAnchorFor` reduced to `(lines, n) => maskQuantifiers(normalizeGateLine(lines[n - 1] ?? ""))`"*.
I applied exactly that reduction to the real file and ran the fixture by name:

```
× a CROSS-CONSTRUCT relocation yields a DIFFERENT anchored key … 6ms
AssertionError: the anchored key did NOT change when the occurrence moved from one construct to another.
Tests  1 failed | 433 skipped (434)
```

**The fixture's probe side is real and it catches a line-copying anchor.** What survives of
WR-52 is the narrower charge, and it is a fair one: the fixture deliberately picks an
occurrence that *"is not its own construct header"*, so it is structurally blind to the three
shipped occurrences that are — and its coverage sentence *"This fixture proves the
CROSS-CONSTRUCT case"* overclaims. **Coverage overclaim, not vacuity.** Round 8 built a real
fixture and then described it as covering more than it does.

---

## One finding neither pass 8 nor the reviewer has: WR-54

WR-50 says the `proof` token and the bands do not pin exclusion three, and names the
**clause-count equality** as *"what caught it, and what would catch the next one"*. I tested
that by reverting `CLOSES_FROZEN_ARRAY` at `:9762` to its pre-fix form `/^\]\);$/` —
re-introducing the **exact** 117-line over-walk WR-48 was filed about.

**Result: 434 passed (434).**

So the clause-count equality would **not** catch it either, for the same reason round 8's own
measurement gives: the 117 lines carry **zero** phrasings and zero clauses, so nothing moves.
WR-48's correction is right, honest, and **pinned by nothing at all** — it can silently
revert. The closing sentence at `:9758-9761` naming `proof` tokens and bands as the backstop
is false in the over-walk direction, and there is no third mechanism to substitute.

Warning, not blocker: it errs safe, because the wrongly-excluded lines raise no obligations.

---

## Pass 8's four findings — closed or not

### CR-18 — **CLOSED.** Measured on the row, not read from the summary.

`.planning/REQUIREMENTS.md:46` is now 23,966 bytes and its checkbox reads `- [ ] **CORE-11**`.
The three passages still appear **once each** as strings, which looks damning until you read
the surrounding bytes — I extracted 260 chars before and 420 after each, and all three land
inside **one enumeration sentence that names them as removed**:

> THREE PASSAGES LEFT THIS ROW IN THIS CORRECTION and NONE was deleted: the passage opening
> `WHY THE BOX IS`, the passage opening `THE BOX IS DELIBERATELY STILL`, and the sentence
> opening `When this box is eventually` …

That is **mention, not use**. The passages themselves live at `:190`, `:192` and `:194` as
`PASSAGE ONE / TWO / THREE` in a dated block attributed to plan 01-38. The row states no box
state of its own — which is the cheaper of the two dispositions pass 8 prescribed, and the
one taken.

### CR-19 — **CLOSED.** I re-executed all six probes rather than accepting the report of them.

| Shape | Old `STATE.md:366` claimed | I measured, this session |
| --- | --- | --- |
| `(ok && globalThis).fetch(url)` | reports NOTHING | `["outbound-fetch"]` |
| `(globalThis ?? self).fetch(url)` | reports NOTHING | `["outbound-fetch"]` |
| `(globalThis \|\| self).fetch(url)` | reports NOTHING | `["outbound-fetch"]` |
| `(b ? globalThis : self).fetch(url)` | reports NOTHING | `["outbound-fetch"]` |
| `(ok && window).fetch(url)` | reports NOTHING | `["outbound-fetch"]` |
| `(ok && navigator).sendBeacon(u,d)` | reports NOTHING | `["outbound-beacon"]` |

Six of six report — which is what the corrected line now says. I also re-counted the registry
rather than trusting it: **61 rows, 26 of `kind: "measured-silence"`**, and
`grep -n 'id: "silence-operator-around-global-receiver"'` returns **nothing**. The one
in-range hit at `:5751` is a tombstone comment recording the removal. The corrected line
explicitly does *not* instruct anyone to restore the row.

### WR-48 — **CLOSED, and its correction survived measurement.**

`CLOSES_FROZEN_ARRAY = /^\]( as [^)]*)?\);$/` matches `] as readonly ResolverRecord[]);` at
`:5767`. Exclusion three resolves **4135..5767 = 1633 lines**, matching limit (4)'s restated
figure to the line. I sliced the 117 returned lines and counted all nine declared phrasings
across them:

```
anywhere in the file 0 · everywhere in the file 0 · any depth 0 · every literal 0 · ANY of them 0
every spelling 0 · every reachable spelling 0 · ANY string literal 0 · ANY-BINDING-WINS 0
TOTAL 0
```

The docblock's *"MEASURED AFTER THE CHANGE rather than predicted before it: ZERO"* is
accurate. **Rounds 5 through 7 could not say that** — the correction was usually the next
defect. See WR-54 for the one thing still missing: the corrected recogniser is unpinned.

### CR-17 — **NOT CLOSED.** Narrowed from 29 of 29 to 7 of 29. See CR-20 and CR-21.

---

## Round 8's two disclosures against itself — weighed as disclosures

**1. Criterion (3)(d)'s re-run came back NON-CLEAN and said so.** I reproduced it exactly.
`:803` reads ``CORE-11's box stays `[ ]`; wave 28 owns the flip`` and `:901` reads
``CORE-11's box stays `[ ]``` — both unmarked, both present-tense, both attributing a flip to
a wave 28 that never owned it. Ten lines below `:901`, `:911` asserts **"THE BOX'S STATE IS
NOW STATED IN EXACTLY TWO PLACES"**. I counted: `:803`, `:901`, `CORE11_BOX_EXPECTED` at
`:10311`, and `REQUIREMENTS.md:46`'s checkbox. **Four, all agreeing on `[ ]`.**

No contradiction of fact — so this is not what keeps the box at `[ ]`. But `:911` is itself a
false standing statement on a reader surface, which is the class criterion (3) is about. The
gate file was closed after 01-37 and 01-38 was prohibited from editing it, so this was
**recorded rather than repaired** (WINDOWS 41, P38-D2). That is the right call, it was
disclosed before I looked, and repairing it silently would have made the re-run
indistinguishable from one that overlooked it — the defect the re-run exists to correct.

**2. The ledger enumeration exceeded its floor by two** and was reported as findings rather
than absorbed. The floor had already been falsified twice during planning. Reporting your own
overshoot is the behaviour this phase has been trying to build.

**Both disclosures land in round 8's favour.** A round that measures its own handoff RED
before building on it (01-36 found HEAD `4105fd0` at 2 failed of 1372), watches a fixture
fail before shipping it (01-37, `1 failed | 433 passed`), and reports a non-clean re-run of
its own success criterion is a round doing the thing this phase asked for. It simply did not
finish the mechanism.

---

## Goal Achievement — the seven ROADMAP success criteria

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `onInterceptResponse` non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `hooks/passive.ts:117` — *"The registered `onInterceptResponse` callback. NOT async"*; `index.ts:31` documents registration last, after `init()`. Unchanged this round; green in 1374 tests. |
| 2 | Work queue bounded, overflow count visible, never unbounded | ✓ VERIFIED | `hooks/passive.ts:40` — *"BOUNDED. The queue drops the oldest entry at cap"*; `telemetry.ts:100` — *"Entries the queue dropped because it was at cap (CORE-03 visible overflow)"*. |
| 3 | 200-chunk SPA leaves plugin UI and RPC responsive; max synchronous slice recorded, under the Phase 0 threshold | ✓ VERIFIED | Live measurement committed at `results/spa-load.json` (6,185 bytes), taken from **outside** the process by an external REST prober (decision P5-D3), against `caido-cli 0.57.1` with a pinned sha256. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `store/analyses.ts:3` — *"One row per (project_id, sha256, detector_set_hash)"*; `:111` `INSERT INTO analyses (project_id, sha256, detector_set_hash, …)`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; non-UTF-8 fixture round-trips | ✓ VERIFIED | `ingest/consumer.ts:189` `const raw = body.toRaw();`. |
| 6 | CI gate fails the build if the backend bundle imports a specifier outside the Phase 0 allowlist | ✓ VERIFIED | `package.json:13` wires `check:bundle`. **Executed this session:** `1 import specifier(s): crypto`. |
| 7 | Below-minimum Caido produces a clear message, not an obscure failure | ✓ VERIFIED | `compat.ts:43` `export const MIN_CAIDO = "0.57.1";`, with the user-facing message at `:332`. |
| 8 | Redaction: no query-string value from a target-controlled URL reaches `observations.url` | ✓ VERIFIED | STORE-03. `observations.ts` non-comment-byte-identical since wave 26 and untouched this round; sweep evidence from rounds 5-7 applies unchanged. |
| 9 | **No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)** | **✗ FAILED (partial)** | **The one that does not hold.** The must-NOT holds and I re-established it. Criterion (3)'s **mechanism** does not — three relocations at 434/434 green. |

**Score: 8/9 truths verified.** Seventh consecutive round at 8/9, the same truth each time.

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `packages/backend/src/hooks/passive.ts` | Non-async hook, cheap gates, bounded enqueue | ✓ VERIFIED | Wired from `index.ts`; cap consulted. Untouched this round. |
| `packages/backend/src/ingest/consumer.ts` | `toRaw()` byte path | ✓ VERIFIED | Wired; feeds the digest. Untouched. |
| `packages/backend/src/store/analyses.ts` | `project_id`-keyed persistence, hash-once | ✓ VERIFIED | Wired; insert carries the key. Untouched. |
| `packages/backend/src/store/observations.ts` | URL redaction before write | ✓ VERIFIED | Wired; non-comment bytes unchanged since wave 26. |
| `packages/backend/src/compat.ts` | Minimum-version gate with a clear message | ✓ VERIFIED | Wired. Untouched. |
| `scripts/ci/check-bundle-imports.mjs` | Allowlist gate | ✓ VERIFIED | Executed: 1 specifier, `crypto`. |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 enforcement + derived, drift-detectable, singular disclosure | ⚠️ **PARTIAL** | Enforcement runs green over 23 real modules, 0 violations. Criteria (1) and (2) hold. **Criterion (3)'s mechanism is bypassable in 7 of 29 entries (CR-20, executed twice) and via the sentinel added to guard it (CR-21, executed twice).** |
| `.planning/REQUIREMENTS.md:46` | The ledger row for CORE-11 | ✓ **REPAIRED** | Now a pointer. `[ ]`, no standing statement of the box's state; three passages relocated to `:190/:192/:194`. |
| `.planning/STATE.md` `### Blockers` | Live blockers | ✓ **REPAIRED** | Six probes re-executed by me: six of six report. Registry re-counted: 61 rows, 26 measured-silence, named row absent. |

### Behavioural Spot-Checks — every row is a command I ran this session

| Behaviour | Command | Result | Status |
| --- | --- | --- | --- |
| Full suite green | `pnpm test` | 31 files / **1374 tests** exit 0 | ✓ PASS |
| Types sound | `pnpm exec tsc --build` | exit 0 | ✓ PASS |
| Bundle allowlist | `pnpm check:bundle` | `1 import specifier(s): crypto` | ✓ PASS |
| Gate suite alone | `pnpm exec vitest run …/outbound-prohibition.spec.ts` | **434 passed (434)** | ✓ PASS |
| Shipped modules walked | `find packages/*/src -name '*.ts' ! -name '*.spec.ts'` | **23** across both roots | ✓ PASS |
| No shipped code changed | `git diff --name-only 9b3ff46..HEAD -- packages/ scripts/ \| grep -v '\.spec\.ts$'` | EMPTY | ✓ PASS |
| **CR-20(a)** `:1838` relocated 5,264 lines into an unrelated construct | gate suite | **434 passed (434)** | ✗ **FAIL — should have gone red** |
| **CR-20(b)** `:305` relocated between two identically-headed tables | gate suite | **434 passed (434)** | ✗ **FAIL — should have gone red** |
| **CR-21** sentinel occurrence + matching exemption planted | gate suite | **434 passed (434)** | ✗ **FAIL — the null-anchor case should have caught it** |
| **CR-21** same occurrence relocated ~1,800 lines, exemption unchanged | gate suite | **434 passed (434)** | ✗ **FAIL — should have gone red** |
| **WR-54** `CLOSES_FROZEN_ARRAY` reverted to `/^\]\);$/` (re-introducing WR-48) | gate suite | **434 passed (434)** | ✗ **FAIL — the correction is unpinned** |
| **WR-51** `preAnchoringExemptionKeyForFixtureOnly` → `() => "CONSTANT"` | gate suite | **434 passed (434)** | ✗ **FAIL — counter-probe pins nothing** |
| **WR-52** `constructAnchorFor` reduced to a line copy | fixture by name | **1 failed \| 433 skipped** | ✓ PASS — **reviewer's stronger claim REFUTED** |
| WR-48 arithmetic | 9 phrasings × 117 restored lines | **0 obligations**; exclusion three = 1633 | ✓ PASS |
| CR-19 falsification, re-run | six operator-around-global shapes | all six report | ✓ PASS — STATE.md now correct |
| CR-15 closure | `fetch.call(null,url)` / `const f = fetch; f.call(null,url)` | both `["outbound-fetch"]` | ✓ PASS |
| CR-16 closure | `const m="send"+"Beacon"; navigator[m](u,d)` | `["outbound-unanalysable"]` | ✓ PASS |
| Disclosed residual still silent | `WebSocket.call(null,u)` | `[]` — named row + probe + counter-probe | ✓ PASS (disclosed) |
| Removed row still absent | `grep 'id: "silence-operator-around-global-receiver"'` | zero hits; `:5751` is a tombstone comment | ✓ PASS |

### Requirements Coverage

All 23 requirement ids the phase is tagged with resolve in `REQUIREMENTS.md` and appear in at
least one plan. **No orphans, no unclaimed ids.**

| Requirement | Box | Status |
| --- | --- | --- |
| CORE-01 … CORE-10 (`:36-45`) | `[x]` | ✓ SATISFIED |
| **CORE-11** (`:46`) | **`[ ]`** | ✗ **BLOCKED — criterion (3) mechanism leg** |
| STORE-01 … STORE-07 (`:783-789`) | `[x]` | ✓ SATISFIED (STORE-01 judgment-tier, flagged) |
| COMPAT-01, COMPAT-02 (`:907-908`) | `[x]` | ✓ SATISFIED |
| ENC-01 (`:912`) | `[x]` | ✓ SATISFIED |
| DIST-05, DIST-06 (`:954-955`) | `[x]` | ✓ SATISFIED |

**22 of 23 boxes read `[x]`, and CORE-11's correctly reads `[ ]`.** The ledger and this report
agree for the first time in three passes.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `outbound-prohibition.spec.ts` | 9226, 9245 | Backward scan opens **at** the occurrence; forward walk bounded **by** it — anchor collapses to the occurrence's own line | 🛑 Blocker | 3 of 29 keys carry no positional information; relocation invisible (CR-20a, executed) |
| `outbound-prohibition.spec.ts` | 9210-9254 | Anchor token is a line of text; `it.each([` produced by 10 lines, one table header by 3 | 🛑 Blocker | 4 more keys relocatable across constructs (CR-20b, executed) |
| `outbound-prohibition.spec.ts` | 9029-9036 | Limit (5) states the residual as same-construct only | 🛑 Blocker | Falsified by both executed relocations |
| `outbound-prohibition.spec.ts` | 9167, 9971 | `!NO-PRECEDING-CONSTRUCT!` sentinel scores 20 on `nameableRemainder`, defeating the case added beside it | 🛑 Blocker | CR-17's key shape re-opened verbatim (CR-21, executed twice) |
| `outbound-prohibition.spec.ts` | 9163-9166 | Docblock claims the sentinel "may not be produced silently"; four grep hits, none an assertion | ⚠️ Warning | Names a mechanism that does not exist |
| `outbound-prohibition.spec.ts` | 9758-9761 | Names `proof` tokens and bands as pinning exclusion three | ⚠️ Warning | Neither can catch an over-walk; nor can the equality (WR-54, executed) |
| `outbound-prohibition.spec.ts` | 9297-9315, 10126-10152 | Counter-probe satisfied by any constant function | ⚠️ Warning | WR-51, executed |
| `outbound-prohibition.spec.ts` | 9998-10001 | Fixture coverage sentence overclaims (excludes the own-header shape) | ⚠️ Warning | WR-52, partially refuted |
| `outbound-prohibition.spec.ts` | 803, 901, 911 | Two unmarked standing statements; "EXACTLY TWO PLACES" measures four | ⚠️ Warning | Disclosed by round 8 as WINDOWS 41 / P38-D2; all four agree on `[ ]` |

**No debt markers** — `grep -rn -E "\bTBD\b|\bFIXME\b|\bXXX\b"` over `packages/*/src` and
`scripts/` returns nothing, as do `TODO`/`HACK`/`PLACEHOLDER` and `.skip(`/`.only(`/`.todo(`.

### Working tree

`git diff --exit-code -- packages/ scripts/ tests/` returns **0**. Six mutations were planted
and all six restored. `.planning/config.json` carries the pre-existing uncommitted harness
setting noted in the brief — not mine, not touched. `01-REVIEW.md` carries the reviewer's
just-filed round-8 section, also not mine.

---

## On severity — a defect in the enforcement of a claim, not a live vulnerability

**Nothing leaks, and I re-established that this session rather than carrying it forward.**
31 files / 1374 tests exit 0 with the gate walking 23 shipped modules across both
`SOURCE_ROOTS` at zero violations; `tsc --build` exit 0; the shipped bundle's entire import
set is one specifier, `crypto`; and **no shipped source byte changed this round** — round 8's
entire code delta is `+467/-43` in one test file.

Every finding in this report is a defect in a **test-only gate's enforcement of its own
description**. CR-20 and CR-21 are blockers because they falsify the central claim of the work
under review and re-open the finding it was written to close, not because anything reaches a
network.

## Human Verification Required

None newly raised. The judgment-tier prohibitions (CORE-10, STORE-01) remain flagged
`unverified` with NON-AUTHORITATIVE LLM-judge verdicts, carried forward and previously
accepted by the operator at UAT; nothing about them changed this round.

## Gaps Summary

One gap, the same truth for the seventh consecutive round — and for the first time **half of
it closed**.

Round 8 was a good round and the evidence says so under adversarial pressure. It measured its
own handoff RED before building on it. It watched a fixture fail before shipping it. It
reported a non-clean re-run of its own success criterion instead of quietly overlooking it,
and reported its own enumeration overshoot as findings. **CR-18, CR-19 and WR-48 are all
genuinely closed and all three survived my re-measurement** — the CR-19 probes I re-executed
myself, the WR-48 arithmetic I recounted phrasing by phrasing across all 117 lines.

What did not close is the mechanism. `constructAnchorFor` resolves a **masked line of text**,
not a site, and the two shapes that follow — an occurrence that is its own anchor, and an
anchor token produced by more than one line — leave **7 of 29 entries** relocatable across
constructs. I drove two shipped occurrences through that hole and the sentinel added in the
same wave through a third, four runs, **434 of 434 green every time**. Limit (5) says the
opposite of what executes.

**The fix is smaller than the last one.** Open the backward scan one line higher; assert every
anchor in use names exactly one line of the file; exclude the sentinel from `nameableRemainder`
and assert it is never produced. Three changes, all green on arrival, all in one file that is
now open again. Then re-run.

**CORE-11's box stays `[ ]`.** Not a fourth revert — it is already `[ ]`, the pin agrees, and
plan 01-38 correctly declined to move it and handed the determination here. The determination
is: **criterion (3)'s mechanism leg is unmet, so the box may not move.**

---

_Verified: 2026-08-26T14:40:00Z_
_Verifier: Claude (gsd-verifier), verification pass 9_
