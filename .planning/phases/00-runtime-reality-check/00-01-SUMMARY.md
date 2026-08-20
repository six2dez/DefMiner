---
phase: 00-runtime-reality-check
plan: 01
subsystem: spike-harness
status: complete
tags: [harness, spike, caido, quickjs, measurement, privacy]

requires: []
provides:
  - "scripts/spike/instance.sh — version-asserted, port-asserted, readiness-gated disposable Caido launcher"
  - "scripts/spike/probe-run.sh — zip, install via installPluginPackage, resolve backend UUID, call over REST"
  - "scripts/spike/record-result.py — schema-shaped result writer with a hard version gate"
  - "scripts/spike/rss-sampler.sh — external RSS/CPU sampler with unix-ms correlation keys"
  - "scripts/spike/fetch-corpus.sh — SHA-256-gated corpus, fails closed"
  - "scripts/spike/origin.py — controlled origin: per-path encoding, ETag, Last-Modified, real 304s, synthetic responses"
  - "scripts/spike/load.sh — proxied load generator with per-request status accounting"
  - "scripts/spike/recorder-{up,session,agent}.sh + browse.mjs + sites.json — unattended SPIKE-10 collection"
  - "scripts/spike/cache-rate.py — three cache rates plus an explicit cross-day denominator"
  - "results/spike-result.schema.json + go-no-go.schema.json — the Phase 0 contract"
  - "results/SPIKE-07.json, results/SPIKE-02.json, results/SPIKE-10-progress.json"
affects:
  - "00-02, 00-03 — consume every script here unchanged"
  - "00-04 — reads SPIKE-10-progress.json and owns SPIKE-10.json + go-no-go.json"

tech-stack:
  added:
    - "vitest 4.1.11 — artifact gates"
    - "ajv 8.20.0 + ajv-formats 3.0.1 — schema validation"
    - "playwright 1.62.1 — SPIKE-10 scripted browsing"
    - "@caido-community/dev 0.1.7, @caido/sdk-client 0.5.0, @caido/sdk-backend 0.57.1, @caido/quickjs-types 0.26.0"
    - "meriyah 7.3.2, acorn 8.18.0, re2js 2.8.6, @jridgewell/sourcemap-codec 1.5.5 — spike payloads"
  patterns:
    - "Every measurement is version-asserted against the app-bundle binary before it is recorded"
    - "Every result is a delta from a marker; RSS is never read as an absolute"
    - "Every event-loop experiment runs a fixed wall-clock window, never a fixed iteration count"
    - "Measured negatives are encoded as values (\"none\"), never as null"

key-files:
  created:
    - scripts/spike/instance.sh
    - scripts/spike/probe-run.sh
    - scripts/spike/record-result.py
    - scripts/spike/rss-sampler.sh
    - scripts/spike/fetch-corpus.sh
    - scripts/spike/origin.py
    - scripts/spike/load.sh
    - scripts/spike/recorder-up.sh
    - scripts/spike/recorder-session.sh
    - scripts/spike/recorder-agent.sh
    - scripts/spike/browse.mjs
    - scripts/spike/sites.json
    - scripts/spike/cache-rate.py
    - scripts/spike/spike-10-progress.py
    - scripts/spike/run-spike-07.sh
    - scripts/spike/run-spike-02.sh
    - scripts/spike/analyse-spike-02.py
    - probe/tier0-core/manifest.json
    - probe/tier0-core/backend/script.js
    - probe/recorder/manifest.json
    - probe/recorder/backend/script.js
    - tests/schema.spec.ts
    - tests/spike-results.spec.ts
    - .planning/phases/00-runtime-reality-check/results/spike-result.schema.json
    - .planning/phases/00-runtime-reality-check/results/go-no-go.schema.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-07.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-02.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-10-progress.json
    - package.json
    - pnpm-workspace.yaml
    - vitest.config.ts
  modified:
    - .gitignore

decisions:
  - "Threshold enum is closed at 49 ids so a typo fails validation instead of creating an orphan threshold"
  - "instances is an array with run_id and listen REQUIRED, so the run_id-uniqueness assertion is meaningful"
  - "Measured negatives encode as \"none\" not null; null is reserved for genuinely unmeasured"
  - "Build scripts allowlisted per-package (esbuild true, sharp false), never blanket-approved"
  - "zstd via the system binary rather than a new Python dependency, to avoid bypassing the Task 0 gate"
  - "Recorder prepares a statement per insert rather than sharing one across a pooled connection"

metrics:
  duration_min: 33
  completed: 2026-08-20
  tasks: 3
  commits: 3
  files_changed: 45

actuals:
  tokens: 75167
  tasks: 3
  commits: 3
---

# Phase 0 Plan 01: Spike Harness, SPIKE-07, SPIKE-02, SPIKE-10 Recorder — Summary

Built the shared Phase 0 measurement rig against real Caido 0.57.1, answered the two cheapest spikes with numbers that were measured rather than copied, and got the wall-clock-bound SPIKE-10 recorder collecting unattended on day one.

## What Was Built

A version-asserting disposable-instance launcher, a probe install/call driver, an external RSS sampler, a hash-gated corpus, a controlled origin, a results writer, two JSON Schemas, two vitest artifact gates, and a long-lived SPIKE-10 recorder driven by a twice-daily LaunchAgent.

Plans 00-02, 00-03 and 00-04 can each launch an isolated version-asserted instance, install a probe, call it, sample RSS, generate proxied load, serve a controlled origin, and write a schema-valid result — using only these scripts, without modifying any of them.

## Results

### SPIKE-07 — capability baseline (regression assertion)

| Fact | Measured | vs research |
|---|---|---|
| `structuredClone` | `undefined` | confirms |
| `WebAssembly` | `undefined` | confirms |
| Globals enumerated | **100** | **research said 80** |
| `TextDecoder` | not a global, exported by **no** module | **research left this open** |
| Trivial recursion depth | 1,021 frames, catchable `RangeError` | confirms |
| `performance.now()` resolution | 0.000999987 ms (~1 µs) | confirms |
| Memory introspection | none (`llrt:qjs`, `perf_hooks`, `process`, `util`, `stream`, `zlib` all fail) | confirms |

### SPIKE-02 — does `setTimeout(fn,0)` yield?

**Yes, and it is the only primitive that does.** Fixed 300 ms wall-clock window, 1 ms sync slice, 4 ms `setInterval` counting service opportunities:

| Primitive | Yields | Ticks | Service ratio |
|---|---:|---:|---:|
| `setTimeout(r,0)` | 50 | 53 / 76 | **0.76** |
| `setImmediate(r)` | 300 | 0 | 0.00 |
| `Promise.resolve()` | 300 | 0 | 0.00 |
| blocking baseline | 0 | 0 | 0.00 |

Cost: **5.03 ms median, 6.04 ms p95** over 48 samples. The ≥4 ms clamp was measured, not assumed — `setTimeout(fn,0)` and `setTimeout(fn,1)` are indistinguishable while `setTimeout(fn,10)` is not.

At real 64 KB/4 KB geometry over 8 MB, with a no-yield baseline so overhead is attributable:

| Policy | Yields | Overhead | % of work |
|---|---:|---:|---:|
| baseline (no yield) | 0 | — | — |
| per chunk | 137 | 744.8 ms | 330.7% |
| temporal (25 ms budget) | 5 | 29.5 ms | **21.2%** |

Research projected ~730 ms and ~19%; both confirmed at real geometry. All three policies found identical hit counts, confirming they did equal work. `MAX_SYNC_SLICE_MS = 25` is therefore derived from measurement, not projection.

RSS attribution, validated before SPIKE-06 depends on it: **0.94× and 1.02× on the way up**, and RSS delta after dropping every reference was **+16 KB — it did not fall**.

### SPIKE-10 — recorder deployed and collecting

2,268 rows, 1,375 distinct hashes, from one session of 40 pinned sites × 2 passes (79/80 loads succeeded).

| Rate | Value |
|---|---|
| within page load | 0.0569 |
| within session | 0.3937 |
| **cross day** | **UNDEFINED (denominator 0)** |

The cross-day rate is *undefined*, not zero. `cache-rate.py` emits `cross_day_denominator` explicitly so plan 00-04 can route this to its inconclusive branch.

## Findings That Diverge From the Research

1. **100 globals, not 80.** Four are Caido-injected SDK globals (`Body`, `RequestSpec`, `RequestSpecRaw`, `ResponseSpec`); the rest are quickjs-ng built-ins. A probe enumerating at a different plugin-lifecycle point might see fewer. The measurement stands and the gap is recorded in the result.
2. **`TextDecoder` is reachable from no module** — closing open question 4 with a negative. But `string_decoder.StringDecoder` and `buffer.Buffer` are both importable, so **ENC-01/ENC-02 do not need a hand-rolled UTF-8 decoder**. The plan's draft `if_wrong` assumed the opposite and was corrected against the measurement.
3. **Bare `crypto` loads and exports `Sha256`/`createHash`; `caido:crypto` does not load at all.** The recorder depends on this.
4. **`zlib` does not load**, so SPIKE-08 cannot decompress in-runtime and must rely on what Caido already decoded.

## Findings Not In the Research At All

1. **A fresh Caido has no project, and with none selected the proxy returns `Proxying error: Internal` and `onInterceptResponse` never fires.** This is a hard prerequisite for every traffic-observing spike — SPIKE-03, SPIKE-05, SPIKE-08 and SPIKE-11 all need it. `recorder-up.sh` now creates and selects a temporary project on both cold and reuse paths. Confirms the research on entitlements: `temporary:true` succeeds for a guest, `temporary:false` returns `PermissionDeniedUserError`.
2. **`db.exec(sql)` takes no bind parameters.** Passing an array is silently ignored, producing `NOT NULL constraint failed` on every insert. Binding requires `prepare()` → `Statement.run(...params)`, spread. Verified against `@caido/quickjs-types` `extra/sqlite.d.ts`.
3. **A continuation attached to an already-settled module-level promise is never driven across event invocations.** The handler logs, returns, and the `.then()` simply never runs — no row, no error, nothing in the log. Each insert now starts from a freshly initiated operation.
4. **The function REST endpoint accepts `args` as an array of strings only.** A JSON number returns `400 invalid_json`.
5. **macOS has no `flock(1)`.** `recorder-session.sh` takes a real blocking `fcntl.flock(LOCK_EX)` via a self-re-exec that clears `FD_CLOEXEC`, proven to block a second caller for the full hold.

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 - Blocking] pnpm 11 blocked all dependency build scripts**
- Found during: Task 1. `pnpm exec` re-runs `pnpm install`, which failed on `ERR_PNPM_IGNORED_BUILDS`, blocking Playwright install.
- Fix: `pnpm-workspace.yaml` with an explicit `allowBuilds` map — `esbuild: true` (required by vite/vitest), `sharp: false` (icon processing only; Tier-0 probes never build icons). Allowlisted per package rather than blanket-approved, because the install set went through the Task 0 legitimacy gate.
- Adds one file not in `files_modified`: `pnpm-workspace.yaml`. It is pnpm 11's settings file, not a workspace definition — there is no `packages:` key and the repo stays single-package.
- Commit: 856e4ea

**2. [Rule 1 - Bug] `instance.sh` wrote per-run artifacts to `results/$RUN_ID`, not `results/runs/$RUN_ID`**
- Found during: Task 1, first end-to-end run. `record-result.py` and the documented layout both expect `runs/`.
- Fix: routed every per-run path through `RUN_DIR`. Commit: 856e4ea

**3. [Rule 1 - Bug] `instance.json` writer emitted shell `true`/`false` into a Python literal**
- Found during: Task 1. `NameError: name 'true' is not defined`; the run launched and called the probe but recorded nothing.
- Fix: emit `True`/`False`. Commit: 856e4ea

**4. [Rule 1 - Bug] readiness loop fell through after 60 failed polls**
- The research sketch proceeds to mint a token even if the instance never became ready. Fixed to track readiness explicitly and abort. Commit: 856e4ea

**5. [Rule 1 - Bug] `rss-sampler.sh` spawned a python3 per sample**
- The research sketch spawns an interpreter per sample to get a millisecond timestamp. At ~20 ms per spawn that dominates a 50 ms interval and would alias the very allocation steps the sampler exists to resolve. Fixed to one long-lived process. Commit: 8da0a14

**6. [Rule 2 - Correctness] `load.sh` reported throughput for runs where every request failed**
- Found during: Task 3 verification. An HTTPS run against an HTTP-only origin reported "276 req/s" while all 20 requests were 502s — the fastest possible run is one where nothing succeeds.
- Fix: record every status code, compute the rate over successes only, emit an explicit warning otherwise. **This mattered**: SPIKE-03 in plan 00-03 compares delivered-event counts against this request count, so a silently-failed run would have produced a wrong backpressure verdict. Commit: 221dbfc

**7. [Rule 2 - Correctness] unbounded log growth on the long-lived recorder**
- The recorder runs with `--debug`, which emits a span per proxied request; one browse session alone added ~20 MB. Over a multi-day phase this grows without bound on a process nobody is watching. `recorder-session.sh` now truncates in place above 100 MB. Commit: 221dbfc

**8. [Rule 2 - Correctness] `TEXTDECODER_MODULE` recorded as `null`**
- The results gate caught this correctly and I fixed the *encoding*, not the assertion. `null` means "not measured"; this threshold is measured and the answer is negative, so it records `"none"`. Conflating the two would let a later phase read an unmeasured field as a fact — the same class of error the plan calls out for the cross-day denominator. Commit: 8da0a14

### Additions beyond the file list

`scripts/spike/run-spike-07.sh`, `run-spike-02.sh`, `analyse-spike-02.py`, `spike-10-progress.py`. The plan said to run each spike but named no runner; putting the logic in committed scripts keeps every result regenerable rather than the product of an untracked one-off command. Both result files were regenerated from these scripts after every correction, so no artifact was hand-edited.

## Threat Mitigations Applied

| Threat | Verified |
|---|---|
| T-00-11 | `--listen 127.0.0.1:<port>` only, no `0.0.0.0` path; 8080 refused unconditionally and before the LISTEN check. The gate is proven to fire. Operator's pid 90236 untouched throughout. |
| T-00-12 | SHA-256 per artifact, proven to fail closed: deliberate tamper → file deleted, **exit 1**. |
| T-00-13 | `cache_log` schema verified to be exactly `{id, ts, url, sha256, bytes, content_type, status}` — no body, header or credential column. `.spike/` gitignored, so no recorded URL can enter git. |
| T-00-14 | Token written 0600 via `umask` *before* the secret is written, deleted at teardown; `runs/*/token` and `runs/*/*.log` gitignored. All 17 tracked result files scanned clean for bearer tokens and PATs. |
| T-00-16 / T-00-1SC | Task 0 gate cleared by the human with live registry verification. Build scripts allowlisted per package. `zstd` uses the system binary rather than a new Python dependency, which would have bypassed the gate. |
| T-00-18 | Version gate in `instance.sh`, hard fail in `record-result.py`, re-asserted across every result by `tests/schema.spec.ts`. All three proven to fire. |

## Gate Strength Evidence

The schema gate was proven to **fail** on four corruption modes, not merely to pass on good input: wrong `reported_version`, an out-of-enum threshold id, truncated JSON, and a missing `verdict.if_wrong`.

## For Plan 00-04 — one unresolved tension

`tests/spike-results.spec.ts` asserts, as the plan specifies verbatim, that **every** `verdict.thresholds_set[]` entry has a non-null `value`. But `spike-result.schema.json` permits `null` specifically to carry the inconclusive cross-day case that plan 00-04 task 3 defines.

If 00-04 writes `CACHE_HIT_RATE_CROSS_DAY` with a null value into `results/SPIKE-10.json`, this gate will fail. I implemented the assertion as specified rather than pre-weakening it. **00-04 must decide**: either record the inconclusive case with a sentinel value plus `status: "inconclusive"` and `revisit_after` (consistent with how `TEXTDECODER_MODULE` resolved here), or amend the assertion deliberately. Silently loosening it would disarm the check for every other threshold in the phase.

## Known Stubs

None. No placeholder values, no unwired data paths, no TODO/FIXME introduced.

## Deferred / Not Run

- **Task 3 `<human-check>` (optional).** Routing the operator's real browser through 127.0.0.1:8998 adds realism the pinned list cannot. Explicitly optional in the plan — the scripted sessions run unattended regardless. Available to the operator at any time via `bash scripts/spike/recorder-session.sh`.
- **`zstandard` Python module absent.** Covered by the system `zstd` v1.5.7 binary; all four encodings verified working.

## Self-Check: PASSED
