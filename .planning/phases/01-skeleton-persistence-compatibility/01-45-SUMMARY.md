---
phase: 01-skeleton-persistence-compatibility
plan: 45
subsystem: testing
tags: [vitest, gate-discipline, core-11, identity-pin, endpoint-pin, malformed-keys]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "Plan 01-44's shared CR-28 resolver and deletion-only closure, leaving the shortened final surface on which this plan adds the round's mechanism pins"
provides:
  - "The widest anchor shadow pinned by masked-token identity as well as by size"
  - "The machine-owned exclusion's two prefix-resolved endpoints pinned afterwards against unique, independent full-line sentinel locators"
  - "Both malformed exemption-key boundary values diagnosed as malformation at both consumers"
  - "Round 11 closed at a negative line delta with the full test, type, lint, dependency, build, bundle and shipped-source boundary re-executed"
affects: [verification-pass-12, core-11, phase-01-verification]

actuals:
  tokens: 6000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Pin a derived maximum's owner separately from its numeric maximum"
    - "Keep the production prefix locator independent and compare its realized endpoint afterwards against a unique full-line locator"
    - "Reject both indexOf boundary failures, -1 and 0, before slicing a structured key"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts

key-decisions:
  - "Use a masked anchor token, never a line number, for the identity pin."
  - "Do not rewrite EXCLUSIONS' prefix locators; expression independence is what makes the endpoint pins non-tautological."
  - "State the WR-64 boundary from the accepted-line measurement and the WR-65 rule as an authorisation, not as a new measurement claim."
  - "Leave CORE-11 unchecked and leave IN-45, IN-46, IN-48, IN-49 and WR-57 open for the next verifier."

patterns-established:
  - "A watched-red identity mutation must show the old size pin green in the same run"
  - "A diagnostic fix is proved by preserving the input and comparing the old and new failure classes"

requirements-completed: []

coverage:
  - id: D1
    description: "The widest anchor's masked-token identity is asserted independently of its size"
    requirement: CORE-11
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the WIDEST ANCHOR SHADOW over the scanned surface is PINNED"
        status: pass
      - kind: other
        ref: "watched 293-line mutation: identity assertion RED while size remained 574 and green"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both sentinel endpoints are located uniquely by full-line equality and compared against the prefix-derived exclusion"
    requirement: CORE-11
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#exclusion one's sentinel endpoints land on the sentinels' own unique full lines"
        status: pass
      - kind: other
        ref: "watched bare-sentinel decoy: realized from 961, own sentinel line 984, gap -23"
        status: pass
    human_judgment: false
  - id: D3
    description: "Malformed exemption keys at separator indexes -1 and 0 are rejected as malformation by both consumers"
    requirement: CORE-11
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#no exemption key's CONSTRUCT half is a PREFIX of its LINE half"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#every anchor IN USE is produced by exactly ONE line of the file"
        status: pass
      - kind: other
        ref: "watched keys with an opening separator and with no separator: both intended consumers RED with MALFORMATION"
        status: pass
    human_judgment: false
  - id: D4
    description: "WR-64's boundary clause matches the line-by-line recogniser evaluation and WR-65 no longer argues against its pin"
    requirement: CORE-11
    verification:
      - kind: other
        ref: "raw 419..1574 accepted set: exactly [[1573, [docblock], /**]]; constructTokenOf returns null and WR-53 falls through"
        status: pass
    human_judgment: false
  - id: D5
    description: "Round 11 closes with no shipped-source change, a negative gate-file line delta, and all build and gate boundaries green"
    requirement: CORE-11
    verification:
      - kind: integration
        ref: "31 files / 1382 tests; gate 442; tsc, typecheck, lint, knip, backend build and bundle check pass; one crypto import; 23 modules"
        status: pass
      - kind: other
        ref: "882ff17..HEAD: 76 added / 77 removed, one spec file, zero shipped source files"
        status: pass
    human_judgment: false
  - id: D6
    description: "Whether the completed round earns CORE-11 and reduces the live security counter to zero"
    verification: []
    human_judgment: true
    rationale: "Explicitly deferred to verification pass 12; the ledger and source pin remain unchecked."

duration: 14 min
completed: 2026-08-27
status: complete
---

# Phase 01 Plan 45: Identity, Sentinel Endpoint and Malformed-Key Closure Summary

**The named 574-line shadow now has an identity pin independent of its size, the largest exclusion has independent pins under both sentinel endpoints, and malformed exemption keys now fail as malformation at both boundary values.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-08-26T23:58:00+02:00
- **Completed:** 2026-08-27T00:12:00+02:00
- **Tasks:** 2
- **Files modified:** 1 test file; 0 shipped files

## Accomplishments

- Added `WIDEST_ANCHOR_TOKEN` and asserted it beside `WIDEST_ANCHOR_SHADOW`; pass 11's exact 293-line silent mutation now fails only the identity equality while the size equality remains green at 574.
- Re-measured the raw `419..1574` boundary through all five recognisers and corrected the causal sentence to the one accepted `/**` line plus WR-53's fall-through.
- Proved `DERIVED_BEGIN` and `DERIVED_END` unique before comparing both realized exclusion endpoints against their independent full-line locations.
- Corrected `indexOf`'s missed zero boundary and widened both messages to name separator absence and an empty construct half.
- Closed the whole round at 76 added / 77 removed lines, one test file changed, no shipped byte changed.

## Task Commits

1. **Task 1: pin the widest shadow identity and correct its boundary rationale** — `fc97016` (`test`)
2. **Task 2: pin sentinel endpoints and diagnose malformed keys at both boundary values** — `dca732c` (`test`)

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — identity equality, corrected boundary and authorisation prose, unique sentinel endpoint pins, and two-shape malformed-key diagnostics.

## Task 1 Evidence — Identity, Boundary and Authorisation

### Re-derived arrival

Immediately after plan 01-44, the unmodified committed source measured:

| measure | value |
| --- | ---: |
| scanned surface | 9,254 |
| machine span | `983..1564` (582) |
| quantifier list | `5985..5995` (11) |
| registry | `4161..5793` (1,633) |
| widest shadow | 574, raw `419..1574` |
| widest owner | `SPELLING (operator, by POSITION) RESOLVED BY REPORTS` |
| owner producers | 1 |

The pinned literal is a masked token and carries no line number. At Task 1's committed state, `wc -l` grew by eight lines and the derived surface became 9,262; the widest owner, width, ranges and producer count were unchanged. The intermediate `R11_TASK1_POST` probe captured 9,259 before the final three formatting/rationale lines landed; it is not adopted as the committed figure.

### Exact watched-red identity mutation

The mutation was pass 11's exact geometry: 291 filler lines held the maximum at 574 and two lines were placed below all four shipped occurrences. The two-line insertion had to be after original raw line 700; the first procedural attempt put it before that line and did not reproduce pass 11's frame, so it was corrected rather than adopted.

Pass 11 had reported the same mutation green at 441/441. With the identity assertion present, the run was `1 failed | 440 passed (441)` and the in-suite observation proved the size assertion green in that same run:

```text
R11_SIZE_PIN_GREEN {"widest":"packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi…","widestSize":574,"top":[[574,2,575,"packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi…"],[292,994,1867,"a new prose block opening here"],[284,710,993,"SPELLING (operator, by POSITION) RESOLVED BY REPORTS"],[202,7305,9240,"it.each(["]]}
```

The full new failure was:

```text
THE WIDEST ANCHOR SHADOW EXPECTED OWNER "SPELLING (operator, by POSITION) RESOLVED BY REPORTS" BUT FOUND "packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi…"; THE ANCHOR OWNING THE MAXIMUM HAS CHANGED IDENTITY, WHICH IS THE SHAPE THAT COLLAPSED THE NAMED SHADOW BY 290 LINES WHILE THE MAXIMUM HELD.
Expected: "SPELLING (operator, by POSITION) RESOLVED BY REPORTS"
Received: "packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi…"
```

The mutation and instrumentation were removed. The shipped anchor's producer census remained exactly one.

### WR-64 boundary measurement

Every raw line from 419 through 1574 was evaluated against all five recognisers from inside the suite. The accepted set was exactly:

```text
[[1573,["docblock"],"/**"]]
```

That line is below the imports. `constructTokenOf("/**")` returns null, so WR-53's forward walk falls through and the backward scan continues to the named header. The final sentence says exactly that mechanism; it does not claim that no recogniser accepts a line in the range.

### WR-65 authorisation

The argument that routine re-derivation makes a pin untrustworthy was removed. Its replacement authorises a future bump only when growth is attributed line by line to the same commit. That is a policy governing a future edit, not a claim about an unmeasured current population.

## Task 2 Evidence — Sentinel Endpoints and Key Malformation

### Sentinel uniqueness and independent pins

Before either constant was used by a pin, a same-physical-line probe measured:

```text
beginHits=1 beginLine=983
endHits=1   endLine=1564
```

The committed case repeats those two hit-count assertions before resolving either line. It then compares `EXCLUSIONS[0].from` and `.to` against full-line equality on `DERIVED_BEGIN` and `DERIVED_END`.

The production derivation remains byte-for-byte a prefix mechanism. Dated enumeration, 2026-08-27, of its four prefix matchers:

1. `spanStart`: `startsWith("BEGIN DERIVED RESIDUAL")`
2. `spanEnd`: `startsWith("END DERIVED RESIDUAL")`
3. `listStart`: `startsWith("export const UNBOUNDED_QUANTIFIERS")`
4. `registryStart`: `startsWith("export const RESOLVER_REGISTRY")`

This enumeration is intentionally recorded here, not as a live completeness claim in the gate. The file states only the named reach: endpoint values named by independent comparisons are pinned; prefix matchers remain non-exact; unnamed endpoints are not pinned.

### WR-62 watched red

A bare `BEGIN DERIVED RESIDUAL` was planted at raw line 961 inside the block comment above the real sentinel. The gate reported `2 failed | 440 passed (442)`. The new pin's full failure was:

```text
exclusion one's realized FROM endpoint is line 961, but its opening sentinel's own full line is 984 — a gap of -23 line(s). A slide of this endpoint moves the largest exclusion and can silently remove pre-existing lines from what the gate scans. Restore the prefix locator's intended landing; do not move this independent pin to fit it.
Expected: 984
Received: 961
```

The existing size pin also reported 552 against 574. At `882ff17`, the same decoy fired only that size pin; no endpoint assertion existed. The new comparison therefore removes reliance on that geometry for the opening endpoint only, and claims nothing wider. The decoy was removed and the target returned to 442/442.

### F-11 correction

The old block used twelve lines to publish an incomplete locator count. The replacement uses four lines and states only what is pinned and what is not. Net block delta: **-8 lines**. No new completeness count was written into the gate; the dated four-prefix enumeration is confined to this summary.

### WR-63 diagnosis before and after

Before this plan, pass 11's key opening with the separator reached the ambiguity assertion with an empty token. Its full diagnostic body was:

```text
1 anchor(s) IN USE are not produced by exactly one line of packages/backend/src/outbound-prohibition.spec.ts:
  ""
    produced by 0 line(s):
    keys hanging off it:
      " §§ some line :: q3"
AN ANCHOR WITH MORE THAN ONE PRODUCER NAMES NONE OF THEM. The exemption written for the occurrence under one producer is discharged just as well by an occurrence under another, so the sentence the entry excuses can be moved between them and its stated reason can become FALSE without any of the three discharge checks noticing. That is CR-20(b). YOU HAVE THREE CHOICES. (i) DISAMBIGUATE THE HEADER IN ITS OWN BYTES — give the producing line a clause that names which table of spellings it heads or which parameter set the case runs; `normalizeGateLine` strips only a LEADING comment marker, and the construct token is truncated at 64 characters, so the distinguishing clause has to fall inside that width. Then regenerate every key anchored to that header with `exemptionKeyFor` in the same commit, carrying each reason across byte-unchanged. (ii) RE-SITE OR REWRITE THE OCCURRENCE so it sits under a construct whose header is already unique — only where the sentence still says what it is about afterwards. (iii) DELETE the occurrence, if it states a bound it should not be stating at all. A ZERO PRODUCER COUNT IS THIS SAME FAILURE FROM THE OTHER SIDE: the key was hand-written against a header that is not in the file. FORBIDDEN, ALL FOUR: widening this case to permit more than one producer; exempting a token from the census; appending an ordinal to launder the ambiguity; and folding the LINE NUMBER into the key. The last is the tempting one and it is the worst — it would make every key unique by construction, turn this case green having measured nothing, and break on every unrelated edit below it.
```

After widening the census guard to `at <= 0`, the same key produced malformation before entering `inUse`. Both intended consumers failed, with these complete messages:

```text
exemption key " §§ some line :: q3" either carries no " §§ " separator or opens with that separator and therefore has an EMPTY construct half to check. Both shapes are MALFORMATION, not a self-anchor. Rebuild it with `exemptionKeyFor`, which is the only thing that may author a key.

exemption key " §§ some line :: q3" either carries no " §§ " separator or opens with that separator and therefore has an EMPTY construct half. Both shapes are MALFORMATION, not ambiguity: without this check the split would admit a near-complete or empty key and this case would report an anchor with zero producers. Rebuild the entry with `exemptionKeyFor`, which is the only thing that may author a key.
```

The watched run was `3 failed | 439 passed (442)`; the third failure was the expected stale-entry equality caused by planting a temporary map member. The change of interest is that the census now throws the second malformation message instead of constructing `""` and reporting ambiguity.

A second watched key carried no separator at all. Both intended consumers again failed, at index -1, with the same two-shape messages instantiated as:

```text
exemption key "malformed temporary key :: q3" either carries no " §§ " separator or opens with that separator and therefore has an EMPTY construct half to check. Both shapes are MALFORMATION, not a self-anchor. Rebuild it with `exemptionKeyFor`, which is the only thing that may author a key.

exemption key "malformed temporary key :: q3" either carries no " §§ " separator or opens with that separator and therefore has an EMPTY construct half. Both shapes are MALFORMATION, not ambiguity: without this check the split would admit a near-complete or empty key and this case would report an anchor with zero producers. Rebuild the entry with `exemptionKeyFor`, which is the only thing that may author a key.
```

That run was also `3 failed | 439 passed (442)`. Both temporary keys were removed independently, and the target returned to 442/442 after each restore.

WR-57 remains exactly where it was: the second `constructHalf` declaration is still marked **UNADJUDICATED**. This task did not consolidate it and does not close WR-57.

## No-Overclaim Review

| changed claim family | executed reach | verdict |
| --- | --- | --- |
| identity failure sentence | one exact equality on the owner of the current maximum | accurate; watched red while the size equality stayed green |
| WR-64 boundary sentence | all five recognisers over every raw line `419..1574` | accurate; accepted set pasted above |
| WR-65 authorisation | future edits that ask to bump the pin | policy, not a claim about current bytes |
| F-11 replacement | only endpoints named by the independent comparisons | accurate; no completeness count authored |
| endpoint failure sentences | realized `from`/`to` versus each sentinel's unique full line | accurate; opening side watched red at a -23 gap |
| malformed-key sentences | `indexOf` results -1 and 0 at both consumers | accurate; both values watched producing MALFORMATION |

No sentence claims containment, site identity, exhaustive language recognition, closure of WR-57, or completion of CORE-11.

## Round-Closing Baseline

Every closing figure below was executed after both task commits. Differences from arrival are attributed rather than adopted silently.

| boundary | arrival | close | reconciliation |
| --- | ---: | ---: | --- |
| gate tests | 441 | 442 | +1 committed endpoint test |
| all tests | 1,381 | 1,382 | the same +1 test |
| test files | 31 | 31 | unchanged |
| `tsc --build` | pass | pass | unchanged |
| `pnpm typecheck` | pass | pass | unchanged |
| `pnpm lint` | pass | pass | unchanged |
| `pnpm knip` | pass | pass | unchanged |
| backend package build | pass | pass | unchanged; Caido package zip created |
| bundle imports | 1: `crypto` | 1: `crypto` | unchanged |
| shipped modules walked | 23 | 23 | unchanged |
| real-tree outbound violations | 0 | 0 | unchanged, asserted by the green gate |
| `wc -l` gate file | 11,502 | 11,502 | additions and deletions balance at physical-file level |
| `gateLines.length` | 11,503 | 11,503 | trailing split element retained |
| `SURFACE_LINES.length` | 9,277 | 9,277 | final exclusions and file length return to arrival |
| exclusions | 582 / 11 / 1,633 | 582 / 11 / 1,633 | `983..1564`, `5985..5995`, `4161..5793` unchanged |
| changed files under `packages/` and `scripts/` | 0 shipped / 1 spec | 0 shipped / 1 spec | exactly the planned test file |

Round-base diff `882ff17..dca732c` over the gate file:

```text
ROUND-11-PROSE-DELTA added=76 removed=77 net=-1
```

The cumulative delta is negative, as the deletion round's thesis requires. The first complete implementation measured +4; a first compaction measured 0. Neither was accepted. Five then one explanatory lines were removed without deleting an assertion or failure diagnostic, and the full verifier was rerun until the committed result was -1.

Round-close integrity:

```text
reauthoring literals=0
case-insensitive enclos population=7
identity pin sites=1
size pin sites=1
```

All critical bodies remained byte-identical to `882ff17`:

| body | lines | diff lines |
| --- | ---: | ---: |
| `constructAnchorFor` | 47 | 0 |
| `constructTokenOf` | 7 | 0 |
| `exemptionKeyFor` | 12 | 0 |
| `maskQuantifiers` | 9 | 0 |
| `normalizeGateLine` | 5 | 0 |
| `nameableRemainder` | 11 | 0 |
| `auditSource` | 1,179 | 0 |
| import set | 4 | 0 |

Compiler-API additions, hand-rolled containment spellings, recogniser narrowing tokens and separator-definition changes were all zero. `CORE11_BOX_EXPECTED` remains the unchecked form once; `.planning/REQUIREMENTS.md` is unchanged from the round base and its CORE-11 row remains `[ ]`. `requirements mark-complete` was never run. `01-PROBE.md` still carries `38 == 27 + 11`; no row moved.

## Reconciliation Findings

1. **Pass 11 surface instrumentation:** the inherited 9,285 -> 9,181 absolute figures included eight instrumentation lines. The uninstrumented pair is 9,277 -> 9,173; the 104-line decoy delta is valid.
2. **Case-insensitive population:** arrival contained ten `enclos` matches, while case-sensitive grep found eight. Plan 01-44 removed three; the close contains seven. The five-item inherited enumeration was not treated as complete.
3. **F-11 population:** four prefix matchers exist in `EXCLUSIONS`, not the two previously named. The gate now avoids a completeness count; the dated four-item enumeration is above.
4. **Task 1 intermediate surface:** the 9,259 probe preceded three final Task 1 lines. The committed Task 1 surface is 9,262; the round close is 9,277 after Task 2's net 15 surface lines.
5. **Identity mutation placement:** inserting the two lines before original raw 700 did not reproduce pass 11's frame. Placing them after original raw 700 reproduced 574/284 and was the run used as evidence.
6. **Plan line references drifted after plans 01-44 and Task 1:** every edit and measurement was re-derived by identifier; no numeric locator was copied into a pin.

## Findings Explicitly Left Open

These are not presented as re-executed or closed:

- **IN-45:** reviewer-reported unreachable non-vacuity counts in the widest-shadow case.
- **IN-46:** reviewer-reported `lo`/`hi` wording as raw lines although they are surface-subset extremes.
- **IN-48:** reviewer-reported divergent duplicate `constructHalf` bodies; overlaps WR-57.
- **IN-49:** reviewer-reported `1,129` versus `~1,130` spelling discrepancy.
- **WR-57:** duplicate `constructHalf` declarations remain unadjudicated and unconsolidated.

IN-47 is not in this open set because pass 11 independently confirmed its bare `REAL_OPENER` element and plan 01-44 removed that private fixture constant.

## Security Position

The open register was re-derived by selecting rows whose severity is `high` and status is `open`. It yields exactly six rows:

| threat | round-11 owner | work performed |
| --- | --- | --- |
| `T-01-289` | 01-44 Task 2 | CR-24 site-one false locator deleted |
| `T-01-283` | 01-44 Task 2 | CR-24 site-two false reach deleted |
| `T-01-263` | 01-44 Task 2 | CR-27 containment claims deleted |
| `T-01-280` | 01-45 Task 1 | maximum owner now pinned independently |
| `T-01-264` | 01-45 Task 1 | named 574-line shadow now has a mechanism under its identity |
| `T-01-239` | 01-45 Task 1 | the identity pin was watched failing against the exact silent mutation |

`T-01-286` is medium and non-blocking. Plan 01-44's CR-25 deletion addresses it, but it is not one of the six and does not count toward `threats_open`.

Closing round 11's full eleven-item work list is the work that would take `threats_open` from 6 to 0: three high/open rows addressed by plan 01-44 and three by plan 01-45, with the remaining five work-list items closing warnings and disclosure residue. Whether the live register **has** reached zero is verification pass 12's measurement, not this summary's claim. CORE-11 therefore remains unchecked.

## Decisions Made

- Kept both size and identity equality; neither substitutes for the other.
- Kept every `EXCLUSIONS` prefix locator and every existing `.from` assertion unchanged.
- Added only the endpoint comparisons needed for WR-62; no containment, parser or recogniser work was introduced.
- Kept WR-57 and four reviewer-reported information findings open.
- Did not mark any requirement complete.

## Deviations from Plan

### Auto-fixed Issues

**1. Round delta initially failed the deletion-round thesis**

- **Found during:** Task 2 closing verifier.
- **Issue:** all functional gates passed, but the cumulative line delta was +4, then 0 after the first compaction.
- **Fix:** compacted only explanatory lines; retained every assertion, literal and watched diagnostic; amended Task 2 and reran the full verifier.
- **Final evidence:** 76 added / 77 removed, net -1.

**2. Exact mutation placement required frame correction**

- **Found during:** Task 1 watched-red exercise.
- **Issue:** the first placement put the two lines before, rather than after, original raw line 700.
- **Fix:** restored, placed them after the original line, and used only the resulting 574/284 run as evidence.

---

**Total deviations:** 2 procedural corrections, no scope expansion.
**Impact on plan:** both corrections made the executed evidence match the prescribed frame; neither changed shipped code or acceptance scope.

## Issues Encountered

- `${TMPDIR}` and `/tmp` differ on this host; the existing round baseline under `${TMPDIR}` was used by the plan verifier, while watched WR-63 logs were written to `/tmp` only as transient evidence.
- The backend build emits a Caido warning that the README's `https://caido.io` link is unsupported by the packager. The package still builds and validates; this pre-existing warning is assessed in the subsequent repository audit rather than silently called a failure here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All 45 Phase 01 plans now have executed task commits. Verification pass 12 still owns the phase verdict, the CORE-11 checkbox and the live security-register disposition. The five open information/unadjudicated findings above remain available to that review and were not converted into blockers by this plan.

The task-wide no-overclaim verdict is narrow: **the new assertions catch the exact identity, endpoint and malformed-key shapes executed here; they do not establish containment, exhaustive recognition, or phase completion.**

## Self-Check: PASSED

- Both task commits exist and remain separate.
- Every plan verifier and the full manual boundary pass after the final amendment.
- All watched mutations were restored; the spec is clean against HEAD.
- No shipped source, requirement checkbox or probe row changed.
- The summary records every measurement disagreement, the negative round delta, all named open residue and the security split without declaring `threats_open: 0`.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-27*
