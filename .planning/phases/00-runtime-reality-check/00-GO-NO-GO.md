<!-- GENERATED FILE — DO NOT EDIT.
     Produced by scripts/spike/render-go-no-go.py from
     .planning/phases/00-runtime-reality-check/results/go-no-go.json.
     tests/go-no-go.spec.ts re-runs the renderer and diffs, so any hand edit fails CI.
-->

# Phase 0 — Go / No-Go

Every threshold below was measured against **Caido 0.57.1** on this machine. This file and the JSON beside it are the only Phase 0 artifacts later phases may import.

## Provenance

| Field | Value |
| --- | --- |
| Binary | `/Applications/Caido.app/Contents/Resources/bin/caido-cli` |
| Version reported | `0.57.1` |
| Version expected | `0.57.1` |
| Binary SHA-256 | `e9f77d87eecf89cdc82feca4d46821bb52f1b14d205477991a3678c931c6bb54` |
| Host | darwin 25.6.0 / arm64 |
| CPU | Apple M4 Pro (14 cores) |
| RAM | 24.0 GB |
| Generated | `2026-08-20T17:04:57Z` |

Bare `caido-cli` on this machine resolves to a stale 0.55.3. Every measurement here was taken through the absolute app-bundle path above, asserted before the run rather than checked afterwards.

## The contract Phase 1 must satisfy

This is a requirement, not a suggestion.

**Every tunable constant in the engine imports its value from `go-no-go.json` and is asserted equal to it by a test in the SDK-free engine workspace.** A developer who tunes a constant without re-measuring fails CI.

The mechanism matters as much as the rule. A constant copied into source drifts silently the first time someone tunes it to make a test pass; a constant imported and asserted cannot. Where a threshold is `null` with status `inconclusive`, the engine imports the accompanying assumed value and the test asserts THAT, so the placeholder is visible in code review rather than buried in a comment.

## Gates (13)

One per Phase 0 requirement id. `Blocks` names the downstream requirements each answer unlocks.

### SPIKE-01 — PASS

**Question.** Determine whether a catastrophic regex hangs the plugin forever inside Caido, and whether re2js is a viable escape hatch at acceptable cost.

**Answer.** YES — a catastrophic regex hangs the plugin with no interrupt, no timeout and no in-runtime recovery. Native /(a+)+$/ grew 3.985x per two added characters on this build (52 ms at n=20 to 3279 ms at n=26), extrapolating n=40 to 14.5 hours. n=40 was fired and had not returned 660.0 s later — a window 79x shorter than completion — with 0 interrupt signals in 2433 log lines. Throughout, the Caido core answered GraphQL in 0.59 ms median and the proxy returned 200 on 13/13 requests, so the host stays diagnosable; but togglePlugin never returned and installPluginPackage(force:true) returned in 25.4 ms with package=null and error=OtherUserError rather than reloading anything, so SIGKILL is the only recovery. Worse, a SECOND package with its own executor answered normally for the first 4 samples and on none of the 9 after the toggle was requested — attempting recovery is what spreads the damage. re2js is flat on the same escalation and 59.711x slower on the real rule set, split 19.625x provider / 91.059x generic — verdict adopt-generic.

**Blocks.** `DET-04`, `DET-05`, `DET-06`, `ERR-01`, `QUAL-05`

**What changes if this is wrong.** If an interrupt DOES in fact fire on some build or configuration, the hang becomes a thrown error mid-scan instead. That is better but it is still a scan failure, so ERR-01's per-artifact isolation has to handle it either way and the design does not collapse in either direction. What DOES change: DET-05's static ReDoS check would drop from load-bearing to defence-in-depth, and re2js could be deferred entirely. Conversely, if RE2JS_THROUGHPUT_RATIO is materially worse on a different corpus — the ratio is dominated by unanchored rules, and a rule set with more of them would push it up — then re2js cannot be afforded even inside bounded windows, and DET-05 plus a hard per-rule match budget become the only defence. Re-measure this ratio against the actual Phase 3 rule corpus before committing to it.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `RE2JS_THROUGHPUT_RATIO` | `59.711` | x (re2js elapsed / native elapsed; >1 = re2js slower) | `HIGH` |
| `RE2JS_VERDICT` | `adopt-generic` | enum(adopt-all\|adopt-generic\|reject) | `HIGH` |
| `REDOS_INTERRUPTIBLE` | `false` | boolean | `HIGH` |
| `REDOS_RECOVERY` | `kill` | enum(none\|throw\|kill) | `HIGH` |

### SPIKE-02 — PASS

**Question.** Confirm setTimeout(fn, 0) actually yields the QuickJS event loop. If it does not, budget-and-background does not work and the ingestion design must change.

**Answer.** YES — `setTimeout0` is the only primitive that genuinely yields the QuickJS event loop. Service ratios over a 300 ms window: setTimeout0=0.76; setImmediate=0.00; promiseResolve=0.00; blocking=0.00. setImmediate and Promise.resolve() starve timers exactly as hard as a fully blocking loop, so neither is a yield. The winner costs 5.03 ms median (p95 6.04 ms) over 48 samples, and setTimeout clamps to ~5.0 ms, making setTimeout(fn,0) and setTimeout(fn,1) indistinguishable. At the real 64KB/4KB geometry over 8.0 MB, yielding once per chunk costs 744.8 ms of pure overhead (330.7% on top of work) across 137 yields, whereas yielding on a 25 ms temporal budget costs 29.5 ms (21.2%) across 5 yields. The yield trigger must therefore be TEMPORAL; the chunk geometry stays only for matching-window reasons. RSS attribution tracks in-runtime allocation (held_32mb 0.94x, held_96mb 1.02x), and RSS did NOT fall when every reference was dropped.

**Blocks.** `CORE-06`, `CORE-07`, `CORE-04`, `QUAL-06`

**What changes if this is wrong.** If setTimeout(fn,0) did not yield, CORE-06's chunk-and-yield model is invalid and the ingestion execution model must change wholesale — budget-and-background cannot work, and CORE-07's background pass would have to move out of the runtime entirely. If the yield cost were much lower than 5.03 ms, geometry-driven yielding would become affordable and MAX_SYNC_SLICE_MS would be unnecessary. If RSS attribution did NOT track allocation, SPIKE-06's byte-per-byte budget has no measurement basis and the size ceiling would have to come from crash-boundary bisection alone.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `MAX_SYNC_SLICE_MS` | `25` | ms | `HIGH` |
| `YIELD_COST_MS` | `5.029` | ms | `HIGH` |
| `YIELD_PRIMITIVE` | `setTimeout0` | enum | `HIGH` |

### SPIKE-03 — PASS

**Question.** Determine what Caido does with onInterceptResponse events the plugin cannot consume fast enough — queue unboundedly, drop, or backpressure.

**Answer.** Caido QUEUES. All 500 proxied requests returned 200 to the client in 715 ms while the handler was still spinning, and all 500 events were delivered — exactly one during the block (the one that caused it) and the remaining 499 in a 20 ms burst after it released, with a CONTIGUOUS sequence range 501-1000 and nothing lost. Client latency did not move: p95 73.32 ms blocked against 49.26 ms on the idle baseline, and the blocked run's p99 and max were actually LOWER than the baseline's. A thirty-second plugin-thread stall is therefore invisible to the proxy's clients. Both a synchronous throw and an asynchronous rejection inside the handler were SWALLOWED: the probe's own marker lines prove each ran, and the unique error text appears in none of the three log surfaces — host log, stdout or stderr. The plugin kept receiving events after each.

**Blocks.** `CORE-01`, `CORE-03`, `CORE-04`, `CORE-10`, `ERR-03`, `OBS-01`

**What changes if this is wrong.** CORE-03's bounded queue is a different object under each of the three answers. Under QUEUE, which is what was measured, Caido's own buffer is unbounded as far as this experiment could see: 499 events survived a thirty-second stall intact. That means the plugin's bounded queue is not protecting Caido from DefMiner — it is protecting DefMiner's own memory from a backlog Caido will happily hand it all at once, and it must therefore be sized against RSS (SPIKE-06 measured 102 bytes of RSS per input byte) rather than against any assumed upstream limit. It also means the overflow counter is meaningful: anything it drops was genuinely offered. Under DROP the counter would be measuring the wrong thing entirely, because losses would already have happened upstream and invisibly, and 'we scanned everything' could never be a true statement — DefMiner would have to say 'we scanned everything we were given'. Under BACKPRESSURE the queue would need to be small on purpose, because every slow analysis would be paid for by the operator's own browsing latency, and the plugin would have to shed load rather than buffer it. Separately, because Caido SWALLOWS both a synchronous throw and an asynchronous rejection, ERR-03 and OBS-01 cannot rely on the host for any error visibility whatsoever: every handler must wrap its own body in try/catch and log through sdk.console itself, and any uncaught rejection inside DefMiner will be silent in production. A crash-looping analyser would look, from the outside, exactly like an idle one.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `EVENTS_DELIVERED_UNDER_BLOCK` | `500` | events | `HIGH` |
| `EVENT_OVERFLOW_BEHAVIOUR` | `queue` | enum(queue\|drop\|backpressure) | `HIGH` |
| `HANDLER_ERROR_SURFACED` | `neither` | enum(both\|sync\|async\|neither\|partial) | `HIGH` |

### SPIKE-04 — PASS

**Question.** Reproduce caido/caido#2211 on 0.57.1 — the exact build it was filed against, so this is a direct reproduction rather than an extrapolation.

**Answer.** Send cliffs on 0.57.1, one fresh instance per variant: save-true 2000 sends (clean, exit 137), save-false 2000 sends (clean, exit 137), fetch 2000 sends (clean, exit 137). Overall failure mode: clean. Variants save-true, save-false, fetch reached the 2000-send cap without failing, so those figures are FLOORS — the cliff is somewhere above the cap, not at it. Reading them as cliffs would be the same category error as reading an undefined rate as zero. A CONTROL on a fifth fresh instance ran the naive wrapper shape — every wrapper retained instead of reduced to primitives — and also completed 2000 sends cleanly holding 10000 live wrappers, so the clean result is not an artefact of the probe following ACTIVE-09's discipline. caido/caido#2211's ~54 clean / ~80 stall / ~120 abort DID NOT REPRODUCE on this host at 16x the reported abort threshold, in either wrapper shape, with no latency drift in any run. The write-ahead journal ACTIVE-02 and ACTIVE-13 depend on was validated against 4 real abrupt host deaths: 2 caught the exact in-flight send by sequence and redacted candidate, 2 correctly left no open row because the death landed between sends, and 0 produced a spurious one.

**Blocks.** `ACTIVE-01`, `ACTIVE-02`, `ACTIVE-09`, `ACTIVE-12`, `ACTIVE-13`, `ACTIVE-14`

**What changes if this is wrong.** The consequential direction here is that the cliff is REAL and simply out of reach of this apparatus. #2211 is open and filed against this exact build, so the safe reading of a clean run is 'not reproduced under these conditions', not 'does not exist'. Three conditions differ from a real DefMiner workload and each could move the number: bodies were 2048 synthetic bytes rather than a multi-hundred-kilobyte `.map`; sends were strictly serialised one at a time; and the host was otherwise idle. If any of those is what gates the leak, ACTIVE-01's default-on unbudgeted probing reaches the abort on ordinary SPAs and ACTIVE-14's kill switch has to become a real cap rather than a diagnostic warning. Nothing in the design relaxes on the strength of this result: ACTIVE-13's crash recovery and ACTIVE-02's journal are still required, because `panic = "abort"` means the failure has no unwind at whatever count it arrives, and because a host can die for reasons that have nothing to do with #2211 — which is exactly what the SIGKILL validation above exercised. Phase 8 should re-run this with real `.map` bodies and concurrent sends before treating the floor as headroom.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `SEND_CLIFF_FETCH` | `2000` | sends completed with no failure (FLOOR — the cap, not a cliff) | `MEDIUM` |
| `SEND_CLIFF_SAVE_FALSE` | `2000` | sends completed with no failure (FLOOR — the cap, not a cliff) | `MEDIUM` |
| `SEND_CLIFF_SAVE_TRUE` | `2000` | sends completed with no failure (FLOOR — the cap, not a cliff) | `MEDIUM` |
| `SEND_FAILURE_MODE` | `clean` | enum(clean\|stall\|abort) | `HIGH` |

### SPIKE-04b — PASS

**Question.** Determine whether toggling the plugin off and on resets the #2211 leak. The host log shows a per-plugin executor (plugin|executor: Stopping plugin executor), suggesting the QuickJS runtime may be per-plugin and torn down on toggle.

**Answer.** Toggling the plugin off and on RE-CREATES the QuickJS runtime: 3 distinct module instantiations across 3 legs, the probe's per-runtime send counter back at 0 each time (True), and togglePlugin returning error:null on every call. The plugin database survives it — 6000 rows spanning 3 sessions in one db — so a crash marker written before a toggle is still readable after it. 6000 sends completed across the legs against a reference of 2000. The reset of #2211's leak specifically could not be observed, because a control on its own fresh instance running the NAIVE wrapper shape — every wrapper retained — also completed 2000 sends cleanly. PLUGIN_TOGGLE_RESETS_LEAK = runtime-recreated-no-leak-observed.

**Blocks.** `ACTIVE-13`, `ACTIVE-01`

**What changes if this is wrong.** If a toggle does NOT reset the leak, ACTIVE-13's recovery path cannot be 'restart the plugin' — it has to be a hard per-runtime send budget enforced by DefMiner itself, with the operator asked to restart Caido once it is exhausted, because nothing inside the plugin API can reclaim host-side references. The measurement here says the mechanism exists: the runtime is genuinely rebuilt, so ANY state that lives in the QuickJS runtime is discarded by a toggle. The residual risk is that #2211's references live on the HOST side of the boundary rather than in the runtime, in which case a toggle rebuilds the runtime and leaks exactly as before — and this run cannot distinguish those two, because it never produced a leak to watch. One consequence is not conditional and should be designed for now: a toggle is only usable while the runtime still responds. SPIKE-01 measured the same mutation against a WEDGED plugin never returning at all, and taking the healthy plugins down with it, so ACTIVE-13 must decide to toggle on a leading indicator rather than after the runtime has already stopped answering.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `PLUGIN_TOGGLE_RESETS_LEAK` | `runtime-recreated-no-leak-observed` | enum(true\|false\|runtime-recreated-no-leak-observed) | `MEDIUM` |

### SPIKE-05 — PASS

**Question.** Build the event matrix — does sdk.requests.send() re-fire onInterceptResponse? Do Replay, Automate, imports, and workflows fire it?

**Answer.** onInterceptResponse fires for PROXIED traffic ONLY. Of 11 cells across 7 surfaces, only the proxy control cells delivered an event. Replay, Automate, an active workflow's sdk.requests.send(), the plugin's own sdk.requests.send() in all four save/plugins combinations, and caido:http fetch ALL reached the origin (confirmed in the origin's own log) and delivered NOTHING to the hook. createRequest(source: IMPORT) put a request and response into the project without touching the network and likewise delivered nothing. sdk.requests.send() therefore does NOT re-fire the hook, and neither save:false nor plugins:false changes that, because there is nothing to suppress.

**Blocks.** `ACTIVE-06`, `ACTIVE-12`, `ACTIVE-03`, `CORE-01`, `CORE-02`

**What changes if this is wrong.** DefMiner ships fingerprint-based self-suppression at the admission gate REGARDLESS of this answer, because ACTIVE-06 makes the recursion question moot by design. What this spike buys is knowing whether that guard is load-bearing or belt-and-braces: on this measurement it is belt-and-braces, so a bug in it cannot cause an infinite .map-probing loop. If the answer were reversed — if send() did re-fire the hook — the guard becomes the only thing standing between ACTIVE-06 and unbounded recursion, and it would need its own test suite and a hard depth counter rather than a fingerprint set. The larger consequence runs the other way and is not conditional: because NOTHING except the proxy reaches the hook, a passive-only DefMiner is blind to every operator-driven surface — Replay, Automate, workflows and imported traffic. CORE-01 and CORE-02 must therefore treat the intercept hook as ONE ingestion path among several, and Phase 6's retroactive scan over the project's stored requests is the only way that traffic can ever be analysed.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `PLUGINS_FALSE_SUPPRESSES_INTERCEPT` | `no-effect` | boolean-or-no-effect | `HIGH` |
| `SAVE_FALSE_SUPPRESSES_INTERCEPT` | `no-effect` | boolean-or-no-effect | `HIGH` |
| `SEND_REFIRES_INTERCEPT` | `false` | boolean | `HIGH` |
| `SURFACES_FIRING_INTERCEPT` | `proxy` | surface-list | `HIGH` |

### SPIKE-06 — PASS

**Question.** Measure real CPU and RSS budgets inside Caido (not standalone quickjs-ng), and find where the 512 KiB stack actually breaks.

**Answer.** Measured inside Caido 0.57.1, one FRESH instance per point. A full meriyah parse with ranges costs 785.8 ms/MB (per-point [629.7, 751.5, 551.2, 773.3]), and RSS grows at 102.1 bytes per input byte — so an 8 MB bundle costs roughly 817 MB of RSS inside the very process that holds the user's proxy and project data. The acorn tokenizer — Phase 9's intended low-memory fallback — costs 783.2 ms/MB, i.e. 1.0x the full parse, so it is NOT a cheaper path in CPU and only helps on memory. The 512 KiB stack breaks at 246 levels of nesting (by shape: {"brackets": {"last_good": 710, "first_bad": 718}, "parens": {"last_good": 246, "first_bad": 250}}) and the failure is a CATCHABLE RangeError every time — the host process survived all 18 depth probes, so a catch-and-degrade design is available and a hard pre-parse depth gate is not required. Escalating input size on fresh instances, the largest input that parsed was 274736748 bytes and the smallest that failed was 541148140 bytes, failing as ['timeout'].

**Blocks.** `DET-01`, `DET-07`, `CORE-06`, `CORE-07`, `MAP-03`, `MAP-05`, `QUAL-05`

**What changes if this is wrong.** AST_MAX_BYTES and HARD_MAX_BYTES are the ceilings Phase 3's engine and Phase 9's parser are built against. Set too high, a single proxied bundle blocks the Caido plugin runtime for seconds at a time — the parse is synchronous and unchunckable, so the proxy hook, the plugin RPC and every timer starve for its full duration, and at the top end the runtime stops rather than degrades. Set too low, DefMiner refuses the artifacts it exists to analyse: real bundles reach 4.9 MB. If MAX_NESTING_DEPTH is wrong, or if the failure mode is misread as a process death when it is a catchable throw, MAP-05 and QUAL-05 build a hard pre-parse depth gate where a catch-and-degrade path would have worked — or, far worse, the reverse: a catch that never fires because the process is already gone.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `AST_MAX_BYTES` | `1334405` | bytes | `HIGH` |
| `HARD_MAX_BYTES` | `274736748` | bytes | `HIGH` |
| `MAX_NESTING_DEPTH` | `246` | levels | `HIGH` |
| `PARSE_MS_PER_MB` | `785.8` | ms/MB | `HIGH` |
| `RSS_BYTES_PER_INPUT_BYTE` | `102.112` | ratio | `MEDIUM` |
| `STACK_FAILURE_MODE` | `catchable-throw` | enum | `HIGH` |

### SPIKE-07 — PASS

**Question.** Confirm structuredClone exists in Caido's runtime

**Answer.** REGRESSION ASSERTION, not a discovery: structuredClone is `undefined` on Caido 0.57.1, confirming the Phase 0 research finding. The meriyah@7 polyfill guard is therefore mandatory and unconditional, not defensive. WebAssembly is `undefined`, so oxc/swc and mappings.wasm are structurally impossible. 100 globals are actually present against the ~6 the type package declares. TextDecoder is reachable from NO module probed (buffer, string_decoder, url, util) and is not a global. Trivial recursion reaches 1021 frames and fails with a CATCHABLE RangeError. Memory introspection is absent entirely (llrt:qjs, qjs, perf_hooks, process all fail to load), which is what forces external RSS sampling for every memory spike.

**Blocks.** `ENC-01`, `ENC-02`, `CORE-06`

**What changes if this is wrong.** If structuredClone were present, meriyah@7's polyfill guard would be optional and the ingestion path could clone AST fragments directly. If WebAssembly were present, the entire parser selection in Phase 3 reopens — oxc and swc become candidates and the meriyah/acorn decision is moot. TextDecoder is unreachable, but that does NOT force a hand-rolled decoder: string_decoder.StringDecoder and buffer.Buffer are both importable, so ENC-01 and ENC-02 bind to those instead. If a future build were to drop them too, decoding becomes hand-rolled JS and the cost model for every non-identity Content-Encoding in SPIKE-08 changes.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `STRUCTURED_CLONE_PRESENT` | `false` | boolean | `HIGH` |
| `TEXTDECODER_MODULE` | `none` | module | `HIGH` |
| `TRIVIAL_STACK_DEPTH` | `1021` | frames | `HIGH` |
| `WASM_PRESENT` | `false` | boolean | `HIGH` |

### SPIKE-08 — PASS

**Question.** Determine whether proxied bodies are stored decompressed, and whether Body.length equals toRaw().length.

**Answer.** Proxied response bodies reach onInterceptResponse DECOMPRESSED. For gzip, brotli and zstd the plugin's toRaw() digest equals the identity-body digest, and the leading bytes are plain JavaScript rather than a compression container. Identity bodies round-trip byte-for-byte (6/6 digest matches). Body.length equals toRaw().length on 24/24 round trips.

**Blocks.** `CORE-02`, `ENC-01`, `ENC-02`

**What changes if this is wrong.** If the admission filter gates on the wrong length quantity, every size ceiling in DefMiner is wrong by the compression ratio — measured here at 1.0725x to 7.2541x on real minified bundles. Gating on wire bytes when the plugin holds decoded bytes silently admits multi-megabyte artifacts the CPU and RSS budgets were never sized for, so CORE-02 lets through work SPIKE-06's ceilings say is impossible; gating on decoded bytes when the plugin holds wire bytes rejects normal bundles and DefMiner analyses nothing. SPIKE-06's AST_MAX_BYTES and HARD_MAX_BYTES are expressed in this quantity, so the error compounds into Phase 9.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `BODY_LENGTH_EQUALS_RAW_LENGTH` | `true` | bool | `HIGH` |
| `BODY_STORED_DECOMPRESSED` | `true` | bool | `HIGH` |
| `SIZE_GATE_SOURCE` | `Body.length (decompressed identity bytes)` | enum | `HIGH` |

### SPIKE-09 — PASS

**Question.** Verify PRAGMA and BEGIN/COMMIT survive across exec calls on the pooled SQLite connection.

**Answer.** PRAGMA: connection-scoped and file-scoped PRAGMAs both survived (user_version=4242, cache_size=-8000). Transactions: BEGIN does NOT span exec calls. A second BEGIN issued in the very next exec SUCCEEDED, which SQLite permits only when no transaction is active. Consistently, a split BEGIN/INSERT/ROLLBACK left 2 row(s) — the insert had already autocommitted. Note that BEGIN, COMMIT and ROLLBACK all returned SUCCESS throughout: the failure is SILENT, so code that looks transactional would pass every test and provide no atomicity whatsoever. A second consecutive ROLLBACK also succeeded, so more than one transaction was open at once — the statements are landing on different pooled connections. Single exec: A single exec containing BEGIN, three good inserts, a UNIQUE-violating insert and COMMIT left ZERO rows when counted from a FRESH CONNECTION POOL after a plugin restart, so one exec is an atomic unit. Within the original run the same count also read zero (immediate=0, polled=[0, 0, 0, 0, 0]) but that was not proof on its own: the batch's own pooled connection still held an open write transaction, and the very next write failed with SQLITE_BUSY ('Error: error returned from database: (code: 5) database is locked'), so other connections could not have seen uncommitted rows either way. CONNECTION POISONING, and this is the finding with the sharpest edge for Phase 1: the failed batch left an open WRITE transaction on its pooled connection. The next write attempt failed with 'Error: error returned from database: (code: 5) database is locked' and a follow-up read saw 0 row(s). Neither a bare COMMIT (succeeded=False) nor a bare ROLLBACK (succeeded=False) could clear it, because those land on other connections. Nothing in the plugin API can reach the stuck connection, so the database stays locked for writes until the plugin restarts. journal_mode=wal. Plugin database across a genuine uninstall/reinstall: survives force-reinstall only (0 sentinel row(s) after; backend UUID changed).

**Blocks.** `STORE-01`, `STORE-02`, `STORE-05`, `STORE-07`, `UPGRADE-01`, `UPGRADE-04`

**What changes if this is wrong.** If BEGIN/COMMIT do not span exec calls, Phase 1's storage layer has no transaction primitive at all: STORE-01 through STORE-07 must be redesigned around single-statement idempotent upserts, every multi-row invariant has to be expressed as one statement or abandoned, and there is no way to roll back a partially written finding set. If a single multi-statement exec is not atomic either, then no batching strategy is safe and a crash mid-batch leaves the database in a state no migration can distinguish from a completed write. If the plugin database does not survive an uninstall, UPGRADE-01 and UPGRADE-04 cannot rely on it for state that must outlive a version change and an export/import path becomes mandatory rather than optional.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `DB_SURVIVES_REINSTALL` | `survives force-reinstall only` | enum | `HIGH` |
| `MULTISTATEMENT_EXEC_ATOMIC` | `true` | bool | `HIGH` |
| `PRAGMA_PERSISTS_ACROSS_EXEC` | `connection-scoped and file-scoped PRAGMAs both survived` | enum | `HIGH` |
| `TRANSACTION_PERSISTS_ACROSS_EXEC` | `false` | bool | `HIGH` |
| `WAL_ENABLED` | `true` | bool | `HIGH` |

### SPIKE-10 — INCONCLUSIVE

**Question.** Measure the content-hash cache hit rate on real browsing.

**Answer.** Within page load 0.0555, within session 0.6304, over 11393 recorded fetches and 1574 distinct content hashes across 1 calendar day(s). THE CROSS-DAY RATE — the only one that drives the CPU budget, and the only one a single burst can never produce — is UNDEFINED, not zero: CACHE_SAMPLE_DAYS=1 and CACHE_CROSS_DAY_DENOMINATOR=0. CACHE_HIT_RATE_CROSS_DAY is therefore null with status inconclusive and a revisit date of 2026-09-03, and CACHE_HIT_RATE_ASSUMED=0.40 is emitted as an explicit pessimistic default for Phase 1's CORE-08 to budget against.

**Blocks.** `CORE-08`, `STORE-03`, `STORE-04`, `OBS-01`

**What changes if this is wrong.** The ingestion budget is the thing that moves. At a 90% cross-day hit rate only one bundle in ten needs full analysis and the per-bundle CPU cost — SPIKE-06 measured 785.8 ms/MB to parse and 102 bytes of RSS per input byte — is amortised away. At 40% it is six times that, which is the difference between analysing a large SPA inside the 25 ms slice budget and never finishing it. Concretely, if the real rate lands materially below 0.40, CORE-08's cache stops being an optimisation and the admission gate has to shed work instead: Phase 9's degradation ladder becomes the common path rather than the exception, and AST_MAX_BYTES (1,334,405 B) has to come down. If it lands materially above 0.40, the budget has slack and the pessimistic default will simply have made Phase 1 conservative — which is the cheap direction to be wrong in, and why 0.40 rather than the within-session figure is the honest placeholder.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `CACHE_CROSS_DAY_DENOMINATOR` | `0` | content hashes seen on 2+ distinct days | `HIGH` |
| `CACHE_HIT_RATE_ASSUMED` | `0.4` | ratio | `pessimistic-default` |
| `CACHE_HIT_RATE_CROSS_DAY` | `null` | ratio | `LOW` |
| `CACHE_HIT_RATE_WITHIN_PAGE` | `0.0555` | ratio | `HIGH` |
| `CACHE_HIT_RATE_WITHIN_SESSION` | `0.6304` | ratio | `HIGH` |
| `CACHE_SAMPLE_DAYS` | `1` | days | `HIGH` |

### SPIKE-11 — PASS

**Question.** Determine whether 304s and cached responses reach the hook at all — decides whether retroactive scanning is optional or mandatory for correctness.

**Answer.** A browser-cache hit NEVER reaches the plugin, and a 304 does reach it but carries no body. In the cached-fresh scenario Chromium served the resource from its own cache (requestServedFromCache), put nothing on the wire, the origin logged nothing, and the hook did not fire — while the no-store HTML wrapper in the SAME window did fire, proving the hook was alive. In the revalidate scenario the browser revalidated, the origin answered 304, and the hook DID fire with status 304 and Body.length == toRaw().length == 0 and no content-type header at all. Cold load and hard reload both delivered the full 457,965-byte body, so the apparatus was working before and after. On a repeat visit the bundle is therefore invisible to the passive path twice over: when the cache is fresh nothing leaves the browser, and when it revalidates the plugin is handed an empty 304.

**Blocks.** `FIND-03`, `FIND-04`, `CORE-02`, `CORE-08`

**What changes if this is wrong.** If a returning visitor's bundles are invisible to the passive path — and they are — Phase 6 changes in three ways. FIND-03's retroactive scan over the project's already-captured requests stops being a convenience and becomes the only mechanism by which previously-seen bundles get analysed at all; it has to run on plugin start and on project switch, not just on demand. FIND-04 has to resolve a stored 304 back to the 200 that carried the body, keyed on URL plus ETag, or it will index an empty response and record a false negative. And because a fresh cache hit never enters Caido in any form, retroactive scanning alone is still not sufficient: the bundle has to be re-fetched actively — which is the ACTIVE-06 path SPIKE-05 just proved is invisible to the hook, so the re-fetch must feed the analyser DIRECTLY rather than expecting its own traffic to come back around. If the measurement were reversed and cached responses did reach the hook, all three of those become optional and Phase 6 could ship passive-only.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `CACHED_RESPONSES_REACH_HOOK` | `false` | boolean | `HIGH` |
| `RETROACTIVE_SCAN_MANDATORY` | `true` | boolean | `HIGH` |
| `STATUS_304_REACHES_HOOK` | `true` | boolean | `HIGH` |

### SPIKE-12 — PASS

**Question.** Establish llrt/fs containment behaviour.

**Answer.** fs exports 16 top-level names. realpath=False, lstat=True, readlink=False, stat=True, symlink=True. path.resolve discards everything before an absolute segment, so 5 of 22 fixtures resolve outside the scratch root and are caught by a lexical prefix rule: ['relative_traversal', 'absolute_posix', 'absolute_posix_etc', 'null_byte', 'trailing_dots_spaces']. 17 fixtures resolve inside it. Writing through a symlink that the prefix rule accepts DID leave the scratch root, so a purely lexical rule is insufficient on its own. Nothing was written outside the instance data path.

**Blocks.** `MAP-04`, `MAP-05`, `DEPLOY-04`

**What changes if this is wrong.** If MAP-04 adopts a containment rule that this runtime cannot actually enforce, an attacker-controlled sourcemap `sources` entry writes outside DefMiner's output directory on a security tester's own machine — the tool becomes the exploit. Without realpath there is no canonicalisation to fall back on, so a rule that merely looks correct is the whole defence, and a lexical-only rule is defeated by a symlink anywhere in the output tree.

**Thresholds set.**

| Threshold | Value | Unit | Confidence |
| --- | --- | --- | --- |
| `FS_CONTAINMENT_STRATEGY` | `No realpath: canonical-path comparison is impossible, so containment must be built from what does exist. (1) REJECT before resolving: any `sources` entry that path.isAbsolute() accepts, contains a NUL byte, starts with a drive letter or UNC prefix, or carries a protocol-shaped prefix is dropped rather than sanitised. (2) path.resolve(root, entry) then require the result to equal root or to start with root + path.sep — never a bare string prefix test, which would accept a sibling directory whose name merely starts with the root's. (3) lstat IS available, so walk each surviving path component from the root outward and reject any component whose lstat reports a symbolic link. This is the non-lexical half the prefix rule cannot supply, and it is the step that closes the write-through-symlink hole measured here. (4) Flatten the path: write to a single directory keyed by a hash of the `sources` entry with the original recorded as metadata, so neither traversal nor Unicode-normalisation nor case-folding collisions can reach the filesystem at all. Collisions observed here: {"by_resolved_string": {"/etc/defminer-escape.txt": ["relative_traversal", "absolute_posix_etc"], "/tmp/defminer-probe-20260820T131602Z-12190/spike12/scratch": ["empty", "dot_only"]}, "on_disk": [{"fixture": "unicode_nfd", "wrote_to": "spike12/scratch/cafe\u0301/app.js", "landed_on": "spike12/scratch/caf\u00e9/app.js", "kind": "unicode-normalisation and/or case folding by the filesystem"}, {"fixture": "case_upper", "wrote_to": "spike12/scratch/SRCDIR/app.js", "landed_on": "spike12/scratch/srcdir/app.js", "kind": "unicode-normalisation and/or case folding by the filesystem"}], "writes_accepted": 15, "distinct_files_on_disk": 13}.` | enum | `HIGH` |
| `FS_HAS_LSTAT` | `true` | bool | `HIGH` |
| `FS_HAS_REALPATH` | `false` | bool | `HIGH` |

## All thresholds (49)

| Threshold | Value | Unit | Spike | Confidence | Status |
| --- | --- | --- | --- | --- | --- |
| `AST_MAX_BYTES` | `1334405` | bytes | `SPIKE-06` | `HIGH` | `resolved` |
| `BODY_LENGTH_EQUALS_RAW_LENGTH` | `true` | bool | `SPIKE-08` | `HIGH` | `resolved` |
| `BODY_STORED_DECOMPRESSED` | `true` | bool | `SPIKE-08` | `HIGH` | `resolved` |
| `CACHED_RESPONSES_REACH_HOOK` | `false` | boolean | `SPIKE-11` | `HIGH` | `resolved` |
| `CACHE_CROSS_DAY_DENOMINATOR` | `0` | content hashes seen on 2+ distinct days | `SPIKE-10` | `HIGH` | `resolved` |
| `CACHE_HIT_RATE_ASSUMED` | `0.4` | ratio | `SPIKE-10` | `pessimistic-default` | `resolved` |
| `CACHE_HIT_RATE_CROSS_DAY` | `null` | ratio | `SPIKE-10` | `LOW` | `inconclusive` |
| `CACHE_HIT_RATE_WITHIN_PAGE` | `0.0555` | ratio | `SPIKE-10` | `HIGH` | `resolved` |
| `CACHE_HIT_RATE_WITHIN_SESSION` | `0.6304` | ratio | `SPIKE-10` | `HIGH` | `resolved` |
| `CACHE_SAMPLE_DAYS` | `1` | days | `SPIKE-10` | `HIGH` | `resolved` |
| `DB_SURVIVES_REINSTALL` | `survives force-reinstall only` | enum | `SPIKE-09` | `HIGH` | `resolved` |
| `EVENTS_DELIVERED_UNDER_BLOCK` | `500` | events | `SPIKE-03` | `HIGH` | `resolved` |
| `EVENT_OVERFLOW_BEHAVIOUR` | `queue` | enum(queue\|drop\|backpressure) | `SPIKE-03` | `HIGH` | `resolved` |
| `FS_CONTAINMENT_STRATEGY` | `No realpath: canonical-path comparison is impossible, so containment must be built from what does exist. (1) REJECT before resolving: any `sources` entry that path.isAbsolute() accepts, contains a NUL byte, starts with a drive letter or UNC prefix, or carries a protocol-shaped prefix is dropped rather than sanitised. (2) path.resolve(root, entry) then require the result to equal root or to start with root + path.sep — never a bare string prefix test, which would accept a sibling directory whose name merely starts with the root's. (3) lstat IS available, so walk each surviving path component from the root outward and reject any component whose lstat reports a symbolic link. This is the non-lexical half the prefix rule cannot supply, and it is the step that closes the write-through-symlink hole measured here. (4) Flatten the path: write to a single directory keyed by a hash of the `sources` entry with the original recorded as metadata, so neither traversal nor Unicode-normalisation nor case-folding collisions can reach the filesystem at all. Collisions observed here: {"by_resolved_string": {"/etc/defminer-escape.txt": ["relative_traversal", "absolute_posix_etc"], "/tmp/defminer-probe-20260820T131602Z-12190/spike12/scratch": ["empty", "dot_only"]}, "on_disk": [{"fixture": "unicode_nfd", "wrote_to": "spike12/scratch/cafe\u0301/app.js", "landed_on": "spike12/scratch/caf\u00e9/app.js", "kind": "unicode-normalisation and/or case folding by the filesystem"}, {"fixture": "case_upper", "wrote_to": "spike12/scratch/SRCDIR/app.js", "landed_on": "spike12/scratch/srcdir/app.js", "kind": "unicode-normalisation and/or case folding by the filesystem"}], "writes_accepted": 15, "distinct_files_on_disk": 13}.` | enum | `SPIKE-12` | `HIGH` | `resolved` |
| `FS_HAS_LSTAT` | `true` | bool | `SPIKE-12` | `HIGH` | `resolved` |
| `FS_HAS_REALPATH` | `false` | bool | `SPIKE-12` | `HIGH` | `resolved` |
| `HANDLER_ERROR_SURFACED` | `neither` | enum(both\|sync\|async\|neither\|partial) | `SPIKE-03` | `HIGH` | `resolved` |
| `HARD_MAX_BYTES` | `274736748` | bytes | `SPIKE-06` | `HIGH` | `resolved` |
| `MAX_NESTING_DEPTH` | `246` | levels | `SPIKE-06` | `HIGH` | `resolved` |
| `MAX_SYNC_SLICE_MS` | `25` | ms | `SPIKE-02` | `HIGH` | `resolved` |
| `MULTISTATEMENT_EXEC_ATOMIC` | `true` | bool | `SPIKE-09` | `HIGH` | `resolved` |
| `PARSE_MS_PER_MB` | `785.8` | ms/MB | `SPIKE-06` | `HIGH` | `resolved` |
| `PLUGINS_FALSE_SUPPRESSES_INTERCEPT` | `no-effect` | boolean-or-no-effect | `SPIKE-05` | `HIGH` | `resolved` |
| `PLUGIN_TOGGLE_RESETS_LEAK` | `runtime-recreated-no-leak-observed` | enum(true\|false\|runtime-recreated-no-leak-observed) | `SPIKE-04b` | `MEDIUM` | `resolved` |
| `PRAGMA_PERSISTS_ACROSS_EXEC` | `connection-scoped and file-scoped PRAGMAs both survived` | enum | `SPIKE-09` | `HIGH` | `resolved` |
| `RE2JS_THROUGHPUT_RATIO` | `59.711` | x (re2js elapsed / native elapsed; >1 = re2js slower) | `SPIKE-01` | `HIGH` | `resolved` |
| `RE2JS_VERDICT` | `adopt-generic` | enum(adopt-all\|adopt-generic\|reject) | `SPIKE-01` | `HIGH` | `resolved` |
| `REDOS_INTERRUPTIBLE` | `false` | boolean | `SPIKE-01` | `HIGH` | `resolved` |
| `REDOS_RECOVERY` | `kill` | enum(none\|throw\|kill) | `SPIKE-01` | `HIGH` | `resolved` |
| `RETROACTIVE_SCAN_MANDATORY` | `true` | boolean | `SPIKE-11` | `HIGH` | `resolved` |
| `RSS_BYTES_PER_INPUT_BYTE` | `102.112` | ratio | `SPIKE-06` | `MEDIUM` | `resolved` |
| `SAVE_FALSE_SUPPRESSES_INTERCEPT` | `no-effect` | boolean-or-no-effect | `SPIKE-05` | `HIGH` | `resolved` |
| `SEND_CLIFF_FETCH` | `2000` | sends completed with no failure (FLOOR — the cap, not a cliff) | `SPIKE-04` | `MEDIUM` | `resolved` |
| `SEND_CLIFF_SAVE_FALSE` | `2000` | sends completed with no failure (FLOOR — the cap, not a cliff) | `SPIKE-04` | `MEDIUM` | `resolved` |
| `SEND_CLIFF_SAVE_TRUE` | `2000` | sends completed with no failure (FLOOR — the cap, not a cliff) | `SPIKE-04` | `MEDIUM` | `resolved` |
| `SEND_FAILURE_MODE` | `clean` | enum(clean\|stall\|abort) | `SPIKE-04` | `HIGH` | `resolved` |
| `SEND_REFIRES_INTERCEPT` | `false` | boolean | `SPIKE-05` | `HIGH` | `resolved` |
| `SIZE_GATE_SOURCE` | `Body.length (decompressed identity bytes)` | enum | `SPIKE-08` | `HIGH` | `resolved` |
| `STACK_FAILURE_MODE` | `catchable-throw` | enum | `SPIKE-06` | `HIGH` | `resolved` |
| `STATUS_304_REACHES_HOOK` | `true` | boolean | `SPIKE-11` | `HIGH` | `resolved` |
| `STRUCTURED_CLONE_PRESENT` | `false` | boolean | `SPIKE-07` | `HIGH` | `resolved` |
| `SURFACES_FIRING_INTERCEPT` | `proxy` | surface-list | `SPIKE-05` | `HIGH` | `resolved` |
| `TEXTDECODER_MODULE` | `none` | module | `SPIKE-07` | `HIGH` | `resolved` |
| `TRANSACTION_PERSISTS_ACROSS_EXEC` | `false` | bool | `SPIKE-09` | `HIGH` | `resolved` |
| `TRIVIAL_STACK_DEPTH` | `1021` | frames | `SPIKE-07` | `HIGH` | `resolved` |
| `WAL_ENABLED` | `true` | bool | `SPIKE-09` | `HIGH` | `resolved` |
| `WASM_PRESENT` | `false` | boolean | `SPIKE-07` | `HIGH` | `resolved` |
| `YIELD_COST_MS` | `5.029` | ms | `SPIKE-02` | `HIGH` | `resolved` |
| `YIELD_PRIMITIVE` | `setTimeout0` | enum | `SPIKE-02` | `HIGH` | `resolved` |

### Rationales

Why each value is what it is. A threshold nobody can re-derive is a number nobody should trust.

- **`AST_MAX_BYTES`** = `1334405` — Expressed in DECOMPRESSED identity bytes, the quantity SPIKE-08's SIZE_GATE_SOURCE named. Two constraints, minimum taken. (1) STALL: a meriyah parse is synchronous and cannot be chunked, and SPIKE-02 measured that only setTimeout(fn,0) yields at all — so the whole parse starves the proxy hook, the plugin RPC and every timer. At the measured 785.8 ms/MB, a 1000 ms single-block budget allows 1334405 bytes. (2) RSS: at the measured 102.1 bytes of RSS per input byte, a 256 MB per-parse budget allows 2628838 bytes — and that memory is taken inside caido-cli, the process holding the user's real proxy and project data. (3) MARGIN: HARD_MAX_BYTES / 8 = 34342093 bytes. The BINDING constraint is `stall`. Both budgets are POLICY inputs, not measurements; Phase 9 can re-derive this number against different ones using the ms/MB and bytes/byte figures recorded here. For scale, the largest real single artifacts found were Cesium at 4.90 MB and Plotly at 4.35 MB — BOTH far above this ceiling, so the degradation path is not an edge case, it is the common case for large bundles.
- **`BODY_LENGTH_EQUALS_RAW_LENGTH`** = `true` — Body.length compared against toRaw().length on every one of 24 proxied round trips across four encodings and three fixtures.
- **`BODY_STORED_DECOMPRESSED`** = `true` — Decided by SHA-256 of toRaw() against the fixture's known identity digest for gzip, br and zstd on a small and a large artifact. Per-encoding classification: {"gzip": ["decoded"], "br": ["decoded"], "zstd": ["decoded"]}.
- **`CACHED_RESPONSES_REACH_HOOK`** = `false` — cached-fresh: browser_issued_request=false, requestServedFromCache=1, origin_requests=0, hook_fired=False, while page_hook_fired=True in the same window. Nothing left the browser, so the proxy never saw it and no behaviour of Caido's could have delivered it.
- **`CACHE_CROSS_DAY_DENOMINATOR`** = `0` — of 1574 distinct content hashes recorded, 0 were seen on two or more distinct calendar days. Emitted as a threshold in its own right so the difference between 'too few days' and 'enough days but nothing recurred' survives into the aggregate instead of having to be re-derived from the raw log.
- **`CACHE_HIT_RATE_ASSUMED`** = `0.4` — Phase 1's CORE-08 cache design must budget for the WORST CASE until the real number lands. 0.40 is the low end of the range the project brief treats as plausible, where CPU cost is roughly six times what a 90% hit rate would imply. This is not a measurement and must never be cited as one: it is a deliberate placeholder that keeps Phase 1 unblocked without letting it build on a figure nobody observed. Replace it with CACHE_HIT_RATE_CROSS_DAY as soon as two or more days with a non-zero denominator exist. _Revisit after 2026-09-03._
- **`CACHE_HIT_RATE_CROSS_DAY`** = `null` — UNDEFINED, not zero. The cause is fewer than two distinct days sampled: CACHE_SAMPLE_DAYS=1 and CACHE_CROSS_DAY_DENOMINATOR=0. Follow-up implied: keep collecting — the recorder needs to span more calendar days. Reporting 0.0 here would assert that caching measurably never works, and reporting the within-session rate (0.6304) under this name would assert a number nobody measured — both mis-size Phase 1's CPU budget by the exact 90%-against-40% factor this spike exists to prevent, silently, across eleven downstream phases. _Revisit after 2026-09-03._
- **`CACHE_HIT_RATE_WITHIN_PAGE`** = `0.0555` — 632 duplicate-hash deliveries in 11393 recorded fetches within a 2 s window, from real proxied browsing.
- **`CACHE_HIT_RATE_WITHIN_SESSION`** = `0.6304` — 7182 repeats across 3 sessions split on a 30-minute inactivity gap. Answers 'what does a warm tab save', which is a different question from the one that sizes the CPU budget.
- **`CACHE_SAMPLE_DAYS`** = `1` — distinct calendar days on which the recorder observed traffic: 2026-08-20. The confidence of the cross-day rate is DERIVED from this number rather than asserted.
- **`DB_SURVIVES_REINSTALL`** = `survives force-reinstall only` — A sentinel row was written, then read back after a force:true reinstall (1 row(s)) and again after an outright uninstallPluginPackage followed by a fresh install (0 row(s), table_exists=False). Backend UUID a49bbf32-03af-4d3a-9cbf-b18185b366dd -> 00b7d6c9-b930-42de-8c16-19ec3732ab49.
- **`EVENTS_DELIVERED_UNDER_BLOCK`** = `500` — 500 issued, 500 returned 200 to the client, 500 delivered to a handler that was blocked for 30000 ms. The idle baseline on the same instance also delivered 500 of 500, so the blocked run lost nothing relative to it.
- **`EVENT_OVERFLOW_BEHAVIOUR`** = `queue` — Queue signature met on all three tests. Delivered 500 of 500 responses with a contiguous sequence range (True); 1 arrived during the block and 499 in a 20 ms burst after it; and client latency did not inflate (blocked p95 73.32 ms vs baseline 49.26 ms, blocked max 457.49 ms vs baseline 581.09 ms — against a 30,000 ms block, so backpressure would have been unmissable). The probe's own row cap was never reached and its dropped counter stayed at 0, so nothing was lost on the plugin side either.
- **`FS_CONTAINMENT_STRATEGY`** = `No realpath: canonical-path comparison is impossible, so containment must be built from what does exist. (1) REJECT before resolving: any `sources` entry that path.isAbsolute() accepts, contains a NUL byte, starts with a drive letter or UNC prefix, or carries a protocol-shaped prefix is dropped rather than sanitised. (2) path.resolve(root, entry) then require the result to equal root or to start with root + path.sep — never a bare string prefix test, which would accept a sibling directory whose name merely starts with the root's. (3) lstat IS available, so walk each surviving path component from the root outward and reject any component whose lstat reports a symbolic link. This is the non-lexical half the prefix rule cannot supply, and it is the step that closes the write-through-symlink hole measured here. (4) Flatten the path: write to a single directory keyed by a hash of the `sources` entry with the original recorded as metadata, so neither traversal nor Unicode-normalisation nor case-folding collisions can reach the filesystem at all. Collisions observed here: {"by_resolved_string": {"/etc/defminer-escape.txt": ["relative_traversal", "absolute_posix_etc"], "/tmp/defminer-probe-20260820T131602Z-12190/spike12/scratch": ["empty", "dot_only"]}, "on_disk": [{"fixture": "unicode_nfd", "wrote_to": "spike12/scratch/cafe\u0301/app.js", "landed_on": "spike12/scratch/caf\u00e9/app.js", "kind": "unicode-normalisation and/or case folding by the filesystem"}, {"fixture": "case_upper", "wrote_to": "spike12/scratch/SRCDIR/app.js", "landed_on": "spike12/scratch/srcdir/app.js", "kind": "unicode-normalisation and/or case folding by the filesystem"}], "writes_accepted": 15, "distinct_files_on_disk": 13}.` — Derived from the enumerated surface and the measured behaviour of 22 hostile fixtures. Fixtures escaping via resolve: ['relative_traversal', 'absolute_posix', 'absolute_posix_etc', 'null_byte', 'trailing_dots_spaces']. Resolved-path collisions between distinct fixtures: {"by_resolved_string": {"/etc/defminer-escape.txt": ["relative_traversal", "absolute_posix_etc"], "/tmp/defminer-probe-20260820T131602Z-12190/spike12/scratch": ["empty", "dot_only"]}, "on_disk": [{"fixture": "unicode_nfd", "wrote_to": "spike12/scratch/cafe\u0301/app.js", "landed_on": "spike12/scratch/caf\u00e9/app.js", "kind": "unicode-normalisation and/or case folding by the filesystem"}, {"fixture": "case_upper", "wrote_to": "spike12/scratch/SRCDIR/app.js", "landed_on": "spike12/scratch/srcdir/app.js", "kind": "unicode-normalisation and/or case folding by the filesystem"}], "writes_accepted": 15, "distinct_files_on_disk": 13}. Symlink write-through escaped the scratch root: True.
- **`FS_HAS_LSTAT`** = `true` — Enumerated, and exercised: lstat on a real symlink reported {"available": true, "is_symlink": true, "is_directory": false, "keys": []} while stat on the same path reported {"available": true, "is_directory": true, "is_symlink": false}.
- **`FS_HAS_REALPATH`** = `false` — Enumerated from the live module rather than from the type package: fs exports ["accessSync", "chmodSync", "constants", "default", "lstatSync", "mkdirSync", "mkdtempSync", "promises", "readFileSync", "readdirSync", "renameSync", "rmSync", "rmdirSync", "statSync", "symlinkSync", "writeFileSync"].
- **`HANDLER_ERROR_SURFACED`** = `neither` — Neither. The probe logged MARK THROW_SYNC_ABOUT_TO_THROW and MARK REJECT_ASYNC_RETURNING_REJECTION immediately before each injection, so both handlers demonstrably ran; the unique error text 'defminer-spike-03' then appears 0 times in the host log, 0 in stdout and 0 in stderr — 0 attributable to the throw and 0 to the rejection. The plugin kept receiving events afterwards (5 and 5 in the follow-up batches), so the handler was not torn down — the error simply vanished.
- **`HARD_MAX_BYTES`** = `274736748` — Located by ESCALATION AND BISECTION on fresh instances, not by extrapolating the RSS curve. Largest input that parsed: 274736748 bytes. Smallest that failed: 541148140 bytes, as ['timeout']. Resolution is one repetition of the 8.33 MB composite fixture, because the escalation input is built from whole repetitions — a JavaScript file cannot be truncated to an arbitrary byte count and still parse. CEILING KIND: time-bound. The escalation was stopped by the 900s call budget, NOT by the runtime running out of memory: every failure classified as `timeout` with the host still alive. So this figure is the largest input observed to parse to completion within that budget, and it is TIME-bound. No memory ceiling was reached below it — which is itself the finding: this runtime degrades into unusable parse times long before it exhausts memory, so the binding constraint for Phase 3 and Phase 9 is the synchronous stall captured in AST_MAX_BYTES, not a heap limit. Boundary record: {"last_good_mb": 256, "first_bad_mb": 512, "last_good_bytes": 274736748, "first_bad_bytes": 541148140, "bisected": false, "why_not_bisected": "The escalation never reached a MEMORY ceiling. Every size from 8 MB to 274 MB parsed to completion; the 541 MB step was cut off by the 900 s call budget with the host still alive, no QuickJS assertion on stderr, and MARK_START parse recorded in the host log with no matching MARK_END. Bisecting that boundary would have measured the call-timeout constant rather than any property of the runtime, and each additional step drove the host into swap (free pages fell to 3,587 of 16 KB each, i.e. ~57 MB) \u2014 pressure that is host-wide and therefore NOT confined to the disposable instance the way threat T-00-22 assumed. The escalation bracket is reported as-is and HARD_MAX_BYTES is labelled time-bound.", "evidence_run_id_last_good": "20260820T140404Z-7023", "evidence_run_id_first_bad": "20260820T141108Z-3997"}.
- **`MAX_NESTING_DEPTH`** = `246` — Measured with the REAL parser, not synthetic recursion, and bisected to within 2 levels on a fresh instance per depth. Taken as the MINIMUM across two shapes because they are not interchangeable: {"brackets": {"last_good": 710, "first_bad": 718}, "parens": {"last_good": 246, "first_bad": 250}}. A parenthesised expression recurses through the primary-expression path and consumes materially more stack per level than an array literal, so the bracket figure alone would have been almost 3x too optimistic. For scale, SPIKE-07 measured 1,021 frames for a trivial one-argument function — a real parser frame is far heavier.
- **`MAX_SYNC_SLICE_MS`** = `25` — Derived from the real-geometry comparison, not projection: per-chunk yielding cost 330.7% overhead over 137 yields versus 21.2% over 5 yields at a 25 ms temporal budget on the same input.
- **`MULTISTATEMENT_EXEC_ATOMIC`** = `true` — A single exec containing BEGIN, three good inserts, a UNIQUE-violating insert and COMMIT left ZERO rows when counted from a FRESH CONNECTION POOL after a plugin restart, so one exec is an atomic unit. Within the original run the same count also read zero (immediate=0, polled=[0, 0, 0, 0, 0]) but that was not proof on its own: the batch's own pooled connection still held an open write transaction, and the very next write failed with SQLITE_BUSY ('Error: error returned from database: (code: 5) database is locked'), so other connections could not have seen uncommitted rows either way. CONNECTION POISONING, and this is the finding with the sharpest edge for Phase 1: the failed batch left an open WRITE transaction on its pooled connection. The next write attempt failed with 'Error: error returned from database: (code: 5) database is locked' and a follow-up read saw 0 row(s). Neither a bare COMMIT (succeeded=False) nor a bare ROLLBACK (succeeded=False) could clear it, because those land on other connections. Nothing in the plugin API can reach the stuck connection, so the database stays locked for writes until the plugin restarts.
- **`PARSE_MS_PER_MB`** = `785.8` — Least-squares slope over four size points on four fresh instances (per-point [629.7, 751.5, 551.2, 773.3] ms/MB, intercept -220.9 ms). meriyah with ranges:true, which is the configuration DefMiner must use because it reports findings at byte offsets.
- **`PLUGINS_FALSE_SUPPRESSES_INTERCEPT`** = `no-effect` — Same reasoning as save:false. RequestSendOptions.plugins governs the UPSTREAM plugin chain, which is a different mechanism from the intercept hook; with the hook not firing at plugins:true there is nothing for plugins:false to turn off.
- **`PLUGIN_TOGGLE_RESETS_LEAK`** = `runtime-recreated-no-leak-observed` — the toggle DOES tear down and re-create the QuickJS runtime — three distinct module instantiations across three legs, with the probe's per-runtime send counter back at 0 each time and the plugin database intact throughout — so the mechanism by which a toggle would discard per-runtime accumulated state is confirmed. What could not be confirmed is the reset of #2211's leak specifically, because that leak never became observable: neither the disciplined shape nor the retain-shape control failed inside the cap. Measured on a fresh instance (20260820T163916Z-20863, 127.0.0.1:8983) across 3 legs of up to 2000 sends with togglePlugin off and on between them, repeated twice so a one-off is distinguishable from a real reset. Distinct runtime session ids observed: 3. Per-runtime send counter reset to 0 at every leg start: True. Plugin database carried 6000 rows across 3 sessions, so the journal survives the toggle. Host exit code 137. Unmitigated-shape control on its own fresh instance: clean at 2000 sends.
- **`PRAGMA_PERSISTS_ACROSS_EXEC`** = `connection-scoped and file-scoped PRAGMAs both survived` — user_version read back as 4242 (expected 4242) and cache_size as -8000 (expected -8000) from execs separate from the ones that set them. user_version is stored in the database header and survives a connection switch regardless; cache_size is per-connection and only survives if the pool reused the connection, so the pair separates persistence from luck.
- **`RE2JS_THROUGHPUT_RATIO`** = `59.711` — 13 provider- and generic-shaped rules over 2958663 bytes of the real corpus, both engines counting every match and agreeing on every count. The aggregate hides a bimodal split: 19.625x on provider-shaped rules and 91.059x on generic-shaped ones, with re2js FASTER than native on 7 of 13 rules.
- **`RE2JS_VERDICT`** = `adopt-generic` — adopt-all is refused by the data: at 59.711x aggregate, a whole-body scan of an AST_MAX_BYTES (1,334,405 B) bundle would cost roughly 21.3 s against a 1,000 ms single-block stall budget. reject is equally refused: re2js compiled every rule in the set, was faster than native on 7 of them, and is flat where native is exponential. So it is adopted for the rule class that can backtrack catastrophically, run inside DET-06's bounded windows rather than across whole bodies, with native RegExp keeping the whole-body prefilter pass.
- **`REDOS_INTERRUPTIBLE`** = `false` — n=40 was fired on a dedicated instance and the call had not returned 660.0 s later. Across 2433 lines of stdout, stderr and the structured host log over all three stages there were 0 interrupt signals and 0 timeout signals. Caido installs no QuickJS interrupt handler, so lre_check_timeout is inert and the engine's own timeout mechanism cannot fire. Measured, not inferred.
- **`REDOS_RECOVERY`** = `kill` — togglePlugin(enabled:false) never came back (curl rc=28 after 90036.3 ms; rc 28 is a client-side timeout, and the host log shows `Stopping plugin` accepted and never completed). installPluginPackage(force:true) — the operation devtools hot reload performs — DID return, in 25.4 ms, but with package=null and error=OtherUserError: it failed rather than recovering, and no plugin answered afterwards. So neither lifecycle operation is a recovery path, and they fail in two different ways that both look survivable from outside. SIGKILL was the only teardown that worked; the instance exited 137 (137 == our own SIGKILL).
- **`RETROACTIVE_SCAN_MANDATORY`** = `true` — Decided by the `cached-fresh` scenario. A returning visitor's bundle is left unanalysed on BOTH realistic repeat-visit paths: a fresh cache hit never leaves the browser (so the bundle is not merely missed by the hook — it does not enter Caido at all), and a revalidation delivers a 304 whose body is zero bytes. Passive-only analysis therefore has a permanent blind spot on exactly the traffic an operator generates most. Note the scope this sets for FIND-03: retroactively scanning the project's STORED requests recovers a bundle only if it was captured with a body at some earlier point. It cannot recover one that was only ever served from the browser cache, which is why FIND-04's cache-busting or active re-fetch is the complement rather than the alternative.
- **`RSS_BYTES_PER_INPUT_BYTE`** = `102.112` — Median RSS STEP for the parse operation divided by input bytes, sampled externally at 50 ms — the only memory measurement available, since this runtime exposes no introspection at all. Least-squares SLOPE over every point below 52428800 bytes, which separates fixed parser overhead (intercept 1322011 bytes) from the marginal cost per input byte. Larger points are EXCLUDED because their ratios fall monotonically as inputs grow ([77.0, 56.0, 40.9]), which a linear allocator cannot do — the host had exhausted physical memory and was evicting, so RSS stopped tracking demand. Ladder median for comparison: 97.34. Evidence: {"fit_points": [[457965, 42991616, 93.9], [1469843, 148160512, 100.8], [2983904, 204488704, 68.5], [8325353, 867303424, 104.2], [16650712, 1772797952, 106.5], [24976068, 2669133824, 106.9], [41626780, 4157210624, 99.9]], "excluded_swap_depressed": [[74928204, 5769773056, 77.0], [141531052, 7932805120, 56.0], [274736748, 11237179392, 40.9]], "slope_bytes_per_byte": 102.11, "intercept_bytes": 1322011, "ladder_median_ratio": 97.34}. MEDIUM rather than HIGH because RSS is a high-water mark that never falls and no gc() exists to settle it before a reading, so a step is an upper bound on what the operation itself retained.
- **`SAVE_FALSE_SUPPRESSES_INTERCEPT`** = `no-effect` — save:false cannot suppress an event that does not happen with save:true. Encoded as the measured negative "no-effect" rather than null: null in this schema means UNMEASURED, and this was measured. save:false does have one measured consequence — the returned request and response ids are both 0 ({"save=True,plugins=True": false, "save=True,plugins=False": false, "save=False,plugins=True": true, "save=False,plugins=False": true}), so the plugin holds no handle it can resolve later, which is the fact ACTIVE-12 depends on.
- **`SEND_CLIFF_FETCH`** = `2000` — 2000 sends on a fresh instance (20260820T163755Z-29196, 127.0.0.1:8981) dedicated to this variant, issued in batches of ten against a local origin. Failure mode clean: reached the 2000 cap with every send completing. Host exit code 137 (137 == our own SIGKILL teardown); 0 abort-assertion lines across separately captured stdout, stderr and host log. Latency drift last-10/first-10 = 0.801x, so there is no accumulation signal either. caido/caido#2211 reports ~54 clean / ~80 stall / ~120 abort against this exact build; none of that reproduced here. This is a FLOOR: treat it as 'at least this many', never as a cliff.
- **`SEND_CLIFF_SAVE_FALSE`** = `2000` — 2000 sends on a fresh instance (20260820T163724Z-7562, 127.0.0.1:8985) dedicated to this variant, issued in batches of ten against a local origin. Failure mode clean: reached the 2000 cap with every send completing. Host exit code 137 (137 == our own SIGKILL teardown); 0 abort-assertion lines across separately captured stdout, stderr and host log. Latency drift last-10/first-10 = 0.585x, so there is no accumulation signal either. caido/caido#2211 reports ~54 clean / ~80 stall / ~120 abort against this exact build; none of that reproduced here. This is a FLOOR: treat it as 'at least this many', never as a cliff.
- **`SEND_CLIFF_SAVE_TRUE`** = `2000` — 2000 sends on a fresh instance (20260820T163653Z-19546, 127.0.0.1:8984) dedicated to this variant, issued in batches of ten against a local origin. Failure mode clean: reached the 2000 cap with every send completing. Host exit code 137 (137 == our own SIGKILL teardown); 0 abort-assertion lines across separately captured stdout, stderr and host log. Latency drift last-10/first-10 = 0.617x, so there is no accumulation signal either. caido/caido#2211 reports ~54 clean / ~80 stall / ~120 abort against this exact build; none of that reproduced here. This is a FLOOR: treat it as 'at least this many', never as a cliff.
- **`SEND_FAILURE_MODE`** = `clean` — Per variant: save-true=clean(exit 137), save-false=clean(exit 137), fetch=clean(exit 137). The three are distinguished because the issue distinguishes them and they imply different mitigations: a clean completion needs none, a stall needs a latency-triggered kill switch (ACTIVE-14), and an abort needs crash recovery (ACTIVE-13) because the host is gone with no unwind. Variants save-true, save-false, fetch reached the 2000-send cap without failing, so those figures are FLOORS — the cliff is somewhere above the cap, not at it. Reading them as cliffs would be the same category error as reading an undefined rate as zero.
- **`SEND_REFIRES_INTERCEPT`** = `false` — sdk.requests.send() with the documented defaults (save:true, plugins:true) reached the origin and returned 200 with a 457,965-byte body, and the hook did not fire. The origin log confirms the request was really made, so this is a delivery decision by Caido and not a send that silently failed.
- **`SIZE_GATE_SOURCE`** = `Body.length (decompressed identity bytes)` — Every compressed variant arrived at the plugin as the DECODED byte string: the toRaw() digest equals the identity digest for gzip, br and zstd on both size points. Observed compression ratios on this corpus ran 1.0725x to 7.2541x, so a ceiling written against the wire byte count would admit up to 7.2541x more bytes than intended.
- **`STACK_FAILURE_MODE`** = `catchable-throw` — Across 18 depth probes the host process survived every one and every failure surfaced as a catchable RangeError ('Maximum call stack size exceeded'). Observed classes: ['catchable-stack-throw']. Process deaths: none. A C-level abort under `panic = "abort"` would never reach the structured log, so this was checked from the exit code and stderr of each instance, not from the log. STDERR SCAN across all 29 captures: 0 abort signatures found (none). The only other content observed was ['Error reading the log directory/files: No such file or directory (os error 2)'], a benign startup race on the log directory present on successful runs too. Every instance was killed by our own SIGKILL (exit 137), never 134.
- **`STATUS_304_REACHES_HOOK`** = `true` — revalidate-304: on-the-wire status [304], hook delivered status 304 with Body.length=0 and toRaw().length=0. The delivered headers carry etag, last-modified, cache-control and content-length: 0 — and NO content-type at all, so any admission gate keyed on content-type will classify a 304 as non-script. That matters to CORE-02 independently of the caching question.
- **`STRUCTURED_CLONE_PRESENT`** = `false` — typeof structuredClone === 'undefined' on 0.57.1.
- **`SURFACES_FIRING_INTERCEPT`** = `proxy` — Surfaces measured: automate, caido-http-fetch, import, plugin-send, proxy, replay, workflow. Only the proxy fired, and Caido labelled its requests source=INTERCEPT. Every other surface produced traffic that the origin logged and the plugin never saw.
- **`TEXTDECODER_MODULE`** = `none` — Resolved by enumerating every export of buffer, string_decoder, url and util. NO probed module exports TextDecoder and it is not a global. Decoding is still reachable via string_decoder.StringDecoder, buffer.Buffer (toString/from), globalThis.Buffer.
- **`TRANSACTION_PERSISTS_ACROSS_EXEC`** = `false` — BEGIN does NOT span exec calls. A second BEGIN issued in the very next exec SUCCEEDED, which SQLite permits only when no transaction is active. Consistently, a split BEGIN/INSERT/ROLLBACK left 2 row(s) — the insert had already autocommitted. Note that BEGIN, COMMIT and ROLLBACK all returned SUCCESS throughout: the failure is SILENT, so code that looks transactional would pass every test and provide no atomicity whatsoever. A second consecutive ROLLBACK also succeeded, so more than one transaction was open at once — the statements are landing on different pooled connections.
- **`TRIVIAL_STACK_DEPTH`** = `1021` — Upper bound from a 1-argument frame; SPIKE-06 measures the effective depth with a real parser frame.
- **`WAL_ENABLED`** = `true` — PRAGMA journal_mode read back as 'wal'.
- **`WASM_PRESENT`** = `false` — typeof WebAssembly === 'undefined'. Rules out every wasm-based parser.
- **`YIELD_COST_MS`** = `5.029` — Median over 48 samples; p95 6.04 ms. Dominated by the ~5.0 ms setTimeout clamp.
- **`YIELD_PRIMITIVE`** = `setTimeout0` — Only primitive with a non-zero timer service ratio over a fixed wall-clock window; the other two scored 0.00, equal to the fully blocking baseline.

## Unresolved (1)

A measurement that could not be taken is honest output. Each entry below carries the date by which it must be taken.

### `CACHE_HIT_RATE_CROSS_DAY`

**Revisit after.** `2026-09-03`

UNDEFINED, not zero. The cause is fewer than two distinct days sampled: CACHE_SAMPLE_DAYS=1 and CACHE_CROSS_DAY_DENOMINATOR=0. Follow-up implied: keep collecting — the recorder needs to span more calendar days. Reporting 0.0 here would assert that caching measurably never works, and reporting the within-session rate (0.6304) under this name would assert a number nobody measured — both mis-size Phase 1's CPU budget by the exact 90%-against-40% factor this spike exists to prevent, silently, across eleven downstream phases.


## Source runs

Every gate traces to the disposable instances that produced it. Distinct run ids within a spike are what prove no two measurements shared a runtime.

| Spike | Instances | Run ids |
| --- | --- | --- |
| `SPIKE-01` | 3 | `20260820T153757Z-11877`, `20260820T154036Z-6118`, `20260820T153836Z-32643` |
| `SPIKE-02` | 1 | `20260820T121826Z-16681` |
| `SPIKE-03` | 1 | `20260820T151340Z-2765` |
| `SPIKE-04` | 3 | `20260820T163653Z-19546`, `20260820T163724Z-7562`, `20260820T163755Z-29196` |
| `SPIKE-04b` | 2 | `20260820T163916Z-20863`, `20260820T163825Z-24994` |
| `SPIKE-05` | 1 | `20260820T150258Z-3149` |
| `SPIKE-06` | 29 | `20260820T140136Z-14235`, `20260820T135940Z-21623`, `20260820T140404Z-7023`, `20260820T140001Z-18646`, `20260820T141108Z-3997`, `20260820T140035Z-32018`, `20260820T135926Z-15772`, `20260820T135658Z-32722`, `20260820T135705Z-30197`, `20260820T135711Z-28432`, `20260820T135701Z-18773`, `20260820T135844Z-20528`, `20260820T135847Z-22619`, `20260820T135846Z-9380`, `20260820T135851Z-6953`, `20260820T135852Z-13380`, `20260820T135856Z-25739`, `20260820T135857Z-14088`, `20260820T135854Z-416`, `20260820T135849Z-8583`, `20260820T135859Z-30866`, `20260820T135904Z-4632`, `20260820T135907Z-25886`, `20260820T135909Z-1629`, `20260820T135910Z-24757`, `20260820T135912Z-6231`, `20260820T135905Z-30669`, `20260820T135902Z-31533`, `20260820T135900Z-32590` |
| `SPIKE-07` | 1 | `20260820T121824Z-31596` |
| `SPIKE-08` | 1 | `20260820T125859Z-16142` |
| `SPIKE-09` | 1 | `20260820T131547Z-10406` |
| `SPIKE-10` | 1 | `recorder-20260820T122300Z` |
| `SPIKE-11` | 1 | `20260820T150935Z-23976` |
| `SPIKE-12` | 1 | `20260820T131602Z-12190` |
