---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-21T08:18:25Z
status: human_needed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
deferred: []
prohibitions:
  - requirement_id: CORE-01
    statement: "MUST NOT issue any outbound network request to a target or to a third party in this phase."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "No `sdk.requests.send`, `caido:http`, `fetch(`, or `net.*` call exists in any non-spec source under packages/*/src. The shipped bundle's entire import set is one specifier (`crypto`). NO WIRED ENFORCEMENT EXISTS: the DIST-05 allowlist admits `caido:http`, and `sdk.requests.send` needs no import at all, so neither gate would catch a regression."
  - requirement_id: STORE-01
    statement: "MUST NOT retain operator browsing evidence beyond what the analysis needs — no body bytes, headers, cookies, or column capable of holding a secret."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Column-shape half IS gated: schema.spec.ts enforces an explicit column allowlist plus a forbidden-name check, read from PRAGMA table_info. But `observations.url` persists query strings verbatim for 90 days (WR-07), and a query string routinely carries a session token — so the broader prohibition is in live tension with a deferred finding. Not silently passing."
  - requirement_id: CORE-10
    statement: "MUST NOT present partial passive coverage as complete."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Counter identifiers are honest — `proxiedResponsesObserved`, not a target-completeness noun. A scan for completeness-asserting identifiers (all*/every*/complete*/total*/full*) in telemetry.ts returned nothing. No wired gate enforces this on future identifiers."
human_verification:
  - test: "Decide the WR-07 persistence policy: `observations.url` (packages/backend/src/store/observations.ts:39, `normaliseObservedUrl`) strips only the fragment and keeps the query string verbatim for 90 days, in a database that survives project deletion and force-reinstall — while telemetry.ts:236 redacts that identical value out of error text before it crosses the RPC."
    expected: "An explicit operator decision: keep verbatim (accept a durable record of real browsing incl. tokens in query strings), redact at write, or shorten retention for the url column specifically."
    why_human: "A privacy/utility tradeoff, not a correctness defect. The code matches must_have truth 01-01 #2, which explicitly requires the query be preserved. Deliberately deferred by the code review."
  - test: "Resolve STORE-01's scope. The requirement reads 'SQLite schema covering artifacts, occurrences, analyses, entities, evidence, and audit'. Three exist (artifacts, observations=occurrences, analyses) plus an unnamed `settings`. `entities`, `evidence` and `audit` do not exist. REQUIREMENTS.md:49 marks STORE-01 `[x]` complete and ROADMAP.md:363 maps STORE-01 exclusively to Phase 1 — no later phase claims the three missing tables."
    expected: "Either re-scope STORE-01's wording to the three tables Phase 1 legitimately owns and open a new requirement for entities/evidence/audit against Phase 4/5, or amend the ROADMAP traceability table so those tables have an owner."
    why_human: "A planning/requirements-ledger decision. Building empty tables with no writer in Phase 1 would be worse; the phase's own probe ledger (01-PROBE.md row 19) already flags 'where entities/evidence/audit land (Phases 4 and 5)' as UNRESOLVED. But that intent is not reflected in the roadmap, so the deferral cannot be auto-confirmed."
  - test: "Review the three judgment-tier prohibitions listed in this file's frontmatter (CORE-01 outbound traffic, STORE-01 secret-capable persistence, CORE-10 completeness claims)."
    expected: "Each accepted, or an enforcement mechanism scheduled."
    why_human: "Authored descriptor-less with no wired check; they correctly dispose {status: unverified, flagged: true}. That disposition is expected, not a failure — but it is never a silent pass."
  - test: "Review the 11 `unclassified` edge-probe rows in 01-PROBE.md (rows 2, 8, 15, 16, 19, 23, 24, 25, 26, 34, 37 — CORE-02, CORE-04, CORE-08, CORE-09, STORE-01, STORE-03, STORE-04, STORE-05, STORE-06, COMPAT-02, DIST-05)."
    expected: "Each confirmed still-acceptable or promoted to a resolved disposition."
    why_human: "Deliberately unresolved planner assumptions. Confirmed still surfaced in the ledger and referenced across all six plans — not silently dropped."
  - test: "Review the seven open informational findings IN-01 … IN-07 in 01-REVIEW.md."
    expected: "Accepted as informational or scheduled."
    why_human: "Left open by decision in the code review."
---

# Phase 1: Skeleton, Persistence & Compatibility — Verification Report

**Phase Goal:** A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Verified:** 2026-08-21T08:18:25Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

The goal is achieved. Every one of the seven ROADMAP Success Criteria is verified against the codebase, and both `verification: backstop` truths are closed by explicit measured evidence rather than abstention. The five human items below are decisions and flagged prohibitions, not defects — none of them blocks the phase or the next one.

Verification was adversarial: I did not accept SUMMARY claims, I re-derived the load-bearing facts myself. Where a gate's ability to fail was in question, I reintroduced the defect and confirmed the gate went red.

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | `onInterceptResponse` is non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `passive.ts:119` is `export function onResponse(...): void`, not async. **I wrote my own probe** invoking the registered callback: returns `undefined`, `.then` is undefined. The queue entry holds exactly `{id, bytes, kind}` where `bytes` is `body.length` — a scalar, so no Request/Response/Body reference survives the call (CORE-05). |
| 2 | Work queue is bounded, overflow count visible; can never grow without limit | ✓ VERIFIED | **Independent probe I authored**: cap 500 holds at `depth=500`, the 501st offer leaves `depth=500, overflowCount=1`, the OLDEST entry is dropped, order is FIFO, and `overflowCount` is not reset by a take. `new BoundedQueue(499)` throws naming 500. Surfaced on `getStatus()` as `queueOverflowCount` (`index.ts:130`). |
| 3 | 200-chunk SPA leaves plugin UI/RPC responsive; max sync slice recorded and under the Phase 0 threshold | ✓ VERIFIED | `results/spa-load.json`: 200 chunks / 17,953,135 bytes, `max_slice_ms` **0.029** against a `max_sync_slice_ms_budget` of **25**. RPC measured EXTERNALLY: loaded median 1.163 ms / p95 1.269 ms vs baseline median 1.254 ms / p95 1.338 ms — 26 loaded samples, 0 errors. `overflow: 0`, `queue_depth_at_end: 0`, `processed: 200`. Gated by `tests/phase1-load.spec.ts` with a >0 guard and a version-consistency guard so `expected_version` cannot be edited to rescue a run. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | Live restart in `spa-load.json`: `identical: true`, `plugin_reattached: true`, schema v2 → v2, `migration_advanced_version: false`, 200/200/200 rows before and after. Dedup proven on a **real Caido instance** — `results/runs/20260821T075936Z-12874/artifacts.json` holds ONE row, `seen_count: 2`, against TWO observation rows with distinct `request_id`s. `project_id` is in every PRIMARY KEY, asserted by **`PRAGMA table_info` pk ordinals, not DDL text** (`schema.spec.ts:144`), with non-vacuity guards on both the table list and the column list. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; a non-UTF-8 fixture round-trips without corruption | ✓ VERIFIED | **I reproduced the digests independently on the host**: `corpus/encoded/nonutf8.js` is 222 bytes / `4dc8826e…fee94d` raw, and 242 bytes / `9197a051…19e6` after a `toText()` round trip. The corruption is real and the plugin takes the raw path (`consumer.ts:189`). Hooks never touch either method — AST-gated in `admit.spec.ts:355`, and that gate is itself proven to fail on a violating fixture (`admit.spec.ts:372`). |
| 6 | CI gate fails the build if the backend bundle imports a specifier outside the Phase 0 allowlist | ✓ VERIFIED | **Corrected criterion confirmed in ROADMAP.md** (allowlist form, with the derivation). **I executed both paths.** Real bundle: exits 0, import set is exactly `crypto`. Fails (exit 1, naming the specifier) on all five criterion-named specifiers — `zlib`, `util`, `stream`, `perf_hooks`, `process` — plus `node:crypto` and `caido:crypto`. Missing file exits 2. |
| 7 | A Caido build below the declared minimum produces a clear message, not an obscure failure | ✓ VERIFIED | `compat-smoke.json` leg C, on the **real 0.55.3 binary**: `refusal_mode: guard_refused`, `guard_reached: true`, `artifact_rows_after_proxied_js: 0`, `database_file_present: false`. Message names both versions: "DefMiner requires Caido 0.57.1 or newer; this instance reports 0.55.3." |
| 8 | **[backstop, 01-05]** Under a 200-chunk load the max sync slice stays within budget and the plugin's RPC keeps answering an external prober | ✓ VERIFIED | Not abstained — closed by the measured `spa-load.json` above. `recordSlice` is called from production code (`consumer.ts:567`, paired with the `finishAnalysis` write), not from the harness, so the number the prober reads is fed by the pipeline. |
| 9 | **[backstop, 01-06]** A below-minimum build refuses legibly, confirmed on the real 0.55.3 binary | ✓ VERIFIED | Not abstained — closed by leg C above, on the genuine binary at `/Users/six2dez/.caido/caido-cli`, version-asserted (`expected_version` == `reported_version` == 0.55.3). |

**Score:** 9/9 truths verified (0 present, behavior-unverified)

### The two post-plan code-review changes, verified against current code

| Finding | Claim | Status | Evidence |
|---|---|---|---|
| CR-01 (blocker) | A failed `onProjectChange` registration left all CORE-09 epoch re-checks inert | ✓ FIX COMPLETE | `installLifecycle` returns `projectChangeArmed` (`lifecycle.ts:284-330`); on failure it sets the flag false, forces `activeProjectId = null`, and aborts the live token. `index.ts:278-285` refuses at step 5b — no consumer, no ready latch, no `onInterceptResponse`. The test at `lifecycle.spec.ts:572` now asserts the CORRECT behaviour end-to-end **through the real `init()` against a real SQLite fixture**: `interceptResponseHandlers.length === 0`, reason contains "project isolation unavailable", and `listArtifacts`/`listObservations` are empty for BOTH projects. The prior inverted assertion is gone. Also covers `onProjectChange` being absent, not merely throwing. |
| WR-01 | Retention cascade delete was unbounded per digest (measured 3001 against a 512 cap) | ✓ FIX COMPLETE — **mutation-proven** | The cascade now enumerates child KEYS under `LIMIT` within the remaining budget (`retention.ts:143-155`, `deleteDigest`) instead of deleting by digest. The spec seeds a **non-degenerate** fan-out of `cap * 3` (`retention.spec.ts:324`). I reintroduced the defect (unbounded `obsLimit`, guard removed) and the test went **red**; restoring turned it green. The cap is real, not asserted on degenerate input. |

### Gate honesty audit

The context flagged four historical gates that could not fail. I checked each class directly rather than trusting the fix:

| Historical defect | Current state | How I confirmed |
|---|---|---|
| `project_id` rule matched a bare column list | ✓ Closed | `sql-discipline.spec.ts:481` — "project_id in the SELECT LIST is not scoping — only the predicate counts". **I planted an unscoped multi-row `SELECT … FROM observations WHERE observed_at < ?`** and the gate failed with `unscoped-multi-row … does not scope on project_id in its WHERE clause`. |
| `ON CONFLICT … DO UPDATE SET` parsed as a table named `set` | ✓ Closed | `sql-discipline.spec.ts:469` — "an upsert is not a multi-row UPDATE just because it says DO UPDATE SET". |
| Retention spec seeded one observation per artifact | ✓ Closed | Fan-out spec uses `cap * 3`; mutation-proven above. |
| `lifecycle.spec.ts:507` asserted the CR-01 defect was correct | ✓ Closed | Replaced by the DISARMS test; I read it and ran it. |
| Vacuous enumeration generally | ✓ Guarded | Non-vacuity assertions present at `schema.spec.ts:148/175`, `sql-discipline.spec.ts:325/379`, `boundary.spec.ts`, and `phase1-load.spec.ts` (`digest_sample.length > 0`). |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/engine/src/queue.ts` | Bounded queue | ✓ VERIFIED | Behaviorally probed independently |
| `packages/engine/src/chunker.ts` | 64 KiB / 4 KiB overlap windows | ✓ VERIFIED | Probed: 65536→1 window, 65537→2 with exactly 4096 overlap, absolute ascending offsets, 200000 bytes covered with no gap, 0 bytes→0 windows |
| `packages/engine/src/deadline.ts`, `pipeline.ts`, `yield.ts` | Temporal yield, injected clock | ✓ VERIFIED | Clock injected, not captured; `walk` returns `partial` at deadline |
| `packages/engine/src/decode.ts`, `digest.ts` | Byte-exact identity | ✓ VERIFIED | Host-reproduced digests |
| `packages/engine/src/thresholds.generated.ts` / `thresholds.ts` | Byte-generated from `go-no-go.json` | ✓ VERIFIED | Ran `gen-thresholds.mjs` twice — byte-identical, `git diff --exit-code` clean |
| `packages/backend/src/hooks/passive.ts`, `admit.ts` | Non-async hook, named reject reason | ✓ VERIFIED | Reject-reason union covered per member; `revalidation` distinct from `not_scriptish` |
| `packages/backend/src/ingest/consumer.ts` | One drain loop, reload-after-await, all store call sites | ✓ VERIFIED | `upsertArtifact` + `recordObservation` unconditional in the same iteration; `recordSlice` paired with `finishAnalysis` |
| `packages/backend/src/store/{migrations,artifacts,observations,analyses,settings,retention,db}.ts` | Forward-only ladder, content-addressed reads, retention | ✓ VERIFIED | 4 tables; ladder no-op on second boot proven live |
| `packages/backend/src/lifecycle.ts` | `onProjectChange` incl. null branch, cancellation | ✓ VERIFIED | Synchronous `applyProjectChange`, abort→drain→swap→re-arm |
| `packages/backend/src/telemetry.ts` | One counter object, `recordSlice`, `slimStatus` | ✓ VERIFIED | Single object; hook and consumer both increment it; URL redaction before truncation |
| `packages/backend/src/compat.ts` | COMPAT-01 guard + capability probe | ✓ VERIFIED | See comparator note below |
| `scripts/ci/check-bundle-imports.mjs` | DIST-05 allowlist gate | ✓ VERIFIED | Both paths executed |
| `scripts/phase1/{tracer-e2e,runtime-answers,spa-load,compat-smoke,fetch-caido}.sh` | Live measurement harness | ✓ VERIFIED | Produced the committed results |
| `results/runtime-answers.json` | SQLite version + reload readability | ✓ VERIFIED | `sqlite_version: 3.46.0` (≥3.24 required for the upsert); `sdk.requests.get(id)` readable **510/510** (10 immediate + 500 burst), `reloadMissing: 0`, `peakQueueDepth: 323` proving the queue genuinely filled |
| `results/spa-load.json` | Max slice, RPC latency, restart persistence | ✓ VERIFIED | As above |
| `results/compat-smoke.json` | Three-leg surface matrix | ✓ VERIFIED | Legs A (0.57.1) and B (0.58.0) both compatible, 16 surfaces each with SEPARATE `probe_ok` and `exercised` fields; leg C refuses |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `index.ts` | `compat.ts` | `checkCompat` first in `init()`, returns before `meta.db()` | ✓ WIRED |
| `index.ts` | `lifecycle.ts` | `onProjectChange` after migrate, before the ready latch; **refuses if unarmed** | ✓ WIRED |
| `index.ts` | `hooks/passive.ts` | `onInterceptResponse` registered LAST, after the ready latch | ✓ WIRED |
| `hooks/passive.ts` | `engine/queue.ts` | `queue.offer({id, bytes, kind})` | ✓ WIRED |
| `hooks/passive.ts` | `telemetry.ts` | Hook increments the single counters object directly | ✓ WIRED |
| `ingest/consumer.ts` | `store/{artifacts,observations,analyses}.ts` | Identity + edge + analysis writes, unconditional per iteration | ✓ WIRED |
| `ingest/consumer.ts` | `telemetry.ts` | `recordSlice(result.maxSliceMs)` paired with `finishAnalysis` | ✓ WIRED |
| `ingest/consumer.ts` | `store/retention.ts` | `sweepRetention` scheduled on the cadence from the drain loop | ✓ WIRED — live evidence: `retentionSweeps: 2` in `spa-load.json` with no external trigger |
| `engine/*` | (nothing Caido) | SDK-free boundary | ✓ WIRED — zero `caido:`/`@caido/*` imports; `packages/engine/package.json` declares **no dependencies at all** |

### Data-Flow Trace (Level 4)

| Value | Source | Real data? | Status |
|---|---|---|---|
| `getStatus().maxSliceMs` | `telemetry.maxSliceMs` ← `recordSlice(walk().maxSliceMs)` in the consumer | Yes — 0.029 ms read by an external prober on a live instance | ✓ FLOWING |
| `getStatus().queueDepth/Cap/OverflowCount` | Live `BoundedQueue` instance | Yes | ✓ FLOWING |
| `getArtifacts()` / `getObservations()` | `listArtifacts`/`listObservations` SELECT against `sdk.meta.db()` | Yes — live run returned 1 artifact `seen_count=2` and 2 observations with real digests and URLs | ✓ FLOWING |
| `getCompat().surfaces` | `probeSurfaces(surfaceCtx)` feature-detected inside QuickJS | Yes — 16 surfaces per leg, `probe_ok` and `exercised` recorded separately | ✓ FLOWING |
| `analyses.max_slice_ms` / `bytes_walked` | The same `walk()` result as `recordSlice`, one statement apart | Yes — non-null on both `done` and `partial` paths | ✓ FLOWING |

No hollow props, no static fallbacks, no mock-terminated chains.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full suite | `pnpm test` | 28 files / **637 tests** passed | ✓ PASS |
| Typecheck | `pnpm typecheck` | exit 0 | ✓ PASS |
| Lint | `pnpm lint` | exit 0 | ✓ PASS |
| Knip | `pnpm knip` | exit 0 | ✓ PASS |
| DIST-05 pass path | `node scripts/ci/check-bundle-imports.mjs` | exit 0, import set = `crypto` | ✓ PASS |
| DIST-05 fail path ×7 | same, against planted fixtures | exit 1 on zlib/util/stream/perf_hooks/process/node:crypto/caido:crypto | ✓ PASS |
| Threshold determinism | `gen-thresholds.mjs` ×2 + `git diff --exit-code` | byte-identical | ✓ PASS |
| DIST-06 pins | inspect `pnpm-lock.yaml` + `pnpm-workspace.yaml` | `primevue: 4.1.0`, `tailwindcss: 3.4.13` in overrides; `packages:` and `allowBuilds` (`esbuild: true`, `sharp: false`) both present and independent | ✓ PASS |
| ENC-01 digests | independent host `crypto` reproduction | 222 B / `4dc8826e…`, 242 B / `9197a051…`, empty `e3b0c442…` — all match | ✓ PASS |
| CORE-03/CORE-06 | verifier-authored probe spec | 3/3 passed | ✓ PASS |
| CORE-09 mid-drain | `vitest -t "write NO row under either project when the change lands mid-drain"` | passed | ✓ PASS |
| CORE-09 epoch abandon | `vitest packages/backend/src/ingest/consumer.spec.ts -t "project"` | passed | ✓ PASS |
| WR-01 mutation | reintroduce unbounded cascade | test went RED, restored GREEN | ✓ PASS |
| SQL-discipline mutation | plant unscoped multi-row SELECT | gate went RED, restored GREEN | ✓ PASS |

Working tree left clean — all probes and mutations reverted (`git status` shows only pre-existing planning artifacts).

### Probe Execution

Step 7c is **N/A for this phase**. `01-PROBE.md` is an edge-probe *disposition ledger* (38 rows), not an executable `scripts/*/tests/probe-*.sh` suite; no such scripts exist in this repo. The phase's executable evidence is `scripts/phase1/*.sh`, whose committed outputs I validated above and which are gated by `tests/phase1-{runtime,load,compat}.spec.ts`.

The 11 `unclassified` rows are **confirmed still surfaced** — present in the ledger (rows 2, 8, 15, 16, 19, 23, 24, 25, 26, 34, 37) and referenced across all six plans (01-01: 4, 01-02: 2, 01-03: 3, 01-04: 5, 01-05: 2, 01-06: 2). Not silently dropped.

### Requirements Coverage

All 22 phase requirement IDs are claimed by a plan. **Zero orphaned** — no ID mapped to Phase 1 in REQUIREMENTS.md is unclaimed.

| Requirement | Plan | Status | Evidence |
|---|---|---|---|
| CORE-01 | 01-01, 01-03 | ✓ SATISFIED | Non-async hook returning `undefined`; scalars only |
| CORE-02 | 01-03 | ✓ SATISFIED | `admit.ts` gates status→body→size→kind→scope; a named reason per reject, every union member covered; `revalidation` (304) distinct from `not_scriptish` |
| CORE-03 | 01-03 | ✓ SATISFIED | Independently probed |
| CORE-04 | 01-01, 01-03 | ✓ SATISFIED | In-flight latch — one drain loop; WR-06 fixed so a second `startConsumer` rebinds rather than orphaning |
| CORE-05 | 01-01, 01-03 | ✓ SATISFIED | `sdk.requests.get(id)` after the await; `reloadMissing`/`reloadNoResponse` counted separately; AST assertion forbids referencing the result across an await |
| CORE-06 | 01-03 | ✓ SATISFIED | Independently probed; yield is temporal, clock injected |
| CORE-07 | 01-03 | ✓ SATISFIED | `scan_state='partial'` with non-null `max_slice_ms` and `bytes_walked` on deadline expiry |
| CORE-08 | 01-03, 01-04 | ✓ SATISFIED | Corpus version is IN the primary key, so a stale-corpus hit is inexpressible; WR-05 fixed so a stranded `pending` claim reports stale, not cache-hit |
| CORE-09 | 01-05 | ✓ SATISFIED | Abort→drain→swap→re-arm, synchronous; epoch re-checked before identity, edge, analysis, and finish; **CR-01 closed** |
| CORE-10 | 01-05 | ✓ SATISFIED | One counter object; max slice measured externally at 0.029 ms |
| STORE-01 | 01-01, 01-04 | ⚠️ **PARTIAL** | 3 of 6 named table groups exist (artifacts, occurrences=observations, analyses) plus `settings`. **`entities`, `evidence`, `audit` do not exist and no later phase claims them.** See human item 2. |
| STORE-02 | 01-01, 01-04 | ✓ SATISFIED | `project_id` in every PRIMARY KEY by `PRAGMA table_info` pk ordinal; `''` reserved for `settings` only |
| STORE-03 | 01-01, 01-03 | ✓ SATISFIED | `artifacts` has NO `url` column (asserted); identity is `(project_id, sha256)` |
| STORE-04 | 01-04 | ✓ SATISFIED | `detector_set_hash` in the analyses key |
| STORE-05 | 01-04 | ✓ SATISFIED | Forward-only ladder; populated-DB migration preserves rows; re-run is a no-op — proven live (v2→v2, `migration_advanced_version: false`) |
| STORE-06 | 01-03, 01-04 | ✓ SATISFIED | Scheduled from the consumer loop (live: `retentionSweeps: 2`); cap invariant mutation-proven; WR-04 fixed so the interval counts rows written, not iterations |
| STORE-07 | 01-01, 01-04 | ✓ SATISFIED | Positional `?` only; AST gate rejects named params, array-as-sole-arg, interpolation, RETURNING, `last_insert_rowid()`; WR-08 fixed so the gate audits the whole backend package as its header claimed |
| COMPAT-01 | 01-06 | ✓ SATISFIED | Guard refuses below-minimum on the real 0.55.3 binary with a message naming both versions; no hook, no DB file |
| COMPAT-02 | 01-06 | ✓ SATISFIED | Three-leg matrix incl. 0.58.0, the release that shipped after Phase 0 measured everything |
| ENC-01 | 01-01, 01-03 | ✓ SATISFIED | Host-reproduced byte-exact digests; `toText()` AST-forbidden in hooks |
| DIST-05 | 01-02 | ✓ SATISFIED | Allowlist gate, both paths executed |
| DIST-06 | 01-02 | ✓ SATISFIED | Exact pins resolved in the lockfile; `allowBuilds` independent |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | `TBD` / `FIXME` / `XXX` | — | **NONE.** Zero debt markers across all 73 files changed in this phase. The blocker gate is clean. |
| — | — | `TODO` / `HACK` / `PLACEHOLDER` | — | **NONE.** |
| `consumer.ts` | 524 | `visit: () => {}` — the Phase 3 detector seam | ℹ️ Info | Declared, commented, and correct for this phase: the goal explicitly says "nothing analysed yet beyond a hash". Not a stub. |
| `spa-load.json` | — | Max slice measured with an empty `visit` | ℹ️ Info | 0.029 ms of 25 ms is honest for a pipeline that hashes but does not analyse. It is **not predictive of Phase 3** — the headroom will be consumed by detectors. Re-measure when the first detector lands. |
| `index.ts` 311/316, `admit.ts` 125, `queue.ts` 86 | — | `return []` / `return null` | ℹ️ Info | All legitimate guard clauses, not empty implementations. |

### Deferred Items

None. No gap identified in this phase is covered by a later milestone phase — notably **STORE-01's three missing tables are NOT deferred**, because ROADMAP.md:363 maps STORE-01 exclusively to Phase 1 and neither Phase 4 nor Phase 5 names them in a goal or success criterion. `01-PROBE.md` row 19 records the *intent* to land them in Phases 4/5, but that intent is unresolved and unwired, so it cannot be auto-confirmed as a deferral. Routed to human decision instead.

### Notable finding: a plan defect the executor caught

Plan 01-06's `must_haves` truth #2 states "0.6.0 compares GREATER than 0.57.1 under the three-part numeric comparison". **That is backwards** — under numeric comparison minor 6 < minor 57, so 0.6.0 is LESS; GREATER is precisely what the string-compare trap produces. Verifying literally against the plan text would have flagged a false failure.

The implementation is **correct**: I probed `cmpCaidoVersion("0.6.0", "0.57.1")` directly and it returns `-51` (6 − 57), and `checkCompat` refuses 0.6.0. `compat.spec.ts:43` executes the trap rather than describing it — asserting `"0.6.0" > "0.57.1"` is TRUE as raw strings, then that the comparator is negative, then that the guard refuses. `01-06-SUMMARY.md` Deviation 1 records the plan bug, the reasoning, and the fix (commit `86dead5`) accurately. Marked VERIFIED against corrected intent.

### Gaps Summary

**No gaps.** No truth failed, no artifact is missing or a stub, no key link is unwired, and no blocker anti-pattern exists. The phase goal — installs, observes every proxied response without stalling, durably remembers what it saw, nothing analysed beyond a hash — is achieved and demonstrated on live Caido instances at three versions.

The phase does not reach `passed` for one reason only: five items require human judgment. Three are the descriptor-less judgment-tier prohibitions, which correctly dispose `{status: unverified, flagged: true}` and must never be silently absorbed into a pass. The other two are decisions the phase deliberately left to a human — WR-07's persistence policy, and STORE-01's scope reconciliation.

**One item deserves attention before Phase 4/5 planning:** STORE-01 is marked `[x]` complete in REQUIREMENTS.md while three of its six named table groups do not exist and no phase owns them. That is a ledger inconsistency that will silently drop `entities`, `evidence` and `audit` from v1 if nobody acts. It does not block Phase 2.

---

_Verified: 2026-08-21T08:18:25Z_
_Verifier: Claude (gsd-verifier)_
