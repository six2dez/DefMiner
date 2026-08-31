# Phase 06: Retroactive Scan & Deployment Reality - Pattern Map

**Mapped:** 2026-08-31
**Files analyzed:** 34 (21 new, 13 modified)
**Analogs found:** 32 / 34

Every analog path below was checked with `git ls-files` and is tracked source. There is no
gitignored install/runtime mirror in this repo's analog set.

---

## File Classification

### New — backend

| New file | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/backend/src/scan/scans.ts` | model / table module | CRUD + state-transition | `packages/backend/src/store/audit.ts` (writes) + `packages/backend/src/store/retry.ts` (transitions) | exact |
| `packages/backend/src/scan/scans.spec.ts` | test | — | `packages/backend/src/store/retry.spec.ts`, `store/audit.spec.ts` | exact |
| `packages/backend/src/scan/producer.ts` | service | batch / drain-loop | `packages/backend/src/ingest/consumer.ts` | role+flow mirror |
| `packages/backend/src/scan/producer.spec.ts` | test | — | `packages/backend/src/ingest/consumer.spec.ts` | exact |
| `packages/backend/src/scan/filter.ts` | utility | transform (string composition) | `packages/backend/src/hooks/admit.ts` (closed vocabulary + no-regex header) | role-match |
| `packages/backend/src/scan/filter.spec.ts` | test | — | `packages/backend/src/hooks/admit.spec.ts` | exact |
| `packages/backend/src/scan/httpql-discipline.spec.ts` | static gate | AST walk over source | `packages/backend/src/store/sql-discipline.spec.ts` | exact |
| `packages/backend/src/scan/lifecycle.spec.ts` | test | state machine | `packages/backend/src/store/retry.spec.ts` + `packages/backend/src/lifecycle.spec.ts` | role-match |
| `packages/backend/src/filesystem-prohibition.spec.ts` | static gate | AST walk over source | `packages/backend/src/outbound-prohibition.spec.ts` | exact |

### New — frontend

| New file | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `packages/frontend/src/components/ScanPanel.vue` | component | request-response + event | `packages/frontend/src/components/HealthPanel.vue` | exact |
| `packages/frontend/src/components/ScanPanel.spec.ts` | test | — | `packages/frontend/src/components/HealthPanel.spec.ts` | exact |
| `packages/frontend/src/components/scan-lifecycle-presentation.ts` | contract module | lookup map | `packages/frontend/src/components/scan-state-presentation.ts` | exact |
| `packages/frontend/src/components/ScanLifecycleBadge.vue` | component | pure render | `packages/frontend/src/components/StatusBadge.vue` | exact |
| `packages/frontend/src/components/scan-contract.ts` (copy constants) | config | — | `packages/frontend/src/components/health-contract.ts` | exact |
| `packages/frontend/src/stores/scan-progress.ts` | store | event-driven / throttled | `packages/frontend/src/stores/coalescer.ts` | exact |
| `packages/frontend/src/stores/scan-progress.spec.ts` | test | — | `packages/frontend/src/stores/coalescer.spec.ts` | exact |

### New — harness and artifact gates

| New file | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `scripts/phase6/matrix-leg.sh` | script | process orchestration | `scripts/spike/instance.sh` | exact (native legs); **partial** for the Docker legs |
| `scripts/phase6/matrix.sh` | script | batch | `scripts/spike/ladder.sh` / `probe-run.sh` | role-match |
| `scripts/phase6/o07-body-length.sh` | script | measurement | `scripts/spike/make-encoded-fixtures.mjs` + `instance.sh` | role-match |
| `.planning/phases/06-…/results/matrix-result.schema.json` | config / schema | — | `.planning/phases/00-runtime-reality-check/results/spike-result.schema.json` | exact |
| `tests/phase6-matrix.spec.ts` | test (artifact gate) | file-I/O | `tests/phase1-load.spec.ts` (+ `tests/spike-results.spec.ts` for schema validation) | exact |
| `tests/phase6-pushdown.spec.ts` | test (fixture proof) | file-I/O | `tests/phase1-load.spec.ts` | role-match |

### Modified

| File | Role | Change | Analog for the change |
|---|---|---|---|
| `packages/backend/src/store/migrations.ts` | migration | add step **v5** (`scans` + indexes) and step **v6-or-same-step** for `audit.kind` | step v3 object, `migrations.ts:180-210` |
| `packages/backend/src/store/schema.spec.ts` | test | `EXPECTED_TABLES` 5→6, `COLUMN_ALLOWLIST` + no-BLOB check | its own `EXPECTED_TABLES` / `FORBIDDEN_COLUMNS` blocks |
| `packages/backend/src/store/retention.ts` + `.spec.ts` | service | `scans` sweep with D-26's state exemption | `retention.ts:200-257` (audit exemption, stated in code) |
| `packages/backend/src/ingest/consumer.ts` + `.spec.ts` | service | D-08 branch on `sweepRetention`'s return | `consumer.ts:740-760` sweep cadence block |
| `packages/backend/src/index.ts` + `.spec.ts` | controller | scan RPCs + D-11 startup sweep | `index.ts:306-311, 438-449` register site |
| `packages/backend/src/telemetry.ts` + `.spec.ts` | utility | retro sub-map inside the ONE `counters` object | `telemetry.ts:161-197` `createCounters` |
| `packages/engine/src/contract.ts` (+ `.spec.ts`) | contract | `SCAN_LIFECYCLE_STATES` beside `SCAN_STATES` | `contract.ts:79-135` |
| `packages/engine/src/thresholds.ts` | config | watermark constant (D-01) | existing `RETENTION_SWEEP_EVERY_N` idiom |
| `packages/frontend/src/App.vue` (+ `.spec.ts`) | component | fifth tab, toolbar indicator, delete `SERVER_STORAGE_PATH` | `App.vue:73-77` `TABS`, `:storage-path` at ~759 |
| `packages/frontend/src/stores/coalescer.ts` | store | **no behavioural change** — export/reuse only | see § Shared Patterns |
| `packages/frontend/src/components/settings-contract.ts` | config | **deletion** of five exports | see § Deletion Task |
| `packages/frontend/src/components/SettingsPanel.vue` + `.spec.ts` | component | delete path row, add D-25 footprint rows | `HealthPanel.vue` strip/`<dl>` |

---

## Pattern Assignments

### `packages/backend/src/scan/scans.ts` (model, CRUD + state transition)

**Analogs:** `packages/backend/src/store/audit.ts` (the newest table module) and
`packages/backend/src/store/retry.ts` (the transition module).

**Header pattern** — `audit.ts:1-25`. Every table module opens with WHAT THIS TABLE IS FOR,
APPEND-ONLY / ONE STATEMENT PER WRITE, and THE KEY IS NATURAL AND CALLER-GENERATED. `scans.ts` needs
all three paragraphs, plus a fourth for D-26's suspended exemption:

```ts
// APPEND-ONLY, AND ONE STATEMENT PER WRITE. There is no alternative on this
// driver: `BEGIN` does not span `exec` calls and every statement still returns
// SUCCESS, so code that LOOKS transactional passes every test and provides no
// atomicity whatsoever (Pitfall 2). No invariant here may require two statements
// to land together.
//
// THE KEY IS NATURAL AND CALLER-GENERATED. `event_id`, never `id`:
// `last_insert_rowid()` is unusable on this pooled connection (decision P1-D1) …
// The caller mints the id, which makes the CALLER the owner of idempotency and
// makes a retry after an ambiguous failure a no-op instead of a duplicate.
```

`scans.scan_id` is the same move: caller-minted UUID, `FORBIDDEN_COLUMNS` bans bare `id`
(`schema.spec.ts:442-452`).

**Imports pattern** — `audit.ts:26-36` / `retry.ts:57-68`:

```ts
import type { ScanState } from "@defminer/engine/contract";
import { RETRY_TARGET_SCAN_STATE, RETRYABLE_SCAN_STATES } from "@defminer/engine/contract";
import type { Database } from "sqlite";

import { describeError } from "../telemetry";

import { getAnalysis } from "./analyses";
import type { StoreWriteResult } from "./artifacts";
```

Note the group order (engine contract → driver → `../telemetry` → sibling store modules) and that
the vocabulary type is imported, never restated. `scan/` is a new directory: import `../telemetry`
and `../store/…` accordingly.

**Import-time arity assertion** — `retry.ts:70-93`, copy verbatim in shape if any statement binds a
list from a closed vocabulary:

```ts
const RETRYABLE_STATE_PLACEHOLDERS = 2;
if (RETRYABLE_SCAN_STATES.length !== RETRYABLE_STATE_PLACEHOLDERS) {
  throw new Error(
    `store/retry.ts: RETRY_ANALYSIS_SQL binds ${String(RETRYABLE_STATE_PLACEHOLDERS)} ` +
      `state placeholders but RETRYABLE_SCAN_STATES now holds ` +
      `${String(RETRYABLE_SCAN_STATES.length)}. Every statement in this package is a ` +
      `complete literal, so the guard list cannot be sized at run time — widen the ` +
      `statement and this bound in one edit.`,
  );
}
```

**Core transition pattern — the guard is INSIDE the predicate** (`retry.ts:95-107`):

```ts
const RETRY_ANALYSIS_SQL = `
UPDATE analyses
SET scan_state = ?, started_at = ?, finished_at = NULL, max_slice_ms = NULL,
    bytes_walked = NULL, error = NULL
WHERE project_id = ? AND sha256 = ? AND detector_set_hash = ?
  AND scan_state IN (?, ?)
`;
```

RESEARCH's `SUSPEND_ON_EPOCH_SQL` / `ADVANCE_SQL` / `SUSPEND_RUNNING_ON_INIT_SQL` are this exact
shape (`06-RESEARCH.md § "The read and write statements, in the shipped style"`). Use them.

**Insert pattern — do-nothing upsert on the natural key** (`audit.ts:120-124`):

```ts
const RECORD_AUDIT_SQL = `
INSERT INTO audit (project_id, event_id, at, kind, subject, detail)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (project_id, event_id) DO NOTHING
`;
```

**Write + read-back + error handling** (`retry.ts:132-160`) — the driver cannot report what it
wrote, so a caller that will render the state reads it back:

```ts
  try {
    const stmt = await db.prepare(RETRY_ANALYSIS_SQL);
    const res = await stmt.run(
      RETRY_TARGET_SCAN_STATE,
      startedAt,
      projectId,
      sha256,
      detectorSetHash,
      // SPREAD, never passed as one array: an array handed to a bind position
      // is silently ignored on this driver …
      RETRYABLE_SCAN_STATES[0],
      RETRYABLE_SCAN_STATES[1],
    );
    const row = await getAnalysis(db, projectId, sha256, detectorSetHash);
    return { ok: true, changes: res.changes, state: row?.scan_state };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
```

`prepare()` is INSIDE the call (pool over worker threads), positional `?` only, no `RETURNING`,
result type `StoreWriteResult & { … }` from `store/artifacts`.

**List read with a deterministic tie-break and a bounded limit** (`audit.ts:198-237`):

```ts
const LIST_AUDIT_SQL = `
SELECT project_id, event_id, at, kind, subject, detail
FROM audit
WHERE project_id = ?
ORDER BY at DESC, event_id DESC
LIMIT ?
`;
…
  const bounded =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : AUDIT_LIST_DEFAULT_LIMIT;
```

The scan-history read copies this exactly (`ORDER BY started_at DESC, scan_id DESC`), and exports
its default-limit constant so the spec asserts against the constant, not a literal.

---

### `packages/backend/src/store/migrations.ts` — step v5 (and the `audit` kind extension)

**Analog:** the step v3 object at `migrations.ts:180-210` (`audit`, the last table addition) and the
step v4 object at `migrations.ts:255-276`.

**Ladder rules, from `migrations.ts:1-14`:**

```ts
// SHIPPED STEPS ARE IMMUTABLE. Once a step has been released it is never edited:
// a user's populated database has already run it, so an edit changes the schema of
// new installs only and silently forks the two. Later columns arrive as NEW steps.
```

**D-16 therefore CANNOT edit step v3's CHECK.** The `audit` kind extension is a forward step that
rebuilds/relaxes the constraint — the planner must design that step explicitly (SQLite cannot
`ALTER … DROP CONSTRAINT`), and it is a second one-way decision beside `scans`.

**Step object shape and the closed CHECK** (`migrations.ts:193-210`, verbatim):

```ts
  {
    v: 3,
    sql: `
CREATE TABLE IF NOT EXISTS audit (
  project_id TEXT    NOT NULL CHECK (length(project_id) > 0),
  event_id   TEXT    NOT NULL CHECK (length(event_id) > 0),
  at         INTEGER NOT NULL,
  kind       TEXT    NOT NULL CHECK (kind IN ('triage_set', 'suppression_create', 'suppression_remove', 'finding_projected', 'export_raw', 'export_redacted', 'value_revealed')),
  subject    TEXT    NOT NULL,
  detail     TEXT,
  PRIMARY KEY (project_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_audit_at
  ON audit (project_id, at);
`,
  },
```

Every statement `IF NOT EXISTS` (the only reason DDL may be batched into one `exec` —
`migrations.ts:25-38`); `project_id` first in the PK; `CHECK (length(x) > 0)` in the v2/v3 style,
not a trigger (triggers exist only to retrofit the immutable v1 tables). The compliant v5 DDL is
already drafted at `06-RESEARCH.md § "A compliant step v5"` — use it.

**The step also needs a JSDoc block above it** in the v3/v4 style: what the table is for, why the
identifier column is not `id`, why the vocabulary is complete before every member has a caller, and
why the indexes run in the direction they do.

**`schema.spec.ts` extension** (`schema.spec.ts:43-49`):

```ts
const EXPECTED_TABLES = [
  "analyses",
  "artifacts",
  "audit",
  "observations",
  "settings",
];
```

`listTables()` orders `name ASC`, so `"scans"` lands between `"observations"` and `"settings"`.
`COLUMN_ALLOWLIST` is the deliberate second edit; `FORBIDDEN_COLUMNS` (`:442-452`) is where D-24's
no-BLOB proof belongs.

---

### `packages/backend/src/scan/httpql-discipline.spec.ts` (static gate, AST walk)

**Analog:** `packages/backend/src/store/sql-discipline.spec.ts`.

**Note for the planner:** that gate's `SQL_SINKS` is `new Set(["prepare", "exec", "run", "get", "all"])`
(`sql-discipline.spec.ts:105`) — **no `filter` entry**, so it is provably silent about HTTPQL. That
is O-06's answer: a new gate, not an extension.

**Why-static header** (`sql-discipline.spec.ts:1-23`) — copy the argument shape:

```ts
// WHY THIS IS STATIC AND NOT A RUNTIME TEST.
// Every failure mode below is SILENT. … So a behavioural test only catches these
// where somebody thought to write one, whereas reading the SOURCE catches every
// call site including the ones written next year.
//
// Parsed with the TypeScript compiler rather than acorn … The walk shape is the
// same and the reason it is a walk and not a regex is the same: a regex over
// lines misses multi-line strings, `export ... from`, and any call whose receiver
// spans a line break …
//
// The gate's core is a PURE function over (filename, source), so every rule below
// has its FAILING path executed against a synthetic fixture in this same file. A
// gate whose failure path has never run is a gate nobody has tested.
```

**File enumeration** (`sql-discipline.spec.ts:34-62`):

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
  walk(BACKEND_SRC);
  return out.sort();
}
```

**Closed rule-name list typing the emitter** (`sql-discipline.spec.ts:64-91`):

```ts
const RULE_NAMES = [
  "named-parameter",
  "returning",
  …
] as const;
type RuleName = (typeof RULE_NAMES)[number];
type Violation = { file: string; rule: RuleName; detail: string };
```

**Sink set + leading-keyword classification** (`:96-124`) — the HTTPQL gate's analogue is a
`HTTPQL_SINKS` set (`filter`, and whatever `filter.ts` exports as the single composer) and a
`composedByTheOnlyComposer()` predicate:

```ts
const SQL_SINKS = new Set(["prepare", "exec", "run", "get", "all"]);
function statementKind(text: string): string {
  const m = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|PRAGMA|WITH)\b/i.exec(text);
  return m === null ? "" : (m[1] ?? "").toUpperCase();
}
```

---

### `packages/backend/src/filesystem-prohibition.spec.ts` (static gate — D-18)

**Analog:** `packages/backend/src/outbound-prohibition.spec.ts`. **RESEARCH corrected CONTEXT's
D-18 wording: the 01-09 rule family is NOT eslint — it is this spec file.** This is the single most
important analog in the phase.

**`RULES` record shape** (`outbound-prohibition.spec.ts:1739-1760`, two members quoted):

```ts
const RULES = Object.freeze({
  "outbound-send": Object.freeze({
    rule: "outbound-send",
    surface: `sdk.${SEND_RECEIVER}.${SEND_METHOD}, or any other non-read-only member of a ${SEND_RECEIVER} receiver`,
    why:
      "plugin-originated traffic does not come back through onInterceptResponse " +
      '(SURFACES_FIRING_INTERCEPT = "proxy"), so a leak would move no counter in this ' +
      "plugin and leave no trace in its own telemetry; … CORE-11 is the requirement " +
      "whose text states this prohibition.",
  }),
  "outbound-import": Object.freeze({
    rule: "outbound-import",
    surface: `an import of "${HTTP_SPECIFIER}"`,
    why:
      "caido:http loads successfully inside Caido, and the DIST-05 bundle allowlist " +
      "admits it because Phase 0 MEASURED it loadable — a different question from " +
      "whether it is permitted, and the reason CORE-11 needs a SOURCE gate. …",
  }),
});
type RuleId = keyof typeof RULES;

export const FORBIDDEN_OUTBOUND: readonly OutboundRule[] = Object.freeze(
  Object.values(RULES),
);
```

Every rule carries `rule` / `surface` / `why`, `RuleId` is `keyof typeof RULES` so a typo cannot
compile, and the array form is DERIVED from the record.

**Source-root walk with the POSIX path convention** (`:1858-1876`):

```ts
function shippedFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".spec.ts")) out.push(full);
    }
  };
  for (const root of SOURCE_ROOTS) walk(root);
  return out.sort();
}
```

**Non-vacuity block — BY NAME, not by count** (`:6467-6545`), all four assertions are required:

```ts
  const files = shippedFiles();               // BOUND ONCE; every case reads this binding (IN-08)

  it("enumerates a NON-EMPTY set of shipped modules, BY NAME, ACROSS BOTH ROOTS", () => { … });
  it("every root contributes at least one file to the scan", () => { … });
  it("the walk really DESCENDED into subdirectories, per root", () => { … });
  it("the per-file cases iterate the SAME binding the assertions above measured", () => {
    expect(shippedFiles()).toEqual(files);
  });

  it.each(files)("%s reaches no outbound surface", (file) => { … });
```

The by-name list must gain `scan/scans.ts`, `scan/producer.ts`, `scan/filter.ts` when they exist.

**Firing / legal fixture pair per rule** (`:6593-6640`) — the exact idiom D-18 must reproduce for
`llrt/fs`, `node:fs` (every specifier form) and `sdk.hostedFile`:

```ts
describe("the gate's own failure paths", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it("outbound-send fires on the direct call", () => {
    expect(rulesOf("await sdk.requests.send(req);")).toContain("outbound-send");
  });

  it("outbound-send fires on the element-access form", () => {
    expect(rulesOf('await sdk.requests["send"](req);')).toContain("outbound-send");
  });

  it("outbound-send does NOT fire on sdk.requests.get — the reload the consumer depends on", () => {
    // THE most important false positive to rule out.
    expect(rulesOf("const rr = await sdk.requests.get(id);")).toEqual([]);
  });
});
```

**The legal fixture that matters for D-18:** `sdk.meta.path()` and `sdk.meta.db()` must be asserted
`toEqual([])` — CONTEXT D-18 keeps `sdk.meta.path()` legal because it already appears in redacted
error text. Also assert the gate stays quiet on this spec file's own documentation strings (the
`telemetry.ts` names `caido:http` precedent at `:44-52`), which is why the walk is an AST walk.

---

### `packages/backend/src/scan/producer.ts` (service, batch drain)

**Analog:** `packages/backend/src/ingest/consumer.ts` — the producer is its mirror image.

**Threshold import, never a local literal** (`consumer.ts:54`):

```ts
import { RETENTION_SWEEP_EVERY_N } from "@defminer/engine/thresholds";
```

D-01's watermark goes in `packages/engine/src/thresholds.ts` the same way, with its derivation
written out (see `retention.ts:100-123` for the derived-constant idiom, where
`MAX_ROWS_PER_PASS = RETENTION_SWEEP_MAX_ROWS` and `INSERTED_PER_ARTIFACT` are referenced *so the
derivation is not merely a comment*).

**Cadence + yield discipline** (`consumer.ts:748-762`):

```ts
        // RETENTION_SWEEP_EVERY_N processed artifacts, so retention pressure …
            processedForSweep % RETENTION_SWEEP_EVERY_N === 0 &&
            processedForSweep !== lastSweptAtProcessedCount);
        if (due) {
          const projectId = await deps.getProjectId();
          if (projectId !== "") { … await runRetentionPass(projectId); }
        }

        await yieldToLoop();
      }
    } finally {
      draining = false;
      // IN THE `finally`, not after the loop. Every exit from the drain is a
      // `return` … so a flush placed after the loop would never run at all
```

The scan's page loop needs the same `draining`-style re-entrancy flag, the same `await yieldToLoop()`
per page, and the same `finally` for its position flush.

**Per-item shape** — already written for the planner at `06-RESEARCH.md § "Pattern 1"`; it reuses
`admit()` and `queue.offer({ id, bytes, kind })` unchanged.

---

### `packages/backend/src/store/retention.ts` — D-26's state exemption

**Analog:** the audit exemption at `retention.ts:214-249`, which expresses D-06 **by an absence,
stated in the code**:

```ts
// ===========================================================================
// THE AUDIT TABLE IS BOUNDED BY ROWS AND DELIBERATELY NOT BY AGE (decision D-06).
// ===========================================================================
// Every other table above has BOTH an over-age statement and an oldest-first
// statement. `audit` has only the second, and the missing one is missing ON
// PURPOSE. If you came here to add `AUDIT_OVER_AGE_SQL` "for consistency", this
// paragraph is the answer: don't, and `retention.spec.ts` will stop you.
…
// THIS IS A SINGLE, DELIBERATE, DOCUMENTED EXCEPTION … It is not the first of a
// family. Any second exemption is a new decision and needs its own paragraph here.
```

**That last sentence is now due.** D-26 IS the second exemption and must add its own paragraph
there. It cannot be an absence (it is on a state, not a table), so it is a predicate in the
statement text — `06-RESEARCH.md § "D-26's exemption, in retention.ts's style"` has the SQL.

**Candidate-statement style** (`retention.ts:126-140`), which the `scans` statements must match:

```ts
// Every one of these orders OLDEST FIRST with an explicit tie-break, so a capped
// pass and the pass that resumes it agree on which rows come next.

const ARTIFACTS_OVER_AGE_SQL = `
SELECT sha256 FROM artifacts
WHERE project_id = ? AND last_seen_at < ?
ORDER BY last_seen_at ASC, sha256 ASC
LIMIT ?
`;
```

---

### `packages/backend/src/telemetry.ts` — D-02's retro sub-map

**Analog:** `telemetry.ts:161-197`. The addition goes **inside `createCounters()`**, because
`telemetry.spec.ts` scans the package AST and fails on a second counters object anywhere:

```ts
function createCounters(): Counters {
  return {
    proxiedResponsesObserved: 0,
    admitted: 0,
    rejected: zeroedRejectCounters(REJECT_REASONS),
    …
  };
}

/**
 * THE counter object. There is exactly one, and `telemetry.spec.ts` proves it
 * over the AST of every file in this package.
 */
export const counters: Counters = createCounters();
```

`zeroedRejectCounters(REJECT_REASONS)` is the existing helper — the retro sub-map calls it again
over the SAME closed vocabulary (D-02), it does not declare a second one. `resetTelemetryForTest()`
(`:207-214`) mutates in place and needs no change if the sub-map is built by `createCounters`.

---

### `packages/engine/src/contract.ts` — `SCAN_LIFECYCLE_STATES`

**Analog:** `contract.ts:79-135`, the adjacent-declaration idiom UI-SPEC mechanism 2 requires:

```ts
export const SCAN_STATES = ["pending", "running", "done", "partial", "failed"] as const;

/** One scan state. Derived from {@link SCAN_STATES}, never restated. */
export type ScanState = (typeof SCAN_STATES)[number];
…
export const RETRY_TARGET_SCAN_STATE: ScanState = "pending";
```

Declare `SCAN_LIFECYCLE_STATES = ["running","suspended","completed","discarded"] as const` and
`ScanLifecycleState` immediately beside them, with a header paragraph naming the collision
(`running` is a member of both) — that visibility at the point of declaration is the whole
mechanism.

---

### `packages/frontend/src/components/ScanPanel.vue` (component)

**Analog:** `packages/frontend/src/components/HealthPanel.vue`.

**Header + contract-import pattern** (`HealthPanel.vue:1-60`):

```ts
import { computed, onMounted, ref } from "vue";
import type { HealthCounters, HealthOutcome, RpcResult } from "../api/client";
import {
  counterId, counterText, HEALTH_CELL_CLASS, HEALTH_COUNTERS,
  HEALTH_HEADING, HEALTH_LOADING_LABEL, HEALTH_STRIP_HEIGHT_CLASS, …
} from "./health-contract";
```

**Every string is a named constant in a sibling `*-contract.ts`** — the panel imports, it never
inlines copy. Every string in `06-UI-SPEC.md § Copywriting Contract` becomes such a constant.

**The `<template>` root + fixed-height counter strip** (`HealthPanel.vue:177-220`):

```vue
<template>
  <div class="flex flex-col gap-4 overflow-y-auto" data-defminer-health>
    <div class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold leading-snug">{{ HEALTH_HEADING }}</h2>
      <p class="text-surface-400">{{ HEALTH_PURPOSE }}</p>
    </div>

    <div
      v-if="showStrip"
      :class="[HEALTH_STRIP_HEIGHT_CLASS,
               'flex shrink-0 items-center gap-8 border border-surface-600 px-4']"
      data-defminer-health-strip
    >
      <div v-for="counter in HEALTH_COUNTERS" :id="counterId(counter.id)" :key="counter.id"
           :class="[HEALTH_CELL_CLASS, 'flex items-center gap-2']">
        <span class="text-xs font-semibold text-surface-400">{{ counter.label }}</span>
        <span class="text-sm">{{ counterText(counter, valueOf(counter.id)) }}</span>
      </div>
    </div>

    <p v-else-if="!settled" class="text-surface-400">{{ HEALTH_LOADING_LABEL }}</p>

    <p v-else-if="failed" class="border border-danger-500 px-2 py-1 text-danger-500"
       role="alert" data-defminer-health-failed>
      {{ HEALTH_FAILED_BODY }}
    </p>
```

Directly reusable: the `flex flex-col gap-4 overflow-y-auto` panel root, `text-lg font-semibold
leading-snug` heading, `h-12 … gap-8` strip (D1's four counters), per-cell `id` hooks via a
`counterId`-style helper (never `data-*` carrying a value), and the `role="alert"` failure block
(the UI-SPEC's "Clause rejected" and "Progress read failed" copy).

**NO COMMENT AT THE TOP OF `<template>`** (`HealthPanel.vue:172-175`, and `StatusBadge.vue`'s
header) — a comment there is a node, the component becomes a fragment and every root-class
assertion reads `[]`.

**Layout constants** (`health-contract.ts:160-190`):

```ts
export const HEALTH_STRIP_HEIGHT_CLASS = "h-12";   // A LITERAL, because Tailwind's JIT only
                                                   // emits a utility it can SEE spelled out
export const HEALTH_CELL_CLASS = "whitespace-pre overflow-hidden";
```

The contract file notes `HEALTH_CELL_CLASS` is deliberately **not** shared with
`table-contract.ts`'s `CELL_CLASS`. The scan strip should likewise declare its own constants rather
than importing the health ones.

**What the scan history list deliberately does NOT reuse** — `packages/frontend/src/components/
table-contract.ts:146-161`:

```ts
  const targetControlled = columns.filter((column) => column.targetControlled);
  if (targetControlled.length !== 1) {
    throw new Error(
      `${table}: 05-UI-SPEC.md § "Table contract" binds EXACTLY ONE ` +
        `target-controlled column per table, but ${String(targetControlled.length)} ` +
        `are marked (…)`,
    );
  }
```

The history list has **zero** target-controlled columns (only the operator's HTTPQL clause, which
UI-SPEC routes through `forCellText`), so `assertColumnContract` would throw at module load. It is
therefore an authored `<dl>`/list in the `HealthPanel` idiom, not an `InventoryTable`. Say this in
the plan so nobody reaches for `InventoryTable.vue`.

---

### `packages/frontend/src/components/scan-lifecycle-presentation.ts` + its renderer

**Analogs:** `components/scan-state-presentation.ts` and `components/StatusBadge.vue`.

**The map shape** (`scan-state-presentation.ts:44-73`):

```ts
export type ScanStatePresentation = { readonly label: string; readonly toneClass: string };

/**
 * `Record<ScanState, …>` and not `Partial<Record<…>>`: the compiler is the
 * mechanism here, not the comment. Colours are the six Caido roles — there is
 * no hex literal in this file and there cannot be one …
 */
export const SCAN_STATE_PRESENTATION: Readonly<Record<ScanState, ScanStatePresentation>> =
  Object.freeze({
    pending: { label: "Queued", toneClass: "text-surface-400" },
    running: { label: "Analysing", toneClass: "text-surface-400" },
    done: { label: "Complete", toneClass: "text-success-500" },
    partial: { label: "Partial", toneClass: "text-info-500" },
    failed: { label: "Failed", toneClass: "text-danger-500" },
  });
```

`SCAN_LIFECYCLE_PRESENTATION` is byte-for-byte this shape over `ScanLifecycleState`:
`running: "Scanning"`, `suspended: "Suspended"` (`text-info-500`), `completed: "Finished"`,
`discarded: "Discarded"`.

**Why the prop is NOT widened** (`StatusBadge.vue:19-28`) — quote this in the plan, it is UI-SPEC
mechanism 5's justification:

```
// `SCAN_STATES` is the closed list the database's own CHECK constraint
// enforces. `Record<ScanState, …>` is the whole mechanism: a sixth state added
// to that list without a row here is a TYPECHECK ERROR … The alternative — a
// switch with a default arm, or a lookup with a fallback — turns a vocabulary
// change into a badge that quietly renders nothing.
```

**The renderer — one element carrying BOTH tone and word** (`StatusBadge.vue:53-83`):

```ts
const { state } = defineProps<{ state: ScanState }>();
const presentation = computed<ScanStatePresentation>(() => SCAN_STATE_PRESENTATION[state]);
```

```vue
<template>
  <span
    :class="[presentation.toneClass, 'whitespace-pre text-xs font-semibold']"
    data-defminer-status-badge
    >{{ presentation.label }}</span
  >
</template>
```

The new badge gets its **own** `data-defminer-*` marker (UI-SPEC mechanism 5) — `data-defminer-scan-
lifecycle` — and the same one-element coupling.

---

### `packages/frontend/src/stores/scan-progress.ts` (store, event-driven)

**Analog:** `packages/frontend/src/stores/coalescer.ts`. UI-SPEC fixes shape (b): the progress
payload is routed **before** `onSummary`, outside `INVALIDATION_CATEGORIES`, so **neither
`triageLocked` early-return is modified** (`coalescer.ts:166` inside `react`, and `:206` at the end
of `onSummary`):

```ts
  const react = (): void => {
    if (stopped) return;
    if (options.gate.triageLocked.value) return;      // line 166 — UNTOUCHED
    reactions.value++;
    void applyPending();
  };
…
    // THE SUPPRESSION IS CHECKED BEFORE THE WINDOW, not inside it.
    if (options.gate.triageLocked.value) return;      // line 206 — UNTOUCHED
    void windowed();
```

**Constants imported, never restated** (`coalescer.ts:62-88`):

```ts
export const COALESCE_TRAILING_WINDOW_MS = 500;
export const MAX_REACTIONS_PER_SECOND = 2;
/** The minimum spacing between reactions. DERIVED from the cap, never restated —
 *  a second literal here is how the cap comes to say two and the gate three. */
export const REACTION_MIN_INTERVAL_MS = 1000 / MAX_REACTIONS_PER_SECOND;
```

`scan-progress.ts` imports `MAX_REACTIONS_PER_SECOND` / `REACTION_MIN_INTERVAL_MS` from
`./coalescer` and declares no number of its own. Also import `INVALIDATION_CATEGORIES` in the
`coalescer.ts:49` style only if it needs to *exclude* the categories — it must not extend the array.

**Throttle-only, no debounce** (UI-SPEC: leading + throttled, no trailing). The analog composes
both (`coalescer.ts:180-188`); the progress store uses only the throttle half:

```ts
  const gated = useThrottleFn(react, REACTION_MIN_INTERVAL_MS, true);   // `true` = leading edge
```

**Lifecycle** (`coalescer.ts:213-231`) — `stopped` flag plus `subscription.stop()`, both halves:

```ts
    stop: () => {
      // BOTH halves. Stopping the listener alone leaves a window already in
      // flight to fire into a store the component no longer owns …
      stopped = true;
      subscription.stop();
    },
```

**Project-race guard** (`coalescer.ts:192-195`) applies verbatim to the progress payload:

```ts
    if (summary.projectId !== options.gate.projectId.value) return;
```

---

### `packages/frontend/src/App.vue` — the fifth tab

**Analog:** its own `TABS` block (`App.vue:56-81`):

```ts
/**
 *  3. Order is declaration order and is never sorted at runtime, so the tab an
 *     operator reaches for by muscle memory does not move under them.
 */
const TABS = Object.freeze([
  { id: "artifacts", label: "Artifacts" },
  { id: "observations", label: "Observations" },
  { id: "health", label: "Health" },
  { id: "settings", label: "Settings" },
] as const);

type TabId = (typeof TABS)[number]["id"];
```

UI-SPEC places `Scan` **third**. Because `TabId` is derived from `TABS`, adding the entry without
its `v-else-if` body arm lands on the bare `v-else` Health branch — UI-SPEC requires both edits and
an update to the shipped four-member-union comment in the same commit.

---

### `scripts/phase6/matrix-leg.sh` (script)

**Analog:** `scripts/spike/instance.sh`. The two native legs should **source** it rather than
re-implement it (it defines `teardown()` in the caller's shell when sourced, `:5`).

**Absolute app path + version gate** (`instance.sh:18-19, 68-86`):

```bash
CAIDO_BIN="${CAIDO_BIN:-/Applications/Caido.app/Contents/Resources/bin/caido-cli}"
EXPECT_VERSION="${EXPECT_VERSION:-0.57.1}"
…
  actual="$("$CAIDO_BIN" --version 2>/dev/null | awk '{print $2}')"
  if [ "$actual" != "$EXPECT_VERSION" ]; then
    echo "FATAL: version mismatch. expected $EXPECT_VERSION, got ${actual:-<none>} ($CAIDO_BIN)" >&2
    echo "       Refusing to record any measurement against an unexpected build." >&2
    echo "       NOTE: bare 'caido-cli' on PATH resolves to a STALE 0.55.3 on this machine." >&2
    echo "       Always use the absolute app-bundle path. Never \$HOME/.caido/." >&2
    return 1
  fi
  bin_sha="$(shasum -a 256 "$CAIDO_BIN" | cut -d' ' -f1)"
```

**D-21 note:** `EXPECT_VERSION` here defaults to Phase 1's tripwire value. The matrix must pass its
**own** pinned constant in (`EXPECT_VERSION=$MATRIX_EXPECTED_VERSION`) and must not edit this
default or `tests/phase1-*.spec.ts`'s `EXPECTED_CAIDO_VERSION = "0.57.1"`.

**Other reusable gates** (`instance.sh:87-135`): port refusal (8080 is the operator's live
instance), LISTEN collision check, `--no-open --allow-guests --no-sync --debug` on `127.0.0.1` only,
poll-for-ready never sleep-and-hope, guest token minted with `umask 077` before the write,
`teardown()` always SIGKILL.

**The recorded instance artifact** (`instance.sh:154-176`) is the per-leg provenance block:

```python
  "binary": {
    "path": "$CAIDO_BIN",
    "expected_version": "$EXPECT_VERSION",
    "reported_version": "$actual",
    "sha256": "$bin_sha"
  },
```

**Result artifact + schema** — `.planning/phases/00-runtime-reality-check/results/spike-result.schema.json`
(`additionalProperties: false`, `required` naming `binary` / `host` / `instances` / `method` /
`measurements` / `verdict` / `requirements_affected`, `status` enum `pass|fail|inconclusive|blocked`)
and `SPIKE-11.json` as the filled example. `matrix-result.schema.json` copies that shape, with
D-23's `not_run` added to the status enum and a `reason` required when it is used.

---

### `tests/phase6-matrix.spec.ts` (artifact gate)

**Analog:** `tests/phase1-load.spec.ts:1-52`:

```ts
// FAIL, NEVER SKIP, and name the remedy in every message — the doctrine
// tests/go-no-go.spec.ts sets. An absent or unreadable artifact must fail here
// rather than pass vacuously.

const RESULT = ".planning/phases/01-skeleton-persistence-compatibility/results/spa-load.json";
const EXPECTED_CAIDO_VERSION = "0.57.1";
const REMEASURE = "re-run `bash scripts/phase1/spa-load.sh`";
…
function loadJson(path: string): any {
  const raw = readFileSync(path, "utf8");
  try { return JSON.parse(raw); } catch (err) {
    throw new Error(`${path} is not valid JSON: ${(err as Error).message}`);
  }
}
const d = existsSync(RESULT) ? loadJson(RESULT) : null;
```

Also copy its `strings()` walker (`:55-69`) — it is how the phase-1 gate proves no path/username
string leaked into an artifact, which the matrix artifacts need for the same reason (D-19). Note the
scoped `eslint-disable @typescript-eslint/no-explicit-any` with its written justification: a
shell-written JSON artifact gets no hand-maintained parallel interface.

---

## Shared Patterns

### Error redaction across the RPC
**Source:** `packages/backend/src/telemetry.ts` (`describeError`), quoted in every store module's
header. **Apply to:** every new backend module.
```ts
import { describeError } from "../telemetry";
// Caught exceptions render through `describeError`, never a bare stringification.
// The reasoning — a driver rejection carries the bound parameters, and one of them
// is the observation URL — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`.
```
Redact BEFORE truncate: `describeError(e).slice(0, 200)` (`retry.ts:158`).

### Every write, in one statement, on a bound natural key
**Source:** `store/audit.ts` header, `store/retry.ts` header. **Apply to:** `scan/scans.ts`,
`store/migrations.ts` data paths, the D-11 startup sweep. `prepare()` inside the call; positional
`?` only; no `RETURNING`; no `last_insert_rowid()`; `project_id` in every predicate; read back
through a getter when the caller renders the result.

### Vocabulary declared once, in the engine contract
**Source:** `packages/engine/src/contract.ts:79-135`. **Apply to:** `SCAN_LIFECYCLE_STATES`,
`SUSPEND_REASONS`, and the frontend presentation maps (`Record<Union, …>`, never `Partial`).
No consumer restates a member string; the SQL `CHECK` is the one permitted second copy and the spec
reads it back out of `sqlite_master` and compares member by member (`audit.ts:37-54`).

### Static gates: pure function + closed rule list + firing-and-legal fixture per rule
**Source:** `store/sql-discipline.spec.ts`, `outbound-prohibition.spec.ts`. **Apply to:**
`filesystem-prohibition.spec.ts`, `scan/httpql-discipline.spec.ts`, D-24's no-BLOB check.
Non-vacuity assertion **by name** before the `it.each`; one bound file list read by every case.

### Copy lives in a `*-contract.ts`, never inline in a `.vue`
**Source:** `health-contract.ts`, `settings-contract.ts`, `export-contract.ts`. **Apply to:**
`ScanPanel.vue`, the toolbar indicator, the Settings footprint rows.

### Frontend safety
**Source:** `packages/frontend/src/frontend-safety.spec.ts:140-158` — six static rules
(`raw-html-directive`, `dom-html-sink`, `dynamic-code-construction`, `unsafe-attribute-binding`,
`title-attribute`, `markup-string-construction`) run over every frontend module via `it.each`.
**Apply to:** `ScanPanel.vue` and the lifecycle badge automatically — no new exemption, nothing
added to the skip list. Per-row hooks are `id`s, never `data-*` carrying a value; no `title`.

### Grouped integers
**Source:** `groupThousands` in `components/table-contract.ts` (used by `counterText` in
`health-contract.ts`). **Apply to:** every counter on the Scan tab, the toolbar indicator, and the
D-25 footprint rows. Never `toLocaleString`, never a second grouping helper.

---

## Deletion Task — the Settings subtraction (D-19)

This is a **removal**, not an addition, and the set must be deleted together or `knip` fails on the
now-unused exports. From `packages/frontend/src/components/settings-contract.ts`:

- **KEEP** `STORAGE_NOTE` (line 239) — verbatim, unchanged; UI-SPEC says do not rewrite it.
- **DELETE** `SERVER_PATH_LABEL` (:236), `COPY_PATH_LABEL` (:245), `COPIED_LABEL` (:248),
  `COPY_FAILED_LABEL` (:253), `PATH_DISPLAY_CHARS` (:262) — and, in the same commit,
  `PATH_ELISION` and the left-cut path helper below them, which have no other consumer.
- **DELETE** in `packages/frontend/src/App.vue`: `SERVER_STORAGE_PATH` (~line 558, the hardcoded
  `null` named by `05-VERIFICATION.md`'s DEPLOY-02 `behavior_unverified` item) and the
  `:storage-path` binding (~line 759), plus the prop on `SettingsPanel.vue`.
- **DELETE** the five `storagePath` cases in `SettingsPanel.spec.ts`; **ADD** the D-25 footprint
  cases in their place.

R5 survives the deletion as a rule; it is satisfied vacuously by displaying no path. The plan must
say "closed by deletion, not by supplying a value" in those words.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `scripts/phase6/matrix-leg.sh` — **the Docker legs only** | script | process orchestration | `instance.sh` covers the two native legs completely (launch, version gate, port gate, readiness poll, token, teardown, instance artifact). Nothing in this repo pulls or runs a container image; the container path, the no-volume restart assertion (D-22) and the image-tag/version reconciliation (O-05) have no precedent. Use RESEARCH § "What the container legs need built new". |
| `packages/backend/src/scan/filter.ts` | utility | transform | No HTTPQL is composed anywhere in the shipped tree; `sdk.requests.query()` has never been called (COVERAGE row 7 opt-out). `admit.ts` is the analog only for its *shape* — a closed vocabulary, a no-regex header prohibition, and a pure decision function — not for its content. Use RESEARCH § "Composing the scan filter". |

---

## Metadata

**Analog search scope:** `packages/backend/src/**`, `packages/engine/src/**`,
`packages/frontend/src/**`, `tests/**`, `scripts/**`,
`.planning/phases/00-runtime-reality-check/results/**`
**Files scanned:** ~110 tracked source files enumerated; 22 read
**Tracked-source check:** `git ls-files` run over every analog path named above — all tracked
**Pattern extraction date:** 2026-08-31
