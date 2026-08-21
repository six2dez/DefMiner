---
phase: 01-skeleton-persistence-compatibility
plan: 10
subsystem: database
tags: [redaction, sqlite, url, credentials, requirements-ledger, caido]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "redactQueryValues / normaliseObservedUrl at the observations write path (01-07), and the outbound-prohibition AST gate tagged CORE-01 (01-09)"
provides:
  - "Decision P10-D1 on record: a bare (`=`-less) query segment is a VALUE WITH NO NAME and is redacted whole"
  - "`redact-bare` implemented in the `eq === -1` branch of `redactQueryValues` — closed by construction, not by a bound"
  - "`BARE_CREDENTIAL_SHAPES`: eight executed cases, one per credential format, every one mutation-proven RED against the reverted branch"
  - "A round-trip case through the real SQLite fixture covering a bare credential, so an unwired redactor still fails"
  - "CORE-11 — the outbound-traffic prohibition — opened in REQUIREMENTS.md, the ROADMAP requirement line and the ROADMAP traceability row, BEFORE plan 01-12 declares it"
  - "STORE-03 and STORE-07 marked as known ledger collisions, deferred with a stated reason and a named owner"
  - "schema.spec.ts's T-01-21 claim restated PER URL GRAMMAR, with the three open grammars named and owned"
  - "01-VALIDATION.md extended with twelve task rows for plans 01-10 … 01-14"
affects: [01-11, 01-12, 01-13, 01-14, phase-verification, phase-4-secrets]

actuals:
  tokens: 15667
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Close a disclosure hole by CONSTRUCTION (a rule) rather than by a BOUND (a number), when the bound would be choosing which credentials are acceptable to keep"
    - "Amend a contradicted spec case in place with a dated note that quotes the false claim verbatim — never delete it"
    - "A ledger POINTER may be amended in place when the thing it points at is renamed, visibly and with a dated note; a ledger's EVIDENCE is never rewritten"

key-files:
  created: []
  modified:
    - packages/backend/src/store/observations.ts
    - packages/backend/src/store/observations.spec.ts
    - packages/backend/src/store/schema.spec.ts
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/phases/01-skeleton-persistence-compatibility/01-VALIDATION.md

key-decisions:
  - "P10-D1: `redact-bare` — a query segment with no `=` is a value with no name and is replaced with `<redacted>`; an empty segment stays empty. Operator decision at a `gate=\"blocking-human\"` checkpoint, 2026-08-21."
  - "`tighten-bound` rejected on MEASUREMENT, not taste: a 12-character token survives any bound >= 12, and a bound low enough to catch it truncates `disableAnalytics` and `enableExperimentalFeature` into prefixes that read as real flag names."
  - "`allowlist` rejected as a STARTING point but kept reachable: it can be layered onto `redact-bare` once a corpus of real bundle-URL flags exists; a by-construction guarantee cannot be recovered after shipping a guessed list."
  - "CORE-11 split out of CORE-01 in wave 10, not at the end of the phase, so plan 01-12 can declare the requirement it enforces in its own frontmatter — which is what a verifier reads."
  - "The SOURCE half of the CORE-11 retag (the gate's header and failure strings) deliberately left to plan 01-12, which rewrites that file wholesale — two plans editing one paragraph two waves apart is how the second silently reverts the first."

patterns-established:
  - "Adversarial fixture tables: build the case list from the formats an independent verifier named, not from what the new branch happens to catch"
  - "Per-grammar claims: a security assertion about a column is stated per input grammar, each half naming its enforcing spec or its owner"

requirements-completed: [STORE-01, STORE-03, CORE-11]

coverage:
  - id: D1
    description: "A bare (`=`-less) query segment carrying any of eight credential formats is redacted before the row is written"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#a BARE query segment carrying a credential (P10-D1, T-01-53)"
        status: pass
      - kind: integration
        ref: "packages/backend/src/store/observations.spec.ts#a BARE credential does not reach the column either (P10-D1)"
        status: pass
      - kind: other
        ref: "mutation run — eq === -1 branch reverted to segment.slice(0, QUERY_NAME_MAX): 20 failed / 45 passed, each failure naming the surviving format"
        status: pass
    human_judgment: false
  - id: D2
    description: "CORE-11 opened as its own requirement id across every live ledger, before any plan declares it"
    requirement: "CORE-11"
    verification:
      - kind: other
        ref: "grep -q 'CORE-11' .planning/REQUIREMENTS.md && sed -n '/^### Phase 1:/,/^### Phase 2:/p' .planning/ROADMAP.md | grep -q '^\\*\\*Requirements\\*\\*:.*CORE-11' && grep -q 'CORE-11.*| Phase 1 |' .planning/ROADMAP.md && grep -q 'CORE-11' .planning/STATE.md && git diff --exit-code packages/ && pnpm test"
        status: pass
    human_judgment: false
  - id: D3
    description: "schema.spec.ts's T-01-21 claim states per URL grammar what is enforced and names the three grammars that are open"
    requirement: "STORE-01"
    verification:
      - kind: unit
        ref: "pnpm vitest run packages/backend/src/store/schema.spec.ts tests/schema.spec.ts — 39 passed"
        status: pass
    human_judgment: true
    rationale: "Whether a reader who trusts the paragraph is misled about its reach is a judgement about prose. The automated gate proves the grammars are NAMED (grep 'jsessionid' >= 1) and that the spec passes; it cannot prove the wording is honest."
  - id: D4
    description: "01-VALIDATION.md extended with a task row for every task in plans 01-10 … 01-14"
    verification:
      - kind: other
        ref: "grep -c '^| 01-1[0-4]/T' .planning/phases/01-skeleton-persistence-compatibility/01-VALIDATION.md == 12, matching the <task> count in the five PLAN files"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-08-21
status: complete
---

# Phase 01 Plan 10: Bare-Segment Redaction and the CORE-11 Split — Summary

**A query segment with no `=` is now redacted by construction rather than bounded by a number, with eight mutation-proven credential cases behind it; and the outbound-traffic prohibition has its own requirement id, opened before the plan that enforces it declares it.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-21T15:04Z
- **Completed:** 2026-08-21T15:22Z
- **Tasks:** 4 of 4
- **Files modified:** 7

## Accomplishments

- Closed the executed half of UAT gap 1: `?ghp_AAAA…` no longer survives into `observations.url`, a column `db.ts` documents as never garbage-collected, surviving project deletion and force-reinstall.
- Made the residual FALSIFIABLE, which was the actual blocker. Eight credential formats each have an executed case that goes RED when the branch is reverted — the mutation was run, not described, and its output is pasted below.
- Opened CORE-11 in wave 10, so plan 01-12 can declare the requirement its gate enforces instead of inheriting the "one id, two meanings" defect in the one place a verifier reads.
- Narrowed the T-01-21 claim from one absolute sentence to a per-grammar statement, with userinfo, `;` path parameters and path-embedded tokens named as open and owned by plan 01-11.

## The decision (Task 1)

`checkpoint:decision`, `gate="blocking-human"`. Selected option id, verbatim:

> **`redact-bare`.**

The operator's reasoning, recorded because it is the part that generalises:

> Your finding #1 was decisive against `tighten-bound`. A 12-character opaque token survives at any bound ≥ 12, so catching it needs ≤ 11 — which truncates `disableAnalytics` (16) and `enableExperimentalFeature` (25) into prefixes that still read as real flag names. At the plan's suggested 16 the AWS key is caught but a 16-char token survives exactly and `sk_live_4eC39HqL` stays in the column. A bound picks which credentials are acceptable to keep; a rule does not.

> `allowlist` is reachable later; `redact-bare`'s guarantee is not. Its retained set is closed and length-immune, but Phase 1 has no corpus of real bundle-URL flags, so the list would start as a guess, and a miss is indistinguishable from a caught credential. Starting from `redact-bare` and adding an allowlist once there is real data is a straightforward move. Going the other way — recovering a by-construction guarantee after shipping a guessed list — is not.

**Accepted cost, stated plainly:** bare feature flags (`?debug`, `?nocache`, `?prod`) become `<redacted>`, and bundle-URL flags are a genuine read on a target's build. Feature-flag analysis is not a Phase 1 capability, so nothing that exists today loses a signal it was using.

Recorded as decision **P10-D1** in `.planning/STATE.md`. No source file was modified by this task: `git status --porcelain packages/` was empty when the checkpoint was reached, and the coordinator independently confirmed the tree was byte-identical to dispatch (`b19e0a0`).

### The executed evidence shown to the operator BEFORE the options

Command — a throwaway spec under `tests/` importing the real module, deleted in the same shell invocation:

```
node_modules/vitest/vitest.mjs run tests/__evidence-tmp.spec.ts
```

Output (abridged to the first and last shapes; all eight behaved identically):

```
GitHub PAT (40)  len=40
  bare  IN : https://cdn.test/a.js?ghp_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIII
  bare  OUT: https://cdn.test/a.js?ghp_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIII   <<< SURVIVES BYTE-FOR-BYTE
  named IN : https://cdn.test/a.js?token=ghp_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIII
  named OUT: https://cdn.test/a.js?token=<redacted>
AWS access key id (20)
  bare  OUT: https://cdn.test/a.js?AKIAIOSFODNN7EXAMPLE   <<< SURVIVES BYTE-FOR-BYTE
Stripe secret (32)
  bare  OUT: https://cdn.test/a.js?sk_live_4eC39HqLyjWDarjtT1zdp7dc   <<< SURVIVES BYTE-FOR-BYTE
session id hex (32)
  bare  OUT: https://cdn.test/a.js?9b74c9897bac770ffc029102a200c5de   <<< SURVIVES BYTE-FOR-BYTE
UUID (36)
  bare  OUT: https://cdn.test/a.js?3f2504e0-4f89-11d3-9a0c-0305e82c3301   <<< SURVIVES BYTE-FOR-BYTE
compact JWT (43)
  bare  OUT: https://cdn.test/a.js?eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdef   <<< SURVIVES BYTE-FOR-BYTE
opaque (16)
  bare  OUT: https://cdn.test/a.js?s3cr3tt0k3n1234x   <<< SURVIVES BYTE-FOR-BYTE
opaque (12)
  bare  OUT: https://cdn.test/a.js?s3cr3tt0k3n1   <<< SURVIVES BYTE-FOR-BYTE
```

After `redact-bare` landed, the same eight inputs return `https://cdn.test/a.js?<redacted>`, asserted per shape in `observations.spec.ts`.

## The mutation run (Task 2 acceptance criterion)

Mutation applied: the `eq === -1` branch reverted from `out.push(segment === "" ? "" : QUERY_VALUE_REDACTION)` to `out.push(segment.slice(0, QUERY_NAME_MAX))`.

```
 Test Files  1 failed (1)
      Tests  20 failed | 45 passed (65)
```

Verbatim failure block — every credential format is named by the assertion that caught it:

```
 FAIL  observations.spec.ts > redactQueryValues > a bare flag with no `=` is REDACTED — it is a value with no name (P10-D1, 2026-08-21; previously: kept as a NAME)
AssertionError: expected 'https://x.test/app.js?debug' to be 'https://x.test/app.js?<redacted>' // Object.is equality
 FAIL  observations.spec.ts > redactQueryValues > a BARE segment of ANY length is redacted, and QUERY_NAME_MAX (64) now bounds only the NAME HALF of a pair (P10-D1, 2026-08-21)
AssertionError: expected 'https://x.test/a.js?nnnnnnnnnnnnnnnnn…' to be 'https://x.test/a.js?<redacted>' // Object.is equality
 FAIL  … > GitHub personal access token (40): does not survive anywhere in the output as a BARE segment
AssertionError: https://cdn.test/a.js?ghp_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIII: expected true to be false // Object.is equality
 FAIL  … > AWS access key id (20): does not survive anywhere in the output as a BARE segment
AssertionError: https://cdn.test/a.js?AKIAIOSFODNN7EXAMPLE: expected true to be false // Object.is equality
 FAIL  … > Stripe secret key (32): does not survive anywhere in the output as a BARE segment
AssertionError: https://cdn.test/a.js?sk_live_4eC39HqLyjWDarjtT1zdp7dc: expected true to be false // Object.is equality
 FAIL  … > PHP/Java session id, lowercase hex (32): does not survive anywhere in the output as a BARE segment
AssertionError: https://cdn.test/a.js?9b74c9897bac770ffc029102a200c5de: expected true to be false // Object.is equality
 FAIL  … > canonical UUID with its four hyphens (36): does not survive anywhere in the output as a BARE segment
AssertionError: https://cdn.test/a.js?3f2504e0-4f89-11d3-9a0c-0305e82c3301: expected true to be false // Object.is equality
 FAIL  … > compact JWT (43): does not survive anywhere in the output as a BARE segment
AssertionError: https://cdn.test/a.js?eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdef: expected true to be false // Object.is equality
 FAIL  … > opaque token (16): does not survive anywhere in the output as a BARE segment
AssertionError: https://cdn.test/a.js?s3cr3tt0k3n1234x: expected true to be false // Object.is equality
 FAIL  … > opaque token (12): does not survive anywhere in the output as a BARE segment
AssertionError: https://cdn.test/a.js?s3cr3tt0k3n1: expected true to be false // Object.is equality
 FAIL  … > opaque token (12): the parameter COUNT is unchanged
AssertionError: https://cdn.test/a.js?a=<redacted>&s3cr3tt0k3n1&b=<redacted>: expected true to be false // Object.is equality
 FAIL  observations.spec.ts > recordObservation writes the redacted URL, not the raw one > a BARE credential does not reach the column either (P10-D1)
AssertionError: https://cdn.test/a.js?ghp_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIII: expected true to be false // Object.is equality
```

That last one is the load-bearing one: it reads the row back out of the real SQLite fixture, so it fails when the redactor is correct but nobody wired it into the write.

Restored, and re-run green — `git diff --exit-code packages/backend/src/store/observations.ts` clean of the mutation:

```
      Tests  65 passed (65)
```

## Post-restore baseline

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  750 passed (750)

$ pnpm typecheck   -> 0
$ pnpm lint        -> 0
$ pnpm knip        -> 0
$ pnpm build:backend -> 0

$ pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

750 tests over 31 files, against the plan's floor of 705 over 31 — the 45 new cases are the difference. No regex and no `URL` construction was added: the existing `executes no pattern` case still passes unchanged, and the bundle's import set is still exactly one specifier.

## Task Commits

1. **Task 1: Decide what happens to a query segment that carries no `=`** — no commit by design (`checkpoint:decision`, no source modified); recorded as P10-D1 in the Task 3 commit
2. **Task 2: Implement the chosen policy, with one falsifying case per credential format** — `a231bbd` (test, RED) then `2458713` (feat, GREEN). No refactor commit: the branch is one line and had nothing to clean up.
3. **Task 3: Split CORE-11 out of CORE-01 in the ledger, before any plan declares it** — `67d8c57` (docs)
4. **Task 4: Narrow the T-01-21 claim to what runs, and bring the validation ledger up to date** — `8d869fb` (docs)

## Files Created/Modified

- `packages/backend/src/store/observations.ts` — the `eq === -1` branch now pushes `QUERY_VALUE_REDACTION` for a non-empty segment and `""` for an empty one. `QUERY_NAME_MAX` kept, with its changed justification restated where it is defined: it bounds the NAME HALF of a pair and nothing else. String splitting only; percent-encoding still opaque.
- `packages/backend/src/store/observations.spec.ts` — `BARE_CREDENTIAL_SHAPES` plus 45 new cases; the two contradicted cases AMENDED in place with dated notes.
- `packages/backend/src/store/schema.spec.ts` — the T-01-21 paragraph restated per URL grammar; `analyses.error` and the `COLUMN_ALLOWLIST` contents untouched.
- `.planning/REQUIREMENTS.md` — CORE-11 opened; CORE-01 cross-referenced; STORE-03 and STORE-07 marked deferred with owners.
- `.planning/ROADMAP.md` — exactly two changed lines.
- `.planning/STATE.md` — P9-D1 amended by append; P10-D1 added.
- `.planning/phases/01-skeleton-persistence-compatibility/01-VALIDATION.md` — two pointer cells amended with a dated footnote (Task 3); twelve new rows and the sign-off widening (Task 4).

## Decisions Made

See `key-decisions` above. The one worth restating in prose: **P7-D2 was not a bug and is not recorded as one.** It was a faithful reading of the operator's UAT words — a segment with no `=` *is* syntactically a name. What changed is the policy, because the words were re-opened. Recording it as an implementation error would have made the next author distrust a decision record that was actually working correctly.

## Deviations from Plan

None — plan executed exactly as written, with one clarification worth recording rather than a deviation: the plan's `<behavior>` block anticipated that under `tighten-bound` some literals would need explicitly-labelled "what DOES survive" cases. `redact-bare` was chosen, so every one of the eight shapes gets the same unconditional absence assertion and no residual-by-length case was needed.

The falsifiable task count in Task 4 held: `grep -cE '^\s*<task[[:space:]>]'` over the five PLAN files returned 4 / 3 / 2 / 1 / 2 = **TWELVE**, matching the plan's stated expectation. The files and the sentence agreed, so no discrepancy to report.

## Issues Encountered

Two, both environmental and both resolved without touching the plan:

1. `node --experimental-strip-types` could not run `observations.ts` directly (extensionless relative import of `../telemetry`), and the repo's `esbuild` shim would not execute standalone in this shell. Resolved by running the evidence through vitest itself, via a temporary spec under `tests/` that was deleted in the same shell invocation — `git status --porcelain packages/ tests/` confirmed empty immediately afterwards.
2. A `cp` into the scratchpad blocked on an interactive overwrite prompt (a stale `observations.ts.bak` from plan 01-07's run). Caught before it could mask anything — the source was verified unmutated — and the mutation/restore cycle was done with an in-place text replacement plus a `git diff` check instead of a file backup.

## Known Stubs

None. No stub, placeholder, empty-value or TODO was introduced by this plan.

## OPEN ITEM (with an owner) — the two requirement-id collisions this round did NOT close

Recorded here as an explicitly labelled open item so the CORE-11 split cannot be read as a clean ledger.

| Id | Text on record | What plans actually declare it for | Declared by |
|----|----------------|-----------------------------------|-------------|
| **STORE-03** | "Artifacts are content-addressed by digest, decoupling identity from URL" — says nothing about redaction | Write-path URL VALUE redaction | 01-01, 01-07, 01-10, 01-11, 01-14 |
| **STORE-07** | "All SQL uses positional `?` parameters" — says nothing about error rendering | RENDERED-ERROR redaction (`describeError` over `analyses.error`) | 01-07, 01-11, 01-13 |

**Why deferred rather than split alongside CORE-11**, since a deferral without a reason is an omission with a label. First, CORE-01's collision was a CONTRADICTION — its text describes a different subject entirely, so a gate tagged with it is unreadable — while these two are ADJACENCIES: wrong, but not misdirecting, so the cost of leaving them marked for one pass is bounded. Second, closing them properly means authoring two NEW requirement texts (write-path URL value redaction; rendered-error redaction) and retro-tagging plans 01-01 and 01-07, which are frozen — the same act this phase has repeatedly refused. Opening an id the operator has not seen, for a requirement text a planner would be inventing, is a bigger decision than this round had a mandate for.

**Owner:** the operator, at the next requirements pass, by the same UAT route that produced STORE-01 → STORE-08. Both lines in `.planning/REQUIREMENTS.md` now carry that note inline.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary was introduced. The threat register entries this plan carried (T-01-53, T-01-54, T-01-55, T-01-56, T-01-71, T-01-41) are each discharged by a task above; T-01-76 was `accept` by design and is the OPEN ITEM section.

## What is still open after this plan

Stated so the next plan is not surprised, and so nobody reads this SUMMARY as closing gap 1 entirely:

- **Three URL grammars still reach `observations.url` verbatim** — userinfo (`https://user:pa55w0rd@cdn.test/app.js`), `;` path parameters (`;jsessionid=SECRETSESSION`) and path-embedded tokens. Named in `schema.spec.ts` as OPEN, owner plan 01-11, source WR-11.
- **The CORE-11 gate itself is still partial** — blind to `globalThis.fetch`, destructured receivers, `.call`/`.apply`, computed keys and all of `packages/engine/src`. Owner plan 01-12, which also retags the gate's own header and failure strings.
- **The live tracer has not been re-run** against the new grammars. Owner plan 01-14, deliberately run once at the end rather than twice.

## Next Phase Readiness

Ready for 01-11. The working tree is green and the shared files 01-11 will touch (`observations.ts`, `observations.spec.ts`, `schema.spec.ts`) are committed and clean.

## Self-Check: PASSED

All modified source files exist on disk; all five commits (`a231bbd`, `2458713`, `67d8c57`, `8d869fb`, `4f6498b`) are reachable in the git history. All four task-level `<acceptance_criteria>` sets and all ten plan-level `<verification>` items were re-run after the final commit.
