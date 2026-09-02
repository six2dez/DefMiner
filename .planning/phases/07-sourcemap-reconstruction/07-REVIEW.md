---
phase: 07-sourcemap-reconstruction
reviewed: 2026-09-02T21:05:00Z
depth: standard
round: 3
files_reviewed: 15
files_reviewed_list:
  - packages/backend/src/ingest/consumer.spec.ts
  - packages/backend/src/ingest/consumer.ts
  - packages/backend/src/sources-sink-prohibition.spec.ts
  - packages/backend/src/store/export.spec.ts
  - packages/backend/src/store/export.ts
  - packages/backend/src/store/retention.spec.ts
  - packages/backend/src/store/retention.ts
  - packages/engine/src/sourcemap/map-fixture.ts
  - packages/engine/src/thresholds.spec.ts
  - packages/engine/src/thresholds.ts
  - packages/frontend/src/components/source-filename.spec.ts
  - packages/frontend/src/components/source-filename.ts
  - packages/frontend/src/safety/hostile.spec.ts
  - packages/frontend/src/sourcemap/tree.spec.ts
  - tests/corpus-maps.spec.ts
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues
---

# Phase 7: Code Review Report (round 3 — gap-closure round 2)

**Reviewed:** 2026-09-02T21:05:00Z
**Depth:** standard (per-file read of `git diff 11ab9e2..HEAD` for all fifteen files, plus targeted cross-file tracing of the `admitDerived` reachability chain, the `deleteDigest` cascade against the pass-budget guards, the two shape classifiers, and every numeral written in prose this round against the constant it claims to describe)
**Files Reviewed:** 15
**Status:** issues_found (0 Critical, 4 Warning, 4 Info)

## Summary

**All four gaps are genuinely closed, and every load-bearing claim in
`<specific_claims_to_verify>` survives except one — claim 4's audit *method*,
which is blind to two of the expectation changes the plan actually made (IN-03;
the substantive "nothing was loosened" property does hold, verified
independently).**

I re-derived every figure this round wrote. `RETENTION_SWEEP_MAX_PASSES` is
still 16; `128 + 2051 = 2179`, `512 x 16 = 8192`, `8192/2179 = 3.759…` → 3.76x,
`2179/512 = 4.2558…` → 4.26, smallest satisfying integer 5, next power of two 8,
and `2179 > 2 x 1024` so the rejected-repair argument still holds at the smaller
number. Every one of those strings is present verbatim in the region
`passesDocblock()` slices, `4,227`/`8.26` are gone from it, and
`ROWS_INSERTED_PER_ITERATION_MAX`'s commit-ordering paragraph is byte-unchanged
and still carries both `4,227` and `2,179`. `EXPORT_QUERY_REDACTION` is
`<query-redacted>` — sixteen characters — so the corrected `4,112` and the
worked `39 = 23 + 16` are right, and I swept the whole repo for other
restatements of the marker length: there are none, so 07-22's deferred sweep is
in fact complete.

Prohibitions held. No `FOREIGN KEY`, `ON DELETE CASCADE` or `PRAGMA
foreign_keys` appears on any line of the diff outside `.planning/` prose; the
migration ladder still ends at `v: 9`; `retention.ts` has zero `.exec(` call
sites; `MAP_MAX_BYTES` and `RETENTION_SWEEP_MAX_PASSES` are untouched. Baseline
reproduced: the seven changed spec files are 649 tests green, and `pnpm
typecheck`, `pnpm lint` and `pnpm knip` all exit 0.

**What I did find is one new false sentence and three prose-versus-code
disagreements the round wrote past.** That is the fifth-gap outcome the round
was explicitly trying to avoid, so I am reporting them at Warning rather than
softening them:

- **WR-01 is the round's own.** Plan 07-19 replaced one inaccurate comment with a
  comment that asserts something structurally impossible — that `admitDerived`
  can refuse a recovered source as `too_large` — while *the spec it committed in
  the same plan* states the opposite, correctly. This confirms recorded finding
  **F-1** and upgrades it: it is no longer merely an unreachable branch, it is an
  unreachable branch the round documented as reachable, twice.
- **WR-02 and WR-03** are `export.ts` sentences 07-22 left standing beside code
  it changed: one that still says the label column uses "the SAME redactor" when
  the non-protocol branch no longer delegates, and one that states the
  never-claim-a-false-redaction principle unqualified while the shipped URL
  branch prints `<query-redacted>` over a fragment-only URL — an output the file's
  own spec pins as expected.
- **WR-04** is a mechanism defect in the new gate itself: the non-vacuity
  companion pins a *fixed historical* figure to a *recomputed* expression, so a
  future constant change will demand that the history paragraph be rewritten to
  say something that was never true.

No finding lets a target-controlled byte reach a filename, a path sink, a
command, a template or the DOM. Nothing widens the export's disclosure beyond
what the operator sanctioned. Nothing risks data loss or breaks convergence.
**There is no Critical finding.**

*(No `<structural_findings>` block was supplied for this review, so there is no
fallow-substrate section.)*

---

## Critical Issues

*(None.)*

---

## Warnings

### WR-01: 07-19 replaced a false comment with a false comment — `derivedRejected.too_large` is structurally unreachable, and `consumer.ts` now says twice that it is not, contradicting the spec the same plan committed

**Classification:** WARNING
**Files:**
- `packages/backend/src/ingest/consumer.ts:1266-1269` and `:1445-1448` (both blocks added by this round)
- against `packages/backend/src/ingest/consumer.spec.ts:2690-2695` (also added by this round)
- and `packages/backend/src/sourcemap/derive.ts:142`, `:233`; `packages/engine/src/sourcemap/parse.ts:227`

**Issue.** This is recorded finding **F-1**, and I confirm it. The two sides, quoted:

`consumer.ts:1266-1269` —

```
// ADMISSION: a map can recover sources that `admitDerived` refuses as
// `empty` or `too_large` before they could recurse, and a stage that
```

`consumer.ts:1445-1448` —

```
// `sourcesContent` entry is the empty string — or whose every source is over
// `DERIVED_SOURCE_MAX_BYTES`, both reachable from one hostile map — recovers
```

`consumer.spec.ts:2690-2695`, written by the same plan, in the same commit range —

```
// WHY THE INADMISSIBLE HALF IS EMPTY AND NOT OVER-SIZE. `DERIVED_SOURCE_MAX_BYTES`
// IS `MAP_MAX_BYTES` (`sourcemap/derive.ts:142`), and a source's bytes are a
// strict subset of the JSON document that carried them — which `parseSourceMap`
// has already refused above that same ceiling. `too_large` is therefore
// unreachable through the ingest path, and `empty` is the only refusal a map
// can actually mix in.
```

The spec is right and the production comments are wrong. Traced end to end:
`consumer.ts:1124` calls `decodeInlineMap(announcement.url, MAP_MAX_BYTES)`,
whose gate at `parse.ts:227` is `Buffer.byteLength(json, "utf8") > maxBytes`, so
the decoded map document is at most `MAP_MAX_BYTES` bytes. `consumer.ts:1277`
computes `Buffer.from(source.content, "utf8").length` from a `sourcesContent`
entry of *that* document. JSON string encoding never shrinks a character below
its UTF-8 width — a raw multi-byte character costs the same bytes in the
document as decoded, and every escape (`\n` at 2 bytes, `\uXXXX` at 6, a
surrogate pair at 12) costs strictly more — so a decoded entry is a proper
subset of the document's bytes, plus the two quote bytes and the surrounding
structure. `derive.ts:142` sets `DERIVED_SOURCE_MAX_BYTES = MAP_MAX_BYTES`, and
`derive.ts:233` refuses on `>`. `byteLen > MAP_MAX_BYTES` therefore cannot hold
for any source that reached this gate. `derive.ts`'s own header already says as
much — *"the derived path refuses exactly what the map path already refused, and
nothing further"* — so the fact was available in the file the comment names.

**Why it matters here specifically.** The round exists to close four instances of
"a sentence disagreeing with the code beside it". This is a fifth, introduced by
the plan that closed the fourth, and it is worse than the one it replaced: the
old comment over-stated a count, this one asserts a refusal path that no traffic
can reach. It is also load-bearing prose — it is the *justification* offered for
guarding on `admittedForRecursion`, and a reader who checks it discovers the
justification is half fictional. (The fix itself is correct and the justification
survives on the `empty` half alone.)

**Fix.** Delete the `too_large` half of both claims and say what the spec says.

```ts
// consumer.ts:1266-1269
// ADMISSION: a map can recover sources that `admitDerived` refuses as
// `empty` before they could recurse, and a stage that admitted none of
// them declined nothing at any depth. (`too_large` cannot fire here:
// `DERIVED_SOURCE_MAX_BYTES === MAP_MAX_BYTES` and a source's bytes are a
// strict subset of the map document `parseSourceMap` already bounded —
// see `consumer.spec.ts`'s mixed-map case.)

// consumer.ts:1445-1448
// A map whose every `sourcesContent` entry is the empty string recovers
// sources and admits none of them, attempts no recursion at any depth,
// and therefore declines nothing.
```

Worth deciding separately, and out of this round's scope: `DERIVED_REJECT_REASONS`
ships a `too_large` member that can only ever read zero, which is the same
"counter that carries no information" objection MD-03 made. Either remove it or
document it as a deliberately-retained backstop the way `consumer.ts:1075-1084`
documents the depth gate.

---

### WR-02: `export.ts:424-425` still says the manifest label column uses "the SAME redactor" — after 07-22 the non-protocol branch does not delegate to it at all

**Classification:** WARNING
**Files:** `packages/backend/src/store/export.ts:424-427`, against `:309-318`

**Issue.** The column table's comment, unchanged by this round:

```
// Hence {@link redactSourceLabelForExport}: the SAME redactor, the SAME
// marker, applied where its subject exists. Not an exemption — a narrowed
// application, which is a different thing and is argued in full at that
// function.
```

The function it points at, rewritten by this round, says the opposite in its own
body comment:

```ts
export function redactSourceLabelForExport(label: string): string {
  if (isProtocolShapedLabel(label)) return redactUrlForExport(label);
  // NOT a URL, so only the query axis applies: `#` here is a filename
  // character, and `redactUrlForExport` would cut on it. Hence the first `?`
  // by hand rather than delegating — the SAME marker, a narrower cut.
```

"the SAME redactor" was true under 07-16, where every branch either delegated to
`redactUrlForExport` or returned the label whole. It is false under 07-22: the
non-protocol branch is a second, hand-rolled cut with different semantics (`?`
only, not `?`-or-`#`). The marker is still shared; the redactor is not.

This matters because `export.ts:424` is the comment a reviewer auditing the
export's redaction policy reads *first* — it is attached to the column
declaration, above the function it summarises — and it now tells them there is
one cut rule when there are two. It is the same class of defect as G-07-3, in the
same file, in a paragraph 07-22 edited around.

**Fix.**

```ts
// Hence {@link redactSourceLabelForExport}: the SAME marker, applied per
// AXIS rather than per column. A URL-shaped label delegates to
// `redactUrlForExport` unchanged; any other label is cut at its first `?`
// only, because `#` is a legal filename character. Not an exemption — a
// per-axis application, argued in full at that function.
```

---

### WR-03: the file states, unqualified, that a marker claiming a redaction that did not happen destroys the operator's trust — and the shipped URL branch prints exactly such a marker, which `export.spec.ts` pins as the expected output

**Classification:** WARNING
**Files:**
- `packages/backend/src/store/export.ts:297-299` (kept and re-emphasised by this round), `:261-268` (added by this round)
- `packages/backend/src/store/export.ts:199-202` (`redactUrlForExport`, untouched)
- pinned at `packages/backend/src/store/export.spec.ts:886-889`

**Issue.** The docblock 07-22 rewrote makes the principle unconditional:

```
 * A redaction that reports withholding something that was never there is not a
 * stronger redaction. It is an unreliable one, and an operator who finds one
 * marker they can prove is false has no reason to trust the next.
```

and the round's new fragment-axis paragraph explains the `#` decision entirely in
those terms — *"it printed a marker telling the reader a query had been withheld
when there had never been one … two wrong claims in one field"*.

But `redactUrlForExport` cuts on `url.search(/[?#]/)` and appends the *query*
marker for either hit. So a URL-shaped label carrying only a fragment produces a
marker that is false by the file's own definition, and the round's own byte-budget
`extra` list at `export.spec.ts:1089` feeds exactly that shape through it, while
`export.spec.ts:886-889` asserts the result:

```ts
[
  "webpack:// with a real fragment",
  "webpack:///./src/app.js#L5",
  `webpack:///./src/app.js${EXPORT_QUERY_REDACTION}`,
],
```

`webpack:///./src/app.js#L5` has no query axis. The exported field claims one was
withheld. Two entries below in the same `it.each`, a comment states the intended
contract in so many words: *"The marker is a statement about this value, not
about this column."* It is not, for this value.

The round chose to keep and expand the argument (the "THE FRAGMENT AXIS,
UNMOVED" block) without reconciling it with the branch that violates it. Impact
is operator trust and reviewability, not disclosure — nothing leaks, the raw mode
is unaffected, and `observations.url` is untouched.

**Fix.** Either scope the principle to the branch that honours it, or make the
marker true on both branches. The cheap, honest option is to scope it:

```
 * A redaction that reports withholding something that was never there is not a
 * stronger redaction. THIS FUNCTION honours that on the non-URL branch, which is
 * what LO-04 bought. `redactUrlForExport` does NOT, and deliberately: it appends
 * the query marker for a fragment cut too, so `…/app.js#L5` exports as
 * `…/app.js<query-redacted>`. That is a known imprecision on URL-shaped values,
 * retained because it is `observations.url`'s shipped behaviour and splitting the
 * marker in two is a vocabulary change this column may not make alone.
```

The stronger option — a second marker, `<fragment-redacted>` — is a policy change
touching `observations.url` and is out of this round's scope; it should be a
decision, not a drive-by.

---

### WR-04: the new gate's non-vacuity companion pins a FIXED historical figure to a RECOMPUTED expression, so a future constant change will demand the history paragraph state something that was never historical

**Classification:** WARNING
**File:** `packages/engine/src/thresholds.spec.ts:868-874` and `:952-971`

**Issue.** The absence half's companion is what makes gate 5 non-vacuous, and it
is built on a value that is *derived from today's constants*:

```ts
const supersededInsertSide =
  T.RETENTION_SWEEP_EVERY_N +
  T.ROWS_INSERTED_PER_ARTIFACT_MAX +
  2 * T.SOURCE_ROWS_PER_MAP_MAX;
```

with the comment justifying it as *"recomputed rather than quoted — … Written as a
literal it would stop tracking the constants the day one of them moves."*

That reasoning is right for the *shipped* figures and wrong for this one. `4,227`
is not a property of the current constants; it is a historical fact about what
the insert side read before commit `59347c3`. `ROWS_INSERTED_PER_ITERATION_MAX`'s
paragraph records it as such — *"The gate landed first (4,227 on the insert side,
over-stated and therefore safe) and the factor was retired second (2,179,
exact)"*. If `SOURCE_ROWS_PER_MAP_MAX` is ever re-measured to, say, 3,072, the
companion at `:952` will fail and instruct the developer:

```
`ROWS_INSERTED_PER_ITERATION_MAX's docblock in ${THRESHOLDS_MODULE} no longer `
  + `names ${grouped(supersededInsertSide)}. … Restore the paragraph rather than
     relaxing the scope.`
```

— i.e. it will demand that `6,275` be written into a paragraph describing what
happened on 2026-09-02, when the figure that day was `4,227`. The absence half at
`:939` will simultaneously start asserting the absence of a string that was never
in the docblock, which is precisely the "asserting the absence of an arbitrary
string" failure its own comment says it exists to avoid. The gate built to stop
prose drift would then be the thing forcing it.

**Fix.** The superseded figures are history and should be literals with their
provenance stated; the *shipped* figures stay derived.

```ts
// HISTORY IS A LITERAL, BY CONTRAST WITH EVERY OTHER FIGURE IN THIS BLOCK.
// 4,227 is not a function of today's constants — it is what the insert side
// READ at commit 59347c3, when the map half still carried the `2 *` factor.
// Recomputing it would make a future constant change demand that the
// commit-ordering paragraph state a number that was never true on the day it
// describes. It is pinned here so it cannot be edited silently either.
const SUPERSEDED_INSERT_SIDE_AT_59347C3 = "4,227";
const SUPERSEDED_QUOTIENT_AT_59347C3 = "8.26";
```

…and keep a one-line consistency assertion that the literal equals
`grouped(128 + 3 + 2 * 2048)` *as of this commit*, so the two cannot silently
diverge today while the history stays anchored tomorrow.

---

## Info

### IN-01: "the per-field ceiling is 4,112" does not name its unit, and the three candidate units disagree by up to 4x

**Classification:** INFO
**File:** `packages/backend/src/store/export.spec.ts:1067-1069`

**Issue.** The corrected sentence reads: *"`store/sources.ts` caps the STORED
label at SOURCES_LABEL_MAX (4,096 code points) at write time, so the per-field
ceiling is 4,112 across all three behaviours."* The `4,112` is correct **in code
points**. It is not correct in the two other units a reader will reach for: the
assertion eleven lines below measures `.length`, i.e. UTF-16 code units, where a
4,096-code-point astral label is 8,192 units and redacts to at most 8,208; and
"per-field" is a payload-budget noun (`tests/export-payload-budget.spec.ts`
measures bytes), where the ceiling is 16,384 + 16.

`store/sources.ts:70-90` already flags this exact unit hazard for
`SOURCES_LABEL_MAX` — *"computes a character budget and a reviewer needs the byte
one"* — so the ambiguity is a known one in this repo. The off-by-one the round
found and fixed (17 → 16) was the smaller of the two errors in the sentence.

**Fix.** Name the unit: *"…so the per-field ceiling is 4,112 CODE POINTS, which is
the unit `SOURCES_LABEL_MAX` is enforced in. In UTF-16 code units (what the
assertion below measures) and in UTF-8 bytes (what the payload budget measures)
the ceiling is 2x and 4x that respectively, for an all-astral label."*

### IN-02: the "never twice" comment is attached to the assertion that cannot detect it

**Classification:** INFO (pre-existing; untouched by this round, immediately below prose the round rewrote)
**File:** `packages/backend/src/store/export.spec.ts:1104-1108`

**Issue.**

```ts
// The marker is appended ONCE or not at all — never twice, which is the
// shape a second redaction pass over an already-redacted value would make.
expect(redacted).toBeGreaterThanOrEqual(
  Math.min(raw, EXPORT_QUERY_REDACTION.length),
);
```

A doubled marker makes the field *longer*, so a lower bound cannot see it. The
property is in fact enforced — by the `toBeLessThanOrEqual(raw +
EXPORT_QUERY_REDACTION.length)` on the line above — but the comment is attached
to the wrong assertion, and a reader auditing the "never twice" claim will
conclude it is checked by an assertion that checks something else.

**Fix.** Move the sentence up to the upper-bound assertion and give the lower
bound its own reason (it pins that a non-empty label never redacts to the empty
string).

### IN-03: 07-21's "no assertion was loosened" audit used a grep that cannot see two of the expectation changes the plan made

**Classification:** INFO (verification-method defect in `07-21-SUMMARY.md`; the substantive claim holds)
**File:** `.planning/phases/07-sourcemap-reconstruction/07-21-SUMMARY.md` (coverage item D4), about `packages/frontend/src/sourcemap/tree.spec.ts:858-864`

**Issue.** D4 records: *"`git diff -U0 HEAD~3..HEAD | grep -E '(expect|toBe|toEqual|toHaveLength|toContain|it.each|toBeGreaterThan|toBeLessThan)'` — exactly TWO assertion lines changed in the whole plan, both 23 -> 24"*, and the same grep is promoted in `patterns` as *"a two-line answer to 'was any gate loosened?' that no amount of reading can match"*.

The plan changed at least four expectations. Two match the grep
(`sources-sink-prohibition.spec.ts:1186` `toBe(23)`→`toBe(24)`,
`source-filename.spec.ts:88` `toHaveLength(23)`→`toHaveLength(24)`). Two do not,
because they live in named constants outside any `expect(` line:

```ts
const CORPUS_NODE_COUNT = 48;   // was 47
const CORPUS_OUTLINE = [ …, "1|source|App.vue?vue&type=script&lang.ts|23|0|0||-", … ];
```

`tests/corpus-maps.spec.ts`'s `SOURCES_LABEL_EXPECTED_COUNT` derivation changed
for the same reason. The claim "exactly TWO assertion lines changed in the whole
plan" is therefore false as stated, and the pattern being promoted for reuse is
blind to the commonest way this codebase holds expectations.

**Verified independently, so the substantive claim stands:** the 24th case is
appended (the first 23 entries of `SOURCES_LABEL_CASES` are byte-unchanged), the
only `it.each` row that moved is `src/gen/what?.ts`, moved by *07-22* out of the
"left whole" list into the new direction block where it is asserted as *cut* —
a tightening, not a loosening — `CORPUS_OUTLINE` is still compared with `toEqual`
against the full array, and every corpus-size consumer is driven off
`SOURCES_LABEL_CASES`/`SOURCES_LABEL_CASE_IDS` rather than a literal. I ran the
seven changed spec files: 649 tests, all green.

**Fix.** Amend the pattern to `git diff -U0 | grep -E '(expect|to[A-Z]|=\s*[0-9]+;|^\+\s*")'`
or state its limitation where it is recorded; a grep for `expect` lines is a
smoke test, not the audit D4 claims it is.

### IN-04: the counter this round made honest is still determined by construction — `DERIVED_MAX_DEPTH === 1` makes the recursion call site unreachable, so `depth_exceeded` is exactly "one per map-bearing artifact with at least one admitted source"

**Classification:** INFO
**File:** `packages/backend/src/ingest/consumer.ts:1421-1437`, `:1459-1471`

**Issue.** `reconstruct` has exactly two call sites: `:1519` enters at `depth: 0`
(`:1527`) and `:1422` is the recursive one, guarded by `nextDepth.ok`. Since
`admitDerivedDepth(0 + 1)` is `1 >= DERIVED_MAX_DEPTH (1)` → refused, `nextDepth.ok`
is always `false` on the only reachable path, so the `if (nextDepth.ok) { … await
reconstruct(…) }` block at `:1421-1437` never executes in production, and the
refusal at `:1459` fires for **every** stage that admitted at least one source.

The fix is correct and telemetry's stated unit is now honoured — a non-zero value
does now mean at least one map-bearing artifact reached the bound. But the
counter's value is still a function of the corpus rather than of the run: it
equals the number of map-bearing artifacts with a non-empty `sourcesContent`
entry, which is within one of `sourcesRecovered > 0`. MD-03's own objection —
*"A counter equal by construction to another counter carries no information about
the run"* — applies at reduced magnitude (1 per artifact instead of 781). This is
not a regression and not a reason to reopen anything; it is the ceiling on what
the counter can be worth while `DERIVED_MAX_DEPTH` is 1, and it should be said
where the counter is defined so nobody wires it to a health surface expecting
signal.

**Fix.** One sentence in `telemetry.ts`'s `derivedRejected` docblock: *"While
`DERIVED_MAX_DEPTH` is 1 the recursion call site is unreachable, so
`depth_exceeded` increments once for every map-bearing artifact that admitted a
source. It measures corpus shape, not run behaviour, until the bound is raised."*
No code change.

---

## Verified and Not Reported

Stated positively, because a clean verdict is only useful if it says what was
checked.

**Claim 1 — 07-18, all true.** `RETENTION_SWEEP_MAX_PASSES = 16` at
`thresholds.ts:220`, unchanged. `ROWS_INSERTED_PER_ARTIFACT_MAX = 3`,
`SOURCE_ROWS_PER_MAP_MAX = 2_048`, `RETENTION_SWEEP_EVERY_N = 128`,
`RETENTION_SWEEP_MAX_ROWS = 512`; every figure in the docblock (`8,192`, `2,179`,
`3.76x headroom`, `2,179 / 512 = 4.26`, `smallest integer that satisfies the
inequality is 5`, `next power of two above it is 8`) matches what the gate
recomputes, and each is on a single physical line so `toContain` can see it.
`2,179 > 2 x 1024` holds and the 1024 cost cap really is asserted
(`thresholds.spec.ts:394-398`). `4,227` and `8.26` are absent from the passes
region and present in the iteration region. The `region()` anchors are unique and
throw with a remedy if reordered. The non-vacuity guard is genuinely two-sided:
an emptied *passes* region fails the presence test, an emptied *iteration* region
fails the companion, and a missing anchor throws — so no arm can pass vacuously
(the residual is WR-04, about which value the companion pins, not about whether
it pins one). `ROWS_INSERTED_PER_ITERATION_MAX`'s history paragraph is
byte-unchanged in the diff.

**Claim 2 — 07-19, all true except the comment WR-01 reports.**
`admittedForRecursion` is incremented at `:1417`, on the single path that reaches
the recursion call site: `admitDerived`'s refusal arm has `continue`d at `:1302`,
and both `stillCurrent()` re-checks `return done(null)` at `:1310` and `:1333`.
The refusal is emitted at `:1459`, below the loop. `sm.derivedRejected[nextDepth.reason]++`
appears exactly once (`:1460`); the other two `derivedRejected` increments are the
in-callee depth backstop (`:1087`) and `admitDerived`'s own reason (`:1294`), both
correct and unchanged. `git diff --stat 11ab9e2..HEAD -- packages/backend/src/telemetry.ts`
is empty. F-1 is **confirmed** and reported as WR-01.

**Claim 3 — 07-20, all true.** The completeness check genuinely gained the
sightings arm (`retention.ts:1290-1296`): `sight.length >= sightLimit` is `0 >= 0`
→ `capped: true` when the budget is already spent, matching the `obs`/`ana` arms
exactly, so a capped sightings enumeration leaves the artifact standing.
`deleteDigest` contains no `sources` statement and `DELETE_ARTIFACT_SQL` has one
call site in the file. `SIGHTING_KEYS_FOR_DIGEST_SQL` is scoped, ordered on the
key's own tail and `LIMIT ?`-bound, and reuses the single `DELETE_SIGHTING_SQL`.
`FOREIGN KEY`/`ON DELETE CASCADE`/`PRAGMA foreign_keys` appear on no code line;
`retention.ts` has zero `.exec(` sites; the ladder still ends at `v: 9`. The new
single-pass test calls `sweepRetention` once and proves its own non-vacuity three
ways (budget exactly exhausted, `moreWork` true, and the evicted bundle really
gone — `seedArtifacts`' `stepMs = 1` makes `digests[0]` genuinely oldest). The
across-passes half re-asserts what it could already prove. Cascade ordering
against step 3d is safe in the only direction that matters: `deleteDigest` runs in
step 1 and the `sources` anti-join in step 3d, so a source unsighted by the
cascade is collected later in the same pass, and a *capped* cascade leaves more
sightings alive, which only keeps `sources` rows alive longer. The three children
are the complete set — `EXPECTED_TABLES` is `analyses, artifacts, audit,
observations, scans, settings, source_sightings, sources` and nothing else
references an artifact digest.

**Claim 4 — 07-21, substantively true; the audit method is not (IN-03).** Detailed
above.

**Claim 5 — 07-22, true.** The shipped docblock makes no unqualified storage-layer
claim about `?`. What it says — *"`?` is a reserved delimiter in URI syntax (RFC
3986) and the Win32 API rejects it in a path"* — is accurate on both halves (`?`
is an RFC 3986 gen-delim; `?` is in Win32's reserved set), and the next sentence
explicitly disclaims the stronger form: *"It is deliberately NOT the stronger
claim that a `?` cannot be part of a name — that stronger claim is untrue, and
this comment does not make it."* The `#`-legality sentence is kept and is true.
`redactUrlForExport` is byte-identical in the diff and `observations.url`'s
regression pin at `export.spec.ts:1110` is intact. `export.spec.ts:909`'s title
and its tripwire comment are both corrected, and the rewrite is stronger than the
original: the exception set is named, checked for existence against the corpus,
asserted to *differ* for named ids, and asserted to be *identical* for every
other — so a future query-bearing case that is not named fails loudly. The two
classifiers agree on the new label (`src/App.vue?vue&type=script&lang.ts`:
`indexOf("://") === -1` and no known scheme prefix → `isProtocolShapedLabel`
false, `relative` in `tree.ts`), so it really does probe the narrowed branch.

**Claim 6 — 07-22's off-by-one, true and the sweep is complete.**
`EXPORT_QUERY_REDACTION = "<query-redacted>"` is 16 characters, the worked example
`23 + 16 = 39` is right, and `4,096 + 16 = 4,112` is right in the unit
`SOURCES_LABEL_MAX` is enforced in (IN-01 is about the unit not being named, not
about the arithmetic). I grepped the whole workspace for other restatements of the
marker's length (`seventeen`, `sixteen`, `16|17` adjacent to `query-redacted`,
every occurrence of `4112`/`4113`): there are none outside this one comment. The
executor's deferred sweep has nothing left in it.

**Hard constraints — all held.** No new migration, no foreign key, no
`ON DELETE CASCADE`, `SCHEMA_VERSION` still 9. `RETENTION_SWEEP_MAX_PASSES` and
`MAP_MAX_BYTES` untouched. No outbound fetch anywhere in the diff (D-01); the only
filesystem access added is `readFileSync` inside `thresholds.spec.ts`'s gate,
which is a test reading repo source in the idiom three existing Phase 0 specs
already use and is not plugin runtime code (D-17). Nothing in the diff touches
`tests/frontend-load.spec.ts`, `vue-tsc` wiring, SC5's corpora or MAP-01's
external-`.map` half, and I have not reported any of them as missing.

**Gates re-run at HEAD.** Seven changed spec files: 649 tests, 7 files, all
passed. `pnpm typecheck` exit 0, `pnpm lint` exit 0, `pnpm knip` exit 0 (only the
repo's standing `@internal` tag hints).

---

_Reviewed: 2026-09-02T21:05:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
