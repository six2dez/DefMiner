# Phase 6: Retroactive Scan & Deployment Reality - Research

**Researched:** 2026-08-31
**Domain:** Caido SDK request-history traversal (HTTPQL push-down, cursor pagination), SQLite forward migration under a static discipline gate, deployment-shape test harness, server-storage honesty
**Confidence:** HIGH on the SDK/codebase surfaces and on O-05; MEDIUM on O-03/O-06 (docs are authoritative but self-contradictory, fixtures still required); LOW/NOT-MEASURED on O-04 and O-07 (both have a named, cheap probe)

---

## Summary

`06-CONTEXT.md` locks 26 decisions and leaves seven open questions. This document settles five of the
seven from evidence, reports one as not-measured-with-a-named-probe (O-04), and gives O-07 a
shipped-instrument answer that needs one run rather than new code. It also reports **four material
corrections to premises the phase is standing on**, each of which changes what a plan can say.

**Five things the planner must absorb before writing 06-01:**

1. **The desktop app on this machine is Caido 0.58.2, not 0.57.1.** Every Phase 0 threshold was
   measured on 0.57.1 and every Phase 1 tripwire pins that string. The tripwires do not fail today
   because they read committed JSON artifacts, not the live binary — they fail the moment anyone
   re-measures. D-21's separate version constant is therefore not merely prudent; it is the only way
   this phase can record a measurement at all, and its value is **0.58.2**.
2. **The shipped schema is at step v4, not v3.** `scans` is step **v5**. `EXPECTED_TABLES` is asserted
   exactly and `COLUMN_ALLOWLIST` names every column of every table; both grow, and `FORBIDDEN_COLUMNS`
   bans the column name `id` outright — so the `scans` identifier column must be `scan_id`,
   caller-minted, exactly as `audit.event_id` is.
3. **`sweepRetention`'s return does NOT distinguish an age-bound delete from a row-cap delete.** D-08
   assumes it does. Both victim sets are pushed into one `victims` array and counted into one
   `deleted`. D-08 is implementable, but it requires a new field on a return shape whose own comment
   says "FIXED SHAPE".
4. **The 01-09 rule family is not eslint.** It is `packages/backend/src/outbound-prohibition.spec.ts`
   — a 11,753-line pure-`auditSource` AST gate with a `RULES` record, per-rule firing and legal
   fixtures, and a `RESOLVER_REGISTRY` of executed probes and counter-probes. D-18 joins *that*,
   not `eslint.config.js`, which holds only two project rules and neither is outbound-shaped.
5. **D-19's core sentence is already shipped.** `settings-contract.ts:239` exports `STORAGE_NOTE`,
   rendered unconditionally, saying exactly what D-19 asks. What Phase 6 adds is D-25's counts and
   (subject to O-02) a persistence sentence — and what it *removes* is the path machinery, which
   knip will then flag.

**Primary recommendation:** Write 06-01 against a **re-derivable position (`row.id` boundary), not the
opaque `Cursor`** — the migration is one-way and O-04 cannot be settled from documentation. Compose the
HTTPQL filter as `(defminer-kind) AND (row.id.lt:N) AND (operator)` with DefMiner's clauses **first**
and the operator's **last**, every clause parenthesised, because Caido's own documentation contradicts
itself on AND/OR precedence and because a trailing HTTPQL comment in the operator's clause then fails
closed at `execute()` instead of commenting DefMiner's narrowing away.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Copied from `06-CONTEXT.md` `<decisions> ## Implementation Decisions`. Twenty-six decisions, locked.

- **D-01: The scan is a backpressured producer into the SAME `BoundedQueue` and the SAME consumer.** It pages only while queue depth is below a watermark; the hook offers unconditionally, so live browsing always wins. No second analysis path, no duplicated admit/digest/store logic. The watermark is a number the planner must pick and defend, not inherit. Rejected: an unthrottled producer — the queue drops oldest at cap, so a backfill provably discards live entries the hook just admitted.
- **D-02: Retro admissions and rejections are counted separately from live ones, over the SAME closed `REJECT_REASONS` vocabulary.** One counters object with two sub-maps — `telemetry.ts` remains the only place counters live, because `telemetry.spec.ts` scans the package AST and fails on a second counters object anywhere. A 40,000-request backfill must not make OBS-01's drop count and reject reasons stop describing live proxying. — *Reversibility: costly.*
- **D-03: Before offering, the scan skips request ids already carried to a terminal `done` analysis, and RE-OFFERS anything `partial` or `failed`.** One bounded read per page instead of thousands of megabyte reloads through `sdk.requests.get`, and the scan repairs earlier failures rather than cementing them. `partial`/`failed` is exactly the pair `store/retry.ts` already treats as movable.
- **D-04: A running scan SUSPENDS when the project epoch changes, keeps its cursor, and resumes only on explicit operator action.** Nothing is written under a stale epoch and nothing silently restarts.
- **D-05: The pushed-down filter is DefMiner's own asset predicate AND an optional operator HTTPQL clause.** The operator may narrow, never widen. — *Reversibility: costly. Open: see O-06.*
- **D-06: DefMiner's push-down clause is narrow, and a fixture suite proves it is a SUPERSET of `admit()`'s kind axis.** A disagreement between HTTPQL's matching semantics and `admit.ts`'s `indexOf`/`endsWith` classification must be a red test, never a silently missed bundle. **Open: see O-03.**
- **D-07: Caido's scope engine is applied to every retroactive scan, with no override.** Intended consequence, state it in the UI: traffic captured while a host was in scope becomes unscannable once that host leaves scope. — *Reversibility: costly.*
- **D-08: When a scan starts evicting its own results under the retention cap, it suspends at its cursor and says so.** Copy states the cause and the two remedies (raise the cap, narrow the filter); the cursor still resumes. — *Reversibility: costly.*
- **D-09: Scan state lives in a new project-scoped `scans` table**, added by a forward migration step: filter, cursor position, counters, state, epoch. `EXPECTED_TABLES` grows from five to six. Every statement must pass the SQL discipline gate. — *Reversibility: one-way.*
- **D-10: Cancel means PAUSE. Discarding a scan is a separate, explicit action.**
- **D-11: `init()` moves any `running` scan row to suspended, with a reason, and never auto-resumes.** Phase 6 therefore ships a slice of a Phase 2 requirement (ERR-02); the plan must say so out loud.
- **D-12: The backfill walks DESCENDING — newest first, back into history.** — *Reversibility: costly; a stored cursor is direction-specific.*
- **D-13: A fifth `Scan` tab owns the filter form, scan history and per-scan detail; a compact live indicator in the existing 48px toolbar shows a running scan from every tab.**
- **D-14: Progress is absolute counters plus the current position's TIMESTAMP. No percentage.** Rejected: a counting pass first, and a percentage against an operator-supplied guess.
- **D-15: Progress rides the existing UI-07 coalescer as a new category.** The never-re-order-while-a-row-is-selected rule does NOT apply to a progress strip, so scan updates land immediately rather than accruing into the pill. — *Reversibility: costly.*
- **D-16: A scan writes to `audit` ONLY when it destroys something** — suspended by retention self-eviction (D-08), and discard (D-10). — *Reversibility: one-way; `audit.kind` is a closed CHECK.*
- **D-17: Phase 5's D-04 is extended project-wide. The chunked RPC download is the ONLY path by which anything DefMiner produces reaches the operator. Nothing is ever written to server disk. `sdk.hostedFile` is explicitly DECLINED.** — *Reversibility: one-way. **This decision's viability rests on O-01 and the planner must not treat O-01 as settled.***
- **D-18: The ban is enforced by a new eslint rule in the plan 01-09 family**, beside `outbound-send` / `outbound-net` / `outbound-fetch` / `outbound-import`: every specifier form of `llrt/fs` and `node:fs`, plus any `sdk.hostedFile` member access — each with a firing fixture AND a legal fixture. `sdk.meta.path()` stays legal. — *Reversibility: costly.*
- **D-19: The Settings surface NEVER shows a path.** It states where the data lives and whether it survives a restart. **Open: O-02.**
- **D-20: One scripted harness per shape, on Phase 0's result-artifact pattern.** Fresh instance launched through the ABSOLUTE app path, reported version asserted before anything is recorded, plugin installed, fixed assertion set run, schema-validated JSON result written. Docker shapes pull an image in the script. — *Reversibility: costly.*
- **D-21: The matrix declares and asserts its OWN pinned version constant, separate from Phase 1's `EXPECTED_CAIDO_VERSION = "0.57.1"`.** **Open: see O-05.**
- **D-22: Each leg asserts four things:** plugin installs and `init()` reports compatible on `caido-cli` as well as the desktop app; migrations run and `EXPECTED_TABLES` is present; one proxied JS response produces an artifact and an observation; and after a restart the data is present — **except on Docker-without-a-volume, where it must be ABSENT and the plugin must come back clean on an empty database rather than erroring.**
- **D-23: An unreachable leg is recorded NOT RUN with the reason, never as a pass, and the phase can still complete.**
- **D-24: DEPLOY-04 is satisfied by construction, and a gate keeps it true.** There is no BLOB column and no body storage anywhere. What ships is the proof: D-18's lint ban plus a schema test asserting no column may hold artifact content. — *Reversibility: costly; D-17's corollary.*
- **D-25: The workspace reports row counts against their retention caps, beside the D-19 statement.** Uses `countArtifacts` / `countObservations` / `countAnalyses` as already shipped. Rejected: bytes via `PRAGMA page_count`.
- **D-26: The SUSPENDED STATE is exempt from the retention age bound — not the `scans` table.** The exception must be visible in the sweep code. The row cap still bounds growth. — *Reversibility: costly.*

### Claude's Discretion

> The operator took every question. Nothing was delegated. Where a decision above names an open
> question (O-01 … O-07), the researcher settles it from evidence and the planner escalates rather
> than inventing an answer — it is not discretion.

### Deferred Ideas (OUT OF SCOPE)

- **More than one scan per project, or a queue of scans.** The decisions assume one at a time and the planner should make that an explicit invariant rather than an accident.
- **A durable long-term record of every filter ever run against a project.** Declined under D-16.
- **Database size in bytes on the Health surface** (`PRAGMA page_count` × `page_size`). Declined under D-25. Revisit if Phase 7 ever stores content — and note that O-01 is exactly that question.
- **Server-disk quota and orphan-cleanup machinery.** Declined under D-24. If O-01 forces D-17 to be re-opened, this comes back with it — as a set, not piecemeal.
- **Removing the eight now-redundant `@internal` JSDoc tags** (D-05-07-01). Not a Phase 6 obligation; could land here if a plan has room.

### Carried Forward — locked upstream, do not re-open

- **D-04 (Phase 5):** exports are a browser download over the RPC; no server-side file is written. D-17 extends this rather than revisiting it.
- **D-06 (Phase 5):** `audit` is exempt from the retention age bound, keeps a raised row bound, and the exception is visible in the sweep code.
- **D-05 (Phase 5):** `entities` and `evidence` do not exist. Phase 6 must not assume any entity-class table.
- The operator's stated preference across every Phase 5 decision was **the option that minimises permanent, unrecoverable state**.
- QuickJS is single-threaded; CPU-bound work is strictly serial. Never run two analyses "in parallel".
- Every write is `project_id`-scoped and re-checks the project epoch; `describeError` redacts URL-shaped substrings **before** truncating on anything crossing the RPC.
- Single-statement idempotent writes only. `last_insert_rowid()` is unusable on the pooled connection.
- No raw secret value is ever persisted.
- No regular expression in the admission path.
- Caido 0.57.1 is UNOBTAINABLE from api.caido.io; `~/.caido/caido-cli` on `PATH` is a stale 0.55.3. Every script uses the absolute app path and asserts the reported version before recording anything.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIND-03 | Retroactive scanning of already-captured traffic via `sdk.requests.query()` with HTTPQL push-down, page size 20, and a resumable cursor. *(No `includeRaw(false)`, so the documented 1000 page size is not usable.)* | § "The `sdk.requests` surface, verbatim" confirms no `includeRaw` anywhere and that `RequestsConnectionItem` carries the full `Response`; § "O-03" gives the push-down clause and its superset obligations; § "O-04" gives a **re-derivable** resume position that does not depend on cursor lifetime |
| FIND-04 | Retroactive scans report progress and are cancellable. | § "O-04" (resume boundary), § "D-14's timestamp source" (`Request.getCreatedAt()` — **not** the stored `observed_at`, which is wall-clock-now), § "D-15 and the coalescer's triage lock" (the concrete branch that must change) |
| DEPLOY-01 | Tested against local desktop, remote CLI, and Docker deployments both with and without a persistent volume. | § "The deployment harness substrate" — what `instance.sh` gives for free, what the Docker legs need, measured image config, and the honest limit of the "remote CLI" leg on one machine |
| DEPLOY-02 | Server-side storage is labelled as such in the UI and never presented as a path on the operator's machine. | § "O-02" (what the SDK can and cannot learn), § "D-19 is mostly already shipped" (`STORAGE_NOTE`, and the knip consequence of removing the path machinery) |
| DEPLOY-03 | Operator-facing artifacts delivered via `sdk.hostedFile` **or a bounded authenticated frontend download**, with expiry and redaction rules. | § "`HostedFileSDK` verification" — premise confirmed against the **current** SDK (0.26.0 is latest on npm): `getAll()` and `create()` only, no delete, no expiry |
| DEPLOY-04 | Server disk is treated as shared instance storage with quotas and orphan cleanup; no assumption of host shell access. | § "D-24's gate, concretely" — the existing `FORBIDDEN_COLUMNS` name-based check plus the one-line declared-type check `PRAGMA table_info` already makes possible |
| ERR-02 *(slice, per D-11)* | Jobs in flight when the process died are detected on startup and either resumed or explicitly abandoned, never left permanently `running`. | § "The `scans` table, concretely" — the `init()` sweep statement and why it is one statement |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Retroactive traffic traversal (`query`/`filter`/`first`/`execute`) | Caido server (via backend plugin) | — | `sdk.requests` exists only in the backend QuickJS runtime. The frontend SDK has no equivalent. |
| Admission decision on a retro item | Backend (`hooks/admit.ts`, unchanged) | — | D-01/D-03 reuse it. The only difference is counter attribution (D-02). |
| Analysis of a retro item | Backend consumer (`ingest/consumer.ts`, unchanged) | — | One queue, one consumer, one thread. |
| Scan state durability | Backend SQLite (`sdk.meta.db()`) | — | Server-side, project-scoped, survives restart. Not the frontend's. |
| Scan lifecycle control (start/pause/resume/discard) | Backend RPC (`sdk.api.register`) | Frontend Scan tab | The frontend issues intent; every state transition is a single project-scoped statement on the backend. |
| Progress readout | Backend event → frontend coalescer | Frontend Scan tab + toolbar indicator | Summary only. The event channel already exists (`INVALIDATION_EVENT`). |
| Storage-location honesty (D-19) | Frontend Settings copy | Backend row counts (D-25) | The *statement* is DefMiner-authored copy; the *counts* come from already-shipped backend reads. |
| Deployment-shape testing | Host shell scripts (outside the plugin) | — | Nothing inside QuickJS can observe a container boundary (see O-02). It is an external-harness question. |
| Filesystem prohibition (D-18) | Repo static gate (vitest AST walk) | CI | Source-level, like `outbound-prohibition.spec.ts` and `sql-discipline.spec.ts`. |

**One tier assignment worth naming explicitly:** D-19's persistence sentence is *not* a backend
capability. § O-02 shows the backend cannot detect a missing volume. The only empirical persistence
signal available is self-observed, after the fact — which is a backend *store* capability, not a
runtime-introspection one.

---

## The `sdk.requests` surface, verbatim

Source of truth read this session:
`node_modules/.pnpm/@caido+quickjs-types@0.26.0/node_modules/@caido/quickjs-types/src/caido/requests.d.ts`
and `.../src/caido/shared.d.ts`.

### `Cursor` is a branded string

```ts
// shared.d.ts:14-15  (verbatim)
export type Cursor = string & { __cursor?: never };
```

`[VERIFIED: node_modules/.pnpm/@caido+quickjs-types@0.26.0/node_modules/@caido/quickjs-types/src/caido/shared.d.ts:9-15]`
An opaque *string*, so it is trivially persistable as a `TEXT` column. Its **lifetime** is a
different question — see O-04.

### `PageInfo` carries no total

```ts
// requests.d.ts:542-547  (verbatim)
export type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: Cursor;
  endCursor: Cursor;
};
```

`[VERIFIED: .../requests.d.ts:542-547]` **There is no `totalCount`.** D-14's refusal of a percentage
is not merely a design preference — the SDK does not expose the denominator, and computing one costs
the same full-body transfer the scan itself does. The `first()`/`last()` argument is the only bound.

### `RequestsConnectionItem` carries the full `Response`

```ts
// requests.d.ts:572-589  (verbatim)
export type RequestsConnectionItem = {
  cursor: Cursor;
  request: Request;
  response?: Response;
};

export type RequestsConnection = {
  pageInfo: PageInfo;
  items: Array<RequestsConnectionItem>;
};
```

`[VERIFIED: .../requests.d.ts:572-589]` Each item carries **its own cursor**, so resumption can use
`items[items.length - 1].cursor` as well as `pageInfo.endCursor`. And `response` is the full
`Response` object — `getBody(): Body | undefined`, `getRaw(): ResponseRaw` — so **the page transfer
does include the bodies**. This is exactly why page size must be 20: there is no way to ask for
metadata only.

### `RequestsQuery` — every method, and no `includeRaw`

```ts
// requests.d.ts:597-640  (method names, verbatim)
after(cursor: Cursor): RequestsQuery;
before(cursor: Cursor): RequestsQuery;
first(n: number): RequestsQuery;
last(n: number): RequestsQuery;
filter(filter: string): RequestsQuery;
ascending(target: "req", field: RequestOrderField): RequestsQuery;
ascending(target: "resp", field: ResponseOrderField): RequestsQuery;
descending(target: "req", field: RequestOrderField): RequestsQuery;
descending(target: "resp", field: ResponseOrderField): RequestsQuery;
execute(): Promise<RequestsConnection>;
```

**CONTEXT.md's claim is confirmed:** `grep -n includeRaw` over the whole `@caido/quickjs-types@0.26.0`
tree returns nothing. `[VERIFIED: .../requests.d.ts:597-640 — the full method list above is the
complete member set of the type]`

`execute()`'s own JSDoc: `@throws {Error} If a query parameter is invalid or the query cannot be
executed.` `[CITED: .../requests.d.ts:635-639]` — this is the fail-closed behaviour O-06 depends on.

### Order fields

```ts
// requests.d.ts:553-566  (verbatim)
export type RequestOrderField =
  | "ext"
  | "host"
  | "id"
  | "method"
  | "path"
  | "query"
  | "created_at"
  | "source";
export type ResponseOrderField = "length" | "roundtrip" | "code";
```

`[VERIFIED: .../requests.d.ts:553-566]` **`"id"` and `"created_at"` are both orderable request
fields.** That is what makes O-04's re-derivable position possible.

### `RequestsSDK` — and the in-process HTTPQL oracle nobody has used yet

```ts
// requests.d.ts:752-825  (member signatures, verbatim)
query(): RequestsQuery;
matches(filter: string, request: Request, response?: Response): boolean;
get(id: ID): Promise<RequestResponseOpt | undefined>;
send(request: RequestSpec | RequestSpecRaw, options?: RequestSendOptions): Promise<RequestSendPayload>;
inScope(request: Request | RequestSpec, scopes?: Array<Scope> | Array<ID>): boolean;
```

`[VERIFIED: .../requests.d.ts:752-825]`

**`sdk.requests.matches()` is the most important thing in this section and it is not mentioned
anywhere in `06-CONTEXT.md`.** It is a *synchronous, in-process* HTTPQL evaluator over a
`(Request, Response)` pair. It gives D-06's superset proof a mechanism that does not require
replaying traffic through the proxy per case: capture N fixtures **once**, then for each stored pair
assert `admit(sdk, req, resp).ok === true ⟹ matches(PUSHDOWN_CLAUSE, req, resp) === true`. It also
gives D-05 a cheap runtime belt (re-evaluate DefMiner's own clause on every returned item),
though — see O-06 — that belt is not what makes the composition safe.

### `Body.length` is the same class on both paths

```ts
// requests.d.ts:8-29  (verbatim, abridged to the relevant members)
export class Body {
  toText(): string;
  toJson(): unknown;
  toRaw(): Uint8Array;
  /**
   * The length of the body in bytes.
   */
  readonly length: number;
}
```

`[VERIFIED: .../requests.d.ts:8-29]` One `Body` class, used by both the hook's `Response` and the
stored `Response`. The *type* is identical on both paths; whether the *value* is identical is O-07.

---

## The seven open questions

### O-01 — Can Phase 7's reconstructed source live in SQLite within QuickJS's memory?

**Answer: the memory question does not discriminate between the two designs, so D-17 does not need
re-opening on O-01's grounds. But the argument is reasoned, not measured, and it names the one thing
that would measure it.**

`CODEX-CONTRAST.md` §471 states the counter-case verbatim:

> "Large reconstructed source content belongs in content-addressed files under `sdk.meta.path()`, not
> SQLite. The database stores digest, byte count, safe relative path, and provenance. Writes use a
> generated temporary file and atomic rename where the Caido filesystem implementation supports it;
> startup garbage collection reconciles orphan temp files and unreferenced blobs."

`[VERIFIED: .planning/research/CODEX-CONTRAST.md:471 — quoted in full above]`

Three findings weigh against it:

1. **The dominating memory cost is shared by both designs.** `ROADMAP.md` Phase 7 SC1 requires:
   *"Sources are reconstructed from `sourcesContent` via `JSON.parse` with no VLQ decoding on the
   primary path"* `[VERIFIED: .planning/ROADMAP.md § "Phase 7: Sourcemap Reconstruction", SC1]`.
   `JSON.parse` of the whole map materialises every `sourcesContent` entry in QuickJS memory before
   *either* a SQLite bind or an `fs.write` can happen. Files do not avoid the peak; they only change
   where the bytes go afterwards, and SQLite does not retain them in JS memory either. §471 was
   written before this constraint was settled, and it says so itself — CONTEXT.md notes it was
   "written before the delivery problem was understood".
2. **The storage unit, not the storage medium, is the lever.** A sourcemap's `sources[]` is an array
   of individual files. Content-addressing **per reconstructed source file** rather than per map
   makes every stored row a normal-sized TEXT value (typically 1–200 KB), which is unremarkable for
   SQLite and needs no incremental-BLOB I/O — which the plugin API does not expose in any case
   (`sqlite`'s `Statement` surface is `all` / `get` / `run` only, per
   `packages/backend/test/fixtures/sqlite-fixture.ts:69-89`). §471's own model already stores
   per-source rows; it just puts the content in a file beside them.
3. **§471's file design requires machinery D-17 makes impossible and DEPLOY-04 asked for anyway** —
   "temporary file and atomic rename", "startup garbage collection reconciles orphan temp files and
   unreferenced blobs". That is precisely the orphan-cleanup and quota work D-24 discharged by
   writing nothing. Re-opening D-17 re-opens all of it as a set, which the Deferred Ideas section
   already anticipates.

**What is NOT settled, stated plainly.** No number here is measured. QUAL-06 records that this runtime
exposes no memory introspection whatsoever — `llrt:qjs`, `perf_hooks` and `process` all fail to load,
`performance` carries only `now` and `timeOrigin`, there is no `gc()`, and external RSS sampling is
the only method available, on a high-water mark that never falls
`[VERIFIED: .planning/REQUIREMENTS.md § "Signal quality (QUAL)", QUAL-06]`. The one measured constant
that touches this is `RSS_BYTES_PER_INPUT_BYTE = 102.112`
`[VERIFIED: packages/engine/src/thresholds.generated.ts:38 — "export const RSS_BYTES_PER_INPUT_BYTE
= 102.112; // SPIKE-06 · resolved · confidence MEDIUM"]`, and it was measured for the **AST
tokenizer** path, not for string storage. Projecting it onto `JSON.parse` of a sourcemap would be
exactly the fabricated-number shape Phase 0 refused.

**What would measure it:** the SPIKE-06 method, unchanged — a Tier-0 probe inside a fresh
version-asserted instance, `JSON.parse` a real large sourcemap, write its sources as N rows, with the
host `caido-cli` RSS sampled **externally** across the run and a second arm that writes N files for
contrast. That is a Phase 7 spike, not a Phase 6 plan. **It is not a Phase 6 blocker**, because Phase 6
under D-17 produces no large content at all — the delivery path it must have already exists and is
measured (`store/export.ts` + `frontend/src/components/export-download.ts`).

**Disposition for the planner:** proceed on D-17. Record O-01 as a **named carried obligation owned by
Phase 7's first plan**, with the probe above as its discharge, and record that Phase 7 must re-open
D-17 deliberately if the probe comes back negative rather than working around it.

---

### O-02 — What can the backend learn about its own deployment shape from the SDK alone?

**Answer: essentially nothing about persistence. The SDK exposes OS family and version strings and no
storage-durability signal of any kind. D-19's persistence sentence cannot be made conditional from
introspection — but it *can* be made empirical, after the fact, from a durable marker row.**

The complete backend SDK surface, read this session
`[VERIFIED: node_modules/.pnpm/@caido+sdk-backend@0.57.1/node_modules/@caido/sdk-backend/src/typing.d.ts:214-283]`:

```ts
export interface SDK<API = {}, Events = {}> {
  console: Console;        findings: FindingsSDK;   requests: RequestsSDK;
  replay: ReplaySDK;       projects: ProjectsSDK;   scope: ScopeSDK;
  env: EnvironmentSDK;     api: APISDK<API, Events>; events: EventsSDK<API, Events>;
  meta: MetaSDK;           runtime: RuntimeSDK;     graphql: GraphQLSDK;
  hostedFile: HostedFileSDK; net: NetSDK;
}
```

Every member that could conceivably carry deployment information, and what it actually carries:

| Surface | Members (verbatim) | What it tells you about deployment shape |
|---|---|---|
| `sdk.runtime` | `get version(): string` `[VERIFIED: .../caido/runtime.d.ts:6-10]` | Caido's version. Nothing about hosting. |
| `sdk.meta` | `id()`, `path()`, `assetsPath()`, `db()`, `version()`, `updateAvailable()` `[VERIFIED: .../sdk-backend/src/typing.d.ts:175-208]` | `path()` is a **string** — legal under D-18, since reading the string touches no filesystem. It reveals OS family (`/Users/…` vs `/home/caido/…` vs `C:\…`). It reveals **nothing** about whether that path is a bind mount. |
| `sdk.projects` | `getCurrent(): Promise<Project \| undefined>`; `Project` has `getId/getName/getPath/getVersion/getStatus` `[VERIFIED: .../caido/projects.d.ts:9-45]` | Another server-side path string. Same limitation. |
| `sdk.env` | `getVar`, `getVars`, `setVar`, `getEnvironments`, … `[VERIFIED: .../caido/environment.d.ts:110-186]` | **This is Caido's Replay/Automate environment-variable feature, not `process.env`.** Values are operator-authored. Not an authoritative deployment signal. |
| `sdk.scope`, `sdk.findings`, `sdk.replay`, `sdk.graphql`, `sdk.net`, `sdk.hostedFile` | — | Nothing deployment-shaped. |
| `os` module (loadable; on the DIST-05 allowlist) | `type()`, `release()`, `version()`, `homedir()`, `platform()`, `tmpdir()`, `arch()`, `EOL` `[VERIFIED: .../quickjs-types/src/extra/os.d.ts:1-64 — the complete export list]` | **No `hostname()`**, so the container-ID heuristic is unavailable. `type()`/`platform()` distinguishes Darwin-desktop from Linux, and nothing distinguishes a Linux VPS from a Linux container, or a mounted container from an unmounted one. |
| `process` | — | **Does not load.** `[VERIFIED: scripts/ci/check-bundle-imports.mjs:46-48 — "Measured to FAIL despite the build externalising them just as silently: util, stream, zlib, process, perf_hooks, qjs, llrt:qjs, caido:crypto"]` |

`/.dockerenv` is out of reach twice over: D-18 bans the filesystem by construction, and even a read
would only distinguish container-vs-not, never volume-vs-no-volume.

**The one signal that *does* exist, and it is the right one.** Persistence is not an introspectable
property; it is an *observed* one. The backend can write a durable marker at first `init()` — an
`install_id` and a monotonically incremented `boot_count` in `settings` under the reserved global
scope (`project_id = ''`, which `settings` alone permits
`[VERIFIED: packages/backend/src/store/migrations.ts:37-41 — "NOTE ON `settings` AND THE EMPTY
PROJECT ID: `project_id = ''` is RESERVED and means \"global — applies to every project\". It is legal
on `settings` ONLY."]`) — and on every subsequent `init()` read it back. A boot that finds no marker
where one was written **is** an ephemeral deployment, observed rather than inferred.

This yields a **two-state, honest** Settings sentence, and the planner should note it does not require
a new table:

- Before any evidence exists: the D-19 generic statement, unchanged, which is already shipped (see
  § "D-19 is mostly already shipped").
- After a boot that lost its marker: an added sentence naming what was observed —
  *"a previous restart of this Caido lost DefMiner's database, so this deployment does not keep data
  across restarts."*

That is strictly stronger than a `/.dockerenv` guess and strictly weaker than a prediction — which is
the correct epistemic position and the one this project's culture demands. **It also has a cost the
planner must weigh:** `SETTING_KEYS` and `KNOWN_SETTINGS` are closed vocabularies rendered by the
Settings panel `[VERIFIED: packages/engine/src/contract.ts:848-855; packages/backend/src/store/settings.ts:354-369]`,
and adding an internal marker key there would put a non-operator-editable value on an operator-editable
surface. Either add the keys and exclude them from `KNOWN_SETTINGS` (the two lists are already separate),
or put the marker in the `scans` table's own step. The former is smaller.

**Disposition:** D-19's persistence sentence **can** be conditional, but on *observed history*, not on
detected shape. If the planner declines the marker, the sentence degrades to one statement true
everywhere — which D-19 already permits.

---

### O-03 — Is a narrow HTTPQL push-down provably a superset of `admit()`'s kind axis?

**Answer: it can be, and the fixture suite is cheaper than CONTEXT.md assumed — but the obvious
clause has a proven hole, and there is no `resp.content_type` field at all.**

#### What `admit()`'s kind axis actually is

```ts
// packages/backend/src/hooks/admit.ts:83-102 — SCRIPTISH_MEDIA_TYPES, verbatim
const SCRIPTISH_MEDIA_TYPES = [
  "application/ecmascript",
  "application/javascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/js",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
] as const;
```

```ts
// packages/backend/src/hooks/admit.ts:112-126 — isScriptish, verbatim
export function isScriptish(
  contentType: string | null,
  url: string | null,
): boolean {
  if (contentType) {
    const essence = String(contentType).split(";", 1)[0].trim().toLowerCase();
    for (const mediaType of SCRIPTISH_MEDIA_TYPES) {
      if (essence === mediaType) return true;
    }
  }
  if (url) {
    const bare = String(url).split("#")[0].split("?")[0].toLowerCase();
    if (bare.endsWith(".js") || bare.endsWith(".mjs")) return true;
  }
  return false;
}
```

`[VERIFIED: packages/backend/src/hooks/admit.ts:83-126]` (Note: seventeen essences, not the fifteen a
quick count suggests.) The predicate is a case-insensitive exact match on the MIME **essence** (parameters
stripped), OR a `.js`/`.mjs` suffix on the fragment- and query-stripped, lowercased URL.

#### What HTTPQL actually offers

`[CITED: https://docs.caido.io/app/reference/httpql]`

| Namespace | Fields |
|---|---|
| `req` | `created_at`, `ext`, `host`, `len`, `method`, `path`, `port`, `query`, `raw`, `tls` |
| `resp` | `code`, `len`, `raw`, `roundtrip` |
| `row` | `id` |
| `preset`, `source` | no fields; take direct values. `source` is **"only available in the Search interface"** |

Operators: `eq`, `ne` (**case sensitive**; *"Requires leading `.` character for `ext` field"*),
`gt`/`gte`/`lt`/`lte`, `cont`/`ncont` (**case insensitive**), `like`/`nlike` (SQLite LIKE),
`regex`/`nregex` (Rust syntax, *"Not all regex features are currently supported… such as look-ahead"*).

**There is no `resp.content_type` field.** Content-type can only be reached through `resp.raw`, which
the docs define as *"The full raw data of the response (includes response line, headers, and body
data)"* — so any `resp.raw` term matches the **body** as well as the headers. That is a superset in the
safe direction (it over-matches, never under-matches on header content), but it makes the push-down
weakly selective.

#### A clause that is a provable superset, and the one that is not

**The obvious clause has a hole.** `req.ext.eq:".js"` is documented **case sensitive**, while
`isScriptish` lowercases before `.endsWith`. A response at `/APP.JS` is admitted by `admit()` and
missed by `req.ext.eq:".js"`. **That single term breaks the superset relation.** Use the
case-insensitive `cont` family instead.

A defensible starting clause, with each term's superset justification:

```
(
  req.path.cont:".js"
  OR resp.raw.cont:"javascript"
  OR resp.raw.cont:"ecmascript"
  OR resp.raw.cont:"jscript"
  OR resp.raw.cont:"livescript"
  OR resp.raw.cont:"text/js"
)
AND resp.code.gte:200 AND resp.code.lt:300
```

- `req.path.cont:".js"` — `cont` is case-insensitive, so it covers `.js`, `.mjs` (which contains
  `.js`… **no it does not** — `.mjs` contains `mjs`, not `.js`. **Add `OR req.path.cont:".mjs"`.**
  This is exactly the class of error the fixture suite exists to catch, and it is recorded here rather
  than silently corrected.) `req.path` excludes the query string (`req.query` is a separate field),
  which matches `isScriptish`'s query-stripping. It over-matches `/x.jsonp` — harmless.
- The five `resp.raw.cont` substrings cover all seventeen essences: every one contains `javascript`,
  `ecmascript`, `jscript`, `livescript`, or is exactly `text/js`. Verify against the verbatim list
  above term by term; `text/javascript1.5` contains `javascript`, `text/x-ecmascript` contains
  `ecmascript`. A single `resp.raw.cont:"script"` would cover all seventeen in one term and is the
  safest possible choice — at the cost of matching every HTML page containing `<script>`.
- `resp.code` bounds — `admit()` rejects anything outside 200–299 before reaching the kind axis
  `[VERIFIED: packages/backend/src/hooks/admit.ts:190-197]`, so filtering to 2xx cannot drop anything
  `admit()` would accept. **304s are correctly excluded**: `admit()` rejects them under `revalidation`
  before the kind axis, so the superset obligation does not extend to them.
- **Do not add a `resp.len` bound without measuring it first.** `resp.len` is documented as *"The
  response size in bytes (includes response line, headers, and body data)"* — it does not say whether
  that is the wire count or the decompressed count. The superset relation happens to hold either way
  (see the reasoning in O-07), but the argument depends on an unmeasured fact and the term buys
  little.

#### What the fixture suite has to look like

Because of `sdk.requests.matches()`, the suite does **not** need a proxy round trip per case. Capture
each fixture through the proxy once into a fresh version-asserted instance, then inside the plugin, for
every stored `(request, response)` pair:

```
assert( admit(sdk, request, response).ok === true
        ⟹ sdk.requests.matches(PUSHDOWN_CLAUSE, request, response) === true )
```

A violation is a red test naming the fixture. The pairs that must be present, each because it is a
place where `isScriptish` and HTTPQL can disagree:

| # | Fixture | The disagreement it probes |
|---|---|---|
| 1 | `/app.js` served `Content-Type: text/html` | admit accepts on the extension; does the push-down? |
| 2 | `/APP.JS` (uppercase) served `application/octet-stream` | the `eq` case-sensitivity hole above |
| 3 | `/app.mjs` | the `.mjs` term |
| 4 | `/bundle` (**no extension**) served `application/javascript` | admit accepts on content-type only; `req.ext` and `req.path` are both silent |
| 5 | `/app.js?v=2` and `/app.js#frag` | does Caido's `req.path` / `req.ext` strip the query the way `isScriptish` does? |
| 6 | `Content-Type: text/javascript; charset=utf-8` | admit strips parameters; `resp.raw.cont` sees the whole header |
| 7 | `Content-Type: TEXT/JAVASCRIPT` (uppercase) | `cont` is documented case-insensitive — confirm |
| 8 | `text/javascript1.5`, `text/jscript`, `text/livescript`, `text/js`, `application/x-ecmascript` | the five substring terms, one fixture each |
| 9 | A JS body served `Content-Type: text/plain` at `/x.txt` | must be rejected by `admit()` **and** may be matched by the push-down — the superset direction, confirmed non-vacuous |
| 10 | An HTML page containing `<script src=…>` | proves the clause over-matches, so the suite is not passing by accident |

Fixture 9 and 10 are the **non-vacuity** half: a suite in which the push-down matches everything would
pass the superset assertion trivially, which is exactly the failure shape Phase 0's round-1 review
caught three times. Assert a **negative** too: some fixture the push-down does *not* match.

**Confidence: MEDIUM.** The grammar is `[CITED: docs.caido.io]` and authoritative; whether Caido's
`req.ext` / `req.path` implementations strip the query, and whether `cont` is byte-wise or
Unicode-case-folded, are **not measured** and are exactly what the suite settles.

---

### O-04 — Is a Caido `Cursor` stable across a process restart?

**Answer: NOT MEASURED, and it does not need to be. Persist a re-derivable `row.id` boundary instead of
the opaque cursor, and D-09's column list is decidable now.**

What is known: `Cursor` is `string & { __cursor?: never }`
`[VERIFIED: .../shared.d.ts:9-15]`, i.e. an opaque branded string. Its lifetime is documented nowhere:
neither the typings nor `https://developer.caido.io/plugins/reference/sdks/backend/requests.html`
(fetched this session, HTTP 200) say anything about it.

**Under the absent-evidence rule that silence is not evidence in either direction.** I am not entitled
to claim cursors *are* unstable, and I am not entitled to claim they *are* stable. What settles it is a
positive probe: in a fresh instance, `query().first(1).execute()`, persist `items[0].cursor`, SIGKILL
and relaunch against the same `--data-path`, then `query().after(cursor).first(1).execute()` and
compare. That probe is four lines inside a leg the D-20 harness already has to build (every leg
restarts the instance for D-22's fourth assertion), so **it costs one assertion, not a plan**.

**But the migration is one-way and must not wait on it.** The SDK gives a re-derivable position for
free:

- `RequestOrderField` includes `"id"` and `"created_at"` `[VERIFIED: .../requests.d.ts:553-562]`.
- HTTPQL's `row` namespace has field `id`, *"The numerical identifier of a request's traffic table
  row"*, Integer, with `lt`/`gt`/`lte`/`gte` available `[CITED: docs.caido.io/app/reference/httpql]`.

So under D-12's descending walk the position is expressible **as HTTPQL**:

```
query()
  .filter("(<defminer-kind>) AND (row.id.lt:<last_request_id>) AND (<operator-clause>)")
  .descending("req", "id")
  .first(20)
  .execute()
```

and the persisted position is a plain integer, which survives anything.

**Recommended `scans` columns for the position (D-09's open half, now decidable):**

| Column | Type | Why |
|---|---|---|
| `last_request_id` | `TEXT NOT NULL` | The authoritative, re-derivable boundary. `TEXT` because `Request.getId()` returns `ID = string`; compare as an HTTPQL Integer. Empty string means "not started". |
| `last_cursor` | `TEXT` | **Nullable, opportunistic.** Store it, and use it as a fast path *within a single process lifetime only*. On `init()` (D-11) it is set to NULL along with the suspend, so a resume after restart always goes through `last_request_id`. If the O-04 probe comes back positive, the column is already there and the fast path widens without a migration. |
| `last_created_at` | `INTEGER` | D-14's honest "now scanning traffic from 14 Aug" — see below. |

Two facts must be checked by the same fixture that proves the position works: that
`request.getId()` is a decimal integer string, and that `row.id` orders the same way
`descending("req","id")` does. Both are one assertion each in the same probe.

**D-14's timestamp must come from the SDK, not from the stored row.** `consumer.ts:528` reads
`const now = Date.now();` and every persisted `observed_at` / `last_seen_at` / `started_at` uses it
`[VERIFIED: packages/backend/src/ingest/consumer.ts:96-99 — "Every value this module PERSISTS
(`observed_at`, `started_at`, `finished_at`) comes from `Date.now()`"; and :528 — "const now =
Date.now();"]`. So a retro-scanned response from 14 August is stored with today's timestamp. The
progress readout must therefore read `item.request.getCreatedAt()` (`getCreatedAt(): Date`
`[VERIFIED: .../requests.d.ts:144 and :518]`), which is the capture time.

*(A useful side effect of that same fact: because retro rows are written with the current wall clock,
the retention **age** bound can never immediately evict a fresh backfill of old traffic. That removes a
hazard the planner would otherwise have to design around, and it makes D-08's trigger unambiguously the
row-cap branch.)*

---

### O-05 — Can the Docker image be pinned to the same version as the desktop app?

**Answer: YES, and better than the roadmap feared. `api.caido.io`'s 404 on non-`latest` (P6-D5) does not
extend to Docker Hub. Both the current desktop version and the Phase 0 threshold version are pullable.**

Measured this session against Docker Hub's registry API:

```
$ curl -s "https://hub.docker.com/v2/repositories/caido/caido/tags?page_size=50&ordering=last_updated"
count: 96
latest        2026-08-22T17:00:46Z
0.58.2        2026-08-22T17:00:43Z
latest-slim   2026-08-22T16:57:32Z
0.58.2-slim   2026-08-22T16:57:29Z
0.58.0        2026-08-20T13:45:12Z
0.57.1        2026-07-10T18:17:06Z
0.57.1-slim   2026-07-10T18:13:59Z
… back to 0.50.2
```

Manifest reachability, with an anonymous pull token:

```
=== 0.57.1 === http=200
=== 0.58.2 === http=200
=== latest === http=200

platforms for 0.57.1:
  {'architecture': 'amd64', 'os': 'linux'}   sha256:5d57ce1ca9ad2…
  {'architecture': 'arm64', 'os': 'linux'}   sha256:7895e2727c1f6…
```

`[VERIFIED: Docker Hub registry v2 manifest API, queried 2026-08-31 — HTTP 200 on
`registry-1.docker.io/v2/caido/caido/manifests/{0.57.1,0.58.2,latest}`, OCI image index listing a
native `linux/arm64` manifest]`

Two consequences for D-21:

- **The matrix can pin its Docker legs to the same version as the desktop leg.** With the desktop app
  at 0.58.2 and `caido/caido:0.58.2` published two days after the desktop release, D-21's constant is
  one value — `0.58.2` — across every leg, and the result artifacts do not have to disclose a
  cross-version comparison. That is the good outcome D-21 hoped for.
- **`docs.caido.io` is stale about architecture and the harness should not inherit it.** The Docker
  guide says *"can be ran directly on x86 architecture"* and offers a Rosetta tip for M1
  `[CITED: https://docs.caido.io/app/guides/docker]`, but the 0.57.1 and 0.58.2 indexes both carry a
  native `linux/arm64` manifest. On this machine (arm64) the legs run natively; **do not add
  `--platform linux/amd64` on the strength of the doc**. Record the resolved manifest digest in the
  result artifact so a future reader knows which one ran.

---

### O-06 — How are DefMiner's clause and the operator's HTTPQL combined, and what polices it?

**Answer: Caido's own documentation contradicts itself on AND/OR precedence, which forces full
parenthesisation; HTTPQL supports comments, which forces clause ORDER; and `sql-discipline.spec.ts` is
provably silent on this composition, which forces a new gate.**

#### The precedence contradiction, verbatim from one page

Under **Logical Operators**:

> "Operators are case insensitive. Both have the **same priority**."

Under **Logical Grouping**, on the same page, immediately below:

> "Caido supports the priority of operations: `AND` has a higher priority than `OR`.
> `<Clause1> AND <Clause2> OR <Clause3>` is equivalent to `((<Clause1> AND <Clause2>) OR <Clause3>)`.
> `<Clause1> OR <Clause2> AND <Clause3>` is equivalent to `(<Clause1> OR (<Clause2> AND <Clause3>))`."

> "While parentheses are optional, we recommend using them to make your logical grouping clear."

`[CITED: https://docs.caido.io/app/reference/httpql — both boxes quoted verbatim; fetched 2026-08-31]`

The two worked examples are internally consistent with AND-binds-tighter; the "same priority" box
contradicts them. **DefMiner must therefore not depend on precedence at all.** Wrapping each clause in
its own parentheses makes the composition mean the same thing under either reading — that is a
derivation, not a preference, and it is the answer to D-05's "the composition rule becomes part of the
scan RPC's contract."

#### HTTPQL has comments, and that decides clause ORDER

> "Caido supports both single-line and multi-line comments in HTTPQL queries."
> "Comments can be used to write descriptions or temporarily disable certain query statements."

`[CITED: https://docs.caido.io/app/reference/httpql]`

The docs name `//` and `/* */` in the reference summary. An operator clause ending `foo //` placed
**before** DefMiner's clause would comment DefMiner's narrowing away — a widening, which is exactly
what D-05 forbids. Placed **last**, the same input comments out only the trailing `)` and produces an
unbalanced expression, and `execute()` *"@throws {Error} If a query parameter is invalid"*
`[CITED: .../requests.d.ts:635-639]`. **Fail closed.**

**The composition rule, stated as the contract:**

```ts
// The ONLY producer of a scan filter string. Nothing else concatenates HTTPQL.
function composeScanFilter(
  kindClause: string,      // DefMiner-authored, a module constant, never from input
  positionClause: string,  // DefMiner-built from an integer
  operatorClause: string,  // OPERATOR INPUT — validated, and always LAST
): string {
  return `(${kindClause}) AND (${positionClause}) AND (${operatorClause})`;
}
```

with a validator on `operatorClause` that refuses, before composition:

1. any occurrence of `//`, `/*` or `*/` — DefMiner has no use for operator comments and a comment is
   the one construct that can reach across a parenthesis;
2. unbalanced parentheses (a simple depth count, respecting quoted strings);
3. an empty or whitespace-only clause (compose without the third term instead of emitting `()`);
4. a length cap.

#### Why the existing gate does not reach it, measured rather than assumed

`sql-discipline.spec.ts` detects concatenated and interpolated query text **at the sink**, and its
sink set is closed:

```ts
// packages/backend/src/store/sql-discipline.spec.ts:108 — verbatim
const SQL_SINKS = new Set(["prepare", "exec", "run", "get", "all"]);
```

`[VERIFIED: packages/backend/src/store/sql-discipline.spec.ts:100-108, including the comment
"`fragment-composition` is detected HERE and not at the concatenation, because `a + b` over two
identifiers is ordinary string work everywhere else in the language. It only becomes a SQL defect at
the moment the result is executed"]`

An HTTPQL string reaches `.filter(...)`. `filter` is not in `SQL_SINKS`, and the file's own
`looksLikeSql()` requires a `SELECT|INSERT INTO|…|PRAGMA` keyword, which no HTTPQL clause contains.
**The gate is silent here by construction, not by oversight.**

**The gate D-18-adjacent work should add**, in the same idiom and for the same reason:

- a static rule with `HTTPQL_SINKS = new Set(["filter"])`, firing on any template literal with a
  substitution, any `+` concatenation, or any `.join()` result reaching it, **except** from the single
  allowlisted producer `composeScanFilter` — mirroring `INTERPOLATION_ALLOWLIST`'s one-entry,
  head-text-matched shape at `sql-discipline.spec.ts:329-341`;
- unit fixtures over `composeScanFilter` itself: a clause with a trailing `//`, an unterminated `/*`,
  a `)` -imbalanced clause, an empty clause, and the legal case — the firing/legal pair the
  `outbound-prohibition` family established.

#### The reframing the planner should hold on to

A widened HTTPQL clause **cannot** produce a row that `admit()` would reject: `admit()` runs on every
item regardless, and its fifth axis is `sdk.requests.inScope()` — Caido's own engine, per D-07
`[VERIFIED: packages/backend/src/hooks/admit.ts:210-215]`. So the push-down is an **optimisation**, and
the risk it carries is **cost**, not correctness: a widened clause turns a targeted scan into a pull of
every stored body in history, on a runtime where each page transfers full bodies. That is precisely
what D-05's "the operator may narrow, never widen" is protecting, and framing the gate as a cost
control rather than a correctness control makes it easier to write and easier to defend.

---

### O-07 — Does `body.length` on a queried response report the DECOMPRESSED identity byte count?

**Answer: NOT MEASURED on either read path. But the `get()` path already has a shipped, running
instrument, and turning it into a measurement costs one probe run rather than any new code.**

What SPIKE-08 actually measured, verbatim from its verdict:

> "Proxied response bodies reach **onInterceptResponse** DECOMPRESSED. For gzip, brotli and zstd the
> plugin's `toRaw()` digest equals the identity-body digest, and the leading bytes are plain
> JavaScript rather than a compression container. Identity bodies round-trip byte-for-byte (6/6 digest
> matches). `Body.length` equals `toRaw().length` on **24/24 proxied round trips**."

and the `SIZE_GATE_SOURCE` rationale:

> "Observed compression ratios on this corpus ran **1.0725x to 7.2541x**, so a ceiling written against
> the wire byte count would admit up to 7.2541x more bytes than intended."

`[VERIFIED: .planning/phases/00-runtime-reality-check/results/SPIKE-08.json § verdict, quoted above]`

Its method names only the hook: *"twice through the Caido proxy… A Tier-0 probe recorded, **per
intercepted response**…"*. **Neither `sdk.requests.get()` nor `sdk.requests.query()` appears anywhere in
SPIKE-08.** O-07 is genuinely open.

**The shipped instrument.** `consumer.ts` reloads by id and compares:

```ts
// packages/backend/src/ingest/consumer.ts:497 — verbatim
if (got.byteLen !== entry.bytes) c.byteLenMismatch++;
```

where `entry.bytes` is the hook's `Body.length` and `got.byteLen` is `body.toRaw().length` on the
**reloaded** response `[VERIFIED: packages/backend/src/ingest/consumer.ts:206-221 and :497]`. The
counter's own documentation says what it means:

```ts
// packages/backend/src/telemetry.ts:155-158 — verbatim
/** `body.length` from the hook disagreed with `toRaw().length` in the consumer.
 *  BODY_LENGTH_EQUALS_RAW_LENGTH measured them equal across 24 round trips, so
 *  a non-zero value here means that measurement no longer holds. */
byteLenMismatch: number;
```

`[VERIFIED: packages/backend/src/telemetry.ts:155-158]`

So: **proxy a gzip/br/zstd-compressed JS fixture through a fresh instance with the plugin installed,
let the consumer drain, and read `byteLenMismatch` off `getStatus`.** Zero across all three encodings
means the stored response returns the decompressed count on the `get()` path and `admit()`'s size axis
is safe there. The corpus already exists — `corpus/encoded/` with the pinned ace (457,965 B) and babel
(2,983,904 B) fixtures and `scripts/spike/origin.py` to serve them with an explicit
`Content-Encoding` `[VERIFIED: SPIKE-08.json § method and § corpus]`.

**The `query()` path needs one more assertion, and it is the one that matters for the retro scan.**
Add to the same probe: after the drain, run `sdk.requests.query().filter(<the fixture's path>).first(1).execute()`
and compare `items[0].response.getBody().length` against the known identity byte count. If it reports
the wire count, the size gate admits up to 7.25× more bytes than intended **on the retro path only**,
and the mitigation is already available and cheap: the consumer re-reads by id via `get()` anyway
(D-01/D-03), so the authoritative size check can be moved to — or duplicated at — the reload, where the
count is known good. The planner should design the retro producer so that the query-side `admit()` is
a *filter* and the reload-side check is the *gate*, which makes the answer to O-07 non-load-bearing.

**Do not let this be recorded as settled by the existing thresholds.** `SIZE_GATE_SOURCE`,
`BODY_STORED_DECOMPRESSED` and `BODY_LENGTH_EQUALS_RAW_LENGTH` all carry `SPIKE-08` and all describe the
hook path. Re-using them for the retro path would be exactly the "asserted in four places, gated in one"
failure `.planning/STATE.md` § "Phase 0 Planning Notes" names as this project's recurring shape.

---

## `HostedFileSDK` verification (D-17 premise 1)

**Confirmed, against the current SDK.** `@caido/quickjs-types@0.26.0` is the **latest** version on npm:

```
$ npm view @caido/quickjs-types version
0.26.0
```

`[VERIFIED: npm registry, queried 2026-08-31; the full `versions` array ends `…"0.25.4", "0.26.0"`]`

The complete `HostedFileSDK`:

```ts
// node_modules/.pnpm/@caido+quickjs-types@0.26.0/.../caido/hostedFile.d.ts — verbatim, complete
export type HostedFileSpec = { name: string; content: Bytes; };
export type HostedFile = { id: string; name: string; path: string; };
export type HostedFileSDK = {
  getAll(): Promise<HostedFile[]>;
  create(spec: HostedFileSpec): Promise<HostedFile>;
};
```

`[VERIFIED: .../caido/hostedFile.d.ts:1-52 — this is the entire file, quoted complete]`

**No `delete`. No `remove`. No expiry, TTL or lifetime field anywhere.** D-17's first premise holds
against the newest published SDK, not merely against the pinned one. DEPLOY-03's "expiry" and
DEPLOY-04's "orphan cleanup" are not expressible against this surface, and the planner may state that
as a fact rather than a reading.

*(Note `HostedFile.path` — a hosted file **does** carry a server path, and displaying it would violate
both R5 and D-19. Another reason declining the surface is the smaller design.)*

---

## The `scans` table, concretely

### Correction: the ladder is at v4, not v3

```ts
// packages/backend/src/store/migrations.ts — step numbers, verbatim from the array
{ v: 1, … }   // artifacts, observations
{ v: 2, … }   // analyses, settings, two BEFORE INSERT triggers
{ v: 3, … }   // audit, idx_audit_at, idx_artifacts_keyset, idx_observations_keyset
{ v: 4, … }   // idx_artifacts_size_keyset, idx_observations_status_keyset
```

`[VERIFIED: packages/backend/src/store/migrations.ts:54-278 — four objects in `MIGRATIONS`, and
`export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].v;`]`

**`scans` is step v5.** CONTEXT.md's canonical-refs line calling v3 "the shipped schema" is stale by
one step (step v4 was added by plan 05-07).

### What the migration ladder requires of a new step

From `migrations.ts`'s own header and `migrate()`, all `[VERIFIED: packages/backend/src/store/migrations.ts:1-52, 279-400]`:

- **Shipped steps are immutable.** A new column is a new step, never an edit.
- **Every statement is `IF NOT EXISTS`**, which is the only reason DDL may be batched into one `exec`:
  *"a single `exec` string IS an atomic unit (MULTISTATEMENT_EXEC_ATOMIC), but an `exec` that FAILS
  leaves an open write transaction on a pooled connection that nothing in the plugin API can reach"*.
- The `PRAGMA user_version = ${m.v}` write is the **one allowlisted interpolation in the package**
  (`INTERPOLATION_ALLOWLIST` at `sql-discipline.spec.ts:338-341`, matched on head text
  `/^PRAGMA user_version = $/`). A `scans` step inherits it and adds nothing.

### What `schema.spec.ts` requires

Three properties, each a separate failure `[VERIFIED: packages/backend/src/store/schema.spec.ts:1-17]`:

1. `project_id` is **in the PRIMARY KEY, by `PRAGMA table_info` ordinal** — structure, not DDL text.
2. Every column is on `COLUMN_ALLOWLIST` — *"Adding a column is a deliberate TWO-PLACE edit."*
3. The table **set** is exact.

```ts
// packages/backend/src/store/schema.spec.ts:43-49 — verbatim
const EXPECTED_TABLES = [
  "analyses",
  "artifacts",
  "audit",
  "observations",
  "settings",
];
```

`listTables()` orders `name ASC`
`[VERIFIED: packages/backend/test/fixtures/sqlite-fixture.ts:134-144]`, so the sixth entry lands
**between `observations` and `settings`**: `["analyses","artifacts","audit","observations","scans","settings"]`.

```ts
// packages/backend/src/store/schema.spec.ts:442-452 — FORBIDDEN_COLUMNS, verbatim
const FORBIDDEN_COLUMNS: Record<string, string> = {
  value_raw: "SEC-04 — a finding's raw value is never stored; HMAC fingerprint plus redacted preview only",
  path_key: "DIFF-01 is v2 scope and its validating spike moved to v2 with it (decision P4-D2)",
  body: "T-01-21 — no column may hold a response body",
  headers: "T-01-21 — no column may hold header values",
  cookie: "T-01-21 — no column may hold cookies",
  authorization: "T-01-21 — no column may hold authorization material",
  id: "no surrogate id anywhere: last_insert_rowid() is unusable on the pooled connection (decision P1-D1)",
};
```

`[VERIFIED: packages/backend/src/store/schema.spec.ts:442-452]` **The bare name `id` is banned.** The
`scans` identifier must be `scan_id`, caller-minted (a UUID, as `audit.event_id` is), for exactly the
reason `audit` records: *"the call site mints a UUID, which makes the caller the owner of idempotency
and makes a retry a no-op instead of a duplicate."*

### A compliant step v5

Written to satisfy every rule above simultaneously — `IF NOT EXISTS` throughout, `project_id` first in
the PK, explicit `CHECK` constraints (the v2 style; only the immutable v1 tables need triggers), no
`id`, no BLOB, no column able to hold content:

```sql
CREATE TABLE IF NOT EXISTS scans (
  project_id       TEXT    NOT NULL CHECK (length(project_id) > 0),
  scan_id          TEXT    NOT NULL CHECK (length(scan_id) > 0),
  state            TEXT    NOT NULL CHECK (state IN ('running','suspended','completed','discarded')),
  suspend_reason   TEXT,             -- a CLOSED DefMiner-authored code, never free text
  operator_filter  TEXT    NOT NULL, -- '' when the operator supplied none
  epoch            INTEGER NOT NULL,
  last_request_id  TEXT    NOT NULL, -- '' before the first page; the re-derivable position (O-04)
  last_cursor      TEXT,             -- opportunistic, NULLed by the init() sweep
  last_created_at  INTEGER,          -- D-14's "now scanning traffic from …"
  pages_walked     INTEGER NOT NULL,
  seen             INTEGER NOT NULL,
  admitted         INTEGER NOT NULL,
  skipped_done     INTEGER NOT NULL,
  rejected         INTEGER NOT NULL,
  queued           INTEGER NOT NULL,
  started_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  finished_at      INTEGER,
  PRIMARY KEY (project_id, scan_id)
);
CREATE INDEX IF NOT EXISTS idx_scans_state
  ON scans (project_id, state, started_at);
```

Two shape notes the planner should decide deliberately:

- **Per-reason reject counts (D-14) do not fit a fixed column list.** `REJECT_REASONS` has six members
  `[VERIFIED: packages/backend/src/hooks/admit.ts:51-58 — "status", "revalidation", "empty",
  "too_large", "not_scriptish", "out_of_scope"]`. Six columns would couple a one-way migration to a
  vocabulary Phase 3/4 may grow. The alternative — a JSON blob in one TEXT column — is a column that
  can hold arbitrary content, which is precisely what `COLUMN_ALLOWLIST` exists to prevent. **Recommendation:**
  keep only the aggregate `rejected` in `scans`, and serve the per-reason breakdown for the *running*
  scan from `telemetry.ts`'s in-memory retro sub-map (D-02), which is where counters live anyway. A
  completed scan's breakdown is then not durable — state that as an accepted cost rather than
  discovering it.
- **The state vocabulary must not be spelled `scan_state`.** `analyses.scan_state` already exists over
  `SCAN_STATES = ["pending","running","done","partial","failed"]`
  `[VERIFIED: packages/engine/src/contract.ts:79-85]`. Two different closed vocabularies under one
  column name in one database is the drift shape this repo keeps catching. Name the column `state` and
  declare the vocabulary in `contract.ts` beside `SCAN_STATES` under a distinct name.

### The read and write statements, in the shipped style

Every one is a **single statement, fully bound with positional `?`, `project_id` in the WHERE
predicate** (`scopesOnProjectId()` checks the text from the first `WHERE` onward, per
`sql-discipline.spec.ts:290-296`), and none is prepared at module scope.

```ts
// D-11's startup sweep — ONE statement, no read-then-write.
const SUSPEND_RUNNING_ON_INIT_SQL = `
UPDATE scans SET state = 'suspended', suspend_reason = ?, last_cursor = NULL, updated_at = ?
WHERE project_id = ? AND state = 'running'
`;

// D-04's epoch suspend — the guard is INSIDE the statement, the retry.ts pattern.
const SUSPEND_ON_EPOCH_SQL = `
UPDATE scans SET state = 'suspended', suspend_reason = ?, updated_at = ?
WHERE project_id = ? AND scan_id = ? AND state = 'running' AND epoch <> ?
`;

// The position advance after one page.
const ADVANCE_SQL = `
UPDATE scans SET last_request_id = ?, last_cursor = ?, last_created_at = ?,
       pages_walked = pages_walked + 1, seen = seen + ?, admitted = admitted + ?,
       skipped_done = skipped_done + ?, rejected = rejected + ?, queued = queued + ?,
       updated_at = ?
WHERE project_id = ? AND scan_id = ? AND state = 'running'
`;

// The one-at-a-time invariant (Deferred Ideas), enforced by the WHERE, not by a prior read.
const START_SQL = `
INSERT INTO scans (project_id, scan_id, state, operator_filter, epoch, last_request_id,
                   pages_walked, seen, admitted, skipped_done, rejected, queued,
                   started_at, updated_at)
VALUES (?, ?, 'running', ?, ?, '', 0, 0, 0, 0, 0, 0, ?, ?)
ON CONFLICT (project_id, scan_id) DO NOTHING
`;
```

`START_SQL`'s upsert form matters: `sql-discipline.spec.ts`'s `statementKind()` classifies by the
**leading** keyword, so `ON CONFLICT … DO UPDATE SET` reads as an INSERT and not as an unscoped UPDATE
`[VERIFIED: packages/backend/src/store/sql-discipline.spec.ts:117-124]`. The one-scan-at-a-time
invariant needs its own single-statement guard — the honest option is a partial unique index, e.g.
`CREATE UNIQUE INDEX IF NOT EXISTS idx_scans_one_running ON scans (project_id) WHERE state = 'running'`,
which makes a second start fail at the driver rather than needing a read-then-write the pool cannot
make atomic.

### D-26's exemption, in `retention.ts`'s style

`retention.ts` expresses D-06's audit exemption **by the absence of an over-age statement, stated in
the code**: it has `AUDIT_OLDEST_SQL` and `COUNT_AUDIT_SQL` and `DELETE_AUDIT_SQL` and deliberately no
`AUDIT_OVER_AGE_SQL`, with the reasoning written where the missing statement would be
`[VERIFIED: packages/backend/src/store/retention.ts:1-11 and :218-257 — "ONE TABLE IS EXEMPT FROM THE
AGE BOUND AND FROM IT ONLY… The reasoning is stated in full beside its statements below, where the
missing over-age statement is."]`.

D-26's exemption is on a **state**, not a table, so it cannot be expressed by an absence. It has to be
a predicate, visible in the statement text:

```sql
-- The exception is IN the WHERE clause, where a reader looking for it will find it.
-- 'suspended' is exempt from the age bound because a suspended scan's row IS its
-- cursor: a 90-day timer would silently delete an operator's resumable backfill.
-- The ROW CAP below still bounds growth, and it does not carve out any state.
SELECT scan_id FROM scans
WHERE project_id = ? AND updated_at < ? AND state <> 'suspended'
ORDER BY updated_at ASC, scan_id ASC
LIMIT ?
```

and a separate row-cap statement with no state carve-out, ordered `updated_at ASC, scan_id ASC` —
matching the *"Every one of these orders OLDEST FIRST with an explicit tie-break, so a capped pass and
the pass that resumes it agree on which rows come next"* rule at `retention.ts:126-131`.

---

## D-08 and `sweepRetention`'s return — the correction

**`RetentionSweepSummary` does not distinguish an age-bound delete from a row-cap delete.** The
complete shape:

```ts
// packages/backend/src/store/retention.ts:85-99 — verbatim
export type RetentionSweepSummary = {
  examined: number;
  deleted: number;
  /** Audit rows removed by the raised row bound, counted SEPARATELY and also
   *  included in `deleted`. … */
  auditDeleted: number;
  moreWork: boolean;
  /** Deletes that failed, plus one for a pass that threw outright. */
  errors: number;
  /** The most recent failure's text, bounded like every other store error. */
  lastError: string | null;
};
```

`[VERIFIED: packages/backend/src/store/retention.ts:85-99]`

The sweep pushes **both** victim sets into one array:

```ts
// packages/backend/src/store/retention.ts:369-390 — verbatim, abridged
const overAgeStmt = await db.prepare(ARTIFACTS_OVER_AGE_SQL);
pushVictims(await overAgeStmt.all<{ sha256: string }>(projectId, cutoff, CANDIDATE_SCAN_LIMIT));

const artifactCount = await countRows(db, COUNT_ARTIFACTS_SQL, projectId);
const excess = artifactCount - bounds.maxRows;
if (excess > 0) {
  const oldestStmt = await db.prepare(ARTIFACTS_OLDEST_SQL);
  pushVictims(await oldestStmt.all<{ sha256: string }>(projectId, Math.min(excess, CANDIDATE_SCAN_LIMIT)));
}
```

`[VERIFIED: packages/backend/src/store/retention.ts:369-390]` — and `pushVictims` de-duplicates via a
`seen` set, so a digest eligible under both bounds is attributed to over-age (it is pushed first).

**D-08 is implementable but needs one new field.** The narrowest change: a `rowCapDeleted: number`
counting only digests that entered through the `excess > 0` branch and were actually removed. Because
of the `seen` de-duplication, that number is *exactly* "artifacts the row cap evicted that age would
not have" — which is precisely the "the backfill is consuming itself" signal D-08 needs, and not
ordinary age trimming.

Two costs to state in the plan:

- The type's own comment says **"FIXED SHAPE — plan 01-03's call site compiles against exactly this."**
  It has grown once already (`auditDeleted` arrived in Phase 5), so growing it has precedent — but the
  comment must be amended in the same commit, not left claiming a fixity it no longer has.
- `retention.spec.ts` and `consumer.spec.ts` both assert against the shape.

**How the consumer observes it.** The sweep runs from the drain loop on a cadence:

```ts
// packages/backend/src/ingest/consumer.ts:410-423 — verbatim, abridged
const summary = await sweepRetention(deps.db, projectId, bounds, Date.now());
counters.retentionSweeps++;
counters.retentionDeleted += summary.deleted;
…
counters.storeErrors += summary.errors;
```

`[VERIFIED: packages/backend/src/ingest/consumer.ts:410-423]` and the cadence is
`processedForSweep % RETENTION_SWEEP_EVERY_N === 0` at `:753`, with
`RETENTION_SWEEP_EVERY_N = 128` `[VERIFIED: packages/engine/src/thresholds.ts:117]`.

So D-08's hook is a **single added branch at that site**: if `summary.rowCapDeleted > 0` and a scan row
is `running` for this project, run the D-08 suspend statement and the D-16 audit write. That couples
two subsystems, which D-08 already flags as its cost; making the coupling *one branch at one call
site* is what keeps it bounded.

**One consequence worth stating in the copy:** the sweep runs every 128 processed artifacts, so D-08's
suspension is detected *up to 128 artifacts after* the eviction began. The operator-facing sentence
should say the scan was suspended because retention was evicting its results — not that it was
suspended at the first evicted row.

---

## D-01's backpressure watermark — what it must be derived from

**Do not invent a number.** Here is the complete evidence base and the shape a defensible derivation
takes.

| Constant | Value | Provenance |
|---|---|---|
| `QUEUE_CAP` | `2048` | `[VERIFIED: packages/engine/src/thresholds.ts:52]` — *"DERIVATION: four times EVENTS_DELIVERED_UNDER_BLOCK."* |
| `EVENTS_DELIVERED_UNDER_BLOCK` | `500` | `[VERIFIED: packages/engine/src/thresholds.generated.ts:28 — "// SPIKE-03 · resolved · confidence HIGH"]` — 499 intercept events arrived in a single 20 ms burst after a 30 s handler block |
| `PASSIVE_MAX_BYTES` | `8_388_608` | `[VERIFIED: packages/engine/src/thresholds.ts:40]` |
| `ARTIFACT_DEADLINE_MS` | `30_000` | `[VERIFIED: packages/engine/src/thresholds.ts:62]` |
| `TOKENIZER_MS_PER_MB` | `783` | `[VERIFIED: packages/engine/src/thresholds.generated.ts:44 — "// SPIKE-06 · resolved · confidence HIGH"]` |
| `RETENTION_SWEEP_EVERY_N` | `128` | `[VERIFIED: packages/engine/src/thresholds.ts:117]` |
| `MAX_SYNC_SLICE_MS` | `25` | `[VERIFIED: packages/engine/src/thresholds.generated.ts:34]` |

The queue's behaviour at cap, verbatim:

```ts
// packages/engine/src/queue.ts:56-66 — offer(), verbatim
offer(entry: Entry): boolean {
  if (this.#buf.length >= this.#cap) {
    this.#overflow++;
    this.#buf.shift();
    this.#buf.push(entry);
    return false;
  }
  this.#buf.push(entry);
  return true;
}
```

`[VERIFIED: packages/engine/src/queue.ts:41-66, including the comment "DROP-OLDEST, deliberately
diverging from the drop-newest that the `probe/tier0-events` analog uses: the newest artifact is the
one the operator is looking at right now."]`

**The derivation the watermark must satisfy**, stated so the planner can defend a number rather than
choose one:

> The scan may offer a page only while there is room for **a full measured live burst** on top of what
> the scan has just added. A burst is `EVENTS_DELIVERED_UNDER_BLOCK` (500) entries — that is the only
> burst anyone has measured, and `BoundedQueue`'s constructor already refuses a cap below it. One
> scan page adds at most `first(n)` entries. So:
>
> `WATERMARK ≤ QUEUE_CAP − EVENTS_DELIVERED_UNDER_BLOCK − SCAN_PAGE_SIZE`
>
> With the shipped constants and FIND-03's page size of 20: `2048 − 500 − 20 = 1528`.

That inequality — not the number — is what belongs in `thresholds.ts`, computed from the imported
constants exactly as `RETENTION_SWEEP_MAX_ROWS` computes its convergence property, and asserted in
`thresholds.spec.ts`, which already checks every relationship in `POLICY_DERIVED_FROM`
`[VERIFIED: packages/engine/src/thresholds.ts:122-128 — the `POLICY_DERIVED_FROM` object and the
comment "thresholds.spec.ts asserts every one of these relationships"]`. Add a
`SCAN_BACKPRESSURE_WATERMARK` entry to `POLICY_DERIVED_FROM` naming
`{ QUEUE_CAP, EVENTS_DELIVERED_UNDER_BLOCK, SCAN_PAGE_SIZE }`.

**A second, tighter bound the planner should consider and may prefer.** The bound above protects
against *drop*; it says nothing about *latency*. At `TOKENIZER_MS_PER_MB = 783` a full 8 MiB artifact
takes ~6.3 s to walk, and the consumer is strictly serial. A queue standing at 1528 entries is, in the
worst case, hours of backlog — during which every live response the operator generates is queued behind
the backfill even though it was never dropped. If the planner wants "live browsing always wins" to mean
what an operator would take it to mean, the watermark should be derived from a **latency** budget
instead, e.g. "the queue never holds more than N seconds of work at the measured median artifact size".
That derivation needs a median artifact size, which **is not measured** — SPIKE-06's size ladder was
0.5, 1.5, 3 and 8 MB `[VERIFIED: packages/engine/src/thresholds.ts:29-30]`, a corpus of two, not a
distribution. **Recommendation:** ship the drop-safety bound (defensible from measured constants today),
make the watermark a `SETTING_KEYS` entry so it is operator-tunable at both scopes, and record the
latency question as a named residual with the measurement that would close it.

---

## D-15 and the coalescer's triage lock — the specific branch that must change

D-15 says scan progress "lands immediately rather than accruing into the pill". The coalescer as
shipped makes that impossible without a code change, and the change is at a precise line.

```ts
// packages/frontend/src/stores/coalescer.ts:188-209 — verbatim, abridged
const onSummary = (summary: InvalidationSummary): void => {
  if (stopped) return;
  if (summary.projectId !== options.gate.projectId.value) return;

  pending.value = {
    ...pending.value,
    [summary.category]: pending.value[summary.category] + summary.changedCount,
  };

  // THE SUPPRESSION IS CHECKED BEFORE THE WINDOW, not inside it. A summary
  // that arrives mid-triage does not enter the debounce at all …
  if (options.gate.triageLocked.value) return;

  void windowed();
};
```

and

```ts
// packages/frontend/src/stores/coalescer.ts:164-169 — verbatim
const react = (): void => {
  if (stopped) return;
  if (options.gate.triageLocked.value) return;
  reactions.value++;
  void applyPending();
};
```

`[VERIFIED: packages/frontend/src/stores/coalescer.ts:160-209]`

**Two `triageLocked` early-returns.** With a `scans` category added naively, a progress summary
arriving while the operator has a row selected is counted into `pending` and never applied — the exact
opposite of D-15's intent.

**Read D-15's "immediately" carefully.** The 2/second cap is not the obstacle — D-15 itself says the cap
"is already exactly right for a progress readout". The obstacle is the **triage lock**, whose purpose is
to stop the *table* re-ordering under a cursor. A progress strip has no rows and no cursor.

**Two shapes, and the planner should pick explicitly rather than let one emerge:**

- **(a) Category-aware lock.** Both `triageLocked` guards become "…unless every pending category is
  scan progress", and `applyPending()` learns not to refetch entity tables for a scan-only reaction.
  Keeps one mechanism; adds a conditional to the file whose whole value is that it has no
  conditionals.
- **(b) Separate progress channel on the same event.** Scan progress rides `INVALIDATION_EVENT` (D-15's
  "one backend→frontend mechanism") but is routed to its own tiny throttled store, outside
  `INVALIDATION_CATEGORIES` and outside `pending`. The coalescer is untouched; the entity contract is
  untouched; `contract.spec.ts:230-237`'s `toEqual([...]).toHaveLength(3)` stays green.

**Recommendation: (b).** It honours D-15's stated reason (one channel) while leaving the triage-lock
invariant — which protects durable triage state from a mis-click — literally unmodified. State the
divergence from D-15's word "category" in the plan rather than smuggling it.

Whichever is chosen, note the payload consequence D-15 already flags: `InvalidationSummary` is
`{ projectId, category, changedCount, newestId }` `[VERIFIED: packages/engine/src/contract.ts:536-541]`
and the Data & Interaction Contract states verbatim: *"Backend→frontend events carry an invalidation
summary only: `{ projectId, category, changedCount, newestId }`. No findings payload, no bundle
bodies."* `[VERIFIED: .planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md:339-341]`. Scan
counters are DefMiner-authored integers and a DefMiner-authored timestamp — no target-controlled bytes
— so the *spirit* of the contract holds, but the shape changes and 05-UI-SPEC.md must be amended
rather than quietly exceeded.

---

## D-19 is mostly already shipped

```ts
// packages/frontend/src/components/settings-contract.ts:238-240 — verbatim
/** The storage note, which renders whether or not a path is available. */
export const STORAGE_NOTE =
  "DefMiner's database lives on the Caido server, not on this machine. On a remote or containerised Caido that is a different disk from the one you are reading this on.";
```

`[VERIFIED: packages/frontend/src/components/settings-contract.ts:236-262]`

That is D-19's sentence, already rendering unconditionally. What Phase 6 owes is **subtraction** plus
D-25's counts.

The path machinery that D-19 makes dead:

| Symbol | Location | Fate under D-19 |
|---|---|---|
| `SERVER_STORAGE_PATH` (`= null`) | `packages/frontend/src/App.vue:558` | removed |
| `:storage-path` prop binding | `packages/frontend/src/App.vue:759` | removed |
| `storagePath` prop | `packages/frontend/src/components/SettingsPanel.vue:87, :124` | removed |
| `SERVER_PATH_LABEL`, `COPY_PATH_LABEL`, `COPIED_LABEL`, `COPY_FAILED_LABEL`, `PATH_DISPLAY_CHARS` | `settings-contract.ts:236-262` | dead once the prop goes |
| Five `storagePath` cases | `SettingsPanel.spec.ts:549-587` | removed |

`[VERIFIED: grep over packages/frontend/src for `storagePath|storage-path`, results listed above]`

**`knip` is configured and run as a script** (`"knip": "knip"` in `package.json`), so leaving those
exports in place while removing their only consumer fails the build. The plan must remove them together
in one commit, and should state that R5's *rule* survives its implementation being deleted —
05-UI-SPEC.md R5 reads *"any filesystem path the Settings surface displays is labelled 'on the Caido
server'…"* `[VERIFIED: .planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md:293-298]`, which is
vacuously satisfied by displaying none, and which the phase that ever does display one inherits.

Also to be closed: `05-VERIFICATION.md`'s DEPLOY-02 `behavior_unverified` item, which names
`App.vue:558` and the hardcoded null. D-19 disposes of it by deletion rather than by supplying a value,
and the plan should say so in those words so a verifier does not read the item as still open.

D-25's counts come from already-shipped reads — `countArtifacts` / `countObservations` /
`countAnalyses` back `COUNT_ARTIFACTS_SQL` / `COUNT_OBSERVATIONS_SQL` / `COUNT_ANALYSES_SQL` in
`retention.ts:146-148`, each already `project_id`-scoped and already inside the SQL discipline gate
`[VERIFIED: packages/backend/src/store/retention.ts:146-148]`. The caps come from
`getRetentionBounds()` `[VERIFIED: packages/backend/src/store/settings.ts:297-300]`. **No new SQL**, as
D-25 states.

---

## D-18's rule family — the correction, and the idiom

**`eslint.config.js` is not the 01-09 family.** It holds exactly two project rules
`[VERIFIED: eslint.config.js:343-419 — "PROJECT RULE 1 — the engine may not import Caido. (DET-03)"
and "PROJECT RULE 2 — onInterceptResponse's callback may not be async."]`. Neither is
`outbound-*`-shaped.

The family lives in **`packages/backend/src/outbound-prohibition.spec.ts`** (11,753 lines), a pure
`auditSource(file, source)` AST gate whose header states it *"copies its SHAPE — a pure
`auditSource(file, source)`, a named non-vacuity assertion, and every rule's failing path executed
against an inline fixture"* from `store/sql-discipline.spec.ts`
`[VERIFIED: packages/backend/src/outbound-prohibition.spec.ts:1-40]`. Its rule set is data:

```ts
// packages/backend/src/outbound-prohibition.spec.ts:1739-1830 — the RULES keys, verbatim
const RULES = Object.freeze({
  "outbound-send":         Object.freeze({ rule: "outbound-send",         surface: …, why: … }),
  "outbound-net":          Object.freeze({ rule: "outbound-net",          surface: …, why: … }),
  "outbound-fetch":        Object.freeze({ rule: "outbound-fetch",        surface: …, why: … }),
  "outbound-import":       Object.freeze({ rule: "outbound-import",       surface: …, why: … }),
  "outbound-global-ctor":  Object.freeze({ rule: "outbound-global-ctor",  surface: …, why: … }),
  "outbound-beacon":       Object.freeze({ rule: "outbound-beacon",       surface: …, why: … }),
  "outbound-dynamic-code": Object.freeze({ rule: "outbound-dynamic-code", surface: …, why: … }),
  "outbound-unanalysable": Object.freeze({ rule: "outbound-unanalysable", surface: …, why: … }),
});
type RuleId = keyof typeof RULES;
export const FORBIDDEN_OUTBOUND: readonly OutboundRule[] = Object.freeze(Object.values(RULES));
```

`[VERIFIED: packages/backend/src/outbound-prohibition.spec.ts:1739-1838]`

Its stated growth mechanism: *"A seventh outbound surface discovered in a later phase is one entry here
plus one branch in the walk, and the `why` travels with it into the failure message"*
`[VERIFIED: ibid.:1734-1738]`.

**Recommendation: a sibling file, not an entry in `RULES`.** `FORBIDDEN_OUTBOUND` is a CORE-11
vocabulary about *outbound network traffic*; a filesystem ban has a different requirement (DEPLOY-03/04)
and a different reason. The precedent for a sibling is already set twice —
`outbound-prohibition.spec.ts` copied `sql-discipline.spec.ts`'s shape and said so in its header.
So: `packages/backend/src/filesystem-prohibition.spec.ts`, same shape, its own `RULES` record.

The four rules it needs, and what each must catch:

| Rule | Fires on | The shape that would otherwise slip through |
|---|---|---|
| `fs-import` | any import whose specifier reduces to `fs`, `node:fs`, `llrt/fs`, `fs/promises`, `node:fs/promises`, `llrt/fs/promises` — in `import`, `import type`, `export … from`, `require`, and `import()` | `fs` is on the **DIST-05 bundle allowlist** (`ALLOWED = new Set(["os","path","fs","sqlite","caido:http","crypto","buffer","string_decoder","url","events"])` `[VERIFIED: scripts/ci/check-bundle-imports.mjs:76-87]`) because Phase 0 **measured it loadable** — a different question from permitted. Exactly the `caido:http` asymmetry that made `outbound-import` necessary. **The allowlist must not be edited**; its own header says *"ADDING AN ENTRY BY HAND IS A LIE UNLESS A PROBE RUN PROVES IT"* and removing one would redefine "measured loadable" as "permitted". |
| `hosted-file` | any member access on an identified `sdk.hostedFile` receiver, including through a one-hop alias (`const hf = sdk.hostedFile; hf.create(…)`) and a destructure (`const { hostedFile } = sdk`) | The `outbound-send` walk already resolves aliases and destructures; reuse it. |
| `hosted-file-unanalysable` | a computed member that *selects* `hostedFile` (`sdk["hosted" + "File"]`), or a computed member on an identified `sdk.hostedFile` receiver | The `outbound-unanalysable` argument, verbatim in its own `why`: *"the one shape that defeats an AST gate SILENTLY — the walk returns nothing and the file reports clean, which is indistinguishable from a pass."* |
| — *(explicitly NOT a rule)* | `sdk.meta.path()`, `sdk.meta.assetsPath()`, `sdk.projects.getCurrent().getPath()` | **Legal, per D-18.** These read strings and touch no filesystem, and `sdk.meta.path()` already appears in redacted error text. The **legal fixture** for each of these is what proves the rule bans the capability rather than the vocabulary. |

The fixture obligation, from the family's own idiom: **every rule's failing path executed against an
inline fixture, plus a legal fixture it must stay quiet on.** And a non-vacuity assertion over the
rule-name set, so a rule cannot be added without appearing in the closed list — the shape
`sql-discipline.spec.ts:73-89`'s `RULE_NAMES` uses.

**One boundary to inherit and state:** the outbound gate *"SKIPS `.spec.ts`"*, which is what lets its
own fixtures live inline, and it names the cost —*"a spec file could call an outbound surface
unnoticed"*, bounded by `pnpm check:bundle` reporting the shipped bundle's one specifier
`[VERIFIED: packages/backend/src/outbound-prohibition.spec.ts:69-75]`. The same boundary and the same
bound apply here, and the same disclosure is owed.

---

## D-24's gate, concretely

D-24 asks for "a schema test asserting no column may hold artifact content, so the day someone adds a
BLOB the gate fires". Half of it exists: `FORBIDDEN_COLUMNS` bans the **names** `body`, `headers`,
`cookie`, `authorization` (quoted verbatim above). That is a name check, and a `payload BLOB` column
passes it.

`PRAGMA table_info` already returns the declared type, and the fixture already surfaces it:

```ts
// packages/backend/test/fixtures/sqlite-fixture.ts:125-133 — verbatim
export type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};
```

`[VERIFIED: packages/backend/test/fixtures/sqlite-fixture.ts:118-133]`

So D-24's ship-the-proof half is a **declared-type allowlist** over the same loop the column allowlist
already walks: every column's `type`, uppercased, must be one of `TEXT`, `INTEGER`, `REAL`. `BLOB` and
the empty declared type (SQLite's `BLOB`-affinity default) both fail, and the failure message says why.
That is roughly ten lines in `schema.spec.ts` beside the existing checks, and it is the mechanical
statement D-24 promises.

The claim it makes true is checkable from the shipped DDL: across all four steps every declared type is
`TEXT`, `INTEGER` or `REAL` — `artifacts` is `TEXT/TEXT/INTEGER/TEXT/INTEGER/INTEGER/INTEGER`,
`observations` `TEXT/TEXT/TEXT/TEXT/INTEGER/TEXT/INTEGER`, `analyses`
`TEXT/TEXT/TEXT/TEXT/REAL/INTEGER/INTEGER/INTEGER/TEXT`, `settings` `TEXT/TEXT/TEXT/INTEGER`, `audit`
`TEXT/TEXT/INTEGER/TEXT/TEXT/TEXT` `[VERIFIED: packages/backend/src/store/migrations.ts:57-278 — the
`MIGRATIONS` array's DDL, read in full]`. **No BLOB anywhere.** D-24's premise holds as stated.

---

## The deployment harness substrate

### What `scripts/spike/instance.sh` gives D-20 for free

Read in full this session `[VERIFIED: scripts/spike/instance.sh:1-179]`. It is already parameterised by
environment: `CAIDO_BIN`, `EXPECT_VERSION`, `PORT`, `RUN_ID`, `DATA_PATH`, `KEEP_DATA`, `OUT`.

| Capability | Where | Notes for Phase 6 |
|---|---|---|
| Absolute app path by default | `:18` — `CAIDO_BIN="${CAIDO_BIN:-/Applications/Caido.app/Contents/Resources/bin/caido-cli}"` | Never `$HOME/.caido/` |
| **Version assertion before anything is recorded** | `:78-86` — refuses on mismatch, and the message already names the stale-0.55.3 trap | D-20's core discipline, already mechanised |
| Binary SHA-256 | `:87-88` | Lands in the result artifact |
| Port 8080 refused unconditionally | `:94-99` — *"that is the operator's live Caido desktop instance"* | **Keep this. It is what stops the matrix touching operator data.** |
| LISTEN collision refused | `:100-103` | *"Nothing in this script ever kills a process it did not start"* — which also protects pid 79273 on 8998 |
| Isolated data path, `--no-open --allow-guests --no-sync --debug`, 127.0.0.1 only | `:106-114` | `--no-sync` suppresses the outbound Cloud connection |
| Readiness **polled**, never slept | `:117-136` — POSTs `{ __typename }` to `/graphql` up to 60× | Detects a died-during-startup case explicitly |
| Guest token, `umask 077` **before** the write | `:139-152` | The install and RPC calls need it |
| `instance.json` with binary/expected/reported/sha256/flags/timestamps | `:154-176` | Already matches `spike-result.schema.json`'s `instances[]` and `binary` shapes |
| Teardown: **SIGKILL always**, host logs copied out, token deleted | `:37-68` | *"A spike that wedged the QuickJS thread will never honour SIGTERM"* |

The result-artifact contract is `spike-result.schema.json`, whose `required` is
`["spike","status","recorded_at","binary","host","instances","method","measurements","verdict","requirements_affected"]`
and whose `instances[]` items already carry an enum
`project_persistence: ["temporary","persistent","none",null]`
`[VERIFIED: .planning/phases/00-runtime-reality-check/results/spike-result.schema.json — `required` and
the `instances` sub-schema, read in full]`. **`binary` has `additionalProperties: false`**, so the matrix
needs its own sibling schema rather than reusing this one — a Docker leg's "binary" is an image
reference with a manifest digest, not a path with a file hash.

### What the container legs need built new

Measured directly from the registry rather than inferred
`[VERIFIED: Docker Hub registry v2 config blob for `caido/caido:0.58.2` linux/arm64,
digest `sha256:dca27d38ff79…`, fetched 2026-08-31]`:

```
User          = caido
Env           = ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin']
Entrypoint    = ['tini', '--']
Cmd           = ['caido-cli', '--no-renderer-sandbox', '--no-open', '--listen', '0.0.0.0:8080']
ExposedPorts  = {'8080/tcp': {}}
Volumes       = None
WorkingDir    = None
```

**`Volumes = None`** — the image declares no `VOLUME`, so an unmounted container's Caido data lives in
the writable layer and dies with `docker rm`. That is D-22's fourth leg, and it is now a measured
property of the image rather than an assumption.

And from the official guide, verbatim `[CITED: https://docs.caido.io/app/guides/docker]`:

> "By default, projects created in the Docker container are **not saved** between `docker run`
> commands. Due to this, we recommend mounting a volume to store data on your file system to avoid
> losing data between Caido updates."
>
> "To mount a volume, append the `-v <host-path>:/home/caido/.local/share/caido` command-line option…"
>
> "Ensure the necessary permissions are granted to the host path with: `chown -R 999:999 <host-path>`"

So the two Docker legs are:

```bash
# WITH a volume
docker run -d --name defminer-matrix-vol \
  -p 127.0.0.1:$PORT:8080 \
  -v "$HOSTDIR:/home/caido/.local/share/caido" \
  caido/caido:0.58.2

# WITHOUT a volume
docker run -d --name defminer-matrix-novol \
  -p 127.0.0.1:$PORT:8080 \
  caido/caido:0.58.2
```

New machinery, none of it large:

1. **A container-shaped version gate.** `instance.sh`'s gate 1 runs `"$CAIDO_BIN" --version` on a local
   file. The container equivalent is `docker run --rm --entrypoint caido-cli caido/caido:$TAG --version`
   before anything is recorded, plus recording the **resolved manifest digest** (`docker image inspect
   --format '{{index .RepoDigests 0}}'`) so the artifact names the exact image, not just the tag.
2. **Readiness polling against the published port**, not a local one. The existing `curl … /graphql
   { __typename }` loop transfers unchanged.
3. **Restart semantics per leg.** With a volume: `docker stop && docker start` — data must be present.
   Without: `docker stop && docker rm && docker run` — data must be **absent** and, per D-22, the plugin
   must come back clean on an empty database rather than erroring. *(`docker restart` on the no-volume
   container preserves the writable layer and would test nothing; the leg must remove the container.)*
4. **Permissions.** `chown -R 999:999` on the volume host dir. On macOS with Docker Desktop the VM
   handles uid mapping, so this may be a no-op locally — record what was done rather than assuming.
5. **Plugin install into a container.** The GraphQL `installPluginPackage` route the Phase 0 probe used
   works unchanged over the published port; the plugin package file has to be reachable, which means
   either a bind mount of `packages/dist/` or an upload through the API. The simpler of the two should
   be chosen and recorded.
6. **A matrix result schema**, sibling to `spike-result.schema.json`, whose `binary` variant admits an
   image reference and digest and whose `instances[]` reuses the existing `project_persistence` enum.

### The honest limit of the "remote CLI" leg

DEPLOY-01 names four shapes. On one machine, "local desktop" and "remote CLI" differ only in which
binary and data directory are used — **they share a filesystem**, which is the exact property DEPLOY-02
and DEPLOY-03 exist because of. The Docker legs are the ones that genuinely exercise a server whose
disk the operator cannot reach. The planner should either (a) run the CLI leg against a real remote
host and record it, or (b) record the CLI leg as run-locally with that limitation stated in the result
artifact, and the genuinely-remote property as covered by the Docker legs. **What it must not do is
report four passing legs as four independent confirmations of a property only two of them test** —
that is D-23's discipline applied to a leg that ran rather than to one that did not.

### The version situation on this machine — measured

```
$ /Applications/Caido.app/Contents/Resources/bin/caido-cli --version
Caido 0.58.2

$ ~/.caido/caido-cli --version
Caido 0.55.3
```

`[VERIFIED: executed 2026-08-31]`

**The desktop app has moved to 0.58.2.** Consistent with `@caido/sdk-frontend@0.58.2` already in the
lockfile. Consequences:

- Every Phase 0 threshold was measured on 0.57.1 and **none has been re-measured**
  `[VERIFIED: packages/engine/src/thresholds.generated.ts:15-17 — "Every value below was measured on
  Caido 0.57.1."]`.
- Five tripwires pin the string `"0.57.1"` — `tests/go-no-go.spec.ts:18`, `tests/phase1-load.spec.ts:34`,
  `tests/phase1-runtime.spec.ts:18`, `tests/schema.spec.ts:8`, `tests/phase1-compat.spec.ts:121,311`
  `[VERIFIED: grep over tests/]`. **They do not fail today** because each asserts against a committed
  artifact's `reported_version`, not against the live binary. They fail the moment anyone re-measures
  and commits — which is exactly the fail-closed behaviour they were built for.
- `compat.ts` declares `MIN_CAIDO = "0.57.1"` as a **minimum** with a numeric three-segment comparison
  `[VERIFIED: packages/backend/src/compat.ts:45, :76-95]`, so 0.58.2 passes COMPAT-01 cleanly. D-22's
  "init() reports compatible" assertion is expected to be green on every leg.
- **D-21's constant is `0.58.2`**, and `caido/caido:0.58.2` exists (O-05), so the matrix is internally
  version-consistent across all four legs. The result artifacts still must state which build they
  describe and must not be read as re-validating any Phase 0 threshold.

---

## Standard Stack

No new runtime dependencies. Everything this phase needs is installed and pinned.

### Core

| Library | Version | Purpose | Why Standard |
|---|---|---|---|
| `@caido/quickjs-types` | 0.26.0 | `sdk.requests.query` / `matches` / `get` / `inScope`, `Cursor`, `PageInfo` typings | Latest published; the pinned version **is** the current one |
| `@caido/sdk-backend` | 0.57.1 | `SDK`, `MetaSDK`, `APISDK`, `EventsSDK` | Pinned; peer of the plugin build |
| `sqlite` (Caido module) | via `sdk.meta.db()` | The `scans` table | The only persistence available |
| `vitest` | workspace | The static gates and the fixture suites | `vitest.config.ts` `include` already covers `packages/*/src/**/*.spec.ts` |
| `typescript` | 5.8.3 | The AST walk in the new prohibition gate | The idiom `sql-discipline.spec.ts` and `outbound-prohibition.spec.ts` both use |

### Supporting

| Tool | Purpose | When to Use |
|---|---|---|
| `docker` 29.7.2 | The two container legs | Verified present on this machine |
| `python3` | Result-artifact writing and schema validation | Already the Phase 0 idiom (`instance.sh` embeds it) |
| `curl` | GraphQL readiness poll, guest token, plugin install | Already the Phase 0 idiom |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| `row.id.lt:N` resume boundary | `after(cursor)` alone | Simpler, but bets a one-way migration on O-04 being positive. The recommendation stores both. |
| Sibling `filesystem-prohibition.spec.ts` | Two entries in `outbound-prohibition.spec.ts`'s `RULES` | Fewer files, but puts a DEPLOY-03/04 rule inside a CORE-11 vocabulary named `FORBIDDEN_OUTBOUND`. |
| `resp.raw.cont:"script"` (one term) | Five substring terms | One term is a strictly safer superset and much less selective; five terms are tighter and each needs a fixture. Measure the volume difference on real traffic before choosing. |
| Separate progress channel (D-15 shape b) | Category-aware triage lock (shape a) | (b) leaves the triage-lock invariant untouched; (a) is closer to D-15's literal wording. |

**Installation:** none required.

---

## Package Legitimacy Audit

**This phase installs no external packages.** Every dependency it uses is already in
`pnpm-lock.yaml` and pinned by DIST-06. The two registry lookups performed this session were
*verification*, not selection:

| Package | Registry | Version | Verdict | Disposition |
|---|---|---|---|---|
| `@caido/quickjs-types` | npm | 0.26.0 (latest — confirmed, whole `versions` array read) | OK | Already installed; version confirmed current for the D-17 premise check |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

The one *image* this phase pulls is `caido/caido`, verified by manifest reachability rather than by
name: HTTP 200 on `registry-1.docker.io/v2/caido/caido/manifests/{0.57.1,0.58.2,latest}` with an
anonymous pull token, 96 published tags, an OCI index carrying a native `linux/arm64` manifest, and an
image config whose `Cmd` is `caido-cli`. `[VERIFIED: Docker Hub registry v2 API, 2026-08-31]` The
harness should record the **resolved digest**, not the tag, in each result artifact.

---

## Architecture Patterns

### System Architecture Diagram

```
                      ┌──────────────────────────────────────────┐
  Live proxied        │  onInterceptResponse  (non-async, CORE-01)│
  response  ─────────▶│  admit() ── accept ──▶ offer() UNCONDITIONAL│──┐
                      └──────────────────────────────────────────┘  │
                                                                    │
  Operator clicks                                                   ▼
  "Start scan"                                            ┌───────────────────┐
       │                                                  │  BoundedQueue     │
       ▼                                                  │  cap 2048         │
  ┌─────────────────────────────────────┐                 │  drop-OLDEST      │
  │ RPC startScan(operatorFilter)       │                 └─────────┬─────────┘
  │  · validate operator clause         │                           │
  │  · INSERT scans row (state=running) │                           ▼
  └──────────────┬──────────────────────┘             ┌──────────────────────────┐
                 ▼                                    │ consumer drain loop      │
  ┌──────────────────────────────────────┐            │  · sdk.requests.get(id)  │
  │  SCAN PRODUCER  (serial, yielding)   │            │  · digest, analyse       │
  │                                      │            │  · upsertArtifact        │
  │  depth < WATERMARK ? ─── no ──┐      │            │  · recordObservation     │
  │        │ yes                  │ wait │            │  · every 128: sweep      │
  │        ▼                      │      │            └────────┬─────────────────┘
  │  compose filter:              │      │                     │
  │   (kind) AND (row.id.lt:N)    │      │        rowCapDeleted>0 ?              ┌───────────┐
  │   AND (operator)              │      │                     │──── yes ──────▶│ D-08      │
  │        │                      │      │                     │                │ suspend + │
  │        ▼                      │      │                     ▼                │ audit row │
  │  query().filter(…)            │      │            ┌────────────────┐        └───────────┘
  │   .descending("req","id")     │      │            │ invalidation   │
  │   .first(20).execute()        │      │            │ event          │
  │        │                      │      │            └───────┬────────┘
  │        ▼  items[] (WITH bodies│      │                    │
  │  per item:                    │      │                    ▼
  │   ├ skip if analysis == done  │      │        ┌───────────────────────────┐
  │   ├ admit() → retro counters  │      │        │ frontend coalescer        │
  │   └ offer(id, bytes, kind) ───┼──────┘        │  500ms window, 2/s cap    │
  │        │                             │        │  triage lock → pill       │
  │        ▼                             │        └──────────┬────────────────┘
  │  UPDATE scans  last_request_id,      │                   ▼
  │   last_cursor, last_created_at,      │        ┌──────────────────────────┐
  │   counters, updated_at               │        │ Scan tab + 48px toolbar  │
  │        │                             │        │ indicator (D-13)         │
  │        └── epoch changed? ──▶ SUSPEND│        └──────────────────────────┘
  └──────────────────────────────────────┘

  init()  ──▶ UPDATE scans SET state='suspended', last_cursor=NULL WHERE state='running'   (D-11)

  NOTHING IN THIS DIAGRAM TOUCHES A FILESYSTEM.  Delivery of anything operator-facing is the
  already-shipped chunked RPC download (store/export.ts).  D-17, D-18, D-24.
```

### Pattern 1: The scan is a producer, not a pipeline

**What:** the retro path reuses `admit()`, `BoundedQueue.offer()` and the consumer unchanged. Only the
counter attribution differs.
**When to use:** always, per D-01. There is no second analysis path.
**Why it holds:** the queue entry is `{ id, bytes, kind }` — three scalars, no SDK objects
`[VERIFIED: packages/engine/src/queue.ts:16-20]` — so a retro offer is indistinguishable from a live
one downstream. The consumer's `sdk.requests.get(entry.id)` reload works identically for a
five-minute-old and a five-week-old request.

```ts
// The retro producer's per-item shape. Nothing here is new machinery.
for (const item of page.items) {
  if (item.response === undefined) { retro.reloadNoResponse++; continue; }

  // D-03 — one bounded read per PAGE, not per item; ids batched.
  if (terminalDoneIds.has(item.request.getId())) { retro.skippedDone++; continue; }

  const verdict = admit(sdk, item.request, item.response);   // unchanged, D-07's scope axis included
  if (!verdict.ok) { retro.rejected[verdict.reason]++; continue; }

  retro.admitted++;
  queue.offer({ id: item.request.getId(), bytes: verdict.bytes, kind: verdict.kind });
}
```

### Pattern 2: The guard lives inside the statement

**What:** state transitions are single `UPDATE … WHERE … AND state = ?` statements; there is never a
read-then-write.
**When to use:** every `scans` transition.
**Why:** `retry.ts` establishes it — *"The guard that uses this list lives INSIDE the update statement,
not in a caller-side check before it. A caller-side check is two operations this driver cannot make
atomic, and the interleaving it permits is exactly the running walk being reset."*
`[VERIFIED: packages/engine/src/contract.ts:129-135]` And `last_insert_rowid()` is unusable, and the
driver cannot report what it wrote — `retry.ts` reads back through `getAnalysis` for that reason.

### Anti-Patterns to Avoid

- **Counting first to compute a percentage.** With no `includeRaw(false)` and no `PageInfo.totalCount`,
  a counting pass transfers every body twice. D-14 already refused it; the SDK confirms it.
- **Persisting only the opaque cursor.** See O-04. One-way migration, undocumented lifetime.
- **Appending the operator's HTTPQL clause before DefMiner's.** See O-06. A trailing `//` then widens
  the scan.
- **Re-using `SIZE_GATE_SOURCE` as evidence about the retro path.** See O-07. It measures the hook.
- **A `scans.scan_state` column.** Collides with `analyses.scan_state`'s different closed vocabulary.
- **A JSON column for per-reason reject counts.** Defeats `COLUMN_ALLOWLIST`'s purpose.
- **Treating a green matrix as four independent confirmations.** See the remote-CLI leg limitation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| HTTPQL matching for the superset proof | A re-implementation of HTTPQL semantics | `sdk.requests.matches(filter, req, resp)` | It is Caido's own evaluator, synchronous and in-process. A re-implementation would diverge on the first edge case — the argument `admit()` makes for using `sdk.requests.inScope` |
| Scope evaluation on the retro path | Any scope logic | `admit()`'s fifth axis, unchanged | D-07, and `admit.ts:210-215` already calls Caido's engine |
| Resume position | A hand-rolled offset | `row.id` boundary via HTTPQL + `descending("req","id")` | Offsets drift under concurrent inserts; the boundary does not |
| Retention for `scans` | A second sweep | `sweepRetention` with two more statements | One sweep, one cadence, one convergence inequality |
| Row counts for D-25 | New SQL | `countArtifacts` / `countObservations` / `countAnalyses` | Already shipped, already scoped, already inside the discipline gate |
| Progress delivery | A second event channel | `INVALIDATION_EVENT` | D-15; and a second channel is a second data path with none of the first's controls |
| Instance lifecycle in the harness | A new launcher | `scripts/spike/instance.sh` with `CAIDO_BIN` / `EXPECT_VERSION` / `PORT` / `DATA_PATH` overrides | Version assertion, port-8080 refusal, readiness poll and SIGKILL teardown are all already correct |
| A static gate for HTTPQL composition | A regex over source lines | A TypeScript-compiler AST walk in `sql-discipline.spec.ts`'s shape | Its own header: *"a regex over lines misses multi-line strings, `export … from`, and any call whose receiver spans a line break — the three shapes real code is most likely to use"* |

**Key insight:** this phase's whole surface area is *composition of already-correct parts*. Every place
a plan is tempted to build something new, an existing component is one parameter away from doing it —
except the four genuinely new things: the `scans` table, the HTTPQL composition gate, the filesystem
prohibition gate, and the container harness legs.

---

## Common Pitfalls

### Pitfall 1: The 40,000-request backfill that quietly discards live traffic

**What goes wrong:** an unthrottled producer fills the queue; `offer()` drops **oldest**, which under
sustained backfill means the live entries the hook just admitted.
**Why it happens:** drop-oldest is correct for live traffic and exactly wrong under a backfill.
**How to avoid:** D-01's watermark, derived per § "D-01's backpressure watermark".
**Warning signs:** `counters.queueOverflow` climbing during a scan.

### Pitfall 2: The push-down that is not a superset, discovered in production

**What goes wrong:** `req.ext.eq:".js"` is case-sensitive; `/APP.JS` is silently never scanned.
**Why it happens:** the SDK's types say nothing about HTTPQL matching semantics.
**How to avoid:** the `matches()`-based fixture suite in § O-03, with the non-vacuity negative.
**Warning signs:** a scan that finds nothing on a target whose bundles are visibly present.

### Pitfall 3: The frozen-looking page

**What goes wrong:** a long serial scan blocks the QuickJS thread; the operator reads it as a crash.
**Why it happens:** one thread; `setTimeout(fn,0)` at ~5.03 ms is the only yield
`[VERIFIED: .planning/STATE.md § Decisions — "setTimeout(fn,0) is the only primitive that yields the
QuickJS event loop; cost 5.03ms median"]`. `PITFALLS.md` P3 is exactly this.
**How to avoid:** D-13's toolbar indicator visible from every tab, and yielding between pages.
**Warning signs:** `maxSliceMs` climbing past `MAX_SYNC_SLICE_MS = 25`.

### Pitfall 4: The retro rows that carry today's date

**What goes wrong:** the Scan tab shows "scanning traffic from 31 Aug" while walking August 14th.
**Why it happens:** `consumer.ts:528` uses `Date.now()` for every persisted timestamp.
**How to avoid:** read `item.request.getCreatedAt()` for D-14's readout.
**Warning signs:** `last_created_at` and `updated_at` moving together.

### Pitfall 5: The migration written before O-04 was settled

**What goes wrong:** `scans` persists only the opaque cursor; a restart makes every suspended scan
unresumable; fixing it needs a second one-way step.
**How to avoid:** persist `last_request_id`; treat `last_cursor` as an in-process fast path only.

### Pitfall 6: The gate that a comment can trip

**What goes wrong:** the filesystem prohibition is written against *strings* and fires on
`telemetry.ts`'s header, which legitimately names paths.
**Why it happens:** the same defect `outbound-prohibition.spec.ts` documents at length — *"A substring
scan would fail on that documentation and the only way to make it pass would be deleting the
reasoning — which is precisely backwards."*
**How to avoid:** D-18 already says it — rules against imports and member access, never against
strings — and the family already has the case asserted as its own test.

### Pitfall 7: Re-measuring on 0.58.2 and committing it into the Phase 0 artifacts

**What goes wrong:** a matrix run writes `reported_version: "0.58.2"` into a file
`tests/go-no-go.spec.ts` or `tests/schema.spec.ts` reads, and the Phase 0 tripwires all go red at once
— correctly, but for a reason nobody intended.
**How to avoid:** D-21's separate constant **and a separate results directory**. The matrix writes to
its own Phase 6 results path with its own schema; it never touches
`.planning/phases/00-runtime-reality-check/results/`.

### Pitfall 8: The no-volume leg that tests nothing

**What goes wrong:** `docker restart` on the unmounted container preserves the writable layer, so data
survives and the leg reports a pass on the assertion that was supposed to prove absence.
**How to avoid:** the no-volume restart must be `stop && rm && run`.

---

## Code Examples

### Composing the scan filter (the only producer)

```ts
// The order is load-bearing: DefMiner's clauses FIRST, the operator's LAST, every clause
// parenthesised. Caido's own docs contradict themselves on AND/OR precedence, so full
// parenthesisation is what makes the meaning independent of which reading is true; and HTTPQL
// supports `//` and `/* */` comments, so an operator clause placed last can only comment out the
// trailing `)` — producing an unbalanced expression that execute() throws on. Fail closed.
// [CITED: https://docs.caido.io/app/reference/httpql]

export const SCAN_KIND_CLAUSE =
  'req.path.cont:".js" OR req.path.cont:".mjs" ' +
  'OR resp.raw.cont:"javascript" OR resp.raw.cont:"ecmascript" ' +
  'OR resp.raw.cont:"jscript" OR resp.raw.cont:"livescript" OR resp.raw.cont:"text/js"';

export function composeScanFilter(
  positionClause: string,
  operatorClause: string,
): string {
  const parts = [`(${SCAN_KIND_CLAUSE})`, `(${positionClause})`];
  if (operatorClause !== "") parts.push(`(${operatorClause})`);
  return parts.join(" AND ");
}
```

### Walking one page

```ts
// Source: @caido/quickjs-types@0.26.0 requests.d.ts:597-640 (method set) — every call below is
// a member of RequestsQuery as declared there.
const page = await sdk.requests
  .query()
  .filter(composeScanFilter(`row.id.lt:${lastId}`, operatorClause))
  .descending("req", "id")   // D-12: newest first, back into history
  .first(20)                 // FIND-03: no includeRaw(false), so 20 and not 1000
  .execute();

const advanced = page.items[page.items.length - 1];
// Persist BOTH: the re-derivable boundary is authoritative, the cursor is an in-process fast path.
await advance(db, projectId, scanId, {
  lastRequestId: advanced.request.getId(),
  lastCursor: advanced.cursor,                       // == page.pageInfo.endCursor
  lastCreatedAt: advanced.request.getCreatedAt().getTime(),  // D-14's honest timestamp
});
const done = !page.pageInfo.hasNextPage;
```

### The superset assertion (D-06's proof, one line)

```ts
// Source: @caido/quickjs-types@0.26.0 requests.d.ts:763-769 — matches() is synchronous and
// in-process, so this needs no proxy round trip per case.
for (const { request, response } of fixtures) {
  const verdict = admit(sdk, request, response);
  if (verdict.ok) {
    expect(
      sdk.requests.matches(SCAN_KIND_CLAUSE, request, response),
      `admit() accepted ${request.getUrl()} but the push-down clause does not match it — ` +
      `the retro scan would silently never see this artifact`,
    ).toBe(true);
  }
}
// NON-VACUITY: at least one fixture the clause does NOT match, or this loop proves nothing.
expect(fixtures.some((f) => !sdk.requests.matches(SCAN_KIND_CLAUSE, f.request, f.response))).toBe(true);
```

### The no-BLOB gate (D-24's ship-the-proof half)

```ts
// packages/backend/src/store/schema.spec.ts — beside the existing COLUMN_ALLOWLIST check.
// PRAGMA table_info reports the DECLARED type; ColumnInfo already carries it.
const DECLARED_TYPES = new Set(["TEXT", "INTEGER", "REAL"]);

it("no column may hold artifact content — declared types are scalar only (D-24)", () => {
  const offenders: string[] = [];
  for (const table of listTables(fx.raw)) {
    for (const col of tableInfo(fx.raw, table)) {
      if (!DECLARED_TYPES.has(col.type.toUpperCase())) {
        offenders.push(
          `${table}.${col.name} is declared ${col.type || "<none>"}. DEPLOY-04 is satisfied by ` +
          `CONSTRUCTION: DefMiner writes no bodies and no files, so its server-disk footprint is ` +
          `fixed-shape metadata bounded by retention.ts. A BLOB (or an untyped column, which takes ` +
          `BLOB affinity) re-opens that guarantee and decision D-24 with it.`,
        );
      }
    }
  }
  expect(offenders, offenders.join("\n")).toEqual([]);
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Caido 0.57.1 is the target build | The installed desktop app is **0.58.2**; `caido/caido:0.58.2` published 2026-08-22 | 2026-08-22 (image), before 2026-08-31 (local app) | D-21's constant is 0.58.2; every Phase 0 threshold remains 0.57.1-measured and un-re-measured |
| 0.57.1 is unobtainable (P6-D5, api.caido.io 404s) | **Docker Hub publishes 96 versioned tags including 0.57.1**, manifests reachable, native arm64 | Always true; never checked | O-05 positive. A 0.57.1 container is available if a future phase needs to re-measure against the threshold build |
| `resp.content_type` presumed available for push-down | HTTPQL's `resp` namespace has only `code`, `len`, `raw`, `roundtrip` | — | Content-type push-down must go through `resp.raw`, which matches bodies too |
| The 01-09 rule family is eslint | It is a vitest AST gate at `outbound-prohibition.spec.ts` | Plan 01-09 onward | D-18 joins that file's family, not `eslint.config.js` |
| Schema is at step v3 | Step **v4** (plan 05-07 added two indexes) | 2026-08-28 | `scans` is step v5 |
| `sweepRetention` distinguishes cap from age eviction | It does not — one `deleted` field | Always | D-08 needs a new field |

**Deprecated/outdated:**
- `docs.caido.io/app/guides/docker`'s *"can be ran directly on x86 architecture"* and its Rosetta tip —
  the registry carries a native `linux/arm64` manifest for 0.57.1 and 0.58.2 alike.
- The HTTPQL reference's *"Both have the same priority"* box, contradicted by the worked examples two
  paragraphs below it on the same page. Neither reading should be depended on.
- `06-CONTEXT.md`'s canonical-refs description of `migrations.ts` as "the shipped v3 schema".

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | `request.getId()` returns a decimal integer string that matches HTTPQL's `row.id` value | O-04, § "The `scans` table" | The `row.id.lt:N` resume boundary does not work. **Cheap to check** — one assertion in the same probe. Mitigation: `last_cursor` is stored too. |
| A2 | `row.id` ordering agrees with `descending("req","id")` | O-04 | Pages could overlap or skip. Same one-assertion check. |
| A3 | The five `resp.raw.cont` substrings cover all seventeen `SCRIPTISH_MEDIA_TYPES` essences | O-03 | A media type is silently unscannable. The fixture suite in O-03 is exactly this check; `resp.raw.cont:"script"` is the fail-safe fallback. |
| A4 | Caido's `req.path` excludes the query string, matching `isScriptish`'s stripping | O-03 | Either over- or under-matching. Fixture 5. |
| A5 | `cont` is case-insensitive in the way `.toLowerCase()` is (ASCII and Unicode alike) | O-03 | A non-ASCII-cased media type is missed. Fixture 7. |
| A6 | Sourcemap `sourcesContent` per-file rows are small enough for SQLite on this runtime | O-01 | D-17 must be re-opened. **Owned by Phase 7**, with the external-RSS probe named. |
| A7 | Storing per-source rows and writing per-source files have the same peak JS memory, dominated by `JSON.parse` | O-01 | The O-01 argument weakens and §471 regains force. Same probe. |
| A8 | `docker run --rm --entrypoint caido-cli caido/caido:$TAG --version` prints a parseable version | § "The deployment harness substrate" | The container version gate needs a different invocation. Trivial to discover on first run. |
| A9 | The GraphQL `installPluginPackage` route used by Phase 0 works unchanged against a containerised instance over a published port | § "The deployment harness substrate" | The Docker legs need a different install route. |
| A10 | `chown -R 999:999` is a no-op under Docker Desktop on macOS | § "The deployment harness substrate" | The volume leg fails on permissions. Record what was actually done. |
| A11 | The watermark inequality `QUEUE_CAP − EVENTS_DELIVERED_UNDER_BLOCK − SCAN_PAGE_SIZE` is the right *drop-safety* bound | § "D-01's backpressure watermark" | It bounds drop, not latency; the latency bound needs a median artifact size that is **not measured**. Recommendation already states this as a residual. |
| A12 | Adding an internal marker key to `SETTING_KEYS` but not `KNOWN_SETTINGS` keeps it off the operator-facing Settings panel | O-02 | An internal key renders as an editable setting. Checkable by reading `SettingsPanel.vue`'s iteration source. |

**Nothing in this table is presented as measured.** Every `[VERIFIED: …]` claim elsewhere in this
document cites a file and line range read this session, or a command whose output is pasted.

---

## Open Questions

1. **Which `resp.raw` term set the push-down should use (one broad `"script"` vs five narrow substrings).**
   - What we know: both are provable supersets; the five-term version is far more selective.
   - What's unclear: the volume difference on real captured traffic, which decides whether the broad
     term makes a scan unusably large.
   - Recommendation: build the fixture suite against the five-term clause, and have the harness record
     the item count each clause returns on the same stored corpus. Choose from that number.

2. **Whether the retro path's per-reason reject breakdown must be durable.**
   - What we know: six columns couple a one-way migration to a vocabulary later phases will grow; a
     JSON column defeats `COLUMN_ALLOWLIST`.
   - Recommendation: keep the aggregate in `scans`, serve the breakdown live from `telemetry.ts`, and
     state the loss on scan completion as an accepted cost.

3. **Whether the "remote CLI" leg is run against a real remote host.**
   - What we know: on one machine it shares a filesystem with the desktop leg, which is the property
     DEPLOY-02/03 exist because of.
   - Recommendation: run it locally, state the limitation in the artifact, and name the Docker legs as
     the ones that actually test the property. Do not record four independent confirmations.

4. **How `06-03`'s roadmap title is reconciled.**
   - What we know: D-17 makes "Hosted-file delivery, quotas, orphan cleanup, and storage labelling"
     describe something that will not be built, and CONTEXT.md forbids shipping something else under
     that title silently.
   - Recommendation: amend `ROADMAP.md`'s plan title in the same commit as the plan set, and record
     the amendment in the plan's own preamble.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Caido desktop app (absolute path) | D-20 desktop leg, all live probes | ✓ | **0.58.2** (`/Applications/Caido.app/Contents/Resources/bin/caido-cli`) | — |
| `caido-cli` on `PATH` | — | ✓ but **stale 0.55.3** (`~/.caido/caido-cli`) | 0.55.3 | **Never use.** `instance.sh` gate 1 already refuses it. |
| Docker engine | D-20 container legs | ✓ | 29.7.2, context `desktop-linux` | — |
| `caido/caido:0.58.2` image | D-20 container legs | ✓ (manifest HTTP 200, native arm64) | 0.58.2 | `0.57.1` also available if the threshold build is ever needed |
| `caido/caido:0.57.1` image | Optional threshold re-measurement | ✓ (manifest HTTP 200, amd64 + arm64) | 0.57.1 | — |
| `python3` | Result artifacts, schema validation | ✓ | in `instance.sh` already | — |
| `curl` | GraphQL readiness, guest token, install | ✓ | in `instance.sh` already | — |
| `@caido/quickjs-types` | Typings for all new SDK use | ✓ | 0.26.0 (latest) | — |
| Node/`pnpm` toolchain, `vitest`, `eslint`, `knip` | Every gate | ✓ | workspace-pinned | — |
| Caido 0.57.1 **binary** | Re-measuring any Phase 0 threshold | ✗ | api.caido.io 404s non-`latest` (P6-D5) | **The Docker image `caido/caido:0.57.1` is available** — a genuinely new option this research surfaced. Not needed by Phase 6. |
| A real remote host | A genuinely remote CLI leg | ✗ | — | Record the leg as run-locally with the limitation stated (D-23's discipline), and let the Docker legs carry the remote-filesystem property |

**Missing dependencies with no fallback:** none that block this phase.

**Missing dependencies with fallback:**
- Caido 0.57.1 as a local binary — fallback is the Docker image, and Phase 6 does not need it.
- A remote host — fallback is stated-limitation recording plus the Docker legs.

---

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | `vitest` (workspace-pinned), with `@vitejs/plugin-vue` at top level for SFC specs |
| Config file | `vitest.config.ts` — `include: ["tests/**/*.spec.ts", "packages/*/src/**/*.spec.ts", "scripts/ci/**/*.spec.ts"]`; `testTimeout: 120_000` |
| Environment | node by default; frontend component specs carry `// @vitest-environment jsdom` on their first line (`environmentMatchGlobs` was removed in vitest 4) |
| Quick run command | `pnpm vitest run packages/backend/src/store packages/engine/src --reporter=dot` |
| Full suite command | `pnpm test` (runs `pretest` → `pnpm build:backend` first) |
| Adjacent gates | `pnpm typecheck` (`tsc --build`), `pnpm lint` (`eslint .`), `pnpm knip`, `pnpm check:bundle`, `pnpm check:css`, `pnpm check:externals` |

`[VERIFIED: vitest.config.ts:1-40; package.json § scripts]`

**One constraint the planner must not break**, verbatim from the config: *"`tests/**/*.spec.ts` stays
FIRST and unchanged: it is where the three Phase 0 exit gates live, and Pitfall 7 is a restructure that
quietly leaves `pnpm test` green while running zero of them."* And: *"NO `projects` or `workspace` key,
and no per-package vitest config (decision P2-D4). Five files in this repo … resolve the Phase 0 results
directory from a bare relative literal."*

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| FIND-03 | The push-down clause is a superset of `admit()`'s kind axis | integration (live Caido, in-process `matches()`) | `bash scripts/phase6/pushdown-superset.sh` → `pnpm vitest run tests/phase6-pushdown.spec.ts` | ❌ Wave 0 |
| FIND-03 | `composeScanFilter` parenthesises, orders operator-last, and rejects comments / unbalanced parens | unit | `pnpm vitest run packages/backend/src/scan/filter.spec.ts` | ❌ Wave 0 |
| FIND-03 | No HTTPQL string reaches `.filter()` except from `composeScanFilter` | static AST gate | `pnpm vitest run packages/backend/src/scan/httpql-discipline.spec.ts` | ❌ Wave 0 |
| FIND-03 | Migration step v5 creates `scans`; `EXPECTED_TABLES` is exactly six; `project_id` is in the PK by ordinal; every column is on the allowlist | unit | `pnpm vitest run packages/backend/src/store/schema.spec.ts` | ✅ (extend) |
| FIND-03 | Every `scans` statement is single, fully bound, `project_id`-scoped, not module-scope prepared | static AST gate | `pnpm vitest run packages/backend/src/store/sql-discipline.spec.ts` | ✅ (auto-covers new files) |
| FIND-03 | Position advances, and a resume from `last_request_id` covers exactly the unwalked remainder | unit | `pnpm vitest run packages/backend/src/scan/scans.spec.ts` | ❌ Wave 0 |
| FIND-03 | **The cursor survives a restart** (O-04's probe) | integration (live) | one assertion inside `scripts/phase6/matrix-leg.sh` | ❌ Wave 0 |
| FIND-04 | Progress counters and `last_created_at` advance; the timestamp comes from `getCreatedAt()`, not `Date.now()` | unit | `pnpm vitest run packages/backend/src/scan/scans.spec.ts` | ❌ Wave 0 |
| FIND-04 | Cancel suspends and keeps the position; resume continues; discard removes and writes an `audit` row | unit | `pnpm vitest run packages/backend/src/scan/lifecycle.spec.ts` | ❌ Wave 0 |
| FIND-04 | D-11: `init()` moves every `running` row to `suspended` and never auto-resumes | unit | `pnpm vitest run packages/backend/src/index.spec.ts` | ✅ (extend) |
| FIND-04 | D-08: a row-cap eviction during a running scan suspends it; an age-bound eviction does not | unit | `pnpm vitest run packages/backend/src/store/retention.spec.ts packages/backend/src/ingest/consumer.spec.ts` | ✅ (extend) |
| FIND-04 | D-01: the producer stops offering at the watermark; the watermark satisfies its derived inequality | unit | `pnpm vitest run packages/engine/src/thresholds.spec.ts packages/backend/src/scan/producer.spec.ts` | ✅ / ❌ Wave 0 |
| FIND-04 | The Scan tab renders on first paint, obeys R1/R2, and the toolbar indicator shows from every tab | unit (jsdom) | `pnpm vitest run packages/frontend/src/components/ScanPanel.spec.ts` | ❌ Wave 0 |
| FIND-04 | Progress lands while a row is selected (does not accrue into the pill) | unit (jsdom) | `pnpm vitest run packages/frontend/src/stores/scan-progress.spec.ts` | ❌ Wave 0 |
| DEPLOY-01 | Four legs each assert D-22's four properties; results are schema-validated JSON | integration (live) | `bash scripts/phase6/matrix.sh` → `pnpm vitest run tests/phase6-matrix.spec.ts` | ❌ Wave 0 |
| DEPLOY-01 | A NOT RUN leg is recorded with its reason and never as a pass (D-23) | unit | `pnpm vitest run tests/phase6-matrix.spec.ts` | ❌ Wave 0 |
| DEPLOY-01 | Every artifact names the build it describes and refuses to be written on a version mismatch (D-21) | unit + harness gate | `pnpm vitest run tests/phase6-matrix.spec.ts` | ❌ Wave 0 |
| DEPLOY-02 | The Settings surface renders `STORAGE_NOTE`, the D-25 counts, and **no path** | unit (jsdom) | `pnpm vitest run packages/frontend/src/components/SettingsPanel.spec.ts` | ✅ (amend — remove the five `storagePath` cases) |
| DEPLOY-02 | No path identifier reaches the RPC (the existing username guard) | unit | `pnpm vitest run packages/backend/src/telemetry.spec.ts` | ✅ |
| DEPLOY-03 | `sdk.hostedFile` is unreachable from any shipped module, in every spelling | static AST gate | `pnpm vitest run packages/backend/src/filesystem-prohibition.spec.ts` | ❌ Wave 0 |
| DEPLOY-03 | Delivery is the shipped chunked RPC download | unit | `pnpm vitest run packages/backend/src/store/export.spec.ts` | ✅ |
| DEPLOY-04 | Every specifier form of `fs` / `node:fs` / `llrt/fs` (+ `/promises`) is unreachable; `sdk.meta.path()` stays legal | static AST gate | `pnpm vitest run packages/backend/src/filesystem-prohibition.spec.ts` | ❌ Wave 0 |
| DEPLOY-04 | No column's declared type is `BLOB` or untyped | unit | `pnpm vitest run packages/backend/src/store/schema.spec.ts` | ✅ (extend) |
| DEPLOY-04 | The shipped bundle's import set is unchanged | CI gate | `pnpm check:bundle` | ✅ |
| ERR-02 (slice) | No `scans` row is ever left permanently `running` across a restart | unit + live | `pnpm vitest run packages/backend/src/index.spec.ts`; asserted again in the matrix restart leg | ✅ / ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm vitest run <the touched package's spec dir> --reporter=dot` plus
  `pnpm typecheck`. Under 30 s for any single store or engine directory.
- **Per wave merge:** `pnpm test` (full suite, currently 31 files / 1374 tests at the Phase 1
  close-out figure recorded in STATE.md) plus `pnpm lint`, `pnpm knip`, `pnpm check:bundle`.
  **`pnpm knip` is not optional in this phase** — D-19's deletions strand five exports.
- **Live legs:** run once per wave that touches the harness, and once at the phase gate. They need a
  fresh version-asserted instance and are minutes, not seconds; they are never in the per-commit loop.
- **Phase gate:** full suite green, all six adjacent gates green, and every matrix leg either passed or
  recorded NOT RUN with a reason, before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `packages/backend/src/scan/filter.ts` + `filter.spec.ts` — `composeScanFilter`, the operator-clause
      validator, `SCAN_KIND_CLAUSE`; covers FIND-03 and O-06
- [ ] `packages/backend/src/scan/httpql-discipline.spec.ts` — the static gate over `.filter()` sinks;
      covers O-06's "what polices it"
- [ ] `packages/backend/src/scan/scans.ts` + `scans.spec.ts` — the step-v5 statements and the position
      advance; covers FIND-03/FIND-04
- [ ] `packages/backend/src/scan/producer.ts` + `producer.spec.ts` — the watermark-gated page walk;
      covers D-01
- [ ] `packages/backend/src/scan/lifecycle.spec.ts` — start / pause / resume / discard, and D-04's
      epoch suspend
- [ ] `packages/backend/src/filesystem-prohibition.spec.ts` — D-18, in `outbound-prohibition.spec.ts`'s
      shape, with a firing **and** a legal fixture per rule and a closed rule-name set
- [ ] `packages/frontend/src/components/ScanPanel.vue` + `ScanPanel.spec.ts` — D-13's fifth tab
      (`// @vitest-environment jsdom` on line 1)
- [ ] `packages/frontend/src/stores/scan-progress.ts` + `scan-progress.spec.ts` — D-15's progress path
- [ ] `tests/phase6-matrix.spec.ts` + `.planning/phases/06-.../results/matrix-result.schema.json` —
      the D-20/D-21/D-23 artifact gate. **Must live under `tests/`** so it runs first in the include
      order, and must **not** write into the Phase 0 results directory
- [ ] `tests/phase6-pushdown.spec.ts` — D-06's superset proof over the captured fixture corpus,
      **with its non-vacuity negative**
- [ ] `scripts/phase6/matrix-leg.sh`, `scripts/phase6/matrix.sh` — the four legs, sourcing
      `scripts/spike/instance.sh` for the two native ones and adding the container path for the other two
- [ ] `scripts/phase6/o07-body-length.sh` — the O-07 probe: proxy the `corpus/encoded/` fixtures, drain,
      assert `byteLenMismatch === 0`, then compare a `query()`-returned `Body.length` against the known
      identity byte count
- [ ] Extensions to existing files: `schema.spec.ts` (six tables, `scans` allowlist, the no-BLOB check),
      `retention.spec.ts` (`rowCapDeleted`, D-26's suspended exemption), `consumer.spec.ts` (the D-08
      branch), `index.spec.ts` (D-11's sweep), `contract.spec.ts` (if D-15 shape (a) is chosen),
      `SettingsPanel.spec.ts` (remove the five `storagePath` cases, add the D-25 counts)

---

## Security Domain

`security_enforcement` is `true` in `.planning/config.json`; `security_asvs_level` is 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | no | The plugin authenticates nothing. The harness mints a Caido guest token (`--allow-guests`, 127.0.0.1 only, `umask 077` before write, deleted at teardown) — already correct in `instance.sh`. |
| V3 Session Management | no | No sessions. |
| V4 Access Control | **yes** | D-07: `sdk.requests.inScope()` on every retro item, no override. Scope is the operator's authorization statement; the retro path is never looser than the passive one. |
| V5 Input Validation | **yes** | Two inputs cross a trust boundary this phase: the **operator's HTTPQL clause** (validated per O-06 — comments, paren balance, length; composed operator-last so a bypass fails closed at `execute()`), and **target-controlled bytes** on the Scan tab (05-UI-SPEC R1/R2 — text never markup, C0/C1 and bidi stripped, grapheme-safe truncation, `font-mono`, nothing in `title`/`data-*`). |
| V6 Cryptography | no | No new cryptographic surface. The existing native `crypto` hash is untouched. |
| V7 Error Handling & Logging | **yes** | Every string crossing the RPC goes through `describeError`, which redacts URL-shaped substrings **before** truncating at `ERROR_TEXT_LIMIT = 240`. A `scans.suspend_reason` must be a **closed DefMiner-authored code**, never a rendered error. |
| V8 Data Protection | **yes** | `COLUMN_ALLOWLIST` for `scans`; no BLOB (D-24); `operator_filter` is operator-authored, not target-authored, but is still rendered — R2 applies to it as a matter of hygiene. |
| V12 File Resources | **yes, by prohibition** | D-18: no filesystem, in any specifier form. That is the strongest possible answer to the category and is what removes Phase 7's SC3 traversal fixture suite from having a subject. |
| V13 API / Web Service | **yes** | New RPCs on `sdk.api.register`, typed through `Spec` and rejecting duplicate names `[VERIFIED: packages/backend/src/api/spec.ts:397-402 and packages/backend/src/index.ts:438-449]`. `FRONTEND_CONTRACT_VERSION = 4` at `packages/frontend/src/api/client.ts:117` and `CONTRACT_VERSION` on the backend are compared at runtime — **both must be bumped together** when the scan endpoints land. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Operator HTTPQL clause widens the scan into a full-history body pull | Denial of Service | O-06's composition order + validator; the push-down is an optimisation and `admit()` remains the gate |
| HTTPQL comment (`//`, `/* */`) comments out DefMiner's narrowing clause | Tampering | Operator clause is **last**; a trailing comment then unbalances the parens and `execute()` throws — fail closed |
| Backfill of an out-of-scope host writes rows the operator never authorised | Elevation of Privilege | D-07: no override; `admit()` axis 5 is Caido's own engine |
| Unthrottled backfill drops live traffic (drop-oldest at cap) | Denial of Service | D-01's watermark, derived from `QUEUE_CAP` and `EVENTS_DELIVERED_UNDER_BLOCK` |
| Target-controlled URL or content-type rendered as markup on the new tab | Tampering / XSS | 05-UI-SPEC R1 — `v-html` banned by lint on every file, no per-line disable; slicing not markup for highlights |
| Bidi override in a URL makes `evil.com` render as `moc.live` in the Scan tab | Spoofing | 05-UI-SPEC R2 step 2, plus `font-mono` |
| Server path (with the operator's OS username) crosses the RPC | Information Disclosure | `PATH_REDACTION` + `telemetry.spec.ts:402-412`; D-19 removes the surface entirely |
| A hosted file, once created, is permanent and unreclaimable | Information Disclosure | D-17 declines the surface; D-18 makes it unreachable in every spelling |
| A `scans` row leaks another project's state | Information Disclosure | `project_id` in every PK and in every WHERE, enforced statically by `sql-discipline.spec.ts` |
| A path traversal from a malicious sourcemap `sources` entry | Tampering | Removed from having a subject by D-17/D-18 — Phase 7's SC3, dissolved rather than mitigated |
| The matrix harness touches the operator's live Caido on 8080 | Tampering / Destruction | `instance.sh` gate 2 refuses 8080 unconditionally and never kills a process it did not start. **The Docker legs must inherit an equivalent refusal**, including refusing to publish onto 8080 and refusing to reuse an existing container name |
| A live probe writes into the Phase 0 results directory and flips five tripwires | Repudiation | D-21's separate constant **and** a separate results path; the matrix schema is a sibling, not a reuse |

---

## Sources

### Primary (HIGH confidence)

- `node_modules/.pnpm/@caido+quickjs-types@0.26.0/.../src/caido/{requests,shared,hostedFile,runtime,scope,projects,environment,net}.d.ts` and `src/extra/os.d.ts` — read in full this session
- `node_modules/.pnpm/@caido+sdk-backend@0.57.1/.../src/typing.d.ts` — the complete `SDK` interface and `MetaSDK`
- `packages/backend/src/store/{migrations,retention,settings,schema.spec,sql-discipline.spec}.ts`
- `packages/backend/src/{hooks/admit,ingest/consumer,telemetry,compat,api/spec,index,outbound-prohibition.spec}.ts`
- `packages/engine/src/{queue,thresholds,thresholds.generated,contract,contract.spec}.ts`
- `packages/frontend/src/{App.vue,stores/coalescer.ts,components/settings-contract.ts}`
- `packages/backend/test/fixtures/sqlite-fixture.ts`
- `scripts/spike/instance.sh`, `scripts/ci/check-bundle-imports.mjs`, `eslint.config.js`, `vitest.config.ts`, `package.json`
- `.planning/phases/00-runtime-reality-check/results/{SPIKE-08.json,SPIKE-11.json,spike-result.schema.json}`
- `.planning/{REQUIREMENTS.md,ROADMAP.md,STATE.md}`, `.planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md`, `.planning/research/CODEX-CONTRAST.md`
- Docker Hub registry v2 API — tag list, manifests, and the image config blob for `caido/caido:0.58.2` linux/arm64
- npm registry — `@caido/quickjs-types` version and full `versions` array
- `/Applications/Caido.app/Contents/Resources/bin/caido-cli --version` and `docker --version`, executed this session

### Secondary (MEDIUM confidence)

- `https://docs.caido.io/app/reference/httpql` — the HTTPQL grammar. Authoritative, and **internally
  self-contradictory on AND/OR precedence** (recorded verbatim in § O-06)
- `https://docs.caido.io/app/guides/docker` — data path, uid/gid, no-volume ephemerality. Authoritative,
  and **stale on architecture** (contradicted by the registry manifest)
- `https://developer.caido.io/plugins/reference/sdks/backend/requests.html` — mirrors the typings; says
  nothing about cursor lifetime

### Tertiary (LOW confidence)

- General GraphQL cursor-pagination conventions (Relay Connections spec and commentary) — consulted for
  O-04 and **deliberately not used**: a convention is not a statement about Caido's implementation, and
  the absent-evidence rule forbids converting it into one.

---

## Metadata

**Confidence breakdown:**

- **SDK surface (typings):** HIGH — every claim quotes a file and line range read this session, and the
  installed version is confirmed latest on npm.
- **Codebase constraints (schema, gates, thresholds, coalescer, harness):** HIGH — same basis; four
  CONTEXT.md premises corrected against the files.
- **O-05 (Docker pinning):** HIGH — manifests fetched, HTTP 200 pasted, image config read from the
  registry.
- **O-02 (deployment introspection):** HIGH on what the SDK exposes (complete member lists quoted);
  MEDIUM on the marker-row recommendation, which is a design proposal, not a measurement.
- **O-03 and O-06 (HTTPQL):** MEDIUM — the grammar is cited from the official reference and the
  precedence contradiction is quoted verbatim, but Caido's `req.ext` / `req.path` / `cont`
  implementations are not measured. The fixture suite is specified precisely because of that.
- **O-04 (cursor lifetime):** **NOT MEASURED.** Reported as an absence, with a four-line probe named
  and a design that does not depend on the answer.
- **O-07 (`Body.length` on the read paths):** **NOT MEASURED.** SPIKE-08 measured the hook only, quoted
  verbatim. A shipped instrument (`byteLenMismatch`) plus one probe run settles the `get()` half; one
  more assertion settles the `query()` half.
- **O-01 (SQLite vs files for reconstructed source):** LOW as a measurement, MEDIUM as an argument. The
  memory projection is explicitly not derivable from `RSS_BYTES_PER_INPUT_BYTE`, and QUAL-06 says it
  cannot be measured in-runtime at all. The external-RSS probe is named and assigned to Phase 7.

**Research date:** 2026-08-31
**Valid until:** 2026-09-14 for the SDK and codebase findings (stable, pinned). **2026-09-07 for the
version findings** — the desktop app moved from 0.57.1 to 0.58.2 without anyone noticing, and Caido
ships roughly monthly. Re-run `/Applications/Caido.app/Contents/Resources/bin/caido-cli --version` and
re-check `caido/caido`'s tag list before the matrix runs.
</content>
</invoke>
