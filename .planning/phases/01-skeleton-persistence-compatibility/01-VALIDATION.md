---
phase: 1
slug: skeleton-persistence-compatibility
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-20
revised: 2026-08-20
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
| 01-01/T2 | 01-01 | 1 | STORE-03 (URL edge) | T-01-02 | One proxied response yields one artifact row AND one observation row carrying the request id and the query-preserving URL; `artifacts` has no `url` column | live end-to-end | `bash scripts/phase1/tracer-e2e.sh` | ❌ W0 | ⬜ pending |
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

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — every task in all six plans carries one; the four live-tier commands are declared as a separate slower tier above
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — no task anywhere in the phase lacks one
- [x] Wave 0 covers all MISSING references — every ❌ W0 row in the map above appears in the Wave 0 list, bound to the plan and task that creates it
- [x] No watch-mode flags — every command is `vitest run` or a `bash` script; `test:watch` is never invoked by a plan
- [x] Feedback latency < 15s — for the unit tier, which is the per-task-commit loop. The four live runs exceed it by necessity and are declared as their own tier rather than pretended away
- [x] `nyquist_compliant: true` set in frontmatter

`wave_0_complete` deliberately stays `false`: it records that execution has actually built the Wave 0
infrastructure, not that the plan schedules it. Execute-phase flips it.

**Approval:** planner sign-off 2026-08-20, after the plan-checker's three blockers were closed. `status`
stays `draft` until `/gsd-validate-phase` sets `validated` — that transition is not the planner's to make.
