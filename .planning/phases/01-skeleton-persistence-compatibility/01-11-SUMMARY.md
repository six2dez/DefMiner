---
phase: 01-skeleton-persistence-compatibility
plan: 11
subsystem: security
tags: [url-redaction, path-redaction, redos, ast-gate, typescript-compiler-api, sqlite, telemetry]

requires:
  - phase: 01-07
    provides: "`redactQueryValues` and the redact-then-truncate write path this plan extends to two more grammars"
  - phase: 01-10
    provides: "decision P10-D1 — a bare (`=`-less) segment is a value with no name — which the `;` delimiter inherits by construction through one shared helper"
provides:
  - "`redactUrlHead` — URL userinfo and `;`-delimited path parameters redacted before `observations.url` is written, by the SAME policy as a query parameter"
  - "`redactPaths` / `PATH_REDACTION` in `telemetry.ts` — an absolute filesystem path, and the operator's OS username inside it, no longer crosses the `getStatus` RPC"
  - "a MEASURED linearity bound on `redactUrls` — 200,000-character adversarial near-miss input under a 250 ms ceiling — replacing the argued one"
  - "`auditPatternUse` — an AST-anchored no-pattern gate over `observations.ts` AND `telemetry.ts`, with a count-plus-anchor exemption for the one permitted literal"
  - "`ERROR_TEXT_LIMIT <= ERROR_MAX` as an executed assertion rather than a comment (IN-11)"
affects: [01-12, 01-13, 01-14, phase-02-observability, phase-04-sec-04-hmac]

actuals:
  tokens: 20974
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - "count-plus-anchor exemption: a gate permits a construct by NUMBER and by the declaration it must sit inside, never by file name"
    - "mutation-proof-per-claim: every enforcement claim in this plan was proven by reverting it and capturing the named failure"
    - "residuals are PINNED by an executed case, not named in a sentence"

key-files:
  created: []
  modified:
    - packages/backend/src/store/observations.ts
    - packages/backend/src/store/observations.spec.ts
    - packages/backend/src/telemetry.ts
    - packages/backend/src/telemetry.spec.ts
    - packages/backend/src/store/analyses.ts
    - packages/backend/src/store/schema.spec.ts
    - .planning/phases/01-skeleton-persistence-compatibility/01-RESEARCH.md

key-decisions:
  - "The `;` delimiter is a second DELIMITER, not a second POLICY: `redactDelimitedSegment` is the single implementation both the query loop and the path loop call, so P10-D1's bare-segment rule reaches `;` by construction rather than by a second edit."
  - "URL userinfo is resolved inside the AUTHORITY component only — after the first `://`, up to the first `/`, `?` or `#` — never by searching the whole string for an `@`, because an `@`-anywhere rule silently corrupts every Vite and scoped-npm URL."
  - "BOTH halves of the userinfo are replaced and the `@` is KEPT: the fact that the URL carried credentials survives, the bytes do not, and the step is idempotent for free."
  - "`redactPaths` is a STRING SCAN, not WR-12's suggested `(?:\\/[A-Za-z0-9._-]+){2,}` — that nests a quantifier inside a quantifier, contradicting `telemetry.ts`'s own no-nesting discipline one function away, on a runtime where the recovery from getting it wrong is SIGKILL."
  - "`redactUrls`'s safety claim is now a MEASUREMENT, not an argument about the pattern's shape. The argued claim was deleted from the header and replaced with a citation of the executed case."
  - "The `telemetry.ts` exemption is a COUNT plus an ANCHOR — exactly one literal, inside `redactUrls` — so moving or renaming it fails the gate, which is the moment a linearity measurement is owed for whatever moved."
  - "The path-embedded token is NOT closed and the reason is specific: entropy scoring has no measured false-positive rate in Phase 1 and would shred hashed asset names; a pattern is forbidden by REDOS_RECOVERY=\"kill\". It is pinned by a case that goes RED the day somebody closes it."

patterns-established:
  - "Count-plus-anchor exemption: a gate that must permit one instance of a forbidden construct states HOW MANY and WHERE, so relocation is a failure rather than a silent pass."
  - "Claim-matches-reach: when a module's stated guarantee becomes false through a new import, the CLAIM is narrowed and the transitive dependency is named with the assertion that bounds it — not left as the old sentence."
  - "Residual-with-size-of-job: each unclosed hole records what closing it would cost (a second separator in the same scan; a measured false-positive rate) so the next author is not guessing."

requirements-completed: [STORE-03, STORE-07]

coverage:
  - id: D1
    description: "URL userinfo does not reach `observations.url` — both halves replaced, the `@` kept, resolved inside the authority component only"
    requirement: STORE-03
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#userinfo with a password: NEITHER half survives, and the `@` does"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#resolves userinfo inside the AUTHORITY ONLY — an `@` after the first `/` is PATH"
        status: pass
      - kind: integration
        ref: "packages/backend/src/store/observations.spec.ts#recordObservation writes the redacted URL, not the raw one"
        status: pass
    human_judgment: false
  - id: D2
    description: "A `;`-delimited path-parameter value is redacted by the same rule and the same helper as a query parameter — one policy, two delimiters"
    requirement: STORE-03
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#a `;jsessionid=` path parameter keeps its NAME and loses its VALUE"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#a BARE `;` segment follows decision P10-D1 exactly as a bare QUERY segment does — ONE policy, two delimiters"
        status: pass
    human_judgment: false
  - id: D3
    description: "The plugin-database path — and the operator's OS username inside it — does not cross the getStatus RPC"
    requirement: STORE-07
    verification:
      - kind: integration
        ref: "packages/backend/src/telemetry.spec.ts#is absent from EVERY string in the object the registered RPC returns"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#removes the OS username from a plugin-database path — the macOS shape, spaces and all"
        status: pass
    human_judgment: false
  - id: D4
    description: "`redactUrls` is proven backtrack-free by measurement against a 200,000-character adversarial input, not by an argument about its shape"
    requirement: STORE-03
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#renders a 200,000-character adversarial near-miss input inside 250 ms"
        status: pass
    human_judgment: false
  - id: D5
    description: "The no-pattern gate reads the AST over BOTH `observations.ts` and `telemetry.ts`, under a count-plus-anchor exemption, and cannot be defeated or tripped by a comment"
    requirement: STORE-03
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#neither observations.ts nor telemetry.ts executes an unbounded pattern (T-01-60, T-01-77)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#the pattern gate's own failure paths, EXECUTED"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#this module's own comments name every forbidden construct and it STILL reports clean"
        status: pass
    human_judgment: false
  - id: D6
    description: "`ERROR_TEXT_LIMIT <= ERROR_MAX` is an executed assertion bound to both real constants, with no numeric literal (IN-11)"
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#caps at ERROR_TEXT_LIMIT, and ERROR_TEXT_LIMIT <= ERROR_MAX (IN-11)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The path-embedded token is named as the ONE residual with its reason, pinned by an executed case in every document that describes this column"
    requirement: STORE-03
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#RESIDUAL, PINNED: a token embedded in a path SEGMENT is NOT redacted"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#COLUMN_ALLOWLIST"
        status: pass
    human_judgment: true
    rationale: "Whether the residual's stated REASON is acceptable — that Phase 1 has no measured false-positive rate for entropy scoring and no permission for a pattern — is an operator judgment about accepted risk, not something a test can assert. The BEHAVIOUR is pinned; the acceptance is not."

duration: 30 min
completed: 2026-08-21
status: complete
---

# Phase 01 Plan 11: Close the Three URL Grammars Outside the Query, and Deliver WR-03's Other Half — Summary

**URL userinfo and `;` path parameters are redacted before `observations.url` is written by the same helper the query loop calls; the operator's OS username no longer crosses the `getStatus` RPC inside a plugin-database path; and the one pattern this code reaches is now bounded by a 200k-character measurement behind an AST gate that reads both modules under a count-plus-anchor exemption.**

## Performance

- **Duration:** ~30 min across two executor sessions
- **Started:** 2026-08-21 (session 1), resumed 2026-08-21T13:41Z (session 2)
- **Completed:** 2026-08-21T13:53Z
- **Tasks:** 3 of 3
- **Files modified:** 7

## EXECUTOR RESTART — read this before the mutation blocks

**This plan was executed by two agents.** The first completed task 1 (commits `a79057d`, `2bc42d0`, `6e214ab`) and the IN-11 half of task 2 (`02ceee5`), then died on a transient API error at a commit boundary. The working tree was clean; nothing needed reverting.

**Task 1's two mutations were RE-RUN by the second executor**, and this is deliberate rather than defensive. The first agent's mutation output was lost with its context, and an unrun mutation recorded as run is exactly the dishonesty this whole gap-closure round exists to remove — it is the same defect as a claim wider than its enforcement, pointing the other way. Every one of the six failure blocks below was produced by the agent that wrote this SUMMARY. None is quoted from a prior session, and none is reconstructed from memory.

## Accomplishments

- **Task 1 (session 1, verified and re-mutated in session 2)** — `redactUrlHead` resolves userinfo inside the authority component and applies the query rule to `;` path parameters through `redactDelimitedSegment`, the single helper the query loop already calls. `schema.spec.ts`'s T-01-21 paragraph and `01-RESEARCH.md`'s stolen-database threat row were both corrected from claims to enforcement, with a dated in-place note rather than a silent rewrite.
- **Task 2** — `redactPaths` and `PATH_REDACTION` in `telemetry.ts`, applied after `redactUrls` and before the `ERROR_TEXT_LIMIT` slice. Implemented as a string scan, with WR-12's suggested regex explicitly declined and the reason recorded. `redactUrls`'s argued linearity claim replaced by a citation of an executed 200k-character measurement. `schema.spec.ts`'s `analyses.error` entry corrected from "URL-shaped substrings" to the two grammars the redactor actually matches, with the scheme-relative residual named. IN-11 closed.
- **Task 3** — the line-filtered substring scan replaced by `auditPatternUse`, a pure AST walk shaped like `error-redaction.spec.ts`'s `auditSource`, scoped to `observations.ts` AND `telemetry.ts`, with the one permitted literal held by a count plus an anchor rather than a file-name skip. The module-level "executes no pattern" claim narrowed to what it enforces, naming `describeError` as the transitive pattern and citing the measurement that bounds it.

## Task Commits

1. **Task 1: Redact the URL head (RED)** — `a79057d` (test)
2. **Task 1: Redact the URL head (GREEN)** — `2bc42d0` (feat)
3. **Task 1: State the enforcement in schema.spec.ts and 01-RESEARCH.md** — `6e214ab` (docs)
4. **Task 2: IN-11 — assert `ERROR_TEXT_LIMIT <= ERROR_MAX`** — `02ceee5` (test)
5. **Task 2: absolute-path redaction (RED)** — `c2033f2` (test)
6. **Task 2: absolute-path redaction (GREEN) + `analyses.error` correction** — `b2512f9` (feat)
7. **Task 3: AST-anchored pattern gate over both modules** — `b7e4e2f` (test)

**Plan metadata:** see the `docs(01-11)` commit that carries this file.

## Files Created/Modified

- `packages/backend/src/store/observations.ts` — `redactUrlHead` added and composed into `normaliseObservedUrl`; the path-embedded-token residual recorded beside the path loop with its reason and its pinning case.
- `packages/backend/src/store/observations.spec.ts` — `HEAD_CASES` (13 shapes: seven MUST-REDACT, five MUST-NOT-TOUCH, one pinned residual), the isolation cases for `redactUrlHead`, and `auditPatternUse` with every rule's failing path executed inline.
- `packages/backend/src/telemetry.ts` — `PATH_REDACTION`, `redactPathToken`, `redactPaths`; `describeError` rewired to `redactPaths(redactUrls(text)).slice(...)`; `redactUrls`'s argued-shape paragraph replaced by a citation of the measurement and of the gate that enforces its one-literal permission.
- `packages/backend/src/telemetry.spec.ts` — the path-redaction cases, the diagnosability cases, the RPC-level walk, and the measured-linearity case.
- `packages/backend/src/store/analyses.ts` — `ERROR_MAX` exported for the assertion; the "unreachable in practice" comment corrected to unreachable by construction (session 1).
- `packages/backend/src/store/schema.spec.ts` — the `observations.url` justification and T-01-21 paragraph (task 1), and the `analyses.error` justification (task 2), each owned by exactly one task with no overlap.
- `.planning/phases/01-skeleton-persistence-compatibility/01-RESEARCH.md` — exactly one changed table row.

## THE SIX MUTATIONS — RUN, VERBATIM

Every block below is output this executor produced. Each mutation was reverted with `git checkout --` and the suite re-run green before the next.

### Mutation 1 — the userinfo step removed from `redactUrlHead` (task 1, RE-RUN)

Reverted `authority = QUERY_VALUE_REDACTION + authority.slice(at)` to a no-op. **10 failed | 84 passed (94).**

```
 FAIL  packages/backend/src/store/observations.spec.ts > the URL HEAD — userinfo and `;` path parameters (WR-11, T-01-57, T-01-58) > userinfo with a password: NEITHER half survives, and the `@` does
AssertionError: expected 'https://user:pa55w0rd@cdn.test/app.js' to be 'https://<redacted>@cdn.test/app.js' // Object.is equality

Expected: "https://<redacted>@cdn.test/app.js"
Received: "https://user:pa55w0rd@cdn.test/app.js"

 ❯ packages/backend/src/store/observations.spec.ts:570:42
    568|   for (const c of HEAD_CASES) {
    569|     it(c.name, () => {
    570|       expect(normaliseObservedUrl(c.in)).toBe(c.out);
       |                                          ^
    571|     });
    572|   }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/10]⎯
 FAIL  packages/backend/src/store/observations.spec.ts > the URL HEAD — userinfo and `;` path parameters (WR-11, T-01-57, T-01-58) > the credential literals do not survive ANYWHERE in the output
AssertionError: pa55w0rd survived in https://user:pa55w0rd@cdn.test/app.js: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true
```

### Mutation 2 — the `;` path-parameter step removed (task 1, RE-RUN)

Deleted the per-segment `;` loop. **9 failed | 85 passed (94).**

```
 FAIL  packages/backend/src/store/observations.spec.ts > the URL HEAD — userinfo and `;` path parameters (WR-11, T-01-57, T-01-58) > a `;jsessionid=` path parameter keeps its NAME and loses its VALUE
AssertionError: expected 'https://cdn.test/a.js;jsessionid=SECR…' to be 'https://cdn.test/a.js;jsessionid=<red…' // Object.is equality

Expected: "https://cdn.test/a.js;jsessionid=<redacted>"
Received: "https://cdn.test/a.js;jsessionid=SECRETSESSION"

 ❯ packages/backend/src/store/observations.spec.ts:570:42
    568|   for (const c of HEAD_CASES) {
    569|     it(c.name, () => {
    570|       expect(normaliseObservedUrl(c.in)).toBe(c.out);
       |                                          ^
    571|     });
    572|   }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/9]⎯
AssertionError: SECRETSESSION survived in https://cdn.test/a.js;jsessionid=SECRETSESSION: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ packages/backend/src/store/observations.spec.ts:587:68
```

After restoring: `git diff --exit-code packages/backend/src/store/observations.ts` clean, `94 passed (94)`.

### Mutation 3 — the `redactPaths` call removed from `describeError` (task 2)

**6 failed | 41 passed (47).** The RPC case fails naming the fixture username, not merely reporting a string mismatch:

```
 FAIL  packages/backend/src/telemetry.spec.ts > the plugin-database path does not cross the getStatus RPC (STORE-07) > is absent from EVERY string in the object the registered RPC returns
AssertionError: the operator's OS username crossed the getStatus RPC inside a server-side filesystem path. DEPLOY-02: the backend filesystem is not the operator's machine, and `sdk.meta.path()` carries the username in every real deployment.: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "$.reason = init failed: Error: SQLITE_CANTOPEN: unable to open database file: '/Users/defminer-fixture-operator/Library/Application Support/io.caido.Caido/plugins/5f2a1c9e-0b44-4d18-9c31-7d6e2a8b41ff/data.db'",
+ ]

 ❯ packages/backend/src/telemetry.spec.ts:643:7
    641|         "not the operator's machine, and `sdk.meta.path()` carries the…
    642|         "username in every real deployment.",
    643|     ).toEqual([]);
       |       ^
```

### Mutation 4 — a regex literal planted in a function body of `observations.ts` (task 3)

Inserted `if (/^\s*$/.test(segment)) return "";` at the top of `redactDelimitedSegment`. Two rules fire, each naming the file, the line and the construct:

```
 FAIL  packages/backend/src/store/observations.spec.ts > neither observations.ts nor telemetry.ts executes an unbounded pattern (T-01-60, T-01-77) > packages/backend/src/store/observations.ts executes no pattern beyond its stated exemption
AssertionError: packages/backend/src/store/observations.ts reaches a pattern. REDOS_RECOVERY is "kill" on this runtime and SIGKILL is the only exit.: expected [ …(2) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "pattern-execution: observations.ts:109 calls .test(), which executes a pattern by definition.",
+   "regex-literal: observations.ts:109 holds a regular-expression literal. This module executes no pattern; string splitting only.",
+ ]
```

### Mutation 5 — a banned method name planted, with NO literal (task 3)

`segment.indexOf("=")` swapped for `segment.search("=")` — a realistic near-equivalent regression that carries no regex literal, so it isolates rule 3:

```
 FAIL  packages/backend/src/store/observations.spec.ts > neither observations.ts nor telemetry.ts executes an unbounded pattern (T-01-60, T-01-77) > packages/backend/src/store/observations.ts executes no pattern beyond its stated exemption
AssertionError: packages/backend/src/store/observations.ts reaches a pattern. REDOS_RECOVERY is "kill" on this runtime and SIGKILL is the only exit.: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "pattern-execution: observations.ts:109 calls .search(), which executes a pattern by definition.",
+ ]
```

### Mutation 6 — `redactPaths` rewritten as WR-12's suggested regex in `telemetry.ts` (task 3)

**This is the one that proves the widened scope is load-bearing rather than decorative.** The mutation is the REAL regression WR-12 recommended and task 2 declined — `(?:\/[A-Za-z0-9._-]+){2,}` — not a synthetic one. The gate names the file, the count, the exemption it exceeded, and separately the anchor it violated:

```
 FAIL  packages/backend/src/store/observations.spec.ts > neither observations.ts nor telemetry.ts executes an unbounded pattern (T-01-60, T-01-77) > packages/backend/src/telemetry.ts executes no pattern beyond its stated exemption
AssertionError: packages/backend/src/telemetry.ts reaches a pattern. REDOS_RECOVERY is "kill" on this runtime and SIGKILL is the only exit.: expected [ …(2) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "exemption-exceeded: telemetry.ts holds 2 regex literals; the exemption permits exactly 1, inside `redactUrls`, bounded by telemetry.spec.ts's measured-linearity case. Lines: 269, 381. A second pattern needs its own linearity MEASUREMENT before it can be permitted.",
+   "exemption-anchor: telemetry.ts:381 holds a regex literal inside `redactPaths`, but the exemption is anchored to `redactUrls`. Moving or renaming it requires updating the exemption — which is the moment a linearity measurement is owed for whatever moved.",
+ ]
```

After restoring all three task-3 mutations: `git diff --exit-code packages/backend/src/store/observations.ts packages/backend/src/telemetry.ts` returns clean.

## THE IN-11 COMPILE FAILURE, RECORDED

The plan required the `ERROR_TEXT_LIMIT <= ERROR_MAX` assertion be written BEFORE `ERROR_MAX` was exported, and the compile failure captured as the cheapest possible proof that the assertion binds the real constant rather than a copy of its value. Session 1 did that for `ERROR_MAX`. Session 2 reproduced the identical mechanism for `PATH_REDACTION` while writing task 2's RED phase — the assertion referenced the constant by name before the export existed, and `tsc --build` said so:

```
$ tsc --build
packages/backend/src/telemetry.spec.ts(35,3): error TS2305: Module '"./telemetry"' has no exported member 'PATH_REDACTION'.
[ELIFECYCLE] Command failed with exit code 2.
```

No numeric literal and no string literal for either marker appears in the assertions; both are referenced by name, so the tests cannot keep passing while the code that matters drifts.

## Decisions Made

Recorded in the frontmatter `key-decisions` block. The two worth restating in prose:

**The `telemetry.ts` exemption is a count plus an anchor.** It would have been half a line shorter to skip the file by name. That version passes mutation 6's regex rewrite silently, which is the entire failure this task exists to close, and it is also the version a future reader would copy. The mechanism is stated in the gate's header for that reason.

**`redactPaths` declines WR-12's patch.** The review suggested a regex; the plan rejected it; this executor implemented the rejection rather than the suggestion. The reason is recorded in the source next to the function, not only in this SUMMARY, and it is now ENFORCED by the gate rather than depending on a future author re-reading the paragraph.

## Deviations from Plan

**1. [Rule 3 — Blocking] `pnpm lint` failed on prettier formatting after each new block**
- **Found during:** Tasks 2 and 3
- **Issue:** Hand-written multi-line string concatenations and long `expect(...)` chains did not match prettier's wrapping. 5 errors after task 2's block, 17 after task 3's.
- **Fix:** `pnpm exec eslint --fix` on the touched files only. Diffs inspected afterwards to confirm formatting-only changes — no logic was reflowed.
- **Files modified:** `packages/backend/src/telemetry.ts`, `packages/backend/src/telemetry.spec.ts`, `packages/backend/src/store/observations.spec.ts`
- **Verification:** `pnpm lint` exits 0; the specs still pass with identical counts.
- **Committed in:** `b2512f9`, `b7e4e2f` (part of the task commits)

**2. [Rule 1 — Bug] The redact-before-truncate case was written so it could not fail**
- **Found during:** Task 2, RED phase
- **Issue:** The first draft built the fixture as `"y".repeat(5_000) + " " + PLUGIN_DB_PATH`. With the path in the TAIL, truncation alone removes the username, so the case passed against the unfixed implementation. It measured the truncation, not the ordering — the same unfalsifiable-case defect this whole round exists to remove.
- **Fix:** Fixture inverted to `PLUGIN_DB_PATH + " " + "y".repeat(5_000)`, putting the username inside the surviving 240 characters. RED count went from 5 to 6.
- **Files modified:** `packages/backend/src/telemetry.spec.ts`
- **Verification:** The case fails against the unfixed implementation and passes after; a comment in the case records why the path goes first.
- **Committed in:** `c2033f2`

---

**Total deviations:** 2 auto-fixed (1× Rule 3 blocking, 1× Rule 1 bug).
**Impact on plan:** None on scope. The second is the more important one: it was caught before the GREEN commit, by asking of a passing case the question this plan asks of every claim — could this have failed?

## Issues Encountered

**The executor died mid-plan on a transient API error.** Recovery required verifying the on-disk state rather than trusting a handoff, since the dead agent wrote none. The working tree was clean at a commit boundary; task 1 and the IN-11 half of task 2 were confirmed present in the source and the git log before any new work started. Task 1's two mutations were re-run rather than inherited — see the restart note above.

**knip did not object to `ERROR_MAX`,** as the plan's verification step 6 predicted from the config and the on-disk precedent. `pnpm knip` exits 0 with the export in place. The plan's STOP-and-report branch was therefore never taken, the assertion was not moved, and the export was not deleted.

## Known Stubs

None. The two residuals this plan leaves are not stubs — they are measured, named, and pinned:

| Residual | Where | Pinned by |
|----------|-------|-----------|
| A token embedded in a path SEGMENT is not redacted | `observations.ts`, beside the path loop | `observations.spec.ts` — "RESIDUAL, PINNED: a token embedded in a path SEGMENT is NOT redacted" |
| A Windows `C:\Users\…` path is not redacted; a path containing a space loses only the portion before the space | `telemetry.ts`, beside `redactPaths` | Named in the source and in `schema.spec.ts`'s `analyses.error` entry with the size of the job (one more separator in the same scan) |
| A scheme-relative `//cdn/app.js?token=T` survives `redactUrls` | `schema.spec.ts`'s `analyses.error` entry | Named with the reason the store layer is not exposed to it (every URL bound into a store statement has already been through `normaliseObservedUrl`) |

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm vitest run .../observations.spec.ts` | 107 passed |
| `pnpm vitest run .../telemetry.spec.ts` | 47 passed |
| `pnpm vitest run .../schema.spec.ts tests/schema.spec.ts` | 39 passed |
| `pnpm test` | **31 files / 807 tests, zero failures** (baseline at plan start: 31 / 780) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 |
| `pnpm build:backend && pnpm check:bundle` | `1 import specifier(s): crypto` |
| Six mutations run, each restored | `git diff --exit-code` clean on both source files |
| Evidence records untouched | `git status --porcelain` empty for `01-VERIFICATION.md`, `01-REVIEW.md`, `01-UAT.md` |
| Plans `01-01`…`01-10` untouched | `git status --porcelain` empty |
| `scripts/ci/check-bundle-imports.mjs` | untouched (P9-D2) |

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change was introduced. Every change in this plan narrows an existing surface: `T-01-57`, `T-01-58`, `T-01-59`, `T-01-60`, `T-01-77` and `T-01-61` are mitigated as the threat register specified, and `T-01-55` (a claim wider than its enforcement) is discharged further in all three of the documents that describe these two columns.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

Ready for **01-12** (CORE-01 outbound-prohibition gate) and **01-13** (the widened STORE-07 gate). Two notes for those plans:

- **01-13 runs over `analyses.ts` expecting zero violations.** This plan added only an `export` keyword and a corrected comment there — no logic, no SQL, no other export — so that expectation still holds.
- **`telemetry.ts` now holds `redactPaths` in addition to `redactUrls`,** and `observations.spec.ts`'s `auditPatternUse` reads that module. A plan that adds a pattern to `telemetry.ts` for any reason will fail that gate until it also supplies a linearity measurement. That is the intent.

**01-14** runs the live tracer once after both redaction plans have landed; the write path this plan changed is covered by `scripts/phase1/tracer-e2e.sh` in that run.

## Self-Check: PASSED

- All 7 task commits present in `git log --oneline --all`: `a79057d`, `2bc42d0`, `6e214ab`, `02ceee5`, `c2033f2`, `b2512f9`, `b7e4e2f`
- All 7 modified files present on disk and non-empty
- `pnpm test` re-run after the final restore: 31 files / 807 tests, zero failures
- All six mutations produced named failures and were reverted to a clean diff

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-21*
