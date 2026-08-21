---
phase: 01-skeleton-persistence-compatibility
plan: 13
subsystem: security
tags:
  [
    typescript-ast,
    static-analysis,
    gate,
    error-redaction,
    store-07,
    useUnknownInCatchVariables,
  ]

requires:
  - phase: 01-07
    provides: "The round-1 redaction gate — auditSource, the four rules, the describeError descent guard and the negative fixtures this plan widened rather than replaced"
  - phase: 01-11
    provides: "describeError / redactPaths in telemetry.ts — the safe renderer this gate's whole rule is written around, and the ERROR_TEXT_LIMIT <= ERROR_MAX assertion behind analyses.ts:228"
  - phase: 01-12
    provides: "Sequencing only: 01-12's three mutation windows against the shipped tree had to close before this plan opened one of its own while asserting the whole suite is green. Also the binding-following approach this gate reuses rather than reinvents."
provides:
  - "STORE-07's gate at a reach that FOLLOWS the binding — casts, parentheses, non-null assertions, property and element access, a call on a member, and one hop of copy"
  - "All 6 shapes the verifier's 8-shape probe found MISSED now report; both controls still do — executed as suite cases, not as a document"
  - "All 10 shapes in 01-REVIEW.md CR-05's executed table now report, from 0 of 10"
  - "Two new positions: unredacted-return and unredacted-object-value — the two the analyses.error write path actually travels"
  - "Rule 4 reaches an ObjectBindingPattern parameter, keyed on the PROPERTY name with the BOUND name scanned"
  - "The gate's header names the three renders outside its store/ scope, each with an owner checkable against ROADMAP.md:396 — or with NO owner, in those words, for the one that is correct"
affects:
  [phase-02-ERR-03, phase-02-ERR-04, phase-02-observability, 01-14]

actuals:
  # chars/4 over the one durably modified file (41,235 chars), the same
  # convention 01-12-SUMMARY.md's actuals used. The realized diff alone is
  # 33,404 chars / 4 = 8,351.
  tokens: 10309
  tasks: 1
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Follow the binding, do not match it: an AST gate that unwraps type-only wrappers and descends through member access instead of enumerating spellings"
    - "Evasions enumerated and confirmed RED before the rule that catches them, with the counter-fixtures GREEN from the start so the widening cannot become always-on"
    - "A disclosed residual carries an OWNER with a checkable requirement id, or is explicitly declared to have none"
    - "Mutation-proof BOTH ways: the new gate fails on the planted render, and the old gate is shown passing on the identical tree"

key-files:
  created: []
  modified:
    - packages/backend/src/store/error-redaction.spec.ts

key-decisions:
  - "`derivesFrom` descends through a call whose callee is a member — that one clause is what makes `e.toString()` visible — and terminates with `false` at any `describeError(...)` it meets, at whatever depth. That termination, not a file-name exception, is what keeps `describeError(e).slice(0, 200)` (a call, on a member, of a call) quiet."
  - "Copy tracking is ONE hop, by a `const`/`let` initializer only, collected in document order in the same walk. `const x = e; const y = x; String(y)` is NOT seen, and boundary 2 says so rather than implying otherwise."
  - "Rule 4's destructured form keys on the PROPERTY name and scans the BOUND name. Keying on the bound name alone misses `{ error: err }`; keying on the property name alone scans an identifier that does not exist in the body. The `ParameterDeclaration`-only matching that stops `analyses.ts:87`'s type member being flagged is kept intact."
  - "`telemetry.ts:422` is named in the header WITH NO OWNER, in those words. `describeError`'s parameter is called `e`, so a future STORE_DIR widening fires this gate on the renderer it exists to protect; that widening must exempt the SAFE_RENDERER declaration by construction, never by a file-name check."
  - "The header's owner claims cite requirement IDS (ERR-03, ERR-04) and not just 'Phase 2', so a reader can check them against ROADMAP.md:396 rather than trust them. Both were verified against that table before being written."
  - "`textOf` is written with split/join rather than a pattern: this package's discipline is that a regex is a thing you justify (telemetry.ts's one permitted literal, REDOS_RECOVERY=\"kill\"), and a failure message is not worth justifying one for."

patterns-established:
  - "Two-sided mutation proof: plant the render, show the NEW gate failing by file + rule + form, then run the OLD walk against the identical mutated tree and show it reporting clean. The blindness becomes executed evidence rather than an argument."
  - "Counter-fixtures green before the rule changes: the nine must-stay-quiet shapes were written in the same RED commit and passed there, so a widening that turned always-on would have shown up as a NEW failure rather than as a missing test."

requirements-completed: [STORE-07]

coverage:
  - id: D1
    description: "Every shape the verifier's 8-shape STORE-07 probe found MISSED now reports, and both controls are still caught"
    requirement: STORE-07
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#the 8-shape STORE-07 probe from 01-VERIFICATION.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "All ten shapes in 01-REVIEW.md CR-05's executed table now produce at least one violation, from zero of ten"
    requirement: STORE-07
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#CR-05's 10-shape executed table from 01-REVIEW.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "The gate follows the binding through reach, cast, assert, parenthesise and one hop of copy — 13 shapes — and reports it in the two new positions, a return value and an object-literal value"
    requirement: STORE-07
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#the gate follows the binding — reach, cast, assert, parenthesise, copy"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#the two positions CR-05 names — a return value and an object-literal value"
        status: pass
    human_judgment: false
  - id: D4
    description: "Rule 4 reaches a destructured error-shaped parameter in both forms — { error } and { error: err }"
    requirement: STORE-07
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#rule 4 reaches a DESTRUCTURED error-shaped parameter"
        status: pass
    human_judgment: false
  - id: D5
    description: "The widened rule is NOT always-on: nine legal shapes stay quiet, including the real store shape return { ok: false, error: describeError(e).slice(0, 200) }, and the real store layer reports ZERO violations with no per-file exception"
    requirement: STORE-07
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#the widened rule is NOT always-on — nine shapes that must stay quiet"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#reports ZERO violations across the store layer"
        status: pass
    human_judgment: false
  - id: D6
    description: "The rule is mutation-proven against a REAL catch in store/artifacts.ts, and the round-1 walk is shown reporting the identical mutated tree clean"
    requirement: STORE-07
    verification:
      - kind: command
        ref: "(e as Error).message planted at artifacts.ts:113 -> gate FAILS naming artifacts.ts / unredacted-object-value / the form; HEAD~1 walk on the same tree PASSES; restored, git diff --exit-code clean"
        status: pass
    human_judgment: false
  - id: D7
    description: "The header names the three renders outside the gate's store/ scope, each with why and with its owner (or explicitly with none)"
    requirement: STORE-07
    verification:
      - kind: command
        ref: "grep -c 'describeError' = 21 (>=5); grep -c 'ERR-03\\|ERR-04' = 3 (>=1); all of compat.ts:317, hooks/passive.ts:171, telemetry.ts:422 named; ERR-03/ERR-04 cross-checked against ROADMAP.md:396"
        status: pass
    human_judgment: true
    rationale: "The greps prove the names and the ids are present. Whether the disclosure reads as a DECISION rather than as a hole — which is the thing this boundary exists to achieve — is a judgment a command cannot make."

duration: 13 min
completed: 2026-08-21
status: complete
---

# Phase 01 Plan 13: The STORE-07 Redaction Gate Follows the Binding Summary

`derivesFrom` replaces `isRefTo`, so the redaction gate now sees `e.message`, every cast form `useUnknownInCatchVariables` pushes an author toward, one hop of copy, a returned binding, an object-literal value and a destructured error-shaped parameter — 16 of 16 probe shapes that used to report clean, with the real store layer still at zero and nine counter-fixtures still quiet.

**Duration:** 13 min (start 14:19Z, end 14:33Z) · **Tasks:** 1 · **Commits:** 3 · **Files durably modified:** 1

---

## What Was Built

One task, one durable file. `packages/backend/src/store/error-redaction.spec.ts` went from 415 lines to 1,005.

| Change | What it closes |
|---|---|
| `unwrap` + `derivesFrom(node, names)` replacing the two-line `isRefTo` | `e.message`, `String(e.message)`, `e.toString()`, `(e as Error).message`, `String(e as Error)`, `` `${e as any}` ``, `String((e))`, `String(e!)`, `e["message"]` — all at once, which is why CR-05 proposed a walk rather than a list of special cases |
| One hop of copy inside `scanFor` | `const x = e; String(x)` |
| `JSON.stringify(x)` and `[x].join(…)` as render forms | `JSON.stringify(e)` (worse than `String(e)`: it serialises enumerable own properties, and a driver rejection's are the bound parameters), `[e].join("")` |
| `unredacted-return` | the binding, or anything derived from it, handed back to a caller that will render it |
| `unredacted-object-value` | `return { ok: false, error: e.message }` — the shape every write result in this directory has, and the shape `compat.ts:317` uses |
| `ObjectBindingPattern` in rule 4 | `function fin({ error })` and `function fin({ error: err })` |
| `visit(root)` instead of `forEachChild(root, visit)` | a concise arrow body — see Deviations |
| Boundaries block rewritten from 2 to 4 | the reach, the residual, the three out-of-scope renders **with owners**, and the deliberate `unwrap` duplication `outbound-prohibition.spec.ts` boundary 3 already names from its side |
| `db.ts` added to the non-vacuity module list | IN-10 |

---

## Evidence

### The verifier's 8-shape STORE-07 probe, re-run — before/after

Before column: `01-VERIFICATION.md:175-184`, re-confirmed by executing the fixtures against the round-1 walk in commit `3f83450` (33 failed | 27 passed). After column: commit `4e16c11`.

| Shape | Before | After |
|---|---|---|
| `catch(e){ return String(e); }` (control) | ✓ CAUGHT | ✓ CAUGHT |
| `catch(ex){ return String(ex); }` (name outside the listed set) | ✓ CAUGHT | ✓ CAUGHT |
| `catch(e){ return (e as any).message; }` | ✗ MISSED | ✓ CAUGHT |
| `catch(e){ return "x: " + e.message; }` | ✗ MISSED | ✓ CAUGHT |
| `catch(e){ return String(e as Error); }` | ✗ MISSED | ✓ CAUGHT |
| `catch(e){ return e.toString(); }` | ✗ MISSED | ✓ CAUGHT |
| `catch(e){ return JSON.stringify(e); }` | ✗ MISSED | ✓ CAUGHT |
| `catch(e){ const x = e; return String(x); }` | ✗ MISSED | ✓ CAUGHT |

**6 missed → 0 missed.** Both controls still caught, so the widening broke nothing.

### CR-05's 10-shape executed table, re-run — before/after

| Shape | Before (`01-REVIEW.md:748-759`) | After |
|---|---|---|
| `catch(e){ return e.message; }` | `[]` | ✓ |
| `catch(e){ return "x: " + e.message; }` | `[]` | ✓ |
| ``catch(e){ return `x: ${e.message}`; }`` | `[]` | ✓ |
| `catch(e){ return String(e.message); }` | `[]` | ✓ |
| `catch(e){ return e.toString(); }` | `[]` | ✓ |
| `catch(e){ return JSON.stringify(e); }` | `[]` | ✓ |
| `catch(e){ return String(e as Error); }` | `[]` | ✓ |
| ``catch(e){ return `${e as any}`; }`` | `[]` | ✓ |
| `catch(e){ const x = e; return String(x); }` | `[]` | ✓ |
| `catch(e){ return [e].join(""); }` | `[]` | ✓ |
| `function fin({ error }: {…})` (rule 4, `param destructured []`) | `[]` | ✓ |

**10 of 10 missed → 10 of 10 reporting**, plus the destructured parameter CR-05 called out separately.

### RED first, verbatim

Every fixture above was written and run against the **unmodified** round-1 walk before a line of that walk was touched — commit `3f83450`:

```
 Test Files  1 failed (1)
      Tests  33 failed | 27 passed (60)
```

The 27 that passed are the 16 pre-existing cases, the 2 controls, and **all nine must-stay-quiet counter-fixtures**. That split is the point: the counter-fixtures were green *before* the widening, so a rule that became always-on would have shown up as a new failure rather than as a test nobody wrote.

### Mutation, RUN — the failure block verbatim

`(e as Error).message` planted into the real catch at `packages/backend/src/store/artifacts.ts:113`:

```
 FAIL  packages/backend/src/store/error-redaction.spec.ts > error redaction over packages/backend/src/store (STORE-07, T-01-33, T-01-52) > reports ZERO violations across the store layer
AssertionError: [
  {
    "file": "artifacts.ts",
    "rule": "unredacted-object-value",
    "detail": "catch (e): `(e as Error).message` is an object-literal property value without describeError(). That object is what reaches the `analyses.error` column."
  }
]: expected [ { file: 'artifacts.ts', …(2) } ] to deeply equal []

 Test Files  1 failed (1)
      Tests  1 failed | 61 passed (62)
```

It names the file, the rule and the form.

**And the other half of the proof, which matters more.** With that identical mutation still planted, the round-1 walk (`git show HEAD~1:…/error-redaction.spec.ts`) was run against the same tree:

```
=== round-1 walk (isRefTo) vs the SAME planted mutation ===
 ✓ packages/backend/src/store/error-redaction.spec.ts (60 tests | 59 skipped) 28ms
 Test Files  1 passed (1)
      Tests  1 passed | 59 skipped (60)
```

The old gate reports a real store module rendering `(e as Error).message` into the `analyses.error` column as **clean**. CR-05's blindness is now executed evidence against the shipped tree, not an argument about a fixture.

Restored:

```
$ git checkout -- packages/backend/src/store/artifacts.ts
$ git diff --exit-code packages/backend/src/store/artifacts.ts
artifacts_diff_exit=0
$ sed -n 112,114p packages/backend/src/store/artifacts.ts
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
$ git status --porcelain packages/
(empty)
```

### The green baseline, restored

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  931 passed (931)

$ pnpm typecheck   -> TYPECHECK_OK   (tsc --build, exit 0)
$ pnpm lint        -> LINT_OK        (eslint ., exit 0)
$ pnpm knip        -> KNIP_OK        (exit 0)
$ pnpm build:backend
[*] Plugin package built successfully
$ pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto

$ pnpm vitest run packages/engine/src/boundary.spec.ts
      Tests  15 passed (15)
```

885 tests at dispatch → **931** (+46, all in this file: 62 cases here, up from 16). 31 files, unchanged. `check:bundle` still exactly one specifier.

### Acceptance greps

```
$ grep -c 'describeError' packages/backend/src/store/error-redaction.spec.ts        -> 21   (>= 5)
$ grep -c 'ERR-03\|ERR-04' packages/backend/src/store/error-redaction.spec.ts       -> 3    (>= 1)
$ grep -c 'compat.ts:317\|hooks/passive.ts:171\|telemetry.ts:422' …spec.ts          -> 4    (all three named)
```

`ERR-03` and `ERR-04` were cross-checked against `.planning/ROADMAP.md:396` (`ERR-01 … ERR-04, OBS-01 … OBS-03 | Phase 2`) and `:133` before being written into the header. `REQUIREMENTS.md:156-157` confirms the texts quoted.

---

## OPEN ITEMS

| Open item | Owner | Why it is open |
|---|---|---|
| `compat.ts:317` renders `String(e).slice(0, 160)` into the per-surface `error` field | **Phase 2 — ERR-04** | Outside `store/`, outside the UAT gap, T-01-37 `accept`. ERR-04 rewrites how a per-artifact failure is recorded and surfaced, so the redaction decision is that author's to make rather than deferred past them. Verified against `ROADMAP.md:396`. |
| `hooks/passive.ts:171` renders `String(e).slice(0, 160)` into `sdk.console.log` | **Phase 2 — ERR-03** | Same. ERR-03 owns catching and logging errors thrown inside `onInterceptResponse`, which is this exact line. Verified against `ROADMAP.md:396`. |
| STORE-03 and STORE-07 are declared for redaction work neither requirement's text mentions | **the operator, at the next requirements pass** | STORE-07 — this plan's own declared id — reads "All SQL uses positional `?` parameters". Inherited from 01-01/01-07, marked in `REQUIREMENTS.md` by plan 01-10 task 3 with the reason for deferring rather than splitting alongside CORE-11. Same UAT route that produced STORE-08. **The ledger is tidier after CORE-11; it is not clean, and this plan did not clean it.** |
| The walk is scope-blind, tracks copies ONE hop, and cannot follow a value across a function boundary | this gate's next author, if a case appears | Boundary 2 states it as the honest bound. It over-approximates on shared names (safe direction) and under-approximates on multi-hop indirection (unsafe direction). Nothing in `store/` uses either shape today; the mutation run is what stands behind the bound, not the paragraph. |

`telemetry.ts:422`'s `String(e)` is deliberately **not** in that table. It is inside `describeError`'s own implementation, it is correct, and giving it an owner would imply work that must not be done. It is named in the gate's header anyway, because `describeError`'s parameter is called `e` and a future `STORE_DIR` widening will fire this gate on the renderer it exists to protect — that widening must exempt the `SAFE_RENDERER` declaration by construction, never by a file-name check.

All four rows above are recorded in `.planning/WINDOWS.md` so they survive past this SUMMARY scrolling out of context.

---

## Deviations from Plan

### [Rule 1 — Bug] The plan cited `telemetry.ts:272`; the real line is `:422`

- **Found during:** Task 1 `<read_first>`, before writing the header.
- **Issue:** `01-13-PLAN.md` names `packages/backend/src/telemetry.ts` line 272 as the `String(e)` inside `describeError`. Line 272 is a JSDoc line for `PATH_REDACTION`. The actual `const body = String(e);` inside `describeError` is at **line 422**. Writing 272 into the header would have shipped an owner-and-boundary disclosure that a reader following the citation could not confirm — the exact failure 01-12 recorded as its lesson 3 ("verify a live case exists before citing it").
- **Fix:** verified with `grep -n "String(e)" packages/backend/src/telemetry.ts` and by reading `describeError` in full; the header says `:422`.
- **Files modified:** `packages/backend/src/store/error-redaction.spec.ts` (header only).
- **Verification:** `sed -n 395,435p packages/backend/src/telemetry.ts` shows `const body = String(e);` at 422 inside `export function describeError(e: unknown)`.
- **Commit:** `4e16c11`.

### [Rule 2 — Missing critical functionality] `scanFor` entered a function body with `forEachChild` and skipped a concise arrow body

- **Found during:** Task 1, while wiring rule 4's destructured form.
- **Issue:** `scanFor` started with `ts.forEachChild(root, visit)`. For a **block** body that is correct. For a **concise arrow body** — `(e) => String(e)` — `root` *is* the `String(e)` call, so the walk descended past the only node that could ever match and reported clean. Not listed in `<behavior>`, not in either probe, and the same class of hole as CR-05: a render form the rule could not see. Rule 4 is the rule that guards the `analyses.error` column, and a one-line arrow taking an `error` parameter is an ordinary refactor of `finishAnalysis`.
- **Fix:** `visit(root)` instead of `ts.forEachChild(root, visit)` — identical behaviour for blocks (no rule matches a `Block` node), correct for expressions.
- **Verification:** mutation-proven rather than asserted. Restoring `ts.forEachChild(root, visit)` produced `Tests 1 failed | 61 passed (62)`, the single failure being the new case `flags a CONCISE ARROW BODY, which is the whole expression rather than a block`. Restored, 62/62.
- **Commit:** `4e16c11`.

### [Rule 2 — Missing critical functionality] Shorthand object property

- **Found during:** Task 1, implementing `unredacted-object-value`.
- **Issue:** `return { error }` is the identical render position to `return { error: e }` and would have been the obvious way to evade a rule that checked `PropertyAssignment` only.
- **Fix:** `ShorthandPropertyAssignment` whose name is in the binding set fires the same rule. Fixture added; confirmed it does not fire on `migrations.ts:183`'s real `{ step, ok: false, error: describeError(e) }`.
- **Commit:** `4e16c11`.

**Total deviations:** 3 auto-fixed (1 × Rule 1, 2 × Rule 2). **Impact:** the Rule 1 fix prevents shipping an unverifiable citation in the one paragraph whose whole purpose is to be checkable. The two Rule 2 fixes close reach holes of the same class as CR-05 that neither probe threw at the gate.

**No rule had to be narrowed.** The real store layer reported zero under the widened rules on the first run, with no per-file exception and no change to any of the nine counter-fixtures.

**Not done, deliberately:** no historical artifact was touched — `01-01-PLAN.md` … `01-12-PLAN.md`, `01-VERIFICATION.md`, `01-REVIEW.md`, `01-UAT.md`, `01-VALIDATION.md` are all clean. Neither `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` nor `packages/backend/src/outbound-prohibition.spec.ts` was edited: those belong to 01-10 and 01-12, and repeating them here is how the earlier edit gets reverted. `scripts/ci/check-bundle-imports.mjs` untouched (P9-D2).

---

## Authentication Gates

None.

## Known Stubs

None. The gate ships no placeholder, no per-file exception and no skipped case.

## Issues Encountered

None blocking. The four residuals above are recorded, owned and ledgered.

---

## Commits

| Gate | Commit | Message |
|---|---|---|
| RED | `3f83450` | `test(01-13): enumerate the STORE-07 gate's evasions before widening it` |
| GREEN | `4e16c11` | `feat(01-13): make the STORE-07 gate follow the binding instead of matching it` |
| docs | this one | `docs(01-13): complete the binding-following redaction gate plan` |

No REFACTOR commit: the widened walk is the shape it was designed as, and a cleanup pass with no behaviour change would have been a commit for the commit's sake.

## Next Phase Readiness

Wave 13 of 14 complete. `01-14` (the bare-segment branch revert under a live Caido) is the last plan in this phase; it touches `observations.ts` and its spec, which this plan does not.

Phase 2 inherits two named, owned work items — ERR-03 at `hooks/passive.ts:171` and ERR-04 at `compat.ts:317` — and will find the gate's header telling it what is already guaranteed and what is not, which is what `01-REVIEW.md` CR-05 said those authors would do.

## Self-Check: PASSED

- `packages/backend/src/store/error-redaction.spec.ts` — FOUND (1,005 lines, 41,235 bytes)
- `.planning/phases/01-skeleton-persistence-compatibility/01-13-SUMMARY.md` — FOUND
- Commit `3f83450` — FOUND in `git log --oneline --all`
- Commit `4e16c11` — FOUND in `git log --oneline --all`
- `git diff --exit-code packages/backend/src/store/artifacts.ts` — exit 0, mutation fully reverted
- `git status --porcelain packages/` — empty
- All plan `<verification>` items 1-9 re-run and recorded above
