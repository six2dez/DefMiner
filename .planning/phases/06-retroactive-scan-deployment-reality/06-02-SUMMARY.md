---
phase: 06-retroactive-scan-deployment-reality
plan: 02
subsystem: testing
tags: [caido-sdk, measurement, compression, json-schema, vitest, probe, httpql]

requires:
  - phase: 00-runtime-reality-check
    provides: "`scripts/spike/instance.sh`'s version-gated isolated launcher, `scripts/spike/probe-run.sh`'s install/call pair, `scripts/spike/origin.py`, the generated `corpus/encoded/` fixture set, and the result-artifact + JSON-schema idiom SPIKE-08 established"
  - phase: 01-skeleton-persistence-compatibility
    provides: "`counters.byteLenMismatch` in `telemetry.ts` and its `getStatus` projection — the shipped, already-running instrument this plan turned into a measurement — plus `admit()`'s size axis, the consumer's reload-by-id, and `tests/phase1-load.spec.ts`'s FAIL-NEVER-SKIP artifact-gate doctrine"
  - phase: 06-retroactive-scan-deployment-reality
    provides: "06-01's shipped `startScan` / `getScanStatus` RPC and `runScanProducer`, whose actual shape is what forced this plan's one structural deviation"
provides:
  - "O-07 SETTLED BY MEASUREMENT on both read paths: `sdk.requests.get()` and `sdk.requests.query()` both report the DECOMPRESSED identity byte count on Caido 0.58.2"
  - "`scripts/phase6/o07-body-length.sh` + `scripts/phase6/o07-assemble.py` — a re-runnable probe, not a memory"
  - "`probe/phase6-o07` — a read-path probe plugin reaching `sdk.requests.get()` and `sdk.requests.query()` directly"
  - "`o07-body-length.schema.json` — a SIBLING of `spike-result.schema.json` with a first-class `not_run` state"
  - "`tests/phase6-o07.spec.ts` — the artifact gate, pinning Phase 6's own `EXPECTED_CAIDO_VERSION = \"0.58.2\"`"
  - "Two measured facts about the plugin-function RPC route: every `args` element must be a STRING, and the route JSON-decodes each one once before the handler sees it"
  - "Phase 6's port block (8961-8965) and its `.gitignore` token/host-log rules"
affects: [06-03 backpressure watermark, 06-04 operator clause validator, 06-06 retro counters and the reload-side size gate, 06-11 push-down proof, 06-07 deployment matrix]

actuals:
  tokens: 21184
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A sibling result schema per phase rather than a widened Phase 0 one — the threshold enum in `spike-result.schema.json` is closed and widening it is the edit D-21 and Pitfall 7 exist to prevent"
    - "`not_run` as a first-class terminal state with a REQUIRED `reason`, asserted by validating a document both ways rather than by reading the `allOf` back"
    - "Verdict/measurement agreement as a gate assertion: a recorded verdict must agree with the number sitting beside it"
    - "The identity encoding as a CONTROL rather than as evidence — under identity the wire count and the decompressed count are the same number, so that block can agree with either hypothesis and decides nothing"

key-files:
  created:
    - scripts/phase6/o07-body-length.sh
    - scripts/phase6/o07-assemble.py
    - probe/phase6-o07/manifest.json
    - probe/phase6-o07/backend/script.js
    - tests/phase6-o07.spec.ts
    - .planning/phases/06-retroactive-scan-deployment-reality/results/o07-body-length.schema.json
    - .planning/phases/06-retroactive-scan-deployment-reality/results/o07-body-length.json
  modified:
    - .gitignore

key-decisions:
  - "O-07 is ANSWERED: both `sdk.requests.get()` and `sdk.requests.query()` report the decompressed identity byte count on Caido 0.58.2 (457,965 B against wire counts of 122,370 / 101,727 / 127,907). The 7.25x retro-path hole the question was opened for is NOT present on this build."
  - "The measurement runs through a NEW probe plugin, not through the shipped `startScan`: the shipped build cannot reach the `query()` path at all, because `startScan` refuses any non-empty operator clause until 06-04 and `runScanProducer` has no caller until 06-03."
  - "The `query()` walk is UNFILTERED. Caido's `req.path` / `req.query` / `cont` implementations are this phase's own unmeasured O-03/O-06, and a filtered walk returning nothing would make 'no body on this path' and 'the clause did not match' indistinguishable."
  - "The verdict is decided on the three COMPRESSED encodings only. The identity block is the control that proves the plumbing measured anything."
  - "A split across the three compressed encodings would be recorded as `not_measured`, never as a majority vote."

patterns-established:
  - "Refusals are MEASURED, not claimed: the 8080 refusal and the version-mismatch refusal were each executed and their exit codes and the artifact's unchanged hash recorded"
  - "A phase sourcing `instance.sh` into a new results root adds its own `.gitignore` token/host-log rules in the same commit — the existing rules are path-specific and silently do not cover a third root"

requirements-completed: [FIND-03]

coverage:
  - id: D1
    description: "O-07 is MEASURED rather than assumed: a recorded artifact states that `Body.length` on the `sdk.requests.get()` and `sdk.requests.query()` read paths reports the DECOMPRESSED identity byte count on Caido 0.58.2"
    requirement: FIND-03
    verification:
      - kind: e2e
        ref: "bash scripts/phase6/o07-body-length.sh (run 20260831T163144Z-6077)"
        status: pass
      - kind: unit
        ref: "tests/phase6-o07.spec.ts#the verdict agrees with its own measurements > reads each per-encoding count as the count its verdict names"
        status: pass
      - kind: unit
        ref: "tests/phase6-o07.spec.ts#the measurement is non-vacuous > the %s block carries both read paths' byte counts, or the run is not_run"
        status: pass
    human_judgment: false
  - id: D2
    description: "The probe proxies the gzip, brotli and zstd fixtures through a fresh version-asserted instance, drains the consumer, and reads `counters.byteLenMismatch` off `getStatus` — a shipped, running instrument, not new code"
    requirement: FIND-03
    verification:
      - kind: e2e
        ref: "results/runs/20260831T163144Z-6077/raw/status.json — admitted=4, reloadHit=4, byteLenMismatch=0"
        status: pass
      - kind: unit
        ref: "tests/phase6-o07.spec.ts#the measurement is non-vacuous > compared a real number of reloads before reporting byte_len_mismatch"
        status: pass
    human_judgment: false
  - id: D3
    description: "The probe compares a `query()`-returned `Body.length` against the known identity byte count of the same fixture — the half that matters for the retro path"
    requirement: FIND-03
    verification:
      - kind: e2e
        ref: "results/runs/20260831T163144Z-6077/raw/query.json — 457,965 on all four encodings"
        status: pass
      - kind: unit
        ref: "tests/phase6-o07.spec.ts#the verdict agrees with its own measurements > reads each per-encoding count as the count its verdict names"
        status: pass
    human_judgment: false
  - id: D4
    description: "The result artifact names the build it describes, and the harness refuses to write one when the binary reports a version other than the pinned constant (D-21)"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "tests/phase6-o07.spec.ts#the O-07 artifact > names the build it describes, and that build is Phase 6's own constant"
        status: pass
      - kind: manual_procedural
        ref: "CAIDO_BIN=$HOME/.caido/caido-cli bash scripts/phase6/o07-body-length.sh -> exit 1, 'version mismatch. expected 0.58.2, got 0.55.3', artifact sha256 unchanged"
        status: pass
    human_judgment: false
  - id: D5
    description: "The result artifact is written under this phase's own results directory and never into `.planning/phases/00-runtime-reality-check/results/` (Pitfall 7, T-06-11)"
    requirement: FIND-03
    verification:
      - kind: other
        ref: "git status --porcelain .planning/phases/00-runtime-reality-check/results/ -> empty after the run"
        status: pass
    human_judgment: false
  - id: D6
    description: "A probe that could not run is recorded with its reason and never as a pass (D-23's discipline)"
    requirement: FIND-03
    verification:
      - kind: manual_procedural
        ref: "corpus/encoded/fixtures.json moved aside -> status: not_run, reason names `node scripts/spike/make-encoded-fixtures.mjs`, both verdicts not_measured, schema-valid, exit 0"
        status: pass
      - kind: unit
        ref: "tests/phase6-o07.spec.ts#the O-07 result schema > admits `not_run` and REQUIRES a reason alongside it"
        status: pass
    human_judgment: false
  - id: D7
    description: "The artifact carries nothing about the operator's machine — no absolute path outside the binary it names, no home-directory path, no username"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "tests/phase6-o07.spec.ts#the artifact carries nothing about this machine (T-06-10) (3 assertions)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The gate fails closed on an absent artifact and catches a verdict that disagrees with its own measurement"
    requirement: FIND-03
    verification:
      - kind: manual_procedural
        ref: "artifact absent -> 13 failed / 7 passed / 0 skipped, remedy named 9 times; hand-edited artifact (get_path_reports identity, byte_len_mismatch 7) -> exactly 1 failure, that assertion"
        status: pass
    human_judgment: false

duration: 17 min
completed: 2026-08-31
status: complete
---

# Phase 6 Plan 02: The O-07 Body-Length Probe Summary

**Both read paths measured on Caido 0.58.2: `sdk.requests.get()` and `sdk.requests.query()` each report the DECOMPRESSED identity byte count (457,965 B) against wire counts of 122,370 / 101,727 / 127,907 — so `admit()`'s size axis is sound on the retro path and the 7.25x hole O-07 was opened for is not present on this build.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-08-31T16:19:00Z
- **Completed:** 2026-08-31T16:36:00Z
- **Tasks:** 2
- **Files created/modified:** 8

## The answer

This is the **first measurement of either read path in this project**. SPIKE-08's own
method names one surface — "twice through the Caido proxy… A Tier-0 probe recorded,
per **intercepted response**…" — and neither `sdk.requests.get()` nor
`sdk.requests.query()` appears anywhere in it. `SIZE_GATE_SOURCE`,
`BODY_STORED_DECOMPRESSED` and `BODY_LENGTH_EQUALS_RAW_LENGTH` all carry SPIKE-08 and
all describe the hook; none of the three is cited here as evidence about a read path.

| encoding | identity bytes | wire bytes | ratio | `get()` `toRaw().length` | `query()` `Body.length` |
|---|---|---|---|---|---|
| identity | 457,965 | 457,965 | 1.00x | 457,965 | 457,965 |
| gzip | 457,965 | 122,370 | 3.74x | 457,965 | 457,965 |
| br | 457,965 | 101,727 | 4.50x | 457,965 | 457,965 |
| zstd | 457,965 | 127,907 | 3.58x | 457,965 | 457,965 |

**Verdict:** `get_path_reports: identity`, `query_path_reports: identity`.
**The shipped instrument agrees:** `counters.byteLenMismatch = 0` over 4 reload
comparisons, read off the shipped `getStatus` after the consumer drained.

The verdict is decided on the **three compressed encodings only**. Under `identity`
the wire count and the decompressed count are the same number, so that block would
agree with whichever hypothesis was proposed; it is recorded as the control proving
the plumbing measured something. A split across the three would have been recorded as
`not_measured`, never as a majority vote.

**Method, and the binary it was measured against:**
`/Applications/Caido.app/Contents/Resources/bin/caido-cli`, reported version
**0.58.2**, SHA-256 recorded in the artifact. One fixture (`ace-small.js`, 457,965
decompressed bytes) served by `scripts/spike/origin.py` under four explicit
`Content-Encoding`s. Per encoding, two fetches: one **direct** at the origin with no
proxy and no `--compressed` (the authoritative wire byte count, measured rather than
taken from the fixture manifest — the manifest's numbers came from Node's codecs and
the origin compresses with Python's), and one **through** a fresh isolated Caido with
a matching `Accept-Encoding`. The shipped DefMiner build and `probe/phase6-o07` were
both installed; after the drain, `byteLenMismatch` came off the shipped `getStatus`,
then `sdk.requests.get(id)` and one
`sdk.requests.query().descending("req","id").first(50).execute()` were measured
per request id.

`babel-large.js` is deliberately excluded: at 2,983,904 bytes it is above
`AST_MAX_BYTES` (1,334,405), so `admit()` rejects it `too_large`, it never enters the
queue, it is never reloaded, and it could contribute nothing to `byteLenMismatch`.

## Accomplishments

- **O-07 settled by measurement on both read paths**, with the number, the method and
  the binary version recorded in a schema-validated, re-runnable artifact.
- **`counters.byteLenMismatch` turned from a shipped instrument into a recorded
  measurement** — zero new production code, as the plan required.
- **A fail-closed artifact gate** with a verdict/measurement agreement assertion,
  proven to fire on a hand-edited artifact.
- **Two measured facts about the plugin-function RPC route** that no shipped script
  states: every `args` element must be a **string**, and the route **JSON-decodes each
  one once** before the handler sees it. Both were discovered by failing: an args
  array carrying a nested array is rejected `invalid type: sequence, expected a
  string`, and a singly-encoded string arrives as an array, `String()`s to `1,2` and
  fails to re-parse with `unexpected data at the end`.
- **Both refusal paths and the `not_run` path executed**, not asserted in prose.

## Task Commits

1. **Task 1: the result schema and the artifact gate** — `78d46ae` (test)
2. **Task 2: the O-07 probe script, and one recorded run** — `ee19376` (feat)

## Files Created/Modified

- `.planning/phases/06-.../results/o07-body-length.schema.json` — the result schema. A
  SIBLING of `spike-result.schema.json`, not a reuse: Phase 0's shape is a `spike` id
  plus a `measurements` ARRAY of name/value/unit triples closed over a threshold enum,
  and O-07 needs four named encodings x five byte counts x one verdict per read path.
- `tests/phase6-o07.spec.ts` — the gate. Phase 6's own `EXPECTED_CAIDO_VERSION`.
- `scripts/phase6/o07-body-length.sh` — the probe driver. SOURCES `instance.sh`.
- `scripts/phase6/o07-assemble.py` — classification and artifact assembly.
- `probe/phase6-o07/{manifest.json,backend/script.js}` — the read-path probe plugin.
- `.planning/phases/06-.../results/o07-body-length.json` — the recorded run.
- `.planning/phases/06-.../results/runs/20260831T163144Z-6077/` — the run directory
  (fetch matrix, hook rows, both read legs, the shipped `getStatus`).
- `.gitignore` — Phase 6's token and host-log rules.

## Decisions Made

**1. The probe plugin exists because the shipped build cannot reach the `query()`
path.** See Deviations. The shipped plugin still supplies `byteLenMismatch`; the probe
supplies the direct per-encoding numbers. This also makes the measurement a statement
about the **SDK**, which is what O-07 actually asks, rather than about DefMiner's
plumbing.

**2. The `query()` walk carries no filter.** The obvious shape is
`.filter(<the fixture's path>)` and it would confound the measurement: Caido's
`req.path` / `req.query` / `cont` implementations are this phase's own unmeasured
O-03/O-06, so a filtered walk returning nothing would leave "the read path reports no
body" and "the clause did not match" indistinguishable. The walk is instead ordered
`descending("req","id")` — the same total order the shipped producer uses, because
`id` is a unique integer and `created_at` ties — and items are matched by the request
id the hook already recorded. **The consequence is named rather than buried: this
verdict does not cover a FILTERED `query()` page.** Recorded in `.planning/WINDOWS.md`
(entry 69) against 06-11's push-down proof.

**3. The verdict is decided on the compressed encodings only**, with `identity` as the
control. A split is `not_measured`, not a vote.

**4. Phase 6 owns ports 8961-8965**, a new block below Phase 0's (8999, 8998,
8991-8996, 8981-8985, 8081-8083) and Phase 1's (8971-8975). Nothing in the script kills
a process it did not start; the long-lived 8998 recorder instance was never touched.

**5. `instance.sh` is byte-unchanged.** `EXPECT_VERSION=0.58.2` is passed IN from
`MATRIX_EXPECTED_VERSION` at the top of the driver. Its 0.57.1 default is Phase 1's
tripwire and stays where it is (D-21).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's `query()` leg is not executable on the shipped build**
- **Found during:** Task 2, before the first run
- **Issue:** Task 2 step 5 says "issue the shipped `startScan` RPC with an operator
  clause narrowing to the fixture's own path, let the producer walk one page, and
  record the `Body.length` the `query()` path reported". Neither half is reachable:
  `packages/backend/src/index.ts` returns
  `{ outcome: "refused", reason: "operator-clause-unsupported" }` for **any** non-empty
  `operatorFilter` until plan 06-04 ships the validator, and `runScanProducer` has no
  caller until 06-03 ships the watermark (06-01's own recorded stub, WINDOWS entry 67).
  With no caller, `startScan` inserts a row and walks nothing.
- **Fix:** Added `probe/phase6-o07`, a probe plugin in `probe/tier0-budgets`' shape,
  which calls `sdk.requests.get(id)` and `sdk.requests.query()…execute()` directly.
  The shipped DefMiner build is still installed alongside it and is still the sole
  source of `counters.byteLenMismatch`, so the plan's "shipped, running instrument,
  not new code" requirement is met for the `get()` half exactly as written.
- **Files added:** `probe/phase6-o07/manifest.json`,
  `probe/phase6-o07/backend/script.js`
- **Verification:** The run recorded both read paths for all four encodings.
- **Committed in:** `ee19376`
- **Ledger:** `.planning/WINDOWS.md` entry 68, so 06-03/06-04 can repeat the
  measurement through the real producer once it has a caller.

**2. [Rule 3 - Blocking] The plugin-function RPC route double-encodes its arguments**
- **Found during:** Task 2, first live run
- **Issue:** `probe_call reloadMeasure '[["1","2"]]'` was rejected with
  `invalid type: sequence, expected a string`. Re-sent singly encoded, it reached the
  handler as an **array**, which `String()`d to `1,2` and failed `JSON.parse` with
  `unexpected data at the end`.
- **Fix:** Both facts are now stated where they are used, and arguments are
  double-encoded via `scripts/spike/run-spike-09-12.sh`'s `jargs` shape (copied rather
  than sourced — that file is a driver, not a library).
- **Files modified:** `scripts/phase6/o07-body-length.sh`,
  `probe/phase6-o07/backend/script.js`
- **Verification:** `reloadMeasure` returned four rows on the third run.
- **Committed in:** `ee19376`

**3. [Rule 2 - Missing Critical] Phase 6 had no `.gitignore` token/host-log rules**
- **Found during:** Task 2, before the first run
- **Issue:** `instance.sh` writes a live guest bearer token and copies Caido's
  `--debug` host log into `$OUT/runs/$RUN_ID/`. The existing controls (threat T-00-14)
  are **path-specific** — one block for Phase 0's results root and one for Phase 1's —
  and Phase 6 sources the same launcher into a **third** root. Without new rules, a run
  that died before teardown could commit a live credential.
- **Fix:** Added the three Phase 6 rules beside the Phase 1 ones, with the reason.
- **Files modified:** `.gitignore`
- **Verification:** `git add -An` over the run directory lists nine files and **no**
  `token` and **no** `*.log`.
- **Committed in:** `ee19376`

**4. [Rule 3 - Blocking] Task 1's `<verify>` contradicts its own acceptance criterion**
- **Found during:** Task 1
- **Issue:** The `<verify>` fails when the spec exits non-zero, while acceptance
  criterion 1 requires the spec to **fail** with the artifact absent — which it is at
  task-1 time.
- **Fix:** Executed as a RED gate and recorded both readings rather than changing
  either the gate or the plan: 13 failed / 7 passed / **0 skipped** at task 1, and 20
  passed after task 2 wrote the artifact.
- **Verification:** Both runs recorded above.
- **Ledger:** `.planning/WINDOWS.md` entry 70.

**5. [implementation detail, not a rule] One extra script file**
- `scripts/phase6/o07-assemble.py` holds the classification and artifact assembly. The
  shell/python split is `run-spike-08.sh` + `analyse-spike-08.py`'s, unchanged — the
  shell owns the instance, the ports and the fetches, and the classification lives
  where it can be read.

---

**Total deviations:** 4 auto-fixed (3 blocking, 1 missing-critical) plus one file-split
implementation note.
**Impact on plan:** The `query()` half is measured through a probe rather than through
the shipped producer, which is the only material change and is a consequence of 06-01's
deliberate sequencing rather than of anything wrong here. Every `must_haves` truth is
satisfied. No scope creep: no production code was touched.

## Issues Encountered

- **Three runs were needed**, and each failure was informative rather than wasted: the
  first died on the RPC arg type, the second on the RPC arg encoding depth, and the
  third produced the measurement. The intermediate run had already recorded
  `query_path_reports: identity` correctly, with `get_path_reports: not_measured` and
  `status: not_run` — which is the D-23 path behaving exactly as designed on a
  genuinely incomplete measurement.
- **Caido serves the proxied client an identity body regardless of `Accept-Encoding`.**
  Every proxied fetch returned 457,965 client bytes even when the client advertised
  `gzip` / `br` / `zstd` and the origin sent the compressed form. Noted as an
  observation of this build, not as a claim about Caido's design, and not load-bearing
  for the verdict — the wire byte counts come from the **direct**, unproxied fetches.

## Known Stubs

None. This plan added no production code.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change. The
probe binds 127.0.0.1 only, never 8080, mints its guest token through `instance.sh`'s
`umask 077` path, and kills only the processes it started.

## User Setup Required

None beyond the plan's own precondition, which was checked and met before task 2 ran:
`/Applications/Caido.app/Contents/Resources/bin/caido-cli --version` reported
`Caido 0.58.2`, and `corpus/encoded/` was present.

## Next Phase Readiness

- **06-03 (backpressure watermark) and 06-06 (retro counters) are unblocked and their
  design is unchanged.** The reload-side size gate 06-06 ships was always the
  authoritative check by design; this measurement says the query-side filter is not
  hiding a 7.25x hole behind it either. The answer is confirmatory, not corrective.
- **06-11 (push-down proof) inherits one named gap:** this verdict does not cover a
  **filtered** `query()` page. WINDOWS entry 69.
- **06-04 (operator clause validator) and 06-03 own WINDOWS entry 68** — once
  `runScanProducer` has a caller and `startScan` accepts a validated clause, the
  `query()` measurement can be repeated through the real producer, which is the shape
  the retro scan will actually run.
- Baseline held: **2361 tests passing** (2341 before, +20 from this gate), with
  typecheck, lint, knip, bundle, css and externals all exit 0, and
  `git status --porcelain` over the Phase 0 results directory empty.

---
*Phase: 06-retroactive-scan-deployment-reality*
*Completed: 2026-08-31*

## Self-Check: PASSED

All eight created files present on disk; all three commits (`78d46ae`, `ee19376`,
`b396d0d`) present in `git log --oneline --all`.
