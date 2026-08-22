---
phase: 01-skeleton-persistence-compatibility
plan: 15
subsystem: database
tags: [sqlite, redaction, url, base64, security, observations, vitest]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "`redactDelimitedSegment` as THE one shared per-segment helper (plan 01-11), the `BARE_CREDENTIAL_SHAPES` table and decision P10-D1's `=`-less branch (plan 01-10), and the per-grammar claim block in `schema.spec.ts` (plan 01-10 task 4)"
provides:
  - "A per-segment rule that asks whether a segment is a GENUINE PAIR rather than whether it contains an `=` byte: a value half that is empty or entirely `=` padding means the segment was never a pair and is redacted whole"
  - "The fix on BOTH delimiters at once, because the `&` query loop and the `;` path loop call the one shared helper"
  - "A padding-stripped-core absence assertion applied at EVERY absence site in `observations.spec.ts`, through one shared helper across both populations"
  - "A `BARE_CREDENTIAL_SHAPES` table derived from the policy question, with non-vacuity assertions that require `=`-bearing shapes on both sub-branches"
  - "Four residuals pinned by executed cases: the retained NAME half (both faces), scheme-relative userinfo, `;` inside the authority, and the URL_MAX truncation boundary"
  - "Three corrected claims — `QUERY_NAME_MAX`, `redactDelimitedSegment` and `schema.spec.ts`'s per-grammar block — with an OPEN list that names every open grammar and a live-proof sentence scoped to what the tracer exercises today"
  - "Eight new Per-Task Verification Map rows in `01-VALIDATION.md`, commands verified byte-identical to their plans"
affects: [01-16, 01-17, tracer-e2e, requirements-ledger]

actuals:
  tokens: 18500
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Two-spelling absence assertion: a substring search for a padded literal passes on a live credential, because the stored value is the literal minus one byte of padding — search the padding-stripped core as well, through ONE shared helper"
    - "Policy-first fixture derivation: write down the question and the encoding facts, enumerate the shapes each fact implies, THEN check the implementation — never the reverse"
    - "Scope a live-proof sentence to the grammars the live tier actually exercises, and name the closing plan BY NUMBER"

key-files:
  created: []
  modified:
    - packages/backend/src/store/observations.ts
    - packages/backend/src/store/observations.spec.ts
    - packages/backend/src/store/schema.spec.ts
    - .planning/phases/01-skeleton-persistence-compatibility/01-VALIDATION.md

key-decisions:
  - "A pair whose value half is empty or is entirely `=` padding was never a pair — redact the whole segment on both delimiters"
  - "ACCEPTED COST: `?debug=` now loses its NAME as well as its value. This is the faithful reading of P10-D1 (a bare `?debug` is already redacted whole) rather than an extension of it, so no new operator checkpoint was opened"
  - "Rows already written are LEFT, on decision P8-D1's CLOSURE half alone — the MEASURED half is explicitly not claimed"
  - "The URL_MAX truncation-into-a-marker residual is pinned rather than fixed: the obvious repair interacts with this plan's new branch and would break the idempotence invariant asserted across the whole file"
  - "The retained NAME half of a genuine pair is kept BY POLICY and is now listed as the second OPEN grammar rather than closed"

patterns-established:
  - "Two-spelling absence assertion via `expectSecretAbsent` — literal AND padding-stripped core, one helper, every site"
  - "`RESIDUAL, PINNED:` cases whose bytes were EXECUTED rather than predicted, each carrying a measured reason and an owner"
  - "Non-vacuity assertions that require the adversarial property itself (three `=`-bearing shapes, one one-pad, one two-pad), not merely a table length"

requirements-completed: [STORE-03, STORE-01]

coverage:
  - id: D1
    description: "A standard-base64-padded credential carried as a bare segment does not reach `observations.url` with the credential in the retained name half — proven against the bytes stored in a real SQLite file, on BOTH delimiters"
    requirement: "STORE-03"
    verification:
      - kind: integration
        ref: "packages/backend/src/store/observations.spec.ts#a PADDED credential does not reach the column on EITHER delimiter (CR-07, T-01-78, T-01-79)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#BOTH sub-branches: a value half of only `=` (two-pad) and an EMPTY value half (one-pad) redact WHOLE"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#the SAME rule on the SAME helper covers the `;` delimiter — one policy, two delimiters"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both sub-branches of the padding rule are exercised — empty value half and value half of only `=` — with a committed mutation run showing the tables going red on each"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "mutation run: padding branch reverted -> 22 failed | 149 passed (171); red set spans three one-pad titles and three two-pad titles"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#the table is STRUCTURALLY CAPABLE of failing on a PADDED credential (CR-07)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every absence assertion in `observations.spec.ts` searches the padding-stripped core — the `BARE_CREDENTIAL_SHAPES` loop's three sites AND the separate HEAD-side secrets list — through one shared helper"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "grep -n '\\.includes(' packages/backend/src/store/observations.spec.ts — 17 hits, every one classified below; zero literal-only credential absence assertions remain"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#the credential literals do not survive ANYWHERE in the output"
        status: pass
    human_judgment: false
  - id: D4
    description: "The three artifacts that asserted this could not happen describe what the code does; the OPEN list names every open grammar; both unstated preconditions are stated on their ENFORCED rows; the QUERY entry's live-proof sentence is scoped to what the tracer exercises today with plan 01-17 named by number"
    requirement: "STORE-01"
    verification:
      - kind: unit
        ref: "pnpm vitest run packages/backend/src/store/schema.spec.ts tests/schema.spec.ts — 39 passed"
        status: pass
      - kind: other
        ref: "citation grep: every title cited in schema.spec.ts found in observations.spec.ts with a non-zero hit count (11 titles, counts 1-2); grep -cF '01-17' schema.spec.ts = 1"
        status: pass
    human_judgment: false
  - id: D5
    description: "Four residuals pinned by executed cases that go red the day somebody closes them, each with a measured reason and an owner"
    requirement: "STORE-01"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#RESIDUALS this rule deliberately LEAVES — pinned by execution, not named in prose (CR-07) — 5 cases, all pass"
        status: pass
    human_judgment: false
  - id: D6
    description: "`01-VALIDATION.md` carries eight new Per-Task rows for 01-15/T1-T3, 01-16/T1-T3 and 01-17/T1-T2, each Automated Command byte-identical to its plan's `<automated>` block, with a re-checked sampling-continuity statement"
    verification:
      - kind: other
        ref: "byte-identity script over the three PLAN files vs the ledger rows — ALL EIGHT BYTE-IDENTICAL"
        status: pass
    human_judgment: false
  - id: D7
    description: "The green baseline is restored: no fewer than 31 files / 931 tests, typecheck / lint / knip clean, bundle at exactly one import specifier"
    verification:
      - kind: integration
        ref: "pnpm test — 31 files, 995 tests, 0 failures; pnpm typecheck / lint / knip exit 0; pnpm check:bundle — 1 import specifier(s): crypto"
        status: pass
    human_judgment: false
  - id: D8
    description: "The disposition of rows written between plan 01-10 and this fix: LEAVE, on decision P8-D1's closure half alone"
    verification: []
    human_judgment: true
    rationale: "A disposition argument is a judgment about what a prior operator decision does and does not carry over. No test can assert that P8-D1's measured half was deliberately NOT claimed; a human reading the argument is the only check that it was stated honestly."

duration: 18 min
completed: 2026-08-22
status: complete
---

# Phase 01 Plan 15: Padded-Credential Redaction (CR-07) Summary

**A segment whose value half is empty or is entirely `=` padding was never a `name=value` pair — so every standard-base64 credential stops being promoted into the half the policy keeps, on both delimiters, proven against the bytes in a real SQLite row and mutation-proven at both sub-branches.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-22T08:34:00Z
- **Completed:** 2026-08-22T08:52:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Closed CR-07 in the code: `redactDelimitedSegment` now asks whether the segment is a GENUINE PAIR rather than whether it contains an `=` byte, and one shared helper carries the fix to both the `&` query loop and the `;` path loop.
- Closed it in the fixtures that were structurally incapable of seeing it — including the repair to the repair: a substring search for a *padded literal* passes on a live credential, because the column stores the token minus one byte of padding.
- Closed it in the three artifacts that asserted it could not happen, and scoped a fourth claim (the live-proof sentence) that would otherwise have started overclaiming the moment the paragraph above it was widened.

## Task Commits

1. **Task 1 (tracer), RED: one padded credential end-to-end into the real column** — `506ee3d` (test)
2. **Task 1 (tracer), GREEN: the padding branch** — `0fdac5c` (fix)
3. **Task 2: policy-derived adversarial set, both tables widened, four residuals pinned** — `0cfc443` (test)
4. **Task 3: three claims corrected, two preconditions stated, ledger extended** — `9fffb52` (docs)

## Files Created/Modified

- `packages/backend/src/store/observations.ts` — the padding branch in `redactDelimitedSegment`, plus two corrected doc blocks (`QUERY_NAME_MAX`, `redactDelimitedSegment`)
- `packages/backend/src/store/observations.spec.ts` — the end-to-end tracer case, `paddingStrippedCore` / `expectSecretAbsent`, five new `BARE_CREDENTIAL_SHAPES` entries and their `;` mirrors, new non-vacuity assertions, degenerate-shape cases, five `RESIDUAL, PINNED` cases
- `packages/backend/src/store/schema.spec.ts` — the amended per-grammar claim block (QUERY, USERINFO, `;`, OPEN list, AMENDED note) and the four-column `observations.url` entry
- `.planning/phases/01-skeleton-persistence-compatibility/01-VALIDATION.md` — round-3 Per-Task Verification Map (eight rows) and the re-checked Sign-Off

---

## THE RED RUN — EXECUTED BEFORE THE FIX EXISTED (Task 1)

The stored bytes, read back out of a real SQLite file through `listObservations`, before any fix:

```
STORED r5: https://cdn.test/a.js?dXNlcjpwYTU1dzByZA=<redacted>
STORED r6: https://cdn.test/a.js;dXNlcjpwYTU1dzByZA=<redacted>
```

What that column was holding:

```
$ printf 'dXNlcjpwYTU1dzByZA==' | base64 -d
user:pa55w0rd
```

The failing run (commit `506ee3d`, before `0fdac5c` existed):

```
 FAIL  packages/backend/src/store/observations.spec.ts > recordObservation writes the redacted URL, not the raw one > a PADDED credential does not reach the column on EITHER delimiter (CR-07, T-01-78, T-01-79)
AssertionError: stored row r6: the PADDING-STRIPPED CORE `dXNlcjpwYTU1dzByZA` survived in https://cdn.test/a.js;dXNlcjpwYTU1dzByZA=<redacted> — re-pad it and `base64 -d` returns the secret: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ expectSecretAbsent packages/backend/src/store/observations.spec.ts:103:5
 ❯ packages/backend/src/store/observations.spec.ts:868:7

 Test Files  1 failed (1)
      Tests  1 failed | 107 passed (108)
```

The assertion names the PADDING-STRIPPED CORE, and that is the whole point. A search for the padded literal `dXNlcjpwYTU1dzByZA==` returns **false** against the output above — the case would have PASSED while a whole HTTP Basic credential sat in the row. That is round 2's blindness recurring in round 3's fixture, in the identical spot, and it is why the core is derived by a string scan in one shared helper rather than hard-coded anywhere.

### The stored bytes AFTER the fix, both delimiters

```
after r5: https://cdn.test/a.js?<redacted>
after r6: https://cdn.test/a.js;<redacted>
```

---

## THE MUTATION RUN — EXECUTED (Task 2)

The padding branch reverted in `redactDelimitedSegment`, `pnpm vitest run packages/backend/src/store/observations.spec.ts`:

```
 Test Files  1 failed (1)
      Tests  22 failed | 149 passed (171)
```

The full red set, 22 assertions across both sub-branches, both delimiters, both tables and the end-to-end SQLite case:

```
 FAIL  … TWO `=` of padding (20) — value half is a lone `=`: does not survive anywhere in the output as a BARE segment
 FAIL  … TWO `=` of padding (20) — value half is a lone `=`: the parameter COUNT is unchanged
 FAIL  … TWO `=` of padding (20) — value half is a lone `=`: the ";" delimiter gets the SAME policy — one policy, two delimiters
 FAIL  … ONE `=` of padding (20) — value half is EMPTY: does not survive anywhere in the output as a BARE segment
 FAIL  … ONE `=` of padding (20) — value half is EMPTY: the parameter COUNT is unchanged
 FAIL  … ONE `=` of padding (20) — value half is EMPTY: the ";" delimiter gets the SAME policy — one policy, two delimiters
 FAIL  … session id with a single trailing `=` and nothing after it (26): does not survive anywhere in the output as a BARE segment
 FAIL  … session id with a single trailing `=` and nothing after it (26): the parameter COUNT is unchanged
 FAIL  … session id with a single trailing `=` and nothing after it (26): the ";" delimiter gets the SAME policy
 FAIL  a PADDED credential segment … > BOTH sub-branches: a value half of only `=` (two-pad) and an EMPTY value half (one-pad) redact WHOLE
 FAIL  a PADDED credential segment … > the SAME rule on the SAME helper covers the `;` delimiter — one policy, two delimiters
 FAIL  a PADDED credential segment … > ACCEPTED COST (CR-07): `?debug=` loses its NAME as well as its value
 FAIL  a PADDED credential segment … > THE DEGENERATE SHAPES: a segment that is exactly `=`, and one that is exactly `==`
 FAIL  RESIDUALS … > RESIDUAL, PINNED: URL_MAX truncation can land INSIDE a `<redacted>` marker, and the fragment it leaves is IDEMPOTENT
 FAIL  the URL HEAD … > a PADDED bare `;` segment with TWO `=` of padding is redacted WHOLE — the `=` was padding, not a separator
 FAIL  the URL HEAD … > a PADDED bare `;` segment with ONE `=` of padding — the EMPTY value half, the other sub-branch
 FAIL  the URL HEAD … > a `;` segment that is a token with a single trailing `=` and nothing after it
 FAIL  the URL HEAD … > ACCEPTED COST (CR-07) on the `;` delimiter too: `;debug=` loses its NAME as well as its value
 FAIL  the URL HEAD … > a `;` segment that is exactly `=` was never a pair
 FAIL  the URL HEAD … > a `;` segment that is exactly `==` was never a pair either
 FAIL  the URL HEAD … > the credential literals do not survive ANYWHERE in the output
 FAIL  recordObservation writes the redacted URL, not the raw one > a PADDED credential does not reach the column on EITHER delimiter (CR-07, T-01-78, T-01-79)
```

One full failure message from the mutation run:

```
AssertionError: https://cdn.test/a.js?dXNlcjpwYTU1dzByZA==: the PADDING-STRIPPED CORE `dXNlcjpwYTU1dzByZA` survived in https://cdn.test/a.js?dXNlcjpwYTU1dzByZA=<redacted> — padding carries no information, so the core is the recoverable spelling: expected true to be false // Object.is equality

 ❯ expectSecretAbsent packages/backend/src/store/observations.spec.ts:110:5
 ❯ packages/backend/src/store/observations.spec.ts:1097:7
```

**Both sub-branches are in the red set**, which is the criterion this run exists to satisfy: three failing titles carry `TWO \`=\` of padding` and three carry `ONE \`=\` of padding … value half is EMPTY`. The HEAD-side `;` mirror contributes two more of each.

Restored, and verified restored before the task was called done:

```
$ git diff --exit-code packages/backend/src/store/observations.ts
RESTORED CLEAN: git diff --exit-code packages/backend/src/store/observations.ts -> exit 0

$ pnpm vitest run packages/backend/src/store/observations.spec.ts
 ✓ packages/backend/src/store/observations.spec.ts (171 tests) 39ms
 Test Files  1 passed (1)
      Tests  171 passed (171)
```

---

## THE `.includes(` HIT LIST OVER `observations.spec.ts` — EVERY HIT CLASSIFIED

```
$ grep -n '\.includes(' packages/backend/src/store/observations.spec.ts
 84: * ONE absence assertion, BOTH spellings. Never `out.includes(literal)` alone.
 93: * an empty core, `"x".includes("")` is always true, and the assertion would
104:    out.includes(literal),
108:    out.includes(core),
338:    // PRESENCE, and the only reason a `.includes(` here is not an absence
340:    expect(out.includes("access_token=")).toBe(true);
391:    expect(out.includes("#")).toBe(false);
445:      s.literal.includes("="),
802:    expect(out.includes("#")).toBe(false);
1039:    expect(HEAD_CASES.filter((c) => c.in.includes("@")).length).toBeGreaterThan(
1046:    expect(HEAD_CASES.filter((c) => c.in.includes(";")).length).toBeGreaterThan(
1052:      HEAD_CASES.filter((c) => c.in.includes(";") && c.in.includes("=")).length,
1110:    expect(out.includes("@")).toBe(true);
1111:    expect(out.includes("cdn.test")).toBe(true);
1240:    expect(rows[0].url.includes("token=")).toBe(true);
1376:    expect(rows[0].url.includes("access_token=")).toBe(true);
1525:    if (!source.includes(marker)) {
```

| Line | Kind | Note |
|------|------|------|
| 84, 93 | **comment** | Prose in the helper's doc block, not an assertion. |
| **104, 108** | **ABSENCE — both spellings** | These two lines ARE the shared helper `expectSecretAbsent`: 104 searches the literal, 108 searches the padding-stripped core. **Every credential absence assertion in the file routes through here** — there is no second implementation. |
| 338 | comment | Names the classification for line 340. |
| 340 | **PRESENCE** | `access_token=` — the parameter NAME the policy deliberately keeps. Exempt by kind. |
| 391 | **ABSENCE — structural byte** | `#`. A fragment separator, not a credential: it carries no padding, so its core IS itself and the two-spelling rule is satisfied by identity. Named in the source rather than left to be classified later. |
| 445 | **table filter** | `s.literal.includes("=")` inside the non-vacuity block — selects the `=`-bearing shapes; not an assertion over redactor output. |
| 802 | **ABSENCE — structural byte** | `#`, same as 391 and commented as such. |
| 1039, 1046, 1052 | **table filters** | `HEAD_CASES` non-vacuity counts over `@`, `;` and `=`; not assertions over output. |
| 1110, 1111 | **PRESENCE** | `@` and `cdn.test` — both KEPT by policy; commented as presence assertions in the source. |
| 1240 | **PRESENCE** | `token=` — the parameter name, kept. |
| 1376 | **PRESENCE** | `access_token=` — the parameter name, kept. |
| 1525 | **implementation** | `source.includes(marker)` inside `auditPatternUse`'s non-vacuity check; not an assertion. |

**Zero literal-only credential absence assertions remain.** The fourteen sites that previously read `expect(out.includes(literal)).toBe(false)` — including the four in the `recordObservation` SQLite block and the whole HEAD-side `do not survive ANYWHERE` secrets list — now call `expectSecretAbsent`. Both populations, one helper.

---

## THE CITATION GREP — EVERY TITLE `schema.spec.ts` CITES, COUNTED

```
 2  RESIDUAL, PINNED: a token embedded in a path SEGMENT is NOT redacted
 1  RESIDUAL, PINNED: the retained NAME half of a GENUINE pair is kept whatever it contains
 1  RESIDUAL, PINNED: the retained NAME half, second face
 2  RESIDUAL, PINNED: a SCHEME-RELATIVE reference keeps its userinfo
 2  RESIDUAL, PINNED: a `;` parameter inside the AUTHORITY
 1  RESIDUAL, PINNED: URL_MAX truncation can land INSIDE a `<redacted>` marker
 1  ACCEPTED COST (CR-07): `?debug=` loses its NAME as well as its value
 1  a PADDED credential does not reach the column on EITHER delimiter
 1  HTTP Basic credential, standard base64 with TWO `=` of padding
 1  HTTP Basic credential, standard base64 with ONE `=` of padding
 1  session id with a single trailing `=` and nothing after it
11  BARE_CREDENTIAL_SHAPES
 9  HEAD_CASES

$ grep -cF "01-17" packages/backend/src/store/schema.spec.ts
1
```

Every cited title returns a non-zero hit. The `01-17` hit is inside the amended QUERY ENFORCED entry, which is the proof that the padded grammar's live proof carries a named closer and a plan number rather than a claim.

---

## THE VALIDATION-LEDGER BYTE-IDENTITY CHECK

```
OK   01-15/T1
OK   01-15/T2
OK   01-15/T3
OK   01-16/T1
OK   01-16/T2
OK   01-16/T3
OK   01-17/T1
OK   01-17/T2
ALL EIGHT BYTE-IDENTICAL
```

Each row's Automated Command was compared, after XML-entity decoding, against the `<automated>` block of the corresponding task in `01-15-PLAN.md`, `01-16-PLAN.md` and `01-17-PLAN.md`. `status: draft` and `wave_0_complete: false` are untouched.

---

## THE RESTORED BASELINE

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  995 passed (995)

$ pnpm typecheck   -> exit 0
$ pnpm lint        -> exit 0
$ pnpm knip        -> exit 0

$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto

$ pnpm vitest run packages/backend/src/store/observations.spec.ts packages/backend/src/store/schema.spec.ts
 Test Files  2 passed (2)
      Tests  180 passed (180)
```

Baseline before this plan: 31 files / 931 tests. After: 31 files / **995 tests** (+64). The floor of "no fewer than 31 files and no fewer than 931 tests" holds, and the `auditPatternUse` block is green — the standing proof that no pattern entered `observations.ts`.

The scope guards:

```
$ git diff --exit-code 01-01-PLAN.md … 01-14-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md
GUARD 10 CLEAN: no historical artifact touched

$ git diff --exit-code scripts/ tests/ packages/backend/src/outbound-prohibition.spec.ts \
    packages/backend/src/store/error-redaction.spec.ts packages/backend/src/telemetry.ts
GUARD 11 CLEAN: plans 01-16 and 01-17 territory untouched
```

---

## THE DISPOSITION OF ROWS ALREADY WRITTEN — `leave`, ON P8-D1's CLOSURE HALF ALONE

A build between plan 01-10 and this fix could have written a padded credential into `observations.url`. The disposition is **leave**, and it FOLLOWS from decision P8-D1 rather than needing a new decision — but only on one of P8-D1's two halves, and the split matters enough to state rather than to cite the decision whole.

**The CLOSURE half transplants cleanly.** DefMiner has never shipped, so only a developer machine can hold such a row; and every build from this plan onward redacts at write, so no new one can ever be added. The set cannot grow, and it can exist only on this developer's machine.

**The MEASURED half does NOT, and is deliberately not claimed.** P8-D1's zero was counted against PRE-01-07 rows. **Nobody has ever counted the padded-credential population, and this plan does not count it either.** Citing P8-D1 without that distinction would read as a measurement that was never taken — which is this round's own subject. `01-08-SUMMARY.md` makes the split itself, calling the measured-zero half *"true but weak, and it is not the one the operator acted on"*, so the honest citation is to the load-bearing half alone.

**Why closure without a count suffices here:** a set that cannot grow and can exist only on one developer's machine has no follow-up question a number would answer. That is precisely the distinction P8-D1 draws.

**The one fact that IS known about the traffic** — offered as a fact about the writes, not as a measurement of the rows: every write into that database came from a tracer run, and all five of `tracer-e2e.sh`'s dye values are `openssl rand -hex`. Hex carries no `=`. No run this repository has ever performed could have produced the shape.

No new checkpoint was opened. No new count was performed. The question is recorded rather than left unstated, because an unstated question reads as an unnoticed one.

---

## THE FOUR RESIDUALS THIS PLAN PINS

| Residual | Pinned by (executed case) | Owner |
|----------|---------------------------|-------|
| **The retained NAME half of a genuine pair** — kept up to `QUERY_NAME_MAX` whatever it contains, so a credential pasted in name position survives, and so does the prefix of a token with an interior `=` | `RESIDUAL, PINNED: the retained NAME half of a GENUINE pair is kept whatever it contains` and `RESIDUAL, PINNED: the retained NAME half, second face` | **Kept BY POLICY** — the operator's UAT decision of 2026-08-21. Listed as the second OPEN grammar in `schema.spec.ts`. Closing it would undo the decision, not implement it. |
| **Scheme-relative userinfo** — `//user:pw@cdn.test/a.js` keeps its userinfo, because the authority is resolved after the first `://` | `RESIDUAL, PINNED: a SCHEME-RELATIVE reference keeps its userinfo` (standalone case + `HEAD_CASES` entry) | **ACCEPTED** (T-01-82). Unreachable through `consumer.ts`'s `rr.request.getUrl()`, which is absolute. Precondition now stated on the USERINFO ENFORCED row. |
| **`;` inside the AUTHORITY** — `https://cdn.test;jsessionid=S/app.js` is byte-identical, because the `;` loop runs over `s.slice(pathStart)` | `RESIDUAL, PINNED: a `;` parameter inside the AUTHORITY` (standalone case + `HEAD_CASES` entry) | **ACCEPTED** (T-01-82). Same caller precondition. The `;` ENFORCED row is now qualified to the PATH. |
| **The `URL_MAX` truncation boundary** — truncation lands inside a `<redacted>` marker, leaving the measured tail `p133=<re` | `RESIDUAL, PINNED: URL_MAX truncation can land INSIDE a `<redacted>` marker, and the fragment it leaves is IDEMPOTENT` | **A later phase**, alongside the `URL_MAX` bound itself. |

The `URL_MAX` residual's reason is measured, not asserted. The obvious repair — drop the partial marker so the string ends `…&p133=` — **interacts with this plan's new branch**: a segment whose value half is empty now redacts whole, so a second pass over `…&p133=` produces `…&<redacted>` and the idempotence invariant asserted across every case in this file breaks. That interaction is EXECUTED inside the pinned case:

```ts
expect(normaliseObservedUrl("https://cdn.test/a.js?p133=")).toBe(
  `https://cdn.test/a.js?${QUERY_VALUE_REDACTION}`,   // the name is gone
);
```

**The size of the job:** truncate on a `&` boundary rather than mid-marker, which drops the whole trailing segment instead of half a marker and keeps both invariants.

---

## Decisions Made

1. **A pair whose value half is empty or is entirely `=` was never a pair.** The predicate is implemented as a plain character loop over the value half — no pattern, no `RegExp`, no `URL` constructor, no new import, because `REDOS_RECOVERY` is `kill` on this runtime and the shipped bundle's whole import set is one specifier.
2. **ACCEPTED COST, stated rather than discovered:** `?debug=` now loses its NAME as well as its value. This is the faithful reading of decision P10-D1 rather than an extension of it — `?debug` with no `=` at all is ALREADY redacted whole under that decision, and treating `?debug=` differently would make the policy turn on a byte that carries nothing. Recorded beside the branch, pinned by a titled case, and **no new operator checkpoint was opened**.
3. **The retained NAME half is listed as OPEN, not closed.** It is kept by policy; the honest move is to name it in the OPEN list, not to redact it.
4. **The QUERY ENFORCED entry's live-proof sentence is scoped**, with plan 01-17 named by number as the owner of the padded grammar's live proof. Widening the paragraph while leaving that sentence unscoped would have asserted an end-to-end run that does not exist for two waves — this round's own defect, inside the paragraph fixing it.
5. **The URL_MAX truncation residual is pinned, not fixed**, because the obvious repair interacts with decision 1 above and would break an invariant asserted file-wide.

## Deviations from Plan

None — plan executed exactly as written. No deviation rule fired: no bug outside the one the plan targets, no missing critical functionality, no blocker, and no architectural change.

## Issues Encountered

Two, both mechanical and both resolved inside the task that hit them:

1. **Prettier formatting** rejected the first shape of `expectSecretAbsent` (one `prettier/prettier` error). Resolved with `pnpm exec eslint --fix` on the single file; `pnpm lint` exits 0. Note for future runs: `npx eslint` fails on this repo with `EBADDEVENGINES` — `pnpm exec` is the correct invocation.
2. **A template-literal test title** initially embedded backticks around `;`, which is a syntax error inside a template literal. Changed to `";"` in the title text.

Neither reached a commit.

## Known Stubs

None. No hardcoded empty value, placeholder string, `TODO`, `FIXME` or unwired component was introduced. Every case added is executed and asserts real behaviour; the five `RESIDUAL, PINNED` cases assert CURRENT behaviour deliberately and are documented above with owners.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change was introduced — the schema is untouched, and the only behavioural change narrows what reaches a durable column.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Ready for **plan 01-16** (the gate widenings: the CORE-11 unreadable receiver, the rendered-error axis, the pattern gate's module-local premise). The redaction branch 01-16 and 01-17 both depend on is now correct, which was the reason this plan ran first in the round.

Two things are explicitly owed to later plans and are named in the source rather than left to be found:

- **Plan 01-17** owns the padded grammar's LIVE proof and is named BY NUMBER inside the amended `schema.spec.ts` QUERY ENFORCED entry as the amender of its live-proof sentence. Until that plan's committed run exists, the padded grammar is stated as unit-proven — which it is.
- **A later phase** owns the `URL_MAX` truncation boundary, with its measured reason and the size of the job recorded in the pinned case.

The `STORE-03` / `STORE-01` requirement-id collisions remain a recorded deferral with an owner (the operator, at the next requirements pass, by the `STORE-01` → `STORE-08` route). This plan did not fix the ledger and did not pretend to.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-22*

## Self-Check: PASSED

All four modified files verified present on disk. All five commits verified present in `git log --oneline --all`:
`506ee3d`, `0fdac5c`, `0cfc443`, `9fffb52`, `0f12f91`.
