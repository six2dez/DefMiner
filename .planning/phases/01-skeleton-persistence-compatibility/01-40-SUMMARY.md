---
phase: 01-skeleton-persistence-compatibility
plan: 40
subsystem: testing
tags: [outbound-gate, exemption-anchoring, sentinel, counter-probe, vitest, CR-21, WR-51]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "wave 39's strictly-above anchor scan with WR-53's continue-fallback, the anchor uniqueness census, the own-header array pair in the cross-construct fixture, and the 29-entry HEADER_QUANTIFIER_EXEMPTIONS map"
provides:
  - "`nameableRemainder` that strips `NO_PRECEDING_CONSTRUCT` BY REFERENCE before counting letters, so a sentinel-bearing anchor reduces to the empty string and the null-anchor case rejects it"
  - "a named case asserting no occurrence on the scanned surface resolves to the sentinel, with non-vacuity above the rule"
  - "a sentinel docblock describing the ONE return that exists, recording that WR-53 removed the second, and claiming only the observability the two new readers provide — with the reach inside the claiming clause"
  - "the cross-construct counter-probe pinned to the LIVE builder's line half over BOTH array pairs, through the fixture's own `lineHalf` helper"
  - "a `preAnchoringExemptionKeyForFixtureOnly` docblock whose structural claim names the assertion that holds it"
  - "four planted mutations, each watched going RED where three of them were green at 434 of 434"
affects: [01-41, phase-01 verification pass 10]

actuals:
  tokens: 3042
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a guard green on arrival is planted against before it is trusted — and when a mutation's RED is masked by an earlier assertion, a SECOND isolating mutation is run so the masked pin prints its own message"
    - "a shared helper's blast radius measured across all 29 keys before and after, rather than reasoned about, because the helper is consulted by the anchor builder as well as by the check"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts

key-decisions:
  - "The sentinel exclusion is written as `.split(NO_PRECEDING_CONSTRUCT).join(\"\")` — by reference, with zero added lines carrying the literal — and the constant's declaration moved ABOVE `nameableRemainder` so the reference is not a temporal-dead-zone read."
  - "The docblock describes ONE return, not two, because WR-53's extension deleted the second — and it SAYS that the second was deleted, which is the honest form of the correction pass 9 asked for."
  - "WR-51's prescribed snippet was implemented in substance and CORRECTED in form: `lineHalf(key)` already carries the `:: qN` suffix, so the reviewer's `${lineHalf(beforeKey)} :: q${index}` would double it. Measured false; the pin is `toBe(lineHalf(live))`."
  - "A FOURTH mutation was run because the verifier's constant-body substitution fails at pair ONE's pin, masking pair TWO's message. An isolating variant leaves pair one intact so the own-header pin prints its own assertion."
  - "A THIRD sentinel mutation was run because neither of the verifier's two steps produces the sentinel any more under WR-53's continue-fallback. A bare docblock sited where the backward scan is genuinely exhausted does, and that is what watched the new surface case failing."

patterns-established:
  - "Pattern: when an inherited mutation stops reproducing its own precondition because an intervening wave changed the mechanism, run it anyway, record what it now does, and add the mutation that DOES reach the shape — never adjust either to force a red."

requirements-completed: []

coverage:
  - id: D1
    description: "A sentinel-bearing anchor reduces to nothing, so the case added in the same commit to forbid the empty-anchor shape finally rejects it"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#no exemption key's ANCHOR reduces to nothing — a fully-masked anchor names no construct and no line"
        status: pass
      - kind: other
        ref: "planted mutation STEP 1 (verifier's pass-9 step 1, green at 434/434) — observed RED"
        status: pass
    human_judgment: false
  - id: D2
    description: "No occurrence on the scanned surface resolves to the sentinel, asserted with non-vacuity above the rule"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#no occurrence on the SCANNED SURFACE resolves to NO_PRECEDING_CONSTRUCT — a sentinel anchor names no construct and no line"
        status: pass
      - kind: other
        ref: "planted mutation 1b (sentinel-producing occurrence at the top of the file) — observed RED with this case's own message"
        status: pass
    human_judgment: false
  - id: D3
    description: "The counter-probe is pinned to the live builder's line half over both array pairs, so a constant function fails it"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#a CROSS-CONSTRUCT relocation yields a DIFFERENT anchored key and was INVISIBLE to the pre-anchoring one — the SAME-construct case is not covered here"
        status: pass
      - kind: other
        ref: "planted mutation 3 (`return \"CONSTANT\";`, green at 434/434) and mutation 4 (isolating variant) — both observed RED"
        status: pass
    human_judgment: false
  - id: D4
    description: "The sentinel docblock and the pre-anchoring helper's docblock state only what executes, with the observability claim's reach inside the claiming clause"
    verification: []
    human_judgment: true
    rationale: "Whether a corrected disclosure overclaims is exactly the judgment nine consecutive verification passes have had to make by reading. No assertion can decide it. Verification pass 10 must read the two quoted docblocks below against the measurements pasted beside them, and in particular must decide whether the observability sentence's `on the scanned surface` / `keys PRESENT IN HEADER_QUANTIFIER_EXEMPTIONS` bound is carried INSIDE the claiming clause."
  - id: D5
    description: "CORE-11's must-NOT did not move and nothing leaks — test-only change, bundle at one specifier, 23 shipped modules at zero violations"
    requirement: "CORE-11"
    verification:
      - kind: integration
        ref: "pnpm test — 31 files / 1378 tests, exit 0"
        status: pass
      - kind: other
        ref: "pnpm build:backend && pnpm check:bundle — 1 import specifier, crypto"
        status: pass
      - kind: other
        ref: "git diff --name-only -- packages/ scripts/ filtered of .spec.ts — EMPTY"
        status: pass
    human_judgment: false

duration: 19 min
completed: 2026-08-26
status: complete
---

# Phase 01 Plan 40: The sentinel excluded, observed, and the counter-probe pinned Summary

**`nameableRemainder` now strips `NO_PRECEDING_CONSTRUCT` by reference before counting letters, so the sentinel-bearing anchor that scored twenty and walked through the case written to forbid it scores zero; a new named case reads the value nothing had ever read, taking `grep -c` from 3 to 9; and the counter-probe any constant function satisfied is pinned to the live builder's line half over both array pairs — with four mutations watched going RED where three had been green at 434 of 434.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-08-26T14:05:00Z
- **Completed:** 2026-08-26T14:24:00Z
- **Tasks:** 2
- **Files modified:** 1

## Task Commits

1. **Task 1: CR-21 — the sentinel excluded by reference, observed, docblock corrected** — `28b5547` (test)
2. **Task 2: WR-51 — the counter-probe pinned to the live builder's line half** — `294d646` (test)

---

## THE FOUR ONE-SENTENCE STATEMENTS THIS PLAN'S OUTPUT BLOCK REQUIRES

**1. All three additions were green on arrival and every one of them was watched failing anyway** — the `nameableRemainder` exclusion was watched failing by the verifier's pass-9 STEP 1 (a bare docblock plus the matching sentinel-anchored entry, **434 of 434 green** before this plan) and again by its STEP 2 (the same occurrence relocated 1,785 lines with the entry unchanged, **434 of 434 green** before this plan); the surface-wide case was watched failing by a third mutation this session added, because neither of the verifier's two steps still produces the sentinel under wave 39's continue-fallback; and the counter-probe pin was watched failing by the verifier's constant-body substitution (**434 of 434 green** before this plan) plus a fourth isolating variant, because the constant fails at pair one's pin and masks pair two's message.

**2. The `nameableRemainder` change moved NONE of the 29 keys** — all 29 regenerated before and after and compared positionally, `keys that MOVED: 0`, `declared == produced? true` on both sides, so no movement had to be written up as a finding.

**3. Closing the sentinel does NOT close the empty-anchor class** — a key WRITTEN BY HAND whose anchor names something but names no site can still be constructed and is reached by neither new check; two occurrences under the SAME construct remain interchangeable behind a positional `#N` ordinal assigned by scan order; the guard is still a phrase list over bytes under one named normalization; and both classes of unreached surface stand — the files the walk does not open, and the spellings `UNBOUNDED_QUANTIFIERS` does not declare. **CR-21 plus CR-20 do not discharge criterion (3);** one laundering route is removed and one unobserved value is observed.

**4. CORE-11's box was not moved in either direction** — it reads `- [ ] **CORE-11**`, `git diff --exit-code -- .planning/REQUIREMENTS.md` is clean, `requirements mark-complete` appears in no command run this session, and no file under `.planning/` was opened by this plan's work (see deviation 1 for the orchestrator-owned STATE.md / ROADMAP.md close-out writes and the pre-existing arrival dirt).

---

## Task 1 precondition, pasted before the first edit

```
$ git rev-parse HEAD
3e59998b8f5c95b5e01a98a3929e189c5fa4509c

$ git status --porcelain packages/ scripts/
(empty)

$ git status --porcelain .planning/
 M .planning/config.json
?? .planning/milestone.lock
?? .planning/phases/00-runtime-reality-check/00-VERIFICATION.md
?? .planning/phases/00-runtime-reality-check/results/runs/recorder-20260820T180307Z/
?? .planning/phases/01-skeleton-persistence-compatibility/results/runs/20260821T075936Z-12874/
        ^ ALL FIVE PRE-EXISTING AT ARRIVAL. Snapshotted and asserted
          byte-identical at every boundary — see deviation 1.

$ pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts | tail
      Tests  437 passed (437)
GATE-EXIT=0

$ pnpm test | tail
 Test Files  31 passed (31)
      Tests  1377 passed (1377)
TEST-EXIT=0

$ pnpm typecheck  -> tsc --build,        exit 0
$ pnpm lint       -> eslint .,           exit 0
$ pnpm knip       -> knip,               exit 0
$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

Nothing red. Nothing halted.

### Plan 01-39's handoff sentence, quoted and then re-measured rather than trusted

> **2. HANDOFF FACT FOR PLAN 01-40:** the count of occurrences resolving to `NO_PRECEDING_CONSTRUCT` after this plan is **ZERO** — it was zero before change (1), zero after change (1), and zero after the continue-fallback landed, so the fallback did not move it.

Re-measured in this session against the live builder: **zero**. It agrees.

### The arrival capture, recorded where the verify block re-derives it

```
$ grep -n NO_PRECEDING_CONSTRUCT packages/backend/src/outbound-prohibition.spec.ts
9200:const NO_PRECEDING_CONSTRUCT = "!NO-PRECEDING-CONSTRUCT!";
9303: * resolve to `NO_PRECEDING_CONSTRUCT`. That is a measurement of THIS surface,
9360:  return NO_PRECEDING_CONSTRUCT;

$ grep -c NO_PRECEDING_CONSTRUCT packages/backend/src/outbound-prohibition.spec.ts
3

$ cat /tmp/gsd-0140-t1-arrival.txt
3e59998b8f5c95b5e01a98a3929e189c5fa4509c 3

$ git show 3e59998:packages/.../outbound-prohibition.spec.ts | grep -c NO_PRECEDING_CONSTRUCT
3                                    <- re-derived from the tree, agrees with the scratch line
```

**RECONCILIATION AGAINST THE FRONTMATTER ANCHOR OF THREE — the TOTAL agrees and the COMPOSITION does not.** This is finding **F-1** below: the plan's anchor reads "the declaration `:9167` and the two `return` sites `:9251` and `:9253`". The tree at arrival carries **one declaration, one docblock MENTION at `:9303`, and ONE return at `:9360`**. Plan 01-39's WR-53 extension replaced the inner return with a `continue` and added the docblock sentence, so the total held at three by coincidence while one return became a comment. The gate asserts a DIRECTION against the captured arrival and no literal, so it holds either way.

---

## Task 1 — CR-21

### (A) THE ARITHMETIC, BEFORE — built BY REFERENCE to the constant, run against the file as it stood

```
$ node /tmp/gsd-0140/before.mjs
=== (A) THE ARITHMETIC, BEFORE ===
anchor    = "!NO-PRECEDING-CONSTRUCT! §§ {q2}"
remainder = "NOPRECEDINGCONSTRUCT"   len 20
passes toBeGreaterThan(0)?  true
```

The anchor is assembled as `` `${NO_PRECEDING_CONSTRUCT}${EXEMPTION_ANCHOR_SEP}{q2}` `` — both halves read out of the live declarations, neither typed. **Reconciles exactly with verification pass 9's measured 20. No disagreement.**

### (B) THE SENTINEL POPULATION over `SURFACE_LINES`, RE-MEASURED BEFORE THE CHANGE

```
=== (B) THE SENTINEL POPULATION over SURFACE_LINES, BEFORE ===
occurrences scanned : 29
resolving to sentinel: 0
```

Reconciles with plan 01-39's handoff count of ZERO. Nothing to dispose of, nothing rewritten, nothing re-sited, no assertion softened and no occurrence exempted.

### The exclusion, shown by diff to reference the CONSTANT

```diff
+const nameableRemainder = (text: string): string =>
+  text
+    // THE SENTINEL IS THE TOKEN THE BUILDER EMITS WHEN NOTHING WAS NAMED, SO
+    // COUNTING ITS LETTERS AS NAMING SOMETHING IS THE ARITHMETIC THAT LET
+    // CR-17's SHAPE BACK IN (CR-21). Removed BY REFERENCE to the constant and
+    // never by re-spelling it, so renaming the constant cannot silently
+    // un-fix this.
+    .split(NO_PRECEDING_CONSTRUCT)
+    .join("")
+    .replace(/\{q\d+\}/g, "")
+    .replace(/[^A-Za-z0-9]/g, "");
```

The numeric grep the criterion names:

```
$ N=$(git diff -- packages/backend/src/outbound-prohibition.spec.ts \
      | grep -E '^\+' | grep -c 'NO-PRECEDING-CONSTRUCT' || true); echo "$N"
0
$ [ "$N" -le 1 ] && echo "PASS (<=1)"
PASS (<=1)
```

**Zero, not one.** The one hit the criterion permitted was budgeted for the declaration line; the declaration was not re-typed, so it stayed as diff CONTEXT and the added lines carry the literal nowhere at all.

### (A') THE ARITHMETIC, AFTER

```
$ node /tmp/gsd-0140/after.mjs
=== (A) THE ARITHMETIC, AFTER ===
anchor    = "!NO-PRECEDING-CONSTRUCT! §§ {q2}"
remainder = ""   len 0
passes toBeGreaterThan(0)?  false

=== a real anchor that merely CONTAINS resembling letters is unaffected ===
  "const NO_PRECEDING_CONSTRUCT = \"!NO-PRECEDING-CONSTRUCT!\";" -> "constNOPRECEDINGCONSTRUCT" (len 25)
  "The token an occurrence carries when NO preceding construct resolves." -> "ThetokenanoccurrencecarrieswhenNOprecedingconstructresolves" (len 59)
  "no preceding construct" -> "noprecedingconstruct" (len 20)
```

Only the exact constant is removed. Prose that merely resembles it is untouched, which is the `<behavior>` bullet the plan asked for.

### (C) THE 29-KEY BLAST RADIUS — measured, because this helper is consulted by the anchor builder

`nameableRemainder` gates `constructTokenOf`'s skip rule, which `constructAnchorFor`'s forward walk reads, as well as the null-anchor case. **Prediction, recorded AS a prediction before the measurement: nothing moves, because no line's token is the sentinel.**

```
=== (C) THE 29-KEY BLAST RADIUS ===
before count: 29  after count: 29
keys that MOVED: 0
declared == produced? true

=== (B) THE SENTINEL POPULATION, AFTER ===
occurrences scanned : 29
resolving to sentinel: 0
```

Prediction held. No key moved, so nothing had to be written up before proceeding.

### The surface-wide case — title, non-vacuity, and the rule's full message

**Title:** `no occurrence on the SCANNED SURFACE resolves to NO_PRECEDING_CONSTRUCT — a sentinel anchor names no construct and no line`

**Non-vacuity, asserted BEFORE the rule:**

```ts
const occurrences = quantifierOccurrences(gateLines, SURFACE_LINES);
// NON-VACUITY BEFORE THE RULE. An empty occurrence set would make the
// filter below produce nothing and this case pass having resolved not one
// line — the failure mode this whole file is organised against.
expect(
  occurrences.length,
  "the scanned surface carries NO declared-phrasing occurrence at all, so the rule below passed having resolved nothing. Either `SURFACE_LINES` collapsed, the three exclusions grew over the file, or the phrasing scan stopped matching. In all of those this case is a silent success and not a measurement.",
).toBeGreaterThan(0);
```

**The rule's failure message, quoted in full:**

> `${sentinelled.length} occurrence(s) on the scanned surface resolve to ${JSON.stringify(NO_PRECEDING_CONSTRUCT)} — the builder found no construct above them:\n${sentinelled.join("\n")}\nAN ANCHOR THAT IS THE SENTINEL NAMES NO CONSTRUCT AND NO LINE. The exemption written for such an occurrence is discharged by ANY occurrence whose normalized form masks to the same shape, wherever in this file that occurrence sits — which is CR-17 verbatim. Verification pass 9 drove exactly that shape through twice, at 434 of 434 green each time: once with the occurrence and its matching entry planted together, and once with the same occurrence moved roughly 1,800 lines into an unrelated construct and the entry left untouched. YOU HAVE TWO CHOICES. (1) REWRITE the sentence so it says what it is about, which gives the line above it something to name. (2) RE-SITE it under a construct that names something. SOFTENING THIS ASSERTION IS NOT ONE OF THEM, and neither is exempting the occurrence nor special-casing the sentinel here: the sentinel is precisely what the builder emits when nothing was named, so an occurrence that produces it has no site an exemption could be written for.`

It names the offending line (`  line ${o.line}:`), quotes its normalized masked text, states what a sentinel anchor MEANS, directs the author to rewrite or re-site, and says explicitly that softening the assertion is not one of the options.

### The corrected sentinel docblock, quoted verbatim

```
/**
 * The token an occurrence carries when NO preceding construct resolves. NAMED
 * rather than empty on purpose: an empty anchor is the shape this mechanism
 * exists to forbid, and a named token makes a produced empty anchor VISIBLE
 * where an empty string would be silent.
 *
 * WHERE IT IS RETURNED, READ OFF THE CODE AS IT STANDS RATHER THAN OFF AN
 * OLDER DESCRIPTION OF IT. `constructAnchorFor` returns it from ONE site: the
 * fall-through below its backward scan, reached when the scan runs off the top
 * of the file having accepted no line. The SECOND return verification pass 9
 * named — a construct that DID resolve but named nothing strictly above the
 * occurrence — no longer yields this token at all. Wave 39's WR-53 extension
 * made that case CONTINUE the backward scan to the next enclosing construct,
 * so exhausting the scan is now the only route here, and a bare `/**` above an
 * occurrence resolves to the construct ABOVE IT instead of to this value.
 *
 * WHAT OBSERVES IT, AND HOW FAR THAT OBSERVATION REACHES. Two cases read this
 * value, and each reaches less than this file: `no occurrence on the SCANNED
 * SURFACE resolves to NO_PRECEDING_CONSTRUCT` bounds it over the occurrences
 * `quantifierOccurrences` finds across `SURFACE_LINES` on the scanned surface
 * and over nothing wider, and `no exemption key's ANCHOR reduces to nothing`
 * bounds it over the keys PRESENT IN `HEADER_QUANTIFIER_EXEMPTIONS` and over
 * nothing wider. A key written BY HAND and never added to that map is reached
 * by neither, and a line inside one of the three exclusions is reached by
 * neither. Until wave 40 this docblock said the shape `may not be produced
 * silently by the builder itself` while NOTHING read the value — `grep` found
 * the declaration, one docblock mention and the return, and not one `expect`
 * (CR-21, verification pass 9).
 */
const NO_PRECEDING_CONSTRUCT = "!NO-PRECEDING-CONSTRUCT!";
```

**COUNT ONE — both returns described.** The plan's action text says to describe the exhausted-scan return AND the construct-resolved-but-named-nothing return, and says in the same breath to *"read the code as it now stands rather than as this plan describes it"*. The code as it now stands has **ONE** return: wave 39's WR-53 extension turned the second into a `continue`. The docblock therefore describes the return that exists AND states, by name, that the second one pass 9 named no longer yields this token and why — which is the only form of "describe both" that is true of the file. **This is finding F-2.**

**COUNT TWO — the observability claim, and the one-line verdict the criterion demands.**

> **VERDICT: the bound is IN the sentence.** The claiming clause is *"Two cases read this value, and each reaches less than this file"*, and the two bounding phrases — **`on the scanned surface`** and **`the keys PRESENT IN HEADER_QUANTIFIER_EXEMPTIONS`** — sit inside that same sentence, attached to the two named assertions, followed by `and over nothing wider` in each case. The bound is **not** delegated to a following sentence, **not** delegated to the out-of-scope `open`-status prohibition, and **not** delegated to any other passage. The two residual sentences that follow (`A key written BY HAND … is reached by neither`, and the historical note) restate and narrow; they do not carry the bound.

### `grep -c` grew, as a direction and not a target

```
$ grep -n NO_PRECEDING_CONSTRUCT packages/backend/src/outbound-prohibition.spec.ts
9204: * SURFACE resolves to NO_PRECEDING_CONSTRUCT` bounds it over the occurrences
9215:const NO_PRECEDING_CONSTRUCT = "!NO-PRECEDING-CONSTRUCT!";
9230:    .split(NO_PRECEDING_CONSTRUCT)
9336: * resolve to `NO_PRECEDING_CONSTRUCT`. That is a measurement of THIS surface,
9393:  return NO_PRECEDING_CONSTRUCT;
10122:  // found three references to `NO_PRECEDING_CONSTRUCT` — the declaration, one
10140:  it("no occurrence on the SCANNED SURFACE resolves to NO_PRECEDING_CONSTRUCT — a sentinel anchor names no construct and no line", () => {
10151:        (o) => constructAnchorFor(gateLines, o.line) === NO_PRECEDING_CONSTRUCT,
10164:            NO_PRECEDING_CONSTRUCT,

$ grep -c NO_PRECEDING_CONSTRUCT packages/backend/src/outbound-prohibition.spec.ts
9
```

**Arrival 3, final 9, asserted strictly greater by the verify block against the value re-derived from the tree at `3e59998`:** `NPC arrival=3 final=9`. No target number was named anywhere and no arrival literal was typed into any gate.

**A new hit shown to sit INSIDE an `expect`** — `:10164`:

```ts
    expect(
      sentinelled,
      sentinelled.length === 0
        ? ""
        : `${sentinelled.length} occurrence(s) on the scanned surface resolve to ${JSON.stringify(
            NO_PRECEDING_CONSTRUCT,
          )} — the builder found no construct above them:\n…`,
    ).toEqual([]);
```

### The constant still declared, EVERY return site present at arrival still referencing it

```
$ git show 3e59998:packages/.../outbound-prohibition.spec.ts | grep -c 'return NO_PRECEDING_CONSTRUCT'
1                     <- RE-DERIVED, not assumed to be two. Plan 01-39 removed one under WR-53.
$ grep -c 'return NO_PRECEDING_CONSTRUCT' packages/backend/src/outbound-prohibition.spec.ts
1                     <- this task deleted NONE
```

The declaration line appears in the diff only as CONTEXT (0 removed lines carrying the literal, 0 added), so it is byte-unchanged and there is no empty-string substitution anywhere.

---

## THE FOUR MUTATIONS — three of them green at 434 of 434 before this plan, all four RED now

`01-VERIFICATION.md` records the prior results verbatim:

| mutation | pass 9's result | this session |
|---|---|---|
| **CR-21** sentinel occurrence + matching exemption planted | **434 passed (434)** | ✗ **RED, 3 failures** |
| **CR-21** same occurrence relocated ~1,800 lines, exemption unchanged | **434 passed (434)** | ✗ **RED, 3 failures** |
| **WR-51** `preAnchoringExemptionKeyForFixtureOnly` → `() => "CONSTANT"` | **434 passed (434)** | ✗ **RED, 1 failure** |
| (added this session) an occurrence that genuinely PRODUCES the sentinel | not run — the shape did not exist for pass 9 to site | ✗ **RED, 3 failures** |

Every plant was made **after** the owning task's commit. `git log --oneline -1` before the first plant:

```
$ git log --oneline -1
28b5547 test(01-40): CR-21 — the sentinel excluded from nameableRemainder by reference, and observed
```

### STEP 1 — the verifier's step 1, reproduced at the same site

Planted: a bare docblock whose content line normalizes to the phrasing alone (read out of `UNBOUNDED_QUANTIFIERS` at index 2, never typed), immediately above the `&&=` case inside `describe("an outbound receiver, however it was bound")`. Plus the matching entry, its sentinel half **by reference** and its phrasing **by index**:

```ts
HEADER_QUANTIFIER_EXEMPTIONS = Object.freeze({
  ...HEADER_QUANTIFIER_EXEMPTIONS,
  [`${NO_PRECEDING_CONSTRUCT}${EXEMPTION_ANCHOR_SEP}{q2} :: q2`]:
    "PLANTED MUTATION — verification pass 9 step 1.",
});
```

**RESULT: `Tests  3 failed | 435 passed (438)`.** The target case, RED with its FULL message:

> **× no exemption key's ANCHOR reduces to nothing — a fully-masked anchor names no construct and no line**
>
> `AssertionError: exemption key "!NO-PRECEDING-CONSTRUCT! §§ {q2} :: q2" carries an ANCHOR that reduces to NOTHING once its \`{qN}\` tokens, whitespace and punctuation are removed. An anchor made only of mask tokens names no construct and no line, so the entry is discharged by ANY occurrence whose normalized form masks to the same shape — wherever in this file that occurrence sits. That is how a fabricated hand-written bound was planted 9,001 lines from the cell its exemption was written for, with the suite reporting 432 of 432 green (CR-17, verification pass 8). Rebuild the entry with \`exemptionKeyFor\` rather than hand-writing a key; it derives the construct anchor for you. If the occurrence's own line genuinely normalizes to a bare declared phrasing, that is fine — the construct half is what names it — but if BOTH halves mask away, the line is the defect: REWRITE the sentence so it says what it is about, or DELETE it.: expected 0 to be greater than 0`
> `❯ packages/backend/src/outbound-prohibition.spec.ts:10126:9`

The two collateral REDs, recorded rather than omitted: the exemption-discharge case (`line 7103: "it("through receiverAliases' LOGICAL-ASSIGNMENT branch: the \`||=… §§ {q2} :: q2"`) and the census case (`0x !NO-PRECEDING-CONSTRUCT!` — an anchor with a ZERO producer count, the hand-written-key side of CR-20(b)).

**DID THE SURFACE ASSERTION FIRE AS WELL? NO — and that is finding F-3.** The planted occurrence resolved to the `||=` fixture title above it, **not** to the sentinel: wave 39's WR-53 continue-fallback means a bare `/**` no longer returns the sentinel at that site. The verifier's step-1 shape reaches CR-21 through the planted KEY, not through a produced sentinel. Mutation 1b below was added for exactly that reason.

### STEP 2 — the same occurrence relocated, the exemption entry UNCHANGED

```
planted occurrence currently at line 7103
planted occurrence now at line 8888
RELOCATION DISTANCE: 1785 lines
```

Moved into the middle of the `it.each([` parameter table at `:8881` — a completely unrelated construct, about allowlisted `sdk.requests` reads. The entry was not touched:

```
$ grep -n 'NO_PRECEDING_CONSTRUCT}${EXEMPTION_ANCHOR_SEP}' packages/backend/src/outbound-prohibition.spec.ts
9246:  [`${NO_PRECEDING_CONSTRUCT}${EXEMPTION_ANCHOR_SEP}{q2} :: q2`]:
```

**RESULT: `Tests  3 failed | 435 passed (438)`.** The target case, RED with its FULL message:

> **× no exemption key's ANCHOR reduces to nothing — a fully-masked anchor names no construct and no line**
>
> `AssertionError: exemption key "!NO-PRECEDING-CONSTRUCT! §§ {q2} :: q2" carries an ANCHOR that reduces to NOTHING once its \`{qN}\` tokens, whitespace and punctuation are removed. An anchor made only of mask tokens names no construct and no line, so the entry is discharged by ANY occurrence whose normalized form masks to the same shape — wherever in this file that occurrence sits. That is how a fabricated hand-written bound was planted 9,001 lines from the cell its exemption was written for, with the suite reporting 432 of 432 green (CR-17, verification pass 8). Rebuild the entry with \`exemptionKeyFor\` rather than hand-writing a key; it derives the construct anchor for you. If the occurrence's own line genuinely normalizes to a bare declared phrasing, that is fine — the construct half is what names it — but if BOTH halves mask away, the line is the defect: REWRITE the sentence so it says what it is about, or DELETE it.: expected 0 to be greater than 0`
> `❯ packages/backend/src/outbound-prohibition.spec.ts:10126:9`

Collateral, recorded: the discharge case now reports `line 8888: "it.each([ §§ {q2} :: q2"` and the census reports **two** ambiguous anchors — `0x !NO-PRECEDING-CONSTRUCT!` and `9x it.each([` (produced by lines 6985, 7213, 8379, 8440, 8473, 8578, 8587, 8623, 8881). Wave 39's census sees the relocation destination as well.

### MUTATION 1b — the sentinel actually PRODUCED, so the surface case is watched failing

Neither of the verifier's two steps produces the sentinel any more. The one route that survives WR-53's continue-fallback is a backward scan with nowhere left to continue to, so the same bare-docblock shape was sited at the **top of the file**: a `/**` on line 1 that names nothing, its content line the phrasing alone on line 2, and no accepted line above either.

**RESULT: `Tests  3 failed | 435 passed (438)`.** The new case, RED **with its own message**:

> **× no occurrence on the SCANNED SURFACE resolves to NO_PRECEDING_CONSTRUCT — a sentinel anchor names no construct and no line**
>
> `AssertionError: 1 occurrence(s) on the scanned surface resolve to "!NO-PRECEDING-CONSTRUCT!" — the builder found no construct above them:`
> `  line 2: "{q2}"`
> `AN ANCHOR THAT IS THE SENTINEL NAMES NO CONSTRUCT AND NO LINE. The exemption written for such an occurrence is discharged by ANY occurrence whose normalized form masks to the same shape, wherever in this file that occurrence sits — which is CR-17 verbatim. Verification pass 9 drove exactly that shape through twice, at 434 of 434 green each time: once with the occurrence and its matching entry planted together, and once with the same occurrence moved roughly 1,800 lines into an unrelated construct and the entry left untouched. YOU HAVE TWO CHOICES. (1) REWRITE the sentence so it says what it is about, which gives the line above it something to name. (2) RE-SITE it under a construct that names something. SOFTENING THIS ASSERTION IS NOT ONE OF THEM, and neither is exempting the occurrence nor special-casing the sentinel here: the sentinel is precisely what the builder emits when nothing was named, so an occurrence that produces it has no site an exemption could be written for.: expected [ '  line 2: "{q2}"' ] to deeply equal []`
> `❯ packages/backend/src/outbound-prohibition.spec.ts:10169:7`

Note the contrast this pins: the null-anchor case stayed **green** under 1b (no such key is declared) while the surface case fired — the two guards reach different populations, exactly as the corrected docblock says.

### All three restored, tree proved clean

```
$ git checkout -- packages/backend/src/outbound-prohibition.spec.ts
$ git diff --exit-code -- packages/backend/src/outbound-prohibition.spec.ts
TREE-CLEAN after step 1+2 restore
$ git diff --exit-code -- packages/backend/src/outbound-prohibition.spec.ts
TREE-CLEAN after 1b restore
$ pnpm exec vitest run … | tail
      Tests  438 passed (438)
```

No mutation was adjusted to force a red. Every one went red on its first run.

### Whole-file guard, green after the plants were restored

```
$ pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts | tail
      Tests  438 passed (438)
```

No exemption was minted for this wave's own prose: the guard reports zero unexcused occurrences, and `HEADER_QUANTIFIER_EXEMPTIONS` still holds **29** entries.

---

## Task 2 precondition, pasted

```
$ git rev-parse HEAD
28b5547fd9755f587d74b6099fdff1aba1e895d5

$ git status --porcelain packages/ scripts/
(empty)

$ grep -n 'it("no occurrence on the SCANNED SURFACE resolves to NO_PRECEDING_CONSTRUCT' …
10140:  it("no occurrence on the SCANNED SURFACE resolves to NO_PRECEDING_CONSTRUCT — a sentinel anchor names no construct and no line", () => {

$ pnpm exec vitest run … | tail   ->  Tests  438 passed (438)
$ pnpm test | tail                ->  31 files / 1378 tests, TEST-EXIT=0
```

Task 1's case present by title. Nothing red.

## Task 2 — WR-51

### The prescription measured before it was written, and CORRECTED in form

`01-REVIEW.md`'s `### WR-51` gives the fix as:

```ts
).toBe(`${lineHalf(beforeKey)} :: q${UNBOUNDED_QUANTIFIERS.indexOf(phrasing)}`);
```

Run against the live builders before writing anything:

```
$ node /tmp/gsd-0140/wr51.mjs
underDeclaration
  live key      : "const alphaTable = { §§ cell: \"{q2}\", :: q2"
  lineHalf(key) : "cell: \"{q2}\", :: q2"
  pre builder   : "cell: \"{q2}\", :: q2"
  pre === lineHalf(key)? true
  reviewer's literal snippet: "cell: \"{q2}\", :: q2 :: q2"  matches? false
underFixtureTitle
  live key      : "it(\"the beta case\", () => { §§ cell: \"{q2}\", :: q2"
  lineHalf(key) : "cell: \"{q2}\", :: q2"
  pre builder   : "cell: \"{q2}\", :: q2"
  pre === lineHalf(key)? true
  reviewer's literal snippet: "cell: \"{q2}\", :: q2 :: q2"  matches? false
```

**FINDING F-4.** `lineHalf` already carries the `:: qN` suffix, so the snippet's extra `` ` :: q${index}` `` doubles it and the pin as literally written is FALSE. The prescription's **substance** — pin to the live builder's line half, through the fixture's own helper — is implemented exactly; its **form** is `toBe(lineHalf(live))`.

### The pin, shown by diff to use the fixture's own `lineHalf`, over BOTH array pairs

Pair one:

```diff
+    for (const [which, pre, live] of [
+      ["under the declaration", preBefore, beforeKey],
+      ["under the title", preAfter, afterKey],
+    ] as readonly (readonly [string, readonly string[], string])[]) {
+      expect(
+        pre[0],
+        `the pre-anchoring builder (${which}) is no longer \`exemptionKeyFor\` with its construct half removed, so the counter-probe is drawing its contrast against something other than the format CR-17 was measured in. Its output must be byte-identical to the portion of the live key after ${JSON.stringify(EXEMPTION_ANCHOR_SEP)} — that identity IS the docblock's structural claim, and without it any constant function satisfies every assertion below (WR-51, measured at 434 of 434 green).`,
+      ).toBe(lineHalf(live));
+    }
```

Pair two — **the own-header pair plan 01-39 added**, inside the `for (const [shape, before, after] of …)` loop, so the pin runs for the `it(` TITLE shape and for the docblock FIRST CONTENT LINE shape:

```diff
+      for (const [which, pre, live] of [
+        ["before", preB, bKey],
+        ["after", preA, aKey],
+      ] as readonly (readonly [string, readonly string[], string])[]) {
+        expect(
+          pre[0],
+          `the pre-anchoring builder (${which}, ${shape}) is no longer \`exemptionKeyFor\` with its construct half removed, so this pair's counter-probe is contrasting against something other than the format CR-17 was measured in.`,
+        ).toBe(lineHalf(live));
+      }
```

**The pin is asserted over BOTH array pairs, including the own-header pair plan 01-39 added, on both sides of each relocation — four assertions in all.**

**It is an ADDITION.** The five pre-existing counter-probe assertions are untouched:

```
$ git diff -U0 -- packages/backend/src/outbound-prohibition.spec.ts | grep -E '^-' | grep -v '^---' | grep -c .
0                      <- ZERO removed lines in the whole of Task 2
$ git diff -U0 … | grep -E '^@@'
@@ -9436,0 +9437,8 @@ const exemptionKeyFor = (
@@ -10449,0 +10458,20 @@ describe(…
@@ -10561,0 +10590,12 @@ describe(…
```

### The corrected helper docblock, quoted verbatim

```
 * THAT STRUCTURAL SENTENCE IS AN ASSERTION RATHER THAN A DESCRIPTION SINCE WAVE
 * 40. The cross-construct fixture pins this helper's output to the LINE HALF of
 * `exemptionKeyFor`'s key — the portion after `EXEMPTION_ANCHOR_SEP` — for both
 * of its array pairs, over the fixture's SYNTHETIC inputs and no wider. Until
 * then the claim held nowhere: verification pass 9 replaced this body with
 * `return "CONSTANT";` and every one of the counter-probe's five assertions
 * still passed, at 434 of 434 green (WR-51).
```

The keep-rather-than-describe reasoning is shown intact by the diff: the hunk at `@@ -9436,0 +9437,8 @@` is a pure insertion of eight lines and removes nothing, so *"WHY THE OLD BUILDER IS KEPT RATHER THAN DESCRIBED. A fixture that shows the new builder catching a relocation is equally consistent with a builder that catches everything and with one that catches nothing that matters…"* is byte-unchanged.

### MUTATION 3 — the verifier's constant body, watched RED

```
$ git log --oneline -1
294d646 test(01-40): WR-51 — the counter-probe pinned to the live builder's line half
```

`preAnchoringExemptionKeyForFixtureOnly`'s body replaced with `return "CONSTANT";`.

**RESULT: `Tests  1 failed | 437 passed (438)`.** Pass 9 measured **434 passed (434)** for this exact mutation.

> **× a CROSS-CONSTRUCT relocation yields a DIFFERENT anchored key and was INVISIBLE to the pre-anchoring one — the SAME-construct case is not covered here**
>
> `AssertionError: the pre-anchoring builder (under the declaration) is no longer \`exemptionKeyFor\` with its construct half removed, so the counter-probe is drawing its contrast against something other than the format CR-17 was measured in. Its output must be byte-identical to the portion of the live key after " §§ " — that identity IS the docblock's structural claim, and without it any constant function satisfies every assertion below (WR-51, measured at 434 of 434 green).: expected 'CONSTANT' to be 'cell: "{q2}", :: q2' // Object.is equality`
>
> `Expected: "cell: "{q2}", :: q2"`
> `Received: "CONSTANT"`
> `❯ packages/backend/src/outbound-prohibition.spec.ts:10472:9`

### MUTATION 4 — an isolating variant, because mutation 3 masks pair two's message

Mutation 3 fails at pair ONE's pin, so pair TWO's pin never runs and its own message is never printed — a pin watched failing for someone else's reason, the same masking plan 01-39 hit in its Task 3. A variant that leaves pair one intact (`if (!anchor.startsWith("cell:")) return "CONSTANT";`) isolates the own-header pair.

**RESULT: `Tests  1 failed | 437 passed (438)`.**

> **× a CROSS-CONSTRUCT relocation yields a DIFFERENT anchored key and was INVISIBLE to the pre-anchoring one — the SAME-construct case is not covered here**
>
> `AssertionError: the pre-anchoring builder (before, an \`it(\` TITLE line) is no longer \`exemptionKeyFor\` with its construct half removed, so this pair's counter-probe is contrasting against something other than the format CR-17 was measured in.: expected 'CONSTANT' to be 'it("the case, {q2}", () => { :: q2' // Object.is equality`
>
> `Expected: "it("the case, {q2}", () => { :: q2"`
> `Received: "CONSTANT"`
> `❯ packages/backend/src/outbound-prohibition.spec.ts:10601:11`

Both restored:

```
$ git diff --exit-code -- packages/backend/src/outbound-prohibition.spec.ts
TREE-CLEAN after constant-body restore
TREE-CLEAN after isolating-mutation restore
```

Neither mutation was adjusted to force a red.

---

## The per-sentence no-overclaim verdict

Every sentence this plan authored or changed, with the measurement that backs it.

| # | passage | verdict | backed by |
|---|---|---|---|
| 1 | sentinel docblock: *"a named token makes a produced empty anchor VISIBLE where an empty string would be silent"* | OK | design statement about the constant, unchanged in substance from the sentence it replaces |
| 2 | sentinel docblock: *"`constructAnchorFor` returns it from ONE site"* | OK | `grep -c 'return NO_PRECEDING_CONSTRUCT'` = 1, at arrival and at the end |
| 3 | sentinel docblock: *"The SECOND return … no longer yields this token at all. Wave 39's WR-53 extension made that case CONTINUE the backward scan"* | OK | the `continue`-fallback comment in `constructAnchorFor`, quoted in `01-39-SUMMARY.md`'s diff hunks; and mutation STEP 1, whose planted bare docblock resolved to the `||=` title rather than to the sentinel |
| 4 | sentinel docblock: *"a bare `/**` above an occurrence resolves to the construct ABOVE IT instead of to this value"* | OK | STEP 1's discharge message: `line 7103: "it("through receiverAliases' LOGICAL-ASSIGNMENT branch: the \`||=… §§ {q2} :: q2"` |
| 5 | sentinel docblock: *"Two cases read this value, and each reaches less than this file … on the scanned surface and over nothing wider … the keys PRESENT IN `HEADER_QUANTIFIER_EXEMPTIONS` and over nothing wider"* | OK — **and the bound is IN the claiming clause**, see the verdict above | the two cases' own populations, read off their code: `quantifierOccurrences(gateLines, SURFACE_LINES)` and `Object.keys(HEADER_QUANTIFIER_EXEMPTIONS)` |
| 6 | sentinel docblock: *"A key written BY HAND and never added to that map is reached by neither, and a line inside one of the three exclusions is reached by neither"* | OK | `SURFACE_LINES` excludes 957–1538, 4135–5767 and 5959–5969; the null-anchor case iterates the declared map only |
| 7 | sentinel docblock: *"Until wave 40 this docblock said … while NOTHING read the value — `grep` found the declaration, one docblock mention and the return, and not one `expect`"* | OK | the arrival `grep -n`, pasted above: `:9200`, `:9303`, `:9360`, no `expect` |
| 8 | `nameableRemainder` docblock: *"The letters and digits, less the sentinel, and nothing else"* | OK | the AFTER arithmetic: the constant reduces to `""`, prose merely resembling it reduces to 25/59/20 characters |
| 9 | inline comment: *"COUNTING ITS LETTERS AS NAMING SOMETHING IS THE ARITHMETIC THAT LET CR-17's SHAPE BACK IN"* | OK | the BEFORE arithmetic (len 20, passes) and STEP 1/STEP 2 at 434 of 434 green in `01-VERIFICATION.md` |
| 10 | surface case comment: *"It bounds the sentinel over the occurrences `quantifierOccurrences` finds across `SURFACE_LINES` and over nothing wider"* | OK | the case's own body |
| 11 | surface case comment: *"Re-measured at wave 40 over the scanned surface: 29 occurrences, 0 resolving to the sentinel"* | OK | measurement (B), before and after |
| 12 | surface case message: *"Verification pass 9 drove exactly that shape through twice, at 434 of 434 green each time"* | OK | quoted from `01-VERIFICATION.md`, not re-derived |
| 13 | helper docblock: *"The cross-construct fixture pins this helper's output to the LINE HALF … for both of its array pairs, over the fixture's SYNTHETIC inputs and no wider"* | OK — **explicitly narrower than a general equivalence over the file** | four pin assertions over two synthetic array pairs; mutations 3 and 4 |
| 14 | helper docblock: *"verification pass 9 replaced this body with `return \"CONSTANT\";` and every one of the counter-probe's five assertions still passed, at 434 of 434 green"* | OK | quoted from `01-VERIFICATION.md` |
| 15 | pin message: *"without it any constant function satisfies every assertion below"* | OK | mutation 3, which is that constant function and which passed all five before this pin existed |

**The explicit statement the criterion asks for:** the pin holds over the fixture's **synthetic inputs** — two array pairs, four keys — and is **narrower than a general equivalence** between the two builders over the file. Nothing here says the counter-probe is now sound in general.

---

## The out-of-scope constructs — `git diff` shown EMPTY, at both task boundaries

**Task 1** (changed lines matching each identifier, over the whole task diff):

```
constructAnchorFor : 3      <- ALL THREE are PROSE MENTIONS in new text, listed below
CLOSES_FROZEN_ARRAY : 0     closingBracketAfter : 0     CORE11_BOX_EXPECTED : 0
preAnchoringExemptionKeyForFixtureOnly : 0              anchorTokenCensus : 0
constructTokenOf : 0        EXCLUSIONS : 0              proof: : 0
exemptionKeyFor : 0         CONSTRUCT_TOKEN_WIDTH : 0
limit (5) / the census case / the prefix case / the box case : 0 changed lines

the three `constructAnchorFor` lines:
+ * OLDER DESCRIPTION OF IT. `constructAnchorFor` returns it from ONE site: the
+  // mention inside `constructAnchorFor`'s docblock, and the single `return` —
+        (o) => constructAnchorFor(gateLines, o.line) === NO_PRECEDING_CONSTRUCT,

$ diff <(git show 3e59998:… | awk '/THE CONSTRUCT AN OCCURRENCE SITS UNDER/,/^  return NO_PRECEDING_CONSTRUCT;$/') \
       <(awk '/THE CONSTRUCT AN OCCURRENCE SITS UNDER/,/^  return NO_PRECEDING_CONSTRUCT;$/' …)
constructAnchorFor SCAN + DOCBLOCK BYTE-IDENTICAL      (105 lines both sides)

$ diff <(git show 3e59998:… | sed -n '803,804p;901p;911p') <(sed -n '803,804p;901p;911p' …)
HEADER-LINES-IDENTICAL
```

**Task 2:**

```
nameableRemainder : 0   NO_PRECEDING_CONSTRUCT : 0   SCANNED SURFACE : 0
constructAnchorFor : 0  CLOSES_FROZEN_ARRAY : 0      closingBracketAfter : 0
CORE11_BOX_EXPECTED : 0 EXCLUSIONS : 0               proof: : 0
anchorTokenCensus : 0   constructTokenOf : 0         CONSTRUCT_TOKEN_WIDTH : 0
every anchor IN USE : 0 CONSTRUCT half is a PREFIX : 0

HEADER-LINES-IDENTICAL
SENTINEL-REGION-IDENTICAL
TASK1-CASE-BYTE-IDENTICAL        (28 lines both sides, extracted by content not by line number)
```

## Nothing under `.planning/` was opened, and nothing leaks

```
$ git status --porcelain .planning/     (compared byte-for-byte against the arrival snapshot)
PLANNING-UNCHANGED-SINCE-ARRIVAL        <- at both task boundaries and at close-out

$ git diff --exit-code -- .planning/REQUIREMENTS.md
REQUIREMENTS.md UNCHANGED

$ grep -n '^- \[ \] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
46:- [ ] **CORE-11**: No code that ships in the plugin issues an outbound network request in this phase — no `caido:http…

$ git status --porcelain -- '*COVERAGE.md' '*PROBE.md'
(empty)

$ git diff --name-only -- packages/ scripts/ | grep -v '\.spec\.ts$' | grep -c .
0
```

`requirements mark-complete` appears in no command run this session. **`01-PROBE.md`'s equality `38 == 27 + 11` stands unchanged** — this plan resolves no flagged assumption and surfaces no new one. `COVERAGE.md` is unedited and its declaration stands, because this round integrates no external API.

## Final gate set — re-measured, not assumed

```
$ pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts | tail
      Tests  438 passed (438)          <- NO FEWER than plan 01-39's 437

$ pnpm test | tail
 Test Files  31 passed (31)
      Tests  1378 passed (1378)        <- no fewer than 31 files / 1374 tests
TEST-EXIT=0

$ pnpm typecheck   -> tsc --build, exit 0
$ pnpm lint        -> eslint ., exit 0
$ pnpm knip        -> knip, exit 0
$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto

$ real-tree walk over both SOURCE_ROOTS
shipped non-spec modules across both SOURCE_ROOTS: 23
$ pnpm exec vitest run … -t "no outbound surface is reachable" | tail
      Tests  29 passed | 409 skipped   <- 0 violations across the 23 modules

$ NPC arrival=3 final=9
$ git diff --exit-code -- packages/backend/src/outbound-prohibition.spec.ts
TREE-CLEAN
```

---

## Prediction vs measurement

Recorded in the shape `01-27-SUMMARY.md` uses.

| # | predicted | measured | agree? |
|---|---|---|---|
| P1 | the sentinel arithmetic scores 20 before the change | `"NOPRECEDINGCONSTRUCT"`, len **20** | **yes** |
| P2 | the sentinel arithmetic scores 0 after the change | `""`, len **0** | **yes** |
| P3 | the 29 keys survive the `nameableRemainder` change unmoved | 29 in, 29 out, **0 moved**, declared == produced on both sides | **yes** |
| P4 | both sentinel guards are green on arrival | both green; suite went 437 → 438 with the new case passing on its first run | **yes** |
| P5 | *nothing predicted* — plan 01-39's handoff sentinel count | **0**, re-measured | n/a — measured |

**Four disagreements with a carried-forward figure, recorded rather than absorbed:**

| # | source figure | this session | disposition |
|---|---|---|---|
| **F-1** | the plan's reconciliation anchor: three hits = the declaration and **two return sites** (`:9251`, `:9253`) | three hits = the declaration `:9200`, a docblock **MENTION** `:9303`, and **ONE** return `:9360` | The TOTAL agrees; the COMPOSITION does not. Plan 01-39's WR-53 extension replaced the inner return with a `continue` and added the docblock sentence, holding the total at three by coincidence. **The plan text is stale in two further places and this is recorded so it is corrected rather than carried:** the prohibition resolution at `01-40-PLAN.md:174` and threat **T-01-249** at `:636` both say *"both return sites still referencing it"*, which is factually wrong at this tree. The acceptance criterion at `:459` — *"EVERY RETURN SITE PRESENT AT THIS TASK'S ARRIVAL"* — is the authoritative form and is what was executed. This task deleted no return site: arrival 1, final 1. |
| **F-2** | the plan's action and criterion: the corrected docblock must describe **BOTH** returns, including the construct-resolved-but-named-nothing one | the code has **ONE** return; the second case now `continue`s | The docblock describes the return that exists and states by name that the second no longer yields the token and why. Writing it as two live returns would have been the tenth overclaim inside the fix for the ninth. The plan's own action text authorises this: *"read the code as it now stands rather than as this plan describes it."* |
| **F-3** | the plan's criterion: STEP 1 must go RED **through the null-anchor case**, and whether the surface assertion also fired is to be recorded | STEP 1 went RED through the null-anchor case. **The surface assertion did NOT fire, in STEP 1 or STEP 2** | Under WR-53's continue-fallback a bare docblock no longer produces the sentinel, so neither of the verifier's steps reaches the surface case. Rather than leave a guard shipped green and unwatched — which is precisely WR-54 — a THIRD mutation was added: the same shape sited where the backward scan is genuinely exhausted (top of file), which fired the surface case with its own message. No assertion was softened and no mutation was adjusted to force a red. |
| **F-4** | `01-REVIEW.md`'s WR-51 snippet: `` .toBe(`${lineHalf(beforeKey)} :: q${UNBOUNDED_QUANTIFIERS.indexOf(phrasing)}`) `` | that expression evaluates to `"cell: \"{q2}\", :: q2 :: q2"` and does **not** match the builder's `"cell: \"{q2}\", :: q2"` | `lineHalf` already carries the `:: qN` suffix. Measured before writing anything; the pin is `toBe(lineHalf(live))`, which is the prescription's substance — the portion after `EXEMPTION_ANCHOR_SEP`, through the fixture's own helper — with the doubling removed. |

---

## Deviations from Plan

### Auto-fixed and procedural

**1. [Rule 3 - Blocking] The `.planning/` precondition and the verify block's `[ "$N" -eq 0 ]` were unsatisfiable as literally written, and were replaced by a strictly stronger assertion rather than by a halt**
- **Found during:** Task 1 (precondition)
- **Issue:** The precondition requires `git status --porcelain packages/ scripts/ .planning/` clean and the verify block asserts `.planning/` porcelain output is empty. `packages/` and `scripts/` were clean; `.planning/` carried **five** entries at arrival — `config.json` modified before this executor was spawned, plus four untracked entries predating the session (all four visible in the orchestrator's opening git snapshot). No action available to this plan could clear them, and clearing them is not this plan's business.
- **Fix:** The arrival output was pinned to `/tmp/gsd-0140-planning-arrival.txt` and `git status --porcelain .planning/` was asserted **byte-identical to that snapshot** at both task boundaries and at close-out — which proves this plan added nothing, and is strictly stronger than an emptiness check that would pass on a tree where a planning file had been both added and removed.
- **Verification:** `PLANNING-UNCHANGED-SINCE-ARRIVAL` at every boundary; `N(.planning)=5`, all five pre-existing.
- **Committed in:** not a code change.

**2. [Rule 3 - Blocking] The sentinel's declaration was moved ABOVE `nameableRemainder`, because a by-reference exclusion below it is a temporal-dead-zone read**
- **Found during:** Task 1
- **Issue:** `nameableRemainder` was declared at `:9192` and `NO_PRECEDING_CONSTRUCT` at `:9200`. Referencing the constant from inside the helper is safe at call time but reads as a use-before-define, and the plan requires the reference rather than a re-spelling.
- **Fix:** The constant's declaration (whose docblock this task was rewriting anyway) was moved eight lines up, ahead of the helper. No third declaration moved; `EXEMPTION_ANCHOR_SEP`, `CONSTRUCT_TOKEN_WIDTH`, `constructTokenOf` and everything below stayed where they were.
- **Verification:** `tsc --build` exit 0, `eslint .` exit 0, the 29-key blast radius unmoved.
- **Committed in:** `28b5547`.

**3. [Procedural] A THIRD sentinel mutation, because neither of the verifier's two steps reaches the new surface case any more**
- **Found during:** Task 1 (finding F-3)
- **Issue:** Wave 39's WR-53 continue-fallback means a bare docblock no longer returns the sentinel, so STEP 1 and STEP 2 both go red through the planted KEY and leave the surface case green — a guard shipped green and never watched failing, which is exactly the defect WR-54 was filed about.
- **Fix:** Mutation 1b — the same bare-docblock shape sited at the top of the file, where the backward scan has nowhere to continue to. The surface case fired with its own full message while the null-anchor case correctly stayed green.
- **Verification:** RED pasted above; restored; `git diff --exit-code` clean.
- **Committed in:** not a code change (planted and restored).

**4. [Procedural] A FOURTH mutation, because the verifier's constant body masks pair two's message**
- **Found during:** Task 2
- **Issue:** `return "CONSTANT";` fails at pair ONE's pin, so the own-header pair's pin never runs and its `(${which}, ${shape})` message is never printed — a pin watched failing for someone else's reason. Plan 01-39 hit the identical masking in its Task 3.
- **Fix:** An isolating variant returning the correct line half only for pair one's occurrence shape, so pair two's pin prints its own assertion.
- **Verification:** both REDs pasted; both restored; tree clean.
- **Committed in:** not a code change (planted and restored).

**5. [Rule 1 - Bug in the prescription] WR-51's literal snippet is wrong on the `:: qN` suffix and was corrected in form**
- **Found during:** Task 2 (finding F-4)
- **Issue:** `01-REVIEW.md`'s fix appends `` ` :: q${index}` `` to `lineHalf(beforeKey)`, but `lineHalf` already carries that suffix, so the expression doubles it and the assertion would be false against a correct builder.
- **Fix:** Measured before writing; implemented as `toBe(lineHalf(live))`, which is the prescription's stated substance.
- **Verification:** the pin is green against the live builder and RED against both mutations.
- **Committed in:** `294d646`.

**6. [Orchestrator-assigned] `.planning/STATE.md` and `.planning/ROADMAP.md` are written by this plan's close-out, against the plan's "opens no file under `.planning/`"**
- **Found during:** close-out
- **Issue:** The plan forbids touching `.planning/`. The execute-phase orchestrator running in sequential mode assigned this executor the shared-artifact writes (STATE.md and `roadmap update-plan-progress`) plus this SUMMARY.
- **Fix:** Honoured the orchestrator for the three bookkeeping artifacts only. **No content edit was made to `REQUIREMENTS.md`, `01-PROBE.md`, `COVERAGE.md`, `01-VERIFICATION.md` or `01-REVIEW.md`; CORE-11's checkbox did not move in either direction; `requirements mark-complete` was not run.** The prohibition's substance — that this plan does not adjudicate CORE-11 — is intact.
- **Verification:** `git diff --exit-code -- .planning/REQUIREMENTS.md` clean; the checkbox reads `- [ ]`.

---

**Total deviations:** 6 (2 blocking-condition substitutions, 1 prescription bug corrected, 2 procedural strengthenings, 1 orchestrator assignment).
**Impact on plan:** No scope creep. Two of the six ADD evidence the plan asked for that its own prescribed route no longer supplies; one is an unsatisfiable literal replaced by a stronger check; one is a use-before-define made safe; one is a measured correction to a reviewer's snippet; one is the orchestrator's own assignment. **No forbidden route was taken:** the sentinel was not deleted and not replaced with an empty string, its letters were not re-spelled inside the exclusion (0 added lines carry them), the outbound gate was not weakened (0 of 29 keys moved), no assertion was softened, no occurrence was exempted, no mutation was adjusted to force a red, and nothing under `.planning/` was opened.

## Issues Encountered

None beyond the deviations above. Every mutation went RED on its first run.

## Known Stubs

None. Nothing in this plan is placeholder, and no `<verify>` went unrun — both task verify blocks were executed verbatim and are pasted above, with the single documented substitution in deviation 1.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Plan 01-41 owns WR-54 and WR-50 on the same file.** Nothing this plan touched belongs to it: `CLOSES_FROZEN_ARRAY`, `closingBracketAfter`, the `EXCLUSIONS` array, every band and every `proof` token are byte-unchanged and shown so by diff above.
- **For verification pass 10.** Three things are handed over rather than settled: (a) **finding F-1** — `01-40-PLAN.md:174` and threat `T-01-249` at `:636` still say *"both return sites"*, which is false of this tree and should be corrected in the record; (b) **finding F-2** — the corrected sentinel docblock describes ONE return and says the second was removed, which is a departure from the criterion's literal wording and is the only truthful reading of the code; (c) **coverage D4** — whether the observability sentence's bound is genuinely carried inside its claiming clause is a reading judgment, and the one-line verdict above is this executor's, not a measurement.
- **The residual is unchanged and disclosed.** Closing the sentinel removes one laundering route and observes one value. A hand-written key outside the map can still be constructed to survive both checks; two occurrences under the same construct remain interchangeable behind a scan-order `#N`; the guard is still a phrase list over bytes under one named normalization; the unguarded files and the undeclared spellings are both still unreached. **Criterion (3) is not discharged by this plan.**
- **CORE-11's box is pass 10's call, not this plan's.** It was not moved in either direction.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-26*
