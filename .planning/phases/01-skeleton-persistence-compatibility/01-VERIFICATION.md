---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-21T17:40:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/9
  previous_verified: 2026-08-21T13:45:00Z
  gaps_closed:
    - "UAT gap 2 (CORE-11 outbound enforcement) — CLOSED. Every surface the truth enumerates now fails a gate, in every spelling I could construct. I re-ran my own 22-shape probe plus 6 new ones against `auditSource`: 24 of 28 caught, including all four call forms, the `globalThis` idiom and the destructured receiver that were missed in round 1. `SOURCE_ROOTS` now carries `packages/engine/src` with a by-name non-vacuity assertion listing `pipeline.ts`, `decode.ts`, `queue.ts`. The gate's boundary-2 header — the sharpest half of my prior finding, because it misled in the direction that gets trusted — was rewritten and I confirmed the new text against the walk's actual reach."
    - "The requirement-ledger split: CORE-11 exists in REQUIREMENTS.md as its own id BEFORE plan 01-12's frontmatter declares it; STORE-03 and STORE-07 collisions recorded as deferred WITH AN OWNER rather than left to read as clean"
    - "`;`-delimited path parameters proven against the durable column for the first time (run 20260821T150022Z-16902); 01-11 had unit coverage only"
    - "The bare-segment assertion proven able to FAIL — committed mutation run 20260821T150143Z-19295, six assertions red, three sibling grammars still green in the same row"
  gaps_remaining:
    - "UAT gap 1 (observations.url must not persist query-string values verbatim) — STILL OPEN, through a different door. The `=`-less half is genuinely closed; a segment that CONTAINS an `=` (every base64-padded credential) is classified as `name=value` and the credential is promoted to the retained NAME half."
  regressions:
    - "HONESTY REGRESSION on the residual, not on the code: round 1's residual was DISCLOSED in source (T-01-31). Round 2's is CONTRADICTED by three artifacts — `observations.ts:74-81`, `observations.ts:99-102`, and `schema.spec.ts:44-52`, which lists the QUERY grammar as ENFORCED with an OPEN list naming exactly one other grammar."
gaps:
  - truth: "`observations.url` does not persist query-string values verbatim; the path and parameter names are retained, the values are redacted or hashed before the row is written"
    status: partial
    reason: "UAT gap 1 is CLOSED-FOR-THE-GRAMMARS-TESTED AND OPEN FOR ANOTHER, and the other one is inside the grammar declared ENFORCED. `redactDelimitedSegment` (observations.ts:108-114) decides `bare` by `segment.indexOf(\"=\") === -1`. Standard base64 pads with `=`, so a segment that is ENTIRELY a credential takes the `name=value` branch and the credential lands in the half the policy KEEPS. Executed by me through the shipped `normaliseObservedUrl`: `?dXNlcjpwYTU1dzByZA==` -> `?dXNlcjpwYTU1dzByZA=<redacted>`; re-padding the stored name half and running `base64 -d` returns `user:pa55w0rd`, a whole HTTP Basic credential recovered byte-for-byte out of a column `db.ts` documents as never garbage-collected, surviving project deletion and force-reinstall. `QUERY_NAME_MAX = 64` does not bound it: base64 of 32 raw bytes is 44 characters. The same defect exists on the `;` delimiter because `redactDelimitedSegment` is deliberately the one shared helper — one policy, two delimiters, one hole. THIS IS THE SAME FAILURE SHAPE AS THE ORIGINAL BUG, reached through a different door: a claim wider than its enforcement, sitting under an upgraded claim, with no tier able to go red on it. Not one of the eight `BARE_CREDENTIAL_SHAPES` contains an `=` — the fixture list was chosen against a rule whose blind spot IS the `=`, which is precisely what its own header warns about ('a fixture list that agrees with the implementation measures the implementation's opinion of itself'). And the live tier cannot fail on it either: all five tracer dye values are `openssl rand -hex`, and hex never contains an `=` (scripts/phase1/tracer-e2e.sh:62-73). Unit fixtures, live tracer and schema claim are blind in the same way, simultaneously. Round 2's progress on this truth is real and large — the `=`-less half is closed, mutation-proven against the real database file, and the `;` grammar reached the column for the first time — but it did not earn a pass on THIS truth."
    severity: major
    artifacts:
      - path: "packages/backend/src/store/observations.ts"
        issue: "`redactDelimitedSegment:108-114` — `indexOf(\"=\") === -1` is a test for 'contains no `=` byte', not for 'has a name'. The claim at `:74-81` ('no length of bare segment survives and there is no \"shorter than the bound\" left for a future credential format to hide in') is FALSE as executed; the converse assumed at `:99-102` ('With no `=`: … a VALUE WITH NO NAME') does not hold in reverse."
      - path: "packages/backend/src/store/schema.spec.ts"
        issue: "`:44-52` lists the QUERY grammar as ENFORCED with an OPEN list naming exactly ONE grammar (path-embedded tokens). This is a second open grammar and it is INSIDE the one declared closed. Separately, the USERINFO row is listed ENFORCED but holds only under an undeclared precondition on the input: `redactUrlHead` resolves the authority after the first `://`, so I executed `//user:pw@cdn.test/a.js` and `user:pw@cdn.test/a.js` and both keep the userinfo verbatim. Not reachable today — `consumer.ts:195` takes `rr.request.getUrl()`, which is absolute — but the ENFORCED row does not say that, and 'holds because the caller happens to pass a scheme' is the same unstated-precondition shape as the rest of this gap."
      - path: "packages/backend/src/store/observations.spec.ts"
        issue: "`BARE_CREDENTIAL_SHAPES:74-100` — eight formats, not one containing an `=`. The table is structurally incapable of failing on this defect; adding a base64 shape with one and with two `=` of padding is what makes it able to."
      - path: "scripts/phase1/tracer-e2e.sh"
        issue: "`:62-73` — all five per-run dye values are `openssl rand -hex`, so no live run can exercise a padded segment either. CR-07's own fix note asks for a sixth dye shaped `$(openssl rand -base64 16)`."
    missing:
      - "In `redactDelimitedSegment`, treat a pair whose VALUE half is empty or is only `=` padding as never having been a pair, and redact the whole segment (01-REVIEW.md CR-07 carries the four-line patch)"
      - "Add base64-with-one-pad, base64-with-two-pads and a trailing-`=` token to `BARE_CREDENTIAL_SHAPES`, and mirror them into `HEAD_CASES` for the `;` delimiter, so the table can go red"
      - "Add a sixth tracer dye that pads (`openssl rand -base64 16`) carried as a bare segment, asserted out of the raw column exactly as the other five are"
      - "Amend `schema.spec.ts:44-52`: even with the fix, a credential pasted as a genuine parameter NAME (`?ghp_…=1`) is kept BY POLICY and belongs in the OPEN list — 'every VALUE is replaced' is not the sentence 'no authorization token reaches this column', and the entry currently reads as though it were"
      - "State the `://` precondition on the USERINFO row, or resolve the authority for scheme-relative input too"
deferred: []
behavior_unverified_items: []
coincidental_reliance_items: []
prohibitions:
  - requirement_id: CORE-11
    statement: "No code that ships in the plugin issues an outbound network request in this phase — no `caido:http` fetch, no `sdk.requests.send` in any spelling, no method of an identified `requests` or `net` receiver outside a read-only allowlist, no global `fetch` by any receiver or alias, no `XMLHttpRequest`/`WebSocket`/`EventSource`, and no speculative retrieval of any kind."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "Wired enforcement executed by me, not read. `outbound-prohibition.spec.ts` walks BOTH shipped roots with a by-name non-vacuity list that includes three engine modules, a per-root contribution assertion, a conditional per-root descent assertion, and an `it.each` over the same binding the non-vacuity assertions measured. I imported `auditSource` and ran 28 shapes: 24 caught (`sdk` alias, `this.sdk`, `deps.sdk`, computed receiver, extracted method, comma-sequence, renamed destructure, optional computed, `.call`, `Reflect.apply`, static/`require`/dynamic `caido:http`, assembled specifier -> `outbound-unanalysable`, `XMLHttpRequest`, bare/`globalThis`/callback `fetch`), and the three must-stay-quiet shapes stayed quiet (`sdk.requests.get`, `globalThis.performance.now()`, `cache.fetch`). `node scripts/ci/check-bundle-imports.mjs` -> 1 specifier, `crypto`, exit 0. Residual misses are WARNING-tier and named below."
  - requirement_id: STORE-03
    statement: "MUST NOT persist a query-string VALUE from a target-controlled URL into observations.url. Parameter names, path, scheme and host are retained; every value is replaced before the row is written."
    verification: gate
    declared_status: resolved
    status: unverified
    flagged: true
    evidence: "FAIL-CLOSED. Proven for `name=value`, for the `=`-less bare segment and for `;` path parameters — all three against the real database file read with sqlite3 from outside Caido (run 20260821T150022Z-16902), with a committed mutation run (20260821T150143Z-19295) showing the bare-segment assertion goes red in isolation. NOT proven, and actively false, for a segment containing an `=`: a base64-padded credential is a query-string value from a target-controlled URL, it takes the `name=value` branch, and the credential is written whole into the retained name half. I recovered `user:pa55w0rd` from the stored bytes. Enforcement is partial; declared resolved."
  - requirement_id: STORE-07
    statement: "MUST NOT render a caught exception into a persisted or logged string without passing it through describeError first."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "`derivesFrom` replaced the bare-identifier match and I confirmed the upgrade by execution: `String(e as Error)`, `JSON.stringify(e)`, `const x = e; String(x)`, a destructured `{ error }` parameter, a concise-arrow `(e) => String(e)` and `catch(exception)` all fire; `describeError(e).slice(0, 200)` stays quiet. Zero residual bare stringification anywhere under `packages/backend/src/store`. The header ENUMERATES the five render forms it covers rather than claiming completeness, so the `+=` / `.concat()` / push-then-join residual (WR-17) is visible from the gate's own text — a warning, not the schema.spec.ts-style overclaim that makes STORE-03 a blocker."
  - requirement_id: CORE-10
    statement: "MUST NOT present partial passive coverage as complete."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Carried forward unchanged and accepted by the operator at UAT test 3. Counter identifiers remain honest (`proxiedResponsesObserved`, not a target-completeness noun). Judgment-tier, autonomous run: NON-AUTHORITATIVE LLM-judge verdict, human review recommended."
  - requirement_id: STORE-01
    statement: "MUST NOT retain operator browsing evidence beyond what the analysis needs — no body bytes, headers, cookies, or column capable of holding a secret."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "The column-shape half is gated (schema.spec.ts enforces a PRAGMA-read allowlist plus a forbidden-name check). The 'capable of holding a secret' half remains in DIRECT tension with the gap above: `observations.url` can hold a whole base64 HTTP Basic credential, and `schema.spec.ts` asserts the query grammar is enforced against exactly that. Judgment-tier: NON-AUTHORITATIVE, human review recommended."
---

# Phase 1: Skeleton, Persistence & Compatibility — Verification Report

**Phase Goal:** A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Verified:** 2026-08-21T17:40:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure ROUND 2 (plans 01-10 … 01-14)

## The verdict on the question I was asked

**UAT gap 1 is closed for the grammars tested and open for another — and the other one is inside the grammar declared ENFORCED.**

I ran it myself rather than take CR-07's word for it. Through the shipped `normaliseObservedUrl`:

```
?dXNlcjpwYTU1dzByZA==   ->   ?dXNlcjpwYTU1dzByZA=<redacted>
```

`printf '%s' 'dXNlcjpwYTU1dzByZA==' | base64 -d` returns `user:pa55w0rd`. The value stored in `observations.url` is the credential minus one byte of padding, and padding is not information — re-pad and decode and the whole HTTP Basic credential comes back. It is written into a column `db.ts` documents as never garbage-collected, surviving project deletion and force-reinstall.

Three separate things had to be true at once for me to call this a blocker rather than a documented residual, and all three are:

1. **The source asserts it cannot happen.** `observations.ts:74-81` says decision P10-D1's construction means *"no length of bare segment survives and there is no 'shorter than the bound' left for a future credential format to hide in."* The construction is `indexOf("=") === -1`. That is a test for "contains no `=` byte", which is not the same predicate.
2. **The schema claim asserts it cannot happen, with an explicit OPEN list that omits it.** `schema.spec.ts:44-52` lists QUERY as ENFORCED and names exactly one still-open grammar (path-embedded tokens). This is a second open grammar and it sits inside the one declared closed. An OPEN list is worth more than prose precisely because a reader trusts its completeness.
3. **Nothing in any tier can go red on it.** Not one of the eight `BARE_CREDENTIAL_SHAPES` contains an `=`, and its own header warns about exactly this trap. Not one of the five tracer dye values can contain an `=` — they are all `openssl rand -hex`. Unit fixtures, live end-to-end proof and schema claim are blind in the same way, simultaneously.

That combination is this phase's own stated subject: a gate that passes because it cannot see the violation. Round 2's progress on this truth is genuine and large, and I have recorded it below in detail — but it is progress that closed one door and left the same failure shape standing at another, and this is not a phase that can ship that.

**One thing is worse than round 1, and it is not the code.** Round 1's residual was *disclosed* in source as T-01-31 — named rather than hidden. Round 2's residual is *contradicted* by three artifacts. The coverage went up and the honesty of the claim went down. Those move independently and this report keeps them separate.

**On userinfo: the disclosure is adequate and I am not counting it as a gap.** `01-14-SUMMARY.md`, `README-01-14.md` and `WINDOWS.md` all say plainly that `curl` lifts `user:pass@` into an `Authorization: Basic` header before the request line exists, so a zero in the live tier is a property of the harness. The README states the measurement (`userinfo_in_request_line=no`, `userinfo_sent_as_authorization_header=yes`) rather than assuming it in either direction, and says in as many words that the unmeasured version "would have been a silence dressed as a pass." That is the correct handling of an unprovable tier. I verified the source-level path directly instead: `redactUrlHead("https://user:pa55w0rd@cdn.test/app.js")` -> `https://<redacted>@cdn.test/app.js` and `http://user@host/a` -> `http://<redacted>@host/a`, both executed, both idempotent, with `https://cdn.test/@vite/client.js` byte-identical. The one thing the ENFORCED row does not say is that it holds only when the input carries `://` — I executed `//user:pw@cdn.test/a.js` and it survives verbatim. Unreachable through `rr.request.getUrl()` today, so it is recorded under the gap's artifacts rather than as a gap of its own.

## Goal Achievement

**The phase GOAL is achieved. UAT gap 1 is not closed.** Those remain separate findings. All seven ROADMAP Success Criteria hold and none regressed under round 2.

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `onInterceptResponse` is non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `passive.ts:120` is `export function onResponse(`, not async. Regression-checked; probed independently in the first verification (returns `undefined`, no `.then`). |
| 2 | The work queue is bounded and its overflow count is visible | ✓ VERIFIED | `queue.ts:96` exposes `overflowCount` as a getter a take does not reset (`:81`); `index.ts:130` surfaces `queueOverflowCount` on `getStatus()`. Cap=500 / 501st offer / FIFO drop probed independently in the first verification. |
| 3 | Browsing a 200-chunk SPA leaves UI and RPC responsive, max sync slice under the Phase 0 threshold | ✓ VERIFIED | `results/spa-load.json` — `max_slice_ms: 0.029000043869018555` against `max_sync_slice_ms_budget` 25 ms, gated by `tests/phase1-load.spec.ts`. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `spa-load.json.restart` — `identical: true`, `plugin_reattached: true`, `user_version` 2 before and after, 200 artifacts / 200 observations / 200 distinct digests. Dedup proven on a real instance in `results/runs/20260821T075936Z-12874/`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; a non-UTF-8 fixture round-trips | ✓ VERIFIED | `consumer.ts:189` `const raw = body.toRaw()`; the `toText()` AST gate in `admit.spec.ts` passes and is fixture-proven. Digests host-reproduced in the first verification. |
| 6 | A CI gate fails the build if the backend bundle imports any specifier outside the measured allowlist | ✓ VERIFIED | **Re-executed:** `node scripts/ci/check-bundle-imports.mjs` -> `packages/backend/dist/index.js: 1 import specifier(s): crypto`, exit 0. Fail paths executed against seven planted specifiers in the first verification and gated by `check-bundle-imports.spec.ts` in the suite. |
| 7 | A Caido build below the declared minimum produces a clear message | ✓ VERIFIED | `MIN_CAIDO = "0.57.1"` at `compat.ts:43`; refusal messages at `:332/:352/:363` naming both versions. Proven against the real 0.55.3 binary in `compat-smoke.json` leg C. |
| 8 | **[UAT gap 1]** `observations.url` does not persist query-string values verbatim | ✗ FAILED (partial) | `=`-less and `;` halves closed and live-proven with a committed mutation run. A segment CONTAINING an `=` is parsed as `name=value` and the credential is retained. I recovered `user:pa55w0rd` from the stored bytes. See gaps. |
| 9 | **[UAT gap 2]** No shipped code can introduce outbound traffic without failing a gate | ✓ VERIFIED | 24/28 adversarial shapes caught by `auditSource`, including every form I found missing in round 1; both shipped roots walked with by-name non-vacuity; header boundary rewritten to match actual reach and independently confirmed. Residuals are WARNING-tier and outside the truth's enumeration. |

**Score:** 8/9 truths verified (0 present, behavior-unverified)

### What round 2 genuinely delivered

Adversarial verification is not one-sided. Four things here are stronger than the SUMMARYs claimed, not weaker:

| Deliverable | Status | What I executed or re-derived |
|---|---|---|
| The CORE-11 gate | ✓ REAL, and it now survives a probe it did not write | I imported `auditSource` and ran 28 shapes. Every form I named as missing in the previous verification now lands: `const {requests}=sdk`, `let r; r=sdk.requests`, `sdk.requests.send.call()`, `globalThis.fetch`, a computed receiver, `sdk["requests"].send`. Indirection it cannot resolve now REPORTS as `outbound-unanalysable` (`sdk.requests[m]`, an assembled import specifier) instead of reporting clean — "could not read" no longer means "clean", which was the specific defect. `sdk.requests.get`, `globalThis.performance.now()` and `cache.fetch` stay quiet. |
| The engine package inside the walk | ✓ REAL | `SOURCE_ROOTS = ["packages/backend/src", "packages/engine/src"]`, with `pipeline.ts`, `decode.ts` and `queue.ts` in the by-name non-vacuity list, a per-root contribution assertion, and a per-root descent assertion conditioned on the root actually having a subdirectory — so it fails loudly on a package split rather than quietly halving. |
| The gate header | ✓ FIXED, and this was the sharpest half of my prior finding | Boundary 2 no longer says "an alias rebound in an INNER SCOPE". It now enumerates what the walk resolves and states the residual precisely — a value crossing a function boundary or more than one hop. I confirmed that bound: `Object.assign({}, sdk.requests).send(r)` is the shape it discloses and the shape it misses. A header that matches the walk is what a reader can act on. |
| Live proof across four grammars | ✓ REAL, and honest about its own limit | `README-01-14.md` — run 20260821T150022Z-16902 asserts five dye values absent from both the raw column and the RPC projection, per row, with `raw rows == rpc rows` asserted (IN-13); run 20260821T150143Z-19295 is a committed mutation with six assertions red and the three sibling grammars still green in the same row, so the revert is shown to have isolated one branch. The read went through `sqlite3 -readonly` with `sqlite_master_objects=14` asserted `> 0` — a gate green because it read nothing is refused by name. |
| The requirement ledger | ✓ DONE, and it does not pretend to be clean | CORE-11 opened in `REQUIREMENTS.md:46` BEFORE plan 01-12 declares it, on the STORE-01 -> STORE-08 precedent. STORE-03 and STORE-07 collisions recorded as DEFERRED WITH AN OWNER, with the reason for deferring rather than splitting written out — "a deferral without a reason is an omission with a label". |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/backend/src/store/observations.ts` | Write-path URL redaction, all grammars | ⚠️ PARTIAL | `redactQueryValues`, `redactUrlHead`, `redactDelimitedSegment`, `normaliseObservedUrl` all present, wired into `recordObservation:338`, data flowing from `consumer.ts:446`. The `=`-containing bare segment is the hole. |
| `packages/backend/src/store/observations.spec.ts` | Fixtures that can fail | ⚠️ PARTIAL | 8 `BARE_CREDENTIAL_SHAPES`, none containing `=`. Cannot fail on CR-07. |
| `packages/backend/src/store/schema.spec.ts` | Per-grammar claim with an OPEN list | ⚠️ OVERCLAIM | QUERY listed ENFORCED; OPEN list names one grammar, misses two. |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 gate over both shipped roots | ✓ VERIFIED | 1256 lines, both roots, by-name non-vacuity, every rule's failure path executed inline, 24/28 on my probe. |
| `packages/backend/src/store/error-redaction.spec.ts` | STORE-07 gate past bare-identifier reach | ✓ VERIFIED | `derivesFrom` follows the binding through casts, member access and member-callee calls; one hop of copy; five render forms; return and object-value positions. Residual enumerated in its own header. |
| `scripts/ci/check-bundle-imports.mjs` | DIST-05 bundle allowlist gate | ✓ VERIFIED | Re-executed: 1 specifier, `crypto`. |
| `scripts/phase1/tracer-e2e.sh` | Live end-to-end proof against the DB file | ⚠️ PARTIAL | Four grammars proven, mutation-proven, read-only ladder. All five dye values are hex, so no run can exercise a padded segment. |
| `packages/backend/src/compat.ts` | COMPAT-01/02 refusal | ✓ VERIFIED | `MIN_CAIDO` + three distinct messages, proven on a real 0.55.3 binary. |
| `.planning/REQUIREMENTS.md` | Honest ledger | ✓ VERIFIED | CORE-11 opened; STORE-08 opened unchecked with Phase 4/5 owners; two collisions deferred with an owner. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `hooks/passive.ts` | `engine/queue.ts` | `offer()` from a non-async handler | ✓ WIRED | Regression-checked; unchanged. |
| `ingest/consumer.ts:446` | `store/observations.ts:322` | `recordObservation(...)` with `got.url` | ✓ WIRED | Real data path; `got.url` from `rr.request.getUrl()` at `:195`. |
| `store/observations.ts:338` | SQLite `observations.url` | `normaliseObservedUrl(url)` inside the INSERT parameters | ✓ WIRED | Write-path, not read-path — settled against the database file by `README-01-07.md`'s mutation run. |
| `outbound-prohibition.spec.ts` | `packages/engine/src` | `SOURCE_ROOTS[1]` + by-name non-vacuity | ✓ WIRED | Confirmed: `pipeline.ts`, `decode.ts`, `queue.ts` named; per-root contribution asserted. |
| `index.ts:130` | `engine/queue.ts:96` | `queue.overflowCount` -> `getStatus().queueOverflowCount` | ✓ WIRED | RPC-visible. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `observations.url` | `url` | `rr.request.getUrl()` -> `normaliseObservedUrl` | ✓ (verified against the real file with `sqlite3 -readonly` from outside Caido) | ⚠️ FLOWING BUT UNDER-REDACTED |
| `getStatus().queueOverflowCount` | `queue.overflowCount` | live `BoundedQueue` instance | ✓ | ✓ FLOWING |
| `spa-load.json.max_slice_ms` | measured slice | live 200-chunk run | ✓ | ✓ FLOWING |
| `check-bundle-imports` specifier set | parsed `dist/index.js` | real built bundle | ✓ | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full suite green | `pnpm test` | 31 files, **931 tests passed**, 1.04s | ✓ PASS |
| Bundle import gate | `node scripts/ci/check-bundle-imports.mjs` | `1 import specifier(s): crypto`, exit 0 | ✓ PASS |
| CR-07 reproduction | throwaway spec importing `normaliseObservedUrl`, 19 URL shapes | `?dXNlcjpwYTU1dzByZA==` -> `?dXNlcjpwYTU1dzByZA=<redacted>` | ✗ FAIL (credential survives) |
| Credential recovery | `printf '%s' 'dXNlcjpwYTU1dzByZA==' \| base64 -d` | `user:pa55w0rd` | ✗ FAIL (recovered) |
| Userinfo source path | `normaliseObservedUrl("https://user:pa55w0rd@cdn.test/app.js")` | `https://<redacted>@cdn.test/app.js` | ✓ PASS |
| Vite path must-not-touch | `normaliseObservedUrl("https://cdn.test/@vite/client.js")` | byte-identical | ✓ PASS |
| Scheme-relative userinfo | `normaliseObservedUrl("//user:pw@cdn.test/a.js")` | unchanged — userinfo survives | ⚠️ residual (unreachable today) |
| CORE-11 gate reach | throwaway spec importing `auditSource`, 28 shapes | 24 caught / 3 correct quiets / 4 residual misses | ✓ PASS |
| STORE-07 gate reach | throwaway spec importing `auditSource`, 17 shapes | casts, copies, destructures, `JSON.stringify`, concise arrows all fire; `describeError` quiet | ✓ PASS |
| Tree clean after probes | `git status --short` | no source-tree changes; all three throwaway specs deleted | ✓ PASS |

**Note on the 931:** every one of them passes with the CR-07 hole live. Counting passing tests is not verification here, which is the point the phase makes about itself.

### Probe Execution

| Probe | Command | Result | Status |
|---|---|---|---|
| Live tracer (round 2, clean) | recorded run `20260821T150022Z-16902` | five dye values at 0 in raw column and RPC, per row, `raw rows == rpc rows` | PASS (recorded, not re-run — needs a live Caido instance) |
| Live tracer (round 2, mutation) | recorded run `20260821T150143Z-19295` | six assertions red on the bare-segment grammar only | PASS (recorded) |
| Compat smoke | `results/compat-smoke.json` | leg C refuses on the real 0.55.3 binary | PASS (recorded) |

Live-tier probes were not re-executed: they require a running Caido instance and a proxied origin, which Step 7b's constraints exclude. The recorded artifacts are per-run, carry `caido-version.txt` written from the resolved `$ACTUAL_VERSION`, and include a committed mutation run — that is the strongest form of recorded evidence available without a live instance.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| CORE-01 | 01-01, 01-09 | non-async handler | ✓ SATISFIED | `passive.ts:120`; cross-reference note now points to CORE-11 for the prohibition |
| CORE-02 … CORE-08 | 01-03, 01-04 | admission, dedup, corpus-version skip | ✓ SATISFIED | `admit.ts`, `consumer.ts`; suite green |
| CORE-09, CORE-10 | 01-05 | honest counters | ✓ SATISFIED | `proxiedResponsesObserved` naming; CORE-10 judgment-tier, accepted at UAT |
| CORE-11 | 01-10, 01-12 | outbound prohibition, gated | ✓ SATISFIED | Opened in REQUIREMENTS.md before 01-12 declared it; gate executed by me over both roots |
| STORE-01 | 01-01, 01-04, 01-10 | schema scope | ⚠️ TENSION | Re-scoped to four tables; the "capable of holding a secret" half is contradicted by the CR-07 hole |
| STORE-02, STORE-04, STORE-05, STORE-06 | 01-01, 01-04, 01-08 | persistence, retention, migrations | ✓ SATISFIED | `user_version` 2 before/after restart; retention gated |
| STORE-03 | 01-01, 01-07, 01-10, 01-11, 01-14 | (declared for write-path URL redaction) | ✗ BLOCKED | CR-07. Ledger collision recorded as deferred with an owner. |
| STORE-07 | 01-01, 01-04, 01-07, 01-11, 01-13 | (declared for rendered-error redaction) | ✓ SATISFIED | Gate executed; residual enumerated in its own header. Ledger collision recorded as deferred with an owner. |
| STORE-08 | — | `entities`/`evidence`/`audit` | — DEFERRED | Opened unchecked; Phase 4/5 owners in the ROADMAP traceability table |
| COMPAT-01, COMPAT-02 | 01-06 | minimum-version refusal | ✓ SATISFIED | Real 0.55.3 binary, three distinct messages |
| ENC-01 | 01-01, 01-03 | `toRaw()` bytes | ✓ SATISFIED | `consumer.ts:189`; `toText()` AST gate |
| DIST-05, DIST-06 | 01-02 | bundle import allowlist | ✓ SATISFIED | Re-executed, 1 specifier |

No orphaned requirements: every id the phase is tagged with appears in a plan's frontmatter, and CORE-11 was opened specifically so no gate is tagged with an id whose text describes a different subject.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `packages/backend/src/store/observations.ts` | 74-81, 99-102 | A source claim that is false of the code beneath it | 🛑 BLOCKER | The reader most likely to add a credential grammar is the reader this paragraph tells not to bother |
| `packages/backend/src/store/schema.spec.ts` | 44-52 | ENFORCED grammar with an OPEN list that omits two open grammars | 🛑 BLOCKER | An OPEN list is trusted for its completeness; this one is incomplete in the grammar it declares closed |
| `packages/backend/src/store/observations.spec.ts` | 74-100 | A fixture table structurally incapable of failing on the defect | 🛑 BLOCKER | Same shape its own header warns against |
| `scripts/phase1/tracer-e2e.sh` | 17-19 | *"a `grep -c` … is how that is enforced"* — no such gate exists anywhere in the repo | ⚠️ WARNING | WR-21, confirmed independently: `grep -rn "tracer-e2e"` outside `.planning/` returns seven hits, all prose. A claim that a check exists is the claim a reader will not re-verify, and it is in the file whose whole purpose is citeable evidence |
| `packages/backend/src/outbound-prohibition.spec.ts` | `OUTBOUND_CONSTRUCTORS` | `navigator.sendBeacon` is uncovered and undisclosed | ⚠️ WARNING | Executed: quiet. The gate's own stated principle for including `XMLHttpRequest`/`WebSocket`/`EventSource` — "a surface excluded because it probably does not exist is a surface nobody checked" — applies identically to `sendBeacon`, which is the one outbound global most likely to exist in a host that has none of the other three |
| `packages/backend/src/outbound-prohibition.spec.ts` | — | `eval("sdk.requests.send(r)")` and `new Function(...)` report clean, undisclosed | ⚠️ WARNING | No AST gate can see inside a string, but banning `eval`/`new Function` outright in shipped source is the same two-identifier posture the gate already takes on the constructors |
| `packages/backend/src/store/error-redaction.spec.ts` | 376-386 | `+=`, `.concat()`, push-then-join not seen | ⚠️ WARNING | WR-17, reproduced. Three renders one token from ones it does see. Visible from the header's own enumeration, so not an overclaim |
| `.planning/REQUIREMENTS.md` | 46 | CORE-11's inline "HONEST STATUS" note still describes enforcement as PARTIAL | ℹ️ INFO | Written before 01-12 ran and true then; stale now. The `[x]` is correct, the parenthetical is not |
| `packages/backend/src/store/observations.ts` | `redactUrlHead` | Userinfo redaction requires `://` | ℹ️ INFO | Executed: `//user:pw@host/a` survives. Unreachable via `rr.request.getUrl()`; disclosed in prose but not on the ENFORCED row |

No `TBD`/`FIXME`/`XXX` debt markers in any source, script or CI file (the `XXXXXX` hits are `mktemp` templates). No `TODO`/`HACK`/`PLACEHOLDER`.

### Human Verification Required

None. Every truth resolved to VERIFIED or FAILED on executed evidence; no truth was left present-but-behavior-unverified. The two judgment-tier prohibitions (CORE-10, STORE-01) carry NON-AUTHORITATIVE verdicts and remain flagged for human review, but they were already accepted by the operator at UAT test 3 and do not introduce new checkpoint items.

### Gaps Summary

One gap, and it is the same one, moved.

The redaction policy that UAT gap 1 asked for is now real: values of `name=value` pairs go, bare `=`-less segments go, `;` path parameters go, userinfo goes, and all four are proven against the real database file with a committed mutation run showing the newest assertion able to fail in isolation. That is substantially more than existed at the last verification, and the CORE-11 gate went from a mechanism with holes I could drive four call forms through to one that caught 24 of 28 shapes I built specifically to break it — including every shape I named last time.

What did not change is the relationship between the claim and the enforcement. `redactDelimitedSegment` decides "this segment is a bare value" by asking whether it contains an `=` byte, and base64 pads with `=`. So the single most common shape of an opaque credential on the wire — a padded 16- or 32-byte token, a SAML blob, an `X-Amz-Security-Token` fragment, a whole HTTP Basic credential — is classified as a parameter NAME and written verbatim into the durable column. I recovered `user:pa55w0rd` out of the stored bytes with one re-pad and one `base64 -d`.

The defect is four lines from being fixed and CR-07 carries the patch. What makes it a blocker rather than a residual is that three artifacts assert it cannot happen, one of them an OPEN list that names one other grammar and misses this one, and that no fixture in any tier — unit or live — is even capable of going red on it. A phase whose subject is gates that can fail honestly cannot ship a claim that has been upgraded past its enforcement for the third review in a row in the same column.

Close CR-07's four lines, add the three padded shapes to `BARE_CREDENTIAL_SHAPES` and a sixth base64 dye to the tracer, and amend the `schema.spec.ts` OPEN list to name what policy deliberately keeps. That is the whole distance to a clean phase.

---

_Verified: 2026-08-21T17:40:00Z_
_Verifier: Claude (gsd-verifier)_
