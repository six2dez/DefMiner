---
gsd_state_version: 1.0
milestone: v2
current_phase: 01
current_phase_name: Skeleton, Persistence & Compatibility
status: executing
stopped_at: Completed 01-01-PLAN.md
last_updated: "2026-08-20T20:55:35.701Z"
last_activity: 2026-08-20
last_activity_desc: Phase 01 execution started
state_head: 14714dddc250a896f204d757a10b6f8e8559d5a6
progress:
  total_phases: 11
  completed_phases: 0
  total_plans: 6
  completed_plans: 1
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-20)

**Core value:** When a target's JavaScript contains something that expands the attack surface, DefMiner surfaces it — with a low enough false-positive rate that the operator actually reads every finding.
**Current focus:** Phase 01 — Skeleton, Persistence & Compatibility

## Current Position

Phase: 01 (Skeleton, Persistence & Compatibility) — EXECUTING
Plan: 2 of 6
Status: Ready to execute
Last activity: 2026-08-20 — Phase 01 execution started

Progress: [█░░░░░░░░░] 8%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 00 P01 | 33m | 3 tasks | 45 files |
| Phase 00 P02 | 105m | 3 tasks | 53 files |
| Phase 00 P03 | 45m | 3 tasks | 46 files |
| Phase 00 P04 | 92 | 3 tasks | 123 files |
| Phase 01 P01 | 35 min | 2 tasks | 38 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Those affecting current work:

- **Init**: Build on Caido, not a JSMiner port — JSMiner is unmaintained since 2023 and its detection ceiling is low
- **Init**: Parity baseline is `caido-community/JS-Analyzer`, not JSMiner. The differentiator is architectural — a pipeline that actually analyses, persists, aggregates, and diffs
- **Init**: Hybrid regex + AST engine. Meriyah over Acorn, confirmed independently by two models with separate benchmarks
- **Init**: Extract JWT / GraphQL / CSP data, do not analyse it deeply — dedicated Caido plugins already own those niches
- **Init**: Raw secrets never persisted; HMAC fingerprint plus redacted preview, revealed by re-verifying the original request's body hash
- **Init**: ⚠️ `.map` guessing ON by default and unbudgeted, per operator decision taken with `caido/caido#2211` evidence on the table. Accepted risk: cumulative `sdk.requests.send()` can abort `caido-cli`. Mitigation is diagnostic only (visible send counter). Revisit if fixed upstream
- **Init**: Detector corpus from permissive sources only — gitleaks, nuclei-templates, retire.js, jsluice. TruffleHog (AGPL) and SecretFinder (GPL) studied, never copied
- **Init**: Detector rules ship with the plugin version — the Caido Developer Policy forbids any plugin self-update mechanism
- [Phase 0]: setTimeout(fn,0) is the only primitive that yields the QuickJS event loop; cost 5.03ms median, so the yield trigger must be temporal (MAX_SYNC_SLICE_MS=25), not per-chunk
- [Phase 0]: RSS is a high-water mark, not a live gauge — it never falls, so QUAL-06 cannot assert 'memory after <= memory before'
- [Phase 0]: TextDecoder is reachable from no module, but string_decoder.StringDecoder and buffer.Buffer are — ENC-01/ENC-02 bind to those
- [Phase 0]: A Caido instance with no project selected fails all proxying and never fires onInterceptResponse — a prerequisite for every traffic-observing spike
- [Phase 0]: sdk.meta.db().exec takes no bind parameters; binding requires prepare() then Statement.run(...params)
- [Phase 0]: SIZE_GATE_SOURCE is decompressed identity bytes — Caido decodes gzip/br/zstd before onInterceptResponse
- [Phase 0]: MAX_NESTING_DEPTH taken as the minimum across nesting shapes (246 parens, not 710 brackets)
- [Phase 0]: HARD_MAX_BYTES is time-bound not memory-bound; the timeout boundary was deliberately not bisected
- [Phase 0]: Phase 1 storage must use single-statement idempotent upserts — BEGIN does not span exec calls, and fails silently
- [Phase 0]: MAP-04 containment can use an lstat component walk; lstat exists on this build, realpath does not
- [Phase 0]: onInterceptResponse fires for proxied traffic ONLY — replay, automate, workflow, plugin sends and caido:http fetch are all invisible to it (SPIKE-05)
- [Phase 0]: sdk.requests.send() does not re-fire the hook under any save/plugins combination, so ACTIVE-06 self-suppression is belt-and-braces, not load-bearing
- [Phase 0]: A browser-cache hit never enters Caido at all and a 304 arrives with a zero-length body and no content-type — RETROACTIVE_SCAN_MANDATORY is true
- [Phase 0]: Caido QUEUES intercept events: 499 survived a 30 s handler block and arrived in a 20 ms burst, contiguous, nothing lost; the proxy never stalled
- [Phase 0]: Caido surfaces neither a synchronous throw nor an async rejection from a handler — ERR-03/OBS-01 must do all error visibility themselves
- [Phase 0]: SPIKE-01: a catastrophic regex hangs the QuickJS thread with no interrupt and no in-runtime recovery — SIGKILL is the only way out, and attempting togglePlugin against a wedged plugin takes every OTHER plugin's RPC down with it
- [Phase 0]: re2js adopted for generic-shaped rules only (adopt-generic): 59.7x slower in aggregate but FASTER than native on 7 of 13 literal-anchored rules; runs inside DET-06's bounded windows, native keeps the whole-body prefilter
- [Phase 0]: caido/caido#2211 did not reproduce at 2,000 sends in either wrapper shape, so SEND_CLIFF_* are FLOORS not cliffs; Phase 8 must re-test with real .map bodies and concurrent sends before treating the floor as headroom
- [Phase 0]: ACTIVE-02's write-ahead journal validated against four real abrupt host deaths: 2 caught the exact in-flight send, 2 correctly left no open row, 0 false positives
- [Phase 0]: last_insert_rowid() is unusable on sdk.meta.db()'s pooled connection — STORE-01..07 must key writes on a natural key
- [Phase 0]: togglePlugin genuinely rebuilds the QuickJS runtime (new session id, per-runtime counter reset to 0) and the plugin database survives it, so ACTIVE-13 has a cheap reset primitive — but only while the runtime still answers
- [Phase 0]: CACHE_HIT_RATE_CROSS_DAY is inconclusive at 1 sampled day and a zero denominator; Phase 1 CORE-08 budgets against CACHE_HIT_RATE_ASSUMED=0.40 until it is re-measured after 2026-09-03
- [Phase 0]: go-no-go.json is the only Phase 0 artifact later phases may import; every tunable constant must import from it and be asserted equal by a test in the SDK-free engine workspace

### Known Risks Carried Forward

| Risk | Status |
|---|---|
| ReDoS is unrecoverable — Caido installs no QuickJS interrupt handler, so `lre_check_timeout` is inert | Gated on SPIKE-01 |
| `setTimeout(fn, 0)` may not yield the event loop, invalidating budget-and-background | Gated on SPIKE-02 |
| `caido/caido#2211` — cumulative `sdk.requests.send()` aborts the process | Filed against **0.57.1 — the exact target build**, so SPIKE-04 is a direct reproduction, not an extrapolation. Accepted for the `.map` default |
| Content-hash cache hit rate is the biggest performance lever; 40% instead of 90% means 6× the CPU budget | Gated on SPIKE-10 |
| Asset identity across deploys is unsolved; blocks cross-deploy diffing | SPIKE-13 and DIFF-01 both moved to v2 — the spike served only the deferred feature |
| No memory limit is set — OOM aborts the host rather than throwing | Size ceilings enforced by us, set in Phase 0 |

### Cross-AI Review

Codex (`gpt-5.6-sol`, xhigh) is configured as the default GSD reviewer (`review.default_reviewers`).

- `.planning/research/CODEX-CONTRAST.md` — its independent design research (produced without sight of the other tracks)
- `.planning/research/CODEX-REVIEW-01.md` — its adversarial review of the plan. Found: 2 blockers, 8 high-severity issues, 5 dependency inversions, a 47-requirement undercount, and one thing all five research tracks missed (the backend filesystem is server-side, not the operator's machine)
- `.planning/research/SUMMARY.md` — synthesis, including a corrected treatment of what convergence between two LLMs actually proves

**Corrections it forced:** `ACTIVE-03` claimed `sdk.requests.send()` inherits authentication — the SDK documents routing only. `.map` probing on authenticated apps now requires an explicit credential-propagation contract.

### Phase 0 Planning Notes

The verification loop found 11 real defects across three rounds — **none conceptual**. Requirement coverage, SPIKE ID mapping, wave disjointness, and the no-in-runtime-memory discipline were correct in the first draft. Every failure was the same shape: *the prose stated a rule correctly, and the gate checked less than the prose claimed.*

- Round 1 — three verify gates that lied (one green on failure, one erroring on success, one a jq type error), the fresh-instance policy asserted in prose across four plans but mechanised in only one, a schema two plans consumed and neither could amend, and a definitional contradiction where the only path through the gate was fabricating a number
- Round 2 — the corrected rule was **asymmetric**: it closed the null path and left the fabrication path open, so the one shape named as fabrication was the one shape that passed. Plus a gate that failed against the implementation its own plan mandated
- Round 3 — the biconditional left a third route: zero cross-day denominator with sufficient days, where `0.0` passes as a measurement of something undefined

Lesson for later phases: a plan that states a policy in four places and asserts it in one passes any review done by reading. Only executing the gates catches it.

### Pending Todos

None.

---
*Last updated: 2026-08-20 after initialization*

## Session

**Last session:** 2026-08-20T20:55:35.687Z
**Stopped at:** Completed 01-01-PLAN.md
**Resume file:** None

### Blockers

- SPIKE-10 cross-day cache hit rate is UNDEFINED (1 day sampled, denominator 0) and collection has STOPPED — the recorder LaunchAgent was uninstalled and the 8998 instance killed per plan 00-04's teardown responsibility. Phase 1 budgets against CACHE_HIT_RATE_ASSUMED=0.40. To re-measure: bash scripts/spike/recorder-agent.sh install, let it span 2+ calendar days, then re-run analyse-spike-10.py + aggregate.py + render-go-no-go.py. Revisit after 2026-09-03.
