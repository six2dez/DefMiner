---
phase: 01-skeleton-persistence-compatibility
plan: 09
subsystem: testing
tags: [typescript-compiler-api, ast-gate, static-analysis, vitest, caido, core-01]

requires:
  - phase: 01-01
    provides: "CORE-01's descriptor-less must_haves.prohibitions entry — the prose this plan replaces with a gate; hooks/passive.ts, the module the mutations were planted in"
  - phase: 01-04
    provides: "store/sql-discipline.spec.ts — the package-wide AST-walk shape this gate copies (pure auditSource, named non-vacuity, every rule's failure path executed)"
  - phase: 01-05
    provides: "telemetry.ts, whose header names caido:http in prose — the live documentation hazard that forces this gate to be an AST walk"
  - phase: 01-07
    provides: "store/error-redaction.spec.ts — the second gate of this shape, and the precedent for a rule over a class of bindings rather than a single site"
provides:
  - "packages/backend/src/outbound-prohibition.spec.ts — CORE-01's wired enforcement: an AST gate over every non-spec module in packages/backend/src, covering sdk.requests.send, sdk.net.*, the global fetch, and an import of caido:http"
  - "Executed proof that the gate can fail against real shipped source: two mutations planted in hooks/passive.ts, both failure blocks captured verbatim below"
  - "COVERAGE.md rows 9, 27 and 38 cite a named gate instead of an authored prohibition entry, in both the human-readable and the machine-readable table"
  - "CORE-01's prohibition disposition moved from verification: judgment to verification: gate with a named resolution, with plan 01-01 untouched"
affects: [phase-08-active-retrieval, phase-02-observability, any-phase-adding-an-outbound-surface]

actuals:
  tokens: 8613
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Static gate as a spec file: a pure auditSource(file, source) over the TypeScript compiler's AST, a named non-vacuity enumeration, and every rule's failing path executed against an inline fixture — now the shape of three gates in this package"
    - "Rule set as exported DATA (FORBIDDEN_OUTBOUND) rather than a chain of branches, so the failure message carries the consequence and a fifth surface is one entry"
    - "Mutation-proving a gate against the REAL tree, not only against fixtures, with the failure output pasted into the SUMMARY"

key-files:
  created:
    - packages/backend/src/outbound-prohibition.spec.ts
  modified:
    - .planning/phases/01-skeleton-persistence-compatibility/COVERAGE.md

key-decisions:
  - "P9-D1: outbound-net matches ANY method on a `net` receiver, not just `connect`. Naming the one method Phase 0 happened to enumerate would leave the hole one identifier to the right, and CORE-01's statement is about the surface, not about a method name."
  - "P9-D2: the gate flags a `send` reached through a receiver alias and through a destructured method, but does NOT build a symbol table — an alias rebound in an inner scope is out of reach, and the file's header says so. Claiming a precision the walk does not have is worse than the gap, because it gets trusted."
  - "P9-D3: scripts/ci/check-bundle-imports.mjs is deliberately NOT touched. Its allowlist records what Caido's QuickJS was MEASURED to load; removing caido:http would silently redefine it from 'measured loadable' to 'permitted'. The bundle gate bounds what can LOAD, this one bounds what the source may CALL — and the asymmetry is why a source gate has to exist, since sdk.requests.send needs no import at all."
  - "P9-D4: backendFiles() duplicates sql-discipline.spec.ts's private walk rather than exporting it. Coupling the two gates means one gate's refactor can silently change the other's scope; the named non-vacuity assertion is the real protection against a walk that shrinks."

patterns-established:
  - "A gate's failure text explains the CONSEQUENCE, not the rule: every violation names the file, the surface, and the measured reason (SURFACES_FIRING_INTERCEPT, caido/caido#2211) it matters"
  - "A documentation case as a first-class test: a fixture whose only occurrences of the forbidden shapes are in comments must yield zero violations, and the real file that documents the prohibition is asserted to still name it"

requirements-completed: [CORE-01]

coverage:
  - id: D1
    description: "A call to sdk.requests.send from any non-spec module under packages/backend/src fails pnpm test, naming the file and the outbound-send rule — in the direct, element-access, receiver-alias and destructured forms"
    requirement: CORE-01
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-send fires on the direct call"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-send fires on the element-access form"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-send fires through a RECEIVER ALIAS"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-send fires on a DESTRUCTURED method"
        status: pass
      - kind: integration
        ref: "mutation A — a send call planted in packages/backend/src/hooks/passive.ts, gate failed naming passive.ts and outbound-send (output pasted in this SUMMARY)"
        status: pass
    human_judgment: false
  - id: D2
    description: "An import of caido:http fails the same gate in all four specifier forms: static import, export ... from, dynamic import(), and require()"
    requirement: CORE-01
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-import fires on all four specifier forms"
        status: pass
      - kind: integration
        ref: "mutation B — a static caido:http import planted in packages/backend/src/hooks/passive.ts, gate failed naming passive.ts and outbound-import (output pasted in this SUMMARY)"
        status: pass
    human_judgment: false
  - id: D3
    description: "sdk.net.* and a bare global fetch() fail the gate too — CORE-01 forbids outbound traffic of any kind, and COVERAGE.md rows 27 and 38 place all three surfaces under one prohibition"
    requirement: CORE-01
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-net fires on sdk.net.connect and on any other method of that receiver"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-fetch fires on a call to the bare global"
        status: pass
    human_judgment: false
  - id: D4
    description: "The gate is an AST walk, not a text scan: a source that DISCUSSES the forbidden surfaces in comments reports zero violations, and telemetry.ts — which really does name caido:http in its header — reports clean"
    requirement: CORE-01
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#a file that DISCUSSES the forbidden surfaces in comments yields ZERO violations"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#telemetry.ts NAMES caido:http in prose and still reports clean"
        status: pass
    human_judgment: false
  - id: D5
    description: "The gate cannot pass by scanning nothing: the enumeration is asserted non-empty, asserted to contain nine modules BY NAME, and asserted to have descended into subdirectories"
    requirement: CORE-01
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#enumerates a NON-EMPTY set of backend modules, BY NAME"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the walk really DESCENDED into subdirectories"
        status: pass
    human_judgment: false
  - id: D6
    description: "The gate does not fire on the legal shapes: sdk.requests.get (the reload the consumer depends on), sdk.requests.query, logger.send, cache.fetch, an identifier merely named net, and an import of crypto"
    requirement: CORE-01
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-send does NOT fire on sdk.requests.get — the reload the consumer depends on"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-import does NOT fire on any other specifier, crypto included"
        status: pass
      - kind: integration
        ref: "pnpm test — 31 files / 705 tests, zero failures, over a tree in which the consumer's reload path is exercised"
        status: pass
    human_judgment: false
  - id: D7
    description: "COVERAGE.md rows 9, 27 and 38 cite outbound-prohibition.spec.ts in both tables, with dispositions, row counts and the INTEGRATE/OPT-OUT split unchanged"
    verification:
      - kind: integration
        ref: "pnpm exec vitest run tests/phase1-compat.spec.ts — 24 tests pass, matrix still parses to 40 rows and the summary counts still match"
        status: pass
      - kind: other
        ref: "gsd-tools check api-coverage.verify-pre 01 — passed: true, 40 capabilities / 17 integrate / 23 opt-out"
        status: pass
    human_judgment: false

duration: 22 min
completed: 2026-08-21
status: complete
---

# Phase 01 Plan 09: CORE-01's Outbound Prohibition, Wired Summary

**An AST gate over `packages/backend/src` that fails `pnpm test` when any non-spec module reaches `sdk.requests.send`, `sdk.net.*`, the global `fetch`, or an import of `caido:http` — every rule fixture-proven in both directions, and mutation-proven twice against real shipped source.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-21T10:43:00Z
- **Completed:** 2026-08-21T11:05:19Z
- **Tasks:** 2 of 2
- **Files modified:** 2 (1 created, 1 modified) — plus `hooks/passive.ts`, mutated twice and reverted

## Accomplishments

- **CORE-01 has enforcement instead of prose.** The prohibition was authored descriptor-less in plan 01-01 and the verifier's own evidence said so: *"NO WIRED ENFORCEMENT EXISTS: the DIST-05 allowlist admits `caido:http`, and `sdk.requests.send` needs no import at all, so neither gate would catch a regression."* `packages/backend/src/outbound-prohibition.spec.ts` now audits all 16 non-spec modules in the package on every `pnpm test`.
- **Four rules, each with a firing fixture AND a legal fixture.** `outbound-send` catches the direct call, the element-access form `sdk.requests["send"](req)`, a receiver alias, and a destructured method (including the renamed `const { send: go }` form) — while staying quiet on `sdk.requests.get`, `sdk.requests.query`, `sdk.requests.inScope` and `logger.send`. `outbound-net` catches any method on a `net` receiver but not an identifier merely *named* `net`. `outbound-fetch` catches the bare global but not `cache.fetch(url)`. `outbound-import` catches all four specifier forms but not `crypto`, `./telemetry`, `node:fs` or `sqlite`.
- **The gate can fail against the real tree, proven twice, not described.** Both mutations were planted in `hooks/passive.ts` and run; both failure blocks are pasted verbatim below.
- **The gate reads the AST, not the text.** `telemetry.ts:17` names `caido:http` in the paragraph explaining why the plugin's coverage is structurally partial. It reports clean, and that is asserted as its own case — including an assertion that the header *still names it*, so the case cannot go vacuous if the prose is reworded.
- **It cannot pass by scanning nothing.** The enumeration is asserted non-empty, asserted to contain nine modules by name, and asserted to include at least one path with a directory separator.

## The mutations — verbatim terminal output

This is the point of task 2. An inline fixture proves the pure function fires; it does not prove the walk reaches the real tree, that the enumeration includes the file a regression would land in, or that the failure surfaces with a usable message. This phase has been bitten four times by a gate that was asserted and could not fail.

### Mutation A — a `send` call planted in `packages/backend/src/hooks/passive.ts`

Planted inside `onResponse`, immediately before the enqueue, in the plausible shape of the regression ("probe the asset we just observed"):

```ts
    // MUTATION (plan 01-09 task 2): a plausible regression — probing the
    // asset we just observed. Reverted within this task.
    void (sdk as unknown as { requests: { send(r: unknown): unknown } }).requests.send(request);
```

```
$ pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts --reporter=dot

 RUN  v4.1.11 /Users/six2dez/Tools/DefMiner

····x···························

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  packages/backend/src/outbound-prohibition.spec.ts > CORE-01 — no outbound surface is reachable from packages/backend/src > packages/backend/src/hooks/passive.ts reaches no outbound surface
AssertionError: packages/backend/src/hooks/passive.ts reaches an outbound network surface, which CORE-01 forbids: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "outbound-send: packages/backend/src/hooks/passive.ts: a `send` call on a `requests` receiver reaches sdk.requests.send, which CORE-01 forbids in this phase — plugin-originated traffic does not come back through onInterceptResponse (SURFACES_FIRING_INTERCEPT = \"proxy\"), so a leak would move no counter in this plugin and leave no trace in its own telemetry; and caido/caido#2211, filed against 0.57.1, means cumulative sends can abort caido-cli with the operator's project data. Active retrieval is Phase 8 (ACTIVE-*) and it arrives with the send counter and the write-ahead journal Phase 0 built for it — not by someone adding a call.",
+ ]

 ❯ packages/backend/src/outbound-prohibition.spec.ts:390:7
    388|       violations.map((v) => `${v.rule}: ${v.detail}`),
    389|       `${file} reaches an outbound network surface, which CORE-01 forb…
    390|     ).toEqual([]);
       |       ^
    391|   });
    392|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 31 passed (32)
```

It names `passive.ts`, it names `outbound-send`, and it says why.

### Mutation B — a static `caido:http` import at the top of the same file

```ts
// MUTATION (plan 01-09 task 2): a static import of the forbidden specifier.
// Reverted within this task.
import { fetch } from "caido:http";
```

```
$ pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts --reporter=dot

 RUN  v4.1.11 /Users/six2dez/Tools/DefMiner

····x···························

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  packages/backend/src/outbound-prohibition.spec.ts > CORE-01 — no outbound surface is reachable from packages/backend/src > packages/backend/src/hooks/passive.ts reaches no outbound surface
AssertionError: packages/backend/src/hooks/passive.ts reaches an outbound network surface, which CORE-01 forbids: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "outbound-import: packages/backend/src/hooks/passive.ts: a static import reaches an import of \"caido:http\", which CORE-01 forbids in this phase — caido:http loads successfully inside Caido, and the DIST-05 bundle allowlist admits it because Phase 0 MEASURED it loadable — a different question from whether it is permitted. Phase 0 also measured that traffic it issues delivers nothing back to onInterceptResponse.",
+ ]

 ❯ packages/backend/src/outbound-prohibition.spec.ts:390:7
    388|       violations.map((v) => `${v.rule}: ${v.detail}`),
    389|       `${file} reaches an outbound network surface, which CORE-01 forb…
    390|     ).toEqual([]);
       |       ^
    391|   });
    392|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 31 passed (32)
```

Worth noting what mutation B demonstrates that the bundle gate cannot: `pnpm check:bundle` would also have caught this one (a `caido:http` import is on its allowlist as *loadable*, so in fact it would NOT have — it would have passed it). Mutation A is the case no bundle gate can ever see, because `sdk.requests.send` needs no import at all.

### After reverting both

```
$ diff -q passive.ts.orig packages/backend/src/hooks/passive.ts
passive.ts byte-identical to pre-mutation
$ git status --porcelain packages/backend/src/hooks/passive.ts
[]

$ pnpm test
 Test Files  31 passed (31)
      Tests  705 passed (705)
   Start at  13:03:12
   Duration  1.44s (transform 2.32s, setup 0ms, import 6.03s, tests 4.05s, environment 3ms)

$ pnpm build:backend && pnpm check:bundle
ESM packages/backend/dist/index.js 58.11 KB
ESM ⚡️ Build success in 21ms
[*] Plugin package built successfully
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

31 files / 705 tests against the plan's floor of 28 files / 637 tests; exactly one import specifier, `crypto`. The bundle rebuild is the cross-check that the planted import really left the tree — a stale `dist/` would otherwise hide a botched revert.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): the failing gate** — `2d8dcbf` (test) — all cases from `<behavior>` present as named cases, `auditSource` parsing but implementing no rule. 8 firing cases failed, every negative and real-tree case passed. RED was *executed*, not asserted.
2. **Task 1 (GREEN): the AST walk** — `331ffa5` (feat) — four rules driven by the exported `FORBIDDEN_OUTBOUND` table. 705 tests pass; `typecheck`, `lint`, `knip` all exit 0.
3. **Task 2: mutations run, coverage rows cited** — `7e96db9` (docs) — both mutations planted, run, captured and reverted; `COVERAGE.md` rows 9, 27 and 38 updated in both tables.

No REFACTOR commit: the GREEN implementation is the shipped one. `eslint --fix` reformatted the file before the GREEN commit (formatting only, folded in rather than committed separately).

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` (created, 564 lines) — the gate. Exports `FORBIDDEN_OUTBOUND` (the four surfaces as data) and `auditSource(file, source)` (pure: text in, findings out). Header states three boundaries explicitly: it skips `.spec.ts` (which is what lets its own fixtures live inline, at the cost of an unnoticed outbound call in a spec — bounded by `check:bundle`, which specs never enter); scope handling is shallow with no symbol table; and `backendFiles()` duplicates `sql-discipline.spec.ts`'s walk deliberately.
- `.planning/phases/01-skeleton-persistence-compatibility/COVERAGE.md` (modified, 6 cells) — rows 9, 27 and 38 in both the human-readable and the machine-readable table now cite the gate and its rule instead of "an authored `must_haves.prohibitions` entry".

## Decisions Made

- **P9-D1: `outbound-net` matches ANY method on a `net` receiver, not just `connect`.** Naming the one method Phase 0 happened to enumerate would leave the hole one identifier to the right. CORE-01's statement is about the surface.
- **P9-D2: alias tracking, honestly bounded.** The gate resolves `const r = sdk.requests; r.send(req)` and `const { send } = sdk.requests; send(req)` via a first collection pass in document order — but builds no symbol table, so an alias rebound in an inner scope escapes it. That is the same bound `consumer.spec.ts`'s CORE-05 audit works within, and it is stated in the file's header rather than implied. Claiming a precision the walk does not have is worse than the gap, because it gets trusted.
- **P9-D3: `scripts/ci/check-bundle-imports.mjs` untouched.** Its allowlist answers a different question — which specifiers Caido's QuickJS was MEASURED to resolve — and `caido:http` is on it because the Phase 0 probe loaded it. Removing an entry would silently redefine that file's semantics from "measured loadable" to "permitted". The two gates coexist: the bundle gate bounds what can LOAD, this one bounds what the source may CALL, and mutation A is the case only the source gate can see.
- **P9-D4: `backendFiles()` duplicated rather than shared.** Coupling two gates means one gate's refactor can silently change the other's scope. The named non-vacuity assertion is the real protection against a walk that shrinks; the duplication is noted in the header so the next reader knows it is deliberate.
- **P9-D5: no `type="tracer"` task, stated as the exception.** `TRACER_MODE` is on. This plan adds one static gate over already-shipped code; there is no path through the stack to wire and nothing end-to-end to prove. Recorded as a deliberate exception rather than an omission (this was the plan's own framing, honoured at execution).

## Deviations from Plan

None — plan executed exactly as written.

Two implementation choices are worth recording as *within-plan* judgements rather than deviations, because the plan left the shape open:

- The plan's `<behavior>` asked for the four `outbound-send` shapes; the renamed destructure (`const { send: go } = sdk.requests`) was added alongside the plain one, since it is the same lift with a different label and would otherwise be a one-character bypass.
- The plan's `<action>` asked for the detail message to name the file, the surface and WHY. It is built by looking the rule up in `FORBIDDEN_OUTBOUND` and appending that entry's `why`, so the data table is the single source of the failure text rather than a parallel set of string literals that can drift from it. A named case asserts every entry carries a non-trivial reason.

**Total deviations:** 0
**Impact on plan:** none.

## Issues Encountered

None. Both mutation windows behaved as the plan predicted, and the serialisation argued for in the plan's objective held: `git status --porcelain packages/` was empty before anything was planted, so every whole-suite assertion here read a tree carrying no foreign mutation.

One thing checked rather than assumed: the three machine-readable `COVERAGE.md` cells were measured against the 200-character limit `gsd-tools check api-coverage.verify-pre` imposes (186, 180 and 181 characters), and the row shape kept to exactly three cells. Copying the longer human-readable wording into that table would have broken the seal gate.

## Verification

| # | Check | Result |
|---|-------|--------|
| 1 | `pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts` | 32 tests pass — every rule with a firing fixture and a quiet legal fixture, the documentation case, the named non-vacuity case, the descent case |
| 2 | Both real-tree mutations RUN, output captured, reverted | Pasted above; `passive.ts` byte-identical after |
| 3 | `pnpm build:backend && pnpm check:bundle` | `1 import specifier(s): crypto` |
| 4 | `pnpm test` | 31 files / 705 tests, 0 failures (floor: 28 / 637) |
| 5 | `pnpm typecheck` / `pnpm lint` / `pnpm knip` | exit 0 / 0 / 0 |
| 6 | `COVERAGE.md` diff confined to six justification cells; coverage-parsing check | 6 insertions / 6 deletions, all reason cells; `tests/phase1-compat.spec.ts` 24 pass; `api-coverage.verify-pre 01` → `passed: true`, 40 / 17 / 23 |
| 7 | `git status --porcelain '…/01-0[1-6]-PLAN.md'` | empty — no existing plan amended |
| 8 | `git status --porcelain packages/` before planting | empty |

## Known Stubs

None. The gate ships complete: every rule has an implementation, a firing fixture, a legal fixture, and a run against the real tree.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 1 is complete: 9 of 9 plans executed. Both UAT gaps are closed — 01-07 redacted the durable store, 01-08 measured the pre-policy exposure at zero and settled it, and this plan gives CORE-01 a gate that can fail.

For the verifier: CORE-01's `01-VERIFICATION.md` evidence line ("NO WIRED ENFORCEMENT EXISTS") can now be answered directly. Its disposition moves from `verification: judgment, status: unverified, flagged: true` to `verification: gate, status: resolved`, with the resolution named in this plan's frontmatter — `01-01-PLAN.md` is untouched, per the gap-closure rule that permitted exactly one amendment to that file, which plan 01-07 used.

For Phase 8 (ACTIVE-*), which is the phase that legitimately introduces outbound traffic: this gate is scoped to Phase 1's prohibition and will need to be re-scoped, not deleted. The right move is narrowing it to the modules that must stay passive (the hook and the store) rather than removing the four rules, so that the send counter and the write-ahead journal Phase 0 built remain the only route to an outbound call.

Two residuals are recorded in the gate's own header rather than left to be discovered: a `.spec.ts` file could call an outbound surface unnoticed (bounded by `check:bundle`, which specs never enter), and an alias rebound in an inner scope escapes the scope-blind walk (threats T-01-50 and T-01-51, both disposition `accept`).

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-21*
