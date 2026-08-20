---
gsd_state_version: '1.0'
status: planning
progress:
  total_phases: 12
  completed_phases: 0
  total_plans: 52
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-20)

**Core value:** When a target's JavaScript contains something that expands the attack surface, DefMiner surfaces it — with a low enough false-positive rate that the operator actually reads every finding.
**Current focus:** Phase 0 — Runtime Reality Check

## Current Position

Phase: 0 of 12 (Runtime Reality Check)
Plan: 0 of 4 in current phase
Status: Ready to plan
Last activity: 2026-08-20 — Project initialized; five research tracks complete; roadmap revised after Codex adversarial review (12 phases, 136 requirements, 5 dependency inversions corrected)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

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

### Known Risks Carried Forward

| Risk | Status |
|---|---|
| ReDoS is unrecoverable — Caido installs no QuickJS interrupt handler, so `lre_check_timeout` is inert | Gated on SPIKE-01 |
| `setTimeout(fn, 0)` may not yield the event loop, invalidating budget-and-background | Gated on SPIKE-02 |
| `caido/caido#2211` — cumulative `sdk.requests.send()` aborts the process | Gated on SPIKE-04; accepted for `.map` default |
| Content-hash cache hit rate is the biggest performance lever; 40% instead of 90% means 6× the CPU budget | Gated on SPIKE-10 |
| Asset identity across deploys is unsolved; blocks cross-deploy diffing | Gated on SPIKE-13; DIFF-01 deferred to v2 |
| No memory limit is set — OOM aborts the host rather than throwing | Size ceilings enforced by us, set in Phase 0 |

### Cross-AI Review

Codex (`gpt-5.6-sol`, xhigh) is configured as the default GSD reviewer (`review.default_reviewers`).

- `.planning/research/CODEX-CONTRAST.md` — its independent design research (produced without sight of the other tracks)
- `.planning/research/CODEX-REVIEW-01.md` — its adversarial review of the plan. Found: 2 blockers, 8 high-severity issues, 5 dependency inversions, a 47-requirement undercount, and one thing all five research tracks missed (the backend filesystem is server-side, not the operator's machine)
- `.planning/research/SUMMARY.md` — synthesis, including a corrected treatment of what convergence between two LLMs actually proves

**Corrections it forced:** `ACTIVE-03` claimed `sdk.requests.send()` inherits authentication — the SDK documents routing only. `.map` probing on authenticated apps now requires an explicit credential-propagation contract.

### Pending Todos

None.

---
*Last updated: 2026-08-20 after initialization*
