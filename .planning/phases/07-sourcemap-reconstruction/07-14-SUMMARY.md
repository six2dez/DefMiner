---
phase: 07-sourcemap-reconstruction
plan: 14
subsystem: engine
tags: [sourcemap, thresholds, retention, bounds, redos, base64, ecma-426]

# Dependency graph
requires:
  - phase: 07-sourcemap-reconstruction
    provides: "`absorb`'s aggregate gate, `SOURCE_ROWS_PER_MAP_MAX` and `ROWS_INSERTED_PER_ITERATION_MAX` (plans 07-01, 07-02, 07-05), and the HI-04 convergence inequality this plan had to keep true at every commit"
provides:
  - "`SOURCE_ROWS_PER_MAP_MAX` enforced in the unit it is derived in — a map is refused past 2,048 ROWS, not past 2,048 declared sources, so the real ceiling equals the documented one instead of twice it"
  - "`ROWS_INSERTED_PER_ITERATION_MAX` with the MD-01 compensating factor retired: insert side 4,099 -> 2,051, convergence right-hand side 4,227 -> 2,179 against an unchanged 8,192 delete budget"
  - "`decodeInlineMap` refusing an oversized payload on offset arithmetic, before `url.slice` — the claim its docblock always made"
  - "`findAnnouncement` bounding the URL at SOURCEMAP_TAIL_WINDOW_BYTES and ending it at any of ECMAScript's four line terminators, with no pattern"
  - "A literal-control-byte gate over `announce.spec.ts` — finding W-2's class, asserted rather than remembered"
affects: [07-15, 07-16, 07-17, retention, ingest-consumer, sourcemap-parse]

# Actuals (#2632)
actuals:
  tokens: 42566
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A bound is compared in the unit it is DERIVED in, with the conversion on the LEFT and the bound bare on the right"
    - "A size refusal is offset arithmetic taken before the copy it would otherwise measure"
    - "A property no input can expose (statement ORDER inside a function) is asserted against the source text, in the idiom the no-pattern AST audit already uses"
    - "A two-commit sequence whose ORDER is load-bearing is proven from the repository by three greps at HEAD and HEAD~1, not by an acceptance sentence"

key-files:
  created: []
  modified:
    - packages/engine/src/sourcemap/parse.ts
    - packages/engine/src/sourcemap/parse.spec.ts
    - packages/engine/src/sourcemap/announce.ts
    - packages/engine/src/sourcemap/announce.spec.ts
    - packages/engine/src/thresholds.ts
    - packages/engine/src/thresholds.spec.ts

key-decisions:
  - "The row conversion went on the LEFT of the aggregate comparison and `limits.maxSourceRows` stayed bare on the right. Halving the right-hand side computes the same answer while reading as a source-count bound wearing a row bound's name — the exact confusion MD-01 is about — and it would also have left the shipped left-hand substring in place, defeating the ordering grep."
  - "The `2 *` paragraph in `ROWS_INSERTED_PER_ITERATION_MAX` was rewritten as HISTORY rather than deleted. It is the record of why an insert bound once carried a factor a reader would otherwise find arbitrary, and its own closing prediction is what the two-commit ordering was held to."
  - "`announce.ts` imports `SOURCEMAP_TAIL_WINDOW_BYTES` from `thresholds.ts` rather than restating `ceil(MAP_MAX_BYTES * 4/3) + ANNOUNCEMENT_PREFIX_MAX`. One derivation, not two; the second copy is the one that stops tracking MAP_MAX_BYTES the first time the D-10 ladder is re-run. It is a NUMBER import, so the module stays SDK-free."
  - "The LO-01 parse-side property is asserted STRUCTURALLY, by reading `decodeInlineMap` and comparing the offsets of the gate and the slice. Both orders return the same reason for the same input and only the cost differs, so a behavioural assertion cannot see it."
  - "`naiveFindAnnouncement` in announce.spec.ts was left byte-unchanged with its pre-07-14 single-`\\n` slice. Its subject is the MARKER SEARCH fast path; every differential body is short and LF-terminated, so the two slices agree by construction, and syncing it would make the differential compare the shipped implementation to itself."
  - "The `trim()` in `findAnnouncement` was kept. The scan now ends the URL at the terminator itself, so trim is no longer what keeps a carriage return out — but it still strips incidental minifier whitespace, and removing it would change the answer for bodies that are correct today."

patterns-established:
  - "Unit-carrying constants state the unit in the docblock AND execute it at the gate; `thresholds.spec.ts` ties the two constants together by name with the factor as a named quantity so the unit cannot drift silently again"
  - "A spec that writes adversarial characters gates ITSELF against literal control bytes and separators, so W-2's class fails at authoring time rather than at review time"

requirements-completed: [MAP-02, MAP-05, MAP-06]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "MD-01 closed — `SOURCE_ROWS_PER_MAP_MAX` is enforced in ROWS: 1,024 sources accepted at exactly 2,048 rows, 1,025 refused `too_many_sources` at 2,050, and a sectioned map refused at the same aggregate with an under-limit control"
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/engine/src/sourcemap/parse.spec.ts#MAP-06 — the aggregate bound refuses at the ROWS it documents"
        status: pass
    human_judgment: false
  - id: D2
    description: "The MD-01 compensating factor retired, with the convergence inequality true at BOTH commits and the ordering proven from the repository"
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the insert side is DERIVED from what one iteration can actually write"
        status: pass
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#retiring the MD-01 factor made the inequality SLACKER, never tighter"
        status: pass
      - kind: other
        ref: "git show HEAD~1:packages/engine/src/sourcemap/parse.ts | grep -c 'acc.declared > limits.maxSourceRows' (0), and the two thresholds.ts filtered counts (1 at HEAD~1, 0 at HEAD)"
        status: pass
    human_judgment: false
  - id: D3
    description: "LO-01 closed — `decodeInlineMap` refuses on `url.length - prefix.length` before `url.slice`, and `findAnnouncement` bounds the URL instead of running to EOF"
    requirement: "MAP-02"
    verification:
      - kind: unit
        ref: "packages/engine/src/sourcemap/parse.spec.ts#LO-01 — the size refusal is arithmetic, not a copy"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sourcemap/announce.spec.ts#the URL is BOUNDED even when nothing terminates the line"
        status: pass
    human_judgment: false
  - id: D4
    description: "LO-02 closed — the announcement URL ends at the first of LF, CR, U+2028 and U+2029, with no pattern and no literal control byte in any fixture"
    requirement: "MAP-05"
    verification:
      - kind: unit
        ref: "packages/engine/src/sourcemap/announce.spec.ts#the URL ends at {LINE FEED U+000A, CARRIAGE RETURN U+000D, LINE SEPARATOR U+2028, PARAGRAPH SEPARATOR U+2029}"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sourcemap/announce.spec.ts#announce.ts contains no pattern, structurally > has ZERO regular-expression literals"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sourcemap/announce.spec.ts#this file writes every adversarial character as an ESCAPE"
        status: pass
    human_judgment: false
  - id: D5
    description: "No behavioural regression anywhere else in the tree: whole suite 4,209 -> 4,233 passing across 89 files, all pre-existing expectations byte-unmodified"
    verification:
      - kind: integration
        ref: "pnpm vitest run (89 files, 4,233 passed)"
        status: pass
      - kind: other
        ref: "pnpm typecheck && pnpm lint && pnpm knip (exit 0)"
        status: pass
    human_judgment: false

# Metrics
duration: 19 min
completed: 2026-09-02
status: complete
---

# Phase 07 Plan 14: Three Bounds That Now Mean What They Say Summary

**The map aggregate gate refuses at 2,048 ROWS instead of 2,048 declared sources, its compensating `2 *` factor is retired in the commit AFTER the gate rather than before it, and both cheap refusals — the inline-map size gate and the announcement URL slice — now fire on arithmetic before the multi-megabyte copy they used to be reached through.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-09-02T10:20:00Z
- **Completed:** 2026-09-02T10:39:00Z
- **Tasks:** 3 (one tracer, two auto — all three `tdd="true"`)
- **Files modified:** 6

## Accomplishments

- **MD-01 closed, in the order the plan made load-bearing.** `absorb` compares `acc.declared * ROWS_PER_RECOVERED_SOURCE` against `limits.maxSourceRows` — conversion on the left, bound bare on the right — so a map declaring 1,025 one-line sources is refused at 2,050 rows where it used to pass a bound documented as 2,048. The refusal is still the shipped `too_many_sources`; `MAP_PARSE_REASONS` is byte-unchanged and its every-reason-observed gate stayed green throughout.
- **The compensating factor retired second, never first.** `ROWS_INSERTED_PER_ITERATION_MAX` went from `ROWS_INSERTED_PER_ARTIFACT_MAX + 2 * SOURCE_ROWS_PER_MAP_MAX` to `+ SOURCE_ROWS_PER_MAP_MAX`. The convergence inequality's insert side moved 4,227 -> 2,179 against an unchanged 8,192 delete budget: strictly slacker, and green at both commits.
- **LO-01 closed in both places.** `decodeInlineMap` refuses on `url.length - prefix.length` inside the prefix loop, before `url.slice(prefix.length)`; the redundant post-slice size check is gone. `findAnnouncement` bounds the URL at `SOURCEMAP_TAIL_WINDOW_BYTES`, imported rather than restated.
- **LO-02 closed with four `indexOf` calls and a minimum.** A frozen `LINE_TERMINATORS` array beside `MARKERS`, every member an escape sequence. The zero-regex AST assertion over `announce.ts` is still green.
- **A new self-gate on the spec's own bytes.** `announce.spec.ts` now scans itself for literal C0/C1 control bytes and literal U+2028/U+2029. It caught three literal separators in this plan's own new fixtures on its first run — verbatim finding W-2's class — and they were re-spelled before the commit.

## Task Commits

Each task was committed atomically. Task 1 is TWO commits by design, and their ORDER is the property.

1. **Task 1 commit 1 — the gate, in rows** — `4bd99c1` (fix)
2. **Task 1 commit 2 — the factor retired** — `59347c3` (fix)
3. **Task 2 — LO-01, refuse before the copy** — `132dd84` (fix)
4. **Task 3 — LO-02, four line terminators** — `07601c1` (fix)

**Plan metadata:** see the `docs(07-14)` commit that carries this file.

### The two Task-1 hashes in order, with all three counts beside them

Required by the plan's acceptance criteria, and recorded here because no one of the three
commands alone distinguishes a correct history from a squashed one.

| # | Commit | What landed | `thresholds.spec.ts` at that commit |
|---|--------|-------------|--------------------------------------|
| 1 | `4bd99c1` | The row-unit gate. The `2 *` factor still present. | **exit 0**, 58 passed |
| 2 | `59347c3` | The factor retired, the paragraph rewritten as history. | **exit 0**, 59 passed |

| Ordering proof | Expected | Observed |
|---|---|---|
| `git show HEAD~1:packages/engine/src/sourcemap/parse.ts \| grep -c 'acc.declared > limits.maxSourceRows'` | 0 | **0** |
| `git show HEAD~1:packages/engine/src/thresholds.ts \| grep -v -E '^\s*(//\|\*\|/\*)' \| grep -c '2 \* SOURCE_ROWS_PER_MAP_MAX'` | 1 | **1** |
| `git show HEAD:packages/engine/src/thresholds.ts \| grep -v -E '^\s*(//\|\*\|/\*)' \| grep -c '2 \* SOURCE_ROWS_PER_MAP_MAX'` | 0 | **0** |

Measured before starting, for the record: the first command returned **1** at the pre-plan HEAD
(`d5a037a`), and the filtered `2 *` count there was **1** (unfiltered **2** — which is why the
comment filter is required rather than decoration: the paragraph is KEPT as history, so an
unfiltered count would read 2 at HEAD today and could never reach 0).

## Files Created/Modified

- `packages/engine/src/sourcemap/parse.ts` — the row-unit aggregate gate with `ROWS_PER_RECOVERED_SOURCE` named at module scope; the size refusal moved above `url.slice`; `decodeInlineMap`'s docblock now names the payload STRING and the decoded BUFFER as two separate allocations
- `packages/engine/src/sourcemap/parse.spec.ts` — the MD-01 row boundary from both sides plus the sectioned aggregate case, and the LO-01 structural ordering assertion with its non-vacuity gate and a one-byte-under boundary case
- `packages/engine/src/sourcemap/announce.ts` — `URL_MAX` (imported from `thresholds.ts`), the frozen four-member `LINE_TERMINATORS`, and the smallest-offset scan replacing the single `indexOf("\n")`
- `packages/engine/src/sourcemap/announce.spec.ts` — the bounded-URL cases, one case per terminator with a decode control each, a CRLF regression, a first-terminator-wins case, and the literal-control-byte self-scan
- `packages/engine/src/thresholds.ts` — `SOURCE_ROWS_PER_MAP_MAX`'s docblock rewritten so the "471 sources and 942 rows" arithmetic is what the gate EXECUTES; `ROWS_INSERTED_PER_ITERATION_MAX`'s factor retired with the `2 *` paragraph rewritten as history
- `packages/engine/src/thresholds.spec.ts` — the insert-side assertion restated with the factor as a NAMED quantity (`MAP_ROWS_PER_SOURCE_ROW_BOUND`), and a new case recomputing the superseded insert side to assert the shipped one is strictly smaller

## RED observations

Every new case was watched failing against the shipped implementation before the fix. Recorded
verbatim, because "it was RED" is a claim and the text is the evidence.

**Task 1 — MD-01 (2 RED):**

- `REFUSES 1025 sources — 2050 rows, the boundary from above` →
  `expected a refusal and got a successful parse. A hostile shape that succeeds quietly is the defect this fixture exists to catch.`
  The shipped gate ACCEPTED a map declaring 1,025 sources, which writes 2,050 rows against a bound documented as 2,048.
- `a SECTIONED map is refused at the same AGGREGATE, not per section` → the same text. The split map was accepted too.
- After the factor change, `thresholds.spec.ts` went RED on its own pin:
  `AssertionError: expected 2051 to be 4099` — the spec had the old factor written into it, which is exactly what a pin is for.

**Task 2 — LO-01 (2 RED):**

- `a body with NO terminator after the marker does not run to EOF` →
  `the announcement URL came back 3499511 characters long against a bound of 3495386.`
- `compares 'url.length - prefix.length' BEFORE it slices the payload` →
  `expected -1 to be greater than -1` — the shipped `decodeInlineMap` contained no offset arithmetic at all; it measured the string it had already copied.
- The third LO-01 case (`and what comes back is still REFUSED`) passed before AND after by design: it is the control proving the cut loses a refusal and never a map.

**Task 3 — LO-02 (8 RED across 6 cases):**

- `the URL ends at CARRIAGE RETURN U+000D` →
  `Received: "data:application/json;base64,e30=\rvar next = 2;"` — the code after the CR was absorbed into the payload.
- `the URL ends at LINE SEPARATOR U+2028` →
  `Received: "data:application/json;base64,e30=`\u2028`var next = 2;"`
- `the URL ends at PARAGRAPH SEPARATOR U+2029` → the same shape.
- The three matching decode controls → `expected 'refused' to be 'inline'`.
- `the URL ends at LINE FEED U+000A` passed before and after, as expected — LF was the one terminator the shipped scan knew about.
- `contains no literal C0 or C1 control byte and no literal U+2028 / U+2029` →
  `U+2028 at offset 20899, U+2029 at offset 20938, U+2028 at offset 23832`. **These were MY OWN three literal separators**, written into the new fixtures by the authoring step and caught by the gate written alongside them. Re-spelled as `\u2028` / `\u2029` before the commit. See Issues Encountered.

## Collected-test counts, before and after

| File | Before | After | Delta |
|---|---|---|---|
| `packages/engine/src/sourcemap/parse.spec.ts` | 55 | 62 | +7 |
| `packages/engine/src/sourcemap/announce.spec.ts` | 43 | 59 | +16 |
| `packages/engine/src/thresholds.spec.ts` | 58 | 59 | +1 |
| **Whole suite (89 files)** | **4,209** | **4,233** | **+24** |

No pre-existing case changed its shipped expectation. The only pre-existing assertion edited is
`thresholds.spec.ts`'s insert-side pin, which had the superseded factor written into it and is the
thing task 1 commit 2 exists to change.

## Gaps closed

| Gap id | Severity | Closed by | Evidence |
|---|---|---|---|
| MD-01 | MEDIUM | `4bd99c1` (gate) + `59347c3` (factor) | The row boundary from both sides in `parse.spec.ts`; the three ordering greps; the convergence inequality green at both commits |
| LO-01 | LOW | `132dd84` | The structural ordering assertion over `decodeInlineMap`; the bounded-URL case at 3,495,382 characters against a 3,495,386 bound |
| LO-02 | LOW | `07601c1` | One case per terminator with a decode control each; the zero-regex AST audit still green; zero literal separators in the spec |

## Decisions Made

See `key-decisions` in the frontmatter — six, all of them load-bearing. The two worth restating in
prose:

**The row conversion went on the LEFT.** Halving `limits.maxSourceRows` on the right would compute
the identical answer, and it would have been the wrong edit twice over: it reads as a source-count
bound wearing a row bound's name — MD-01's exact confusion, reintroduced by the fix for it — and it
would have left `acc.declared > limits.maxSourceRows` in the file, so the ordering grep the plan
specified would have found the shipped substring at `HEAD~1` and reported a squash that had not
happened.

**`naiveFindAnnouncement` was deliberately NOT synced.** It is the two-full-scan reference the
prefilter fast path is differentially checked against, and its subject is the MARKER SEARCH. Its
slice is still the pre-07-14 single-`\n` one. Every body in `DIFFERENTIAL_BODIES` is a few dozen
characters and LF-terminated, so the two slices agree by construction and the differential stayed
green untouched; syncing it would have made the reference a second copy of the shipped
implementation comparing itself to itself. A comment on the function now says so and names which
kinds of body belong in the terminator cases instead.

## Deviations from Plan

None - plan executed exactly as written.

The plan's ordering rule, its three ordering greps, its left-hand-side instruction, its
import-don't-restate instruction and its escapes-not-literals instruction were all followed as
specified. Two small things worth naming as judgement calls INSIDE the plan's latitude rather than
as deviations:

1. **The bound is `SOURCEMAP_TAIL_WINDOW_BYTES` (3,495,382), which is 4 characters SMALLER than the
   plan's stated `ANNOUNCEMENT_PREFIX_MAX + encodedCeiling(MAP_MAX_BYTES)` (3,495,386).** The plan
   named the value in one sentence and named the source in the next — "take the bound from
   `thresholds.ts` rather than restating the arithmetic" — and the two differ by
   `encodedCeiling`'s `+ 4` slack quantum. Taking the constant honours the instruction that carries
   the reason. The acceptance criterion asks the returned URL be "at or below" the larger figure,
   which holds. The longest URL this build can accept is 43 + `encodedCeiling(MAP_MAX_BYTES)`, some
   81 characters inside the bound, so nothing reachable is cut — and `announce.spec.ts` asserts
   that relation rather than trusting it.
2. **LO-01's parse-side case is structural, not behavioural.** The plan asked for cases "RED against
   the shipped implementation in the over-bound direction", and for `decodeInlineMap` no behavioural
   case can be: both orders refuse the same URL with the same reason and only the cost differs. The
   plan's own acceptance criterion anticipates this — "asserted by reading the function AND by a
   `parse.spec.ts` boundary pair that both pass" — so the source-order assertion is the RED one and
   the boundary pair is the control. This is the same move `announce.spec.ts` already makes for the
   no-pattern property.

## Issues Encountered

**The literal-separator gate caught its own author, on its first run.** Task 3's acceptance criteria
require `announce.spec.ts` to contain no literal U+2028/U+2029. The authoring step wrote the new
terminator table and one fixture body with THREE literal separators — at offsets 20899, 20938 and
23832 — precisely the defect class finding W-2 recorded and commit `f6cbf07` had already had to
repair once in this phase. The self-scan written alongside those fixtures failed and named all
three by offset; they were re-spelled as `\u2028` / `\u2029` and the file re-verified clean by the
gate, by the plan's own `python3` byte scan (prints 0) and by `grep` not reporting the file as
binary. Recorded rather than quietly fixed, because it is direct evidence the gate is not
decorative: the character is invisible in every diff and every review tool, and a human reviewer
would not have seen it.

**One pre-existing condition confirmed unchanged.** `vue-tsc` still reports exactly 6 errors — 4 in
`SettingsPanel.vue`, 2 in `SourceBrowser.spec.ts` — which is finding W-4's recorded baseline. This
plan is engine-only and touched no `.vue` file; the count did not grow.

## Prohibitions — verified, not assumed

| Prohibition | Check | Result |
|---|---|---|
| No change to `MAP_MAX_BYTES` or any D-10-derived constant | `git diff d5a037a..HEAD -- packages/engine/src/thresholds.ts \| grep -E '^[+-].*MAP_MAX_BYTES ='` | empty |
| No change to the three retention sweep constants | the same diff grepped for `RETENTION_SWEEP_MAX_ROWS =`, `RETENTION_SWEEP_EVERY_N =`, `RETENTION_SWEEP_MAX_PASSES =` | empty |
| No regular expression and no `new RegExp` in `announce.ts` | the AST audit in `announce.spec.ts` | green |
| No change to `packages/backend` | `git diff --stat d5a037a..HEAD -- packages/backend` | empty |
| No change to `.planning/REQUIREMENTS.md` | `git diff --stat d5a037a..HEAD -- .planning/REQUIREMENTS.md` | empty |

## Plan-level verification

| Check | Result |
|---|---|
| `pnpm vitest run` | 89 files, **4,233 passed** |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 |
| `git diff --stat packages/backend .planning/REQUIREMENTS.md` | prints nothing |

## Known Stubs

None. A scan of the plan diff for `TODO`, `FIXME`, `XXX`, placeholder copy, `.skip(` and `.todo(`
returns nothing. Every `<verify>` block in the plan was run; no test was skipped.

## Threat Flags

None. The three threat-register rows this plan carries (T-07-58, T-07-59, T-07-60) are all
`mitigate` and all mitigated as written. No new network endpoint, auth path, file access pattern or
schema change was introduced — the plan is six engine files, two moved comparisons, one widened
scan and one constant.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The retention convergence inequality now has ~3.8x headroom (8,192 against 2,179) where it had
  ~1.9x, and the slack is asserted to be an improvement rather than merely present.
- `SOURCE_ROWS_PER_MAP_MAX` means one thing at every hop: derived in rows, documented in rows,
  enforced in rows, and summed into the insert bound with no conversion left over. A future edit
  that reverts the gate to counting sources fails `thresholds.spec.ts` by name.
- **Finding W-6 remains open and is deliberately untouched.** The plan prohibits changing
  `MAP_MAX_BYTES`; W-6's claim that the bound under-serves recovery by roughly 2x needs a
  re-measurement on four fresh Caido instances, which is out of scope by operator decision.
- **W-4's 6 `vue-tsc` errors remain**, unchanged and not this plan's to move.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

## Self-Check: PASSED

All six modified source files exist on disk. All five commits are reachable in
`git log --oneline --all`: `4bd99c1`, `59347c3`, `132dd84`, `07601c1`, `8b16f82`.
Every plan-level `<verification>` command was re-run at HEAD and reported above.
