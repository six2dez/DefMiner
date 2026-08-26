---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-26T09:45:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  previous_verified: 2026-08-24T21:20:00Z
  round: 7
  verification_pass: 8
  gaps_closed:
    - "CR-15 — CLOSED, AND I RE-EXECUTED BOTH HALVES RATHER THAN READING THE SUMMARY. `fetch.call(null, url)` -> [\"outbound-fetch\"], and the alias case that proved it was a resolver gap and not an AST gap — `const f = fetch; f.call(null, url)` — also -> [\"outbound-fetch\"]. Round 6 measured both as `[]`. The receiver-position arm is real."
    - "CR-16 — CLOSED, EXECUTED BY ME. `const m = \"send\" + \"Beacon\"; navigator[m](u, d)` -> [\"outbound-unanalysable\"]. Round 6 measured `[]`. The `could not read does not mean clean` rule now reaches the one receiver family it was missing, and the fix was one `||` admitting `navigator` to the unreadable-member arm."
    - "CR-14 + WR-43 + WR-38 — CLOSED BY DELETION, WHICH IS THE DISPOSITION ROUND 6 RECOMMENDED AND THE CHEAPER OF THE TWO. Wave 33 removed every bound from the ~3,465-line hand-written header rather than widening a scan onto 20 new obligations. I confirmed the header no longer states a bound of its own: the CORE-11 completion paragraph and the residual-prose block round 6 quoted at `:744-790` and `:908-916` are gone, and `CORE11_BOX_EXPECTED` is the file's assertion of the box's state."
    - "THE WHOLE-FILE PHRASING GUARD EXISTS AND ITS THREE EXCLUSIONS ARE NON-VACUOUS, VERIFIED BY MY OWN MUTATION. I planted a declared phrasing (`any depth`) into the BRANCH_VOCABULARY docblock at `:5800` — inside exclusion three's line range — and the suite went RED, 1 failed of 432. The `inRange == inClauses` equality is a live pin, not decoration."
    - "WebSocket.call(null, u) — FOUND BY WAVE 34 RE-MEASURING AFTER ITS OWN WIDENING, AND DISCLOSED BEFORE I ARRIVED. I executed it: `[]`. It carries a named row `silence-outbound-ctor-receiver-position` in the derived span with an executed probe and an executed counter-probe (`globalThis.WebSocket.call(null, u)`). Finding a new silence by re-measuring your own fix, then disclosing it by row before anyone asks, is the discipline this phase has been trying to build for nine waves. It is the strongest single signal in round 7."
    - "THE DERIVED/DRIFT-DETECTABLE CRITERIA (1) AND (2) — I FOUND NO EVIDENCE AGAINST EITHER AND I LOOKED. Both shipped spans are byte-identical at 580 lines, the two byte-equality cases are separate assertions guarding separate copies, and the box and `CORE11_BOX_EXPECTED` moved in ONE commit (`f5652a1`, 2 files / 2 lines) — the rule both earlier flips broke. These two rows of the discharge table stand."
    - "NO REGRESSION ANYWHERE. `pnpm test` 31 files / 1372 tests exit 0 (1345 -> 1372 across the round). `tsc --build` exit 0. `pnpm check:bundle` reports the shipped bundle's entire import set as ONE specifier, `crypto`. Working tree left byte-clean after four mutations planted and restored."
  gaps_remaining:
    - "UAT gap 2 / truth 9 (CORE-11 outbound enforcement) — STILL OPEN, for the SIXTH consecutive round, but for the FIRST time the failure is BOUNDED AND SMALL. The re-scope is legitimate and criteria (1) and (2) are genuinely discharged. Criterion (3) — THE SOLE BOUND — is not, on all three legs the reviewer named and each of which I reproduced by execution. CORE-11's `[x]` is NOT earned and must revert a third time. The score is 8/9 for the sixth round running, but the remaining work is now hours rather than another round of resolver widening."
  regressions:
    - "NO behavioural regression. Truths 1-8 re-checked by execution or by re-reading the committed artefact this session; the must-NOT itself holds and I re-established it independently."
    - "ONE LEDGER REGRESSION, AND IT IS THE GAP. `.planning/REQUIREMENTS.md:46` flipped to `- [x] **CORE-11**` while the same 23,290-byte line still says, unmarked and present-tense, `THE BOX IS DELIBERATELY STILL [ ]` and `WHY THE BOX IS [ ] HERE`. The row contradicts its own checkbox. That is new this round — it did not exist while the box was `[ ]`."
gaps:
  - truth: "No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)"
    status: partial
    reason: "THE QUESTION I WAS ASKED IS WHETHER CR-17/18/19 ARE DEFECTS IN THE DISCHARGE OR DEFECTS IN SURFACES THE BAR ALREADY DECLARES UNGUARDED. I REPRODUCED ALL THREE BY EXECUTION AND THE ANSWER IS THE SAME FOR ALL THREE: THEY ARE DEFECTS IN THE DISCHARGE. The bar declares two things unguarded — undeclared PHRASINGS, and shapes outside the walk's reach. Not one of these three is either. CR-17 is a DECLARED phrasing on the ONE surface criterion 3 was delivered for. CR-18 and CR-19 are two of the four reader surfaces check (3)(d) says it examined and found zero on. The bar's own text at line 141 of REQUIREMENTS.md says this box's `[x]` `may now mean, and may ONLY mean` all three criteria; (3) does not hold, so by the bar's own construction the box is `[ ]`. (1) CR-17 — I RAN THE REVIEWER'S MUTATION MYSELF AND IT PASSED 432/432. `HEADER_QUANTIFIER_EXEMPTIONS` holds a key that is the bare string `\"{q2} :: q2\"` — a fully-masked key whose entire normalized line is the declared phrasing `any depth` — and its reason says `HEADER. A wrapped cell in the same ASCII table, labelling what the keyReceiver row already carries.` I deleted that cell (`:436`, an ASCII-table cell that normalizes to exactly `any depth`) and planted at `:9437` a fabricated hand-written BOUND 9,001 lines away, outside all three exclusions: `// A RECEIVER OR GLOBAL ALIAS CHAIN RESOLVES TO / // any depth / // and this file states no bound on it.` Result: 432 passed (432), zero failures. I then restored and re-ran: 432 passed. I read the guard to find why, and the reason is structural rather than incidental — the discharge is `found.filter((f) => !declaredSet.has(f.key))` for missing, `declared.filter((k) => !foundKeys.includes(k))` for stale, and `foundKeys.length === declared.length` for the count. `foundKeys` is a flat array of key STRINGS. Not one of the three consults `f.line`. An exemption written for line 436 is discharged just as well by an occurrence at line 9438, and the `foundKeys.length === declared.length` pin is what FORCES the relocation to be a swap rather than an addition — delete one, plant one, and every count balances. The three EXCLUSIONS one layer up ARE pinned against exactly this (each carries a `proof` token and a `band`, and the registry exclusion carries the `inRange == inClauses` equality); the exemption map one layer down carries no equivalent. A guard that permits a standing claim about the walk's reach to be absorbed by an exemption written for a table cell does not make the disclosure the SOLE bound on that surface — it makes the disclosure the sole UNEXEMPTED bound, which is a different and much weaker sentence. (2) CR-18 — CONFIRMED, AND IT IS ON THE SINGLE MOST-READ SURFACE THIS REQUIREMENT HAS. `.planning/REQUIREMENTS.md:46` is one 23,290-byte line. It BEGINS `- [x] **CORE-11**`. Inside it, unmarked and present-tense, it still says `THE BOX IS DELIBERATELY STILL \\`[ ]\\`, AND THE BLOCKING ROW IS NAMED` and, separately, `WHY THE BOX IS \\`[ ]\\` HERE`, and it still states the SUPERSEDED bar as the future acceptance condition (`When this box is eventually \\`[x]\\`, it will mean ... the enforcement covers every surface this sentence enumerates`). I grepped the row itself: ZERO occurrences of `SUPERSEDED`, ZERO of `2026-08-25`, ZERO of `2026-08-26`. Its newest internal correction marker is `CORRECTION 2026-08-24, plan 01-28`. The supersede marker DOES exist — at `:110`, and it is scoped `TO ONE SENTENCE ON PURPOSE` — but the sentence it scopes to is the copy at `:112`, not the copy at `:46`. So the re-scope reached the narrative block and never reached the ledger row, and the ledger row is what a reader and a future planner meet FIRST. A checkbox that says `[x]` on a line that says twice, in present tense, that it is `[ ]` is not a surface where the disclosure is the sole bound; it is a surface that contradicts itself about the one fact it exists to record. (3) CR-19 — CONFIRMED, AND IT IS WORSE THAN STALE: IT IS FALSE, AND IT ASSERTS A ROW THE SUITE ASSERTS MUST NOT EXIST. `.planning/STATE.md:366`, in the LIVE `### Blockers` section, reads `[Phase 01] CORE-11 blocked by silence-operator-around-global-receiver:` and names six shapes it says `all report NOTHING`. I executed all six through `auditSource` this session: `(ok && globalThis).fetch(url)` -> [\"outbound-fetch\"], `(globalThis ?? self).fetch(url)` -> [\"outbound-fetch\"], `(globalThis || self).fetch(url)` -> [\"outbound-fetch\"], `(b ? globalThis : self).fetch(url)` -> [\"outbound-fetch\"], `(ok && window).fetch(url)` -> [\"outbound-fetch\"], `(ok && navigator).sendBeacon(u,d)` -> [\"outbound-beacon\"]. SIX OF SIX REPORT. And the row it names is not merely absent — `outbound-prohibition.spec.ts:9527` positively asserts it must NOT be in the registry, with a failure message reading `row \\`silence-operator-around-global-receiver\\` is BACK in the registry ... that is a REGRESSION in the descent and not a row to restore`. So a live blocker line in STATE.md names, as the thing blocking this requirement, a registry row this suite treats its existence as a regression. Two reader surfaces, both named by check (3)(d), both carrying an unmarked standing statement of the superseded position, and one of them factually false. SEVERITY, STATED THE SAME WAY IT HAS BEEN EVERY ROUND AND NOT INFLATED: NOTHING LEAKS. The must-NOT itself holds and I re-established it rather than carrying it forward — `pnpm test` 31 files / 1372 tests exit 0 with the gate walking 23 files over both `SOURCE_ROOTS` at ZERO violations, `tsc --build` exit 0, and `pnpm check:bundle` reporting the shipped bundle's entire import set as ONE specifier, `crypto`. All three findings are defects in a TEST-ONLY gate's description of itself and in two planning documents. This is a blocker on the claim-versus-enforcement standard this phase set for itself and has now enforced eight times, and on nothing else."
    severity: major
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-17, REPRODUCED BY ME AT 432/432 GREEN. `HEADER_QUANTIFIER_EXEMPTIONS` is keyed by `exemptionKeyFor(line, quantifierIndex)` = masked-normalized-line + `:: qN`, and the guard at `:9667-9730` matches keys as flat STRINGS — `declaredSet.has(f.key)`, `foundKeys.includes(k)`, `foundKeys.length === declared.length`. Nothing consults `f.line`, which `surfaceExemptionKeys` already computes and the failure message already prints. The key `\"{q2} :: q2\"` is fully masked, so it anchors to no construct at all: any line whose entire normalized content is `any depth` discharges it. Mutation executed: cell at `:436` deleted, fabricated bound planted at `:9437`, 432 passed / 0 failed; restored, 432 passed."
      - path: ".planning/REQUIREMENTS.md"
        issue: "CR-18. Line 46 begins `- [x] **CORE-11**` and contains, unmarked and present-tense, `THE BOX IS DELIBERATELY STILL [ ], AND THE BLOCKING ROW IS NAMED`, `WHY THE BOX IS [ ] HERE`, and the superseded bar stated as the future acceptance condition. Measured on the row itself: 0 occurrences of `SUPERSEDED`, `2026-08-25` or `2026-08-26`; newest internal marker `CORRECTION 2026-08-24, plan 01-28`. The supersede marker at `:110` is scoped to the copy at `:112` and does not reach `:46`."
      - path: ".planning/STATE.md"
        issue: "CR-19. Line 366, in the live `### Blockers` section, states CORE-11 is blocked by `silence-operator-around-global-receiver` and that six named shapes `all report NOTHING`. I executed all six: six of six report. The row it names is asserted ABSENT by `outbound-prohibition.spec.ts:9527`, whose failure text calls its return a regression. Line 365 is stale in the same direction (`wave 28 owns the CORE-11 checkbox flip`); line 367's five named rows should be re-checked against the derived span's current 26 measured silences at the same time."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-48 — CONFIRMED AS A MEASUREMENT AND WEIGHED DOWN TO A WARNING, BECAUSE I TESTED WHETHER IT IS EXPLOITABLE AND IT IS NOT. `closingBracketAfter` matches the exact line `\"]);\"`; `RESOLVER_REGISTRY` opens at `:4135` and closes at `:5767` with `] as readonly ResolverRecord[]);`, which does not match, so the scan runs on to the next exact `]);` at `:5884`. Exclusion three is therefore 4135..5884 and swallows 117 lines (5768..5884) that are the `BRANCH_VOCABULARY` docblock and declaration — a DIFFERENT construct, for which the exclusion's `name` (`the RESOLVER_REGISTRY declaration`) and its `why` (`its clause strings are already obligated`) are both false. The band `[500, 3000]` does not catch it (1750 lines). BUT: I planted a declared phrasing at `:5800`, inside those 117 lines, and the suite went RED — the `inRange == inClauses` equality covers them at the same reach as the main guard. So the residue is real and the description is wrong, while the enforcement errs safe. The discharge's phrase `zero residue in any exclusion` is true of PHRASINGS and false of LINES, and it should be re-stated rather than left to be re-discovered."
    missing:
      - "REVERT CORE-11 TO `[ ]` — A THIRD TIME, AND FOR A REASON THAT IS NOT THE FIRST TWO. This is the direct answer to the question I was asked. `e7cc4b6` reverted a box flipped over a gate that could not go red on an enumerated shape nobody had executed. `faca607` reverted a box flipped against an AUTHORED residual whose sentences the next verifier falsified. This third revert is DIFFERENT IN KIND and the difference is worth stating so the operator does not read three reverts as three of the same failure: the bar is now REACHABLE, criteria (1) and (2) are genuinely met and I found no evidence against either, and what failed is criterion (3)'s DISCHARGE — check (3)(d) reported `zero unmarked STANDING statements ... on any of the four reader surfaces` where two of those four carry one, and criterion (3)'s delivered mechanism has a hole I drove a fabricated bound through at 432/432 green. The box was flipped on a check that overclaimed. That is this phase's signature defect — a stated reach exceeding an executed reach — arriving inside the discharge of the criterion written to end it, which is precisely the outcome line 157 of REQUIREMENTS.md warned about while scoping row 3 for a DIFFERENT reason (the unreached classes) than the one that actually bit."
      - "CR-18: bring the ledger ROW into line with the ledger's own narrative, and do it in the same commit as any box move. Either mark the wave-28 correction inside `:46` as SUPERSEDED the way `:110` marks the copy at `:112`, or — cheaper and in the spirit of wave 33's own disposition — apply the pointer-not-a-bound rule to the row itself: delete the `THE BOX IS DELIBERATELY STILL [ ]` and `WHY THE BOX IS [ ] HERE` passages and the superseded-bar sentence, and point at the narrative block and at `CORE11_BOX_EXPECTED`. A row that carries no statement of the box's state cannot carry a stale one."
      - "CR-19: correct `.planning/STATE.md:366` — the six shapes report and the row it names is asserted absent by the suite. Re-check `:365` (`wave 28 owns the CORE-11 checkbox flip`) and `:367` (five named rows from plan 01-32) against the derived span's current 26 measured silences in the same pass, because the same drift mechanism produced all three."
      - "CR-17 AT THE SEAM, AND THE FIX IS SMALL: anchor the exemption to the construct, not just to the masked text. Two options and the first is cheaper. (1) Make the key or the entry carry a CONSTRUCT ANCHOR — the nearest preceding declaration or fixture title — so `\"{q2} :: q2\"` cannot be discharged by an occurrence 9,000 lines from the table it names, exactly as the three EXCLUSIONS each carry a `proof` token that pins them to the construct they exclude. (2) Failing that, forbid a fully-masked key outright: a key whose entire anchor is `{qN}` names nothing and is the one shape that can float anywhere in the file. Add the executed mutation — cell deleted, bound planted 9,001 lines away — as a failing-path fixture, because a guard against relocation that has never been watched failing is the same species of unwatched assertion this file has spent nine waves removing."
      - "WR-48: fix `closingBracketAfter` to match the registry's real closing line (`] as readonly ResolverRecord[]);`) or to bracket-match rather than string-match, and re-state the discharge's `zero residue in any exclusion` as the phrasing-level claim it actually is. Then re-measure — narrowing exclusion three from 5884 to 5767 puts 117 lines back on the guarded surface and may raise new obligations, which is the honest direction and should be taken as a measurement rather than predicted."
      - "DO NOT RE-OPEN THE RE-SCOPE. It is the operator's decision, recorded with decider, date, reason and route, and I found no evidence it is a quietly lowered bar: `:143` and `:161` both state the new bar is NARROWER and ends no class, `:145` shows the must-NOT itself is byte-identical, CR-15 and CR-16 were disclosed as named rows BEFORE any branch existed, and `WebSocket.call(null, u)` was found by wave 34 re-measuring its own widening and disclosed with a probe and a counter-probe. That is a phase that has learned to disclose against itself. The `[x]` is unearned because criterion (3) is unmet, not because the bar is wrong."
deferred: []
behavior_unverified_items: []
coincidental_reliance_items:
  - truth: "URL userinfo does not reach `observations.url`"
    reason: undeclared-precondition
    harden: "Carried forward from rounds 3-6 unchanged and still correct. The `://` precondition is DECLARED at `schema.spec.ts:115-123` rather than assumed, but the guarantee still rests on `consumer.ts` handing over an absolute `rr.request.getUrl()`. Advisory, no score effect."
  - truth: "The derived residual states the whole bound on CORE-11"
    reason: undeclared-precondition
    harden: "REOPENED ONE LEVEL FURTHER IN, which is the motion this file keeps making and which is now worth naming as the pattern rather than the finding. Round 5's entry: nothing bound a `clause` to its branch — closed by wave 29. Round 6's entry: the guards scanned only `RESOLVER_REGISTRY[].clause` while 3,464 hand-written lines stated bounds — closed by wave 33 deleting them. Round 7's entry: the whole-file guard now reaches those lines, but its EXEMPTION MAP is unanchored, so a bound can be planted anywhere on the guarded surface and absorbed by an exemption written for a table cell (CR-17, executed at 432/432). Each round the undeclared precondition moves one layer down the same mechanism. Harden by anchoring exemptions to constructs — and note that the layers are running out, which is the encouraging reading."
  - truth: "The head-side truncation residual is disclosed accurately"
    reason: fixture-only
    harden: "WR-39, carried forward from round 6 UNCLOSED. The disclosed discriminator `shape (2) SHRINKS and shape (3) does not` holds only because the fixture's parameter name `jsessionid` is ten characters, the same length as `<redacted>`. Advisory, no score effect — the REDACTION itself is unaffected and the sweep evidence stands. Sweep the disclosure across parameter-name length the way WR-28 taught this file to sweep across offset."
prohibitions:
  - requirement_id: CORE-11
    statement: "No code that ships in the plugin issues an outbound network request in this phase — no `caido:http` fetch, no `sdk.requests.send` in any spelling, no method of an identified `requests` or `net` receiver outside a read-only allowlist, no global `fetch` by any receiver or alias, no `XMLHttpRequest`/`WebSocket`/`EventSource`, no `navigator.sendBeacon`, no dynamic code construction, and no speculative retrieval of any kind."
    verification: gate
    declared_status: resolved
    status: unverified
    flagged: true
    evidence: "FAIL-CLOSED for the seventh consecutive round, and this round the LEDGER AND I DISAGREE — the row says `[x]` and I find the discharge's third criterion unmet. THE MUST-NOT ITSELF HOLDS AND I RE-ESTABLISHED IT INDEPENDENTLY: `pnpm test` 31 files / 1372 tests exit 0 with the gate walking 23 files over both `SOURCE_ROOTS` at ZERO violations; `tsc --build` exit 0; `pnpm check:bundle` reports the shipped bundle's entire import set as ONE specifier, `crypto`. GENUINELY CLOSED THIS ROUND AND CONFIRMED BY MY EXECUTION: `fetch.call(null, url)` -> [\"outbound-fetch\"], `const f = fetch; f.call(null, url)` -> [\"outbound-fetch\"] (both `[]` in round 6), `const m = \"send\"+\"Beacon\"; navigator[m](u,d)` -> [\"outbound-unanalysable\"] (was `[]`), and all six operator-around-a-global shapes report. STILL SILENT AND PROPERLY DISCLOSED: `WebSocket.call(null, u)` -> `[]`, carried as the named row `silence-outbound-ctor-receiver-position` with an executed probe and counter-probe — disclosed by row before I looked for it, which is the discipline working. WHY THIS IS STILL `unverified` DESPITE THE `[x]`: the re-scoped bar admits an `[x]` ONLY when the residual is DERIVED, DRIFT-DETECTABLE and THE SOLE BOUND. (1) and (2) hold and I found no evidence against them. (3) does not: I planted a fabricated hand-written bound in a DECLARED phrasing 9,001 lines from the exemption written for it and the suite passed 432/432; and two of the four reader surfaces check (3)(d) says it found zero on — `REQUIREMENTS.md:46` and `STATE.md:366` — each carry an unmarked standing statement of the superseded position, the second of them factually false. A `verification: gate` prohibition whose own acceptance criterion is unmet is not verified, and the box should read `[ ]`."
  - requirement_id: STORE-03
    statement: "MUST NOT persist a query-string VALUE from a target-controlled URL into observations.url. Parameter names, path, scheme and host are retained; every value is replaced before the row is written."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "HOLDS. Carried forward from round 6, where I swept 3,612 inputs across four parameter-name lengths x 301 offsets x three grammars through both passes with ZERO occurrences of the secret in any of 7,224 outputs and ZERO outputs over `URL_MAX`, on top of round 5's 16,160-input sweep. `packages/backend/src/store/observations.ts` has been byte-identical in its non-comment lines since wave 26, so that evidence still applies unchanged, and wave 35's own re-measurement reports 19,772 swept inputs with zero leaks. Regression-checked this round inside the green 1,372-test suite. WR-39 remains a DISCLOSURE defect about which offsets are unstable, not a failure of the prohibition."
  - requirement_id: STORE-07
    statement: "MUST NOT render a caught exception into a persisted or logged string without passing it through describeError first."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "Carried forward from rounds 4-6, where I executed both directions through the shipped `error-redaction.spec.ts` `auditSource`: `flag ? e.message : \"none\"`, `e.message ?? \"none\"`, `e.message || \"none\"` and `flag && e.message` all report `unredacted-concat`, and every `describeError` twin stays quiet. Regression-checked this round inside the green 1,372-test suite. WR-40 and WR-42 are warnings against that gate's own correction text, not failures of the prohibition."
  - requirement_id: CORE-10
    statement: "MUST NOT present partial passive coverage as complete."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Carried forward unchanged and accepted by the operator at UAT test 3. Counter identifiers remain honest (`proxiedResponsesObserved`, and the cap-drop counter is labelled `CORE-03 visible overflow`). Judgment-tier, autonomous run: NON-AUTHORITATIVE LLM-judge verdict, human review recommended."
  - requirement_id: STORE-01
    statement: "MUST NOT retain operator browsing evidence beyond what the analysis needs — no body bytes, headers, cookies, or column capable of holding a secret."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Carried forward from rounds 3-6 substantially unchanged. The column-shape half is gated (PRAGMA-read allowlist + forbidden-name check). The 'capable of holding a secret' half is honestly bounded rather than contradicted: `observations.url` can still hold a path-embedded token and a retained parameter NAME, both named in the OPEN list, both pinned, the second kept BY POLICY under the operator's 2026-08-21 UAT decision. Judgment-tier: NON-AUTHORITATIVE, human review recommended."
---

# Phase 1: Skeleton, Persistence, Compatibility — Verification Report

**Phase Goal:** A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Verified:** 2026-08-26T09:45:00Z
**Status:** gaps_found
**Re-verification:** Yes — verification pass 8, after gap-closure ROUND 7 (waves 33, 34, 35)

---

## THE VERDICT, FIRST, BECAUSE IT IS THE ONLY THING I WAS ASKED FOR

**CORE-11's `[x]` is NOT earned. It must revert a third time, to `[ ]`.**

**The ground is (a): defects in the DISCHARGE. The box was flipped on a check that overclaimed.**

It is not (b). I tested (b) specifically, because (b) would have been the answer that let the box stand, and it fails on the facts. The re-scoped bar declares exactly two things unguarded: **undeclared phrasings**, and **shapes outside the walk's reach**. Not one of CR-17, CR-18 or CR-19 is either of those.

- **CR-17** is a **DECLARED** phrasing — `any depth`, index 2 of `UNBOUNDED_QUANTIFIERS` — on the **one surface criterion 3 was delivered for**. It is the exact class the wave-33 guard exists to catch, not a conceded residual.
- **CR-18 and CR-19** are two of the **four reader surfaces that check (3)(d) says it examined and found zero on**. A surface the discharge claims to have checked is by definition not a surface the bar declares unguarded.

And the bar's own construction closes the argument without needing my judgement. `REQUIREMENTS.md:141`: *"This box's `[x]` may now mean, and may ONLY mean, that this requirement's residual is: (1) DERIVED … (2) DRIFT-DETECTABLE … and (3) THE SOLE BOUND."* All three are necessary. **(3) does not hold.** So the box is `[ ]` by the bar's own words, and no verifier judgement is required to get there.

### The sentence the operator actually needs, because three reverts are not three of the same failure

`e7cc4b6` reverted a box flipped over a gate that **could not go red on an enumerated shape nobody had executed**. `faca607` reverted a box flipped against an **AUTHORED residual whose sentences the next verifier falsified in three sentences**. This third revert is **different in kind**, and the difference is the whole practical content of this report:

- **The bar is now reachable.** The re-scope is legitimate, and I looked hard for a quietly-lowered bar wearing a re-scope's clothes. I did not find one — see "On the re-scope" below.
- **Criteria (1) and (2) are genuinely discharged.** I found no evidence against either and I tried.
- **What failed is criterion (3)'s discharge, not criterion (3).** Check (3)(d) reported `zero unmarked STANDING statements … on any of the four reader surfaces`; two of the four carry one. And criterion (3)'s delivered mechanism has a hole I drove a fabricated bound straight through at **432/432 green**.

So this is **a stated reach exceeding an executed reach** — this phase's signature defect — arriving **inside the discharge of the criterion written to end it**. `REQUIREMENTS.md:157` anticipated exactly that shape and scoped row 3 to guard against it, but it scoped for the wrong reason: it scoped for the *unreached classes*, and the thing that bit was the *cross-surface check*.

**The remaining work is hours, not another round of resolver widening.** That is new. Every prior round ended with "widen a resolver, re-measure, find two more." This one ends with three bounded text-and-anchoring fixes.

---

## The three blockers, adjudicated by my own execution

I re-ran each one myself rather than repeating the reviewer. All four mutations below were planted, observed, and restored; `git status --porcelain packages/` is empty and the suite is green at the end of this session.

### CR-17 — CONFIRMED. I got 432/432 green too, and the cause is structural.

**What I did.** `HEADER_QUANTIFIER_EXEMPTIONS` carries a key that is the bare string `"{q2} :: q2"`. Its reason reads: *"HEADER. A wrapped cell in the same ASCII table, labelling what the keyReceiver row already carries."* `q2` is `"any depth"`. The key is **fully masked**, so its anchor is nothing at all — any line whose entire normalized content is `any depth` discharges it.

I deleted the ASCII-table cell it was written for (`outbound-prohibition.spec.ts:436`, which normalizes to exactly `any depth`) and planted a fabricated hand-written **BOUND** 9,001 lines away at `:9437`, outside all three exclusions:

```
    // A RECEIVER OR GLOBAL ALIAS CHAIN RESOLVES TO
    // any depth
    // and this file states no bound on it.
```

**Result: `Tests 432 passed (432)`. Zero failures.** Restored; 432 passed again.

**Why, read off the guard rather than guessed.** The three discharge checks at `:9667-9730` are:

| Check | Code | Consults the line? |
| --- | --- | --- |
| unexcused occurrence | `found.filter((f) => !declaredSet.has(f.key))` | no |
| stale exemption | `declared.filter((k) => !foundKeys.includes(k))` | no |
| count equality | `foundKeys.length === declared.length` | no |

`foundKeys` is a flat array of key **strings**. Nothing consults `f.line` — which `surfaceExemptionKeys` already computes and the failure message already prints. So an exemption written for line 436 is discharged just as well by an occurrence at line 9438. And the count equality is what **forces the relocation to be a swap rather than an addition**: delete one, plant one, every count balances.

**Why this defeats criterion 3 rather than merely annoying it.** The three EXCLUSIONS one layer up *are* pinned against exactly this — each carries a `proof` token binding it to its construct, plus a `band`, plus (for the registry) the `inRange == inClauses` equality. The EXEMPTION MAP one layer down carries no equivalent. A guard that lets a standing claim about the walk's reach be absorbed by an exemption written for a table cell does not make the disclosure **the sole bound** on that surface. It makes it the sole **unexempted** bound — a different and much weaker sentence, and not the one criterion 3 states.

### CR-18 — CONFIRMED, on the single most-read surface this requirement has.

`.planning/REQUIREMENTS.md:46` is one line of **23,290 bytes**. It **begins** `- [x] **CORE-11**`. Inside it, unmarked and present-tense, it still says:

- ``THE BOX IS DELIBERATELY STILL `[ ]`, AND THE BLOCKING ROW IS NAMED``
- ``WHY THE BOX IS `[ ]` HERE``
- and the **superseded bar** as the future acceptance condition: ``When this box is eventually `[x]`, it will mean … the enforcement covers every surface this sentence enumerates``

Measured on the row itself: **0** occurrences of `SUPERSEDED`, **0** of `2026-08-25`, **0** of `2026-08-26`. Its newest internal correction marker is `CORRECTION 2026-08-24, plan 01-28`.

The supersede marker **does** exist — at `:110`, and it is scoped *"TO ONE SENTENCE ON PURPOSE"*. But the sentence it scopes to is the copy at `:112`. **It never reached `:46`.** The re-scope landed in the narrative block and not in the ledger row, and the ledger row is what a reader and a future planner meet first.

A checkbox reading `[x]` on a line that says twice, in present tense, that it is `[ ]` is not a surface where the disclosure is the sole bound. It is a surface that contradicts itself about the one fact it exists to record.

### CR-19 — CONFIRMED, and worse than stale: it is false, and it asserts a row the suite asserts must NOT exist.

`.planning/STATE.md:366`, in the **live** `### Blockers` section, reads ``[Phase 01] CORE-11 blocked by silence-operator-around-global-receiver:`` and names six shapes it says **"all report NOTHING"**. I executed all six through `auditSource` this session:

| Shape | STATE.md:366 claims | I measured |
| --- | --- | --- |
| `(ok && globalThis).fetch(url)` | reports NOTHING | `["outbound-fetch"]` |
| `(globalThis ?? self).fetch(url)` | reports NOTHING | `["outbound-fetch"]` |
| `(globalThis \|\| self).fetch(url)` | reports NOTHING | `["outbound-fetch"]` |
| `(b ? globalThis : self).fetch(url)` | reports NOTHING | `["outbound-fetch"]` |
| `(ok && window).fetch(url)` | reports NOTHING | `["outbound-fetch"]` |
| `(ok && navigator).sendBeacon(u,d)` | reports NOTHING | `["outbound-beacon"]` |

**Six of six report.** And the row it names is not merely absent — `outbound-prohibition.spec.ts:9527` **positively asserts it must not be in the registry**, with a failure message reading: *"row `silence-operator-around-global-receiver` is BACK in the registry … that is a REGRESSION in the descent and not a row to restore."*

So a live blocker line in `STATE.md` names, as the thing blocking this requirement, a registry row whose **existence** this suite treats as a regression. Lines `:365` and `:367` are stale in the same direction and should be swept in the same pass.

### WR-48 — CONFIRMED as a measurement, WEIGHED DOWN to a WARNING, because I tested whether it is exploitable and it is not.

`closingBracketAfter` matches the exact line `"]);"`. `RESOLVER_REGISTRY` opens at `:4135` and closes at `:5767` with `] as readonly ResolverRecord[]);` — which does not match — so the scan runs on to the next exact `]);` at **`:5884`**.

Exclusion three is therefore **4135..5884** and swallows **117 lines** (`5768..5884`) that are the `BRANCH_VOCABULARY` docblock and declaration — a **different construct**, for which the exclusion's `name` (*"the RESOLVER_REGISTRY declaration"*) and its `why` (*"its clause strings are already obligated"*) are both false. The band `[500, 3000]` does not catch it: 1750 lines is inside the band.

**But I planted a declared phrasing at `:5800`, inside those 117 lines, and the suite went RED** (`432 tests | 1 failed`). The `inRange == inClauses` equality covers them at the same reach as the main guard. So the residue is real and the description is wrong, while the **enforcement errs safe**.

The discharge's phrase *"zero residue in any exclusion"* is **true of phrasings and false of lines**. It should be re-stated rather than left to be re-discovered a ninth time. Warning, not blocker.

---

## Goal Achievement — the seven ROADMAP success criteria

| # | Truth (ROADMAP success criterion) | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `onInterceptResponse` non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `hooks/passive.ts:117` documents and implements the non-async callback; `index.ts:322` registers it last, after `init()`, per the ordering comment at `:31`. Regression-green inside 31 files / 1372 tests. |
| 2 | Work queue bounded, overflow count visible, never unbounded | ✓ VERIFIED | `queue.cap` is consulted at `hooks/passive.ts:162`; `telemetry.ts:100` carries the cap-drop counter explicitly labelled *"Entries the queue dropped because it was at cap (CORE-03 visible overflow)"*. |
| 3 | 200-chunk SPA leaves plugin UI and RPC responsive; max synchronous slice recorded and under the Phase 0 threshold | ✓ VERIFIED | Live measurement committed at `results/spa-load.json`, taken from **outside** the process by an external REST prober (decision P5-D3 — a starved thread cannot report that it is starved), against `caido-cli 0.57.1` with a pinned binary sha256. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `store/analyses.ts:86,111` — one row per `(project_id, sha256, detector_set_hash)`, `project_id` in the insert. Live restart half recorded in `results/spa-load.json`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; non-UTF-8 fixture round-trips | ✓ VERIFIED | `ingest/consumer.ts:189` takes `body.toRaw()`; `engine/src/decode.ts:17` records that `digest.ts` hashes `toRaw()` bytes; `telemetry.ts:154` carries the disagreement counter for `body.length` vs `toRaw().length`. |
| 6 | CI gate fails the build if the backend bundle imports a specifier outside the Phase 0 allowlist | ✓ VERIFIED | `scripts/ci/check-bundle-imports.mjs` wired as `check:bundle` in `package.json:13`. **Executed this session:** `packages/backend/dist/index.js: 1 import specifier(s): crypto`. |
| 7 | Below-minimum Caido produces a clear message, not an obscure failure | ✓ VERIFIED | `compat.ts:43` `MIN_CAIDO = "0.57.1"` with the manifest-has-no-minimum-version reasoning at `:7` and the required-capability rationale at `:47`. |
| 8 | Redaction: no query-string value from a target-controlled URL reaches `observations.url` | ✓ VERIFIED | STORE-03, carried with its sweep evidence; `observations.ts` non-comment-byte-identical since wave 26. |
| 9 | **No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)** | **✗ FAILED (partial)** | **The one that does not hold.** The must-NOT itself holds and I re-established it. The **enforcement's discharge** does not — see the verdict above. |

**Score: 8/9 truths verified.** Sixth consecutive round at 8/9, and the same truth each time.

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `packages/backend/src/hooks/passive.ts` | Non-async hook, cheap gates, bounded enqueue | ✓ VERIFIED | Wired from `index.ts:322`; cap consulted. |
| `packages/backend/src/ingest/consumer.ts` | `toRaw()` byte path | ✓ VERIFIED | Wired; feeds the digest. |
| `packages/backend/src/store/analyses.ts` | `project_id`-keyed persistence, hash-once | ✓ VERIFIED | Wired; insert carries the key. |
| `packages/backend/src/store/observations.ts` | URL redaction before write | ✓ VERIFIED | Wired; non-comment bytes unchanged since wave 26. |
| `packages/backend/src/compat.ts` | Minimum-version gate with a clear message | ✓ VERIFIED | Wired. |
| `scripts/ci/check-bundle-imports.mjs` | Allowlist gate | ✓ VERIFIED | Executed: 1 specifier, `crypto`. |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 enforcement + derived, drift-detectable, singular disclosure | ⚠️ **PARTIAL** | Enforcement runs green over 23 real files, 0 violations. Criteria (1) and (2) hold. **Criterion (3)'s mechanism is bypassable in a declared phrasing (CR-17, executed) and its cross-surface check overclaimed (CR-18, CR-19).** |
| `.planning/REQUIREMENTS.md:46` | The ledger row for CORE-11 | ✗ **CONTRADICTS ITSELF** | `[x]` at the head; two unmarked present-tense statements that it is `[ ]` inside. |
| `.planning/STATE.md:366` | Live blockers | ✗ **FALSE** | Six shapes it says report nothing all report; names a row the suite asserts absent. |

### Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
| --- | --- | --- | --- |
| Full suite green | `pnpm test` | 31 files / **1372 tests** exit 0 | ✓ PASS |
| Types sound | `pnpm exec tsc --build` | exit 0 | ✓ PASS |
| Bundle allowlist | `pnpm check:bundle` | 1 specifier: `crypto` | ✓ PASS |
| Gate suite alone | `pnpm vitest run …/outbound-prohibition.spec.ts` | 432 passed (432) | ✓ PASS |
| **CR-17 mutation** (cell deleted, bound planted 9,001 lines away) | same | **432 passed (432)** | ✗ **FAIL — should have gone red** |
| **WR-48 mutation** (declared phrasing planted at `:5800`, inside exclusion three) | same | 432 tests, **1 failed** | ✓ PASS — errs safe |
| CR-15 closure | `auditSource` on `fetch.call(null,url)` | `["outbound-fetch"]` | ✓ PASS |
| CR-15 alias closure | `const f = fetch; f.call(null,url)` | `["outbound-fetch"]` | ✓ PASS |
| CR-16 closure | `const m="send"+"Beacon"; navigator[m](u,d)` | `["outbound-unanalysable"]` | ✓ PASS |
| CR-19 falsification | six operator-around-global shapes | all six report | ✗ **STATE.md:366 is false** |
| Disclosed residual still silent | `WebSocket.call(null,u)` | `[]` — named row `silence-outbound-ctor-receiver-position`, probe + counter-probe | ✓ PASS (disclosed) |

---

## On the re-scope — I tested it for a quietly-lowered bar and did not find one

The operator's decision is not a defect and I am not reporting it as one. But "re-scope" and "quietly lowered bar" look identical from the outside, and this phase's own text says so, so I checked rather than accepted:

- **The must-NOT is byte-identical through the wave.** `:145` claims an empty diff over the first sentence; the sentence I read at `:46` is the sentence the round-6 report quoted.
- **The new bar is stated as NARROWER, twice, in the same passage as the re-scope** (`:143`, `:161`), specifically so the two cannot be read apart. It claims the gate's *description of itself* is derived/drift-detectable/singular — not that the gate catches everything.
- **The residuals were disclosed BEFORE the branches existed.** Wave 34 landed CR-15 and CR-16 as named `measured-silence` rows with executed probes and counter-probes in their own commit, *then* widened. Disclosing a hole before you fix it is the opposite of laundering one.
- **Wave 34 found a new silence by re-measuring its own widening and disclosed it unprompted.** `WebSocket.call(null, u)` → `[]`, carried as `silence-outbound-ctor-receiver-position` with a counter-probe (`globalThis.WebSocket.call(null, u)`). I executed it; it is real and it is named. **This is the strongest single signal in round 7** and it is worth more than the three blockers cost.
- **The commit discipline held.** The box and `CORE11_BOX_EXPECTED` moved together in one commit (`f5652a1`, 2 files / 2 lines) — the rule both earlier flips broke.

**Do not re-open the re-scope.** The `[x]` is unearned because criterion (3) is unmet, not because the bar is wrong.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `outbound-prohibition.spec.ts` | 9024 | Fully-masked exemption key `"{q2} :: q2"` anchored to no construct | 🛑 Blocker | Launders a fabricated bound at 432/432 green (CR-17) |
| `outbound-prohibition.spec.ts` | 9544 | `closingBracketAfter` string-matches `"]);"`, missing `] as readonly ResolverRecord[]);` | ⚠️ Warning | Exclusion three over-broad by 117 lines; errs safe (WR-48) |
| `.planning/REQUIREMENTS.md` | 46 | Row asserts `[x]` and, unmarked, `[ ]` twice | 🛑 Blocker | Self-contradicting ledger (CR-18) |
| `.planning/STATE.md` | 365–367 | Stale live blockers; `:366` factually false | 🛑 Blocker | Names a row the suite asserts absent (CR-19) |

No debt markers (`TBD`/`FIXME`/`XXX`), no skipped tests, no `.only` — consistent with prior rounds and re-confirmed by the green suite.

## Requirements Coverage

All 23 requirement ids the phase is tagged with (CORE-01…CORE-11, STORE-01…STORE-07, COMPAT-01, COMPAT-02, ENC-01, DIST-05, DIST-06) resolve in `REQUIREMENTS.md` and appear in at least one plan. **No orphans.** 23 of 23 boxes now read `[x]` — and **CORE-11's should read `[ ]`**, which is this report's single gap.

## Human Verification Required

None newly raised by me. The judgment-tier prohibitions (CORE-10, STORE-01) remain flagged `unverified` with NON-AUTHORITATIVE LLM-judge verdicts, carried forward and previously accepted by the operator at UAT; they are unchanged this round.

## Gaps Summary

One gap, and it is the same truth for the sixth consecutive round — but for the first time it is **small, bounded, and not a resolver problem**.

Round 7 did real work and I verified it: CR-15 and CR-16 are genuinely closed at the seam, the ~3,465-line hand-written header no longer states a bound of its own, a whole-file phrasing guard now exists and I proved it non-vacuous with my own mutation, and a new silence was found by self-re-measurement and disclosed by row before anyone asked. Criteria (1) DERIVED and (2) DRIFT-DETECTABLE are discharged and I found no evidence against either.

Criterion (3) THE SOLE BOUND is not discharged, on all three legs:

1. **Its mechanism is bypassable in a declared phrasing.** I planted a fabricated hand-written bound 9,001 lines from the exemption written for it: **432/432 green**.
2. **Its cross-surface check reported zero where the count is two.** `REQUIREMENTS.md:46` and `STATE.md:366` each carry an unmarked standing statement of the superseded position.
3. **One of those two is factually false**, and names as a live blocker a registry row this suite treats as a regression if it returns.

Because the bar states all three criteria as necessary, **CORE-11 reverts to `[ ]` a third time — on ground (a), a discharge that overclaimed.** Fix the exemption anchoring, correct the two documents, and re-run; that is hours of work, and it is the first time in seven rounds this report can say that.

**Nothing leaks, and I re-established that rather than carrying it forward.** 31 files / 1372 tests exit 0 with the gate walking 23 files over both `SOURCE_ROOTS` at zero violations; `tsc --build` exit 0; the shipped bundle's entire import set is one specifier, `crypto`. Every finding here is a defect in a test-only gate's description of itself, or in two planning documents.

---

_Verified: 2026-08-26T09:45:00Z_
_Verifier: Claude (gsd-verifier), verification pass 8_
