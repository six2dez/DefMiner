# DefMiner adversarial plan review 01

**Reviewed:** 2026-08-20

**Decision:** **NO-GO on executing the roadmap as written.** Keep the product thesis and the Phase 0 idea, but rewrite the requirement set and phase graph before implementation. The fixed decision to ship active `.map` probing ON by default and without a total request budget is accepted here; this review attacks the missing engineering around that decision, not the decision itself.

## Executive finding

The plan has four plan-changing defects:

1. Parts of Phases 2 and 5 require the AST/parser substrate that is not built until Phase 6.
2. `ACTIVE-03` asserts an authentication property the Caido SDK does not provide: `sdk.requests.send()` respects upstream proxy settings, but a URL-built `RequestSpec` does not inherit cookies, authorization headers, or the originating request. The active path has neither a safe credential-cloning policy nor redirect credential stripping.
3. The plan does not contain 89 v1 requirements. It contains **102**. The coverage claim is arithmetically false and understates scope by 13 requirements, or 14.6%.
4. A volatile on-screen send counter is not survivability engineering for a known process-abort failure. The counter and audit record must be write-ahead and restart-readable, and the plugin needs crash-loop recovery.

The good parts can be stated briefly: the bounded single-consumer pipeline, SQLite project scoping, redacted secret persistence, and selective Caido Findings projection are the right foundations. They do not repair the phase graph or the missing lifecycle contracts.

## Verification baseline — facts checked rather than recalled

These are current as of this review:

- Caido's release API still reports **0.57.1** as latest: [official release endpoint](https://api.caido.io/releases/latest).
- The current Events reference still says `onInterceptResponse` is asynchronous and cannot modify responses, while `onUpstream` is synchronous: [Events SDK](https://developer.caido.io/plugins/reference/sdks/backend/events.html).
- The current Requests reference says `Body.length` is bytes, `toText()` replaces unprintable characters, `RequestSpec(url)` starts as a new GET request, `Request.toSpec()` copies an existing request, `send()` respects upstream proxy settings, and `save`/`plugins` default to `true`: [Requests SDK](https://developer.caido.io/plugins/reference/sdks/backend/requests.html).
- The current manifest schema still has no minimum-Caido-version field, while Caido explicitly documents `sdk.runtime.version` checks: [manifest reference](https://developer.caido.io/plugins/reference/manifest.html), [runtime-version guide](https://developer.caido.io/plugins/guides/runtime).
- `caido/caido#2211` is still open and tagged in open issue queries: [issue #2211](https://github.com/caido/caido/issues/2211).
- The current `caido` LLRT branch still sets a 512 KiB stack and 20 MB GC threshold, but no memory limit or interrupt handler in VM construction; its release profile still uses `panic = "abort"`: [`vm.rs`](https://github.com/caido/dependency-llrt/blob/caido/llrt_core/src/vm.rs), [`Cargo.toml`](https://github.com/caido/dependency-llrt/blob/caido/Cargo.toml).
- The current Findings SDK still exposes create/exists/get, not update/delete: [Findings SDK](https://developer.caido.io/plugins/reference/sdks/backend/findings).

## Ranked findings — phase ordering and dependency failures first

### 1. BLOCKER — the phase graph is not executable

#### 1.1 Phase 2 claims an AST tier that does not exist until Phase 6

`DET-01` requires `indexOf -> regex -> AST`, and Phase 2 success criterion 4 says that three-tier gate is measured. But Phase 2 contains no parser adapter. The first parser implementation is plan `06-01`, four phases later. Phase 2 can therefore only pass by faking the AST tier, treating an interface stub as implementation, or violating its own requirement.

**Required change:** split `DET-01` into `DET-01A` (literal and bounded-regex tiers, Phase 2) and `AST-01` (parser/tokenizer/degradation substrate, before any AST consumer). If AST remains post-v1, remove it from the Phase 2 goal and success criteria.

**Evidence:** [REQUIREMENTS.md:55](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:55) — `DET-01`; [ROADMAP.md:62](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:62) — Phase 2; [ROADMAP.md:147](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:147) — first actual AST adapter.

#### 1.2 Phase 5's generic chunk resolver depends on the same future parser

`CHUNK-01` promises webpack, Vite, Next and Nuxt resolution; `CHUNK-03` requires parsing; plan `05-03` explicitly says “parser-based manifest resolution.” Generic webpack runtime resolution is AST/symbolic work, yet the Meriyah adapter arrives in Phase 6. The feature research itself states that generic webpack Tier 4 requires the AST pass.

**Required change:** split chunk work. Put JSON/manifest/literal adapters for Next/Vite/Nuxt in a non-AST requirement; move generic webpack symbolic resolution after `AST-01`. Do not let “parser-based” mean a new ad hoc parser hidden inside Phase 5.

**Evidence:** [REQUIREMENTS.md:97](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:97) — `CHUNK-01`, `CHUNK-03`; [ROADMAP.md:121](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:121) — Phase 5; [ROADMAP.md:157](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:157) — `06-01`; [FEATURES.md:412](/Users/six2dez/Tools/DefMiner/.planning/research/FEATURES.md:412).

#### 1.3 Phase 3 overclaims endpoint coverage before syntax intelligence exists

`ENDP-01` says extraction covers `fetch`, XHR, axios/ky instances, WebSocket, EventSource and `sendBeacon`, but Phase 3 plan `03-04` is explicitly regex-tier extraction. “Covers” is trivially met by fragile name regexes, even though the project says call-site structure is the value.

**Required change:** split `ENDP-01` into a lexical v1 contract with an enumerated fixture set and an AST contract colocated with `ENDP-02`. Do not credit regex sightings of method names as axios-instance or request extraction.

**Evidence:** [REQUIREMENTS.md:78](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:78) — `ENDP-01`; [ROADMAP.md:81](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:81) — Phase 3 and plan `03-04`; [REQUIREMENTS.md:79](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:79) — `ENDP-02` deferred to Phase 6.

### 2. BLOCKER — `ACTIVE-03` is based on a false SDK premise

The requirement says target-directed requests use `sdk.requests.send()` “so they inherit Caido's routing, auth context.” Only the routing half is supported by the SDK contract. `send()` respects upstream proxy settings. A `new RequestSpec(url)` is a new GET request; it does not inherit Cookie, Authorization, custom headers, connection/SNI choices, or the original request's virtual-host state. Copying those credentials indiscriminately is worse: a cross-origin map URL or redirect can exfiltrate them.

This omission makes default-on probing either ineffective against authenticated assets or dangerous.

**Required change to `ACTIVE-03`/`ACTIVE-04`:** define a request-derivation contract:

- same-origin candidates clone the source request with `request.toSpec()`, change it to a bodyless GET, and remove request-body headers;
- cross-origin candidates start from a clean `RequestSpec` and receive no Cookie/Authorization/Proxy-Authorization values;
- scope and origin are checked on the resolved URL immediately before dispatch, not only at discovery;
- redirects are bounded, every hop is scope-checked, and credentials are stripped before an origin change;
- SNI/Host and query resolution have fixtures, including relative, protocol-relative, query-bearing and encoded `sourceMappingURL` values.

**Evidence:** [REQUIREMENTS.md:114](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:114) — `ACTIVE-03`, `ACTIVE-04`; [REQUIREMENTS.md:87](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:87) — `MAP-01`; [PROJECT.md:117](/Users/six2dez/Tools/DefMiner/.planning/PROJECT.md:117). Verified SDK behavior: [Requests SDK](https://developer.caido.io/plugins/reference/sdks/backend/requests.html).

### 3. HIGH — “89 requirements” is false; there are 102

The v1 groups sum to:

| Group | Count | Phase |
|---|---:|---:|
| SPIKE | 13 | 0 |
| CORE + STORE + DIST-05/06 | 19 | 1 |
| DET + QUAL-01 through QUAL-03 | 13 | 2 |
| SEC-01/06 + ENDP-01/03/06 | 9 | 3 |
| UI + FIND + ENDP-04 | 14 | 4 |
| MAP + CHUNK + ACTIVE | 18 | 5 |
| ENDP-02, ENDP-05 + SUPPLY + SEC-07 | 8 | 6 |
| QUAL-04/06 + DIST-01/04/07 | 8 | 7 |
| **Total** | **102** | |

The five v2 IDs bring the file to 107 unique requirement IDs. Traceability maps the groups, but its numerical claim of “89” is wrong. This is not cosmetic: the roadmap understates v1 scope by 13 requirements.

**Required change:** make requirement counting generated, not handwritten, and have CI fail on duplicate, unmapped, multiply-mapped, malformed, or count-mismatched IDs.

**Evidence:** [REQUIREMENTS.md:10](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:10) — `SPIKE-01` through `DIST-07`; [REQUIREMENTS.md:195](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:195) — false count; [ROADMAP.md:185](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:185) — false coverage count.

### 4. HIGH — two Phase 4 consumers precede their producers

- `UI-05` requires a reconstructed-source viewer in Phase 4, but reconstruction and `MAP-07` arrive in Phase 5. A mock viewer is not completion.
- `ENDP-04` requires one-click Replay in Phase 4, but `ENDP-02` does not produce a replayable request until Phase 6. Caido Replay needs either an existing request ID or a raw/spec request with connection information; a URL string is not the promised replayable request.

**Required change:** move `UI-05` with `MAP-07`; move the full `ENDP-04` with `ENDP-02`. Phase 4 may offer “open source request in Replay,” but that is a different, explicitly named requirement.

**Evidence:** [REQUIREMENTS.md:126](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:126) — `UI-05`; [REQUIREMENTS.md:93](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:93) — `MAP-07`; [REQUIREMENTS.md:79](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:79) — `ENDP-02`, `ENDP-04`; [ROADMAP.md:101](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:101). Verified Replay input contract: [Replay guide](https://developer.caido.io/plugins/guides/replay.html).

### 5. HIGH — detector tuning is scheduled before the richer input class exists

`MAP-06` makes reconstructed sources re-enter analysis, but it is in Phase 5, after the detector engine, false-positive corpora and all passive detectors are declared complete. The feature research explicitly says sourcemap extraction must precede detector tuning because reconstructed source restores comments, identifiers and source-language files. A corpus tuned only on minified distributions does not validate behavior on reconstructed TypeScript, TSX, Vue sources, source paths, test fixtures and vendor code.

**Required change:** either move passive sourcemap reconstruction (`MAP-01`, `MAP-02`, `MAP-04`, `MAP-05`, `MAP-06`) ahead of the final detector-quality gate, or add a reconstructed-source positive/negative corpus and require all Phase 2/3 rules to rerun and requalify when Phase 5 lands. Active blind probing remains in its fixed default-on phase.

**Evidence:** [REQUIREMENTS.md:92](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:92) — `MAP-06`; [REQUIREMENTS.md:141](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:141) — `QUAL-01` through `QUAL-03`; [ROADMAP.md:62](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:62) — Phases 2/3 precede Phase 5; [FEATURES.md:431](/Users/six2dez/Tools/DefMiner/.planning/research/FEATURES.md:431).

### 6. HIGH — hostile-input hardening is treated as a final phase

`QUAL-05` and most of `QUAL-06` sit in Phase 7, after regexes, map parsing, filesystem writes and AST parsing have already been called complete. A late poison corpus will find architectural defects after schemas and APIs have solidified. The Phase 5 hostile-map plan partly repairs this for maps, but there is still no top-level consumer isolation requirement.

**Required change:** move the relevant adversarial fixtures into the phase that introduces each interpreter boundary: regex poison in Phase 2, decoding/Unicode in Phase 1/2, map bombs and paths in Phase 5, AST depth/syntax in the AST phase. Phase 7 reruns the combined suite; it must not be the first time it exists.

**Evidence:** [REQUIREMENTS.md:145](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:145) — `QUAL-05`, `QUAL-06`; [ROADMAP.md:163](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:163); [REQUIREMENTS.md:59](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:59) — `DET-05`; [REQUIREMENTS.md:91](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:91) — `MAP-05`.

### 7. MEDIUM — Phase 0 contains work for a feature explicitly deferred to v2

`SPIKE-13` is a stable cross-deploy asset-identity design spike, but `DIFF-01` is v2. This is neither cheap nor gating for v1, and the research calls it unsolved. It should not block every v1 phase.

**Required change:** move `SPIKE-13` beside `DIFF-01` in the v2 backlog. Do not design an identity abstraction now unless a v1 requirement consumes it.

**Evidence:** [REQUIREMENTS.md:28](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:28) — `SPIKE-13`; [REQUIREMENTS.md:164](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:164) — `DIFF-01`; [ROADMAP.md:24](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:24).

## Missing work — no requirement currently owns these contracts

Every item below has **no requirement ID**. The cited IDs are the nearest apparent owners and show why the existing language is insufficient.

### A. Error containment and durable job recovery — missing `ERR-*`

`CORE-03`/`CORE-04` define a queue and consumer, but nothing requires:

- a top-level `try/finally` that leaves the consumer alive after one detector throws;
- per-detector isolation so one bad rule marks that detector/run failed without suppressing other results;
- a terminal job state on decode, hash, DB, parser, RPC and network errors;
- stale-`running` recovery after restart;
- bounded retry rules and a visible dead-letter/error queue;
- sanitized local diagnostics with stable error codes and no secret values.

Add `ERR-01` through `ERR-05`, and make a deliberately throwing detector plus forced DB/network failures executable tests. `STORE-01` naming an `audit` table is not an error-handling contract.

**Nearest IDs:** [REQUIREMENTS.md:34](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:34) — `CORE-03`, `CORE-04`, `CORE-07`; [REQUIREMENTS.md:45](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:45) — `STORE-01`; [ROADMAP.md:60](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:60) — lifecycle plan.

### B. Observability is underspecified and conflicts in terminology — missing `OBS-*`

`CORE-10` says “telemetry,” while `DIST-03` and the project forbid telemetry. The apparent intent is local operational metrics, but the plan never says that. A store user needs a Health/Activity view containing queue depth, drop count, oldest-job age, scan states/reasons, max slice, cache hit rate, DB/schema version, disk use/quota, rule/parser/plugin/Caido versions, active send state and error counts by stage. It also needs a redacted diagnostic export.

Rename this **local diagnostics**, state that nothing leaves the instance, and add `OBS-01` through `OBS-03`.

**Nearest IDs:** [REQUIREMENTS.md:41](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:41) — `CORE-10`; [REQUIREMENTS.md:152](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:152) — `DIST-03`; [REQUIREMENTS.md:130](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:130) — `UI-09`.

### C. Upgrade/reinstall/downgrade behavior is not a migration strategy — missing `UPGRADE-*`

`STORE-05` covers forward SQLite migrations only. A real plugin update also changes settings schema, bundled corpus identity, HMAC/fingerprint keys, cached analysis rows, reconstructed-object layout, retention metadata and in-flight jobs. The plan has no pre-migration backup, atomic migration marker, failure quarantine, retry behavior, downgrade policy, or guarantee that reinstalling the same package ID preserves and recognizes existing data.

Add requirements for:

1. upgrade fixtures from every supported released schema/config/layout;
2. a write-ahead migration state plus backup/quarantine path;
3. HMAC key continuity and explicit rotation behavior;
4. deterministic re-analysis after corpus changes without a startup thundering herd;
5. a documented downgrade policy and clean recovery from an interrupted migration.

The Phase 7 phrase “migration upgrade tests” is too late and tests only one component.

**Nearest IDs:** [REQUIREMENTS.md:49](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:49) — `STORE-05`; [REQUIREMENTS.md:48](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:48) — `STORE-04`; [REQUIREMENTS.md:71](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:71) — `SEC-04`, `SEC-05`; [ROADMAP.md:179](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:179).

### D. Caido SDK compatibility is missing — missing `COMPAT-*`

The current manifest cannot declare a minimum Caido version. The plan pins build dependencies but never requires frontend and backend startup guards, a supported-version declaration, or an ongoing compatibility matrix. An old or newly breaking Caido build may install the plugin and fail inside `init()` after hooks partly register.

Add:

- minimum-supported/current Caido integration tests for every release;
- a version guard in both frontend and backend before hooks/jobs register;
- an unsupported-version UI that performs no passive or active work;
- a release-watch job that tests every new Caido stable build and requires compatibility review before SDK bumps;
- an SDK-contract smoke suite covering startup, hook delivery, DB, RPC, Replay, Findings and active send.

**Nearest IDs:** [REQUIREMENTS.md:154](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:154) — `DIST-05`, `DIST-06`; [REQUIREMENTS.md:156](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:156) — `DIST-07`; [ROADMAP.md:57](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:57). Verified gap and remedy: [manifest reference](https://developer.caido.io/plugins/reference/manifest.html), [runtime-version guide](https://developer.caido.io/plugins/guides/runtime).

### E. Encoding, Unicode and IDNA correctness are absent — missing `ENC-*`

`SPIKE-08` asks about decompression, not decoding. `CORE-06` prescribes character chunking and `UI-03` promises byte offsets, but there is no bytes-to-text policy. Current Caido documents that `toText()` replaces unprintable bytes; that breaks hashes and byte offsets. The plan also promises subdomain/host classification without requiring a Public Suffix List, IDNA normalization or Unicode/escape handling.

Add requirements for:

- raw-byte hashing and byte-offset truth, with an explicit decoded-index to raw-byte-offset map;
- capability and fixture tests for UTF-8 BOM, UTF-16 BOMs, declared charsets, invalid sequences, mixed-width Unicode and NUL/control characters;
- JavaScript escape decoding (`\uXXXX`, surrogate pairs and escaped URLs) without executing code;
- IDNA/punycode and PSL-correct registrable-domain classification;
- safe rendering/export of bidi/control characters.

**Nearest IDs:** [REQUIREMENTS.md:23](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:23) — `SPIKE-08`; [REQUIREMENTS.md:37](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:37) — `CORE-06`; [REQUIREMENTS.md:83](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:83) — `ENDP-06`; [REQUIREMENTS.md:124](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:124) — `UI-03`. Verified binary caveat: [Caido binary-data guide](https://developer.caido.io/plugins/concepts/binary.html).

### F. The operator cannot triage or recover work — missing `OPS-*`

The UI can list and explain findings but cannot mark confirmed/false-positive/ignored, suppress a rule/value/host with a reason, undo a suppression, manually rescan one asset, force a full scan of a partial asset, retry failed work, or backfill dropped queue entries. That omission directly contradicts the Core Value: even a good detector will produce engagement-specific false positives, and the operator needs a memory of decisions.

Add project-scoped triage/suppression requirements and manual “scan/retry/force/backfill” actions. Suppression must prevent future native Finding projection and survive re-analysis while retaining an audit reason.

**Nearest IDs:** [REQUIREMENTS.md:122](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:122) — `UI-01` through `UI-09`; [REQUIREMENTS.md:134](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:134) — `FIND-01`, `FIND-02`; [REQUIREMENTS.md:38](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:38) — `CORE-07`; [PROJECT.md:11](/Users/six2dez/Tools/DefMiner/.planning/PROJECT.md:11).

### G. UI content is target-controlled, but no frontend security contract exists — missing `UISEC-*`

Names, paths, snippets, map sources and detector explanations all originate in hostile responses. The plan does not prohibit `v-html`, require text rendering/escaping, strip control characters, or test formula injection in CSV exports. A source viewer and CSV export are both attacker-to-operator boundaries.

Add hostile rendering fixtures and CSV formula neutralization while preserving raw JSON semantics.

**Nearest IDs:** [REQUIREMENTS.md:124](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:124) — `UI-03` through `UI-06`; [REQUIREMENTS.md:91](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:91) — `MAP-05` covers filesystem attacks, not UI/export attacks.

### H. “Submitted” is not “published and installable” — `DIST-07` is too weak

The project promises Community Store publication, but `DIST-07` and the Phase 7 criterion stop at submission. A rejected PR satisfies them. The release contract needs acceptance, listing, signed clean-instance installation, upgrade from the previous store version, and a rollback/advisory procedure.

This matters especially under the fixed `.map` default: Caido vets every package and reserves removal for a severely broken plugin. Obtain explicit maintainer pre-clearance for the disclosed known-crash behavior before treating Store distribution as feasible.

**Evidence:** [PROJECT.md:63](/Users/six2dez/Tools/DefMiner/.planning/PROJECT.md:63); [REQUIREMENTS.md:156](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:156) — `DIST-07`; [ROADMAP.md:174](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:174). Store process: [submission guide](https://developer.caido.io/plugins/guides/store.html); vetting/removal: [Developer Policy](https://developer.caido.io/policy).

## False confidence in “independent convergence”

Two LLMs reading the same public SDK reference, the same community repositories and the same QuickJS family are not independent evidence. Their errors and omissions are correlated by source selection. Convergence is useful for prioritizing verification; it does not settle an empirical runtime contract.

The claim that “ingestion, storage, parser choice, and concurrency model are decided” is internally contradicted by thirteen Phase 0 spikes, several of which explicitly say the design must change if the answer is negative.

| Claimed settled conclusion | Actual status | Falsifier / required evidence | IDs affected |
|---|---|---|---|
| `onInterceptResponse` is asynchronous | **Settled as a documented 0.57.1 contract.** Event overflow/backpressure is not settled. | A load trace showing proxy backpressure, event loss or unbounded host buffering changes the coverage claim, not the callback signature. | `SPIKE-03`, `CORE-01`, `CORE-03` |
| Enqueue-only plus `setTimeout(0)` yielding is the architecture | Enqueue-only is prudent; cooperative background progress is open. | If RPC/timers do not get bounded service under chunk load, `CORE-06` is invalid and work needs a different execution model. | `SPIKE-02`, `SPIKE-03`, `CORE-06`, `CORE-07` |
| Meriyah decisively beats Acorn | **Not settled for deployed Caido.** The measurements are standalone quickjs-ng, and Meriyah has `structuredClone`, stack and heap dependencies. | Minimum/current-Caido tests where Meriyah fails syntax, exceeds the memory/time gate, or loses to tokenizer-first behavior. | `SPIKE-06`, `SPIKE-07`, `DET-01`, `ENDP-02` |
| 64 KB/4 KB is the correct chunk geometry | Not settled; it is hard-coded from one machine and one corpus before Phase 0 measurements. | Any supported machine/rule with a >50 ms slice or a legitimate match wider than the overlap. | `CORE-06`, `SPIKE-06` |
| SQLite is the source of truth | Reasonable product decision; transaction, migration, corruption and restart behavior remain open. | Failure injection showing non-convergent partial writes or unrecoverable migrations forces a different write model. | `SPIKE-09`, `STORE-01`, `STORE-05`, missing `UPGRADE-*` |
| ReDoS hangs forever | The risk is source-supported; behavior of the shipped binary still needs the deliberately destructive probe in an isolated disposable instance. | A host interrupt/watchdog that terminates the regex and restores later RPC/events would change the failure model. | `SPIKE-01`, `DET-05`, `QUAL-05` |
| Never persist raw secrets | The policy is settled; HMAC-key lifecycle and raw export are not. | Upgrade/key-loss/export tests revealing correlation loss, unrevealable data, or plaintext spill invalidate the implementation. | `SEC-04`, `SEC-05`, `UI-06`, missing `UPGRADE-*` |

**Evidence for the overclaim:** [SUMMARY.md:13](/Users/six2dez/Tools/DefMiner/.planning/research/SUMMARY.md:13); [SUMMARY.md:17](/Users/six2dez/Tools/DefMiner/.planning/research/SUMMARY.md:17); [SUMMARY.md:33](/Users/six2dez/Tools/DefMiner/.planning/research/SUMMARY.md:33); [ROADMAP.md:9](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:9); `SPIKE-01` through `SPIKE-12` in [REQUIREMENTS.md:16](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:16).

## The fixed `.map` decision — engineering required to make it survivable

No total request-count or byte ceiling is proposed here. “Unbudgeted” must not also mean unjournaled, duplicate, credential-unsafe or crash-looping.

### Required changes

1. **Write-ahead send journal, not a volatile counter.** Before each send, persist `{runtime_session_id, sequence, project_id, source_request_id, normalized_candidate, reason, started_at}`. After completion, add status/result/timing. `ACTIVE-02` currently only says “surfaced”; that evidence disappears with the process. Query values and credential headers must be redacted in the audit record. (`ACTIVE-02`, `ACTIVE-07`)
2. **Crash-loop marker and restart recovery.** On startup, detect an unfinalized send/batch, show “Caido stopped during DefMiner active request N,” retain the exact candidate, and do not automatically replay that unfinished batch until the operator chooses Resume or Discard. New work remains default-on. (`ACTIVE-01`, `ACTIVE-02`; missing `ERR-*`)
3. **Correct request derivation.** Apply the same-origin clone / cross-origin clean request / per-hop credential stripping contract from Finding 2. (`ACTIVE-03`, `ACTIVE-04`)
4. **Transport matrix from `SPIKE-04`.** Use `sdk.requests.send` only where Caido routing/auth context is required. If the spike proves `caido:http` is unaffected, it may handle disclosed third-party calls only; it must not silently bypass the operator's target routing. (`SPIKE-04`, `ACTIVE-03`)
5. **No history flood.** Speculative `.map` misses use `save:false`; successful analysis is attached to the original JS request in DefMiner's DB. Explicitly test that hundreds of 404s do not appear in Search. The SDK documents that unsaved request/response IDs are zero, so native Findings must reference the source JS request, not the probe. (`ACTIVE-03`, `ACTIVE-07`, `FIND-01`)
6. **Attempt each semantic candidate once.** Deduplicate by resolved URL plus relevant auth/origin context, persist negative results, and do not re-probe because a bundle was seen again. This removes accidental duplicates without imposing a total budget. (`CORE-08`, `ACTIVE-01`; add `ACTIVE-08`)
7. **Serialize host-backed sends and release wrappers immediately.** One active host-backed send at a time; extract primitive status/headers/raw bytes and stop retaining Request/Response wrappers across later awaits. This does not cure the cumulative bug, but it reduces live wrapper pressure and makes attribution exact. (`ACTIVE-01`, `ACTIVE-03`; add `ACTIVE-09`)
8. **Target-signal circuit breakers.** Honor `Retry-After`; pause an origin on 429 and stop an origin after explicit 401/403/WAF responses until operator resume. This is error handling, not a lifetime request budget. (`ACTIVE-04`, `ACTIVE-05`; add `ACTIVE-10`)
9. **Self-suppression regardless of spike outcome.** Tag or track every generated request with a short-lived exact fingerprint and reject it in the admission gate before enqueue. Do not condition this safeguard on whether `SPIKE-05` happens to observe recursion in one build. (`ACTIVE-06`, `SPIKE-05`)
10. **Always-visible kill switch and risk zones.** Show per-runtime and per-origin sent/pending counts in the global page chrome; warn when the empirically measured stall/abort zones approach; cancellation must prevent the next dispatch even if analysis is busy. Warning is diagnostic, not a cap. (`ACTIVE-02`, `ACTIVE-05`, `UI-08`)
11. **First-run and Store disclosure.** The UI and README/store listing must say that installation enables target-directed `.map` requests, may generate many 404s and, on affected Caido builds, may terminate the instance and lose temporary projects. README-only disclosure is not enough for an enabled-by-default action. (`DIST-02`, `DIST-07`; add `ACTIVE-11`)
12. **Acceptance test the failure, not just the happy path.** A 300-asset fixture, authenticated map, cross-origin map, redirect, 404/403/429 origin, forced process kill and restart must prove dedupe, credential isolation, journal durability, history cleanliness, self-suppression and crash-loop recovery. (`QUAL-05`, `QUAL-06`)

The current Phase 5 criterion — “works by default” plus a visible counter — can pass while Caido aborts and the evidence disappears. That is not survivability.

## Success criteria quality

### Criteria that are vague or trivially satisfiable

- Phase 0 repeatedly says “it is known.” A prose answer with no reproduction, target build, sample count or threshold passes. (`SPIKE-01` through `SPIKE-13`)
- Phase 1 says the UI/RPC remains “responsive” on 200 chunks without a latency or event-loss bound. (`CORE-03`, `CORE-04`, `CORE-06`)
- Phase 2 says the three-tier gate is “measurably cheaper”; a 1% result passes, and the third tier does not exist. (`DET-01`)
- Phase 3 says “high-value providers” without enumerating providers or recall requirements. (`SEC-01`)
- Phase 3 only requires fewer findings/MB than JS-Analyzer. A detector that emits nothing wins. (`QUAL-01`, `QUAL-02`, `SEC-01`)
- Phase 4 says tables work at “thousands” with no row count, interaction or latency threshold. (`UI-02`, `UI-07`)
- Phase 5's default-on active criterion passes with a volatile counter even if the host aborts. (`ACTIVE-01`, `ACTIVE-02`)
- Phase 7 says “no growing heap” and “multi-hour” without duration, traffic mix, slope or absolute ceiling. (`QUAL-06`)
- Phase 7 stops at Store submission, not acceptance or installability. (`DIST-07`)

### Rewrites of the three worst criteria

**Rewrite 1 — Phase 0 evidence gate (`SPIKE-01` through `SPIKE-12`):**

> On the declared minimum and current Caido builds, each spike has a committed executable fixture, exact build/OS metadata, raw results from at least five runs where repetition applies, a predeclared pass/fail threshold, and a recorded downstream decision. A dependent phase cannot start while its spike is unknown or while its result contradicts that phase's requirement. The fixed active-send decision maps a failing `SPIKE-04` to the journal/crash-recovery design, not to an unexplained waiver.

**Rewrite 2 — Phase 3 signal-quality gate (`SEC-01`, `QUAL-01`, `QUAL-02`, `QUAL-03`):**

> Against versioned corpora with published digests, the default high-signal projection has at least 95% precision on labeled mixed fixtures, zero projected Findings on the defined-clean negative corpus, at least 95% aggregate recall, and 100% recall for each enumerated rigid/checksummed provider fixture. The report includes per-detector counts. Removing or disabling detectors cannot improve the release score unless the recall gates still pass. The same inputs and output policy are used for the JS-Analyzer comparison.

**Rewrite 3 — Phase 5 active `.map` gate (`ACTIVE-01` through `ACTIVE-07`):**

> On a scripted 300-asset site, every unique eligible `.map` candidate is attempted exactly once with no total-count cap; speculative misses are absent from Search; same-origin authenticated maps succeed; no credential crosses origin or redirect; self-generated responses enqueue zero new work; every send has a durable pre-dispatch audit row; and after a forced process termination at send N, restart identifies N and does not replay the unfinished batch without operator action. The global kill switch prevents any subsequent dispatch after activation.

## Scope reality and specific v1 cut

### Secretly enormous requirements

- `CHUNK-01` is four adapter families plus generic webpack symbolic interpretation and long-term fixture maintenance, not one requirement.
- `ENDP-02` is bounded dataflow/constant folding, request synthesis and connection/auth semantics, not “extract a few AST nodes.”
- `SEC-01` is roughly 40–60 detector products, each with license provenance, parser behavior, fixtures, allowlists and scoring.
- `SEC-07` is a set of provider-specific network clients and legal/safety reviews, not one validator.
- `MAP-05` is a cross-platform hostile parser/filesystem security program.
- `SUPPLY-05` combines exact version inference, semver range matching and a rotating advisory dataset.
- `STORE-01` is the entire durable model, job lifecycle and audit schema.
- `UI-06` is not a button: raw export must rehydrate secrets, protect memory/disk, neutralize CSV formulas and work on remote Caido.
- `QUAL-06` requires a reproducible load harness and memory measurement, not a manual evening of browsing.

**Evidence:** [REQUIREMENTS.md:45](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:45) — `STORE-01`; [REQUIREMENTS.md:68](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:68) — `SEC-01`, `SEC-07`; [REQUIREMENTS.md:79](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:79) — `ENDP-02`; [REQUIREMENTS.md:91](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:91) — `MAP-05`; [REQUIREMENTS.md:97](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:97) — `CHUNK-01`; [REQUIREMENTS.md:108](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:108) — `SUPPLY-05`; [REQUIREMENTS.md:127](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:127) — `UI-06`; [REQUIREMENTS.md:146](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:146) — `QUAL-06`.

### Where the estimate breaks

- **Longest absolute phase: Phase 5.** Eighteen IDs conceal three products: a source-map implementation, a multi-framework chunk crawler, and a hostile active network subsystem under a known host-abort bug. Five plans are not credible.
- **Most deceptively underweighted: Phase 6.** Eight IDs look small, but they contain AST infrastructure, replay synthesis, GraphQL parsing, dependency-confusion networking, retire.js fingerprinting and multiple provider-validation clients. It is closer to three phases than one.
- **Phase 0 is not “cheap.”** Current/minimum build testing, destructive hang/crash probes, cross-platform filesystem behavior, load generation and SQLite failure injection are integration-test infrastructure. `SPIKE-13` makes it worse while serving only v2.

**Evidence:** [ROADMAP.md:121](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:121) — Phase 5; [ROADMAP.md:142](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:142) — Phase 6; [ROADMAP.md:24](/Users/six2dez/Tools/DefMiner/.planning/ROADMAP.md:24) — Phase 0.

### Specific v1 cut

Ship a lexical, durable, operator-usable JSMiner successor first:

**Keep for v1:** runtime gates needed by retained work; bounded ingestion/persistence/error recovery; two-tier literal+regex engine; high-signal secret/host/cloud/JWT/basic endpoint detectors; triage/suppression; workspace and selective native Findings; retroactive scan; passive and fixed default-on active sourcemap discovery; safe `sourcesContent` reconstruction; manifest/download export; adversarial suite; Store release.

**Cut from v1:**

- `CHUNK-01` through `CHUNK-04` — all chunk graph enumeration;
- `ENDP-02` and `ENDP-05` — replay synthesis and GraphQL AST extraction;
- `SUPPLY-01` through `SUPPLY-05` — NPM and library intelligence;
- `SEC-07` — provider validation;
- `MAP-03` — VLQ position mapping unless a retained v1 evidence view proves it necessary;
- full `UI-05` tree/source workbench — use a source list plus export/download for v1;
- `SPIKE-13` — move with `DIFF-01` to v2.

This removes 15 explicit v1 IDs plus the AST component hidden in `DET-01`, while retaining the fixed `.map` behavior and the product's differentiator: unattended analysis, durable project-wide results and real source recovery. NPM checks are already incumbent parity, generic chunk resolution is the hardest unique feature, and neither is necessary to validate whether operators trust the core.

### Corrected high-level order

1. Runtime/SDK/encoding/active-transport gates and executable harnesses.
2. Skeleton, persistence, error recovery, migrations and compatibility guard.
3. Two-tier detector engine, corpora and adversarial regex tests.
4. Passive intelligence plus operator workspace/triage/retro scan.
5. Sourcemap reconstruction plus fixed default-on active path and crash survivability.
6. Combined soak, upgrade matrix, signed Store acceptance.
7. Post-v1 AST substrate, then replay/GraphQL.
8. Post-v1 manifest adapters, then generic webpack chunk resolution, then supply/validation.

## The thing nobody thought of: the filesystem is often not on the operator's machine

Caido is client/server. Backend plugins run in the Caido CLI/server. A Caido instance may be a remote VPS or Docker container controlled through a local browser/desktop client. Therefore `sdk.meta.path()` and every “dump to disk” path are **server-side**, potentially inaccessible to the operator and potentially ephemeral if the container has no persistent volume.

All six research documents and all three planning documents reason as if a reconstructed source written by the backend lands on “the operator's machine.” That is false for a normal supported deployment. It breaks a stated parity feature, makes custom output-directory UX ambiguous, and changes retention, confidentiality, quota and cleanup behavior.

**Required new contract (`DEPLOY-01` through `DEPLOY-04`):**

- test local Desktop, remote CLI and Docker-with/without-volume deployments;
- label server-side storage explicitly and never imply it is a local path;
- make operator-facing exports available through Caido Hosted Files or a bounded authenticated frontend download, with expiry/deletion and redaction rules;
- treat server disk as shared instance storage with quota, orphan cleanup and no assumption of host shell access;
- make restart/persistence behavior explicit when the container lacks a mounted Caido Data volume.

Caido's own docs explicitly describe remote CLI and Docker deployments, including the fact that project data is not persisted across container restarts without a host volume: [Remote Hosting](https://docs.caido.io/app/tutorials/remote). The backend provides a Hosted File API that the plan never considers: [HostedFile SDK](https://developer.caido.io/plugins/reference/sdks/backend/hostedfile.html).

**Nearest IDs that currently fail to cover it:** [PROJECT.md:34](/Users/six2dez/Tools/DefMiner/.planning/PROJECT.md:34) — static file dumping; [REQUIREMENTS.md:90](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:90) — `MAP-04`; [REQUIREMENTS.md:93](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:93) — `MAP-07`; [REQUIREMENTS.md:127](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:127) — `UI-06`; [REQUIREMENTS.md:50](/Users/six2dez/Tools/DefMiner/.planning/REQUIREMENTS.md:50) — `STORE-06`.

## Final work order and stopping rule

1. Correct the 102-ID inventory and split compound requirements.
2. Repair the parser/consumer phase graph and apply the explicit v1 cut.
3. Add `ERR-*`, `OBS-*`, `UPGRADE-*`, `COMPAT-*`, `ENC-*`, `OPS-*`, `UISEC-*`, `DEPLOY-*` and the active survivability requirements.
4. Replace the three success gates above and attach numeric/reproducible gates to the remaining phases.
5. Obtain Caido Store pre-clearance for the fixed known-crash default before treating `DIST-07` as feasible.

**Planning may stop and implementation may start only when:** every v1 ID has one phase and one executable acceptance oracle; no consumer precedes its producer; the fixed active path has durable crash attribution/recovery and a credential-safe request contract; upgrade/current-Caido/remote-deployment matrices exist; and the Store target is not in unresolved conflict with the known default-on crash behavior.
