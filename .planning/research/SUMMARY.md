# Research Synthesis — DefMiner

Five independent investigations, deliberately run in parallel so they could not contaminate each other:

| Track | Agent | Output |
|---|---|---|
| Stack | GSD researcher | `STACK.md` (615 lines) |
| Features | GSD researcher | `FEATURES.md` (573 lines) |
| Architecture | GSD researcher | `ARCHITECTURE.md` (1,692 lines) |
| Pitfalls | GSD researcher | `PITFALLS.md` |
| Independent design review | **Codex `gpt-5.6-sol`, xhigh** | `CODEX-CONTRAST.md` (666 lines) |

Codex received only the project brief and the JSMiner clone — not the other agents' output, and not this project's PROJECT.md.

### How much weight convergence actually carries

**Less than the first draft of this document claimed.** Two language models reading the same public SDK reference, the same community repositories, and the same QuickJS family are *not* independent evidence — their errors and omissions are correlated by source selection. Convergence is a good reason to prioritise verification; it does not settle an empirical runtime contract.

This was raised by Codex's own adversarial review of this plan (`CODEX-REVIEW-01.md`), which pointed out the internal contradiction: a section claiming ingestion, storage, parser choice, and concurrency were "decided" sat alongside thirteen Phase 0 spikes, several of which state outright that the design changes if the answer is negative.

The section below is therefore **convergent, not settled**. Each row carries what would falsify it.

---

## 1. Convergent conclusions — high prior, still falsifiable

| Conclusion | Actual status | What would falsify it |
|---|---|---|
| `onInterceptResponse` is asynchronous | **Settled** as a documented 0.57.1 contract | Nothing for the signature. Event overflow and backpressure behaviour remain open (SPIKE-03) |
| Enqueue-only + `setTimeout(0)` yielding | Enqueue-only is prudent; cooperative background progress is **open** | RPC and timers not getting bounded service under chunk load invalidates CORE-06 and forces a different execution model |
| Meriyah decisively beats Acorn | **Not settled for deployed Caido.** Both benchmarks ran on standalone quickjs-ng | Meriyah failing syntax, exceeding the memory or time gate, or losing to tokenizer-first behaviour on the real engine |
| 64 KB / 4 KB chunk geometry | **Not settled** — hard-coded from one machine and one corpus, before Phase 0 measured anything | Any supported machine or rule producing a >50 ms slice, or a legitimate match wider than the overlap |
| SQLite is the source of truth | Sound product decision; transaction, migration, corruption, and restart behaviour are **open** | Failure injection showing non-convergent partial writes or unrecoverable migrations |
| ReDoS hangs forever | Source-supported, but the shipped binary still needs the destructive probe in a disposable instance | A host interrupt or watchdog that terminates the regex and restores later RPC and events |
| Never persist raw secrets | The **policy** is settled; HMAC key lifecycle and raw export are not | Upgrade or key-loss tests revealing correlation loss, unrevealable data, or plaintext spill |

### Where two models did converge, and by what route

These were reached separately by Codex and at least one GSD researcher, with independent methods.

| Conclusion | Codex route | GSD route |
|---|---|---|
| **`onInterceptResponse` is the passive hook, and it is asynchronous — the proxy does not await it** | SDK reference + scanner source | SDK reference quotes the deliberate contrast with `onUpstream` ("called synchronously so special care should be taken") |
| **The real hazard is starving the plugin's own single QuickJS event loop, not blocking the proxy** | "Backend plugins give you a long running thread" (singular) | Same, plus `caido/caido#2211` documenting the degraded state in production |
| **Enqueue-only in the callback; reload later via `sdk.requests.get`** | Derived from scanner's scheduler | Scanner's literal idiom: non-async callback → cheap filter → `void scheduler.schedule(...)` → return |
| **Meriyah beats Acorn decisively** | Bundled both, ran in standalone QuickJS-ng: 3.15 MB → 1.99 s vs 3.43 s | Independent bench, native quickjs-ng + emscripten, real bundles: 4.91 MB → 3,043 ms vs 7,327 ms; 7.2× gap on monaco |
| **Reject Mozilla `source-map`; use `@jridgewell/*`** | Neutral bundle pulls Node `fs`/`path`/`url` + `mappings.wasm` | Reproduced the identical failure with `source-map@0.8.0` |
| **No worker threads — CPU work is strictly serial** | Absent from the module list | Confirmed; architecture sets CPU queue concurrency to exactly 1 |
| **SQLite is the source of truth; Caido Findings are a lossy projection** | Findings SDK has only create/get/exists — no update, delete, severity, or confidence | Same, plus: every false positive is therefore *permanent* |
| **ReDoS is a first-class risk — QuickJS is ECMAScript regex, not RE2** | Noted JSMiner deliberately used RE2/J | Traced to source: quickjs-ng's `lre_check_timeout` is inert because `set_interrupt_handler` appears nowhere in `caido/dependency-llrt` |
| **Never persist raw secrets** | HMAC fingerprint + redacted preview; reveal by reloading the original request and re-verifying the body hash | Independently reached via the "Findings are permanent" argument |

**Read:** these are the strongest priors available, and they are what the design builds on — but Phase 0 exists precisely because several of them can still be wrong on the deployed engine. Treat the table above, not this list, as the authority on what is actually settled.

---

## 2. Corrections — where a track was wrong

Recorded because the roadmap must not inherit these.

**FEATURES.md claimed JS-Analyzer has no dependency-confusion verification. It was wrong.**
The agent read `analyzers/dependencyConfusion.ts`, found pure regex, and concluded there was no registry check. Verification actually lives one layer up: `services/scanService.ts:17` imports `verifyPackagesOnNpm` from `services/npmVerifier.ts`, which queries `registry.npmjs.org/<pkg>` and, on a 404 for a scoped package, additionally checks `/-/org/<org>/package` to see whether the org is claimed. That is a faithful JSMiner-equivalent check.
**Consequence: dependency-confusion verification is NOT a DefMiner differentiator.** The row is corrected in `FEATURES.md`. The genuine weaknesses in their implementation are a serial `for` loop with no concurrency, no rate limiting, no caching, no cross-scan dedup, and no consent gate before internal package names reach npmjs.

**Codex over-read the Caido Developer Policy on external services.**
It concluded registry queries and validation must be off by default for store compliance. The policy actually lists external services under **Disclosures** — permitted if "clearly indicated in your README". Default-on is compliant with disclosure. The case for opt-in NPM lookups is a privacy argument about leaking a client's internal package names, not a policy requirement.
**But the policy contains a harder constraint both tracks under-weighted:** "Include a mechanism that updates the plugin" is in the **Not Allowed** list, flatly. Any self-updating detector corpus is out.

**JS-Analyzer's `chunkDiscovery` was correctly characterised — verified independently.**
It is ~15 global regexes that fingerprint the bundler (`/__webpack_require__\b/g` and friends) and match chunk-URL-shaped strings. It does not resolve `chunkId → URL` from the webpack runtime manifest. Real chunk enumeration remains open.

---

## 3. The three findings that change the plan

**A. `caido/caido#2211` — active retrieval can abort Caido.**
Open, filed 2026-08-05 against Caido 0.57.1. Many `sdk.requests.send()` calls trip a QuickJS GC assertion and abort `caido-cli`. Measured: ≲54 fine, ~80 the runtime stalls (`Running` forever, JS timers dead), ~120+ process abort. **Cumulative across the runtime's lifetime, not per-scan.** llrt builds with `panic = "abort"` — no recovery.
A single SPA serves 100–300 JS chunks. One `.map` probe per chunk exceeds the cliff on one page load. This directly challenges the "sourcemap guessing ON by default" decision.

**B. `caido-community/JS-Analyzer` is the real incumbent, not JSMiner.**
Official Caido org, MIT, in the store, `onInterceptResponse`, 44 secret patterns, 21 cloud providers. JSMiner parity is no longer a differentiator on this platform. DefMiner's wedge is architectural — a pipeline that actually analyses (JS-Analyzer's `autoScanQueue` is pushed to and never drained by anything in the repository), durable SQLite storage, project-wide aggregation, and diffing — plus a measurably lower false-positive rate.

**C. Scanner refuses to scan what DefMiner exists to scan.**
Its passive gate is `body.toText().length <= 500_000` (`utils/when.ts`). Every modern SPA bundle exceeds it. Raising that ceiling ~20× without freezing Caido *is* the architecture, stated precisely.

---

## 4. Consolidated performance budget

All measured in native quickjs-ng, not inferred from V8. QuickJS is **~10× slower than V8 on regex** and **~17× slower on AST parsing**.

| Operation | Cost |
|---|---|
| `indexOf` literal prefilter pass | **1.7 ms/MB** |
| One regex pass | **8.4 ms/MB** |
| 20 provider regexes | 205 ms/MB |
| 40 regexes, 3.77 MB monaco | 1,263 ms (V8: 118 ms) |
| Meriyah full AST | **620 ms/MB, 33 MB heap/MB** |
| `acorn.tokenizer()` (low-memory escape) | 780 ms/MB, **~1 MB heap total** |
| `JSON.parse` sourcemap | ~2 ms/MB |
| Native sha256 | 0.34 ms/MB |
| Hand-written JS hash loop | 187 ms/MB — **forbidden** |
| Empty per-char JS loop | 9 ms/MB — **forbidden** |

**Two counter-intuitive results that shape the engine:**

1. **Mega-alternation regexes are slower, not faster.** One 200-literal alternation: 2,745 ms versus 1,263 ms for 40 separate regexes — 2.2× slower natively, 12.5× slower in WASM. The instinct to merge patterns is wrong here.
2. **Chunking is free.** `substring` across 15 chunks costs 0 ms. 64 KB chunks with 4 KB overlap cap the synchronous block at **27 ms** for an 11% throughput cost. This is what makes the whole budget-and-yield strategy viable.

Design consequence: a **three-tier gate** — `indexOf` prefilter → regex → AST — with automatic degradation (meriyah → `acorn.tokenizer()` → regex-only) by size, budget, or failure, recording the degradation level on every finding so "we scanned this" is never an overclaim.

---

## 5. Runtime hard limits

| Limit | Value | Consequence |
|---|---|---|
| `max_stack_size` | 512 KiB (half quickjs-ng default) | Recursive AST walks overflow early; needs a linear nesting-depth pre-scan |
| Deep nesting | `RangeError` at ≤4 MB stack, **SIGSEGV (exit 139) at ≥8 MB** | Cannot rely on catching it |
| `gc_threshold` | 20 MB | — |
| Memory limit | **None set** — OOM aborts the host, `panic = "abort"` | Size ceilings must be enforced by us, not the runtime |
| `CAPTURE_COUNT_MAX` | 255 | Caps regex capture groups |
| `WebAssembly` | **undefined** | oxc, swc, and `mappings.wasm` are structurally impossible, not merely slow |
| `sdk.meta.db()` | **Plugin-global, not project-scoped** | Every table needs `project_id` in its key (verified against authmatrix) |
| SQL parameters | Positional `?` only, no named | — |
| `RequestsQuery` | No `includeRaw(false)` | Retroactive page size must be 20, not the documented 1000 |

---

## 6. Detector corpus licensing

Determines where patterns may legally come from for an MIT plugin.

| Source | License | Usable? |
|---|---|---|
| TruffleHog (~800 detectors) | **AGPL-3.0** | **No** — study the architecture, copy nothing |
| Gitleaks (222 rules, keywords + entropy + allowlists) | MIT | **Yes** — primary corpus |
| nuclei-templates `file/keys` (~107 entries) | MIT | **Yes** |
| retire.js (76 libs / 723 vulns) | Apache-2.0 | **Yes** |
| jsluice (AST URL/secret matcher design) | MIT | **Yes** |
| SecretFinder | GPL-3.0 | **No** |
| keyhacks (~80 validation recipes) | none declared | Reimplement from each provider's own docs |

---

## 7. Signal quality — the Core Value, measured

`arXiv:2603.12498` ran TruffleHog v3.90.8 over the September 2025 HTTPArchive crawl: **GitHub — 1.9 M candidates, 119 verified.** That is the noise floor this class of tool operates at, and Caido's Findings cannot be deleted or downgraded once created.

Two levers the research identified:

- **Public-by-design keys are the cheapest large win, and no competitor filters them.** Firebase `apiKey`, Stripe `pk_live_`, Sentry DSN, and Algolia search keys are *meant* to be in client bundles. JS-Analyzer reports them. Suppressing them costs one allowlist and removes a large share of the noise.
- **Standalone high-entropy detection is an anti-feature.** In real bundles it matches base64 sprites, CSS-in-JS class hashes, webpack module hashes, i18n keys, SRI hashes, and source-map VLQ segments. JS-Analyzer ships it default-on.

The FP-rate gate is only mechanically enforceable if detection logic lives in a workspace with **zero Caido value-imports** — pure functions over strings, runnable under plain vitest. Scanner already does this with `packages/engine`; DefMiner must mirror it.

---

## 8. Gating spikes

Consolidated and deduplicated across tracks. These are cheap and several can invalidate the budget, so nothing else starts first.

| Question | Why it gates |
|---|---|
| Does a catastrophic regex hang DefMiner forever inside Caido? Is `re2js` fast enough as an escape hatch? | Gates the entire detection engine |
| Does `setTimeout(fn, 0)` actually yield the QuickJS event loop? | If not, budget-and-background does not work at all and the design must change |
| What does Caido do with `onInterceptResponse` events too slow to consume — queue, drop, or backpressure? | Determines whether "we scanned everything" can ever be a true statement |
| Reproduce `caido/caido#2211`: what is the current send cliff? Does `caido:http` `fetch` share the leak? | Gates every active feature |
| Does `sdk.requests.send()` re-fire `onInterceptResponse`? Do Replay/Automate/import fire it? | Recursion risk on `.map` fetches |
| Real CPU/RSS budget inside Caido (not standalone quickjs-ng); where the 512 KiB stack actually breaks | Sets every size ceiling |
| Is `structuredClone` present? (meriyah@7 needs it for ordinary destructuring) | Parser fails on real bundles without it |
| Are proxied bodies stored decompressed? Does `Body.length` equal `toRaw().length`? | Gates the passive admission filter |
| Do `PRAGMA` / `BEGIN`–`COMMIT` survive across `exec` on the pooled connection? | Gates persistence design |
| Content-hash cache hit rate on real browsing | **Biggest single performance lever** — at 40% instead of 90%, CPU cost is 6× budget |
| Do 304s / cached responses reach the hook at all? | Decides whether retroactive scanning is optional or mandatory for correctness |
| `llrt/fs` containment behaviour — no `realpath`, no `lstat` | Gates safe sourcemap reconstruction |

---

## 9. Open problems

**Asset identity across deploys.** Cross-deploy diffing needs a stable key for "the same bundle, new build". Next.js serves from `/_next/static/<buildId>/…` and the buildId changes wholesale every deploy, so the URL is useless as identity. Content hash identifies the *content*, which is exactly what changed. No track solved this; it gates the diffing feature and needs a design spike of its own.

**The filesystem is often not on the operator's machine.** Surfaced only by the adversarial review, and missed by all five research tracks plus the first draft of all three planning documents.

Caido is client/server. Backend plugins run in the Caido CLI/server process, which is routinely a remote VPS or a Docker container driven from a local browser or desktop client. Therefore `sdk.meta.path()` and every "dump reconstructed source to disk" path are **server-side** — potentially inaccessible to the operator, and potentially ephemeral, since Caido's own remote-hosting documentation states project data is not persisted across container restarts without a mounted host volume.

Every document up to this point reasoned as though a file written by the backend lands on the operator's machine. It does not. This breaks the static-dump parity feature outright, makes any "choose an output directory" UX meaningless, and changes retention, confidentiality, quota, and cleanup behaviour.

The backend SDK exposes `sdk.hostedFile` (`HostedFileSDK`), which none of the research considered. Operator-facing artifacts should be delivered through Hosted Files or a bounded authenticated frontend download — not by writing to a path and hoping the operator can reach it. Server disk must be treated as shared instance storage with quotas and orphan cleanup, and the three deployment shapes (local desktop, remote CLI, Docker with and without a volume) each need testing.
