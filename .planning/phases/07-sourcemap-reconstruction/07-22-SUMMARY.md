---
phase: 07-sourcemap-reconstruction
plan: 22
subsystem: api
tags: [export, redaction, sourcemap, disclosure, docblock, vitest, rfc3986]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-16's narrowing of `redactSourceLabelForExport` to protocol-shaped labels — the change this plan reverses on one axis and keeps on the other"
  - phase: 07-sourcemap-reconstruction
    provides: "07-21's `loader-query` corpus case, the shape this plan asserts by id in both export modes"
  - phase: 07-sourcemap-reconstruction
    provides: "07-21's committed test-count floor of 4317 and its disclosure that `export.spec.ts:909`'s title and comment were both false"
provides:
  - "the operator's option-A decision on WR-03, recorded with its date, its accepted premise and the alternative it was chosen over"
  - "`redactSourceLabelForExport`'s two-axis rule: the QUERY axis cut on every label, the FRAGMENT axis only on URL-shaped ones"
  - "a docblock whose premise sentence is TRUE, whose `?` justification is a claim about what a bundler EMITS rather than about what a name may contain, and which keeps the TRUE `#`-legality sentence LO-04's rationale rests on"
  - "the loader-query label pinned BY ID in both modes, plus four per-shape direction cases"
  - "the two-mode corpus sweep rewritten: its exception set is NAMED and checked against the corpus rather than claimed to be empty"
  - "the measured finding that `EXPORT_QUERY_REDACTION` is 16 characters, not the 17 the byte-budget prose claimed — ceiling 4,112, not 4,113"
affects: [sourcemap, export, redaction, 07-verification]

actuals:
  tokens: 4155
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a redaction marker is a factual claim about the field beside it, so the axis is cut where the axis EXISTS rather than where a single shape test says it might"
    - "a disclosure direction is decided by the operator at a blocking-human checkpoint, and the sentence they accepted is quoted verbatim into the docblock — a promise about an exported artifact belongs in the words the decision was made against"
    - "a two-mode sweep NAMES its exception set and validates the names against the corpus, so a blanket property can never hide a case that stopped conforming"

key-files:
  created: []
  modified:
    - packages/backend/src/store/export.ts
    - packages/backend/src/store/export.spec.ts

key-decisions:
  - "WR-03 direction: option A — split the two axes. Chosen by the operator on 2026-09-02 at a gate=\"blocking-human\" checkpoint, over option B (correct the premise and sanction the disclosure)."
  - "The `?` justification is written as a claim about what a BUNDLER EMITS — RFC 3986 reserved-delimiter status plus Win32 rejection — and explicitly NOT as a claim that a `?` cannot be part of a name. The docblock makes no storage-layer claim about `?` at all."
  - "The `#`-is-a-legal-filename-character sentence is KEPT. It is true, it is LO-04's own rationale, and the prohibition was scoped to the false `?` claim rather than to legality claims as a category."
  - "The non-protocol branch was written inline rather than extracted to a helper — a named export nothing else consumes is what `knip` reports, and an unexported helper for three lines buys nothing."
  - "The byte-budget prose's `17`/`4,113` were measured wrong and corrected to `16`/`4,112`; the assertion was never wrong because it reads `EXPORT_QUERY_REDACTION.length`."

patterns-established:
  - "Pattern: RED before the change, never a restore. The spec pins were written and committed failing (6aef224) before `export.ts` moved, so `cp -i`'s silent no-op could not bite."
  - "Pattern: assert the corpus BY ID with a loud throw on absence, so a renamed case fails the pin instead of silently un-covering the branch it was added to probe."

requirements-completed: [MAP-07, UI-05]

coverage:
  - id: D1
    description: "The operator's option-A decision on WR-03 is recorded with its letter, its date, the premise they accepted and the alternative it was chosen over, and it was recorded BEFORE any edit to `export.ts`."
    requirement: "MAP-07"
    verification:
      - kind: other
        ref: "git log --oneline 3c2447c..HEAD — 398e693 (decision record) precedes 0e44102 (the export.ts edit)"
        status: pass
    human_judgment: false
  - id: D2
    description: "`redactSourceLabelForExport` cuts the QUERY axis on every label and the FRAGMENT axis only on URL-shaped ones: the loader-query corpus label is cut at its `?` in redacted mode and whole in raw, while `src/components/Button#new.tsx` and `src/a://b#c.ts` stay byte-identical in both."
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#cuts the CORPUS's loader-query label at its `?` in redacted mode, and returns it whole in raw — WR-03, by id"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#pins WR-03's direction per shape, in BOTH modes — (4 cases)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#leaves a NON-URL label whole in redacted mode — (5 cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The premise sentence at `export.ts:255-256` is gone and its replacement is true: the `?` half is a claim about what a bundler emits, no storage-layer claim about `?` is made, and the TRUE `#`-legality sentence survives."
    requirement: "MAP-07"
    verification:
      - kind: other
        ref: "! awk '/The redacted form of one manifest/,/^export function redactSourceLabelForExport/' packages/backend/src/store/export.ts | grep -niE 'filesystem|file system|mainstream' — exit 0"
        status: pass
      - kind: other
        ref: "awk '/The redacted form of one manifest/,/^export function redactSourceLabelForExport/' packages/backend/src/store/export.ts | grep -c 'EXPORT_QUERY_REDACTION' — prints 1 (non-vacuity companion)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The two-mode corpus sweep's false title and false comment are corrected: the exception set is named, validated against the corpus, and asserted in both directions."
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#returns every hostile-corpus label byte-identical in BOTH modes EXCEPT the ids that carry a query axis, which it NAMES"
        status: pass
    human_judgment: false
  - id: D5
    description: "`observations.url` is byte-identical in both modes and `redactUrlForExport` is byte-unchanged — the manifest fix reached no column it has no business touching."
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#leaves `observations.url` BYTE-IDENTICAL — the shared redactor did not move under LO-04 (unmodified)"
        status: pass
      - kind: other
        ref: "diff of `redactUrlForExport`'s definition at HEAD~3 vs HEAD — BYTE-IDENTICAL"
        status: pass
    human_judgment: false
  - id: D6
    description: "The per-field byte ceiling did not rise: the budget test and the payload-level budget both pass, and the corrected arithmetic is 4,112 across all three behaviours."
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#bounds a redacted manifest field at RAW + one marker — the payload-budget question, answered by arithmetic"
        status: pass
      - kind: integration
        ref: "pnpm vitest run tests/export-payload-budget.spec.ts — 12 passed (12), file unmodified"
        status: pass
    human_judgment: false
  - id: D7
    description: "The round baseline holds and rose by exactly the four net new cases: 90 files / 4321 tests against 07-21's floor of 4317, with typecheck, lint, knip and build all exit 0."
    verification:
      - kind: other
        ref: "pnpm vitest run --reporter=dot — Test Files 90 passed (90), Tests 4321 passed (4321)"
        status: pass
      - kind: other
        ref: "pnpm typecheck && pnpm lint && pnpm knip && pnpm build — all exit 0"
        status: pass
    human_judgment: false
  - id: D8
    description: "The operator's withholding sentence appears verbatim in the docblock — but it is option A's own defining text quoted by reference, not a sentence the operator composed in their own words."
    verification: []
    human_judgment: true
    rationale: "The operator answered with the letter and a premise verdict and supplied no separate sentence of their own. Whether quoting option A's defining text by reference discharges the plan's 'the operator's own withholding sentence' criterion is a judgment the operator should confirm, not one this executor can assert."

duration: 9 min
completed: 2026-09-02
status: complete
---

# Phase 07 Plan 22: Split the Two Axes Summary

**The query axis is now cut on every `sources` label and the fragment axis only on URL-shaped ones — restoring the pre-07-16 safe-mode behaviour that WR-03 found had silently widened, on an operator-chosen premise stated as what a bundler EMITS rather than as the false claim that a `?` cannot be part of a name.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-02T20:35:03Z
- **Completed:** 2026-09-02T20:44:04Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- **G-07-3 / WR-03 is CLOSED IN FULL.** 07-21 made the disclosure observable by adding the corpus shape; this plan decided its direction, corrected the sentence that justified the narrowing, and pinned the result by id and by shape.
- `redactSourceLabelForExport` gained a non-protocol branch cutting at the first `?`. `src/App.vue?vue&type=script&lang.ts` no longer exports verbatim in the mode an operator picks *because the artifact is going to be shared*.
- LO-04's fix is not merely preserved, it is now **pinned from this plan forward**: two `#`-bearing bare paths are asserted byte-identical in both modes, so the slide back into option C fails loudly.
- Two false statements in `export.spec.ts` — a title and an untripped tripwire, both disclosed by 07-21 — are corrected, and a third (a byte-budget off-by-one) was found by measurement and corrected with them.

## Task Commits

1. **Task 1: CHECKPOINT — the disclosure direction** — `398e693` (docs)
2. **Task 3 (RED half): pin the direction by id and by shape** — `6aef224` (test)
3. **Task 2: make the premise true — option A and its docblock** — `0e44102` (fix)
4. **Task 3 (deviation): restate the byte-budget arithmetic** — `d52d260` (docs)

**Plan metadata:** see the final `docs(07-22)` commit.

_Task 3's spec change was committed FIRST, deliberately RED, before task 2 moved `export.ts` — task 3's own `<action>` mandates it ("Write the assertions first against the state task 2 started from, observe which are RED"), and it is what removes any need for the `cp -i` restore that bit 07-19._

## Task 1 — the decision, recorded before any edit to `export.ts`

**Option letter: `A` — split the two axes. Date: 2026-09-02. Answered by: the operator.**

Recorded in commit `398e693`, which precedes `0e44102` (the `export.ts` edit) in `git log`. That ordering is the plan's acceptance criterion and it is verifiable rather than asserted.

### The premise put to the operator, and their verdict

> A `?` appearing in a `sources` label emitted by a bundler is a loader or URL artifact rather than part of a source name.

**ACCEPTED.** It was presented as a premise they could reject, with the counter-argument in the same breath: that this is PROBABILISTIC about what bundlers emit and NOT absolute about what a name may legally contain; that `?` is a reserved delimiter in URI syntax (RFC 3986) and is rejected by the Win32 API, but that APFS and ext4 both accept it and reject only `/` and NUL — measured on this machine by creating `what?.txt` successfully, and already anticipated by `export.spec.ts` carrying `src/gen/what?.ts`. They were told plainly that **option B was the correct choice if they judged a `?` could legitimately be part of a source name.** They chose A under that framing.

### The withholding sentence, written verbatim into the docblock

> "A non-protocol label is cut at the first `?` only, with the SHIPPED marker appended, and keeps its `#` tail."

This is option A's own defining text as presented to and accepted by the operator, quoted by reference. The operator answered with the letter and the premise verdict and did **not** dictate a sentence in their own words — see the deviation below, and coverage entry `D8`, which routes this to a human rather than claiming it discharged automatically.

**Options B and C were not executed.** C would have halted the plan rather than run, because it reopens LO-04.

## Task 2 — the premise made true

### The premise sentence, before and after

**BEFORE** (`export.ts:255-258`):

> "…{@link redactUrlForExport} cuts at the first `?` or `#` because in a URL those characters BEGIN the query and the fragment. **A label that is not a URL has neither axis**, so there is no query to withhold and the marker would be a FALSE STATEMENT in an exported artifact…"

**AFTER** — three replacement paragraphs, headed `THE TWO AXES ARE NOT THE SAME QUESTION`, `THE FRAGMENT AXIS, UNMOVED` and `THE QUERY AXIS, RESTORED`:

> "…a `sources` label is a URL only when it is protocol-shaped."
>
> "**THE FRAGMENT AXIS, UNMOVED.** `#` is a legal filename character; `src/components/Button#new.tsx` is a real name. Cutting it did two wrong things at once: it DISCARDED a legal path tail, and it printed a marker telling the reader a query had been withheld when there had never been one… So the fragment axis is still cut only on a label that is actually a URL."
>
> "**THE QUERY AXIS, RESTORED.** 07-16's premise — that a label which is not a URL has neither axis — was FALSE for the commonest shape there is. `src/App.vue?vue&type=script&lang.ts` is the ordinary vite and webpack loader query, and `sourcePathShape()` puts it in `relative`, so between 07-16 and WR-03 it exported VERBATIM in the mode an operator picks BECAUSE the artifact is going to be shared. `map-fixture.ts` carries that shape as `loader-query`, and `export.spec.ts` pins both of its modes by that id."
>
> "**WHY THE ASYMMETRY IS DEFENSIBLE, AND WHAT KIND OF CLAIM IT IS.** `?` is a reserved delimiter in URI syntax (RFC 3986) and the Win32 API rejects it in a path, so a `?` inside a BUNDLER-EMITTED `sources` label is overwhelmingly a loader or URL artifact rather than part of a source name. That is a claim about the population of labels a bundler produces. **It is deliberately NOT the stronger claim that a `?` cannot be part of a name — that stronger claim is untrue, and this comment does not make it.**"

The docblock also records that the premise is the operator's, names the date and the checkpoint, names the alternative it was chosen over, and quotes the withholding sentence.

### The two gates on that docblock

| Gate | Command | Result |
|---|---|---|
| **Non-vacuity companion** | `awk '/The redacted form of one manifest/,/^export function redactSourceLabelForExport/' packages/backend/src/store/export.ts \| grep -c 'EXPORT_QUERY_REDACTION'` | **`1`** — non-zero, so the awk range did not collapse and the negative gate below ran against a real stream |
| **Region-scoped negative gate** | `! awk '…' \| grep -niE 'filesystem\|file system\|mainstream'` | **exit `0`**, nothing printed — no `?`-impermissibility claim was introduced |

The opening summary line `The redacted form of one manifest \`sources\` label.` is **byte-unchanged**; no diff hunk touches it, which is what keeps the awk range anchored where the gate assumes it is. `export.ts:618`'s legitimate use of "filesystem" in the download-filename docblock is outside the range, which is why the gate is region-scoped rather than file-wide.

### The function, before and after

```ts
// BEFORE
export function redactSourceLabelForExport(label: string): string {
  return isProtocolShapedLabel(label) ? redactUrlForExport(label) : label;
}

// AFTER
export function redactSourceLabelForExport(label: string): string {
  if (isProtocolShapedLabel(label)) return redactUrlForExport(label);
  // NOT a URL, so only the query axis applies: `#` here is a filename
  // character, and `redactUrlForExport` would cut on it. Hence the first `?`
  // by hand rather than delegating — the SAME marker, a narrower cut.
  const query = label.indexOf("?");
  return query === -1
    ? label
    : `${label.slice(0, query)}${EXPORT_QUERY_REDACTION}`;
}
```

`EXPORT_QUERY_REDACTION` occurrences in `export.ts`: **3 before, 4 after** — exactly the one new use the criterion allows. The marker literal `"<query-redacted>"` is still spelt in **exactly one** place. `isProtocolShapedLabel` is still declared, still exported, still called (`export.ts:236`, `:310`). The branch was written **inline rather than extracted**: a named export nothing consumes is what `knip` reports, and an unexported helper for three lines buys nothing.

## Task 3 — the direction pinned, and the RED that proved it moved

### The RED state, recorded as the plan requires

Committed failing at `6aef224`, **before** `export.ts` moved: **3 failed | 135 passed (138)**.

| Failing assertion | Received | Expected |
|---|---|---|
| loader-query, by id, redacted | `src/App.vue?vue&type=script&lang.ts` | `src/App.vue<query-redacted>` |
| direction case 1, relative with `?` | `src/gen/what?.ts` | `src/gen/what<query-redacted>` |
| two-mode corpus sweep | `loader-query` came back byte-identical to raw | listed as cut |

**The other three direction cases passed at RED**, which is the load-bearing half of the observation: `src/components/Button#new.tsx`, `src/a://b#c.ts` and the protocol-shaped query case were green *before* the change and green *after* it. LO-04's fix did not move, and that is measured rather than asserted.

### The four direction cases, with their asserted outputs

| # | Shape | Label | Redacted | Raw |
|---|---|---|---|---|
| 1 | relative, query, no fragment | `src/gen/what?.ts` | `src/gen/what<query-redacted>` | unchanged |
| 2 | relative, fragment, no query | `src/components/Button#new.tsx` | unchanged | unchanged |
| 3 | relative despite `://` | `src/a://b#c.ts` | unchanged | unchanged |
| 4 | protocol-shaped with query | `http://evil.example/app.js?token=hunter2` | `http://evil.example/app.js<query-redacted>` | unchanged |

Plus the corpus pin: `loader-query`, looked up **by id** with a loud throw if the id is absent, asserted cut at its `?` in redacted mode and byte-identical in raw. The label string is never repeated as a literal — the expected value is derived from the id-looked-up value, so a renamed case fails the pin instead of silently un-covering the branch.

### The two-mode sweep, rewritten rather than deleted

Its title now reads *"returns every hostile-corpus label byte-identical in BOTH modes EXCEPT the ids that carry a query axis, which it NAMES"*. The exception set is a named constant (`CORPUS_IDS_CUT_IN_REDACTED_MODE = ["loader-query"]`), **validated against the corpus first** so a rename fails, then asserted in both directions — differing ids must differ, the rest must match. The comment now explains *why* it was rewritten: 07-21 added exactly the entry the old comment promised would "fail here loudly", and it did not.

`src/gen/what?.ts` was **moved out** of the "leaves a NON-URL label whole" list, not deleted — it is direction case 1 now, asserted in both modes rather than merely asserted whole.

### The byte ceiling, confirmed by running rather than by re-deriving

| Check | Result |
|---|---|
| `export.spec.ts` byte-budget test | **pass** — `redacted <= raw + EXPORT_QUERY_REDACTION` holds over the 24-case corpus plus six extra shapes |
| Per-field ceiling | **4,112** = `SOURCES_LABEL_MAX` (4,096 code points) + marker (16 chars). **Unchanged across all three behaviours** — pre-LO-04, post-LO-04, post-WR-03 |
| `tests/export-payload-budget.spec.ts` | **12 passed (12)**, exit 0, **file unmodified** |

### `observations.url` and the shared redactor

`redactUrlForExport`'s definition diffs **BYTE-IDENTICAL** against `HEAD~3`. The `observations.url` regression pin is **unmodified and green**. The manifest decision reached no column it has no business touching.

## Files Created/Modified

- `packages/backend/src/store/export.ts` — `redactSourceLabelForExport` gains the non-protocol query-axis branch; the LO-04 docblock's false premise is replaced by the two-axis rule, the operator's decision and the corrected asymmetry (+51 / −8)
- `packages/backend/src/store/export.spec.ts` — the loader-query pin by id, four direction cases, the rewritten two-mode sweep, `src/gen/what?.ts` relocated, and the byte-budget arithmetic restated (+155 / −16 across two commits)

## Decisions Made

See `key-decisions` in the frontmatter. The load-bearing one: **the prohibition was scoped to the false `?` claim and NOT to legality claims as a category**, so the TRUE sentence "`#` is a legal filename character" was kept rather than deleted for safety. A round that closes four false comments must not delete a true one to avoid a fifth.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] The byte-budget comment's "after" line was falsified by this plan's own change, and its arithmetic was measured off by one**

- **Found during:** Task 3 (confirming the ceiling)
- **Issue:** Two distinct problems in one comment block. (a) The line `after   L, or cut + 17 when the label is URL-shaped` described LO-04's shape only; under WR-03 a *non*-URL label with a `?` is also cut, so **my own change made that sentence false** — the exact defect class this round exists to remove. (b) Measuring the constant to confirm the ceiling showed `EXPORT_QUERY_REDACTION` is **16** characters, not the 17 the prose claimed, making the stated ceiling 4,113 rather than the true 4,112. The comment's own worked example already contradicted itself: it says 27 redacts to 39, and 23 + 17 = 40.
- **Fix:** Restated the arithmetic as three behaviours (pre-LO-04, post-LO-04, post-WR-03), corrected 17→16 and 4,113→4,112, and recorded explicitly that the ASSERTION was never wrong because it reads `EXPORT_QUERY_REDACTION.length` rather than a literal.
- **Files modified:** `packages/backend/src/store/export.spec.ts` (comment only — no assertion, no ceiling, no `extra` entry changed)
- **Verification:** 138 passed (138); `tests/export-payload-budget.spec.ts` 12 passed, unmodified
- **Committed in:** `d52d260`
- **In scope because:** the plan's task 3 `<read_first>` states "Under option A this test's arithmetic changes shape but not its ceiling", so restating it was anticipated; and the file is in `files_modified`.

**2. [Documented substitution — not auto-fixed] The operator supplied no withholding sentence in their own words**

- **Found during:** Task 1
- **Issue:** Task 1's `<acceptance_criteria>` requires "the operator's one-sentence statement of what a redacted label withholds" recorded verbatim and written into the docblock. The operator answered with the option letter and a verdict on the premise; they did not compose a separate sentence.
- **Resolution:** Rather than fabricate a quotation, the sentence recorded and written into the docblock is **option A's own defining text as presented to and accepted by the operator**, quoted by reference and labelled as such both here and in `398e693`. Coverage entry `D8` carries `human_judgment: true` so the operator is asked to confirm this discharges the criterion.
- **Files modified:** `packages/backend/src/store/export.ts`, `07-22-SUMMARY.md`
- **Committed in:** `398e693`, `0e44102`

**3. [Ordering] Task 3's spec commit precedes task 2's source commit**

- **Found during:** Task 3
- **Issue:** The plan numbers task 2 before task 3, but task 3's `<action>` mandates writing the assertions first and observing RED, and the environment caveat warns that the `cp -i` alias made a post-hoc restore silently fail on 07-19.
- **Resolution:** Committed the RED spec at `6aef224`, then task 2 at `0e44102`. No restore was ever needed. Task 2's own `<verify>` (`export.spec.ts` green) was run and passed *after* its edit, exactly as written.
- **Impact:** commit order only; every task's acceptance criteria and verify commands were run in full.

---

**Total deviations:** 1 auto-fixed (Rule 2 — a false comment my own change created, plus a measured off-by-one beside it), 1 documented substitution, 1 ordering deviation.
**Impact on plan:** No scope creep. Both source files stayed inside `files_modified`; the corpus, `redactUrlForExport`, `tests/export-payload-budget.spec.ts` and the `observations.url` pin were all left untouched and verified so.

## Issues Encountered

None. All five prohibited-change checks came back clean on the first run: the corpus is frozen, `redactUrlForExport` is byte-identical, `isProtocolShapedLabel` is intact, no second marker literal exists, and `git diff --name-only -- packages/backend/src/store` lists only the two files this plan owns.

## Full-Gate Numbers

| Gate | Command | Result |
|---|---|---|
| Owning spec | `pnpm vitest run packages/backend/src/store/export.spec.ts --reporter=dot` | **138 passed (138)**, exit 0 (was 135 + 3 RED) |
| Payload budget | `pnpm vitest run tests/export-payload-budget.spec.ts --reporter=dot` | **12 passed (12)**, exit 0 |
| Whole suite | `pnpm vitest run --reporter=dot` | **90 files / 4321 tests**, exit 0 |
| Static | `pnpm typecheck && pnpm lint && pnpm knip && pnpm build` | all exit **0** |
| Corpus frozen | `git diff --name-only -- packages/engine/src/sourcemap/map-fixture.ts` | **empty** |
| Scope | `git diff --name-only 398e693..HEAD` | only `export.ts`, `export.spec.ts` |

**Test-count delta, attributed exactly.** 07-21's committed floor was **4317**; this plan reports **4321**, strictly higher, **+4**:

- **+1** the loader-query pin, by id
- **+4** the direction cases (`it.each` with four rows)
- **−1** `src/gen/what?.ts` removed from the "leaves a NON-URL label whole" `it.each`, which dropped from 6 rows to 5

The rewritten two-mode sweep is **+0** — it was rewritten, not added and not deleted, which is what the plan's `<fails_when>` on a *lower* count was watching for.

## G-07-3 / WR-03 — CLOSED IN FULL

| Half | Plan | Commits | What it delivered |
|---|---|---|---|
| First — make it observable | **07-21** | `19713b6`, `84b33c7`, `ce2db42`, `3c2447c` | The `loader-query` corpus case, absorbed at eleven count statements across five files with no assertion loosened, plus the disclosure that `export.spec.ts:909`'s title and tripwire were both false |
| Second — decide and correct | **07-22** | `398e693`, `6aef224`, `0e44102`, `d52d260` | The operator's option-A decision, the two-axis implementation, the true premise sentence, and the direction pinned by id and by shape |

`07-UAT.md` gap `G-07-3` (major) and `07-VERIFICATION.md` finding `WR-03` are both discharged, including WR-03's `human_verification` entry — the direction was put to a human at a `gate="blocking-human"` checkpoint and their answer is on the record with its date.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Phase 07 gap-closure round 2 is complete: 22 of 22 plans.** The tree is clean at **90 files / 4321 tests** with typecheck, lint, knip and build all exit 0.
- Ready for `/gsd-verify-work 07`. Round 2's four gaps are closed; the round-1 deferrals and the operator-open items (W-4, W-6, UAT gap 3, SC5's FP corpora, MAP-01's external half) are untouched by design and remain for the verifier to route.
- **One finding carried forward, deliberately not acted on:** `export.spec.ts`'s byte-budget prose was the only place the marker's length was written as a literal, and it was wrong. Nothing else in the repository restates it — but that is a fact this plan measured rather than one it proved exhaustively, and a sweep for other hardcoded restatements of a constant's value is a reasonable next-round item.
- **One item needs the operator, not the verifier:** coverage entry `D8` — whether quoting option A's defining text by reference discharges "the operator's own withholding sentence". The docblock ships with that quotation either way; only its provenance label is in question.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

## Self-Check: PASSED

- Both modified files exist on disk: `packages/backend/src/store/export.ts`, `packages/backend/src/store/export.spec.ts`
- All four task commits resolve in `git log`: `398e693`, `6aef224`, `0e44102`, `d52d260`
- Every task's `<acceptance_criteria>` was re-run at the end of the plan, including both region-scoped docblock gates (companion prints `1`, negative gate exits `0`)
- The plan-level `<verification>` block was re-run in full: 90 files / 4321 tests, four static gates at exit 0, corpus frozen, store diff scoped to two files
