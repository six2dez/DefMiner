---
phase: 01-skeleton-persistence-compatibility
plan: 46
subsystem: testing
tags:
  [
    core-11,
    outbound-prohibition,
    derived-residual,
    header-census,
    byte-comparison,
    anchor-shadow-pin,
    gap-closure-round-12,
  ]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "wave 27's generator — `deriveResidual`, the two sentinels, `extractDerivedBlock`, `readPlanningLedger` and the two byte-comparison cases. This plan EXTENDS that machinery rather than inventing a second one."
  - phase: 01-skeleton-persistence-compatibility
    provides: "wave 42's `WIDEST_ANCHOR_SHADOW` / `WIDEST_ANCHOR_TOKEN` pins and the `HEADER_QUANTIFIER_EXEMPTIONS` guard, whose exemption-list shape the header census copies."
provides:
  - "`BYTE_COMPARED_SURFACES` — one frozen, exported declaration of the surfaces this suite reads and byte-compares; `GATE_FILE`, `LEDGER` and the generator all resolve FROM it"
  - "`deriveResidual(registry, surfaces)` — a two-argument pure generator whose output renders the comparison's reach into the machine-owned span, so the statement ships in BOTH compared surfaces and is itself byte-compared"
  - "`HEADER_PLANNING_MENTIONS` and a six-discharge header census — every `.planning/` mention in the gate header is inside the machine-owned span or a declared entry carrying a reason"
  - "a shadow pin re-derived 549 -> 540 against an attribution written down before the measurement, with every LIVE restatement of the value reconciled in the same commit"
  - "a pin whose span arithmetic, excluded count, surface count and anchor-walk verdict are EMITTED by its own failure message rather than hand-written in its comment"
affects:
  [
    01-47,
    phase-01-verification-pass-14,
    any-future-outbound-widening,
    any-future-edit-to-the-gate-header,
  ]

actuals:
  tokens: 11527 # chars/4 over the REALIZED DIFF (46,107 diff bytes across both files)
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "The set of surfaces a byte comparison reaches is DERIVED from one frozen constant and RENDERED into the compared text, so the reach statement is byte-compared in the same run as the thing it describes"
    - "A census over a prose region makes every mention of a class of file a LISTED, REASONED entry; an undeclared mention names itself, its line and its three dispositions and turns the suite red"
    - "A guard's own docblock discloses its blind spots and is deliberately WEAKER than the guard, never stronger"
    - "A number a case computes is EMITTED by its failure message rather than written into its comment — a hand-written locator is falsified by the next commit that moves a line"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "The shipped BEGIN sentinel names the TWO-ARGUMENT generator in WORDS rather than by identifier, because the ledger is a reader surface where a path is self-describing and an identifier is not — and because the gate asserts the ledger carries paths, not identifiers."
  - "CR-30's three false readings were closed by DELETION of nine lines, not by correction: a corrected mechanism sentence is still an authored one standing beside the derived one."
  - "The census list is a LIST OF RECORDS rather than an object keyed by line text, so a duplicate entry cannot be silently swallowed; the duplicate check is its own case with its own message."
  - "The census key is the TRIMMED RAW LINE — no normalization, no masking, no new key format, because a key format is a narrowing."
  - "The pin's anchor-walk verdict is EMITTED and NOT asserted: it is a diagnostic on the path that already fails, and a new claim about this file's geometry made in the round that is removing one carries exactly the risk being removed."
  - "CORE-11's checkbox was NOT flipped and `CORE11_BOX_EXPECTED` was NOT touched. Verification pass 14 owns that decision."

patterns-established:
  - "Predict the pin's movement in writing BEFORE running the measurement, then reconcile — and report a disagreement rather than adopting it"
  - "Watch every new guard go RED on a planted violation, restore with `git checkout --`, VERIFY the restore by re-reading rather than assuming, and prove the tree clean by diff"

requirements-completed: [CORE-11]

coverage:
  - id: D1
    description: "The set of byte-compared surfaces is one frozen declaration that `GATE_FILE`, `LEDGER` and the generator all read, and its content is rendered into the generated residual and byte-compared in both surfaces"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES), byte for byte"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES), byte for byte"
        status: pass
      - kind: other
        ref: "grep -c '\"packages/backend/src/outbound-prohibition.spec.ts\"' and grep -c '\".planning/REQUIREMENTS.md\"' over the gate spec — 1 each, both inside BYTE_COMPARED_SURFACES"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every `.planning/` mention in the gate header is inside the machine-owned span or a declared entry with a reason; an undeclared mention turns the suite red"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#every `.planning/` mention in the gate header is a DECLARED entry — an undeclared mention names itself and its three dispositions"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#every DECLARED header mention still MATCHES a header line — a stale entry is loud and says it is stale"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the census COUNTS BALANCE — a header line mentioned twice cannot be discharged by one entry"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#no two DECLARED header mentions carry identical line text"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#every DECLARED header mention carries a REASON, and a reason is longer than a token"
        status: pass
    human_judgment: false
  - id: D3
    description: "CR-30's two machine-check clauses and the `REQUIREMENTS.md`-is-untouched clause are deleted, both banners byte-unchanged and adjacent to what followed them"
    requirement: "CORE-11"
    verification:
      - kind: other
        ref: "git diff 1cb2884..HEAD — two PURE deletion hunks of 6 and 3 lines, both banner lines present as unchanged context"
        status: pass
      - kind: other
        ref: "the line below each banner re-read from the file: `WIDENED 2026-08-24 (WR-27)` and `THE NARROWING AFTER WAVE 26`"
        status: pass
    human_judgment: false
  - id: D4
    description: "The shadow pin is re-derived 549 -> 540 against an attribution stated before the measurement, and the value is published exactly once in the file"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the WIDEST ANCHOR SHADOW over the scanned surface is PINNED"
        status: pass
      - kind: other
        ref: "grep -nE '\\b(549|540)\\b' over the gate spec — exactly one line, and it is the declaration"
        status: pass
    human_judgment: false
  - id: D5
    description: "The pin's comment states no raw span, raw count, excluded count, pinned value or opener locator; the failure message computes and prints each of them"
    requirement: "CORE-11"
    verification:
      - kind: other
        ref: "four greps over the 70-line window above the declaration — raw span, 582, 549/540 and the opener locator all zero"
        status: pass
      - kind: manual_procedural
        ref: "planted two bare comment lines inside raw 419..1551 and outside exclusion one; the pin's full failure message printed RAW LINES 1135, EXCLUDED 593, 542 surface, ANCHOR WALK 0 — restored with `git checkout --` and the tree proved clean"
        status: pass
    human_judgment: false
  - id: D6
    description: "Nothing shipped changed and nothing leaked"
    requirement: "CORE-11"
    verification:
      - kind: other
        ref: "pnpm check:bundle — packages/backend/dist/index.js: 1 import specifier(s): crypto"
        status: pass
      - kind: other
        ref: "git diff --name-only 1cb2884..HEAD -- packages/ scripts/ — exactly one file, the gate spec; `auditSource` byte-identical over 1179 lines"
        status: pass
    human_judgment: false
  - id: D7
    description: "Criterion (3) of the 2026-08-25 re-scoped bar — the disclosure is the only bound stated on every surface a reader touches — for the gate spec and the requirement ledger"
    verification: []
    human_judgment: true
    rationale: "Half of the enumeration lives in plan 01-47's files (`STATE.md`, `ROADMAP.md`, `01-SECURITY.md`) and no mechanism in this repository reaches them. Criterion (3) cannot be discharged by this plan alone; verification pass 14 owns the judgement and CORE-11's box."

duration: 27 min
completed: 2026-08-27
status: complete
---

# Phase 01 Plan 46: CR-30 and CR-31 closed by class — the byte-compared surface set becomes derived, the gate header becomes censused, and the pin stops hand-writing numbers it computes

**The suite's own answer to "which files do I byte-compare?" is now one frozen constant that the two readers and the generator all resolve from, rendered into the machine-owned span so the statement of the comparison's reach ships inside both compared surfaces; every remaining `.planning/` mention in the gate header is a listed, reasoned entry that turns the suite red if it is not; and the pin's span arithmetic and accepted-opener locator are emitted by the run that measures them rather than written into a comment the next commit falsifies.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-08-27T13:19:00Z
- **Completed:** 2026-08-27T13:46:00Z
- **Tasks:** 3
- **Files modified:** 2

## The arrival baseline, MEASURED IN THIS SESSION

Written to `$TMPDIR/defminer-round12-baseline` before the first edit. Every figure was re-run here, not copied from `01-VERIFICATION.md`.

| Value                 | Arrival (measured) | Pass 13's figure | Difference |
| --------------------- | ------------------ | ---------------- | ---------- |
| `pnpm test` files     | 31                 | 31               | none       |
| `pnpm test` tests     | 1390 (exit 0)      | 1390             | none       |
| gate spec alone       | 442 (exit 0)       | 442              | none       |
| `pnpm typecheck`      | exit 0             | exit 0           | none       |
| `pnpm lint`           | exit 0             | exit 0           | none       |
| `pnpm knip`           | exit 0             | —                | —          |
| `pnpm check:bundle`   | 1 specifier, `crypto` | 1 specifier, `crypto` | none |
| module count          | 23                 | —                | —          |
| `SURFACE_LINES.length`| 9252               | —                | —          |
| gate spec lines       | 11477              | —                | —          |
| gate header lines     | 957                | 957              | none       |

**There is no difference from pass 13's figures to explain.**

`BASE_PLAN_START = f1ea4d0d3ad60438c72862832dfe4c83f4d99aeb`. The working tree was CLEAN at arrival (`git status --porcelain .planning/ packages/` empty), so no housekeeping commit was needed and plan 01-42's F-0 situation did not recur.

### The pre-existing planning delta, NAMED rather than absorbed

```
$ git diff --name-only 1cb2884..HEAD -- .planning/ | grep -v phases/
.planning/ROADMAP.md
```

That one file belongs to the **plan-authoring commit `4f351d0`** (it added the wave 46/47 rows and rewrote the `**Plans**:` paragraph) and **NOT to this executor**. Nothing else pre-existed. Every ownership assertion in this plan is therefore scoped to `$BASE_PLAN_START..HEAD`, which reads exactly one non-phase planning file — `.planning/REQUIREMENTS.md` — and the round-base-scoped count of TWO is accounted for by naming its second member rather than by widening a tolerance.

## Task Commits

1. **Task 1: the byte-compared surface set becomes one frozen constant, rendered into both compared spans** — `40572fd` (test)
2. **Task 2: a header census makes every `.planning/` mention listed; CR-30's nine lines deleted; the shadow pin re-derived 549 -> 540** — `196d20c` (test)
3. **Task 3: CR-31 — the pin's hand-written span arithmetic and opener locator deleted, emitted from its own computation instead** — `117eaff` (test)

## The two byte-comparison RED observations, quoted

Both were taken **before either span was regenerated**, and they came in two stages because the sentinel's own text moved.

### Stage 1 — generator changed, no span touched, no sentinel restored

`pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts` → `rc=1`, **7 failed / 435 passed (442)**:

```
 × the gate file read is NON-EMPTY and carries BOTH sentinels — non-vacuity, asserted BEFORE the rule
 × exclusion one's sentinel endpoints land on the sentinels' own unique full lines
 × the shipped block carries exactly ONE entry per registry row — a truncated block FAILS
 × the planning ledger read is NON-EMPTY and carries BOTH sentinels — non-vacuity, asserted BEFORE the rule
 × the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES), byte for byte
 × the ledger's block carries exactly ONE entry per registry row — a truncated ledger block FAILS
 × the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES), byte for byte
```

Both byte-comparison cases failed here, but through `SentinelMissingError` rather than the divergence assertion:

```
SentinelMissingError: the BEGIN sentinel is absent. Looked for a line containing: BEGIN DERIVED
RESIDUAL - generated by the TWO-ARGUMENT residual generator - the registry first, the
byte-compared surface set second - in packages/backend/src/outbound-prohibition.spec.ts -
MACHINE-OWNED, DO NOT HAND-EDIT. The generated block is machine-owned; restore the sentinel and
paste deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES)'s output between the markers.
```

That is the sentinel guard doing its job on a sentinel edit, and it is why a second stage was needed to reach the byte comparison itself.

### Stage 2 — the MARKER restored in both surfaces, NO span content touched

`rc=1`, **exactly 2 failed / 440 passed (442)** — only the two byte comparisons:

```
 FAIL … > the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES), byte for byte
AssertionError: the derived residual block in .planning/REQUIREMENTS.md DIVERGED from
deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES).

The GENERATED text is authoritative and the shipped text is the defect. Replace the span between
the sentinels with exactly this:

----- BEGIN EXPECTED -----
THE RESIDUAL OF CORE-11's OUTBOUND WALK - DERIVED, NOT AUTHORED.
This text is the output of the TWO-ARGUMENT residual generator in
packages/backend/src/outbound-prohibition.spec.ts. It is machine-owned: a test
reads this file's own bytes, extracts the span between the sentinels, and
compares it to that output. If the two disagree the GENERATED text is
authoritative and the shipped text is the defect.

THE SURFACES THAT COMPARISON REACHES - 2, RENDERED FROM THE ONE
DECLARATION THE TWO READERS RESOLVE THEIR OWN PATHS FROM:
  - packages/backend/src/outbound-prohibition.spec.ts
  - .planning/REQUIREMENTS.md
NO OTHER FILE IN THIS REPOSITORY IS REACHED BY IT. A file that is not listed
just above - including a file under the planning directory that is not listed
just above - carries at most a POINTER to these two and is byte-compared to
nothing. A sentence anywhere claiming that this comparison checks, agrees
with or renders into an unlisted file is FALSE, and the disposition for such
a sentence is to DELETE it rather than to re-date it.

WHAT THIS TEXT ESTABLISHES, AND WHAT IT DOES NOT.
…
```

The gate-header case printed the byte-identical expected block (`AssertionError: the derived residual block in packages/backend/src/outbound-prohibition.spec.ts DIVERGED from deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES).`). **Both spans are pastes of that message**: the paste step extracted the text between `----- BEGIN EXPECTED -----` and `----- END EXPECTED -----` from the log and asserted the two failure messages printed IDENTICAL text before writing either. 442/442 green immediately after.

**The surfaces section is rendered, not hand-typed.** The generator diff:

```diff
+    `THE SURFACES THAT COMPARISON REACHES - ${surfaces.length}, RENDERED FROM THE ONE`,
+    "DECLARATION THE TWO READERS RESOLVE THEIR OWN PATHS FROM:",
+    ...surfaces.map((s) => `  - ${s}`),
```

**Trap A discharged by measurement.** No rendered line begins with `ENTRY_MARK`; the list prefix is `  - `. Both entry-count cases are green, and the counted value equals `RESOLVER_REGISTRY.length`: **61 entry lines in the ledger span, 61 registry rows** (`grep -c '^    id: '` = 61; entry lines inside the ledger's span = 61).

**Trap B: the declared-phrasing guard did NOT fire** on anything this round wrote — not on the census docblock, not on the `BYTE_COMPARED_SURFACES` docblock, not on the generator's new strings, not on the four reconciled restatements. No `HEADER_QUANTIFIER_EXEMPTIONS` entry was added, and no rephrase was forced. The new prose was written avoiding the nine declared phrasings deliberately; the text rendered INSIDE the derived span is not scanned at all, because exclusion one covers it.

**Header length asserted 957 before and after Task 1**, with the BEGIN sentinel resolving to line 958 in both. The three in-place call-form rewrites are line-count neutral by diff (3→3, 3→3, 1→1). `WIDEST_ANCHOR_SHADOW` quoted GREEN at 549 in the same run, and the identity pin green.

**`deriveResidual`'s purity paragraph amended** to `no ordering that depends on anything but ITS ARGUMENTS … A generator whose output is not a function of ITS ARGUMENTS alone CANNOT be byte-compared`. **The BEGIN sentinel names the two-argument call in BOTH surfaces** (gate spec line 958, ledger line 198).

## The census's empty-list RED, quoted in full

Run with `HEADER_PLANNING_MENTIONS` declared as `Object.freeze([])`, **BEFORE the deletions**: `rc=1`, 2 failed / 446 passed (448).

```
AssertionError: 10 header line(s) name a file under ".planning/" and are DECLARED NOWHERE:
  packages/backend/src/outbound-prohibition.spec.ts:19
    // split reason lives there and in `.planning/STATE.md` (decision P9-D1).
  packages/backend/src/outbound-prohibition.spec.ts:601
    //    `.planning/WINDOWS.md` from one canonical source, so "the same words
  packages/backend/src/outbound-prohibition.spec.ts:751
    //    reason `.planning/STATE.md` and `.planning/WINDOWS.md` do not. What was
  packages/backend/src/outbound-prohibition.spec.ts:785
    //    CORE-11 row in `.planning/REQUIREMENTS.md`; this block now POINTS at
  packages/backend/src/outbound-prohibition.spec.ts:794
    //    AUTHORED ONCE and rendered into this block and into `.planning/WINDOWS.md`
  packages/backend/src/outbound-prohibition.spec.ts:908
    //    `.planning/REQUIREMENTS.md` and `CORE11_BOX_EXPECTED` below, which
  packages/backend/src/outbound-prohibition.spec.ts:912
    //    state; `.planning/STATE.md` is governed by the pointer-not-a-bound
  packages/backend/src/outbound-prohibition.spec.ts:935
    - this gate header and `.planning/REQUIREMENTS.md`'s CORE-11 entry - and BOTH are
  packages/backend/src/outbound-prohibition.spec.ts:937
    `.planning/STATE.md` and `.planning/WINDOWS.md` carry a POINTER to those two and
  packages/backend/src/outbound-prohibition.spec.ts:954
    `.planning/STATE.md` and `.planning/WINDOWS.md` do not - an authored bound
YOU HAVE THREE DISPOSITIONS AND THEY ARE LISTED IN THE ORDER THIS FILE PREFERS THEM. (1) DELETE
the sentence, if it states a MECHANISM this suite does not have — that is CR-30's disposition and
a corrected mechanism sentence is still an authored one waiting for the next commit that moves a
line. (2) MAKE IT DERIVED, if the fact is one the suite already computes — the surfaces this
comparison reaches are rendered from BYTE_COMPARED_SURFACES into the machine-owned span and are
byte-compared in both surfaces, so a sentence restating them belongs in the generator and not in
the header. (3) DECLARE it in HEADER_PLANNING_MENTIONS with a one-clause reason, if the mention is
genuinely not a mechanism claim. Declaring is the LAST option, not the first.: expected 10 to be +0
```

**`:601` and `:794` are CR-30's own two lines**, and this run happened before either was deleted. That is the evidence the guard would have caught CR-30 the day it was written.

The count-balance case fired in the same run with a distinct message (`the censused header region carries 10 matched line(s) while HEADER_PLANNING_MENTIONS declares 0`).

## The two deletions, shown as PURE deletions with the banners as context

```diff
@@ -597,12 +597,6 @@
 //    ================= THE FINAL RESIDUAL, AFTER PLAN 01-25 =================
-//    RE-DERIVED from the branches above and RENDERED PROGRAMMATICALLY into
-//    `.planning/WINDOWS.md` from one canonical source, so "the same words
-//    rather than two paraphrases" is a machine check and not a promise. If the
-//    two disagree, the code wins and the prose is the defect. `REQUIREMENTS.md`
-//    and `STATE.md` still carry OLDER text and are deliberately untouched here
-//    — see the last paragraph.
 //    WIDENED 2026-08-24 (WR-27), and the widening is why this block now says
@@ -791,9 +785,6 @@
 //    ============= THE NARROWING, AFTER PLAN 01-26 =============
-//    AUTHORED ONCE and rendered into this block and into `.planning/WINDOWS.md`
-//    from the same bytes, exactly as the wave-25 block above was, so "the same
-//    words rather than two paraphrases" stays a check rather than a promise.
 //    THE NARROWING AFTER WAVE 26 (plan 01-26, closing IN-26). This block
```

Six lines and three lines, both hunks pure deletions. **Both banner lines appear as unchanged context**, not as changed lines. Post-deletion adjacency, re-read from the file rather than inferred:

```
599: //    ================= THE FINAL RESIDUAL, AFTER PLAN 01-25 =================
600: //    WIDENED 2026-08-24 (WR-27), and the widening is why this block now says
787: //    ============= THE NARROWING, AFTER PLAN 01-26 =============
788: //    THE NARROWING AFTER WAVE 26 (plan 01-26, closing IN-26). This block
```

All three of CR-30's false readings die with those nine lines: (a) the machine-check-on-`WINDOWS.md` claim at `:600-603`, (b) its restatement at `:794-796`, and (c) the `REQUIREMENTS.md`-and-`STATE.md`-still-carry-OLDER-text clause at `:603-605` — which called one of the two byte-compared surfaces "deliberately untouched".

## The eight declared entries, with reasons written from reading each line

Each reason was written after reading the line in its surrounding paragraph, not from what the plan predicted about it. The plan pre-authored no reasons, so nothing disagreed; where my reading refines the plan's own expectation it is noted.

| # | Line (trimmed) | What the line actually says | Declared reason |
|---|---|---|---|
| 1 | `// split reason lives there and in \`.planning/STATE.md\` (decision P9-D1).` | Closes the paragraph explaining the 2026-08-21 CORE-01 → CORE-11 retag by saying WHERE that decision is recorded. | PROVENANCE POINTER. It records WHERE the retag was decided — in the ledger and as decision P9-D1 — and claims nothing about that file being read, compared or checked by anything here. |
| 2 | `//    reason \`.planning/STATE.md\` and \`.planning/WINDOWS.md\` do not. What was` | Wave 33's deletion paragraph, saying it restates no bound of its own for the same reason those two restate none. | STATES AN ABSENCE, NOT A MECHANISM. Naming a file as one that carries no bound cannot promise a check on it. |
| 3 | `//    CORE-11 row in \`.planning/REQUIREMENTS.md\`; this block now POINTS at` | Wave 41's deletion bracket, naming the two AUTHORITATIVE surfaces for the box state and saying this block points and asserts nothing. | NAMES A SURFACE THAT IS GENUINELY READ, AND THE SENTENCE ONLY POINTS. The row is read and pinned BY BYTES against `CORE11_BOX_EXPECTED`, and the ledger is one of the two entries in `BYTE_COMPARED_SURFACES`. |
| 4 | `//    \`.planning/REQUIREMENTS.md\` and \`CORE11_BOX_EXPECTED\` below, which` | The wave-41 replacement paragraph: "The AUTHORITATIVE surfaces are the CORE-11 row in … and `CORE11_BOX_EXPECTED` below, which pins that row BY BYTES." | THE SAME PAIR ONE PARAGRAPH LOWER, AND THE CLAIM IT MAKES IS TRUE — the case named for the box executes that pin against the ledger this suite reads. |
| 5 | `//    state; \`.planning/STATE.md\` is governed by the pointer-not-a-bound` | Continues "…no mechanism in this file enumerates the places IT states the box's state; `.planning/STATE.md` is governed by the pointer-not-a-bound rule below **with no mechanical check at all**." | DISCLOSES THE ABSENCE OF A CHECK RATHER THAN CLAIMING ONE — the opposite of CR-30's shape. |
| 6 | `- this gate header and \`.planning/REQUIREMENTS.md\`'s CORE-11 entry - and BOTH are` | Wave 27's surface decision: the DERIVED text ships in exactly TWO surfaces, and BOTH are byte-compared. | TRUE, AND NOW ALSO DERIVED. Kept as the wave-27 surface DECISION — the record of why two and not four — and not as the bound, which the generated span holds. **Refines the plan's expectation:** this mention names a GUARDED surface, not an unguarded one. |
| 7 | `\`.planning/STATE.md\` and \`.planning/WINDOWS.md\` carry a POINTER to those two and` | Followed four lines later by "THAT POINTER-NOT-A-BOUND RULE IS A PROHIBITION WITH NO MECHANICAL CHECK — the byte comparison reaches these two surfaces and no further". | STATES A PROHIBITION AND, A FEW LINES LOWER, THAT NOTHING ENFORCES IT. It is the true statement CR-30's deleted clause contradicted. |
| 8 | `\`.planning/STATE.md\` and \`.planning/WINDOWS.md\` do not - an authored bound` | Wave 28's note, restating no bound of its own for the same reason those two restate none. | STATES AN ABSENCE, AS ENTRY 2 DOES — a statement about what they carry, not about what reads them. |

Entries 3, 4 and 6 name `.planning/REQUIREMENTS.md`, which **is** a byte-compared surface; entries 2, 7 and 8 name `.planning/WINDOWS.md`, which is not, and each of those three is a true statement about an UNGUARDED surface rather than a mechanism claim.

## The 549 → 540 attribution, stated before the measurement

**Stated in advance, before the pin was run** (and recorded in the plan and in the commit message): nine surface lines were removed from inside the widest anchor's raw span and above exclusion one's start — the six at `:600-605` and the three at `:794-796`, every one of them between 419 and 949 — so the predicted result was **549 − 9 = 540**, and the raw span end was predicted to fall by 9.

The pin's failure message, quoted in full:

```
AssertionError: THE WIDEST ANCHOR SHADOW IS NOW 540 SURFACE LINES AND THIS GATE PINS IT AT 549.
The anchor that owns it is "SPELLING (operator, by POSITION) RESOLVED BY REPORTS", spanning raw
lines 419..1551. A SHADOW THAT GREW IS A RESIDUAL THAT GREW: every one of those 540 lines now
produces the same construct half, so an exemption written for any one of them is discharged just
as well by an occurrence at any other, and the reach this file publishes for its anchoring is that
wide. THE CORRECT RESPONSES ARE (a) re-site or rewrite whatever widened it, or (b) re-derive this
pin ONLY against growth attributed LINE BY LINE to lines the same commit added, with the diff
shown. Moving the pin to fit a number it cannot account for is decoration that reports green, and
it is the exact defect this file has spent eleven waves removing. If the number FELL, that is
equally reportable: the equality is exact so that a shadow which shrank is visible too, and the
reason belongs in the commit that shrank it.: expected 540 to be 549
```

**The shadow measured 540. The prediction matched exactly, and only then was the constant moved.**

The raw span end reads `419..1551`, **not the plan's predicted `419..1540`**, and that difference of exactly 11 is reported rather than absorbed. It is Task 1's eleven rendered surfaces-section lines, which live INSIDE exclusion one: growth there raises the raw endpoint and the excluded count together, which is why the SHADOW is invariant under it — the plan says so in its own arithmetic paragraph, and its `1540` figure was written as if Task 1 were endpoint-neutral rather than shadow-neutral. Line by line:

- exclusion one at arrival: `958..1539` (582 lines), raw span `419..1549` → 1131 − 582 = **549**
- after Task 1 (+11 inside exclusion one): `958..1550` (593 lines), raw span `419..1560` → 1142 − 593 = **549** (invariant, as asserted)
- after Task 2 (−9 above line 949): `949..1541` (593 lines), raw span `419..1551` → 1133 − 593 = **540**

The eleven added lines are the surfaces section exactly: one blank, two heading lines, two rendered path lines, six categorical lines. The generated block went 580 → 591 lines.

`WIDEST_ANCHOR_TOKEN`'s declaration is byte-identical to `1cb2884` and its case is green throughout.

## ONE BOUND, PUBLISHED ONCE — the enumeration, classified per site

Measured at `1cb2884` by grep with line numbers; every site named, none omitted.

| Site (at `1cb2884`) | Text | Classification | Why | Disposition | Owner |
|---|---|---|---|---|---|
| `:9072-9073` | `…RESOLVED BY REPORTS`: **549 SURFACE LINES**, raw span **419..1549** — **1,131** raw lines, of which exactly the **582**… | **LIVE** — present tense, states the file's current geometry | Reconciled: all four figures DELETED; the paragraph now points at the pin, which publishes the width and whose failure message computes it | Task 2 (`196d20c`) |
| `:9363` | limit (5)'s restatement: **549** surface lines, raw **419..1549**, already holding four shipped occurrences | **LIVE** — same, present tense | Reconciled: figures DELETED; "whose width the pin there publishes and this line deliberately does not" | Task 2 (`196d20c`) |
| `:10616` | construct-half comment: "and which is **549** surface lines wide for THIS occurrence's anchor" | **LIVE** | Reconciled: figure DELETED; "and whose width that case publishes rather than this comment" | Task 2 (`196d20c`) |
| `≈:10632` | inside a SHIPPED FAILURE STRING: "is **549** surface lines wide for the one shipped occurrence in this position" | **LIVE** | Reconciled: reads `${WIDEST_ANCHOR_SHADOW}` — the constant by name, no digits in the bytes | Task 2 (`196d20c`) |
| `:10154` | "because **549** lines FIND it" (uniqueness-census paragraph) | **LIVE**, inside the pin's own comment block | Reconciled: "because its whole span RESOLVES to that one anchor" — needs the fact, not the figure | Task 3 (`117eaff`) |
| `:10188-10192` | the `MEASURED AT WAVE 42` paragraph: **419..1549**, **1,131**, **582**, `1131 - 582 = 549`, `opener at 1573`, `FOUR shipped occurrences`, and the `:417` locator | **LIVE**, inside the pin's own comment block | Reconciled: the whole paragraph DELETED and replaced by a pointer that states no number | Task 3 (`117eaff`) |
| `:10154`/`:10194` → declaration | `const WIDEST_ANCHOR_SHADOW = 549;` | **LIVE** — this IS the pin | Moved to `540` | Task 2 (`196d20c`) |
| `:10160` | "pass 11 measured the named shadow falling from **574** to 284 at 441 of 441 green" | **DATED HISTORY** — names the pass that measured it, past tense, states no current bound | KEPT byte-unchanged | — |
| `:10271` | "RESULT: the pin reported — but it reported a SHRINK, **574 -> 567**" | **DATED HISTORY** — same | KEPT byte-unchanged | — |

**The pin's own comment block carried the superseded figure for exactly one commit**, between `196d20c` and `117eaff`. That was scheduled rather than overlooked: `196d20c`'s message names Task 3 as its owner, so a reader of the history sees a hand-off and not the omission `08345c3` shipped.

**Proved at exit, over the WHOLE file rather than a window:**

```
$ grep -nE '\b(549|540)\b' packages/backend/src/outbound-prohibition.spec.ts | cut -d: -f1
10252
$ grep -n 'const WIDEST_ANCHOR_SHADOW' packages/backend/src/outbound-prohibition.spec.ts
10252:  const WIDEST_ANCHOR_SHADOW = 540;
```

One line, and it is the declaration. The two 574 sites, quoted and shown byte-unchanged across the whole round:

```
10212:  // pass 11 measured the named shadow falling from 574 to 284 at 441 of 441 green.
10323:  //       RESULT: the pin reported — but it reported a SHRINK, 574 -> 567, and
```

**The four surfaces OUTSIDE this file — `.planning/STATE.md:408`, `.planning/ROADMAP.md:239` and `01-SECURITY.md`'s five lines — are plan 01-47's and were NOT touched here.** The diff proves it: `git diff --name-only $BASE_PLAN_START..HEAD -- .planning/ | grep -v phases/` returns exactly `.planning/REQUIREMENTS.md` and nothing else.

**No `HEADER_QUANTIFIER_EXEMPTIONS` key was made stale by the nine deletions.** The stale-entry half of that guard is green, so none of the deleted lines was an exemption key's match, and none of the four reconciled restatements changed a key's construct half or line context.

## The planted RED runs, with restore proofs

`cp` is aliased to `cp -i` in this environment and refuses to overwrite silently, so **every restore used `git checkout --` and every one was VERIFIED by re-reading rather than assumed**, then the tree proved clean by `git diff --exit-code -- packages/`.

### (A) A `.planning/` mention planted ABOVE raw line 419 — census RED, shadow pin GREEN in the same run

Baseline before the mutation: `196d20c test(01-46): a header census makes every '.planning/' mention listed…`

Planted at **line 25** (proved below the widest anchor's span start of 419):

```
// PLANTED-CENSUS-PROBE: this suite compares its output against `.planning/WINDOWS.md`.
```

```
AssertionError: 1 header line(s) name a file under ".planning/" and are DECLARED NOWHERE:
  packages/backend/src/outbound-prohibition.spec.ts:25
    // PLANTED-CENSUS-PROBE: this suite compares its output against `.planning/WINDOWS.md`.
YOU HAVE THREE DISPOSITIONS AND THEY ARE LISTED IN THE ORDER THIS FILE PREFERS THEM. …
: expected 1 to be +0
```

**In the same run:** `✓ the WIDEST ANCHOR SHADOW over the scanned surface is PINNED …` — the two guards discriminated exactly as designed. The count-balance case fired too, with its own distinct wording (`carries 9 matched line(s) while HEADER_PLANNING_MENTIONS declares 8`).

Restore: `git checkout --` → `grep -c 'PLANTED-CENSUS-PROBE'` = **0**; line 25 re-read as `//   SURFACES_FIRING_INTERCEPT = "proxy" — plugin-originated sends do NOT come`; header mentions back to **8**; `git diff --exit-code -- packages/` clean.

### (B) STALE ENTRY — one declared entry's text altered (`lives` → `lived`)

```
AssertionError: 1 HEADER_PLANNING_MENTIONS entr(ies) are STALE — they match NO line of the
censused header region, which is a DIFFERENT failure from an undeclared mention: nothing is
unlisted, a listing has outlived its line.
  DECLARED: // split reason lived there and in `.planning/STATE.md` (decision P9-D1).
    REASON: PROVENANCE POINTER. It records WHERE the 2026-08-21 CORE-01 -> CORE-11 retag was
    decided - in the ledger and as decision P9-D1 - and claims nothing about that file being read,
    compared or checked by anything here.
The line was rewrapped, moved below the sentinel, or deleted. Remove the entry in the SAME commit
that removed the line: a declared obligation matching nothing is the mirror image of an unlisted
mention, and this file has shipped that shape before.: expected 1 to be +0
```

Restored and verified (`grep -c 'split reason lived there'` = 0), tree clean.

### (C) DUPLICATE ENTRY — a second record with identical line text

```
AssertionError: 1 declared line text(s) appear more than once in HEADER_PLANNING_MENTIONS:
  x2  // split reason lives there and in `.planning/STATE.md` (decision P9-D1).
The list is a LIST rather than an object keyed by line text precisely so this is visible: a keyed
record would have swallowed the second entry and its reason without a word. Two header lines
carrying identical text are two mentions and need two lines in this file, or one of them needs
rewording so they are told apart.: expected 1 to be +0
```

The count-balance case fired alongside it with a message showing the opposite imbalance (`8 matched line(s) while HEADER_PLANNING_MENTIONS declares 9`). Restored and verified, tree clean.

### (D) EMPTY / TRIVIAL REASON

```
AssertionError: 1 HEADER_PLANNING_MENTIONS entr(ies) carry a reason shorter than 24 characters:
  // split reason lives there and in `.planning/STATE.md` (decision P9-D1).
    REASON GIVEN: "fine"
The reason is the entire product of this census — it is what a reviewer reads and DISAGREES with.
An empty string or a word is a declaration that the mention was waved through, and waving a
mention through is what CR-30 was. Write what the line actually says.: expected 1 to be +0
```

Restored and verified, tree clean; the gate re-ran at 448/448.

**The four messages are DISTINCT from one another and from the undeclared-mention message**: "are DECLARED NOWHERE" / "are STALE — … a listing has outlived its line" / "appear more than once" / "carry a reason shorter than 24 characters". Each names its own failure mode and its own remedy.

## The census docblock's reach statement, and whether it overstates the census

Quoted from the file:

> WHAT THIS CENSUS REACHES, AND THE THREE THINGS IT DOES NOT — STATED ON THE SAME TERMS AS POINTS 5(b) AND 5(c) OF THE DERIVED TEXT, AND DELIBERATELY WEAKER THAN THE GUARD RATHER THAN STRONGER.
> (a) IT REACHES THE HEADER AND NO FURTHER. The scanned region is line 1 up to but not including the line the exported `DERIVED_BEGIN` constant matches by FULL-LINE equality. Prose below the registry is not scanned by it at all.
> (b) IT MATCHES A PATH PREFIX AND NOTHING ELSE. A mechanism claim that names NO file is invisible to it. A sentence saying "a test compares this against the ledger of record" raises no obligation here.
> (c) IT MATCHES ONLY PATHS UNDER THE PLANNING DIRECTORY, SO A MECHANISM CLAIM ABOUT A FILE ELSEWHERE IN THE REPOSITORY IS INVISIBLE TO IT TOO. A false sentence claiming this suite reads a file under the backend package, or under the scripts directory, NAMES A FILE and still passes this census unseen. That is the same shape as CR-30 in a different directory, and it is disclosed here rather than left for a later round to find by moving one path.
> (d) IT DOES NOT ADJUDICATE WHETHER A DECLARED REASON IS A GOOD ONE. It makes the mention LISTED and REVIEWABLE, which is what converts an invisible claim into one a reader can read and DISAGREE with.

**It does not overstate the census in any respect.** BOTH blind spots are disclosed, not one: the no-file case in (b) and the file-outside-the-planning-directory case in (c). The matcher really is the planning-directory path prefix — the verify's own population count uses the same predicate (`awk 'NR<s && /\.planning\//'`) and agrees at 8 — so (c) is a statement about the matcher, not a hedge. (a) understates nothing: the boundary is the exported constant matched by full-line equality, which is WR-62's own remedy for the prefix locator that slid silently on this same boundary. (d) is the honest limit of an exemption list: it buys reviewability, not correctness.

## `WINDOWS.md` mentions, classified

`grep -c 'WINDOWS\.md'` over the gate spec returns **7**, not the 3 the plan's verify asserted. This is **finding F-1** (below) and the accounting is complete rather than convenient:

| Line | Class | Content |
|---|---|---|
| 745 | HEADER STATEMENT (the population) | wave 33's pointer-not-a-bound sentence — an ABSENCE, not a mechanism claim |
| 928 | HEADER STATEMENT (the population) | "carry a POINTER to those two and restate NO bound of their own", followed by "A PROHIBITION WITH NO MECHANICAL CHECK" |
| 945 | HEADER STATEMENT (the population) | wave 28's pointer-not-a-bound sentence — an ABSENCE |
| 11591 | CENSUS ENTRY | verbatim copy of line 745 |
| 11616 | CENSUS ENTRY | verbatim copy of line 928 |
| 11621 | CENSUS ENTRY | verbatim copy of line 945 |
| 11540 | CENSUS DOCBLOCK | the historical sentence recording that CR-30's clauses claimed a machine check on a file "No code in this repository has ever read" |

The three header statements are exactly the three the plan accounted for, and **each is a true statement about an unguarded surface rather than a mechanism claim**. Zero new mechanism claims were written. The three census entries are mechanically forced copies — the census's key IS the trimmed raw line — and each is proved to be a copy of a live header line by the census's own stale-entry case, which turns red the moment a declared text stops matching.

## The pin's emitted failure message, watched emitting with real values

Baseline before the mutation: `117eaff test(01-46): CR-31 — the pin's hand-written span arithmetic and opener locator deleted…`

Planted **two bare comment lines at 501–502**, inside raw `419..1551` and outside exclusion one (`949..1541`), in the middle of an existing contiguous `//` block so no new block is opened:

```
//    PLANTED-EMISSION-PROBE line one.
//    PLANTED-EMISSION-PROBE line two.
```

Full failure message, every new field populated with a real computed value:

```
AssertionError: THE WIDEST ANCHOR SHADOW IS NOW 542 SURFACE LINES AND THIS GATE PINS IT AT 540.
The anchor that owns it is "SPELLING (operator, by POSITION) RESOLVED BY REPORTS", spanning raw
lines 419..1553. RAW LINES 1135 over that span, of which EXCLUDED 593 are removed by the three
exclusions, leaving 542 SURFACE lines, 542 of which resolve to this anchor. ANCHOR WALK over that
span: 0 surface line(s) resolve to a DIFFERENT anchor - none - the whole surface of that span
resolves to this one anchor. Every one of those five figures is COMPUTED IN THIS RUN and none of
them is asserted; they replace the hand-written arithmetic CR-31 falsified. A SHADOW THAT GREW IS
A RESIDUAL THAT GREW: … : expected 542 to be 540
```

The arithmetic is internally consistent — 1135 − 593 = 542 — and the span endpoint moved 1551 → 1553 by exactly the two planted lines. The `ANCHOR WALK: 0` line is the DERIVED form of the sentence CR-31 falsified: where the comment used to assert by hand that "every surface line in that range resolves to the header", the run now computes it.

Restore: `git checkout --` → `grep -c 'PLANTED-EMISSION-PROBE'` = **0**, lines 501–502 re-read as their original content, `git diff --exit-code -- packages/` clean.

A second probe (a blank line plus a block-opening `//` line, reproducing pass 10's move (B) shape) was run to exercise the non-zero branch: the maximum's OWNER changed to the planted line and the walk again reported 0. See finding **F-2**.

## What was deleted from the pin's comment, and where each fact is now obtainable

| Deleted | Now obtainable from |
|---|---|
| the raw span `419..1549` | the message's `spanning raw lines ${lo}..${hi}` |
| the raw line count `1,131` | the message's `RAW LINES ${rawSpan}` |
| the excluded count `582` | the message's `EXCLUDED ${excludedInSpan}` |
| the subtraction `1131 - 582 = 549` | the message's surface count, computed as `rawSpan - excludedInSpan` |
| CR-31's `the /** docblock opener at 1573` | the message's `ANCHOR WALK` verdict, computed from `constructAnchorFor` |
| `It already holds FOUR shipped occurrences` | already pinned by the occurrence/exemption count equality elsewhere in this file — a second publication of one fact, not a fact |
| the anchor's own locator `` `:417` `` | `WIDEST_ANCHOR_TOKEN`, which the identity pin asserts, plus the printed span endpoints |
| `because 549 lines FIND it` | the pin; the sentence needed the FACT (one anchor owns the whole span) and not the figure |

**The replacement pointer line**, quoted, stating no number of its own:

> THE SPAN ARITHMETIC AND THE ANCHOR-WALK RESULT ARE NOT WRITTEN DOWN HERE, AND CR-31 IS WHY. … So the pin's own failure message COMPUTES and PRINTS the span, the raw count over it, the count exclusion one removes, the surface count and the anchor walk's verdict, at the moment it measures them. The anchor that owns the maximum is named by `WIDEST_ANCHOR_TOKEN` below and asserted by the identity pin, so it is not spelled as a line number either.
>
> THE EMISSION IS DELIBERATELY UNASSERTED. It is a diagnostic on the path that already fails, not a second rule: a new claim about this file's geometry made in the round that is removing one carries exactly the risk being removed.

**Confirmed: it states no number.** Four greps over the 70-line window above the declaration return zero for the raw span, `582`, `549|540` and the opener locator.

**NO `expect` WAS ADDED.** The pin's case carried **six** assertions before this task and carries **six** after — three non-vacuity, the width guard, the size pin and the identity pin (`grep -c 'expect('` over the 130 lines from the declaration = 6, both before and after).

**`constructAnchorFor` and its five recognisers are byte-unchanged**, shown by diff: the round diff contains zero lines matching `(DECLARATION =|FIXTURE_TITLE =|DOCBLOCK_OPEN =|isLineComment =|isRule =)` outside comments, so no predicate was lifted out of the function or reimplemented. The anchor walk CALLS `constructAnchorFor`; it does not re-derive it.

## The round's CLOSING baseline, executed rather than carried

| Value | Arrival | Exit | Attribution |
|---|---|---|---|
| `pnpm test` files | 31 | **31** | unchanged |
| `pnpm test` tests | 1390 | **1396** | +6: the census's six discharges (non-vacuity, undeclared, stale, count-balance, duplicate, reason-length) |
| gate spec alone | 442 | **448** | +6, the same six |
| `pnpm typecheck` / `tsc --build` | exit 0 | **exit 0** | — |
| `pnpm lint` | exit 0 | **exit 0** | — |
| `pnpm knip` | exit 0 | **exit 0** | — |
| `pnpm build:backend` | exit 0 | **exit 0** | — |
| `pnpm check:bundle` | 1 specifier, `crypto` | **1 specifier, `crypto`** | unchanged |
| module count | 23 | **23** | unchanged |
| `SURFACE_LINES.length` | 9252 | **9517** | +265: +49 (Task 1's constant, docblock and signature, all below exclusion one), +216 net from Task 2 and Task 3's census, entries, docblocks and emission code, minus the 9 deleted header lines |
| gate header lines | 957 | **948** | −9, the nine deleted lines |
| `WIDEST_ANCHOR_SHADOW` | 549 | **540** | −9, the same nine |

## The whole-round diff audit

```
ROUND-DELTA added=321 removed=58 net=263
packages/ files changed across the round = 1 : packages/backend/src/outbound-prohibition.spec.ts
scripts/ files changed = 0
auditSource-BYTE-IDENTICAL lines=1179
AST=0 HANDROLLED=0
PLAN-SCOPED non-phase planning files (f1ea4d0..HEAD) = 1 : .planning/REQUIREMENTS.md
ROUND-BASE-SCOPED count = 2 : .planning/REQUIREMENTS.md .planning/ROADMAP.md
```

**No file under `packages/*/src` other than the gate spec, and no file under `scripts/`, was touched.** `auditSource` is byte-identical to `1cb2884` over all 1179 of its lines. No compiler-API line and no hand-rolled containment spelling appears in the round diff.

**The `1cb2884`-scoped count is TWO and here is why**: the second member is `.planning/ROADMAP.md`, changed by the **plan-authoring commit `4f351d0`** (the wave 46/47 rows and the rewritten `**Plans**:` paragraph), not by this executor. The plan-scoped count from `$BASE_PLAN_START` is ONE and it is `REQUIREMENTS.md`. The number is accounted for rather than silently absorbed.

## Findings — reported, not fixed

### F-1 — The plan's `WM -eq 3` gate is unsatisfiable alongside the census the same plan mandates

Task 2's verify asserts `grep -c 'WINDOWS\.md'` over the gate spec equals 3. The census the same task mandates declares its population with **the trimmed raw line as the key** ("no normalization, no masking, no new key format"), so the three header lines naming `WINDOWS.md` are necessarily quoted verbatim inside the declaration. The two requirements cannot both hold. Measured value: **7** — 3 header statements, 3 mechanically forced verbatim copies, 1 historical sentence in the census docblock (full classification table above). **Zero new mechanism claims.** I did not contort the artifact to hit the number and I did not weaken the census; the classification above is the accounting the gate was reaching for, and it is mechanically stronger than a count, because the census's own stale-entry case turns red the instant a declared copy stops matching a live header line. Every other assertion in Task 2's verify passed.

### F-2 — The anchor walk's non-zero branch is not exercised by either planted mutation

The emitted `ANCHOR WALK` field carries a real computed value in every observed run, but that value was **0** in both probes. Two mutations were attempted: two comment lines inside an existing `//` block (shadow grew to 542, walk 0) and a blank line plus a block-opening `//` line reproducing pass 10's move (B) (the maximum's OWNER changed to the planted line, span `503..1553`, 458 surface lines, walk 0). The structural reason is that `constructAnchorFor` resolves to the nearest preceding accepted line, so the maximum shadow's `[lo, hi]` window tends to be a contiguous run of surface lines; both mutations SPLIT the shadow rather than interleaving it, and a split leaves the new maximum's own window homogeneous again. I am **not** claiming the branch is dead — the forward-walk correction (WR-53/CR-20(a)) can in principle make resolution non-monotonic — and I am not claiming it was watched. What the emitted `0` IS, and this is its point, is the DERIVED form of the exact sentence CR-31 falsified: the comment used to assert by hand that every surface line in that range resolves to the header; the run now computes it. The `!== 0` branch exists so that if the invariant ever breaks, the diagnostic names the offenders instead of printing a bare number.

### F-3 — A hand-written line range survives in a section label the census cannot see

`packages/backend/src/outbound-prohibition.spec.ts:9147` reads `// --- HEADER (1..956) ---`, a grouping label inside `HEADER_QUANTIFIER_EXEMPTIONS`. It was already off by one at arrival (the header was 957 lines) and Task 2's deletions moved the header to 948. It is a section divider carrying a hand-written line range with no mechanism watching it — the same class this round is closing, one level out — and it names no file, so blind spot (b) of the census's own disclosure covers it exactly. **I did not touch it**: this plan's Task 2 authorises the two named deletions and the four named restatement reconciliations, and nothing else in that region. Reported for verification pass 14 or a later round; the disposition I would recommend is DELETION of the range from the label (`// --- HEADER ---`), because the entries below it already say `HEADER.` in their own reasons.

## Decisions Made

- **The shipped sentinel names the two-argument call in WORDS, not by identifier.** The gate asserts the ledger carries no occurrence of `BYTE_COMPARED_SURFACES` ("THE GENERATED TEXT MUST NAME PATHS, NOT THE IDENTIFIER") while also requiring the BEGIN sentinel — which ships into the ledger — to name the two-argument call. Both hold only if the sentinel avoids the literal `deriveResidual(RESOLVER_REGISTRY`. It reads `generated by the TWO-ARGUMENT residual generator - the registry first, the byte-compared surface set second - in packages/backend/src/outbound-prohibition.spec.ts`. This is the right answer on the merits too: the ledger is a reader surface where a path is self-describing and an identifier is noise, and the sentinel still fails honestly if the call ever grows a third input. Inside the gate spec every spelling of the call is the exact two-argument form — `grep -o 'deriveResidual(RESOLVER_REGISTRY[^)]*)' | sort -u` returns exactly one line.
- **`BYTE_COMPARED_SURFACES` is `Object.freeze([...] as const)`** so the two index reads type as strings under `noUncheckedIndexedAccess` without a cast.
- **The generator takes the surface set as a parameter** rather than reading the module constant from inside its body, so the arity the sentinel names is checked by the compiler at both call sites.
- **`:417` was deleted along with the numbers.** It is a hand-written line-number locator in the very block CR-31 is about; the anchor is identified by `WIDEST_ANCHOR_TOKEN` (asserted by the identity pin) and by the span the failure message prints. This extends the plan's stated disposition by one line and is recorded here rather than done quietly.

## Deviations from Plan

**[Rule 3 — Blocker] Two prettier violations in the census code, fixed at the introducing commit**

- **Found during:** Task 2 (`pnpm lint` after the census was installed)
- **Issue:** `pnpm lint` runs `eslint .` with `prettier/prettier` enabled; two of the census's arrow-function arguments were formatted differently from prettier's output.
- **Fix:** `pnpm exec eslint --fix` on the gate spec only, +4 lines, all in the census block ~10,700 lines below the widest anchor's raw span. Re-ran the suite and the pin afterwards: 448/448, pin unchanged at 540, header unchanged at 948.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** `pnpm lint` exit 0, `pnpm typecheck` exit 0.
- **Commit:** `196d20c` (same commit — the fix ships with the code that needed it)

**[Reported, not fixed] F-1, F-2, F-3** — see the Findings section above.

**Total deviations:** 1 auto-fixed (Rule 3), 3 findings reported rather than fixed. **Impact:** none on the round's claims; the F-1 gate is the only assertion in any of the three verify blocks that did not pass, and its accounting is discharged in full above.

## CORE-11's checkbox — a plain statement

**I did not flip it, and I did not touch `CORE11_BOX_EXPECTED`.** Both are shown byte-unchanged by diff in both surfaces:

```
$ grep -c 'CORE11_BOX_EXPECTED = "- \[ \] \*\*CORE-11\*\*"' packages/backend/src/outbound-prohibition.spec.ts
1
$ grep -c '^- \[ \] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
1
```

**Do I believe the box is earned? Not yet, and criterion (3) is why.** Criteria (1) DERIVED and (2) DRIFT-DETECTABLE were already discharged at wave 27 and are strengthened here: the residual is generated from `RESOLVER_REGISTRY`, and as of this round the STATEMENT OF WHAT THE COMPARISON REACHES is generated from `BYTE_COMPARED_SURFACES` and byte-compared in both surfaces too — so the gate's description of its own reach is now drift-detectable rather than merely its description of the walk.

Criterion (3) — the disclosure is the only bound stated on every surface a reader touches, contradicted nowhere — **now holds within the two files this plan owns**: the pinned value appears exactly once in the gate spec, on its declaration; the two 574 sites are dated history stating no current bound; the ledger's machine-owned span carries the derived reach statement; and every `.planning/` mention left in the gate header is a listed, reasoned entry rather than an unexamined claim. **It does not yet hold across every surface a reader touches.** Plan 01-47 still owns four of them: `.planning/STATE.md:408`, `.planning/ROADMAP.md:239` and `01-SECURITY.md`'s five lines, all of which still publish the superseded 574 that `08345c3` left live while claiming "one bound, published once". Until those are reconciled, criterion (3) is unmet on the surfaces a reader is most likely to reach first, and `[ ]` is the correct outcome.

Verification pass 14 owns the decision; the constant and the ledger row change in ONE commit when they change.

## Known Stubs

None. No hardcoded empty value, placeholder string, TODO or FIXME was introduced by this plan, and no component was left unwired.

## Issues Encountered

None beyond the three findings and the one auto-fixed deviation recorded above.

## Next Phase Readiness

**Ready for `01-47`**, which owns the four surfaces outside this plan's `files_modified` — `.planning/STATE.md`, `.planning/ROADMAP.md` and `01-SECURITY.md` — and CR-32. Verification pass 14 owns CORE-11's box and finding F-3.

## Self-Check: PASSED

- Both modified files exist on disk.
- All three task commits resolve in `git log --all`: `40572fd`, `196d20c`, `117eaff`.
- Every `<acceptance_criteria>` item re-run at exit; the only assertion in any of the three verify blocks that did not pass is `WM -eq 3`, discharged as finding F-1 with a complete per-line classification.
- Plan-level `<verification>` re-run at exit: `pnpm test` 31 files / 1396 tests exit 0; `pnpm typecheck`, `pnpm lint`, `pnpm knip`, `pnpm build:backend` exit 0; `pnpm check:bundle` one import specifier, `crypto`; header 948; pin 540; identity pin byte-identical to `1cb2884`; `auditSource` byte-identical over 1179 lines; one file under `packages/`, nothing under `scripts/`, one non-phase planning file and it is `REQUIREMENTS.md`; `CORE11_BOX_EXPECTED` and the ledger row both `[ ]`; `git diff --exit-code -- packages/` clean.
