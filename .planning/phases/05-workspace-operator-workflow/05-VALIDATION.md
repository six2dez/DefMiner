---
phase: 05
slug: workspace-operator-workflow
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-28
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `05-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest@4.1.11`, single root config, `environment: "node"` |
| **Config file** | `vitest.config.ts` — globs `tests/**/*.spec.ts`, `packages/*/src/**/*.spec.ts`, `scripts/ci/**/*.spec.ts` |
| **Quick run command** | `pnpm vitest run <path> --reporter=dot` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | quick ~5–15s per file; full suite gated behind `pretest` (`caido-dev build packages`) |

**Do not use `pnpm test` in the per-task loop.** Its `pretest` hook runs a full `caido-dev build packages`, which is far too slow for per-task feedback. Use the quick command and `pnpm typecheck`.

**DOM environment:** no `projects` / `workspace` key may be added — `vitest.config.ts` records decision P2-D4, and five files resolve the Phase 0 results directory from a bare relative literal. `vitest@4` removed `environmentMatchGlobs`. Frontend component specs carry a per-file `// @vitest-environment jsdom` docblock (verified by execution this session). `.vue` SFC imports require `@vitejs/plugin-vue` in the vitest config's `plugins` — a `plugins` addition, not a `projects` one.

---

## Sampling Rate

- **After every task commit:** `pnpm vitest run <the 2–3 spec files the task touches> --reporter=dot` plus `pnpm typecheck`
- **After every plan wave:** `pnpm test && pnpm lint && pnpm typecheck && pnpm knip && pnpm check:bundle`
- **Before `/gsd-verify-work`:** full suite green, plus explicit executed evidence for the three backstop rows
- **Max feedback latency:** ~30 seconds for the per-task loop

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| UI-02 | Keyset cursor returns a correct, non-overlapping next page across a tie block | unit (SQLite fixture) | `pnpm vitest run packages/backend/src/store/reads.spec.ts` | ❌ W0 | ⬜ pending |
| UI-02 | Every read statement passes the SQL gate | static gate | `pnpm vitest run packages/backend/src/store/sql-discipline.spec.ts` | ✅ exists | ⬜ pending |
| UI-02 | Deep page costs O(page), not O(offset) — bounded row-scan count | unit | `pnpm vitest run packages/backend/src/store/reads.spec.ts -t "deep page"` | ❌ W0 | ⬜ pending |
| UI-02 | 10,000 rows scroll with a bounded in-memory window, no dropped frames | e2e | `pnpm vitest run tests/frontend-load.spec.ts` | ❌ W0 (backstop) | ⬜ pending |
| UI-07 | ≥20 events in 1s produce ≤2 UI reactions; none while a row is selected | unit (fake timers) | `pnpm vitest run packages/frontend/src/stores/coalescer.spec.ts` | ❌ W0 | ⬜ pending |
| UI-09 | A `partial` artifact renders the floor banner and the per-row badge | component (jsdom) | `pnpm vitest run packages/frontend/src/components/FindingsTable.spec.ts` | ❌ W0 | ⬜ pending |
| UISEC-01 | Hostile fixture renders inert in table, panel, suppressions list, projection preview | component (jsdom) | `pnpm vitest run packages/frontend/src/safety/hostile.spec.ts` | ❌ W0 (backstop) | ⬜ pending |
| UISEC-01 | No `v-html`/`innerHTML`/`eval`/`new Function` anywhere in the frontend | static AST gate | `pnpm vitest run packages/frontend/src/frontend-safety.spec.ts` | ❌ W0 | ⬜ pending |
| UISEC-02 | Leading `=`/`+`/`-`/`@`/TAB/CR apostrophe-prefixed **then** quoted | unit | `pnpm vitest run packages/engine/src/csv.spec.ts` | ❌ W0 | ⬜ pending |
| UISEC-03 | 4MB single-line, embedded newlines, 4-byte grapheme — truncated, no split, no freeze | unit + component | `pnpm vitest run packages/engine/src/sanitise.spec.ts` | ❌ W0 | ⬜ pending |
| UI-06 | Redacted pre-selected; raw requires second choice **and** the danger dialog | component | `pnpm vitest run packages/frontend/src/components/ExportDialog.spec.ts` | ❌ W0 | ⬜ pending |
| OPS-01 | Triage write is one statement, idempotent, survives replay | unit (SQLite fixture) | `pnpm vitest run packages/backend/src/store/triage.spec.ts` | ❌ W0 | ⬜ pending |
| OPS-02 | A suppression rule hides matching rows on next read; removal restores them | unit | `pnpm vitest run packages/backend/src/store/suppressions.spec.ts` | ❌ W0 | ⬜ pending |
| OPS-02 | Bounded candidate window caps scanned rows regardless of suppression selectivity | unit | `pnpm vitest run packages/backend/src/store/suppressions.spec.ts -t "bounded"` | ❌ W0 | ⬜ pending |
| OPS-03 | Retry re-claims a `failed`/`partial` analysis and moves it out of that state | unit | `pnpm vitest run packages/backend/src/store/retry.spec.ts` | ❌ W0 | ⬜ pending |
| OPS-04 | Triage survives a `detector_set_hash` change | unit | `pnpm vitest run packages/backend/src/store/triage.spec.ts -t "corpus bump"` | ❌ W0 | ⬜ pending |
| STORE-08 | `audit` in `EXPECTED_TABLES`, every column allowlisted, no forbidden column | static gate (extend) | `pnpm vitest run packages/backend/src/store/schema.spec.ts` | ✅ extend | ⬜ pending |
| FIND-01 | `dedupeKey` is exactly `fingerprint:detectorId:host`; excludes digest and corpus hash | unit | `pnpm vitest run packages/backend/src/findings/project.spec.ts` | ❌ W0 | ⬜ pending |
| FIND-01 | A row whose observations all fail to resolve is `unprojectable`, not dropped | unit (fake SDK) | same file, `-t "unprojectable"` | ❌ W0 | ⬜ pending |
| FIND-01 | A `create` that throws fails that row only | unit | same file, `-t "throws"` | ❌ W0 | ⬜ pending |
| FIND-02 | Entropy-only and hint-grade results absent from the preview, and counted | unit | same file, `-t "excluded"` | ❌ W0 — **blocked on Phase 3/4 tiers** | ⬜ pending |
| — | Built CSS contains no rule outside `#plugin--defminer` | build-output gate | `pnpm vitest run scripts/ci/prefixwrap.spec.ts` | ❌ W0 | ⬜ pending |
| — | Frontend bundle does not contain Vue (externals honoured) | build-output gate | `pnpm vitest run scripts/ci/frontend-externals.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] **Widen `packages/backend/src/store/sql-discipline.spec.ts` before the first Phase 5 query is written** — cover `WITH`/CTE, `INSERT … SELECT`, unscoped subqueries, `UNION` arms, and fragment composition. Each new rule's failing path executed against the probe fixtures in `05-RESEARCH.md § O-01`, per the file's own rule that "a gate whose failure path has never run is a gate nobody has tested."
- [ ] `packages/frontend/` workspace, `vite.config.ts`, `packages/caido.config.ts` frontend entry
- [ ] `jsdom` + `@vue/test-utils` installed; `@vitejs/plugin-vue` added to the vitest config's `plugins`
- [ ] `packages/frontend/src/frontend-safety.spec.ts` — the AST gate for R1 (stronger than lint)
- [ ] `eslint.config.js`: `vue: true`, `vue/no-v-html: "error"`, `no-eval`, `no-new-func`, `no-implied-eval`, `no-script-url`, `linterOptions.noInlineConfig` on frontend files
- [ ] `packages/engine/src/sanitise.ts` + `csv.ts` + specs (SDK-free — run under plain vitest, no Caido, no DOM)
- [ ] The hostile-content fixture, shared by four surfaces (table, panel, suppressions list, projection preview)
- [ ] `schema.spec.ts`: extend `EXPECTED_TABLES` and `COLUMN_ALLOWLIST` for `audit` (and `suppressions`, if separate)
- [ ] Re-verify the `§ O-01` query plans on **SQLite 3.46.0**, not the 3.51.0 they were measured on
- [ ] Measure whether a 50,000-row export crosses the RPC as one string; chunk if it stalls (preserves D-04 — still no server file)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 10,000-row scroll smoothness | UI-02 | `🧪 backstop` in `05-UI-SPEC.md` — frame timing is not assertable by inspection | Load the 10,000-row fixture, scroll top-to-bottom, record dropped frames and peak in-memory row count |
| Hostile-content inertness across all four surfaces | UISEC-01 | `🧪 backstop` — requires visual confirmation that nothing rendered as markup | Load the hostile fixture into table, panel, suppressions list and projection preview; confirm inert render and safe export |
| Long-text / adversarial string handling | UISEC-03 | `🧪 backstop` — layout break and renderer freeze are observational | 4MB single-line literal, embedded newlines, 4-byte grapheme; confirm truncation, no grapheme split, no layout break |

**Backstop semantics:** a `🧪 backstop` row with no explicit executed evidence resolves to `human_needed` (`insufficient_spec`), never a silent pass.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
