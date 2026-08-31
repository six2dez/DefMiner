---
phase: 06-retroactive-scan-deployment-reality
plan: 07
subsystem: testing
tags: [static-analysis, typescript-ast, sqlite, schema, deploy, gate, hosted-file, filesystem]

requires:
  - phase: 06-01
    provides: "`EXPECTED_TABLES` at six tables, the `COLUMN_ALLOWLIST` loop and `FORBIDDEN_COLUMNS` in `schema.spec.ts`, and the `scans` table whose eighteen columns the new declared-type gate now also covers"
  - phase: 01-foundation
    provides: "`outbound-prohibition.spec.ts` — the pure `auditSource(file, source)` gate whose SHAPE this plan copies, and the `SOURCE_ROOTS` enumeration it is held in agreement with"
  - phase: 05-workspace
    provides: "`store/export.ts` and `frontend/src/components/export-download.ts` — the chunked RPC download that IS DEPLOY-03's alternative delivery path, shipped and measured before this plan declined the other one"
  - phase: 00-runtime-reality-check
    provides: "the DIST-05 capability probe whose measured-loadable set puts `fs` on the bundle allowlist — the asymmetry that makes a source gate necessary"
provides:
  - "`packages/backend/src/filesystem-prohibition.spec.ts` — a static AST gate proving no shipped module imports a filesystem module in any of six specifier forms across nine import shapes, and none reaches `sdk.hostedFile` in any spelling"
  - "`auditSource(file, source)` and `FORBIDDEN_FILESYSTEM`, the second exported gate vocabulary in this package"
  - "D-24's declared-type gate in `schema.spec.ts` — every column of every table declares one of the three scalar affinities, with BLOB and untyped both failing"
  - "`contentBearingColumns(raw)` — a collector whose failing path is executed against throwaway tables rather than asserted"
  - "the proof, rather than the machinery, that DEPLOY-04 is satisfied by construction"
affects: [phase-07-reconstruction, storage-design, deployment, schema-migrations]

actuals:
  tokens: 17129
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A THIRD sibling static gate in the `sql-discipline.spec.ts` shape, with the sibling-vs-new-rule decision stated in its own header rather than left unexplained"
    - "A firing fixture generated as the FULL CROSS PRODUCT of specifier forms and import shapes, with the product asserted as a product rather than counted by hand"
    - "A self-audit that asserts EXACTLY the file's own real violation rather than an empty array — stronger in both directions than the emptiness claim it replaces"
    - "A schema gate reading `PRAGMA table_info`'s declared `type` structurally, beside the existing `pk`-ordinal read"

key-files:
  created:
    - packages/backend/src/filesystem-prohibition.spec.ts
  modified:
    - packages/backend/src/store/schema.spec.ts

key-decisions:
  - "D-17 APPROVED as specified at a blocking-human checkpoint: the chunked RPC download is the ONLY path by which anything DefMiner produces reaches the operator, nothing is written to server disk, and Caido's hosted-file surface is DECLINED. One-way, accepted as one-way."
  - "DEPLOY-03's 'with expiry and redaction rules' attaches to BOTH of its alternatives. Under the download, redaction is SHIPPED (`audit.kind` admits `export_raw` and `export_redacted`; `telemetry.ts` carries `PATH_REDACTION`) and expiry LOSES ITS SUBJECT — a dissolution, recorded as one, NOT claimed as compliance. Under `sdk.hostedFile` expiry is UNSATISFIABLE, because the surface has no delete."
  - "The gate is a SIBLING file rather than two entries in `FORBIDDEN_OUTBOUND`, because that record is a CORE-11 vocabulary about outbound network traffic and this ban answers to DEPLOY-03/04 for a different reason."
  - "No read-only allowlist for the hosted-file surface, unlike the outbound gate's `REQUESTS_READ_ONLY`: `getAll()` returns `HostedFile` objects each carrying a server `path`, so even the read half hands back the string DEPLOY-02 and D-19 exist to keep off the operator's screen."
  - "The unreadable-import-specifier shape is NOT duplicated here — `outbound-prohibition.spec.ts` already reports it over the identical file set, and a second copy would report the same node twice."
  - "`scripts/ci/check-bundle-imports.mjs` left byte-identical, deliberately: removing `fs` would redefine measured-loadable as permitted and destroy the only record of what the runtime resolves."
  - "O-01 remains a NAMED CARRIED OBLIGATION owned by Phase 7, discharged by the external-RSS probe. A negative probe re-opens D-17 deliberately. It is not settled by this checkpoint passing."

patterns-established:
  - "Sibling-gate justification in the header: when a new static gate copies an existing one's shape, the header states WHY it is a sibling and not a new entry in the parent's rule record"
  - "Derived non-vacuity over authored thresholds: assert every member of a derived set is named, rather than asserting a count somebody guessed"
  - "Cross-gate agreement read off disk: a duplicated constant is held honest by an assertion that reads the other file's declaration and fails when the two diverge"
  - "Honest self-audit: a gate that must violate its own rule asserts EXACTLY its own violation and proves removing it leaves nothing, rather than exempting itself"

requirements-completed: [DEPLOY-03, DEPLOY-04]

coverage:
  - id: D1
    description: "Every specifier form of the filesystem module — bare, node:-prefixed, llrt/-prefixed, and each with /promises — is unreachable from every shipped module, across nine import shapes"
    requirement: DEPLOY-04
    verification:
      - kind: unit
        ref: "packages/backend/src/filesystem-prohibition.spec.ts#fs-import fires on $shape of $specifier (54 cases, full cross product)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/filesystem-prohibition.spec.ts#fs-import stays QUIET on $shape of $specifier (90 cases)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/filesystem-prohibition.spec.ts#%s reaches no filesystem and no hosted file (35 shipped modules, zero violations)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The hosted-file surface is declined and unreachable in every spelling — direct, one-hop alias, two-hop alias, destructure, logical assignment, `as` cast, and computed selection"
    requirement: DEPLOY-03
    verification:
      - kind: unit
        ref: "packages/backend/src/filesystem-prohibition.spec.ts#hosted-file fires on $name (9 firing fixtures)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/filesystem-prohibition.spec.ts#hosted-file-unanalysable fires on $name (5 firing fixtures)"
        status: pass
    human_judgment: false
  - id: D3
    description: "sdk.meta.path(), sdk.meta.assetsPath(), sdk.meta.db() and the project path accessor stay LEGAL — the proof the rule bans the capability and not the vocabulary"
    requirement: DEPLOY-03
    verification:
      - kind: unit
        ref: "packages/backend/src/filesystem-prohibition.spec.ts#the three path accessors each report the EMPTY array, not merely some other rule"
        status: pass
      - kind: unit
        ref: "packages/backend/src/filesystem-prohibition.spec.ts#telemetry.ts NAMES the legal path accessor in prose and still reports clean"
        status: pass
      - kind: unit
        ref: "packages/backend/src/filesystem-prohibition.spec.ts#lifecycle.ts NAMES sdk.meta.db() in prose and still reports clean"
        status: pass
    human_judgment: false
  - id: D4
    description: "The gate is an AST walk and never a substring scan, so documentation naming a forbidden module cannot trip it"
    requirement: DEPLOY-04
    verification:
      - kind: unit
        ref: "packages/backend/src/filesystem-prohibition.spec.ts#reports EXACTLY its own real fs import on ITSELF, and nothing from its prose or its fixtures"
        status: pass
      - kind: unit
        ref: "packages/backend/src/filesystem-prohibition.spec.ts#stays QUIET on a comment naming every forbidden specifier and the surface"
        status: pass
    human_judgment: false
  - id: D5
    description: "No column in any table may hold artifact content: every declared type is one of the three scalar affinities, and both BLOB and untyped fail with a message saying why"
    requirement: DEPLOY-04
    verification:
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#every column of every table declares one of the three scalar affinities (D-24)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#a BLOB column turns the collector non-empty, and the message says why"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#an UNTYPED column fails too — it takes BLOB affinity, and a name check misses it entirely"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#collects ALL offenders in one run, across tables, rather than failing on the first"
        status: pass
    human_judgment: false
  - id: D6
    description: "The DIST-05 bundle allowlist is not edited, and still admits fs — the asymmetry that makes a source gate necessary"
    requirement: DEPLOY-04
    verification:
      - kind: unit
        ref: "packages/backend/src/filesystem-prohibition.spec.ts#the bundle allowlist is NOT the subject of this gate, and still admits fs"
        status: pass
      - kind: other
        ref: "git diff --exit-code -- scripts/ci/check-bundle-imports.mjs"
        status: pass
    human_judgment: false
  - id: D7
    description: "D-17 is a deliberate one-way decision taken by the operator with its premises verified against the working tree, and O-01 remains an open Phase 7 obligation rather than a settled question"
    verification: []
    human_judgment: true
    rationale: "A decision's quality and the openness of a carried obligation are not properties any test can assert. The verification of its nine premises is recorded below and in the checkpoint transcript; whether the decision was the right one is the operator's judgment, and whether O-01 stays open is a Phase 7 behaviour to observe rather than a Phase 6 assertion."

duration: 25 min
completed: 2026-08-31
status: complete
---

# Phase 06 Plan 07: Filesystem and Hosted-File Prohibition Summary

**Two static gates that turn D-17 from a decision into an invariant: a 1,315-line AST walk proving no shipped module can import a filesystem module in any of six specifier forms or reach `sdk.hostedFile` in any spelling, and a `PRAGMA table_info` declared-type check proving no column can hold the content it would otherwise write.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-31T18:24:00Z
- **Completed:** 2026-08-31T18:49:10Z
- **Tasks:** 3 (1 checkpoint, 2 implementation)
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- **D-17 approved at a `blocking-human` checkpoint with its nine premises verified against the working tree first**, not quoted from the plan. Two of those verifications changed the decision's basis and were put to the operator explicitly (see *Premise verification* below).
- **`filesystem-prohibition.spec.ts` — 224 cases, zero violations across all 35 shipped modules** under both source roots. Three rules, each with firing fixtures AND legal fixtures, every failing path executed.
- **`fs-import` covers the full cross product** — six specifier forms (`fs`, `node:fs`, `llrt/fs`, and each with `/promises`) × nine import shapes (value, namespace, default, side-effect, type-only, `export … from`, `require()`, dynamic `import()`, `import … = require()`) = 54 firing cases, generated from a declared table and asserted to BE the cross product. 90 matching legal cases prove the match is exact, not a prefix.
- **`hosted-file` and `hosted-file-unanalysable`** catch the surface through a direct call, a one-hop alias, a two-hop alias, a logical assignment, a destructure, an `as` cast, a computed key that reduces, and — for the unanalysable rule — inline assembly, one-hop assembly, a template, an assembled member of the receiver, and an assembled destructure key.
- **The three path accessors plus `sdk.meta.db()` proved LEGAL**, inline and live against `telemetry.ts` and `lifecycle.ts`. This is what keeps the rule about capability rather than vocabulary; without it the gate is indistinguishable from a ban on the word "path".
- **D-24's other half shipped** — `contentBearingColumns()` collects every column whose declared type is outside the scalar set, across every table, with BLOB and untyped both executed as real throwaway tables rather than asserted in a comment.
- **The bundle allowlist left byte-identical**, and asserted to still admit `fs` — so the day that stops being true, this gate's stated reason for existing fails loudly instead of silently becoming false.

## Task Commits

1. **Task 1: One-way decision — D-17** — no commit (checkpoint; resolved "approved", Option A)
2. **Task 2: The filesystem prohibition gate (D-18)** — `4c2ab79` (test)
3. **Task 3: D-24's declared-type gate** — `5b6a79e` (test)

## Files Created/Modified

- `packages/backend/src/filesystem-prohibition.spec.ts` (new, 1,315 lines) — `auditSource(file, source)`, the frozen `RULES` record keyed by `RuleId`, `FORBIDDEN_FILESYSTEM` derived from `Object.values(RULES)`, the POSIX source-root walk, the by-name non-vacuity block, and 224 cases
- `packages/backend/src/store/schema.spec.ts` (+207 lines) — `PERMITTED_DECLARED_TYPES`, `whyForbiddenType()`, `contentBearingColumns()`, and five new cases

## Premise verification (Task 1, before the checkpoint was surfaced)

| # | Premise | Result |
|---|---|---|
| 1 | `HostedFileSDK` is `getAll()` + `create()` only | **CONFIRMED** — `@caido/quickjs-types@0.26.0` `src/caido/hostedFile.d.ts`, two members, no delete/expiry/TTL |
| 2 | `HostedFile` carries a server `path` | **CONFIRMED** — `path: string`, "The path of the file" |
| 3 | DEPLOY-03 offers the download as an equal alternative | **CONFIRMED verbatim** — `REQUIREMENTS.md:948` |
| 4 | Phase 5 shipped that alternative | **CONFIRMED** — `store/export.ts` (28,149 B), `export-download.ts` (5,234 B) |
| 5 | No filesystem import exists today | **CONFIRMED** — zero, any specifier form, both roots |
| 6 | No hosted-file reference exists today | **CONFIRMED** — zero occurrences, backend + engine + frontend |
| 7 | `fs` is on the DIST-05 allowlist | **CONFIRMED** — `check-bundle-imports.mjs:83` |
| 8 | Every declared column type is already scalar | **CONFIRMED** — all six tables, TEXT/INTEGER/REAL only, no BLOB, no untyped |
| 9 | O-01 is carried, not settled | **CONFIRMED** — `06-CONTEXT.md:264`, `06-RESEARCH.md:346`, counter-case at CONTEXT:379 preserved |

**Premise 7 moved the decision from a tidiness argument to a real one:** the gate closes a door that is open today, rather than double-locking a closed one.

**The expiry distinction, carried here in the same words it was put to the operator.** DEPLOY-03's "with expiry and redaction rules" attaches grammatically to BOTH alternatives, so the download owes an answer to it too. Under the download, **redaction is shipped** — `audit.kind` admits `export_raw` and `export_redacted` as distinct events, and `telemetry.ts` carries `PATH_REDACTION` — while **expiry loses its subject**: nothing persists server-side, so there is no artifact whose lifetime could expire. That is a **dissolution, recorded as one. It is not compliance and this summary does not claim it as compliance.** Under `sdk.hostedFile`, by contrast, expiry is not dissolved but **unsatisfiable** — the artifact is permanent and the SDK offers no means to remove it. Declining the hosted-file surface therefore avoided the one option under which DEPLOY-03's own expiry clause could never be met by anybody. This is the sharpest argument in the phase for D-17 and it is recorded here so it does not survive only in a checkpoint transcript.

## Decisions Made

See `key-decisions` in the frontmatter. The one worth restating in prose:

**No read-only allowlist for the hosted-file surface.** The outbound gate has `REQUESTS_READ_ONLY` because `sdk.requests.get` reads existing traffic and generates none. The hosted-file surface has no equivalent: `getAll()` returns `HostedFile` objects each carrying a server `path`, so even the read half hands back exactly the string DEPLOY-02 and D-19 exist to keep off the operator's screen. Both members are banned, and the `why` says so.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan defect] The self-audit acceptance criterion was unsatisfiable as written; a strictly stronger assertion shipped instead**

- **Found during:** Task 2 (writing the self-audit case)
- **Issue:** The plan's acceptance criterion reads *"Passing this spec file's own source through `auditSource` returns an empty array."* That cannot hold. The same plan mandates the POSIX `readdirSync` walk ("Enumerate the same file set the outbound gate does … with its POSIX-path walk"), so the file **must** import `node:fs` — and `fs-import` correctly fires on that real import. The parent gate's precedent does not transfer: its forbidden specifier is `caido:http`, which it only ever names in strings and comments and never imports. Making the criterion literally true would require exempting the gate's own file from its own rule, which is precisely the weakening the gate exists to prevent.
- **Fix:** Shipped an assertion that is stronger in **both** directions at once rather than weaker in one. `auditSource(SELF, source)` must report **exactly `["fs-import"]`** — proving the gate is not blind, because it sees the one real import — and the same source with that single import line removed must report `[]` — proving it is not a substring scanner, because it sees none of the hundreds of mentions of `fs`, `node:fs`, `llrt/fs`, their `/promises` variants and `sdk.hostedFile` that saturate the file's prose and its fixture strings. The count of removed lines is asserted to be exactly 1, so the removal cannot silently take more than it should.
- **Files modified:** `packages/backend/src/filesystem-prohibition.spec.ts`
- **Verification:** case *"reports EXACTLY its own real fs import on ITSELF, and nothing from its prose or its fixtures"* passes; the reasoning is recorded in the case's own comment so the next reader finds a decision rather than a surprise.
- **Committed in:** `4c2ab79`

**2. [Rule 1 - Bug] A non-vacuity threshold was authored rather than measured, and failed on its own file**

- **Found during:** Task 2 (first run)
- **Issue:** The self-audit's non-vacuity guard asserted the file names `node:fs` more than 20 times. It names it 12 times. The gate's own first run failed on it.
- **Fix:** Replaced the guessed number with a **derived** claim — *every* specifier in `FS_SPECIFIER_LIST` is named at least once in the file, which cannot drift into meaninglessness the way a threshold can and which additionally asserts something worth asserting: the file documents its whole ban rather than the one form its author thought of. The two counted floors were then set **below** the measured values (`node:fs` 12 → floor 5; `hostedFile` 25 → floor 15), with the measurements and the original failure recorded in the comment rather than quietly lowered.
- **Files modified:** `packages/backend/src/filesystem-prohibition.spec.ts`
- **Verification:** 224 cases pass; the non-vacuity assertion did exactly its job and the record of it doing so is in the file.
- **Committed in:** `4c2ab79`

**3. [Rule 2 - Missing critical] The cross-product acceptance criterion was machine-checked rather than hand-counted**

- **Found during:** Task 2 (acceptance-criteria verification)
- **Issue:** The criterion *"the case count for `fs-import` is at least the product of the four specifier families and the five import shapes"* was satisfiable by counting `it.each` rows in review — which is exactly how one spelling goes missing later.
- **Fix:** Added a case asserting `FS_IMPORT_TABLE.length` **is** `FS_SPECIFIER_LIST.length × IMPORT_SHAPES.length`, that no `(specifier, shape)` pair is duplicated (so the length does not overstate the reach), and that the total meets the plan's `4 × 5` floor. A shape added without a specifier, or a specifier added without every shape, now fails here.
- **Files modified:** `packages/backend/src/filesystem-prohibition.spec.ts`
- **Verification:** case *"the fs-import case table is the FULL CROSS PRODUCT of specifier forms and import shapes"* passes.
- **Committed in:** `4c2ab79`

**4. [Rule 3 - Blocking] Three unnecessary type assertions, two of them on magic indices**

- **Found during:** Task 2 (`pnpm lint`)
- **Issue:** `@typescript-eslint/no-unnecessary-type-assertion` on `SOURCE_ROOTS[0] as string` and two `FS_PREFIXES[1] as string`. The lint error was the surface problem; `FS_PREFIXES[1]` was the real one — a magic index standing for "the `node:` family".
- **Fix:** Named the three prefixes (`FS_PREFIX_BARE`, `FS_PREFIX_NODE`, `FS_PREFIX_RUNTIME`) and derived `FS_PREFIXES` from them, so the two call sites read `${FS_PREFIX_NODE}${FS_MODULE}` and no assertion is needed. Removed the third assertion outright.
- **Files modified:** `packages/backend/src/filesystem-prohibition.spec.ts`
- **Verification:** `pnpm lint` and `pnpm typecheck` both exit 0.
- **Committed in:** `4c2ab79`

**5. [Rule 3 - Blocking] `@typescript-eslint/require-await` on a synchronous new case**

- **Found during:** Task 3 (`pnpm lint`)
- **Issue:** *"the permitted set is exactly the three scalar affinities"* was written `async` by copying its neighbours, and awaits nothing.
- **Fix:** Made it synchronous.
- **Files modified:** `packages/backend/src/store/schema.spec.ts`
- **Verification:** `pnpm lint` exits 0.
- **Committed in:** `5b6a79e`

---

**Total deviations:** 5 auto-fixed (2 bugs/plan defects, 1 missing critical, 2 blocking)
**Impact on plan:** No scope creep. Deviation 1 is the only substantive one: it replaces an unsatisfiable acceptance criterion with a strictly stronger assertion, and the reason is recorded in the source rather than only here. Deviations 2 and 3 both **strengthened** authored claims into derived ones — the pattern this codebase already prefers. Nothing outside the plan's two `files_modified` was touched.

## Issues Encountered

**A minor inaccuracy in commit `4c2ab79`'s message.** It says "all 39 shipped modules"; the enumerated count is **35**. The gate itself enumerates from disk and asserts by name, so no assertion depends on the number — but the message is wrong and is corrected here rather than by rewriting history.

Nothing else. Both gates went green on the first real-tree run, which is the outcome premises 5, 6 and 8 predicted.

## TDD Gate Compliance

Task 3 carries `tdd="true"` while `workflow.tdd_mode` is `false`, so the plan-level MVP+TDD runtime gate did not apply. The RED/GREEN commit split was **not** performed, deliberately and for a mechanical reason: the deliverable of that task **is** test code. A RED commit would have had to reference `contentBearingColumns()` before it existed, which does not compile and could not have been committed through the hooks. What the RED gate exists to guarantee — that the failing path is executed rather than assumed — is delivered instead by three fixtures that build real throwaway tables (`throwaway_blob`, `throwaway_untyped`, `throwaway_a`/`throwaway_b`) and assert the collector reports them. Both tasks are `test(...)` commits, which is the correct type for test-only changes.

## Known Stubs

None. Nothing in this plan is placeholder: both gates enumerate from disk, both report against real files, and every rule's failing path is executed.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change — it adds two gates over surface that already existed. The threat register's dispositions are discharged as planned: T-06-35 and T-06-36 by `filesystem-prohibition.spec.ts`, T-06-38 by the declared-type gate, T-06-39 by the self-audit case that proves the walk is an AST walk (so the reasoning can stay in the source instead of being deleted to make a substring scan pass).

## Verification

| Check | Result |
|---|---|
| `vitest run filesystem-prohibition.spec.ts schema.spec.ts` | **241 passed** |
| `vitest run filesystem-prohibition.spec.ts outbound-prohibition.spec.ts` | **683 passed** |
| `vitest run store/export.spec.ts` (delivery path unmodified) | **100 passed** |
| `pnpm test` (full suite) | **2720 passed / 66 files** (baseline 2491 + 229 new) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 |
| `pnpm build` | exit 0 |
| `pnpm check:bundle` | exit 0 — `1 import specifier(s): crypto` |
| `git diff --exit-code -- scripts/ci/check-bundle-imports.mjs` | exit 0 — **byte-unchanged** |
| `pnpm check:css` | exit 0 |
| `pnpm check:externals` | exit 0 |
| `export.ts` / `export-download.ts` diff vs pre-plan HEAD | empty — **unmodified** |

## Self-Check: PASSED

- `packages/backend/src/filesystem-prohibition.spec.ts` — FOUND on disk (1,315 lines)
- `packages/backend/src/store/schema.spec.ts` — FOUND on disk (983 lines)
- `4c2ab79` — FOUND in `git log`
- `5b6a79e` — FOUND in `git log`
- All Task 2 acceptance criteria re-run and passing, except the self-audit emptiness criterion, replaced under Deviation 1 with a strictly stronger assertion
- All Task 3 acceptance criteria re-run and passing
- Plan-level `<verification>` block re-run in full; results tabulated above
- Working tree clean

## Next Phase Readiness

- **DEPLOY-03 and DEPLOY-04 are complete**, both by proof rather than by machinery.
- **Phase 7 inherits one open obligation, deliberately: O-01.** Can reconstructed source live in SQLite within QuickJS's memory? The research argues the memory question does not discriminate between the two designs — `JSON.parse` of the whole sourcemap materialises every entry before either a database bind or a file write, so files do not avoid the peak — but **that argument is reasoned, not measured**, and this runtime exposes no memory introspection at all. It is owned by Phase 7's first plan and discharged by the external-RSS probe. **If that probe is negative, D-17 is re-opened deliberately, and the quota-and-cleanup machinery returns as a SET rather than piecemeal.** It is not settled by this checkpoint having passed.
- **Phase 7's SC3 loses its subject while D-17 holds:** with no filesystem, the malicious-`sources` traversal / UNC / drive-letter / reserved-name fixture suite across three platforms has no target. That dissolution is contingent on O-01 and returns with it.
- **The gate is now the thing to edit, not the decision.** Adding a filesystem import or a BLOB column fails a named test with the whole argument in its message, so D-17 and D-24 get re-opened deliberately rather than eroded.
- **Not this plan's, and still open:** the producer driver has no caller (STATE.md), folded into plan 06-09 by operator decision.

---
*Phase: 06-retroactive-scan-deployment-reality*
*Completed: 2026-08-31*
