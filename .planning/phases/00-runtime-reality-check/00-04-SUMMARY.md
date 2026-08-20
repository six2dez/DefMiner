---
phase: 00-runtime-reality-check
plan: 04
subsystem: destructive-spikes-and-go-no-go
status: complete
tags: [spike, caido, quickjs, redos, re2js, refcount-leak, write-ahead-journal, cache, go-no-go]

requires:
  - "00-01 — instance.sh, probe-run.sh, record-result.py, cache-rate.py, recorder-*.sh, the schemas and both vitest gates"
  - "00-02 — caido.config.ts and the Tier-1 build pipeline the re2js probe is built through"
  - "00-03 — SPIKE-05's proxy-only finding, which settles the send-recursion question SPIKE-04 would otherwise have to ask"
provides:
  - "results/SPIKE-01.json — REDOS_INTERRUPTIBLE, REDOS_RECOVERY, RE2JS_THROUGHPUT_RATIO, RE2JS_VERDICT"
  - "results/SPIKE-04.json — SEND_CLIFF_SAVE_TRUE/SAVE_FALSE/FETCH, SEND_FAILURE_MODE"
  - "results/SPIKE-04b.json — PLUGIN_TOGGLE_RESETS_LEAK"
  - "results/SPIKE-10.json — CACHE_HIT_RATE_WITHIN_PAGE/WITHIN_SESSION/CROSS_DAY/ASSUMED, CACHE_SAMPLE_DAYS, CACHE_CROSS_DAY_DENOMINATOR"
  - "results/go-no-go.json — 13 gates, 49 thresholds, 1 unresolved. The ONLY Phase 0 artifact later phases may import"
  - "00-GO-NO-GO.md — generated operator-readable table; regenerating produces no diff"
  - "tests/go-no-go.spec.ts — the phase exit gate"
  - "scripts/spike/{redos,send-cliff,re2js-provenance}.sh, {aggregate,render-go-no-go,analyse-spike-01,analyse-spike-04,analyse-spike-10,scan-signals,pick-04b-reference}.py, validate-schema.mjs"
  - "probe/tier0-send, tier1/redos — the send-cliff and ReDoS probes"
affects:
  - "Phase 1 — every tunable constant imports from go-no-go.json and is asserted equal to it"
  - "Phase 3 DET-04/05/06 — re2js adopt-generic, and DET-05's static check is load-bearing"
  - "Phase 8 ACTIVE-01/02/09/13/14 — the send floor, the validated journal, the toggle primitive"
  - "Phase 1 CORE-08 / STORE-03 / STORE-04 — must budget against CACHE_HIT_RATE_ASSUMED=0.40"

tech-stack:
  added: []
  patterns:
    - "One fresh instance per destructive measurement, with run_id uniqueness asserted rather than described"
    - "A negative result is only believable with a control that would have produced the positive"
    - "Measured negatives encode as values; null is reserved for genuinely unmeasured"
    - "Generated documents are pure functions of committed data, and the gate re-runs the generator and diffs"
    - "Every gate proven to FAIL on corruption, not merely to pass on good input"

key-files:
  created:
    - tier1/redos/src/index.ts
    - probe/tier0-send/manifest.json
    - probe/tier0-send/backend/script.js
    - scripts/spike/redos.sh
    - scripts/spike/send-cliff.sh
    - scripts/spike/re2js-provenance.sh
    - scripts/spike/scan-signals.py
    - scripts/spike/pick-04b-reference.py
    - scripts/spike/analyse-spike-01.py
    - scripts/spike/analyse-spike-04.py
    - scripts/spike/analyse-spike-10.py
    - scripts/spike/aggregate.py
    - scripts/spike/render-go-no-go.py
    - scripts/spike/validate-schema.mjs
    - tests/go-no-go.spec.ts
    - .planning/phases/00-runtime-reality-check/results/SPIKE-01.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-04.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-04b.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-10.json
    - .planning/phases/00-runtime-reality-check/results/go-no-go.json
    - .planning/phases/00-runtime-reality-check/00-GO-NO-GO.md
  modified:
    - caido.config.ts
    - scripts/spike/record-result.py
    - tests/schema.spec.ts
    - tests/spike-results.spec.ts
    - .planning/phases/00-runtime-reality-check/results/spike-result.schema.json
    - .planning/phases/00-runtime-reality-check/results/go-no-go.schema.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-10-progress.json
    - .gitignore

decisions:
  - "RE2JS_VERDICT is adopt-generic, derived from a bimodal ratio the aggregate would otherwise average away"
  - "The three SPIKE-04 cliffs are recorded as FLOORS, in the unit string, because reaching the cap is not finding the cliff"
  - "A retain-shape control was added, unplanned, because the plan's ACTIVE-09 discipline IS the mitigation under test"
  - "The journal is validated against a SIGKILL delivered mid-batch, since #2211's own abort never arrived"
  - "The journal keys its UPDATE on (session, seq); last_insert_rowid() is unusable on a pooled connection"
  - "pessimistic-default is a new confidence value, not a reuse of LOW — an assumption is not a weak measurement"
  - "SPIKE-04b is a first-class sub-spike: schemas and both existing gates widened so its result is checked, not skipped"
  - "The credential gate ships scoped to git-tracked files, which is what T-00-45 and the plan's action text both specify"

metrics:
  duration_min: 92
  completed: 2026-08-20
  tasks: 3
  commits: 3
  files_changed: 123

actuals:
  tokens: 112547
  tasks: 3
  commits: 3
---

# Phase 0 Plan 04: Destructive Spikes and the Go/No-Go Table — Summary

Ran the two spikes that can end the project, read the recorder one last time, and turned thirteen answers into one machine-checkable table whose prose cannot diverge from its data. Eight fresh disposable instances plus the long-lived recorder, which was read one last time and then stopped; four hosts killed mid-send on purpose; zero touches to the operator's Caido on 8080.

## The Numbers

| Threshold | Value | Spike |
|---|---|---|
| `REDOS_INTERRUPTIBLE` | **`false`** | 01 |
| `REDOS_RECOVERY` | **`kill`** | 01 |
| `RE2JS_THROUGHPUT_RATIO` | **59.711×** | 01 |
| `RE2JS_VERDICT` | **`adopt-generic`** | 01 |
| `SEND_CLIFF_SAVE_TRUE` | **2000 (floor)** | 04 |
| `SEND_CLIFF_SAVE_FALSE` | **2000 (floor)** | 04 |
| `SEND_CLIFF_FETCH` | **2000 (floor)** | 04 |
| `SEND_FAILURE_MODE` | **`clean`** | 04 |
| `PLUGIN_TOGGLE_RESETS_LEAK` | **`runtime-recreated-no-leak-observed`** | 04b |
| `CACHE_HIT_RATE_WITHIN_PAGE` | 0.0555 | 10 |
| `CACHE_HIT_RATE_WITHIN_SESSION` | 0.6304 | 10 |
| `CACHE_HIT_RATE_CROSS_DAY` | **`null` — inconclusive** | 10 |
| `CACHE_HIT_RATE_ASSUMED` | **0.40** `pessimistic-default` | 10 |
| `CACHE_SAMPLE_DAYS` | 1 | 10 |
| `CACHE_CROSS_DAY_DENOMINATOR` | 0 | 10 |

## SPIKE-01 — the hang is unbounded, and attempting recovery spreads it

Three stages, three fresh instances, because the failure modes are incompatible.

**The escalation reproduced the research almost exactly.** `/(a+)+$/` against `"a".repeat(n)+"b"`: 51.8, 204.6, 805.3, 3278.9 ms at n = 20, 22, 24, 26 — against the research's 51, 208, 825, 3289. Growth **3.985× per two characters**, computed from this run's own numbers so the unbounded claim rests on this run's data. A second shape, `(a|a)+$`, took 1,480.8 ms at n=24, so the finding is about the class rather than one regex.

**n=40 extrapolates to 14.5 hours and did not return in 660 s** — a window 79× shorter than completion. **Zero** interrupt and **zero** timeout signals across 2,433 lines of stdout, stderr and the structured host log. Caido installs no QuickJS interrupt handler, so `lre_check_timeout` is inert; that is now measured rather than inferred.

**Two findings the research did not have, and both change the design.**

The first: **a second package with its own executor kept working through the hang, and stopped the moment recovery was attempted.** `probe/tier0-core` answered `capabilities` normally in ~10 ms on every sample for the first 82 s. Then `togglePlugin(enabled:false)` was requested against the wedged plugin, and from that instant the healthy plugin answered on none of the remaining nine samples. The host log shows the mechanism precisely: `service|plugin: Stopping plugin` is accepted and never completes, and afterwards `api|controller: Calling plugin` still appears for the healthy plugin but the matching `plugin|executor: Calling method` never does. Per-plugin executors are independent right up until a lifecycle operation is requested; then the shared plugin service is stuck behind the wedged executor and every plugin goes dark. **Attempting recovery is what turns one broken plugin into all of them.**

The second corrects the research: **`installPluginPackage(force:true)` did not block.** It returned in **25.4 ms** — with `package: null` and `error: OtherUserError`. It failed rather than recovering, and nothing came back afterwards. That is arguably worse than blocking: a devtools hot reload against a wedged runtime returns fast with a generic error that reads like a transient hiccup. `togglePlugin` did block, never returning inside a 90-second budget. The two lifecycle operations fail in two different ways and **both look survivable from outside**.

Throughout, GraphQL answered in **0.59 ms median** (idle baseline 0.43 ms) and the proxy returned 200 on **13 of 13** requests, so a wedged host stays diagnosable. `SIGKILL` remains the only recovery; the instance exited 137.

### re2js — the ratio is bimodal, and averaging it would lose the finding

13 provider- and generic-shaped rules over 2.96 MB of real corpus, both engines counting every match and **agreeing on every count**, so the ratio compares equal work.

| Bucket | native | re2js | ratio |
|---|---:|---:|---:|
| all 13 rules | 790.1 ms | 47,180.1 ms | **59.71×** |
| provider-shaped | 346.7 ms | 6,805.0 ms | 19.63× |
| generic-shaped | 443.4 ms | 40,375.1 ms | 91.06× |

**re2js is FASTER than native on 7 of 13 rules** — every rule with a literal prefix (`ghp_`, `gho_`, `AIza`, `SG.`, `xox`, `-----BEGIN`, `eyJ`) runs at ~0.19× because RE2's DFA prefilter finds the literal outright. The 59.71× aggregate is carried entirely by five unanchored rules at 82–112×, with `stripe_key`'s nested alternation dragging the provider bucket up single-handedly.

That forces `adopt-generic` from both directions. **adopt-all is refused by the data**: a whole-body scan of an `AST_MAX_BYTES` (1,334,405 B) bundle would cost ~21 s against a 1,000 ms stall budget. **reject is equally refused**: re2js compiled every rule in the set, beat native on more than half, and is flat where native is exponential — 0.19 ms at every escalation point where native reached 3,279 ms. So it is adopted for the rule class that can backtrack catastrophically, run inside DET-06's bounded windows rather than across whole bodies, with native RegExp keeping the whole-body prefilter pass.

Constraints recorded rather than left to be discovered in Phase 3: **no lookbehind, no lookahead, no backreferences.** Named groups, non-capturing groups, `\p{L}`, `\b` and lazy quantifiers all compile. A RE2-clean corpus makes Gitleaks rules directly portable, which is a benefit as much as a constraint.

### The re2js provenance gap does not exist

Queried live against `registry.npmjs.org` rather than re-quoting the claim. `repository` **is** published — as `"github:le0pard/re2js"`, npm's shorthand **string** form rather than the `{type, url}` object form, which is exactly why tooling reading `repository.url` reports the field absent. 2.8.6 was published through **npm trusted publishing via GitHub Actions OIDC**, carries **zero runtime dependencies** and **no install-time script** (published scripts are build/test/lint only), MIT, 47 versions, single maintainer. There are no provenance attestations at the attestations endpoint, which is a separate thing from the trusted-publisher marker and is recorded separately. **Phase 3 should re-audit at adoption time as normal hygiene, not to close a gap.**

## SPIKE-04 — #2211 did not reproduce at 16× its reported threshold

Three variants, three fresh instances, three distinct run ids, each with a temporary project and the Tier-0 send probe. 2,000 sends each, in batches of ten, all **clean**. Latency did not merely stay flat — the last-10 median is **below** the first-10 median in every run (0.418 vs 0.678 ms for `save:true`), so there is no accumulation signal at all. `#2211` reports ~54 clean / ~80 stall / ~120 abort against this exact build.

**These are recorded as FLOORS, and the unit string says so.** "Reached the cap" and "found the cliff" are different claims, and a later phase reading 2000 as a cliff would treat a floor as headroom.

### The control, which was not in the plan and without which the negative is not believable

The plan specifies the ACTIVE-09 discipline — wrappers reduced to primitives inside a frame that returns before the journal's `await`, never retained — and reasons that retaining would measure the probe rather than Caido. That is right, but it has a consequence the plan does not draw: **that discipline is precisely the mitigation for `#2211`'s live wrapper pressure.** A disciplined probe reporting "no cliff" cannot distinguish "no leak" from "leak successfully mitigated", and publishing the former would be a category error with the same shape as reporting an undefined rate as zero.

So a fifth fresh instance ran the byte-identical loop with every `RequestSpec`, payload, `Request`, `Response` and `Body` retained in a module-level array. **2,000 sends, 10,000 live wrappers held, still clean**, latency indistinguishable from the disciplined run (0.91/0.66/0.84 vs 0.88/0.61/0.61 ms). The negative is about the host, not about the probe. It is recorded in SPIKE-04b — whose precondition it is — so SPIKE-04's three-instance invariant stays intact.

### The write-ahead journal, validated against real host deaths

`#2211`'s own abort never arrived, so it could not provide the in-flight case the must-have needs. A **SIGKILL delivered mid-batch** is the same event from the journal's point of view — abrupt process death, no unwind, no graceful shutdown, no chance to flush — so after each capped loop a large batch was fired and the host killed 0.6 s in.

Across **four** such deaths the journal:

- caught the **exact** in-flight send **twice** — one open row, sequence exactly one past the last finalised, carrying the redacted candidate `http://127.0.0.1:8092/_synth?bytes=<redacted>&status=<redacted>`
- correctly left **no open row twice**, where the kill landed between sends
- invented a spurious open row **zero times**

Zero misses and zero false positives is the contract ACTIVE-13 needs: an invented open row would make the crash detector quarantine work that never started.

### A probe bug that is a first-order Phase 1 finding

The first run of the journal keyed its `UPDATE` on `SELECT last_insert_rowid()`. On this runtime that **silently stops working**: `sdk.meta.db()` is a connection pool over worker threads, and once the pool grows past its first connection the insert and the rowid query land on different connections, so the update matches no row. Rows kept inserting and every send kept succeeding — finalisation just stopped dead after a contiguous prefix of **5, 6 and 188 rows of 400** across the three variants, with no error anywhere.

**STORE-01 through STORE-07 must key writes on a natural key. `last_insert_rowid()` is unusable on this runtime.** The fix — keying on `(runtime_session_id, seq)`, which is what ACTIVE-02 already specifies — also removes a round-trip per send.

## SPIKE-04b — the toggle genuinely rebuilds the runtime

A fourth fresh instance on 8983, three legs of 2,000 sends with `togglePlugin` off and on between them, twice, so a one-off is distinguishable from a real reset.

**The runtime is torn down and re-created.** Three distinct module instantiations (`rs-mt1qwo0s…`, `rs-mt1qx23z…`, `rs-mt1qxlzq…`), with the probe's per-runtime send counter back at **0** at every leg start. That is stronger evidence than the host log's `Stopping plugin executor` line, which says only that an executor stopped. Every toggle returned `error: null` — in sharp contrast to SPIKE-01, where the same mutation against a *wedged* plugin never returned at all and took the healthy plugins down with it.

**The plugin database survives the toggle**: 6,000 rows spanning 3 runtime sessions in one `sdk.meta.db()`. A crash marker written before a toggle is still readable after it, which has to be true for a toggle to be usable as recovery at all.

What could **not** be shown is the reset of `#2211`'s leak specifically, because no leak became observable in either wrapper shape. So the threshold records exactly that — `runtime-recreated-no-leak-observed` — rather than a flattering boolean. The consequence that is *not* conditional and should be designed for now: **ACTIVE-13 must decide to toggle on a leading indicator**, because once the runtime stops answering the toggle is no longer available.

## SPIKE-10 — inconclusive, chosen by the data

Final read: **11,393 rows, 1,574 distinct content hashes, 1 calendar day, 3 sessions.** Within page load 0.0555; within session 0.6304. The cross-day denominator — content hashes seen on two or more distinct days — is **0**.

The branch was picked by two numbers, both recorded as thresholds in their own right so the distinction survives into the aggregate. `CACHE_HIT_RATE_CROSS_DAY` is **null** with `status: inconclusive`, `revisit_after: 2026-09-03`, and a rationale naming **which** of the two causes applies — *fewer than two distinct days sampled*, not the zero-recurrence case, because the first says keep collecting and the second says the method itself needs revisiting. `CACHE_HIT_RATE_ASSUMED = 0.40` at confidence `pessimistic-default` keeps Phase 1's CORE-08 unblocked without letting it build on a figure nobody observed.

Reporting the within-session 0.6304 under the cross-day name, or 0.0 for the undefined rate, would each mis-size the CPU budget by the exact 90%-against-40% factor this spike exists to prevent — silently, across eleven phases. Both are now impossible: the aggregator and the exit gate reject them by name.

**The LaunchAgent is uninstalled and the recorder on 8998 is killed**, per the plan's non-negotiable, with the database preserved at `.spike/recorder-data/plugins/73c7e164-…/data.db`. Collection has therefore **stopped**, and the result says so plainly: the revisit requires someone to run `bash scripts/spike/recorder-agent.sh install` and let it span at least two days. Recording a revisit date while quietly leaving no collection running would have been its own small fabrication.

## The go/no-go table

`go-no-go.json`: **13 gates, 49 thresholds (the entire closed enum), 1 unresolved, `caido_version` 0.57.1.** Gate questions come from `REQUIREMENTS.md` — the sole authority — rather than being retyped. Provenance (binary path, SHA-256 `e9f77d87…`, host, CPU) is folded into the aggregate rather than fetched by the renderer, so `00-GO-NO-GO.md` is generated from `go-no-go.json` **alone** and the render-and-diff check proves what it claims.

### Gate strength: proven to fail, not merely to pass

`aggregate.py` was proven to reject all of:

| Corruption | Rejected |
|---|---|
| threshold id outside the closed enum | ✓ |
| a result measured against 0.55.3 | ✓ |
| one threshold claimed by two spikes with different values | ✓ |
| `PENDING` confidence | ✓ |
| a missing result file (SPIKE-04b deleted) | ✓ |
| `CACHE_CROSS_DAY_DENOMINATOR` removed | ✓ |
| inconclusive rate with no `CACHE_HIT_RATE_ASSUMED` | ✓ |
| inconclusive rate whose rationale names no cause | ✓ |
| **within-session rate under the cross-day name at 1 day** | ✓ |
| **0.0 reported for a rate whose denominator is zero** | ✓ |
| **null cross-day when it WAS measurable (3 days, denominator 40)** | ✓ |

`tests/go-no-go.spec.ts` was proven to fail on: a hand-edited `00-GO-NO-GO.md`, a fabricated cross-day rate at one day, a missing SPIKE-04b gate, an empty `changes_if_wrong`, a `PENDING` confidence, and a null threshold that is not the cross-day rate.

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 - Blocking] Schemas rejected `SPIKE-04b` as a spike id**

- **Found during:** Task 2. Both schemas pinned `spike` to `^SPIKE-[0-9]{2}$`, and the plan requires thirteen gates including SPIKE-04b.
- **Fix:** widened to `^SPIKE-[0-9]{2}[a-z]?$` in `spike-result.schema.json` and both places in `go-no-go.schema.json`, and widened `resultFiles()` in **both** existing vitest gates from `/^SPIKE-\d\d\.json$/` to `/^SPIKE-\d\d[a-z]?\.json$/`. Without the second half, `SPIKE-04b.json` would have validated against nothing and been silently skipped by the quality gate — an unchecked result file is an ungated one.
- **Commit:** 34e50aa

**2. [Rule 1 - Bug] The write-ahead journal stopped finalising rows after a few hundred sends**

- **Found during:** Task 2, first run. 400 rows inserted, 5 / 6 / 188 finalised across the three variants, no error anywhere.
- **Cause:** `SELECT last_insert_rowid()` on a pooled connection.
- **Fix:** key the `UPDATE` on `(runtime_session_id, seq)`. Re-ran all three variants from scratch on fresh instances rather than patching the analysis.
- **Why it matters beyond this probe:** it is direct evidence for STORE-01..07, and it is recorded in `SPIKE-04.json`'s notes for that reason.
- **Commit:** 34e50aa

**3. [Rule 2 - Correctness] `scan_signals` ran before teardown, so it never saw the structured host log**

- **Found during:** Task 1. Teardown is what copies `logging.<date>.log` out of the data path. The first scan covered 262/798/158 lines of stdout+stderr only.
- **Fix:** extracted `scripts/spike/scan-signals.py`, moved every invocation after `down()`, re-scanned. The claim is now "zero interrupt signals in **2,433** lines across all three channels" rather than a fraction of the evidence it appeared to cover.
- **Commit:** 5b3843d

**4. [Rule 1 - Bug] I committed ~50 MB of raw host logs**

- **Found during:** Task 2, reviewing the commit's own stat line (222,898 insertions).
- **Cause:** `preserve_evidence` copies stderr/stdout/host log next to the journals under `spike-04-runs/<label>/`, which is outside the `runs/*/*.log` gitignore rule.
- **Fix:** extended `.gitignore` to `spike-04-runs/*/*.log`, `git rm --cached`, amended. The journal `.db` files **do** ship — they are the evidence, they are small, and the only URL in them is the probe's own synthetic target with query values already redacted by the probe. Insertions dropped to 21,405.
- **Commit:** 34e50aa (amended)

**5. [Rule 2 - Correctness] `record-result.py` dropped `project_persistence`**

- The SPIKE-04 gate asserts all three instances record it, the schema declares it, and nothing populated it. Added a pass-through from `instance.json`, and `send-cliff.sh` writes it after `ensure_project`. A guest can create only temporary projects, so this is a fact about the instance rather than a claim made later.
- **Commit:** 34e50aa

**6. [Rule 1 - Bug] `re2js-provenance.sh` consumed curl's output as its own stdin**

- `python3 - <<'HEREDOC'` makes the heredoc stdin, silently replacing the piped response body; the program parsed its own source as JSON and wrote an empty file. Restructured to read the program into a variable and pass it with `-c`.
- **Commit:** 23bd89d

**7. [Rule 2 - Correctness] `analyse-spike-01.py` degraded to "unknown" when the registry capture was absent**

- `.spike/` is gitignored, so on a clean checkout the provenance fields would silently become `"unknown"` — a shrug that still looks like a measurement. It now regenerates via `re2js-provenance.sh` and exits loudly if it cannot.
- **Commit:** 23bd89d

**8. [Rule 2 - Correctness] `confidence` had no way to say "this is not a measurement"**

- The plan requires `CACHE_HIT_RATE_ASSUMED` at confidence `pessimistic-default`; the enum was `HIGH|MEDIUM|LOW|PENDING`. Folding it into `LOW` would conflate "we measured this and are unsure" with "nobody measured this, here is a deliberate worst case" — exactly the distinction Phase 1 needs. Added `pessimistic-default` to both schemas with that reasoning in the description.
- **Commit:** 23bd89d

**9. [Rule 2 - Correctness] A committed plan-00-03 artifact carried the loginAsGuest query text**

- `runs/20260820T151340Z-2765/raw/error-scan.json` contained the literal `mutation { loginAsGuest { token { accessToken } } }` — the GraphQL field **name**, never a token value — from a captured host-log line. The project's own rule is that raw host logs never ship. Redacted the field name in place, leaving the timestamp, span and module tag byte-identical; SPIKE-03's evidence is about the *absence* of its run's unique error text, to which that line contributes nothing.
- **Commit:** 23bd89d

### Additions beyond the file list

`scripts/spike/scan-signals.py`, `analyse-spike-01.py`, `analyse-spike-04.py`, `analyse-spike-10.py`, `pick-04b-reference.py`, `validate-schema.mjs`, `re2js-provenance.sh`. The plan named the drivers but no analysers; putting the derivation in committed scripts keeps every result regenerable rather than the product of an untracked one-off, which is the practice plans 00-01 through 00-03 established. `validate-schema.mjs` exists because Python has no JSON Schema library here and installing one would have bypassed the Phase 0 package-legitimacy gate for no benefit — it reuses the ajv the vitest gate already uses, so the two can never disagree.

### Deliberate scope addition: the retain-shape control

Not in the plan, and the SPIKE-04 result is not trustworthy without it. See "The control" above. It is recorded as a second instance in `SPIKE-04b.json`, whose gate permits additional instances, rather than in `SPIKE-04.json`, whose `==3` instance assertion is the check protecting its cliffs from cross-variant pollution.

## One gate whose literal scope disagrees with its own stated intent

Task 3's `<automated>` block ends with:

```
if grep -rIlE '(caido_[A-Za-z0-9_-]{16,}|accessToken)' .../results; then echo "FAIL"; exit 1; fi
```

**Run verbatim, it fires.** I did not loosen it; I investigated it, and the finding is that its scope disagrees with the claim it is making. Evidence:

- **Zero** token-shaped strings (`caido_…{16,}`) anywhere under `results/`, tracked or not.
- **106** files match — **all 106 gitignored, 0 tracked.**
- Every match is the string `accessToken` inside `loginAsGuest { token { accessToken } }`, the GraphQL **field name** echoed by `--debug` into raw host logs. No credential value is present.
- Scanning **git-tracked** files: **0 of 364** committed artifacts match.

The plan's own action text says *"verify no **committed** artifact under `results/` carries credential material"*, and threat T-00-45 specifies *"a **git-tracked** scan of the results tree"*. The `<automated>` command omits the tracked filter, so it scans a population the gate does not claim. Applying the assertion to the population the plan names twice is not a loosening.

**What shipped:** `tests/go-no-go.spec.ts` carries the credential scan with the **exact same two patterns**, scoped to `git ls-files`, and it passes. The one genuinely tracked hit it found was fixed at source (deviation 9) rather than by weakening the pattern. The raw host logs stay on disk, gitignored and unpublished, because they are the operator's local evidence and deleting 200 MB of them to satisfy a grep whose stated scope is committed artifacts would optimise for the letter against the intent.

## Human-Check

The plan's `<human-check>` asks whether every gate states an actionable answer and a concrete consequence. I read all thirteen. Every `changes_if_wrong` is 436–1,529 characters, names specific downstream requirement ids, and states what those requirements become under the opposite answer — for example SPIKE-12's *"an attacker-controlled sourcemap `sources` entry writes outside DefMiner's output directory on a security tester's own machine — the tool becomes the exploit"*. None reads as filler or as a restatement of the question. **This remains the operator's call to confirm**; my reading is recorded here, not substituted for theirs.

## Known Stubs

None. No placeholder values, no unwired data paths, no TODO/FIXME introduced. Two thresholds are deliberately non-measurements and both are labelled as such in the data itself: `CACHE_HIT_RATE_CROSS_DAY` (`null`, `inconclusive`, with a revisit date and a named cause) and `CACHE_HIT_RATE_ASSUMED` (`0.40`, `pessimistic-default`).

## Deferred / Not Run

- **A `#2211` cliff at all.** Not reproduced at 2,000 sends in either wrapper shape. Three conditions differ from a real DefMiner workload and each could gate the leak: 2 KB synthetic bodies rather than multi-hundred-kilobyte `.map` files, strictly serialised sends, and an otherwise-idle host. **Phase 8 should re-run with real `.map` bodies and concurrent sends before treating the floor as headroom.** Recorded in `SPIKE-04.json`'s `if_wrong`.
- **The persistent-project survival case.** Guest instances can hold only temporary projects, so "the abort dropped the project" is a claim about a temporary one. A PAT-authenticated instance would be needed; explicitly out of scope and recorded on every SPIKE-04 instance as `project_persistence: temporary`.
- **The cross-day cache rate.** One calendar day, zero denominator. Revisit 2026-09-03, and note that collection has stopped by design — the agent must be re-installed first.
- **Live operator browsing for SPIKE-10.** Available throughout, never exercised. Worth knowing, because a pinned site list under-represents the revisit patterns that produce cross-day recurrence; recorded in the result's notes.

## Threat Mitigations Applied

| Threat | Verified |
|---|---|
| T-00-41 | The unbounded regex was confined to a dedicated fresh instance on 8982 that nothing later needed. No retry loop against `togglePlugin` or `installPluginPackage` was written; each was attempted exactly once and the result recorded. `kill -9` teardown, exit 137 recorded. |
| T-00-42 | One fresh instance per variant plus a fourth for the toggle and a fifth for the control, each destroyed after use. All guest instances, temporary projects only. stdout, stderr and the host log captured separately per run. |
| T-00-43 | Three distinct `run_id` values asserted by the gate, not described. `fresh: true` on all three. The pollution mechanism is stated in the probe source and the result notes, so a shortcut would be visibly wrong. |
| T-00-44 | Only the three aggregate rates, the day count and the denominator are published. The raw `cache_log` stays under gitignored `.spike/`; `cache-rate.py` emits no URL. |
| T-00-45 | Zero token-shaped strings anywhere; 0 of 364 git-tracked result artifacts match either pattern. One tracked field-name occurrence found and fixed at source. The scan ships in `tests/go-no-go.spec.ts`. |
| T-00-46 | Threshold ids are a closed enum read from the schema so there is one source of truth. `aggregate.py` proven to reject an unknown id, a duplicate id with conflicting values, and a result not reporting 0.57.1. |
| T-00-47 | `00-GO-NO-GO.md` is generated from `go-no-go.json` alone; the gate re-runs the renderer and diffs, and was proven to fail on a hand edit. |
| T-00-48 | Confidence is derived from the distinct-day count, not asserted. The one-day outcome forced `null` + `inconclusive` + `revisit_after` + a named cause + a pessimistic default, and the aggregator rejects a fabricated number in **both** directions. |
| T-00-4SC | No package-manager install occurred. `re2js`'s provenance was re-queried live and there is no gap. Schema validation reuses the already-approved ajv rather than adding a Python dependency. |

## Ports

8981–8985 used and released; 8091/8092 for the local origins, released. **8080 was never touched** — the operator's Caido (pid 90236) was verified alive at the start and at the end. 8998's recorder was deliberately stopped as this plan's own teardown responsibility.

## Self-Check: PASSED
