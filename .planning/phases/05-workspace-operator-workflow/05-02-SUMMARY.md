---
phase: 05-workspace-operator-workflow
plan: 02
subsystem: database
tags: [sqlite, typescript-compiler-api, static-analysis, query-plan, keyset-pagination, csv, export, vitest]

# Dependency graph
requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "sql-discipline.spec.ts's auditSource, the shared sqlite-fixture, store/db.ts's measured SQLite version, observations.ts's ObservationRow and write-time query redaction"
  - phase: 00-runtime-reality-check
    provides: "the single-QuickJS-thread finding (SPIKE-01: no interrupt handler) that makes a whole-partition walk a starvation event"
provides:
  - "Five new SQL-discipline rules — cte-unscoped, insert-select, unscoped-subquery, unscoped-union-arm, fragment-composition — each with both halves of its failing path executed against 05-RESEARCH § O-01's probe texts"
  - "Statement DECOMPOSITION in the gate: top-level set-operation arms and balanced-paren subquery spans are scoped INDEPENDENTLY, so a scoped outer query can no longer launder an unscoped inner one"
  - "RULE_NAMES as the type of the gate's add() — the gate's reach is now a closed, asserted set rather than a number somebody remembers to bump"
  - "tests/sqlite-346-query-plans.spec.ts — the keyset seek, the mixed-direction sorter penalty and the bounded window's selectivity independence as executed assertions"
  - "tests/export-payload-budget.spec.ts — the measured export payload, and EXPORT_RPC_CHUNK_ROWS derived from it"
  - "EXPORT_RPC_CHUNK_ROWS = 20,000, and the measured outcome that the export is CHUNKED (3 calls), preserving D-04 exactly"
affects: [05-06, 05-07, 05-11, 05-04, 05-09]

# Actuals (#2632)
actuals:
  tokens: 17533
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Statement decomposition before scoping: a whole-statement predicate scan can be laundered, so the pieces are checked independently"
    - "Sink-anchored detection: a composition rule fires where the string is EXECUTED, not where it is built, so ordinary string work is untouched"
    - "A closed rule-name list used as the TYPE of the reporting function, so a new rule cannot exist without appearing in the asserted set"
    - "Two tables with one index each instead of an INDEXED BY hint — measure what the planner CHOOSES, not what it was told"
    - "Assert the version/environment a measurement came from, including asserting that it is NOT the target, so a gap is an executed fact rather than a footnote"
    - "Derive a shipped constant from a measurement AND assert one step larger would not fit, so 'fits' cannot be satisfied by an arbitrarily small number"

key-files:
  created:
    - tests/sqlite-346-query-plans.spec.ts
    - tests/export-payload-budget.spec.ts
  modified:
    - packages/backend/src/store/sql-discipline.spec.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "RULE_NAMES asserts FIFTEEN emittable rule names, not the fourteen the plan asks for: the plan's count comes from 05-RESEARCH § O-01's summary table, which merges module-scope-statement and module-scope-await into one row. They are two names in the source. Asserting 14 would assert something false."
  - "isMultiRowStatement left untouched; the SCOPING CONCERN was extended per statement head instead, so every ON CONFLICT ... DO UPDATE upsert in the package keeps passing"
  - "insert-select fires on ANY INSERT ... SELECT, not only an unscoped one — the shape itself is the defect (T-05-07), and an unscoped one additionally reports unscoped-multi-row"
  - "fragment-composition is detected at the sink plus a second pass over declarations a sink consumes, so `const sql = BASE + ORDER; db.prepare(sql)` is caught while `const label = a + b` is not"
  - "No INTERPOLATION_ALLOWLIST entry added — still exactly one, still migrations.ts's PRAGMA head"
  - "The query plans were measured on SQLite 3.53.4 (node:sqlite under Node 26.7.0), NOT Caido's 3.46.0. No 3.46.0 binary is reachable from this repo. The gap is an EXECUTED assertion whose failure message names all three versions."
  - "The export RPC ceiling is a BUDGET this project sets (8 MiB/call), not a limit measured from Caido — the real ceiling is live-only, for the same reason the sqlite fixture cannot reproduce pool affinity"
  - "The measurement produced the CHUNKED outcome: EXPORT_RPC_CHUNK_ROWS = 20,000, three calls for a 50,000-row export"

patterns-established:
  - "Probe-text fidelity: a fixture uses the research's probe VERBATIM so the thing asserted and the thing measured are the same statement"
  - "Fixture non-vacuity assertions: the tie-block test asserts a boundary actually landed mid-block, so the case under test cannot silently stop occurring"
  - "State what a measurement CANNOT answer in the file header, next to what it can"

requirements-completed: []

coverage:
  - id: D1
    description: "A statement whose leading keyword is WITH and which carries no project_id predicate is reported, where today it reports nothing"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts#fails on a CTE head that scopes on nothing (probe Q5)"
        status: pass
    human_judgment: false
  - id: D2
    description: "An INSERT … SELECT is reported as a multi-row write, where today it reports nothing"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts#fails on INSERT … SELECT, and not on INSERT … VALUES (probe Q10)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A project-scoped outer query no longer launders an unscoped subquery or an unscoped UNION arm"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts#fails on an unscoped subquery under a scoped outer query (probe Q2)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts#fails on a UNION arm that scopes on nothing (probe Q7)"
        status: pass
    human_judgment: false
  - id: D4
    description: "SQL assembled by + concatenation of identifiers, by template interpolation of a non-SQL-looking head, or by Array.join is reported — all three reported nothing before"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts#fails on all three fragment-composition shapes (probes P1, P2, P3)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every new rule has both halves executed against a fixture, and every new rule name is reachable from at least one fixture"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts#every one of the five new rule names is REACHABLE from a fixture"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts#emits exactly the rules it claims to — the gate's REACH, named"
        status: pass
    human_judgment: false
  - id: D6
    description: "The gate still reports zero violations across every non-spec .ts file under packages/backend/src — the widening did not turn the shipped tree red"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts#%s passes every SQL-discipline rule (it.each over 22 modules)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The row-value keyset cursor over a uniform-direction index is an index SEEK with both cursor terms in the seek and no temp b-tree; the mixed-direction index costs a sorter and degrades the cursor"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "tests/sqlite-346-query-plans.spec.ts#uniform-direction index: an index SEEK, and no sorter"
        status: pass
      - kind: unit
        ref: "tests/sqlite-346-query-plans.spec.ts#mixed-direction index: the SAME order costs a sorter — proved by contrast"
        status: pass
    human_judgment: false
  - id: D8
    description: "The bounded candidate window's scanned-row count is bounded by the inner limit and does not grow with the partition size"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "tests/sqlite-346-query-plans.spec.ts#scans the same number of candidates at 25,000 rows and at 200,000"
        status: pass
      - kind: unit
        ref: "tests/sqlite-346-query-plans.spec.ts#is a co-routine with a correlated subquery, not a materialisation"
        status: pass
    human_judgment: false
  - id: D9
    description: "A cursor landing mid-tie-block returns the rest of the block and nothing already returned, across three consecutive pages (EDGE UI-02)"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "tests/sqlite-346-query-plans.spec.ts#three consecutive pages are disjoint and their union is the ordered slice"
        status: pass
    human_judgment: false
  - id: D10
    description: "The export payload budget is a named constant derived from a measured serialisation; chunked serialisation is byte-identical to a single pass (EDGE UI-06)"
    requirement: "UI-06"
    verification:
      - kind: unit
        ref: "tests/export-payload-budget.spec.ts#fits the measured per-row cost inside the RPC payload budget"
        status: pass
      - kind: unit
        ref: "tests/export-payload-budget.spec.ts#is NEAR the budget, not arbitrarily conservative"
        status: pass
      - kind: unit
        ref: "tests/export-payload-budget.spec.ts#CSV: concatenated chunks equal the single pass, header included ONCE"
        status: pass
      - kind: unit
        ref: "tests/export-payload-budget.spec.ts#JSON: concatenated chunk BODIES equal the single pass"
        status: pass
    human_judgment: false
  - id: D11
    description: "Assumption A5 converted to a measurement on Caido's TARGET SQLite 3.46.0"
    verification:
      - kind: unit
        ref: "tests/sqlite-346-query-plans.spec.ts#states the version it ran on, and it is not silently the target version"
        status: pass
    human_judgment: true
    rationale: "NOT DELIVERED AS ASKED. The plans were measured on SQLite 3.53.4, not 3.46.0 — no 3.46.0 binary exists on this machine (node:sqlite links 3.53.4; /usr/bin/sqlite3 is 3.51.0; Homebrew's is 3.53.4). The gap is asserted rather than narrated, but closing it needs a 3.46.0 runtime a human must supply. A human must decide whether the structural argument (a non-sargable predicate cannot become sargable; an ORDER BY disagreeing with its index needs a sorter in every version) is enough to let plan 05-06 proceed, or whether a real 3.46 run is required first."
  - id: D12
    description: "The RPC payload ceiling itself — whether Caido's RPC accepts an 8 MiB or a 17.5 MiB string in one call"
    requirement: "UI-06"
    verification: []
    human_judgment: true
    rationale: "Live-only, for the same reason the SQLite fixture cannot reproduce pool affinity: a vitest spec has no Caido RPC to push bytes through, and a fixture that faked one would teach the specs a wrong lesson. 8 MiB per call is a BUDGET this project sets, not a limit it discovered. Plan 05-11 should confirm it against a real Caido before the export ships."

# Metrics
duration: 21 min
completed: 2026-08-28
status: complete
---

# Phase 05 Plan 02: SQL Gate Widening and the Two Measurements Summary

**Five new SQL-discipline rules built on statement decomposition and sink-anchored composition detection, plus executed query-plan and export-payload measurements that replace two carried-over research assumptions with numbers this repo produced.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-08-28T11:34:00Z
- **Completed:** 2026-08-28T11:55:00Z
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- **The gate now sees every shape `05-RESEARCH.md § O-01` measured it silent on.** All five probes (Q5, Q10, Q2, Q7 and P1/P2/P3) reported `[]` in a RED run committed before the rules existed, and each now reports a named rule with a paired negative proving the correct spelling stays clean.
- **The laundering mechanism behind two of the silences is closed structurally, not by a cleverer scan.** Statements are decomposed into top-level set-operation arms and balanced-parenthesis subquery spans, and the existing predicate rule is applied to each piece on its own — so `WHERE project_id = ?` in an outer query stops vouching for an `IN (SELECT … FROM suppressions)` that scopes on nothing.
- **The gate's reach is now a closed, asserted set.** `RULE_NAMES` is the TYPE of the reporting function's first argument, so a rule cannot be added without appearing in a list a test compares element by element.
- **The keyset design plan 05-06 rests on is executed, both halves.** The uniform-direction index produces a SEARCH with both cursor terms inside the seek and no sorter; the mixed-direction index produces `USE TEMP B-TREE FOR LAST TERM OF ORDER BY` **and** degrades the row-value cursor to its first term — a cost the research did not call out.
- **The bounded candidate window's selectivity independence is a number, twice.** 500 candidates scanned at 25,000 rows and 500 at 200,000, against 25,000 and 200,000 for the unbounded form.
- **The export question is answered with a measurement and the answer is CHUNKED.** A 50,000-row export is 13.87 MiB of CSV / 17.49 MiB of JSON; `EXPORT_RPC_CHUNK_ROWS = 20,000` is derived from the measured per-row cost against an 8 MiB budget, and chunk concatenation is proved byte-identical to a single pass in both formats.
- **A pre-existing red gate, unrelated to this plan, was found and repaired.** CORE-11's byte-comparison of the machine-owned residual block in `REQUIREMENTS.md` had been red since plan 05-01's close-out.

## Task Commits

1. **Task 1 (RED): failing fixtures for the five silent shapes** — `f0460a2` (test)
2. **Task 1 (GREEN): the five rules** — `7598a42` (feat)
3. **Task 2: keyset and bounded-window query plans** — `495ff53` (test)
4. **Task 3: export payload budget and `EXPORT_RPC_CHUNK_ROWS`** — `3ab313f` (test)
5. **Deviation 1: restore the machine-owned residual span** — `bfabe9d` (fix)

_Task 1 carried `tdd="true"`, so it is two commits: the fixtures were committed RED, reproducing the research's measurement (`expected [] to include 'cte-unscoped'` × 5), before the rules existed._

## Files Created/Modified

- `packages/backend/src/store/sql-discipline.spec.ts` (+553 lines) — five rules, the decomposition helpers (`maskSqlStrings`, `topLevelMatches`, `topLevelArms`, `subquerySpans`, `scopesOnProjectId`, `scopedTables`, `insertsFromSelect`, `isDecomposable`), the two-pass composition detector, `RULE_NAMES`, and eleven new assertions
- `tests/sqlite-346-query-plans.spec.ts` (505 lines, new) — 8 tests over a 200,000-row + 25,000-row + 40-row fixture in the shared SQLite harness
- `tests/export-payload-budget.spec.ts` (384 lines, new) — 12 tests over a synthetic 50,000-row observation-shaped dataset; exports `EXPORT_RPC_CHUNK_ROWS`
- `.planning/REQUIREMENTS.md` (−7 blank lines) — see deviation 1

## The measurements, with their numbers

### Query plans — measured on SQLite **3.53.4**, not 3.46.0

| Statement | Plan |
|---|---|
| Uniform `(project_id, last_seen_at DESC, fingerprint DESC)` index, row-value cursor | `SEARCH entities_desc USING INDEX idx_entities_desc (project_id=? AND (last_seen_at,fingerprint)<(?,?))` — no temp b-tree |
| Mixed `(… DESC, … ASC)` index, same `ORDER BY … DESC, DESC` | `SEARCH entities_mixed USING INDEX idx_entities_mixed (project_id=? AND last_seen_at<?)` + `USE TEMP B-TREE FOR LAST TERM OF ORDER BY` |
| Bounded candidate window | `CO-ROUTINE e` / `SEARCH entities_desc USING INDEX idx_entities_desc (…)` / `SCAN e` / `CORRELATED SCALAR SUBQUERY 2` / `SEARCH s USING COVERING INDEX sqlite_autoindex_suppressions_1 (…)` |

Both the uniform plan and the bounded-window plan reproduce `§ O-01`'s 3.51.0 output **exactly**, including the co-routine shape.

| Candidate rows scanned, page returns 0 (100 % suppressed) | 25,000-row partition | 200,000-row partition |
|---|---:|---:|
| Bounded (inner `LIMIT 500`) | **500** | **500** |
| Unbounded `NOT EXISTS` | 25,000 | 200,000 |

**The three versions, and why this matters.** Caido ships **3.46.0** (`store/db.ts:55-82`, measured by plan 01-01). `§ O-01` measured **3.51.0**. This spec ran on **3.53.4** (`node:sqlite` under Node v26.7.0). No 3.46.0 is reachable from this repo — `/usr/bin/sqlite3` is 3.51.0 and Homebrew's is 3.53.4. Assumption A5 is therefore **narrowed, not closed**: it now rests on two independent versions agreeing rather than on one, and the disagreement window is 3.46 → 3.51 instead of 3.46 → ∞. The spec asserts `measuredVersion !== "3.46.0"` so that a reader cannot mistake the file's NAME for its content, and the assertion's failure message says what to do if a 3.46 runtime ever appears.

**Also measured, and not in the research:** the mixed-direction index does not merely cost a sorter — it costs the cursor. The seek keeps only `last_seen_at<?`, dropping the second cursor term, so the scan it narrows is wider than the uniform case even before the sort. Uniform direction is now the cheaper choice on two counts, not one.

### Export payload — measured, 50,000 observation-shaped rows

| Quantity | CSV | JSON |
|---|---:|---:|
| Serialised bytes (UTF-8) | 14,543,560 (**13.87 MiB**) | 18,343,481 (**17.49 MiB**) |
| Peak single string (UTF-16 units) | 14,540,560 | 18,340,481 |
| Elapsed serialisation | 48 ms | 32 ms |

Worst-case per row: **366.87 bytes**. Against the 8 MiB per-call budget:

- 20,000 rows → **7.00 MiB** — fits
- 25,000 rows → **8.75 MiB** — does not

so `EXPORT_RPC_CHUNK_ROWS = 20,000` and **the outcome is CHUNKED**: a 50,000-row export crosses as **3 RPC calls**. D-04 is preserved exactly — still a browser download, still no server file; the only change is that "what crosses in memory" is one chunk rather than one export.

## Decisions Made

- **Fifteen rule names, not fourteen.** The plan asks for the emittable set to have "grown to fourteen". The count comes from `§ O-01`'s summary table, which lists `module-scope-statement / module-scope-await` as a single row because they share a cause. They are two names in the source and always have been: 10 + 5 = 15. The spec asserts the exact ordered set instead of a count, and records the discrepancy in a comment.
- **`isMultiRowStatement` untouched.** Folding `INSERT` or `WITH` into it would have made the gate demand a `WHERE` clause from every `ON CONFLICT … DO UPDATE SET` upsert in the package. The scoping CONCERN was extended per statement head, each with its own rule name and message.
- **`insert-select` fires on every `INSERT … SELECT`, scoped or not.** T-05-07's disposition is about the SHAPE — a multi-row write whose row set is decided at execution time, on a driver with no usable transaction and no way for `ON CONFLICT` to make an unknown row set idempotent. An unscoped one additionally reports `unscoped-multi-row`.
- **Two tables with one index each, not `INDEXED BY`.** A hint measures what the planner was told; two tables measure what it chooses, which is the thing a version bump can change and therefore the thing worth pinning. Recorded because the first probe run — with `WITHOUT ROWID` tables — had the planner pick the primary key over the mixed index and produce a *different* temp-b-tree message; the shape of the answer depended on the fixture.
- **The RPC ceiling is a budget, not a discovery.** Nothing in this repo can push bytes through Caido's RPC. 8 MiB is chosen so the chunk seam is exercised by the largest export the product contemplates rather than being dead code, and so the peak string on the single QuickJS thread stays in single-digit megabytes. It is labelled as a budget in the file.
- **No `INTERPOLATION_ALLOWLIST` entry.** Still exactly one, still `migrations.ts`'s `PRAGMA user_version = ` head, still with its scoping test green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CORE-11's byte-comparison gate was red before this plan started**

- **Found during:** plan-level verification after Task 3
- **Issue:** `packages/backend/src/outbound-prohibition.spec.ts`'s "the block shipped in `.planning/REQUIREMENTS.md` equals `deriveResidual(...)`, byte for byte" was failing. `git diff --stat b15faf2..HEAD` confirms this plan touched neither of the two files that comparison reads, and `git log -- .planning/REQUIREMENTS.md` shows the file was last changed by `b15faf2` — plan 05-01's metadata commit. Something in that close-out (a markdown formatter, not `requirements.mark-complete` itself) inserted **seven blank lines** into the sentinel-delimited, machine-owned `DERIVED RESIDUAL` block. The block's own text says it is machine-owned and must not be hand-edited.
- **Fix:** the span between the sentinels restored byte-for-byte from `43428b2`. Verified whitespace-only first: a `difflib` pass over the two spans reported **zero** non-blank changed lines. The intended `- [x] UI-01` checkbox flip lives outside the sentinels and is untouched.
- **Files modified:** `.planning/REQUIREMENTS.md` (7 deletions, all blank lines)
- **Verification:** `pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts` → 448/448 pass. `git diff` filtered to non-blank changes returns nothing.
- **Committed in:** `bfabe9d`
- **Why in scope despite the scope boundary:** this plan's own `<verification>` requires `pnpm test` to exit 0, which was impossible while it was red, and the repair is fully specified by the failing gate's own error message.

**2. [Rule 1 - Bug] The plan's rule-name count is wrong**

- **Found during:** Task 1
- **Issue:** the plan's action asks the assertion to state the emittable rule set "has grown to fourteen". The gate emits ten names today, not nine; the plan's nine comes from `§ O-01`'s table, which merges the two module-scope rules into one row.
- **Fix:** the spec asserts the exact ordered set (15 entries) rather than a count, plus a no-duplicates assertion, with the discrepancy and its cause recorded in a comment at the assertion.
- **Verification:** `emits exactly the rules it claims to — the gate's REACH, named` passes.
- **Committed in:** `7598a42`

**3. [Rule 1 - Bug] The plan's fragment-composition fixtures would have tripped a second, unrelated rule**

- **Found during:** Task 1 RED
- **Issue:** the plan's behaviour text spells P1/P2/P3 as bare expressions. Because `fragment-composition` is (correctly, per the plan's own action) detected at the SINK, the fixtures must contain the sink — and `const stmt = await db.prepare(...)` at module scope also trips `module-scope-await`. The first RED run showed `[ 'module-scope-await' ]` where the negative fixtures needed to be clean.
- **Fix:** each P-fixture wrapped in `async function q() { … }`, so the correct-form negatives can assert `toEqual([])` and mean it.
- **Verification:** `fails on all three fragment-composition shapes` passes with `toEqual([])` on both negatives.
- **Committed in:** `f0460a2`

**4. [Rule 2 - Missing Critical] The mixed-direction contrast depended on the fixture, not the rule**

- **Found during:** Task 2
- **Issue:** the first probe declared both tables `WITHOUT ROWID` with `PRIMARY KEY (project_id, fingerprint)`. The planner then preferred the primary key over the mixed index and emitted `USE TEMP B-TREE FOR ORDER BY` — a different message from the research's `… FOR LAST TERM OF ORDER BY`, and for a different reason. The test would have passed while measuring index CHOICE rather than index DIRECTION.
- **Fix:** rowid tables, one index each, no `INDEXED BY` hint. The planner now picks the mixed index freely and reproduces the research's message exactly. The reasoning is written into the file beside the schema.
- **Verification:** `mixed-direction index: the SAME order costs a sorter` asserts `idx_entities_mixed` is used AND the temp b-tree appears AND the two-term cursor is gone.
- **Committed in:** `495ff53`

**5. [Rule 2 - Missing Critical] The bound on peak string length would have been the byte bound written twice**

- **Found during:** Task 3
- **Issue:** the plan asks for three bounds — bytes, peak single-string length, and elapsed time. Over an all-ASCII fixture the first two are the same integer, so one of the three assertions would have been decorative.
- **Fix:** every 250th fixture row carries multi-byte UTF-8 in its URL path, and the spec asserts `bytes > chars` with a message saying the non-ASCII rows have been dropped if that ever becomes an equality. It also makes the measurement itself more honest — a real export of target URLs contains non-ASCII.
- **Verification:** measured 18,343,481 bytes vs 18,340,481 UTF-16 units for JSON.
- **Committed in:** `3ab313f`

**6. [Rule 2 - Missing Critical] "Fits the budget" is satisfied by any small number**

- **Found during:** Task 3
- **Issue:** the plan asks that `EXPORT_RPC_CHUNK_ROWS` be derived from the measurement. An assertion that `constant × bytes-per-row ≤ budget` is satisfied by `1`, which would make the export 50,000 round-trips and still pass.
- **Fix:** a second assertion that one step larger (`+5,000` rows) would **exceed** the budget, so the constant is pinned from both sides.
- **Verification:** 20,000 → 7.00 MiB (passes); 25,000 → 8.75 MiB (exceeds 8 MiB).
- **Committed in:** `3ab313f`

---

**Total deviations:** 6 auto-fixed (2 × Rule 1 bugs, 3 × Rule 2 missing-critical, 1 × Rule 3 blocking)
**Impact on plan:** No scope creep. Deviation 1 repaired a gate that was red before this plan opened and would have stayed red for every later Phase 5 plan. Deviations 4, 5 and 6 each turn an assertion that would have passed while measuring the wrong thing into one that measures the right thing — the same class of defect three times, and the reason each is written down separately.

## Known Stubs

| Stub | File | Resolved by |
|---|---|---|
| `EXPORT_RPC_CHUNK_ROWS` is exported from a **spec** in `tests/`. Production code must not import from `tests/`; plan 05-11 must MOVE the constant and its two derivation tests into the exporter's own module. | `tests/export-payload-budget.spec.ts` | 05-11 |
| The CSV serialiser is a **measurement-only stand-in**. `packages/engine/src/csv.ts` (UISEC-02) does not exist yet; the stand-in models RFC 4180 quoting plus the leading-`=`/`+`/`-`/`@`/TAB/CR apostrophe prefix, and four assertions pin that behaviour so a size measured through it is not a size measured through the wrong escaping. | `tests/export-payload-budget.spec.ts` | 05-03 (writes `csv.ts`), 05-11 (re-runs the bounds through it) |
| The query-plan spec's tables (`entities_desc`, `entities_mixed`, `suppressions`) are **synthetic**, not the shipped schema. Phase 4's plan 04-03 defines the real entity identity; these model its shape only. | `tests/sqlite-346-query-plans.spec.ts` | 05-06 (writes the real statements against the real schema) |

Neither the query plans nor the export budget is load-bearing for a shipped surface today — this plan writes no production statement, which is one of its own prohibitions.

## Threat Flags

None. The five threats the plan's register assigns `mitigate` to are the five this plan implemented:

| Threat | Mitigation, as shipped |
|---|---|
| T-05-05 (SQL by fragment composition) | `fragment-composition`, sink-anchored, all three forms fixtured, plus a second pass so a declaration a sink consumes is reached |
| T-05-06 (CTE / subquery / UNION arm missing `project_id`) | `cte-unscoped`, `unscoped-subquery`, `unscoped-union-arm`, applied to statement pieces independently |
| T-05-07 (`INSERT … SELECT` multi-row write) | `insert-select` on the shape itself, plus `unscoped-multi-row` when the source is also unscoped |
| T-05-08 (a filter matching nothing walking the partition) | the bounded window's candidate count asserted equal at two partition sizes, against the unbounded form's partition-sized count |
| T-05-09 (a 50,000-row export string on the single thread) | bytes, peak string length and elapsed time all bounded as assertions; `EXPORT_RPC_CHUNK_ROWS` derived |

## Issues Encountered

- **No SQLite 3.46.0 is reachable from this machine.** Documented above and asserted in the spec rather than left implicit. This is the one part of the plan that is narrowed rather than delivered.
- **The RED run's first pass produced fixture noise, not rule failures.** `module-scope-await` fired on three of the fragment fixtures (deviation 3). Worth noting as a pattern: in a gate with ten rules, a fixture that trips two of them cannot prove which one the correct form clears.

## Verification

| Check | Result |
|---|---|
| `pnpm vitest run` on the three plan spec files | exit 0 — **56 tests** (36 + 8 + 12) |
| `pnpm test` | exit 0 — **38 files, 1,470 tests**. Baseline was 36 files / 1,443 tests (`05-01-SUMMARY.md`); +2 files, +27 tests, **no drop** |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 |
| `pnpm check:bundle` | exit 0 — 1 specifier (`crypto`) |
| `pnpm check:css` | exit 0 — 61 rules, all anchored |
| `pnpm check:externals` | exit 0 — 1 bare specifier (`vue`) |
| `INTERPOLATION_ALLOWLIST` entry count | 1, `migrations.ts`, scoping test green |
| Whole-tree SQL audit (`it.each(files)`) | green across every non-spec `.ts` under `packages/backend/src` |

## Self-Check: PASSED

- `tests/sqlite-346-query-plans.spec.ts` — FOUND
- `tests/export-payload-budget.spec.ts` — FOUND
- `packages/backend/src/store/sql-discipline.spec.ts` — FOUND
- Commits `f0460a2`, `7598a42`, `495ff53`, `3ab313f`, `bfabe9d` — all FOUND in `git log`
- All acceptance criteria for tasks 1–3 re-run individually and passing; the plan-level `<verification>` block re-run in full and recorded in the table above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for Wave 2.** Plan 05-06 declares `depends_on: ["05-02"]` and its precondition is met: the gate sees every shape `§ O-01` measured it silent on, so the first Phase 5 query will be audited by rules that exist rather than by rules written afterwards.

**Four things later plans must know:**

1. **`EXPORT_RPC_CHUNK_ROWS = 20,000` and the export is CHUNKED.** Plan 05-11's RPC returns chunk bodies, not whole exports: the CSV header belongs to the first chunk only, and JSON chunks are array BODIES the frontend wraps in brackets. Both seams are proved byte-identical to a single pass. **05-11 must move the constant out of `tests/`.**
2. **Use a uniform tie-break direction.** `ORDER BY last_seen_at DESC, fingerprint DESC` against a `(project_id, last_seen_at DESC, fingerprint DESC)` index. The shipped `artifacts` mixed tie-break (`… DESC, sha256 ASC`) costs both a sorter and the second cursor term, measured here.
3. **The bounded window returns a SHORT PAGE, and that is not end-of-data.** Asserted in `tests/sqlite-346-query-plans.spec.ts`. Plan 05-06's RPC return shape needs `{ rows, nextCursor, scanned, exhausted }` — `{ rows, nextCursor }` cannot express the difference.
4. **The gate now decomposes statements.** A subquery or a UNION arm is scoped on its own merits; a scoped outer query no longer covers for it. Write the correlated `s.project_id = ?` inside the subquery, as `§ O-01`'s probe P12 does.

**Two items for the operator, neither a blocker:**

- **The 3.46.0 gap is narrowed, not closed** (coverage D11). If a real 3.46.0 run is wanted before 05-06 writes the first statement, that needs a runtime this machine does not have.
- **The 8 MiB per-call RPC budget is a decision, not a measurement** (coverage D12). If Caido's RPC turns out to carry 17.5 MiB comfortably, `EXPORT_RPC_CHUNK_ROWS` can rise to 50,000 and the export becomes one call — the spec is written so that change fails loudly rather than silently.

---
*Phase: 05-workspace-operator-workflow*
*Completed: 2026-08-28*
