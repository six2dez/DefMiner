---
schema_version: 1
open_count: 16
waived_count: 0
fixed_count: 2
total_count: 18
last_updated: 2026-08-21T15:10:49.050Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 00 | unrun-verify | scripts/spike/recorder-session.sh |  | Task 3 optional human-check not run: operator has not routed a real browser through 127.0.0.1:8998. Scripted sessions collect regardless. | open |  | 2026-08-20T12:42:36.666Z |  |
| 2 | 00 | deviation | tests/spike-results.spec.ts | 47 | Gate asserts every threshold value is non-null, but spike-result.schema.json permits null for the inconclusive cross-day case. Plan 00-04 must reconcile. | fixed |  | 2026-08-20T12:42:36.735Z | 2026-08-20T12:45:07.474Z |
| 3 | 00 | unrun-verify | .planning/phases/00-runtime-reality-check/00-04-PLAN.md |  | Task 3 credential-scan <automated> clause scans the filesystem, not git-tracked files; it fires on 106 gitignored raw host logs matching the GraphQL field name accessToken. Zero token-shaped strings anywhere; the git-tracked scan the plan's action text and T-00-45 both specify is clean and ships in tests/go-no-go.spec.ts. | open |  | 2026-08-20T17:05:14.845Z |  |
| 4 | 00 | deviation | .planning/phases/00-runtime-reality-check/results/SPIKE-04.json |  | SEND_CLIFF_SAVE_TRUE/SAVE_FALSE/FETCH are FLOORS (2000, cap reached) not cliffs — caido/caido#2211 did not reproduce in either wrapper shape. Phase 8 must re-test with real .map bodies and concurrent sends before treating the floor as headroom. | open |  | 2026-08-20T17:05:24.949Z |  |
| 5 | 00 | deviation | .planning/phases/00-runtime-reality-check/results/SPIKE-10.json |  | CACHE_HIT_RATE_CROSS_DAY is null/inconclusive (1 day sampled, denominator 0) and collection has stopped; Phase 1 budgets against CACHE_HIT_RATE_ASSUMED=0.40. Re-install the recorder agent and re-measure after 2026-09-03. | fixed |  | 2026-08-20T17:05:25.014Z | 2026-08-20T18:06:03.807Z |
| 6 | 00 | unrun-verify | .planning/phases/00-runtime-reality-check/results/go-no-go.json |  | CACHE_HIT_RATE_CROSS_DAY inconclusive, revisit_after 2026-09-03. Recorder RE-ARMED 2026-08-20 (com.defminer.spike.recorder, twice daily) so a second calendar day accrues. Phase 1 CORE-08 must read this threshold from config with the 0.40 pessimistic default, never hard-code it. Close by re-running aggregate.py + render-go-no-go.py once CACHE_SAMPLE_DAYS >= 2. | open |  | 2026-08-20T18:05:34.808Z |  |
| 7 | 01 | stub | packages/backend/src/ingest/consumer.ts |  | walk()'s visit callback is a no-op — no detector exists until Phase 3; the walk's yielding, deadline and offset accounting are real regardless | open |  | 2026-08-20T22:55:56.313Z |  |
| 8 | 01 | stub | packages/engine/src/decode.ts |  | decode.ts has no consumer in the shipped bundle until a frontend exists (Phase 3/5); ENC-01's byte-vs-text inequality is proven by decode.spec.ts today | open |  | 2026-08-20T22:55:56.411Z |  |
| 9 | 01 | deviation | knip.json |  | knip ignoreExportsUsedInFile:true hides a dead export referenced once in its own file — accepted to restore the exports/types gate to error; revisit in Phase 5 | open |  | 2026-08-20T22:55:56.507Z |  |
| 10 | 01 | deviation | packages/backend/src/compat.ts |  | COMPAT-01's operator-visible message is delivered as a host-log line plus a getStatus()/getCompat() RPC only, with no visible UI: the backend QuickJS surface has NO toast or notification API (exhaustive grep for showToast, Toast and notification across @caido/quickjs-types finds nothing), and sdk.api.send has no subscriber because Phase 1 ships no frontend. Decision P6-D2. Phase 5 owes the visible surface. | open |  | 2026-08-21T00:02:00.191Z |  |
| 11 | 01 | stub | packages/backend/src/store/observations.ts |  | Path-embedded token in a URL path SEGMENT is NOT redacted — named residual, pinned by observations.spec.ts's RESIDUAL case | open |  | 2026-08-21T13:56:33.328Z |  |
| 12 | 01 | stub | packages/backend/src/telemetry.ts |  | Windows C:\\\\ paths are not redacted by redactPaths, and a path containing a space loses only the portion before the space — both named residuals | open |  | 2026-08-21T13:56:33.426Z |  |
| 13 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | Accepted residual T-01-51: a value crossing a function boundary or more than one hop of indirection is beyond the walk; reported as outbound-unanalysable only where the walk can tell indirection is happening | open |  | 2026-08-21T14:18:53.110Z |  |
| 14 | 01 | deviation | packages/backend/src/store/error-redaction.spec.ts |  | Accepted residual (boundary 2): the STORE-07 walk builds no symbol table and is scope-blind — the caught binding is resolved by NAME, copy tracking is ONE hop, and a value crossing a function boundary is beyond it | open |  | 2026-08-21T14:33:35.305Z |  |
| 15 | 01 | deviation | packages/backend/src/compat.ts | 317 | T-01-37 accept: renders String(e).slice(0,160) into the per-surface error field, outside the STORE-07 gate's store/ scope. OWNER: Phase 2, ERR-04 (ROADMAP.md:396) | open |  | 2026-08-21T14:33:35.405Z |  |
| 16 | 01 | deviation | packages/backend/src/hooks/passive.ts | 171 | T-01-37 accept: renders String(e).slice(0,160) into sdk.console.log on the hook error path, outside the STORE-07 gate's store/ scope. OWNER: Phase 2, ERR-03 (ROADMAP.md:396) | open |  | 2026-08-21T14:33:35.502Z |  |
| 17 | 01 | deviation | .planning/REQUIREMENTS.md |  | T-01-76 accept: STORE-03 and STORE-07 are declared by redaction plans for work neither requirement's text mentions. Deferred WITH AN OWNER by plan 01-10 task 3 — the operator, at the next requirements pass | open |  | 2026-08-21T14:33:35.597Z |  |
| 18 | 01 | deviation | scripts/phase1/tracer-e2e.sh |  | URL userinfo redaction cannot be proven at the live tier: curl lifts user:pass@ into an Authorization: Basic header, so userinfo never reaches observations.url. Measured in run 20260821T150022Z-16902 (userinfo-measurement.txt) and enforced instead by the observations.spec.ts real-SQLite round trip. Live-tier coverage for this one grammar is a documented gap, not a passing assertion. | open |  | 2026-08-21T15:10:49.050Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "00",
    "file": "scripts/spike/recorder-session.sh",
    "line": null,
    "description": "Task 3 optional human-check not run: operator has not routed a real browser through 127.0.0.1:8998. Scripted sessions collect regardless.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T12:42:36.666Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "00",
    "file": "tests/spike-results.spec.ts",
    "line": 47,
    "description": "Gate asserts every threshold value is non-null, but spike-result.schema.json permits null for the inconclusive cross-day case. Plan 00-04 must reconcile.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-20T12:42:36.735Z",
    "resolved_at": "2026-08-20T12:45:07.474Z"
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "00",
    "file": ".planning/phases/00-runtime-reality-check/00-04-PLAN.md",
    "line": null,
    "description": "Task 3 credential-scan <automated> clause scans the filesystem, not git-tracked files; it fires on 106 gitignored raw host logs matching the GraphQL field name accessToken. Zero token-shaped strings anywhere; the git-tracked scan the plan's action text and T-00-45 both specify is clean and ships in tests/go-no-go.spec.ts.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T17:05:14.845Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "00",
    "file": ".planning/phases/00-runtime-reality-check/results/SPIKE-04.json",
    "line": null,
    "description": "SEND_CLIFF_SAVE_TRUE/SAVE_FALSE/FETCH are FLOORS (2000, cap reached) not cliffs — caido/caido#2211 did not reproduce in either wrapper shape. Phase 8 must re-test with real .map bodies and concurrent sends before treating the floor as headroom.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T17:05:24.949Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "deviation",
    "phase": "00",
    "file": ".planning/phases/00-runtime-reality-check/results/SPIKE-10.json",
    "line": null,
    "description": "CACHE_HIT_RATE_CROSS_DAY is null/inconclusive (1 day sampled, denominator 0) and collection has stopped; Phase 1 budgets against CACHE_HIT_RATE_ASSUMED=0.40. Re-install the recorder agent and re-measure after 2026-09-03.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-20T17:05:25.014Z",
    "resolved_at": "2026-08-20T18:06:03.807Z"
  },
  {
    "id": 6,
    "kind": "unrun-verify",
    "phase": "00",
    "file": ".planning/phases/00-runtime-reality-check/results/go-no-go.json",
    "line": null,
    "description": "CACHE_HIT_RATE_CROSS_DAY inconclusive, revisit_after 2026-09-03. Recorder RE-ARMED 2026-08-20 (com.defminer.spike.recorder, twice daily) so a second calendar day accrues. Phase 1 CORE-08 must read this threshold from config with the 0.40 pessimistic default, never hard-code it. Close by re-running aggregate.py + render-go-no-go.py once CACHE_SAMPLE_DAYS >= 2.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T18:05:34.808Z",
    "resolved_at": null
  },
  {
    "id": 7,
    "kind": "stub",
    "phase": "01",
    "file": "packages/backend/src/ingest/consumer.ts",
    "line": null,
    "description": "walk()'s visit callback is a no-op — no detector exists until Phase 3; the walk's yielding, deadline and offset accounting are real regardless",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T22:55:56.313Z",
    "resolved_at": null
  },
  {
    "id": 8,
    "kind": "stub",
    "phase": "01",
    "file": "packages/engine/src/decode.ts",
    "line": null,
    "description": "decode.ts has no consumer in the shipped bundle until a frontend exists (Phase 3/5); ENC-01's byte-vs-text inequality is proven by decode.spec.ts today",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T22:55:56.411Z",
    "resolved_at": null
  },
  {
    "id": 9,
    "kind": "deviation",
    "phase": "01",
    "file": "knip.json",
    "line": null,
    "description": "knip ignoreExportsUsedInFile:true hides a dead export referenced once in its own file — accepted to restore the exports/types gate to error; revisit in Phase 5",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-20T22:55:56.507Z",
    "resolved_at": null
  },
  {
    "id": 10,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/compat.ts",
    "line": null,
    "description": "COMPAT-01's operator-visible message is delivered as a host-log line plus a getStatus()/getCompat() RPC only, with no visible UI: the backend QuickJS surface has NO toast or notification API (exhaustive grep for showToast, Toast and notification across @caido/quickjs-types finds nothing), and sdk.api.send has no subscriber because Phase 1 ships no frontend. Decision P6-D2. Phase 5 owes the visible surface.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T00:02:00.191Z",
    "resolved_at": null
  },
  {
    "id": 11,
    "kind": "stub",
    "phase": "01",
    "file": "packages/backend/src/store/observations.ts",
    "line": null,
    "description": "Path-embedded token in a URL path SEGMENT is NOT redacted — named residual, pinned by observations.spec.ts's RESIDUAL case",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T13:56:33.328Z",
    "resolved_at": null
  },
  {
    "id": 12,
    "kind": "stub",
    "phase": "01",
    "file": "packages/backend/src/telemetry.ts",
    "line": null,
    "description": "Windows C:\\\\ paths are not redacted by redactPaths, and a path containing a space loses only the portion before the space — both named residuals",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T13:56:33.426Z",
    "resolved_at": null
  },
  {
    "id": 13,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "Accepted residual T-01-51: a value crossing a function boundary or more than one hop of indirection is beyond the walk; reported as outbound-unanalysable only where the walk can tell indirection is happening",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T14:18:53.110Z",
    "resolved_at": null
  },
  {
    "id": 14,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/store/error-redaction.spec.ts",
    "line": null,
    "description": "Accepted residual (boundary 2): the STORE-07 walk builds no symbol table and is scope-blind — the caught binding is resolved by NAME, copy tracking is ONE hop, and a value crossing a function boundary is beyond it",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T14:33:35.305Z",
    "resolved_at": null
  },
  {
    "id": 15,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/compat.ts",
    "line": 317,
    "description": "T-01-37 accept: renders String(e).slice(0,160) into the per-surface error field, outside the STORE-07 gate's store/ scope. OWNER: Phase 2, ERR-04 (ROADMAP.md:396)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T14:33:35.405Z",
    "resolved_at": null
  },
  {
    "id": 16,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/hooks/passive.ts",
    "line": 171,
    "description": "T-01-37 accept: renders String(e).slice(0,160) into sdk.console.log on the hook error path, outside the STORE-07 gate's store/ scope. OWNER: Phase 2, ERR-03 (ROADMAP.md:396)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T14:33:35.502Z",
    "resolved_at": null
  },
  {
    "id": 17,
    "kind": "deviation",
    "phase": "01",
    "file": ".planning/REQUIREMENTS.md",
    "line": null,
    "description": "T-01-76 accept: STORE-03 and STORE-07 are declared by redaction plans for work neither requirement's text mentions. Deferred WITH AN OWNER by plan 01-10 task 3 — the operator, at the next requirements pass",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T14:33:35.597Z",
    "resolved_at": null
  },
  {
    "id": 18,
    "kind": "deviation",
    "phase": "01",
    "file": "scripts/phase1/tracer-e2e.sh",
    "line": null,
    "description": "URL userinfo redaction cannot be proven at the live tier: curl lifts user:pass@ into an Authorization: Basic header, so userinfo never reaches observations.url. Measured in run 20260821T150022Z-16902 (userinfo-measurement.txt) and enforced instead by the observations.spec.ts real-SQLite round trip. Live-tier coverage for this one grammar is a documented gap, not a passing assertion.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-21T15:10:49.050Z",
    "resolved_at": null
  }
]
````
