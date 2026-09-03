---
phase: 07-sourcemap-reconstruction
plan: 26
subsystem: api
tags: [export, redaction, manifest, sourcemap, csv, comments, planning-record]

# Dependency graph
requires:
  - phase: 07-sourcemap-reconstruction
    provides: "`redactSourceLabelForExport`'s per-axis redaction (07-22, `0e44102`) and the docblock's baseline-anchored history (07-24, `d5cd5e0`→`a901b9e`→`0e44102`)"
provides:
  - "A `sources_verbatim` column comment that makes NO historical claim — so it cannot make a false one"
  - "The REDACTED-mode qualifier on the shared query marker's description, matching `serialiseRows`'s actual conditional"
  - "A dated ERRATA block in `07-24-PLAN.md` reconstructing the column's real history from three named commits"
  - "A round-3 ROADMAP entry that no longer repeats the false claim, corrected in place with its record intact"
affects: [07-27, phase-07-verification, export-redaction-policy]

actuals:
  tokens: 5100
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Prose repair by SUBTRACTION, gated on a strictly decreasing byte count — an addition dressed as a repair cannot pass"
    - "Region-scoped ABSENCE assertion + non-vacuity companion, replacing word-presence probes as prose acceptance evidence (VF-01)"
    - "Correct the planning record that AUTHORED a defect, not only the artifact that shipped it"

key-files:
  created:
    - .planning/phases/07-sourcemap-reconstruction/07-26-SUMMARY.md
  modified:
    - packages/backend/src/store/export.ts
    - .planning/phases/07-sourcemap-reconstruction/07-24-PLAN.md
    - .planning/ROADMAP.md

key-decisions:
  - "G-07-9 repaired by DELETION, not a fourth restatement — a sentence that makes no historical claim cannot make a false one"
  - "The planning record that authored the claim (`07-24-PLAN.md` truths[4] + ROADMAP round-3 entry) corrected, so round 5 cannot inherit it"
  - "`07-24-PLAN.md`'s twelve body restatements preserved byte-unchanged and governed by the ERRATA block rather than retroactively falsified"
  - "VF-01 discharged: every prose gate was an absence assertion, a byte-count decrease, or a `git show` comparison"

patterns-established:
  - "Byte-count-decreasing gate: when the required repair is deletion, gate on `wc -c` strictly falling below a measured literal — restatement is then structurally unable to pass"
  - "Non-vacuity companion: every negated gate paired with a positive anchor count, so an absence assertion cannot pass over an empty stream"
  - "Errata-over-preserve: a planning record's false claims are overlaid by a dated errata block, never rewritten, because the record is evidence"

requirements-completed: [MAP-07, UI-05]

coverage:
  - id: D1
    description: "The `sources_verbatim` column comment's axis-direction claim is DELETED — the region carries no direction word, no `OPPOSITE directions` fragment, is exactly 13 lines and strictly fewer than 1,104 bytes, and nothing was added in its place"
    requirement: "MAP-07"
    verification:
      - kind: other
        ref: "awk '/WHAT DOES NOT SURVIVE/,/name: \"sources_verbatim\"/' packages/backend/src/store/export.ts | grep -ciE 'narrow|widen'  → 0 (was 2)"
        status: pass
      - kind: other
        ref: "same region | grep -c 'OPPOSITE directions'  → 0 (was 1)"
        status: pass
      - kind: other
        ref: "same region | wc -l → 13 (was 15); wc -c → 934 (was 1104, gate: strictly < 1104)"
        status: pass
      - kind: other
        ref: "same region | grep -c 'WHAT DOES NOT SURVIVE' → 1 (non-vacuity companion)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The deletion removed the false CLAIM and not the description of the shipped behaviour — both cuts are still described and the closing pointer to the function survives"
    requirement: "MAP-07"
    verification:
      - kind: other
        ref: "same region | grep -c 'DELEGATES' → 1; grep -c 'cut by hand at its first' → 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "G-07-12: `redactSourceLabelForExport`'s KNOWN AND ACCEPTED EXCEPTION paragraph names the redacted mode — 'on every REDACTED row it has ever written' — and the unqualified form appears nowhere in the docblock"
    requirement: "MAP-07"
    verification:
      - kind: other
        ref: "collapsed-docblock pipeline | grep -c 'on every REDACTED row it has ever written' → 1 (was 0)"
        status: pass
      - kind: other
        ref: "collapsed-docblock pipeline | grep -c 'shipped behaviour on every row it has ever written' → 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Zero behavioural change: four md5 digests match the values measured at HEAD and the export vocabulary count holds at 2"
    requirement: "MAP-07"
    verification:
      - kind: other
        ref: "md5 redactSourceLabelForExport body / redactUrlForExport / isProtocolShapedLabel / serialiseRows — all four match HEAD literals"
        status: pass
      - kind: other
        ref: "grep -c 'query-redacted' packages/backend/src/store/export.ts → 2"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts (138 tests)"
        status: pass
    human_judgment: false
  - id: D5
    description: "`07-24-PLAN.md` carries a dated ERRATA block reconstructed from `d5cd5e0`, `a901b9e` and `0e44102`, and its `must_haves.truths[4]` makes no claim about a change of scope"
    verification:
      - kind: other
        ref: "sed frontmatter range | grep -ciE 'narrowed|widened' → 0 (was 1); grep -c '^  truths:' → 1 (non-vacuity)"
        status: pass
      - kind: other
        ref: "grep -c 'ERRATA' → 2; block at line 52, between frontmatter close (50) and <objective> (95)"
        status: pass
      - kind: other
        ref: "grep -c d5cd5e0 → 2, a901b9e → 2, 0e44102 → 2"
        status: pass
    human_judgment: false
  - id: D6
    description: "The ROADMAP's round-3 07-24 entry is corrected IN PLACE — the entry survives with its G-07-6 subject and `(MAP-07, UI-05)` tags, carries a dated 2026-09-03 / G-07-9 marker, and repeats the claim no longer"
    verification:
      - kind: other
        ref: "grep -c '^- \\[x\\] 07-24-PLAN.md' → 1; that line | grep -ciE 'narrowed|widened' → 0 (was 1); contains 'MAP-07, UI-05' and 'G-07-6'"
        status: pass
    human_judgment: false
  - id: D7
    description: "The column's history was re-derived from git by the executor independently of the errata table, and the two readings agree"
    verification:
      - kind: other
        ref: "git show {d5cd5e0,a901b9e,0e44102}:packages/backend/src/store/export.ts — bindings at :301, :385, :428, plus each commit's redactor body, read and reasoned about below"
        status: pass
    human_judgment: true
    rationale: "The per-commit SEMANTIC reading of which population of labels each axis was cut on is a judgement about code, not a measurement. The plan flagged it as a planner assumption and required the executor to re-derive it independently and stop on disagreement. It agreed, but a verifier should re-derive it a third time rather than accept two agreeing readings as proof."
  - id: D8
    description: "Repository gate green at exactly the round-4 floor with no behavioural drift and exactly one file touched under `packages/`"
    verification:
      - kind: unit
        ref: "pnpm vitest run --reporter=dot → 90 files / 4322 tests passed, exit 0"
        status: pass
      - kind: other
        ref: "pnpm typecheck && pnpm lint && pnpm knip && pnpm build → exit 0"
        status: pass
      - kind: other
        ref: "git diff --stat 34dd37e..HEAD over all nine fenced paths + 07-24-SUMMARY.md → EMPTY (non-vacuity: git ls-files --error-unmatch over the four spot-checked paths → 4)"
        status: pass
    human_judgment: false

duration: 7 min
completed: 2026-09-03
status: complete
---

# Phase 07 Plan 26: Delete the Axis-Direction Claim Summary

**The `sources_verbatim` column comment's three-times-false axis-direction sentence deleted rather than restated a fourth time — region 15→13 lines and 1,104→934 bytes with nothing added — plus the REDACTED-mode qualifier on the shared query marker, and a dated ERRATA block correcting the two planning documents that authored the claim.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-03T11:13:00Z
- **Completed:** 2026-09-03T11:19:48Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- **G-07-9 closed by SUBTRACTION.** The clause asserting the two redaction axes changed scope in mutually opposite ways is gone from `export.ts`'s `sources_verbatim` column comment. Nothing replaced it. The region carries no direction word, still describes both cuts, and still points the reader at `redactSourceLabelForExport`, where `:255-275` states each axis against a NAMED baseline.
- **G-07-12 closed.** `redactSourceLabelForExport`'s KNOWN AND ACCEPTED EXCEPTION paragraph now reads "on every REDACTED row it has ever written", matching the qualifier the file already uses at `:172` and `:191` and matching what `serialiseRows` actually does.
- **The origin was corrected, not just the symptom.** `07-24-PLAN.md`'s `must_haves.truths[4]` and the ROADMAP's round-3 07-24 entry — the two documents that authored the claim — are corrected, so a round-5 plan derived from either cannot re-ship the sentence.
- **The history was re-derived from git independently** and agrees with the round-4 diagnosis.

## Task Commits

1. **Task 1: Delete the axis-direction claim, and name the mode in the exception paragraph** — `95a2a73` (docs)
2. **Task 2: Correct the two planning documents that authored the deleted claim** — `e5460d5` (docs)
3. **Task 3: Falsify the history against git, then run the repository gate** — verification-only; no source written. Its recorded output is this SUMMARY, committed with the plan metadata.

**Plan metadata:** see the `docs(07-26): complete …` commit.

## Files Created/Modified

- `packages/backend/src/store/export.ts` — the `sources_verbatim` column comment (three lines of false claim deleted, remainder re-wrapped) and `redactSourceLabelForExport`'s exception paragraph (one word added, paragraph re-wrapped). Comment-only.
- `.planning/phases/07-sourcemap-reconstruction/07-24-PLAN.md` — dated ERRATA block at line 52, plus a corrected `must_haves.truths[4]`.
- `.planning/ROADMAP.md` — the round-3 07-24 entry corrected in place with a dated marker; plus the phase-07 plan counter and the round-4 wave-1 checkbox (hand-corrections, see Deviations).

---

## Task 1 evidence

### The four region probes, before and after

| Probe | RED (at HEAD) | GREEN (after) | Gate |
|---|---|---|---|
| `awk '/WHAT DOES NOT SURVIVE/,/name: "sources_verbatim"/' … \| grep -c 'WHAT DOES NOT SURVIVE'` | `1` | `1` | must stay `1` (non-vacuity) |
| same region \| `wc -l` | `15` | `13` | must be `13` |
| same region \| `wc -c` | `1104` | `934` | must be strictly `< 1104` |
| collapsed docblock \| `grep -c 'on every REDACTED row it has ever written'` | `0` | `1` | must be `1` |

Supporting gates, all green: region `grep -ciE 'narrow|widen'` → **2 → 0**; region `grep -c 'OPPOSITE directions'` → **1 → 0**; region `grep -c 'DELEGATES'` → **1 → 1**; region `grep -c 'cut by hand at its first'` → **1 → 1**; collapsed docblock `grep -c 'shipped behaviour on every row it has ever written'` → **0**; `grep -c 'query-redacted' export.ts` → **2 → 2**.

### The deleted clause — before

```
    // its `#` tail. Two cuts with different semantics, not one redactor reused —
    // and the two axes moved in OPPOSITE directions: the FRAGMENT axis NARROWED,
    // to protocol-shaped labels only, while the QUERY axis WIDENED, to every
    // label. Still not a per-column exemption, and the argument in full — with
    // the delegated branch's known exception — is at that function.
```

### After

```
    // its `#` tail. Two cuts with different semantics, not one redactor reused.
    // Still not a per-column exemption, and the argument in full — with the
    // delegated branch's known exception — is at that function.
```

The em dash after `not one redactor reused` became a full stop; the scope-change clause through the word `label.` is gone; the surviving sentence (`Still not a per-column exemption … is at that function.`) is **byte-identical** — only its line breaks moved. **No sentence was added.** The 170-byte fall is the proof: a restatement cannot make a byte count decrease.

### The qualified sentence — before

```
 * behaviour and it is `observations.url`'s shipped behaviour on every row it has
 * ever written.
```

### After

```
 * behaviour and it is `observations.url`'s shipped behaviour on every REDACTED
 * row it has ever written.
```

### The evidence for the qualifier

`serialiseRows`, `export.ts:606-609` — quoted as the plan required:

```ts
    const withheld =
      mode === "redacted" && column.redact !== null
        ? column.redact(text)
        : text;
```

`column.redact` runs **only** when `mode === "redacted"`. In raw mode `observations.url` writes the URL whole and no marker appears, so the unqualified sentence described a large class of rows wrongly. `serialiseRows` was **not** adjusted to make the old sentence true — its md5 is pinned below.

### The four md5 digests, against their expected values

| Construct | Expected (measured at HEAD by the planner) | Observed after the edit | |
|---|---|---|---|
| `redactSourceLabelForExport` body | `35a5e79faaada339fcc14f0889de4bed` | `35a5e79faaada339fcc14f0889de4bed` | MATCH |
| `redactUrlForExport` | `bab965d76e6877dbf9ba0ba6e31e58fc` | `bab965d76e6877dbf9ba0ba6e31e58fc` | MATCH |
| `isProtocolShapedLabel` | `0130e429cf81c63c7d60c5f5c63789fd` | `0130e429cf81c63c7d60c5f5c63789fd` | MATCH |
| `serialiseRows` | `b17979f72c0cb2a42161af1f96ecb42e` | `b17979f72c0cb2a42161af1f96ecb42e` | MATCH |

**Export vocabulary count:** `grep -c 'query-redacted'` → **2**, the value measured at HEAD.

`pnpm exec vitest run packages/backend/src/store/export.spec.ts --reporter=dot` → **138 passed, exit 0**.

---

## Task 2 evidence

### The four planning-record probes, before and after

| Probe | RED | GREEN | Gate |
|---|---|---|---|
| `sed -n '/^must_haves:/,/^---$/p' 07-24-PLAN.md \| grep -c '^  truths:'` | `1` | `1` | must stay `1` (non-vacuity) |
| same range \| `grep -ciE 'narrowed\|widened'` | `1` | `0` | must be `0` |
| `grep -c '^- \[x\] 07-24-PLAN.md' .planning/ROADMAP.md` | `1` | `1` | must stay `1` (entry survives) |
| that line \| `grep -ciE 'narrowed\|widened'` | `1` | `0` | must be `0` |

Supporting: `grep -c 'ERRATA' 07-24-PLAN.md` → **0 → 2**; the block sits at line **52**, between the frontmatter's closing `---` (line 50) and `<objective>` (line 95); `d5cd5e0` / `a901b9e` / `0e44102` each appear **2×**; the ROADMAP entry still carries `MAP-07, UI-05` and `G-07-6` and now carries a dated `CORRECTED 2026-09-03 … G-07-9` marker. The errata block itself contains **zero** direction words (`grep -ciE 'narrow|widen'` → 0).

### The twelve body restatements are preserved

`grep -ciE 'narrowed|widened' 07-24-PLAN.md` → **12** (was 13; the one removed is `truths[4]`). The twelve live in the objective, `read_first`, `behavior`, action, acceptance criteria, verify and success-criteria blocks. They are byte-unchanged **on purpose** — that file records what was PLANNED and EXECUTED — and the ERRATA block says so explicitly and governs them.

### `07-24-SUMMARY.md` is byte-unchanged

```
$ git diff --stat 34dd37e -- .planning/phases/07-sourcemap-reconstruction/07-24-SUMMARY.md
(no output)
```

**Why this matters:** `07-UAT.md` test 5 and `07-VERIFICATION.md` finding VF-01 both cite its **lines 97 and 100** — the two `grep -c` verification refs — as the evidence that a word-presence probe cannot falsify a semantic claim. Editing that file would have destroyed the evidentiary chain justifying this round's own gate change.

---

## Task 3 evidence — the history, read out of git

### The three `git show` outputs, verbatim

```
$ git show d5cd5e0:packages/backend/src/store/export.ts | grep -n 'name: "sources_verbatim"'
301:    { name: "sources_verbatim", redact: redactUrlForExport },

$ git show a901b9e:packages/backend/src/store/export.ts | grep -n 'name: "sources_verbatim"'
385:    { name: "sources_verbatim", redact: redactSourceLabelForExport },

$ git show 0e44102:packages/backend/src/store/export.ts | grep -n 'name: "sources_verbatim"'
428:    { name: "sources_verbatim", redact: redactSourceLabelForExport },
```

All three resolve. Commit subjects: `d5cd5e0` = `feat(07-06): the manifest — a third export table…`; `a901b9e` = `fix(07-16): LO-04 — apply the manifest redactor where its subject exists`; `0e44102` = `fix(07-22): cut the query axis on every label, the fragment axis only on URLs`.

### My own per-commit reading (derived from the redactor bodies, not from any document)

**`d5cd5e0` (07-06).** The column binds `redactUrlForExport` directly, whose body at that commit is `const cut = url.search(/[?#]/)` with **no shape test in front of it**. One cut at whichever of `?` or `#` comes first, applied unconditionally.
- QUERY axis: cut on **EVERY** label.
- FRAGMENT axis: cut on **EVERY** label.

**`a901b9e` (07-16).** The column binds `redactSourceLabelForExport`, whose entire body is `return isProtocolShapedLabel(label) ? redactUrlForExport(label) : label;`. One shape test gates **both** axes at once; a non-protocol label is returned untouched.
- QUERY axis: **PROTOCOL-SHAPED labels only.**
- FRAGMENT axis: **PROTOCOL-SHAPED labels only.**

**`0e44102` (07-22).** A protocol-shaped label delegates to `redactUrlForExport` (still `?` or `#`); every other label is cut at `label.indexOf("?")` by hand, and that branch never looks at `#`.
- QUERY axis: **EVERY** label again — protocol-shaped by delegation, every other by hand.
- FRAGMENT axis: **PROTOCOL-SHAPED labels only** — unchanged from `a901b9e`.

### Agreement statement

**My reading AGREES with the errata table task 2 wrote, in every particular.** No disagreement, so the plan proceeded rather than stopping.

The sentence in the round-4 diagnosis that my reading confirms is `07-VERIFICATION.md` / `07-UAT.md` G-07-9's: *"There is no baseline under which the two axes moved in opposite directions — each half of the sentence borrows a different one."* Checked step by step from the three bodies above:

- `d5cd5e0` → `a901b9e`: both axes move the **same** way, together, under one shape test.
- `a901b9e` → `0e44102`: **only one** axis moves (the query axis); the fragment axis is unmoved.
- `d5cd5e0` → `0e44102`: the query axis ends exactly where it started (every label, both ends); **only one** axis moved (the fragment axis).

At no baseline do the two axes move in mutually opposite ways. The deleted sentence's halves confirm the borrowing directly: "FRAGMENT axis NARROWED" is true only against `d5cd5e0`, "QUERY axis WIDENED" only against `a901b9e`.

### The surviving historical claims at `export.ts:255-275`, signed off against the same outputs

- **`THE FRAGMENT AXIS, UNMOVED`** — "the fragment axis is still cut only on a label that is actually a URL", stated against the 07-16 baseline the paragraph names. At `a901b9e` the fragment axis was protocol-only; at `0e44102` it is still protocol-only, because the by-hand branch uses `indexOf("?")` and never touches `#`. **TRUE of the baseline it names.**
- **`THE QUERY AXIS, RESTORED`** — "07-16's premise … was FALSE … so between 07-16 and WR-03 it exported VERBATIM". At `a901b9e`, `src/App.vue?vue&type=script&lang.ts` is not protocol-shaped, so the ternary returns `label` untouched: it did export verbatim. And "RESTORED" is exact — at `d5cd5e0` the query axis did cut every label, so `0e44102` returns it to that width. **TRUE of the baseline it names.**

`awk` over the docblock \| `grep -c '07-16'` → **3**: the surviving history still names its baseline.

These two are the only historical claims about this column that survive anywhere in `packages/`, and both are now signed off against git rather than against a word count. Neither needed correction, so nothing outside G-07-9's `missing` list was touched.

### The repository gate

```
$ pnpm vitest run --reporter=dot
 Test Files  90 passed (90)
      Tests  4322 passed (4322)
```

**Exactly 90 files and exactly 4,322 tests, exit 0.** No test added, none removed — nothing behavioural changed. **The numeric floor is 90 files / 4,322 tests, read from `07-VERIFICATION.md`'s round-4 baseline** (and matching `07-25-SUMMARY.md`'s recorded close). `packages/engine/src/thresholds.spec.ts` stays at its HEAD count of 63; this plan added no test.

```
$ pnpm typecheck && pnpm lint && pnpm knip && pnpm build
CHAIN EXIT=0
```

All four exit 0. `knip`'s 30 "Tag hints" are pre-existing informational output, not failures. `vue-tsc` is deliberately excluded (W-4, open by operator decision).

**Working tree:** `git status --porcelain -- packages/` → empty (task 1 already committed); `git diff --stat 34dd37e..HEAD` lists exactly three files — `packages/backend/src/store/export.ts`, `07-24-PLAN.md`, `.planning/ROADMAP.md`.

**Prohibition gates:** `git ls-files --error-unmatch` over the four spot-checked paths → **4** (non-vacuity: no arm is a nonexistent pathspec that would pass silently — the exact defect the round-4 path-ambiguity correction names). `git diff --stat 34dd37e -- ` over all nine fenced paths (`packages/engine/src/thresholds.ts`, `packages/engine/src/thresholds.spec.ts`, `packages/backend/src/store/export.spec.ts`, `packages/backend/src/ingest/consumer.spec.ts`, `packages/engine/src/sourcemap/parse.ts`, `packages/backend/src/sourcemap/derive.ts`, `packages/backend/src/telemetry.ts`, `packages/backend/src/store/retention.ts`, `packages/backend/src/store/migrations.ts`) → **EMPTY**.

---

## Round position at the close of this plan

- **G-07-9 — CLOSED** at `95a2a73` (source) and `e5460d5` (planning record).
- **G-07-12 — CLOSED** at `95a2a73`.
- **G-07-10 and G-07-11 — OPEN, owned by plan `07-27`**, which shares this working tree (`workflow.use_worktrees` is false) and must run **after** this plan is committed. Its subject is `packages/engine/src/thresholds.spec.ts`, untouched here and diffstat-EMPTY.
- **Still open by operator decision and untouched:** **W-4** (`vue-tsc` wired into no running gate), **W-6** (`MAP_MAX_BYTES` under-serves recovery ~2×), **round-1 UAT gap 3** (`tests/frontend-load.spec.ts` frame-budget backstop), **IN-04** (`derivedRejected.depth_exceeded` docblock caveat), **SC5's second half** (→ Phase 3 / Phase 11) and **MAP-01's external half** (→ Phase 8).

## VF-01 process note

**Yes — this plan's acceptance evidence felt able to falsify the claims it gated, and materially more so than round 3's.** The load-bearing gate was the byte count: `wc -c < 1104` is the one arm a restatement *cannot* satisfy, and it is what made "delete, do not reword" enforceable rather than merely instructed. The region-scoped absence assertions (`grep -ciE 'narrow|widen'` → 0) plus their non-vacuity companions are a genuine improvement on `grep -c 'WIDENED'` → 1, because they go red on the presence of the defect rather than on the presence of a word, and the companion stops the `awk` range collapsing into a vacuous pass.

One honest limit worth recording for the verifier: **no gate in this plan can prove the errata table is TRUE.** The gates prove the three commit SHAs appear in the file and that `git show` resolves them — the truth of the semantic reading rests on my re-derivation from the redactor bodies agreeing with the verifier's, which is two readings, not a proof. That is why D7 is marked `human_judgment: true`. The plan anticipated this and required a stop-on-disagreement; there was no disagreement, but a third independent re-derivation at verification is the right check, and it is cheap: the bodies are quoted above.

## Decisions Made

- **Deletion over restatement.** Three consecutive rounds repaired this sentence by restating it, and each restatement became the next round's defect. The byte-count gate makes restatement structurally unable to pass. Nothing was added: `export.ts:255-275` already states each axis against a named baseline and the column comment's closing clause already sends the reader there.
- **Correct the authoring documents, not just the shipped artifact.** The defect was planned, not mis-executed. Cutting only the source link would have left `07-24-PLAN.md` and the ROADMAP able to re-author it in round 5.
- **Overlay the record, do not rewrite it.** The twelve body restatements in `07-24-PLAN.md` are preserved byte-unchanged and governed by the ERRATA block. Retroactively falsifying a record of what was planned and executed would be a worse defect than the one being repaired — and `07-24-SUMMARY.md` cites that record.
- **Describe scope changes by the population of labels cut, never by a direction word.** The errata table is falsifiable against `git show` precisely because it names populations rather than re-narrating a direction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `state.advance-plan` could not advance; STATE.md position lines hand-corrected**

- **Found during:** Task 3 (state updates)
- **Issue:** `gsd_run query state.advance-plan` returned `{"advanced": false, "reason": "last_plan", "current_plan": 25, "total_plans": 25}`. Its `total_plans` was stale at 25 — round 4 added `07-26-PLAN.md` and `07-27-PLAN.md`, so the phase now holds 27 plans (`roadmap.update-plan-progress 07` independently reports `plan_count: 27, summary_count: 25` by counting files on disk). Because the handler believed the phase had ended at 25, it refused to advance and STATE.md would have kept saying "Plan: 25 of 25 executed — none remain" while plan 26 had just landed and 27 was still pending.
- **Fix:** Hand-corrected the frontmatter `status:` (`ready_for_verification` → `executing`), `stopped_at`, `last_activity_desc`, `progress.total_plans` (102 → 104) and `progress.completed_plans` (97 → 98), plus the four prose position lines (`Phase:`, `Plan:`, `Status:`, `Last activity:`). This is the same hand-correction this project has applied on every plan since 07-20 and which STATE.md itself documents as necessary "because no handler owns them".
- **Files modified:** `.planning/STATE.md`
- **Verification:** `state.record-metric`, `state.add-decision` ×3 and `state.record-session` all returned success against the corrected file; project-wide counts re-derived from disk (106 PLAN files, 101 SUMMARY files before this one).
- **Committed in:** the plan-metadata commit

**2. [Rule 3 - Blocking] ROADMAP round-4 progress prose hand-corrected**

- **Found during:** Task 3 (state updates)
- **Issue:** `roadmap.update-plan-progress 07` reported `updated: true` but produced no diff — this ROADMAP has no `| 07 |` progress-table row for the handler to write, so the phase-07 counters live in prose the handler does not own. The line still read `**Plans**: 25/27 plans executed … round 4 … NOT YET EXECUTED` and the round-4 wave-1 entry still read `- [ ] 07-26-PLAN.md` after 07-26 had executed.
- **Fix:** Hand-corrected the counter to `26/27`, restated the round-4 clause as `PARTLY EXECUTED 2026-09-03 — 07-26 closed G-07-9 and G-07-12 at e5460d5; 07-27 … NOT YET EXECUTED`, and ticked the 07-26 checkbox to `- [x]`.
- **Files modified:** `.planning/ROADMAP.md`
- **Verification:** the round-3 `07-24-PLAN.md` entry's own gates re-run after the edit and still green — anchor count 1, `MAP-07, UI-05` present, `G-07-6` present, `grep -ciE 'narrowed|widened'` → 0.
- **Committed in:** the plan-metadata commit

**3. [Rule 3 - Blocking] `state.add-decision --summary-file` rejected `/tmp` paths**

- **Found during:** Task 3 (state updates)
- **Issue:** The handler rejects any file path outside the repository root (`Path escapes allowed directory`), so `mktemp` files under `/var/folders/...` were refused and all three decisions failed to record.
- **Fix:** Wrote the six decision/rationale files into a repo-local scratch directory, ran the three calls, and removed the directory. `git status --porcelain | grep '^??'` confirms no stray untracked file was left behind.
- **Files modified:** none (scratch removed)
- **Verification:** all three calls returned `{"added": true}`; untracked check clean.
- **Committed in:** n/a (no file artifact)

**Also noted, not a deviation:** `requirements.mark-complete MAP-07 UI-05` returned `already_complete` for both — they were marked in an earlier round — so `REQUIREMENTS.md` is unmodified. `requirements.ready-ids` reported 2/2 ready; `07-27-PLAN.md` declares only `MAP-06`, so no shared-ID gate applies.

---

**Total deviations:** 3 auto-fixed (3 blocking, all in the state-update tooling — none in source).
**Impact on plan:** Zero scope creep. All three are GSD-tooling gaps around a stale plan counter and a path restriction, not defects in the phase's subject. No source file, no gate literal and no acceptance criterion was adjusted; every plan gate was run exactly as written and passed on its stated literal.

## Issues Encountered

None during the planned work. Every gate literal the plan stated — the 15-line/1,104-byte region, all four md5 digests, the `query-redacted` count of 2, the four planning-record probes, and the 90-file/4,322-test floor — matched HEAD exactly on first measurement. No gate was re-measured or adjusted.

## Known Stubs

None. This plan added no code, no test, no symbol and no placeholder — it deleted a sentence, added one word, and corrected two planning documents.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change. `SCHEMA_VERSION` is derived from `MIGRATIONS` and is unchanged; `migrations.ts` diffstat is EMPTY. The threat register's high-severity rows are each discharged by a gate above: T-07-117 by the absence assertion plus byte-count decrease, T-07-118 by the four md5 digests plus the one-path diff, T-07-120 by the empty `07-24-SUMMARY.md` diffstat, T-07-121 by the three-commit re-derivation, T-07-122 by `serialiseRows`'s pinned digest.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **`07-27` must run next**, on this same working tree, before phase-07 verification. It owns G-07-10 and G-07-11 in `packages/engine/src/thresholds.spec.ts`, which this plan left diffstat-EMPTY at its HEAD count of 63 tests. Its whole-suite floor should be retargeted at this plan's recorded close: **90 files / 4,322 tests**.
- After `07-27`, phase 07 stands at 27/27 and is ready for `/gsd-verify-work 07`.
- **For the verifier:** re-derive the errata table independently from the three commit bodies quoted above rather than accepting two agreeing readings. That is the one claim in this plan no gate can prove.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-03*

## Self-Check: PASSED

- `07-26-SUMMARY.md` present on disk.
- All three commits resolve: `95a2a73` (task 1), `e5460d5` (task 2), `6bb8172` (plan metadata).
- Working tree clean; no untracked files.
- Post-commit gate re-run: region 13 lines / 934 bytes / 0 direction words; `07-24-SUMMARY.md` diffstat vs `34dd37e` EMPTY.
