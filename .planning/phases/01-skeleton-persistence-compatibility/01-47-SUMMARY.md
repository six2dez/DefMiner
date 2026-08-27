---
phase: 01-skeleton-persistence-compatibility
plan: 47
subsystem: planning-surfaces
tags: [cr-32, bound-census, append-only-history, threat-register, broken-windows, one-bound-published-once]

requires:
  - phase: 01-46
    provides: "the re-derived shadow pin (WIDEST_ANCHOR_SHADOW = 540), the gate-file-internal census, and three findings its ownership gate forbade it filing"
provides:
  - "A repo-wide, positive-control-proved census of the shadow bound, classified LIVE / DATED HISTORY / HOMOGRAPH per site"
  - "STATE.md:408 amended by a dated pointer that names the sole publication and spells no figure, with the entry's own bytes untouched"
  - "ROADMAP.md's one present-tense clause deleted, its three dated-history figures kept byte-identical"
  - "01-SECURITY.md's three named rows re-adjudicated against evidence executed this session — and this plan's own prediction about them REFUTED"
  - "Three carried findings (F-1, F-2, F-3) filed into WINDOWS.md through the tool"
  - "The carried plan-checker census-scope finding resolved by remedy 2, in the bytes, before the gate ran"
affects: [verification-pass-14, CORE-11 adjudication, gap-closure round 13]

actuals:
  tokens: 9102
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Positive-control-first censusing: no matcher's zero is trusted until it has been proved non-vacuous against known-positive text"
    - "Adjacent pointer amendment: the amendment sits on the line below the entry it amends, not 101 lines away"

key-files:
  created: []
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/phases/01-skeleton-persistence-compatibility/01-SECURITY.md
    - .planning/WINDOWS.md
    - .planning/phases/01-skeleton-persistence-compatibility/01-47-PLAN.md

key-decisions:
  - "The three 01-SECURITY.md rows this plan predicted were LIVE are DATED HISTORY inside a kept-verbatim block, and were left byte-unchanged — the gate demanding otherwise is left RED and named rather than satisfied by destroying the record"
  - "Broken Windows: NO entry for the shadow bound (the plan's default, and correct); THREE entries for wave 46's carried findings, which this plan owns the ledger to file"
  - "The carried census-scope finding resolved by remedy 2 (name all three exclusions), applied before the gate ran so no executed gate was altered"

requirements-completed: []

status: complete
duration: 17 min
completed: 2026-08-27
---

# Phase 01 Plan 47: CR-32 across the sibling surfaces Summary

The shadow bound is reconciled on every surface outside the gate file by the discipline each
surface actually calls for — a dated pointer amendment that spells no figure in the append-only
history, deletion of the one live clause in the live index, re-adjudication against re-executed
evidence in the security register — and the plan's own central prediction about that register was
refuted by execution and reported rather than fitted to.

**Tasks:** 3/3. **Commits:** `968081a`, `6926f20`, `d6ff687`. **Code changed: none.**

---

## The headline, stated first because it is the finding

**This plan predicted that `01-SECURITY.md` carried three LIVE `open` threat rows asserting facts
about a tree four waves had superseded. Execution refutes the prediction.** The three claims *are*
false — every one was re-run and every one returned false. But the rows carrying them are not live:
all seven rows whose Status cell reads `open` sit inside a collapsed block whose own `<summary>`
reads *"Historical — the seven-row Open register as audited 2026-08-26 (superseded, kept verbatim)"*,
and all three were **already CLOSED with executed evidence on 2026-08-27** in the live closure table
above them. The file's live position is `threats_open: 0`, `status: secured`, and a
*Threat Register — Open* section reading **NONE.**

The consequence is stated plainly rather than engineered around: **Task 2's two `open`-scoped gates
read 1 and 3, not 0, and can only reach 0 by editing rows the file marks kept verbatim.** That is
precisely the harm `T-01-314` and `T-01-318` exist to prevent. The gate was left red, the rows left
byte-unchanged, and the disagreement written down. This is the same shape as wave 46's F-1, one
round later, in a different file.

---

## Task 1 — the repo-wide census, classified before anything was edited

### The matcher was proved before its zeroes were trusted

The first census command **returned zero and was wrong**:

```
$ git grep -nE '\b(540|549|574)\b' -- . | wc -l
0
$ git grep -cE '\b540\b' -- packages/backend/src/outbound-prohibition.spec.ts
(no output — zero)
```

Positive control, against a line known to carry the value:

```
$ grep -n 'WIDEST_ANCHOR_SHADOW = 540' packages/backend/src/outbound-prohibition.spec.ts
10252:  const WIDEST_ANCHOR_SHADOW = 540;
$ git grep -cP '\b540\b' -- packages/backend/src/outbound-prohibition.spec.ts
packages/backend/src/outbound-prohibition.spec.ts:1
$ grep -cE '\b540\b' packages/backend/src/outbound-prohibition.spec.ts
1
```

**`git grep -E` silently drops `\b` on this platform** (BSD `regcomp`); system `grep -E` honours it.
A census run with that matcher would have reported a clean repo having searched nothing. This is a
tooling instance of the phase's signature defect and it is recorded rather than quietly worked around.

### The census, as run

```
$ git ls-files -z | xargs -0 grep -nE '\b(540|549|574)\b'          # 437 hits, 28 files
$ git ls-files -z | xargs -0 grep -nE '419\.\.1[0-9]{3}|\b1,?155\b|\b8,?846\b|\b9,?277\b'
```

**Run repo-wide over every tracked file, not over the four surfaces this plan named.** 437 raw digit
hits; 149 claim-bearing under
`shadow|surface line|WIDEST_ANCHOR|raw 419|widest anchor`.

**No fifth surface exists.** Outside the gate file, this round's own `01-46`/`01-47` artifacts, and
prior waves' dated PLAN/SUMMARY/REVIEW/VERIFICATION records, the claim-bearing hits fall in exactly
three files — `.planning/STATE.md`, `.planning/ROADMAP.md`,
`01-SECURITY.md` — which are the three this plan named. The search was wider than the four; the
answer is that the four were complete.

### Pass 13's criteria, quoted rather than paraphrased

From `01-VERIFICATION.md:140-148`:

> `574` survives at exactly two, both dated and attributed, both defensible … *"History. Attributed
> to a named pass, past tense. Reproduces against that pass's tree."* … **The historical/live split
> is defensible, not a convenient exemption: both surviving uses name the pass that measured them and
> neither states a current bound. Rewriting them would destroy the record.**

And, on the live side, `01-VERIFICATION.md:149`:

> **Outside the gate file the answer is no** … `.planning/STATE.md:408` still says
> `is republished as ... 574 surface lines ... raw 419..1574`, **present tense, undated, unpointed**.

### The classification table

| File | Line | Text (abridged) | Class | Reason | Owner |
|---|---|---|---|---|---|
| `.planning/STATE.md` | 408 | "The interchangeability residual **is** republished … **574** surface lines at the header row `:417`, **raw 419..1574**" | **LIVE** | Present tense; a reader takes it as a fact about the tree they are on. Pass 13's CR-32. | Task 1 — amended by pointer, bytes untouched |
| `.planning/STATE.md` | 307 | "…re-derived the widest-anchor-shadow pin **574 -> 549** … THIS AMENDMENT POINTS AND STATES NO BOUND" | **DATED HISTORY** | Names commit `08345c3` and pass 12, past tense, records a transition rather than a current bound. | KEPT byte-unchanged |
| `.planning/STATE.md` | 409 (now 410) | "…re-run at wave 42 and stayed GREEN … a SHRINK (**574**->567)" | **DATED HISTORY** | Names wave 42 and pass 10, past tense, states no current bound. | KEPT byte-unchanged |
| `.planning/ROADMAP.md` | 239 | "…**measured with the live builder over all 8,846 surface lines the widest is `:417`'s at 574 surface lines / 1,155 raw**, already holding FOUR shipped occurrences." | **LIVE** | Present tense; carries the width, the raw span **and** the surface total in one clause. The only live one in the file. | Task 2 — DELETED |
| `.planning/ROADMAP.md` | 70 | "CR-26 (the **574**-line shadow … **FELL TO 284** under a two-line edit…)" | **DATED HISTORY** | Past tense, names CR-26 and the round. | KEPT byte-identical |
| `.planning/ROADMAP.md` | 251 | "pass 11 **held** the maximum at **574** … **FELL 574 → 284** … at `882ff17` pass 11's decoy slid that endpoint and only the **574** pin fired" | **DATED HISTORY** | Past tense throughout, names the pass and the commit. | KEPT byte-identical |
| `.planning/ROADMAP.md` | 243 | "`SURFACE_LINES` **8846** → 8742, measured from inside the suite" | **DATED HISTORY** (surface total) | Pass 10's decoy measurement, past tense. **Spelt WITHOUT the comma** — a pattern written only for `8,846` misses it, and a gate demanding zero across both spellings destroys it. WR-61 did not falsify this one. | KEPT byte-identical |
| `01-SECURITY.md` | 99 | "an inserted or deleted line moves anchors, exclusion endpoints and the **574**-line shadow" | **LIVE** | Present tense, general statement about the file's current geometry, figure now false. | Task 2 — figure DELETED, dated |
| `01-SECURITY.md` | 150 (now 153) | "291 filler lines holding the maximum at **574** on a different owner" | **DATED HISTORY** | Inside a `**CLOSED**` evidence row; pass 11's geometry, past tense. | KEPT byte-unchanged |
| `01-SECURITY.md` | 170/171/174 (now 209/210/213) | the three `open` rows: "**Nothing pins it.**", "`WIDEST_ANCHOR_SHADOW = 574` at `:10204`", "may grow to **573** … the maximum (**574**)" | **DATED HISTORY** | **Contrary to this plan's prediction.** Inside `<details>` … *"superseded, kept verbatim"*; each already CLOSED above; `threats_open: 0`. | Task 2 — left BYTE-UNCHANGED, re-adjudicated beside them |
| gate spec | 10252 | `const WIDEST_ANCHOR_SHADOW = 540;` | **LIVE — and it is the sole publication** | This is the pin. | untouched (this plan owns no code) |
| gate spec | 10213 | "pass 11 measured the named shadow falling from **574** to 284 at 441 of 441 green" | **DATED HISTORY** | Pass 13 adjudicated this exact site. | untouched |
| gate spec | 10353 | "RESULT: the pin reported — but it reported a SHRINK, **574 -> 567**" | **DATED HISTORY** | Pass 13 adjudicated this exact site. | untouched |

### Every HOMOGRAPH, named with its reason

The closing gate's raw digit list, printed for adjudication (`n=3`), and every hit accounted for here:

| File | Line | Text | Why it is NOT a bound |
|---|---|---|---|
| `01-05-SUMMARY.md` | 228 | "The test count moved from 22 files / 473 tests to 25 files / **540** tests." | A **test count** from plan 01-05. Nothing to do with an anchor shadow. |
| `01-05-SUMMARY.md` | 320 | "`pnpm test` \| 25 files / **540** tests pass (baseline was 22 / 473)" | The same test count in table form. |
| `01-REVIEW.md` | 757 | "`consumer.ts:540-543` computes `due` from `processedForSweep % RETENTION_SWEEP_EVERY_N`" | A **source line-number citation** in a different file. |

Beyond the gate's scope, the repo-wide census surfaces one further homograph class worth naming so a
future digit-anchored census is not surprised by it: **160 hits across four Phase-00 spike result
files** (`spike-04-runs/04b-journal.json`, `save-true-journal.json`, `retain-control-journal.json`
and four `*-batches.jsonl`, plus `runs/…/drain-blocked.jsonl`) — byte counts, row counts and
timestamps in recorded spike telemetry. None is a claim about anything; none matches the claim
matcher. **A bare word-bounded digit search over this tree returns 437 hits and 3 bounds.**

### The STATE.md amendment, quoted verbatim

Inserted as **one new line at `:409`**, directly below the entry it amends:

> **POINTER AMENDMENT 2026-08-27 (gap-closure round 12, plan 01-47, wave 47) — REACHING ONLY THE
> ENTRY DIRECTLY ABOVE, WHOSE BYTES ARE LEFT UNCHANGED AND ARE ASSERTED SO AGAINST THE ROUND BASE BY
> THIS PLAN'S VERIFY.** THIS AMENDMENT POINTS AND SPELLS NO FIGURE. The entry above publishes the
> shadow's width, its header row and its raw span in the PRESENT TENSE, undated and unpointed;
> verification pass 13 filed exactly that as CR-32, and its figures have since been superseded twice
> — by commit `08345c3` (gap-closure round 11), which re-derived the pin against a deletion-only
> commit attributed line by line, and again by plan 01-46 (gap-closure round 12, wave 46, commit
> `196d20c`), which re-derived it against that round's own deletions. THE SOLE PUBLICATION OF THE
> LIVE VALUE IS `WIDEST_ANCHOR_SHADOW` in `packages/backend/src/outbound-prohibition.spec.ts`,
> asserted by EXACT EQUALITY against a width COMPUTED IN THE RUN, inside the case titled "the WIDEST
> ANCHOR SHADOW over the scanned surface is PINNED", beside `WIDEST_ANCHOR_TOKEN`, which pins the
> owning anchor's IDENTITY in the same form. Read the value there. It is deliberately not written
> here, and it must not be copied here. THIS IS EXPLICITLY NOT THE FORM OF THE AMENDMENT AT `:307`,
> AND A LATER READER MUST NOT HARMONISE THE TWO: that one DOES spell a superseded transition, which
> is correct for it — it is a dated record of what verification pass 12 found and it stays
> byte-unchanged — but it is not a precedent for restating a bound. A pointer that spells a figure is
> one more hand-written copy of a number nothing compares, and it goes stale on the next commit that
> moves a line; that is the mechanism which produced CR-31 inside the very commit closing CR-29. THE
> POINTER-NOT-A-BOUND RULE STILL HAS NO MECHANICAL CHECK HERE: this file is CLASS ONE UNGUARDED per
> `01-VERIFICATION.md`'s surface table, nothing byte-compares this line to anything, and saying so is
> the whole of the guarantee available on this surface.

**Proof it names the publication, carries a date, and spells no figure:**

```
$ git diff -- .planning/STATE.md | grep '^+[^+]' | grep -cE '\b(540|549|574)\b'
0
$ git diff -- .planning/STATE.md | grep '^+[^+]' | grep -c 'WIDEST_ANCHOR_SHADOW'
1
$ git diff -- .planning/STATE.md | grep '^+[^+]' | grep -cE '2026-08-2[0-9]'
1
$ git diff -- .planning/STATE.md | grep -c '^+[^+]'   # added lines
1
$ git diff -- .planning/STATE.md | grep -c '^-[^-]'   # deleted lines
0
```

**Amended, not rewritten** — the entry's own bytes, diffed against the round base `1cb2884`:

```
$ git show 1cb2884:.planning/STATE.md | grep 'The interchangeability residual is republished' > base
$ grep 'The interchangeability residual is republished' .planning/STATE.md > work
$ diff base work && echo SUPERSEDED-ENTRY-BYTE-UNCHANGED
SUPERSEDED-ENTRY-BYTE-UNCHANGED
```

### Where this amendment DEPARTS from `d3a139d`'s form at `:307`

Two departures, both deliberate and both stated inside the amendment's own bytes so a later reader
cannot harmonise them:

1. **`:307` SPELLS A FIGURE** — *"re-derived the widest-anchor-shadow pin 574 -> 549"*. This one
   spells none. `:307`'s figure is correct **for `:307`**: it is a dated record of a transition
   verification pass 12 observed, and it stays byte-unchanged. It is not a precedent for restating a
   live bound, and a pointer that spells one is a fourth hand-written copy of a number nothing
   compares.
2. **`:307`'s amendment is 101 lines away from the entry CR-32 is about, and appended *inside* the
   amended line.** This one is a **new line inserted directly below** its entry. Adjacency is the
   point — CR-32's own text is that `d3a139d` *"is the correct precedent, applied to the wrong
   entry."* Insertion rather than in-line appending is what keeps `:408` byte-identical.

### Counter discipline

**No counter was written by this plan, and that is a deviation from the plan's own instruction,
recorded rather than resolved silently.** The plan directs the executor to set STATE.md's counters
from the PLAN/SUMMARY file count on disk. The orchestrator's dispatch explicitly reserves all
phase-progress bookkeeping in `STATE.md` and `ROADMAP.md` to itself. The orchestrator's instruction
governs; `state.advance-plan` and `state.update-progress` were **not** run.

The count that cannot drift is recorded here for whoever does write it:

```
$ ls .planning/phases/01-skeleton-persistence-compatibility/*-PLAN.md | wc -l      → 47
$ ls .planning/phases/01-skeleton-persistence-compatibility/*-SUMMARY.md | wc -l   → 46  (47 with this file)
```

### The pin, read from the file rather than from any plan

```
CODE-BYTE-IDENTICAL-SINCE-01-46 4348369
PIN-INVARIANT=540
```

`packages/` and `scripts/` byte-identical to plan 01-46's exit commit; the pin reads what 01-46 left
it reading. **Task 1 verify: exit 0.**

---

## Task 2 — ROADMAP.md deleted, 01-SECURITY.md re-adjudicated

### ROADMAP.md — the prediction held, and was measured before it was trusted

**Counts at plan 01-46's exit, measured not assumed:**

```
figure lines  (540|549|574)            : 3   → :70, :239, :251
surface-total (8,846|8846|9,277|9277)  : 2   → :239, :243
live clause "measured with the live builder over all" : 1
```

The clause was located **by text** and deleted:

> ~~and measured with the live builder over all 8,846 surface lines the widest is `` `:417` ``'s at
> 574 surface lines / 1,155 raw, already holding FOUR shipped occurrences.~~

replaced by, in the same row, which keeps its description of what plan 01-42 delivered:

> and the widest was measured with the live builder over the whole scanned surface and pinned. ITS
> WIDTH, ITS OWNING ANCHOR, ITS RAW SPAN AND THE SURFACE TOTAL ARE DELETED FROM THIS ROW RATHER THAN
> CORRECTED IN IT (2026-08-27, gap-closure round 12, plan 01-47, CR-32): the width is published by
> `WIDEST_ANCHOR_SHADOW` in `packages/backend/src/outbound-prohibition.spec.ts` and the owning anchor
> by `WIDEST_ANCHOR_TOKEN` beside it, and a corrected figure here would be a second publication that
> goes stale on the next commit moving a line — which is what this one did.

**Counts after, and the survivors proved byte-identical:**

```
ROADMAP-BASE-AT-01-46-EXIT figure_lines=3 surface_lines=2
ROADMAP-LIVE-CLAUSE-GONE-DATED-HISTORY-INTACT figures=2/3 surface=1/2
survivor figure lines NOT byte-identical to a base line       : 0
survivor surface-total lines NOT byte-identical to a base line: 0
"574 surface lines"                : 0
row `01-42-PLAN.md` still present  : 1
```

**Zero was never the target.** The two surviving figure lines and the one surviving surface-total
line are dated history and are quoted with the reason:

- `:70` — *"CR-26 (the 574-line shadow … **FELL TO 284** under a two-line edit at full-suite green…)"*
  — past tense, names CR-26 and its round, states no current bound.
- `:251` — *"pass 11 **held** the maximum at 574 with 291 filler lines"*, *"**FELL** 574 → 284"*,
  *"at `882ff17` pass 11's decoy slid that endpoint and only the 574 pin fired"* — past tense
  throughout, names the pass and the commit.
- `:243` — *"`SURFACE_LINES` **8846** → 8742, measured from inside the suite"* — pass 10's decoy
  measurement, past tense. **Spelt without the comma.**

### The surface total, on its own terms

The live clause published `8,846` as the count of scanned surface lines. **WR-61 already re-measured
that total to 9,277**, so the row had been wrong about the surface total for longer than it had been
wrong about the width. **The disposition was deletion, not the corrected value**, because a
replacement total is authored rather than derived: `SURFACE_LINES` is computed inside the suite and
moves whenever the file's line population moves — the round-12 arrival baseline recorded it at
`9252`, already different from WR-61's figure. A corrected number here would have gone stale exactly
the way WR-61's did.

The **second** surface-total site, `:243`'s `8846`, is a different thing entirely: pass 10's decoy
measurement, past tense, naming the instrument (*"measured from inside the suite"*). **WR-61 did not
falsify it** — it records what `SURFACE_LINES` read at that commit, which remains true of that
commit. It is spelt **without the comma**, which is exactly the homograph a plan-checker missed and
said so; a pattern written only for `8,846` misses it in one direction, and a gate demanding zero
over both spellings destroys it in the other.

### 01-SECURITY.md — each row re-executed BEFORE it was touched

**`T-01-264` — "Nothing pins it."**

```
$ grep -n 'WIDEST_ANCHOR_SHADOW' packages/backend/src/outbound-prohibition.spec.ts
10252:  const WIDEST_ANCHOR_SHADOW = 540;
10326:      `THE WIDEST ANCHOR SHADOW IS NOW ${widestSize} SURFACE LINES AND THIS GATE PINS IT AT …`
10327:    ).toBe(WIDEST_ANCHOR_SHADOW);
$ grep -n 'WIDEST_ANCHOR_TOKEN' packages/backend/src/outbound-prohibition.spec.ts
10253:  const WIDEST_ANCHOR_TOKEN =
10330:      `THE WIDEST ANCHOR SHADOW EXPECTED OWNER … BUT FOUND …`
10331:    ).toBe(WIDEST_ANCHOR_TOKEN);
$ for n in 9097 9390 10162 10198 10624 10651; do sed -n "${n}p" …; done
9097:  *     the reach of the fix for that exact defect.
9390:  * The verifier deleted the table cell one exemption was written for, planted a
10162:       ).toBeGreaterThan(0);
10198:   // 10 measured the shadow with the live builder and moved the occurrence at
10624:         expect(
10651:         ? ""
```

**What pins the size:** `WIDEST_ANCHOR_SHADOW`, asserted by **exact equality** against a width
computed in the run. **What pins the identity:** `WIDEST_ANCHOR_TOKEN`, asserted by exact equality
against the anchor owning the maximum. **Which assertions:** both `.toBe(...)` inside the case titled
*"the WIDEST ANCHOR SHADOW over the scanned surface is PINNED"*. **Which waves installed them:**
size at wave 42, identity at wave 45. **All six cited line numbers now land on unrelated bytes.**
The claim is **FALSE**.

**`T-01-280` — "`WIDEST_ANCHOR_SHADOW = 574` at `:10204`"**

```
$ grep -n 'WIDEST_ANCHOR_SHADOW = 574' packages/backend/src/outbound-prohibition.spec.ts
(0 hits)
$ sed -n '10204p' packages/backend/src/outbound-prohibition.spec.ts
  // The uniqueness census asserts that an anchor IN USE has exactly ONE PRODUCER
$ grep -c 'WHICH PINS THE MAXIMUM ONLY' packages/backend/src/outbound-prohibition.spec.ts
1
```

The quoted constant value no longer exists and the cited line is unrelated. The file still admits its
size pin is a maximum only — and the identity pin, installed at wave 45, is what now catches the row's
scenario. **FALSE.**

**`T-01-286` — "`:10174` says a non-maximal shadow may grow to 573"**

```
$ grep -n 'grow to 573' packages/backend/src/outbound-prohibition.spec.ts
(0 hits)
$ grep -n '573' packages/backend/src/outbound-prohibition.spec.ts
(0 hits — file-wide)
```

**Stronger than the closure record above it claims.** That record measured `573` at exactly one
surviving site, the `1573` inside `raw 419..1574` in the pin's hand-written span arithmetic — and
plan 01-46 deleted that arithmetic closing CR-31, so the digit is now gone entirely. **FALSE, and its
closure evidence is now stronger than when it was written.**

### The disposition, per row — and why it is not what the plan predicted

All three claims are false. **None of the three rows was edited.** Reason, measured:

```
$ grep -nE '^#{1,4} |^<details>|^<summary>' 01-SECURITY.md
 61:## Threat Register — Open                    →  reads "**NONE.** `threats_open: 0` as of 2026-08-27."
136:## Round-11 Closure — re-audit 2026-08-27    →  T-01-264, T-01-280, T-01-286 all **CLOSED** with evidence
161:<details>
162:<summary>Historical — the seven-row Open register as audited 2026-08-26 (superseded, kept verbatim)</summary>
193:</details>
$ grep -nE '\|[[:space:]]*open' 01-SECURITY.md | cut -d: -f1
168 169 170 171 172 173 174        ← every one inside 161..193
```

`open`-row status is part of a **dated snapshot**: it records what each status *was* on 2026-08-26.
Editing those cells would falsify *kept verbatim* and destroy the record of what was believed and
when. **The rows are DATED HISTORY, and constraint 6 keeps them.** Proof they are untouched:

```
HISTORICAL-OPEN-ROWS-BYTE-UNCHANGED (7 rows)
```

**What was done instead**, all of it *outside* the verbatim block:

- **`:99`'s live figure DELETED, dated.** *"an inserted or deleted line moves anchors, exclusion
  endpoints and the widest anchor's shadow — whose width `WIDEST_ANCHOR_SHADOW` in the gate spec
  publishes and this sentence deliberately does not (figure deleted 2026-08-27, gap-closure round 12,
  plan 01-47, CR-32…)"*.
- **A dated `## Re-adjudication 2026-08-27` section added above the historical block**, carrying the
  three re-executions in table form, **citing constants, assertions and case titles rather than
  gate-file line numbers** — every line number these rows carry has moved twice.
- **A pointer, outside the block**, telling a reader (and a `grep` for `| open |`) that the Status
  column below is a 2026-08-26 snapshot, and naming the weakness that its supersession marker sits on
  the container rather than on the rows.

### The gates that were left red, named rather than satisfied

```
NOPIN ("Nothing pins it" on a row whose Status reads open) : 1   (expected 0)
STALE (T-01-264/280/286 open rows citing a gate-file line) : 3   (expected 0)
```

**Task 2 verify: exit 1, at `NOPIN`.** Both failing checks are on rows inside the kept-verbatim block.
Everything downstream was then measured in an instrumented run (the two assertions turned into
reports; **no matcher, filter or threshold altered**) and **all of it passes**:

```
ROADMAP-BASE-AT-01-46-EXIT figure_lines=3 surface_lines=2
ROADMAP-LIVE-CLAUSE-GONE-DATED-HISTORY-INTACT figures=2/3 surface=1/2
DATED-CLOSED-ROWS-INTACT base=6 work=6   (set containment; 0 pre-existing rows lost)
SCPROBE positive control ≥1 (non-vacuous); SCN (540 as a bound in this file) = 0
dated correction lines added = 5; OTHER = 0; REQUIREMENTS.md unchanged; CBX = 1
TASK2-TREE-CLEAN
```

**Every site edited in this task has a classification row in Task 1's table.** No site was edited
without a reason recorded first.

---

## Task 3 — closing baseline, ledger decision, criterion (3)

### The baseline, reconciled line by line against plan 01-46's exit

| Measure | 01-46 exit | Now | Verdict |
|---|---|---|---|
| `pnpm test` | 31 files / 1396 (arrival 1390) | **31 files / 1396 passed**, exit 0 | unchanged |
| gate spec alone | 448 (arrival 442) | **448 passed**, exit 0 | unchanged |
| `tsc --build`, `typecheck` | 0 | **0** | unchanged |
| `lint` | 0 | **0** | unchanged |
| `knip` | 0 | **0** | unchanged |
| `build:backend` | 0 | **0** (`ESM packages/backend/dist/index.js 64.21 KB`) | unchanged |
| `check:bundle` | one specifier | **`packages/backend/dist/index.js: 1 import specifier(s): crypto`** | unchanged |
| module count | 23 | **23** | unchanged |
| `WIDEST_ANCHOR_SHADOW` | 540 | **540** | invariant |
| `auditSource` | — | **byte-identical across the round, 1179 lines** | unchanged |

**No figure moved. This plan touched no code, and the numbers say so rather than being assumed to.**

### One bound, published once — proved repo-wide

```
CLAIM-MATCHER-NON-VACUOUS positive_control_hits=3
ONE-BOUND-PUBLISHED-ONCE-REPO-WIDE pin=540 gate_sites=1 claim_sites=0 digit_homographs=3
```

The positive control was asserted **before** the zero was trusted — a matcher that finds nothing
proves nothing. All three digit homographs are enumerated in Task 1's table above.

### The Broken Windows decision, made explicitly

**NO entry for the shadow bound.** The plan's default, and it is correct: the ledger already points at
the gate file's derived residual, this round did not change what it points at — it changed which files
claim to be compared to it, about which the ledger makes no claim — and by entry 32's own
pointer-not-a-copy rule an entry restating the bound is exactly what must not be written.

**THREE entries for wave 46's carried findings, because this plan owns the ledger and wave 46 did
not.** Wave 46 measured F-1, F-2 and F-3 and could not file them; leaving them in a summary is
"a decision made by not making it". All three were **re-verified here before filing** and all went
through the tool, never by hand — entry 26 exists because entry 25 was hand-written:

```
$ node gsd-tools.cjs windows append --kind unmet-truth  --phase 01 --file packages/backend/src/outbound-prohibition.spec.ts --line 9147  --description "F-3 …"
$ node gsd-tools.cjs windows append --kind unrun-verify --phase 01 --file packages/backend/src/outbound-prohibition.spec.ts --line 10314 --description "F-2 …"
$ node gsd-tools.cjs windows append --kind deviation    --phase 01 --file …/01-SECURITY.md --line 168 --description "F-1 class …"
WINDOWS-ENTRY-RECORDED open=25 total=47 rows=47
```

- **45 `unmet-truth` — F-3, CONFIRMED and sharper than reported.** `:9147` reads
  `// --- HEADER (1..956) ---` while the `BEGIN DERIVED RESIDUAL` sentinel sits at **949**, so the
  header extent is **1..948**. It is a live section divider inside `HEADER_QUANTIFIER_EXEMPTIONS`,
  not a fixture comment. Off by **one** on arrival (header was 957) and off by **eight** now; the
  nine-line move is what flipped it. A hand-written bound in the gate file's live bytes reached by no
  mechanical check — the signature defect, one more instance.
- **46 `unrun-verify` — F-2, confirmed.** The anchor walk builds a `foreign` list and renders a
  zero branch and a non-zero branch; neither of wave 46's planted mutations exercised the non-zero
  one, so the path a reader would meet on a real split shadow has never been watched. It is a
  failure-message path, not an assertion, and it is recorded as unwatched rather than claimed as
  guarded.
- **47 `deviation` — F-1's CLASS, which this plan then hit itself.** A gate that can only go green by
  mutating an artifact marked kept-verbatim. Two executors, two rounds, two refusals to fit the
  artifact to the gate. **The gates, not the artifacts, are what need revising.**

### The carried plan-checker finding — resolved, and which way

**Remedy 2 chosen: all three exclusions are named in the census's own failure message**, applied
**in the bytes** of `01-47-PLAN.md` **before Task 3's gate ran**, so no already-executed gate was
altered (only Task 3's block carries `RAW`; Tasks 1 and 2 had already run against untouched bytes).

The message now reads *"OUTSIDE THE THREE EXCLUSIONS THIS FILTER ACTUALLY MAKES — THIS ROUND'S OWN
`01-46-*`/`01-47-*` PLANS AND SUMMARIES, ROUND 11'S `01-45-*`, AND `01-VERIFICATION.md`"*.

**The change is message-only, proved rather than asserted:** every matcher, filter and threshold
appears identically on both sides of the diff —

```
2 CLAIM='shadow|surface line|WIDEST_ANCHOR|raw 419|widest anchor'
2 grep -rnE "\b${PIN}\b"
2 grep -v 'phases/01-skeleton-persistence-compatibility/01-4[567]-'
2 grep -v '01-VERIFICATION.md'
2 [ "$REPO" -eq 0 ]
```

**And the zero impact was measured, not inherited.** With all three exclusions **removed**, the
claim-bearing hit count is 25, and all 25 sit in `01-46-PLAN.md` (12), `01-46-SUMMARY.md` (12) and
`01-47-PLAN.md` (1). **Round 11's `01-45-*` and `01-VERIFICATION.md` contribute ZERO** — the
plan-checker's measurement confirmed independently.

**One correction to the finding itself, reported not fixed:** it says the `RAW` filter appears "in
this plan's task 1 and task 3 `<automated>` blocks". Measured — `[False, False, True]` — **only
task 3 carries it.** The finding is one block wider than the code it describes, which is the same
one-level-out shape it was filed about.

### Whole-round diff audit, across BOTH plans (`1cb2884..HEAD`)

```
packages/  : 1 file   (packages/backend/src/outbound-prohibition.spec.ts — all of it plan 01-46's)
scripts/   : 0 files
non-phase planning: .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/STATE.md .planning/WINDOWS.md   (4, the limit)
phase dir  : 01-46-PLAN.md, 01-46-SUMMARY.md, 01-47-PLAN.md, 01-SECURITY.md
auditSource-BYTE-IDENTICAL-ACROSS-ROUND lines=1179
```

**Task 3 verify: exit 0.**

---

## Criterion (3), answered surface by surface — with everything still unguarded NAMED

*Is the disclosure the only bound stated on every surface a reader touches, contradicted nowhere?*
**Not yet — and the residual is one line, by design.**

| # | Surface (pass 13's enumeration) | What this round did | What remains unguarded |
|---|---|---|---|
| 1 | gate file header prose (1..948) | Nothing — this plan owns no code | **`:9147` states `HEADER (1..956)` and the header is `1..948`.** Filed as WINDOWS 45. Reached only by wave 33's phrase-list guard. |
| 2 | gate file prose below the registry | Nothing | Two `574` sites remain, **both DATED HISTORY**, both adjudicated by pass 13 and re-confirmed here. F-2's unwatched report branch (WINDOWS 46). Same phrase-list reach. |
| 3 | `REQUIREMENTS.md` above the sentinel | Nothing — **byte-unchanged, verified** | Unchanged: only `:46`'s opening bytes are pinned, by `CORE11_BOX_EXPECTED`. Zero shadow figures present. |
| 4 | `.planning/STATE.md` | `:408` amended by an adjacent dated pointer that spells no figure; entry byte-identical | **`:408` STILL READS PRESENT-TENSE AND FALSE.** A reader who takes the line and not the one below it meets a superseded bound. That is the unavoidable cost of an append-only history and it is named, not hidden. The file remains **CLASS ONE UNGUARDED** — nothing byte-compares any line in it. |
| 5 | `.planning/WINDOWS.md` | Three carried findings filed through the tool | Carries **zero** shadow figures (measured). Still CLASS ONE UNGUARDED; CR-30 was the finding that the gate file falsely claimed a machine check here, and that claim is gone, but no check replaced it. |
| 6 | `.planning/ROADMAP.md` | The one live clause **deleted**; three dated-history figures kept byte-identical | **Nothing live remains.** The three survivors are past-tense and named. Unguarded by machine, as before. |
| 7 | phase artifacts | `01-SECURITY.md:99`'s live figure deleted; three rows re-adjudicated with executed evidence; verbatim block untouched and pointed at | `01-UAT.md`: zero figures. `01-REVIEW.md:757`: a homograph, not a bound. **`01-SECURITY.md`'s seven `open`-status rows still read `open` to a grep**, mitigated by a pointer but not by a marker on each row. Prior waves' PLAN/SUMMARY files are dated by construction. |

**The plain answer.** The live pinned value is published **as a bound on exactly one line in the
entire repository** — the pin declaration — and on **zero** planning lines outside this round's own
artifacts. Every surviving `574` and `549` is dated history that names the pass which measured it.
**But criterion (3) says "contradicted nowhere", and `.planning/STATE.md:408` still contradicts it in
the present tense**, one line above the amendment that supersedes it. Deleting it would destroy the
append-only record; that trade was made deliberately and is the single named residual.

---

## CORE-11's checkbox

**NOT TOUCHED, on either surface, and shown so:**

```
packages/backend/src/outbound-prohibition.spec.ts:11471:  const CORE11_BOX_EXPECTED = "- [ ] **CORE-11**";
.planning/REQUIREMENTS.md:46:- [ ] **CORE-11**: No code that ships in the plugin issues an outbound network request …
REQUIREMENTS.md changed by plan 01-47: NO (byte-unchanged since plan 01-46's exit)
```

**Do I believe the box discharges? Not on this round's evidence, and I would not flip it.** The
2026-08-25 bar is DERIVED, DRIFT-DETECTABLE, SOLE BOUND. The first two hold. The third does not yet:
`STATE.md:408` still states a superseded bound in the present tense, and `:9147` in the gate file's
own live bytes states a header range that is false by eight lines. Both are hand-written, both are
unreached by any machine check, and criterion (3) asks for a disclosure *contradicted nowhere*.
**Verification pass 14 owns the decision; this is a report, not a flip.**

---

## Deviations from Plan

**1. [Rule 3 - Blocker] An untracked harness artifact would have redded every gate.**
- **Found during:** pre-Task-1 precondition check.
- **Issue:** `git status --porcelain` returned `?? .gsd/` (a run-scoped
  `dispatch-isolation-sentinel.json` created by the orchestrator this session). Every task's verify
  asserts a clean porcelain.
- **Fix:** the pattern was added to **`.git/info/exclude`**, which is local-only and untracked.
  Adding it to `.gitignore` would have been a tracked-file change outside this plan's ownership,
  tripping the `OTHER` gate instead; deleting `.gsd/` would have destroyed live harness state.
- **Files modified:** none tracked. **Verification:** `git status --porcelain | grep -c .` → 0.

**2. [Reported, not fixed] Task 2's two `open`-scoped gates are unsatisfiable without destroying
dated history.** See the headline. Left red, named, filed as WINDOWS 47.

**3. [Deviation from the plan's instruction, on the orchestrator's authority] STATE.md counters not
written.** The plan directs the executor to set them from the disk file count; the orchestrator
reserves phase-progress bookkeeping. The orchestrator governs. Disk counts recorded above for whoever
writes them.

**4. [Tooling finding]** `git grep -E` silently drops `\b` on this platform. Recorded in Task 1.

**5. [Correction to the carried finding]** It names task 1 and task 3 as carrying `RAW`; only task 3
does.

**Total:** 1 auto-fixed blocker, 4 findings reported rather than fixed. **Impact:** no code changed;
every pin invariant; no dated record destroyed.

---

## Known Stubs

None. This plan wrote no code and left no placeholder.

---

## Issues Encountered

One, and it is the plan's own central prediction being wrong: `01-SECURITY.md`'s three named rows are
dated history, not live rows, and the gate written on the prediction cannot go green without harm.
Reported, not worked around.

## Next Phase Readiness

Ready for verification pass 14. It owns CORE-11's box, the two `open`-scoped gate definitions this
round left red, and the three new Broken Windows entries (45, 46, 47).

---

## Self-Check: PASSED

- `01-47-SUMMARY.md` exists on disk.
- `968081a`, `6926f20`, `d6ff687` all present in `git log`.
- Task 1 verify exit 0; Task 3 verify exit 0; Task 2 verify exit 1 at `NOPIN` — **deliberate, named
  above, with every downstream check measured green in an instrumented run**.
- Plan-level verification re-run: suite 31/1396, gate spec 448, bundle one specifier `crypto`,
  `packages/`+`scripts/` byte-identical since 01-46's exit, both pins invariant, CORE-11 `[ ]` on both
  surfaces.
