---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-24T21:20:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  previous_verified: 2026-08-24T16:40:00Z
  round: 6
  verification_pass: 7
  gaps_closed:
    - "CR-11 — CLOSED IN BOTH DIRECTIONS, and the unsafe half is the one that mattered. I re-executed all six spellings the round-5 report measured silent in INITIALIZER position and every one now reports: `const g = globalThis ?? self; g.fetch(url)`, `const f = fetch ?? x; f(url)`, `const e = eval ?? x; e(src)`, `const n = navigator ?? x; n.sendBeacon(u,d)` — the plausible defensive idiom that was disclosed by nothing. `operatorOperandMatching` is one shared descent reached from six global resolvers, and `bareFetchCallee` was added because the bare-call rule asked its own inline question. The safe half was closed by REMOVING the row rather than correcting it, because the silence it named stopped existing, and the removal is asserted (`silence-operator-around-global-receiver` is BACK in the registry -> red)."
    - "CR-12 — CLOSED AT THE SEAM. `collect`'s alias-growing branch now reads `ASSIGNING_OPERATORS` rather than testing `=== EqualsToken`, so the widening collectors see the same assignment population the numeric-poisoning branch eleven lines below already saw. The `QUANTIFIED_CLAUSES` entries for `constStrings` and `receiverAliases` both record the widening WITH the probe that measured it, and `silence-logical-assignment-member-target` names the residue that survives (an `o.r ??= …` member target, because the branch requires an identifier on the left)."
    - "CR-13 — CLOSED AT THE SEAM. The declaration branch descends a conditional/`??`/`||` initializer into the literal collectors via `operatorLiteralBinding`, which is the same descent `keyReceiver` already performed inline. `constStrings`' and `literalsOf`' QUANTIFIED_CLAUSES entries both record `const r = ok ? \"requests\" : \"x\"; sdk[r].send(req)` reporting `outbound-send` after the widening, and both keep the universal marked STILL FALSE with the four remaining silent shapes named."
    - "WR-32, THE ROUND-5 DIAGNOSIS, GENUINELY CLOSED — AND I PROVED IT WITH A HARDER MUTATION THAN ROUND 6 ITSELF RAN. Round 5's one-sentence diagnosis was that nothing binds a `clause` to the branch it describes. `BRANCH_VOCABULARY` + per-branch probes now do. I left the `PlusEqualsToken` branch's condition and its anchor line intact and neutered only its effect (`assembledNames.add(node.left.text)` -> `void 0`), so the anchor guard could not fire on a missing line — the suite went RED in THREE places, one of them row-granular and self-naming: `x branch assembledNames / a \\`+=\\` compound assignment / auditSource > collect > node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken && — its probe is executed against auditSource`. 3 failed | 404 passed. Restored, green. The identical mutation left round 5's derived block at 52/52 GREEN. That is a real seam and it is the largest deliverable of round 6."
    - "THE COVERAGE GUARD IS REAL TOO, AND I INJECTED AGAINST IT MYSELF. An unregistered resolver declared at `auditSource`'s own indentation (`const sneakyResolver = (n: ts.Expression): boolean => …`) turns BOTH coverage-guard cases red — the non-vacuity case and `every member of BOTH populations is a registry row OR a named, reasoned exemption`. 2 failed | 405 passed. Restored, green."
    - "WR-34 — CLOSED. `CORE11_BOX_EXPECTED = \"- [ ] **CORE-11**\"` is pinned by PREFIX (`row.startsWith(...)`), not by the two-state character class `/^- \\[[ x]\\]/` that stayed green through both flips and both reverts. The failure message names `e7cc4b6` and `faca607` and states the one legitimate way out. I read the ledger row: `.planning/REQUIREMENTS.md:46` is `- [ ] **CORE-11**`, so the pin and the ledger agree."
    - "WR-33 — CLOSED at two weights. `RESOLVER_EXEMPTIONS.collect` and `.visit` now say what they actually do rather than excusing it."
    - "FALSIFIED_HANDOFFS DRAINED TO ZERO WITH AN EQUALITY PIN, verified by me: the array is empty and the assertion is `.toBe(0)`, not a `toBeGreaterThan`. Six entries were opened by wave 29 and discharged two-by-two by waves 30 (CR-13), 31 (CR-12) and 32 (CR-11), each in the same commit as its widening. A pin a later wave must delete is worse than none; this one is designed to sit at zero."
    - "WR-37 — CLOSED one level. A nested destructure of an outbound receiver reports; five sibling shapes were MEASURED and each got its own named silence row (`silence-array-slot-receiver`, `silence-object-literal-property-receiver`, `silence-class-field-receiver`, `silence-parameter-default-receiver`, `silence-for-of-binding-receiver`). The registry's MEASURED SILENCES grew from 7 to 16, which is the honest direction."
    - "THE DERIVED SPANS ARE STILL BYTE-IDENTICAL AND I RE-HASHED THEM: 510 lines strictly between the sentinels, both sha256 `f850802f402eabb23e6b044f3b65ae819ebdc75d57aecc89de444e7c433157fe`, in `packages/backend/src/outbound-prohibition.spec.ts` and `.planning/REQUIREMENTS.md`. The span grew from 295 to 510 lines and from 38 to 44 rows without losing the binding."
    - "LEDGER, MECHANICALLY RE-RUN OVER ALL 32 PLANS: all 23 requirement ids the phase is tagged with appear in at least one plan; every id named in any plan resolves in `REQUIREMENTS.md`. NO ORPHANS. 22 of 23 boxes `[x]`; CORE-11 `[ ]`."
    - "NO REGRESSION ANYWHERE ELSE. `pnpm test` 31 files / 1345 tests exit 0 (1200 -> 1345 across the round). `tsc --build` exit 0. Prior-phase gate 3 files / 80 tests exit 0. `check:bundle` 1 specifier, `crypto`. Zero debt markers, zero skipped tests, zero `.only` across both source roots."
  gaps_remaining:
    - "UAT gap 2 / truth 9 (CORE-11 outbound enforcement) — STILL OPEN, for the FIFTH consecutive round, and this time the three blockers SPLIT INTO TWO DIFFERENT CLASSES that need different answers. CR-14 is a stale-text defect on the ONE surface round 6's mechanism does not scan — bounded, nameable, closeable. CR-15 and CR-16 are CODE blindnesses on two clauses CORE-11's own first sentence enumerates — and no scanning mechanism closes those, ever. The score is 8/9 for the fifth round running."
  regressions:
    - "NO behavioural regression and NO ledger regression. Truths 1-8 all re-verified by execution or by re-reading the committed artefact this session. The ledger moved in the right direction again: CORE-11 stayed `[ ]` deliberately for the second consecutive round, and it is now pinned by a constant that can see the box."
    - "THE RECURRENCE WAS NOT STOPPED, AND ITS SHAPE HAS NOW SPLIT. Round 6 closed the CLAIM-versus-CODE class on every surface the registry owns, and I proved that three separate ways. It did not — and structurally cannot — close CODE-versus-REALITY. Six rounds have closed roughly two code blindnesses each and found roughly two each. That rate is flat and there is no mechanism in this design that would make it fall."
gaps:
  - truth: "No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)"
    status: partial
    reason: "THREE findings, ALL confirmed by my own execution against `auditSource` rather than by repeating the reviewer — and they are NOT the same kind of thing, which is the single most useful sentence in this report. (1) CR-14 IS A TEXT DEFECT ON AN UNSCANNED SURFACE. The hand-written header at `:760-772` still says, present tense, that `AN OPERATOR WRAPPING A GLOBAL RECEIVER IS STILL SILENT in every spelling`, names six exemplars, says they `all report []`, says it is `Pinned by a fixture titled as a MEASURED SILENCE`, and lists the shape at `:779` as `OPEN AND UNOWNED, no plan in this phase claims it`. I executed all six: `(ok && globalThis).fetch(url)` -> [\"outbound-fetch\"], `(g ?? globalThis)[\"fetch\"](url)` -> [\"outbound-fetch\"], `(b ? globalThis : x).fetch(url)` -> [\"outbound-fetch\"], `(b ? navigator : x).sendBeacon(u,d)` -> [\"outbound-beacon\"], `(b ? fetch : x)(url)` -> [\"outbound-fetch\"], `(b ? eval : x)(src)` -> [\"outbound-dynamic-code\"]. SIX OF SIX REPORT. Wave 32 removed the registry ROW carrying that universal and guarded its return; the HEADER copy was left standing, and the fixture it points at is now titled `CLOSED (CR-11)` at `:7748`. THE MECHANISM CANNOT SEE THIS, AND I VERIFIED THE REASON BY READING THE GUARDS: `UNBOUNDED_QUANTIFIERS`' scan is `RESOLVER_REGISTRY.flatMap((row) => UNBOUNDED_QUANTIFIERS.filter((q) => row.clause.includes(q)))` and `BRANCH_VOCABULARY`'s is the same shape over the same field. Nothing else in this file is scanned. I MEASURED THE UNSCANNED SURFACE MYSELF: excluding the 510-line generated span, the hand-written region ahead of `RESOLVER_REGISTRY` is 3,464 lines and carries the DECLARED phrasings 20 times — `anywhere in the file` x6, `any depth` x6, `ANY-BINDING-WINS` x4, `ANY of them` x2, `every literal` x1, `every spelling` x1. Not one raises a `QUANTIFIED_CLAUSES` obligation. The mechanism's own docblock states the PHRASE-LIST limit (`ITS REACH IS THE DECLARED PHRASINGS AND NO FURTHER`) and never states the SURFACE limit, and the surface limit is where this blocker lives. (2) CR-15 IS A CODE BLINDNESS AND IT IS THE SHARPEST OF THE THREE, because the shape is the plainest spelling anybody would actually write. A bare global in RECEIVER position rather than CALLEE position is silent FAMILY-WIDE, executed by me: `fetch.call(null, url)` -> [], `fetch.apply(null, [url])` -> [], `const g = fetch.bind(globalThis); g(url)` -> [], `Reflect.apply(fetch, null, [url])` -> [], `eval.call(null, src)` -> [], `Function.call(null, src)` -> []. AND THE ONE THAT PROVES IT IS A RESOLVER GAP AND NOT AN AST GAP: `const f = fetch; f.call(null, url)` -> [] while `const f = fetch; f(url)` -> [\"outbound-fetch\"] — the SAME `f`, positively identified in `fetchAliases`, silent the moment it is a receiver. EVERY STRUCTURAL TWIN REPORTS, so the machinery exists and is simply not reached: `sdk.requests.send.call(sdk.requests, req)` -> [\"outbound-send\"], `const g = sdk.requests.send.bind(sdk.requests); g(req)` -> [\"outbound-send\"], `Reflect.apply(sdk.requests.send, sdk.requests, [req])` -> [\"outbound-send\"], `globalThis.fetch.call(null, url)` -> [\"outbound-fetch\"], `const g = globalThis.fetch.bind(globalThis); g(url)` -> [\"outbound-fetch\"], `navigator.sendBeacon.call(navigator, u, d)` -> [\"outbound-beacon\"]. THIS FALSIFIES AN ENUMERATED CLAUSE WORD FOR WORD: CORE-11 says `no global fetch by ANY RECEIVER or alias`, and `fetch.call` is a global fetch by a receiver. (3) CR-16 IS A CODE BLINDNESS TOO, AND IT IS THE `could not read does not mean clean` RULE FAILING ON EXACTLY ONE RECEIVER FAMILY. `const m = \"send\" + \"Beacon\"; navigator[m](u, d)` -> [] and `const n = navigator; const m = \"send\"+\"Beacon\"; n[m](u, d)` -> [], while EVERY other identified receiver reports the identical shape: `sdk.requests[m]` -> [\"outbound-unanalysable\"], `globalThis[m]` -> [\"outbound-unanalysable\"], `window[m]` -> [\"outbound-unanalysable\"], and even the navigator DESTRUCTURE `const { [k]: b } = navigator; b(u,d)` -> [\"outbound-unanalysable\"]. The direct control `navigator.sendBeacon(u,d)` -> [\"outbound-beacon\"]. So the receiver is positively identified and the unreadable member is DROPPED rather than reported — which is the WR-19 asymmetry, closed twice before, surviving on one family. It falsifies the enumerated clause `no navigator.sendBeacon`. NEITHER CR-15 NOR CR-16 IS DISCLOSED ANYWHERE. I searched the 510-line derived span for `.call`, `.apply`, `.bind`, `Reflect` and `navigator[`: ZERO occurrences of each. None of the 16 MEASURED SILENCES names either shape. SEVERITY, STATED THE SAME WAY IT HAS BEEN EVERY ROUND: NOTHING LEAKS. I grepped both shipped source roots and the frontend for `fetch(`, `.send(`, `sendBeacon`, `XMLHttpRequest`, `new WebSocket`, `EventSource`, `eval(` and `new Function` outside spec files — ZERO HITS. The gate runs green over the real tree inside a 1,345-test suite and `check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. All three are PROSPECTIVE blindnesses in a test-only gate. This is a blocker on the claim-versus-enforcement standard this phase set for itself and has now enforced seven times — and on nothing else."
    severity: major
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-14. The hand-written header at `:760-772` declares an operator around a global receiver `STILL SILENT in every spelling`, names six exemplars and asserts they `all report []`. All six report. `:772` says `Pinned by a fixture titled as a MEASURED SILENCE`; the fixture at `:7748` is now titled `CLOSED (CR-11)`. `:779` lists the shape as `OPEN AND UNOWNED, no plan in this phase claims it`; wave 32 closed it."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-43, the mechanism-level cause of CR-14, and the one change that would prevent its recurrence. `UNBOUNDED_QUANTIFIERS` and `BRANCH_VOCABULARY` are scanned over `RESOLVER_REGISTRY[].clause` and over nothing else. Measured by me: the 3,464 hand-written lines ahead of the registry (excluding the 510-line generated span) carry the DECLARED phrasings 20 times and raise ZERO obligations. The guard's docblock states the phrase-list limit and never states the surface limit."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-15. A bare global in RECEIVER position is silent family-wide — `fetch.call`, `fetch.apply`, `fetch.bind`, `Reflect.apply(fetch, …)`, `eval.call`, `Function.call` — including through an alias the walk positively identified: `const f = fetch; f.call(null, url)` -> [] while `f(url)` -> [\"outbound-fetch\"]. Six structural twins on SDK and member-qualified global receivers all report. Falsifies CORE-11's enumerated clause `no global fetch by ANY RECEIVER or alias`. Disclosed by none of the 16 MEASURED SILENCES."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-16. An unreadable computed member on a positively identified `navigator` receiver is DROPPED: `const m = \"send\" + \"Beacon\"; navigator[m](u, d)` -> [], and the same through a `const n = navigator` alias. `sdk.requests[m]`, `globalThis[m]`, `window[m]` and the navigator destructure all report `outbound-unanalysable`. Falsifies the enumerated clause `no navigator.sendBeacon`, and it is the WR-19 `could not read does not mean clean` asymmetry surviving on one receiver family."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-38, and it is the more dangerous of the two stale directions. The header at `:908-916` reads `CORE-11 IS NOW MARKED COMPLETE IN REQUIREMENTS.md`. `.planning/REQUIREMENTS.md:46` is `- [ ] **CORE-11**` and this same file pins that state at `:9020` as `CORE11_BOX_EXPECTED = \"- [ ] **CORE-11**\"`. For a checkbox flipped early and reverted TWICE, a header asserting completion is what a reader and a later planner meet first, 8,100 lines before the assertion that contradicts it."
      - path: "packages/backend/src/store/observations.spec.ts"
        issue: "WR-39, CONFIRMED BY MY OWN SWEEP AND IT IS THE SAME DEFECT THE CORRECTION WAS WRITTEN TO FIX, ONE LAYER DOWN. `:1116-1119` states `THE DISCRIMINATOR, STATED AS AN ASSERTION: shape (2) SHRINKS and shape (3) does not`. It is an artifact of `jsessionid` being ten characters — the same length as `<redacted>`. Re-run with a 29-character name (`averylongsessionparametername`), the band is n=2000..2029, shape (3) SHRINKS at NINETEEN consecutive offsets (n=2001 delta -19 down to n=2019 delta -1) and shape (2) is delta -20, not -1. And the line the DISCRIMINATOR comment sits on, `expect(emptyValueCutTwice.length).toBe(emptyValueCut.length - 1);`, is BYTE-IDENTICAL to the assertion fourteen lines above it at `:1096` — it re-asserts an existing fact and cannot detect the disagreement its own comment says it watches for."
    missing:
      - "CR-14 + WR-43 + WR-38, and the CHEAPEST HONEST FIX IS TO DELETE THE SURFACE RATHER THAN GUARD IT. This file already applies a `pointer, not a bound` rule to `STATE.md` and `WINDOWS.md`. Apply it to itself: delete the header's residual prose at `:744-790` and the CORE-11 completion paragraph at `:908-916`, and replace both with pointers to the generated span between the sentinels and to `CORE11_BOX_EXPECTED`. A surface that carries no bound cannot carry a stale one. If any header prose must survive, then ALSO extend the `UNBOUNDED_QUANTIFIERS` and `BRANCH_VOCABULARY` scans to the file's own hand-written bytes and pin the hit count — but note that widening the scan makes the 20 occurrences I measured into 20 new obligations, which is why deleting is cheaper."
      - "CR-15 at the seam: route RECEIVER position through the same identification the CALLEE position already has. `isFetchExpression`, `isNavigatorReceiver`, `aliasedGlobalOf` and the dynamic-code resolver are reached when a bare global is the CALLEE; they are not reached when it is the RECEIVER of `.call`/`.apply`/`.bind`, nor when it is an ARGUMENT of `Reflect.apply`. One descent, six shapes, and the SDK twin already demonstrates the intended answer. Add all six executed shapes as failing-path fixtures plus the six reporting twins as controls, and give the surviving residue its own named silence row."
      - "CR-16 at the seam: apply `could not read does not mean clean` to a computed member on an identified `navigator` receiver, exactly as it is already applied to `sdk.requests`, `globalThis` and `window`. Add `navigator[m]` and the aliased `n[m]` as failing-path fixtures with the four reporting twins as controls."
      - "WR-39: state what the BRANCH does and let the delta fall out of it, rather than pinning a delta that is a property of the exemplar's parameter name. Replace the duplicated `emptyValueCutTwice` assertion with one that actually discriminates — that `nameCut`'s final `;` segment carries no `=` while `emptyValueCut`'s does, which is what selects the two branches — and sweep the disclosure across parameter-name length the way WR-28 taught this file to sweep across offset."
      - "Keep CORE-11 `[ ]`. Two of the eight clauses its own first sentence enumerates now carry code blindnesses that no residual row discloses. Waves 28 and 32 were right to hold it open and are right again."
      - "REDEFINE CORE-11's TERMINAL CONDITION BEFORE RUNNING ROUND 7, because the current one is unreachable and six rounds of evidence say so. `the gate can go red on every spelling of every enumerated clause` is not a condition any finite number of rounds satisfies — the space of JavaScript spellings for `invoke a function` is open. The reachable condition, and the one round 6 got two thirds of the way to, is: THE GATE'S REACH IS DERIVED FROM THE CODE, DRIFT BETWEEN TEXT AND CODE IS MECHANICALLY DETECTABLE, AND THE DISCLOSURE IS THE ONLY BOUND ON EVERY SURFACE A READER TOUCHES. Round 6 delivered derived + drift-detectable on the registry-owned surfaces and I proved all three legs of it. The third leg — every surface — is the deletion in the first bullet."
deferred: []
behavior_unverified_items: []
coincidental_reliance_items:
  - truth: "URL userinfo does not reach `observations.url`"
    reason: undeclared-precondition
    harden: "Carried forward from rounds 3, 4 and 5 unchanged and still correct. The `://` precondition is DECLARED at `schema.spec.ts:115-123` rather than assumed, but the guarantee still rests on `consumer.ts:195` handing over an absolute `rr.request.getUrl()`. Advisory, no score effect."
  - truth: "The derived residual states the whole bound on CORE-11"
    reason: undeclared-precondition
    harden: "CLOSED FROM ROUND 5 AND REOPENED ONE LEVEL UP, which is the exact motion this file keeps making. Round 5's entry was that nothing bound a `clause` to its branch; round 6 built that binding and I mutation-proved it row-granular, so that entry is discharged. What replaces it: the derived span is authoritative ONLY over the surfaces the guards scan, and the guards scan `RESOLVER_REGISTRY[].clause`. The precondition nobody declared is that no OTHER surface in the file states a bound — and 3,464 hand-written lines do, 20 times. Harden by deleting the header's residual prose, not by widening the scan."
  - truth: "The head-side truncation residual is disclosed accurately"
    reason: fixture-only
    harden: "WR-39, and I measured it. The disclosed discriminator `shape (2) SHRINKS and shape (3) does not` holds only because the fixture's parameter name `jsessionid` is ten characters, the same length as `<redacted>`. With a 29-character name shape (3) shrinks at nineteen consecutive offsets. The claim is established by the test's own fixture and the production path has no equivalent guarantee. Harden by sweeping across parameter-name length. Advisory, no score effect — the REDACTION is unaffected and I re-proved that with 3,612 fresh inputs."
prohibitions:
  - requirement_id: CORE-11
    statement: "No code that ships in the plugin issues an outbound network request in this phase — no `caido:http` fetch, no `sdk.requests.send` in any spelling, no method of an identified `requests` or `net` receiver outside a read-only allowlist, no global `fetch` by any receiver or alias, no `XMLHttpRequest`/`WebSocket`/`EventSource`, no `navigator.sendBeacon`, no dynamic code construction, and no speculative retrieval of any kind."
    verification: gate
    declared_status: open
    status: unverified
    flagged: true
    evidence: "FAIL-CLOSED for the sixth consecutive round, with the ledger agreeing for the second. THE MUST-NOT ITSELF HOLDS AND I RE-ESTABLISHED IT INDEPENDENTLY THIS ROUND rather than carrying the claim forward: a grep of both shipped source roots and the frontend for `fetch(`, `.send(`, `sendBeacon`, `XMLHttpRequest`, `new WebSocket`, `EventSource`, `eval(` and `new Function`, excluding spec files, returns ZERO HITS; the gate runs green over the real tree inside a 31-file / 1,345-test suite; `check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. GENUINELY CLOSED SINCE ROUND 5 AND CONFIRMED BY MY EXECUTION: the operator around a global receiver in BOTH call and initializer position (`const g = globalThis ?? self; g.fetch(url)` -> [\"outbound-fetch\"], all six header exemplars reporting), every logical-assignment binding, the conditional key initializer, and the nested destructure. STILL SILENT, EXECUTED BY ME THIS ROUND AND DISCLOSED BY NOTHING: `fetch.call(null, url)`, `fetch.apply(null, [url])`, `const g = fetch.bind(globalThis); g(url)`, `Reflect.apply(fetch, null, [url])`, `eval.call(null, src)`, `Function.call(null, src)`, `const f = fetch; f.call(null, url)` (with `f(url)` reporting), `const m = \"send\"+\"Beacon\"; navigator[m](u, d)` and its aliased twin — while twelve structural twins across SDK, `globalThis`, `window` and member-qualified `navigator` receivers all report. TWO of the eight clauses this requirement's own first sentence enumerates therefore carry a named blocking shape, and both are CODE rather than text. A `verification: gate` prohibition whose gate cannot go red on shapes its own statement enumerates is not verified — and the box correctly says `[ ]`."
  - requirement_id: STORE-03
    statement: "MUST NOT persist a query-string VALUE from a target-controlled URL into observations.url. Parameter names, path, scheme and host are retained; every value is replaced before the row is written."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "HOLDS, and I re-proved it on FRESH inputs rather than carrying round 5's forward, because WR-39 showed the disclosure was parameter-name-dependent. FIRST I verified the code did not move: `packages/backend/src/store/observations.ts` has changed by COMMENT ONLY since wave 26 — `git diff ec2ecd3..HEAD` on that file yields ZERO non-comment changed lines — so the redaction code is byte-identical and round 5's 16,160-input sweep still applies unchanged. THEN I swept anyway, across FOUR parameter-name lengths (1, 10, 29 and 60 characters) x 301 offsets x three grammars (head-side `;` parameter, query-tail, and userinfo-plus-token) = 3,612 inputs, each through both passes: ZERO occurrences of the secret in ANY of the 7,224 outputs and ZERO outputs over `URL_MAX`. The round-3 mutation proofs at both unit and live tiers stand and are still committed. WR-39 is a DISCLOSURE defect about which offsets are unstable and by how much — it is a warning against the fixture's comment, not against the prohibition, and the prohibition is stronger evidenced now than it was."
  - requirement_id: STORE-07
    statement: "MUST NOT render a caught exception into a persisted or logged string without passing it through describeError first."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "Carried forward from rounds 4 and 5, where I executed both directions myself through the shipped `error-redaction.spec.ts` `auditSource`: `flag ? e.message : \"none\"`, `e.message ?? \"none\"`, `e.message || \"none\"` and `flag && e.message` all report `unredacted-concat`, and every `describeError` twin stays quiet. Regression-checked this round inside the green 1,345-test suite. WR-40 and WR-42 (the SPREAD residual lists three shapes silent through three different mechanisms and omits four more in the same class, including the plainest spelling) are WARNINGS against that gate's own correction text, in the same class as WR-36 before them, not failures of the prohibition."
  - requirement_id: CORE-10
    statement: "MUST NOT present partial passive coverage as complete."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Carried forward unchanged and accepted by the operator at UAT test 3. Counter identifiers remain honest (`proxiedResponsesObserved`). Judgment-tier, autonomous run: NON-AUTHORITATIVE LLM-judge verdict, human review recommended."
  - requirement_id: STORE-01
    statement: "MUST NOT retain operator browsing evidence beyond what the analysis needs — no body bytes, headers, cookies, or column capable of holding a secret."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Carried forward from rounds 3, 4 and 5 substantially unchanged. The column-shape half is gated (PRAGMA-read allowlist + forbidden-name check). The 'capable of holding a secret' half is honestly bounded rather than contradicted: `observations.url` can still hold a path-embedded token and a retained parameter NAME, both named in the OPEN list, both pinned, the second kept BY POLICY under the operator's 2026-08-21 UAT decision. Judgment-tier: NON-AUTHORITATIVE, human review recommended."
---

# Phase 1: Skeleton, Persistence, Compatibility — Verification Report

**Phase Goal:** A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Verified:** 2026-08-24T21:20:00Z
**Status:** gaps_found
**Re-verification:** Yes — verification pass 7, after gap-closure ROUND 6 (plans 01-29 … 01-32)

---

## The question I was actually asked, answered first

I was asked whether round 6 leaves an equivalent to round 5's one-sentence diagnosis, or whether the pattern is that each structural fix reveals another unscanned surface indefinitely. **The honest answer is that it is neither, and the reason it is neither is the most useful thing in this report: round 6's three blockers are not one class. They are two, and the two need opposite decisions.**

**One sentence for the closeable half.** Round 6's mechanism works — I proved it with a harder mutation than round 6 itself ran — but every guard it built reads `RESOLVER_REGISTRY[].clause` and nothing else, so the 3,464 hand-written lines a reader reaches first still carry 20 declared-phrasing universals that raise no obligation at all, and CR-14 and WR-38 both live there.

**And one sentence for the half no sentence closes.** CR-15 and CR-16 are not that defect: they are the gate's REACH, they falsify two clauses CORE-11's own first sentence enumerates, they are disclosed by none of the 16 measured silences, and no scanning mechanism ever closes their class — six rounds have each closed about two code blindnesses and each found about two more.

Those two need opposite responses, and conflating them is what would make round 7 feel like round 6 felt like round 5.

- **CR-14 / WR-38 / WR-43 are FINITE and I measured the whole of them.** 20 occurrences across 3,464 lines. The fix is not to widen the scan — that converts 20 stale sentences into 20 new obligations. The fix is to **delete the surface**: this file already applies a *pointer, not a bound* rule to `STATE.md` and `WINDOWS.md`, and applying it to the file's own header removes the class rather than guarding it. That is one bounded change and it will not recur, because prose that states no bound cannot state a stale one.
- **CR-15 / CR-16 are NOT finite and pretending otherwise is what has cost six rounds.** The space of JavaScript spellings for *invoke a function through a value* is open. Round 7 can close `.call`/`.apply`/`.bind`/`Reflect.apply` and the navigator computed member — both are one descent each, and both already have working twins in the file — and round 8 will find two more. That is not a failure of any round. It is what the current terminal condition demands and no round can supply.

**So the recommendation is neither "run round 7 as before" nor "ship as-is".** It is: **change what CORE-11's `[x]` is allowed to mean, then run one more round against the new condition.** The current condition — *the gate can go red on every spelling of every enumerated clause* — is unreachable, and six rounds of flat find-rate are the evidence. The reachable condition, which round 6 got two thirds of the way to and which I verified all three legs of, is:

> **The gate's reach is DERIVED from the code, DRIFT between text and code is MECHANICALLY DETECTABLE, and the disclosure is the ONLY bound stated on EVERY surface a reader touches.**

Round 6 delivered derived and drift-detectable over the registry-owned surfaces. The missing third leg is exactly the deletion above. Under that condition CORE-11 could honestly close in one round — not because nothing is missed, but because **what is missed sits on a list nobody can silently edit**, which is the only promise a static gate over an open language can actually keep.

**If the operator ships now with CORE-11 open, that is defensible and I would sign it.** Nothing leaks and I established that independently this round rather than carrying it forward: zero outbound-shaped tokens in any shipped non-spec source across both roots and the frontend, the shipped bundle's entire import set is one specifier (`crypto`), the box is `[ ]`, and the residual is derived and byte-pinned into the ledger at sha256 `f850802f…`. **What must go into the disclosure if you ship is CR-15 by name** — `fetch.call(null, url)` is the plainest spelling in the whole finding set, and a reader of the residual today would not learn it is silent.

## What round 6 genuinely delivered, executed rather than read

I ran three separate mutations. All three produced different red states and each named what broke. **This is not ceremony and I am recording that as credit before anything else.**

### The branch seam — round 5's diagnosis, closed, and I proved it harder than round 6 did

Round 5's one-sentence diagnosis was: *nothing binds a `clause` to the branch it describes*. Round 6 built `BRANCH_VOCABULARY` plus one probe per named branch. Round 6's own acceptance test was deleting the `PlusEqualsToken` branch. **I ran the version that defeats an anchor-line guard instead:** I left the branch's condition and its anchor line byte-identical and neutered only its effect —

```
      assembledNames.add(node.left.text);   ->   void 0;
```

— so nothing textual moved and only behaviour changed. The suite went **red in three places**, one of them row-granular and self-naming:

```
× branch assembledNames / a `+=` compound assignment /
  auditSource > collect > node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken &&
  — its probe is executed against auditSource
Tests  3 failed | 404 passed (407)
```

Restored, green. **The identical mutation left round 5's derived block at 52 passed, 0 failed.** That is a real seam and it is the largest deliverable of the round.

### The coverage guard — I injected against it myself

An unregistered resolver declared at `auditSource`'s own indentation turns **both** coverage-guard cases red:

```
× BOTH resolver populations enumerate a NON-EMPTY set — non-vacuity, asserted BEFORE the rule
× every member of BOTH populations is a registry row OR a named, reasoned exemption
Tests  2 failed | 405 passed (407)
```

Restored, green. I also found — by accident, injecting at module scope first — that the population scan feeds the site anchors into the generated span, so a resolver added at the wrong scope diverges the byte comparison instead. Both failure modes are detections. Neither is silent.

### The pins

- **`FALSIFIED_HANDOFFS` is genuinely at zero and its pin is `.toBe(0)`**, not a `toBeGreaterThan`. Six entries opened by wave 29, discharged two-by-two by waves 30/31/32, each in the same commit as its widening. The docblock states why a pin a later wave must delete is worse than none.
- **`CORE11_BOX_EXPECTED` pins by PREFIX** — `row.startsWith("- [ ] **CORE-11**")` — which is the flip WR-34 found the old `[ x]` character class could not see. I read the ledger row myself: `.planning/REQUIREMENTS.md:46` is `- [ ]`. Pin and ledger agree.
- **Both derived spans are byte-identical**, re-hashed by me: 510 lines strictly between the sentinels, both sha256 `f850802f402eabb23e6b044f3b65ae819ebdc75d57aecc89de444e7c433157fe`. The span grew 295 → 510 lines and 38 → 44 rows without losing the binding.

## CR-14 — confirmed, and the surface limit is the real finding

The header at `:760-772` still says, present tense, that an operator around a global receiver `IS STILL SILENT in every spelling`, names six exemplars, asserts they `all report []`, says it is `Pinned by a fixture titled as a MEASURED SILENCE`, and `:779` lists it as `OPEN AND UNOWNED, no plan in this phase claims it`.

I executed all six:

```
["outbound-fetch"]          (ok && globalThis).fetch(url)
["outbound-fetch"]          (g ?? globalThis)["fetch"](url)
["outbound-fetch"]          (b ? globalThis : x).fetch(url)
["outbound-beacon"]         (b ? navigator : x).sendBeacon(u, d)
["outbound-fetch"]          (b ? fetch : x)(url)
["outbound-dynamic-code"]   (b ? eval : x)(src)
```

**Six of six.** The fixture `:772` points at is titled `CLOSED (CR-11)` at `:7748`. Wave 32 removed the registry ROW carrying this universal and asserted its non-return; the header copy was left standing.

**The mechanism cannot see it, and I read the reason rather than inferring it.** The quantifier scan is literally:

```ts
const hits = RESOLVER_REGISTRY.flatMap((row) =>
  UNBOUNDED_QUANTIFIERS.filter((q) => row.clause.includes(q)).map(...));
```

`BRANCH_VOCABULARY`'s scan is the same shape over the same field. **I measured the unscanned surface myself:** excluding the 510-line generated span, the hand-written region ahead of `RESOLVER_REGISTRY` is **3,464 lines** and carries the declared phrasings **20 times** — `anywhere in the file` ×6, `any depth` ×6, `ANY-BINDING-WINS` ×4, `ANY of them` ×2, `every literal` ×1, `every spelling` ×1. Zero obligations raised. The guard's docblock states the *phrase-list* limit explicitly and never states the *surface* limit — and the surface limit is where this round's text blocker lives.

## CR-15 — confirmed, and it is the sharpest finding of the round

A bare global in RECEIVER rather than CALLEE position is silent family-wide. **Executed by me:**

```
[]                    fetch.call(null, url)
[]                    fetch.apply(null, [url])
[]                    const g = fetch.bind(globalThis); g(url)
[]                    Reflect.apply(fetch, null, [url])
[]                    eval.call(null, src)
[]                    Function.call(null, src)
[]                    const f = fetch; f.call(null, url)      <- f IS in fetchAliases
["outbound-fetch"]    const f = fetch; f(url)                 <- same f, CALLEE position
```

That last pair is the whole finding in two lines: the **same identified alias**, reporting as a callee and silent as a receiver. It is a resolver gap, not an AST gap — and every structural twin proves the machinery exists:

```
["outbound-send"]     sdk.requests.send.call(sdk.requests, req)
["outbound-send"]     const g = sdk.requests.send.bind(sdk.requests); g(req)
["outbound-send"]     Reflect.apply(sdk.requests.send, sdk.requests, [req])
["outbound-fetch"]    globalThis.fetch.call(null, url)
["outbound-fetch"]    const g = globalThis.fetch.bind(globalThis); g(url)
["outbound-beacon"]   navigator.sendBeacon.call(navigator, u, d)
```

CORE-11's own sentence says **no global `fetch` by ANY RECEIVER or alias**. `fetch.call` is a global fetch by a receiver. **This is why I rate it the sharpest: of every shape found in seven review passes, `fetch.call(null, url)` is the one somebody would most plausibly write by accident.** I searched the 510-line derived span for `.call`, `.apply`, `.bind` and `Reflect` — **zero occurrences of each**. None of the 16 measured silences names it.

## CR-16 — confirmed, and it is WR-19's asymmetry surviving on one family

```
[]                          const m = "send" + "Beacon"; navigator[m](u, d)
[]                          const n = navigator; const m = "send"+"Beacon"; n[m](u, d)
["outbound-unanalysable"]   const m = "se" + "nd";      sdk.requests[m](req)
["outbound-unanalysable"]   const m = "fet" + "ch";     globalThis[m](url)
["outbound-unanalysable"]   const m = "fet" + "ch";     window[m](url)
["outbound-unanalysable"]   const k = "send"+"Beacon"; const { [k]: b } = navigator; b(u,d)
["outbound-beacon"]         navigator.sendBeacon(u, d)                      <- direct control
```

The receiver is positively identified and the unreadable member is **dropped** rather than reported. That is the *could not read does not mean clean* rule — closed twice before, in waves 12 and 16 — surviving on exactly one receiver family. It falsifies the enumerated clause `no navigator.sendBeacon`. Not in the span (`navigator[` — zero occurrences), not in any silence row.

## WR-38 — confirmed by reading, and it is the dangerous direction

`:908-916` reads *"CORE-11 IS NOW MARKED COMPLETE IN `REQUIREMENTS.md`"*. `.planning/REQUIREMENTS.md:46` is `- [ ] **CORE-11**`. `:9020` in the same file is `const CORE11_BOX_EXPECTED = "- [ ] **CORE-11**";`. **The file contradicts itself across 8,100 lines, and the wrong half is the half a reader meets first.** For a box flipped early and reverted twice, that is the more dangerous of the two stale directions.

## WR-39 — confirmed by execution, and it is the same defect one layer down

The block at `:1116-1119` states *"THE DISCRIMINATOR, STATED AS AN ASSERTION: shape (2) SHRINKS and shape (3) does not."* **I re-ran the sweep with a 29-character parameter name and it is a fixture artifact:**

```
name = "averylongsessionparametername" (29 chars)
2000 SHAPE2(empty-value)  ";averylongsessionparametername="   delta -20
2001 SHAPE3(name)         ";averylongsessionparametername"    delta -19
2002 SHAPE3(name)         ";averylongsessionparameternam"     delta -18
  …  nineteen consecutive offsets shrinking …
2019 SHAPE3(name)         ";averylongse"                      delta  -1
2020 SHAPE3(name)         ";averylongs"                       delta   0

control, name = "jsessionid" (10 chars, == len("<redacted>")):
2019 SHAPE2 delta -1 | 2020..2029 SHAPE3 delta 0     <- 11 unstable, all deltas 0
```

Shape (3) shrinks by up to **19 bytes** and shape (2) is **−20**, not −1. And I confirmed the second half by reading: the line the DISCRIMINATOR comment sits on, `expect(emptyValueCutTwice.length).toBe(emptyValueCut.length - 1);`, is **byte-identical** to `:1096` fourteen lines above. It re-asserts a fact already asserted and cannot detect the disagreement its own comment says it watches for.

**This is a disclosure defect, not a redaction defect, and I proved the distinction rather than asserting it** — see truth 8.

## Is CORE-11's `[ ]` correct? Yes — and it is now correct for a stronger reason than round 5's

Round 5's blocking shapes were a mix of text and code. **Round 6's blocking shapes are two CODE blindnesses on two separately enumerated clauses**, disclosed by none of the 16 measured silences:

| Enumerated clause | Blocking shape | Executed answer |
|---|---|---|
| `no global fetch by ANY RECEIVER or alias` | `fetch.call(null, url)`, and `const f = fetch; f.call(null, url)` | `[]` — while `f(url)` reports |
| `no navigator.sendBeacon` | `const m = "send"+"Beacon"; navigator[m](u,d)` | `[]` — while every other receiver reports |

This phase's own rule, applied seven times and applied correctly by waves 18, 23, 28 and 32: **a `verification: gate` requirement is not complete while its gate stays green on a shape the prohibition's own statement enumerates.** Both rows above are exactly that. `[ ]` is correct, and the pin at `:9020` now enforces it.

## On severity, stated the same way it has been every round

**Nothing leaks, and this round I re-established that independently rather than carrying it forward.** I grepped both shipped source roots and the frontend for `fetch(`, `.send(`, `sendBeacon`, `XMLHttpRequest`, `new WebSocket`, `EventSource`, `eval(` and `new Function`, excluding spec files: **zero hits**. The gate runs green over the real tree inside a **1,345**-test suite. `check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. Zero debt markers, zero skipped tests, zero `.only`. Every finding here is a **prospective** blindness in a test-only gate.

**The blocker is not a leak. It is that two clauses of the requirement's own enumeration are unenforced and undisclosed, and that the mechanism built to make disclosure trustworthy does not read the surface a reader reads first.**

## Goal Achievement

**All seven ROADMAP Success Criteria hold and none regressed under round 6. The phase GOAL is achieved. UAT gap 2 is not closed.** Those stay separate, as they have every round.

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `onInterceptResponse` is non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `hooks/passive.ts:120` is `export function onResponse(`, not async; registered at `index.ts:322-323`. Regression-checked this round. |
| 2 | The work queue is bounded and its overflow count is visible | ✓ VERIFIED | `packages/engine/src/queue.ts:96` exposes `overflowCount` as a getter a take does not reset (`:81`); `index.ts:130` surfaces `queueOverflowCount` on `getStatus()`. Asserted in the green suite. |
| 3 | Browsing a 200-chunk SPA leaves UI and RPC responsive, max sync slice under the Phase 0 threshold | ✓ VERIFIED | `results/spa-load.json` re-read this round: `max_slice_ms 0.029` against a 25 ms budget, gated by `tests/phase1-load.spec.ts` in the green suite. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `spa-load.json.restart` re-read this round: `identical: true`, `plugin_reattached: true`, `user_version` 2 before and after, 200 artifacts / 200 observations / 200 distinct digests, `schema_changed: false`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; a non-UTF-8 fixture round-trips | ✓ VERIFIED | `ingest/consumer.ts:189` `const raw = body.toRaw()`; the `toText()` AST gate in `hooks/admit.spec.ts` passes and is fixture-proven. |
| 6 | A CI gate fails the build if the backend bundle imports any specifier outside the measured allowlist | ✓ VERIFIED | **Re-executed:** `node scripts/ci/check-bundle-imports.mjs` → `packages/backend/dist/index.js: 1 import specifier(s): crypto`, exit 0. |
| 7 | A Caido build below the declared minimum produces a clear message | ✓ VERIFIED | `MIN_CAIDO = "0.57.1"` at `compat.ts:43`; refusal messages at `:332/:352/:363` naming both versions. Proven against the real 0.55.3 binary in `compat-smoke.json` leg C. |
| 8 | **[UAT gap 1]** `observations.url` does not persist query-string values verbatim | ✓ VERIFIED — holds, and on **fresh** inputs | First I verified the code did not move: `observations.ts` changed by **comment only** since wave 26 (`git diff ec2ecd3..HEAD` → **0** non-comment changed lines), so round 5's 16,160-input sweep still applies. Then I swept anyway across **4 parameter-name lengths × 301 offsets × 3 grammars = 3,612 inputs / 7,224 outputs**: **zero leaks, zero over-`URL_MAX`**. WR-39 is a defect in the *disclosure* of which offsets are unstable, not in the redaction. |
| 9 | **[UAT gap 2]** No shipped code can introduce outbound traffic without failing a gate | ✗ FAILED (partial) | CR-11, CR-12, CR-13, WR-32, WR-33, WR-34 and WR-37 all closed and re-verified by me, three of them by mutation. CR-14, CR-15, CR-16 open, all three executed. `fetch.call(null, url)` → `[]`; `const f = fetch; f.call(null, url)` → `[]` while `f(url)` → `["outbound-fetch"]`; `const m = "send"+"Beacon"; navigator[m](u,d)` → `[]`; and the header's six "silent in every spelling" exemplars all report. **Two of the eight enumerated clauses carry a named blocking shape, and both are CODE.** |

**Score:** 8/9 truths verified (0 present, behavior-unverified)

**8/9 for the fifth round running, and for the fifth time the failing truth fails for new causes.** Round 2: five gate blindnesses. Round 3: CR-08's assembled key. Round 4: the false read bound, the stale literal, the conditional receiver. Round 5: a conditional initializer, a logical-assignment binding, an operator around a global receiver. Round 6: a stale universal on an unscanned surface, a bare global in receiver position, an unreadable member on `navigator`. **Every one of the previous four sets is genuinely closed.** What changed this round is that the causes stopped being one class.

### What round 6 genuinely delivered

| Deliverable | Status | What I executed or re-derived |
|---|---|---|
| CR-11, both halves | ✓ CLOSED | All six header exemplars report; the initializer half (`const g = globalThis ?? self`) reports. `operatorOperandMatching` is one descent reached from six global resolvers; `bareFetchCallee` added for the bare-call rule's inline question. The ROW was removed and its return is asserted. |
| CR-12, logical assignment | ✓ CLOSED at the seam | `collect`'s alias branch reads `ASSIGNING_OPERATORS`. The surviving member-target residue has its own named silence row. |
| CR-13, conditional key initializer | ✓ CLOSED at the seam | `operatorLiteralBinding` performs the descent `keyReceiver` already had. Both QUANTIFIED_CLAUSES entries keep the universal marked STILL FALSE with the four remaining silent shapes named. |
| WR-32 — **round 5's own diagnosis** | ✓ CLOSED, and I proved it with a HARDER mutation | Effect neutered with condition and anchor intact → **3 failed / 404 passed**, one row-granular and self-naming. The same mutation left round 5's block at 52/52 green. |
| The coverage guard | ✓ REAL, injection-proved by me | Unregistered resolver at `auditSource` indentation → **both** guard cases red, 2 failed / 405 passed. |
| WR-34, the checkbox pin | ✓ CLOSED | `CORE11_BOX_EXPECTED` pins by prefix; failure message names both reverts. Ledger row read and agrees. |
| `FALSIFIED_HANDOFFS` | ✓ DRAINED TO ZERO with an equality pin | Array empty, assertion `.toBe(0)`. Six discharged two-by-two, each with its widening. |
| WR-37 + 5 siblings | ✓ CLOSED one level, siblings MEASURED and NAMED | Measured silences grew 7 → 16. That is the honest direction. |
| Derived spans | ✓ STILL BOUND, re-hashed by me | 510 lines, both `f850802f…`, 44 rows. Grew from 295/38 without losing the binding. |
| Requirement ledger integrity | ✓ VERIFIED mechanically over all 32 plans | 23/23 ids claimed; every plan id resolves; **no orphans**; 22 `[x]`, CORE-11 `[ ]`. |
| The **surface** the mechanism scans | ✗ ONE TOO FEW | Guards read `RESOLVER_REGISTRY[].clause` only. 3,464 hand-written lines, 20 declared phrasings, 0 obligations. |
| The gate's **reach** | ✗ TWO NEW CODE BLINDNESSES | `fetch.call` family; `navigator[m]`. Both on enumerated clauses, both undisclosed. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/backend/src/store/observations.ts` | Write-path URL redaction, all grammars | ✓ VERIFIED | **Comment-only diff since wave 26 — 0 non-comment changed lines**, so the redaction code is byte-identical. Wired into `recordObservation`, data flowing from `consumer.ts:446`. Zero leaks across my 3,612 fresh inputs. |
| `packages/backend/src/store/observations.spec.ts` | Fixtures that can fail | ⚠️ PARTIAL | The swept assertions and `BARE_CREDENTIAL_SHAPES` mutation proofs stand. `:1116-1119`'s DISCRIMINATOR claim is a fixture artifact of a ten-character parameter name (WR-39, executed) and its assertion line duplicates `:1096` byte for byte. |
| `packages/backend/src/store/schema.spec.ts` | Per-grammar claim with a complete OPEN list | ⚠️ PARTIAL | Carries the same WR-39 discriminator claim at `:294-299`. The swept 11-offset disclosure itself remains accurate for `jsessionid`. |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 gate over both shipped roots | ⚠️ PARTIAL | 9,108 lines, both roots, by-name non-vacuity, 44-row registry, byte-checked ledger, per-branch probes and a coverage guard I both mutation-proved and injection-proved. **What keeps it PARTIAL:** the hand-written header declares six live-reporting spellings silent and CORE-11 complete; the guards never scan that header; and `fetch.call`/`.apply`/`.bind`/`Reflect.apply` on a bare global, plus a computed member on an identified `navigator`, are silent and disclosed nowhere. |
| `packages/backend/src/store/error-redaction.spec.ts` | STORE-07 gate | ✓ VERIFIED | Executed both directions in round 4, regression-checked in the green suite. WR-40/WR-42 (the spread residual names one mechanism for three shapes and omits four siblings) are warnings on the disclosure, not the prohibition. |
| `tests/pins.spec.ts` | The WR-21 gate the tracer claimed | ✓ VERIFIED | Four fixtures execute both directions; the load-bearing one plants the literal into the real file's bytes. |
| `scripts/ci/check-bundle-imports.mjs` | DIST-05 bundle allowlist gate | ✓ VERIFIED | Re-executed: 1 specifier, `crypto`, exit 0. |
| `scripts/phase1/tracer-e2e.sh` | Live end-to-end proof against the DB file | ✓ VERIFIED | Six grammars, two padded dyes under both spellings. |
| `packages/backend/src/compat.ts` | COMPAT-01/02 refusal | ✓ VERIFIED | `MIN_CAIDO` + three distinct messages, proven on a real 0.55.3 binary. |
| `.planning/REQUIREMENTS.md` | Honest ledger | ⚠️ PARTIAL — **holding at round 5's improved state** | CORE-11 `[ ]` with blocking rows named, now pinned by a constant that can see the box. Machine-owned span byte-bound to the registry (510 lines, `f850802f…`). **What keeps it PARTIAL:** the span's 16 measured silences name neither CR-15's nor CR-16's shape, so a reader of the authoritative residual would not learn that `fetch.call(null, url)` is silent. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `hooks/passive.ts` | `engine/queue.ts` | `offer()` from a non-async handler | ✓ WIRED | Regression-checked; unchanged. |
| `ingest/consumer.ts:446` | `store/observations.ts` | `recordObservation(...)` with `got.url` | ✓ WIRED | Real data path; `got.url` from `rr.request.getUrl()` at `:195`. |
| `store/observations.ts` | SQLite `observations.url` | `normaliseObservedUrl(url)` inside the INSERT parameters | ✓ WIRED | Settled against the real database file by the committed clean and mutation runs. |
| `outbound-prohibition.spec.ts` | `packages/engine/src` | `SOURCE_ROOTS[1]` + by-name non-vacuity | ✓ WIRED | Both roots, zero violations on the real tree. |
| `RESOLVER_REGISTRY` | `.planning/REQUIREMENTS.md` span | `deriveResidual` → `extractDerivedBlock` → byte equality | ✓ WIRED | Re-hashed by me: 510 lines, both `f850802f…`. |
| `RESOLVER_REGISTRY.clause` | the walk's branches | `BRANCH_VOCABULARY` + one probe per named branch | ✓ **NOW WIRED** — round 5's gap, closed | Mutation-proved by me at ROW granularity with the effect-only mutation that defeats an anchor guard. |
| resolver population | `RESOLVER_REGISTRY` ∪ `RESOLVER_EXEMPTIONS` | coverage guard over two enumerated populations | ✓ WIRED | Injection-proved by me: both guard cases red. |
| `CORE11_BOX_EXPECTED` | CORE-11's checkbox STATE | `row.startsWith("- [ ] **CORE-11**")` | ✓ **NOW WIRED** — WR-34 closed | Prefix pin, not the two-state character class. Ledger row read and agrees. |
| `UNBOUNDED_QUANTIFIERS` / `BRANCH_VOCABULARY` | the file's hand-written header | *(nothing)* | ✗ **NOT WIRED** | Both scans are `RESOLVER_REGISTRY.flatMap(... row.clause ...)`. 3,464 hand-written lines, 20 declared phrasings, 0 obligations. This is CR-14's mechanism. |
| bare global in RECEIVER position | `isFetchExpression` / `isNavigatorReceiver` / dynamic-code resolver | *(nothing)* | ✗ **NOT WIRED** | Reached in CALLEE position only. `const f = fetch; f(url)` reports; `f.call(null, url)` does not. This is CR-15. |
| identified `navigator` receiver | the unreadable-member rule | *(nothing)* | ✗ **NOT WIRED** | `sdk.requests[m]`, `globalThis[m]`, `window[m]` all report `outbound-unanalysable`; `navigator[m]` does not. This is CR-16. |
| `index.ts:130` | `engine/queue.ts:96` | `queue.overflowCount` → `getStatus().queueOverflowCount` | ✓ WIRED | RPC-visible. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `observations.url` | `url` | `rr.request.getUrl()` → `normaliseObservedUrl` | ✓ read back with `sqlite3 -readonly` from outside Caido; 3,612 fresh inputs leak-free this round | ✓ FLOWING, redacted per policy |
| `getStatus().queueOverflowCount` | `queue.overflowCount` | live `BoundedQueue` instance | ✓ | ✓ FLOWING |
| `spa-load.json.max_slice_ms` | measured slice | live 200-chunk run | ✓ 0.029 ms vs 25 ms budget | ✓ FLOWING |
| `check-bundle-imports` specifier set | parsed `dist/index.js` | real built bundle | ✓ 1 specifier | ✓ FLOWING |
| `spa-load.json.restart` digests | live SQLite file, before and after | real Caido restart | ✓ 200/200 distinct, `schema_changed: false` | ✓ FLOWING |
| `REQUIREMENTS.md` derived span | `deriveResidual(RESOLVER_REGISTRY)` | the registry object, in-process | ✓ byte-identical, sha256 re-computed by me | ✓ FLOWING |
| registry `clause` text | per-branch probes | `BRANCH_VOCABULARY` → `auditSource` | ✓ mutation-proved red at row granularity | ✓ **FLOWING** — was ⚠️ STATIC in round 5 |
| the header's residual prose | *(none)* | hand-authored, never scanned | ✗ no guard reads it; 20 declared universals raise 0 obligations | ⚠️ STATIC — **the round's one remaining disconnected surface** |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full suite green | `pnpm test` (run ONCE) | 31 files, **1345 tests passed**, exit 0 | ✓ PASS |
| Typecheck | `pnpm run typecheck` (`tsc --build`) | exit 0 | ✓ PASS |
| Prior-phase regression gate | `vitest run tests/{go-no-go,spike-results,pins}.spec.ts` | 3 files, **80 tests**, exit 0 | ✓ PASS |
| Bundle import gate | `node scripts/ci/check-bundle-imports.mjs` | `1 import specifier(s): crypto`, exit 0 | ✓ PASS |
| No outbound call in shipped source | grep both roots + frontend for 8 outbound tokens, excluding specs | **zero hits** | ✓ PASS |
| Debt-marker scan | `grep -rnE "TBD\|FIXME\|XXX\|HACK"` over both roots | zero | ✓ PASS |
| Disabled-test scan | `grep -rnE "(it\|describe\|test)\.(skip\|only\|todo)"` | zero | ✓ PASS |
| Derived spans byte-identical | in-process span extraction + sha256 | **510 lines, both `f850802f402eabb2…`** | ✓ PASS |
| **Branch seam**, harder mutation than round 6 ran | `assembledNames.add(...)` → `void 0`, condition + anchor intact; run; restore | **3 failed / 404 passed**, one row-granular and self-naming; restored green | ✓ PASS |
| **Coverage guard**, injection | unregistered resolver at `auditSource` indentation; run; restore | **both** guard cases red, 2 failed / 405 passed; restored green | ✓ PASS |
| `FALSIFIED_HANDOFFS` at zero with an equality pin | read array + assertion | empty, `.toBe(0)` | ✓ PASS |
| `CORE11_BOX_EXPECTED` sees the box | read pin + ledger row | prefix pin `- [ ] **CORE-11**`; ledger `:46` agrees | ✓ PASS |
| Ledger integrity over 32 plans | mechanical id cross-reference | 23/23 claimed, 0 unresolved, **0 orphans**, 22 `[x]` + CORE-11 `[ ]` | ✓ PASS |
| STORE-03 leak sweep, **fresh** inputs | 4 name lengths × 301 offsets × 3 grammars, both passes | **3,612 inputs / 7,224 outputs, 0 leaks, 0 over-`URL_MAX`** | ✓ PASS |
| `observations.ts` unchanged in code | `git diff ec2ecd3..HEAD`, non-comment lines | **0** | ✓ PASS |
| **CR-14**, 6 header exemplars | throwaway spec importing `auditSource` | **6 of 6 report** against a header saying all six are silent | ✗ FAIL (blocker) |
| **CR-14 mechanism (WR-43)**, surface measurement | count declared phrasings in the 3,464 hand-written lines | **20 occurrences, 0 obligations** | ✗ FAIL (blocker) |
| **CR-15**, 7 shapes + 7 controls/twins | same probe | all 7 silent; **all 7 twins report**, incl. the same alias in callee position | ✗ FAIL (blocker) |
| **CR-16**, 2 shapes + 5 twins | same probe | both silent; all 5 twins report | ✗ FAIL (blocker) |
| **WR-38**, header vs pin vs ledger | read `:908-916`, `:9020`, `REQUIREMENTS.md:46` | header says COMPLETE; pin and ledger say `- [ ]` | ✗ FAIL (warning) |
| **WR-39**, 29-char parameter name sweep | 51 offsets, both passes, with a `jsessionid` control | shape (3) shrinks at **19** consecutive offsets to **−19**; shape (2) is **−20** | ✗ FAIL (warning) |
| **WR-39 (b)**, duplicated assertion | read `:1096` vs `:1119` | **byte-identical** | ✗ FAIL (warning) |

### Probe Execution

| Probe | Command | Result | Status |
|---|---|---|---|
| `scripts/ci/check-bundle-imports.mjs` | `node scripts/ci/check-bundle-imports.mjs` | exit 0, 1 specifier (`crypto`) | PASS |
| Phase 0 baseline gate | `vitest run tests/{go-no-go,spike-results,pins}.spec.ts` | exit 0, 3 files / 80 tests | PASS |
| Full workspace suite | `pnpm test` | exit 0, 31 files / 1345 tests | PASS |

No `scripts/*/tests/probe-*.sh` files exist in this tree; the phase's runnable gates are the vitest suite and the two node/CI scripts above, all executed in this session.

### Requirements Coverage

| Requirement | Source Plan(s) | Status | Evidence |
|---|---|---|---|
| CORE-01 | 01-01 … | ✓ SATISFIED | Truth 1. `passive.ts:120` non-async, registered at `index.ts:322`. |
| CORE-02 | 01-01, 01-02 | ✓ SATISFIED | Admission gates asserted in `hooks/admit.spec.ts`, green. |
| CORE-03 | 01-02 | ✓ SATISFIED | Truth 2. Bounded queue + visible `overflowCount`. |
| CORE-04 | 01-02, 01-03 | ✓ SATISFIED | Single consumer, concurrency 1, asserted in the green suite. |
| CORE-05 | 01-03 | ✓ SATISFIED | `consumer.ts` reloads via `sdk.requests.get(id)`. |
| CORE-06 | 01-03 | ✓ SATISFIED | 64 KB / 4 KB chunking with temporal yield, asserted. |
| CORE-07 | 01-03 | ✓ SATISFIED | Wall-clock deadline between chunks, degrades to partial. |
| CORE-08 | 01-04 | ✓ SATISFIED | Truth 4 — 200 distinct digests, content hashed once. |
| CORE-09 | 01-04, 01-05 | ✓ SATISFIED | Project-switch cancellation asserted. |
| CORE-10 | 01-05, 01-06 | ✓ SATISFIED | Truth 3 — `max_slice_ms 0.029` from a live run. Prohibition flagged judgment-tier. |
| **CORE-11** | 01-10, 01-12, 01-16, 01-18, 01-19, 01-23, 01-28, 01-29 … 01-32 | ✗ **BLOCKED** | Truth 9. Box `[ ]`, correctly, and now pinned by a constant that can see it. **Two** enumerated clauses carry a named blocking shape, both CODE: `no global fetch by any receiver` (CR-15) and `no navigator.sendBeacon` (CR-16). |
| STORE-01 | 01-04 | ✓ SATISFIED | Schema via `sdk.meta.db()`. Prohibition flagged judgment-tier. |
| STORE-02 | 01-04 | ✓ SATISFIED | Truth 4 — `project_id` in every key. |
| STORE-03 | 01-04, 01-10, 01-20 | ✓ SATISFIED | Truth 8 — content-addressed by digest; redaction re-proved over 3,612 fresh inputs. |
| STORE-04 | 01-04 | ✓ SATISFIED | Corpus version on analysis rows. |
| STORE-05 | 01-04, 01-05 | ✓ SATISFIED | Truth 4 — `user_version` 2 across a real restart. |
| STORE-06 | 01-05 | ✓ SATISFIED | Retention policy asserted. |
| STORE-07 | 01-05, 01-16, 01-21 | ✓ SATISFIED | Positional `?` gate + `describeError` gate, both mutation-proven. |
| COMPAT-01 | 01-06, 01-07 | ✓ SATISFIED | Truth 7 — `MIN_CAIDO`, three messages, real 0.55.3 binary. |
| COMPAT-02 | 01-07 | ✓ SATISFIED | Smoke test against the current release, `compat-smoke.json`. |
| ENC-01 | 01-03, 01-08 | ✓ SATISFIED | Truth 5 — `toRaw()` at `consumer.ts:189`, `toText()` AST gate green. |
| DIST-05 | 01-08, 01-09 | ✓ SATISFIED | Truth 6 — re-executed, 1 specifier. |
| DIST-06 | 01-09 | ✓ SATISFIED | `tests/pins.spec.ts`, the exact-pin traps asserted. |

**Orphan check, re-run mechanically over all 32 plans:** all 23 phase ids are claimed by at least one plan; every id named in any plan resolves in `REQUIREMENTS.md`; 22 boxes `[x]` and CORE-11 `[ ]`. **NO ORPHANS.**

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `outbound-prohibition.spec.ts` | `:760-772`, `:779` | Header declares six live-reporting spellings `STILL SILENT in every spelling`, `Pinned by a fixture titled as a MEASURED SILENCE` (that fixture is now titled `CLOSED (CR-11)`), and `OPEN AND UNOWNED` for a shape wave 32 closed | 🛑 Blocker | CR-14 |
| `outbound-prohibition.spec.ts` | `UNBOUNDED_QUANTIFIERS` / `BRANCH_VOCABULARY` scans | Both read `RESOLVER_REGISTRY[].clause` and nothing else; 3,464 hand-written lines carry 20 declared phrasings and raise 0 obligations; the docblock states the phrase-list limit and never the surface limit | 🛑 Blocker | WR-43 (mechanism of CR-14) |
| `outbound-prohibition.spec.ts` | global receiver resolution | A bare global in RECEIVER position is silent family-wide, including through a positively identified alias, while every structural twin reports | 🛑 Blocker | CR-15 |
| `outbound-prohibition.spec.ts` | `navigator` member resolution | `could not read does not mean clean` applied to every receiver family except `navigator` | 🛑 Blocker | CR-16 |
| `outbound-prohibition.spec.ts` | `:908-916` | Header asserts `CORE-11 IS NOW MARKED COMPLETE` against the ledger and against this file's own pin 8,100 lines below | ⚠️ Warning | WR-38 |
| `observations.spec.ts` | `:1116-1119` | A DISCRIMINATOR asserted as a mechanism property that is an artifact of a ten-character exemplar name; measured −19 with a 29-character name | ⚠️ Warning | WR-39 (a) |
| `observations.spec.ts` | `:1119` vs `:1096` | The DISCRIMINATOR's assertion line is byte-identical to one fourteen lines above; it cannot detect what its comment says it watches | ⚠️ Warning | WR-39 (b) |
| `error-redaction.spec.ts` | spread residual | Three listed spread shapes are silent through three different mechanisms; the disclosure names one, and four siblings in the same class are unlisted | ⚠️ Warning | WR-40 / WR-42 |
| `outbound-prohibition.spec.ts` | `require(...)` rule | Tests a bare identifier inline — the exact shape CR-11 closed for `fetch`; its alias is silent and undisclosed | ⚠️ Warning | WR-41 |
| `.planning/REQUIREMENTS.md` | derived span, 16 measured silences | Neither CR-15's nor CR-16's shape is named; zero occurrences of `.call`, `.apply`, `.bind`, `Reflect` or `navigator[` in 510 lines | ⚠️ Warning | consequence of CR-15/CR-16 |
| — | — | Debt markers (`TBD`/`FIXME`/`XXX`/`HACK`), skipped tests, `.only` | ℹ️ Info | **Zero across both source roots, `scripts/` and `tests/`** |

### Human Verification Required

None arising from this pass. Every one of the nine truths is settled by execution against a committed artefact, a live run result, or a probe I ran in this session — no truth is behavior-unverified. The two judgment-tier prohibitions (CORE-10, STORE-01) remain flagged as NON-AUTHORITATIVE LLM-judge verdicts with human review recommended, carried forward unchanged and already accepted by the operator at UAT.

**One decision does need the operator, and it is not a verification item — it is a scope decision I have laid out above:** whether to run round 7 against a redefined terminal condition for CORE-11, or to ship with CORE-11 open and disclosed. Both are defensible. Shipping requires adding CR-15 to the disclosure by name.

### Gaps Summary

**One gap, the same truth for the fifth consecutive round — and this round it finally has a diagnosable shape rather than a fifth new cause.**

Round 6 is the strongest round of the six on execution. It closed every finding round 5 raised, three of them at the seam, and it built the thing round 5's one-sentence diagnosis asked for: a binding from a `clause` to the branch it describes. **I did not take that on trust. I ran the mutation that defeats an anchor-line guard — condition and anchor intact, effect neutered — and the suite went red at ROW granularity, naming the row, the phrase and the anchor. I injected an unregistered resolver and both coverage-guard cases went red. `FALSIFIED_HANDOFFS` is at zero with an equality pin and `CORE11_BOX_EXPECTED` pins the box by prefix.** That is a real mechanism and it deserves to be recorded as such before anything else.

**And its three blockers split into two classes that need opposite answers.**

CR-14 and WR-38 are the *old* defect — text claiming more than code does — on the one surface the new mechanism does not scan. That is **finite and I measured all of it**: 20 declared-phrasing occurrences across 3,464 hand-written lines, zero obligations raised. The right fix is to **delete the surface, not widen the scan** — this file already applies a *pointer, not a bound* rule to `STATE.md` and `WINDOWS.md`, and applying it to its own header removes the class instead of guarding it. Widening the scan converts 20 stale sentences into 20 new obligations for the next author to keep true.

CR-15 and CR-16 are **not that defect at all**. They are the gate's reach. `fetch.call(null, url)` is silent while `const f = fetch; f(url)` reports — the same identified alias, one position over. `navigator[m]` is silent while `sdk.requests[m]`, `globalThis[m]` and `window[m]` all report. Both falsify clauses CORE-11's own first sentence enumerates and neither appears in the 510-line authoritative residual. **No scanning mechanism closes their class, ever**, because the space of JavaScript spellings for *invoke a function through a value* is open. Six rounds have each closed about two code blindnesses and each found about two more, and nothing in this design would make that rate fall.

So the honest read of the trajectory is: **the disclosure axis is one bounded change from done; the coverage axis is never done, and the current definition of done for CORE-11 asks for the second.** Round 7 is worth running if and only if it also redefines that terminal condition to the one stated at the top of this report — *derived, drift-detectable, and the only bound on every surface a reader touches* — which round 6 already satisfies two thirds of. Under the current definition, round 7 will produce an 8/9 with two new causes, and so will round 8.

**Nothing leaks, and I re-established that from scratch this round rather than carrying the claim forward.** Zero outbound-shaped tokens in any shipped non-spec source across both roots and the frontend. One import specifier in the shipped bundle: `crypto`. Every finding here is a prospective blindness in a test-only gate. The blocker stands on the claim-versus-enforcement standard this phase set for itself and has now enforced seven times — and on nothing else.

---

_Verified: 2026-08-24T21:20:00Z_
_Verifier: Claude (gsd-verifier), verification pass 7_
_Working tree restored: all three mutations reverted via `git checkout`; all four throwaway probe specs deleted; `pnpm test` re-run green at 31 files / 1345 tests after restoration; `git status` matches the pre-verification snapshot._
