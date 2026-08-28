# The DefMiner entity read contract

**Published by:** Phase 5 (Workspace & Operator Workflow), plan 05-04
**Addressed to:** Phase 3 plan 03-01 and plan 03-03; Phase 4 plan 04-03
**Machine-readable half:** `packages/engine/src/contract.ts`
**Authority:** operator decision **D-05**, `05-CONTEXT.md` § "Post-research decisions"

---

## What this is

This is the **read** contract for an entity table: what the DefMiner workspace needs handed to it,
declared by the only thing that reads it.

**It is not a storage schema.** Phase 4 owns the entity columns, the keys, the CHECK constraints and
the indexes (plan 04-03). Phase 3 owns the signal vocabulary and the score (plans 03-01 and 03-03).
Nothing below defines any of those, and a reader who finds one has found a defect.

The reason this document exists at all: `entities` and `evidence` do not exist. `EXPECTED_TABLES` in
`packages/backend/src/store/schema.spec.ts` is the exact set
`["analyses", "artifacts", "observations", "settings"]`, and adding a table is a deliberate two-place
edit that plan 01-01's one-way checkpoint made an operator-visible decision. Phase 5 could have
re-sequenced itself behind Phase 4, or invented Phase 4's schema. **D-05 chose neither.** It built
what is buildable over the shipped tables and emitted this contract upward — and Phase 5 is
genuinely the only consumer of every shape below, which is what makes writing them Phase 5's job
rather than a guess made on Phase 4's behalf.

`05-UI-SPEC.md` § "Table contract" already declined to invent an entity column list for exactly this
reason. Inventing one here, wearing a type annotation, would be the same mistake.

### The type is normative

Where this document and `packages/engine/src/contract.ts` disagree, **the type wins.** This document
carries the argument; the type carries the contract, and it is the thing a compiler will hold you to.
It lives in `packages/engine/` because that package is SDK-free by construction — `boundary.spec.ts`
holds that with four independent mechanisms — so Phases 3 and 4 can import it without acquiring a
Caido dependency (D-05(2)). Import it as `@defminer/engine/contract`.

---

## The four always-present columns

`05-UI-SPEC.md` § "Table contract" binds every entity table to four columns, in this render order.
`EntityRowBase` is that list as a type.

| # | Field | What it is | Target-controlled? |
|---|-------|------------|--------------------|
| 1 | `lead` | A state **or** a score, discriminated by `kind`. The `state` arm carries a member of the shipped `scan_state` vocabulary; the `score` arm carries a numeral and a tier word. | No |
| 2 | `value` | The extracted value, in its redacted form. | **YES — this one, and only this one.** |
| 3 | `lastSeenAt` | Epoch milliseconds, wall clock. Formatted by the frontend. | No |
| 4 | `triage` | The operator's own triage decision. One of `TRIAGE_STATES`. | No |

Three rules bind every column an entity table adds later, not just these four:

1. **These four are always present, in this order.**
2. **Exactly one column carries the target-controlled value.** A second target-controlled column
   added to an entity table without the rendering-safety pipeline applied is threat T-05-15 — and
   the reason that rule is a *type* and not a paragraph is that "exactly one" is otherwise something
   somebody has to remember while adding a column.
3. **Every column rendering target-controlled bytes obeys `05-UI-SPEC.md` R1 and R2** — text never
   markup, C0/C1 and bidi stripped, grapheme-safe truncation at the 256-character table-cell cap,
   `font-mono` (a security control, not a style preference), and never in a tooltip, a `title`
   attribute or a `data-*` attribute. `packages/engine/src/sanitise.ts` is that pipeline, shipped;
   do not write a second one.

**Entity-specific columns are added by the phase that defines them and are not fixed here.** That is
deliberate and is not an omission to be helpfully filled in.

**The state vocabulary is not restated in the contract.** `EntityLead`'s `state` arm is typed
`string` and doc-commented as "a member of `SCAN_STATES` in
`packages/backend/src/store/analyses.ts`", because the engine may not import the backend — the
dependency edge runs backend → engine and never the reverse — and a second copy of a closed
vocabulary is a second thing to drift. OBS-02 formally owns that vocabulary in Phase 2.

---

## The cursor tuple

`PageCursor` is a two-element row-value tuple: the sort key's value and the tie-break value of the
last row the statement **scanned**. `PageRequest` and `PageResponse` carry it.

**A row-value comparison requires a uniform sort direction, and applying one to a mixed-direction
sort is silently wrong rather than slow.** SQLite's `(a, b) < (?, ?)` compares the tuple
lexicographically in one direction. A statement ordered `a DESC, b ASC` and cursored with that
predicate skips rows and duplicates others, and nothing errors, and no test that does not compare
two full result sequences will notice. That is why `PageRequest` carries **one** `direction`
governing both terms rather than one per term: the type refuses to express the broken form.

**The index backing an entity table's paginated read must declare its directions explicitly, or the
query plan grows a temp b-tree.** An index whose column directions do not match the `ORDER BY`
exactly cannot satisfy the sort, so SQLite materialises and sorts — which is the cost the keyset
cursor existed to avoid, paid silently, on the single QuickJS thread.

Two further properties the implementing phase inherits:

- **Deterministic tie-breaks are load-bearing.** Every list query in the shipped package already
  breaks ties deterministically (`sha256 ASC`, `request_id ASC`). Keyset pagination depends on
  exactly that; without it a cursor cannot name a position.
- **A page may be short.** `PageResponse` carries `scanned` and `exhausted` because a bounded
  candidate window may return fewer rows than the limit while more exist. A short page with
  `exhausted: false` is a **refetch**, not an empty state. Rendering the empty state there tells the
  operator nothing was found when the window simply ran out.

### Provenance of the measurements behind this design

Stated rather than implied, because it is a live residual and not a footnote. The query plans behind
the cursor design — the keyset seek, the mixed-direction sorter penalty, and the bounded window's
independence from filter selectivity — were **measured on SQLite 3.51.0 and 3.53.4, not on Caido's
3.46.0.** No 3.46 binary is reachable from this machine. The operator chose to proceed with that
residual **disclosed rather than closed**. Nothing here is verified on the shipped runtime; the gap
is narrowed to a 3.46 → 3.51 window, and it is an executed assertion in
`tests/sqlite-346-query-plans.spec.ts` whose failure message names all three versions.

---

## The invalidation summary

`INVALIDATION_EVENT` is the single backend → frontend event name. `InvalidationSummary` is the
entire payload: `{ projectId, category, changedCount, newestId }`.

**Summary only. No findings payload, no rows, no bundle bodies.** (UI-07; threat T-05-17.) The event
says *that* something changed and how much; the frontend re-queries a page when it decides to,
through the same project-scoped, redacted read path everything else uses. An event that pushed rows
would be a second data path out of the backend with none of the first one's controls on it, carrying
target-controlled bytes to a listener that has not sanitised them. `newestId` is a row identifier —
a digest, a request id — never a value and never a URL.

`INVALIDATION_CATEGORIES` currently holds `artifacts`, `observations`, `analyses`: the shipped tables
whose rows the workspace renders. **Entity categories are appended by the phase that adds the table,
not guessed at here.** `contract.spec.ts` asserts the list holds exactly those three and nothing
outside `EXPECTED_TABLES`, so a speculative `entities` member fails a gate rather than lands.

One event carrying a category, not one event per category — the frontend coalescer keys on
`category`, and a per-category event name would mean a subscription list every future phase has to
edit.

---

## The score-explanation frame and the evidence-panel frame

**Together these two are checker FLAG F1's resolution.**

F1, raised at `05-UI-SPEC.md`'s approval and open until now, reads: *"The evidence panel has no fixed
frame for the score explanation, though UI-04 and success criterion 3 require 'which signals fired
and why it scored as it did'. UI-03's artifact version and byte offsets are covered by R1 as a
mechanism but never listed as mandatory panel fields. Add a two-line evidence-panel frame (mandatory
fields, which are target-controlled, which carry `font-mono`) so Phase 3/4's signal vocabulary binds
to it the way § 'Data & Interaction Contract' binds columns."*

**What is fixed: the frame. What is not fixed: the vocabulary.** That split is exactly what F1 asks
for, and honouring it in both directions is the whole point — a frame with a vocabulary baked into it
would be Phase 3's decision made without Phase 3, and a vocabulary with no frame is what left the UI
guessing at a payload shape in the first place.

### `ScoreExplanation` — the UI-04 frame

`{ score, tier, signals }`, where each `ScoreSignal` is
`{ signalId, label, direction: "raised" | "lowered", detail? }`.

- **`signalId` and `label` are Phase 3's to define** (plan 03-03, "Multi-signal confidence scorer
  with explanations"). This contract says what shape they arrive in and nothing about what they say.
- **`direction` is a word, not a colour.** `05-UI-SPEC.md` forbids colour as the sole carrier of
  meaning; the panel renders the word and may reinforce it with colour.
- **`detail` is target-controlled when present** — a matched substring, a context fragment. It goes
  through `forEvidence` at the panel cap, in `font-mono`.
- **`signals` order is the producer's.** An explanation whose order changed between two reads of the
  same entity would read as a different explanation.

**The open precision question is recorded, not invented.** A score renders as a numeral plus a tier
word — `05-UI-SPEC.md` § "Visual Hierarchy" makes that pair the focal point of the whole page. The
numeral's **rounding and tie-breaking contract is Phase 3's to state**: how many decimals, which way
a boundary rounds, what happens when a value sits exactly on a tier edge. The frame *requires* Phase 3
to declare it. It does not declare it on Phase 3's behalf, because a rounding rule invented here
would be a rule the scorer never agreed to and could not honour. The UI renders the numeral it is
given.

### `EvidencePanelFrame` — the UI-03 + UI-04 frame

**Mandatory fields — all five, non-optional on the type, and named in
`EVIDENCE_PANEL_MANDATORY_FIELDS` so the requirement is assertable and not merely readable:**

| Field | What it is | Target-controlled | `font-mono` |
|-------|------------|-------------------|-------------|
| `sourceRequest` | `{ requestId }` — a request ID handed to a Caido navigation call | No | No |
| `artifactVersion` | `{ sha256, detectorSetHash }` — which bytes, read by which corpus | No | No |
| `byteRange` | `{ start, end }`, half-open, over the **raw bytes** | No | No |
| `snippet` | The evidence excerpt | **YES** | **YES** |
| `scoreExplanation` | The `ScoreExplanation` above | Only `signals[].detail` | Only that field |

- **`font-mono` on every target-controlled field, without exception.** It is a security control in
  `05-UI-SPEC.md` § "Typography", not a style preference: it is what makes a homograph or a
  padded-whitespace value legible as what it is.
- **`sourceRequest` is an ID, never an `<a href>` built from an extracted URL** (R1: an extracted URL
  is data to be displayed, never a destination to be offered). D-02 fixes which observation it points
  at — the newest whose request still resolves.
- **`byteRange` is over raw bytes, never text.** Offsets and hashes derive from bytes (ENC-01, and
  `decode.ts`'s banner says so first). These are also the offsets R1's match highlighting slices at:
  the snippet is split into three plain strings rendered into three sibling elements, never by
  building a `<mark>` string.

**What does not exist yet, stated so it cannot be mistaken for shipped.** `byteRange` and `snippet`
come from Phase 4's `evidence` table (plan 04-03). There are no byte offsets to link to today — that
is the same gap F1 names. The frame is publishable now precisely because a frame is not its contents:
plan 05-10 builds the panel *region*, its fixed-height skeleton, its ERR-04 failure copy and the
artifact-version line, and the deferred pass fills in the two fields above.

---

## The number behind the filtered-empty copy

`VisibleTotal` is `{ visible, hiddenBySuppression, suppressionRuleCount }`.

The approved copy string is **unchanged** — the operator reviewed the objection to it and chose to
keep it, and that is not re-opened here. What the operator explicitly left open was *what the number
counts*, and this is that answer:

**The headline number counts rows the operator can currently reach. Suppressed rows are not inside
it.** A suppressed finding is one the operator has said is not a finding; counting it makes the
number wrong in the direction that erodes trust — they clear the filters, see fewer rows than the
number promised, and have nothing on screen explaining the difference. `hiddenBySuppression` is the
separate second line that closes that gap instead of hiding it. Both counts derive from the same
bounded query with and without its `NOT EXISTS` arm, so they cannot disagree about what a row is.

The shipped `artifacts` and `observations` tables have no suppression mechanism, so for them the
second and third fields are `0` and the second line renders nothing. They become real on the entity
tables, which are the deferred pass's.

---

## Two upward requirements

Each is stated as something a **named future plan** must do. Neither can be satisfied inside Phase 5.

### 1. On Phase 3, plan 03-01 — the rule schema needs a checksum verifier reference

`.planning/research/PITFALLS.md` P2 defines the Findings tier as *provider-format-verified **and**
(checksum-valid **or** network-validated) **and** not stopworded*. Network validation is **SEC-07**,
SEC-07 lands in **Phase 10** — not "later", five phases later — and REQUIREMENTS.md says it is
*"Built, and OFF by default"* even then.

**So the Phase 5 tier reduces to: provider-format-verified AND checksum-valid AND not-stopworded.**
The disjunction collapses to a conjunction.

**And the consequence: a provider detector with no checksum has no satisfiable branch and can
therefore never project at Phase 5.** PITFALLS P2 names the providers that have a structural check —
AWS key ID structure, Stripe key prefixes, GitHub's `_`-prefixed tokens with a CRC32 checksum in the
last six characters, Slack's `xox[baprs]-` shapes. Everything else is format-and-context only.

**What 03-01 must do.** DET-02 reads *"Detectors are data, not code: each declares keywords, pattern,
entropy expectations, allowlists, and confidence inputs."* It **does not currently name a checksum
capability.** Plan 03-01's rule schema must carry a per-rule checksum verifier reference — a verifier
id, or an **explicit null** rather than an absent field, so "this provider has no checksum" is a
recorded fact and not an omission — and Phase 4's SEC-01 must implement the verifiers.

**If it does not: Phase 5's projection surface is provably empty and FIND-01 cannot be
demonstrated.** Not degraded, not noisy — empty, because no row can satisfy a three-way conjunction
whose middle term nothing can evaluate.

**One fact recorded for Phase 4's benefit:** `crypto.Crc32` is present in Caido's measured runtime
module export set (Phase 0's capability probe, `.../raw/capabilities.json`). GitHub's token checksum
is therefore verifiable offline inside QuickJS with **no new dependency** and nothing DIST-05 must
re-approve. At least one provider's checksum branch is reachable today.

### 2. On Phase 4, plan 04-03 — a stable entity identity that survives a corpus bump

Triage (OPS-01) and the Finding `dedupeKey` (D-01) both key on an entity identity. **OPS-04 requires
that identity to survive a detector corpus version bump**, and `analyses`'s primary key cannot
provide it: that key **is** `(project_id, sha256, detector_set_hash)`, so anything hung off an
analysis row inherits the corpus hash and discards every triage decision on a bump — which is exactly
what OPS-04 forbids, and threat T-05-19.

`05-UI-SPEC.md` fixes only the negative: triage is keyed on stable entity identity and **never** on
`detector_set_hash`. The positive is Phase 4's to produce.

**The proposal.** Triage keys on exactly the tuple D-01 uses for the Finding `dedupeKey`:
`(project_id, fingerprint, detector_id, host)`.

**The argument is consistency of grain.** D-01's own rationale is that "the same secret on
`api.target.com` and `cdn.target.com` is two Findings, because those are two exposures". If triage
keyed on `(fingerprint, detector_id)` alone, marking one exposure a false positive would silently
mark the other one too — and the operator would see one grain inside DefMiner and a different grain
in Caido Findings. Keeping them identical also makes "already triaged" and "already projected"
answerable from one key.

**This is a proposal awaiting operator confirmation. It is not a locked decision.** Two independent
reasons, and both must be discharged before it becomes one:

- **D-05(4) says so directly:** the triage table shape and write discipline may be designed in this
  pass; the *key* may not be fixed.
- **`05-RESEARCH.md` § O-03 marks its own recommendation `[ASSUMED]`** and says it needs operator
  confirmation because **it is one-way in the same sense D-01 is**: a triage key that changes later
  discards every triage decision made under the old one, and there is no migration that can recover
  a decision whose subject can no longer be named.

**What must confirm it:** an operator decision, taken with that irreversibility on the table, at the
point Phase 4 plan 04-03 produces a stable `fingerprint` and a stable `detector_id` — and after
`host` is exercised against ENC-03's IDNA-normalised output, which does not exist yet either.

---

## A stated bound for the suppressions list

`05-UI-SPEC.md` § "UI Considerations" leaves `overflow / suppressions-list` **⚠ unresolved**, and it
says how it wants to be answered: *"if it is not virtualised, the reason should be a stated bound,
not an omission."* This is that bound.

**Proposal: a maximum of 200 suppression rules per project, enforced at create time, with a clear
message rather than a silent refusal.**

The argument, in three parts:

1. **A rule set large enough to need a recycling scroller is a rule set the operator has lost track
   of** — and that is its own product problem, not a rendering problem. Virtualising it would make
   the symptom comfortable and leave the cause in place. The suppressions list is the surface whose
   entire job is to let an operator see and reverse what is being hidden from them; a list too long
   to read has already failed at that job, whether or not it scrolls smoothly.
2. **Rules are created one at a time, deliberately.** `05-UI-SPEC.md` fixes that a rule is created
   *from a finding, in one action*, and that the list carries **no create-rule CTA of its own**. So
   200 rules is 200 separate, attributed, deliberate operator actions on a single project — a long
   way past the point where "I have lost track of what I am hiding" is the honest reading.
3. **It keeps the surface comfortably inside the renderer's existing bounds.** The table contract
   caps the in-memory window at 2,000 rows; 200 is one tenth of that, at the same fixed 32px row
   height, so a plain non-virtualised list stays well inside a budget the phase already measured.

**Enforced at create time, not at read time.** A cap that filters on read hides rules that are still
suppressing findings — the exact failure the `partial / suppressions-list` row already forbids for a
rule whose originating finding is gone. Hitting the cap must say so, and say what to do about it
(remove rules that are no longer earning their place).

**Marked as a proposal for the pass that builds the surface**, alongside the deferred OPS-02 half in
the register below. The number is defensible, not measured; the *shape* of the answer — a stated
bound with an argument, enforced at write time — is what the UI-SPEC asked for and is the part that
should survive even if the number moves.

---

## Deferral Register

D-05(3) defers seven requirements out of this pass: **UI-03, UI-04, OPS-01, OPS-02, OPS-04, FIND-01
and FIND-02.** Each one already carries decisions the operator has made, and **a deferral that does
not carry its decisions forward is a decision that gets re-litigated wrong.** This register is where
they survive. Every subsection has the same four parts: what is deferred, what blocks it named
concretely, which phase and plan unblocks it, and the decisions the implementing pass must honour —
**quoted, not paraphrased**, because a paraphrase is where a decision starts drifting.

> **D-01's one-way rating is carried forward UNSPENT, and its checkpoint is owed.** No task in Phase 5
> writes a Caido Finding, so no `checkpoint:decision` is raised in this pass and the reversibility gate
> D-01 earned has not been spent. **The checkpoint is owed to the first task in the follow-on pass
> that calls `sdk.findings.create`.** A later executor must not reach that call without meeting it.

### UI-03 — source request, artifact version, and byte offsets

**What is deferred.** The byte-offset half. UI-03 reads *"Every entity links back to its source
request, artifact version, and byte offsets."* The offsets, and the evidence snippet they slice, are
not buildable.

**What blocks it.** The `evidence` table does not exist. `EXPECTED_TABLES` in `schema.spec.ts` is the
exact set `["analyses", "artifacts", "observations", "settings"]`, so **there are no byte offsets to
link to** — not "not wired up yet", but no rows anywhere holding a start and an end. This is the same
gap checker FLAG F1 named.

**What unblocks it.** **Phase 4, plan 04-03** — "Fingerprint storage, redaction, hash-verified reveal,
and HMAC key lifecycle".

**What IS buildable and lands in plan 05-10**, so the deferral is of contents and not of the surface:
the persistent split panel region, the loading skeleton at its own fixed height, the ERR-04 failure
copy, and the artifact-version line from the `analyses` corpus hash. The frame itself is published
now as `EvidencePanelFrame`.

**Decisions the implementing pass must honour.**

- R1, quoted: *"Match highlighting inside an evidence snippet is done by slicing, not by markup. The
  snippet is split at the byte offsets into three plain strings rendered into three sibling elements
  (before / match / after), the middle one carrying a background class. Building a `<mark>` string by
  concatenation and rendering it is precisely the defect this rule exists to prevent."*
- R1, quoted: *"A link back to a source request is a Caido navigation call with a request ID, never an
  `<a href>` built from an extracted URL. An extracted URL is data to be displayed, never a
  destination to be offered."*
- R2, quoted: *"evidence panel: 2,048 characters, with the byte range of what is shown stated."*
- The `loading / evidence-panel` resolution, quoted: *"The panel is a persistent region, so while a
  selected row's evidence loads it renders a skeleton at its own fixed height and does not collapse
  or unmount."*

**Four edge cases recorded against the contract rather than resolved**, because UI-03's byte-offset
half is blocked and resolving them now would be inventing the evidence table's semantics: two
evidence spans that **touch** are assumed to stay separate records; an entity with **zero** evidence
records renders the panel frame with an explicit no-evidence line rather than an empty panel;
evidence records are assumed **ordered by byte offset ascending with a deterministic tie-break**; and
a re-analysis running while the panel is open is assumed **not to mutate the open record set**.

### UI-04 — the score explanation

**What is deferred.** The signal list and the score itself. UI-04 reads *"Each finding shows a score
explanation — which signals fired and why it scored as it did."*

**What blocks it.** There is no signal vocabulary and no scorer. Phase 3 owns both.

**What unblocks it.** **Phase 3, plan 03-03** — "Multi-signal confidence scorer with explanations".

**What IS published now.** The frame — `ScoreExplanation` and `ScoreSignal` in
`packages/engine/src/contract.ts`, described in full above. Phase 3 binds its vocabulary to the frame
rather than the UI guessing at a payload.

**Decisions the implementing pass must honour.**

- A score renders as **a numeral plus a tier word**. `05-UI-SPEC.md` § "Visual Hierarchy" makes that
  pair the focal point of the entire page: *"Score numeral + tier word (Label weight 600, the only
  numerals on the row)"*, first in the order of visual weight.
- **Colour is redundant reinforcement only.** Quoted: *"colour is never the sole carrier of meaning."*
  A tier that is legible only as a colour is not legible.
- The signal `direction` is rendered as a word for the same reason.

**Five edge cases recorded, not resolved** — boundary, adjacency, empty, ordering and precision. The
frame states that the **numeral's rounding and tie-breaking contract is Phase 3's to declare**, and
this pass records that the requirement exists rather than inventing the rule.

### OPS-01 — triage persistence

**What is deferred.** The triage **key**, and therefore the table. OPS-01 reads *"Findings can be
triaged — marked reviewed, false positive, or accepted — and that state persists."*

**What blocks it.** The stable entity identity triage keys on. It cannot be `analyses`'s primary key,
which is `(project_id, sha256, detector_set_hash)`. D-05(4) is explicit: the table shape and write
discipline may be designed now; **the key may not be fixed**.

**What unblocks it.** **Phase 4, plan 04-03**, plus the operator confirmation the upward requirement
above describes.

**What is NOT blocked, and is designed now.** The **write discipline**, which follows from the driver
and not from the schema: **one idempotent statement per write, keyed on a natural key, safe to
replay.** The reasons are shipped facts — `BEGIN` does not span `exec` calls and fails silently, so
**no invariant may require two statements**; and `last_insert_rowid()` is unusable on the pooled
connection, so a write keys on a natural key or it cannot key at all. The vocabulary is published as
`TRIAGE_STATES`.

**Decisions the implementing pass must honour.**

- The `loading / triage-controls` resolution, quoted: *"The control enters a disabled in-flight state
  and the row's triage badge **does not optimistically flip before the write confirms**. An optimistic
  flip that later fails would show the operator a triage state that was never persisted, on the
  surface whose whole purpose is durable triage."*
- The `error / triage-controls` resolution, quoted: *"A failed triage write surfaces the failure and
  leaves the **prior** state visibly in place. It never silently reverts and never leaves the badge
  showing the attempted state."*
- The triage vocabulary is `new` · `reviewed` · `false_positive` · `accepted`, snake_case, and is
  imported from `contract.ts` rather than restated.

**Edge cases recorded, not resolved:** OPS-01 / unclassified. The write discipline is designed here;
the key is not.

### OPS-02 — suppression

**What is deferred.** The suppressions table and its surface. OPS-02 reads *"A suppression mechanism
so a known-benign pattern on a given target stops reappearing, without editing the rule corpus."*

**What blocks it.** The same stable entity identity a rule's scope resolves against.

**What unblocks it.** **Phase 4, plan 04-03.**

**What is NOT blocked: the mechanism is decided.** **Suppression filters at QUERY time, not at write
time.** Four reasons, in order of weight:

1. `05-UI-SPEC.md` states *"Suppression is reversible; Findings projection is not"*, and the removal
   copy promises *"{n} previously hidden findings will reappear on the next analysis."* **Both
   sentences are only true if the rows were never deleted.** Write-time blocking makes suppression
   irreversible in effect, contradicting the contract and the operator's stated "prefer the design
   that writes less" doctrine in one move.
2. Write-time blocking needs the rule set consulted **on the ingest path, on the single QuickJS
   thread, per candidate.** Query time moves that cost to a surface the operator is already waiting
   on.
3. **OPS-04 requires suppression to survive a corpus bump and re-analysis.** Query-time filtering gets
   that for free; write-time filtering has to re-apply rules during re-analysis, which is a second
   statement the driver cannot make atomic with the first.
4. **Retroactivity is not a separate decision under query-time filtering — it is what query-time
   means.** A new rule hides existing rows on the next read.

**Decisions the implementing pass must honour.**

- **Suppression rides inside the bounded candidate window.** The unbounded `NOT EXISTS` form measured
  4,000,023 VM steps in the pathological case (100% of rows suppressed, page returns 0) against
  15,527 with an inner `LIMIT 500` — a 258× reduction whose real property is that **the cost stops
  depending on filter selectivity.** Measured on SQLite 3.51.0, not on Caido's 3.46.0; see the
  provenance note above.
- **The suppressions table is keyed to give a covering index on project plus scope kind plus scope
  value** — the composite primary key `(project_id, scope_kind, scope_value)` provides it for free,
  which the query plan confirmed.
- **The list is a first-class surface**, quoted: *"rules are visible, attributed to the finding that
  created them, and removable."*
- A rule is created **from a finding**, in one action, listing its scope (this value / this pattern /
  this host) at the point of creation.
- The suppressions-list bound proposed above (200 rules per project, enforced at create time) is the
  answer to that surface's `⚠ unresolved` overflow row, and is a **proposal** for this pass.
- `VisibleTotal`'s semantics are already fixed: the headline number counts reachable rows and
  **suppressed rows are not inside it**; `hiddenBySuppression` is a separate second line.

**Edge cases recorded, not resolved:** OPS-02 / unclassified.

### OPS-04 — survival across a corpus bump

**What is deferred.** The property itself. OPS-04 reads *"Triage and suppression state survives
re-analysis after a corpus version bump."*

**What blocks it.** The same stable entity identity. Nothing can be shown to survive a bump until
there is a key that is not derived from the corpus.

**What unblocks it.** **Phase 4, plan 04-03.**

**Decisions the implementing pass must honour.** The one negative `05-UI-SPEC.md` does fix, quoted:
*"Triage is **keyed on a stable entity identity, never on `detector_set_hash`** — otherwise a corpus
bump silently discards every triage decision the operator made, which is exactly what OPS-04
forbids."*

**And its mechanical reason, which is why the negative is not merely advice:** `analyses`'s primary
key **is** `(project_id, sha256, detector_set_hash)`, so **triage cannot hang off an analysis row
without inheriting the corpus hash.** The convenient implementation is the forbidden one. That is
threat T-05-19, and it is the failure mode this register exists to stop reaching the code.

Also carried: the re-raise copy, quoted — *"Re-raised by rule corpus {version}. Your earlier triage
("{state}", {date}) was preserved and is still applied."* Survival that is not stated on screen is
survival the operator cannot rely on.

**Edge cases recorded, not resolved:** OPS-04 / unclassified.

### FIND-01 — native Caido Findings projection

**What is deferred.** The projection surface and the write. FIND-01 reads *"Native Caido Findings are
created for high-signal results only, with stable `dedupeKey`s. (Findings cannot be updated or
deleted — every false positive is permanent.)"*

**What blocks it.** The high-signal tier does not exist. It reduces to provider-format-verified AND
checksum-valid AND not-stopworded, and nothing in the repo can evaluate any of the three terms yet.

**What unblocks it.** **Phase 3 plan 03-01** (the rule schema's checksum verifier reference) and
**Phase 3 plan 03-03** (the scorer), then **Phase 4 plan 04-03** (the fingerprint) and Phase 4's
SEC-01 (the verifiers). Both upward requirements above are aimed at exactly this.

**Decisions the implementing pass must honour — quoted verbatim, with their reversibility ratings.**

> **D-01: A projected Finding's `dedupeKey` is `HMAC fingerprint + detector id + host`.** The artifact
> digest is deliberately **excluded** — it changes on every deploy, so a digest-keyed Finding would
> re-project the same unrotated key for the length of the engagement. `detector_set_hash` is
> deliberately **excluded** — including it means a corpus bump re-projects the entire inventory. The
> same secret on `api.target.com` and `cdn.target.com` is two Findings, because those are two
> exposures.
> — **Reversibility: one-way** — `sdk.findings.create` has no update and no delete, so every key
> already written is permanent and cannot be re-composed. Changing the recipe later re-projects every
> entity under the new key while the old-key Findings remain, permanently duplicating everything
> projected before the change. **There is no migration.**

> **D-02: A Finding attaches to the newest observation whose request still resolves.** Walk the
> entity's observations newest-first through `sdk.requests.get`. If no observation resolves, the row
> appears in the projection preview marked **unprojectable, with the reason stated**, and the rest of
> the batch proceeds. **It is never silently dropped.** Rationale: a Finding is a pointer into the
> operator's traffic; a permanent pointer to a request the retention sweep or Caido has pruned is dead
> weight they cannot investigate and cannot delete.
> — **Reversibility: costly** — Findings already written keep the request they were attached to and
> cannot be re-pointed, so a later rule change leaves a permanently mixed corpus. The unprojectable-row
> state is also part of the preview's row model and the projection RPC's return shape.

> **D-03: Projection is per-row opt-in. No select-all, no numeric batch cap.** Every preview row starts
> unchecked; the operator ticks each row they want. The batch is bounded by effort rather than an
> arbitrary number, which is what FIND-01/R4's "review row by row" actually asks for.

**The four O-04 sanitisation rules for `title` and `description`**, which exist because a Finding
renders in Caido's own UI, outside DefMiner's DOM, where R1 and R2 do not reach — and unlike a table
cell it can never be re-rendered:

- **F-1 — `title` contains no target-controlled bytes at all, except a host that has passed a strict
  allowlist.** `title = "DefMiner: " + <DefMiner-authored detector display name> + " on " + <host>`,
  where `<host>` is admitted only if, after ENC-03's IDNA normalisation, it matches
  `^[a-z0-9.-]{1,253}$` with no leading or trailing `.` or `-` and no empty label. **A host that fails
  is not sanitised into shape — the row is marked unprojectable with the reason stated**, reusing
  D-02's existing state rather than inventing a second one. *(Recorded as a proposal to be exercised
  against Phase 4's normalised host output before it is fixed.)*
- **F-2 — `description` carries target-controlled bytes only through the R2 pipeline, at the tighter
  of R2's two caps**, in this order and the order is the rule: strip C0/C1 (**remove, never escape** —
  R2's visible-escape option exists because the evidence panel can be re-rendered and a Finding cannot);
  strip bidi overrides and isolates; grapheme-safe truncate to **256** characters, the table-cell cap
  and not the 2,048 panel cap, because a Finding is permanent and unscrollable and closer in kind to a
  cell than to a panel; never the raw secret value, the redacted preview only; and never an extracted
  URL rendered as a URL.
- **F-3 — the preview shows the sanitised bytes, not the source bytes.** Whatever the operator ticks
  must be **byte-identical** to what `create` receives. A preview that shows one string and writes
  another is a consent defect on the one action that cannot be undone. The sanitiser is a pure
  function in `packages/engine/` called once, its output carried into both the preview row and the
  `FindingSpec`.
- **F-4 — `reporter` is the constant `"DefMiner"`.** The SDK documents it as the grouping key.

**The five SDK facts that shape the code**, read from the pinned typings and not from the docs:

1. **No `update`, no `delete`, no severity, no confidence, no URL, no metadata.** `FindingSpec` is
   `{ title, description?, reporter, dedupeKey?, request }` and `FindingsSDK` is `get` / `exists` /
   `create`.
2. **`dedupeKey` is optional, and omitting it means no dedupe at all.** D-01's recipe must be applied
   unconditionally; a code path that can produce `undefined` there writes unbounded duplicates.
3. **`create` is already idempotent on the dedupeKey** — *"If a finding with the same dedupe key
   already exists, it will not be created."* That softens re-runs and changes **nothing** about a
   recipe change, which is what D-01's warning is actually about.
4. **`exists(dedupeKey)` is a cheap per-row pre-check.** The preview calls it per row and marks
   already-projected rows, so the operator is never asked to re-tick something permanent.
5. **`create` throws, and this runtime surfaces neither a throw nor a rejection** — SPIKE-03 found zero
   traces of a thrown error across 22,876 host-log lines. **Every `create` is individually caught and
   its outcome reported per row.**

**Also carried:** the operator declined the researcher's recommendation to *block* on `partial` /
`failed` contributing artifacts. **Projection WARNS, it does not block** — the UI-09 floor statement
and the affected-artifact count appear before the confirmation. Do not re-open it.

**Edge cases recorded, not resolved:** FIND-01 / adjacency, empty, ordering.

### FIND-02 — entropy-only and hint-grade never project

**What is deferred.** The demonstration. FIND-02 reads *"Entropy-only and hint-grade results never
project to Findings."*

**What blocks it.** The same high-signal tier — there is nothing yet to be excluded *from*.

**What unblocks it.** **Phase 3 plan 03-01** and **plan 03-03**, then **Phase 4 plan 04-03**.

**Decisions the implementing pass must honour.**

- **This is satisfied STRUCTURALLY, NOT BY A FILTER.** It is not a rule the projection code applies —
  **it is what remains when the tier is a three-way conjunction.** An entropy-only result has no
  provider-format term to satisfy, so it never enters the projectable set in the first place. A pass
  that implements FIND-02 as an exclusion list has misread it and has built a control that can be
  forgotten.
- **R4's requirement falls out for free**, quoted: *"Entropy-only and hint-grade results are **not
  shown as projectable at all**. They are not merely unchecked by default; they are absent from the
  preview, and the surface states why."*
- **The exclusion count line is the difference between the inventory count and the preview count** —
  *"{n} results are entropy-only or hint-grade and are never projected to Caido Findings."* Deriving
  it as a difference rather than counting a filtered-out set is what keeps it true when the tier
  changes.

**Edge cases recorded, not resolved:** FIND-02 / unclassified.

### Carried covered rows (deferred surfaces)

**Why this table exists, and why these rows are not somewhere else.** The fifteen rows below are
`05-UI-SPEC.md` § "UI Considerations" rows marked **✅ covered** — resolved, not open — on three
surfaces this phase does not build. That combination has no other home:

- **They are not assumptions.** An assumption is an open question surfaced so it is not silently
  dropped. These are answered. Filing a resolution as an assumption re-opens it.
- **They cannot be this phase's `must_haves` truths either.** A truth is checked against what exists
  when the phase ends, and **the surfaces will not exist** — so a truth asserting how
  `suppressions-list` renders its empty state could only fail. A gate that can only fail is not a
  gate.
- **So they live here.** The register is an artifact this pass genuinely produces, which makes the
  claim checkable against a real file. And the implementing pass reads this table instead of
  re-deriving the resolutions from the design contract — **which is the step at which a resolution
  silently becomes a re-litigation.**

Three surfaces: `triage-controls` (3 rows), `suppressions-list` (6 rows),
`findings-projection-preview` (6 rows). Fifteen in all.

| Category | Element | Resolution the implementing pass must honour |
|---|---|---|
| loading | `triage-controls` | The control enters a disabled in-flight state and the row's triage badge **does not optimistically flip before the write confirms** — an optimistic flip that later fails would show the operator a triage state that was never persisted, on the surface whose whole purpose is durable triage. |
| error | `triage-controls` | A failed triage write surfaces the failure and leaves the **prior** state visibly in place; it never silently reverts and never leaves the badge showing the attempted state. |
| long-text | `triage-controls` | Button labels are the fixed DefMiner-authored strings in `## Copywriting Contract`, so no target-controlled string reaches a control label. |
| empty | `suppressions-list` | Zero rules renders an empty state explaining that suppression rules are created **from a finding**, in one action — and carries **no create-rule CTA of its own**, because a rule authored there would have no originating finding to attribute it to, breaking the attribution the populated state depends on. |
| loading | `suppressions-list` | Skeleton rows, under the same no-spinner rule as the findings table. |
| error | `suppressions-list` | A failed load renders an explicit error, **never an empty list** — an empty suppressions list means "nothing is being hidden from you", so presenting a load failure that way tells the operator the opposite of the truth about what they are seeing. |
| populated | `suppressions-list` | Each rule shows its scope (this value / this pattern / this host), attribution to the finding that created it, and a remove action carrying the reversibility copy from `## Copywriting Contract`. |
| partial | `suppressions-list` | A rule whose originating finding is no longer present **still renders**, with its scope intact and an explicit note that the source finding is gone — a silently dropped rule row is a rule still suppressing findings with nothing on screen to say so. |
| zero-one-many | `suppressions-list` | Singular and plural agree on rule counts and on the "{n} previously hidden findings will reappear" removal copy, by the same rule as the findings table; never "1 finding(s)". |
| empty | `findings-projection-preview` | When no result qualifies, the **Create Caido Findings** CTA is disabled and the surface states why, including R4's exclusion line: "{n} results are entropy-only or hint-grade and are never projected to Caido Findings." |
| loading | `findings-projection-preview` | The confirm action stays disabled until the preview has **fully** loaded — an irreversible write must not be confirmable against a partially-rendered list of what it will write (FIND-01). |
| error | `findings-projection-preview` | If the preview fails to load, projection is **blocked entirely**; there is no "create anyway" path, because the one action in the tool that cannot be undone is never offered without the review surface that justifies it. |
| populated | `findings-projection-preview` | A row-by-row list of exactly what will be written (R4), with entropy-only and hint-grade results **absent rather than unchecked**, and the count of those exclusions stated. |
| partial | `findings-projection-preview` | When any contributing artifact is `partial` or `failed`, the preview carries the UI-09 floor statement and the count of affected artifacts **before** the confirmation — projecting from an incomplete analysis writes permanent Findings from a floor, and FIND-01 means that cannot be corrected later. |
| zero-one-many | `findings-projection-preview` | "Create {n} Caido Findings?" and "Create {n} Findings" agree in number at n=1, as does the exclusion line. |

Two rows on these surfaces are **🧪 backstop** rather than covered and are carried as verification
obligations rather than as resolutions: suppression rules reference target-controlled **values and
patterns**, so R1 and R2 apply in full at the 256-character table-cell cap and the hostile-content
fixture extends to that surface; and projection-preview rows render target-controlled values, so R1
and R2 apply at the same cap and the fixture extends to the preview too. Three further rows on these
surfaces are **⚠ unresolved** and are handled above: `overflow / suppressions-list` by the stated
bound, `overflow / findings-projection-preview` by D-03, and the projection-blocking question by the
operator's decision to warn rather than block.

### The whole deferral in one view

| Requirement | What is deferred | What blocks it | Unblocked by |
|---|---|---|---|
| **UI-03** | Byte offsets and the evidence snippet they slice | The `evidence` table does not exist — no offsets to link to | **Phase 4, plan 04-03** (panel frame lands in 05-10) |
| **UI-04** | The score and the signals that explain it | No signal vocabulary and no scorer | **Phase 3, plan 03-03** (frame published here) |
| **OPS-01** | The triage key and its table | The stable entity identity; `analyses`'s key carries the corpus hash | **Phase 4, plan 04-03** + operator confirmation (write discipline designed here) |
| **OPS-02** | The suppressions table and surface | The same stable entity identity a rule's scope resolves against | **Phase 4, plan 04-03** (query-time mechanism decided here) |
| **OPS-04** | Survival across a corpus bump | The same stable entity identity | **Phase 4, plan 04-03** |
| **FIND-01** | The projection preview and the permanent write | The high-signal tier — no term of the conjunction is evaluable yet | **Phase 3 plans 03-01 and 03-03**, then **Phase 4 plan 04-03** and SEC-01 |
| **FIND-02** | The demonstration that entropy-only never projects | The same tier — nothing yet to be excluded from | **Phase 3 plans 03-01 and 03-03**, then **Phase 4 plan 04-03** |
