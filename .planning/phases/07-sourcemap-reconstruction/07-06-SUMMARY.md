---
phase: 07-sourcemap-reconstruction
plan: 06
subsystem: api
tags:
  [rpc, sourcemap, content-addressed, fail-closed, closed-vocabulary, export, keyset-pagination, contract-version]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "init()'s ordering contract and step 6b's success-path-only registration; the `retryAnalysis` idiom — pid captured before any await, a NAMED SENTINEL, and the error LOGGED rather than returned; emptyPage's fail-closed-not-throw rule; the ONE counters object with its AST gate and its derived deep-copy projection; extract()'s synchronous SDK-touching stretch (CORE-05)"
  - phase: 05-frontend
    provides: "reads.ts's keyset paging and KEYSET_PAGE_ROWS; export.ts's EXPORT_COLUMNS / serialiseRows / redactUrlForExport / exportFilename / EXPORT_RPC_CHUNK_ROWS and the raw-confirm ceremony; the export_raw / export_redacted audit kinds; the typed frontend client, its RpcResult union and CONTRACT_VERSION's two independently shipped constants; IN_MEMORY_WINDOW_ROWS = 2,000"
  - phase: 06-retroactive-scan-deployment-reality
    provides: "retry.ts's RETRY_ANALYSIS_SQL guarded-update shape — the shipped, green precedent for a write on a read path that sql-discipline.spec.ts passes unchanged; the counter-log-return refusal shape"
  - phase: 07-sourcemap-reconstruction
    provides: "plan 07-01's MAP_MAX_BYTES / SOURCEMAP_TAIL_WINDOW_BYTES / SOURCE_ROWS_PER_MAP_MAX; plan 07-02's findAnnouncement / decodeInlineMap / parseSourceMap; plan 07-03's D-17 codec ban and D-12 sources-sink gate; plan 07-04's migration v8, SOURCE_PRODUCIBILITY_STATES, markProducibility, listRecoveredSourcesPage and countRecoveredSourcesByArtifact; plan 07-05's DERIVED_MAX_DEPTH = 1 and the sourcemap counter sub-map"
provides:
  - "`deriveSource` — D-07's on-demand derivation: reload, D-24 re-verify, re-parse, one source's content, and nothing held at rest"
  - "`listRecoveredSources` — the bounded eager tree read, with `returned` AND `total` as two fields"
  - "`countRecoveredSources` — the digest-keyed lookup map that keeps a resolved zero apart from an unknown"
  - "`readSourceMappings` — the lazy position table, a separate call so it cannot block first paint"
  - "`DeriveSourceResult` / `SourceMappingsResult` over one shared `SourceDerivationFailure`; `RecoveredSourceRow`; `SOURCE_GONE_CAUSES`; `SOURCE_TREE_LOAD_MAX`; `RecoveredSourcePage`; `EXPORT_TABLES` / `ExportTable`"
  - "`store/sources.ts:readSightingOrigin` — the integrity read that makes D-24 a control rather than a tautology"
  - "the third `EXPORT_COLUMNS` entry: nine manifest columns, one carrying `redactUrlForExport`"
  - "`CONTRACT_VERSION` 5 → 6, with the client-side agreement assertion reading the backend spec off disk"
affects:
  [07-07-artifacts-drill-down, 07-08-source-viewer, 07-09-source-browser, 07-10-manifest-cta, phase-08-external-maps]

actuals:
  tokens: 39500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "The four-armed derivation union: a discriminated union where the refusal arm carries NO content field at all, so withholding is structural rather than a caller's discipline"
    - "One shared failure vocabulary across two RPCs that perform the same control, so they cannot drift into meaning different things"
    - "The integrity read: the recorded digest a verification compares against comes from the database, never from the caller — a caller that supplies both halves of an equality supplies the answer"
    - "Bound plus total as two fields, so a bounded list states its bound in words instead of truncating silently"
    - "A plain object rather than a Map across the RPC, because a Map serialises to `{}` and turns every resolved zero into an unknown"
    - "The export table set defined as the inventory set plus one manifest, asserted in that direction rather than described"

key-files:
  created: []
  modified:
    - packages/engine/src/contract.ts
    - packages/backend/src/index.ts
    - packages/backend/src/api/spec.ts
    - packages/backend/src/store/export.ts
    - packages/backend/src/store/sources.ts
    - packages/backend/src/telemetry.ts
    - packages/frontend/src/api/client.ts

key-decisions:
  - "The derivation RPC names a SIGHTING, not a request. `readSightingOrigin` reads `request_id`, `artifact_sha256`, `recovered_at` and the artifact's `byte_len` out of the database, because a caller that names both the request and the digest it will be compared against has supplied D-24's answer and the control becomes vacuous."
  - "`unavailable` is a frozen sentinel with no payload and no reason field, in NO_RETRY's shape. It writes nothing, and every path that cannot establish a fact about the target's history takes it."
  - "An absent or empty reloaded body is `unavailable`, not `gone` and not `changed`: `gone` would claim Caido lost a request that came back, and `changed` would claim a redeploy no bytes support."
  - "The map digest is re-checked against the one the caller named. `findAnnouncement` returns the LAST announcement in the tail window; in this build no nested map ever acquires a sighting (DERIVED_MAX_DEPTH = 1 refuses at depth >= 1), so the check is a consistency assertion today and fails closed the day that bound is raised."
  - "`listRecoveredSources` draws WHOLE keyset pages to the bound — `readExportChunk`'s shape — so the answer can be smaller than the bound and never larger, and a cursor never addresses the middle of a page."
  - "`total` is counted rather than derived from `rows.length`, at one statement per drill-down open. A derived total would read 'showing the first 2,000 of 2,000' for a map with 40,000 sources."
  - "The manifest is an artifact-SCOPED export, so `ExportChunkRequest` grew `scopeSha256` rather than the manifest opening a new SQL surface. A manifest with no scope takes the shipped `empty` outcome; no new refusal reason was invented, because the shipped refusal copy names project resolution and would have been a lie."
  - "`EXPORT_TABLES` is declared on the engine contract rather than widening `INVENTORY_TABLES`: the first two members are pageable, sortable and filterable inventory; the third has none of those axes, and folding it in would have made every sort key nominally valid for a read that has no sort."

patterns-established:
  - "Structural withholding: assert `Object.keys(answer)` rather than `content === ''`, because an empty string is a value a viewer renders and an absent key is not."
  - "Assert the database after the call, not just the return value: the two failures a tombstone endpoint can have — writing one for a call that merely failed, and failing to write one that was earned — are both invisible to a return-value assertion."
  - "Cross-package agreement by reading the other package's source text off disk (`client.spec.ts` reads `api/spec.ts`), since the two packages cannot import each other and a mirror nobody checks is a mirror that drifts."

requirements-completed: [MAP-07, UI-05]

coverage:
  - id: D1
    description: "`deriveSource` reloads the originating request, re-verifies its sha256 against the recorded `artifact_sha256`, re-parses the map and returns one source's content — with nothing held at rest and nothing cached"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#returns the CONTENT arm and leaves producibility untouched"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-24 fails closed: a reloaded body that hashes differently returns the `changed` arm with no content field at all, and content is never re-derived from the new body"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#D-24: a body that hashes differently is `changed`, with NO content field at all"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#performs the SAME D-24 re-verify: a mismatched body returns `changed` and NO mappings"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-23's tombstone is written only on a genuine missing-or-no-response reload, the two branches stay distinct, and the outcome sticks"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#a reload returning undefined is `gone` / no_request, and it STICKS"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#a record with NO RESPONSE is `gone` / no_response — a DIFFERENT tag"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#the tombstone is STICKY — a later reload that succeeds does not un-write it"
        status: pass
    human_judgment: false
  - id: D4
    description: "A failed call is never a tombstone: every `unavailable` path writes nothing, asserted by reading the row back"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#a reload that THREW is `unavailable` and writes NOTHING"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#a rejected derivation is an RpcFailure and NEVER a tombstone"
        status: pass
    human_judgment: false
  - id: D5
    description: "`listRecoveredSources` returns metadata-only rows in the map's declaration order, bounded at 2,000, with `returned` and `total` as two fields and no duplicate or gap across the bound"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#pages past KEYSET_PAGE_ROWS with no duplicate and no gap, and the total is the SEEDED count"
        status: pass
    human_judgment: false
  - id: D6
    description: "`countRecoveredSources` carries a RESOLVED zero (entry present, value 0) apart from an UNKNOWN (no entry) across the RPC boundary"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#countRecoveredSources tells a RESOLVED ZERO from an UNKNOWN — two assertions"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#carries the count map's ZERO-versus-UNKNOWN distinction across the boundary"
        status: pass
    human_judgment: false
  - id: D7
    description: "`readSourceMappings` is a separate endpoint whose payload does not ride `deriveSource`'s response, and O-01's bound holds as an inequality"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#deriveSource's success response has NO mappings field at all"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#O-01's inequality holds as an INEQUALITY, not as the number it evaluates to"
        status: pass
    human_judgment: false
  - id: D8
    description: "The manifest is a third EXPORT_COLUMNS entry of nine columns, its label column carries the shipped URL redactor, and two exports of an unchanged database are byte-identical"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#EXPORT_COLUMNS has exactly three tables and the manifest lists nine columns in order"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#two exports of an unchanged DATABASE are byte-identical"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#redacts the label in redacted mode and returns it byte-identical in raw"
        status: pass
    human_judgment: false
  - id: D9
    description: "The shipped export path is unchanged: no new audit kind, no second field escaper, `export-download.ts` untouched, and the chunk seam is byte-identical at EXPORT_RPC_CHUNK_ROWS + 1"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#crosses the chunk seam byte-identically at EXPORT_RPC_CHUNK_ROWS + 1"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#does not add or rename an audit kind — `audit` is written only on destruction"
        status: pass
      - kind: other
        ref: "git diff --exit-code -- packages/frontend/src/components/export-download.ts"
        status: pass
    human_judgment: false
  - id: D10
    description: "`CONTRACT_VERSION` bumped 5 → 6 with a client-side agreement assertion that reads the backend spec off disk"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#reads the SAME contract version the backend declares"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#calls no endpoint the backend does not declare, and the check is non-vacuous"
        status: pass
    human_judgment: false

duration: 36min
completed: 2026-09-02
status: complete
---

# Phase 7 Plan 06: The Derivation RPCs and the Manifest — Summary

**Recovered source became readable without ever being stored: every open reloads the bundle, re-verifies its sha256 against the digest DefMiner recorded, and answers with one of four arms that a frontend cannot collapse — and the manifest half of MAP-07 landed as nine columns on the shipped export path with no new export machinery.**

## Performance

- **Duration:** 36 min
- **Started:** 2026-09-02T02:33Z
- **Completed:** 2026-09-02T03:09Z
- **Tasks:** 3 of 3
- **Files modified:** 13
- **Tests:** 3,827 passing (81 files), up from 3,784

## Accomplishments

- **`deriveSource` ships D-07 end to end** — reload, D-24 re-verify, re-parse, one source's content — and the three ways it can fail are three different answers, each asserted against the database row it did or did not write.
- **D-24 became a real integrity control rather than a tautology.** The plan's step 2 had the caller supply both `requestId` and the digest to compare against; that would have let anything holding the RPC handle be shown any stored body presented as this bundle's. The backend now reads the origin out of `source_sightings`, so the set of reachable request bodies is exactly the set DefMiner already recorded a sighting for, in the active project.
- **The row shape four downstream plans are written against is on the contract**, with no content field, typed `producibility`, and the two Pitfall-3 nulls kept distinct.
- **The manifest needed 196 changed lines in `export.ts` and nothing else moved** — the chunking, the field escaping, the floor statement, the filename, the raw ceremony and both audit kinds are the shipped ones, and each is asserted unchanged rather than assumed.
- **`CONTRACT_VERSION` is 6 on both sides**, and the agreement is now checked by a spec that reads the backend's own source text rather than by two constants somebody remembers to move together.

## The four result arms, as shipped

The plan asked for these to be recorded verbatim, because plan 07-08's viewer maps each to its own copy row.

```ts
export type SourceDerivationFailure =
  | { outcome: "gone";    cause: SourceGoneCause; recoveredAt: number }
  | { outcome: "changed"; recoveredAt: number;
      recordedByteLen: number | null; reloadedByteLen: number }
  | { outcome: "unavailable" };

export type DeriveSourceResult =
  | { outcome: "content"; content: string; byteLen: number;
      lineCount: number; sha256: string }
  | SourceDerivationFailure;

export type SourceMappingsResult =
  | { outcome: "mappings"; mappings: string }
  | SourceDerivationFailure;

export const SOURCE_GONE_CAUSES = ["no_request", "no_response"] as const;
```

**The three failure arms are declared once and shared.** The content read and the position read perform the same reload and the same D-24 re-verify, so their failure vocabularies are not merely similar — they are one vocabulary. Two copies would have let one acquire a fourth failure the other does not have, and the viewer's four body states would then mean different things depending on which call produced them.

**`changed` has no `content` key at all**, and `export.spec`-style structural assertions (`Object.keys(...)`) are what prove it, not a check for an empty string.

## The row shape `listRecoveredSources` returns

Plans 07-07 through 07-10 are written against this. It is stated plainly here because four plans consume it.

```ts
export type RecoveredSourceRow = {
  readonly artifactSha256: string;               // the request's SCOPE, carried onto every row
  readonly mapSha256: string;
  readonly sourceIndex: number;                  // the map's own declaration order — the evidence
  readonly sourcesVerbatim: string | null;       // TARGET-CONTROLLED, unsanitised (D-06)
  readonly sourceSha256: string | null;          // null: the index shipped no content
  readonly byteLen: number | null;               // null with it — a different fact from zero
  readonly lineCount: number | null;
  readonly producibility: SourceProducibility;   // "producible" | "gone" | "changed"
  readonly recoveredAt: number;
};

export type RecoveredSourcePage = {
  readonly rows: readonly RecoveredSourceRow[];
  readonly nextCursor: PageCursor | null;        // keyset, never OFFSET
  readonly returned: number;
  readonly total: number;                        // COUNTED, never derived from rows.length
  readonly bound: number;                        // SOURCE_TREE_LOAD_MAX = 2,000
  readonly exhausted: boolean;
};
```

Three things the drill-down must not get wrong:

1. **`sourcesVerbatim` is the one target-controlled field.** It reaches the frontend unsanitised on purpose; every route to a template goes through `safety/display.ts`.
2. **`returned` and `total` are two fields.** *Showing the first 2,000 of 40,113* needs both, and deriving one from the other would derive a claim about the database from a fact about the renderer's memory.
3. **The order is the evidence.** The list is not sortable and offers no filter — `store/reads.ts` has two literals rather than a statement matrix for exactly that reason.

The RPC call shapes downstream plans send:

- `deriveSource({ projectId, mapSha256, sourceIndex })`
- `readSourceMappings({ projectId, mapSha256, sourceIndex })`
- `listRecoveredSources({ projectId, artifactSha256, cursor })`
- `countRecoveredSources()` → `Readonly<Record<string, number>>`

Note there is **no `requestId` and no `artifactSha256` on the two derivation calls.** That absence is the design, not an omission — see the deviation below.

## Task Commits

1. **Task 1 (TRACER): `deriveSource`, reload to re-verify to content, with all four outcomes** — `958b51f` (feat)
2. **Task 2: The list read and the lazy `mappings` call** — `b7034ac` (feat)
3. **Task 3: The manifest — a third export table, riding the shipped ceremony unchanged** — `d5cd5e0` (feat)

## The exhaustiveness typecheck failure

The plan asked for the message to be recorded. A scratch fifth arm (`{ readonly outcome: "withheld" }`) was appended to `SourceDerivationFailure` and `pnpm typecheck` produced exactly one error, at the call site rather than at the declaration:

```
packages/engine/src/contract.spec.ts(796,45): error TS2345: Argument of type
'{ readonly outcome: "withheld"; }' is not assignable to parameter of type 'never'.
```

That is the point of the helper having a call site: the compiler only refuses the widening at a `switch` that actually hands it the unhandled arm. The scratch edit was reverted and `pnpm typecheck` returned green.

## The byte-identical export observation

Two consecutive exports of an unchanged database produce byte-identical output, asserted twice and in two places:

- At the serialiser, over rows including both Pitfall-3 nulls (`export.spec.ts` — *two exports of an unchanged row set are BYTE-IDENTICAL*).
- Through `readExportChunk` against a real migrated fixture with five seeded sightings (*two exports of an unchanged DATABASE are byte-identical*), with a non-vacuity assertion that the produced text is non-empty.

Row **order** is the map's `source_index` ascending, tie-broken on `map_sha256`. The sightings are seeded out of insertion order (`2, 0, 1`) so the assertion is about the statement's `ORDER BY` rather than about the order rows happened to be written. The manifest arm ignores `sortKey`, `direction` and `filter`, and the test sets `sortKey: "observed_at"` deliberately — a sort key that silently took effect here would reorder the evidence.

The chunk seam is byte-identical at `EXPORT_RPC_CHUNK_ROWS + 1` (20,001 rows): `first + second === single`.

## The redacted-versus-raw label observation

The `sources` label column carries `redact: redactUrlForExport`, and it is the only covered column on the table — eight DefMiner measurements and one target-controlled string.

Against the fixture `webpack://app/src/secret.ts?token=hunter2`:

| Mode | What the file carries |
|------|-----------------------|
| `redacted` | `webpack://app/src/secret.ts<query-redacted>` — the marker is APPENDED, so a reader can see that something was withheld |
| `raw` | `webpack://app/src/secret.ts?token=hunter2`, byte-identical |

Asserted as **two tests, not one comparison**, because "redacted leaked" and "raw withheld" are different failures. Also asserted end to end through `readExportChunk` against the database, not only at the serialiser.

**No per-column exemption was invented.** A `webpack://` label is URL-shaped by construction — SPIKE-12 measured `webpack://`, `file://` and `http://` shapes in the corpus — so the shipped redactor is the right function, and the evidence D-06 preserves is retrievable through the raw option, which is what the raw option is for.

## A7, with the actual `MAP_MAX_BYTES` figure

**A7 held, with far more margin than the plan assumed.** The plan's fallback case — "if it landed AT the ceiling, the `mappings` response is 6.29 MB against an 8 MiB budget, still inside, with less margin than stated" — did not arise.

```
MAP_MAX_BYTES              = 2,621,440   (2.50 MiB, plan 07-01's measured bound)
structural ceiling         = 6,291,456   = floor(PASSIVE_MAX_BYTES × 3/4)
RPC payload budget         = 8,388,608   (8 MiB)

2,621,440  ≤  6,291,456  <  8,388,608          ✓
```

**Resulting RPC margin: 5,767,168 bytes (5.50 MiB) of slack**, a 3.2× headroom, before the announcement prefix and the surrounding JS are subtracted — against the ~2.1 MiB the plan projected at the structural ceiling. `mappings` is a JSON string *member* of the bounded document, so it is strictly smaller again.

`index.spec.ts` asserts this **as an inequality composed from the shipped constants**, not as the number it evaluates to, so it goes red the day `PASSIVE_MAX_BYTES` is raised or `MAP_MAX_BYTES` is loosened — which is the only way the composition can break.

**The residual is inherited, not created.** The 8 MiB figure is a project BUDGET and not a measured Caido ceiling; `export.ts` says so verbatim, and `exportInventory` already ships 7.00 MiB responses under the same assumption. Recorded in the handler's doc comment rather than hedged with machinery for a defect nobody has observed (T-07-34).

## Which half of MAP-07 each mechanism meets

Stated in `export.ts` beside the new entry, and again here because CONTEXT.md requires the phase to say so.

| Half of MAP-07 | Mechanism | Where |
|----------------|-----------|-------|
| "browsable in the plugin UI" | `listRecoveredSources` + `deriveSource`, content re-derived on demand per D-07 | this plan; rendered by 07-07 / 07-08, reached by 07-09 |
| "exportable with a manifest" | manifest ROWS riding `export.ts` unchanged, on the shipped chunked RPC download | this plan; CTA wired by 07-10 |
| single-file content | a browser download from what the viewer already holds | plan 07-08 |

**Rejected, with the reason:** a bulk content export. It would need a second export shape `serialiseRows` does not describe — it serialises rows, not file bodies — it would re-derive every file during the export (one bundle reload and one hash per source), and it would therefore be a long serial job needing its own progress surface, cancellation and partial-result semantics. That is Phase 6's lesson about what a long serial job costs, paid a second time, for a capability the single-file download already covers.

## Files Created/Modified

- `packages/engine/src/contract.ts` — the derivation unions, `SOURCE_GONE_CAUSES`, `RecoveredSourceRow`, `RecoveredSourcePage`, `SOURCE_TREE_LOAD_MAX`, `EXPORT_TABLES`, `assertNoOtherDeriveOutcome`
- `packages/backend/src/index.ts` — the four handlers, the `DERIVATION_UNAVAILABLE` sentinel, `reloadVerifiedBundle`, `tombstone`, `announcedMap`, `readSourceTree`
- `packages/backend/src/api/spec.ts` — `SourceRef`, `RecoveredSourcesRequest`, four Spec entries, `ExportRequest.table` widened plus `scopeSha256`, `CONTRACT_VERSION = 6`
- `packages/backend/src/store/sources.ts` — `readSightingOrigin` and its statement
- `packages/backend/src/store/export.ts` — the third `EXPORT_COLUMNS` entry, `readOnePage`, `scopeSha256`, the D-20 argument in the doc comment
- `packages/backend/src/telemetry.ts` — five derivation counters on the `sourcemap` sub-map
- `packages/backend/src/ingest/consumer.ts` — `countLines` exported
- `packages/frontend/src/api/client.ts` — four typed methods, `SourceRef`, `RecoveredSourcesRequest`, `FRONTEND_CONTRACT_VERSION = 6`
- specs: `index.spec.ts` (+812), `export.spec.ts` (+406), `client.spec.ts` (+314), `contract.spec.ts` (+235), `App.spec.ts` (+21)

## Decisions Made

See `key-decisions` in the frontmatter. The two that will matter most to a later reader:

**The derivation RPC names a sighting, not a request.** Everything else in this plan follows from that.

**`unavailable` is a sentinel with no payload.** Every path that cannot establish a fact about the target's history takes it, including four the plan did not enumerate: no sighting row, an absent or empty reloaded body, a map digest that is not the one the sighting describes, and an index the map no longer carries content for. Each is documented at its branch with why the alternative would have been a lie.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical functionality] The D-24 comparison read its expected value from the caller**

- **Found during:** Task 1
- **Issue:** The plan's action step 2 specified `await sdk.requests.get(req.requestId)` and step 3 compared the reloaded body's digest against "the recorded `artifact_sha256`" — with both values on the request. A caller supplying both halves of an equality supplies the answer: it could name any request in Caido's history, name that request's own digest, and be handed content presented as this bundle's. T-07-05's mitigation — "the operator can never be shown source attributed to a bundle it did not come from" — would have been vacuous, and the `deriveSource` endpoint would have been an arbitrary-stored-body reader. The plan's own `key_links` line says the re-verify is "against `source_sightings.artifact_sha256`", i.e. the column, which is what settled it.
- **Fix:** Added `readSightingOrigin` to `store/sources.ts` — one project-scoped statement returning `artifact_sha256`, `request_id`, `recovered_at`, `producibility` and (via a `LEFT JOIN` onto `artifacts`) the recorded `byte_len`. The RPC request became `{ projectId, mapSha256, sourceIndex }`. The set of reachable request bodies is now exactly the set DefMiner recorded a sighting for, in the active project. `readSourceMappings`'s signature narrowed the same way, from the plan's `(mapSha256, requestId, artifactSha256)`.
- **Files modified:** `packages/backend/src/store/sources.ts`, `packages/backend/src/api/spec.ts`, `packages/backend/src/index.ts`
- **Commit:** `958b51f`

**2. [Rule 2 — Missing critical functionality] Counters for the derivation path**

- **Found during:** Task 1
- **Issue:** The plan requires "increment a counter each, in the shipped two-branch discipline", but `SourcemapCounters` had no member for any derivation outcome. Without one, a backend failing every derivation is indistinguishable from an operator who never opened one — and `unavailable` is the arm with no durable effect, so the counter is its only record.
- **Fix:** Five members on the existing `sourcemap` sub-map, inside `createCounters()` so they are reset for free and deep-copied by the derived projection: `derivationsServed`, `derivationsGoneNoRequest`, `derivationsGoneNoResponse`, `derivationsChanged`, `derivationsUnavailable`.
- **Files modified:** `packages/backend/src/telemetry.ts`
- **Commit:** `958b51f`

**3. [Rule 3 — Blocking] `countLines` was module-private in `ingest/consumer.ts`**

- **Found during:** Task 1
- **Issue:** The `content` arm carries `lineCount`, and the plan requires the three numbers to describe the content being returned rather than a row's claims about it. The only line counter in the repository was private.
- **Fix:** Exported it, with a comment stating why the derivation recomputes rather than reading the column. A second implementation would have disagreed silently.
- **Files modified:** `packages/backend/src/ingest/consumer.ts`
- **Commit:** `958b51f`

**4. [Rule 3 — Blocking] `SOURCE_TREE_LOAD_MAX` had no shared home**

- **Found during:** Task 2
- **Issue:** U7-1's bound is "the shipped in-memory window number, reused rather than invented", and that number (`IN_MEMORY_WINDOW_ROWS = 2000`) lives in `packages/frontend/src/stores/inventory.ts`. The backend enforces the bound and cannot import the frontend.
- **Fix:** Declared `SOURCE_TREE_LOAD_MAX` on the engine contract with the reasoning at the declaration, and added an agreement assertion in `client.spec.ts` (`SOURCE_TREE_LOAD_MAX === IN_MEMORY_WINDOW_ROWS`) so the two cannot become two numbers that merely happen to agree today.
- **Files modified:** `packages/engine/src/contract.ts`, `packages/frontend/src/api/client.spec.ts`
- **Commit:** `b7034ac`

**5. [Rule 3 — Blocking] `App.spec.ts`'s stub SDK is a literal surface**

- **Found during:** Task 2
- **Issue:** The frontend's `DefMinerBackendSdk` is a structural literal by design — "a stub that has to be cast is a stub that stops failing when the real surface changes" — so adding four methods broke `App.spec.ts`'s stub at typecheck. This file was not in the plan's `files_modified`.
- **Fix:** Extended the stub with the four methods, each answering the shape that claims nothing: an empty tree, an empty count map (unknown by absence, never a zero-filled claim), and the sentinel that writes nothing. No case in that file drives them.
- **Files modified:** `packages/frontend/src/App.spec.ts`
- **Commit:** `b7034ac`

**6. [Rule 3 — Blocking] The manifest is artifact-scoped and the export request had no scope**

- **Found during:** Task 3
- **Issue:** The plan's column list opens with the artifact digest and the rows mirror `listRecoveredSourcesPage`, which is artifact-scoped and ordered by the map's own index. A project-wide manifest would have needed a new statement in `reads.ts` — a second, ungated SQL surface over the same partition, which `export.ts`'s header explicitly forbids — and its ordering would have interleaved artifacts. Plan 07-10 modifies only frontend files and asserts `export.spec.ts` stays green, so the backend must be complete after this plan.
- **Fix:** `ExportChunkRequest` grew `scopeSha256: string | null`, mirrored on `api/spec.ts` and `client.ts`; `readOnePage` gained a third arm paging through `listRecoveredSourcesPage`. A manifest request with a null scope takes the shipped `empty` outcome rather than a new refusal reason — the shipped refusal copy names project resolution and would have been a lie, and "nothing in scope" is the same claim the zero-row path already makes.
- **Files modified:** `packages/backend/src/store/export.ts`, `packages/backend/src/api/spec.ts`, `packages/frontend/src/api/client.ts`
- **Commit:** `d5cd5e0`

**7. [Rule 3 — Blocking] The completion audit row counted through `countInventory`**

- **Found during:** Task 3
- **Issue:** `exportInventory` writes its audit row with `countInventory(db, pid, req.table, req.filter)`, which takes an `InventoryTable` and a filter. The manifest has no filter axis — it has a scope — so this did not typecheck and would not have been the right number.
- **Fix:** One branch in the handler: the manifest's count comes from `countRecoveredSourcesByArtifact(...).get(scope)`, the read the export actually used. No third arm was added to `reads.ts`'s statement matrix for a number obtainable honestly from an existing statement.
- **Files modified:** `packages/backend/src/index.ts`
- **Commit:** `d5cd5e0`

### Architectural changes requiring approval

None.

## Notes for the next planner

**Nested maps are not reachable and that is measured, not assumed.** `announcedMap` re-checks the parsed map's digest against the one the sighting names, which raises the question of what happens to a sighting whose map is nested inside a recovered source. The answer is that none exists: `sourcemap/derive.ts` sets `DERIVED_MAX_DEPTH = 1` and `admitDerivedDepth` refuses at `depth >= 1`, while `ingest/consumer.ts` calls `reconstruct` at `input.depth + 1` — so the depth-1 reconstruction is refused before it can write a row. The digest check is therefore a consistency assertion today and is what fails closed the day that bound is raised. If a later phase raises `DERIVED_MAX_DEPTH`, `deriveSource` will answer `unavailable` for nested sightings until it learns to walk the derivation chain, and that is a deliberate fail-closed gap rather than a silent one.

**`store/retention.ts` still sweeps neither `sources` nor `source_sightings`** (plan 07-05's deferred item D1). This plan does not touch retention and does not paper over it. The interaction worth knowing: `readSightingOrigin`'s `LEFT JOIN` onto `artifacts` returns `byte_len` as `null` when the artifact row has been swept but the sighting has not, and the `changed` arm types `recordedByteLen` as `number | null` for exactly that case. When retention learns to sweep these tables, that null becomes rarer rather than impossible.

**`readSourceMappings` returns `unavailable` for a `sections` map**, because a sectioned document carries its `mappings` per section and has no top-level string member. That is "could not ask" by the letter — it writes nothing and claims nothing — and 07-UI-SPEC.md already has a copy row for it (*Map carries no `mappings`* → the no-position-table sentence). Plan 07-08 should map the `unavailable` arm to that sentence rather than to the RPC-failure copy when the content arm succeeded on the same source.

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired component was introduced.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change was introduced. The one new surface — `JSON.parse` over target-controlled map JSON in `readSourceMappings` — is inside the plan's existing T-07-11 register, is bounded at `MAP_MAX_BYTES` by `decodeInlineMap` before it is reached, and is wrapped in a catch that answers `unavailable`.

## Verification

| Gate | Result |
|------|--------|
| `pnpm test` | 3,827 passed, 81 files |
| `pnpm typecheck` | clean |
| `pnpm lint` | clean |
| `pnpm knip` | exit 0 (24 pre-existing tag hints, unchanged) |
| `pnpm check:bundle` | 2 specifiers — `crypto`, `string_decoder` — both on the DIST-05 allowlist, unchanged |
| `pnpm exec caido-dev build packages` | backend + frontend built, package zip created |
| `git diff --exit-code -- packages/frontend/src/components/export-download.ts` | no change |
| `git diff --exit-code -- packages/backend/src/store/audit.ts` | no change; `grep -c export_raw` = 1, unchanged |

## Self-Check: PASSED

All nine modified source files and four modified spec files exist on disk; all three task commits are reachable from `HEAD`.
