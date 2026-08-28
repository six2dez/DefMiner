# Phase 05: Workspace & Operator Workflow - Context

**Gathered:** 2026-08-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn the SQLite database into a sidebar workspace an operator reads, triages, and trusts —
project-wide aggregation, evidence with score explanations, triage and suppression that survive
re-analysis, inert rendering of target-controlled content, safe export, and native Caido Findings
projection for the high-signal tier only.

Fixed by `ROADMAP.md` Phase 5. Requirements: UI-01/02/03/04/06/07/08/09, OPS-01…04,
UISEC-01…03, FIND-01/02, STORE-08 (`audit`). **UI-05 (reconstructed-source viewer) is Phase 7,
FIND-03/04 (retroactive scan) and DEPLOY-* are Phase 6** — not this phase.

</domain>

<decisions>
## Implementation Decisions

### Note on `05-UI-SPEC.md`

`check_spec`'s glob matched `05-UI-SPEC.md`, but that is a `/gsd-ui-phase` **design contract**, not
a `/gsd-spec-phase` requirements lock — it carries no `## Requirements` and no `## Boundaries`
section. No `<spec_lock>` block is emitted here because doing so would mean inventing those
sections. **It is nonetheless binding**: it is the first canonical reference below and downstream
agents MUST read it. Its locked decisions are summarised under "Carried Forward" and are not
re-opened.

### Irreversible Actions — discussed and locked

- **D-01: A projected Finding's `dedupeKey` is `HMAC fingerprint + detector id + host`.**
  The artifact digest is deliberately **excluded** — it changes on every deploy, so a
  digest-keyed Finding would re-project the same unrotated key for the length of the engagement.
  `detector_set_hash` is deliberately **excluded** — including it means a corpus bump re-projects
  the entire inventory. The same secret on `api.target.com` and `cdn.target.com` is two Findings,
  because those are two exposures.
  — **Reversibility:** one-way — `sdk.findings.create` has no update and no delete, so every key
  already written is permanent and cannot be re-composed. Changing the recipe later re-projects
  every entity under the new key while the old-key Findings remain, permanently duplicating
  everything projected before the change. There is no migration.

- **D-02: A Finding attaches to the newest observation whose request still resolves.**
  Walk the entity's observations newest-first through `sdk.requests.get`. If no observation
  resolves, the row appears in the projection preview marked **unprojectable, with the reason
  stated**, and the rest of the batch proceeds. It is never silently dropped. Rationale: a Finding
  is a pointer into the operator's traffic; a permanent pointer to a request the retention sweep
  or Caido has pruned is dead weight they cannot investigate and cannot delete.
  — **Reversibility:** costly — Findings already written keep the request they were attached to and
  cannot be re-pointed, so a later rule change leaves a permanently mixed corpus. The
  unprojectable-row state is also part of the preview's row model and the projection RPC's
  return shape.

- **D-03: Projection is per-row opt-in. No select-all, no numeric batch cap.**
  Every preview row starts unchecked; the operator ticks each row they want. The batch is bounded
  by effort rather than an arbitrary number, which is what FIND-01/R4's "review row by row"
  actually asks for. This resolves the `overflow / findings-projection-preview` row that
  `05-UI-SPEC.md` `## UI Considerations` left `⚠ unresolved`.

- **D-04: Exports are a browser download over the RPC. No server-side file is written.**
  The backend serialises the export and returns it across the RPC; the frontend builds a Blob and
  triggers a download onto the operator's own machine. Consequences, all intended: nothing to
  quota, orphan-clean, label, or make reachable; identical behaviour on local desktop, remote CLI,
  and Docker with or without a persistent volume; and a raw (unredacted) export never touches
  shared server disk. The export size is bounded by the row count that crosses the RPC in memory.
  — **Reversibility:** costly — undoing this means introducing a server path, quotas, orphan
  cleanup and `sdk.hostedFile` delivery (DEPLOY-03/04, Phase 6), and it changes the export RPC's
  return shape, which is a frontend contract.

**Follow-up D-04 creates:** `05-UI-SPEC.md` `## Copywriting Contract` — the raw-export confirmation
reads *"It is written to the Caido server and is your responsibility from that point on."* That
sentence is now wrong and must be amended to describe a download to the operator's machine.
`## Rendering Safety Contract` R5 (server-side path labelling) still applies to any path the
Settings surface displays; it no longer applies to exports, because exports produce no server path.
**Discharged 2026-08-28 by D-07 below.**

### Post-research decisions (2026-08-28) — operator calls on escalations from `05-RESEARCH.md`

The researcher returned `## RESEARCH COMPLETE` with three items it explicitly refused to decide
alone. These are the operator's answers. They are locked, exactly as D-01 … D-04 are.

- **D-05 (resolves O-02): Do not re-sequence Phase 5. Split it, and emit an entity read contract
  upward to Phases 3/4.** Concretely:
  1. **Plan and execute now:** 05-01 (sidebar shell, navigation, settings surface), 05-02 (tables —
     keyset pagination, virtualised scrolling, filtering, coalesced events) built over the shipped
     `artifacts` / `observations` tables, and the **safety + export half of 05-05** (rendering
     safety R1–R3, the hostile-content fixture, the CSV/JSON exporter, the D-04 Blob download) over
     `observations.url`, which is genuinely target-controlled and is the right first subject.
  2. **Phase 5 authors and publishes the entity read contract** — not Phase 4's storage schema, but
     the four columns `05-UI-SPEC.md` already binds (state/score, target-controlled value, last
     seen, triage state), the cursor tuple shape, the invalidation category name, and the
     score-explanation record shape UI-04 renders. A document plus a TypeScript type in
     `packages/engine/` (the SDK-free workspace). Phase 5 is the only consumer, so it is Phase 5's
     to write. This also answers UI-SPEC FLAG F1: specify the evidence-panel *frame* (which fields
     are mandatory, which are target-controlled, which carry `font-mono`) and leave the signal
     vocabulary to Phase 3.
  3. **Do NOT plan, and do not invent a schema for:** 05-03 in full, the triage/suppression halves
     of 05-04 (OPS-01/02/04 — they key on an entity identity Phase 4's plan 04-03 defines), and the
     projection half of 05-05 (FIND-01/02 — it needs the high-signal tier from Phases 3/4). These
     are deferred to a follow-on pass after Phase 4, and the plan set must say so explicitly rather
     than silently omitting them.
  4. **Still in scope inside 05-04 today:** the `audit` table (STORE-08) and the retry path
     (OPS-03, over `analyses.scan_state`). The triage/suppression *table shape and write
     discipline* may be designed now; the *key* may not be fixed.
  — **Reversibility:** costly — the published entity read contract becomes a cross-phase interface
  Phases 3 and 4 build against. Changing it later means changing their plans, not just Phase 5's.

- **D-06 (resolves O-03's retention question): `audit` is exempt from the retention age bound and
  keeps only a raised row bound.** An audit trail exists to answer "when did I project this
  permanent Finding, and what did I export" — questions asked long after 90 days, about actions
  that are themselves irreversible. `sweepRetention`'s row cap still bounds growth, so the database
  stays bounded. This is a deliberate, single, documented exception to the per-table-per-project
  policy P4-D7 established, and the exception must be visible in the sweep code, not implicit.

- **D-07 (resolves part of O-04's neighbourhood — the raw-export copy): `05-UI-SPEC.md`
  `## Copywriting Contract` raw-export confirmation is amended and the amendment is already
  applied.** It was wrong twice: it described a server-side file (contradicted by D-04), and it
  promised *"{n} live secret values in cleartext"*, which URL query values cannot honour because
  `observations.ts` redacts query values at write time — a "raw" export cannot un-redact what was
  never stored. The new copy states the download target and states plainly that write-time-redacted
  values stay redacted. 05-05 must use the amended string verbatim.

**Considered and explicitly declined [informational] — do not re-open, do not treat as oversights:**

- The `"{total} secrets exist on this target"` filtered-empty copy **stays exactly as approved.**
  The operator reviewed the objection (it uses a word on `telemetry.ts`'s
  `FORBIDDEN_COMPLETENESS_WORDS`, and would count suppressed rows) and chose to keep it. Verified
  during this run: that word list is scoped to counter names, RPC field names and strings
  `telemetry.ts` itself projects, enforced only by `telemetry.spec.ts` against that module — it
  does **not** reach frontend copy, so there is no mechanical failure here. The residual is
  semantic only. **What the planner must still do:** define explicitly what `{total}` counts and
  state whether suppressed rows are inside it. The copy is fixed; the number behind it is not yet
  specified.
- **O-05 stays as the UI-SPEC has it: projection WARNS on `partial`/`failed` contributing
  artifacts, it does not block.** The researcher recommended blocking; the operator declined. The
  UI-09 floor statement and the affected-artifact count still appear before the confirmation.

### Open — raised, NOT decided in this discussion

> **Status as of 2026-08-28, after research.** `O-02` → resolved by **D-05**. `O-03`'s retention
> question → resolved by **D-06**; the rest of O-03 (suppression mechanism, `audit` shape, triage
> identity) is answered with evidence in `05-RESEARCH.md § O-03` — read it there, and note that the
> triage *key* remains blocked on Phase 4 per D-05(3). `O-05` → decided: keep the UI-SPEC's warn
> behaviour (see the declined block above). `O-01`, `O-04` and `O-06` are answered with executed
> measurements in `05-RESEARCH.md` — the planner follows the research, not the open text below.
> The text below is kept as the original statement of each question, not as a live to-do list.

These were surfaced and consciously left open. **They are not defaults and must not be read as
locked.** The researcher should investigate them and the planner must either resolve them from
evidence or escalate — not invent an answer.

- **O-01: Server-side filtering and sorting versus the SQL discipline gate.**
  `05-UI-SPEC.md` mandates server-side filter and sort with keyset pagination and *bans*
  client-side sorting. `packages/backend/src/store/sql-discipline.spec.ts` is a static TypeScript
  AST gate over **every** non-spec `.ts` in the backend package that fails on interpolated SQL,
  concatenated SQL, named parameters, module-scope `prepare`, and any multi-row statement not
  scoped by `project_id`. Its only exemption is `migrations.ts`'s `PRAGMA user_version = ` head.
  Every existing read is one fixed literal statement with `LIMIT ?` — no cursor, no filter, no
  sort choice. Candidate approaches named during discussion, none chosen: enumerate a fixed matrix
  of literal statements; add an allowlisted builder over a closed identifier enum with values
  always bound; or use null-guard predicates (`(? IS NULL OR col = ?)`) inside one literal
  statement. Also unresolved: whether the RPC surface stays ad-hoc `sdk.api.register` calls or
  gains a typed, versioned contract.

- **O-02: Phase 5 depends on Phase 4, and Phases 2–4 are unplanned.**
  The `entities` and `evidence` tables (Phase 4, SEC-*) do not exist. `05-UI-SPEC.md` explicitly
  declined to fix entity table column lists for this reason, while binding any future column to
  four always-present columns in order and to R1/R2. Whether Phase 5 defines the entity contract
  that Phases 3/4 must then satisfy, or builds only over the shipped `artifacts` /
  `observations` / `analyses` tables, is undecided. **This determines whether the phase is
  plannable as scoped and should be resolved before planning starts.**

- **O-03: Triage, suppression, and the `audit` table.**
  STORE-08 assigns `audit` to Phase 5 and nothing specifies its shape. Undecided: whether
  suppression filters at query time or blocks at write time; whether it applies retroactively;
  whether suppressed findings still count toward the `"{total} secrets exist on this target"` copy;
  what `audit` records (triage transitions, suppression create/remove, projections, raw exports,
  reveals); and what stable entity identity triage keys on — `05-UI-SPEC.md` fixes only the
  negative, that it is **never** `detector_set_hash` (OPS-04).

- **O-04: Sanitisation of target-controlled bytes inside a Finding's `title` and `description`.**
  Raised in discussion, not resolved. A Finding renders in Caido's own UI, **outside DefMiner's
  DOM**, so `05-UI-SPEC.md` R1/R2 do not reach it — and unlike a table cell it can never be
  re-rendered, because Findings are immutable. Needs its own rule.

- **O-05: Whether projection is blocked, not merely warned, when contributing artifacts are
  `partial` or `failed`.** `05-UI-SPEC.md` currently warns (the UI-09 floor statement appears
  before confirmation) but does not block.

- **O-06: The exact composition of the high-signal tier in Phase 5.**
  `.planning/research/PITFALLS.md` P2 defines it as provider-format-verified AND (checksum-valid OR
  network-validated) AND not stopworded. Network validation ships later and OFF by default, so the
  Phase 5 tier reduces to format + checksum + not-stopworded — this needs confirming against the
  Phase 3/4 detector output rather than assuming.

### Carried Forward — locked upstream, do not re-open

From `05-UI-SPEC.md` (approved 2026-08-28, 6/6 checker dimensions PASS):

- **Stack, exact pins:** PrimeVue `4.1.0` EXACT with `@caido/primevue@0.3.3` `Classic` pt
  (`unstyled: true`); Tailwind `3.4.13` EXACT (v3, PostCSS plugin, `preflight: false`);
  `postcss-prefixwrap@1.57.2` wrapping every rule in `#plugin--defminer`, mandatory;
  `vue-virtual-scroller@2.0.0-beta.8` `RecycleScroller`; `pinia@3.0.4`; `@vueuse/core@14.2.0`.
  **No icon library.** `vue`, `@caido/frontend-sdk`, `@codemirror/*`, `@lezer/*` must be `external`.
- **Visual contract:** seven-value spacing scale, fixed **32px** row height coupled to
  `RecycleScroller`'s `item-size`; four type sizes, two weights (400/600); mandatory `font-mono`
  on every target-controlled string, as a security control; **zero hex literals** — six Caido
  colour roles only; accent reserved to five named elements, destructive to four; colour is never
  the sole carrier of meaning.
- **Rendering safety R1–R5:** `v-html` banned by lint as an error with no per-line disable, plus
  `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`new Function`/`eval`; match
  highlighting by string slicing, never by building markup; C0/C1 strip; bidi override and isolate
  strip; grapheme-safe truncation at **256 chars** in a table cell and **2,048** in the evidence
  panel; **no target-controlled content in tooltips, `title`, or `data-*` attributes, ever**; CSV
  formula neutralisation as apostrophe-prefix **then** quote-wrap, in that order; redacted export
  is the pre-selected default with no "remember this choice" for raw.
- **Table contract:** 100-row keyset pages, cursor never `OFFSET`, 2,000-row in-memory window,
  server-side sort and filter with client-side sorting banned.
- **Event coalescing (UI-07):** backend→frontend events carry an invalidation summary only
  (`{ projectId, category, changedCount, newestId }`) — no findings payload, no bodies; 500 ms
  trailing window, capped at 2 UI reactions/second; **the table never re-orders while a row is
  selected or the panel is open** — new counts accrue into the pill and apply only on Refresh.
- **Vocabularies:** status labels bound to the shipped `scan_state` CHECK constraint
  (`pending`/`running`/`done`/`partial`/`failed`); triage is
  `new`/`reviewed`/`false_positive`/`accepted`, keyed on stable entity identity, never on
  `detector_set_hash`.
- **UI-SPEC Open Decisions D1–D5 stand as shipped:** reveal is panel-only and auto-re-redacts;
  projection is operator-confirmed with a preview; zero-row export is disabled with the reason on
  the button; the coalescing pill never auto-applies; row height is 32px with no density toggle.
- **Four open checker FLAGs (F1–F4)** are recorded in `05-UI-SPEC.md` and unresolved. F1 is the
  substantive one: the evidence panel has no fixed frame for the UI-04 score explanation or UI-03's
  artifact version and byte offsets.

From `PROJECT.md` / `STATE.md`, project-wide and non-negotiable here:

- No raw secret value is ever persisted to SQLite, logs, or any frontend event — HMAC fingerprint
  plus redacted preview only; reveal re-verifies the original request's body hash and fails closed.
- QuickJS is single-threaded with no worker threads; CPU-bound work is strictly serial.
- Every write is `project_id`-scoped and re-checks the project epoch; `describeError` redacts
  URL-shaped substrings **before** truncating on anything crossing the RPC boundary.
- Detector rules ship with the plugin version — the Caido Developer Policy forbids self-update.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The design contract for this phase — read first
- `.planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md` — the binding visual, copy,
  rendering-safety, table, coalescing and vocabulary contract. `## Rendering Safety Contract`
  R1–R5 and `## Data & Interaction Contract` are the load-bearing halves. `## Open Decisions`
  D1–D5 and `## Checker Sign-Off` FLAGs F1–F4 are still live.

### Requirements and scope
- `.planning/ROADMAP.md` § "Phase 5: Workspace & Operator Workflow" — goal, the eight success
  criteria, and the five plan titles.
- `.planning/REQUIREMENTS.md` § "Workspace UI (UI)" — UI-01/02/03/04/06/07/08/09.
- `.planning/REQUIREMENTS.md` § "Operator workflow (OPS)" — OPS-01…04.
- `.planning/REQUIREMENTS.md` § "Frontend safety (UISEC)" — UISEC-01/02/03.
- `.planning/REQUIREMENTS.md` § "Caido integration (FIND)" — FIND-01/02 (FIND-03/04 are Phase 6).
- `.planning/REQUIREMENTS.md` § "Persistence (STORE)" — STORE-08, which assigns `audit` here.
- `.planning/REQUIREMENTS.md` § "Observability (OBS)" — OBS-01/02 are Phase 2 but the UI-SPEC's
  tab strip and error copy both route the operator to a Health surface.

### Research that settles specific questions
- `.planning/research/PITFALLS.md` § "P2: False-positive collapse" — why Findings are a top tier
  only, and the measured 1.9M-candidates/119-verified noise floor behind D-01 and D-03.
- `.planning/research/PITFALLS.md` § "P3: Event-loop starvation" — a frozen-looking page is the
  backend's blocked QuickJS thread, which is why the Health tab exists.
- `.planning/research/PITFALLS.md` § "P9" and § "Recovery Strategies" — an FP flood already
  written to Findings is HIGH-cost and manual-only to recover; only prevention works.
- `.planning/research/STACK.md` § "Frontend Libraries" and § "Frontend — How the Caido Theme Is
  Actually Consumed" — the exact pins and the pass-through theme consumption mode.
- `.planning/research/CODEX-CONTRAST.md` §4.2 (backend/frontend split), §4.7 (100-row virtualised
  UI page budget), §4.8 (the configuration surface and its High signal / Balanced / Everything
  profiles), §4.9 (the sidebar page's proposed contents).

### Code that constrains this phase
- `packages/backend/src/store/sql-discipline.spec.ts` — the static gate behind O-01. Read the
  header comment: every failure mode it guards is silent on this driver.
- `packages/backend/src/index.ts` — the RPC registration site (`getStatus`, `getCompat`,
  `getArtifacts`, `getObservations`) and `init()`'s ordering contract. Line ~175 records that
  COMPAT-01's **visible** refusal surface is owed to Phase 5 (decision P1-D5).
- `packages/backend/src/store/settings.ts` — project→global→default resolution, built three-level
  specifically because "Phase 5 will want an operator-wide default"; `DEFAULT_RETENTION_MAX_ROWS`
  and `DEFAULT_RETENTION_MAX_AGE_MS` note there is no UI to change them until this phase.
- `packages/backend/src/store/analyses.ts` — `SCAN_STATES`, the closed vocabulary the UI-SPEC's
  status labels bind to, and `TERMINAL_SCAN_STATES`.
- `packages/backend/src/store/artifacts.ts` / `observations.ts` — `listArtifacts`,
  `listObservations`, `countArtifacts`, `countObservations` as they exist today: fixed literal
  statements, `LIMIT ?` only, deterministic secondary sort keys.
- `packages/backend/src/telemetry.ts` — `slimStatus()`, the counters, `describeError`,
  `URL_REDACTION`, `PATH_REDACTION`.
- `packages/backend/src/store/migrations.ts` — the shipped v2 schema and the `scan_state` CHECK
  constraint; where `audit` (STORE-08) would be added by a forward step.
- `caido.config.ts` — currently declares only the two Phase-0 tier1 backend probes. The
  `{ kind: "frontend" }` entry does not exist yet.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`store/settings.ts`**: three-level resolution (project row → global row → documented default)
  is already shipped and was written for UI-08. The settings surface can expose an operator-wide
  default with a per-project override without touching any call site.
- **`telemetry.ts:slimStatus()`**: already projects counters, `maxSliceMs` and `lastError` onto
  `getStatus`. The Health tab's data source partly exists; OBS-01's queue depth, drop count and
  jobs-in-flight are also already on `status()` in `index.ts`.
- **`store/analyses.ts:SCAN_STATES`**: the five-value closed vocabulary the UI binds its status
  badges to. Do not invent UI-only synonyms.
- **`store/artifacts.ts` / `observations.ts`**: `listArtifacts`, `listObservations` (optionally by
  digest), `getArtifact`, `countArtifacts`, `countObservations`, `getAnalysis`, `countAnalyses`.
- **`packages/engine/`**: the SDK-free workspace holding thresholds, the bounded queue and digest.
  Anything Phase 5 needs to unit-test without Caido belongs there.

### Established Patterns
- **The SQL discipline gate is the strongest invariant in the backend** and it is static, not
  behavioural — it parses every non-spec `.ts` in the package with the TypeScript compiler. Any
  Phase 5 query work either fits inside it or must earn an explicit, narrow allowlist entry with
  a stated reason. See O-01.
- **Single-statement idempotent writes only.** `BEGIN` does not span `exec` calls and fails
  silently, so no invariant may require two statements. `last_insert_rowid()` is unusable on the
  pooled connection — writes key on a natural key.
- **Every multi-row read is `project_id`-scoped**, and the consumer captures a project epoch and
  re-checks it before every write. Any new read Phase 5 adds inherits both.
- **Anything crossing the RPC boundary is redacted** through `describeError` (URL-shaped
  substrings replaced **before** truncation, because truncating first keeps the host-bearing half).
- **Ties are broken deterministically** in every list query (`sha256 ASC`, `request_id ASC`) so two
  result sequences can be compared meaningfully. Keyset pagination depends on exactly this.
- **No frontend exists at all.** `packages/` is `backend` + `engine`. Plan 05-01 creates
  `packages/frontend/`, the `{ kind: "frontend" }` entry in `caido.config.ts`, and the whole
  PostCSS/prefixwrap pipeline from zero.

### Integration Points
- `sdk.navigation.addPage()` plus a sidebar item — the single workspace page (UI-01).
- `sdk.api.register` on the backend ↔ `sdk.backend.*` on the frontend — where the query contract
  in O-01 lands. Four untyped endpoints exist today.
- Backend→frontend events for the UI-07 invalidation summaries.
- `sdk.findings.create` / `sdk.findings.exists` — D-01 and D-02 live here. `create` requires a
  `Request` object, so it must resolve through `sdk.requests.get` at projection time.
- `store/migrations.ts` — the forward step that adds `audit` (STORE-08), pending O-03.

### Debts explicitly deferred to this phase
- `packages/backend/src/index.ts` (~line 175): COMPAT-01's visible refusal surface (P1-D5).
- `packages/backend/src/store/settings.ts` (~line 94): the retention-bounds UI (P1-D5).
- Phase 01 decision: knip's `ignoreExportsUsedInFile` hole, "a documented hole to revisit in
  Phase 5".
- `packages/backend/src/hooks/admit.spec.ts:431`: "DET-05's static check lands in Phase 5".

</code_context>

<specifics>
## Specific Ideas

- The operator's stated preference across all four decisions was consistently **the option that
  minimises permanent, unrecoverable state** — excluding the artifact digest from the dedupe key,
  refusing to project against a dead request, requiring an individual tick per permanent write, and
  keeping exports off shared server disk entirely. Downstream agents should resolve ambiguity in
  this phase the same way: when an action cannot be undone, prefer the design that writes less.
- D-04 is a deliberate simplification of the roadmap's phase split, not an oversight: choosing a
  browser download removes the export path from DEPLOY-02/03/04's problem space rather than
  deferring it to Phase 6.

</specifics>

<deferred>
## Deferred Ideas

- **`sdk.hostedFile` delivery, server-disk quotas, and orphan cleanup** — considered as an export
  mechanism and rejected for Phase 5 because it pulls DEPLOY-03/04 forward. Stays in Phase 6, and
  D-04 means the export path no longer needs it.
- **Re-verifying an artifact's body hash before every projection** — considered as a strengthening
  of D-02 and not taken, on the cost of one serial reload per projected row on the single QuickJS
  thread. Worth revisiting if projection FP rates prove worse than the corpus predicts.
- **Cross-deploy diffing (introduced / removed / reintroduced entities)** — already deferred to v2
  in `ROADMAP.md` § "Deferred to v2" (DIFF-01, blocked on the unsolved asset-identity problem),
  and `CODEX-CONTRAST.md` §4.9's "Deployment Diff" panel belongs with it. Not Phase 5.

</deferred>

---

*Phase: 05-workspace-operator-workflow*
*Context gathered: 2026-08-28*
