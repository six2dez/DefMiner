---
phase: 00-runtime-reality-check
verified: 2026-08-20T17:24:41Z
status: human_needed
score: 43/43 must-haves verified
behavior_unverified: 0
overrides_applied: 0
accepted_deviations: 3
gaps: []
deferred:
  - truth: "CACHE_HIT_RATE_CROSS_DAY — the cross-day content-hash cache hit rate"
    addressed_in: "Phase 1 (CORE-08) budgets against CACHE_HIT_RATE_ASSUMED=0.40 until the real number lands; go-no-go.json carries it in `unresolved[]` with revisit_after 2026-09-03"
    evidence: "CACHE_SAMPLE_DAYS=1, CACHE_CROSS_DAY_DENOMINATOR=0 — independently recomputed from the live recorder database (11393 rows, 1574 hashes, 1 distinct day, 0 hashes on 2+ days). Sanctioned inconclusive branch, not a gap."
human_verification:
  - test: "Decide whether to re-arm the SPIKE-10 recorder before Phase 1 hardens CORE-08 around 0.40. Run `bash scripts/spike/recorder-agent.sh install`, leave it for >=2 calendar days, then re-run the SPIKE-10 analysis."
    expected: "CACHE_SAMPLE_DAYS >= 2 and CACHE_CROSS_DAY_DENOMINATOR > 0, so CACHE_HIT_RATE_CROSS_DAY resolves to a real number before 2026-09-03."
    why_human: "go-no-go.json commits to revisit_after 2026-09-03, but the LaunchAgent was uninstalled and the recorder on 8998 was killed at Plan 04 teardown (correctly, per the plan's non-negotiable). Nothing is currently collecting, so the revisit date names a follow-up no mechanism is on track to satisfy. Whether to re-arm now, or to accept 0.40 through Phase 1, is an operator decision, not a code fix."
  - test: "Decide whether to correct the HARD_MAX_BYTES rationale prefix in scripts/spike/analyse-spike-06.py:467 and regenerate."
    expected: "The rationale's leading clause reflects the method actually used (escalation, bracketed, not bisected) rather than asserting 'ESCALATION AND BISECTION'."
    why_human: "The f-string hard-codes the phrase unconditionally, so it contradicts the `\"bisected\": false` boundary record embedded in the same string. No number changes; the risk is that a skimming downstream reader takes the leading clause as the method. Fix-now vs accept-as-documented is a judgement call."
  - test: "Decide whether FS_CONTAINMENT_STRATEGY should stay a 1,718-character prose value carrying unit `enum`, or be split into machine-assertable booleans plus a prose note."
    expected: "Phase 7 (MAP-04) can assert against the containment contract programmatically rather than string-matching a paragraph."
    why_human: "The phase goal promises a machine-checkable table. 48 of 49 thresholds are assertable values with units; this one is a design paragraph mislabelled `enum`. Whether that matters depends on how MAP-04 intends to consume it."
---

# Phase 0: Runtime Reality Check — Verification Report

**Phase Goal:** Replace every assumption about Caido's QuickJS with a measurement, and write a go/no-go table that fixes the default size, budget, and degradation thresholds.
**Verified:** 2026-08-20T17:24:41Z
**Status:** human_needed
**Re-verification:** No — initial verification

Verification method was adversarial and evidence-first. SUMMARY.md claims were treated as hypotheses. Where a number is load-bearing, it was recomputed from raw evidence in this session rather than read from the result file. Where a guard was claimed to fail closed, it was made to fail.

---

## Goal Achievement

### ROADMAP Success Criteria (the contract)

| # | Success criterion | Status | Evidence checked |
|---|---|---|---|
| 1 | Catastrophic regex run inside Caido in a disposable instance; recorded whether the plugin thread recovers, whether other plugins keep working, and whether `re2js` is fast enough on the same corpus | ✓ VERIFIED | `SPIKE-01.json` + three stage instances (8981/8982/8983, distinct `run_id`, `fresh:true`, exit 137). `n=40` fired, not returned at 660.0 s. Growth constant 3.9849x per +2 chars, measured. 0 interrupt and 0 timeout signals across 2,433 log lines — I summed the three `stage*-signals.json` files independently: 523 + 1595 + 315 = 2433, matching the verdict exactly. `re2js` benched on the real corpus (2,958,663 bytes, 13 rules); I recomputed the aggregate ratio, the provider/generic split and the faster-rule count from `stage3-bench.json` and got 59.711 / 19.625 / 91.059 / 7 — identical to the recorded values. |
| 2 | Handler blocking while 500 responses are proxied produces a recorded count of events actually delivered | ✓ VERIFIED | `SPIKE-03.json`: 500 issued, 500 returned 200 to the client in 715 ms, 500 delivered to a handler blocked 30,000 ms — 1 during the block, 499 in a 20 ms burst after, contiguous sequence 501–1000. An idle baseline on the *same instance* delivered 500/500, so the comparison is same-host. `EVENT_OVERFLOW_BEHAVIOUR = queue`. |
| 3 | `sdk.requests.send()` looped in increments of ten to failure, repeated with `save:false` and with `caido:http` `fetch` | ✓ VERIFIED (accepted deviation — floors, not cliffs) | Three variants, three fresh instances, three distinct `run_id`s (8984/8985/8981). I counted the raw `*-batches.jsonl`: 200 batches per variant, `batch_completed: 10` each, last `start_seq: 1991` — 2,000 real sends per variant, in increments of ten. No variant failed, so the recorded values are FLOORS and are labelled as such in the unit string itself. The literal "to failure" was not reached; this is the disclosed and accepted outcome. |
| 4 | Event matrix per surface (Proxy, Replay, Automate, import, workflow, plugin-originated) recording whether `onInterceptResponse` fires and whether `save:false` / `plugins:false` change it | ✓ VERIFIED | `SPIKE-05.json`: 11 cells, 7 surfaces, every cell carries a recorded state — no omissions, no `blocked` holes. All four `save`/`plugins` combinations tested on plugin-originated sends. Opening AND closing proxy controls both `fired`, proving the hook was live across the whole matrix, so every negative is a real negative rather than a dead handler. |
| 5 | Wall-clock via `performance.now()` inside Caido; memory via external RSS sampling correlated to in-runtime markers, for decode, hash, lexer, Meriyah parse at 0.5/1.5/3/8 MB; recursion-depth probe records where the stack breaks and whether it throws or segfaults | ✓ VERIFIED | `tier1/parse/src/index.ts:92,103` — elapsed comes from `performance.now()`; `Date.now()` is used only as the correlation bridge to the external sampler, which is exactly what the criterion asks. Four size points (457,965 / 1,469,843 / 2,983,904 / 8,325,353 bytes), one fresh `run_id` each, all six operations recorded per point with `rss_baseline_kb`, `rss_peak_kb`, `rss_step_bytes`. Stack: 18 depth probes across two shapes, `host_alive_after: true` on every one, every failure a catchable `RangeError` — no process deaths. `MAX_NESTING_DEPTH = 246` taken as the minimum across shapes (parens 246, brackets 710). |
| 6 | A written go/no-go table stating each answer, the threshold it sets, and what changes if it is wrong — emitted as machine-checkable JSON, not prose | ✓ VERIFIED | `go-no-go.json`: 13 gates, 49 thresholds, 46 source run ids, 1 declared unresolved. Every gate carries a non-empty `question`, `answer` and `changes_if_wrong`. Zero thresholds at `PENDING`. I regenerated `00-GO-NO-GO.md` myself via `python3 scripts/spike/render-go-no-go.py --stdout` and diffed it against the committed file: **byte-identical**. |

**Score: 6/6 ROADMAP success criteria verified.**

### Plan must-have truths

All four plans declare `must_haves.truths` in frontmatter. Every one was checked against the artifact, not the SUMMARY.

| Plan | Truth | Status | Evidence |
|---|---|---|---|
| 00-01 | `instance.sh` refuses to launch when the binary does not report 0.57.1 | ✓ VERIFIED (behavioural) | Ran `EXPECT_VERSION=9.9.9 bash scripts/spike/instance.sh` → `FATAL: version mismatch`, **exit 1**, nothing launched. |
| 00-01 | `instance.sh` refuses port 8080 and refuses a port already in LISTEN | ✓ VERIFIED (behavioural) | `PORT=8080` → `FATAL: refusing port 8080 — that is the operator's live Caido desktop instance`, **exit 1**. Bound a throwaway listener on 8976 and ran against it → `FATAL: port 8976 is already in LISTEN state`, **exit 1**. Listener removed; operator's pid 90236 alive after both. |
| 00-01 | One command launches an isolated Caido, installs an unsigned Tier-0 probe, calls a probe function over REST, writes a schema-valid result JSON | ✓ VERIFIED | 47 run directories under `results/runs/`, each with `instance.json`, `install-*.json` and `raw/` payloads; all 13 canonical results validate against `spike-result.schema.json` via ajv in `tests/schema.spec.ts` (30 tests pass). |
| 00-01 | `SPIKE-07.json` records `structuredClone` absent, WebAssembly absent, ≥80 globals enumerated | ✓ VERIFIED | `STRUCTURED_CLONE_PRESENT=false`, `WASM_PRESENT=false`, `globals_count=100` from `Object.getOwnPropertyNames(globalThis)` — and the delta against the research's 80 is itself recorded (`globals_count_vs_research=20`). |
| 00-01 | `SPIKE-02.json` records a `timer_service_ratio` for all four yield candidates over a fixed window, plus the median cost of the winner | ✓ VERIFIED | setTimeout0=0.76, setImmediate=0.00, promiseResolve=0.00, blocking=0.00 over a 300 ms window; `YIELD_COST_MS=5.029` median over 48 samples, p95 6.04. |
| 00-01 | `SPIKE-02.json` records an external-RSS attribution ratio and that RSS did not fall after references were dropped | ✓ VERIFIED | Attribution 0.9419 and 1.0207 (in-runtime allocation vs external RSS rise); `rss_delta_after_drop = +16384 bytes` — RSS is a high-water mark, proven not asserted. |
| 00-01 | The SPIKE-10 recorder is installed on a long-lived isolated instance and `cache_log` row count > 0 | ✓ VERIFIED (independently) | I queried the live database directly: `select count(*) from cache_log` → **11393**. |
| 00-01 | A LaunchAgent runs a recorder browsing session twice daily without human involvement | ✓ VERIFIED | `.spike/agent.err.log` records an unattended session start 2026-08-20T16:30:51Z (18:30 local — the scheduled slot), 40 sites x 2 passes, `ok=80 failed=0`, done 16:35:17Z. The database shows three distinct time clusters (14:28, 17:17, 18:30 local), consistent with scheduled plus manual runs. The mechanism worked; the phase simply completed inside one calendar day. |
| 00-01 | `tests/schema.spec.ts` fails when a result is corrupted or `binary.reported_version` is not 0.57.1 | ✓ VERIFIED (fail-first proven) | I mutated `SPIKE-07.json`'s `reported_version` to `0.55.3` and re-ran the gate: **1 failed | 14 passed**, failing at `go-no-go.spec.ts:212` with `Expected "0.57.1" / Received "0.55.3"`. File restored from git; `git status` clean and the value is back to 0.57.1. The gate is not decorative. |
| 00-02 | `SPIKE-08.json` states whether gzip/br/zstd bodies reach the plugin decompressed, with `Body.length` and `toRaw().length` recorded per encoding | ✓ VERIFIED | Decided by SHA-256 of `toRaw()` against the fixture's identity digest, not by inspection: gzip/br/zstd all `decoded`; `Body.length == toRaw().length` on 24/24 round trips; identity bodies 6/6 digest match. |
| 00-02 | `SPIKE-08.json` names which length the CORE-02 admission filter must gate on | ✓ VERIFIED | `SIZE_GATE_SOURCE = "Body.length (decompressed identity bytes)"`, with observed compression ratios 1.0725x–7.2541x recorded as the reason it matters. |
| 00-02 | `SPIKE-06.json` records wall-clock and external RSS for decode, hash, lexer and Meriyah parse at four size points, each on its own fresh instance | ✓ VERIFIED | 28 `op_cost` rows = 7 operations x 4 points; four distinct `run_id`s. |
| 00-02 | `SPIKE-06.json` records where the 512 KiB stack breaks under the real parser and whether it is a catchable throw or a process death | ✓ VERIFIED | 18 probes, two shapes, bisected to within 2 levels; `STACK_FAILURE_MODE = catchable-throw`; `host_alive_after: true` on all 18; process deaths: none. |
| 00-02 | `SPIKE-06.json` carries `AST_MAX_BYTES` and `HARD_MAX_BYTES`, the latter located by escalating input size on a fresh instance to the point the host aborts | ✓ VERIFIED (accepted deviation) | Both present: 1,334,405 and 274,736,748. The host never aborted — the 541 MB step hit the 900 s call budget with the host still alive, so the ceiling is bracketed and labelled `time-bound`, not abort-located. Non-bisection is documented in `_hardmax-boundary.json` with `"bisected": false` and a full rationale, and is explicitly accepted. See Warning W-1 for the residual issue. |
| 00-02 | `SPIKE-09.json` states whether PRAGMA and BEGIN/COMMIT survive across separate `exec` calls, and whether a multi-statement single `exec` is atomic under forced mid-batch failure | ✓ VERIFIED | `PRAGMA_PERSISTS_ACROSS_EXEC` = both kinds survived (user_version 4242, cache_size -8000); `TRANSACTION_PERSISTS_ACROSS_EXEC = false`, proven by a second `BEGIN` succeeding in the next `exec`; `MULTISTATEMENT_EXEC_ATOMIC = true`, counted from a **fresh connection pool after a plugin restart** — the summary itself records that the first version of this measurement was confounded and was redone. |
| 00-02 | `SPIKE-09.json` states whether the plugin database survives uninstall-then-reinstall, not only force-reinstall | ✓ VERIFIED | `DB_SURVIVES_REINSTALL = "survives force-reinstall only"` — sentinel row read back as 1 row after `force:true`, and 0 rows with `table_exists=False` after a true uninstall/install, with both backend UUIDs recorded. |
| 00-02 | `SPIKE-12.json` enumerates the actual llrt fs/path export surface and states a containment strategy not relying on realpath or lstat | ✓ VERIFIED | 16 fs exports enumerated from the live module (not the type package); `FS_HAS_REALPATH=false`, `FS_HAS_LSTAT=true`; strategy stated. See Warning W-2 on its encoding. |
| 00-02 | The SPIKE-12 run provably wrote nothing outside its own scratch data path | ✓ VERIFIED (independently) | `.spike/spike-12-witness/before.json` and `after.json` are a filesystem census over six roots (`/tmp`, `/private/tmp`, `$HOME`, `/etc`, `/var/tmp`, repo root) with four escape globs. I diffed them: **identical**. |
| 00-03 | `SPIKE-05.json` contains a complete matrix with a recorded state for every surface/flag cell — never omitted | ✓ VERIFIED | 11/11 cells carry `fired` or `not-fired`; zero `blocked`. The summary discloses that three cells were initially `blocked` by GraphQL payload-shape errors and were fixed and re-run until every cell held a real state. |
| 00-03 | `SPIKE-05.json` states whether `send()` re-fires the hook and whether `save:false`/`plugins:false` change it | ✓ VERIFIED | `SEND_REFIRES_INTERCEPT=false`; both flag thresholds encoded as the measured negative `"no-effect"` rather than `null`, with the distinction spelled out in the rationale. |
| 00-03 | `SPIKE-11.json` states whether a browser-cache hit and a 304 reach the hook, measured with a real browser cache | ✓ VERIFIED | Playwright/Chromium against a local origin serving ETag/Last-Modified/Cache-Control. `cached-fresh`: `requestServedFromCache=1`, `origin_requests=0`, `hook_fired=false` — while the `no-store` HTML wrapper in the same window DID fire, which is the control that makes the negative meaningful. `STATUS_304_REACHES_HOOK=true` with `Body.length == toRaw().length == 0` and no `content-type` header at all. |
| 00-03 | `SPIKE-11.json` sets `RETROACTIVE_SCAN_MANDATORY` | ✓ VERIFIED | `true`, with the reasoning tied to the measured `cached-fresh` scenario. |
| 00-03 | `SPIKE-03.json` reports how many of 500 proxied responses reached a handler blocked for 30 s | ✓ VERIFIED | See SC-2. |
| 00-03 | `SPIKE-03.json` records whether a sync throw and an async rejection are surfaced or swallowed | ✓ VERIFIED | `HANDLER_ERROR_SURFACED = "neither"`. Marker lines prove both handlers ran; the unique per-run error text appears 0 times across host log, stdout and stderr — three surfaces scanned separately, and attributed per-error (the analyser was fixed so it could distinguish `both`/`sync`/`async`/`partial`/`neither`). |
| 00-03 | `SPIKE-03.json` records client-observed latency during the block, distinguishing a stalled plugin thread from a stalled proxy | ✓ VERIFIED | Blocked p95 73.32 ms vs idle-baseline 49.26 ms; blocked p99 and max both **lower** than baseline. A 30 s plugin stall is invisible to proxy clients. |
| 00-04 | `SPIKE-01.json` records whether the regex returns control, whether any interrupt fired, and whether the core and a second plugin kept working | ✓ VERIFIED (independently) | `stage2-observations.jsonl`, raw: `second_plugin_ok: true` for the first 4 samples (0–81.7 s) and `false` for all 9 after (199–608.8 s), while `graphql_ms` stayed 0.49–0.68 and `proxy_http_code` stayed 200 throughout. The "attempting recovery is what spreads the damage" claim is supported by the raw record, not narrated. |
| 00-04 | `SPIKE-01.json` records the measured growth constant on this build | ✓ VERIFIED | 3.9849x per +2 chars, n=3, from 51.8 ms (n=20) to 3278.9 ms (n=26). |
| 00-04 | `SPIKE-01.json` records `re2js` throughput vs native on the same rules and corpus, with an adopt-or-reject verdict | ✓ VERIFIED (recomputed) | Recomputed from `stage3-bench.json`: 59.711x aggregate, 19.625x provider, 91.059x generic, 7 rules faster, 5 rules >10x slower — every figure matches. `all_counts_agree: true`, so the ratio compares equal work. `RE2JS_VERDICT = adopt-generic`. |
| 00-04 | `SPIKE-04.json` records a cliff per variant, each on its own fresh instance, with separate exit code and stderr capture | ✓ VERIFIED | Three `*-run.json` files, three `run_id`s, three data paths, per-variant `abort_assertion_lines_in_raw_channels = 0` scanned across stdout, stderr and host log separately. |
| 00-04 | `SPIKE-04.json` shows three distinct `run_id` values — one per variant | ✓ VERIFIED | `20260820T163653Z-19546`, `20260820T163724Z-7562`, `20260820T163755Z-29196`. Each `fresh: true`, each its own `/tmp/defminer-probe-<run_id>`, each `distinct_runtime_sessions_in_journal = 1`. The retain-shape control is deliberately filed under SPIKE-04b so SPIKE-04's three-instance invariant stays exactly three — reasoned in `SPIKE-04b.json`'s notes, not an accounting slip. |
| 00-04 | `SPIKE-04.json` records whether the write-ahead journal preserved the identity of the exact in-flight send across a host abort | ✓ VERIFIED (independently) | I read the five raw journal exports. Four abrupt SIGKILL deaths: `save-false` left 1 open row (seq 2656, last finalised 2655) and `retain-control` left 1 open row (seq 2762, last finalised 2761), each with a redacted candidate `?bytes=<redacted>&status=<redacted>`; `save-true` and `fetch` left 0 open rows. Exactly the recorded "2 caught, 2 correctly none, 0 spurious". |
| 00-04 | `SPIKE-04b.json` states whether toggling the plugin resets the leak | ✓ VERIFIED | `PLUGIN_TOGGLE_RESETS_LEAK = "runtime-recreated-no-leak-observed"` — an honest three-valued answer rather than a forced true/false. The raw `04b-journal.json` shows 3 distinct `runtime_session_id`s across 6,000 finalised rows in one database, which is the evidence for both halves: the runtime is rebuilt, and the database survives it. |
| 00-04 | `SPIKE-10.json` carries within-page and within-session rates, the distinct-day count, and a confidence *derived* from that day count | ✓ VERIFIED (recomputed) | Recomputed from the live recorder database: 11,393 rows, 1,574 distinct hashes, 1 distinct calendar day, 762,359,225 bytes — every figure matches the result file. `CACHE_SAMPLE_DAYS` confidence is derived, and the cross-day confidence is `LOW` as a consequence. |
| 00-04 | `SPIKE-10.json` carries an explicit `CACHE_CROSS_DAY_DENOMINATOR` | ✓ VERIFIED (recomputed) | Recorded as 0. My own query — hashes appearing on 2+ distinct local dates — also returns **0**. |
| 00-04 | Cross-day rate is measured exactly when ≥2 days and denominator > 0; otherwise null + inconclusive + mandatory `revisit_after` naming which cause + `CACHE_HIT_RATE_ASSUMED` of 0.40; never the within-session rate under the cross-day name, never 0.0 for an undefined rate | ✓ VERIFIED | See the dedicated section below. |
| 00-04 | `go-no-go.json` contains one gate per Phase 0 requirement ID with a non-empty `changes_if_wrong`, and zero PENDING thresholds | ✓ VERIFIED | 13/13 gate ids present, none extra, none missing; all three text fields non-empty on every gate; zero `PENDING`. |
| 00-04 | `00-GO-NO-GO.md` is generated from `go-no-go.json` and regenerating produces no diff | ✓ VERIFIED (independently) | Regenerated in this session and diffed: byte-identical. |

**Score: 37/37 plan must-have truths verified. Combined: 43/43.**

---

## The B8 cross-day branch — checked in detail

This is the fabrication path the phase was built to close, so it was checked field by field rather than accepted from the summary.

| Required condition | Actual | Status |
|---|---|---|
| `CACHE_SAMPLE_DAYS == 1` | 1 | ✓ (preconditions for the inconclusive branch hold) |
| `CACHE_CROSS_DAY_DENOMINATOR == 0` | 0 — and independently recomputed as 0 from the database | ✓ |
| `CACHE_HIT_RATE_CROSS_DAY.value` is null | `null` | ✓ |
| `.status == "inconclusive"` | `"inconclusive"` | ✓ |
| `.revisit_after` non-null | `"2026-09-03"` | ✓ |
| `CACHE_HIT_RATE_ASSUMED.value` is exactly 0.40 | `0.4` | ✓ |
| `.confidence == "pessimistic-default"` | `"pessimistic-default"` | ✓ (a distinct enum member in the schema, with a docstring explaining why folding it into `LOW` would erase the distinction) |
| Rationale names **which** cause applies | "The cause is **fewer than two distinct days sampled**: CACHE_SAMPLE_DAYS=1 and CACHE_CROSS_DAY_DENOMINATOR=0. Follow-up implied: keep collecting" — the insufficient-days branch, explicitly distinguished from the zero-recurrence branch | ✓ |
| No fabricated number in the neighbourhood | The only `null`-valued threshold in the whole file is `CACHE_HIT_RATE_CROSS_DAY`. The within-session rate (0.6304) appears only under its own name. `0.0` appears nowhere as a rate. `cache_cross_day_stabilised = false` with `last delta None` rather than a manufactured delta. | ✓ |

The biconditional is also enforced in **both** directions by `tests/go-no-go.spec.ts` — a multi-day run reporting 0.0 for a zero denominator would fail just as hard as a one-day run reporting a confident number. I read the assertion; it is not one-way.

---

## Binary provenance

| Check | Result |
|---|---|
| `binary.reported_version` on all 13 canonical results | `0.57.1` on every one |
| `binary.expected_version` matches reported on all 13 | yes |
| `binary.sha256` on all 13 | `e9f77d87…c6bb54`, identical across all 13 |
| That sha matches the real app-bundle binary | `shasum -a 256 /Applications/Caido.app/Contents/Resources/bin/caido-cli` → `e9f77d87…c6bb54` ✓ |
| That binary really reports 0.57.1 | `caido-cli --version` → `Caido 0.57.1` ✓ |
| The stale-PATH hazard was real | `which caido-cli` → `/Users/six2dez/.caido/caido-cli` → **`Caido 0.55.3`**. The hazard is live on this machine and was avoided. |
| `go-no-go.json` provenance block | `expected_version` and `reported_version` both `0.57.1`, same sha |
| Enforced, not just present | Proven by mutation — see the fail-first test above |

`SPIKE-10-progress.json` carries an empty `binary` block, but it is an intermediate superseded artifact (`superseded_by: results/SPIKE-10.json`), correctly excluded from the gate's `/^SPIKE-\d\d[a-z]?\.json$/` inventory. Not a gap.

---

## Destructive-spike instance discipline

| Spike | Instances | Distinct `run_id` | Distinct data path | Distinct port | `fresh` |
|---|---|---|---|---|---|
| SPIKE-01 stages | 3 | ✓ `…153757Z-11877`, `…153836Z-32643`, `…154036Z-6118` | ✓ | 8981 / 8983 / 8982 | true |
| SPIKE-04 variants | 3 | ✓ `…163653Z-19546`, `…163724Z-7562`, `…163755Z-29196` | ✓ | 8984 / 8985 / 8981 | true |
| SPIKE-04b (incl. retain control) | 2 | ✓ `…163825Z-24994`, `…163916Z-20863` | ✓ | 8985 / 8983 | true |
| SPIKE-06 ladder / depth / escalation | one per point | ✓ (39 run dirs in the 1358xx–1411xx band) | ✓ | — | true |

`fresh: true` is not the only evidence here, which was the point of the requirement: each instance also carries its own `/tmp/defminer-probe-<run_id>` data path, its own exit code, and — for SPIKE-04 — its own `distinct_runtime_sessions_in_journal = 1`, which is a runtime-side witness that no variant's sends leaked into another's runtime. `tests/go-no-go.spec.ts` additionally asserts that `source_runs[spike]` equals the result's own `instances[].run_id` list in order, so the aggregate cannot invent, drop or reorder a run.

---

## Claims vs evidence — the three probed

| Claim | Verdict | How it was checked |
|---|---|---|
| `#2211` did not reproduce at 2,000 sends, 16x its reported abort threshold | **SUPPORTED** | The issue reports ~54 clean / ~80 stall / ~120 abort; 2000/120 ≈ 16.7x. The 2,000 figure is not asserted — 200 batches x `batch_completed: 10` in the raw jsonl per variant, last `start_seq: 1991`. Zero abort-assertion lines in three separately captured channels. A fifth control instance ran the *naive* wrapper shape holding 10,000 live wrappers and also completed 2,000 cleanly, so the result is not an artefact of the probe's own discipline. Correctly recorded as a FLOOR with `confidence: MEDIUM`, and the `changes_if_wrong` names the consequential direction ("the cliff is REAL and simply out of reach of this apparatus"). |
| A second plugin died when `togglePlugin` was called against a wedged one | **SUPPORTED** | Raw `stage2-observations.jsonl`: `second_plugin_ok` true at 0.0/27.2/54.5/81.7 s, false at 199.0 s and every sample after (9 of 9). `stage2-toggle.json` shows the toggle attempt returning curl rc=28 after 90,036.3 ms, landing in exactly that gap. The core stayed healthy the whole time (GraphQL 0.49–0.68 ms, proxy 200), so the damage is specific to the plugin executors, not the host. |
| `re2js` is bimodal — faster than native on 7 of 13 rules | **SUPPORTED** | Recomputed from `stage3-bench.json` in this session by summing per-rule times across all three corpus files: exactly 7 rules faster (`github_oauth`, `github_pat`, `google_api_key`, `jwt`, `private_key_header`, `sendgrid_key`, `slack_token`), 5 rules >10x slower, aggregate 59.711x, provider 19.625x, generic 91.059x. Every recorded number reproduced to three decimals. `all_counts_agree: true` means both engines did equal work. The `adopt-generic` verdict follows from the split rather than from the aggregate, which is the right reading. |

---

## Requirements coverage

| Requirement | Description (REQUIREMENTS.md) | Gate | Threshold(s) set | Status |
|---|---|---|---|---|
| SPIKE-01 | Catastrophic regex / re2js escape hatch | ✓ pass | `REDOS_INTERRUPTIBLE`, `REDOS_RECOVERY`, `RE2JS_THROUGHPUT_RATIO`, `RE2JS_VERDICT` | ✓ SATISFIED |
| SPIKE-02 | `setTimeout(fn,0)` yields | ✓ pass | `YIELD_PRIMITIVE`, `YIELD_COST_MS`, `MAX_SYNC_SLICE_MS` | ✓ SATISFIED |
| SPIKE-03 | Event overflow behaviour | ✓ pass | `EVENT_OVERFLOW_BEHAVIOUR`, `EVENTS_DELIVERED_UNDER_BLOCK`, `HANDLER_ERROR_SURFACED` | ✓ SATISFIED |
| SPIKE-04 | Reproduce `caido/caido#2211` on 0.57.1 | ✓ pass | `SEND_CLIFF_SAVE_TRUE/SAVE_FALSE/FETCH`, `SEND_FAILURE_MODE` | ✓ SATISFIED |
| SPIKE-04b | Does a plugin toggle reset the leak | ✓ pass | `PLUGIN_TOGGLE_RESETS_LEAK` | ✓ SATISFIED |
| SPIKE-05 | Event matrix | ✓ pass | `SEND_REFIRES_INTERCEPT`, `SAVE_FALSE_…`, `PLUGINS_FALSE_…`, `SURFACES_FIRING_INTERCEPT` | ✓ SATISFIED |
| SPIKE-06 | CPU/RSS budgets and stack break | ✓ pass | `AST_MAX_BYTES`, `HARD_MAX_BYTES`, `MAX_NESTING_DEPTH`, `STACK_FAILURE_MODE`, `PARSE_MS_PER_MB`, `RSS_BYTES_PER_INPUT_BYTE` | ✓ SATISFIED |
| SPIKE-07 | `structuredClone` regression assertion | ✓ pass | `STRUCTURED_CLONE_PRESENT`, `WASM_PRESENT`, `TEXTDECODER_MODULE`, `TRIVIAL_STACK_DEPTH` | ✓ SATISFIED |
| SPIKE-08 | Body decompression / length semantics | ✓ pass | `BODY_STORED_DECOMPRESSED`, `BODY_LENGTH_EQUALS_RAW_LENGTH`, `SIZE_GATE_SOURCE` | ✓ SATISFIED |
| SPIKE-09 | PRAGMA / transaction survival | ✓ pass | `PRAGMA_…`, `TRANSACTION_…`, `MULTISTATEMENT_EXEC_ATOMIC`, `WAL_ENABLED`, `DB_SURVIVES_REINSTALL` | ✓ SATISFIED |
| SPIKE-10 | Content-hash cache hit rate | ⚠ inconclusive (declared) | `CACHE_HIT_RATE_WITHIN_PAGE/SESSION/CROSS_DAY/ASSUMED`, `CACHE_SAMPLE_DAYS`, `CACHE_CROSS_DAY_DENOMINATOR` | ✓ SATISFIED — answered as far as one calendar day permits, with the undefined part declared undefined |
| SPIKE-11 | Do 304s / cached responses reach the hook | ✓ pass | `CACHED_RESPONSES_REACH_HOOK`, `STATUS_304_REACHES_HOOK`, `RETROACTIVE_SCAN_MANDATORY` | ✓ SATISFIED |
| SPIKE-12 | `llrt/fs` containment | ✓ pass | `FS_HAS_REALPATH`, `FS_HAS_LSTAT`, `FS_CONTAINMENT_STRATEGY` | ✓ SATISFIED |

**13/13 Phase 0 requirement IDs answered. No orphans** — REQUIREMENTS.md maps exactly SPIKE-01…12 plus SPIKE-04b to Phase 0, and every one has a gate.

### ID mis-mapping check

The brief flagged that `PITFALLS.md` and `STACK.md` number spikes differently and five of twelve collide. I compared each gate's `question` against the `**SPIKE-NN**:` line in `REQUIREMENTS.md` — the declared authority — programmatically. **All 13 match verbatim as a prefix.** No gate answers a different question from the one its ID names.

---

## Machine-checkability audit

| Property | Result |
|---|---|
| Thresholds total | 49 |
| Missing `unit` | 0 |
| Missing `confidence` | 0 |
| `confidence: PENDING` | 0 |
| `value: PENDING` | 0 |
| `null` values | 1 — `CACHE_HIT_RATE_CROSS_DAY`, the single sanctioned case, and it carries the required `status`/`revisit_after` |
| Threshold ids outside the closed schema enum | 0 |
| Numeric thresholds with a real unit | `AST_MAX_BYTES` bytes, `HARD_MAX_BYTES` bytes, `MAX_NESTING_DEPTH` levels, `PARSE_MS_PER_MB` ms/MB, `RSS_BYTES_PER_INPUT_BYTE` ratio, `MAX_SYNC_SLICE_MS` ms, `YIELD_COST_MS` ms, `TRIVIAL_STACK_DEPTH` frames, the three `SEND_CLIFF_*`, the six cache figures — all assertable |
| Measured negatives encoded as values, not `null` | Yes, and deliberately: `TEXTDECODER_MODULE: "none"`, `HANDLER_ERROR_SURFACED: "neither"`, `SAVE_FALSE_SUPPRESSES_INTERCEPT: "no-effect"`. The distinction between "measured negative" and "unmeasured" is enforced by a test. |
| Prose where a value belongs | **1** — `FS_CONTAINMENT_STRATEGY` (see W-2) |

The phase goal's specific promise — "fixes the default size, budget, and degradation thresholds" — is met with numbers: size (`AST_MAX_BYTES`, `HARD_MAX_BYTES`, `SIZE_GATE_SOURCE`), budget (`PARSE_MS_PER_MB`, `RSS_BYTES_PER_INPUT_BYTE`, `MAX_SYNC_SLICE_MS`, `YIELD_COST_MS`), degradation (`MAX_NESTING_DEPTH`, `STACK_FAILURE_MODE`, `RE2JS_VERDICT`).

---

## Behavioural spot-checks

| Behaviour | Command | Result | Status |
|---|---|---|---|
| Full workspace gate suite | `pnpm vitest run` (once) | 3 files, **72 tests passed**, 0 skipped, 209 ms | ✓ PASS |
| Render freshness, independently | `python3 scripts/spike/render-go-no-go.py --stdout` + diff | byte-identical to `00-GO-NO-GO.md` | ✓ PASS |
| Version gate fails closed | mutate `SPIKE-07.json` → `0.55.3`, run gate, restore | **1 failed** at `go-no-go.spec.ts:212`; file restored, tree clean | ✓ PASS |
| `instance.sh` refuses 8080 | `PORT=8080 bash scripts/spike/instance.sh` | `FATAL: refusing port 8080`, exit 1 | ✓ PASS |
| `instance.sh` refuses a wrong version | `EXPECT_VERSION=9.9.9 …` | `FATAL: version mismatch`, exit 1 | ✓ PASS |
| `instance.sh` refuses a busy port | throwaway listener on 8976, then launch | `FATAL: port 8976 is already in LISTEN state`, exit 1 | ✓ PASS |
| Recorder `cache_log` populated | `sqlite3 … "select count(*) from cache_log"` | 11393 | ✓ PASS |
| Cross-day denominator, recomputed | `sqlite3` group-by over distinct local dates | 0 | ✓ PASS |
| SPIKE-12 containment witness | `diff before.json after.json` | identical | ✓ PASS |

---

## Test quality audit

| Test file | Linked requirements | Active | Skipped | Circular | Assertion level | Verdict |
|---|---|---|---|---|---|---|
| `tests/go-no-go.spec.ts` | all 13 | 15 | 0 | no | value + behavioural | SOUND |
| `tests/schema.spec.ts` | all 13 | 30 | 0 | no | value (ajv structural) | SOUND |
| `tests/spike-results.spec.ts` | all 13 | 27 | 0 | no | value | SOUND |

Disabled tests on requirements: **0**. Circular patterns: **0** — the gates compare an artifact against an independently-declared schema and against a regeneration from source data; they never generate the expected values by running the system under test. Assertion strength is value-level or behavioural throughout, not existence-level: the version test compares an actual string, the render test compares bytes, the cross-day test asserts a biconditional in both directions.

The one structural caveat worth naming: these gates prove that `go-no-go.json` is internally consistent with the per-spike results and with the rendered markdown. They cannot prove the measurements themselves. That is why this verification recomputed the load-bearing numbers (re2js bimodality, SPIKE-10 cache aggregates, SPIKE-04 send counts and journal open rows, SPIKE-01 signal line counts) from raw evidence rather than trusting the chain.

---

## Anti-patterns found

Scanned all 60 git-tracked source files under `scripts/`, `probe/`, `tier1/`, `tests/`, plus `caido.config.ts`.

| Pattern | Hits | Severity |
|---|---|---|
| `TBD` / `FIXME` / `XXX` | **0** | — |
| `TODO` / `HACK` / `PLACEHOLDER` | **0** | — |
| "not yet implemented" / "coming soon" / "placeholder" | **0** | — |
| Skipped or todo tests | **0** | — |

No debt markers. Nothing to gate on.

---

## Cleanup

| Requirement | Result |
|---|---|
| Wave-1 LaunchAgent uninstalled | ✓ `launchctl list \| grep -i defminer` → no output (rc 1). No `*defminer*` plist anywhere under `~/Library/LaunchAgents`. |
| Disposable instances on 8981–8999 gone | ✓ No LISTEN sockets in 8980–8999. |
| Recorder on 8998 stopped | ✓ Not listening. Database preserved at `.spike/recorder-data/plugins/73c7e164-…/data.db`. |
| **Operator's Caido on 8080 (pid 90236) still running and untouched** | ✓ **ALIVE.** `lsof -nP -iTCP:8080` → `caido-cli 90236 six2dez … 127.0.0.1:8080 (LISTEN)`; `ps -p 90236` → 8h51m elapsed, i.e. started before this phase began. Re-checked after every one of my own `instance.sh` guard tests: still alive. Its guard is proven to fire, not just present. |
| Stray caido processes | Only the operator's own tree (90232–90236, 89062). No probe instances. |
| Working tree | Clean under `.planning/phases/00-runtime-reality-check/` after my mutation test; 364 result files tracked; only `.planning/config.json` (unrelated) and `.gsd/` (untracked) differ. |

One cosmetic leftover: `/tmp/defminer-probe-20260820T142611Z-25336` remains on disk from a 14:26 run with no process attached. Harmless, gitignored, outside the repo.

---

## Warnings (non-blocking)

**W-1 — `HARD_MAX_BYTES`'s rationale asserts a method it did not use.**
`scripts/spike/analyse-spike-06.py:467` hard-codes the prefix `"Located by ESCALATION AND BISECTION on fresh instances"` as an unconditional f-string literal, independent of `hardmax["bisected"]`. The same rationale string then embeds the boundary record containing `"bisected": false` and a paragraph explaining exactly why bisection was declined. The *decision* not to bisect is accepted and well-reasoned; what is not covered by that acceptance is a generated rationale whose first clause contradicts its own payload. Also note `confidence` is set to `HIGH` because `smallest_bad` is truthy, even though the "smallest bad" was a 900 s call-budget timeout rather than a runtime failure — the `CEILING KIND: time-bound` disclosure carries the truth, but the confidence label does not reflect it. **Fix:** make the prefix conditional on `hardmax["bisected"]` and regenerate. One line, plus `aggregate.py` and the renderer.

**W-2 — `FS_CONTAINMENT_STRATEGY` is a 1,718-character prose paragraph carrying `unit: "enum"`.**
It is the only threshold in the table that a downstream phase cannot assert against as a value. `PRAGMA_PERSISTS_ACROSS_EXEC` (55 chars) and `DB_SURVIVES_REINSTALL` (29 chars) are milder cases of the same thing — free-text sentences labelled `enum` rather than members of a declared closed set. The content is correct and useful; the encoding undercuts the "machine-checkable, not prose" promise for this one row.

**W-3 — the acorn-tokenizer figure Phase 9 depends on is not a `go-no-go.json` threshold.**
ROADMAP Phase 9 SC-2 cites "the tokenizer at 783 ms/MB against meriyah's 786" to justify degrading to regex-only rather than through `acorn.tokenizer()`. `785.8` is `PARSE_MS_PER_MB`, fine. But `783.2` lives only inside `SPIKE-06.json`'s prose verdict and inside the `AST_MAX_BYTES` rationale — it is not in the closed threshold enum, so a phase importing only the sanctioned surface cannot assert against it. The raw per-point `tokenize` `ms_per_mb` values are recorded (728.78 / 784.22 / 586.03 / 776.94), so the number is derivable, just not importable.

**W-4 — minor prose slip.** `SPIKE-04.json`'s verdict says the retain-shape control ran on "a fifth fresh instance". By run-id ordering it was the fourth (`…163825Z-24994`); the fifth was SPIKE-04b's toggle leg (`…163916Z-20863`). No measurement is affected.

---

## Accepted deviations (recorded, reasoned, not counted as failures)

1. **Cross-day cache rate inconclusive.** All four recorder sessions landed on 2026-08-20. The sanctioned branch was taken correctly and completely — verified field by field above.
2. **`HARD_MAX_BYTES` boundary not bisected.** The only failure class was `timeout`; bisecting would have measured the executor's own 900 s call-budget constant, and each escalation step drove the host into swap (~57 MB free pages) with the operator's live Caido running. Reasoning is in `_hardmax-boundary.json`, and the summary is explicit that the host-wide swap pressure invalidated an assumption in threat T-00-22. Stopping was the right call. (W-1 concerns only how it was *labelled*.)
3. **Send cliffs recorded as FLOORS.** 2 KB synthetic bodies, serialised sends, idle host, 2,000-send cap not reached by failure. The unit string itself says `FLOOR — the cap, not a cliff`, the confidence is `MEDIUM`, and `changes_if_wrong` names the consequential direction.
4. **Task 3's credential-scan clause scoped to `git ls-files`.** I checked this independently rather than taking the reasoning on trust. Broad scan across the whole results tree finds credential-shaped matches in 20+ files — **every one of them untracked and gitignored** (`.gitignore:27`, `:34`, `:56` cover `runs/*/*.log`, `runs/*/raw/*.log`, `spike-04-runs/*/*.log`). Of the git-tracked set, **zero** carry credential material. Inspecting a flagged file shows the single hit is the GraphQL field *name* `accessToken` inside the query text, with `grep -c 'caido_'` returning 0 — no token value anywhere. T-00-45 specifies a git-tracked scan and the plan's action text says "no *committed* artifact". The narrowing holds.

---

## Human verification / decisions required

Three items. None blocks the phase goal; all three want an owner.

### 1. Re-arm the SPIKE-10 recorder, or accept 0.40 through Phase 1

**Test:** `bash scripts/spike/recorder-agent.sh install`, leave it running across at least two calendar days, re-run the SPIKE-10 analysis.
**Expected:** `CACHE_SAMPLE_DAYS >= 2` and `CACHE_CROSS_DAY_DENOMINATOR > 0`, so `CACHE_HIT_RATE_CROSS_DAY` resolves before its 2026-09-03 revisit date.
**Why human:** `go-no-go.json` commits to a revisit date, but the LaunchAgent was uninstalled and the recorder killed at Plan 04 teardown — correctly, per the plan's non-negotiable. Nothing is collecting. The summary is admirably honest about this ("Recording a revisit date while quietly leaving no collection running would have been its own small fabrication") and names the exact re-arm command, so this is a disclosed follow-up rather than a concealed gap. But it is the single highest-leverage unknown in the project — 0.40 versus 0.90 is a 6x swing in the Phase 1 CPU budget — and it needs a decision before CORE-08 hardens around the pessimistic default.

### 2. Fix or accept the `HARD_MAX_BYTES` rationale prefix (W-1)

**Test:** Make the prefix in `analyse-spike-06.py:467` conditional on `hardmax["bisected"]`, re-run the analyser, `aggregate.py` and `render-go-no-go.py`, confirm the gate still passes.
**Expected:** The rationale's leading clause describes escalation-and-bracketing, matching the `"bisected": false` record it already carries.
**Why human:** Zero numbers change. It is a judgement call whether a self-contradicting prose prefix in the phase's headline deliverable is worth a regeneration cycle now or is adequately covered by the disclosure that follows it in the same string.

### 3. Decide the encoding of `FS_CONTAINMENT_STRATEGY` (W-2)

**Test:** Consider splitting it into machine-assertable fields (e.g. `FS_CONTAINMENT_REJECTS_ABSOLUTE`, `FS_CONTAINMENT_REQUIRES_LSTAT_WALK`) plus a prose note, or confirm that Phase 7's MAP-04 is content to read it as documentation.
**Expected:** MAP-04 can assert its containment contract programmatically.
**Why human:** Depends entirely on how MAP-04 intends to consume it, which is a Phase 7 design question.

---

## Gaps Summary

**None.** No must-have truth failed, no artifact is missing or stubbed, no key link is unwired, no debt marker was introduced, and no blocking anti-pattern was found.

The phase goal — "replace every assumption with a measurement, and write a go/no-go table that fixes the default size, budget, and degradation thresholds" — is achieved. Thirteen requirement IDs, thirteen gates, forty-nine thresholds with units and confidences, zero PENDING, one honestly-declared unresolved with a pessimistic default and a named cause. Every load-bearing number I recomputed from raw evidence reproduced exactly. Every guard I tried to break failed closed. The operator's live Caido was never touched.

What keeps this at `human_needed` rather than `passed` is not doubt about the measurements. It is that the phase's own most consequential unresolved item now has a revisit date and no running mechanism behind it, and that two artifact-encoding defects in the table eleven phases will import deserve an explicit accept-or-fix rather than a silent pass.

The most notable quality signal in this phase is not any single number — it is the shape of the negative results. `TEXTDECODER_MODULE: "none"` rather than `null`. `SAVE_FALSE_SUPPRESSES_INTERCEPT: "no-effect"` rather than `false`. `PLUGIN_TOGGLE_RESETS_LEAK: "runtime-recreated-no-leak-observed"` rather than a forced boolean. `CACHE_HIT_RATE_CROSS_DAY: null` rather than 0.0. Send cliffs labelled FLOOR in the unit string itself. Each of those is a place where a number could have been fabricated and was not, and in most cases a test exists that would fail if a later hand tried.

---

_Verified: 2026-08-20T17:24:41Z_
_Verifier: Claude (gsd-verifier)_
