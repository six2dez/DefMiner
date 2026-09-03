---
status: superseded
phase: 07-sourcemap-reconstruction
source: [07-VERIFICATION.md]
started: 2026-09-03T00:00:00Z
updated: 2026-09-03T00:20:00Z
round: 3
supersedes: 07-UAT-round2.md
superseded_by: 07-UAT.md (round 4)
reconciled: 2026-09-03 — all four gaps closed by executed plans 07-23/07-24/07-25
---

## Current Test

[testing complete]

## Tests

### 1. Decide WR-01 — delete the `too_large` half of both production comments in `consumer.ts`, or accept a justification that is half fictional
expected: `consumer.ts:1266-1269` and `:1445-1448` say what `consumer.spec.ts:2690-2695` says — that `too_large` is unreachable through the ingest path — or the operator records that the imprecision is accepted.
detail: |
  Traced end to end from the code, not taken from the review. `consumer.ts:1124` is the SOLE
  production decode site and it is `decodeInlineMap(announcement.url, MAP_MAX_BYTES)`;
  `parse.ts:227` refuses on `Buffer.byteLength(json, 'utf8') > maxBytes`, so the decoded map
  document is at most `MAP_MAX_BYTES` bytes. `parseSourceMap(inline.json, ...)` at `:1147` is
  the only producer of `parsed.recovered`. `derive.ts:142` sets
  `DERIVED_SOURCE_MAX_BYTES = MAP_MAX_BYTES` and `:233` refuses on `>`. A decoded
  `sourcesContent` entry is a strict byte-subset of the JSON that carried it — JSON string
  encoding never shrinks a character below its UTF-8 width, and every escape costs strictly
  more — so `byteLen > MAP_MAX_BYTES` cannot hold for any source reaching that gate.
  BOTH sides are `+` lines in `git diff 11ab9e2..HEAD`: the false production claims at diff
  lines 23 and 69 of `consumer.ts`, the correct spec statement at diff lines 77-78 of
  `consumer.spec.ts`. One plan, one commit range, two contradictory statements.
  This is a judgement about a comment, not a behaviour — the guard is correct and the `empty`
  half of the justification carries it alone.
severity: warning
introduced_by: this round (07-19)
result: issue
reported: "Fix — delete the `too_large` half"
severity: minor

### 2. Decide WR-02 — `export.ts:424` still says the label column applies "the SAME redactor"
expected: The column comment says what the function now does — the same MARKER applied per AXIS, with a URL-shaped label delegating and any other label cut at its first `?` — or the operator records that the summary is acceptable as-is.
detail: |
  Read both sides at HEAD. `export.ts:424-427` reads "Hence {@link redactSourceLabelForExport}:
  the SAME redactor, the SAME marker, applied where its subject exists. Not an exemption — a
  narrowed application". The function at `:309-318` now reads "Hence the first `?` by hand
  rather than delegating — the SAME marker, a narrower cut".
  Under 07-16 every branch either delegated or returned the label whole, so "the SAME redactor"
  was TRUE; 07-22 made it FALSE by adding a second, hand-rolled cut with different semantics
  (`?` only, not `?`-or-`#`). "A narrowed application" is also now backwards on the query axis,
  which 07-22 WIDENED to every label.
  This is the comment attached to the column declaration — the first thing a reviewer auditing
  the export's redaction policy reads — and it is a sentence 07-22 edited around. Same defect
  class as G-07-3, same file.
severity: warning
introduced_by: this round (07-22)
result: issue
reported: "Fix — restate per axis"
severity: minor

### 3. Decide WR-03 — `export.ts:297-299` states the never-claim-a-false-redaction principle unqualified, while the shipped URL branch prints `<query-redacted>` over a fragment-only URL
expected: Either the principle is scoped to the branch that honours it, or the marker is made true on both branches (a vocabulary change touching `observations.url`, and a decision rather than a drive-by).
detail: |
  Reproduced from the code and from the spec, not from the review. `redactUrlForExport`
  (`export.ts:199-202`, byte-identical in the diff) cuts on `url.search(/[?#]/)` and appends
  the QUERY marker for either hit. `export.spec.ts:883-889` pins
  `webpack:///./src/app.js#L5` -> `webpack:///./src/app.js<query-redacted>` as EXPECTED.
  That value has no query axis.
  Meanwhile `export.ts:422` calls exactly that output — "printed a marker claiming a query had
  been withheld from a value with no query axis" — the wrong thing LO-04's fix removed on the
  path branch, and `:297-299` states unconditionally that such a marker makes a redaction
  "unreliable". So the file criticises on one branch precisely what it retains and pins on the
  other.
  Counterweight, so this is not overread: this is pre-existing `redactUrlForExport` behaviour,
  it is `observations.url`'s shipped behaviour, and it discloses LESS than the truth — the
  impact is operator trust and reviewability, not disclosure. Nothing leaks.
severity: warning
introduced_by: pre-existing (surfaced by this round)
result: issue
reported: "Scope the principle to its branch"
severity: minor

### 4. Decide WR-04 — the new gate's non-vacuity companion pins a HISTORICAL figure to a RECOMPUTED expression
expected: The two superseded figures become named literals with their provenance stated, plus a one-line assertion that the literal still equals the recomputed expression as of today; the SHIPPED figures stay derived.
detail: |
  Verified against the code and the arithmetic. `thresholds.spec.ts:868-874` computes
  `supersededInsertSide = 128 + 3 + 2 * 2048 = 4,227`, which is not a property of today's
  constants — it is what the insert side READ at `59347c3`.
  If `SOURCE_ROWS_PER_MAP_MAX` is ever re-measured, the companion at `:952-971` will demand
  that the recomputed figure be written into a paragraph describing what happened on
  2026-09-02, when the figure that day was 4,227; and the absence half at `:926-949` will
  simultaneously begin asserting the absence of a string that was never in the docblock — the
  exact "asserting the absence of an arbitrary string" failure its own comment says it exists
  to avoid. The gate built to stop prose drift would become the thing forcing it.
  Latent, not live: it is correct at HEAD and the verifier ran it green. Recorded also as this
  round's one coincidental-reliance item.
severity: warning
introduced_by: this round (07-18)
result: issue
reported: "Fix — pin history as named literals"
severity: major

### 5. Decide IN-04 — while `DERIVED_MAX_DEPTH` is 1, is `derivedRejected.depth_exceeded` worth a health surface?
expected: One sentence in `telemetry.ts`'s `derivedRejected` docblock recording that the counter measures corpus shape rather than run behaviour until the bound is raised — or an explicit decision that it needs none. No code change either way.
detail: |
  Confirmed from the code. `reconstruct` has exactly two call sites: `:1519` enters at
  `depth: 0` and `:1422` is the recursive one, guarded by `nextDepth.ok`.
  `admitDerivedDepth(0 + 1)` is `1 >= DERIVED_MAX_DEPTH (1)` -> refused (`derive.ts:204`), so
  `nextDepth.ok` is ALWAYS false on the only reachable path: the recursion block at
  `:1421-1437` never executes in production and the refusal at `:1459` fires for EVERY stage
  that admitted at least one source.
  G-07-4's fix is nonetheless correct and its truth holds — telemetry's stated unit is now
  honoured, because a stage that admitted a source genuinely did decline to recurse.
  The residual is that the counter's VALUE is within one of `sourcesRecovered > 0`, which is
  MD-03's own "a counter equal by construction to another counter" objection at 1-per-artifact
  instead of 781-per-artifact. Not a regression, not a reason to reopen anything — but it
  should be said where the counter is defined so nobody wires it to a health surface expecting
  signal.
severity: info
introduced_by: pre-existing (surfaced by this round)
result: pass
reported: "No note needed — decided"

### 6. Confirm 07-22's task 1 is discharged — the docblock's withholding sentence is option A's own defining text, quoted by reference, not a sentence you composed
expected: Either you accept the quoted-by-reference substitution as discharging the criterion, or you supply the one-sentence statement in your own words and it replaces the quoted text at `export.ts:296-299`.
detail: |
  Not a defect and not a gap — an outstanding item the executor routed here rather than
  fabricating. `07-22-SUMMARY.md:310-311` records it plainly: task 1's acceptance criteria
  required "the operator's one-sentence statement of what a redacted label withholds" recorded
  verbatim, and you answered with the option letter and a verdict on the premise without
  composing a separate sentence.
  Rather than invent a quotation, the executor wrote option A's defining text — "A non-protocol
  label is cut at the first `?` only, with the SHIPPED marker appended, and keeps its `#` tail."
  — and labelled it in the docblock as "in the words the decision was made against", with
  coverage entry D8 carrying `human_judgment: true`.
  The verifier read the docblock at HEAD and confirmed the labelling is accurate; nothing is
  passed off as yours that is not.
severity: n/a
introduced_by: n/a — outstanding operator item
result: pass
reported: "Accept the quoted-by-reference text"

## Summary

total: 6
passed: 2
issues: 4
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-07-5
  truth: "`consumer.ts:1266-1269` and `:1445-1448` say what `consumer.spec.ts:2690-2695` says — that `too_large` is unreachable through the ingest path"
  status: resolved
  resolved_by: 07-23-PLAN.md
  resolved_at: 2026-09-03
  reason: "User reported: Fix — delete the `too_large` half"
  severity: minor
  test: 1
  root_cause: "07-19 hoisted the depth-refusal justification into two production comments that name BOTH `empty` and `too_large` as reasons `admitDerived` can refuse a source. `too_large` is structurally unreachable: `consumer.ts:1124` is the sole production decode site and passes `MAP_MAX_BYTES`; `parse.ts:227` refuses on `Buffer.byteLength(json,'utf8') > maxBytes`; `derive.ts:142` sets `DERIVED_SOURCE_MAX_BYTES = MAP_MAX_BYTES` and `:233` refuses on `>`. A decoded `sourcesContent` entry is a strict byte-subset of the JSON that carried it, so `byteLen > MAP_MAX_BYTES` cannot hold at that gate. The same plan committed the CORRECT statement at `consumer.spec.ts:2690-2695`. Both sides are `+` lines in `11ab9e2..HEAD`. This is recorded finding F-1, upgraded from noted to shipped."
  artifacts:
    - path: "packages/backend/src/ingest/consumer.ts"
      issue: "lines 1266-1269 and 1445-1448 name `too_large` as a reachable refusal reason; it is structurally unreachable through the ingest path"
    - path: "packages/backend/src/ingest/consumer.spec.ts"
      issue: "lines 2690-2695 state the truth the production comments contradict — the correct text to align to, not a file to change"
  missing:
    - "Delete the `too_large` half of the justification from both production comments; the `empty` half carries the guard alone"
    - "Do NOT change the guard itself — the behaviour is correct and verified; this is a comment-only fix"
    - "Keep `consumer.spec.ts:2690-2695` as-is; it is the statement the comments must agree with"
  debug_session: ""

- gap_id: G-07-6
  truth: "`export.ts:424` describes what `redactSourceLabelForExport` now does — the same MARKER applied per AXIS, a URL-shaped label delegating and any other label cut at its first `?`"
  status: resolved
  resolved_by: 07-24-PLAN.md
  resolved_at: 2026-09-03
  residual: "G-07-9 — the core restatement landed at `export.ts:446-449`, but `missing` bullet 3 (align with the function docblock) was violated by a NEW false directional claim at `:449-452`. Promoted to gap G-07-9 in 07-VERIFICATION.md (round 4)."
  reason: "User reported: Fix — restate per axis"
  severity: minor
  test: 2
  root_cause: "`export.ts:424-427` reads 'the SAME redactor, the SAME marker, applied where its subject exists. Not an exemption — a narrowed application'. That was TRUE under 07-16, when every branch either delegated to `redactUrlForExport` or returned the label whole. 07-22 made it false by adding a second, hand-rolled cut with different semantics (`?` only, not `?`-or-`#`), and by WIDENING the query axis to every label — so 'a narrowed application' is backwards on that axis. 07-22 edited around this sentence without updating it. The function's own docblock at `:309-318` already states the truth."
  artifacts:
    - path: "packages/backend/src/store/export.ts"
      issue: "lines 424-427 — the column-declaration comment, first thing a redaction-policy audit reads, describes pre-07-22 behaviour"
  missing:
    - "Restate lines 424-427 per axis: the same MARKER, applied per AXIS — protocol-shaped labels delegate to `redactUrlForExport`; every other label is cut at its first `?`"
    - "Drop or correct 'a narrowed application' — the query axis was widened, not narrowed"
    - "Align with the function docblock at `:309-318`, which already says it correctly"
  debug_session: ""

- gap_id: G-07-7
  truth: "The never-claim-a-false-redaction principle at `export.ts:297-299` is scoped to the branch that honours it, and `redactUrlForExport`'s shared marker is recorded as a known exception"
  status: resolved
  resolved_by: 07-24-PLAN.md
  resolved_at: 2026-09-03
  reason: "User reported: Scope the principle to its branch"
  severity: minor
  test: 3
  root_cause: "`redactUrlForExport` (`export.ts:199-202`, byte-identical across this round) cuts on `url.search(/[?#]/)` and appends the QUERY marker for either hit, so `webpack:///./src/app.js#L5` exports as `webpack:///./src/app.js<query-redacted>` — pinned as EXPECTED at `export.spec.ts:883-889` over a value with no query axis. Meanwhile `:297-299` states unconditionally that a marker claiming a withheld query makes redaction 'unreliable', and `:422` names exactly that output as the wrong thing LO-04's fix removed on the path branch. The file criticises on one branch what it retains and pins on the other. Pre-existing behaviour, surfaced by this round. Operator chose the comment-scoping repair over the vocabulary change."
  artifacts:
    - path: "packages/backend/src/store/export.ts"
      issue: "lines 297-299 state the principle unqualified; lines 199-202 are the branch that does not honour it"
    - path: "packages/backend/src/store/export.spec.ts"
      issue: "lines 883-889 pin the false marker as expected output — evidence, not a file to change under this repair"
  missing:
    - "Qualify `export.ts:297-299` so the principle names the branch that honours it (the label branch), rather than stating it of the export as a whole"
    - "Record `redactUrlForExport`'s shared `<query-redacted>` marker over a fragment-only URL as a KNOWN and accepted exception, with the reason: it discloses LESS than the truth, so the cost is operator trust and reviewability, not disclosure"
    - "Comment-only. Do NOT change `redactUrlForExport`, the export vocabulary, or `observations.url`'s shipped output — the operator explicitly declined that repair as needing its own round"
  debug_session: ""

- gap_id: G-07-8
  truth: "The superseded figures in `thresholds.spec.ts`'s non-vacuity companion are named literals with stated provenance, asserted equal to the recomputed expression as of today; the SHIPPED figures stay derived"
  status: resolved
  resolved_by: 07-25-PLAN.md
  resolved_at: 2026-09-03
  residual: "Contract closed as written; an adjacent-operand residual is recorded as WR-02 / coincidental_reliance_item in 07-VERIFICATION.md (round 4)."
  reason: "User reported: Fix — pin history as named literals"
  severity: major
  test: 4
  root_cause: "07-18's gate 5 non-vacuity companion computes `supersededInsertSide = 128 + 3 + 2 * 2048 = 4,227` at `thresholds.spec.ts:868-874` — from TODAY's constants. But 4,227 is not a property of today's constants; it is what the insert side READ at `59347c3`. If `SOURCE_ROWS_PER_MAP_MAX` is re-measured, the companion at `:952-971` will demand that the RECOMPUTED figure be written into a paragraph describing 2026-09-02, when the figure that day was 4,227 — and the absence half at `:926-949` will simultaneously start asserting the absence of a string never in the docblock, the exact 'asserting the absence of an arbitrary string' failure its own comment says it exists to avoid. The drift-detector becomes the drift-generator. Latent, not live: correct at HEAD, runs green. Also recorded as this round's one coincidental-reliance item (`undeclared-precondition`)."
  artifacts:
    - path: "packages/engine/src/thresholds.spec.ts"
      issue: "lines 868-874 recompute a historical figure from current constants; lines 926-949 (absence half) and 952-971 (presence half) both consume it"
  missing:
    - "Make the two superseded figures named literals with their provenance stated in the name or an adjacent comment (what they read, and at which commit)"
    - "Add a one-line assertion that each literal still equals the recomputed expression as of today, so the divergence surfaces as a test failure rather than as a silently-wrong demand"
    - "Leave the SHIPPED figures derived from the constants — only the HISTORICAL ones become literals"
    - "Preserve the non-vacuity property itself: the guard must still fail if the docblock region is emptied"
  debug_session: ""
