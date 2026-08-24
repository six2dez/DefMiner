---
phase: 01-skeleton-persistence-compatibility
plan: 22
subsystem: testing
tags: [vitest, mutation-testing, gate-falsifiability, python, evidence-discipline]

requires:
  - phase: 01-skeleton-persistence-compatibility (plan 01-17)
    provides: "the WR-21 no-version-literal gate in tests/pins.spec.ts, and the tracer header sentence claiming it had been observed failing"
  - phase: 01-skeleton-persistence-compatibility (plan 01-14, 01-17)
    provides: "the committed run directories whose grammar-reachability.txt carries the padded_segments_reached row"
provides:
  - "versionLiterals — the WR-21 detection predicate lifted out as a pure exported function, with its failing path executed on synthetic text and on the real script's own bytes"
  - "a four-fixture mutation surface that makes an inert predicate detectable: all five enumerated breaks now go RED with named assertion titles"
  - "a MEASURED correction to 01-REVIEW.md WR-25: three of the five breaks it lists were already loud before the lift, and only two were silent"
  - "padded_segments_reached with the missing any() conjunct, so a REACHED note cannot be written off an empty generator"
  - "a dated pointer amendment on README-01-17.md that is precise about what is and is not retrospectively in doubt"
affects: [phase-verification, phase-review, future tracer runs, any future gate written in this repository]

actuals:
  tokens: 26000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A gate's detection predicate is a pure exported function whose failing path executes in the same file — now including the WR-21 gate, which was the exception"
    - "A file gate is proven against the actual bytes it reads, by planting into the real text in memory, not only against a hand-written fixture"
    - "A mutation matrix is executed as PAIRS — the same break applied before and after the change — so the contrast is measured rather than cited"

key-files:
  created: []
  modified:
    - tests/pins.spec.ts
    - scripts/phase1/tracer-e2e.sh
    - .planning/phases/01-skeleton-persistence-compatibility/results/runs/README-01-17.md

key-decisions:
  - "Executed the before-half of the mutation matrix rather than citing 01-REVIEW.md for it — and it changed the finding: three of the five enumerated breaks were ALREADY loud, because the five four-component loopback addresses the gate must not flag are exactly what makes a mis-set component-count comparison fail."
  - "Added a fourth fixture (text with no dotted-numeric run at all) beyond the plan's three. Without it the dropped-`?? []` break stays silent AFTER the lift as well as before it, which would have left one of the five breaks undetected."
  - "Kept the existing `bool(raw_rows)` guard and added `any(\"?\" in r ...)` rather than replacing it — the two catch different empty cases."
  - "No live Caido cycle. The predicate is pure and its empty-generator branch is structurally unreachable on a passing live run, so standalone execution proves strictly more than a Caido cycle could."
  - "Stated that `auditPatternUse` in observations.spec.ts is pure but MODULE-LOCAL, not exported — the plan and the review both described all three analog gates as exporting."

patterns-established:
  - "Pattern: a mutation matrix is a set of PAIRS, and the before-half is executed. Executing only the after-half proves the new assertions fire, which nobody doubts."
  - "Pattern: when a review's enumerated finding does not reproduce, the measured result is recorded as a correction rather than smoothed over."

requirements-completed: [STORE-03]

coverage:
  - id: D1
    description: "The WR-21 gate's detection predicate is a pure exported function whose FAILING path executes on every run of the suite — on synthetic text, on the two shapes that must survive, on text with nothing to find, and on the real script's own bytes with a literal appended in memory"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: 'tests/pins.spec.ts#the predicate DETECTS a version literal in synthetic text — the true branch that had never run'
        status: pass
      - kind: unit
        ref: 'tests/pins.spec.ts#the predicate IGNORES the two shapes this script cannot do without: a four-component loopback address and a two-component interval'
        status: pass
      - kind: unit
        ref: 'tests/pins.spec.ts#the predicate returns EMPTY rather than throwing on text carrying no dotted-numeric run at all'
        status: pass
      - kind: unit
        ref: 'tests/pins.spec.ts#the predicate DETECTS a literal planted into the REAL script''s text — the load-bearing one'
        status: pass
    human_judgment: false
  - id: D2
    description: "An inert predicate is detectable: each of the five breaks 01-REVIEW.md WR-25 enumerates drives named assertions RED after the lift, executed one break at a time and paired with the same break executed against the pre-lift inline filter"
    requirement: "STORE-03"
    verification:
      - kind: other
        ref: "five-break mutation matrix, executed as five PAIRS — ten `pnpm vitest run tests/pins.spec.ts` runs, all pasted below"
        status: pass
    human_judgment: false
  - id: D3
    description: "The file-scan direction goes red on a literal genuinely planted on disk, with its remedy message, and the script is restored byte-clean afterwards"
    requirement: "STORE-03"
    verification:
      - kind: other
        ref: "on-disk planted-literal run + `git diff --exit-code -- scripts/phase1/tracer-e2e.sh`"
        status: pass
    human_judgment: false
  - id: D4
    description: "The tracer's header claim of an observed failure cites the assertion that performs it, by file and test name, and contains no version literal"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: 'tests/pins.spec.ts#names no Caido version literal anywhere, COMMENTS INCLUDED'
        status: pass
    human_judgment: false
  - id: D5
    description: "`padded_segments_reached` cannot report REACHED off a generator that yielded nothing, and the genuine reached / not-reached results are unchanged"
    requirement: "STORE-03"
    verification:
      - kind: other
        ref: "standalone `python3` execution of the predicate over four synthetic row sets, pre-fix and post-fix, both pasted"
        status: pass
    human_judgment: false
  - id: D6
    description: "The runs that predate the IN-21 fix are qualified by a dated pointer amendment that is precise about what is and is not in doubt, and no run directory is modified"
    verification:
      - kind: other
        ref: "`git diff --exit-code -- '.planning/phases/01-skeleton-persistence-compatibility/results/runs/2026*'` clean; README diff is a pure append"
        status: pass
    human_judgment: true
    rationale: "Whether the amendment's account of what the committed runs' note does and does not qualify is precise — rather than overstated or understated — is a judgment about prose accuracy that no assertion can make. The mechanical half (append-only, no run directory touched) is proven; the wording is not."

duration: 13 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 22: The Gate That Could Not Fail, and the Note That Measured Nothing — Summary

**The WR-21 detection predicate now executes its true branch on the real script's own bytes and goes red on all five enumerated breaks; `padded_segments_reached` can no longer write REACHED off an empty generator — and executing the mutation matrix's before-half rather than citing it corrected the review's finding from five silent breaks to two.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-08-24T09:32:00Z
- **Completed:** 2026-08-24T09:45:50Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- The WR-21 gate's detection predicate is lifted out as the pure exported `versionLiterals`, with the file scan as its only caller, and its failing path now executes on **every run** — including against the real script's own text with a literal appended in memory.
- All five breaks 01-REVIEW.md WR-25 enumerates now drive named assertions RED. Executed one break at a time, ten runs, each post-lift RED paired with the same break executed pre-lift.
- **The before-half changed the finding.** Three of the five breaks were already loud before the lift. The review's claim that all five "stay green forever" is wrong for `=== 4`, `>= 4` and `search`-instead-of-`match`, and wrong for an instructive reason. Recorded below rather than smoothed over.
- A **fourth** fixture was added beyond the plan's three, because without it the dropped-`?? []` break stays silent after the lift too.
- `padded_segments_reached` gained the missing `any("?" in r ...)` conjunct, proven by standalone `python3` execution over the exact row set a live run cannot produce.
- `README-01-17.md` carries a dated pointer amendment. No run directory was touched.

## Task Commits

1. **Task 1 (tracer): the detection predicate, executed in both directions against the real file** — `d2e1907` (test)
2. **Task 2: a reachability note that cannot report a measurement it did not take** — `5f2d0bd` (fix)
3. **Follow-up within Task 1's file: comment fixture-count correction** — `502bbce` (docs)

## Files Created/Modified

- `tests/pins.spec.ts` — `versionLiterals` exported; four predicate fixtures; the scan now calls the predicate; the non-vacuity assertions carry a statement of what they cannot cover.
- `scripts/phase1/tracer-e2e.sh` — header claim rewritten to cite the assertion that performs the failing path; `padded_segments_reached` gained the `any()` conjunct.
- `.planning/.../results/runs/README-01-17.md` — dated pointer amendment appended, nothing above it rewritten.

---

# TASK 1 — THE WR-21 DETECTION PREDICATE

## `versionLiterals` and its docblock, as committed

```ts
/**
 * The version literals in raw `text`: maximal dotted-numeric runs of EXACTLY THREE
 * components. `127.0.0.1` is four and `0.25` is two, and neither is one.
 *
 * PURE — takes text, returns hits — and EXPORTED so its FAILING path can be executed
 * against a fixture rather than argued about. That is the convention this repository
 * already holds and which this gate was the exception to:
 * `packages/backend/src/outbound-prohibition.spec.ts` and
 * `packages/backend/src/store/error-redaction.spec.ts` each export a pure
 * `auditSource`, and `packages/backend/src/store/observations.spec.ts` keeps a pure
 * `auditPatternUse` (module-local, not exported — measured 2026-08-24, stated here so
 * a reader is not sent looking for an export that is not there). All three run their
 * failing path on a synthetic fixture in their own file.
 *
 * The file scan below is this function's ONLY caller. Lifting it out changed the
 * gate's TESTABILITY and not one thing about its behaviour.
 */
export function versionLiterals(text: string): string[] {
  return (text.match(/\d+(?:\.\d+)+/g) ?? []).filter(
    (run) => run.split(".").length === 3,
  );
}
```

**One measured correction inside that docblock.** The plan and 01-REVIEW.md both describe all three analog gates as exporting a pure function. `auditPatternUse` at `packages/backend/src/store/observations.spec.ts:1773` is declared `function auditPatternUse(...)` — pure, and module-local. Checked, not assumed:

```
$ grep -n "auditPatternUse" packages/backend/src/store/observations.spec.ts | head -1
1773:function auditPatternUse(file: string, source: string): PatternFinding[] {
```

The convention it belongs to is "pure function, failing path executed on a fixture in its own file", which it does hold. The docblock says so in those terms rather than repeating the claim it inherited.

## The scan, after the lift

```ts
  it("names no Caido version literal anywhere, COMMENTS INCLUDED", () => {
    const hits = versionLiterals(tracerText);
```

`git diff -U0` over the whole file removes exactly five lines — the `DOTTED_NUMERIC` const, its comment, and the three lines of the inline filter:

```
-  /** Maximal dotted-numeric runs, e.g. "0.57.1", "127.0.0.1", "0.25". */
-  const DOTTED_NUMERIC = /\d+(?:\.\d+)+/g;
-    const hits = (tracerText.match(DOTTED_NUMERIC) ?? []).filter(
-      (run) => run.split(".").length === 3,
-    );
```

**The two non-vacuity assertions are byte-identical** — no line inside either was removed, which the scoped diff above shows directly.

## The four fixtures, as committed and passing

### 1. The true branch on synthetic text — the branch that had never run anywhere

```ts
  it("the predicate DETECTS a version literal in synthetic text — the true branch that had never run", () => {
    expect(
      versionLiterals(`# the build this run was taken on: Caido ${PLANTED}`),
      `versionLiterals did not return ${PLANTED} from a line that plainly names it. The scan above is therefore inert and reports clean on any input — repair the predicate, do not relax this assertion.`,
    ).toEqual([PLANTED]);
  });
```

### 2. The false branch on the two shapes that must survive

```ts
  it("the predicate IGNORES the two shapes this script cannot do without: a four-component loopback address and a two-component interval", () => {
    expect(
      versionLiterals(
        "sleep 0.25; curl -sS http://127.0.0.1:8972/defminer-tracer-fixture.js",
      ),
      "versionLiterals flagged a loopback address or a sleep interval as a version literal. Tightening the pattern to catch more must not swallow either: the tracer cannot do without 127.0.0.1, and 0.25 is a duration. A gate that fails on those is a gate somebody will delete.",
    ).toEqual([]);
  });
```

### 3. The FOURTH fixture — added beyond the plan, and here is why

```ts
  it("the predicate returns EMPTY rather than throwing on text carrying no dotted-numeric run at all", () => {
    // Not redundant with the assertion above: that one feeds it text whose runs must
    // be REJECTED, this one feeds it text with no runs to reject. `String.match` with
    // a /g pattern returns null, not [], so a predicate that drops the `?? []`
    // fallback passes every other fixture here and throws the day the tracer stops
    // carrying a loopback address.
    expect(
      versionLiterals("# a header sentence carrying no numbers whatsoever"),
      "versionLiterals did not survive text with no dotted-numeric run — the `?? []` fallback is gone. Restore it: the scan must report clean on an input with nothing to find, not crash on it.",
    ).toEqual([]);
  });
```

The plan specified three fixtures. With only those three, **break B3 (dropping `?? []`) stays green after the lift as well as before it** — every other fixture feeds the predicate text that contains at least one dotted-numeric run, so `match` never returns `null` and the missing fallback is never reached. One of the five breaks would have remained undetected while this SUMMARY claimed all five were closed. Logged as a deviation below.

### 4. The load-bearing one — planted into the REAL script's text

```ts
  it("the predicate DETECTS a literal planted into the REAL script's text — the load-bearing one", () => {
    // THIS IS THE ONE THAT PROVES THE GATE RATHER THAN THE PREDICATE, and it is why
    // the three fixtures above are not enough on their own. They prove the rule
    // against a hand-written string — the author's idea of the input. This one plants
    // the literal into the bytes the scan ACTUALLY reads, in memory, so a change to
    // the script's shape that defeats the scan is a visible failure rather than a
    // theoretical one. A later reader seeing four similar assertions should delete
    // none of them.
    //
    // ONE COUPLING, STATED: this fixture assumes the file on disk is CLEAN, because
    // it appends its own literal to that file's text and expects exactly one hit. A
    // literal genuinely planted on disk makes it red too, with a two-element array —
    // measured 2026-08-24 while proving the scan direction. That is a second alarm on
    // a real defect, not a false one; the assertion above is the one whose remedy
    // message names what to do about it.
    expect(
      versionLiterals(
        `${tracerText}\n# the build this run was taken on: Caido ${PLANTED}\n`,
      ),
      `A ${PLANTED} appended to the real text of ${TRACER} was NOT returned by versionLiterals. The scan above cannot go red on the actual file, whatever it does on a fixture — repair the predicate.`,
    ).toEqual([PLANTED]);
  });
```

## What the non-vacuity assertions do NOT cover, now stated in the block

```ts
    // WHAT THIS PAIR DOES NOT COVER, STATED BECAUSE AN UNSTATED LIMIT IS THE ONE A
    // READER ASSUMES AWAY. They prove the right file was read and is not empty. They
    // CANNOT see an inert predicate: `versionLiterals` could be broken to return the
    // empty array on every input and both assertions below would still pass. That is
    // exactly how this gate stayed green while its true branch had never run
    // (01-REVIEW.md WR-25); the four predicate fixtures further down are what closed
    // it, and neither assertion here is a substitute for them.
```

---

## THE FIVE-BREAK MUTATION MATRIX, AS FIVE EXECUTED PAIRS

Baseline before anything was touched:

```
$ pnpm vitest run tests/pins.spec.ts
 ✓ tests/pins.spec.ts (34 tests) 4ms
 Test Files  1 passed (1)
      Tests  34 passed (34)
```

Every run below is `pnpm vitest run tests/pins.spec.ts`. Each break was applied alone and restored before the next.

### THE HEADLINE RESULT, AND IT IS NOT THE ONE THE PLAN EXPECTED

**Only TWO of the five breaks were silent. Three were already loud.** The plan required the before-half to be executed rather than cited precisely so that a wrong prediction would surface, and it did. `scripts/phase1/tracer-e2e.sh` carries five four-component `127.0.0.1` — the shape the gate must NOT flag — and that is exactly what makes a mis-set component-count comparison produce a false positive and go red. The finding of WR-25 stands unchanged: **the true branch never executed.** What is corrected is the claim that all five breaks were undetectable.

| # | Break | BEFORE (inline filter) | AFTER (lifted predicate) | Was it silent? |
|---|-------|------------------------|--------------------------|----------------|
| B1 | component count `=== 4` | **RED** — 1 failed / 33 passed | **RED** — 4 failed / 34 passed | no — loud, but for the wrong reason |
| B2 | component count `>= 4` | **RED** — 1 failed / 33 passed | **RED** — 4 failed / 34 passed | no — loud, but for the wrong reason |
| B3 | `?? []` fallback dropped | **GREEN** — 34 passed | **RED** — 1 failed / 37 passed | **YES** |
| B4 | `search()` instead of `match()` | **RED** — TypeError, 1 failed | **RED** — TypeError, 5 failed | no |
| B5 | pattern requires a leading letter | **GREEN** — 34 passed | **RED** — 2 failed / 36 passed | **YES** |

B5 is the dangerous one and the one the finding is really about: the gate stays green, the message stays plausible, and the rule silently stops being enforced. B3 is silent on today's input and is a latent crash on tomorrow's. B1, B2 and B4 fail loudly — B1/B2 with an assertion accusing `127.0.0.1` of being a version literal, B4 with a `TypeError` — so a author making any of those three learns immediately.

---

### PAIR B1 — component count compared against FOUR

**BEFORE — applied to the CURRENT INLINE FILTER, pre-lift:**

```
--- applied diff ---
-      (run) => run.split(".").length === 3,
+      (run) => run.split(".").length === 4,
--- pnpm vitest run tests/pins.spec.ts ---
     × names no Caido version literal anywhere, COMMENTS INCLUDED 3ms
 FAIL  tests/pins.spec.ts > WR-21 — the tracer's own no-version-literal rule is ENFORCED, not merely claimed > names no Caido version literal anywhere, COMMENTS INCLUDED
AssertionError: scripts/phase1/tracer-e2e.sh names version literal(s) 127.0.0.1, 127.0.0.1, 127.0.0.1, 127.0.0.1, 127.0.0.1. […]: expected [ '127.0.0.1', '127.0.0.1', …(3) ] to deeply equal []
 Test Files  1 failed (1)
      Tests  1 failed | 33 passed (34)
```

**This break was NOT silent before the lift.** It goes red as a FALSE POSITIVE against the loopback addresses, with a remedy message accusing the wrong thing.

**AFTER — applied to the lifted predicate:**

```
--- applied diff ---
-    (run) => run.split(".").length === 3,
+    (run) => run.split(".").length === 4,
--- pnpm vitest run tests/pins.spec.ts ---
     × names no Caido version literal anywhere, COMMENTS INCLUDED 3ms
     × the predicate DETECTS a version literal in synthetic text — the true branch that had never run 0ms
     × the predicate IGNORES the two shapes this script cannot do without: a four-component loopback address and a two-component interval 0ms
     × the predicate DETECTS a literal planted into the REAL script's text — the load-bearing one 0ms
 Test Files  1 failed (1)
      Tests  4 failed | 34 passed (38)
--- restored, re-run ---
 Test Files  1 passed (1)
      Tests  38 passed (38)
```

What changed is DIAGNOSIS, not detection: three named assertions now say the predicate no longer recognises a literal and now swallows a loopback address, instead of one assertion blaming the script.

---

### PAIR B2 — component count compared GREATER-OR-EQUAL

**BEFORE:**

```
--- applied diff ---
-      (run) => run.split(".").length === 3,
+      (run) => run.split(".").length >= 4,
--- pnpm vitest run tests/pins.spec.ts ---
     × names no Caido version literal anywhere, COMMENTS INCLUDED 3ms
AssertionError: scripts/phase1/tracer-e2e.sh names version literal(s) 127.0.0.1, 127.0.0.1, 127.0.0.1, 127.0.0.1, 127.0.0.1. […]: expected [ '127.0.0.1', '127.0.0.1', …(3) ] to deeply equal []
 Test Files  1 failed (1)
      Tests  1 failed | 33 passed (34)
```

**NOT silent before the lift**, same reason as B1.

**AFTER:**

```
--- applied diff ---
-    (run) => run.split(".").length === 3,
+    (run) => run.split(".").length >= 4,
--- pnpm vitest run tests/pins.spec.ts ---
     × names no Caido version literal anywhere, COMMENTS INCLUDED 3ms
     × the predicate DETECTS a version literal in synthetic text — the true branch that had never run 0ms
     × the predicate IGNORES the two shapes this script cannot do without: a four-component loopback address and a two-component interval 0ms
     × the predicate DETECTS a literal planted into the REAL script's text — the load-bearing one 0ms
 Test Files  1 failed (1)
      Tests  4 failed | 34 passed (38)
--- restored, re-run ---
 Test Files  1 passed (1)
      Tests  38 passed (38)
```

---

### PAIR B3 — the empty-array fallback dropped — **THIS BREAK WAS SILENT**

**BEFORE:**

```
--- applied diff ---
-    const hits = (tracerText.match(DOTTED_NUMERIC) ?? []).filter(
+    const hits = tracerText.match(DOTTED_NUMERIC).filter(
--- pnpm vitest run tests/pins.spec.ts ---
 Test Files  1 passed (1)
      Tests  34 passed (34)
```

**GREEN. The gate did not see it.**

**AFTER:**

```
--- applied diff ---
-  return (text.match(/\d+(?:\.\d+)+/g) ?? []).filter(
+  return text.match(/\d+(?:\.\d+)+/g).filter(
--- pnpm vitest run tests/pins.spec.ts ---
     × the predicate returns EMPTY rather than throwing on text carrying no dotted-numeric run at all 1ms
TypeError: Cannot read properties of null (reading 'filter')
 Test Files  1 failed (1)
      Tests  1 failed | 37 passed (38)
--- restored, re-run ---
 Test Files  1 passed (1)
      Tests  38 passed (38)
```

**This is the pair the fourth fixture exists for.** Caught by exactly one assertion — the one added beyond the plan. Without it this break would read GREEN on both halves.

---

### PAIR B4 — `search()` instead of `match()`

**BEFORE:**

```
--- applied diff ---
-    const hits = (tracerText.match(DOTTED_NUMERIC) ?? []).filter(
+    const hits = (tracerText.search(DOTTED_NUMERIC) ?? []).filter(
--- pnpm vitest run tests/pins.spec.ts ---
     × names no Caido version literal anywhere, COMMENTS INCLUDED 1ms
TypeError: (tracerText.search(...) ?? []).filter is not a function
 Test Files  1 failed (1)
      Tests  1 failed | 33 passed (34)
```

**NOT silent before the lift** — `search` returns a number and `.filter` is not a function on it, so the assertion throws.

**AFTER:**

```
--- applied diff ---
-  return (text.match(/\d+(?:\.\d+)+/g) ?? []).filter(
+  return (text.search(/\d+(?:\.\d+)+/g) ?? []).filter(
--- pnpm vitest run tests/pins.spec.ts ---
     × names no Caido version literal anywhere, COMMENTS INCLUDED 1ms
     × the predicate DETECTS a version literal in synthetic text — the true branch that had never run 0ms
     × the predicate IGNORES the two shapes this script cannot do without: a four-component loopback address and a two-component interval 0ms
     × the predicate returns EMPTY rather than throwing on text carrying no dotted-numeric run at all 0ms
     × the predicate DETECTS a literal planted into the REAL script's text — the load-bearing one 0ms
TypeError: (text.search(...) ?? []).filter is not a function
 Test Files  1 failed (1)
      Tests  5 failed | 33 passed (38)
--- restored, re-run ---
 Test Files  1 passed (1)
      Tests  38 passed (38)
```

---

### PAIR B5 — pattern tightened to require a leading letter — **THIS BREAK WAS SILENT**

**BEFORE:**

```
--- applied diff ---
-  const DOTTED_NUMERIC = /\d+(?:\.\d+)+/g;
+  const DOTTED_NUMERIC = /v\d+(?:\.\d+)+/g;
--- pnpm vitest run tests/pins.spec.ts ---
 Test Files  1 passed (1)
      Tests  34 passed (34)
```

**GREEN. The gate did not see it.** This is the break that matters most: the rule stops being enforced, nothing goes red, and the failure message a future reader would eventually see never appears.

**AFTER:**

```
--- applied diff ---
-  return (text.match(/\d+(?:\.\d+)+/g) ?? []).filter(
+  return (text.match(/v\d+(?:\.\d+)+/g) ?? []).filter(
--- pnpm vitest run tests/pins.spec.ts ---
     × the predicate DETECTS a version literal in synthetic text — the true branch that had never run 3ms
     × the predicate DETECTS a literal planted into the REAL script's text — the load-bearing one 0ms
 Test Files  1 failed (1)
      Tests  2 failed | 36 passed (38)
--- restored, re-run ---
 Test Files  1 passed (1)
      Tests  38 passed (38)
```

### Restore cross-check after the matrix

```
$ diff -q tests/pins.spec.ts .../pins.spec.ts.LIFTED
RESTORE CROSS-CHECK: identical to the lifted text
```

---

## THE FILE-SCAN DIRECTION, PROVEN ON DISK

A literal was appended to the real `scripts/phase1/tracer-e2e.sh`:

```
--- git diff -U0 (scoped) ---
+# a literal planted on disk by plan 01-22, to drive the scan red: Caido 0.58.0
--- pnpm vitest run tests/pins.spec.ts ---
     × names no Caido version literal anywhere, COMMENTS INCLUDED 3ms
     × the predicate DETECTS a literal planted into the REAL script's text — the load-bearing one 0ms
AssertionError: scripts/phase1/tracer-e2e.sh names version literal(s) 0.58.0. Its header states that a literal in that file is a bug: decision P7-D5 moved `P1_EXPECT_VERSION` once and the prose did not follow, so a reader found one build in the comment and another in the environment and every number in the artifact became unciteable. Cite `P1_EXPECT_VERSION` instead — the RESOLVED value is written into every run directory as `caido-version.txt`, so the evidence carries the build rather than a comment claiming it.: expected [ '0.58.0' ] to deeply equal []
AssertionError: A 0.58.0 appended to the real text of scripts/phase1/tracer-e2e.sh was NOT returned by versionLiterals. The scan above cannot go red on the actual file, whatever it does on a fixture — repair the predicate.: expected [ '0.58.0', '0.58.0' ] to deeply equal [ '0.58.0' ]
 Test Files  1 failed (1)
      Tests  2 failed | 36 passed (38)
--- literal removed, re-run ---
 Test Files  1 passed (1)
      Tests  38 passed (38)
--- git diff --exit-code -- scripts/phase1/tracer-e2e.sh ---
CLEAN
```

**A second measured result, recorded rather than tidied.** The load-bearing fixture ALSO went red — with a two-element array — because it appends its own literal to a file that was already dirty. That is a second alarm on a real defect, not a false positive, and the fixture's comment now states the coupling so a later reader is not surprised by it.

## The amended tracer header sentence

```
# purpose is producing citeable evidence. Plan 01-17 wrote the gate rather than
# deleting the sentence — and plan 01-22 moved the PROOF that the gate can fail out
# of a summary and into the repository, because an observation somebody made once is
# not something a reader can re-run (01-REVIEW.md WR-25). `tests/pins.spec.ts` now
# exports the scan's predicate as `versionLiterals` and executes its FAILING path on
# every run of the suite. The load-bearing case is the assertion titled "the
# predicate DETECTS a literal planted into the REAL script's text — the load-bearing
# one": it appends a version literal to THIS FILE'S OWN TEXT in memory and requires
# the predicate to hand it back. Before that, the predicate's true branch had never
# executed anywhere in the suite — this file carries a two-component sleep interval
# and several four-component loopback addresses and no three-component run at all —
# so the rule could have stopped being enforced without anything going red.
```

The gate over the amended file — zero hits, and the two runs it DOES find are the two it must ignore:

```
dotted-numeric runs found in the AMENDED file : ["127.0.0.1","0.25"]
three-component (version literal) hits        : [] -> count 0
```

## knip handling of the new export

**No handling was needed, and that is a measured result, not an assumption.**

```
$ pnpm knip
$   (no output, exit 0)
```

Two independent reasons, both read out of `knip.json`: `tests/**/*.spec.ts` is listed as an **entry** for the `.` workspace (entry files' exports are roots, never reported), and `"ignoreExportsUsedInFile": true` is set globally — the same configuration that lets `outbound-prohibition.spec.ts` and `error-redaction.spec.ts` export `auditSource` with no consumer outside their own file. The new export is handled exactly as the two analog gates are: by not needing to be.

---

# TASK 2 — `padded_segments_reached`

## Precondition

```
/opt/homebrew/bin/python3
python3 one-liner OK
/opt/homebrew/bin/bash
/opt/homebrew/bin/git
PRECONDITION: python3, bash, git all present
```

## The vacuity REPRODUCED before the fix, by execution

The predicate text was copied verbatim from `scripts/phase1/tracer-e2e.sh` and run standalone under `python3` over four synthetic row sets:

```
--- padded_segments_reached, PRE-FIX form ---
A. empty row list                                   -> padded_segments_reached=False  -> writes DID-NOT-REACH
B. rows present, NONE carries a query string        -> padded_segments_reached=True   -> writes REACHED
C. rows carrying the 5 segments the fixture sent    -> padded_segments_reached=True   -> writes REACHED
D. rows carrying a query of the WRONG segment count -> padded_segments_reached=False  -> writes DID-NOT-REACH
```

**Case B is the finding.** `bool(raw_rows)` is `True`, the `if "?" in r` filter yields nothing, `all()` over an empty generator is `True`, and the run writes `padded_segments_reached=yes` into `grammar-reachability.txt` having measured nothing. Case D was added beyond the plan's three as a control: a row set that carries a query of the wrong shape must read NOT reached both before and after, or the fix would be indistinguishable from a fix that simply made the predicate stricter about everything.

## The fix, as committed

```python
#     THE `any(...)` CONJUNCT IS NOT REDUNDANT WITH `bool(raw_rows)` (01-REVIEW.md
#     IN-21): an `all()` over an EMPTY generator is `True`, so a row list where NO row
#     carries a `?` filters down to nothing and this predicate used to report REACHED
#     having measured nothing — and what it reports is written into
#     grammar-reachability.txt, which is committed evidence a reader cites, so its
#     truth must not depend on the segment-count check above having already failed.
padded_segments_reached = (
    bool(raw_rows)
    and any("?" in r for r in raw_rows)
    and all(
        len(r.partition("?")[2].split("&")) == 5 for r in raw_rows if "?" in r
    )
)
```

The scoped `git diff` is 12 insertions / 2 deletions, and the only deleted lines are the two lines of the old assignment. `bool(raw_rows)` is kept. **Both note branches are byte-identical**, including the DID-NOT-REACH note's citation of the `observations.spec.ts` cases that enforce the grammar instead:

```
$ git diff -- scripts/phase1/tracer-e2e.sh   # the reachability hunk
-padded_segments_reached = bool(raw_rows) and all(
-    len(r.partition("?")[2].split("&")) == 5 for r in raw_rows if "?" in r
+#     THE `any(...)` CONJUNCT IS NOT REDUNDANT WITH `bool(raw_rows)` (01-REVIEW.md
+#     IN-21): […]
+padded_segments_reached = (
+    bool(raw_rows)
+    and any("?" in r for r in raw_rows)
+    and all(
+        len(r.partition("?")[2].split("&")) == 5 for r in raw_rows if "?" in r
+    )
 )
 if padded_segments_reached:
     notes.append("padded bare segments (TWO `=` and ONE `=`): REACHED the plugin — "
```

## The same four row sets, AFTER the fix

```
--- padded_segments_reached, POST-FIX form ---
A. empty row list                                   -> padded_segments_reached=False  -> writes DID-NOT-REACH
B. rows present, NONE carries a query string        -> padded_segments_reached=False  -> writes DID-NOT-REACH
C. rows carrying the 5 segments the fixture sent    -> padded_segments_reached=True   -> writes REACHED
D. rows carrying a query of the WRONG segment count -> padded_segments_reached=False  -> writes DID-NOT-REACH
```

**B flipped. A, C and D are unchanged.** The genuine REACHED case (C) still reads reached, which is the half that would have made the fix a regression had it moved.

## The two sibling predicates — CHECKED, not assumed, and untouched

```
--- sibling predicates: is there any input on which they are vacuously True? ---
raw_urls empty (no rows at all)    -> pathparam_reached=False  userinfo_reached=False
rows present, no `;` and no `@`    -> pathparam_reached=False  userinfo_reached=False
rows carrying both                 -> pathparam_reached=True   userinfo_reached=True

Both are plain substring tests over the JOINED blob: `x in s` is False for s == ''
and has no filtered generator, so neither has an all()-over-nothing path. Non-vacuous
by construction, CONFIRMED by execution. Neither is touched by this plan.
```

The scoped `git diff` shows no change to either.

## `bash -n`, `shellcheck`, and the embedded Python

```
$ bash -n scripts/phase1/tracer-e2e.sh
bash -n exit=0

$ shellcheck scripts/phase1/tracer-e2e.sh   # pre-change baseline
shellcheck exit=0

$ shellcheck scripts/phase1/tracer-e2e.sh   # post-change
shellcheck exit=0
```

No new finding relative to the baseline — both are silent and both exit 0.

**One check added beyond the plan, because `bash -n` cannot see it.** The predicate lives inside a `python3 - <<'PY'` heredoc, which `bash -n` treats as opaque text; a Python syntax error in the new parenthesised expression would have passed every shell check and only surfaced on a live run twenty minutes in. The heredoc body was extracted and compiled:

```
$ sed -n '562,906p' scripts/phase1/tracer-e2e.sh > block.py && python3 -m py_compile block.py
PYTHON BLOCK COMPILES (py_compile exit=0)
```

## The `README-01-17.md` amendment, pasted whole

```markdown
---

## AMENDMENT, 2026-08-24 (plan 01-22) — which predicate produced the `padded_segments_reached` row

Appended, not edited. Nothing above this line is rewritten and neither run directory
is touched; this phase amends evidence by pointer and dates the pointer.

**What changed in the instrument.** `padded_segments_reached` in
`scripts/phase1/tracer-e2e.sh` read `bool(raw_rows) and all(… for r in raw_rows if "?"
in r)`. `bool(raw_rows)` catches an empty row LIST, but not a row list where no row
carries a `?` — the generator is then empty and `all()` over an empty generator is
`True`. On that input the pre-fix predicate would have written
`padded_segments_reached=yes` into `grammar-reachability.txt` having measured nothing.
Executed standalone under `python3` rather than read off the page (01-REVIEW.md IN-21):

```
--- padded_segments_reached, PRE-FIX form ---
A. empty row list                                   -> padded_segments_reached=False  -> writes DID-NOT-REACH
B. rows present, NONE carries a query string        -> padded_segments_reached=True   -> writes REACHED
C. rows carrying the 5 segments the fixture sent    -> padded_segments_reached=True   -> writes REACHED
D. rows carrying a query of the WRONG segment count -> padded_segments_reached=False  -> writes DID-NOT-REACH
```

Plan 01-22 adds `any("?" in r for r in raw_rows)` to the conjunction, keeping the
existing `bool(raw_rows)` guard. Case B now reads `False`; A, C and D are unchanged.

**WHAT THIS DOES AND DOES NOT PUT IN DOUBT, stated precisely, because overstating it
would be the same fault aimed backwards.** The two runs indexed above, and the runs
under `README-01-14.md`, carry `padded_segments_reached=yes` produced by the PRE-FIX
predicate. Their note is NOT retrospectively in doubt: on those runs the segment-count
assertion `check(len(q_seg) == 5, …)` PASSED for every row, which is only reachable on
rows that carry a `?` and carry exactly five query segments. The reachability note was
therefore independently corroborated on the runs that were taken, by an assertion that
would have failed loudly on the input that makes the pre-fix predicate vacuous. What
was wrong was the predicate's INDEPENDENCE, not its answer here: its truth depended on
another assertion having already failed, and that is not a property an evidence file
should have.

**Scope of the correction.** Runs from plan 01-22 onward use the corrected
conjunction. No live Caido cycle was run to establish any of the above: the predicate
is pure, and its empty-generator branch is structurally unreachable on a passing live
run — the segment-count check fails first — so the standalone execution exercises a
branch a live run could not have reached.

The two sibling predicates, `pathparam_reached` and `userinfo_reached`, were checked
and are plain substring tests over the joined blob with no filtered generator; both
read `False` on an empty blob. Non-vacuous by construction, confirmed by execution,
and untouched.
```

Append-only, and no run directory touched:

```
$ git diff --stat -- .../results/runs/README-01-17.md
 .../results/runs/README-01-17.md | 48 ++++++++++++++++++++++
 1 file changed, 48 insertions(+)

$ git diff -U0 -- .../README-01-17.md | grep -E '^-[^-]'
(no removed lines — pure append)

$ git diff --exit-code -- '.planning/phases/01-skeleton-persistence-compatibility/results/runs/2026*'
CLEAN
```

## WHY NO LIVE CAIDO CYCLE WAS RUN — a decision, not a corner cut

`padded_segments_reached` is a pure predicate over a list of strings. The branch this plan fixes — a non-empty row list in which no row carries a `?` — is **structurally unreachable on a passing live run**, because `check(len(q_seg) == 5, …)` fails first and aborts. A live Caido cycle would therefore have cost roughly twenty minutes and exercised the branch **zero** times, proving only that the predicate still returns `True` on the shape it already returned `True` on. The standalone execution runs the exact input a live run cannot produce, before and after, and is strictly stronger evidence for the thing being claimed. The committed runs from plans 01-14 and 01-17 stand as they are, amended by dated pointer.

---

# WHOLE-SUITE VERIFICATION

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1105 passed (1105)

$ pnpm typecheck
typecheck OK        (tsc --build, exit 0)

$ pnpm lint
lint OK             (eslint ., exit 0)

$ pnpm knip
knip OK             (no output, exit 0)

$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

31 files / 1105 tests — above the required floor of 31 / 1044, and +4 over the wave's 1101 baseline (the four new predicate fixtures).

## Scope diffs — everything this plan promised not to touch

```
$ git diff --exit-code tests/phase1-load.spec.ts tests/phase1-runtime.spec.ts \
    packages/backend/src/compat.ts packages/backend/src/ scripts/phase1/env.sh
SCOPE CLEAN

$ git diff --exit-code packages/ tests/phase1-load.spec.ts tests/phase1-runtime.spec.ts \
    scripts/phase1/env.sh scripts/ci/
SCOPE CLEAN

$ git diff --exit-code -- 01-*-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md
PLANNING DOCS CLEAN
```

The three deliberate pins are untouched, `scripts/phase1/env.sh` is untouched, no plan 01-01 through 01-21 is modified, and no committed run directory is modified.

---

## Decisions Made

1. **The mutation matrix's before-half was executed, and it corrected the finding.** Three of the five breaks 01-REVIEW.md WR-25 enumerates were already loud. The plan required execution over citation for exactly this reason, and the requirement earned its cost on the first task.
2. **A fourth fixture was added beyond the plan's three.** Without it, break B3 stays silent after the lift as well as before it.
3. **`bool(raw_rows)` was kept alongside the new `any()`.** They catch different empty cases; replacing one with the other trades a hole for a hole.
4. **No live Caido cycle.** Reasoned above and recorded in the amendment itself, so the absence reads as a decision in the artifact a reader will find.
5. **The docblock states that `auditPatternUse` is module-local rather than exported.** The plan and the review both said all three analog gates export; two do.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] A fourth fixture, without which one of the five breaks stays undetected**

- **Found during:** Task 1, while running the after-half of the mutation matrix.
- **Issue:** The plan specified three fixtures — synthetic true branch, the two surviving shapes, and the planted-into-real-text case. Every one of those feeds `versionLiterals` text containing at least one dotted-numeric run, so `String.match` never returns `null` and break B3 (dropping `?? []`) never reaches the missing fallback. With only the plan's three fixtures, B3 reads GREEN both before and after the lift, and this SUMMARY would have claimed all five breaks closed while one was not.
- **Fix:** Added `it("the predicate returns EMPTY rather than throwing on text carrying no dotted-numeric run at all", …)`, with a comment stating explicitly why it is not redundant with the two-surviving-shapes assertion.
- **Files modified:** `tests/pins.spec.ts`
- **Verification:** Break B3 applied post-lift now fails exactly that one assertion with `TypeError: Cannot read properties of null (reading 'filter')` — pasted in PAIR B3 above.
- **Committed in:** `d2e1907`

**2. [Rule 2 - Missing critical functionality] `bash -n` cannot see a Python syntax error inside the heredoc**

- **Found during:** Task 2, before committing the predicate change.
- **Issue:** The plan's verify block relies on `bash -n scripts/phase1/tracer-e2e.sh`, which treats a `<<'PY'` heredoc body as opaque text. The change introduces a multi-line parenthesised Python expression; a syntax error in it would pass `bash -n`, pass `shellcheck`, pass the whole suite, and surface only on a live tracer run — twenty minutes in, at the point the run is meant to produce evidence.
- **Fix:** Extracted the heredoc body and ran `python3 -m py_compile` over it. Exit 0.
- **Files modified:** none (a verification step, not a code change).
- **Verification:** `PYTHON BLOCK COMPILES (py_compile exit=0)`, pasted above.
- **Committed in:** n/a — verification only.

**3. [Rule 1 - Bug] Two block comments said "three fixtures" after a fourth was added**

- **Found during:** Task 1 write-up review.
- **Issue:** The lift's prose comment and the non-vacuity limit sentence both enumerated three predicate fixtures; there are four. A comment describing a count that moved is the same defect as a comment describing a position that moved, and this file already carries an account of exactly that (`q_seg` and the `endswith` retarget).
- **Fix:** Both corrected to four, with the fourth's role enumerated.
- **Files modified:** `tests/pins.spec.ts`
- **Verification:** `pnpm lint` exit 0, 38 tests passing.
- **Committed in:** `502bbce`

---

**Total deviations:** 3 auto-fixed (2 × Rule 2 missing critical functionality, 1 × Rule 1 bug).
**Impact on plan:** No scope creep. Deviation 1 is load-bearing — without it the plan's own success criterion ("five plausible breaks … are now each detected") would have been false while reading as true, which is the failure mode this entire round exists to remove. Deviations 2 and 3 are hygiene on the same theme.

## Issues Encountered

**The review's WR-25 mutation list did not reproduce as stated, and that is the plan's most useful result.** 01-REVIEW.md asserts that `=== 4`, `>= 4`, dropping `?? []`, `search`-instead-of-`match` and a leading-letter pattern all leave the gate "green forever". Executed against the pre-lift inline filter, only two of the five did. The other three go red because `scripts/phase1/tracer-e2e.sh` carries five four-component `127.0.0.1` — the very shape the gate must not flag — so a mis-set component-count comparison produces a false positive rather than silence.

This does **not** overturn WR-25. The finding's core claim — that the detection predicate's true branch never executed anywhere in the suite, so the gate could not be shown to work — was correct and is now closed. What is corrected is the breadth of the consequence: two breaks were silent, not five. Recorded here rather than smoothed over, in the same discipline wave 19 used when two of its own new fixture rows stayed green under the mutations they sat beside.

**A second measured result, on the load-bearing fixture.** Planting a literal on disk drives it red too, with a two-element array, because it appends its own literal to already-dirty text. A second alarm on a real defect, not a false positive — stated in the fixture's comment so a later reader does not read it as a bug.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 01's last plan. Ready for phase verification and review pass 5.

- Both WR-25 and IN-21 are closed with executed evidence in the repository rather than in a summary.
- One item is handed forward: **01-REVIEW.md WR-25's mutation list overstates the consequence** (five silent breaks; two measured). The review file was deliberately not modified by this plan — it modifies no `01-REVIEW.md` — so the correction lives here and in the code comments. The next review pass should reconcile it.
- The unchanged carry-forward from plans 01-14 through 01-21: **STORE-03 is a ledger collision.** `REQUIREMENTS.md:52` reads "Artifacts are content-addressed by digest, decoupling identity from URL" and says nothing about gate falsifiability or evidence discipline. This plan is the last of the phase to declare it, so the shared-ID gate releases it here — but the requirement text still does not describe what these plans built. Deferred with an owner: the operator, at the next requirements pass, by the STORE-01 → STORE-08 route.
- Suite baseline for whatever comes next: **31 files / 1105 tests green**, typecheck / lint / knip clean, bundle at exactly one specifier (`crypto`).

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*

## Self-Check: PASSED

- `tests/pins.spec.ts`, `scripts/phase1/tracer-e2e.sh`, `results/runs/README-01-17.md` and `01-22-SUMMARY.md` all present on disk.
- Commits `d2e1907`, `5f2d0bd`, `502bbce`, `375ce43` all found in `git log --oneline --all`.
- Final suite re-run after the metadata commit: **31 files / 1105 tests passed**.
- Working tree clean over `tests/`, `scripts/`, `packages/` and the phase directory.
