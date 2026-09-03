---
phase: 07-sourcemap-reconstruction
reviewed: 2026-09-03T09:40:00Z
depth: standard
round: 4
files_reviewed: 3
files_reviewed_list:
  - packages/backend/src/ingest/consumer.ts
  - packages/backend/src/store/export.ts
  - packages/engine/src/thresholds.spec.ts
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues
---

# Phase 7: Code Review Report (round 4 — gap-closure round 3)

**Reviewed:** 2026-09-03T09:40:00Z
**Depth:** standard (full read of `git diff 87cccd8..HEAD` for all three files, plus
independent re-derivation of the `admitDerived` reachability chain from the sole
call site, a git-archaeology reconstruction of `sources_verbatim`'s redaction
history across `d5cd5e0` → `a901b9e` → `0e44102`, and verification of both pinned
historical figures against `git show 59347c3^`)
**Files Reviewed:** 3
**Status:** issues_found (0 Critical, 2 Warning, 2 Info)

## Summary

**Three of the four gaps are cleanly and truthfully closed. G-07-6 is not — the
sentence written to replace the false one is itself false, which is the
fifth-generation defect this round existed to prevent. And G-07-8's fix stopped
one operand short: the identical "historical figure pinned to a recomputed
expression" trap survives on the adjacent line of the same test the fix edited.**

What holds, verified against the code rather than the summaries:

- **G-07-5 (`07-23`) is closed and its new positive claim is TRUE.** I re-derived
  the unreachability independently. `admitDerived` has exactly one production
  call site repo-wide (`consumer.ts:1292`; `grep -rn "admitDerived(" packages
  --include=*.ts | grep -v spec` returns that plus the definition). Its input
  `byteLen` is `Buffer.from(source.content,"utf8").length` (`:1294`) over a
  `sourcesContent` entry of the document `decodeInlineMap(announcement.url,
  MAP_MAX_BYTES)` produced at `:1124`, whose gate at
  `packages/engine/src/sourcemap/parse.ts:227` is `Buffer.byteLength(json,"utf8")
  > maxBytes`. `derive.ts:142` sets `DERIVED_SOURCE_MAX_BYTES = MAP_MAX_BYTES` and
  `:233` refuses on `>`. A decoded entry's UTF-8 byte count is strictly below the
  document's, so `too_large` cannot fire. I also checked the second production
  parse site — `packages/backend/src/index.ts:1395`, the `deriveSource` read path
  — and it never reaches `admitDerived`, so "through the ingest path" is the right
  scoping and not an escape hatch. `too_large` survives untouched at
  `consumer.ts:276` (prose about `MAP_PARSE_REASONS`) and `:1005`
  (`if (reason === "too_large")`, live map-refusal counting). No
  `admitDerivedDepth` / `admittedForRecursion` / `derivedRejected` / brace appears
  on any changed line; the guard's behaviour is byte-identical.
- **G-07-7 (`07-24`) is closed and every factual claim in the new exception
  paragraph checks out**, save one over-reach recorded as IN-02.
  `redactUrlForExport` (`:199-202`), `EXPORT_QUERY_REDACTION` (`:178`),
  `isProtocolShapedLabel`, `redactSourceLabelForExport`'s body (`:331-339`) and
  `observations.url`'s `redact` binding (`:418`) are all byte-unchanged;
  `export.spec.ts` is unmodified in the range; the `<query-redacted>` occurrence
  count in `export.ts` is still 2 (`:178` and `:265`); and `export.ts:285-296` —
  07-22's accepted operator quotation — is byte-identical to `87cccd8`
  (`diff` of the two extracts shows the first divergence at `:297`, exactly where
  the fix begins).
- **G-07-8 (`07-25`) pins the right numbers.** `git show
  59347c3^:packages/engine/src/thresholds.ts` gives `RETENTION_SWEEP_EVERY_N =
  128`, `ROWS_INSERTED_PER_ARTIFACT_MAX = 3`, `SOURCE_ROWS_PER_MAP_MAX = 2_048`,
  `RETENTION_SWEEP_MAX_ROWS = 512` → `128 + 3 + 4096 = 4,227` and
  `4227/512 = 8.2558… → "8.26"`. Both literals are correct history. All six
  shipped figures (`deleteSide`, `insertSide`, `quotient`, `smallestSatisfying`,
  `nextPowerOfTwo`, `headroom`, `:857-863`) still derive from the `T.*` imports.
  The non-vacuity trap is intact: `:1006-1015` still reads `iterationDocblock()`
  and `.toContain("4,227")`, so emptying the history paragraph still fails it.
  **The adjudication to leave `supersededInsertSide` at `:327-353` alone is
  correct** — that one asserts a *relational* property over today's constants
  (`shippedInsertSide < supersededInsertSide` against the same delete budget) and
  never demands that any prose say a number, so recomputation is exactly the right
  shape there.

Prohibitions held. The whole diff outside `.planning/` is three files; filtering
it to non-comment lines yields only the `thresholds.spec.ts` change. No
`fetch`, `require(`, `readFile`, `writeFile`, `FOREIGN KEY`, `CASCADE`,
`SCHEMA_VERSION`, `MAP_MAX_BYTES` or `RETENTION_SWEEP_MAX_PASSES` token appears on
any changed line. `MAP_MAX_BYTES` is still `2_621_440` and
`RETENTION_SWEEP_MAX_PASSES` still `16`. `pnpm exec vitest run
packages/engine/src/thresholds.spec.ts` → 63 passed; `pnpm exec eslint` over the
three files → exit 0. Nothing in this round can move a byte, widen disclosure, or
change a control-flow decision. **There is no Critical finding, and there cannot
be one from a round this shape.**

*(No `<structural_findings>` block was supplied, so there is no fallow-substrate
section.)*

---

## Critical Issues

*(None.)*

---

## Warnings

### WR-01: `export.ts:450-451` says the two axes "moved in OPPOSITE directions" — they never did, against any single baseline, and the claim contradicts `export.ts:261` in the same file

**Classification:** WARNING
**File:** `packages/backend/src/store/export.ts:449-452`, against `:261` and `:268`

**Issue.** The replacement sentence G-07-6 asked for reads:

```
// its `#` tail. Two cuts with different semantics, not one redactor reused —
// and the two axes moved in OPPOSITE directions: the FRAGMENT axis NARROWED,
// to protocol-shaped labels only, while the QUERY axis WIDENED, to every
// label.
```

The function's own docblock, 190 lines above in the same file, says the opposite
about the same axis:

```
// export.ts:261
 * THE FRAGMENT AXIS, UNMOVED. `#` is a legal filename character;
```

```
// export.ts:268
 * THE QUERY AXIS, RESTORED. 07-16's premise — that a label which is not a URL
 * has neither axis — was FALSE for the commonest shape there is.
```

The docblock is right and the column comment is wrong. I reconstructed the column's
actual history from git:

| commit | `sources_verbatim` redaction | query axis scope | fragment axis scope |
|---|---|---|---|
| `d5cd5e0` (07-06) | `redact: redactUrlForExport` | every label | every label |
| `a901b9e` (07-16) | `isProtocolShapedLabel(l) ? redactUrlForExport(l) : l` | protocol-shaped only | protocol-shaped only |
| `0e44102` (07-22) | protocol → delegate; else cut at first `?` | every label | protocol-shaped only |

Against the **07-06** baseline — which is the baseline the surrounding paragraph
establishes, since it is the one that speaks of "the shipped redactor applies" and
of "cutting a bare path at its first `#`" — the fragment axis narrowed and the
query axis is **unchanged** (it covered every label then and covers every label
now). Against the **07-16** baseline — the one the function docblock uses, and the
one G-07-6's own `missing` bullet used when it said "the query axis was widened" —
the query axis widened and the fragment axis is **unmoved**, exactly as `:261`
says. At 07-16, when the fragment axis last actually moved, both axes moved *in
the same direction* (both narrowed). There is no baseline under which they moved
in opposite directions.

**Why it matters.** This is the same defect class, in the same file, in the same
sentence, for the third consecutive round: G-07-3 was a false claim in this
column comment, G-07-6 was a false claim in this column comment, and the repair
for G-07-6 is a false claim in this column comment. It is the first thing a
redaction-policy audit reads, it now disagrees with the authoritative docblock it
was explicitly told to align with (G-07-6 `missing`: "Align with the function
docblock … which already says it correctly"), and the disagreement is discoverable
by a reader who trusts neither — which is precisely how operator trust in this
file's prose erodes.

It is also worth recording *why the gate missed it*: `07-24-SUMMARY.md:204-205`
shows the acceptance evidence for this task was `grep -c 'WIDENED'` → 1 and
`grep -c 'NARROWED'` → 1. A word-presence probe cannot distinguish a true
directional claim from a false one, so the RED→GREEN transition proves only that
two words were typed.

**Fix.** Say only what is true of the shipped function and of 07-22's change,
which is what the docblock already says. Drop the invented symmetry:

```ts
    // Hence {@link redactSourceLabelForExport}: the SAME MARKER, applied PER
    // AXIS. A protocol-shaped label DELEGATES to `redactUrlForExport` and is cut
    // on `?` or `#`; every other label is cut by hand at its first `?` and keeps
    // its `#` tail. Two cuts with different semantics, not one redactor reused.
    // ONE AXIS MOVED AT 07-22 AND IT WIDENED: the query cut now reaches every
    // label, not only the protocol-shaped ones. The fragment axis is UNMOVED
    // since 07-16 and is still confined to labels that are actually URLs — which
    // is what `:261` says and what this comment must not contradict. Still not a
    // per-column exemption, and the argument in full — with the delegated
    // branch's known exception — is at that function.
```

If the operator wants the 07-06 baseline stated as well, it needs its own
sentence naming that baseline explicitly ("relative to 07-06, when the column
bound `redactUrlForExport` directly, the fragment axis has narrowed and the query
axis is unchanged"), not a merged clause that borrows one baseline per half.

---

### WR-02: `thresholds.spec.ts:1016-1022` still pins a HISTORICAL figure to a RECOMPUTED expression — G-07-8's exact defect, surviving on the second operand of the same sentence the fix edited

**Classification:** WARNING
**File:** `packages/engine/src/thresholds.spec.ts:1016-1022` (and the message at `:1012`), against `packages/engine/src/thresholds.ts:505-506`

**Issue.** G-07-8's diagnosis was: *a figure that describes what the code read on
2026-09-02 must not be recomputed from today's constants, because the day a
constant moves the gate begins demanding that a paragraph about the past be
rewritten to say something that was never true.* The fix applied that to `4,227`
and `8.26`. It did not apply it to `2,179`, which is the other half of the very
same historical sentence.

The docblock the guard reads (`thresholds.ts:505-506`) is a record of two past
commits:

```
 * commits mattered. The gate landed first (4,227 on the insert side, over-stated
 * and therefore safe) and the factor was retired second (2,179, exact). Taken the
```

The guard, as shipped after this round:

```ts
    expect(
      history,
      `ROWS_INSERTED_PER_ITERATION_MAX's docblock no longer names the shipped ` +
        `insert side ${grouped(insertSide)} alongside the superseded ` +
        `${grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3)}, so the ordering argument it makes can no ` +
        `longer be checked against the constants.`,
    ).toContain(grouped(insertSide));
```

`insertSide` is `T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ITERATION_MAX`
(`:858-859`), recomputed from today's constants. It equals `2,179` today only
because the constants have not moved — the identical coincidence the round just
finished asserting rather than assuming for `4,227`. Re-measure
`SOURCE_ROWS_PER_MAP_MAX` to 1,024 and this assertion demands that a paragraph
describing 2026-09-02 contain `1,155`, a number that was never true of that day,
with a failure message ("no longer names the shipped insert side 1,155 … so the
ordering argument it makes can no longer be checked against the constants") that
actively instructs the maintainer to rewrite the history. That is verbatim the
"drift detector becomes the drift generator" failure, and the new coincidence
test at `:895-931` does **not** catch it: that test only guards `4,227` and
`8.26`, so it stays green while this one turns red for the wrong reason.

The same recomputed value is interpolated into the *first* expect's message at
`:1012` — "the factor second at `${grouped(insertSide)}` (exact)" — presenting
today's arithmetic as a statement about that commit.

The result is an asymmetry inside one test: line `:1015` asserts a pinned literal
against the history paragraph while line `:1022` asserts a recomputed expression
against the same paragraph, for two numbers that sit in the same sentence of that
paragraph. G-07-8's `missing` said "Make the two superseded figures named
literals" and "Leave the SHIPPED figures derived" — `2,179`-as-it-appears-in-the-
history-paragraph is a historical figure that merely *happens* to coincide with a
shipped one, so it falls on the historical side of that line and was missed.

**Fix.** Pin the third historical figure the same way and let the existing
coincidence test cover it, so the history demand never recomputes:

```ts
  // ...and the insert side as it read AFTER the factor was retired, on the same
  // day. Coincides with today's `insertSide` only while the constants hold; the
  // coincidence test below is what says so.
  const SHIPPED_INSERT_SIDE_AT_59347C3 = 2_179;
```

then in the coincidence test add
`expect(insertSide, …).toBe(SHIPPED_INSERT_SIDE_AT_59347C3)` with the same
"THE REMEDY IS TO RETIRE THIS ASSERTION, not the history" message, and replace
both uses in the non-vacuity guard (`:1012`, `:1019`, `:1022`) with
`grouped(SHIPPED_INSERT_SIDE_AT_59347C3)`. The presence half at `:933-971` and the
absence half at `:973-999` keep using the derived `insertSide` — those genuinely
describe today's docblock and must recompute.

---

## Info

### IN-01: `thresholds.spec.ts:925` interpolates today's `RETENTION_SWEEP_MAX_ROWS` into a sentence asserting what it was before `59347c3`, and the quotient's historical denominator is never pinned

**Classification:** INFO
**File:** `packages/engine/src/thresholds.spec.ts:920-928`

**Issue.** The quotient assertion's failure message reads:

```ts
        `STAYS — it is ${grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3)} over ` +
        `RETENTION_SWEEP_MAX_ROWS (${T.RETENTION_SWEEP_MAX_ROWS}) as both stood ` +
        `before 59347c3. ...`
```

"as both stood before 59347c3" is asserted of a value read from `T.*` **today**.
The message only prints when the assertion has already failed, and one way it can
fail is `RETENTION_SWEEP_MAX_ROWS` moving — in which case the sentence prints
today's value labelled as the historical one, and the arithmetic it claims
(`4,227` over that value giving `8.26`) will not hold. The pinning comment at
`:865-884` states `4,227`'s provenance in full but never mentions that `"8.26"`
also depends on a third historical constant (`RETENTION_SWEEP_MAX_ROWS = 512` at
`59347c3^`, which I confirmed) that is not pinned.

Filed as Info rather than Warning because the text is diagnostic-only, it appears
only in a failure that already tells the reader to retire the assertion, and the
arithmetic is self-evidently inconsistent at that point. But it is the same
pattern as WR-02 and should be fixed alongside it.

**Fix.** Pin the denominator and stop interpolating: `const
SUPERSEDED_SWEEP_MAX_ROWS_BEFORE_59347C3 = 512;`, use it in the message, and add
a line to the provenance comment recording that `"8.26"` is `4,227 / 512` as both
stood at `59347c3^`.

### IN-02: `export.ts:311-313` claims the shared query marker is `observations.url`'s behaviour "on every row it has ever written" — it is the behaviour of redacted-mode rows only

**Classification:** INFO
**File:** `packages/backend/src/store/export.ts:311-313`

**Issue.** The new known-exception paragraph:

```
 * fix removed on the path branch. It is PRE-EXISTING `redactUrlForExport`
 * behaviour and it is `observations.url`'s shipped behaviour on every row it has
 * ever written.
```

Redaction is applied conditionally at `:607-608`:

```ts
      mode === "redacted" && column.redact !== null
        ? column.redact(text)
```

In raw mode `observations.url` writes the URL whole and no marker appears at all,
so there is a large class of rows the column has written for which the described
behaviour is not what happened. Elsewhere the same file is careful to qualify
this — `:172` ("What a covered field reads as in the **redacted mode**") and
`:191` ("the raw mode exposes and the **redacted mode** withholds").

**Fix.** Add the two words the rest of the file uses: "…and it is
`observations.url`'s shipped behaviour on every redacted row it has ever written."

---

## What I checked and did NOT find a problem with

Recorded so the next round does not re-litigate ground that was verified:

- The two surviving mid-line sentences in `consumer.ts` ("Guarding the emission…"
  at `:1272-1275`, "The number beside the reason is the ADMITTED…" at
  `:1457-1461`) are carried forward with identical wording, only re-wrapped.
- `consumer.spec.ts:2690-2695`'s mixed-map argument is unmodified in this range,
  and its cross-references (`sourcemap/derive.ts:142`) still resolve to the right
  line — `derive.ts` was not touched.
- The only line-number citations elsewhere in the tree that name a changed file
  are `outbound-prohibition.spec.ts:1556` (`ingest/consumer.ts:38-46`) and `:1589`
  (`ingest/consumer.ts:344`). Both sit far above this round's edits, which start
  at `:1265`, so neither went stale.
- `export.ts`'s `<query-redacted>` occurrence count is unchanged at 2, so 07-24
  wrote no new vocabulary and did not restate the marker in prose.
- Per the round's fence, I did not report W-4, W-6, the frontend frame budget,
  SC5's FP corpora, MAP-01's external half, IN-04's declined docblock caveat, or
  `07-UI-SPEC.md:851`'s stale row — all of which remain open by explicit operator
  decision or by scope.

---

_Reviewed: 2026-09-03T09:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Round: 4 — gap-closure round 3 (`87cccd8..HEAD`, plans 07-23 … 07-25)_
