---
phase: 07-sourcemap-reconstruction
plan: 16
subsystem: api
tags: [export, redaction, telemetry, quickjs, sourcemap, csv, json-rpc]

# Dependency graph
requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-12's widened source_sightings primary key and the removal of the interim attribution guard, which took `sightingsDiscardedOtherArtifact` out of the `Counters` shape that LO-05's walk traverses"
  - phase: 07-sourcemap-reconstruction
    provides: "07-06's manifest export table, its `EXPORT_COLUMNS.sources` entry and the essay LO-04 amends"
provides:
  - "`redactSourceLabelForExport` — the shipped URL redactor applied to the manifest label only where a query axis exists, so a redacted export never reports withholding something that was never there"
  - "`isProtocolShapedLabel` — a backend-local restatement of the frontend's `sourcePathShape` `\"protocol\"` branch, with a spec-only drift gate diffing the two"
  - "`snapshotCounters` preserving array shape, so a health payload cannot silently carry the wrong JSON type"
  - "An executed arithmetic bound on the redacted manifest field: `redacted <= raw + EXPORT_QUERY_REDACTION`, unchanged either side of LO-04"
affects: [export, telemetry, health, sourcemap, phase-08]

actuals:
  tokens: 6456
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "A narrowed application of a shared redactor is expressed as a NAMED function that calls it, never as a per-column boolean or a second marker spelling"
    - "A classification that must exist twice across a package boundary carries a spec-only drift gate that diffs the two implementations"
    - "A blast-radius claim about a walk is proved by running the PRE-FIX walk beside the shipped one over the live object, not asserted"

key-files:
  created: []
  modified:
    - packages/backend/src/store/export.ts
    - packages/backend/src/store/export.spec.ts
    - packages/backend/src/telemetry.ts
    - packages/backend/src/telemetry.spec.ts

key-decisions:
  - "LO-04 took the NARROWED-APPLICATION exit, not a manifest-specific redaction vocabulary: `redactSourceLabelForExport` calls the unchanged `redactUrlForExport` when the label is protocol-shaped and returns the label whole otherwise. The `NO PER-COLUMN EXEMPTION IS INVENTED` argument survives intact; `URL-SHAPED BY CONSTRUCTION` does not."
  - "The shape classifier was RESTATED in the backend rather than imported: `packages/backend` depends on `@defminer/engine` alone and a `@defminer/frontend` dependency would run a Vue import graph through the SDK-facing plugin. A spec-only cross-package import supplies the drift gate instead."
  - "`structuredClone` was NOT used for LO-05. SPIKE-07 measured it `undefined` on Caido 0.57.1; the explicit array branch stays."
  - "The `as Counters` cast stays and its docblock now names what it still hides — Map, Set, Date, class instance — and says the WALK is the thing to extend."

patterns-established:
  - "Redaction is applied where its subject exists: a marker on a value with no corresponding axis is a false statement in an exported artifact, not a stronger redaction"
  - "An arithmetic safety argument is asserted over the hostile corpus rather than written in prose, because an argument nobody executes is an argument that rots"

requirements-completed: [MAP-07]

coverage:
  - id: D1
    description: "A manifest `sources` label carrying a legal `#` or `?` in its path body exports in redacted mode with the path body intact and no withheld marker"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#leaves a NON-URL label whole in redacted mode"
        status: pass
    human_judgment: false
  - id: D2
    description: "A protocol-shaped label still has its query axis withheld, with the marker present, exactly as it did before"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#still withholds a URL-shaped label's query axis in redacted mode"
        status: pass
    human_judgment: false
  - id: D3
    description: "`observations.url` redaction is byte-unchanged in both modes across four URL shapes, including a path-shaped value that must still be cut on that axis"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#leaves `observations.url` BYTE-IDENTICAL — the shared redactor did not move under LO-04"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#emits a covered field redacted in the redacted mode and as stored in the raw one"
        status: pass
    human_judgment: false
  - id: D4
    description: "The backend shape test and the frontend `sourcePathShape` agree on every hostile-corpus label plus the six shapes this plan added"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#agrees with the FRONTEND classifier on every corpus label — the two implementations, diffed"
        status: pass
    human_judgment: false
  - id: D5
    description: "An array-valued counter survives `snapshotCounters` as an array with the same elements in order, at the top level and nested inside a sub-map"
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#keeps an array-valued member an ARRAY, with the same elements in order"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#keeps an array NESTED inside a sub-map an array too — the walk recurses"
        status: pass
    human_judgment: false
  - id: D6
    description: "The snapshot is a copy and not a live alias, in both directions"
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#is a COPY and not an alias — mutating the SOURCE leaves the snapshot alone"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#is a COPY and not an alias — mutating the SNAPSHOT leaves the source alone"
        status: pass
    human_judgment: false
  - id: D7
    description: "The LO-05 fix is invisible to every counter member that exists today — the pre-fix walk and the shipped one agree key for key and value for value over the live object"
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#agrees with the PRE-FIX walk over the live counters object, key for key and value for value"
        status: pass
    human_judgment: false
  - id: D8
    description: "The export payload budget still holds, and the per-field ceiling for a redacted manifest label is unmoved by LO-04"
    verification:
      - kind: integration
        ref: "tests/export-payload-budget.spec.ts"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#bounds a redacted manifest field at RAW + one marker — the payload-budget question, answered by arithmetic"
        status: pass
    human_judgment: false

# Metrics
duration: 18 min
completed: 2026-09-02
status: complete
---

# Phase 07 Plan 16: LO-04 / LO-05 Gap Closure Summary

**A manifest redactor that reports only what it actually withheld, and a counters snapshot that cannot change a value's JSON type — both closed against RED tests, with the export payload ceiling proved unmoved by arithmetic rather than assumed.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-02T12:02:13Z (first baseline measurement)
- **Completed:** 2026-09-02T12:19:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- **LO-04 closed.** `src/components/Button#new.tsx` exported as `src/components/Button<query-redacted>` — a legal filename tail discarded and a marker claiming a query had been withheld from a value with no query axis. It now exports whole, with no marker.
- **LO-05 closed.** An array-valued counter snapshotted to `{ "0": 1, "1": 2 }`, the index keys `Object.entries` yields for an array, with the `as Counters` cast silent about it. It now survives as an array, nested arrays included.
- **The payload-budget question answered by arithmetic and asserted**, including the correction of an invariant that looked obvious and was false.
- **A drift gate for a classification that now exists twice**, so the second implementation cannot silently diverge from the frontend's.

## Task Commits

1. **Task 1 RED: failing cases for LO-04** — `e714672` (test)
2. **Task 1 GREEN: apply the manifest redactor where its subject exists** — `a901b9e` (fix)
3. **Task 2 RED: failing cases for LO-05** — `9e1d686` (test)
4. **Task 2 GREEN: snapshotCounters preserves array shape** — `7057450` (fix)
5. **Task 3: pin the blast radius of both fixes** — `0a5bd69` (test)

## Files Created/Modified

- `packages/backend/src/store/export.ts` — `isProtocolShapedLabel` and `redactSourceLabelForExport` added beside the unchanged `redactUrlForExport`; the `EXPORT_COLUMNS.sources` essay amended
- `packages/backend/src/store/export.spec.ts` — the LO-04 RED cases, the URL-shaped pins, the corpus sweep, the frontend drift gate, the payload-budget arithmetic and the `observations.url` regression pin
- `packages/backend/src/telemetry.ts` — one `Array.isArray` branch in `snapshotCounters`' walk, plus the docblock recording the `structuredClone` finding and what the cast still hides
- `packages/backend/src/telemetry.spec.ts` — the LO-05 RED cases, copy-not-alias in both directions, and the pre-fix-walk comparison

## Decisions Made

### LO-04: narrowed application, and the no-exemption argument addressed by name

The plan named two exits and preferred the narrower one; reading the code confirmed it. The `sources` entry's essay refuses a **per-column exemption** — one column quietly outside the ceremony that governs every other one. What shipped is not that. `redactSourceLabelForExport` calls the **same** `redactUrlForExport`, appends the **same** `EXPORT_QUERY_REDACTION`, and withholds exactly as much of a URL as `observations.url` does. It decides **where** the shipped redactor runs, never what it says. The raw option remains the only route to the unredacted bytes, so D-06's evidence is exactly as retrievable as before.

What the essay claimed and could not keep is **"URL-SHAPED BY CONSTRUCTION"**. `SOURCE_PATH_SHAPES` enumerates five measured shapes and four of them are paths. The sentence held for the `webpack://` prefix and never for the path body. The comment now states which half survives and which does not, rather than leaving a paragraph a verifier would read as a discharged argument.

The deeper reason to prefer this framing: a redaction that reports withholding something that was never there is not a **stronger** redaction, it is an **unreliable** one. An operator who finds one marker they can prove is false has no reason to trust the next.

### LO-04: a second shape classifier was written, and both are named

- **New:** `isProtocolShapedLabel` in `packages/backend/src/store/export.ts`
- **Existing:** `classify()` behind the exported `sourcePathShape()` in `packages/frontend/src/sourcemap/tree.ts` — its `"protocol"` branch is what the new one restates, including the `firstSlash === separator + 1` test that stops `src/a://b` from reading as an authority separator, and the four-entry `KNOWN_SCHEMES` list.

The frontend function **cannot** be reached from the backend: `packages/backend/package.json` declares `@defminer/engine` as its only dependency, and adding `@defminer/frontend` would run a Vue import graph through the one package permitted to touch the Caido SDK. Per the plan's instruction, no cross-package dependency was created.

**Beyond the plan's requirement**, a drift gate was added: `export.spec.ts` imports `sourcePathShape` — a **spec-only** import, nothing that ships — and asserts the two classifiers agree on all 23 hostile-corpus labels plus the six shapes this plan added. Two implementations of one classification is a real cost; a diff nobody runs is how that cost becomes a defect.

### LO-05: `structuredClone` is NOT available, established from the tree

The review file's parenthetical ("available on this runtime for plain data") was **not inherited**. The evidence in this repository says the opposite, in three independent places:

- `.planning/REQUIREMENTS.md` line 23 — SPIKE-07: *"ANSWERED during Phase 0 research: it is `undefined` on 0.57.1."*
- `.planning/phases/00-runtime-reality-check/results/go-no-go.json` — *"`typeof structuredClone === 'undefined'` on 0.57.1"*, recorded as a regression assertion against a live Caido run
- `tier1/parse/src/index.ts:24` — the meriyah polyfill, whose comment reads *"UNCONDITIONAL, not defensive. SPIKE-07 measured `typeof structuredClone === "undefined"` on this exact runtime"*

This module runs inside Caido's embedded QuickJS, not Node. A `typeof` guard falling back to the hand-rolled walk was rejected: it would ship both implementations and exercise only one of them in the suite. So the walk stays and gains one branch: `if (Array.isArray(value)) return value.map(copy);`

### LO-05: the cast stays, and now says what it hides

The fix does not make `as Counters` removable — `copy` returns `unknown` because it is total over shapes the type does not name. It is left in place with a docblock that names what it is still silent about (a `Map`, `Set`, `Date` or class instance, none of which this object holds) and states that **the walk is the thing to extend**, so the next person adding a member type is not told by the cast.

## RED Observations (both recorded as the plan required)

**LO-04 — 6 failing cases, pre-fix exported values:**

| Label | Pre-fix redacted export |
|---|---|
| `src/components/Button#new.tsx` | `src/components/Button<query-redacted>` |
| `src/gen/what?.ts` | `src/gen/what<query-redacted>` |
| `/srv/app/src/Button#new.tsx` | `/srv/app/src/Button<query-redacted>` |
| `C:\Temp\Button#new.tsx` | `C:\Temp\Button<query-redacted>` |
| `\\server\share\Button#new.tsx` | `\\server\share\Button<query-redacted>` |
| `src/a://b#c.ts` | `src/a://b<query-redacted>` |

**LO-05 — 4 failing cases.** `[1, 2]` attached to the live counters object snapshotted to `{ '0': 1, '1': 2 }` — exactly the index-keyed object LO-05 predicted, with `Array.isArray` reporting `false` on the projection.

## The Export Payload Budget — Measured, With One Correction

`tests/export-payload-budget.spec.ts` **passes**, and it is **structurally incapable of moving under LO-04**: its fixture is `observations`-shaped (seven columns, `ObservationRow`), it contains no `sources` table and no manifest label, and its measurement-only stand-in serialiser applies no redaction at all. Recorded rather than assumed, because the plan asked for the answer and not for a shrug.

Measured margins at this commit (50,000 rows):

| Bound | Measured | Ceiling | Margin |
|---|---|---|---|
| Serialised bytes, worst format (JSON) | 18,343,481 B (17.49 MiB) | 28 MiB | **10.51 MiB** |
| Peak single string (UTF-16 units) | 18,340,481 | 25,165,824 (24 MiB) | **6,825,343 units** |
| Per-RPC chunk payload | 20,000 rows x 366.9 B/row = 7.00 MiB | 8 MiB | **1.00 MiB** |
| Next chunk step (25,000 rows) | 8.75 MiB | must exceed 8 MiB | holds — the constant is near its budget, not conservative |

**One correction, found by this plan's own new pin and recorded because it is evidence the gate is not decorative.** The first version of the manifest bound asserted the obvious invariant *"a redacted manifest field is never longer than the raw one"*. It **failed on `webpack:///./src/app.js?v=2`: 39 characters redacted against 27 raw** — because the marker is **appended**, not substituted. That invariant was false **before this plan** as well; it was never a property of LO-04. The bound that actually holds, either side of the change, is:

```
before  min(cut, L) + 17     L = raw length, cut = index of first ?/#, 17 = |<query-redacted>|
after   L,  or  cut + 17 when the label is URL-shaped
both    <= L + 17
```

and `store/sources.ts` caps the stored label at `SOURCES_LABEL_MAX = 4096` code points at write time, so the per-field ceiling is **4,113 in both the old behaviour and the new one**. LO-04 redistributes bytes inside a bound it does not raise: a bare path gets its tail back and gives up its marker. The corrected bound is now asserted over the corpus plus the six added shapes. **No budget was widened.**

## The Health Payload's Member Set — Unmoved

The recursive walk over `slimStatus().counters` reports the **same 67 keys** before and after, and the proof is executed rather than narrated: `telemetry.spec.ts` restates the **pre-fix walk** as a measurement and asserts the shipped walk produces a deeply-equal result over the live `counters` object, seeded with non-zero counts so the comparison is over data and not over zeros. The member set (sub-map keys repeat by design, one per containing map):

```
abandonedOnProjectChange, admitted x2, analysisCacheHit, analysisPartial, analysisStale,
analysisStarted, announcedExternal, announcedInline, byteLenMismatch, consumerErrors,
depth_exceeded, derivationsChanged, derivationsGoneNoRequest, derivationsGoneNoResponse,
derivationsServed, derivationsUnavailable, derivedRejected, empty x4, hookErrors,
malformed_base64, malformed_json, mapMalformed, mapRefused, mapRefusedTooLarge,
nested_sections, noProjectSelected, not_a_map, not_scriptish x2, out_of_scope x2,
pagesWalked, processed, proxiedResponsesObserved, queueOverflow, queued, rejected x2,
reloadEmptyBody, reloadHit, reloadMissing, reloadNoResponse x2, reloadOverSize,
retentionDeleted, retentionSweeps, retro, revalidation x2, seen, sightingsRecorded,
skippedDone, sourcemap, sourcesRecovered, status x2, storeErrors, too_deep, too_large x4,
too_many_sources
```

`sightingsDiscardedOtherArtifact` is correctly **absent** — plan 07-12 removed it, and this plan neither restored it nor raced it.

## What Neither Fix Touches — Deliberate, Not Oversight

- **`EXPORT_COLUMNS` membership and column order.** The only line in that structure that changed is the `redact` function on `sources_verbatim`; `git diff` over the whole structure shows exactly one `{ name: ... }` line replaced and no entry added, removed or reordered. Three tables, nine manifest columns, same order.
- **`EXPORT_RPC_CHUNK_ROWS` (20,000) and `serialiseRows`' chunking.** The two diff hunks in `export.ts` are at lines 201 and 287; the constant is at line 131 and `serialiseRows` is below both hunks. Neither is in the diff.
- **The `Counters` type declaration** (lines 125–223). Both `telemetry.ts` hunks are at 908+ and 912+; the type gains no member and loses none. 07-12 owns that membership for this round.
- **`.planning/REQUIREMENTS.md`** — `git diff --stat` prints nothing, and `outbound-prohibition.spec.ts` (465 assertions, which byte-compares it) passes.
- **W-4, W-6 and UAT gap 3** — untouched, per the plan's prohibitions.

## Verification

| Check | Result |
|---|---|
| `pnpm vitest run` — whole suite | **89 files / 4,279 passing** (baseline 89 / 4,258; +21, never lower) |
| `packages/backend/src/store/export.spec.ts` | 119 -> **132** passing |
| `packages/backend/src/telemetry.spec.ts` | 72 -> **77** passing |
| `packages/backend/src/store/sql-discipline.spec.ts` | 46 passing |
| `tests/export-payload-budget.spec.ts` | 12 passing |
| `packages/frontend/src` (ExportDialog, HealthPanel and 25 more) | 27 files / 880 passing |
| `packages/backend/src/outbound-prohibition.spec.ts` | 465 passing |
| `pnpm typecheck && pnpm lint && pnpm knip` | exit **0 / 0 / 0** |
| `pnpm build` | exit **0** |
| `vue-tsc` (finding W-4 baseline) | **6 errors — 4 `SettingsPanel.vue`, 2 `SourceBrowser.spec.ts`.** Unchanged; did not grow. |
| `git diff --stat .planning/REQUIREMENTS.md` | prints nothing |
| Invisible-separator scan (finding W-2 class) | all four modified files **CLEAN** before every commit |

## Deviations from Plan

### Additions beyond the plan, both inside scope

**1. [Rule 2 - Missing Critical] A drift gate for the duplicated shape classifier**
- **Found during:** Task 1
- **Issue:** The plan required only that the SUMMARY *name* both implementations. A classification restated across a package boundary with nothing diffing it is a defect waiting for the frontend to change one branch.
- **Fix:** `export.spec.ts` imports `sourcePathShape` from the frontend — a **spec-only** import, nothing shipped — and asserts agreement across the corpus plus six added shapes.
- **Files modified:** `packages/backend/src/store/export.spec.ts`
- **Verification:** Passes; `pnpm knip`, `pnpm lint`, `pnpm typecheck` and `pnpm build` all exit 0 with the import present, and the shipped bundle is unaffected because a `.spec.ts` is not in it.
- **Committed in:** `a901b9e`

**2. [Rule 1 - Bug] The manifest payload bound as first written was false**
- **Found during:** Task 3
- **Issue:** The first version asserted "redacted is never longer than raw" and failed on `webpack:///./src/app.js?v=2` (39 vs 27) because the marker is appended.
- **Fix:** Replaced with the bound that actually holds — `redacted <= raw + |EXPORT_QUERY_REDACTION|` — with the before/after arithmetic and the `SOURCES_LABEL_MAX` ceiling written into the comment.
- **Files modified:** `packages/backend/src/store/export.spec.ts`
- **Verification:** Passes over 29 labels. The corrected statement is strictly more informative: it shows the ceiling is 4,113 before **and** after, so LO-04 raised nothing.
- **Committed in:** `0a5bd69` (caught before commit; the wrong assertion was never committed)

**3. [Rule 3 - Blocking] `--reporter=basic` is not a vitest 4 reporter**
- **Found during:** Task 1
- **Issue:** vitest 4.1.11 fails at startup with `Failed to load custom Reporter from basic`.
- **Fix:** Used `--reporter=dot`, which is what the plan's `<verify>` blocks specify anyway.
- **Files modified:** none
- **Verification:** All `<verify>` commands ran as written in the plan.

---

**Total deviations:** 3 (1 added gate, 1 bug in this plan's own new test, 1 tooling)
**Impact on plan:** No scope creep. Every prohibition holds and is asserted rather than claimed.

## Issues Encountered

**One eslint/prettier round-trip per commit.** Formatting errors in the added blocks were fixed with `pnpm exec eslint --fix` — note `npx eslint` fails here with `EBADDEVENGINES` because the repo pins pnpm. No behavioural change; `pnpm lint` exits 0.

**No prohibited command was run.** No `git stash` in any form, no `git clean`, no branch created or switched, no `git update-ref`. The one working-tree restore used was `git checkout -- packages/backend/src/telemetry.spec.ts`, scoped to a single file, to remove a temporary `console.log` after capturing the member set above; `git status --short` was empty immediately afterwards.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **LO-04 CLOSED** — `a901b9e`
- **LO-05 CLOSED** — `7057450`
- Both blast radii are pinned by executed tests, so a later change to either surface is loud rather than silent.
- Wave 3 of the gap-closure round is complete for this plan. Remaining phase-07 findings W-4, W-6 and UAT gap 3 are untouched by design and remain open for whoever owns them.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

## Requirement MAP-07 — Already Complete, and Deliberately Not Re-Marked

`requirements.ready-ids` reports `MAP-07` as `1/1 ready`, and `.planning/REQUIREMENTS.md:844` **already** carries it as `- [x]`, marked when plan 07-06 shipped the manifest. `requirements.mark-complete` was therefore **not** run.

That is not a shortcut. This plan's prohibitions include "No change to `.planning/REQUIREMENTS.md`", and Task 3's own `<verify>` names the gate that enforces it: `outbound-prohibition.spec.ts` byte-compares that file and its `fails_when` reads *"a failure means `.planning/REQUIREMENTS.md` was touched, which this plan prohibits"*. Running a mutation whose only possible effect is to touch a byte-pinned file, for a checkbox already in the state it would set, would have turned 465 green assertions red for nothing. The ledger is correct on disk without the write.

## Self-Check: PASSED

- All four modified files exist on disk.
- All six commits (`e714672`, `a901b9e`, `9e1d686`, `7057450`, `0a5bd69`, `922460f`) resolve in `git log --oneline --all`.
- Every `<verify>` command in the plan was re-run at close-out and every one exits 0.
- Every `<acceptance_criteria>` item across the three tasks is satisfied by an assertion recorded in the Verification table above.
