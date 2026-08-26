---
phase: 01
slug: skeleton-persistence-compatibility
status: blocked
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 6
asvs_level: 1
block_on: high
created: 2026-08-26
mode: State B — no SECURITY.md existed; register rebuilt from the 43 PLAN.md <threat_model> blocks
register_authored_at_plan_time: true
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

**These six are the same defects gap-closure round 11 is already scoped to close** (review findings CR-24 → T-01-289; CR-25 → T-01-286; CR-26 → T-01-280/T-01-264/T-01-239; CR-27 → T-01-263). The security audit and verification pass 11 converged on them independently.

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
4. **`T-01-277` / `T-01-279` closed with a disclosed residual.** `:10353-10362` uses full-line equality (`l === REGISTRY_OPEN`) with an explicit `toBe(1)` uniqueness assertion guarding the `-1 == -1` tautology — CLOSED at ASVS L1. Residual: nothing detects a future author swapping the matcher back to a prefix form. The guard is not itself guarded.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-26 | 294 | 287 | 7 (6 blocking) | gsd-security-auditor (ASVS L1, block_on: high) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [ ] `threats_open: 0` confirmed — **6 blocking open; see Threat Register — Open**
