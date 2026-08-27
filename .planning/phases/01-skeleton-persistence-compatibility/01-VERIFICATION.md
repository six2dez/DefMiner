---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-27T11:40:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  previous_verified: 2026-08-27T08:40:00Z
  round: 12
  verification_pass: 13
  history: "pass 4 (round 3) -> pass 5 (round 4) -> pass 6 (round 5) -> pass 7 (round 6) -> pass 8 (round 7) -> pass 9 (round 8) -> pass 10 (round 9) -> pass 11 (round 10) -> pass 12 (round 11) -> pass 13 (round 12). The score has read 8/9 for ELEVEN consecutive passes and the open truth has been the same one every time: truth 9, CORE-11 outbound enforcement. CORE-11's box has been flipped and reverted THREE times — `e7cc4b6`, `faca607`, `4105fd0` — and has now stood at `[ ]` for SIX consecutive rounds with the pin, the ledger row and every verification agreeing. PASS 12 WAS THE FIRST ROUND IN WHICH EVERY FINDING THE PREVIOUS PASS RAISED CLOSED, and it opened exactly one new finding, CR-29. PASS 13 AUDITS FOUR ORCHESTRATOR-AUTHORED COMMITS THAT NO GAP-CLOSURE PLAN PRODUCED AND NOBODY HAD REVIEWED. CR-29 CLOSES, IN ALL THREE OF ITS PARTS, AND THE RE-DERIVED PIN IS ACCOUNTED FOR RATHER THAN FITTED — PROVED BY REVERSE-APPLYING THE COMMIT'S OWN DELETIONS AND WATCHING 549 GO BACK TO 574 ON THE SAME OWNER. The round opens ONE blocker and TWO warnings. The blocker, CR-30, is not in anything the four commits wrote: it is a claim the gate header has carried since WAVE 25 that twelve passes have read past, and it is the first finding in this phase's stream that runs in the UNSAFE direction — prose promising a machine check that does not exist, on the exact surface whose unguardedness the same file names 337 lines below."
  gaps_closed:
    - "CR-29 — CLOSED IN ALL THREE PARTS, AND I EXECUTED EACH RATHER THAN READING `08345c3`'s MESSAGE. (a) `:440-447`, the eight header-table rows asserting `(ok && globalThis).fetch(url)`, `(b ? navigator : x).sendBeacon(u, d)` and `(b ? eval : x)(src)` against `NOTHING`, `[]` and `OPEN and UNOWNED`, are GONE — the diff is a pure deletion of eight lines. I re-executed all three through the shipped `auditSource` this session and all three still report (`outbound-fetch`, `outbound-beacon`, `outbound-dynamic-code`), so the deletion removed a false statement rather than a true one. (b) `:454-460`'s `This is THE ONE BOUND` and its four-surface citation are GONE (6 lines deleted, 1 replacement clause added). (c) `:745-755`'s authored five-item `WHAT REMAINS SILENT` enumeration is GONE (12 lines deleted). Diff arithmetic reconciles exactly: 36 deletions, 11 insertions, of which the three content hunks account for 8 + (6-1) + 12 = 25 net-removed lines, and `wc -l` moved 11502 -> 11477."
    - "CR-29's KEPT-SENTENCE ARGUMENT — TESTED AND UPHELD. The commit kept `:441-444` (`Everything in the NOTHING rows is a measured silence ... They are asserted below as silences and labelled as such`) on the argument that the four surviving NOTHING rows are genuine measured silences, so the promise becomes TRUE of what is left. I did not take that argument; I executed all four rows through the shipped `auditSource`: `const k = b ? someName : otherName; sdk[k].send(req)` -> `[]` and its inline twin -> `[]` (`:394`); `const a=\"requests\"; const b=a; sdk[b].send(req)` -> `[]` (`:404`); `function f(ctx, root) { return ctx[root].send(req); }` -> `[]` (`:405`); `for (const key of [\"requests\"]) { cur[key].send(req); }` -> `[]` and the `sdk[key]` twin -> `[]` (`:406`). All four silent. And each IS asserted below and labelled: `:404` at `:7773` (`through NOTHING: the KEY contrast — TWO HOPS is still silent ... — A MEASURED SILENCE`); `:405`/`:406` at `:8336` (`through NOTHING, and that is residual (b)`); `:394` at `:7936-7938` under the comment `AND THE PAIR WITH NEITHER OPERAND READABLE STAYS SILENT AT BOTH SITES`. The sentence is now true of every row it governs."
    - "CR-29's DELETION-LOSES-NOTHING ARGUMENT — TESTED AND UPHELD, AND THIS IS THE PART THAT MATTERED MOST. `:745-755` named six things: TWO HOPS OF KEY, a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, a name bound in ANOTHER FILE, and WR-26's NUMERIC_MEMBERS name heuristic that fails OPEN. Every one of the six survives INSIDE THE MACHINE-OWNED DERIVED SPAN (`:958-1539`), which is byte-compared to `deriveResidual(RESOLVER_REGISTRY)`: `silence-two-hop-key` at `:1357`, `silence-function-boundary` at `:1364`, `silence-parameter-key` at `:1371`, `silence-cross-file-key` at `:1400`, `silence-for-of-binding-receiver` at `:1449`, and the `constStrings` clause at `:1011` naming all four key-side shapes in one sentence; WR-26 at `:1300` (`The NUMERIC_MEMBERS half is a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed`), generated from the registry row at `:5214`. NO DISCLOSURE WAS LOST — every item moved from a hand-written list nobody could see change to a machine-derived one the suite byte-compares. That is the class-closing move, not an instance fix."
    - "THE PIN'S RE-DERIVATION 574 -> 549 — ACCOUNTED FOR, NOT FITTED, AND I ESTABLISHED IT BY MEASUREMENT RATHER THAN BY ARITHMETIC ON THE COMMIT'S CLAIMS. THE DECISIVE EXPERIMENT: I reverse-applied ONLY the commit's three content hunks against the live tree — restoring exactly the 25 deleted lines while leaving `WIDEST_ANCHOR_SHADOW = 549` and every other byte untouched — and ran the gate spec. `Tests 1 failed | 441 passed (442)`: `THE WIDEST ANCHOR SHADOW IS NOW 574 SURFACE LINES AND THIS GATE PINS IT AT 549. The anchor that owns it is \"SPELLING (operator, by POSITION) RESOLVED BY REPORTS\", spanning raw lines 419..1574.` The pre-commit value returns EXACTLY, on the SAME OWNER, when and only when those 25 lines return. The drop of 25 is therefore attributable line by line to lines that commit removed and to nothing else."
    - "THE PIN BITES IN BOTH DIRECTIONS FROM 549, ON MY OWN MUTATIONS AND NOT THE COMMIT'S. The commit watched one `//` line at `:500`; I did not reuse it. GROW: two bare `//` lines inserted after `:650` -> `Tests 1 failed | 441 passed (442)`, `THE WIDEST ANCHOR SHADOW IS NOW 551 SURFACE LINES AND THIS GATE PINS IT AT 549 ... spanning raw lines 419..1551`. SHRINK: three mid-paragraph prose lines deleted at `:649-651` -> `Tests 1 failed | 441 passed (442)`, `THE WIDEST ANCHOR SHADOW IS NOW 546 SURFACE LINES AND THIS GATE PINS IT AT 549 ... spanning raw lines 419..1546`. Exact equality, both directions, +2 and -3 landing on 551 and 546."
    - "NO UNDISCLOSED ENDPOINT OR LENGTH CHANGE. Measured on both revisions rather than inferred: exclusion one at `e879a73` was 983..1564 (582 lines); at HEAD it is 958..1539 (582 lines) — both endpoints moved by exactly -25, the LENGTH is identical, and every deletion sits above 958 so none of them fell inside it. `RESOLVER_REGISTRY` moved 4161 -> 4136 and `UNBOUNDED_QUANTIFIERS` 5985 -> 5960, both -25 and both outside the shadow's raw span. `1549 - 419 + 1 = 1131`; `1131 - 582 = 549`, agreeing with the executed measurement. The identity assertion stayed green in every one of the four runs above — `WIDEST_ANCHOR_TOKEN` is a CONTEXT line in the diff, unchanged, and the owner string in all four failure messages is byte-identical."
    - "NO SHIPPED OCCURRENCE WAS SILENTLY DELETED WITH THOSE 25 LINES. The suite pins the occurrence/exemption equality at `:10578` (`the surface carries N declared-phrasing occurrence(s) outside the three exclusions while HEADER_QUANTIFIER_EXEMPTIONS holds M entr(ies)`), the commit touched no exemption entry, and the whole suite is green — so no declared-phrasing occurrence left the surface. The header's `FOUR shipped occurrences` count is intact."
    - "574 IS GONE FROM EVERY LIVE SITE INSIDE THE GATE FILE, CENSUSED. `grep -n \"574\\|549\"` returns 549 at `:9072`, `:9363`, `:10154`, `:10188`, `:10190-10191`, the constant at `:10194`, `:10616` and the failure-message string at `:10632` — the eight the commit names. 574 survives at exactly two sites and both are DATED HISTORICAL and defensible: `:10160` (`pass 11 measured the named shadow falling from 574 to 284 at 441 of 441 green` — attributed to a named pass, past tense) and `:10271` (`RESULT: the pin reported — but it reported a SHRINK, 574 -> 567` — pass 10's re-run, past tense). Neither states a current bound. The historical/live split is defensible, not a convenient exemption."
    - "`efe93e8` / T-01-263 — RE-CENSUSED AND STILL CLOSED. A case-insensitive sweep of `enclos` over the live file returns exactly THREE hits, the same three pass 12 adjudicated, renumbered by -25: `:9355` (`NOT THE SAME AS THE FINEST ENCLOSING CONSTRUCT` — a negation drawing the disowning statement's own distinction), `:9370` (the disowning statement itself), `:11104` (`when its enclosing construct changed` — a fact about where a relocated sentence SITS, not about what the scan resolves). The four sites the commit rewrote read `the next construct ABOVE`. I did not need to doubt pass 12 on this and I do not."
    - "`d3a139d` — DOES WHAT IT SAYS AND NO MORE. `.planning/STATE.md:307`'s P9-D3 entry carries a `POINTER AMENDMENT 2026-08-27 (verification pass 12, CR-29)` recording that `THE SENTENCE ABOVE OPENING \"THE GATE FILE'S HAND-WRITTEN HEADER NOW STATES NO BOUND OF ITS OWN\" WAS FALSE WHEN IT WAS WRITTEN`, correcting by pointer rather than rewrite, and closing `THIS AMENDMENT POINTS AND STATES NO BOUND: it does NOT claim the header now states none.` I read the whole amendment: it makes no claim I can falsify, and its restraint on the very question this pass owns is correct."
  gaps_remaining:
    - "Truth 9 — CORE-11 outbound enforcement. Criterion (3) THE SOLE BOUND is unmet for the SIXTH consecutive round. CR-29 is closed in all three parts. What blocks it now is CR-30, which is older than every finding this phase has raised and has never been read: the gate header promises a MACHINE CHECK on `.planning/WINDOWS.md` that does not exist and never did, and the same file names that surface as mechanically unreachable 337 lines below."
  regressions: []
gaps:
  - truth: "No shipped code can introduce outbound traffic without failing a gate (CORE-11)"
    status: partial
    reason: "The must-NOT itself holds and I re-established it by execution: `pnpm check:bundle` reports the shipped bundle's ENTIRE import set as one specifier, `crypto`; the suite runs 31 files / 1390 tests at exit 0; the gate spec alone runs 442/442; every outbound shape I probed through the shipped `auditSource` reports. Criteria (1) DERIVED and (2) DRIFT-DETECTABLE are discharged and I re-confirmed (2) by mutation in four independent runs. Criterion (3) THE SOLE BOUND — `the disclosure is the only bound stated on every surface a reader touches, contradicted nowhere` — is NOT discharged, because the gate header tells a reader twice, in the present tense and unmarked, that a machine check compares the residual against `.planning/WINDOWS.md`, and no such check exists anywhere in the repository."
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-30 — BLOCKER, AND THE FIRST FINDING IN THIS PHASE'S STREAM THAT RUNS IN THE UNSAFE DIRECTION. `:600-603` states: `RE-DERIVED from the branches above and RENDERED PROGRAMMATICALLY into `.planning/WINDOWS.md` from one canonical source, so \"the same words rather than two paraphrases\" is a machine check and not a promise. If the two disagree, the code wins and the prose is the defect.` `:794-796` states the same thing again: `AUTHORED ONCE and rendered into this block and into `.planning/WINDOWS.md` from the same bytes, exactly as the wave-25 block above was, so \"the same words rather than two paraphrases\" stays a check rather than a promise.` MEASURED THIS SESSION: NOTHING IN THE REPOSITORY READS `.planning/WINDOWS.md`. The suite reads exactly two files — `GATE_FILE` at `:9566` and `LEDGER = \".planning/REQUIREMENTS.md\"` at `:11367`. A grep for `WINDOWS.md` across `packages/`, `scripts/` and every `.ts`/`.mjs`/`.js` in the tree returns FIVE hits and ALL FIVE are comment lines in this same file — `:601`, `:751`, `:794`, `:937`, `:954`. There is no renderer: `scripts/` holds `ci/`, `phase1/` and `spike/` and none of them writes WINDOWS.md, and `01-25-SUMMARY.md:18` describes the act as `authored ONCE and rendered programmatically into the gate header and WINDOWS.md entry 28` — a one-time plan-time paste, never an ongoing comparison. THE SAME FILE SAYS THE OPPOSITE 337 LINES BELOW, at `:937-943`: `.planning/STATE.md` and `.planning/WINDOWS.md` carry a POINTER to those two and restate NO bound of their own ... THAT POINTER-NOT-A-BOUND RULE IS A PROHIBITION WITH NO MECHANICAL CHECK - the byte comparison reaches these two surfaces and no further`. `.planning/REQUIREMENTS.md:170` agrees and names it: `CLASS ONE, UNGUARDED FILES: .planning/STATE.md and .planning/WINDOWS.md, reached by NO mechanical comparison at all`."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-30(b) — the same claim is false a SECOND way, and that is what makes it a criterion (3) contradiction rather than a stale mechanism note. `.planning/WINDOWS.md` has carried NO copy of the residual since wave 27: its entry 32 reads `POINTER, NOT A COPY — WAVE 27 (plan 01-27). SUPERSEDES ENTRY 31, which carried the WAVE-26 bound as text. From this wave this ledger RESTATES NO BOUND`, and entries 33 through 41 each restate that. So `the same words rather than two paraphrases` names an agreement between a text that exists and a text that was deliberately removed eighteen waves ago. In the same breath, `:603-605` states `REQUIREMENTS.md` and `STATE.md` still carry OLDER text and are deliberately untouched here` — contradicted at `:934-936`, where `.planning/REQUIREMENTS.md`'s CORE-11 entry is one of exactly TWO surfaces byte-compared to `deriveResidual(RESOLVER_REGISTRY)`. Three false statements about which surfaces are guarded, in one six-line paragraph, on the surface criterion (3) governs."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "CR-31 — WARNING. `:10192`, inside the pin's own derivation comment, reads `Across raw 419..1549, this session's evaluation of all five recognisers accepts only the `/**` docblock opener at 1573`. MEASURED: `1573` is not inside `419..1549` — the sentence names a line as being inside a range that excludes it. Line 1573 is `// The surfaces, as tokens the walk matches on, so the rule table below and the`, an ordinary `//` comment. The `/**` docblock opener the sentence means is at 1548 (1573 - 25), and 1549 is its first content line — the geometry is preserved exactly, only the number was not moved. Every companion number in that same comment moved by -25 (`1574 -> 1549`, `1156 -> 1131`, `574 -> 549`); this one did not. THIS IS WR-64's SENTENCE — the one pass 12 closed WR-64 on — re-falsified by the commit that re-derived the pin, and `08345c3`'s message claims `The pin and every LIVE restatement of 574 are re-derived to 549`. The pin still measures correctly; the prose describing how it was derived does not."
      - path: ".planning/STATE.md"
        issue: "CR-32 — WARNING. `:408` publishes the shadow bound present-tense at the pre-commit value: `The interchangeability residual IS republished as the measured width of the anchor's SHADOW — 574 surface lines at the header row :417, raw 419..1574 — and pinned by EXACT EQUALITY`. The gate publishes 549 / raw 419..1549 at eight live sites. The entry carries no date, no wave marker and no pointer; the `### Decisions` section it sits in has 151 entries and 19 date strings, so `append-only DATED HISTORY` — the gate's own characterisation at `:938` — is not what a reader meets at `:408`. `d3a139d` DID append a pointer that mentions `re-derived the widest-anchor-shadow pin 574 -> 549`, but it is attached to the P9-D3 entry at `:307`, 101 lines above, under a decision about alias tracking. This is CR-25's shape — one bound published at two values — relocated across files. STATE.md is append-only by the gate's own rule, so the remedy is a pointer amendment ON THAT ENTRY, not a rewrite of it."
    missing:
      - "DELETE `:600-605` and `:794-796`'s machine-check clauses. The wave-33 disposition applies verbatim and the file states it at `:744-746`: `THEY ARE DELETED RATHER THAN RE-DATED ... A corrected sentence is still an AUTHORED bound standing beside a DERIVED one, which is how seven consecutive waves each fixed a stale claim here and each acquired the next.` A corrected mechanism sentence is the same thing. There is no honest correction available that keeps the claim: `.planning/WINDOWS.md` carries no residual to compare and no check to compare it with."
      - "Correct `:10192`'s `1573` to `1548`, or — better, and this is the class fix rather than the instance fix — emit the accepted line number from the pin's own computation into its failure message instead of hand-writing it in a comment that must be re-derived by hand every time a line moves."
      - "Append a dated POINTER AMENDMENT to `.planning/STATE.md:408` recording that the wave-42 figure it states was re-derived to 549 / raw 419..1549 by `08345c3` on 2026-08-27, attributed line by line to 25 deleted lines. Do NOT rewrite the entry — the pointer-not-a-bound rule at `:937-943` forbids regenerating a block inside an append-only history, and `d3a139d` is the correct precedent."
      - "CONSIDER, and this is the only route I can see that closes the CLASS rather than the thirteenth instance: derive the SET OF BYTE-COMPARED SURFACES the way the residual is already derived. The suite already knows it — `GATE_FILE` at `:9566` and `LEDGER` at `:11367` are the whole of it. Render that set into the header from those two constants and byte-compare it, and a sentence naming `.planning/WINDOWS.md` as machine-checked cannot survive a run. Without that, the next round writes the fourteenth instance into the paragraph correcting the thirteenth, exactly as pass 11 predicted and CR-31 has now demonstrated inside a single commit."
      - "Once and only once all of the above are done, re-measure criterion (3) across the four surfaces in one session and, if it discharges, flip `.planning/REQUIREMENTS.md:46` and `CORE11_BOX_EXPECTED` at `packages/backend/src/outbound-prohibition.spec.ts:11389` IN THE SAME COMMIT. NOTE THE LINE NUMBER MOVED: pass 12 cited `:11414`; after `08345c3`'s 25 deletions the constant is at `:11389`."
deferred:
  - truth: "STORE-08 — schema coverage for `entities`, `evidence` and `audit`"
    addressed_in: "Phase 4 (SEC-*) and Phase 5"
    evidence: "REQUIREMENTS.md:790 — \"`entities` and `evidence` are owned by Phase 4 (SEC-*); `audit` by Phase 5. Building them empty in Phase 1 would ship three tables with no writer.\" Its `[ ]` is by design, not a phase-01 gap."
behavior_unverified_items: []
coincidental_reliance_items: []
human_verification: []
---

# Phase 01: Skeleton, Persistence & Compatibility — Verification Report (PASS 13)

**Phase Goal:** A Caido plugin skeleton that ingests passively, persists per project, and refuses to run on an unsupported host — with no outbound traffic of any kind.
**Verified:** 2026-08-27T11:40:00Z
**Status:** gaps_found
**Re-verification:** Yes — round 12, verification pass 13, superseding pass 12 of 2026-08-27T08:40Z.

---

## Baseline, re-established rather than inherited

| Command | Expected | Measured | Status |
| --- | --- | --- | --- |
| `pnpm test` | 31 files / 1390 tests, exit 0 | `Test Files 31 passed (31)`, `Tests 1390 passed (1390)`, exit 0 | ✓ |
| `pnpm typecheck` | exit 0 | `tsc --build`, exit 0 | ✓ |
| `pnpm lint` | exit 0 | `eslint .`, exit 0 | ✓ |
| `pnpm check:bundle` | exactly one specifier, `crypto` | `packages/backend/dist/index.js: 1 import specifier(s): crypto` | ✓ |
| gate spec alone | 442 | `Test Files 1 passed (1)`, `Tests 442 passed (442)` | ✓ |

**Tree discipline.** Three mutations were planted in `packages/backend/src/outbound-prohibition.spec.ts` this session and all three restored with `git checkout --` (not `cp` — the environment aliases it to `cp -i`, which refuses silently). One temporary probe spec, `packages/backend/src/zz-probe13.spec.ts`, was created to reach the exported `auditSource` and was deleted. Final state: `git diff --exit-code -- packages/` returns 0, `git status --short` shows only the pre-existing untracked `.gsd/`, the gate file's md5 is `16c779f26911edb2439b21e43ba950cc` — byte-identical to the backup taken before the first mutation — and the gate spec re-runs 442/442 after the restore.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `onInterceptResponse` non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `hooks/passive.ts:117` — *"NOT async — it returns"*; wired at `index.ts:321` `sdk.events.onInterceptResponse(...)`, registered last per `index.ts:31`. Green in 1390 tests. |
| 2 | Work queue bounded, overflow count visible, never unbounded | ✓ VERIFIED | `hooks/passive.ts:40` — *"BOUNDED. The queue drops the oldest entry at cap"*; `telemetry.ts:100` — *"(CORE-03 visible overflow)"*. Re-read this session. |
| 3 | 200-chunk SPA leaves plugin UI and RPC responsive; max synchronous slice recorded | ✓ VERIFIED | `.planning/phases/01-skeleton-persistence-compatibility/results/spa-load.json`, 6,185 bytes, taken from **outside** the process by an external REST prober (decision P5-D3) against `caido-cli 0.57.1`. Re-confirmed present this session. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `store/analyses.ts:113` — `ON CONFLICT (project_id, sha256, detector_set_hash) DO NOTHING`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; non-UTF-8 fixture round-trips | ✓ VERIFIED | `ingest/consumer.ts:189` `const raw = body.toRaw();`. |
| 6 | CI gate fails the build if the backend bundle imports outside the Phase 0 allowlist | ✓ VERIFIED | **Executed this session:** `packages/backend/dist/index.js: 1 import specifier(s): crypto`, exit 0. |
| 7 | Below-minimum Caido produces a clear message, not an obscure failure | ✓ VERIFIED | `compat.ts:45` `export const MIN_CAIDO = "0.57.1";` with the user-facing message downstream. |
| 8 | Redaction: no query-string value from a target-controlled URL reaches `observations.url` | ✓ VERIFIED | `store/observations.ts:55` `QUERY_VALUE_REDACTION`, applied at `:205`. Confirmed live on Caido 0.58.2 by UAT round-2 test 7. |
| 9 | **No shipped code can introduce outbound traffic without failing a gate (CORE-11)** | **✗ FAILED (partial)** | **The one that does not hold, for the eleventh pass running.** The must-NOT holds and I re-executed it. Criteria (1) and (2) discharge. Criterion (3) does not — see CR-30. |

**Score:** 8/9 truths verified (0 present, behavior-unverified)

---

## What I was asked to be hardest on, answered by measurement

### Is 549 ACCOUNTED FOR, or FITTED?

**Accounted for.** I did not reason from the commit's arithmetic; I ran an experiment it did not run.

**The decisive experiment.** I reverse-applied *only* the three content hunks of `08345c3` — putting the 25 deleted lines back while leaving `WIDEST_ANCHOR_SHADOW = 549` and every other byte of the live file untouched — and ran the gate spec:

> `THE WIDEST ANCHOR SHADOW IS NOW 574 SURFACE LINES AND THIS GATE PINS IT AT 549. The anchor that owns it is "SPELLING (operator, by POSITION) RESOLVED BY REPORTS", spanning raw lines 419..1574.`

The pre-commit value returns **exactly**, on the **same owner**, when and only when those 25 lines return. A fitted pin cannot do that: it would return some *other* number, or the same number for the wrong reason. The 25-line drop is attributable line by line, and the attribution is now executed rather than asserted.

**Both directions, on my mutations rather than the commit's.** The commit watched one `//` line at `:500`. I did not reuse it.

| Mutation | Where | Result |
| --- | --- | --- |
| +2 bare `//` lines | after `:650` (inside shadow, outside exclusion) | `1 failed \| 441 passed` — `IS NOW 551 ... PINS IT AT 549`, span `419..1551` |
| −3 mid-paragraph prose lines | `:649-651` | `1 failed \| 441 passed` — `IS NOW 546 ... PINS IT AT 549`, span `419..1546` |
| +25 (the commit's own deletions, reversed) | `:440-447`, `:455-460`, `:745-756` | `1 failed \| 441 passed` — `IS NOW 574 ... PINS IT AT 549`, span `419..1574` |

Exact equality, both directions, landing on 551, 546 and 574 — the arithmetic the pin claims.

**Undisclosed endpoint or length changes: none.** Measured on both revisions rather than inferred.

| Item | `e879a73` | HEAD | Δ |
| --- | --- | --- | --- |
| exclusion one span | 983..1564 | 958..1539 | both endpoints −25 |
| exclusion one **length** | 582 | 582 | **0** |
| `RESOLVER_REGISTRY` opens | 4161 | 4136 | −25 |
| `UNBOUNDED_QUANTIFIERS` opens | 5985 | 5960 | −25 |
| file | 11502 | 11477 | −25 |

`1549 − 419 + 1 = 1131`; `1131 − 582 = 549`. Every deletion sits above 958, so none fell inside exclusion one. The commit's phrase *"no other endpoint moves"* is loose — exclusions two and three shift by 25 as well — but no **length** changed and nothing outside the shadow's raw span affects the measurement.

**The identity pin genuinely stayed green.** `WIDEST_ANCHOR_TOKEN` is a **context** line in the diff, not a changed one, and the owner string is byte-identical in all four failure messages above.

**And no shipped occurrence went with the 25 lines.** The suite pins the occurrence/exemption equality at `:10578`, the commit touched no exemption entry, and the suite is green — so no declared-phrasing occurrence left the surface. The `FOUR shipped occurrences` count is intact.

### Is 549 published consistently? Is any live surface still carrying 574?

Inside the gate file, **yes and no respectively**. `grep` returns 549 at all eight sites the commit names. 574 survives at exactly two, both dated and attributed, both defensible:

| Line | Text | Adjudication |
| --- | --- | --- |
| `:10160` | `pass 11 measured the named shadow falling from 574 to 284 at 441 of 441 green` | History. Attributed to a named pass, past tense. Reproduces against that pass's tree. |
| `:10271` | `RESULT: the pin reported — but it reported a SHRINK, 574 -> 567` | History. Pass 10's re-run at wave 42, past tense. |

The historical/live split is **defensible, not a convenient exemption**: both surviving uses name the pass that measured them and neither states a current bound. Rewriting them would destroy the record, which is the same reason the file gives for not regenerating STATE.md.

**Outside the gate file the answer is no** — see CR-32. `.planning/STATE.md:408` still says `is republished as ... 574 surface lines ... raw 419..1574`, present tense, undated, unpointed.

### Do the deletions themselves lose anything?

**No, and this is the part of `08345c3` that is better than its commit message claims.** Every one of the six items in the deleted `:745-755` enumeration survives **inside the machine-owned derived span** `:958-1539`, which is byte-compared to `deriveResidual(RESOLVER_REGISTRY)`:

| Deleted item | Survives as | At |
| --- | --- | --- |
| TWO HOPS OF KEY | `silence-two-hop-key` | `:1357` |
| a value crossing a FUNCTION BOUNDARY | `silence-function-boundary` | `:1364` |
| a PARAMETER | `silence-parameter-key` | `:1371` |
| a LOOP BINDING | `silence-for-of-binding-receiver` + the `constStrings` clause | `:1449`, `:1011` |
| a name bound in ANOTHER FILE | `silence-cross-file-key` | `:1400` |
| WR-26 / NUMERIC_MEMBERS fails OPEN | the `isProvablyNumeric` clause, generated from the registry row at `:5214` | `:1300` |

That is not a deletion of disclosure. It is a **migration of disclosure from a hand-written list nobody could see change to a machine-derived one the suite byte-compares** — the only move in this phase's history that closes a class rather than an instance.

### Does `:449-452` become true of what is left? I executed the four remaining rows.

| Header row | Probe through the shipped `auditSource` | Result | Asserted below as a silence? |
| --- | --- | --- | --- |
| `:394` | `const k = b ? someName : otherName; sdk[k].send(req)` | `[]` | ✓ `:7936-7938`, under *"AND THE PAIR WITH NEITHER OPERAND READABLE STAYS SILENT AT BOTH SITES"* |
| `:394` twin | `sdk[b ? someName : otherName].send(req)` | `[]` | ✓ same |
| `:404` | `const a="requests"; const b=a; sdk[b].send(req)` | `[]` | ✓ `:7773` — *"TWO HOPS is still silent … A MEASURED SILENCE"* |
| `:405` | `function f(ctx, root) { return ctx[root].send(req); }` | `[]` | ✓ `:8336` — *"through NOTHING, and that is residual (b)"* |
| `:406` | `for (const key of ["requests"]) { cur[key].send(req); }` | `[]` | ✓ same |
| `:406` twin | `for (const key of ["requests"]) { sdk[key].send(req); }` | `[]` | ✓ same |

**The commit's argument holds.** All four surviving `NOTHING` rows are genuine measured silences and each is asserted below and labelled. And the three deleted rows still report — `(ok && globalThis).fetch(url)` → `["outbound-fetch"]`, `(b ? navigator : x).sendBeacon(u, d)` → `["outbound-beacon"]`, `(b ? eval : x)(src)` → `["outbound-dynamic-code"]` — confirming pass 12's CR-29 was real and deletion was the right disposition.

---

## CR-30 — the blocker, and it is older than every finding this phase has raised

Twelve passes hunted the anchoring machinery, the exemption keys and the header's reference table. Nobody read the paragraph that introduces the header's residual.

**`:600-603`, present tense, unmarked:**

> *"RE-DERIVED from the branches above and RENDERED PROGRAMMATICALLY into `.planning/WINDOWS.md` from one canonical source, so "the same words rather than two paraphrases" **is a machine check and not a promise**. If the two disagree, the code wins and the prose is the defect. `REQUIREMENTS.md` and `STATE.md` still carry OLDER text and are deliberately untouched here."*

**`:794-796`, the same claim again:**

> *"AUTHORED ONCE and rendered into this block and into `.planning/WINDOWS.md` from the same bytes, exactly as the wave-25 block above was, so "the same words rather than two paraphrases" **stays a check rather than a promise**."*

### Measured

**Nothing in the repository reads `.planning/WINDOWS.md`.** The suite reads exactly two files: `GATE_FILE` (`:9566`) and `LEDGER = ".planning/REQUIREMENTS.md"` (`:11367`). A grep for `WINDOWS.md` across `packages/`, `scripts/` and every `.ts` / `.mjs` / `.js` in the tree returns **five hits, all five comment lines in this same file** — `:601`, `:751`, `:794`, `:937`, `:954`. `scripts/` holds `ci/`, `phase1/` and `spike/`; none writes WINDOWS.md. There is no renderer, and `01-25-SUMMARY.md:18` describes the act as *"authored ONCE and rendered programmatically into the gate header and `WINDOWS.md` entry 28"* — a one-time plan-time paste, never an ongoing comparison.

**The same file states the opposite, 337 lines below, at `:937-943`:**

> *"`.planning/STATE.md` and `.planning/WINDOWS.md` carry a POINTER to those two and restate NO bound of their own … **THAT POINTER-NOT-A-BOUND RULE IS A PROHIBITION WITH NO MECHANICAL CHECK** — the byte comparison reaches these two surfaces and no further — and it is named as an unguarded limit rather than left implicit."*

`.planning/REQUIREMENTS.md:170` agrees and names it by class: *"CLASS ONE, UNGUARDED FILES: `.planning/STATE.md` and `.planning/WINDOWS.md`, reached by NO mechanical comparison at all."*

**And it is false a second way.** `.planning/WINDOWS.md` has carried no copy of the residual since wave 27. Its entry 32 reads *"POINTER, NOT A COPY — WAVE 27 (plan 01-27). SUPERSEDES ENTRY 31, which carried the WAVE-26 bound as text. From this wave this ledger RESTATES NO BOUND"*, and entries 33 through 41 each restate that. So *"the same words rather than two paraphrases"* claims an agreement between a text that exists and a text deliberately removed eighteen waves ago.

**And a third.** `:603-605` says *"`REQUIREMENTS.md` and `STATE.md` still carry OLDER text and are deliberately untouched here"* — contradicted at `:934-936`, where `REQUIREMENTS.md`'s CORE-11 entry is one of exactly **two** surfaces byte-compared to `deriveResidual(RESOLVER_REGISTRY)`.

### Why this is criterion (3), and why the direction matters this time

Criterion (3) is *"the disclosure is the only bound stated on every surface a reader touches, contradicted nowhere"*, and REQUIREMENTS.md:154 records that it was *"delivered in wave 33 by **deleting the gate file's hand-written bounds** rather than by guarding them."* These two paragraphs head the two hand-written residual blocks wave 33 did not reach, and they tell a reader that those blocks are machine-guaranteed to agree with a third surface. A reader who believes them stops checking.

**CR-29 ran in the safe direction** — the gate reached further than its header admitted. **CR-30 runs the other way.** It promises a guarantee that does not exist, on the one surface the file elsewhere names as mechanically unreachable. It is the precise mechanism by which WINDOWS.md entries 22 through 31 accumulated superseded bounds that no round caught: nobody checked, because the header said a machine did.

**The counter-argument, stated so the operator can override it.** Both blocks are wave-labelled (`THE FINAL RESIDUAL, AFTER PLAN 01-25`, `THE NARROWING, AFTER PLAN 01-26`) and both carry supersession statements about their *residual text* (`WAVE 27 REPLACES THIS AUTHORED TEXT WITH ONE DERIVED FROM THE CODE`, `:772-773`). A reader who follows those markers knows the residual is superseded. But no marker reaches the **mechanism** clause, and the file's own wave-33 disposition at `:744-746` answers this directly: *"THEY ARE DELETED RATHER THAN RE-DATED … A corrected sentence is still an AUTHORED bound standing beside a DERIVED one, which is how seven consecutive waves each fixed a stale claim here and each acquired the next."*

---

## CR-31 and CR-32 — the two warnings

**CR-31, `:10192`.** The pin's derivation comment reads *"Across raw 419..1549, this session's evaluation of all five recognisers accepts only the `/**` docblock opener at 1573"*. Measured: `1573 ∉ [419, 1549]` — the sentence names a line as inside a range that excludes it. Line 1573 is `// The surfaces, as tokens the walk matches on, …`, an ordinary `//` comment. The `/**` opener it means is at **1548** (= 1573 − 25), with 1549 its first content line, so the geometry survived the deletions exactly; only the number did not move. Every companion figure in the same comment moved by −25. **This is WR-64's sentence — the one pass 12 closed WR-64 on — re-falsified by the commit that re-derived the pin**, whose message claims *"every LIVE restatement of 574 [is] re-derived"*. The pin measures correctly; the prose describing its derivation does not.

**CR-32, `.planning/STATE.md:408`.** Present tense, undated, unpointed: *"The interchangeability residual **is** republished as the measured width of the anchor's SHADOW — **574 surface lines** at the header row :417, **raw 419..1574**."* The gate publishes 549 / `419..1549` at eight live sites. The `### Decisions` section holds 151 entries and 19 date strings, so *"append-only DATED HISTORY"* — the gate's own words at `:938` — is not what a reader meets at `:408`. `d3a139d` **does** mention `574 -> 549`, but inside the P9-D3 amendment at `:307`, 101 lines above, under a decision about alias tracking. This is CR-25's shape relocated across files. Because STATE.md is append-only by the gate's own rule, the remedy is a pointer amendment **on that entry**, not a rewrite — `d3a139d` is the correct precedent, applied to the wrong entry.

---

## The class question: hand-written surfaces

**(a) Instance thirteen sits in a hand-written surface, and it could be machine-derived.** CR-30 lives in the gate file's header prose — lines 1..957, above the `BEGIN DERIVED RESIDUAL` sentinel — reached only by wave 33's declared-phrasing quantifier guard, which is a phrase list over bytes under one named normalization and says so itself.

It is machine-derivable, and cheaply. **The suite already knows the answer it is getting wrong.** The set of byte-compared surfaces is two constants: `GATE_FILE` at `:9566` and `LEDGER` at `:11367`. Render that set into the header the way `deriveResidual(RESOLVER_REGISTRY)` renders the residual, byte-compare it, and a sentence naming `.planning/WINDOWS.md` as machine-checked cannot survive a run. The same technique reaches CR-31: the pin already computes the raw span and the accepted line; emitting that number into its own failure message removes the whole class of hand-written companion locator that must be re-derived by hand each time a line moves.

**(b) The hand-written surfaces that remain**, in descending exposure:

| # | Surface | Extent | Mechanical reach | Findings it has produced |
| --- | --- | --- | --- | --- |
| 1 | gate file header prose | lines 1..957 | wave 33's phrase-list guard only — bounds spelled in undeclared words stand unseen | CR-14, CR-25, CR-27, CR-29, **CR-30** |
| 2 | gate file prose below the registry | ≈ `:9000`–`:11477` — pin comments, reach statements, exemption brackets, shipped failure strings | same guard, same reach | CR-20, CR-21, CR-22, CR-26, WR-64, **CR-31** |
| 3 | `.planning/REQUIREMENTS.md` above the BEGIN sentinel | the hand-written half of CORE-11, explicitly "HAND-WRITTEN HISTORY … append-never-rewrite" | only line 46's opening bytes, pinned by `CORE11_BOX_EXPECTED` | CR-18 |
| 4 | `.planning/STATE.md` | whole file, 470 lines | **none** — CLASS ONE unguarded | CR-19, the wave-33 header claim, **CR-32** |
| 5 | `.planning/WINDOWS.md` | whole file, 44 entries | **none** — CLASS ONE unguarded | the file CR-30 falsely claims is checked |
| 6 | `.planning/ROADMAP.md` | the phase-01 row; restates 574 at `:239` | **none** | — |
| 7 | phase artifacts | `01-SECURITY.md` (574 at `:99`, `:150`, `:170`, `:171`, `:174`), `01-REVIEW.md`, `01-UAT.md`, 45 SUMMARYs | **none** | — |

**For the class to close rather than the instance, surfaces 1–3 have to be converted**: every number and every mechanism claim in them replaced by a token the suite derives and byte-compares. Surfaces 4–7 are append-only histories where the correct discipline is a pointer amendment, and the gate file already names that discipline as *"A PROHIBITION WITH NO MECHANICAL CHECK"* — it is a rule, not a guard, and it will keep failing the way it failed at `:408`.

**Pass 11's convergence prediction is confirmed a second time, and this round tightens it.** Pass 11 said each corrective sentence is new attack surface. CR-31 shows that happening **inside a single commit**: `08345c3` re-derived eight restatements of 574 and left a companion locator falsified by its own edit. And CR-30 shows the complementary failure — a claim that has stood since wave 25, that twelve passes read past, because nothing in the machinery can see it and everything in the prose says it is machine-checked.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `packages/backend/src/hooks/passive.ts` | non-async hook, bounded queue | ✓ VERIFIED | `:117`, `:40`; wired at `index.ts:321` |
| `packages/backend/src/ingest/consumer.ts` | reload by id, raw bytes | ✓ VERIFIED | `:189` `body.toRaw()` |
| `packages/backend/src/store/analyses.ts` | project-keyed, dedup | ✓ VERIFIED | `:113` `ON CONFLICT … DO NOTHING` |
| `packages/backend/src/store/observations.ts` | query-value redaction | ✓ VERIFIED | `:55`, `:205` |
| `packages/backend/src/compat.ts` | min-version refusal | ✓ VERIFIED | `:45` `MIN_CAIDO = "0.57.1"` |
| `packages/backend/src/telemetry.ts` | overflow counter, slice max | ✓ VERIFIED | `:100` |
| `scripts/ci/check-bundle-imports.mjs` | one specifier | ✓ VERIFIED | executed: `crypto` |
| `.../results/spa-load.json` | external SPA-load evidence | ✓ VERIFIED | 6,185 bytes, present |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 gate: derived + drift-detectable + sole bound | ⚠️ **PARTIAL** | derived ✓, drift-detectable ✓ (re-proved by four mutations), **sole bound ✗ — CR-30 at `:600-605` and `:794-796`** |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `index.ts:321` | `hooks/passive.ts:117` | `sdk.events.onInterceptResponse` | ✓ WIRED | registered last, per `index.ts:31` |
| gate registry | `REQUIREMENTS.md` CORE-11 span | `deriveResidual(RESOLVER_REGISTRY)` byte compare | ✓ WIRED | `LEDGER` read at `:11367`, compared at `:11421` |
| gate registry | gate header span `:958-1539` | same byte compare | ✓ WIRED | 582 lines, 26 named silences; length unchanged across `08345c3` |
| `WIDEST_ANCHOR_SHADOW:10194` | live shadow measurement | exact equality over `SURFACE_LINES` | ✓ WIRED | proved by three mutations: 551, 546 and 574 all reported against 549 |
| `WIDEST_ANCHOR_TOKEN:10195` | the anchor that owns the maximum | identity equality | ✓ WIRED | owner byte-identical in all four runs; a context line in `08345c3`'s diff |
| exclusion-one endpoints | `DERIVED_BEGIN` / `DERIVED_END` | independent full-line equality | ✓ WIRED | measured 958..1539 = 582, matching the pre-commit length exactly |
| gate header `:600-605` / `:794-796` | `.planning/WINDOWS.md` | *claimed:* "a machine check" | ✗ **NOT WIRED** | **no code in the repository reads `.planning/WINDOWS.md`**; the suite reads two files and this is not one of them |
| `CORE11_BOX_EXPECTED:11389` | `REQUIREMENTS.md:46` | full-line `startsWith` | ✓ WIRED | pins `- [ ] **CORE-11**`; a box flip without changing this constant in the same commit turns the suite red. **Line moved from `:11414` to `:11389`.** |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| gate header residual span | span text `:958-1539` | `deriveResidual(RESOLVER_REGISTRY)`, 61 registry rows | ✓ | ✓ FLOWING |
| `REQUIREMENTS.md` CORE-11 span | span text | same generator, byte-compared at `:11421` | ✓ | ✓ FLOWING |
| pin | `WIDEST_ANCHOR_SHADOW` | `constructAnchorFor` over `SURFACE_LINES`, exhaustive by construction | ✓ | ✓ FLOWING |
| header `:600-605` machine-check claim | — | **no source; no file read** | ✗ | ✗ **DISCONNECTED** |
| `:10192` accepted-line locator `1573` | — | hand-written, not emitted by the pin | ✗ | ✗ **STATIC** (and now wrong) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full suite | `pnpm test` | 31 files / 1390 tests, exit 0 | ✓ PASS |
| Types | `pnpm typecheck` | exit 0 | ✓ PASS |
| Lint | `pnpm lint` | exit 0 | ✓ PASS |
| Bundle import set | `pnpm check:bundle` | `1 import specifier(s): crypto` | ✓ PASS |
| Gate spec alone | `vitest run …/outbound-prohibition.spec.ts` | 442/442 | ✓ PASS |
| Pin bites UP | +2 `//` lines after `:650` | `1 failed \| 441 passed` — 551 vs 549 | ✓ PASS |
| Pin bites DOWN | −3 prose lines `:649-651` | `1 failed \| 441 passed` — 546 vs 549 | ✓ PASS |
| Pin attributes the 25 | reverse-apply the three content hunks | `1 failed \| 441 passed` — 574 vs 549, same owner | ✓ PASS |
| 4 surviving `NOTHING` rows | probes through `auditSource` | all `[]` | ✓ PASS |
| 3 deleted rows | probes through `auditSource` | `outbound-fetch`, `outbound-beacon`, `outbound-dynamic-code` | ✓ PASS (deletion justified) |
| WR-37 sibling silences | 5 receiver-binding probes | all `[]` | ✓ PASS (silences hold, disclosed in the derived span) |
| WINDOWS.md machine check | repo-wide grep for any reader | **five hits, all comments in the gate file** | ✗ **FAIL** — CR-30 |
| `:10192` locator | `sed -n '1573p'` and `419 ≤ 1573 ≤ 1549` | `// The surfaces, as tokens…`; `False` | ✗ **FAIL** — CR-31 |

### Probe Execution

| Probe | Command | Result | Status |
| --- | --- | --- | --- |
| `scripts/*/tests/probe-*.sh` | `find scripts -path '*/tests/probe-*.sh'` | no conventional probe scripts declared for this phase | ? SKIP |

### Requirements Coverage

24 requirement IDs are declared across the 45 plan frontmatters. All 24 exist in `REQUIREMENTS.md`; none is orphaned; no plan claims an ID the ledger does not carry.

| Requirement | Status | Evidence |
| --- | --- | --- |
| `CORE-01`…`CORE-10`, `COMPAT-01/02`, `DIST-05/06`, `ENC-01`, `STORE-01`…`STORE-07` | ✓ SATISFIED | 22 of 24, all `[x]` in the ledger, all covered by truths 1-8 above |
| `CORE-11` | ✗ **BLOCKED** | `[ ]` at `REQUIREMENTS.md:46`. Criterion (3) unmet — CR-30. |
| `STORE-08` | ⤳ DEFERRED | `[ ]` by design; `entities`/`evidence` owned by Phase 4, `audit` by Phase 5 (`REQUIREMENTS.md:790`) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `packages/backend/src/outbound-prohibition.spec.ts` | 600-603 | present-tense claim that a MACHINE CHECK compares the residual to `.planning/WINDOWS.md` | 🛑 Blocker | no such check exists; contradicted by `:937-943` in the same file and by `REQUIREMENTS.md:170` |
| `packages/backend/src/outbound-prohibition.spec.ts` | 794-796 | the same claim, restated | 🛑 Blocker | same |
| `packages/backend/src/outbound-prohibition.spec.ts` | 603-605 | "`REQUIREMENTS.md` and `STATE.md` still carry OLDER text" | 🛑 Blocker | `REQUIREMENTS.md` is one of the two byte-compared surfaces, per `:934-936` |
| `packages/backend/src/outbound-prohibition.spec.ts` | 10192 | `the /** docblock opener at 1573` inside a range `419..1549` that excludes 1573 | ⚠️ Warning | WR-64's sentence, re-falsified by the commit that re-derived the pin |
| `.planning/STATE.md` | 408 | present-tense `574 surface lines … raw 419..1574` | ⚠️ Warning | one bound published at two values; CR-25's shape across files |
| shipped source (`packages/backend/src`, `packages/engine/src`) | — | `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` | ℹ️ Info | **zero occurrences** |

### Human Verification Required

None. UAT round 2 (`01-UAT.md`, 2026-08-27) ran 18 operator-observable checkpoints at 18 passed / 0 issues, and at test 18 the operator explicitly confirmed CORE-11 is a VERIFICATION item rather than a UAT gap. Every remaining question on this phase is programmatically measurable and was measured here.

---

## Gaps Summary

**The four unaudited commits do what they say, and one of them does better than it says.**

`efe93e8` re-censuses clean at three defensible `enclos` survivors. `d3a139d` amends by pointer and carefully declines to award itself the verdict. `bdf8698` is a docs commit. And `08345c3` — the highest-risk artefact here, a pin re-derived by the party that moved it — **holds up under an experiment it did not run**: reverse-applying only its three content hunks returns the shadow to exactly 574 on exactly the same owner, which a fitted pin cannot do. The pin bites both ways from 549 on my own mutations, exclusion one's length is byte-identical at 582, the owner token never moved, and no shipped occurrence went with the 25 lines. **549 is accounted for.** CR-29 closes in all three parts, and the `:745-755` deletion loses nothing: all six of its items live on as machine-derived registry rows inside the byte-compared span.

**And criterion (3) still does not discharge, for a reason none of the four commits created.**

Twelve passes read the header's reference table, the anchoring machinery, the exemption keys and the pin. Nobody read the paragraph that introduces the residual. `:600-603` tells a reader that the agreement between the gate header and `.planning/WINDOWS.md` **is a machine check and not a promise**, and `:794-796` says it again. There is no such check. The suite reads two files; a repo-wide grep for `WINDOWS.md` in code returns five hits and all five are comments in this same file. The same file says the opposite 337 lines below — *"A PROHIBITION WITH NO MECHANICAL CHECK — the byte comparison reaches these two surfaces and no further"* — and `REQUIREMENTS.md:170` names `WINDOWS.md` as CLASS ONE, unguarded. The claim is false a second way: `WINDOWS.md` has deliberately carried no residual since wave 27. And a third: the same paragraph calls `REQUIREMENTS.md` "OLDER text … deliberately untouched", when it is one of the two surfaces the suite byte-compares.

**This is the first finding in twelve rounds that runs in the UNSAFE direction.** CR-29 told a reader the gate reached less far than it does. CR-30 tells a reader a guarantee exists where none does — on the exact surface whose unguardedness the file names elsewhere, and by the exact mechanism that let `WINDOWS.md` entries 22 through 31 accumulate superseded bounds nobody caught.

**Nothing leaked.** 1,390 tests green, `check:bundle` at one specifier, `crypto`, zero debt markers under either source root, every outbound shape probed reports. CR-30, CR-31 and CR-32 are false disclosures in and around a test-only gate.

**The box is NOT earned.** `.planning/REQUIREMENTS.md:46` stays `- [ ] **CORE-11**` and `CORE11_BOX_EXPECTED` — now at `packages/backend/src/outbound-prohibition.spec.ts:11389`, moved from `:11414` by `08345c3`'s deletions — stays `"- [ ] **CORE-11**"`. When criterion (3) does discharge, `REQUIREMENTS.md:46` becomes `- [x] **CORE-11**: …` and the constant becomes `const CORE11_BOX_EXPECTED = "- [x] **CORE-11**";`, in the same commit.

---

_Verified: 2026-08-27T11:40:00Z_
_Verifier: Claude (gsd-verifier), verification pass 13_
