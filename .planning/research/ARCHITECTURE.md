# Architecture Research

**Domain:** Caido backend/frontend plugin performing passive + active static analysis of JavaScript assets
**Researched:** 2026-08-20
**Confidence:** HIGH on the proxy-blocking model, the SDK surface, and the performance numbers (measured, not guessed). MEDIUM on AST-in-QuickJS feasibility and SQLite write throughput (spikes named below).

---

## TL;DR — The Five Load-Bearing Decisions

| # | Decision | Evidence |
|---|----------|----------|
| 1 | **`onInterceptResponse` does not block the proxy.** It is documented as "called asynchronously and cannot modify responses", in explicit contrast to `onUpstream` which is "called synchronously so special care should be taken to not impact overall performance". The real hazard is starving the *plugin's own* single-threaded QuickJS event loop, not the proxy. | Backend SDK reference (`events.md`, `plugin_upstream.md`); `caido-community/scanner` `packages/backend/src/index.ts` |
| 2 | **Hot path does admission-filter + enqueue only, then returns synchronously.** Analysis runs in a bounded, content-hash-deduped job queue with cooperative yielding every ≤ 25 ms. | scanner's `createScheduler` + `void queue.schedule(...)` idiom |
| 3 | **Two-stage detection: TruffleHog-style literal keyword gate, then regex.** Measured in native QuickJS: a literal `indexOf` pass costs **1.7 ms/MB**; a regex pass costs **8.4 ms/MB**. Gating converts "N detectors × 8.4 ms/MB" into "N keywords × 1.7 ms/MB + survivors × 8.4 ms/MB" — ~3× on a real 3.8 MB bundle, and it makes the corpus grow cheaply. | Measured (this document, §Performance Budget); TruffleHog `Detector.Keywords()` |
| 4 | **Never build a mega-alternation regex.** Measured: one 200-literal alternation costs **2745 ms** where 40 separate regexes cost **1263 ms** on the same 3.77 MB body — 2.2× slower natively, **12.5× slower** in the WASM build. QuickJS's `libregexp` has no literal-prefix/Aho-Corasick optimisation. | Measured |
| 5 | **`sdk.meta.db()` is plugin-global, not project-scoped.** Every table carries `project_id`. Confirmed by `caido-community/authmatrix`, which uses composite `PRIMARY KEY (id, project_id)` on every table. | `authmatrix/packages/backend/src/db/db.ts` |

---

## Question 1 — The Hardest Problem: Not Stalling the Proxy

### Is the intercept callback awaited by the proxy?

**No.** Three independent pieces of evidence:

1. **Official SDK reference, verbatim** (`/plugins/reference/sdks/backend/events.md`):
   > `onInterceptResponse(callback)` — Registers an callback on new intercepted responses. **This callback is called asynchronously and cannot modify responses.**

2. **Deliberate contrast with `onUpstream`** (`/plugins/reference/sdks/backend/events.md` and `/plugins/guides/plugin_upstream.md`):
   > `onUpstream(callback)` — Callback called before the request is sent to the target. **This callback is called synchronously so special care should be taken to not impact overall performance.**

   Caido documents blocking hooks as blocking. The intercept hooks are documented the opposite way. A hook that cannot modify the response has no reason to be awaited.

3. **The reference implementation agrees.** `caido-community/scanner` registers a **non-async** `onInterceptResponse` callback that does cheap filtering, pushes a task into an in-memory store, calls `void passiveTaskQueue.schedule(async () => { … })` and returns. Nothing is awaited in the callback body.

### So what actually breaks?

The plugin backend is "a long running thread inside Caido" running QuickJS — **single-threaded, no worker threads exposed to plugin code.** (The only worker threads in the runtime are internal to the `sqlite` module: "The implementation uses a connection pool and is fully asynchronous. Each connection will be spawned in a worker thread.")

Therefore a 1.3-second synchronous regex burn inside the callback does not stall the proxy, but it:

- blocks every subsequent `onInterceptResponse` callback (they queue behind it),
- blocks every `sdk.api.register` RPC handler — **the UI freezes**,
- blocks timers, `sdk.requests.send()` completions, and DB callbacks,
- grows unbounded memory if responses arrive faster than they are drained.

**This is the real constraint, and it is why the architecture below exists.**

> **Unverified (SPIKE-2):** what Caido does when intercept events arrive faster than the plugin drains them — buffer without bound, apply backpressure to the proxy, or drop events. This changes whether the queue's overflow policy is "drop" or "must never overflow". Do not ship the passive path until this is measured.

### What the community `scanner` plugin actually does

Reading `packages/backend/src/index.ts` and `packages/engine/src/utils/scheduler.ts`:

```ts
// packages/backend/src/index.ts (scanner) — abridged, verbatim structure
const passiveTaskQueue = createScheduler(config.passive.concurrentTargets);

sdk.events.onInterceptResponse((sdk, request) => {          // NOT async
  const config = configStore.getUserConfig();
  if (!config.passive.enabled) return;                       // cheap gate
  if (config.passive.scopeIDs.length > 0) {
    if (!sdk.requests.inScope(request, config.passive.scopeIDs)) return;   // sync scope check
  }
  const passiveChecks = checksStore.select({ type: "passive", overrides: … });
  if (passiveChecks.length === 0) return;

  const passiveTaskID = createPrefixedRandomId("pscan-");
  queueStore.addTask(passiveTaskID, toBasicRequest(request));
  emitPassiveQueueSnapshot();                                // debounced, see below

  void passiveTaskQueue.schedule(async () => { /* the heavy work */ })
    .promise.catch(…);                                       // fire and forget
});
```

Its scheduler is a plain N-slot promise queue: `schedule()` pushes a job, `drain()` starts jobs while `running < concurrency`, `setConcurrency()` is live-adjustable, `clearPending(reason)` rejects everything queued, and `onIdle()` resolves when empty. Job handles expose `cancel(reason)` which only succeeds while the job is still `pending`.

Its frontend event emission is **debounced with a 150 ms trailing timer and a re-entrancy guard**:

```ts
const emitPassiveQueueSnapshot = () => {
  if (passiveQueueSnapshotTimeout !== undefined) return;      // already scheduled
  passiveQueueSnapshotTimeout = setTimeout(() => {
    sdk.api.send("passive:queue-updated", queueStore.getTasks());
    passiveQueueSnapshotTimeout = undefined;
  }, 150);
};
```

And its in-memory task list is **hard-capped at 100** (`pruneQueueTasks({ tasks, maxTasks: 100 })`).

**The one thing scanner does NOT solve, and DefMiner must:** scanner simply refuses to look at large bodies. Its passive gate is:

```ts
// packages/backend/src/utils/when.ts (scanner) — verbatim
export function whenTextResponse(target: ScanTarget): boolean {
  if (target.response === undefined) return false;
  const code = target.response.getCode();
  if (code < 200 || code >= 300) return false;
  const ct = target.response.getHeader("content-type")?.[0] ?? "";
  if (/image|font|audio|video|octet-stream/i.test(ct)) return false;
  const body = target.response.getBody();
  if (body === undefined) return false;
  return body.toText().length <= 500_000;                    // 500 KB ceiling
}
```

Every modern SPA main bundle is above that ceiling. **Scanner does not scan the thing DefMiner exists to scan.** DefMiner's architecture is exactly "how to raise that ceiling by 20× without freezing Caido."

---

## Performance Budget (measured, not estimated)

All numbers below were produced by running the DefMiner-shaped workload — a 40-detector corpus of provider-specific secret, cloud-storage, recon and DOM-sink regexes — against **`monaco-editor@0.52.2/min/vs/editor/editor.main.js`, 3,766,654 bytes of real minified bundle**, in two QuickJS builds on an Apple Silicon Mac:

- **native** — `quickjs-ng` 0.16.1 (`qjs`), the same engine family Caido embeds via LLRT/rquickjs. **Primary numbers.**
- **wasm** — `quickjs-emscripten@0.31.0`. Reported for cross-checking; it is the same order of magnitude.

Node/V8 on the identical workload: **118 ms**. QuickJS native: **1263 ms**. Treat QuickJS as **~10× slower than V8 for regex** and never reason from V8 intuitions.

### Primitive costs

| Operation (on 3.77 MB body) | native ms | wasm ms | native ms/MB |
|---|---:|---:|---:|
| 40-regex detector corpus, full body | **1263** | 2255 | 335 |
| … same, precompiled RegExp objects | 1222 | — | 324 |
| Single regex pass, simple pattern (`firebaseio.com`) | 19 | 32 | 5.0 |
| Single regex pass, 9-way prefix alternation + `\b` (AWS AKID) | 57 | 222 | 15.1 |
| **Mean cost of one regex pass** | **31.6** | 56 | **8.4** |
| 200 × `String.indexOf` literal passes | 1279 | 858 | 339 |
| **Mean cost of one `indexOf` pass** | **6.4** | 4.3 | **1.7** |
| **One 200-literal alternation RegExp** | **2745** | **10725** | 728 |
| Empty `for` loop over every char | 34 | 202 | 9.0 |
| djb2 hash in JS, per char | — | 704 | 187 |
| `substring()` chunking, 15 × 256 KB | 0 | 1 | ~0 |
| `split("\n")` (yields 798 lines) | — | 2 | — |
| Shannon entropy over 500 × 40-char candidates | — | 7 | — |
| Compile 40 RegExp objects | 0 | — | — |
| `JSON.stringify` of 5,000 finding rows (562 KB out) | 6 | — | — |
| SHA-256 of 3.77 MB (native OpenSSL, proxy for `crypto.createHash`) | 1.3 | — | 0.34 |

**Reading of these numbers:**

- Regex cost is **passes × bytes**, with a floor of ~5 ms/MB per detector even for trivial patterns. Pattern complexity multiplies from there (3× for the AWS prefix alternation).
- A literal `indexOf` pass is **~5× cheaper** than a regex pass natively (**~13×** in the wasm build). That is the entire economic argument for keyword gating.
- **Large alternations are pathological**, not an optimisation. A 10-pattern alternation was only 20 % faster than 10 separate regexes (wasm: 516 vs 644 ms); a 200-literal alternation was 2.2× *slower* than 40 separate regexes.
- **Per-character JS loops are forbidden** on bundle-sized strings: an *empty* loop costs 9 ms/MB, a JS hash costs 187 ms/MB. Use native primitives (`indexOf`, `RegExp`, `crypto.createHash`, `substring`) exclusively.
- **Chunking is free.** `substring()` on a 3.77 MB string across 15 chunks costs 0 ms. This is what makes cooperative yielding viable.

### Chunk size → maximum synchronous block

The critical table. Same 40-detector corpus, precompiled, 4 KB overlap between chunks, native QuickJS:

| Chunk size | Slices | Total ms | **Max sync slice ms** | Avg slice ms | Throughput cost |
|---|---:|---:|---:|---:|---:|
| unchunked | 1 | 1222 | 1222 | — | baseline |
| 1 MB | 4 | 1224 | 347 | 306 | +0.2 % |
| 256 KB | 15 | 1245 | 92 | 83 | +1.9 % |
| 128 KB | 29 | 1298 | 55 | 45 | +6.2 % |
| **64 KB** | **58** | **1359** | **27** | **23** | **+11.2 %** |
| 32 KB | 115 | 1389 | 14 | 12 | +13.7 % |

**Decision: 64 KB chunks with 4 KB overlap.** 27 ms worst-case event-loop block for an 11 % throughput cost. The overlap must be ≥ the longest possible match; 4 KB comfortably covers every pattern in the corpus (longest realistic: a base64 inline sourcemap prefix probe — those are handled by a dedicated non-chunked path, see §Q2).

### Two-stage gating, measured end-to-end

Running the same 40 detectors with TruffleHog-style keyword gates (51 literal checks, 14 of 40 detectors survived the gate on this body):

| Strategy | wasm ms | Findings |
|---|---:|---:|
| Ungated: all 40 regexes | 2250 | 94 |
| Gate (51 literals) + 14 surviving regexes | **995** | **94** |

**2.26× faster, byte-identical results.** The detectors that failed to gate contributed zero findings by construction — a detector whose keyword is absent cannot match.

The residual cost is concentrated in **ungatable detectors**: `endpoint-quoted` (gate literal `/`), `subdomain` (gate `.com`). These match everywhere and gate nowhere. **Architectural consequence: a detector without a selective keyword ≥ 4 characters is Tier-B and never runs in the passive hot path.**

### The stated budget

DefMiner enforces these as **wall-clock deadlines checked between chunks**, not as predicted throughput. Reference machine = Apple Silicon; assume operator machines are up to 3× slower, which the deadline model absorbs automatically by degrading to `partial` rather than by freezing.

| Budget | Value | Enforcement |
|---|---|---|
| `onInterceptResponse` callback, p99 | **≤ 1 ms** | Admission filter reads status code, `body.length` (bytes, no decode), one header, and `inScope()`. Never calls `toText()`. |
| Enqueue | ≤ 0.1 ms | array push + Map set |
| Max synchronous slice | **≤ 25 ms**, hard trip at 50 ms | 64 KB chunk; `await yieldToLoop()` between chunks; if a single slice exceeds 50 ms the chunker halves the chunk size for the rest of the asset |
| Per-content Tier-A wall budget | **1000 ms per MB, floor 2 s, ceiling 15 s** | `Deadline` object checked between chunks and between detectors; on expiry → `scan_state='partial'`, `skip_reason='budget'`, findings so far are kept |
| Per-content Tier-B (deep/AST) budget | **30 s**, manual/idle only | never runs from the passive hot path in v1 |
| CPU queue concurrency | **1** | QuickJS is single-threaded — concurrency > 1 buys nothing for CPU work and multiplies peak memory |
| Network queue concurrency | 4 global, 2 per host | separate queue; see §Q7 |
| Pending queue depth | **256 contents** | overflow → drop lowest priority oldest, record `scan_state='skipped'`, `skip_reason='queue_overflow'`, surface a UI warning |
| Live body strings held | **≤ 2** | CPU concurrency 1 + one in-flight decode |
| Default body size ceiling | **8 MB** (Tier-A full), 8–32 MB Tier-A-critical-only, > 32 MB record-but-skip | configurable; enforced on `body.length` before decode |
| Content-hash cache hit rate | **target ≥ 90 %** of JS responses in a browsing session | the single biggest lever; instrument and display it |
| Frontend event rate | **≤ 4 events/s**, 250 ms debounce | see §Q4 |

**Worked example.** A bug-bounty session against one SPA: 30 unique JS assets averaging 1.5 MB, requested ~8× each (navigations, cache misses, 304s).

- Requests hitting the hook: 240. Of those, 210 are rejected by the admission filter or the content-hash cache in < 1 ms each → **210 ms total**.
- 30 unique contents × 1.5 MB × (gate ~120 literals × 1.7 ms/MB + ~15 survivors × 8.4 ms/MB) ≈ 30 × 1.5 × (204 + 126) ≈ **14.8 s of background CPU**, delivered in 27 ms slices spread across minutes of browsing.
- Peak added latency to any UI interaction: **27 ms.**

That is the design target, and it is met with measured margin.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  CAIDO PROXY                                                                  │
│  response delivered to browser ──────────────────────► (already on the wire)  │
│                │                                                              │
│                │ fire-and-forget, not awaited                                 │
└────────────────┼──────────────────────────────────────────────────────────────┘
                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  packages/backend — QUICKJS, SINGLE THREAD                                    │
│                                                                               │
│  ┌────────────────────┐   ≤1 ms, no body decode                              │
│  │ AdmissionFilter    │  code ∈ 2xx · body.length ∈ [128, 8MB] · ct/ext is JS │
│  │ (in the hook)      │  · inScope() · hash-cache miss                        │
│  └─────────┬──────────┘                                                       │
│            ▼                                                                  │
│  ┌────────────────────┐        ┌──────────────────┐                          │
│  │ CpuQueue (conc. 1) │◄───────│ NetQueue (conc.4)│  rate-limited, per-host   │
│  │ bounded 256        │        │ token buckets    │  token bucket             │
│  └─────────┬──────────┘        └────────┬─────────┘                          │
│            ▼                            │                                     │
│  ┌──────────────────────────────────────┼─────────────────────────────────┐  │
│  │ packages/engine — ANALYSIS PIPELINE   │                                 │  │
│  │  Decode → SHA256 → Chunker(64KB/4KB)  │                                 │  │
│  │     → KeywordGate → Stage1 Regex      │                                 │  │
│  │     → Stage2 Structural/AST (Tier B)  │                                 │  │
│  │     → Scorer (log-odds signals)       │                                 │  │
│  │     → Deduper → Persist               │                                 │  │
│  │  Deadline + AbortSignal checked between every chunk and detector        │  │
│  └───────────┬───────────────────────────┼─────────────────────────────────┘  │
│              │                            ▼                                    │
│              │                  ┌────────────────────┐                        │
│              │                  │ ActiveOps          │ sourcemap .map guess    │
│              │                  │ Governor           │ chunk-graph discovery   │
│              │                  │ (per-feature       │ npm registry lookup     │
│              │                  │  toggle+rps+conc.) │ secret validation (OFF) │
│              │                  └────────────────────┘                        │
│              ▼                                                                 │
│  ┌────────────────────┐  ┌──────────────────┐  ┌────────────────────────────┐ │
│  │ SQLite             │  │ FindingsBridge   │  │ EventCoalescer             │ │
│  │ sdk.meta.db()      │  │ sdk.findings     │  │ debounce 250ms, ≤4/s,      │ │
│  │ (worker-thread     │  │  .create/.exists │  │ summary-only payloads      │ │
│  │  pool, WAL on)     │  │ high-sev only    │  │                            │ │
│  └────────────────────┘  └──────────────────┘  └─────────────┬──────────────┘ │
│  ┌────────────────────┐                                       │               │
│  │ RPC API            │◄──────────────────────────────────────┼──────────────┐│
│  │ keyset-paginated   │                                       │              ││
│  └────────────────────┘                                       │              ││
└───────────────────────────────────────────────────────────────┼──────────────┼┘
                                                                 ▼              │
┌──────────────────────────────────────────────────────────────────────────────┐
│  packages/frontend — VUE 3 + PRIMEVUE + PINIA                                 │
│  services/*  ← sdk.backend.onEvent(...)  (summaries only, never rows)         │
│  repositories/* → sdk.backend.rpc(...)   (paged rows on demand)               │
│  views: Assets · Findings (RecycleScroller) · Source Viewer · Diff · Settings │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Owns | Never does |
|---|---|---|
| `AdmissionFilter` | The `onInterceptResponse` body. Sub-millisecond accept/reject. | Decode a body, touch SQLite, `await` anything |
| `CpuQueue` | Bounded FIFO+priority queue, concurrency 1, overflow policy, cancellation tokens | Network I/O |
| `NetQueue` / `ActiveOpsGovernor` | Per-feature enable flag, global + per-host concurrency, token-bucket rps, scope enforcement | CPU-bound analysis |
| `Chunker` | 64 KB windows with 4 KB overlap, absolute-offset mapping, adaptive shrink on slice overrun | Know anything about detectors |
| `KeywordGate` | Deduped literal set → `Set<DetectorId>` that survive. One `indexOf` per unique literal per content. | Regex |
| `DetectorRegistry` | Detector corpus, tiering, per-detector enable overrides, `detectorSetHash` | Persistence |
| `Scorer` | Signal → confidence via weighted log-odds; explainability payload | Decide severity (detector's job) |
| `Deduper` | `finding_key` computation and upsert semantics | Presentation |
| `Store` (SQLite) | All persistence. Always parameterised, always `project_id`-scoped. | Hold bodies in memory |
| `FindingsBridge` | Mirror high-severity/high-confidence findings into Caido's native Findings with `dedupeKey` | Mirror everything |
| `EventCoalescer` | Debounced, size-capped `sdk.api.send` | Send row data |
| `Api` (RPC) | Keyset-paginated queries, exports, job control | Long synchronous work |

---

## Recommended Project Structure

```
DefMiner/
├── caido.config.ts                 # defineConfig: one backend + one frontend plugin
├── package.json                    # root scripts: build / watch / test / typecheck / lint / knip
├── pnpm-workspace.yaml
├── vitest.workspace.ts
├── packages/
│   ├── shared/                     # @defminer/shared — the contract. ZERO runtime deps.
│   │   └── src/
│   │       ├── api.ts              # type API = DefineAPI<{...}> surface
│   │       ├── events.ts           # type Events = { "scan:progress": (...) => void, ... }
│   │       ├── dto.ts              # FindingRow, AssetRow, QueueSnapshot, DiffRow
│   │       ├── settings.ts         # UserConfig + zod-free runtime validators
│   │       ├── result.ts           # Result<T,E> (scanner's Ok/Error convention)
│   │       └── index.ts            # exports DefinePluginPackageSpec for the store
│   │
│   ├── detectors/                  # @defminer/detectors — THE CORPUS. No caido:* imports.
│   │   ├── src/
│   │   │   ├── types.ts            # Detector, Candidate, Signal, ScanContext, Chunk
│   │   │   ├── define.ts           # defineRegexDetector / defineAstDetector / defineJsonDetector
│   │   │   ├── score.ts            # log-odds combiner + weights
│   │   │   ├── registry.ts         # register / select / detectorSetHash
│   │   │   ├── redact.ts           # value normalisation + redaction (shared by all)
│   │   │   ├── secrets/
│   │   │   │   ├── aws/{index.ts,index.spec.ts,fixtures.ts}
│   │   │   │   ├── github/…  gcp/…  stripe/…  slack/…  twilio/…  openai/…
│   │   │   ├── recon/              # subdomains, cloud storage, private IPs, internal hosts
│   │   │   ├── endpoints/          # regex tier + AST tier
│   │   │   ├── structural/         # AST-only: fetch/axios/XHR, routers, postMessage, DOM sinks
│   │   │   ├── supplychain/        # dependency confusion, library fingerprinting
│   │   │   └── index.ts            # export const detectors: Detector[]
│   │   └── corpus/
│   │       ├── truepositive/       # synthetic + redacted real bundles with expected findings
│   │       ├── falsepositive/      # real bundles known clean — the FP-rate release gate
│   │       └── fetch-corpus.mjs    # downloads large fixtures; keeps git small
│   │
│   ├── engine/                     # @defminer/engine — pipeline. caido types only, no SDK calls.
│   │   └── src/
│   │       ├── chunker.ts          ├── gate.ts        ├── pipeline.ts
│   │       ├── deadline.ts         ├── queue.ts       ├── yield.ts
│   │       ├── dedupe.ts           ├── sourcemap.ts   └── ast/{provider.ts,walk.ts}
│   │
│   ├── backend/                    # the Caido backend plugin — THIN wiring layer
│   │   └── src/
│   │       ├── index.ts            # init(sdk): register RPC, hooks, migrations
│   │       ├── hooks/passive.ts    # the onInterceptResponse admission filter
│   │       ├── api/                # one file per RPC group, all returning Result<T>
│   │       ├── services/           # passiveScan, retroScan, activeOps, diff, export
│   │       ├── store/              # migrations.ts + one repo per table
│   │       ├── active/             # sourcemap.ts, npm.ts, chunks.ts, validate.ts
│   │       ├── bridge/findings.ts  # sdk.findings mirror
│   │       ├── events.ts           # EventCoalescer
│   │       └── sdk.ts              # setSDK/requireSDK singleton (scanner's pattern)
│   │
│   └── frontend/                   # Vue 3 + PrimeVue + Pinia
│       └── src/
│           ├── index.ts            # sdk.navigation.addPage("/defminer", …)
│           ├── plugins/sdk.ts      ├── repositories/  (RPC)   ├── services/ (events→store)
│           ├── stores/             ├── components/            └── views/
│               Assets.vue · Findings.vue · Source.vue · Diff.vue · Queue.vue · Settings.vue
└── .planning/
```

### Structure Rationale

- **`detectors/` and `engine/` are separate packages with zero `caido:*` imports.** This is not tidiness — it is the release gate. PROJECT.md makes "a measured false-positive rate on a real corpus" a ship requirement. That measurement must run in plain `vitest` in CI, with no Caido process. Prior art: `caido-community/scanner` extracts exactly this into `packages/engine` (and it also ships a standalone `packages/trace-viewer` that consumes engine output outside Caido).
- **`detectors/` separate from `engine/`** because a new provider detector must be a single directory with an `index.ts`, an `index.spec.ts` and fixtures — reviewable in isolation, contributable by outsiders, and impossible to break the pipeline with. Scanner keeps its checks inside `packages/backend`; DefMiner should not, because DefMiner's corpus is the product.
- **`shared/` has zero runtime deps** and exports `DefinePluginPackageSpec` so third parties can subscribe to DefMiner events via the Client SDK's typed `pkg.subscribeEvent()` — the same pattern `@caido-community/scanner` publishes to npm.
- **`backend/` is thin.** If a file in `backend/` contains a regex, it is in the wrong package.

---

## Question 2 — Passive Trigger Design

### The admission filter (runs inside the hook, budget ≤ 1 ms)

Ordered cheapest-first; every step is a pure function of already-materialised metadata. **`getBody().toText()` is never called here** — `Body.length` is a documented `readonly` property giving the byte length without decoding.

```ts
// packages/backend/src/hooks/passive.ts
const JS_EXT = new Set(["js", "mjs", "cjs", "jsx", "ts", "tsx", "map", "json"]);
const JS_CT  = /\b(?:java|ecma)script|application\/json|text\/javascript|sourcemap/i;

export function admit(
  sdk: BackendSDK, request: Request, response: Response, cfg: UserConfig,
): Admission {
  // 1. feature flag                                            ~0 ms
  if (!cfg.passive.enabled) return REJECT("disabled");

  // 2. status                                                  ~0 ms
  const code = response.getCode();
  if (code < 200 || code >= 300) return REJECT("status");       // excludes 304 by construction

  // 3. size, WITHOUT decoding — Body.length is bytes           ~0 ms
  const body = response.getBody();
  if (body === undefined) return REJECT("nobody");
  const bytes = body.length;
  if (bytes < cfg.passive.minBytes) return REJECT("tiny");      // default 128
  if (bytes > cfg.passive.hardCeilingBytes) return REJECT("huge"); // default 32 MB

  // 4. is it JS-ish? content-type first (one header read), extension as fallback
  const ct  = response.getHeader("content-type")?.[0] ?? "";
  const ext = extensionOf(request.getPath());
  const kind = classify(ct, ext, request.getPath());            // 'js'|'map'|'json'|'html'|null
  if (kind === null) return REJECT("kind");
  if (kind === "json" && !cfg.passive.scanJson) return REJECT("kind");

  // 5. scope — SYNCHRONOUS, uses Caido's own engine, not a re-implementation
  if (cfg.passive.scopeIDs.length > 0
      ? !sdk.requests.inScope(request, cfg.passive.scopeIDs)
      : !sdk.requests.inScope(request)) return REJECT("scope");

  // 6. cheap identity cache: (requestId is unique; url+etag+len is a near-hash)
  const weakKey = `${request.getHost()}|${request.getPath()}|${bytes}|${response.getHeader("etag")?.[0] ?? ""}`;
  if (weakCache.has(weakKey)) { weakCache.touch(weakKey); return REJECT("weak-dupe"); }

  return ACCEPT({ kind, bytes, weakKey, requestId: request.getId() });
}
```

Steps 1–6 read only integers and headers. **Rejection at steps 1–5 costs no allocation at all**, which is why ≥ 95 % of proxied responses are free.

### Avoiding re-analysis: two-level dedupe

| Level | Key | Where | Cost | Catches |
|---|---|---|---|---|
| **Weak** (in the hook) | `host \| path \| byteLen \| etag` | in-memory LRU, cap 4,096 entries per project | ~0 ms | the common case: the same bundle re-requested during a session |
| **Strong** (in the job) | `sha256(rawBytes)` via `crypto.createHash("sha256")` | `contents` table, unique on `(project_id, sha256)` | measured 1.3 ms / 3.77 MB (native OpenSSL proxy — **SPIKE-3**) | CDN URL churn, query-string cache-busters, mirrored assets, and cross-asset identical chunks |

The weak cache is an optimisation; **the strong hash is the source of truth**. A content whose `sha256` already has `scan_state='done'` *and* whose `detector_set_hash` matches the current corpus is skipped entirely — only `asset_versions.last_seen_at` / `seen_count` are bumped. When the operator upgrades DefMiner and the corpus changes, `detector_set_hash` no longer matches and everything is eligible for re-scan at Tier-B/idle priority (not a thundering herd — it goes in as priority 2).

Do **not** hash in JavaScript. A djb2 loop over 3.77 MB costs 704 ms (wasm) — 500× more than the native hash.

### Very large bodies

| Body size | Treatment |
|---|---|
| < 128 B | reject (`tiny`) |
| 128 B – 8 MB | **full Tier-A scan**, 64 KB chunks, deadline = max(2 s, 1 s/MB) |
| 8 – 32 MB | **critical-only**: the ~25 highest-value provider secret detectors + sourcemap URL + private-key. Same chunking. `scan_state='partial'`, `skip_reason='size'`. Operator can force a full scan from the UI, which enqueues at priority 2. |
| > 32 MB | **record, do not scan.** Insert the `assets`/`asset_versions`/`contents` rows with `scan_state='skipped'`, `skip_reason='size'`. It appears in the inventory with a "Scan anyway" button. |

**Streaming is not available and not needed.** The Caido backend SDK hands you a materialised `Body`; there is no incremental reader for a proxied response (`stream`/`stream/web` modules exist in the runtime but the `Response` object does not expose a stream). Chunking a materialised string is free (measured 0 ms), so the chunker *is* the streaming abstraction.

**Chunk-boundary correctness.** Each chunk carries `absStart` and is sliced with `overlapBefore = 4096`. Candidates whose `start < absStart` (i.e. found in the overlap region and already reported by the previous chunk) are dropped by absolute-offset identity in the deduper. Any detector whose maximum match length could exceed 4 KB must set `maxMatchBytes` and the chunker widens the overlap for that content.

**Two patterns bypass the chunker entirely** because they are inherently whole-file:
1. **Inline base64 sourcemaps** (`//# sourceMappingURL=data:application/json;base64,…`) — located with a single `indexOf("sourceMappingURL=data:")`, then decoded from that offset to end-of-line. Never regex-matched across chunks.
2. **Whole-file JSON** (`.map`, `manifest.json`, `asset-manifest.json`) — parsed with `JSON.parse` if `bytes < astCeiling`, otherwise treated as text.

---

## Question 3 — Data Model

### Constraints the schema must respect (all verified)

- `sdk.meta.db()` returns a **plugin-global** database in Caido Data — *not* per-project. Every table carries `project_id`. (`caido-community/authmatrix` does exactly this: `PRIMARY KEY (id, project_id)` on all seven of its tables.)
- **Named parameters are not supported** — positional `?` only. Repeat bindings rather than reusing `?1`.
- The driver is a **connection pool, fully asynchronous, each connection on a worker thread**, WAL on by default. Therefore: DB work does not burn the JS thread, but every statement is an `await` — batch aggressively and never `await` per-finding inside a chunk loop.
- `PRAGMA foreign_keys = ON` works (authmatrix runs it).
- Avoid `STRICT` tables and `RETURNING` — the bundled SQLite version is unpinned (**SPIKE-7**). Window functions and row-value comparisons are used below with non-window fallbacks noted.

### DDL

```sql
-- packages/backend/src/store/migrations.ts — migration 001
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSETS: a logical URL inside a project. Survives redeploys via path_key.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  id            TEXT    NOT NULL PRIMARY KEY,          -- uuid
  project_id    TEXT    NOT NULL,
  host          TEXT    NOT NULL,
  port          INTEGER NOT NULL,
  is_tls        INTEGER NOT NULL CHECK (is_tls IN (0,1)),
  path          TEXT    NOT NULL,                      -- most recent raw path
  path_key      TEXT    NOT NULL,                      -- build-hash-normalised, see below
  kind          TEXT    NOT NULL CHECK (kind IN ('js','map','json','html','css','wasm','other')),
  first_seen_at INTEGER NOT NULL,                      -- epoch ms
  last_seen_at  INTEGER NOT NULL,
  seen_count    INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_assets_identity
  ON assets (project_id, host, port, is_tls, path_key);
CREATE INDEX IF NOT EXISTS ix_assets_recent ON assets (project_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS ix_assets_host   ON assets (project_id, host, kind);

-- ─────────────────────────────────────────────────────────────────────────────
-- CONTENTS: content-addressed unit of WORK. Scanning is per-content, not per-URL.
-- Doubles as the DURABLE JOB QUEUE: scan_state='pending' survives restarts.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contents (
  project_id        TEXT    NOT NULL,
  sha256            TEXT    NOT NULL,
  byte_len          INTEGER NOT NULL,
  kind              TEXT    NOT NULL,
  scan_state        TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (scan_state IN ('pending','running','done','partial','skipped','failed')),
  skip_reason       TEXT,                              -- 'size'|'budget'|'queue_overflow'|'ast_budget'|null
  detector_set_hash TEXT,                              -- corpus version that produced current findings
  tier              TEXT    NOT NULL DEFAULT 'A' CHECK (tier IN ('A','B')),
  priority          INTEGER NOT NULL DEFAULT 1,        -- 0 = interactive, 1 = passive, 2 = backfill
  scan_ms           INTEGER,
  scanned_at        INTEGER,
  body_path         TEXT,                              -- optional cache under sdk.meta.path(); NOT a blob column
  PRIMARY KEY (project_id, sha256)
);
CREATE INDEX IF NOT EXISTS ix_contents_queue
  ON contents (project_id, scan_state, priority, byte_len);
CREATE INDEX IF NOT EXISTS ix_contents_stale
  ON contents (project_id, detector_set_hash);

-- ─────────────────────────────────────────────────────────────────────────────
-- ASSET_VERSIONS: the asset ↔ content edge. This table IS the deploy history.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_versions (
  id            TEXT    NOT NULL PRIMARY KEY,
  project_id    TEXT    NOT NULL,
  asset_id      TEXT    NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  sha256        TEXT    NOT NULL,
  raw_path      TEXT    NOT NULL,                      -- the un-normalised path for this version
  request_id    TEXT,                                  -- Caido request ID (most recent sighting)
  etag          TEXT,
  last_modified TEXT,
  first_seen_at INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL,
  seen_count    INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_versions_edge  ON asset_versions (asset_id, sha256);
CREATE INDEX        IF NOT EXISTS ix_versions_time  ON asset_versions (asset_id, first_seen_at DESC);
CREATE INDEX        IF NOT EXISTS ix_versions_sha   ON asset_versions (project_id, sha256);

-- ─────────────────────────────────────────────────────────────────────────────
-- FINDINGS: deduped per (project, detector, normalised value, asset).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS findings (
  id               TEXT    NOT NULL PRIMARY KEY,
  project_id       TEXT    NOT NULL,
  finding_key      TEXT    NOT NULL,                   -- sha256(detector_id|value_norm|asset_id)
  detector_id      TEXT    NOT NULL,
  category         TEXT    NOT NULL CHECK (category IN
                     ('secret','endpoint','subdomain','storage','dependency',
                      'sourcemap','jwt','graphql','domxss','library','host','other')),
  severity         TEXT    NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
  severity_rank    INTEGER NOT NULL,                   -- 0..4, for range filters and ORDER BY
  confidence       INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  title            TEXT    NOT NULL,
  value_raw        TEXT    NOT NULL,
  value_norm       TEXT    NOT NULL,
  value_redacted   TEXT    NOT NULL,
  signals_json     TEXT    NOT NULL DEFAULT '[]',      -- explainability: the Signal[] that scored it
  metadata_json    TEXT    NOT NULL DEFAULT '{}',
  asset_id         TEXT    NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  first_sha256     TEXT    NOT NULL,
  last_sha256      TEXT    NOT NULL,
  first_seen_at    INTEGER NOT NULL,
  last_seen_at     INTEGER NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  status           TEXT    NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','triaged','confirmed','false_positive','ignored')),
  validation       TEXT    NOT NULL DEFAULT 'unchecked'
                   CHECK (validation IN ('unchecked','live','revoked','error','skipped')),
  validated_at     INTEGER,
  caido_finding_id TEXT                                -- set if mirrored into native Findings
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_findings_key ON findings (project_id, finding_key);
-- keyset pagination index (see Q4):
CREATE INDEX IF NOT EXISTS ix_findings_page
  ON findings (project_id, last_seen_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS ix_findings_filter
  ON findings (project_id, category, severity_rank DESC, confidence DESC, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS ix_findings_asset    ON findings (asset_id, severity_rank DESC);
CREATE INDEX IF NOT EXISTS ix_findings_detector ON findings (project_id, detector_id);
CREATE INDEX IF NOT EXISTS ix_findings_triage
  ON findings (project_id, status) WHERE status = 'new';

-- ─────────────────────────────────────────────────────────────────────────────
-- OCCURRENCES: which content, at which offset. This is what makes diffing exact.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finding_occurrences (
  finding_id TEXT    NOT NULL REFERENCES findings (id) ON DELETE CASCADE,
  sha256     TEXT    NOT NULL,
  byte_start INTEGER NOT NULL,
  byte_end   INTEGER NOT NULL,
  line       INTEGER,
  col        INTEGER,
  snippet    TEXT    NOT NULL,                         -- ≤ 240 chars, value already redacted
  PRIMARY KEY (finding_id, sha256, byte_start)
);
CREATE INDEX IF NOT EXISTS ix_occ_content ON finding_occurrences (sha256);

-- ─────────────────────────────────────────────────────────────────────────────
-- DETECTOR RUNS: telemetry that proves the budget is being met.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS detector_runs (
  id                TEXT    NOT NULL PRIMARY KEY,
  project_id        TEXT    NOT NULL,
  sha256            TEXT    NOT NULL,
  detector_set_hash TEXT    NOT NULL,
  trigger           TEXT    NOT NULL CHECK (trigger IN ('passive','retro','manual','rescan')),
  tier              TEXT    NOT NULL CHECK (tier IN ('A','B')),
  started_at        INTEGER NOT NULL,
  finished_at       INTEGER,
  outcome           TEXT    NOT NULL DEFAULT 'running'
                    CHECK (outcome IN ('running','ok','budget_exceeded','cancelled','error')),
  bytes_scanned     INTEGER,
  chunks            INTEGER,
  max_slice_ms      INTEGER,                           -- the p100 event-loop block for this run
  gate_ms           INTEGER,
  stage1_ms         INTEGER,
  stage2_ms         INTEGER,
  detectors_gated   INTEGER,
  detectors_run     INTEGER,
  findings_new      INTEGER NOT NULL DEFAULT 0,
  error             TEXT
);
CREATE INDEX IF NOT EXISTS ix_runs_recent ON detector_runs (project_id, started_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROBE CACHE: negative-caches active operations so we never re-ask.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS probe_cache (
  project_id TEXT    NOT NULL,
  op         TEXT    NOT NULL CHECK (op IN ('sourcemap','chunk','npm','validate')),
  key        TEXT    NOT NULL,                         -- url | package name | secret hash
  result     TEXT    NOT NULL,                         -- 'hit'|'miss'|'error'
  status     INTEGER,
  payload    TEXT,
  checked_at INTEGER NOT NULL,
  ttl_s      INTEGER NOT NULL,
  PRIMARY KEY (project_id, op, key)
);
CREATE INDEX IF NOT EXISTS ix_probe_expiry ON probe_cache (checked_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- RETRO SCAN JOBS: resumable bulk scans.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retro_jobs (
  id            TEXT    NOT NULL PRIMARY KEY,
  project_id    TEXT    NOT NULL,
  httpql        TEXT    NOT NULL,
  state         TEXT    NOT NULL DEFAULT 'running'
                CHECK (state IN ('running','paused','cancelled','done','failed')),
  cursor        TEXT,                                  -- opaque Caido cursor; resume point
  seen          INTEGER NOT NULL DEFAULT 0,
  admitted      INTEGER NOT NULL DEFAULT 0,
  scanned       INTEGER NOT NULL DEFAULT 0,
  findings_new  INTEGER NOT NULL DEFAULT 0,
  total_estimate INTEGER,
  started_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  error         TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  project_id TEXT NOT NULL,           -- '' = global defaults
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,           -- JSON
  PRIMARY KEY (project_id, key)
);
```

### `path_key` — the trick that makes cross-deploy diffs work

Build tools embed a content hash in the filename, so the *URL* changes every deploy and naive URL-keyed storage produces a new "asset" each time, making diffs impossible. `path_key` strips it:

```ts
// packages/engine/src/dedupe.ts
const HASHY = /([._-])(?:[0-9a-f]{8,32}|[0-9a-zA-Z_-]{8,12})(?=\.[a-z0-9]{2,5}(?:\.map)?$|\.chunk\.|\.bundle\.)/gi;
export const pathKey = (p: string): string =>
  p.replace(HASHY, "$1{H}")                     // main.7f3a91c2.chunk.js → main.{H}.chunk.js
   .replace(/\/\d+\.[0-9a-f]{8,}\./g, "/{N}.{H}.")  // webpack numeric chunks
   .replace(/[?#].*$/, "");
```

This is heuristic and will occasionally over- or under-merge. Mitigation: `asset_versions.raw_path` keeps the truth, and the UI offers "split this asset" / "merge these assets" so the operator can correct it. **Named spike: SPIKE-12** — validate `pathKey` against a corpus of real webpack/vite/rollup/turbopack output before committing to it.

### Dedupe semantics

**Finding identity** = `sha256(detector_id + " " + value_norm + " " + asset_id)`.

- `value_norm` is detector-defined: for an AWS AKID it is the key itself; for an endpoint it is the path with numeric/uuid segments collapsed to `{id}`; for a subdomain it is the lowercased FQDN. Normalisation is what stops "the same finding 4,000 times".
- Scoping the key by **`asset_id`, not `sha256`**, is deliberate: the same key in the same file across three deploys is *one* finding with three occurrences, not three findings.
- Upsert, no read-modify-write round trip:

```sql
INSERT INTO findings (id, project_id, finding_key, detector_id, category, severity, severity_rank,
                      confidence, title, value_raw, value_norm, value_redacted, signals_json,
                      metadata_json, asset_id, first_sha256, last_sha256,
                      first_seen_at, last_seen_at, occurrence_count)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)
ON CONFLICT (project_id, finding_key) DO UPDATE SET
  last_sha256      = excluded.last_sha256,
  last_seen_at     = excluded.last_seen_at,
  occurrence_count = findings.occurrence_count + 1,
  confidence       = MAX(findings.confidence, excluded.confidence),
  signals_json     = CASE WHEN excluded.confidence > findings.confidence
                          THEN excluded.signals_json ELSE findings.signals_json END;
```

Native Caido Findings are mirrored **only** for `severity_rank >= 3 AND confidence >= 70`, using `sdk.findings.exists(dedupeKey)` before `sdk.findings.create({ …, dedupeKey })` where `dedupeKey = "defminer:" + finding_key`. Caido's Findings view is a triage surface; flooding it is the fastest way to get uninstalled.

### "What changed since the last deploy"

Two statements. Positional `?` only, so bindings repeat.

```sql
-- 1. the two most recent contents for this asset
SELECT sha256, first_seen_at
FROM asset_versions
WHERE asset_id = ?
ORDER BY first_seen_at DESC
LIMIT 2;
```

```sql
-- 2. added / removed / carried-over, with ?=newSha, ?=oldSha, ?=assetId
SELECT * FROM (
  SELECT f.id, f.detector_id, f.category, f.severity, f.severity_rank, f.confidence,
         f.title, f.value_redacted,
         EXISTS (SELECT 1 FROM finding_occurrences o
                 WHERE o.finding_id = f.id AND o.sha256 = ?) AS in_new,
         EXISTS (SELECT 1 FROM finding_occurrences o
                 WHERE o.finding_id = f.id AND o.sha256 = ?) AS in_old
  FROM findings f
  WHERE f.asset_id = ?
)
WHERE in_new = 1 OR in_old = 1
ORDER BY (in_new - in_old) DESC,        -- +1 added, 0 unchanged, -1 removed
         severity_rank DESC, confidence DESC;
```

`in_new - in_old` gives the change class without a `CASE`: `1` = added this deploy, `0` = present in both, `-1` = disappeared. The `EXISTS` subqueries avoid the row multiplication a `LEFT JOIN` on `finding_occurrences` would cause when a finding occurs many times in one file.

Project-wide "what changed today" is the same shape driven by `asset_versions.first_seen_at > ?`.

### Keeping the DB bounded

`sdk.meta.db()` lives in Caido Data and **Caido never garbage-collects it**. Unbounded growth is a real, user-visible failure mode (this DB is not deleted when a project is deleted).

| Mechanism | Rule |
|---|---|
| **No blobs.** | Bodies are never stored in SQLite. Reconstructed sourcemap sources go to `sdk.meta.path()/bodies/<sha256>` on disk, capped by a total-bytes budget (default 512 MB) with LRU eviction; `contents.body_path` is nulled on eviction. |
| **Version cap.** | Keep the 10 most recent `asset_versions` per asset. `DELETE FROM asset_versions WHERE id IN (SELECT id FROM asset_versions WHERE asset_id = ? ORDER BY first_seen_at DESC LIMIT -1 OFFSET 10);` |
| **Orphan sweep.** | `DELETE FROM contents WHERE project_id = ? AND sha256 NOT IN (SELECT sha256 FROM asset_versions WHERE project_id = ?);` — cascades nothing, so also sweep `finding_occurrences` by `sha256`. |
| **Telemetry TTL.** | `DELETE FROM detector_runs WHERE started_at < ?` (keep 7 days) and cap at 20,000 rows per project. |
| **Probe TTL.** | `DELETE FROM probe_cache WHERE checked_at + ttl_s * 1000 < ?`. |
| **Snippet cap.** | `finding_occurrences.snippet` truncated to 240 chars; at most 50 occurrences persisted per finding (`occurrence_count` still counts all). |
| **Project GC.** | On `onProjectChange`, reconcile `settings`/`assets` `project_id` values against `sdk.projects` and offer to purge orphaned projects from the DefMiner Settings page. |
| **Vacuum.** | Run `PRAGMA optimize` after each maintenance pass; run `VACUUM` only on explicit operator action (it rewrites the whole file). |

Maintenance runs on an idle trigger — `cpuQueue.onIdle()` plus a 15-minute `setInterval` — never on the hot path.

---

## Question 4 — Backend / Frontend Split

### Who owns what

| Concern | `packages/backend` | `packages/frontend` |
|---|---|---|
| Intercept hook, queues, detectors, budgets | ✅ | ✗ |
| SQLite, all persistence | ✅ | ✗ (frontend `sdk.storage` is for UI prefs only — the docs note it "exists in the backend" but is inaccessible to the backend plugin) |
| Active network operations, rate limiting, scope enforcement | ✅ | ✗ (frontend only toggles flags) |
| Native Findings mirroring | ✅ | ✗ |
| Sorting / filtering / paging of findings | ✅ (SQL) | ✗ (never fetch-all-then-filter) |
| Reconstructed sourcemap source text | ✅ stores on disk, serves one file per RPC | renders |
| Filter state, selection, column layout, theme | ✗ | ✅ (`sdk.storage`) |
| Rendering, virtual scrolling, export triggering | ✗ | ✅ |

### Live updates without flooding

The rule: **`sdk.api.send` carries summaries and invalidation signals, never row data.**

```ts
// packages/shared/src/events.ts
export type Events = {
  // ≤ 4/s, ~400 bytes. Drives the progress chrome.
  "scan:progress":    (s: ScanSnapshot) => void;
  // fires at most once per 250 ms window; carries counts + the 20 newest headlines only
  "findings:changed": (d: FindingsDelta) => void;
  "assets:changed":   (d: { added: number; updated: number; totalAssets: number }) => void;
  "retro:progress":   (jobId: string, p: RetroProgress) => void;
  "project:changed":  (projectId: string | undefined, phase: "start" | "ready") => void;
  "config:updated":   (projectId: string | undefined) => void;
  "notice":           (n: { level: "info"|"warn"|"error"; code: string; message: string }) => void;
};

export type FindingsDelta = {
  added: number;                       // since last emit
  updated: number;
  totalNew: number;                    // status='new' count, for the badge
  bySeverity: Record<Severity, number>;
  headlines: FindingHeadline[];        // HARD CAP 20; id+title+severity+detector+redacted only
  truncated: boolean;                  // true if added > 20 → frontend must refetch, not append
};
```

The coalescer, modelled directly on scanner's `emitPassiveQueueSnapshot` but with counters:

```ts
// packages/backend/src/events.ts
export function createCoalescer(sdk: BackendSDK, windowMs = 250, maxPerSecond = 4) {
  let timer: Timeout | undefined;
  let pending: Accumulator = empty();
  let emittedThisSecond = 0, secondStart = Date.now();

  const flush = () => {
    timer = undefined;
    const now = Date.now();
    if (now - secondStart >= 1000) { secondStart = now; emittedThisSecond = 0; }
    if (emittedThisSecond >= maxPerSecond) {          // rate ceiling: coalesce further
      timer = setTimeout(flush, 1000 - (now - secondStart));
      return;
    }
    emittedThisSecond++;
    sdk.api.send("findings:changed", toDelta(pending));  // headlines capped at 20
    pending = empty();
  };

  return {
    note(f: PersistedFinding) {
      accumulate(pending, f);
      if (timer === undefined) timer = setTimeout(flush, windowMs);   // trailing edge
    },
  };
}
```

Three properties that matter:

1. **Trailing-edge debounce with a re-entrancy guard** (scanner's exact shape) means a burst of 4,000 findings from one bundle produces *one* event.
2. **`headlines` is hard-capped at 20 and `truncated` flips true beyond that.** `caido-community/data-grep` has the same instinct — it sends the array up to a threshold and then degrades to sending only a count (`if (sentMatchCount > 25000) sdk.api.send("caidogrep:matches", newMatchResults.length)`). Do this from row 20, not row 25,000.
3. **The frontend treats every event as "invalidate", not "append"** unless `truncated === false`. On invalidate it refetches the *currently visible page* via RPC. This bounds the wire cost at one page regardless of backend throughput.

> **SPIKE-6:** no documented size ceiling on `sdk.api.send` payloads. Measure where it degrades. Until then, cap every event payload at 8 KB by construction.

### Pagination for thousands of rows

**Keyset (seek) pagination, not `OFFSET`.** `OFFSET 20000` makes SQLite walk 20,000 rows; keyset is O(log n) on the index.

```ts
// packages/shared/src/api.ts
export type FindingsPage = { rows: FindingRow[]; next: FindingCursor | null; total: number | null };
export type FindingCursor = { lastSeenAt: number; id: string };
export type FindingsFilter = {
  category?: DetectorCategory[]; minSeverityRank?: number; minConfidence?: number;
  status?: FindingStatus[]; assetId?: string; detectorId?: string; host?: string; search?: string;
};
export type API = DefineAPI<{
  listFindings: (f: FindingsFilter, cursor: FindingCursor | null, limit: number) => Result<FindingsPage>;
  countFindings: (f: FindingsFilter) => Result<number>;   // separate; only on filter change
  getFinding:    (id: string) => Result<FindingDetail>;   // occurrences + snippets, on selection
  // …
}>;
```

```sql
-- limit is clamped server-side to [1, 200]
SELECT f.id, f.detector_id, f.category, f.severity, f.severity_rank, f.confidence,
       f.title, f.value_redacted, f.status, f.validation, f.occurrence_count,
       f.last_seen_at, a.host, a.path
FROM findings f
JOIN assets a ON a.id = f.asset_id
WHERE f.project_id = ?
  AND f.severity_rank >= ?
  AND f.confidence    >= ?
  AND (f.last_seen_at < ? OR (f.last_seen_at = ? AND f.id < ?))   -- keyset; pass sentinels on page 1
ORDER BY f.last_seen_at DESC, f.id DESC
LIMIT ?;
```

Optional predicates (`category IN (…)`, `status IN (…)`, `asset_id = ?`) are appended by the query builder with correspondingly appended bindings — never string-interpolated. `search` maps to `value_norm LIKE ? OR title LIKE ?`; if full-text becomes necessary, add an FTS5 shadow table behind a spike rather than doing it in JS.

`countFindings` is a separate RPC called only when the filter changes, because `COUNT(*)` over a large filtered set is the expensive part and the operator does not need it to re-render on every scroll.

**Rendering:** page size 100, `vue-virtual-scroller`'s `RecycleScroller` for the viewport, infinite-scroll prefetch of the next page at 80 % scroll. Prior art: scanner uses `RecycleScroller`/`DynamicScroller` for exactly this in `components/queue/Container.vue` and `components/checks/Success.vue`. PrimeVue `DataTable` is fine for the ≤ 200-row Assets view but should not back the Findings table.

Payload sanity check: `JSON.stringify` of 5,000 finding rows measured **562 KB in 6 ms**. A 100-row page is ~11 KB — negligible. A "select all and export" of 50,000 rows is 5.6 MB and must go through a **file export written by the backend** to `sdk.meta.path()` (or a `Downloads` path), not through RPC.

---

## Question 5 — Detector Architecture

### Prior art

**TruffleHog's `Detector` interface** is the right model and its key idea is exactly the one the benchmarks validate:

```go
type Detector interface {
    FromData(ctx context.Context, verify bool, data []byte) ([]Result, error)
    Keywords() []string          // "used for efficiently pre-filtering chunks using substring operations"
    Type() detectorspb.DetectorType
    Description() string
}
```

Keywords are a **union**: if any keyword appears in the chunk, the detector runs. Optional capability interfaces (`Versioner`, `MaxSecretSizeProvider`, `EndpointCustomizer`) extend behaviour without widening the core interface. Results carry `Raw`/`RawV2`/`Redacted`/`Verified`/`VerificationError`/`ExtraData`.

**Caido scanner's `defineRegexCheck`** shows the ergonomics target — a provider detector should be ~15 lines:

```ts
// caido-community/scanner — packages/backend/src/checks/aws-key-disclosure/index.ts, verbatim
export default defineRegexCheck({
  id: "aws-key-disclosure",
  name: "AWS Key Disclosed",
  description: "Detects AWS access key IDs in HTTP responses…",
  tags: [Tags.SECRET, Tags.CLOUD],
  severity: Severity.CRITICAL,
  patterns: [/\b(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/],
  dedupeKey: keyStrategy().withHost().withPort().withPath().build(),
  when: whenTextResponse,
  toFinding: (matches) => ({ name: "AWS Key Disclosed", description: … }),
});
```

DefMiner keeps that ergonomics and adds: mandatory keywords, offsets, signals, tiering, and validation.

### The interface

```ts
// packages/detectors/src/types.ts
export type DetectorId = string & { readonly __detectorId?: never };
export type Tier = "A" | "B";     // A = eligible for the passive hot path. B = deep scan only.

export type DetectorCategory =
  | "secret" | "endpoint" | "subdomain" | "storage" | "dependency"
  | "sourcemap" | "jwt" | "graphql" | "domxss" | "library" | "host" | "other";

/** A 64 KB window of the asset, with absolute offsets into the whole content. */
export type Chunk = {
  readonly text: string;
  readonly absStart: number;      // offset of text[0] within the full content
  readonly overlapBefore: number; // bytes of text[] that were already seen by the previous chunk
  readonly isFirst: boolean;
  readonly isLast: boolean;
};

/** Raw hit from a detector's matcher, offsets ALWAYS absolute. */
export type Candidate = {
  readonly detectorId: DetectorId;
  readonly value: string;
  readonly start: number;
  readonly end: number;
  readonly groups?: Readonly<Record<string, string>>;
};

/** One piece of evidence. Signals are combined by the scorer, never by the detector. */
export type Signal =
  | { kind: "providerPattern"; strength: "strict" | "loose" }
  | { kind: "checksum";        algorithm: string; passed: boolean }
  | { kind: "entropy";         bits: number; threshold: number }
  | { kind: "length";          value: number; expected: readonly number[] }
  | { kind: "context";         rule: string; matched: boolean }   // nearby identifier, assignment shape
  | { kind: "corpusFalsePositive"; corpusId: string }             // matched a known-FP fingerprint
  | { kind: "placeholder";     reason: "example" | "redacted" | "repeated" | "lorem" }
  | { kind: "structural";      node: string }                     // came from an AST node, not a regex
  | { kind: "sameOrigin";      inScope: boolean }
  | { kind: "liveValidation";  state: "live" | "revoked" | "error" };

export type DetectorFinding = {
  readonly detectorId: DetectorId;
  readonly category: DetectorCategory;
  readonly severity: Severity;
  readonly title: string;
  readonly value: string;
  readonly valueNorm: string;      // the dedupe axis
  readonly redacted: string;
  readonly start: number;
  readonly end: number;
  readonly signals: readonly Signal[];
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
};

export type ScanContext = {
  readonly url: URL;
  readonly host: string;
  readonly rootDomain: string;
  readonly kind: AssetKind;
  readonly byteLen: number;
  readonly sha256: string;
  /** Random access into the WHOLE content, for context windows that cross chunk edges. */
  slice(start: number, end: number): string;
  lineCol(offset: number): { line: number; col: number };
  snippet(start: number, end: number, pad?: number): string;
  /** Memoised, budgeted, may resolve undefined. Only detectors with needsAst call this. */
  ast(): Promise<Program | undefined>;
  isInScope(url: string): boolean;
  readonly deadline: Deadline;         // .remainingMs(), .expired
  readonly signal: AbortSignal;
};

export type Detector = {
  readonly id: DetectorId;
  readonly name: string;
  readonly description: string;
  readonly category: DetectorCategory;
  readonly severity: Severity;
  readonly tier: Tier;
  readonly enabledByDefault: boolean;
  readonly tags: readonly string[];

  /**
   * TruffleHog-style gate. UNION semantics: if ANY keyword is present in the
   * content, the detector runs. Enforced invariant: a Tier-A detector MUST
   * declare ≥ 1 keyword of ≥ 4 chars. Measured: one `indexOf` pass = 1.7 ms/MB
   * vs one regex pass = 8.4 ms/MB (native QuickJS).
   */
  readonly keywords: readonly string[];

  /** Set when a match can legitimately exceed the 4 KB chunk overlap. */
  readonly maxMatchBytes?: number;
  /** Set to route through the AST provider instead of the chunker. */
  readonly needsAst?: boolean;
  /** Declared so the corpus is greppable and lintable. */
  readonly patterns?: readonly RegExp[];

  /** Matching. Chunk-local for regex detectors; called once with the whole content for AST ones. */
  scan(chunk: Chunk, ctx: ScanContext): Iterable<Candidate>;
  /** Evidence gathering. Pure, cheap, may read ctx.slice() for context windows. */
  score?(c: Candidate, ctx: ScanContext): readonly Signal[];
  /** Shaping + the detector's own veto (return undefined to drop). */
  toFinding(c: Candidate, signals: readonly Signal[], ctx: ScanContext): DetectorFinding | undefined;
  /** Optional, OFF by default, network. Never called from the passive path. */
  validate?(f: DetectorFinding, http: ValidationClient): Promise<ValidationOutcome>;
};
```

### How a new provider becomes a small testable unit

```ts
// packages/detectors/src/secrets/stripe/index.ts
import { defineRegexDetector, entropy, nearbyIdentifier, luhnLike } from "../../define";

export default defineRegexDetector({
  id: "stripe-secret-key",
  name: "Stripe secret key",
  description: "Live Stripe secret or restricted key…",
  category: "secret",
  severity: "critical",
  tier: "A",
  tags: ["payments", "provider"],
  keywords: ["sk_live_", "rk_live_"],                 // ← the gate. selective, ≥ 4 chars.
  patterns: [/\b(sk|rk)_live_[A-Za-z0-9]{24,247}\b/g],
  normalize: (m) => m[0],
  redact:    (v) => `${v.slice(0, 12)}…${v.slice(-4)}`,
  signals: (c, ctx) => [
    { kind: "providerPattern", strength: "strict" },
    { kind: "entropy", bits: entropy(c.value), threshold: 3.5 },
    nearbyIdentifier(ctx, c, /stripe|secret|apiKey/i),
    ...placeholderChecks(c.value),                     // "sk_live_xxxxxxxx", repeated chars, docs examples
  ],
  validate: async (f, http) => {
    const r = await http.get("https://api.stripe.com/v1/balance",
                             { headers: { Authorization: `Bearer ${f.value}` } });
    return r.status === 200 ? "live" : r.status === 401 ? "revoked" : "error";
  },
});
```

```ts
// packages/detectors/src/secrets/stripe/index.spec.ts — runs in plain vitest, no Caido
import detector from "./index";
import { runDetector } from "../../../test/harness";
import { TP, FP } from "./fixtures";

it.each(TP)("finds %s", async (input, expected) => {
  expect(await runDetector(detector, input)).toMatchObject([{ value: expected, confidence: expect.toBeGte(70) }]);
});
it.each(FP)("ignores %s", async (input) => {
  expect(await runDetector(detector, input)).toEqual([]);
});
it("gate is selective", () => {
  expect(detector.keywords.every((k) => k.length >= 4)).toBe(true);
});
```

A CI lint over the registry enforces: unique `id`; Tier-A ⇒ ≥ 1 keyword ≥ 4 chars; every `pattern` has the `g` flag and no nested unbounded quantifiers (ReDoS); every detector has ≥ 3 TP and ≥ 3 FP fixtures; the whole corpus over `corpus/falsepositive/` stays under the FP budget.

### How regex and AST detectors share one pipeline

They share it by producing the **same `Candidate` type with absolute offsets**, and by being scheduled in two stages against the same `ScanContext`.

```
                       ┌── content (string) + ScanContext ──┐
                       │                                     │
  Stage 0  KeywordGate │  one indexOf per UNIQUE keyword     │  1.7 ms/MB per keyword
           ───────────►│  → Set<DetectorId> survivors        │
                       │                                     │
  Stage 1  Chunker     │  64 KB windows, 4 KB overlap        │  8.4 ms/MB per surviving regex detector
           ───────────►│  for each chunk:                    │  ≤ 25 ms per slice, then yieldToLoop()
                       │    for each gated regex detector:   │
                       │      scan(chunk, ctx) → Candidate[] │
                       │                                     │
  Stage 2  AstProvider │  parse ONCE, memoised by sha256     │  Tier B only, budgeted, may return undefined
           ───────────►│  for each gated AST detector:       │
                       │    scan(wholeChunk, ctx) w/ ctx.ast()│
                       └─────────────┬───────────────────────┘
                                     ▼
                     Scorer → Deduper → Persist → Coalescer
```

The unifying contracts:

1. **Both stages emit `Candidate` with absolute offsets.** The chunker translates chunk-local `RegExp.lastIndex` to absolute by adding `absStart`; the AST walker uses node `start`/`end`, which are already absolute.
2. **Both are gated by the same `keywords` mechanism.** An AST detector for `postMessage` handlers declares `keywords: ["addEventListener", "onmessage"]` — if neither literal is present, the file is never parsed *for that detector*. Gating an expensive parse behind a 1.7 ms/MB `indexOf` is the same economics as gating a regex.
3. **`ctx.ast()` is memoised, budgeted and failable.** It parses at most once per content, returns `undefined` on parse error or budget expiry, and every AST detector must handle `undefined` by yielding nothing. A failed parse degrades the run to `partial` — regex findings still land.
4. **AST is Tier-B in v1.** It never runs from the passive hot path until SPIKE-5 gives real numbers. Regex endpoint extraction ships first and covers the JSMiner-parity requirement; AST extraction is the upgrade, run on demand or on idle.

### Confidence scoring

Signals are combined by a **weighted log-odds sum**, not by averaging or by ad-hoc `if` ladders. This gives three things ad-hoc scoring does not: signals compose without ordering effects, a single strong negative signal can veto, and every score is explainable by its terms.

```ts
// packages/detectors/src/score.ts
const W = {
  providerPatternStrict: +2.4,
  providerPatternLoose:  +0.8,
  checksumPassed:        +3.0,
  checksumFailed:        -4.0,
  entropyAbove:          +1.1,
  entropyBelow:          -1.6,
  lengthExact:           +0.7,
  contextMatched:        +0.9,
  contextAbsent:         -0.4,
  structural:            +1.4,
  corpusFalsePositive:   -3.5,
  placeholder:           -3.0,
  sameOriginOutOfScope:  -0.6,
  liveValidationLive:    +4.5,
  liveValidationRevoked: -5.0,
} as const;

const PRIOR = -2.0;   // ≈ 12 % base rate: assume a bare match is probably noise

export function confidence(signals: readonly Signal[]): number {
  let logit = PRIOR;
  for (const s of signals) logit += weightOf(s, W);
  return Math.round(1000 / (1 + Math.exp(-logit))) / 10;   // 0.0 – 100.0
}
```

Calibration and policy:

- Weights are **fitted, not invented**: the FP corpus in `packages/detectors/corpus/` is the training and regression set. `pnpm test:calibrate` reports precision/recall at each confidence decile and fails CI if precision at the display threshold regresses.
- **Display threshold defaults to 55**, tunable per operator. Findings below it are persisted (so recall is measurable) but hidden behind a "show low-confidence" toggle. This is how Core Value ("low enough false-positive rate that the operator reads every finding") becomes a mechanism instead of an aspiration.
- **Native Findings mirroring uses a much higher bar** (`severity_rank >= 3 && confidence >= 70`).
- `signals_json` is persisted so the UI can render "why this scored 87": strict provider pattern +2.4, entropy 4.2 bits +1.1, adjacent identifier `stripeSecretKey` +0.9.
- `liveValidation` is deliberately the heaviest weight in both directions — it is ground truth. It is also the only signal that transmits the secret, which is why it is OFF by default.

---

## Question 6 — Retroactive / Bulk Scanning

### Push the filter into HTTPQL

Verified HTTPQL surface (`docs.caido.io` reference): request fields `req.created_at`, `req.ext`, `req.host`, `req.len`, `req.method`, `req.path`, `req.port`, `req.query`, `req.raw`, `req.tls`; response fields `resp.code`, `resp.len`, `resp.raw`, `resp.roundtrip`; `row.id`. Operators `eq ne cont ncont like nlike regex nregex gt gte lt lte`. **There is no `resp.mime` / content-type field** — content-type must be checked client-side.

```ts
// packages/backend/src/services/retroScan.ts
export function buildRetroFilter(cfg: RetroConfig): string {
  const parts: string[] = [];
  parts.push("(" + ["js","mjs","cjs","jsx","map","json"]
    .map((e) => `req.ext.eq:"${e}"`).join(" or ")
    + ' or req.ext.eq:"")');                       // extensionless: many bundlers serve /assets/abc123
  parts.push("resp.code.gte:200", "resp.code.lt:300");
  parts.push(`resp.len.gt:${cfg.minBytes}`);       // default 128
  parts.push(`resp.len.lt:${cfg.maxBytes}`);       // default 33554432 (32 MB)
  for (const ext of ["%.png","%.jpg","%.jpeg","%.gif","%.svg","%.webp","%.ico",
                     "%.woff","%.woff2","%.ttf","%.mp4","%.mp3","%.wasm","%.pdf"]) {
    parts.push(`req.ext.nlike:"${ext}"`);          // data-grep uses exactly this shape
  }
  if (cfg.host !== undefined) parts.push(`req.host.eq:"${cfg.host}"`);
  if (cfg.since !== undefined) parts.push(`req.created_at.gt:"${cfg.since}"`);
  if (cfg.extraHttpql) parts.push(`(${cfg.extraHttpql})`);
  return parts.join(" and ");
}
```

### Page size is 20, not 1000

The backend `RequestsQuery` exposes only `after`, `before`, `first`, `last`, `filter`, `ascending`, `descending`, `execute`. **There is no `includeRaw(false)`** (that exists only on the *Client* SDK's `request.list()`). So `execute()` materialises full request **and response bodies** for every item in the page.

The docs' own example uses `.first(1000)`; `data-grep` uses 100. For a query that deliberately selects multi-megabyte JS assets, 1000 items is potentially gigabytes resident. **Use 20.** The extra round trips are amortised against 1–2 s of scanning per item anyway.

```ts
export async function runRetroScan(sdk: BackendSDK, jobId: string): Promise<void> {
  const job = await store.retro.get(jobId);
  let cursor = job.cursor ?? undefined;

  for (;;) {
    if (tokens.get(jobId)?.cancelled) { await store.retro.setState(jobId, "cancelled"); return; }

    let q = sdk.requests.query().filter(job.httpql).first(RETRO_PAGE_SIZE /* 20 */);
    q = q.ascending("req", "created_at");                 // stable order ⇒ resumable cursor
    if (cursor !== undefined) q = q.after(cursor);

    const page = await q.execute();

    for (const item of page.items) {
      if (tokens.get(jobId)?.cancelled) { await store.retro.setState(jobId, "cancelled"); return; }
      job.seen++;
      const adm = admitRetro(sdk, item.request, item.response, cfg);   // same filter as the hot path
      if (adm.kind === "reject") continue;
      job.admitted++;
      // priority 2: retro work must NEVER starve live passive scanning
      await cpuQueue.schedule(() => analyseContent(sdk, item, { trigger: "retro", priority: 2 })).promise;
      job.scanned++;
      progress.note(job);                                  // debounced emitter
    }

    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
    await store.retro.saveCursor(jobId, cursor, job);       // ← resumable across restarts
    await yieldToLoop();
  }

  await store.retro.setState(jobId, "done");
  sdk.api.send("retro:progress", jobId, finalProgress(job));
}
```

### Progress reporting

Cursors are opaque, so there is no exact percentage. Report **three honest numbers plus an optional estimate**:

```ts
export type RetroProgress = {
  state: "running" | "paused" | "cancelled" | "done" | "failed";
  seen: number;          // requests pulled from history
  admitted: number;      // passed the JS/size/scope filter
  scanned: number;       // contents actually analysed (deduped — usually << admitted)
  findingsNew: number;
  totalEstimate: number | null;   // from a one-off COUNT-shaped probe; null if unknown
  currentHost: string | null;
  elapsedMs: number;
  etaMs: number | null;           // scanned/elapsed extrapolation; null until scanned >= 10
};
```

Emitted through the same coalescer at ≤ 4/s. `totalEstimate` comes from a single pre-flight query that walks pages with `.first(200)` counting `items.length` only up to a cap of 10,000 — and it is labelled "≈" in the UI. `data-grep` fakes a percentage from `processedRequestID / lastRequestId`, which is wrong whenever the filter is selective; do not copy that.

### Cancellation

Cooperative, checked at four granularities, so worst-case cancel latency equals one chunk (~27 ms):

| Checkpoint | Latency bound |
|---|---|
| Between pages | one `execute()` round trip |
| Between items in a page | one asset |
| Between chunks (inside `analyseContent`) | **~27 ms** |
| Between detectors within a chunk | ~1 ms |

```ts
// packages/engine/src/deadline.ts
export type CancelToken = { readonly cancelled: boolean; readonly reason?: string };
export function createToken() {
  const c = new AbortController();
  let cancelled = false, reason: string | undefined;
  return {
    token: { get cancelled() { return cancelled; }, get reason() { return reason; } },
    signal: c.signal,
    cancel(r: string) { cancelled = true; reason = r; c.abort(r); },
  };
}
```

`cancelRetroJob(id)` sets the token, calls `cpuQueue.clearPending(reason)` for that job's queued items (scanner's `Scheduler.clearPending`), persists `state='cancelled'` with the last cursor, and emits. **Because the cursor is persisted, "cancel" and "pause" are the same operation with a different label** — resume re-enters at `after(cursor)`.

`onProjectChange` cancels every running job, exactly as scanner does (`scannerStore.interruptSession(sessionId, "ProjectChanged")`).

---

## Question 7 — Active Operations

### Transport choice is a security decision, not a convenience one

| Operation | Transport | Why |
|---|---|---|
| Sourcemap `.map` discovery | **`sdk.requests.send(spec)`** | Goes to the *target*. Respects upstream proxy settings, appears in Caido's HTTP history — the operator can audit exactly what DefMiner sent, and the response is a normal project artefact. |
| Webpack/Vite chunk-graph discovery | **`sdk.requests.send(spec)`** | Same — these are target requests. |
| NPM registry lookup (dependency confusion) | **`fetch` from `caido:http`** | Goes to `registry.npmjs.org`, a **third party**. Keeping it out of the project's HTTP history avoids polluting the operator's evidence trail with unrelated traffic and avoids scope confusion. |
| Secret validation | **`fetch` from `caido:http`** | Third party, and the one operation that transmits a live credential. |

### Scope enforcement

Use **`sdk.requests.inScope(spec, scopeIDs?)`** — it is synchronous and delegates to Caido's own scope engine (allowlist + denylist + wildcards). Do **not** re-implement matching from `sdk.scope.getAll()`; that API exists to populate a scope picker in the UI, which is how scanner uses it (`config.passive.scopeIDs` chosen in `ScopeSelector`, then `sdk.requests.inScope(request, config.passive.scopeIDs)` at runtime).

**Every target-bound active request is scope-checked immediately before send**, not at enqueue time — scope can change while a job sits in the queue.

```ts
// packages/backend/src/active/governor.ts
export type ActiveOp = "sourcemap" | "chunks" | "npm" | "validate";

export type ActiveOpConfig = {
  enabled: boolean;
  requestsPerSecond: number;
  maxConcurrent: number;
  maxPerAsset: number;
  scopeGated: boolean;
};

export const DEFAULTS: Record<ActiveOp, ActiveOpConfig> = {
  // ON by default per PROJECT.md Key Decisions — disclosed, individually disableable
  sourcemap: { enabled: true,  requestsPerSecond: 2, maxConcurrent: 2, maxPerAsset: 8,  scopeGated: true  },
  chunks:    { enabled: true,  requestsPerSecond: 2, maxConcurrent: 2, maxPerAsset: 25, scopeGated: true  },
  npm:       { enabled: true,  requestsPerSecond: 5, maxConcurrent: 3, maxPerAsset: 20, scopeGated: false },
  // OFF by default — transmits a live secret to its issuer and can alert the key's owner
  validate:  { enabled: false, requestsPerSecond: 1, maxConcurrent: 1, maxPerAsset: 5,  scopeGated: false },
};

export function createGovernor(sdk: BackendSDK, getCfg: () => Record<ActiveOp, ActiveOpConfig>) {
  const perOp   = new Map<ActiveOp, Scheduler>();          // scanner's createScheduler
  const buckets = new Map<string, TokenBucket>();          // key: `${op}:${host}:${port}`
  const global  = createScheduler(4);                      // hard ceiling across ALL active ops

  return {
    async run<T>(op: ActiveOp, target: { host: string; port: number; spec?: RequestSpec },
                 fn: (signal: AbortSignal) => Promise<T>): Promise<Result<T>> {
      const cfg = getCfg()[op];
      if (!cfg.enabled) return Result.err(`${op} disabled`);
      if (cfg.scopeGated && target.spec && !sdk.requests.inScope(target.spec))
        return Result.err("out of scope");

      const sched = perOp.get(op) ?? setSched(op, createScheduler(cfg.maxConcurrent));
      sched.setConcurrency(cfg.maxConcurrent);             // live-adjustable, like scanner
      const bucket = bucketFor(op, target, cfg.requestsPerSecond);

      return global.schedule(() =>
        sched.schedule(async () => { await bucket.take(); return fn(abortOf(op)); }).promise
      ).promise;
    },
    cancelAll(reason: string) { global.clearPending(reason); for (const s of perOp.values()) s.clearPending(reason); },
  };
}
```

Layers, outermost first: **global cap (4)** → **per-op concurrency** → **per-host-per-op token bucket** → **per-asset cap** → **scope check** → **`probe_cache` negative cache**. A `.map` URL that 404'd is never requested again within its TTL (7 days for a 404, 1 hour for a 5xx/network error).

### Individual toggles

Each op is one row in `settings` and one PrimeVue `ToggleSwitch` + two `InputNumber`s (rps, concurrency) in the Settings view. The Settings page also renders, verbatim and un-dismissibly, **what each op sends and to whom** — this is a Caido Developer Policy requirement ("no undisclosed external service calls") and it is also just correct.

Secret validation gets extra friction beyond the default-off flag:
- a per-provider allowlist (enabling "validation" does not enable every provider),
- a one-time modal on first enable naming the exact endpoints that will receive the secret,
- `maxPerAsset: 5` and 1 rps so an accidental enable cannot mass-burn keys,
- validation results write `findings.validation` + `validated_at`, and a `liveValidation` signal that dominates the score.

---

## Question 8 — Monorepo Layout

Covered structurally above. The delta from the standard `pnpm create @caido-community/plugin` scaffold (`packages/{frontend,backend,shared}`) is two extra packages, and it mirrors what scanner did once it outgrew the scaffold (`packages/{backend,engine,frontend,shared,trace-viewer}`).

| Package | Name | Depends on | Ships to |
|---|---|---|---|
| `packages/shared` | `@defminer/shared` | nothing | npm (typed `Spec` for third-party event subscribers) + both plugins |
| `packages/detectors` | `@defminer/detectors` | `shared` | backend; **runs standalone under vitest** |
| `packages/engine` | `@defminer/engine` | `shared`, `detectors` | backend; **runs standalone under vitest** |
| `packages/backend` | `backend` (private) | `shared`, `engine`, `detectors`, `@caido/sdk-backend` | Caido |
| `packages/frontend` | `frontend` (private) | `shared`, `@caido/sdk-frontend`, vue, primevue, pinia, vue-virtual-scroller | Caido |

Root `package.json` scripts, following scanner's `validate` convention:

```json
{
  "scripts": {
    "build":     "caido-dev build",
    "watch":     "caido-dev watch",
    "typecheck": "pnpm -r typecheck",
    "lint":      "eslint --fix packages/*/src",
    "knip":      "knip",
    "test":      "vitest run",
    "test:fp":   "vitest run --project detectors -t 'false-positive corpus'",
    "calibrate": "node scripts/calibrate.mjs",
    "validate":  "pnpm typecheck && pnpm lint && pnpm knip && pnpm test && pnpm test:fp"
  }
}
```

`caido.config.ts` follows the scanner template exactly, including the two non-obvious bits that break plugins if omitted: `postcss-prefixwrap(`#plugin--defminer`)` to prevent CSS bleeding between plugins, and `rollupOptions.external` listing `@caido/frontend-sdk`, `vue` and the CodeMirror/Lezer modules Caido already provides.

**Detector corpus location:** `packages/detectors/corpus/`. TP fixtures are small and committed. FP fixtures are real multi-megabyte bundles and are **not** committed — `corpus/manifest.json` pins URL + sha256 and `corpus/fetch-corpus.mjs` downloads them. CI caches by manifest hash. This keeps the repo clonable while making the FP-rate gate reproducible.

---

## Architectural Patterns

### Pattern 1 — Fire-and-Forget Admission

**What:** the intercept callback is synchronous, does only integer/header comparisons, and hands off through a bounded queue.
**When:** every passive hook in Caido.
**Trade-offs:** the callback cannot report failure to the user; every rejection reason must be counted and surfaced through telemetry instead.

```ts
sdk.events.onInterceptResponse((sdk, request, response) => {   // NOT async — never await here
  const adm = admit(sdk, request, response, config.get());     // ≤ 1 ms, no body decode
  if (adm.kind === "reject") { stats.reject(adm.reason); return; }

  const enqueued = cpuQueue.offer({
    key: adm.weakKey, priority: 1,
    run: (signal) => analyse(sdk, request.getId(), adm, signal),
  });
  if (!enqueued) stats.reject("queue_overflow");               // bounded: 256
});
```

### Pattern 2 — Deadline-Bounded Chunked Scan with Cooperative Yield

**What:** slice the body into 64 KB windows, run the gated detector set on each, yield to the macrotask loop between windows, and abort on deadline.
**When:** any CPU work over 25 ms in a single-threaded runtime.
**Trade-offs:** ~11 % throughput cost (measured); worth it unconditionally.

```ts
// packages/engine/src/yield.ts
// setTimeout(0) drains the MACROtask queue, letting queued intercept callbacks and
// RPC handlers run. Promise.resolve() would only drain microtasks and starve them. (SPIKE-11)
export const yieldToLoop = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

// packages/engine/src/pipeline.ts
export async function scanContent(content: string, ctx: ScanContext, gated: Detector[]) {
  const out: Candidate[] = [];
  let chunkBytes = 65_536;
  for (const chunk of chunker(content, () => chunkBytes, 4096)) {
    if (ctx.signal.aborted) throw new Cancelled(ctx.signal.reason);
    if (ctx.deadline.expired) return { candidates: out, partial: true as const };

    const t0 = Date.now();
    for (const d of gated) {
      if (d.needsAst === true) continue;                        // stage 2
      for (const c of d.scan(chunk, ctx)) out.push(c);
      if (ctx.deadline.expired) break;
    }
    const sliceMs = Date.now() - t0;
    if (sliceMs > 50) chunkBytes = Math.max(16_384, chunkBytes >> 1);   // adaptive shrink
    telemetry.slice(sliceMs);

    await yieldToLoop();                                        // ← the whole point
  }
  return { candidates: out, partial: false as const };
}
```

### Pattern 3 — Content-Addressed Work

**What:** the unit of work is `sha256(bytes)`, not a URL and not a request ID. `contents.scan_state` is simultaneously the cache, the durable queue, and the corpus-version marker.
**When:** any workload where the same payload arrives many times under different URLs.
**Trade-offs:** you must hash before you can dedupe, which costs one native hash pass (~0.34 ms/MB by proxy). The weak `host|path|len|etag` cache in the hook avoids even that for the common repeat case.

### Pattern 4 — Two-Queue Split by Resource

**What:** `cpuQueue` (concurrency **1**) and `netQueue` (concurrency 4, rate-limited) are separate objects.
**When:** single-threaded runtime with both CPU-bound and I/O-bound work.
**Trade-offs:** more moving parts than scanner's single scheduler — but scanner's checks are network-bound, so `concurrentTargets > 1` genuinely helps it. DefMiner's passive work is CPU-bound; raising CPU concurrency above 1 only interleaves, multiplying peak memory (two 8 MB bodies resident) and latency-to-first-finding while delivering identical throughput.

### Pattern 5 — Result Types Across the RPC Boundary

**What:** every `sdk.api.register` handler returns `Result<T>`; nothing throws across the boundary.
**When:** always. This is the documented Caido convention and scanner follows it universally.

```ts
export type Result<T, E = string> = { kind: "Ok"; value: T } | { kind: "Error"; error: E };
```

---

## Data Flow

### Passive flow (the hot path)

```
proxied response (already delivered to the browser)
      │
      ▼  onInterceptResponse — SYNCHRONOUS, ≤ 1 ms
 admit(): 2xx? · byte length in range? · JS content-type/ext? · in scope? · weak-cache miss?
      │  reject → stats counter, return                       (~95 % of responses stop here)
      ▼  accept
 cpuQueue.offer({ key, priority: 1, run })   ── bounded 256, overflow drops oldest priority-2
      │
      ▼  later, on the queue (concurrency 1)
 body.toText()  →  crypto.createHash("sha256")                (SPIKE-3, SPIKE-4)
      │
      ├─ contents row exists AND scan_state='done' AND detector_set_hash matches
      │      → bump asset_versions.last_seen_at/seen_count, DONE      (~90 % target)
      ▼  else
 upsert assets (path_key) · upsert contents · upsert asset_versions
      │
      ▼  KeywordGate: one indexOf per UNIQUE keyword          1.7 ms/MB each
 survivors: Set<DetectorId>
      │
      ▼  Chunker 64 KB / 4 KB overlap ── yieldToLoop() between chunks
 Stage 1 regex detectors → Candidate[]                        8.4 ms/MB each
      │
      ▼  (Tier B / on demand only)
 Stage 2 ctx.ast() memoised parse → AST detectors → Candidate[]
      │
      ▼
 score(signals) → confidence          drop below floor 20; hide below display threshold 55
      │
      ▼
 dedupe by finding_key → batched upsert into findings + finding_occurrences (ONE transaction)
      │
      ├─► severity ≥ high && confidence ≥ 70 → sdk.findings.exists → sdk.findings.create({dedupeKey})
      ├─► sourcemap URL found        → netQueue: sourcemap discovery (scope-gated)
      ├─► import specifier found     → netQueue: npm registry lookup
      └─► coalescer.note(finding)    → debounced "findings:changed" (counts + ≤20 headlines)
      │
      ▼
 detector_runs row: gate_ms, stage1_ms, max_slice_ms, bytes_scanned, outcome
```

### Frontend update flow

```
backend coalescer ──"findings:changed" (≤ 8 KB, ≤ 4/s)──► services/findings.ts
                                                                │
                                       truncated === false ─────┤── append headlines to store
                                       truncated === true  ─────┤── mark page stale
                                                                ▼
                                              repositories/findings.listFindings(filter, cursor, 100)
                                                                ▼
                                              stores/findings (pinia) → RecycleScroller renders window
                                                                ▼
                                              row click → getFinding(id) → occurrences + snippets
```

---

## Scaling Considerations

Scale here is **traffic volume and corpus size**, not users.

| Scale | What changes |
|---|---|
| **Casual browsing** — < 50 unique JS assets, < 100 MB | Nothing. Everything fits the budget with an order of magnitude of headroom. |
| **Heavy session** — 500 unique assets, ~2 GB | Queue depth becomes visible; the passive-queue UI matters. DB reaches ~10⁴–10⁵ findings — keyset pagination and `ix_findings_page` become load-bearing. Enable idle-time maintenance. |
| **Retroactive scan of a large project** — 50k requests, 10k JS assets | Retro must run at priority 2 and be resumable (`retro_jobs.cursor`). Page size 20 is mandatory. Findings reach 10⁵–10⁶: add `countFindings` caching, consider FTS5 for `search`, and enforce the occurrence cap of 50/finding hard. |
| **Corpus growth** — 40 → 400 detectors | Gate cost grows at 1.7 ms/MB per *unique* keyword, so dedupe the keyword set aggressively (400 detectors → realistically ~250 unique literals → ~425 ms/MB gate). At that point the gate itself becomes the dominant term and needs a second-level structure — see below. |

### Scaling priorities

1. **First bottleneck: the content-hash cache hit rate.** If it is not ≥ 90 %, everything else is noise. Instrument it and show it in the UI. Fix by broadening the weak-cache key and by handling `Vary`/query-string cache-busters in `pathKey`.
2. **Second bottleneck: gate cost at high detector counts.** Mitigations, in order: (a) dedupe keywords across detectors — many providers share `secret`, `token`, `amazonaws.com`; (b) prefer 6–10 char keywords over 4 char (longer literals are no more expensive to search and vastly more selective); (c) split the corpus into Tier-A (~40 detectors, always) and Tier-B (the long tail, idle/on-demand); (d) only if those are exhausted, build a real multi-pattern matcher — and note that the naive version (one big alternation) is **measured to be 2.2× slower than separate regexes**, so it would have to be a proper Aho-Corasick over `charCodeAt`, which the empty-loop measurement (9 ms/MB) says would cost ≥ 40 ms/MB. **Do not build it without evidence.**
3. **Third bottleneck: SQLite write amplification.** One `INSERT` per finding per asset will dominate on a bundle with 4,000 endpoint findings. Batch every content's findings into a single transaction with multi-row `VALUES`, and cap findings per content per detector (default 500, then record `truncated`).
4. **Fourth bottleneck: QuickJS heap.** An 8 MB ASCII body is ~8 MB as a QuickJS string, but a single non-ASCII byte promotes the whole string to UTF-16 (~16 MB). With CPU concurrency 1 and one in-flight decode, peak is ~2 bodies. **SPIKE-9** must establish the actual heap ceiling before the 32 MB tier is enabled.

---

## Anti-Patterns

### AP-1 — Doing the work inside the intercept callback
**What people do:** `sdk.events.onInterceptResponse(async (sdk, req, res) => { const body = res.getBody()?.toText(); … })`
**Why it's wrong:** the proxy does not block, but the plugin's single JS thread does. A 1.3 s scan freezes every other callback, every RPC, and the whole DefMiner UI. The `caido-plugin-skill` community doc even shows `onInterceptResponse` returning a modified spec — that is **wrong**; the SDK reference states the callback "cannot modify responses". Trust the reference, not the skill file.
**Instead:** admit-and-enqueue (Pattern 1).

### AP-2 — One big alternation regex
**What people do:** join 200 secret literals with `|` "for one fast pass".
**Why it's wrong:** **measured 2745 ms vs 1263 ms** for 40 separate regexes on the same body (native); 10725 ms vs 2255 ms in the wasm build. QuickJS's `libregexp` has no literal-prefix optimisation, and you also lose per-detector attribution, per-detector confidence, and per-detector enable/disable.
**Instead:** literal `indexOf` gate + separate compiled regexes for the survivors.

### AP-3 — Any per-character JavaScript loop over a bundle
**What people do:** compute entropy, hash, or find line numbers by iterating `charCodeAt` over the whole body.
**Why it's wrong:** an **empty** loop costs 9 ms/MB natively (54 ms/MB in wasm); a djb2 hash costs 187 ms/MB. On 8 MB that is 1.5 s for a hash you could get in 3 ms.
**Instead:** `crypto.createHash("sha256")`, `String.indexOf`, `RegExp`, `substring`. Compute line numbers lazily and only for the ≤ 50 persisted occurrences, using a one-time sparse newline index built with `indexOf("\n", i)` — not a scan.

### AP-4 — Line-based chunking
**What people do:** `body.split("\n")` and scan line by line, calling it "chunking".
**Why it's wrong:** minified bundles are ~800 lines of ~5 KB each (measured on monaco: 798 lines for 3.77 MB), and a single line can be megabytes. Line length is unbounded, so it gives no bound on slice time — which is the only thing chunking is for.
**Instead:** fixed-byte windows with explicit overlap.

### AP-5 — Storing bodies as SQLite blobs
**Why it's wrong:** `sdk.meta.db()` lives in Caido Data, is never GC'd by Caido, is not deleted with the project, and grows without bound. A single heavy session would leave gigabytes behind after the operator has moved on.
**Instead:** hashes and offsets in SQLite; bytes on disk under `sdk.meta.path()` with an LRU byte budget; `body_path` nullable.

### AP-6 — Streaming every finding to the frontend
**Why it's wrong:** a bundle can yield thousands of endpoint findings; per-finding `sdk.api.send` is a flood that both stalls the JS thread and thrashes Vue reactivity.
**Instead:** debounced counters + ≤ 20 headlines + `truncated` flag; the frontend refetches one page over RPC. (`data-grep` degrades to sending a count at 25,000 rows — do it at 20.)

### AP-7 — Dumping everything into Caido's native Findings
**Why it's wrong:** Findings is the operator's cross-tool triage queue. Filling it with 4,000 `info` endpoints destroys it and gets DefMiner uninstalled. It also directly contradicts Core Value.
**Instead:** DefMiner's own workspace holds everything; native Findings receives only `severity ≥ high && confidence ≥ 70`, always with a `dedupeKey`, always after `sdk.findings.exists`.

### AP-8 — Treating `sdk.meta.db()` as project-scoped
**Why it's wrong:** it is one database for the plugin across all projects. Without `project_id` everywhere, switching projects shows the wrong findings and "clear" deletes the wrong data.
**Instead:** `project_id` in every table and every `WHERE`; re-resolve it on `onProjectChange` (authmatrix's `withProject()` helper is the clean form).

### AP-9 — `first(1000)` on a retroactive query
**Why it's wrong:** the backend `RequestsQuery` has no `includeRaw(false)`; a page of 1000 JS assets materialises every body. The docs' own example uses 1000 — for a filter that selects large JS, that is potentially gigabytes.
**Instead:** `first(20)`, plus HTTPQL push-down (`resp.len.lt`, `req.ext.nlike`) so the pages are dense with things you actually want.

### AP-10 — Unbounded in-memory maps
**Why it's wrong:** the weak-dedupe map, the seen-hash set, and the queue-task list all grow with session length. Scanner caps its task list at 100 and clears dedupe keys on project change for exactly this reason.
**Instead:** LRU with explicit caps (weak cache 4,096; queue 256; task history 200), all cleared on `onProjectChange`.

### AP-11 — Assuming the AST parser fits
**Why it's wrong:** no plugin in the `caido-community` org bundles a JS parser (a code search for `acorn` across the org returns only `pnpm-lock.yaml` hits from build tooling; `meriyah` returns zero). Parse cost, heap cost, and even *whether it runs* in Caido's QuickJS are all unverified.
**Instead:** ship regex endpoint extraction first; make AST Tier-B behind `SPIKE-5`; design `ctx.ast()` to legitimately return `undefined`.

---

## Integration Points

### Caido SDK surface used

| SDK call | Used for | Verified behaviour that matters |
|---|---|---|
| `sdk.events.onInterceptResponse` | passive trigger | "called asynchronously and cannot modify responses" — not awaited by the proxy |
| `sdk.events.onProjectChange` | cancel jobs, swap `project_id`, clear caches | project may be `null` |
| `sdk.requests.inScope(req, scopeIds?)` | scope gating (passive + active) | **synchronous**; omit `scopeIds` to use the default scope |
| `sdk.requests.query().filter().first().after().ascending().execute()` | retroactive scan | opaque cursors; `pageInfo.hasNextPage`/`endCursor`; **no `includeRaw`** on backend |
| `sdk.requests.get(id)` | re-fetch a request for a finding | returns `RequestResponseOpt` |
| `sdk.requests.send(spec, opts?)` | `.map` and chunk probing | respects upstream proxy; lands in history; `opts.plugins` controls plugin re-entry |
| `sdk.findings.exists / create` | native findings mirror | `dedupeKey` suppresses duplicates server-side |
| `sdk.meta.db()` | all persistence | **plugin-global**; async pool on worker threads; WAL default; **positional `?` only** |
| `sdk.meta.path()` / `assetsPath()` | body cache, exports / read-only detector data | `assetsPath()` may be reset at any time — never write there |
| `sdk.api.register` / `sdk.api.send` | RPC / events | `send` is fire-and-forget; size limit undocumented (SPIKE-6) |
| `sdk.scope.getAll()` | populate the scope picker only | returns `{id, name, allowlist, denylist}` |
| `sdk.projects.getCurrent()` | resolve `project_id` | async; may be undefined |
| `crypto.createHash("sha256")` | content hashing | native; verify throughput (SPIKE-3) |
| `fetch` from `caido:http` | npm registry, secret validation | `text()/json()/arrayBuffer()/blob()/bytes()` |
| `fs/promises` from `llrt/fs` | static file dumping, body cache | `pipe()` unsupported on streams |
| `setTimeout` (global) | cooperative yield, debounce | macrotask; needed for yielding (SPIKE-11) |

### Internal boundaries

| Boundary | Mechanism | Rule |
|---|---|---|
| Proxy → backend | `onInterceptResponse` | one direction, no back-pressure signal available (SPIKE-2) |
| hook → analysis | in-process bounded queue | never `await` across this boundary in the hook |
| engine ↔ detectors | `Detector` interface | detectors may not import `caido:*`, may not touch the DB, may not do I/O except through `validate(http)` |
| backend → frontend (push) | `sdk.api.send` | summaries + invalidation only, ≤ 8 KB, ≤ 4/s |
| frontend → backend (pull) | `sdk.backend.*` RPC | always `Result<T>`, always paged, `limit` clamped server-side |
| backend → Caido Findings | `sdk.findings` | high-severity + high-confidence + `dedupeKey` only |
| backend → target | `sdk.requests.send` | scope-checked at send time, rate-limited, negative-cached |
| backend → third party | `caido:http` fetch | disclosed in Settings, individually toggleable |

---

## Open Questions → Named Spikes

Every uncertainty in this document maps to a spike with a definition of done. **SPIKE-1, -2, -4 and -5 gate the roadmap** and should be a single "Runtime Reality Check" phase before any detector work.

| ID | Question | Why it matters | Done when |
|---|---|---|---|
| **SPIKE-1** | Is the QuickJS runtime shared across installed plugins, or one per backend plugin? | If shared, a 27 ms slice hurts *other people's plugins* and the slice budget must drop to ~10 ms. Docs say "a long running thread inside Caido" without clarifying. | A test plugin busy-loops 500 ms while a second plugin timestamps a 10 ms interval; interval jitter answers it. |
| **SPIKE-2** | What happens when `onInterceptResponse` events arrive faster than the plugin drains them — unbounded buffer, proxy back-pressure, or dropped events? | Decides whether queue overflow may drop (and whether "we scanned everything" is ever true). | Register a hook that sleeps 2 s; drive 200 responses through the proxy; count callbacks received and measure client-observed latency. |
| **SPIKE-3** | Throughput of `crypto.createHash("sha256")` in Caido's QuickJS. | The entire dedupe design assumes ≪ 20 ms for 4 MB. Proxy measurement (native OpenSSL) was 1.3 ms/3.77 MB. | Hash 1/4/8/16 MB buffers in a real backend plugin; report ms/MB. Fall back to a sampled fingerprint if > 50 ms/MB. |
| **SPIKE-4** | Cost and peak memory of `Body.toText()` for 1/4/8/16/32 MB responses. | It is a synchronous native call **inside the job**; if it is slow it must be chunked or the size tiers must move. Also establishes whether `Body.length` is really free. | ms and RSS delta per size, measured in a real plugin. |
| **SPIKE-5** | Does a JS parser (`acorn`, `meriyah`) run in Caido's QuickJS, and at what cost/heap for a 4 MB minified bundle? | Decides whether AST detectors are Tier-B-on-demand or ever passive. No `caido-community` plugin bundles one, so there is zero precedent. | Bundle both, parse the monaco fixture, report parse ms, heap delta, and bundled size. Kill criterion: > 5 s or OOM at 4 MB. |
| **SPIKE-6** | Practical size ceiling and cost of a single `sdk.api.send` payload. | Bounds the event design; currently guarded by an arbitrary 8 KB self-imposed cap. | Send 1 KB → 4 MB payloads; find where latency becomes non-linear or it fails. |
| **SPIKE-7** | SQLite version, write throughput, and transaction semantics via `sdk.meta.db()` (pool on worker threads). | Determines batch sizes and whether `STRICT`, `RETURNING`, window functions and row-value comparisons are usable. | `SELECT sqlite_version()`; time 1/100/1000-row batched inserts; confirm `BEGIN…COMMIT` works across the pool. |
| **SPIKE-8** | Does `onInterceptResponse` fire for 304s, browser-cached responses, HTTP/2 pushes, and non-2xx? | Determines whether the passive path can ever see an asset the browser served from cache — i.e. whether retroactive scanning is optional or mandatory. | Instrument a hook that logs `code` + `body.length` for a full SPA load with a warm cache. |
| **SPIKE-9** | QuickJS heap ceiling for the backend plugin, and behaviour on exhaustion. | Sets the hard body-size ceiling and whether the 8–32 MB tier ships at all. | Allocate progressively larger strings until failure; record the limit and whether it throws or kills the plugin. |
| **SPIKE-10** | `sdk.meta.db()` lifecycle across project switch and plugin reload — same handle? does it need reopening? | authmatrix memoises the handle forever; if that is wrong after `onProjectChange`, every query silently targets a stale connection. | Switch projects with a memoised handle and confirm reads/writes still succeed. |
| **SPIKE-11** | Does `setTimeout(0)` in Caido's QuickJS actually let queued intercept callbacks and RPC handlers run? | The entire cooperative-yield design depends on it. `Promise.resolve()` would only drain microtasks. | Chunked scan with `yieldToLoop()` running while a timer and an RPC fire; confirm both are serviced mid-scan. |
| **SPIKE-12** | Does `pathKey` correctly merge versions across real webpack / vite / rollup / turbopack / Next.js output? | Cross-deploy diffing is meaningless if the asset identity is wrong. | Run `pathKey` over a corpus of 200 real bundle URLs from 20 sites; measure over-merge and under-merge rates; target < 5 % each. |
| **SPIKE-13** | Real-world content-hash cache hit rate during a normal browsing session. | The budget assumes ≥ 90 %. If it is 40 %, CPU cost is 6× the estimate. | Instrument `contents` hit/miss over three 20-minute sessions on real targets. |

---

## Sources

**Caido official documentation** (local mirror of `developer.caido.io/llms-full.txt`, 56,593 lines, read 2026-08-20)
- `/plugins/reference/sdks/backend/events.md` — `onInterceptRequest`/`onInterceptResponse` "called asynchronously and cannot modify"; `onUpstream` "called synchronously" — **HIGH**
- `/plugins/guides/plugin_upstream.md` — the synchronous-hook contrast — **HIGH**
- `/plugins/concepts/runtime.md`, `/plugins/concepts/backend_vs_workflows.md` — QuickJS, ES2023, "a long running thread" — **HIGH**
- `/plugins/reference/modules.md`, `/plugins/reference/modules/extra/sqlite.md` — module table; pool + worker threads; WAL default; **named parameters not supported** — **HIGH**
- `/plugins/guides/sqlite.md`, `/plugins/reference/sdks/backend/meta.md` — `sdk.meta.db()`, `path()`, `assetsPath()` — **HIGH**
- `/plugins/reference/sdks/backend/requests.md` — `RequestsQuery` method set (no `includeRaw`), `inScope`, `Body.length` — **HIGH**
- `/plugins/reference/sdks/backend/findings.md` — `dedupeKey`, `exists`, `create` — **HIGH**
- `/plugins/reference/sdks/backend/api.md`, `/plugins/guides/events.md`, `/plugins/guides/rpc.md` — `api.register` / `api.send` / `backend.onEvent` — **HIGH**
- `/plugins/guides/pagination.md` — cursor pagination — **HIGH**
- `https://docs.caido.io/reference/httpql.html` — full field/operator tables; **no content-type field** — **HIGH**

**Real plugin source** (cloned at HEAD, 2026-08-20)
- `github.com/caido-community/scanner` — `packages/backend/src/index.ts` (fire-and-forget passive hook, 150 ms debounced snapshot), `packages/engine/src/utils/scheduler.ts` (`createScheduler`), `packages/engine/src/core/request-queue.ts` (token/delay/timeout), `packages/engine/src/core/define-check-v2.ts` + `types/check-v2.ts` (check interface), `packages/backend/src/utils/when.ts` (**500 KB passive ceiling**), `packages/backend/src/stores/queue.ts` (`maxTasks: 100`), `packages/backend/src/storage/base.ts` (JSON-file storage, no SQLite), `caido.config.ts` (prefixwrap, externals) — **HIGH**
- `github.com/caido-community/authmatrix` — `packages/backend/src/db/{client,db,utils}.ts`: memoised `sdk.meta.db()`, `PRAGMA foreign_keys = ON`, **`project_id` in every PRIMARY KEY**, `withProject()` — **HIGH**
- `github.com/caido-community/data-grep` — `packages/backend/src/services/grep.ts` + `utils/grep.ts`: cursor pagination at page size 100, cooperative cancellation flag, HTTPQL push-down (`resp.len.lt`, `req.ext.nlike`), degrade-to-count flood guard — **HIGH**
- `github.com/caido-community/caido-plugin-skill` — `skills/caido-plugin-dev/SKILL.md`: useful for module inventory and Result-type convention, but **its intercept-callback example contradicts the SDK reference** (shows returning a modified spec). Treated as **LOW** where it conflicts.
- GitHub code search across `org:caido-community` for `acorn` / `meriyah`: only lockfile hits, no runtime usage → **no precedent for a JS parser in a Caido backend plugin** — **MEDIUM** (absence of evidence)

**Prior art outside Caido**
- TruffleHog `pkg/detectors/detectors.go` — `Detector` interface, `Keywords()` "used for efficiently pre-filtering chunks using substring operations", union semantics, `Result{Raw, RawV2, Redacted, Verified, VerificationError, ExtraData}`, optional capability interfaces — **HIGH**

**Measurements** (original, this document, 2026-08-20, Apple Silicon / Darwin arm64)
- Fixture: `monaco-editor@0.52.2/min/vs/editor/editor.main.js`, 3,766,654 bytes
- Engines: `quickjs-ng` 0.16.1 native (`qjs`) — primary; `quickjs-emscripten@0.31.0` — cross-check; Node/V8 24.x — reference
- Workload: 40-detector corpus representative of DefMiner's target corpus (provider secrets, cloud storage, recon, endpoints, DOM sinks)
- Scripts retained at `/private/tmp/claude-501/-Users-six2dez-Tools-DefMiner/c6320f6b-3baf-41fe-bbb8-d96f520c32f5/scratchpad/bench/` (`bench.mjs`, `bench2.mjs`, `bench3.mjs`, `bench4.mjs`, `bench5.mjs`, `nativebench.js`, `nativebench2.js`) — **HIGH** for relative costs; the absolute-throughput-on-operator-hardware question is absorbed by the deadline-based budget model rather than assumed away

---
*Architecture research for: Caido plugin doing passive + active JS static analysis*
*Researched: 2026-08-20*
