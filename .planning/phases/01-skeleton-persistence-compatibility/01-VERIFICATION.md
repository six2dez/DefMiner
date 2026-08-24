---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-24T16:40:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  previous_verified: 2026-08-24T12:20:00Z
  round: 5
  verification_pass: 6
  gaps_closed:
    - "CR-09 (the round-4 blocker, the false DOCUMENT-ORDER READ bound) — CLOSED, and closed at the seam rather than the symptom. `REQUIREMENTS.md`'s residual no longer bounds the walk by where a name is READ; the marked clause is preserved byte-for-byte as the record of what was believed and is explicitly labelled FALSIFIED, with the measured bound (declaration order among the bindings) stated beside it. The `:2798` fixture was split into a BINDINGS half and a READ half with a three-case discrimination. I re-executed the diagnosis: `const b = a; const a = fetch; b(u)` -> [] and `const a = fetch; const b = a; b(u)` -> [\"outbound-fetch\"] — the inverted binding silences, the read position does not, and that is now what the text says."
    - "CR-10 (the stale first literal shadowing every later rebinding) — CLOSED and I verified both directions myself. `let k = \"harmless\"; k = \"requests\"; sdk[k].send(req)` -> [\"outbound-send\"] (was []); `let k = \"req\"; k += \"uests\"; sdk[k].send(req)` -> [\"outbound-unanalysable\"] (was []). `constStrings` is now a multi-valued map and `literalOf` answers `undefined` — which means COULD NOT READ, which reports — for a name carrying more than one binding. The boundary-2 disclosure was rewritten per COLLECTOR FAMILY rather than for the gate, which is the honest shape."
    - "WR-27 (the conditional receiver in CALL position) — CLOSED. `(b ? sdk.requests : sdk.net).send(req)`, `(sdk.requests ?? sdk.net).send(req)` and `(sdk.requests || sdk.net).send(req)` all report `outbound-send`; all three were [] in round 4. `operatorReceiver` is one descent reached from `receiverKind` and `keyReceiver`, and `initializerReceiver` was collapsed into `receiverKind` so the two positions cannot drift apart again."
    - "WR-28 (the 'severed but STABLE' single-offset claim) — CLOSED, and closed the way WR-22 taught: by SWEEPING rather than by re-picking an offset. The stability claim is gone from both files; `schema.spec.ts:287-289` now discloses the swept result including the 11 non-fixed-points, and `observations.spec.ts:929` asserts a swept range rather than one cut. I re-ran my own sweep over n=1900..2200 and measured EXACTLY the same 11 offsets, 2019..2029 — the new disclosure is accurate rather than re-approximated."
    - "WR-30 (the three `ONE HOP AND NO MORE` docblocks contradicted by their own tests) — CLOSED. Two of the three are deleted; the one that survives (`:2078`, on `assembledNames`) is the one where the bound is TRUE, and it now says so explicitly and names the deletion of its three siblings."
    - "The CORE-11 CHECKBOX REGRESSION I raised as the sharpest finding of round 4 — CLOSED. The box is `[ ]`, reverted at `faca607`, and wave 28 left it `[ ]` DELIBERATELY with the blocking row named in the ledger rather than finding a reading that let it close. That is the third attempt at this checkbox and the first that needed no revert. It is the correct call and I am recording it as credit, not as a gap."
    - "THE BYTE-COMPARISON HALF OF THE DERIVED-RESIDUAL MECHANISM IS REAL, AND I MUTATION-PROVED IT MYSELF rather than reading the summary. The two spans are byte-identical — 295 lines, both sha256 `91978e31…`, 38 entries each. I edited ONE phrase inside the `.planning/REQUIREMENTS.md` span (`silent in every spelling` -> `silent in most spellings`) and the suite went RED with the named DIVERGED assertion; restored, green. Drift between the gate and the ledger is now mechanically detectable. That is genuine and it is the largest single deliverable of round 5."
    - "Ledger, mechanically re-run: all 23 requirement ids the phase is tagged with (CORE-01..11, STORE-01..07, COMPAT-01/02, ENC-01, DIST-05/06) appear in at least one of the 28 plans, and every id named in any plan resolves in `REQUIREMENTS.md`. NO ORPHANS. 22 of the 23 boxes are `[x]`; CORE-11 is `[ ]` and correctly so."
  gaps_remaining:
    - "UAT gap 2 / truth 9 (CORE-11 outbound enforcement) — STILL OPEN, for the FOURTH consecutive round and again for entirely new causes. CR-11, CR-12 and CR-13 all hold; I confirmed each by execution and extended two of them past what the reviewer found. The score is 8/9 for the fourth round running and the failing truth has now failed for four disjoint sets of reasons."
  regressions:
    - "NO behavioural regression, and no ledger regression. Truths 1-8 all re-verified by execution or by re-reading the committed artefact: `pnpm test` 31 files / 1200 tests exit 0; `tsc --build` exit 0; the Phase 0 baseline gate 3 files / 72 tests exit 0 (the pinned pre-change number, unchanged); `check:bundle` 1 specifier (`crypto`); zero debt markers and zero skipped/`.only` tests across both source roots. The ledger moved in the RIGHT direction this round, which is the opposite of round 4."
    - "The recurrence was NOT stopped, and that is the honest headline. Round 5 changed the residual from AUTHORED to GENERATED and made drift detectable. It did not make a CLAIM detectable: `ResolverRecord.clause` is hand-written prose that no assertion reads, and each row's binding to the walk is ONE probe. Three of the 38 clauses were falsified by execution this round."
gaps:
  - truth: "No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)"
    status: partial
    reason: "THREE executed findings, each confirmed by me against `auditSource` rather than by repeating the reviewer, and I extended two of the three past what pass 6 reported. (1) CR-13 IS THE SHARPEST AND I AM PUTTING IT FIRST, because it is the round-3 blocker's own shape standing one level over. `const k = b ? \"requests\" : \"net\"; sdk[k].send(req)` -> []. That is ONE HOP. `sdk[b ? \"requests\" : \"net\"].send(req)` -> [\"outbound-send\"], `const m = b ? \"send\" : \"get\"; sdk.requests[m](req)` -> [\"outbound-unanalysable\"], `const s = b ? \"caido:http\" : \"crypto\"; await import(s)` -> [\"outbound-unanalysable\"] and `const k = b ? \"fetch\" : \"x\"; globalThis[k](url)` -> [\"outbound-unanalysable\"] — every twin of the identical conditional reports. The `??` and `||` spellings are silent too (`const k = s ?? \"requests\"` -> [], `const k = s || \"requests\"` -> []), and so is the assembled variant `const k = b ? \"req\" + \"uests\" : \"net\"` -> []. IT FALSIFIES TWO REGISTRY CLAUSES WORD FOR WORD, both of which ship into `REQUIREMENTS.md`: `constStrings` says a key resolves 'when ANY string literal the name is bound to anywhere in the file names an outbound receiver'; `literalsOf` says it reads 'every literal a name carries, so ANY of them naming a receiver reports'. `k` carries `\"requests\"` and neither reports. And it is named by NONE of the seven measured silences — it is not two hops of key, not a function boundary, not a parameter, not a loop binding, not a destructured plain literal, not an inverted binding, and not an operator around a GLOBAL receiver. (2) CR-12 — A LOGICAL-ASSIGNMENT BINDING IS INVISIBLE TO EVERY WIDENING COLLECTOR, executed across nine shapes with four controls. `let r; r ??= sdk.requests; r.send(req)` -> [], and the same for `||=` and `&&=`; `let g; g ??= globalThis; g.fetch(url)` -> []; `let f; f ??= fetch; f(url)` -> []; `let e; e ??= eval; e(src)` -> []; `let n; n ??= navigator; n.sendBeacon(u,d)` -> []; `let k; k ??= \"requests\"; sdk[k].send(req)` -> []; `let k; k ??= \"req\" + \"uests\"; sdk[k].send(req)` -> []. ALL FOUR CONTROLS FIRE, which proves these are real misses and not a fixture artefact: the same lines with `=` report `outbound-send` / `outbound-fetch` / `outbound-send`, and `+=` reports `outbound-unanalysable`. THE MECHANISM IS ONE TOKEN TEST: `collect`'s alias-growing branch at `:2647` matches `ts.SyntaxKind.EqualsToken` ONLY, while the numeric-POISONING branch at `:2744` — eleven lines below, in the same function — reads `ASSIGNMENT_OPERATORS` and its own comment names the exact shape, `x ||= sdk.requests`. The file knows the spelling exists and handles it only in the NARROWING collector. It falsifies `assembledNames`' clause explicitly ('at a declaration, an assignment, a COMPOUND ASSIGNMENT, or either binding-pattern spelling' — `??=` is a compound assignment and is silent) and the stated reach of `receiverAliases`, `constStrings`, `literalsOf`, `globalThisAliases`, `fetchAliases`, `navigatorAliases` and `globalAliases`, all of which say a name BOUND to the surface is that surface. Named by no residual row. (3) CR-11 — THE FALSE UNIVERSAL IN THE MACHINE-OWNED TEXT, AND I FOUND THE HALF THAT MATTERS. The reviewer's four spellings all report and I confirmed every one: `(0, globalThis).fetch(url)`, `(globalThis).fetch(url)`, `(globalThis as any).fetch(url)` and `globalThis!.fetch(url)` -> [\"outbound-fetch\"]. I found two more it did not name — `(0, globalThis).eval(src)` -> [\"outbound-dynamic-code\"] and `(0, fetch)(url)` -> [\"outbound-fetch\"]. So `silence-operator-around-global-receiver`'s clause 'an operator wrapping a GLOBAL receiver is silent in every spelling' is FALSE, and it ships byte-identically into `REQUIREMENTS.md` as the authoritative residual. ON ITS OWN THAT HALF IS A WARNING, and I am saying so rather than inflating it: the error runs in the SAFE direction (the gate reaches FURTHER than its text), wave 28 disclosed one instance in the surrounding ledger prose, and the MECHANISM it named there — `unwrap` strips the wrapper before the receiver resolvers are reached — is the correct and complete explanation for all six of my reporting spellings. WHAT UPGRADES IT IS THE HALF NOBODY HAS NAMED, WHICH I FOUND BY PROBING INITIALIZER POSITION AND WHICH RUNS IN THE UNSAFE DIRECTION: `const g = globalThis ?? self; g.fetch(url)` -> [], `const g = b ? globalThis : self; g.fetch(url)` -> [], `const f = fetch ?? x; f(url)` -> [], `const e = eval ?? x; e(src)` -> [], `const n = navigator ?? x; n.sendBeacon(u,d)` -> []. `const g = globalThis ?? self` is a PLAUSIBLE DEFENSIVE IDIOM, not a contrivance like `(ok && globalThis)`. And a reader is actively misled into believing it is covered, because the `initializerReceiver` row states it 'is a NAME for receiverKind since wave 25, so initializer position and call position give the same answer' while the `receiverKind` row's probe demonstrates the SDK operator working — the two clauses together say the global case transfers, and it does not. WHAT THE THREE DO TO WAVE 28's DISCHARGE TABLE, which is the arithmetic that matters: wave 28 discharged 7 of 8 enumerated rows and named ONE blocking row. Executed, SIX of the eight now carry a named blocking shape — `no sdk.requests.send in any spelling` (CR-12, CR-13), `no method of an identified requests or net receiver outside a read-only allowlist` (CR-13), `no global fetch by any receiver or alias` (the wave-28 row, plus CR-11's initializer half, plus CR-12), `no XMLHttpRequest/WebSocket/EventSource` (`new (ok && WebSocket)()` -> [], executed by me), `no navigator.sendBeacon` (CR-12, CR-11), and `no dynamic code construction` (`(ok && eval)(src)` -> [], `const e = eval ?? x` -> []). SEVERITY, STATED THE SAME WAY IT HAS BEEN EVERY ROUND: NOTHING LEAKS. No outbound call exists in any non-spec source under either root, the gate runs green over the real tree inside a 1200-test suite, and `check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. All three are PROSPECTIVE blindnesses in a test-only gate. This is a blocker on the claim-versus-enforcement standard this phase set for itself and has now enforced six times — and on nothing else."
    severity: major
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "`collect`'s alias-growing branch at `:2647` tests `node.operatorToken.kind === ts.SyntaxKind.EqualsToken` only. `??=`, `||=` and `&&=` therefore grow NO alias set, NO string map and NO assembled name, while the numeric-poisoning branch at `:2744` reads `ASSIGNMENT_OPERATORS` and its own comment names `x ||= sdk.requests`. The widening collectors and the narrowing collector disagree about which assignments exist, eleven lines apart, in the same function."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "`RESOLVER_REGISTRY` rows `constStrings` and `literalsOf` state that ANY literal a name is bound to anywhere in the file resolves the key. A conditional, `??` or `||` initializer binds a literal and neither reads it: `const k = b ? \"requests\" : \"net\"; sdk[k].send(req)` -> []. Both rows pass because both probes use a plain literal binding. This is CR-08's defect — a clause whose reach exceeds its probe's — inside the mechanism built to remove it."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "`RESOLVER_REGISTRY` row `silence-operator-around-global-receiver` asserts silence `in every spelling`. Six spellings report, including two the review did not name. The row passes because its own probe is a `&&` in call position. The text ships byte-identically into `.planning/REQUIREMENTS.md`."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "The operator-around-a-global silence also covers INITIALIZER position and is disclosed nowhere: `const g = globalThis ?? self; g.fetch(url)`, `const f = fetch ?? x; f(url)`, `const e = eval ?? x; e(src)`, `const n = navigator ?? x; n.sendBeacon(u,d)` are all []. The `initializerReceiver` row tells a reader initializer and call position give the same answer, which is true for the SDK resolver and false for the global ones."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-32, PROVEN BY MY OWN MUTATION. Deleting the `PlusEqualsToken` assembly branch at `:2707-2715` leaves the derived-residual block at `:5812` GREEN — 52 passed, 0 failed — even though `assembledNames`' clause explicitly names `a compound assignment`. Only ONE hand-written fixture 1,400 lines away (`:4693`) goes red. The generated preamble's point 1 — `a branch removed from the walk turns its own entry red` — is false at BRANCH granularity; point 3, three lines below it, states the honest version."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-33. `RESOLVER_EXEMPTIONS.collect` excuses the function with `it decides nothing about what an expression IS`. `collect`'s own inline `EqualsToken` test decides which right-hand expressions ever reach a resolver at all, and that inline branch is the whole of CR-12. The guard's population-3 disclosure names `an inline branch in collect` as the residue it cannot see, and this exemption hands that residue a reason."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-34. `:6069` is titled `its box is what plan 01-27 left it` and its regex is `/^- \\[[ x]\\] \\*\\*CORE-11\\*\\*/` — a character class matching a space OR an `x`. It asserts only that exactly one row exists. I grepped both source roots and `scripts/`: NOTHING anywhere pins CORE-11's checkbox state. The one test named for the box would stay green through the exact flip that has been reverted twice."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "WR-37 and two shapes I found beside it, none named by any residual row: `const { requests: { send } } = sdk; send(req)` -> [] while both halves report on their own; `const [r] = [sdk.requests]; r.send(req)` -> [] while `destructuredInitializer`'s clause claims BOTH binding-pattern spellings and the object spelling of the same receiver reports; `const o = { r: sdk.requests }; o.r.send(req)` -> []."
    missing:
      - "CR-12 at the seam, not the symptom: replace `collect`'s `=== EqualsToken` test at `:2647` with `ASSIGNMENT_OPERATORS.has(...)` minus the numeric compounds, so the widening collectors see the same assignment population the poisoning branch already sees eleven lines below. Add all nine executed shapes as failing-path fixtures plus the four `=`/`+=` controls, so the asymmetry is pinned in both directions."
      - "CR-13: have the declaration branch descend a conditional/`??`/`||` initializer into `literalsOf`/`constStrings` and `isAssembledKey` — the same descent `keyReceiver` already performs INLINE via `operatorReceiver`. Then `const k = b ? \"requests\" : \"net\"` reports `outbound-send` and `const k = b ? \"req\" + \"uests\" : \"net\"` reports `outbound-unanalysable`. Add the two operator twins and the four reporting counter-probes as fixtures."
      - "CR-11, the unsafe half FIRST: route `isGlobalReceiver`, `isFetchExpression`, `isNavigatorReceiver` and `aliasedGlobalOf` through `operatorReceiver` the way the SDK resolvers already are, so `const g = globalThis ?? self` and `(ok && globalThis).fetch(url)` both report. If that is deferred, the residual entry must name the INITIALIZER half explicitly — it is the plausible idiom and it is currently disclosed by nothing."
      - "CR-11, the safe half: correct `silence-operator-around-global-receiver`'s clause. `in every spelling` is false for six spellings I executed. State the measured bound instead: the four RECEIVER_OPERATORS are silent around a global receiver; the `unwrap` family — parentheses, `as`/`satisfies`, `!`, and a comma sequence — is NOT, because `unwrap` runs before the receiver resolvers are reached. Regenerate both spans."
      - "WR-32: either bind the clause to the walk or stop claiming it is bound. The cheapest honest fix is to delete point 1's `so a branch removed from the walk turns its own entry red` — point 3 already says the true thing three lines later. The stronger fix is a per-row `branches` field naming the code sites the clause covers, with one probe per named branch, so the mutation I ran turns the row red."
      - "WR-33: rewrite `RESOLVER_EXEMPTIONS.collect` and `.visit` to say what they actually do — `collect` selects which bindings the collectors ever see (an unregistered decision), `visit` selects WHICH resolver applies where (an unregistered dispatch). Both are population-3 residue and the exemption list should say so rather than excuse it."
      - "WR-34: make `:6069` assert the box STATE, not the row count — `expect(rows[0]).toMatch(/^- \\[ \\]/)` while it is open, with the failure message naming `e7cc4b6` and `faca607`. A test titled for the box that cannot see the box is the same artifact class as a claim nobody executes."
      - "WR-37 and siblings: read a NESTED binding pattern and an ARRAY slot in RECEIVER position, matching what `destructuredInitializer`'s clause already claims; or narrow the clause to the key-only reach it has."
      - "Keep CORE-11 `[ ]`. Wave 28's call was correct and nothing found this round changes it — CR-11/12/13 ADD blocking rows, taking the discharge from 7-of-8 to 2-of-8."
deferred: []
behavior_unverified_items: []
coincidental_reliance_items:
  - truth: "URL userinfo does not reach `observations.url`"
    reason: undeclared-precondition
    harden: "Carried forward from rounds 3 and 4 unchanged and still correct. The `://` precondition is DECLARED at `schema.spec.ts:115-123` rather than assumed, but the guarantee still rests on `consumer.ts:195` handing over an absolute `rr.request.getUrl()`. Advisory, no score effect."
  - truth: "The derived residual is bound to the walk"
    reason: incidental-ordering
    harden: "The byte comparison binds the shipped TEXT to the REGISTRY and each row's PROBE to the walk. Nothing binds the row's `clause` — hand-written prose — to the branch it describes. I proved the gap by mutation: the `PlusEqualsToken` branch deleted, the whole derived block green at 52/52. The claim holds today only because each clause happens to have been written by someone who had just read the branch. Harden by giving `ResolverRecord` a `branches` field with one probe per named branch."
prohibitions:
  - requirement_id: CORE-11
    statement: "No code that ships in the plugin issues an outbound network request in this phase — no `caido:http` fetch, no `sdk.requests.send` in any spelling, no method of an identified `requests` or `net` receiver outside a read-only allowlist, no global `fetch` by any receiver or alias, no `XMLHttpRequest`/`WebSocket`/`EventSource`, no `navigator.sendBeacon`, no dynamic code construction, and no speculative retrieval of any kind."
    verification: gate
    declared_status: open
    status: unverified
    flagged: true
    evidence: "FAIL-CLOSED for the fifth consecutive round, and for the first time WITH THE LEDGER AGREEING. The must-NOT itself HOLDS — no outbound call exists in any non-spec source under either root, the gate runs green over the real tree inside a 1200-test suite, and `check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. The ENFORCEMENT is partial and is now DECLARED partial: CORE-11's box is `[ ]` and the ledger names a blocking row rather than a reading. Genuinely closed since round 4 and confirmed by MY execution: the operator class in CALL position (`(b ? sdk.requests : sdk.net).send(req)` -> [\"outbound-send\"]), the stale-literal shadowing (`let k = \"harmless\"; k = \"requests\"; sdk[k].send(req)` -> [\"outbound-send\"]), the `+=` assembly, and the document-order read bound corrected in five places. Still silent, executed by me this round: `const k = b ? \"requests\" : \"net\"; sdk[k].send(req)` -> []; `let r; r ??= sdk.requests; r.send(req)` -> []; `const g = globalThis ?? self; g.fetch(url)` -> []; `(ok && eval)(src)` -> []; `new (ok && WebSocket)()` -> []; `const { requests: { send } } = sdk; send(req)` -> []; `const [r] = [sdk.requests]; r.send(req)` -> []. Six of the eight clauses this requirement's own first sentence enumerates now carry a named blocking shape. A `verification: gate` prohibition whose gate cannot go red on shapes its own statement enumerates is not verified — and the box correctly says so."
  - requirement_id: STORE-03
    statement: "MUST NOT persist a query-string VALUE from a target-controlled URL into observations.url. Parameter names, path, scheme and host are retained; every value is replaced before the row is written."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "HOLDS, re-executed this round with a WIDER sweep than round 4's. 301 head lengths (n=1900..2200) of `https://cdn.test/{p*n};jsessionid=SECRETSESSION` plus 400 query-tail lengths of `?tok=SECRETSESSION&p={x*n}` through the shipped `normaliseObservedUrl`: ZERO occurrences of the secret in ANY output, first pass or second, and ZERO outputs over `URL_MAX`. The round-3 mutation proofs (22 unit assertions red on an in-place revert; committed live runs `20260822T094959Z-31622` red and `20260822T094728Z-11865` clean, read with `sqlite3 -readonly` from outside Caido) stand unchanged and are still committed. WR-28 is CLOSED: the false stability claim is gone from both files and the new disclosure at `schema.spec.ts:287-289` names the 11 non-fixed-point offsets — I measured EXACTLY the same 11, n=2019..2029, so the correction is accurate rather than re-approximated."
  - requirement_id: STORE-07
    statement: "MUST NOT render a caught exception into a persisted or logged string without passing it through describeError first."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "Carried forward from round 4, where I executed both directions myself through the shipped `error-redaction.spec.ts` `auditSource`: `flag ? e.message : \"none\"`, `e.message ?? \"none\"`, `e.message || \"none\"` and `flag && e.message` all report `unredacted-concat`, and every `describeError` twin stays quiet. Regression-checked this round inside the green 1200-test suite. WR-36 (`{ ...e }` routed through an object literal reports []) is a WARNING against that gate's own IN-25 correction text, not a failure of the prohibition."
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
    evidence: "Carried forward from rounds 3 and 4 substantially unchanged. The column-shape half is gated (PRAGMA-read allowlist + forbidden-name check). The 'capable of holding a secret' half is honestly bounded rather than contradicted: `observations.url` can still hold a path-embedded token and a retained parameter NAME, both named in the OPEN list, both pinned, the second kept BY POLICY under the operator's 2026-08-21 UAT decision. Judgment-tier: NON-AUTHORITATIVE, human review recommended."
---

# Phase 1: Skeleton, Persistence, Compatibility — Verification Report

**Phase Goal:** A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Verified:** 2026-08-24T16:40:00Z
**Status:** gaps_found
**Re-verification:** Yes — verification pass 6, after gap-closure ROUND 5 (plans 01-23 … 01-28)

## The verdict on the question I was asked

**Round 5 built the best mechanism this phase has produced, proved its byte-comparison half works, got CORE-11's checkbox right for the first time in three attempts — and did not stop the recurrence, because the thing it made mechanical is DRIFT and the thing that keeps failing is a CLAIM.**

I was asked to reach my own conclusion on CR-11, CR-12 and CR-13 by execution, to judge WR-32 fairly in both directions, and to weigh WR-33 and WR-34. I did all of it. All six hold. I extended two of the three blockers past what the reviewer found.

Start with the credit, because it is the largest of any round.

### What round 5 genuinely delivered, executed rather than read

**The byte-comparison is real and I mutation-proved it.** The two derived spans are byte-identical — 295 lines, both sha256 `91978e31…`, 38 entries each. I edited exactly one phrase inside the `.planning/REQUIREMENTS.md` span (`silent in every spelling` → `silent in most spellings`) and ran the suite: RED, with the named `DIVERGED from deriveResidual(RESOLVER_REGISTRY)` assertion and the full expected block pasted into the failure message. Restored, green. **The ledger a reader trusts most can no longer silently drift from the gate.** That is the defect that produced two reverts, and it is closed.

**All five round-4 findings are closed and I verified each myself.** CR-09's false read bound is gone from all five locations, replaced with the measured binding-declaration-order bound, and the `:2798` fixture is split into a bindings half and a read half with a three-case discrimination — I re-ran the diagnosis and it now says what it tests. CR-10's stale literal is fixed at the seam: `constStrings` is multi-valued and `literalOf` answers `undefined` (which reports) for a name with two bindings, so `let k = "harmless"; k = "requests"; sdk[k].send(req)` reports where it was silent. WR-27's conditional receiver reports in all three operator forms. WR-30 deleted two of the three false `ONE HOP` docblocks and kept the one where the bound is true.

**WR-28 was closed the way WR-22 taught, and this one deserves specific credit.** The single-offset stability pin is gone; the disclosure now names the swept result. I ran my own sweep over n=1900..2200 and measured **exactly the same 11 non-fixed-point offsets, 2019..2029**. The correction is accurate, not re-approximated to a friendlier number. Zero secret leaks across 301 head lengths and 400 query-tail lengths.

**And CORE-11's box is `[ ]`, deliberately, with the blocking row named.** Round 4's sharpest finding was that the ledger moved the wrong way. Round 5 moved it back and then wave 28 — owning the only plan permitted to touch the checkbox — discharged the requirement's own sentence row by row, found a row it could not discharge, and left the box open rather than finding a reading. **That is the third attempt at this checkbox and the first that needed no revert. It is the correct call.** More than that: wave 28 volunteered the `(0, globalThis).fetch` discrepancy into the ledger itself, unprompted, in the safe direction, rather than absorbing it.

Now the findings.

---

### CR-13 — holds, and I am putting it FIRST because it is the round-3 blocker's own shape one level over

```
const k = b ? "requests" : "net";  sdk[k].send(req)        []
const k = s ?? "requests";         sdk[k].send(req)        []
const k = s || "requests";         sdk[k].send(req)        []
const k = b ? "req"+"uests":"net"; sdk[k].send(req)        []
```

That is **one hop**. Every twin of the identical conditional reports:

```
                                   sdk[b ? "requests" : "net"].send(req)   ["outbound-send"]
const m = b ? "send" : "get";      sdk.requests[m](req)                    ["outbound-unanalysable"]
const s = b ? "caido:http":"crypto"; await import(s)                       ["outbound-unanalysable"]
const k = b ? "fetch" : "x";       globalThis[k](url)                      ["outbound-unanalysable"]
```

**It falsifies two registry clauses word for word, and both ship into `REQUIREMENTS.md`.** `constStrings`: *"a receiver or global KEY resolves when **ANY** string literal the name is bound to anywhere in the file names an outbound receiver."* `literalsOf`: *"every literal a name carries, so **ANY** of them naming a receiver reports."* `k` carries `"requests"`. Neither reports.

Both rows are **green**, because both probes use a plain literal binding. **This is precisely CR-08 — a clause whose stated reach exceeds its probe's executed reach — reappearing inside the mechanism built to remove it.**

And it is named by none of the seven measured silences. It is not two hops of key. Not a function boundary. Not a parameter. Not a loop binding. Not a destructured plain literal. Not an inverted binding. Not an operator around a *global* receiver — this is an SDK receiver, and the SDK operator is the one wave 25 closed.

### CR-12 — holds, and the file's own comment names the shape eleven lines away

Nine shapes silent, four controls firing:

```
let r;  r ??= sdk.requests;   r.send(req)          []      | let r; r = sdk.requests;  ["outbound-send"]
let r;  r ||= sdk.requests;   r.send(req)          []      | let g; g = globalThis;    ["outbound-fetch"]
let r;  r &&= sdk.requests;   r.send(req)          []      | let k; k = "requests";    ["outbound-send"]
let g;  g ??= globalThis;     g.fetch(url)         []      | let k="req"; k+="uests";  ["outbound-unanalysable"]
let f;  f ??= fetch;          f(url)               []
let e;  e ??= eval;           e(src)               []
let n;  n ??= navigator;      n.sendBeacon(u,d)    []
let k;  k ??= "requests";     sdk[k].send(req)     []
let k;  k ??= "req"+"uests";  sdk[k].send(req)     []
```

**The controls are what make this a finding rather than a guess.** Every one of these lines fires with `=` or `+=`. Only the logical-assignment spelling is invisible.

The mechanism is one token test. `collect`'s alias-growing branch at `:2647`:

```ts
node.operatorToken.kind === ts.SyntaxKind.EqualsToken
```

Eleven lines below, at `:2744`, the numeric-**poisoning** branch reads `ASSIGNMENT_OPERATORS` and its own comment says:

```ts
// `x ||= sdk.requests` and friends can assign anything at all.
```

**The file knows the spelling exists and handles it only in the NARROWING collector.** The widening collectors and the narrowing collector disagree about which assignments exist, in the same function, eleven lines apart.

`assembledNames`' clause is falsified explicitly — it claims *"a declaration, an assignment, a **compound assignment**, or either binding-pattern spelling"*, and `??=` is a compound assignment that is silent. The stated reach of `receiverAliases`, `constStrings`, `literalsOf`, `globalThisAliases`, `fetchAliases`, `navigatorAliases` and `globalAliases` is falsified too — every one of them says a name **bound** to the surface *is* that surface.

### CR-11 — holds, and the half that matters is one nobody has named

The reviewer's four spellings all report, and I found two more:

```
(0, globalThis).fetch(url)        ["outbound-fetch"]
(globalThis).fetch(url)           ["outbound-fetch"]
(globalThis as any).fetch(url)    ["outbound-fetch"]
globalThis!.fetch(url)            ["outbound-fetch"]
(0, globalThis).eval(src)         ["outbound-dynamic-code"]   ← not named by the review
(0, fetch)(url)                   ["outbound-fetch"]          ← not named by the review
```

So `silence-operator-around-global-receiver`'s *"silent in every spelling"* is false, and it ships byte-identically into `REQUIREMENTS.md` as the authoritative residual, on the row CORE-11's `[ ]` is blocked on. The `unwrap` row four entries above states the mechanism that falsifies it, and both rows pass because each probe sits on its own side of the boundary.

**On its own, that half is a WARNING and I am saying so rather than inflating it.** The error runs in the **safe** direction — the gate reaches *further* than its text. Wave 28 disclosed one instance in the ledger prose *unprompted*, and the mechanism it named there (`unwrap` strips the wrapper before the receiver resolvers are reached) is the correct and **complete** explanation for all six of my reporting spellings. A residual that understates the gate cannot cause anyone to ship an outbound call believing it would be caught. Wave 28 found one spelling and the correct mechanism; the reviewer found four spellings of that one mechanism.

**What upgrades this to blocker weight is the half I found by probing initializer position, which runs in the UNSAFE direction:**

```
const g = globalThis ?? self;    g.fetch(url)           []
const g = b ? globalThis : self; g.fetch(url)           []
const f = fetch ?? x;            f(url)                 []
const e = eval ?? x;             e(src)                 []
const n = navigator ?? x;        n.sendBeacon(u, d)     []
```

`const g = globalThis ?? self` is a **plausible defensive idiom**, not a contrivance like `(ok && globalThis)`. It creates a fully aliased global receiver the gate cannot see, and **no residual clause anywhere names it.**

Worse, a reader is actively misled into believing it is covered. The `initializerReceiver` row says it *"is a NAME for receiverKind since wave 25, so initializer position and call position give the same answer"*, and the `receiverKind` row demonstrates the SDK operator working in call position. Read together, the two rows say the global case transfers to initializer position. It does not.

---

## On WR-32 — I ran the mutation myself, and it holds. Judged in both directions.

I deleted the `PlusEqualsToken` assembly branch at `:2707-2715` — the branch `assembledNames`' clause explicitly names when it says *"a declaration, an assignment, a **compound assignment**"* — and ran the derived-residual block:

```
Tests  52 passed | 210 skipped (262)
```

**All 52 green.** The whole file, run under the same mutation, produced exactly **one** failure: a hand-written fixture at `:4693`, 1,400 lines away from the generated block.

So the generated preamble's point 1 — *"its probe and its counter-probe are run through auditSource … **so a branch removed from the walk turns its own entry red**"* — is **false at branch granularity**. It is true only at the granularity of the one branch each row's single probe happens to exercise. Point 3, three lines below, states the honest version: *"Each entry's probes are EXAMPLES. They prove the entry true OF ITSELF and do not cover that resolver's whole domain."*

**Judged fairly in the other direction:** the mechanism is real work and it does reduce the class. The byte comparison is genuine — I proved it red. The row-level execution is genuine. The coverage guard over two enumerated populations, with a named exemption list and non-vacuity asserted before the rule, is genuine. The registry's own vacuity check (a row whose probe and counter-probe agree fails) is a real guard against the laziest bad row.

But the reviewer's characterisation is correct and it is the load-bearing sentence of this report: **the derived block binds the shipped TEXT to the REGISTRY, and each row's PROBE to the walk. Nothing binds a row's `clause` — hand-written prose that no assertion reads — to the branch it describes.** That is why CR-11, CR-12 and CR-13 could all land inside a mechanism that is 100% green: each is a clause whose stated reach exceeds its probe's executed reach, which is the phase's recurring failure mode reproduced one level up, in the artefact built to end it.

## On WR-33 — partially confirmed, and I am splitting it rather than accepting it whole

`RESOLVER_EXEMPTIONS.collect`: *"the first document-order pass. It invokes the collectors and records bindings; **it decides nothing about what an expression IS**."* **Materially false.** `collect`'s own inline `EqualsToken` test decides which right-hand expressions ever reach a resolver at all — and that inline branch is the entirety of CR-12. The guard's own population-3 disclosure names *"an inline branch in `collect`"* as the residue it cannot see; this exemption hands that residue a reason to stay unexamined.

`RESOLVER_EXEMPTIONS.visit`: *"every resolution it performs is delegated to a registered mechanism."* **Misleading rather than flatly false.** Each individual resolution *is* delegated — `unwrap` and `receiverKind` are both registry rows. What is unregistered is the **dispatch**: `visit` chooses `unwrap` for a call callee and never `operatorReceiver`, and that choice is the seam CR-11 lives in. I am recording this at warning weight with the distinction stated, not at the reviewer's weight.

## On WR-34 — confirmed, definitively, and it needs no mutation

`:6069` is titled *"CORE-11's entry is present and well-formed, and **its box is what plan 01-27 left it**"*. Its regex:

```ts
/^- \[[ x]\] \*\*CORE-11\*\*/
```

`[ x]` is a character class matching a space **or** an `x`. The test asserts one thing: that exactly one such row exists. I grepped both source roots, `scripts/` and `tests/` — **nothing anywhere pins CORE-11's checkbox state.**

The test named for the box cannot see the box. It would stay green through the exact flip that has been reverted twice, at `e7cc4b6` and `faca607`. It is the smallest finding in this report and it is the one that sits closest to the wound.

## Is CORE-11's `[ ]` correct? Yes — and it is more correct than wave 28 knew.

Wave 28 discharged 7 of 8 enumerated rows and named 1 blocking row. Executed, **6 of 8 carry a named blocking shape**:

| Enumerated clause | Wave 28 | Measured this round |
|---|---|---|
| no `caido:http` fetch | discharged | ✓ holds — `const s = b ? "caido:http" : "crypto"; import(s)` reports |
| no `sdk.requests.send` in any spelling | discharged | ✗ CR-12, CR-13 |
| no method of an identified `requests`/`net` receiver | discharged | ✗ CR-13, WR-37 |
| no global `fetch` by any receiver or alias | **BLOCKED** | ✗ still — plus CR-11's initializer half, plus CR-12 |
| no `XMLHttpRequest`/`WebSocket`/`EventSource` | discharged | ✗ `new (ok && WebSocket)()` → `[]` |
| no `navigator.sendBeacon` | discharged | ✗ CR-11, CR-12 |
| no dynamic code construction | discharged | ✗ `(ok && eval)(src)` → `[]`; `const e = eval ?? x` → `[]` |
| no speculative retrieval of any kind | n/a | n/a |

The box is right. The discharge table behind it is not — **and the difference is entirely the same defect: a row discharged against a probe that sits on the working side of a boundary the clause claims to span.**

## On severity, stated the same way it has been every round

**Nothing leaks.** No outbound call exists in any non-spec source under either root — 23 files, zero violations. The gate runs green over the real tree inside a **1200**-test suite. `check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. Zero debt markers, zero skipped tests, zero `.only`. Every finding in this report is a **prospective** blindness in a test-only gate: a call site somebody writes next year that the gate would stay green on. This report does not inflate any of them into round 2's live credential.

**The blocker is not a leak. It is that the requirement's own enumeration cannot be discharged, and the mechanism built to make that assessable is itself assessed by a probe narrower than its claim.**

## Goal Achievement

**All seven ROADMAP Success Criteria hold, and none regressed under round 5. The phase GOAL is achieved. UAT gap 2 is not closed.** Those stay separate, as they have every round.

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `onInterceptResponse` is non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `passive.ts:120` is `export function onResponse(`, not async; registered at `index.ts:322`. Regression-checked this round. |
| 2 | The work queue is bounded and its overflow count is visible | ✓ VERIFIED | `queue.ts:96` exposes `overflowCount` as a getter a take does not reset (`:81`); `index.ts:130` surfaces `queueOverflowCount` on `getStatus()`. Asserted in the green suite. |
| 3 | Browsing a 200-chunk SPA leaves UI and RPC responsive, max sync slice under the Phase 0 threshold | ✓ VERIFIED | `results/spa-load.json` re-read this round: `max_slice_ms 0.029` against a 25 ms budget, gated by `tests/phase1-load.spec.ts` in the green suite. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `spa-load.json.restart` re-read this round: `identical: true`, `plugin_reattached: true`, `user_version` 2 before and after, 200 artifacts / 200 observations / 200 distinct digests, `schema_changed: false`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; a non-UTF-8 fixture round-trips | ✓ VERIFIED | `consumer.ts:189` `const raw = body.toRaw()`; the `toText()` AST gate in `admit.spec.ts` passes and is fixture-proven. |
| 6 | A CI gate fails the build if the backend bundle imports any specifier outside the measured allowlist | ✓ VERIFIED | **Re-executed:** `node scripts/ci/check-bundle-imports.mjs` → `packages/backend/dist/index.js: 1 import specifier(s): crypto`, exit 0. |
| 7 | A Caido build below the declared minimum produces a clear message | ✓ VERIFIED | `MIN_CAIDO = "0.57.1"` at `compat.ts:43`; refusal messages at `:332/:352/:363` naming both versions. Proven against the real 0.55.3 binary in `compat-smoke.json` leg C. |
| 8 | **[UAT gap 1]** `observations.url` does not persist query-string values verbatim | ✓ VERIFIED — holds | My own **301**-offset head sweep plus 400 query-tail lengths of a `SECRETSESSION` payload through the shipped `normaliseObservedUrl`: **zero leaks, zero over-`URL_MAX` outputs**. Round-3 mutation proofs at both unit and live tiers stand. WR-28 CLOSED — the new disclosure names the same 11 offsets I measured. |
| 9 | **[UAT gap 2]** No shipped code can introduce outbound traffic without failing a gate | ✗ FAILED (partial) | CR-09, CR-10, WR-27, WR-28, WR-30 all closed and re-verified by me. CR-11, CR-12 and CR-13 open, all three executed. `const k = b ? "requests" : "net"; sdk[k].send(req)` → `[]`; `let r; r ??= sdk.requests; r.send(req)` → `[]`; `const g = globalThis ?? self; g.fetch(url)` → `[]`. Six of the eight enumerated clauses now carry a named blocking shape. |

**Score:** 8/9 truths verified (0 present, behavior-unverified)

**8/9 for the fourth round running, and for the fourth time the failing truth fails for entirely new causes.** Round 2's cause was five gate blindnesses; round 3's was CR-08's assembled key; round 4's was the false read bound, the stale literal and the conditional receiver; round 5's is a conditional *initializer*, a logical-assignment binding, and an operator around a *global* receiver. Every one of the previous three sets is genuinely closed. **The one thing that changed direction this round is the ledger: round 4's box was checked against a falsified disclosure, and round 5's box is open with the blocking row named.**

### What round 5 genuinely delivered

| Deliverable | Status | What I executed or re-derived |
|---|---|---|
| CR-09, the round-4 blocker (false READ bound) | ✓ CLOSED at the seam | The bound is now declaration-order among the bindings, stated in all five locations, with the false clause preserved and labelled FALSIFIED. `const b = a; const a = fetch; b(u)` → `[]`; the dependency-ordered twin reports. |
| CR-10, the stale first literal | ✓ CLOSED at the seam, not the symptom | `constStrings` is multi-valued; `literalOf` answers `undefined` (which reports) for two bindings. All six round-4 shapes now report. The boundary-2 disclosure was rewritten PER COLLECTOR FAMILY, which is the honest shape. |
| WR-27, the conditional receiver in call position | ✓ CLOSED | All three operator forms report; `initializerReceiver` collapsed into `receiverKind` so the two positions cannot drift apart again. |
| WR-28, the single-offset stability pin | ✓ CLOSED, and closed the right way | Swept rather than re-picked. My independent sweep found **exactly** the disclosed 11 offsets, n=2019..2029. |
| WR-30, the three `ONE HOP` docblocks | ✓ CLOSED | Two deleted, the true one kept and made to say why it is the only place that bound is stated. |
| The derived residual — byte-comparison half | ✓ REAL, mutation-proved by me | Spans byte-identical (295 lines, sha256 `91978e31…`, 38 entries). One-phrase edit in `REQUIREMENTS.md` → suite RED with the named DIVERGED assertion. Restored → green. |
| The derived residual — walk-binding half | ⚠️ NARROWER THAN ITS PREAMBLE | `PlusEqualsToken` branch deleted → derived block **52/52 green**. Binds text↔registry and probe↔walk; does NOT bind clause↔branch. |
| CORE-11's checkbox | ✓ CORRECT, and it is the first attempt that needed no revert | `[ ]`, with the blocking row named in the ledger. Wave 28 also volunteered the `(0, globalThis)` discrepancy unprompted, in the safe direction. |
| Requirement ledger integrity | ✓ VERIFIED mechanically | All 23 phase ids appear in at least one of 28 plans; every plan id resolves in `REQUIREMENTS.md`. **No orphans.** 22 `[x]`, CORE-11 `[ ]`. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/backend/src/store/observations.ts` | Write-path URL redaction, all grammars | ✓ VERIFIED | Wired into `recordObservation`, data flowing from `consumer.ts:446`. Zero leaks across my 301-offset head sweep and 400-length query sweep; zero over-`URL_MAX`. |
| `packages/backend/src/store/observations.spec.ts` | Fixtures that can fail | ✓ VERIFIED | WR-28 closed — `:929` asserts a swept range with a named failure list rather than one chosen offset. The `BARE_CREDENTIAL_SHAPES` table and its mutation proofs stand. |
| `packages/backend/src/store/schema.spec.ts` | Per-grammar claim with a complete OPEN list | ✓ VERIFIED | `:287-289` now discloses the swept result including the 11 non-fixed-points, which I reproduced exactly. The false stability claim is gone. |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 gate over both shipped roots | ⚠️ PARTIAL | 6,089 lines, both roots, by-name non-vacuity, 38-row registry, byte-checked ledger. CR-09/CR-10/WR-27/WR-30 all closed. A conditional key initializer, every logical-assignment binding, an operator around a global receiver in both call and initializer position, a nested destructure and an array-slot receiver are all silent; three registry clauses falsified by execution; the derived block cannot go red on a branch its own clause names. |
| `packages/backend/src/store/error-redaction.spec.ts` | STORE-07 gate | ✓ VERIFIED | WR-17 and WR-24 closed, executed in round 4, regression-checked in the green suite. WR-36 (`{ ...e }` reports `[]` against the IN-25 correction text) is a warning on the disclosure, not the prohibition. |
| `tests/pins.spec.ts` | The WR-21 gate the tracer claimed | ✓ VERIFIED | WR-25 closed; four fixtures execute both directions, the load-bearing one plants the literal into the real file's bytes. |
| `scripts/ci/check-bundle-imports.mjs` | DIST-05 bundle allowlist gate | ✓ VERIFIED | Re-executed: 1 specifier, `crypto`, exit 0. |
| `scripts/phase1/tracer-e2e.sh` | Live end-to-end proof against the DB file | ✓ VERIFIED | Six grammars, two padded dyes under both spellings; IN-21 closed. |
| `packages/backend/src/compat.ts` | COMPAT-01/02 refusal | ✓ VERIFIED | `MIN_CAIDO` + three distinct messages, proven on a real 0.55.3 binary. |
| `.planning/REQUIREMENTS.md` | Honest ledger | ⚠️ PARTIAL — **upgraded from FAILED** | CORE-11 is `[ ]` with the blocking row named, which is the correct state and reverses round 4's regression. It carries a machine-owned span that is byte-bound to the registry and that I proved goes red on edit. **What keeps it PARTIAL:** the span contains the false universal `silent in every spelling` (six spellings report), the false `constStrings` and `literalsOf` universals CR-13 falsifies, and `assembledNames`' compound-assignment clause CR-12 falsifies — and the wave-28 discharge text above it claims 7 of 8 rows discharged where 2 survive execution. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `hooks/passive.ts` | `engine/queue.ts` | `offer()` from a non-async handler | ✓ WIRED | Regression-checked; unchanged. |
| `ingest/consumer.ts:446` | `store/observations.ts` | `recordObservation(...)` with `got.url` | ✓ WIRED | Real data path; `got.url` from `rr.request.getUrl()` at `:195`. |
| `store/observations.ts` | SQLite `observations.url` | `normaliseObservedUrl(url)` inside the INSERT parameters | ✓ WIRED | Write-path, settled against the real database file by the committed clean and mutation runs. |
| `outbound-prohibition.spec.ts` | `packages/engine/src` | `SOURCE_ROOTS[1]` + by-name non-vacuity | ✓ WIRED | 23 files over both roots, zero violations on the real tree. |
| `RESOLVER_REGISTRY` | `.planning/REQUIREMENTS.md` span | `deriveResidual` → `extractDerivedBlock` → byte equality | ✓ WIRED, **mutation-proved by me** | One-phrase edit → RED with the named DIVERGED assertion; restored → green. 295 lines, sha256 `91978e31…`, identical to the gate-header span. |
| `RESOLVER_REGISTRY.clause` | the walk's branches | *(nothing)* | ✗ NOT WIRED | The clause is prose no assertion reads. Proved by mutation: `PlusEqualsToken` branch deleted → derived block 52/52 green, and that branch is named in `assembledNames`' clause. |
| `:6069` "its box is what plan 01-27 left it" | CORE-11's checkbox STATE | `/^- \[[ x]\] \*\*CORE-11\*\*/` | ✗ NOT WIRED | The character class accepts both states. Nothing in either source root, `scripts/` or `tests/` pins the box. |
| `index.ts:130` | `engine/queue.ts:96` | `queue.overflowCount` → `getStatus().queueOverflowCount` | ✓ WIRED | RPC-visible. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `observations.url` | `url` | `rr.request.getUrl()` → `normaliseObservedUrl` | ✓ read back with `sqlite3 -readonly` from outside Caido, `raw rows == rpc rows` | ✓ FLOWING, redacted per policy |
| `getStatus().queueOverflowCount` | `queue.overflowCount` | live `BoundedQueue` instance | ✓ | ✓ FLOWING |
| `spa-load.json.max_slice_ms` | measured slice | live 200-chunk run | ✓ 0.029 ms vs 25 ms budget | ✓ FLOWING |
| `check-bundle-imports` specifier set | parsed `dist/index.js` | real built bundle | ✓ 1 specifier | ✓ FLOWING |
| `spa-load.json.restart` digests | live SQLite file, before and after | real Caido restart | ✓ 200/200 distinct, `schema_changed: false` | ✓ FLOWING |
| `REQUIREMENTS.md` derived span | `deriveResidual(RESOLVER_REGISTRY)` | the registry object, in-process | ✓ byte-identical, mutation-proved red | ✓ FLOWING |
| registry `clause` text | *(none)* | hand-authored prose | ✗ no assertion reads it | ⚠️ STATIC — the text is bound to the registry, the registry's clause is bound to nothing |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full suite green | `vitest run` (run ONCE) | 31 files, **1200 tests passed**, exit 0 | ✓ PASS |
| Typecheck | `tsc --build` | exit 0 | ✓ PASS |
| Prior-phase regression gate | `vitest run tests/go-no-go tests/schema tests/spike-results` | 3 files, **72 tests**, exit 0 — the pinned Phase 0 baseline, unchanged | ✓ PASS |
| Bundle import gate | `node scripts/ci/check-bundle-imports.mjs` | `1 import specifier(s): crypto`, exit 0 | ✓ PASS |
| Debt-marker scan | `grep -rnE "TBD\|FIXME\|XXX"` over both roots + `scripts/` + `tests/` | zero unreferenced markers | ✓ PASS |
| Disabled-test scan | `grep -rnE "it.skip\|describe.skip\|.only\("` | zero | ✓ PASS |
| Derived spans byte-identical | in-process span extraction + sha256 | 295 lines, both `91978e31…`, 38 entries, identical | ✓ PASS |
| Byte-comparison goes RED on edit | `silent in every spelling` → `silent in most spellings` in `REQUIREMENTS.md`, run, restore | RED with the named DIVERGED assertion; restored green | ✓ PASS |
| CR-09 closure re-verified | throwaway spec importing `auditSource` | inverted binding silent, dependency-ordered reports — the text now matches | ✓ PASS |
| CR-10 closure re-verified | same probe, 4 shapes + controls | `let k = "harmless"; k = "requests"` reports; `+=` reports | ✓ PASS |
| STORE-03 leak sweep (wider than round 4) | 301 head lengths + 400 query-tail lengths through `normaliseObservedUrl`, both passes | **0 leaks, 0 over-`URL_MAX`** | ✓ PASS |
| WR-28 correction accuracy | independent sweep n=1900..2200 | **11 unstable, exactly n=2019..2029** — matches the disclosure | ✓ PASS |
| **CR-11**, 16 shapes | throwaway spec importing `auditSource` | 4 reviewer spellings + 2 more report; 4 RECEIVER_OPERATORS silent; **5 initializer shapes silent and undisclosed** | ✗ FAIL (blocker) |
| **CR-12**, 9 shapes + 4 controls | same probe | all 9 silent, all 4 controls fire | ✗ FAIL (blocker) |
| **CR-13**, 4 shapes + 4 twins | same probe | all 4 silent, all 4 twins report | ✗ FAIL (blocker) |
| **WR-32** mutation | `PlusEqualsToken` branch deleted → derived block run → restored | **52 passed, 0 failed**; whole file: 1 failure, 1,400 lines away | ✗ FAIL (warning) |
| **WR-34** regex read | `/^- \[[ x]\] \*\*CORE-11\*\*/` + grep for any other box pin | accepts both states; no other pin exists anywhere | ✗ FAIL (warning) |
| **WR-37** + 2 shapes I found | same probe | nested destructure, array-slot receiver and object-literal property all `[]`; both halves of the nested one report alone | ✗ FAIL (warning) |

### Probe Execution

| Probe | Command | Result | Status |
|---|---|---|---|
| `scripts/ci/check-bundle-imports.mjs` | `node scripts/ci/check-bundle-imports.mjs` | exit 0, 1 specifier | PASS |
| Phase 0 baseline gate | `vitest run tests/{go-no-go,schema,spike-results}.spec.ts` | exit 0, 3 files / 72 tests | PASS |

No `scripts/*/tests/probe-*.sh` files exist in this tree; the phase's runnable gates are the vitest suite and the two node/CI scripts above, all executed.

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
| CORE-10 | 01-05, 01-06 | ✓ SATISFIED | Truth 3 — `max_slice_ms 0.029` recorded from a live run. Prohibition flagged judgment-tier. |
| **CORE-11** | 01-10, 01-12, 01-16, 01-18, 01-19, 01-23, 01-28 | ✗ **BLOCKED** | Truth 9. Box `[ ]`, correctly. 6 of 8 enumerated clauses carry a named blocking shape. |
| STORE-01 | 01-04 | ✓ SATISFIED | Schema via `sdk.meta.db()`. Prohibition flagged judgment-tier. |
| STORE-02 | 01-04 | ✓ SATISFIED | Truth 4 — `project_id` in every key. |
| STORE-03 | 01-04, 01-10, 01-20 | ✓ SATISFIED | Truth 8 — content-addressed by digest; redaction proved over 701 swept inputs. |
| STORE-04 | 01-04 | ✓ SATISFIED | Corpus version on analysis rows. |
| STORE-05 | 01-04, 01-05 | ✓ SATISFIED | Truth 4 — `user_version` 2 across a real restart, forward migrations tested populated. |
| STORE-06 | 01-05 | ✓ SATISFIED | Retention policy asserted. |
| STORE-07 | 01-05, 01-16, 01-21 | ✓ SATISFIED | Positional `?` gate + `describeError` gate, both mutation-proven. |
| COMPAT-01 | 01-06, 01-07 | ✓ SATISFIED | Truth 7 — `MIN_CAIDO`, three messages, real 0.55.3 binary. |
| COMPAT-02 | 01-07 | ✓ SATISFIED | Smoke test against the current release, `compat-smoke.json`. |
| ENC-01 | 01-03, 01-08 | ✓ SATISFIED | Truth 5 — `toRaw()` at `consumer.ts:189`, `toText()` AST gate green. |
| DIST-05 | 01-08, 01-09 | ✓ SATISFIED | Truth 6 — re-executed, 1 specifier. |
| DIST-06 | 01-09 | ✓ SATISFIED | `tests/pins.spec.ts`, the exact-pin traps asserted. |

**Orphan check:** REQUIREMENTS.md and ROADMAP.md both map exactly `CORE-01 … CORE-11, STORE-01 … STORE-07, COMPAT-01/02, ENC-01, DIST-05/06` to Phase 1 — 23 ids. All 23 are claimed by at least one of the 28 plans. Every id named in any plan resolves in REQUIREMENTS.md. `STORE-08` and `ENC-02` appear in plan prose but are explicitly split out to later phases and mapped there. **NO ORPHANS.**

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `outbound-prohibition.spec.ts` | `:3348-3352` | A registry `clause` asserting a universal (`in every spelling`) that six executed shapes falsify, shipped byte-identically into the authoritative ledger | 🛑 Blocker | CR-11 |
| `outbound-prohibition.spec.ts` | `:2647` | `=== EqualsToken` in the widening collector while the narrowing collector 11 lines below reads `ASSIGNMENT_OPERATORS` and names the shape in a comment | 🛑 Blocker | CR-12 |
| `outbound-prohibition.spec.ts` | `constStrings` / `literalsOf` rows | Two clauses claiming **ANY** literal a name is bound to, falsified by a one-hop conditional initializer; both rows green because both probes use a plain literal | 🛑 Blocker | CR-13 |
| `outbound-prohibition.spec.ts` | `:3512-3515` (generated preamble, point 1) | *"a branch removed from the walk turns its own entry red"* — false at branch granularity, contradicted by point 3 three lines below, proved by my mutation (52/52 green) | ⚠️ Warning | WR-32 |
| `outbound-prohibition.spec.ts` | `RESOLVER_EXEMPTIONS.collect` | *"it decides nothing about what an expression IS"* — `collect`'s inline `EqualsToken` test is the whole of CR-12 | ⚠️ Warning | WR-33 (a) |
| `outbound-prohibition.spec.ts` | `RESOLVER_EXEMPTIONS.visit` | *"every resolution … delegated to a registered mechanism"* — each resolution is; the **dispatch** is not, and that seam is CR-11 | ⚠️ Warning | WR-33 (b) |
| `outbound-prohibition.spec.ts` | `:6069` | Test titled for the checkbox whose regex `[ x]` accepts both states; nothing anywhere pins the box | ⚠️ Warning | WR-34 |
| `outbound-prohibition.spec.ts` | `destructuredInitializer` row | Clause claims BOTH binding-pattern spellings; the array-slot RECEIVER (`const [r] = [sdk.requests]`) is silent, as is a nested destructure | ⚠️ Warning | WR-37 |
| `.planning/REQUIREMENTS.md` | CORE-11 wave-28 correction | Discharge table claims 7 of 8 rows discharged; 2 survive execution | ⚠️ Warning | consequence of CR-11/12/13 |
| — | — | Debt markers (`TBD`/`FIXME`/`XXX`), skipped tests, `.only` | ℹ️ Info | **Zero across both source roots, `scripts/` and `tests/`** |

### Human Verification Required

None arising from this pass. This is an infrastructure/foundation phase and no truth is behavior-unverified: every one of the nine is settled by execution against committed artefacts, a live run result, or a probe I ran in this session. The two judgment-tier prohibitions (CORE-10, STORE-01) remain flagged as NON-AUTHORITATIVE LLM-judge verdicts with human review recommended, carried forward unchanged and already accepted by the operator at UAT.

### Gaps Summary

**One gap, and it is the same one truth for the fourth consecutive round: CORE-11's gate cannot go red on shapes CORE-11's own sentence enumerates.**

Round 5 closed every finding round 4 raised — all five, verified by me, several fixed at the seam rather than the symptom — and it built something no previous round built: a residual that is **generated** from an executed registry and **byte-bound** to the ledger, with the binding mutation-proved red. It also got the checkbox right for the first time in three attempts, and volunteered a discrepancy against itself in the safe direction. That is the most disciplined round of the six.

**And the recurrence survived it, because round 5 made DRIFT mechanical and the recurring defect is a CLAIM.** The generator's output is a function of the registry alone; a registry row's `clause` is hand-written prose that no assertion reads; and a row's only binding to the walk is one probe and one counter-probe. So a clause can say *any literal a name is bound to*, or *a compound assignment*, or *in every spelling*, and be green while a one-line shape falsifies it. I proved the mechanism's blind spot directly: deleting the `PlusEqualsToken` branch — a branch `assembledNames`' clause names in so many words — left the entire derived block at **52 passed, 0 failed**.

Three of the 38 clauses were falsified by execution this round. All three are prospective blindnesses in a test-only gate; **nothing leaks**, and the arithmetic that decides this verdict is the one this phase has enforced six times and enforced correctly again in wave 28: a `verification: gate` requirement is not complete while its gate stays green on a shape the prohibition's own statement enumerates.

The fix that would end the pattern rather than its sixth instance is stated in `missing` and is one field wide: give `ResolverRecord` a `branches` list naming the code sites each clause covers, with one probe per named branch, so that the mutation I ran this afternoon turns the row red instead of nothing at all. Until a clause is bound to its branch, the next round will find a fourth set of causes for the same 8/9.

---

_Verified: 2026-08-24T16:40:00Z_
_Verifier: Claude (gsd-verifier), verification pass 6_
_Working tree restored: all mutations reverted via `git checkout`; `git status` matches the pre-verification snapshot._
