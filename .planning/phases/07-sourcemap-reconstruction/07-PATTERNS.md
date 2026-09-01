# Phase 07: Sourcemap Reconstruction - Pattern Map

**Mapped:** 2026-09-01
**Files analyzed:** 27 (18 new, 9 modified)
**Analogs found:** 25 / 27

Every path below was checked with `git ls-files`. Paths marked **NEW** do not exist yet and are
intended new files; every path marked *(shipped)* is tracked source in this repo. No path here comes
from a gitignored mirror — and one gitignored directory is called out explicitly in
`## No Analog Found`, because RESEARCH.md points fixtures at it.

---

## File Classification

### `packages/engine` — pure, SDK-free, where the MAP-05 fixture suite can run on Node

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|-------------------|------|-----------|----------------|-------|
| `packages/engine/src/sourcemap/announce.ts` **NEW** | utility | transform | `packages/engine/src/chunker.ts` + `packages/backend/src/hooks/admit.ts` (the `indexOf`/`endsWith`, no-regex discipline) | role-match |
| `packages/engine/src/sourcemap/parse.ts` **NEW** | utility | transform | `packages/engine/src/decode.ts` | role-match |
| `packages/engine/src/sourcemap/*.spec.ts` **NEW** | test | transform | `packages/engine/src/sanitise.spec.ts` + `packages/engine/src/hostile.fixture.ts` | exact |
| `packages/engine/src/decode.ts` *(modify — `decodeBase64()`)* | utility | transform | itself, `decodeViaBuffer`/`decodeViaStringDecoder`/`decodeUtf8` at :45–108 | exact |
| `packages/engine/src/sanitise.ts` *(modify — `SOURCE_LINE_MAX_GRAPHEMES`)* | config | transform | itself, `TABLE_CELL_MAX_GRAPHEMES` :116 / `EVIDENCE_PANEL_MAX_GRAPHEMES` :120 | exact |
| `packages/engine/src/contract.ts` *(modify — `SOURCE_PRODUCIBILITY_STATES`, invalidation categories)* | model | — | itself, `SCAN_LIFECYCLE_STATES` :137–150 and the collision essay :88–120 | exact |
| `packages/engine/src/thresholds.ts` *(modify — `MAP_MAX_BYTES`, `SOURCEMAP_TAIL_WINDOW_BYTES`, `SOURCE_LINE_CAP`)* | config | — | itself, the `POLICY_DERIVED_FROM` idiom :196–217 | exact |
| `packages/engine/src/thresholds.spec.ts` *(modify)* | test | — | itself, the convergence inequality :189–212 and *"THE INEQUALITY IS THE PROPERTY"* :216–220 | exact |

### `packages/backend` — persistence, pipeline, RPC, gates

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|-------------------|------|-----------|----------------|-------|
| `packages/backend/src/store/sources.ts` **NEW** (upsert source, record sighting, producibility UPDATE) | store/model | CRUD | `packages/backend/src/store/observations.ts` (write half) + `packages/backend/src/store/retry.ts` (the scoped single-statement UPDATE) | exact |
| `packages/backend/src/store/sources.spec.ts` **NEW** | test | CRUD | `packages/backend/src/store/observations.spec.ts` | exact |
| `packages/backend/src/store/migrations.ts` *(modify — one forward step)* | migration | — | itself, step `v: 5` (`scans`) at :396–425 | exact |
| `packages/backend/src/store/schema.spec.ts` *(modify — `EXPECTED_TABLES`, `COLUMN_ALLOWLIST`)* | test | — | itself, `observations.url`'s ~90-line justification and `scans`'s entry :453–462 | exact |
| `packages/backend/src/store/reads.ts` *(modify — source list page)* | store | request-response | itself, `listArtifactsPage` :1584–1595 / `listObservationsPage` :1610–1621 | exact |
| `packages/backend/src/store/export.ts` *(modify — a third `EXPORT_COLUMNS` entry)* | service | batch | itself, `EXPORT_COLUMNS` :232–254 and `serialiseRows` :433 | exact |
| `packages/backend/src/ingest/consumer.ts` *(modify — the D-08 stage in `analyseAndFinish`)* | service | event-driven | itself, `analyseAndFinish` :771–813, the reload/size gate :583, the epoch idiom :520–522 | exact |
| `packages/backend/src/sourcemap/derive.ts` **NEW** (`DERIVED_REJECT_REASONS`, the D-14 derived-artifact entry point) | middleware | transform | `packages/backend/src/scan/filter.ts` :266–274 (`OPERATOR_CLAUSE_REJECTIONS` — the sibling-vocabulary precedent) | exact |
| `packages/backend/src/sourcemap/derive.spec.ts` **NEW** | test | transform | `packages/backend/src/scan/filter.spec.ts` :262–268 (the every-reason-has-a-case gate) | exact |
| `packages/backend/src/telemetry.ts` *(modify — a sub-map of counters)* | utility | — | itself, `RetroCounters` and the `retro:` sub-map (~:200–250) | exact |
| `packages/backend/src/index.ts` *(modify — `listRecoveredSources`, `deriveSource` RPCs)* | controller | request-response | itself, the `retryAnalysis` registration :846–874 | exact |
| `packages/backend/src/codec-prohibition.spec.ts` **NEW** (D-17) | test | — | `packages/backend/src/filesystem-prohibition.spec.ts` | exact |

### `packages/frontend` — the drill-down, tree, viewer, position strip, manifest

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|-------------------|------|-----------|----------------|-------|
| `packages/frontend/src/sourcemap/tree.ts` **NEW** (O-08 normaliser) | utility | transform | `packages/frontend/src/safety/display.ts` (pure, calls the engine, never restates it) | role-match |
| `packages/frontend/src/components/SourceTree.vue` **NEW** | component | request-response | `packages/frontend/src/components/InventoryTable.vue` :473–531 (the `RecycleScroller` usage) | exact |
| `packages/frontend/src/components/SourceViewer.vue` **NEW** | component | request-response | `packages/frontend/src/components/InventoryTable.vue` (scroller) + `EvidencePanel.vue` (the four body states) | exact |
| `packages/frontend/src/components/SourceBrowser.vue` **NEW** (the drill-down shell) | component | request-response | `packages/frontend/src/components/ArtifactsTable.vue` (thin shell over a shared table) | role-match |
| `packages/frontend/src/components/source-producibility-presentation.ts` **NEW** | config | — | `packages/frontend/src/components/scan-lifecycle-presentation.ts` | exact |
| `packages/frontend/src/components/ProducibilityMark.vue` **NEW** | component | — | `packages/frontend/src/components/ScanLifecycleBadge.vue` | exact |
| `packages/frontend/src/components/table-contract.ts` *(modify — `SOURCE_LINE_HEIGHT_PX`, `h-6` literal)* | config | — | itself, `ROW_HEIGHT_CLASSES` :44–70 | exact |
| `packages/frontend/src/safety/display.ts` *(modify — `forSourceLine()`)* | utility | transform | itself, `forCellText` :105–128 | exact |
| `packages/frontend/src/components/ArtifactsTable.vue` *(modify — the `Sources` column)* | component | request-response | itself, the optional `analyses` lookup-map prop :62–70 | exact |
| `packages/frontend/src/App.vue` *(modify — drill-down state inside the `artifacts` arm)* | component | event-driven | itself, :1044–1140 (split body, five-arm `v-if`) | exact |
| `packages/frontend/src/safety/hostile.spec.ts` *(modify — the viewer's hostile-render assertions)* | test | — | itself + `packages/engine/src/hostile.fixture.ts` | exact |
| `packages/frontend/package.json` *(modify — codec dependency)* | config | — | `packages/frontend/package.json` itself | exact |

### Probe (D-10 / O-03) and its gate

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|-------------------|------|-----------|----------------|-------|
| `scripts/phase7/map-probe.sh` **NEW** | config/script | batch | `scripts/phase6/matrix-leg.sh` + `scripts/spike/ladder.sh` + `scripts/spike/instance.sh` | exact |
| `.planning/phases/07-sourcemap-reconstruction/results/map-probe.json` + `.schema.json` **NEW** | config | — | `.planning/phases/06-.../results/matrix-result.json` + `matrix-result.schema.json` | exact |
| `tests/phase7-map-probe.spec.ts` **NEW** | test | — | `tests/phase6-matrix.spec.ts` (`EXPECTED_CAIDO_VERSION`, *"FAIL, NEVER SKIP"* :16) | exact |
| `tier1/parse/src/index.ts` *(reference only — its `measured()` helper is the marker idiom)* | — | — | itself | exact |

---

## Pattern Assignments

### `packages/backend/src/store/sources.ts` (store, CRUD) — **NEW**

**Analogs:** `packages/backend/src/store/observations.ts` for the insert; `packages/backend/src/store/retry.ts` for D-23's UPDATE-on-a-read-path.

**Imports + the bounded-target-string idiom** (`observations.ts:1-36`) — copy the header shape,
the `describeError` import note, and the *named cap per target-controlled column* pattern:

```ts
import type { Database } from "sqlite";
import { describeError } from "../telemetry";
import type { StoreWriteResult } from "./artifacts";

/** `content_type` is TARGET-CONTROLLED. Truncated to a bounded length so a
 *  hostile origin cannot push an unbounded string into the operator's database. */
const CONTENT_TYPE_MAX = 120;
const URL_MAX = 2048;
```

⇒ Phase 7's equivalent is a `SOURCES_LABEL_MAX` for the verbatim `sources` entry (D-06). Declare it
here with its own justification; do not reuse `URL_MAX` by association.

**Core write pattern** (`observations.ts:28-36` and `:546-573`) — module-scope SQL *string*,
`db.prepare()` inside the function, parameters **spread**, `ON CONFLICT … DO UPDATE`:

```ts
const RECORD_OBSERVATION_SQL = `
INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (project_id, sha256, request_id) DO UPDATE SET
  observed_at = excluded.observed_at
`;

export async function recordObservation(
  db: Database, projectId: string, sha256: string, requestId: string,
  url: string, status: number, contentType: string | null, observedAt: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(RECORD_OBSERVATION_SQL);
    const res = await stmt.run(
      projectId, sha256, requestId, normaliseObservedUrl(url), status,
      contentType === null ? null : String(contentType).slice(0, CONTENT_TYPE_MAX),
      observedAt,
    );
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}
```

**D-23's producibility UPDATE** — copy `retry.ts:103-160` exactly, including the spread comment,
which records a real Phase 0 defect:

```ts
const RETRY_ANALYSIS_SQL = `
UPDATE analyses
SET scan_state = ?, started_at = ?, finished_at = NULL, max_slice_ms = NULL,
    bytes_walked = NULL, error = NULL
WHERE project_id = ? AND sha256 = ? AND detector_set_hash = ?
  AND scan_state IN (?, ?)
`;
// …
    const res = await stmt.run(
      RETRY_TARGET_SCAN_STATE, startedAt, projectId, sha256, detectorSetHash,
      // SPREAD, never passed as one array: an array handed to a bind position
      // is silently ignored on this driver and produced rows with every column
      // NULL in Phase 0.
      RETRYABLE_SCAN_STATES[0], RETRYABLE_SCAN_STATES[1],
    );
```

This is the shape O-06 was asking about: one statement, `?`-only, `project_id` first in the `WHERE`,
no `RETURNING`, no `last_insert_rowid()`. It is already green under `sql-discipline.spec.ts`.

**Error handling:** every catch returns `{ ok: false, error: describeError(e).slice(0, 200) }` —
redaction **before** truncation, policed by `store/error-redaction.spec.ts`. Never a bare
`String(e)`.

---

### `packages/backend/src/store/migrations.ts` (migration) — *modify*

**Analog:** step `v: 5` at `migrations.ts:396-425`.

```ts
  {
    v: 5,
    sql: `
CREATE TABLE IF NOT EXISTS scans (
  project_id       TEXT    NOT NULL CHECK (length(project_id) > 0),
  scan_id          TEXT    NOT NULL CHECK (length(scan_id) > 0),
  state            TEXT    NOT NULL CHECK (state IN ('running','suspended','completed','discarded')),
  ...
  PRIMARY KEY (project_id, scan_id)
);
CREATE INDEX IF NOT EXISTS idx_scans_state
  ON scans (project_id, state, started_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scans_one_running
  ON scans (project_id) WHERE state = 'running';
`,
  },
```

Points to copy verbatim in shape:
- `CREATE TABLE IF NOT EXISTS`, `CHECK (length(project_id) > 0)` on the scope column.
- A closed `CHECK (x IN (...))` for the `producibility` vocabulary, mirrored member-by-member out of
  `contract.ts` by the spec (the `scans.spec.ts` precedent).
- `PRIMARY KEY (project_id, …)` — `project_id` at ordinal 1 (STORE-02, enforced by `schema.spec.ts`).
- Table + indexes in **one** step (`MULTISTATEMENT_EXEC_ATOMIC = true`; `BEGIN` does not span `exec`).
- Indexes in one ascending direction, per the comment at `migrations.ts:391-395`.
- Every column declares `TEXT` or `INTEGER` explicitly; no `BLOB`, no untyped, no column named
  `id`/`body`/`headers`/`value_raw` (`schema.spec.ts:490-499`).

`SCHEMA_VERSION` is derived (`migrations.ts:854`) — never restate it.

---

### `packages/backend/src/sourcemap/derive.ts` (middleware, transform) — **NEW**

**Analog:** `packages/backend/src/scan/filter.ts:266-274`, the *second* closed rejection vocabulary,
whose doc comment says in its own words why a sibling is correct rather than a widened
`REJECT_REASONS`:

```ts
export const OPERATOR_CLAUSE_REJECTIONS = Object.freeze([
  "comment_construct",
  "unbalanced_parentheses",
  "whitespace_only",
  "too_long",
] as const);
```

**Gate to copy** (`scan/filter.spec.ts:262-268`): *"Mechanical, against the closed array — not a hand
count of the cases above. `admit.spec.ts` does this for `REJECT_REASONS` and the argument is
identical."* Build a `CASES` table plus an every-member-has-a-case assertion.

**Counters:** the derived-path counters go in a **sub-map of the one `counters` object** in
`telemetry.ts`, exactly as `RetroCounters` does — `telemetry.spec.ts` scans the package AST and
fails on a second counters object anywhere in the package.

**Do not touch** `admit.ts`'s `REJECT_REASONS` (`admit.ts:51-60`): its every-reason-has-a-test gate
(`admit.spec.ts:436-455`) and `telemetry.ts:123`'s `Record<RejectReason, number>` both fire, and
06-11's push-down superset proof has no statement about a member HTTPQL never sees.

---

### `packages/backend/src/ingest/consumer.ts` (service, event-driven) — *modify*

**Analog:** itself. Three excerpts the D-08 stage must sit inside.

**Where the stage actually goes** (`consumer.ts:771-793`). `visit` is `(window) => void`,
**synchronous**, called per window — it cannot `await` and the map is not a per-window object. The
stage goes in `analyseAndFinish`, after `walk()` returns and before `finishAnalysis`:

```ts
  const result = await walk(got.bytes, {
    now: clock,
    deadline,
    signal: deps.signal,
    visit: () => {
      /* Phase 3 puts the detector here. */
    },
  });
```

**Epoch idiom** (`consumer.ts:520-522`), re-checked immediately before every new write
(`:604, :620, :672, :693, :785`), each incrementing `c.abandonedOnProjectChange`:

```ts
const epochAtEntry = deps.projectEpoch?.() ?? 0;
const stillCurrent = (): boolean =>
  (deps.projectEpoch?.() ?? 0) === epochAtEntry;
```

**Authoritative size gate + counter-only refusal** (`consumer.ts:583-597`) — the exact shape
`MAP_MAX_BYTES` and the D-14 derived-path bound should copy: a counter, a log, `return`, and
**no row**:

```ts
    if (got.byteLen > PASSIVE_MAX_BYTES) {
      c.reloadOverSize++;
      log("reloaded body over the size ceiling; dropping " + entry.id + " at " +
          String(got.byteLen) + " bytes");
      return;
    }
```

**How `partial` is recorded** (`consumer.ts:794-813`) — D-11 rides this unchanged:

```ts
  recordSlice(result.maxSliceMs);
  const finished = await finishAnalysis(
    deps.db, projectId, got.sha256, detectorHash,
    result.partial ? "partial" : "done",
    Date.now(), result.maxSliceMs, result.bytesWalked,
    null,                       // ← the `error` column
  );
```

**Retention cadence, and the pitfall attached to it** (`consumer.ts:399, :648-661, :851-858`): the
comment beside `processedForSweep += 1` states that the convergence inequality's right-hand side is
*"rows inserted per sweep interval"*. Under D-09 a 781-source map inserts ~1,562 rows in one
iteration against `ROWS_INSERTED_PER_ARTIFACT_MAX = 3`. This is where the fix lands.

---

### `packages/backend/src/index.ts` (controller, request-response) — *modify*

**Analog:** the `retryAnalysis` registration at `index.ts:846-874` — capture `pid` **before** any
await, fail closed to a named sentinel, log the redacted error rather than returning it:

```ts
    sdk.api.register("retryAnalysis", async (_s, req) => {
      const pid = currentProjectId();
      if (!db || pid === null) return NO_RETRY;
      const outcome = await retryAnalysis(db, pid, req.sha256, …, Date.now());
      if (!outcome.ok) {
        // LOGGED HERE, NOT RETURNED. The description is already redacted, and
        // it still does not cross the boundary.
        log(sdk, "retryAnalysis failed: " + outcome.error);
        return NO_RETRY;
      }
      return { ok: true, changed: outcome.changes > 0, state: outcome.state ?? null };
    });
```

Register in `init()` step **6b** — success path only, after the consumer, before the ready latch.
`deriveSource` (D-07/D-24) adds a reload through `sdk.requests.get` plus a `sha256Hex` re-verify that
**fails closed**; its "could not ask" answer is a sentinel like `NO_RETRY`, never an inferred
tombstone.

---

### `packages/backend/src/codec-prohibition.spec.ts` (test) — **NEW**

**Analog:** `packages/backend/src/filesystem-prohibition.spec.ts` — the fourth sibling in a family
whose shape is documented as reusable at `:19-27`. Copy all nine parts:

1. `SOURCE_ROOTS` (`:152-155`) — **both** roots, non-negotiable here:
```ts
const SOURCE_ROOTS: readonly string[] = Object.freeze([
  "packages/backend/src",
  "packages/engine/src",
]);
```
`@defminer/engine` is a `workspace:*` dependency of both backend and frontend, so a codec import in
the engine would ship the codec into the backend bundle while looking like a frontend decode.

2. Walk skips `.spec.ts`; paths built with `posix.join` (`:308-315`).
3. Specifier forms **derived from prefix families**, not enumerated (`:181-202`). For the codec the
   axis is the package's own `exports` map: `@jridgewell/sourcemap-codec`,
   `@jridgewell/sourcemap-codec/dist/sourcemap-codec.umd.js`, and any subpath. *"Banning one spelling
   of a capability is banning nothing"* (`:178`).
4. `RULES` as a frozen record keyed by rule id, `why` travelling into the message (`:234-286`).
5. Exported array derived from the record (`:294-296`), with the disagreement assertion (`:1243-1249`).
6. A pure `auditSource(file, source): Violation[]` over the **TypeScript AST**, never a substring
   scan — the file's own reason at `:88-98` applies doubly here, since this gate names the codec
   dozens of times in prose.
7. The four-assertion by-name non-vacuity block (`:701, :739, :751, :774`) plus the source-root
   agreement check that reads `SOURCE_ROOTS` out of the sibling gate's text (`:781-790`).
8. A firing fixture **and** a legal fixture per rule, asserted as sets (`:1207, :1217`), with the case
   table asserted to be the full cross product (`:1258`).
9. The self-audit case (`:839`).

Import shapes to cover: `import x from`, `import {x} from`, `import * as x from`, `import type`,
`export … from`, `export * from`, dynamic `import()` with a literal, `import x = require()`.

---

### `packages/engine/src/sourcemap/parse.ts` + `announce.ts` (utility, transform) — **NEW**

**Analog for the module shape:** `packages/engine/src/decode.ts`. Its exports —
`decodeViaBuffer` (:45), `decodeViaStringDecoder` (:56), `DecodeOptions` (:60),
`DecodeDivergence` (:69), `decodeUtf8` (:97) — set the idiom: named primitives, a typed error class,
and a cross-checked front door. `decodeBase64()` belongs beside them (D-04), not in a new module.

**No-regex discipline** — copy `hooks/admit.ts`'s prohibition header and its `indexOf`/`endsWith`
style. D-02's scan is **two** `lastIndexOf` calls (`//#` and the legacy `//@`), never a pattern.

**Bound derivation** — assert the relationship, not the number, in `thresholds.spec.ts`'s idiom
(`thresholds.spec.ts:216-220`, verbatim: *"THE INEQUALITY IS THE PROPERTY, not the number it
currently evaluates to"*), and declare the constants with `POLICY_DERIVED_FROM`
(`thresholds.ts:196-217`):

```
SOURCEMAP_TAIL_WINDOW_BYTES = ceil(MAP_MAX_BYTES * 4 / 3) + ANNOUNCEMENT_PREFIX_MAX
MAP_MAX_BYTES <= MAX_RPC_PAYLOAD_BYTES
```

**Fixture pattern:** `packages/engine/src/hostile.fixture.ts` — one module, string literals only,
every consumer asserting `HOSTILE_CASE_IDS` **in full**. Extend it rather than forking a second
corpus; the file's header names that as the defect it exists to prevent.

---

### `packages/engine/src/contract.ts` (model) — *modify*

**Analog:** the `SCAN_STATES` / `SCAN_LIFECYCLE_STATES` pair at `:79-150`, whose header (`:88-120`)
is the argument O-07 needs. Declare `SOURCE_PRODUCIBILITY_STATES` **immediately after**
`SCAN_LIFECYCLE_STATES`, in the same per-member-doc-comment style:

```ts
export const SCAN_LIFECYCLE_STATES = [
  /** Walking, or holding at the backpressure watermark. */
  "running",
  /** Stopped with its place kept, and resumable. … */
  "suspended",
  /** Reached the end of the filter's range. Rendered **Finished**, never
   *  "Completed": see the collision note above. */
  "completed",
  /** Thrown away by the operator. … */
  "discarded",
] as const;
```

Add the note naming the **third** collision, in the same register, and derive the type with
`(typeof …)[number]`. The `AUDIT_KINDS` pattern (`store/audit.ts:73-114`) is the model for pairing a
closed array with a database CHECK plus a compile-time exhaustiveness helper.

---

### `packages/frontend/src/components/source-producibility-presentation.ts` (config) — **NEW**

**Analog:** `packages/frontend/src/components/scan-lifecycle-presentation.ts`. Copy the header's
five-mechanism framing and, load-bearingly, the `Record` rule (`:25-35`):

> `Record<ScanLifecycleState, …>` and NOT `Partial<Record<…>>`. A fifth state added to
> `SCAN_LIFECYCLE_STATES` without a row here is a TYPECHECK ERROR … a badge that quietly renders
> nothing, and a scan whose state renders as nothing is a scan the operator believes is not there.

And the label-collision rule (`:41-58`): the spec asserts a **case-insensitive prefix relation** over
the union of both maps' labels *and* `scan-contract.ts`'s computed words — because set disjointness
is exactly the check that would pass "Complete" beside "Completed". Phase 7's spec extends that
assertion to a third map; **Gone** and **Changed** are the words the UI-SPEC fixes.

Renderer: `ScanLifecycleBadge.vue` is the analog for `ProducibilityMark.vue` — its own component,
its own `data-defminer-*` marker, `StatusBadge`'s prop **not** widened.

---

### `packages/frontend/src/components/SourceViewer.vue` / `SourceTree.vue` (component) — **NEW**

**Analog: `InventoryTable.vue`, NOT `ArtifactsTable.vue`.** The scroller usage is at
`InventoryTable.vue:55` (`import { RecycleScroller } from "vue-virtual-scroller";`) and `:473-531`:

```vue
      <RecycleScroller
        v-slot="{ item, index }"
        class="h-full"
        :items="scrollerItems"
        :item-size="TABLE_ROW_HEIGHT_PX"
        :buffer="200"
        key-field="__defminerRowKey"
      >
        <div
          :class="[ROW_HEIGHT_CLASS, FOCUS_RING_CLASS,
            'flex items-center gap-2 border-b border-surface-600 px-2',
            isSelected(item.row) ? SELECTED_ROW_ACCENT_CLASS : 'border-l-2 border-l-transparent']"
          role="row" tabindex="0"
          :aria-rowindex="index + 1" :aria-selected="isSelected(item.row)"
          @click="openEvidence(item.row)"
          @keydown.enter="openEvidence(item.row)"
          @keydown.space.prevent="openEvidence(item.row)"
        >
```

Fixed `item-size` bound to a constant; a variable row height is the one thing the fast path forbids
(`ScanHistoryList.vue:33`, `shims-virtual-scroller.d.ts:22-23`).

**The row-height constant + class pairing** (`table-contract.ts:44-70`) — `SOURCE_LINE_HEIGHT_PX = 24`
follows it exactly, and `h-6` goes into the map as a **literal**:

```ts
const ROW_HEIGHT_CLASSES: Readonly<Record<number, string>> = Object.freeze({
  32: "h-8",
});

export const ROW_HEIGHT_CLASS: string = (() => {
  const found = ROW_HEIGHT_CLASSES[TABLE_ROW_HEIGHT_PX];
  if (found === undefined) {
    throw new Error(
      `table-contract: TABLE_ROW_HEIGHT_PX is ${String(TABLE_ROW_HEIGHT_PX)} ` +
        `but no Tailwind utility is registered for it. Add the class to ` +
        `ROW_HEIGHT_CLASSES as a LITERAL — Tailwind's JIT only emits a utility ` +
        `it can see spelled out in the scanned source …`,
    );
  }
  return found;
})();
```

Throws rather than falls back — copy that too.

---

### `packages/frontend/src/safety/display.ts` (utility, transform) — *modify*

**Analog:** `forCellText` at `:105-128`. `forSourceLine()` is written beside it, with its cap bound
in the name:

```ts
export function forCellText(value: string): string {
  return forDisplayText(value, TABLE_CELL_MAX_GRAPHEMES);
}
```

The doc comment above it is the argument the viewer inherits verbatim — **`forCellText`, never
`forCell`**, because `forCell` returns `total` and forces a walk of the whole value:

```
   through `forCell`      99 of 396 frames over the 32 ms budget,
                          max 442 ms, p95 418 ms, scroll 37,395 ms
   through `forCellText`   0 of 396 frames over budget,
                          max 23.8 ms, p95 17.1 ms, scroll 4,010 ms
```

`SOURCE_LINE_MAX_GRAPHEMES = 1024` goes in `packages/engine/src/sanitise.ts` beside `:116/:120`, in
the same one-line-justification style:

```ts
/** R2's table-cell cap. Imported by name by the table (05-09) and its hostile
 *  render spec (05-05) — never restated as a literal at a call site. */
export const TABLE_CELL_MAX_GRAPHEMES = 256;
export const EVIDENCE_PANEL_MAX_GRAPHEMES = 2048;
```

The tab exception (`U+0009` → two authored spaces) is a **deviation** from R2 step 1 and must be
argued in the function's own doc comment, in the register `C0_C1_CONTROLS`'s comment uses
(`sanitise.ts:100-103`).

---

### `packages/frontend/src/components/ArtifactsTable.vue` (component) — *modify*

**Analog:** itself. The `Sources` column copies the shipped optional-lookup-map prop precedent
(`:62-70`) rather than editing `reads.ts`'s literal statement matrix:

```ts
const { store, analyses, affectedFilter } = defineProps<{
  store: InventoryStore<ArtifactRow>;
  /**
   * Scan state per content digest, for the artifacts currently resident.
   *
   * Empty by default — see this file's header. A digest absent from the map has
   * an UNKNOWN state, which renders as nothing rather than as a guess.
   */
  analyses: ReadonlyMap<string, ScanState> | null;
```

And the header's rule at `:38-46` is the zero-versus-unknown rule the UI-SPEC restates: an unknown
value renders **nothing**, never a guess and never `0`.

---

### `scripts/phase7/map-probe.sh` + results + gate (probe) — **NEW**

**Analogs:** `scripts/spike/instance.sh` (absolute app path, `EXPECT_VERSION` assertion, the
`~/.caido/caido-cli` stale trap at `:83`, the port-8080 refusal at `:94-98`), `scripts/spike/ladder.sh:12-19`
(*"RSS is a high-water mark that never falls … Reusing an instance makes every point after the first
meaningless"*), `scripts/spike/rss-sampler.sh:19` (`HZ="${3:-0.05}"`), and `tier1/parse/src/index.ts`'s
`measured()` helper emitting `MARK_START`/`MARK_END` with both `Date.now()` and `performance.now()`.

**Artifact location and gate:** follow **Phase 6**, not Phase 0 —
`.planning/phases/06-.../results/matrix-result.json` + `matrix-result.schema.json`, gated by
`tests/phase6-matrix.spec.ts`, whose doctrine is *"FAIL, NEVER SKIP, and name the remedy in every
message"* (`:16`) and whose pinned constant is `EXPECTED_CAIDO_VERSION` (`:53`). Writing into Phase
0's `results/` would put a Phase 7 artifact under `tests/spike-results.spec.ts`'s `SPIKE-\d\d` glob,
which pins 0.57.1. Phase 7 declares its own `MAP_PROBE_EXPECTED_VERSION`.

---

## Shared Patterns

### Redaction on everything that crosses the RPC or a catch
**Source:** `packages/backend/src/telemetry.ts` (`describeError`, `URL_REDACTION`, `PATH_REDACTION`)
**Apply to:** `store/sources.ts`, `sourcemap/derive.ts`, every new `index.ts` handler
Every catch is `describeError(e).slice(0, 200)` — redact **then** truncate. Policed by
`store/error-redaction.spec.ts`. A raw `String(e)` carries bound parameters, one of which is a
target-controlled label.

### SQL discipline
**Source:** `packages/backend/src/store/sql-discipline.spec.ts` (15 rules, static, every non-spec
`.ts` under `packages/backend/src`)
**Apply to:** every statement in `store/sources.ts` and `store/reads.ts`
One statement · `?` only · values **spread** into `run`/`get`/`all` · `project_id` in the `WHERE` ·
no `RETURNING` · no `last_insert_rowid()` · no interpolation or concatenation · `db.prepare()`
inside the function, never at module scope.

### Epoch scoping
**Source:** `packages/backend/src/ingest/consumer.ts:513-522` (multi-statement idiom) and
`packages/backend/src/index.ts:846-852` (single-statement idiom)
**Apply to:** the D-08 stage (multi) and both new RPCs (single)
For a single statement the `project_id` in the `WHERE` **is** the epoch check: if the project changed
during the await, the predicate matches zero rows. Many statements across many awaits need
`stillCurrent()` between them.

### Closed vocabularies
**Source:** `packages/engine/src/contract.ts:88-120`; `packages/backend/src/hooks/admit.ts:51-60`;
`packages/backend/src/scan/filter.ts:266-274`; `packages/backend/src/store/audit.ts:73-114`
**Apply to:** `SOURCE_PRODUCIBILITY_STATES`, `DERIVED_REJECT_REASONS`
`Object.freeze([...] as const)`, type derived from the array, a database CHECK read back
member-by-member by the spec, and a mechanical every-member-has-a-case gate. One vocabulary per
subject — the repo ships eleven.

### The static gate family
**Source:** `packages/backend/src/filesystem-prohibition.spec.ts` (which copies
`outbound-prohibition.spec.ts`, which copies `store/sql-discipline.spec.ts`; `scan/httpql-discipline.spec.ts`
is the third)
**Apply to:** `codec-prohibition.spec.ts` (D-17) and D-12's `sources`-never-reaches-a-path-sink gate
Same walk skeleton, same POSIX source-root enumeration, same by-name non-vacuity block, same
firing-and-legal fixture pair per rule, TS-AST not substring.

### Export ceremony
**Source:** `packages/backend/src/store/export.ts:232-254` (`EXPORT_COLUMNS`), `:433` (`serialiseRows`),
`packages/frontend/src/components/export-download.ts:82` (`browserDownload`),
`packages/frontend/src/components/export-contract.ts`, `ExportDialog.vue`,
`packages/backend/src/store/audit.ts:73-114` (`export_raw` / `export_redacted`)
**Apply to:** the D-20 manifest
A third `EXPORT_COLUMNS` entry with `{ name: "…", redact: redactUrlForExport }` on the `sources`
label; everything else — chunking at `EXPORT_RPC_CHUNK_ROWS`, the floor statement, the raw-confirm
ceremony, the audit kinds — rides unchanged. `export-download.ts`'s header states the rule the
single-file save also obeys: the backend returns **bytes**, no path is sent, received or constructed.

### Fixture discipline
**Source:** `packages/engine/src/hostile.fixture.ts`
**Apply to:** the MAP-05 suite and the retained traversal fixtures
One module, string literals only, `HOSTILE_CASE_IDS` asserted **in full** by every consumer. Extend,
never fork — *"two fixtures is how two surfaces come to assert different things about the same
attack."*

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `packages/frontend/src/sourcemap/tree.ts` (O-08 display-tree normaliser) | utility | transform | No path-shaped string handling exists anywhere in the tree — deliberately. `node:path` is banned on this path and the frontend has no segment-splitting precedent. `safety/display.ts` is the *module-shape* analog only (pure, calls the engine, cap in the name); the algorithm has none. Build it from RESEARCH.md § O-08's five steps against the retained SPIKE-12 fixtures. |
| The position strip's `@jridgewell/sourcemap-codec` decode + throw-degradation | component | transform | The frontend mounts zero third-party runtime components and has no precedent for catching a library throw and degrading one strip. Nearest behavioural cousin is `App.vue:606-611`'s *"a call that did not answer is not evidence of a refusal"* rule — copy that stance, not code. |

**One tracked-source hazard the planner must resolve, not inherit.** RESEARCH.md § O-03 says to
commit probe/D-15 map fixtures under `corpus/maps/` with a sha256 gate. **`corpus/` is gitignored
in its entirety** (`.gitignore:9`, verified with `git check-ignore`) — the reproducible artifact is
`scripts/spike/fetch-corpus.sh` and its committed hashes, not the bytes. So D-15's "corpus fixtures
ship" has exactly two tracked homes: a `*.fixture.ts` string-literal module in `packages/engine/src`
(the `hostile.fixture.ts` pattern), or a `scripts/phase7/fetch-maps.sh` carrying committed SHA-256
hashes (the `fetch-corpus.sh` pattern). Anything written to `corpus/maps/` is untracked and will not
survive a clean checkout.

---

## Metadata

**Analog search scope:** `packages/backend/src`, `packages/engine/src`, `packages/frontend/src`,
`scripts/`, `tests/`, `tier1/`, `.planning/phases/*/results/`
**Files enumerated:** 132 tracked source files across the three packages plus the script and test
roots; 18 read in full or in targeted ranges
**Tracked-source check:** every path in this document verified with `git ls-files`; `corpus/`
confirmed gitignored with `git check-ignore -v`
**Pattern extraction date:** 2026-09-01
