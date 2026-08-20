# Pitfalls Research

**Domain:** Offensive-security static-analysis plugin (passive + active JS mining) inside the Caido proxy, running on an embedded QuickJS runtime
**Researched:** 2026-08-20
**Confidence:** HIGH on runtime/engine facts (read from quickjs-ng, rquickjs and `caido/dependency-llrt` source), HIGH on Caido SDK contracts (official docs), HIGH on the false-positive economics (peer-reviewed measurement on HTTPArchive), MEDIUM on Caido's undocumented internals (event queueing, plugin supervision, compression) — those are converted into named spikes rather than asserted.

---

## Severity Ranking

Front-load the top four. Each is capable of ending the project or destroying its Core Value.

| # | Pitfall | Severity | Evidence quality | Resolving spike |
|---|---------|----------|------------------|-----------------|
| **P1** | **ReDoS is unrecoverable in this runtime** — no interrupt handler is installed, so a catastrophic regex hangs DefMiner's QuickJS thread permanently | **PROJECT-SINKING** | HIGH — source-verified in quickjs-ng + llrt | SPIKE-01 |
| **P2** | **False-positive collapse** — generic/provider regexes on web JS have measured precision as low as 119 verified out of 1.9M candidates; Caido Findings cannot be updated or deleted | **PROJECT-SINKING** (kills the Core Value) | HIGH — arXiv 2603.12498 + Caido Findings SDK surface | SPIKE-09 |
| **P3** | **Event-loop starvation** — `onInterceptResponse` does *not* block the proxy, but it *does* block the single plugin thread; a slow scan silently starves every later event, all frontend RPC, and all timers | **PROJECT-SINKING** | HIGH on single-thread; MEDIUM on Caido's queue/drop behaviour | SPIKE-03 |
| **P4** | **`sdk.requests.send()` crashes all of Caido** — open bug: ~120 host-backed sends per runtime lifetime trips a QuickJS refcount assertion and aborts `caido-cli` | **PROJECT-SINKING for active features** | HIGH — caido/caido#2211, open, with disassembly | SPIKE-04 |
| **P5** | Unbounded memory: no JS heap limit is set, so OOM aborts the host process instead of throwing | PAINFUL | HIGH — absence of `set_memory_limit` in llrt | SPIKE-02 |
| **P6** | 512 KiB JS stack — half the QuickJS default; recursive AST walks over minified code overflow early | PAINFUL | HIGH — `max_stack_size: 512 * 1024` in llrt `vm.rs` | SPIKE-02 |
| **P7** | Sourcemap reconstruction writes attacker-controlled paths to disk, and llrt's `fs` has no `realpath`/`lstat` to verify containment | PAINFUL (security) | HIGH — CVE-2024-21540 class + llrt type surface | SPIKE-06 |
| **P8** | Plugin SQLite is **global, not per-project**, uses a connection pool, has no transaction API and no migration framework | PAINFUL | HIGH — official docs + AuthMatrix schema | SPIKE-07 |
| **P9** | `.map`/chunk guessing generates 404 storms, and `sdk.requests.send()` defaults to `save: true` (pollutes the operator's history) with unknown self-scan recursion | PAINFUL | HIGH on defaults; MEDIUM on recursion | SPIKE-05 |
| **P10** | Store policy: "Include a mechanism that updates the plugin" is **flatly prohibited** (not disclosable); external calls are only allowed if disclosed in the README | PAINFUL (distribution) | HIGH — Caido Developer Policy verbatim | SPIKE-10 |
| **P11** | Secret validation transmits a live third-party credential; safe harbour from the target's program does not extend to the credential's issuer | PAINFUL (legal) | MEDIUM–HIGH | — (design decision, already OFF by default) |
| **P12** | NPM lookups leak internal dependency names to npmjs.com and get 429-rate-limited | PAINFUL | HIGH on leak; MEDIUM on exact limits | — |
| **P13** | Regex engine limits and statefulness: `CAPTURE_COUNT_MAX = 255`, `/g` `lastIndex` shared across async work, per-response recompilation | ANNOYING | HIGH — libregexp source | — |
| **P14** | `Body.toText()` replaces unprintable bytes with `U+FFFD` — offsets and hashes taken from it are wrong | ANNOYING | HIGH — official docs | SPIKE-08 |
| **P15** | `manifest.json` has **no minimum-Caido-version field**; the feature request is still open | ANNOYING | HIGH — manifest reference + caido/caido#1976, #1341 open | — |
| **P16** | Ed25519 signing key loss or immutable-release mistakes permanently block shipping updates | ANNOYING | HIGH — Caido repository guide | — |
| **P17** | Detector corpora rot; keeping them fresh collides with P10 | ANNOYING | MEDIUM | SPIKE-10 |
| **P18** | `JSON.parse` copies the whole input and materialises the entire map as JS objects (depth is safely capped at 1024) | ANNOYING | HIGH — llrt `libs/llrt_json/src/parse.rs` + simd-json | SPIKE-02 |

---

## Critical Pitfalls

### P1: ReDoS is unrecoverable inside Caido's QuickJS — this is the single biggest risk

**What goes wrong:**
DefMiner runs dozens-to-hundreds of regexes against attacker-controlled, multi-megabyte JavaScript bodies. One pattern with nested/ambiguous quantifiers meeting one crafted input spins forever inside `lre_exec`. There is no timeout, no `AbortSignal`, no worker to kill, and no way to catch it. DefMiner's backend thread is wedged until Caido restarts. Every later `onInterceptResponse`, every frontend RPC call, and every timer in the plugin dies with it. A target that does not want to be analysed can serve a poison bundle and permanently disable the tool — a *targeted* self-DoS, not a random accident.

**Why it happens (the exact mechanics, source-verified):**

1. Caido backend plugins run in QuickJS ([official docs](https://developer.caido.io/plugins/concepts/runtime)) via Caido's fork of AWS's LLRT, [`caido/dependency-llrt`](https://github.com/caido/dependency-llrt), which depends on `rquickjs 0.10`.
2. `rquickjs`'s `.gitmodules` pins `sys/quickjs` to `https://github.com/quickjs-ng/quickjs.git` — so the engine is **quickjs-ng**, not Bellard's tree. (Corroborated by the crash path `rquickjs-sys-<hash>/out/quickjs.c` in caido/caido#2211.)
3. quickjs-ng's regex engine (`libregexp.c`) is a **backtracking** engine, not RE2. It *does* have a timeout hook:
   ```c
   static int lre_poll_timeout(REExecContext *s) {
       if (unlikely(--s->interrupt_counter <= 0)) {
           s->interrupt_counter = INTERRUPT_COUNTER_INIT;   /* 10000 */
           if (lre_check_timeout(s->opaque))
               return LRE_RET_TIMEOUT;
       }
       return 0;
   }
   ```
4. But `lre_check_timeout` is a **no-op unless the host installs an interrupt handler** (`quickjs.c`):
   ```c
   int lre_check_timeout(void *opaque) {
       JSContext *ctx = opaque;
       JSRuntime *rt = ctx->rt;
       return (rt->interrupt_handler &&
               rt->interrupt_handler(rt, rt->interrupt_opaque));
   }
   ```
5. **`set_interrupt_handler` appears nowhere in `caido/dependency-llrt`** (verified by grepping every `.rs` file in the `caido` branch). `llrt_core/src/vm.rs` sets only `set_max_stack_size` and `set_gc_threshold`. So `rt->interrupt_handler` is `NULL`, `lre_check_timeout` always returns 0, and `LRE_RET_TIMEOUT` can never fire.
6. Backtracking state lives on a **heap-grown** stack (`stack_realloc`, `new_size = s->stack_size * 3 / 2`), not the C stack — so it will not conveniently blow up as a catchable `RangeError`. It just burns CPU and grows memory.
7. There are no worker threads exposed to plugin code. The [module reference](https://developer.caido.io/plugins/reference/modules) lists no `worker_threads`; the only worker threads in the runtime are internal to the SQLite pool.

Contrast with prior art, which is not an accident: **Gitleaks and TruffleHog are Go tools using RE2** (Go's `regexp`, or `wasilibs/go-re2` behind the `gore2regex` build tag — see `gitleaks/regexp/stdlib_regex.go` and `wasilibs_regex.go`). RE2 is linear-time by construction. JSMiner is Java and its author chose `com.google.re2j` for the same reason. **DefMiner is the first of this tool family that will run on a backtracking engine with no timeout.** That inversion has to be designed around, not hoped away.

**How to avoid — layered, and all layers are required:**

1. **Ban unsafe constructs by construction.** Every detector pattern is declarative data (JSON/TOML), never an inline `RegExp` literal scattered through the codebase. A build-time linter rejects any rule that:
   - contains nested quantifiers (`(a+)+`, `(a*)*`, `(a|a)*`), overlapping alternations under a quantifier, or unbounded `.*`/`.+` outside a bounded window;
   - lacks an upper bound on every quantifier (`{0,64}` not `*`);
   - lacks a literal anchor/prefix keyword.
2. **Gate the corpus with a real ReDoS checker in CI.** Run [`recheck`](https://makenowjust-labs.github.io/recheck/) (via `eslint-plugin-redos`, `checker: "hybrid"`) over the whole rule set. Treat *polynomial* complexity as failing, not just exponential. This is exactly the discipline `secrets-patterns-db` adopted after ingesting 1,600+ community patterns ("I have written scripts to validate them against ReDoS attacks and created CI jobs to load and validate the patterns").
3. **Never run a regex over a whole body.** Two-stage matching:
   - Stage 1: a linear-time literal prefilter (Aho–Corasick over provider keywords/prefixes such as `AKIA`, `ghp_`, `sk_live_`, `xox`, `AIza`, `ya29.`, `eyJ`). Pure string scanning, no regex, provably linear.
   - Stage 2: run the provider regex **only inside a bounded window** (e.g. ±256 bytes) around each prefilter hit. Bounded input length makes even a quadratic pattern harmless: worst case is `O(window²)`, and `window` is a constant we choose.
   This eliminates the multi-megabyte-input half of the ReDoS equation, which is the half that actually hurts.
4. **Hard budget with a checkpoint.** Because we cannot interrupt a *single* regex call, the budget must be enforced *between* calls: check `Date.now()` after every N stage-2 windows and abandon the artifact with a recorded `budget_exceeded` status. This bounds aggregate cost even though it cannot bound one pathological call — which is precisely why layer 3 (bounded windows) is the load-bearing one.
5. **Keep `re2js` as the escape hatch, evaluated not assumed.** [`re2js`](https://github.com/le0pard/re2js) is a pure-JS port of RE2J giving genuine linear-time matching (v2.8.6, zero runtime dependencies, ~870 KB unpacked, ESM). It is the only true structural fix available in a QuickJS environment. Measure it in SPIKE-01: if the throughput penalty is tolerable for the generic/high-risk subset of rules, run those on `re2js` and keep native `RegExp` only for anchored, linter-approved, bounded-window provider rules. Note that `re2js` has no lookbehind/backreferences — which is fine, because a RE2-clean rule corpus is a good constraint anyway and makes Gitleaks rules directly portable.
6. **Do not rely on Caido rescuing you.** Even if Caido *does* install an interrupt handler (SPIKE-01), an interrupt turns a hang into a thrown `InternalError: interrupted` mid-scan — better, but still a scan failure that must be handled.

**Warning signs:**
- Any rule authored with `.*` or `.+` between two quantified groups.
- Any rule copied verbatim from a Go/RE2 tool without re-checking it for backtracking (RE2 rules are ReDoS-safe *on RE2*; the same source text can be catastrophic on a backtracker).
- Scan wall-clock time distribution with a long tail rather than a tight band.
- Bug reports of "DefMiner stopped producing findings after visiting site X" — that is a wedged thread, not a bug in a detector.

**Phase to address:** Phase 0 (spike) and the detection-engine phase. **No detector ships before the ReDoS linter and the bounded-window architecture exist.**

---

### P2: False-positive collapse — the Core Value is the hardest thing in the project

**What goes wrong:**
DefMiner produces thousands of "secrets" per engagement, the operator stops reading them, and the tool is worse than not existing (PROJECT.md states this explicitly). Worse, Caido's Findings API has **`create`, `exists`, `get` and nothing else** — no `update`, no `delete`, no severity, no confidence field ([Findings SDK reference](https://developer.caido.io/plugins/reference/sdks/backend/findings)). Every false positive projected into Findings is **permanent for that project**. There is no "mark as FP and move on."

**Why it happens — the measured numbers are brutal:**
The 2026 study *"Keys on Doormats: Exposed API Credentials on the Web"* ([arXiv:2603.12498](https://arxiv.org/html/2603.12498v2)) ran **TruffleHog v3.90.8** — a mature, provider-specific, 800+-detector scanner, i.e. better than what DefMiner will ship on day one — across the September 2025 HTTPArchive crawl (11.9M hostnames, ~200 TB):

| Provider | Candidates identified | Verified live | Precision |
|---|---:|---:|---:|
| GitHub | **1,900,000** | **119** | **~0.006%** |
| Telegram | 219 | 186 | ~85% |

Their explanation is the design lesson: GitHub's detector is "overly broad to accommodate multiple token types … it matches other long, random strings that are not credentials, for instance, parts of URLs, hashed values, or build artifacts." Telegram wins because its format is *structurally rigid* (numeric id, colon, alphanumeric key). Also relevant: **62% of credential exposures in JavaScript files occur within bundles** — bundles are simultaneously where the real secrets are and where the noise is worst.

Independent corroboration from Intruder's [5-million-app JS scan](https://www.intruder.io/research/secrets-detection-javascript): the Google OAuth pattern `(ya29.[0-9A-Za-z-_]+)` "causes a large number of false positives due to how lax it is and how JS is minified when deployed to live sites."

**The specific noise sources in minified JS, and what each demands:**

| Noise source | Why it looks like a secret | Required discriminator |
|---|---|---|
| Minified identifiers / mangled property chains | Short high-entropy alphanumerics, sometimes adjacent to `key`, `token`, `secret` after mangling | Require a provider-specific prefix or checksum; never entropy alone; require the *quoted-string-literal* context, not a bare identifier |
| Base64 inline assets (fonts, SVGs, PNGs, WASM) | Very long, maximum entropy | Detect and skip `data:` URIs and long uniform base64 runs; length ceiling per rule; magic-byte sniffing on decode |
| Source maps embedded as `data:application/json;base64` | A whole second document of high-entropy noise inside the body | Parse the map as a *map*, exclude its span from the generic secret pass, then scan reconstructed sources separately (with their own dedupe) |
| Content hashes / integrity digests / build IDs | Exactly the entropy profile of a key | Length+alphabet fingerprinting (hex-32/40/64, base64-44 = SHA-256), plus "appears in a filename/`integrity=`/`chunkhash` context" |
| UUIDs, nanoids, trace IDs, Sentry DSNs | High entropy, sit next to `id`/`key` | Format-specific allowlist; classify Sentry DSN / GA measurement ID / Firebase `apiKey` as **public identifiers**, a distinct entity class, never a secret |
| Test fixtures, examples, placeholders | Real *format*, fake *value* | Stopword list (`example`, `xxxx`, `changeme`, `your-api-key`, `AKIAIOSFODNN7EXAMPLE`, all-same-char runs, sequential runs); path/context signals (`/test/`, `__mocks__`, `.spec.`) |
| Vendored library constants | jQuery/lodash/moment ship high-entropy tables | Library fingerprinting + skip; content-hash cache so a vendor chunk is analysed once ever, not once per host |
| Public keys / JWKS / certificates | `public_key` matched JSMiner's own secret regex (`Constants.java:36`) | Explicitly classify asymmetric public material as non-secret |
| JWTs | Real structure, but usually a demo/expired/public token | Decode and score claims (`exp` in the past, `iss` is a well-known demo issuer, `alg: none`) rather than reporting the raw string |

**How to avoid:**

1. **Two output tiers, permanently.** DefMiner's own SQLite + workspace UI is the full inventory (everything, with score and explanation). **Caido Findings receive only the top tier**: provider-format-verified *and* (checksum-valid **or** network-validated) *and* not stopworded. Because Findings are immutable, treat `sdk.findings.create()` as an irreversible commitment. When in doubt, do not create the Finding.
2. **Never entropy alone.** Entropy is one feature in a scored model, after format, length, alphabet, keyword context, code context and allowlists. JSMiner's fixed `3.5` bits/char threshold (`Utilities.java:240`) is the exact failure the study measured.
3. **Local structural validation before any network validation.** Many providers embed checksums (AWS key ID structure, Stripe key prefixes, GitHub's `_`-prefixed tokens with a CRC32 checksum in the last 6 chars, Slack's `xox[baprs]-` shapes). A checksum check is free, offline, legal, and converts most of the GitHub 1.9M → 119 gap without touching the network.
4. **Measure it, publicly, as a release gate.** See SPIKE-09 for the corpus design. Report **findings-per-MB on a known-clean corpus** (any finding is a false positive) as the headline number, alongside recall on a synthetic positive corpus. A tool whose README states its measured FP rate is a tool operators will trust.
5. **Make every finding explain itself.** "Matched `stripe-live-secret-key`: prefix `sk_live_`, length 107 ✓, alphabet ✓, checksum ✓, context `Authorization` header construction, entropy 4.9 (p97 for length)." An operator can dismiss a bad rule in one second if the rule shows its work; they cannot if it just says "High entropy string."

**Warning signs:**
- Any rule whose value class is "one or more of `[A-Za-z0-9_-]`" without a length ceiling.
- The generic keyword-adjacency detector producing more findings than all provider detectors combined.
- FP-corpus findings count that grows when a rule is *added* but nobody re-runs the corpus.

**Phase to address:** The detection-engine phase, gated by the FP-corpus phase. The corpus harness must exist **before** the second detector is written, or the rule set will be untestable by the time anyone cares.

---

### P3: Event-loop starvation — the proxy is safe, the plugin is not

**What goes wrong (and what does *not*):**

**Good news, documented:** `onInterceptResponse` **cannot block the proxy or break the response.** The Caido events reference states verbatim: *"This callback is called asynchronously and cannot modify responses."* The same wording appears for `onInterceptRequest` and `onProjectChange`. The contrast is deliberate and load-bearing — `onUpstream` is documented in the opposite terms: *"This callback is called synchronously so special care should be taken to not impact overall performance,"* repeated in the guide as *"invokes it synchronously before the request is sent."* Caido's docs distinguish the two hook classes explicitly. A 30-second `onInterceptResponse` therefore does **not** delay the browser, and a thrown exception cannot corrupt a response that has already been delivered. **Confidence: HIGH.**

**Bad news, the real risk:** the docs also state that *"Backend plugins give you a long running thread inside Caido"* — **one** thread. QuickJS is single-threaded and no `worker_threads` module is exposed. So a 30-second synchronous scan blocks *DefMiner's own event loop*: every subsequent `onInterceptResponse` queues, every `sdk.api.register` handler the frontend calls stalls (the workspace UI appears frozen), every `setTimeout`/watchdog stops firing, and whatever queue Caido uses to hand events to the plugin grows without bound. caido/caido#2211 documents exactly this degraded state in a real plugin: *"all checks report finished, but the scan never leaves `Running` — promise continuations stop advancing (JS-side timers/watchdogs are dead too)."* And there is no documented mechanism by which Caido force-terminates a wedged plugin runtime; the reporter's workaround is "restart Caido."

Whether Caido drops, queues unboundedly, or applies backpressure to events the plugin is too slow to consume is **undocumented** → SPIKE-03.

**Why it happens:**
The `onInterceptResponse` signature returns `MaybePromise<void>` and the docs' example is a one-liner. It reads like a safe place to do work. It is not: it is a place to do a *cheap gate and an enqueue*, and nothing else.

**How to avoid:**

1. **The handler must be synchronous, allocation-free, and O(1).** Gate on: plugin enabled → in scope (`sdk.requests.inScope`) → status/content-type → `response.getBody()?.length` under ceiling. Then push the **request ID** (a string) onto a **bounded** ring buffer and return. Never call `toText()`, never hash, never regex, never `await` in the handler. Reload the artifact later with `sdk.requests.get(id)`.
2. **Bounded queue with an explicit, visible drop policy.** When the ring is full, drop-oldest and increment a `dropped` counter that is surfaced in the UI ("142 responses skipped — analysis is behind"). Silent unbounded growth is how JSMiner fails: `ExecutorServiceManager.java:8` uses a fixed 5-thread pool with the default *unbounded* queue, and `BurpExtender.java:476` spawns a raw thread per response on top of it.
3. **One consumer, cooperative yielding.** A single async worker drains the ring. Between artifacts — and between chunks *within* a large artifact — `await new Promise(r => setTimeout(r, 0))` to let the event loop service RPC and timers. Chunk the work so no synchronous span exceeds a small budget (target ≲50 ms; validate in SPIKE-02).
4. **Analyse once per content hash, not once per response.** SPAs re-serve the same vendor chunk from many pages and many hosts. Key the cache on `sha256(toRaw())` + analyzer version. This is the single largest throughput win available and it is free.
5. **Size ceilings with honest degradation.** Above the AST threshold, run the linear lexer only and record `lexical_only`. Above the hard ceiling, record `skipped_too_large` and show it in the UI. Never silently do nothing.

**Warning signs:**
- The workspace page becomes unresponsive while browsing a heavy SPA (that is the plugin thread, not Vue).
- Findings appear minutes after the traffic that produced them.
- The `dropped` counter is non-zero on ordinary browsing.

**Phase to address:** The passive-ingestion phase, before any detector exists. The queue/worker/budget skeleton is Phase 1 architecture, not an optimisation.

---

### P4: `sdk.requests.send()` can crash the whole Caido process

**What goes wrong:**
[caido/caido#2211](https://github.com/caido/caido/issues/2211) (open, filed 2026-08-05 against Caido 0.57.1): backend plugins that issue many host-backed requests trip a QuickJS GC assertion and **abort `caido-cli` entirely**:

```
caido-cli: .../rquickjs-sys-<hash>/out/quickjs.c:6183:
gc_decref_child: Assertion `p->ref_count > 0' failed.
```

Measured thresholds, from the report (Scanner plugin, one target, medium aggressivity):

| Total host-backed sends in the runtime lifetime | Behaviour |
|---|---|
| ≲ 54 | completes cleanly |
| ~80 | checks report finished but the scan never leaves `Running`; promise continuations stop advancing; JS-side timers dead |
| ~120+ | process aborts; container restarts; guest token invalidated; temporary project dropped |

Critically: **"The failure is cumulative across the runtime's lifetime, not per-scan."** The reporter's disassembly points at the rquickjs binding surfacing host `Request`/`Response` objects into JS, i.e. an extra decref / missing incref per surfaced object — not a bug in QuickJS proper. Note also `panic = "abort"` in llrt's release profile: there is no unwinding, no recovery.

**Why this hits DefMiner harder than Scanner:**
DefMiner's active features are *per-artifact*, not per-scan-session. A single SPA can present 100–300 JS chunks. `.map` guessing alone (one probe per chunk, ON by default per PROJECT.md) blows past 120 sends **on one page load**. Chunk-graph fetching adds more. Under this bug, DefMiner's headline active feature would reliably crash Caido on exactly the targets it is designed for.

**How to avoid:**

1. **SPIKE-04 first.** Reproduce on the minimum supported Caido version and find the current threshold. This is a gating measurement, not a curiosity.
2. **Hard, global, cross-session send budget** with a conservative default well under the observed cliff (start at 40 per runtime lifetime, operator-adjustable with a clear warning), plus a persisted lifetime counter and a visible "restart Caido to reset" state. Ugly, but honest, and exactly the workaround the reporter recommends.
3. **Prefer `caido:http` `fetch` where target routing is not required.** NPM registry lookups and secret validation must use `fetch` (they are not target traffic anyway). Whether `fetch` surfaces the same host-backed objects is unknown → include in SPIKE-04. If `fetch` is unaffected, it becomes the preferred path and `sdk.requests.send()` is reserved for cases that genuinely need Caido's upstream/proxy/auth context (in-scope `.map` and chunk retrieval).
4. **Do not retain SDK objects across `await` points.** Extract primitives (id, url, status, bytes) immediately and drop the handle. This reduces the number of live host-backed JS wrappers, which is the quantity that appears to drift.
5. **Batch and rate-limit sends through the same single scheduler** as everything else, so the budget is enforceable in one place.

**Warning signs:**
- Caido restarting mid-session during heavy browsing with active features on.
- Active jobs stuck in `Running` with no progress (the ~80 pre-crash stall).

**Phase to address:** Phase 0 spike; then the active-retrieval phase must be built around the budget from its first commit. **Consider shipping v1 with `.map` guessing default-ON only after SPIKE-04 confirms a safe budget** — this is a live challenge to the PROJECT.md decision.

---

## Painful Pitfalls

### P5: Memory — no heap limit means OOM aborts the host, it does not throw

**What goes wrong:** llrt's `VmOptions` sets `max_stack_size` and `gc_threshold_mb` but **never calls `set_memory_limit`** (verified across the whole `caido` branch). QuickJS's `JS_SetMemoryLimit` is therefore unset, so there is no ceiling that converts exhaustion into a catchable `InternalError: out of memory`. With `rust-alloc` + `panic = "abort"`, allocation failure ends the process. The default `gc_threshold_mb` is **20 MB** (env-overridable via `LLRT_GC_THRESHOLD_MB`) — that is the *GC trigger point*, not a cap, and it means a runtime tuned for 20 MB working sets is being handed 10 MB bundles.

**Concrete amplification for one 8 MB bundle:** `toRaw()` 8 MB Uint8Array + `toText()` string (8 MB if pure-ASCII/narrow, **16 MB if a single non-ASCII byte forces wide/UTF-16**) + AST (Meriyah/Acorn measured at ~240–290 MB RSS on a ~3 MB input in standalone quickjs-ng, per prior benchmarking) + match arrays. A `.map` for that bundle is typically 2.5–5× the bundle (measured: `rxjs.umd.min.js` 88 KB → `.map` 224 KB, 2.5×; app bundles with full `sourcesContent` run higher), and `JSON.parse` copies it (P18).

**How to avoid:** byte-length gate via `Body.length` *before* materialising anything; strict AST threshold (start ~1.5 MiB, hard ceiling ~3 MiB, revisit after SPIKE-02); process one artifact at a time; stream-free chunked scanning over `toRaw()` slices rather than one giant string; never hold two large artifacts live; explicit `.map` size ceiling before decode (estimate decoded base64 size *before* decoding — JSMiner's `InlineSourceMapFiles.java:34` decodes first, which is the bug); null out references at chunk boundaries so the 20 MB GC threshold can actually collect.

**Phase:** Phase 0 spike (SPIKE-02) sets the numbers; passive-ingestion phase enforces them.

---

### P6: 512 KiB JS stack — recursive walks over minified code overflow early

**What goes wrong:** `llrt_core/src/vm.rs`:
```rust
max_stack_size: 512 * 1024,
```
quickjs-ng's own default is `JS_DEFAULT_STACK_SIZE (1024 * 1024)` — **llrt halves it.** Minified/bundled JS routinely produces pathological nesting: sequence-expression chains, ternary ladders, long `a||b||c||…` chains, and deeply nested object literals in config blobs. A naive recursive AST visitor hits `RangeError: Maximum call stack size exceeded` on real-world inputs, not just adversarial ones.

**How to avoid:** write the AST walk **iteratively with an explicit work stack** (no recursion), which also gives you a free node-count budget and cancellation point. Enforce a max depth and record `truncated_depth` rather than throwing. Do the same for any recursive sourcemap/section handling. Catch `RangeError` around parse and degrade to `lexical_only`. (Note: the *regex* backtracker uses a heap stack, so it will **not** produce this error — do not expect stack overflow to save you from P1.)

**Phase:** AST-analysis phase; measured in SPIKE-02.

---

### P7: Sourcemap reconstruction — path traversal writing attacker-controlled `sources` to disk

**What goes wrong:** A `.map` is attacker-controlled data. Its `sources` array contains arbitrary strings. Writing `sourcesContent[i]` to `outputDir + sources[i]` is the **CVE-2024-21540 class** (`source-map-support` directory traversal via `retrieveSourceMap`) — the "Zip-Slip" pattern applied to sourcemaps. In an offensive-security tool this is especially bad: the operator's own machine gets owned by the target they are testing.

**Does JSMiner have this bug?** — **Verified: no, but its defence is fragile and its other sourcemap handling is broken.**
`SourceMapper.java:38` only strips `?query` and the character class `[?%*|:"<>~]` — it does **not** strip `..` or leading separators. Containment is delegated to `FileUtils.secureFile`, which does two real things:
```java
File untrustedFile = new File(fakeRootPath + fileName);              // "/" + "../../etc/passwd"
trustedFile = new File(destinationDir.getCanonicalPath() +
    untrustedFile.toPath().normalize().toString().replace(fakeRootPath, sep));
if (trustedFile.getCanonicalPath().startsWith(destinationDir.getCanonicalPath())) { … }
```
The fake-root trick makes `Path.normalize()` collapse `..` at the root (`/../../etc/passwd` → `/etc/passwd`), and the canonical-path prefix check is a genuine containment check. So the traversal is neutralised. **But**: `startsWith` on canonical *strings* is the classic sibling-prefix pattern (safe here only because the child is always built from `destinationDir`); backslashes are not stripped, so Windows separators pass the character filter; Windows reserved device names (`CON`, `NUL`, `COM1`), trailing dots/spaces and ADS (`file.js:evil` — `:` *is* stripped, so partially covered) are unhandled; and on failure `secureFile` returns a **directory** path which is then passed to `Files.move`, throwing. Separately, `JSMapFile.java` models only `sources` and `sourcesContent`, assumes both arrays exist and align, and ignores `sourceRoot`, indexed maps (`sections`), `ignoreList` and null `sourcesContent` entries — so a spec-legal map with `sourcesContent: [null, "…"]` throws NPE and the *entire* map is silently dropped (`catch (Exception e)` → one stderr line).

**Why this is harder for DefMiner than for JSMiner:** llrt's `fs` module **has no `realpath` and no `lstat`** (verified against `caido/dependency-llrt/types/fs.d.ts` and `types/fs/promises.d.ts`: `statSync`, `readdirSync`, `readFileSync`, `writeFileSync`, `mkdirSync`, `renameSync`, `symlinkSync`, `rmSync`, `accessSync`, `chmodSync`, `mkdtempSync` — no canonicalisation, no link-status). We cannot do JSMiner's `getCanonicalPath()` containment check. Lexical containment is all we have.

**How to avoid:**

1. **Content-addressed storage is the primary defence.** Write every reconstructed source to `<outDir>/objects/<sha256[0:2]>/<sha256>` — a name DefMiner generates, containing zero attacker-controlled bytes. Store the logical `sources` path as *metadata* in SQLite and in a `manifest.json`. Browsing the logical tree happens in the UI, over the manifest. This structurally eliminates the entire vulnerability class.
2. **Optional "export a readable tree" is a separate, explicit user action** with the full sanitiser applied:
   - Parse `sources[i]` as a URL first. Handle `webpack://`, `webpack:///`, `webpack://<namespace>/`, `rollup://`, `vite://`, `file://`, `ng://`, `turbopack://`. Strip the scheme and any authority. **Percent-decode before sanitising, never after** (`..%2f` is the standard bypass) — and decode only once.
   - Apply `sourceRoot` resolution per the [ECMA-426 source map spec](https://tc39.es/ecma426/) before sanitising.
   - Split on both `/` and `\`; drop every empty, `.`, and `..` segment; drop absolute prefixes and Windows drive letters (`C:`); reject NUL and control bytes.
   - Reject/rename Windows reserved device names, and strip trailing dots/spaces.
   - Cap each segment (255 bytes) and total path (~200 bytes below the platform limit).
   - Final check: `path.resolve(base, candidate).startsWith(path.resolve(base) + path.sep)` — with the trailing separator, not a bare prefix.
   - Do not create parent directories implied by a rejected path.
   - **Never write outside `sdk.meta.path()` or a directory the operator explicitly picked in that session.**
3. **Budgets:** max map bytes, max `sources` entries, max total bytes written per artifact and per project; estimate base64 decoded size *before* decoding an inline map.
4. **Model the real spec:** regular maps and index maps (`sections`), `sourceRoot`, null `sourcesContent` entries (record `content_absent`, still keep the path as intelligence — a path list alone is valuable recon), `ignoreList`, debug IDs. A missing `sourcesContent` must degrade to "paths only", never to "drop the map."

**Phase:** Sourcemap phase; the sanitiser gets its own unit-test suite with a malicious-`sources` fixture set (`../../..`, `/etc/passwd`, `C:\Windows\…`, `webpack:///../../`, `..%2f..%2f`, `CON`, 4096-byte segments, NUL bytes, unicode homoglyph separators).

---

### P8: Plugin SQLite is global, pooled, transaction-less and migration-less

**What goes wrong — three distinct problems:**

1. **Global, not per-project.** `sdk.meta.db()` is documented as *"a sqlite database for the plugin stored in Caido Data"* and `sdk.meta.path()` as *"the directory of the plugin in Caido Data."* Caido Data is application-scoped. Findings are project-scoped; the plugin DB is not. If DefMiner stores findings/state without a project key, **client A's discovered secrets appear while the operator works on client B** — an operational bug and a confidentiality problem for a consultant. Community confirmation: AuthMatrix puts `project_id TEXT NOT NULL` in the primary key of *every* table (`packages/backend/src/db/db.ts`), and Scanner explicitly threads `switchProject(projectId)` through every store on `onProjectChange`.
2. **Connection pool, so per-connection state is unreliable.** Official docs: *"The implementation uses a connection pool and is fully asynchronous. Each connection will be spawned in a worker thread."* The exposed surface is `exec`, `prepare`, and `Statement.{run,get,all}` — **there is no transaction API**. `PRAGMA foreign_keys = ON` is per-connection; running it once (as AuthMatrix does) affects one pooled connection, not the pool. `BEGIN`/`COMMIT` issued as separate `exec` calls may land on different connections. So multi-row writes are **not atomic** by default.
3. **No migration framework.** `CREATE TABLE IF NOT EXISTS` is the documented idiom. Adding a column in v1.2 against a v1.0 database silently does nothing (the table exists), and every read then fails on a missing column. AuthMatrix shows the scar tissue: `original_response_length INTEGER NOT NULL DEFAULT 0` is a retrofitted column.

**How to avoid:**
- **Project key everywhere.** Every table carries `project_id`; every query filters on it; `onProjectChange` swaps the active project id, cancels in-flight work, and clears in-memory caches (copy Scanner's `onProjectChange` shape, which also handles `project === null` when the user deletes the current project — the docs warn about this case explicitly).
- **Own the schema version.** Use `PRAGMA user_version` and a forward-only, idempotent migration list applied at init: read version → run each pending step → set version. Every step must be re-runnable. Ship a corrupted/incompatible-DB path that renames the file aside and starts fresh rather than crashing the plugin.
- **Design for non-atomic writes.** Idempotent `INSERT … ON CONFLICT DO UPDATE` keyed by stable natural keys (`(project_id, artifact_sha256, rule_id, offset)`), so a partial write followed by a retry converges. Do not build any invariant that requires two statements to land together. If you must batch, put the whole batch in **one** `exec` string and verify in SPIKE-07 whether that gives atomicity.
- **Re-issue any needed `PRAGMA` inside the same `exec` as the work**, or design so no PRAGMA is needed (prefer application-level integrity to `foreign_keys`).
- **Don't store raw secrets.** Persist an HMAC fingerprint (key derived per-project, stored in the plugin dir) plus a redacted preview and the byte offset. Reveal on demand by re-fetching the original request via `sdk.requests.get(id)`, re-verifying the artifact hash, and slicing. A stolen `defminer.sqlite` should not be a credential dump.

**Phase:** Persistence phase (Phase 1–2). The migration runner and project scoping must exist before the first table is used in anger.

---

### P9: Active retrieval — 404 storms, history pollution, and possible self-scan recursion

**What goes wrong:**

- **Volume.** One `.map` probe per JS chunk is not "one extra request." A modern SPA with code-splitting serves 100–300 chunks; add chunk-graph discovery and you are issuing several hundred requests during ordinary browsing, most returning 404. Bug bounty programs commonly cap automated tooling at **2–10 requests/second** and treat exceeding it as "aggressive/intrusive" grounds for removal from the program; 404 floods are also a first-class WAF/rate-limit trigger (AWS WAF explicitly supports rate rules keyed on origin *response* status). An operator can get blocked, or banned, by a tool they left on defaults.
- **History pollution.** `RequestSendOptions.save` **defaults to `true`**: *"the request and response will be saved to the database and the user will see them in the Search tab."* Hundreds of 404s land in the operator's HTTP history and project DB. Setting `save: false` fixes that but *"the request and response IDs will be set to 0"* — which means **you cannot attach a Caido Finding to it** (`findings.create` requires a `request`). Real trade-off, must be a deliberate design choice per request class.
- **Possible recursion.** `RequestSendOptions.plugins` defaults to `true`, documented as *"the request will be sent through the **upstream** plugins."* The docs do **not** say whether `sdk.requests.send()` re-fires `onInterceptResponse`. If it does, DefMiner fetching a `.map` triggers DefMiner analysing that `.map` response, which may trigger further fetches — a feedback loop. Scanner sends requests from `onInterceptResponse`-scheduled work with no self-suppression guard, which is weak evidence that it does not recurse, but Scanner's passive checks don't fetch, so the case is untested. → SPIKE-05.

**How to avoid:**
- **Only probe when there is evidence.** Priority order: (1) explicit `//# sourceMappingURL=` comment, (2) `SourceMap:` / `X-SourceMap:` response headers, (3) inline `data:` map. **Blind `<url>.map` guessing is the last resort, and it is a distinct, separately-toggled setting** — not lumped in with "sourcemap support."
- **Global token-bucket rate limiter** with a conservative default (start ~2 rps against a given host, operator-adjustable) shared by *all* active features, plus a per-host circuit breaker: after N consecutive 404s on `.map` guesses for a host, stop guessing for that host for the session and record why. If a host starts returning 403/429, halt active work for it entirely and surface a banner.
- **`save: false` for speculative probes; `save: true` only for retrievals that succeeded and will be attached to a Finding.** Tag saved requests so the operator can filter them out (a `defminer` marker in a custom header or a recognisable source).
- **Self-suppression regardless of SPIKE-05's answer:** maintain a short-TTL set of URLs DefMiner just requested and drop matching events in the passive gate. Cheap, and it makes the recursion question moot.
- **Disclose the behaviour in the UI and README**, with counts ("DefMiner sent 143 requests to `app.example.com` this session").

**Phase:** Active-retrieval phase. Revisit the PROJECT.md "ON by default" decision after SPIKE-04 and SPIKE-05.

---

### P10: Store policy — "a mechanism that updates the plugin" is prohibited outright

**What goes wrong:** The [Caido Developer Policy](https://developer.caido.io/plugins/concepts/developer_policy) has two clauses that bite this project directly, and they are **not** in the same category:

Under **Not Allowed** (no disclosure can rescue these):
- *"Include a mechanism that updates the plugin."*
- *"Include client-side telemetry."*
- *"Obfuscate code to hide its purpose."*

Under **Disclosures** (allowed *only* if clearly indicated in the README):
- *"Load assets from the internet (except if disclosed in README)."* (listed as Not Allowed with an explicit README carve-out)
- *"External services. Clearly explain which are used and why they are required."*

Enforcement is real: *"Every plugin package is individually vetted before being included in the store"* and Caido *"may immediately remove a plugin package"* for repeated or serious violations.

**Why this is a trap for DefMiner specifically:** the natural answer to detector rot (P17) is "fetch fresh signatures from GitHub." That sits exactly on the boundary. Fetching a **JSON/TOML rule file** is "loading an asset from the internet" → allowed with README disclosure. Fetching **executable JavaScript** and evaluating it is a "mechanism that updates the plugin" → prohibited, full stop, and also unreviewable (defeating the vetting the policy exists to enable).

**How to avoid:**
1. **Rules are data, never code.** A strict declarative schema (id, version, provider, keywords, pattern, length bounds, alphabet, checksum kind, allowlist, confidence weights). No `eval`, no `new Function`, no dynamic import. The regex is the only executable-ish part, and it goes through the ReDoS linter (P1) **at load time as well as build time** — a remote rule file is untrusted input.
2. **Ship the corpus as a bundled asset** (`manifest.json` `assets`) so the plugin is fully functional offline. Remote refresh is an **opt-in, default-OFF, manual** action with a visible diff ("adds 12 rules, modifies 3") before applying. That is a user-consented data refresh, not an auto-update.
3. **Pin the source, sign the payload.** Fetch from a pinned URL in the plugin's own repo; verify a detached signature (reuse the Ed25519 story) before accepting. Cap size and rule count. Never accept a rule file that fails schema validation or the ReDoS linter.
4. **Write the README disclosures explicitly and up front**, as a table: every outbound host, what data leaves, the default state, and how to disable it. Minimum set: `registry.npmjs.org` (package names — ON by default), the *target itself* for `.map`/chunk retrieval (ON by default), the rule-update host (OFF by default), and each secret-validation provider (OFF by default, enumerated). "Undisclosed external service calls" is the most likely reason DefMiner gets pulled from the store, and it is entirely avoidable with a table.
5. **No telemetry of any kind**, not even anonymous counters. PROJECT.md already commits to this; the policy makes it non-negotiable.
6. **Pre-clear the design with Caido** (Discord / a docs issue) before building the update path — SPIKE-10. A five-minute question beats a delisting.

**Phase:** Distribution phase; but the rules-as-data architecture is a Phase-1 decision, because retrofitting it later means rewriting every detector.

---

### P11: Secret validation — the one feature that can hurt the operator legally

**What goes wrong:** Validating a discovered key means transmitting a live third-party credential to a service **neither the operator nor the target owns**. Three distinct exposures:

1. **Legal.** A bug bounty program's safe harbour is conditional authorisation for *that program's* scope. Programs commonly state they cannot indemnify researchers against third-party claims. Touching `api.stripe.com` with a key you found is an interaction with Stripe, outside any safe harbour the target can offer. The DOJ's CFAA charging policy protects good-faith research but is a charging *policy*, not a defence, and it is scope-sensitive.
2. **Operational.** Validation is *logged by the issuer*. `sts:GetCallerIdentity` lands in the key owner's CloudTrail; GitHub token use is visible in audit logs; several providers auto-revoke and email on anomalous use. The operator can burn their own finding, tip off a defender mid-engagement, or trigger an incident response they then have to explain.
3. **Blast radius.** A validation call that is "read-only" for one provider is not for another. `GET /user` is safe; some providers have no non-mutating, non-logging probe at all.

**How to avoid:** PROJECT.md's decision (built, OFF by default) is correct — keep it. Additionally:
- **Per-provider opt-in**, not one global switch. The operator enables Stripe validation, not "validation."
- **A consent dialog that names the outbound host and the data class** before the first call of a session, and an audit log of every validation performed (timestamp, provider, host, redacted key fingerprint, outcome) that is exportable — that log is the operator's evidence of good-faith, bounded activity.
- **Only non-mutating, minimal-scope probes**, documented per provider; providers without a safe probe get `verification_unsupported`, never a guess.
- **Never auto-validate from the passive path.** Validation is always an explicit action on a specific finding.
- **Cache results with a TTL** so re-scans do not re-hit providers.
- **Local checksum/structural validation is always on** — it is free, offline, legal, and (per P2) does most of the precision work anyway.

**Phase:** Validation phase, last. Ship the rest first.

---

### P12: NPM registry — leaking internal package names and getting rate-limited

**What goes wrong:** Dependency-confusion detection queries `registry.npmjs.org` for package names extracted from the target's bundle. Two problems:

1. **Leak.** Those names are often *internal* (`@acme-internal/billing-sdk`). Sending them to npm publishes the target's private dependency graph to a third party — and, ironically, tells anyone watching npm's logs exactly which names are squattable. JSMiner does this *from inside its passive scan loop* (`ScannerBuilder.java:113` includes `DependencyConfusion` in `runAllPassiveScans`, which then queries the registry at `DependencyConfusion.java:111`), so "passive" mode silently talks to npm. Do not inherit that.
2. **Rate limits.** npm applies explicit rate limiting across registry APIs and returns 429; anonymous callers get a lower allowance than authenticated ones, and the published numbers are stale/undocumented (npm's own `feedback#658` is a request for rate-limit documentation). Assume the limit is low, undocumented and subject to change.

Third, and separately: **a 404 on npm is not a vulnerability.** JSMiner reports it as `Certain`/`High` (`DependencyConfusion.java:144`). Exploitability actually depends on resolver order, configured scopes and registries, the package manager, lockfiles and build behaviour. Reporting "High" on name-absence alone is a triage-burning FP factory.

**How to avoid:** persistent cache keyed on package name with a long TTL (a name's absence changes rarely); token bucket with conservative default and exponential backoff honouring `Retry-After`; batch and deduplicate before querying; **disclose in the README** (this is an "external service" under P10); make it individually disableable and clearly labelled as "sends package names to npmjs.com"; extract package names from real evidence (a parsed `package.json` artifact, sourcemap `node_modules/` paths, bundler module maps) rather than JSMiner's regex-and-split-on-commas approach; and report absence as **`dependency_confusion_candidate` (Info/Medium with prerequisites listed)**, not `High/Certain`.

**Phase:** Dependency-confusion phase.

---

## Annoying Pitfalls

### P13: Regex engine limits and statefulness

- **`CAPTURE_COUNT_MAX = 255`** (`libregexp.c:71`). The tempting optimisation — combine 200 detectors into one giant alternation with named groups — dies here with a compile-time error. Design for *many small anchored patterns behind a literal prefilter*, which is the right architecture anyway.
- **`/g` and `/y` regexes carry `lastIndex`.** A module-level `const RE = /…/g` reused across interleaved async work produces silently wrong, non-deterministic results. Rule: never share a stateful regex instance. Either construct per-use, or immediately reset `lastIndex = 0`, or use `String.prototype.matchAll` (which clones internally) — and never `matchAll` into a spread over a huge body without a cap.
- **Compile cost.** `new RegExp()` per response × 200 rules × every artifact is real work. Compile the whole corpus **once at init**, store the compiled objects, and treat that as part of the plugin's startup cost.
- **Feature support is good, so there's no excuse to reach for exotica:** quickjs-ng supports named groups, lookbehind (`re_parse_term(s, is_backward_dir)`), unicode property escapes `\p{…}`, the `v` flag (unicode sets), and the `d` flag (`hasIndices`, useful for capture offsets without extra scanning). Prefer the RE2-compatible subset anyway so rules stay portable to `re2js` (P1) and to Gitleaks-format rule sets.

### P14: `Body.toText()` is lossy

Documented: *"Parse the body as a string. Unprintable characters will be replaced with `\uFFFD`."* Consequences: byte offsets computed on the text do not map to raw bytes; a content hash of the text is not a hash of the artifact; a secret containing non-UTF-8 bytes is corrupted; and one non-ASCII byte flips the QuickJS string to wide (2 bytes/char), doubling memory. **Rule: `Body.length` for gating, `toRaw()` for hashing and for anything positional, `toText()` only for human display.** Decode explicitly (`TextDecoder`-equivalent over the raw bytes) when you need text with known semantics.

### P15: No `minCaidoVersion` — version skew is handled by you or not at all

The [manifest reference](https://developer.caido.io/plugins/reference/manifest) has no minimum-version field; caido/caido#1976 and #1341 ("Minimum caido version for plugin") are both **open**. So an old Caido will happily install a plugin that calls SDK methods it doesn't have, and the failure is a runtime `TypeError` in the backend thread. Meanwhile, Caido updates do break plugins: AuthMatrix #23, *"Bypass and enforced status UI not working after 0.43.1 update."*

**How to avoid:** check `sdk.runtime.version` in `init()` on **both** frontend and backend; if below the declared minimum, register the UI in a degraded "unsupported version" state with a clear message and **do not register the passive hooks**. Feature-detect optional SDK surfaces (`typeof sdk.x?.y === "function"`) rather than assuming. State the minimum version prominently in the README. Pin `@caido/sdk-backend`/`@caido/sdk-frontend` versions and treat an SDK bump as a compatibility review.

### P16: Signing key and immutable releases

Store distribution requires **Ed25519 signing** (`openssl genpkey -algorithm ed25519`), with the *public* key pinned in `caido/store`'s `plugin_packages.json`, and requires **Immutable releases** enabled on the GitHub repo. Two failure modes: (a) **lose the private key and you cannot ship any update** — the store entry is bound to the public key, so recovery means a PR to `caido/store`; (b) **immutable releases mean a broken release cannot be fixed in place** — every mistake costs a version bump. Mitigation: private key in GitHub Action Secrets *and* in an offline encrypted backup from day one; a release checklist with a dry-run install of the signed artifact before publishing; semver discipline so a botched patch is cheap. Related packaging trap: devtools#2, `INVALID_PACKAGE` caused by the dev CLI signalling a rebuild before the bundle was complete — CI must build, *then* sign, *then* upload, with no overlap.

### P17: Detector corpus rot

Key formats change (GitHub's `ghp_`/`gho_`/`ghs_`/`github_pat_` families, OpenAI's `sk-proj-`, Stripe's restricted keys, Slack's rotated shapes). A corpus frozen at ship date decays into misses and FPs. Given P10's constraints the answer is: **versioned rule packs as bundled data**, plus an opt-in, signed, schema-validated, ReDoS-linted manual refresh (P10), plus a fast release cadence for rule-only patch versions, plus a documented contribution path (rules live in a separate directory with a fixture per rule, so a community PR is `pattern + positive fixture + negative fixture`). Track upstream Gitleaks/TruffleHog rule changes as an input, not as a dependency.

### P18: `JSON.parse` on large maps

llrt replaces `JSON.parse` with a simd-json implementation (`json::redefine_static_methods(ctx)`), whose `json_parse` does `let mut json: Vec<u8> = json.into();` — a **full byte copy** — then builds a tape, then recursively materialises JS values via `parse_node`. The recursion is *not* explicitly depth-limited in llrt, but simd-json caps structure depth at `DEFAULT_MAX_DEPTH = 1024` and returns `DepthLimitExceeded`, so deeply-nested JSON throws a catchable JS error rather than blowing the native stack. **The risk is memory, not depth**: for a 30 MB `.map` you pay the JS string, the `Vec<u8>` copy, the tape, and the full object graph roughly simultaneously. Mitigation: hard byte ceiling checked before `JSON.parse`; parse maps one at a time; extract only the fields you need and drop the parsed object immediately; for very large maps, consider a targeted streaming extraction of `sources`/`sourcesContent` rather than a full parse.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Inline `RegExp` literals scattered through detector code | Fast to write | No ReDoS linting, no versioning, no remote/bundled rule packs, no per-rule fixtures — a full rewrite to fix | **Never.** Rules-as-data from commit one |
| Doing analysis inside the `onInterceptResponse` handler | No queue to build | Starves the plugin thread; unbounded event backlog; unresponsive UI (P3) | **Never** |
| Entropy threshold as the confidence signal | Ships a detector in an hour | The measured GitHub 1.9M→119 outcome; operator stops reading findings (P2) | Only as one weighted feature, never as a verdict |
| `sdk.findings.create()` for everything found | Findings tab looks productive | Findings are immutable; permanent noise the operator cannot clear (P2) | **Never** — Findings are the top tier only |
| Writing `sources[i]` straight to disk | Reconstructed tree "just works" | CVE-2024-21540 class arbitrary write on the operator's machine (P7) | **Never.** Content-addressed store + sanitised optional export |
| Plugin DB without `project_id` | Simpler schema | Cross-engagement data leakage; unfixable without a migration (P8) | **Never** |
| `CREATE TABLE IF NOT EXISTS` with no `user_version` | Works on a fresh install | Every future schema change is a silent data-loss bug (P8) | **Never** |
| Storing raw secret values in SQLite | Easy UI | The plugin DB becomes a credential dump on the operator's disk | **Never** — HMAC fingerprint + redacted preview + reveal-on-demand |
| Recursive AST visitor | Natural to write | `RangeError` on real minified input at 512 KiB stack (P6) | Only behind a proven depth cap; prefer explicit stack |
| Unbounded `sdk.requests.send()` | Maximum coverage | Aborts `caido-cli` (P4); 404 storms; program violations (P9) | **Never** without a global budget + rate limiter |
| Skipping the FP corpus "until there are more detectors" | Faster to first demo | By then the rule set is untestable and precision is unknowable | **Never** — harness before detector #2 |
| One giant alternation regex for all rules | Fewer passes | `CAPTURE_COUNT_MAX = 255` compile failure; unattributable matches (P13) | Never for the full set; small grouped alternations are fine |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| `sdk.events.onInterceptResponse` | Treating it as a worker; awaiting long work inside it | Cheap sync gate + enqueue request **ID** + return. Reload later with `sdk.requests.get(id)` |
| `sdk.requests.send()` | Unbounded sends; leaving `save: true`; assuming `plugins: false` suppresses passive events | Global lifetime budget (P4) + rate limiter; `save: false` for speculative probes; own self-suppression set (P9) |
| `caido:http` `fetch` | Assuming it routes through the user's upstream proxy | It does **not** go through the proxy. Use it only for disclosed third-party calls (npm, rule updates, validation) — never for target traffic |
| `sdk.findings.create()` | Using it as the primary datastore | It is a projection. No update/delete/severity. Only top-tier results; always set a stable `dedupeKey`; check `exists()` first |
| `sdk.meta.db()` | Assuming it is project-scoped or transactional | Global DB → `project_id` in every key. Pooled connections → no reliable `PRAGMA`/`BEGIN`. Idempotent UPSERTs; `PRAGMA user_version` migrations |
| `sdk.meta.assetsPath()` | Writing there | Docs: *"You shouldn't write anything there, as the contents can be reset at any time."* Write under `sdk.meta.path()` |
| `sdk.meta.updateAvailable()` | Calling it in `init()` | Documented to **throw if Caido Cloud is offline**. Wrap in try/catch; never gate startup on it |
| `onProjectChange` | Ignoring the `null` case | Docs: *"It can happen that the project is null if the user deleted the currently selected one."* Handle null: stop work, clear caches, park the UI |
| `registry.npmjs.org` | Querying from the passive loop, uncached, undisclosed (JSMiner's bug) | Cached, batched, rate-limited, explicitly disclosed, individually disableable, off the hot path |
| Provider validation APIs | One global "validate" toggle; auto-validating passively | Per-provider opt-in, named-host consent, non-mutating probes only, audit log, TTL cache |
| `llrt/fs` | Expecting Node's full `fs` (`realpath`, `lstat`, `cp`) | Verify each function against `caido/dependency-llrt/types/fs.d.ts`. No canonicalisation → lexical containment + content-addressed names |
| `child_process` | Expecting `exec` and stream `.pipe()` | `exec` is not implemented (use `spawn` with `shell`); streams cannot `pipe()`. And a bundled binary collides with store policy — treat as a last-resort escape hatch, never a default dependency |
| Bundled AST/sourcemap libraries | Assuming an npm package "works in QuickJS" | Verify: pure ESM, no Node builtins, no WASM loading, no dynamic `require`. Mozilla `source-map@0.8` pulls `fs`/`path`/`url` + `mappings.wasm` → unusable. Prefer `@jridgewell/sourcemap-codec` / `trace-mapping` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| Catastrophic backtracking on an adversarial body | Plugin stops responding forever; no error, no log | Literal prefilter + bounded windows + ReDoS linter + `re2js` for risky rules (P1) | The first hostile target — or by accident on any large body |
| Full-body regex passes, one per detector | Analysis time scales rules × bytes | One decode, one prefilter pass, N bounded windows | ~200 rules × 5 MB |
| Re-analysing the same vendor chunk per host/page | Constant CPU on ordinary browsing | Content-hash cache (sha256 of raw bytes) + analyzer version | Any SPA; any site visited twice |
| Unbounded event queue in the passive path | Growing RSS; findings lagging minutes behind | Bounded ring buffer with visible drop counter | A burst of chunk loads on a heavy SPA |
| `toText()` on every response | RSS doubles on non-ASCII; GC thrash at the 20 MB threshold | `Body.length` gate first; `toRaw()` + chunked scanning | 5–10 MB bundles |
| Full AST parse of a large bundle | Seconds of blocked event loop; hundreds of MB RSS | Size threshold (~1.5 MiB soft, ~3 MiB hard); `lexical_only` degradation | ~3 MB inputs |
| Recursive AST walk | `RangeError: Maximum call stack size exceeded` | Iterative walk with explicit stack + depth cap | Deeply nested minified expressions, well before "adversarial" |
| `JSON.parse` of a large `.map` | Memory spike; possible host OOM abort | Byte ceiling before parse; one map at a time; drop the object promptly | Maps with full `sourcesContent` (2.5–5× the bundle) |
| Marker/offset generation by re-scanning the body per match | O(matches × body length) | Record offsets during the single scan | JSMiner's exact bug (`Utilities.java:76`); any body with a repeated token |
| Hundreds of `sdk.requests.send()` calls | Stalled jobs at ~80; Caido process abort at ~120 | Global lifetime budget + prefer `fetch` where possible | One SPA with 150 chunks |
| Per-response `new RegExp()` compilation | Steady CPU floor proportional to traffic | Compile the corpus once at init | ~200 rules × every response |
| Writing one file per source with no batching/dedup | Slow dumps; filesystem churn; name collisions | Content-addressed blobs + one manifest write | Maps with 1000+ sources |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| Writing `sourcesContent` to `outDir + sources[i]` | Arbitrary file write on the operator's machine from a hostile target (CVE-2024-21540 class) | Content-addressed storage; sanitised export as a separate explicit action; lexical containment with trailing-separator check (P7) |
| Percent-decoding *after* sanitising a path | `..%2f..%2f` bypasses the filter | Decode once, then sanitise; reject anything still containing separators or `..` |
| Trusting `sources` scheme/authority | `webpack://`, `file://`, UNC paths, drive letters escape the output dir | Parse as URL; strip scheme+authority; drop absolute prefixes and drive letters |
| Storing raw secrets in the plugin SQLite | The plugin DB becomes a portable credential dump; cross-project leakage (P8) | HMAC fingerprint + redacted preview + offset; reveal on demand from the original request after re-verifying the artifact hash |
| Rendering findings as HTML in the workspace UI | Attacker-controlled JS content becomes XSS inside Caido's UI | Render as text; escape everything; never `v-html` on scanned content; strip control chars from previews |
| Interpolating extracted strings into regexes | Regex injection / accidental ReDoS — JSMiner does this with the root domain (`SubDomains.java:51`) | Escape all dynamic regex input, or avoid dynamic regexes entirely (prefer string/URL parsing) |
| Auto-validating discovered secrets | Alerts the key owner; third-party legal exposure outside safe harbour (P11) | OFF by default, per-provider opt-in, explicit consent, audit log |
| Sending internal package names to npm from the passive path | Publishes the target's private dependency graph to a third party (P12) | Explicit, disclosed, cached, disableable — never implicit |
| Accepting a remote rule file without validation | Remote code/regex injection; ReDoS via a malicious rule | Pinned URL + signature + schema validation + ReDoS lint at load, size/count caps (P10) |
| Logging secrets to `sdk.console` | Credentials land in Caido's logs and any log export | Never log values; log fingerprints and rule ids only |
| Following the map's `sourceRoot` blindly | Same traversal class, one indirection removed | Resolve `sourceRoot` first, then apply the full sanitiser to the *result* |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---|---|---|
| Findings with no explanation ("High entropy string") | Operator cannot triage; learns to ignore DefMiner | Show the rule, the matched shape, the context, and each scoring feature |
| Everything projected into Caido Findings | Findings tab becomes unusable and **cannot be cleaned** (no delete API) | Two tiers: workspace = full inventory; Findings = top tier only |
| Silent degradation on large files | Operator believes a bundle was analysed when it was skipped | Explicit per-artifact status: `full`, `lexical_only`, `skipped_too_large`, `budget_exceeded`, with counts in the UI |
| Silent dropping of queued responses | Missing findings with no explanation | Visible drop counter + "analysis is behind" indicator |
| Active features on by default with no visible traffic accounting | Operator unknowingly violates a program's rate rules or gets blocked | Live request counter per host, rate-limit setting on the first-run screen, obvious global kill switch |
| Sourcemap dump into an unexpected directory | Files scattered; operator can't find or trust them | Default under `sdk.meta.path()`, show the exact path, show a manifest, require confirmation for a custom directory |
| One global "validate secrets" switch | Operator enables it for one provider and unknowingly hits ten | Per-provider toggles with the outbound host named in the UI |
| Re-scan diffing that reports every deploy as "everything changed" | Diff feature becomes noise | Diff on canonical entities (normalised secret/endpoint identity), not on bundle text |
| No way to suppress a known FP | Operator sees the same wrong finding on every page load | Per-rule and per-value suppression in the workspace, persisted per project |

---

## "Looks Done But Isn't" Checklist

- [ ] **Passive scanning:** often missing the bounded queue and drop counter — verify the plugin stays responsive while browsing a 200-chunk SPA, and that `dropped` is surfaced
- [ ] **Detection engine:** often missing the ReDoS lint gate — verify CI *fails* when a nested-quantifier rule is added, and that `recheck` treats polynomial as failing
- [ ] **Detection engine:** often missing the negative corpus — verify findings-per-MB on the clean corpus is measured and printed in CI on every rule change
- [ ] **Secret detection:** often missing local checksum validation — verify GitHub/Stripe/AWS-shaped strings without valid checksums are rejected before any network call
- [ ] **Secret storage:** often missing redaction — verify the SQLite file contains no raw credential material after a full scan
- [ ] **Sourcemap reconstruction:** often missing index maps (`sections`), `sourceRoot`, and null `sourcesContent` — verify each against a fixture; verify a null entry degrades to "path only", not "drop the map"
- [ ] **Sourcemap reconstruction:** often missing the malicious-`sources` test suite — verify `../../..`, `/etc/passwd`, `C:\…`, `webpack:///../`, `..%2f`, `CON`, NUL bytes, 4096-byte segments all land inside the output dir or are rejected
- [ ] **Active retrieval:** often missing the global send budget — verify the counter persists across scans within a runtime lifetime (P4 is cumulative, not per-scan)
- [ ] **Active retrieval:** often missing the self-suppression set — verify DefMiner does not analyse its own `.map` fetches
- [ ] **Persistence:** often missing `project_id` on at least one table — verify by creating two projects and confirming zero cross-visibility
- [ ] **Persistence:** often missing the migration path — verify upgrading from the previous released schema on a populated DB, not just a fresh install
- [ ] **Project switching:** often missing in-flight cancellation — verify `onProjectChange` (including `project === null`) stops work, clears caches, and clears dedupe maps
- [ ] **Store readiness:** often missing the disclosure table — verify the README enumerates every outbound host, the data sent, the default state and how to disable it
- [ ] **Store readiness:** often missing LICENSE / semver / signed release — verify a clean-machine install of the signed artifact before submitting
- [ ] **Version compatibility:** often missing the `sdk.runtime.version` guard — verify graceful degradation on the declared minimum Caido version
- [ ] **Error handling:** often missing the top-level guard — verify one detector throwing does not kill the consumer loop or leave the queue wedged

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| P1 ReDoS hang shipped in a rule | **HIGH** | Operator must restart Caido (no in-plugin recovery). Ship a patch release removing the rule; add a fixture; audit the whole corpus with `recheck`. This is why the linter must precede the corpus |
| P2 FP flood already written to Findings | **HIGH** | Findings cannot be deleted via the SDK. Damage is per-project and permanent; the operator must clean up manually. Only prevention works — hence the two-tier design |
| P3 Event-loop starvation | MEDIUM | Restart Caido; ship the bounded-queue/yield fix. Recoverable because no data is corrupted |
| P4 `requests.send()` process abort | **HIGH** (for the user) | Caido restarts, guest token invalidated, temporary project lost. Recovery = lower the budget and ship it; nothing the operator can do in-session |
| P5 OOM abort | **HIGH** | Same as P4 — process death. Prevention via size gates is the only control |
| P6 Stack overflow in AST walk | LOW | Catch `RangeError`, mark `lexical_only`, continue. Fix by converting the walk to an explicit stack |
| P7 Path traversal already exploited | **HIGH** | Files written outside the sandbox on the operator's machine; security advisory + patch + a note telling operators what to audit. Prevention is the only acceptable plan |
| P8 Schema/scoping mistake shipped | MEDIUM | Write a migration that adds `project_id` and quarantines unattributable rows into an "unknown project" bucket rather than deleting them |
| P9 Program complaint / target block | MEDIUM | Immediate patch lowering defaults; document the rate limiter in the README; consider flipping `.map` guessing to default-OFF |
| P10 Store policy violation | MEDIUM–HIGH | Caido contacts the developer with a deadline; fix and resubmit. Repeat or serious violations → immediate removal. Pre-clearance (SPIKE-10) avoids this entirely |
| P11 Validation burned a key / alerted an owner | MEDIUM | Cannot be undone. The audit log is the operator's defence; make it exportable and complete |
| P15 Caido update breaks the plugin | LOW–MEDIUM | Version guard degrades gracefully instead of throwing; ship a compatibility patch |
| P16 Lost signing key | MEDIUM | PR to `caido/store` rotating `public_key`; users must reinstall. Avoid with an offline encrypted backup |

---

## Named Spikes

Each spike resolves a specific uncertainty. Ones marked **gating** must complete before the dependent phase begins.

| ID | Question | Method | Gating? |
|---|---|---|---|
| **SPIKE-01** | Does Caido install a QuickJS interrupt handler? Does a catastrophic regex hang DefMiner forever? Is `re2js` fast enough in this runtime? | Minimal plugin: run `/(a+)+$/.test("a".repeat(40)+"b")` inside `onInterceptResponse`; observe whether the plugin thread ever recovers, whether Caido logs/kills it, and whether other plugins keep working. Then benchmark `re2js` vs native `RegExp` on the same rule set and inputs | **YES** — gates the whole detection engine |
| **SPIKE-02** | What are the real CPU/RSS/time budgets inside Caido (not standalone quickjs-ng)? Where do the AST thresholds go? Where does the 512 KiB stack actually break? | Instrumented plugin measuring wall-clock and (proxied) memory pressure for decode / hash / lexer / Meriyah parse on 0.5, 1.5, 3, 8 MB real bundles; recursion-depth probe | **YES** — sets every size ceiling |
| **SPIKE-03** | What does Caido do with `onInterceptResponse` events the plugin is too slow to consume — queue unboundedly, drop, or apply backpressure? Does a thrown/rejected callback get logged or swallowed? | Handler that blocks 30 s while a script issues 500 proxied requests; count events actually delivered. Separately: throw sync and reject async, inspect logs | **YES** — determines the ingestion design |
| **SPIKE-04** | Reproduce caido/caido#2211 on the minimum supported Caido version. What is the current send cliff? Does `caido:http` `fetch` share the leak? | Loop `sdk.requests.send()` in increments of 10 to failure; repeat with `save:false`; repeat with `fetch` | **YES** — gates all active features |
| **SPIKE-05** | Does `sdk.requests.send()` re-fire `onInterceptResponse`? Do Replay/Automate/import/workflow traffic fire it? Does `save:false` suppress it? Does `plugins:false` change it? | Event-matrix plugin logging every delivered event with its origin, across each combination | **YES** — gates active retrieval |
| **SPIKE-06** | Exact `llrt/fs` + `path` behaviour for containment: does `path.resolve` normalise the way Node does? What happens on Windows drive letters, UNC, reserved names? Is there any way to detect a symlink without `lstat`? | Unit-test harness inside a dev plugin against the malicious-`sources` fixture set on macOS/Linux/Windows | Before sourcemap phase |
| **SPIKE-07** | Do `PRAGMA` and `BEGIN/COMMIT` survive across `exec` calls on the pooled connection? Is a multi-statement single `exec` atomic? Is WAL on? What is the concurrency behaviour? | Interleave writes/reads; force a mid-batch failure and inspect the resulting state | Before persistence phase |
| **SPIKE-08** | Are proxied response bodies stored decompressed? Does `Body.length` equal `toRaw().length`? How are `Content-Encoding: gzip/br/zstd` responses presented? | Serve gzip/br/zstd fixtures through Caido and inspect both values plus headers | Before passive gating |
| **SPIKE-09** | What is DefMiner's real false-positive rate, and on what corpus? | Build the harness: **negative corpus** = top ~200 npm dist bundles (react, vue, angular, lodash, moment, three, monaco, chart.js, pdf.js, tinymce, jquery, d3, …) + a synthetic bundle containing base64 fonts, inline sourcemaps, content hashes, UUIDs, Sentry DSNs, Firebase configs, JWT demos — **every finding is a false positive**, report findings-per-MB. **Positive corpus** = one synthetic bundle per provider containing a checksum-valid, format-correct, revoked/canary key, plus TruffleHog/Gitleaks public test fixtures — report recall. Optionally sample real-world JS via the HTTPArchive `response_bodies` dataset (the methodology used by arXiv:2603.12498) for a realism check. Run both in CI on every rule change; fail the build on regression | **YES** — gates the Core Value claim |
| **SPIKE-10** | Is an opt-in, signed, data-only remote rule refresh acceptable under the Caido Developer Policy? | Ask Caido directly (Discord / docs issue) with the exact design written down, before building it | Before distribution phase |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---|---|---|
| P1 ReDoS | Phase 0 (SPIKE-01) + detection-engine phase | CI rejects a deliberately-catastrophic rule; a poison-bundle fixture completes within budget |
| P2 False positives | FP-corpus phase (before detector #2) + detection-engine phase | Findings-per-MB on the negative corpus is measured, printed in CI, and in the README |
| P3 Event-loop starvation | Phase 0 (SPIKE-03) + passive-ingestion phase | Workspace UI stays responsive under a 200-chunk SPA load; drop counter visible |
| P4 `requests.send()` crash | Phase 0 (SPIKE-04) + active-retrieval phase | Send budget enforced across scans; Caido survives a full 300-chunk SPA with active features on |
| P5 Memory / P6 stack / P18 JSON | Phase 0 (SPIKE-02) + passive-ingestion + AST phases | 8 MB bundle degrades to `lexical_only` without a crash; RSS stays under the measured ceiling |
| P7 Path traversal | Sourcemap phase | Malicious-`sources` fixture suite passes on all three platforms; nothing written outside the output dir |
| P8 SQLite scoping/migrations | Persistence phase (SPIKE-07) | Two-project isolation test; upgrade-from-previous-schema test on a populated DB |
| P9 404 storms / history pollution | Active-retrieval phase (SPIKE-05) | Rate limiter honoured; per-host circuit breaker trips; speculative probes absent from Search |
| P10 Store policy | Phase 1 architecture (rules-as-data) + distribution phase (SPIKE-10) | README disclosure table complete; no code-loading path exists anywhere in the bundle |
| P11 Validation legality | Validation phase (last) | Default OFF per provider; consent dialog names the host; audit log exports |
| P12 NPM | Dependency-confusion phase | Cache hit rate measured; disclosed in README; disableable; findings are not `High/Certain` |
| P13 Regex limits | Detection-engine phase | Corpus compiles at init; no shared stateful regex instances (lint rule) |
| P14 `toText()` lossiness | Passive-ingestion phase | Offsets and hashes derived from `toRaw()`; round-trip test on a non-UTF-8 fixture |
| P15 Version skew | Phase 1 scaffolding + every phase | Version guard exercised against the declared minimum Caido build |
| P16 Signing / releases | Distribution phase | Key backed up offline; dry-run install of the signed artifact in the release checklist |
| P17 Corpus rot | Detection-engine phase + distribution phase | Rule pack is versioned; a rule-only patch release can ship without touching plugin code |

---

## Sources

**Runtime and engine (HIGH — primary source, read directly):**
- [quickjs-ng/quickjs `libregexp.c`](https://github.com/quickjs-ng/quickjs/blob/master/libregexp.c) — `CAPTURE_COUNT_MAX 255`, `INTERRUPT_COUNTER_INIT 10000`, `lre_poll_timeout`, `LRE_RET_TIMEOUT`, `stack_realloc` (heap backtracking stack), lookbehind via `is_backward_dir`
- [quickjs-ng/quickjs `quickjs.c`](https://github.com/quickjs-ng/quickjs/blob/master/quickjs.c) — `lre_check_timeout` returns 0 when `rt->interrupt_handler` is NULL; `JS_STRING_LEN_MAX ((1 << 30) - 1)`; `LRE_RET_TIMEOUT → JS_ThrowInterrupted`
- [quickjs-ng/quickjs `quickjs.h`](https://github.com/quickjs-ng/quickjs/blob/master/quickjs.h) — `JS_DEFAULT_STACK_SIZE (1024 * 1024)`, `JS_SetMemoryLimit`, `JS_SetMaxStackSize`
- [DelSkayn/rquickjs `.gitmodules`](https://github.com/DelSkayn/rquickjs) — `sys/quickjs` → `quickjs-ng/quickjs.git` (proves the engine family)
- [caido/dependency-llrt `llrt_core/src/vm.rs` (branch `caido`)](https://github.com/caido/dependency-llrt/blob/caido/llrt_core/src/vm.rs) — `max_stack_size: 512 * 1024`, `gc_threshold_mb: 20`, no `set_memory_limit`, no `set_interrupt_handler`
- [caido/dependency-llrt `Cargo.toml`](https://github.com/caido/dependency-llrt/blob/caido/Cargo.toml) — `rquickjs 0.10` with `full-async, parallel, rust-alloc, std`; `panic = "abort"` in the release profile
- [caido/dependency-llrt `libs/llrt_json/src/parse.rs`](https://github.com/caido/dependency-llrt/blob/caido/libs/llrt_json/src/parse.rs) — full input copy + recursive `parse_node`
- [simd-lite/simd-json](https://github.com/simd-lite/simd-json) — `DEFAULT_MAX_DEPTH: usize = 1024`, `ErrorType::DepthLimitExceeded`
- [caido/dependency-llrt `types/fs.d.ts`, `types/path.d.ts`](https://github.com/caido/dependency-llrt/tree/caido/types) — no `realpath`, no `lstat`

**Caido SDK and policy (HIGH — official documentation, local copy grepped):**
- Backend events reference — `onInterceptRequest/Response/ProjectChange` "called asynchronously and cannot modify …"; `onUpstream` "called synchronously so special care should be taken"
- [Runtime concepts](https://developer.caido.io/plugins/concepts/runtime) — QuickJS, ES2023, "a long running thread"
- [Module reference](https://developer.caido.io/plugins/reference/modules) — no `worker_threads`
- [Findings SDK](https://developer.caido.io/plugins/reference/sdks/backend/findings) — `create`/`exists`/`get` only
- [Meta SDK](https://developer.caido.io/plugins/reference/sdks/backend/meta) — `db()` "stored in Caido Data"; `assetsPath()` "shouldn't write anything there"; `updateAvailable()` "Throws if Caido Cloud is offline"
- [SQLite module + guide](https://developer.caido.io/plugins/reference/modules/extra/sqlite) — "connection pool … each connection will be spawned in a worker thread"; no transaction API
- Requests SDK — `RequestSendOptions.save` default `true`, `plugins` default `true` ("through the upstream plugins"); `Body.length`, `toRaw()`, `toText()` ("Unprintable characters will be replaced with `\uFFFD`")
- [Developer Policy](https://developer.caido.io/plugins/concepts/developer_policy) — "Include a mechanism that updates the plugin" (Not Allowed); "Load assets from the internet (except if disclosed in README)"; disclosure rules; removal process
- [Manifest reference](https://developer.caido.io/plugins/reference/manifest) — no minimum-version field
- [Repository / signing guide](https://developer.caido.io/plugins/guides/repository) — Ed25519 signing, immutable releases
- [plugin_packages.json reference](https://developer.caido.io/plugins/reference/plugin_packages) — `public_key` pinned in the store

**Real-world Caido bug reports (HIGH — filed issues with reproduction):**
- [caido/caido#2211](https://github.com/caido/caido/issues/2211) — open: `gc_decref_child` assertion aborts `caido-cli` at ~120 host-backed sends; ~80-send stall; disassembly included
- [caido/caido#895](https://github.com/caido/caido/issues/895) — "Response processing can exhaust memory" (32 GB from one streamed response)
- [caido/caido#1065](https://github.com/caido/caido/issues/1065) — "Add hard limits on buffers to avoid leaks"
- caido/caido#1976, #1341 — minimum-Caido-version for plugins, both open
- [caido-community/scanner](https://github.com/caido-community/scanner) — `packages/backend/src/index.ts` passive-gate + scheduler + `onProjectChange` pattern; issues #182 (passive queue performance), #245 (timeout crash), #191/#194 (scanner false positives)
- [caido-community/authmatrix `packages/backend/src/db/db.ts`](https://github.com/caido-community/authmatrix/blob/main/packages/backend/src/db/db.ts) — `project_id` in every primary key; `PRAGMA foreign_keys` on a pooled connection; retrofitted column with a default
- caido-community/devtools#2 — `INVALID_PACKAGE` from premature rebuild signalling

**JSMiner source (HIGH — read at commit `420c566`, the last commit, 2023-07-20):**
- `utils/FileUtils.java` — the fake-root + canonical-path containment check (works, but fragile); returns a directory on failure
- `utils/SourceMapper.java` / `utils/JSMapFile.java` — only `sources` + `sourcesContent`; no `sourceRoot`, no `sections`, no null handling; one `catch (Exception)` drops the whole map
- `utils/Constants.java:22,36,69,83,85`, `core/scanners/Secrets.java:33,54,102`, `utils/Utilities.java:76,200,240`, `core/scanners/Endpoints.java:53`, `core/scanners/DependencyConfusion.java:40,84,111,144`, `core/ScannerBuilder.java:113`, `config/ExecutorServiceManager.java:8`, `BurpExtender.java:476` — the detector, concurrency and reporting defects catalogued above

**False-positive economics (HIGH — peer-reviewed measurement):**
- ["Keys on Doormats: Exposed API Credentials on the Web", arXiv:2603.12498](https://arxiv.org/html/2603.12498v2) — TruffleHog v3.90.8 over the Sept-2025 HTTPArchive crawl (11.9M hostnames, ~200 TB); GitHub 1.9M candidates → 119 verified; Telegram 219 → 186; 62% of JS credential exposures are inside bundles; explanation of why broad detectors match "parts of URLs, hashed values, or build artifacts"
- [Intruder — "Secrets in your Bundle(.js)"](https://www.intruder.io/research/secrets-detection-javascript) — ~5M applications, 42k tokens, 334 secret types; `ya29.[0-9A-Za-z-_]+` named as a specific FP generator on minified JS
- [Cremit — secret scanning false positives](https://www.cremit.io/blog/secret-scanning-false-positives-causes-and-fixes) — entropy flags base64, UUIDs, hashes, minified JS, URL params
- [Yelp/detect-secrets#693](https://github.com/Yelp/detect-secrets/issues/693) — base64 high-entropy FPs
- [HTTP Archive](https://httparchive.org/) — `response_bodies` BigQuery dataset as a corpus source

**ReDoS mitigation prior art (HIGH/MEDIUM):**
- [gitleaks `regexp/stdlib_regex.go` + `wasilibs_regex.go`](https://github.com/gitleaks/gitleaks/tree/master/regexp) — Go `regexp` (RE2) by default, `wasilibs/go-re2` behind `gore2regex`; both linear-time
- [le0pard/re2js](https://github.com/le0pard/re2js) — pure-JS RE2 port, linear-time guarantee (v2.8.6, no runtime deps, ~870 KB unpacked)
- [recheck / eslint-plugin-redos](https://makenowjust-labs.github.io/recheck/docs/usage/as-eslint-plugin/) — hybrid static+fuzz ReDoS checker; recommends treating polynomial as vulnerable
- [Secrets-Patterns-DB](https://mazinahmed.net/blog/secrets-patterns-db/) — 1,600+ patterns with scripted ReDoS validation in CI
- [Sonar — vulnerable regular expressions in JavaScript](https://www.sonarsource.com/blog/vulnerable-regular-expressions-javascript/)

**Sourcemap / path traversal (HIGH):**
- [CVE-2024-21540 — `source-map-support` directory traversal](https://security.snyk.io/vuln/SNYK-JS-SOURCEMAPSUPPORT-6112477)
- [CVE-2024-29180 — `webpack-dev-middleware` path traversal](https://vulert.com/vuln-db/CVE-2024-29180)
- [ECMA-426 source map format](https://tc39.es/ecma426/) — regular vs index maps, `sourceRoot`, `sourcesContent`, `ignoreList`

**Active-scanning ethics and rate limits (MEDIUM):**
- [Intigriti — aggressive scanning in bug bounty](https://www.intigriti.com/researchers/blog/hacking-tools/aggressive-scanning-in-bug-bounty-and-how-to-avoid-it) — the 2–10 rps norm; "aggressive/intrusive" definitions
- [Intigriti — scoping third-party assets](https://www.intigriti.com/blog/business-insights/how-to-scope-third-party-assets) — programs cannot indemnify against third-party claims
- [npm — API rate limiting](https://blog.npmjs.org/post/164799520460/api-rate-limiting-rolling-out) and [Acceptable Use of the Public Registry](https://blog.npmjs.org/post/187698412060/acceptible-use.html); [npm/feedback#658](https://github.com/npm/feedback/discussions/658) — rate limits remain undocumented
- [Truffle Security — bug bounty hunting leaked credentials](https://trufflesecurity.com/blog/bug-bounty-hunting-leaked-credentials) — non-state-changing single-request validation as the accepted technique
- [A Researcher's Guide to Some Legal Risks of Security Research (Harvard Cyberlaw Clinic)](https://clinic.cyber.harvard.edu/wp-content/uploads/2020/10/Security_Researchers_Guide-2.pdf)

**Prior internal research corroborated (not relied on alone):**
- `scratchpad/codex/01-codex-research.md` — independent review reaching the same conclusions on the passive-hook idiom, the absence of worker threads, and the JSMiner defect catalogue; its standalone quickjs-ng parser benchmarks (Meriyah ~2 s / ~242 MB on 3.15 MB input) are directional only and must be re-measured inside Caido (SPIKE-02)

---
*Pitfalls research for: Caido offensive-security JS static-analysis plugin (DefMiner)*
*Researched: 2026-08-20*
