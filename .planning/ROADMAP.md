# Roadmap: DefMiner

## Overview

DefMiner is built from the runtime outward, because the runtime is what decides whether the product is possible. Phase 0 answers thirteen questions about Caido's QuickJS that no documentation answers — several of them can invalidate the performance budget, and one (does a catastrophic regex hang forever?) can invalidate the entire detection approach. Nothing else starts until those numbers exist.

From there the build follows the data: an ingestion pipeline that never stalls the plugin's single event loop, durable content-addressed storage, then a detection engine whose false-positive rate is measured in CI before the second detector is written. The tool becomes usable at Phase 4, when the workspace UI turns a database into something an operator reads. The features that make DefMiner worth switching to — real sourcemap reconstruction, genuine chunk enumeration, AST-derived replayable endpoints — come after that foundation exists, because each of them is only as good as the pipeline underneath.

The ordering was reached independently by two models. Codex (`gpt-5.6-sol`, xhigh) and the architecture researcher converged on the same sequence from different starting points, which is the strongest signal available that it is right.

## Phases

- [ ] **Phase 0: Runtime Reality Check** - Answer the thirteen unknowns that gate every downstream budget
- [ ] **Phase 1: Skeleton & Persistence** - Monorepo, ingestion pipeline, bounded queue, content-addressed SQLite
- [ ] **Phase 2: Detection Engine & FP Harness** - Three-tier gate, data-driven detectors, measured false-positive rate in CI
- [ ] **Phase 3: Passive Intelligence Core** - Secrets, hosts, JWTs, endpoints — no outbound traffic
- [ ] **Phase 4: Workspace, Findings & Retroactive Scan** - The tool becomes usable
- [ ] **Phase 5: Sourcemaps, Chunk Graph & Active Retrieval** - Reconstruct source, enumerate lazy chunks, go active
- [ ] **Phase 6: Syntax Intelligence & Supply Chain** - AST tier for replayable endpoints; dependency and library intelligence
- [ ] **Phase 7: Hardening & Store Release** - Survive hostile input, prove the numbers, ship

## Phase Details

### Phase 0: Runtime Reality Check
**Goal**: Replace every assumption about Caido's QuickJS with a measurement, and write a go/no-go table that fixes the default size, budget, and degradation thresholds.
**Depends on**: Nothing (first phase)
**Requirements**: SPIKE-01, SPIKE-02, SPIKE-03, SPIKE-04, SPIKE-05, SPIKE-06, SPIKE-07, SPIKE-08, SPIKE-09, SPIKE-10, SPIKE-11, SPIKE-12, SPIKE-13
**Success Criteria** (what must be TRUE):
  1. It is known whether a catastrophic regex hangs the plugin forever inside Caido, and whether `re2js` is an acceptable escape hatch — the detection engine's design depends on the answer
  2. It is known whether `setTimeout(fn, 0)` yields the QuickJS event loop; if it does not, the budget-and-background strategy is replaced before any code depends on it
  3. The `sdk.requests.send()` cliff is measured on the target Caido version, and it is known whether `caido:http` `fetch` shares the leak
  4. An event matrix documents which Caido surfaces fire `onInterceptResponse`, and whether plugin-originated sends re-enter the pipeline
  5. Real CPU, RSS, and stack limits inside Caido are measured, and every size ceiling in the design is set from those numbers rather than from standalone quickjs-ng
  6. A written go/no-go table records each answer and what changes if it is wrong
**Plans**: 4 plans

Plans:
- [ ] 00-01: Probe plugin scaffold — capability probe for `structuredClone`, ES level, stack depth, and `WebAssembly` absence
- [ ] 00-02: Regex safety and event-loop spikes (SPIKE-01, -02, -03, -11)
- [ ] 00-03: Active-request and body-semantics spikes (SPIKE-04, -05, -08, -12)
- [ ] 00-04: Performance, persistence, and identity spikes (SPIKE-06, -07, -09, -10, -13) plus the go/no-go table

### Phase 1: Skeleton & Persistence
**Goal**: A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Depends on**: Phase 0
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, CORE-07, CORE-08, CORE-09, CORE-10, STORE-01, STORE-02, STORE-03, STORE-04, STORE-05, STORE-06, STORE-07, DIST-05, DIST-06
**Success Criteria** (what must be TRUE):
  1. The `onInterceptResponse` handler is non-async, gates cheaply, enqueues, and returns — analysis never happens inline
  2. The work queue is bounded and its overflow is visible; it can never grow without limit the way JS-Analyzer's does
  3. Exactly one CPU consumer drains the queue, and the maximum synchronous slice it holds is recorded in telemetry
  4. Browsing a 200-chunk SPA leaves the plugin's own UI and RPC responsive throughout
  5. Artifacts persist across a Caido restart, are keyed by `project_id`, and identical content served twice is stored once
  6. A CI gate fails the build if the backend bundle imports any Node built-in
**Plans**: 4 plans

Plans:
- [ ] 01-01: Monorepo scaffold with pinned dependencies, SDK-free engine workspace, vitest, lint, typecheck, and the Node-builtin CI assertion
- [ ] 01-02: Ingestion — admission filter, bounded queue, single CPU consumer, chunker with yield, wall-clock deadlines
- [ ] 01-03: SQLite layer — schema, migrations, project scoping, content-addressed artifacts, retention
- [ ] 01-04: Lifecycle — project switch cancellation, restart recovery, slice telemetry

### Phase 2: Detection Engine & FP Harness
**Goal**: A detector framework that is data-driven, ReDoS-safe, and whose false-positive rate is a number printed by CI — established before the corpus grows.
**Depends on**: Phase 1
**Requirements**: DET-01, DET-02, DET-03, DET-04, DET-05, DET-06, DET-07, DET-08, DET-09, DET-10, QUAL-01, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):
  1. Detectors are declarative data, and adding one is a small testable unit requiring no engine change
  2. The engine runs under plain vitest with zero Caido imports, so the corpus is testable without the platform
  3. A deliberately catastrophic regex fails CI rather than reaching the runtime
  4. The three-tier gate is measurably cheaper than naive full-body matching on a real bundle
  5. Both corpora run in CI, findings-per-MB and recall are printed on every rule change, and a regression fails the build
  6. Confidence combines multiple signals; no detector can reach high confidence on entropy alone
**Plans**: 4 plans

Plans:
- [ ] 02-01: Detector interface, rule schema, and the `indexOf` prefilter tier
- [ ] 02-02: Regex tier with bounded windows, per-rule compilation, and the CI ReDoS gate
- [ ] 02-03: Multi-signal confidence scorer with explanations
- [ ] 02-04: Negative and positive corpora, the FP harness, and CI wiring

### Phase 3: Passive Intelligence Core
**Goal**: Replace JSMiner's and JS-Analyzer's highest-value behaviour with something quieter and better-evidenced — entirely passively, with zero outbound traffic.
**Depends on**: Phase 2
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, ENDP-01, ENDP-03, ENDP-06
**Success Criteria** (what must be TRUE):
  1. Provider-specific detectors cover the high-value providers, each with its own shape and context requirements
  2. Public-by-design keys — Firebase `apiKey`, Stripe `pk_live_`, Sentry DSN, Algolia search keys — are suppressed, and the suppression is proven by the corpus
  3. No raw secret value is ever written to SQLite, logs, or a frontend event; storage is fingerprint plus redacted preview
  4. A secret's real value can still be revealed, by reloading the original request and re-verifying the body hash
  5. Hosts, subdomains, private IPs, cloud resources, and JWT claims are extracted and typed
  6. Measured findings-per-MB on the negative corpus is lower than JS-Analyzer's on the same corpus
  7. The plugin makes no outbound request at all in this phase
**Plans**: 4 plans

Plans:
- [ ] 03-01: Provider secret detectors from the permissive corpus, with the public-by-design allowlist
- [ ] 03-02: Contextual generic-secret detection with entropy as one signal among several
- [ ] 03-03: Fingerprint storage, redaction, and hash-verified reveal
- [ ] 03-04: Host, subdomain, cloud-resource, JWT, and regex-tier endpoint extraction

### Phase 4: Workspace, Findings & Retroactive Scan
**Goal**: Turn the database into something an operator actually reads — and make the analysis apply to traffic captured before the plugin was installed.
**Depends on**: Phase 3
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, FIND-01, FIND-02, FIND-03, FIND-04, ENDP-04
**Success Criteria** (what must be TRUE):
  1. A sidebar page answers "every secret / endpoint / host on this target", not just "what is in the response I have open"
  2. Tables stay responsive at thousands of rows, and a heavy browsing session does not flood the UI with events
  3. Every entity links back to its source request, artifact version, and byte offsets, and shows why it scored as it did
  4. Native Caido Findings are created only for high-signal results, deduplicated, and hint-grade results never project
  5. A retroactive HTTPQL-filtered scan of existing traffic runs, reports progress, and can be cancelled and resumed
  6. Degraded or partial analyses are visibly marked as such
**Plans**: 5 plans

Plans:
- [ ] 04-01: Sidebar page shell, navigation, and settings surface
- [ ] 04-02: Findings tables — keyset pagination, virtualised scrolling, filtering, coalesced events
- [ ] 04-03: Evidence view, score explanations, and Replay handoff
- [ ] 04-04: Native Caido Findings projection with stable dedupe keys
- [ ] 04-05: Retroactive scan with HTTPQL push-down, resumable cursor, progress, and cancellation

### Phase 5: Sourcemaps, Chunk Graph & Active Retrieval
**Goal**: Recover developer-readable source, enumerate code the browser has not loaded yet, and turn on the active features — the capabilities no other Caido plugin has.
**Depends on**: Phase 4
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, MAP-06, MAP-07, CHUNK-01, CHUNK-02, CHUNK-03, CHUNK-04, ACTIVE-01, ACTIVE-02, ACTIVE-03, ACTIVE-04, ACTIVE-05, ACTIVE-06, ACTIVE-07
**Success Criteria** (what must be TRUE):
  1. Sources are reconstructed from `sourcesContent` without VLQ decoding on the primary path, and are themselves analysed once per content hash
  2. Reconstructed files land only on content-addressed safe paths; a malicious-`sources` fixture suite writes nothing outside the output directory on any platform
  3. `chunkId → URL` is resolved from real bundler manifests — actual enumeration, not bundler fingerprinting — and never by `eval()`
  4. Active `.map` probing works by default per the operator decision, with a visible cumulative send counter so a Caido abort is attributable
  5. Plugin-generated traffic does not re-enter the analysis pipeline as new work
  6. Every outbound request is written to an auditable log
  7. Malformed maps, decompression bombs, and reference cycles stay within limits
**Plans**: 5 plans

Plans:
- [ ] 05-01: Sourcemap discovery, `sourcesContent` reconstruction, and safe content-addressed writing
- [ ] 05-02: Reconstructed-source analysis, browsing, and manifest export
- [ ] 05-03: Chunk graph — parser-based manifest resolution for webpack, Vite, Next, Nuxt
- [ ] 05-04: Active retrieval — `.map` probing, chunk fetching, scope enforcement, recursion guard, send counter, audit log
- [ ] 05-05: Hostile-input fixture suite for maps and chunk graphs

### Phase 6: Syntax Intelligence & Supply Chain
**Goal**: Use the AST tier to emit replayable requests rather than URL strings, and add dependency intelligence without repeating JSMiner's public-name-equals-vulnerability mistake.
**Depends on**: Phase 5, and the Phase 0 parser verdict
**Requirements**: ENDP-02, ENDP-05, SUPPLY-01, SUPPLY-02, SUPPLY-03, SUPPLY-04, SUPPLY-05, SEC-07
**Success Criteria** (what must be TRUE):
  1. The AST tier runs only below the Phase 0 threshold, degrades to tokenizer then regex-only on size or failure, and records which tier produced each finding
  2. Extracted endpoints carry method, path template, query keys, content type, and headers — enough to create a working Replay request in one click
  3. Parse failure never suppresses results the lexical tier already found
  4. GraphQL operations are extracted and normalised, with no automatic introspection request
  5. Dependency-confusion lookups are concurrent, rate-limited, cached, and deduplicated; public absence alone never yields high confidence
  6. Library CVE findings require an exact version and are Informational, never High
  7. Secret validation exists, is OFF by default, names the outbound host before running, and is read-only
**Plans**: 5 plans

Plans:
- [ ] 06-01: Meriyah adapter with nesting pre-scan, `structuredClone` guard, and tiered degradation
- [ ] 06-02: AST endpoint extraction producing replayable request specs
- [ ] 06-03: GraphQL operation extraction and normalisation
- [ ] 06-04: Dependency confusion with concurrency, caching, and rate limiting; retire.js library fingerprinting
- [ ] 06-05: Provider secret validation, default-off, reimplemented from provider documentation

### Phase 7: Hardening & Store Release
**Goal**: Make DefMiner safe under hostile input, boring under daily proxy load, and publishable.
**Depends on**: Phase 6
**Requirements**: QUAL-04, QUAL-05, QUAL-06, DIST-01, DIST-02, DIST-03, DIST-04, DIST-07
**Success Criteria** (what must be TRUE):
  1. A poison-bundle fixture — adversarial syntax, deep nesting, decompression bombs, catastrophic-regex bait — completes within budget without crashing
  2. A multi-hour soak over mixed real bundles shows no growing heap, no stuck jobs, no cross-project leakage, and no duplicate findings
  3. The measured false-positive rate is published in the README as a number, not a claim
  4. The README discloses every external service contacted and why
  5. No telemetry, no obfuscation, and no self-update mechanism exists anywhere in the bundle
  6. A rule-only patch release can ship without touching plugin code
  7. The plugin is submitted to the Caido Community Store
**Plans**: 4 plans

Plans:
- [ ] 07-01: Adversarial and poison-bundle fixture suite
- [ ] 07-02: Sustained soak, crash recovery, project-switch, and migration upgrade tests
- [ ] 07-03: README with disclosures and published FP rate, LICENSE, attributions, SBOM
- [ ] 07-04: Release engineering — signing, versioned rule packs, store submission

---

## Requirement Traceability

| Requirement group | Phase |
|---|---|
| SPIKE-01 … SPIKE-13 | Phase 0 |
| CORE-01 … CORE-10, STORE-01 … STORE-07, DIST-05, DIST-06 | Phase 1 |
| DET-01 … DET-10, QUAL-01, QUAL-02, QUAL-03 | Phase 2 |
| SEC-01 … SEC-06, ENDP-01, ENDP-03, ENDP-06 | Phase 3 |
| UI-01 … UI-09, FIND-01 … FIND-04, ENDP-04 | Phase 4 |
| MAP-01 … MAP-07, CHUNK-01 … CHUNK-04, ACTIVE-01 … ACTIVE-07 | Phase 5 |
| ENDP-02, ENDP-05, SUPPLY-01 … SUPPLY-05, SEC-07 | Phase 6 |
| QUAL-04, QUAL-05, QUAL-06, DIST-01 … DIST-04, DIST-07 | Phase 7 |

**Coverage:** 89 v1 requirements, all mapped. 0 unmapped.

## Deferred to v2

DIFF-01 (cross-deploy diffing, blocked on the asset-identity problem), DOM-01 (`domloggerpp-caido` owns this niche with a better technique), CSP-01 (hands off to `csp-auditor`), AST-02, RULE-01.

---
*Roadmap created: 2026-08-20*
