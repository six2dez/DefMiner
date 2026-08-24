# Requirements: DefMiner

**Defined:** 2026-08-20
**Core Value:** When a target's JavaScript contains something that expands the attack surface, DefMiner surfaces it — with a low enough false-positive rate that the operator actually reads every finding.

Requirement IDs are stable. Evidence for the non-obvious ones lives in `.planning/research/SUMMARY.md`.

---

## v1 Requirements

### Feasibility gates (SPIKE)

These run first and can invalidate the design. Each is cheap; several change every size ceiling downstream.

- [x] **SPIKE-01**: Determine whether a catastrophic regex hangs the plugin forever inside Caido, and whether `re2js` is a viable escape hatch at acceptable cost. *(Caido installs no QuickJS interrupt handler — `set_interrupt_handler` appears nowhere in `caido/dependency-llrt`, so `lre_check_timeout` is inert.)*
- [x] **SPIKE-02**: Confirm `setTimeout(fn, 0)` actually yields the QuickJS event loop. If it does not, budget-and-background does not work and the ingestion design must change.
- [x] **SPIKE-03**: Determine what Caido does with `onInterceptResponse` events the plugin cannot consume fast enough — queue unboundedly, drop, or backpressure.
- [x] **SPIKE-04**: Reproduce `caido/caido#2211` on **0.57.1 — the exact build it was filed against**, so this is a direct reproduction rather than an extrapolation. Measure the `sdk.requests.send()` cliff across three variants (`save:true`, `save:false`, `caido:http` `fetch`), each on its **own fresh instance** because the leak is cumulative across a runtime's lifetime and would otherwise pollute later variants. Capture stderr and exit code separately — the `gc_decref_child` assertion is a C-level `abort()` under `panic = "abort"` and never reaches the structured log; look for exit code 134.
- [x] **SPIKE-04b**: Determine whether toggling the plugin off and on **resets the #2211 leak**. The host log shows a per-plugin executor (`plugin|executor: Stopping plugin executor`), suggesting the QuickJS runtime may be per-plugin and torn down on toggle. If it is, ACTIVE-13's crash recovery gains a far cheaper mitigation than "restart Caido". Ten minutes of work, potentially a large design win.
- [x] **SPIKE-05**: Build the event matrix — does `sdk.requests.send()` re-fire `onInterceptResponse`? Do Replay, Automate, imports, and workflows fire it? Does `save:false` or `plugins:false` change it?
- [x] **SPIKE-06**: Measure real CPU and RSS budgets inside Caido (not standalone quickjs-ng), and find where the 512 KiB stack actually breaks.
- [x] **SPIKE-07**: ~~Confirm `structuredClone` exists in Caido's runtime~~ — **ANSWERED during Phase 0 research: it is `undefined` on 0.57.1.** The `meriyah@7` polyfill guard is therefore mandatory and unconditional, not defensive. Phase 0 need only regression-assert this alongside the other capability probes.
- [x] **SPIKE-08**: Determine whether proxied bodies are stored decompressed, and whether `Body.length` equals `toRaw().length`.
- [x] **SPIKE-09**: Verify `PRAGMA` and `BEGIN`/`COMMIT` survive across `exec` calls on the pooled SQLite connection.
- [x] **SPIKE-10**: Measure the content-hash cache hit rate on real browsing. *(Biggest single performance lever — at 40% instead of 90%, CPU cost is 6× budget.)*
- [x] **SPIKE-11**: Determine whether 304s and cached responses reach the hook at all — decides whether retroactive scanning is optional or mandatory for correctness.
- [x] **SPIKE-12**: Establish `llrt/fs` containment behaviour. **ANSWERED, and the premise in this line was half wrong: `lstat` IS available** on 0.57.1 and correctly distinguishes a symlink from its target. `realpath` and `readlink` are not. That materially improves MAP-04's options — a prefix rule can walk components with `lstat` instead of relying on lexical normalisation alone. Measured: of 22 hostile fixtures, 5 escape via `path.resolve` and are caught lexically, but writing through a symlink the lexical rule accepts *does* leave the scratch root. Two collisions were visible only on disk (NFD folded onto NFC; `SRCDIR` onto `srcdir`), so 15 accepted writes produced 13 files. See `SPIKE-12.json`.

### Ingestion pipeline (CORE)

> **MEASURED CONSTRAINT — `onInterceptResponse` IS A PROXY-ONLY HOOK.** SPIKE-05 tested 11 cells across 7 surfaces on 0.57.1. Replay, Automate, an active workflow's `sdk.requests.send()`, the plugin's own `send()` in **all four** `save`/`plugins` combinations, and `caido:http` `fetch` **all reached the origin** — proven by the origin's own log, each receiving a 200 with the full 457,965-byte body — and **delivered nothing to the hook**. A closing proxy control fired after every negative, so none was a dead handler.
>
> Two consequences. **Good:** `SEND_REFIRES_INTERCEPT=false`, so plugin-generated traffic cannot re-enter the pipeline and ACTIVE-06's recursion guard becomes trivial. **Bad, and unconditional:** a passive-only DefMiner is **blind to every operator-driven surface**. Traffic a hunter sends through Replay or Automate is invisible to it. This is a product limitation, not a bug to fix — it is the shape of the platform.

- [x] **CORE-01**: `onInterceptResponse` handler is non-async, applies cheap admission gates, enqueues the request ID, and returns. It never analyses inline. *(Cross-reference, 2026-08-21: the OUTBOUND-TRAFFIC prohibition that was tagged CORE-01 until this date is now **CORE-11**. This requirement is only about the handler. Somebody arriving here looking for the prohibition should go there.)*
- [x] **CORE-02**: Admission filter gates on content type, URL extension, response size, and Caido scope before anything is enqueued.
- [x] **CORE-03**: The work queue is bounded, with visible overflow. It is never an unbounded array. *(JS-Analyzer's `autoScanQueue` is pushed to and drained by nothing — the failure mode to avoid.)* **SPIKE-03 measured Caido's side: it queues generously and loses nothing.** 500 responses issued while the handler spun; all 500 returned 200 to the client in 715 ms — the proxy never stalled — and all 500 were delivered, 1 during the block and 499 in a 20 ms burst after release, sequence contiguous. Blocked p99 and max were *lower* than the idle baseline. So back-pressure is ours to impose: Caido will happily hand us everything, and an unbounded queue is our failure, not one it protects us from.
- [x] **CORE-04**: Exactly one CPU consumer processes the queue. Concurrency is 1, because the runtime is single-threaded and higher concurrency only multiplies peak memory and latency.
- [x] **CORE-05**: The consumer reloads work via `sdk.requests.get(id)` rather than retaining SDK objects across `await` points.
- [x] **CORE-06**: Analysis is chunked at 64 KB with 4 KB overlap for **matching-window** purposes, but the **yield trigger is temporal, not geometric**: accumulate synchronous work and yield when elapsed time approaches the slice budget. *(Measured on 0.57.1: `setTimeout(r,0)` is the only primitive that genuinely yields — service ratio 0.76 versus 0.00 for both `setImmediate` and `Promise.resolve()` — and it costs a median 5.67 ms per yield. Yielding per 64 KB chunk would cost 128 yields ≈ 730 ms of pure overhead on an 8 MB bundle. At a 25 ms slice the overhead is 19% instead.)*
- [x] **CORE-07**: Wall-clock deadlines are checked between chunks; exceeding budget degrades the result to a recorded partial state rather than freezing.
- [x] **CORE-08**: Content identical to something already analysed at the current detector-corpus version is never re-analysed.
- [x] **CORE-09**: Project switches cancel in-flight work and never leak results across projects.
- [x] **CORE-10**: Telemetry records the maximum synchronous slice actually observed in the field, so the budget is provable rather than asserted.
- [ ] **CORE-11**: No code that ships in the plugin issues an outbound network request in this phase — no `caido:http` fetch, no `sdk.requests.send` in any spelling, no method of an identified `requests` or `net` receiver outside a read-only allowlist (`get`/`query`/`inScope`), no global `fetch` by any receiver or alias, no `XMLHttpRequest`, `WebSocket` or `EventSource`, no `navigator.sendBeacon`, no dynamic code construction (`eval`, `new Function`) in shipped source, and no speculative retrieval of any kind. Gated by `packages/backend/src/outbound-prohibition.spec.ts` over BOTH shipped source roots — `packages/backend/src` and `packages/engine/src`. *(Split out of CORE-01 on 2026-08-21, in gap-closure round 2 wave 10, BEFORE the plan that owns the gate declares it. CORE-01's text is the non-async-handler requirement and says nothing about outbound traffic, while the prohibition tagged CORE-01 was entirely about outbound traffic. One id meaning two things misleads a future reader about which of them a gate enforces, and it misleads MOST in plan frontmatter, which is what a verifier reads — so the id had to exist before plan 01-12 ran. Settled the way the operator settled the structurally identical question at this phase's UAT — "Re-scope STORE-01 + open a new requirement" — the STORE-01 → STORE-08 precedent, not a planner's preference. HONEST STATUS: the must-NOT itself holds — no outbound call exists in any non-spec source under either root, and `check:bundle` reports the shipped bundle's whole import set as one specifier, `crypto` — but the wired ENFORCEMENT was still PARTIAL at the moment this id was opened: the 2026-08-21T13:45 re-verification found the gate blind to `globalThis.fetch`, a destructured receiver, `.call`/`.apply`, computed keys and the entire `packages/engine/src` tree. Plan 01-12 owns closing that, and owns retagging the gate's own header and failure strings. — CORRECTION 2026-08-22, plan 01-16: the PARTIAL status above is CLOSED and is retained only so the history reads straight. Plan 01-12 closed the five blindnesses it names; plan 01-16 then closed what the round-3 review and the verifier found left over — the gate applied "could not read does not mean clean" to computed MEMBERS but not to computed RECEIVERS, so `sdk["req" + "uests"].send(req)` and `globalThis["fet" + "ch"](u)` returned empty lists; and two surfaces were quiet AND undisclosed, `navigator.sendBeacon` and dynamic code construction. Both are now enumerated in the requirement text above and enforced by named rules — `outbound-beacon` and `outbound-dynamic-code` — with per-widening mutation proofs recorded in `01-16-SUMMARY.md`. The residual that REMAINS, and it is disclosed rather than closed: a merely dynamic key (`sdk[k]`), a value crossing a function boundary, and more than one hop of indirection, all stated in that gate's boundary 2 and accepted as T-01-51. — CORRECTION 2026-08-24, plan 01-18: the residual sentence immediately above was WRONG, and wrong in a way that mattered more than the shapes it missed. CR-08 executed the gate and found that a one-hop ASSEMBLED key — `const k = "req" + "uests"; sdk[k].send(req)` — reported NOTHING, while the member-level twin (`const m = "se" + "nd"; sdk.requests[m](req)`) and the global-level twin (`const k = "fet" + "ch"; globalThis[k](url)`) both reported: the WR-19 asymmetry surviving one level up, in the file rewritten for it one wave earlier. Sharper still, `sdk[b ? "requests" : "net"].send(req)` was silent and was named by NONE of the three residual categories listed above — a conditional of two string literals is not a merely dynamic key, not a function boundary and not more than one hop, so the disclosure did not merely understate the residual, it omitted a shape entirely. `sdk[(0, "requests")]` likewise. Nothing leaked: this was a PROSPECTIVE blindness in a gate that runs green over the real tree, not a live exposure. Plan 01-18 closed it. NOW REPORTED, each pinned by a mutation-proven fixture titled with the mechanism that resolves it: a literal key; a key bound ONE HOP to a literal (`constStrings`); a key assembled inline (`isAssembledKey`); a key bound ONE HOP to an assembly in EVERY spelling — `+`, a template, `.join("")`, an opaque call — through either a declaration or an assignment (`assembledNames`); a CONDITIONAL key resolved on both branches; and a COMMA SEQUENCE resolved to its rightmost operand. THE RESIDUAL THAT REMAINS, in the same words as that gate's boundary 2 and as `.planning/STATE.md`'s P9-D3 amendment: more than ONE HOP of indirection, a value crossing a FUNCTION BOUNDARY, and a key the walk NEVER SAW BOUND — a parameter, a loop binding, a name bound out of document order or in another file. That exemption was set by real-tree measurement (`compat.ts`'s `at()` `cur[key]` and `ctx[root]`; `observations.ts`'s `segments[i]`; `MIGRATIONS[MIGRATIONS.length - 1]`) and RE-MEASURED after the widening: 23 files over both roots, ZERO violations. All four are asserted quiet by name. THE BOX STAYS `[ ]` DELIBERATELY, AND THIS IS THE REASON, RECORDED HERE RATHER THAN ONLY IN A PLAN: the requirement's own text above enumerates "no dynamic code construction (`eval`, `new Function`)", and `const e = eval; e(s)` — a one-hop binding of `eval` — is STILL SILENT (WR-23), as is `const g = globalThis` (IN-20). While any shape this requirement's own text enumerates is unenforced, its stated reach exceeds its executed reach, which is precisely the defect this correction closes one level down. CORE-11 was reverted from `[x]` to `[ ]` at commit `e7cc4b6` for exactly this reason; re-checking it one blindness early would repeat the act that revert undid. Plan 01-19 closes WR-23 and IN-20 and OWNS flipping this box, against a discharge table. — CORRECTION 2026-08-24, plan 01-19: THIS BOX IS NOW `[x]`, AND IT IS FLIPPED AGAINST AN ITEM-BY-ITEM DISCHARGE OF THE ENUMERATION IN THIS REQUIREMENT'S OWN FIRST SENTENCE, NOT AGAINST AN INTENTION. What was open when plan 01-18 deliberately left it `[ ]`: CR-08 (the receiver key, closed by 01-18), WR-23 (`const e = eval; e(s)`, `const { eval: ev } = globalThis; ev(s)`, `const F = Function; new F("a", s)` and `const W = WebSocket; new W(url)` all reported NOTHING — the dynamic-code rule was written between `fetchAliases` and `navigatorAliases` and given the alias handling of neither, while its own docblock told a reader it reached as far as the receiver rules beside it), WR-26 (`isProvablyNumeric`'s docblock claimed it PROVES rather than assumes and fails SAFE, while two of its branches decide by MEMBER NAME and fail OPEN), and IN-20 (`const g = globalThis; g.fetch(u)` was silent — the aliases resolved one hop and the receiver they sit on did not). ALL FOUR ARE CLOSED, each by a fixture that has been OBSERVED FAILING and restored: four separate mutation proofs are pasted in `01-19-SUMMARY.md`, and the eight-row discharge table there names, per enumerated surface, the rule identifier that fires, the fixture that asserts it and the plan that watched that fixture fail. WR-26 was resolved by correcting the DOCBLOCK rather than the branch, and the choice was made by MEASUREMENT: the narrowing the review proposed was applied and run and changed nothing at all, while removing the branch entirely changed exactly two shapes, both ordinary `+` index compositions of the kind that got the broad WR-19 rule narrowed — and WR-26's own motivating shape `sdk[o.length].send(req)` is silent under EVERY variant, because a bare member is not an assembled key either, so it is residual (b) that silences it and never the numeric exemption. Nothing leaked at any point: all four were PROSPECTIVE blindnesses in a gate that runs green over the real tree, 23 files and ZERO violations re-measured after every widening. THE RESIDUAL THAT REMAINS, in the same words as that gate's `THE FINAL RESIDUAL, AFTER PLAN 01-19` block, `.planning/STATE.md`'s P9-D3 amendment and `.planning/WINDOWS.md`: CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. **FALSIFIED 2026-08-24 (CR-09) — the clause that begins here and ends at “no second pass” was EXECUTED and DISPROVED; its words below are preserved byte-for-byte as the record of what was believed, and the measured bound that replaces it is in the plan 01-23 correction at the end of this entry.** A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in DOCUMENT ORDER: `const a = globalThis; const b = a; const g = b; g.fetch(u)` reports and so does the `sdk.requests` twin, while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary `+` indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name. A CORRECTION TO THE PREVIOUS RESIDUAL, FOUND BY MEASUREMENT WHILE WRITING A FIXTURE FOR IT: every residual list before this one, back to the first, bounded the walk at `more than ONE HOP of indirection`. That is exactly right for a receiver KEY and it UNDERSTATED the walk for ALIASES, which chain to arbitrary depth because each set is grown by consulting the live set. It is the same text-versus-execution defect this phase has corrected four times, running for once in the direction of the gate reaching FURTHER than its disclosure — recorded because a residual list is trusted for its completeness in both directions. WHAT MAKES THIS CHECKING DIFFERENT FROM THE ONE `e7cc4b6` REVERTED: that revert was correct, and its reason was that the gate could not go red on a shape this requirement's own statement enumerated — dynamic code construction. It now can, in every spelling the neighbouring alias sets resolve, and the fixture for each has been watched failing rather than assumed to work. The box is flipped after the discharge table, not before it; the table is the evidence and the box is not. — CORRECTION 2026-08-24, plan 01-23: THE RESIDUAL SENTENCE PLAN 01-19 WROTE IMMEDIATELY ABOVE IS FALSE, AND THE BOX IS `[ ]` AGAIN. CR-09 executed the gate rather than reading it. `auditSource` runs `collect(sf)` to COMPLETION at `:1521` and only then runs `visit(sf)` at `:1726`, so every alias set, every string map and every poisoned name is fully populated before the first violation is considered — the position of a USE cannot bound anything at all. Seven shapes the marked clause above calls silent were executed and every one reports: `g.fetch(u); const g = globalThis;` → `["outbound-fetch"]`; `function z(){ return g.fetch(u); } const g = globalThis;` → `["outbound-fetch"]`; `sdk[r].send(req); const r = "requests";` → `["outbound-send"]`; `sdk[k].send(req); const k = "req"+"uests";` → `["outbound-unanalysable"]`; `s.send(req); const s = sdk.requests;` → `["outbound-send"]`; `n.sendBeacon(u,d); const n = navigator;` → `["outbound-beacon"]`; `e("x"); const e = eval;` → `["outbound-dynamic-code"]`. AND THE FIXTURE THAT CLAIMED TO PIN THE FALSE BOUND WAS GREEN THROUGH A DIFFERENT MECHANISM THAN ITS TITLE NAMED: the case titled for a chain read before its root was silenced by its INVERTED BINDINGS (`const g = a; const a = globalThis;`), proven both ways — wrapper removed and the read moved last, still `[]`; wrapper kept and the root bound directly, it reports. That is the same title-versus-mechanism substitution CR-08 was raised for, and it is its third instance in that file. Plan 01-23 split it into two halves, one varying the BINDINGS and one varying the READ, and added a three-case discrimination that distinguishes the two. THE MEASURED BOUND, IN THE GATE HEADER'S WORDS, copied from `packages/backend/src/outbound-prohibition.spec.ts`'s `THE FINAL RESIDUAL, AFTER PLAN 01-23` block rather than paraphrased from it: CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, provided each link's DECLARATION appears after the declaration of the name it is grown from. The MECHANISM is why, and it is stated here rather than only its consequence, because a consequence on its own is what the last four rounds each paraphrased wrongly: `auditSource` runs `collect(sf)` to COMPLETION and only then runs `visit(sf)`, and every alias set is grown by consulting the LIVE set during that one collect pass. So `const a = globalThis; const b = a; const g = b; g.fetch(u)` reports, the `sdk.requests` twin reports, and a four-hop chain reports with the USE written ABOVE all four declarations — the use site's POSITION IS IRRELEVANT. What is silent is an INVERTED BINDING: `const b = a; const a = fetch; b(u)` reports nothing, because `a` is not yet in the set when `b`'s declaration is read, and it stays silent wherever the read is placed. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary `+` indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19 and again in plan 01-23: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name. WHY THE BOX IS `[ ]` HERE. Commit `faca607` reverted CORE-11 from `[x]` to `[ ]` for exactly this reason — the `[x]` plan 01-19 set was flipped against the text marked FALSIFIED above, so it was checked against a disclosure whose stated reach exceeded its executed reach, which is the very defect the earlier `e7cc4b6` revert had already undone once. Plan 01-23 does NOT flip it back and does not argue that it could be flipped: wave 28 owns the flip, and only against wave 27's DERIVED residual, not against an authored one. WHAT THIS CORRECTION DOES NOT DO, STATED HERE RATHER THAN ONLY IN A SUMMARY, BECAUSE THE LEDGER IS WHERE AN OVERCLAIM WOULD DO ITS DAMAGE: it closes CR-09's INSTANCE and it does not close the CLASS. This is the FIFTH consecutive round in which a bound was authored rather than derived and then turned out false, and the only thing that changes that is the derivation wave 27 builds. THE POINTER-NOT-A-BOUND RULE THESE HISTORIES FOLLOW FROM WAVE 27 ONWARD IS A PROHIBITION WITH NO MECHANICAL CHECK: wave 27's byte comparison reaches the gate header and this file and nothing else, so nothing stops a round-6 author writing a fresh bound into `.planning/STATE.md` or into a `WINDOWS.md` entry. That limit is written down here rather than left implicit, because leaving it implicit is how this started. SEVERITY, NOT INFLATED: nothing leaked. The must-NOT holds, no outbound call exists in any non-spec source under either root, the gate runs green over the real tree — 23 files, ZERO violations — inside a 1117-test suite, and `pnpm check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. CR-09 is a false DISCLOSURE about a test-only gate, not an exposure.)*

**CORE-11 — THE DERIVED RESIDUAL, INSTALLED 2026-08-24 BY PLAN 01-27 (gap-closure round 5, wave 27).**

**WHICH HALF OF THIS ENTRY EACH RULE APPLIES TO, STATED IN ONE SENTENCE SO NOBODY HAS TO GUESS.** Everything ABOVE the BEGIN sentinel below — the requirement's own text and every dated correction, back to the 2026-08-21 split — is HAND-WRITTEN HISTORY and stays byte-identical under append-never-rewrite; the span BETWEEN the two sentinels is MACHINE-OWNED, is regenerated in place by `deriveResidual(RESOLVER_REGISTRY)` in `packages/backend/src/outbound-prohibition.spec.ts`, and is the only part of this entry a later plan may rewrite.

**WHY THIS ENTRY CARRIES THE TEXT AND NOT A POINTER.** This is the text a requirement's COMPLETION is read against, and it is the copy that drifted through five consecutive rounds — CORE-11's box was flipped against it once and reverted twice. A pointer here would leave the ledger a reader trusts most as the one surface that can still be wrong. A test in the gate file reads THIS FILE at test time, extracts the span below with `extractDerivedBlock`, and compares it to the generated text byte for byte; editing one word of the span turns the suite red.

**THE SURFACE DECISION, wave 27, written here because this is one of the four places the difference is visible.** The DERIVED text ships in exactly TWO surfaces — the gate header and this entry — and BOTH are byte-compared to `deriveResidual(RESOLVER_REGISTRY)` by the suite. `.planning/STATE.md` and `.planning/WINDOWS.md` carry a POINTER to those two and restate NO bound of their own, because they are append-only DATED HISTORIES: a block regenerated inside one would rewrite the record of what was believed and when, which is the only thing that makes a history worth keeping. That pointer-not-a-bound rule is a PROHIBITION WITH NO MECHANICAL CHECK — the byte comparison reaches these two surfaces and no further — and it is named as an unguarded limit rather than left implicit.

**THE LIMITS, IN ONE SENTENCE, BECAUSE THE LEDGER IS WHERE AN OVERCLAIM DOES ITS DAMAGE:** this makes the class MECHANICALLY DETECTABLE and does not CLOSE it — every entry below is verified by execution, but the registry is not proven complete, the coverage guard reaches two enumerated populations and names its exemptions rather than covering every shape a resolver can be written in, and each entry's probes are examples rather than a proof of that resolver's domain.

**THE BOX IS DELIBERATELY STILL `[ ]`.** Plan 01-27 does not flip it and does not argue that it could be flipped; wave 28 owns the flip, and only against the block below.

<!-- BEGIN DERIVED RESIDUAL - generated by deriveResidual(RESOLVER_REGISTRY) in packages/backend/src/outbound-prohibition.spec.ts - MACHINE-OWNED, DO NOT HAND-EDIT -->
THE RESIDUAL OF CORE-11's OUTBOUND WALK - DERIVED, NOT AUTHORED.
This text is the output of deriveResidual(RESOLVER_REGISTRY) in
packages/backend/src/outbound-prohibition.spec.ts. It is machine-owned: a test
reads this file's own bytes, extracts the span between the sentinels, and
compares it to that output. If the two disagree the GENERATED text is
authoritative and the shipped text is the defect.

WHAT THIS TEXT ESTABLISHES, AND WHAT IT DOES NOT.
1. Each entry below is verified by EXECUTION: its probe and its counter-probe
   are run through auditSource and asserted against the rule identifiers
   recorded here, so a branch removed from the walk turns its own entry red.
2. It does NOT prove the registry enumerates every mechanism the walk has. A
   coverage guard enumerates TWO populations out of this file's own source -
   collectors matching a declared naming convention, and resolver functions
   declared inside the audit function or at module scope in the resolver
   region - and requires each member to be an entry below OR a NAMED, reasoned
   entry on an explicit exemption list. The bound is REGISTERED OR LISTED over
   those two populations. It is NOT `detectable`: a resolver written as NEITHER
   shape - an inline branch in the walk, a differently-shaped binding, a
   resolver declared inside another function - is enumerated by neither half
   and is NOT caught.
3. Each entry's probes are EXAMPLES. They prove the entry true OF ITSELF and
   do not cover that resolver's whole domain.
4. The MEASURED SILENCE entries are NOT proven exhaustive: a shape nobody
   thought of is still silent and still unlisted here.

RESOLVERS - 31 entries.

* constStrings - a receiver or global KEY resolves when ANY string literal the name is bound to anywhere in the file names an outbound receiver; bindings are file-wide and ANY-BINDING-WINS, so this collector OVER-approximates
    read off:  auditSource > const constStrings = new Map<string, Set<string>>()
    probe:     "const r = \"requests\";\nsdk[r].send(req);"
    reports:   outbound-send
    counter:   "const r = \"harmless\";\nsdk[r].send(req);"
    reports:   [] - nothing

* assembledNames - a name the walk WATCHED being assembled - at a declaration, an assignment, a compound assignment, or either binding-pattern spelling - is an UNREADABLE key, and takes precedence over any literal binding of the same name
    read off:  auditSource > const assembledNames = new Set<string>()
    probe:     "const k = \"req\" + \"uests\";\nsdk[k].send(req);"
    reports:   outbound-unanalysable
    counter:   "let i = 0;\ni += 1;\nsdk[i].send(req);"
    reports:   [] - nothing

* receiverAliases - a name bound to an outbound RECEIVER expression is that receiver everywhere in the file; grown from the LIVE set during the collect pass, so a chain resolves to any depth in DECLARATION order
    read off:  auditSource > const receiverAliases = new Map<string, string>()
    probe:     "const r = sdk.requests;\nr.send(req);"
    reports:   outbound-send
    counter:   "const r = sdk.other;\nr.send(req);"
    reports:   [] - nothing

* unreadableAliases - a name bound to a receiver EXPRESSION the walk could not read is reported where the name is USED as a receiver, not where it was bound - so an ordinary dynamic lookup never used as a receiver stays quiet
    read off:  auditSource > const unreadableAliases = new Set<string>()
    probe:     "const r = sdk[\"req\" + \"uests\"];\nr.send(req);"
    reports:   outbound-unanalysable
    counter:   "const v = record[\"na\" + \"me\"];\nconsole.log(v);"
    reports:   [] - nothing

* fetchAliases - a name bound to the global fetch is the global fetch; seeded with the bare spelling and grown from the live set, so it chains in declaration order
    read off:  auditSource > const fetchAliases = new Set<string>([FETCH_GLOBAL])
    probe:     "const f = fetch;\nf(url);"
    reports:   outbound-fetch
    counter:   "const f = cache.fetch;\nf(url);"
    reports:   [] - nothing

* navigatorAliases - a name bound to navigator is navigator; RECEIVER-ANCHORED, so an ordinary object defining a method of the same name grows nothing
    read off:  auditSource > const navigatorAliases = new Set<string>([NAVIGATOR])
    probe:     "const n = navigator;\nn.sendBeacon(u, d);"
    reports:   outbound-beacon
    counter:   "const o = { sendBeacon(u, d) { return d; } };\no.sendBeacon(u, d);"
    reports:   [] - nothing

* globalAliases - a name bound to eval, Function or an outbound constructor maps to the global it names, so the violation detail can name the surface the local aliases; RECEIVER-ANCHORED off the four global receivers
    read off:  auditSource > const globalAliases = new Map<string, string>()
    probe:     "const e = eval;\ne(src);"
    reports:   outbound-dynamic-code
    counter:   "const o = { eval(s) { return s; } };\nconst e = o.eval;\ne(src);"
    reports:   [] - nothing

* globalThisAliases - a name WATCHED being bound to one of the four global receivers is a global receiver; seeded EMPTY so the bare-identifier answer is unchanged and the new behaviour is reachable only through what the walk saw bound
    read off:  auditSource > const globalThisAliases = new Set<string>()
    probe:     "const g = globalThis;\ng.fetch(url);"
    reports:   outbound-fetch
    counter:   "const g = helper;\ng.fetch(url);"
    reports:   [] - nothing

* shadowedGlobals - a NARROWING collector: a TOP-LEVEL function or class declaration of a dynamic-code or outbound-constructor name provably rebinds that name for the module, so the bare call is not the global. Its probe is the shape that stays QUIET and its counter-probe is the shape that REPORTS
    read off:  auditSource > const shadowedGlobals = new Set<string>()
    probe:     "function Function(a) { return a; }\nFunction(\"x\");"
    reports:   [] - nothing
    counter:   "Function(\"x\");"
    reports:   outbound-dynamic-code

* numericNames - a NARROWING collector: a name bound only to provably numeric values is an INDEX rather than a hidden receiver name, and is excluded before any receiver rule runs. Probe stays quiet, counter-probe reports
    read off:  auditSource > const numericNames = new Set<string>()
    probe:     "let i = 0;\nsdk[i].send(req);"
    reports:   [] - nothing
    counter:   "let i = \"requests\";\nsdk[i].send(req);"
    reports:   outbound-send

* poisonedNumericNames - the negative half of the numeric exemption: a name bound to ANYTHING non-numeric anywhere in the file stops being an index, so a numeric accumulator later assigned a receiver name reports
    read off:  auditSource > const poisonedNumericNames = new Set<string>()
    probe:     "let i = 0;\ni = \"requests\";\nsdk[i].send(req);"
    reports:   outbound-send
    counter:   "let i = 0;\ni = 2;\nsdk[i].send(req);"
    reports:   [] - nothing

* isGlobalReceiver - one-hop resolution of a GLOBAL receiver closed over the live alias set, so a member of an aliased global receiver that will not reduce is reported rather than dropped
    read off:  auditSource > const isGlobalReceiver = (node: ts.Expression): boolean =>
    probe:     "const g = globalThis;\ng[\"fet\" + \"ch\"](url);"
    reports:   outbound-unanalysable
    counter:   "const g = helper;\ng[\"fet\" + \"ch\"](url);"
    reports:   [] - nothing

* keyReceiver - the SINGLE definition of what a readable key is, in the order: watched assembly, then any literal binding, then inline assembly, then not a receiver; it descends operators through operatorReceiver passing ITSELF, so nesting resolves at any depth
    read off:  auditSource > const keyReceiver = (key: ts.Expression): ReceiverKind => {
    probe:     "sdk[b ? \"requests\" : \"net\"].send(req);"
    reports:   outbound-send
    counter:   "sdk[b ? \"x\" : \"y\"].send(req);"
    reports:   [] - nothing

* receiverKind - the three-state answer for an expression in RECEIVER position - THAT RECEIVER, UNREADABLE, or NOT A RECEIVER - including a bare operator written directly in call position, which fell through every branch before wave 25
    read off:  auditSource > const receiverKind = (node: ts.Expression): ReceiverKind => {
    probe:     "(b ? sdk.requests : sdk.net).send(req);"
    reports:   outbound-send
    counter:   "(b ? cache : client).send(req);"
    reports:   [] - nothing

* literalsOf - the MULTI-valued string reader keyReceiver consults: every literal a name carries, so ANY of them naming a receiver reports
    read off:  auditSource > function literalsOf(node: ts.Node | undefined): ReadonlySet<string> {
    probe:     "let k = \"harmless\";\nk = \"requests\";\nsdk[k].send(req);"
    reports:   outbound-send
    counter:   "let k = \"harmless\";\nk = \"other\";\nsdk[k].send(req);"
    reports:   [] - nothing

* literalOf - the SINGLE-valued string reader member names and module specifiers need: one binding resolves, two or more answer undefined, and undefined means COULD NOT READ at every call site - which reports
    read off:  auditSource > function literalOf(node: ts.Node | undefined): string | undefined {
    probe:     "const s = \"caido:http\";\nawait import(s);"
    reports:   outbound-import
    counter:   "const s = \"crypto\";\nawait import(s);"
    reports:   [] - nothing

* memberName - the member name of a positively identified receiver, read single-valued; a name that will not reduce to exactly one literal is reported as unreadable rather than assumed harmless
    read off:  auditSource > const memberName = (
    probe:     "let m = \"harmless\";\nm = \"send\";\nsdk.requests[m](req);"
    reports:   outbound-unanalysable
    counter:   "const m = \"get\";\nsdk.requests[m](id);"
    reports:   [] - nothing

* initializerReceiver - a NAME for receiverKind since wave 25, so initializer position and call position give the same answer and the `??` precedence bug that let an UNREADABLE left branch shadow a NAMED right branch is gone
    read off:  auditSource > const initializerReceiver = (node: ts.Expression): ReceiverKind =>
    probe:     "const r = b ? sdk.requests : sdk.net;\nr.send(req);"
    reports:   outbound-send
    counter:   "const r = b ? cache : client;\nr.send(req);"
    reports:   [] - nothing

* isFetchExpression - the global fetch in every reachable spelling - bare, on any of the four global receivers, or through an alias - and NOT a fetch method of an ordinary object
    read off:  auditSource > const isFetchExpression = (node: ts.Expression): boolean => {
    probe:     "globalThis.fetch(url);"
    reports:   outbound-fetch
    counter:   "client.fetch(url);"
    reports:   [] - nothing

* isNavigatorReceiver - navigator reached bare, through a global receiver, or through a one-hop alias; RECEIVER-ANCHORED so a member named sendBeacon on an ordinary object stays quiet
    read off:  auditSource > const isNavigatorReceiver = (node: ts.Expression): boolean => {
    probe:     "globalThis.navigator.sendBeacon(u, d);"
    reports:   outbound-beacon
    counter:   "o.navigator.sendBeacon(u, d);"
    reports:   [] - nothing

* globalNameOf - which global a spelling names - bare identifier, member of a global receiver, or a collected alias - so the violation detail names the aliased surface instead of leaving a reader to find the binding
    read off:  auditSource > const globalNameOf = (node: ts.Expression): string | undefined => {
    probe:     "const F = Function;\nnew F(src);"
    reports:   outbound-dynamic-code
    counter:   "const F = o.Function;\nnew F(src);"
    reports:   [] - nothing

* dynamicCodeOf - eval and Function in call position, refused outright rather than analysed, because no AST gate can see inside a string
    read off:  auditSource > const dynamicCodeOf = (node: ts.Expression): string | undefined => {
    probe:     "eval(src);"
    reports:   outbound-dynamic-code
    counter:   "o.eval(src);"
    reports:   [] - nothing

* outboundCtorOf - XMLHttpRequest, WebSocket and EventSource in construction position, bare or on a global receiver or through an alias
    read off:  auditSource > const outboundCtorOf = (node: ts.Expression): string | undefined => {
    probe:     "new XMLHttpRequest();"
    reports:   outbound-global-ctor
    counter:   "new Foo();"
    reports:   [] - nothing

* aliasedGlobalOf - the three binding shapes an outbound global can be aliased through - a bare identifier, a member of a global receiver, and a destructure off one - anchored so a destructure off an ordinary object grows nothing
    read off:  auditSource > const aliasedGlobalOf = (init: ts.Expression): string | undefined => {
    probe:     "const { eval: ev } = globalThis;\nev(src);"
    reports:   outbound-dynamic-code
    counter:   "const { eval: ev } = o;\nev(src);"
    reports:   [] - nothing

* unwrap - strips parentheses, `as`/satisfies assertions, non-null assertions and a COMMA SEQUENCE down to its rightmost operand, so a wrapped receiver is still that receiver
    read off:  module scope > function unwrap(node: ts.Expression): ts.Expression {
    probe:     "(0, sdk.net).connect(x);"
    reports:   outbound-net
    counter:   "(0, cache).send(req);"
    reports:   [] - nothing

* operatorReceiver - ONE descent for the four RECEIVER_OPERATORS (`? :`, `??`, `||`, `&&`) reached from receiverKind and keyReceiver and from NOWHERE ELSE: any operand naming a receiver makes the expression that receiver, else any unreadable operand makes it unreadable, else it is not a receiver
    read off:  module scope > const operatorReceiver = (
    probe:     "(sdk.requests ?? sdk.net).send(req);"
    reports:   outbound-send
    counter:   "(cache ?? client).send(req);"
    reports:   [] - nothing

* isProvablyNumeric - a NARROWING resolver: a key provably numeric - a numeric literal, a collected numeric name, `+`/`-` over two numeric operands, or a member or call named in NUMERIC_MEMBERS - is an INDEX and is excluded before any receiver rule runs. The NUMERIC_MEMBERS half is a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed
    read off:  module scope > function isProvablyNumeric(
    probe:     "let i = 0;\nsdk[i + 1].send(req);"
    reports:   [] - nothing
    counter:   "const o = { max: \"requests\" };\nsdk[o.max + \"\"].send(req);"
    reports:   outbound-unanalysable

* isAssembledKey - a key the walk WATCHES being built inline - concatenated, interpolated, or returned by a call that is not provably numeric - is UNREADABLE, a third state distinct from `not a receiver`
    read off:  module scope > function isAssembledKey(
    probe:     "sdk[\"req\" + \"uests\"].send(req);"
    reports:   outbound-unanalysable
    counter:   "sdk[\"requests\"].send(req);"
    reports:   outbound-send

* isGlobalReceiverIn - whether an expression is one of the four global receivers or a collected one-hop alias of one; the depth question is answered by the alias entries above and NOT restated here (WR-30)
    read off:  module scope > function isGlobalReceiverIn(
    probe:     "globalThis[\"fet\" + \"ch\"](url);"
    reports:   outbound-unanalysable
    counter:   "o[\"fet\" + \"ch\"](url);"
    reports:   [] - nothing

* boundPropertyName - the property a binding element reads, including the RENAMED spelling `{ p: k }`, so a destructured assembly is bound to the local name rather than the source key
    read off:  module scope > function boundPropertyName(el: ts.BindingElement): string | undefined {
    probe:     "const { p: k } = { p: \"req\" + \"uests\" };\nsdk[k].send(req);"
    reports:   outbound-unanalysable
    counter:   "const { p: k } = { p: \"harmless\" };\nsdk[k].send(req);"
    reports:   [] - nothing

* destructuredInitializer - the initializer a binding element resolves to in BOTH binding-pattern spellings - object property and array slot - so a declared assembly reached through a destructure is read (IN-26)
    read off:  module scope > function destructuredInitializer(
    probe:     "const [k] = [\"req\" + \"uests\"];\nsdk[k].send(req);"
    reports:   outbound-unanalysable
    counter:   "const [k] = [1];\nsdk[k].send(req);"
    reports:   [] - nothing

MEASURED SILENCES - 7 entries.

* silence-two-hop-key - residual (a), KEY half: TWO HOPS of key is silent. constStrings and assembledNames read the INITIALIZER'S SHAPE and never the live set, so a key cannot be grown from a name already in a set and therefore cannot chain. ONE hop reports - that is the counter-probe
    read off:  auditSource > const constStrings = new Map<string, Set<string>>()
    probe:     "const a = \"requests\";\nconst b = a;\nsdk[b].send(req);"
    reports:   [] - nothing
    counter:   "const b = \"requests\";\nsdk[b].send(req);"
    reports:   outbound-send

* silence-function-boundary - residual (a), FUNCTION half: a receiver crossing a function boundary is silent. The walk builds no symbol table and does not follow a return value. The one-hop binding of the same receiver reports - that is the counter-probe
    read off:  auditSource > const receiverKind = (node: ts.Expression): ReceiverKind => {
    probe:     "function pick() { return sdk.requests; }\npick().send(req);"
    reports:   [] - nothing
    counter:   "const r = sdk.requests;\nr.send(req);"
    reports:   outbound-send

* silence-parameter-key - residual (b): a key the walk never saw BOUND - here a parameter - is not reported. Set by real-tree MEASUREMENT, not preference: reporting every unreduced key fired on compat.ts:141's ctx[root]. The same site with a bound literal reports
    read off:  auditSource > const keyReceiver = (key: ts.Expression): ReceiverKind => {
    probe:     "function at(root) { return sdk[root].send(req); }"
    reports:   [] - nothing
    counter:   "const root = \"requests\";\nsdk[root].send(req);"
    reports:   outbound-send

* silence-loop-binding-key - residual (b): a key bound by a for...of or for(;;) header is not reported. Measured on compat.ts's documented at() dotted-path walk. The same lookup with a bound literal reports
    read off:  auditSource > const keyReceiver = (key: ts.Expression): ReceiverKind => {
    probe:     "for (const key of path.split(\".\")) { sdk[key].send(req); }"
    reports:   [] - nothing
    counter:   "const key = \"requests\";\nsdk[key].send(req);"
    reports:   outbound-send

* silence-destructured-plain-literal-key - residual (b2), NAMED BY MEASUREMENT in wave 26: a DESTRUCTURED PLAIN LITERAL used as a key is silent, because constStrings reads only the identifier spelling of a declaration that assembledNames now reads three ways. The ASSEMBLED twin of the same destructure reports - that is the counter-probe, and it is the shape IN-26 closed
    read off:  auditSource > const constStrings = new Map<string, Set<string>>()
    probe:     "const { k } = { k: \"requests\" };\nsdk[k].send(req);"
    reports:   [] - nothing
    counter:   "const { k } = { k: \"req\" + \"uests\" };\nsdk[k].send(req);"
    reports:   outbound-unanalysable

* silence-inverted-binding-order - what actually bounds an ALIAS chain, corrected in wave 23: not where a name is READ but the DECLARATION ORDER of the bindings relative to each other. collect() finishes before visit() begins, so a use may sit above every declaration; invert one link and the root is not yet in the live set. The dependency-ordered spelling reports
    read off:  auditSource > const collect = (node: ts.Node): void => {
    probe:     "const b = a;\nconst a = fetch;\nb(url);"
    reports:   [] - nothing
    counter:   "const a = fetch;\nconst b = a;\nb(url);"
    reports:   outbound-fetch

* silence-operator-around-global-receiver - OPEN AND UNOWNED, opened by measurement in wave 25 and unchanged since: operatorReceiver is reached from receiverKind and keyReceiver and from nowhere else, so an operator wrapping a GLOBAL receiver is silent in every spelling. The same operator around an SDK receiver reports - the boundary is the RESOLVER, not the operator
    read off:  module scope > const operatorReceiver = (
    probe:     "(ok && globalThis).fetch(url);"
    reports:   [] - nothing
    counter:   "(ok && sdk.requests).send(req);"
    reports:   outbound-send
<!-- END DERIVED RESIDUAL -->


### Persistence (STORE)

- [x] **STORE-01**: SQLite schema via `sdk.meta.db()` covering artifacts, occurrences (`observations`), analyses, and plugin settings. *(Re-scoped 2026-08-21 during Phase 1 UAT: the original wording also named `entities`, `evidence` and `audit`, which have no writer until the detector and secrets phases. Those three moved to STORE-08 so this requirement has one owner and an honest status.)*
- [x] **STORE-02**: Every table includes `project_id` in its key. *(`sdk.meta.db()` is plugin-global, not project-scoped — verified against authmatrix.)*
- [x] **STORE-03**: Artifacts are content-addressed by digest, decoupling identity from URL. *(LEDGER COLLISION, recorded 2026-08-21 and DEFERRED WITH AN OWNER — deliberately NOT closed by gap-closure round 2, and recorded here so the CORE-11 split above cannot be read as a clean ledger. This id's text is about content addressing and says nothing about redaction, yet plans 01-01, 01-07, 01-10, 01-11 and 01-14 declare STORE-03 for write-path URL VALUE REDACTION. Inherited from 01-01/01-07, not introduced by this round. WHY DEFERRED rather than split now, because a deferral without a reason is an omission with a label: CORE-01's collision was a CONTRADICTION — its text describes a different subject entirely, so a gate tagged with it is unreadable — while this one is an ADJACENCY, wrong but not misdirecting, so the cost of one more pass is bounded; and closing it properly means authoring a NEW requirement text for write-path URL value redaction and retro-tagging plans 01-01 and 01-07, which are frozen. Opening an id the operator has not seen, for a requirement text a planner would be inventing, is a bigger decision than this round has a mandate for. OWNER: the operator, at the next requirements pass, by the same UAT route that produced STORE-01 → STORE-08.)*
- [x] **STORE-04**: Analysis rows record the detector-corpus version, so a corpus bump invalidates the right cache entries.
- [x] **STORE-05**: Schema migrations run forward on upgrade and are tested against a populated database.
- [x] **STORE-06**: Retention policy bounds database and disk growth.
- [x] **STORE-07**: All SQL uses positional `?` parameters. *(Named parameters are unsupported.)* *(LEDGER COLLISION, recorded 2026-08-21 and DEFERRED WITH AN OWNER — same act, same reasoning and same owner as STORE-03 above. This id's text is about SQL parameter binding, yet plans 01-07, 01-11 and 01-13 declare STORE-07 for RENDERED-ERROR redaction — the `describeError` gate over the `analyses.error` column. Adjacency rather than contradiction; closing it means authoring a new requirement text for rendered-error redaction and retro-tagging the frozen plan 01-07. OWNER: the operator, at the next requirements pass, by the STORE-01 → STORE-08 route.)*
- [ ] **STORE-08**: Schema coverage for `entities`, `evidence` and `audit`, added by forward migration steps when their writers land. *(Split out of STORE-01 on 2026-08-21. `entities` and `evidence` are owned by Phase 4 (SEC-*); `audit` by Phase 5. Building them empty in Phase 1 would ship three tables with no writer.)*

### Detection engine (DET)

- [ ] **DET-01**: Three-tier gate — `indexOf` literal prefilter, then regex, then AST — with each tier only running on what survived the previous one.
- [ ] **DET-02**: Detectors are data, not code: each declares keywords, pattern, entropy expectations, allowlists, and confidence inputs.
- [ ] **DET-03**: Detectors live in a workspace with **zero Caido value-imports**, so the corpus is testable under plain vitest. *(This is what makes the FP-rate gate mechanically enforceable.)*
- [ ] **DET-04**: Regex patterns are individually compiled, never merged into mega-alternations. *(Measured: one 200-literal alternation is 2.2× slower than 40 separate regexes.)*
- [ ] **DET-05**: Every rule passes a ReDoS static check in CI; a deliberately catastrophic rule fails the build.
- [ ] **DET-06**: Matching runs against bounded windows around prefilter hits, not across whole multi-megabyte bodies.
- [ ] **DET-07**: No hand-written per-character JavaScript loops anywhere in the hot path. *(Measured: an empty per-char loop costs 9 ms/MB; a JS hash costs 187 ms/MB versus 0.34 ms/MB native.)*
- [ ] **DET-08**: Confidence is multi-signal — provider format, keyword context, entropy percentile, code context, and allowlist state combined — never entropy alone.
- [ ] **DET-09**: Every finding records which degradation tier produced it, so coverage is never overclaimed.
- [ ] **DET-10**: The corpus is built only from permissively licensed sources — gitleaks (MIT), nuclei-templates (MIT), retire.js (Apache-2.0), jsluice (MIT). TruffleHog (AGPL-3.0) and SecretFinder (GPL-3.0) are studied, never copied.

### Secrets (SEC)

- [ ] **SEC-01**: Provider-specific detectors for high-value providers, each with its own shape, checksum where applicable, and context requirements.
- [ ] **SEC-02**: Contextual generic-secret detection that can never reach high confidence on entropy alone.
- [ ] **SEC-03**: Public-by-design keys are suppressed by an explicit allowlist — Firebase `apiKey`, Stripe `pk_live_`, Sentry DSN, Algolia search keys. *(Cheapest large FP reduction available; no competitor does it.)*
- [ ] **SEC-04**: Raw secret values are never written to SQLite, logs, or frontend events. Storage is an HMAC fingerprint plus a redacted preview.
- [ ] **SEC-05**: The real value is revealed only by reloading the original request and re-verifying the artifact body hash.
- [ ] **SEC-06**: JWTs are detected and their claims decoded (`alg`, `iss`, `aud`, `exp`) — decode only, no cryptographic verification claims, no attack tooling. Deep analysis hands off to `JWT-Analyzer`.
- [ ] **SEC-07**: Secret validation against the issuing provider, marking keys live or revoked. **Built, and OFF by default** — it is the only detector that transmits a live secret to a third party and can alert the key's owner. Validation recipes are reimplemented from provider documentation, not copied from unlicensed sources.

### API surface (ENDP)

- [ ] **ENDP-01**: Endpoint extraction covering `fetch`, `XMLHttpRequest.open`, axios/ky instances, `WebSocket`, `EventSource`, and `sendBeacon`.
- [ ] **ENDP-02**: Extraction captures enough to emit a **replayable request** — method, path template, query keys, content type, and selected headers. *(This, not the parser itself, is the differentiator over regex tools.)*
- [ ] **ENDP-03**: Unresolved template segments are preserved as templates (`/users/{expr}`), never silently dropped.
- [ ] **ENDP-04**: One click sends an extracted endpoint to a Caido Replay session.
- [ ] **ENDP-05**: GraphQL operations are extracted and normalised — operation type, name, and variables. Extraction only; deep analysis hands off to `GraphQL-Analyzer`. No automatic introspection requests.
- [ ] **ENDP-06**: Hosts, subdomains, private IPs, and cloud resource URLs are extracted, typed, and classified.

### Sourcemaps (MAP)

- [ ] **MAP-01**: Sourcemaps announced by `sourceMappingURL` comments, data URIs, and `SourceMap` response headers are discovered and consumed.
- [ ] **MAP-02**: Source reconstruction from `sourcesContent` via `JSON.parse`, with no VLQ decoding on the primary path. *(Measured: 781 sources recovered from a 12.66 MB monaco map in 21 ms.)*
- [ ] **MAP-03**: VLQ decoding via `@jridgewell/sourcemap-codec` (1,961 bytes minified) only where position attribution is genuinely needed.
- [ ] **MAP-04**: Reconstructed files are written to content-addressed safe paths. `sources` entries from the map are never used as filesystem paths. *(JSMiner's canonical-path defence cannot be copied — `llrt/fs` has no `realpath` and no `lstat`.)*
- [ ] **MAP-05**: Malformed maps, decompression bombs, path traversal attempts, and reference cycles are bounded and survive a fixture suite.
- [ ] **MAP-06**: Reconstructed sources are themselves analysed, once per content hash, with depth and aggregate limits.
- [ ] **MAP-07**: Reconstructed source is browsable in the plugin UI and exportable with a manifest.

### Chunk graph (CHUNK)

- [ ] **CHUNK-01**: Resolve `chunkId → URL` from the webpack runtime chunk map, Vite, Next.js, and Nuxt manifests — actual enumeration, not bundler fingerprinting. *(JS-Analyzer only fingerprints; this is genuinely open ground.)*
- [ ] **CHUNK-02**: Seed discovery from HTML script tags, `modulepreload`, dynamic import literals, and worker registrations.
- [ ] **CHUNK-03**: Chunk-map resolution is performed by parsing, **never by `eval()`**. *(Evaluating the webpack runtime executes target-controlled code inside a QuickJS backend that has filesystem and HTTP access — an RCE against the operator.)*
- [ ] **CHUNK-04**: Coverage is reported honestly; complete enumeration is never claimed.

### Supply chain (SUPPLY)

- [ ] **SUPPLY-01**: Dependency confusion detection verified against the NPM registry, including scoped-org claim checks. *(Parity — JS-Analyzer already has this; our gain is implementation quality.)*
- [ ] **SUPPLY-02**: Registry lookups are concurrent, rate-limited, cached, and deduplicated across scans. *(JS-Analyzer uses a serial `for` loop with none of these.)*
- [ ] **SUPPLY-03**: Public absence of a package name alone never produces a high-confidence finding.
- [ ] **SUPPLY-04**: NPM ecosystem only. PyPI, Maven, and Go are out — inferring them from a browser bundle is a category error.
- [ ] **SUPPLY-05**: Vulnerable library fingerprinting against a bundled retire.js dataset, requiring an exact version. Findings are Informational, never High.

### Active operations (ACTIVE)

- [ ] **ACTIVE-01**: Active `.map` probing is **ON by default and unbudgeted**, matching JSMiner parity. *(Operator decision, taken with the `caido/caido#2211` evidence on the table. Known consequence: on large SPAs the cumulative `sdk.requests.send()` count can abort the Caido process and drop temporary projects.)*
- [ ] **ACTIVE-02**: A **write-ahead send journal**, not a volatile counter. Before each send, persist `{runtime_session_id, sequence, project_id, source_request_id, normalized_candidate, reason, started_at}`; on completion add status, result, and timing. Query values and credential headers are redacted in the record. A counter alone disappears with the process — which is exactly the case this exists to explain.
- [ ] **ACTIVE-13**: Crash-loop marker and restart recovery. On startup, detect an unfinalised send or batch, report "Caido stopped during DefMiner active request N", retain the exact candidate, and do not replay that batch until the operator chooses Resume or Discard. New work stays default-on.
- [ ] **ACTIVE-14**: An always-visible kill switch with per-runtime and per-origin sent/pending counts in the page chrome. Cancellation prevents the next dispatch even while analysis is busy. Warning is diagnostic, not a cap.
- [ ] **ACTIVE-03**: Target-directed requests use `sdk.requests.send`, which the SDK documents as respecting **upstream proxy settings — routing only**. It does *not* inherit session or authentication state. Credentials must therefore be propagated explicitly under a written contract: same-origin probes may clone the originating request's auth headers; cross-origin probes are issued clean with all credentials stripped; credentials are never carried across a redirect hop. Third-party calls use `caido:http` `fetch`, which does not route through the proxy at all.
- [ ] **ACTIVE-08**: Each semantic candidate is attempted once. Deduplicate by resolved URL plus auth/origin context, persist negative results, and never re-probe because a bundle was seen again.
- [ ] **ACTIVE-09**: Host-backed sends are serialised — one in flight at a time — and `Request`/`Response` wrappers are reduced to primitives immediately rather than retained across `await` points, to limit live wrapper pressure.
- [ ] **ACTIVE-10**: Circuit breakers on target signals: honour `Retry-After`, pause an origin on 429, and stop an origin after explicit 401/403/WAF responses until the operator resumes. This is error handling, not a request budget.
- [ ] **ACTIVE-11**: First-run and store-listing disclosure states plainly that installation enables target-directed `.map` requests, that these may generate many 404s, and that on affected Caido builds they may terminate the instance and lose temporary projects. README-only disclosure is insufficient for a default-on outbound action.
- [ ] **ACTIVE-12**: Speculative probe misses use `save: false` so hundreds of 404s never flood Search. *(The SDK sets request and response IDs to 0 when unsaved — so native Findings must reference the source JS request, never the probe.)*
- [ ] **ACTIVE-04**: Active operations respect Caido scope.
- [ ] **ACTIVE-05**: Every active operation is individually toggleable.
- [ ] **ACTIVE-06**: Self-generated traffic does not re-enter the analysis pipeline as new work.
- [ ] **ACTIVE-07**: All outbound activity is written to an auditable log.

### Workspace UI (UI)

- [ ] **UI-01**: A sidebar page providing a project-wide view — every secret, endpoint, and host for the target, not just the response currently open.
- [ ] **UI-02**: Filterable, sortable tables with keyset pagination and virtualised scrolling, usable at thousands of rows.
- [ ] **UI-03**: Every entity links back to its source request, artifact version, and byte offsets.
- [ ] **UI-04**: Each finding shows a score explanation — which signals fired and why it scored as it did.
- [ ] **UI-05**: Reconstructed-source viewer.
- [ ] **UI-06**: JSON and CSV export, redacted by default with an explicit opt-in to include raw values.
- [ ] **UI-07**: Backend-to-frontend events are coalesced so a heavy browsing session cannot flood the UI.
- [ ] **UI-08**: A settings surface for every toggle, threshold, and budget.
- [ ] **UI-09**: Degraded and partial analyses are visibly marked, never silently presented as complete.

### Caido integration (FIND)

- [ ] **FIND-01**: Native Caido Findings are created for high-signal results only, with stable `dedupeKey`s. *(Findings cannot be updated or deleted — every false positive is permanent.)*
- [ ] **FIND-02**: Entropy-only and hint-grade results never project to Findings.
- [ ] **FIND-03**: Retroactive scanning of already-captured traffic via `sdk.requests.query()` with HTTPQL push-down, page size 20, and a resumable cursor. **SPIKE-11 promoted this from convenience to correctness (`RETROACTIVE_SCAN_MANDATORY=true`).** A returning visitor's bundle is invisible twice over: on a cached-fresh hit Chromium serves from its own cache, nothing crosses the wire, the origin sees nothing and the hook stays silent — the bundle *never enters Caido at all* — while a `no-store` HTML wrapper in the same window does fire. And a 304 that does reach the hook arrives with `Body.length == toRaw().length == 0` and **no `content-type` header whatsoever**. Without retroactive scan, DefMiner sees nothing on any target the operator has visited before. *(No `includeRaw(false)` on the backend query, so the documented 1000 page size is not usable.)*
- [ ] **FIND-04**: Retroactive scans report progress and are cancellable.

### Error containment and recovery (ERR)

- [ ] **ERR-01**: A failing detector, parser, or analyser is isolated — it fails that artifact, not the pipeline. One poisoned bundle can never stop analysis of everything after it.
- [ ] **ERR-02**: Jobs that were in flight when the process died are detected on startup and either resumed or explicitly abandoned, never left permanently `running`.
- [ ] **ERR-03**: Errors thrown or rejected inside `onInterceptResponse` are caught and logged by us. **No longer a precaution — measured on 0.57.1:** a synchronous `throw` and an async rejection are *both silently swallowed*. SPIKE-03 searched 22,876 host-log lines plus stdout and stderr for the run's unique error text and found **zero traces**, while the plugin kept receiving events normally. If we do not catch our own errors, nobody does and nothing shows.
- [ ] **ERR-04**: A per-artifact failure is recorded with its reason and is visible to the operator, so "no findings" and "analysis failed" are never confused.

### Observability (OBS)

- [ ] **OBS-01**: A health surface reporting queue depth, drop count, jobs in flight, maximum observed synchronous slice, and cache hit rate.
- [ ] **OBS-02**: Consistent terminology for degradation states across the database, the API, and the UI — one vocabulary, defined once.
- [ ] **OBS-03**: A diagnostics export the operator can attach to a bug report, containing versions, counters, and recent errors, with no secret material.

### Upgrade and reinstall (UPGRADE)

- [ ] **UPGRADE-01**: Installing a newer DefMiner over an existing install preserves prior findings and does not silently drop the database.
- [ ] **UPGRADE-02**: HMAC key continuity across upgrades — a rotated or lost key must not silently break secret correlation or make stored fingerprints unrevealable. Key loss is detected and reported.
- [ ] **UPGRADE-03**: A detector-corpus version bump re-analyses affected artifacts rather than leaving stale results that claim to be current.
- [ ] **UPGRADE-04**: Downgrade or reinstall behaviour is defined and does not corrupt state.

### Caido compatibility (COMPAT)

- [x] **COMPAT-01**: A declared minimum supported Caido version, checked at runtime, with a clear message rather than an obscure failure when unmet.
- [x] **COMPAT-02**: SDK surfaces the plugin depends on are exercised by a smoke test that runs against the current Caido release, so a breaking SDK change is caught by us and not by users.

### Encoding correctness (ENC)

- [x] **ENC-01**: Offsets and hashes are derived from `toRaw()` bytes, never from `toText()`, which replaces invalid characters and is lossy. *(Note: `TextDecoder` and `TextEncoder` are **not globals** in Caido's QuickJS — they must be imported from a module. Verified on 0.57.1.)*
- [ ] **ENC-02**: Non-UTF-8 and mixed-encoding bodies round-trip correctly through detection and evidence display.
- [ ] **ENC-03**: Internationalised domain names are normalised consistently, so a punycode host and its Unicode form are not treated as two different hosts — and homograph forms are not silently equated either.
- [ ] **ENC-04**: Percent-encoding, unicode escapes, and string concatenation in extracted URLs are normalised before deduplication.

### Operator workflow (OPS)

- [ ] **OPS-01**: Findings can be triaged — marked reviewed, false positive, or accepted — and that state persists.
- [ ] **OPS-02**: A suppression mechanism so a known-benign pattern on a given target stops reappearing, without editing the rule corpus.
- [ ] **OPS-03**: A failed or partial artifact analysis can be retried on demand.
- [ ] **OPS-04**: Triage and suppression state survives re-analysis after a corpus version bump.

### Frontend safety (UISEC)

- [ ] **UISEC-01**: All displayed content is target-controlled and is rendered as text, never as markup. No `v-html` on extracted content anywhere.
- [ ] **UISEC-02**: CSV export neutralises formula injection (`=`, `+`, `-`, `@`, tab, CR leading characters).
- [ ] **UISEC-03**: Extremely long or adversarial extracted strings are truncated for display without breaking layout or freezing the renderer.

### Deployment reality (DEPLOY)

Caido is client/server. Backend plugins run in the Caido CLI/server process, which may be a remote VPS or a Docker container. `sdk.meta.path()` is **server-side** and may be inaccessible to the operator, and ephemeral without a mounted volume.

- [ ] **DEPLOY-01**: Tested against local desktop, remote CLI, and Docker deployments both with and without a persistent volume.
- [ ] **DEPLOY-02**: Server-side storage is labelled as such in the UI and never presented as a path on the operator's machine.
- [ ] **DEPLOY-03**: Operator-facing artifacts — reconstructed source, exports, dumps — are delivered via `sdk.hostedFile` or a bounded authenticated frontend download, with expiry and redaction rules. Not by writing to a path and assuming the operator can reach it.
- [ ] **DEPLOY-04**: Server disk is treated as shared instance storage with quotas and orphan cleanup; no assumption of host shell access.

### Signal quality (QUAL)

- [ ] **QUAL-01**: A negative corpus of real popular npm dist bundles plus a synthetic bundle of known-benign lookalikes, where **every finding is by definition a false positive**. Result is reported as findings per MB.
- [ ] **QUAL-02**: A positive corpus of format-valid, revoked or canary keys per supported provider, reporting recall.
- [ ] **QUAL-03**: Both corpora run in CI on every rule change, and a regression fails the build.
- [ ] **QUAL-04**: The measured false-positive rate is published in the README. *(Core Value is a release gate, not an aspiration.)*
- [ ] **QUAL-05**: A poison-bundle fixture — adversarial syntax, deep nesting, decompression bombs, catastrophic-regex bait — completes within budget without crashing.
- [ ] **QUAL-06**: A sustained soak over mixed real bundles shows **per-artifact RSS delta converging toward zero**, no stuck jobs, no cross-project leakage, and no duplicate findings. *(Reworded because the original was unmeasurable: Caido's QuickJS exposes no memory introspection whatsoever — `llrt:qjs`, `perf_hooks`, and `process` all fail to load, `performance` carries only `now` and `timeOrigin`, and there is no `gc()`. External RSS sampling of the host process is the only method available, and RSS is a high-water mark that never falls, so "no growing heap" can never be observed directly.)*

### Distribution (DIST)

- [ ] **DIST-01**: LICENSE file present, license clearly indicated, third-party attributions complete.
- [ ] **DIST-02**: README discloses every external service contacted and why — NPM registry, and any opt-in validation endpoints. *(Required by the Caido Developer Policy.)*
- [ ] **DIST-03**: No client-side telemetry, no obfuscated code, and **no plugin self-update mechanism**. *(All three are explicitly Not Allowed.)*
- [ ] **DIST-04**: Detector corpus ships as versioned bundled assets and can be updated by a patch release without touching plugin code.
- [x] **DIST-05**: A CI gate asserts every import specifier in the built backend bundle is inside the allowlist Phase 0 proved loadable inside Caido. *(`caido-dev` sets `config: false` and `external: [...builtinModules]`, so a dependency importing `fs` builds silently and fails only on the user's machine.)* **Wording corrected during plan 01-02, matching the same correction already made to ROADMAP success criterion 6:** the original — "imports no Node built-ins" — fails a correct DefMiner, because Caido's QuickJS resolves ten specifiers (`os`, `path`, `fs`, `sqlite`, `caido:http`, `crypto`, `buffer`, `string_decoder`, `url`, `events`) and the native `crypto` hash is mandatory on DET-07 performance grounds. The allowlist form is strictly stronger: the original would not have caught `zlib`, `util`, `stream` or `caido:crypto` at all. Gate: `scripts/ci/check-bundle-imports.mjs`.
- [x] **DIST-06**: Dependency versions pinned against the known exact-pin traps — `@caido/primevue` peer-depends on `primevue` exactly `4.1.0`; `@caido/tailwindcss` hard-depends on `tailwindcss@3.4.13` using the v3 API that v4 removed.
- [ ] **DIST-07**: Submitted to the Caido Community Store.

---

## v2 Requirements

Tracked, deliberately not in the v1 roadmap.

- **SPIKE-13**: Design a stable asset identity across deploys. *(Next.js `/_next/static/<buildId>/` changes wholesale each deploy, so URL is useless as identity; content hash identifies exactly what changed.)* Moved out of v1 — it serves only DIFF-01, which is v2.
- **DIFF-01**: Cross-deploy diffing — introduced, removed, reintroduced entities across builds. *Blocked on SPIKE-13; asset identity across deploys is an unsolved problem.*
- **DOM-01**: DOM XSS source/sink hints and `postMessage` handler analysis, labelled as review hints. *Deprioritised: `domloggerpp-caido` already owns this niche with runtime sink hooking, which beats static analysis on minified bundles.*
- **CSP-01**: Correlating extracted origins against actual response CSP `connect-src`. *Hands off to `csp-auditor`.*
- **AST-02**: Deeper constant folding and cross-module base-URL resolution.
- **RULE-01**: A public detector-authoring schema with regression fixtures, for third-party rule contributions as data only.

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Deep JWT / GraphQL / CSP analysis | Dedicated `JWT-Analyzer`, `GraphQL-Analyzer`, and `csp-auditor` plugins already exist and are maintained |
| Flat DOM sink listing | `domloggerpp-caido` does it better via runtime hooking; static analysis on minified bundles is noisy by nature |
| Interprocedural / cross-bundle taint analysis | Too expensive and too imprecise inside QuickJS |
| Executing or `eval`-ing discovered JavaScript | Executes target-controlled code inside a backend with filesystem and HTTP access |
| Automatic GraphQL introspection | Active and noisy; generate a Replay-ready request instead |
| PyPI / Maven / Go dependency confusion | Cannot be soundly inferred from a browser bundle |
| Standalone high-entropy secret detection | Matches base64 sprites, class hashes, module hashes, i18n keys, SRI hashes, VLQ segments |
| Copying TruffleHog or SecretFinder patterns | AGPL-3.0 and GPL-3.0 respectively; incompatible with a permissive plugin |
| Self-updating detector rules | Caido Developer Policy: "Include a mechanism that updates the plugin" is Not Allowed |
| oxc / swc parsers | `typeof WebAssembly === "undefined"` in QuickJS — structurally impossible, not merely slow |
| Auto-exploiting discovered credentials | Turning a finding into impact is the operator's call |
| A hosted or cloud component | Everything runs local; nothing to trust |

---

## Traceability

Populated during roadmap creation.

**Coverage:**

- v1 requirements: 137 total
- Mapped to phases: 137
- Unmapped: 0
- Mapped to phases: pending roadmap
- Unmapped: pending roadmap

---
*Requirements defined: 2026-08-20*
