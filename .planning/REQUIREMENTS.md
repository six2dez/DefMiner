# Requirements: DefMiner

**Defined:** 2026-08-20
**Core Value:** When a target's JavaScript contains something that expands the attack surface, DefMiner surfaces it — with a low enough false-positive rate that the operator actually reads every finding.

Requirement IDs are stable. Evidence for the non-obvious ones lives in `.planning/research/SUMMARY.md`.

---

## v1 Requirements

### Feasibility gates (SPIKE)

These run first and can invalidate the design. Each is cheap; several change every size ceiling downstream.

- [ ] **SPIKE-01**: Determine whether a catastrophic regex hangs the plugin forever inside Caido, and whether `re2js` is a viable escape hatch at acceptable cost. *(Caido installs no QuickJS interrupt handler — `set_interrupt_handler` appears nowhere in `caido/dependency-llrt`, so `lre_check_timeout` is inert.)*
- [ ] **SPIKE-02**: Confirm `setTimeout(fn, 0)` actually yields the QuickJS event loop. If it does not, budget-and-background does not work and the ingestion design must change.
- [ ] **SPIKE-03**: Determine what Caido does with `onInterceptResponse` events the plugin cannot consume fast enough — queue unboundedly, drop, or backpressure.
- [ ] **SPIKE-04**: Reproduce `caido/caido#2211` on the target Caido version; measure the current `sdk.requests.send()` cliff and whether `caido:http` `fetch` shares the leak.
- [ ] **SPIKE-05**: Build the event matrix — does `sdk.requests.send()` re-fire `onInterceptResponse`? Do Replay, Automate, imports, and workflows fire it? Does `save:false` or `plugins:false` change it?
- [ ] **SPIKE-06**: Measure real CPU and RSS budgets inside Caido (not standalone quickjs-ng), and find where the 512 KiB stack actually breaks.
- [ ] **SPIKE-07**: Confirm `structuredClone` exists in Caido's runtime — `meriyah@7` needs it in `cloneIdentifier()` or ordinary destructuring throws `ReferenceError`.
- [ ] **SPIKE-08**: Determine whether proxied bodies are stored decompressed, and whether `Body.length` equals `toRaw().length`.
- [ ] **SPIKE-09**: Verify `PRAGMA` and `BEGIN`/`COMMIT` survive across `exec` calls on the pooled SQLite connection.
- [ ] **SPIKE-10**: Measure the content-hash cache hit rate on real browsing. *(Biggest single performance lever — at 40% instead of 90%, CPU cost is 6× budget.)*
- [ ] **SPIKE-11**: Determine whether 304s and cached responses reach the hook at all — decides whether retroactive scanning is optional or mandatory for correctness.
- [ ] **SPIKE-12**: Establish `llrt/fs` containment behaviour with no `realpath` and no `lstat` available.
- [ ] **SPIKE-13**: Design a stable asset identity across deploys. *(Open problem: Next.js `/_next/static/<buildId>/` changes wholesale each deploy, so URL is useless as identity; content hash identifies exactly what changed.)*

### Ingestion pipeline (CORE)

- [ ] **CORE-01**: `onInterceptResponse` handler is non-async, applies cheap admission gates, enqueues the request ID, and returns. It never analyses inline.
- [ ] **CORE-02**: Admission filter gates on content type, URL extension, response size, and Caido scope before anything is enqueued.
- [ ] **CORE-03**: The work queue is bounded, with visible overflow. It is never an unbounded array. *(JS-Analyzer's `autoScanQueue` is pushed to and drained by nothing — the failure mode to avoid.)*
- [ ] **CORE-04**: Exactly one CPU consumer processes the queue. Concurrency is 1, because the runtime is single-threaded and higher concurrency only multiplies peak memory and latency.
- [ ] **CORE-05**: The consumer reloads work via `sdk.requests.get(id)` rather than retaining SDK objects across `await` points.
- [ ] **CORE-06**: Analysis is chunked at 64 KB with 4 KB overlap and yields between chunks, capping the synchronous block at ~27 ms.
- [ ] **CORE-07**: Wall-clock deadlines are checked between chunks; exceeding budget degrades the result to a recorded partial state rather than freezing.
- [ ] **CORE-08**: Content identical to something already analysed at the current detector-corpus version is never re-analysed.
- [ ] **CORE-09**: Project switches cancel in-flight work and never leak results across projects.
- [ ] **CORE-10**: Telemetry records the maximum synchronous slice actually observed in the field, so the budget is provable rather than asserted.

### Persistence (STORE)

- [ ] **STORE-01**: SQLite schema via `sdk.meta.db()` covering artifacts, occurrences, analyses, entities, evidence, and audit.
- [ ] **STORE-02**: Every table includes `project_id` in its key. *(`sdk.meta.db()` is plugin-global, not project-scoped — verified against authmatrix.)*
- [ ] **STORE-03**: Artifacts are content-addressed by digest, decoupling identity from URL.
- [ ] **STORE-04**: Analysis rows record the detector-corpus version, so a corpus bump invalidates the right cache entries.
- [ ] **STORE-05**: Schema migrations run forward on upgrade and are tested against a populated database.
- [ ] **STORE-06**: Retention policy bounds database and disk growth.
- [ ] **STORE-07**: All SQL uses positional `?` parameters. *(Named parameters are unsupported.)*

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
- [ ] **ACTIVE-02**: A cumulative send counter is surfaced as diagnostics — not a limit — so an abort is attributable rather than mysterious.
- [ ] **ACTIVE-03**: Target-directed requests use `sdk.requests.send` so they inherit Caido's routing, auth context, and appear in history. Third-party calls use `caido:http` `fetch`.
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
- [ ] **FIND-03**: Retroactive scanning of already-captured traffic via `sdk.requests.query()` with HTTPQL push-down, page size 20, and a resumable cursor. *(No `includeRaw(false)` on the backend query, so the documented 1000 page size is not usable.)*
- [ ] **FIND-04**: Retroactive scans report progress and are cancellable.

### Signal quality (QUAL)

- [ ] **QUAL-01**: A negative corpus of real popular npm dist bundles plus a synthetic bundle of known-benign lookalikes, where **every finding is by definition a false positive**. Result is reported as findings per MB.
- [ ] **QUAL-02**: A positive corpus of format-valid, revoked or canary keys per supported provider, reporting recall.
- [ ] **QUAL-03**: Both corpora run in CI on every rule change, and a regression fails the build.
- [ ] **QUAL-04**: The measured false-positive rate is published in the README. *(Core Value is a release gate, not an aspiration.)*
- [ ] **QUAL-05**: A poison-bundle fixture — adversarial syntax, deep nesting, decompression bombs, catastrophic-regex bait — completes within budget without crashing.
- [ ] **QUAL-06**: A sustained soak over mixed real bundles shows no growing heap, no stuck jobs, no cross-project leakage, and no duplicate findings.

### Distribution (DIST)

- [ ] **DIST-01**: LICENSE file present, license clearly indicated, third-party attributions complete.
- [ ] **DIST-02**: README discloses every external service contacted and why — NPM registry, and any opt-in validation endpoints. *(Required by the Caido Developer Policy.)*
- [ ] **DIST-03**: No client-side telemetry, no obfuscated code, and **no plugin self-update mechanism**. *(All three are explicitly Not Allowed.)*
- [ ] **DIST-04**: Detector corpus ships as versioned bundled assets and can be updated by a patch release without touching plugin code.
- [ ] **DIST-05**: A CI gate asserts the built backend bundle imports no Node built-ins. *(`caido-dev` sets `config: false` and `external: [...builtinModules]`, so a dependency importing `fs` builds silently and fails only on the user's machine.)*
- [ ] **DIST-06**: Dependency versions pinned against the known exact-pin traps — `@caido/primevue` peer-depends on `primevue` exactly `4.1.0`; `@caido/tailwindcss` hard-depends on `tailwindcss@3.4.13` using the v3 API that v4 removed.
- [ ] **DIST-07**: Submitted to the Caido Community Store.

---

## v2 Requirements

Tracked, deliberately not in the v1 roadmap.

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
- v1 requirements: 89 total
- Mapped to phases: pending roadmap
- Unmapped: pending roadmap

---
*Requirements defined: 2026-08-20*
