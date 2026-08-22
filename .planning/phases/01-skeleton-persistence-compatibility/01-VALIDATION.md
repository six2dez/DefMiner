---
phase: 1
slug: skeleton-persistence-compatibility
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-20
revised: 2026-08-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded by `/gsd-plan-phase 1` from `01-RESEARCH.md` § Validation Architecture.
> Task IDs are bound when plans land; requirement→test mapping is authoritative now.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.11 |
| **Config file** | `vitest.config.ts` (exists; currently includes **only** `tests/**/*.spec.ts` — Wave 0 must widen it without dropping that glob) |
| **Quick run command** | `pnpm vitest run packages --reporter=dot` |
| **Full suite command** | `pnpm test` (`vitest run --reporter=dot`) — **must continue to include the Phase 0 gates** |
| **Estimated runtime** | ~15 seconds quick; full suite bounded by the Phase 0 gates already in `tests/` |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run packages --reporter=dot` (no live Caido required)
- **After every plan wave:** Run `pnpm test` — the full suite **including** `tests/go-no-go.spec.ts`, `tests/spike-results.spec.ts`, `tests/schema.spec.ts`. **Any drop in gate count is a failure.** Baseline measured 2026-08-20 before any Phase 1 work: **3 files / 72 assertions**.
- **From wave 2 onward, per wave:** `pnpm typecheck && pnpm lint && pnpm knip` — the SDK-free engine boundary and the non-async-hook rule are lint/typecheck-enforced, so a wave that skips them can land a violation that only the bundle gate catches later.
- **Before `/gsd-verify-work`:** Full suite green, plus the four live runs, in this order — `tracer-e2e.sh`, `runtime-answers.sh`, `spa-load.sh`, `compat-smoke.sh` — each followed by its artifact gate (`tests/phase1-runtime.spec.ts`, `tests/phase1-load.spec.ts`, `tests/phase1-compat.spec.ts`).
- **Max feedback latency:** 15 seconds for the unit tier. The four live runs are a separate, slower tier by necessity — each launches an isolated Caido instance, and `instance.sh` alone allows up to 60 s for readiness.

---

## Per-Task Verification Map

> **Plan numbering rebound 2026-08-20 when plans landed.** The phase leads with a `type="tracer"` plan
> (01-01), so every plan number here is shifted by one from the ROADMAP's original 5-plan sketch. The
> requirement-to-test mapping below is authoritative; the ROADMAP plan list was updated to match.
>
> **Waves revised 2026-08-20 after plan review.** 01-03 and 01-04 were originally parallel in wave 3. They are
> now serialised — 01-04 wave 3, 01-03 wave 4 — because 01-03's consumer is the only caller of every store
> module 01-04 builds, and a callee and its sole caller being written by two plans in one wave is a contract
> break that a `files_modified` overlap check cannot see. Waves 4 and 5 shifted to 5 and 6 accordingly.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01/T2 | 01-01 | 1 | CORE-01 | T-01-01 | Hook callback is non-async and returns `undefined`, not a Promise | unit + lint | `pnpm vitest run packages/backend/src/hooks/passive.spec.ts` | ❌ W0 | ⬜ pending |
| 01-03/T1 | 01-03 | 4 | CORE-02 | T-01-13, T-01-14 | Admission rejects by status / size / kind / scope, first failing axis wins; 304 gets its own reason | unit | `pnpm vitest run packages/backend/src/hooks/admit.spec.ts` | ❌ W0 | ⬜ pending |
| 01-03/T1 | 01-03 | 4 | CORE-03 | T-01-16 | Queue bounded, FIFO, drop-oldest; overflow counted monotonically; never grows past cap | unit | `pnpm vitest run packages/engine/src/queue.spec.ts` | ❌ W0 | ⬜ pending |
| 01-03/T1 | 01-03 | 4 | CORE-03 | T-01-16 | Cap is ≥ the measured 500-event burst (constructor throws at 499, succeeds at 500) | unit | `pnpm vitest run packages/engine/src/queue.spec.ts` | ❌ W0 | ⬜ pending |
| 01-03/T3 | 01-03 | 4 | CORE-04 | — | Exactly one consumer drain loop under concurrent starts | unit (fake SDK) | `pnpm vitest run packages/backend/src/ingest/consumer.spec.ts` | ❌ W0 | ⬜ pending |
| 01-03/T3 | 01-03 | 4 | CORE-05 | — | Consumer holds no SDK object across an `await`; both `undefined` branches counted separately | unit (fake SDK) + AST assertion | `pnpm vitest run packages/backend/src/ingest/consumer.spec.ts` | ❌ W0 | ⬜ pending |
| 01-03/T2 | 01-03 | 4 | CORE-06 | T-01-15 | Yield fires on elapsed time, not chunk count — identical yield counts across different window counts | unit (injected clock) | `pnpm vitest run packages/engine/src/pipeline.spec.ts` | ❌ W0 | ⬜ pending |
| 01-03/T2 | 01-03 | 4 | CORE-07 | T-01-15 | Deadline expiry produces `partial` and keeps prior work; expired at exactly the budget | unit (injected clock) | `pnpm vitest run packages/engine/src/pipeline.spec.ts` | ❌ W0 | ⬜ pending |
| 01-04/T2 | 01-04 | 3 | CORE-08 | — | Identical content hashed and stored once; no new analysis at the current corpus version | integration (in-process SQLite) | `pnpm vitest run packages/backend/src/store/artifacts.spec.ts` | ❌ W0 | ⬜ pending |
| 01-05/T1 | 01-05 | 5 | CORE-09 | T-01-25 | `onProjectChange` including the `null` branch cancels, drains, resets the handle and swaps `project_id` | unit (fake SDK) | `pnpm vitest run packages/backend/src/lifecycle.spec.ts` | ❌ W0 | ⬜ pending |
| 01-05/T2 | 01-05 | 5 | CORE-10 | T-01-27 | Max slice starts at 0, only ever rises, stores the exact float | unit | `pnpm vitest run packages/backend/src/telemetry.spec.ts` | ❌ W0 | ⬜ pending |
| 01-05/T2 | 01-05 | 5 | CORE-10 (wiring) | T-01-27 | A running plugin's `getStatus().maxSliceMs` is non-zero after one processed artifact; deleting the `recordSlice` call makes the spec fail; exactly ONE counters object exists in the package | unit (fake SDK + SQLite fixture) + AST scan | `pnpm vitest run packages/backend/src/telemetry.spec.ts packages/backend/src/ingest/consumer.spec.ts` | ❌ W0 | ⬜ pending |
| 01-03/T3 | 01-03 | 4 | CORE-07 / CORE-10 (persisted) | — | A finished analysis row carries non-null `max_slice_ms` and `bytes_walked` with `scan_state` `done`, and `partial` with both still non-null after a deadline-expiry iteration | integration (fake SDK + SQLite fixture) | `pnpm vitest run packages/backend/src/ingest/consumer.spec.ts` | ❌ W0 | ⬜ pending |
| 01-05/T3 | 01-05 | 5 | CORE-10 | T-01-27 | Max slice under a 200-chunk SPA load measured EXTERNALLY, recorded, ≤ `MAX_SYNC_SLICE_MS`; zero fails | live + artifact gate | `bash scripts/phase1/spa-load.sh && pnpm vitest run tests/phase1-load.spec.ts` | ❌ W0 | ⬜ pending |
| 01-04/T1 | 01-04 | 3 | STORE-01/02 | T-01-20, T-01-21 | Exact table set; every table has `project_id` in its key by ordinal; column allowlist | unit — key ordinals + column allowlist, non-vacuous | `pnpm vitest run packages/backend/src/store/schema.spec.ts` | ❌ W0 | ⬜ pending |
| 01-01/T2 | 01-01 | 1 | STORE-03 | — | Digest derives from `toRaw()` bytes; empty input digest asserted | unit | `pnpm vitest run packages/engine/src/digest.spec.ts` | ❌ W0 | ⬜ pending |
| 01-01/T2 | 01-01 | 1 | STORE-03 (URL edge) | T-01-02 | One proxied response yields one artifact row AND one observation row carrying the request id and the URL with its query parameter NAMES preserved and every VALUE redacted (amended 2026-08-21 by 01-07); `artifacts` has no `url` column | live end-to-end | `bash scripts/phase1/tracer-e2e.sh` | ❌ W0 | ⬜ pending |
| 01-03/T3 | 01-03 | 4 | STORE-03 / CORE-08 (wiring) | — | The consumer writes BOTH rows unconditionally per iteration, and a repeat digest at the current corpus version leaves the `analyses` count unchanged while `seen_count` and observations advance | integration (fake SDK + SQLite fixture) | `pnpm vitest run packages/backend/src/ingest/consumer.spec.ts` | ❌ W0 | ⬜ pending |
| 01-04/T1 | 01-04 | 3 | STORE-04 | — | Analysis rows key on `detector_set_hash`; a corpus bump creates a new row | integration | `pnpm vitest run packages/backend/src/store/artifacts.spec.ts` | ❌ W0 | ⬜ pending |
| 01-04/T1 | 01-04 | 3 | STORE-05 | T-01-24 | Migration ladder runs forward on a **populated** DB, loses no row, is a no-op on re-run | integration | `pnpm vitest run packages/backend/src/store/migrations.spec.ts` | ❌ W0 | ⬜ pending |
| 01-04/T3 | 01-04 | 3 | STORE-06 (behaviour) | T-01-22 | Retention bounds row count AND age, per-pass cap honoured, no orphans, no cross-project effect | integration | `pnpm vitest run packages/backend/src/store/retention.spec.ts` | ❌ W0 | ⬜ pending |
| 01-03/T3 | 01-03 | 4 | STORE-06 (schedule) | T-01-22 | A RUNNING plugin trims with no external trigger: crossing `RETENTION_SWEEP_EVERY_N` performs exactly ONE bounded pass and row counts fall toward the bound | integration (fake SDK + SQLite fixture) | `pnpm vitest run packages/backend/src/ingest/consumer.spec.ts` | ❌ W0 | ⬜ pending |
| 01-04/T3 | 01-04 | 3 | STORE-07 | T-01-19 | No named parameter in any store SQL; no array-as-sole-argument bind; no unbound multi-row query missing `project_id` | static AST over `store/**` | `pnpm vitest run packages/backend/src/store/sql-discipline.spec.ts` | ❌ W0 | ⬜ pending |
| 01-06/T2 | 01-06 | 6 | COMPAT-01 | T-01-31, T-01-32 | Below-minimum registers no hook and opens no DB; `0.6.0 > 0.57.1`; `0.10.0 > 0.9.0`; absent/empty version never throws | unit (fake `sdk.runtime`) | `pnpm vitest run packages/backend/src/compat.spec.ts` | ❌ W0 | ⬜ pending |
| 01-06/T3 | 01-06 | 6 | COMPAT-01 | T-01-31 | Below-minimum refusal observed on the REAL `caido-cli 0.55.3` — leg C | live (3-leg) | `bash scripts/phase1/compat-smoke.sh && pnpm vitest run tests/phase1-compat.spec.ts` | ❌ W0 | ⬜ pending |
| 01-06/T3 | 01-06 | 6 | COMPAT-02 | T-01-35 | Every surface in `REQUIRED_SURFACES` exercised on 0.57.1 **and** 0.58.0; surface sets identical and equal to the export | live (3-leg) + artifact gate | `bash scripts/phase1/compat-smoke.sh && pnpm vitest run tests/phase1-compat.spec.ts` | ❌ W0 | ⬜ pending |
| 01-03/T3 | 01-03 | 4 | ENC-01 | — | `sha256(toRaw())` ≠ `sha256(utf8(toText()))` on the non-UTF-8 fixture: 222 bytes vs 242; offsets map to raw bytes | unit, against `corpus/encoded/nonutf8.js` | `pnpm vitest run packages/engine/src/decode.spec.ts` | ❌ W0 | ⬜ pending |
| 01-02/T3 | 01-02 | 2 | DIST-05 | T-01-09 | Bundle imports ⊆ measured allowlist; `zlib`, `node:crypto` and `caido:crypto` fixtures each FAIL the gate | static + fixtures | `node scripts/ci/check-bundle-imports.mjs && pnpm vitest run scripts/ci/check-bundle-imports.spec.ts` | ❌ W0 | ⬜ pending |
| 01-02/T3 | 01-02 | 2 | DIST-05 (DET-03 precondition) | T-01-11 | No module under `packages/engine/src/` imports `caido:` or `@caido/*`; manifest has no `@caido/*` entry | static AST + manifest | `pnpm vitest run packages/engine/src/boundary.spec.ts` | ❌ W0 | ⬜ pending |
| 01-02/T2 | 01-02 | 2 | DIST-06 | T-01-10 | `pnpm.overrides` pins `primevue@4.1.0` and `tailwindcss@3.4.13`; lockfile agrees; `allowBuilds` survives | static | `pnpm vitest run tests/pins.spec.ts` | ❌ W0 | ⬜ pending |
| 01-01/T2 | 01-01 | 1 | Phase 0 contract | T-01-08 | Every measured engine constant is generated from `go-no-go.json`; a hand edit fails CI; policy derivations asserted | unit + regeneration drift gate | `pnpm vitest run packages/engine/src/thresholds.spec.ts` | ❌ W0 | ⬜ pending |
| 01-01/T3 | 01-01 | 1 | Open Questions 1 & 2 | — | `sqlite_version() >= 3.24` measured inside Caido; `requests.get` reload hit rate 100% immediately AND after a 500-event burst | live + artifact gate | `bash scripts/phase1/runtime-answers.sh && pnpm vitest run tests/phase1-runtime.spec.ts` | ❌ W0 | ⬜ pending |
| 01-01/T2 | 01-01 | 1 | Tracer (end-to-end) | T-01-01…06 | One proxied JS response becomes one content-addressed row whose digest matches a HOST-computed SHA-256 | live end-to-end | `bash scripts/phase1/tracer-e2e.sh` | ❌ W0 | ⬜ pending |
| 01-05/T3 | 01-05 | 5 | Success criterion 4 (restart) | — | Artifacts survive a real Caido restart; migration is a no-op on the second boot | live | `bash scripts/phase1/spa-load.sh && pnpm vitest run tests/phase1-load.spec.ts` | ❌ W0 | ⬜ pending |
| 01-02/T2 | 01-02 | 2 | Regression | T-01-12 | The Phase 0 gates still run and still pass after the workspace conversion — before/after file and assertion counts compared as numbers | meta | `pnpm test` — baseline measured 2026-08-20: **3 files / 72 assertions** | ✅ all three specs exist; the "still runs" comparison does not | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Each item is bound to the plan and task that creates it, so Wave 0 is a checklist against real work rather than a wish list.

- [ ] **01-01/T2** `vitest.config.ts` — extend `include` to cover `packages/*/src/**/*.spec.ts` and `scripts/ci/**/*.spec.ts` **without dropping** `tests/**/*.spec.ts`; no `projects`/`workspace` key (five files resolve the Phase 0 results dir from a bare relative literal)
- [ ] **01-01/T2** `scripts/ci/gen-thresholds.mjs` + `packages/engine/src/thresholds.generated.ts` + `thresholds.ts` — the generator and the constants, on the tracer's critical path (the admission ceiling and the queue cap are imported from them)
- [ ] **01-01/T3** `packages/engine/src/thresholds.spec.ts` — the four contract gates (regeneration drift, per-id equality, POLICY derivations, Broken Window #6 tripwire). Deliberately in task 3 rather than the tracer task: it is the heaviest single piece of test authoring in the plan and has no bearing on whether the vertical slice works
- [ ] **01-01/T2** `scripts/phase1/env.sh` — the whole Phase 1 port block (8971 instance, 8972 origin, 8973/8974 compat legs, 8975 spare) so no later plan edits it and no two scripts collide
- [ ] **01-01/T2** `scripts/phase1/tracer-e2e.sh` — the live end-to-end proof, host-computed digest compared against the row read back
- [ ] **01-01/T3** `scripts/phase1/runtime-answers.sh` + `tests/phase1-runtime.spec.ts` — Open Questions 1 and 2 measured and gated
- [ ] **01-02/T2** `tests/pins.spec.ts` — DIST-06 override, exact-pin and `allowBuilds`-survival assertions
- [ ] **01-02/T3** `scripts/ci/check-bundle-imports.mjs` + `check-bundle-imports.spec.ts` — the DIST-05 allowlist gate with THREE negative fixtures (`zlib`, `node:crypto`, `caido:crypto`)
- [ ] **01-02/T3** `packages/engine/src/boundary.spec.ts` — DET-03's precondition, AST scan plus manifest assertion
- [ ] **01-03/T1** `packages/backend/test/fixtures/fake-sdk.ts` — a fake `SDK` (`runtime.version`, `projects.getCurrent`, `requests.get`, `requests.inScope`, `meta.db`, `console`, `api`, `events`) plus fake request/response builders that reproduce both header casings and the array-valued header. Nothing in this repo fakes an SDK today, and four later plans depend on it.
- [ ] **01-03** `packages/engine/src/*.spec.ts` — queue, chunker, deadline, pipeline, digest, decode
- [ ] **01-03** `packages/backend/src/hooks/*.spec.ts` and `ingest/consumer.spec.ts`
- [ ] **01-01/T2** `packages/backend/src/store/observations.ts` — `recordObservation`, created and CALLED on the tracer's own path, so the URL edge is never a wave-later addition
- [ ] **01-04/T1** An **in-process SQLite fixture** (`packages/backend/test/fixtures/sqlite-fixture.ts`) wrapping `node:sqlite` in the Caido `Database`/`Statement` async shape. Verified this session: it supports `ON CONFLICT DO UPDATE`, `PRAGMA user_version` and `PRAGMA table_info` with key ordinals. It is single-connection and **cannot** reproduce the pool-affinity failure mode, so pool behaviours are live-only and are exercised by `tracer-e2e.sh`.
- [ ] **01-04** `packages/backend/src/store/*.spec.ts` — schema (key ordinals + column allowlist), migrations (populated DB), artifacts, retention, sql-discipline
- [ ] **01-05/T1,T2** `packages/backend/src/lifecycle.spec.ts` and `telemetry.spec.ts`, plus the rewire of `consumer.ts` and `hooks/passive.ts` onto `telemetry.ts`'s counters and the `recordSlice` call site — 01-05 owns both ends of that wire because `telemetry.ts` does not exist until wave 5
- [ ] **01-05/T3** `scripts/phase1/spa-load.sh` + `tests/phase1-load.spec.ts` — external RPC prober with a same-machine baseline during a synthetic 200-chunk load, plus the restart-persistence check
- [ ] **01-06/T1** `scripts/phase1/fetch-caido.sh` — hash-pinned fetch of the current release, verified before extraction
- [ ] **01-06/T2** `packages/backend/src/compat.spec.ts`
- [ ] **01-06/T3** `scripts/phase1/compat-smoke.sh` + `tests/phase1-compat.spec.ts` — three legs (0.57.1, 0.58.0, below-minimum 0.55.3), reusing `scripts/spike/instance.sh` with `CAIDO_BIN` and `EXPECT_VERSION` per leg

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
`workflow.human_verify_mode` is `end-of-phase`, so none of these is a mid-flight `checkpoint:human-verify`. Each is
embedded as a `<verify><human-check>` block on the task that produces it and is harvested into `01-UAT.md` at
end-of-phase. The automated half of each row runs regardless.

| Behavior | Requirement | Plan / Task | Why Manual | Test Instructions |
|----------|-------------|-------------|------------|-------------------|
| Plugin RPC stays responsive throughout the 200-chunk load — no quiet stretch followed by a burst of replies | Success criterion 3, CORE-10 | 01-05 / T3 `<human-check>` | A starved thread cannot report that it is starved, and this runtime exposes no scheduler introspection at all (`perf_hooks`, `process`, `llrt:qjs` all fail to load). The automated gate proves the max slice and a latency tolerance; only a human can spot a stall the tolerance let through. | Run `bash scripts/phase1/spa-load.sh`, then read the baseline and loaded distributions in `results/spa-load.json`. A max-slice number suspiciously close to the budget on every run is the instrument, not the system. |
| Leg C's refusal message reads as a clear explanation rather than an obscure failure | COMPAT-01 | 01-06 / T3 `<human-check>` | "Clear" is a judgement about prose. The automated gate asserts the message contains both version numbers; whether it explains *why* the difference matters is a human call. | Read the leg C message recorded in `results/compat-smoke.json` as an operator would see it in the host log. |
| Per-surface outcome DETAIL differs between 0.57.1 and 0.58.0 | COMPAT-02 | 01-06 / T3 `<human-check>` | The automated gate proves every surface was exercised and succeeded on both legs. A behavioural difference in the *detail* — a different row shape, a different error string, a different `sqlite_version` — is exactly what a byte-identical type surface cannot reveal, and it is the phase's top open risk (assumption A1). | Skim leg B's surface matrix against leg A's in `results/compat-smoke.json` before Phase 2 builds on it. |
| Below-minimum refusal observed on a real old binary rather than a faked version string | COMPAT-01 | 01-06 / T3 (automated leg C) | Listed here because RESEARCH.md proposed it as a manual checkpoint. It is **automated instead**: leg C launches the real `caido-cli 0.55.3` via `instance.sh` with `CAIDO_BIN` passed explicitly, and the gate asserts zero artifact rows plus a refusal-mode field from a closed value set. No human step remains. | `bash scripts/phase1/compat-smoke.sh && pnpm vitest run tests/phase1-compat.spec.ts` |

### Gap-closure plans 01-07, 01-08 and 01-09 (added 2026-08-21)

The map above stops at plan 01-06 because it was written when the phase had six plans. The phase now
has NINE, and EIGHT further tasks (01-07 three, 01-08 three, 01-09 two — plan 01-07's own prose said
"seven", which was an undercount of 01-08 by one; the map below is built from the plans' actual task
lists rather than from that number). This is STALENESS, not a coverage hole: every non-checkpoint task in the three gap plans
already carries an `<automated>` verify, no task uses a watch-mode flag, and no three-task window
lacks one. The rows below bring the ledger up to date rather than filling anything in.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-07/T1 | 01-07 | 7 | STORE-03 | T-01-30, T-01-31, T-01-32 | Every query VALUE is replaced before the row is written; NAMES and their order survive; bounded at `QUERY_NAME_MAX`; redact BEFORE truncate; idempotent; no pattern execution | unit + integration (SQLite fixture) | `pnpm vitest run packages/backend/src/store/observations.spec.ts` | ✅ | ✅ done |
| 01-07/T2 | 01-07 | 7 | STORE-07 | T-01-33, T-01-52, T-01-34 | No module under `store/` renders an error-shaped binding without `describeError` — eight catch sites plus `finishAnalysis`'s parameter, the one line that writes the `analyses.error` column; non-vacuity assertion names all six modules | static AST gate, every rule fixture-proven | `pnpm vitest run packages/backend/src/store/error-redaction.spec.ts` | ✅ | ✅ done |
| 01-07/T3 | 01-07 | 7 | STORE-03 | T-01-35 | A per-run random secret in a proxied URL's query is absent from `SELECT url FROM observations` read with `sqlite3` from OUTSIDE Caido, and absent from the RPC projection — both, not either | live end-to-end | `bash scripts/phase1/tracer-e2e.sh && pnpm test` | ✅ | ✅ done |
| 01-08/T1 | 01-08 | 8 | STORE-03, STORE-06 | T-01-36 | Count how many pre-policy rows are actually exposed WITHOUT ever reading a value — the exposure artifact itself must contain no URL | live measurement + artifact gate | `node -e "…observation-url-exposure.json…" && ! grep -qE 'https?://' …/observation-url-exposure.json` | ⬜ | ⬜ pending |
| 01-08/T2 | 01-08 | 8 | STORE-03 | T-01-36 | **NO AUTOMATED VERIFY, AND THAT IS CORRECT.** A `checkpoint:decision` with `gate="blocking-human"`: rows written before 01-07 still carry verbatim query values, and rewriting or deleting them is ONE-WAY. The decision is the operator's; a gate cannot make it. Listed rather than omitted so the ONE row in the phase without a command is VISIBLE as such rather than absent. | `checkpoint:decision` | — (human decision, `gate="blocking-human"`) | n/a | ⬜ pending |
| 01-08/T3 | 01-08 | 8 | STORE-03, STORE-06 | T-01-36 | Whatever the checkpoint selected is implemented convergently and visibly | unit + integration | `pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ⬜ | ⬜ pending |
| 01-09/T1 | 01-09 | 9 | CORE-11 (was CORE-01) | T-01-01 | The CORE-01 prohibition acquires an AST gate that can actually FAIL — no outbound surface reachable from backend source | static gate (TDD) | `pnpm test -- packages/backend/src/outbound-prohibition.spec.ts && pnpm typecheck && pnpm lint && pnpm knip` | ⬜ | ⬜ pending |
| 01-09/T2 | 01-09 | 9 | CORE-11 (was CORE-01) | T-01-01 | The gate is mutation-proven against the REAL tree and the coverage rows point at it | static gate + bundle gate | `pnpm test && pnpm build:backend && pnpm check:bundle && git diff --exit-code packages/backend/src/hooks/passive.ts` | ⬜ | ⬜ pending |

> Rows for 01-08 and 01-09 are recorded from those plans' declared `<verify>` blocks. Their `Status`
> stays `pending` until each is executed; 01-07's three rows are marked done because they were.

> **Requirement-pointer amendment, 2026-08-21 (gap-closure round 2, plan 01-10 task 3).** The
> Requirement cell of rows `01-09/T1` and `01-09/T2` read `CORE-01` when written and now read
> `CORE-11 (was CORE-01)`. The outbound-traffic prohibition was split out of CORE-01 into its own
> requirement id on that date — CORE-01's text is the non-async-handler requirement and says nothing
> about outbound traffic — following the operator's own STORE-01 → STORE-08 precedent from this
> phase's UAT. The reason is recorded inline on CORE-11 in `.planning/REQUIREMENTS.md`.
>
> **The rule this follows, stated once so it is not re-litigated.** A ledger POINTER may be amended in
> place when the thing it points at is RENAMED, provided the amendment is VISIBLE in the cell itself
> (hence `(was CORE-01)`, not a silent substitution) and explained in a dated note. A ledger's
> EVIDENCE — its command, its test type, its status, its description of the secure behaviour — is
> NEVER rewritten. Amending a pointer keeps the record readable; rewriting evidence destroys it. They
> are different acts and only the first is permitted. Every other cell of those two rows is
> byte-identical.
>
> `01-09-PLAN.md`'s own frontmatter deliberately still reads `CORE-01`, and so do `01-VERIFICATION.md`,
> `01-REVIEW.md`, `01-UAT.md` and plans `01-01` … `01-09`. Those are the historical record of what was
> planned and what was found; their tags were correct when written, and rewriting evidence to match a
> later ledger is the one edit this phase must never make.

---

### Gap-closure round 2 — plans 01-10, 01-11, 01-12, 01-13 and 01-14 (added 2026-08-21)

APPENDED to the table above, which is left exactly as it was. The 2026-08-21T13:45 re-verification
found both UAT gaps only PARTIALLY closed and the phase grew from NINE plans to FOURTEEN, adding TWELVE
tasks: 01-10 four, 01-11 three, 01-12 two, 01-13 one, 01-14 two. That count was taken by counting
`<task` elements in the five PLAN files rather than from any prose — the files are the authority, and
they agreed.

Each row's Automated Command is copied from the task's own `<verify><automated>` block rather than
invented, so a row cannot promise a check the plan does not run. Two things in the Requirement column
are deliberate: 01-12's rows carry **CORE-11**, which exists on disk because plan 01-10 task 3 opened it
in wave 10 precisely so the plan that owns the gate could declare the requirement it enforces; and the
rows carrying `STORE-03` or `STORE-07` are written as the plans declare them, with no correction here,
because those two ledger collisions are recorded as known-and-deferred in `.planning/REQUIREMENTS.md`
and a row silently disagreeing with the requirement file would be a third version of the truth.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-10/T1 | 01-10 | 10 | STORE-03 | T-01-36, T-01-41 | **NO AUTOMATED VERIFY, AND THAT IS CORRECT — the SECOND such row in the phase.** A `checkpoint:decision` with `gate="blocking-human"`: what a bare (`=`-less) query segment becomes is a policy over bytes written into a durable column, and the three options each cost a different analytic signal. A gate cannot make that choice. Listed rather than omitted so the exception is visible instead of absent. | `checkpoint:decision` | — (human decision, `gate="blocking-human"`) | n/a | ✅ done — `redact-bare` selected 2026-08-21 |
| 01-10/T2 | 01-10 | 10 | STORE-03 | T-01-53, T-01-54, T-01-56 | A bare `=`-less query segment is replaced whole; one executed case per credential format (PAT 40, AWS 20, Stripe 32, session hex 32, UUID 36, JWT 43, opaque 16 and 12), each RED when the `eq === -1` branch is reverted; empty segments preserved; idempotent; still no pattern execution | unit + integration (SQLite fixture), TDD | `pnpm vitest run packages/backend/src/store/observations.spec.ts && pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ✅ | ✅ done |
| 01-10/T3 | 01-10 | 10 | CORE-11 | T-01-71, T-01-76 | The outbound prohibition has its own requirement id, opened BEFORE plan 01-12 declares it; every live ledger pointing at it carries a dated amendment; the two remaining STORE-* collisions are marked with a reason and an owner | ledger gate (anchored greps) + whole suite | `grep -q 'CORE-11' .planning/REQUIREMENTS.md && sed -n '/^### Phase 1:/,/^### Phase 2:/p' .planning/ROADMAP.md \| grep -q '^\*\*Requirements\*\*:.*CORE-11' && grep -q 'CORE-11.*\| Phase 1 \|' .planning/ROADMAP.md && grep -q 'CORE-11' .planning/STATE.md && git diff --exit-code packages/ && pnpm test` | ✅ | ✅ done |
| 01-10/T4 | 01-10 | 10 | STORE-01, STORE-03 | T-01-55 | The T-01-21 claim is stated PER URL GRAMMAR and no wider than what runs: the query grammar enforced and its spec named, userinfo / `;` path parameters / path-embedded tokens named as OPEN with plan 01-11 as owner | unit + doc gate | `pnpm vitest run packages/backend/src/store/schema.spec.ts tests/schema.spec.ts && pnpm test` | ✅ | ✅ done |
| 01-11/T1 | 01-11 | 11 | STORE-03 | T-01-57, T-01-58 | URL userinfo and `;`-delimited path-parameter VALUES redacted by the same policy through one shared per-segment helper, so the two delimiters cannot drift apart; the path-embedded-token residual named rather than left to be found | unit + integration | `pnpm vitest run packages/backend/src/store/observations.spec.ts packages/backend/src/store/schema.spec.ts && pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ⬜ | ⬜ pending |
| 01-11/T2 | 01-11 | 11 | STORE-07 | T-01-59, T-01-60, T-01-77 | `sdk.meta.path()` stops crossing the `getStatus` RPC in an error string — `redactPaths` applied after the URL redaction and before truncation, proven at the RPC level; no pattern added on a `REDOS_RECOVERY = "kill"` runtime | unit + RPC-level integration | `pnpm vitest run packages/backend/src/telemetry.spec.ts packages/backend/src/store/schema.spec.ts && pnpm test && pnpm typecheck && pnpm lint` | ⬜ | ⬜ pending |
| 01-11/T3 | 01-11 | 11 | STORE-03 | T-01-61, T-01-55 | The "executes no pattern" gate is re-anchored on the AST rather than a line-filtered substring scan, widened to `telemetry.ts`, and its claim narrowed to its reach — a gate that a comment can defeat or trip is not a gate | static AST gate, mutation-proven | `pnpm vitest run packages/backend/src/store/observations.spec.ts && pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ⬜ | ⬜ pending |
| 01-12/T1 | 01-12 | 12 | CORE-11 | T-01-62, T-01-63, T-01-64, T-01-65, T-01-67 | The outbound gate sees the 14 shapes a 22-shape probe found it missing — `globalThis`/`window`/`self`/`global` fetch, destructured and assigned receivers, any non-allowlisted method of an identified receiver, `.call`/`.apply`/`Reflect.apply`, the global constructors — and REPORTS what it cannot read instead of calling it clean | static AST gate, every rule fixture-proven | `pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts && pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ⬜ | ⬜ pending |
| 01-12/T2 | 01-12 | 12 | CORE-11 | T-01-66, T-01-47, T-01-51, T-01-50 | `packages/engine/src` — which ships in the bundle and was walked by NO outbound gate — is walked under the same rule set, with a by-name non-vacuity list and at least one file asserted per root; the widened gate mutation-proven against real shipped source | static gate + bundle gate, mutation-proven | `pnpm test && pnpm build:backend && pnpm check:bundle && git diff --exit-code packages/backend/src/hooks/passive.ts packages/engine/src/pipeline.ts packages/backend/src/ingest/consumer.ts` | ⬜ | ⬜ pending |
| 01-13/T1 | 01-13 | 13 | STORE-07 | T-01-68, T-01-69, T-01-70, T-01-37 | The error-redaction gate FOLLOWS the binding instead of matching it — `derivesFrom` unwraps casts, parentheses and copies, so `e.message`, `String(e as Error)`, `e.toString()`, `JSON.stringify(e)` and a destructured error parameter are all reachable; every existing negative fixture still passes | static AST gate, mutation-proven | `pnpm vitest run packages/backend/src/store/error-redaction.spec.ts && pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ⬜ | ⬜ pending |
| 01-14/T1 | 01-14 | 14 | STORE-03 | T-01-72, T-01-73, T-01-74, T-01-75 | The live fixture exercises the grammars this phase now redacts — a per-run random secret as a BARE segment and as a `;` path parameter — asserted absent from BOTH the raw column read with `sqlite3` and the RPC projection; both reads open READ-ONLY; the recorded build is the build that ran | live end-to-end (script shape gate) | `bash -n scripts/phase1/tracer-e2e.sh && pnpm test && git diff --exit-code tests/phase1-load.spec.ts tests/phase1-runtime.spec.ts packages/backend/src/compat.ts` | ⬜ | ⬜ pending |
| 01-14/T2 | 01-14 | 14 | STORE-03 | T-01-54, T-01-35 | Run it LIVE, twice: one clean pass, and one deliberate failure in which the bare-segment branch is reverted, rebuilt, and the tracer must FAIL naming the bare-segment secret specifically. A live tier that has never been observed failing is not evidence. | live end-to-end + committed mutation run | `pnpm build:backend && pnpm check:bundle && bash scripts/phase1/tracer-e2e.sh && pnpm test && git diff --exit-code packages/backend/src/store/observations.ts` | ⬜ | ⬜ pending |

> Rows are recorded from each plan's declared `<verify>` blocks. `Status` stays `pending` until the task
> is executed; 01-10's four rows are marked done because plan 01-10 ran on 2026-08-21.

---

### Gap-closure round 3 — plans 01-15, 01-16 and 01-17 (added 2026-08-22)

APPENDED again, and both tables above are left exactly as they were. The 2026-08-21 verification after
round 2 returned 8 of 9 with CR-07 blocking the ninth, and the phase grew from FOURTEEN plans to
SEVENTEEN, adding EIGHT tasks: 01-15 three, 01-16 three, 01-17 two. That count was taken by counting
`<task` elements in the three PLAN files rather than from any prose — the files are the authority, and
they agreed.

Each row's Automated Command is copied VERBATIM from the task's own `<verify><automated>` block rather
than invented, so a row cannot promise a check the plan does not run. The `STORE-03` and `STORE-01`
entries are written as the plans declare them, with no correction here, for the reason round 2's note
already gives: those ledger collisions are recorded as known-and-deferred in `.planning/REQUIREMENTS.md`
and a row silently disagreeing with the requirement file would be a third version of the truth.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-15/T1 | 01-15 | 15 | STORE-03 | T-01-78, T-01-79, T-01-83 | A segment whose value half is empty or is only `=` padding was never a `name=value` pair and is redacted WHOLE, on BOTH delimiters through the one shared helper — so a standard-base64 credential is no longer promoted into the retained name half. Proven end to end by reading the row back out of a real SQLite file, with the failing path EXECUTED and committed before the fix. No pattern, no `RegExp`, no new import. | tracer: unit + integration (SQLite fixture), RED-then-GREEN | `pnpm vitest run packages/backend/src/store/observations.spec.ts && pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ✅ | ✅ done |
| 01-15/T2 | 01-15 | 15 | STORE-03 | T-01-80, T-01-82 | The fixture set is derived from the POLICY question rather than from the branch under test: `=`-bearing shapes with a non-vacuity assertion requiring one-pad and two-pad entries, every absence assertion searching the padding-stripped core through ONE shared helper across BOTH populations, the `;` mirror of every shape, and four residuals pinned by executed cases. Mutation-proven. | unit, mutation-proven | `pnpm vitest run packages/backend/src/store/observations.spec.ts && pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ✅ | ✅ done |
| 01-15/T3 | 01-15 | 15 | STORE-01, STORE-03 | T-01-81, T-01-84 | The three artifacts that asserted this defect could not happen describe what the code does; the OPEN list names TWO grammars instead of one; the userinfo row states its `://` precondition and the `;` row is qualified to the PATH; and the QUERY entry's live-proof sentence is scoped to the grammars the tracer exercises today with plan 01-17 named by number as the owner of the padded grammar's live proof. | unit + doc gate (citations grep-verified) | `pnpm vitest run packages/backend/src/store/schema.spec.ts tests/schema.spec.ts && pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ✅ | ✅ done |
| 01-16/T1 | 01-16 | 16 | CORE-11 | T-01-85, T-01-86, T-01-87, T-01-51 | The outbound gate REPORTS the receiver it cannot read instead of calling it clean, and covers the beacon and dynamic-code surfaces | static AST gate, every rule fixture-proven | `pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts && pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ✅ | ⬜ pending |
| 01-16/T2 | 01-16 | 16 | STORE-07 | T-01-88, T-01-89, T-01-90 | The rendered-error axis: the three unseen renders, the closed name set, the renderer that can itself throw, and a disclosure that names the residual it actually has | unit + static gate | `pnpm vitest run packages/backend/src/store/error-redaction.spec.ts packages/backend/src/telemetry.spec.ts packages/backend/src/store/schema.spec.ts && pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ✅ | ⬜ pending |
| 01-16/T3 | 01-16 | 16 | STORE-03 | T-01-91, T-01-92, T-01-93 | The pattern gate's module-local premise is either closed or measured and stated as a bound — a gate whose premise is unstated is a gate whose reach nobody knows | static AST gate, mutation-proven | `pnpm vitest run packages/backend/src/store/observations.spec.ts && pnpm test && pnpm typecheck && pnpm lint && pnpm knip` | ✅ | ⬜ pending |
| 01-17/T1 | 01-17 | 17 | STORE-03 | T-01-94, T-01-95, T-01-97, T-01-98, T-01-99 | A dye that PADS — every existing dye is `openssl rand -hex` and hex carries no `=`, so the live tier is blind to the grammar 01-15 closed — with assertions that search the padding-stripped core, an instrument that reports what it measured, and the gate the script header claims | live end-to-end (script shape gate) + unit | `bash -n scripts/phase1/tracer-e2e.sh && pnpm vitest run tests/pins.spec.ts packages/backend/src/store/schema.spec.ts && pnpm test && git diff --exit-code tests/phase1-load.spec.ts tests/phase1-runtime.spec.ts packages/backend/src/compat.ts` | ✅ | ⬜ pending |
| 01-17/T2 | 01-17 | 17 | STORE-03 | T-01-96, T-01-54, T-01-35, T-01-73, T-01-74 | Run it LIVE, twice: one clean pass and one deliberate failure, both committed. A live tier that has never been observed failing is not evidence — the same rule round 2 applied to the `=`-less branch, applied now to the padded one | live end-to-end + committed mutation run | `pnpm build:backend && pnpm check:bundle && pnpm test && git diff --exit-code packages/backend/src/store/observations.ts` | ✅ | ⬜ pending |

> The three 01-15 rows are marked done because plan 01-15 ran on 2026-08-22. 01-16 and 01-17 stay
> `pending` — they are waves 16 and 17, serialised behind this one for the reason all three rounds have
> serialised: each plan deliberately breaks the shared tree to prove its gates can FAIL, and two such
> plans running concurrently cannot tell their own mutation's red from the other plan's.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — every task in all FOURTEEN plans carries one, with exactly TWO deliberate exceptions, both `checkpoint:decision` under `gate="blocking-human"`: `01-08/T2` (whether to rewrite or delete rows written before the redaction policy — one-way data destruction) and `01-10/T1` (what a bare `=`-less query segment becomes — a policy over bytes written into a durable column). Both are human decisions a gate cannot make, and both are LISTED in the map rather than omitted, so each exception is visible instead of absent. The four live-tier commands are declared as a separate slower tier above. (Extended from six plans to nine on 2026-08-21 by gap-closure plan 01-07, from nine to fourteen the same day by gap-closure round 2, plan 01-10, and from fourteen to SEVENTEEN on 2026-08-22 by gap-closure round 3, plan 01-15.) ROUND 3 INTRODUCES NO NEW NO-COMMAND ROW: all eight new rows carry an `<automated>` block copied verbatim from their task, so `01-08/T2` and `01-10/T1` remain the only two deliberate exceptions in the phase.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — RE-CHECKED against the twelve new rows on 2026-08-21 rather than assumed to still hold. `01-08/T2` is bracketed by `01-08/T1` and `01-08/T3`, both automated. `01-10/T1` is the first task of its plan, so its bracket crosses the plan boundary: it is preceded by `01-09/T2` and followed by `01-10/T2`, both automated. The two no-command rows are four waves apart and never adjacent, so no three-task window anywhere in the fourteen plans lacks an automated verify. RE-CHECKED AGAIN against the EIGHT new rows on 2026-08-22 rather than asserted to still hold: all eight carry an automated command, so every window that includes one of them contains at least one automated verify by construction, and the two exceptions stay where they were in waves 8 and 10 — five waves and more from the nearest round-3 row. No three-task window anywhere in the seventeen plans lacks an automated verify.
- [x] Wave 0 covers all MISSING references — every ❌ W0 row in the map above appears in the Wave 0 list, bound to the plan and task that creates it
- [x] No watch-mode flags — every command is `vitest run` or a `bash` script; `test:watch` is never invoked by a plan
- [x] Feedback latency < 15s — for the unit tier, which is the per-task-commit loop. The four live runs exceed it by necessity and are declared as their own tier rather than pretended away
- [x] `nyquist_compliant: true` set in frontmatter

`wave_0_complete` deliberately stays `false`: it records that execution has actually built the Wave 0
infrastructure, not that the plan schedules it. Execute-phase flips it.

**Approval:** planner sign-off 2026-08-20, after the plan-checker's three blockers were closed. `status`
stays `draft` until `/gsd-validate-phase` sets `validated` — that transition is not the planner's to make.
