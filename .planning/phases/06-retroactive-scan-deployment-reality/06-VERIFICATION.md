---
phase: 06-retroactive-scan-deployment-reality
verified: 2026-09-01T12:15:00Z
status: passed_with_gaps
score: 161/165 plan truths verified
roadmap_criteria: 3 MET · 2 MET BY DISSOLUTION (D-17/D-24, operator-approved) — 0 NOT MET
behavior_unverified: 2
insufficient_spec: 1
overrides_applied: 0
head: 9d7b0d3
suite: 73 files / 3057 tests passing (re-run by this verifier, exit 0, 13.44s)
scope_judged_against: "06-CONTEXT.md D-01…D-26, locked. Criteria 4 and 5 are judged against D-17 and D-24 — the operator-approved dissolution — not against the roadmap's original wording."

behavior_unverified_items:
  - truth: "A retroactive HTTPQL-filtered scan RUNS (ROADMAP SC1, FIND-03) — the driver walks pages out of a real `sdk.requests.query()` and into the shipped queue"
    test: "Install the plugin on a Caido with real captured history, open the Scan tab, start a scan with an empty operator clause, and watch it walk. Then start one with a narrowing clause."
    expected: "Pages walk descending from the present; the counter strip advances; artifacts and observations appear in the entity tabs; live browsing during the walk is never dropped."
    why_human: "The driver is real production code, wired at both arming sites, and every property of the walk is proven against `fakeQuerySdk` fixtures. NOTHING in the repo has ever driven it against a live Caido. No matrix leg starts a scan — D-22's four per-leg assertions are install, migrations, one proxied response, and restart persistence. The only probes that touched a real instance are the pushdown probe (which calls `sdk.requests.matches` and never walks) and O-07 (which proxies and never scans). This is the phase's own stated hardest lesson pointed back at its own headline feature."
  - truth: "Retroactive scans report progress and are cancellable (ROADMAP SC1, FIND-04) — on EVERY exit path, not only the per-page one"
    test: "Start a scan, then force the walk to fail (kill the origin mid-page, or switch project under it). Watch the Scan tab without touching Refresh."
    expected: "The surface stops saying `running` and says what happened."
    why_human: "Confirmed by reading the code, not by running it: `driveScan`'s `case \"failed\"` logs and returns without re-arming and without a state transition (index.ts:439-441), and the ONLY emitters of `SCAN_PROGRESS_KIND` are the producer's two per-page/hold sites (producer.ts:621, 797) — no emit on complete, pause, discard or fail. `ScanPanel`'s `setInterval` advances `now` only (ScanPanel.vue:327), so there is no auto-poll. The panel therefore renders `running` indefinitely until the operator clicks Refresh. This is 06-REVIEW's HI-02 + ME-01, both open."

insufficient_spec_items:
  - backstop: "overflow / scan-history-list (06-UI-SPEC § UI Considerations, row marked ⚠ unresolved)"
    reason: "`SCAN_HISTORY_LIMIT = 50` is a defensible proposal, not a measurement — no requirement bounds the expected scan count. The SHAPE is verified and binding (a stated bound enforced at read, every `suspended` scan pinned in by the leading `(state = 'suspended') DESC` term of `LIST_SCANS_SQL`, truncation said in words). The NUMBER is not derivable from anything."
    resolution_needed: "Operator confirmation that 50 is acceptable as a carried assumption. It is honestly recorded as one at scan-contract.ts:1031 ('assumption rather than quietly promoted to a decision. NO REQUIREMENT BOUNDS...'), so this must not be recorded as a silent pass."

human_verification:
  - test: "Run one real retroactive scan end to end on a Caido with captured history."
    expected: "See behavior_unverified_items[0]."
    why_human: "The headline feature has never been executed outside fixtures."
  - test: "Force a walk failure and watch the Scan tab without refreshing."
    expected: "See behavior_unverified_items[1]."
    why_human: "HI-02 and ME-01, both open."
  - test: "Decide whether REQUIREMENTS.md's DEPLOY-03 and DEPLOY-04 entries may stay ticked with their ORIGINAL wording and no annotation."
    expected: "Either an inline note naming D-17 and D-24 beside each tick, or an explicit decision that the register need not carry it."
    why_human: "Both lines are `[x]`. DEPLOY-03 still reads '...delivered via `sdk.hostedFile` or a bounded authenticated frontend download, with expiry and redaction rules'; DEPLOY-04 still reads '...with quotas and orphan cleanup'. A Phase 7 reader consulting the register alone will read both as delivered AS WRITTEN. The dissolution is fully argued in 06-CONTEXT D-17/D-24 and in this report — it is just not visible at the point of the tick."
  - test: "Decide the disposition of the docker-no-volume leg's `cursor_probe.measured: true`."
    expected: "Either re-record it as unmeasured, or add a gate term requiring the leg's request store to have SURVIVED before a positive is admitted."
    why_human: "See §6 finding W-2. Three legs record `measured: false`; the fourth records `measured: true, resolved_after_restart: true` — and it is the one leg whose container was REMOVED and re-created, so its request store was destroyed. A query that resolves against a destroyed store is not evidence that a cursor survived. `tests/phase6-matrix.spec.ts:815` gates a positive on `control_query_resolved` and A1/A2 only, so this passes. 06-10-SUMMARY.md:144 and :179 state O-04 is `measured: false` flatly, which the artifact contradicts."
  - test: "Confirm the ⚠ unresolved 50-row scan-history bound."
    expected: "Recorded as an accepted assumption, not as a pass."
    why_human: "See insufficient_spec_items."
  - test: "Open the Scan tab in a real Caido renderer (Electron), with a running scan and a multi-kilobyte pasted clause."
    expected: "48px toolbar with the live indicator, the counter strip at a fixed height, the clause truncated in-cell, the panel column scrolling rather than the strip growing."
    why_human: "Carried forward from Phase 5's standing item. Every layout measurement is headless Chromium over a generated harness entry, never Caido's renderer."

deferred:
  - truth: "`ScanStatusPayload.analysed` carries a number (one of D-14's seven progress counters)"
    addressed_in: "No phase — declined twice with reasons, WINDOWS #94"
    evidence: "`analyses` rows carry no scan attribution; the primary key is `(project_id, sha256, detector_set_hash)`, so no analysis can be attributed to the scan that offered it. Declined by 06-06 and again by 06-09 after being named owner by window #86. The honest render ships: `analysed: number | null` (contract.ts:301), hardcoded `null` at both producer emit sites, rendered as an em dash and never a zero (scan-contract.ts:851-853). The UI-SPEC rule — a number DefMiner does not have is ABSENT, never fabricated — is obeyed. Six of seven counters render."
  - truth: "The scan detail shows the COMPOSED filter the scan actually ran"
    addressed_in: "No phase — WINDOWS #104"
    evidence: "`scans` has no `composed_filter` column; `LIST_SCANS_SQL` projects `operator_filter` and nothing else. The surface states the composition as ABSENT rather than recomposing it from today's `SCAN_KIND_CLAUSE`, which would be silently wrong for any historical scan after an upgrade — and this phase upgraded the clause (see §5, `cont` → `like`), so the wrong-answer path was live, not hypothetical."
  - truth: "`sql-discipline.spec.ts` catches a statement whose leading keyword hides it from the gate"
    addressed_in: "Phase 11 (hardening)"
    evidence: "WINDOWS #84, owner assigned."
  - truth: "Ten open code-review findings closed (HI-02, ME-01…ME-05, LO-01…LO-04)"
    addressed_in: "Unassigned — 06-REVIEW.md is their record, WINDOWS #107"
    evidence: "CR-01 (`08d623c`) and HI-01 (`58d48ed`) fixed by instruction; the other ten remain open. HI-02, ME-01, ME-02 and ME-04 are load-bearing on ROADMAP SC1 and are called out individually in §6."
---

# Phase 6: Retroactive Scan & Deployment Reality — Verification Report

**Phase Goal:** Apply the analysis to traffic captured before install — and stop pretending the backend filesystem is on the operator's machine.
**Verified:** 2026-09-01T12:15Z at HEAD `9d7b0d3`, working tree clean.
**Status:** `passed_with_gaps`
**Scope judged against:** the twenty-six LOCKED decisions in `06-CONTEXT.md`. Criteria 4 and 5 are judged against **D-17** and **D-24** — dissolutions approved by the operator at 06-07's blocking checkpoint — and not against the roadmap's original wording. That is stated explicitly at each criterion rather than ticked silently.

---

## 1. ROADMAP Success Criteria

| # | Criterion | Verdict | Evidence actually checked |
|---|-----------|---------|---------------------------|
| 1 | A retroactive HTTPQL-filtered scan of existing traffic **runs** with page size 20, reports progress, and can be cancelled and resumed from its cursor | **MET — degraded on the failure path** | **Runs:** the driver that was missing for most of the phase is real production code. `driveScan` (index.ts:361) hands the producer **the shipped queue or nothing** (`const shipped = queue; if (shipped === undefined) return;` — with a comment stating that a fallback queue would make the watermark gate on a number only the fallback touches), and is armed at exactly two sites, both confirmed: `startScan` after the row commits (index.ts:1137) and `resumeScan` only when the guard actually moved the row to `running` (index.ts:1267). Not at `init()` — D-11's sweep is not reversed. **Page size 20:** `SCAN_PAGE_SIZE = 20` at `packages/engine/src/thresholds.ts:142`, imported by the producer rather than restated (asserted by producer.spec's "imports the page size and the watermark instead of writing them out"). **Backpressure:** `producer.spec.ts` ran green this pass (35 tests); the sustained-backfill contract at line 715 holds exactly as claimed — queue filled to `WATERMARK − 1` with `live-*`, one page walked (`record.executes === 1`, `stop === "held"`), a full `EVENTS_DELIVERED_UNDER_BLOCK` burst delivered on top, `queue.overflowCount === 0`, `counters.queueOverflow === 0`, and `queue.take()?.id === "live-0"` still at the head. **Cancel/resume:** `pauseScan`, `resumeScan`, `discardScan` and `listScans` are all registered (index.ts:1244-1285) and all reached from `App.vue` (1088-1091) into `ScanPanel`. Cancel is pause (D-10). **Cursor:** the durable resume position is `scans.last_request_id`; `last_cursor` is NULLed on suspend *because O-04 is unmeasured* (scans.ts:514-520) — the design routes around the unmeasured fact rather than betting on it. `producer.spec` proves the resume is strictly below the last walked request, no overlap and no gap. **What is DEGRADED:** progress is emitted only from the producer's two sites, so no terminal transition emits; a failed walk neither re-arms nor transitions; there is no auto-poll. See §6, HI-02/ME-01/ME-02. |
| 2 | The plugin is exercised on local desktop, remote CLI, and Docker both with and without a persistent volume, and behaves correctly on all four | **MET** | Genuinely executed, not asserted. `results/matrix-result.json` records 4 of 4 declared shapes run, 4 passed, 0 not_run, 0 failed, against **real Caido 0.58.2** — the desktop/CLI legs off the absolute app-bundle path with a recorded sha256, the container legs by **manifest digest** (`caido/caido@sha256:d34929…`). All four D-22 assertions true on every leg: `install_and_compatible`, `migrations_and_tables`, `artifact_and_observation`, `restart_data_presence`. The no-volume leg is the interesting one and it is done correctly: the container was **stopped, REMOVED and re-created** — "a container restart would have preserved it and proven nothing" — and the second boot found an empty database with the expected table set, zero artifact rows and a clean start. `tests/phase6-matrix.spec.ts` (46 tests) passed this pass and refuses a `not_run` leg carrying verdicts. **Disclosed caveat, in the artifact's own `verdict.remote_filesystem_property` field:** local-desktop and remote-cli share a filesystem on this host, so "4 passing legs are NOT 4 independent confirmations" — only the two container legs exercise the property DEPLOY-02/03 exist for. `MATRIX_CLI_REMOTE_HOST` is the switch for a real remote host. |
| 3 | Server-side storage is labelled as such in the UI and never presented as a path on the operator's machine | **MET — and stronger than asked** | The rule is satisfied by **deleting the renderer**, not by labelling a value. `SettingsPanel.vue`'s props block states it as the feature: "THERE IS NO STORAGE-PATH PROP, AND THAT IS THE FEATURE… Phase 5's `behavior_unverified` item is closed BY DELETION, NOT BY SUPPLYING A VALUE." Repo-wide, `sdk.meta.path()` appears only in prose and in gate fixtures — never at a render site. What DOES render: `STORAGE_HEADING = "Storage on the Caido server"` and `"DefMiner's database lives on the Caido server, not on this machine. On a remote or containerised Caido that is a different disk from the one you are reading this on."` (settings-contract.ts:278-282), unconditionally. D-25's footprint is wired end to end and carries real data: `SettingsPanel` → `App.vue:602` → `getStorageFootprint` (index.ts:1028) → `readStorageFootprint` composing the already-shipped `countArtifacts`/`countObservations`/`countAnalyses` against live retention bounds. A failed read leaves `null`, which renders nothing rather than zeroes. **The persistence sentence is an OBSERVATION, never a claim** — `recordBoot` (settings.ts:572) reports a loss only when a boot finds no install id in a database *this process* already held one from, so a first install can never false-positive. Its blind spot is disclosed in the code itself: "A restart that this process did not live through — the ordinary case, since a Caido restart is a new process — leaves no evidence, and none is invented." |
| 4 | Operator-facing artifacts are retrievable through `sdk.hostedFile` or a bounded authenticated download — never by writing a path and assuming the operator can reach it | **MET BY DISSOLUTION (D-17), gates verified** | Judged against the locked decision, as instructed. `sdk.hostedFile` is declined because `HostedFileSDK` is `getAll()` + `create()` — no delete, no expiry — so DEPLOY-03's expiry is *inexpressible* against it; DEPLOY-03's own wording offers the bounded authenticated download as an equal alternative, and Phase 5 shipped and measured exactly that. **What I verified is the gate, and that it asserts what it claims.** `filesystem-prohibition.spec.ts` ran green (**224 tests**) and is not a name-check: every declared rule id has BOTH a firing fixture and a legal fixture (lines 1207/1217), the fs-import case table is the **full cross product of specifier forms × import shapes** (1258), the specifier list is *derived* from the prefix families rather than typed out (1275), `FORBIDDEN_FILESYSTEM` is derived from `RULES` and cannot disagree with it (1243), the walk is proven to have descended into subdirectories per root (751), and the gate reports its own real `fs` import on itself while ignoring its prose and fixtures (839). **And the prohibition holds in reality, not only as a gate:** a repo-wide grep over `packages/*/src` excluding specs finds **zero** `hostedFile`, `node:fs`, `llrt/fs` or bare `fs` import. Redaction is genuinely shipped (Phase 5's `EXPORT_REDACTION_MODES`); **expiry loses its subject** under the download — nothing persists server-side to expire. A dissolution, not a compliance, and it is named as one here. |
| 5 | Server disk is quota-bounded with orphan cleanup, and behaviour on a container without a volume is documented and tested | **MET — half by dissolution (D-24), half by execution** | **The quota/orphan half is dissolved and the proof is what ships.** No BLOB column and no body bytes anywhere: `migrations.spec.ts:609` asserts `expect(sql).not.toMatch(/\bBLOB\b/)` over the DDL, and `schema.spec.ts` carries the D-24 declared-type gate — `PERMITTED_DECLARED_TYPES` excludes BLOB (805), a BLOB column turns the collector non-empty with the reason in the message (721), and **an UNTYPED column fails too because it takes BLOB affinity in SQLite — the case a name-based check misses entirely** (749). Both firing paths are executed against throwaway tables in the same file. Name-based rules cover body/headers/cookie/authorization (491-494). 17 + 30 tests green this pass. The footprint is therefore fixed-shape metadata already bounded by `retention.ts` on rows and age. **The no-volume half is met by EXECUTION, not by documentation:** see criterion 2 — `docker-no-volume` is a stop/REMOVE/re-create, second boot on an empty database, expected tables present, zero rows, clean start, no error. That is the strongest single piece of evidence in the phase. |

**Criteria score: 3 MET · 2 MET BY DISSOLUTION · 0 NOT MET.** No criterion is unmet. Two are met by an operator-approved dissolution rather than by construction, and that is said at each one.

---

## 2. Plan `must_haves` — truths

**165 truths declared across thirteen plans** (12 / 7 / 11 / 9 / 15 / 11 / 10 / 15 / 12 / 11 / 11 / 24 / 17). **Method, stated so it is not overread:** I verified the load-bearing set directly — by opening production source, tracing wiring both ways, and executing named specs — and accepted the remainder on the strength of the green suite plus the gates that police them. I did not re-derive all 165 independently. **161 verified; 4 not verified as worded**, each named below rather than absorbed.

| Plan | Result | What was actually opened |
|------|--------|--------------------------|
| 06-01 | 12/12 | `runScanProducer` and its page walk; `SCAN_KIND_CLAUSE` lifted into the engine contract so the frontend can render it. |
| 06-02 | 7/7 | `results/o07-body-length.json` — status `pass`, real proxying of one fixture under four Content-Encodings through a version-asserted 0.58.2, direct-at-origin control fetches, `counters.byteLenMismatch` read off the shipped `getStatus`. Written under this phase's own results dir (Pitfall 7 respected). |
| 06-03 | 11/11 | `SCAN_BACKPRESSURE_WATERMARK` in `thresholds.ts`, imported not restated. The watermark's **latency half remains an open residual** — it needs a median artifact size nobody has measured, and 06-03 refused to project one. Confirmed as recorded. |
| 06-04 | **8/9 — one truth STALE AS WORDED** | Truth 8 declares "the kind clause uses the case-INSENSITIVE `cont` family and never `req.ext.eq`". **The shipped clause uses `like`, not `cont`** — see §5. The truth's INTENT (case-insensitive on the kind axis, never the case-sensitive `eq`) is met; its literal wording was superseded by 06-11's measurement and was never edited back. Truth 7 ("no HTTPQL string reaches `.filter()` except from the single composer, proved by a static AST gate over every shipped backend module") holds **for the backend** — but see ME-04 in §6: there is a second composer in the frontend the gate's `BACKEND_SRC` walk cannot see. |
| 06-05 | 15/15 | The `scans` lifecycle. `PAUSE` leaves `last_request_id`/`last_created_at` untouched; `SUSPEND` NULLs `last_cursor` with the O-04 argument written at the SQL; discard resets `last_request_id` to `''`, the same "no boundary" value a fresh row carries. |
| 06-06 | 11/11 (with `analysed` declined — see `deferred`) | |
| 06-07 | 10/10 | D-17's checkpoint. The decision is locked in CONTEXT with its three driving facts and a one-way reversibility rating. |
| 06-08 | 15/15 | Every truth in this plan was checked at source. The path renderer, its prop, its five copy constants and the left-cut helper are gone. `STORAGE_NOTE` renders unconditionally. Footprint rows wired to real counts against live caps; a measured zero renders as zero, an unavailable count renders as an absent row; the `oldest {n} days` clause is absent rather than fabricated. |
| 06-09 | 12/12 | The driver folded in by mid-execution operator decision — the plan that made criterion 1's word "runs" true. Verified at source in §1. |
| 06-10 | **10/11 — one truth answered with a contradicted artifact** | The matrix harness is excellent (see criterion 2). Truth 10 ("O-04 answered inside the restart leg, with A1 and A2 alongside") is answered — **A1 and A2 are measured `true` on all four legs**, and those are the two facts the shipped resume position actually depends on. But the SUMMARY states O-04 is `measured: false` flatly while one leg records `measured: true`. See §6, W-2. |
| 06-11 | 11/11 | The `cont` measurement and the fix. See §5. |
| 06-12 | 24/24 | The Scan tab, the start form, the counter strip. `long-text / scan-start-form` backstop discharged in both halves. |
| 06-13 | **16/17** | The history list, the toolbar indicator, both remaining backstops discharged in full. The composed-filter disclosure asked for by task 1 does not render — no `composed_filter` column (WINDOWS #104). Recorded as absent rather than recomposed, which would be silently wrong after an upgrade. |

### The four not verified as worded

1. **06-04 truth 8** — `cont` vs `like`. Intent met, wording stale.
2. **06-10 truth 10** — O-04's answer, contradicted between SUMMARY and artifact (W-2).
3. **06-13's composed-filter disclosure** — structurally absent, honestly stated (`deferred`).
4. **`ScanStatusPayload.analysed`** — declined twice with a structural reason and no owner left (`deferred`).

---

## 3. UI-SPEC coverage — the 35 `## UI Considerations` rows

Spot-checked the marked rows, as instructed.

| Row | Marking | Disposition verified |
|-----|---------|---------------------|
| `long-text / scan-start-form` | 🧪 backstop | **Both halves executed.** jsdom half in `safety/hostile.spec.ts` (sanitisation through `display.ts`, inertness against an explicit tag allowlist, no `title`, no `data-*`, grapheme safety at the cap, over the SHARED hostile corpus with id-set exhaustiveness). Layout half in `tests/frontend-load.spec.ts` in **real headless Chromium** — this run measured `strip height, hostile clause .. 48.00 px`, `clause length .. 4194304 chars`, `composed rendered .. 248 chars`, `panel scroll/client height 1477/600`. The strip did not grow; the panel column scrolled. The block **never skips** — a missing browser fails it. |
| `long-text / scan-history-list` | 🧪 backstop | **Discharged in full, no layout half owed** — and `hostile.spec.ts`'s header says so plainly rather than leaving a reader to infer it. The clause renders in every row at the table-cell cap through `forCellText`. |
| `long-text / scan-detail` | 🧪 backstop | Same, at the evidence-panel cap through `forPanel`, grapheme-safe, third surface. |
| `overflow / scan-history-list` | ⚠ unresolved | **Honestly dispositioned.** The shape is enforced (`LIST_SCANS_SQL`'s leading `(state = 'suspended') DESC` pin, at most one suspended row per project so the pin is itself bounded, truncation said in words). The number 50 is recorded in code as an assumption, not promoted to a decision. Carried as `insufficient_spec`. |

The remaining rows were lifted into `must_haves` by the plan-checker; the `covered` ones I sampled (storage-statement wrapping, footprint-counts nouns-and-integers, the counter strip's fixed height, the absent-not-zero rules) are satisfied at source and by the specs named above.

---

## 4. Wiring and data flow

**Every scan RPC traced both ways.** `startScan`, `getScanStatus`, `pauseScan`, `resumeScan`, `discardScan`, `listScans` are all registered in `packages/backend/src/index.ts` and all reached from `App.vue` through `api/client.ts` into `ScanPanel`. `getStorageFootprint` likewise.

**Level 4 — no hollow props found on the surfaces this phase shipped.** The footprint rows terminate in real `count*` queries against live `getRetentionBounds`, not in literals. The scan counters terminate in `scans` columns projected field-by-field (`toHistoryRow`, index.ts:456 — mapped, never spread, with `epoch`/`last_cursor`/`last_request_id` deliberately left behind). The one deliberate `null` is `analysed`, which renders as an em dash by contract.

**The progress channel is the one place the wiring is thin, and it is a real thinness rather than a stub:** `SCAN_PROGRESS_KIND` has exactly two emitters, both inside the producer (producer.ts:621, 797), and one subscriber path (`api/client.ts:1034-1042` → `stores/scan-progress.ts` → `ScanPanel`). The channel works; nothing outside the producer speaks on it. That is ME-01.

---

## 5. The push-down superset (D-06) — verified by execution

The instruction was to confirm the fix landed and that the proof joins on a shared fixture identity. Both confirmed.

- **The measurement:** 06-11 found `cont` is **case sensitive on 0.58.2 despite the reference documenting it "Case insensitive"** — `req.path.cont:".js"` and `req.path.cont:".JS"` returned **disjoint** match sets against the captured corpus. That made the shipped clause a strict subset of `admit()`'s gate in two of seven terms, which is precisely the silent-miss D-06 exists to forbid.
- **The fix landed.** `SCAN_KIND_CLAUSE` (contract.ts:257-261) is now seven `like` terms — `req.path.like:"%.js%"`, `%.mjs%`, and five `resp.raw.like` MIME needles. `like` folds ASCII, and the argument for why lowercasing the needles is safe (no character in `.js`/`javascript`/… lowercases INTO another needle; `TEXT/JAVASCRİPT` folds correctly) is written out at filter.ts:197-199. `.mjs` is two terms and not one because `.mjs` does not contain `.js`.
- **The proof is joined on a shared fixture identity.** `results/pushdown-superset.json` — status `pass`, **27 fixtures**, recorded 2026-09-01T08:08Z, method: a disposable backend plugin calling `sdk.requests.matches(clause, request, response)` **in-process on a real instance**, recording the evaluator's answers and making no classification decision of its own. The shipped `isScriptish` is applied separately in `tests/phase6-pushdown.spec.ts` and **joined by fixture id** — with a bidirectional exhaustiveness gate: every manifest fixture appears exactly once (292), no duplicates, no fixture the manifest does not name (313), unjoined rows empty in both directions (326). The recorded clause is asserted **byte-identical to `SCAN_KIND_CLAUSE`** (248) and to what the probe echoed back (259). The superset assertion (337) fails with `REMEASURE` and the explicit instruction *"Never widen the fixture set to make this pass"*; the converse is deliberately not asserted, and at least one fixture is required to demonstrate over-matching so the direction is not vacuous (362). 25 tests, green this pass.

---

## 6. Findings

**W-1 — HI-02 + ME-01 + ME-02 together degrade criterion 1's "reports progress" half.** Verified at source, not taken from the review. `driveScan`'s `case "failed"` logs and returns — no re-arm, no state transition (index.ts:439). No terminal transition emits progress. `ScanPanel` has no auto-poll (its `setInterval` advances `now` only). Consequence: a scan whose walk fails renders `running` forever until the operator presses Refresh, and the row stays `running` in `scans` until `SCANS_OVER_AGE_SQL` deletes it at 90 days. ME-02 compounds it — `advanceScan` returning `changes === 0` is treated as success, so counters can go backwards on Refresh. All three open, recorded in 06-REVIEW.md and WINDOWS #107. **Not a blocker for the phase** — every path the operator will normally take works — but it is the gap between "runs" and "runs visibly".

**W-2 — one matrix leg records a cursor-probe positive that its own conditions make vacuous, and the SUMMARY says the opposite.** Three legs record `cursor_probe.measured: false` with the control-backed reason. `docker-no-volume` records `measured: true, control_query_resolved: true, resolved_after_restart: true`. That is the leg whose container was **removed and re-created** — the request store was destroyed. A query resolving against a destroyed store says nothing about whether a cursor survived. The gate at `tests/phase6-matrix.spec.ts:815` admits it because it checks only `control_query_resolved` plus A1/A2, never that the leg's store survived. Meanwhile `06-10-SUMMARY.md:144` and `:179` state O-04 is `measured: false` flatly. One of the two records is wrong. **This does not touch the shipped design** — the resume position is `last_request_id` and `init()` NULLs `last_cursor` on every boot, so nothing depends on O-04 either way, and A1/A2 (the facts that ARE depended on) are measured true on all four legs. It matters because it is an artifact claiming a measurement it did not make, in a phase whose entire deployment evidence is artifacts.

**W-3 — REQUIREMENTS.md ticks DEPLOY-03 and DEPLOY-04 with their original wording and no annotation.** Both are `[x]`. DEPLOY-03 still reads "delivered via `sdk.hostedFile` … with expiry and redaction rules"; DEPLOY-04 still reads "with quotas and orphan cleanup". Neither was built; both were dissolved by an approved decision with a genuinely strong argument. The argument lives in 06-CONTEXT and in the SUMMARYs — it is invisible at the register, which is the artifact a later phase will actually consult. A one-line annotation beside each tick would close it.

**W-4 — ME-04: a second HTTPQL composer exists outside the gate that forbids one.** `composedPreview` (scan-contract.ts:834) composes the DefMiner clause with the operator's for display, and `httpql-discipline.spec.ts` walks `BACKEND_SRC` only, so it cannot see it. The **safety** property is intact — the preview is display-only, rendered through `forCellText`, and never reaches `.filter()`; the backend composer is what actually runs. The **honesty** property is what is at risk: nothing forces the preview to agree with the composition that executes, so the operator can be shown a filter that is not the one running. Open, recorded.

**Confirmed and already recorded (not new):** `analysed` is `null` with no owner (WINDOWS #94, declined twice, honestly rendered); O-04's primary result is unmeasured while A1/A2 are measured (subject to W-2); the remote-CLI leg shares a filesystem with the desktop leg and says so in its own artifact; `SCAN_DRIVER_REENTRY_MS = 250` is chosen and unmeasured (index.ts:331, with a stated rationale — a wait, not a spin); the watermark's latency half is an open residual with no measured median artifact size; `scans` has no `composed_filter` column (WINDOWS #104); WINDOWS #84's leading-keyword blind spot is owned by Phase 11; ten of twelve review findings remain open (WINDOWS #107).

**Anti-pattern scan:** no unreferenced `TBD`/`FIXME`/`XXX` in the files this phase touched. The `null`-returning paths I checked are all deliberate and documented (`analysed`, the footprint's failed read, `getScanStatus`'s absent-scan payload — the last with an explicit comment that a zero-filled payload would describe a scan that ran and found nothing).

---

## 7. Suite and gates

Re-run by this verifier at HEAD `9d7b0d3`:

- `pnpm test` — **73 files / 3057 tests passing**, exit 0, 13.44s. This project's include set covers every prior phase's specs, so this is the regression run.
- Targeted re-runs: `producer.spec.ts` (35) · `phase6-pushdown.spec.ts` (25) · `phase6-matrix.spec.ts` (46) · `filesystem-prohibition.spec.ts` (224) · `store/schema.spec.ts` (17) · `tests/schema.spec.ts` (30) — all green.
- Repo-wide prohibition grep over `packages/*/src` excluding specs: **zero** `hostedFile`, `node:fs`, `llrt/fs`, bare `fs` import.
- Result artifacts present and schema-gated: `matrix-result.json` (+ 4 leg files), `pushdown-superset.json`, `o07-body-length.json`.
- No `06-SECURITY.md` — no secure-phase run for this phase.

---

## 8. Gaps summary

The phase achieved its goal. The retroactive scan is built, wired, backpressured against live browsing, cancellable and resumable from a durable position; the deployment matrix ran for real on four shapes against Caido 0.58.2 including the container-without-a-volume case that DEPLOY-02 exists for; and the filesystem pretence is not merely labelled away but structurally absent, gated, and true by grep.

Three things keep this from a clean `passed`:

1. **The headline feature has never been run.** Every property of the walk is proven against fixtures. No probe, no matrix leg, and no test has ever driven `runScanProducer` through a real `sdk.requests.query()` against real captured traffic. This is exactly the shape the phase itself named as its hardest-won lesson.
2. **The progress surface stops talking on the failure path** (HI-02/ME-01/ME-02, open).
3. **Two artifacts overclaim slightly** — the O-04 cursor probe on one leg (W-2), and the DEPLOY-03/04 ticks in the requirements register (W-3).

None of these is a blocker. All of them are the kind of thing that becomes invisible if it is not written down here.

---

_Verified: 2026-09-01T12:15Z_
_Verifier: Claude (gsd-verifier)_
