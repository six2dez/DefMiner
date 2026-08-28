# Phase 05: Workspace & Operator Workflow — Research

**Researched:** 2026-08-28
**Domain:** Vue 3 plugin frontend inside Caido + server-side keyset query discipline in QuickJS/SQLite + irreversible Findings projection
**Confidence:** MEDIUM-HIGH (the six open questions are answered from executed measurement and from source read this session; the entity-schema dependency in O-02 is unresolvable by research and is escalated, not invented)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Claude's Discretion

The six items below were raised in discussion and **consciously left open**. They are not defaults
and must not be read as locked. This document answers each from evidence; where the evidence does
not reach, it says so and escalates rather than inventing an answer.

- **O-01: Server-side filtering and sorting versus the SQL discipline gate.** → `## O-01`
- **O-02: Phase 5 depends on Phase 4, and Phases 2–4 are unplanned.** → `## O-02`
- **O-03: Triage, suppression, and the `audit` table.** → `## O-03`
- **O-04: Sanitisation of target-controlled bytes inside a Finding's `title`/`description`.** → `## O-04`
- **O-05: Whether projection is blocked, not merely warned, on `partial`/`failed` artifacts.** → `## O-05`
- **O-06: The exact composition of the high-signal tier in Phase 5.** → `## O-06`

### Deferred Ideas (OUT OF SCOPE)

- **`sdk.hostedFile` delivery, server-disk quotas, and orphan cleanup** — considered as an export
  mechanism and rejected for Phase 5 because it pulls DEPLOY-03/04 forward. Stays in Phase 6, and
  D-04 means the export path no longer needs it.
- **Re-verifying an artifact's body hash before every projection** — considered as a strengthening
  of D-02 and not taken, on the cost of one serial reload per projected row on the single QuickJS
  thread. Worth revisiting if projection FP rates prove worse than the corpus predicts.
- **Cross-deploy diffing (introduced / removed / reintroduced entities)** — already deferred to v2
  in `ROADMAP.md` § "Deferred to v2" (DIFF-01, blocked on the unsolved asset-identity problem),
  and `CODEX-CONTRAST.md` §4.9's "Deployment Diff" panel belongs with it. Not Phase 5.

### Carried Forward — locked upstream, do not re-open

Everything in `05-UI-SPEC.md` is binding: the exact dependency pins, the spacing/typography/colour
contract, rendering safety R1–R5, the table contract (100-row keyset pages, 2,000-row in-memory
window), event coalescing (invalidation summaries only, 500 ms trailing, ≤2 reactions/second, no
re-order while a row is selected), the `scan_state` and triage vocabularies, and Open Decisions
D1–D5. Where this document names a UI-SPEC statement that its own measurements contradict, it says
so explicitly and routes it to the operator — it does not silently override it.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Sidebar page providing a project-wide view | `## Standard Stack` (`sdk.navigation.addPage` takes an `HTMLElement`, verified), `## Code Examples` #1 |
| UI-02 | Filterable, sortable tables, keyset pagination, virtualised, thousands of rows | `## O-01` — the fixed-matrix + bounded-candidate-window recommendation and its VM-step measurements |
| UI-03 | Every entity links back to source request, artifact version, byte offsets | `## O-02` — **blocked**: `evidence` (Phase 4) holds byte offsets. `observations.request_id` and `analyses.detector_set_hash` exist today |
| UI-04 | Score explanation — which signals fired and why | `## O-02` — **blocked**: the signal vocabulary is Phase 3 plan 03-03. UI-SPEC FLAG F1 is the same gap |
| UI-06 | JSON and CSV export, redacted by default | `## Don't Hand-Roll` (CSV neutralisation order), `## Common Pitfalls` P-06 (query values are already redacted at rest — a "raw" export cannot un-redact them) |
| UI-07 | Coalesced backend→frontend events | `## Standard Stack` (`sdk.api.send` / `sdk.backend.onEvent` returns `{ stop }`), `## Architecture Patterns` Pattern 4 |
| UI-08 | Settings surface for every toggle, threshold, budget | `store/settings.ts`'s three-level resolution is shipped and was written for this; `## O-02` — buildable today |
| UI-09 | Degraded and partial analyses visibly marked | `analyses.scan_state` CHECK is shipped; `## O-05` |
| OPS-01 | Triage persists | `## O-03` — identity key recommendation, single-statement write shape |
| OPS-02 | Suppression without editing the rule corpus | `## O-03` — query-time filtering, measured |
| OPS-03 | Retry a failed or partial analysis | `## O-02` — buildable today over `analyses` |
| OPS-04 | Triage and suppression survive a corpus bump | `## O-03` — key excludes `detector_set_hash`; `analyses` PK *includes* it, which is why the two must not share a key |
| UISEC-01 | Rendered as text, never markup | `## Common Pitfalls` P-01; `vue/no-v-html` is **`warn`** in the shipped preset — measured |
| UISEC-02 | CSV formula neutralisation | `## Don't Hand-Roll` |
| UISEC-03 | Adversarial strings truncated without breaking layout | `## Don't Hand-Roll` (grapheme segmentation — `Intl.Segmenter` is a browser API, available in the frontend but **not** in QuickJS) |
| FIND-01 | Native Findings for high-signal only, stable dedupeKeys | `## O-06`, `## O-04`, `## Code Examples` #4 |
| FIND-02 | Entropy-only and hint-grade never project | `## O-06` |
| STORE-08 (`audit`) | Schema coverage for `audit` | `## O-03` — shape, natural key, and the two gates a new table must satisfy |
</phase_requirements>

---

## Summary

Three things dominate this phase and none of them is Vue.

**First, the query discipline.** `05-UI-SPEC.md` mandates server-side filtering and sorting with
keyset pagination; `sql-discipline.spec.ts` is a static AST gate that permits only fixed literal
statements with positional `?`. Those are compatible — but only under one of the three candidate
approaches, and the other two were disqualified by execution rather than by argument. The
null-guard predicate `(? IS NULL OR col = ?)` is gate-clean and **costs 2,000,025 SQLite VM steps
to return an empty page** over a 200,000-row project partition, against 24 for the same filter on a
leading index. An allowlisted fragment builder is worse than that: it is not visible to the gate at
all — three builder shapes were run through the gate's own exported `auditSource` this session and
all three reported zero violations — so it would not *earn* an exemption, it would silently create
an ungated SQL surface, which is the exact defect class Phase 1 spent thirteen gap-closure rounds
correcting. The recommendation is a fixed matrix of literal statements, dimensioned down so it is
small, plus a bounded candidate window inside every filtered statement.

**Second, the dependency.** Phase 5's five ROADMAP plans do not have a single buildability status
between them. Two are fully buildable today, one is fully blocked, and two are half-and-half.
Saying "Phase 5 is plannable" or "Phase 5 is not plannable" would both be wrong; the honest answer
is per-plan and is in `## O-02`.

**Third, the irreversible write.** `sdk.findings.create` was read from the pinned SDK source this
session: `FindingSpec` is `{ title, description?, reporter, dedupeKey?, request }` and there is no
`update`, no `delete`, no severity and no confidence field. `title` and `description` are plain
strings that render in Caido's UI, outside every rendering-safety rule `05-UI-SPEC.md` writes, and
they can never be re-rendered. That makes the sanitisation rule for those two fields (O-04) the
single highest-consequence unwritten rule in the phase.

**Primary recommendation:** plan 05-01 and 05-02 now against the shipped `artifacts` /
`observations` / `analyses` tables — treating them as the proving ground for the query discipline,
the 10,000-row backstop and the coalescing contract — widen the SQL gate *before* the first new
query is written, and emit an entity/evidence contract upward to Phases 3/4 rather than inventing
their schema here.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Filtering, sorting, pagination | Backend (QuickJS + SQLite) | — | UI-SPEC bans client-side sorting; a 2,000-row window sorted client-side sorts a *subset* and presents it as the whole set |
| Truncation to 256 / 2,048 chars | **Backend**, then re-asserted in the frontend | Frontend | An untruncated 4 MB string that crosses the RPC has already cost the single thread and the renderer's memory. The frontend cap is defence in depth, not the control |
| C0/C1 + bidi stripping | **Frontend** (the DOM is the sink) | Backend for export | R2 is a rendering rule. Doing it only on the backend would silently mutate the value the operator triages on and would not protect a value that reached the DOM another way |
| Grapheme-safe truncation | **Frontend** | — | `Intl.Segmenter` is a browser API. It is not in Caido's QuickJS global set (measured Phase 0: 100 globals, no `Intl` entry) |
| CSV/JSON serialisation + formula neutralisation | **Backend** | — | The export must be identical to what is stored; doing it in the frontend means two serialisers |
| Blob construction and download trigger | **Frontend** | — | D-04. There is no server file |
| Findings projection (`sdk.findings.create`) | **Backend** | — | `create` requires a `Request` object, which only `sdk.requests.get` on the backend produces |
| Triage / suppression / audit writes | **Backend** | — | Durable state. `sdk.storage` (frontend) is per-plugin JSON with no project scoping — it must not hold triage |
| Event coalescing (500 ms trailing, ≤2/s) | **Frontend** | Backend emits summaries only | The backend must not hold timers on the single thread for UI cadence; it emits `{ projectId, category, changedCount, newestId }` and forgets |
| Score explanation rendering | Frontend | Backend supplies the signal list | Blocked — the signal vocabulary is Phase 3 |
| Health counters | Backend (`slimStatus()` exists) | Frontend renders | Already shipped in `telemetry.ts` |

---

## O-01 — Server-side filter/sort vs. the SQL discipline gate

### What the gate actually enforces — read in full this session

`packages/backend/src/store/sql-discipline.spec.ts` (544 lines, read in full)
[VERIFIED: packages/backend/src/store/sql-discipline.spec.ts:46-320]. It walks **every** non-spec
`.ts` under `packages/backend/src` at any depth, with the TypeScript compiler, and reports:

| Rule | Fires on |
|------|----------|
| `named-parameter` | `:name`, `@name`, `$name` inside any SQL-looking string |
| `returning` | `RETURNING` |
| `last-insert-rowid` | `last_insert_rowid()` |
| `unscoped-multi-row` | a `SELECT`/`UPDATE`/`DELETE` over a non-`settings` table with no `project_id` **in the text from the first `WHERE` onward** |
| `interpolated-sql` | a template expression whose literal parts look like SQL — one allowlist entry, `migrations.ts` head `/^PRAGMA user_version = $/` |
| `concatenated-sql` | a `+` **one of whose operands is a string literal that itself looks like SQL** |
| `exec-arity` | `exec(sql, anything)` |
| `array-bind` | `run([a,b])` instead of `run(...params)` |
| `module-scope-statement` / `module-scope-await` | a `prepare` or `await` in a module-scope declaration |

`looksLikeSql` requires one of `SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE/INDEX/TRIGGER|PRAGMA`
[VERIFIED: sql-discipline.spec.ts:75-79]:

```ts
return /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+(TABLE|INDEX|TRIGGER)|PRAGMA)\b/i.test(
  text,
);
```

and `isMultiRowStatement` is [VERIFIED: sql-discipline.spec.ts:94-97]:

```ts
const kind = statementKind(text);
return kind === "SELECT" || kind === "UPDATE" || kind === "DELETE";
```

### The gate was executed against every shape Phase 5 will write

`auditSource` is `export`ed, so it can be driven directly. Twenty-four candidate statements were
run through it this session; the results that matter
[VERIFIED: executed via `pnpm vitest run` against `auditSource`, 2026-08-28]:

| Probe | Shape | Rules reported |
|-------|-------|----------------|
| P4 | literal matrix lookup (`SQL.last_seen.desc`) | `[]` — **clean** |
| P5 | null-guard `(? IS NULL OR host = ?)` in one literal | `[]` — **clean** |
| P8 | `UPDATE entities SET triage=? WHERE project_id=? AND fingerprint=?` | `[]` — **clean** |
| P7 | `INSERT INTO audit (...) VALUES (?,?,?,?) ON CONFLICT (project_id, event_id) DO NOTHING` | `[]` — **clean** |
| P11 | `entities JOIN evidence`, both scoped | `[]` — **clean** |
| P12 | `NOT EXISTS (SELECT 1 FROM suppressions s WHERE s.project_id = entities.project_id …)` | `[]` — **clean** |
| P6 | `` `SELECT … ORDER BY ${col} DESC LIMIT ?` `` | `["interpolated-sql"]` — **caught** |
| P9 | `UPDATE entities SET triage=? WHERE fingerprint=?` | `["unscoped-multi-row"]` — **caught** |
| **P1** | `BASE + ORDER + " LIMIT ?"` where `BASE`/`ORDER` are identifiers | **`[]` — SILENT** |
| **P2** | `` `${BASE} ORDER BY ${col} LIMIT ?` `` (head not SQL-looking) | **`[]` — SILENT** |
| **P3** | `["SELECT …", " ORDER BY …"].join(" ")` | **`[]` — SILENT** |
| **Q5** | `WITH s AS (SELECT 1) SELECT a FROM entities LIMIT ?` — **no `project_id` anywhere** | **`[]` — SILENT** |
| **Q2** | outer scoped, `IN (SELECT fingerprint FROM suppressions)` unscoped | **`[]` — SILENT** |
| **Q7** | `SELECT … WHERE project_id=? UNION ALL SELECT … FROM archived_entities` | **`[]` — SILENT** |
| **Q10** | `INSERT INTO audit (…) SELECT project_id, 'x' FROM entities` — multi-row write | **`[]` — SILENT** |
| P10 | `… value LIKE '%$pattern%'` | `["named-parameter"]` — **false positive** |

Two mechanisms explain the silences, and both are in the source above: the concatenation rule only
looks at operands that are *themselves* SQL-looking literals, and `statementKind` returns `"WITH"`
for a CTE and `"INSERT"` for `INSERT … SELECT`, neither of which `isMultiRowStatement` accepts.

**None of these is a live exposure** — no such statement exists in the tree today. All are
prospective, exactly like the `outbound-prohibition.spec.ts` residuals. But four of the five
silent shapes (CTE, unscoped subquery, `UNION` arm, `INSERT … SELECT`) are the natural spellings
for a suppression filter, a tab-count aggregate and an audit write, i.e. precisely what Phase 5
writes. The gate must be widened **before** the first Phase 5 query is authored, not after.

### The performance measurements

All figures below were produced this session against a 200,000-row single-project fixture with
`ANALYZE` run, using `EXPLAIN QUERY PLAN` and the shell's `.stats on` VM-step counter
[VERIFIED: measured — sqlite3 3.51.0, local]. **Caido ships SQLite 3.46.0**
[VERIFIED: packages/backend/src/store/db.ts:60-76 — "plan 01-01 measured 3.46.0 and recorded it as
EXERCISED"], so the *plans* must be re-confirmed on 3.46 as a Wave-0 task; the *ratios* are
structural and will not invert.

| Statement shape | Case | VM steps for one 100-row page |
|---|---|---:|
| `WHERE project_id=? AND (last_seen_at,fingerprint) < (?,?) ORDER BY … DESC,DESC LIMIT 100` over a `(project_id, last_seen_at DESC, fingerprint DESC)` index | deep page (row ~199,800) | **1,933** |
| same, mixed `DESC, ASC` tie-break with the explicit OR cursor | deep page | **1,729** |
| hardcoded `AND host = ?` on a host-leading index | selective, matches 1/50 | **1,923** |
| hardcoded `AND host = ?` on a host-leading index | matches **nothing** | **24** |
| **null-guard** `AND (? IS NULL OR host = ?)`, value bound | selective, matches 1/50 | **51,164** |
| **null-guard**, value bound | matches **nothing** | **2,000,025** |
| `LIMIT 100 OFFSET 190000` (the banned form, for contrast) | page 1,900 | **761,619** |

The null-guard's worst case is **2.6× worse than the `OFFSET` form the UI-SPEC bans**, and it is
reached by an ordinary operator action — typing a filter value that matches nothing. On the single
QuickJS thread that is a whole-partition walk inside one synchronous driver call, with no yield
point and no interrupt handler (SPIKE-01: Caido installs no QuickJS interrupt handler). This is
PITFALLS P3's starvation, arriving through the query layer.

**Row-value cursors need a uniform sort direction.** `(a,b) < (x,y)` means `a<x OR (a=x AND b<y)`,
so it is *wrong* for the codebase's established `ORDER BY last_seen_at DESC, sha256 ASC` tie-break
[VERIFIED: packages/backend/src/store/artifacts.ts:151-157 — `ORDER BY last_seen_at DESC, sha256 ASC`].
Two ways out, both measured:

- Make the tie-break uniform (`DESC, DESC`) and match the index. Row-value cursor, index seek, no
  temp b-tree: `SEARCH entities USING INDEX idx_desc (project_id=? AND (last_seen_at,fingerprint)<(?,?))`.
- Keep the mixed tie-break and write the explicit `(a < ? OR (a = ? AND b > ?))` cursor. Verified
  correct across a tie block (cursor at `(100,'b')` returned `100|c, 100|d, 99|z` — exactly the
  right next page), and SQLite 3.51 still seeks it after `ANALYZE`.

Uniform direction is the cheaper and less surprising of the two; the mixed form is available if the
deterministic-tie-break convention is judged more valuable than the simpler predicate.

**Mixing an index direction against the ORDER BY direction costs a sorter.** `ORDER BY … DESC, DESC`
over a `… DESC, ASC` index produced `USE TEMP B-TREE FOR LAST TERM OF ORDER BY`. Bounded by the
`LIMIT`, so not fatal — but it is free to avoid and expensive to notice later.

### The bounded candidate window — the finding that changes the shape of the answer

Every non-sargable filter has the same failure mode: a filter matching nothing walks the whole
project partition. That is true of the null-guard, and it is equally true of a `NOT EXISTS`
suppression filter and of any `LIKE` substring search. The general fix is to bound the *scanned*
window inside the statement, not just the returned window:

```sql
SELECT e.<columns>
FROM (
  SELECT * FROM entities
  WHERE project_id = ? AND (last_seen_at, fingerprint) < (?, ?)
  ORDER BY last_seen_at DESC, fingerprint DESC
  LIMIT 500
) e
WHERE NOT EXISTS (
  SELECT 1 FROM suppressions s
  WHERE s.project_id = ? AND s.scope_kind = 'host' AND s.scope_value = e.host
)
LIMIT 100
```

Measured [VERIFIED: measured — sqlite3 3.51.0]:

| Form | Pathological case (100% of rows suppressed, page returns 0) |
|---|---:|
| unbounded `NOT EXISTS` filter | **4,000,023** VM steps |
| bounded candidate window (inner `LIMIT 500`) | **15,527** VM steps |

A **258× reduction**, and — the property that matters — the cost is now independent of filter
selectivity. The plan is a co-routine, not a materialisation:

```
|--CO-ROUTINE e
|  `--SEARCH entities USING INDEX idx_desc (project_id=? AND (last_seen_at,fingerprint)<(?,?))
|--SCAN e
`--CORRELATED SCALAR SUBQUERY 2
   `--SEARCH s USING COVERING INDEX sqlite_autoindex_suppressions_1 (project_id=? AND scope_kind=? AND scope_value=?)
```

The cost is a **short page**: the statement may return fewer than 100 rows while more exist. The
cursor advances to the last *scanned* row, and the frontend refetches until it has 100 or the
cursor is exhausted. That is a real contract change to the UI-SPEC's "100-row keyset pages" and it
must be stated in the RPC's return shape (`{ rows, nextCursor, scanned, exhausted }`) so the UI can
distinguish "end of data" from "this window was fully suppressed".

### Recommendation for O-01

**Take candidate (a), the fixed matrix, dimensioned down — not (b), not (c).**

1. **Sort dimension.** One literal per (sort key × direction). Adopt a uniform tie-break direction
   so a row-value cursor is legal and the index matches the `ORDER BY` exactly.
2. **Cursor dimension.** Two literals per sort — `FIRST_PAGE` (no cursor predicate) and
   `NEXT_PAGE` (row-value cursor). Do **not** fold these into one with a sentinel bind: a sentinel
   greater than any fingerprint encodes a hidden assumption about the fingerprint alphabet, and
   this codebase's whole discipline is that a reader can see what binds where.
3. **Filter dimension.** One literal per filter *column*, never per filter *combination*, and each
   with its own composite index leading with `project_id` then the filter column then the sort
   keys. The UI applies at most one column filter at a time. This turns an exponential
   `2^k` matrix into a linear `k+1`.
4. **Suppression and substring search** ride inside the bounded candidate window above rather than
   adding a dimension.

Per entity table with 2 sort keys and 2 filter columns: `(1 + 2) × 2 × 2 = 12` literal statements.
Enumerable, individually reviewable, each with a named matching index, and every one of them clean
against the gate as it stands today.

**This is not a new pattern in this codebase — it is the shipped one.**
`observations.ts` already carries `LIST_OBSERVATIONS_SQL` and `LIST_OBSERVATIONS_FOR_DIGEST_SQL` as
two separate literals for exactly this reason
[VERIFIED: packages/backend/src/store/observations.ts:595-608].

**Why not (b), the allowlisted builder.** It cannot earn an allowlist entry because the gate does
not see it (probes P1/P2/P3, executed above, all report `[]`). Adding an allowlist entry for a
shape the gate reports nothing about would be an entry that never fires — an exemption whose
stated reach exceeds its executed reach, which is the defect Phase 1's CORE-11 history is a record
of. If the operator wants a builder anyway, the honest sequence is: widen the gate to detect
fragment composition, watch the new rule go red on P1/P2/P3, *then* add the narrow allowlist entry.
That is three tasks before the first query is written, against zero for option (a).

**Why not (c), the null-guard.** Disqualified by measurement, above. It is not "slightly slower";
its worst case is reached by a typo and is 2.6× the banned `OFFSET` form.

### The RPC surface

Today: four endpoints, all registered against `sdk: any`, none taking arguments
[VERIFIED: packages/backend/src/index.ts — `getStatus`, `getCompat`, `getArtifacts`, `getObservations`].
`getArtifacts` and `getObservations` call `listArtifacts(db, pid)` / `listObservations(db, pid)`
with the default limit and no parameters at all.

**Adopt a typed contract, and use the SDK's own mechanism.** The backend SDK is generic over an API
spec and an events spec
[VERIFIED: node_modules/.pnpm/@caido+sdk-backend@0.57.1/.../typing.d.ts:44-71,223 —
`export interface SDK<API = {}, Events = {}>` and
`register<K extends keyof ResolvedAPI<SpecOrAPI>>(name: K, callback: APICallback<ResolvedAPI<SpecOrAPI>[K]>)`].

**Use `DefinePluginPackageSpec`, not `DefineAPI`/`DefineEvents`.** Both of the latter are marked
`@deprecated` in the pinned `@caido/sdk-shared@0.2.2`
[VERIFIED: node_modules/.pnpm/@caido+sdk-shared@0.2.2/.../index.d.ts — `@deprecated Use DefinePluginPackageSpec instead.`
appears on both]. The reference plugin `caido-community/scanner` still uses `DefineAPI`; DefMiner
should not copy that. The replacement shape is verbatim from that file:

```ts
export type DefinePluginPackageSpec<
  TSpec extends PluginPackageSpec & ExactPluginPackageKeys<TSpec>,
> = TSpec;
// where PluginPackageSpec = { manifestId: string; api: Record<string, AnyFn>; events: Record<string, AnyVoidFn> }
```

Two operational facts the phase must honour:

- **`sdk.api.register` rejects a duplicate name.** `index.ts`'s own header records this
  [VERIFIED: packages/backend/src/index.ts — "`api.register` rejects a duplicate name, which is
  exactly what a re-init hits"]. A growing RPC surface registered on both the success and the three
  refusal paths must not double-register.
- **Version the contract explicitly.** A `getContractVersion` endpoint plus a frontend check is
  cheap and is the only thing that prevents a stale frontend bundle silently misreading a changed
  return shape after an upgrade (UPGRADE-01 is Phase 11, but the seam is free now).

---

## O-02 — What is actually buildable today

`entities` and `evidence` do not exist. `EXPECTED_TABLES` in the schema gate is an exact set
[VERIFIED: packages/backend/src/store/schema.spec.ts:32]:

```ts
const EXPECTED_TABLES = ["analyses", "artifacts", "observations", "settings"];
```

Phase 3 owns the score-explanation vocabulary (plan 03-03, "Multi-signal confidence scorer with
explanations"); Phase 4 owns the fingerprint and evidence storage (plan 04-03, "Fingerprint
storage, redaction, hash-verified reveal, and HMAC key lifecycle")
[VERIFIED: .planning/ROADMAP.md:295-343].

### Per-plan buildability — stated plainly

| Plan | Status | What blocks it, and what does not |
|------|--------|-----------------------------------|
| **05-01** Sidebar shell, navigation, settings surface | ✅ **Fully buildable today** | Depends on nothing from Phases 2–4. `packages/frontend/`, the `{ kind: "frontend" }` entry in `packages/caido.config.ts`, the PostCSS/prefixwrap pipeline, the tab strip, and the settings shell over the already-shipped three-level `resolveSetting`. Two shipped debts land here: COMPAT-01's visible refusal surface (`index.ts` ~line 175, P1-D5) and the retention-bounds UI (`settings.ts` ~line 94, P1-D5) |
| **05-02** Tables — keyset, virtualised, filtering, coalesced events | ✅ **Fully buildable today, over the shipped tables** | Build the Artifacts and Observations tables. They exercise every hard part: the literal-statement matrix, the row-value cursor, `RecycleScroller` at 32 px, the 2,000-row window, the invalidation-summary event and the 500 ms coalescer, and the 10,000-row overflow backstop. Entity tables are added later by adding literals and columns, not by changing the mechanism |
| **05-03** Evidence view and score explanations | ❌ **Not buildable** | `evidence` does not exist, so there are no byte offsets (UI-03) and no signal list (UI-04). This is the same gap as UI-SPEC FLAG F1. What *is* buildable is the panel **frame**: the persistent split region, the loading skeleton at fixed height, the ERR-04 failure copy, and the artifact-version line from `analyses.detector_set_hash` |
| **05-04** Triage, suppression, retry, persistence across re-analysis | 🟡 **Half buildable** | `audit` (STORE-08) and the **retry** path (OPS-03, over `analyses.scan_state`) are buildable today. Triage (OPS-01) and suppression (OPS-02/04) key on a stable entity identity that Phase 4's 04-03 defines — the *table shape and write discipline* can be designed now, the *key* cannot be fixed |
| **05-05** Safety contract, safe export, Findings projection | 🟡 **Half buildable** | The rendering-safety contract (R1–R3), the hostile-content fixture, the CSV/JSON exporter and the D-04 Blob download are **fully buildable today** over `observations.url` — which is genuinely target-controlled and is the right first subject. Projection (FIND-01/02) is **not**: it needs the high-signal tier from Phases 3/4 (see `## O-06`) |

### Recommendation for O-02

**Do not re-sequence the phase. Split it, and emit a contract upward.**

1. Plan and execute **05-01, 05-02, and the safety/export half of 05-05 now**. They deliver five of
   the eight ROADMAP success criteria (1, 2, 6, 8, and half of 4) against real target-controlled
   bytes, and they de-risk every mechanism the entity tables will later reuse.
2. Phase 5 **defines and publishes the entity read contract** that Phases 3/4 must satisfy — not
   their storage schema, but the four columns `05-UI-SPEC.md` already binds (state/score,
   target-controlled value, last seen, triage state), the cursor tuple shape, the invalidation
   category name, and the score-explanation record shape UI-04 renders. That is a document plus a
   TypeScript type in `packages/engine/` (the SDK-free workspace), and it is genuinely Phase 5's to
   write because Phase 5 is the only consumer.
3. **Escalate**, rather than plan: 05-03 in full, and the triage/suppression halves of 05-04, and
   the projection half of 05-05. Planning them today means inventing Phase 4's schema, and the
   UI-SPEC already declined to do exactly that for exactly this reason.

The alternative — moving Phase 5 after Phase 4 wholesale — costs the de-risking above and leaves
the frontend, the build pipeline and the query discipline unbuilt and unproven until four phases
of backend work have already committed to shapes the UI cannot use. That is the more expensive
ordering.

---

## O-03 — Triage, suppression, and the `audit` table

### Constraint set, all verified from source this session

- **No transaction.** `BEGIN` does not span `exec` calls and fails silently
  [VERIFIED: packages/backend/src/store/artifacts.ts:1-7]. **No invariant may require two
  statements.**
- **No `last_insert_rowid()`.** Unusable on the pooled connection; the gate reports it as
  `last-insert-rowid` [VERIFIED: sql-discipline.spec.ts:190-195].
- **No column may be named `id`.** [VERIFIED: packages/backend/src/store/schema.spec.ts:419-427]:
  ```ts
  id: "no surrogate id anywhere: last_insert_rowid() is unusable on the pooled connection (decision P1-D1)",
  ```
  The same map forbids `value_raw`, `path_key`, `body`, `headers`, `cookie`, `authorization`.
- **Adding a table is a deliberate two-place edit** — `EXPECTED_TABLES` and `COLUMN_ALLOWLIST` in
  `schema.spec.ts`, both exact [VERIFIED: schema.spec.ts:32, 384-415]. The header calls the current
  four "the tables the operator approved at plan 01-01's one-way checkpoint", so a new table is an
  operator-visible decision, not a planner's.
- **`crypto.randomUUID` is available.** Phase 0 measured the `crypto` module's export set inside
  Caido 0.57.1 [VERIFIED: .planning/phases/00-runtime-reality-check/results/runs/20260820T121824Z-31596/raw/capabilities.json]:
  ```
  "crypto": ["Crc32","Crc32c","Md5","Sha1","Sha256","Sha384","Sha512","createCipheriv","createDecipheriv","createHash","createHmac","crypto","default","getRandomValues","randomBytes","randomFill","randomFillSync","randomInt","randomUUID","webcrypto"]
  ```
  `crypto` is already in the shipped bundle's import set, so using it adds nothing DIST-05 must
  re-approve.

### Suppression: filter at query time, and it is retroactive by construction

**Recommendation: query time, not write time.** Four reasons, in order of weight:

1. `05-UI-SPEC.md` states "**Suppression is reversible**; Findings projection is not", and the
   removal copy promises "{n} previously hidden findings will reappear". Both sentences are only
   true if the rows were never deleted. Write-time blocking makes suppression *irreversible in
   effect*, which contradicts the contract and the operator's stated "prefer the design that writes
   less" doctrine in one move.
2. Write-time blocking needs the rule set consulted on the ingest path, on the single QuickJS
   thread, per candidate. Query time moves that cost to a surface the operator is already waiting on.
3. OPS-04 requires suppression to survive a corpus bump and re-analysis. Query-time filtering gets
   that for free; write-time filtering has to re-apply rules during re-analysis, which is a second
   statement the driver cannot make atomic with the first.
4. Retroactivity is not a separate decision under query-time filtering — it is what query-time
   *means*. A new rule hides existing rows on the next read.

**The cost, and its fix, are measured.** See `## O-01`'s bounded-candidate-window section: the
unbounded `NOT EXISTS` form costs 4,000,023 VM steps in the pathological case and 15,527 with an
inner `LIMIT 500`. Suppression rides inside the bounded window. Index the suppressions table on
`(project_id, scope_kind, scope_value)` — the composite primary key gives a covering index for
free, which the EQP confirmed.

**Suppressed rows must not count toward the visible total, and the copy needs rewording.**
`05-UI-SPEC.md`'s filtered-empty body reads *"{total} secrets exist on this target."* Two problems:

- A suppressed finding is one the operator has said is not a finding. Counting it makes the number
  a lie in the direction that erodes trust — the operator clears the filters, sees fewer rows than
  the number promised, and does not know why.
- The word **"total"** is on `FORBIDDEN_COMPLETENESS_WORDS`
  [VERIFIED: packages/backend/src/telemetry.ts:55-71 — the list is
  `all, any, complete, completeness, comprehensive, entire, every, exhaustive, full, total, whole`],
  and the file states the doctrine in its own header: *"No identifier in this file — or any file
  that reads it — may contain a word asserting completeness."* The enforcing test currently walks
  only `slimStatus()`'s keys [VERIFIED: packages/backend/src/telemetry.spec.ts:316-336], so this
  copy would not turn it red — but the doctrine's reason applies with full force here, since
  DefMiner sees only proxied traffic (SPIKE-05) and never the cached bundle (SPIKE-11).

  **Recommended copy:** *"{n} secrets observed on this target. Clear the filters to see them all."*
  with a separate line when any rule is active: *"{m} more are hidden by {k} suppression rules."*
  Both counts derive from the same bounded query with and without the `NOT EXISTS` arm.
  **This is a change to an approved UI-SPEC copy row and belongs to the operator.**

### Triage: what it keys on

`05-UI-SPEC.md` fixes only the negative — never `detector_set_hash`. That negative has a concrete
mechanical reason: `analyses`'s primary key **is** `(project_id, sha256, detector_set_hash)`
[VERIFIED: packages/backend/src/store/migrations.ts step v2], so triage cannot simply hang off an
analysis row without inheriting the corpus hash and violating OPS-04.

**Recommendation: triage keys on exactly the tuple D-01 uses for the Finding `dedupeKey` —
`(project_id, fingerprint, detector_id, host)`.** The argument is consistency of grain: D-01's own
rationale is that "the same secret on `api.target.com` and `cdn.target.com` is two Findings,
because those are two exposures". If triage keyed on `(fingerprint, detector_id)` alone, marking
one exposure a false positive would silently mark the other one too, and the operator would see one
grain in DefMiner and a different grain in Caido Findings. Keeping them identical also makes
"already triaged" and "already projected" answerable from one key.

`[ASSUMED]` — this recommendation depends on Phase 4 producing a stable `fingerprint` and a stable
`detector_id`, neither of which exists yet, and on `host` being the IDNA-normalised form ENC-03
specifies. **It needs operator confirmation before it becomes a locked decision**, because it is
one-way in the same sense D-01 is: a triage key that changes later discards every triage decision,
which is exactly what OPS-04 forbids.

### The `audit` table — recommended shape

Append-only, one idempotent statement per event, keyed on a caller-generated UUID.

```sql
CREATE TABLE IF NOT EXISTS audit (
  project_id TEXT    NOT NULL CHECK (length(project_id) > 0),
  event_id   TEXT    NOT NULL CHECK (length(event_id) > 0),   -- crypto.randomUUID(), NOT "id"
  at         INTEGER NOT NULL,                                -- wall clock, Date.now()
  kind       TEXT    NOT NULL CHECK (kind IN (
               'triage_set','suppression_create','suppression_remove',
               'finding_projected','export_raw','export_redacted','value_revealed')),
  subject    TEXT    NOT NULL,   -- the entity key or rule key the event is about
  detail     TEXT,               -- DefMiner-authored reason code + counts. NEVER a raw value, NEVER a URL
  PRIMARY KEY (project_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit (project_id, at);
```

Write shape, matching every other write in the package:

```sql
INSERT INTO audit (project_id, event_id, at, kind, subject, detail)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (project_id, event_id) DO NOTHING
```

Verified gate-clean as probe P7. Notes:

- `event_id`, never `id` — the forbidden-column map above.
- `kind` is a CHECK-constrained closed vocabulary, matching how `scan_state` was done, so the UI
  binds to shipped values rather than inventing synonyms (OBS-02's discipline).
- **All seven kinds, not a subset.** Each one is either irreversible (`finding_projected`), a
  disclosure (`export_raw`, `value_revealed`), or a silent change to what the operator is shown
  (`suppression_*`, `triage_set`). An audit log that omits the disclosures is not an audit log.
- `detail` must pass through the same `describeError`-class redaction as everything else crossing a
  boundary — no URL-shaped substrings, no target bytes. `subject` is a fingerprint/rule key, not a
  value.
- **`audit` needs a retention rule.** `sweepRetention` already bounds every table by rows and age
  [VERIFIED: packages/backend/src/store/settings.ts:88-131 — `DEFAULT_RETENTION_MAX_ROWS = 50_000`,
  `DEFAULT_RETENTION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000`]. Deciding whether the audit log is
  sweepable at all is an operator call: an audit trail that silently ages out is a weak one, but
  this database is never garbage-collected by Caido and survives a force-reinstall.

---

## O-04 — Sanitising target-controlled bytes in a Finding's `title` / `description`

### What the SDK actually gives you

Read verbatim from the pinned typings
[VERIFIED: node_modules/.pnpm/@caido+quickjs-types@0.26.0/.../caido/findings.d.ts]:

```ts
export type FindingSpec = {
  title: string;
  description?: string | undefined;
  reporter: string;
  dedupeKey?: DedupeKey | undefined;
  request: Request;
};

export type FindingsSDK = {
  get(input: GetFindingInput): Promise<Finding | undefined>;
  exists(input: GetFindingInput): Promise<boolean>;
  create(spec: FindingSpec): Promise<Finding>;   // @throws {Error} If the request cannot be saved.
};
```

Five facts follow, and three of them are new relative to what the phase documents assume:

1. **No `update`, no `delete`, no severity, no confidence, no URL, no metadata.** Confirms
   PITFALLS P2 against the shipped source rather than against the docs.
2. **`dedupeKey` is optional.** Omitting it means no dedupe at all. D-01's recipe must be applied
   unconditionally, and a code path that can produce `undefined` here is a path that writes
   unbounded duplicates.
3. **`create` is already idempotent on the dedupeKey** — the doc comment on `FindingSpec.dedupeKey`
   states *"If a finding with the same dedupe key already exists, it will not be created."* This
   softens D-01's irreversibility for *re-runs* (a second projection of the same key is a no-op) but
   changes nothing about a recipe change, which is what D-01's warning is actually about.
4. **`exists(dedupeKey)` is a cheap pre-check** — `GetFindingInput` accepts a bare `DedupeKey`. The
   projection preview should call it per row and mark already-projected rows, so the operator is not
   asked to re-tick something permanent.
5. **`create` throws.** On this runtime an uncaught rejection is invisible (ERR-03, measured: SPIKE-03
   found zero traces of a thrown error across 22,876 host-log lines). Every `create` must be
   individually try/caught and its outcome reported per row.

There is also a **frontend** projection path —
`sdk.findings.createFinding(requestId, { title, description?, reporter, dedupeKey? })` returning
`Promise<Finding | undefined>` [VERIFIED: @caido/sdk-frontend .../sdks/findings.d.ts]. It takes an
ID rather than a `Request` and returns `undefined` rather than throwing. **This does not reopen
D-02** — the "newest observation whose request resolves" rule stands either way — but it is worth
the planner knowing that the resolution walk could be avoided if the rule ever changed.

### Recommended rule for O-04

**Rule F-1 — `title` contains no target-controlled bytes at all, except a host that has passed a
strict allowlist.**

```
title = "DefMiner: " + <DefMiner-authored detector display name> + " on " + <host>
```

`<host>` is admitted only if, after ENC-03's IDNA normalisation, it matches `^[a-z0-9.-]{1,253}$`
with no leading/trailing `.` or `-` and no empty label. A host that fails is not sanitised into
shape — **the row is marked unprojectable with the reason stated**, reusing D-02's existing
unprojectable state rather than inventing a second one. Rationale: a title is the string the
operator reads in a list of hundreds in someone else's UI; there is no budget there for a value
that needed cleaning.

**Rule F-2 — `description` carries target-controlled bytes only through the R2 pipeline, at the
tighter of R2's two caps.**

In this order, and the order is the rule:
1. Strip C0/C1 (`U+0000`–`U+001F`, `U+007F`–`U+009F`) — **remove, never escape.** R2's
   visible-escape option exists because the evidence panel can be re-rendered; a Finding cannot.
2. Strip bidi overrides and isolates (`U+202A`–`U+202E`, `U+2066`–`U+2069`).
3. Grapheme-safe truncate to **256 characters** — R2's *table-cell* cap, not the 2,048 panel cap,
   because a Finding is permanent and unscrollable and closer in kind to a cell than to a panel.
4. Never the raw secret value — the redacted preview only (SEC-04, project-wide and non-negotiable).
5. Never an extracted URL rendered as a URL. R1's rule that "an extracted URL is data to be
   displayed, never a destination to be offered" applies with more force here, because DefMiner
   does not control how Caido renders a description.

**Rule F-3 — the preview shows the sanitised bytes, not the source bytes.** Whatever the operator
ticks in the projection preview must be byte-identical to what `create` receives. A preview that
shows one string and writes another is a consent defect on the one action that cannot be undone.
The sanitiser is therefore a pure function in `packages/engine/` (SDK-free, unit-testable without
Caido) called once, with its output carried into both the preview row and the `FindingSpec`.

**Rule F-4 — `reporter` is the constant `"DefMiner"`.** The SDK documents it as the grouping key.

---

## O-05 — Block, not warn, on `partial` / `failed` contributing artifacts

**Recommendation: block. Show the row, disable the tick, state the reason, offer
"Re-analyse this artifact" (OPS-03).**

The argument is internal to the approved contract rather than a new preference. `05-UI-SPEC.md`'s
own `error / findings-projection-preview` row already reads: *"If the preview fails to load,
projection is **blocked entirely** — there is no 'create anyway' path. The one action in the tool
that cannot be undone is never offered without the review surface that justifies it."* A row whose
contributing artifact is `partial` is a row whose review surface is *known incomplete*. Warning on
it while blocking on a failed preview holds two different standards for the same property.

Two supporting facts:

- **`partial` means the walk stopped early.** `analyses` carries `bytes_walked` and `max_slice_ms`
  and the UI-09 copy is *"Findings below are a floor, not a total."* A floor is exactly the wrong
  basis for a permanent write.
- **`failed` means nothing was inspected at all** — the ERR-04 copy says so in words. Projecting
  from a `failed` artifact is not a weaker claim, it is a claim with no evidence behind it.

The operator's stated cross-decision preference — "when an action cannot be undone, prefer the
design that writes less" — points the same way, and the escape hatch is not lossy: OPS-03's retry
turns a blocked row into a projectable one in one action.

**This is a change to `05-UI-SPEC.md`'s current behaviour (which warns) and therefore belongs to
the operator, not the planner.**

---

## O-06 — The Phase 5 high-signal tier

`.planning/research/PITFALLS.md` P2 defines the tier verbatim
[VERIFIED: .planning/research/PITFALLS.md:147]:

> **Caido Findings receive only the top tier**: provider-format-verified *and* (checksum-valid
> **or** network-validated) *and* not stopworded.

**Network validation is SEC-07, and SEC-07 is Phase 10 — not "later", five phases later.**
[VERIFIED: .planning/ROADMAP.md:548 —
`| CHUNK-01 … CHUNK-04, SUPPLY-01 … SUPPLY-05, SEC-07 | Phase 10 |`]. It is also OFF by default
even once it ships (REQUIREMENTS.md SEC-07: *"Built, and OFF by default"*).

**So the Phase 5 tier reduces to: provider-format-verified AND checksum-valid AND not-stopworded.**
That confirms the CONTEXT.md hypothesis. But confirming it surfaces a consequence the hypothesis
did not state, and it is the load-bearing half of this answer:

**The disjunction collapses to a conjunction, so a provider detector with no checksum has no
satisfiable branch and can never project at Phase 5.** PITFALLS P2 names the providers that have a
structural check — *"AWS key ID structure, Stripe key prefixes, GitHub's `_`-prefixed tokens with a
CRC32 checksum in the last 6 chars, Slack's `xox[baprs]-` shapes"*. Everything else is
format-and-context only.

Three consequences for planning:

1. **Phase 5 must state an upward requirement on Phase 3.** DET-02 ("Detectors are data … each
   declares keywords, pattern, entropy expectations, allowlists, and confidence inputs") does not
   currently name a checksum capability. Plan 03-01's rule schema must carry a per-rule
   `checksum: <verifier id> | null` field, and Phase 4's SEC-01 must implement the verifiers, or
   Phase 5's projection surface is provably empty. **This is a cross-phase dependency Phase 5
   should raise now**, while 03-01 is still unplanned and the schema is free.
2. **FIND-02 is satisfied structurally, not by a filter.** "Entropy-only and hint-grade never
   project" is not a rule the projection code applies — it is what remains when the tier is a
   three-way conjunction. R4's requirement that such results are *absent from the preview* rather
   than merely unchecked falls out for free, and the exclusion count line
   (*"{n} results are entropy-only or hint-grade and are never projected"*) is the difference
   between the inventory count and the preview count.
3. **`crypto.Crc32` is available in Caido's runtime** — it is in the measured module export set
   quoted in `## O-03`. GitHub's token checksum is therefore verifiable offline inside QuickJS with
   no new dependency. Worth recording for Phase 4's benefit.

---

## Standard Stack

Every version below is fixed by `05-UI-SPEC.md` and `STACK.md` and is **not** re-litigated here.
This table exists so the planner has them in one place with the provenance attached.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vue` | `3.5.41` | UI framework | Caido provides it; must be `external` [CITED: STACK.md § Frontend Libraries] |
| `primevue` | **`4.1.0` EXACT** | Components | `@caido/primevue@0.3.3` peer-depends on exactly this. PrimeVue 5 breaks the Caido theme [CITED: STACK.md, DIST-06] |
| `@caido/primevue` | `0.3.3` | Caido pass-through theme | `app.use(PrimeVue, { unstyled: true, pt: Classic })` |
| `@caido/tailwindcss` | `0.1.0` | Six colour roles backed by `--c-*` CSS variables | The zero-hex rule depends on it |
| `tailwindcss` | **`3.4.13` EXACT (v3)** | Styling | v4 removed the PostCSS-plugin-with-inline-config API `caido.config.ts` uses |
| `tailwindcss-primeui` | `0.6.1` | Tailwind ↔ PrimeVue bridge | |
| `postcss-prefixwrap` | `1.57.2` | Wraps every rule in `#plugin--defminer` | **Mandatory** — without it DefMiner's CSS bleeds into Caido and other plugins |
| `vue-virtual-scroller` | `2.0.0-beta.8` | `RecycleScroller`, fixed `item-size: 32` | The 10,000-row target requires a fixed row height |
| `pinia` | `3.0.4` | Frontend state | |
| `@vueuse/core` | `14.2.0` | Composables (the 500 ms coalescing window) | |
| `@caido/sdk-frontend` | matched to the Caido target | `navigation`, `sidebar`, `backend`, `findings` | Must be `external` |

**Icon library: none.** Verified as consistent with the SDK:
`sidebar.registerItem(name, path, options)` has `options.icon` **optional**
[VERIFIED: @caido/sdk-frontend .../sdks/sidebar.d.ts], and `Icon` is a branded `string` whose
documented example is `"fas fa-rocket"` — a FontAwesome class Caido already ships. So a sidebar
icon, if wanted, costs no DefMiner dependency. DefMiner-authored markup still uses text labels.

### Supporting (build and test)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vitejs/plugin-vue` | `6.0.1` | SFC compilation | 05-01 |
| `vue-tsc` | `3.2.4` | Frontend typecheck | 05-01, wired into `pnpm typecheck` |
| `postcss` / `autoprefixer` | current | PostCSS pipeline | 05-01 |
| `jsdom` | current | Vitest DOM environment | **Required for any component test** — see `## Validation Architecture` |
| `@vue/test-utils` | current | Component mounting | R1/R2 rendering assertions |
| `playwright` | `1.62.1` — **already installed** | 10,000-row overflow backstop, frame timing | No new dependency |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jsdom` | `happy-dom` | Faster, but its `Intl`/grapheme and bidi handling is less complete — and grapheme-safe truncation is precisely what the R2 fixture asserts. Prefer `jsdom` here |
| A fixed literal matrix (O-01a) | Null-guard predicates (O-01c) | Measured 2,000,025 vs 24 VM steps on a zero-match filter. Rejected |
| A fixed literal matrix | Allowlisted builder (O-01b) | Invisible to the gate today (probes P1–P3). Rejected unless the gate is widened first |
| `DefineAPI` / `DefineEvents` | `DefinePluginPackageSpec` | The former two are `@deprecated` in the pinned `@caido/sdk-shared@0.2.2`. Use the latter |

**Installation** (frontend workspace, 05-01):

```bash
pnpm --filter @defminer/frontend add \
  vue primevue@4.1.0 @caido/primevue@0.3.3 @caido/tailwindcss@0.1.0 \
  tailwindcss@3.4.13 tailwindcss-primeui@0.6.1 postcss-prefixwrap@1.57.2 \
  vue-virtual-scroller@2.0.0-beta.8 pinia@3.0.4 @vueuse/core@14.2.0
pnpm --filter @defminer/frontend add -D @vitejs/plugin-vue vue-tsc postcss autoprefixer @caido/sdk-frontend
pnpm add -Dw jsdom @vue/test-utils
```

The `primevue` and `tailwindcss` exact versions are additionally enforced by
`pnpm-workspace.yaml`'s `overrides`, which were put there in Phase 1 specifically so a Phase 5
frontend could not resolve a breaking version [VERIFIED: pnpm-workspace.yaml].

---

## Package Legitimacy Audit

Run via `gsd-tools query package-legitimacy check --ecosystem npm …` on 2026-08-28.

| Package | Registry | Last publish | Weekly downloads | Source repo | Verdict | Disposition |
|---------|----------|-------------|-----------------:|-------------|---------|-------------|
| `vue` | npm | 2026-08-27 | 15,444,459 | github.com/vuejs/core | SUS (`too-new`) | Approved — signal is *last publish date*, not age |
| `primevue` | npm | 2026-08-13 | 793,818 | none | SUS (`too-new`,`no-repository`) | Approved — pinned `4.1.0` EXACT by DIST-06 and `pnpm-workspace.yaml` |
| `@caido/primevue` | npm | 2025-10-25 | 279 | none | SUS (`low-downloads`,`no-repository`) | Approved — first-party Caido, already vetted by `STACK.md` |
| `@caido/tailwindcss` | npm | 2026-02-12 | 258 | github.com/caido/ui-kit | SUS (`low-downloads`) | Approved — first-party Caido |
| `tailwindcss` | npm | 2026-07-16 | 127,096,734 | tailwindlabs/tailwindcss | OK | Approved (pinned `3.4.13`) |
| `tailwindcss-primeui` | npm | 2025-03-26 | 352,514 | primefaces/tailwindcss-primeui | OK | Approved |
| `postcss-prefixwrap` | npm | 2026-05-05 | 156,582 | dbtedman/postcss-prefixwrap | OK | Approved |
| `pinia` | npm | 2026-08-12 | 4,893,599 | vuejs/pinia | SUS (`too-new`) | Approved |
| `@vueuse/core` | npm | 2026-07-29 | 10,787,008 | vueuse/vueuse | OK | Approved |
| `vue-virtual-scroller` | npm | 2026-08-12 | 549,854 | Akryum/vue-virtual-scroller | SUS (`too-new`) | Approved (beta pin is deliberate) |
| `@vitejs/plugin-vue` | npm | 2026-07-14 | 8,972,461 | vitejs/vite-plugin-vue | OK | Approved |
| `vue-tsc` | npm | 2026-08-21 | 6,008,468 | vuejs/language-tools | SUS (`too-new`) | Approved |
| `@caido/sdk-frontend` | npm | 2026-08-22 | 1,681 | caido/sdk-js | SUS (`too-new`) | Approved — first-party Caido, same repo as the already-installed `@caido/sdk-backend` |
| `jsdom` | npm | 2026-07-29 | 97,721,202 | jsdom/jsdom | OK | Approved |
| `@vue/test-utils` | npm | 2026-08-27 | 4,761,149 | vuejs/test-utils | SUS (`too-new`) | Approved |
| `postcss` | npm | 2026-08-06 | 280,270,306 | postcss/postcss | SUS (`too-new`) | Approved |
| `autoprefixer` | npm | 2026-07-16 | 66,171,297 | postcss/autoprefixer | OK | Approved |

**Packages removed due to `[SLOP]` verdict:** none.

**Packages flagged `[SUS]`:** eleven. **Read the `reasons` column before acting on any of them.**
Nine are flagged `too-new`, which this seam derives from the **latest publish date**, not from
package age — `postcss` at 280M weekly downloads and `vue` at 15M are flagged by the same rule. The
two genuinely low-download packages, `@caido/primevue` (279/wk) and `@caido/tailwindcss` (258/wk),
are first-party Caido packages from the same publisher as the already-installed and already-vetted
`@caido/sdk-backend@0.57.1`, and `DIST-06` exists specifically to pin them. **No `checkpoint:human-verify`
is warranted on this evidence** — but the planner should record the reasoning rather than silently
dropping the flags, because `@caido/eslint-config` at 153 weekly downloads *did* go through a
`gate="blocking-human"` checkpoint in Phase 1 [VERIFIED: eslint.config.js:1-10], and consistency
with that precedent is the operator's call, not the planner's.

---

## Architecture Patterns

### System Architecture Diagram

```
 CAIDO HOST (client)                       │  CAIDO SERVER / CLI / DOCKER (QuickJS, one thread)
 ──────────────────────────────────────────┼──────────────────────────────────────────────────────
                                           │
  sidebar.registerItem("DefMiner", "/…")   │
  navigation.addPage("/…", { body })       │
        │  body is an HTMLElement          │
        ▼                                  │
  ┌──────────────────────────────┐         │
  │  Vue app mounted on `body`   │         │
  │  #plugin--defminer scoped    │         │
  └──────────────┬───────────────┘         │
                 │                          │
   ┌─────────────┴──────────────┐          │
   │                            │          │
   ▼                            ▼          │
 Pinia store              coalescer        │
 (2,000-row window)   500 ms trailing      │
   │  ▲                  ≤2 reactions/s    │
   │  │                       ▲            │
   │  │                       │            │
   │  │  sdk.backend.onEvent("inventory:changed", …) ◀── sdk.api.send({projectId,category,changedCount,newestId})
   │  │     returns { stop } — MUST be stopped on unmount        (summary only: no payload, no bodies)
   │  │                       │            │
   │  └───────────────────────┼────────────┼─────────────┐
   │                          │            │             │
   │ sdk.backend.listEntities(cursor, sort, filter)      │
   ├────────────────────────────────────────────────────▶│
   │                                       │             ▼
   │                                       │   ┌────────────────────────────┐
   │                                       │   │ RPC layer (typed spec)     │
   │                                       │   │ project epoch re-checked   │
   │                                       │   └─────────────┬──────────────┘
   │                                       │                 ▼
   │                                       │   ┌────────────────────────────┐
   │                                       │   │ literal-statement matrix   │
   │                                       │   │ (sort × direction × cursor │
   │                                       │   │  × one filter column)      │
   │                                       │   │ bounded candidate window   │
   │                                       │   │   inner LIMIT 500          │
   │                                       │   │ NOT EXISTS suppressions    │
   │                                       │   └─────────────┬──────────────┘
   │  { rows, nextCursor, scanned, exhausted }               ▼
   │◀──────────────────────────────────────┼───────  sdk.meta.db()  (pooled, one DB for all projects)
   │                                       │         artifacts │ observations │ analyses
   │                                       │         settings  │ audit ← NEW  │ suppressions ← NEW
   │                                       │         entities  │ evidence     ← Phase 4
   ▼                                       │
 Blob + <a download>  ◀── export bytes ────┼─── CSV/JSON serialiser + formula neutralisation
 (D-04: no server file)                    │
                                           │
 projection preview (per-row tick, D-03)   │
   │  tick set                             │
   ├──────────────────────────────────────▶│  for each ticked row, SERIALLY:
                                           │    1. walk observations newest-first (D-02)
                                           │    2. sdk.requests.get(request_id) → Request | undefined
                                           │    3. sdk.findings.exists(dedupeKey) → skip if true
                                           │    4. sanitise title/description (O-04 F-1…F-3)
                                           │    5. sdk.findings.create({...})   ← try/catch EACH
                                           │    6. INSERT INTO audit (kind='finding_projected')
```

### Recommended Project Structure

```
packages/
├── frontend/                       # NEW in 05-01
│   ├── src/
│   │   ├── index.ts                # init(sdk): mount Vue on a div, addPage, registerItem
│   │   ├── App.vue                 # toolbar + tab strip + split body
│   │   ├── components/             # tables, evidence panel, dialogs — no v-html anywhere
│   │   ├── stores/                 # pinia: inventory window, coalescer, settings
│   │   ├── safety/                 # R2 pipeline: strip → truncate. Pure, unit-tested
│   │   └── styles/                 # tailwind entry; prefixwrap asserted on BUILD OUTPUT
│   ├── vite.config.ts              # external: vue, @caido/frontend-sdk, @codemirror/*, @lezer/*
│   └── package.json
├── engine/                         # SDK-free. EXTEND, do not duplicate.
│   └── src/
│       ├── sanitise.ts             # NEW — C0/C1 + bidi strip, shared by backend export and O-04
│       ├── csv.ts                  # NEW — formula neutralisation + quote wrapping
│       └── contract.ts             # NEW — the O-02 entity read contract Phases 3/4 must satisfy
└── backend/src/store/
    ├── reads.ts                    # NEW — the literal-statement matrix
    ├── audit.ts                    # NEW — STORE-08
    └── suppressions.ts             # NEW
```

`packages/caido.config.ts` gains a second entry alongside the existing backend one
[VERIFIED: packages/caido.config.ts — `plugins: [{ kind: "backend", … }]` today]:

```ts
{ kind: "frontend", id: "defminer-frontend", name: "DefMiner", root: "frontend" }
```

Note that file's own header warning: `@caido-community/dev@0.1.7` deletes `<cwd>/dist` wholesale
after tsup writes `<root>/dist/index.js`, which is why the config lives at `packages/` and not at
`packages/backend/`. The frontend entry inherits that layout constraint.

### Pattern 1 — The literal-statement matrix

```ts
// packages/backend/src/store/reads.ts
// Every statement is a COMPLETE LITERAL. Selection is an object lookup over a frozen
// record — plain TypeScript, no SQL construction, verified clean against
// sql-discipline.spec.ts's auditSource (probe P4).

const LIST_BY_LAST_SEEN_FIRST = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ?
ORDER BY last_seen_at DESC, sha256 DESC
LIMIT ?
`;

const LIST_BY_LAST_SEEN_NEXT = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ? AND (last_seen_at, sha256) < (?, ?)
ORDER BY last_seen_at DESC, sha256 DESC
LIMIT ?
`;

const ARTIFACT_READS = Object.freeze({
  last_seen: Object.freeze({ first: LIST_BY_LAST_SEEN_FIRST, next: LIST_BY_LAST_SEEN_NEXT }),
  // …one entry per sort key; one further pair per filter column
});

export async function listArtifactsPage(
  db: Database, projectId: string, sort: ArtifactSort,
  cursor: { lastSeenAt: number; sha256: string } | null, limit: number,
): Promise<ArtifactRow[]> {
  // prepare INSIDE the call — sdk.meta.db() is a pool over worker threads
  if (cursor === null) {
    const stmt = await db.prepare(ARTIFACT_READS[sort].first);
    return stmt.all<ArtifactRow>(projectId, limit);
  }
  const stmt = await db.prepare(ARTIFACT_READS[sort].next);
  return stmt.all<ArtifactRow>(projectId, cursor.lastSeenAt, cursor.sha256, limit);
}
```

The matching index must state its directions explicitly, or the plan grows a temp b-tree:

```sql
CREATE INDEX IF NOT EXISTS idx_artifacts_keyset
  ON artifacts (project_id, last_seen_at DESC, sha256 DESC);
```

> **Note the direction change.** The shipped `LIST_ARTIFACTS_SQL` uses `ORDER BY last_seen_at DESC,
> sha256 ASC` [VERIFIED: artifacts.ts:151-157]. A row-value cursor requires uniform direction.
> Either change the tie-break to `DESC` for the paginated reads (leaving the shipped statement
> alone — it is a different statement) or use the explicit `(a < ? OR (a = ? AND b > ?))` form.
> Both were measured; both work. **Do not** apply a row-value cursor to a mixed-direction sort — it
> is silently wrong, not slow.

### Pattern 2 — The rendering-safety pipeline as a pure function

```ts
// packages/engine/src/sanitise.ts — no Caido imports, unit-testable under plain vitest.
const C0_C1 = /[\u0000-\u001F\u007F-\u009F]/g;
const BIDI  = /[\u202A-\u202E\u2066-\u2069]/g;

/** Strip, then truncate grapheme-safe. Order matters: truncating first can leave a
 *  half-stripped sequence at the boundary. */
export function forDisplay(raw: string, maxGraphemes: number): { text: string; shown: number; total: number } {
  const stripped = raw.replace(C0_C1, "").replace(BIDI, "");
  const total = [...stripped].length;
  // Intl.Segmenter is a BROWSER api and is NOT in Caido's QuickJS global set.
  // Frontend-only. The backend truncates by code point and caps generously.
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const out: string[] = [];
  for (const { segment } of seg.segment(stripped)) {
    if (out.length >= maxGraphemes) break;
    out.push(segment);
  }
  return { text: out.join(""), shown: out.length, total };
}
```

### Pattern 3 — Match highlighting by slicing, never by markup (R1)

```vue
<template>
  <span class="font-mono whitespace-pre overflow-hidden">
    <span>{{ before }}</span><span class="bg-surface-700">{{ match }}</span><span>{{ after }}</span>
  </span>
</template>
```

Three sibling elements, three plain strings, three text interpolations. Never a `<mark>` string
built by concatenation and rendered.

### Pattern 4 — Event coalescing

```ts
// Backend: summary only. No payload, no bodies (UI-SPEC ## Event coalescing).
sdk.api.send("inventory:changed", { projectId, category: "artifacts", changedCount: n, newestId });

// Frontend: 500 ms trailing, ≤2 reactions/second, and NEVER while a row is selected.
const handle = sdk.backend.onEvent("inventory:changed", (summary) => {
  if (store.selectedRow !== null || store.panelOpen) { store.pendingCount += summary.changedCount; return; }
  debouncedRefresh(summary);   // useDebounceFn(fn, 500) from @vueuse/core, plus a 500 ms throttle gate
});
onUnmounted(() => handle.stop());   // onEvent returns { stop } — leaking it leaks a listener per mount
```

### Anti-Patterns to Avoid

- **Building SQL from fragments** — invisible to the gate today (probes P1/P2/P3). It is not "a
  small exception"; it is an ungated SQL surface that reports green forever.
- **A `WITH` / CTE statement without `project_id` in its first `WHERE`** — probe Q5: reported
  nothing. `statementKind` returns `"WITH"` and `isMultiRowStatement` rejects it.
- **`INSERT … SELECT`** — probe Q10: reported nothing, and it is a multi-row write the "one
  idempotent statement" discipline was never designed to cover.
- **`$` or `@` or `:word` inside a SQL literal** — probe P10: a `LIKE '%$pattern%'` literal trips
  `named-parameter` as a false positive. Bind the pattern; never write it into the statement.
- **Client-side sorting the 2,000-row window** — sorts a subset and presents it as the whole set.
- **A revealed value in a table cell** — UI-SPEC D1. A revealed value in a cell is a value in a
  screenshot.
- **`Intl.Segmenter` on the backend** — not in Caido's QuickJS global set (measured Phase 0: 100
  globals, no `Intl`).
- **An optimistic triage badge flip** — UI-SPEC's `loading / triage-controls` row forbids it; on a
  surface whose whole purpose is durable triage, an optimistic flip that fails shows a state that
  was never persisted.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Virtualised 10,000-row table | A custom windowing scroller | `vue-virtual-scroller` `RecycleScroller`, fixed `item-size: 32` | The fixed size is what keeps it on the fast path; a variable height degrades it to `DynamicScroller` and costs success criterion 2 |
| Debounce / throttle for coalescing | Hand-rolled `setTimeout` bookkeeping | `@vueuse/core` `useDebounceFn` + `useThrottleFn` | Already pinned; hand-rolled timers leak across unmounts |
| Grapheme-safe truncation | Counting `String.length` or slicing UTF-16 | `Intl.Segmenter` (frontend only) | `.length` splits surrogate pairs and combining sequences — the exact defect UISEC-03's fixture asserts against |
| CSS isolation | Hand-writing scoped selectors | `postcss-prefixwrap@1.57.2` | Mandatory; assert on the **build output**, not the config |
| Uniqueness for audit rows | A counter, a timestamp key, or `last_insert_rowid()` | `crypto.randomUUID()` (verified present) | `last_insert_rowid()` is unusable on the pool and the gate reports it |
| Finding dedupe | Querying your own table for "already projected" | `sdk.findings.exists(dedupeKey)` | The SDK already dedupes on create; `exists` is the cheap pre-check for the preview |
| A frontend triage cache | `sdk.storage` | Backend `audit` + triage table | `sdk.storage` is per-plugin JSON with no project scoping — CORE-09's isolation would not hold |
| CSV escaping | `"…".replace(/,/g, …)` | Neutralise **then** quote, in that order | Quoting alone does not stop Excel; `=cmd|'…'!A1` inside quotes still executes |
| Cursor pagination | `LIMIT ? OFFSET ?` | Row-value keyset cursor | Measured 761,619 VM steps at page 1,900 vs 1,933 for the cursor |

**Key insight:** every hand-rolled item on this list fails *silently and late* — a split grapheme
renders as a replacement character three months in, a leaked listener shows up as duplicated
refreshes on the fourth project switch, and an `OFFSET` page is fast until the operator has browsed
for a day. None of them fails in a way a smoke test catches.

---

## Common Pitfalls

### P-01 — `vue/no-v-html` is `warn`, not `error`, in the shipped preset
**What goes wrong:** R1 says `v-html` is "banned by lint, as an error, with no per-line disable".
The preset does not do that.
**Measured:** `@caido/eslint-config@0.10.0` applies `eslint-plugin-vue`'s `flat/recommended`
restricted to `**/*.vue`, and in `eslint-plugin-vue@10.6.0` that config sets
`vue/no-v-html` to **`"warn"`**
[VERIFIED: resolved by executing `require('eslint-plugin-vue').configs['flat/recommended']` this
session → `flat/recommended vue/no-v-html = warn`].
**How to avoid:** override to `"error"` explicitly, **and** set `linterOptions: { noInlineConfig: true }`
on the frontend file block so an `eslint-disable-next-line` cannot re-enable it. Better still, given
this codebase's own precedent (`sql-discipline.spec.ts`, `outbound-prohibition.spec.ts`), add a
`frontend-safety.spec.ts` AST gate: a lint rule can be disabled in a comment; a spec-file gate
cannot.

### P-02 — `eval` and `new Function` are not covered by anything currently installed
**Measured:** `eslint-plugin-no-unsanitized`'s `recommended` config is applied with no `files`
restriction [VERIFIED: @caido/eslint-config dist/index.js — `default9.configs.recommended` inside
the `javascript` block], covering `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`.
It does **not** cover `eval` or `new Function`, and neither does `@eslint/js` recommended
[VERIFIED: executed — `no-eval`, `no-new-func`, `no-implied-eval`, `no-script-url` all report
`NOT IN RECOMMENDED`].
**How to avoid:** enable all four explicitly. R1 names `new Function` and `eval` by name and would
otherwise be unenforced — the same "stated reach exceeds executed reach" defect CORE-11's history
is a record of.

### P-03 — `addPage` takes an `HTMLElement`, not a component
**Measured** [VERIFIED: @caido/sdk-frontend .../sdks/navigation.d.ts]:
```ts
addPage: (path: string, options: { body: HTMLElement; topbar?: HTMLElement; onEnter?: () => void }) => void;
```
**How to avoid:** create a `div`, `createApp(App).mount(div)`, pass the div. `onEnter` is the hook
for "refresh when the operator returns to the page" and is the natural place to apply a pending
coalescing pill. `topbar` is a second `HTMLElement` and is where the 48 px toolbar belongs.

### P-04 — `sdk.backend.onEvent` returns a handle that must be stopped
**Measured** [VERIFIED: @caido/sdk-frontend .../sdks/backend.d.ts — `onEvent: <K>(event, cb) => { stop: () => void }`].
**What goes wrong:** every mount adds a listener; after four project switches, one backend event
triggers four refreshes and the ≤2-reactions-per-second cap is silently multiplied.
**How to avoid:** `onUnmounted(() => handle.stop())`, and assert it in a component test.

### P-05 — `sdk.findings.create` throws, and nothing surfaces a throw
**Measured** [VERIFIED: caido/quickjs-types findings.d.ts — `@throws {Error} If the request cannot be saved.`],
combined with ERR-03's measured finding that Caido surfaces neither a throw nor a rejection from
plugin code.
**How to avoid:** try/catch **each** `create`, individually, and report per-row outcome into the
preview and into `audit`. A `Promise.all` over the ticked rows would lose which row failed on the
one action that cannot be retried into a clean state.

### P-06 — A "raw" export cannot un-redact what was never stored
**Measured:** `observations.url` has query values replaced at write time with the literal
`"<redacted>"` [VERIFIED: packages/backend/src/store/observations.ts:55 —
`export const QUERY_VALUE_REDACTION = "<redacted>";`], and a segment that is not a genuine
`name=value` pair is redacted whole on both `&` and `;` delimiters (decision P10-D1, amended by
CR-07 for base64 padding).
**What goes wrong:** the raw-export dialog promises "{n} live secret values in cleartext". For URL
query material that promise is unmeetable, and an operator who exports raw to recover a token will
get `<redacted>` and conclude the tool lost their data.
**How to avoid:** the raw-export copy must scope its promise to the fields that actually hold raw
material, and say plainly that URL query values were never persisted. This is a second correction
to `05-UI-SPEC.md`'s raw-export copy, alongside the D-04 one already recorded in CONTEXT.md.

### P-07 — A frozen-looking page is almost always the backend
PITFALLS P3. The Health tab exists so the operator can tell a blocked QuickJS thread from a slow
renderer. Every measurement in `## O-01` is a way the *query layer* can produce that freeze, which
is new: previously only a large parse could.

### P-08 — `sdk.api.register` rejects a duplicate name
**Measured** [VERIFIED: packages/backend/src/index.ts header]. `init()` registers `getStatus` and
`getCompat` on the success path and on **three** refusal paths. Every endpoint Phase 5 adds must be
registered on exactly one path, and the refusal paths must keep registering the minimal pair so a
refusing build is still diagnosable.

### P-09 — Adding a table is a two-place edit and an operator-visible one
`EXPECTED_TABLES` and `COLUMN_ALLOWLIST` in `schema.spec.ts` are both exact sets, and
`FORBIDDEN_COLUMNS` bans `id`, `body`, `headers`, `cookie`, `authorization`, `value_raw`,
`path_key`. A new table that forgets either place fails the gate; a new column named `id` fails with
a message that explains why.

### P-10 — `knip`'s `ignoreExportsUsedInFile` hole was left open *for this phase*
[VERIFIED: knip.json:60-80 — "should be revisited when the frontend in Phase 5"]. A genuinely dead
export referenced once in its own file is currently invisible. A frontend adds a large surface of
exactly that shape (components, composables, store getters), so this is the phase where the hole
starts to cost something.

---

## Code Examples

### 1 — Registering the page and the sidebar item

```ts
// packages/frontend/src/index.ts
import { createApp } from "vue";
import PrimeVue from "primevue/config";
import { Classic } from "@caido/primevue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./styles/index.css";

export function init(sdk: FrontendSDK): void {
  const body = document.createElement("div");
  body.id = "plugin--defminer";                 // the prefixwrap root — must match the PostCSS config

  createApp(App)
    .use(createPinia())
    .use(PrimeVue, { unstyled: true, pt: Classic })
    .provide("sdk", sdk)
    .mount(body);

  sdk.navigation.addPage("/defminer", { body, onEnter: () => { /* apply pending refresh */ } });
  sdk.sidebar.registerItem("DefMiner", "/defminer");   // `icon` is optional — no icon dependency
}
```

### 2 — The typed RPC contract

```ts
// packages/backend/src/index.ts
import type { DefinePluginPackageSpec, SDK } from "caido:plugin";

export type Spec = DefinePluginPackageSpec<{
  manifestId: "defminer";
  api: {
    getStatus: () => Promise<StatusPayload>;
    listArtifactsPage: (req: PageRequest) => Promise<PageResponse<ArtifactRow>>;
    setTriage: (key: EntityKey, state: TriageState) => Promise<WriteOutcome>;
    exportInventory: (opts: ExportOptions) => Promise<{ filename: string; mime: string; body: string }>;
    previewProjection: () => Promise<ProjectionPreviewRow[]>;
    projectFindings: (keys: EntityKey[]) => Promise<ProjectionOutcome[]>;
  };
  events: {
    "inventory:changed": (s: { projectId: string; category: string; changedCount: number; newestId: string }) => void;
  };
}>;

export function init(sdk: SDK<Spec["api"], Spec["events"]>): void { /* … */ }
```

`DefinePluginPackageSpec` — not `DefineAPI`/`DefineEvents`, both of which are `@deprecated` in the
pinned `@caido/sdk-shared@0.2.2`.

### 3 — CSV formula neutralisation, in the mandated order

```ts
// packages/engine/src/csv.ts
const DANGEROUS_LEAD = /^[=+\-@\t\r]/;

export function csvField(raw: string): string {
  const stripped = raw.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  const neutralised = DANGEROUS_LEAD.test(stripped) ? "'" + stripped : stripped;   // STEP 1
  return '"' + neutralised.replace(/"/g, '""') + '"';                              // STEP 2
}
```

Both steps, in that order — R3. Quoting alone does not stop Excel.

### 4 — Projection, one row at a time

```ts
for (const key of tickedKeys) {                       // D-03: per-row opt-in, serial
  const dedupeKey = `${key.fingerprint}:${key.detectorId}:${key.host}`;   // D-01
  if (await sdk.findings.exists(dedupeKey)) { out.push({ key, status: "already-projected" }); continue; }

  let request: Request | undefined;                   // D-02: newest observation that still resolves
  for (const obs of await listObservationsNewestFirst(db, projectId, key)) {
    const rr = await sdk.requests.get(obs.request_id);
    if (rr?.request !== undefined) { request = rr.request; break; }
  }
  if (request === undefined) { out.push({ key, status: "unprojectable", reason: "no source request still resolves" }); continue; }

  const { title, description } = sanitiseForFinding(key, preview);   // O-04 F-1..F-3, the SAME bytes the preview showed
  if (title === null) { out.push({ key, status: "unprojectable", reason: "host failed the strict allowlist" }); continue; }

  try {                                               // P-05: EACH create, individually
    await sdk.findings.create({ title, description, reporter: "DefMiner", dedupeKey, request });
    await recordAudit(db, projectId, "finding_projected", dedupeKey, null);
    out.push({ key, status: "created" });
  } catch (e) {
    out.push({ key, status: "failed", reason: describeError(e) });
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `DefineAPI` / `DefineEvents` from `caido:plugin` | `DefinePluginPackageSpec<{ manifestId, api, events }>` | `@caido/sdk-shared@0.2.x` | The reference plugin `scanner` still uses the deprecated form; do not copy it |
| `LIMIT ? OFFSET ?` pagination | Row-value keyset cursor | SQLite 3.15.0 (2016-10-14) added row values [CITED: sqlite.org/rowvalue.html] | Measured 761,619 → 1,933 VM steps at page 1,900 |
| `vitest` `environmentMatchGlobs` | Per-file `// @vitest-environment jsdom` docblock, or `projects` | vitest 4 removed `environmentMatchGlobs` | Verified: the docblock IS honoured under this repo's single root config |
| Tailwind v3 PostCSS plugin with inline config | (unchanged, deliberately) | Tailwind v4 removed the API | `@caido/tailwindcss@0.1.0` hard-depends on `3.4.13`; v4 is not an upgrade path |

**Deprecated / outdated in this repo's context:**
- `eslint.config.js`'s `vue: false` and `compat: false` — both are annotated "Re-enable in Phase 5"
  [VERIFIED: eslint.config.js:12-23]. `compat: true` additionally requires a `browserslist` config,
  without which the plugin falls back to `op_mini all` and reports `Promise` and `URL` unsupported.

---

## Runtime State Inventory

Not applicable — Phase 5 is additive (a new frontend package, new tables, new RPC endpoints) and
renames nothing. **Two forward-looking notes recorded rather than omitted:**

- **Stored data:** Findings written by `sdk.findings.create` live in **Caido's** project database,
  not DefMiner's, and are unreachable by any DefMiner migration. Any change to the D-01 recipe is
  therefore not a migration problem, it is an unfixable one — which is what makes D-01 one-way.
- **Live service config:** none. DefMiner registers no external service state.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + pnpm | build, tests | ✓ | pnpm `^11.22.0` required by `devEngines` | none — `npm` is rejected outright (`EBADDEVENGINES`, reproduced this session) |
| `vitest` | all gates | ✓ | 4.1.11 | — |
| `playwright` | 10,000-row backstop | ✓ | 1.62.1, already a devDependency | — |
| `sqlite3` CLI | query-plan verification on the target version | ✓ locally at 3.51.0 | **target is 3.46.0** | Re-verify the plans on 3.46 as a Wave-0 task |
| `jsdom` | any component test | ✗ | — | `happy-dom`, but its grapheme/bidi handling is weaker and that is exactly what R2's fixture asserts |
| `@vue/test-utils` | component mounting | ✗ | — | none — hand-mounting a Vue app in jsdom is a worse version of the same thing |
| `caido-dev` | frontend build | ✓ | `@caido-community/dev@0.1.7` | — |
| A running Caido instance | UAT of `addPage` / `findings.create` | not checked | — | none — the SDK surfaces cannot be exercised outside Caido |

**Missing with no fallback:** none blocking.
**Missing with fallback:** `jsdom` and `@vue/test-utils` — both are ordinary installs, listed here
because the phase cannot assert R1/R2 without them.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest@4.1.11`, single root config, `environment: "node"` |
| Config file | `vitest.config.ts` — include globs `tests/**/*.spec.ts`, `packages/*/src/**/*.spec.ts`, `scripts/ci/**/*.spec.ts` |
| Quick run command | `pnpm vitest run <path> --reporter=dot` — **bypasses `pretest`**, which runs `caido-dev build packages` and is far too slow for a per-task loop |
| Full suite command | `pnpm test` (`pretest` builds the backend bundle, then `vitest run --reporter=dot`) |
| Additional gates | `pnpm typecheck` (`tsc --build`), `pnpm lint`, `pnpm knip`, `pnpm check:bundle` |

**The DOM environment question is resolved and does not need `projects`.** `vitest.config.ts`
records decision P2-D4: "NO `projects` or `workspace` key, and no per-package vitest config",
because five files resolve the Phase 0 results directory from a bare relative literal. `vitest@4`
removed `environmentMatchGlobs`. The per-file docblock survives both constraints, and was
**verified by execution** this session: a spec headed `// @vitest-environment jsdom` produced
`Cannot find package 'jsdom'` — i.e. the docblock was read and the environment resolution attempted.
Frontend component specs therefore carry the docblock; nothing else changes.

The frontend glob `packages/*/src/**/*.spec.ts` already matches `packages/frontend/src/**` — no
config change is needed to pick up frontend specs. `.vue` SFC imports will need
`@vitejs/plugin-vue` registered in the vitest config's `plugins`, which is a `plugins` addition, not
a `projects` one.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-02 | Keyset cursor returns a correct, non-overlapping next page across a tie block | unit (SQLite fixture) | `pnpm vitest run packages/backend/src/store/reads.spec.ts` | ❌ Wave 0 |
| UI-02 | Every read statement passes the SQL gate | static gate (existing) | `pnpm vitest run packages/backend/src/store/sql-discipline.spec.ts` | ✅ exists |
| UI-02 | Deep page costs O(page), not O(offset) — asserted as a bounded row-scan count | unit | `pnpm vitest run packages/backend/src/store/reads.spec.ts -t "deep page"` | ❌ Wave 0 |
| UI-02 | 10,000 rows scroll with a bounded in-memory window and no dropped frames | e2e (playwright) | `pnpm vitest run tests/frontend-load.spec.ts` | ❌ Wave 0 (backstop) |
| UI-07 | ≥20 events in 1 s produce ≤2 UI reactions; none while a row is selected | unit (fake timers) | `pnpm vitest run packages/frontend/src/stores/coalescer.spec.ts` | ❌ Wave 0 |
| UI-09 | A `partial` artifact renders the floor banner and the per-row badge | component (jsdom) | `pnpm vitest run packages/frontend/src/components/FindingsTable.spec.ts` | ❌ Wave 0 |
| UISEC-01 | The hostile fixture (HTML, `<script>`, CSV formula, C0, bidi) renders inert in table, panel, suppressions list and projection preview | component (jsdom) | `pnpm vitest run packages/frontend/src/safety/hostile.spec.ts` | ❌ Wave 0 (backstop) |
| UISEC-01 | No `v-html`/`innerHTML`/`eval`/`new Function` anywhere in the frontend | **static AST gate** | `pnpm vitest run packages/frontend/src/frontend-safety.spec.ts` | ❌ Wave 0 |
| UISEC-02 | Every leading `=`,`+`,`-`,`@`,TAB,CR field is apostrophe-prefixed **then** quoted | unit | `pnpm vitest run packages/engine/src/csv.spec.ts` | ❌ Wave 0 |
| UISEC-03 | 4 MB single-line, embedded newlines, 4-byte grapheme — truncated, no split, no freeze | unit + component | `pnpm vitest run packages/engine/src/sanitise.spec.ts` | ❌ Wave 0 |
| UI-06 | Redacted is the pre-selected default; raw requires the second choice **and** the danger dialog | component | `pnpm vitest run packages/frontend/src/components/ExportDialog.spec.ts` | ❌ Wave 0 |
| OPS-01 | Triage write is one statement, idempotent, and survives replay | unit (SQLite fixture) | `pnpm vitest run packages/backend/src/store/triage.spec.ts` | ❌ Wave 0 |
| OPS-02 | A suppression rule hides matching rows on the next read and removal restores them | unit | `pnpm vitest run packages/backend/src/store/suppressions.spec.ts` | ❌ Wave 0 |
| OPS-02 | The bounded candidate window caps scanned rows regardless of suppression selectivity | unit | `pnpm vitest run packages/backend/src/store/suppressions.spec.ts -t "bounded"` | ❌ Wave 0 |
| OPS-03 | Retry re-claims a `failed`/`partial` analysis and moves it out of that state | unit | `pnpm vitest run packages/backend/src/store/retry.spec.ts` | ❌ Wave 0 |
| OPS-04 | Triage survives a `detector_set_hash` change | unit | `pnpm vitest run packages/backend/src/store/triage.spec.ts -t "corpus bump"` | ❌ Wave 0 |
| STORE-08 | `audit` is in `EXPECTED_TABLES`, every column on the allowlist, no forbidden column | static gate (existing, extended) | `pnpm vitest run packages/backend/src/store/schema.spec.ts` | ✅ exists — extend |
| FIND-01 | `dedupeKey` is exactly `fingerprint:detectorId:host`, and excludes digest and corpus hash | unit | `pnpm vitest run packages/backend/src/findings/project.spec.ts` | ❌ Wave 0 |
| FIND-01 | A row whose observations all fail to resolve is `unprojectable`, not dropped; the batch proceeds | unit (fake SDK) | same file, `-t "unprojectable"` | ❌ Wave 0 |
| FIND-01 | A `create` that throws fails that row only | unit | same file, `-t "throws"` | ❌ Wave 0 |
| FIND-02 | Entropy-only and hint-grade results are **absent** from the preview, and counted | unit | same file, `-t "excluded"` | ❌ Wave 0 — **blocked on Phase 3/4 tiers** |
| — | The built CSS contains no rule outside `#plugin--defminer` | build-output gate | `pnpm vitest run scripts/ci/prefixwrap.spec.ts` | ❌ Wave 0 |
| — | The frontend bundle does not contain Vue (externals honoured) | build-output gate | `pnpm vitest run scripts/ci/frontend-externals.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm vitest run <the two or three spec files the task touches> --reporter=dot`
  plus `pnpm typecheck`. Never `pnpm test` — `pretest` runs a full `caido-dev build`.
- **Per wave merge:** `pnpm test && pnpm lint && pnpm typecheck && pnpm knip && pnpm check:bundle`.
- **Phase gate:** the full set above green, plus the three backstop rows carrying **explicit
  executed evidence** (10,000-row load, hostile-content fixture, long-text adversarial fixture) —
  `05-UI-SPEC.md` marks them `🧪 backstop`, which means no evidence resolves to `human_needed`, not
  to a silent pass.

### Wave 0 Gaps

- [ ] **Widen `sql-discipline.spec.ts` before the first Phase 5 query is written** — cover
      `WITH`/CTE, `INSERT … SELECT`, unscoped subqueries and `UNION` arms, and fragment
      composition. Each new rule's failing path executed against the probe fixtures recorded in
      `## O-01`, per the file's own "a gate whose failure path has never run is a gate nobody has
      tested."
- [ ] `packages/frontend/` workspace, `vite.config.ts`, `packages/caido.config.ts` frontend entry
- [ ] `jsdom` + `@vue/test-utils` installed; `@vitejs/plugin-vue` added to the vitest config's `plugins`
- [ ] `packages/frontend/src/frontend-safety.spec.ts` — the AST gate for R1 (stronger than lint)
- [ ] `eslint.config.js`: `vue: true`, `vue/no-v-html: "error"`, `no-eval`, `no-new-func`,
      `no-implied-eval`, `no-script-url`, `linterOptions.noInlineConfig` on frontend files, and
      a `browserslist` if `compat` is re-enabled
- [ ] `packages/engine/src/sanitise.ts` + `csv.ts` + their specs (SDK-free, so they run under plain
      vitest with no Caido and no DOM)
- [ ] The hostile-content fixture, shared by four surfaces (table, panel, suppressions list,
      projection preview) — one fixture, four assertions, per the UI-SPEC's backstop rows
- [ ] `schema.spec.ts`: extend `EXPECTED_TABLES` and `COLUMN_ALLOWLIST` for `audit` (and
      `suppressions`, if separate)
- [ ] Re-verify the `## O-01` query plans on **SQLite 3.46.0**, not 3.51.0

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface; Caido owns the session |
| V3 Session Management | no | Same |
| V4 Access Control | **yes** | Project isolation. Every read `project_id`-scoped in its `WHERE` (gate-enforced); every write re-checks the project epoch. The `unscoped-multi-row` rule is the mechanical control |
| V5 Input Validation | **yes — the whole phase** | Every rendered string is target-controlled. R1/R2 pipeline; the strict host allowlist in O-04 F-1; positional `?` binding with zero string-built SQL |
| V6 Cryptography | **yes** | HMAC fingerprints (SEC-04, Phase 4); `crypto.randomUUID` for audit keys. **Never hand-rolled** — the native `crypto` module is on the DIST-05 allowlist |
| V7 Error Handling & Logging | **yes** | `describeError` redacts URL-shaped substrings **before** truncating; `audit` is the operator-facing log and must carry no target bytes |
| V12 Files & Resources | **yes** | D-04: no server file is written, which removes the category's largest surface. R5 still governs any path the Settings surface displays |
| V14 Configuration | **yes** | `postcss-prefixwrap` (CSS containment); rollup `external` list (no duplicate Vue); exact pins |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via an extracted string rendered as markup | Tampering / Elevation | R1: `v-html` banned at `error` with no inline disable, plus an AST gate. Highlighting by slicing, never by markup |
| CSV / spreadsheet formula injection in an export | Tampering | Apostrophe prefix **then** quote-wrap, in that order (R3) |
| Bidi/homoglyph spoofing of a hostname in the triage column | Spoofing | Strip `U+202A`–`U+202E` and `U+2066`–`U+2069`; mandatory `font-mono` on every target-controlled string; ENC-03 IDNA normalisation |
| Secret leaked into a tooltip, `title`, or `data-*` | Information Disclosure | R2: no target-controlled content in tooltips or attributes, ever. "Copy full value" reads from the store to the clipboard, never into the DOM |
| Secret leaked into an immutable Caido Finding | Information Disclosure — **permanent** | O-04 F-1/F-2: redacted preview only, 256-char cap, strict host allowlist, unprojectable rather than sanitised-into-shape |
| Cross-project read (one DB for all projects) | Information Disclosure | `project_id` in the predicate of every multi-row statement, enforced statically |
| SQL injection through a filter or sort parameter | Tampering | No string-built SQL at all — the O-01 fixed matrix means sort and filter select *between* literals, never *into* one |
| Denial of service against the single QuickJS thread via a filter | DoS | The bounded candidate window: 4,000,023 → 15,527 VM steps measured. Without it, a filter matching nothing walks the whole project partition |
| Renderer freeze from a multi-megabyte single-line string | DoS | Backend truncation at the source, frontend truncation as defence in depth, `white-space: pre` + fixed 32 px rows so no cell can wrap |
| Style bleed into Caido or another plugin | Tampering | `postcss-prefixwrap`, asserted on the **build output** |
| Listener leak across project switches | DoS (self) | `onEvent` returns `{ stop }`; stop on unmount |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Triage keys on `(project_id, fingerprint, detector_id, host)` — the same grain as D-01's `dedupeKey` | O-03 | The key is one-way in the same sense D-01 is. A later change discards every triage decision, which is exactly what OPS-04 forbids. **Needs operator confirmation before it is locked** |
| A2 | Suppression scope is `this value / this pattern / this host` and the rule set stays small enough for a `NOT EXISTS` probe per candidate row | O-03 | The UI-SPEC names those three scopes; no requirement bounds the rule count. The bounded candidate window makes the cost selectivity-independent, so the risk is bounded, but the suppressions-list virtualisation question (`⚠ unresolved` in the UI-SPEC) stays open |
| A3 | The Phase 5 projectable set is limited to detectors that declare a checksum, so DET-02's rule schema must carry a checksum capability | O-06 | If Phase 3 ships without it, Phase 5's projection surface is provably empty and FIND-01 cannot be demonstrated. This is a cross-phase dependency, not a Phase 5 defect |
| A4 | O-04's strict host allowlist `^[a-z0-9.-]{1,253}$` is the right boundary | O-04 | Too strict rejects legitimate punycode-normalised hosts as unprojectable; too loose readmits target bytes into an immutable field. Should be exercised against Phase 4's ENC-03 output before it is fixed |
| A5 | The SQLite query plans measured on 3.51.0 hold on Caido's 3.46.0 | O-01 | The *ratios* are structural (a non-sargable predicate cannot become sargable), but a specific plan could differ. Wave-0 re-verification task |
| A6 | `Intl` is absent from Caido's QuickJS globals, so grapheme segmentation is frontend-only | Architecture Map | Phase 0's `capabilities.json` lists 100 globals with no `Intl` entry, which is strong but is an absence argument. If wrong, the backend could segment too — a widening, not a break |
| A7 | The `too-new` legitimacy signal reflects last-publish date rather than package age | Package Legitimacy Audit | If it means something else, eleven packages including `vue` and `postcss` would warrant checkpoints. The reading is supported by `postcss` at 280M weekly downloads being flagged |
| A8 | `@vue/test-utils` + `jsdom` is sufficient to assert R1/R2 rendering inertness | Validation Architecture | If jsdom's parsing diverges from Caido's Electron renderer, the hostile-content fixture could pass in test and fail in the app. The playwright backstop is the mitigation |

---

## Open Questions (RESOLVED)

> All five were carried into planning and settled there. Each question below is kept as its
> original statement; the `— RESOLVED:` marker on each names where it was actually answered.

1. **The suppressions list's virtualisation bound.** — RESOLVED: plan `05-04`'s stated-bound
   assumption. The contract states a per-project rule bound as a **proposal** with its argument
   rather than omitting one, and plan `05-04` task 2 writes it into `05-ENTITY-CONTRACT.md` for the
   pass that builds the surface. Answered the way the UI-SPEC's `overflow / suppressions-list` row
   asked to be answered: a stated bound, not an omission.
   - What we know: `05-UI-SPEC.md` marks this `⚠ unresolved` and asks that if it is not virtualised,
     the reason be "a stated bound, not an omission".
   - What's unclear: nothing in REQUIREMENTS bounds the rule count.
   - Recommendation: state a bound (e.g. 200 rules per project, enforced at create time with a
     clear message) rather than virtualising. A rule set large enough to need `RecycleScroller` is a
     rule set the operator has lost track of, which is its own product problem.

2. **Whether `audit` is sweepable by the retention policy.** — RESOLVED: **D-06**, implemented by
   plan `05-06` task 3. The recommendation was accepted as an operator decision: `audit` is exempt
   from the retention age bound and keeps only a raised row bound, and D-06 requires the exception be
   visible in the sweep code rather than implicit — which is what `05-06`'s truth about the stated
   exception in `retention.ts` carries.
   - What we know: `sweepRetention` bounds every table by rows and age; defaults are 50,000 rows and
     90 days.
   - What's unclear: whether an audit trail that ages out is acceptable.
   - Recommendation: exempt `audit` from the age bound and keep only the row bound, with the row
     bound raised. Escalate — it is a policy call.

3. **Whether the export crosses the RPC as one string.** — RESOLVED: plan `05-02`'s Wave-0
   measurement plus plan `05-11`'s chunking fallback. `05-02` task 3 measures a synthetic 50,000-row
   export and derives `EXPORT_RPC_CHUNK_ROWS` from the measurement rather than assuming it, and
   proves chunk concatenation byte-identical to a single pass; `05-11` consumes that constant and
   emits the header on the first chunk only. Either measured outcome preserves D-04 exactly — still
   no server file.
   - What we know: D-04 says "the export size is bounded by the row count that crosses the RPC in
     memory". A 50,000-row CSV is single-digit megabytes of JS string held on the single QuickJS
     thread while it is serialised and marshalled.
   - What's unclear: whether the RPC has a payload ceiling. Not documented in the SDK typings.
   - Recommendation: measure it in Wave 0 against a synthetic 50,000-row export, and if it stalls,
     chunk the export across several RPC calls that the frontend concatenates before building the
     Blob. That preserves D-04 exactly — still no server file.

4. **UI-SPEC FLAG F1 — the evidence panel has no fixed frame for the score explanation.** —
   RESOLVED: plan `05-04` task 1. `EvidencePanelFrame` and `ScoreExplanation` in
   `packages/engine/src/contract.ts` declare which fields are mandatory, which are target-controlled
   and which carry monospace, and leave the signal vocabulary to Phase 3 plan `03-03` — exactly the
   split F1 asked for. Plan `05-10` builds the frame; the fields with no data source render an
   explicit not-yet-available line rather than an empty region.
   - What we know: UI-04 and success criterion 3 both require it; the panel contract does not name
     mandatory fields.
   - What's unclear: the signal vocabulary is Phase 3 plan 03-03's.
   - Recommendation: this is the same gap as O-02's 05-03 blocker. Phase 5 should specify the
     *frame* (which fields are mandatory, which are target-controlled, which carry `font-mono`) as
     part of the upward contract, and leave the vocabulary to Phase 3 — exactly as F1 asks.

5. **Three corrections to the approved `05-UI-SPEC.md` that this research produced.** — RESOLVED:
   **D-07** for the first, and plan `05-07`'s `{total}` definition for the second; the third was
   declined. D-07 amended the raw-export copy and the amendment is already applied. The `{total}`
   copy stays exactly as approved — the operator reviewed the objection and kept it — and the
   obligation CONTEXT.md left on the planner, to define what `{total}` counts, is discharged by
   `05-04`'s `VisibleTotal` type and `05-07`'s assumption: for the artifacts and observations tables
   there is no suppression mechanism, so the reachable count IS the count and the
   hidden-by-suppression line does not render. O-05 was decided against the recommendation:
   projection warns on `partial`/`failed`, it does not block.
   All three belong to the operator, not the planner:
   - The raw-export copy is wrong twice over — the D-04 "written to the Caido server" sentence
     already recorded in CONTEXT.md, **and** the promise of "{n} live secret values in cleartext"
     which URL query values cannot honour (pitfall P-06).
   - The `"{total} secrets exist on this target"` copy uses a word on
     `FORBIDDEN_COMPLETENESS_WORDS` and would count suppressed rows (O-03).
   - O-05 recommends blocking projection on `partial`/`failed`, where the UI-SPEC currently warns.

---

## Sources

### Primary (HIGH confidence) — read or executed this session

- `packages/backend/src/store/sql-discipline.spec.ts` — read in full; `auditSource` **executed**
  against 24 candidate statements
- `packages/backend/src/store/schema.spec.ts` — `EXPECTED_TABLES`, `COLUMN_ALLOWLIST`, `FORBIDDEN_COLUMNS`
- `packages/backend/src/store/migrations.ts` — the shipped v1/v2 schema and the `scan_state` CHECK
- `packages/backend/src/store/{artifacts,observations,settings,db}.ts` — read statements, redaction, pool notes
- `packages/backend/src/{index,telemetry}.ts` — RPC registration, `slimStatus`, `FORBIDDEN_COMPLETENESS_WORDS`
- `node_modules/.pnpm/@caido+quickjs-types@0.26.0/.../caido/findings.d.ts` — `FindingSpec`, `FindingsSDK`
- `node_modules/.pnpm/@caido+sdk-backend@0.57.1/.../typing.d.ts` — `SDK<API, Events>`, `APISDK`, `EventsSDK`
- `node_modules/.pnpm/@caido+sdk-shared@0.2.2/.../index.d.ts` — `DefinePluginPackageSpec`; `DefineAPI`/`DefineEvents` deprecated
- `@caido/sdk-frontend` `.../sdks/{navigation,sidebar,backend,findings,storage}.d.ts`
- `.planning/phases/00-runtime-reality-check/results/runs/20260820T121824Z-31596/raw/capabilities.json` —
  the measured QuickJS global and module surface on Caido 0.57.1
- **Executed measurements:** `sqlite3` 3.51.0 EQP + VM-step counts over a 200,000-row fixture;
  `eslint-plugin-vue@10.6.0` `flat/recommended` resolved in Node; `@eslint/js@9.17.0` recommended
  rule set; `// @vitest-environment jsdom` docblock honoured by `vitest@4.1.11`
- `gsd-tools query package-legitimacy check` — 17 packages, npm

### Secondary (MEDIUM confidence)

- `.planning/research/PITFALLS.md` P2/P3/P9, `.planning/research/STACK.md`,
  `.planning/research/CODEX-CONTRAST.md` §4.7–4.9 — project research, not independently re-verified
- `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` — the phase and requirement definitions

### Tertiary (LOW confidence)

- [sqlite.org/rowvalue.html](https://www.sqlite.org/rowvalue.html) — row values added in 3.15.0;
  "much more efficiently than OFFSET, assuming an appropriate index". States no explicit index rule
  and nothing about ASC/DESC restrictions
- [sqlite.org/optoverview.html](https://sqlite.org/optoverview.html) and the SQLite user forum —
  the planner may prefer a full scan when OR subterms are unselective. **Superseded here by direct
  measurement**

---

## Metadata

**Confidence breakdown:**

- **Standard stack: HIGH** — every pin is locked upstream by `05-UI-SPEC.md`/`STACK.md`/`DIST-06`,
  and this document only re-verified the SDK-facing claims (icon optionality, `addPage`'s
  `HTMLElement`, the deprecated `DefineAPI`) against the installed typings.
- **O-01 query discipline: HIGH** — both rejections are executed measurements, not arguments. The
  one caveat is the 3.51 vs 3.46 version gap, recorded as A5 and as a Wave-0 task.
- **O-02 buildability: HIGH for the per-plan verdicts** (they follow from tables that demonstrably
  do not exist), **and deliberately unresolved for the sequencing call**, which is escalated.
- **O-03 suppression and audit: MEDIUM-HIGH** — the mechanism and the measurements are solid; the
  triage identity key (A1) and the audit retention policy are operator calls.
- **O-04: MEDIUM** — the SDK facts are verified from source; the specific allowlist boundary is A4.
- **O-05: MEDIUM** — the recommendation is argued from the UI-SPEC's own internal inconsistency,
  which is strong, but it changes approved behaviour and belongs to the operator.
- **O-06: HIGH** — SEC-07's Phase 10 assignment is read directly from the traceability table, and
  the collapse of the disjunction follows from it mechanically.
- **Pitfalls: HIGH** — six of the ten are executed measurements against installed packages.

**Research date:** 2026-08-28
**Valid until:** 2026-09-27 for the SDK and stack facts (Caido ships frequently — re-verify the
Findings and navigation typings against the target Caido version at plan time). The SQL and gate
measurements do not expire; they expire when the gate or the schema changes.
