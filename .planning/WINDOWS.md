---
schema_version: 1
open_count: 71
waived_count: 0
fixed_count: 27
total_count: 98
last_updated: 2026-08-31T22:03:04.976Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 00 | unrun-verify | scripts/spike/recorder-session.sh |  | Task 3 optional human-check not run: operator has not routed a real browser through 127.0.0.1:8998. Scripted sessions collect regardless. | open |  | 2026-08-20T12:42:36.666Z |  |
| 2 | 00 | deviation | tests/spike-results.spec.ts | 47 | Gate asserts every threshold value is non-null, but spike-result.schema.json permits null for the inconclusive cross-day case. Plan 00-04 must reconcile. | fixed |  | 2026-08-20T12:42:36.735Z | 2026-08-20T12:45:07.474Z |
| 3 | 00 | unrun-verify | .planning/phases/00-runtime-reality-check/00-04-PLAN.md |  | Task 3 credential-scan <automated> clause scans the filesystem, not git-tracked files; it fires on 106 gitignored raw host logs matching the GraphQL field name accessToken. Zero token-shaped strings anywhere; the git-tracked scan the plan's action text and T-00-45 both specify is clean and ships in tests/go-no-go.spec.ts. | open |  | 2026-08-20T17:05:14.845Z |  |
| 4 | 00 | deviation | .planning/phases/00-runtime-reality-check/results/SPIKE-04.json |  | SEND_CLIFF_SAVE_TRUE/SAVE_FALSE/FETCH are FLOORS (2000, cap reached) not cliffs — caido/caido#2211 did not reproduce in either wrapper shape. Phase 8 must re-test with real .map bodies and concurrent sends before treating the floor as headroom. | open |  | 2026-08-20T17:05:24.949Z |  |
| 5 | 00 | deviation | .planning/phases/00-runtime-reality-check/results/SPIKE-10.json |  | CACHE_HIT_RATE_CROSS_DAY is null/inconclusive (1 day sampled, denominator 0) and collection has stopped; Phase 1 budgets against CACHE_HIT_RATE_ASSUMED=0.40. Re-install the recorder agent and re-measure after 2026-09-03. | fixed |  | 2026-08-20T17:05:25.014Z | 2026-08-20T18:06:03.807Z |
| 6 | 00 | unrun-verify | .planning/phases/00-runtime-reality-check/results/go-no-go.json |  | CACHE_HIT_RATE_CROSS_DAY inconclusive, revisit_after 2026-09-03. Recorder RE-ARMED 2026-08-20 (com.defminer.spike.recorder, twice daily) so a second calendar day accrues. Phase 1 CORE-08 must read this threshold from config with the 0.40 pessimistic default, never hard-code it. Close by re-running aggregate.py + render-go-no-go.py once CACHE_SAMPLE_DAYS >= 2. | open |  | 2026-08-20T18:05:34.808Z |  |
| 7 | 01 | stub | packages/backend/src/ingest/consumer.ts |  | walk()'s visit callback is a no-op — no detector exists until Phase 3; the walk's yielding, deadline and offset accounting are real regardless | open |  | 2026-08-20T22:55:56.313Z |  |
| 8 | 01 | stub | packages/engine/src/decode.ts |  | decode.ts has no consumer in the shipped bundle until a frontend exists (Phase 3/5); ENC-01's byte-vs-text inequality is proven by decode.spec.ts today | open |  | 2026-08-20T22:55:56.411Z |  |
| 9 | 01 | deviation | knip.json |  | knip ignoreExportsUsedInFile:true hides a dead export referenced once in its own file — accepted to restore the exports/types gate to error; revisit in Phase 5 | open |  | 2026-08-20T22:55:56.507Z |  |
| 10 | 01 | deviation | packages/backend/src/compat.ts |  | COMPAT-01's operator-visible message is delivered as a host-log line plus a getStatus()/getCompat() RPC only, with no visible UI: the backend QuickJS surface has NO toast or notification API (exhaustive grep for showToast, Toast and notification across @caido/quickjs-types finds nothing), and sdk.api.send has no subscriber because Phase 1 ships no frontend. Decision P6-D2. Phase 5 owes the visible surface. | open |  | 2026-08-21T00:02:00.191Z |  |
| 11 | 01 | stub | packages/backend/src/store/observations.ts |  | Path-embedded token in a URL path SEGMENT is NOT redacted — named residual, pinned by observations.spec.ts's RESIDUAL case | open |  | 2026-08-21T13:56:33.328Z |  |
| 12 | 01 | stub | packages/backend/src/telemetry.ts |  | Windows C:\\\\ paths are not redacted by redactPaths, and a path containing a space loses only the portion before the space — both named residuals | open |  | 2026-08-21T13:56:33.426Z |  |
| 13 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | Accepted residual T-01-51: a value crossing a function boundary or more than one hop of indirection is beyond the walk; reported as outbound-unanalysable only where the walk can tell indirection is happening | fixed |  | 2026-08-21T14:18:53.110Z | 2026-08-24T08:20:46.154Z |
| 14 | 01 | deviation | packages/backend/src/store/error-redaction.spec.ts |  | Accepted residual (boundary 2): the STORE-07 walk builds no symbol table and is scope-blind — the caught binding is resolved by NAME, copy tracking is ONE hop, and a value crossing a function boundary is beyond it | open |  | 2026-08-21T14:33:35.305Z |  |
| 15 | 01 | deviation | packages/backend/src/compat.ts | 317 | T-01-37 accept: renders String(e).slice(0,160) into the per-surface error field, outside the STORE-07 gate's store/ scope. OWNER: Phase 2, ERR-04 (ROADMAP.md:396) | open |  | 2026-08-21T14:33:35.405Z |  |
| 16 | 01 | deviation | packages/backend/src/hooks/passive.ts | 171 | T-01-37 accept: renders String(e).slice(0,160) into sdk.console.log on the hook error path, outside the STORE-07 gate's store/ scope. OWNER: Phase 2, ERR-03 (ROADMAP.md:396) | open |  | 2026-08-21T14:33:35.502Z |  |
| 17 | 01 | deviation | .planning/REQUIREMENTS.md |  | T-01-76 accept: STORE-03 and STORE-07 are declared by redaction plans for work neither requirement's text mentions. Deferred WITH AN OWNER by plan 01-10 task 3 — the operator, at the next requirements pass | open |  | 2026-08-21T14:33:35.597Z |  |
| 18 | 01 | deviation | scripts/phase1/tracer-e2e.sh |  | URL userinfo redaction cannot be proven at the live tier: curl lifts user:pass@ into an Authorization: Basic header, so userinfo never reaches observations.url. Measured in run 20260821T150022Z-16902 (userinfo-measurement.txt) and enforced instead by the observations.spec.ts real-SQLite round trip. Live-tier coverage for this one grammar is a documented gap, not a passing assertion. | open |  | 2026-08-21T15:10:49.050Z |  |
| 19 | 1 | deviation | packages/backend/src/store/observations.ts |  | RESIDUAL, PINNED: URL_MAX truncation lands inside a <redacted> marker (tail 'p133=<re'); repair interacts with the new padding branch and would break file-wide idempotence — owner: a later phase, job: truncate on a & boundary | fixed |  | 2026-08-22T08:54:33.504Z | 2026-08-24T12:48:34.497Z |
| 20 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | WR-19 narrowed from every-non-reducing-key to ASSEMBLED-KEY; a merely dynamic key (sdk[k]) is a disclosed residual, not reported | fixed |  | 2026-08-22T09:33:22.689Z | 2026-08-24T08:21:10.428Z |
| 21 | 01 | deviation | scripts/phase1/tracer-e2e.sh |  | URL userinfo cannot be exercised through the live curl tier — lifted into an Authorization: Basic header before the request line exists. MEASURED per run (userinfo-measurement.txt), enforced at the unit tier by observations.spec.ts HEAD_CASES. A live userinfo proof needs a client that does not do this lift. | open |  | 2026-08-22T09:56:52.151Z |  |
| 22 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | THE RECEIVER-KEY RESIDUAL AS OF WAVE 18 (plan 01-18, CR-08) — SUPERSEDED IN WAVE 19 BY PLAN 01-19, which narrows it further and rewrites this bound in the gate header, REQUIREMENTS.md, STATE.md and this ledger. Supersedes entries 13 and 20, whose descriptions stated a bound the code no longer has. NOW REPORTED in receiver-key position: a literal key; a key bound ONE HOP to a literal (constStrings); a key assembled inline (isAssembledKey); a key bound ONE HOP to an assembly in EVERY spelling — +, a template, .join(""), an opaque call — through either a declaration or an assignment (assembledNames); a CONDITIONAL key resolved on both branches; a COMMA SEQUENCE resolved to its rightmost operand. THE RESIDUAL THAT REMAINS, in the same words as that gate's boundary 2, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 amendment: more than ONE HOP of indirection, a value crossing a FUNCTION BOUNDARY, and a key the walk NEVER SAW BOUND — a parameter, a loop binding, a name bound out of document order or in another file. That last exemption is preserved BY MEASUREMENT, re-run after the widening: 23 files over both source roots, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. CORE-11 stays unchecked: const e = eval; e(s) (WR-23) and const g = globalThis (IN-20) are still silent and plan 01-19 owns both plus the checkbox flip. | fixed |  | 2026-08-24T08:21:34.840Z | 2026-08-24T08:49:12.490Z |
| 23 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | THE FINAL RESIDUAL AFTER WAVE 19 (plan 01-19, closing WR-23, WR-26 and IN-20). Supersedes entry 22, whose description scoped itself to the wave-18 receiver-key residual and named this plan as its superseder; a one-hop eval/Function alias, the outbound constructors and the globalThis hop all stop being residual here. NEWLY REPORTED since wave 18: a one-hop alias of eval or Function in every spelling fetchAliases resolves (declaration, global-member, destructure, assignment), the same for XMLHttpRequest/WebSocket/EventSource through one shared globalNameOf lookup used by both the call rule and the new rule, and a one-hop alias of globalThis itself, which closes fetch, the unreadable computed member, dynamic code, the outbound constructors and the beacon receiver together. THE RESIDUAL THAT REMAINS, in the same words as that gate's THE FINAL RESIDUAL, AFTER PLAN 01-19 block, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 amendment: CORE-11's clause 'no sdk.requests.send IN ANY SPELLING' IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in DOCUMENT ORDER: const a = globalThis; const b = a; const g = b; g.fetch(u) reports and so does the sdk.requests twin, while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in NUMERIC_MEMBERS is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary + indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19: 23 files over both SOURCE_ROOTS, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. NOTE THAT THIS ENTRY AMENDS THE BOUND IN BOTH DIRECTIONS: every residual list before this one bounded the walk at 'more than ONE HOP of indirection', which is exactly right for a receiver KEY and UNDERSTATED the walk for ALIASES, measured while writing a fixture for it. CORE-11 is now [x] in REQUIREMENTS.md, flipped against an eight-row discharge table in 01-19-SUMMARY.md and not before it. | fixed |  | 2026-08-24T08:49:36.488Z | 2026-08-24T11:35:19.685Z |
| 24 | 01 | deviation | packages/backend/src/store/error-redaction.spec.ts |  | Residual items 1-3 (unnamed methods, bare-identifier callee, operator outside the four) are disclosed and deliberately UNPINNED — no assertion goes red if one is closed | fixed |  | 2026-08-24T09:33:40.130Z | 2026-08-24T12:59:19.549Z |
| 25 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | THE FINAL RESIDUAL AFTER WAVE 23 (plan 01-23, closing CR-09). SUPERSEDES ENTRY 23, WHOSE DESCRIPTION WAS FALSIFIED BY CR-09 — it stated that an alias chain read BEFORE its root is bound is silent, a READ-POSITION bound the code does not have. auditSource runs collect(sf) to COMPLETION at :1521 and only then runs visit(sf) at :1726, so every alias set is fully populated before the first violation is considered and the position of a USE bounds nothing. Seven shapes entry 23 called silent were executed and all seven report: the bare and function-wrapped g.fetch(u) above const g = globalThis (outbound-fetch), sdk[r].send(req) above const r = "requests" (outbound-send), sdk[k].send(req) above const k = "req"+"uests" (outbound-unanalysable), s.send(req) above const s = sdk.requests (outbound-send), n.sendBeacon(u,d) above const n = navigator (outbound-beacon) and e("x") above const e = eval (outbound-dynamic-code). The fixture entry 23 rested on was green through INVERTED BINDINGS, not through its read position — proven both ways by the verifier — which is CR-08's title-versus-mechanism substitution for the third time in this file; plan 01-23 split it into a binding-order half and a read-position half plus a three-case discrimination. THE RESIDUAL THAT REMAINS, in the same words as that gate's THE FINAL RESIDUAL, AFTER PLAN 01-23 block, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 third pointer amendment: CORE-11's clause no sdk.requests.send IN ANY SPELLING IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, provided each link's DECLARATION appears after the declaration of the name it is grown from. The MECHANISM is why, and it is stated here rather than only its consequence, because a consequence on its own is what the last four rounds each paraphrased wrongly: auditSource runs collect(sf) to COMPLETION and only then runs visit(sf), and every alias set is grown by consulting the LIVE set during that one collect pass. So const a = globalThis; const b = a; const g = b; g.fetch(u) reports, the sdk.requests twin reports, and a four-hop chain reports with the USE written ABOVE all four declarations — the use site's POSITION IS IRRELEVANT. What is silent is an INVERTED BINDING: const b = a; const a = fetch; b(u) reports nothing, because a is not yet in the set when b's declaration is read, and it stays silent wherever the read is placed. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in NUMERIC_MEMBERS is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary + indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19 and again in plan 01-23: 23 files over both SOURCE_ROOTS, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. WHAT COMES NEXT, RECORDED SO THIS ENTRY IS NOT READ AS FINAL DESPITE ITS NAME: waves 24 through 26 narrow this residual further — CR-10 (a stale first literal shadowing a later rebinding), WR-27 (a conditional receiver in call position) and the store/pins/tracer surfaces — and wave 27 REPLACES this authored text with one DERIVED from the code, which is the only thing that stops the class of defect that produced CR-05 through CR-09. This entry closes the INSTANCE and not the class. CORE-11's box is [ ] in REQUIREMENTS.md, reverted at faca607 because the [x] had been flipped against the sentence CR-09 falsified; wave 28 owns the flip and only against wave 27's derived residual. Nothing leaked: the must-NOT holds, the gate runs green over the real tree (23 files, ZERO violations) inside a 1117-test suite, and check:bundle reports one specifier, crypto. | fixed |  | 2026-08-24T11:35:44.698Z | 2026-08-24T11:36:19.952Z |
| 26 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | THE FINAL RESIDUAL AFTER WAVE 23 (plan 01-23, closing CR-09). SUPERSEDES ENTRY 23, WHOSE DESCRIPTION WAS FALSIFIED BY CR-09, AND SUPERSEDES ENTRY 25, WHICH WAS THIS ENTRY'S OWN FIRST DRAFT AND QUOTED THE SUPERSEDED WORDING INSTEAD OF NAMING IT — closed through the tool rather than hand-edited, and recorded here rather than smoothed over. What entry 23 asserted is named, not restated: THE READ-POSITION BOUND, whose exact words are preserved on entries 23 and 25, both status=fixed, and in 01-VERIFICATION.md's CR-09 entry. It is false. auditSource runs collect(sf) to COMPLETION at :1521 and only then runs visit(sf) at :1726, so every alias set, every string map and every poisoned name is fully populated before the first violation is considered, and the position of a USE bounds nothing at all. Seven shapes entry 23 called silent were executed and all seven report: the bare and function-wrapped g.fetch(u) written above const g = globalThis (outbound-fetch), sdk[r].send(req) above const r = "requests" (outbound-send), sdk[k].send(req) above const k = "req"+"uests" (outbound-unanalysable), s.send(req) above const s = sdk.requests (outbound-send), n.sendBeacon(u,d) above const n = navigator (outbound-beacon), and e("x") above const e = eval (outbound-dynamic-code). The fixture entry 23 rested on was green through INVERTED BINDINGS rather than through the variable its title named — proven both ways by the verifier — which is CR-08's title-versus-mechanism substitution for the third time in this file; plan 01-23 split it into a binding-order half and a read-position half and added a three-case discrimination that separates the two. THE RESIDUAL THAT REMAINS, in the same words as that gate's THE FINAL RESIDUAL, AFTER PLAN 01-23 block, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 third pointer amendment: CORE-11's clause no sdk.requests.send IN ANY SPELLING IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, provided each link's DECLARATION appears after the declaration of the name it is grown from. The MECHANISM is why, and it is stated here rather than only its consequence, because a consequence on its own is what the last four rounds each paraphrased wrongly: auditSource runs collect(sf) to COMPLETION and only then runs visit(sf), and every alias set is grown by consulting the LIVE set during that one collect pass. So const a = globalThis; const b = a; const g = b; g.fetch(u) reports, the sdk.requests twin reports, and a four-hop chain reports with the USE written ABOVE all four declarations — the use site's POSITION IS IRRELEVANT. What is silent is an INVERTED BINDING: const b = a; const a = fetch; b(u) reports nothing, because a is not yet in the set when b's declaration is read, and it stays silent wherever the read is placed. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in NUMERIC_MEMBERS is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary + indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19 and again in plan 01-23: 23 files over both SOURCE_ROOTS, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. WHAT COMES NEXT, RECORDED SO THIS ENTRY IS NOT READ AS FINAL DESPITE ITS NAME: waves 24 through 26 narrow this residual further — CR-10 (a stale first literal shadowing a later rebinding), WR-27 (a conditional receiver in call position) and the store/pins/tracer surfaces — and wave 27 REPLACES this authored text with one DERIVED from the code, which is the only thing that stops the class of defect that produced five consecutive false bounds. This entry closes the INSTANCE and not the class. CORE-11's box is [ ] in REQUIREMENTS.md, reverted at faca607 because the [x] had been flipped against the sentence CR-09 falsified; wave 28 owns the flip and only against wave 27's derived residual. Nothing leaked: the must-NOT holds, the gate runs green over the real tree (23 files, ZERO violations) inside a 1117-test suite, and check:bundle reports one specifier, crypto. | fixed |  | 2026-08-24T11:36:40.870Z | 2026-08-24T12:04:10.683Z |
| 27 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | THE FINAL RESIDUAL AFTER WAVE 24 (plan 01-24, closing CR-10). SUPERSEDES ENTRY 26, whose description carried the WAVE-23 bound. What entry 26 asserted about receiver keys is NAMED rather than restated: THE EVERY-SPELLING CLAIM, and beside it in the gate header THE SINGLE-DIRECTION CLAIM and THE COVERED-BY-CONSTRUCTION CLAIM. Their exact superseded words are preserved on entry 26 (status=fixed), in 01-REVIEW.md's CR-10 entry and in the three correction paragraphs in the gate file. All three were false in the same place: constStrings was a Map<string,string> written ONLY at the declaration branch and read FIRST by keyReceiver, so a harmless first literal shadowed every later rebinding of the same name and the branches beneath it were unreachable for that name. Executed: let k = "harmless"; k = "requests"; sdk[k].send(req) was SILENT, and so were the var spelling, the global-key spelling, the assignment-assembly spelling and let k = "req"; k += "uests". The plan's own control for those misses — let k; k = "requests" — was ALSO measured silent, one defect deeper than CR-10 stated: the assignment branch never wrote the string map at all. All six report now. CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. RE-DERIVED FOR WAVE 24 BY READING THE BRANCHES: `keyReceiver`'s four steps, the two `constStrings` write sites, the three `assembledNames` write sites and `literalOf` itself — not by narrowing the previous paragraph, which is the method plan 01-21 recorded as having enumerated two classes while missing a third sitting in the same function. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, provided each link's DECLARATION appears after the declaration of the name it is grown from. UNCHANGED BY THIS WAVE. The mechanism is that `auditSource` runs `collect(sf)` to COMPLETION before `visit(sf)` begins, while every alias set is grown by consulting the LIVE set during that one collect pass — so a four-hop chain reports with the USE written ABOVE all four declarations and the use site's POSITION IS IRRELEVANT. What is silent is an INVERTED BINDING: `const b = a; const a = fetch; b(u)` reports nothing, wherever the read sits. A RECEIVER KEY RESOLVES ONE HOP, AND WHAT ONE HOP MEANS WIDENED IN WAVE 24. It resolves: a literal; a literal bound at a DECLARATION OR AN ASSIGNMENT, in the `const`, `let` and `var` spellings; a name REBOUND, because ANY binding of a name that names an outbound receiver now makes the key one, so `let k = "harmless"; k = "requests"; sdk[k].send(req)` reports where it was silent; an assembly inline; an assembly bound or assigned; AN ASSEMBLY ACCUMULATED WITH `+=`; a conditional; and a comma sequence. Where a name carries BOTH a literal binding and a watched assembly, THE ASSEMBLY WINS and the site reports `outbound-unanalysable` rather than naming a surface off a string the file has since rebuilt. `literalOf`, which resolves MEMBER NAMES and MODULE SPECIFIERS through that same map, IS SINGLE-VALUED: a name carrying more than one distinct binding answers "could not read", and "could not read" REPORTS at every one of its call sites. Measured in all four positions where a name can now resolve differently, THE WAVE-24 WIDENING CREATED NO NEW SILENCE — a named surface becomes `outbound-unanalysable` where the walk read two strings, and nothing went quiet. THE MIRROR of the widening, `let k = "requests"; k = "harmless"`, REPORTS: any-binding-wins OVER-approximates, which is the direction every other set in this pass already errs in. The rejected alternative — a POISONED map in the shape of `poisonedNumericNames` — was MEASURED and would have left CR-10's own shapes silent and created a new silence at the mirror. WHAT REMAINS SILENT, READ OFF THE BRANCHES: TWO HOPS OF KEY — `const a = "requests"; const b = a; sdk[b]` — because `constStrings` and `assembledNames` read the INITIALIZER'S SHAPE and never the live set, so a key cannot be grown from a name already in a set; a value crossing a FUNCTION BOUNDARY; a PARAMETER; a LOOP BINDING; and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was measured to change nothing except to re-poison ordinary `+` indexing. STILL OPEN AFTER THIS WAVE, EACH NAMED WITH THE WAVE THAT OWNS IT, because a residual that narrows without saying what is still open is the omission this round exists to stop: the CONDITIONAL RECEIVER IN CALL POSITION with its `??` and `\|\|` twins — WAVE 25 (WR-27); the NESTED CONDITIONAL KEY — WAVE 25; the DESTRUCTURED KEY BINDING, `const { k } = o; sdk[k].send(req)` — WAVE 26 (IN-26). Wave 26 also owns `packages/backend/src/store/*`, `tests/pins.spec.ts` and `scripts/phase1/tracer-e2e.sh`. Every exemption here is preserved BY MEASUREMENT, re-run after each widening and again in wave 24: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name. The `+=` branch DOES fire on shipped code — it marks `examined` and `deleted` in `store/retention.ts`, `out` in `telemetry.ts` and `start` in `engine/src/chunker.ts` as assembled — and all four files still report ZERO, because none of those names is ever used as a receiver key. That is measured, not argued. WAVE 27 REPLACES THIS AUTHORED TEXT WITH ONE DERIVED FROM THE CODE. This wave closes CR-10's INSTANCE and does not close the class that produced it — an authored bound nobody re-derived — which is now SIX consecutive rounds. `REQUIREMENTS.md` and `STATE.md` are deliberately NOT amended in this wave: both carry an authored residual, wave 27 derives the replacement and wave 28 reconciles both ledgers to it in one move, and a fourth hand-authored copy would be another place the next drift can start. CORE-11's box stays `[ ]`; wave 28 owns the flip and only against the derived text. NOTHING LEAKED: CR-10 is a PROSPECTIVE BLINDNESS in a test-only gate, no outbound call exists in any non-spec source under either root, the gate runs green over the real tree inside a 1132-test suite, and `pnpm check:bundle` reports one specifier, `crypto`.  | fixed |  | 2026-08-24T12:04:22.861Z | 2026-08-24T12:30:02.396Z |
| 28 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | THE FINAL RESIDUAL AFTER WAVE 25 (plan 01-25, closing WR-27). SUPERSEDES ENTRY 27, which carried the WAVE-24 bound. NOTHING IN ENTRY 27 IS FALSIFIED BY THIS ONE AND THAT IS THE POINT: WR-27's shape — an operator written directly as the CALLEE'S RECEIVER — was named by NO clause in entry 27, entry 26, entry 25 or entry 23, so this entry WIDENS a self-declared-open enumeration rather than correcting a false one. Entry 27's own "STILL OPEN AFTER THIS WAVE" clause named the conditional receiver in call position and the nested conditional key as wave 25's, and both are closed here; what it did not name, and what no list before it named either, is that the same gap covered the `??`, `\|\|` and `&&` spellings and a precedence `initializerReceiver` had to itself. Executed before wave 25: `(b ? sdk.requests : sdk.net).send(req)`, `(sdk.requests ?? sdk.net).send(req)`, `(sdk.requests \|\| sdk.net).send(req)`, `(ok && sdk.requests).send(req)` and `sdk[b ? (c ? "requests" : "x") : "y"].send(req)` all reported `[]`, while the two controls added in the SAME round — the conditional KEY and the conditional INITIALIZER — both reported `outbound-send`. All five report now. THE CANONICAL RESIDUAL FOLLOWS, AUTHORED ONCE AND RENDERED PROGRAMMATICALLY INTO BOTH THIS ENTRY AND THE GATE HEADER'S `THE FINAL RESIDUAL, AFTER PLAN 01-25` BLOCK, so identity is a machine check rather than a promise:
CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. RE-DERIVED FOR WAVE 25 BY READING THE BRANCHES: `receiverKind`'s four arms, `keyReceiver`'s steps including the operator step above step 0, `initializerReceiver` (which is now a NAME for `receiverKind`), `operatorReceiver` and the `RECEIVER_OPERATORS` set — not by narrowing the previous paragraph, which is the method plan 01-21 recorded as having enumerated two classes while missing a third sitting in the same function.

THE OPERATOR CLASS IS CLOSED IN ALL FOUR POSITIONS AS OF WAVE 25, THROUGH ONE DESCENT AND NOT THREE COPIES. `? :`, `??`, `\|\|` and `&&` are read in CALL-RECEIVER position (`(b ? sdk.requests : sdk.net).send(req)`), in KEY position (`sdk[b ? "requests" : "net"]`), in INITIALIZER position (`const r = sdk.requests ?? sdk.net; r.send(req)`) and in NESTED KEY position (`sdk[b ? (c ? "requests" : "x") : "y"]`), by `operatorReceiver` — ONE function, reached from `receiverKind` and from `keyReceiver`, each passing ITSELF as the leaf resolver so nesting resolves at any depth. THE THREE-STATE ANSWER, in the order the element-access arm already used and copied from there rather than reinvented: any operand naming a receiver makes the expression THAT RECEIVER; else any operand the walk cannot read makes it UNREADABLE; else it is NOT A RECEIVER.

AND THE SHAPE THIS WAVE CLOSED WAS NAMED BY NO PRIOR RESIDUAL LIST AT ALL — NOT UNDERSTATED BY THEM, OMITTED FROM THEM. Before wave 25 no clause here named a call-position operator: not the two-hop clause, not the function-boundary clause, not the parameter or loop-binding clauses, not the another-file clause. A reader enumerating this gate's blind spots would have finished the list and stopped, and been wrong. THAT OMISSION IS THE FINDING, and it is recorded here where the list is rather than only in a summary, because an enumeration that grows silently is one nobody can audit for completeness in either direction. WHAT THIS IS NOT, SAID SO THE ROUND DOES NOT INFLATE ITSELF: it is not the correction of a false sentence. This list declares itself open and WR-27 WIDENED it, exactly as round 4's wave 21 framed WR-24; CR-09 by contrast was a residual that ASSERTED something false, which is the heavier finding, and this wave does not borrow its weight. Equally, an omitted shape is not a harmless one — completeness in both directions is precisely what a residual list is trusted for.

`&&` IS IN THE SET AND WAS SETTLED BY MEASUREMENT, NOT BY SYMMETRY WITH THE OTHER THREE, because the symmetry argument genuinely does not carry: `a && b` yields `a` when `a` is FALSY, so its left operand is usually a guard rather than a value. BOTH READINGS WERE IMPLEMENTED AND RUN. THE REAL TREE DID NOT DISCRIMINATE — 23 files, ZERO violations, under `&&` in and under `&&` out alike — so nothing about shipped code chose this and no claim is made that it did. THE SHAPES DISCRIMINATED: excluding `&&` left `(ok && sdk.requests).send(req)`, the ordinary way to write a guarded outbound call and one with `sdk.requests` written out in full, SILENT — which is WR-27's own finding reproduced one operator over, inside the wave closing it. THE COST IS DISCLOSED AND PINNED BY ITS OWN ASSERTION: `(sdk.requests && ok).send(req)`, where the receiver is the guard and the value is something else, REPORTS. That OVER-approximates, in the direction every other set in this file errs. `+` is deliberately absent from `RECEIVER_OPERATORS` and must stay absent — every operator in that set yields one of its operands UNCHANGED, which is what makes either-side semantics sound, while `"req" + "uests"` is the ASSEMBLY `isAssembledKey` owns. The sibling gate one directory over, `store/error-redaction.spec.ts`'s `derivesFrom`, already descends this same set of four with either-side semantics (WR-24, plan 01-21) and cites `initializerReceiver` in THIS file as its reason; excluding `&&` here would have manufactured the disagreement that docblock was written to prevent. That is corroboration, not the reason.

THE DESCENT EXISTED THREE TIMES AND THEREFORE EXISTED TWICE, WHICH IS WHY THE THIRD FACE WENT UNTAUGHT WHILE THE OTHER TWO WERE TAUGHT IN THE SAME ROUND. `initializerReceiver` unwrapped a conditional, `receiverKind`'s element-access arm unwrapped one, and `receiverKind` ITSELF did not — so a conditional written directly in call position fell through every branch to `return undefined`, the state every caller reads as NOT A RECEIVER, for a site with a literal `sdk.requests` in it. Wave 25 collapsed the copies: `initializerReceiver` is now a name for `receiverKind`, the element-access arm calls `keyReceiver`, and both reach `operatorReceiver`. THE COLLAPSE ALSO CORRECTED A PRECEDENCE NO LIST NAMED EITHER, found by reading the three copies side by side rather than predicted: `initializerReceiver` was `receiverKind(whenTrue) ?? receiverKind(whenFalse)`, and `??` does not skip `UNREADABLE_RECEIVER` because a symbol is neither null nor undefined — so an UNREADABLE LEFT branch shadowed a NAMED RIGHT branch in initializer position and in no other position. `const r = b ? sdk[k1 + k2] : sdk.net` reported `outbound-unanalysable` while `const r = b ? sdk.net : sdk[k1 + k2]` reported `outbound-net`: two spellings of one shape answered differently by operand ORDER. Both now report the named receiver; both REPORTED before and after, so the correction changed WHICH rule is named and nothing went quiet.

`keyReceiver`'s DOCBLOCK CLAIM IS NOW TRUE OF THE CODE rather than true of two callers. It has said since CR-08 that it is the single definition of what a readable key is, called from the direct key and both conditional branches "so they cannot disagree about what the walk can read" — a claim made by a function that did not itself handle a conditional, so a conditional INSIDE a branch was exactly where they disagreed and `sdk[b ? (c ? "requests" : "x") : "y"]` was silent. `keyReceiver` now recurses through `operatorReceiver` passing itself.

WHAT REMAINS SILENT, READ OFF THE BRANCHES: TWO HOPS OF KEY — `const a = "requests"; const b = a; sdk[b]` — because `constStrings` and `assembledNames` read the INITIALIZER'S SHAPE and never the live set, so a key cannot be grown from a name already in a set; a value crossing a FUNCTION BOUNDARY; a PARAMETER; a LOOP BINDING; and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was measured to change nothing except to re-poison ordinary `+` indexing.

AND ONE SHAPE THIS WAVE OPENED BY MEASURING WHERE THE DESCENT STOPS INSTEAD OF ASSUMING IT IS UNIVERSAL — disclosed on the day it was found rather than left for a later round's finding. `operatorReceiver` is reached from `receiverKind` and `keyReceiver` AND FROM NOWHERE ELSE. `isGlobalReceiver`, `isFetchExpression` and `isNavigatorReceiver` resolve their own spellings through the alias sets and do not consult it, so AN OPERATOR WRAPPING A GLOBAL RECEIVER IS STILL SILENT in every spelling: `(ok && globalThis).fetch(url)`, `(g ?? globalThis)["fetch"](url)`, `(b ? globalThis : x).fetch(url)`, `(b ? navigator : x).sendBeacon(u, d)`, `(b ? fetch : x)(url)` and `(b ? eval : x)(src)` all report `[]`, MEASURED IDENTICAL BEFORE AND AFTER THIS WAVE against commit 278a0d2~1. This wave neither closed them nor broke them and claims no credit for them; the contrast that shows the boundary is the RESOLVER and not the operator is that `(b ? sdk.requests : x).send(req)` DOES report, because that path goes through `receiverKind`. Pinned by a fixture titled as a MEASURED SILENCE.

STILL OPEN AFTER THIS WAVE, EACH NAMED WITH THE WAVE THAT OWNS IT OR WITH THE FACT THAT NOTHING DOES, because a residual that narrows in one place while quietly widening in another is the omission this round exists to stop: the DESTRUCTURED KEY BINDING, `const { k } = o; sdk[k].send(req)` — WAVE 26 (IN-26); the OPERATOR AROUND A GLOBAL RECEIVER, above — OPEN AND UNOWNED, no plan in this phase claims it, and wave 27's derivation is what will carry it forward rather than rediscover it. Wave 26 also owns `packages/backend/src/store/*`, `tests/pins.spec.ts` and `scripts/phase1/tracer-e2e.sh`.

Every exemption here is preserved BY MEASUREMENT, re-run after each widening and again in wave 25: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name. AN OPERATOR DESCENT IN CALL-RECEIVER POSITION IS THE WIDENING MOST LIKELY TO FIRE ON ORDINARY SHIPPED CODE — picking one of two ordinary collaborators with `? :`, `??`, `\|\|` or `&&` is common, and a gate that flags it gets deleted rather than fixed — so every widening in this wave shipped with its must-stay-quiet twin IN THE SAME COMMIT: `(useCache ? cache : client)`, `(cache ?? client)`, `(cache \|\| client)`, `(ready && cache)` and an ordinary object defining a method named `send` all report `[]`.

WAVE 27 REPLACES THIS AUTHORED TEXT WITH ONE DERIVED FROM THE CODE. This wave closes WR-27's INSTANCE and does not close the class that produced it — an authored bound nobody re-derived — which is now SEVEN consecutive rounds. `REQUIREMENTS.md` and `STATE.md` are deliberately NOT amended in this wave, for the reason wave 24 recorded: both carry an authored residual, wave 27 derives the replacement and wave 28 reconciles both requirement-tier ledgers to it in ONE move, and another hand-authored copy would be another place the next drift can start. CORE-11's box stays `[ ]`; wave 28 owns the flip and only against the derived text. NOTHING LEAKED: WR-27 is a PROSPECTIVE BLINDNESS in a test-only gate, no outbound call exists in any non-spec source under either root, the gate runs green over the real tree — 23 files, ZERO violations — inside a 1143-test suite, and `pnpm check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. | fixed |  | 2026-08-24T12:30:23.403Z | 2026-08-24T13:01:13.116Z |
| 29 | 01 | deviation | packages/backend/src/store/observations.ts |  | RESIDUAL, PINNED BY SWEEPS (supersedes entry 19, whose stated job — truncate on an & boundary — plan 01-20 did). What is left is the NO-SEPARATOR branch, condition q === -1 \|\| amp <= q: no & INSIDE THE CUT. The class is about WHERE THE CUT LANDS (before the query's first &), NOT about how many parameters the query has — a three-parameter query with a long first parameter is inside it. Two shapes: a cut inside a ;-parameter's <redacted> MARKER IS a fixed point; a cut inside a parameter NAME is NOT (second pass sees a segment with no =, P10-D1 redacts it whole, value can SHRINK one byte). MEASURED 2026-08-24 by the sweeps in observations.spec.ts: head-side n=1975..2045, 71 offsets, 11 unstable (2019-2029); three-parameter query, same range, 71 offsets, 17 unstable (2015-2031). ZERO secret survivals at either pass at every one of those 142 offsets. NOT A LEAK: recordObservation applies normaliseObservedUrl ONCE per row, so no production path takes the second pass. NOT CLOSED for the reason observations.ts records — the repair drops back to the last / or to the ?, truncating an oversized path to its authority, which reopens P8-D1/P10-D1. | open |  | 2026-08-24T12:48:34.593Z |  |
| 30 | 01 | deviation | packages/backend/src/store/error-redaction.spec.ts |  | SUPERSEDES ENTRY 24, whose description (residual items 1-3 disclosed and deliberately UNPINNED, nothing goes red if one is closed) is false about two of the three after IN-25 was re-executed on 2026-08-24. RE-MEASURED through the gate's own auditSource, not cited: ITEM 1 IS WITHDRAWN — e.message.padEnd(10), .repeat(2), .replace(a,b) and a two-method chain ALL report unredacted-object-value, because derivesFrom follows a call whose callee is a MEMBER, so an unnamed method is transparent rather than opaque. ITEM 3 IS NARROWED IN TWO PLACES, one more than the review named: a value routed through an OBJECT literal REPORTS (the object-literal value is itself a guarded POSITION) and an accumulator built with a plain + REPORTS unredacted-concat. WHAT IS STILL OPEN, each measured []: item 2's bare-identifier callee (fmt(e)); and item 3's comma expression, await, and ARRAY literal (both the a[0] and the a.join('') spellings). ITEMS 4 AND 5 (IN-22's two limits) are unchanged and stay pinned as measured silences. PINNING NOW: item 1 and item 3's two firing halves are pinned in the FIRING direction by 'CORRECTED BY EXECUTION (IN-25)'; the four surviving open halves are pinned as measured silences by 'RESIDUAL, STILL OPEN AFTER IN-25'. So a closure OR a regression on any of them now moves a test, which entry 24 said would not happen. METHOD FINDING, the reusable part: the enumeration was read off the BRANCHES of derivesFrom — the right method, and why items 2, 4 and 5 are right — and the missing step was crossing it with the POSITION and OPERATOR rules, which catch some of the branches' blind spots anyway. WR-31 also closed here: the paragraph's closing sentence now names its antecedent (the RENDER-FORM list, not the five-item residual the same paragraph calls three-fifths unpinned two lines above). NOT A LEAK: every shape above is a disclosure question in a gate that runs green. | open |  | 2026-08-24T12:59:35.193Z |  |
| 31 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | THE NARROWING AFTER WAVE 26 (plan 01-26, closing IN-26). This block AMENDS the wave-25 residual above rather than replacing it: everything in it still holds except the one clause named here, and wave 27 still owns the derivation that replaces the whole authored text. WHAT CHANGED, and it is one clause. Wave 25's STILL OPEN paragraph named "the DESTRUCTURED KEY BINDING, `const { k } = o; sdk[k].send(req)` — WAVE 26 (IN-26)" as a single open shape. Measured, it is THREE shapes with three different answers, and only one of them was ever IN-26. CLOSED HERE, both spellings, by giving the assembled-name collector the binding-pattern reading its RECEIVER sibling already had: `const { k } = { k: "req" + "uests" }; sdk[k].send(req)` and `const [k] = ["req" + "uests"]; sdk[k].send(req)` both reported `[]` before this wave and both report `outbound-unanalysable` after it, as do the renamed-key spelling `const { p: k } = { p: "req" + "uests" }` and a non-zero array slot. That is what the header two hundred lines up already claimed when it said an assembly is read "through EITHER a declaration or an assignment" — both of these are declarations, and the claim was true of one spelling out of three. STILL OPEN, AND NOT IN-26: `const { k } = o; sdk[k].send(req)` — the exact string wave 25's paragraph used — is a value crossing a boundary the walk does not follow, which is residual (a)'s function/value half, unchanged and NOT closed by this wave. Wave 25's paragraph named it with IN-26's identifier and IN-26 is not about it; that conflation is corrected here rather than left for the derivation to inherit. NEWLY OPEN AND NAMED BY MEASUREMENT RATHER THAN BY REVIEW, residual (b2): a destructured PLAIN LITERAL — `const { k } = { k: "requests" }; sdk[k].send(req)` — stays `[]`, because `constStrings` reads only the identifier spelling of the same declaration that `assembledNames` now reads three ways. It was found by measuring the result of closing IN-26, not predicted by IN-26 or by this plan, and it is DISCLOSED rather than folded in: widening `constStrings` through binding patterns is a separate decision that needs its own real-tree measurement, and a wave that closes a shape while quietly opening its sibling is exactly the omission the wave-25 paragraph above exists to stop. Pinned as a MEASURED SILENCE so the day it is closed a test moves. THE OPERATOR AROUND A GLOBAL RECEIVER — `(ok && globalThis).fetch(url)` and its five twins — is UNCHANGED, still OPEN and still UNOWNED; this wave neither closed it nor broke it and claims nothing about it. THE ALIAS BOUND IS NOW STATED IN ONE PLACE AND POINTED AT FROM THREE (WR-30). Three docblocks — on `isGlobalReceiverIn`, on `globalAliases` and residual (c) itself — each asserted a ONE-HOP bound and each named a source string as silent. All three were EXECUTED before being edited and all three REPORT: `const a = globalThis; const g = a; g.fetch(u)` gives `outbound-fetch`, `const a = eval; const b = a; b(s)` gives `outbound-dynamic-code`, `const a = navigator; const n = a; n.sendBeacon(u, d)` gives `outbound-beacon`. The first of those was contradicted by a PASSING test 1,800 lines below it in the same file asserting the identical string reports; two passing assertions that cannot both be true is the sharpest form of the defect this phase keeps finding. Each is now a POINTER to residual (a) plus the local fact that is genuinely about that symbol, because a bound restated in four places is a bound that drifts in three. THE FOURTH IDENTICAL SENTENCE SURVIVES AND IS CORRECT: on `assembledNames`, keys read the INITIALIZER'S SHAPE and never the live set, so they cannot chain — executed, `const a = "req" + "uests"; const b = a; sdk[b].send(req)` is `[]`. That it is true there is precisely why the other three read as true to a skimming reader, and it is marked as the one place the one-hop bound is stated so the next author does not delete the correct one with the stale ones. THE TRANSITIVITY ASSERTION NOW COVERS ALL FIVE ALIAS SETS at three hops, where it covered three at two. RECORDED DISCREPANCY, because the plan's prediction did not survive measurement: `navigatorAliases` and `globalAliases` were NOT uncovered — two sibling cases already asserted both chaining at two hops — so this is a consolidation into the one place residual (a) sends a reader, plus a depth widening, and not the closure of a hole. THE DIRECTION OF ALL OF WR-30 IS SAFE: the gate reaches FURTHER than those three sentences said, so nothing was hidden by them. They are still overclaims and are named as such, because a residual list is trusted for its completeness in both directions. EVERY EXEMPTION RE-MEASURED AFTER THE COLLECTOR WIDENING, not argued: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` dotted-path walk (the `for…of` key, written `(cur as Record<string, unknown>)[key]`) and its `ctx[root]` parameter, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all quiet. Destructuring is ordinary in this codebase, so the widening shipped with its must-stay-quiet twins IN THE SAME COMMIT: an ordinary destructure used as an ordinary lookup, a numeric slot, a rest element, and a destructure of a value the walk cannot read all report `[]`. NOTHING LEAKED: IN-26 was unreachable in the real tree today, WR-30 ran in the safe direction, and the gate runs green over the real tree — 23 files, ZERO violations — inside a 1148-test suite, with `pnpm check:bundle` reporting the shipped bundle's entire import set as one specifier, `crypto`. `REQUIREMENTS.md` and `STATE.md` stay deliberately untouched and CORE-11's box stays `[ ]`, for the reason waves 24 and 25 recorded: wave 27 derives the replacement text and wave 28 reconciles both requirement-tier ledgers to it in ONE move. | fixed |  | 2026-08-24T13:01:13.195Z | 2026-08-24T13:49:09.560Z |
| 32 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | POINTER, NOT A COPY — WAVE 27 (plan 01-27). SUPERSEDES ENTRY 31, which carried the WAVE-26 bound as text. From this wave this ledger RESTATES NO BOUND and names where the bound lives instead. THE RESIDUAL IS GENERATED by `deriveResidual(RESOLVER_REGISTRY)` in `packages/backend/src/outbound-prohibition.spec.ts`, from a registry of 38 records (31 resolvers, 7 measured silences), each carrying a probe and a counter-probe the suite EXECUTES against `auditSource`. THE TEXT SHIPS IN TWO SURFACES and is byte-compared to that output in both: that gate header, and `.planning/REQUIREMENTS.md` CORE-11, each between the sentinels `BEGIN DERIVED RESIDUAL …` / `END DERIVED RESIDUAL`. THE ENFORCING TESTS are in that file`s `the residual is DERIVED` describe: per-row probe and counter-probe execution, two byte comparisons, an entry-count assertion against the registry length, a coverage guard over two enumerated resolver populations with a named exemption list, and two extractor fixtures (missing sentinel; absent planning ledger). WHY THIS LEDGER POINTS RATHER THAN COPIES: it is an append-only dated history, and a block regenerated inside it would rewrite the record of what was believed and when. THE POINTER-NOT-A-BOUND RULE HAS NO MECHANICAL CHECK — the byte comparison reaches those two surfaces and no further — and that limit is named rather than left implicit. WHAT WAVE 27 DOES NOT DO: it changes no rule, closes no shape, and does not close the class; it makes the class MECHANICALLY DETECTABLE. Six divergence directions were executed and each watched turning the suite red. CORE-11 stays `[ ]`; wave 28 owns the flip, against the generated block. | fixed |  | 2026-08-24T13:49:23.650Z | 2026-08-24T14:05:59.280Z |
| 33 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | POINTER, NOT A COPY — WAVE 28 (plan 01-28). SUPERSEDES ENTRY 32, which recorded the derivation; this entry records the DISCHARGE that was read off it, and it RESTATES NO BOUND, by the same rule wave 27 set. WHAT WAVE 28 DID: it discharged CORE-11's own first sentence ITEM BY ITEM — one row per surface that sentence enumerates plus one row per shape gap-closure round 5 closed, each row carrying a probe executed through `auditSource` in that session, the rule identifier it produced, the fixture title that asserts it, and the plan and summary that watched that fixture fail. THE TABLE IS IN `.planning/phases/01-skeleton-persistence-compatibility/01-28-SUMMARY.md`; the table is the evidence and the checkbox is not. THE OUTCOME, STATED PLAINLY: CORE-11's box is STILL `[ ]` and the blocking row is NAMED rather than deferred — the `no global fetch by ANY RECEIVER or alias` clause, and with it `no navigator.sendBeacon`, because an operator wrapping a GLOBAL receiver is not reached by the operator descent wave 25 built for the SDK receiver. That silence is the ONE entry in the generated block labelled OPEN AND UNOWNED rather than carried as residual (a), (b) or (b2); the reasons live in that block and in `.planning/REQUIREMENTS.md`'s plan 01-28 correction, not here. ORDERING, RECORDED BECAUSE IT IS WHAT MAKES THE DECISION TRUSTWORTHY: the two byte comparisons were run and observed GREEN BEFORE the box was examined, not after. THE RESIDUAL OF RECORD IS THE GENERATED BLOCK named in entry 32, unchanged by this wave. WHAT WAVE 28 DID NOT DO: it changed no rule, no fixture, no resolver and no registry row, planted no mutation, and hand-edited no machine-owned span; its entire diff in the gate file is one comment above the sentinel. STORE-03's and STORE-07's ledger collisions remain DEFERRED WITH THEIR OWNER — the operator, at the next requirements pass, by the STORE-01 → STORE-08 route — so a CORE-11 status of any kind must not be read as the ledger being clean. NOTHING LEAKED: the real tree re-measured at 23 files and ZERO violations with all four exempt sites quiet by name, the suite is green at 31 files / 1200 tests, and `pnpm check:bundle` reports one specifier, `crypto`. The blocking row is PROSPECTIVE blindness in a test-only gate. | fixed |  | 2026-08-24T14:05:59.349Z | 2026-08-24T19:02:50.294Z |
| 34 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | POINTER, NOT A COPY — WAVE 29 (plan 01-29). SUPERSEDES ENTRY 33, which recorded wave 28's discharge; this entry records the BINDING wave 29 added, and it RESTATES NO BOUND, by the same rule wave 27 set. WHAT WAVE 29 ADDED, AND THE MEASUREMENT THAT MADE IT NECESSARY: the round-6 verifier deleted the compound-assignment assembly branch — the branch `assembledNames`' clause names when it says `a compound assignment` — and the ENTIRE derived block stayed at 52 passed, 0 failed (WR-32). The shipped TEXT was bound to the REGISTRY by bytes and each row's PROBE to the walk by execution; NOTHING bound a row's CLAUSE to the branch it describes. Wave 29 adds that third binding. `ResolverRecord` now carries a `branches` list — 60 probes across 32 rows, every resolver row carrying at least one — each entry naming the clause phrase it answers, a greppable anchor for the branch's own code site asserted to occur at a LINE START, a probe exercising THAT branch, and the rule identifiers it was MEASURED to produce. `BRANCH_VOCABULARY` makes "this clause names that branch" a string test rather than a reading; `UNBOUNDED_QUANTIFIERS` and `QUANTIFIED_CLAUSES` make a universal in a DECLARED PHRASING carry a measured bound; `FALSIFIED_HANDOFFS` records, as DATA rather than as prose inside a clause, the six phrases wave 29 measured false, the finding that falsified each, the wave that owns each widening (30 for CR-13, 31 for CR-12, 32 for CR-11) and the probe whose still-silent answer turns the entry RED the moment a later wave widens the code without re-widening the clause. THE ENFORCING TESTS live beside the ones entry 32 names, in that file's `the residual is DERIVED` describe: a per-branch execution case, a vocabulary-coverage guard, a branch-anchor existence assertion matched at line start, a resolver-row branch requirement, the quantifier guard with its three-universal check, the still-falsified handoff case, and a guard that no clause names its owning wave in prose. FIVE MUTATION DIRECTIONS were each executed SEPARATELY and watched turning the suite red, restored, and re-run green — the verifier's own `PlusEqualsToken` deletion, a second named branch, a missing branch entry, an emptied branch list, and an undeclared universal. WHAT IT DOES NOT CLOSE, STATED HERE BECAUSE AN OVERCLAIM IN A HISTORY IS WHAT THIS ROUND IS ABOUT: clause-to-branch binding makes a NAMED branch's removal detectable and does NOT make an UNNAMED branch detectable, and it does not close the class. Neither phrase list is exhaustive — a branch named outside `BRANCH_VOCABULARY`, or a universal spelled outside `UNBOUNDED_QUANTIFIERS`, is unmatched and therefore unbound — and the registry is still not proven complete. All FOUR limits ship inside the generated block on both byte-compared surfaces. THE POINTER-NOT-A-BOUND RULE STILL HAS NO MECHANICAL CHECK — the byte comparison reaches the gate header and `.planning/REQUIREMENTS.md` and no further — and this entry obeys it by choice rather than because anything enforces it. NOTHING LEAKED AND THIS WAVE CHANGED NO RULE: the walk and resolver bodies are byte-identical to the pre-plan tree, the real tree re-measured at 23 files and ZERO violations with all four exempt sites quiet by name, and `pnpm check:bundle` reports one specifier, `crypto`. CORE-11's box is EXACTLY as wave 28 left it and wave 32 owns it; STORE-03's and STORE-07's ledger collisions remain DEFERRED WITH THEIR OWNER. | fixed |  | 2026-08-24T19:03:12.830Z | 2026-08-24T19:29:34.580Z |
| 35 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | POINTER, NOT A BOUND (plan 01-30, gap-closure round 6, CR-13). A receiver KEY bound through a conditional, ??, \|\| or && INITIALIZER answered CLEAN while all four twins of the identical conditional reported; closed at the seam by operatorLiteralBinding, built on the existing operatorOperands and wired into BOTH of collect's identifier branches in one plan. The two clauses it falsified word for word — constStrings and literalsOf — were rewritten FROM THE CODE with a BranchProbe each, and both wave-30 FALSIFIED_HANDOFFS entries were deleted with the pin decremented, in the same commit as the widening. THE BOUND ITSELF LIVES IN THE GATE HEADER AND IN REQUIREMENTS.md, generated from RESOLVER_REGISTRY; this entry deliberately restates none of it, and that pointer-not-a-bound rule remains a PROHIBITION WITH NO MECHANICAL CHECK. Nothing leaked: prospective blindness in a test-only gate, real tree ZERO after each of the two widenings, check:bundle at one specifier (crypto). CORE-11's box is exactly as wave 28 left it; wave 32 owns it. | fixed |  | 2026-08-24T19:29:34.645Z | 2026-08-24T20:08:00.806Z |
| 36 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | POINTER, NOT A BOUND (plan 01-31, gap-closure round 6, CR-12). SUPERSEDES ENTRY 35, which recorded wave 30 closing CR-13; this entry records the widening wave 31 added, and RESTATES NO BOUND. A logical-assignment binding was invisible to every widening collector: `let r; r ??= sdk.requests; r.send(req)` answered CLEAN while `let r; r = sdk.requests; r.send(req)` reported outbound-send, two characters apart, with NINE shapes silent across ??=, \|\|= and &&= (sdk.requests, globalThis, fetch, eval, navigator, a string key, an assembled key) and ALL FOUR =/+= controls firing. The mechanism was one inline token test: collects alias-growing branch compared against EqualsToken while the numeric-poisoning arm eleven lines below it read ASSIGNMENT_OPERATORS and named `x \|\|= sdk.requests` in its own comment. CLOSED by a named frozen module-scope set ASSIGNING_OPERATORS (=, ??=, \|\|=, &&=) read by that branch, membership settled by MEASUREMENT with both readings run (the real tree did not discriminate, 23 files / 0 violations under both; the shapes did). Eight clauses rewritten from their branches with one BranchProbe per operator (73 -> 91), two FALSIFIED_HANDOFFS entries observed RED then discharged in the same commit as the code (4 -> 2). THE RESIDUAL IS NOT RESTATED HERE: it is generated by deriveResidual(RESOLVER_REGISTRY) from a 42-row registry and byte-compared into the gate header and REQUIREMENTS.md CORE-11 — read it there. Nothing leaked: CR-12 is PROSPECTIVE blindness in a test-only gate; check:bundle still reports one specifier, crypto. | fixed |  | 2026-08-24T20:08:16.828Z | 2026-08-24T20:47:28.548Z |
| 37 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | POINTER, NOT A BOUND (plan 01-32, gap-closure round 6, CR-11 + WR-33..WR-37 + IN-27..IN-30). SUPERSEDES ENTRY 36, which recorded wave 31 closing CR-12; this entry records what wave 32 changed, and RESTATES NO BOUND. CR-11 was SPLIT and both halves are closed. THE UNSAFE HALF, undisclosed and a plausible defensive idiom: `const g = globalThis ?? self; g.fetch(url)` answered CLEAN, and so did the conditional twin, `const f = fetch ?? x`, `const e = eval ?? x`, `const n = navigator ?? x`, `(ok && globalThis).fetch(url)`, `(ok && navigator).sendBeacon(u, d)`, `(ok && eval)(src)`, `(ok && fetch)(url)` and `new (ok && WebSocket)()` — while the SDK twins of the identical operator class reported, and the initializerReceiver row actively told a reader initializer position and call position give the same answer. CLOSED at the seam by ONE shared descent, operatorOperandMatching — a third consumer of the operatorOperands statement rather than a sixth copy of the operand loop — reached from SIX resolvers: isGlobalReceiverIn, isFetchExpression, bareFetchCallee, isNavigatorReceiver, globalNameOf and aliasedGlobalOf. THE SIXTH WAS FOUND BY MEASURING RATHER THAN BY READING: with the descent already wired into isFetchExpression, `(ok && fetch)(url)` was STILL silent, because the bare-call rule asked ts.isIdentifier(callee) && fetchAliases.has(callee.text) INLINE and never consulted that function at all. THE SAFE HALF was an OVERREACH TO CORRECT and not a hole — six wrapper spellings reported while the row claimed silence in every spelling, the gate reaching FURTHER than its own text, which cannot cause anyone to ship an outbound call believing it would be caught; wave 28 disclosed one instance of it UNPROMPTED with the correct mechanism and is credited for it. The row silence-operator-around-global-receiver was REMOVED rather than reworded, because re-measurement of all eighteen spellings found NO surviving silence, and its QUANTIFIED_CLAUSES and FALSIFIED_HANDOFFS entries went with it; FALSIFIED_HANDOFFS is now EMPTY and its pin is ZERO, both entries observed RED before anything was deleted. ALSO CLOSED: WR-37's nested destructure through reportReceiverMembers (a composition of two shapes already resolved, closed while its five siblings are carried as measured silences with executed probes because each of those is a genuine widening); WR-33's two exemption reasons at the TWO WEIGHTS the verifier assigned rather than flattened to one; WR-34's box pin, CORE11_BOX_EXPECTED, the first thing in this repository that can see CORE-11's checkbox, mutation-proved by flipping it; WR-35's two head-side instability mechanisms restored in all three disclosures with the exemplar renamed for the branch it takes; WR-36's IN-25 correction scoped to a NAMED PROPERTY VALUE with three spread counterexamples pinned in the same case; IN-27, IN-28, IN-29 and IN-30. CORE-11's BOX IS STILL `[ ]` AND FIVE BLOCKING ROWS ARE NAMED: the eight-row discharge table was re-executed in this session and all 35 probes report, including all six rows the verifier found blocked — but WR-37's five siblings are one-hop bindings of sdk.requests that stay SILENT (an array element position, an object-literal property, a class field, a parameter default, a for-of binding) while six other one-hop binding spellings report, so the gate cannot go red on shapes clauses 2 and 3 enumerate. That is the same arithmetic that held this box open at plan 01-18 and at wave 28. THE RESIDUAL IS NOT RESTATED HERE: it is generated by deriveResidual(RESOLVER_REGISTRY) from a 51-row registry and byte-compared into the gate header and REQUIREMENTS.md CORE-11 — read it there — and the pointer-not-a-bound rule remains a PROHIBITION WITH NO MECHANICAL CHECK. Nothing leaked: every finding this round closed is PROSPECTIVE blindness in a test-only gate, real tree ZERO after each widening, check:bundle at one specifier (crypto), suite green at 31 files / 1345 tests. | fixed |  | 2026-08-24T20:47:51.285Z | 2026-08-25T09:58:45.681Z |
| 38 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | POINTER, NOT A BOUND (plan 01-33, gap-closure round 7, CR-14 + WR-38 + WR-43). SUPERSEDES ENTRY 37, which recorded wave 32 closing CR-11; this entry records what wave 33 changed, and RESTATES NO BOUND. THE GATE FILE'S HAND-WRITTEN HEADER NOW STATES NO BOUND OF ITS OWN. Until this wave every guard in that file read RESOLVER_REGISTRY[].clause and nothing else, while the 3,465 hand-written lines a reader meets FIRST carried the declared quantifier phrasings 20 times and raised ZERO obligations. Two stale claims lived in exactly that gap and both were DELETED rather than corrected: CR-14, a paragraph asserting an operator wrapping a global receiver was STILL SILENT in six named spellings, pointing at a fixture titled as a measured silence — when wave 32 had closed the shape through operatorOperandMatching and bareFetchCallee, retitled that fixture CLOSED (CR-11), and REMOVED the registry row it rested on; and WR-38, a paragraph asserting CORE-11 was marked complete, contradicting the ledger row 8,100 lines below it. DELETION BEAT WIDENING, on the verifier's own measured reasoning: a corrected sentence is still an AUTHORED bound standing beside a DERIVED one, and widening the scans to read the header would have converted twenty stale sentences into twenty NEW obligations on prose that drifts again. Six rounds each corrected a stale sentence here and each acquired another; deleting removes the CLASS. WR-43 IS ANSWERED BY REMOVING THE SURFACE, NOT INSTRUMENTING IT, and a cheap guard keeps it removed: one case scans the WHOLE FILE'S OWN BYTES for the phrasings declared in UNBOUNDED_QUANTIFIERS, under a NAMED whitespace convention that JOINS comment lines so a phrasing wrapped across two of them is still seen, with three anchor-derived exclusions — each asserted non-empty, within a pinned line band, and positively containing a token only that construct carries — and HEADER_QUANTIFIER_EXEMPTIONS, 29 named and reasoned entries, covering every survivor. THE ROUND'S OWN DEFECT WAS FOUND INSIDE ITS OWN FIX: the review suggested a LINE-BASED scan, and the hand-written region scores 20 line-based against 24 joined, because FOUR occurrences wrap across two comment lines — a guard reporting 20 while 24 exist is a stated reach exceeding an executed one, which is the defect this whole round is about. The wrapped failing path was executed as a SEPARATE mutation and observed RED. A region nobody had measured, the 3,519 lines BELOW the registry carrying 27 occurrences, is inside the guard's reach for the same reason. ITS LIMITS ARE NAMED WHEREVER IT IS CLAIMED: it is a PHRASE LIST over BYTES under one whitespace convention, so a universal spelled in undeclared words passes it and it reaches bytes rather than meaning; and it is the DELETION, not the guard, that makes the header correct. THIS WAVE CLOSED NO CODE BLINDNESS AND WIDENED THE GATE'S REACH BY NO SHAPE — it changed the gate's DESCRIPTION OF ITSELF and made it singular. CR-15 and CR-16 remain OPEN and belong to wave 34; CORE-11's box is exactly as wave 32 left it and wave 35 owns it. THE RESIDUAL IS NOT RESTATED HERE: it is generated by deriveResidual(RESOLVER_REGISTRY) from a 51-row registry and byte-compared into the gate header and REQUIREMENTS.md CORE-11 — read it there — and the pointer-not-a-bound rule remains a PROHIBITION WITH NO MECHANICAL CHECK for this ledger and STATE.md. Nothing leaked: CR-14 and WR-38 are STALE TEXT in a test-only gate rather than unenforced behaviour, real tree at 23 files / ZERO violations, check:bundle at one specifier (crypto), suite green at 31 files / 1348 tests. | fixed |  | 2026-08-25T09:58:29.290Z | 2026-08-25T10:47:46.162Z |
| 39 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | POINTER, NOT A BOUND (plan 01-34, gap-closure round 8, CR-15 + CR-16 + WR-39 + WR-40 + WR-41 + WR-42 + IN-31..IN-33). SUPERSEDES ENTRY 38, which recorded wave 33 deleting the header's bounds; this entry records what wave 34 changed, and RESTATES NO BOUND. TWO SHAPES WERE DISCLOSED AND NO CLASS WAS ENDED. CR-15 — a bare global in RECEIVER rather than CALLEE position, silent family-wide including through a positively identified alias, so that const f = fetch; f.call(null, url) answered clean while f(url) on the next line reported — and CR-16 — an unreadable computed member on a positively identified navigator receiver, dropped where four other identified receivers and a navigator DESTRUCTURE twenty lines away in the same rule all reported — are now NAMED ROWS with executed probes and executed counter-probes in the generated span. Measured at the wave's start that span carried ZERO occurrences of .call, .apply, .bind, Reflect, navigator[ and require(; it now carries all six. THE ROWS LANDED IN THEIR OWN COMMIT BEFORE ANY BRANCH EXISTED, with both byte comparisons green in that commit, because under the bar the operator adopted — DERIVED, DRIFT-DETECTABLE, SOLE BOUND — the disclosure is the deliverable and a branch beside it is a bonus. THREE WIDENINGS WERE TAKEN, each only after cheap / obviously correct / measured were answered in writing: a receiver-position arm for the fetch surface, restricted to a bare-name receiver so the member-qualified spelling still reports EXACTLY ONCE; a SECOND, separate arm for the dynamic-code globals, which resolve through a different function and were therefore a second decision rather than a footnote on the first; and one \|\| admitting navigator to the unreadable-member arm. EVERYTHING STILL SILENT AFTER ALL THREE IS ROWED, NOT ASSUMED: a bare global in ARGUMENT position; an unreadable computed member of the global fetch, of an identified fetch alias and of a dynamic-code global; an outbound CONSTRUCTOR in receiver position, a third mechanism nobody predicted and re-measurement found; an unreadable member of a navigator across a function boundary; a module loader reached by way of a local binding in BOTH directions, NOT widened with that scope decision written into the row's own clause; the global fetch invoked as a tagged template, which names the existing key row BY ID so a searching reader is redirected rather than misled; and a destructure deeper than one element or nested through an array pattern. A PREDICTION MEASUREMENT CONTRADICTED, RECORDED RATHER THAN ABSORBED: the parameter-key spelling was predicted to survive the navigator widening and does not, because on an accepted receiver an unreadable member reports whatever the reason the key would not reduce; that row was NARROWED BY MEASUREMENT to the resolution boundary that does survive rather than left standing as a fiction. ALSO CORRECTED, both DISCLOSURE defects with no prohibition moved: WR-39, the head-side truncation discriminator re-derived from a sweep across FOUR parameter-name lengths after the stated one-byte delta turned out to be an artifact of a ten-character parameter name matching the redaction marker's length, with the byte-identical duplicate assertion deleted and the branch SELECTOR asserted in its place, all three disclosure sites moving in one commit and observations.ts changing by COMMENT ONLY; and WR-40/WR-42, the rendered-error spread residual split into the three mechanisms it exhibits, including a call's ARGUMENTS are never descended, which that list had never carried at all. THIS WAVE ENDED NO CLASS — the space of JavaScript spellings that reach a function through a value does not close, so no scan and no bar ends the class these shapes belong to, and closing them is not what earns CORE-11's [x]. CORE-11's box is untouched and belongs to wave 35. WAVE 33's whole-file quantifier guard stayed green throughout and its exclusions, its exemption map and both its pinned counts are BYTE-UNCHANGED. THE RESIDUAL IS NOT RESTATED HERE: it is generated by deriveResidual(RESOLVER_REGISTRY) from a 61-row registry and byte-compared into the gate header and REQUIREMENTS.md CORE-11 — read it there — and the pointer-not-a-bound rule remains a PROHIBITION WITH NO MECHANICAL CHECK for this ledger and STATE.md. Nothing leaked: every finding this wave touched is PROSPECTIVE blindness in a test-only gate, real tree at 23 files / ZERO violations after every widening, check:bundle at one specifier (crypto). | fixed |  | 2026-08-25T10:48:11.804Z | 2026-08-26T03:33:33.903Z |
| 40 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | POINTER, NOT A BOUND (plan 01-35, gap-closure round 9). SUPERSEDES ENTRY 39, which recorded wave 34's CR-15/CR-16 rows. THE OPERATOR RE-SCOPED CORE-11's ACCEPTANCE BAR on 2026-08-25 by the STORE-01 -> STORE-08 route, because the old bar (the gate goes red on every spelling of every enumerated clause) is UNREACHABLE over an open language rather than merely unmet. The three criteria that replace it — DERIVED, DRIFT-DETECTABLE, THE SOLE BOUND — were each re-verified BY EXECUTION in wave 35 and each proved live by a mutation planted, watched red and restored; CORE-11's box is now [x], moved with CORE11_BOX_EXPECTED in ONE commit. CRITERION 3's verdict is SCOPED and the scope is part of it: met up to the guard's PHRASE-LIST REACH under its NAMED NORMALIZATION, with two classes of unreached surface named — unguarded FILES (.planning/STATE.md and .planning/WINDOWS.md, reached by no mechanical comparison, which includes this entry) and undeclared SPELLINGS inside the guarded files. THIS ENTRY RESTATES NO BOUND: the bound of record is the machine-owned generated span in .planning/REQUIREMENTS.md and in the gate file, byte-compared to deriveResidual(RESOLVER_REGISTRY) by the suite. THE NEW BAR IS NARROWER THAN THE OLD ONE AND ENDS NO CLASS — CR-15, CR-16 and the twenty-six measured silences are NAMED RESIDUALS under it, and the class stays open because the space of JavaScript spellings is open. What narrowed is the CHECKBOX's meaning, not the PROHIBITION's, which is byte-identical. STORE-03 and STORE-07 are untouched and remain deferred with their owner. | fixed |  | 2026-08-26T03:33:46.522Z | 2026-08-26T11:11:00.277Z |
| 41 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | POINTER, NOT A BOUND (plan 01-38, gap-closure round 8, waves 36 through 38). SUPERSEDES ENTRY 40, whose description states "CORE-11's box is now [x], moved with CORE11_BOX_EXPECTED in ONE commit" — FALSIFIED by commit 4105fd0 of 2026-08-26, which reverted the box and the constant together seven minutes after verification pass 8 was written and adjudicated criterion (3) UNMET. Entry 40's remaining content stands and is not rewritten: the 2026-08-25 operator re-scope, the three criteria, the SCOPED criterion-3 verdict, the two named classes of unreached surface, the narrowness statement and the named residuals all remain the current position. THE ROUND'S FOUR FINDINGS AND THEIR DISPOSITION. CR-17: the exemption keys were positional and survived a cross-construct relocation unnoticed — anchored by constructAnchorFor in wave 37, watched failing first on a purpose-built relocation fixture. WR-48: quantifier exclusion three narrowed to 4135..5767 in wave 37, and the 117 restored lines MEASURED at ZERO new obligations. CR-18: CORE-11's ledger row reduced in wave 38 to the prohibition plus one pointer, with all three removed passages relocated BYTE-IDENTICAL into a dated 2026-08-26 history block — a row that carries no statement of the box's state cannot carry a stale one. CR-19: .planning/STATE.md's live blockers corrected in wave 38 against six probes RE-EXECUTED through auditSource in that session, all six reporting, and against a registry re-counted at 26 measured-silence rows of 61 with all five of plan 01-32's names present and silence-operator-around-global-receiver ABSENT — that row was not restored and the suite requires it to stay gone. NEW AND OPEN, FOUND BY THIS ROUND'S OWN RE-RUN OF CRITERION (3)(d) AND NOT REPAIRED HERE: the gate file's hand-written header still states CORE-11's box state and a stale flip ownership in TWO places, inside the undated wave-25 and wave-26 narrative blocks, and one of them sits four lines above wave 33's WR-38 note asserting the box is stated in EXACTLY TWO places. The gate file is closed after plan 01-37 and plan 01-38 is prohibited from editing it, so this is RECORDED rather than fixed. THIS ENTRY RESTATES NO BOUND AND IS A POINTER: the bound of record is the machine-owned generated span in .planning/REQUIREMENTS.md and in the gate file, byte-compared to deriveResidual(RESOLVER_REGISTRY) by the suite. CORE-11's box is [ ] as measured on 2026-08-26 and whether it may move belongs to a verifier on the whole round's evidence; this entry awards no verdict. | open |  | 2026-08-26T11:10:50.592Z |  |
| 42 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | CR-21 closes one laundering route only: a hand-written key outside HEADER_QUANTIFIER_EXEMPTIONS, the same-construct residual, the phrase-list reach and both classes of unreached surface remain — criterion (3) not discharged. | open |  | 2026-08-26T14:29:20.319Z |  |
| 43 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | FINDING F-10: the round-10 baseline variable BASE_FILES held a source-file count (46) while its only consumer compares it against vitest's test-file count (31) — two correct measurements of different quantities | open |  | 2026-08-26T19:41:49.796Z |  |
| 44 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | FINDING F-11: plan 01-43 states the WR-54 case claims 'all five locators proved unique when THREE are'; enumerated this session the case used five locator expressions of which TWO were proved | open |  | 2026-08-26T19:41:49.894Z |  |
| 45 | 01 | unmet-truth | packages/backend/src/outbound-prohibition.spec.ts | 9147 | F-3 (measured by plan 01-46, filed by plan 01-47 which owns this ledger): the HEADER_QUANTIFIER_EXEMPTIONS section divider reads '--- HEADER (1..956) ---' while the BEGIN DERIVED RESIDUAL sentinel sits at 949, so the header extent is 1..948. A hand-written range in the gate file's live bytes, off by one on arrival and off by eight now, reached by no mechanical check. Same class as CR-25/CR-31. | open |  | 2026-08-27T14:05:00.114Z |  |
| 46 | 01 | unrun-verify | packages/backend/src/outbound-prohibition.spec.ts | 10314 | F-2 (measured by plan 01-46, filed by plan 01-47 which owns this ledger): the anchor walk's foreign-lines report has a zero branch and a non-zero branch; neither of wave 46's two planted mutations exercised the non-zero branch, so the rendering path a reader would meet on a real split shadow has never been watched. It is a failure-message path, not an assertion — recorded as unwatched rather than claimed as guarded. | open |  | 2026-08-27T14:05:13.436Z |  |
| 47 | 01 | deviation | .planning/phases/01-skeleton-persistence-compatibility/01-SECURITY.md | 168 | F-1 class, and plan 01-47 hit its own instance: a plan gate that can only go green by mutating an artifact marked kept-verbatim. 01-46's WM -eq 3 gate was unsatisfiable alongside the census that plan mandated (measured 7, zero new mechanism claims). 01-47's open-scoped gates on 01-SECURITY.md read 1 and 3 because every row whose Status cell says open sits inside a superseded, kept-verbatim historical block, and all three were already CLOSED with evidence. Both executors declined to fit the artifact to the gate. The gates, not the artifacts, are what need revising. | open |  | 2026-08-27T14:05:13.548Z |  |
| 48 | 05 | stub | tests/export-payload-budget.spec.ts |  | EXPORT_RPC_CHUNK_ROWS is exported from a spec in tests/; plan 05-11 must move it into the exporter's module — production code must not import from tests/ | open |  | 2026-08-28T11:58:40.360Z |  |
| 49 | 05 | stub | tests/export-payload-budget.spec.ts |  | CSV serialiser is a measurement-only stand-in for packages/engine/src/csv.ts (UISEC-02), which plan 05-03 writes | open |  | 2026-08-28T11:58:40.447Z |  |
| 50 | 05 | unmet-truth | tests/sqlite-346-query-plans.spec.ts |  | Query plans measured on SQLite 3.53.4, not Caido's target 3.46.0 — no 3.46 binary reachable; assumption A5 narrowed, not closed | open |  | 2026-08-28T11:58:40.533Z |  |
| 51 | 05 | deviation | packages/engine/src/sanitise.ts |  | capped() makes one O(n) pass over a target-controlled string to report R2's total; disclosed in the module header, bounded by a named 2,000 ms ceiling on the 4 MiB case, and not the per-character-index shape DET-07 bans | open |  | 2026-08-28T12:25:05.499Z |  |
| 52 | 05 | deviation | .planning/REQUIREMENTS.md |  | Plan 05-04 declared UI-03, UI-04, OPS-01, OPS-02, OPS-04, FIND-01 and FIND-02 but deliberately left their boxes [ ] — the deliverables are deferred to Phases 3/4 and are carried in 05-ENTITY-CONTRACT.md's Deferral Register (P5-D21) | open |  | 2026-08-28T12:53:40.633Z |  |
| 53 | 05 | deviation | .planning/phases/05-workspace-operator-workflow/05-ENTITY-CONTRACT.md |  | D-01's one-way reversibility checkpoint is carried forward UNSPENT and is OWED to the first task that calls sdk.findings.create; no task in Phase 5 writes a Finding | open |  | 2026-08-28T12:53:40.720Z |  |
| 54 | 05 | deviation | packages/backend/src/store/schema.spec.ts |  | 05-06: the plan's task-2 gate edit was folded into task 1's commit to avoid committing a red schema gate; the task boundary in 05-06-PLAN.md and the shipped commit boundary therefore differ | open |  | 2026-08-28T15:11:18.513Z |  |
| 55 | 05 | deviation | packages/frontend/src/stores/coalescer.ts |  | 05-08: CoalescerOptions.trailingWindowMs is overridable and the reaction CAP is not. The seam exists so a spec can drive the debounce faster than the cap and prove the throttle gate load-bearing (P5-D62); a production caller passing a large window could delay a legitimate update. Disclosed, not closed — the mounting component (05-09) must not pass it. | open |  | 2026-08-28T16:39:28.707Z |  |
| 56 | 05 | stub | packages/frontend/src/App.vue |  | ArtifactsTable and ObservationsTable are mounted with :analyses="null" and :affected-filter="null" — the shipped paged reads carry no scan_state and no endpoint returns one, so no per-row Partial badge and no partial-view banner render on the running page. UI-09 deliberately left unmarked. | fixed |  | 2026-08-28T17:26:44.942Z | 2026-08-29T01:31:22.450Z |
| 57 | 05 | stub | packages/frontend/src/components/ArtifactsTable.vue |  | The triage column renders empty text: the triage table does not exist yet (its key waits on Phase 4's stable entity identity, D-05(4)). The column holds its position so it does not shift every column right of it when the data lands. | open |  | 2026-08-28T17:26:53.143Z |  |
| 58 | 05 | stub | packages/frontend/src/components/PartialBanner.vue |  | The show-only-affected action is suppressed on both shipped tables because the backend statement matrix has no scan-state filter column, so no single-column filter can express 'only the affected artifacts'. Component-level behaviour is proved; the wiring has no filter to bind to. | fixed |  | 2026-08-28T17:26:53.230Z | 2026-08-29T01:31:22.560Z |
| 59 | 05 | stub | packages/frontend/src/components/EvidencePanel.vue |  | The evidence panel's byteRange and snippet slots render an explicit not-yet-available line naming Phase 4 (plan 04-03): the evidence table does not exist, so there are no offsets to slice and no excerpt to show. App.vue passes :evidence="null". The rendering path is fully exercised by the panel spec against the shared hostile fixture; only the producer is absent. | open |  | 2026-08-29T01:31:47.734Z |  |
| 60 | 05 | stub | packages/frontend/src/components/EvidencePanel.vue |  | The score-explanation slot renders an explicit not-yet-available line naming Phase 3 (plan 03-03): there is no signal vocabulary and no scorer, so no score has been computed. UI-04 stays open. | open |  | 2026-08-29T01:31:47.844Z |  |
| 61 | 05 | stub | packages/frontend/src/components/EvidencePanel.vue |  | The source-request slot renders an explicit not-yet-available line: App.vue passes :source-request-id="null" because nothing links an artifact to the observation whose request still resolves (D-02's walk is the deferred pass's). UI-03 is deliberately NOT marked complete for this reason and the byte-offset one. | open |  | 2026-08-29T01:31:47.959Z |  |
| 62 | 05 | deviation | packages/backend/src/store/retry.ts |  | A retry returns the analysis to the queued state but does NOT re-walk the bytes: DefMiner retains a digest, a length and a kind and no body, so the walk happens the next time the target serves them. The panel states this in words. Phase 2's ERR-02 recovery is what drains a pending row without a fresh sighting. | open |  | 2026-08-29T01:31:48.065Z |  |
| 63 | 05 | unrun-verify | packages/backend/src/store/export.ts |  | The 8 MiB per-RPC-call figure is a BUDGET this project sets, not a ceiling measured from Caido; 05-02 asked 05-11 to confirm a large export against a real Caido and it could not. Coverage D13. | open |  | 2026-08-31T08:20:05.758Z |  |
| 64 | 05 | stub | packages/frontend/src/App.vue |  | SERVER_STORAGE_PATH is null — the R5 server-path renderer in SettingsPanel.vue ships with no production data source; telemetry.ts strips sdk.meta.path() out of everything crossing the RPC, so DEPLOY-02 (Phase 6) owns the surface that supplies one | open |  | 2026-08-31T09:17:48.121Z |  |
| 65 | 06 | stub | packages/backend/src/index.ts |  | getScanStatus reports analysed: null — the scans table has no analysed column and plan 06-06 owns wiring the consumer-side number | open |  | 2026-08-31T16:12:21.498Z |  |
| 66 | 06 | stub | packages/backend/src/index.ts |  | getScanStatus reports heldAtWatermark: false unconditionally — true is the honest answer for a build that walks one page per call, and plan 06-03 ships the watermark that can make it true | fixed |  | 2026-08-31T16:12:21.588Z | 2026-08-31T17:53:10.642Z |
| 67 | 06 | stub | packages/backend/src/scan/producer.ts |  | runScanProducer has no caller in the shipped build — Start scan inserts the row, and plan 06-03 adds the watermark-gated loop that drives the walk | open |  | 2026-08-31T16:12:21.682Z |  |
| 68 | 06 | deviation | scripts/phase6/o07-body-length.sh |  | Plan 06-02 task 2 step 5 as written (issue startScan with an operator clause, let the producer walk one page, read the query()-side Body.length) is NOT EXECUTABLE on the shipped build: index.ts startScan REFUSES any non-empty operatorFilter until 06-04 ships the validator, and runScanProducer deliberately has no caller until 06-03 ships the watermark. Measured through probe/phase6-o07 instead, which calls sdk.requests.query() directly. 06-03/06-04 should re-read this if they want the measurement repeated through the real producer. | open |  | 2026-08-31T16:34:32.559Z |  |
| 69 | 06 | deviation | probe/phase6-o07/backend/script.js |  | The O-07 query() walk is UNFILTERED (descending req.id, first 50, items matched by the request id the hook recorded) rather than filtered to the fixture's path. Deliberate: this phase's own O-03/O-06 record Caido's req.path / req.query / cont implementations as unmeasured, so a filtered walk returning nothing would make 'the read path reports no body' and 'the clause did not match' indistinguishable. The byte-count verdict therefore does NOT cover a filtered query() page. 06-11's push-down proof is the plan that should close it. | open |  | 2026-08-31T16:34:42.297Z |  |
| 70 | 06 | deviation | tests/phase6-o07.spec.ts |  | Plan 06-02 task 1's <verify> (pnpm vitest run tests/phase6-o07.spec.ts, fails_when non-zero exit) is unsatisfiable at task-1 time by task 1's own acceptance criterion, which requires the gate to FAIL when the artifact is absent. Executed as a RED gate: 13 failed / 7 passed / 0 skipped at task 1, 20 passed after task 2 wrote the artifact. No code changed to reconcile them. | open |  | 2026-08-31T16:34:42.387Z |  |
| 71 | 06 | deviation | packages/backend/src/index.ts | 692 | Plan 06-04 did NOT remove the refused/operator-clause-unsupported placeholder despite the executor brief saying it would. Assessed and declined: 06-05-PLAN.md (wave 3, depends_on 06-04) names index.ts and api/spec.ts in files_modified and explicitly owns 'Extend startScan to run the operator clause through validateOperatorClause'. Removing it in 06-04 would have shipped a half-wired endpoint — no ScanCommandOutcome shape distinguishing a clause rejection from the one-scan-at-a-time refusal, no RPC union carrying the four new codes, no frontend copy in scan-contract.ts. D-05 is delivered by the end of the phase, on 06-04's validator. Closes when 06-05 lands. | fixed |  | 2026-08-31T17:00:10.126Z | 2026-08-31T17:53:10.461Z |
| 72 | 06 | unmet-truth | packages/backend/src/scan/filter.ts |  | The fail-CLOSED property is proved on DefMiner's half only. That an unbalanced or comment-truncated expression actually makes execute() throw is CITED from the SDK's own JSDoc (@throws {Error} If a query parameter is invalid, requests.d.ts:635-639) and has never been executed against a real Caido parser in this repo. 06-04 tests the refusal, the composer's omission, and producer.ts's handling of a rejected execute(); it does not test Caido. Plan 06-11's fixture suite over sdk.requests.matches() is where this becomes measured — along with whether req.path strips the query and whether cont is byte-wise or Unicode case-folded. Recorded as SUMMARY coverage D6 with human_judgment: true. | open |  | 2026-08-31T17:00:10.225Z |  |
| 73 | 06 | stub | packages/backend/src/index.ts |  | getScanStatus still reports heldAtWatermark: false unconditionally. Plan 06-03 made the value REAL — the producer holds at SCAN_BACKPRESSURE_WATERMARK and exposes isHeldAtWatermark() as module state precisely because getScanStatus is a separate call that does not hold the walk's outcome — but index.ts and api/spec.ts are named in 06-05-PLAN.md's files_modified and 06-05 owns the getScanStatus projection. Wiring it here would have shipped a half-owned endpoint the way 06-04 declined to (WINDOWS 71). Closes when 06-05 lands. Supersedes the ownership half of entry 66. | fixed |  | 2026-08-31T17:23:05.611Z | 2026-08-31T17:53:10.552Z |
| 74 | 06 | stub | packages/backend/src/scan/producer.ts |  | runScanProducer STILL has no caller in the shipped build. The loop entry 67 named now exists — watermark gate, per-page skip-done read, descending multi-page walk, yield, re-entrancy flag — but nothing drives it: startScan inserts the row and returns. The driver lives in index.ts, which is 06-05's files_modified. Entry 67 is therefore only half discharged: the loop is 06-03's and shipped; the caller is 06-05's and is not. | open |  | 2026-08-31T17:23:05.711Z |  |
| 75 | 06 | unmet-truth | packages/engine/src/thresholds.ts |  | SCAN_BACKPRESSURE_WATERMARK is a DROP-safety bound only and says nothing about LATENCY. At TOKENIZER_MS_PER_MB a full PASSIVE_MAX_BYTES artifact takes ~6.3s to walk and the consumer is strictly serial, so a queue standing at the watermark can be a long backlog in front of every live response the operator generates — none dropped, all waiting. Closing it needs a MEDIAN ARTIFACT SIZE over a real project's stored traffic; SPIKE-06's ladder was four sizes over a corpus of two, which is a ladder and not a distribution. 06-RESEARCH.md records the residual and this plan deliberately projected no number rather than reusing RSS_BYTES_PER_INPUT_BYTE as a latency proxy. The residual is stated in the source at the constant. | open |  | 2026-08-31T17:23:05.815Z |  |
| 76 | 06 | deviation | packages/backend/src/scan/scans.ts |  | Plan 06-03's files_modified names six files and does not include scans.ts or scans.spec.ts; both were edited. Forced by D-03 itself: replacing the per-item skip read with one bounded per-page read makes scans.ts's isRequestFinished dead, and knip reports a dead export as an error. Deleted rather than left as a second way to ask the same question, and FINISHED_ANALYSIS_STATE exported so the producer binds the derived state instead of re-deriving it. scans.spec.ts lost the runScanProducer describe block, which moved to the new producer.spec.ts with a note at both ends. 06-05 and 06-06 both name scans.ts in their own files_modified and will see the change. | open |  | 2026-08-31T17:23:18.666Z |  |
| 77 | 06 | deviation | packages/backend/src/telemetry.spec.ts |  | Two SHIPPED gates were widened because each was narrower than the invariant it enforces (the same shape as 06-01's deviation 1). (a) The projection's payload rule filtered containers by a hand-listed path set, so counters.retro failed a rule about PAYLOADS for being an object; it now judges LEAVES by shape. (b) The AST counters rule asserted literals.length === 1, which refused D-02's nested sub-map while still permitting a genuine second object elsewhere in telemetry.ts; it now asserts every counter-shaped literal is in telemetry.ts AND inside createCounters(), which is strictly stronger. Both failing paths are executed through the gate itself via a new pure scanSource(file, src). | open |  | 2026-08-31T17:23:18.756Z |  |
| 78 | 06 | deviation | packages/backend/src/scan/producer.ts |  | The producer DRIVER is still absent, and 06-05 declined it on scope grounds. WINDOWS 74 named index.ts (this plan's files_modified) as the driver's home, but 06-05-PLAN.md's files_modified does NOT include packages/backend/src/scan/producer.ts or packages/backend/test/fixtures/fake-sdk.ts, and both are required: runScanProducer needs sdk.requests.query(), which PluginSdk does not declare and the fake SDK does not implement, so adding it to the type is a fake-sdk.ts edit. Consequence: completeScan has NO production caller (nothing reports the producer's 'completed' stop into the transition), and suspendOnEpochChange's per-page call site does not exist — 06-05 wired D-04 at startScan and the polled getScanStatus instead, which is the only reachable substitute. NO REMAINING PLAN names index.ts together with producer.ts/fake-sdk.ts, so this has no owner. Supersedes entry 74's ownership claim. | open |  | 2026-08-31T17:52:59.837Z |  |
| 79 | 06 | deviation | packages/backend/src/scan/scans.spec.ts |  | 06-05 task 1 acceptance criterion 'suspendRunningOnInit over a project holding two running rows moves both in one statement and returns 2' is UNSATISFIABLE and was executed as two projects instead. Two running rows in ONE project cannot exist: idx_scans_one_running is a partial UNIQUE index on (project_id) WHERE state = 'running' (migration step v5), which is the plan's own one-at-a-time invariant, and it refuses the second insert including a raw one. The set-based property is asserted over two projects (each sweep returns 1, each is scoped to its own project) and the ERR-02 case in lifecycle.spec.ts asserts no row anywhere is left running. | open |  | 2026-08-31T17:52:59.926Z |  |
| 80 | 06 | deviation | packages/backend/src/scan/scans.ts |  | SCAN_LIST_DEFAULT_LIMIT stays at the 200 plan 06-01 shipped, not the 50 06-05-PLAN.md's action text names. The plan itself says the number is an ASSUMPTION and 'the number may move'; what it makes binding is the SHAPE (a stated bound, enforced at read, suspended rows exempt, the truncation said in words), and all four ship. Changing an already-exported, already-asserted constant to a different unmeasured number would have been churn. The constant's JSDoc now says it is an assumption and names plan 06-13 as the owner of the surface that renders the truncation sentence. | open |  | 2026-08-31T17:53:00.019Z |  |
| 81 | 06 | deviation | packages/backend/src/scan/scans.ts |  | RESUME_SQL re-bases the row's epoch, which 06-05-PLAN.md's behaviour text does not ask for and its task-2 line ('a resume under the ORIGINAL epoch continues') arguably contradicts. Forced as a Rule 1 bug: projectEpoch() is a MONOTONIC count of applied project changes and never returns to a previous value, so a resume preserving the stale epoch produced a scan that suspended itself again on its first page for ever — D-04's suspension was a one-way door and the must-have 'resumes only on explicit operator action' was unreachable. The plan's line is satisfied under the reading that the discriminator is the PROJECT rather than the number: a resume from the wrong project is refused by project_id scoping (getScan returns undefined -> no-scan), which is UI-SPEC's 'Resume it from that project'. | open |  | 2026-08-31T17:53:00.108Z |  |
| 82 | 06 | deviation | packages/backend/src/scan/scans.spec.ts |  | Tasks 1 and 2 carry tdd="true" but workflow.tdd_mode is false in config.json, and 06-05 did NOT ship separate RED-then-GREEN gate commits for task 1: the statements and their spec landed in one feat() commit. Task 2's spec is its own test() commit. Non-vacuity was established by MUTATION instead, and both mutations were executed and recorded: removing LIST_SCANS_SQL's leading (state = 'suspended') DESC term fails exactly the pin case, and emptying DEFERRED_REASONS fails exactly the vocabulary case. The index.ts sweep-ordering assertion was mutation-checked the same way (moving the sweep after the registrations fails it). | open |  | 2026-08-31T17:53:00.199Z |  |
| 83 | 06 | deviation | packages/backend/src/filesystem-prohibition.spec.ts |  | Plan 06-07 acceptance criterion 'self-audit returns an empty array' was unsatisfiable (the gate must import node:fs for its own walk); shipped a strictly stronger assertion instead - exactly one violation, and none after removing that import line. | open |  | 2026-08-31T18:52:36.722Z |  |
| 84 | 06 | unmet-truth | packages/backend/src/store/sql-discipline.spec.ts | 445 | THE BELIEF IS THE FINDING, NOT JUST THE FIX. 06-CONTEXT.md:444 records 'The SQL discipline gate is the strongest invariant in the backend'; that is not true of a multi-statement SQL blob. The insert-select rule at sql-discipline.spec.ts:445-450 bans INSERT ... SELECT package-wide with NO allowlist entry, but statementKind() at :126-129 classifies a SQL string by its LEADING KEYWORD, so a blob leading with CREATE skips insertsFromSelect, isMultiRowStatement and isDecomposable entirely. Step v2's CREATE TRIGGER ... BEGIN SELECT RAISE(ABORT, ...); END and step v6's audit rebuild both pass UNOBSERVED today. Widening the gate to split on ';' and classify each statement independently was put to the operator at 06-06's checkpoint and DECLINED FOR THAT PLAN ONLY as unbudgeted scope that may surface violations in step v2's shipped trigger - declined as scope, not as a non-issue. Step v6's JSDoc makes the compliance argument explicitly and says in its own words that a green run on migrations.ts is green by non-observation. OWNER: Phase 11 hardening, unless an earlier Phase 6 plan already touches sql-discipline.spec.ts. | open |  | 2026-08-31T20:55:42.978Z |  |
| 85 | 06 | deviation | .planning/REQUIREMENTS.md |  | PRE-EXISTING AND NOT 06-06's: outbound-prohibition.spec.ts's byte-compare of the derived residual block in .planning/REQUIREMENTS.md fails at 532491a (06-07's close-out, the last commit to touch either input). The shipped block gained three blank lines the generator does not emit - after 'DECLARATION THE TWO READERS RESOLVE THEIR OWN PATHS FROM:', around the two-file list, and before '1. Each entry below is verified by EXECUTION' - consistent with a markdown reflow applied by requirements.mark-complete during a docs close-out. 06-06 modified neither input (git diff HEAD over both is empty) and left it unfixed under the scope boundary. THE SPEC PRINTS THE EXACT REMEDY: it is machine-owned text and the generated form is authoritative, so the fix is to paste the BEGIN/END EXPECTED span. RISK: every close-out that runs requirements.mark-complete can re-introduce it. OWNER: whoever next runs a docs close-out in Phase 6. | open |  | 2026-08-31T20:55:43.070Z |  |
| 86 | 06 | stub | packages/backend/src/index.ts |  | ScanStatusPayload.analysed is STILL null after plan 06-06, and window 65 assigned it to this plan. NOT DONE, and not silently: 06-06-PLAN.md's files_modified names neither index.ts's getScanStatus nor the engine contract, and there is no cheap wiring - analyses rows carry no scan attribution, so a per-scan analysed count needs either a NEW scans column (another one-way migration step, a decision this plan had no mandate for) or telemetry.ts's in-memory retro sub-map. Attempting it here would have been a Rule 4 architectural change taken without asking. OWNER: plan 06-09, which already owns delivering scan progress to the frontend on one channel and already took a mid-execution scope addition; 06-12 renders the readout and would inherit it otherwise. Window 65 stays open and this entry names why. | open |  | 2026-08-31T20:56:03.270Z |  |
| 87 | 06 | deviation | packages/backend/src/index.ts |  | discardScan gained a fifth parameter (the caller-minted audit event_id), so two files OUTSIDE 06-06-PLAN.md's files_modified changed: index.ts's discardScan registration now passes randomUUID(), and scan/lifecycle.spec.ts's one call site was updated. Rule 3 (blocking): the plan REQUIRES the caller to mint the id - 'The caller mints the event_id UUID, which is what makes a retry a no-op rather than a duplicate' - and a caller-minted id has no meaning if the caller does not mint it. Also outside files_modified: retentionCounts() gained a scans field, because every other table the sweep bounds is counted there and a table the sweep deletes from that no reader can count is a bound nothing can be shown to hold. | open |  | 2026-08-31T20:56:03.364Z |  |
| 88 | 06 | deviation | packages/backend/src/store/migrations.spec.ts |  | 06-06-PLAN.md's task-3 acceptance criterion says 'retention.spec.ts STILL asserts' AUDIT_OVER_AGE_SQL's absence. It did not: before this plan the absence was asserted only BEHAVIOURALLY (the D-06 contrast case), with no source-text check. The criterion is now true rather than the premise being quietly accepted - retention.spec.ts asserts no  declaration exists AND that the paragraph naming it survives, since the D-06 block names the statement it refuses to have. Separately, migrations.spec.ts's cannot-fail gate was WIDENED beyond the plan: it used to filter to statements beginning with CREATE, so step v6's INSERT/DROP/ALTER would have been skipped entirely by the very gate that justifies batching them. | open |  | 2026-08-31T20:56:03.457Z |  |
| 89 | 06 | deviation | packages/engine/src/contract.ts |  | 06-08 shipped THREE internal marker keys, not the two the plan names. The plan's own behaviour contract requires the observed-loss flag to 'stay recorded across subsequent boots', and two keys (install id, boot count) cannot carry a durable third fact - the database that lost the marker is the same database the flag would have to live in. STORAGE_OBSERVED_LOSS_KEY is the third. The acceptance criterion is satisfied as a SUPERSET: SETTING_KEYS contains the two named marker keys and KNOWN_SETTINGS contains none of the three. Structurally stronger than the plan asked: KnownSetting.key and SettingWriteRequest.key narrow to OperatorSettingKey, so an internal key on the operator-editable surface is a typecheck failure rather than a spec assertion (T-06-41). | open |  | 2026-08-31T21:28:00.283Z |  |
| 90 | 06 | deviation | packages/frontend/src/components/settings-contract.ts |  | FIELD_COPY's Record was narrowed from SettingKey to OperatorSettingKey inside TASK 1's commit, although settings-contract.ts is a task-2 file. Forced: task 1's own <verify> runs 'pnpm typecheck', and adding members to SETTING_KEYS breaks Record<SettingKey, FieldCopy> exhaustively - the alternative was authoring operator-facing copy for three internal marker keys, which is the exact failure the key split exists to prevent. Only the type and its two doc paragraphs moved in task 1; the five path constants and truncatePathLeft stayed whole and came out in task 2's single commit, so the deletion set was NOT split. | open |  | 2026-08-31T21:28:00.372Z |  |
| 91 | 06 | deviation | packages/backend/src/index.spec.ts |  | settingsRows() was narrowed to exclude INTERNAL_SETTING_KEYS. Three shipped assertions counted EVERY row on the settings table to prove a scoping claim about a settings WRITE ('the caller's projectId was discarded'; 'a project-scoped write with no project stored nothing'), and init() now writes O-02's boot marker at the reserved global scope on every boot. Without the filter an unrelated feature decides whether a scoping assertion passes. Filtered over the CLOSED internal list, so a marker key added later is excluded by the vocabulary rather than by a remembered string. | open |  | 2026-08-31T21:28:00.466Z |  |
| 92 | 06 | deviation | .planning/REQUIREMENTS.md |  | WINDOW 85 RECURRED EXACTLY AS IT PREDICTED, AND IS FIXED AGAIN. 06-08's close-out marked DEPLOY-02 complete; requirements.mark-complete reflowed the derived residual block and re-inserted the SAME three blank lines - after 'DECLARATION THE TWO READERS RESOLVE THEIR OWN PATHS FROM:', around the two-file list, and before '1. Each entry below is verified by EXECUTION'. outbound-prohibition.spec.ts went red on the byte-compare and was restored by deleting the blank lines, never by touching the comparison. The final REQUIREMENTS.md diff for this plan is ONE character: DEPLOY-02's checkbox. The tool is the defect, not the close-out - window 85 stays open and owns it. | open |  | 2026-08-31T21:28:14.684Z |  |
| 93 | 06 | lint-warning | package.json |  | CORRECTED BY ORCHESTRATOR 2026-08-31: 'pnpm knip' exits 0, NOT 1. Measured on a clean tree: `pnpm knip >/dev/null 2>&1; echo $?` prints 0, and the only finding class is 'Tag hints (22)'. Tag hints are hints and do not fail the gate - phase 05's deferred-items.md recorded the same thing when the count was 8. 06-08's CONCLUSION was still sound (no new finding, verified against a git-stash baseline; the one new finding it introduced was fixed) but its premise was wrong, and the wrong premise is the hazard: it would let a future executor wave through a GENUINE knip failure as pre-existing baseline noise. Treat a non-zero knip exit as a real failure. ORIGINAL CLAIM, PRESERVED: 'PRE-EXISTING AND NOT 06-08's: pnpm knip exits 1 on a clean tree at 7ceff93 with 22 Tag hints' - @internal JSDoc tags knip reports as unused across compat.ts, telemetry.ts, lifecycle.ts, settings.ts, artifacts.ts, observations.ts, admit.ts, scans.ts, producer.ts and audit.ts. 06-08's acceptance criterion 'pnpm knip is clean' was therefore read as 'no NEW knip finding', and was verified by diffing the output against a git-stash baseline: identical. One new finding DID appear mid-plan (BootMarker exported but consumed only in its own file, which ignoreExportsUsedInFile:false rejects) and was fixed by un-exporting it. 06-CONTEXT.md's deferred list already names 'removing the eight now-redundant @internal JSDoc tags' as out of scope. | open |  | 2026-08-31T21:28:14.775Z |  |
| 94 | 06 | stub | packages/backend/src/index.ts |  | ScanStatusPayload.analysed IS STILL null after plan 06-09, and 06-09 was named its owner by window 86. RE-ASSESSED AND DECLINED AGAIN, WITH THE REASON AND A NAMED OWNER, exactly as 06-06 declined it. THE REASON IS UNCHANGED AND IS STRUCTURAL: analyses rows carry NO scan attribution — the primary key is (project_id, sha256, detector_set_hash) and nothing on the row says which scan offered the work — so an honest per-scan count needs EITHER a new scans.analysed column (another permanent step in a one-way migration ladder, in store/migrations.ts + scan/scans.ts) OR provenance on the queue Entry itself (engine/queue.ts + ingest/consumer.ts + telemetry.ts). 06-09's files_modified names NONE of those five files, in its original form or in the mid-execution scope addition, so wiring it here would have been a Rule 4 architectural change taken without asking. WHAT 06-09 DID DO: it declared the field on the NEW ScanProgressPayload too, as number\|null and emitted as null, so the wiring is one edit in one place rather than a shape change on the wire; and contract.spec.ts + producer.spec.ts both assert it is null rather than a lying 0. OWNER: NO PLAN IN 06-10..06-13 NAMES ANY OF THE FIVE FILES — measured against their files_modified — so this needs a Phase 6 gap-closure plan that owns store/migrations.ts and scan/scans.ts, or engine/queue.ts, ingest/consumer.ts and telemetry.ts. Window 86 stays open and this entry names why for the second time. | open |  | 2026-08-31T22:03:04.619Z |  |
| 95 | 06 | stub | packages/frontend/src/api/client.ts |  | subscribeInvalidation's onScanProgress argument is OPTIONAL, and when it is absent a scan-progress payload is DROPPED at the client. Deliberate and stated on the declaration: App.vue passes client.subscribeInvalidation straight to createCoalescer as its subscribe function, App.vue is owned by plan 06-13, and the alternative was a progress store created inside the client — owned by nobody and stop()ed by nobody, which is research P-04's exact leak. The SAFETY half does not depend on the argument: client.spec.ts asserts a progress payload never reaches the coalescer's summary handler whether or not a progress handler was given. OWNER: plan 06-12, which renders the readout and names api/client.ts in its files_modified; it passes the handler and this closes. | open |  | 2026-08-31T22:03:04.709Z |  |
| 96 | 06 | stub | packages/frontend/src/components/ScanLifecycleBadge.vue |  | ScanLifecycleBadge.vue has NO production renderer yet — its only consumer is scan-lifecycle-presentation.spec.ts. That is the shape plan 06-09 was scoped to deliver (the vocabulary, its map and its badge; not the surfaces that mount it) and knip exits 0 because the spec is a frontend entry. OWNER: plan 06-13 mounts it in the toolbar scan indicator (D-13) and names App.vue and ScanPanel.vue; 06-12 renders the Scan tab body. If neither mounts it, this is a component nobody renders and the window is the record of that. | open |  | 2026-08-31T22:03:04.797Z |  |
| 97 | 06 | deviation | packages/frontend/src/api/client.spec.ts |  | PLAN SCOPE DEVIATION, Rule 3 (blocking): plan 06-09's task 3 <files> named api/client.ts but not api/client.spec.ts, and task 2's <files> named no spec file at all. Both were needed to discharge the plan's own acceptance criteria — 'the prefix guard's union has at least nine members and its negative fixture turns it red' has nowhere to live without a spec, and 'a progress payload is routed to the progress store and NEVER reaches the coalescer' is a claim about client.ts that only client.spec.ts can make. Two spec files were therefore added beyond files_modified: packages/frontend/src/components/scan-lifecycle-presentation.spec.ts and cases appended to packages/frontend/src/api/client.spec.ts. No production file outside files_modified was touched. | open |  | 2026-08-31T22:03:04.886Z |  |
| 98 | 06 | deviation | packages/backend/src/telemetry.ts |  | NO COUNTER WAS ADDED for a scan-progress emit that throws. scan/producer.ts's emitProgress swallows a send failure with no counter and no log, which is a departure from this package's habit (ingest/consumer.ts increments counters.consumerErrors on the same failure). THE REASON, stated on the catch: the event is NOT the authoritative reader — getScanStatus reads the scans row directly and does not depend on the channel at all — so a lost payload costs at most one tick of a readout the operator can refresh, and the next page emits again. Adding counters.retro.emitErrors would have required telemetry.ts, which is not in 06-09's files_modified and is AST-enforced as the single owner of every counter in the package. OWNER: whichever plan next opens telemetry.ts, if the swallow is ever judged to have cost a diagnosis. | open |  | 2026-08-31T22:03:04.976Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "00",
    "file": "scripts/spike/recorder-session.sh",
    "line": null,
    "description": "Task 3 optional human-check not run: operator has not routed a real browser through 127.0.0.1:8998. Scripted sessions collect regardless.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T12:42:36.666Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "00",
    "file": "tests/spike-results.spec.ts",
    "line": 47,
    "description": "Gate asserts every threshold value is non-null, but spike-result.schema.json permits null for the inconclusive cross-day case. Plan 00-04 must reconcile.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-20T12:42:36.735Z",
    "resolved_at": "2026-08-20T12:45:07.474Z"
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "00",
    "file": ".planning/phases/00-runtime-reality-check/00-04-PLAN.md",
    "line": null,
    "description": "Task 3 credential-scan <automated> clause scans the filesystem, not git-tracked files; it fires on 106 gitignored raw host logs matching the GraphQL field name accessToken. Zero token-shaped strings anywhere; the git-tracked scan the plan's action text and T-00-45 both specify is clean and ships in tests/go-no-go.spec.ts.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T17:05:14.845Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "00",
    "file": ".planning/phases/00-runtime-reality-check/results/SPIKE-04.json",
    "line": null,
    "description": "SEND_CLIFF_SAVE_TRUE/SAVE_FALSE/FETCH are FLOORS (2000, cap reached) not cliffs — caido/caido#2211 did not reproduce in either wrapper shape. Phase 8 must re-test with real .map bodies and concurrent sends before treating the floor as headroom.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T17:05:24.949Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "deviation",
    "phase": "00",
    "file": ".planning/phases/00-runtime-reality-check/results/SPIKE-10.json",
    "line": null,
    "description": "CACHE_HIT_RATE_CROSS_DAY is null/inconclusive (1 day sampled, denominator 0) and collection has stopped; Phase 1 budgets against CACHE_HIT_RATE_ASSUMED=0.40. Re-install the recorder agent and re-measure after 2026-09-03.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-20T17:05:25.014Z",
    "resolved_at": "2026-08-20T18:06:03.807Z"
  },
  {
    "id": 6,
    "kind": "unrun-verify",
    "phase": "00",
    "file": ".planning/phases/00-runtime-reality-check/results/go-no-go.json",
    "line": null,
    "description": "CACHE_HIT_RATE_CROSS_DAY inconclusive, revisit_after 2026-09-03. Recorder RE-ARMED 2026-08-20 (com.defminer.spike.recorder, twice daily) so a second calendar day accrues. Phase 1 CORE-08 must read this threshold from config with the 0.40 pessimistic default, never hard-code it. Close by re-running aggregate.py + render-go-no-go.py once CACHE_SAMPLE_DAYS >= 2.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T18:05:34.808Z",
    "resolved_at": null
  },
  {
    "id": 7,
    "kind": "stub",
    "phase": "01",
    "file": "packages/backend/src/ingest/consumer.ts",
    "line": null,
    "description": "walk()'s visit callback is a no-op — no detector exists until Phase 3; the walk's yielding, deadline and offset accounting are real regardless",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T22:55:56.313Z",
    "resolved_at": null
  },
  {
    "id": 8,
    "kind": "stub",
    "phase": "01",
    "file": "packages/engine/src/decode.ts",
    "line": null,
    "description": "decode.ts has no consumer in the shipped bundle until a frontend exists (Phase 3/5); ENC-01's byte-vs-text inequality is proven by decode.spec.ts today",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T22:55:56.411Z",
    "resolved_at": null
  },
  {
    "id": 9,
    "kind": "deviation",
    "phase": "01",
    "file": "knip.json",
    "line": null,
    "description": "knip ignoreExportsUsedInFile:true hides a dead export referenced once in its own file — accepted to restore the exports/types gate to error; revisit in Phase 5",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T22:55:56.507Z",
    "resolved_at": null
  },
  {
    "id": 10,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/compat.ts",
    "line": null,
    "description": "COMPAT-01's operator-visible message is delivered as a host-log line plus a getStatus()/getCompat() RPC only, with no visible UI: the backend QuickJS surface has NO toast or notification API (exhaustive grep for showToast, Toast and notification across @caido/quickjs-types finds nothing), and sdk.api.send has no subscriber because Phase 1 ships no frontend. Decision P6-D2. Phase 5 owes the visible surface.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T00:02:00.191Z",
    "resolved_at": null
  },
  {
    "id": 11,
    "kind": "stub",
    "phase": "01",
    "file": "packages/backend/src/store/observations.ts",
    "line": null,
    "description": "Path-embedded token in a URL path SEGMENT is NOT redacted — named residual, pinned by observations.spec.ts's RESIDUAL case",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T13:56:33.328Z",
    "resolved_at": null
  },
  {
    "id": 12,
    "kind": "stub",
    "phase": "01",
    "file": "packages/backend/src/telemetry.ts",
    "line": null,
    "description": "Windows C:\\\\ paths are not redacted by redactPaths, and a path containing a space loses only the portion before the space — both named residuals",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T13:56:33.426Z",
    "resolved_at": null
  },
  {
    "id": 13,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "Accepted residual T-01-51: a value crossing a function boundary or more than one hop of indirection is beyond the walk; reported as outbound-unanalysable only where the walk can tell indirection is happening",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-21T14:18:53.110Z",
    "resolved_at": "2026-08-24T08:20:46.154Z"
  },
  {
    "id": 14,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/store/error-redaction.spec.ts",
    "line": null,
    "description": "Accepted residual (boundary 2): the STORE-07 walk builds no symbol table and is scope-blind — the caught binding is resolved by NAME, copy tracking is ONE hop, and a value crossing a function boundary is beyond it",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T14:33:35.305Z",
    "resolved_at": null
  },
  {
    "id": 15,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/compat.ts",
    "line": 317,
    "description": "T-01-37 accept: renders String(e).slice(0,160) into the per-surface error field, outside the STORE-07 gate's store/ scope. OWNER: Phase 2, ERR-04 (ROADMAP.md:396)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T14:33:35.405Z",
    "resolved_at": null
  },
  {
    "id": 16,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/hooks/passive.ts",
    "line": 171,
    "description": "T-01-37 accept: renders String(e).slice(0,160) into sdk.console.log on the hook error path, outside the STORE-07 gate's store/ scope. OWNER: Phase 2, ERR-03 (ROADMAP.md:396)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T14:33:35.502Z",
    "resolved_at": null
  },
  {
    "id": 17,
    "kind": "deviation",
    "phase": "01",
    "file": ".planning/REQUIREMENTS.md",
    "line": null,
    "description": "T-01-76 accept: STORE-03 and STORE-07 are declared by redaction plans for work neither requirement's text mentions. Deferred WITH AN OWNER by plan 01-10 task 3 — the operator, at the next requirements pass",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T14:33:35.597Z",
    "resolved_at": null
  },
  {
    "id": 18,
    "kind": "deviation",
    "phase": "01",
    "file": "scripts/phase1/tracer-e2e.sh",
    "line": null,
    "description": "URL userinfo redaction cannot be proven at the live tier: curl lifts user:pass@ into an Authorization: Basic header, so userinfo never reaches observations.url. Measured in run 20260821T150022Z-16902 (userinfo-measurement.txt) and enforced instead by the observations.spec.ts real-SQLite round trip. Live-tier coverage for this one grammar is a documented gap, not a passing assertion.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T15:10:49.050Z",
    "resolved_at": null
  },
  {
    "id": 19,
    "kind": "deviation",
    "phase": "1",
    "file": "packages/backend/src/store/observations.ts",
    "line": null,
    "description": "RESIDUAL, PINNED: URL_MAX truncation lands inside a <redacted> marker (tail 'p133=<re'); repair interacts with the new padding branch and would break file-wide idempotence — owner: a later phase, job: truncate on a & boundary",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-22T08:54:33.504Z",
    "resolved_at": "2026-08-24T12:48:34.497Z"
  },
  {
    "id": 20,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "WR-19 narrowed from every-non-reducing-key to ASSEMBLED-KEY; a merely dynamic key (sdk[k]) is a disclosed residual, not reported",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-22T09:33:22.689Z",
    "resolved_at": "2026-08-24T08:21:10.428Z"
  },
  {
    "id": 21,
    "kind": "deviation",
    "phase": "01",
    "file": "scripts/phase1/tracer-e2e.sh",
    "line": null,
    "description": "URL userinfo cannot be exercised through the live curl tier — lifted into an Authorization: Basic header before the request line exists. MEASURED per run (userinfo-measurement.txt), enforced at the unit tier by observations.spec.ts HEAD_CASES. A live userinfo proof needs a client that does not do this lift.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-22T09:56:52.151Z",
    "resolved_at": null
  },
  {
    "id": 22,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "THE RECEIVER-KEY RESIDUAL AS OF WAVE 18 (plan 01-18, CR-08) — SUPERSEDED IN WAVE 19 BY PLAN 01-19, which narrows it further and rewrites this bound in the gate header, REQUIREMENTS.md, STATE.md and this ledger. Supersedes entries 13 and 20, whose descriptions stated a bound the code no longer has. NOW REPORTED in receiver-key position: a literal key; a key bound ONE HOP to a literal (constStrings); a key assembled inline (isAssembledKey); a key bound ONE HOP to an assembly in EVERY spelling — +, a template, .join(\"\"), an opaque call — through either a declaration or an assignment (assembledNames); a CONDITIONAL key resolved on both branches; a COMMA SEQUENCE resolved to its rightmost operand. THE RESIDUAL THAT REMAINS, in the same words as that gate's boundary 2, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 amendment: more than ONE HOP of indirection, a value crossing a FUNCTION BOUNDARY, and a key the walk NEVER SAW BOUND — a parameter, a loop binding, a name bound out of document order or in another file. That last exemption is preserved BY MEASUREMENT, re-run after the widening: 23 files over both source roots, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. CORE-11 stays unchecked: const e = eval; e(s) (WR-23) and const g = globalThis (IN-20) are still silent and plan 01-19 owns both plus the checkbox flip.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T08:21:34.840Z",
    "resolved_at": "2026-08-24T08:49:12.490Z"
  },
  {
    "id": 23,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "THE FINAL RESIDUAL AFTER WAVE 19 (plan 01-19, closing WR-23, WR-26 and IN-20). Supersedes entry 22, whose description scoped itself to the wave-18 receiver-key residual and named this plan as its superseder; a one-hop eval/Function alias, the outbound constructors and the globalThis hop all stop being residual here. NEWLY REPORTED since wave 18: a one-hop alias of eval or Function in every spelling fetchAliases resolves (declaration, global-member, destructure, assignment), the same for XMLHttpRequest/WebSocket/EventSource through one shared globalNameOf lookup used by both the call rule and the new rule, and a one-hop alias of globalThis itself, which closes fetch, the unreadable computed member, dynamic code, the outbound constructors and the beacon receiver together. THE RESIDUAL THAT REMAINS, in the same words as that gate's THE FINAL RESIDUAL, AFTER PLAN 01-19 block, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 amendment: CORE-11's clause 'no sdk.requests.send IN ANY SPELLING' IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in DOCUMENT ORDER: const a = globalThis; const b = a; const g = b; g.fetch(u) reports and so does the sdk.requests twin, while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in NUMERIC_MEMBERS is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary + indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19: 23 files over both SOURCE_ROOTS, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. NOTE THAT THIS ENTRY AMENDS THE BOUND IN BOTH DIRECTIONS: every residual list before this one bounded the walk at 'more than ONE HOP of indirection', which is exactly right for a receiver KEY and UNDERSTATED the walk for ALIASES, measured while writing a fixture for it. CORE-11 is now [x] in REQUIREMENTS.md, flipped against an eight-row discharge table in 01-19-SUMMARY.md and not before it.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T08:49:36.488Z",
    "resolved_at": "2026-08-24T11:35:19.685Z"
  },
  {
    "id": 24,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/store/error-redaction.spec.ts",
    "line": null,
    "description": "Residual items 1-3 (unnamed methods, bare-identifier callee, operator outside the four) are disclosed and deliberately UNPINNED — no assertion goes red if one is closed",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T09:33:40.130Z",
    "resolved_at": "2026-08-24T12:59:19.549Z"
  },
  {
    "id": 25,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "THE FINAL RESIDUAL AFTER WAVE 23 (plan 01-23, closing CR-09). SUPERSEDES ENTRY 23, WHOSE DESCRIPTION WAS FALSIFIED BY CR-09 — it stated that an alias chain read BEFORE its root is bound is silent, a READ-POSITION bound the code does not have. auditSource runs collect(sf) to COMPLETION at :1521 and only then runs visit(sf) at :1726, so every alias set is fully populated before the first violation is considered and the position of a USE bounds nothing. Seven shapes entry 23 called silent were executed and all seven report: the bare and function-wrapped g.fetch(u) above const g = globalThis (outbound-fetch), sdk[r].send(req) above const r = \"requests\" (outbound-send), sdk[k].send(req) above const k = \"req\"+\"uests\" (outbound-unanalysable), s.send(req) above const s = sdk.requests (outbound-send), n.sendBeacon(u,d) above const n = navigator (outbound-beacon) and e(\"x\") above const e = eval (outbound-dynamic-code). The fixture entry 23 rested on was green through INVERTED BINDINGS, not through its read position — proven both ways by the verifier — which is CR-08's title-versus-mechanism substitution for the third time in this file; plan 01-23 split it into a binding-order half and a read-position half plus a three-case discrimination. THE RESIDUAL THAT REMAINS, in the same words as that gate's THE FINAL RESIDUAL, AFTER PLAN 01-23 block, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 third pointer amendment: CORE-11's clause no sdk.requests.send IN ANY SPELLING IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, provided each link's DECLARATION appears after the declaration of the name it is grown from. The MECHANISM is why, and it is stated here rather than only its consequence, because a consequence on its own is what the last four rounds each paraphrased wrongly: auditSource runs collect(sf) to COMPLETION and only then runs visit(sf), and every alias set is grown by consulting the LIVE set during that one collect pass. So const a = globalThis; const b = a; const g = b; g.fetch(u) reports, the sdk.requests twin reports, and a four-hop chain reports with the USE written ABOVE all four declarations — the use site's POSITION IS IRRELEVANT. What is silent is an INVERTED BINDING: const b = a; const a = fetch; b(u) reports nothing, because a is not yet in the set when b's declaration is read, and it stays silent wherever the read is placed. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in NUMERIC_MEMBERS is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary + indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19 and again in plan 01-23: 23 files over both SOURCE_ROOTS, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. WHAT COMES NEXT, RECORDED SO THIS ENTRY IS NOT READ AS FINAL DESPITE ITS NAME: waves 24 through 26 narrow this residual further — CR-10 (a stale first literal shadowing a later rebinding), WR-27 (a conditional receiver in call position) and the store/pins/tracer surfaces — and wave 27 REPLACES this authored text with one DERIVED from the code, which is the only thing that stops the class of defect that produced CR-05 through CR-09. This entry closes the INSTANCE and not the class. CORE-11's box is [ ] in REQUIREMENTS.md, reverted at faca607 because the [x] had been flipped against the sentence CR-09 falsified; wave 28 owns the flip and only against wave 27's derived residual. Nothing leaked: the must-NOT holds, the gate runs green over the real tree (23 files, ZERO violations) inside a 1117-test suite, and check:bundle reports one specifier, crypto.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T11:35:44.698Z",
    "resolved_at": "2026-08-24T11:36:19.952Z"
  },
  {
    "id": 26,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "THE FINAL RESIDUAL AFTER WAVE 23 (plan 01-23, closing CR-09). SUPERSEDES ENTRY 23, WHOSE DESCRIPTION WAS FALSIFIED BY CR-09, AND SUPERSEDES ENTRY 25, WHICH WAS THIS ENTRY'S OWN FIRST DRAFT AND QUOTED THE SUPERSEDED WORDING INSTEAD OF NAMING IT — closed through the tool rather than hand-edited, and recorded here rather than smoothed over. What entry 23 asserted is named, not restated: THE READ-POSITION BOUND, whose exact words are preserved on entries 23 and 25, both status=fixed, and in 01-VERIFICATION.md's CR-09 entry. It is false. auditSource runs collect(sf) to COMPLETION at :1521 and only then runs visit(sf) at :1726, so every alias set, every string map and every poisoned name is fully populated before the first violation is considered, and the position of a USE bounds nothing at all. Seven shapes entry 23 called silent were executed and all seven report: the bare and function-wrapped g.fetch(u) written above const g = globalThis (outbound-fetch), sdk[r].send(req) above const r = \"requests\" (outbound-send), sdk[k].send(req) above const k = \"req\"+\"uests\" (outbound-unanalysable), s.send(req) above const s = sdk.requests (outbound-send), n.sendBeacon(u,d) above const n = navigator (outbound-beacon), and e(\"x\") above const e = eval (outbound-dynamic-code). The fixture entry 23 rested on was green through INVERTED BINDINGS rather than through the variable its title named — proven both ways by the verifier — which is CR-08's title-versus-mechanism substitution for the third time in this file; plan 01-23 split it into a binding-order half and a read-position half and added a three-case discrimination that separates the two. THE RESIDUAL THAT REMAINS, in the same words as that gate's THE FINAL RESIDUAL, AFTER PLAN 01-23 block, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 third pointer amendment: CORE-11's clause no sdk.requests.send IN ANY SPELLING IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, provided each link's DECLARATION appears after the declaration of the name it is grown from. The MECHANISM is why, and it is stated here rather than only its consequence, because a consequence on its own is what the last four rounds each paraphrased wrongly: auditSource runs collect(sf) to COMPLETION and only then runs visit(sf), and every alias set is grown by consulting the LIVE set during that one collect pass. So const a = globalThis; const b = a; const g = b; g.fetch(u) reports, the sdk.requests twin reports, and a four-hop chain reports with the USE written ABOVE all four declarations — the use site's POSITION IS IRRELEVANT. What is silent is an INVERTED BINDING: const b = a; const a = fetch; b(u) reports nothing, because a is not yet in the set when b's declaration is read, and it stays silent wherever the read is placed. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in NUMERIC_MEMBERS is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary + indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19 and again in plan 01-23: 23 files over both SOURCE_ROOTS, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. WHAT COMES NEXT, RECORDED SO THIS ENTRY IS NOT READ AS FINAL DESPITE ITS NAME: waves 24 through 26 narrow this residual further — CR-10 (a stale first literal shadowing a later rebinding), WR-27 (a conditional receiver in call position) and the store/pins/tracer surfaces — and wave 27 REPLACES this authored text with one DERIVED from the code, which is the only thing that stops the class of defect that produced five consecutive false bounds. This entry closes the INSTANCE and not the class. CORE-11's box is [ ] in REQUIREMENTS.md, reverted at faca607 because the [x] had been flipped against the sentence CR-09 falsified; wave 28 owns the flip and only against wave 27's derived residual. Nothing leaked: the must-NOT holds, the gate runs green over the real tree (23 files, ZERO violations) inside a 1117-test suite, and check:bundle reports one specifier, crypto.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T11:36:40.870Z",
    "resolved_at": "2026-08-24T12:04:10.683Z"
  },
  {
    "id": 27,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "THE FINAL RESIDUAL AFTER WAVE 24 (plan 01-24, closing CR-10). SUPERSEDES ENTRY 26, whose description carried the WAVE-23 bound. What entry 26 asserted about receiver keys is NAMED rather than restated: THE EVERY-SPELLING CLAIM, and beside it in the gate header THE SINGLE-DIRECTION CLAIM and THE COVERED-BY-CONSTRUCTION CLAIM. Their exact superseded words are preserved on entry 26 (status=fixed), in 01-REVIEW.md's CR-10 entry and in the three correction paragraphs in the gate file. All three were false in the same place: constStrings was a Map<string,string> written ONLY at the declaration branch and read FIRST by keyReceiver, so a harmless first literal shadowed every later rebinding of the same name and the branches beneath it were unreachable for that name. Executed: let k = \"harmless\"; k = \"requests\"; sdk[k].send(req) was SILENT, and so were the var spelling, the global-key spelling, the assignment-assembly spelling and let k = \"req\"; k += \"uests\". The plan's own control for those misses — let k; k = \"requests\" — was ALSO measured silent, one defect deeper than CR-10 stated: the assignment branch never wrote the string map at all. All six report now. CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. RE-DERIVED FOR WAVE 24 BY READING THE BRANCHES: `keyReceiver`'s four steps, the two `constStrings` write sites, the three `assembledNames` write sites and `literalOf` itself — not by narrowing the previous paragraph, which is the method plan 01-21 recorded as having enumerated two classes while missing a third sitting in the same function. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, provided each link's DECLARATION appears after the declaration of the name it is grown from. UNCHANGED BY THIS WAVE. The mechanism is that `auditSource` runs `collect(sf)` to COMPLETION before `visit(sf)` begins, while every alias set is grown by consulting the LIVE set during that one collect pass — so a four-hop chain reports with the USE written ABOVE all four declarations and the use site's POSITION IS IRRELEVANT. What is silent is an INVERTED BINDING: `const b = a; const a = fetch; b(u)` reports nothing, wherever the read sits. A RECEIVER KEY RESOLVES ONE HOP, AND WHAT ONE HOP MEANS WIDENED IN WAVE 24. It resolves: a literal; a literal bound at a DECLARATION OR AN ASSIGNMENT, in the `const`, `let` and `var` spellings; a name REBOUND, because ANY binding of a name that names an outbound receiver now makes the key one, so `let k = \"harmless\"; k = \"requests\"; sdk[k].send(req)` reports where it was silent; an assembly inline; an assembly bound or assigned; AN ASSEMBLY ACCUMULATED WITH `+=`; a conditional; and a comma sequence. Where a name carries BOTH a literal binding and a watched assembly, THE ASSEMBLY WINS and the site reports `outbound-unanalysable` rather than naming a surface off a string the file has since rebuilt. `literalOf`, which resolves MEMBER NAMES and MODULE SPECIFIERS through that same map, IS SINGLE-VALUED: a name carrying more than one distinct binding answers \"could not read\", and \"could not read\" REPORTS at every one of its call sites. Measured in all four positions where a name can now resolve differently, THE WAVE-24 WIDENING CREATED NO NEW SILENCE — a named surface becomes `outbound-unanalysable` where the walk read two strings, and nothing went quiet. THE MIRROR of the widening, `let k = \"requests\"; k = \"harmless\"`, REPORTS: any-binding-wins OVER-approximates, which is the direction every other set in this pass already errs in. The rejected alternative — a POISONED map in the shape of `poisonedNumericNames` — was MEASURED and would have left CR-10's own shapes silent and created a new silence at the mirror. WHAT REMAINS SILENT, READ OFF THE BRANCHES: TWO HOPS OF KEY — `const a = \"requests\"; const b = a; sdk[b]` — because `constStrings` and `assembledNames` read the INITIALIZER'S SHAPE and never the live set, so a key cannot be grown from a name already in a set; a value crossing a FUNCTION BOUNDARY; a PARAMETER; a LOOP BINDING; and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was measured to change nothing except to re-poison ordinary `+` indexing. STILL OPEN AFTER THIS WAVE, EACH NAMED WITH THE WAVE THAT OWNS IT, because a residual that narrows without saying what is still open is the omission this round exists to stop: the CONDITIONAL RECEIVER IN CALL POSITION with its `??` and `||` twins — WAVE 25 (WR-27); the NESTED CONDITIONAL KEY — WAVE 25; the DESTRUCTURED KEY BINDING, `const { k } = o; sdk[k].send(req)` — WAVE 26 (IN-26). Wave 26 also owns `packages/backend/src/store/*`, `tests/pins.spec.ts` and `scripts/phase1/tracer-e2e.sh`. Every exemption here is preserved BY MEASUREMENT, re-run after each widening and again in wave 24: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name. The `+=` branch DOES fire on shipped code — it marks `examined` and `deleted` in `store/retention.ts`, `out` in `telemetry.ts` and `start` in `engine/src/chunker.ts` as assembled — and all four files still report ZERO, because none of those names is ever used as a receiver key. That is measured, not argued. WAVE 27 REPLACES THIS AUTHORED TEXT WITH ONE DERIVED FROM THE CODE. This wave closes CR-10's INSTANCE and does not close the class that produced it — an authored bound nobody re-derived — which is now SIX consecutive rounds. `REQUIREMENTS.md` and `STATE.md` are deliberately NOT amended in this wave: both carry an authored residual, wave 27 derives the replacement and wave 28 reconciles both ledgers to it in one move, and a fourth hand-authored copy would be another place the next drift can start. CORE-11's box stays `[ ]`; wave 28 owns the flip and only against the derived text. NOTHING LEAKED: CR-10 is a PROSPECTIVE BLINDNESS in a test-only gate, no outbound call exists in any non-spec source under either root, the gate runs green over the real tree inside a 1132-test suite, and `pnpm check:bundle` reports one specifier, `crypto`. ",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T12:04:22.861Z",
    "resolved_at": "2026-08-24T12:30:02.396Z"
  },
  {
    "id": 28,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "THE FINAL RESIDUAL AFTER WAVE 25 (plan 01-25, closing WR-27). SUPERSEDES ENTRY 27, which carried the WAVE-24 bound. NOTHING IN ENTRY 27 IS FALSIFIED BY THIS ONE AND THAT IS THE POINT: WR-27's shape — an operator written directly as the CALLEE'S RECEIVER — was named by NO clause in entry 27, entry 26, entry 25 or entry 23, so this entry WIDENS a self-declared-open enumeration rather than correcting a false one. Entry 27's own \"STILL OPEN AFTER THIS WAVE\" clause named the conditional receiver in call position and the nested conditional key as wave 25's, and both are closed here; what it did not name, and what no list before it named either, is that the same gap covered the `??`, `||` and `&&` spellings and a precedence `initializerReceiver` had to itself. Executed before wave 25: `(b ? sdk.requests : sdk.net).send(req)`, `(sdk.requests ?? sdk.net).send(req)`, `(sdk.requests || sdk.net).send(req)`, `(ok && sdk.requests).send(req)` and `sdk[b ? (c ? \"requests\" : \"x\") : \"y\"].send(req)` all reported `[]`, while the two controls added in the SAME round — the conditional KEY and the conditional INITIALIZER — both reported `outbound-send`. All five report now. THE CANONICAL RESIDUAL FOLLOWS, AUTHORED ONCE AND RENDERED PROGRAMMATICALLY INTO BOTH THIS ENTRY AND THE GATE HEADER'S `THE FINAL RESIDUAL, AFTER PLAN 01-25` BLOCK, so identity is a machine check rather than a promise:\nCORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. RE-DERIVED FOR WAVE 25 BY READING THE BRANCHES: `receiverKind`'s four arms, `keyReceiver`'s steps including the operator step above step 0, `initializerReceiver` (which is now a NAME for `receiverKind`), `operatorReceiver` and the `RECEIVER_OPERATORS` set — not by narrowing the previous paragraph, which is the method plan 01-21 recorded as having enumerated two classes while missing a third sitting in the same function.\n\nTHE OPERATOR CLASS IS CLOSED IN ALL FOUR POSITIONS AS OF WAVE 25, THROUGH ONE DESCENT AND NOT THREE COPIES. `? :`, `??`, `||` and `&&` are read in CALL-RECEIVER position (`(b ? sdk.requests : sdk.net).send(req)`), in KEY position (`sdk[b ? \"requests\" : \"net\"]`), in INITIALIZER position (`const r = sdk.requests ?? sdk.net; r.send(req)`) and in NESTED KEY position (`sdk[b ? (c ? \"requests\" : \"x\") : \"y\"]`), by `operatorReceiver` — ONE function, reached from `receiverKind` and from `keyReceiver`, each passing ITSELF as the leaf resolver so nesting resolves at any depth. THE THREE-STATE ANSWER, in the order the element-access arm already used and copied from there rather than reinvented: any operand naming a receiver makes the expression THAT RECEIVER; else any operand the walk cannot read makes it UNREADABLE; else it is NOT A RECEIVER.\n\nAND THE SHAPE THIS WAVE CLOSED WAS NAMED BY NO PRIOR RESIDUAL LIST AT ALL — NOT UNDERSTATED BY THEM, OMITTED FROM THEM. Before wave 25 no clause here named a call-position operator: not the two-hop clause, not the function-boundary clause, not the parameter or loop-binding clauses, not the another-file clause. A reader enumerating this gate's blind spots would have finished the list and stopped, and been wrong. THAT OMISSION IS THE FINDING, and it is recorded here where the list is rather than only in a summary, because an enumeration that grows silently is one nobody can audit for completeness in either direction. WHAT THIS IS NOT, SAID SO THE ROUND DOES NOT INFLATE ITSELF: it is not the correction of a false sentence. This list declares itself open and WR-27 WIDENED it, exactly as round 4's wave 21 framed WR-24; CR-09 by contrast was a residual that ASSERTED something false, which is the heavier finding, and this wave does not borrow its weight. Equally, an omitted shape is not a harmless one — completeness in both directions is precisely what a residual list is trusted for.\n\n`&&` IS IN THE SET AND WAS SETTLED BY MEASUREMENT, NOT BY SYMMETRY WITH THE OTHER THREE, because the symmetry argument genuinely does not carry: `a && b` yields `a` when `a` is FALSY, so its left operand is usually a guard rather than a value. BOTH READINGS WERE IMPLEMENTED AND RUN. THE REAL TREE DID NOT DISCRIMINATE — 23 files, ZERO violations, under `&&` in and under `&&` out alike — so nothing about shipped code chose this and no claim is made that it did. THE SHAPES DISCRIMINATED: excluding `&&` left `(ok && sdk.requests).send(req)`, the ordinary way to write a guarded outbound call and one with `sdk.requests` written out in full, SILENT — which is WR-27's own finding reproduced one operator over, inside the wave closing it. THE COST IS DISCLOSED AND PINNED BY ITS OWN ASSERTION: `(sdk.requests && ok).send(req)`, where the receiver is the guard and the value is something else, REPORTS. That OVER-approximates, in the direction every other set in this file errs. `+` is deliberately absent from `RECEIVER_OPERATORS` and must stay absent — every operator in that set yields one of its operands UNCHANGED, which is what makes either-side semantics sound, while `\"req\" + \"uests\"` is the ASSEMBLY `isAssembledKey` owns. The sibling gate one directory over, `store/error-redaction.spec.ts`'s `derivesFrom`, already descends this same set of four with either-side semantics (WR-24, plan 01-21) and cites `initializerReceiver` in THIS file as its reason; excluding `&&` here would have manufactured the disagreement that docblock was written to prevent. That is corroboration, not the reason.\n\nTHE DESCENT EXISTED THREE TIMES AND THEREFORE EXISTED TWICE, WHICH IS WHY THE THIRD FACE WENT UNTAUGHT WHILE THE OTHER TWO WERE TAUGHT IN THE SAME ROUND. `initializerReceiver` unwrapped a conditional, `receiverKind`'s element-access arm unwrapped one, and `receiverKind` ITSELF did not — so a conditional written directly in call position fell through every branch to `return undefined`, the state every caller reads as NOT A RECEIVER, for a site with a literal `sdk.requests` in it. Wave 25 collapsed the copies: `initializerReceiver` is now a name for `receiverKind`, the element-access arm calls `keyReceiver`, and both reach `operatorReceiver`. THE COLLAPSE ALSO CORRECTED A PRECEDENCE NO LIST NAMED EITHER, found by reading the three copies side by side rather than predicted: `initializerReceiver` was `receiverKind(whenTrue) ?? receiverKind(whenFalse)`, and `??` does not skip `UNREADABLE_RECEIVER` because a symbol is neither null nor undefined — so an UNREADABLE LEFT branch shadowed a NAMED RIGHT branch in initializer position and in no other position. `const r = b ? sdk[k1 + k2] : sdk.net` reported `outbound-unanalysable` while `const r = b ? sdk.net : sdk[k1 + k2]` reported `outbound-net`: two spellings of one shape answered differently by operand ORDER. Both now report the named receiver; both REPORTED before and after, so the correction changed WHICH rule is named and nothing went quiet.\n\n`keyReceiver`'s DOCBLOCK CLAIM IS NOW TRUE OF THE CODE rather than true of two callers. It has said since CR-08 that it is the single definition of what a readable key is, called from the direct key and both conditional branches \"so they cannot disagree about what the walk can read\" — a claim made by a function that did not itself handle a conditional, so a conditional INSIDE a branch was exactly where they disagreed and `sdk[b ? (c ? \"requests\" : \"x\") : \"y\"]` was silent. `keyReceiver` now recurses through `operatorReceiver` passing itself.\n\nWHAT REMAINS SILENT, READ OFF THE BRANCHES: TWO HOPS OF KEY — `const a = \"requests\"; const b = a; sdk[b]` — because `constStrings` and `assembledNames` read the INITIALIZER'S SHAPE and never the live set, so a key cannot be grown from a name already in a set; a value crossing a FUNCTION BOUNDARY; a PARAMETER; a LOOP BINDING; and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was measured to change nothing except to re-poison ordinary `+` indexing.\n\nAND ONE SHAPE THIS WAVE OPENED BY MEASURING WHERE THE DESCENT STOPS INSTEAD OF ASSUMING IT IS UNIVERSAL — disclosed on the day it was found rather than left for a later round's finding. `operatorReceiver` is reached from `receiverKind` and `keyReceiver` AND FROM NOWHERE ELSE. `isGlobalReceiver`, `isFetchExpression` and `isNavigatorReceiver` resolve their own spellings through the alias sets and do not consult it, so AN OPERATOR WRAPPING A GLOBAL RECEIVER IS STILL SILENT in every spelling: `(ok && globalThis).fetch(url)`, `(g ?? globalThis)[\"fetch\"](url)`, `(b ? globalThis : x).fetch(url)`, `(b ? navigator : x).sendBeacon(u, d)`, `(b ? fetch : x)(url)` and `(b ? eval : x)(src)` all report `[]`, MEASURED IDENTICAL BEFORE AND AFTER THIS WAVE against commit 278a0d2~1. This wave neither closed them nor broke them and claims no credit for them; the contrast that shows the boundary is the RESOLVER and not the operator is that `(b ? sdk.requests : x).send(req)` DOES report, because that path goes through `receiverKind`. Pinned by a fixture titled as a MEASURED SILENCE.\n\nSTILL OPEN AFTER THIS WAVE, EACH NAMED WITH THE WAVE THAT OWNS IT OR WITH THE FACT THAT NOTHING DOES, because a residual that narrows in one place while quietly widening in another is the omission this round exists to stop: the DESTRUCTURED KEY BINDING, `const { k } = o; sdk[k].send(req)` — WAVE 26 (IN-26); the OPERATOR AROUND A GLOBAL RECEIVER, above — OPEN AND UNOWNED, no plan in this phase claims it, and wave 27's derivation is what will carry it forward rather than rediscover it. Wave 26 also owns `packages/backend/src/store/*`, `tests/pins.spec.ts` and `scripts/phase1/tracer-e2e.sh`.\n\nEvery exemption here is preserved BY MEASUREMENT, re-run after each widening and again in wave 25: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name. AN OPERATOR DESCENT IN CALL-RECEIVER POSITION IS THE WIDENING MOST LIKELY TO FIRE ON ORDINARY SHIPPED CODE — picking one of two ordinary collaborators with `? :`, `??`, `||` or `&&` is common, and a gate that flags it gets deleted rather than fixed — so every widening in this wave shipped with its must-stay-quiet twin IN THE SAME COMMIT: `(useCache ? cache : client)`, `(cache ?? client)`, `(cache || client)`, `(ready && cache)` and an ordinary object defining a method named `send` all report `[]`.\n\nWAVE 27 REPLACES THIS AUTHORED TEXT WITH ONE DERIVED FROM THE CODE. This wave closes WR-27's INSTANCE and does not close the class that produced it — an authored bound nobody re-derived — which is now SEVEN consecutive rounds. `REQUIREMENTS.md` and `STATE.md` are deliberately NOT amended in this wave, for the reason wave 24 recorded: both carry an authored residual, wave 27 derives the replacement and wave 28 reconciles both requirement-tier ledgers to it in ONE move, and another hand-authored copy would be another place the next drift can start. CORE-11's box stays `[ ]`; wave 28 owns the flip and only against the derived text. NOTHING LEAKED: WR-27 is a PROSPECTIVE BLINDNESS in a test-only gate, no outbound call exists in any non-spec source under either root, the gate runs green over the real tree — 23 files, ZERO violations — inside a 1143-test suite, and `pnpm check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T12:30:23.403Z",
    "resolved_at": "2026-08-24T13:01:13.116Z"
  },
  {
    "id": 29,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/store/observations.ts",
    "line": null,
    "description": "RESIDUAL, PINNED BY SWEEPS (supersedes entry 19, whose stated job — truncate on an & boundary — plan 01-20 did). What is left is the NO-SEPARATOR branch, condition q === -1 || amp <= q: no & INSIDE THE CUT. The class is about WHERE THE CUT LANDS (before the query's first &), NOT about how many parameters the query has — a three-parameter query with a long first parameter is inside it. Two shapes: a cut inside a ;-parameter's <redacted> MARKER IS a fixed point; a cut inside a parameter NAME is NOT (second pass sees a segment with no =, P10-D1 redacts it whole, value can SHRINK one byte). MEASURED 2026-08-24 by the sweeps in observations.spec.ts: head-side n=1975..2045, 71 offsets, 11 unstable (2019-2029); three-parameter query, same range, 71 offsets, 17 unstable (2015-2031). ZERO secret survivals at either pass at every one of those 142 offsets. NOT A LEAK: recordObservation applies normaliseObservedUrl ONCE per row, so no production path takes the second pass. NOT CLOSED for the reason observations.ts records — the repair drops back to the last / or to the ?, truncating an oversized path to its authority, which reopens P8-D1/P10-D1.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-24T12:48:34.593Z",
    "resolved_at": null
  },
  {
    "id": 30,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/store/error-redaction.spec.ts",
    "line": null,
    "description": "SUPERSEDES ENTRY 24, whose description (residual items 1-3 disclosed and deliberately UNPINNED, nothing goes red if one is closed) is false about two of the three after IN-25 was re-executed on 2026-08-24. RE-MEASURED through the gate's own auditSource, not cited: ITEM 1 IS WITHDRAWN — e.message.padEnd(10), .repeat(2), .replace(a,b) and a two-method chain ALL report unredacted-object-value, because derivesFrom follows a call whose callee is a MEMBER, so an unnamed method is transparent rather than opaque. ITEM 3 IS NARROWED IN TWO PLACES, one more than the review named: a value routed through an OBJECT literal REPORTS (the object-literal value is itself a guarded POSITION) and an accumulator built with a plain + REPORTS unredacted-concat. WHAT IS STILL OPEN, each measured []: item 2's bare-identifier callee (fmt(e)); and item 3's comma expression, await, and ARRAY literal (both the a[0] and the a.join('') spellings). ITEMS 4 AND 5 (IN-22's two limits) are unchanged and stay pinned as measured silences. PINNING NOW: item 1 and item 3's two firing halves are pinned in the FIRING direction by 'CORRECTED BY EXECUTION (IN-25)'; the four surviving open halves are pinned as measured silences by 'RESIDUAL, STILL OPEN AFTER IN-25'. So a closure OR a regression on any of them now moves a test, which entry 24 said would not happen. METHOD FINDING, the reusable part: the enumeration was read off the BRANCHES of derivesFrom — the right method, and why items 2, 4 and 5 are right — and the missing step was crossing it with the POSITION and OPERATOR rules, which catch some of the branches' blind spots anyway. WR-31 also closed here: the paragraph's closing sentence now names its antecedent (the RENDER-FORM list, not the five-item residual the same paragraph calls three-fifths unpinned two lines above). NOT A LEAK: every shape above is a disclosure question in a gate that runs green.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-24T12:59:35.193Z",
    "resolved_at": null
  },
  {
    "id": 31,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "THE NARROWING AFTER WAVE 26 (plan 01-26, closing IN-26). This block AMENDS the wave-25 residual above rather than replacing it: everything in it still holds except the one clause named here, and wave 27 still owns the derivation that replaces the whole authored text. WHAT CHANGED, and it is one clause. Wave 25's STILL OPEN paragraph named \"the DESTRUCTURED KEY BINDING, `const { k } = o; sdk[k].send(req)` — WAVE 26 (IN-26)\" as a single open shape. Measured, it is THREE shapes with three different answers, and only one of them was ever IN-26. CLOSED HERE, both spellings, by giving the assembled-name collector the binding-pattern reading its RECEIVER sibling already had: `const { k } = { k: \"req\" + \"uests\" }; sdk[k].send(req)` and `const [k] = [\"req\" + \"uests\"]; sdk[k].send(req)` both reported `[]` before this wave and both report `outbound-unanalysable` after it, as do the renamed-key spelling `const { p: k } = { p: \"req\" + \"uests\" }` and a non-zero array slot. That is what the header two hundred lines up already claimed when it said an assembly is read \"through EITHER a declaration or an assignment\" — both of these are declarations, and the claim was true of one spelling out of three. STILL OPEN, AND NOT IN-26: `const { k } = o; sdk[k].send(req)` — the exact string wave 25's paragraph used — is a value crossing a boundary the walk does not follow, which is residual (a)'s function/value half, unchanged and NOT closed by this wave. Wave 25's paragraph named it with IN-26's identifier and IN-26 is not about it; that conflation is corrected here rather than left for the derivation to inherit. NEWLY OPEN AND NAMED BY MEASUREMENT RATHER THAN BY REVIEW, residual (b2): a destructured PLAIN LITERAL — `const { k } = { k: \"requests\" }; sdk[k].send(req)` — stays `[]`, because `constStrings` reads only the identifier spelling of the same declaration that `assembledNames` now reads three ways. It was found by measuring the result of closing IN-26, not predicted by IN-26 or by this plan, and it is DISCLOSED rather than folded in: widening `constStrings` through binding patterns is a separate decision that needs its own real-tree measurement, and a wave that closes a shape while quietly opening its sibling is exactly the omission the wave-25 paragraph above exists to stop. Pinned as a MEASURED SILENCE so the day it is closed a test moves. THE OPERATOR AROUND A GLOBAL RECEIVER — `(ok && globalThis).fetch(url)` and its five twins — is UNCHANGED, still OPEN and still UNOWNED; this wave neither closed it nor broke it and claims nothing about it. THE ALIAS BOUND IS NOW STATED IN ONE PLACE AND POINTED AT FROM THREE (WR-30). Three docblocks — on `isGlobalReceiverIn`, on `globalAliases` and residual (c) itself — each asserted a ONE-HOP bound and each named a source string as silent. All three were EXECUTED before being edited and all three REPORT: `const a = globalThis; const g = a; g.fetch(u)` gives `outbound-fetch`, `const a = eval; const b = a; b(s)` gives `outbound-dynamic-code`, `const a = navigator; const n = a; n.sendBeacon(u, d)` gives `outbound-beacon`. The first of those was contradicted by a PASSING test 1,800 lines below it in the same file asserting the identical string reports; two passing assertions that cannot both be true is the sharpest form of the defect this phase keeps finding. Each is now a POINTER to residual (a) plus the local fact that is genuinely about that symbol, because a bound restated in four places is a bound that drifts in three. THE FOURTH IDENTICAL SENTENCE SURVIVES AND IS CORRECT: on `assembledNames`, keys read the INITIALIZER'S SHAPE and never the live set, so they cannot chain — executed, `const a = \"req\" + \"uests\"; const b = a; sdk[b].send(req)` is `[]`. That it is true there is precisely why the other three read as true to a skimming reader, and it is marked as the one place the one-hop bound is stated so the next author does not delete the correct one with the stale ones. THE TRANSITIVITY ASSERTION NOW COVERS ALL FIVE ALIAS SETS at three hops, where it covered three at two. RECORDED DISCREPANCY, because the plan's prediction did not survive measurement: `navigatorAliases` and `globalAliases` were NOT uncovered — two sibling cases already asserted both chaining at two hops — so this is a consolidation into the one place residual (a) sends a reader, plus a depth widening, and not the closure of a hole. THE DIRECTION OF ALL OF WR-30 IS SAFE: the gate reaches FURTHER than those three sentences said, so nothing was hidden by them. They are still overclaims and are named as such, because a residual list is trusted for its completeness in both directions. EVERY EXEMPTION RE-MEASURED AFTER THE COLLECTOR WIDENING, not argued: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` dotted-path walk (the `for…of` key, written `(cur as Record<string, unknown>)[key]`) and its `ctx[root]` parameter, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all quiet. Destructuring is ordinary in this codebase, so the widening shipped with its must-stay-quiet twins IN THE SAME COMMIT: an ordinary destructure used as an ordinary lookup, a numeric slot, a rest element, and a destructure of a value the walk cannot read all report `[]`. NOTHING LEAKED: IN-26 was unreachable in the real tree today, WR-30 ran in the safe direction, and the gate runs green over the real tree — 23 files, ZERO violations — inside a 1148-test suite, with `pnpm check:bundle` reporting the shipped bundle's entire import set as one specifier, `crypto`. `REQUIREMENTS.md` and `STATE.md` stay deliberately untouched and CORE-11's box stays `[ ]`, for the reason waves 24 and 25 recorded: wave 27 derives the replacement text and wave 28 reconciles both requirement-tier ledgers to it in ONE move.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T13:01:13.195Z",
    "resolved_at": "2026-08-24T13:49:09.560Z"
  },
  {
    "id": 32,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "POINTER, NOT A COPY — WAVE 27 (plan 01-27). SUPERSEDES ENTRY 31, which carried the WAVE-26 bound as text. From this wave this ledger RESTATES NO BOUND and names where the bound lives instead. THE RESIDUAL IS GENERATED by `deriveResidual(RESOLVER_REGISTRY)` in `packages/backend/src/outbound-prohibition.spec.ts`, from a registry of 38 records (31 resolvers, 7 measured silences), each carrying a probe and a counter-probe the suite EXECUTES against `auditSource`. THE TEXT SHIPS IN TWO SURFACES and is byte-compared to that output in both: that gate header, and `.planning/REQUIREMENTS.md` CORE-11, each between the sentinels `BEGIN DERIVED RESIDUAL …` / `END DERIVED RESIDUAL`. THE ENFORCING TESTS are in that file`s `the residual is DERIVED` describe: per-row probe and counter-probe execution, two byte comparisons, an entry-count assertion against the registry length, a coverage guard over two enumerated resolver populations with a named exemption list, and two extractor fixtures (missing sentinel; absent planning ledger). WHY THIS LEDGER POINTS RATHER THAN COPIES: it is an append-only dated history, and a block regenerated inside it would rewrite the record of what was believed and when. THE POINTER-NOT-A-BOUND RULE HAS NO MECHANICAL CHECK — the byte comparison reaches those two surfaces and no further — and that limit is named rather than left implicit. WHAT WAVE 27 DOES NOT DO: it changes no rule, closes no shape, and does not close the class; it makes the class MECHANICALLY DETECTABLE. Six divergence directions were executed and each watched turning the suite red. CORE-11 stays `[ ]`; wave 28 owns the flip, against the generated block.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T13:49:23.650Z",
    "resolved_at": "2026-08-24T14:05:59.280Z"
  },
  {
    "id": 33,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "POINTER, NOT A COPY — WAVE 28 (plan 01-28). SUPERSEDES ENTRY 32, which recorded the derivation; this entry records the DISCHARGE that was read off it, and it RESTATES NO BOUND, by the same rule wave 27 set. WHAT WAVE 28 DID: it discharged CORE-11's own first sentence ITEM BY ITEM — one row per surface that sentence enumerates plus one row per shape gap-closure round 5 closed, each row carrying a probe executed through `auditSource` in that session, the rule identifier it produced, the fixture title that asserts it, and the plan and summary that watched that fixture fail. THE TABLE IS IN `.planning/phases/01-skeleton-persistence-compatibility/01-28-SUMMARY.md`; the table is the evidence and the checkbox is not. THE OUTCOME, STATED PLAINLY: CORE-11's box is STILL `[ ]` and the blocking row is NAMED rather than deferred — the `no global fetch by ANY RECEIVER or alias` clause, and with it `no navigator.sendBeacon`, because an operator wrapping a GLOBAL receiver is not reached by the operator descent wave 25 built for the SDK receiver. That silence is the ONE entry in the generated block labelled OPEN AND UNOWNED rather than carried as residual (a), (b) or (b2); the reasons live in that block and in `.planning/REQUIREMENTS.md`'s plan 01-28 correction, not here. ORDERING, RECORDED BECAUSE IT IS WHAT MAKES THE DECISION TRUSTWORTHY: the two byte comparisons were run and observed GREEN BEFORE the box was examined, not after. THE RESIDUAL OF RECORD IS THE GENERATED BLOCK named in entry 32, unchanged by this wave. WHAT WAVE 28 DID NOT DO: it changed no rule, no fixture, no resolver and no registry row, planted no mutation, and hand-edited no machine-owned span; its entire diff in the gate file is one comment above the sentinel. STORE-03's and STORE-07's ledger collisions remain DEFERRED WITH THEIR OWNER — the operator, at the next requirements pass, by the STORE-01 → STORE-08 route — so a CORE-11 status of any kind must not be read as the ledger being clean. NOTHING LEAKED: the real tree re-measured at 23 files and ZERO violations with all four exempt sites quiet by name, the suite is green at 31 files / 1200 tests, and `pnpm check:bundle` reports one specifier, `crypto`. The blocking row is PROSPECTIVE blindness in a test-only gate.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T14:05:59.349Z",
    "resolved_at": "2026-08-24T19:02:50.294Z"
  },
  {
    "id": 34,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "POINTER, NOT A COPY — WAVE 29 (plan 01-29). SUPERSEDES ENTRY 33, which recorded wave 28's discharge; this entry records the BINDING wave 29 added, and it RESTATES NO BOUND, by the same rule wave 27 set. WHAT WAVE 29 ADDED, AND THE MEASUREMENT THAT MADE IT NECESSARY: the round-6 verifier deleted the compound-assignment assembly branch — the branch `assembledNames`' clause names when it says `a compound assignment` — and the ENTIRE derived block stayed at 52 passed, 0 failed (WR-32). The shipped TEXT was bound to the REGISTRY by bytes and each row's PROBE to the walk by execution; NOTHING bound a row's CLAUSE to the branch it describes. Wave 29 adds that third binding. `ResolverRecord` now carries a `branches` list — 60 probes across 32 rows, every resolver row carrying at least one — each entry naming the clause phrase it answers, a greppable anchor for the branch's own code site asserted to occur at a LINE START, a probe exercising THAT branch, and the rule identifiers it was MEASURED to produce. `BRANCH_VOCABULARY` makes \"this clause names that branch\" a string test rather than a reading; `UNBOUNDED_QUANTIFIERS` and `QUANTIFIED_CLAUSES` make a universal in a DECLARED PHRASING carry a measured bound; `FALSIFIED_HANDOFFS` records, as DATA rather than as prose inside a clause, the six phrases wave 29 measured false, the finding that falsified each, the wave that owns each widening (30 for CR-13, 31 for CR-12, 32 for CR-11) and the probe whose still-silent answer turns the entry RED the moment a later wave widens the code without re-widening the clause. THE ENFORCING TESTS live beside the ones entry 32 names, in that file's `the residual is DERIVED` describe: a per-branch execution case, a vocabulary-coverage guard, a branch-anchor existence assertion matched at line start, a resolver-row branch requirement, the quantifier guard with its three-universal check, the still-falsified handoff case, and a guard that no clause names its owning wave in prose. FIVE MUTATION DIRECTIONS were each executed SEPARATELY and watched turning the suite red, restored, and re-run green — the verifier's own `PlusEqualsToken` deletion, a second named branch, a missing branch entry, an emptied branch list, and an undeclared universal. WHAT IT DOES NOT CLOSE, STATED HERE BECAUSE AN OVERCLAIM IN A HISTORY IS WHAT THIS ROUND IS ABOUT: clause-to-branch binding makes a NAMED branch's removal detectable and does NOT make an UNNAMED branch detectable, and it does not close the class. Neither phrase list is exhaustive — a branch named outside `BRANCH_VOCABULARY`, or a universal spelled outside `UNBOUNDED_QUANTIFIERS`, is unmatched and therefore unbound — and the registry is still not proven complete. All FOUR limits ship inside the generated block on both byte-compared surfaces. THE POINTER-NOT-A-BOUND RULE STILL HAS NO MECHANICAL CHECK — the byte comparison reaches the gate header and `.planning/REQUIREMENTS.md` and no further — and this entry obeys it by choice rather than because anything enforces it. NOTHING LEAKED AND THIS WAVE CHANGED NO RULE: the walk and resolver bodies are byte-identical to the pre-plan tree, the real tree re-measured at 23 files and ZERO violations with all four exempt sites quiet by name, and `pnpm check:bundle` reports one specifier, `crypto`. CORE-11's box is EXACTLY as wave 28 left it and wave 32 owns it; STORE-03's and STORE-07's ledger collisions remain DEFERRED WITH THEIR OWNER.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T19:03:12.830Z",
    "resolved_at": "2026-08-24T19:29:34.580Z"
  },
  {
    "id": 35,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "POINTER, NOT A BOUND (plan 01-30, gap-closure round 6, CR-13). A receiver KEY bound through a conditional, ??, || or && INITIALIZER answered CLEAN while all four twins of the identical conditional reported; closed at the seam by operatorLiteralBinding, built on the existing operatorOperands and wired into BOTH of collect's identifier branches in one plan. The two clauses it falsified word for word — constStrings and literalsOf — were rewritten FROM THE CODE with a BranchProbe each, and both wave-30 FALSIFIED_HANDOFFS entries were deleted with the pin decremented, in the same commit as the widening. THE BOUND ITSELF LIVES IN THE GATE HEADER AND IN REQUIREMENTS.md, generated from RESOLVER_REGISTRY; this entry deliberately restates none of it, and that pointer-not-a-bound rule remains a PROHIBITION WITH NO MECHANICAL CHECK. Nothing leaked: prospective blindness in a test-only gate, real tree ZERO after each of the two widenings, check:bundle at one specifier (crypto). CORE-11's box is exactly as wave 28 left it; wave 32 owns it.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T19:29:34.645Z",
    "resolved_at": "2026-08-24T20:08:00.806Z"
  },
  {
    "id": 36,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "POINTER, NOT A BOUND (plan 01-31, gap-closure round 6, CR-12). SUPERSEDES ENTRY 35, which recorded wave 30 closing CR-13; this entry records the widening wave 31 added, and RESTATES NO BOUND. A logical-assignment binding was invisible to every widening collector: `let r; r ??= sdk.requests; r.send(req)` answered CLEAN while `let r; r = sdk.requests; r.send(req)` reported outbound-send, two characters apart, with NINE shapes silent across ??=, ||= and &&= (sdk.requests, globalThis, fetch, eval, navigator, a string key, an assembled key) and ALL FOUR =/+= controls firing. The mechanism was one inline token test: collects alias-growing branch compared against EqualsToken while the numeric-poisoning arm eleven lines below it read ASSIGNMENT_OPERATORS and named `x ||= sdk.requests` in its own comment. CLOSED by a named frozen module-scope set ASSIGNING_OPERATORS (=, ??=, ||=, &&=) read by that branch, membership settled by MEASUREMENT with both readings run (the real tree did not discriminate, 23 files / 0 violations under both; the shapes did). Eight clauses rewritten from their branches with one BranchProbe per operator (73 -> 91), two FALSIFIED_HANDOFFS entries observed RED then discharged in the same commit as the code (4 -> 2). THE RESIDUAL IS NOT RESTATED HERE: it is generated by deriveResidual(RESOLVER_REGISTRY) from a 42-row registry and byte-compared into the gate header and REQUIREMENTS.md CORE-11 — read it there. Nothing leaked: CR-12 is PROSPECTIVE blindness in a test-only gate; check:bundle still reports one specifier, crypto.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T20:08:16.828Z",
    "resolved_at": "2026-08-24T20:47:28.548Z"
  },
  {
    "id": 37,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "POINTER, NOT A BOUND (plan 01-32, gap-closure round 6, CR-11 + WR-33..WR-37 + IN-27..IN-30). SUPERSEDES ENTRY 36, which recorded wave 31 closing CR-12; this entry records what wave 32 changed, and RESTATES NO BOUND. CR-11 was SPLIT and both halves are closed. THE UNSAFE HALF, undisclosed and a plausible defensive idiom: `const g = globalThis ?? self; g.fetch(url)` answered CLEAN, and so did the conditional twin, `const f = fetch ?? x`, `const e = eval ?? x`, `const n = navigator ?? x`, `(ok && globalThis).fetch(url)`, `(ok && navigator).sendBeacon(u, d)`, `(ok && eval)(src)`, `(ok && fetch)(url)` and `new (ok && WebSocket)()` — while the SDK twins of the identical operator class reported, and the initializerReceiver row actively told a reader initializer position and call position give the same answer. CLOSED at the seam by ONE shared descent, operatorOperandMatching — a third consumer of the operatorOperands statement rather than a sixth copy of the operand loop — reached from SIX resolvers: isGlobalReceiverIn, isFetchExpression, bareFetchCallee, isNavigatorReceiver, globalNameOf and aliasedGlobalOf. THE SIXTH WAS FOUND BY MEASURING RATHER THAN BY READING: with the descent already wired into isFetchExpression, `(ok && fetch)(url)` was STILL silent, because the bare-call rule asked ts.isIdentifier(callee) && fetchAliases.has(callee.text) INLINE and never consulted that function at all. THE SAFE HALF was an OVERREACH TO CORRECT and not a hole — six wrapper spellings reported while the row claimed silence in every spelling, the gate reaching FURTHER than its own text, which cannot cause anyone to ship an outbound call believing it would be caught; wave 28 disclosed one instance of it UNPROMPTED with the correct mechanism and is credited for it. The row silence-operator-around-global-receiver was REMOVED rather than reworded, because re-measurement of all eighteen spellings found NO surviving silence, and its QUANTIFIED_CLAUSES and FALSIFIED_HANDOFFS entries went with it; FALSIFIED_HANDOFFS is now EMPTY and its pin is ZERO, both entries observed RED before anything was deleted. ALSO CLOSED: WR-37's nested destructure through reportReceiverMembers (a composition of two shapes already resolved, closed while its five siblings are carried as measured silences with executed probes because each of those is a genuine widening); WR-33's two exemption reasons at the TWO WEIGHTS the verifier assigned rather than flattened to one; WR-34's box pin, CORE11_BOX_EXPECTED, the first thing in this repository that can see CORE-11's checkbox, mutation-proved by flipping it; WR-35's two head-side instability mechanisms restored in all three disclosures with the exemplar renamed for the branch it takes; WR-36's IN-25 correction scoped to a NAMED PROPERTY VALUE with three spread counterexamples pinned in the same case; IN-27, IN-28, IN-29 and IN-30. CORE-11's BOX IS STILL `[ ]` AND FIVE BLOCKING ROWS ARE NAMED: the eight-row discharge table was re-executed in this session and all 35 probes report, including all six rows the verifier found blocked — but WR-37's five siblings are one-hop bindings of sdk.requests that stay SILENT (an array element position, an object-literal property, a class field, a parameter default, a for-of binding) while six other one-hop binding spellings report, so the gate cannot go red on shapes clauses 2 and 3 enumerate. That is the same arithmetic that held this box open at plan 01-18 and at wave 28. THE RESIDUAL IS NOT RESTATED HERE: it is generated by deriveResidual(RESOLVER_REGISTRY) from a 51-row registry and byte-compared into the gate header and REQUIREMENTS.md CORE-11 — read it there — and the pointer-not-a-bound rule remains a PROHIBITION WITH NO MECHANICAL CHECK. Nothing leaked: every finding this round closed is PROSPECTIVE blindness in a test-only gate, real tree ZERO after each widening, check:bundle at one specifier (crypto), suite green at 31 files / 1345 tests.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T20:47:51.285Z",
    "resolved_at": "2026-08-25T09:58:45.681Z"
  },
  {
    "id": 38,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "POINTER, NOT A BOUND (plan 01-33, gap-closure round 7, CR-14 + WR-38 + WR-43). SUPERSEDES ENTRY 37, which recorded wave 32 closing CR-11; this entry records what wave 33 changed, and RESTATES NO BOUND. THE GATE FILE'S HAND-WRITTEN HEADER NOW STATES NO BOUND OF ITS OWN. Until this wave every guard in that file read RESOLVER_REGISTRY[].clause and nothing else, while the 3,465 hand-written lines a reader meets FIRST carried the declared quantifier phrasings 20 times and raised ZERO obligations. Two stale claims lived in exactly that gap and both were DELETED rather than corrected: CR-14, a paragraph asserting an operator wrapping a global receiver was STILL SILENT in six named spellings, pointing at a fixture titled as a measured silence — when wave 32 had closed the shape through operatorOperandMatching and bareFetchCallee, retitled that fixture CLOSED (CR-11), and REMOVED the registry row it rested on; and WR-38, a paragraph asserting CORE-11 was marked complete, contradicting the ledger row 8,100 lines below it. DELETION BEAT WIDENING, on the verifier's own measured reasoning: a corrected sentence is still an AUTHORED bound standing beside a DERIVED one, and widening the scans to read the header would have converted twenty stale sentences into twenty NEW obligations on prose that drifts again. Six rounds each corrected a stale sentence here and each acquired another; deleting removes the CLASS. WR-43 IS ANSWERED BY REMOVING THE SURFACE, NOT INSTRUMENTING IT, and a cheap guard keeps it removed: one case scans the WHOLE FILE'S OWN BYTES for the phrasings declared in UNBOUNDED_QUANTIFIERS, under a NAMED whitespace convention that JOINS comment lines so a phrasing wrapped across two of them is still seen, with three anchor-derived exclusions — each asserted non-empty, within a pinned line band, and positively containing a token only that construct carries — and HEADER_QUANTIFIER_EXEMPTIONS, 29 named and reasoned entries, covering every survivor. THE ROUND'S OWN DEFECT WAS FOUND INSIDE ITS OWN FIX: the review suggested a LINE-BASED scan, and the hand-written region scores 20 line-based against 24 joined, because FOUR occurrences wrap across two comment lines — a guard reporting 20 while 24 exist is a stated reach exceeding an executed one, which is the defect this whole round is about. The wrapped failing path was executed as a SEPARATE mutation and observed RED. A region nobody had measured, the 3,519 lines BELOW the registry carrying 27 occurrences, is inside the guard's reach for the same reason. ITS LIMITS ARE NAMED WHEREVER IT IS CLAIMED: it is a PHRASE LIST over BYTES under one whitespace convention, so a universal spelled in undeclared words passes it and it reaches bytes rather than meaning; and it is the DELETION, not the guard, that makes the header correct. THIS WAVE CLOSED NO CODE BLINDNESS AND WIDENED THE GATE'S REACH BY NO SHAPE — it changed the gate's DESCRIPTION OF ITSELF and made it singular. CR-15 and CR-16 remain OPEN and belong to wave 34; CORE-11's box is exactly as wave 32 left it and wave 35 owns it. THE RESIDUAL IS NOT RESTATED HERE: it is generated by deriveResidual(RESOLVER_REGISTRY) from a 51-row registry and byte-compared into the gate header and REQUIREMENTS.md CORE-11 — read it there — and the pointer-not-a-bound rule remains a PROHIBITION WITH NO MECHANICAL CHECK for this ledger and STATE.md. Nothing leaked: CR-14 and WR-38 are STALE TEXT in a test-only gate rather than unenforced behaviour, real tree at 23 files / ZERO violations, check:bundle at one specifier (crypto), suite green at 31 files / 1348 tests.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-25T09:58:29.290Z",
    "resolved_at": "2026-08-25T10:47:46.162Z"
  },
  {
    "id": 39,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "POINTER, NOT A BOUND (plan 01-34, gap-closure round 8, CR-15 + CR-16 + WR-39 + WR-40 + WR-41 + WR-42 + IN-31..IN-33). SUPERSEDES ENTRY 38, which recorded wave 33 deleting the header's bounds; this entry records what wave 34 changed, and RESTATES NO BOUND. TWO SHAPES WERE DISCLOSED AND NO CLASS WAS ENDED. CR-15 — a bare global in RECEIVER rather than CALLEE position, silent family-wide including through a positively identified alias, so that const f = fetch; f.call(null, url) answered clean while f(url) on the next line reported — and CR-16 — an unreadable computed member on a positively identified navigator receiver, dropped where four other identified receivers and a navigator DESTRUCTURE twenty lines away in the same rule all reported — are now NAMED ROWS with executed probes and executed counter-probes in the generated span. Measured at the wave's start that span carried ZERO occurrences of .call, .apply, .bind, Reflect, navigator[ and require(; it now carries all six. THE ROWS LANDED IN THEIR OWN COMMIT BEFORE ANY BRANCH EXISTED, with both byte comparisons green in that commit, because under the bar the operator adopted — DERIVED, DRIFT-DETECTABLE, SOLE BOUND — the disclosure is the deliverable and a branch beside it is a bonus. THREE WIDENINGS WERE TAKEN, each only after cheap / obviously correct / measured were answered in writing: a receiver-position arm for the fetch surface, restricted to a bare-name receiver so the member-qualified spelling still reports EXACTLY ONCE; a SECOND, separate arm for the dynamic-code globals, which resolve through a different function and were therefore a second decision rather than a footnote on the first; and one || admitting navigator to the unreadable-member arm. EVERYTHING STILL SILENT AFTER ALL THREE IS ROWED, NOT ASSUMED: a bare global in ARGUMENT position; an unreadable computed member of the global fetch, of an identified fetch alias and of a dynamic-code global; an outbound CONSTRUCTOR in receiver position, a third mechanism nobody predicted and re-measurement found; an unreadable member of a navigator across a function boundary; a module loader reached by way of a local binding in BOTH directions, NOT widened with that scope decision written into the row's own clause; the global fetch invoked as a tagged template, which names the existing key row BY ID so a searching reader is redirected rather than misled; and a destructure deeper than one element or nested through an array pattern. A PREDICTION MEASUREMENT CONTRADICTED, RECORDED RATHER THAN ABSORBED: the parameter-key spelling was predicted to survive the navigator widening and does not, because on an accepted receiver an unreadable member reports whatever the reason the key would not reduce; that row was NARROWED BY MEASUREMENT to the resolution boundary that does survive rather than left standing as a fiction. ALSO CORRECTED, both DISCLOSURE defects with no prohibition moved: WR-39, the head-side truncation discriminator re-derived from a sweep across FOUR parameter-name lengths after the stated one-byte delta turned out to be an artifact of a ten-character parameter name matching the redaction marker's length, with the byte-identical duplicate assertion deleted and the branch SELECTOR asserted in its place, all three disclosure sites moving in one commit and observations.ts changing by COMMENT ONLY; and WR-40/WR-42, the rendered-error spread residual split into the three mechanisms it exhibits, including a call's ARGUMENTS are never descended, which that list had never carried at all. THIS WAVE ENDED NO CLASS — the space of JavaScript spellings that reach a function through a value does not close, so no scan and no bar ends the class these shapes belong to, and closing them is not what earns CORE-11's [x]. CORE-11's box is untouched and belongs to wave 35. WAVE 33's whole-file quantifier guard stayed green throughout and its exclusions, its exemption map and both its pinned counts are BYTE-UNCHANGED. THE RESIDUAL IS NOT RESTATED HERE: it is generated by deriveResidual(RESOLVER_REGISTRY) from a 61-row registry and byte-compared into the gate header and REQUIREMENTS.md CORE-11 — read it there — and the pointer-not-a-bound rule remains a PROHIBITION WITH NO MECHANICAL CHECK for this ledger and STATE.md. Nothing leaked: every finding this wave touched is PROSPECTIVE blindness in a test-only gate, real tree at 23 files / ZERO violations after every widening, check:bundle at one specifier (crypto).",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-25T10:48:11.804Z",
    "resolved_at": "2026-08-26T03:33:33.903Z"
  },
  {
    "id": 40,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "POINTER, NOT A BOUND (plan 01-35, gap-closure round 9). SUPERSEDES ENTRY 39, which recorded wave 34's CR-15/CR-16 rows. THE OPERATOR RE-SCOPED CORE-11's ACCEPTANCE BAR on 2026-08-25 by the STORE-01 -> STORE-08 route, because the old bar (the gate goes red on every spelling of every enumerated clause) is UNREACHABLE over an open language rather than merely unmet. The three criteria that replace it — DERIVED, DRIFT-DETECTABLE, THE SOLE BOUND — were each re-verified BY EXECUTION in wave 35 and each proved live by a mutation planted, watched red and restored; CORE-11's box is now [x], moved with CORE11_BOX_EXPECTED in ONE commit. CRITERION 3's verdict is SCOPED and the scope is part of it: met up to the guard's PHRASE-LIST REACH under its NAMED NORMALIZATION, with two classes of unreached surface named — unguarded FILES (.planning/STATE.md and .planning/WINDOWS.md, reached by no mechanical comparison, which includes this entry) and undeclared SPELLINGS inside the guarded files. THIS ENTRY RESTATES NO BOUND: the bound of record is the machine-owned generated span in .planning/REQUIREMENTS.md and in the gate file, byte-compared to deriveResidual(RESOLVER_REGISTRY) by the suite. THE NEW BAR IS NARROWER THAN THE OLD ONE AND ENDS NO CLASS — CR-15, CR-16 and the twenty-six measured silences are NAMED RESIDUALS under it, and the class stays open because the space of JavaScript spellings is open. What narrowed is the CHECKBOX's meaning, not the PROHIBITION's, which is byte-identical. STORE-03 and STORE-07 are untouched and remain deferred with their owner.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-26T03:33:46.522Z",
    "resolved_at": "2026-08-26T11:11:00.277Z"
  },
  {
    "id": 41,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "POINTER, NOT A BOUND (plan 01-38, gap-closure round 8, waves 36 through 38). SUPERSEDES ENTRY 40, whose description states \"CORE-11's box is now [x], moved with CORE11_BOX_EXPECTED in ONE commit\" — FALSIFIED by commit 4105fd0 of 2026-08-26, which reverted the box and the constant together seven minutes after verification pass 8 was written and adjudicated criterion (3) UNMET. Entry 40's remaining content stands and is not rewritten: the 2026-08-25 operator re-scope, the three criteria, the SCOPED criterion-3 verdict, the two named classes of unreached surface, the narrowness statement and the named residuals all remain the current position. THE ROUND'S FOUR FINDINGS AND THEIR DISPOSITION. CR-17: the exemption keys were positional and survived a cross-construct relocation unnoticed — anchored by constructAnchorFor in wave 37, watched failing first on a purpose-built relocation fixture. WR-48: quantifier exclusion three narrowed to 4135..5767 in wave 37, and the 117 restored lines MEASURED at ZERO new obligations. CR-18: CORE-11's ledger row reduced in wave 38 to the prohibition plus one pointer, with all three removed passages relocated BYTE-IDENTICAL into a dated 2026-08-26 history block — a row that carries no statement of the box's state cannot carry a stale one. CR-19: .planning/STATE.md's live blockers corrected in wave 38 against six probes RE-EXECUTED through auditSource in that session, all six reporting, and against a registry re-counted at 26 measured-silence rows of 61 with all five of plan 01-32's names present and silence-operator-around-global-receiver ABSENT — that row was not restored and the suite requires it to stay gone. NEW AND OPEN, FOUND BY THIS ROUND'S OWN RE-RUN OF CRITERION (3)(d) AND NOT REPAIRED HERE: the gate file's hand-written header still states CORE-11's box state and a stale flip ownership in TWO places, inside the undated wave-25 and wave-26 narrative blocks, and one of them sits four lines above wave 33's WR-38 note asserting the box is stated in EXACTLY TWO places. The gate file is closed after plan 01-37 and plan 01-38 is prohibited from editing it, so this is RECORDED rather than fixed. THIS ENTRY RESTATES NO BOUND AND IS A POINTER: the bound of record is the machine-owned generated span in .planning/REQUIREMENTS.md and in the gate file, byte-compared to deriveResidual(RESOLVER_REGISTRY) by the suite. CORE-11's box is [ ] as measured on 2026-08-26 and whether it may move belongs to a verifier on the whole round's evidence; this entry awards no verdict.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-26T11:10:50.592Z",
    "resolved_at": null
  },
  {
    "id": 42,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "CR-21 closes one laundering route only: a hand-written key outside HEADER_QUANTIFIER_EXEMPTIONS, the same-construct residual, the phrase-list reach and both classes of unreached surface remain — criterion (3) not discharged.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-26T14:29:20.319Z",
    "resolved_at": null
  },
  {
    "id": 43,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "FINDING F-10: the round-10 baseline variable BASE_FILES held a source-file count (46) while its only consumer compares it against vitest's test-file count (31) — two correct measurements of different quantities",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-26T19:41:49.796Z",
    "resolved_at": null
  },
  {
    "id": 44,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "FINDING F-11: plan 01-43 states the WR-54 case claims 'all five locators proved unique when THREE are'; enumerated this session the case used five locator expressions of which TWO were proved",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-26T19:41:49.894Z",
    "resolved_at": null
  },
  {
    "id": 45,
    "kind": "unmet-truth",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": 9147,
    "description": "F-3 (measured by plan 01-46, filed by plan 01-47 which owns this ledger): the HEADER_QUANTIFIER_EXEMPTIONS section divider reads '--- HEADER (1..956) ---' while the BEGIN DERIVED RESIDUAL sentinel sits at 949, so the header extent is 1..948. A hand-written range in the gate file's live bytes, off by one on arrival and off by eight now, reached by no mechanical check. Same class as CR-25/CR-31.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-27T14:05:00.114Z",
    "resolved_at": null
  },
  {
    "id": 46,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": 10314,
    "description": "F-2 (measured by plan 01-46, filed by plan 01-47 which owns this ledger): the anchor walk's foreign-lines report has a zero branch and a non-zero branch; neither of wave 46's two planted mutations exercised the non-zero branch, so the rendering path a reader would meet on a real split shadow has never been watched. It is a failure-message path, not an assertion — recorded as unwatched rather than claimed as guarded.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-27T14:05:13.436Z",
    "resolved_at": null
  },
  {
    "id": 47,
    "kind": "deviation",
    "phase": "01",
    "file": ".planning/phases/01-skeleton-persistence-compatibility/01-SECURITY.md",
    "line": 168,
    "description": "F-1 class, and plan 01-47 hit its own instance: a plan gate that can only go green by mutating an artifact marked kept-verbatim. 01-46's WM -eq 3 gate was unsatisfiable alongside the census that plan mandated (measured 7, zero new mechanism claims). 01-47's open-scoped gates on 01-SECURITY.md read 1 and 3 because every row whose Status cell says open sits inside a superseded, kept-verbatim historical block, and all three were already CLOSED with evidence. Both executors declined to fit the artifact to the gate. The gates, not the artifacts, are what need revising.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-27T14:05:13.548Z",
    "resolved_at": null
  },
  {
    "id": 48,
    "kind": "stub",
    "phase": "05",
    "file": "tests/export-payload-budget.spec.ts",
    "line": null,
    "description": "EXPORT_RPC_CHUNK_ROWS is exported from a spec in tests/; plan 05-11 must move it into the exporter's module — production code must not import from tests/",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-28T11:58:40.360Z",
    "resolved_at": null
  },
  {
    "id": 49,
    "kind": "stub",
    "phase": "05",
    "file": "tests/export-payload-budget.spec.ts",
    "line": null,
    "description": "CSV serialiser is a measurement-only stand-in for packages/engine/src/csv.ts (UISEC-02), which plan 05-03 writes",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-28T11:58:40.447Z",
    "resolved_at": null
  },
  {
    "id": 50,
    "kind": "unmet-truth",
    "phase": "05",
    "file": "tests/sqlite-346-query-plans.spec.ts",
    "line": null,
    "description": "Query plans measured on SQLite 3.53.4, not Caido's target 3.46.0 — no 3.46 binary reachable; assumption A5 narrowed, not closed",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-28T11:58:40.533Z",
    "resolved_at": null
  },
  {
    "id": 51,
    "kind": "deviation",
    "phase": "05",
    "file": "packages/engine/src/sanitise.ts",
    "line": null,
    "description": "capped() makes one O(n) pass over a target-controlled string to report R2's total; disclosed in the module header, bounded by a named 2,000 ms ceiling on the 4 MiB case, and not the per-character-index shape DET-07 bans",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-28T12:25:05.499Z",
    "resolved_at": null
  },
  {
    "id": 52,
    "kind": "deviation",
    "phase": "05",
    "file": ".planning/REQUIREMENTS.md",
    "line": null,
    "description": "Plan 05-04 declared UI-03, UI-04, OPS-01, OPS-02, OPS-04, FIND-01 and FIND-02 but deliberately left their boxes [ ] — the deliverables are deferred to Phases 3/4 and are carried in 05-ENTITY-CONTRACT.md's Deferral Register (P5-D21)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-28T12:53:40.633Z",
    "resolved_at": null
  },
  {
    "id": 53,
    "kind": "deviation",
    "phase": "05",
    "file": ".planning/phases/05-workspace-operator-workflow/05-ENTITY-CONTRACT.md",
    "line": null,
    "description": "D-01's one-way reversibility checkpoint is carried forward UNSPENT and is OWED to the first task that calls sdk.findings.create; no task in Phase 5 writes a Finding",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-28T12:53:40.720Z",
    "resolved_at": null
  },
  {
    "id": 54,
    "kind": "deviation",
    "phase": "05",
    "file": "packages/backend/src/store/schema.spec.ts",
    "line": null,
    "description": "05-06: the plan's task-2 gate edit was folded into task 1's commit to avoid committing a red schema gate; the task boundary in 05-06-PLAN.md and the shipped commit boundary therefore differ",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-28T15:11:18.513Z",
    "resolved_at": null
  },
  {
    "id": 55,
    "kind": "deviation",
    "phase": "05",
    "file": "packages/frontend/src/stores/coalescer.ts",
    "line": null,
    "description": "05-08: CoalescerOptions.trailingWindowMs is overridable and the reaction CAP is not. The seam exists so a spec can drive the debounce faster than the cap and prove the throttle gate load-bearing (P5-D62); a production caller passing a large window could delay a legitimate update. Disclosed, not closed — the mounting component (05-09) must not pass it.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-28T16:39:28.707Z",
    "resolved_at": null
  },
  {
    "id": 56,
    "kind": "stub",
    "phase": "05",
    "file": "packages/frontend/src/App.vue",
    "line": null,
    "description": "ArtifactsTable and ObservationsTable are mounted with :analyses=\"null\" and :affected-filter=\"null\" — the shipped paged reads carry no scan_state and no endpoint returns one, so no per-row Partial badge and no partial-view banner render on the running page. UI-09 deliberately left unmarked.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-28T17:26:44.942Z",
    "resolved_at": "2026-08-29T01:31:22.450Z"
  },
  {
    "id": 57,
    "kind": "stub",
    "phase": "05",
    "file": "packages/frontend/src/components/ArtifactsTable.vue",
    "line": null,
    "description": "The triage column renders empty text: the triage table does not exist yet (its key waits on Phase 4's stable entity identity, D-05(4)). The column holds its position so it does not shift every column right of it when the data lands.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-28T17:26:53.143Z",
    "resolved_at": null
  },
  {
    "id": 58,
    "kind": "stub",
    "phase": "05",
    "file": "packages/frontend/src/components/PartialBanner.vue",
    "line": null,
    "description": "The show-only-affected action is suppressed on both shipped tables because the backend statement matrix has no scan-state filter column, so no single-column filter can express 'only the affected artifacts'. Component-level behaviour is proved; the wiring has no filter to bind to.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-28T17:26:53.230Z",
    "resolved_at": "2026-08-29T01:31:22.560Z"
  },
  {
    "id": 59,
    "kind": "stub",
    "phase": "05",
    "file": "packages/frontend/src/components/EvidencePanel.vue",
    "line": null,
    "description": "The evidence panel's byteRange and snippet slots render an explicit not-yet-available line naming Phase 4 (plan 04-03): the evidence table does not exist, so there are no offsets to slice and no excerpt to show. App.vue passes :evidence=\"null\". The rendering path is fully exercised by the panel spec against the shared hostile fixture; only the producer is absent.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-29T01:31:47.734Z",
    "resolved_at": null
  },
  {
    "id": 60,
    "kind": "stub",
    "phase": "05",
    "file": "packages/frontend/src/components/EvidencePanel.vue",
    "line": null,
    "description": "The score-explanation slot renders an explicit not-yet-available line naming Phase 3 (plan 03-03): there is no signal vocabulary and no scorer, so no score has been computed. UI-04 stays open.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-29T01:31:47.844Z",
    "resolved_at": null
  },
  {
    "id": 61,
    "kind": "stub",
    "phase": "05",
    "file": "packages/frontend/src/components/EvidencePanel.vue",
    "line": null,
    "description": "The source-request slot renders an explicit not-yet-available line: App.vue passes :source-request-id=\"null\" because nothing links an artifact to the observation whose request still resolves (D-02's walk is the deferred pass's). UI-03 is deliberately NOT marked complete for this reason and the byte-offset one.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-29T01:31:47.959Z",
    "resolved_at": null
  },
  {
    "id": 62,
    "kind": "deviation",
    "phase": "05",
    "file": "packages/backend/src/store/retry.ts",
    "line": null,
    "description": "A retry returns the analysis to the queued state but does NOT re-walk the bytes: DefMiner retains a digest, a length and a kind and no body, so the walk happens the next time the target serves them. The panel states this in words. Phase 2's ERR-02 recovery is what drains a pending row without a fresh sighting.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-29T01:31:48.065Z",
    "resolved_at": null
  },
  {
    "id": 63,
    "kind": "unrun-verify",
    "phase": "05",
    "file": "packages/backend/src/store/export.ts",
    "line": null,
    "description": "The 8 MiB per-RPC-call figure is a BUDGET this project sets, not a ceiling measured from Caido; 05-02 asked 05-11 to confirm a large export against a real Caido and it could not. Coverage D13.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T08:20:05.758Z",
    "resolved_at": null
  },
  {
    "id": 64,
    "kind": "stub",
    "phase": "05",
    "file": "packages/frontend/src/App.vue",
    "line": null,
    "description": "SERVER_STORAGE_PATH is null — the R5 server-path renderer in SettingsPanel.vue ships with no production data source; telemetry.ts strips sdk.meta.path() out of everything crossing the RPC, so DEPLOY-02 (Phase 6) owns the surface that supplies one",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T09:17:48.121Z",
    "resolved_at": null
  },
  {
    "id": 65,
    "kind": "stub",
    "phase": "06",
    "file": "packages/backend/src/index.ts",
    "line": null,
    "description": "getScanStatus reports analysed: null — the scans table has no analysed column and plan 06-06 owns wiring the consumer-side number",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T16:12:21.498Z",
    "resolved_at": null
  },
  {
    "id": 66,
    "kind": "stub",
    "phase": "06",
    "file": "packages/backend/src/index.ts",
    "line": null,
    "description": "getScanStatus reports heldAtWatermark: false unconditionally — true is the honest answer for a build that walks one page per call, and plan 06-03 ships the watermark that can make it true",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-31T16:12:21.588Z",
    "resolved_at": "2026-08-31T17:53:10.642Z"
  },
  {
    "id": 67,
    "kind": "stub",
    "phase": "06",
    "file": "packages/backend/src/scan/producer.ts",
    "line": null,
    "description": "runScanProducer has no caller in the shipped build — Start scan inserts the row, and plan 06-03 adds the watermark-gated loop that drives the walk",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T16:12:21.682Z",
    "resolved_at": null
  },
  {
    "id": 68,
    "kind": "deviation",
    "phase": "06",
    "file": "scripts/phase6/o07-body-length.sh",
    "line": null,
    "description": "Plan 06-02 task 2 step 5 as written (issue startScan with an operator clause, let the producer walk one page, read the query()-side Body.length) is NOT EXECUTABLE on the shipped build: index.ts startScan REFUSES any non-empty operatorFilter until 06-04 ships the validator, and runScanProducer deliberately has no caller until 06-03 ships the watermark. Measured through probe/phase6-o07 instead, which calls sdk.requests.query() directly. 06-03/06-04 should re-read this if they want the measurement repeated through the real producer.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T16:34:32.559Z",
    "resolved_at": null
  },
  {
    "id": 69,
    "kind": "deviation",
    "phase": "06",
    "file": "probe/phase6-o07/backend/script.js",
    "line": null,
    "description": "The O-07 query() walk is UNFILTERED (descending req.id, first 50, items matched by the request id the hook recorded) rather than filtered to the fixture's path. Deliberate: this phase's own O-03/O-06 record Caido's req.path / req.query / cont implementations as unmeasured, so a filtered walk returning nothing would make 'the read path reports no body' and 'the clause did not match' indistinguishable. The byte-count verdict therefore does NOT cover a filtered query() page. 06-11's push-down proof is the plan that should close it.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T16:34:42.297Z",
    "resolved_at": null
  },
  {
    "id": 70,
    "kind": "deviation",
    "phase": "06",
    "file": "tests/phase6-o07.spec.ts",
    "line": null,
    "description": "Plan 06-02 task 1's <verify> (pnpm vitest run tests/phase6-o07.spec.ts, fails_when non-zero exit) is unsatisfiable at task-1 time by task 1's own acceptance criterion, which requires the gate to FAIL when the artifact is absent. Executed as a RED gate: 13 failed / 7 passed / 0 skipped at task 1, 20 passed after task 2 wrote the artifact. No code changed to reconcile them.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T16:34:42.387Z",
    "resolved_at": null
  },
  {
    "id": 71,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/index.ts",
    "line": 692,
    "description": "Plan 06-04 did NOT remove the refused/operator-clause-unsupported placeholder despite the executor brief saying it would. Assessed and declined: 06-05-PLAN.md (wave 3, depends_on 06-04) names index.ts and api/spec.ts in files_modified and explicitly owns 'Extend startScan to run the operator clause through validateOperatorClause'. Removing it in 06-04 would have shipped a half-wired endpoint — no ScanCommandOutcome shape distinguishing a clause rejection from the one-scan-at-a-time refusal, no RPC union carrying the four new codes, no frontend copy in scan-contract.ts. D-05 is delivered by the end of the phase, on 06-04's validator. Closes when 06-05 lands.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-31T17:00:10.126Z",
    "resolved_at": "2026-08-31T17:53:10.461Z"
  },
  {
    "id": 72,
    "kind": "unmet-truth",
    "phase": "06",
    "file": "packages/backend/src/scan/filter.ts",
    "line": null,
    "description": "The fail-CLOSED property is proved on DefMiner's half only. That an unbalanced or comment-truncated expression actually makes execute() throw is CITED from the SDK's own JSDoc (@throws {Error} If a query parameter is invalid, requests.d.ts:635-639) and has never been executed against a real Caido parser in this repo. 06-04 tests the refusal, the composer's omission, and producer.ts's handling of a rejected execute(); it does not test Caido. Plan 06-11's fixture suite over sdk.requests.matches() is where this becomes measured — along with whether req.path strips the query and whether cont is byte-wise or Unicode case-folded. Recorded as SUMMARY coverage D6 with human_judgment: true.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T17:00:10.225Z",
    "resolved_at": null
  },
  {
    "id": 73,
    "kind": "stub",
    "phase": "06",
    "file": "packages/backend/src/index.ts",
    "line": null,
    "description": "getScanStatus still reports heldAtWatermark: false unconditionally. Plan 06-03 made the value REAL — the producer holds at SCAN_BACKPRESSURE_WATERMARK and exposes isHeldAtWatermark() as module state precisely because getScanStatus is a separate call that does not hold the walk's outcome — but index.ts and api/spec.ts are named in 06-05-PLAN.md's files_modified and 06-05 owns the getScanStatus projection. Wiring it here would have shipped a half-owned endpoint the way 06-04 declined to (WINDOWS 71). Closes when 06-05 lands. Supersedes the ownership half of entry 66.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-31T17:23:05.611Z",
    "resolved_at": "2026-08-31T17:53:10.552Z"
  },
  {
    "id": 74,
    "kind": "stub",
    "phase": "06",
    "file": "packages/backend/src/scan/producer.ts",
    "line": null,
    "description": "runScanProducer STILL has no caller in the shipped build. The loop entry 67 named now exists — watermark gate, per-page skip-done read, descending multi-page walk, yield, re-entrancy flag — but nothing drives it: startScan inserts the row and returns. The driver lives in index.ts, which is 06-05's files_modified. Entry 67 is therefore only half discharged: the loop is 06-03's and shipped; the caller is 06-05's and is not.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T17:23:05.711Z",
    "resolved_at": null
  },
  {
    "id": 75,
    "kind": "unmet-truth",
    "phase": "06",
    "file": "packages/engine/src/thresholds.ts",
    "line": null,
    "description": "SCAN_BACKPRESSURE_WATERMARK is a DROP-safety bound only and says nothing about LATENCY. At TOKENIZER_MS_PER_MB a full PASSIVE_MAX_BYTES artifact takes ~6.3s to walk and the consumer is strictly serial, so a queue standing at the watermark can be a long backlog in front of every live response the operator generates — none dropped, all waiting. Closing it needs a MEDIAN ARTIFACT SIZE over a real project's stored traffic; SPIKE-06's ladder was four sizes over a corpus of two, which is a ladder and not a distribution. 06-RESEARCH.md records the residual and this plan deliberately projected no number rather than reusing RSS_BYTES_PER_INPUT_BYTE as a latency proxy. The residual is stated in the source at the constant.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T17:23:05.815Z",
    "resolved_at": null
  },
  {
    "id": 76,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/scan/scans.ts",
    "line": null,
    "description": "Plan 06-03's files_modified names six files and does not include scans.ts or scans.spec.ts; both were edited. Forced by D-03 itself: replacing the per-item skip read with one bounded per-page read makes scans.ts's isRequestFinished dead, and knip reports a dead export as an error. Deleted rather than left as a second way to ask the same question, and FINISHED_ANALYSIS_STATE exported so the producer binds the derived state instead of re-deriving it. scans.spec.ts lost the runScanProducer describe block, which moved to the new producer.spec.ts with a note at both ends. 06-05 and 06-06 both name scans.ts in their own files_modified and will see the change.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T17:23:18.666Z",
    "resolved_at": null
  },
  {
    "id": 77,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/telemetry.spec.ts",
    "line": null,
    "description": "Two SHIPPED gates were widened because each was narrower than the invariant it enforces (the same shape as 06-01's deviation 1). (a) The projection's payload rule filtered containers by a hand-listed path set, so counters.retro failed a rule about PAYLOADS for being an object; it now judges LEAVES by shape. (b) The AST counters rule asserted literals.length === 1, which refused D-02's nested sub-map while still permitting a genuine second object elsewhere in telemetry.ts; it now asserts every counter-shaped literal is in telemetry.ts AND inside createCounters(), which is strictly stronger. Both failing paths are executed through the gate itself via a new pure scanSource(file, src).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T17:23:18.756Z",
    "resolved_at": null
  },
  {
    "id": 78,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/scan/producer.ts",
    "line": null,
    "description": "The producer DRIVER is still absent, and 06-05 declined it on scope grounds. WINDOWS 74 named index.ts (this plan's files_modified) as the driver's home, but 06-05-PLAN.md's files_modified does NOT include packages/backend/src/scan/producer.ts or packages/backend/test/fixtures/fake-sdk.ts, and both are required: runScanProducer needs sdk.requests.query(), which PluginSdk does not declare and the fake SDK does not implement, so adding it to the type is a fake-sdk.ts edit. Consequence: completeScan has NO production caller (nothing reports the producer's 'completed' stop into the transition), and suspendOnEpochChange's per-page call site does not exist — 06-05 wired D-04 at startScan and the polled getScanStatus instead, which is the only reachable substitute. NO REMAINING PLAN names index.ts together with producer.ts/fake-sdk.ts, so this has no owner. Supersedes entry 74's ownership claim.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T17:52:59.837Z",
    "resolved_at": null
  },
  {
    "id": 79,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/scan/scans.spec.ts",
    "line": null,
    "description": "06-05 task 1 acceptance criterion 'suspendRunningOnInit over a project holding two running rows moves both in one statement and returns 2' is UNSATISFIABLE and was executed as two projects instead. Two running rows in ONE project cannot exist: idx_scans_one_running is a partial UNIQUE index on (project_id) WHERE state = 'running' (migration step v5), which is the plan's own one-at-a-time invariant, and it refuses the second insert including a raw one. The set-based property is asserted over two projects (each sweep returns 1, each is scoped to its own project) and the ERR-02 case in lifecycle.spec.ts asserts no row anywhere is left running.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T17:52:59.926Z",
    "resolved_at": null
  },
  {
    "id": 80,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/scan/scans.ts",
    "line": null,
    "description": "SCAN_LIST_DEFAULT_LIMIT stays at the 200 plan 06-01 shipped, not the 50 06-05-PLAN.md's action text names. The plan itself says the number is an ASSUMPTION and 'the number may move'; what it makes binding is the SHAPE (a stated bound, enforced at read, suspended rows exempt, the truncation said in words), and all four ship. Changing an already-exported, already-asserted constant to a different unmeasured number would have been churn. The constant's JSDoc now says it is an assumption and names plan 06-13 as the owner of the surface that renders the truncation sentence.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T17:53:00.019Z",
    "resolved_at": null
  },
  {
    "id": 81,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/scan/scans.ts",
    "line": null,
    "description": "RESUME_SQL re-bases the row's epoch, which 06-05-PLAN.md's behaviour text does not ask for and its task-2 line ('a resume under the ORIGINAL epoch continues') arguably contradicts. Forced as a Rule 1 bug: projectEpoch() is a MONOTONIC count of applied project changes and never returns to a previous value, so a resume preserving the stale epoch produced a scan that suspended itself again on its first page for ever — D-04's suspension was a one-way door and the must-have 'resumes only on explicit operator action' was unreachable. The plan's line is satisfied under the reading that the discriminator is the PROJECT rather than the number: a resume from the wrong project is refused by project_id scoping (getScan returns undefined -> no-scan), which is UI-SPEC's 'Resume it from that project'.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T17:53:00.108Z",
    "resolved_at": null
  },
  {
    "id": 82,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/scan/scans.spec.ts",
    "line": null,
    "description": "Tasks 1 and 2 carry tdd=\"true\" but workflow.tdd_mode is false in config.json, and 06-05 did NOT ship separate RED-then-GREEN gate commits for task 1: the statements and their spec landed in one feat() commit. Task 2's spec is its own test() commit. Non-vacuity was established by MUTATION instead, and both mutations were executed and recorded: removing LIST_SCANS_SQL's leading (state = 'suspended') DESC term fails exactly the pin case, and emptying DEFERRED_REASONS fails exactly the vocabulary case. The index.ts sweep-ordering assertion was mutation-checked the same way (moving the sweep after the registrations fails it).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T17:53:00.199Z",
    "resolved_at": null
  },
  {
    "id": 83,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/filesystem-prohibition.spec.ts",
    "line": null,
    "description": "Plan 06-07 acceptance criterion 'self-audit returns an empty array' was unsatisfiable (the gate must import node:fs for its own walk); shipped a strictly stronger assertion instead - exactly one violation, and none after removing that import line.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T18:52:36.722Z",
    "resolved_at": null
  },
  {
    "id": 84,
    "kind": "unmet-truth",
    "phase": "06",
    "file": "packages/backend/src/store/sql-discipline.spec.ts",
    "line": 445,
    "description": "THE BELIEF IS THE FINDING, NOT JUST THE FIX. 06-CONTEXT.md:444 records 'The SQL discipline gate is the strongest invariant in the backend'; that is not true of a multi-statement SQL blob. The insert-select rule at sql-discipline.spec.ts:445-450 bans INSERT ... SELECT package-wide with NO allowlist entry, but statementKind() at :126-129 classifies a SQL string by its LEADING KEYWORD, so a blob leading with CREATE skips insertsFromSelect, isMultiRowStatement and isDecomposable entirely. Step v2's CREATE TRIGGER ... BEGIN SELECT RAISE(ABORT, ...); END and step v6's audit rebuild both pass UNOBSERVED today. Widening the gate to split on ';' and classify each statement independently was put to the operator at 06-06's checkpoint and DECLINED FOR THAT PLAN ONLY as unbudgeted scope that may surface violations in step v2's shipped trigger - declined as scope, not as a non-issue. Step v6's JSDoc makes the compliance argument explicitly and says in its own words that a green run on migrations.ts is green by non-observation. OWNER: Phase 11 hardening, unless an earlier Phase 6 plan already touches sql-discipline.spec.ts.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T20:55:42.978Z",
    "resolved_at": null
  },
  {
    "id": 85,
    "kind": "deviation",
    "phase": "06",
    "file": ".planning/REQUIREMENTS.md",
    "line": null,
    "description": "PRE-EXISTING AND NOT 06-06's: outbound-prohibition.spec.ts's byte-compare of the derived residual block in .planning/REQUIREMENTS.md fails at 532491a (06-07's close-out, the last commit to touch either input). The shipped block gained three blank lines the generator does not emit - after 'DECLARATION THE TWO READERS RESOLVE THEIR OWN PATHS FROM:', around the two-file list, and before '1. Each entry below is verified by EXECUTION' - consistent with a markdown reflow applied by requirements.mark-complete during a docs close-out. 06-06 modified neither input (git diff HEAD over both is empty) and left it unfixed under the scope boundary. THE SPEC PRINTS THE EXACT REMEDY: it is machine-owned text and the generated form is authoritative, so the fix is to paste the BEGIN/END EXPECTED span. RISK: every close-out that runs requirements.mark-complete can re-introduce it. OWNER: whoever next runs a docs close-out in Phase 6.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T20:55:43.070Z",
    "resolved_at": null
  },
  {
    "id": 86,
    "kind": "stub",
    "phase": "06",
    "file": "packages/backend/src/index.ts",
    "line": null,
    "description": "ScanStatusPayload.analysed is STILL null after plan 06-06, and window 65 assigned it to this plan. NOT DONE, and not silently: 06-06-PLAN.md's files_modified names neither index.ts's getScanStatus nor the engine contract, and there is no cheap wiring - analyses rows carry no scan attribution, so a per-scan analysed count needs either a NEW scans column (another one-way migration step, a decision this plan had no mandate for) or telemetry.ts's in-memory retro sub-map. Attempting it here would have been a Rule 4 architectural change taken without asking. OWNER: plan 06-09, which already owns delivering scan progress to the frontend on one channel and already took a mid-execution scope addition; 06-12 renders the readout and would inherit it otherwise. Window 65 stays open and this entry names why.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T20:56:03.270Z",
    "resolved_at": null
  },
  {
    "id": 87,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/index.ts",
    "line": null,
    "description": "discardScan gained a fifth parameter (the caller-minted audit event_id), so two files OUTSIDE 06-06-PLAN.md's files_modified changed: index.ts's discardScan registration now passes randomUUID(), and scan/lifecycle.spec.ts's one call site was updated. Rule 3 (blocking): the plan REQUIRES the caller to mint the id - 'The caller mints the event_id UUID, which is what makes a retry a no-op rather than a duplicate' - and a caller-minted id has no meaning if the caller does not mint it. Also outside files_modified: retentionCounts() gained a scans field, because every other table the sweep bounds is counted there and a table the sweep deletes from that no reader can count is a bound nothing can be shown to hold.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T20:56:03.364Z",
    "resolved_at": null
  },
  {
    "id": 88,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/store/migrations.spec.ts",
    "line": null,
    "description": "06-06-PLAN.md's task-3 acceptance criterion says 'retention.spec.ts STILL asserts' AUDIT_OVER_AGE_SQL's absence. It did not: before this plan the absence was asserted only BEHAVIOURALLY (the D-06 contrast case), with no source-text check. The criterion is now true rather than the premise being quietly accepted - retention.spec.ts asserts no  declaration exists AND that the paragraph naming it survives, since the D-06 block names the statement it refuses to have. Separately, migrations.spec.ts's cannot-fail gate was WIDENED beyond the plan: it used to filter to statements beginning with CREATE, so step v6's INSERT/DROP/ALTER would have been skipped entirely by the very gate that justifies batching them.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T20:56:03.457Z",
    "resolved_at": null
  },
  {
    "id": 89,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/engine/src/contract.ts",
    "line": null,
    "description": "06-08 shipped THREE internal marker keys, not the two the plan names. The plan's own behaviour contract requires the observed-loss flag to 'stay recorded across subsequent boots', and two keys (install id, boot count) cannot carry a durable third fact - the database that lost the marker is the same database the flag would have to live in. STORAGE_OBSERVED_LOSS_KEY is the third. The acceptance criterion is satisfied as a SUPERSET: SETTING_KEYS contains the two named marker keys and KNOWN_SETTINGS contains none of the three. Structurally stronger than the plan asked: KnownSetting.key and SettingWriteRequest.key narrow to OperatorSettingKey, so an internal key on the operator-editable surface is a typecheck failure rather than a spec assertion (T-06-41).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T21:28:00.283Z",
    "resolved_at": null
  },
  {
    "id": 90,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/frontend/src/components/settings-contract.ts",
    "line": null,
    "description": "FIELD_COPY's Record was narrowed from SettingKey to OperatorSettingKey inside TASK 1's commit, although settings-contract.ts is a task-2 file. Forced: task 1's own <verify> runs 'pnpm typecheck', and adding members to SETTING_KEYS breaks Record<SettingKey, FieldCopy> exhaustively - the alternative was authoring operator-facing copy for three internal marker keys, which is the exact failure the key split exists to prevent. Only the type and its two doc paragraphs moved in task 1; the five path constants and truncatePathLeft stayed whole and came out in task 2's single commit, so the deletion set was NOT split.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T21:28:00.372Z",
    "resolved_at": null
  },
  {
    "id": 91,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/index.spec.ts",
    "line": null,
    "description": "settingsRows() was narrowed to exclude INTERNAL_SETTING_KEYS. Three shipped assertions counted EVERY row on the settings table to prove a scoping claim about a settings WRITE ('the caller's projectId was discarded'; 'a project-scoped write with no project stored nothing'), and init() now writes O-02's boot marker at the reserved global scope on every boot. Without the filter an unrelated feature decides whether a scoping assertion passes. Filtered over the CLOSED internal list, so a marker key added later is excluded by the vocabulary rather than by a remembered string.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T21:28:00.466Z",
    "resolved_at": null
  },
  {
    "id": 92,
    "kind": "deviation",
    "phase": "06",
    "file": ".planning/REQUIREMENTS.md",
    "line": null,
    "description": "WINDOW 85 RECURRED EXACTLY AS IT PREDICTED, AND IS FIXED AGAIN. 06-08's close-out marked DEPLOY-02 complete; requirements.mark-complete reflowed the derived residual block and re-inserted the SAME three blank lines - after 'DECLARATION THE TWO READERS RESOLVE THEIR OWN PATHS FROM:', around the two-file list, and before '1. Each entry below is verified by EXECUTION'. outbound-prohibition.spec.ts went red on the byte-compare and was restored by deleting the blank lines, never by touching the comparison. The final REQUIREMENTS.md diff for this plan is ONE character: DEPLOY-02's checkbox. The tool is the defect, not the close-out - window 85 stays open and owns it.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T21:28:14.684Z",
    "resolved_at": null
  },
  {
    "id": 93,
    "kind": "lint-warning",
    "phase": "06",
    "file": "package.json",
    "line": null,
    "description": "CORRECTED BY ORCHESTRATOR 2026-08-31: 'pnpm knip' exits 0, NOT 1. Measured on a clean tree: `pnpm knip >/dev/null 2>&1; echo $?` prints 0, and the only finding class is 'Tag hints (22)'. Tag hints are hints and do not fail the gate - phase 05's deferred-items.md recorded the same thing when the count was 8. 06-08's CONCLUSION was still sound (no new finding, verified against a git-stash baseline; the one new finding it introduced was fixed) but its premise was wrong, and the wrong premise is the hazard: it would let a future executor wave through a GENUINE knip failure as pre-existing baseline noise. Treat a non-zero knip exit as a real failure. ORIGINAL CLAIM, PRESERVED: 'PRE-EXISTING AND NOT 06-08's: pnpm knip exits 1 on a clean tree at 7ceff93 with 22 Tag hints' - @internal JSDoc tags knip reports as unused across compat.ts, telemetry.ts, lifecycle.ts, settings.ts, artifacts.ts, observations.ts, admit.ts, scans.ts, producer.ts and audit.ts. 06-08's acceptance criterion 'pnpm knip is clean' was therefore read as 'no NEW knip finding', and was verified by diffing the output against a git-stash baseline: identical. One new finding DID appear mid-plan (BootMarker exported but consumed only in its own file, which ignoreExportsUsedInFile:false rejects) and was fixed by un-exporting it. 06-CONTEXT.md's deferred list already names 'removing the eight now-redundant @internal JSDoc tags' as out of scope.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T21:28:14.775Z",
    "resolved_at": null
  },
  {
    "id": 94,
    "kind": "stub",
    "phase": "06",
    "file": "packages/backend/src/index.ts",
    "line": null,
    "description": "ScanStatusPayload.analysed IS STILL null after plan 06-09, and 06-09 was named its owner by window 86. RE-ASSESSED AND DECLINED AGAIN, WITH THE REASON AND A NAMED OWNER, exactly as 06-06 declined it. THE REASON IS UNCHANGED AND IS STRUCTURAL: analyses rows carry NO scan attribution — the primary key is (project_id, sha256, detector_set_hash) and nothing on the row says which scan offered the work — so an honest per-scan count needs EITHER a new scans.analysed column (another permanent step in a one-way migration ladder, in store/migrations.ts + scan/scans.ts) OR provenance on the queue Entry itself (engine/queue.ts + ingest/consumer.ts + telemetry.ts). 06-09's files_modified names NONE of those five files, in its original form or in the mid-execution scope addition, so wiring it here would have been a Rule 4 architectural change taken without asking. WHAT 06-09 DID DO: it declared the field on the NEW ScanProgressPayload too, as number|null and emitted as null, so the wiring is one edit in one place rather than a shape change on the wire; and contract.spec.ts + producer.spec.ts both assert it is null rather than a lying 0. OWNER: NO PLAN IN 06-10..06-13 NAMES ANY OF THE FIVE FILES — measured against their files_modified — so this needs a Phase 6 gap-closure plan that owns store/migrations.ts and scan/scans.ts, or engine/queue.ts, ingest/consumer.ts and telemetry.ts. Window 86 stays open and this entry names why for the second time.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T22:03:04.619Z",
    "resolved_at": null
  },
  {
    "id": 95,
    "kind": "stub",
    "phase": "06",
    "file": "packages/frontend/src/api/client.ts",
    "line": null,
    "description": "subscribeInvalidation's onScanProgress argument is OPTIONAL, and when it is absent a scan-progress payload is DROPPED at the client. Deliberate and stated on the declaration: App.vue passes client.subscribeInvalidation straight to createCoalescer as its subscribe function, App.vue is owned by plan 06-13, and the alternative was a progress store created inside the client — owned by nobody and stop()ed by nobody, which is research P-04's exact leak. The SAFETY half does not depend on the argument: client.spec.ts asserts a progress payload never reaches the coalescer's summary handler whether or not a progress handler was given. OWNER: plan 06-12, which renders the readout and names api/client.ts in its files_modified; it passes the handler and this closes.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T22:03:04.709Z",
    "resolved_at": null
  },
  {
    "id": 96,
    "kind": "stub",
    "phase": "06",
    "file": "packages/frontend/src/components/ScanLifecycleBadge.vue",
    "line": null,
    "description": "ScanLifecycleBadge.vue has NO production renderer yet — its only consumer is scan-lifecycle-presentation.spec.ts. That is the shape plan 06-09 was scoped to deliver (the vocabulary, its map and its badge; not the surfaces that mount it) and knip exits 0 because the spec is a frontend entry. OWNER: plan 06-13 mounts it in the toolbar scan indicator (D-13) and names App.vue and ScanPanel.vue; 06-12 renders the Scan tab body. If neither mounts it, this is a component nobody renders and the window is the record of that.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T22:03:04.797Z",
    "resolved_at": null
  },
  {
    "id": 97,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/frontend/src/api/client.spec.ts",
    "line": null,
    "description": "PLAN SCOPE DEVIATION, Rule 3 (blocking): plan 06-09's task 3 <files> named api/client.ts but not api/client.spec.ts, and task 2's <files> named no spec file at all. Both were needed to discharge the plan's own acceptance criteria — 'the prefix guard's union has at least nine members and its negative fixture turns it red' has nowhere to live without a spec, and 'a progress payload is routed to the progress store and NEVER reaches the coalescer' is a claim about client.ts that only client.spec.ts can make. Two spec files were therefore added beyond files_modified: packages/frontend/src/components/scan-lifecycle-presentation.spec.ts and cases appended to packages/frontend/src/api/client.spec.ts. No production file outside files_modified was touched.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T22:03:04.886Z",
    "resolved_at": null
  },
  {
    "id": 98,
    "kind": "deviation",
    "phase": "06",
    "file": "packages/backend/src/telemetry.ts",
    "line": null,
    "description": "NO COUNTER WAS ADDED for a scan-progress emit that throws. scan/producer.ts's emitProgress swallows a send failure with no counter and no log, which is a departure from this package's habit (ingest/consumer.ts increments counters.consumerErrors on the same failure). THE REASON, stated on the catch: the event is NOT the authoritative reader — getScanStatus reads the scans row directly and does not depend on the channel at all — so a lost payload costs at most one tick of a readout the operator can refresh, and the next page emits again. Adding counters.retro.emitErrors would have required telemetry.ts, which is not in 06-09's files_modified and is AST-enforced as the single owner of every counter in the package. OWNER: whichever plan next opens telemetry.ts, if the swallow is ever judged to have cost a diagnosis.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T22:03:04.976Z",
    "resolved_at": null
  }
]
````
