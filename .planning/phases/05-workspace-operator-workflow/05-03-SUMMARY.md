---
phase: 05-workspace-operator-workflow
plan: 03
subsystem: ui
tags: [sanitisation, unicode, grapheme-segmentation, csv, formula-injection, bidi, fixtures, vitest]

# Dependency graph
requires:
  - phase: 00-runtime-reality-check
    provides: "the measured QuickJS global set (100 globals, no Intl entry) that assumption A6 and the segmenter fallback rest on"
  - phase: 01-skeleton-persistence-compatibility
    provides: "packages/engine as an SDK-free workspace with four independent boundary mechanisms, decode.ts's module-header banner pattern, digest.spec.ts's DET-07 per-character scan, and the explicit exports map with no barrel"
provides:
  - "packages/engine/src/sanitise.ts — R2's four ordered steps as one pure function: strip C0/C1, strip bidi, measure, truncate grapheme-safe"
  - "TABLE_CELL_MAX_GRAPHEMES (256) and EVIDENCE_PANEL_MAX_GRAPHEMES (2048) as named constants with NO default parameter"
  - "C0_C1_CONTROLS and BIDI_OVERRIDES_ISOLATES exported so the frontend gate and the export serialiser assert the same ranges rather than restating them"
  - "forEvidence — the same pipeline with C0/C1 as visible escapes, expanded before the length is computed"
  - "packages/engine/src/csv.ts — R3's two steps in the mandated order, with DANGEROUS_LEADS, csvField, csvRow, csvHeader and CSV_LINE_TERMINATOR"
  - "packages/engine/src/hostile.fixture.ts — 20 frozen adversarial cases and HOSTILE_CASE_IDS, the single corpus four surfaces assert against"
  - "Three new exports-map entries: ./sanitise, ./csv, ./hostile.fixture"
affects: [05-04, 05-05, 05-09, 05-10, 05-11]

# Actuals (#2632)
actuals:
  tokens: 13351
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Strip before truncate, and prove the order with an assertion that only passes under it (a control-only input reporting total === 0)"
    - "Neutralise before quote, and prove the order POSITIONALLY (apostrophe at index 1, dangerous lead at index 2) — presence alone passes under both orderings"
    - "Capability differences are not API differences: the Intl.Segmenter fallback returns the identical object shape and nothing on it says which path ran"
    - "One security constant, many consumers — csv.ts imports C0_C1_CONTROLS rather than declaring a second copy of the range"
    - "A shared fixture whose consumers assert they covered its full id list, so adding a case fails every consumer until each accounts for it"
    - "A lookup table keyed by the CHARACTER, built once at module load, where a per-character index read would trip DET-07"

key-files:
  created:
    - packages/engine/src/sanitise.ts
    - packages/engine/src/sanitise.spec.ts
    - packages/engine/src/csv.ts
    - packages/engine/src/csv.spec.ts
    - packages/engine/src/hostile.fixture.ts
  modified:
    - packages/engine/package.json

key-decisions:
  - "P5-D9: `shown` and `total` are counted in the SAME unit as each other (graphemes where a segmenter exists, code points where it does not) rather than 05-RESEARCH Pattern 2's mixed grapheme/code-point pair — a caller renders `showing 256 of N` without knowing which runtime it is on, and `shown === total` stays true for an exactly-cap value built from combining sequences"
  - "P5-D10: TAB and CR stay in DANGEROUS_LEADS but cannot survive csvField's control strip, so they are neutralised by removal rather than by apostrophe — strictly stronger than R3's letter, and it closes T-05-14 by construction instead of by a second rule"
  - "P5-D11: the Intl.Segmenter is resolved from the global object AT CALL TIME and cached against the constructor, not captured at module load — that is what makes the QuickJS fallback path executable in a spec rather than merely argued"
  - "P5-D12: forEvidence's escape table is keyed by the character and prebuilt over both control ranges, because digest.spec.ts's DET-07 scan bans charCodeAt/codePointAt/.charAt(/fromCharCode in every non-spec engine source"
  - "P5-D13: no default cap parameter, asserted by Function.length === 2, so a 2,048-char panel cap cannot leak into a 32px table row by omission"

patterns-established:
  - "Adversarial characters are written as \\uXXXX escapes and never as literals in source — a literal control character or bidi override is invisible in every diff and review tool, and these files are entirely about invisible characters"
  - "The eslint no-control-regex exemption sits on the declaration it exempts, not in the config file, following the repo's @internal-tag precedent"

requirements-completed: []

coverage:
  - id: D1
    description: "R2 step 1 — C0 and C1 control characters are removed from every target-controlled string before it can reach a rendering sink or an export field"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#removes U+0000, U+001F, U+007F and U+009F"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#removes every code point in both ranges, not only the four endpoints"
        status: pass
    human_judgment: false
  - id: D2
    description: "R2 step 2 — bidi overrides and isolates are removed, so a hostile bundle cannot make one hostname render as another in the column the operator triages on (T-05-11)"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#removes all nine of U+202A-U+202E and U+2066-U+2069"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#defuses the hostname-reversal spoof (T-05-11)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Stripping happens before truncation and before measurement, never after"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#reports total === 0 for a control-ONLY value — strip precedes measurement"
        status: pass
    human_judgment: false
  - id: D4
    description: "Truncation never splits a surrogate pair or a combining sequence, and the caller learns both how much was shown and how much existed"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#does not end in a lone surrogate when the cap lands on a surrogate pair"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#keeps a multi-code-point grapheme WHOLE when it is the last one shown"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#never cuts between a base character and its combining mark"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#reports shown < total for a value ONE over the cap"
        status: pass
    human_judgment: false
  - id: D5
    description: "The table-cell cap and the evidence-panel cap are two named constants and a caller must choose one — there is no default"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#takes NO default cap — a caller must name the surface"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#names the two caps from 05-UI-SPEC.md R2 and does not restate them"
        status: pass
    human_judgment: false
  - id: D6
    description: "A multi-megabyte single-line value truncates within a named elapsed-time ceiling, so a quadratic implementation fails the spec rather than merely being slow (T-05-12)"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#truncates 4 MiB within 2000 ms"
        status: pass
    human_judgment: false
  - id: D7
    description: "The untruncated remainder is not reachable through the object the display path hands to a sink (T-05-13)"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#carries EXACTLY text, shown and total and nothing else"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#does not expose the source string through any own value"
        status: pass
    human_judgment: false
  - id: D8
    description: "A CSV field whose first character is one of the six dangerous leads is apostrophe-prefixed and only then quote-wrapped, in that order (T-05-10)"
    requirement: "UISEC-02"
    verification:
      - kind: unit
        ref: "packages/engine/src/csv.spec.ts#neutralises a field led by = BEFORE quoting (and +, -, @ — four parameterised cases asserting index 0/1/2)"
        status: pass
      - kind: unit
        ref: "packages/engine/src/csv.spec.ts#strips a TAB/CR lead and neutralises what it was hiding (two parameterised cases)"
        status: pass
    human_judgment: false
  - id: D9
    description: "Every CSV field is quote-wrapped and internal quotes doubled, whether or not it needed neutralising; the empty field is an empty quoted pair"
    requirement: "UISEC-02"
    verification:
      - kind: unit
        ref: "packages/engine/src/csv.spec.ts#quote-wraps every field, neutralised or not"
        status: pass
      - kind: unit
        ref: "packages/engine/src/csv.spec.ts#returns the empty field as an empty quoted PAIR, not as nothing"
        status: pass
      - kind: unit
        ref: "packages/engine/src/csv.spec.ts#doubles an internal double quote inside the wrapping quotes"
        status: pass
    human_judgment: false
  - id: D10
    description: "A control character cannot be used to hide a dangerous CSV lead (T-05-14)"
    requirement: "UISEC-02"
    verification:
      - kind: unit
        ref: "packages/engine/src/csv.spec.ts#csvField — T-05-14, a control cannot hide a dangerous lead (four cases)"
        status: pass
    human_judgment: false
  - id: D11
    description: "A single hostile-content fixture module exists and is the one source of adversarial strings for every surface that renders or exports target-controlled bytes"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#exercised EVERY id in HOSTILE_CASE_IDS, not a subset"
        status: pass
      - kind: unit
        ref: "packages/engine/src/csv.spec.ts#exercised EVERY id in HOSTILE_CASE_IDS, not a subset"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#is FROZEN, so no consumer can mutate the corpus for the next one"
        status: pass
    human_judgment: false
  - id: D12
    description: "The engine package remains SDK-free and DOM-free with all three new modules present — the four independent boundary mechanisms still hold"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/engine/src/boundary.spec.ts (16 tests, all four mechanisms, re-run with the new modules on disk)"
        status: pass
      - kind: integration
        ref: "packages/backend/src/outbound-prohibition.spec.ts (451 tests — the fixture's attack payloads are literals and do not trip the shipped-source gate)"
        status: pass
      - kind: other
        ref: "grep -rn 'document\\.|window\\.|globalThis\\.document' packages/engine/src/sanitise.ts — prints nothing"
        status: pass
    human_judgment: false
  - id: D13
    description: "All three modules are reachable by later plans through an explicit exports-map entry — there is no barrel and no wildcard"
    verification:
      - kind: other
        ref: "node -e \"const p=require('./packages/engine/package.json');['./sanitise','./csv','./hostile.fixture'].forEach(k=>{if(!p.exports[k])process.exit(1)})\" — exit 0"
        status: pass
      - kind: other
        ref: "pnpm knip — exit 0 with the new export entries present"
        status: pass
    human_judgment: false

# Metrics
duration: 19 min
completed: 2026-08-28
status: complete
---

# Phase 05 Plan 03: Rendering-Safety and Export Primitives Summary

**Three SDK-free primitives the phase's four rendering and export surfaces build on: R2's strip-then-truncate pipeline with grapheme-safe segmentation and two named caps, R3's neutralise-then-quote CSV field rule with the ordering asserted at character index, and one frozen 20-case hostile corpus that both engine specs iterate exhaustively.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-08-28T12:02:05Z
- **Completed:** 2026-08-28T12:20:35Z
- **Tasks:** 3
- **Files created/modified:** 6 (5 created, 1 modified)

## Accomplishments

- **`sanitise.ts` implements R2's four steps in R2's order, and the order is proved rather than described.** A control-only input reports `total === 0`; that assertion passes under strip-first and fails under truncate-first, which is the only reason it is in the file.
- **Grapheme safety is real, not asserted.** A cap landing on a surrogate pair returns 256 whole graphemes with no lone surrogate; a 300-grapheme string of base+combining-mark pairs truncates to exactly 256 pairs and never ends on a bare base.
- **`Intl.Segmenter` is resolved from the global object at call time**, so the QuickJS fallback (Phase 0 measured 100 globals with no `Intl`) is an *executed* path in the spec — three cases run with `Intl` removed from `globalThis` — rather than an argued one.
- **`csv.ts` asserts the ORDER of R3's two steps positionally**, at index 0/1/2 of the output. An implementation that quoted first and neutralised second would also contain an apostrophe; only a positional assertion tells the two apart.
- **One fixture, twenty cases, two exhaustive consumers.** Both engine specs assert the set of ids they exercised equals `HOSTILE_CASE_IDS` in full, so a case added by plan 05-05 or 05-11 fails every existing consumer until each accounts for it.
- **A pre-existing repo gate caught a real defect in the first implementation.** `digest.spec.ts`'s DET-07 scan rejected `charCodeAt` in `sanitise.ts`; the escape table was rebuilt keyed by the character rather than by its code unit, which is both faster per call and compliant.

## Task Commits

1. **Task 1 (RED): failing spec for the strip-then-truncate pipeline** — `0ad2097` (test)
2. **Task 1 (GREEN): implement the strip-then-truncate pipeline, grapheme-safe** — `ef1b9c6` (feat)
3. **Task 2 (RED): failing spec for the CSV field rule, order asserted positionally** — `3f95ceb` (test)
4. **Task 2 (GREEN): implement the CSV field rule — neutralise, then quote** — `4a07ecb` (feat)
5. **Task 3: the one hostile-content fixture, iterated exhaustively by both specs** — `7eb36eb` (feat)

_Tasks 1 and 2 carry `tdd="true"`, so each produced a RED `test(...)` commit and a GREEN `feat(...)` commit. Neither needed a REFACTOR commit._

## Files Created/Modified

- `packages/engine/src/sanitise.ts` — R2's pipeline. `forDisplay` / `forEvidence`, the two caps, the two strip regexes, the character-keyed escape table, and the call-time segmenter resolution.
- `packages/engine/src/sanitise.spec.ts` — 71 tests: the four R2 steps, both caps, the escape mode, containment, the 4 MiB time ceiling, the `Intl`-absent fallback, and 40 fixture-driven cases.
- `packages/engine/src/csv.ts` — R3's field rule. `DANGEROUS_LEADS`, `csvField`, `csvRow`, `csvHeader`, `CSV_LINE_TERMINATOR`.
- `packages/engine/src/csv.spec.ts` — 42 tests: one per dangerous lead, quoting, T-05-14, row/header, and 20 fixture-driven cases.
- `packages/engine/src/hostile.fixture.ts` — 20 frozen `{ id, why, value }` cases and `HOSTILE_CASE_IDS`.
- `packages/engine/package.json` — three new `exports` entries: `./sanitise`, `./csv`, `./hostile.fixture`.

## Decisions Made

**P5-D9 — `shown` and `total` are counted in the same unit as each other.** 05-RESEARCH.md's Pattern 2 sketch computes `total` as `[...stripped].length` (code points) while `shown` counts graphemes. That mismatch makes `shown === total` false for an exactly-cap string built from combining sequences — a string that came back *unchanged*. Both are now counted by the same walk: graphemes where a segmenter exists, code points where it does not. Measured cost of the full walk: ~170 ms for 4 MiB, held under a named 2,000 ms ceiling by the spec.

**P5-D10 — TAB and CR are neutralised by removal, not by apostrophe, and that is stronger.** R3 names six dangerous leads and two of them (U+0009, U+000D) are also C0 control characters. Because the control strip runs *first*, they can never reach the lead test — they never reach the output at all — and whatever they were hiding becomes the first character and *is* apostrophe-prefixed. The plan's behaviour list expected six apostrophe cases; the executed behaviour is four apostrophe cases and two removals, and the removals close T-05-14 by construction rather than by a second rule. Both leads stay in `DANGEROUS_LEADS` because that constant is R3's list, not the subset one call path happens to reach. Stated in the module header, because a reader of the constant would otherwise expect an apostrophe.

**P5-D11 — the segmenter is resolved per call and cached against its constructor.** Capturing it at module load would make the QuickJS fallback untestable from a spec. Keying the cache on the constructor identity means a spec that sets `globalThis.Intl = undefined` gets the fallback on the very next call, and restores it on the next call after that.

**P5-D12 — the evidence-panel escape table is keyed by the character and prebuilt.** The first implementation read `character.charCodeAt(0)` inside the replace callback. `packages/engine/src/digest.spec.ts`'s DET-07 scan bans `charCodeAt`, `codePointAt`, `.charAt(` and `fromCharCode` in every non-spec engine source — Phase 0 measured an *empty* per-character JS loop at 9 ms/MB on a runtime with no interrupt. A 65-entry table built once at module load costs nothing per call and reads no index at all.

**P5-D13 — no default cap parameter, asserted by `Function.length === 2`.** A default is how a 2,048-character panel cap leaks into a 32px table row by omission, and the omission is invisible at the call site. A non-positive or non-integer cap throws rather than silently rendering every cell empty.

**Two of the plan's unresolved edges are decided here and asserted:** an empty CSV field serialises as a two-character quoted pair so column positions survive (`EDGE UISEC-02 / empty`), and the dangerous-lead test reads the first UTF-16 code unit after control stripping rather than the first grapheme cluster (`EDGE UISEC-02 / encoding`) — a combining mark cannot be one of the six leads, so the two agree, and a fixture opening with a combining sequence asserts it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `digest.spec.ts`'s DET-07 scan rejected `charCodeAt` in `sanitise.ts`**
- **Found during:** Task 3 (running the full engine suite before commit)
- **Issue:** `forEvidence` read `character.charCodeAt(0)` inside its replace callback to select an escape. `packages/engine/src/digest.spec.ts` walks every non-spec `.ts` under `packages/engine/src` and fails on `charCodeAt`, `codePointAt`, `.charAt(` or `fromCharCode` — DET-07 bans per-character index reads in engine source. The gate is textual and comment-stripped, so this was a genuine failure and not a false positive on prose.
- **Fix:** Replaced the code-unit-keyed map with a `ReadonlyMap<string, string>` built once at module load over both control ranges (65 entries) using `String.fromCodePoint`, and looked up by the matched character itself. Added a header section stating what DET-07 bans, why the full walk in `capped()` is not the shape it bans, and the measured ~170 ms / 4 MiB figure.
- **Files modified:** `packages/engine/src/sanitise.ts`
- **Verification:** `pnpm vitest run packages/engine/src` — 306 passed, 10 files, including `digest.spec.ts`.
- **Committed in:** `7eb36eb`

**2. [Rule 3 - Blocking] `no-control-regex` blocked both files carrying R2's strip patterns**
- **Found during:** Task 1
- **Issue:** ESLint's `no-control-regex` (error, via the Caido preset) rejects `/[ --]/` — the pattern that *is* R2 step 1. `pnpm lint` is a plan-level verification gate, so this blocked the task.
- **Fix:** Two `// eslint-disable-next-line no-control-regex` directives, each preceded by the reason, on the declaration and on the one spec assertion that names the range. The exemption sits on the line it exempts rather than in `eslint.config.js`, following the repo's own precedent for the `@internal` knip tag. The fixture-driven suites avoid the issue entirely by deriving their patterns from `C0_C1_CONTROLS.source` at runtime.
- **Files modified:** `packages/engine/src/sanitise.ts`, `packages/engine/src/sanitise.spec.ts`
- **Verification:** `pnpm lint` — exit 0.
- **Committed in:** `ef1b9c6`

**3. [Rule 1 - Bug] `total` and `shown` would have been counted in different units**
- **Found during:** Task 1 (implementing against 05-RESEARCH.md Pattern 2)
- **Issue:** The research sketch computes `total` in code points and `shown` in graphemes. For a value of exactly 256 base+combining-mark pairs — returned *unchanged* — that reports `shown: 256, total: 512`, so `shown < total` and the UI would offer a "showing 256 of 512" affordance for a value nothing was truncated from. The plan's own behaviour list requires `shown === total` for an exactly-cap value.
- **Fix:** Both counted by the same walk in `capped()`.
- **Files modified:** `packages/engine/src/sanitise.ts`
- **Verification:** `sanitise.spec.ts#returns a value of exactly the cap unchanged, with shown === total`, and the combining-mark case asserts `total === 300` for 300 pairs.
- **Committed in:** `ef1b9c6`

**4. [Rule 2 - Missing Critical] No cap validation**
- **Found during:** Task 1
- **Issue:** With no default parameter, a caller that passes `0`, `NaN`, `-1` or a fraction gets an empty or nonsensical cell that looks like "no data" rather than like a defect. Nothing in the plan required a guard.
- **Fix:** `assertCap` throws a `RangeError` naming the two constants for any non-positive or non-integer cap.
- **Files modified:** `packages/engine/src/sanitise.ts`
- **Verification:** `sanitise.spec.ts#rejects a cap that is not a positive integer` — five bad values, both entry points.
- **Committed in:** `ef1b9c6`

### Additions beyond the plan's symbol list

- **`CSV_LINE_TERMINATOR`** is exported (the plan asked only for "a named constant"). Exporting it means plan 05-11's serialiser uses *this* CRLF rather than a `\n` typed at a call site — a mixed-terminator file opens with a trailing blank row in some readers and one merged row in others.
- **`HostileCase`** is exported as a type so 05-05 and 05-11 can annotate against the corpus without re-deriving its shape.

---

**Total deviations:** 4 auto-fixed (2 blocking, 1 bug, 1 missing critical), plus 2 additive exports.
**Impact on plan:** All four were necessary for the plan's own verification gates to pass or for its own stated behaviour to hold. No scope creep — nothing outside the three named modules and the exports map was touched.

## Plan reconciliations, recorded rather than absorbed

- **"all eight" bidi characters is nine.** The plan's behaviour list says a string containing `U+202A`–`U+202E` and `U+2066`–`U+2069` returns "with all eight removed". Those two ranges contain 5 + 4 = 9 characters. All nine are stripped and all nine are asserted; the arithmetic slip is noted in `sanitise.spec.ts` next to the fixture constant so it is not re-derived.
- **Six dangerous leads, four apostrophes.** See P5-D10 above. The acceptance criterion "a case for each of the six dangerous leads" is met with six parameterised cases; two of them assert removal rather than prefixing, and each states why.

## Issues Encountered

None beyond the four deviations above. The `05-02` close-out hazard flagged in this plan's brief did not recur: `.planning/REQUIREMENTS.md` is byte-identical to its state at `7abce78` (`git diff HEAD -- .planning/REQUIREMENTS.md` is empty), and `outbound-prohibition.spec.ts`'s byte comparison of the machine-owned `DERIVED RESIDUAL` span passes as part of its 451 tests.

## Residuals, disclosed rather than closed

- **`capped()` walks the whole input once.** R2's `total` cannot be reported without it. The array it builds stops growing at the cap, so a 4 MiB value is never rebuilt in memory, and the spec holds the 4 MiB case under a named 2,000 ms ceiling. On the backend (no segmenter) this is a code-point iteration over a value the responsibility map says the backend truncates *before* the RPC. It is not the shape DET-07 bans — no per-character index read, a native regex strip, a table lookup for escapes — but it is an O(n) pass over a target-controlled string on a single-threaded runtime, and it is stated in the module header rather than left to be rediscovered.
- **The `Intl` absence is an absence argument.** Phase 0 enumerated 100 globals and found no `Intl`. If a future Caido build ships it, the backend silently gains grapheme segmentation. That is a widening, not a break, and it is recorded in the header with its provenance the way `decode.ts` records `TEXTDECODER_MODULE`.
- **`forEvidence`'s `?? ""` arm is unreachable** — the escape table is total over `C0_C1_CONTROLS`. It is written as removal rather than as a throw so that the fallen-back behaviour is the safe one, matching `forDisplay`, and not a render path that throws on hostile input.

## Known Stubs

None. All three modules are complete implementations with executed specs; nothing here is a placeholder for a later plan.

## Threat Flags

None. The three modules introduce no network endpoint, no auth path, no file access and no schema change. The threat register's five entries (T-05-10 … T-05-14) are each mitigated and each has a named test above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **05-05** (frontend hostile-render spec) can import `TABLE_CELL_MAX_GRAPHEMES`, `C0_C1_CONTROLS`, `BIDI_OVERRIDES_ISOLATES` and the fixture through `@defminer/engine/sanitise` and `@defminer/engine/hostile.fixture`. Note for that plan: `packages/frontend`'s `@defminer/engine` entry is still listed under `ignoreDependencies` in `knip.json` with the comment "Remove this entry when the first import lands" — 05-05 or 05-09 owns removing it.
- **05-09** (findings table) imports `TABLE_CELL_MAX_GRAPHEMES` and `forDisplay`; **05-10** (evidence panel) imports `EVIDENCE_PANEL_MAX_GRAPHEMES` and `forEvidence`.
- **05-11** (export path) imports `csvField` / `csvRow` / `csvHeader` / `CSV_LINE_TERMINATOR` and extends the fixture. Its spec must add its own `exercised === HOSTILE_CASE_IDS` assertion, or the corpus grows a case only two of four consumers cover.
- **05-04** (suppressions / projection register) inherits the fixture unchanged when Phase 4 unblocks those surfaces — extend `HOSTILE_CASES`, do not fork it.
- **No blockers.** `pnpm test` (1,596 tests, 40 files), `pnpm typecheck`, `pnpm lint` and `pnpm knip` all exit 0 with the three modules present.

## Self-Check: PASSED

Files claimed created, verified present on disk:
- `packages/engine/src/sanitise.ts` — FOUND
- `packages/engine/src/sanitise.spec.ts` — FOUND
- `packages/engine/src/csv.ts` — FOUND
- `packages/engine/src/csv.spec.ts` — FOUND
- `packages/engine/src/hostile.fixture.ts` — FOUND

Commits claimed, verified in `git log`:
- `0ad2097`, `ef1b9c6`, `3f95ceb`, `4a07ecb`, `7eb36eb` — all FOUND

Plan-level `<verification>` re-run at close-out:
- `pnpm vitest run packages/engine/src --reporter=dot` — 10 files, 306 tests, exit 0 (includes `boundary.spec.ts`)
- `pnpm test` — 40 files, 1,596 tests, exit 0
- `pnpm typecheck` — exit 0
- `pnpm lint` — exit 0
- `pnpm knip` — exit 0
- `pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts` — 451 tests, exit 0 with the fixture present

All 18 task-level `<acceptance_criteria>` across the three tasks were executed and passed.

---
*Phase: 05-workspace-operator-workflow*
*Completed: 2026-08-28*
