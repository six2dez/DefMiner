---
phase: "07"
slug: "sourcemap-reconstruction"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-01"
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `07-RESEARCH.md` § "Validation Architecture" (lines 1407–1516).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.11 |
| **Config file** | `vitest.config.ts` (root, single config) |
| **Quick run command** | `pnpm vitest run packages/engine/src/sourcemap --reporter=dot` |
| **Full suite command** | `pnpm test` (= `vitest run --reporter=dot`; `pretest` = `pnpm build:backend`) |
| **Estimated runtime** | ~15 s quick · full suite dominated by `pretest` build |

**Hard constraint on every new spec file — breaking it is silent.** `vitest.config.ts` carries no `projects` and no `workspace` key, and there is no per-package vitest config (decision P2-D4). Five files resolve the Phase 0 results directory from a bare relative literal — `tests/schema.spec.ts`, `tests/spike-results.spec.ts`, `tests/go-no-go.spec.ts`, `scripts/spike/instance.sh`, `scripts/spike/probe-run.sh` — so a per-project root breaks all five at once. **Phase 7 adds spec files to the existing include globs (`tests/**/*.spec.ts`, `packages/*/src/**/*.spec.ts`, `scripts/ci/**/*.spec.ts`). It does not add a vitest project.**

jsdom is selected per file by a `// @vitest-environment jsdom` docblock on **line 1** — `environmentMatchGlobs` was removed in vitest 4.

**Project doctrine this strategy applies rather than invents:** fail, never skip, and name the remedy in every message (`tests/phase6-matrix.spec.ts:16`). An absent artifact fails; it never passes vacuously.

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run packages/engine/src/sourcemap --reporter=dot`
- **After every plan wave:** Run `pnpm test` — full suite, including every static gate
- **Before `/gsd-verify-work`:** Full suite green **plus** the Tier-3 probe artifact committed and `tests/phase7-mapbytes.spec.ts` green
- **Max feedback latency:** 20 seconds (quick run)

---

## Per-Task Verification Map

Task IDs are assigned by the planner; this map is keyed by requirement until plans exist, and the planner must bind each row to a task ID.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | — | — | Corpus fixtures are sha256-gated; a swapped fixture fails | unit | `pnpm vitest run tests/corpus-maps.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | MAP-01 | — | Inline announcement found in the bounded tail window; no regex on the path | unit | `pnpm vitest run packages/engine/src/sourcemap/announce.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | MAP-01 | — | External announcement increments a counter and stores nothing | unit | `pnpm vitest run packages/backend/src/telemetry.spec.ts --reporter=dot` | ✅ | ⬜ pending |
| TBD | TBD | 1 | MAP-02 | — | base64-strict decode; non-ASCII round-trips; malformed input refused | unit | `pnpm vitest run packages/engine/src/decode.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | MAP-02 | — | `sourcesContent` reconstruction with no VLQ on the primary path | unit | `pnpm vitest run packages/engine/src/sourcemap --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | MAP-05 | T-07-* | Absent/null/short `sourcesContent`, `sections` index maps, nested `sections` refused, `)]}'` prefix, deep nesting against the measured 246-paren / 710-bracket limits | unit | `pnpm vitest run packages/engine/src/sourcemap/parse.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | MAP-04 | T-06-37 | No `sources` value reaches a path-like sink; firing + legal fixture; red the day a filesystem returns | unit | `pnpm vitest run packages/backend/src/*-prohibition.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | MAP-03 | — | No `packages/backend` module imports the codec, in any specifier form; by-name non-vacuity across both source roots | unit | `pnpm vitest run packages/backend/src/codec-prohibition.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | MAP-02, MAP-06 | — | `EXPECTED_TABLES` exact; every column allowlisted with justification; every declared type in `{INTEGER, REAL, TEXT}`; producibility CHECK read back member-by-member | unit | `pnpm vitest run packages/backend/src/store/schema.spec.ts --reporter=dot` | ✅ | ⬜ pending |
| TBD | TBD | 1 | MAP-06 | — | New statements pass the static SQL gate unchanged (single statement, fully bound, `project_id`-scoped) | unit | `pnpm vitest run packages/backend/src/store/sql-discipline.spec.ts --reporter=dot` | ✅ | ⬜ pending |
| TBD | TBD | 1 | MAP-06 | — | Convergence inequality restated in rows-per-interval terms and satisfied at 781 sources | unit | `pnpm vitest run packages/engine/src/thresholds.spec.ts --reporter=dot` | ✅ | ⬜ pending |
| TBD | TBD | 2 | MAP-06 | — | Depth capped at 1, no re-entry, proven by the test-only detector; once per content hash | unit | `pnpm vitest run packages/backend/src/ingest/consumer.spec.ts --reporter=dot` | ⚠️ file exists, cases do not | ⬜ pending |
| TBD | TBD | 2 | MAP-06 | — | `DERIVED_REJECT_REASONS` exercised exactly, closed, duplicate-free | unit | `pnpm vitest run packages/backend/src/ingest --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | UI-05 | T-07-* | O-08 display tree: five pure steps, structurally lossless, and `node:path` is NOT used (SPIKE-12 measured `resolve` escaping 5/22 and `normalize` rewriting RTL) | unit | `pnpm vitest run packages/frontend/src/sourcemap/tree.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | UI-05 | T-07-* | R1: no `v-html`, no `innerHTML`, nothing target-controlled in `:style`/`href`/`src`; lint at `error`, no per-line disable | unit | `pnpm vitest run scripts/ci/lint-r1.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 3 | UI-05 | T-07-* | R2 per line: control strip, bidi strip, grapheme-safe truncation, `white-space: pre`; `forCellText` not `forCell` (37,395 ms vs 4,010 ms measured) | unit (jsdom) | `pnpm vitest run packages/frontend/src/components/SourceViewer.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 3 | UI-05 | — | **O-02:** a single-line multi-MB source renders one truncated row plus a visible UI-09 marker; no `title`, no `data-*` carries the untruncated value | unit (jsdom) | `pnpm vitest run packages/frontend/src/components/SourceViewer.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 3 | UI-05 | — | Virtualisation: `itemSize` bound to a fixed constant; bounded DOM window at 10,000 lines | unit (jsdom) | `pnpm vitest run packages/frontend/src/components/SourceViewer.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 3 | UI-05 | — | **D-22 tombstone** renders as a sentence, visibly marked, never presented as complete | unit (jsdom) | `pnpm vitest run packages/frontend/src/components/SourceViewer.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |
| TBD | TBD | 3 | UI-05 | — | **O-07:** analysis state and producibility never share a column or a badge component; no shared or prefix label against the seven existing ones | unit (jsdom) | `pnpm vitest run packages/frontend/src/components --reporter=dot` | ⚠️ dir exists, cases do not | ⬜ pending |
| TBD | TBD | 3 | MAP-07 | — | Manifest rows export through `export.ts` unchanged; content is single-file on demand | unit | `pnpm vitest run packages/backend/src/store/export.spec.ts --reporter=dot` | ⚠️ file exists, cases do not | ⬜ pending |
| TBD | TBD | 3 | MAP-01…07, UI-05 | — | `CONTRACT_VERSION` bumped from 5; frontend and backend contracts agree | unit | `pnpm vitest run packages/engine/src/contract.spec.ts packages/backend/src/index.spec.ts --reporter=dot` | ✅ | ⬜ pending |
| TBD | TBD | 1 | MAP-02 | — | **O-03 probe:** `MAP_MAX_BYTES` measured, artifact written, Ajv-validated, `run_id` unique, own pinned version constant | live-harness | `bash scripts/phase7/map-bytes.sh && pnpm vitest run tests/phase7-mapbytes.spec.ts --reporter=dot` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Do the corpus first.** No committed corpus bundle carries an inline map — all three announcing bundles announce external `.map` files and five announce nothing at all, so under D-01 the entire existing corpus yields zero recovered sources. This single gap blocks the probe, MAP-05 and D-15 simultaneously.

- [ ] `corpus/maps/` — real `.map` files, synthesised inline-data-URI fixtures, and the hostile set, sha256-gated
- [ ] `packages/engine/src/sourcemap/announce.ts` + `announce.spec.ts`
- [ ] `packages/engine/src/sourcemap/parse.ts` + `parse.spec.ts`
- [ ] `packages/engine/src/decode.ts` + `decode.spec.ts` (base64-strict, D-04)
- [ ] `packages/backend/src/codec-prohibition.spec.ts` — D-17's gate, fourth sibling of the `outbound-` / `filesystem-` / `httpql-` family
- [ ] The retained-traversal gate (D-12) — the 22 SPIKE-12 fixtures as a non-vacuity proof
- [ ] `.planning/phases/07-sourcemap-reconstruction/results/` + its JSON Schema + `tests/phase7-mapbytes.spec.ts`
- [ ] `scripts/phase7/` probe driver + the Tier-1 probe under `tier1/`
- [ ] `packages/frontend/src/sourcemap/tree.ts` + `tree.spec.ts` (O-08)
- [ ] `packages/frontend/src/components/SourceViewer.spec.ts` with `// @vitest-environment jsdom` on line 1
- [ ] `scripts/ci/lint-r1.spec.ts`

*No framework install is needed — vitest, jsdom and playwright are all present.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `MAP_MAX_BYTES` — CPU and peak RSS of `JSON.parse` on a real map | MAP-02, SC1 | Caido's embedded QuickJS exposes **no memory introspection whatsoever** — `llrt:qjs`, `perf_hooks` and `process` all fail to load, `performance` carries only `now` and `timeOrigin`, and there is no `gc()` (`scripts/spike/rss-sampler.sh:5-10`). The external RSS sampler is the only memory measurement method that exists here. | Launch a fresh instance per size point via `scripts/spike/instance.sh` with Phase 7's own `EXPECT_VERSION`; attach `scripts/spike/rss-sampler.sh` at 50 ms to that PID; correlate to in-runtime `Date.now()` markers; fixed operation order; every reading a **delta from a marker**, never an absolute. Write the schema-validated artifact into Phase 7's own `results/`. |
| `announce_scan` cost — `lastIndexOf` over multi-MB strings | MAP-01 | Measured nowhere, in any phase, in that engine. Node timings do not transfer (see O-04). | Same harness, added as an operation in the probe's fixed order. |
| Actual RPC payload ceiling for the `mappings` string | MAP-03 | `packages/backend/src/store/export.ts:115` states it verbatim: nothing in this repository can push bytes through Caido's RPC, so the real ceiling is live-only. O-01 settles the *design* by construction (`PASSIVE_MAX_BYTES × ¾ = 6,291,456 < 8 MiB`), not the ceiling. | Only if the by-construction bound is ever raised. Not required this phase. |
| Whether and when Caido drops a request from history | D-22 tombstone | Not measurable in-repo — it is Caido's own retention behaviour, not the plugin's. | Observational; the tombstone is designed to be correct regardless, so this informs copy rather than gating the phase. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] Tier-3 probe artifact committed and its gate spec green
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
