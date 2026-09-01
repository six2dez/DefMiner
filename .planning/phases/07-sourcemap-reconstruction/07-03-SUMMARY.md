---
phase: 07-sourcemap-reconstruction
plan: 03
subsystem: testing
tags: [static-gate, ast, capability-ban, supply-chain, sourcemap, vlq, traversal, spike-12]

requires:
  - phase: 00-runtime-reality-check
    provides: "SPIKE-06's vlq_decode measurement (167 ms on 8.3 MB against a 25 ms slice) and its finding that the codec is FULLY BUNDLED under Caido's build; SPIKE-12's path_resolution corpus with escapes_via_resolve on 5 of 22 labels, the path.normalize RTL corruption, and symlink_write_through_scratch_root: true"
  - phase: 06-retroactive-scan-deployment-reality
    provides: "filesystem-prohibition.spec.ts's nine-part gate shape — the pure auditSource(file, source) AST walk, POSIX source-root enumeration, by-name non-vacuity block, RULES-keyed-by-id record with the why travelling into the message, derived rule array, and firing/legal fixture pair per rule; its HOSTED_FILE_MEMBER and FS_SPECIFIER_LIST declarations, read here out of its source text; outbound-prohibition.spec.ts's exported SOURCE_ROOTS and its measured lessons about logical assignment operators and over-broad unanalysable rules; scan/httpql-discipline.spec.ts's silent-by-construction register"
  - phase: 07-sourcemap-reconstruction
    provides: "plan 07-01's SOURCES_LABEL_CASES / SOURCES_LABEL_CASE_IDS (22 SPIKE-12 strings + the 4 KB label) in map-fixture.ts; plan 07-02's packages/engine/src/sourcemap/parse.ts and its exported RecoveredSource type, and announce.ts — the modules both gates must descend into"
provides:
  - "packages/frontend declares @jridgewell/sourcemap-codec at the exact pin 1.5.5, so the VLQ decode can run in the operator's browser (D-16)"
  - "packages/backend/src/codec-prohibition.spec.ts — D-17's package-level capability ban over BOTH source roots, full specifier x import-shape cross product, AST walk, self-auditing"
  - "packages/backend/src/sources-sink-prohibition.spec.ts — D-12's proof that no sources value reaches a path-like sink, firing against all 23 measured labels, red the day a filesystem returns"
  - "A DERIVED specifier axis pattern: the ban's specifier list is read out of the banned package's own exports map rather than enumerated"
  - "A DERIVED binding-name pattern: SOURCES_BINDING_NAMES read out of parse.ts's RecoveredSource field names by the TypeScript AST, pinned by name so a rename is loud"
affects: [07-04, 07-05, 07-06, 07-07, 07-08, 07-09, 07-10]

actuals:
  tokens: 41000
  tasks: 3
  commits: 3

tech-stack:
  added:
    - "@jridgewell/sourcemap-codec@1.5.5 — relocated, not installed. A pre-existing root devDependency now also declared by packages/frontend"
  patterns:
    - "DERIVE THE BAN'S AXIS FROM THE BANNED THING ITSELF. The codec specifier list is read out of the package's own exports map at test time, so a package that adds an exported subpath adds it to the ban with no edit"
    - "A CROSS-PRODUCT ASSERTION IS SELF-REFERENTIAL AND CANNOT CATCH A DELETION. Asserting length === specifiers x shapes stays TRUE when a shape is removed, because both sides shrink together. The axis must ALSO be pinned from outside itself"
    - "ASSERT THE AST-VS-TEXT CLAIM AS A DISAGREEMENT, NOT AS A COUNT. A threshold on how often a file names the banned token measures how the prose happens to be written; running the naive gate on the same bytes and showing the two answer differently measures the thing actually claimed"
    - "A DERIVATION THAT QUIETLY TRACKS WHATEVER IT FINDS PROVES NOTHING. Derive so the gate follows a rename, then PIN the expected members so the rename is loud"
    - "EXCLUDE A SINK ON A NAME COLLISION, NEVER ON THE CAPABILITY, AND ASSERT THE EXCLUSION IS STILL NEEDED — a stale exclusion hides the next real one"

key-files:
  created:
    - packages/backend/src/codec-prohibition.spec.ts
    - packages/backend/src/sources-sink-prohibition.spec.ts
  modified:
    - packages/frontend/package.json
    - pnpm-lock.yaml
    - knip.json

key-decisions:
  - "THE CODEC IS RELOCATED, NOT INSTALLED. `pnpm install --offline` reported `Lockfile is up to date, resolution step is skipped` — nothing was fetched and nothing resolved from the registry, which is how T-07-SC is discharged without a checkpoint"
  - "THE ROOT devDependency IS KEPT. tier1/parse/src/index.ts is the SPIKE-06 probe and knip.json treats tier1/*/src/index.ts as a root-workspace entry point; removing it would make the probe unbuildable"
  - "codec-unanalysable IS DUPLICATED from outbound-prohibition.spec.ts's identical rule, which filesystem-prohibition.spec.ts deliberately DECLINED to do. The cost — the same node reported twice — is stated in the header. What it buys is attribution: FORBIDDEN_CODEC is read as the complete statement of D-17, and a gap there would be read as a permission"
  - "REQUIRED_IMPORT_SHAPES pins the shape axis from OUTSIDE it, because the obvious cross-product assertion cannot catch a deletion. Measured, not reasoned about: a scratch deletion of the star re-export did NOT redden the length assertion"
  - "PATH_LIKE_SINKS matches ANYWHERE IN THE CALLEE'S NAME CHAIN, so one uniform rule covers resolve(x), path.resolve(x) and sdk.hostedFile.create(x) without three special cases"
  - "`parse` and `format` are HELD OUT of the path sink set on a NAME COLLISION with JSON.parse / Intl format. A rule that reported JSON.parse(sourcesVerbatim) as a path sink would be mislabelling, not over-approximating — and a gate that is loud rather than right gets deleted rather than fixed. Each exclusion is asserted to still be a member of node:path so a stale one is reported"
  - "`content` is EXCLUDED from SOURCES_BINDING_NAMES. It is the recovered file body, not the label, and MAP-04's second clause is about the label. Including a name that generic would report on every module with a `content` variable"
  - "knip.json gains ONE ignoreDependencies entry for the frontend workspace, in that file's own established idiom, with the removal condition named (plan 07-08's import). See Deviations"

patterns-established:
  - "Read another file's constant out of its SOURCE TEXT by the TypeScript AST and THROW if it is missing, rather than defaulting — a default turns an orphaned derivation into a gate that silently enforces less"
  - "Exercise a hostile corpus in BOTH directions per case — into a sink and into a non-sink — so the claim is about the SINK rather than about the string"
  - "Prove a self-audit is not vacuous from both ends: the gate reports the exact set on its own file, is UNCHANGED by added prose, and reports exactly once when a real violation is appended to those same bytes"

requirements-completed: []

coverage:
  - id: D1
    description: "The codec is declared by packages/frontend at an exact pin, relocated offline, with the root devDependency intact and the two CI gates untouched"
    requirement: MAP-03
    verification:
      - kind: manual
        ref: "git diff --stat packages/frontend/package.json — 1 insertion, 0 deletions"
        status: pass
      - kind: manual
        ref: "git diff --exit-code -- scripts/ci/check-bundle-imports.mjs packages/frontend/externals.mjs — exit 0"
        status: pass
      - kind: manual
        ref: "pnpm why @jridgewell/sourcemap-codec — 1.5.5, @defminer/frontend@1.0.0 (dependencies) among the direct dependents"
        status: pass
  - id: D2
    description: "No module under either source root imports the codec, in any specifier form and any import shape, proven by an AST walk over the full cross product"
    requirement: MAP-03
    verification:
      - kind: unit
        ref: "packages/backend/src/codec-prohibition.spec.ts#%s imports no VLQ codec"
        status: pass
      - kind: unit
        ref: "packages/backend/src/codec-prohibition.spec.ts#the codec-import case table is the FULL CROSS PRODUCT of specifier forms and import shapes"
        status: pass
      - kind: unit
        ref: "packages/backend/src/codec-prohibition.spec.ts#reports NOTHING on ITSELF, while a substring scan of the same bytes FIRES"
        status: pass
  - id: D3
    description: "The gate is not vacuous — it enumerates named shipped modules across both roots, descends into subdirectories per root, and agrees with the sibling gate's source roots"
    requirement: MAP-03
    verification:
      - kind: unit
        ref: "packages/backend/src/codec-prohibition.spec.ts#enumerates a NON-EMPTY set of shipped modules, BY NAME, ACROSS BOTH ROOTS"
        status: pass
      - kind: unit
        ref: "packages/backend/src/codec-prohibition.spec.ts#the walk really DESCENDED into subdirectories, per root"
        status: pass
      - kind: unit
        ref: "packages/backend/src/codec-prohibition.spec.ts#scans the SAME roots the outbound gate does, read off that file rather than assumed"
        status: pass
  - id: D4
    description: "No sources value reaches a path-like sink, asserted against all 23 measured labels including the NUL-byte, RTL-override, fullwidth-dot and trailing-whitespace spellings, with a legal control"
    requirement: MAP-04
    verification:
      - kind: unit
        ref: "packages/backend/src/sources-sink-prohibition.spec.ts#the exercised label-id set EQUALS SOURCES_LABEL_CASE_IDS, in full"
        status: pass
      - kind: unit
        ref: "packages/backend/src/sources-sink-prohibition.spec.ts#the ENCODINGS SPIKE-12 measured are in the corpus, by their measured bytes"
        status: pass
      - kind: unit
        ref: "packages/backend/src/sources-sink-prohibition.spec.ts#stays QUIET on the %s label handed to a NON-sink"
        status: pass
  - id: D5
    description: "Both derived sets track the files they are derived from, and a rename over there is loud rather than silently followed"
    requirement: MAP-04
    verification:
      - kind: unit
        ref: "packages/backend/src/sources-sink-prohibition.spec.ts#RECOVERED_SOURCE_FIELDS is read off parse.ts and pins its members BY NAME"
        status: pass
      - kind: unit
        ref: "packages/backend/src/sources-sink-prohibition.spec.ts#PATH_LIKE_SINKS carries the path surface, the filesystem surface, and the sibling's hosted-file name"
        status: pass
      - kind: unit
        ref: "packages/backend/src/sources-sink-prohibition.spec.ts#the filesystem half of the sink set is UNREACHABLE by the sibling gate's ban, read off that file"
        status: pass

status: complete
---

# Phase 07 Plan 03: Codec Relocation and the Two Capability Gates Summary

D-16 moves the VLQ decode to the browser with a one-line manifest change and no registry
resolution; D-17 and D-12 make MAP-03 and MAP-04 mechanical properties of the source tree —
two new AST gates over `packages/backend/src` **and** `packages/engine/src`, 335 cases, each
watched failing before it was trusted.

## What was built

**The relocation (task 1).** `@jridgewell/sourcemap-codec` at the exact pin `1.5.5` added to
`packages/frontend` `dependencies`, in alphabetical position. The frontend manifest diff is
**exactly one insertion, zero deletions**. The lockfile diff is three lines, all under the
frontend importer.

**`codec-prohibition.spec.ts` (tasks 1–2).** The fourth member of the static-gate family, and
the first to derive its specifier axis from the banned package itself.

**`sources-sink-prohibition.spec.ts` (task 3).** The fifth member, and the one whose subject is
a dissolution: MAP-04's first clause has no subject under D-17, so what is shipped is a proof of
unreachability that goes red the day a filesystem returns.

## Both gates cover 07-02's modules — verified, not assumed

This plan was moved from wave 2 to wave 3 precisely so the walks would have this phase's own
subject to visit. The walk enumerates **38** shipped modules, of which three are under
`packages/engine/src/sourcemap/`:

```
packages/engine/src/sourcemap/announce.ts
packages/engine/src/sourcemap/map-fixture.ts
packages/engine/src/sourcemap/parse.ts
```

Both gates name `sourcemap/parse.ts` and `sourcemap/announce.ts` **explicitly** in their by-name
non-vacuity block, so a package split or a moved module is a loud failure rather than a quietly
halved scan. And the `descended into subdirectories` case is **unconditional per root** in both
gates — which `filesystem-prohibition.spec.ts` could not do, because when it was written
`packages/engine/src` was flat and it had to read the condition off disk and skip. Plan 07-02
gave the engine its first subdirectory, so the weaker form is no longer needed; the assertion
that every root *has* a subdirectory is made first, so an engine that goes flat again fails
loudly rather than quietly relaxing the case back.

`SOURCES_BINDING_NAMES` is **derived from the real type**, not guessed. `parse.ts`'s exported
`RecoveredSource` is read off disk and parsed with the TypeScript compiler; its field names are
`sourcesIndex`, `sourcesVerbatim`, `content`. The gate keeps the two beginning with `sources`,
adds the ECMA-426 member `sources` itself, and excludes `content` with the reason stated.

## The supply chain, discharged without a registry resolution

`pnpm install --offline` output:

```
Scope: all 4 workspace projects
✓ Lockfile passes supply-chain policies (793 entries in 369ms)
Lockfile is up to date, resolution step is skipped
Already up to date
```

No `ERR_PNPM_NO_OFFLINE`, no resolution step, nothing fetched. `pnpm why` after the install lists
the frontend as a **direct dependent**:

```
@jridgewell/sourcemap-codec@1.5.5
├── @defminer/frontend@1.0.0 (dependencies)
...
├── defminer@1.0.0 (devDependencies)
```

Both direct dependents are present: the frontend (new, this plan) and the root devDependency
(pre-existing, deliberately kept — `tier1/parse/src/index.ts` is the SPIKE-06 probe and
`knip.json` treats `tier1/*/src/index.ts` as a root-workspace entry point, so removing it would
make the probe unbuildable). `grep -c 'sourcemap-codec' package.json` returns 1.

The legitimacy seam's `SUS (too-new)` verdict is **discounted with its reason recorded**: the
seam reads `publishedAt` as the most recent release date, so a maintained package is permanently
"new" by that measure. Every substantive check passes — `postinstall: null`, `deprecated: false`,
MIT, zero runtime dependencies, 209,862,432 weekly downloads, source repository
`github.com/jridgewell/sourcemaps`, and the package was already in `node_modules/.pnpm` and in
the lockfile before this plan touched anything.

## The two files that were NOT modified, and the two different reasons

`git diff --exit-code -- scripts/ci/check-bundle-imports.mjs packages/frontend/externals.mjs`
exits 0.

**`scripts/ci/check-bundle-imports.mjs` — because it is silent by construction, and that is the
sharpest argument for D-17 existing.** That gate reads import SPECIFIERS out of the *built*
bundle. SPIKE-06 measured that this codec is FULLY BUNDLED under Caido's own build — it is not
externalised, so the artifact contains the codec's *code* and emits no specifier for it at all.
A backend codec import would produce nothing for that gate to see. It would not fire late; it
would not fire. Recorded in the D-17 gate's own `why` text, in the register
`scan/httpql-discipline.spec.ts` uses for the same shape (T-07-26, accepted).

**`packages/frontend/externals.mjs` — for the opposite reason.** Marking the codec external
would leave it as a bare import Caido cannot resolve, and the plugin would fail at runtime on the
operator's machine — the inverse defect `scripts/ci/frontend-externals.mjs`'s second rule exists
to catch (T-07-25).

## The five RED demonstrations

The plan asked for four. Five were executed, each reverted and re-verified green.

**1 — a planted backend codec import (task 1).**
`packages/backend/src/scratch-red-demo.ts` with `import decode from "@jridgewell/sourcemap-codec";`

```
FAIL  codec-prohibition.spec.ts > packages/backend/src/scratch-red-demo.ts imports no VLQ codec
AssertionError: packages/backend/src/scratch-red-demo.ts imports @jridgewell/sourcemap-codec,
which D-17 forbids in every module the plugin ships — packages/backend/src and packages/engine/src:
expected [ Array(1) ] to deeply equal []
+ "codec-import: a value import of `@jridgewell/sourcemap-codec` — an import of
  `@jridgewell/sourcemap-codec`, or of any subpath of it. MAP-03 moves the VLQ decode to the
  browser because SPIKE-06 MEASURED vlq_decode at 167 ms ..."
```

Green after revert: 46 passed.

**2 — a deleted import shape (task 2).** Removing `a star re-export` from `IMPORT_SHAPES`:

```
FAIL  the codec-import case table is the FULL CROSS PRODUCT of specifier forms and import shapes
AssertionError: the cross product does not exercise a star re-export of
@jridgewell/sourcemap-codec: expected [ …(54) ] to include
'@jridgewell/sourcemap-codec|a star re…'
```

**This one changed the design.** The first draft asserted only
`CODEC_IMPORT_TABLE.length === CODEC_SPECIFIER_LIST.length * IMPORT_SHAPES.length`, and the
deletion did **not** redden it — both sides of the arithmetic shrink together, so the assertion
is self-referential. `REQUIRED_IMPORT_SHAPES` was added to pin the axis from outside itself, and
the measurement is recorded in the file rather than the weakness being quietly papered over.

**3 — a deleted source root (task 2).** Removing `packages/engine/src` from `SOURCE_ROOTS`:

```
FAIL  scans the SAME roots the outbound gate does, read off that file rather than assumed
AssertionError: the outbound gate scans a root this gate does not, so half the shipped tree is
ungated for the codec while the outbound rules still cover it:
expected [ 'packages/engine/src' ] to deeply equal []
```

The by-name non-vacuity assertion also went red (`pipeline.ts is not being audited`). The
agreement check originally reported a bare `expected 2 to be 1`; it was changed to diff the
parent's roots and **name** the missing one, because the root most likely to go missing is
`packages/engine/src` — deleted by somebody thinking "the codec ban is about the backend".

**4 — a renamed sibling declaration (task 2).** Renaming `export const SOURCE_ROOTS` to
`AUDITED_ROOTS` in `outbound-prohibition.spec.ts`:

```
FAIL  scans the SAME roots the outbound gate does, read off that file rather than assumed
AssertionError: outbound-prohibition.spec.ts no longer declares SOURCE_ROOTS, so this agreement
check is vacuous: expected -1 to be greater than -1
```

The sibling was reverted with `git checkout --` and verified clean.

**5 — a planted sources-to-sink call (task 3).** `packages/backend/src/scratch-sink-demo.ts`
binding `row.sourcesVerbatim` and passing it to `resolve`:

```
FAIL  sources-sink-prohibition.spec.ts > packages/backend/src/scratch-sink-demo.ts hands no
`sources` value to a path-like sink
AssertionError: packages/backend/src/scratch-sink-demo.ts reaches a path-like sink with a
`sources` value, which MAP-04 forbids in every module the plugin ships:
expected [ Array(1) ] to deeply equal []
+ "sources-to-path-sink: `resolve` reached with a value from a `sources` binding — ...
  SPIKE-12 MEASURED `escapes_via_resolve: true` ... It also measured
  symlink_write_through_scratch_root: true, which is the finding that broke LEXICAL containment
  outright ..."
```

A sixth, unplanned RED is recorded below under Deviations: the codec gate's own non-vacuity
assertion failed on its own file the first time it ran.

## knip status of the new frontend dependency

**Baseline before this plan: `pnpm knip` exit 0.** With the codec declared and not yet imported:

```
Unused dependencies (1)
@jridgewell/sourcemap-codec  packages/frontend/package.json:14:6
```

exit 1. The 23 `Tag hints` printed alongside are pre-existing and are hints, not errors — the
baseline confirms exit 0 with them present.

**It goes quiet when plan 07-08's viewer imports the codec.** That is the plan's own stated
sequencing: the declaration lands here because the D-17 gate has to be able to say where the
codec legitimately lives; the import lands in 07-08. Rather than leave a shipped gate red for
five downstream plans, one `ignoreDependencies` entry was added to `knip.json` — see Deviations.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] `knip.json` gains one `ignoreDependencies` entry for the frontend
workspace.**

- **Found during:** Task 1, running the plan's own `pnpm knip` acceptance check.
- **Issue:** The plan's task 3 `<verify>` block is
  `pnpm test && pnpm typecheck && pnpm lint && pnpm knip` with `fails_when: non-zero exit`, and
  every downstream plan's verify gate runs the same suite. Declaring a dependency five plans
  before importing it turns `pnpm knip` red for the whole of waves 3–5. A gate that is red for a
  reason that is not the current plan's defect trains people to ignore it — which is the failure
  mode every gate in this phase exists to prevent.
- **Why this and not "just record it":** the plan's acceptance criterion permitted recording the
  knip output instead. Recording alone would leave the shipped gate failing. `knip.json` already
  establishes exactly this pattern **three times** — `@defminer/engine`, `@vueuse/core` and
  `vue-virtual-scroller` each carried a "Remove when the first import lands" note, and each was
  removed when it did. The file's own doctrine is applied rather than a new mechanism invented.
- **Fix:** one entry, `"ignoreDependencies": ["@jridgewell/sourcemap-codec"]`, with a comment in
  the file's own register naming D-16's reason, the reason the declaration and the import are in
  different plans, the removal condition (07-08's viewer import, in the same edit), and the
  reason the root devDependency must not be removed.
- **Files modified:** `knip.json`
- **Commit:** `1c41963`
- **Residual, stated:** an ignore that has stopped being needed is an ignore that starts hiding
  the next real one. `knip` reports a stale entry as a configuration hint, so 07-08 removing it
  is mechanical.

**2. [Rule 1 — Bug in the gate's own assertion] The codec gate's self-audit non-vacuity check
failed on its own file, and the design was changed rather than the number lowered.**

- **Found during:** Task 1, first run of the new gate.
- **Issue:** `expect(occurrences(source, CODEC_PACKAGE)).toBeGreaterThan(5)` — measured **3**.
  Most mentions in the file are built from the `CODEC_PACKAGE` constant rather than spelled out,
  so the literal appears far less often than the prose suggests.
- **Fix:** the claim is now asserted as a **disagreement** rather than as a count — a substring
  scan over the file's exact bytes finds hits while the AST walk reports the empty set, which is
  the thing actually being claimed. The count floor is kept at `> 2`, below the measured 3, per
  `filesystem-prohibition.spec.ts`'s own doctrine of setting floors below measured values. The
  failed first draft and its number are recorded **in the file**, not quietly removed.
- **Files modified:** `packages/backend/src/codec-prohibition.spec.ts`
- **Commit:** `1c41963`

**3. [Rule 2 — Missing critical assertion] The cross-product assertion could not catch a
deletion; `REQUIRED_IMPORT_SHAPES` added.**

- **Found during:** Task 2, RED demonstration 2.
- **Issue:** documented above under RED demonstration 2. The plan specified the assertion in the
  form that turns out to be self-referential.
- **Fix:** an external floor list, and the measurement recorded in the file's own doc comment so
  the next reader learns the lesson rather than repeating it.
- **Commit:** `9f8f2cd`

**4. [Rule 2 — Correctness] `parse` and `format` held out of the path sink set on a name
collision.**

- **Found during:** Task 3, designing `PATH_LIKE_SINKS` from `Object.keys(posix)`.
- **Issue:** `parse` and `format` are `node:path` members **and** the names of `JSON.parse`,
  `Date.parse` and `Intl.NumberFormat.prototype.format`. A rule reporting
  `JSON.parse(sourcesVerbatim)` as a *path sink* is mislabelling, not fail-closed
  over-approximation — and the family's recorded lesson is that a gate which is loud rather than
  right gets deleted rather than fixed.
- **Fix:** a named, frozen `PATH_MODULE_EXCLUSIONS` with the reason stated as a **name collision
  and never a capability**, plus an assertion that each excluded member is still present in the
  derived `node:path` surface — so a stale exclusion is reported rather than sitting there
  hiding the next real one. `JSON.parse(sourcesVerbatim)` is shipped as an explicit legal
  fixture, so the decision is executed rather than described.
- **Commit:** `2d70c6d`

**5. [Rule 3 — Convention] The source-root agreement check uses `indexOf`, not a regex.**

- **Found during:** Task 2, while writing the "name the missing root" improvement.
- **Issue:** the first draft used `String.prototype.matchAll` with a pattern. None of the three
  sibling gates uses a regex anywhere in the family.
- **Fix:** replaced with a hand-rolled `quotedRootsIn` scan in the family's `occurrences` idiom,
  with the reason stated at the declaration. A subtly wrong pattern would fail silently by
  matching nothing, and a check that matches nothing is the same defect as one that scans
  nothing.
- **Commit:** `9f8f2cd`

### Deliberate departure from a sibling's precedent

**`codec-unanalysable` duplicates `outbound-unanalysable`, which `filesystem-prohibition.spec.ts`
explicitly declined to do.** The plan required the second rule; the reason it is defensible is
stated in the new file's header rather than left as plan compliance. The cost — the same node
reported twice, in two files, under two rule ids — is written down. What it buys is attribution:
`FORBIDDEN_CODEC` is exported as data precisely so it can be read as the complete statement of
what D-17 forbids, and D-17's claim is that a *package* is unreachable from these two roots. Once
every literal spelling is banned, an unreadable specifier is the only remaining path, so a gap
there is not a missing detail — it is the whole ban defeated. The two `why` texts point at
different requirements (CORE-11 next door, MAP-03 here), so the duplication costs a second
message rather than a second investigation.

## Threat mitigations discharged

| Threat ID | Disposition | How |
|-----------|-------------|-----|
| T-07-SC | mitigate | `pnpm install --offline`, resolution step skipped, exact pin `1.5.5`, lockfile diff confined to the frontend importer (3 lines). Seam's `SUS (too-new)` discounted with reason recorded |
| T-07-01 | mitigate | `sources-sink-prohibition.spec.ts` over both roots, firing on all 23 labels including NUL-byte / RTL-override / fullwidth-dot / trailing-whitespace, with a legal control and both-directions coverage per label |
| T-07-23 | mitigate | `codec-prohibition.spec.ts`, 6 derived specifiers × 10 import shapes + 10 undeclared-subpath cases, AST walk, type-only imports banned |
| T-07-24 | mitigate | Four-assertion by-name non-vacuity block on both gates, source-root agreement reading the sibling's source text, self-audit on both — each watched RED before being trusted |
| T-07-25 | mitigate | `externals.mjs` unmodified, asserted by `git diff --exit-code` |
| T-07-26 | accept | Recorded in the D-17 gate's own `why` text: `check-bundle-imports.mjs` cannot see a bundled dependency's absence of a specifier |

## Verification

| Gate | Result |
|------|--------|
| `pnpm test` | exit 0 |
| `pnpm typecheck` | exit 0, zero `error TS` |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 |
| `git diff --exit-code -- scripts/ci/check-bundle-imports.mjs packages/frontend/externals.mjs` | exit 0 |
| `git diff --stat packages/frontend/package.json` | 1 insertion, 0 deletions |
| `codec-prohibition.spec.ts` | 212 cases |
| `sources-sink-prohibition.spec.ts` | 123 cases |
| Both new gates together | 335 passed |
| RED demonstrations executed and reverted | 5 |

## Known Stubs

None. Both files are complete gates with every declared rule's firing and legal path executed.

## What plan 07-08 must do

Import the codec in `packages/frontend` **and remove the `ignoreDependencies` entry from
`knip.json` in the same edit.** The entry carries that instruction in its own comment, and
`knip` reports a stale entry as a configuration hint, so the removal cannot be forgotten
silently.

## Self-Check: PASSED

- `packages/backend/src/codec-prohibition.spec.ts` — FOUND
- `packages/backend/src/sources-sink-prohibition.spec.ts` — FOUND
- `packages/frontend/package.json` — FOUND, 1 insertion
- `knip.json` — FOUND, modified
- Commit `1c41963` — FOUND
- Commit `9f8f2cd` — FOUND
- Commit `2d70c6d` — FOUND
