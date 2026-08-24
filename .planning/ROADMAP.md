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

**Plans**: 6/6 executed in 6 waves (sequential — 01-03 consumes every store module 01-04 builds, so they are serialised rather than parallel), plus 3 gap-closure plans in 3 waves from the 2026-08-21 UAT, plus 5 further gap-closure plans in 5 waves from the 2026-08-21T13:45 re-verification, plus 3 further gap-closure plans in 3 waves from the 2026-08-21T17:40 re-verification (CR-07), plus 5 further gap-closure plans in 5 waves from the 2026-08-22T12:40 re-verification (CR-08 and WR-22 … WR-26), plus 6 further gap-closure plans in 6 waves from the 2026-08-24 re-verification (CR-09, CR-10, WR-27 … WR-31 and IN-23 … IN-26), the last two of which change the KIND of artifact a residual is — derived from the gate's own code and CI-checked — rather than correcting another instance of it — every gap-closure plan fully serialised, because each one deliberately mutates the shared working tree to prove its gate can fail while each asserts whole-suite green (28 plans total)

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

- [ ] 01-25-PLAN.md — **WR-27**: a conditional receiver in CALL position is silent — `(b ? sdk.requests : sdk.net).send(req)` and its `??` / `||` twins — while the conditional KEY and conditional INITIALIZER faces of the same operator were both added in round 4 and both report, and no residual list names it. The descent hoisted into `receiverKind` and `keyReceiver`, the three copies collapsed to one, and `&&` settled by measurement — *wave 25*

**Wave 26** *(blocked on 01-25 — the only wave in the round that reaches outside the outbound gate, placed last of the four so a red in a store file is never ambiguous with a red in the gate)*

- [ ] 01-26-PLAN.md — **WR-28 … WR-31 and IN-23 … IN-26**: the head-side `;` residual asserted STABLE in three files is a fixed point at the one offset the fixture picked and not at 11 of its 71 neighbours; the no-separator class is scoped to a single-segment query when the branch condition is about where the cut lands; three `ONE HOP` docblocks assert a bound plan 01-19 measured false and one is contradicted by a passing test 1,800 lines below it; a residual paragraph now contradicts itself two lines after an insertion; plus the destructured key binding, the two overstated STORE-07 items and the two pins docblocks — *wave 26*

**Wave 27** *(blocked on 01-26 — a registry written against an older gate would be born stale, which is the failure this plan exists to prevent)*

- [ ] 01-27-PLAN.md — **THE STRUCTURAL PLAN**: the residual stops being authored. A resolver registry bound to the walk by executed probes, a pure `deriveResidual` that renders the text from it, sentinel-delimited blocks in the gate header and in `REQUIREMENTS.md` byte-checked by the suite, and a coverage guard over BOTH resolver populations — matching collectors and functions declared inside the audit function, each required to be a registry row or a named exemption, since `receiverKind` is where WR-27 lived — with SIX separately executed mutation proofs covering prose-without-code in both surfaces, code-without-prose, registry-without-regeneration, an unregistered collector and an unregistered unlisted resolver function, a named `planning ledger absent` error for the suite's first dependency on `.planning/`, and the limits of a derived residual stated inside the generated text — *wave 27*

**Wave 28** *(blocked on 01-27 — the residual it flips against does not exist until then)*

- [ ] 01-28-PLAN.md — **CORE-11's flip, and only then**: the box has been reverted twice, at `e7cc4b6` and `faca607`, both times because its Complete status rested on a disclosure that turned out false. Discharged item by item as a table of executed results — one row per surface the requirement's own sentence names plus one per shape this round closed, each with its rule identifier, its fixture title and the summary where that fixture was observed failing — flipped against the DERIVED residual verified current before the box is touched, with a state-agnostic verify so the honest `[ ]` outcome cannot fail its own gate — *wave 28*

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

**Plans**: 5 plans

Plans:

- [ ] 05-01: Sidebar page shell, navigation, settings surface
- [ ] 05-02: Findings tables — keyset pagination, virtualised scrolling, filtering, coalesced events
- [ ] 05-03: Evidence view and score explanations
- [ ] 05-04: Triage, suppression, retry, and their persistence across re-analysis
- [ ] 05-05: Frontend safety contract, safe export, and native Findings projection

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

**Plans**: 3 plans

Plans:

- [ ] 06-01: Retroactive scan with HTTPQL push-down, resumable cursor, progress, cancellation
- [ ] 06-02: Deployment matrix testing across desktop, remote CLI, and Docker
- [ ] 06-03: Hosted-file delivery, quotas, orphan cleanup, and storage labelling

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
| SEC-01 … SEC-06, ENDP-01/03/06, ENC-02/03/04, UPGRADE-02, STORE-08 (`entities`, `evidence`) | Phase 4 |
| UI-01/02/03/04/06/07/08/09, OPS-01 … OPS-04, UISEC-01 … UISEC-03, FIND-01/02, STORE-08 (`audit`) | Phase 5 |
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
