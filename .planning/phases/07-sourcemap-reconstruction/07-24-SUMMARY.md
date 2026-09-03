---
phase: 07-sourcemap-reconstruction
plan: 24
subsystem: testing
tags: [export, redaction, comments, docblock, vitest, awk-gate, region-scoped-gate]

# Dependency graph
requires:
  - phase: 07-22
    provides: "the two-branch `redactSourceLabelForExport` whose hand-rolled `?`-only cut falsified both passages this plan corrects, and the operator's accepted quoted-by-reference withholding text that had to survive byte-identical two lines from the edit"
  - phase: 07-23
    provides: "the region-scoped comment gate (non-vacuity companion + negative half + positive half, prefilter deliberately INVERTED) reused verbatim here against two regions of a different file, and the recorded whole-suite floor of 90 files / 4321 tests"
provides:
  - "a `redactSourceLabelForExport` docblock whose never-claim-a-false-redaction principle is SCOPED to the label branch that honours it"
  - "`redactUrlForExport`'s shared query marker over a fragment-only URL recorded as a KNOWN AND ACCEPTED EXCEPTION with its cost stated as OPERATOR TRUST AND REVIEWABILITY, not disclosure"
  - "a `sources_verbatim` column comment stating one marker applied per axis, both branches named, both axis directions stated — FRAGMENT narrowed, QUERY widened"
  - "the vocabulary non-growth gate: `grep -c 'query-redacted' export.ts` pinned at the measured 2 and run after BOTH edits"
  - "a recorded whole-suite floor of 90 files / 4321 tests for plan 07-25 to retarget at"
affects: [07-25, export-redaction-policy, redaction-policy-audit]

actuals:
  tokens: 943
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "the region-scoped comment gate, second application: `awk` range brackets the passage, a non-vacuity companion proves the range is non-empty, a negated `grep -qF` proves the false sentence is gone, a positive `grep -c` proves the replacement says the thing"
    - "the vocabulary non-growth gate: a file-wide `grep -c` over a literal marker pinned at its measured value, so prose ABOUT a vocabulary cannot grow that vocabulary"
    - "the adjacent-text preservation gate: two literal counts pinning out-of-scope operator-accepted text that sits two lines from the edit"

key-files:
  created: []
  modified:
    - packages/backend/src/store/export.ts

key-decisions:
  - "Scoped the principle rather than changing the vocabulary — the operator's explicit choice; `redactUrlForExport`, `EXPORT_QUERY_REDACTION` and `observations.url`'s shipped output are byte-unchanged"
  - "Referred to the marker through `{@link EXPORT_QUERY_REDACTION}` in all new prose so the file-wide literal count stayed at the measured 2"
  - "Stated BOTH axis directions in the column comment — deleting the false summary without naming the widening would have left the reader with no description at all"

patterns-established:
  - "An exception recorded rather than defended: name the input shape, name the file that pins it, and state the cost — an exception labelled 'accepted' with no stated cost is an admission, not a record"
  - "A scoped principle must be accompanied by the exception it now excludes; scoping alone signals that an exception exists and hides which"

requirements-completed: [MAP-07, UI-05]

coverage:
  - id: D1
    description: "The never-claim-a-false-redaction principle in `redactSourceLabelForExport`'s docblock is SCOPED to the label branch that honours it, rather than stated of the export as a whole (G-07-7)."
    requirement: "MAP-07"
    verification:
      - kind: other
        ref: "awk '/The redacted form of one manifest/,/^export function redactSourceLabelForExport/' export.ts | grep -c 'NO NEW VOCABULARY' — 1 (non-vacuity companion)"
        status: pass
      - kind: other
        ref: "! awk '<same range>' export.ts | grep -qF 'A redaction that reports withholding' — exit 0, RED 1 -> GREEN 0"
        status: pass
      - kind: other
        ref: "awk '<same range>' export.ts | grep -c 'NOT OF THE EXPORT AS A WHOLE' — 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "`redactUrlForExport`'s shared query marker over a fragment-only URL is recorded as a KNOWN AND ACCEPTED EXCEPTION, with the reason stated: it discloses LESS than the truth, so the cost is operator trust and reviewability, not disclosure (G-07-7)."
    requirement: "MAP-07"
    verification:
      - kind: other
        ref: "awk '<docblock range>' export.ts | grep -c 'KNOWN AND ACCEPTED EXCEPTION' — RED 0 -> GREEN 1"
        status: pass
      - kind: other
        ref: "awk '<docblock range>' export.ts | grep -c 'OPERATOR TRUST AND REVIEWABILITY' — RED 0 -> GREEN 1"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts:883-887 — the fragment-only URL case pinning `webpack:///./src/app.js#L5`, re-run unmodified: Tests 138 passed (138)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The `sources_verbatim` column comment describes what `redactSourceLabelForExport` now does — the same MARKER applied per AXIS, both branches named — and no longer calls it one redactor applied more narrowly (G-07-6)."
    requirement: "UI-05"
    verification:
      - kind: other
        ref: "awk '/WHAT DOES NOT SURVIVE/,/name: \"sources_verbatim\"/' export.ts | grep -c 'WHAT DOES NOT SURVIVE' — 1 (non-vacuity companion)"
        status: pass
      - kind: other
        ref: "! awk '<column range>' export.ts | grep -qF 'the SAME redactor' — exit 0, RED 1 -> GREEN 0"
        status: pass
      - kind: other
        ref: "awk '<column range>' export.ts | grep -c 'redactUrlForExport' — 1, the delegating branch named rather than implied"
        status: pass
    human_judgment: false
  - id: D4
    description: "The column comment states the axis directions correctly: the FRAGMENT axis narrowed to protocol-shaped labels, the QUERY axis WIDENED to every label."
    requirement: "UI-05"
    verification:
      - kind: other
        ref: "awk '<column range>' export.ts | grep -c 'WIDENED' — RED 0 -> GREEN 1"
        status: pass
      - kind: other
        ref: "awk '<column range>' export.ts | grep -c 'NARROWED' — RED 0 -> GREEN 1"
        status: pass
    human_judgment: false
  - id: D5
    description: "`redactUrlForExport`, `EXPORT_QUERY_REDACTION`, `isProtocolShapedLabel`, `redactSourceLabelForExport`'s body and `observations.url`'s shipped output are all byte-unchanged, and `export.spec.ts` is unmodified."
    requirement: "MAP-07"
    verification:
      - kind: other
        ref: "grep -c 'query-redacted' export.ts — 2 before, 2 after, checked after BOTH edits (vocabulary non-growth gate)"
        status: pass
      - kind: other
        ref: "git diff --unified=0 2e8478b -- export.ts | every +/- line matches '^[+-]( \\*|    // )'; no line contains url.search / label.indexOf / export const / export function / redact:"
        status: pass
      - kind: other
        ref: "git diff --name-only 2e8478b -- export.spec.ts 07-UI-SPEC.md — empty"
        status: pass
    human_judgment: false
  - id: D6
    description: "The operator's accepted quoted-by-reference withholding text at `export.ts:291-295` survived byte-identical, two lines from the rewritten passage."
    verification:
      - kind: other
        ref: "grep -cF 'A non-protocol label is cut at the first' export.ts — 1 before, 1 after"
        status: pass
      - kind: other
        ref: "grep -cF 'in the words the' export.ts — 1 before, 1 after"
        status: pass
    human_judgment: false
  - id: D7
    description: "No target-controlled string reaches any label, dialog or download name on the manifest-export path; the `sources` label appears only as a manifest COLUMN governed by the export redaction policy, never as a control label (07-UI-SPEC.md, long-text / manifest-export)."
    requirement: "UI-05"
    verification: []
    human_judgment: true
    rationale: "Re-asserted, not re-tested: this plan is comment-only and changes no export path. The property's own evidence lives in the R6 filename-allowlist assertions cited by the UI-SPEC row, outside this plan's diff."
  - id: D8
    description: "The repository gate holds at 07-23's recorded floor with no test added: 90 files / 4321 tests, and typecheck / lint / knip / build all exit 0."
    verification:
      - kind: unit
        ref: "pnpm vitest run --reporter=dot — Test Files 90 passed (90), Tests 4321 passed (4321), exit 0"
        status: pass
      - kind: other
        ref: "pnpm typecheck && pnpm lint && pnpm knip && pnpm build — all exit 0"
        status: pass
    human_judgment: false

# Metrics
duration: 6 min
completed: 2026-09-03
status: complete
---

# Phase 07 Plan 24: Scope the Redaction Principle and Restate the Column Comment Summary

**The never-claim-a-false-redaction principle is now scoped to the label branch that honours it, the delegated branch's shared query marker over a fragment-only URL is recorded as a known and accepted exception with its cost named as operator trust and reviewability rather than disclosure, and the `sources_verbatim` column comment states one marker applied per axis with both branches and both axis directions — all six region probes flipped RED→GREEN on exactly the edit, marker count still 2, 4321 tests unchanged.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-03T09:05:41Z
- **Completed:** 2026-09-03T09:11:33Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- **G-07-7 closed.** `export.ts`'s principle no longer states unqualified what only one of two branches keeps. It names the label branch first, then states itself, then says the scoping is deliberate and points at the exception below.
- **The exception is recorded rather than derived.** A new headed paragraph names `redactUrlForExport`'s `?`-OR-`#` cut, the fragment-only input shape it mis-marks, the spec file that pins it as EXPECTED, and the reason it is accepted: the marker discloses LESS than the truth, so the cost is **operator trust and reviewability, not disclosure. Nothing leaks.** It also records why it was not repaired — a second vocabulary word plus a change to `observations.url`'s shipped output, which the operator declined as needing its own round.
- **G-07-6 closed.** The `sources_verbatim` column comment — the first thing a redaction-policy audit reads — stops describing pre-07-22 behaviour. It names one MARKER applied PER AXIS, both branches explicitly, and both axis directions in the directions they actually moved: FRAGMENT narrowed, QUERY **widened**.
- **The vocabulary did not grow while the prose about it was rewritten.** `grep -c 'query-redacted'` printed 2 at HEAD (declaration `:178`, illustrative use `:265`) and prints 2 now, checked after both edits. All new prose refers to the marker through `{@link EXPORT_QUERY_REDACTION}`.
- **Zero executable change.** Every `+`/`-` line across both commits is a ` * ` docblock line or a `    // ` column-comment line; no diff line contains `url.search`, `label.indexOf`, `export const`, `export function` or `redact:`.
- Repository gate green at 07-23's recorded floor with no test added: **90 files / 4321 tests**, four static gates at exit 0.

## Task Commits

1. **Task 1: Scope the principle to its branch, and record the exception the other branch is** — `3276a82` (docs)
2. **Task 2: Restate the column comment per axis, then run the repository gate** — `8d2f3fc` (docs)

## Files Created/Modified

- `packages/backend/src/store/export.ts` — two comment passages rewritten: `redactSourceLabelForExport`'s docblock principle (+ a new exception paragraph), and the `sources_verbatim` entry's column-comment conclusion in `EXPORT_COLUMNS`. Nothing executable moved.

## Region-Probe Outputs, Before and After

### Task 1 — the `redactSourceLabelForExport` docblock

Range: `awk '/The redacted form of one manifest/,/^export function redactSourceLabelForExport/'`. This is 07-22's own anchor pair, reused rather than re-derived.

| Probe | Role | Before (HEAD `2e8478b`) | After | Direction |
|---|---|---|---|---|
| `grep -c 'NO NEW VOCABULARY'` | non-vacuity companion | **1** | **1** | must stay non-empty ✓ |
| `grep -cF 'A redaction that reports withholding'` | negative half | **1** | **0** | RED → GREEN ✓ |
| `grep -c 'NOT OF THE EXPORT AS A WHOLE'` | positive half (scoping) | **0** | **1** | RED → GREEN ✓ |
| `grep -c 'KNOWN AND ACCEPTED EXCEPTION'` | positive half (exception) | **0** | **1** | RED → GREEN ✓ |
| `grep -c 'OPERATOR TRUST AND REVIEWABILITY'` | positive half (the REASON) | **0** | **1** | RED → GREEN ✓ |

The comment-stripping prefilter is **deliberately INVERTED** from round 2's rule, carried by name from 07-23: the comment IS the subject here, so stripping comments would leave a gate that can never fail.

### Task 2 — the `sources_verbatim` column comment

Range: `awk '/WHAT DOES NOT SURVIVE/,/name: "sources_verbatim"/'`.

| Probe | Role | Before | After | Direction |
|---|---|---|---|---|
| `grep -c 'WHAT DOES NOT SURVIVE'` | non-vacuity companion | **1** | **1** | must stay non-empty ✓ |
| `grep -cF 'the SAME redactor'` | negative half | **1** | **0** | RED → GREEN ✓ |
| `grep -c 'WIDENED'` | positive half (the missed bullet) | **0** | **1** | RED → GREEN ✓ |
| `grep -c 'NARROWED'` | positive half (the other axis) | **0** | **1** | RED → GREEN ✓ |
| `grep -c 'redactUrlForExport'` | positive half (branch named) | 0 in range | **1** | RED → GREEN ✓ |

### The vocabulary non-growth gate (file-wide, run after BOTH edits)

| Check | Before | After task 1 | After task 2 |
|---|---|---|---|
| `grep -c 'query-redacted' packages/backend/src/store/export.ts` | **2** | **2** | **2** |

The two occurrences are unchanged and are the two the plan measured: the declaration at `:178` (`export const EXPORT_QUERY_REDACTION = "<query-redacted>";`) and one illustrative use at `:265` (`src/components/Button<query-redacted>`). No new prose spells the marker.

### The adjacent-text preservation gate

The operator's quoted-by-reference withholding text at `export.ts:291-295` — accepted as discharging 07-22's task-1 criterion, out of this round's scope, and **two lines above** the passage task 1 rewrote.

| Check | Before | After |
|---|---|---|
| `grep -cF 'A non-protocol label is cut at the first'` | **1** | **1** |
| `grep -cF 'in the words the'` | **1** | **1** |

Byte-identical, in the literal sense — not re-flowed.

## The Three Rewritten Passages, Before and After

### 1. The principle (task 1) — `export.ts`, formerly `:297-299`

**Before:**

```
 * A redaction that reports withholding something that was never there is not a
 * stronger redaction. It is an unreliable one, and an operator who finds one
 * marker they can prove is false has no reason to trust the next.
```

**After:**

```
 * THAT PRINCIPLE IS STATED OF THIS BRANCH, NOT OF THE EXPORT AS A WHOLE. On the
 * label branch this function decides, a redaction that reports withholding
 * something that was never there is not a stronger redaction. It is an
 * unreliable one, and an operator who finds one marker they can prove is false
 * has no reason to trust the next. The scoping is deliberate: the delegated
 * branch does NOT honour it, and that exception is recorded immediately below
 * rather than papered over by a sentence that covers it silently.
```

### 2. The exception paragraph (task 1) — new, `export.ts:305-321`

**Before:** did not exist. **After:**

```
 * THE KNOWN AND ACCEPTED EXCEPTION, ON THE DELEGATED BRANCH.
 * {@link redactUrlForExport} cuts at the first `?` OR `#` and appends
 * {@link EXPORT_QUERY_REDACTION} for either hit, so a fragment-only URL such as
 * `webpack:///./src/app.js#L5` exports with a query marker over a value that has
 * no query axis. `export.spec.ts` pins exactly that as EXPECTED, and the column
 * comment on `sources_verbatim` names the same output as the wrong thing LO-04's
 * fix removed on the path branch. It is PRE-EXISTING `redactUrlForExport`
 * behaviour and it is `observations.url`'s shipped behaviour on every row it has
 * ever written.
 *
 * IT IS ACCEPTED RATHER THAN DEFENDED, and the cost is named so nobody has to
 * re-derive it: the marker discloses LESS than the truth, so what it costs is
 * OPERATOR TRUST AND REVIEWABILITY, not disclosure. Nothing leaks. Making the
 * marker true on both branches needs a second vocabulary word and a change to
 * `observations.url`'s shipped output — the operator declined that here as a
 * decision needing its own round rather than a drive-by (07-UAT.md G-07-7,
 * 2026-09-03).
```

### 3. The column comment conclusion (task 2) — `export.ts`, formerly `:424-427`

**Before:**

```
    // Hence {@link redactSourceLabelForExport}: the SAME redactor, the SAME
    // marker, applied where its subject exists. Not an exemption — a narrowed
    // application, which is a different thing and is argued in full at that
    // function.
```

**After:**

```
    // Hence {@link redactSourceLabelForExport}: the SAME MARKER, applied PER
    // AXIS. A protocol-shaped label DELEGATES to `redactUrlForExport` and is cut
    // on `?` or `#`; every other label is cut by hand at its first `?` and keeps
    // its `#` tail. Two cuts with different semantics, not one redactor reused —
    // and the two axes moved in OPPOSITE directions: the FRAGMENT axis NARROWED,
    // to protocol-shaped labels only, while the QUERY axis WIDENED, to every
    // label. Still not a per-column exemption, and the argument in full — with
    // the delegated branch's known exception — is at that function.
```

The `WHAT DOES NOT SURVIVE` paragraph above it and the `{ name: "sources_verbatim", redact: redactSourceLabelForExport },` entry below it are unchanged.

## The Pinned Evidence, Cited Rather Than Edited

`packages/backend/src/store/export.spec.ts:877-897` is the `it.each` block whose **second case, lines 883-887**, pins the fragment-only URL:

```ts
    [
      "webpack:// with a real fragment",
      "webpack:///./src/app.js#L5",
      `webpack:///./src/app.js${EXPORT_QUERY_REDACTION}`,
    ],
```

That is the evidence the new exception paragraph names by file. It was read and cited; it was **not edited**. `git diff --name-only 2e8478b -- packages/backend/src/store/export.spec.ts` returns empty, and the spec re-runs at **138 tests passed (138)**, exit 0 — the count measured at HEAD.

## Verification Results

| Gate | Command | Result |
|---|---|---|
| Owning spec | `pnpm vitest run packages/backend/src/store/export.spec.ts --reporter=dot` | **`Test Files 1 passed (1)` / `Tests 138 passed (138)`**, exit 0, 0.40s |
| Whole suite | `pnpm vitest run --reporter=dot` | **`Test Files  90 passed (90)` / `Tests  4321 passed (4321)`**, exit 0, 15.06s |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Knip | `pnpm knip` | exit 0 |
| Build | `pnpm build` | exit 0 |
| Scope | `git diff --name-only` | exactly `packages/backend/src/store/export.ts` |
| Fences | `git diff --name-only 2e8478b -- export.spec.ts 07-UI-SPEC.md` | empty |
| Diff shape | every `+`/`-` line matches `^[+-]( \*\|    // )` | pass |
| Diff tokens | no `+`/`-` line contains `url.search`, `label.indexOf`, `export const`, `export function`, `redact:` | pass |

### The floor used, and where it was read

**Floor: 90 files / 4321 tests, read from `.planning/phases/07-sourcemap-reconstruction/07-23-SUMMARY.md`** (its "Verification Results" table and its explicit "07-24's floor is 90 files / 4321 tests, recorded not copied" statement). Measured, not copied forward from this plan's prose.

**This plan adds no test**, so the result equals the floor exactly: **4321, not more**. Verbatim vitest summary lines, as **07-25's floor**:

```
 Test Files  90 passed (90)
      Tests  4321 passed (4321)
```

Any count above 4321 in 07-25 must be attributable to cases 07-25 itself authorises.

## Decisions Made

- **Scoped the principle; did not touch the vocabulary.** The operator explicitly chose the comment-scoping repair over the vocabulary change, declining the latter as a decision needing its own round. `redactUrlForExport`, `EXPORT_QUERY_REDACTION`, `isProtocolShapedLabel`, `redactSourceLabelForExport`'s body and `observations.url`'s shipped output are all byte-unchanged.
- **Named the cost, not just the label.** An exception recorded as merely "accepted" is an admission. The paragraph states what it costs — operator trust and reviewability — and states what it does not cost: nothing leaks, because the marker discloses less than the truth.
- **Stated both axis directions in the column comment.** G-07-6's second `missing` bullet asks for the direction, not just the deletion of the false phrase. A comment that stated only the narrowing would be as incomplete as the one that stated only the widening.
- **Referred to the marker through `{@link}` throughout.** This is what keeps the file-wide literal count at 2 and makes the adjacent `NO NEW VOCABULARY` paragraph's "spelt in exactly one place" claim mechanically true rather than merely asserted.

## Deviations from Plan

None — plan executed exactly as written. All six region probes, the marker count, both adjacent-text counts and both fences read exactly the values the plan predicted at HEAD, and every one flipped in the predicted direction.

## Deferred Items

**`07-UI-SPEC.md` `long-text / manifest-export` names the wrong governing function.** Line 851's resolution text says the `sources` label appears as a manifest column "where `redactUrlForExport` governs it". Since 07-16 and 07-22 the governing function for that column is `redactSourceLabelForExport`; `redactUrlForExport` governs only its protocol-shaped branch. This is **the same defect class as G-07-6, one artifact removed** — a planning document rather than source.

- **Not fixed here, by design.** `07-UI-SPEC.md` is outside this plan's `files_modified` and outside every gap's `artifacts` list, and this plan's gates assert it is unmodified (`git diff --name-only 2e8478b -- …/07-UI-SPEC.md` — empty). The plan-checker adjudicated the deferral correct.
- **Suggested owner:** whoever next edits `07-UI-SPEC.md`. The correction is one phrase: `redactUrlForExport` → `redactSourceLabelForExport`. The property the row asserts — no target-controlled string reaches a label, dialog or download name; the `sources` label appears only as a column — is unchanged and is re-asserted by this plan.

## Known Stubs

None. This plan wrote no code, added no test, skipped no test, and left no `<verify>` unrun — all ten gate commands above were executed and their outputs are recorded verbatim.

## Threat Flags

None. This plan introduces no network endpoint, no auth path, no file access pattern and no schema change. `SCHEMA_VERSION` is untouched at 9. The one synthetic label shape named in new prose (`webpack:///./src/app.js#L5`) already existed as an `export.spec.ts` fixture; no captured body, scanned target or operator datum entered the source (T-07-110, disposition `accept`).

The three `high`-severity rows of this plan's threat register are each discharged by a runnable gate rather than by assertion:

- **T-07-105** (principle stated of the whole export, repudiation) → scoped by task 1; gated by the region-scoped negative half plus two positive halves.
- **T-07-106** (vocabulary growing inside a comment edit) → gated by the file-wide marker count pinned at 2, run after both edits.
- **T-07-108** (overreach removing the query marker from the delegated branch) → gated by the unmodified 138-test spec run, the `url.search` diff-token blocklist and the empty `export.spec.ts` fence.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **G-07-6 closed** at `8d2f3fc`. **G-07-7 closed** at `3276a82`.
- **Floor for 07-25: 90 files / 4321 tests**, a recorded measurement, verbatim above.
- Working tree clean apart from this plan's committed work; `workflow.use_worktrees` is false, so 07-25 continues on this same tree at `8d2f3fc`.
- **`MAP-06` remains correctly incomplete** — 07-25 also declares it, and the shared-ID gate holds it until 07-25 produces its SUMMARY. This plan declares `MAP-07` and `UI-05`.
- One deferred item carried forward (the `07-UI-SPEC.md` wording drift above), recorded with its suggested owner and deliberately not fixed.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-03*

## Self-Check: PASSED

- `packages/backend/src/store/export.ts` — FOUND on disk.
- `.planning/phases/07-sourcemap-reconstruction/07-24-SUMMARY.md` — FOUND on disk.
- Commit `3276a82` — FOUND in `git log --oneline --all`.
- Commit `8d2f3fc` — FOUND in `git log --oneline --all`.
- All six region probes re-run post-commit and re-read GREEN: non-vacuity companions 1 and 1, negative halves 0 and 0, `WIDENED` 1, marker count 2.
