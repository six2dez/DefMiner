---
schema_version: 1
open_count: 19
waived_count: 0
fixed_count: 5
total_count: 24
last_updated: 2026-08-24T09:33:40.130Z
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
| 13 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | Accepted residual T-01-51: a value crossing a function boundary or more than one hop of indirection is beyond the walk; reported as outbound-unanalysable only where the walk can tell indirection is happening | fixed |  | 2026-08-21T14:18:53.110Z | 2026-08-24T08:20:46.154Z |
| 14 | 01 | deviation | packages/backend/src/store/error-redaction.spec.ts |  | Accepted residual (boundary 2): the STORE-07 walk builds no symbol table and is scope-blind — the caught binding is resolved by NAME, copy tracking is ONE hop, and a value crossing a function boundary is beyond it | open |  | 2026-08-21T14:33:35.305Z |  |
| 15 | 01 | deviation | packages/backend/src/compat.ts | 317 | T-01-37 accept: renders String(e).slice(0,160) into the per-surface error field, outside the STORE-07 gate's store/ scope. OWNER: Phase 2, ERR-04 (ROADMAP.md:396) | open |  | 2026-08-21T14:33:35.405Z |  |
| 16 | 01 | deviation | packages/backend/src/hooks/passive.ts | 171 | T-01-37 accept: renders String(e).slice(0,160) into sdk.console.log on the hook error path, outside the STORE-07 gate's store/ scope. OWNER: Phase 2, ERR-03 (ROADMAP.md:396) | open |  | 2026-08-21T14:33:35.502Z |  |
| 17 | 01 | deviation | .planning/REQUIREMENTS.md |  | T-01-76 accept: STORE-03 and STORE-07 are declared by redaction plans for work neither requirement's text mentions. Deferred WITH AN OWNER by plan 01-10 task 3 — the operator, at the next requirements pass | open |  | 2026-08-21T14:33:35.597Z |  |
| 18 | 01 | deviation | scripts/phase1/tracer-e2e.sh |  | URL userinfo redaction cannot be proven at the live tier: curl lifts user:pass@ into an Authorization: Basic header, so userinfo never reaches observations.url. Measured in run 20260821T150022Z-16902 (userinfo-measurement.txt) and enforced instead by the observations.spec.ts real-SQLite round trip. Live-tier coverage for this one grammar is a documented gap, not a passing assertion. | open |  | 2026-08-21T15:10:49.050Z |  |
| 19 | 1 | deviation | packages/backend/src/store/observations.ts |  | RESIDUAL, PINNED: URL_MAX truncation lands inside a <redacted> marker (tail 'p133=<re'); repair interacts with the new padding branch and would break file-wide idempotence — owner: a later phase, job: truncate on a & boundary | open |  | 2026-08-22T08:54:33.504Z |  |
| 20 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | WR-19 narrowed from every-non-reducing-key to ASSEMBLED-KEY; a merely dynamic key (sdk[k]) is a disclosed residual, not reported | fixed |  | 2026-08-22T09:33:22.689Z | 2026-08-24T08:21:10.428Z |
| 21 | 01 | deviation | scripts/phase1/tracer-e2e.sh |  | URL userinfo cannot be exercised through the live curl tier — lifted into an Authorization: Basic header before the request line exists. MEASURED per run (userinfo-measurement.txt), enforced at the unit tier by observations.spec.ts HEAD_CASES. A live userinfo proof needs a client that does not do this lift. | open |  | 2026-08-22T09:56:52.151Z |  |
| 22 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | THE RECEIVER-KEY RESIDUAL AS OF WAVE 18 (plan 01-18, CR-08) — SUPERSEDED IN WAVE 19 BY PLAN 01-19, which narrows it further and rewrites this bound in the gate header, REQUIREMENTS.md, STATE.md and this ledger. Supersedes entries 13 and 20, whose descriptions stated a bound the code no longer has. NOW REPORTED in receiver-key position: a literal key; a key bound ONE HOP to a literal (constStrings); a key assembled inline (isAssembledKey); a key bound ONE HOP to an assembly in EVERY spelling — +, a template, .join(""), an opaque call — through either a declaration or an assignment (assembledNames); a CONDITIONAL key resolved on both branches; a COMMA SEQUENCE resolved to its rightmost operand. THE RESIDUAL THAT REMAINS, in the same words as that gate's boundary 2, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 amendment: more than ONE HOP of indirection, a value crossing a FUNCTION BOUNDARY, and a key the walk NEVER SAW BOUND — a parameter, a loop binding, a name bound out of document order or in another file. That last exemption is preserved BY MEASUREMENT, re-run after the widening: 23 files over both source roots, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. CORE-11 stays unchecked: const e = eval; e(s) (WR-23) and const g = globalThis (IN-20) are still silent and plan 01-19 owns both plus the checkbox flip. | fixed |  | 2026-08-24T08:21:34.840Z | 2026-08-24T08:49:12.490Z |
| 23 | 01 | deviation | packages/backend/src/outbound-prohibition.spec.ts |  | THE FINAL RESIDUAL AFTER WAVE 19 (plan 01-19, closing WR-23, WR-26 and IN-20). Supersedes entry 22, whose description scoped itself to the wave-18 receiver-key residual and named this plan as its superseder; a one-hop eval/Function alias, the outbound constructors and the globalThis hop all stop being residual here. NEWLY REPORTED since wave 18: a one-hop alias of eval or Function in every spelling fetchAliases resolves (declaration, global-member, destructure, assignment), the same for XMLHttpRequest/WebSocket/EventSource through one shared globalNameOf lookup used by both the call rule and the new rule, and a one-hop alias of globalThis itself, which closes fetch, the unreadable computed member, dynamic code, the outbound constructors and the beacon receiver together. THE RESIDUAL THAT REMAINS, in the same words as that gate's THE FINAL RESIDUAL, AFTER PLAN 01-19 block, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 amendment: CORE-11's clause 'no sdk.requests.send IN ANY SPELLING' IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in DOCUMENT ORDER: const a = globalThis; const b = a; const g = b; g.fetch(u) reports and so does the sdk.requests twin, while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in NUMERIC_MEMBERS is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary + indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19: 23 files over both SOURCE_ROOTS, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. NOTE THAT THIS ENTRY AMENDS THE BOUND IN BOTH DIRECTIONS: every residual list before this one bounded the walk at 'more than ONE HOP of indirection', which is exactly right for a receiver KEY and UNDERSTATED the walk for ALIASES, measured while writing a fixture for it. CORE-11 is now [x] in REQUIREMENTS.md, flipped against an eight-row discharge table in 01-19-SUMMARY.md and not before it. | open |  | 2026-08-24T08:49:36.488Z |  |
| 24 | 01 | deviation | packages/backend/src/store/error-redaction.spec.ts |  | Residual items 1-3 (unnamed methods, bare-identifier callee, operator outside the four) are disclosed and deliberately UNPINNED — no assertion goes red if one is closed | open |  | 2026-08-24T09:33:40.130Z |  |

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
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-21T14:18:53.110Z",
    "resolved_at": "2026-08-24T08:20:46.154Z"
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
  },
  {
    "id": 19,
    "kind": "deviation",
    "phase": "1",
    "file": "packages/backend/src/store/observations.ts",
    "line": null,
    "description": "RESIDUAL, PINNED: URL_MAX truncation lands inside a <redacted> marker (tail 'p133=<re'); repair interacts with the new padding branch and would break file-wide idempotence — owner: a later phase, job: truncate on a & boundary",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-22T08:54:33.504Z",
    "resolved_at": null
  },
  {
    "id": 20,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "WR-19 narrowed from every-non-reducing-key to ASSEMBLED-KEY; a merely dynamic key (sdk[k]) is a disclosed residual, not reported",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-22T09:33:22.689Z",
    "resolved_at": "2026-08-24T08:21:10.428Z"
  },
  {
    "id": 21,
    "kind": "deviation",
    "phase": "01",
    "file": "scripts/phase1/tracer-e2e.sh",
    "line": null,
    "description": "URL userinfo cannot be exercised through the live curl tier — lifted into an Authorization: Basic header before the request line exists. MEASURED per run (userinfo-measurement.txt), enforced at the unit tier by observations.spec.ts HEAD_CASES. A live userinfo proof needs a client that does not do this lift.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-22T09:56:52.151Z",
    "resolved_at": null
  },
  {
    "id": 22,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "THE RECEIVER-KEY RESIDUAL AS OF WAVE 18 (plan 01-18, CR-08) — SUPERSEDED IN WAVE 19 BY PLAN 01-19, which narrows it further and rewrites this bound in the gate header, REQUIREMENTS.md, STATE.md and this ledger. Supersedes entries 13 and 20, whose descriptions stated a bound the code no longer has. NOW REPORTED in receiver-key position: a literal key; a key bound ONE HOP to a literal (constStrings); a key assembled inline (isAssembledKey); a key bound ONE HOP to an assembly in EVERY spelling — +, a template, .join(\"\"), an opaque call — through either a declaration or an assignment (assembledNames); a CONDITIONAL key resolved on both branches; a COMMA SEQUENCE resolved to its rightmost operand. THE RESIDUAL THAT REMAINS, in the same words as that gate's boundary 2, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 amendment: more than ONE HOP of indirection, a value crossing a FUNCTION BOUNDARY, and a key the walk NEVER SAW BOUND — a parameter, a loop binding, a name bound out of document order or in another file. That last exemption is preserved BY MEASUREMENT, re-run after the widening: 23 files over both source roots, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. CORE-11 stays unchecked: const e = eval; e(s) (WR-23) and const g = globalThis (IN-20) are still silent and plan 01-19 owns both plus the checkbox flip.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-24T08:21:34.840Z",
    "resolved_at": "2026-08-24T08:49:12.490Z"
  },
  {
    "id": 23,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "line": null,
    "description": "THE FINAL RESIDUAL AFTER WAVE 19 (plan 01-19, closing WR-23, WR-26 and IN-20). Supersedes entry 22, whose description scoped itself to the wave-18 receiver-key residual and named this plan as its superseder; a one-hop eval/Function alias, the outbound constructors and the globalThis hop all stop being residual here. NEWLY REPORTED since wave 18: a one-hop alias of eval or Function in every spelling fetchAliases resolves (declaration, global-member, destructure, assignment), the same for XMLHttpRequest/WebSocket/EventSource through one shared globalNameOf lookup used by both the call rule and the new rule, and a one-hop alias of globalThis itself, which closes fetch, the unreadable computed member, dynamic code, the outbound constructors and the beacon receiver together. THE RESIDUAL THAT REMAINS, in the same words as that gate's THE FINAL RESIDUAL, AFTER PLAN 01-19 block, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 amendment: CORE-11's clause 'no sdk.requests.send IN ANY SPELLING' IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in DOCUMENT ORDER: const a = globalThis; const b = a; const g = b; g.fetch(u) reports and so does the sdk.requests twin, while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in NUMERIC_MEMBERS is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary + indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19: 23 files over both SOURCE_ROOTS, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. NOTE THAT THIS ENTRY AMENDS THE BOUND IN BOTH DIRECTIONS: every residual list before this one bounded the walk at 'more than ONE HOP of indirection', which is exactly right for a receiver KEY and UNDERSTATED the walk for ALIASES, measured while writing a fixture for it. CORE-11 is now [x] in REQUIREMENTS.md, flipped against an eight-row discharge table in 01-19-SUMMARY.md and not before it.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-24T08:49:36.488Z",
    "resolved_at": null
  },
  {
    "id": 24,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/store/error-redaction.spec.ts",
    "line": null,
    "description": "Residual items 1-3 (unnamed methods, bare-identifier callee, operator outside the four) are disclosed and deliberately UNPINNED — no assertion goes red if one is closed",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-24T09:33:40.130Z",
    "resolved_at": null
  }
]
````
