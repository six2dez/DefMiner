# DefMiner design research

**Date:** 2026-08-20  
**Target:** Caido backend/frontend plugin, TypeScript only, no `any`  
**JSMiner baseline:** commit `420c5664e2b0b5a0278a993ac00cf0c9d3907a52` (`BApp Store release v1.16`, 2023-07-20)

## Executive decision

**GO, conditionally.** DefMiner can be materially better than JSMiner inside Caido, and the most important architectural uncertainty is resolved: Caido backend plugins have a real asynchronous callback for every response proxied through Caido, `sdk.events.onInterceptResponse`. It is explicitly an observation event and cannot modify the response. DefMiner should use that callback only to apply cheap gates and enqueue the stored request ID; it should reload the request later with `sdk.requests.get`. Polling the request database is for backfill, recovery, and user-requested rescans—not the live passive path. [Backend events reference](https://developer.caido.io/plugins/reference/sdks/backend/events), [backend events guide](https://developer.caido.io/plugins/guides/backend_events).

The condition is QuickJS. The public Caido documentation gives no numeric CPU, heap, or stack limits, stored bodies are not streamable, and there is no documented worker-thread facility for CPU-bound JavaScript. A synchronous parse blocks the plugin's QuickJS event loop. A Phase 0 benchmark inside the minimum supported Caido version is therefore a release gate, not cleanup. The product remains viable if AST parsing has to be size-limited because a bounded lexical analyzer, provider-specific detectors, source-map handling, artifact diffing, and a strong evidence UI already deliver most of the value.

The product position should be precise:

- DefMiner is a **passive JavaScript intelligence and artifact analysis system**, with separately consented active retrieval and online validation.
- “Verified” means a provider-specific validator obtained an unambiguous result. Entropy never means verified.
- Raw secrets are not persisted in the plugin database. They are revealed from the original Caido request only after its body hash is rechecked.
- Caido Findings are a projection of stable, high-signal results. DefMiner's SQLite database and UI are the full source of truth because the **backend plugin** Findings SDK exposes create/get/exists and a dedupe key, but no update/delete, severity, confidence, or marker fields. [Backend Findings SDK](https://developer.caido.io/plugins/reference/sdks/backend/findings).
- Active source-map/chunk retrieval, public-registry queries, vulnerability lookups, and secret verification are off by default, visible, scoped, rate-limited, and auditable.

## Research method and confidence

This review read the local Java implementation rather than relying on JSMiner's feature list. Line links below point to that exact clone. Caido conclusions use the official SDK documentation and current community plugins as implementation evidence. Six requested community repositories were inspected at pinned commits. The locally installed Caido CLI reported `0.57.1`. Parser feasibility was also tested by bundling candidate libraries as ES2023 ESM and running them in standalone QuickJS-ng; those figures are directional, not Caido limits.

Confidence labels used below:

- **Confirmed:** stated by current official Caido documentation or observed in current source.
- **Demonstrated:** used by a pinned community plugin or reproduced in a standalone experiment.
- **Unknown:** not promised by public documentation; it must be spiked in Caido.

## 1. What is weak in JSMiner

### 1.1 The common failure is an unbounded regex pipeline

JSMiner does not have a shared response-classification, decoding, tokenization, or artifact layer. Every scanner independently converts or copies the response, scans the entire body, builds markers, and creates a Burp issue. On a multi-megabyte minified bundle this compounds into many full scans and allocations. It has no body-size ceiling, MIME/status gate, decompression budget, queue bound, content-addressed cache, or analysis-version cache.

The problem is larger than “some regexes could improve.” The architecture cannot distinguish an inventory item from a vulnerability, cannot attach multiple evidence records to one canonical entity, cannot update validation state, and cannot explain why confidence was assigned.

### 1.2 Detector-level findings

| Area | Concrete defect | Consequence and required DefMiner correction |
|---|---|---|
| Secret grammar | The master pattern is a keyword followed by an assignment-like separator and a restricted token character class; the opening and closing quote are not back-referenced. See [Constants.java:36](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Constants.java:36). The value class excludes common token characters such as `.`, `:`, and `=` while including broad punctuation. `public_key` is treated as a secret. | Misses JWTs, structured credentials, URLs, base64 padding, and many provider formats; flags public material and arbitrary assignments. Replace it with provider-specific rules plus a bounded generic-assignment detector. |
| Body decoding | Scanners repeatedly construct a Java `String` from the entire raw HTTP response with the platform-default charset, then slice the body. See [Secrets.java:29](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/Secrets.java:29). | Headers and body are copied; declared charset, binary content, and malformed encoding are not handled deliberately. DefMiner should use Caido's body model, gate by byte length/type, retain a raw digest, and materialize text once. |
| Secret extraction | The scanner depends on capture group 20 of that monolithic regex and elevates a match to “Firm” solely from Shannon entropy. See [Secrets.java:41](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/Secrets.java:41). | A harmless random ID or hash can outrank a low-entropy but structurally valid credential. Named detector results and explicit score features are needed; validation is a separate state. |
| Entropy | The threshold is a fixed `3.5` bits/character regardless of length, alphabet, provider syntax, key name, surrounding code, or allowlist. See [Utilities.java:240](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Utilities.java:240). | Short noise, hashes, UUID-like identifiers, and generated asset IDs are false positives. Entropy should be one feature after format, length, context, and stopword checks—not a verdict. |
| Basic authentication | Only the first match is processed because the code uses a single `find()`. Case handling and validation are weak. See [Secrets.java:56](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/Secrets.java:56). | Later credentials disappear; malformed base64 can be reported. Iterate bounded candidates, decode safely, require a plausible `user:password` form, and redact. |
| False-positive suppression | The effective generic suppression is length greater than four plus exact exclusions such as `basic`, `bearer`, and `token`. See [Secrets.java:103](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/Secrets.java:103). | No generated-code, placeholder, test fixture, example domain, source-map, checksum, public-key, or repeated-value model. DefMiner needs rule-local allowlists, global stopwords, file/context suppressions, and explainable scoring. |
| Secret reporting | Matches are grouped into only two HTML issues, “low” and “high,” and the raw secret is included in descriptions and markers. See [Secrets.java:78](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/Secrets.java:78). | There is no provider, validation state, first/last seen, occurrence history, safe export, or lifecycle. Use canonical entities plus evidence and validation records, with redaction by default. |
| Endpoints | Five regexes match only `.get(...)`, `.post(...)`, and peers. See [Constants.java:85](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Constants.java:85). | Misses `fetch`, `XMLHttpRequest`, `Request`, Axios config objects, generated clients, template literals, computed methods, WebSockets, SSE, and base-URL composition; also matches unrelated collection methods. Use syntax-aware call extraction with a lexical fallback. |
| Endpoint control flow | The “must start with `/` and contain no angle bracket” tests are in the `while` condition. The first rejected match terminates the remainder of that HTTP-method scan rather than skipping it. See [Endpoints.java:53](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/Endpoints.java:53). | One irrelevant early match can hide every valid later endpoint. This is a correctness bug, not a tuning issue. |
| Endpoint cost/reporting | Each method converts and copies the entire response independently, then produces one “Certain” issue per method. See [Endpoints.java:36](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/Endpoints.java:36). | Five body passes, no normalized entity, call site, parameters, base URL, authentication context, or confidence. Parse once and attach evidence per call. |
| Cloud URLs | The cloud pattern is an old suffix list preceded by repeated `\w` labels. See [Constants.java:22](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Constants.java:22). | It misses valid hyphenated bucket/resource names, path-style and regional forms, new services, and non-host resource identifiers; it accepts underscores in DNS labels. Parse URLs and provider resource forms into typed assets. |
| Cloud confidence | Every cloud match is reported as “Certain” information without provider metadata or validation. See [CloudURLs.java:57](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/CloudURLs.java:57). | A string's existence is certain; its security relevance is not. Keep inventory confidence separate from exposure/risk confidence. |
| Subdomains | The “root domain” is inferred from the final two labels using a regex and then interpolated unescaped into another regex. See [Utilities.java:200](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Utilities.java:200) and [SubDomains.java:51](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/SubDomains.java:51). | Fails public suffixes such as `co.uk`, private suffixes, IPs, IDNs, and encoded strings; the inserted dot is regex syntax. Use URL parsing, IDNA normalization, and a bundled public-suffix snapshot or Caido scope as authority. |
| Dependency discovery | `package.json`-looking text is found by regex, whitespace is repeatedly removed from a whole body, and entries are split on commas. See [DependencyConfusion.java:44](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/DependencyConfusion.java:44). | Nested JSON, aliases, git/tarball/workspace specs, commas in values, comments, and minified surrounding code break it. Parse an actual JSON artifact or extract strong package metadata from a source map/bundler. |
| Scoped npm packages | The `node_modules` regex captures an `@scope` but not the following package name. See [Constants.java:83](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Constants.java:83). | It queries the wrong identifier and reasons about organization registration instead of the package. |
| Version parsing | `NPMPackage` uses a blacklist and even checks one literal combined string for invalid characters instead of implementing npm package-spec semantics. See [NPMPackage.java:53](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/NPMPackage.java:53) and [NPMPackage.java:70](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/NPMPackage.java:70). | Arbitrary strings are accepted while legitimate npm aliases/workspaces/git specs are misunderstood. The npm package-spec grammar is broader than name-plus-semver. [npm package spec](https://docs.npmjs.com/cli/v8/using-npm/package-spec/). |
| “Passive” network behavior | Dependency confusion is included in `runAllPassiveScans`, but it tests npm connectivity and queries the public registry from the scan loop. See [ScannerBuilder.java:114](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/ScannerBuilder.java:114) and [DependencyConfusion.java:113](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/DependencyConfusion.java:113). | It silently leaks internal dependency names and does redundant network traffic. In DefMiner, registry lookup is an explicit, disclosed action with caching and a budget. |
| Dependency-confusion severity | A public npm 404 is treated as a “Certain / High” issue. See [DependencyConfusion.java:175](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/DependencyConfusion.java:175). | Name absence is only a prerequisite. Exploitability depends on resolver order, configured registries/scopes, package manager, lockfiles, and build behavior. npm itself recommends scopes and protected publishing as mitigations. [npm threat model](https://docs.npmjs.com/threats-and-mitigations/). |
| Dependency task lifecycle | The task is marked complete from inside the package loop, after the first package; exceptions merely print in some paths. See [DependencyConfusion.java:90](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/DependencyConfusion.java:90). | UI/task state is unreliable and failures can strand or contradict jobs. Use an explicit durable job state machine and `finally` transitions. |
| Active source maps | The only guess is the script URL plus `.map`; the request is rebuilt from a URL, losing the originating cookies and relevant headers. A 200 plus a weak substring check is accepted. See [ActiveSourceMapper.java:27](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/ActiveSourceMapper.java:27). | Misses explicit `sourceMappingURL`, response headers, query-aware resolution, indexed maps, auth context, and redirects. It may save error pages. Resolve explicit metadata first; guess only as an optional fallback. |
| Response parsing bug | Multiple paths call `analyzeRequest` on response bytes to derive a response body offset. See [ActiveSourceMapper.java:47](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/ActiveSourceMapper.java:47), [StaticFilesDumper.java:62](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/StaticFilesDumper.java:62), and [Utilities.java:119](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Utilities.java:119). | Body boundaries and hashes can be wrong. Caido already models request and response bodies separately; preserve that separation. |
| Inline maps | A broad comment regex captures base64 and decodes it without a preflight byte limit. See [Constants.java:69](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Constants.java:69) and [InlineSourceMapFiles.java:39](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/InlineSourceMapFiles.java:39). | A malicious or accidental data URI can cause a large allocation. Estimate decoded size before decode, then enforce map/source budgets. |
| Source-map reconstruction | The model contains only `sources` and `sourcesContent`; it assumes both arrays exist and align, destructively flattens names, and ignores `sourceRoot`, indexed `sections`, null content, mappings, ignore lists, and debug IDs. See [JSMapFile.java:7](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/JSMapFile.java:7) and [SourceMapper.java:42](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/SourceMapper.java:42). | Modern maps are partially or incorrectly reconstructed and lose their tree. Implement ECMA-426 regular and index maps with safe URL/path resolution. [ECMA-426 source map format](https://tc39.es/ecma426/). |
| Static dump completion | Reporting is tied to “last iterator” position even though a fixed pool completes out of order, and workers share output/temp state. See [StaticFilesDumper.java:66](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/scanners/StaticFilesDumper.java:66). | It can report before the dump is complete and races on file names. Use a manifest, content-addressed storage, and a job aggregate finalized after all children settle. |
| File collision/dedup | Duplicate file naming checks suffixes in a loop before moving a temp file. See [Utilities.java:293](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Utilities.java:293) and [FileUtils.java:19](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/FileUtils.java:19). | Time-of-check/time-of-use races, arbitrary 19-suffix failure, and URL-query collisions. Key blobs by digest and keep the original URL/path in metadata. |

### 1.3 Concurrency, deduplication, and reporting failures

| Area | Evidence | Assessment |
|---|---|---|
| Per-response threads | Burp passive scanning creates a raw Java thread for every response. See [BurpExtender.java:479](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/BurpExtender.java:479). Menu actions create more raw threads. | A busy proxy can create unbounded OS threads before work even reaches the fixed executor. |
| Unbounded executor queue | The worker pool is fixed at five threads but uses the default unbounded queue. See [ExecutorServiceManager.java:8](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/config/ExecutorServiceManager.java:8). | A burst trades thread exhaustion for heap growth and stale work. There is no backpressure or fairness. |
| Non-atomic task dedup | “Not duplicate” and “add” are separate synchronized operations over a mutable singleton `ArrayList`; callers get the backing list. See [TaskRepository.java:16](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/TaskRepository.java:16), [TaskRepository.java:29](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/TaskRepository.java:29), and [TaskRepository.java:143](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/TaskRepository.java:143). | Concurrent callers can enqueue duplicates; iteration is unsafe; lookups become O(total jobs); completed jobs grow until unload. |
| Repeated sitemap traversal | Every detector separately queries selected sitemap subtrees, and the helper recursively asks for child items. See [ScannerBuilder.java:239](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/ScannerBuilder.java:239) and [Utilities.java:52](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Utilities.java:52). | Manual scans multiply full site-map traversal by detector count. Backfill should query once, enqueue once, and fan out from one normalized artifact. |
| Weak content identity | The task key normalizes away query and fragment and combines path with a response-body hash. See [Task.java:57](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/core/Task.java:57). | Query-distinct resources can collapse while identical bundles on different URLs are repeatedly analyzed by detector. Separate occurrence identity from artifact-content identity. |
| Marker cost | For every raw match, JSMiner scans the entire response again, and the nominal 500 cap is checked outside the inner occurrence loop. See [Utilities.java:80](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Utilities.java:80). | Worst case approaches O(matches × body length), and one repeated token can exceed the cap. Record offsets while scanning once. |
| String-based result dedup | HTML list dedup uses `StringBuilder.indexOf`; issue dedup compares the whole rendered detail, then Burp consolidation merges any same-name issues. See [Utilities.java:65](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Utilities.java:65), [Utilities.java:178](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/utils/Utilities.java:178), and [BurpExtender.java:499](/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/jsminer/src/main/java/burp/BurpExtender.java:499). | Order/detail changes create duplicates, while consolidation can discard materially distinct evidence. Deduplicate typed entities and evidence with stable keys. |

### 1.4 Large-bundle performance model

For one response, endpoint scanning alone makes five body passes and repeated response copies. Secrets, cloud URLs, subdomains, dependencies, source-map detection, hashing, dumping, and marker generation add more passes and allocations. Dependency parsing creates additional whole-body strings with repeated `replaceAll`. No detector first checks response-body length. The fixed pool does not bound pending tasks, and passive delivery creates one Java thread per response.

The likely failure mode on a modern application is therefore not only slow analysis of one 8 MiB vendor bundle. It is a burst of duplicate chunk responses, each spawning a thread and then queuing multiple independent scans, while marker generation performs repeated full-body searches. DefMiner must make **one decoded body, one content hash, one lexical pass, optional bounded syntax passes, and one batch of idempotent persistence writes** the invariant.

## 2. What Caido's SDK actually permits

### 2.1 The passive-hook decision

**Confirmed: a backend plugin can observe every request and response proxied through Caido.** The backend events SDK exposes:

- `sdk.events.onInterceptRequest(callback)` for a newly intercepted request.
- `sdk.events.onInterceptResponse(callback)` for a proxied request/response pair.
- Both callbacks are asynchronous observation events and cannot modify traffic. [Events reference](https://developer.caido.io/plugins/reference/sdks/backend/events).

The correct live ingestion idiom is:

```text
onInterceptResponse
  -> check enabled/project/scope/HTTPQL/status/type/body length
  -> insert request ID into a bounded in-memory queue
  -> return immediately

single CPU consumer
  -> sdk.requests.get(requestId)
  -> hash and analyze once
  -> idempotent database upserts
  -> notify frontend
  -> optionally project a stable high-signal Caido Finding
```

It is **not**:

- `onUpstream`: that is a synchronous routing hook before a request is sent and is performance-sensitive; it exists to select a connection, not scan a response. [Upstream guide](https://developer.caido.io/plugins/guides/plugin_upstream).
- A request/response interceptor that mutates traffic: the passive events expressly cannot modify it.
- A workflow per response: workflows are user-composed automation, not required for plugin-wide observation.
- Polling as the main path: polling introduces latency, pagination races, unnecessary database load, and awkward project lifecycle behavior.

Polling/querying is still necessary for **historical backfill, missed/overflow recovery, rules-version rescans, and a user-specified HTTPQL rescan**. `sdk.requests.query()` supports filter, cursor pagination, order, and first/last page sizing; `sdk.requests.matches()` and `sdk.requests.inScope()` provide HTTPQL and scope checks. [Requests SDK](https://developer.caido.io/plugins/reference/sdks/backend/requests).

The community Scanner plugin independently demonstrates the intended design: an `onInterceptResponse` handler applies configuration/scope gates and submits work to a scheduler with explicit concurrency, timeout, and dedup maps; project changes cancel/clear work. [Scanner backend, pinned source](https://github.com/caido-community/scanner/blob/5c51292308e6b595ce519d5710c2a0773ba92222/packages/backend/src/index.ts#L50-L207). AuthMatrix uses the same response event for automatic capture with HTTPQL and scope checks. [AuthMatrix capture, pinned source](https://github.com/caido-community/authmatrix/blob/5f70f93912f7bb94994436828bce7a6d78757d82/packages/backend/src/services/templates.ts#L138-L245).

One uncertainty remains: public docs do not exhaustively specify whether events fire for imports, Replay, Automate, workflow traffic, or plugin-originated sends under every `save`/`plugins` combination. Phase 0 must build an event matrix. DefMiner also needs a short-lived suppression key around its own active requests until recursion behavior is proven.

### 2.2 Capability matrix

| Capability | Exact status | DefMiner consequence |
|---|---|---|
| Observe live proxy responses | **Confirmed.** `onInterceptResponse` receives request and response asynchronously and cannot mutate them. | Enqueue-only live passive path. No polling loop needed for live coverage. |
| Read stored traffic | **Confirmed.** `sdk.requests.get(id)` returns the stored request/optional response; `query()` supports HTTPQL and cursor pagination. | Durable backfill and reloading by ID are first-class. Avoid retaining SDK objects across asynchronous work. |
| Scope/HTTPQL | **Confirmed.** `inScope` and `matches` are available. | Make both configurable gates; scope should default on. |
| Body access | **Confirmed, non-streaming.** A Body exposes byte length and materializes through `toRaw()` or `toText()`. `toText()` replaces invalid characters. No stored-body stream API is documented. | Check byte length first, materialize once, preserve the raw-body hash, and do not promise analysis of arbitrarily large bodies. Test how compressed response storage is exposed. |
| Create findings | **Confirmed but limited.** The spec has title, optional description, reporter, request, and optional `dedupeKey`; create/exists/get are documented. | Project only high-signal results. Store score, severity, validation, evidence, lifecycle, and suppression in DefMiner's DB. |
| SQLite | **Confirmed.** `sdk.meta.db()` yields a plugin-specific asynchronous SQLite pool; statements support `all`, `get`, and `run`. [Meta SDK](https://developer.caido.io/plugins/reference/sdks/backend/meta), [SQLite module](https://developer.caido.io/plugins/reference/sdks/backend/other), [SQLite guide](https://developer.caido.io/plugins/guides/sqlite). | Use migrations, unique constraints, prepared statements, and idempotent UPSERTs. No transaction object is documented; do not assume separate calls share a pooled connection. Spike transaction behavior. |
| Writable files | **Confirmed.** `sdk.meta.path()` is a writable plugin directory. `assetsPath()` is bundled/read-only/resettable. | Put content-addressed reconstructed sources under the writable path; ship rule databases as assets. |
| Bundled assets | **Confirmed.** Declared assets can be read as string, JSON, bytes, or a readable stream; assets increase package size. [Assets guide](https://developer.caido.io/plugins/guides/assets), [Files guide](https://developer.caido.io/plugins/guides/files). | Bundle versioned detector rules and a trimmed vulnerability signature database. Asset streaming does not make response bodies streamable. |
| Send target requests | **Confirmed.** `sdk.requests.send(spec, options)` sends through Caido and respects the upstream proxy; it can save or avoid saving and can control plugin execution and timeouts. | Use for explicitly approved same-target source-map/chunk requests so they follow Caido routing. Record an audit row and guard event recursion. |
| Fetch arbitrary external hosts | **Confirmed.** `fetch` from `caido:http` is asynchronous and not routed through the proxy. Its Response body stream is not implemented; callers consume text/bytes/arrayBuffer/blob. [Fetch guide](https://developer.caido.io/plugins/guides/fetch). | Suitable only for opt-in provider/registry/OSV validation with disclosure, allowlists, aborts, and cache. It can bypass the user's proxy expectations. |
| Timers/network polling | **Demonstrated.** QuickSSRF performs arbitrary-origin `fetch` and timer-based polling. [QuickSSRF client](https://github.com/caido-community/quickssrf/blob/1f8e3247529411bde2ed9fad16db8fa84286616f/packages/backend/src/providers/interactsh/client.ts#L90-L179), [polling service](https://github.com/caido-community/quickssrf/blob/1f8e3247529411bde2ed9fad16db8fa84286616f/packages/backend/src/services/pollingService.ts#L6-L52). | Network-validation queues are implementable; timers do not add CPU parallelism. |
| Backend runtime | **Confirmed.** The backend uses embedded QuickJS, supports most ES2023, and is not Node.js. Caido reimplements an allowlisted module set. [Runtime](https://developer.caido.io/plugins/concepts/runtime), [module list](https://developer.caido.io/plugins/reference/modules). | Bundle pure ESM/JavaScript dependencies; avoid native addons, Node-only dynamic loading, and undocumented globals. |
| Worker threads | **Not documented and absent from the module list.** SQLite internally uses worker threads, but no `worker_threads` or Web Worker API is promised to plugin code. | Treat CPU work as single-threaded. Promise concurrency helps I/O only. Never run several AST parses “in parallel.” |
| Child processes | **Confirmed but unsuitable as the default.** `spawn` exists, `exec` does not, and streams differ from Node. Shift demonstrates streamed output, timeouts, and termination. [Child-process guide](https://developer.caido.io/plugins/concepts/child_process), [Shift implementation](https://github.com/caido-community/shift/blob/24878dba1d6a5a1109be53b12e979561f5483e34/packages/backend/src/api/agent-binaries.ts#L1-L130). | An optional expert-configured external analyzer is possible later, but it is non-portable, increases trust/install burden, and must not be required for core behavior. |
| CPU/heap/stack quotas | **Unknown.** No public numeric limits were found. | Measure inside supported Caido builds. Do not publish invented limits or rely on standalone QuickJS numbers. |
| Regex behavior | **Confirmed runtime family, exact Caido build limits unknown.** QuickJS implements ECMAScript regular expressions, not RE2. | Treat input as adversarial: keyword prefilters, bounded windows, no nested ambiguous quantifiers, corpus-based worst-case tests. A custom linear lexer is safer for the generic pass. |
| Frontend | **Confirmed.** Vue, Caido's PrimeVue adaptation, and Tailwind are supported; pages and sidebar items are registered through the frontend SDK. [UI concepts](https://developer.caido.io/plugins/concepts/ui). | A native-feeling evidence workbench is feasible. Plugin-demo shows the current PrimeVue/page/sidebar setup. [plugin-demo frontend](https://github.com/caido-community/plugin-demo/blob/6e9b221c53ec3883c147f28f966b57a9395dd658/packages/frontend/src/index.ts#L1-L48). |

### 2.3 Lessons from the requested community repositories

| Repository | Useful evidence | What not to infer |
|---|---|---|
| `scanner` | Live response event → bounded scheduler; per-task timeout; scope/config gates; finding-event bridge; project-change cleanup. | Its concurrency number is not automatically safe for CPU-bound parsing. |
| `quickssrf` | External `caido:http` fetch and timer polling work in the backend. | External fetch does not follow target proxy routing and does not provide a response stream. |
| `shift` | Child processes can be spawned and supervised with streamed output and termination. | A bundled or user-installed binary is not acceptable as DefMiner's default parser dependency. |
| `authmatrix` | Automatic response capture, HTTPQL/scope filtering, hash deduplication, and `sdk.meta.db()` are viable. | Its stored data model and capture workload are much smaller than multi-megabyte artifact analysis. |
| `plugin-demo` | Current typed RPC, Vue/PrimeVue setup, navigation page, and sidebar registration patterns. | A demo's state handling is not a production queue/persistence model. |
| `devtools` | Useful packaging/development patterns; its backend fetch path materializes an `ArrayBuffer`. [Pinned source](https://github.com/caido-community/devtools/blob/cc0023074b7be74f9ec6f23f0a297ca9d8f88331/packages/backend/src/index.ts#L37-L41). | It does not establish streaming support for stored or fetched response bodies. |

### 2.4 Parser and source-map library feasibility

I bundled current candidate libraries with esbuild using `--bundle --format=esm --platform=neutral --target=es2023 --minify`, then ran the bundles in standalone QuickJS-ng 0.16.1 on Apple M4 Pro. This proves that the selected pure-JavaScript code paths can execute in a QuickJS-family runtime; it does **not** prove Caido's memory ceiling or exact performance.

| Candidate | Minified / gzip wrapper | Standalone QuickJS result | Decision |
|---|---:|---|---|
| Acorn 8.18 | 121 KiB / 34 KiB | 1.05 MiB repeated-statement input: ~1.15 s, ~101 MB max RSS. 3.15 MiB: ~3.43 s, ~292 MB. | Compatible and mature, but slower/higher RSS in this synthetic test. Do not bundle alongside Meriyah. |
| Meriyah 7.3 | 150 KiB / 44 KiB | With only start/end offsets and regex validation disabled: 1.05 MiB ~0.65 s/~85 MB; 3.15 MiB ~1.99 s/~242 MB. Full range arrays materially increased memory. | **Preferred AST candidate**, pinned. Use module/script fallback, selective positions, `validateRegex: false`, and JSX only where necessary. Meriyah deliberately does not parse TypeScript/Flow source syntax. [Meriyah](https://github.com/meriyah/meriyah). |
| `@jridgewell/trace-mapping` 0.3 | 5.5 KiB / 2.5 KiB selective wrapper | Loaded and decoded a map successfully. | **Use** for mapping queries if required. |
| `@jridgewell/sourcemap-codec` 1.5 | 1.0 KiB / 0.6 KiB selective wrapper | Loaded and decoded mappings successfully. | **Use** for low-level mapping decode. |
| Mozilla `source-map` 0.8 | 186 KiB unpacked package | Neutral/browser bundle pulled Node `fs/path/url` and `mappings.wasm`; unsuitable without invasive adaptation. | **Reject** for the backend. Pure-JS Jridgewell packages fit QuickJS better. |
| `graphql` language parser 17.0.2 | 34 KiB / 8.5 KiB selective wrapper | Parsed an operation and selection set successfully. Full package is ~6.5 MB unpacked. | Optional. Prefer a tiny purpose-built tagged-template extractor first; bundle only the language parser if its richer error recovery earns the cost. [GraphQL.js](https://github.com/graphql/graphql-js). |

Those tests also justify a two-tier parser:

1. A custom linear lexical scanner always runs within the body limit. It skips comments/strings safely, extracts bounded literals/templates, recognizes high-value call shapes, and performs keyword-window secret detection.
2. Meriyah runs only below a configurable AST threshold and only once per content hash plus analyzer version. Parse failure or oversize is a recorded degraded state, not total analysis failure.

The initial AST threshold should be **1.5 MiB**, with an advanced hard ceiling of **3 MiB** until Caido-native benchmarks say otherwise. These are conservative starting settings, not SDK limits.

## 3. Definitive feature set

The design principle is **actionable evidence over extraction volume**. A hunter wants to know what is new, what is reachable, what is likely live, where it came from, and what can be sent to Replay—not receive 20,000 undifferentiated strings.

### 3.1 Ship as core

| Feature | Decision | Concrete behavior |
|---|---|---|
| Provider-specific secret detection | **Core, highest priority.** | Versioned detectors for high-value providers and token families. Each rule declares prefixes/length/alphabet/checksum or multipart relationships, context keywords, exclusions, redaction, and validation support. Use a cheap keyword/prefix prefilter, then exact checks. Open rule sets such as Gitleaks demonstrate keyword, entropy, secret-group, allowlist, stopword, and fingerprint composition; they are inputs, not a blindly copied ruleset. [Gitleaks](https://github.com/gitleaks/gitleaks). |
| Verified vs unverified credentials | **Core.** | State machine: `suspected`, `format_valid`, `verified_active`, `verified_inactive`, `verification_error`, `verification_unsupported`. Local checksum/structure validation is automatic. Network validation is explicit, provider-allowlisted, non-mutating, cached with TTL, rate-limited, and shows the outbound host and data class before execution. Detector-specific verification is the right model. [TruffleHog verification model](https://trufflesecurity.com/docs/customizing-detection/). |
| Contextual generic secrets | **Core, but never high by entropy alone.** | Detect assignment/object/header/env patterns in bounded windows. Score provider format, sensitive key name, token length/alphabet, entropy percentile, executable-code context, credential pair, placeholder/example indicators, generated hash context, and repetition. Only provider/structure matches or strong multi-feature candidates can project to Caido Findings. |
| Secret redaction and deployment diff | **Core.** | Persist a project-scoped HMAC fingerprint and redacted preview, not raw values. Track first/last seen and occurrences by canonical artifact/URL. Mark introduced, removed, reintroduced, and changed secrets across bundle deployments. Reveal by reloading the original request ID, verifying the artifact hash, and slicing the recorded offset. |
| Syntax-aware endpoint extraction | **Core.** | Recognize `fetch`, `Request`, `XMLHttpRequest.open`, Axios/ky instances and config objects, common generated clients, framework wrappers, GraphQL clients, `WebSocket`, `EventSource`, and `sendBeacon`. Shallowly fold string concatenation, literals, template expressions, base URL/client configuration, and simple constants. Store unresolved templates (`/users/{expr}`) instead of discarding them. Capture method, scheme/origin, path template, query keys, body/content type, selected headers, auth hint, and call site. |
| Large-file lexical fallback | **Core.** | A deterministic linear scanner extracts string/template literals and common call patterns without building a full AST. It must produce an explicit `lexical_only` analysis status so users know coverage was degraded. |
| GraphQL intelligence | **Core.** | Extract `gql`/tagged documents and request payloads; normalize operation type/name, variables, fields, fragments, endpoints, and persisted-query hashes. Parse SDL or introspection JSON only when already present. Do not automatically issue introspection requests. “Schema present” and “operation observed” are intelligence, not vulnerabilities. |
| Typed hosts and cloud assets | **Core.** | Parse, normalize, and classify absolute/protocol-relative URLs, domains, IPv4/IPv6, RFC1918/link-local/localhost names, Kubernetes/service-discovery forms, dev/stage/admin labels, storage/CDN/database/API endpoints, ARN/resource-like identifiers, OAuth redirect URIs, WebSocket/SSE origins, and cloud-provider service forms. Preserve evidence and provider/resource metadata. |
| Source-map reconstruction | **Core.** | Discover explicit `sourceMappingURL` comments/data URIs and `SourceMap`/legacy response headers before guessing. Resolve relative URLs against the final script URL. Support regular and indexed maps, `sourceRoot`, `sources`, `sourcesContent` including null entries, section offsets, debug IDs, and ignore lists. Build a collision-safe logical source tree and retain mapping/evidence back to the bundle. Scan each reconstructed source content hash once. |
| Artifact export/static dump | **Core, redefined.** | Store artifacts by content digest and export a manifest containing original URL, request ID, headers, status, MIME, observed time, digest, map/chunk relations, and logical source path. Never map an untrusted URL directly to a filesystem path. Enforce disk retention and aggregate limits. |
| Chunk/lazy-code graph | **Core after maps.** | Seed from HTML script/modulepreload links, worker/service-worker registrations, dynamic-import literals, and manifest/config artifacts. Add versioned adapters for webpack runtime public path/chunk maps, Vite, Next.js, Nuxt, and Workbox patterns. Discovery is passive. Fetching missing chunks is a separate same-origin/in-scope action with edge/depth/byte/request budgets. |
| Framework/build metadata | **Core.** | Extract `__NEXT_DATA__`, Nuxt/Vite/runtime configs, release/build/debug IDs, API base URLs, public environment/config objects, feature flags, client routes, OpenAPI-like documents, and application version metadata. Classify public identifiers separately from secrets. |
| Evidence-first hunter workflow | **Core.** | Every entity links to source request, URL, artifact version, offsets/line, detector and score explanation. Actions create/open a Replay request, copy a normalized endpoint or GraphQL operation, apply/search HTTPQL, and export selected intelligence. |

GitHub's supported-pattern catalog is useful evidence that provider-specific token structure and validity checks now span hundreds of token types; generic detection does not receive the same validity treatment. DefMiner should maintain a smaller, high-value, testable detector set rather than claim superficial parity with every provider. [GitHub supported secret patterns](https://docs.github.com/en/code-security/reference/secret-security/supported-secret-scanning-patterns).

### 3.2 Ship as explicitly labeled review hints

| Feature | Judgment | Precision boundary |
|---|---|---|
| DOM XSS source/sink analysis | **Valuable, but not a vulnerability oracle.** | Implement shallow function-local/dataflow hints for URL/location, storage, message, DOM, and network sources reaching `innerHTML`, `outerHTML`, `insertAdjacentHTML`, document writing, script/URL execution, and dangerous framework escape hatches. Recognize common sanitizers and Trusted Types as mitigating evidence. Cross-function/cross-bundle unresolved flows remain review hints. Only a tight direct flow without an evident sanitizer may reach the Findings projection threshold. |
| `postMessage` handlers | **High-value focused analysis.** | Find message listeners, use of `event.data`, origin/source validation, origin allowlists, and data-to-dangerous-sink flows; identify wildcard `targetOrigin` sends. Missing validation alone is not exploitable without a security-sensitive action. MDN requires exact target origins and validation of sender identity; PortSwigger's high-value pattern is attacker-controlled message data reaching a sink. [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage), [DOM Invader web messages](https://portswigger.net/burp/documentation/desktop/tools/dom-invader/web-messages). |
| CSP/CORS-relevant strings | **Use for context, not standalone findings.** | Correlate extracted origins and API channels with the actual response CSP, especially `connect-src`, and highlight origins not represented or risky wildcard/data schemes. CORS risk requires response-policy evidence, not a string in JavaScript. `connect-src` covers fetch/XHR/WebSocket/EventSource/beacon-style connections. [MDN connect-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src). |
| JWTs | **Decode and classify; do not overclaim.** | Parse header/claims, `alg`, `kid`, issuer, audience, subject class, scope/role claims, and time validity. Separate bearer-token exposure from public/session/config identifiers. Never call a JWT cryptographically verified without the required key and algorithm check; `alg: none` is noteworthy only for an actual token accepted by a target, not as a static exploit claim. |
| Vulnerable client libraries | **Useful only with a strong version.** | Fingerprint exact package/version from source-map paths, package metadata, or robust banner/module signatures. Use a pinned trimmed Retire.js-style repository locally and optionally query OSV for exact ecosystem/name/version with caching. Heuristic library presence without a version is only a candidate. [Retire.js](https://github.com/RetireJS/retire.js), [OSV API](https://google.github.io/osv.dev/api/). |
| Dependency confusion beyond npm | **Conditional, evidence-driven.** | Support npm/yarn/pnpm first when an actual manifest/lock/config or strong source-map path exists. Add PyPI, Maven, NuGet, and RubyGems only when their ecosystem artifacts are found. Public-name absence is one signal; resolver source/order, namespace controls, version reachability, and lock behavior determine confidence. Never silently query names. |

### 3.3 Deliberately defer or reject

- **Full interprocedural, cross-bundle taint analysis:** too expensive and too imprecise in QuickJS for v1. Preserve graph/evidence so a later external analyzer can consume it.
- **Arbitrary deobfuscation or executing discovered JavaScript:** unsafe and likely to hang or create side effects. Constant-fold only a small allowlisted expression subset; never use `eval`.
- **Automatic secret use, login, or exploit verification:** unacceptable side-effect and authorization risk. Validators must be read-only and provider-specific.
- **Automatic GraphQL introspection:** active and noisy; generate a Replay-ready request instead.
- **Blanket public-registry probing:** leaks internal package names and produces weak “available name” findings.
- **Heuristic library CVEs without exact versions:** high noise and poor trust. Keep candidates in the plugin UI until version confidence is sufficient.
- **Bundling both Acorn and Meriyah:** wastes package and maintenance budget. Pick one parser behind an interface and retain the lexical fallback.

## 4. Proposed architecture

### 4.1 Package layout

```text
packages/
  shared/src/
    contracts/             # RPC/event DTOs and discriminated unions
    domain/                # Entity, evidence, score, validation states
    schemas/               # Runtime validation; unknown -> typed values
  backend/src/
    index.ts               # SDK initialization and lifecycle hooks
    api/                   # Typed frontend RPC surface
    ingest/
      passive.ts           # onInterceptResponse, cheap gates only
      backfill.ts          # paginated requests.query + checkpoints
      manual.ts
    queue/
      scheduler.ts         # bounded, fair, cancelable queues
      limits.ts
    artifacts/
      classify.ts          # content/status/MIME/extension handling
      body.ts              # exactly one materialization
      hash.ts
      store.ts             # content-addressed writable storage
    analyzers/
      lexical/
      ast/
      html/
      json/
      endpoints/
      graphql/
      sourcemaps/
      chunk-graph/
      browser-risk/
      dependencies/
    detectors/
      secrets/providers/
      hosts/
      cloud/
      jwt/
    validators/            # local and separately gated network validators
    persistence/
      migrations/
      repositories/
    projection/
      caido-findings.ts
      frontend-events.ts
    export/
  backend/assets/
    secret-rules/          # pinned, licensed, versioned
    library-signatures/
    public-suffix-snapshot/
  frontend/src/
    index.ts
    views/
    components/
    composables/
    stores/
```

All SDK boundaries receive typed values or `unknown`, validate at runtime, and return discriminated result unions. `any` is prohibited in source and linted. Analyzer interfaces take immutable artifact views and emit typed candidates; they do not write SQLite or call the network.

### 4.2 Backend/frontend split

**Backend owns:** event ingestion, HTTPQL/scope checks, response access, content hashing, parsing, rules, validation, source-map/chunk retrieval, SQLite, artifact files, Caido Finding projection, queue health, and exports.

**Frontend owns:** views, filtering/sorting/virtualization, consent dialogs, reveal requests, graph/tree/code presentation, config editing, job control, export selection, and handoff actions. It never independently decides confidence or stores raw secrets.

Frontend RPC is narrow and paginated. Do not send full bundle bodies or thousands of findings in one event. Events contain invalidation summaries such as project ID, category, changed count, and newest entity ID; the UI re-queries pages.

### 4.3 Ingestion and analysis pipeline

```text
Caido response event
  -> cheap policy gate
  -> bounded request-ID queue
  -> reload stored request/response
  -> body byte limit
  -> SHA-256 + occurrence upsert
  -> artifact cache lookup
  -> materialize text once
  -> linear lexical pass
  -> optional typed analyzers
       -> Meriyah AST below threshold
       -> HTML/JSON structured parsers
       -> source map / chunk graph
       -> provider detectors
  -> score and canonicalize
  -> idempotent persistence
  -> frontend invalidation event
  -> selective Caido Finding projection
```

The intercept callback target is **p95 below 2 ms** on the supported reference machine and must not call `toText`, hash the body, parse, query external services, or write artifact files. It records only enough in-memory metadata to enqueue and returns.

Analyzer ordering is intentional:

1. Classify response and check `Body.length`.
2. Hash raw body once; if the artifact plus engine/rules/config versions was analyzed, only add the occurrence.
3. Convert to text once when required.
4. Run the linear lexer and exact-prefix secret detectors.
5. Run structured JSON/HTML analysis where content permits.
6. Run Meriyah below threshold.
7. Process source maps/chunk relations under separate aggregate limits.
8. Persist one batch of normalized results.

### 4.4 SQLite and artifact data model

Caido's plugin database may outlive one project context, so every project-owned row and unique key includes `project_id`.

```sql
schema_migrations(
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
)

settings(
  project_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(project_id, key)
)

artifacts(
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_length INTEGER NOT NULL,
  mime TEXT,
  storage_path TEXT,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  UNIQUE(project_id, kind, sha256)
)

occurrences(
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL,
  artifact_id INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  status_code INTEGER,
  observed_at TEXT NOT NULL,
  etag TEXT,
  last_modified TEXT,
  UNIQUE(project_id, request_id)
)

analyses(
  id INTEGER PRIMARY KEY,
  artifact_id INTEGER NOT NULL,
  engine_version TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  config_hash TEXT NOT NULL,
  mode TEXT NOT NULL,            -- full_ast | lexical_only | structured
  state TEXT NOT NULL,           -- queued | running | complete | partial | failed | skipped
  duration_ms INTEGER,
  skip_reason TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(artifact_id, engine_version, rules_version, config_hash)
)

entities(
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  subtype TEXT NOT NULL,
  canonical_hash TEXT NOT NULL,
  canonical_value TEXT,          -- NULL for sensitive values
  display_value TEXT NOT NULL,   -- redacted when sensitive
  sensitive INTEGER NOT NULL,
  attributes_json TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  UNIQUE(project_id, kind, subtype, canonical_hash)
)

evidence(
  id INTEGER PRIMARY KEY,
  analysis_id INTEGER NOT NULL,
  entity_id INTEGER NOT NULL,
  artifact_id INTEGER NOT NULL,
  occurrence_id INTEGER NOT NULL,
  detector_id TEXT NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  line INTEGER,
  column INTEGER,
  score INTEGER NOT NULL,
  confidence TEXT NOT NULL,
  context_json TEXT NOT NULL,
  UNIQUE(analysis_id, entity_id, detector_id, start_offset, end_offset)
)

validations(
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  validator_id TEXT NOT NULL,
  state TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  expires_at TEXT,
  metadata_json TEXT NOT NULL,
  UNIQUE(entity_id, validator_id)
)

relations(
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  predicate TEXT NOT NULL,
  object_kind TEXT NOT NULL,
  object_id INTEGER NOT NULL,
  attributes_json TEXT NOT NULL,
  UNIQUE(project_id, subject_kind, subject_id, predicate, object_kind, object_id)
)

jobs(
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL,
  request_id TEXT,
  kind TEXT NOT NULL,
  state TEXT NOT NULL,
  priority INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  enqueued_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  error TEXT
)

finding_projections(
  entity_id INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  caido_dedupe_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(entity_id, request_id),
  UNIQUE(caido_dedupe_key)
)
```

Migrations should execute as one multi-statement `db.exec` unit with `BEGIN`/`COMMIT`. Runtime persistence should not depend on a transaction spanning independent pool calls unless the Phase 0 spike proves connection affinity; use unique constraints and single-statement UPSERTs so replay after a crash is safe.

Large reconstructed source content belongs in content-addressed files under `sdk.meta.path()`, not SQLite. The database stores digest, byte count, safe relative path, and provenance. Writes use a generated temporary file and atomic rename where the Caido filesystem implementation supports it; startup garbage collection reconciles orphan temp files and unreferenced blobs.

### 4.5 Deduplication rules

Deduplication has three independent layers:

1. **Intake:** one pending/running job per `(project_id, request_id, job_kind)`.
2. **Artifact:** one analysis per `(content SHA-256, artifact kind, engine version, rules version, relevant config hash)`. Identical chunks at ten URLs get ten occurrences but one analysis.
3. **Entity/evidence:** one canonical entity per type-specific fingerprint, with distinct evidence locations and deployment occurrences.

Canonical keys are type-specific:

- Secret: project-scoped `HMAC-SHA-256(detector_id || 0x00 || normalized_secret)` using a generated per-project key; no raw value in SQLite. Persisting that key protects against accidental cross-project correlation, not compromise of the entire Caido/plugin data directory—host compromise is outside this control's promise.
- Endpoint: method plus normalized origin/base identifier, path template, and transport kind; query keys are a stable sorted attribute, not necessarily entity identity.
- Host: lowercased IDNA-normalized host plus normalized port.
- Cloud asset: provider, service/resource type, and provider-specific canonical resource ID.
- GraphQL operation: endpoint identity plus normalized operation hash/name/type.
- Source: artifact hash plus logical source URL/path and source-content hash.

The Caido Finding key is stable and versioned, for example `defminer:v1:<project>:<kind>:<entity-fingerprint>`. It attaches to the best representative occurrence. A later validation state change is shown in DefMiner because the current backend plugin Findings SDK does not expose update semantics.

### 4.6 Queueing and concurrency

QuickJS makes the scheduler a correctness and UX boundary:

- **One CPU analysis job at a time.** Multiple promises do not create CPU cores. Yield with a zero-delay timer between analyzer phases and artifacts so RPC/timers can run, while recognizing that one synchronous AST parse cannot be preempted.
- **Bounded intake queue:** default 128 request IDs, configurable within a safe ceiling. Deduplicate before enqueue. On overflow, record counters and a recoverable checkpoint; do not grow memory. The UI offers “backfill skipped traffic.”
- **Fairness:** round-robin by origin and prioritize explicit manual actions over backfill, but do not starve live passive work.
- **Separate I/O validator queue:** default four total and two per external host, with abort controllers, provider rate limits, five-to-ten-second deadlines, TTL caches, and a session/request budget.
- **Project lifecycle:** on project change, increment a generation token, cancel/ignore old-generation jobs, flush only committed writes, clear in-memory sensitive values and dedup maps, and initialize the next project before accepting events.
- **Durability:** passive jobs may be in memory for speed, but job state/checkpoints make backfill and active multi-artifact operations resumable. A crash must not duplicate entities or leave “running” forever; startup marks stale running jobs interrupted.

### 4.7 Performance and resource budgets

Initial defaults, to be ratified in Phase 0:

| Resource | Default budget | Behavior at limit |
|---|---:|---|
| Passive callback | p95 < 2 ms | Enqueue/gate only. |
| Response body eligible for lexical analysis | 8 MiB raw stored body | Record `skipped_oversize`; manual force within a hard configured cap. |
| Meriyah AST | 1.5 MiB default, 3 MiB advanced hard cap | Continue lexical/structured analysis and label `lexical_only`. |
| AST target in actual Caido | p95 ≤ 1 s and peak process delta ≤ 128 MiB for 1 MiB corpus sample | If missed, lower threshold or remove AST from automatic passive mode. |
| Inline/external map | 10 MiB encoded/downloaded | Skip before decode/parse. |
| Reconstructed sources per root map | 500 files, 25 MiB aggregate, 2 MiB per source | Store partial result with explicit truncation. |
| Chunk/source graph | Depth 2, 100 active fetches and 50 MiB per user action/session | Require a new explicit action to continue. |
| External validation | 4 global, 2/host, 50 requests/host/session | Queue, cache, or stop with budget reason. |
| UI result page | 100 rows, virtualized | Cursor pagination; never ship the whole result set to Vue. |
| Artifact disk retention | 1 GiB default per project | LRU only for reconstructable non-sensitive blobs; preserve metadata and warn before deletion. |

The adversarial test corpus must include giant single literals, repeated identifiers, deeply nested syntax, pathological regex candidates, malformed UTF-8, high Unicode, invalid source-map JSON/base64, cyclic indexed maps, huge `sources` arrays, repeated secret values, and bundles with millions of punctuation tokens.

### 4.8 Configuration surface

Start with three profiles—**High signal** (default), **Balanced**, and **Everything**—then expose advanced settings:

- Passive enabled; Caido scopes; additional HTTPQL filter; methods/statuses; MIME/extension rules; body, AST, queue, disk, graph, and map limits.
- Analyzer/detector categories; provider allow/deny lists; score thresholds; custom stopwords/allowlists; rules version.
- Finding projection threshold and categories. Default: verified active secrets, high-confidence provider-form secrets, direct browser-risk flows, and optionally severe exact-version CVEs. Inventory remains in DefMiner.
- Secret reveal policy and session timeout. Raw persistence stays disabled by design, not a toggle.
- Online validation master switch, provider switches, external-host disclosure, timeout/rate/cache budgets, and per-action audit history.
- Active map/chunk retrieval master switch, same-origin-only default, in-scope requirement, credentials/header policy, redirect policy, and fetch budgets.
- Registry/advisory queries, disabled by default; names/versions to be sent are previewed.
- Retention/export options; exports are redacted unless the user explicitly reveals and selects sensitive material.

### 4.9 Caido UI

Register one sidebar page with a badge for unseen verified/high-confidence changes. Use Caido's PrimeVue package and native tokens rather than a bespoke component system.

The page should contain:

- **Overview:** live queue health, analyzed/skipped/partial counts, new since last deployment, active network jobs, rule/engine versions, and resource-limit warnings.
- **Intelligence tables:** Secrets, Endpoints, Hosts & Cloud, GraphQL, Browser Risks, Dependencies. PrimeVue DataTable with virtual scrolling, server-side filtering, tags for confidence/validation/newness, and column presets.
- **Evidence workbench:** a Splitter with source/artifact/chunk tree, code excerpt centered on the stored offset, entity details, score explanation, validation history, related entities, and all occurrences.
- **Deployment Diff:** timeline by canonical URL/build ID/content hash, with introduced/removed/reintroduced secrets, endpoints, hosts, and dependency versions.
- **Jobs & Activity:** passive/backfill/active queue, skips, retries, consent/audit history, and project generation.
- **Settings:** profiles first, advanced limits and outbound controls behind clear sections.

High-value actions are “Open source request,” “Send/open in Replay,” “Copy endpoint/cURL/GraphQL operation,” “Search HTTPQL,” “Verify selected,” “Fetch explicit map/chunks,” “Suppress with reason,” and “Export JSON/CSV/SBOM/source tree.” Actions that cause traffic always show target, estimated count/bytes, credential behavior, and budget before execution.

## 5. Ranked risks and resolution spikes

| Rank | Risk | Likelihood / impact | Mitigation and falsifiable spike |
|---:|---|---|---|
| 1 | QuickJS CPU/heap and non-preemptible parsing freeze the plugin or Caido on real minified bundles. | High / Critical | Phase 0 runs lexical and Meriyah corpora inside installed minimum/current Caido, including adversarial syntax. Start one job only. **Gate:** automatic AST is disabled or threshold lowered if 1 MiB exceeds 2 s or 160 MiB process delta on the reference minimum machine; redesign the lexical pass if 8 MiB exceeds 2 s. No catastrophic-regex candidate may exceed 2× the same-size random/control input. |
| 2 | Stored/fetched bodies are not streamable, causing duplicate multi-megabyte allocations and map bombs. | High / High | Check `Body.length` before conversion, keep one string, estimate base64 decoded size, cap maps/sources, and store partial status. **Spike:** measure raw/compressed/chunked/binary response semantics and memory for `toRaw` versus `toText`; confirm whether Caido stores decoded content. |
| 3 | Passive event coverage or self-generated request recursion differs across Caido tools/options. | Medium / High | Keep live architecture event-based, but test Proxy, Replay, Automate, workflow, imported HAR, `sdk.requests.send` with `save` true/false and `plugins` true/false, redirects, missing responses, and project changes. Add a suppression set keyed by request fingerprint/generation until behavior is proven. |
| 4 | Bundled parser/source-map dependencies build but fail or regress in Caido's exact QuickJS version. | Medium / High | Pin versions, ES2023 ESM bundle, no dynamic require/native/WASM, golden-corpus installation test on minimum/current Caido. Use Meriyah selective positions and Jridgewell pure JS; reject Mozilla `source-map`. Keep the lexical path fully functional. |
| 5 | Online verification and active retrieval leak target data, bypass proxy expectations, or cause unauthorized side effects. | High / Critical | Off by default; explicit per-action consent; show hosts and data class; provider-specific read-only validators; same-origin/in-scope target requests; strict method/header/redirect rules; rate and byte caps; audit log. Never execute discovered code or use credentials to mutate state. Security review every validator. |
| 6 | False positives destroy trust, especially secrets, DOM XSS, dependency confusion, and CVEs. | High / High | Separate entity certainty, security confidence, and validation state. Build labeled benign/real corpora and score explanations. **Gate:** high-signal default projection precision ≥95% on the maintained corpus; generic entropy-only results never project; DOM/dependency results remain hints absent the required evidence chain. |
| 7 | Caido Findings cannot represent mutable state or rich evidence. | Certain / Medium | Make SQLite/UI authoritative. Use stable dedupe keys and create only durable results. Include status/severity text in the description/title as a snapshot and link users back to DefMiner; never model Findings as the database. |
| 8 | Malicious source maps/chunk graphs cause traversal, cycles, disk exhaustion, or decompression amplification. | Medium / High | Content-addressed safe paths; never trust `sources` as filesystem paths; encoded/decoded/aggregate/source-count/depth/edge caps; cycle detection; temp cleanup; LRU quota. Fuzz regular/index maps and relative URL resolution. |
| 9 | SQLite pool semantics, migrations, project switching, or crashes corrupt lifecycle state. | Medium / High | Include project ID in every key, use unique constraints/UPSERTs, one-unit migrations, generation cancellation, stale-job recovery, and failure-injection tests. **Spike:** verify transaction/connection behavior under concurrent prepared statements and project changes. |
| 10 | Rule/advisory freshness and licensing create a supply-chain or plugin-size problem. | Medium / Medium | Ship an attributed, license-reviewed, pinned trimmed dataset with reproducible hashes and an SBOM. Updates are signed/versioned and user-triggered unless Caido Store policy supports a safe channel. Rules version participates in analysis cache identity. |
| 11 | Sensitive-value retention or export creates a new secret store. | Low / Critical | Never persist raw secret values in plugin SQLite/logs/events. HMAC fingerprint and redacted preview only; reveal from hash-checked original traffic. Clear in-memory reveals on project/session change. Redacted export default with explicit warnings. |
| 12 | Webpack/framework runtime churn makes lazy-chunk coverage silently incomplete. | High / Medium | Versioned adapters with fixtures for current framework outputs, confidence-labeled graph edges, explicit coverage stats, HTML/manifest/dynamic-import fallbacks, and frequent real-bundle corpus updates. Never claim complete chunk enumeration. |

## 6. Delivery roadmap

### Phase 0 — feasibility gates and SDK truth

**Goal:** prove the runtime and lifecycle assumptions before feature accumulation.

Deliver:

- Minimal typed backend/frontend scaffold installed in the minimum supported and current Caido versions.
- Passive event matrix across Proxy, Replay, Automate, workflows, imports, redirects, missing responses, project changes, and plugin-originated sends.
- SQLite migration/pool/transaction/restart tests.
- Body semantics and memory measurements for text, binary, compressed, malformed UTF-8, and multi-megabyte responses.
- In-Caido benchmarks for the linear lexer, Meriyah, Jridgewell source-map helpers, and worst-case detector regexes.
- A written go/no-go table that fixes default body/AST/map limits.

**Exit:** the callback remains cheap; project switches do not cross-contaminate; no feedback loop; persistence survives restart; the lexical pass meets the large-body gate; parser thresholds are evidence-based. If AST fails, proceed with lexical-only core and keep the parser adapter disabled.

### Phase 1 — bounded passive intelligence core

**Goal:** replace JSMiner's highest-value behavior with a trustworthy, no-outbound-traffic default.

Deliver:

- Event ingestion, bounded scheduler, project lifecycle, backfill checkpoints, artifact/occurrence/analysis cache, schema, and health telemetry.
- Linear lexer; provider-specific high-signal secrets; contextual generic candidates; local validation; redaction; JWT decoding; typed hosts/internal IPs/cloud resources.
- Basic endpoints from literal/common lexical patterns.
- Overview, Secrets, Endpoints, and Hosts tables plus evidence view and source-request handoff.
- Stable high-signal Caido Finding projection and suppression.

**Exit:** no raw secrets in SQLite/logs/events; no outbound traffic; high-signal projection precision ≥95% on maintained corpus; bounded queues and reproducible overflow recovery; identical content is analyzed once.

### Phase 2 — syntax intelligence

**Goal:** turn strings into useful API and application structure.

Deliver:

- Meriyah adapter below the proven threshold, parse-mode diagnostics, shallow constant folding, base/client configuration tracking.
- Fetch/XHR/Axios/ky/generated-client/WebSocket/SSE/beacon endpoint extraction.
- GraphQL operations/fragments/variables/persisted hashes and existing schema/SDL artifacts.
- Framework/build/runtime config, routes, feature flags, OAuth redirects, and OpenAPI candidates.
- Replay/copy/search actions and richer score explanations.

**Exit:** golden real-bundle corpus beats the lexical baseline by a measured recall margin without breaching Phase 0 resource gates; parse failures never suppress lexical results.

### Phase 3 — source and lazy-artifact graph

**Goal:** reconstruct developer-visible sources and discover code that the browser loads later.

Deliver:

- Inline/external/header map discovery; ECMA-426 regular/index map support; logical source tree; mapping evidence; safe content-addressed storage.
- Recursive analysis of unique reconstructed sources with depth/aggregate limits.
- HTML/modulepreload, dynamic import, worker/service worker, webpack, Vite, Next, Nuxt, and Workbox graph adapters.
- Explicit same-origin/in-scope active retrieval workflow with consent, budgets, audit, recursion guard, and manifest export.

**Exit:** malformed/bomb/traversal/cycle corpus stays within limits; active mode cannot silently cross scope or exceed its request/byte/depth budget; reconstructed exports are reproducible and collision-free.

### Phase 4 — browser risk and deployment diff

**Goal:** prioritize changes and browser-side review targets rather than dump patterns.

Deliver:

- Function-local DOM source/sink and `postMessage` analyses with sanitizer/origin evidence.
- Actual-response CSP correlation and CORS-related origin context.
- Artifact/build timeline; introduced/removed/reintroduced entity diffs; “new verified secret” and “new privileged endpoint” views.
- Source/chunk relationship graph and focused code workbench.

**Exit:** browser-risk results are calibrated as hints unless the documented direct-flow criteria are met; diff results are stable across URL query churn and identical deployments.

### Phase 5 — supply-chain intelligence

**Goal:** add dependency value without repeating JSMiner's public-name-equals-vulnerability mistake.

Deliver:

- Exact package/version evidence from maps, manifests, banners, and bundler metadata; local pinned vulnerability signatures; SBOM export.
- Opt-in cached OSV lookups for exact package/version tuples.
- npm/yarn/pnpm dependency-confusion assessment with registry configuration, scopes, locks, aliases, and version-source evidence.
- Other ecosystems only behind artifact evidence and ecosystem-specific resolvers.

**Exit:** no registry name leaves the machine without preview/consent; public absence alone cannot produce a high-confidence issue; CVEs require an exact or strongly bounded affected version.

### Phase 6 — hardening and release

**Goal:** make the plugin safe under hostile inputs and boring under daily proxy load.

Deliver:

- Fuzz/adversarial corpus, sustained-traffic soak, crash/restart/project-switch tests, migration upgrade/downgrade policy, disk-quota cleanup, privacy/threat review, reproducible builds, dependency/license inventory, and Caido Store documentation.
- Public detector authoring schema and regression fixtures, but no arbitrary executable third-party rules.
- Clear diagnostics for skipped/partial coverage and exact analyzer/rules versions in exports.

**Release stopping rule:** do not add another detector until all of these hold: no unbounded queue or artifact expansion; no unsolicited outbound request; no raw-secret persistence; event-matrix coverage is documented; high-signal precision gate passes; limits fail closed with visible reasons; and a multi-hour mixed-bundle soak does not cause growing heap, stuck jobs, cross-project results, or duplicate findings.

## Final recommendation

DefMiner should not be “JSMiner rewritten in TypeScript.” The durable advantage is the model: **traffic occurrence → immutable content artifact → versioned analysis → canonical entity → evidence → optional validation → selective Caido Finding**. That model solves JSMiner's false-positive, deduplication, reporting, deployment-diff, and large-bundle problems at once.

Build the passive bounded core first, with no network traffic. Prove QuickJS thresholds before committing to automatic AST parsing. Then add syntax intelligence, source/chunk reconstruction, and browser hints. Supply-chain checks belong later because their apparent simplicity hides registry privacy and exploitability-context problems. If Phase 0 shows that even the linear pass cannot stay responsive at the agreed body limit, stop and reconsider a supervised external analyzer; otherwise there is no SDK blocker to a definitive Caido-native successor.
