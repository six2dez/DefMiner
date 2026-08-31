---
phase: 05-workspace-operator-workflow
verified: 2026-08-31T09:55:00Z
status: passed_with_gaps
score: 113/116 plan truths verified
roadmap_criteria: 3 MET · 2 PARTIALLY MET · 3 NOT MET (out of scope under D-05, registered)
behavior_unverified: 1
insufficient_spec: 2
overrides_applied: 0
head: 4e2b8fb
suite: 59 files / 2272 tests passing (re-run by this verifier, exit 0)

behavior_unverified_items:
  - truth: "Any filesystem path the settings surface displays is labelled as being on the Caido server and is never presented as a path on the operator's machine; it truncates from the left so the filename stays visible and carries the full path only via a copy action. (plan 05-12)"
    test: "Install the plugin, open Settings, and confirm the server-path row is absent — then, when DEPLOY-02 supplies a path, that it renders left-truncated, labelled, out of every attribute, and copyable."
    expected: "No path renders today (SERVER_STORAGE_PATH is null at the call site). The renderer is exercised through a prop only; it has no production data source until Phase 6."
    why_human: "The prop is hardcoded null in App.vue:558. The truth is conditionally vacuous in production — the rule is implemented and tested, the occasion does not exist. This is the third instance of the phase's 'tested but not connected' shape, and unlike the other two it is deliberate and disclosed rather than an oversight."

insufficient_spec_items:
  - backstop: "long-text / suppressions-list (UI-SPEC § UI Considerations, carried in plan 05-04)"
    reason: "The suppressions-list surface does not exist — OPS-02 is deferred to Phase 4. No executed evidence is possible in this phase. Carried as a verification obligation in 05-ENTITY-CONTRACT.md § Carried covered rows."
    resolution_needed: "Operator confirmation that carrying it forward is acceptable. It must not be recorded as a silent pass."
  - backstop: "long-text / findings-projection-preview (UI-SPEC § UI Considerations, carried in plan 05-04)"
    reason: "The projection preview does not exist — FIND-01/02 are deferred to Phases 3/4. Same argument."
    resolution_needed: "Same."

human_verification:
  - test: "Install the plugin in a running Caido, open the DefMiner sidebar item, and look at the page."
    expected: "48px toolbar, wrapping tab strip, split body; the Caido theme's CSS variables resolve to a readable page in the real Electron renderer."
    why_human: "Every automated check runs against build output, jsdom or headless Chromium over a generated entry — none of them is Caido's renderer. Carried from 05-01 coverage D7."
  - test: "Run a large export (~50,000 rows) against a real Caido."
    expected: "The 20,000-row chunk crosses the RPC without stalling; concatenated chunks produce the same file as a single pass."
    why_human: "The 8 MiB per-call figure is a budget this project set, not a ceiling measured from Caido. Nothing in the repo can push bytes through the RPC. WINDOWS.md #63."
  - test: "Re-measure the keyset and bounded-window query plans on SQLite 3.46.0."
    expected: "Index seek, no temp b-tree sort; the bounded window remains a co-routine."
    why_human: "Measured on 3.51.0/3.53.4 — no 3.46 binary reachable on this machine. Assumption A5 is narrowed to a 3.46 to 3.51 window, disclosed rather than closed. WINDOWS.md #50."
  - test: "Run the refusal surface against a build that actually refuses (compat-smoke.sh leg C, or a Caido below MIN_CAIDO)."
    expected: "CompatRefusal renders the reason and the minimum versions from a real early-returning init()."
    why_human: "Every case drives a stub of a refusing build; 0.57.1 is unobtainable per PROJECT.md. The endpoint set of all three refusal paths plus the catch is now gated (e192bfa, four planted mutations each watched red), but the surface has never rendered from an actual refusal."
  - test: "Decide whether the two deferred-surface backstop rows may be carried to the implementing pass."
    expected: "Recorded as accepted deferrals, not as passes."
    why_human: "See insufficient_spec_items."

deferred:
  - truth: "Every entity links back to its source request, artifact version, and byte offsets (ROADMAP SC3, UI-03)"
    addressed_in: "Phase 4, plan 04-03"
    evidence: "05-ENTITY-CONTRACT.md § Deferral Register, UI-03: the `evidence` table does not exist; EXPECTED_TABLES in schema.spec.ts is exactly [analyses, artifacts, observations, settings, audit]."
  - truth: "shows which signals fired and why it scored as it did (ROADMAP SC3, UI-04)"
    addressed_in: "Phase 3, plan 03-03"
    evidence: "Register, UI-04: no signal vocabulary and no scorer. `ScoreExplanation`/`ScoreSignal` frames published at packages/engine/src/contract.ts:556,593."
  - truth: "Findings can be marked reviewed, false positive, or accepted, and that state survives a corpus bump (ROADMAP SC4, OPS-01/OPS-04)"
    addressed_in: "Phase 4, plan 04-03"
    evidence: "Register, OPS-01 and OPS-04: the triage key waits on a stable entity identity. `TRIAGE_STATES` published at contract.ts:321; D-05(4) forbids fixing the key now."
  - truth: "A suppression rule stops a known-benign pattern reappearing (ROADMAP SC5, OPS-02)"
    addressed_in: "Phase 4, plan 04-03"
    evidence: "Register, OPS-02: the same stable entity identity a rule's scope resolves against."
  - truth: "Native Findings created only for high-signal results with stable dedupe keys; entropy-only and hint-grade provably never project (ROADMAP SC7, FIND-01/02)"
    addressed_in: "Phase 3 plans 03-01 and 03-03, then Phase 4 plan 04-03 and SEC-01"
    evidence: "Register, FIND-01/FIND-02: no term of the high-signal conjunction is evaluable. D-01/D-02/D-03 quoted verbatim with reversibility ratings; D-01's one-way checkpoint carried forward unspent and owed to the first sdk.findings.create call."
---

# Phase 5: Workspace & Operator Workflow — Verification Report

**Phase Goal:** Turn the database into something an operator reads, triages, and trusts — and render target-controlled content without getting attacked by it.
**Verified:** 2026-08-31T09:55Z at HEAD `4e2b8fb`, working tree clean.
**Status:** `passed_with_gaps`
**Scope judged against:** decision **D-05** (2026-08-28) — the phase was deliberately split because `entities` and `evidence` do not exist. Judged against that scope, not the roadmap's original ambition.

---

## 1. ROADMAP Success Criteria

| # | Criterion | Verdict | Evidence actually checked |
|---|-----------|---------|---------------------------|
| 1 | A sidebar page answers "every secret, endpoint, and host on this target", not "what is in the response I have open" | **PARTIALLY MET** | The project-wide half is real. `packages/frontend/src/index.ts` calls `sdk.navigation.addPage("/defminer", { body })` on a live mounted Vue app and `sdk.sidebar.registerItem("DefMiner", "/defminer")`; `packages/caido.config.ts` carries the `kind: "frontend"` entry so it ships. `App.vue:73` declares four tabs — **Artifacts, Observations, Health, Settings** — and the two entity tables page over the whole project through `reads.ts` → real SQLite (`db.prepare` at reads.ts:1461/1508/1519/1684), not over the open response. **What is NOT there:** Secrets / Endpoints / Hosts. Those are entity-class rows and `entities` does not exist. Registered, not omitted. |
| 2 | Tables stay responsive at 10,000 rows, and a heavy browsing session does not flood the UI — event coalescing is proven under load | **MET** | `tests/frontend-load.spec.ts` drives **real headless Chromium via playwright** (it *fails* rather than skips if the browser cannot start — line 137). Measured this run: `rows paged through 10000 · peak resident rows 58 (window bound 2000) · frames sampled 396 · max frame 25.00ms · p95 16.90ms · frames over 32ms budget 0 · scroll elapsed 4051ms · distinct rendered heights [32] · hostile rows rendered 12`. Non-vacuity is the first assertion in the file. Coalescing: `coalescer.spec.ts` carries 15 cases including "turns twenty summaries in one simulated second into AT MOST two reactions", "holds the cap when the trailing window is too short — the throttle is load-bearing", "does not STARVE under a sustained stream", "does not let a reaction ALREADY IN THE WINDOW land after a row is selected", and "stops the subscription, and an event emitted afterwards changes NOTHING". |
| 3 | Every entity links back to its source request, artifact version, and byte offsets, and shows which signals fired and why it scored as it did | **NOT MET (out of scope under D-05)** | Registered deferral, UI-03 + UI-04. What *does* ship: the panel frame (`EvidencePanel.vue`), the artifact-version line from the analyses corpus hash, and explicit not-yet-available lines naming Phase 3/plan 03-03 and Phase 4/plan 04-03 rather than empty regions (WINDOWS.md #59, #60, #61). |
| 4 | Findings can be marked reviewed / false positive / accepted, and that state survives a corpus version bump and re-analysis | **PARTIALLY MET — retry half MET, triage half out of scope** | Retry (OPS-03) is real: `store/retry.ts` is one statement with the state guard **inside the predicate** (`AND scan_state IN (?, ?)`), a fully-bound key, an import-time arity assertion, and a read-back through `getAnalysis` because the driver cannot report what it wrote. `retry.spec.ts` is a per-state transition table over the shipped vocabulary — pending/running/done unmoved, partial/failed moved, plus wrong-project, wrong-corpus-hash, missing-row and redacted-error cases. Wired: `EvidencePanel` → `retryAnalysis` RPC (`index.ts:496`) → `retry.ts`. Triage: registered deferral. |
| 5 | A suppression rule stops a known-benign pattern reappearing without editing the rule corpus | **NOT MET (out of scope under D-05)** | Registered deferral, OPS-02. Honest consequence carried in code rather than faked: `reads.ts:1627-1654` returns `hiddenBySuppression: 0` / `suppressionRuleCount: 0` with a comment stating that this is a real state of a real table, not a placeholder. |
| 6 | No extracted content is ever rendered as markup; a fixture containing HTML, script, and a CSV formula payload renders inert and exports safely | **MET** | Three independent controls, each non-vacuous. **(a)** `frontend-safety.spec.ts` — a static AST + template gate that reaches `<template>` blocks (depth-counted, HTML comments stripped, expressions extracted) and runs `it.each(files)` over **all 28 frontend modules** (verified by enumeration, including every 05-09…05-12 component). It asserts a non-empty file set, the named-module set, subdirectory descent, a non-empty template block, and its own exact rule list; every rule's failing path is executed against a fixture in the same file. Repo-wide grep finds **zero** `v-html` / `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` / `new Function` / `eval(` in shipped frontend source. **(b)** `safety/hostile.spec.ts` drives the whole shared corpus through two display surfaces asserting tag-name allowlist, no `title`, no `data-*`, no `style`, no surviving C0/C1 or bidi character, every slice a text node, and an exercised-id set equal to `HOSTILE_CASE_IDS`. **(c)** Export: `csv.ts:88` strips controls, apostrophe-prefixes on a dangerous lead, **then** quote-wraps — order asserted by index; `export.spec.ts:487` sweeps every hostile case × both formats × both modes with an exhaustiveness assertion. The real Chromium run rendered 12 hostile rows at a single measured height of 32px. |
| 7 | Native Findings created only for high-signal results with stable dedupe keys; entropy-only and hint-grade provably never project | **NOT MET (out of scope under D-05)** | Registered deferral, FIND-01/02. Prohibition holds absolutely: repo-wide grep for `sdk.findings` / `findings.create` returns **zero** hits. D-01/D-02/D-03 are quoted verbatim with reversibility ratings in the register, and D-01's one-way checkpoint is explicitly carried forward *unspent* and owed to the first task that calls `sdk.findings.create`. |
| 8 | Degraded and partial analyses are visibly marked | **MET** | End to end, and it is the gap 05-09 left that 05-10 closed. `reads.ts` selects `scan_state` through a correlated newest-analysis subquery in every artifact statement; `App.vue:258` builds `artifactAnalyses` from `row.scan_state` (plus read-back retry states, never optimistic); `ArtifactsTable.vue` renders `PartialBanner` when any resident row is degraded and a per-row `StatusBadge` independently of the banner; `App.spec.ts:679` asserts on the **running page** that the badge reads `Failed` and the banner contains "are Partial or Failed" and "a floor, not a total". The floor statement is also embedded in the exported file itself (`export.spec.ts`, "the floor statement before the confirmation (UI-09)"). |

**Criteria score: 3 MET · 2 PARTIALLY MET · 3 NOT MET (registered deferral, not a defect).** This matches the plan-checker's pre-execution judgement exactly, including its warning that criterion 1 is only partially reachable.

---

## 2. Plan `must_haves` — truths

Verified 113 of 116 truths across the twelve plans. Highlights of what was actually opened and read, rather than taken from a SUMMARY:

| Plan | Result | Notes |
|------|--------|-------|
| 05-01 | 10/10 | Sidebar + page + mount id ↔ prefixwrap selector (one fact, `index.spec.ts` reads it from `postcss.config.cjs` instead of restating). `flex-wrap` tab strip, no scroll container, no overflow menu. Tabs render with **no counts at all** — the truth "renders without a count rather than showing zero" is satisfied, and `App.spec.ts:292` asserts the absence explicitly. Prohibitions spot-checked and all hold: zero hex literals, no authored `font-family`, no `@defminer/backend` dependency, no `projects` key in `vitest.config.ts`. |
| 05-02 | 10/10 | All five widened SQL rules present in `RULE_NAMES` with both halves executed against the O-01 probe fixtures. Non-vacuity is asserted four ways. `tests/sqlite-346-query-plans.spec.ts` contains an actual test named *"states the version it ran on, and it is not silently the target version"* — the misleading filename is defused by an assertion, not by prose. |
| 05-03 | 9/9 | `sanitise.ts` strips before truncating, walks graphemes when `Intl.Segmenter` exists and code points otherwise, and `assertCap` throws on a missing cap so there is no default. `Displayed` is `{ text, shown, total }` — the untruncated string is genuinely unreachable through the returned object. |
| 05-04 | 9/9 truths + **2 backstops unresolvable** | `contract.ts` carries `EntityRowBase` (four columns in render order, column 2 marked target-controlled), `PageCursor`, `InvalidationSummary`, `ScoreExplanation`, `EvidencePanelFrame`, `TRIAGE_STATES`. The deferral register is complete for all seven ids — what/blocker/unblocking phase+plan/decisions-quoted — plus a fifteen-row carried-covered-rows table and a one-view summary. The two backstops on deferred surfaces cannot have executed evidence; see §5. |
| 05-05 | 10/10 | The gate and the display path. Honest about its own limit: hostile.spec's geometry assertion is labelled a floor because jsdom does not lay out, and it *names* the plan that carries the observational half. |
| 05-06 | 8/8 | Migration step v3 appends `audit` + two keyset indexes. `git diff 40d7610..HEAD -- migrations.ts` removes **no DDL line** — only two JSDoc lines outside the step array. `schema.spec.ts` carries `audit` in `EXPECTED_TABLES` and its exact six-column allowlist. D-06's age-bound exemption is visible in `retention.ts` as a 20-line stated exception where `AUDIT_OVER_AGE_SQL` would be. |
| 05-07 | 9/9 | Fully enumerated literal statement matrix; **zero** `OFFSET` in any shipped statement; `getContractVersion` endpoint; duplicate-registration guard documented at index.ts:33 and exercised by index.spec.ts:132. |
| 05-08 | 8/8 | Bounded 2,000-row window, short-page refetch loop, server-side sort/filter only, `useDebounceFn`/`useThrottleFn` from the pinned library, stop handle on unmount. |
| 05-09 | 10/10 truths + **2 backstops MET** | Both backstops carry the real-Chromium measurement above. `InventoryTable.spec.ts` stubs `RecycleScroller` **and says why in 12 lines** — the real scroller renders zero rows in jsdom, so a cell assertion would pass by measuring an empty set; `item-size` is asserted on the stub's own props so the number reaching the real component is still checked. |
| 05-10 | 7/7 truths + **1 backstop MET** | `EvidencePanel.spec.ts:500` runs the three named long-text cases through the **real mounted panel** with an assertion that the covered id set equals exactly the three the backstop row names. |
| 05-11 | 10/10 truths + **1 backstop MET** | Redacted is `EXPORT_REDACTION_MODES[0]` (order is the safety property, read by index not literal); no remember-affordance, asserted as a control-set equality; the raw confirmation string is **byte-identical** to `05-UI-SPEC.md:215`; the escape moves the choice to redacted; zero-row export disabled with the reason on the button; failed export keeps a raw selection raw. No `node:fs`, no `writeFile`, no `hostedFile` anywhere — D-04's browser Blob download is the whole mechanism. |
| 05-12 | 9/10 truths + **1 behavior-unverified** | Settings read/write reaches the shipped three-level resolution with no call-site change; all three retention bounds editable at both scopes; health counters read the live queue and `slimStatus()`; `CompatRefusal` is mounted above the body so it is on screen on any tab. The R5 server-path truth is exercised through a prop only — see §4. |

### Prohibitions

Every `must_haves.prohibitions` item I could check mechanically holds. The load-bearing negatives, checked directly: **no** `sdk.findings.create` anywhere; **no** triage or suppressions write anywhere; **no** `@caido/*` import in `packages/engine`; **no** `OFFSET`; **no** server-side file write; **no** `v-html` or DOM HTML sink; **no** per-line lint disable under `packages/frontend`; **no** parenthesised plural suffix (asserted negatively in three specs); **no** module-scope prepared statement (gated); **no** audit column outside the allowlist (gated). `knip` reports zero unused files and zero unused exports — only nine `@internal` tag hints, which are the recorded deferred item D-05-07-01 (grown from eight to nine).

---

## 3. Wiring — including a deliberate hunt for a third un-connected component

The phase's own record says two well-tested modules shipped un-wired (UI-07's coalescer, UI-09's `scan_state`) and were caught only by a later plan. I looked for a third, since 05-12 had no successor.

**Reverse-reference over every `.vue` in the package** — every one is imported by non-spec production source: `ArtifactsTable` 2, `CompatRefusal` 1, `EvidencePanel` 1, `ExportDialog` 1, `HealthPanel` 1, `InventoryTable` 3, `ObservationsTable` 1, `PartialBanner` 4, `SettingsPanel` 1, `StatusBadge` 5, `HighlightSlices` 8. `knip` finds no orphaned file or export.

**Full RPC surface traced both ways** — every one of the ten frontend `sdk.backend.*` calls has a matching `sdk.api.register` in `packages/backend/src/index.ts`, and the invalidation event is emitted for real from the drain pass (`consumer.ts:373`, a four-key literal, never a spread), subscribed at `client.ts:717`, and stopped on unmount at `App.vue:204`.

**No third un-wired component exists.** What I did find is one *deliberately* un-fed renderer — the R5 server-path row, `SERVER_STORAGE_PATH = null` at `App.vue:558`. It is the same *shape* as the two earlier defects (component built and tested, no production data reaching it), but the difference is decisive and I am recording it as such: it is documented at the call site with the reason (`telemetry.ts` strips `sdk.meta.path()` because it carries the operator's OS username, and `telemetry.spec.ts` gates that closure at the RPC level), it is in `WINDOWS.md` #64, and it has its own `## Known Stubs` row in the SUMMARY. It cannot be filled in this phase; DEPLOY-02 in Phase 6 inherits the rule. Recorded as **behavior-unverified**, not as a gap.

---

## 4. The four recorded gaps — each confirmed real, none overstated

| # | Claim | Verdict |
|---|-------|---------|
| 1 | The refusal surface has never rendered from an actual refusal; a gate now pins the exact endpoint set of all three refusal paths plus the catch | **Confirmed, and honestly stated.** `e192bfa` adds exact-set (`toEqual`, not `toContain`) assertions for refusal paths 2 and 3 and for the catch (which registers `getStatus` alone), each with a non-vacuity assertion naming the path taken via the log line, plus the negative half of the success-path gate; the commit message records four planted mutations each caught by exactly one new case. The rendering half remains stub-driven. Not overstated. |
| 2 | The 8 MiB per-RPC-call export figure is a budget, not a measured ceiling | **Confirmed.** `EXPORT_RPC_CHUNK_ROWS = 20_000` is derived by assertion from a measured per-row cost, and the spec asserts it is *near* the budget rather than arbitrarily conservative — but the budget itself is unmeasured against Caido. `WINDOWS.md` #63, open. Not overstated. |
| 3 | Query plans measured on 3.51.0/3.53.4, not Caido's 3.46.0; disclosed rather than closed | **Confirmed.** The spec contains an executed assertion that it states the version it ran on and that it is not silently the target version. Correctness properties (tie-block disjointness, uniform-direction requirement) are kept in separate describes from the plan measurements. `WINDOWS.md` #50, open. Not overstated. |
| 4 | Six backstop rows; four have real executed evidence | **Confirmed for four; two cannot and are carried.** See §5. |
| 5 | Two components shipped un-wired and were caught by later plans; look for a third | **Both closed, no third.** See §3. |

Both operator judgement calls are recorded as settled and were not re-litigated here: OPS-03's "retried on demand" reading (the retry is immediate and persisted; only the re-walk waits on bytes deliberately not retained — `WINDOWS.md` #62), and the uniform raw-export confirmation ceremony.

---

## 5. Backstop rows (UI-SPEC `🧪 backstop`) — evidence, per row

| Row | Carried in | Executed evidence | Status |
|-----|-----------|-------------------|--------|
| `overflow / findings-table` | 05-09 | `tests/frontend-load.spec.ts`, real Chromium, 10,000 rows, peak resident 58, 0/396 frames over budget | ✓ MET |
| `long-text / findings-table` | 05-09 | Same run: 12 hostile rows, `distinct rendered heights [32]`, `max cell graphemes 256 (cap 256)`. This spec found and fixed a genuine defect (99/396 frames over budget → 0; p95 418ms → 17.1ms) | ✓ MET |
| `long-text / evidence-panel` | 05-10 | `EvidencePanel.spec.ts:500` through the **real mounted panel**, the three named long-text cases, with an id-set equality guard | ✓ MET |
| `long-text / export-dialog` | 05-11 | `export.spec.ts:487` — every `HOSTILE_CASE_IDS` member × csv/json × redacted/raw, with an exhaustiveness assertion | ✓ MET |
| `long-text / suppressions-list` | 05-04 | **None possible** — surface deferred to Phase 4 | ⚠ `insufficient_spec` |
| `long-text / findings-projection-preview` | 05-04 | **None possible** — surface deferred to Phases 3/4 | ⚠ `insufficient_spec` |

The two unresolvable rows are carried as explicit verification *obligations* in `05-ENTITY-CONTRACT.md` § "Carried covered rows", distinguished there from the fifteen *resolutions*. Per `05-VALIDATION.md`'s own rule they resolve to human-needed and never to a silent pass. That is how they are recorded here.

---

## 6. Requirements coverage

| Req | Box | Verdict |
|-----|-----|---------|
| UI-01 | [x] | SATISFIED for the project-wide read; the entity-class half is registered as deferred. |
| UI-02 | [x] | SATISFIED — keyset cursor, virtualised scroller, server-side filter/sort, 10,000 rows measured. |
| UI-03, UI-04 | [ ] | Correctly open. Frames published, contents deferred. |
| UI-06 | [x] | SATISFIED — both formats, redacted default, two-gate raw, Blob download, audit row. |
| UI-07 | [x] | SATISFIED — emit → subscribe → coalesce → stop, all wired. |
| UI-08 | [x] | SATISFIED *as the surface and its growth mechanism*. The build has three settings; thresholds and budgets are Phases 2–4's and have shipped no controls. The SUMMARY says so plainly (P5-D101) rather than letting the checkbox imply otherwise. |
| UI-09 | [x] | SATISFIED on the running page. Note: `ObservationsTable` receives `:analyses="null"` by an argued decision (an observation is a sighting; the analysis lives on the bytes), so observation rows carry no badge and no banner. Reasonable, documented — worth an operator eye, since an observations count can still be a floor. |
| OPS-01, OPS-02, OPS-04 | [ ] | Correctly open, registered. |
| OPS-03 | [x] | SATISFIED on the operator's reading, with the alternative reading stated rather than hidden. |
| FIND-01, FIND-02 | [ ] | Correctly open, registered. |
| UISEC-01/02/03 | [x] | SATISFIED — see criterion 6. |
| STORE-08 | [x] | SATISFIED after the 2026-08-31 re-scope. The split is legitimate: it follows the STORE-01 → STORE-08 precedent this project already set, `entities`/`evidence` moved to a newly-opened **STORE-09** assigned to Phase 4, and `ROADMAP.md`'s traceability table was updated on both rows. Two executors had independently refused to check the box over two absent tables; the split is what made it honestly checkable. |

No orphaned requirements: every id `REQUIREMENTS.md` maps to Phase 5 appears in a plan's `requirements` field.

---

## 7. Findings

### 🛑 Blockers — none

### ⚠ Warnings

1. **`FindingsTable.spec.ts` header comment is stale and states the opposite of shipped behaviour.** Lines 22–30 assert *"The paged reads in reads.ts select no `scan_state` and no endpoint returns one … App.vue passes `null`"*. Both were true at 05-09 and were falsified by 05-10 (`reads.ts` selects it; `App.vue:258` builds a populated map). This is documentation drift, not a functional defect — the assertions in the file are fine and `App.spec.ts:679` covers the running page — but it sits in the file that gates UI-09, which is the worst place for it.
2. **`WINDOWS.md` #48 is stale.** It says `EXPORT_RPC_CHUNK_ROWS` is exported from a spec in `tests/` and that 05-11 must move it. 05-11 did: it lives at `packages/backend/src/store/export.ts:130` and the spec now imports *from* production. The entry is still `open`. (#56 and #58 were correctly closed on 2026-08-29, so the ledger is generally maintained — this is one miss.) Relatedly, `tests/export-payload-budget.spec.ts:172,372` still say `packages/engine/src/csv.ts` "does not exist yet"; it does.
3. **`05-12-SUMMARY.md` self-audit gap 6 understates the delivered state.** It says nothing gates the three refusal paths' endpoint sets. `e192bfa` closed exactly that, seventeen minutes after the SUMMARY was written, and the SUMMARY was not updated. Understated rather than overstated, so harmless — but the record is wrong.
4. **`ROADMAP.md` Wave 8 still shows `- [ ] 05-12`** while the plans list above it shows `- [x] 05-12-PLAN.md` and the header reads "12/12 plans executed". Bookkeeping only.
5. **`sql-discipline.spec.ts`'s named-module rename-guard was not extended** with `reads.ts`, `export.ts`, `retry.ts` or `audit.ts`. This is **not a gate hole** — I enumerated the suite and confirmed all four are audited by the `it.each(files)` walk — but the rename guard that protects the fourteen Phase 0/1 modules does not protect the four largest new ones. The same applies to `frontend-safety.spec.ts`'s five-entry `AUDITED_MODULES` against 28 walked files.
6. **An export can complete without an audit row.** The audit write happens on the chunk that completes the export, and a failure is logged rather than returned (`index.ts:589`). The prohibition "no export proceeds without an audit row" holds on every successful path, and the reasoning for writing once-at-completion rather than per-call or optimistically is written out at the call site — but an operator who abandons a multi-chunk export mid-flight gets bytes with no audit record. Worth an explicit operator ruling.
7. **`SERVER_STORAGE_PATH = null`** — see §3 and the `behavior_unverified_items` block.
8. **Two backstop rows unresolvable** — see §5 and the `insufficient_spec_items` block.
9. **Two live-Caido residuals open** — the 8 MiB RPC budget and the SQLite 3.46 query plans. Both disclosed in `WINDOWS.md`, both requiring hardware/software this machine does not have.

### What I looked for and did not find

I went hunting for the failure shapes this phase's own executors kept finding — vacuous specs, gates scanning nothing, tested-but-unconnected components — on the assumption more existed. They largely do not. Every static gate I opened carries explicit non-vacuity assertions (non-empty file set, named module list, proof of subdirectory descent, proof it found something to audit, and an exact rule-name list so a rule cannot be silently added or deleted). Every fixture-driven suite I opened carries an exercised-id-set equality against the shared corpus. `tests/frontend-load.spec.ts` refuses to skip when the browser is missing. `InventoryTable.spec.ts` stubs the scroller and explains in twelve lines why the alternative would pass by measuring an empty set. There are **zero** `.skip` / `.only` / `.todo` / `skipIf` / `runIf` calls anywhere in the 59-file suite. I re-ran the full suite myself: 59 files, 2,272 tests, exit 0.

---

## 8. Verdict

The phase goal is achieved **for the scope D-05 defines**, and the deviation from the roadmap's original ambition is a registered, reasoned, decision-carrying deferral rather than a silent omission — I checked the register against all seven deferred ids and it is complete on every one of its four parts, with D-01/D-02/D-03 quoted verbatim and D-01's one-way checkpoint explicitly carried forward unspent.

Where the phase claimed something, it is there. Where it could not deliver, it says so — in the SUMMARY, in `WINDOWS.md`, and in the code comment at the call site. The one place I expected to catch an overstatement — the four "known gaps" — I found each one accurate or understated, never inflated.

The nine warnings are documentation drift, ledger hygiene, and residuals that need hardware this machine does not have. None of them blocks Phase 6.

**Status: `passed_with_gaps`.** Five human-verification items and two carried backstop obligations await an operator decision.

---

_Verified: 2026-08-31T09:55Z · HEAD 4e2b8fb · suite re-run by the verifier: 59 files / 2,272 tests, exit 0_
_Verifier: Claude (gsd-verifier)_
