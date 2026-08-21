---
phase: 01-skeleton-persistence-compatibility
plan: 07
subsystem: persistence
tags: [store, redaction, security, static-gate, tracer, gap-closure]
status: complete

requires:
  - "packages/backend/src/telemetry.ts — describeError, URL_REDACTION, ERROR_TEXT_LIMIT"
  - "packages/backend/test/fixtures/sqlite-fixture.ts"
  - "scripts/phase1/tracer-e2e.sh — the live end-to-end harness plan 01-01 shipped"
provides:
  - "redactQueryValues / QUERY_VALUE_REDACTION / QUERY_NAME_MAX — the write-path redaction"
  - "error-redaction.spec.ts — a four-rule static gate over packages/backend/src/store/"
  - "A live tracer that fails when the redaction is removed"
affects:
  - "01-08 — the pre-policy rows this plan does NOT touch are its subject (T-01-36)"
  - "Phase 2 ERR-02/ERR-04 — they will write analyses.error against the gate added here"

tech-stack:
  added: []
  patterns:
    - "Redact at WRITE, not at read — the durable store must not be looser than the transient RPC"
    - "String splitting only, never a pattern, anywhere reachable from the QuickJS thread"
    - "A static gate ships with its own failure path executed, plus a mutation against the real source"

key-files:
  created:
    - packages/backend/src/store/observations.spec.ts
    - packages/backend/src/store/error-redaction.spec.ts
    - .planning/phases/01-skeleton-persistence-compatibility/results/runs/README-01-07.md
    - .planning/phases/01-skeleton-persistence-compatibility/results/offline/tracer-assertions-offline.md
  modified:
    - packages/backend/src/store/observations.ts
    - packages/backend/src/store/analyses.ts
    - packages/backend/src/store/artifacts.ts
    - packages/backend/src/store/settings.ts
    - packages/backend/src/store/migrations.ts
    - packages/backend/src/store/retention.ts
    - packages/backend/src/store/schema.spec.ts
    - packages/backend/src/ingest/consumer.spec.ts
    - scripts/phase1/tracer-e2e.sh
    - scripts/phase1/env.sh
    - .planning/PROJECT.md
    - .planning/phases/01-skeleton-persistence-compatibility/01-01-PLAN.md
    - .planning/phases/01-skeleton-persistence-compatibility/01-VALIDATION.md

key-decisions:
  - "P7-D1: query VALUES are replaced whole, with no length, hash or fingerprint — a length leaks a token's scheme and an unsalted digest of a low-entropy value is a rainbow-table lookup. The keyed fingerprint is SEC-04's HMAC and belongs to Phase 4."
  - "P7-D2: QUERY_NAME_MAX = 64 bounds a RETAINED parameter name, because a segment with no `=` is syntactically a name and a values-only rule would pass a bare token through verbatim (T-01-31)."
  - "P7-D3: the gate carries a FOURTH rule, unredacted-persisted-error, over error-shaped function PARAMETERS — the three catch-scoped rules cannot reach analyses.ts:194 by construction, and :194 is the one line in the store layer that writes the analyses.error column."
  - "P7-D4 (execution-time correction to the plan): the plan's rationale for the redact-before-truncate test is WRONG for this redactor — truncate-first cannot expose a value, because a value is replaced whole regardless of length. The ordering test asserts the difference that IS observable and the ordering remains the load-bearing invariant. See Deviations."
  - "P7-D5 (operator, 2026-08-21): P1_EXPECT_VERSION moved 0.57.1 -> 0.58.0. An authorised evidence-contract change, not a version bump — 0.57.1 is unobtainable. Phase 0 thresholds are NOT re-measured."

requirements-completed: [STORE-03, STORE-07]

coverage:
  - deliverable: "Query-string VALUES are replaced at the write path; NAMES and their order survive"
    human_judgment: false
    verification:
      - kind: test
        ref: "packages/backend/src/store/observations.spec.ts#redactQueryValues"
        status: pass
      - kind: test
        ref: "packages/backend/src/store/observations.spec.ts#recordObservation writes the redacted URL, not the raw one"
        status: pass
      - kind: test
        ref: "packages/backend/src/ingest/consumer.spec.ts#the observation carries the query NAMES, no query values and no fragment"
        status: pass
      - kind: command
        ref: "bash scripts/phase1/tracer-e2e.sh (run 20260821T102451Z-31716) — secret 0 occurrences in SELECT url FROM observations read with sqlite3"
        status: pass
  - deliverable: "The redaction runs BEFORE truncation to URL_MAX (decision P5-D8)"
    human_judgment: false
    verification:
      - kind: test
        ref: "packages/backend/src/store/observations.spec.ts#REDACTS FIRST AND TRUNCATES SECOND (decision P5-D8)"
        status: pass
  - deliverable: "redactQueryValues is idempotent and executes no pattern"
    human_judgment: false
    verification:
      - kind: test
        ref: "packages/backend/src/store/observations.spec.ts#is IDEMPOTENT — a second pass returns the first pass byte-for-byte"
        status: pass
      - kind: command
        ref: "grep -cE '\\.test\\(|\\.match\\(|\\.exec\\(|\\.matchAll\\(|\\.search\\(|RegExp\\(' over non-comment lines of observations.ts = 0"
        status: pass
  - deliverable: "No module under store/ renders an error-shaped binding without describeError — nine sites"
    human_judgment: false
    verification:
      - kind: test
        ref: "packages/backend/src/store/error-redaction.spec.ts#reports ZERO violations across the store layer"
        status: pass
      - kind: test
        ref: "packages/backend/src/store/error-redaction.spec.ts#enumerates a NON-EMPTY set of store modules, by name"
        status: pass
      - kind: test
        ref: "packages/backend/src/store/error-redaction.spec.ts#the gate's own failure paths (13 fixture cases)"
        status: pass
  - deliverable: "The live tracer proves the secret never reaches the durable column, and FAILS when the redaction is removed"
    human_judgment: false
    verification:
      - kind: command
        ref: "scripts/phase1/tracer-e2e.sh run 20260821T102509Z-4998 — FAILED with redactQueryValues removed, 8 assertions fired"
        status: pass
      - kind: command
        ref: "scripts/phase1/tracer-e2e.sh run 20260821T102525Z-17213 — restored, green, exit code 0"
        status: pass
  - deliverable: "Plan 01-01's must_have truth #2 and the shipped code state the same policy"
    human_judgment: false
    verification:
      - kind: command
        ref: "git diff --stat 18bdbc8..HEAD -- 01-01-PLAN.md = 1 file, 40 insertions, 1 deletion (truth #2 line + appended ## Amendments)"
        status: pass
      - kind: command
        ref: "git status --porcelain 01-0[23456]-PLAN.md = empty; git diff 18bdbc8..HEAD over those five = empty"
        status: pass

metrics:
  duration: "49 min"
  completed: 2026-08-21
  tasks: 3
  files: 35

actuals:
  tokens: 78000
  tasks: 3
  commits: 5
---

# Phase 01 Plan 07: Redaction Policy Gap Closure Summary

**Query-string values are redacted at the write path before they reach `observations.url`, every error-shaped binding in the store layer renders through `describeError`, and both are held by gates whose failure paths have actually been run — including a live tracer that fails when the redaction is removed.**

- **Duration:** 49 min (2026-08-21 09:36:58Z → 10:26:41Z)
- **Tasks:** 3
- **Files changed:** 35 (12 source/script, the rest evidence)
- **Commits:** 5

## Accomplishments

**1. `observations.url` no longer persists a credential.** `redactQueryValues` replaces every query VALUE with `<redacted>` while keeping the parameter NAMES and their order, and `normaliseObservedUrl` now strips the fragment, redacts, then truncates — in that order. The asymmetry that forced this: `telemetry.ts` was already redacting the identical value out of a 240-character error string before it crossed the RPC, while this column was writing it verbatim into a database `db.ts` documents as never garbage-collected, surviving project deletion and surviving force-reinstall. The durable store was looser than the transient channel.

**2. Nine error-render sites converted.** Eight catch clauses plus `finishAnalysis`'s `error` PARAMETER at `analyses.ts:194` — the one line in the store layer that actually writes the `analyses.error` column, and the only error render in the directory that is not inside a catch.

**3. A four-rule static gate that can fail.** `error-redaction.spec.ts` walks the store directory's AST. Three catch-scoped rules (`unredacted-string-call`, `unredacted-template`, `unredacted-concat`) plus `unredacted-persisted-error` for the non-catch parameter render. Thirteen fixture cases execute every rule's failing path AND its negative path; a non-vacuity case asserts the enumeration is non-empty and names all six modules.

**4. The claims in the codebase are now true.** `schema.spec.ts`'s "not a credential dump" claim (`01-REVIEW.md` WR-07) offered two resolutions — correct the claim or change the code. The code changed, so the claim stands, and it now names the enforcing spec instead of resting on prose.

**5. Plan 01-01 amended, its executed record intact.** `must_haves` truth #2 rewritten in place with a dated amendment parenthetical; an appended `## Amendments` section supersedes the four other statements of the old policy by quoted phrase without rewriting a single task body, threat-model row or acceptance bullet.

## Verification Evidence

### `pnpm test` — before and after

```
BEFORE (at 18bdbc8)
 Test Files  28 passed (28)
      Tests  637 passed (637)

AFTER (at 7b33d50)
 Test Files  30 passed (30)
      Tests  673 passed (673)
```

Two new files, +36 assertions, zero failures. The plan's floor was "no fewer than 28 files and no fewer than 637 tests".

### `pnpm check:bundle`

```
$ node scripts/ci/check-bundle-imports.mjs
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

Still exactly one. The redactor pulled in neither `node:url` nor anything else — which is why it is string splitting and not a `URL` constructor.

### `pnpm typecheck` / `pnpm lint` / `pnpm knip`

All exit 0. `typecheck` is also the import-cycle proof: `store/* → telemetry → hooks/admit → engine` is acyclic.

### No-pattern check (task 1 acceptance criterion)

```
$ grep -v '^\s*\*' packages/backend/src/store/observations.ts | grep -v '^\s*//' \
  | grep -cE '\.test\(|\.match\(|\.exec\(|\.matchAll\(|\.search\(|RegExp\('
0
```

`REDOS_RECOVERY` is "kill" on this runtime — SPIKE-01 measured that a catastrophic pattern hangs the QuickJS thread with no interrupt handler and that SIGKILL is the only exit, taking `caido-cli` down with the operator's real project data.

## Mutations — all five RUN, not described

Four gates in this phase were green because they could not fail. Every mutation below was executed and restored.

### A — remove `redactQueryValues` from `normaliseObservedUrl`

```
 FAIL  observations.spec.ts > normaliseObservedUrl > routes through the redaction and still strips the fragment
AssertionError: expected true to be false
 ❯ observations.spec.ts:199:36
    199|     expect(out.includes("secret")).toBe(false);

 FAIL  observations.spec.ts > normaliseObservedUrl > REDACTS FIRST AND TRUNCATES SECOND (decision P5-D8)
 FAIL  observations.spec.ts > recordObservation ... > a round trip through the store keeps `token=` and loses `hunter2`
AssertionError: expected true to be false
 ❯ observations.spec.ts:273:45
    273|     expect(rows[0].url.includes("hunter2")).toBe(false);
 FAIL  observations.spec.ts > recordObservation ... > the JWT case survives the round trip with its parameter name intact

 Test Files  1 failed (1)
      Tests  4 failed | 16 passed (20)
```

### B — reorder to truncate before redacting

```
 FAIL  observations.spec.ts > normaliseObservedUrl > REDACTS FIRST AND TRUNCATES SECOND (decision P5-D8)
AssertionError: expected 'https://x.test/a.js?t=<redacted>' to be 'https://x.test/a.js?t=<redacted>&mark…'

Expected: "https://x.test/a.js?t=<redacted>&marker=<redacted>"
Received: "https://x.test/a.js?t=<redacted>"

      Tests  1 failed | 19 passed (20)
```

### C — revert `analyses.ts:194` to the bare parameter render

The mutation that proves the gate reaches the line that writes the column.

```
 FAIL  error-redaction.spec.ts > ... > reports ZERO violations across the store layer
AssertionError: [
  {
    "file": "analyses.ts",
    "rule": "unredacted-persisted-error",
    "detail": "parameter `error`: String(error) renders an error-shaped binding without describeError(). A driver rejection can carry the statement text and the bound parameters, and one of those parameters is the observation URL."
  }
]: expected [ { file: 'analyses.ts', …(2) } ] to deeply equal []
```

### D — revert an `artifacts.ts` catch site

```
 FAIL  error-redaction.spec.ts > ... > reports ZERO violations across the store layer
AssertionError: [
  {
    "file": "artifacts.ts",
    "rule": "unredacted-string-call",
    "detail": "catch (e): String(e) renders an error-shaped binding without describeError(). A driver rejection can carry the statement text and the bound parameters, and one of those parameters is the observation URL."
  }
]: expected [ { file: 'artifacts.ts', …(2) } ] to deeply equal []
```

### E — the LIVE mutation: redaction removed, real Caido, real database

`run 20260821T102509Z-4998`. The gate whose failure path had never run, run.

```
proxied 2 requests for http://127.0.0.1:8972/defminer-tracer-fixture.js?v=tracer1&access_token=d8cdea113b331aab1eb816153b79abf1
raw url rows: 2

TRACER FAILED:
  - observation url '...?v=tracer1&access_token=d8cdea113b331aab1eb816153b79abf1' still carries the cache buster VALUE 'tracer1'
  - observation url '...' still carries the SECRET VALUE
  - observation url '...' carries no redaction marker
  - observation url '...' still carries the cache buster VALUE 'tracer1'
  - observation url '...' still carries the SECRET VALUE
  - observation url '...' carries no redaction marker
  - the SECRET VALUE occurs 2 time(s) in SELECT url FROM observations read with sqlite3 from OUTSIDE Caido — the durable column is dirty
  - the SECRET VALUE occurs 2 time(s) in observations.json (the RPC)
```

## The live tracer — secret-absence counts

Three runs against live Caido 0.58.0. Full index in `results/runs/README-01-07.md`.

**Green run `20260821T102451Z-31716`:**

```
proxied 2 requests for http://127.0.0.1:8972/defminer-tracer-fixture.js?v=tracer1&access_token=819d2c4a9dd2d1f2f50e3ae135f389ab
plugin db   : /tmp/defminer-probe-20260821T102451Z-31716/plugins/a51eca32-.../data.db
artifacts   : project_id sha256 byte_len kind first_seen_at last_seen_at seen_count
raw url rows: 2

host-computed digest   : cec8f86026513c30a2c5068010eb8bde477050101bb30257f88d7c6bdfdf6d44
digest read back from  : cec8f86026513c30a2c5068010eb8bde477050101bb30257f88d7c6bdfdf6d44
EQUAL                  : True
artifact rows          : 1 seen_count 2
observation rows       : 2 distinct request ids 2
observed url           : http://127.0.0.1:8972/defminer-tracer-fixture.js?v=<redacted>&access_token=<redacted>
secret param name      : access_token= present in raw column: True
SECRET VALUE in raw db : 0 occurrence(s)
SECRET VALUE in RPC    : 0 occurrence(s)
sqlite inside Caido    : 3.46.0
schema version         : 2
max event->reload ms   : 49

TRACER PASSED
```

The raw column, read with `sqlite3` from outside Caido:

```
$ cat results/runs/20260821T102451Z-31716/observations-url-raw.txt
http://127.0.0.1:8972/defminer-tracer-fixture.js?v=<redacted>&access_token=<redacted>
http://127.0.0.1:8972/defminer-tracer-fixture.js?v=<redacted>&access_token=<redacted>
```

**Restore run `20260821T102525Z-17213`:** `TRACER EXIT CODE = 0`, `SECRET VALUE in raw db : 0`, `SECRET VALUE in RPC : 0`.

`SECRET_VALUE` is sixteen bytes of `openssl rand -hex 16` regenerated per run, so no assertion here can be satisfied by a hard-coded expectation.

## Deviations from Plan

### 1. [Rule 1 — Correction] The plan's rationale for the ordering test is wrong for this redactor

**Found during:** Task 1, writing the ordering case.

**Issue:** The plan states "Truncate-first would leave its leading characters" and asks for an assertion that a 3000-character token is absent from a 2048-character result. That reasoning does not hold for the redactor this plan specifies. Because a value is replaced **whole** regardless of its length, and `URL_MAX` truncation only removes a **tail**, the first `=` of every segment is stable under truncation — so truncate-first can never expose a value either. The requested assertion would have passed under both orderings: a test green for the wrong reason, which is the exact failure class this phase has been bitten by four times.

**Fix:** I did not write the test as specified. The ordering case asserts the difference that **is** observable — parameter names past the truncation point survive under redact-first and are lost under truncate-first — and mutation B confirms it fails when the two lines are swapped. The spec comment states plainly why the ordering is nonetheless the load-bearing invariant rather than a nicety: **the moment any future redactor preserves a length, a prefix or a fingerprint of a value, truncate-first leaks immediately.** Pinning the order now is what stops that change from being silent.

**Files modified:** `packages/backend/src/store/observations.spec.ts`. **Commit:** `18c6f41`, `f0fb3c6`.

### 2. [Rule 3 — Blocker] `consumer.spec.ts:218` corrected inside task 1

**Found during:** Task 1 GREEN.

**Issue:** Task 1's behaviour change made `consumer.spec.ts:218` red, but the plan assigns that file to task 3. Leaving a failing test across two commits breaks `git bisect` and ships a red tree.

**Fix:** Minimal one-line expected-value correction inside task 1's GREEN commit. Task 3 then did the substantive work the plan assigns it there — a credential-shaped parameter in the fixture, the substring assertion, the case rename and the rewritten rationale comment.

**Files modified:** `packages/backend/src/ingest/consumer.spec.ts`. **Commits:** `f0fb3c6` (minimal), `22114e5` (substantive).

### 3. [Rule 1 — Bug in the plan] "seven gap-plan tasks" is an undercount; the real number is eight

**Found during:** Task 3, building the validation ledger.

**Issue:** The plan's acceptance criterion asks for "a row for each of the seven gap-plan tasks". Plans 01-07, 01-08 and 01-09 contain **eight** tasks (3 + 3 + 2) — 01-08 has three, not two, and its `checkpoint:decision` is **Task 2**, not Task 1. Writing the ledger from the plan's number would have produced a map that misdescribes 01-08.

**Fix:** The map is built from the plans' actual task lists: eight rows with real requirement IDs, real threat refs and each task's real `<automated>` command copied from its `<verify>` block. The undercount is noted in `01-VALIDATION.md` itself so the discrepancy is visible rather than silently reconciled. `01-08/T2` is recorded as the one row with no automated verify, which is correct for a `checkpoint:decision` over a one-way deletion.

**Files modified:** `.planning/phases/01-skeleton-persistence-compatibility/01-VALIDATION.md`. **Commit:** `22114e5`.

### 4. [Precondition unmet → operator decision] `P1_EXPECT_VERSION` 0.57.1 → 0.58.0

**Found during:** Task 3, at the tracer's preflight.

**Issue:** The task's precondition names Caido 0.57.1. The host has 0.58.0 — the app bundle auto-upgraded **in place** (mtime 2026-08-20 12:49); it is the same binary that ran leg A of `compat-smoke.json` as 0.57.1. 0.57.1 cannot be recovered: `~/.caido/caido-cli` is 0.55.3, `.caido-bin/` holds only 0.58.0, and it cannot be re-fetched because `fetch-caido.sh`'s `PINNED_SHA512` has no 0.57.1 entry and decision P6-D5 recorded that `api.caido.io` 404s every non-`latest` version. Downloading it unpinned is precisely the supply-chain hole that gate exists to close.

```
$ bash scripts/phase1/tracer-e2e.sh
FATAL: expected Caido 0.57.1, got 0.58.0
```

**Resolution:** I halted with a `gate="blocking-human"` checkpoint rather than working around it — an unmet precondition is never auto-approved. The operator chose to accept 0.58.0 as the tracer runtime.

**The cost, recorded rather than glossed.** `env.sh` line 48 read *"The Caido build every Phase 0 threshold was measured on"*. That sentence is now false, so it is gone rather than left standing. **Compatible is not re-measured:** plan 01-06 proved all 16 SDK surfaces behave identically across the two builds and that leg B reports `compatible: true` — a statement about surface **behaviour**, not about timing or memory. Every threshold in `go-no-go.json` was measured on 0.57.1 and none has been re-measured. A phase that wants to trust a Phase 0 **number** on 0.58.0 must re-measure it first. The full reasoning is committed at the line itself and in PROJECT.md's Key Decisions.

**Why it is safe for the thing it unblocked:** 01-07's tracer asserts query redaction, which is plugin-side string handling with no version-dependent behaviour. It is not a threshold measurement.

**A fail-closed tripwire is already in place, and I verified it rather than assuming it.** `P1_EXPECT_VERSION` is shared by three harnesses — `tracer-e2e.sh`, `spa-load.sh` (CORE-10 timing) and `runtime-answers.sh` (Open Questions 1 and 2) — so the change genuinely widens past 01-07's tracer, exactly as the coordinator flagged. But `tests/phase1-load.spec.ts:34` and `tests/phase1-runtime.spec.ts:18` still hard-code `EXPECTED_CAIDO_VERSION = "0.57.1"` and assert it against the committed results artifacts. Re-running either harness on 0.58.0 therefore writes `0.58.0` into its artifact and **fails those specs loudly** rather than silently contaminating a threshold. No spec reads `results/runs/`, which is why the tracer runs do not trip it and `pnpm test` stayed at 673/673.

**Files modified:** `scripts/phase1/env.sh`, `.planning/PROJECT.md`. **Commit:** `7b33d50`.

### 5. [Documented] The offline assertion harness, and what it is not

**Found during:** Task 3, while the live run was blocked.

Rather than ship the tracer's new assertion logic unexercised, I extracted its python block **verbatim** and ran it against three synthetic fixtures (`results/offline/tracer-assertions-offline.md`): exit 0 on the redacted shape, exit 1 on a read-path-only redaction, exit 1 on no redaction.

Now that the live runs exist, here is precisely what each covers, so neither is mistaken for the other:

| | Offline harness | Live runs |
|---|---|---|
| What it proves | The assertion **logic** is correct and can fail | The **system** is correct end to end |
| Runs against | Fabricated JSON and a fabricated raw dump | A real Caido, a real proxy, a real SQLite file |
| Read-path-only redaction (RPC clean, column dirty) | **Covered** — case B | Not reachable without a second mutation |
| Real driver, real schema, real pooled connection | No | Yes |

The offline harness is a supplement and **is not a substitute** for the live proof. It is kept, and labelled as such in both the file and the runs README.

**Total deviations:** 3 auto-fixed (2× Rule 1, 1× Rule 3), 1 escalated to a blocking-human checkpoint and resolved by operator decision, 1 documented addition. **Impact:** two of the three auto-fixes corrected errors *in the plan* rather than in the code — the ordering rationale and the task count. Both would have produced artifacts that passed while describing something untrue.

## Deliberately Out of Scope

- **`compat.ts` and `hooks/passive.ts`** also render caught exceptions with a bare `String(e)`. Outside the store layer, outside the UAT gap, and outside the gate's scope by explicit design (T-01-37, disposition `accept`). Recorded in the gate's own header so the boundary is visible in the code, not only here. Widening it is a one-line change to `STORE_DIR`.
- **Rows written BEFORE this plan** still carry verbatim query values (T-01-36, disposition `transfer`). This is plan 01-08's subject, and it opens with a `checkpoint:decision` because destroying them is one-way. Until 01-08 resolves, the exposure stands, bounded only by STORE-06's 90-day retention.

## Known Stubs

None. No hardcoded empty value, no placeholder text and no unwired component was introduced.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. The one new file read is `readdirSync`/`readFileSync` over the repository's own source, inside a spec, at test time only.

## Issues Encountered

One, resolved: the task 3 precondition was unmet and required an operator decision (deviation 4). No unresolved issues.

Untracked and left alone, out of scope per the scope boundary: `results/runs/20260821T075936Z-12874/` predates this session and belongs to an earlier plan's run.

## Next Phase Readiness

Ready for `01-08`, whose `checkpoint:decision` this plan's threat register explicitly transfers T-01-36 to. Phase 2's ERR-02/ERR-04 authors now have a gate that tells them the truth about what the `analyses.error` column guarantees — which is why `analyses.ts:194` was fixed now, while the consumer still passes `null`, rather than later.
## Self-Check: PASSED

Run 2026-08-21 after writing this SUMMARY.

- All four `key-files.created` exist on disk (`[ -f ]` verified).
- All six commits resolve in `git log --oneline --all`: `18c6f41`, `f0fb3c6`, `40d7610`, `22114e5`, `7b33d50`, `6106420`.
- Plan-level `<verification>` re-run at HEAD: `pnpm test` 30 files / 673 tests, zero failures; `pnpm typecheck`, `pnpm lint`, `pnpm knip` exit 0; `pnpm check:bundle` reports `1 import specifier(s): crypto`; `bash scripts/phase1/tracer-e2e.sh` exit 0.
- `git status --porcelain` over `01-02-PLAN.md` … `01-06-PLAN.md` is empty, and `git diff 18bdbc8..HEAD` over those five files is empty — byte-identical.
- `git diff --stat 18bdbc8..HEAD -- 01-01-PLAN.md` = 1 file, 40 insertions, 1 deletion: the truth #2 line plus the appended `## Amendments` section, nothing else.
- Every mutation named in an acceptance criterion was RUN and its output is pasted above, not described.
