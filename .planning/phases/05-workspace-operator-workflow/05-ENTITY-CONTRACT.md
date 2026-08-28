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
