---
phase: "6"
slug: "retroactive-scan-deployment-reality"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-08-31"
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `06-RESEARCH.md` § "Validation Architecture". Task IDs are assigned when
> `06-NN-PLAN.md` files exist — the requirement rows below are the contract they must satisfy.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` (workspace-pinned), with `@vitejs/plugin-vue` at top level for SFC specs |
| **Config file** | `vitest.config.ts` — `include: ["tests/**/*.spec.ts", "packages/*/src/**/*.spec.ts", "scripts/ci/**/*.spec.ts"]`; `testTimeout: 120_000` |
| **Environment** | node by default; frontend component specs carry `// @vitest-environment jsdom` on their first line (`environmentMatchGlobs` was removed in vitest 4) |
| **Quick run command** | `pnpm vitest run packages/backend/src/store packages/engine/src --reporter=dot` |
| **Full suite command** | `pnpm test` (runs `pretest` → `pnpm build:backend` first) |
| **Estimated runtime** | quick ~30 s per package dir; full suite minutes (31 files / 1374 tests at the Phase 1 close-out figure, grown since) |

**Adjacent gates, all required at the phase gate:** `pnpm typecheck` (`tsc --build`), `pnpm lint`
(`eslint .`), `pnpm knip`, `pnpm check:bundle`, `pnpm check:css`, `pnpm check:externals`.

**Two config constraints the planner must not break** (verbatim from `vitest.config.ts`):

- `tests/**/*.spec.ts` stays **FIRST and unchanged** in the include order — it is where the three
  Phase 0 exit gates live, and a restructure that reorders it leaves `pnpm test` green while running
  zero of them.
- **No `projects` or `workspace` key, and no per-package vitest config** (decision P2-D4). Five files
  resolve the Phase 0 results directory from a bare relative literal.

---

## Sampling Rate

- **After every task commit:** `pnpm vitest run <the touched package's spec dir> --reporter=dot` plus
  `pnpm typecheck`. Under 30 s for any single store or engine directory.
- **After every plan wave:** `pnpm test` (full suite) plus `pnpm lint`, `pnpm knip`,
  `pnpm check:bundle`. **`pnpm knip` is not optional in this phase** — D-19's deletions strand five
  exports, and knip is what fails if they are not removed together.
- **Live legs (deployment matrix, push-down superset, O-04 and O-07 probes):** once per wave that
  touches the harness, and once at the phase gate. They need a fresh version-asserted instance and take
  minutes, not seconds — they are **never** in the per-commit loop.
- **Before `/gsd-verify-work`:** full suite green, all six adjacent gates green, and every matrix leg
  either passed or recorded NOT RUN with a reason.
- **Max feedback latency:** 30 s for the per-commit loop.

---

## Per-Task Verification Map

Task IDs are `pending` until plans exist. Every row below must be claimed by at least one task.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| pending | — | — | FIND-03 | — | The push-down clause is a superset of `admit()`'s kind axis (D-06) | integration (live, in-process `matches()`) | `bash scripts/phase6/pushdown-superset.sh` → `pnpm vitest run tests/phase6-pushdown.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | FIND-03 | T-06-HTTPQL-INJ | `composeScanFilter` parenthesises, orders the operator clause last, and rejects comments / unbalanced parens (D-05, O-06) | unit | `pnpm vitest run packages/backend/src/scan/filter.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | FIND-03 | T-06-HTTPQL-INJ | No HTTPQL string reaches `.filter()` except from `composeScanFilter` | static AST gate | `pnpm vitest run packages/backend/src/scan/httpql-discipline.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | FIND-03 | — | Migration step **v5** creates `scans`; `EXPECTED_TABLES` is exactly six; `project_id` is in the PK by ordinal; every column is on the allowlist | unit | `pnpm vitest run packages/backend/src/store/schema.spec.ts` | ✅ extend | ⬜ pending |
| pending | — | — | FIND-03 | — | Every `scans` statement is single, fully bound, `project_id`-scoped, not module-scope prepared | static AST gate | `pnpm vitest run packages/backend/src/store/sql-discipline.spec.ts` | ✅ auto-covers | ⬜ pending |
| pending | — | — | FIND-03 | — | Position advances, and a resume from `last_request_id` covers exactly the unwalked remainder (D-09, D-12, O-04) | unit | `pnpm vitest run packages/backend/src/scan/scans.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | FIND-03 | — | **The cursor survives a restart** — O-04's live probe | integration (live) | one assertion inside `scripts/phase6/matrix-leg.sh` | ❌ W0 | ⬜ pending |
| pending | — | — | FIND-03 | — | Scope is applied to every scan with no override (D-07) | unit | `pnpm vitest run packages/backend/src/scan/producer.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | FIND-03 | — | Skip-done / re-offer partial+failed before the reload (D-03) | unit | `pnpm vitest run packages/backend/src/scan/producer.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | FIND-03 | — | **O-07:** `Body.length` on the `get()` and `query()` read paths is the decompressed identity byte count | probe (live) | `bash scripts/phase6/o07-body-length.sh` | ❌ W0 | ⬜ pending |
| pending | — | — | FIND-04 | — | Progress counters and `last_created_at` advance; the timestamp comes from `getCreatedAt()`, not `Date.now()` (D-14) | unit | `pnpm vitest run packages/backend/src/scan/scans.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | FIND-04 | — | Cancel suspends and keeps the position; resume continues; discard removes and writes an `audit` row (D-10, D-16) | unit | `pnpm vitest run packages/backend/src/scan/lifecycle.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | FIND-04 | — | Retro counters are attributed separately over the same closed `REJECT_REASONS` set (D-02) | unit | `pnpm vitest run packages/backend/src/telemetry.spec.ts` | ✅ extend | ⬜ pending |
| pending | — | — | FIND-04 / ERR-02 slice | — | **D-11:** `init()` moves every `running` row to `suspended` and never auto-resumes | unit | `pnpm vitest run packages/backend/src/index.spec.ts` | ✅ extend | ⬜ pending |
| pending | — | — | FIND-04 | — | **D-08:** a row-cap eviction during a running scan suspends it; an age-bound eviction does **not** | unit | `pnpm vitest run packages/backend/src/store/retention.spec.ts packages/backend/src/ingest/consumer.spec.ts` | ✅ extend | ⬜ pending |
| pending | — | — | FIND-04 | — | **D-01:** the producer stops offering at the watermark, and the watermark satisfies its derived inequality | unit | `pnpm vitest run packages/engine/src/thresholds.spec.ts packages/backend/src/scan/producer.spec.ts` | ✅ / ❌ W0 | ⬜ pending |
| pending | — | — | FIND-04 | — | **D-26:** the suspended state is exempt from the age bound, visibly in the sweep; terminal scans are not | unit | `pnpm vitest run packages/backend/src/store/retention.spec.ts` | ✅ extend | ⬜ pending |
| pending | — | — | FIND-04 | — | **D-13:** the Scan tab renders on first paint, obeys R1/R2, and the toolbar indicator shows from every tab | unit (jsdom) | `pnpm vitest run packages/frontend/src/components/ScanPanel.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | FIND-04 | — | **D-15:** progress lands while a row is selected — it does not accrue into the pill and does not disturb the triage lock | unit (jsdom) | `pnpm vitest run packages/frontend/src/stores/scan-progress.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | DEPLOY-01 | — | **D-22:** four legs each assert the four properties; results are schema-validated JSON | integration (live) | `bash scripts/phase6/matrix.sh` → `pnpm vitest run tests/phase6-matrix.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | DEPLOY-01 | — | **D-23:** a NOT RUN leg is recorded with its reason and never as a pass | unit | `pnpm vitest run tests/phase6-matrix.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | DEPLOY-01 | — | **D-21:** every artifact names the build it describes and refuses to be written on a version mismatch | unit + harness gate | `pnpm vitest run tests/phase6-matrix.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | DEPLOY-02 | T-06-PATH-LEAK | The Settings surface renders `STORAGE_NOTE`, the D-25 counts, and **no path** | unit (jsdom) | `pnpm vitest run packages/frontend/src/components/SettingsPanel.spec.ts` | ✅ amend | ⬜ pending |
| pending | — | — | DEPLOY-02 | T-06-PATH-LEAK | No path identifier reaches the RPC (the shipped username guard) | unit | `pnpm vitest run packages/backend/src/telemetry.spec.ts` | ✅ | ⬜ pending |
| pending | — | — | DEPLOY-03 | — | **D-18:** `sdk.hostedFile` is unreachable from any shipped module, in every spelling | static AST gate | `pnpm vitest run packages/backend/src/filesystem-prohibition.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | DEPLOY-03 | — | **D-17:** delivery is the shipped chunked RPC download and nothing else | unit | `pnpm vitest run packages/backend/src/store/export.spec.ts` | ✅ | ⬜ pending |
| pending | — | — | DEPLOY-04 | — | **D-18:** every specifier form of `fs` / `node:fs` / `llrt/fs` (+ `/promises`) is unreachable; `sdk.meta.path()` stays legal | static AST gate | `pnpm vitest run packages/backend/src/filesystem-prohibition.spec.ts` | ❌ W0 | ⬜ pending |
| pending | — | — | DEPLOY-04 | — | **D-24:** no column's declared type is `BLOB` or untyped | unit | `pnpm vitest run packages/backend/src/store/schema.spec.ts` | ✅ extend | ⬜ pending |
| pending | — | — | DEPLOY-04 | — | The shipped bundle's import set is unchanged | CI gate | `pnpm check:bundle` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

12 gaps. Nothing in the map above marked ❌ has a home yet.

- [ ] `packages/backend/src/scan/filter.ts` + `filter.spec.ts` — `composeScanFilter`, the operator-clause
      validator, `SCAN_KIND_CLAUSE`; covers FIND-03 and O-06
- [ ] `packages/backend/src/scan/httpql-discipline.spec.ts` — the static gate over `.filter()` sinks;
      covers O-06's "what polices it". `sql-discipline.spec.ts` is provably silent here — `SQL_SINKS`
      has no `filter` entry
- [ ] `packages/backend/src/scan/scans.ts` + `scans.spec.ts` — the step-v5 statements and the position
      advance; covers FIND-03 / FIND-04
- [ ] `packages/backend/src/scan/producer.ts` + `producer.spec.ts` — the watermark-gated page walk;
      covers D-01, D-03, D-07
- [ ] `packages/backend/src/scan/lifecycle.spec.ts` — start / pause / resume / discard, and D-04's
      epoch suspend
- [ ] `packages/backend/src/filesystem-prohibition.spec.ts` — D-18, in `outbound-prohibition.spec.ts`'s
      shape (a `RULES` record + AST walk), with a firing **and** a legal fixture per rule and a closed
      rule-name set
- [ ] `packages/frontend/src/components/ScanPanel.vue` + `ScanPanel.spec.ts` — D-13's fifth tab
      (`// @vitest-environment jsdom` on line 1)
- [ ] `packages/frontend/src/stores/scan-progress.ts` + `scan-progress.spec.ts` — D-15's progress path
- [ ] `tests/phase6-matrix.spec.ts` + `.planning/phases/06-retroactive-scan-deployment-reality/results/matrix-result.schema.json`
      — the D-20 / D-21 / D-23 artifact gate. **Must live under `tests/`** so it runs first in the
      include order, and must **not** write into the Phase 0 results directory
- [ ] `tests/phase6-pushdown.spec.ts` — D-06's superset proof over the captured fixture corpus,
      **with its non-vacuity negative**
- [ ] `scripts/phase6/matrix-leg.sh`, `scripts/phase6/matrix.sh` — the four legs, sourcing
      `scripts/spike/instance.sh` for the two native ones and adding the container path for the other
      two. The no-volume leg must `stop && rm && run`, never `restart`
- [ ] `scripts/phase6/o07-body-length.sh` — the O-07 probe: proxy the `corpus/encoded/` fixtures, drain,
      assert `byteLenMismatch === 0`, then compare a `query()`-returned `Body.length` against the known
      identity byte count

**Extensions to existing files** (not new infrastructure, but Wave 0 in the sense that later tasks
depend on them): `schema.spec.ts` (six tables, the `scans` column allowlist, the no-BLOB check),
`retention.spec.ts` (`rowCapDeleted`, D-26's suspended exemption), `consumer.spec.ts` (the D-08 branch),
`index.spec.ts` (D-11's startup sweep), `telemetry.spec.ts` (D-02's retro counters),
`SettingsPanel.spec.ts` (remove the five `storagePath` cases, add the D-25 counts).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The Scan tab and toolbar indicator as they render in Caido's own Electron renderer | FIND-04 | Every automated check runs against build output, jsdom, or headless Chromium over a generated entry — none is Caido's renderer. Carried from phase 5's standing human-verification item | Install the plugin, open DefMiner, start a scan, and confirm the fifth tab and the toolbar strip render against the real theme variables |
| The remote-CLI leg against a genuinely remote host | DEPLOY-01 | On this machine the "remote CLI" leg shares a filesystem with the desktop leg, so only the Docker legs actually test the property DEPLOY-02/03 exist for. Named as an honest limit by `06-RESEARCH.md`, not papered over | Run `scripts/phase6/matrix-leg.sh` against a real VPS, or record the leg NOT RUN with that reason per D-23 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
