---
phase: 07-sourcemap-reconstruction
reviewed: 2026-09-02T06:20:00Z
depth: deep
files_reviewed: 28
files_reviewed_list:
  - packages/engine/src/sourcemap/announce.ts
  - packages/engine/src/sourcemap/parse.ts
  - packages/engine/src/sourcemap/map-fixture.ts
  - packages/engine/src/decode.ts
  - packages/engine/src/sanitise.ts
  - packages/engine/src/thresholds.ts
  - packages/engine/src/contract.ts
  - packages/engine/src/csv.ts
  - packages/backend/src/index.ts
  - packages/backend/src/api/spec.ts
  - packages/backend/src/telemetry.ts
  - packages/backend/src/ingest/consumer.ts
  - packages/backend/src/sourcemap/derive.ts
  - packages/backend/src/store/sources.ts
  - packages/backend/src/store/reads.ts
  - packages/backend/src/store/export.ts
  - packages/backend/src/store/migrations.ts
  - packages/backend/src/store/retention.ts
  - packages/backend/src/sources-sink-prohibition.spec.ts
  - packages/frontend/src/App.vue
  - packages/frontend/src/api/client.ts
  - packages/frontend/src/safety/display.ts
  - packages/frontend/src/sourcemap/tree.ts
  - packages/frontend/src/components/SourceViewer.vue
  - packages/frontend/src/components/SourcePositionStrip.vue
  - packages/frontend/src/components/SourceTree.vue
  - packages/frontend/src/components/SourceBrowser.vue
  - packages/frontend/src/components/source-filename.ts
findings:
  critical: 4
  warning: 4
  info: 5
  total: 13
severity_breakdown:
  CRITICAL: 0
  HIGH: 4
  MEDIUM: 4
  LOW: 5
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-09-02T06:20:00Z
**Depth:** deep (cross-file: import graph, RPC contract boundary, SQL key/statement analysis, empirical execution of three suspect paths)
**Files Reviewed:** 28 source files across `packages/engine`, `packages/backend`, `packages/frontend`, plus `scripts/phase7/` and `knip.json`
**Status:** issues_found

## Summary

The eight security invariants the phase names hold. I checked each one against the code rather than against its docblock, and I say so specifically in **What I Verified** below — including the announce fast-path equivalence argument, which I proved rather than accepted.

What does not hold is a different class of thing: **four numeric/derived claims that the code asserts but does not deliver.** Three of them are in the render path and produce a visibly wrong sentence on ordinary, non-hostile input; one is a retention-convergence inequality that was "restated" in this phase and is not a convergence proof. There is also one schema key that is one column too narrow, which lets a target-controlled value silently reattribute another bundle's evidence.

The pattern across all four HIGH findings is the same and worth naming: **a predicate or an inequality was written to be cheap, and its cheapness changed what it means.** `sourceLineTruncated` avoids a grapheme walk by comparing strings — and so answers "was this string changed?" instead of "was this string cut?". The retention inequality avoids a per-map row cap by counting rows — and so compares the wrong two quantities. `SOURCE_ROWS_PER_MAP_MAX` is derived as rows and spent as sources. In each case the docblock states the intended property in capitals and the code states a weaker one.

I executed the three frontend findings against the shipped modules under vitest before filing them; the observed outputs are quoted inline. The probe file was removed and the working tree is clean.

---

## Critical Issues

*(None. No finding in this review lets a target-controlled byte reach a filename, a template, a path sink, or the DOM unsanitised, and none defeats D-24's fail-closed arm.)*

---

## HIGH

### HI-01: `sourceLineTruncated` answers "was this string changed?", not "was this line cut?" — every CRLF source line is marked truncated and the position readout becomes permanently unreachable

**Files:**
- `packages/frontend/src/safety/display.ts:230-233`
- `packages/frontend/src/components/SourceViewer.vue:357-362` (`noLineStructureLine`), `:405-414` (`truncation`), `:676` (per-row marker)
- `packages/frontend/src/components/SourcePositionStrip.vue:321`

**Issue:**

```ts
export function sourceLineTruncated(value: string): boolean {
  const prepared = withTabsExpanded(value);
  return forDisplayText(prepared, SOURCE_LINE_MAX_GRAPHEMES) !== prepared;
}
```

`forDisplayText` does **three** things: strip C0/C1, strip bidi, then grapheme-truncate (`packages/engine/src/sanitise.ts:347-353`). The string inequality is therefore true whenever *any* of the three fired — but the docblock and every caller read it as "the grapheme truncation fired". The docblock's justification ("the engine's grapheme truncation keeps a PREFIX, so the output is the whole prepared line when nothing was cut") is only valid if the two strips are no-ops, which is exactly what target-controlled source cannot be assumed to be.

`C0_C1_CONTROLS` is `/[\u0000-\u001F\u007F-\u009F]/g`, which includes **`\r` (U+000D)**. Lines are produced by `content.split("\n")` (`SourceViewer.vue:255`), so **every line of a CRLF-authored source file ends in a `\r`** and every one of them answers `true`.

**Failure scenario (executed):** a `sourcesContent` entry authored on Windows — a completely ordinary case, not a hostile one — e.g. one line `const a = 1;\r`:

```
CRLF sourceLineTruncated = true
  shown 12 total 13
```

Three consequences, all visible to the operator:

1. **Every visible row renders the `…truncated` marker** (`SourceViewer.vue:676`) on a file where nothing was truncated.
2. **The position strip is dead for the whole file.** `SourcePositionStrip.vue:321` gives truncation absolute precedence: `if (truncation !== null && selectedLine !== null) return "truncated";`. Since `truncation` is non-null for *every* line, `view` never reaches `"mapped"`, and MAP-03's entire position readout — the feature the codec relocation, D-16, D-17 and the codec-prohibition gate all exist to deliver — is unreachable for any CRLF source. The strip's own comment says the position "is one keystroke away — deselect and reselect after copying"; it is not, because the next selection is also "truncated".
3. **A one-line CRLF file gets the false O-02 sentence.** `noLineStructureLine` (`:357-362`) fires on `lines.length === 1 && sourceLineTruncated(only)` and renders *"This file has no line structure — it is one line of 13 bytes. It is minified code that the map declared as a source. The line is truncated at 1,024 characters."* about a 13-byte line of readable code.

`\r` is the cheapest trigger, but any stripped C0/C1 or bidi character does it: a legitimate source containing a raw `U+001B` (ESC) byte in a string literal, or a hostile label-adjacent line containing `U+202E`, produces the same false state.

**Fix:** ask the truncation question of the truncation step only, by comparing against the *sanitised* value rather than the *prepared* one:

```ts
export function forSourceLine(value: string): string {
  return forDisplayText(withTabsExpanded(value), SOURCE_LINE_MAX_GRAPHEMES);
}

export function sourceLineTruncated(value: string): boolean {
  const prepared = withTabsExpanded(value);
  // Strip FIRST, compare AFTER: the two strips are not truncation, and a line
  // that lost a \r is not a line that was cut.
  const stripped = stripForDisplay(prepared); // export the strip from the engine
  return forDisplayText(stripped, SOURCE_LINE_MAX_GRAPHEMES) !== stripped;
}
```

This needs one new export from `packages/engine/src/sanitise.ts` (the two `.replace` calls that `forDisplayText`/`forDisplay`/`forEvidence` already share); `forDisplayText(strip(x), cap) === forDisplayText(x, cap)` is idempotent, so no rendering behaviour changes. Add a spec case with `"const a = 1;\r"` asserting `false`, and one with a lone `U+202E` followed by `x` asserting `false`.

---

### HI-02: `truncation.shown` and `truncation.total` are counted in three different units; the strip can report "truncated at 1,024 of 601 characters"

**File:** `packages/frontend/src/components/SourceViewer.vue:405-414`, rendered by `packages/frontend/src/components/SourcePositionStrip.vue:147-153, 348`

**Issue:**

```ts
return {
  shown: [...forSourceLine(line)].length,
  total: [...line].length,
};
```

Three separate unit mismatches in five lines:

- `shown` is measured **after tab expansion** (`forSourceLine` replaces each `	` with two spaces before truncating). `total` is measured on the **raw** line. So a tab-indented line inflates `shown` relative to `total`.
- `shown` is measured **after** the C0/C1 and bidi strips; `total` is measured **before** them. That is the same conflation as HI-01, arriving at the numbers rather than at the boolean.
- Both are **code-point** counts (`[...s].length`), while the cap they are being compared against — `SOURCE_LINE_MAX_GRAPHEMES` — is enforced by `cappedText` as a **grapheme** count via `Intl.Segmenter` (`packages/engine/src/sanitise.ts:293-306`). An emoji-heavy or combining-mark-heavy line truncated at exactly 1,024 graphemes yields a `shown` well above 1,024, and the sentence claims characters.

**Failure scenario (executed):** a source line of 600 tabs followed by one character — a deeply-indented generated file, or a map that declares one:

```
TAB sourceLineTruncated = true
  shown 1024 total 601
```

The strip renders, verbatim: **"Line 1 truncated at 1,024 of 601 characters."** `shown > total` is arithmetically impossible for the sentence's own claim, and the whole point of `truncationSentence` is that both interpolations are "DefMiner-computed integers" the operator can trust.

Note that `SourcePositionStrip.vue:87-90` explicitly documents these as "Two DefMiner-computed integers for the selected line" — they are computed, but they are not measurements of the same thing.

**Fix:** measure both numbers on the same prepared, sanitised string, in the same unit the cap uses:

```ts
const truncation = computed<{ shown: number; total: number } | null>(() => {
  const state = body.value;
  const index = selectedLine.value;
  if (state.kind !== "content" || index === null) return null;
  const line = state.lines[index];
  if (line === undefined) return null;
  // ONE prepared string, ONE unit. `forDisplay` walks it once and returns
  // { shown, total } already in graphemes — which is what the cap counts.
  const { shown, total } = forSourceLineCounted(line); // new: forDisplay(prepared, CAP)
  return shown === total ? null : { shown, total };
});
```

`display.ts` already argues that the walking wrapper is too expensive **per row**; this call site is per *selected line*, once, and the file's own docblock at `:395-403` says that cost is deliberately paid here. Use `forDisplay` here and keep `forDisplayText` on the row path.

---

### HI-03: `source_sightings`' primary key omits `artifact_sha256`, so a second bundle carrying the same map silently reattributes the first bundle's sightings — and the first bundle then reports a *resolved* zero

**Files:**
- `packages/backend/src/store/migrations.ts:820-832` (v8 DDL)
- `packages/backend/src/store/sources.ts:112-124` (`RECORD_SIGHTING_SQL`)

**Issue:** the table is keyed `PRIMARY KEY (project_id, map_sha256, source_index)` and the upsert's conflict arm rewrites the artifact:

```sql
ON CONFLICT (project_id, map_sha256, source_index) DO UPDATE SET
  artifact_sha256 = excluded.artifact_sha256,
  request_id      = excluded.request_id,
  source_sha256   = excluded.source_sha256,
  sources_verbatim = excluded.sources_verbatim
```

`map_sha256` is content-addressed over the *decoded map JSON* (`ingest/consumer.ts:1086`), not over the bundle. Two different bundles can therefore share a `map_sha256` while having different `artifact_sha256`. When that happens the second ingest does not create a second set of sightings — it **overwrites the first bundle's**, moving `artifact_sha256` and `request_id` to the newer bundle.

The v8 docblock anticipates the sibling case ("Two different bundles carrying the same *source* therefore produce ONE `sources` row and TWO sighting rows") and `reads.ts:1766` anticipates "one artifact can carry MORE THAN ONE map" — but nothing anticipates *one map in more than one artifact*, which the key makes lossy.

**Failure scenario:** target serves `app.js` (artifact A) with an inline map M. DefMiner records 400 sightings keyed `(pid, sha(M), 0..399)` with `artifact_sha256 = A`. Later the target serves any second in-scope script — a decoy stub, a CDN mirror with a different banner comment, or genuinely the same library re-bundled — carrying the byte-identical map M as artifact B. The 400 rows flip to `artifact_sha256 = B`. Now:

- `listRecoveredSourcesPage` is scoped `WHERE sg.artifact_sha256 = ?` (`reads.ts:1783`), so **artifact A's drill-down returns zero rows**.
- `countRecoveredSourcesByArtifact` (`reads.ts:1817-1829`) admits A on the `analyses.scan_state = 'done'` ground and reports **`0`** — the *resolved* zero, which the entire zero-versus-unknown design exists to make mean "DefMiner looked and there was nothing".
- `SourceTree.vue` then renders `EMPTY_HEADING` / `EMPTY_BODY`: *"No recovered sources in this bundle — DefMiner recovers source only from sourcemaps embedded in the bundle it already has."* That is a false statement about a bundle DefMiner did recover 400 sources from.
- `sm.sightingsRecorded` still increments 400 times (`consumer.ts:1177`), so the health counter reports work that produced no net rows.
- D-24's `readSightingOrigin` now returns B's `request_id` and B's digest for a sighting the operator reached from a context describing A. The re-verification still *succeeds* (it verifies against B), so the fail-closed control does not catch it — the attribution is simply the wrong bundle's, silently.

This is target-triggerable at will: the second bundle only has to carry a copy of the same map.

**Fix:** widen the natural key so a sighting is `(project, artifact, map, index)`:

```sql
CREATE TABLE IF NOT EXISTS source_sightings (
  ...
  PRIMARY KEY (project_id, artifact_sha256, map_sha256, source_index)
);
```

and update `RECORD_SIGHTING_SQL`'s conflict target to match (dropping `artifact_sha256` and `request_id` from the `DO UPDATE SET` list, since they become key columns). `SIGHTING_ORIGIN_SQL` and `MARK_PRODUCIBILITY_SQL` must then take `artifact_sha256` too — which means `SourceRef` grows an `artifactSha256` field. **That does not reopen the D-24 tautology**: the caller would be naming which *sighting* it means, not which *digest to compare against*; `artifact_sha256` would still be read back out of the row and compared against `sha256Hex(raw)`. `SourceBrowser.vue:279-290` already has the artifact digest in scope.

If a v9 migration is judged too expensive right now, the minimum acceptable interim is to **stop the upsert from moving the attribution**: drop `artifact_sha256` and `request_id` from the `DO UPDATE SET` arm so first-writer-wins, and add a counter for the discarded second sighting. That still loses B's evidence, but it stops A's from being silently taken away.

---

### HI-04: the restated retention convergence inequality is not a convergence proof — the sweep still cannot keep up with the workload the restatement was written for

**Files:**
- `packages/engine/src/thresholds.ts:112-146` (`RETENTION_SWEEP_MAX_ROWS` derivation), `:148`, `:160`
- `packages/backend/src/ingest/consumer.ts:476-512` (the restatement), `:1363-1377` (the crossing test), `:513-530` (`runRetentionPass` docblock)
- `packages/engine/src/thresholds.spec.ts:236-250`

**Issue:** Pitfall 2's fix changed `processedForSweep` to count **rows** and restated the inequality as `RETENTION_SWEEP_MAX_ROWS >= RETENTION_SWEEP_EVERY_N` — `512 >= 128` — with the claim, in three places, that it "holds INDEPENDENTLY of how many rows any single artifact produces."

It does not establish convergence, because it compares the wrong two quantities. Convergence requires

```
rows deleted per sweep pass  >=  rows inserted per sweep interval
```

The delete side is `RETENTION_SWEEP_MAX_ROWS = 512` (hard-capped; `retention.ts:151, 448` bound one pass at exactly that). The insert side is **not** `RETENTION_SWEEP_EVERY_N`. `RETENTION_SWEEP_EVERY_N` is only the *threshold at which the pass becomes due*; the sweep runs between drain iterations, so the actual rows inserted before a pass fires is the rows inserted by the iteration that **crossed** the threshold — which the same comment block says can be 1,565 for monaco's map, and which `SOURCE_ROWS_PER_MAP_MAX` bounds at 2,048 declared sources → up to **4,096** rows (see MD-01) from a single artifact.

**Failure scenario (arithmetic, from the code's own example):** sustained ingest of map-bearing artifacts, each carrying monaco's 781-source map.

| iteration | rows inserted | `due`? | rows deleted | net |
|---|---|---|---|---|
| 1 | 1,565 | yes (Δ=1,565 ≥ 128) | ≤512 | **+1,053** |
| 2 | 1,565 | yes | ≤512 | **+1,053** |
| … | … | yes | ≤512 | **+1,053** |

The database grows monotonically past the retention ceiling while the sweep runs exactly as designed — which is, verbatim, the failure the comment says the inequality exists to prevent. The break-even point is *rows inserted per iteration* ≤ 512, and the phase's own headline workload is 3× past it. Raising `RETENTION_SWEEP_MAX_ROWS` to 4,096 to fix it would break the 1,024 cost cap that `thresholds.spec.ts:286-292` asserts — so the restatement did not solve the problem, it moved where the problem is invisible.

Two secondary defects fall out of the same edit:

- **`runRetentionPass`'s docblock still asserts the removed inequality.** `consumer.ts:521-523` reads *"RETENTION_SWEEP_MAX_ROWS >= ROWS_INSERTED_PER_ARTIFACT_MAX * RETENTION_SWEEP_EVERY_N **by assertion**"*. `thresholds.spec.ts:253-275` now asserts the exact opposite — that the convergence check *no longer reads* `ROWS_INSERTED_PER_ARTIFACT_MAX`. The one function whose correctness turns on the inequality cites an assertion that was deleted in the same phase.
- **The cadence now fires far more often than designed.** With the interval counting rows, every map-bearing artifact triggers a sweep (Δ ≥ 128 after one artifact). Each pass costs `getRetentionBounds` + three `COUNT(*)` + candidate scans, on the single thread. It also multiplies the D-08 coupling's sampling rate: `if (summary.rowCapDeleted > 0)` now gets evaluated per artifact rather than per 128.

This is distinct from, and compounds, the already-recorded D1 gap (`retention.ts` sweeps neither `sources` nor `source_sightings`): D1 means the unbounded tables are not swept *at all*, and this finding means that even once D1 is closed the sweep will not converge.

**Fix:** state the real inequality and make the pass satisfy it. Either

```ts
// the honest bound: a pass must delete at least what one artifact can insert
RETENTION_SWEEP_MAX_ROWS >= 2 * SOURCE_ROWS_PER_MAP_MAX + ROWS_INSERTED_PER_ARTIFACT_MAX
```

(which needs the 1,024 cost cap re-derived, or a per-map row cap D-09 rejected), **or** keep the 512 cap and let the pass repeat within one cadence while yielding:

```ts
// bounded per SLICE, not per cadence: loop while there is a backlog and the
// interval says work is due, yielding between passes so ingest is not starved.
while (due() && (await runRetentionPass(projectId)).moreWork) {
  await yieldToLoop();
}
```

`sweepRetention` already returns `moreWork` (`retention.ts:133`) and the drain loop already has `yieldToLoop`. Whichever is chosen, `thresholds.spec.ts:236-250` must assert the inequality that is actually load-bearing, and `consumer.ts:521-523` must stop citing the deleted one.

---

## MEDIUM

### MD-01: `SOURCE_ROWS_PER_MAP_MAX` is derived and documented as a ROW bound but enforced as a declared-SOURCES bound — the real ceiling is 2× the stated one

**Files:** `packages/engine/src/thresholds.ts:355-386`; `packages/engine/src/sourcemap/parse.ts:328-334`

**Issue:** the derivation is explicit that the unit is rows:

> *"MAP-06's aggregate limit, expressed as a ROW bound. A ROW BOUND AND NOT A SOURCE-COUNT BOUND, deliberately… a map at MAP_MAX_BYTES carries roughly 471 sources and 942 rows. 2,048 is the next power of two above that, giving ~2.2x headroom."*

The gate compares against the **declared source count**:

```ts
acc.declared += sources.length;
if (acc.declared > limits.maxSourceRows) return "too_many_sources";
```

Under D-05 each recovered source writes **two** rows — one `sources` (per new content hash) and one `source_sightings` (per `(map, index)`). So a map declaring 2,048 distinct sources writes up to 4,096 rows, not 2,048. The "~2.2x headroom" over the projected 942 rows is really ~4.3x, and the number feeding HI-04's insert side is 4,096 rather than 2,048.

**Failure scenario:** a legal map with 2,048 distinct one-line sources — well under `MAP_MAX_BYTES` — passes `parseSourceMap` and inserts 4,096 rows in one consumer iteration, against a `DEFAULT_RETENTION_MAX_ROWS` of 50,000 and a 512-row sweep cap.

**Fix:** either halve the constant to make the enforced unit match the derivation, or (better) enforce it in the unit it is derived in:

```ts
// rows, not sources: one `sources` row and one sighting row per recovered index
if (acc.declared * 2 > limits.maxSourceRows) return "too_many_sources";
```

and add a `thresholds.spec.ts` assertion tying `SOURCE_ROWS_PER_MAP_MAX` to the `2 *` factor by name, so the unit cannot drift again silently. Whichever is chosen, the docblock's "471 sources and 942 rows" arithmetic should be the thing the gate executes.

### MD-02: the display tree merges directories on the **truncated** label, collapsing two genuinely distinct directories into one node

**File:** `packages/frontend/src/sourcemap/tree.ts:493-511` (directory merge) with `:373-376` (`displaySegment`)

**Issue:** `tree.ts`'s own header spends a paragraph refusing weaker-than-byte-identical merges:

> *"directory nodes merge on a BYTE-IDENTICAL label and nothing weaker… Collapsing either pair merges TWO GENUINELY DISTINCT SOURCE FILES into one node and loses the fact that the target shipped both."*

But the label compared at `:498-500` is the **post-`forCellText`** label — sanitised *and truncated at 256 graphemes* — not the verbatim segment. Two directory segments that differ only past character 256 become one node.

**Failure scenario (executed):** a map declaring

```
"A"×300 + "bank/secret.js"
"A"×300 + "evil/x.js"
```

produces **one** root directory (label length 256) with two children:

```
roots: 1
[{ "kind": "directory", "labelLen": 256,
   "kids": [ {"kind":"source","label":"secret.js…len9"},
             {"kind":"source","label":"x.js…len4"} ] }]
```

The tree tells the operator that `secret.js` and `x.js` are siblings in one directory. They are not; they are in two directories whose names differ. The `label truncated` note is rendered, but it says the *label* was cut, not that two directories were merged — and the `duplicate` marker does not fire, because the two leaves have different labels.

Mitigating: `sourcesVerbatim` is untouched at rest, and the viewer header shows the verbatim entry for whichever leaf is opened, so the evidence is recoverable. This is a display-integrity defect, not data loss.

**Fix:** key the merge on the verbatim segment and carry the display label separately:

```ts
type Building = { key: string; label: string; mergeKey: string; /* … */ };
// …
let directory = siblings.find(
  (candidate) =>
    candidate.kind === "directory" && candidate.mergeKey === rawSegment,
);
```

`resolved.segments` already holds the raw segments beside `display`, so `mergeKey` costs one extra field and no extra walk. Add a `tree.spec.ts` case over two 300-character sibling directories asserting two roots.

### MD-03: D-13's depth gate fires once per recovered source — N log lines through the SDK and N counter increments per map-bearing artifact

**File:** `packages/backend/src/ingest/consumer.ts:1013-1026` reached from `:1199-1216`

**Issue:** `reconstruct` is re-entered at `depth + 1` for **every** recovered source, and the depth gate refuses **every** one of them, incrementing a counter and emitting an SDK log line each time:

```ts
const depthGate = admitDerivedDepth(input.depth);
if (!depthGate.ok) {
  sm.derivedRejected[depthGate.reason]++;
  log("reconstruction refused at depth " + String(input.depth) + ": " + …);
  return done(null);
}
```

`DERIVED_MAX_DEPTH` is 1 and the gate refuses at `depth >= 1`, so this is not an anomaly — it is the guaranteed outcome for every source, always.

**Failure scenario:** one artifact carrying monaco's 781-source map emits **781 identical `sdk.console.log` lines** on the proxy thread in a single consumer iteration, and drives `counters.sourcemap.derivedRejected.depth_exceeded` to exactly `sourcesRecovered`. A counter that is by construction equal to another counter carries no information, and a health surface reading "781 sources rejected: depth_exceeded" describes a bound working as designed as if it were a refusal.

**Fix:** the depth gate belongs at the **call site** — where the decision to recurse is made — not inside the callee's preamble where it must be re-taken per source:

```ts
// ONCE per stage, before the per-source loop. The bound is a property of THIS
// stage's depth, and it does not change between sources.
const nextDepth = admitDerivedDepth(input.depth + 1);
// …
if (nextDepth.ok) {
  const derived = await reconstruct(projectId, { …, depth: input.depth + 1 }, stillCurrent);
  rowsInserted += derived.rowsInserted;
} // else: counted and logged once, above the loop
```

Keep the gate inside `reconstruct` as well (it is the real bound), but stop it being the path every source takes: log and count at the call site, once per stage.

### MD-04: `countSourcesForMap` has no production caller, and its docblock asserts one that does not exist

**File:** `packages/backend/src/store/sources.ts:353-378`

**Issue:** the docblock states MAP-06's enforcement as fact:

> *"THE BOUND IS ENFORCED BY THE CALLER, AND THE REFUSAL IS NAMED. This function only counts; **plan 07-05's ingest path compares the count and refuses with a reason** rather than stopping quietly, because a map that silently wrote 2,048 of its 2,049 sources and said nothing is indistinguishable from a map that had 2,048."*

`grep -rn "countSourcesForMap" packages/` returns exactly two hits: the declaration, and `sources.spec.ts`. The ingest path does not call it. The bound is enforced only in `parseSourceMap` on the **declared** count of a single parse (see MD-01) — which means the *aggregate* half of MAP-06, across repeated ingests of the same map, is not enforced anywhere.

`knip` does not catch this because `src/**/*.spec.ts` is an entry glob, so a spec-only consumer counts as usage.

**Failure scenario:** the situation the docblock describes as prevented is not prevented. Because the sighting upsert is idempotent on `(project, map, index)`, re-ingesting the same map does not multiply rows — so the practical exposure today is low. But the claim in the comment is false, and the deferred entity pass will read it as a discharged requirement.

**Fix:** either wire it (compare `countSourcesForMap(...)` against `SOURCE_ROWS_PER_MAP_MAX` before the per-source loop in `consumer.ts:1093` and refuse with a named reason), or delete the function and rewrite the paragraph to state where the bound actually lives. A docblock that describes a caller which does not exist is worse than no docblock, because it is the thing a verifier will cite.

---

## LOW

### LO-01: `decodeInlineMap` materialises the whole payload string before the size gate, contradicting its own docblock

**Files:** `packages/engine/src/sourcemap/parse.ts:180-193`; `packages/engine/src/sourcemap/announce.ts:163-170`

**Issue:** the docblock says *"THE ENCODED-LENGTH GATE FIRES FIRST, BEFORE ANYTHING IS ALLOCATED… the refusal costs a comparison rather than a multi-megabyte allocation on the proxy thread (T-07-02)."* The claim is true of the **decoded buffer** and false of the string:

```ts
payload = url.slice(prefix.length);   // <- full copy, up to ~8 MiB
// …
if (payload.length > encodedCeiling(maxBytes)) return refused("too_large");
```

`findAnnouncement` has already materialised the URL: `body.slice(urlStart)` runs to end-of-line, and a body with no `\n` after the marker slices to EOF (`announce.ts:165-167`). So an 8 MiB single-line body with an oversized inline map costs two full-length string copies on the QuickJS thread before the "cheap comparison" refuses it.

**Fix:** gate on the offset before slicing, in both places.

```ts
// parse.ts — the length is knowable without a copy
for (const prefix of B64_PREFIXES) {
  if (head.startsWith(prefix)) {
    if (url.length - prefix.length > encodedCeiling(maxBytes)) {
      return refused("too_large");
    }
    payload = url.slice(prefix.length);
    break;
  }
}
```

and in `announce.ts`, bound the URL slice at `ANNOUNCEMENT_PREFIX_MAX + encodedCeiling(MAP_MAX_BYTES)` rather than at EOF. Alternatively, correct the docblock to say "before the decoded buffer is allocated", which is what it actually delivers.

### LO-02: `announce.ts` treats only `\n` as a line terminator, so a `data:` URL absorbs the rest of a `\r`- or `U+2028`-delimited file

**File:** `packages/engine/src/sourcemap/announce.ts:163-170`

**Issue:** `const newline = body.indexOf("\n", urlStart)`. Bodies delimited by lone `\r` (classic Mac) or by `U+2028`/`U+2029` (which JavaScript treats as line terminators) yield a URL that runs past the announcement into subsequent code. `String.trim()` removes `U+2028`/`U+2029` only at the ends.

**Failure scenario:** a body ending `//# sourceMappingURL=data:application/json;base64,AAAA` followed by a `U+2028` and then `console.log(1)` produces a `url` that contains the `U+2028` and everything after it. `isCanonicalBase64` rejects it, so the outcome is `malformed_base64` — a named refusal — rather than a silent miss. Correctness impact is therefore contained, but it is what makes LO-01's slice unbounded.

**Fix:** scan for the first of `\n`, `\r`, `U+2028`, `U+2029` with a bounded `indexOf` per character (four `indexOf` calls, no pattern — consistent with this file's ReDoS rule).

### LO-03: `sources_verbatim` is truncated by UTF-16 code unit and can store a lone surrogate

**File:** `packages/backend/src/store/sources.ts:306-313`

**Issue:** `sourcesVerbatim.slice(0, SOURCES_LABEL_MAX)` cuts at code unit 4,096. If code unit 4,095 is a high surrogate, the stored value ends in an unpaired surrogate — an invalid UTF-8 sequence in a SQLite `TEXT` column, which round-trips through the driver and the RPC boundary unpredictably. Separately, the docblock argues the bound "exactly as `observations.url` is bounded at `URL_MAX`" and reasons about 4,096 relative to the 1,024-grapheme display caps — but 4,096 code units is up to ~16 KB of stored bytes for a label of astral characters, so the "at rest" bound is not the bound the argument computes.

**Fix:** cut on a code-point boundary and state the unit:

```ts
sourcesVerbatim === null
  ? null
  // Code POINTS, so the stored prefix is never half a surrogate pair. The
  // cap is a byte-budget argument; spell the unit it is enforced in.
  : [...sourcesVerbatim].slice(0, SOURCES_LABEL_MAX).join("")
```

Add a `sources.spec.ts` case whose 4,096th code unit is a high surrogate.

### LO-04: `redactUrlForExport` cuts `sources_verbatim` at the first `#`, which is a legal character in a path label

**File:** `packages/backend/src/store/export.ts:196-201`, applied at `:301`

**Issue:** the redactor was written for URLs, where `?`/`#` begin the query and fragment. A `sources` entry is not a URL in general — the argument at `:290-300` says it is "URL-SHAPED BY CONSTRUCTION", which holds for `webpack://…` prefixes and not for the path body. `src/components/Button#new.tsx` exports as `src/components/Button<query-redacted>` in redacted mode, silently discarding a legal filename tail and telling the reader a query was withheld when there was none.

**Fix:** if the intent is genuinely "withhold the query of a URL-shaped label", apply the cut only when `sourcePathShape(value) === "protocol"`; otherwise leave the label whole (it has no query axis) or introduce a manifest-specific redactor. Either way, do not report `<query-redacted>` for a value that had no query.

### LO-05: `snapshotCounters` deep-copies arrays into plain objects

**File:** `packages/backend/src/telemetry.ts` (`snapshotCounters`)

**Issue:**

```ts
const copy = (value: unknown): unknown => {
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = copy(v);
  return out;
};
```

`Object.entries` of an array yields index keys, so an array-valued counter is silently converted to `{ "0": …, "1": … }` and the cast `as Counters` hides it. No current member of `Counters` is an array, so nothing is broken today — but the function is generic, and the failure would be a health payload whose field is the wrong JSON type with no error anywhere.

**Fix:** handle the array case explicitly, or replace the hand-rolled walk with `structuredClone(counters)` (available on this runtime for plain data).

---

## What I Verified (and therefore am not reporting)

Stated positively, because "no finding" is only useful if it says what was checked.

**1. D-07 — nothing at rest.** Read the v8 DDL directly (`migrations.ts:820-836`). `sources` is five columns (`project_id`, `source_sha256`, `byte_len`, `line_count`, `first_seen_at`); `source_sightings` is ten, none of which is content in any encoding. Every column declares `TEXT` or `INTEGER` — no BLOB, no untyped column. `toRecoveredSourceRow` (`index.ts:~590`) maps field by field rather than spreading, so a future column cannot leak across the RPC by accident. `RecoveredSourceRow` on the contract carries no content field. **Holds.**

**2. R6 — target strings never become filenames.** `source-filename.ts` is a matcher, not a sanitiser: the output is `sha256.slice(0,16)` plus one of ten DefMiner literals, and `SHA256_PATTERN = /^[0-9a-f]{64}$/` returns `null` (no save affordance) for any digest it cannot vouch for. The label's only influence is `folded.endsWith(extension)` — the *allowlist's* literal is returned, never a slice of the label. `DOWNLOAD_CONTENT_TYPE` is a hard-coded `text/plain;charset=utf-8`, never derived from the extension. `exportFilename` interpolates only `ExportTable` members, a mode, a format and a timestamp. **Holds.**

**3. `node:path` prohibited on the tree-normalisation path.** `grep` over `packages/*/src` for `node:path` / `from "path"` / `require("path")` returns only prose in `map-fixture.ts` and `tree.ts`'s own header. `tree.ts`'s entire import list is one line: `import { forCellText } from "../safety/display";`. `forCell` appears nowhere in the module except in comments. **Holds.**

**4. D-24 fail-closed.** `reloadVerifiedBundle` (`index.ts:346-472`) reads the origin from the database via `readSightingOrigin` — the caller supplies only `(mapSha256, sourceIndex)`, and `projectId` is overridden by `currentProjectId()` before any `await`, so the caller cannot supply both halves of the equality. The digest is taken over `toRaw()` bytes, and on mismatch the function returns the `changed` arm, which has **no `content` key in the type at all** (`contract.ts` `SourceDerivationFailure`). Nothing downstream can re-derive from the new body because `reload.ok === false` short-circuits before `announcedMap` is reached. `announcedMap` then re-checks the map's own digest against the recorded `mapSha256`, so serving a different map from a verified bundle is also closed. **Holds.**

**5. A failed call is never a tombstone.** `DERIVATION_UNAVAILABLE` is returned from six distinct sites and none of them calls `markProducibility`. `tombstone()` is reachable only from the three arms that carry positive evidence (`no_request`, `no_response`, digest mismatch). On the frontend, `derive()` maps `!result.ok` to `{ kind: "unavailable" }`, and `fromResult` is a total switch over the four arms with no default. `SourcePositionStrip` maps its own `!result.ok` to `unreadable` and never renders a producibility word. **Holds.**

**6. `mappings` never enters the DOM.** `readSourceMappings` returns the string as data; `SourcePositionStrip` passes it straight to `decode()` inside a `try`, and only `generatedLine` / `generatedColumn` / `count` integers survive into `positions`. Every rendered string on the strip is a copy constant or `positionSentence`/`truncationSentence`, whose interpolations are integers through `groupThousands`. The `catch` sets `{ kind: "unreadable" }` and discards the thrown value; the viewer body above is a sibling subtree and is untouched. `@jridgewell/sourcemap-codec` is imported by exactly one module. **Holds.**

**7. Sanitisation.** `SourceTree.vue` renders `node.label` (already through `forCellText`, one segment at a time). `SourceViewer.vue` renders `forCellText(label ?? "")` in the header and `forSourceLine(item.text)` per row. `grep` for `title=` / `:title` / `v-html` / `innerHTML` across all Phase 7 components returns nothing; the only `data-*` attributes are DefMiner-authored test hooks with no interpolated value. `forCell` is not imported anywhere on this path. **Holds** — noting that HI-01/HI-02 are defects in the *predicates about* the sanitiser's output, not in the sanitiser's coverage.

**8. `sources_verbatim` render-time safety and the CSV sink.** The one at-rest target-controlled column reaches: the tree (segment-wise `forCellText`), the viewer header (`forCellText`), the download-name matcher (ten literals), and the CSV/JSON export. On the export path `projectRow` applies `redactUrlForExport` then `stripForExport` (C0/C1 + bidi), and `csvField` in `@defminer/engine/csv` applies formula neutralisation over `DANGEROUS_LEADS = ["=", "+", "-", "@", TAB, CR]` **after** the control strip — so a `=HYPERLINK(...)` label is apostrophe-prefixed and a `\t=cmd|…` lead cannot hide behind the strip. **Holds.**

**9. The announce fast path is equivalent to the two-full-scan reference.** I proved it rather than trusting the spec. Let `M = max(body.lastIndexOf(m))` over both markers.
- Every marker occurrence at `m` implies `COMMON` at `m + 4`; since `common` is the *last* `COMMON`, `m + 4 <= common`, hence **`M <= candidate`** for `candidate = common - 4`.
- `common < 0` ⟹ no marker ⟹ both return null. ✓
- `candidate < windowStart` ⟹ `M <= candidate < windowStart` ⟹ both return null. ✓
- `markerAt(candidate)` ⟹ `M >= candidate` and `M <= candidate` ⟹ `M = candidate`, and it is in window. ✓
- otherwise the fallback *is* the reference, with `at = -1 < windowStart` handled (`windowStart >= 0` always). ✓

Boundary cases: empty body → `null` before anything; marker at offset 0 → `candidate = 0`, `windowStart = 0`, `0 < 0` is false, `markerAt(0)` true. ✓ `COMMON` has no self-overlap, so overlapping occurrences cannot arise. `windowBytes` is compared against `body.length` in UTF-16 code units while the constant is named in bytes — but `text.length <= byteLength` for every UTF-8 decode, so the window is conservatively *wider* in bytes, never narrower. **Holds.**

**10. The base64 primitive is deliberate and validation precedes decoding.** `decodeBase64` uses `Buffer.from(payload, "base64")` and `decode.ts` records the measurement that `atob` returns a Latin-1 binary string and diverged at all four ladder points. `isCanonicalBase64` runs **before** `decodeBase64` and checks alphabet, `length % 4 === 0` and `pad <= 2` — closing the "lenient decoder silently returns a shorter buffer" hole the docblock names. The post-decode gate is `Buffer.byteLength(json, "utf8") > maxBytes`, in bytes rather than code units. I also checked the `toLowerCase()` prefix compare at `parse.ts:180-188` for a length-expansion misalignment (U+0130 → `i̇`): the expansion inserts U+0307, which cannot appear in either ASCII prefix, so no offset shift is reachable. **Holds.**

**11. `scripts/phase7/`.** `fetch-maps.sh` runs `set -euo pipefail`, pins every fetch to an immutable versioned jsDelivr path, verifies a committed SHA-256 and `rm -f`s + exits non-zero on mismatch. `map-bytes.sh` disables `errexit` deliberately (documented: a probe that kills its host is a result) and restores it after sourcing. `assemble.py` calls `subprocess.run` with an argument **list** and no `shell=True`. No `eval`, no `pickle`, no unquoted expansion into a command. **No findings.**

---

_Reviewed: 2026-09-02T06:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
