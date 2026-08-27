---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-27T14:30:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  previous_verified: 2026-08-27T11:40:00Z
  round: 12
  verification_pass: 14
  history: "pass 4 (round 3) -> pass 5 (round 4) -> pass 6 (round 5) -> pass 7 (round 6) -> pass 8 (round 7) -> pass 9 (round 8) -> pass 10 (round 9) -> pass 11 (round 10) -> pass 12 (round 11) -> pass 13 (round 12) -> pass 14 (round 12, waves 46/47). The score has read 8/9 for TWELVE consecutive passes and the open truth has been the same one every time: truth 9, CORE-11 outbound enforcement. CORE-11's box has been flipped and reverted THREE times — `e7cc4b6`, `faca607`, `4105fd0` — and has now stood at `[ ]` for SEVEN consecutive rounds. PASS 13 filed CR-30 (blocker, the first finding in twelve rounds running in the UNSAFE direction), CR-31 and CR-32. PASS 14 IS THE FIRST PASS IN THIS PHASE IN WHICH EVERY NAMED FINDING FROM THE PREVIOUS PASS CLOSES BY CLASS RATHER THAN BY INSTANCE, AND IN WHICH THE `STATE.md` APPEND-ONLY QUESTION IS ANSWERED RATHER THAN DEFERRED: criterion (3) is dischargeable in principle, the pointer-amendment shape at `:408-409` satisfies it, and the criterion is NOT permanently unreachable. The pin's re-derivation 549 -> 540 is ACCOUNTED FOR, proved by an experiment neither executor ran: reverse-applying ONLY CR-30's nine deleted lines returns the shadow to EXACTLY 549 on the SAME owner at span `419..1560`, which is simultaneously the `40572fd` geometry — so the plan's 11-line endpoint miss is confirmed line by line. AND PASS 14 OPENS ONE BLOCKER, CR-33, WHICH IS NOT AN INSTANCE BUT A CLASS WITH TWO LIVE MEMBERS: hand-written line RANGES in the gate file's prose below the registry, each TRUE WHEN WRITTEN and each silently drifted since, describing quantities the suite computes live. Pass 13 read past both. One of them, `:9053`, was ALREADY FALSE ON PASS 13's OWN TREE."
  gaps_closed:
    - "CR-30 — CLOSED, AND CLOSED BY CLASS RATHER THAN BY DELETION. I did not accept the nine-line deletion as the closure; I tested whether the defect can RETURN. It cannot. Reverse-applying CR-30's exact nine lines into the live tree turns the suite RED on TWO independent census cases that did not exist at pass 13: `every .planning/ mention in the gate header is a DECLARED entry` reports `2 header line(s) name a file under \".planning/\" and are DECLARED NOWHERE`, and `the census COUNTS BALANCE` reports `10 matched line(s) while HEADER_PLANNING_MENTIONS declares 8`. Positive control planted independently: one fabricated line `//    This suite byte-compares `.planning/ROADMAP.md` on every run.` inserted at `:650` -> `1 header line(s) ... DECLARED NOWHERE`, 3 failed / 445 passed. NEGATIVE control, confirming the census's own disclosed limit (a) rather than assuming it: the SAME line placed at `:2000`, below the sentinel -> 448 passed, invisible, exactly as the docblock says it will be."
    - "CR-30's CLASS FIX IS REAL DERIVATION, NOT A PASTE — PROVED BY MUTATION. `BYTE_COMPARED_SURFACES` at `:6037` is one frozen constant; `GATE_FILE = [0]` at `:9617` and `LEDGER = [1]` at `:11449` both resolve from it; the generator at `:6103-6118` takes `surfaces: readonly string[]` and renders `${surfaces.length}` and `...surfaces.map((s) => \"  - \" + s)`. I added a THIRD entry, `.planning/WINDOWS.md`, to the constant: the generated text changed to `THE SURFACES THAT COMPARISON REACHES - 3` and BOTH byte-compare cases went red against the shipped `- 2` in BOTH surfaces. A hand-written paste cannot do that. Repo-wide census with `grep -rE` (never `git grep -E`, see regressions) plus a positive control of 18 `REQUIREMENTS.md` code references: `WINDOWS.md` now appears in code on SEVEN lines and ALL SEVEN are either statements of ABSENCE (`:745`, `:928`, `:945`, `:11570`) or the census's own declarations (`:11621`, `:11646`, `:11651`). ZERO live claims that anything reads it."
    - "CR-31 — CLOSED BY CLASS. `grep -c '1573'` = 0, `grep -c 'grow to 573'` = 0, `grep -c 'docblock opener at'` = 0. The pin's five figures are now COMPUTED IN THE RUN and emitted from the failure path; I read them off a live failing run rather than off the comment: `RAW LINES 1133 over that span, of which EXCLUDED 593 are removed by the three exclusions, leaving 540 SURFACE lines, 540 of which resolve to this anchor. ANCHOR WALK ... 0 surface line(s) resolve to a DIFFERENT anchor`. The emission is deliberately UNASSERTED and says so."
    - "THE PIN'S RE-DERIVATION 549 -> 540 — ACCOUNTED FOR, NOT FITTED, ESTABLISHED BY AN EXPERIMENT NEITHER EXECUTOR RAN. Reverse-applying ONLY the nine lines `196d20c` deleted (six at `:597-602`, three at `:791-793`), leaving `WIDEST_ANCHOR_SHADOW = 540` and every other byte untouched: `THE WIDEST ANCHOR SHADOW IS NOW 549 SURFACE LINES AND THIS GATE PINS IT AT 540 ... spanning raw lines 419..1560. RAW LINES 1142 ... EXCLUDED 593`. The pre-round value returns EXACTLY, on the SAME owner — and the span it returns on, `419..1560`, is simultaneously the `40572fd` geometry, so one experiment attributes BOTH halves of the round's movement at once."
    - "THE PLAN'S 11-LINE ENDPOINT MISS — THE EXECUTOR'S ATTRIBUTION IS CORRECT, AND I PROVED THE MECHANISM ON MY OWN MUTATION RATHER THAN REUSING THEIRS. Wave 46 reported the span reads `419..1551` and not the plan's predicted `419..1540`, attributing the 11 to Task 1's rendered surfaces-section lines sitting INSIDE exclusion one. MY TEST: I inserted FOUR lines inside the derived block at `:1000` with the pin forced to emit. Result: span `419..1555` (+4), EXCLUDED `597` (+4), shadow `540` — UNCHANGED. Growth inside exclusion one raises the raw endpoint and the excluded count together and leaves the shadow invariant, exactly as claimed. INDEPENDENT ARITHMETIC, measured on each commit rather than taken from the report: derived block 582 -> 593 at `40572fd` (+11, sentinel unmoved at 958, pin still 549); sentinel 958 -> 949 and block length unchanged at `196d20c` (-9 header lines, pin 549 -> 540). 1549 + 11 - 9 = 1551. The plan's `1540` was written as if Task 1 were ENDPOINT-neutral rather than SHADOW-neutral. That is a prediction error correctly diagnosed, not a fitted pin."
    - "THE PIN BITES IN BOTH DIRECTIONS FROM 540, ON MY MUTATIONS AND NOT THE ROUND'S. GROW: three bare `//` lines after `:650` -> `IS NOW 543 ... PINS IT AT 540`, span `419..1554`, raw 1136, excluded 593. SHRINK: four header prose lines deleted at `:700-703` -> `IS NOW 536 ... PINS IT AT 540`, span `419..1547`, raw 1129, excluded 593. Exact equality, both directions, landing on 543 and 536. The owner token is byte-identical in every run."
    - "CR-32 — CLOSED ON ALL FOUR SIBLING SURFACES, AND THE HEADLINE CLAIM IS TRUE REPO-WIDE. `ONE BOUND, PUBLISHED ONCE`: the live value 540 appears as a shadow bound on EXACTLY ONE line of the entire repository, `packages/backend/src/outbound-prohibition.spec.ts:10252`, and my claim-anchored matcher's positive control fires 1 on `STATE.md:408` before I trust its zero. ROADMAP: the one present-tense clause (`measured with the live builder over all 8,846 surface lines the widest is :417's at 574 surface lines / 1,155 raw`) is DELETED — count 1 -> 0 — and replaced by a dated pointer that names `WIDEST_ANCHOR_SHADOW` and `WIDEST_ANCHOR_TOKEN` and SPELLS NO FIGURE; `574 surface lines` = 0, `8,846` = 0, and the row still says what its plan delivered. 01-SECURITY: three dated closure rows added, each quoting the row's original words and pasting what re-execution returned."
    - "`STATE.md:408` — THE APPEND-ONLY QUESTION, ANSWERED AND DISCHARGED. The pointer amendment is at `:409`, the LITERALLY NEXT LINE, not 101 lines away — which was exactly CR-32's complaint against `d3a139d` and exactly the remedy pass 13 prescribed (`Append a dated POINTER AMENDMENT to .planning/STATE.md:408 ... Do NOT rewrite the entry`). It is dated, it names both superseding commits, it names `WIDEST_ANCHOR_SHADOW` as THE SOLE PUBLICATION, it SPELLS NO FIGURE (verified: the added line carries no `540`, `549` or `574`), it explicitly forbids a later reader harmonising it with `:307`'s different form, and it closes by disclosing that nothing enforces the rule on this surface. I RULE THIS SUFFICIENT and my reasoning is in the report body: criterion (3) is dischargeable in principle and the `:408` shape does NOT make it permanently unreachable."
    - "WAVE 47's DELIBERATE RED WAS CORRECT — INTEGRITY, NOT AN EXCUSE, AND I ESTABLISHED IT BY MEASUREMENT. The two `open`-scoped gates match rows 209, 210 and 213 of `01-SECURITY.md`. ALL THREE SIT INSIDE THE `<details>` BLOCK AT `:200-232` whose `<summary>` at `:201` reads `Historical — the seven-row Open register as audited 2026-08-26 (superseded, kept verbatim)`. I censused every row in the file whose Status cell reads `open`: lines 207-213, SEVEN rows, EVERY ONE inside that block, and the frontmatter reads `threats_open: 0` with `Threat Register — Open` reading `NONE.` There is no live open register. The only way to zero those gates is to edit the Status column of a verbatim historical snapshot — precisely the harm `T-01-318` names (`a gate that reaches green only by destroying the dated history it is supposed to protect`), whose own mitigation clause `or zero over open rows only` is the clause that misfired. The planner foresaw the CLOSED-row hazard and did not foresee that a verbatim snapshot of a FORMER open register also carries `| open |`. Refusing was right."
    - "WAVE 47's REPORT OF ITS OWN PREDICTION AS REFUTED — CONFIRMED AND CORRECTLY HANDLED. The plan predicted `T-01-264`/`T-01-280`/`T-01-286` were LIVE open rows. They are not: all three were already CLOSED with evidence in the Round-11 closure table above, and their `open` copies are the historical snapshot's. The file records the refutation in its own bytes (`Execution refutes that prediction, and it is recorded here rather than quietly fitted to`) and names the structural weakness — the `superseded, kept verbatim` marker sits on the CONTAINER and not on the ROWS, so a reader or a grep meets seven rows that look live. That disclosure is worth more than the closure."
    - "F-2 (WINDOWS entry 46) — I EXERCISED THE UNWATCHED BRANCH NEITHER EXECUTOR REACHED, AND IT IS SOUND. The anchor walk's non-zero foreign-lines report had never been rendered. I duplicated the anchor line `:417` at `:1701` to make one token own two disjoint regions: `ANCHOR WALK over that span: 150 surface line(s) resolve to a DIFFERENT anchor - 1552 -> \"THE SOURCE ROOTS THE PLUGIN SHIPS...\" :: \"* rather than a preference.\"; 1553 -> ...`. Line number, anchor token and trimmed text all render correctly, capped at five. F-2 is downgraded from unwatched to WATCHED ONCE AND CORRECT. It also explains the shadow's top endpoint independently: the accepted construct is the ALL-CAPS heading at `:1551`, so `hi = 1551` is right and the `/**` at `:1550` is not an anchor."
    - "THE THREE FINDINGS ARE GENUINELY FILED, NOT JUST NARRATED. `.planning/WINDOWS.md` entries 45 (`unmet-truth`, F-3, file+line `9147`), 46 (`unrun-verify`, F-2, line `10314`) and 47 (`deviation`, F-1 class) exist as ledger rows with dates, and the frontmatter counters (`open_count: 25`, `total_count: 47`) agree with the row count. Entry 45's text matches my independent measurement of F-3 exactly, including `off by one on arrival and off by eight now`."
    - "ORCHESTRATOR BOOKKEEPING `e6e724a` — HONEST. Waves 46/47 marked `[x]`; the plan counter set to 51 with its derivation inline (`4 SUMMARY in phase 00 + 47 in phase 01`). I counted on disk: `ls .planning/phases/*/[0-9]*-PLAN.md` = 51, phase 01 alone = 47. The commit also states the duration fields `were never captured and are left empty rather than estimated`, which is the correct disposition."
  gaps_remaining:
    - "Truth 9 — CORE-11 outbound enforcement. Criterion (3) THE SOLE BOUND is unmet for the SEVENTH consecutive round, but for a NEW and narrower reason. CR-30, CR-31 and CR-32 all close, and `STATE.md:408` discharges. What blocks it is CR-33: the hand-written line-RANGE class in the gate file's prose below the registry, with TWO live members — `:9147` (`// --- HEADER (1..956) ---`, actual 1..948, off by EIGHT) and `:9053` (`It excludes the registry declaration's whole LINE RANGE — 4135..5767`, actual 4138..5770, off by THREE at both endpoints with the LENGTH still correct at 1633, which is why the sentence looks internally consistent). BOTH WERE TRUE WHEN WRITTEN. BOTH DESCRIBE QUANTITIES THE SUITE COMPUTES LIVE. `:9053` WAS ALREADY FALSE ON PASS 13's OWN TREE."
  regressions:
    - "NOT a code regression — a MEASUREMENT HAZARD that invalidates a census method used in earlier passes. `git grep -E` SILENTLY DROPS `\\b` ON THIS PLATFORM. Verified: `git grep -cE '\\bWINDOWS\\.md' -- <gatefile>` exits 1 with ZERO hits while `grep -cE '\\bWINDOWS\\.md' <gatefile>` returns 7, and `git grep -cE 'WINDOWS\\.md'` (no `\\b`) also returns 7. Wave 47's first census hit this and caught it only with a positive control. EVERY census in this report was run with `grep -rE` and a stated positive control before any zero was trusted."
gaps:
  - truth: "No shipped code can introduce outbound traffic without failing a gate (CORE-11)"
    status: partial
    reason: "The must-NOT itself holds and I re-established it by execution: `pnpm check:bundle` reports the shipped bundle's ENTIRE import set as one specifier, `crypto`; the suite runs 31 files / 1396 tests at exit 0; the gate spec alone runs 448/448; `pnpm typecheck` and `pnpm lint` exit 0; zero debt markers under either source root. Criteria (1) DERIVED and (2) DRIFT-DETECTABLE are discharged and I re-proved (2) by five independent mutations. Criterion (3) THE SOLE BOUND — `the disclosure is the only bound stated on every surface a reader touches, contradicted nowhere` — is NOT discharged, because the gate file's own live bytes state TWO line ranges in the present tense that are false against the geometry the same file computes."
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-33(a) — BLOCKER. `:9147` reads `// --- HEADER (1..956) ---`, the section divider grouping `HEADER_QUANTIFIER_EXEMPTIONS`. MEASURED: `DERIVED_BEGIN` matches at line 949, and `headerRegion()` at `:11667` returns `gateLines.slice(0, at)` — lines 1 up to but NOT including the sentinel — so the header region is 1..948. THE COMMENT IS OFF BY EIGHT. PROVENANCE, measured on each revision rather than inferred: at `516ce1d` (wave 33, the commit that introduced it) the sentinel sat at 957 and the region WAS exactly 1..956 — TRUE WHEN WRITTEN. At `f1ea4d0` (pass 13's tree) the sentinel was 958 and the region 1..957 — already false by one, and pass 13 stated `lines 1..957` in its own prose while the file said 956 and never compared the two. At HEAD it is false by eight, made so by `196d20c` — THE COMMIT THAT DELETED CR-30's NINE LINES AND MOVED THE SENTINEL 958 -> 949 WITHOUT MOVING THIS LOCATOR. That is the CR-31 mechanism reproduced inside the round that deleted CR-31's instance and installed the emission fix designed to prevent exactly it."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-33(b) — BLOCKER, AND THIS IS THE ONE THAT MAKES IT A CLASS RATHER THAN AN INSTANCE. `:9053` states, present tense and unmarked: `It excludes the registry declaration's whole LINE RANGE — 4135..5767, 1633 lines, re-measured at wave 37`. MEASURED by replicating the suite's own resolvers (`lineOf(l => l.startsWith('export const RESOLVER_REGISTRY'))` and `closingBracketAfter` with `CLOSES_FROZEN_ARRAY = /^\\]( as [^)]*)?\\);$/`): the live range is 4138..5770. BOTH ENDPOINTS ARE OFF BY THREE. The LENGTH, 1633, is still correct — which is why the sentence reads as internally consistent and why fourteen passes have gone past it. PROVENANCE: at `1330e99` (wave 37, WR-48's own fix) the live range WAS 4135..5767 — TRUE WHEN WRITTEN. At `f1ea4d0` it was 4136..5768 — ALREADY FALSE ON PASS 13's TREE, and pass 13 did not catch it. At HEAD, 4138..5770. Note that `:9065`, `:9067`, `:9986`, `:10030` and `:10574` carry the same digits in PAST-TENSE narratives of the wave-37 change and are accurate DATED HISTORY; `:9053` is the only one that asserts the range LIVE. The `500..3000` band cited in those sentences is TRUE — `band: [500, 3000]` is live at `:10112`."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-33(c) — WHY THIS IS THE CLASS AND NOT TWO ACCIDENTS. Both members sit in surface #2 of pass 13's table, `gate file prose below the registry`. Both were TRUE WHEN WRITTEN and drifted silently. Both state a quantity the suite ALREADY COMPUTES: `headerRegion()` for (a), `registryStart`/`closingBracketAfter(registryStart)` for (b). Neither is reached by any mechanical check — the round's new header census discloses this itself at limit (a) (`IT REACHES THE HEADER AND NO FURTHER ... Prose below the registry is not scanned by it at all`), which I confirmed by negative control: the same fabricated mechanism claim reds at `:650` and is invisible at `:2000`. So the round BUILT the deriving functions and applied the emission discipline to the pin's five numbers ONLY, without sweeping the file for the same shape. The file's own rule at `:11698` lists the three dispositions — DELETE, MAKE IT DERIVED, DECLARE — and neither member has had any of them applied."
    missing:
      - "EMIT, DO NOT CORRECT. Delete `:9053`'s `4135..5767, 1633 lines` and `:9147`'s `(1..956)`. If the extent must be visible, render it from the values the suite already resolves — `registryStart`, `closingBracketAfter(registryStart)` and `headerRegion().length` — into a failure message on a path that already fails, exactly as `196d20c` did for the pin's five figures. A CORRECTED RANGE IS STILL A HAND-WRITTEN ONE, and the file states this itself at `:744-746`: `THEY ARE DELETED RATHER THAN RE-DATED ... A corrected sentence is still an AUTHORED bound standing beside a DERIVED one, which is how seven consecutive waves each fixed a stale claim here and each acquired the next.` Both members of CR-33 are proof of that sentence: each was a correct number when written."
      - "THEN SWEEP THE CLASS RATHER THAN THE TWO INSTANCES. My census of the gate file found EIGHT `N..M` range expressions (`:9053`, `:9065`, `:9067`, `:9147`, `:9986`, `:9988`, `:10030`, `:10574`) and exactly TWO distinct `` `:NNNN` `` line citations (`:417`, correct and confirmed against the pin's owner and span start; and `:931`, which cites `01-39-SUMMARY.md` and not this file). Six of the eight ranges are accurate dated history. A one-line guard asserting that no line of the gate file outside the machine-owned span matches a bare `N..M` self-reference — or a census of them on the model of `HEADER_PLANNING_MENTIONS`, with a declared reason per entry — closes the class in the same shape the round already proved works for `.planning/` mentions."
      - "CONSIDER EXTENDING THE HEADER CENSUS BELOW THE SENTINEL. Limit (a) is honestly disclosed but it is now the region carrying BOTH live blockers. The census machinery is already written and its non-vacuity guards already exist; widening `headerRegion()` to a second censused region below the registry costs a declaration list, not a mechanism."
      - "Once and only once CR-33 is closed, re-measure criterion (3) across the seven surfaces in one session and, if it discharges, flip `.planning/REQUIREMENTS.md:46` and `CORE11_BOX_EXPECTED` at `packages/backend/src/outbound-prohibition.spec.ts:11471` IN THE SAME COMMIT. NOTE THE LINE NUMBER MOVED AGAIN: pass 12 cited `:11414`, pass 13 cited `:11389`, it is now `:11471`. Current value `const CORE11_BOX_EXPECTED = \"- [ ] **CORE-11**\";` and current row `- [ ] **CORE-11**: ...`; required values on discharge are `const CORE11_BOX_EXPECTED = \"- [x] **CORE-11**\";` and `- [x] **CORE-11**: ...`."
deferred:
  - truth: "STORE-08 — schema coverage for `entities`, `evidence` and `audit`"
    addressed_in: "Phase 4 (SEC-*) and Phase 5"
    evidence: "REQUIREMENTS.md — \"`entities` and `evidence` are owned by Phase 4 (SEC-*); `audit` by Phase 5. Building them empty in Phase 1 would ship three tables with no writer.\" Its `[ ]` is by design, not a phase-01 gap."
behavior_unverified_items: []
coincidental_reliance_items: []
human_verification: []
---

# Phase 01: Skeleton, Persistence & Compatibility — Verification Report (PASS 14)

**Phase Goal:** A Caido plugin skeleton that ingests passively, persists per project, and refuses to run on an unsupported host — with no outbound traffic of any kind.
**Verified:** 2026-08-27T14:30:00Z
**Status:** gaps_found
**Re-verification:** Yes — round 12 (waves 46/47), verification pass 14, superseding pass 13 of 2026-08-27T11:40Z.

---

## Baseline, re-established rather than inherited

| Command | Expected | Measured | Status |
| --- | --- | --- | --- |
| `pnpm test` | 31 files / 1396 tests, exit 0 | `Test Files 31 passed (31)`, `Tests 1396 passed (1396)`, exit 0 | ✓ |
| gate spec alone | 448 | `Test Files 1 passed (1)`, `Tests 448 passed (448)` | ✓ |
| `pnpm typecheck` | exit 0 | exit 0 | ✓ |
| `pnpm lint` | exit 0 | exit 0 | ✓ |
| `pnpm check:bundle` | exactly one specifier, `crypto` | `packages/backend/dist/index.js: 1 import specifier(s): crypto` | ✓ |

Arrival at pass 13 was 1390; +6 census cases lands at 1396, as predicted.

**Tree discipline.** Seven mutations were planted in `packages/backend/src/outbound-prohibition.spec.ts` this session and every one restored with `git checkout --` (never `cp`, which this environment aliases to `cp -i` and which refuses silently). Final state proved rather than asserted: `git diff --exit-code -- packages/` returns 0, `git status --short` is empty, the gate file's md5 is `2f8361d33081e216721f9364c0e29750` — byte-identical to the digest taken before the first mutation — and the full suite re-runs 31/1396 after the restore.

**A measurement hazard that invalidates a method, recorded before anything that depends on it.** `git grep -E` silently drops `\b` on this platform: `git grep -cE '\bWINDOWS\.md'` exits 1 with **zero** hits while `grep -cE '\bWINDOWS\.md'` returns **7**, and dropping the `\b` makes `git grep` agree at 7. A false zero, and it fails *closed-looking*. Every census below was run with `grep -rE` and every zero is preceded by a stated positive control.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `onInterceptResponse` non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `hooks/passive.ts:117` — *"NOT async — it returns"*; wired at `index.ts:31` (registered last). Green in 1396 tests. |
| 2 | Work queue bounded, overflow count visible, never unbounded | ✓ VERIFIED | `hooks/passive.ts:40` — *"BOUNDED. The queue drops the oldest entry at cap"*; `telemetry.ts:100` — *"(CORE-03 visible overflow)"*. Re-read this session. |
| 3 | 200-chunk SPA leaves plugin UI and RPC responsive; max synchronous slice recorded | ✓ VERIFIED | `results/spa-load.json`, 6,185 bytes, taken from **outside** the process by an external REST prober (decision P5-D3) against `caido-cli 0.57.1`. Re-confirmed present. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `store/analyses.ts:113` — `ON CONFLICT (project_id, sha256, detector_set_hash) DO NOTHING`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; non-UTF-8 fixture round-trips | ✓ VERIFIED | `ingest/consumer.ts:181` — `toRaw(): Uint8Array`. |
| 6 | CI gate fails the build if the backend bundle imports outside the Phase 0 allowlist | ✓ VERIFIED | **Executed:** `1 import specifier(s): crypto`, exit 0. |
| 7 | Below-minimum Caido produces a clear message, not an obscure failure | ✓ VERIFIED | `compat.ts:45` — `export const MIN_CAIDO = "0.57.1";` |
| 8 | Redaction: no query-string value from a target-controlled URL reaches `observations.url` | ✓ VERIFIED | `store/observations.ts:55` `QUERY_VALUE_REDACTION`, with the idempotence note at `:176`. Confirmed live on Caido 0.58.2 by UAT round-2 test 7. |
| 9 | **No shipped code can introduce outbound traffic without failing a gate (CORE-11)** | **✗ FAILED (partial)** | **The one that does not hold, for the twelfth pass running.** The must-NOT holds and I re-executed it. Criteria (1) and (2) discharge. Criterion (3) does not — see CR-33. |

**Score:** 8/9 truths verified (0 present, behavior-unverified)

---

## The four questions I was asked to own, answered by measurement

### 1. Is 540 ACCOUNTED FOR, or FITTED?

**Accounted for — and I established it with an experiment neither executor ran.**

**The decisive test.** I reverse-applied *only* the nine lines `196d20c` deleted — six at `:597-602`, three at `:791-793` — leaving `WIDEST_ANCHOR_SHADOW = 540` and every other byte untouched:

> `THE WIDEST ANCHOR SHADOW IS NOW 549 SURFACE LINES AND THIS GATE PINS IT AT 540. The anchor that owns it is "SPELLING (operator, by POSITION) RESOLVED BY REPORTS", spanning raw lines 419..1560. RAW LINES 1142 ... EXCLUDED 593 ... leaving 549 SURFACE lines.`

The pre-round value returns **exactly**, on the **same owner**. And the span it returns on — `419..1560` — is *simultaneously* the `40572fd` geometry, so this one experiment attributes both halves of the round's movement at once. A fitted pin cannot do that.

**Independent commit-by-commit arithmetic**, measured on each revision rather than read out of the report:

| Commit | derived block | sentinel | pin | shadow span |
| --- | --- | --- | --- | --- |
| `f1ea4d0` (round base) | 958..1539 = **582** | 958 | 549 | 419..1549 |
| `40572fd` (Task 1, surfaces rendered) | 958..1550 = **593** (+11) | 958 | 549 | 419..**1560** |
| `196d20c` (Task 2, CR-30's nine deleted) | 949..1541 = **593** | **949** (−9) | **540** (−9) | 419..**1551** |
| `117eaff` / HEAD | 949..1541 = 593 | 949 | 540 | 419..1551 |

`1549 + 11 − 9 = 1551`. `1133 raw − 593 excluded = 540`. Every figure reconciles.

**And the attribution MECHANISM proved on my own mutation, not theirs.** The executor's claim was that Task 1's growth sat *inside* exclusion one, raising the raw endpoint and the excluded count together and leaving the shadow invariant. I tested that directly: four lines inserted at `:1000`, inside the derived block, with the pin forced to emit.

> span `419..1555` (**+4**), `EXCLUDED 597` (**+4**), `540 SURFACE lines` — **unchanged**.

Confirmed. The plan's `1540` was written as if Task 1 were *endpoint*-neutral rather than *shadow*-neutral. That is a prediction error correctly diagnosed by the executor, not a pin fitted to a number it cannot account for.

**The pin bites both ways from 540, on my mutations.**

| Mutation | Result |
| --- | --- |
| +3 bare `//` lines after `:650` | `IS NOW 543 … PINS IT AT 540`, span `419..1554`, raw 1136, excluded 593 |
| −4 header prose lines `:700-703` | `IS NOW 536 … PINS IT AT 540`, span `419..1547`, raw 1129, excluded 593 |
| +4 lines inside exclusion one at `:1000` | `IS NOW 540` — **invariant**, span `419..1555`, excluded 597 |
| reverse-apply CR-30's 9 lines | `IS NOW 549`, span `419..1560`, excluded 593, **same owner** |

**Bonus: I exercised the branch neither executor reached.** F-2 (WINDOWS entry 46) filed the anchor walk's non-zero foreign-lines report as never rendered. I duplicated the anchor line `:417` at `:1701` so one token owns two disjoint regions:

> `ANCHOR WALK over that span: 150 surface line(s) resolve to a DIFFERENT anchor - 1552 -> "THE SOURCE ROOTS THE PLUGIN SHIPS…" :: "* rather than a preference."; 1553 -> …`

Line number, anchor token and trimmed text all render, capped at five. **F-2 downgrades from unwatched to watched once and correct.** It also independently explains the shadow's top endpoint: the accepted construct is the ALL-CAPS heading at `:1551`, so `hi = 1551` is right and the `/**` at `:1550` is not an anchor.

### 2. Was wave 47's deliberate RED correct?

**Yes. Integrity, not an excuse — and the difference is exactly what I was told to check: whether the rows really are kept-verbatim history. They are.**

The two `open`-scoped gates match rows **209, 210 and 213** of `01-SECURITY.md`. All three sit inside the `<details>` block at `:200-232`, whose `<summary>` at `:201` reads:

> `Historical — the seven-row Open register as audited 2026-08-26 (superseded, kept verbatim)`

I did not stop at the three. I censused **every** row in the file whose Status cell reads `open`: lines **207–213**, seven rows, **every one inside that block**. The frontmatter reads `threats_open: 0`; *Threat Register — Open* reads `NONE.` **There is no live open register in this file.** One hundred per cent of the gates' matches are inside a container explicitly marked superseded.

Reaching 0 requires editing the Status column of a verbatim snapshot — which is precisely the harm `T-01-318` was written to prevent: *"a gate that reaches green only by destroying the dated history it is supposed to protect."* Its own mitigation clause, *"or zero over `open` rows only"*, is the clause that misfired. The planner foresaw the CLOSED-row hazard and scoped to `open` to avoid it; what the planner did not foresee is that a verbatim snapshot of a **former** open register also carries `| open |`. **`open`-scoping is not a live/history discriminator on a file that preserves history verbatim.**

Filed honestly as WINDOWS entry 47, and the file names the structural weakness in its own bytes: *"That marker sits on the container and not on the rows, so a reader — or a `grep` for `| open |` — meets seven rows that look live."* That disclosure is worth more than the closure would have been.

### 3. `STATE.md:408` — is criterion (3) dischargeable in principle, or permanently unreachable?

**Dischargeable. The `:408` shape does not make it permanently unreachable, and the pointer amendment at `:409` satisfies it.** This phase has never had to answer this and it should not have to again.

**What is actually on disk.** `:408` still reads, present tense: *"The interchangeability residual **is republished** as the measured width of the anchor's SHADOW — 574 surface lines at the header row :417, raw 419..1574."* `:409` — the **literally next line** — is a dated pointer amendment that: names the entry directly above as its sole target; states that pass 13 filed exactly it as CR-32; names both superseding commits; names `WIDEST_ANCHOR_SHADOW` as *"THE SOLE PUBLICATION OF THE LIVE VALUE"*; **spells no figure at all**; explicitly forbids a later reader harmonising it with `:307`'s different form; and closes by disclosing that nothing enforces the rule on this surface.

**Why that discharges — four reasons, in ascending weight.**

1. **It is the remedy pass 13 itself prescribed**, verbatim: *"Append a dated POINTER AMENDMENT to `.planning/STATE.md:408` … Do NOT rewrite the entry."* CR-32's actual complaint was never that the pointer form is wrong; it was that `d3a139d` attached the pointer to `:307`, **101 lines above**, under an unrelated decision. The distance was the defect. The distance is now **one line**.

2. **This phase's own operative standard already accepts external marking.** Pass 13 adjudicated two surviving `574` sites inside the gate file — `:10160` and `:10271` — as *"History. Attributed to a named pass, past tense … Neither states a current bound,"* and called the split *"defensible, not a convenient exemption."* The rule that emerges is: **a statement is a contradiction if a reader can take it for a current bound; it is history if it is marked as superseded.** Tense is one marker. A dated adjacent pointer naming the superseding commits is another.

3. **Demanding the marker be *internal* demands a rewrite, and the same rule forbids rewriting.** An append-only ledger amended by pointer necessarily leaves the superseded sentence in place — that is what append-only *means*. If an in-place present-tense sentence permanently fails criterion (3), then criterion (3) is unsatisfiable by any action available on that surface, and a criterion no available action can satisfy is not a criterion. It would also be self-defeating: the only route to green would be to rewrite the record of what was believed and when, which is the exact harm `T-01-314` and `T-01-318` exist to prevent and which the gate file names at `:929-931`.

4. **And this amendment is strictly better than the alternative in the one way that has repeatedly bitten this phase: it cannot go stale.** Every prior corrective sentence here acquired the next defect by restating a number — CR-31 was born inside the commit closing CR-29. This one contains no figure that any future commit can falsify. Verified: the added line carries no `540`, `549` or `574`. It is the first correction in this phase's history with that property, and CR-33 below is a fresh demonstration of why the property matters.

**So the discharge condition, stated so a later round can apply it rather than re-litigate it:** on an append-only surface, a superseded present-tense bound is discharged by an amendment that is (a) **adjacent** to the entry it supersedes, (b) **dated**, (c) **figure-free**, and (d) **names the sole live publication**. All four hold at `:408-409`. `.planning/STATE.md` is no longer a criterion-(3) contradiction.

The residual is disclosed rather than hidden, in the amendment's own closing words: *"THE POINTER-NOT-A-BOUND RULE STILL HAS NO MECHANICAL CHECK HERE: this file is CLASS ONE UNGUARDED … and saying so is the whole of the guarantee available on this surface."*

### 4. Is CORE-11's box earned?

**No. Do not flip it.** `.planning/REQUIREMENTS.md:46` stays `- [ ] **CORE-11**: …` and `CORE11_BOX_EXPECTED` at `packages/backend/src/outbound-prohibition.spec.ts:11471` stays `"- [ ] **CORE-11**"`. When it does discharge, the required values are `- [x] **CORE-11**: …` and `const CORE11_BOX_EXPECTED = "- [x] **CORE-11**";`, in one commit. (The constant has now moved three times: `:11414` → `:11389` → `:11471`.)

The reason is **not** `STATE.md:408`, which discharges. It is CR-33.

---

## CR-33 — the blocker, and it is a class with two live members

Fourteen passes have hunted the header prose, the anchoring machinery, the exemption keys, the pin and the reference tables. Nobody censused the file's **hand-written line ranges**.

### (a) `:9147` — the header extent, off by EIGHT

```
    // --- HEADER (1..956) ---
```

`DERIVED_BEGIN` matches at line **949**. `headerRegion()` at `:11667` returns `gateLines.slice(0, at)` — line 1 up to but not including the sentinel. The header region is **1..948**.

| Revision | live region | comment says | error |
| --- | --- | --- | --- |
| `516ce1d` (wave 33, introduced it) | **1..956** | 1..956 | **0 — true when written** |
| `f1ea4d0` (pass 13's tree) | 1..957 | 1..956 | 1 |
| HEAD | **1..948** | 1..956 | **8** |

It was made eight-wrong by `196d20c` — **the commit that deleted CR-30's nine lines and moved the sentinel 958 → 949 without moving this locator.** That is the CR-31 mechanism, verbatim, reproduced inside the round that deleted CR-31's instance and installed the emission fix designed to prevent exactly it. Pass 13 stated *"lines 1..957"* in its own prose while the file said 956, and never compared the two.

### (b) `:9053` — exclusion three's range, off by THREE at both endpoints

```
 *     4135..5767, 1633 lines, re-measured at wave 37 — and a line range would
```

The full sentence is present tense and unmarked: *"It excludes the registry declaration's whole LINE RANGE — 4135..5767, 1633 lines, re-measured at wave 37."*

Measured by replicating the suite's own resolvers — `lineOf(l => l.startsWith("export const RESOLVER_REGISTRY"))` and `closingBracketAfter` with `CLOSES_FROZEN_ARRAY = /^\]( as [^)]*)?\);$/`:

| Revision | live range | comment says | error |
| --- | --- | --- | --- |
| `1330e99` (wave 37, WR-48's own fix) | **4135..5767** | 4135..5767 | **0 — true when written** |
| `f1ea4d0` (pass 13's tree) | 4136..5768 | 4135..5767 | **1 — already false at pass 13** |
| HEAD | **4138..5770** | 4135..5767 | **3** |

**The length, 1633, is still correct** (`5770 − 4138 + 1 = 1633`), which is why the sentence reads as internally consistent and why fourteen passes have gone past it. And `:9053` was **already false on pass 13's own tree** — this is not a defect wave 46 created.

The neighbouring sites are clean and I checked each: `:9065`, `:9067`, `:9986`, `:10030` and `:10574` carry the same digits inside **past-tense narratives** of the wave-37 change (*"therefore ran"*, *"went from … to"*, *"did not catch it"*), accurate dated history of a state where 4135 was correct. `:9053` is the only one that asserts the range **live**. The `500..3000` band those sentences cite is **true** — `band: [500, 3000]` is live at `:10112`.

### Why this is one class and not two accidents

Both members: sit in **surface #2** of pass 13's table (*gate file prose below the registry*); were **true when written**; drifted silently; and state a quantity **the suite already computes** — `headerRegion()` for (a), `registryStart` / `closingBracketAfter(registryStart)` for (b).

Neither is reached by any mechanical check, and the round's own new census says so. Its limit (a): *"IT REACHES THE HEADER AND NO FURTHER … Prose below the registry is not scanned by it at all."* I confirmed that by **negative control** rather than by reading it: one fabricated mechanism claim reds at `:650` and is **invisible** at `:2000`.

So the round **built the deriving functions and applied the emission discipline to the pin's five numbers only**, without sweeping the file for the same shape. The file's own rule at `:11698` lists three dispositions — DELETE, MAKE IT DERIVED, DECLARE. Neither member has had any applied.

### The class question, answered as asked

**Instance fourteen sits in BOTH categories, and that is the finding.** It is in a region the round **explicitly declined to convert and named as such** — the census's disclosed limit (a) — while being **trivially derivable by the other mechanism the round built in the same commit range**. `headerRegion()` did not exist before `196d20c`; the round created the function that measures the very quantity `:9147` gets wrong, in the same file, and did not connect them.

And instance **fifteen** shows the class is older than the round: `:9053` was already false when pass 13 signed off.

**Pass 11's convergence prediction is confirmed a third time**, and for the second consecutive round by the closing commit itself. Pass 13 wrote: *"the next round writes the fourteenth instance into the paragraph correcting the thirteenth."* It did — and a fifteenth was already sitting there unread.

---

## Criterion (3), surface by surface

| # | Surface | What this round did | Criterion (3) verdict |
| --- | --- | --- | --- |
| 1 | gate file header, 1..948 | `.planning/` mention census installed; CR-30's nine lines deleted; surface set derived into both compared spans | ✓ **DISCHARGED** — reintroduction turns the suite red on two cases; positive + negative controls executed |
| 2 | gate file prose below the registry | CR-31's hand-written pin arithmetic deleted and emitted from computation | ✗ **BLOCKS** — CR-33(a) `:9147` off by 8, CR-33(b) `:9053` off by 3 |
| 3 | `REQUIREMENTS.md` above the sentinel | derived span now carries the rendered surface set; box pinned by bytes | ✓ **DISCHARGED** — byte-compare proved live by mutating `BYTE_COMPARED_SURFACES` |
| 4 | `.planning/STATE.md` | dated, adjacent, figure-free pointer amendment at `:409` | ✓ **DISCHARGED** — see question 3 |
| 5 | `.planning/WINDOWS.md` | pointer-not-a-copy since wave 27; three findings filed as entries 45/46/47 | ✓ — carries no bound; counters agree with row count |
| 6 | `.planning/ROADMAP.md` | the one live clause **deleted**, replaced by a figure-free dated pointer | ✓ **DISCHARGED** — `measured with the live builder` 1 → 0, `574 surface lines` 0, `8,846` 0 |
| 7 | phase artifacts | `01-SECURITY.md` re-adjudicated with dated closure rows; historical block left verbatim with an explicit "read as a dated snapshot" pointer | ✓ — dated history, correctly marked |

**One bound, published once — proved repo-wide.** The live value **540** appears as a shadow bound on **exactly one line of the entire repository**: `outbound-prohibition.spec.ts:10252`. My claim-anchored matcher's positive control fires 1 on `STATE.md:408` before I trust that zero.

**Six of seven surfaces discharge. One does not, and it is the gate file's own live bytes.**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `packages/backend/src/hooks/passive.ts` | non-async hook, bounded queue | ✓ VERIFIED | `:117`, `:40` |
| `packages/backend/src/ingest/consumer.ts` | raw bytes | ✓ VERIFIED | `:181` `toRaw(): Uint8Array` |
| `packages/backend/src/store/analyses.ts` | project-keyed, dedup | ✓ VERIFIED | `:113` `ON CONFLICT … DO NOTHING` |
| `packages/backend/src/store/observations.ts` | query-value redaction | ✓ VERIFIED | `:55`, `:176` |
| `packages/backend/src/compat.ts` | min-version refusal | ✓ VERIFIED | `:45` `MIN_CAIDO = "0.57.1"` |
| `packages/backend/src/telemetry.ts` | overflow counter | ✓ VERIFIED | `:100` |
| `scripts/ci/check-bundle-imports.mjs` | one specifier | ✓ VERIFIED | executed: `crypto` |
| `.../results/spa-load.json` | external SPA-load evidence | ✓ VERIFIED | 6,185 bytes |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 gate: derived + drift-detectable + sole bound | ⚠️ **PARTIAL** | derived ✓, drift-detectable ✓ (five mutations), **sole bound ✗ — CR-33 at `:9053` and `:9147`** |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `index.ts:31` | `hooks/passive.ts:117` | `sdk.events.onInterceptResponse` | ✓ WIRED | registered last |
| `BYTE_COMPARED_SURFACES:6037` | `GATE_FILE:9617`, `LEDGER:11449` | index resolution | ✓ WIRED | one frozen constant, both readers resolve from it |
| `BYTE_COMPARED_SURFACES:6037` | both compared spans | rendered by the two-argument generator `:6103-6118` | ✓ WIRED | **proved by mutation** — a third entry renders `- 3` and reds both byte-compares |
| gate registry | `REQUIREMENTS.md` CORE-11 span | `deriveResidual(REGISTRY, SURFACES)` byte compare | ✓ WIRED | `:11503` |
| gate registry | gate header span `949..1541` | same byte compare | ✓ WIRED | 593 lines |
| `WIDEST_ANCHOR_SHADOW:10252` | live shadow measurement | exact equality over `SURFACE_LINES` | ✓ WIRED | four mutations: 543, 536, 549, 540-invariant |
| `WIDEST_ANCHOR_TOKEN:10253` | owner of the maximum | identity equality | ✓ WIRED | byte-identical owner in every run |
| `headerRegion():11667` | `DERIVED_BEGIN` full-line match | census region bound | ✓ WIRED | non-vacuity asserted before the rules; positive + negative controls executed |
| `HEADER_PLANNING_MENTIONS` | every `.planning/` mention in 1..948 | set + staleness + count-balance | ✓ WIRED | reintroducing CR-30 reds two cases |
| `:9147` `(1..956)` | `headerRegion()` | *claimed:* the header extent | ✗ **NOT WIRED** | hand-written; **false by 8** |
| `:9053` `4135..5767` | `registryStart` / `closingBracketAfter` | *claimed:* exclusion three's live range | ✗ **NOT WIRED** | hand-written; **false by 3 at both endpoints** |
| `CORE11_BOX_EXPECTED:11471` | `REQUIREMENTS.md:46` | full-line `startsWith` | ✓ WIRED | pins `- [ ] **CORE-11**`. **Line moved `:11389` → `:11471`.** |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Real Data | Status |
| --- | --- | --- | --- | --- |
| both derived residual spans | span text | `deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES)` | ✓ | ✓ FLOWING |
| rendered surface list | `surfaces.length`, `surfaces.map` | `BYTE_COMPARED_SURFACES` | ✓ | ✓ FLOWING — proved by mutation |
| pin | `WIDEST_ANCHOR_SHADOW` | `constructAnchorFor` over `SURFACE_LINES`, exhaustive by construction | ✓ | ✓ FLOWING |
| pin's five emitted figures | span, raw, excluded, surface, foreign | computed in the run, unasserted | ✓ | ✓ FLOWING — all five read off a live failing run |
| header census | `headerPlanningHits()` | `headerRegion()` + path prefix | ✓ | ✓ FLOWING |
| `:9147` header extent | — | **hand-written, nothing computes it into the comment** | ✗ | ✗ **STATIC** (and wrong by 8) |
| `:9053` exclusion-three range | — | **hand-written** | ✗ | ✗ **STATIC** (and wrong by 3) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full suite | `pnpm test` | 31 files / 1396 tests, exit 0 | ✓ PASS |
| Gate spec alone | `vitest run …/outbound-prohibition.spec.ts` | 448/448 | ✓ PASS |
| Types / lint | `pnpm typecheck`, `pnpm lint` | exit 0, exit 0 | ✓ PASS |
| Bundle import set | `pnpm check:bundle` | `1 import specifier(s): crypto` | ✓ PASS |
| Pin bites UP | +3 `//` after `:650` | `543` vs 540, span `419..1554` | ✓ PASS |
| Pin bites DOWN | −4 prose lines `:700-703` | `536` vs 540, span `419..1547` | ✓ PASS |
| Exclusion-one growth is shadow-neutral | +4 lines at `:1000` | `540` invariant, span +4, excluded +4 | ✓ PASS |
| Pin attributes the 9 | reverse-apply CR-30's nine lines | `549` vs 540, span `419..1560`, same owner | ✓ PASS |
| Census bites (positive control) | fabricated `.planning/` claim at `:650` | `1 header line(s) … DECLARED NOWHERE` | ✓ PASS |
| Census limit (a) (negative control) | same line at `:2000` | 448 passed — invisible, as disclosed | ✓ PASS |
| CR-30 cannot return | reverse-apply its nine lines | 2 census cases red | ✓ PASS |
| Surface set is derived | third entry in `BYTE_COMPARED_SURFACES` | `- 3` rendered, both byte-compares red | ✓ PASS |
| Foreign-branch rendering (F-2) | duplicate anchor at `:1701` | `150 surface line(s) … DIFFERENT anchor`, 5 listed | ✓ PASS |
| `WINDOWS.md` read by code | `grep -rE` + positive control (18 `REQUIREMENTS.md` hits) | 7 hits, all absence-statements or census declarations | ✓ PASS |
| `540` as a bound repo-wide | claim-anchored matcher + positive control | exactly 1 line: `:10252` | ✓ PASS |
| `:9147` header extent | `headerRegion()` vs comment | 1..948 vs 1..956 | ✗ **FAIL** — CR-33(a) |
| `:9053` exclusion-three range | resolver replication vs comment | 4138..5770 vs 4135..5767 | ✗ **FAIL** — CR-33(b) |

### Probe Execution

| Probe | Command | Result | Status |
| --- | --- | --- | --- |
| `scripts/*/tests/probe-*.sh` | `find scripts -path '*/tests/probe-*.sh'` | none declared for this phase | ? SKIP |

### Requirements Coverage

24 requirement IDs declared across 47 plan frontmatters. All 24 exist in `REQUIREMENTS.md`; none orphaned; no plan claims an ID the ledger lacks.

| Requirement | Status | Evidence |
| --- | --- | --- |
| `CORE-01`…`CORE-10`, `COMPAT-01/02`, `DIST-05/06`, `ENC-01`, `STORE-01`…`STORE-07` | ✓ SATISFIED | 22 of 24, all `[x]`, covered by truths 1-8 |
| `CORE-11` | ✗ **BLOCKED** | `[ ]` at `REQUIREMENTS.md:46`. Criterion (3) unmet — CR-33. |
| `STORE-08` | ⤳ DEFERRED | `[ ]` by design; Phase 4 / Phase 5 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `packages/backend/src/outbound-prohibition.spec.ts` | 9147 | `// --- HEADER (1..956) ---` while `headerRegion()` returns 1..948 | 🛑 Blocker | present-tense hand-written geometry, false by 8, in live bytes; true when written at `516ce1d` |
| `packages/backend/src/outbound-prohibition.spec.ts` | 9053 | `It excludes the registry declaration's whole LINE RANGE — 4135..5767` while the live range is 4138..5770 | 🛑 Blocker | false by 3 at both endpoints, length still correct; true when written at `1330e99`; already false at pass 13 |
| `.planning/phases/…/01-47-PLAN.md` | Task 2 verify | `open`-scoped gates use `\| open \|` as a live/history discriminator on a file that keeps history verbatim | ⚠️ Warning | unsatisfiable without falsifying a `superseded, kept verbatim` record; correctly refused, filed as WINDOWS 47 |
| shipped source (`packages/backend/src`, `packages/engine/src`) | — | `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` | ℹ️ Info | **zero occurrences** |

### Human Verification Required

None. UAT round 2 (`01-UAT.md`, 2026-08-27) ran 18 operator-observable checkpoints at 18 passed / 0 issues, and at test 18 the operator explicitly confirmed CORE-11 is a VERIFICATION item rather than a UAT gap. Everything open on this phase is programmatically measurable and was measured here.

---

## Gaps Summary

**This is the best round this phase has had, and it still does not discharge.**

Both waves do what they say. CR-30 closes **by class**, not by deletion — I proved it by reintroducing its exact nine lines and watching two census cases that did not exist at pass 13 turn red, with a positive control at `:650` and a negative control at `:2000` confirming the census's disclosed reach in both directions. The class fix is real derivation, not a paste: adding a third entry to `BYTE_COMPARED_SURFACES` renders `- 3` into both compared spans and reds both byte-compares. CR-31 closes by class — `1573`, `grow to 573` and `docblock opener at` are all zero, and the pin's five figures are computed in the run. CR-32 closes on all four sibling surfaces, and *one bound, published once* is now literally true: the live value 540 appears as a bound on exactly one line of the repository.

**540 is accounted for.** Reverse-applying only CR-30's nine deleted lines returns the shadow to exactly 549 on exactly the same owner, at span `419..1560` — which is simultaneously the `40572fd` geometry, so one experiment attributes both halves of the round's movement. The plan's 11-line endpoint miss is correctly diagnosed: I inserted four lines inside exclusion one and watched the endpoint rise by four, the excluded count rise by four, and the shadow stay at 540. Shadow-neutral, not endpoint-neutral, exactly as reported.

**Wave 47's deliberate red was correct.** Every row in `01-SECURITY.md` whose Status cell reads `open` — all seven — sits inside a `<details>` block explicitly marked *superseded, kept verbatim*, and `threats_open` is 0. There is no live open register. Zeroing those gates means falsifying the record, which is the harm `T-01-318` names and whose own `open`-scoping clause misfired.

**And `STATE.md:408` discharges.** The pointer amendment is adjacent, dated, figure-free and names the sole publication. Demanding an internal marker would demand a rewrite that the append-only rule forbids — a bar no available action can clear. Criterion (3) is **dischargeable in principle**; the `:408` shape does not make it permanently unreachable, and I have written the four-part condition down so a later round can apply it rather than re-litigate it.

**What blocks it is CR-33, and it is a class rather than an instance.** The gate file's prose below the registry carries **two** hand-written line ranges in the present tense: `:9147` says the header is `1..956` when `headerRegion()` returns 1..948, and `:9053` says exclusion three runs `4135..5767` when the suite's own resolvers put it at 4138..5770. **Both were true when written** — at `516ce1d` and `1330e99` respectively — and both have drifted silently since. `:9053` was **already false on pass 13's own tree**. `:9147` was made eight-wrong by `196d20c`, the very commit that deleted CR-30's nine lines and installed the emission fix designed to prevent this exact shape.

That is the finding. The round built `headerRegion()`, built the census, and proved the emission discipline works — then applied it to the pin's five numbers only, and did not sweep the file for the same shape. Instance fourteen sits in a region the round **named as unreachable** by the census it built while being **trivially derivable** by the function it built in the same commit. Instance fifteen shows the class predates the round.

**Nothing leaked.** 1,396 tests green, `check:bundle` at one specifier `crypto`, zero debt markers under either source root, tree byte-identical after seven mutations. CR-33 is a false disclosure in a test-only gate — but criterion (3) is *"contradicted nowhere"*, and two present-tense false statements about the file's own geometry, in the file's own live bytes, is a contradiction.

**The box is NOT earned.** `.planning/REQUIREMENTS.md:46` stays `- [ ] **CORE-11**: …` and `CORE11_BOX_EXPECTED` at `packages/backend/src/outbound-prohibition.spec.ts:11471` stays `"- [ ] **CORE-11**"`. On discharge they become `- [x] **CORE-11**: …` and `const CORE11_BOX_EXPECTED = "- [x] **CORE-11**";`, in one commit.

---

_Verified: 2026-08-27T14:30:00Z_
_Verifier: Claude (gsd-verifier), verification pass 14_
