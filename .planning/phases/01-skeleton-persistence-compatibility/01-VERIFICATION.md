---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-21T13:45:00Z
status: gaps_found
score: 7/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 9/9
  previous_verified: 2026-08-21T08:18:25Z
  gaps_closed:
    - "STORE-01 scope resolved — re-scoped to the four tables Phase 1 owns; STORE-08 opened for entities/evidence/audit with Phase 4/5 owners in the ROADMAP traceability table"
    - "The 11 unclassified edge-probe rows confirmed still-acceptable at UAT"
    - "IN-01 … IN-07 accepted as informational at UAT"
    - "The three judgment-tier prohibitions (CORE-01, STORE-01, CORE-10) reviewed and accepted at UAT, with CORE-01 enforcement scheduled"
  gaps_remaining:
    - "UAT gap 1 (observations.url verbatim persistence) — PARTIALLY closed: name=value redaction lands and is live-proven; a bare query segment under 64 chars still persists verbatim"
    - "UAT gap 2 (CORE-01 has no wired enforcement) — PARTIALLY closed: the AST gate exists and is mutation-proven, but misses four call forms, the globalThis idiom, and the whole engine package"
  regressions: []
gaps:
  - truth: "`observations.url` does not persist query-string values verbatim; the path and parameter names are retained, the values are redacted or hashed before the row is written"
    status: partial
    reason: "The `name=value` half is genuinely closed and proven end to end against the real database file, with a committed mutation run showing the assertion goes red. But a query segment with NO `=` is classified as a NAME and retained verbatim up to `QUERY_NAME_MAX = 64`. Independently executed through `normaliseObservedUrl`: `?token=ghp_AAAA…` -> `?token=<redacted>` (correct), `?ghp_AAAA…` -> `?ghp_AAAA…` (survives byte-for-byte), `?eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdef` -> unchanged. A GitHub PAT is 40 chars, an AWS access key id is 20, a Stripe secret ~32, a session id 26-32, a UUID 36 — every common credential format is under the bound and is written whole into a column `db.ts` documents as never garbage-collected, surviving project deletion and force-reinstall. The residual IS disclosed in the source (T-01-31), so it is named rather than hidden — but no executed case can fail on it, and `schema.spec.ts:39-46` was rewritten in the same batch to assert the containing claim is 'NOW TRUE'. That is the one combination a phase about honest gates cannot ship: an unfalsifiable residual underneath an upgraded claim."
    severity: major
    artifacts:
      - path: "packages/backend/src/store/observations.ts"
        issue: "redactQueryValues:96-101 — the `eq === -1` branch pushes `segment.slice(0, QUERY_NAME_MAX)`, retaining a bare credential verbatim"
      - path: "packages/backend/src/store/observations.spec.ts"
        issue: "lines 128-140 are the ONLY case for the bound and use a name of QUERY_NAME_MAX + 40 — the one length at which truncation is visible. No case uses a bare segment SHORTER than the bound, so no test in the file can fail on the residual"
      - path: "packages/backend/src/store/schema.spec.ts"
        issue: "lines 39-46 assert 'Nothing below can hold a response body, a cookie or an authorization token' and that 'THAT CLAIM WAS FALSE UNTIL 2026-08-21 AND IS NOW TRUE'. A 40-character PAT in observations.url is an authorization token in that column"
      - path: "scripts/phase1/tracer-e2e.sh"
        issue: "FIXTURE_URL:131 uses `$SECRET_PARAM=$SECRET_VALUE` only — the live proof never exercises a bare segment"
    missing:
      - "Redact a bare (`=`-less) segment as a value with no name, per 01-REVIEW.md CR-06's fix — or bring QUERY_NAME_MAX down to a length no credential fits in (<=16)"
      - "A case in observations.spec.ts using a 40-character bare token that asserts it does not survive, and that goes red when the branch is reverted"
      - "Extend redaction to the two sibling grammars 01-REVIEW.md WR-11 names and I independently reproduced: userinfo (`https://user:pass@cdn.test/a.js` survives verbatim) and `;`-delimited parameters"
      - "Either back the schema.spec.ts claim with an executed case or downgrade its wording until one exists"
  - truth: "No code that ships in the plugin can introduce outbound traffic — a call to sdk.requests.send, sdk.net.*, a global fetch, or an import of caido:http fails a gate"
    status: partial
    reason: "The gate is real: `outbound-prohibition.spec.ts` runs under `pnpm test`, walks 14 backend modules with a by-name non-vacuity assertion and a descended-into-subdirectories assertion, executes every rule's failure path against inline fixtures, and stays quiet on `telemetry.ts`'s prose mention of `caido:http` — I planted `sdk.requests.send(req)` into the real `hooks/passive.ts` and the gate went red naming the file, the surface and the reason, then restored it. But the plan's own must_have truth is 'a call to sdk.requests.send ANYWHERE in a non-spec module fails a gate', and I executed four forms that do not: `let r; r = sdk.requests; r.send()`, `const { requests } = sdk; requests.send()`, `sdk.requests[m](q)`, and `sdk.requests.send.call/.apply(...)` — plus `sdk.requests.sendRaw()` on a positively identified requests receiver. `globalThis.fetch(url)` and `window.fetch(url)` are missed, and that is the sharp one: `telemetry.ts:289` already uses `(globalThis as {...}).performance` — the codebase's own idiom for reaching a global is the one form the gate cannot see. Separately, `packages/engine/src` ships in the bundle and is imported by index.ts / consumer.ts / lifecycle.ts, and NO gate walks it for outbound surfaces — `boundary.spec.ts` checks imports only (no Caido, no backend), so a `fetch(` added to `pipeline.ts`, the 'no speculative retrieval' module, passes every gate in the repo. The gate's header discloses 'an alias rebound in an INNER SCOPE' as its boundary; none of the missed shapes is an inner-scope rebind, so a reader who trusts the header is misled about the reach."
    severity: major
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "receiverAliases is populated only from a VariableDeclaration initializer, so assignment aliases and `const { requests } = sdk` are invisible; calleeParts returns undefined for a computed key and the gate treats 'could not read' as 'clean'; outbound-fetch matches only a bare-identifier callee; outbound-send matches only the method name `send`"
      - path: "packages/engine/src"
        issue: "Ships in the bundle, imported by production backend modules, walked by no outbound gate at all — including pipeline.ts"
      - path: "packages/backend/src/store/error-redaction.spec.ts"
        issue: "STORE-07's sibling gate bottoms out in a bare-identifier check. Independently executed: `e.message`, `String(e as Error)`, `e.toString()`, `JSON.stringify(e)` and `const x = e; String(x)` all report clean. Because TypeScript types a catch binding as `unknown`, `String(e as Error)` and `(e as Error).message` are the forms the compiler pushes an author toward, and the gate is blind to both. (It does correctly resolve a non-listed binding name — `catch(ex){ String(ex) }` IS caught.)"
    missing:
      - "Populate receiverAliases from a binding pattern (`const { requests, net } = sdk`) and from assignment expressions"
      - "Once a receiver is positively identified as `requests`, flag any method not on a read-only allowlist (get/query/inScope), the posture outbound-net already takes"
      - "Match a member-access callee named `fetch` on `globalThis`/`window`/`self`, and flag `.call`/`.apply`/`Reflect.apply` on a requests/net member expression"
      - "Flag, or at minimum REPORT as unanalysable, a computed member access on an identified outbound receiver and a non-literal dynamic import specifier (WR-14)"
      - "Extend the walk to packages/engine/src, or add a sibling gate there, with its own by-name non-vacuity assertion"
      - "Extend error-redaction.spec.ts past bare-identifier reach — at minimum a property access, a cast, and a copy of the caught binding (CR-05)"
      - "Rewrite the gate header's boundary 2 to state what the walk actually resolves"
deferred: []
prohibitions:
  - requirement_id: CORE-01
    statement: "MUST NOT issue any outbound network request to a target or to a third party in this phase — no caido:http fetch, no sdk.requests.send, no sdk.net.connect, no global fetch, no speculative retrieval of any kind."
    verification: gate
    declared_status: resolved
    status: unverified
    flagged: true
    evidence: "The must-NOT itself DID NOT happen: no outbound call exists in any non-spec source under packages/backend/src or packages/engine/src (independently scanned), and `node scripts/ci/check-bundle-imports.mjs` reports the shipped bundle's entire import set as one specifier, `crypto`. The plan declares this prohibition `status: resolved, verification: gate`. Fail-closed: the wired enforcement does not cover what the statement claims — four sdk.requests.send call forms, globalThis/window fetch, and the entire engine package are outside its reach. Enforcement is PARTIAL, so the disposition is unverified-and-flagged, never a silent pass."
  - requirement_id: STORE-03
    statement: "MUST NOT persist a query-string VALUE from a target-controlled URL into observations.url. Parameter names, path, scheme and host are retained; every value is replaced before the row is written."
    verification: gate
    declared_status: resolved
    status: unverified
    flagged: true
    evidence: "Proven for `name=value`: run 20260821T102525Z-17213 shows `SELECT url FROM observations` read with sqlite3 from OUTSIDE Caido returning `…?v=<redacted>&access_token=<redacted>`, and the committed mutation run 20260821T102509Z-4998 shows the assertion firing when redactQueryValues is removed. NOT proven for a bare `=`-less segment, which is also a query-string value from a target-controlled URL and which survives verbatim under 64 chars. Enforcement is partial; declared resolved."
  - requirement_id: STORE-07
    statement: "MUST NOT render a caught exception into a persisted or logged string without passing it through describeError first."
    verification: gate
    declared_status: resolved
    status: unverified
    flagged: true
    evidence: "Zero violations across the store layer and no residual `String(e)` anywhere under packages/backend/src/store (independently grepped). The gate covers four rules including the non-catch `unredacted-persisted-error` rule that reaches `analyses.ts:194`. But it sees only a BARE IDENTIFIER reference to the binding: e.message, String(e as Error), e.toString(), JSON.stringify(e) and a copy all report clean. Enforcement is partial; declared resolved."
  - requirement_id: CORE-10
    statement: "MUST NOT present partial passive coverage as complete."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Carried forward unchanged from the 2026-08-21T08:18 verification and accepted by the operator at UAT test 3. Counter identifiers remain honest (proxiedResponsesObserved, not a target-completeness noun). Judgment-tier, autonomous run: NON-AUTHORITATIVE LLM-judge verdict, human review recommended."
  - requirement_id: STORE-01
    statement: "MUST NOT retain operator browsing evidence beyond what the analysis needs — no body bytes, headers, cookies, or column capable of holding a secret."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "The column-shape half is gated (schema.spec.ts enforces a PRAGMA-read column allowlist plus a forbidden-name check). The 'capable of holding a secret' half is now in DIRECT tension with gap 1 above rather than merely deferred: observations.url can hold a 40-character PAT, and schema.spec.ts asserts it cannot."
---

# Phase 1: Skeleton, Persistence & Compatibility — Verification Report

**Phase Goal:** A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Verified:** 2026-08-21T13:45:00Z
**Status:** gaps_found
**Re-verification:** Yes — after the `--gaps-only` run executing plans 01-07, 01-08 and 01-09

## Goal Achievement

**The phase GOAL is achieved. The two UAT gaps are not fully closed.**

Those are separate findings and collapsing them would misreport the phase. All seven ROADMAP Success Criteria hold against the codebase — I re-confirmed each, and none regressed under the gap-closure work. What did not land is the *enforcement* the gap-closure plans were written to add. Both gaps are **partially** closed: each shipped a real, wired, mutation-proven mechanism, and each mechanism has holes wide enough that the truth it claims to guarantee is not guaranteed.

That distinction matters more here than in most phases, because this phase's entire subject is gates that can fail honestly. A gate that passes because it cannot see the violation is the failure mode this phase exists to prevent, and it is the failure mode both new gates exhibit.

The project's own code review reached the same conclusion first: **CR-02 … CR-06 are five BLOCKER-severity findings, all against plans 01-07/08/09, and all are listed `open` in `01-REVIEW.md`'s resolution block** (`fixed_at: 08:05` predates the gap-closure review pass at `11:21`). I did not take the review's word for any of them — I re-executed each and they hold.

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `onInterceptResponse` is non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `passive.ts:120` is `export function onResponse(...)`, not async. Unchanged since the prior verification's independent probe (returns `undefined`, no `.then`); regression-checked. |
| 2 | Work queue is bounded, overflow count visible, can never grow without limit | ✓ VERIFIED | `queue.ts` exposes `overflowCount` as a getter that a take does not reset; `index.ts:130` surfaces `queueOverflowCount` on `getStatus()`. Prior verification probed cap=500 / 501st offer / FIFO drop independently; regression-checked. |
| 3 | 200-chunk SPA leaves UI and RPC responsive, max sync slice recorded and under the Phase 0 threshold | ✓ VERIFIED | `results/spa-load.json` holds `max_slice_ms: 0.029000043869018555` against a 25 ms budget, gated by `tests/phase1-load.spec.ts`, which still pins `EXPECTED_CAIDO_VERSION = "0.57.1"` (line 34). The `P1_EXPECT_VERSION` move to 0.58.0 is a harness default only — see the note below. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | Unchanged. Live restart in `spa-load.json` (`identical: true`, `plugin_reattached: true`, 200/200/200 rows); dedup proven on a real instance in `results/runs/20260821T075936Z-12874/`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; a non-UTF-8 fixture round-trips without corruption | ✓ VERIFIED | `consumer.ts:189` `body.toRaw()`; the `toText()` AST gate in `admit.spec.ts` passes and is itself fixture-proven. Digests host-reproduced in the prior verification. |
| 6 | A CI gate fails the build if the backend bundle imports any specifier outside the Phase 0 allowlist | ✓ VERIFIED | **Re-executed:** `node scripts/ci/check-bundle-imports.mjs` -> `packages/backend/dist/index.js: 1 import specifier(s): crypto`, exit 0. Fail paths were executed against seven planted specifiers in the prior verification. CR-04 concerns the CORE-01 *source* gate, not this one. |
| 7 | A Caido build below the declared minimum produces a clear message, not an obscure failure | ✓ VERIFIED | `MIN_CAIDO = "0.57.1"` unchanged in `compat.ts:43`; three distinct refusal messages at `:352/:363/:372` naming both versions. Proven on the real 0.55.3 binary in `compat-smoke.json` leg C. |
| 8 | **[UAT gap 1]** `observations.url` does not persist query-string values verbatim | ✗ FAILED (partial) | `name=value` closed and live-proven. Bare `=`-less segments under 64 chars survive byte-for-byte — I executed this. See gaps. |
| 9 | **[UAT gap 2]** No shipped code can introduce outbound traffic without failing a gate | ✗ FAILED (partial) | Gate real and mutation-proven; misses four call forms, the `globalThis` idiom, and the whole engine package. See gaps. |

**Score:** 7/9 truths verified (0 present, behavior-unverified)

### What the gap-closure work genuinely delivered

Adversarial verification is not one-sided, and three things here are stronger than the SUMMARYs claimed rather than weaker:

| Deliverable | Status | Evidence I executed or re-derived |
|---|---|---|
| Live end-to-end redaction proof | ✓ REAL, and better than a spec assertion | `results/runs/README-01-07.md` documents three runs against live Caido 0.58.0. The middle one is a **committed mutation run**: `redactQueryValues` removed, 8 assertions fired including the raw-column one. The final run's `observations-url-raw.txt`, read by `sqlite3` from OUTSIDE Caido, contains `…?v=<redacted>&access_token=<redacted>`. The distinction between a read-path redaction and a write-path one is exactly the one that matters, and the artifact settles it against the file. |
| CORE-01 gate mutation-proof on the real tree | ✓ REAL — I performed it myself | I appended `sdk.requests.send(req)` to the real `packages/backend/src/hooks/passive.ts`, ran the gate, and it failed naming the file, the surface and the full consequence text; `git checkout` restored it and the tree is clean. |
| Pre-policy exposure measurement | ✓ REAL, and unusually honest | `results/observation-url-exposure.json` reports a **measured** zero and says so in as many words — "a MEASURED zero taken against a database that was found and read, not a zero produced by finding no database — those are different facts and only the first one is a clean bill of health". 8 plugin databases scanned, 1 DefMiner, counts only, no URL value recorded anywhere. The operator's `leave` disposition is recorded against a count. |
| Store-layer error redaction | ✓ WIRED | Zero residual `String(e)`/template/concat of a caught binding anywhere under `packages/backend/src/store/` (independently grepped). `describeError` redacts scheme-prefixed URLs BEFORE truncating. The gate's `unredacted-persisted-error` rule genuinely reaches the non-catch parameter at `analyses.ts:194`, which is the one line that writes the `analyses.error` column. |
| Plan/code policy agreement | ✓ DONE | `01-01-PLAN.md` truth #2 is amended in place, and says plainly that the POLICY changed rather than that the implementation was wrong. |
| COVERAGE.md prose -> gate | ✓ DONE | Rows 9, 27 and 38 each now name `outbound-prohibition.spec.ts` and the specific rule. |

### Independently executed gate-reach probes

I imported `auditSource` from both new gates and probed them directly. Controls first, so a `MISSED` cannot be read as the probe being broken.

**CORE-01 gate — `outbound-prohibition.spec.ts`**

| Shape | Result |
|---|---|
| `sdk.requests.send(q)` | ✓ CAUGHT (control) |
| `const r = sdk.requests; r.send(q)` | ✓ CAUGHT (control) |
| `const { send } = sdk.requests; send(q)` | ✓ CAUGHT (control) |
| `fetch(u)` bare | ✓ CAUGHT (control) |
| `import ... from "caido:http"` | ✓ CAUGHT (control) |
| `sdk.net.connect(h,p)` | ✓ CAUGHT (control) |
| `this.sdk.requests.send(q)` | ✓ CAUGHT |
| `sdk.requests.send?.(q)` | ✓ CAUGHT |
| `globalThis.fetch(u)` | ✗ MISSED |
| `(globalThis as any).fetch(u)` | ✗ MISSED |
| `window.fetch(u)` | ✗ MISSED |
| `const { requests } = sdk; requests.send(q)` | ✗ MISSED |
| `let r; r = sdk.requests; r.send(q)` | ✗ MISSED |
| `sdk.requests.send.call(...)` / `.apply(...)` | ✗ MISSED |
| `Reflect.apply(sdk.requests.send, ...)` | ✗ MISSED |
| `const s = sdk.requests.send; s(q)` | ✗ MISSED |
| `const m = "send"; sdk.requests[m](q)` | ✗ MISSED |
| `const r = "requests"; sdk[r].send(q)` | ✗ MISSED |
| `sdk.requests.sendRaw(q)` | ✗ MISSED |
| `await import("caido:" + "http")` | ✗ MISSED |
| `new XMLHttpRequest()` … `.send()` | ✗ MISSED |
| `new WebSocket("wss://…")` | ✗ MISSED |

**Correction to the orchestrator's brief, in the reviewer's favour.** The brief states that `01-REVIEW.md` CR-03 "wrongly lists `const r = sdk.requests; r.send()` as a miss — the reviewer over-stated it". CR-03 does not list that shape. Its executed table lists `assignment alias // let r; r = sdk.requests; await r.send(req)` — a *reassignment*, not a `const` initializer. I ran both: the `const` form is CAUGHT, the assignment form is MISSED, exactly as CR-03 reports. **CR-03's table is accurate as written and needs no correction.** The distinction is load-bearing, because `receiverAliases` is populated only from a `VariableDeclaration` initializer.

**STORE-07 gate — `error-redaction.spec.ts`**

| Shape | Result |
|---|---|
| `catch(e){ return String(e); }` | ✓ CAUGHT (control) |
| `catch(ex){ return String(ex); }` (name outside the listed set) | ✓ CAUGHT — resolves from the catch clause, not the name |
| `catch(e){ return (e as any).message; }` | ✗ MISSED |
| `catch(e){ return "x: " + e.message; }` | ✗ MISSED |
| `catch(e){ return String(e as Error); }` | ✗ MISSED |
| `catch(e){ return e.toString(); }` | ✗ MISSED |
| `catch(e){ return JSON.stringify(e); }` | ✗ MISSED |
| `catch(e){ const x = e; return String(x); }` | ✗ MISSED |

**Redaction — `normaliseObservedUrl`**

| Input | Output |
|---|---|
| `…/a.js?token=ghp_AAAA…` (36 chars) | `…/a.js?token=<redacted>` ✓ |
| `…/a.js?ghp_AAAA…` (bare, 36 chars) | `…/a.js?ghp_AAAA…` ✗ verbatim |
| `…/a.js?eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdef` (bare, 63) | unchanged ✗ verbatim |
| `…/a.js?a=1&sessionsecretvalue` | `…/a.js?a=<redacted>&sessionsecretvalue` ✗ partial |
| `https://user:pass@cdn.test/a.js` | unchanged ✗ verbatim (userinfo — matches WR-11, reproduced independently) |
| `…/a.js#tok=secret` | `…/a.js` ✓ fragment stripped |
| idempotence on its own output | ✓ holds |

### Open code-review findings — status re-derived, not read

`01-REVIEW.md`'s `resolution.open` list contains **CR-02, CR-03, CR-04, CR-05, CR-06** plus WR-11 … WR-16 and IN-08 … IN-13. `fixed_at` is `08:05`, which is *before* the gap-closure review pass at `11:21`, so none of pass 2's findings has been addressed.

| Finding | Severity | Re-verified? | Disposition here |
|---|---|---|---|
| CR-02 `globalThis.fetch` invisible | BLOCKER | ✓ executed | Folded into gap 2. Sharpened: `telemetry.ts:289` already uses this exact idiom for `globalThis.performance` |
| CR-03 receiver forms missed | BLOCKER | ✓ executed, table confirmed accurate | Folded into gap 2 |
| CR-04 `packages/engine/src` outside the walk | BLOCKER | ✓ confirmed — engine ships, is imported by index/consumer/lifecycle, and `boundary.spec.ts` checks imports only | Folded into gap 2 |
| CR-05 `e.message` invisible | BLOCKER | ✓ executed | Folded into gap 2 |
| CR-06 bare param < 64 chars verbatim | BLOCKER | ✓ executed | Folded into gap 1 |
| WR-11 `;` params, path tokens, userinfo | WARNING | ✓ userinfo reproduced | Listed under gap 1's missing items |
| WR-12 … WR-16, IN-08 … IN-13 | WARNING / INFO | Not re-derived | Remain open in `01-REVIEW.md` |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/backend/src/store/observations.ts` | Query-value redaction at the write path | ⚠️ PARTIAL | `redactQueryValues` + `QUERY_VALUE_REDACTION` + `QUERY_NAME_MAX` exported; `normaliseObservedUrl` calls it BEFORE `.slice(0, URL_MAX)` as required. Bare-segment branch is the hole. |
| `packages/backend/src/store/observations.spec.ts` | Behavioural spec incl. token case and idempotence | ⚠️ PARTIAL | Idempotence, first-`=` split, empty segments, percent-encoding and fragment all covered. No case can fail on the bare-segment residual. |
| `packages/backend/src/store/error-redaction.spec.ts` | Static gate, four rules, failure paths executed | ⚠️ PARTIAL | 415 lines; non-vacuity by name; all four rules' failure paths executed; correctly ignores a `String(x)` outside a catch and a type member named `error`. Bare-identifier reach only. |
| `scripts/phase1/tracer-e2e.sh` | Live proof the secret never reaches the column | ✓ VERIFIED | `SECRET_VALUE` from `openssl rand -hex 16` per run; asserts absence from BOTH `sqlite3 SELECT url FROM observations` and the RPC json. Three committed runs incl. a failing mutation run. |
| `results/observation-url-exposure.json` | Read-only per-database counts, values never recorded | ✓ VERIFIED | 8 plugin DBs scanned, 1 DefMiner, `unredacted_with_query` measured 0; three search roots each with a status and a note. |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-01's wired AST gate | ⚠️ PARTIAL | 564 lines; exports `auditSource` + `FORBIDDEN_OUTBOUND`; walks and asserts by name; documentation case live-asserted against the real `telemetry.ts`; mutation-proven by me on the real tree. Reach is narrower than its truth claims. |
| `COVERAGE.md` rows 9 / 27 / 38 | Reference the enforcing gate | ✓ VERIFIED | All three rewritten from prose to a named gate + rule, in both the main table and the summary table. |
| `01-01-PLAN.md` truth #2 | Amended to the new policy | ✓ VERIFIED | Amended in place with the reason recorded. |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `store/observations.ts` | itself | `normaliseObservedUrl` -> `redactQueryValues` before `slice(0, URL_MAX)` | ✓ WIRED — redact-then-truncate ordering confirmed |
| `store/{observations,analyses,artifacts,settings,migrations,retention}.ts` | `telemetry.ts` | `describeError(e)` replaces every `String(e)` | ✓ WIRED — zero residual bare stringifications |
| `scripts/phase1/tracer-e2e.sh` | `store/observations.ts` | `sqlite3 "$PLUGIN_DB" "SELECT url FROM observations"` | ✓ WIRED — output committed per run |
| `outbound-prohibition.spec.ts` | `packages/backend/src` | recursive walk + `createSourceFile`, non-vacuity by name | ✓ WIRED |
| `outbound-prohibition.spec.ts` | `packages/engine/src` | — | ✗ NOT WIRED — no gate walks the engine package for outbound surfaces |
| `error-redaction.spec.ts` | `packages/backend/src/store` | recursive walk, non-vacuity by name + "finds error-shaped bindings to audit" | ✓ WIRED (scope is the store dir by design) |
| `consumer.ts` | `store/observations.ts` | retention cadence / `runRetentionPass` | ✓ WIRED (no sweep needed — operator chose `leave` against a measured 0 rows) |

### Data-Flow Trace (Level 4)

| Value | Source | Real data? | Status |
|---|---|---|---|
| `observations.url` as stored | `recordObservation` -> `normaliseObservedUrl` -> the column | Yes — read back with `sqlite3` from outside Caido | ✓ FLOWING |
| `analyses.error` | `describeError(e)` at the write | Yes — plugin-generated, URL-redacted before truncation | ✓ FLOWING |
| `observation-url-exposure.json` counts | Read-only `sqlite3` over 8 discovered plugin DBs | Yes — a measured 0, distinguished from a not-found 0 | ✓ FLOWING |
| `getStatus().maxSliceMs` | `recordSlice(walk().maxSliceMs)` in the consumer | Yes — 0.029 ms read by an external prober | ✓ FLOWING |

No hollow props, no static fallbacks, no mock-terminated chains.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full suite at HEAD | `pnpm test` | 31 files / 705 tests passed, 0 failures, 1.46 s | ✓ PASS |
| DIST-05 pass path | `node scripts/ci/check-bundle-imports.mjs` | exit 0, import set = `crypto` | ✓ PASS |
| CORE-01 gate mutation-proof | Planted `sdk.requests.send(req)` in real `hooks/passive.ts`, ran the gate, restored | 1 failed / 31 passed; message named file + surface + reason; `git status` clean after | ✓ PASS |
| CORE-01 gate reach | Imported `auditSource`, 22 shapes | 8 caught, 14 missed | ✗ FAIL (gap 2) |
| STORE-07 gate reach | Imported `auditSource`, 8 shapes | 2 caught, 6 missed | ✗ FAIL (gap 2) |
| Redaction reach | Imported `normaliseObservedUrl`, 7 shapes | 3 correct, 4 verbatim/partial | ✗ FAIL (gap 1) |
| Engine outbound scan | grep `fetch(`/`XMLHttpRequest`/`WebSocket`/`requests.send` over `packages/engine/src` | zero hits — clean today, ungated tomorrow | ✓ PASS (state), ✗ FAIL (enforcement) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` exist in this repo. The phase's runnable evidence is the `scripts/phase1/*.sh` harness, whose committed outputs are gated by `tests/phase1-*.spec.ts` inside the suite run above.

| Probe | Command | Result | Status |
|---|---|---|---|
| `scripts/phase1/tracer-e2e.sh` | Executor-run ×3, outputs committed under `results/runs/` | 2 PASS + 1 deliberate FAIL (mutation) | ✓ EVIDENCE VERIFIED — raw column dumps inspected directly |
| `tests/phase1-load.spec.ts`, `phase1-runtime.spec.ts`, `phase1-compat.spec.ts` | in `pnpm test` | pass, still pinned to 0.57.1 | ✓ PASS |

### Requirements Coverage

All 22 IDs declared across the nine plans. `ROADMAP.md:375` maps exactly `CORE-01 … CORE-10, STORE-01 … STORE-07, COMPAT-01/02, ENC-01, DIST-05/06` to Phase 1 — the same 22. **No orphaned requirements.** `STORE-08` was split out at UAT and has owners (Phase 4 for `entities`/`evidence`, Phase 5 for `audit`) at `ROADMAP.md:378-379`.

| Requirement | Source plan(s) | Status | Evidence |
|---|---|---|---|
| CORE-01 | 01-01, 01-09 | ⚠️ SATISFIED, enforcement partial | Handler non-async (`passive.ts:120`). The *prohibition* tagged CORE-01 is flagged — see frontmatter |
| CORE-02 … CORE-08 | 01-03, 01-04 | ✓ SATISFIED | Admission gates, single consumer, `sdk.requests.get` reload, temporal yield, deadline degradation, dedup — all verified in the prior pass, regression-clean |
| CORE-09, CORE-10 | 01-05 | ✓ SATISFIED | `onProjectChange` incl. the null branch and the CR-01 disarm path; `recordSlice` wired from production code |
| STORE-01 | 01-01, 01-04 | ✓ SATISFIED (re-scoped at UAT) | Four tables; column allowlist read from `PRAGMA table_info`. Prohibition flagged |
| STORE-02 | 01-01, 01-04 | ✓ SATISFIED | `project_id` in every PRIMARY KEY, asserted by pk ordinals not DDL text |
| STORE-03 | 01-01, 01-03, 01-07, 01-08 | ⚠️ SATISFIED, enforcement partial | Content-addressed identity ✓; the redaction prohibition is flagged — gap 1 |
| STORE-04, STORE-05, STORE-06 | 01-04, 01-08 | ✓ SATISFIED | Corpus version on analysis rows; forward-only ladder no-op on second boot proven live; retention cascade bounded and mutation-proven (WR-01) |
| STORE-07 | 01-01, 01-04, 01-07 | ⚠️ SATISFIED, enforcement partial | Positional `?` only, enforced by `sql-discipline.spec.ts` ✓. The error-redaction prohibition sharing this ID is flagged — CR-05 |
| COMPAT-01, COMPAT-02 | 01-06 | ✓ SATISFIED | `MIN_CAIDO = 0.57.1`, refusal proven on the real 0.55.3 binary; 16-surface matrix across three legs |
| ENC-01 | 01-01, 01-03 | ✓ SATISFIED | `toRaw()` path; `toText()` AST-gated and the gate itself fixture-proven |
| DIST-05 | 01-02 | ✓ SATISFIED | Re-executed; 1 specifier |
| DIST-06 | 01-02 | ✓ SATISFIED | Pins present |

**Traceability note (info, not a defect).** The prohibition in `01-09-PLAN.md` carries `requirement_id: CORE-01`, but `REQUIREMENTS.md:36`'s CORE-01 text is the non-async-handler requirement — it says nothing about outbound traffic. The must-NOT and the must are tagged with one id and mean different things. Worth a ledger tidy so a future reader is not misled about which one a gate is enforcing.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | No `TBD`, `FIXME` or `XXX` in any file modified by this phase | — | Debt-marker gate: clean |
| `packages/backend/src/store/observations.ts` | 57-62, 96-101 | Documented residual with no falsifying test | ⚠️ Warning | The disclosure is genuine (T-01-31 named in source), which is why this is a warning here and a blocker under gap 1 only in combination with the `schema.spec.ts` claim |
| `packages/backend/src/outbound-prohibition.spec.ts` | header boundary 2 | Disclosed boundary narrower than the actual one | ⚠️ Warning | "an alias rebound in an inner scope" understates the reach; a reader trusting it is misled |
| `packages/backend/src/store/schema.spec.ts` | 39-46 | Claim upgraded to TRUE without an executed case behind it | 🛑 Blocker | Folded into gap 1 |

### Note for the record — `P1_EXPECT_VERSION` 0.57.1 -> 0.58.0

Judged as asked, and it leaves **no Phase 0 threshold assertion weaker**.

`env.sh:79` sets the *harness default* to 0.58.0. Every artifact that gates a Phase 0 threshold was measured on 0.57.1 and is still asserted against 0.57.1: `tests/phase1-load.spec.ts:34` and `tests/phase1-runtime.spec.ts:18` both hard-code `EXPECTED_CAIDO_VERSION = "0.57.1"`, and `compat.ts:43` still declares `MIN_CAIDO = "0.57.1"`. The 0.58.0 runs are the three 01-07 tracer runs, which prove STORE-03 redaction — not a performance or compatibility threshold. The deliberate hard-coding is doing exactly the loud-failure job it was left to do: re-measuring `spa-load.json` on 0.58.0 without updating the pin fails the suite rather than silently rebaselining. The only residual is cosmetic (WR-15: `tracer-e2e.sh`'s header still names 0.57.1).

### Gaps Summary

Nine plans, 705 passing tests, a clean bundle gate, and seven ROADMAP criteria that all hold — this is a strong phase, and the goal in the roadmap is met. The two gaps are about the *last* thing the phase set out to do, which was to give two prohibitions teeth.

Both new gates are well-built where they reach: pure `auditSource` functions, by-name non-vacuity assertions, every rule's failure path executed, a documentation case proving the AST walk is not a text scan, and — for CORE-01 — a real mutation proof I reproduced against a shipped module. That is a higher standard than most gates in most repos.

The problem is what sits outside their reach, and how it was described. `globalThis.fetch` is missed by a gate whose own codebase already reaches globals that way. `const { requests } = sdk` is missed by a gate that already handles the inner destructure. `packages/engine/src` ships in the bundle and no gate walks it for outbound surfaces at all — including `pipeline.ts`, the module whose job is "no speculative retrieval". `e.message` is missed by a redaction gate in a codebase where TypeScript's `unknown` catch binding pushes authors toward exactly the casts the gate cannot see. And a bare query parameter under 64 characters — which is every common credential format on the web — is written whole into a durable column, under a spec file that was rewritten in the same batch to say it cannot be.

None of these breaks the plugin. All of them break the claim, and the claim is the deliverable. The fixes are local and well-specified — `01-REVIEW.md` CR-02 … CR-06 already carry concrete patches, and I have added the two shapes I found independently (userinfo, and `sdk.requests.sendRaw` on a positively identified receiver) to the missing lists.

**Recommended next step:** `/gsd-plan-phase --gaps` against this file. Both gaps are one focused plan each — gap 1 is a branch in `redactQueryValues` plus a failing case; gap 2 is widening two AST walks and adding a third over the engine package.

---

_Verified: 2026-08-21T13:45:00Z_
_Verifier: Claude (gsd-verifier) — re-verification after the `--gaps-only` run of plans 01-07, 01-08, 01-09_
