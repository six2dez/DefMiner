---
phase: 01
slug: skeleton-persistence-compatibility
status: secured
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-08-26
reaudited: 2026-08-27
mode: State B — no SECURITY.md existed; register rebuilt from the 43 PLAN.md <threat_model> blocks
register_authored_at_plan_time: true
reaudit_note: "Round-11 re-audit (2026-08-27) closed 6 of 7 against the live tree. T-01-263, the seventh, was then closed in the bytes by commit `efe93e8`. threats_open: 0. The last closure is ORCHESTRATOR-APPLIED, not independently audited — verification pass 12 is its check."
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**Headline: there is no live exposure.** The outbound prohibition (CORE-11) holds and was
re-established independently during this audit — byte-identical rebuild, one bundle import
specifier, 23/23 shipped modules clean, and the gate's scan target byte-identical to the
installable artifact. All six blocking-open threats are defects in a **test-only** file
(`packages/backend/src/outbound-prohibition.spec.ts`) misdescribing its own reach. That file
never ships: it is absent from the 23-module shipped set and from the bundle.

---

## Register Reconciliation

The register handed to the auditor was incomplete; the auditor re-extracted from the 43
`<threat_model>` blocks rather than accepting it.

| Orchestrator's count | Measured | Note |
|---|---|---|
| 446 rows | **499** (461 numeric + 38 `T-01-SC`) | — |
| 289 distinct IDs | **294** (293 numeric + `T-01-SC`) | 4 letter-suffixed IDs: `115b`, `142b`, `142c`, `151b` |
| — | **`T-01-SC` omitted entirely** | Supply chain, high, declared in 38 of 43 plans. Verified CLOSED. |
| 22 crit / 221 high / 163 med / 40 low | **15 crit / 176 high / 92 med / 10 low** | after canonicalising recurrences at max severity (fail-closed) |

31 IDs recur with conflicting severity or disposition across plans (e.g. `T-01-34` is `accept`
in 01-06 and `mitigate` in 17 later plans; `T-01-244` is medium in 01-38 and critical in 01-40).
Every one resolved to its **highest** severity.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Proxied response → admission | `admit.ts:186` gates on `body.length` only; `getBody()`'s type exposes only `.length`, making `toRaw()` structurally unreachable in the hook | Intercepted HTTP response metadata |
| Admission → durable store | Single `INSERT` at `observations.ts:33`, single caller, `normaliseObservedUrl` inline at `:562` — no bypass path | Redacted URL, hash, timing |
| Target-controlled URL → `observations.url` | Every query-string value replaced before the row is written; parameter names, path, scheme, host retained | Operator browsing evidence |
| Caught exception → persisted/logged string | `describeError` applies `redactPaths(redactUrls(…))` inside `store/`; two bare `String(e)` renders outside that scope are accepted (see `T-01-37`) | Error text, possibly path/URL bearing |
| Backend → frontend RPC | 4 read-only endpoints, all project-scoped, bounded at 500 rows | Observation summaries |
| Plugin → network | **Prohibited this phase (CORE-11).** Bundle import set is one specifier, `crypto` | None |
| Repo → third-party dependencies | All deps exact-pinned; 1 runtime dependency total; `tests/pins.spec.ts` 38 tests | Build-time code |

---

## Threat Register — Open

**NONE.** `threats_open: 0` as of 2026-08-27.

The seventh and last, `T-01-263`, was closed in the bytes by commit `efe93e8` after the
re-audit below isolated it. **That closure is ORCHESTRATOR-APPLIED and has NOT been
independently audited** — it is recorded here as what was done and measured, and
verification pass 12 is its check, not this document.

### T-01-263 — closed 2026-08-27, commit `efe93e8`

Four sites used the word `enclosing` to describe what the backward scan TARGETS, which is
exactly the containment `:9395` disowns ("would claim a containment this scan does not
compute; what it computes is proximity under those five recognisers"). All four now read
"the next construct ABOVE" — the file's own non-containment vocabulary, already in use at
`:9238`.

| Site | Was | Now |
|---|---|---|
| `:9242` | "CONTINUE the backward scan to the next enclosing construct" | "…to the next construct ABOVE" |
| `:9409` | "so the next enclosing construct is tried" | "so the next construct ABOVE is tried" |
| `:9463` | "which resolves the NEXT enclosing construct" | "so the NEXT construct ABOVE is taken" |
| `:10761` | "continuing the backward scan to the next enclosing construct" | "…to the next construct ABOVE" |

`:9463` was the sharpest and the threat row did not name it: a **resolution** claim, not a
scan-continuation description, sitting inside `constructAnchorFor`'s own body 68 lines below
the disowning statement. `:10761` is a failure-message string; `grep` confirmed nothing
asserts on its text.

NOT edited, with the reason stated rather than left to inference: `:9380` ("NOT THE SAME AS
THE FINEST ENCLOSING CONSTRUCT") is a negation drawing the same distinction and is correct as
written; `:9395` is the disowning statement itself; `:11129` ("when its enclosing construct
changed") describes the construct a sentence SITS IN during a relocation scenario, not what
the anchor resolves — a different shape, disclosed rather than edited. Case-insensitive
`enclos` population 7 → 3.

**The edit is comment-only and the line count is unchanged, 11503 before and after.** That is
load-bearing, not incidental: this file's pins are computed over its own bytes, so an inserted
or deleted line moves anchors, exclusion endpoints and the 574-line shadow. Re-measured after:
`pnpm test` 31 files / **1390 passed**; the gate spec alone **442/442** — both identical to the
pre-edit baseline; `tsc --build` exit 0; `eslint .` exit 0; `pnpm check:bundle` one import
specifier, `crypto`.

Plan 01-44 had re-adjudicated `:9242` and `:9409` as acceptable but recorded that disposition
only in `01-44-SUMMARY.md`, never in the gate's bytes — so a reader of the file met the
disowned word with no adjudication beside it. This closes the contradiction in the bytes.

---

<details>
<summary>Historical — T-01-263 as it stood at the 2026-08-27 re-audit, before commit `efe93e8` (kept verbatim)</summary>

**T-01-263 — what round 11 closed and what it did not.** Plan 01-44 DID delete the three
shipped failure messages CR-27 named, and deleted the overclaiming retirement bracket whole
rather than merely recounting it — confirmed in `git show 52b9906`. What survives, measured
on the live tree 2026-08-27:

| Site | Reads | Why it is still a defect |
|---|---|---|
| `:9395` | the word `enclosing` "would claim a containment this scan does not compute" | the disowning statement — correct, and the baseline the others contradict |
| `:9409` | "so the next enclosing construct is tried" | **13 lines below the disowning statement, in the SAME docblock** |
| `:9242` | "made that case CONTINUE the backward scan to the next enclosing construct" | named by the threat row; survives verbatim |
| `:9463` | "resumes the backward scan one line higher, **which resolves the NEXT enclosing construct**" | **worse than any site the row names, and unnamed by it** — a resolution claim, not a scan-continuation description, inside `constructAnchorFor`'s own body |

Case-insensitive `enclos` population is 7 (`9242, 9380, 9395, 9409, 9463, 10761, 11129`),
matching plan 01-44's own count. Plan 01-44 re-adjudicated `:9242` and `:9409` as "not
asserting that a resolved anchor computes containment" and recorded that disposition **only
in `01-44-SUMMARY.md`, nowhere in the gate's bytes** — so a reader of the file meets the
disowned word with no adjudication beside it. Mitigation absent at 2 of the 4 cited
locations, plus one worse uncited one.

</details>

---

## Round-11 Closure — re-audit 2026-08-27

Six threats verified CLOSED against the live tree by `gsd-security-auditor` (ASVS L1,
`block_on: high`). The auditor measured rather than reading the round-11 summaries, planted
mutations to watch gates go red, and restored the tree byte-for-byte — `git diff --exit-code
-- packages/` returns 0 and the gate file's md5 is `04c450e0b6d3dee6ad3223232ca04951`,
identical to its pre-session backup. Both facts re-verified by the orchestrator before this
write.

| Threat | Verdict | Evidence |
|---|---|---|
| T-01-289 | **CLOSED** | The dated present-tense locator is deleted (`git show 52b9906`). Live greps: `"299 and 361"`=0, `"Located by text TODAY"`=0, `\b299\b`=0, `\b361\b`=0. The site now sits at `:10770-10781`, past-tense, resting on `01-39-SUMMARY.md:531`/`:931` — both read on disk, both say what is claimed. |
| T-01-283 | **CLOSED** | Second site of the same locator deleted in the same commit. The case at `:11208-11256` now executes only over the synthetic 6-element `twice` array at `:11228-11230` and asserts nothing about live file lines — the reach it states is the reach it executes. |
| T-01-264 | **CLOSED** | The `:417` shadow is pinned by IDENTITY, not only maximum: `WIDEST_ANCHOR_TOKEN` at `:10220-10221`, asserted at `:10271-10274`; `sed -n '417p'` confirms line 417 is that header. The auditor closed the token-merge bypass itself — planting a second producer of the identical header at line 8002 turned `every anchor IN USE is produced by exactly ONE line` RED, naming `produced by 2 line(s): 417, 8002`. |
| T-01-280 | **CLOSED** | Pass 11's exact geometry replanted against the live tree (291 filler lines holding the maximum at 574 on a different owner, plus a 2-line collapse of the named shadow): `Tests 1 failed \| 441 passed (442)`, failing at the IDENTITY assertion with `EXPECTED OWNER "SPELLING (operator, by POSITION)…" BUT FOUND "…CORE-11's wi…"`. The SIZE assertion four lines earlier PASSED in that same run — 574 held while the named shadow collapsed, and the identity pin caught it. That is exactly the scenario the threat row said would stay green. |
| T-01-239 | **CLOSED** | "A pin nobody watched failing" — watched failing, in the run above, independently of 01-45's account. Pass 11 recorded this identical mutation at `441 passed (441)` fully silent; on the live tree it is `1 failed \| 441 passed (442)` with a diagnostic naming the mechanism. |
| T-01-286 | **CLOSED** (medium, was non-blocking) | `grow to 573` deleted; reach statement (2) at `:10190` is now the bare `IT DOES NOT BOUND A NON-MAXIMAL SHADOW.` `grep -no "573"` returns exactly one hit, line 10217, and it is the `1573` inside `raw 419..1574`. The bound is published once, at `:9109`. |

**Live-exposure position, re-established rather than inherited:** `pnpm test` → 31 files /
1390 passed; gate spec alone → 442/442; `pnpm check:bundle` → one import specifier, `crypto`.
The must-NOT holds. The one open threat is a defect in a **test-only** file's description of
itself, not an exposure.

---

<details>
<summary>Historical — the seven-row Open register as audited 2026-08-26 (superseded, kept verbatim)</summary>

Six blocking, one non-blocking. All are `Repudiation`, all in `outbound-prohibition.spec.ts`.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-289 | Repudiation | a present-tense claim of two identical table headers | high | mitigate | `:11227` asserts `:299` and `:361` are identically headed. They are not — `:299` reads `SPELLING (rebind, receiver-key position)`, `:361` reads `SPELLING (??=, receiver-key position)` | open |
| T-01-283 | Repudiation | a case stating a reach it did not execute | high | mitigate | Same false locator claim as T-01-289 | open |
| T-01-264 | Repudiation | the `:417` anchor's 574-line shadow | high | mitigate | Published at `:9097`, `:9390`, `:10162`, `:10198`, `:10624` and inside a failure message at `:10651`. **Nothing pins it.** | open |
| T-01-280 | Repudiation | a pin asserting the maximum, not the identity | high | mitigate | `WIDEST_ANCHOR_SHADOW = 574` at `:10204` asserts `widestSize` (max over all anchors); `widest` (the identity) appears only in the failure message. The file admits this at `:9396-9398`: "WHICH PINS THE MAXIMUM ONLY". A second anchor reaching 574 keeps it green while the named shadow collapses | open |
| T-01-239 | Repudiation | a pin nobody watched failing | high | mitigate | Not enforced for the shadow the file names | open |
| T-01-263 | Repudiation | `enclosing`-construct claims the docblock disowns | high | mitigate | `:9396-9398` disowns the word ("would claim a containment this scan does not compute"), yet `:9242`, `:9411`, `:10999`, `:11136` still assert enclosing-construct resolution — and `:10999`/`:11136` sit inside shipped failure messages a reader sees while the suite is red | open |
| T-01-286 | Repudiation | one bound published at two values | medium | mitigate | `:10174` says a non-maximal shadow may grow to **573**; `:9110` says up to the maximum (**574**) — 1,065 lines apart | open — below `high` threshold (non-blocking) |

**The six blocking threats are the same defects gap-closure round 11 is scoped to close.** Re-derived from the `high` + `open` rows of the table above, not from memory:

| Threat | Severity | Review finding | Round-11 owner |
|---|---|---|---|
| `T-01-289` | high | CR-24 (site 1) | 01-44 Task 2 (deletion) |
| `T-01-283` | high | CR-24 (site 2) | 01-44 Task 2 (deletion) |
| `T-01-263` | high | CR-27 | 01-44 Task 2 (deletion) |
| `T-01-280` | high | CR-26 | 01-45 Task 1 |
| `T-01-264` | high | CR-26 | 01-45 Task 1 |
| `T-01-239` | high | CR-26 | 01-45 Task 1 |

`T-01-286` (medium, **non-blocking**) is also closed by round 11 — CR-25's deletion — but it is **not** one of the six and does not count toward `threats_open`.

**CORRECTION 2026-08-26:** an earlier revision of this line named `T-01-286` among the six and omitted `T-01-283`. Six names, the wrong six. Caught by the plan-checker after the error had already propagated into `01-44-PLAN.md` and `01-45-PLAN.md`, which cited this list rather than re-deriving it. Recorded rather than silently corrected: a stated completeness exceeding an executed one is the exact defect class round 11 exists to close, and this document authored an instance of it.

The security audit and verification pass 11 converged on these six independently.

</details>

---

## Threat Register — Closed (287)

Verified by class; representative evidence per class.

| Class | IDs covered | Evidence |
|---|---|---|
| Outbound prohibition (CORE-11) | ~20 incl. `T-01-09`, `T-01-51` | Bundle import set = `crypto` only; 23/23 modules, 0 violations; `sdk.requests` appears 4× in the bundle, all `.get`/`.inScope`, never `.send`; no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `eval`, `new Function` or dynamic import |
| Admission / DoS bounds | ~85 incl. `T-01-01` (critical), `T-01-07`, `T-01-14` | `admit.ts:186` gates on `body.length`; `getBody()` exposes only `.length`; `toRaw()` appears solely at `consumer.ts:189`, post-admission |
| SQL binding + cross-project isolation | `T-01-03`, `T-01-20` | `sql-discipline.spec.ts` walks the whole backend, 29 tests; rejects `:`/`@`/`$` params, interpolation, unscoped multi-row statements; "project_id in the SELECT LIST is not scoping" case blocks a weak matcher |
| URL redaction (STORE-03) | `T-01-31`…`T-01-33`, `T-01-82` | Single `INSERT` at `observations.ts:33`, single caller, `normaliseObservedUrl` inline at `:562` — no bypass path. **Independently swept by the auditor: 20,000 inputs, 0 non-idempotent, 0 over `URL_MAX`, 19/20 adversarial secrets destroyed** |
| Schema / column allowlist | `T-01-21` | `schema.spec.ts:453` `FORBIDDEN_COLUMNS` bans body/headers/cookie; non-vacuity guard present |
| Supply chain | `T-01-SC` (38 rows) | Exact pins; `tests/pins.spec.ts` 38 tests; 1 runtime dependency |
| Pre-policy `observations.url` rows | `T-01-36` | `checkpoint:decision` resolved **`leave`** against a **measured 0** — closed by construction. Dated in `STATE.md:289` and `:407` with the count, backed by committed `results/observation-url-exposure.json` |
| Bundle integrity | — | `pnpm build:backend` reproduces byte-identically (`2a3546ed…`); `packages/backend/dist/index.js` byte-identical to `packages/dist/plugin_package/defminer-backend/index.js` — the gate's target *is* the installable artifact |
| Threshold determinism | — | `gen-thresholds.mjs` re-run, byte-identical output |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-37 | `compat.ts:317` and `hooks/passive.ts:171` render bare `String(e)` outside the gate's `store/` scope; `compat.ts:317` reaches the `getCompat` RPC unredacted, skipping `describeError`'s `redactPaths(redactUrls(…))`. Owned by Phase 2 (ERR-03/ERR-04). Auditor rediscovered both independently before reading the row. | Operator (plan-time disposition, re-confirmed at audit) | 2026-08-26 |
| AR-02 | STORE-01 residual | `observations.url` can retain a path-embedded token and a retained parameter name. The auditor's 20,000-input sweep destroyed every adversarial secret except `https://h/SECRETINPATH/x` — precisely this recorded residual. Kept by policy. | Operator (UAT, 2026-08-21) | 2026-08-26 |
| AR-03 | T-01-76 | `accept` by design; carried in `01-21-SUMMARY.md`'s OPEN ITEM section. | Operator (plan-time disposition) | 2026-08-26 |

---

## Warnings (non-blocking)

1. **28 of 43 summaries carry no `## Threat Flags` section** (01-01…01-06, 01-09, 01-13, 01-18/19, 01-22…01-27, 01-31, 01-33…01-43). The auditor verified independently that no undeclared surface exists: no fs/process reach, no new imports, 4 read-only project-scoped RPCs, schema frozen by allowlist.
2. **Out-of-repo `sqlite3` reads by no committed code.** `results/observation-url-exposure.json` records read-only opens of the operator's live Caido data directory, including 6 third-party plugin databases. Method sound — `COUNT(*)` only, values never read, nothing started or stopped, mtimes preserved — and only schema table names, never row values, reached the committed artifact.
3. **`packages/frontend/src/**` does not exist.** No frontend attack surface in this phase.
5. **`:10770-10772` carries an unregistered CR-24-class sentence** (found at the 2026-08-27
   re-audit). It states `it.each([` was produced by TEN lines and the receiver-key table header
   by THREE. Measured today: `it.each([` occurs on NINE lines (7011, 7239, 8405, 8466, 8499,
   8604, 8613, 8649, 8907), and the three `receiver-key position` headers at `:283`/`:299`/`:361`
   are pairwise DISTINCT (`const` / `rebind` / `??=`), so no receiver-key header has three
   producers. The sentence is past-tense and true of the pre-wave-39 file, but it is CR-24's
   class and it survived the deletion round unregistered.
6. **The size pin's failure message overreaches.** `:10269` reads "the equality is exact so that
   a shadow which shrank is visible too", while `:10190` and `:10276-10277` state that every
   NON-maximal shadow is unwatched in both directions. True of the named shadow now that the
   identity pin exists; false as the general claim a reader meets while the suite is red.
7. **Neither 01-44 nor 01-45 carries a `## Threat Flags` section** (`grep -c` = 0 for both);
   both carry `## Security Position` instead. No new attack surface: the only post-`dca732c`
   edit to the gate file, commit `2efd48f`, merely retargets a false-positive fixture from
   `telemetry.ts` to `ingest/consumer.ts`.
8. **T-01-264's census guard is scoped to anchors IN USE.** It reaches only anchors used in
   `HEADER_QUANTIFIER_EXEMPTIONS`; a commit deleting all four exemptions anchored to `:417` in
   the same breath would remove that guard from the named shadow.
4. **`T-01-277` / `T-01-279` closed with a disclosed residual.** `:10353-10362` uses full-line equality (`l === REGISTRY_OPEN`) with an explicit `toBe(1)` uniqueness assertion guarding the `-1 == -1` tautology — CLOSED at ASVS L1. Residual: nothing detects a future author swapping the matcher back to a prefix form. The guard is not itself guarded.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-26 | 294 | 287 | 7 (6 blocking) | gsd-security-auditor (ASVS L1, block_on: high) |
| 2026-08-27 | 294 | 293 | 1 (1 blocking) | gsd-security-auditor re-audit after plans 01-44/01-45 (ASVS L1, block_on: high) |
| 2026-08-27 | 294 | 294 | 0 | orchestrator — T-01-263 closed in the bytes (`efe93e8`); NOT independently audited, pass 12 is its check |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed — **no blocking threats remain.** The final closure is orchestrator-applied; verification pass 12 owns confirming it, and owns CORE-11's checkbox.
