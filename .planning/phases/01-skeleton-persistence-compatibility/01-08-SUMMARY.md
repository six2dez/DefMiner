---
phase: 01-skeleton-persistence-compatibility
plan: 08
subsystem: persistence
tags: [store, redaction, security, measurement, one-way-decision, gap-closure]
status: complete

requires:
  - "packages/backend/src/store/observations.ts — QUERY_VALUE_REDACTION, the marker the counts were computed against"
  - "packages/backend/src/store/db.ts — the three survival properties that make the population worth counting"
  - "scripts/phase1/tracer-e2e.sh:158-165 — the existing plugin-database locating logic, reused rather than reinvented"
  - "scripts/phase1/env.sh — P1_OUT"
provides:
  - "results/observation-url-exposure.json — per-database counts of pre-policy observation rows, measured read-only, values never recorded"
  - "The operator decision on T-01-36, recorded with its reasoning: `leave`, because the population is closed by construction"
  - "A correction to STATE.md's false claim that the SPIKE-10 8998 instance was killed"
affects:
  - "01-09 — STORE-03 is settled here rather than dangling into it"
  - "Phase 2+ — observations.url is in ONE state (redacted) on every machine that will ever run a shipped build"

tech-stack:
  added: []
  patterns:
    - "A measurement of an exposure reports COUNTS ONLY — a counting tool that prints what it counted is an exfiltration tool"
    - "Prefer the WAL-aware read; fall back to an immutable read ONLY where no -wal exists, because an immutable read of a WAL database reports a confident undercount indistinguishable from a clean result"
    - "'Found zero databases' and 'found a database holding zero rows' are different facts and the artifact must say which"

key-files:
  created:
    - .planning/phases/01-skeleton-persistence-compatibility/results/observation-url-exposure.json
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "P8-D1 (operator decision at a gate=\"blocking-human\" checkpoint, 2026-08-21, resume signal `leave`): pre-policy observation rows are LEFT AS THEY ARE. Not because the measured number (0) is small, but because the target population is CLOSED BY CONSTRUCTION — a pre-policy row can only be written by a build predating 01-07's redactor, DefMiner has never shipped, so only a developer machine could hold one, and every build from 01-07 onward redacts at write, so none can ever be added. A sweep would be permanently dead code guarding an empty set that cannot grow."
  - "P8-D2: the measurement prefers `sqlite3 -readonly` and falls back to `file:...?mode=ro&immutable=1` ONLY where no -wal sidecar exists. Proven necessary on this run: an immutable read of the one DefMiner database (45,352-byte -wal) reports NO TABLES AT ALL, while the WAL-aware read reports `artifacts` and `observations`. Where a read-only open failed AND a non-empty -wal existed, no count would be taken and the database would be reported as a named error — never as a zero."
  - "P8-D3: STORE-06's 90-day window bounds an EMPTY SET here. This is recorded as `no exposure to accept`, not as an accepted exposure — inflating a risk that does not exist is as much a misreport as dropping one that does."

requirements-completed: [STORE-03, STORE-06]

coverage:
  - deliverable: "The number of pre-policy observation rows on this machine is a committed integer, measured read-only"
    human_judgment: false
    verification:
      - kind: command
        ref: "node -e '...' over results/observation-url-exposure.json — `databases 1 exposed rows 0`, exit 0"
        status: pass
      - kind: command
        ref: "artifact shape gate: databases_found is a number, databases is an array, every value under totals is an integer"
        status: pass
  - deliverable: "No URL value was printed, logged or committed while measuring"
    human_judgment: false
    verification:
      - kind: command
        ref: "grep -cE 'https?://' results/observation-url-exposure.json = 0"
        status: pass
      - kind: command
        ref: "every SQL statement executed is a COUNT(*); the four are listed verbatim under method.queries in the artifact"
        status: pass
  - deliverable: "The disposition of pre-policy rows is an explicit operator decision no automation mode could have answered"
    human_judgment: true
    rationale: "A gate=\"blocking-human\" checkpoint over a one-way action. The executor halted with the measured count and three options and did not choose; the operator answered `leave`. No test can assert that a human decided — only the record can, and the record is P8-D1 plus the quoted resume signal below."
  - deliverable: "The decision and its reasoning are recorded in the SUMMARY and in STATE.md, dated and quantified"
    human_judgment: false
    verification:
      - kind: command
        ref: "STATE.md Known Risks carries the 2026-08-21 row naming 0 affected rows, the 1 database, the artifact path, commit 640ceb0 and STORE-06's 90-day window"
        status: pass
  - deliverable: "No sweep was shipped — the `leave` branch writes no code"
    human_judgment: false
    verification:
      - kind: command
        ref: "git status --porcelain packages/ = empty at every point in this plan"
        status: pass
      - kind: command
        ref: "git diff --stat 4940ede..HEAD -- packages/ = empty"
        status: pass
  - deliverable: "The 01-07 baseline is preserved intact"
    human_judgment: false
    verification:
      - kind: command
        ref: "pnpm test — 30 files / 673 tests passed, zero failures"
        status: pass
      - kind: command
        ref: "pnpm typecheck, pnpm lint, pnpm knip — all exit 0"
        status: pass
      - kind: command
        ref: "pnpm check:bundle — 1 import specifier (crypto)"
        status: pass
  - deliverable: "STATE.md no longer asserts that the SPIKE-10 8998 instance was killed"
    human_judgment: false
    verification:
      - kind: command
        ref: "ps -o pid,etime -p 79273 — alive, 16h44m elapsed; STATE.md Blockers corrected in place, process left running"
        status: pass

metrics:
  duration: "18 min"
  completed: 2026-08-21
  tasks: 3
  files: 4

actuals:
  tokens: 12160
  tasks: 3
  commits: 4
---

# Phase 01 Plan 08: Pre-Policy Observation Rows — Disposition Summary

**The operator chose `leave` against a measured count of zero, and the reason it is defensible is not that zero is small — it is that the target population is closed by construction and cannot grow, which makes a sweep permanently dead code rather than merely premature.**

- **Duration:** 18 min (2026-08-21 10:34:16Z → 10:52Z)
- **Tasks:** 3 (one of them a `gate="blocking-human"` checkpoint that halted execution)
- **Files changed:** 4 — one new evidence artifact, `STATE.md`, `ROADMAP.md`, this summary. **Zero source files.**
- **Commits:** 3

## The Decision

**Option selected: `leave`** — leave the pre-policy rows as they are.

**Operator's verbatim resume signal:** `leave`.

**Date:** 2026-08-21.

**The row count the decision was taken against: 0.** Zero pre-policy observation rows, across the **one** DefMiner plugin database that exists on this host. Measured read-only, committed as `results/observation-url-exposure.json` at commit `640ceb0`, *before* the checkpoint was presented — so the operator decided against a number, not an estimate.

**Why `leave` is correct here, stated in the form a verifier needs.** The plan anticipated `leave` being chosen on the grounds that the measurement came back at or near zero, and it did. That argument is true but weak, and it is not the one the operator acted on. The load-bearing reason is stronger:

> **The target population is closed AND empty, permanently.** A "pre-policy row" is by definition a row written by a build predating plan 01-07's write-path redactor. DefMiner has never shipped. The only machine that could hold such a row is a developer's, and the measurement of this developer machine found zero. No future traffic can ever add one, because every build from 01-07 onward redacts at write.

That distinction matters to anyone reading this later. "We skipped it because the number was small" invites a follow-up: *and when the number grows?* "The branch is unreachable by construction" has no such follow-up, because the number cannot grow. A sweep shipped here would not be machinery arriving early for a population that accumulates once the plugin ships — the counter-argument I raised at the checkpoint and the operator answered. It would be **permanently dead code**: two SQL constants, a sweep function, a scheduled call site, a counter, a drift assertion and three spec cases, all guarding an empty set that is closed against growth. Every one of those is a thing a future reader must understand and a future refactor must not break.

**What is therefore NOT being accepted.** STORE-06's 90-day retention window bounds this population — and that population is empty. This is recorded in STATE.md as *no exposure to accept*, not as *an accepted exposure*. Inflating a risk that does not exist is as much a misreport as dropping one that does, and a Known Risks table that carries phantom entries is a table people stop reading.

## What Was Measured, and What the Measurement Cannot See

### The headline, with the two facts kept apart

**1 DefMiner plugin database found. 0 observation rows in it. 0 pre-policy rows.**

The plan required this distinction explicitly, so here it is unambiguously: this is a **measured zero taken against a database that was found, opened and read** — not the vacuous zero that comes from finding no database at all. The artifact states which, in its `headline` field, so no later reader has to reconstruct it.

| | Count |
|---|---|
| Plugin databases scanned | 8 |
| Of those, DefMiner's (schema carries an `observations` table) | **1** |
| Of those, read successfully | 1 |
| Of those, reported as an unreadable error | 0 |
| Non-DefMiner plugin databases (counted, then excluded from totals) | 7 |
| **Total observation rows** | **0** |
| Rows with a `?` | 0 |
| **Rows with `?` and `=` and no redaction marker — the pre-policy population** | **0** |
| Rows already carrying the marker | 0 |

### DefMiner is not installed in the operator's live Caido

This is what makes the total a real zero rather than an unknown. The live instance on port 8080 (pid 41674, no `--data-path`, so the default `~/Library/Application Support/io.caido.Caido`) holds six plugin databases. Their schemas are `config`; `providers settings`; `paramfinder_session_projects paramfinder_sessions paramfinder_session_entries wordlists`; `themes`; `tools history`; and one empty. **None has an `observations` table.** The long-lived database with the three survival properties `db.ts` documents — never garbage-collected, survives project deletion, survives force-reinstall — does not contain DefMiner data on this machine, because DefMiner has never been installed there.

The one DefMiner database is an isolated Phase 1 probe instance from 2026-08-20 (`/private/tmp/defminer-probe-20260820T203649Z-28414`). Its schema is fully migrated — `artifacts`, `observations`, both indexes, `sqlite_autoindex_*` — and both tables hold zero rows. An instance that installed and migrated and never observed traffic.

### The three search roots, all searched, each reported separately

| Origin | Root | Result |
|---|---|---|
| `operator-live` | `~/Library/Application Support/io.caido.Caido` | 6 plugin databases, **none DefMiner's** |
| `phase1-isolated` | `/private/tmp/defminer-probe-*` | 2 directories survive; one has no plugin database at all, one holds **the single DefMiner database** |
| `phase0-instance` | `.spike/recorder-data` | 1 plugin database, the SPIKE-10 recorder's (`cache_log`), not DefMiner's |

A finding worth recording about the isolated instances: `instance.sh` puts a run's data directory at `/tmp/defminer-probe-<RUN_ID>`, **not** under `$P1_OUT/runs/` — the `runs/<RUN_ID>/instance.json` file only *records* the path. So the plan's instruction to search "`$P1_OUT/runs/`" was searched the only way it can be: all **61** `data_path` values recorded across every `results/runs/*/instance.json` in the repository were tested for existence. **60 are gone**, torn down. One survives (`.spike/recorder-data`). Two surviving `/tmp` probe directories appear in no `instance.json` at all and were found by direct enumeration. An independent `find /private/tmp /private/var/folders -path '*/plugins/*/data.db'` sweep returned exactly the same single non-live database, which is why the enumeration is stated as complete rather than assumed to be.

### The methodological finding: an immutable read of a WAL database lies quietly

`sqlite3 -readonly` **failed on seven of the eight** plugin databases with `unable to open database file (14)` — WAL journal mode with no usable `-shm`. The obvious workaround is `file:<db>?mode=ro&immutable=1`, which always succeeds.

It is also, on a database with a pending WAL, **silently wrong**, and this run demonstrates it rather than warning about it in the abstract. The one DefMiner database carries a **45,352-byte `-wal`**:

```
WAL-aware  : sqlite3 -readonly <db> "SELECT ... FROM sqlite_master"
             -> artifacts observations

immutable  : sqlite3 "file:<db>?mode=ro&immutable=1" "SELECT ... FROM sqlite_master"
             -> (empty)
```

An immutable read of the database that mattered reports **no tables at all** — from which a `COUNT(*)` harness would happily derive zero, and a reader would receive "zero exposed rows" that was indistinguishable in every respect from the clean bill of health it was not. That is exactly the failure shape this phase has been bitten by repeatedly: a gate green for the wrong reason.

So the rule the measurement actually implements is narrower than "fall back to immutable":

- `sqlite3 -readonly` succeeds → use it (`read_mode: readonly`).
- It fails **and no `-wal` sidecar exists** → immutable is complete by definition, because there are no WAL-resident rows to miss (`read_mode: immutable-no-wal`). This is the path all seven non-DefMiner databases took.
- It fails **and a non-empty `-wal` exists** → **no count is taken.** The database is reported as a named error entry and counted in `defminer_databases_errored`. Never as a zero. This path was not exercised on this run, but it is the reason a zero in this artifact can be trusted.

### Nothing was started, stopped or killed

The live instance on port 8080 was read while it held its files open, which the plan states is safe and which it is. The database files and their `-wal`s retain their pre-existing mtimes. The only side effect of any read was SQLite updating a `-shm` index file, which is unavoidable for any WAL read and touches no data. `instance.sh` refuses port 8080 unconditionally; this task had no business doing anything to it either, and did not.

### What the measurement cannot see, kept explicit

- **Other machines.** This is a measurement of this host and nothing else.
- **Databases that existed and are gone.** 60 of the 61 recorded isolated instance data directories were torn down. Whatever they held went with them and is not recoverable for counting. That is a limit of the measurement, not a zero.
- **Rows a future run writes.** The write path has redacted since 01-07; the artifact describes disk as of its `generated_at`.

All three are written into the artifact's `what_this_does_not_cover` array, not only here.

## Requirement Disposition

**STORE-03 — settled.** Plan 01-07 deliberately held it open because this plan also declares it, and the pre-policy rows (T-01-36) were the remaining exposure. With `leave` chosen against a measured zero and the population closed by construction, there is nothing left open: `observations.url` is redacted on every write from 01-07 onward, and there exists no unredacted row anywhere that a shipped build could have produced. STORE-03 does not dangle into 01-09.

**STORE-06 — the retention bound is untouched by this plan** and continues to apply as 01-04 implemented it. Its 90-day window is named here only to record that, for the pre-policy population, it bounds an empty set.

**T-01-36 — resolved.** The threat register entry transferred from 01-07 offered `mitigate (or accept, per the checkpoint)`. Neither verb quite fits what happened: the exposure was measured to be empty, so it is neither mitigated by code nor accepted as standing. Recorded as *closed by measurement*, with the count and the closure-by-construction argument beside it, which is the only form of that claim a later reader can check.

## Verification Evidence

### Task 1 acceptance criteria — all four run

```
PASS shape | databases_found 1 | per-db entries 9 | marker "<redacted>"
PASS totals all integers: {"total":0,"with_query":0,"unredacted_with_query":0,"already_redacted":0}

grep -cE 'https?://' results/observation-url-exposure.json => 0
```

Plan `<verify>` block, run verbatim:

```
$ node -e "const d=require('./.../observation-url-exposure.json'); if(typeof d.databases_found!=='number'||typeof d.totals.unredacted_with_query!=='number') throw new Error('malformed exposure artifact'); console.log('databases',d.databases_found,'exposed rows',d.totals.unredacted_with_query)" && ! grep -qE 'https?://' .../observation-url-exposure.json
databases 1 exposed rows 0
VERIFY EXIT: 0
```

The fourth criterion — "the task's terminal output names the enumerated database paths and the counts, and contains no URL value" — held throughout: the only statement that could have emitted a URL is `SELECT url`, and it was never executed. The four statements that were executed are listed verbatim in the artifact under `method.queries`, and every one is a `COUNT(*)`.

### Task 3 acceptance criteria — the `leave` branch

```
$ git status --porcelain packages/
(empty)

$ git diff --stat 4940ede..HEAD -- packages/
(empty)
```

No source file under `packages/` is modified. No SQL constant, no sweep function, no call site in `runRetentionPass`, no counter, no drift assertion, and no convergence / no-op / scheduling spec was written. The `leave` branch writes no code, and none was written.

STATE.md carries the dated Known Risks entry naming the count (0), the database count (1), the artifact path, the commit (`640ceb0`) and STORE-06's 90-day window — committed at `2013ca4`.

### Baseline preserved

```
$ pnpm test
 Test Files  30 passed (30)
      Tests  673 passed (673)

$ pnpm typecheck   -> exit 0
$ pnpm lint        -> exit 0
$ pnpm knip        -> exit 0
$ pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

Identical to the post-01-07 baseline in every figure, which is the expected result for a plan that ships no code — and is checked rather than assumed, because "I changed nothing" is a claim like any other.

### Plan-level verification

| # | Check | Result |
|---|---|---|
| 1 | Artifact exists, well-formed, integer counts, no URL value | PASS |
| 2 | SUMMARY names the selected option and the count it was decided against | PASS — "The Decision", above |
| 3 | Sweep-branch mutations | N/A — `leave` |
| 4 | `git status --porcelain packages/` empty; STATE.md dated accepted-risk entry | PASS |
| 5 | `pnpm typecheck`, `pnpm lint`, `pnpm knip` exit 0 | PASS |
| 6 | `git status --porcelain '01-0[1-6]-PLAN.md'` empty — this plan amends no existing plan | PASS |

## Deviations from Plan

### 1. [Rule 2 — Missing critical distinction] The artifact separates "no database found" from "database found, zero rows", and separates non-DefMiner databases from unreadable ones

**Found during:** Task 1.

**Issue:** The plan requires a run that found zero databases to say so as its headline rather than reporting zero exposed rows, and requires an untakeable count to be a named error rather than a zero. It does not say what to do with a plugin database that is perfectly readable but belongs to a *different plugin* — which is seven of the eight databases on this host. Folding those into either bucket would be wrong in opposite directions: as errors they would inflate `defminer_databases_errored` and make a clean run look degraded; as zeroes they would inflate the denominator and make "we checked 8 databases and found nothing" sound like a broader clearance than was actually obtained.

**Fix:** A third per-database status, `not-defminer`, carrying the database's table list so the classification is checkable rather than asserted, with `counts: null` and explicit exclusion from `totals`. `databases_found` counts DefMiner databases (the headline number); `plugin_databases_scanned` counts everything examined. `totals_scope` states the rule in the artifact.

**Files modified:** `results/observation-url-exposure.json`. **Commit:** `640ceb0`.

### 2. [Rule 1 — Bug avoided] The naive read-only fallback would have reported a confident undercount

**Found during:** Task 1, when `sqlite3 -readonly` failed on seven of eight databases.

**Issue:** Documented in full under "The methodological finding" above. `immutable=1` is the standard workaround for a read-only WAL open failure and it succeeds silently on the one database whose contents mattered — reporting no tables, from which a zero would have been derived. Had the DefMiner database's WAL held rows, this plan would have committed "0 exposed rows" as fact and the operator would have decided against a fabricated number.

**Fix:** The fallback is gated on the absence of a `-wal` sidecar, and a read-only failure with a non-empty `-wal` produces a named error entry instead of a count. Both branches are documented in the artifact's `method.read_modes` with the measured demonstration, so the next person to write a counting harness against these files does not have to rediscover it.

**Files modified:** `results/observation-url-exposure.json`. **Commit:** `640ceb0`.

### 3. [Rule 2 — False claim in project state] STATE.md asserted a teardown that only half happened

**Found during:** Task 1, while enumerating candidate data directories.

**Issue:** `.planning/STATE.md` Blockers stated that "the recorder LaunchAgent was uninstalled and the 8998 instance killed per plan 00-04's teardown responsibility". The LaunchAgent was uninstalled. The instance was not: `caido-cli --data-path .spike/recorder-data --listen 127.0.0.1:8998 --no-open --debug` is **pid 79273**, up since 2026-08-20, 16h44m elapsed when observed. Its plugin database holds `cache_log`, not DefMiner's tables, so it changes no count in this plan — but a state file that asserts a process is dead when it is alive is a trap for whoever next reasons about ports, resources or that instance's data.

**Fix:** The line is corrected in place, naming the live pid and port and stating plainly that the process is **deliberately left running** — enumerating databases is not a mandate to kill an operator's process. The correction also flags, without acting on it, that the same line's opening premise (collection stopped, cross-day denominator 0) now rests on a teardown that provably only half happened and should be checked rather than inherited. **Not checked here:** re-opening the SPIKE-10 cache-hit-rate question is outside this plan's scope and is the operator's call.

**Files modified:** `.planning/STATE.md`. **Commit:** `2013ca4`.

### 4. [Recorded] The plan's `checkpoint:decision` is Task 2, not Task 1

Consistent with plan 01-07's deviation 3, which corrected the validation ledger's count of gap-plan task rows from seven to eight precisely because this plan has three tasks with the checkpoint in the middle. Task 1 (the measurement) ran and was committed at `640ceb0` **before** the checkpoint was presented, which is the whole point of that ordering: the operator decided against a real count. Recorded here so the ledger and the executed record agree.

**Total deviations:** 3 auto-fixed (2× Rule 2, 1× Rule 1), 1 recorded. **Impact:** deviation 2 is the significant one — without it this plan would have reported a fabricated zero with complete confidence, and the operator's decision would have been taken against it.

## Deliberately Out of Scope

- **The SPIKE-10 recorder instance (pid 79273, port 8998).** Found, reported, corrected in STATE.md, **left running**. Whether its uptime changes the SPIKE-10 cross-day denominator is separate work and the operator's call.
- **`compat.ts` and `hooks/passive.ts` bare `String(e)` renders.** Still outside the store-layer gate's scope by 01-07's explicit design (T-01-37, disposition `accept`). Untouched.
- **Machines other than this one.** A sweep could not have reached them either; the closure-by-construction argument is what covers them, not the measurement.

## Known Stubs

None. This plan shipped no code — no hardcoded empty value, no placeholder, no unwired component. The one artifact it created is a measurement, and every field in it is a measured value or a stated limit.

## Threat Flags

None. No new network endpoint, auth path or schema change. The one new file-access pattern is a read-only `sqlite3` open of databases outside the repository — performed once, during execution, by no committed code, and the paths it touched are enumerated in the artifact.

## Issues Encountered

None unresolved. One false claim found in project state and corrected (deviation 3).

Untracked and left alone, out of scope per the scope boundary: `.gsd/`, `.planning/milestone.lock`, `.planning/phases/00-runtime-reality-check/00-VERIFICATION.md`, `.planning/phases/00-runtime-reality-check/results/runs/recorder-20260820T180307Z/`, `.planning/phases/01-skeleton-persistence-compatibility/results/runs/20260821T075936Z-12874/`, and a modified `.planning/config.json` — all predate this session.

## Next Phase Readiness

Ready for `01-09`, the last plan of the phase. STORE-03 no longer dangles into it and gap 1 is closed end to end: the write path redacts (01-07), the durable column was measured and found to hold nothing that predates that redaction (01-08), and the population that could have held such rows is closed against growth.
## Self-Check: PASSED

Run 2026-08-21 after writing this SUMMARY.

- Both `key-files.created` entries exist on disk (`[ -f ]` verified): the exposure artifact and this summary.
- Both task commits resolve in `git log --oneline --all`: `640ceb0` (task 1, the measurement) and `2013ca4` (task 3, the `leave` record). The third commit is the one carrying this file — its hash is not quoted here because a summary cannot contain the hash of the commit that creates it, and a quoted hash that an `--amend` then invalidates is worse than no hash at all.
- Plan `<verification>` re-run at HEAD: item 1 `databases 1 exposed rows 0` with `grep -qE 'https?://'` finding nothing; item 4 `git status --porcelain packages/` empty; item 5 `pnpm typecheck` / `pnpm lint` / `pnpm knip` exit 0; item 6 `git status --porcelain '01-0[1-6]-PLAN.md'` empty.
- `pnpm test` 30 files / 673 tests, zero failures — identical to the post-01-07 baseline, as a plan shipping no code must be.
- The `leave` branch's defining criterion holds: `git diff --stat 4940ede..HEAD -- packages/` is empty. No sweep, in whole or in part, is sitting in the tree.
