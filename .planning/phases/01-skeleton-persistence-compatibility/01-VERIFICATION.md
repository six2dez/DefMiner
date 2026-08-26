---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-26T17:50:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  previous_verified: 2026-08-26T14:40:00Z
  round: 9
  verification_pass: 10
  history: "pass 4 (round 3) -> pass 5 (round 4) -> pass 6 (round 5) -> pass 7 (round 6) -> pass 8 (round 7) -> pass 9 (round 8) -> pass 10 (round 9). Score has read 8/9 for EIGHT consecutive passes and the open truth has been the same one every time: truth 9, CORE-11 outbound enforcement. CORE-11's box has been flipped and reverted THREE times — `e7cc4b6`, `faca607`, `4105fd0` — and has now stood at `[ ]` for three consecutive rounds with the pin agreeing."
  gaps_closed:
    - "CR-21 — CLOSED, AND I DROVE THE EXACT SHAPE THROUGH IT RATHER THAN READING THE DIFF. `nameableRemainder` now strips the sentinel BY REFERENCE (`:9256`, `.split(NO_PRECEDING_CONSTRUCT).join(\"\")`), not by re-spelling it. I planted the hand-written key `\"!NO-PRECEDING-CONSTRUCT! §§ {q2} :: q2\"` — verbatim the key pass 9 laundered through the null-anchor case at 434/434 green — into `HEADER_QUANTIFIER_EXEMPTIONS` and ran the gate suite: THREE cases fired, `Tests 3 failed | 436 passed (439)`, and the load-bearing one is the null-anchor case itself: `exemption key \"!NO-PRECEDING-CONSTRUCT! §§ {q2} :: q2\" carries an ANCHOR that reduces to NOTHING … expected 0 to be greater than 0`. Pass 9 measured that same remainder at 20 and passing. The arithmetic that let CR-17's shape back in is gone."
    - "WR-51 — CLOSED, MEASURED BY THE SAME MUTATION PASS 9 USED. I replaced the body of `preAnchoringExemptionKeyForFixtureOnly` (`:9478-9488`) with `return \"CONSTANT\";` and ran the gate suite: `Tests 1 failed | 438 passed (439)`. Pass 9 ran that identical mutation at 434 of 434 GREEN. The counter-probe is now pinned to the live builder's LINE HALF over both array pairs, so the docblock's structural claim at `:9463-9469` is an assertion rather than a description."
    - "WR-54's `to` ENDPOINTS — CLOSED, MEASURED BY THE SAME MUTATION PASS 9 USED. I reverted `CLOSES_FROZEN_ARRAY` at `:9976` to its pre-fix form `/^\\]\\);$/`, re-introducing WR-48's exact 117-line over-walk, and the suite went RED: `Tests 1 failed | 438 passed (439)` at `:10126`, naming the gap — `expected 5910 to be 5793`, a 117-line difference. Pass 9 ran that identical revert at 434 of 434 GREEN. Note the FROM endpoints are NOT closed — see CR-23 in `gaps`."
    - "WR-52 — CLOSED. The own-header shape is now a SECOND array pair in the cross-construct fixture and the coverage sentence at `:10462-10470` states the measured 26/3 split rather than `the CROSS-CONSTRUCT case`. I confirmed the new pair is watched failing rather than merely present: reverting BOTH wave-39 scan bounds (`i = lineNumber`, `k <= lineNumber`) turns it RED with `an occurrence sitting ON its own construct header (an \\`it(\\` TITLE line) kept the SAME anchored key when its enclosing construct changed` (`Tests 2 failed | 437 passed`). Round 9 also carried across pass 9's refutation of the reviewer's stronger reading, in the bytes, at `:10472-10480` — a widening of a real fixture, correctly described as one."
    - "WINDOWS 41 — CLOSED, ALL THREE SITES, READ IN THE BYTES. `:803-811` — the sentence stating CORE-11's box state and naming wave 28 as the owner of the flip is DELETED and replaced by a MARKED, dated bracket that points at the two authoritative surfaces and asserts nothing. `:910-917` — the same, for the clause inside the wave-30 sentence; the ledger-reconciliation clause is left standing with the reason stated, and it names no box state. `:925-943` — the false `THE BOX'S STATE IS NOW STATED IN EXACTLY TWO PLACES` is gone and NO COUNT REPLACES IT: the paragraph now names the two authoritative surfaces and states, in its own bytes, that a count stated wider than the grep that produced it is the defect being corrected. Measured after the sweep: the only site in this file stating the box's state is `CORE11_BOX_EXPECTED` at `:10983` (`\"- [ ] **CORE-11**\"`), and `.planning/REQUIREMENTS.md:46` reads `- [ ] **CORE-11**`. Four sites down to two, one of them in this file."
    - "THE COUNTS WAVE 39 PUBLISHED — ALL CORRECT, RE-MEASURED WITH THE LIVE BUILDER IN-TREE RATHER THAN WITH A LIFTED COPY. I inserted a temporary case inside the gate's own `describe` (so it reads the shipped `constructAnchorFor`, `quantifierOccurrences`, `surfaceExemptionKeys` and `SURFACE_LINES`) and threw the measurement out through an assertion message: `{\"occurrences\":29,\"keys\":29,\"declared\":29,\"ownHeader\":0,\"notOwn\":29,\"sentinel\":0,\"maxDist\":234}`. 29/29/29 balanced, ZERO self-anchoring keys (pass 9 measured 3), ZERO sentinel-resolving occurrences, maximum occurrence-to-anchor distance 234. Every number limit (5) publishes about its own fix is true. Restored."
    - "NO REGRESSION, RE-ESTABLISHED INDEPENDENTLY AND NOT CARRIED FORWARD. `pnpm test` 31 files / 1379 tests exit 0 (before any mutation and again after every restore). `pnpm exec tsc --build` exit 0. `pnpm check:bundle` -> `packages/backend/dist/index.js: 1 import specifier(s): crypto`. Gate suite alone: 439 passed (439). `find packages/*/src -name '*.ts' ! -name '*.spec.ts' | wc -l` -> 23 shipped modules across both SOURCE_ROOTS, walked at ZERO violations inside the green suite. NO SHIPPED CODE CHANGED THIS ROUND — `git diff --name-only 9b3ff46..HEAD -- packages/ scripts/ | grep -v '\\.spec\\.ts$'` is EMPTY, and `git log --stat bc0f4c2..HEAD -- packages/` touches exactly ONE file, the gate spec."
  gaps_remaining:
    - "UAT gap 2 / truth 9 (CORE-11 outbound enforcement) — STILL OPEN, for the EIGHTH consecutive round. Criteria (1) DERIVED and (2) DRIFT-DETECTABLE remain discharged and I found no evidence against either. Criterion (3) THE SOLE BOUND is STILL unmet, and for the THIRD consecutive round it is the MECHANISM leg alone — the document leg closed in round 8 and did not re-open. Round 9 removed the two relocation SHAPES pass 9 prescribed and every one of its own published counts is true, but the relocation CLASS is not closed and the paragraph written to state the reach of the fix overstates it by a factor of five. I relocated a shipped occurrence 514 lines and then 1,129 lines, both at 439/439 green, byte-identical key, exemption reason false in both new homes. CORE-11's `[x]` is NOT earned and the box must stay `[ ]`."
  regressions:
    - "NO behavioural regression. Truths 1-8 re-checked this session; no shipped source byte changed since pass 9, and the full suite grew 1374 -> 1379 with zero failures."
    - "NO ledger regression. The box reads `[ ]` at `REQUIREMENTS.md:46`, the pin at `:10983` reads `[ ]`, and after WINDOWS 41 no other site in the gate file states the box's state at all. Round 9 did not flip it and plan 01-41 did not run `requirements mark-complete`."
    - "NO NEW FINDING OF MY OWN AGAINST ROUND 9's CORRECTIONS THAT THE REVIEWER DID NOT ALREADY FILE. Both of the reviewer's BLOCKERs reproduce on the real tree; nothing round 9 shipped as a pin failed to hold when I mutated what it pins, EXCEPT the two `.from` assertions, which the reviewer had already found (CR-23). That is a first for this phase: pass 9 found WR-54 by its own execution, pass 10 found nothing the reviewer had missed."
gaps:
  - truth: "No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)"
    status: partial
    reason: "I WAS ASKED TO ADJUDICATE CR-20 / CR-22 / CR-23 BY MUTATING THE REAL FILE RATHER THAN INHERIT THEM, AND THE REVIEWER USED AN OUT-OF-TREE HARNESS. I REPRODUCED ALL THREE AGAINST THE REAL TREE AND THE REAL SUITE, RESTORING BETWEEN EVERY RUN. ALL THREE HOLD. CR-20 IS NOT CLOSED. Round 9 built exactly what pass 9 prescribed and both changes are REAL — I verified each by watching it fail: reverting the two scan bounds turns two cases RED (`Tests 2 failed | 437 passed`), duplicating an in-use anchor's producer line turns the census RED (`1 anchor(s) IN USE are not produced by exactly one line`, `Tests 1 failed | 438 passed`), and the published counts are all true (29 occurrences, 29 keys, 29 entries, 0 self-anchoring, 0 sentinel, max distance 234). NONE OF THAT IDENTIFIES A SITE. The occurrence at `:436` — the wrapped ASCII-table cell whose entire normalized content is a declared phrasing, so its key is `SPELLING (operator, by POSITION) RESOLVED BY REPORTS §§ {q2} :: q2` and of which the file itself says at `:10281-10283` that `the construct half is what names it` — I moved TWICE. (1) 514 LINES, out of the table and into header section 3, landing under `the named non-vacuity assertion is the real protection against a walk that shrinks`: `Tests 439 passed (439)`. (2) 1,129 LINES, out of the table, ACROSS THE ENTIRE MACHINE-OWNED DERIVED-RESIDUAL SPAN (`/*` at `:952` … `*/` at `:1565`), to the top level beside the imports: `Tests 439 passed (439)`. In both new homes the entry's stated reason — `HEADER. A wrapped cell in the same ASCII table, labelling what the keyReceiver row already carries` — is false, the key is byte-identical (proved by the green stale-entry and count-equality checks, which fail on any key change), and neither the uniqueness census, the prefix case, the sentinel case nor the four range pins reports anything. THE CENSUS CANNOT REACH THIS AND THE REVIEWER IS RIGHT ABOUT WHY: it asserts the anchor has exactly ONE PRODUCER LINE, and `:417` is one line. CR-22 — CONFIRMED, AND I MEASURED THE RESIDUAL WITH THE LIVE BUILDER RATHER THAN ARGUING IT. Limit (5) at `:9090-9093` and the `constructAnchorFor` docblock at `:9343-9345` both close on `the maximum distance from an occurrence to its anchor is 234 LINES … so \\`the same construct\\` can span a couple of hundred lines and the interchangeability residual is that wide`. The 234 is RIGHT — I re-measured it at 234. The inference is WRONG. The residual is the ANCHOR'S SHADOW: every surface line resolving to the same anchor. I grouped all 8,846 surface lines by resolved anchor inside the gate's own describe block and got, largest first: `SPELLING (operator, by POSITION) RESOLVED BY REPORTS` — 574 surface lines, raw span 419..1574 (1,155 lines), holding FOUR shipped occurrences; the file's own title line — 283 surface lines, 2..284, FOUR occurrences; `it.each([` — 202 surface lines, 7012..8947; `WHY THIS EXISTS, AND WHAT IT IS NOT.` — 115; `THE LITERAL DESCENT OVER AN OPERATOR INITIALIZER…` — 98. The published figure understates the residual by a factor of FIVE, and my 1,129-line relocation stayed inside the widest shadow the whole way. This is the phase's signature defect — a stated reach exceeding an executed reach — at its TENTH recorded instance, and for the SECOND consecutive round it sits inside the paragraph written to state the reach of the fix for the NINTH. CR-23 — CONFIRMED, EXECUTED, AND THE ARITHMETIC MEASURED FROM INSIDE THE SUITE. `EXCLUSIONS` derives its two opening anchors at `:9983-9988` as `lineOf(l => l.startsWith(\"export const UNBOUNDED_QUANTIFIERS\"))` and `lineOf(l => l.startsWith(\"export const RESOLVER_REGISTRY\"))`; the WR-54 case at `:10080-10085` recomputes those two expressions CHARACTER FOR CHARACTER over the same `gateLines` through the same `lineOf`, then asserts `EXCLUSIONS[2].from`/`EXCLUSIONS[1].from` against them (`:10131-10134`, `:10150-10153`). They cannot fail. I planted ONE line — `export const RESOLVER_REGISTRY_DECOY: readonly number[] = Object.freeze([1]);` — 104 lines above the real registry, and the suite reported `Tests 439 passed (439)`, INCLUDING the assertion whose own message reads `Both endpoints are pinned because a width is two numbers, and pinning only the end leaves the other half free to move`. I then instrumented the surface non-vacuity assertion to print the number and measured the damage from inside the suite: SURFACE_LINES 8846 -> 8742. ONE HUNDRED AND FOUR pre-existing gate-file lines silently left the scanned surface (105 counting the decoy itself), the coarse band still passed, the `proof` token `id: \"constStrings\"` was still in range, and the `to` pin still passed. Any declared phrasing living in those 104 lines is now unguarded and nothing says so. My arithmetic differs from the reviewer's by one line (they report 8848 -> 8743 / 105) and the difference is immaterial. WHERE I ADD TO THE REVIEWER RATHER THAN INHERIT: I confirmed WR-55 EXHAUSTIVELY. `constructAnchorFor` reaches `return NO_PRECEDING_CONSTRUCT` only by running the backward scan off the top having accepted no line, and line 1 is a `//` comment with nothing above it, so recogniser (5) accepts it for every `lineNumber >= 2`. I evaluated the shipped builder at EVERY ONE of the file's 11,079 lines: the set of lines resolving to the sentinel is exactly `[1]`, count 1. So the occurrence-side sentinel case added this round is green BY CONSTRUCTION over 8,845 of the 8,846 surface lines, while `:9229-9232` and `:10295-10300` both state its reach as the whole scanned surface. That is the correct reading of pass 9's own `missing:` line — I wrote that it `is a real guard from the next sentence someone writes`, and measured, it is not: only a sentence on line 1 can ever trip it. The FIRST half of CR-21 is the load-bearing half and it is genuinely closed. SEVERITY, STATED THE SAME WAY IT HAS BEEN EVERY ROUND AND NOT INFLATED: NOTHING LEAKS, AND I RE-ESTABLISHED THAT RATHER THAN CARRYING IT FORWARD. `pnpm test` 31 files / 1379 tests exit 0; `tsc --build` exit 0; `pnpm check:bundle` reports the shipped bundle's entire import set as ONE specifier, `crypto`; the walk covers 23 shipped modules across both SOURCE_ROOTS at zero violations; no shipped source byte changed this round. I also re-executed the must-NOT itself through the shipped `auditSource`: `(ok && globalThis).fetch(url)` -> [\"outbound-fetch\"], `(globalThis ?? self).fetch(url)` -> [\"outbound-fetch\"], `(ok && navigator).sendBeacon(u,d)` -> [\"outbound-beacon\"], `fetch.call(null,url)` -> [\"outbound-fetch\"], `const f = fetch; f.call(null,url)` -> [\"outbound-fetch\"], `const m=\"send\"+\"Beacon\"; navigator[m](u,d)` -> [\"outbound-unanalysable\"], `sdk.requests.send(req)` -> [\"outbound-send\"], clean source -> []. `WebSocket.call(null,u)` -> [] and remains the disclosed named row `silence-outbound-ctor-receiver-position` at `:5696`, one of 26 `measured-silence` rows in a 61-row registry, with `silence-operator-around-global-receiver` still absent. Every finding here is a defect in a TEST-ONLY gate's enforcement of its own description. It is a blocker on the claim-versus-enforcement standard this phase set for itself and has now enforced ten times, and on nothing else."
    severity: major
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-20 NOT CLOSED / CR-22 — BLOCKER, REPRODUCED TWICE BY ME AT 439/439 GREEN AGAINST THE REAL FILE. `constructAnchorFor` (`:9373-9420`) resolves the nearest preceding line five recognisers accept, and in this file those recognisers are sparse. Measured with the live builder over all 8,846 surface lines: the anchor at `:417` shadows 574 surface lines (raw 419..1574, 1,155 lines) and already holds four shipped occurrences. I moved `:436` 514 lines into header section 3 and then 1,129 lines across the machine-owned span into the import region; byte-identical key and 439 of 439 green both times, with the entry's stated reason (`A wrapped cell in the same ASCII table`) false in both new homes. Limit (5) at `:9090-9093` and the docblock at `:9343-9345` publish the residual as 234 lines — five times too small. The uniqueness census cannot reach it: it asserts ONE PRODUCER LINE, and `:417` is one line."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-23 — BLOCKER, REPRODUCED AT 439/439 GREEN. The two `.from` assertions at `:10131-10134` and `:10150-10153` compare `EXCLUSIONS[n].from` against a locator expression recomputed character-for-character from the expression `EXCLUSIONS` was built from (`:9983-9988` vs `:10080-10085`). They hold for every possible file, including one where the locator matches nothing (`-1 === -1`) — the silent success this same test's own non-vacuity paragraph thirty lines above says it is organised against, and which it correctly guards for `REGISTRY_CLOSE` and each list entry. One planted decoy line 104 lines above the registry slid exclusion three's `from` and removed 104 gate-file lines from the scanned surface (SURFACE_LINES 8846 -> 8742, measured from inside the suite), at 439 of 439 green, including the assertion whose message claims `Both endpoints are pinned`. The closing claim at `:9963-9967` that `each locator proved to match exactly ONE line before it is used` is true of three of five locators."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-55 — WARNING, CONFIRMED EXHAUSTIVELY BY ME. The occurrence-side sentinel case at `:10306-10341` can only be non-empty for an occurrence on line 1 of the file. I evaluated the shipped `constructAnchorFor` at all 11,079 lines: exactly ONE line resolves to `NO_PRECEDING_CONSTRUCT`, line 1. So the case is green by construction over 8,845 of the 8,846 surface lines while `:9229-9232` and `:10295-10300` both state its reach as the whole scanned surface. This is a coverage overclaim on a case added this round, not a vacuity: the case is real for line 1 and the hand-written-key half of CR-21 is genuinely closed."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-58 — WARNING, CONFIRMED BY INSPECTION. `constructHalf` in the census case (`:10399-10400`) is `k.slice(0, k.indexOf(EXEMPTION_ANCHOR_SEP))` with no `-1` guard, so a key missing the separator silently yields the key minus its last character rather than failing. The prefix case at `:10348-10354` asserts the separator is present for every DECLARED key first, and `surfaceExemptionKeys` output carries it by construction, so the exposure is narrow today — but the census reads both sides and guards neither itself."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-60 — WARNING, CONFIRMED BY GREP. The same measured relocation is stated as `58 lines apart` at `:10383` and as `57 lines` at `:10795`, 412 lines apart in the same wave's work. One of the two is wrong and neither is derived."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-56, WR-57, WR-59, IN-41 … IN-44 — REPORTED BY THE REVIEWER, NOT INDEPENDENTLY RE-EXECUTED BY ME, AND RECORDED AS SUCH. They are warnings and info about disclosure precision (the prefix case reading only the declared map; the key split written three times; the recogniser list describing `DECLARATION` more widely than the regex matches; limit (5)'s heading; `CORE11_BOX_EXPECTED` pinning a 17-byte prefix while the header says `BY BYTES`; nine colliding `it.each([` producers that are not in use). None of them changes the verdict, and I did not spend execution budget on them while two blockers were open."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "`:981` — ROUND 9's OWN DISCLOSURE, WEIGHED AS ONE AND NOT AS SOMETHING I CAUGHT. Wave 41 ran its `wave 28` census case-INSENSITIVELY as well as case-sensitively, found `Wave 28 changed no rule, no fixture, no resolver and no registry row; its entire diff in this file is this comment.` at `:981` — invisible to every case-sensitive grep in the plan, in the review and in pass 9 — and left it standing DELIBERATELY with the reason in its own bytes, reporting it as a finding. I confirm the sentence is there, that it is present-tense about a wave thirteen waves in the past (the reviewer's IN-43), and that it states NO box state, which is the property WINDOWS 41 was sweeping for. Verify-block counts were left case-sensitive on purpose so they still cross-check the precondition-captured value. Also disclosed by round 9: `01-40-PLAN.md:174`/`:636` say `both return sites` where WR-53's extension left ONE — I confirm one `return NO_PRECEDING_CONSTRUCT` at `:9419` — and WR-49/WR-53 are handled as no-overclaim consequences and explicitly NOT claimed closed. A round that finds a defect its own grep could not see, reports it, and declines to launder the count is doing the thing this phase asks for."
    missing:
      - "CORE-11 STAYS `[ ]`. AN EIGHTH ROUND, AND NOT A FOURTH REVERT: the box is already `[ ]` at `4105fd0`, `CORE11_BOX_EXPECTED` at `:10983` already agrees, round 9 did not flip it, and plan 01-41 did not run `requirements mark-complete`. That is the correct handoff and I am making the determination: THE BOX MAY NOT MOVE. Criterion (3) is unmet on its MECHANISM leg. Two of the three criteria are discharged, the document leg of the third has been discharged for two rounds running, and what remains is one seam."
      - "CR-22 (which is CR-20's real residual, and it must be BOTH parts). (1) REPLACE THE SENTENCE WITH THE MEASURED QUANTITY at `:9090-9093` and `:9343-9345`. The interchangeability residual is the ANCHOR'S SHADOW, not the occurrence-to-anchor distance: measured with the live builder over all 8,846 surface lines, the widest shadow is `:417`'s at 574 surface lines / 1,155 raw (419..1574), already holding four shipped occurrences; then 283, 202, 115, 98. 234 is the largest distance any shipped sentence happens to sit from its anchor and it bounds nothing. (2) PIN THE SHADOW so the next widening is loud — group SURFACE_LINES by resolved anchor and assert the maximum against a pinned value, in the shape this file already uses for every other measured residual. DO NOT close this by folding line numbers into the key; the census case's own message forbids it and is right to."
      - "CR-23: MAKE THE TWO `.from` ASSERTIONS ASSERT. Pin each opening endpoint against a locator derived INDEPENDENTLY of the expression under test — a full-line literal, proved to match exactly one line first, exactly the treatment `REGISTRY_CLOSE` already gets at `:10092-10100` — and correct `:9963-9967`, which claims all five locators are proved unique when three are. Do not delete the assertions."
      - "WR-55: RESTATE THE SENTINEL CASE'S REACH TO WHAT IT EXECUTES. Measured over all 11,079 lines, exactly one line — line 1 — can resolve to the sentinel, so `bounds it over the occurrences quantifierOccurrences finds across SURFACE_LINES and over nothing wider` (`:9229-9232`, `:10295-10300`) overstates a case that is green by construction over 8,845 of 8,846 surface lines. Say that, in the bytes. The DECLARED-KEY half of CR-21 needs no change: I drove the exact CR-17 key through it and it fired."
      - "WR-58, WR-60: add the `indexOf === -1` guard to the census's `constructHalf`, and derive the one relocation distance rather than writing it twice at two different values."
      - "DO NOT RE-OPEN THE 2026-08-25 RE-SCOPE. Pass 8 tested it for a quietly-lowered bar and found none; pass 9 added that round 8 is evidence FOR it; I did not re-test it and I am not reporting it as a defect. The `[x]` is unearned because criterion (3)'s mechanism is bypassable, not because the bar is wrong. What I add is stated as a finding below: nothing in the re-scoped bar — DERIVED, DRIFT-DETECTABLE, SOLE BOUND — actually requires the anchor to identify a SITE. It requires the disclosure to be accurate and contradicted nowhere. That distinction is the cheapest route out of this seam and it belongs to the operator, not to me."
      - "THE MECHANISM JUDGEMENT, STATED BECAUSE IT WAS ASKED FOR AND BECAUSE THE OPERATOR WILL ACT ON IT. See `## The mechanism judgement` in the body. Short form: I do NOT believe the line-text approach can be made to identify a site, and the next round should change either the mechanism or the claim."
deferred: []
behavior_unverified_items: []
coincidental_reliance_items:
  - truth: "URL userinfo does not reach `observations.url`"
    reason: undeclared-precondition
    harden: "Carried forward from rounds 3-9 unchanged and still correct. The `://` precondition is DECLARED at `schema.spec.ts:115-123` rather than assumed, but the guarantee still rests on `consumer.ts` handing over an absolute `rr.request.getUrl()`. Advisory, no score effect."
  - truth: "The derived residual states the whole bound on CORE-11"
    reason: undeclared-precondition
    harden: "REOPENED ONE LEVEL FURTHER IN FOR THE FIFTH CONSECUTIVE ROUND, and the pattern is now more informative than any single instance. Round 5: nothing bound a `clause` to its branch — closed by wave 29. Round 6: the guards scanned only `RESOLVER_REGISTRY[].clause` while 3,464 hand-written lines stated bounds — closed by wave 33. Round 7: the whole-file guard reached those lines but its EXEMPTION MAP was unanchored — addressed by wave 36's `constructAnchorFor`. Round 8: the anchor was a masked LINE, not a site — 7 of 29 entries relocatable. Round 9: self-anchoring and ambiguous tokens are both GONE and measured gone (0 of 29, 0 of 29), and the residual moved to the ANCHOR'S SHADOW — 574 surface lines under one header, four shipped occurrences inside it, a 1,129-line relocation green. The layer is no longer getting thinner: 29 of 29 relocatable, then 7 of 29, and now 4 of 29 in one shadow plus 4 more in the next and 3 in the next. Hardening by narrowing the line-text shape has reached its floor; the shadow is a property of recogniser DENSITY over this file's prose, not of the key format, and no key format fixes it."
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
    evidence: "FAIL-CLOSED for the ninth consecutive round, and for the second round running THE LEDGER AND I AGREE — the row says `[ ]`, the pin says `[ ]`, and I find criterion (3) unmet. THE MUST-NOT ITSELF HOLDS AND I RE-ESTABLISHED IT INDEPENDENTLY: `pnpm test` 31 files / 1379 tests exit 0; `tsc --build` exit 0; `pnpm check:bundle` -> ONE specifier, `crypto`; the walk covers 23 shipped non-spec modules across both SOURCE_ROOTS at ZERO violations; `git diff --name-only 9b3ff46..HEAD -- packages/ scripts/` filtered of `.spec.ts` is EMPTY and `git log --stat bc0f4c2..HEAD -- packages/` touches one file. RE-EXECUTED THROUGH THE SHIPPED `auditSource` THIS SESSION: `(ok && globalThis).fetch(url)`, `(globalThis ?? self).fetch(url)`, `fetch.call(null,url)` and `const f = fetch; f.call(null,url)` all -> [\"outbound-fetch\"]; `(ok && navigator).sendBeacon(u,d)` -> [\"outbound-beacon\"]; `sdk.requests.send(req)` -> [\"outbound-send\"]; `const m=\"send\"+\"Beacon\"; navigator[m](u,d)` -> [\"outbound-unanalysable\"]; clean source -> []. STILL SILENT AND STILL PROPERLY DISCLOSED: `WebSocket.call(null,u)` -> `[]`, carried as the named row `silence-outbound-ctor-receiver-position` at `:5696`, one of 26 `measured-silence` rows in a 61-row registry, with the removed `silence-operator-around-global-receiver` still absent. WHY THIS IS STILL `unverified`: the re-scoped bar admits an `[x]` ONLY when the residual is DERIVED, DRIFT-DETECTABLE and THE SOLE BOUND. (1) and (2) hold. (3)'s DOCUMENT leg stays discharged. (3)'s MECHANISM leg is not: I relocated a shipped occurrence 514 lines and then 1,129 lines for a byte-identical key at 439/439 green, with its exemption reason false in both new homes; the residual the file publishes as 234 lines measures 574 surface lines; and one planted decoy line removed 104 lines from the scanned surface at 439/439 green through two assertions that cannot fail. A `verification: gate` prohibition whose own acceptance criterion is unmet is not verified, and the box correctly reads `[ ]`."
  - requirement_id: STORE-03
    statement: "MUST NOT persist a query-string VALUE from a target-controlled URL into observations.url. Parameter names, path, scheme and host are retained; every value is replaced before the row is written."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "HOLDS. Carried forward from rounds 6-9. `packages/backend/src/store/observations.ts` has been byte-identical in its non-comment lines since wave 26 and no shipped source changed this round, so round 6's 3,612-input sweep (four parameter-name lengths x 301 offsets x three grammars, zero occurrences of the secret in 7,224 outputs, zero outputs over `URL_MAX`), round 5's 16,160-input sweep and wave 35's 19,772-input re-measurement all apply unchanged. Regression-checked this round inside the green 1,379-test suite. WR-39 remains a DISCLOSURE defect about which offsets are unstable, not a failure of the prohibition."
  - requirement_id: STORE-07
    statement: "MUST NOT render a caught exception into a persisted or logged string without passing it through describeError first."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "Carried forward from rounds 4-9, where the gate's own `auditSource` was executed in both directions: `flag ? e.message : \"none\"`, `e.message ?? \"none\"`, `e.message || \"none\"` and `flag && e.message` all report `unredacted-concat`, and every `describeError` twin stays quiet. No shipped source changed this round. Regression-checked inside the green 1,379-test suite."
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
    evidence: "Carried forward from rounds 3-9 substantially unchanged; nothing changed this round. The column-shape half is gated (PRAGMA-read allowlist + forbidden-name check). The 'capable of holding a secret' half is honestly bounded rather than contradicted: `observations.url` can still hold a path-embedded token and a retained parameter NAME, both named in the OPEN list, both pinned, the second kept BY POLICY under the operator's 2026-08-21 UAT decision. Judgment-tier: NON-AUTHORITATIVE, human review recommended."
---

# Phase 1: Skeleton, Persistence & Compatibility — Verification Report

**Phase Goal:** A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Verified:** 2026-08-26T17:50:00Z
**Status:** gaps_found
**Re-verification:** Yes — verification pass 10, after gap-closure ROUND 9 (waves 39, 40, 41), commits `bc0f4c2..HEAD`

---

## THE VERDICT, FIRST

**CORE-11's box may NOT move. It reads `[ ]`, and it stays `[ ]`.**

Eighth consecutive round at **8/9**, and the same truth every time. Round 9 built exactly
what pass 9 asked for, every published number it states about its own work is true, and
**four of pass 9's six items are genuinely closed against my own mutations**. The fifth —
CR-20 — closed both *shapes* it was written about and did not close the *class*. The sixth,
WR-54, closed one of its two endpoints.

**Criterion (3) THE SOLE BOUND is unmet on its MECHANISM leg, for the third consecutive round.**

| Criterion 3 leg | Pass 8 | Pass 9 | Pass 10 |
| --- | --- | --- | --- |
| Document surfaces | ✗ both failed | ✓ both CLOSED | ✓ still closed, and WINDOWS 41 swept the last three sites |
| The exemption-anchoring mechanism | ✗ 29 of 29 relocatable | ✗ 7 of 29 relocatable | ✗ **0 of 29 self-anchoring, 0 ambiguous — and a 1,129-line relocation still green** |

The hole is not the same hole and it is not smaller in the way the last two rounds were
smaller. It moved from the *key format* to the *file's recogniser density*, and that is a
different kind of thing. See **The mechanism judgement** below, which the brief asked for
explicitly.

---

## Everything below is a command I ran this session, on the real tree

**Baseline, established BEFORE any mutation and re-established AFTER every restore:**

```
$ pnpm test                → Test Files 31 passed (31) · Tests 1379 passed (1379) · exit 0
$ pnpm exec tsc --build    → exit 0
$ pnpm check:bundle        → packages/backend/dist/index.js: 1 import specifier(s): crypto
$ pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts
                           → Test Files 1 passed (1) · Tests 439 passed (439)
$ find packages/*/src -name '*.ts' ! -name '*.spec.ts' | wc -l        → 23
$ git diff --name-only 9b3ff46..HEAD -- packages/ scripts/ | grep -v '\.spec\.ts$'   → EMPTY
```

`git log --stat bc0f4c2..HEAD -- packages/` touches exactly one file: the gate spec,
seven commits, no shipped source byte.

---

## The reviewer's two BLOCKERs — reproduced, both of them

The reviewer used an out-of-tree harness that lifted the round-9 helpers. I was asked to
reproduce or refute against the real tree, so **every result below is a mutation planted in
`packages/backend/src/outbound-prohibition.spec.ts` and the real gate suite run over it,
restored between every run.**

### CR-20 is NOT CLOSED / CR-22 — CONFIRMED. Two relocations, both green.

The occurrence at `:436` is the wrapped ASCII-table cell

```
//                                                                       any depth
```

whose entire normalized content is a declared phrasing, so its line half masks away and its
key is `SPELLING (operator, by POSITION) RESOLVED BY REPORTS §§ {q2} :: q2` — the one key of
which the file itself says, at `:10281-10283`, *"the construct half is what names it."* Its
exemption reason at `:9117-9118` reads *"HEADER. A wrapped cell in the same ASCII table,
labelling what the keyReceiver row already carries."*

| relocation | distance | result |
| --- | --- | --- |
| out of the table, into header section 3, under *"the named non-vacuity assertion is the real protection against a walk that shrinks"* | **514 lines** | `Tests 439 passed (439)` |
| out of the table, **across the entire machine-owned derived-residual span** (`/*` at `:952` … `*/` at `:1565`), to the top level beside the imports | **1,129 lines** | `Tests 439 passed (439)` |

The key is byte-identical in both — proved by the green run itself, since the stale-entry
check and the one-entry-per-occurrence equality both fail on any key change. The stated
reason is false in both new homes. Nothing reported.

**The cause, measured with the LIVE builder rather than argued.** I inserted a temporary case
inside the gate's own `describe` — so it reads the shipped `constructAnchorFor` and the
shipped `SURFACE_LINES` — grouped all 8,846 surface lines by resolved anchor, and threw the
result out through an assertion message:

```
anchor token                                            surface lines   raw span      shipped occurrences
SPELLING (operator, by POSITION) RESOLVED BY REPORTS          574         419..1574            4
packages/backend/src/outbound-prohibition.spec.ts — …         283           2..284             4
it.each([                                                     202        7012..8947            —
WHY THIS EXISTS, AND WHAT IT IS NOT.                          115        8986..9100            —
THE LITERAL DESCENT OVER AN OPERATOR INITIALIZER — …           98        2540..2637            —
```

Limit (5) at `:9090-9093` and the `constructAnchorFor` docblock at `:9343-9345` both close on:

> *"RE-MEASURED AT WAVE 39 AFTER BOTH CHANGES, the maximum distance from an occurrence to its
> anchor is 234 LINES … so `the same construct` can span a couple of hundred lines and **the
> interchangeability residual is that wide**."*

**The 234 is right — I re-measured it at 234.** The inference is wrong, and the reviewer's
diagnosis of why is exactly right: occurrence-to-anchor distance is a fact about where 29
sentences happen to sit; the residual is the width of the anchor's **shadow**. Measured, the
residual is **574 surface lines / 1,155 raw**, five times the published figure, and my
1,129-line relocation never left it.

**Why round 9's mechanism cannot reach this.** Both of its changes are real, and I proved each
by watching it fail:

```
$ # revert BOTH wave-39 scan bounds (i = lineNumber, k <= lineNumber)
  → Tests 2 failed | 437 passed (439)
    "an occurrence sitting ON its own construct header (an `it(` TITLE line) kept the SAME
     anchored key when its enclosing construct changed"

$ # duplicate line 417's header text 533 lines below it
  → Tests 1 failed | 438 passed (439)
    "1 anchor(s) IN USE are not produced by exactly one line of …"
```

Both fire. Neither is relevant: the census asserts the anchor has **one producer LINE**, and
`:417` *is* one line. Self-anchoring and token ambiguity were the two ways an anchor could
name *nothing*; the shadow is the way an anchor names *too much*, and no key format fixes it.

**This is the phase's signature defect at its tenth recorded instance, and for the second
consecutive round it sits inside the paragraph written to state the reach of the fix for the
ninth.**

### CR-23 — CONFIRMED. One planted line, 104 lines off the surface, green.

`EXCLUSIONS` derives its opening anchors at `:9983-9988`; the WR-54 case recomputes **the same
two expressions, character for character, over the same `gateLines`, through the same
`lineOf`** at `:10080-10085`, then asserts `EXCLUSIONS[n].from` against them at `:10131-10134`
and `:10150-10153`. Tautologies — true of every possible file, including one where the locator
matches nothing and `-1 === -1`.

```
$ # plant  export const RESOLVER_REGISTRY_DECOY: readonly number[] = Object.freeze([1]);
$ #        104 lines above the real registry (4057 vs 4161)
  → Tests 439 passed (439)
```

including the assertion whose own message reads *"Both endpoints are pinned because a width is
two numbers, and pinning only the end leaves the other half free to move."*

I then measured the damage **from inside the suite**, by instrumenting the surface non-vacuity
assertion so it printed its own number:

```
without decoy:  expected 8846 to be -1
with decoy:     expected 8742 to be -1
```

**104 pre-existing gate-file lines silently left the scanned surface** (105 counting the decoy
line itself). The coarse band still passed, the `proof` token was still in range, the `to` pin
still passed. My arithmetic differs from the reviewer's by one line — they report 8848 → 8743
— and the difference is immaterial to the finding. Any declared phrasing living in those 104
lines is now unguarded and nothing says so.

`:9963-9967` claims *"each locator proved to match exactly ONE line before it is used."*
Three of the five are.

---

## Pass 9's six items — closed or not, each by execution

### 1. CR-20 — **NOT CLOSED.** Both prescribed changes shipped and both are real; the finding is not closed.

Delivered and verified real: strict-above backward scan (`:9388`), forward walk bounded
strictly above (`:9408`), the uniqueness census, the prefix case, and **both** of pass 9's
relocations landed as permanent fixtures that I watched go RED. Published counts, re-measured
by me with the live builder: `{"occurrences":29,"keys":29,"declared":29,"ownHeader":0,
"notOwn":29,"sentinel":0,"maxDist":234}` — 3 → 0 self-anchoring, every number true.
**And the residual moved rather than closed. See CR-22 above.**

### 2. CR-21 — **CLOSED.**

The sentinel is stripped **by reference** at `:9256` (`.split(NO_PRECEDING_CONSTRUCT).join("")`),
never by re-spelling, so renaming the constant cannot silently un-fix it. I planted the exact
key pass 9 drove through at 434/434 green:

```
$ # add  "!NO-PRECEDING-CONSTRUCT! §§ {q2} :: q2"  to HEADER_QUANTIFIER_EXEMPTIONS
  → Tests 3 failed | 436 passed (439)
    "exemption key "!NO-PRECEDING-CONSTRUCT! §§ {q2} :: q2" carries an ANCHOR that reduces to
     NOTHING once its {qN} tokens, whitespace and punctuation are removed … expected 0 to be
     greater than 0"
```

Pass 9 measured that remainder at 20 and the case passing. It now scores 0 and the case fires.
**Caveat, and it is mine rather than the reviewer's to sharpen: the *other* half — the
occurrence-side sentinel case — is nearly vacuous.** See WR-55 below.

### 3. WR-51 — **CLOSED.**

```
$ # preAnchoringExemptionKeyForFixtureOnly → return "CONSTANT";
  → Tests 1 failed | 438 passed (439)
```

Pass 9 ran that identical mutation at **434 of 434 green**. The counter-probe is now pinned to
the live builder's line half over both array pairs.

### 4. WR-54 + WR-50 — **CLOSED for the `to` endpoints, NOT for the `from` endpoints.**

```
$ # CLOSES_FROZEN_ARRAY → /^\]\);$/   (re-introducing WR-48's 117-line over-walk)
  → Tests 1 failed | 438 passed (439)   ·   expected 5910 to be 5793
```

Pass 9 ran that identical revert at **434 of 434 green**. The closing sentence was also
replaced against three measured refutations, which I read at `:9950-9975` and which is honest
about what the `proof` token, the band and the clause-count equality each cannot do. **The
`from` half is CR-23 and it is a blocker.**

### 5. WR-52 — **CLOSED.**

Own-header shape added as a second array pair; coverage restated at `:10462-10470` to the
measured 26/3 split; pass 9's refutation of the reviewer's stronger reading carried into the
bytes at `:10472-10480`. The new pair is watched failing — it is one of the two cases that go
RED when I revert the scan bounds.

### 6. WINDOWS 41 — **CLOSED, all three sites.**

`:803-811` and `:910-917` are now marked, dated history brackets that point at the two
authoritative surfaces and assert nothing. `:925-943` replaces the false *"EXACTLY TWO
PLACES"* with a form that states **no count at all** and names what the file cannot see
instead of silently counting it. Measured after the sweep: the only site in this file stating
the box's state is `CORE11_BOX_EXPECTED` at `:10983` (`"- [ ] **CORE-11**"`), and
`.planning/REQUIREMENTS.md:46` reads `- [ ] **CORE-11**`. Four sites → two, one of them here.

---

## Round 9's own disclosures — weighed as disclosures

**Wave 41 ran its `wave 28` census case-INSENSITIVELY as well**, found `:981` —
*"**W**ave 28 changed no rule, no fixture, no resolver and no registry row…"* — invisible to
every case-sensitive grep in the plan, in the review and in pass 9, left it standing
deliberately with the reason in its own bytes, and reported it as a finding. I confirm the
sentence is there, that it is present-tense about a wave thirteen waves past, and that **it
states no box state**, which is the property the sweep was for. Verify-block counts were left
case-sensitive on purpose so they still cross-check the precondition-captured value. That is a
round finding a defect its own grep could not see and declining to launder the count.

Also disclosed and confirmed: `01-40-PLAN.md:174`/`:636` say *"both return sites"* where
WR-53's extension left **one** — `grep -n NO_PRECEDING_CONSTRUCT` gives a single
`return NO_PRECEDING_CONSTRUCT` at `:9419` — and WR-49/WR-53 are handled as no-overclaim
consequences, explicitly **not** claimed closed.

**Both land in round 9's favour.** For the first time in this phase, the verifier found
nothing the reviewer had missed.

---

## The mechanism judgement

**Asked for explicitly, stated as a finding, not as an instruction.**

CR-17 → CR-20 → CR-22 has moved one layer down three times: anchored to **nothing** (round 7),
to **non-unique masked text** (round 8), to a **unique line whose shadow is unbounded**
(round 9). It is tempting to read that as convergence. Measured, it is not:

- Round 8 → 9 removed two *shapes* and the relocatable set went 29 → 7 → **0 of the two named
  shapes**. But the interchangeability class did not go to zero; it went to the shadow, and the
  shadow holds **4 shipped occurrences in one class, 4 in the next, 3 in the next**.
- The shadow is not a property of the key format. It is a property of **recogniser density over
  this file's prose**. `:417` shadows 1,155 raw lines because between the rule at `:418` and
  the imports at `:1567` — a 1,148-line stretch that is mostly one machine-owned block comment
  — **no line at all is accepted by any of the five recognisers**. No amount of key
  engineering changes that number; only changing what counts as a construct does.
- The one key-format change that *would* make every key unique is folding the line number in,
  and the file's own census message forbids it at `:10434` — *"the tempting one and the
  worst"* — for the right reason: it would make the case green having measured nothing.

**So: I do not believe the line-text approach can be made to identify a site.** It can be made
to identify *a region*, and the size of that region is set by the file's comment layout rather
than by the gate. Making the regions small would mean re-authoring 11,000 lines of prose to
suit the anchor, which inverts the dependency and is a worse outcome than the defect.

**Two honest exits, and the choice is the operator's:**

1. **Change the mechanism to a containment rather than a proximity.** This file already imports
   the TypeScript compiler — `import ts from "typescript"` at `:1570`, used by `auditSource` —
   so an enclosing-node identity (the nearest enclosing `describe`/`it`/declaration/comment
   *range*, by position, from the AST the file already builds) is available at **zero new
   dependency cost**. That gives containment, which is the word limit (5) currently disclaims
   having. It is real work, and the operator already rejected an AST/frame-derived rebuild
   before round 9 in favour of pass 9's two small changes. I record that the rejection was made
   when the remaining gap looked like two small changes, and that this estimate has now been
   falsified **twice** — pass 9's estimate produced round 9, and round 9's own closing
   paragraph produced CR-22.
2. **Stop claiming a site, and re-scope criterion (3)'s mechanism leg to what the re-scope
   actually demands.** Nothing in DERIVED / DRIFT-DETECTABLE / SOLE BOUND requires the anchor
   to identify a site. SOLE BOUND requires the disclosure to be **accurate and contradicted
   nowhere**. Under that reading, CR-22's fix *is* the close: replace the 234 sentence with the
   measured shadow, **pin the shadow width** so the next widening is loud, fix CR-23's two
   `.from` assertions, and restate WR-55's reach. That is four bounded edits in one file, all
   green on arrival, and it converts an overclaim into a named, measured, drift-detectable
   residual — which is exactly the artifact kind waves 27-29 established for everything else in
   this gate.

**My reading, offered and not acted on:** exit 2 is what the re-scoped bar asks for and exit 1
is what the file's prose currently promises. Three rounds of narrowing have produced, each
time, a new instance of the signature defect *inside the paragraph stating the reach of the
previous fix*. That pattern is now better evidence about the mechanism than about the
discipline, and continuing to narrow line-text shapes for a fourth round is the option I would
expect to reproduce it a fourth time.

**I have not moved CORE-11's checkbox and I am not instructing anyone to. It is `[ ]`.**

---

## Goal Achievement — the seven ROADMAP success criteria

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `onInterceptResponse` non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `hooks/passive.ts:117` — *"The registered `onInterceptResponse` callback. NOT async — it returns `undefined`, never a Promise"*; wired at `index.ts:322` `sdk.events.onInterceptResponse(...)`, registered last per `index.ts:31`. Green in 1379 tests. |
| 2 | Work queue bounded, overflow count visible, never unbounded | ✓ VERIFIED | `hooks/passive.ts:40` — *"BOUNDED. The queue drops the oldest entry at cap"*; `telemetry.ts:100` — *"Entries the queue dropped because it was at cap (CORE-03 visible overflow)"*. |
| 3 | 200-chunk SPA leaves plugin UI and RPC responsive; max synchronous slice recorded, under the Phase 0 threshold | ✓ VERIFIED | Live measurement committed at `results/spa-load.json` (6,185 bytes), taken from **outside** the process by an external REST prober (decision P5-D3), against `caido-cli 0.57.1` with a pinned sha256. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `store/analyses.ts:3` — *"One row per (project_id, sha256, detector_set_hash)"*; the claim SQL is `INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, started_at) … ON CONFLICT (project_id, sha256, detector_set_hash) DO NOTHING`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; non-UTF-8 fixture round-trips | ✓ VERIFIED | `ingest/consumer.ts:189` `const raw = body.toRaw();`. |
| 6 | CI gate fails the build if the backend bundle imports a specifier outside the Phase 0 allowlist | ✓ VERIFIED | `package.json` wires `check:bundle`. **Executed this session:** `packages/backend/dist/index.js: 1 import specifier(s): crypto`. |
| 7 | Below-minimum Caido produces a clear message, not an obscure failure | ✓ VERIFIED | `compat.ts:43` `export const MIN_CAIDO = "0.57.1";`, user-facing messages at `:332` and `:352`. |
| 8 | Redaction: no query-string value from a target-controlled URL reaches `observations.url` | ✓ VERIFIED | STORE-03. `observations.ts` non-comment-byte-identical since wave 26 and untouched this round; sweep evidence from rounds 5-7 applies unchanged. |
| 9 | **No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)** | **✗ FAILED (partial)** | **The one that does not hold.** The must-NOT holds and I re-executed it through `auditSource`. Criterion (3)'s **mechanism** does not — a 514-line and a 1,129-line relocation, and a 104-line surface amputation, all at 439/439 green. |

**Score: 8/9 truths verified.** Eighth consecutive round at 8/9, the same truth each time.

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `packages/backend/src/hooks/passive.ts` | Non-async hook, cheap gates, bounded enqueue | ✓ VERIFIED | Wired from `index.ts:322`; cap consulted. Untouched this round. |
| `packages/backend/src/ingest/consumer.ts` | `toRaw()` byte path | ✓ VERIFIED | Wired; feeds the digest. Untouched. |
| `packages/backend/src/store/analyses.ts` | `project_id`-keyed persistence, hash-once | ✓ VERIFIED | Wired; the composite key is the conflict target. Untouched. |
| `packages/backend/src/store/observations.ts` | URL redaction before write | ✓ VERIFIED | Wired; non-comment bytes unchanged since wave 26. |
| `packages/backend/src/compat.ts` | Minimum-version gate with a clear message | ✓ VERIFIED | Wired. Untouched. |
| `scripts/ci/check-bundle-imports.mjs` | Allowlist gate | ✓ VERIFIED | Executed: 1 specifier, `crypto`. |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 enforcement + derived, drift-detectable, singular disclosure | ⚠️ **PARTIAL** | Enforcement runs green over 23 real modules, 0 violations, and every must-NOT probe reports. Criteria (1) and (2) hold. **Criterion (3)'s mechanism: the anchor names a region of up to 574 surface lines, the file publishes that region as 234, and exclusion three's opening endpoint is pinned by two tautologies.** |
| `.planning/REQUIREMENTS.md:46` | The ledger row for CORE-11 | ✓ VERIFIED | `- [ ] **CORE-11**`. Row states no box state of its own (round 8's repair, re-checked). |
| `.planning/STATE.md` `### Blockers` | Live blockers | ✓ VERIFIED | Round 8's correction stands; the six operator-around-global shapes all report, re-executed this session. |

### Behavioural Spot-Checks — every row is a command I ran this session

| Behaviour | Command | Result | Status |
| --- | --- | --- | --- |
| Full suite green | `pnpm test` | 31 files / **1379 tests** exit 0 | ✓ PASS |
| Types sound | `pnpm exec tsc --build` | exit 0 | ✓ PASS |
| Bundle allowlist | `pnpm check:bundle` | `1 import specifier(s): crypto` | ✓ PASS |
| Gate suite alone | `pnpm exec vitest run …/outbound-prohibition.spec.ts` | **439 passed (439)** | ✓ PASS |
| Shipped modules walked | `find packages/*/src -name '*.ts' ! -name '*.spec.ts'` | **23** across both roots | ✓ PASS |
| No shipped code changed | `git log --stat bc0f4c2..HEAD -- packages/` | one file, the gate spec | ✓ PASS |
| CORE-11 must-NOT, 9 probes through shipped `auditSource` | in-tree spec importing `auditSource` | 8 report as expected, clean source `[]` | ✓ PASS |
| Disclosed residual still silent | `WebSocket.call(null,u)` | `[]` — named row `:5696` + probe + counter-probe | ✓ PASS (disclosed) |
| Registry census | `grep -c 'kind: "measured-silence"'` / `grep -c '^    id: "'` | **26 of 61**; removed row absent | ✓ PASS |
| **CR-20/CR-22** `:436` relocated **514 lines** into header section 3 | gate suite | **439 passed (439)** | ✗ **FAIL — should have gone red** |
| **CR-20/CR-22** `:436` relocated **1,129 lines** across the machine-owned span | gate suite | **439 passed (439)** | ✗ **FAIL — should have gone red** |
| **CR-22** anchor shadow, live builder over 8,846 surface lines | temporary in-tree case | widest **574 surface / 1,155 raw**, 4 occurrences | ✗ **FAIL — published as 234** |
| **CR-23** decoy `RESOLVER_REGISTRY_DECOY` 104 lines above the registry | gate suite | **439 passed (439)** | ✗ **FAIL — both `.from` pins are tautologies** |
| **CR-23** surface amputation, measured from inside the suite | instrumented non-vacuity assertion | **8846 → 8742** | ✗ **FAIL — 104 lines lost silently** |
| **WR-55** lines resolving to the sentinel | shipped builder at all 11,079 lines | **exactly `[1]`** | ✗ **FAIL — reach overstated** |
| CR-21 closure | hand-written `"!NO-PRECEDING-CONSTRUCT! §§ {q2} :: q2"` in the map | **3 failed \| 436 passed** | ✓ PASS — **CLOSED** (was green at 434/434) |
| WR-51 closure | `preAnchoringExemptionKeyForFixtureOnly → () => "CONSTANT"` | **1 failed \| 438 passed** | ✓ PASS — **CLOSED** (was green at 434/434) |
| WR-54 `to` closure | `CLOSES_FROZEN_ARRAY → /^\]\);$/` | **1 failed \| 438 passed**, `expected 5910 to be 5793` | ✓ PASS — **CLOSED** (was green at 434/434) |
| CR-20 scan bounds are real | revert `i = lineNumber` and `k <= lineNumber` | **2 failed \| 437 passed** | ✓ PASS — both changes watched failing |
| Census is real | duplicate `:417`'s header text 533 lines below | **1 failed \| 438 passed** | ✓ PASS |
| Published counts | live-builder probe inside the gate's `describe` | 29/29/29, ownHeader **0**, sentinel **0**, maxDist **234** | ✓ PASS — every wave-39 number true |
| WINDOWS 41 sweep | read `:803-811`, `:910-917`, `:925-943`, `:10983`, `REQUIREMENTS.md:46` | 4 box-state sites → 2, one in this file | ✓ PASS |

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

**22 of 23 boxes read `[x]`, and CORE-11's correctly reads `[ ]`.** The ledger, the pin and
this report agree, for the second consecutive pass.

The `01-PROBE.md` no-silent-drop equality — 38 applicable items == 27 authored into
`must_haves` + 11 surfaced as flagged assumptions — is stated in the file's own opening and
its 11 unclassified rows were confirmed still-acceptable at UAT test 4. Unchanged this round.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `outbound-prohibition.spec.ts` | 9090-9093, 9343-9345 | Residual published as the occurrence-to-anchor distance (234) when it is the anchor's shadow (574 surface / 1,155 raw) | 🛑 Blocker | CR-22, executed twice — 514- and 1,129-line relocations green |
| `outbound-prohibition.spec.ts` | 10131-10134, 10150-10153 | `.from` assertions compare an expression against itself | 🛑 Blocker | CR-23, executed — 104 lines off the scanned surface at 439/439 green |
| `outbound-prohibition.spec.ts` | 9963-9967 | Claims all five locators proved unique; three are | ⚠️ Warning | The other half of CR-23 |
| `outbound-prohibition.spec.ts` | 9229-9232, 10295-10300 | Sentinel case states its reach as the whole scanned surface | ⚠️ Warning | WR-55, measured — exactly 1 of 11,079 lines can trip it |
| `outbound-prohibition.spec.ts` | 10399-10400 | Census `constructHalf` has no `indexOf === -1` guard | ⚠️ Warning | WR-58 |
| `outbound-prohibition.spec.ts` | 10383 vs 10795 | The same relocation stated as `58 lines apart` and `57 lines` | ⚠️ Warning | WR-60 |
| `outbound-prohibition.spec.ts` | 981 | Present-tense clause about wave 28, left standing deliberately | ℹ️ Info | Round 9's own disclosure; states no box state |
| `outbound-prohibition.spec.ts` | various | WR-56, WR-57, WR-59, IN-41 … IN-44 | ⚠️ Warning / ℹ️ Info | Reviewer-reported; **not** independently re-executed by me, and recorded as such |

**No debt markers** — `grep -rn -E "\bTBD\b|\bFIXME\b|\bXXX\b"` over `packages/*/src` and
`scripts/` returns nothing, as do `TODO`/`HACK`/`PLACEHOLDER` and `.skip(`/`.only(`/`.todo(`.

### Working tree

`git diff --exit-code -- packages/ scripts/ tests/` returns **0**. Nine mutations were planted
and all nine restored; the temporary probe spec was deleted. `.planning/config.json` carries
the pre-existing uncommitted harness setting noted in the brief — not mine, not touched.
`01-REVIEW.md` carries the reviewer's just-filed round-9 section, also not mine.

---

## On severity — a defect in the enforcement of a claim, not a live vulnerability

**Nothing leaks, and I re-established that this session rather than carrying it forward.**
31 files / 1379 tests exit 0 with the gate walking 23 shipped modules across both
`SOURCE_ROOTS` at zero violations; `tsc --build` exit 0; the shipped bundle's entire import set
is one specifier, `crypto`; every outbound shape I probed through the shipped `auditSource`
reports; and **no shipped source byte changed this round** — the entire round-9 delta is one
test file, seven commits.

Every finding in this report is a defect in a **test-only gate's enforcement of its own
description**. CR-22 and CR-23 are blockers because they falsify the central claim of the work
under review and, in CR-23's case, silently shrink the surface that work is measured over —
not because anything reaches a network.

## Human Verification Required

None newly raised. The judgment-tier prohibitions (CORE-10, STORE-01) remain flagged
`unverified` with NON-AUTHORITATIVE LLM-judge verdicts, carried forward and previously
accepted by the operator at UAT test 3; nothing about them changed this round.

The one thing that **does** want an operator decision is not a verification item — it is the
mechanism choice recorded above. I have stated it and taken no action on it.

## Gaps Summary

One gap, the same truth for the eighth consecutive round.

**Round 9 was a good round, and the evidence says so under adversarial pressure.** It shipped
every change pass 9 prescribed. Every number it published about its own work is true and I
re-measured all of them with the live builder. Four of the six items are closed and I proved
each by running the exact mutation that was green last round and watching it go red this
round. It found a defect its own case-sensitive grep could not see, reported it rather than
absorbing it, and declined to launder a count. For the first time in this phase, the verifier
found nothing the reviewer had missed.

**What did not close is the mechanism, and it did not close because it cannot close this way.**
`constructAnchorFor` no longer anchors to nothing and no longer anchors to an ambiguous token —
both measured at zero. It anchors to a unique line whose **shadow** spans up to 574 surface
lines, and four shipped occurrences already live inside the widest one. I moved a shipped
sentence 1,129 lines across the entire machine-owned span for a byte-identical key at 439 of
439 green, with its exemption's stated reason false where it landed. The file publishes that
residual as 234 lines. And exclusion three's opening endpoint, newly "pinned" this round, is
pinned by an expression compared against itself: one decoy line took 104 lines off the scanned
surface, green.

**The fix for the disclosure is four bounded edits and all four are green on arrival.** The fix
for the *claim* is a decision about mechanism that belongs to the operator, and I have stated
my reading of it rather than acting on it.

**CORE-11's box stays `[ ]`.** Not a fourth revert — it is already `[ ]`, the pin agrees, the
ledger row agrees, and round 9 correctly declined to move it. The determination is:
**criterion (3)'s mechanism leg is unmet, so the box may not move.**

---

_Verified: 2026-08-26T17:50:00Z_
_Verifier: Claude (gsd-verifier), verification pass 10_
