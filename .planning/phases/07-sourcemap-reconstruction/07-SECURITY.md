---
phase: "07"
slug: "sourcemap-reconstruction"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
threats_total: 155
threats_closed: 155
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
audited_at_commit: 33c9ded
created: "2026-09-04"
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**Verdict: SECURED.** 155 register rows, 155 closed, 0 open at or above the `high` block
threshold. The register was authored at plan time — all 27 `07-NN-PLAN.md` files carry a
parseable `<threat_model>` block — so the audit verified that declared mitigations exist rather
than scanning for new threats.

**Register reconciliation.** 155 rows = 145 phase threats (`T-07-01` … `T-07-130`, some ids
reused across plans) **plus** 10 `T-07-SC` supply-chain rows, one per plan 01–10. Severity
70 high / 60 medium / 25 low; disposition 140 `mitigate` / 15 `accept`. Every accept is low or
medium — none reaches the `high` threshold.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| intercepted HTTP response → sourcemap parser | The adversary controls the map document in full: its size, its nesting, its `sources` labels and its `sourcesContent` bodies. | Attacker-controlled JSON, base64, arbitrary strings |
| `sources` label → any path-shaped API | Labels are path-shaped by nature (`webpack:///./src/app.js`) and may be hostile (`../../etc/passwd`, absolute, UNC, null bytes). | Attacker-controlled path-like strings |
| reconstructed source → the operator's disk | The phase goal's own clause: a malicious map must not cause a write outside its sandbox. | Attacker-controlled file bodies and filenames |
| redacted export mode → raw export mode | `serialiseRows` applies `column.redact` only in the redacted mode; the raw mode is an explicit operator ceremony. | Target URLs, source labels, digests |
| DefMiner → the network | D-01: the tool makes no outbound request. Maps are decoded from inline `data:` URIs already present in the intercepted body. | Nothing — the boundary is closed by construction |
| project A rows → project B rows | Every phase-07 table is keyed by `project_id`; isolation is a schema property, not a query convention. | Per-project evidence rows |
| the planning record → the next round's plan | A GSD planner reads prior PLAN.md and ROADMAP entries as source material; a false claim there reproduces itself. | Narrated history |

---

## Threat Register

Verified by control group. All 70 high-severity rows were verified individually; see
**Verification Depth** below for the honest scope statement on medium/low rows.

| Group | Threat IDs | Severity | Disposition | Mitigation (verified evidence) | Status |
|-------|-----------|----------|-------------|-------------------------------|--------|
| No outbound fetch (D-01) | T-07-15 ×2, T-07-18 | high | mitigate | `grep` for `fetch(`/`XMLHttpRequest`/`axios`/`node:https?`/`https?.request`/`undici`/`net.connect` over backend + engine + frontend non-spec source: **zero hits**. `outbound-prohibition.spec.ts` walks `SOURCE_ROOTS` recursively with four non-vacuity assertions. Both production decode sites return on non-inline (`consumer.ts:1124-1130`, `index.ts:593-594`). `parse.ts:210` returns `EXTERNAL` as a tag. `scripts/phase7/fetch-maps.sh:48-61` pins every URL to an immutable jsDelivr path gated on a committed SHA-256. | closed |
| Sandbox containment (phase goal) | T-07-01 ×3 | high | mitigate | **No filesystem write surface in shipped code at all** — `node:fs`/`node:path`/`writeFile`/`createWriteStream` appear only in comment text (3 hits, all comments). `sources-sink-prohibition.spec.ts` derives `PATH_LIKE_SINKS` from `node:path`'s own exports, matches anywhere in a callee chain, and reports unreadable callees rather than assuming clean. `tree.spec.ts:204,213` pin the normaliser's import sets to exact equality, so `node:path` cannot be added. Egress is browser-mediated only (`export-download.ts:83-95`) with filenames from a closed 10-member extension allowlist. | closed |
| Resource bounds | T-07-02 ×2, T-07-16 ×2, T-07-31, T-07-40, T-07-12 ×2, T-07-55, T-07-89, T-07-103 | high | mitigate | Refusal at **each** gate, not only the first: encoded-length before allocation (`parse.ts:204-208`), decoded bytes (`:225`), rows per map summed across sections (`:379-381`), nested sections fail-closed on presence (`:462-463`), derived depth (`derive.ts:204`), derived size (`:233`), sweep convergence (`thresholds.ts:152` ≥ `:238`), tree render depth and virtualised scroller, ReDoS (AST walk proving zero regex literals in `announce.ts`/`parse.ts`). Every gate **refuses, never truncates**. | closed |
| Export redaction (MAP-07, UI-05) | T-07-47, T-07-96, T-07-97, T-07-100, T-07-105, T-07-106, T-07-108, T-07-117, T-07-118, T-07-122 | high | mitigate | `projectRow` (`export.ts:594-608`) applies `column.redact` in redacted mode and `stripForExport` (C0/C1 + bidi) on **both** branches. Four md5 pins re-measured independently and all match HEAD: `serialiseRows` `b17979f7…`, `redactUrlForExport` `bab965d7…`, `redactSourceLabelForExport` `35a5e79f…`, `isProtocolShapedLabel` `0130e429…`. `export.spec.ts:955-981` pins four shapes byte-identically in both modes. The fragment-only delegated-marker exception is documented at `export.ts:305-320`, not hidden. | closed |
| SQL / schema discipline | T-07-08, T-07-09 ×3, T-07-27, T-07-28, T-07-30, T-07-52, T-07-53, T-07-86, T-07-87, T-07-05 | high | mitigate | No content at rest (`FORBIDDEN_COLUMNS` names `body`; permitted declared types read structurally from `PRAGMA table_info`, with BLOB and untyped as failure fixtures). `project_id` in the PK and `NOT NULL` on every table, leading the `WHERE` in every phase-07 statement, scoped independently in both halves of each retention anti-join. Positional `?` only, values spread. Attribution is fail-closed: `readSightingOrigin` reads `request_id` and the comparison digest **out of the matched row**; a digest mismatch tombstones and re-derives nothing. No FK / no CASCADE (comment-filtered grep exit 0). `deleteDigest` never reaches `sources`. | closed |
| Rendering safety | T-07-07, T-07-12, T-07-13, T-07-44, T-07-46 | high | mitigate | `frontend-safety.spec.ts` walks `packages/frontend/src` recursively (`.ts` + `.vue`) asserting zero R1/R2 violations across six rules including `raw-html-directive`, `dom-html-sink`, `dynamic-code-construction`. `SourceViewer.spec.ts:705-747` pins module-specifier and display-import sets by exact equality and asserts every walking wrapper absent by name. No form control in any phase-07 surface (independently confirmed). | closed |
| Round integrity (comment-only rounds) | T-07-91, T-07-103, T-07-111–114, T-07-120–122, T-07-124–128 | high | mitigate | Working tree clean; `thresholds.ts` md5 `6391d0d5…` matches its pin (no constant moved to fit the words); superseded figures are dated literals so no gate can demand a rewrite of a dated paragraph; `T-07-128` verified precisely — the live division at `:936-937` still reads `T.RETENTION_SWEEP_MAX_ROWS`, the pinned denominator was **not** substituted into it, so the detector can still fire; `07-24-SUMMARY.md:97,100` intact verbatim; cited commits resolve and their subjects match the errata narrative. | closed |
| Supply chain | T-07-SC ×10 | high | mitigate | Three commits in the phase window touched dependency files; all three read. `827aab7`, `ab79ca6`: exports-map entries only, no dependency. `1c41963`: `@jridgewell/sourcemap-codec` pinned at exact `1.5.5` into `packages/frontend/package.json` only, +3 lockfile lines (importer reference; package entry with `sha512-cYQ9310grqx…` already existed) — exactly what plan 03's `T-07-SC` row declares. Root `dependencies` is `{}`. | closed |
| Display sanitisation, error redaction, decode containment, anti-joins, bounds | T-07-06, 36, 38, 42, 63, 93; T-07-10 ×4; T-07-11, 41; T-07-56, 71, 84, 85, 88; T-07-67; T-07-54; T-07-03, 58, 60, 61, 62, 75 | medium / low | mitigate | Verified directly: `sanitise.ts:347-353`; `describeError` (`telemetry.ts:865`) + the `error-redaction.spec.ts` gate; decode-throw containment at `SourcePositionStrip.vue:259-264`; the anti-join group; `sources.ts:249-255`; the v9 DDL. | closed |
| Repudiation / provenance / UI-presentation | T-07-20, 39, 43, 45, 48, 50, 51, 76, 77, 78, 80, 81, 82, 90, 92, 94, 98, 99, 101, 102, 107, 109, 115, 123, 129 | medium / low | mitigate | **Inferred, not individually opened** — rested on the control-group pattern plus the round-5 verifier's independently-run full suite (90 files / 4,322 tests, exit 0). None can block at `block_on: high`. See Verification Depth. | closed (inferred) |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

All 15 accepts are low or medium severity. **None reaches the `high` block threshold**, so none
contributes to `threats_open`. Rationales are drawn from the plan registers — this is the phase's
first accepted-risk log, so nothing is carried forward from a prior one.

| Risk ID | Threat Ref | Sev | Rationale | Accepted By | Date |
|---------|-----------|-----|-----------|-------------|------|
| AR-07-01 | T-07-19 (07-01) | low | Per-run guest bearer minted under `umask 077` / `chmod 600`, deleted at teardown; inherited unchanged, introduces no new secret | six2dez | 2026-09-04 |
| AR-07-02 | T-07-26 (07-03) | medium | `check-bundle-imports.mjs` cannot observe a bundled dependency's *absence* of a specifier; recorded in the D-17 gate's own `why` text | six2dez | 2026-09-04 |
| AR-07-03 | T-07-17 (07-06) | low | A raw manifest is an explicit operator ceremony with a `danger` confirmation and no remember-this-choice; redacted is pre-selected. Ceremony verified present (`ExportDialog.spec.ts:659-686`, `danger` class on exactly one button) | six2dez | 2026-09-04 |
| AR-07-04 | T-07-34 (07-06) | medium | Inherited: 8 MiB is a project budget, not a measured Caido ceiling; `exportInventory` already ships 7.00 MiB under the same assumption | six2dez | 2026-09-04 |
| AR-07-05 | T-07-17 (07-10) | low | Same ceremony at the dialog; the shipped URL redactor governs the label column | six2dez | 2026-09-04 |
| AR-07-06 | T-07-68 (07-11) | low | The body carries a digest the frontend already holds and renders; `project_id` still supplied by the backend, never the caller. Verified at `index.ts:396` | six2dez | 2026-09-04 |
| AR-07-07 | T-07-69 (07-12) | low | The loss class cannot occur after migration `v: 9`; the counter never reached the health projection | six2dez | 2026-09-04 |
| AR-07-08 | T-07-70 (07-13) | medium | D-09 places these rows under NORMAL caps with no exemption; the alternative is the unbounded growth `T-07-55` names | six2dez | 2026-09-04 |
| AR-07-09 | T-07-74 (07-17) | low | At most one directory node per loaded row against `SOURCE_TREE_LOAD_MAX`; the scroller is virtualised | six2dez | 2026-09-04 |
| AR-07-10 | T-07-79 (07-18) | low | `readFileSync` is test-time only and repo-relative; adds no path to anything shipped. D-17's ban is on plugin code | six2dez | 2026-09-04 |
| AR-07-11 | T-07-83 (07-19) | low | Refusal log line is a 12-char digest prefix + integer + fixed reason string, all DefMiner-computed; no target-controlled string enters | six2dez | 2026-09-04 |
| AR-07-12 | T-07-104 (07-23) | low | Corrected comments name shapes and DefMiner constants, never a value from a scanned target | six2dez | 2026-09-04 |
| AR-07-13 | T-07-110 (07-24) | low | One synthetic label (`webpack:///./src/app.js#L5`) that already exists as an `export.spec.ts` fixture | six2dez | 2026-09-04 |
| AR-07-14 | T-07-116 (07-25) | low | As AR-07-10 | six2dez | 2026-09-04 |
| AR-07-15 | T-07-130 (07-27) | low | As AR-07-10 | six2dez | 2026-09-04 |

---

## Verification Depth

Recorded honestly so the audit's reach is auditable rather than implied.

- **All 70 high-severity rows verified individually.** These are the blocking set at `block_on: high`.
- **~30 of the 70 medium/low `mitigate` rows verified directly** — the display-sanitisation, error-redaction, decode-containment, anti-join and bounds groups named in the register table.
- **~40 medium/low rows inferred, not individually opened** — the repudiation-, provenance- and UI-presentation-class rows (`T-07-20, 39, 43, 45, 48, 50, 51, 76, 77, 78, 80, 81, 82, 90, 92, 94, 98, 99, 101, 102, 107, 109, 115, 123, 129`). They rest on the control-group pattern plus the round-5 verifier's independently-run full suite. **None can block at the `high` threshold.** Listed here as *inferred* rather than silently counted as *passing*.
- Gates re-used rather than repeated from `07-VERIFICATION.md`'s `gates_run_by_verifier`: full suite, typecheck, lint, knip, build, both arm-checks, the four-commit axis re-derivation. The auditor's own md5 and grep measurements agree with the verifier's on every overlapping value.
- **Unregistered threat flags: none.** All 27 SUMMARY files declare `## Threat Flags: None`; each was read.

---

## Findings — non-blocking, none changes the verdict

1. **`T-07-91` — the mitigation's evidence sentence over-states what happened.** It claims "a runnable diff check proving the three dynamic consumers were not edited at all"; two of the three *were* edited in the 07-21 series (`tree.spec.ts` +29/−8, `hostile.spec.ts` 2 lines). Both diffs were read: they are **authored expectations**, which is the required form — `CORPUS_NODE_COUNT` 47 → 48 with the new leaf spelled out as a literal outline row, root count held at 21. **No exact set was relaxed to a superset and no exact length to a minimum**; the forbidden move did not happen. Closed, with the evidence sentence noted as inaccurate.
2. **`T-07-09` — the gate is weaker than its own wording.** The mitigation says `project_id` at PRIMARY KEY **ordinal 1**; `schema.spec.ts:757-759` asserts `pk > 0`, not `=== 1`. The DDL does put it first on both tables (`migrations.ts:818`, `:976`), so the property holds today — but a future migration reordering it to ordinal 2 would pass. Worth a one-line follow-up.
3. **Round-gate durability.** Several plan-20/24/26/27 mitigations (`T-07-86`, `T-07-89`, `T-07-100`, `T-07-106`, `T-07-118`, `T-07-122`) are one-shot plan-time verify commands, not shipped tests. All runnable ones were re-run and pass at HEAD. They policed the round they were written for and do not guard against future regression — inherent to the threats' framing, not a defect.
4. **`frontend-safety.spec.ts`'s non-vacuity floor is thin.** `AUDITED_MODULES` names 5 modules while phase 07 added eight frontend surfaces. The `it.each(files)` walk covers them all (recursion confirmed), so `T-07-07` is genuinely closed — but renaming `SourceViewer.vue` out of the tree would shrink the scan silently.
5. **`packages/frontend/src` is outside `SOURCE_ROOTS`.** The outbound-prohibition gate walks backend and engine only. Empirically the frontend has no outbound surface, and `T-07-15`'s mitigation only ever claimed engine coverage — so this is not a register gap. But the frontend's outbound property rests on a grep, not a gate.
6. **WR-03's stale citation is not a security concern.** `thresholds.spec.ts:845` cites `retention.ts:178-180` for a sentence at `:193-194`, landing an auditor ~15 lines off inside the same no-orphan invariant argument that `T-07-84` exists to keep reviewable. It affects no control's behaviour. Accepted knowingly in `07-UAT.md` round 5; established as a round-2 artefact (`d3caf4d`), not a round-4 regression.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-04 | 155 | 155 | 0 | gsd-security-auditor (ASVS L1 presence + L2 boundary-placement on the five load-bearing properties) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-04

**No implementation file was modified during this audit.**
