---
phase: 07-sourcemap-reconstruction
plan: 04
subsystem: database
tags: [sqlite, migrations, sourcemap, content-addressed, closed-vocabulary, keyset-pagination, schema-gate]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "the artifacts/observations identity split D-05 copies; migrations.ts's forward-only ladder and its SCHEMA_VERSION derivation; schema.spec.ts's four structural gates (EXPECTED_TABLES, COLUMN_ALLOWLIST, FORBIDDEN_COLUMNS, the pk-ordinal rule); observations.ts's named-cap-per-target-controlled-column pattern and its describeError-then-slice catch shape; sql-discipline.spec.ts's fifteen rules"
  - phase: 05-frontend
    provides: "reads.ts's keyset paging, KEYSET_PAGE_ROWS = 100, PageCursor/PageResponse, the deterministic tie-break rule, and ArtifactsTable.vue's shipped optional-lookup-map prop precedent; the coalescer's INVALIDATION_CATEGORIES-derived pending map"
  - phase: 06-retroactive-scan-deployment-reality
    provides: "step v5's CREATE-TABLE model with its closed CHECK vocabulary; the SCAN_LIFECYCLE_STATES two-vocabularies essay this plan's third collision joins; D-24's PERMITTED_DECLARED_TYPES gate with its BLOB and untyped failure fixtures; retry.ts's RETRY_ANALYSIS_SQL guarded-update shape; the migration ladder's v6/v7 measurement that BEGIN does not span exec calls"
  - phase: 07-sourcemap-reconstruction
    provides: "plan 07-01's SOURCE_ROWS_PER_MAP_MAX = 2,048 and the 23-case SOURCES_LABEL_CASES / SOURCES_LABEL_CASE_IDS corpus in map-fixture.ts; plan 07-02's parse.ts, its RecoveredSource type and its per-index skip list; plan 07-03's D-12 sources-sink gate and D-17 codec ban, both of which walk packages/backend/src and therefore stand over store/sources.ts with no edit"
provides:
  - "migration step v8 — `sources` and `source_sightings`, both tables and both ascending indexes in ONE exec, under the FOURTH one-way EXPECTED_TABLES approval"
  - "packages/engine/src/contract.ts — SOURCE_PRODUCIBILITY_STATES, the SourceProducibility type, assertNoOtherProducibility, and the third-collision note at the point of declaration"
  - "INVALIDATION_CATEGORIES gains `sources` and `source_sightings`, appended by the phase that added the tables"
  - "packages/backend/src/store/sources.ts — SOURCES_LABEL_MAX with its own justification, upsertRecoveredSource, recordSighting, markProducibility, countSourcesForMap"
  - "packages/backend/src/store/reads.ts — listRecoveredSourcesPage (keyset, never sortable) and countRecoveredSourcesByArtifact (a map that distinguishes a RESOLVED zero from UNKNOWN)"
  - "schema.spec.ts's EXPECTED_TABLES at eight members with four named approval events, and fifteen new COLUMN_ALLOWLIST entries carrying the sources_verbatim argument in full"
affects: [07-05, 07-06, 07-07, 07-08, 07-09, 07-10]

actuals:
  tokens: 26454
  tasks: 4
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A SECOND ENTITY CLASS UNDER THE SHIPPED IDENTITY MODEL. `sources` is `artifacts` and `source_sightings` is `observations`, so cross-bundle dedupe is not code — it falls out of the primary key and holds for writes nobody coordinated"
    - "STICKINESS AS A PROPERTY OF THE STATEMENT, NOT OF THE CALLER. A trailing `AND col = ?` bound to the initial vocabulary member makes a guarded UPDATE idempotent, which is the only form available on a driver with no transaction primitive"
    - "OMIT A COLUMN FROM AN UPSERT'S UPDATE ARM DELIBERATELY, AND SAY WHY AT THE STATEMENT. `first_seen_at`, `recovered_at` and `producibility` are each omitted for a different reason, and one of the three omissions is the difference between a working tombstone and a silently-cleared one"
    - "A VOCABULARY'S ADJACENCY ASSERTED AGAINST THE FILE'S OWN TEXT. A collision note is only load-bearing while the declarations it sits between stay adjacent; the distance is measured rather than trusted"
    - "REFUSE THE OBVIOUS AGGREGATE WHEN IT CANNOT EXPRESS THE ZERO. `GROUP BY` over the child table can only emit parents that HAVE children, so the resolved zero is precisely the row it cannot produce — drive from the parent and admit on two grounds instead"
    - "NARROWER CONTRACT, SMALLER MATRIX, ARGUED. A read with no sort keys and no filters gets two literals rather than four unreachable slots added to make it resemble its neighbours"

key-files:
  created:
    - packages/backend/src/store/sources.ts
    - packages/backend/src/store/sources.spec.ts
  modified:
    - packages/engine/src/contract.ts
    - packages/engine/src/contract.spec.ts
    - packages/backend/src/store/migrations.ts
    - packages/backend/src/store/migrations.spec.ts
    - packages/backend/src/store/schema.spec.ts
    - packages/backend/src/store/reads.ts
    - packages/backend/src/store/reads.spec.ts
    - packages/backend/src/api/spec.ts
    - packages/frontend/src/stores/coalescer.spec.ts

key-decisions:
  - "OPTION A, APPROVED AS SPECIFIED, 2026-09-02. The fourth one-way EXPECTED_TABLES approval — two tables, fifteen columns, two ascending indexes, migration v8 — recorded in that array's own doc comment beside plan 01-01 (2026-08-20), plan 05-06 (2026-08-28) and plan 06-01 (2026-08-31). No column was added, removed or retyped from what the operator was shown"
  - "THE COST D-09 ACCEPTS IS RECORDED WITH NO EXEMPTION. One row per recovered source under the normal retention caps: a 781-source map is 781 rows in each table against a DEFAULT_RETENTION_MAX_ROWS of 50,000, so eviction is met sooner here than on any other table. Written into the EXPECTED_TABLES approval comment and into step v8's own doc comment, not only into this summary"
  - "SOURCES_LABEL_MAX = 4096, DECLARED IN sources.ts WITH ITS OWN JUSTIFICATION rather than reused from URL_MAX by association. D-06's 'verbatim' means unsanitised and unnormalised, NOT unbounded. 4,096 sits above both 1,024-grapheme display caps so the truncation the operator sees is the DISPLAY one, and it is exactly the size of map-fixture.ts's four-kilobyte-label case so the boundary is exercised by a fixture that already exists"
  - "sources_verbatim IS NOT REDACTED AT WRITE TIME, and the allowlist says so in those words. D-06 forbids it — the label is evidence — so this column's safety rests entirely on R1/R2 at render and on the O-08 display normaliser, which is a DISPLAY control and not a STORAGE control. The contrast with observations.url is stated: WR-07 redacts a URL's VALUES because they are credentials; a module path is not a credential and redacting it would destroy the evidence"
  - "THE COUNT MAP IS DRIVEN FROM `artifacts`, NOT GROUPED OVER `source_sightings`. The obvious statement can only emit artifacts that have sightings, so the resolved zero it is supposed to carry is exactly the row it cannot produce. Admission is on two EXISTS grounds — sightings exist, or a `done` analysis exists — and `partial`/`failed` deliberately do NOT resolve a zero, because a walk that stopped early is not in a position to claim a bundle is clean"
  - "THE RECOVERED-SOURCE READ IS NOT ADDED TO reads.ts's STATEMENT MATRIX. That matrix enumerates sort key x direction x cursor x filter because artifacts and observations have those axes; this read has none — 07-UI-SPEC.md fixes the order as the map's own declaration order, which IS the evidence — so two literals is the complete matrix and four unreachable slots would enumerate axes the contract forbids"
  - "THE KEYSET TIE-BREAK IS map_sha256, because ONE ARTIFACT CAN CARRY MORE THAN ONE MAP (a bundle plus its vendor chunk) and source_index is only unique within a map. Without it two rows at the same index order arbitrarily and the cursor skips or repeats at a page boundary — asserted by a case paged at 3 across six rows tied in pairs"
  - "markProducibility WAS DEFERRED OUT OF THE TRACER COMMIT into task 3, where the plan assigns it, so every commit is knip-green rather than carrying an export whose only consumer arrives one task later"

patterns-established:
  - "Measure a comment's adjacency, not just its presence: read the file's own text, find both declarations, assert the line delta — a note that has drifted is a note the next reader meets one list at a time"
  - "When an upsert's UPDATE arm omits a column, execute the defect the omission prevents. `re-running recordSighting does NOT un-stick a tombstone` is worth more than a comment saying it will not"
  - "Pair every nullability assertion with a control that stores the lookalike: SQL NULL is asserted via `IS NULL` and `typeof()`, and a sighting that really did carry the four characters \"null\" sits beside it reading back as text"
  - "A case that iterates an empty collection and then asserts an empty table has measured nothing — it passes against a deleted writer. Run the SAME loop over a control input that DOES write, in the same case"
  - "Derive a spec's expected shape from the constant the implementation derives from. A hand-copied literal is a second declaration of that list and goes stale the day a later phase appends to it, reddening assertions that have no opinion about the change"

requirements-completed: [MAP-02, MAP-06]

coverage:
  - id: D1
    description: "Migration step v8 lands both tables and both ascending indexes in one atomic exec, with SCHEMA_VERSION derived from the ladder and never restated"
    requirement: MAP-02
    verification:
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#the ladder head is step v8 — the version bump IS the appended entry"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#migrates a fresh database to the head version"
        status: pass
    human_judgment: false
  - id: D2
    description: "EXPECTED_TABLES holds exactly eight members in name ASC order under a fourth named one-way approval, and every new column is on the explicit allowlist"
    requirement: MAP-02
    verification:
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#every column across every table is on the explicit allowlist"
        status: pass
      - kind: manual
        ref: "RED demonstration — removing `sources_verbatim` from COLUMN_ALLOWLIST fails that case naming the column (message recorded below)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No column on either new table can hold content: every declared type is TEXT or INTEGER, and both mechanisms that would allow otherwise (BLOB, untyped) are executed as failures against the real ladder"
    requirement: MAP-02
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#holds NO content column on either table, in any encoding (D-07)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#every column of every table declares one of the three scalar affinities (D-24)"
        status: pass
      - kind: manual
        ref: "RED demonstrations — a scratch BLOB column and a scratch untyped column in step v8, both messages recorded below"
        status: pass
    human_judgment: false
  - id: D4
    description: "SOURCE_PRODUCIBILITY_STATES is the third closed vocabulary, declared within 40 lines of the second with the third-collision note, and its CHECK constraint is read back out of the schema and compared member-by-member"
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#is declared IMMEDIATELY AFTER SCAN_LIFECYCLE_STATES, asserted against the file"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#the CHECK constraint's members equal SOURCE_PRODUCIBILITY_STATES"
        status: pass
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#its operator-facing words are safe against the nine already in use"
        status: pass
      - kind: manual
        ref: "RED demonstration — adding a member to the array without the migration turns the read-back red (message recorded below)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Cross-bundle dedupe: the same source content in two bundles is ONE sources row and TWO source_sightings rows, with both artifact digests preserved"
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#the SAME content in TWO bundles is ONE sources row and TWO sightings"
        status: pass
    human_judgment: false
  - id: D6
    description: "The four Pitfall 3 nullability shapes each store something different, each asserted with a control"
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#an index with NO CONTENT stores a NULL source_sha256 and creates no sources row"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#a `sources[i]` that is itself null stores SQL NULL, never the string \"null\""
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#a sourcesContent SHORTER than sources writes sightings only for the indexes within it"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#a map with NO sourcesContent at all writes zero sightings and is not an error"
        status: pass
    human_judgment: false
  - id: D7
    description: "Every SOURCES_LABEL_CASES member at or below SOURCES_LABEL_MAX round-trips byte-identically, with the exercised id set asserted equal to SOURCES_LABEL_CASE_IDS and the 4096/4097 boundary exercised from both sides"
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#every SPIKE-12 label at or below the cap comes back exactly as it went in"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#bounds the label at SOURCES_LABEL_MAX, exercised from BOTH sides"
        status: pass
    human_judgment: false
  - id: D8
    description: "D-23's producibility write is idempotent by statement construction — one row changed, then zero, and a second attempt cannot un-stick a tombstone or move producibility_at"
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#changes one row, then zero, and the second call cannot move producibility_at"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#re-running it does NOT un-stick a tombstone"
        status: pass
      - kind: manual
        ref: "RED demonstration — replacing a `?` with a colon-prefixed named parameter turns sql-discipline.spec.ts red naming store/sources.ts (message recorded below)"
        status: pass
    human_judgment: false
  - id: D9
    description: "listRecoveredSourcesPage is a keyset read ordered by source_index ASC with a deterministic tie-break, correct across a page boundary at KEYSET_PAGE_ROWS and KEYSET_PAGE_ROWS + 1, and a NULL source_sha256 row is present rather than dropped"
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#pages at exactly KEYSET_PAGE_ROWS with no duplicate and no gap"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#breaks ties on map_sha256 when one artifact carries TWO maps"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#returns a row whose source_sha256 is NULL — present, not absent"
        status: pass
    human_judgment: false
  - id: D10
    description: "countRecoveredSourcesByArtifact distinguishes a RESOLVED zero from UNKNOWN as two different observations"
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#gives a RESOLVED zero for an analysed artifact that yielded nothing, and NO entry for one never analysed"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#does not resolve a zero for an analysis that stopped early"
        status: pass
    human_judgment: false
  - id: D11
    description: "The plugin's shipped table set now includes two tables holding evidence about the operator's targets, under a one-way migration against live databases"
    verification: []
    human_judgment: true
    rationale: "The approval itself is the human artifact. What no test can check is whether the operator, having seen the eviction cost D-09 accepts, is content with it once real maps are in the database — that is a judgment about their own retention budget and it becomes answerable only when plan 07-05 starts writing rows and Phase 6's D-25 footprint readout shows the shape"

duration: 20 min
completed: 2026-09-02
status: complete
---

# Phase 7 Plan 04: Recovered-source persistence Summary

**Two content-addressed tables, a third closed vocabulary and a keyset read give recovered source a place to be REMEMBERED without ever being STORED — no content column in any encoding, on either table, in the migration the operator approved for exactly that shape.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-02T01:10:00Z
- **Completed:** 2026-09-02T01:34:00Z
- **Tasks:** 4 of 4 (task 1 was the blocking-human checkpoint)
- **Files modified:** 11 (2 created, 9 modified)

## Accomplishments

- **Migration `v: 8` landed under the fourth one-way approval.** `sources` (5 columns) and `source_sightings` (10 columns) plus `idx_source_sightings_artifact` and `idx_sources_seen`, all four statements in ONE `exec` — because `MULTISTATEMENT_EXEC_ATOMIC = true` while `TRANSACTION_PERSISTS_ACROSS_EXEC = false`, so a sighting whose `sources` table did not arrive is exactly the invariant that may not span two steps. `SCHEMA_VERSION` evaluates to 8 without being restated anywhere.
- **`EXPECTED_TABLES` grew to eight and its comment now names four approval events.** The count in the comment's first line was rewritten in the same commit as the array, which is the drift shape that comment exists to prevent.
- **D-07 holds from two independent directions and both failure paths were watched red.** Every column on both tables declares `TEXT` or `INTEGER`; a scratch BLOB column and a scratch untyped column were each added to the real step v8 and each turned `schema.spec.ts` red with the D-24 argument in the message.
- **The third closed vocabulary is declared 40 lines after the second**, with the third-collision note at the point of declaration, and its CHECK constraint is read back out of the schema and compared member-by-member to the contract array.
- **Cross-bundle dedupe, the four nullability shapes and byte-identical round-trip over all 23 SPIKE-12 labels are asserted properties**, not comments.
- **The drill-down has its read**, keyset-paged and deliberately not sortable, plus a count map that keeps a resolved zero distinguishable from an unknown before any pixel depends on the difference.

## Task Commits

1. **Task 1: CHECKPOINT — the fourth one-way `EXPECTED_TABLES` approval** — no commit; the checkpoint was returned before any migration was written, and the operator replied **option A, approve as specified**, on **2026-09-02**.
2. **Task 2: TRACER — migration v8, both tables, one write, one read, all gates green** — `9c1781f` (feat)
3. **Task 3: The write surface — dedupe, nullability, and D-23's sticky UPDATE** — `57d3f29` (feat)
4. **Task 4: The paged read the drill-down consumes** — `923bed8` (feat)

## The approved checkpoint option, and its date

**Option A — approve as specified. 2026-09-02. Plan 07-04, `gate="blocking-human"`.**

The fourth one-way `EXPECTED_TABLES` approval in this repository's history, joining plan 01-01 (option-a, 2026-08-20), plan 05-06 (`blocking-human`, option-a, 2026-08-28) and plan 06-01 (`blocking-human`, approve-as-specified, 2026-08-31). All four are named in that array's own doc comment.

The operator was shown, before any migration was written: both full column lists with types and constraints, both index definitions, the migration version, the one-way half (reversing D-07 means adding a content column, which fires `schema.spec.ts` by design and re-opens Phase 6's D-24 and its "DEPLOY-04 is satisfied by construction" claim), and the cost D-09 accepts with no exemption. Options B (narrower `source_sightings`), C (one denormalised table) and D (do not add tables this phase) were offered explicitly. No column was added, removed or retyped from what was shown.

## The final column lists, as shipped

**`sources`** — one row per distinct recovered source CONTENT. `PRIMARY KEY (project_id, source_sha256)`.

| Column | Declaration |
|---|---|
| `project_id` | `TEXT NOT NULL CHECK (length(project_id) > 0)` |
| `source_sha256` | `TEXT NOT NULL CHECK (length(source_sha256) = 64)` |
| `byte_len` | `INTEGER NOT NULL` |
| `line_count` | `INTEGER NOT NULL` |
| `first_seen_at` | `INTEGER NOT NULL` |

**`source_sightings`** — one row per `(map, index)` sighting. `PRIMARY KEY (project_id, map_sha256, source_index)`.

| Column | Declaration |
|---|---|
| `project_id` | `TEXT NOT NULL CHECK (length(project_id) > 0)` |
| `map_sha256` | `TEXT NOT NULL CHECK (length(map_sha256) = 64)` |
| `source_index` | `INTEGER NOT NULL` |
| `artifact_sha256` | `TEXT NOT NULL CHECK (length(artifact_sha256) = 64)` |
| `request_id` | `TEXT NOT NULL` |
| `source_sha256` | `TEXT` (nullable) |
| `sources_verbatim` | `TEXT` (nullable) |
| `producibility` | `TEXT NOT NULL CHECK (producibility IN ('producible','gone','changed'))` |
| `producibility_at` | `INTEGER` (nullable) |
| `recovered_at` | `INTEGER NOT NULL` |

**Indexes:** `idx_source_sightings_artifact ON source_sightings (project_id, artifact_sha256, source_index)` and `idx_sources_seen ON sources (project_id, first_seen_at, source_sha256)`, both ascending only.

Fifteen columns, fifteen `COLUMN_ALLOWLIST` entries. No `id`, no `body`, no BLOB, no untyped column, no JSON blob, no per-reason column, and no content column in any encoding.

## The four RED demonstrations, with their messages

**1. A new column removed from `COLUMN_ALLOWLIST`.** `sources_verbatim` deleted from the `source_sightings` entry:

```
FAIL packages/backend/src/store/schema.spec.ts > schema shape (STORE-01, STORE-02, T-01-21)
     > every column across every table is on the explicit allowlist
AssertionError: expected [ 'artifact_sha256', …(9) ] to deeply equal [ 'artifact_sha256', …(8) ]
+   "sources_verbatim",
```

**2. A BLOB column added to the REAL step v8** (`cached BLOB`, also added to the allowlist so the declared-type rule is what fires):

```
FAIL … > every column of every table declares one of the three scalar affinities (D-24)
[ "sources.cached declares type `BLOB`, which is not one of INTEGER, REAL, TEXT. D-24: no
  column may hold a response body, header values, cookies, authorization material or artifact
  content. DEPLOY-04 is satisfied BY CONSTRUCTION — DefMiner writes no files and stores no
  bodies, so its whole server-disk footprint is fixed-shape metadata already bounded by
  retention on rows and on age, and no quota or orphan-cleanup machinery ships because nothing
  can create what it would reclaim. A binary-affinity column re-opens that guarantee and
  decision D-24 with it. If this column is genuinely needed, re-open D-24 deliberately rather
  than widening this set." ]
```

**3. An UNTYPED column added to the REAL step v8** (`scratch`, likewise allowlisted):

```
FAIL … > every column of every table declares one of the three scalar affinities (D-24)
[ "sources.scratch is declared with NO TYPE AT ALL, which takes BLOB affinity in SQLite — the
  case a name-based check misses entirely. D-24: no column may hold a response body, … " ]
```

**4. A colon-prefixed named parameter in `markProducibility`'s UPDATE:**

```
FAIL packages/backend/src/store/sql-discipline.spec.ts
     > packages/backend/src/store/sources.ts passes every SQL-discipline rule
[ "named-parameter: string literal: SQL contains a colon-prefixed parameter token. This driver
  does NOT support named parameters — they never bind and nothing reports it. Use positional ?
  and spread the values into run()/get()/all()." ]
```

That fourth message names `store/sources.ts` by path, which is the acceptance criterion it was run for: `sql-discipline.spec.ts` walks every non-spec `.ts` under `packages/backend/src` at any depth, so the new module entered the gate with **no edit to the gate**.

**A fifth, run for the vocabulary read-back.** Adding `pending_recheck` to `SOURCE_PRODUCIBILITY_STATES` without touching the migration:

```
FAIL … > the CHECK constraint's members equal SOURCE_PRODUCIBILITY_STATES
AssertionError: expected [ 'producible', 'gone', 'changed' ] to deeply equal
                         [ 'producible', 'gone', …(2) ]
-   "pending_recheck",
```

All five scratch edits were reverted and the suite is green at `923bed8`.

## The `SOURCES_LABEL_MAX` boundary observation

**This is the one place Phase 7 bounds evidence, and the reason is stated rather than assumed.**

D-06's "verbatim" means UNSANITISED and UNNORMALISED — nothing on the write path trims, normalises, percent-decodes or sanitises the label, which is what makes the NUL-byte, RTL-override, fullwidth-dot and trailing-dots-and-spaces cases survive it intact. It does **not** mean UNBOUNDED. A target-controlled string at rest is bounded here exactly as `observations.url` is bounded at `URL_MAX`.

`SOURCES_LABEL_MAX = 4096`, declared in `store/sources.ts` with its own justification rather than inherited from `URL_MAX` by association:

- **Above both shipped 1,024-grapheme display caps**, so the truncation the operator actually sees is the DISPLAY one — at the surface that has the sanitiser in front of it. A storage cap below the display cap would silently become the display cap and move the boundary somewhere nothing tests.
- **Exactly the size of `map-fixture.ts`'s `four-kilobyte-label` case**, so the boundary is exercised by a fixture that already exists rather than by a number chosen to be convenient. That is pinned: `expect(fourKilobyte?.value).toHaveLength(SOURCES_LABEL_MAX)`.

Measured from both sides. At 4,096 characters the value round-trips whole. At 4,097 the stored value is exactly 4,096 characters and is a **prefix** of what the map declared — not a hash, not an ellipsis, not a marker, so the operator's truncated view is still the target's own bytes. Every one of the 23 `SOURCES_LABEL_CASES` sits at or below the cap and every one round-trips byte-identically, with the exercised id set asserted EQUAL to `SOURCES_LABEL_CASE_IDS`.

## The O-07 pre-emption paragraph, verbatim for `07-VERIFICATION.md`

> **The O-07 pre-emption, owed by UI-SPEC Named Conflict 2 and repeated here so `07-10` can carry it forward:** D-11 already ships a slice of ERR-02/OBS-02 ahead of Phase 2, and defining a producibility axis WIDENS that pre-emption. Phase 7 defines an axis OBS-02 does not yet own. If Phase 2 rules that producibility belongs inside one vocabulary, **this column is what changes**, and the change is bounded: a `migrations.ts` forward step plus one presentation map. Recording it here is the honest form; discovering it in a Phase 2 review is not.

Assumption **A9 (RESEARCH)** rides on it: the producibility axis survives Phase 2's OBS-02 review as a separate column. If it does not, the cost is the paragraph above and it is bounded.

## The D-09 retention cost, recorded so it is not rediscovered

**One row per recovered source, under the NORMAL retention caps, with no exemption.** A 781-source map is 781 `sources` rows and 781 `source_sightings` rows against a `DEFAULT_RETENTION_MAX_ROWS` of 50,000, so a handful of large maps consumes the budget and the operator meets eviction sooner here than on any other table. `SOURCE_ROWS_PER_MAP_MAX = 2,048` bounds the per-map half — `countSourcesForMap` is the count the caller compares against, and the named refusal is plan 07-05's, as is the sweep-cadence half. Phase 6's D-25 footprint readout will show the shape once rows exist.

This is written into `EXPECTED_TABLES`'s approval comment and into step v8's doc comment, not only here, because a cost that lives only in a summary is a cost the next person does not read.

## Files Created/Modified

- `packages/backend/src/store/sources.ts` — **created.** `SOURCES_LABEL_MAX`, `upsertRecoveredSource`, `recordSighting`, `markProducibility`, `countSourcesForMap`, and the four module-scope SQL strings each statement lives in.
- `packages/backend/src/store/sources.spec.ts` — **created.** 20 cases: round-trip, the no-content-column claim, the CHECK read-back, cross-bundle dedupe, the four nullability shapes, the label corpus, the boundary, D-23's stickiness, idempotency, and the row bound.
- `packages/engine/src/contract.ts` — `SOURCE_PRODUCIBILITY_STATES`, `SourceProducibility`, `assertNoOtherProducibility`, the third-collision note, and two appended `INVALIDATION_CATEGORIES` members.
- `packages/engine/src/contract.spec.ts` — the vocabulary's membership/order, its adjacency against the file's own text, the collision note's presence, no overlap with either scan vocabulary, the operator-word prefix check in both directions with a non-vacuity control, and a call site for the exhaustiveness helper.
- `packages/backend/src/store/migrations.ts` — step `v: 8`, with the argument for one-step atomicity, the natural-key rule, the two nullable columns, and the D-09 cost.
- `packages/backend/src/store/migrations.spec.ts` — ladder head pinned at 8, the step list extended, and the "WAS 7" note recording why.
- `packages/backend/src/store/schema.spec.ts` — `EXPECTED_TABLES` at eight with four named approvals; fifteen allowlist entries; the `sources_verbatim` justification in `observations.url`'s register.
- `packages/backend/src/store/reads.ts` — `RecoveredSourceRow`, `listRecoveredSourcesPage`, `countRecoveredSourcesByArtifact` and their three statements.
- `packages/backend/src/store/reads.spec.ts` — 10 new cases plus the 64-character fixture helpers the Phase 7 CHECKs require.
- `packages/backend/src/api/spec.ts` — one amended doc paragraph (see Deviations).
- `packages/frontend/src/stores/coalescer.spec.ts` — expected pending maps derived rather than hand-copied (see Deviations).

## Decisions Made

Recorded in the `key-decisions` frontmatter above. The three that will be asked about:

1. **`partial` and `failed` do not resolve a zero in the count map.** A walk that stopped early is not in a position to claim a bundle has no sources. An artifact with a `partial` analysis that DOES have sightings still gets its count, on the other admission ground — what was recorded was recorded.
2. **`recordSighting`'s UPDATE arm omits `producibility` and `recovered_at`.** Including `producibility` would clear every tombstone on re-analysis, silently, because the write reports success either way. That defect is executed as a case rather than described.
3. **The new read is not in the statement matrix.** Its contract has no sort and no filter axis; enumerating four slots to make it resemble its neighbours would be enumerating axes `07-UI-SPEC.md` forbids.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `packages/backend/src/api/spec.ts`'s contract comment became false**

- **Found during:** Task 2 (contract vocabulary)
- **Issue:** That file's `Spec` doc comment read "What D-15 asked for LITERALLY — a fourth `InvalidationCategory` — is NOT done" and "`INVALIDATION_CATEGORIES` still holds exactly three members". Appending the two Phase 7 entity categories made both sentences false. The argument the paragraph makes — scan progress is a payload variant and never a category — is untouched, but a contract comment describing a build that no longer exists is exactly the "security property becomes folklore" failure 06-UI-SPEC.md § "Amendments" names.
- **Fix:** Amended to say "a `scans` `InvalidationCategory`" and "holds ENTITY tables only and still holds nothing scan-shaped", with a paragraph recording what the sentence used to say and why it changed.
- **Files modified:** `packages/backend/src/api/spec.ts`
- **Verification:** `pnpm typecheck && pnpm lint` green.
- **Committed in:** `9c1781f`

**2. [Rule 1 - Bug] `contract.spec.ts` pinned a COUNT where the property was "nothing scan-shaped"**

- **Found during:** Task 2
- **Issue:** The Phase 6 case `leaves INVALIDATION_CATEGORIES at three members with nothing scan-shaped in it` asserted `toHaveLength(3)`. That assertion failed on this plan's two entity appends — a change it has no opinion about — while a `scans` member added in the same edit would have **kept** the length at three and passed. It measured the wrong thing in both directions.
- **Fix:** Dropped the count from that case and kept the three `not.toContain` assertions, with a comment recording why the count was the wrong thing to pin. The membership-and-order pin lives in the block above, which is where a reviewer looking for the list's contents goes.
- **Files modified:** `packages/engine/src/contract.spec.ts`
- **Verification:** `pnpm vitest run packages/engine/src/contract.spec.ts` — 60 passed.
- **Committed in:** `9c1781f`

**3. [Rule 1 - Bug] `coalescer.spec.ts` hand-copied the category list into two expected objects**

- **Found during:** Task 4 (`pnpm test`)
- **Issue:** Two cases asserted `pendingByCategory` against a written-out `{artifacts, observations, analyses}` literal. The store's own `zeroed()` derives its keys from `INVALIDATION_CATEGORIES`, so the literals were a second declaration of that list and went stale the moment this plan appended to it — reddening two frontend cases that have nothing to do with recovered source.
- **Fix:** Added a `pendingZeroed()` helper that derives the baseline from `INVALIDATION_CATEGORIES`, spread into the one case that overrides three categories and used whole in the case that asserts all-zero.
- **Files modified:** `packages/frontend/src/stores/coalescer.spec.ts`
- **Verification:** `pnpm test` — 80 files, 3,712 tests, all passing.
- **Committed in:** `923bed8`

**4. [Rule 3 - Blocker] `reads.spec.ts`'s nine-character digest fixture cannot satisfy the Phase 7 CHECKs**

- **Found during:** Task 4
- **Issue:** That file's shipped `digest(n)` produces `d00000001` — nine characters. `sources`, `source_sightings.map_sha256` and `source_sightings.artifact_sha256` each carry `CHECK (length(x) = 64)`, so every new fixture insert failed with `CHECK constraint failed`.
- **Fix:** Added `wide(prefix, n)` / `mapDigest` / `wideDigest` helpers local to the Phase 7 block, padding on the RIGHT after a fixed-width numeric part so the text ordering the cursor depends on is identical to `digest`'s. The existing helper is untouched and the new one's doc comment says the constraint was working, not in the way.
- **Files modified:** `packages/backend/src/store/reads.spec.ts`
- **Verification:** `pnpm vitest run packages/backend/src/store/reads.spec.ts` — 60 passed.
- **Committed in:** `923bed8`

**5. [Rule 2 - Missing critical] The count map as first written could not express a resolved zero**

- **Found during:** Task 4
- **Issue:** `countRecoveredSourcesByArtifact` was first written as `SELECT artifact_sha256, COUNT(*) … GROUP BY artifact_sha256` over `source_sightings`. That statement can only emit artifacts that HAVE sightings, so the resolved zero it exists to carry is precisely the row it cannot produce. It would have returned plausible numbers and silently collapsed "DefMiner looked and found none" into "DefMiner has not looked" — the zero-versus-unknown distinction the `Sources` column exists for, inverted.
- **Fix:** Rewrote it to drive from `artifacts` and admit a row on either of two `project_id`-scoped `EXISTS` grounds — the artifact has sightings, or it has a `done` analysis. Both the defect and the reasoning are in the statement's doc comment.
- **Files modified:** `packages/backend/src/store/reads.ts`
- **Verification:** Three cases in `reads.spec.ts` assert the resolved zero, the absent entry, and that `partial`/`failed` do not resolve.
- **Committed in:** `923bed8`

**6. [Task-boundary adjustment] `markProducibility` deferred out of the tracer commit**

- **Found during:** Task 2
- **Issue:** `markProducibility` was written into `store/sources.ts` alongside the tracer's two functions, but its only consumer (its spec cases) belongs to Task 3. `pnpm knip` reported it as an unused export, so the tracer commit would not have been knip-green.
- **Fix:** Removed it from the file for the Task 2 commit and restored it, unchanged, at the start of Task 3 — which is where the plan assigns it. Both commits are individually green under `typecheck`, `lint` and `knip`.
- **Files modified:** `packages/backend/src/store/sources.ts`
- **Verification:** `pnpm knip` exits 0 at both `9c1781f` and `57d3f29`.
- **Committed in:** `9c1781f` / `57d3f29`

---

**Total deviations:** 6 — three Rule 1 (stale or wrongly-scoped assertions), one Rule 3 (fixture blocker), one Rule 2 (missing correctness in a read that would have shipped a wrong claim), one task-boundary adjustment.
**Impact on plan:** No scope creep. Every one of the six is inside the blast radius of a change this plan made: appending to `INVALIDATION_CATEGORIES` reddened three assertions that had pinned a copy of it, the new CHECKs reddened a fixture helper, and the count map's first shape could not express its own contract. Deviations 2 and 3 both replaced a hand-copied or count-based assertion with a derived one, which is the same lesson twice and is recorded as a pattern.

## Issues Encountered

**A `git stash` was run by accident and immediately reverted.** While inspecting `pnpm knip` output during Task 2, a compound Bash command included `git stash`, which stashed the uncommitted Task 2 work. It was detected in the same turn and restored with `git stash pop`; `git stash list` is empty and the working tree was byte-identical afterwards. Nothing was lost and nothing was committed in the interim. Recorded because `git stash` is explicitly prohibited for executors — the stash list is shared across worktrees and a pop can silently apply a sibling's WIP. This run was on the main working tree with no siblings and the stash was created and popped within the same second, so the prohibited failure mode could not have occurred; the prohibition still held and the command should not have been run.

**The 40-line adjacency budget for `SOURCE_PRODUCIBILITY_STATES` is tight and took three attempts to hit.** The collision note had to carry the orthogonality argument, all four combinations and both keep-apart mechanisms inside 21 comment lines. It fits at exactly 40 and `contract.spec.ts` now asserts it, so the next edit that pushes the two declarations apart fails at the guard rather than being discovered by a reader who met one list without the other.

## Known Stubs

None. No hardcoded empty values flow to a UI surface, no placeholder text was introduced, no test is skipped or marked todo, and every `<verify>` command in the plan was run.

## Threat Flags

None. Every surface this plan adds is in the plan's `<threat_model>` register: `sources_verbatim` at the parsed-map → SQLite boundary (T-07-08 / T-07-27), the two-table `project_id` scoping (T-07-09), the SPREAD bind discipline (T-07-28), `describeError` on every catch (T-07-10), the sticky tombstone (T-07-29), the row bound (T-07-16) and `artifact_sha256` as D-24's re-verification input (T-07-30). No dependency was added, so T-07-SC is discharged the way 07-03 discharged it — `pnpm knip` exits 0 with no unlisted import.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for plan 07-05.** It gets `upsertRecoveredSource`, `recordSighting` and `countSourcesForMap` to write through, `SOURCE_ROWS_PER_MAP_MAX` already bounding the per-map row count, and the named refusal plus the retention sweep-cadence fix are its two remaining pieces — both called out in its own plan as changes to Phase 1 machinery.

**Ready for plan 07-06.** `source_sightings.artifact_sha256` is stored so `deriveSource` can re-verify a reloaded body against it and fail closed, `request_id` is what it hands to `sdk.requests.get`, and `markProducibility` is the sticky write its two undefined branches resolve into.

**Ready for plans 07-07 and 07-09.** `SOURCE_PRODUCIBILITY_STATES` is the single source 07-07's presentation map derives from, and `countRecoveredSourcesByArtifact` returns the `ReadonlyMap<string, number>` 07-09's `Sources` column consumes as an optional lookup-map prop — with the resolved-zero-versus-unknown distinction already a data-layer fact.

**Owed to `07-VERIFICATION.md`:** the O-07 pre-emption paragraph above, verbatim.

**No blockers.** `pnpm test` (80 files, 3,712 tests), `pnpm typecheck`, `pnpm lint` and `pnpm knip` are all green at `923bed8`.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

## Self-Check: PASSED

- `packages/backend/src/store/sources.ts` — FOUND
- `packages/backend/src/store/sources.spec.ts` — FOUND
- `.planning/phases/07-sourcemap-reconstruction/07-04-SUMMARY.md` — FOUND
- `9c1781f` / `57d3f29` / `923bed8` — all three task commits present in `git log`
