---
phase: 1
slug: skeleton-persistence-compatibility
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-20
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
- **After every plan wave:** Run `pnpm test` — the full suite **including** `tests/go-no-go.spec.ts`, `tests/spike-results.spec.ts`, `tests/schema.spec.ts`. **Any drop in gate count is a failure.**
- **Before `/gsd-verify-work`:** Full suite green, plus the two live runs — `compat-smoke.sh` against 0.57.1 **and** 0.58.0, and `spa-load.sh` with a recorded max-slice artifact
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| pending | 01-02 | — | CORE-01 | — | Hook callback is non-async and returns synchronously | unit + lint | `pnpm vitest run packages/backend/src/hooks/passive.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-02 | — | CORE-02 | — | Admission rejects by status / size / kind / scope; 304 gets its own reason | unit | `pnpm vitest run packages/backend/src/hooks/admit.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-02 | — | CORE-03 | — | Queue bounded; overflow counted; never grows past cap | unit | `pnpm vitest run packages/engine/src/queue.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-02 | — | CORE-03 | — | Cap is ≥ the measured 500-event burst (constructor throws below 500) | unit | `pnpm vitest run packages/engine/src/queue.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-02 | — | CORE-04 | — | Exactly one consumer in flight under concurrent offers | unit | `pnpm vitest run packages/engine/src/consumer.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-02 | — | CORE-05 | — | Consumer holds no SDK object across an `await` | unit (fake SDK) + type test | `pnpm vitest run packages/backend/src/ingest/consumer.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-02 | — | CORE-06 | — | Yield fires on elapsed time, not chunk count | unit (injected clock) | `pnpm vitest run packages/engine/src/pipeline.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-02 | — | CORE-07 | — | Deadline expiry produces `partial`, keeps prior work | unit | `pnpm vitest run packages/engine/src/pipeline.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-03 | — | CORE-08 | — | Identical content hashed and stored once | integration (real SQLite) | `pnpm vitest run packages/backend/src/store/artifacts.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-04 | — | CORE-09 | — | `onProjectChange` (incl. `null`) cancels and swaps `project_id` | unit (fake SDK) | `pnpm vitest run packages/backend/src/lifecycle.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-04 | — | CORE-10 | — | Max observed slice recorded and non-zero under load | **manual-only** — needs live Caido + external probing | `bash scripts/phase1/spa-load.sh` | ❌ W0 | ⬜ pending |
| pending | 01-03 | — | STORE-01/02 | — | Every table has `project_id` in its key | unit — introspect `PRAGMA table_info` for every table | `pnpm vitest run packages/backend/src/store/schema.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-02 | — | STORE-03 | — | Digest derives from `toRaw()` bytes | unit | `pnpm vitest run packages/engine/src/digest.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-03 | — | STORE-05 | — | Migration ladder runs forward on a **populated** DB | integration | `pnpm vitest run packages/backend/src/store/migrations.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-03 | — | STORE-06 | — | Retention sweep bounds row counts | integration | `pnpm vitest run packages/backend/src/store/retention.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-03 | — | STORE-07 | — | No SQL string contains a named parameter (`:name`, `@name`, `$name`); no `exec` call passes a second argument | static — grep + AST over `store/**` | `pnpm vitest run packages/backend/src/store/sql-discipline.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-05 | — | COMPAT-01 | — | Below-minimum version registers no hooks and yields a reason string | unit (fake `sdk.runtime`) + **live** on `caido-cli 0.55.3` | `pnpm vitest run packages/backend/src/compat.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-05 | — | COMPAT-02 | — | Every SDK surface used is exercised against 0.57.1 **and** 0.58.0 | integration (live instance) | `bash scripts/phase1/compat-smoke.sh` | ❌ W0 | ⬜ pending |
| pending | 01-02 | — | ENC-01 | — | `sha256(toRaw())` ≠ `sha256(utf8(toText()))` on the non-UTF-8 fixture; offsets map to raw bytes | unit, against `corpus/encoded/nonutf8.js` | `pnpm vitest run packages/engine/src/decode.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-01 | — | DIST-05 | — | Bundle imports ⊆ allowlist, **and** a `zlib`-importing fixture fails the gate | static | `node scripts/ci/check-bundle-imports.mjs && pnpm vitest run scripts/ci/gate.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-01 | — | DIST-06 | — | `pnpm.overrides` pins `primevue@4.1.0` and `tailwindcss@3.4.13`; lockfile agrees | static | `pnpm vitest run tests/pins.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-01 | — | Phase 0 contract | — | Every engine constant equals its `go-no-go.json` value | unit | `pnpm vitest run packages/engine/src/thresholds.spec.ts` | ❌ W0 | ⬜ pending |
| pending | 01-01 | — | Regression | — | The Phase 0 gates still run and still pass after the workspace conversion | meta | `pnpm test` — assert the same gate names appear | ✅ `tests/go-no-go.spec.ts` exists; the "still runs" assertion does not | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — extend `include` to cover `packages/*/src/**/*.spec.ts` **without dropping** `tests/**/*.spec.ts`; prove it with a before/after test count
- [ ] `packages/engine/src/thresholds.ts` + `thresholds.spec.ts` — the Phase 0 contract; **write first, before any other Phase 1 code**
- [ ] `packages/engine/src/*.spec.ts` — queue, deadline, chunker, digest, decode, pipeline
- [ ] `packages/backend/src/**/*.spec.ts` — admit, consumer, lifecycle, compat, store (schema, migrations, artifacts, retention, sql-discipline)
- [ ] `packages/backend/test/fixtures/` — a fake `SDK` (`runtime.version`, `projects.getCurrent`, `requests.get`, `requests.inScope`, `meta.db`, `console`, `api`, `events`) so backend logic is unit-testable without Caido
- [ ] An **in-process SQLite fixture** matching pooled semantics closely enough to be honest. Node 26 has `node:sqlite`, but it is single-connection and **cannot** reproduce the pool-affinity failure mode. Use it for schema/migration/upsert correctness; mark pool-specific behaviours live-only.
- [ ] `scripts/phase1/compat-smoke.sh` — reuses `scripts/spike/instance.sh` with `EXPECT_VERSION` and `probe-run.sh`
- [ ] `scripts/phase1/spa-load.sh` — external RPC prober during a synthetic 200-chunk load
- [ ] `scripts/ci/check-bundle-imports.mjs` + its negative fixture
- [ ] `tests/pins.spec.ts` — DIST-06 override assertions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Max observed synchronous slice under a 200-chunk SPA load stays under the Phase 0 threshold | CORE-10 | A starved thread cannot report that it is starved — the measurement must come from an **external** prober, not from inside the plugin | Start a live Caido instance, run `bash scripts/phase1/spa-load.sh`, and read the recorded max-slice artifact; compare against the `go-no-go.json` threshold |
| Plugin UI / RPC stays responsive throughout that same load | Success criterion 3 | Same reason — responsiveness is observed from outside | External RPC prober polls during the load; record latency distribution alongside the slice artifact |
| SDK surface parity against Caido 0.58.0 | COMPAT-02 | 0.58.0 shipped 2026-08-20 and is not installed here; types are byte-identical to 0.57.1 but behaviour is not types | Install 0.58.0, run `bash scripts/phase1/compat-smoke.sh` against both 0.57.1 and 0.58.0 |
| Below-minimum refusal on a real old binary | COMPAT-01 | Needs a genuinely old runtime, not a faked `sdk.runtime` | Run against the `caido-cli 0.55.3` already on PATH; confirm a clear reason string and zero hooks registered |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
