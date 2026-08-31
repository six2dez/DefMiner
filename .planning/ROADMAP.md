# Roadmap: DefMiner

## Overview

DefMiner is built from the runtime outward, because the runtime is what decides whether the product is possible. Phase 0 answers twelve questions about Caido's QuickJS that no documentation answers — several can invalidate the performance budget, and one (does a catastrophic regex hang forever?) can invalidate the entire detection approach. Nothing else starts until those numbers exist.

From there the build follows the data: an ingestion pipeline that never stalls the plugin's single event loop, error containment so one poisoned bundle cannot stop everything after it, durable content-addressed storage, then a detection engine whose false-positive rate is measured in CI before the second detector is written. The tool becomes usable at Phase 5, when the workspace turns a database into something an operator reads and triages.

The differentiators come after that foundation exists, because each is only as good as the pipeline underneath: sourcemap reconstruction, then the active path with real crash survivability, then the AST substrate that turns extracted URLs into replayable requests, then chunk enumeration and supply-chain intelligence.

**Twelve phases, 136 v1 requirements, nothing cut.** This roadmap is honest about its size rather than compressing three products into one phase. The earlier 8-phase draft hid roughly three phases of work inside Phases 5 and 6 — an adversarial review by Codex (`gpt-5.6-sol`, xhigh) caught it, along with five dependency inversions where a consumer was scheduled before its producer. Those are corrected here.

## Phases

- [ ] **Phase 0: Runtime Reality Check** - Answer the twelve unknowns that gate every downstream budget
- [ ] **Phase 1: Skeleton, Persistence & Compatibility** - Monorepo, ingestion pipeline, bounded queue, content-addressed SQLite
- [ ] **Phase 2: Error Containment & Observability** - One poisoned bundle cannot stop the pipeline; the plugin can explain itself
- [ ] **Phase 3: Detection Engine & FP Harness** - Two-tier gate, data-driven detectors, measured false-positive rate in CI
- [ ] **Phase 4: Passive Intelligence Core** - Secrets, hosts, JWTs, endpoints — no outbound traffic
- [ ] **Phase 5: Workspace & Operator Workflow** - The tool becomes usable, triageable, and safe to render
- [ ] **Phase 6: Retroactive Scan & Deployment Reality** - Scan existing traffic; work correctly on remote and Docker Caido
- [ ] **Phase 7: Sourcemap Reconstruction** - Recover developer-readable source, safely
- [ ] **Phase 8: Active Retrieval & Crash Survivability** - Go active, and survive the known host-abort bug
- [ ] **Phase 9: AST Substrate & Syntax Intelligence** - Replayable requests and GraphQL, not URL strings
- [ ] **Phase 10: Chunk Graph & Supply Chain** - Enumerate lazy chunks; dependency and library intelligence
- [ ] **Phase 11: Upgrade Path, Hardening & Store Release** - Survive hostile input and upgrades, prove the numbers, ship

## Phase Details

### Phase 0: Runtime Reality Check

**Goal**: Replace every assumption about Caido's QuickJS with a measurement, and write a go/no-go table that fixes the default size, budget, and degradation thresholds.
**Depends on**: Nothing (first phase)
**Requirements**: SPIKE-01 … SPIKE-12, SPIKE-04b
**Success Criteria** (what must be TRUE):

  1. A deliberately catastrophic regex is run inside Caido in a disposable instance, and it is recorded whether the plugin thread ever recovers, whether other plugins keep working, and whether `re2js` is fast enough as an escape hatch on the same corpus
  2. A handler that blocks while 500 responses are proxied produces a recorded count of events actually delivered, settling whether Caido queues, drops, or backpressures
  3. `sdk.requests.send()` is looped in increments of ten to failure on the target Caido build, producing the current cliff number, repeated with `save:false` and with `caido:http` `fetch`
  4. An event matrix records, per surface (Proxy, Replay, Automate, import, workflow, plugin-originated), whether `onInterceptResponse` fires and whether `save:false` or `plugins:false` changes it
  5. Wall-clock is measured inside Caido via `performance.now()`, and memory is measured **for** Caido via external RSS sampling correlated to in-runtime markers, for decode, hash, lexer, and Meriyah parse at 0.5, 1.5, 3, and 8 MB; the recursion-depth probe records where the stack breaks and whether it throws or segfaults
  6. A written go/no-go table states each answer, the threshold it sets, and what changes if it is wrong — emitted as machine-checkable JSON, not prose

**Plans**: 4/4 plans executed

**Instance policy (non-negotiable):** every spike runs against `/Applications/Caido.app/Contents/Resources/bin/caido-cli` (0.57.1) with `--data-path` isolation, asserting the reported version before recording anything. Destructive spikes get a fresh instance and are never run on an instance a later step still needs — the failure mode is not a lost instance, it is a silently wrong measurement on a poisoned runtime.

Plans:

- [x] 00-01-PLAN.md — Shared harness (version-asserted launcher, probe driver, RSS sampler, hash-gated corpus, origin server, results writer, two JSON Schemas, vitest gates) + capability probe (SPIKE-07 regression-assert) + SPIKE-02, and **deploy the SPIKE-10 recorder** so cross-day data starts collecting immediately — *wave 1*
- [x] 00-02-PLAN.md — Budgets and persistence: SPIKE-08 first (an "8 MB ceiling" is meaningless until you know if it is compressed), then SPIKE-06 (fresh instance per size point, crash bisection, Tier-1 build), SPIKE-09, SPIKE-12 — *wave 2*
- [x] 00-03-PLAN.md — Event matrix: SPIKE-05 and SPIKE-11 share one apparatus; SPIKE-03 runs last because it wedges the thread — *wave 2*
- [x] 00-04-PLAN.md — Destructive spikes on fresh instances: SPIKE-01, then SPIKE-04 across **three separate instances** (one per variant, because #2211 leaks cumulatively), plus SPIKE-04b the plugin-toggle-resets-the-leak test; read the SPIKE-10 recorder; emit `go-no-go.json` and the rendered `00-GO-NO-GO.md` — *wave 3*

### Phase 1: Skeleton, Persistence & Compatibility

**Goal**: A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Depends on**: Phase 0
**Requirements**: CORE-01 … CORE-11, STORE-01 … STORE-07, COMPAT-01, COMPAT-02, ENC-01, DIST-05, DIST-06
**Success Criteria** (what must be TRUE):

  1. The `onInterceptResponse` handler is non-async, gates cheaply, enqueues, and returns — analysis never happens inline
  2. The work queue is bounded and its overflow count is visible; it can never grow without limit the way JS-Analyzer's does
  3. Browsing a 200-chunk SPA leaves the plugin's own UI and RPC responsive throughout, with the maximum observed synchronous slice recorded and under the Phase 0 threshold
  4. Artifacts persist across a Caido restart, are keyed by `project_id`, and identical content served twice is stored and hashed once
  5. Offsets and hashes derive from `toRaw()` bytes; a non-UTF-8 fixture round-trips without corruption
  6. A CI gate fails the build if the backend bundle imports any module specifier outside the allowlist Phase 0 proved loadable inside Caido — *corrected during planning from "imports any Node built-in". The original wording fails a correct plugin: `caido-dev` externalises every Node built-in, Caido's QuickJS resolves ten of them (`crypto`, `fs`, `path`, `os`, `buffer`, `string_decoder`, `url`, `events`, `sqlite`, `caido:http`) and hard-fails on the rest, and the native `crypto` hash is mandatory on performance grounds (0.34 ms/MB against 187 ms/MB in JS). The allowlist form is strictly stronger — the original would not have caught `zlib`, `util`, `stream` or `caido:crypto` at all. Derivation and gate in plan 01-02.*
  7. Running against a Caido build below the declared minimum produces a clear message, not an obscure failure

**Plans**: 6/6 executed in 6 waves (sequential — 01-03 consumes every store module 01-04 builds, so they are serialised rather than parallel), plus 3 gap-closure plans in 3 waves from the 2026-08-21 UAT, plus 5 further gap-closure plans in 5 waves from the 2026-08-21T13:45 re-verification, plus 3 further gap-closure plans in 3 waves from the 2026-08-21T17:40 re-verification (CR-07), plus 5 further gap-closure plans in 5 waves from the 2026-08-22T12:40 re-verification (CR-08 and WR-22 … WR-26), plus 6 further gap-closure plans in 6 waves from the 2026-08-24 re-verification (CR-09, CR-10, WR-27 … WR-31 and IN-23 … IN-26), the last two of which change the KIND of artifact a residual is — derived from the gate's own code and CI-checked — rather than correcting another instance of it, plus 4 further gap-closure plans in 4 waves from the 2026-08-24T16:40 re-verification (CR-11, CR-12, CR-13, WR-32 … WR-37 and IN-27 … IN-30), the first of which binds each registry clause to the BRANCHES it names so a branch removed from the walk turns its own row red — plus 3 further gap-closure plans in 3 waves from the 2026-08-24 re-verification — round 7, which does NOT close the remaining blindnesses but records the operator's re-scope of CORE-11's acceptance bar: the old bar (red on every spelling of every enumerated clause) is unreachable over an open language, so the reachable one — DERIVED, DRIFT-DETECTABLE, SOLE BOUND — replaces it by the STORE-01 -> STORE-08 route, and the gate's remaining reach becomes named disclosed residuals rather than open findings — plus 3 further gap-closure plans in 3 waves from the 2026-08-26 re-verification — round 8, verification pass 8, which adjudicates CORE-11 down to four bounded findings on criterion (3) THE SOLE BOUND alone: CR-17 (the exemption map is unanchored — a fabricated bound planted 9,001 lines from the table cell its exemption names passed 432 of 432), CR-18 (the ledger row describes its own checkbox and the description is stale), CR-19 (a live blocker names six shapes that all report and a registry row the suite asserts must not exist) and WR-48 (`closingBracketAfter` over-reaches exclusion three by 117 lines onto a different construct, erring safe). Criteria (1) DERIVED and (2) DRIFT-DETECTABLE were found discharged with no evidence against either, and the box stays `[ ]` until verification pass 9 — plus 3 further gap-closure plans in 3 waves from the 2026-08-26T14:40 re-verification — round 9, verification pass 9, which for the first time SPLITS criterion (3): its DOCUMENT leg is CLOSED (CR-18, CR-19 and WR-48 all survived the verifier's own re-measurement) and only its MECHANISM leg remains, narrowed from 29 of 29 relocatable entries to 7. Six items, all in one file: CR-20 (`constructAnchorFor` resolves a masked 64-character LINE rather than a site, so an occurrence that is its own construct header anchors to itself and an anchor token produced by ten lines names none of them — two shipped occurrences driven through the hole at 434/434 green, and limit (5) states the opposite of what executes), CR-21 (the `!NO-PRECEDING-CONSTRUCT!` sentinel scores 20 on `nameableRemainder` and defeats the null-anchor case added in the same commit to forbid it, and four greps find no assertion observing it), WR-54+WR-50 (WR-48's corrected recogniser is pinned by NOTHING — the verifier reverted it and the suite stayed green — and the `proof` token, the band and the clause-count equality each provably cannot catch an over-walk), WR-51 (the counter-probe is satisfied by any constant function), WR-52 (a real fixture whose coverage sentence overclaims, the reviewer's stronger reading refuted by execution) and WINDOWS 41 (round 8's own disclosure, repaired now that the gate file is open). An AST- or frame-derived rebuild was considered and REJECTED by the operator: the fix is the verifier's two small changes plus a disclosure restatement, every new pin watched failing, and the box left at `[ ]` for verification pass 10 — every gap-closure plan fully serialised, because each one deliberately mutates the shared working tree to prove its gate can fail while each asserts whole-suite green — plus 2 further gap-closure plans in 2 waves from the 2026-08-26T17:50 re-verification — round 10, verification pass 10, which is the FIRST round of this phase that changes the CLAIM rather than the mechanism. Pass 10's judgement is that the line-text approach cannot be made to identify a site: round 9 drove self-anchoring and token ambiguity to 0 of 29 each and the residual did not shrink, it MOVED — from the key format to recogniser density over this file's prose, where one header shadows 1,155 raw lines because nothing across that stretch is accepted by any of the five recognisers. Two exits were offered and THE OPERATOR TOOK EXIT 2: stop claiming a site, because nothing in the re-scoped bar — DERIVED, DRIFT-DETECTABLE, SOLE BOUND — ever required one. So round 10 is four bounded edits, all green on arrival, that convert an overclaim into a named, measured, drift-detectable residual: CR-22 both parts (the residual restated as the anchor's shadow and that shadow PINNED), CR-23 (the two `.from` tautologies made to assert against full-line locators proved unique, each watched failing under the decoy that amputated 104 lines from the scanned surface at 439/439 green), WR-55 (a sentinel case that executes over one line and says it bounds a surface), and WR-58 + WR-60 (an unguarded key split and one measurement published at two values). Explicitly NOT taken: exit 1's AST/compiler-API containment, and any fourth narrowing of the recognisers, the scan bounds or the key format — pass 10 states that a fourth narrowing round is what it would expect to produce an eleventh instance of the signature defect. The box stays `[ ]` and pass 11 owns it — plus 2 further gap-closure plans in 2 waves from the 2026-08-26T22:30 re-verification — round 11, verification pass 11, THE DELETION ROUND. Pass 11 reproduced all five of the reviewer's blockers on the real tree and found that every one of them is a defect in prose ROUND 10 ITSELF WROTE, with the blocker rate across rounds 8, 9 and 10 running 1 -> 2 -> 5 and not decaying. Its convergence finding is structural rather than about discipline: under this file's own standard a sentence stating a measured reach IS an assertable claim held to the same bar as the code, so every corrective sentence is new attack surface and THE CORRECTIVE ACT IS THE GENERATIVE ACT. The residue is judged bounded and closable in one more round ONLY under a deletion-only discipline, and the operator has taken it. So CR-24 (a present-tense locator the file's own builder falsifies — a sweep of all 25 ruled tables finds ZERO non-trivial duplicate headers), CR-25 (one bound published at two values, 1,065 lines apart, in the round that closed WR-60 for exactly that shape), CR-27 (three shipped failure messages asserting a containment the docblock disowns BY NAME, under a bracket claiming an enumeration it did not execute) and WR-61 (two sweep scopes stale in the commit that wrote them) all close by REMOVING BYTES, in one commit gated on adding no word it did not remove — a check itself watched RED against one planted word. The two code fixes are CR-28 (the CR-23 fixture declares its own opener and its own finders over a frozen literal and reads NOTHING from the case it claims to guard; pass 11 restored CR-23's tautology and its 104-line surface amputation straight through it in two steps at 441/441 GREEN) and CR-26 (the 574-line shadow the file names in five prose sites and one shipped failure message FELL TO 284 under a two-line edit at full-suite green, because the pin asserts the MAXIMUM and nothing pins the IDENTITY). Explicitly NOT taken, and pass 11 did not report their absence as a defect: any AST, parser, compiler-API or frame-identity work, any hand-rolled containment, and any further narrowing of the recognisers, the scan bounds or the key format. The box stays `[ ]`, `requirements mark-complete` stays unrun, and pass 12 owns it. PLUS 2 GAP-CLOSURE PLANS IN 2 WAVES FROM VERIFICATION PASS 13 (2026-08-27), round 12: 01-46 takes CR-30 and CR-31 by CLASS rather than by instance — the set of byte-compared surfaces becomes a constant rendered into the generated residual and byte-compared in both surfaces, a census makes every `.planning/` mention in the gate header a listed entry, CR-30's two machine-check paragraphs are deleted, and the pin's hand-written span arithmetic and locator are emitted from its own computation; 01-47 takes CR-32 across STATE.md, ROADMAP.md and 01-SECURITY.md by the discipline each surface calls for. The box stays `[ ]` and verification pass 14 owns the flip — PLUS 3 GAP-CLOSURE PLANS IN 3 WAVES FROM VERIFICATION PASS 14 (2026-08-27), round 13, the round that takes the LAST open truth: pass 14 discharges SIX of criterion (3)'s seven surfaces — including `.planning/STATE.md`, whose append-only question is finally ANSWERED rather than deferred with a four-part discharge condition written down so a later round applies it instead of re-litigating it — and leaves ONE blocker, CR-33, which is not an instance but a CLASS with two live members: hand-written line RANGES in the gate file's prose below the registry, each TRUE WHEN WRITTEN and each silently drifted, describing quantities the suite computes live. So 01-48 deletes both live figures rather than correcting them (a corrected range is still a hand-written one, and the file says so itself), renders the header extent and the registry declaration's endpoints from the resolvers the suite already runs, and closes the class with a census in which every surviving range is DELETED, DERIVED or DECLARED with a reason — the six accurate DATED HISTORY narratives preserved, not destroyed, because a gate demanding zero would order the executor to falsify the record. 01-49 widens the `.planning/` mention census below the derived-block sentinel, the region that carried BOTH blockers and until now the region with the least machinery over it, and turns the "censused region" pattern from three resemblances into one asserted contract. 01-50 re-measures criterion (3) across all seven surfaces BY EXECUTION in one session — inheriting none of pass 14's six discharges, because three of them read from a file this round edits twice — and flips CORE-11's ledger row and `CORE11_BOX_EXPECTED` in ONE commit if and only if all seven discharge, with both locators resolved by CONTENT because that constant has moved on every single pass. Every census in the round uses `grep -rE` with a stated positive control before any zero, because `git grep -E` silently drops `\b` on this platform and returns a false zero that fails closed-looking (50 plans total)

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — **Tracer**: one proxied JS response hashed and durably remembered, end-to-end on a live Caido, plus the Phase 0 threshold contract and the measured answers to the two open runtime questions — *wave 1*

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Two-package pnpm workspace, exact pins and DIST-06 overrides, the DIST-05 allowlist gate and the SDK-free engine boundary — *wave 2*

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Persistence: `analyses` and `settings` behind a forward-only migration ladder, content-addressed reads, corpus-version cache, retention, static SQL-discipline gate — *wave 3*

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-03-PLAN.md — Ingestion: full admission filter with a named reason per rejection, bounded queue, chunker, temporal yield, wall-clock deadlines, byte-exact encoding, and the consumer that wires every store call site — *wave 4*

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-05-PLAN.md — Lifecycle: project-switch cancellation including the null branch, counters, and an EXTERNAL max-slice and RPC-responsiveness measurement under a 200-chunk load — *wave 5*

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 01-06-PLAN.md — Compatibility guard and a three-leg SDK smoke test against 0.57.1, 0.58.0 and the below-minimum 0.55.3 — *wave 6*

**Wave 7** *(gap closure — UAT 2026-08-21; blocked on Wave 6)*

- [x] 01-07-PLAN.md — **Gap 1**: `observations.url` redacts query-string values at the write path; every error-shaped render in the store layer goes through `describeError`, including the line that writes `analyses.error`; plan 01-01's `must_have` truth #2 amended to match — *wave 7*

**Wave 8** *(blocked on 01-07 — needs its redactor)*

- [x] 01-08-PLAN.md — **Gap 1, one-way half**: measure the pre-policy row population read-only, then a `blocking-human` decision on whether those rows are redacted in place, purged, or left to age out — *wave 8*

**Wave 9** *(blocked on 01-08 — sequencing, not code: all three gap plans mutate the shared tree to prove their gates can fail, and each asserts whole-suite green)*

- [x] 01-09-PLAN.md — **Gap 2**: CORE-01's no-outbound-traffic prohibition gets a wired AST gate over `packages/backend/src`, mutation-proven against real source — *wave 9*

**Wave 10** *(gap closure round 2 — re-verification 2026-08-21T13:45 found both UAT gaps only PARTIALLY closed; blocked on Wave 9)*

- [x] 01-10-PLAN.md — **Gap 1a**: an operator decision on the bare (`=`-less) query segment, implemented at the write path with one falsifying case per credential format — every common format is shorter than the 64-character bound that was supposed to catch them — plus CORE-11 split out of CORE-01 here, in wave 10, so the plan that owns the outbound gate can declare the requirement it enforces in its own frontmatter — *wave 10*

**Wave 11** *(blocked on 01-10 — shares `observations.ts`, and the whole round is serialised)*

- [x] 01-11-PLAN.md — **Gap 1b**: URL userinfo and `;` path-parameter values redacted by the same policy; the plugin-database path stops crossing the `getStatus` RPC; the no-pattern gate re-anchored on the AST — *wave 11*

**Wave 12** *(blocked on 01-11 — sequencing, not code: each round-2 plan mutates the shared tree to prove its gate can fail, and each asserts whole-suite green)*

- [x] 01-12-PLAN.md — **Gap 2a**: the CORE-11 gate (CORE-01's until wave 10) widened to the 14 shapes a 22-shape probe found it missing — `globalThis.fetch`, the destructured receiver, `.call`/`.apply`, computed keys — and extended to `packages/engine/src`, which ships in the bundle and was walked by no gate at all — *wave 12*

**Wave 13** *(blocked on 01-12 — shares `outbound-prohibition.spec.ts`)*

- [x] 01-13-PLAN.md — **Gap 2b**: the STORE-07 redaction gate made to follow the binding rather than match it, so `e.message` and every cast form fail, with an owner named for every bare render it does not cover — *wave 13*

**Wave 14** *(blocked on 01-13 — needs every redaction change landed before the live tier can assert them)*

- [x] 01-14-PLAN.md — **Live proof**: the tracer widened to every grammar this phase now redacts, reading the plugin database read-only, with one passing and one deliberately failing run committed against a real Caido — *wave 14*

**Wave 15** *(gap closure round 3 — re-verification 2026-08-21T17:40 found UAT gap 1 still open through a different door; blocked on Wave 14)*

- [x] 01-15-PLAN.md — **CR-07, the blocker**: a segment that is entirely a credential and contains an `=` — every standard-base64-padded token — is parsed as `name=value` and the credential is kept. Fixed in the shared per-segment helper so both delimiters close together, with the adversarial set derived from the policy rather than the branch, absence asserted on the padding-stripped core, and the three artifacts that assert this cannot happen corrected — *wave 15*

**Wave 16** *(blocked on 01-15 — shares `observations.spec.ts` and `schema.spec.ts`, and the whole round is serialised)*

- [x] 01-16-PLAN.md — **The gate widenings**: the CORE-11 gate reports an unreadable RECEIVER instead of dropping it and covers `navigator.sendBeacon` and dynamic code construction; the STORE-07 gate reaches `+=`, `.concat` and push-then-join; `describeError` stops being able to throw on the path it exists to contain; the `analyses.error` disclosure names the residual that exists; the pattern gate's claim is brought level with its enforcement — *wave 16*

**Wave 17** *(blocked on 01-16 — the live tier needs every redaction and gate change landed and the tree quiet, which is the lesson 01-14 recorded)*

- [x] 01-17-PLAN.md — **Live proof and the missing gate**: two `openssl rand -base64` dyes carry a padded credential through a real Caido into the real database file, asserted absent under the padding-stripped spelling that would have made it recoverable, with one passing and one deliberately failing run committed — plus the no-version-literal gate the tracer's header has claimed since round 2 and which nothing in the repository performed — *wave 17*

**Wave 18** *(gap closure round 4 — re-verification 2026-08-22T12:40 found UAT gap 2 REOPENED as CR-08: truth 8 moved up and truth 9 moved down, in the file fixed for this shape one round earlier; blocked on Wave 17)*

- [x] 01-18-PLAN.md — **CR-08, the blocker**: the CORE-11 gate reads a receiver key INLINE only, so one `const` defeats the WR-19 assembled-key rule and `sdk[b ? "requests" : "net"]` — two literals naming outbound receivers, nothing hidden from the walk — is reported by nothing and disclosed by nothing. `assembledNames` collected beside `constStrings`, a conditional key read on both branches, the eight executed shapes as failing fixtures each tied to the mechanism that resolves it, and the five disclosures that disagree with each other reconciled to one bound — *wave 18*

**Wave 19** *(blocked on 01-18 — shares `outbound-prohibition.spec.ts`, and CORE-11's checkbox cannot flip until the last enumerated shape is enforced)*

- [x] 01-19-PLAN.md — **The last three CORE-11 blindnesses, and the checkbox**: `const e = eval; e(s)` reports clean in the rule whose whole argument is that a string this gate cannot read into makes a passing gate meaningless (WR-23); `isProvablyNumeric` claims it proves rather than assumes while deciding by member name and failing open (WR-26); `globalThis` has no one-hop alias while `navigator` does (IN-20). Then CORE-11 marked complete against an executed gate, its own enumeration discharged item by item — *wave 19*

**Wave 20** *(blocked on 01-19 — the tree must be quiet for a deliberate mutation, and the whole round is serialised)*

- [x] 01-20-PLAN.md — **WR-22**: the CR-07 padding branch cost `normaliseObservedUrl` its idempotence at the `URL_MAX` cut, found independently at two different cut points; the truncation moved to a segment boundary, the invariant sentence scoped to what it is true of, the idempotence case rewritten to SEARCH for the adversarial cut instead of hard-coding one, and the IN-18 pin — which defers on the strength of the invariant this branch already broke — resolved by execution — *wave 20*

**Wave 21** *(blocked on 01-20 — sequencing, not code: each plan mutates the shared tree to prove its gate can fail while asserting whole-suite green)*

- [x] 01-21-PLAN.md — **WR-24 + IN-22**: the STORE-07 redaction gate is blind to the OPERATOR class of render — `? :`, `??` and `||` — which is the standard way to narrow a caught `unknown` under the setting this repo enables; `derivesFrom` widened, every shape fixture-proven with its `describeError` twin quiet, and the render-form residual re-derived a third time from the code's branches rather than from the previous paragraph — *wave 21*

**Wave 22** *(blocked on 01-21 — this plan breaks its own predicate five ways in turn and plants a literal into a committed script, so it needs the tree quiet)*

- [x] 01-22-PLAN.md — **WR-25 + IN-21, the two gates whose failing path has never run**: the WR-21 gate built last round has no executed failing path — the tracer carries no three-component version literal, so the filter's true branch never runs and five plausible breaks leave it green forever. The predicate lifted out as a pure export, executed against the real file's bytes with a literal planted in, and proven detectable one break at a time; plus `padded_segments_reached`, an `all()` over an empty generator that would record REACHED having measured nothing — *wave 22*

**Wave 23** *(gap closure round 5 — re-verification 2026-08-24 kept UAT gap 2 open for its THIRD distinct cause and found the ledger moving the wrong way: CORE-11's box was checked against a disclosure falsified in three sentences; blocked on Wave 22)*

- [x] 01-23-PLAN.md — **CR-09, the blocker**: `collect(sf)` completes before `visit(sf)`, so the READ-position bound round 4 wrote into five artifacts to replace the last false one is itself false — seven executed shapes report where it says they are silent, and the fixture pinning it is green because its BINDINGS are inverted, not its read. The measured binding-declaration-order bound written in its place, the fixture split so each half is sensitive to the variable its title names, and the falsified clause marked-but-preserved in `REQUIREMENTS.md` — *wave 23*

**Wave 24** *(blocked on 01-23 — shares `outbound-prohibition.spec.ts`, and narrowing a false sentence produces a narrower false sentence)*

- [x] 01-24-PLAN.md — **CR-10, the blocker**: `keyReceiver` consults `literalOf` first and `constStrings` is written only at the declaration branch, so a stale harmless literal shadows every later rebinding — `let k = "harmless"; k = "requests"; sdk[k].send(req)` is silent while `let k; k = "requests"` reports. The collectors made to describe a name's bindings across the file, the compound assignment read as the assembly it is, the MIRROR direction measured rather than left for next round, and boundary 2's approximation claim restated per mechanism — *wave 24*

**Wave 25** *(blocked on 01-24 — recurses through the key resolver wave 24 rewrote)*

- [x] 01-25-PLAN.md — **WR-27**: a conditional receiver in CALL position is silent — `(b ? sdk.requests : sdk.net).send(req)` and its `??` / `||` twins — while the conditional KEY and conditional INITIALIZER faces of the same operator were both added in round 4 and both report, and no residual list names it. The descent hoisted into `receiverKind` and `keyReceiver`, the three copies collapsed to one, and `&&` settled by measurement — *wave 25*

**Wave 26** *(blocked on 01-25 — the only wave in the round that reaches outside the outbound gate, placed last of the four so a red in a store file is never ambiguous with a red in the gate)*

- [x] 01-26-PLAN.md — **WR-28 … WR-31 and IN-23 … IN-26**: the head-side `;` residual asserted STABLE in three files is a fixed point at the one offset the fixture picked and not at 11 of its 71 neighbours; the no-separator class is scoped to a single-segment query when the branch condition is about where the cut lands; three `ONE HOP` docblocks assert a bound plan 01-19 measured false and one is contradicted by a passing test 1,800 lines below it; a residual paragraph now contradicts itself two lines after an insertion; plus the destructured key binding, the two overstated STORE-07 items and the two pins docblocks — *wave 26*

**Wave 27** *(blocked on 01-26 — a registry written against an older gate would be born stale, which is the failure this plan exists to prevent)*

- [x] 01-27-PLAN.md — **THE STRUCTURAL PLAN**: the residual stops being authored. A resolver registry bound to the walk by executed probes, a pure `deriveResidual` that renders the text from it, sentinel-delimited blocks in the gate header and in `REQUIREMENTS.md` byte-checked by the suite, and a coverage guard over BOTH resolver populations — matching collectors and functions declared inside the audit function, each required to be a registry row or a named exemption, since `receiverKind` is where WR-27 lived — with SIX separately executed mutation proofs covering prose-without-code in both surfaces, code-without-prose, registry-without-regeneration, an unregistered collector and an unregistered unlisted resolver function, a named `planning ledger absent` error for the suite's first dependency on `.planning/`, and the limits of a derived residual stated inside the generated text — *wave 27*

**Wave 28** *(blocked on 01-27 — the residual it flips against does not exist until then)*

- [x] 01-28-PLAN.md — **CORE-11's flip, and only then**: the box has been reverted twice, at `e7cc4b6` and `faca607`, both times because its Complete status rested on a disclosure that turned out false. Discharged item by item as a table of executed results — one row per surface the requirement's own sentence names plus one per shape this round closed, each with its rule identifier, its fixture title and the summary where that fixture was observed failing — flipped against the DERIVED residual verified current before the box is touched, with a state-agnostic verify so the honest `[ ]` outcome cannot fail its own gate — *wave 28*

**Wave 29** *(gap closure round 6 — re-verification 2026-08-24T16:40 held the score at 8/9 for a fourth consecutive round, with the failing truth failing for a fourth disjoint set of causes; blocked on 01-28)*

- [x] 01-29-PLAN.md — **THE STRUCTURAL PLAN OF ROUND 6**: round 5 bound the shipped TEXT to the REGISTRY by bytes and each row's PROBE to the walk by execution, and bound a row's `clause` to nothing — the verifier deleted the `PlusEqualsToken` assembly branch, which `assembledNames`' clause names in so many words, and the whole derived block stayed at 52 passed / 0 failed (WR-32). `ResolverRecord` gains a `branches` list with one executed probe per clause-named branch, a declared `BRANCH_VOCABULARY` making "this clause names that branch" a string test with a guard that fails when a named branch has no probe, and a `QUANTIFIED_CLAUSES` list requiring every unbounded universal to carry a measured bound — the shape of both CR-11 and CR-13. The verifier's own mutation is reproduced as an executed proof that turns the ROW red, the false preamble point 1 is corrected, and what clause-to-branch binding still cannot prove is stated inside the generated text. Five separately executed mutation proofs; no rule widened — *wave 29*

**Wave 30** *(blocked on 01-29 — the widening is proven at branch granularity against the mechanism wave 29 builds)*

- [x] 01-30-PLAN.md — **CR-13, the sharpest**: `const k = b ? "requests" : "net"; sdk[k].send(req)` reports nothing, one hop, while all four twins of the identical conditional report. Closed at the seam by an operator-literal descent built on the existing `operatorOperands` — one definition, not a fourth copy — wired into both the declaration and the assignment branch in the same plan, with the two registry clauses it falsifies word for word (`constStrings`, `literalsOf`) rewritten from the code rather than from the paragraph, every measured silence re-executed against the widened walk, three separately executed mutation proofs and a real-tree zero after each widening — *wave 30*

**Wave 31** *(blocked on 01-30 — the assembled-key shapes run through wave 30's descent)*

- [x] 01-31-PLAN.md — **CR-12**: nine shapes silent across `??=`, `||=` and `&&=` with all four `=`/`+=` controls firing. The mechanism is one token test — `collect`'s alias-growing branch matches a single operator while the numeric-poisoning arm eleven lines below reads `ASSIGNMENT_OPERATORS` and names `x ||= sdk.requests` in its own comment. The widening half is given a named operator set so both halves of the statement read declared sets, eight falsified clauses are rewritten from their branches with a probe per named operator, the numeric interaction is executed rather than assumed, and the inline decision is named as population-3 residue with WR-33's exemption rewrite left to wave 32 — *wave 31*

**Wave 32** *(blocked on 01-31 — four of the discharge table's eight rows are addressed by waves 30 and 31)*

- [x] 01-32-PLAN.md — **CR-11 split, WR-33…WR-37, IN-27…IN-30, and CORE-11's discharge**: the SAFE half (six wrapper spellings report where the row claims silence in every spelling) corrected as an overreach with wave 28's unprompted disclosure credited; the UNSAFE half nobody named (`const g = globalThis ?? self; g.fetch(url)` → `[]`, a plausible defensive idiom the `initializerReceiver` row tells a reader is covered) closed by routing the five global resolvers through one shared descent. Plus WR-37's nested destructure closed as a composition with its five siblings carried as measured silences, WR-33's two exemption reasons rewritten at the two weights the verifier assigned, WR-34's box pin (`CORE11_BOX_EXPECTED`, mutation-proved), WR-35's two head-side mechanisms restored in three files, WR-36's IN-25 correction scoped to what it measured. CORE-11's discharge is re-executed row by row with the flip gated on every enumerated surface discharging — `[ ]` with a named blocking row is an equally correct outcome — *wave 32*

**Wave 33** *(gap closure — round 7; blocked on 01-32)*

- [x] 01-33-PLAN.md — **CR-14 and WR-38, closed by DELETING the surface rather than instrumenting it**: every guard the mechanism built scans `RESOLVER_REGISTRY[].clause` and nothing else, so the ~3,464 hand-written lines ahead of the registry carry the declared phrasings 20 times raising zero obligations — the header still says an operator around a global receiver "IS STILL SILENT in every spelling", names six exemplars that all now report, and points at a fixture titled `CLOSED (CR-11)`. Widening the scan would convert 20 stale sentences into 20 new obligations, so the header instead loses every bound of its own and points at the derived block, under the same pointer-not-a-bound rule the file already applies to `STATE.md` and `WINDOWS.md`, with a whole-file guard keeping the phrasings from reappearing outside the registry — *wave 33*

**Wave 34** *(blocked on 01-33)*

- [x] 01-34-PLAN.md — **CR-15, CR-16 and WR-39…WR-43 as DISCLOSED residuals, not closures**: a bare global in receiver position is silent family-wide (`const f = fetch; f.call(null, url)` → `[]` while `f(url)` reports, the same identified alias one position over) and an unreadable member on an identified `navigator` receiver is dropped — both the gate's *reach* rather than its text, which no scan and no bar ever ends over an open language. Each becomes a `kind: "measured-silence"` row with an executed probe and its reporting twin as counter-probe, carried into the derived span that today says nothing about any of them; cheap, obviously-correct, measured widening is allowed on top but framed as a bonus, never as the close. Plus WR-39 re-derived from a varied-length sweep rather than the ten-character `jsessionid`/`<redacted>` coincidence — *wave 34*

**Wave 35** *(blocked on 01-34)*

- [x] 01-35-PLAN.md — **the operator's re-scope, then CORE-11's discharge against the reachable bar**: six rounds each closed ~2 blindnesses and each surfaced ~2 more, because the old bar — the gate goes red on every spelling of every enumerated clause — is unreachable over an open language, not merely unmet. The operator re-scoped CORE-11's `[x]` to mean the residual is DERIVED, DRIFT-DETECTABLE, and THE SOLE BOUND stated on every surface a reader touches; the decision is written into `REQUIREMENTS.md` dated and attributed by the STORE-01 → STORE-08 route, and the discharge is re-executed as one row per criterion with a mutation proving each evidence live rather than cited. The re-scope narrows the CHECKBOX's meaning, not the PROHIBITION's, and `[ ]` stays a reachable honest outcome — *wave 35*

**Wave 36** *(blocked on 01-35)*

- [x] 01-36-PLAN.md — **the floor restored, then CR-17's exemption map anchored to its constructs**: HEAD was measured RED at planning time while the handoff described it as green — commit `4105fd0` reverted CORE-11's checkbox correctly but left `CORE11_BOX_EXPECTED` pinning `[x]` and inserted blank lines inside the machine-owned span, failing two cases of 1372. Task 1 restores the span from its generator, brings the pin into agreement with the adjudicated row WITHOUT flipping the box, and names criterion (3) as the blocking criterion in the ledger. Task 2 closes CR-17: `HEADER_QUANTIFIER_EXEMPTIONS` held the bare key `"{q2} :: q2"`, fully masked and anchored to no construct, and the three discharge checks matched flat strings without consulting `f.line` — a fabricated bound planted 9,001 lines from the table cell its exemption named passed 432 of 432. The key now carries a masked CONSTRUCT ANCHOR, exactly as the three exclusions one layer up each carry a `proof` token, with a fully-masked anchor forbidden by a second independent case — *wave 36*

**Wave 37** *(blocked on 01-36)*

- [x] 01-37-PLAN.md — **CR-17's failing-path fixture, then WR-48 as a measurement**: an anchoring nobody has watched failing is the same artifact as a claimed check nobody performs, so the relocation becomes a permanent fixture over synthetic lines WITH its counter-probe — the pre-anchoring key builder shown missing the identical relocation — plus the real swap executed once and watched going red. Then WR-48: `closingBracketAfter` string-matches `"]);"` so it walks past `] as readonly ResolverRecord[]);` and lands 117 lines later on `BRANCH_VOCABULARY`'s close, making exclusion three's `name` and `why` both false of a different construct while the band misses it and the `inRange == inClauses` equality makes it err safe. Narrowing it returns those lines to the guarded surface; what that raises is MEASURED and no expected count is named anywhere in the plan MEASURED, 2026-08-26: exclusion three narrowed to `4135..5767` and the 117 restored lines raised ZERO new obligations, so the entry's unnamed count is recorded rather than left open — *wave 37*

**Wave 38** *(blocked on 01-37)*

- [x] 01-38-PLAN.md — **CR-18 and CR-19, then criterion (3)(d)'s cross-surface check re-run as a measurement**: check (3)(d) reported zero unmarked standing statements across four reader surfaces where the count was two, and commit `4105fd0` landed seven minutes after that report and falsified three more. CORE-11's ledger row is reduced to the prohibition plus a POINTER — a row that carries no statement of the box's state cannot carry a stale one — with every removed passage relocated byte-identical into a dated history block rather than deleted. `.planning/STATE.md`'s live blocker naming six shapes that "report NOTHING" is corrected against six probes RE-EXECUTED through `auditSource` in session, and the row it named is one the suite asserts must stay gone. The four-surface enumeration is then re-run as a pasted grep whose verdict is stated at the reach of the grep that produced it, with both classes of unreached surface named. No task flips the box: that is verification pass 9's call EXECUTED, 2026-08-26, AND THE MEASUREMENT EXCEEDED THIS DESCRIPTION: the byte-level enumeration found TWENTY-FOUR lines across the two planning documents — nine in the ledger carrying eleven passages, fifteen in `.planning/STATE.md` — matching the plan's floor exactly, plus TWO the ledger phrase set cannot see (`:106` and `:108`), recorded as findings. Six of six probes report. The re-run of check (3)(d) did NOT come back clean: it found TWO surviving unmarked statements of the box's state and a stale flip ownership in the gate file's own hand-written header, one of them four lines above wave 33's note asserting the box is stated in exactly two places. The gate file is closed after plan 01-37, so that finding is RECORDED and left open for verification pass 9 rather than repaired here — *wave 38*

**Wave 39** *(blocked on 01-38)*

- [x] 01-39-PLAN.md — **CR-20: make the exemption anchor identify a SITE**: `constructAnchorFor` resolves a masked LINE OF TEXT truncated to 64 characters, so an occurrence that IS its own construct header — an `it(` title, or a docblock's first content line — anchors to itself and carries no positional information, while an anchor token produced by ten `it.each([` lines or three identically-headed tables names none of them. Seven of 29 entries relocate invisibly and the verifier drove two shipped occurrences through the hole at 434 of 434 green. The operator REJECTED an AST- or frame-derived rebuild for this round: the plan is the verifier's two changes, both written by the file's own reviewer. Task 1 opens the backward scan STRICTLY ABOVE the occurrence and then MEASURES whether that was sufficient across all 29 regenerated keys — taking WR-53's forward-walk bound and continue-fallback only on that evidence and never as a parse — adds a permanent case forbidding a construct half that is a prefix of its line half, and executes the `:1838`→`:7102` relocation on the real tree and watches it go RED. Task 2 censuses every line's would-be token and asserts each anchor in use is produced by exactly ONE line, disposing of whatever it flags by a three-choice rule that never widens the census and never folds a line number into a key, then watches the `:305` relocation go RED. Task 3 lands both relocations as permanent fixtures — the own-header shape as a second array pair in the case that deliberately excluded it (WR-52) — and restates limit (5), the anchor docblock and the coverage sentence ONCE, to what executes — *wave 39*

**Wave 40** *(blocked on 01-39)*

- [x] 01-40-PLAN.md — **CR-21 and WR-51: two assertions that cannot fail**: `NO_PRECEDING_CONSTRUCT` is made of letters, so `nameableRemainder` scores it 20 and the `no exemption key's ANCHOR reduces to nothing` case — added in the SAME commit to forbid the empty-anchor shape — passes the sentinel key, which is CR-17's `"{q2} :: q2"` with twenty letters bolted on. The verifier planted a sentinel-producing occurrence with its matching exemption (434/434 green), then relocated it ~1,800 lines with the entry unchanged (434/434 green again); four greps find the constant declared and returned and never observed. Task 1 excludes the sentinel from `nameableRemainder` BY REFERENCE to the constant, measures the blast radius on all 29 keys because that helper also gates the anchor builder, asserts the sentinel is never produced by an occurrence on the scanned surface with non-vacuity above the rule, corrects the docblock on both counts the verifier named, and reproduces both mutation steps and watches each go RED. Task 2 closes WR-51: `preAnchoringExemptionKeyForFixtureOnly` replaced by `return "CONSTANT";` passed 434 of 434, so the counter-probe is pinned to the LIVE builder's line half over both array pairs and the constant-body mutation is watched going RED. All three additions are green on arrival, which is exactly why each is planted against — *wave 40*

**Wave 41** *(blocked on 01-40)*

- [x] 01-41-PLAN.md — **WR-54+WR-50, then WINDOWS 41 and the round's closing baseline**: round 8's WR-48 correction is right, honestly measured and pinned by NOTHING — the verifier reverted `CLOSES_FROZEN_ARRAY` to its pre-fix form, re-introducing the exact 117-line over-walk, and the suite stayed GREEN at 434 of 434. The `proof` token is monotone in range width and cannot detect an over-walk by construction; the band already failed on 1,750 lines inside 500..3000; and the clause-count equality would not have caught it either, because the swallowed lines carry zero clauses. Task 1 asserts both `closingBracketAfter` resolutions directly against their constructs' own closing lines located by text, with non-vacuity proving each locator matches exactly one line, pins the recogniser WITHOUT loosening what it matches, watches the verifier's revert go RED, and replaces the closing sentence with the three measured refutations plus what actually holds it. Task 2 takes WINDOWS 41 now that the gate file is open: the two unmarked present-tense statements at `:803-804` and `:901` attributing a flip to a wave 28 that never owned it are swept by P38-D1 marking or wave-33 deletion, and the count claim ten lines below — which measures four sites, all agreeing on `[ ]` — is replaced by something true at the reach of a grep pasted after the sweep, naming the surfaces this file cannot see. Then the round's closing baseline is EXECUTED rather than carried: 31 files / 1374 tests, `tsc --build`, one specifier `crypto`, 23 modules / 0 violations, with every difference attributed. No plan in this round touches `.planning/`; the box stays `[ ]` and pass 10 owns the question — *wave 41*

**Wave 42** *(blocked on 01-41)*

- [x] 01-42-PLAN.md — **CR-22, both parts: the residual restated as the anchor's SHADOW, pinned, and the site claim retired**: verification pass 10 re-measured 234 and confirms it — what it refutes is the inference. Occurrence-to-anchor distance is where 29 shipped sentences happen to sit; the interchangeability residual is the width of the anchor's SHADOW, every line resolving to the same anchor, and the widest was measured with the live builder over the whole scanned surface and pinned. ITS WIDTH, ITS OWNING ANCHOR, ITS RAW SPAN AND THE SURFACE TOTAL ARE DELETED FROM THIS ROW RATHER THAN CORRECTED IN IT (2026-08-27, gap-closure round 12, plan 01-47, CR-32): the width is published by `WIDEST_ANCHOR_SHADOW` in `packages/backend/src/outbound-prohibition.spec.ts` and the owning anchor by `WIDEST_ANCHOR_TOKEN` beside it, and a corrected figure here would be a second publication that goes stale on the next commit moving a line — which is what this one did. Pass 10 moved one 514 lines and then 1,129 lines for a byte-identical key at 439 of 439 green, exemption reason false in both new homes. Limit (5) and the `constructAnchorFor` docblock publish that residual as 234 — roughly five times too small — and it is this phase's signature defect at its TENTH instance, written for the second consecutive round inside the paragraph stating the reach of the fix for the ninth. Task 1 is the tracer: group every line of `SURFACE_LINES` by resolved anchor with the shipped builder, pin the maximum as an exact equality, watch it RED against planted lines — and then re-run pass 10's own 1,129-line relocation, watch it stay GREEN, and write that green into the bytes as the measured statement of what the pin does NOT do. Task 2 restates both surfaces to the measured shadow and retires the site-identity claim DELIBERATELY, dated, against a bounded enumeration, on the operator's exit-2 reasoning: the 2026-08-25 bar — DERIVED, DRIFT-DETECTABLE, SOLE BOUND — never required the anchor to identify a site, only that the disclosure be accurate and contradicted nowhere. NO AST, no parser, no compiler-API identity (that was exit 1 and it was not taken), no further narrowing of the recognisers, the scan bounds or the key format, and no line number in any key — each asserted by a structural check over the diff. The box stays `[ ]` and pass 11 owns the question — *wave 42*

**Wave 43** *(blocked on 01-42)*

- [x] 01-43-PLAN.md — **CR-23, then WR-55, WR-58, WR-60 and the round's closing baseline**: the two `.from` assertions compare `EXCLUSIONS[n].from` against a locator expression recomputed character for character from the expression `EXCLUSIONS` was built from — tautologies true of every possible file, including one where the locator matches nothing and `-1 === -1`. Pass 10 planted one `export const RESOLVER_REGISTRY_DECOY` line 104 lines above the registry: exclusion three's opening endpoint slid 4163 → 4058, 104 pre-existing gate-file lines silently left the scanned surface (`SURFACE_LINES` 8846 → 8742, measured from inside the suite), at 439 of 439 GREEN — past the assertion whose own message reads *Both endpoints are pinned*. Task 1 pins each opening endpoint against a FULL-LINE literal proved to match exactly one line before use — the treatment `REGISTRY_CLOSE` already gets — deliberately LEAVING `EXCLUSIONS`' own prefix locators alone, because making both sides the same expression would restore the tautology in the commit that removes it; both decoys are watched turning their pins RED, the shape survives as a permanent synthetic fixture, and the closing claim is corrected from *all five locators proved unique* to what is actually proved, including that the pins DETECT a slide rather than prevent one. Task 2 takes the three warnings pass 10 confirmed: the sentinel case executes over exactly ONE line of this file and both surfaces state its reach as the whole scanned surface — restated against an evaluation of the shipped builder at every line, with line 1's dependence watched rather than cited; the census's `constructHalf` gets its `indexOf` guard, watched failing in BOTH directions so malformation stops reporting as ambiguity, with the second unguarded call site named and WR-57 left open as unadjudicated; and the one relocation distance published at 57 and at 58 is derived once with its frame, after reading `01-39-SUMMARY.md`'s own record that both were correct measurements of different procedures. Task 3 executes the round's closing baseline rather than carrying it and reconciles every figure the round published. WR-56, WR-57, WR-59 and IN-41 … IN-44 are recorded by pass 10 as reviewer-reported and NOT re-executed, and none is presented as verified. The box stays `[ ]`; `requirements mark-complete` stays unrun — *wave 43*

**Wave 44** *(blocked on 01-43)*

- [x] 01-44-PLAN.md — **CR-28 first, then the round's whole deletion half**: pass 11 says do CR-28 first and it is the only one of the five blockers that is a code fix. The fixture introduced with *this one turns red instead of arguing* declares its own `REAL_OPENER`, its own prefix finder and its own full-line finder over a frozen seven-element literal and reads NOTHING from the case above it — pass 11 swapped the shipped resolution to a prefix matcher (441/441 green), then planted a registry-extending declaration 104 lines above the real opener (441/441 green again), restoring CR-23's tautology and taking 104 pre-existing lines off the scanned surface (`SURFACE_LINES` 9285 → 9181) straight through the fixture written to catch exactly that edit. Task 1 is the tracer: hoist `REGISTRY_OPEN` and its full-line RESOLUTION to the enclosing `describe` so the uniqueness count, the pin and the fixture all route through ONE binding, watch both swap steps go RED, and disclose in the bytes — reach inside the claiming clause — that a fresh prefix predicate inlined at the pin's own call site still bypasses it. Task 2 is the deletion: CR-24 at both sites, CR-25's silent-growth ceiling, CR-27's three contraposition clauses and its bracket's completeness universal, and WR-61's four stale totals — ALL IN ONE COMMIT, gated on removed lines exceeding added, on net bytes strictly negative, and on the set of added word tokens being a SUBSET of the removed ones, with the gate watched RED against one planted word before it is trusted. Every removal is paired with a grep proving its SURVIVOR stayed. A planner correction owed back to pass 11 and carried in the plan: the contraposition word's case-INSENSITIVE population is TEN, not the eight a case-sensitive grep returns — `:11136` spells it in capitals — which is wave 41's `:981` lesson again, so the sweep is re-derived and the enumeration of the survivors goes in the SUMMARY, never into the file. The box stays `[ ]` — *wave 44*

**Wave 45** *(blocked on 01-44)*

- [x] 01-45-PLAN.md — **CR-26, then WR-62, WR-63, WR-64, WR-65 and the round's closing baseline**: the additions run AFTER the deletions on purpose — three of this plan's four regions overlap what 01-44 empties, so every sentence here is written once, against the final shortened state. Task 1 pins the IDENTITY as well as the size: `WIDEST_ANCHOR_SHADOW` asserts `widestSize`, the maximum over all anchors, while `widest` appears only inside a failure message, so pass 11 held the maximum at 574 with 291 filler lines and dropped two lines below all four shipped occurrences — the `:417` shadow the file publishes in six places FELL 574 → 284 and the ENTIRE SUITE was silent. The new pin is an exact equality on a MASKED TOKEN (never a line number), proved not to perturb its own measurement, and its RED demonstration must show the identity pin RED and the SIZE PIN GREEN IN THE SAME RUN — anything less would have been caught by the pin that already existed. Task 1 also re-measures WR-64's boundary line by line (exactly one line in `419..1574` IS accepted, and it sits BELOW the imports, so the real mechanism is the WR-53 fall-through) and closes WR-65 by DELETING the argument the pin makes against itself and PRE-AUTHORISING the routine bump — the round's one general lesson being that an authorisation cannot be falsified by measuring this file and a measurement can. Task 2 pins exclusion one's two endpoints against `DERIVED_BEGIN`/`DERIVED_END`, already exported at `:6043-6044`, as an INDEPENDENT full-line equality run after the derivation — at `882ff17` pass 11's decoy slid that endpoint and only the 574 pin fired, by the luck of exclusion one lying inside the widest shadow — widens the census guard to its prescribed boundary value so a hand-written key against a header that is not in the file reports MALFORMATION instead of AMBIGUITY (both diagnoses pasted side by side, because the fix IS the change of diagnosis), and executes the round's closing baseline with every figure reconciled against arrival. WR-57 and IN-45/46/48/49 stay open and are presented as closed nowhere. The box stays `[ ]`; `requirements mark-complete` stays unrun; pass 12 owns the question — *wave 45*

**Wave 46** *(blocked on 01-45)*

- [x] 01-46-PLAN.md — **CR-30 and CR-31, taken as a CLASS and not as instance thirteen**: the set of surfaces this suite byte-compares becomes one frozen constant that `GATE_FILE`, `LEDGER` and `deriveResidual` all read, rendered into the generated residual and therefore shipped and byte-compared in BOTH compared surfaces; a header census makes every `.planning/` file mention in the gate header a declared entry with a reason, watched RED with an empty list naming CR-30's own two lines before they are deleted; CR-30's machine-check paragraphs are DELETED rather than corrected, dropping 9 surface lines and re-deriving the shadow pin against an attribution stated before the measurement; and CR-31's hand-written span arithmetic and accepted-line locator are deleted and emitted from the pin's own computation instead, with no assertion added.

**Wave 47** *(blocked on 01-46 — every figure it reconciles is one 01-46 moves)*

- [x] 01-47-PLAN.md — **CR-32, and the security register's own stale open rows**: a repo-wide census classifies every site publishing the shadow bound LIVE or DATED HISTORY before anything is edited; `.planning/STATE.md` is amended by an appended dated POINTER that names the gate file's constant and spells no figure, its own bytes unchanged; `.planning/ROADMAP.md`'s stale figures are deleted rather than corrected; and `01-SECURITY.md`'s three `open` threat rows are re-adjudicated against claims re-executed in that session rather than re-numbered — including one asserting that nothing pins a shadow two waves have pinned. Touches no code.

**Wave 48** *(blocked on 01-47 — round 13, and the only plan in it that touches the blocker)*

- [ ] 01-48-PLAN.md — **CR-33, taken as a CLASS and not as instance fourteen and fifteen**: the gate file's prose below the registry states TWO line ranges in the present tense that the same file computes and contradicts — a header extent off by eight, made so by the very commit that installed the emission fix designed to prevent it, and a registry range off by three at both endpoints with the LENGTH still correct, which is why fourteen passes read past it. Both are DELETED rather than corrected, because the file's own deletion paragraph records that seven consecutive waves each fixed a stale claim here and each acquired the next; the extents are rendered from `headerRegion()`, `registryStart` and `closingBracketAfter(registryStart)` into an UNASSERTED emission on a path that already fails; and the class closes with a census whose region is resolved by full-line sentinel equality rather than written down, in which every surviving range is DELETED, DERIVED or DECLARED with a reason — the six accurate DATED HISTORY narratives declared and preserved, with the surviving count asserted as an exact equality so destroying history is as loud as leaving a live claim.

**Wave 49** *(blocked on 01-48 — the region it widens is the region 01-48 edits)*

- [ ] 01-49-PLAN.md — **the disclosed blind spot below the sentinel, closed prophylactically and said to be prophylactic**: the `.planning/` mention census reaches the header and no further, and pass 14 confirmed that by negative control — so the region that carried BOTH CR-33 blockers is the region with the least machinery over it. A second censused region covers the prose below the derived-block sentinel, with the census machinery's own bytes excluded by a resolved, sentinel-bounded self-exclusion; every body mention is declared with a reason describing the CLAIM rather than the path; the mutation pass 14 used to prove the old census blind is re-run and now reds; and the three regions become ONE ASSERTED CONTRACT — resolved bounds, unique sentinels, non-vacuity before the rules — with the residual stated plainly: a region nobody listed is a region nobody checks.

**Wave 50** *(blocked on 01-49 — the only plan allowed near CORE-11's checkbox)*

- [ ] 01-50-PLAN.md — **the discharge, or the eighth honest `[ ]`**: criterion (3) is re-measured across all seven surfaces BY EXECUTION in one session, inheriting none of pass 14's six discharges because three of them read from a file round 13 edits twice, with every zero earned by a stated positive control and every census run with `grep -rE`. The verdict is written down BEFORE any box is discussed. If all seven discharge, `.planning/REQUIREMENTS.md`'s CORE-11 row and `CORE11_BOX_EXPECTED` flip in ONE commit, both locators resolved by CONTENT because that constant has moved on every single pass; if any surface blocks, neither moves and the blocker is named with the command that established it. Either way a dated correction paragraph is APPENDED — the row's existing dated passages are the copy that drifted through five rounds and are never rewritten — and the remaining residuals are named rather than implied away.

### Phase 2: Error Containment & Observability

**Goal**: Make failure local and legible. One poisoned bundle fails itself, not the pipeline — and the operator can always tell "nothing found" from "analysis broke".
**Depends on**: Phase 1
**Requirements**: ERR-01, ERR-02, ERR-03, ERR-04, OBS-01, OBS-02, OBS-03
**Success Criteria** (what must be TRUE):

  1. A fixture that throws inside a detector fails only that artifact; every subsequent artifact is still analysed
  2. Killing the process mid-analysis leaves no job permanently in `running` — startup either resumes or explicitly abandons it, and says which
  3. A per-artifact failure is recorded with its reason and shown in the UI, so "no findings" and "analysis failed" are never confused
  4. A health surface reports queue depth, drop count, jobs in flight, maximum synchronous slice, and cache hit rate
  5. One vocabulary for degradation states is defined once and used identically in the database, the API, and the UI
  6. A diagnostics export exists that carries versions, counters, and recent errors, and contains no secret material

**Plans**: 3 plans

Plans:

- [ ] 02-01: Per-artifact error isolation and failure recording
- [ ] 02-02: Stale-job detection and restart recovery
- [ ] 02-03: Health surface, degradation vocabulary, and diagnostics export

### Phase 3: Detection Engine & FP Harness

**Goal**: A detector framework that is data-driven, ReDoS-safe, and whose false-positive rate is a number printed by CI — established before the corpus grows.
**Depends on**: Phase 2
**Requirements**: DET-01 … DET-10, QUAL-01, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):

  1. The gate is two-tier and working — `indexOf` prefilter, then bounded-window regex — with the AST tier declared as a pluggable stage whose implementation lands in Phase 9. No requirement in this phase depends on AST existing
  2. Detectors are declarative data; adding one is a testable unit requiring no engine change
  3. The engine runs under plain vitest with zero Caido imports
  4. A deliberately catastrophic regex fails CI rather than reaching the runtime
  5. The two-tier gate is measurably cheaper than naive full-body matching on a real bundle, with the numbers recorded
  6. Both corpora run in CI, findings-per-MB and recall print on every rule change, and a regression fails the build
  7. No detector can reach high confidence on entropy alone — proven by a corpus case that tries

**Plans**: 4 plans

Plans:

- [ ] 03-01: Detector interface, rule schema, pluggable tier contract, and the `indexOf` prefilter tier
- [ ] 03-02: Regex tier with bounded windows, per-rule compilation, and the CI ReDoS gate
- [ ] 03-03: Multi-signal confidence scorer with explanations
- [ ] 03-04: Negative and positive corpora, the FP harness, and CI wiring

### Phase 4: Passive Intelligence Core

**Goal**: Beat JS-Analyzer's detection quality on the same inputs — entirely passively, with zero outbound traffic.
**Depends on**: Phase 3
**Requirements**: SEC-01 … SEC-06, ENDP-01, ENDP-03, ENDP-06, ENC-02, ENC-03, ENC-04, UPGRADE-02
**Success Criteria** (what must be TRUE):

  1. Provider-specific detectors cover the high-value providers, each with its own shape, context requirement, and fixtures
  2. Public-by-design keys — Firebase `apiKey`, Stripe `pk_live_`, Sentry DSN, Algolia search keys — are suppressed, proven by corpus cases that contain them
  3. No raw secret value appears in SQLite, logs, or any frontend event, proven by inspecting all three after a corpus run
  4. A secret's real value is still revealable, by reloading the original request and re-verifying the body hash — and reveal fails closed when the artifact has changed
  5. The HMAC key lifecycle is designed such that key rotation or loss is detected and reported, never silently breaking correlation
  6. Punycode and Unicode forms of the same host resolve to one entity; homograph forms do not
  7. Measured findings-per-MB on the negative corpus is lower than JS-Analyzer's on the identical corpus, with both numbers published
  8. The plugin makes no outbound request at all in this phase

**Plans**: 5 plans

Plans:

- [ ] 04-01: Provider secret detectors from the permissive corpus
- [ ] 04-02: Public-by-design allowlist and contextual generic-secret detection
- [ ] 04-03: Fingerprint storage, redaction, hash-verified reveal, and HMAC key lifecycle
- [ ] 04-04: Host, subdomain, cloud-resource, and JWT extraction with IDNA normalisation
- [ ] 04-05: Regex-tier endpoint extraction with template preservation; head-to-head FP benchmark against JS-Analyzer

### Phase 5: Workspace & Operator Workflow

**Goal**: Turn the database into something an operator reads, triages, and trusts — and render target-controlled content without getting attacked by it.
**Depends on**: Phase 4
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-06, UI-07, UI-08, UI-09, OPS-01 … OPS-04, UISEC-01, UISEC-02, UISEC-03, FIND-01, FIND-02
**Success Criteria** (what must be TRUE):

  1. A sidebar page answers "every secret, endpoint, and host on this target", not "what is in the response I have open"
  2. Tables stay responsive at 10,000 rows, and a heavy browsing session does not flood the UI — event coalescing is proven under load
  3. Every entity links back to its source request, artifact version, and byte offsets, and shows which signals fired and why it scored as it did
  4. Findings can be marked reviewed, false positive, or accepted, and that state survives a corpus version bump and re-analysis
  5. A suppression rule stops a known-benign pattern reappearing on a target without editing the rule corpus
  6. No extracted content is ever rendered as markup; a fixture containing HTML, script, and a CSV formula payload renders inert and exports safely
  7. Native Findings are created only for high-signal results with stable dedupe keys; entropy-only and hint-grade results provably never project
  8. Degraded and partial analyses are visibly marked

**Plans**: 12/12 plans executed

> **Scope split, decision D-05 (2026-08-28).** Phase 5 nominally depends on Phase 4, and the
> `entities` / `evidence` tables do not exist. Rather than re-sequence, the phase is split: what is
> buildable over the shipped `artifacts` / `observations` / `analyses` tables is planned and built
> now, and the entity read contract is published upward for Phases 3/4 to satisfy. UI-03 (byte
> offsets), UI-04, OPS-01/02/04 and FIND-01/02 are deferred to a follow-on pass after Phase 4, each
> with its blocker and unblocking plan recorded in `05-04`'s deferral register.

Plans:

- [x] 05-01-PLAN.md
- [x] 05-02-PLAN.md
- [x] 05-03-PLAN.md
- [x] 05-04-PLAN.md
- [x] 05-05-PLAN.md
- [x] 05-06-PLAN.md
- [x] 05-07-PLAN.md
- [x] 05-08-PLAN.md
- [x] 05-09-PLAN.md
- [x] 05-10-PLAN.md
- [x] 05-11-PLAN.md
- [x] 05-12-PLAN.md

**Wave 1**

- [x] 05-01: Frontend workspace and the end-to-end tracer — page, sidebar item, build-output gates, lint enforcement
- [x] 05-02: SQL discipline gate widened, and the two measurements the query design rests on
- [x] 05-03: Engine safety primitives — strip and truncate, CSV neutralisation, the hostile-content fixture

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-04: The entity read contract published upward, and the deferral register
- [x] 05-05: Rendering safety — the static AST gate, the display path, the hostile render proof
- [x] 05-06: Schema v3 — the `audit` table (STORE-08), keyset indexes, and the D-06 retention exemption

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-07: The literal-statement matrix, keyset pagination, and the typed RPC contract

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 05-08: Inventory store, event coalescer, and the typed frontend client

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 05-09: The findings tables — virtualised, degradation-marked, load-backstopped at 10,000 rows

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 05-10: The evidence panel frame and the retry path (OPS-03)

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 05-11: Safe export — serialiser, dialog, and the browser download (D-04)

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 05-12: Settings, Health, and the visible compatibility refusal surface

### Phase 6: Retroactive Scan & Deployment Reality

**Goal**: Apply the analysis to traffic captured before install — and stop pretending the backend filesystem is on the operator's machine.
**Depends on**: Phase 5
**Requirements**: FIND-03, FIND-04, DEPLOY-01 … DEPLOY-04
**Success Criteria** (what must be TRUE):

  1. A retroactive HTTPQL-filtered scan of existing traffic runs with page size 20, reports progress, and can be cancelled and resumed from its cursor
  2. The plugin is exercised on local desktop, remote CLI, and Docker both with and without a persistent volume, and behaves correctly on all four
  3. Server-side storage is labelled as such in the UI and never presented as a path on the operator's machine
  4. Operator-facing artifacts are retrievable through `sdk.hostedFile` or a bounded authenticated download — never by writing a path and assuming the operator can reach it
  5. Server disk is quota-bounded with orphan cleanup, and behaviour on a container without a volume is documented and tested

**Plans**: 5/13 plans executed

**The three placeholder plan titles above this line are superseded, and the divergence is stated rather than smuggled.** `06-03: Hosted-file delivery, quotas, orphan cleanup, and storage labelling` names four things, three of which decision D-17 makes impossible or unnecessary: `HostedFileSDK` is `getAll()` and `create()` and nothing else — no delete, no expiry — so DEPLOY-03's "expiry" and DEPLOY-04's "orphan cleanup" are not expressible against that surface. DEPLOY-03's own wording offers "**or** a bounded authenticated frontend download" as an equal alternative, and Phase 5 already built and measured exactly that. What ships instead is the shipped chunked RPC download plus the two gates that keep the guarantee true (06-07) and the honest Settings statement (06-08).

Plans:
**Wave 1**

- [x] 06-01-PLAN.md — TRACER: one operator action walks one page end-to-end, plus the one-way `scans` migration — *wave 1*

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md — O-07 probe: which byte count `Body.length` reports on the two read paths — *wave 2*
- [x] 06-04-PLAN.md — The HTTPQL composer, the operator-clause validator, and the static gate over filter sinks — *wave 2*

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-03-PLAN.md — The derived backpressure watermark, the skip-done read, the yielding page walk, and the retro counters — *wave 3*
- [x] 06-05-PLAN.md — Scan lifecycle: pause, resume, discard, the epoch suspend and the startup sweep — *wave 3*
- [ ] 06-07-PLAN.md — DEPLOY-03/04 by construction: the filesystem and hosted-file ban, and the no-BLOB schema gate — *wave 3*
- [ ] 06-11-PLAN.md — D-06's push-down superset proof over a captured fixture corpus, with its non-vacuity negative — *wave 3*

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 06-06-PLAN.md — Retention self-eviction suspends the scan, and the forward step widening the audit vocabulary — *wave 4*
- [ ] 06-08-PLAN.md — The Settings subtraction: no path, ever, plus the row-count footprint — *wave 4*

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 06-09-PLAN.md — Scan progress on the existing event as a second payload variant, and the lifecycle badge — *wave 5*
- [ ] 06-10-PLAN.md — The four-shape deployment matrix, its result schema and its artifact gate — *wave 5*

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 06-12-PLAN.md — The Scan tab: start form, progress readout, controls and the discard confirmation — *wave 6*

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 06-13-PLAN.md — The scan history list, the per-scan detail, and the toolbar scan indicator — *wave 7*

**Cross-cutting constraints:**

- The result artifact is written under this phase's own results directory and never into `.planning/phases/00-runtime-reality-check/results/` (Pitfall 7).

### Phase 7: Sourcemap Reconstruction

**Goal**: Recover developer-readable source — the single highest value-per-effort feature in the tool — without letting a malicious map write outside its sandbox.
**Depends on**: Phase 6 (delivery path must exist before we produce files to deliver)
**Requirements**: MAP-01 … MAP-07, UI-05
**Success Criteria** (what must be TRUE):

  1. Sources are reconstructed from `sourcesContent` via `JSON.parse` with no VLQ decoding on the primary path, and a real large map completes within the Phase 0 budget
  2. VLQ decoding via `@jridgewell/sourcemap-codec` is used only where position attribution is genuinely needed
  3. A malicious-`sources` fixture suite — traversal, absolute paths, UNC, drive letters, reserved names, `webpack://` — writes nothing outside the output directory on macOS, Linux, and Windows
  4. Malformed maps, decompression bombs, absent `sourcesContent`, indexed maps, and reference cycles all stay within limits and record a partial state rather than crashing
  5. Reconstructed sources are themselves analysed once per content hash, and the FP corpora are extended to include reconstructed source as an input class
  6. Reconstructed source is browsable in the UI and retrievable via the Phase 6 delivery path with a manifest

**Plans**: 4 plans

Plans:

- [ ] 07-01: Map discovery — `sourceMappingURL`, data URIs, `SourceMap` headers, relative resolution
- [ ] 07-02: `sourcesContent` reconstruction and content-addressed safe writing
- [ ] 07-03: Hostile-map fixture suite across three platforms
- [ ] 07-04: Recursive analysis of reconstructed sources, corpus extension, source viewer, manifest export

### Phase 8: Active Retrieval & Crash Survivability

**Goal**: Turn on the active path per the operator decision — default-on and unbudgeted — and engineer it so that when Caido aborts, the evidence survives and the cause is known.
**Depends on**: Phase 7
**Requirements**: ACTIVE-01 … ACTIVE-14
**Success Criteria** (what must be TRUE):

  1. Active `.map` probing works by default and unbudgeted, per the recorded operator decision
  2. A **write-ahead journal** persists every send before it is issued, with credentials and query values redacted; a forced process kill mid-batch leaves a durable record naming the exact request in flight
  3. On restart, an unfinalised batch is detected and reported, and is not replayed until the operator chooses Resume or Discard
  4. Same-origin probes clone the originating request's credentials; cross-origin probes are issued clean; credentials never survive a redirect hop — each proven by a fixture
  5. Each semantic candidate is attempted once; negative results persist and a re-served bundle does not trigger re-probing
  6. Hundreds of speculative 404s do not appear in Search, proven by inspecting it after a 300-asset fixture run
  7. Plugin-generated traffic is rejected at the admission gate by fingerprint, regardless of what SPIKE-05 observed about recursion
  8. `Retry-After` is honoured, 429 pauses an origin, and 401/403/WAF stops an origin until the operator resumes
  9. A kill switch in the page chrome shows per-runtime and per-origin counts and prevents the next dispatch even while analysis is busy

**Plans**: 5 plans

Plans:

- [ ] 08-01: Write-ahead send journal with redaction, and crash-loop marker with Resume/Discard recovery
- [ ] 08-02: Credential propagation contract — same-origin clone, cross-origin clean, redirect stripping
- [ ] 08-03: Candidate dedupe with persisted negatives; `save:false` probes; self-suppression at the admission gate
- [ ] 08-04: Circuit breakers, serialised host-backed sends, wrapper release discipline
- [ ] 08-05: Kill switch, counters, first-run disclosure, and the 300-asset failure-path acceptance suite

### Phase 9: AST Substrate & Syntax Intelligence

**Goal**: Deliver the AST tier declared in Phase 3, and use it for the thing that actually differentiates — emitting a replayable request rather than a URL string.
**Depends on**: Phase 8, and the Phase 0 parser verdict
**Requirements**: DET-01 (AST tier), ENDP-02, ENDP-04, ENDP-05
**Success Criteria** (what must be TRUE):

  1. The Meriyah adapter runs only below the Phase 0 measured ceiling (`AST_MAX_BYTES = 1,334,405`, **stall-bound not memory-bound**), guards `structuredClone` (confirmed `undefined`), and pre-scans nesting depth before parsing against the measured `MAX_NESTING_DEPTH = 246`
  2. Degradation goes to **regex-only**, not through `acorn.tokenizer()`. *(Phase 0 measured the tokenizer at 783 ms/MB against meriyah's 786 — it is a genuine low-memory path but buys nothing in CPU, so it cannot relieve a stall-bound ceiling. Keeping it as the middle rung would add a tier that costs the same as the thing it replaces.)*
  3. Degradation is treated as the **common case for large bundles, not an edge case** — Cesium at 4.90 MB and Plotly at 4.35 MB are both far above the ceiling, so the degraded path carries real traffic and must produce useful output, not a stub
  4. Parse failure never suppresses results the lexical and regex tiers already found — proven by a fixture that fails to parse but still yields findings
  5. Every finding records which tier produced it
  6. An extracted endpoint carries method, path template, query keys, content type, and headers — enough that one click creates a working Replay request, demonstrated end to end against a live fixture app
  7. GraphQL operations are extracted and normalised with operation type, name, and variables, and no introspection request is ever issued automatically

**Plans**: 4 plans

Plans:

- [ ] 09-01: Meriyah adapter — nesting pre-scan, `structuredClone` guard, tiered degradation, tier recording
- [ ] 09-02: AST endpoint extraction with bounded constant folding and base-URL resolution
- [ ] 09-03: Replayable request synthesis and one-click Replay handoff
- [ ] 09-04: GraphQL operation extraction and normalisation

### Phase 10: Chunk Graph & Supply Chain

**Goal**: Enumerate code the browser has not loaded yet — the hardest unique feature — and add dependency intelligence without repeating the public-name-equals-vulnerability mistake.
**Depends on**: Phase 9 (chunk-map resolution needs the parser substrate)
**Requirements**: CHUNK-01 … CHUNK-04, SUPPLY-01 … SUPPLY-05, SEC-07
**Success Criteria** (what must be TRUE):

  1. `chunkId → URL` is resolved from real webpack, Vite, Next, and Nuxt manifests against pinned fixtures of current framework output — actual enumeration, not bundler fingerprinting
  2. Resolution is performed by parsing only; `eval` appears nowhere in the bundle, enforced by a CI check
  3. Coverage statistics are reported and complete enumeration is never claimed
  4. Dependency-confusion lookups are concurrent, rate-limited, cached, and deduplicated across scans, with a measured cache hit rate
  5. Public absence of a package name alone never produces a high-confidence finding
  6. Library CVE findings require an exact version and are Informational, never High
  7. Secret validation exists, is OFF by default, names the outbound host and data class before running, is read-only, and never uses a credential to mutate state

**Plans**: 5 plans

Plans:

- [ ] 10-01: Chunk seeding from HTML, modulepreload, dynamic imports, worker registrations
- [ ] 10-02: Parser-based chunk-map resolution with per-framework adapters and fixtures
- [ ] 10-03: Dependency confusion with concurrency, caching, rate limiting, and consent
- [ ] 10-04: retire.js library fingerprinting with exact-version gating
- [ ] 10-05: Provider secret validation, default-off, reimplemented from provider documentation

### Phase 11: Upgrade Path, Hardening & Store Release

**Goal**: Make DefMiner safe under hostile input, correct across upgrades, boring under daily proxy load, and publishable.
**Depends on**: Phase 10
**Requirements**: UPGRADE-01, UPGRADE-03, UPGRADE-04, QUAL-04, QUAL-05, QUAL-06, DIST-01, DIST-02, DIST-03, DIST-04, DIST-07
**Success Criteria** (what must be TRUE):

  1. Installing a newer DefMiner over a populated existing install preserves findings, triage state, and secret correlation — tested, not assumed
  2. A corpus version bump re-analyses affected artifacts rather than leaving stale results labelled current
  3. A poison-bundle fixture — adversarial syntax, deep nesting, decompression bombs, catastrophic-regex bait — completes within budget without crashing
  4. A multi-hour soak over mixed real bundles, run by a reproducible harness with memory measurement, shows no growing heap, no stuck jobs, no cross-project leakage, and no duplicate findings
  5. The measured false-positive rate is published in the README as a number, alongside the corpus it was measured on
  6. The README and store listing disclose every external service contacted, and state plainly that default-on `.map` probing may generate many 404s and may terminate the instance on affected Caido builds
  7. No telemetry, no obfuscation, and no self-update mechanism exists anywhere in the bundle
  8. A rule-only patch release ships without touching plugin code
  9. The plugin is accepted and installable from the Caido Community Store

**Plans**: 5 plans

Plans:

- [ ] 11-01: Upgrade, reinstall, and downgrade matrix against a populated database
- [ ] 11-02: Adversarial and poison-bundle fixture suite
- [ ] 11-03: Reproducible soak harness with memory measurement
- [ ] 11-04: README with disclosures and published FP rate, LICENSE, attributions, SBOM
- [ ] 11-05: Release engineering — signing, versioned rule packs, store submission and acceptance

---

## Dependency corrections applied

The adversarial review found five places where a consumer was scheduled before its producer. All are fixed above:

| Inversion | Was | Now |
|---|---|---|
| `DET-01` declared an AST tier delivered five phases later | Phase 2 required AST | Phase 3 delivers a two-tier gate with AST as a declared pluggable stage; Phase 9 implements it |
| `UI-05` reconstructed-source viewer preceded `MAP-07` | UI-05 in Phase 4, MAP-07 in Phase 5 | Both in Phase 7 |
| `ENDP-04` Replay handoff preceded `ENDP-02` request synthesis | ENDP-04 in Phase 4, ENDP-02 in Phase 6 | Both in Phase 9 |
| `CHUNK-01`/`CHUNK-03` needed parser infrastructure | Chunks in Phase 5, AST in Phase 6 | Chunks in Phase 10, after the AST substrate in Phase 9 |
| `MAP-06` reconstructed sources arrived after detector tuning | QUAL corpora fixed in Phase 2 | Phase 7 extends the corpora with reconstructed source as an input class |

Two further ordering changes: error containment and observability moved forward to Phase 2 (they are foundational, not final-phase polish), and deployment reality moved to Phase 6 so a delivery path exists before Phase 7 starts producing files.

## Requirement Traceability

| Requirement group | Phase |
|---|---|
| SPIKE-01 … SPIKE-12, SPIKE-04b | Phase 0 |
| CORE-01 … CORE-11, STORE-01 … STORE-07, COMPAT-01/02, ENC-01, DIST-05/06 | Phase 1 |
| ERR-01 … ERR-04, OBS-01 … OBS-03 | Phase 2 |
| DET-01 … DET-10, QUAL-01/02/03 | Phase 3 |
| SEC-01 … SEC-06, ENDP-01/03/06, ENC-02/03/04, UPGRADE-02, STORE-09 | Phase 4 |
| UI-01/02/03/04/06/07/08/09, OPS-01 … OPS-04, UISEC-01 … UISEC-03, FIND-01/02, STORE-08 | Phase 5 |
| FIND-03/04, DEPLOY-01 … DEPLOY-04 | Phase 6 |
| MAP-01 … MAP-07, UI-05 | Phase 7 |
| ACTIVE-01 … ACTIVE-14 | Phase 8 |
| DET-01 (AST tier), ENDP-02/04/05 | Phase 9 |
| CHUNK-01 … CHUNK-04, SUPPLY-01 … SUPPLY-05, SEC-07 | Phase 10 |
| UPGRADE-01/03/04, QUAL-04/05/06, DIST-01/02/03/04/07 | Phase 11 |

**Coverage:** 137 v1 requirements, all mapped. 0 unmapped. 53 plans across 12 phases.

## Deferred to v2

SPIKE-13 and DIFF-01 (cross-deploy diffing, blocked on the unsolved asset-identity problem), DOM-01 (`domloggerpp-caido` owns this niche with runtime sink hooking, a better technique), CSP-01 (hands off to `csp-auditor`), AST-02, RULE-01.

---
*Roadmap created: 2026-08-20; revised after Codex adversarial review*
