# Phase 06: Retroactive Scan & Deployment Reality - Context

**Gathered:** 2026-08-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply the shipped analysis pipeline to traffic Caido captured before DefMiner was installed, and
stop reasoning about the Caido backend's filesystem as if it were the operator's machine.

Fixed by `ROADMAP.md` Phase 6. Requirements: **FIND-03, FIND-04, DEPLOY-01 … DEPLOY-04**.

**Not this phase:** sourcemap reconstruction and UI-05 (Phase 7); active retrieval (Phase 8);
cross-deploy diffing (v2, `ROADMAP.md` § "Deferred to v2", DIFF-01); entity-class tables and the
triage/suppression/projection halves left open by Phase 5's D-05 (Phases 3/4).

**Note on the roadmap's own plan titles.** Decision **D-17** below makes ROADMAP plan title
`06-03: Hosted-file delivery, quotas, orphan cleanup, and storage labelling` no longer describe
what will be built. The planner must either amend the roadmap or state the divergence explicitly
in the plan set — it must not silently ship something else under that title.

</domain>

<decisions>
## Implementation Decisions

Seven areas were discussed. Twenty-six decisions are locked below. Where an area's answer
contradicts a roadmap assumption, that is stated rather than smoothed over.

### Ingestion path for retroactive traffic

- **D-01: The scan is a backpressured producer into the SAME `BoundedQueue` and the SAME
  consumer.** It pages only while queue depth is below a watermark; the hook offers
  unconditionally, so live browsing always wins. No second analysis path, no duplicated
  admit/digest/store logic. The watermark is a number the planner must pick and defend, not
  inherit. Rejected: an unthrottled producer — the queue drops oldest at cap, so a backfill
  provably discards live entries the hook just admitted.

- **D-02: Retro admissions and rejections are counted separately from live ones, over the SAME
  closed `REJECT_REASONS` vocabulary.** One counters object with two sub-maps — `telemetry.ts`
  remains the only place counters live, because `telemetry.spec.ts` scans the package AST and fails
  on a second counters object anywhere. A 40,000-request backfill must not make OBS-01's drop count
  and reject reasons stop describing live proxying.
  — **Reversibility:** costly — the counter shape reaches the frontend through `slimStatus()` on
  `getStatus`, so it is part of the Health panel's contract, and every counter call site learns
  which caller it is serving.

- **D-03: Before offering, the scan skips request ids already carried to a terminal `done`
  analysis, and RE-OFFERS anything `partial` or `failed`.** One bounded read per page instead of
  thousands of megabyte reloads through `sdk.requests.get`, and the scan repairs earlier failures
  rather than cementing them. `partial`/`failed` is exactly the pair `store/retry.ts` already
  treats as movable.

- **D-04: A running scan SUSPENDS when the project epoch changes, keeps its cursor, and resumes
  only on explicit operator action.** Nothing is written under a stale epoch and nothing silently
  restarts — consistent with Phase 5's coalescing pill never auto-applying.

### Scan scope and the HTTPQL filter

- **D-05: The pushed-down filter is DefMiner's own asset predicate AND an optional operator HTTPQL
  clause.** The operator may narrow, never widen: no scan can be turned into pulling every stored
  response in history.
  — **Reversibility:** costly — the two clauses are combined by building an HTTPQL string, which is
  the same class of concern `sql-discipline.spec.ts` exists to police. It needs its own gate, and
  the composition rule becomes part of the scan RPC's contract. **Open:** see O-06.

- **D-06: DefMiner's push-down clause is narrow, and a fixture suite proves it is a SUPERSET of
  `admit()`'s kind axis.** A disagreement between HTTPQL's matching semantics and `admit.ts`'s
  `indexOf`/`endsWith` classification must be a red test, never a silently missed bundle. The proof
  needs real fixtures against a live Caido — it cannot be derived from the type definitions. **Open:**
  see O-03.

- **D-07: Caido's scope engine is applied to every retroactive scan, with no override.** The retro
  path is never looser than the passive one. For a bug bounty tool scope is the authorization
  statement, and a backfill writing rows for a host currently out of scope is a liability the
  operator did not ask for. **Intended consequence, state it in the UI:** traffic captured while a
  host was in scope becomes unscannable once that host leaves scope.
  — **Reversibility:** costly — loosening it later means rows already exist for hosts the operator
  had excluded, and the promise appears in operator-facing copy.

- **D-08: When a scan starts evicting its own results under the retention cap, it suspends at its
  cursor and says so.** `sweepRetention` already returns `deleted`; a row-cap eviction while a scan
  is running means the backfill is consuming itself. Copy states the cause and the two remedies
  (raise the cap, narrow the filter); the cursor still resumes. Rejected: letting retention silently
  truncate a completed backfill, which looks to the operator like the scan failed.
  — **Reversibility:** costly — it couples `retention.ts`'s return value to the scan state machine,
  two subsystems that today do not know about each other.

### Cursor durability and cancellation

- **D-09: Scan state lives in a new project-scoped `scans` table**, added by a forward migration
  step: filter, cursor position, counters, state, epoch. Survives restart; gives the progress
  surface a real data source. `EXPECTED_TABLES` grows from five to six. Every statement must pass
  the SQL discipline gate — single statement, fully bound, `project_id`-scoped.
  — **Reversibility:** one-way — a forward migration and a published table shape. Changing the
  columns later needs another migration, and `schema.spec.ts`'s `EXPECTED_TABLES` is asserted
  exactly.

- **D-10: Cancel means PAUSE. Discarding a scan is a separate, explicit action.** One suspended
  state to reason about — the same one a project switch produces — so resume is always available
  and a mis-clicked cancel on a multi-hour backfill costs nothing. Rejected: two adjacent controls
  where one is destructive.

- **D-11: `init()` moves any `running` scan row to suspended, with a reason, and never
  auto-resumes.** This applies ERR-02's rule — never left permanently `running` — to the one table
  that needs it now. **Phase 6 therefore ships a slice of a Phase 2 requirement; the plan must say
  so out loud rather than let a verifier discover it**, and Phase 2 inherits the pattern rather
  than inventing a second one.

- **D-12: The backfill walks DESCENDING — newest first, back into history.** `after(cursor)` moves
  away from the present, so requests arriving mid-scan are never re-walked; the live hook already
  owns them. The scan is a backfill in the literal sense: the present is the hook's, the past is
  the scan's. A scan cancelled early has covered recent history, which the UI should state.
  — **Reversibility:** costly — a stored cursor is direction-specific, so reversing the order
  invalidates every persisted cursor in `scans`.

### Progress surface

- **D-13: A fifth `Scan` tab owns the filter form, scan history and per-scan detail; a compact live
  indicator in the existing 48px toolbar shows a running scan from every tab.** A long serial job
  the operator cannot see from the Artifacts tab is the exact confusion `PITFALLS.md` P3 describes
  — a frozen-looking page that is really the backend's blocked QuickJS thread. The tab strip
  already wraps; the toolbar gains its first stateful element.

- **D-14: Progress is absolute counters plus the current position's TIMESTAMP. No percentage.**
  Pages walked, requests seen, admitted, skipped-already-done, rejected by reason, queued,
  analysed — and, because the walk is descending by time, "now scanning traffic from 14 Aug". That
  timestamp is the honest answer to "how far back am I" and it is free. Rejected: a counting pass
  first (with no `includeRaw(false)`, counting costs the same full body transfer the scan does), and
  a percentage against an operator-supplied guess — the fabricated-number shape Phase 0 refused.

- **D-15: Progress rides the existing UI-07 coalescer as a new category.** One backend→frontend
  mechanism; the 2-reactions/second cap is already exactly right for a progress readout. The
  never-re-order-while-a-row-is-selected rule does NOT apply to a progress strip, so scan updates
  land immediately rather than accruing into the pill.
  — **Reversibility:** costly — the event payload gains scan counters, which is slightly more than
  the pure `{ projectId, category, changedCount, newestId }` invalidation summary the Phase 5
  contract describes, and that shape is a frontend contract.

- **D-16: A scan writes to `audit` ONLY when it destroys something** — suspended by retention
  self-eviction (D-08), and discard (D-10). Routine lifecycle stays in `scans` under normal
  retention. This is precisely D-06's stated subject (irreversible actions, asked about long after
  90 days) and it keeps the age-exempt ledger from filling with background-job chatter that would
  evict the projection records it exists for.
  — **Reversibility:** one-way — `audit`'s `kind` is a closed CHECK constraint
  (`triage_set, suppression_create, suppression_remove, finding_projected, export_raw,
  export_redacted, value_revealed`). Adding kinds needs a forward migration, and audit rows already
  written cannot be re-kinded.

### Delivery path — the load-bearing decision

- **D-17: Phase 5's D-04 is extended project-wide. The chunked RPC download is the ONLY path by
  which anything DefMiner produces reaches the operator. Nothing is ever written to server disk.
  `sdk.hostedFile` is explicitly DECLINED.**

  Three facts drove it, one of which the roadmap did not have:
  1. `HostedFileSDK` (`@caido/quickjs-types@0.26.0`, `caido/hostedFile.d.ts`) is exactly
     `getAll()` and `create({ name, content })`. **There is no delete and no expiry.** DEPLOY-03
     asks for "expiry and redaction rules" and DEPLOY-04 for "orphan cleanup"; neither is
     expressible against that SDK. A hosted file, once created, is permanent and unreclaimable.
  2. DEPLOY-03's own wording offers "**or** a bounded authenticated frontend download" as an equal
     alternative, and Phase 5 already built and measured exactly that.
  3. If reconstructed source is content-addressed and `sources` is never used as a filesystem path,
     Phase 7's hardest requirement — SC3's malicious-`sources` traversal / UNC / drive-letter /
     reserved-name fixture suite across three platforms — stops having a subject.

  **Consequences, all intended:** DEPLOY-03 is met by its own alternative wording; DEPLOY-04 loses
  its file subject (see D-24); DEPLOY-02's subject becomes the database rather than a file (D-19);
  and `ROADMAP.md` Phase 7's stated dependency — *"delivery path must exist before we produce files
  to deliver"* — is already satisfied by shipped Phase 5 code.
  — **Reversibility:** one-way — undoing it means introducing `llrt/fs`, a labelled server path,
  disk quotas, orphan cleanup and hosted-file delivery, lifting a shipped lint ban, and re-opening
  Phase 7's storage design. **This decision's viability rests on O-01 and the planner must not
  treat O-01 as settled.**

- **D-18: The ban is enforced by a new eslint rule in the plan 01-09 family**, beside
  `outbound-send` / `outbound-net` / `outbound-fetch` / `outbound-import`: every specifier form of
  `llrt/fs` and `node:fs`, plus any `sdk.hostedFile` member access — each with a firing fixture AND
  a legal fixture, the shape 01-09 established. It bans the CAPABILITY, not the usage, so there is
  no "is this a read or a write" judgement to get wrong. `sdk.meta.path()` stays legal because it
  already appears in redacted error text.
  — **Reversibility:** costly — it is a project lint rule; code written under it assumes no
  filesystem exists.

- **D-19: The Settings surface NEVER shows a path.** It states where the data lives and whether it
  survives a restart: findings are in a Caido-managed database on the Caido server, not on this
  machine. The operator cannot reach the path, and `sdk.meta.path()` carries an OS username —
  exactly the string `telemetry.spec.ts:402-412` exists to keep off the RPC. **This is not a
  vacuous rule after all:** `sdk.meta.db()` IS server-side storage and IS ephemeral on a container
  with no persistent volume, which is the single most valuable thing DEPLOY-02's neighbourhood has
  to say. **Open:** whether the persistence sentence can be conditional on the actual deployment
  shape depends on O-02; if the answer is nothing, it degrades to a generic statement true
  everywhere.

### Deployment matrix (DEPLOY-01)

- **D-20: One scripted harness per shape, on Phase 0's result-artifact pattern.** Fresh instance
  launched through the ABSOLUTE app path, reported version asserted before anything is recorded,
  plugin installed, fixed assertion set run, schema-validated JSON result written. Docker shapes
  pull an image in the script. This re-runs as evidence rather than surviving as memory.
  — **Reversibility:** costly — it is the phase's largest single build, and the Docker legs need an
  image this machine has never pulled.

- **D-21: The matrix declares and asserts its OWN pinned version constant, separate from Phase 1's
  `EXPECTED_CAIDO_VERSION = "0.57.1"`.** That constant is a deliberate fail-closed tripwire
  protecting threshold artifacts (`tests/phase1-load.spec.ts`, `tests/phase1-runtime.spec.ts`);
  reusing it would make every matrix leg fail by design, and contaminating it would be worse. Every
  result artifact says which build it describes, and the harness refuses to write one if the binary
  reports something else. **Open:** see O-05.

- **D-22: Each leg asserts four things, chosen because each genuinely differs by shape:** the
  plugin package installs and `init()` reports compatible on `caido-cli` as well as the desktop
  app; migrations run and `EXPECTED_TABLES` is present; one proxied JS response produces an
  artifact and an observation; and after a restart the data is present — **except on
  Docker-without-a-volume, where it must be ABSENT and the plugin must come back clean on an empty
  database rather than erroring.** Rejected: full end-to-end per leg, which needs a browser driven
  inside four deployment shapes — a harness larger than the feature it tests.

- **D-23: An unreachable leg is recorded NOT RUN with the reason, never as a pass, and the phase
  can still complete.** The verifier reports the matrix partial, DEPLOY-01's checkbox does not move
  on the strength of a leg that never executed, and the leg becomes a named carried obligation.
  Same discipline `05-VERIFICATION.md` applied to its two `insufficient_spec_items` — "must not be
  recorded as a silent pass".

### Quota and cleanup (DEPLOY-04)

- **D-24: DEPLOY-04 is satisfied by construction, and a gate keeps it true.** Reading
  `store/migrations.ts` settled it: there is **no BLOB column and no body storage anywhere** —
  `artifacts` holds `sha256`, `byte_len`, `kind` and timestamps; `observations` holds a
  write-time-redacted URL; `analyses` holds state and a 240-char error. With D-17 forbidding files,
  DefMiner's entire server-disk footprint is fixed-shape metadata already bounded by `retention.ts`
  on rows and age. DEPLOY-04's normative statement — treat server disk as shared instance storage —
  is discharged by writing nothing to it. **What ships is the proof:** D-18's lint ban plus a schema
  test asserting no column may hold artifact content, so the day someone adds a BLOB the gate fires
  and this decision is re-opened deliberately. Same reasoning as the pre-policy `observations.url`
  disposition: no sweep was shipped because the branch is unreachable, not merely small.
  — **Reversibility:** costly — it is D-17's corollary and falls with it.

- **D-25: The workspace reports row counts against their retention caps, beside the D-19
  statement.** "Your findings live on the Caido server; 12,400 of 50,000 artifact rows, oldest 41
  days." Uses `countArtifacts` / `countObservations` / `countAnalyses` as already shipped — no
  PRAGMA, no new SQL discipline exception. It is also the surface that shows retention working,
  which now matters because a scan can be suspended by it (D-08). Rejected: bytes via
  `PRAGMA page_count`, which buys an allowlist argument for a number derivable from the counts.

- **D-26: The SUSPENDED STATE is exempt from the retention age bound — not the `scans` table.**
  Completed and discarded scans age out normally; a suspended scan's row IS its cursor, so a
  90-day timer must not silently delete an operator's resumable backfill. Attaching the exemption
  to a state rather than a table keeps D-06's "single documented exception" from quietly becoming a
  policy. Like D-06, **the exception must be visible in the sweep code, not implicit.** The row cap
  still bounds growth.
  — **Reversibility:** costly — it is a second retention exception and sets precedent; the sweep's
  statements change.

### Claude's Discretion

The operator took every question. Nothing was delegated. Where a decision above names an open
question (O-01 … O-07), the researcher settles it from evidence and the planner escalates rather
than inventing an answer — it is not discretion.

### Open — raised, NOT decided

These are not defaults and must not be read as locked.

- **O-01: Can Phase 7's reconstructed source live in SQLite within QuickJS's memory?**
  **D-17 rests on this and the planner must not treat it as settled.** `CODEX-CONTRAST.md` §471
  argues large reconstructed source belongs in content-addressed FILES under `sdk.meta.path()`, not
  SQLite — written before the delivery problem was understood. If the answer is no, D-17 must be
  re-opened before Phase 7 plans, not during it. Note there is no memory introspection in this
  runtime at all (QUAL-06), so this is measured externally or not at all.

- **O-02: With the filesystem banned, what can the backend learn about its own deployment shape
  from the SDK alone?** Determines whether D-19's persistence sentence can be conditional
  ("this container has no persistent volume — your findings are lost on restart") or must degrade
  to one statement true everywhere. `/.dockerenv` is unreadable under D-18 by construction.

- **O-03: Is a narrow HTTPQL push-down provably a superset of `admit()`'s kind axis?** D-06 requires
  the proof. HTTPQL's matching semantics are Caido's and are not derivable from the type
  definitions — this needs live fixtures, including assets served with unexpected content-types.

- **O-04: Is a Caido `Cursor` stable across a process restart?** `RequestsQuery.after(cursor)` takes
  an opaque `Cursor` and nothing documents its lifetime. D-09 and D-11 both assume a persisted
  cursor is still usable after Caido restarts. **If it is not, `scans` must persist a re-derivable
  position — a timestamp/id boundary — rather than the opaque cursor, and D-09's column list
  changes.** Settle this before the migration is written.

- **O-05: Can the Docker image be pinned to the same version as the desktop app?** `PROJECT.md`
  records decision P6-D5 — api.caido.io 404s every non-`latest` version, which is why 0.57.1 could
  not be refetched. If Docker tags have the same problem, the matrix compares two different Caidos
  and D-21 requires it to say so in the result artifacts.

- **O-06: How are DefMiner's clause and the operator's HTTPQL combined, and what polices it?**
  D-05 builds an HTTPQL string from two parts. `sql-discipline.spec.ts` exists because
  interpolated and concatenated query text is silent on this driver. HTTPQL is not SQL and the gate
  does not reach it — the planner either extends a gate or argues why none is needed.

- **O-07: Does `body.length` on a response returned by `sdk.requests.query()` report the
  DECOMPRESSED identity byte count**, as `SIZE_GATE_SOURCE` measured for the hook path?
  `admit()`'s size axis is written against that measurement, and observed compression ratios ran to
  7.25×. If a stored response reports the wire count instead, the size gate admits up to 7.25× more
  bytes than intended on the retro path only.

### Carried Forward — locked upstream, do not re-open

From `05-CONTEXT.md` (2026-08-28):

- **D-04 (Phase 5):** exports are a browser download over the RPC; no server-side file is written.
  `store/export.ts`'s header states it and the 05-02 acceptance gate greps the file for path
  identifiers. **D-17 extends this rather than revisiting it.**
- **D-06 (Phase 5):** `audit` is exempt from the retention age bound, keeps a raised row bound, and
  the exception is visible in the sweep code. D-16 and D-26 both reason from this.
- **D-05 (Phase 5):** Phase 5 was deliberately split; `entities` and `evidence` do not exist, and
  the triage key may not be fixed. Phase 6 must not assume any entity-class table.
- The operator's stated preference across every Phase 5 decision was **the option that minimises
  permanent, unrecoverable state**. It held again here — D-10, D-16, D-17, D-23 and D-26 are all
  that same call. Resolve residual ambiguity in this phase the same way.

From `PROJECT.md` / `STATE.md`, project-wide and non-negotiable:

- QuickJS is single-threaded with no worker threads; CPU-bound work is strictly serial. Never run
  two analyses "in parallel".
- Every write is `project_id`-scoped and re-checks the project epoch; `describeError` redacts
  URL-shaped substrings **before** truncating on anything crossing the RPC.
- Single-statement idempotent writes only — `BEGIN` does not span `exec` calls and fails silently;
  `last_insert_rowid()` is unusable on the pooled connection.
- No raw secret value is ever persisted to SQLite, logs, or any frontend event.
- No regular expression in the admission path (`admit.ts` header): ReDoS is unrecoverable on this
  runtime — SIGKILL was the only teardown that worked, and it takes the operator's project with it.
- Caido 0.57.1 is UNOBTAINABLE; `~/.caido/caido-cli` on `PATH` is a stale 0.55.3. Every script uses
  the absolute app path and asserts the reported version before recording anything.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/ROADMAP.md` § "Phase 6: Retroactive Scan & Deployment Reality" — goal, five success
  criteria, three plan titles. **Note D-17's effect on the `06-03` title.**
- `.planning/ROADMAP.md` § "Phase 7: Sourcemap Reconstruction" — its stated dependency on Phase 6's
  delivery path, and SC3's malicious-`sources` fixture suite, both changed by D-17.
- `.planning/REQUIREMENTS.md` § "Caido integration (FIND)" — FIND-03 (carries SPIKE-11's
  `RETROACTIVE_SCAN_MANDATORY=true` finding and the no-`includeRaw(false)` note) and FIND-04.
- `.planning/REQUIREMENTS.md` § "Deployment reality (DEPLOY)" — DEPLOY-01 … DEPLOY-04 and the
  client/server preamble.
- `.planning/REQUIREMENTS.md` § "Error containment and recovery (ERR)" — ERR-02, of which D-11
  ships a slice ahead of Phase 2.
- `.planning/REQUIREMENTS.md` § "Persistence (STORE)" — the retention bounds D-08 and D-26 reason
  against.

### Prior decisions this phase builds on
- `.planning/phases/05-workspace-operator-workflow/05-CONTEXT.md` — D-04 (browser download,
  extended by D-17), D-06 (`audit` age exemption), D-05 (the Phase 5 split), and the
  minimise-permanent-state preference.
- `.planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md` — the binding visual, copy,
  rendering-safety, table, coalescing and vocabulary contract. `## Rendering Safety Contract`
  R1–R5 and `## Data & Interaction Contract` govern the new Scan tab exactly as they govern the
  other four.
- `.planning/phases/05-workspace-operator-workflow/05-VERIFICATION.md` — the DEPLOY-02
  `behavior_unverified` item (`App.vue:558`, `SERVER_STORAGE_PATH` hardcoded null) that D-19
  disposes of, and the NOT-RUN discipline D-23 copies.
- `.planning/phases/05-workspace-operator-workflow/05-ENTITY-CONTRACT.md` — the published contract
  and its Deferral Register; the Scan tab must not assume any deferred entity surface.

### Measurements that settle specific questions
- `.planning/phases/00-runtime-reality-check/results/SPIKE-11.json` — the four cache scenarios,
  three independent witnesses each. **Read the `scenario_cached_fresh` measurement**: the bundle
  never enters Caido at all, so retroactive scan recovers pre-install traffic and 304s, NOT
  browser-cache hits. Do not overclaim what a scan can recover.
- `.planning/phases/00-runtime-reality-check/results/go-no-go.json` — the Phase 0 thresholds, all
  measured on 0.57.1, none re-measured. D-21's version constant is separate for this reason.
- `.planning/research/SUMMARY.md` § the deployment-reality section and the
  `RequestsQuery` / no-`includeRaw(false)` row in its SDK table — the origin of the page-size-20
  constraint.
- `.planning/research/CODEX-REVIEW-01.md` §§ 346–358 — the original finding that the backend
  filesystem is server-side, with the Caido remote-hosting and HostedFile links.
- `.planning/research/CODEX-CONTRAST.md` §471 — the argument that large reconstructed source
  belongs in files, not SQLite. **This is the counter-case to D-17; O-01 must weigh it.**
- `.planning/research/PITFALLS.md` § "P3: Event-loop starvation" — why a long serial job needs a
  visible indicator (D-13).

### Code that constrains this phase
- `packages/backend/src/hooks/admit.ts` — the closed `REJECT_REASONS` set with its mechanical
  every-reason-has-a-test gate (D-02), the status-first axis order and why a 304 gets
  `revalidation`, and the two prohibitions (no decode, no regex).
- `packages/backend/src/hooks/passive.ts` — the offer site and `EnqueueClock`; the callback must
  return `undefined`, not a Promise.
- `packages/backend/src/ingest/consumer.ts` — the drain loop, the reload through
  `sdk.requests.get`, and the `RETENTION_SWEEP_EVERY_N` (128) sweep cadence D-08 hooks into.
- `packages/backend/src/store/retention.ts` — the `{ deleted, examined }` return D-08 reads, the
  one-statement-per-delete rule, and D-06's visible-in-the-code exception that D-26 imitates.
- `packages/backend/src/store/migrations.ts` — the shipped schema (no BLOB anywhere, which is
  D-24's whole basis), `audit`'s closed `kind` CHECK that D-16 must extend, and where the `scans`
  forward step lands.
- `packages/backend/src/store/sql-discipline.spec.ts` — the static AST gate over every non-spec
  backend `.ts`; every `scans` statement must satisfy it, and its single `PRAGMA` exemption is why
  D-25 avoided bytes.
- `packages/backend/src/store/export.ts` — D-04's implementation and the reasoning D-17 extends.
- `packages/backend/src/store/retry.ts` — the `partial`/`failed` transition set D-03 reuses.
- `packages/backend/src/telemetry.ts` — `counters`, `slimStatus()`, `describeError`,
  `URL_REDACTION`, `PATH_REDACTION`; `telemetry.spec.ts:402-412` is the username-in-path guard
  behind D-19.
- `packages/backend/src/index.ts` — the `sdk.api.register` site and `init()`'s ordering contract;
  the scan RPCs and D-11's startup sweep land here.
- `packages/backend/src/store/settings.ts` — three-level resolution and the closed `SETTING_KEYS`
  set; the watermark (D-01) and any scan defaults belong here, the cursor does not.
- `packages/frontend/src/App.vue` — the four-tab strip D-13 extends and `:storage-path` at line 759
  fed by the null at line 558, which D-19 replaces.
- `packages/frontend/src/stores/coalescer.ts` — the 500 ms trailing window and 2/second cap D-15
  adds a category to.
- `eslint.config.js` and plan 01-09's rule family — the firing-fixture/legal-fixture pattern D-18
  follows.
- `node_modules/.pnpm/@caido+quickjs-types@0.26.0/node_modules/@caido/quickjs-types/src/caido/requests.d.ts`
  — `RequestsQuery`: `after` / `before` / `first` / `last` / `filter` / `ascending` / `descending` /
  `execute`, and `RequestsConnection.items`. **No `includeRaw(false)` anywhere.**
- `node_modules/.pnpm/@caido+quickjs-types@0.26.0/node_modules/@caido/quickjs-types/src/caido/hostedFile.d.ts`
  — `HostedFileSDK` is `getAll()` and `create()` only. This is D-17's first premise; verify it
  against whatever SDK version is current before quoting it.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`hooks/admit.ts`** — the complete admission decision as a callable function with a closed
  reason vocabulary. D-01/D-03 reuse it unchanged; only the counter attribution differs (D-02).
- **`ingest/consumer.ts` + `engine/queue.ts`** — the whole analysis path already exists. The scan
  is a second producer, not a second pipeline.
- **`store/retry.ts`** — the partial/failed transition semantics D-03 needs, with the state guard
  inside the predicate and a read-back through `getAnalysis` because the driver cannot report what
  it wrote.
- **`store/reads.ts`** — keyset pagination with deterministic tie-breaking; the Scan tab's history
  list follows the same shape rather than inventing one.
- **`store/export.ts` + `frontend/src/components/export-download.ts`** — the measured chunked RPC
  download. Under D-17 this is the delivery path, already shipped and already tested.
- **`countArtifacts` / `countObservations` / `countAnalyses`** — D-25's data source, needing no new
  SQL.
- **`scripts/spike/instance.sh`** and the Phase 0 result-artifact + JSON-schema pattern — D-20's
  harness template, including the absolute-app-path and version-assertion discipline.

### Established Patterns
- **The SQL discipline gate is the strongest invariant in the backend** and it is static: it parses
  every non-spec `.ts` with the TypeScript compiler and fails on interpolated SQL, concatenated
  SQL, named parameters, module-scope `prepare`, and any multi-row statement not scoped by
  `project_id`. `scans` must fit inside it.
- **Counters live in `telemetry.ts` and nowhere else**, enforced by an AST scan. D-02's two
  sub-maps are one object, not two.
- **Ties are broken deterministically in every list query** so two result sequences are comparable.
- **Anything crossing the RPC boundary is redacted through `describeError`** — URL-shaped
  substrings replaced BEFORE truncation.
- **A gate a comment can trip is a gate that gets weakened rather than obeyed** (`export.ts`
  header). D-18's rule is written against imports and member access, not against strings.
- **Prove the branch is unreachable rather than shipping a sweep for it** — the disposition of the
  pre-policy `observations.url` population. D-24 is the same move.

### Integration Points
- `sdk.requests.query()` — the scan's only new SDK surface. `COVERAGE.md` row 7 recorded it as
  OPT-OUT in Phase 1 with the note "HTTPQL push-down over existing traffic is FIND-03, the
  retroactive scan, in Phase 6". That opt-out is now spent and the coverage tables should say so.
- `sdk.scope` / `sdk.requests.inScope` via `admit()`'s fifth axis — D-07.
- `sdk.api.register` in `index.ts` — the scan start/pause/resume/discard/status RPCs.
- The backend→frontend event channel — D-15's new category.
- `store/migrations.ts` — two forward steps: `scans` (D-09) and `audit`'s extended `kind` CHECK
  (D-16).
- `caido.config.ts` — unchanged; both plugin kinds already ship.

</code_context>

<specifics>
## Specific Ideas

- **The phase got smaller in one half and sharper in the other.** Reading `HostedFileSDK` and
  `migrations.ts` during discussion removed most of DEPLOY-03 and all of DEPLOY-04's file work.
  What remains on the deployment side is a testing harness, one honest sentence in Settings, and
  two gates that keep the guarantee true. The planner should not pad it back out — if a plan feels
  thin against the roadmap's original ambition, that is D-17 working, and it should be stated
  rather than compensated for.

- **Two decisions deliberately reach outside the phase and must be declared, not smuggled:**
  D-11 ships a slice of ERR-02 (Phase 2), and D-17 makes a storage decision Phase 7 will live
  inside. Both are better made here than discovered there, but neither should reach a verifier as
  a surprise.

- **The operator's copy for D-07 and D-14 matters more than usual.** "This host is no longer in
  scope, so its captured traffic cannot be scanned" and "now scanning traffic from 14 Aug" are both
  explaining an absence. Phase 5's UI-09 stance — degraded and partial states are visibly marked,
  never silently presented as complete — applies to both.

</specifics>

<deferred>
## Deferred Ideas

- **More than one scan per project, or a queue of scans.** Never raised as a requirement; the
  decisions above assume one at a time and the planner should make that an explicit invariant
  rather than an accident. Revisit only if an operator asks.

- **A durable long-term record of every filter ever run against a project.** Considered under D-16
  and declined: it would put routine background-job chatter into the age-exempt `audit` ledger,
  competing with the permanent-Finding projections D-06 was written to preserve.

- **Database size in bytes on the Health surface** (`PRAGMA page_count` × `page_size`). Declined
  under D-25 because it buys a SQL-discipline allowlist argument for a number derivable from row
  counts. Revisit if Phase 7 ever stores content, which would break that derivability — and note
  that O-01 is exactly that question.

- **Server-disk quota and orphan-cleanup machinery.** Declined under D-24 because D-18 makes the
  files it would clean up impossible to create. If O-01 forces D-17 to be re-opened, this comes
  back with it — as a set, not piecemeal.

- **Removing the eight now-redundant `@internal` JSDoc tags** — carried from
  `.planning/phases/05-workspace-operator-workflow/deferred-items.md` (D-05-07-01). Needs a plan
  that is not diff-locked on `artifacts.ts` / `observations.ts`. Phase 6 touches neither, so it
  could land here if a plan has room; it is not a Phase 6 obligation.

</deferred>

---

*Phase: 06-retroactive-scan-deployment-reality*
*Context gathered: 2026-08-31*
