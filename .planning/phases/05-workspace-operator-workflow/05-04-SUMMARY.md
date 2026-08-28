---
phase: 05-workspace-operator-workflow
plan: 04
subsystem: api
tags: [typescript, type-contract, keyset-pagination, cross-phase-interface, deferral-register, closed-vocabulary]

# Dependency graph
requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "packages/engine as an SDK-free workspace with four independent boundary mechanisms, the explicit exports map with no barrel, and analyses.ts's SCAN_STATES closed-vocabulary pattern"
  - phase: 05-workspace-operator-workflow
    provides: "05-02's measured row-value cursor and bounded-candidate-window query plans; 05-03's sanitise.ts pipeline and its two named caps, which the contract's doc comments point at rather than restate"
provides:
  - "packages/engine/src/contract.ts — the SDK-free entity READ contract Phases 3 and 4 build against"
  - "EntityRowBase + EntityLead — the four always-present columns in render order, with exactly one field typed and doc-commented as target-controlled"
  - "TRIAGE_STATES / TriageState / isOperatorDecided — the closed triage vocabulary in the shipped SCAN_STATES shape, with a `never` fallthrough guarding it"
  - "PageCursor / PageRequest / PageResponse — the row-value keyset tuple, one uniform direction governing both terms, at-most-one filter as a type-level fact, and scanned/exhausted for the bounded window"
  - "INVALIDATION_EVENT / INVALIDATION_CATEGORIES / InvalidationCategory / InvalidationSummary — four scalars, no payload"
  - "ScoreExplanation / ScoreSignal — the UI-04 frame with no signal vocabulary in it"
  - "EvidencePanelFrame + EVIDENCE_PANEL_MANDATORY_FIELDS — checker FLAG F1's answer, as an assertable list rather than prose"
  - "VisibleTotal — the number behind the filtered-empty copy, with suppressed rows outside it"
  - "05-ENTITY-CONTRACT.md — the companion document, two upward requirements on named future plans, and the seven-requirement deferral register"
  - "A new exports-map entry: ./contract"
affects: [05-06, 05-07, 05-08, 05-10, 05-11, 03-01, 03-03, 04-03]

# Actuals (#2632)
actuals:
  tokens: 22587
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A read contract authored by its only consumer, published upward as a type rather than a phase re-sequencing (D-05(2))"
    - "A rule that would otherwise be remembered is encoded where it can be read: `exactly one column is target-controlled` is a typed field, not a paragraph"
    - "A constraint expressed as a shape that cannot represent its violation — one `direction` field, not two; one optional filter, not a record of filters"
    - "Two-sided drift protection on a name list: `satisfies` proves no member is a non-field, an exhaustive `Record<keyof T, true>` in the spec proves no field is a non-member"
    - "A deferral register whose carried decisions are QUOTED rather than paraphrased, because a paraphrase is where a decision starts drifting"
    - "A resolved decision about an unbuilt surface lives in the register, not in must_haves — a truth about a surface that will not exist could only fail"

key-files:
  created:
    - packages/engine/src/contract.ts
    - packages/engine/src/contract.spec.ts
    - .planning/phases/05-workspace-operator-workflow/05-ENTITY-CONTRACT.md
  modified:
    - packages/engine/package.json

key-decisions:
  - "P5-D14: EntityRowBase's leading column is a DISCRIMINATED UNION (EntityLead), not a `string | number`. A table carrying a lifecycle state and a table carrying a score are two different renderings, and a bare union would make the consumer guess which it got. The `state` arm is typed `string` and doc-commented as a member of the shipped SCAN_STATES rather than restating those five strings — the engine may not import the backend, and a second copy of a closed vocabulary is a second thing to drift."
  - "P5-D15: PageRequest carries ONE `direction` governing the sort key AND the tie-break, not one per term. A mixed-direction sort under a row-value cursor is silently wrong rather than slow, so the type is written to be incapable of expressing the broken form rather than to document it."
  - "P5-D16: the exhaustiveness guard over TriageState is `isOperatorDecided`, a real predicate (`new` is the absence of a decision; the other three are the three triage CTAs), not a tautological identity switch. It mirrors TERMINAL_SCAN_STATES's role beside SCAN_STATES — a derived predicate defined once next to the vocabulary — and invents no vocabulary of its own while still failing the typecheck if a fifth member lands."
  - "P5-D17: EVIDENCE_PANEL_MANDATORY_FIELDS is a real exported constant with `satisfies readonly (keyof EvidencePanelFrame)[]`, so FLAG F1's mandatory-field list is ASSERTABLE rather than only readable. The spec's `Record<keyof EvidencePanelFrame, true>` closes the other direction, so a sixth mandatory field cannot be added to the frame without appearing in the list."
  - "P5-D18: INVALIDATION_CATEGORIES holds only the three SHIPPED table categories and contract.spec.ts asserts every member is inside schema.spec.ts's EXPECTED_TABLES. A speculative `entities` member would be the schema invention D-05(2) forbids arriving through the back door, so it fails a gate rather than lands."
  - "P5-D19: every exported type is imported and given a conforming value in contract.spec.ts. Required mechanically — knip runs `ignoreExportsUsedInFile: false` with `types: error`, so an unconsumed exported type is a gate failure — and useful independently: a conforming literal is the cheapest check that a Phase 3 or Phase 4 author can actually construct the shape."
  - "P5-D20: the suppressions-list bound proposed for the UI-SPEC's ⚠ unresolved overflow row is 200 rules per project, enforced at CREATE time. Read-time filtering would hide rules that are still suppressing findings, which is the exact failure the `partial / suppressions-list` row already forbids. The number is defensible, not measured, and is marked a proposal; the SHAPE of the answer — a stated bound with an argument, enforced at write time — is the part that should survive if the number moves."

patterns-established:
  - "Publish the frame, not the vocabulary: a cross-phase contract fixes the shape a payload arrives in and names which phase owns its contents"
  - "State a measurement's provenance where the design that rests on it is read, including what it CANNOT answer — the cursor design's plans were measured on SQLite 3.51/3.53 and never on Caido's 3.46"
  - "A deferred requirement carries a blocker named concretely (a table that does not exist), a named unblocking plan, and its already-made decisions quoted verbatim with their reversibility ratings"
  - "An unspent one-way checkpoint is owed forward by name to the first task that reaches the irreversible call, so a later executor cannot arrive at it without the gate"

requirements-completed: [UI-03, UI-04, OPS-01, OPS-02, OPS-04, FIND-01, FIND-02]

coverage:
  - id: D1
    description: "An SDK-free TypeScript type declares the four columns every entity table row carries, in render order, and names which single column is target-controlled"
    requirement: "UI-03"
    verification:
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#EntityRowBase carries the four columns, with exactly one target-controlled"
        status: pass
      - kind: unit
        ref: "packages/engine/src/boundary.spec.ts#contract.ts imports nothing from Caido"
        status: pass
    human_judgment: false
  - id: D2
    description: "The triage vocabulary is a closed, exported, snake_case list with a compile-time exhaustiveness guard, and no member string is restated outside the contract"
    requirement: "OPS-01"
    verification:
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#holds exactly the four states 05-UI-SPEC.md fixes, in that order"
        status: pass
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#is snake_case throughout, like the shipped SCAN_STATES"
        status: pass
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#answers for every member of TRIAGE_STATES — no member is unhandled"
        status: pass
      - kind: other
        ref: "grep -c 'false_positive' packages/backend/src packages/frontend/src -r | grep -v ':0$' | grep -v contract  (prints nothing)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The keyset cursor tuple, the uniform-direction rule, the at-most-one-filter constraint, and the bounded window's scanned/exhausted pair are declared so a Phase 3 or Phase 4 table cannot ship a cursor the UI cannot page with"
    verification:
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#PageRequest permits at most one column filter, by construction"
        status: pass
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#PageResponse distinguishes a short page from the end of the data"
        status: pass
    human_judgment: false
  - id: D4
    description: "The invalidation event name, its category list and its four-scalar summary payload are declared once, with the no-payload rule stated (T-05-17)"
    verification:
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#InvalidationSummary is four scalars and carries no payload"
        status: pass
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#names nothing entity-shaped — those tables do not exist"
        status: pass
    human_judgment: false
  - id: D5
    description: "UI-SPEC checker FLAG F1 is answered: the evidence panel has a fixed frame naming which fields are mandatory, which are target-controlled and which carry font-mono, with the signal vocabulary left to Phase 3"
    requirement: "UI-04"
    verification:
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#names all five mandatory fields and nothing else"
        status: pass
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#covers every field of EvidencePanelFrame — the list cannot fall behind the type"
        status: pass
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#EvidencePanelFrame is constructible with every mandatory field present"
        status: pass
    human_judgment: false
  - id: D6
    description: "Two upward requirements are stated against named future plans — 03-01's per-rule checksum verifier reference, and 04-03's stable entity identity marked as a proposal awaiting operator confirmation"
    verification:
      - kind: other
        ref: "node -e (05-ENTITY-CONTRACT.md contains 03-01, 04-03, FLAG F1, SEC-07, OPS-04, D-05)"
        status: pass
    human_judgment: true
    rationale: "Whether the checksum argument and the identity proposal are stated well enough that a Phase 3 or Phase 4 planner can act on them without reading Phase 5's plans is a judgement about prose sufficiency for a reader who does not exist yet. The grep proves the plans are named; it cannot prove they are persuaded."
  - id: D7
    description: "Seven deferred requirements each carry what is deferred, a concretely named blocker, an unblocking phase and plan, and their already-made decisions quoted rather than paraphrased"
    requirement: "FIND-01"
    verification:
      - kind: other
        ref: "node -e (register contains all seven ids, D-01/D-02/D-03, Deferral Register, Carried covered rows, and >=3/6/6 carried rows per deferred surface)"
        status: pass
    human_judgment: true
    rationale: "The gate proves the decisions are present and the carried-row table is non-vacuous. Whether the QUOTES are faithful to 05-CONTEXT.md and 05-UI-SPEC.md, and whether a follow-on executor would actually be stopped by the owed D-01 checkpoint, is a reading a human must do."
  - id: D8
    description: "FIND-02's structural satisfaction — entropy-only and hint-grade never project because nothing remains after a three-way conjunction, not because a filter removes them — is carried forward as a decision the implementing pass must honour"
    requirement: "FIND-02"
    verification: []
    human_judgment: true
    rationale: "Nothing in this phase can execute the claim: the high-signal tier does not exist and no term of the conjunction is evaluable. The register records the reasoning; only the implementing pass can demonstrate it."

# Metrics
duration: 12 min
completed: 2026-08-28
status: complete
---

# Phase 05 Plan 04: The entity read contract and the deferral register — Summary

**An SDK-free TypeScript contract publishing the four entity columns, the row-value cursor tuple, the invalidation summary and the evidence-panel frame upward to Phases 3 and 4 — answering UI-SPEC checker FLAG F1 — plus a seven-requirement deferral register that carries D-01, D-02 and D-03 forward verbatim with D-01's one-way checkpoint owed to the first task that writes a Finding.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-28T12:34:39Z
- **Completed:** 2026-08-28T12:47:19Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- **D-05(2) discharged.** Phase 5 neither re-sequenced itself behind Phase 4 nor invented Phase 4's schema. It wrote the interface it is the only consumer of: `packages/engine/src/contract.ts`, importable as `@defminer/engine/contract` with no Caido dependency, holding twelve declared shapes plus three derived types and one predicate.
- **UI-SPEC checker FLAG F1 is answered and can be closed.** The evidence panel now has a fixed frame — five mandatory fields (`sourceRequest`, `artifactVersion`, `byteRange`, `snippet`, `scoreExplanation`), two of them target-controlled and therefore monospace — and the score explanation has a frame with no vocabulary in it. What is fixed is the frame; what is not fixed is the vocabulary, which is exactly the split F1 asked for.
- **The mandatory-field list is assertable, not just readable.** `EVIDENCE_PANEL_MANDATORY_FIELDS` uses `satisfies readonly (keyof EvidencePanelFrame)[]` and the spec closes the other direction with `Record<keyof EvidencePanelFrame, true>`, so the list and the type cannot drift apart in either direction.
- **Rules that would otherwise be remembered are now encoded where they can be read.** "Exactly one column carries the target-controlled value" is a typed field with a doc comment, not a paragraph (T-05-15). "A row-value cursor needs a uniform direction" is one `direction` field rather than two (the type cannot express the broken form). "At most one column filter" is one optional filter object rather than a record — which is what keeps the literal-statement matrix linear rather than exponential. "The invalidation event carries no payload" is four scalar fields whose key set the spec asserts (T-05-17).
- **Two upward requirements are on the record against named plans.** Plan **03-01** must carry a per-rule checksum verifier reference (or an explicit null), because the Phase 5 tier collapses to a conjunction once SEC-07 is five phases away and off by default — so **a provider detector with no checksum has no satisfiable branch and can never project**, and Phase 5's projection surface would be provably empty. Plan **04-03** must produce the stable entity identity OPS-04 needs, stated as a **proposal awaiting operator confirmation** and never as a locked decision.
- **Seven deferred requirements carry their decisions forward.** D-01, D-02 and D-03 are quoted verbatim with their reversibility ratings; so are the four O-04 sanitisation rules, the five SDK facts about `sdk.findings.create`, OPS-02's four reasons for query-time filtering, and OPS-04's one fixed negative with its mechanical cause.
- **D-01's one-way checkpoint is owed forward by name.** No task in this phase writes a Finding, so the gate is unspent; the register states at its head that it is owed to the first task in the follow-on pass that calls `sdk.findings.create`, so a later executor cannot reach that call without meeting it (T-05-16).
- **Fifteen resolved-but-unbuildable UI rows are preserved where they can survive.** Three `triage-controls` rows, six `suppressions-list` rows and six `findings-projection-preview` rows, each restating its resolution, with the reason they live in the register rather than in this phase's `must_haves` written out: a truth about a surface that will not exist when the phase ends could only fail, and a gate that can only fail is not a gate.

## Task Commits

1. **Task 1: contract.ts — the entity read contract** — `dd872f5` (feat)
2. **Task 2: 05-ENTITY-CONTRACT.md and the two upward requirements** — `61e81a2` (docs)
3. **Task 3: the deferral register** — `4bb572e` (docs)

**Plan metadata:** see the `docs(05-04)` commit that carries this summary.

## Files Created/Modified

- `packages/engine/src/contract.ts` (created, 562 lines) — the read contract. Twelve exported shapes: `EntityLead`, `EntityRowBase`, `TRIAGE_STATES`, `TriageState`, `isOperatorDecided`, `PageCursor`, `PageRequest`, `PageResponse<T>`, `INVALIDATION_EVENT`, `INVALIDATION_CATEGORIES`, `InvalidationCategory`, `InvalidationSummary`, `ScoreSignal`, `ScoreExplanation`, `EvidencePanelFrame`, `EVIDENCE_PANEL_MANDATORY_FIELDS`, `VisibleTotal`.
- `packages/engine/src/contract.spec.ts` (created, 360 lines) — 20 tests over what can drift: vocabulary membership and order, snake_case, duplicate-freedom, the absence of entity-shaped categories, the mandatory-field list in both directions, and one conformance literal per published shape.
- `packages/engine/package.json` (modified) — one new `exports` entry, `"./contract"`.
- `.planning/phases/05-workspace-operator-workflow/05-ENTITY-CONTRACT.md` (created, 694 lines) — the companion document, the two upward requirements, the suppressions-list bound, and the `## Deferral Register` with nine subsections (seven requirements, the carried-rows table, the one-view summary).

## Decisions Made

Seven, recorded as P5-D14 … P5-D20 in the frontmatter. The three with the longest reach:

- **P5-D15 — one `direction`, not two.** A row-value comparison under a mixed-direction sort skips rows and duplicates others and *nothing errors*. The type was written so the broken form cannot be expressed, rather than documented so it can be avoided.
- **P5-D17 — the F1 answer is a constant, not prose.** F1 asked for a list of mandatory fields. A list in a document drifts from the type it describes; a list with `satisfies` on one side and an exhaustive `Record` on the other cannot.
- **P5-D20 — the suppressions bound is enforced at create time.** A cap that filters on read hides rules that are still suppressing findings — the exact failure the `partial / suppressions-list` row already forbids for a rule whose originating finding has gone.

## Deviations from Plan

None — plan executed exactly as written. Every task's `<action>`, `<verify>` and `<acceptance_criteria>` was satisfied as specified, with no auto-fix required under any deviation rule.

Four additions inside the plan's own scope are named here so they are not read as unstated scope. The plan's "New symbols" list names twelve; the module exports four more, each of which the plan's `<action>` text requires but does not name: **`EntityLead`** (the plan asks for "a state-or-score field" — a discriminated union is the honest type for it), **`InvalidationCategory`** (`InvalidationSummary.category` must be typed by the category list the same `<action>` requires), **`ScoreSignal`** (the plan asks for "an ordered list of fired-signal records each carrying…" — the record needs a name to be a list of), and **`EVIDENCE_PANEL_MANDATORY_FIELDS`** (the plan asks the frame to say "which fields are mandatory"; the constant is that sentence in a form a test can hold the panel to). None adds surface beyond what the `<action>` describes.

## Issues Encountered

None. `pnpm typecheck`, `pnpm vitest run packages/engine/src`, `pnpm knip` and `pnpm lint` were all green before the first commit and are green at close-out.

One thing worth recording because it shaped the spec rather than being worked around: **knip runs with `ignoreExportsUsedInFile: false` and `types: error`** — the hole plan 05-01 deliberately closed. A type-only module whose exports have no consumer yet is therefore a gate failure by construction, which is the correct behaviour and not an obstacle. The spec consumes every exported type with a conforming literal, which satisfies the gate and independently proves the shapes are constructible by the phases that must construct them (P5-D19).

## Known Stubs

None. Nothing in this plan is a placeholder: the contract is complete for what it claims to cover, and everything it deliberately does not cover — entity columns, the signal vocabulary, the triage key — is named in the deferral register with a blocker and an unblocking plan rather than stubbed.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change. The plan's own five threats (T-05-15 … T-05-19) are each mitigated by a shipped artifact: the target-controlled field is typed and doc-commented (T-05-15); D-01 is carried verbatim with its owed checkpoint (T-05-16); `InvalidationSummary` is four scalars with its key set asserted (T-05-17); `PageResponse` types `scanned` and `exhausted`, which only make sense with a bounded window (T-05-18); and the register states OPS-04's fixed negative and its mechanical cause while the triage vocabulary stays independent of any analysis row (T-05-19).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for 05-05.** Wave 2's other plans and every later plan that reads this contract can proceed: 05-06/05-07 implement `PageRequest`/`PageResponse` over the shipped tables, 05-07 emits under `INVALIDATION_EVENT`, 05-08 subscribes to it, and 05-10 builds the panel region against `EvidencePanelFrame`.

**Two things a reader outside this phase needs to know:**

1. **`05-ENTITY-CONTRACT.md` is addressed to Phase 3 and Phase 4 and should be read when 03-01, 03-03 and 04-03 are planned.** Its two upward requirements are the difference between FIND-01 being demonstrable and Phase 5's projection surface being provably empty.
2. **The cursor design's query plans were measured on SQLite 3.51.0 and 3.53.4, not on Caido's 3.46.0.** No 3.46 binary is reachable from this machine and the operator chose to proceed with that residual disclosed rather than closed. The contract states it where the design is read; do not upgrade it to "verified" anywhere downstream.

---
*Phase: 05-workspace-operator-workflow*
*Completed: 2026-08-28*
