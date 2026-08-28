# Phase 05: Workspace & Operator Workflow — Pattern Map

**Mapped:** 2026-08-28
**Files analyzed:** 38 new/modified files (D-05 in-scope set only)
**Analogs found:** 21 / 38 (all 21 are backend/engine; **0 of 17 frontend files have an in-repo analog — there is no frontend package**)

> **Scope.** This map covers only what D-05(1) and D-05(4) put in scope: plan 05-01 (frontend
> workspace + shell + settings surface), plan 05-02 (tables — keyset, virtualised, filtered,
> coalesced) over the shipped `artifacts` / `observations` tables, the safety + export half of
> 05-05, the `audit` table (STORE-08), the retry path (OPS-03), and the entity read contract
> published as a TypeScript type in `packages/engine/`.
> **Deliberately unmapped:** 05-03 in full, the triage/suppression halves of 05-04, and the
> Findings-projection half of 05-05. They key on `entities` / `evidence`, which do not exist.
> Do not infer file names for them from this document.

---

## File Classification

### Backend — strong in-repo analogs

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/backend/src/store/reads.ts` **(NEW)** | store / query module | CRUD read, keyset pagination | `packages/backend/src/store/observations.ts` (`LIST_OBSERVATIONS_SQL` / `LIST_OBSERVATIONS_FOR_DIGEST_SQL` — two complete literals chosen between) | **exact** |
| `packages/backend/src/store/reads.spec.ts` **(NEW)** | test | fixture-driven unit | `packages/backend/src/store/artifacts.spec.ts` | exact |
| `packages/backend/src/store/audit.ts` **(NEW)** | store / write module | event-driven append-only | `packages/backend/src/store/settings.ts` (`putSetting`) + `analyses.ts` (`CLAIM_ANALYSIS_SQL`, `DO NOTHING`) | **exact** |
| `packages/backend/src/store/audit.spec.ts` **(NEW)** | test | unit | `packages/backend/src/store/observations.spec.ts` | exact |
| `packages/backend/src/store/retry.ts` **(NEW)**, or new exports inside `analyses.ts` | store / write module | request-response state transition | `packages/backend/src/store/analyses.ts` (`claimAnalysis` insert-then-read, `finishAnalysis`) | **exact** |
| `packages/backend/src/store/retry.spec.ts` **(NEW)** | test | unit | `packages/backend/src/store/artifacts.spec.ts` | exact |
| `packages/backend/src/store/export.ts` **(NEW)** — row → CSV/JSON serialiser over `observations` | service | batch transform | `packages/backend/src/store/observations.ts` reads + `packages/engine/src/csv.ts` (new) for the field rule | role-match |
| `packages/backend/src/store/migrations.ts` **(MODIFY)** — step v3: `audit` + keyset indexes | migration | DDL ladder | itself, step v2 | **exact (extend, never edit v1/v2)** |
| `packages/backend/src/store/schema.spec.ts` **(MODIFY)** — `EXPECTED_TABLES` + `COLUMN_ALLOWLIST` for `audit` | static gate | — | itself | **exact** |
| `packages/backend/src/store/retention.ts` **(MODIFY)** — D-06 audit age exemption | service | batch sweep | itself (`sweepRetention`, per table per project) | **exact** |
| `packages/backend/src/store/retention.spec.ts` **(MODIFY)** | test | unit | itself | exact |
| `packages/backend/src/store/sql-discipline.spec.ts` **(MODIFY)** — widen for CTE / `INSERT…SELECT` / unscoped subquery / `UNION` arm / fragment composition | static AST gate | — | itself | **exact** |
| `packages/backend/src/index.ts` **(MODIFY)** — new RPC registrations, event emit, typed spec | entry / route registration | request-response + pub-sub | itself (`init()` ordering contract, four `sdk.api.register` calls) | **exact** |
| `packages/backend/src/index.spec.ts` **(MODIFY)** | test | unit | itself | exact |
| `packages/backend/src/api/spec.ts` **(NEW)** — `DefinePluginPackageSpec` typed API + events | type-only contract | — | `packages/backend/src/store/analyses.ts` `SCAN_STATES` / `ScanState` (closed vocabulary exported as a type) | role-match |

### Engine — strong in-repo analogs

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `packages/engine/src/sanitise.ts` **(NEW)** — C0/C1 + bidi strip, grapheme-safe truncate | utility (pure) | transform | `packages/engine/src/decode.ts` | **exact** |
| `packages/engine/src/sanitise.spec.ts` **(NEW)** | test | unit | `packages/engine/src/decode.spec.ts` | exact |
| `packages/engine/src/csv.ts` **(NEW)** — formula neutralisation then quote-wrap | utility (pure) | transform | `packages/engine/src/decode.ts` | exact |
| `packages/engine/src/csv.spec.ts` **(NEW)** | test | unit | `packages/engine/src/decode.spec.ts` | exact |
| `packages/engine/src/contract.ts` **(NEW)** — D-05(2) entity read contract | type-only contract | — | `packages/engine/src/thresholds.ts` + `analyses.ts` `SCAN_STATES` | role-match |
| `packages/engine/package.json` **(MODIFY)** — three new `exports` entries | config | — | itself | exact |

### Frontend — **no in-repo analog exists**

`packages/` holds only `backend` and `engine`; `packages/caido.config.ts` declares a single
`{ kind: "backend" }` plugin. There is no `.vue` file, no Vue dependency, no PostCSS pipeline, and
`eslint.config.js` explicitly ships `vue: false` and `compat: false` with a comment deferring both
to Phase 5. For every row below the honest answer is *no analog* — the reference is
`05-RESEARCH.md § Architecture Patterns` / `§ Code Examples` and `05-UI-SPEC.md`, not this repo.
The two exceptions are the **gate** files, which have very strong in-repo analogs.

| New File | Role | Data Flow | Analog | Match Quality |
|---|---|---|---|---|
| `packages/frontend/package.json`, `vite.config.ts`, `tsconfig.json`, `postcss.config.cjs`, `tailwind.config.ts` | config | — | `packages/backend/package.json` (manifest shape / `private`+`workspace:*` only) | none (config shape only) |
| `packages/frontend/src/index.ts` — `init(sdk)`, mount, `addPage`, `registerItem` | entry / provider | request-response | `packages/backend/src/index.ts` (**ordering-contract discipline only**, not the code) | partial |
| `packages/frontend/src/App.vue` | component | — | none | none |
| `packages/frontend/src/components/ArtifactsTable.vue`, `ObservationsTable.vue` | component | streaming/windowed read | none | none |
| `packages/frontend/src/components/SettingsPanel.vue` (UI-08 + the two P1-D5 debts) | component | CRUD | none (its **data source** is `store/settings.ts`) | none |
| `packages/frontend/src/components/ExportDialog.vue` (UI-06, D-04) | component | file-I/O (Blob) | none | none |
| `packages/frontend/src/components/HealthPanel.vue` / compat-refusal surface | component | request-response | none (its data source is `telemetry.ts:slimStatus()` + `getCompat`) | none |
| `packages/frontend/src/stores/inventory.ts` (2,000-row window, cursor) | store (pinia) | streaming | none | none |
| `packages/frontend/src/stores/coalescer.ts` + `.spec.ts` (UI-07) | store | event-driven / pub-sub | none | none |
| `packages/frontend/src/safety/display.ts` (re-assert R2 in the DOM) | utility | transform | `packages/engine/src/sanitise.ts` (new, shared) | role-match once written |
| `packages/frontend/src/safety/hostile.spec.ts` | test (jsdom) | fixture | none | none |
| `packages/frontend/src/styles/index.css` | config | — | none | none |
| **`packages/frontend/src/frontend-safety.spec.ts`** (R1 AST gate) | **static AST gate** | — | **`packages/backend/src/store/sql-discipline.spec.ts`** + `packages/engine/src/boundary.spec.ts` | **exact** |
| `scripts/ci/prefixwrap.spec.ts`, `scripts/ci/frontend-externals.spec.ts` | build-output gate | — | `scripts/ci/check-bundle-imports.spec.ts` (+ `.mjs`) | **exact** |
| `tests/frontend-load.spec.ts` (10,000-row backstop) | e2e backstop | — | `tests/phase1-load.spec.ts` | role-match |
| `packages/caido.config.ts` **(MODIFY)** — add `{ kind: "frontend", … }` | config | — | itself | exact |
| `eslint.config.js` **(MODIFY)** — `vue: true`, `vue/no-v-html: "error"`, `no-eval`, `no-new-func`, `noInlineConfig`, browserslist | config | — | itself | exact |
| `vitest.config.ts` **(MODIFY)** — `plugins: [vue()]`, **no `projects` key** (P2-D4) | config | — | itself | exact |

---

## Pattern Assignments

### `packages/backend/src/store/reads.ts` (store, keyset CRUD read)

**Analog:** `packages/backend/src/store/observations.ts` — it is already the two-literal pattern
O-01 recommends generalising.

**Imports + module header** (`artifacts.ts:1-16`, `observations.ts` mirrors it) — every store module
opens with a header stating the driver constraint, then exactly two imports:

```ts
import type { Database } from "sqlite";

import { describeError } from "../telemetry";
```

Plus the mandatory cross-reference comment every store module after `artifacts.ts` carries verbatim
(`settings.ts:18-21`, `migrations.ts:16-19`):

```ts
// Caught exceptions render through `describeError`, never a bare stringification.
// The reasoning — a driver rejection carries the bound parameters, and one of them
// is the observation URL — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`.
```

**Core pattern — two complete literals chosen between, never one assembled string**
(`observations.ts:590-635`). This comment is the load-bearing precedent for O-01's fixed matrix and
should be quoted in the plan:

```ts
// TWO COMPLETE LITERAL STATEMENTS, chosen between — never one string assembled
// from a condition. Concatenating a fragment onto SQL at runtime is the exact
// shape `sql-discipline.spec.ts` fails, and writing the digest filter as an
// optional clause would have made this module the first exception to a rule whose
// value is that it has none.
const LIST_OBSERVATIONS_SQL = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ?
ORDER BY observed_at DESC, request_id ASC
LIMIT ?
`;

const LIST_OBSERVATIONS_FOR_DIGEST_SQL = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ? AND sha256 = ?
ORDER BY observed_at DESC, request_id ASC
LIMIT ?
`;

export async function listObservations(
  db: Database,
  projectId: string,
  sha256?: string,
  limit: number = OBSERVATION_LIST_DEFAULT_LIMIT,
): Promise<ObservationRow[]> {
  if (sha256 === undefined) {
    const stmt = await db.prepare(LIST_OBSERVATIONS_SQL);
    return stmt.all<ObservationRow>(projectId, limit);
  }
  const stmt = await db.prepare(LIST_OBSERVATIONS_FOR_DIGEST_SQL);
  return stmt.all<ObservationRow>(projectId, sha256, limit);
}
```

**Copy exactly:** prepare **inside** the call (never module scope), positional `?` spread into
`.all(...)`, `LIMIT ?` always bound, `project_id = ?` first in every `WHERE`.
**Extend, do not replace:** the object-lookup selector (`ARTIFACT_READS[sort].first|next`) from
`05-RESEARCH.md § Pattern 1`, and the `{ rows, nextCursor, scanned, exhausted }` return shape the
bounded candidate window forces.

**Row type declared, never inferred** (`artifacts.ts:117-127`):

```ts
/** One artifact row, as it is stored. Declared rather than inferred so the reads
 *  below and every consumer agree on the shape without re-deriving it. */
export type ArtifactRow = {
  project_id: string;
  sha256: string;
  /* … */
};
```

**Bounded default limit with its reason** (`artifacts.ts:129-138`) — the new page reads need the
same constant-with-rationale, because `LIMIT` is the only cost bound the plugin controls:

```ts
/**
 * A read with NO limit is a read whose cost is set by the target, not by us: this
 * database is never garbage-collected by Caido and survives a force-reinstall …
 */
export const ARTIFACT_LIST_DEFAULT_LIMIT = 500;
```

**Deterministic tie-break — and the one place the new code must deliberately diverge**
(`artifacts.ts:148-160`): the shipped statements use `ORDER BY last_seen_at DESC, sha256 ASC`. A
row-value cursor requires a **uniform** direction. The new paginated literals are *separate
statements*; the shipped ones are not edited. State that divergence in the module header, in the
same voice as the existing headers.

**Error handling:** the list reads deliberately do **not** try/catch — only writes do
(`upsertArtifact`). Follow that split; do not add a catch to a read.

---

### `packages/backend/src/store/audit.ts` (store, append-only event write — STORE-08)

**Analog:** `packages/backend/src/store/settings.ts:28-54` for the write shape,
`packages/backend/src/store/analyses.ts:106-114` for `DO NOTHING` on a claim-like insert.

**Write pattern to copy verbatim in structure** (`settings.ts:28-54`):

```ts
// One statement, idempotent on the natural key (project_id, key) — the same write
// shape as every other mutation in this package, for the same reason: this driver
// has no transaction primitive, so no invariant may require two statements.
const PUT_SETTING_SQL = `
INSERT INTO settings (project_id, key, value, updated_at)
VALUES (?, ?, ?, ?)
ON CONFLICT (project_id, key) DO UPDATE SET
  value      = excluded.value,
  updated_at = excluded.updated_at
`;

export async function putSetting(
  db: Database, projectId: string, key: string, value: string, nowMs: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(PUT_SETTING_SQL);
    const res = await stmt.run(projectId, key, value, nowMs);
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}
```

`audit` is append-only, so the conflict clause is `DO NOTHING` (the `claimAnalysis` shape,
`analyses.ts:106-114`), keyed on `(project_id, event_id)` with `event_id` from
`crypto.randomUUID()`. The `detail` column is redacted through `describeError` before binding.

**Result type to reuse, not redeclare** (`artifacts.ts:18-27`) — import `StoreWriteResult` from
`./artifacts` exactly as `settings.ts:23` does:

```ts
export type StoreWriteResult =
  | { ok: true; changes: number }
  | { ok: false; error: string };
```

**Closed vocabulary pattern for `kind`** (`analyses.ts:58-65` + the `scan_state` CHECK in
`migrations.ts:113`) — a CHECK constraint in DDL *and* an exported `as const` array + derived type:

```ts
export const SCAN_STATES = [ /* 'pending' | 'running' | … */ ] as const;
export type ScanState = (typeof SCAN_STATES)[number];
```

---

### `packages/backend/src/store/migrations.ts` (MODIFY — step v3)

**Analog:** its own step v2 (`migrations.ts:100-138`).

**Non-negotiable rules stated in its own header** (`migrations.ts:1-10`, `21-46`):

- *"SHIPPED STEPS ARE IMMUTABLE."* v3 is a **new array entry**; v1 and v2 are not touched.
- Every statement is `IF NOT EXISTS`, which is *the only reason* batching DDL into one `exec` is
  legal — `an exec that FAILS leaves an open write transaction on a pooled connection`.
- Tables created after v1 carry `CHECK (length(project_id) > 0)` inline (v2 style), not a trigger.

**Shape to copy** (`migrations.ts:105-128`):

```ts
  {
    v: 2,
    sql: `
CREATE TABLE IF NOT EXISTS analyses (
  project_id        TEXT    NOT NULL CHECK (length(project_id) > 0),
  …
  scan_state        TEXT    NOT NULL CHECK (scan_state IN ('pending', 'running', 'done', 'partial', 'failed')),
  PRIMARY KEY (project_id, sha256, detector_set_hash)
);
CREATE INDEX IF NOT EXISTS idx_analyses_state
  ON analyses (project_id, scan_state, started_at);
`,
  },
```

Step v3 carries: the `audit` DDL from `05-RESEARCH.md § O-03` (with `event_id`, **never** `id`) and
the direction-explicit keyset indexes from `§ Pattern 1`
(`ON artifacts (project_id, last_seen_at DESC, sha256 DESC)`), because a mismatched index direction
buys a `USE TEMP B-TREE FOR LAST TERM OF ORDER BY`.

**`SCHEMA_VERSION` is derived, not literal** (`migrations.ts:252`) — adding the entry is the whole
version bump:

```ts
export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].v;
```

---

### `packages/backend/src/store/schema.spec.ts` (MODIFY — two-place edit)

**Analog:** itself. Research P-09: *adding a table is a deliberate two-place edit and an
operator-visible one.*

`schema.spec.ts:32` — the exact set:

```ts
/** The four tables the operator approved at plan 01-01's one-way checkpoint
 *  (option-a, 2026-08-20). Exactly these, in this order. */
const EXPECTED_TABLES = ["analyses", "artifacts", "observations", "settings"];
```

`schema.spec.ts:384-415` — the per-table column allowlist, which must gain an `audit` entry:

```ts
const COLUMN_ALLOWLIST: Record<string, string[]> = {
  artifacts: ["project_id", "sha256", "byte_len", "kind", "first_seen_at", "last_seen_at", "seen_count"],
  …
  settings: ["project_id", "key", "value", "updated_at"],
};
```

`schema.spec.ts:419-427` — the forbidden map the `audit` shape must survive. This is why the
research names the column `event_id`:

```ts
const FORBIDDEN_COLUMNS: Record<string, string> = {
  value_raw: "SEC-04 — a finding's raw value is never stored; HMAC fingerprint plus redacted preview only",
  body: "T-01-21 — no column may hold a response body",
  headers: "T-01-21 — no column may hold header values",
  cookie: "T-01-21 — no column may hold cookies",
  authorization: "T-01-21 — no column may hold authorization material",
  id: "no surrogate id anywhere: last_insert_rowid() is unusable on the pooled connection (decision P1-D1)",
};
```

The `EXPECTED_TABLES` header sentence ("the tables the operator approved at plan 01-01's one-way
checkpoint") means the planner must route the `audit` addition through an operator-visible step, not
slip it into a task.

---

### `packages/backend/src/store/retention.ts` (MODIFY — D-06 audit exemption)

**Analog:** itself. Bounds are **per table per project** and stated so in a comment
(`retention.ts:168-172`). Every candidate query is oldest-first with an explicit tie-break
(`retention.ts:113-133`):

```ts
// Every one of these orders OLDEST FIRST with an explicit tie-break, so a capped
// pass and the pass that resumes it agree on which rows come next.
const ARTIFACTS_OVER_AGE_SQL = `
SELECT sha256 FROM artifacts
WHERE project_id = ? AND last_seen_at < ?
ORDER BY last_seen_at ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_OLDEST_SQL = `
SELECT sha256 FROM artifacts
WHERE project_id = ?
ORDER BY last_seen_at ASC, sha256 ASC
LIMIT ?
`;
```

**D-06 requires the exception to be visible in this code, not implicit.** Concretely: `audit` gets
an `AUDIT_OLDEST_SQL` (row bound) and **no** `AUDIT_OVER_AGE_SQL`, with a header comment in the same
voice as the existing ones stating that the age bound is deliberately absent and why — an audit
trail that silently ages out cannot answer "when did I project this permanent Finding". The
raised row cap is a named constant beside `DEFAULT_RETENTION_MAX_ROWS`.

**Failure discipline to copy** (`retention.ts:255-300`): the sweep never throws; a failing delete is
counted and the pass continues. The reserved `projectId === ""` scope returns an empty summary.

---

### `packages/backend/src/store/retry.ts` (OPS-03, over `analyses.scan_state`)

**Analog:** `packages/backend/src/store/analyses.ts:106-200`.

**Insert-then-read, because the driver cannot tell you what it wrote** (`analyses.ts:135-172`):

```ts
/**
 * INSERT-then-READ, and the read is not defensive padding: there is no
 * `RETURNING` on this driver and `last_insert_rowid()` is unusable on the pool, so
 * a write cannot tell you what it wrote. The read is the ONLY way to learn the
 * row's state.
 */
export async function claimAnalysis(…): Promise<AnalysisClaim> {
  try {
    const insert = await db.prepare(CLAIM_ANALYSIS_SQL);
    await insert.run(projectId, sha256, detectorSetHash, startedAt);
    const read = await db.prepare(GET_ANALYSIS_SQL);
    const row = await read.get<AnalysisRow>(projectId, sha256, detectorSetHash);
    return { ok: true, claimed: row !== undefined && Number(row.started_at) === startedAt, state: row?.scan_state };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}
```

**Fully-bound single-statement update** (`analyses.ts:174-181`) — the retry transition copies this
exactly, adding a `scan_state IN (…)` guard so retry can only move a row *out of* a terminal
`failed`/`partial` state:

```ts
// ONE statement, and the key is fully bound so it can only ever touch the row the
// caller claimed. `project_id` is in the predicate for the same reason it is in
// the key (T-01-20).
const FINISH_ANALYSIS_SQL = `
UPDATE analyses
SET scan_state = ?, finished_at = ?, max_slice_ms = ?, bytes_walked = ?, error = ?
WHERE project_id = ? AND sha256 = ? AND detector_set_hash = ?
`;
```

**Vocabulary:** import `SCAN_STATES` / `TERMINAL_SCAN_STATES` from `analyses.ts`. Do not restate the
five strings anywhere — including in frontend badge code.

---

### `packages/backend/src/index.ts` (MODIFY — RPC surface + events)

**Analog:** itself.

**Registration site** (`index.ts:306-314`) — the new endpoints go here, in this shape, resolving the
project id and failing closed when it or `db` is absent:

```ts
    sdk.api.register("getStatus", () => ({ ...status(), caidoVersion }));
    sdk.api.register("getCompat", () => compatReport(caidoVersion));
    sdk.api.register("getArtifacts", async () => {
      const pid = currentProjectId();
      if (!db || pid === null) return [];
      return listArtifacts(db, pid);
    });
```

**Duplicate-registration hazard, stated in the file's own comment** (`index.ts:156-161`) — the
phase's growing RPC surface is registered on the success path *and* partially on three refusal
paths (lines 177-181, 248-249, 281-282, 306-314, 338):

```
// `api.register` rejects a duplicate name, which is exactly what a re-init hits.
```

Any new endpoint added to more than one path needs the `try { … } catch { /* already registered */ }`
guard the failure path already uses (`index.ts:337-342`).

**The COMPAT-01 debt this phase discharges** (`index.ts:175-181`):

```ts
      // getStatus is the ONLY thing registered. No hook, no database. COMPAT-01's
      // "clear message" is this log line plus this RPC; the visible surface is owed
      // to Phase 5 (decision P1-D5).
```

**`init()` ordering contract** (`index.ts:1-32`) — the header enumerates steps 1…8 and step 8 is
*"ONLY THEN register onInterceptResponse"*. Any new registration is inserted before step 7's
`setPassiveReady(true)`, and the whole body stays inside the one `try`, because *"a throw that
escapes init() is invisible on this runtime."*

**Typing:** `sdk` is `any` today. `05-RESEARCH.md § Code Examples #2` supplies the
`DefinePluginPackageSpec` replacement — **not** `DefineAPI`/`DefineEvents`, both `@deprecated` in the
pinned `@caido/sdk-shared@0.2.2`. There is no in-repo analog for this; it is new.

---

### `packages/engine/src/sanitise.ts` and `csv.ts` (pure utilities)

**Analog:** `packages/engine/src/decode.ts`.

**Module-header pattern** (`decode.ts:1-21`) — engine modules open with a banner naming the
requirement, the measurement behind the rule, and the consequence of getting it wrong:

```ts
// packages/engine/src/decode.ts — bytes to text, for HUMAN READING ONLY.
//
// ===========================================================================
// OFFSETS AND HASHES DERIVE FROM RAW BYTES. NEVER FROM TEXT. (ENC-01)
// ===========================================================================
```

`sanitise.ts`'s equivalent banner states the two facts the phase turns on: **strip before truncate**
(R2), and **`Intl.Segmenter` is a browser API and is not in Caido's QuickJS global set** — so the
grapheme path is frontend-only and the backend caps by code point. `decode.ts:26-35` is the
precedent for recording a measured runtime absence in a header rather than assuming it.

**SDK-free by construction.** `packages/engine/package.json` has no Caido dependency and
`packages/engine/src/boundary.spec.ts:1-27` enforces that with four independent mechanisms
(eslint scope, tsconfig `types`, an AST scan, and a manifest assertion). New engine modules inherit
all four for free — and `contract.ts` **must** live here for exactly that reason (D-05(2)).

**Manifest edit** (`packages/engine/package.json`) — each new module needs an explicit `exports`
entry; there is no barrel and no wildcard:

```json
  "exports": {
    "./chunker": "./src/chunker.ts",
    "./decode": "./src/decode.ts",
    …
  }
```

---

### `packages/backend/src/store/*.spec.ts` (unit tests)

**Analog:** `packages/backend/src/store/artifacts.spec.ts` / `observations.spec.ts`, both driven
from the shared fixture `test/fixtures/sqlite-fixture` (imported by `schema.spec.ts:25`). Reuse that
fixture; do not stand up a second harness.

---

### `packages/frontend/src/frontend-safety.spec.ts` (static AST gate — **the strongest analog in the repo**)

**Analog:** `packages/backend/src/store/sql-discipline.spec.ts`, with
`packages/engine/src/boundary.spec.ts` as the second reference.

**Why static, stated in the header** (`sql-discipline.spec.ts:1-23`) — the identical argument
applies to `v-html`/`innerHTML`/`eval`, and it is why the research calls this gate *"stronger than
lint"* (P-01: `vue/no-v-html` is only `warn` in the shipped preset):

```ts
// WHY THIS IS STATIC AND NOT A RUNTIME TEST.
//
// Every failure mode below is SILENT. … So a behavioural test only catches these
// where somebody thought to write one, whereas reading the SOURCE catches every
// call site including the ones written next year.
//
// Parsed with the TypeScript compiler rather than acorn …
//
// The gate's core is a PURE function over (filename, source), so every rule below
// has its FAILING path executed against a synthetic fixture in this same file. A
// gate whose failure path has never run is a gate nobody has tested.
```

**Four structural elements to copy exactly:**

1. **Recursive package walk, excluding specs** (`sql-discipline.spec.ts:46-60`):

```ts
function backendFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".spec.ts")) {
        out.push(full);
      }
    }
  };
```

   The frontend gate must also match `.vue`, and must state how SFC `<template>` blocks are reached
   — a `.ts`-only walk over a Vue package is the "gate that measures an empty set" failure this file
   already guards against.

2. **An exported pure `auditSource(file, source) → { violations, sqlStrings }`**
   (`sql-discipline.spec.ts:65,152`), with `type Violation = { file: string; rule: string; detail: string }`.
   Exported so probes can drive it directly — which is exactly how `05-RESEARCH.md § O-01`'s
   twenty-four probes were run.

3. **Non-vacuity assertions** (`sql-discipline.spec.ts:307-390`): a non-empty file set, a named list
   of modules that must be audited (so a rename is a visible change), a proof the walk **descended**,
   and a proof the gate found something to audit.

4. **Every rule's failing path executed against a synthetic fixture**
   (`sql-discipline.spec.ts:410-444`):

```ts
describe("the gate's own failure paths", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).violations.map((v) => v.rule);

  it("fails on a bind call given a single ARRAY argument", () => {
    expect(rulesOf("await stmt.run([projectId, sha256]);")).toContain("array-bind");
    // And PASSES on the correct spread form, so the rule distinguishes the two.
    expect(rulesOf("await stmt.run(...params);")).not.toContain("array-bind");
  });
```

   Note the paired positive/negative assertion — every frontend rule (`v-html`, `innerHTML`,
   `outerHTML`, `insertAdjacentHTML`, `document.write`, `new Function`, `eval`) needs both halves.

**The same file is the analog for the O-01 gate-widening task.** The allowlist precedent
(`sql-discipline.spec.ts:480-500`) shows how an exemption is scoped *and proved to be exercised*:

```ts
  it("the PRAGMA exemption is scoped to migrations.ts and to that PRAGMA", () => {
    const pragma = "await db.exec(`PRAGMA user_version = ${m.v}`);";
    expect(rulesOf(pragma, "migrations.ts")).not.toContain("interpolated-sql");
    // Same code in any other module is NOT exempt.
    expect(rulesOf(pragma, "artifacts.ts")).toContain("interpolated-sql");
  });
```

---

### `scripts/ci/prefixwrap.spec.ts` and `frontend-externals.spec.ts` (build-output gates)

**Analog:** `scripts/ci/check-bundle-imports.spec.ts` (+ `check-bundle-imports.mjs`).

**The pattern** (`check-bundle-imports.spec.ts:1-45`): the *gate* is a standalone `.mjs` run as a
subprocess against a **built artifact**, and the *spec* asserts on its exit code and printed output
against deliberately-broken fixtures — never on an internal:

```ts
// A gate whose failure path has never executed is the shape of every Phase 0
// verification defect: "the prose stated a rule correctly, and the gate checked
// less than the prose claimed" (.planning/STATE.md). So this file runs the gate
// as a subprocess — the same way CI does — and asserts on its exit code and its
// printed output, not on any internal it could be lying about.
…
const GATE = "scripts/ci/check-bundle-imports.mjs";
const BUNDLE = "packages/backend/dist/index.js";

function runGate(...args: string[]) {
  const r = spawnSync(process.execPath, [GATE, ...args], { cwd: REPO_ROOT, encoding: "utf8" });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}
```

Its fifth fixture — *"missing file — a gate that cannot find its target must never report success"* —
is the one most easily forgotten by a CSS gate that globs and finds nothing.
`05-UI-SPEC.md`'s "assert on the **build output**, not the config" is this exact pattern.
Note also that `check-bundle-imports.mjs` parses the built bundle with **acorn**, while every
TypeScript-source gate uses the TypeScript compiler (`boundary.spec.ts:23-27` states the split).

---

### `packages/caido.config.ts` (MODIFY — add the frontend plugin entry)

**Analog:** itself (`packages/caido.config.ts:26-40`):

```ts
export default defineConfig({
  id: "defminer",
  …
  plugins: [
    { kind: "backend", id: "defminer-backend", name: "DefMiner Backend", root: "backend" },
  ],
});
```

Two constraints from its own header (`:11-24`): the schema is a `z.strictObject` — *"unknown keys
are REJECTED … Keep this minimal; do not invent keys"* — and the config must stay at `packages/`
because `@caido-community/dev@0.1.7` deletes `<cwd>/dist` wholesale after tsup writes
`<root>/dist/index.js`. **The frontend entry inherits that layout constraint**: `root: "frontend"`,
never `"."`.

---

## Shared Patterns

### Error redaction across every boundary
**Source:** `packages/backend/src/telemetry.ts:551-572`, `:233`, `:287`, `:73`
**Apply to:** every new backend store module, the export RPC, the audit `detail` column, and any
error string reaching the frontend.

```ts
export const ERROR_TEXT_LIMIT = 240;
export const URL_REDACTION = "<url-redacted>";
export const PATH_REDACTION = "<path-redacted>";

export function describeError(e: unknown): string {
  …
  const text = name === "" || body.startsWith(name) ? body : name + ": " + body;
  return redactSensitiveTokens(redactUrls(text)).slice(0, ERROR_TEXT_LIMIT);
}
```

**Redact BEFORE truncating** — `index.ts:325-334` states why: *"truncating first keeps the front
half, which is the half carrying the host."* Enforced statically over `packages/backend/src/store/`
by `error-redaction.spec.ts`, so a new store module is covered the moment it lands — and will fail
that gate if it uses `String(e)`.

### One idempotent statement per write
**Source:** `packages/backend/src/store/artifacts.ts:1-7`
**Apply to:** `audit.ts`, `retry.ts`, and any triage/suppression write designed (but not keyed) now.

```ts
// ONE statement per write, keyed on a natural key, safe to replay. There is no
// alternative on this driver: `BEGIN` does not span `exec` calls and every
// statement still returns SUCCESS, so code that LOOKS transactional passes every
// test and provides no atomicity whatsoever (Pitfall 2). No invariant here may
// require two statements to land together.
```

### Prepare inside the write, never at module scope
**Source:** `packages/backend/src/store/artifacts.ts:56-63`
**Apply to:** every new statement in `reads.ts`, `audit.ts`, `retry.ts`, `export.ts`.

> *"`sdk.meta.db()` is a pool over worker threads, so two `run()` calls on a shared Statement could
> land on different connections with interleaved bindings. And never a module-level PROMISE
> either."* Enforced as `module-scope-statement` / `module-scope-await`.

### Project scoping on every read and write
**Source:** `packages/backend/src/store/artifacts.ts:176-178`; enforced by
`sql-discipline.spec.ts`'s `unscoped-multi-row` rule and its mutation-derived test
(`:480-495`: *"project_id in the SELECT LIST is not scoping — only the predicate counts"*).
**Apply to:** every statement this phase adds, including aggregates behind the `{total}` copy.

### Deterministic tie-break on every list query
**Source:** `artifacts.ts:148-160` (`sha256 ASC`), `observations.ts:610-620` (`request_id ASC`),
`retention.ts:113-118`
**Apply to:** every paginated read — keyset pagination *depends* on this being a total order.

### Three-level settings resolution (project → global → documented default)
**Source:** `packages/backend/src/store/settings.ts:71-82`, `:121-129`
**Apply to:** the whole UI-08 settings surface. It was built three-level *for this phase* and needs
no call-site changes.

```ts
export async function resolveSetting(db, projectId, key): Promise<string | null> {
  const scoped = await getSetting(db, projectId, key);
  if (scoped !== null) return scoped;
  return getSetting(db, GLOBAL_PROJECT_ID, key);
}
```

Copy `boundOrDefault` too (`settings.ts:121-129`) — *"a stored bound is a STRING that some future UI
wrote; `Number("")` is 0 and `Number("abc")` is NaN, and either one silently applied as a retention
bound would delete everything."* That "future UI" is this phase.

### Closed vocabularies, exported once
**Source:** `analyses.ts:58-65` (`SCAN_STATES` / `ScanState` / `TERMINAL_SCAN_STATES`) with the
matching DDL `CHECK` in `migrations.ts:113`
**Apply to:** status badges, `audit.kind`, triage states, and the `contract.ts` triage enum. Never
restate a member string in a component.

### Every gate proves its own failure path and its own non-vacuity
**Source:** `sql-discipline.spec.ts:20-23` and `:307-330`; `check-bundle-imports.spec.ts:1-19`;
`boundary.spec.ts:1-27`
**Apply to:** `frontend-safety.spec.ts`, `prefixwrap.spec.ts`, `frontend-externals.spec.ts`, the
`schema.spec.ts` extension, and the `sql-discipline.spec.ts` widening. This is the single most
repeated convention in the repo and the planner should make it an explicit acceptance criterion on
every gate task.

### Test harness conventions
**Source:** `vitest.config.ts`
- `include` already matches `packages/*/src/**/*.spec.ts`, so `packages/frontend/src/**` is picked
  up with **no config change**.
- **No `projects` / `workspace` key (P2-D4)** — five files resolve the Phase 0 results directory
  from a bare relative literal. jsdom arrives via a per-file `// @vitest-environment jsdom`
  docblock; `.vue` imports need `@vitejs/plugin-vue` in `plugins`, which is a `plugins` addition,
  not a `projects` one.
- Shared SQLite fixture: `test/fixtures/sqlite-fixture` (see `schema.spec.ts:20-25`).

---

## No Analog Found

Everything in `packages/frontend/` other than the two gate files. The planner must use
`05-RESEARCH.md § Code Examples` #1 (page + sidebar registration), #3 (CSV field), `§ Pattern 2`
(sanitise), `§ Pattern 3` (highlight by slicing), `§ Pattern 4` (coalescing) and `05-UI-SPEC.md` as
the reference instead.

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `packages/frontend/*` (package manifest, `vite.config.ts`, PostCSS/Tailwind/prefixwrap pipeline) | config | — | No frontend package exists; `caido.config.ts` declares only `{ kind: "backend" }` |
| `packages/frontend/src/index.ts` | entry / provider | request-response | No Vue bootstrap, no `sdk.navigation` / `sdk.sidebar` call anywhere in the repo |
| `App.vue` and all `components/*.vue` | component | mixed | Zero `.vue` files exist; `eslint.config.js` ships `vue: false` |
| `stores/*.ts` (pinia window, coalescer, settings) | store | streaming / event-driven | No pinia, no frontend state layer, no `sdk.backend.onEvent` consumer |
| `safety/hostile.spec.ts` | test (jsdom) | fixture | No DOM test exists; `jsdom` and `@vue/test-utils` are not installed |
| `styles/index.css` | config | — | No CSS in the repo at all |
| `tests/frontend-load.spec.ts` | e2e backstop | — | `playwright@1.62.1` is installed but has no frontend to drive; `tests/phase1-load.spec.ts` is a partial shape analog only |
| `packages/backend/src/api/spec.ts` (`DefinePluginPackageSpec`) | type contract | — | The RPC surface is four untyped `sdk.api.register` calls against `sdk: any`; no typed contract exists to copy |

---

## Metadata

**Analog search scope:** `packages/backend/src/**`, `packages/engine/src/**`, `scripts/ci/**`,
`tests/**`, `packages/caido.config.ts`, `eslint.config.js`, `vitest.config.ts`
**Files scanned:** 42 (24 read in whole or in targeted part)
**Pattern extraction date:** 2026-08-28
