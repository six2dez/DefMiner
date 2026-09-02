---
phase: 07-sourcemap-reconstruction
plan: 21
subsystem: testing
tags: [fixture, corpus, sourcemap, vitest, redaction, classifier]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-16's narrowing of `redactSourceLabelForExport` to protocol-shaped labels — the change this plan makes observable"
  - phase: 07-sourcemap-reconstruction
    provides: "07-18's `SOURCES_LABEL_CASES` docblock and id-derivation conventions, extended rather than reshaped here"
  - phase: 07-sourcemap-reconstruction
    provides: "07-20's committed test-count floor of 4310, which is this plan's live floor rather than the verifier's 4302"
provides:
  - "`loader-query`: the 24th `SOURCES_LABEL_CASES` entry, `src/App.vue?vue&type=script&lang.ts` — the first corpus label in this repository to contain a `?`"
  - "the measured confirmation that `classify()` puts it in `relative` and `isProtocolShapedLabel` returns false for it, so it probes the NON-DELEGATING export branch"
  - "the fixture's own gate stating 22 + 2 as a derivation, with `CLASSES_SPIKE_12_DOES_NOT_COVER` named so a third class is one edit"
  - "eleven corrected count statements across five files, one of them PRODUCTION code"
  - "one MEASURED `CORPUS_OUTLINE` line: the loader-query label MERGES into the `src` directory `benign-control` already creates — node count 47 -> 48, ROOT count unchanged at 21"
  - "the disclosure that `export.spec.ts:909`'s title and its stated tripwire are now both false while its assertion still passes — 07-22's to correct"
affects: [07-22, sourcemap, export, redaction]

actuals:
  tokens: 1659
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "measure the expectation, never transcribe it: the new `CORPUS_OUTLINE` line was produced by driving the shipped module over the 24-case corpus in a throwaway probe and reading the output, exactly as the array's own header requires of every line above it"
    - "audit the diff for assertion SHAPE, not just for green: `git diff -U0 | grep -E '(expect|toBe|toEqual|toHaveLength|it\\.each)'` over the whole plan is a two-line answer to \"was any gate loosened?\" that no amount of reading can match"
    - "let the run enumerate the consumers, not the plan: the pre-fix whole-suite run named three failing files and four of its six failures were expectations the plan had predicted as prose numerals"

key-files:
  created: []
  modified:
    - packages/engine/src/sourcemap/map-fixture.ts
    - tests/corpus-maps.spec.ts
    - packages/backend/src/sources-sink-prohibition.spec.ts
    - packages/frontend/src/components/source-filename.spec.ts
    - packages/frontend/src/components/source-filename.ts
    - packages/frontend/src/sourcemap/tree.spec.ts
    - packages/frontend/src/safety/hostile.spec.ts

key-decisions:
  - "The 24th case is APPENDED at the end of the frozen array, so the first 23 keep their declaration order and every index-ordered consumer is undisturbed. The RED commit is 20 insertions / 0 deletions, which proves the byte-unchanged claim rather than asserting it."
  - "`SOURCES_LABEL_EXPECTED_COUNT` stays a derivation and the addend is now a NAMED constant, `CLASSES_SPIKE_12_DOES_NOT_COVER = 2`, rather than a bare `+ 2`. A third class arriving is then one edit next to the sentence that explains it."
  - "`tree.spec.ts`'s `CORPUS_OUTLINE` gains one MEASURED line and the pre/post merge-key comparison's own 47 is PRESERVED in prose as its record. The comparison was made over the 23-label corpus and cannot honestly be restated as covering 24; the 48 is annotated as 47 plus WR-03's one merged leaf."
  - "The two `twenty-two` numerals in `sources-sink-prohibition.spec.ts` (:44 and :407) were left alone. They state what SPIKE-12 MEASURED — `escapes_via_resolve: true` on five of its own twenty-two labels — and are not statements about this corpus's size."
  - "No line number was written into the new case's `why`. The four facts the plan required are all there in prose; the `classify()` and `isProtocolShapedLabel` line numbers live in this SUMMARY, where they cannot rot inside a frozen fixture."

patterns-established:
  - "Pattern: a corpus case earns its place by probing a BRANCH, and the branch is confirmed before the case is written. Both classifiers were read by hand for this exact string and then re-confirmed at runtime; had either put it in `protocol` the case would have exercised the delegating branch and proved nothing about the narrowing."
  - "Pattern: when a plan knowingly leaves a sentence disagreeing with the code, NAME it with its owner in the SUMMARY. The next reader logs new drift; they do not re-log a disclosed hand-off."

requirements-completed: [MAP-04, MAP-05, UI-05]

coverage:
  - id: D1
    description: "`SOURCES_LABEL_CASES` carries a relative label with a query axis — `loader-query`, `src/App.vue?vue&type=script&lang.ts` — and the corpus is 24 cases with 24 unique derived ids."
    requirement: MAP-04
    verification:
      - kind: unit
        ref: "tests/corpus-maps.spec.ts#has exactly 24 label cases — SPIKE-12's 22, D-12's 4 KB label and WR-03's loader-query label"
        status: pass
      - kind: unit
        ref: "tests/corpus-maps.spec.ts#SOURCES_LABEL_CASE_IDS is SOURCES_LABEL_CASES' ids, in declaration order"
        status: pass
      - kind: unit
        ref: "tests/corpus-maps.spec.ts#loader-query has a non-empty value, unless its id declares otherwise / loader-query explains itself"
        status: pass
      - kind: other
        ref: "throwaway probe over the shipped modules — COUNT 24, IDLEN 24, no duplicate ids, WHYLEN 732"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both shape classifiers put the new label on the NON-protocol branch: `sourcePathShape` returns `relative` and `isProtocolShapedLabel` returns false, so it probes the branch 07-16 narrowed."
    requirement: MAP-04
    verification:
      - kind: other
        ref: "hand reading — tree.ts:238-281 falls through to `return { shape: \"relative\", ... }` at :281; export.ts:236-241 returns false"
        status: pass
      - kind: other
        ref: "throwaway probe — SHAPE relative, PROTOCOL false"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#the two shape classifiers agree over the whole corpus (drift gate, ran green over the new label)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every consumer that states the corpus size states 24, including the one PRODUCTION comment at packages/frontend/src/components/source-filename.ts:37."
    requirement: MAP-05
    verification:
      - kind: unit
        ref: "packages/backend/src/sources-sink-prohibition.spec.ts#the exercised label-id set EQUALS SOURCES_LABEL_CASE_IDS, in full"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/source-filename.spec.ts#drives both corpora and the null label"
        status: pass
      - kind: other
        ref: "grep audit — zero residual corpus-size `23`/`twenty-three` statements across all seven files; the four remaining `23` hits are the preserved 23-label historical record and the new case's sourcesIndex"
        status: pass
    human_judgment: false
  - id: D4
    description: "No consumer's assertion was loosened; every consumer that asserts the exercised id set EQUALS `SOURCES_LABEL_CASE_IDS` passes because it exercises the 24th case."
    requirement: MAP-05
    verification:
      - kind: other
        ref: "git diff -U0 HEAD~3..HEAD | grep -E '(expect|toBe|toEqual|toHaveLength|toContain|it.each|toBeGreaterThan|toBeLessThan)' — exactly TWO assertion lines changed in the whole plan, both 23 -> 24, both equality-preserving"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#covers every corpus case — a dropped case cannot buy the equality"
        status: pass
    human_judgment: false
  - id: D5
    description: "The three dynamic consumers absorbed the 24th case with NO edit, proven by an empty scoped diff; the two export modules 07-22 owns are untouched."
    requirement: UI-05
    verification:
      - kind: other
        ref: "git diff --name-only -- display.spec.ts sources.spec.ts SourceTree.spec.ts export.ts export.spec.ts — empty"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/safety/display.spec.ts#loader-query survives forSourceLine + exercised EVERY label case in the fixture module"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#the corpus round-trips byte-identically (exercised-set equality at :1035)"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceTree.spec.ts#renders every case without a title attribute anywhere"
        status: pass
    human_judgment: false
  - id: D6
    description: "The round baseline holds and rose by exactly the seven corpus-driven it.each cases: 90 test files / 4317 tests, exit 0, against 07-20's committed floor of 4310; typecheck, lint, knip and build all exit 0."
    verification:
      - kind: other
        ref: "pnpm vitest run --reporter=dot — Test Files 90 passed (90), Tests 4317 passed (4317)"
        status: pass
      - kind: other
        ref: "pnpm typecheck / pnpm lint / pnpm knip / pnpm build — exit 0, 0, 0, 0 (captured individually, not through a pipe)"
        status: pass
    human_judgment: false
  - id: D7
    description: "`export.spec.ts:909`'s title and its stated tripwire are now both FALSE while its assertion still passes — disclosed here, owned by 07-22."
    verification: []
    human_judgment: true
    rationale: "This is a deliberate, named hand-off rather than a verified property. Confirming it is correctly left standing — rather than silently corrected here, which would pre-empt 07-22's blocking decision on the redaction DIRECTION — is a judgment about plan scope that no assertion can make."

duration: 13 min
completed: 2026-09-02
status: complete
---

# Phase 07 Plan 21: The 24th Corpus Case Summary

**`SOURCES_LABEL_CASES` gains `loader-query` — `src/App.vue?vue&type=script&lang.ts`, the first corpus label in this repository to contain a `?` — and eleven count statements across five files absorb it without one assertion being loosened.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-02T20:17:00Z
- **Completed:** 2026-09-02T20:28:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- The corpus can finally SEE a query axis on a non-URL label. 23 measured shapes and not one `?` meant `export.spec.ts`'s two-mode test passed identically before and after 07-16's narrowing; it now runs over a label that exercises the narrowed branch.
- Both classifiers confirmed by hand AND at runtime to put the new value on the non-protocol branch, which is what makes it a probe rather than an accident.
- The fixture's own gate states 22 + 2 as a DERIVATION with the addend named, not as a literal 24.
- `tree.spec.ts` gained one MEASURED outline line and a finding: the loader-query label MERGES into the `src` directory `benign-control` already creates, so the node count rose by exactly one and the ROOT count did not move.
- The three dynamic consumers absorbed the case with no edit at all, proven by an empty diff rather than by a green suite.

## Task Commits

1. **Task 1 (RED): the 24th case** — `19713b6` (test)
2. **Task 1 (GREEN): the fixture's own gate** — `84b33c7` (test)
3. **Task 2: the consumer ripple** — `ce2db42` (test)

**Plan metadata:** see the `docs(07-21)` commit that follows this file.

## The new case

| Field | Value |
|---|---|
| `id` | `loader-query` |
| `value` | `src/App.vue?vue&type=script&lang.ts` (35 characters, pure ASCII) |
| position | 24th, APPENDED — the first 23 are byte-unchanged (RED commit: 20 insertions, **0 deletions**) |
| `why` length | 732 characters, far above the 20-character floor the corpus gate enforces |

The `why` carries the four facts the plan required: that it is WR-03's case; that it is the ordinary vite/webpack loader-query form rather than a hostile construction; that `classify()` puts it in `relative` so `isProtocolShapedLabel` is false for it and it probes the NON-DELEGATING export branch; and that it exists because that branch's stated premise — that a label which is not a URL has neither a query nor a fragment axis — is false for exactly this shape.

The `SOURCES_LABEL_CASES` docblock gained one sentence for the 24th, so the array's own header remains the place a reader learns what each block of the corpus is for. `SOURCES_LABEL_CASE_IDS` was **not edited**: it is derived by mapping over the cases and `tests/corpus-maps.spec.ts:101` asserts that derivation.

### Classifier confirmations, with line numbers

Read by hand first, then re-confirmed at runtime through a throwaway probe (deleted; the tree is clean).

| Classifier | File and lines | Reasoning for this exact string | Answer |
|---|---|---|---|
| `classify()` / `sourcePathShape` | `packages/frontend/src/sourcemap/tree.ts:237-282`, falling through to the final `return` at **:281** | `indexOf("://")` is `-1` so the authority test at :238-240 does not fire; none of `KNOWN_SCHEMES` (`webpack:`, `file:`, `https:`, `http:`, :219) prefixes it; it does not start with `UNC_PREFIX`; `charAt(1)` is `r` not `:` so the drive-letter test fails; it does not start with `/` | **`relative`** |
| `isProtocolShapedLabel` | `packages/backend/src/store/export.ts:236-241` | `separator = -1`, so `separator > 0` is false; `LABEL_KNOWN_SCHEMES` (:223) prefixes nothing | **`false`** |

Runtime probe output: `SHAPE relative`, `PROTOCOL false`. Both put the value on the branch that makes it a valid probe of 07-16's narrowing. `export.spec.ts`'s own two-classifier drift gate (`the two shape classifiers agree`, :894-907) ran green over the new label in the whole-suite run — the two classifiers agree on it, which is the `must_haves` truth this was written to establish.

## The pre-fix failing-file list, against the plan's prediction

The whole suite was run with the 24-case corpus in place BEFORE any consumer was touched. **3 files failed, 6 assertions:**

| File | Failures | Predicted by `files_modified`? |
|---|---|---|
| `packages/backend/src/sources-sink-prohibition.spec.ts` | 1 — `expected 24 to be 23` at :1185 | Yes |
| `packages/frontend/src/sourcemap/tree.spec.ts` | 4 — recorded-structure equality at :872, node/root counts at :877, corpus-index coverage at :892, node count at :1014 | File yes, **reason NO** |
| `packages/frontend/src/components/source-filename.spec.ts` | 1 — `to have a length of 23 but got 24` at :88 | Yes |

**The divergence, recorded as the plan asked.** The plan predicted `tree.spec.ts` would need only "the numeral in prose". It did not: four of the six failures were **authored expectations** — the MD-02 recorded-structure array, its two derived counts and its corpus-index coverage gate. That is the opposite of a problem. It is the corpus's designed cost working exactly as `map-fixture.ts`'s header claims: a case added here cannot be absorbed by a numeral because a real expectation has to be written for it.

Two files in `files_modified` did **not** fail: `hostile.spec.ts` (its only stale statement is a test title, which no assertion reads) and `source-filename.ts` (a production comment). Both were corrected anyway — a stale statement no gate can see is precisely the kind this round exists to remove.

## Every count site changed, before and after

| File | Site | Before | After |
|---|---|---|---|
| `packages/engine/src/sourcemap/map-fixture.ts` | `SOURCES_LABEL_CASES` docblock | (23 described) | one sentence added for the 24th, naming WR-03 |
| `tests/corpus-maps.spec.ts` | `SOURCES_LABEL_EXPECTED_COUNT` | `SPIKE_12_CASE_COUNT + 1` | `SPIKE_12_CASE_COUNT + CLASSES_SPIKE_12_DOES_NOT_COVER` (= 2) |
| `tests/corpus-maps.spec.ts` | describe title | "plus the class it does not cover" | "plus the two classes it does not cover" |
| `tests/corpus-maps.spec.ts` | it title | "has exactly 23 … SPIKE-12's 22 and D-12's 4 KB label" | "has exactly 24 … SPIKE-12's 22, D-12's 4 KB label and WR-03's loader-query label" |
| `tests/corpus-maps.spec.ts` | failure message | "D-12 adds the ONE class it does not cover" | "2 classes it does not cover are added on top — D-12's 4 KB label and WR-03's loader-query label, the relative label carrying a query axis" |
| `sources-sink-prohibition.spec.ts:34` | section header | "23 MEASURED STRINGS" | "24 MEASURED STRINGS" |
| `sources-sink-prohibition.spec.ts:38` | corpus provenance prose | "plus D-12's 4 KB label" | "plus D-12's 4 KB label and WR-03's loader-query label, the relative label carrying a query axis" |
| `sources-sink-prohibition.spec.ts:950` | section header | "the 23 MEASURED LABELS" | "the 24 MEASURED LABELS" |
| `sources-sink-prohibition.spec.ts:1161` | named-encodings comment | "23 measured strings" | "24 measured strings" |
| `sources-sink-prohibition.spec.ts:1186` | **exact-length assertion** | `toBe(23)` | `toBe(24)` |
| `source-filename.spec.ts:88` | **exact-length assertion** | `toHaveLength(23)` | `toHaveLength(24)` |
| **`source-filename.ts:37`** | **PRODUCTION comment** | "measured 23-label corpus" | "measured 24-label corpus" |
| `tree.spec.ts:2` | file header | "twenty-three" | "twenty-four" |
| `tree.spec.ts:269` | whole-corpus comment | "all twenty-three" | "all twenty-four" |
| `tree.spec.ts:730` | section header | "THE TWENTY-THREE HOSTILE LABELS" | "THE TWENTY-FOUR HOSTILE LABELS" |
| `tree.spec.ts:735` | blast-radius prose | "the twenty-three measured labels" | "the twenty-four measured labels" |
| `tree.spec.ts` | `CORPUS_OUTLINE` | 47 lines | 48 — one MEASURED line added |
| `tree.spec.ts` | `CORPUS_NODE_COUNT` | 47 | 48 |
| `tree.spec.ts` | `CORPUS_ROOT_COUNT` | 21 | **21 — unchanged** |
| `tree.spec.ts` | it title | "is 47 nodes over 21 roots" | "is 48 nodes over 21 roots" |
| `hostile.spec.ts:976` | it title | "renders all twenty-three labels" | "renders all twenty-four labels" |

**Register was matched, not converted.** `tree.spec.ts` and `hostile.spec.ts` spell the numeral as a word and still do; `sources-sink-prohibition.spec.ts` uses digits and still does.

**Two numerals were deliberately LEFT ALONE.** `sources-sink-prohibition.spec.ts:44` and `:407` say "FIVE of the twenty-two" — those state what SPIKE-12 measured about its own 22-label corpus, not this corpus's size. Changing them would have introduced a falsehood, not removed one.

**Residual-`23` audit.** A repo-wide grep over the seven files leaves four `23` hits, every one deliberate: `tree.spec.ts:749` and `:861` preserve the 23-label corpus as the merge-key comparison's historical record; `tree.spec.ts:856` is the new case's `sourcesIndex`, not a count; `map-fixture.ts:360` is the `why`'s accurate history ("a corpus of 23 labels without a single `?` could never say so").

## The measured outline line

`tree.spec.ts`'s `CORPUS_OUTLINE` header says its lines were **MEASURED, not transcribed**. The new line was produced the same way — a throwaway probe drove the shipped `buildSourceTree` over the 24-case corpus and its outline was read off:

```
1|source|App.vue?vue&type=script&lang.ts|23|0|0||-
```

**The finding.** Because the label is `relative` and its first segment is `src`, it **merges into the `src` directory node `benign-control` already creates** rather than opening a root of its own. So:

- node count **47 -> 48** (exactly one leaf)
- root count **21 -> 21** (unchanged)
- the `?` and both `&`s survive into the rendered node label **verbatim**, which is the losslessness the outline exists to pin

The pre/post merge-key comparison's own **47 over 21 roots** was preserved in prose as its record and annotated, because that comparison was made over the 23-label corpus and cannot honestly be restated as covering 24. `CORPUS_NODE_COUNT`'s docstring now reads "47 for the 23-label corpus, plus WR-03's one merged leaf".

## The three dynamic consumers, unmodified and proven so

`git diff --name-only -- packages/frontend/src/safety/display.spec.ts packages/backend/src/store/sources.spec.ts packages/frontend/src/components/SourceTree.spec.ts` prints **nothing**. Each passed unchanged, and each covers the new case:

| File | The assertion that covers it |
|---|---|
| `display.spec.ts` | `it.each(SOURCES_LABEL_CASES.map(...))("%s survives forSourceLine")` at :618-637 — it gained a case for `loader-query` — backed by `exercised EVERY label case in the fixture module` at :639-646, which asserts the exercised id set EQUALS `SOURCES_LABEL_CASE_IDS` |
| `sources.spec.ts` | the `for (const [index, labelCase] of SOURCES_LABEL_CASES.entries())` round-trip loop at :1003, asserting `sources_verbatim` is byte-identical after the write path, with the exercised-set equality at :1035 |
| `SourceTree.spec.ts` | `renders every case without a title attribute anywhere` at :513-524 — rows are built from `SOURCES_LABEL_CASES.map(...)` and the rendered label count is asserted against `SOURCES_LABEL_CASES.length`, so the bound moved with the corpus |

A consumer that "just passed" and a consumer that was quietly edited look identical in a green suite. The empty diff is what tells them apart.

## No assertion was loosened, and here is how that was checked

The check is mechanical rather than a claim. Over the **entire plan**:

```
git diff -U0 HEAD~3..HEAD | grep -E "^[-+].*(expect|toBe|toEqual|toHaveLength|toContain|it\.each|toBeGreaterThan|toBeLessThan)"
```

returns exactly **two** lines-changed pairs:

```
-    expect(SOURCES_LABEL_CASE_IDS.length).toBe(23);
+    expect(SOURCES_LABEL_CASE_IDS.length).toBe(24);
-    expect(SOURCES_LABEL_CASES).toHaveLength(23);
+    expect(SOURCES_LABEL_CASES).toHaveLength(24);
```

An equality stayed an equality. An exact length stayed an exact length. **No `it.each` line changed anywhere in the plan** — so no full iteration became a filtered one. Task 1's two commits changed **zero** assertion lines: `SOURCES_LABEL_EXPECTED_COUNT`'s derivation moved and the `expect(...).toBe(SOURCES_LABEL_EXPECTED_COUNT)` line is untouched context. `tree.spec.ts`'s four failures were fixed by adding a measured expectation and moving a measured constant, never by relaxing a comparison.

## The `export.spec.ts` disclosure — owned by 07-22

`packages/backend/src/store/export.spec.ts` is **untouched by this plan** (diff empty; prohibited) and its corpus test **PASSES**, because the shipped code returns a non-protocol label verbatim in both modes. But two of its sentences are now false:

1. **Its title (:909)** — `"returns EVERY hostile-corpus label byte-identical in BOTH modes — none of them has a query axis"`. `loader-query` has a query axis. The clause after the dash is now a false statement that the assertion before it nonetheless satisfies.
2. **Its comment (:910-914)** — `"The 23-entry corpus … not one of its entries has a query or a fragment … a future corpus entry that does carry a query fails here loudly rather than acquiring a marker nobody expected."` The count is stale, and so is the promise: **the entry was added and it did not fail loudly.** That is not a defect in this plan's work — it is the direct evidence for WR-03. 07-16's narrowing is exactly why a non-protocol label with a `?` now sails through both modes identically, and this gate's own stated tripwire does not trip on it.

**Owner: plan 07-22.** The redaction DIRECTION is its decision at a blocking checkpoint, and correcting either sentence here would have decided it silently. Named so the next reader recognises a disclosed hand-off rather than logging new drift.

## Verification results

| Gate | Command | Result |
|---|---|---|
| Fixture's own gate | `pnpm vitest run tests/corpus-maps.spec.ts` | 1 file / **116 tests**, exit 0 (114 before) |
| Engine | `pnpm vitest run packages/engine` | 13 files / **619 tests**, exit 0 |
| Backend targeted | `pnpm vitest run sources-sink-prohibition.spec.ts sources.spec.ts` | 2 files / **161 tests**, exit 0 |
| Frontend | `pnpm vitest run packages/frontend/src` | 27 files / **883 tests**, exit 0 |
| Whole suite | `pnpm vitest run --reporter=dot` | **90 files / 4317 tests**, exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Knip | `pnpm knip` | exit 0 |
| Build | `pnpm build` | exit 0 |
| Scoped diff | `git diff --name-only` over the 3 dynamic consumers + `export.ts` + `export.spec.ts` | **empty** |

**Test-count delta, attributed exactly.** 07-20's committed floor was **4310**; this plan reports **4317**, strictly higher, **+7**. Every one of the seven is a corpus-driven `it.each` gaining a case for `loader-query`:

| File | `it.each` blocks driven by the corpus | Tests added |
|---|---|---|
| `tests/corpus-maps.spec.ts` | non-empty-value, explains-itself | +2 |
| `packages/backend/src/sources-sink-prohibition.spec.ts` | the two `it.each(SOURCES_LABEL_CASE_IDS)` blocks at :1112 and :1123 | +2 |
| `packages/frontend/src/sourcemap/tree.spec.ts` | the per-case round-trip `it.each` at :232 | +1 |
| `packages/frontend/src/safety/hostile.spec.ts` | the `TREE_CORPORA` per-case `it.each`, sources-label arm | +1 |
| `packages/frontend/src/safety/display.spec.ts` | `%s survives forSourceLine` at :618 | +1 |
| | **total** | **+7** |

`sources.spec.ts` and `SourceTree.spec.ts` iterate inside a single `it`, so they exercise the new case without adding a test — which is why the delta is 7 and not 9. Files stayed at 90: no spec file was created.

The comparand is deliberately 07-20's 4310, not the verifier's 4302. 07-19 and 07-20 both added tests ahead of this plan in the serialised chain, so a `> 4302` bar would have been cleared by their work and would have said nothing about this plan's.

## R6 confirmation

`sourceDownloadName(DIGEST, "src/App.vue?vue&type=script&lang.ts")` returns `aaaaaaaaaaaaaaaa.ts` — the **allowlist** branch, not the `.txt` fallback (`CON` returns `aaaaaaaaaaaaaaaa.txt` for contrast). No byte of the query reaches the filename, which is R6's whole property and the reason `source-filename.spec.ts`'s at-most-ten-outputs proof stayed green with a 24th label in the set.

## Decisions Made

See `key-decisions` in the frontmatter. In brief: append rather than insert so the byte-unchanged claim is provable from the diffstat; keep the expected count a derivation and NAME the addend; preserve `tree.spec.ts`'s 47 as the merge-key comparison's own record rather than overwriting it; leave SPIKE-12's own "twenty-two" numerals alone; keep line numbers out of the frozen `why` and put them here.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `tree.spec.ts` needed four AUTHORED expectations, not a prose numeral**

- **Found during:** Task 2 (the pre-fix whole-suite run)
- **Issue:** The plan's `artifacts` list described `tree.spec.ts` as carrying only "the numeral in prose and in one test title". The run reported four real assertion failures there: the MD-02 recorded-structure equality (:872), the node/root counts (:877), the corpus-index coverage gate (:892) and the node-count claim (:1014). Bumping numerals would have left the file red.
- **Fix:** Measured the 24-case outline against the shipped module and authored the one new line, moved `CORPUS_NODE_COUNT` 47 -> 48, left `CORPUS_ROOT_COUNT` at 21 (measured, unchanged), updated the test title, and annotated the pre/post comparison so its own 47 is preserved as history rather than silently overwritten.
- **Files modified:** `packages/frontend/src/sourcemap/tree.spec.ts`
- **Verification:** `pnpm vitest run packages/frontend/src/sourcemap/tree.spec.ts` — 70 tests, exit 0; the assertion-shape audit shows zero assertion lines changed in that file.
- **Committed in:** `ce2db42`

**2. [Rule 2 - Missing Critical] Six count statements the plan's "five sites" did not enumerate**

- **Found during:** Task 2
- **Issue:** The plan named five count sites. `sources-sink-prohibition.spec.ts` alone carries **four** stale prose statements plus its assertion, and `tree.spec.ts` carries four prose numerals. Fixing only the enumerated ones would have satisfied the tests while leaving the `must_haves` truth — "every consumer that states the count states 24" — false.
- **Fix:** Grepped every `23` / `twenty-three` across the seven files and corrected each corpus-size statement, distinguishing them from SPIKE-12's own measured numerals and from the new case's `sourcesIndex`. Residual-`23` audit recorded above.
- **Files modified:** `packages/backend/src/sources-sink-prohibition.spec.ts`, `packages/frontend/src/sourcemap/tree.spec.ts`
- **Verification:** repo-wide grep leaves four deliberate `23` hits, each named above with its reason.
- **Committed in:** `ce2db42`

**3. [Rule 1 - Bug] The threat model's stated label length was wrong**

- **Found during:** Task 1
- **Issue:** `07-21-PLAN.md`'s T-07-93 row states the label is "38 ASCII characters". It is **35**.
- **Fix:** Recorded here rather than edited into the plan. The threat row's conclusion is unaffected — 35 is still far below every display cap, so the label exercises no truncation path — but the number is wrong and a later reader should not take it from the plan.
- **Files modified:** none
- **Verification:** runtime probe — `LEN 35`.
- **Committed in:** n/a (documentation finding)

---

**Total deviations:** 3 (2 missing-critical auto-fixed, 1 documentation bug recorded)
**Impact on plan:** No scope creep. Every fix is inside `files_modified`, and deviation 1 is the corpus's designed cost behaving exactly as `map-fixture.ts`'s header promises — a case added here could not be absorbed by a numeral because a real expectation had to be written for it.

## Issues Encountered

None. The `cp -i` hazard recorded in the round context was never reached: following 07-20's approach, the RED was observed by adding the case and running BEFORE the gate was updated, so no file was restored, checked out or stashed at any point. No `git stash`, `git clean` or blanket reset was used.

Three throwaway probe specs were written and deleted (`tests/zz-probe-0721.spec.ts`, `packages/frontend/src/sourcemap/zz-probe-0721.spec.ts`, `packages/frontend/src/components/zz-probe-0721.spec.ts`); `git status --short` was checked after each removal and the tree carries none of them.

## Known Stubs

None. No stub, placeholder, `TODO`, `FIXME`, skipped test or unrun `<verify>` was introduced. Every `<verify>` command in both tasks was executed and its exit code captured individually rather than through a pipe.

## Threat Flags

None. This plan adds a 35-character ASCII string to a frozen array and corrects prose. It creates no endpoint, no auth path, no file access and no schema change, and it touches no trust boundary that the corpus did not already sit behind.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **G-07-3 / WR-03, first half: CLOSED** at `19713b6` (the case), `84b33c7` (the fixture's gate) and `ce2db42` (the ripple).
- Ready for **07-22**, the last plan in the phase and in the serialised chain. It inherits a clean tree at **90 files / 4317 tests**, with typecheck, lint, knip and build all exit 0 — that count is 07-22's live floor.
- **What 07-22 inherits, specifically:** a corpus label that lands in `relative`, whose two-mode export behaviour is now observable, and whose current behaviour is pinned truthfully — so whichever direction the operator's chosen option A takes, the change will be VISIBLE as a change. Plus two false sentences in `export.spec.ts` (:909's title and :910-914's comment, including its untripped tripwire) that are 07-22's to correct.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

## Self-Check: PASSED

All seven modified files exist on disk. All three task commits (`19713b6`, `84b33c7`, `ce2db42`) are present in `git log --oneline --all`. Every `<acceptance_criteria>` from both tasks and every plan-level `<verification>` command was re-run; results are in the Verification results table above.
