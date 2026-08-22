---
phase: 01-skeleton-persistence-compatibility
plan: 16
subsystem: testing
tags: [static-analysis, typescript-ast, redaction, redos, core-11, store-07, store-03]

requires:
  - phase: 01-15
    provides: the observations.spec.ts pattern-gate fixtures and schema.spec.ts allowlist this plan widens on top of
  - phase: 01-12
    provides: the CORE-11 outbound gate's rewrite, whose stated boundary-2 rule this plan applies one level up
  - phase: 01-13
    provides: the STORE-07 redaction gate's derivesFrom walk, whose render-form enumeration this plan extends
provides:
  - a CORE-11 gate that REPORTS an unreadable receiver instead of dropping it, at both the receiver and the identified-global-member level
  - two new CORE-11 surfaces — navigator.sendBeacon (receiver-anchored) and dynamic code construction (eval, new Function)
  - a STORE-07 gate that sees `+=`, `.concat(...)` and push-then-join
  - an ERROR_BINDING_NAMES set decided by a real-tree measurement rather than by a claim about false positives
  - a describeError that cannot throw, with one shared fallback literal
  - an analyses.error disclosure that names the residual that actually exists, executed in both directions
  - a pattern gate whose claim and enforcement say the same thing, with the one permitted literal still permitted through count-plus-anchor
affects: [01-17, phase-02-ERR-03, phase-02-ERR-04, phase-08-ACTIVE]

actuals:
  tokens: 24000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A gate's third state: `receiverKind` answers `receiver X` / `not a receiver` / `cannot read`, and the third is never collapsed into the second"
    - "A widening's bound is set by MEASUREMENT against the real tree, and the false positives that set it are pasted into the gate as must-stay-quiet fixtures"
    - "An exemption is extended by covering the construct it already covers (the literal), never by adding a file-name skip"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - packages/backend/src/store/error-redaction.spec.ts
    - packages/backend/src/store/observations.spec.ts
    - packages/backend/src/store/schema.spec.ts
    - packages/backend/src/telemetry.ts
    - packages/backend/src/telemetry.spec.ts
    - .planning/phases/01-skeleton-persistence-compatibility/COVERAGE.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "WR-19's bound is ASSEMBLED-KEY, not every-non-reducing-key, and it was decided by a real-tree run rather than by taste: the broad rule fired twice on shipped source (compat.ts's documented dotted-path walk and array indexing), so the walk now reports what it can see being HIDDEN and discloses what it merely cannot FOLLOW"
  - "The two-hop shape `const a=\"requests\"; const b=a; sdk[b].send(req)` remains the disclosed residual and its CURRENT report ([]) is asserted, so re-opening or closing it is a deliberate act"
  - "An unreadable receiver bound to a name is REMEMBERED, not reported at the binding — the report lands where the name is used as a receiver, which keeps an ordinary dictionary read out of the violation list"
  - "ERROR_BINDING_NAMES gained all four candidates (reason/detail/failure/message) because the real-tree run produced ZERO hits across all seven store modules; none had to be dropped"
  - "Pattern gate: option (a) was taken. A regex-literal first argument falls through rule 4 without a verdict, so telemetry.ts:269's permitted call is covered BY ITS LITERAL BEING COVERED under the existing count-plus-anchor"

patterns-established:
  - "Three-state resolution in an AST gate: unreadable is a distinct answer with its own reported rule, at every level the walk can tell something is hidden"
  - "Provable-numeric key exemption: `+` counts as numeric only when BOTH operands are, so `i + 1` is an index and `\"req\" + \"uests\"` is an assembled name"
  - "A widening's header enumeration is extended in the same commit as its rules, or the file becomes the overclaim it protects against"

requirements-completed: [CORE-11, STORE-07, STORE-03]

coverage:
  - id: D1
    description: "The CORE-11 gate reports an unreadable RECEIVER (assembled key) instead of dropping it, and reports a computed member of a positively identified global receiver"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#a receiver the walk cannot read is REPORTED, not dropped"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-unanalysable fires on an assembled MEMBER of an identified global receiver"
        status: pass
    human_judgment: false
  - id: D2
    description: "navigator.sendBeacon is covered receiver-anchored, and eval / new Function are refused outright in shipped source"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the beacon surface — receiver-anchored, not member-name-only"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#dynamic code construction — refused rather than analysed"
        status: pass
    human_judgment: false
  - id: D3
    description: "The CORE-11 gate still reports ZERO over both shipped source roots after the widening"
    requirement: "CORE-11"
    verification:
      - kind: integration
        ref: "packages/backend/src/outbound-prohibition.spec.ts#%s reaches no outbound surface (23 files across 2 roots)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The STORE-07 gate sees `+=`, `.concat(...)` and push-then-join, using the review's exact source strings"
    requirement: "STORE-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#flags a += accumulate of the caught binding — unredacted-concat (WR-17)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#flags a .concat() render of the caught binding — unredacted-concat (WR-17)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#flags PUSH-then-JOIN of the caught binding — unredacted-string-call (WR-17)"
        status: pass
    human_judgment: false
  - id: D5
    description: "describeError cannot throw, proven against a null-prototype object, a throwing toString and a proxy"
    requirement: "STORE-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#returns the fallback for a NULL-PROTOTYPE object instead of throwing"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#returns the fallback for a THROWING toString instead of propagating"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#survives a PROXY whose constructor read raises"
        status: pass
    human_judgment: false
  - id: D6
    description: "The analyses.error disclosure names the residual that exists (schemeless host reference), and both directions are executed"
    requirement: "STORE-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#REDACTS a SCHEME-RELATIVE reference — it begins with a separator and has three"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#RESIDUAL, PINNED: a SCHEMELESS host reference survives with its query intact"
        status: pass
    human_judgment: false
  - id: D7
    description: "The pattern gate flags a replace/replaceAll/split call whose first argument is not a string literal, closing the module-local premise"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#a pattern that ARRIVES defeats none of the banned constructs (WR-20)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The one permitted regex literal stays permitted through count-plus-anchor, never a file-name skip; exemption integrity mutation-proven"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#EXEMPTION INTEGRITY under the widened rule — a SECOND literal still fails"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#EXEMPTION INTEGRITY under the widened rule — the literal MOVED OUT of redactUrls still fails"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#the exempted CALL does not travel either — the same call in observations.ts fails"
        status: pass
    human_judgment: false
  - id: D9
    description: "COVERAGE.md rows 9 and 27 and REQUIREMENTS.md's CORE-11 entry describe the enforcement that exists after this plan"
    requirement: "CORE-11"
    verification: []
    human_judgment: true
    rationale: "Ledger prose. No test asserts that a justification cell matches the gate it cites — the cross-reference is a claim a reader audits, which is exactly the class of drift this plan was closing."

duration: 34 min
completed: 2026-08-22
status: complete
---

# Phase 01 Plan 16: Gap Closure Round 3 — Receiver-Level Unanalysable, Two New CORE-11 Surfaces, Three Unseen Renders, a Non-Throwing Renderer, and a Pattern Gate That Means What It Says Summary

**Four rules that stopped one token short of shapes they already almost saw, two surfaces nobody had checked, and one renderer that could throw on the error path it exists to contain — all closed, each with an executed mutation proof, and each widening's bound set by a real-tree measurement rather than by argument.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-08-22T08:55:00Z (approx, first baseline run)
- **Completed:** 2026-08-22T09:29:34Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- **WR-19 closed at both levels.** `receiverKind` gained a third state distinct from "not a receiver", and the member rule gained the identified-global branch. `sdk["req"+"uests"].send(req)` and `globalThis["fet"+"ch"](u)` stop returning empty lists.
- **Two new CORE-11 surfaces**, `outbound-beacon` and `outbound-dynamic-code`, taking the rule set from six to eight with the enumeration test updated in the same commit.
- **WR-17 closed.** `+=`, `.concat(...)` and push-then-join are all visible, using the review's exact source strings as fixtures.
- **IN-16 decided by measurement.** Four synonyms added to `ERROR_BINDING_NAMES`; the real-tree run produced zero hits, so all four were kept and the remaining coverage bound is stated by name.
- **IN-17 closed.** `describeError` cannot throw. All three hostile shapes threw before this plan; six store call sites do not wrap it.
- **WR-18 corrected from executed output.** The named residual was CLOSED and the surviving one appeared in neither disclosure.
- **WR-20 closed with option (a).** The pattern gate now enforces what its header claims, and the one permitted literal survives through the same count-plus-anchor mechanism.
- **Green baseline restored and grown:** 31 files / 1042 tests (from 31 / 995), typecheck / lint / knip clean, bundle at exactly one specifier.

## Task Commits

1. **Task 1: the CORE-11 gate — the unreadable receiver, the beacon and dynamic-code surfaces** — `0ec1e02` (feat)
2. **Task 2: the rendered-error axis — three unseen renders, the measured name set, the non-throwing renderer, the corrected disclosure** — `897598e` (fix)
3. **Task 3: the pattern gate — the module-local premise closed with option (a)** — `e129f10` (feat)

---

## EVIDENCE — pasted terminal output, not prose

### 1. Baseline, before any change

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  995 passed (995)

$ git status --porcelain packages/
(clean)
```

### 2. WR-19 / beacon / dynamic-code — BEFORE and AFTER, `auditSource` results

Probe run against the real exported `auditSource`, all shapes as inline fixtures.

**BEFORE (round-2 gate):**

```
sdk["req"+"uests"].send(req)                             => []
(globalThis as any)["fet"+"ch"](u)                       => []
globalThis["fet"+"ch"](u)                                => []
two-hop const a="requests"; const b=a; sdk[b].send(req)  => []
navigator.sendBeacon(u,d)                                => []
globalThis.navigator.sendBeacon(u,d)                     => []
const s = navigator.sendBeacon                           => []
local obj sendBeacon                                     => []
eval(...)                                                => []
globalThis.eval(...)                                     => []
new Function(...)                                        => []
globalThis.Function(...)                                 => []
local obj eval                                           => []
```

**AFTER:**

```
sdk["req"+"uests"].send(req)                             => ["outbound-unanalysable"]
(globalThis as any)["fet"+"ch"](u)                       => ["outbound-unanalysable"]
globalThis["fet"+"ch"](u)                                => ["outbound-unanalysable"]
two-hop const a="requests"; const b=a; sdk[b].send(req)  => []            <- DISCLOSED RESIDUAL
navigator.sendBeacon(u,d)                                => ["outbound-beacon"]
globalThis.navigator.sendBeacon(u,d)                     => ["outbound-beacon"]
const s = navigator.sendBeacon                           => ["outbound-beacon"]
const { sendBeacon } = navigator                         => ["outbound-beacon"]
const n = navigator; n.sendBeacon                        => ["outbound-beacon"]
local obj sendBeacon                                     => []            <- must stay quiet
eval(...)                                                => ["outbound-dynamic-code"]
globalThis.eval(...)                                     => ["outbound-dynamic-code"]
new Function(...)                                        => ["outbound-dynamic-code"]
globalThis.Function(...)                                 => ["outbound-dynamic-code"]
local obj eval                                           => []            <- must stay quiet
const r = sdk['re'+'quests']; r.send(q)                  => ["outbound-unanalysable"]
at()-style path walk (compat.ts's real shape)            => []            <- must stay quiet
x[i + 1]                                                 => []            <- must stay quiet
```

### 3. THE TWO-HOP SHAPE, and what happened to boundary 2

The two-hop residual reports `[]`. That is asserted in the suite as a measured fact
(`the TWO-HOP shape is still the DISCLOSED residual, and this asserts what it ACTUALLY reports`),
alongside the one-hop version which IS caught (`outbound-send`) — so the residual is a bound
rather than a hole.

**Boundary 2 was REWRITTEN, not confirmed.** It no longer matched the walk's reach after the
widening, in both directions: it did not describe the receiver-level report or the two new
surfaces, and its single-sentence residual no longer covered the case the measurement forced
open. The residual is now stated in three parts — (a) function boundary / more than one hop,
(b) a merely DYNAMIC key, (c) `navigator` beyond one hop — each with the reason it is a bound.

### 4. THE MEASUREMENT THAT SET WR-19's BOUND

The first implementation reported EVERY key that would not reduce to a literal — the literal
reading of the plan's truth statement. Run over the real tree it went RED twice:

```
FAIL packages/backend/src/store/observations.ts reaches no outbound surface
  + "outbound-unanalysable: ... a reference to `split` on a receiver selected by
     a key this walk cannot read ..."          <- segments[i].split(";")

FAIL packages/backend/src/compat.ts reaches no outbound surface
  + "outbound-unanalysable: ... a computed member on a receiver this walk cannot
     read either ..."                          <- at(): cur = (cur as Record<string, unknown>)[key]
```

`compat.ts`'s `at()` is a documented dotted-path walk and `segments[i]` is array indexing. A
gate that calls either an outbound network surface gets deleted rather than fixed, and it tells
the reader nothing true. So the rule was narrowed to an ASSEMBLED key — a `+` concatenation, an
interpolating template, or a call — with a provable-numeric exemption in front of it (`+` counts
as numeric only when BOTH operands are). Both real shapes are now inline must-stay-quiet
fixtures, so the bound is documented by the evidence that set it.

### 5. MUTATION PROOFS — task 1, one per widening

**5a. Receiver third state reverted** (`return isAssembledKey(...) ? UNREADABLE_RECEIVER : undefined` → `return undefined`):

```
FAIL outbound-prohibition.spec.ts > a receiver the walk cannot read is REPORTED, not dropped
     > outbound-unanalysable fires on an ASSEMBLED receiver key
AssertionError: sdk["req" + "uests"].send(req) still reports clean: expected [] to include 'outbound-unanalysable'
     ... plus 3 more (one-hop binding, destructure, poisoned numeric name)
      Tests  4 failed | 131 passed (135)
```
Restored → `Tests 135 passed (135)`.

**5b. The identified-global computed-member branch disabled:**

```
FAIL outbound-prohibition.spec.ts > a receiver the walk cannot read is REPORTED, not dropped
     > outbound-unanalysable fires on an assembled MEMBER of an identified global receiver
AssertionError: globalThis["fet" + "ch"](url) still reports clean: expected [] to include 'outbound-unanalysable'
      Tests  1 failed | 134 passed (135)
```
Restored → `Tests 135 passed (135)`.

**5c. The beacon rule disabled** (`BEACON_METHOD` set to an unreachable token):

```
FAIL > the beacon surface — receiver-anchored, not member-name-only > outbound-beacon fires on the bare call
FAIL > ... on the call through a global receiver
FAIL > ... on the window spelling
FAIL > ... on a bare member REFERENCE with no call
FAIL > ... on a one-hop alias of navigator
FAIL > ... on a destructured sendBeacon
AssertionError: expected [] to include 'outbound-beacon'
      Tests  6 failed | 129 passed (135)
```
Restored → green.

**5d. The dynamic-code rule disabled** (`DYNAMIC_CODE` emptied):

```
FAIL > dynamic code construction — refused rather than analysed > outbound-dynamic-code fires on the bare eval call
FAIL > ... on eval through a global receiver
FAIL > ... on window.eval
FAIL > ... on new Function
FAIL > ... on a bare Function call
FAIL > ... on Function through a global receiver
AssertionError: expected [] to include 'outbound-dynamic-code'
      Tests  6 failed | 129 passed (135)
```
Restored → `Tests 135 passed (135)`.

### 6. THE REAL-TREE ZERO RUNS, with per-root file counts

**CORE-11 gate, after the widening:**

```
ROOT packages/backend/src: files=14 violations=0
ROOT packages/engine/src:  files=9  violations=0
```

The by-name non-vacuity list, the per-root contribution assertion and the conditional per-root
descent assertion are all unchanged — nothing was reduced. Four must-stay-quiet shapes were
ADDED to the table (ordinary object defining `sendBeacon`, ordinary object defining `eval`,
`compat.ts`'s dotted-path walk, array indexing through a name).

**Pattern gate, before the header was edited:**

```
  observations.ts:294 .split( string-literal )
  observations.ts:296 .split( string-literal )
  observations.ts:349 .split( string-literal )
  observations.ts:394 .split( string-literal )
REALTREE packages/backend/src/store/observations.ts: bytes=24774 argument-method-calls=4 smuggled-pattern-hits=0
  telemetry.ts:269 .replace( regex-literal )
REALTREE packages/backend/src/telemetry.ts: bytes=25538 argument-method-calls=1 smuggled-pattern-hits=0
```

All four `observations.ts` `.split` calls take string literals; the single `telemetry.ts`
`.replace` takes the one permitted REGEX LITERAL. Zero `smuggled-pattern` hits over both files.

### 7. WR-17 — BEFORE and AFTER, the review's exact source strings

**BEFORE:**

```
WR17 += accumulate   => []
WR17 .concat render  => []
WR17 push-then-join  => []
```

**AFTER:**

```
WR17 += accumulate   => ["unredacted-concat"]
WR17 .concat render  => ["unredacted-concat"]
WR17 push-then-join  => ["unredacted-object-value","unredacted-string-call"]
```

The safe spelling of all three (`describeError(e)` in place of `e.message`) is asserted quiet in
the same block, so the rules ban the leak rather than the idiom.

### 8. MUTATION PROOFS — task 2

**8a. `PlusEqualsToken` removed from the concatenation rule:**

```
FAIL error-redaction.spec.ts > the gate's own failure paths
     > flags a += accumulate of the caught binding — unredacted-concat (WR-17)
AssertionError: expected [] to include 'unredacted-concat'
      Tests  1 failed | 66 passed (67)
```

**8b. The `.concat` branch disabled:**

```
FAIL > flags a .concat() render of the caught binding — unredacted-concat (WR-17)
AssertionError: expected [] to include 'unredacted-concat'
      Tests  1 failed | 66 passed (67)
```

**8c. The push-then-join name growth disabled:**

```
FAIL > flags PUSH-then-JOIN of the caught binding — unredacted-string-call (WR-17)
AssertionError: expected [] to include 'unredacted-string-call'
      Tests  1 failed | 66 passed (67)
```

Restored → `Tests 67 passed (67)`.

**8d. `describeError` hardening reverted** (the `String(e)` wrap removed):

```
FAIL telemetry.spec.ts > returns the fallback for a NULL-PROTOTYPE object instead of throwing
AssertionError: expected [Function] to not throw an error but
                'TypeError: Cannot convert object to primitive value' was thrown
FAIL > returns the fallback for a THROWING toString instead of propagating
AssertionError: expected [Function] to not throw an error but 'Error: boom' was thrown
FAIL > survives a PROXY whose constructor read raises
      Tests  4 failed | 49 passed (53)
```

Restored → `Tests 53 passed (53)`. Both spec files verified byte-identical to their
pre-mutation state before committing.

### 9. THE THREE HOSTILE VALUES, before the hardening

```
HOSTILE null-prototype    => THREW TypeError: Cannot convert object to primitive value
HOSTILE throwing toString => THREW Error: boom
HOSTILE proxy constructor => THREW Error: nope
```

All three now return the shared fallback (`unrenderable error`) rather than propagating, out of
a function six store call sites invoke WITHOUT a wrapper.

### 10. WR-18 — the two `describeError` outputs that corrected the disclosure

```
SCHEME-RELATIVE => Error: failed to load <path-redacted>
SCHEMELESS      => Error: failed to load cdn.victim.example/app.js?token=SECRET
BARE-SR         => <path-redacted>
BARE-SL         => cdn.victim.example/app.js?token=SECRET
```

The shape the `analyses.error` allowlist entry NAMED as surviving (`//cdn/app.js?token=T`,
scheme-relative) is CLOSED — it begins with a separator and contains three, so `redactPathToken`
consumes it whole. The shape that SURVIVES with its query intact is the SCHEMELESS
`cdn.victim.example/app.js?token=T`, which appeared in neither disclosure. The entry was
rewritten from these outputs, states explicitly that the scheme-relative form does NOT survive
so the correction cannot be read as a rewording, and the same residual is now recorded beside
`redactPaths` in `telemetry.ts` — where the residual count moved from TWO to THREE, and the
direction of that move is noted in the block.

### 11. `ERROR_BINDING_NAMES` — the real-tree run and the per-name decision

```
STORE FILES: 7 -> analyses.ts, artifacts.ts, db.ts, migrations.ts, observations.ts, retention.ts, settings.ts
(no PARAM lines)
(no DESTRUCTURED-PARAM lines)
PROBE DONE
```

| Name added | Real-tree hits | Decision |
|---|---|---|
| `reason` | 0 | KEPT |
| `detail` | 0 | KEPT |
| `failure` | 0 | KEPT |
| `message` | 0 | KEPT |

No parameter and no destructured parameter under any of the four names exists in any of the
seven store modules, so none had to be dropped as a false positive and the whole store gate
still reports zero. The coverage bound that REMAINS is stated by name in the constant's comment:
a parameter called anything else (`problem`, `why`, `info`) is not scanned — the set is a NAME
heuristic, not a type analysis.

The defect it closes, asserted as an executed pair: a body returning
`{ ok: false, error: String(reason) }` reported NOTHING while the identical body with the
parameter named `e` reported `unredacted-persisted-error`. The rule's reach was a spelling.

### 12. WHICH PATTERN-GATE OPTION WAS TAKEN, AND WHY

**Option (a) — the rule.** Not option (b). Rule 4 flags a call to `replace`, `replaceAll` or
`split` whose FIRST argument is not a string literal.

The premise that made option (a) look impossible was real and was handled without a file-name
skip: `telemetry.ts:269` calls `.replace` with a REGEX LITERAL as its first argument, so the
naive rule fires on the one call the exemption exists to permit. The mechanism: **rule 4 passes
a regex-literal argument through WITHOUT A VERDICT**, because rule 1 already counts every regex
literal in the module and judges it under the count-plus-anchor exemption. The call is therefore
covered *by its literal being covered* — same file, same anchor declaration, same count. No
file-name comparison and no line-number special case was added; verified against the diff.

### 13. MUTATION PROOFS — task 3

**13a. Rule 4 reverted:**

```
FAIL observations.spec.ts > a pattern that ARRIVES defeats none of the banned constructs (WR-20)
     > an IMPORTED pattern used in .replace is flagged
FAIL > a RegExp arriving as a PARAMETER and used in .split is flagged
FAIL > a pattern read off an OBJECT PROPERTY is flagged
FAIL > a module-level const INITIALISED FROM AN IMPORT is flagged at the call
FAIL > an INTERPOLATING template argument is flagged; a no-substitution one is not
AssertionError: expected [] to include 'smuggled-pattern'
      Tests  5 failed | 177 passed (182)
```

With the rule live, the imported-pattern shape reports:

```
IMPORTED-PATTERN :: smuggled-pattern :: fixture.ts:3 calls .replace() with a first argument this
gate cannot read as a string literal. A pattern that ARRIVES — imported, passed in, or read off
an object — needs none of the constructs rules 1 and 2 ban...
```

**13b. EXEMPTION INTEGRITY — the file-name skip the header forbids, planted as a mutation:**

```
(mutation: `if (base === "telemetry.ts") return findings;`)
FAIL > the exemption is a COUNT — a SECOND literal in telemetry.ts fails
FAIL > the exemption is an ANCHOR — the SAME single literal outside `redactUrls` fails
FAIL > EXEMPTION INTEGRITY under the widened rule — a SECOND literal still fails
FAIL > EXEMPTION INTEGRITY under the widened rule — the literal MOVED OUT of redactUrls still fails
      Tests  4 failed | 178 passed (182)
```

Restored → `Tests 182 passed (182)`.

**13c. The two exemption-integrity mutations, executed against scratch sources with the new rule live:**

```
SECOND-LITERAL :: exemption-exceeded :: telemetry.ts holds 2 regex literals; the exemption permits
   exactly 1, inside `redactUrls`, bounded by telemetry.spec.ts's measured-linearity case. Lines: 2, 5.
SECOND-LITERAL :: exemption-anchor   :: telemetry.ts:5 holds a regex literal inside `redactPaths`,
   but the exemption is anchored to `redactUrls`.
MOVED-LITERAL  :: exemption-anchor   :: telemetry.ts:5 holds a regex literal inside `redactPaths`,
   but the exemption is anchored to `redactUrls`.
```

Both RED. Plus a third: the identical permitted call placed in `observations.ts` reports
`regex-literal`, which is what proves the exemption does not travel by file name.

`PATTERN_EXEMPTIONS` still expresses a COUNT and an ANCHOR:

```ts
const PATTERN_EXEMPTIONS: ReadonlyMap<
  string,
  { readonly literals: number; readonly anchor: string }
> = new Map([["telemetry.ts", { literals: 1, anchor: "redactUrls" }]]);
```

Diff grep for `base === "` / `file === "` / `skipList` over the added lines:
`NO FILE-NAME SKIP INTRODUCED`.

### 14. THE MUST-STAY-QUIET SET, asserted against the REAL files

- `observations.ts`'s four literal `.split` calls (`"/"`, `";"`, `"&"`, `"#"`) — quiet, with a
  non-vacuity guard that fails if any of the four literals leaves the file.
- `telemetry.ts`'s permitted `.replace(/…/gi, …)` — quiet, through the exemption.
- The documentation fixture (comments naming `.replace(`, `.split(`, `RegExp`, `matchAll`) —
  still reports zero.
- CORE-11's three pre-existing quiet shapes — `sdk.requests.get`, `globalThis.performance.now()`,
  `cache.fetch` — all still asserted and all still pass.

### 15. THE BUNDLE, AND THE FINAL GAUNTLET

```
$ pnpm build:backend
[*] Plugin package built successfully

$ pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto

$ pnpm test
 Test Files  31 passed (31)
      Tests  1042 passed (1042)

$ pnpm typecheck   -> exit 0
$ pnpm lint        -> exit 0
$ pnpm knip        -> exit 0
```

Test count moved 995 → 1042 (+47). Both floors in the plan's verification (≥31 files, ≥931
tests) are met with headroom.

### 16. ISOLATION ASSERTIONS

```
$ git diff --exit-code packages/backend/src/store/observations.ts   -> clean (01-15 owns it; this plan only READ it)
$ git diff --exit-code scripts/ tests/                              -> clean (01-17 owns them)
$ git diff --exit-code 01-01…01-15-PLAN.md, 01-VERIFICATION.md,
                       01-REVIEW.md, 01-UAT.md                      -> clean
$ git diff .planning/REQUIREMENTS.md | grep -o 'CORE-1[0-9]' | sort -u
CORE-11                                                             -> one id touched, one line changed
```

---

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — third receiver state, the identified-global computed-member branch, `outbound-beacon`, `outbound-dynamic-code`, the provable-numeric key exemption, boundary 2 rewritten, 25 new cases
- `packages/backend/src/store/error-redaction.spec.ts` — `+=` accepted, `.concat` branch, push-then-join name growth, `ERROR_BINDING_NAMES` widened by measurement, posix path handling end to end, render-form enumeration extended, 5 new cases
- `packages/backend/src/store/observations.spec.ts` — `PATTERN_ARGUMENT_METHODS` and rule 4, eleven new cases (four adversarial arrival shapes, template pair, real-file quiet set, three exemption-integrity proofs, documentation fixture), header rewritten
- `packages/backend/src/store/schema.spec.ts` — the `analyses.error` disclosure rewritten from executed output
- `packages/backend/src/telemetry.ts` — `describeError` cannot throw, `UNRENDERABLE_ERROR` shared with `recordError`, the schemeless residual recorded beside `redactPaths` (two → three)
- `packages/backend/src/telemetry.spec.ts` — both WR-18 directions and the four IN-17 cases
- `.planning/phases/01-skeleton-persistence-compatibility/COVERAGE.md` — rows 9 and 27 describe the reach that exists; disposition column unchanged
- `.planning/REQUIREMENTS.md` — CORE-11's text names the two new surfaces; the stale PARTIAL parenthetical carries a dated correction

## Decisions Made

1. **WR-19's bound is ASSEMBLED-KEY, set by measurement.** The literal reading of the plan's
   truth ("every key that will not reduce is reported") went red twice on shipped source. The
   walk now reports what it can see being HIDDEN — a concatenation, an interpolating template, a
   call — and discloses what it merely cannot FOLLOW. Both real false positives became inline
   must-stay-quiet fixtures so the bound is documented by the evidence that set it.
2. **An unreadable receiver bound to a name is REMEMBERED, not reported at the binding.** The
   report lands where the name is used as a receiver, so `const r = sdk["re"+"quests"]; r.send(q)`
   fails at `r.send` while an ordinary dictionary read that is never a receiver stays quiet.
3. **The two-hop shape stays the disclosed residual.** A bare identifier key is indirection, not
   concealment. Its current report (`[]`) is asserted, and the one-hop version being caught is
   asserted beside it.
4. **`+` is numeric only when both operands are.** That single distinction is what separates
   `x[i + 1]` (an index) from `sdk["req" + "uests"]` (an assembled name), and it is why `+` is
   absent from `NUMERIC_BINARY_OPERATORS` but present as a recursive case.
5. **All four `ERROR_BINDING_NAMES` candidates kept**, because the real-tree run produced zero
   hits — decided by the measurement, with the remaining bound written down rather than implied.
6. **Pattern gate option (a).** A regex-literal first argument falls through rule 4 without a
   verdict, so the exemption covers the call by covering its literal. Option (b) was never
   needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] The literal reading of WR-19 broke the real tree; the rule was narrowed by measurement**

- **Found during:** Task 1
- **Issue:** Implemented as stated — "an element access whose key will not reduce to a literal is
  REPORTED" — the receiver rule fired on two shipped modules: `compat.ts`'s documented
  dotted-path walk (`cur = (cur as Record<string, unknown>)[key]`, and `ctx[root]`) and
  `store/observations.ts`'s `segments[i].split(";")`. The plan's own acceptance criterion
  requires ZERO over the real tree, and the plan's own file states that a gate breaking ordinary
  code "would be reverted within the hour".
- **Fix:** Narrowed to an ASSEMBLED key — a `+` concatenation, an interpolating template, or a
  call — with a provable-numeric exemption in front of it. Both required shapes
  (`sdk["req"+"uests"]`, `globalThis["fet"+"ch"]`) still fire; both real shapes are quiet and are
  now inline fixtures. The narrowing is consistent with the plan's other instruction to keep the
  two-hop shape as the disclosed residual, which the broad rule would have closed.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** Real-tree run 14 + 9 files, zero violations; four must-stay-quiet fixtures;
  mutation proof 5a.
- **Committed in:** `0ec1e02`

**2. [Rule 2 — Missing Critical] The beacon rule was extended to a one-hop alias and a destructure**

- **Found during:** Task 1
- **Issue:** The plan permitted disclosing a one-hop `navigator` alias as a residual. Leaving it
  open would have been the only surface in this gate where a one-hop binding was NOT followed,
  while `fetchAliases` and `receiverAliases` both follow one hop.
- **Fix:** Added `navigatorAliases`, mirroring `fetchAliases` exactly, plus a destructure branch.
  Both are executed fixtures. The residual disclosed in boundary 2 is now "more than one hop, or
  a helper's return value" — the same bound the rest of the gate has.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** Two extra cases in the beacon block; mutation proof 5c fails all six.
- **Committed in:** `0ec1e02`

**3. [Rule 2 — Missing Critical] `recordError`'s fallback literal was moved into a shared constant**

- **Found during:** Task 2
- **Issue:** The plan required `describeError` to "fall back to the same fixed string
  `recordError` already uses, so there is one fallback string and not two". That string was a
  bare literal inside `recordError`.
- **Fix:** Extracted `UNRENDERABLE_ERROR`, referenced from both, and asserted from the outside
  through `slimStatus().lastError` so drift would show at the boundary the operator reads.
- **Files modified:** `packages/backend/src/telemetry.ts`, `packages/backend/src/telemetry.spec.ts`
- **Verification:** `the fallback is the SAME literal recordError uses, so the operator sees one word`
- **Committed in:** `897598e`

**4. [Rule 3 — Blocking] Prettier formatting on generated blocks**

- **Found during:** Tasks 1 and 3
- **Issue:** `pnpm lint` reported 7 then 3 `prettier/prettier` errors on the newly written
  blocks (quote style, line wrapping).
- **Fix:** `pnpm exec eslint <file> --fix`; re-ran the full suite after each.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`, `packages/backend/src/store/observations.spec.ts`
- **Verification:** `pnpm lint` exit 0.
- **Committed in:** `0ec1e02`, `e129f10`

---

**Total deviations:** 4 auto-fixed (1 bug, 2 missing critical, 1 blocking)
**Impact on plan:** Deviation 1 is the substantive one and it made the plan's own acceptance
criterion satisfiable — the plan asked for both "every non-reducing key is reported" and "the
real tree reports zero", and those two are not simultaneously true on this codebase. The
narrowing was decided by the measurement the plan itself demanded be run first, the evidence is
pasted above, and the false positives that set the bound are now fixtures. No scope creep.

## Issues Encountered

- **The plan's WR-19 truth statement and its real-tree acceptance criterion conflict on this
  codebase.** Resolved as deviation 1 above, in favour of the executable criterion, with the
  conflict and its evidence recorded here and in the gate's own boundary 2 rather than being
  silently resolved.
- **`cp` is aliased to `cp -i` in this shell**, which blocked one mutation-proof restore behind
  an interactive prompt until the run timed out. The file was verified against its backup and
  restored with `command cp -f`; every subsequent restore used the same form and was verified by
  `diff -q` plus a green re-run. No mutated state reached a commit — checked with `diff -q`
  against the pre-mutation backups before staging.

## Known Stubs

None. Every rule added in this plan has its failing path executed against an inline fixture, and
every widening has a mutation proof.

## Threat Flags

None. This plan added no network surface, no schema change, no new file access pattern and no
dependency; it narrowed what the existing gates permit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The tree is quiet and the suite is green (31 files / 1042 tests), which is the precondition
  01-17 needs for the live tier.
- `packages/backend/src/store/observations.ts` is untouched, as are `scripts/` and `tests/`.
- Three residuals are newly written down and are now the honest state of these gates, each
  pinned by an assertion so closing one is a deliberate act: the CORE-11 walk's merely-dynamic
  key, the schemeless host reference in `describeError`, and rule 4's inability to tell whether
  a non-literal argument is actually a pattern.
- The STORE-03 / STORE-07 ledger collisions are NOT fixed by this plan and remain a recorded
  deferral with an owner (the operator, at the next requirements pass).

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-22*

## Self-Check: PASSED

All eight modified files and the SUMMARY exist on disk. All four commits
(`0ec1e02`, `897598e`, `e129f10`, `73bcddc`) are present in `git log --all`.
