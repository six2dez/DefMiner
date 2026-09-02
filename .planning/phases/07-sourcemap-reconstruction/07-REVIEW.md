---
phase: 07-sourcemap-reconstruction
reviewed: 2026-09-02T14:00:00Z
depth: standard
round: 2
files_reviewed: 31
files_reviewed_list:
  - packages/backend/src/a8-measure.spec.ts
  - packages/backend/src/api/spec.ts
  - packages/backend/src/index.spec.ts
  - packages/backend/src/index.ts
  - packages/backend/src/ingest/consumer.spec.ts
  - packages/backend/src/ingest/consumer.ts
  - packages/backend/src/store/export.spec.ts
  - packages/backend/src/store/export.ts
  - packages/backend/src/store/migrations.spec.ts
  - packages/backend/src/store/migrations.ts
  - packages/backend/src/store/retention.spec.ts
  - packages/backend/src/store/retention.ts
  - packages/backend/src/store/schema.spec.ts
  - packages/backend/src/store/sources.spec.ts
  - packages/backend/src/store/sources.ts
  - packages/backend/src/telemetry.spec.ts
  - packages/backend/src/telemetry.ts
  - packages/engine/src/sourcemap/announce.spec.ts
  - packages/engine/src/sourcemap/announce.ts
  - packages/engine/src/sourcemap/parse.spec.ts
  - packages/engine/src/sourcemap/parse.ts
  - packages/engine/src/thresholds.spec.ts
  - packages/engine/src/thresholds.ts
  - packages/frontend/src/api/client.spec.ts
  - packages/frontend/src/api/client.ts
  - packages/frontend/src/components/SourceBrowser.spec.ts
  - packages/frontend/src/components/SourceBrowser.vue
  - packages/frontend/src/components/SourcePositionStrip.spec.ts
  - packages/frontend/src/components/SourceViewer.spec.ts
  - packages/frontend/src/sourcemap/tree.spec.ts
  - packages/frontend/src/sourcemap/tree.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 7: Code Review Report (round 2 — gap-closure verification)

**Reviewed:** 2026-09-02T14:00:00Z
**Depth:** standard (per-file read of every changed production module, plus targeted cross-file tracing of the retention cascade, the v9 rebuild's interruption states, the D-24 argument chain and the two convergence inequalities)
**Files Reviewed:** 31
**Status:** issues_found

## Summary

**Every round-1 finding is genuinely closed.** I checked each one against the shipped property rather than against the commit that claims it, and I say which check I ran in **Closures Verified** below — including the two the executors asked to be adjudicated, and the `NOT IN` NULL hazard, which I traced through the DDL rather than through the comment.

**The `NOT IN` is safe, plainly.** `UNSIGHTED_SOURCES_SQL`'s subquery carries `AND source_sha256 IS NOT NULL`, so no NULL can enter the probe list; and the outer `sources.source_sha256` is `NOT NULL` and PK ordinal 2 in migration `v: 8`, so the left-hand side cannot be NULL either. Both halves of SQL's `NOT IN` trap are closed, the closure of the dangerous half is executed by `retention.spec.ts:1648` rather than asserted, and the statement text itself is pinned (`expect(sql).toContain("IS NOT NULL")`). I ran the suite: 31 in-scope spec files green, `tsc --build` green, `eslint` green, `knip` clean apart from the repo's standing `@internal` tag hints.

What I did find is one defect **introduced by this round** and two that the round's own edits made reachable:

- **WR-01** is the round's own arithmetic. Plan 07-14 retired the `2 *` factor from `ROWS_INSERTED_PER_ITERATION_MAX` and wrote the new number down — `(2,179, exact)` — in one docblock of `thresholds.ts` while leaving the *neighbouring* docblock, the one that derives `RETENTION_SWEEP_MAX_PASSES = 16`, computing `4,227` in three places. `retention.ts` gets it right and `thresholds.ts` contradicts it. The constant that convergence now hangs on no longer has a derivation that evaluates.
- **WR-02** is the shape of the new cascade. `deleteDigest` still cascades `observations` and `analyses` only, so an artifact eviction now deletes the parent and leaves its sightings behind — which is the exact state `retention.ts`'s header says three times the cascade cannot create. It converges, because step 3d and `workRemains` catch it; it converges *across passes*, which is not what the invariant says.
- **WR-03** is LO-04's blast radius. The narrowing is right in principle, but its stated premise — "a label that is not a URL has neither axis" — is false for the vite/webpack loader-query shape (`src/App.vue?vue&type=script`), which is relative, real and absent from the 23-label corpus. The redacted export mode now emits those tails verbatim where it used to suppress them, and nothing tests it.

No finding in this round lets a target-controlled byte reach a filename, a template, a path sink, a command or the DOM; none defeats D-24's fail-closed arm; none is a data-loss risk. **There is no BLOCKER.**

*(No `<structural_findings>` block was supplied for this review, so there is no fallow-substrate section.)*

---

## Critical Issues

*(None.)*

---

## Warnings

### WR-01: plan 07-14 retired the `2 *` factor and left `RETENTION_SWEEP_MAX_PASSES`'s derivation computing the pre-retirement insert side — 16's justification now evaluates to 8, and `thresholds.ts` contradicts `retention.ts`

**Classification:** WARNING
**Files:**
- `packages/engine/src/thresholds.ts:154-197` (the `RETENTION_SWEEP_MAX_PASSES` docblock), against `:490-491` (`ROWS_INSERTED_PER_ITERATION_MAX`) and `:215` (`RETENTION_SWEEP_EVERY_N`)
- `packages/backend/src/store/retention.ts:183-184` (the same arithmetic, correct)

**Issue:** after this round `ROWS_INSERTED_PER_ITERATION_MAX = ROWS_INSERTED_PER_ARTIFACT_MAX + SOURCE_ROWS_PER_MAP_MAX = 3 + 2048 = 2051`, so the inequality's right-hand side is `RETENTION_SWEEP_EVERY_N + ROWS_INSERTED_PER_ITERATION_MAX = 128 + 2051 = 2179`. The docblock that *derives the constant* still reads the pre-07-14 value in three separate sentences:

```
 *   8,192 >= 4,227, which is ~1.9x headroom.
 * ... Raising RETENTION_SWEEP_MAX_ROWS to 4,227 breaks the 1024-row cost cap ...
 * SIXTEEN, AND NOT NINE. Nine is the smallest integer that satisfies the
 * inequality (4,227 / 512 = 8.26).
```

`4,227` is `128 + 3 + 2 * 2048` — the sum with the compensating factor plan 07-14 deleted. The true figures are `8,192 >= 2,179` (**3.76x**, not 1.9x) and `2,179 / 512 = 4.26`, so the smallest satisfying integer is **5** and "the next power of two" is **8**, not 16. The constant 16 is safe — it over-satisfies — but its stated derivation no longer produces it, which is the one thing this repository's threshold discipline exists to prevent.

The contradiction is inside one round and across two files. `ROWS_INSERTED_PER_ITERATION_MAX`'s own new paragraph (`:483`) writes *"the factor was retired second (2,179, exact)"*, and `retention.ts:183` writes *"512 x 16 = 8,192 against 128 + 2,051 = 2,179"*. Only the constant's own derivation was left behind.

`thresholds.spec.ts:260-281, 335-341` asserts the inequality **computed from the constants**, so nothing fails and nothing will: the spec is exactly the gate that cannot catch this class of drift.

**Fix:** rewrite the three numbers in the `RETENTION_SWEEP_MAX_PASSES` docblock and re-derive the choice of 16 from the real quotient — either as "8 is the next power of two above 4.26 and 16 is one doubling of margin, stated as margin", or by lowering the constant. Then make the arithmetic executable so it cannot drift a third time:

```ts
// thresholds.spec.ts — pin the headroom the docblock claims, not just the sign.
const deleteSide = T.RETENTION_SWEEP_MAX_ROWS * T.RETENTION_SWEEP_MAX_PASSES;
const insertSide = T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ITERATION_MAX;
expect(insertSide, "the docblock's right-hand side").toBe(2179);
expect(
  T.RETENTION_SWEEP_MAX_PASSES,
  "RETENTION_SWEEP_MAX_PASSES is derived as the next power of two at or above " +
    "ceil(insertSide / RETENTION_SWEEP_MAX_ROWS); update the derivation with it.",
).toBe(nextPowerOfTwo(Math.ceil(insertSide / T.RETENTION_SWEEP_MAX_ROWS)));
expect(deleteSide).toBeGreaterThanOrEqual(insertSide);
```

---

### WR-02: the artifact cascade still deletes only `observations` and `analyses`, so every eviction now creates orphan sightings by construction — which `retention.ts` states three times it cannot do

**Classification:** WARNING
**Files:**
- `packages/backend/src/store/retention.ts:1092-1155` (`deleteDigest`)
- `packages/backend/src/store/retention.ts:42-45` (the header's invariant), `:392-395` (`ORPHAN_OBSERVATIONS_SQL`'s "the cascade below cannot create one")
- `packages/backend/src/store/retention.ts:905-951` (step 3d, where the orphans are collected instead)

**Issue:** the module's central ordering claim is stated in the header —

> *"the cascade is therefore explicit and runs in dependency order — a digest's observations and analyses go BEFORE the artifact itself, so a pass that runs out of budget halfway leaves a parent with fewer children and never a child with no parent"*

— and restated at `ORPHAN_OBSERVATIONS_SQL`: *"The cascade below cannot create one — children go first."* Plan 07-13 added a **third** child table without adding it to the cascade. `deleteDigest` enumerates `OBSERVATION_KEYS_FOR_DIGEST_SQL` and `ANALYSIS_KEYS_FOR_DIGEST_SQL`, then deletes `DELETE_ARTIFACT_SQL`. It never touches `source_sightings`. So the sequence for every evicted map-bearing bundle is: delete its observations, delete its analyses, **delete the artifact row while its sightings still name it**, and only later — in step 3d, in the same pass *if the budget survives* — collect those rows through `ORPHAN_SIGHTINGS_SQL`.

That is not a crash-recovery path. It is the ordinary path, taken on every eviction of a bundle that carried a map.

**Failure scenario (reachable, not contrived):** a pass whose budget is consumed by the artifact loop. 512 evictable artifacts with no observations and no analyses cost exactly 512 deletes; the loop ends with `budget() === 0` and `moreWork` unset, step 2 and step 3d are skipped by their `budget() > 0` guards, and the pass returns having orphaned every one of those bundles' sightings. `workRemains` then sets `moreWork` via `ORPHAN_SIGHTINGS_SQL`, so the state is repaired on a later pass or a later cadence — but between them the database holds children with no parent, which is precisely the state the module says it never produces. `retention.spec.ts:1337`'s cascade case drives `sweepToConvergence`, i.e. repeated passes, so the single-pass property is not the one under test.

Impact is consistency and documentation, not loss: `readSightingOrigin` LEFT JOINs `artifacts` and answers `byte_len: null` for the window, and the anti-join is protected in the safe direction (an unswept sighting keeps its `sources` row alive). But a reader who takes the header's invariant at face value — and one will, because it is the module's most emphatic paragraph — will reason wrongly about it.

**Fix:** either put the sightings inside the cascade, in dependency order like the other two children:

```ts
// deleteDigest, between the analyses arm and DELETE_ARTIFACT_SQL
const sightLimit = Math.min(left(), CANDIDATE_SCAN_LIMIT);
const sightStmt = await db.prepare(SIGHTING_KEYS_FOR_DIGEST_SQL); // new: WHERE project_id=? AND artifact_sha256=?
const sights = sightLimit <= 0 ? [] : await sightStmt.all(projectId, sha256, sightLimit);
examined += sights.length;
for (const s of sights) {
  if (left() <= 0) return { examined, deleted, capped: true, artifactRemoved: false };
  deleted += await remove(DELETE_SIGHTING_SQL, [projectId, sha256, String(s.map_sha256), Number(s.source_index)]);
}
if (obs.length >= obsLimit || ana.length >= anaLimit || sights.length >= sightLimit) {
  return { examined, deleted, capped: true, artifactRemoved: false };
}
```

(the keyset prefix `(project_id, artifact_sha256, …)` is exactly `idx_source_sightings_artifact`'s leading columns, so it is an indexed enumeration) — **or**, if the operator's CASCADE ordering deliberately wants sightings swept in the 3d phase, amend the header and the `ORPHAN_OBSERVATIONS_SQL` paragraph to say so: that `source_sightings` is reaped as an orphan **by design**, that the "never a child with no parent" invariant is scoped to `observations` and `analyses`, and that the orphan window closes at the next pass. Silence on which of the two is intended is the defect.

---

### WR-03: LO-04's narrowing removes redaction from a real relative-label shape its own premise denies exists — the vite/webpack loader query — and the corpus that "proves" the change safe contains no `?` at all

**Classification:** WARNING
**Files:**
- `packages/backend/src/store/export.ts:245-274` (`isProtocolShapedLabel`, `redactSourceLabelForExport`), applied at `:385`
- `packages/backend/src/store/export.spec.ts:908-925` (the corpus assertion)
- `packages/engine/src/sourcemap/map-fixture.ts:220-345` (`SOURCES_LABEL_CASES` — 23 entries, none containing `?`)

**Issue:** the fix is right about `src/components/Button#new.tsx`, and the drift gate against `sourcePathShape` is a good control. The premise it rests on is not sound:

> *"A label that is not a URL has neither axis, so there is no query to withhold and the marker would be a FALSE STATEMENT in an exported artifact"*

A `sources` entry is not a URL, but it is also not only a path: the webpack/vite ecosystem routinely emits **relative** labels carrying a loader query — `src/App.vue?vue&type=script&setup=true&lang.ts`, `assets/worker.ts?worker`, `img/logo.svg?url`. `classify()` puts every one of those in `relative`, `isProtocolShapedLabel` returns `false`, and `redactSourceLabelForExport` now returns them **whole**. The redacted export mode therefore discloses strictly more of the phase's one target-controlled at-rest column than it did before this round, on a shape that is ordinary rather than hostile.

The change is not covered by anything. `SOURCES_LABEL_CASES` has 23 entries and not one carries a `?` — `export.spec.ts:908` asserts exactly that ("none of them has a query axis"), which is why every corpus case passes identically in both modes and why the regression is invisible. The six `extra` labels added at `:891-898` for the drift gate include query-bearing *protocol* shapes and one relative `#` case, but no relative `?` case.

Two honest counterweights, stated so this is not overread: the value still goes through `stripForExport` and `csvField`'s formula neutralisation, so there is no injection here; and the residual `redactUrlForExport` was written for — a credential pasted into a query *name* — is a property of observed HTTP URLs and is not something a bundler's loader query carries. So this is a **coverage narrowing on the safe mode**, not an exposure of a known secret class. It is still the safe mode disclosing more than it did, justified by a sentence that is factually wrong, with no test.

**Fix:** decide which claim is being made, and make the corpus carry it either way.

- If a loader query is analytic content the operator should see (defensible), say so instead of saying non-URL labels have no query axis, and add the shape to `SOURCES_LABEL_CASES` so `export.spec.ts:908`'s "none of them has a query axis" becomes a statement somebody re-checked:

```ts
{ why: "a vite loader query on a RELATIVE label — a query axis on a non-URL",
  value: "src/App.vue?vue&type=script&setup=true&lang.ts" },
```

- If it is a residual, apply the shipped redactor whenever a query axis is *present* rather than whenever the label is protocol-shaped, and keep the "never claim a redaction that did not happen" property by construction:

```ts
export function redactSourceLabelForExport(label: string): string {
  // The marker is appended only when there was something to withhold, so it
  // can never be a false statement — which is LO-04's real requirement.
  return label.search(/[?#]/) === -1 ? label : redactUrlForExport(label);
}
```

Note that the second form also fixes the `Button#new.tsx` case's *marker* problem only if `#` is excluded; if the intent is "queries yes, fragments no for paths", split the two characters and say which is which.

---

## Info

### IN-01: the hoisted depth refusal is counted and logged for a stage in which nothing could have recursed, and the number beside it is the wrong count — adjudicated

**Classification:** WARNING (low) — accepted trade-off, but the corner is real and nothing pins it
**File:** `packages/backend/src/ingest/consumer.ts:1272-1287`

**Issue:** the executors flagged this and asked for adjudication. My verdict: the fix is correct and the residual is real but small, and it is *two* inaccuracies rather than the one recorded.

```ts
const nextDepth = admitDerivedDepth(input.depth + 1);
if (!nextDepth.ok && parsed.recovered.length > 0) {
  sm.derivedRejected[nextDepth.reason]++;
  log("reconstruction of the " + String(parsed.recovered.length) + " source(s) …");
}
```

1. **The recorded one:** the message names `parsed.recovered.length`, which over-states when `admitDerived` refuses some sources below.
2. **The one the comment does not name:** the *counter* fires on the same condition. If **every** recovered source is refused by `admitDerived` (all empty, or all over `DERIVED_SOURCE_MAX_BYTES` — both reachable from one hostile map), no recursion would have been attempted at any depth, so the bound did not fire — and `derivedRejected.depth_exceeded` says it did. The telemetry docblock at `telemetry.ts:314-341` states the unit as "one reconstruction stage that DECLINED TO RECURSE" and that "a non-zero value here always means at least one map-bearing artifact reached the bound", which is exactly the claim this corner breaks.

Magnitude is one increment per map-bearing artifact against the 781 the fix removed, and no health surface carries the counter (`SOURCEMAP_COUNTERS` names six sourcemap fields and this is not one). So the fix is a large net improvement and this is not a reason to reopen MD-03.

**Fix (exact, and still one refusal per stage):** decide at the top, report at the bottom, from what actually happened.

```ts
const nextDepth = admitDerivedDepth(input.depth + 1);
let admittedForRecursion = 0;
// … inside the loop, after `admitted.ok`: admittedForRecursion += 1;
// … after the loop:
if (!nextDepth.ok && admittedForRecursion > 0) {
  sm.derivedRejected[nextDepth.reason]++;
  log("reconstruction of the " + String(admittedForRecursion) + " admitted source(s) …");
}
```

and add the pinning case `consumer.spec.ts` currently lacks: a map whose every `sourcesContent` entry is the empty string, asserting `derivedRejected.depth_exceeded === 0`.

### IN-02: `DERIVED_MAX_DEPTH` is imported by `consumer.ts` and referenced only inside comments — an unused import both gates miss

**Classification:** WARNING (low)
**File:** `packages/backend/src/ingest/consumer.ts:87`

**Issue:** the binding appears at the import and then only at `:980`, `:1083` and `:1500`, all of which are `{@link}` prose. It is dead as a value. It is **pre-existing** (unchanged by this round) but it sits in the file MD-03 rewrote, and neither automated gate reports it: `knip` sees `derive.ts`'s export as consumed and stops there, and `eslint packages/backend/src/ingest/consumer.ts` exits 0 with no output, so `@typescript-eslint/no-unused-vars` is not reporting unused import bindings in this configuration. `tsconfig.base.json` sets no `noUnusedLocals` either.

**Fix:** drop it from the import list (the `{@link}` references resolve through TypeDoc without a value import). If the intent is the "referenced so the derivation is not merely a comment" trick `retention.ts:194-197` uses for `ROWS_INSERTED_PER_ARTIFACT_MAX`, do it the same way and say so:

```ts
// Referenced so a build where DERIVED_MAX_DEPTH stopped existing fails here.
const _DEPTH_BOUND = DERIVED_MAX_DEPTH;
```

Separately worth deciding: enabling `noUnusedLocals` repo-wide, since this class currently passes lint, typecheck and knip together.

### IN-03: `ORPHAN_SIGHTINGS_SQL`'s comment says it selects "the four key columns"; it selects three

**Classification:** WARNING (low)
**File:** `packages/backend/src/store/retention.ts:496-497`

**Issue:** *"The four key columns are selected because the key IS four columns since migration `v: 9`, and every delete below binds all four."* The statement selects `artifact_sha256, map_sha256, source_index` — three. `project_id` is a bound parameter, not a selected column. The second half of the sentence is correct (`DELETE_SIGHTING_SQL` binds all four). Ordinary elsewhere; in this file, where a reader is invited to verify key arity from the comment, it is one word that has to be re-checked against the SQL.

**Fix:** *"The three non-scope key columns are selected; `project_id` is the bound scope, and every delete below binds all four."*

### IN-04: the spec-only cross-package import pulls a frontend module into the backend's TypeScript program, which is compiled without the DOM lib — adjudicated as safe today, fragile tomorrow

**Classification:** WARNING (low)
**Files:** `packages/backend/src/store/export.spec.ts:56`; `packages/backend/tsconfig.json`; `packages/backend/package.json`

**Issue:** the executors asked whether anything shipped depends on it. **It does not, and I verified rather than assumed:** `packages/backend/package.json`'s `dependencies` is `{"@defminer/engine": "workspace:*"}` and is unchanged by this round; `sourcePathShape` appears in exactly one backend file and that file is a spec; the drift gate at `export.spec.ts:883` is the only consumer. `tsc --build` is green at HEAD and `knip` reports nothing new. The import is correct and the gate it enables is worth having.

The residual is a build-graph one. `packages/backend/tsconfig.json` has `include: ["src/**/*.ts", "test/**/*.ts"]`, no `references` to the frontend project, `types: ["node", "@caido/quickjs-types", "@caido/sdk-backend"]` and inherits `lib: ["es2023"]` — no DOM. The relative import therefore drags `packages/frontend/src/sourcemap/tree.ts` (and transitively `safety/display.ts`) into the *backend's* program under those settings. It typechecks only because `display.ts`'s single import is `@defminer/engine/sanitise` and neither module touches a DOM type. The day either one gains an `HTMLElement`, a `document` or a `Node`, `pnpm typecheck` fails **in the backend project**, pointing at a frontend file, for a reason no reader of either package will connect to a spec-only drift gate.

**Fix:** keep the import and cap the cost, either by stating the constraint where it can be checked —

```ts
// packages/frontend/src/sourcemap/tree.ts (header)
// NO DOM TYPES IN THIS MODULE OR IN `safety/display.ts`. `packages/backend`'s
// `store/export.spec.ts` imports `sourcePathShape` as a drift gate and compiles
// under `lib: es2023` with no DOM, so a DOM reference here breaks the BACKEND
// typecheck. It is pure string work today and must stay so.
```

— or by moving `sourcePathShape` (nine lines of pure string classification, no Vue, no DOM) into `@defminer/engine`, which both packages already depend on. That would delete the second implementation in `export.ts` and the drift gate with it, rather than keeping two of each.

---

## Closures Verified (and therefore not reported)

Stated positively, because "closed" is only useful if it says what was checked.

**HI-01 / HI-02 — closed before this round, verified by reading.** `display.ts:248-253` now calls `forDisplayTextTruncated(withTabsExpanded(value), SOURCE_LINE_MAX_GRAPHEMES)` — the truncation question is asked of the truncation step, not of the string inequality, so a CRLF line no longer answers `true`. `sourceLineCounts` (`:285-291`) takes both integers from **one** `forDisplay` call over the same prepared, sanitised string, in the cap's own unit. Landed in `9b5f7d0` and `affc693`, both ancestors of the gap-closure round, so outside my diff but confirmed present at HEAD.

**HI-03 / W-3 — closed, and the closure is structural.** Migration `v: 9` (`migrations.ts:963-1002`) rebuilds `source_sightings` with `PRIMARY KEY (project_id, artifact_sha256, map_sha256, source_index)`; `RECORD_SIGHTING_SQL`'s conflict target names all four (`sources.ts:172`); `MARK_PRODUCIBILITY_SQL` and `SIGHTING_ORIGIN_SQL` both carry `artifact_sha256` in key order; `SourceRef` grew the field at all four hops (`contract.ts:284`, `api/spec.ts:446`, `client.ts:845`, `SourceBrowser.vue:311`) with `CONTRACT_VERSION` 6→7 on both sides. **D-24 is not reopened:** `reloadVerifiedBundle` (`index.ts:394-401, 493`) still reads `origin.request_id` and `origin.artifact_sha256` out of the matched row and compares the row's digest against `sha256Hex(raw)` — never against the caller's `artifactSha256`. A ref naming a bundle that never carried the `(map, index)` matches no row, is answered `unavailable`, and writes no producibility row.

**The v9 rebuild is lossless in all three interruption states, checked by construction rather than by the docblock.** Widening a key can only separate rows the narrower key already separated, so `INSERT OR IGNORE` has nothing to skip. Statement 1's `CREATE TABLE IF NOT EXISTS source_sightings` is the recovery for the interrupted-after-drop state (statement 3 always has a table to read); the completed-but-unversioned re-entry copies every row out and back because the two shapes have identical columns; statement 6 restores the index `DROP TABLE` took with it. `migrations.spec.ts:1063, 1123, 1191, 1232, 1261` executes the statement order positionally and all three states against a real migrated fixture. The interim attribution guard and `sightingsDiscardedOtherArtifact` are gone, and `telemetry.spec.ts` asserts the counter's absence.

**HI-04 — closed pre-round; the shipped loop is what makes it true.** `consumer.ts:1626-1633` repeats the bounded pass while it is making progress, capped at `RETENTION_SWEEP_MAX_PASSES`, `yieldToLoop()` between passes, `stopped` re-checked every time round, and `runRetentionPass` returns `summary.moreWork && summary.deleted > 0` — a spin guard that makes a failing sweep cost one pass per cadence rather than sixteen. The `due` test is a **crossing** test (`processedForSweep - lastSweptAtProcessedCount >= N`), not a modulo, which is correct for an interval that steps over boundaries. Measured at HEAD by `a8-measure.spec.ts`: Run B drained a 20,000-row backlog against a ceiling of 100 in 77 passes. Only WR-01 above is left of it, and that is the arithmetic in the comment, not the behaviour.

**W-5 / deferred D1 — closed.** `source_sightings` now takes **both** ordinary bounds (`SIGHTINGS_OVER_AGE_SQL`, `SIGHTINGS_OLDEST_SQL`, with age-arm-first de-duplication in the artifact cascade's shape) plus the orphan arm; `sources` takes the inherited edge via the anti-join, sightings-before-sources with `sightingsCapped` enforcing it in every pass; `workRemains` asks about all three so the multi-pass drain does not stop one pass early; `retentionCounts` reports both tables. The `NOT IN` NULL hazard is closed on both sides and executed, as set out in the Summary. I also checked the failure direction of the `sightingsCapped` guard: a delete that *fails* leaves its sighting present, which protects its `sources` row — the anti-join can only ever delete too few, never too many.

**MD-01 / LO-01 / LO-02 — closed.** `absorb` compares `acc.declared * ROWS_PER_RECOVERED_SOURCE > limits.maxSourceRows` (`parse.ts:378`), so 1,024 sources are accepted at exactly 2,048 rows and 1,025 refused at 2,050 — the unit the constant is derived in. `ROWS_INSERTED_PER_ITERATION_MAX` dropped the compensating `2 *` (and one *iteration* really is bounded at 2,051: `recovered ≤ declared ≤ 1024`, two rows each, plus three base rows). `decodeInlineMap` refuses on `url.length - prefix.length` **before** `url.slice` — I checked the `toLowerCase()` prefix-offset hazard again under the new arithmetic, and it is unreachable, because every single-code-unit character whose lowercase is ASCII stays one unit and the expanding cases insert non-ASCII combining marks that cannot match either ASCII prefix. `announce.ts` recognises all four ECMAScript line terminators and bounds the slice at `URL_MAX`; I verified the "nothing reachable is cut" claim arithmetically — a URL cut at `URL_MAX` leaves a payload of at least `encodedCeiling(MAP_MAX_BYTES) + 85`, so a truncated URL is always a `too_large` refusal and never a mis-parse.

**MD-02 — closed, and the root merge really was already safe.** The interior merge compares `candidate.mergeKey === segment.raw` (`tree.ts:563-566`); `mergeKey` is the raw segment, is never a field of the frozen `SourceTreeNode`, and the `duplicate` marker deliberately still counts display labels so the two-directories-that-render-alike case is *marked* rather than silently merged. `rootByLabel` is keyed on `classify`'s raw `rootLabel` with `forCellText` applied only at construction, which I confirmed by reading rather than accepting.

**MD-03 / MD-04 / LO-03 — closed.** The depth question is asked once per stage at the recursion call site with the in-callee gate retained as a backstop (the residual is IN-01). `countSourcesForMap` has a production caller at `consumer.ts:1180`, scoped `(project, artifact, map)` — which after v9 is the only scope that does not refuse bundle B for rows bundle A wrote — behind an `stillCurrent()` re-check, above the per-source loop, refusing through the shipped `too_many_sources` reason; the docblock now says it is a second enforcement point rather than the only one, which is what MD-04 actually asked for. `truncateToCodePoints` (`sources.ts:120-129`) is correct at every boundary I traced: `charCodeAt(unit + 1)` past the end yields `NaN` and falls to the one-unit branch, the loop is bounded by the cap rather than by the input, and it returns the value itself when it fits.

**LO-04 / LO-05 — closed, with WR-03 as the residual.** `redactUrlForExport` is untouched and `observations.url`'s output is byte-identical; `isProtocolShapedLabel` agrees with `sourcePathShape` on every corpus label plus six extras, and I diffed the two implementations by hand as well — they are the same two tests in the same order, and `classify`'s later windows-drive branch cannot disagree because `C://x` reaches the authority test first in both. `snapshotCounters` handles arrays with `value.map(copy)`; the `structuredClone` alternative is correctly rejected (SPIKE-07 measured it absent on Caido 0.57.1).

**Project invariants re-checked.** `schema.spec.ts`'s `EXPECTED_TABLES` literal is byte-identical — the fifth one-way approval changed a key, not a table set, and the count in the prose moved without the array moving, which is the right way round. No content column arrives anywhere: `source_sightings` still holds ten columns, none of them content in any encoding, and `sources` five. `outbound-prohibition.spec.ts` and `sources-sink-prohibition.spec.ts` are untouched by this round and green.

---

_Reviewed: 2026-09-02T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
