# Phase 1: Skeleton, Persistence & Compatibility — Research

**Researched:** 2026-08-20
**Domain:** Caido backend plugin scaffolding, non-blocking proxy ingestion, pooled-SQLite persistence, byte-exact encoding, bundle-import CI gating
**Confidence:** HIGH on runtime contracts (every one measured in Phase 0 on the shipped binary), HIGH on SDK surface (read from the pinned `.d.ts` this session), MEDIUM on the numeric budgets Phase 1 must *choose* (queue depth, admission ceiling — Phase 0 measured the inputs, not the policy), LOW on cross-day cache hit rate (unresolved, `null`).

---

<user_constraints>
## User Constraints

**No `CONTEXT.md` exists for this phase.** The user chose to plan without a discuss-phase pass. There are therefore no user-authored locked decisions for Phase 1. The constraints below are inherited and carry equal authority: they are measured runtime facts and previously-logged project decisions, not options.

### Locked — the Phase 0 import contract (non-negotiable)

Quoted verbatim from `00-GO-NO-GO.md:26-32` [VERIFIED: .planning/phases/00-runtime-reality-check/00-GO-NO-GO.md:26-32]:

> ## The contract Phase 1 must satisfy
>
> This is a requirement, not a suggestion.
>
> **Every tunable constant in the engine imports its value from `go-no-go.json` and is asserted equal to it by a test in the SDK-free engine workspace.** A developer who tunes a constant without re-measuring fails CI.
>
> The mechanism matters as much as the rule. A constant copied into source drifts silently the first time someone tunes it to make a test pass; a constant imported and asserted cannot. Where a threshold is `null` with status `inconclusive`, the engine imports the accompanying assumed value and the test asserts THAT, so the placeholder is visible in code review rather than buried in a comment.

Also locked, same file: `go-no-go.json` **is the only Phase 0 artifact later phases may import**.

### Locked — decisions carried in STATE.md that bind Phase 1

Copied verbatim from `.planning/STATE.md:73-95` [VERIFIED: .planning/STATE.md:73-95]:

- `[Phase 0]: setTimeout(fn,0) is the only primitive that yields the QuickJS event loop; cost 5.03ms median, so the yield trigger must be temporal (MAX_SYNC_SLICE_MS=25), not per-chunk`
- `[Phase 0]: TextDecoder is reachable from no module, but string_decoder.StringDecoder and buffer.Buffer are — ENC-01/ENC-02 bind to those`
- `[Phase 0]: sdk.meta.db().exec takes no bind parameters; binding requires prepare() then Statement.run(...params)`
- `[Phase 0]: SIZE_GATE_SOURCE is decompressed identity bytes — Caido decodes gzip/br/zstd before onInterceptResponse`
- `[Phase 0]: Phase 1 storage must use single-statement idempotent upserts — BEGIN does not span exec calls, and fails silently`
- `[Phase 0]: onInterceptResponse fires for proxied traffic ONLY — replay, automate, workflow, plugin sends and caido:http fetch are all invisible to it (SPIKE-05)`
- `[Phase 0]: Caido QUEUES intercept events: 499 survived a 30 s handler block and arrived in a 20 ms burst, contiguous, nothing lost; the proxy never stalled`
- `[Phase 0]: Caido surfaces neither a synchronous throw nor an async rejection from a handler — ERR-03/OBS-01 must do all error visibility themselves`
- `[Phase 0]: last_insert_rowid() is unusable on sdk.meta.db()'s pooled connection — STORE-01..07 must key writes on a natural key`
- `[Phase 0]: CACHE_HIT_RATE_CROSS_DAY is inconclusive at 1 sampled day and a zero denominator; Phase 1 CORE-08 budgets against CACHE_HIT_RATE_ASSUMED=0.40 until it is re-measured after 2026-09-03`
- `[Phase 0]: go-no-go.json is the only Phase 0 artifact later phases may import; every tunable constant must import from it and be asserted equal by a test in the SDK-free engine workspace`

### Locked — project-level decisions from PROJECT.md / STATE.md

- Detection logic lives in a **workspace with zero Caido value-imports**, runnable under plain vitest (DET-03). Phase 1 must create that boundary even though no detector ships yet.
- Raw secrets are never persisted (SEC-04). Phase 1 creates the schema; it must not create a `value_raw` column.
- No plugin self-update mechanism (DIST-03, Caido Developer Policy "Not Allowed").

### Claude's Discretion (planner may choose, must justify against measured inputs)

- **Queue bound value** (CORE-03). Phase 0 measured the *burst shape*, not a bound. See "The queue bound is derivable, and 256 is refuted" below.
- **Passive admission size ceiling** (CORE-02). `AST_MAX_BYTES` and `HARD_MAX_BYTES` exist; neither is a passive-ingest ceiling. Phase 1 must define one and record its derivation.
- **Schema shape.** `ARCHITECTURE.md` proposes a full DDL; parts of it are refuted by Phase 0 and by SEC-04. See "Schema corrections".
- **Whether a frontend package exists in Phase 1 at all** (affects how COMPAT-01's "clear message" is delivered).
- **Migration runner design** (forward-only `PRAGMA user_version` ladder is strongly indicated but the step granularity is open).

### Deferred / OUT OF SCOPE for Phase 1

- Any detector, regex, entropy, or AST work (Phases 3, 9).
- Error containment, health surface, diagnostics export (Phase 2 — ERR-*, OBS-*). Phase 1 must not *pre-build* these, but **must not make them impossible**: see "The ERR-03 seam Phase 1 must leave open".
- Retroactive scanning (Phase 6, FIND-03).
- Any outbound request of any kind (Phase 8, ACTIVE-*).
- Any UI (Phase 5, UI-*).
- Cross-deploy diffing and `path_key` (v2, DIFF-01/SPIKE-13). **`ARCHITECTURE.md`'s `path_key` column and `pathKey()` helper serve only DIFF-01 and must not be built in Phase 1.**
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CORE-01 | Non-async handler; cheap gates; enqueue request ID; return | Handler signature is `MaybePromise<void>` — non-async is legal [VERIFIED: sdk-backend typing.d.ts:120-126]. Pattern 1 below. |
| CORE-02 | Admission filter on content type, URL extension, response size, Caido scope | `Body.length` is bytes with no decode [VERIFIED: quickjs-types requests.d.ts:26-29]; `inScope()` is synchronous [VERIFIED: requests.d.ts:823-825]; a 304 arrives with **no `content-type` at all** [VERIFIED: go-no-go.json:409-412] — content-type-keyed gates misclassify it. |
| CORE-03 | Bounded queue, visible overflow, never an unbounded array | `EVENT_OVERFLOW_BEHAVIOUR = "queue"`, `EVENTS_DELIVERED_UNDER_BLOCK = 500` [VERIFIED: go-no-go.json:185-197]. Back-pressure is ours to impose. `ARCHITECTURE.md`'s 256 is refuted — see Pitfall 3. |
| CORE-04 | Exactly one CPU consumer | Single-threaded runtime; `Worker` is `undefined` [VERIFIED: capabilities.json:1 `"Worker": "undefined"`]. |
| CORE-05 | Reload via `sdk.requests.get(id)`, never retain SDK objects across `await` | `get(id): Promise<RequestResponseOpt \| undefined>` [VERIFIED: requests.d.ts:779]. Note the `undefined` branch. |
| CORE-06 | 64 KB / 4 KB matching window, **temporal** yield trigger | `YIELD_PRIMITIVE = "setTimeout0"`, `YIELD_COST_MS = 5.029`, `MAX_SYNC_SLICE_MS = 25` [VERIFIED: go-no-go.json:473-492, 249-256]. |
| CORE-07 | Wall-clock deadlines between chunks; degrade to recorded partial | `performance.now()` present, min delta 0.001 ms [VERIFIED: capabilities.json:1 `"min_delta_ms": 0.0009999871253967285`]. Degradation vocabulary is OBS-02 (Phase 2) — Phase 1 must pick a value set and not contradict it. |
| CORE-08 | Never re-analyse identical content at the current corpus version | Content-addressed via `crypto.createHash("sha256")` [VERIFIED: capabilities.json:1 crypto exports]. Budget against `CACHE_HIT_RATE_ASSUMED = 0.4` [VERIFIED: go-no-go.json:136-141] — **read from config, never hard-coded** (open Broken Window #6). |
| CORE-09 | Project switch cancels in-flight work; no cross-project leakage | `onProjectChange(callback: (sdk, project: Project \| null))` — **`null` is a real case** [VERIFIED: sdk-backend typing.d.ts:128-149]. `project.getId()` is the `project_id` [VERIFIED: projects.d.ts:12-16]. |
| CORE-10 | Telemetry records max observed synchronous slice | `performance.now()` only clock; no memory introspection at all [VERIFIED: capabilities.json:1 `perf_hooks`/`process`/`llrt:qjs` all `ERR`]. |
| STORE-01 | Schema via `sdk.meta.db()` | `db(): Promise<Database>` [VERIFIED: sdk-backend typing.d.ts:201-205]. |
| STORE-02 | `project_id` in every key | `sdk.meta.db()` is documented "for the plugin stored in Caido Data" — plugin-global, not project-scoped [VERIFIED: typing.d.ts:201-204]. |
| STORE-03 | Content-addressed artifacts by digest | `crypto.createHash` native [VERIFIED: capabilities.json:1]; hashing must be over `toRaw()` bytes (ENC-01). |
| STORE-04 | Analysis rows record detector-corpus version | Schema column only in Phase 1; no corpus exists yet. |
| STORE-05 | Forward migrations, tested against a populated DB | `PRAGMA user_version` survives across `exec` calls [VERIFIED: go-no-go.json:289-293]. |
| STORE-06 | Retention bounds DB and disk growth | The plugin DB survives project deletion and is never GC'd by Caido; `DB_SURVIVES_REINSTALL = "survives force-reinstall only"` [VERIFIED: go-no-go.json:177-181]. |
| STORE-07 | Positional `?` only | `run(...params: Parameter[])` with `@param params ... Named parameters are not supported.` [VERIFIED: extra/sqlite.d.ts:107-113]. `exec(sql: string)` takes **no params at all** [VERIFIED: extra/sqlite.d.ts:74-77]. |
| COMPAT-01 | Declared minimum Caido version, runtime-checked, clear message | Manifest schema has **no** version-constraint field [VERIFIED: @caido/plugin-manifest dist/index.d.ts:33-42]. `sdk.runtime.version` is the only mechanism [VERIFIED: caido/runtime.d.ts:6-11]. |
| COMPAT-02 | SDK surfaces smoke-tested against the current Caido release | Current release is **0.58.0**, published 2026-08-20T13:40:16Z [VERIFIED: api.github.com/repos/caido/caido/releases]. Phase 0 measured 0.57.1. See "State of the Art". |
| ENC-01 | Offsets and hashes from `toRaw()`, never `toText()` | Measured: `sha256_raw` ≠ `sha256_text_utf8` on the non-UTF-8 fixture, 222 raw bytes → 242 after a `toText()` round-trip [VERIFIED: SPIKE-08.json measurement `nonutf8_raw_vs_text_digest`]. |
| DIST-05 | CI gate: backend bundle imports no Node built-in | **As literally worded this gate fails a correct plugin.** See "The DIST-05 gate must be an allowlist". |
| DIST-06 | Dependency versions pinned against the exact-pin traps | `@caido/primevue` ↔ `primevue@4.1.0`; `@caido/tailwindcss` ↔ `tailwindcss@3.4.13` [CITED: .planning/research/STACK.md:485-500]. |
</phase_requirements>

---

## Summary

Phase 1 is not a greenfield scaffold — it is a **restructure of an existing, load-bearing Phase 0 measurement harness** into a plugin monorepo, without breaking the gates, the recorder, or the go/no-go contract. That framing changes the risk profile: the highest-probability Phase 1 failure is not a design mistake in the queue, it is silently severing a relative path that a still-running LaunchAgent or a still-passing vitest gate depends on. The Runtime State Inventory below enumerates exactly what is live.

The technical design is unusually well determined, because Phase 0 measured it rather than assumed it. The handler is non-async and enqueues an ID; the consumer is exactly one; the yield primitive is `setTimeout(fn, 0)` and nothing else works; the trigger is temporal at 25 ms because a per-chunk yield costs 330% overhead against 21%; bodies arrive decompressed so `Body.length` is the correct size gate; `toRaw()` is the only byte-exact accessor; and the SQLite layer has **no transaction primitive at all** — `BEGIN` does not span `exec` calls and fails *silently*, which means code that looks transactional passes every test and provides zero atomicity. Three findings have sharper consequences than the roadmap anticipates, and each changes a plan:

1. **`ARCHITECTURE.md`'s 256-entry queue bound is refuted by Phase 0's own measurement.** Caido delivered 499 events in a single 20 ms burst. A 256-deep queue overflows by 243 in the exact scenario Phase 0 recorded, and CORE-03's "visible overflow" would be reporting an artefact of our own under-sizing rather than genuine back-pressure.
2. **DIST-05, as written, fails a correct plugin.** The built backend bundle emits `import { createHash } from "crypto"` and `import { readFileSync } from "fs"` — both Node built-in names, both of which resolve inside Caido, and one of which DET-07 makes mandatory (a JS hash loop costs 187 ms/MB against 0.34 ms/MB native). The gate must be an **allowlist of the module specifiers Phase 0 proved resolvable**, not a blanket built-in ban. The modules that must fail the gate are `zlib`, `stream`, `util`, `process`, `perf_hooks` — all of which Phase 0 measured as unloadable, and all of which `caido-dev` externalises just as silently.
3. **Caido 0.58.0 shipped today, hours before this research.** Every Phase 0 threshold is measured on 0.57.1. `@caido/sdk-backend@0.58.0`'s `typing.d.ts` is **byte-identical** to 0.57.1's and still depends on `@caido/quickjs-types@^0.26.0` (unchanged since February), so the *type* surface has not moved — but COMPAT-02 explicitly requires a smoke test against the *current* release, and 0.58.0 is not installed on this machine.

**Primary recommendation:** Build Phase 1 as five plans in the ROADMAP's shape, but sequence 01-01 to *preserve* the Phase 0 harness in place (move nothing under `scripts/spike/`, `tests/`, `probe/`, `corpus/`, `.spike/`) and add `packages/*` alongside it; make `packages/engine` SDK-free and give it the `go-no-go.json` import-and-assert test as its very first test; write every storage mutation as a **single-statement idempotent upsert keyed on a natural key**, never a multi-statement `exec` that can fail; and replace DIST-05's blanket rule with a specifier allowlist derived from `capabilities.json`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Response admission (status, size, kind, scope) | Caido backend plugin (in-hook) | — | Only the hook has the `Request`/`Response` handles, and `inScope()` is a synchronous SDK call that cannot be re-implemented faithfully. |
| Bounded queue + single consumer | Caido backend plugin (in-process) | — | Needs the SDK to reload work by ID; the engine package must stay SDK-free. |
| Chunking, deadlines, temporal yield | `packages/engine` (SDK-free) | backend wires it | Pure functions over strings and clocks; this is the boundary that makes CI-measurable behaviour possible (DET-03's precondition). |
| Byte-exact hashing and decoding | `packages/engine` (SDK-free) | backend supplies `Uint8Array` | `crypto.createHash` and `string_decoder` are runtime modules, not Caido SDK — the engine can import them and still run under vitest on Node. |
| Persistence (schema, migrations, upserts) | Caido backend plugin (`store/`) | — | `sdk.meta.db()` is only reachable from the backend SDK. |
| Project identity + lifecycle | Caido backend plugin | — | `sdk.projects.getCurrent()` / `sdk.events.onProjectChange`. |
| Version guard + capability probe | Caido backend plugin (`init()`) | frontend, if one exists | `sdk.runtime.version` exists on both, but the backend must refuse to register hooks — the frontend can only *display*. |
| Operator-visible "unsupported version" message | **Frontend plugin** (or deferred to Phase 5) | backend RPC supplies state | The backend QuickJS type surface has **no** toast/notification API [VERIFIED: no `showToast`/`Toast`/`notification` symbol anywhere in `@caido/quickjs-types@0.26.0/src`]. |
| Node-builtin/bundle-import gate | CI (Node, outside Caido) | — | Static analysis of the built artifact; must not run inside QuickJS. |
| Threshold conformance (`go-no-go.json`) | `packages/engine` test (vitest, Node) | — | The Phase 0 contract names this workspace explicitly. |

---

## Standard Stack

Every version below is already installed and exercised in this repository against a real Caido 0.57.1. Versions are **pinned exact**, not ranged — DIST-06.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@caido-community/dev` | `0.1.7` | Builds the plugin package (`tsup` backend, Vite frontend), emits `dist/plugin_package.zip` | The only supported plugin build tool; already pinned in `package.json` and used for Phase 0's Tier-1 probes [VERIFIED: package.json:23] |
| `@caido/sdk-backend` | `0.57.1` → consider `0.58.0` | Backend SDK types | Tracks the app version exactly. `0.58.0` `typing.d.ts` is byte-identical to `0.57.1` [VERIFIED: `diff` of both tarballs this session, no output] |
| `@caido/quickjs-types` | `0.26.0` | Runtime module/global types (`sqlite`, `crypto`, `caido:utils`) | Unchanged since 2026-02-11; `@caido/sdk-backend@0.58.0` still declares `"@caido/quickjs-types": "^0.26.0"` [VERIFIED: sdk-backend-0.58.0.tgz package.json] |
| `@caido/sdk-shared` | `0.2.2` | `DefinePluginPackageSpec`, `DefineAPI` | Community plugins pin this via `pnpm.overrides` to dedupe [CITED: .planning/research/STACK.md:492] |
| `typescript` | `5.8.3` **not 7.x** | Typecheck | `knip@5.x` declares `typescript >=5.0.4 <7` [CITED: .planning/research/STACK.md:498]. The repo currently has `typescript@^7.0.2` [VERIFIED: package.json:24] — **this is a live conflict Phase 1 must resolve.** |
| `vitest` | `4.1.11` | All tests, including the Phase 0 gates and the threshold-conformance test | Already the harness; `vitest@4` is compatible with `caido-dev`'s Vite 6.0.7 [CITED: STACK.md:499] |
| `pnpm` | `11.22.0` | Workspace manager | Already declared in `devEngines` [VERIFIED: package.json:12-17] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `acorn` | `8.18.0` | **Parse the built bundle for the DIST-05 gate**, not for detection | Already pinned [VERIFIED: package.json:19]. A real ESM parse beats a regex over `import` lines. Detection-side AST is Phase 9. |
| `esbuild` | `0.24.2` (transitive) | Optional metafile cross-check for DIST-05 | Present via `caido-dev`/vitest [VERIFIED: node_modules/.pnpm/esbuild@0.24.2] |
| `eslint` + `@caido/eslint-config` | `9.39.2` / `0.10.0` | Lint | `@caido/eslint-config@0.10.0` requires `eslint >=9`, `prettier ^3` [CITED: STACK.md:500] |
| `knip` | `5.86.0` | Dead-export detection across the new workspace boundary | Catches an engine package that accidentally imports the backend |
| `ajv` + `ajv-formats` | `^8.20.0` / `^3.0.1` | JSON-Schema validation of `go-no-go.json` in the conformance test | Already present and used by Phase 0's `validate-schema.mjs` [VERIFIED: package.json:20-21] |

### Deliberately NOT installed in Phase 1

| Package | Why not yet |
|---------|-------------|
| `meriyah`, `re2js` | Phases 9 and 3. Installing them now puts a parser in the bundle Phase 1's DIST-05 gate has to reason about, for zero Phase 1 benefit. They are already in the root `devDependencies` for Phase 0 probes — leave them there, do **not** add them to `packages/backend`. |
| `vue`, `primevue`, `pinia`, `@caido/primevue`, `@caido/tailwindcss` | Phase 5 (UI-*). **But DIST-06 must still be satisfied now**: add the `pnpm.overrides` pins (`"primevue": "4.1.0"`, `"tailwindcss": "3.4.13"`) in Phase 1 so the trap is disarmed before anything can install a bad transitive version, with a test asserting the override block exists. Pinning costs nothing; discovering the peer conflict in Phase 5 costs a day. |
| `zod` | `STACK.md` suggests it for the backend. Phase 1 needs no runtime schema validation, and every dependency added to the backend bundle enlarges the DIST-05 surface. Defer. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pnpm workspace with `packages/*` | Keep single package, use path aliases | Refused: DET-03 requires a workspace with **zero Caido value-imports**, and `knip` + separate `package.json` is the only mechanically enforceable form. A path alias is a convention, not a boundary. |
| `acorn` parse for DIST-05 | Regex over `^import` lines | Regex misses `export … from`, dynamic `import()`, and multi-line specifiers. Acorn is already pinned and costs ~1 ms. |
| `acorn` parse for DIST-05 | Separate `esbuild --metafile` run | Refused as the *primary* gate: it re-derives the bundle rather than inspecting the shipped one, so it can pass while `dist/index.js` differs. Keep it as an optional cross-check. |
| `PRAGMA user_version` migration ladder | A `schema_meta` table | `user_version` is header-scoped and **measured to survive across `exec` calls and connection switches** [VERIFIED: go-no-go.json:289-293]. A table read costs a `prepare` + `get` round trip and can itself be missing. Use `user_version`; a `schema_meta` table may exist *additionally* for human-readable provenance. |
| Multi-statement `exec` batches | Single-statement upserts | See Pitfall 1 — a failing batch **poisons a pooled connection** and locks the database for writes until plugin restart. |

**Installation (Phase 1 delta only — do not re-install what is already pinned):**

```bash
# Workspace conversion: add a packages: key to pnpm-workspace.yaml (it currently has NONE by design)
# then, per package:
pnpm --filter @defminer/engine   add -D vitest@4.1.11
pnpm --filter @defminer/backend  add -D @caido/sdk-backend@0.57.1 @caido/quickjs-types@0.26.0
pnpm add -D -w eslint@9.39.2 @caido/eslint-config@0.10.0 knip@5.86.0 prettier@3.8.1
# resolve the knip/TS conflict FIRST:
pnpm add -D -w typescript@5.8.3
```

**Version verification performed this session (npm registry, 2026-08-20):**

| Package | `latest` on registry | Published | Repo pins |
|---|---|---|---|
| `@caido/sdk-backend` | `0.58.0` | 2026-08-20T13:41:15Z | `0.57.1` |
| `@caido/quickjs-types` | `0.26.0` | 2026-02-11T23:20:00Z | `0.26.0` ✓ current |
| `@caido-community/dev` | `0.1.7` | 2026-05-13T17:34:43Z | `0.1.7` ✓ current |

---

## Package Legitimacy Audit

Ran `gsd-tools query package-legitimacy check --ecosystem npm` on the Phase 1 install set this session.

| Package | Registry | Last publish | Weekly downloads | Source repo | Verdict | Disposition |
|---------|----------|--------------|------------------|-------------|---------|-------------|
| `@caido-community/dev` | npm | 2026-05-13 | 146 | github.com/caido-community/dev | SUS (low-downloads) | **Approved** — official Caido community org; already installed and exercised against a real Caido in Phase 0 |
| `@caido/sdk-backend` | npm | 2026-08-20 | 308 | github.com/caido/sdk-js | SUS (too-new, low-downloads) | **Approved** — "too-new" is the `0.58.0` publish that shipped today; the pinned `0.57.1` is from 2026-07-10 |
| `@caido/sdk-frontend` | npm | 2026-08-20 | 548 | github.com/caido/sdk-js | SUS (too-new, low-downloads) | Approved (not installed in Phase 1) |
| `@caido/quickjs-types` | npm | 2026-02-11 | 286 | github.com/caido/sdk-js | SUS (low-downloads) | **Approved** |
| `@caido/sdk-shared` | npm | 2026-04-17 | 647 | github.com/caido/sdk-js | SUS (low-downloads) | **Approved** |
| `@caido/plugin-manifest` | npm | 2025-02-11 | 206 | **none declared** | SUS (low-downloads, no-repository) | Approved — transitive via `@caido-community/dev`; not a direct dependency |
| `@caido/eslint-config` | npm | 2026-05-14 | 153 | github.com/caido/typescript-configs | SUS (low-downloads) | **Approved** |
| `@caido/primevue` | npm | 2025-10-25 | 121 | **none declared** | SUS (low-downloads, no-repository) | Deferred to Phase 5 — only the `pnpm.overrides` pin lands in Phase 1 |
| `@caido/tailwindcss` | npm | 2026-02-12 | 113 | github.com/caido/tailwindcss | SUS (low-downloads) | Deferred to Phase 5 |
| `primevue` | npm | 2026-08-13 | 615,417 | none declared | SUS (too-new, no-repository) | Deferred; pin at `4.1.0` via overrides |
| `tailwindcss` | npm | 2026-07-16 | 105,971,517 | yes | **OK** | Deferred; pin at `3.4.13` via overrides |
| `typescript` | npm | 2026-07-08 | 225,722,105 | yes | **OK** | Approved at `5.8.3` |
| `vitest` | npm | 2026-08-18 | 77,728,812 | yes | SUS (too-new) | Approved — "too-new" reflects the current release, not the pinned `4.1.11` |
| `eslint` | npm | 2026-08-07 | 133,827,823 | yes | SUS (too-new) | Approved |
| `knip` | npm | 2026-08-11 | 11,375,011 | yes | SUS (too-new) | Approved |
| `esbuild` | npm | 2026-08-08 | 226,503,932 | yes | SUS (too-new) | Approved — **has `postinstall: node install.js`** (platform binary fetch), already explicitly allowlisted with a written rationale [VERIFIED: pnpm-workspace.yaml:8-12] |
| `acorn` | npm | 2026-07-28 | 209,130,674 | yes | SUS (too-new) | Approved at pinned `8.18.0` |
| `meriyah` | npm | 2026-08-17 | 10,333,626 | yes | SUS (too-new) | Not installed in Phase 1 |
| `re2js` | npm | 2026-07-05 | 4,577,169 | yes | **OK** | Not installed in Phase 1 |
| `@jridgewell/sourcemap-codec` | npm | 2025-08-12 | 171,737,226 | yes | **OK** | Not installed in Phase 1 |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged [SUS] requiring a checkpoint:** none that block. Every `too-new` verdict is an artefact of the seam scoring the registry's *latest* publish date rather than the pinned version, and every `low-downloads` verdict is on an official `@caido/*` or `@caido-community/*` package discovered from Caido's own documentation and already executed against a real Caido instance in Phase 0. **No new package enters the build in Phase 1 that was not already installed and exercised in Phase 0.** That is the strongest possible disposition and it means no `checkpoint:human-verify` is warranted here.

**Non-negotiable postinstall note:** `esbuild`'s `postinstall` is the only install script in the tree, and `pnpm-workspace.yaml` already gates it explicitly with `allowBuilds: { esbuild: true, sharp: false }`. Phase 1 must **not** convert this to a blanket approval when it adds the `packages:` key — the `allowBuilds` map and the `packages` list are independent and both must survive.

---

## Architecture Patterns

### System Architecture Diagram

```
   BROWSER ─── HTTPS ──►  CAIDO PROXY  ──► TARGET ORIGIN
                              │  response already delivered to the browser
                              │  (hook is NOT awaited — measured: 500 responses
                              │   returned 200 in 715 ms while the handler blocked 30 s)
                              ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │  DEFMINER BACKEND — ONE QUICKJS THREAD, NO WORKERS                        │
   │                                                                            │
   │  onInterceptResponse(sdk, request, response)   ← NON-ASYNC, returns void   │
   │        │                                                                   │
   │        ├─[try/catch — nothing else will ever see our error]                │
   │        │                                                                   │
   │        ▼                                                                   │
   │   ADMISSION GATE (integers + one header + inScope; NO body decode)         │
   │     reject reasons ──► counters (in memory; surfaced in Phase 2)           │
   │        │ accept                                                            │
   │        ▼                                                                   │
   │   BOUNDED RING QUEUE  ── holds {requestId, bytes, kind} only ──────────┐   │
   │     overflow ──► drop-oldest + overflow counter (CORE-03)              │   │
   │        │                                                              │   │
   │        ▼  drained by exactly ONE consumer (CORE-04)                    │   │
   │   ┌────────────────────────────────────────────────────────────┐      │   │
   │   │  CONSUMER LOOP                                              │      │   │
   │   │   sdk.requests.get(id) ──► Response ──► body.toRaw()        │      │   │
   │   │      (reload; never retained across an await — CORE-05)     │      │   │
   │   │        │                                                    │      │   │
   │   │        ▼                                                    │      │   │
   │   │   sha256(rawBytes)  [crypto.createHash — native]            │      │   │
   │   │        │                                                    │      │   │
   │   │        ├─ digest already `done` at current corpus version?  │      │   │
   │   │        │      yes ──► bump last_seen only  (CORE-08)        │      │   │
   │   │        │      no  ──► continue                              │      │   │
   │   │        ▼                                                    │      │   │
   │   │   CHUNK WALK (packages/engine — SDK-FREE)                   │      │   │
   │   │     64 KB window / 4 KB overlap for MATCHING                │      │   │
   │   │     accumulate elapsed; when ≥ MAX_SYNC_SLICE_MS (25):      │      │   │
   │   │        await setTimeout(r, 0)   ← ONLY primitive that yields │─────┘   │
   │   │     deadline expired ──► scan_state='partial'               │          │
   │   │     record max observed slice  (CORE-10)                    │          │
   │   └────────────────────────────────────────────────────────────┘          │
   │        │                                                                   │
   │        ▼                                                                   │
   │   STORE — single-statement idempotent upserts ONLY                         │
   │     sdk.meta.db()  →  pooled, worker-threaded, WAL, positional ? only      │
   │     NO BEGIN/COMMIT across exec.  NO multi-statement exec that can fail.   │
   │     every table keyed on (project_id, <natural key>)                       │
   │                                                                            │
   │   LIFECYCLE                                                                │
   │     init()           → version guard → migrate → recover stale 'running'   │
   │     onProjectChange  → cancel signal, drain queue, swap project_id,        │
   │                        clear caches   (project may be NULL)                │
   └───────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    CI (Node, outside Caido)
       dist/index.js ──► acorn parse ──► import specifiers ⊆ ALLOWLIST?  (DIST-05)
       go-no-go.json ──► engine constants asserted equal      (Phase 0 contract)
```

### Recommended Project Structure

The **critical constraint is additive**: Phase 0's harness is live and must keep working. Add `packages/`; move nothing.

```
DefMiner/
├── caido.config.ts              # EXTEND: add the real backend plugin next to tier1/* probes
├── package.json                 # root scripts; pnpm.overrides for DIST-06 pins
├── pnpm-workspace.yaml          # ADD a `packages:` key. KEEP the allowBuilds map verbatim.
├── vitest.config.ts             # KEEP tests/** include; ADD packages/*/src/**/*.spec.ts
│
│   ── PHASE 0 ARTIFACTS: DO NOT MOVE, DO NOT RENAME ──
├── scripts/spike/               # 44 scripts; LaunchAgent hard-codes recorder-session.sh
├── tests/                       # go-no-go.spec.ts, spike-results.spec.ts, schema.spec.ts
├── probe/  tier1/  corpus/      # probe packages, Tier-1 builds, fixtures (gitignored)
│
│   ── PHASE 1 NEW ──
├── packages/
│   ├── shared/                  # @defminer/shared — types only, ZERO runtime deps
│   │   └── src/{api.ts,events.ts,dto.ts,result.ts,index.ts}
│   ├── engine/                  # @defminer/engine — SDK-FREE. Runs under plain vitest.
│   │   └── src/
│   │       ├── thresholds.ts        # imports go-no-go.json; the ONLY source of constants
│   │       ├── thresholds.spec.ts   # THE Phase 0 contract test — write this FIRST
│   │       ├── queue.ts   queue.spec.ts        # bounded ring, overflow counter
│   │       ├── deadline.ts deadline.spec.ts    # wall-clock budget
│   │       ├── yield.ts                        # setTimeout(r,0) — the only yield
│   │       ├── chunker.ts chunker.spec.ts      # 64 KB / 4 KB, absolute offsets
│   │       ├── digest.ts  digest.spec.ts       # sha256 over Uint8Array
│   │       └── decode.ts  decode.spec.ts       # string_decoder / Buffer, ENC-01/02
│   └── backend/                 # the Caido plugin — THIN wiring only
│       └── src/
│           ├── index.ts             # init(sdk): guard → migrate → recover → register
│           ├── compat.ts            # COMPAT-01 version guard
│           ├── hooks/passive.ts     # onInterceptResponse admission filter
│           ├── ingest/consumer.ts   # the single CPU consumer
│           ├── store/
│           │   ├── db.ts            # memoised handle; re-resolved on project change
│           │   ├── migrations.ts    # forward-only user_version ladder
│           │   └── artifacts.ts     # single-statement upserts
│           ├── lifecycle.ts         # onProjectChange, restart recovery
│           └── telemetry.ts         # max slice, counters (in memory; Phase 2 surfaces)
└── scripts/ci/
    └── check-bundle-imports.mjs # DIST-05 gate (acorn over dist/index.js)
```

**Why `engine` is SDK-free but may import `crypto` and `string_decoder`:** DET-03 forbids *Caido* value-imports (`caido:plugin`, `caido:utils`, `caido:http`). `crypto` and `string_decoder` are runtime modules that exist under **both** Node and Caido's QuickJS, so an engine importing them still runs under plain vitest on Node — which is the whole point of the boundary. State this explicitly in the package's lint rule, or the rule will be written as "no `node:` or bare-builtin imports" and will forbid the one hashing path DET-07 makes mandatory.

### Pattern 1: Fire-and-Forget Admission (CORE-01, CORE-02)

**What:** the hook is non-async, does integer and header comparisons only, and returns.
**When:** every passive hook in Caido, unconditionally.

```ts
// packages/backend/src/hooks/passive.ts
// Source: sdk-backend typing.d.ts:120-126 (MaybePromise<void> — non-async is legal)
sdk.events.onInterceptResponse((sdk, request, response) => {   // NOT async
  try {                                                        // ERR-03 down-payment:
    const adm = admit(sdk, request, response, cfg);            // Caido surfaces NOTHING
    if (adm.kind === "reject") { stats.reject(adm.reason); return; }
    if (!queue.offer({ id: request.getId(), bytes: adm.bytes, kind: adm.kind })) {
      stats.reject("queue_overflow");                          // CORE-03 visible overflow
    }
  } catch (e) {
    stats.error("admit", e);                                   // nobody else will ever see it
  }
});
```

**The `try/catch` is not defensive coding — it is the only error visibility that exists.** `HANDLER_ERROR_SURFACED = "neither"` [VERIFIED: go-no-go.json:225-229]: a synchronous throw and an async rejection are *both* silently swallowed. Phase 0 searched 22,876 host-log lines plus stdout and stderr for a unique error string and found zero traces, while the plugin kept receiving events normally.

### Pattern 2: Temporal Yield, Not Geometric (CORE-06, CORE-07)

**What:** accumulate synchronous work; yield when elapsed approaches the slice budget. The 64 KB / 4 KB geometry serves *matching windows*, not yield frequency.

```ts
// packages/engine/src/pipeline.ts
import { MAX_SYNC_SLICE_MS } from "./thresholds";   // = 25, imported from go-no-go.json

const yieldToLoop = () => new Promise<void>((r) => setTimeout(r, 0));
// setImmediate and Promise.resolve() scored a 0.00 timer service ratio — identical to a
// fully blocking loop. setTimeout0 scored 0.76. There is exactly one yield primitive.

export async function walk(bytes: Uint8Array, ctx: Ctx) {
  let sliceStart = ctx.now();
  let maxSlice = 0;
  for (const win of windows(bytes, 65_536, 4_096)) {
    if (ctx.signal.aborted) throw new Cancelled(ctx.signal.reason);
    if (ctx.deadline.expired) return { partial: true as const, maxSlice };

    ctx.visit(win);                                   // Phase 1: hash accounting only

    const elapsed = ctx.now() - sliceStart;
    if (elapsed >= MAX_SYNC_SLICE_MS) {
      maxSlice = Math.max(maxSlice, elapsed);         // CORE-10
      await yieldToLoop();                            // costs 5.03 ms median, 6.04 ms p95
      sliceStart = ctx.now();
    }
  }
  return { partial: false as const, maxSlice };
}
```

**Why temporal, not per-chunk:** measured on 0.57.1, per-chunk yielding cost **330.7% overhead over 137 yields** versus **21.2% over 5 yields** at a 25 ms temporal budget, on the same input [VERIFIED: go-no-go.json:249-256]. A yield is not free; it costs a full `setTimeout` clamp.

### Pattern 3: Single-Statement Idempotent Upsert (STORE-01, STORE-05, STORE-07)

**What:** every mutation is one statement, keyed on a natural key, safe to replay.
**When:** always. There is no alternative — see Pitfall 1.

```ts
// packages/backend/src/store/artifacts.ts
// exec() takes NO bind parameters (verified: extra/sqlite.d.ts:74-77 — `exec(sql: string)`).
// Binding requires prepare() then Statement.run(...params) SPREAD; named params unsupported.
const stmt = await db.prepare(`
  INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count)
  VALUES (?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT (project_id, sha256) DO UPDATE SET
    last_seen_at = excluded.last_seen_at,
    seen_count   = artifacts.seen_count + 1
`);
await stmt.run(projectId, sha256, byteLen, kind, now, now);   // SPREAD, not an array
```

**No `RETURNING`, no `last_insert_rowid()`.** Phase 0: `last_insert_rowid() is unusable on sdk.meta.db()'s pooled connection` [VERIFIED: .planning/STATE.md:92]. Every row a later statement must reference is addressed by its natural key, never by a generated id read back.

### Pattern 4: Forward-Only `user_version` Migration Ladder (STORE-05)

```ts
// packages/backend/src/store/migrations.ts
// PRAGMA user_version is header-scoped and MEASURED to survive across exec calls and a
// connection switch (go-no-go.json:289-293: "connection-scoped and file-scoped PRAGMAs
// both survived", user_version=4242 read back from a DIFFERENT exec than the one that set it).
const MIGRATIONS: Array<{ v: number; sql: string }> = [
  { v: 1, sql: `CREATE TABLE IF NOT EXISTS artifacts (...); CREATE UNIQUE INDEX IF NOT EXISTS ...;` },
];

export async function migrate(db: Database) {
  const cur = (await (await db.prepare("PRAGMA user_version")).get<{ user_version: number }>())
    ?.user_version ?? 0;
  for (const m of MIGRATIONS) {
    if (m.v <= cur) continue;
    await db.exec(m.sql);                        // DDL only — see the atomicity caveat below
    await db.exec(`PRAGMA user_version = ${m.v}`); // PRAGMA cannot be parameterised
  }
}
```

**The atomicity caveat, stated precisely.** `MULTISTATEMENT_EXEC_ATOMIC = true` [VERIFIED: go-no-go.json:257-261] — a single `exec` string *is* an atomic unit. But a single `exec` that **fails** leaves an open write transaction on a pooled connection that nothing in the plugin API can reach, and the database stays locked for writes until the plugin restarts. So: migration DDL may be batched in one `exec` (it is `IF NOT EXISTS`-idempotent and essentially cannot fail), while **data writes must never be**. And because `user_version` is set in a *separate* `exec` from the DDL, a crash between the two re-runs idempotent DDL on the next boot — which is exactly why every step must be `IF NOT EXISTS`.

**`PRAGMA user_version = ?` does not bind.** SQLite does not accept a bound parameter in a `PRAGMA` value position. The migration number is a compile-time integer from a literal array, never user input — say so in a comment, or a reviewer will flag it as SQL injection.

### Pattern 5: Version Guard Before Hook Registration (COMPAT-01)

```ts
// packages/backend/src/compat.ts
export const MIN_CAIDO = "0.57.1";   // the build every Phase 0 threshold was measured on

export function checkCompat(sdk: SDK): { ok: true } | { ok: false; reason: string } {
  const v = sdk.runtime.version;                       // caido/runtime.d.ts:6-11
  if (cmpSemver(v, MIN_CAIDO) < 0) {
    return { ok: false, reason:
      `DefMiner requires Caido ${MIN_CAIDO} or newer; this instance reports ${v}. ` +
      `Passive analysis is disabled. Every DefMiner budget was measured on ${MIN_CAIDO}; ` +
      `running below it would produce silently wrong results rather than an error.` };
  }
  // Capability probe: feature-detect, never assume. @caido/quickjs-types declares ~6 globals
  // and the runtime exposes 100 — the type package is not a capability list.
  for (const [name, probe] of REQUIRED_SURFACES) {
    if (!probe(sdk)) return { ok: false, reason: `Missing SDK surface: ${name}` };
  }
  return { ok: true };
}

export function init(sdk: SDK) {
  const c = checkCompat(sdk);
  if (!c.ok) {
    sdk.console.log(`[defminer] INCOMPATIBLE: ${c.reason}`);   // reaches the host log
    sdk.api.register("getStatus", () => ({ kind: "Ok", value: { compatible: false, reason: c.reason } }));
    return;                                   // ← DO NOT register hooks. Do not open the DB.
  }
  // …normal registration
}
```

**Delivering the message.** The backend QuickJS type surface has **no toast or notification API** [VERIFIED: no `showToast`/`Toast`/`notification` symbol in `@caido/quickjs-types@0.26.0/src`]. Two honest options, and the planner must pick one explicitly:

- **(A) Backend-only Phase 1.** The "clear message" is a `sdk.console.log` line in the host log plus a `getStatus()` RPC returning `{compatible:false, reason}`. Defensible — the failure is *legible* rather than obscure — but no operator sees it without opening logs.
- **(B) Add a minimal frontend package in Phase 1** whose only job is to call `getStatus()` and render the reason. `sdk.window.showToast(...)` is documented on the frontend [CITED: developer.caido.io/plugins/guides/runtime]. Cost: pulls `@caido/sdk-frontend`, Vue, and the whole DIST-06 pin cluster forward from Phase 5.

**Recommendation: (A), plus a `checkpoint:human-verify` task at the end of Phase 1** that installs the plugin on the stale `caido-cli` 0.55.3 already on `PATH` and confirms the log line appears and that no hook fires. That satisfies success criterion 7's *substance* ("clear message, not an obscure failure") at Phase-1 cost, and Phase 5 upgrades it to a visible surface. Record in `.planning/WINDOWS.md` that the UI half is owed.

### Anti-Patterns to Avoid

- **Doing anything with the body inside the hook.** `getBody()?.toText()` or `toRaw()` inside `onInterceptResponse` materialises megabytes on the one thread that also serves your RPC and every other timer. `Body.length` is a `readonly` property that costs no decode [VERIFIED: requests.d.ts:26-29] — that is the only body access the gate may perform.
- **`async` on the hook callback.** It is *type-legal* (`MaybePromise<void>`) and it is the exact shape that makes the pipeline look fine and starve the thread. CORE-01 says non-async; enforce it with a lint rule, not a comment.
- **Any hand-written per-character loop.** Measured: an *empty* per-char loop costs 9 ms/MB; a JS djb2 hash costs 187 ms/MB against 0.34 ms/MB for native SHA-256 [CITED: .planning/research/SUMMARY.md:118-131]. DET-07 forbids these outright, and Phase 1's hashing path is where the temptation first appears.
- **Storing bodies as SQLite blobs.** `sdk.meta.db()` lives in Caido Data, is never GC'd by Caido, and is **not deleted when a project is deleted**. Hashes and offsets in SQLite; bytes on disk under `sdk.meta.path()` with a byte budget, or not at all in Phase 1.
- **Assuming `sdk.meta.db()` is project-scoped.** It is one database for the plugin across every project. `project_id` in every table and every `WHERE` (STORE-02).
- **Treating `@caido/quickjs-types` as the capability list.** It declares ~6 globals; the runtime exposes 100 [VERIFIED: capabilities.json:1 `"globals_count": 100`]. Feature-detect.
- **Building `path_key` / `pathKey()`.** `ARCHITECTURE.md` proposes both. They serve DIFF-01 only, which is v2, and SPIKE-13 (their validating spike) was explicitly moved to v2. Building them now is speculative schema.
- **A `value_raw` column.** `ARCHITECTURE.md`'s `findings` DDL contains `value_raw TEXT NOT NULL`. This **directly contradicts SEC-04** ("Raw secret values are never written to SQLite"). Phase 1 creates no findings table at all, but if any part of that DDL is lifted, this column must not come with it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Content hashing | A JS hash loop over bytes | `crypto.createHash("sha256")` from the `crypto` module | 187 ms/MB versus 0.34 ms/MB — a 550× difference, and DET-07 forbids the loop [VERIFIED: capabilities.json:1 lists `createHash`, `Sha256`] |
| Byte→text decoding | A hand-rolled UTF-8 decoder | `string_decoder.StringDecoder` or `Buffer.from(u8).toString("utf8")` | `TextDecoder` is **not a global and is exported by no probed module** [VERIFIED: go-no-go.json:433-437], but these two are present and correct [VERIFIED: capabilities.json:1 `"string_decoder": ["StringDecoder","default"]`] |
| Scope matching | Re-implementing Caido's allowlist/denylist semantics | `sdk.requests.inScope(request, scopes?)` | Synchronous, and it is Caido's own engine — a re-implementation will diverge on the first edge case [VERIFIED: requests.d.ts:823-825] |
| Decompression | A gzip/brotli/zstd decoder | Nothing — Caido already decoded it | `BODY_STORED_DECOMPRESSED = true` for gzip, br and zstd [VERIFIED: go-no-go.json:112-116]; `zlib` does not even load in this runtime [VERIFIED: capabilities.json:1 `"zlib": "ERR: ReferenceError..."`] |
| Yielding to the event loop | `setImmediate`, `queueMicrotask`, `Promise.resolve()`, `await null` | `new Promise(r => setTimeout(r, 0))` | All three alternatives scored a **0.00 timer service ratio — identical to a fully blocking loop** [VERIFIED: go-no-go.json:481-492] |
| Transactions | `BEGIN` / `COMMIT` as separate `exec` calls | Single-statement idempotent upserts | `BEGIN` does not span `exec` calls and **every statement returns SUCCESS anyway** — the failure is silent [VERIFIED: go-no-go.json:441-447] |
| Row identity after insert | `last_insert_rowid()` or `RETURNING` | A natural key you already hold | Measured unusable on the pooled connection [VERIFIED: .planning/STATE.md:92] |
| Migration versioning | A `schema_version` table read at boot | `PRAGMA user_version` | Header-scoped, survives a connection switch, one round trip [VERIFIED: go-no-go.json:289-293] |
| Bundle import analysis | A regex over `^import` lines | `acorn.parse(src, {sourceType:"module"})` + walk `ImportDeclaration` / `ExportNamedDeclaration.source` / `ImportExpression` | Regex misses `export … from`, dynamic imports, and multi-line specifiers — the three shapes a dependency is most likely to use |
| Caido version comparison | `parseFloat(version)` or string compare | A three-part numeric split, as Caido's own guide shows | `"0.57.1" < "0.6.0"` is `true` under string compare and `false` under semver — an off-by-one-release bug that only fires at 0.6.0 [CITED: developer.caido.io/plugins/guides/runtime] |

**Key insight:** in this runtime, *every* hand-rolled primitive is between 50× and 550× slower than the native one, and several of the obvious substitutes (`setImmediate`, `BEGIN/COMMIT`, `last_insert_rowid`) do not merely underperform — they **succeed silently while doing nothing**. That is the domain's signature failure: the wrong choice passes its own tests.

---

## Runtime State Inventory

> Phase 1 restructures a repository that is currently a live Phase 0 measurement harness. This is a refactor, not a greenfield scaffold, and the following state exists outside the source tree.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `.spike/recorder-data/` — the SPIKE-10 recorder's isolated Caido data path, actively accumulating the cross-day cache log that open Broken Window #6 depends on. `.spike/` is gitignored [VERIFIED: .gitignore:23-28]. Also `results/spike-04-runs/*/*.db` (ACTIVE-02 journals, committed evidence). | **Do not touch.** No migration. Phase 1 must not run anything that writes into `.spike/`. |
| **Live service config** | A **Caido instance is running right now** on `127.0.0.1:8998` (pid 79273, `caido-cli`), serving the recorder [VERIFIED: `lsof -nP -iTCP:8998 -sTCP:LISTEN` this session]. Its data path is `.spike/recorder-data`. | Phase 1's own dev/test instances must use a **different port**; `scripts/spike/instance.sh` defaults to 8999 and refuses 8080 [VERIFIED: scripts/spike/instance.sh:20-21]. Pick a Phase-1 port that is neither 8998, 8999, 8080, nor 3100 (`caido.config.ts` watch port). |
| **OS-registered state** | `~/Library/LaunchAgents/com.defminer.spike.recorder.plist`, **loaded** (`launchctl list` shows it). It hard-codes `ProgramArguments = /bin/bash /Users/six2dez/Tools/DefMiner/scripts/spike/recorder-session.sh` and `WorkingDirectory = /Users/six2dez/Tools/DefMiner`, firing at 10:30 and 18:30 daily [VERIFIED: read the plist this session]. | **Moving or renaming `scripts/spike/recorder-session.sh` silently kills the agent** and Broken Window #6 (`CACHE_HIT_RATE_CROSS_DAY`, revisit 2026-09-03) can never be closed. If Phase 1 must move it, the plan needs an explicit re-register task (`launchctl unload` → edit plist → `launchctl load`) and a verification that the next scheduled run produced output in `.spike/agent.out.log`. **Recommended: do not move it.** |
| **Secrets / env vars** | Per-run Caido guest bearer tokens under `results/runs/*/token`, gitignored and deleted on teardown [VERIFIED: .gitignore:36, instance.sh teardown]. No long-lived secret. `SEC-04`'s HMAC key does not exist yet (Phase 4). | None for Phase 1, but the new `packages/backend` must not write anything into `results/runs/`. |
| **Build artifacts** | `tier1/parse/dist/index.js`, `tier1/redos/dist/index.js` (built Tier-1 probes), `dist/plugin_package.zip`, `probe/*.zip`. All gitignored and regenerable [VERIFIED: .gitignore:30-32]. | `caido.config.ts` currently declares **only** the two `tier1/*` backends. Phase 1 must **add** the DefMiner backend to the `plugins` array without removing them — the schema is a `z.strictObject`, so a malformed addition fails the whole build. |
| **Test-harness coupling** | `vitest.config.ts` includes **only** `tests/**/*.spec.ts` [VERIFIED: vitest.config.ts:6]. `tests/go-no-go.spec.ts` reads `.planning/phases/00-.../results` via **paths relative to cwd** [VERIFIED: tests/go-no-go.spec.ts:14-17]. | Converting to a workspace changes vitest's cwd resolution per project. Either keep a single root vitest config that adds `packages/*/src/**/*.spec.ts` to `include`, or use a vitest workspace with an explicit `root` per project — and **re-run `pnpm test` before and after** to prove the Phase 0 gates still pass. This is the single most likely way Phase 1 silently breaks Phase 0. |
| **Workspace manifest** | `pnpm-workspace.yaml` deliberately has **no `packages:` key** and a hand-written `allowBuilds` map with per-package true/false rationale [VERIFIED: pnpm-workspace.yaml:1-20]. | Adding `packages:` is required. **Preserve `allowBuilds` verbatim** — regenerating the file from a template would blanket-approve `sharp`, reversing a deliberate Phase 0 security decision. |
| **Dependency conflict, live** | Root `devDependencies` pins `"typescript": "^7.0.2"` [VERIFIED: package.json:24], and `@typescript/typescript-darwin-arm64@7.0.2` is installed. `knip@5.x` declares `typescript >=5.0.4 <7`. | Phase 1 introduces `knip`. Resolve **before** adding it: either downgrade to `typescript@5.8.3` (recommended — matches `STACK.md`'s verified compatibility matrix) or drop `knip`. Do not discover this during 01-01's lint task. |

---

## Common Pitfalls

### Pitfall 1: A failed multi-statement `exec` locks the database until plugin restart

**What goes wrong:** you batch `BEGIN; INSERT…; INSERT…; COMMIT;` into one `exec` for atomicity. One insert violates a constraint. The batch throws. The pooled connection it ran on is left holding an **open write transaction**, and no bare `COMMIT` or `ROLLBACK` you issue afterwards can reach it — those land on *other* pooled connections. Every subsequent write fails with `Error: error returned from database: (code: 5) database is locked`.
**Why it happens:** `sdk.meta.db()` is a connection pool with each connection on a worker thread [VERIFIED: extra/sqlite.d.ts:60-65]. Statement-to-connection affinity is not exposed and not controllable.
**How to avoid:** never put a statement that can fail inside a multi-statement `exec`. DDL with `IF NOT EXISTS` is safe (it cannot fail on a re-run); data writes are not. Use `prepare()` + `run()` per row, with `ON CONFLICT DO UPDATE`.
**Warning signs:** the first `SQLITE_BUSY` after a constraint violation. There is no recovery path in the plugin API — the measured remedy was a plugin restart. [VERIFIED: go-no-go.json:257-263 and SPIKE-09.json measurements `next_write_after_failed_batch_locked=true`, `failed_batch_left_transaction_open=true`]

### Pitfall 2: Transactions that report success and do nothing

**What goes wrong:** you split `BEGIN` / `INSERT` / `ROLLBACK` across three `exec` calls. All three return success. The row is still there — the insert autocommitted. Worse, a second `BEGIN` in the very next `exec` also *succeeds*, which SQLite permits only when no transaction is active.
**Why it happens:** statements land on different pooled connections; each is in autocommit.
**How to avoid:** treat "no transactions exist" as an axiom, not a limitation to work around. Design so that no invariant requires two statements to land together.
**Warning signs:** there are none. `BEGIN`, `COMMIT` and `ROLLBACK` all return SUCCESS throughout. **Code that looks transactional will pass every test and provide no atomicity whatsoever** — Phase 0's own words. [VERIFIED: go-no-go.json:441-447]

### Pitfall 3: Sizing the queue at 256 and calling the overflow "back-pressure"

**What goes wrong:** you adopt `ARCHITECTURE.md`'s "Pending queue depth: 256 contents" and ship. On the very first burst the counter lights up, and CORE-03's "visible overflow" reports your own under-sizing as if it were target-driven load.
**Why it happens:** the 256 figure predates any measurement of Caido's delivery behaviour. Phase 0 then measured it: Caido **queues** and loses nothing, delivering **499 events in a 20 ms burst** after a 30 s handler block, with a contiguous sequence and no client-latency inflation [VERIFIED: go-no-go.json:185-197]. A 256-deep queue overflows by 243 in that exact recorded scenario.
**How to avoid:** derive the bound from two facts. (a) A queue **entry** is `{requestId, bytes, kind}` — roughly 100–200 bytes, because CORE-05 forbids retaining SDK objects. (b) The measured worst observed burst is 500. So a bound of **1024–4096 entries** costs 0.1–0.8 MB and sits comfortably above the only burst anyone has measured, while still being finite. Bound *memory* separately and much tighter: with CPU concurrency 1, at most one body is resident, and at 102 bytes of RSS per input byte a single 8 MB artifact already costs ~817 MB inside `caido-cli` [VERIFIED: go-no-go.json:337-341]. **The queue bound protects against unbounded growth; the size ceiling protects against memory. Do not conflate them.**
**Warning signs:** overflow counts that correlate with page loads rather than with target size.

### Pitfall 4: A content-type-keyed admission gate silently classifies every 304 as non-script

**What goes wrong:** `classify(contentType, ext)` returns `null` for a 304 and you record it as "not JS", when in fact it is a revalidation of a JS bundle you may already know about.
**Why it happens:** a 304 reaches the hook with `Body.length == toRaw().length == 0` **and no `content-type` header whatsoever** [VERIFIED: go-no-go.json:409-413].
**How to avoid:** gate on status *first* and treat 304 as its own admission outcome (`REJECT("revalidation")` with its own counter), not as a content-type miss. Then the Phase 6 retroactive scanner has an honest number to work from.
**Warning signs:** a `reject:kind` counter that dwarfs `reject:status` on a warm-cache browsing session.

### Pitfall 5: Believing passive coverage is complete

**What goes wrong:** the plugin reports "N artifacts observed" and an operator reads it as "everything on this target".
**Why it happens:** two independent blind spots, both measured. (a) `SURFACES_FIRING_INTERCEPT = "proxy"` — Replay, Automate, workflows, plugin sends and `caido:http` fetch all reach the origin and deliver **nothing** to the hook [VERIFIED: go-no-go.json:425-429]. (b) `CACHED_RESPONSES_REACH_HOOK = false` — a browser-cache hit never enters Caido at all [VERIFIED: go-no-go.json:120-124], making `RETROACTIVE_SCAN_MANDATORY = true` [VERIFIED: go-no-go.json:329-333].
**How to avoid:** Phase 1's counters must be labelled "proxied responses observed", never "responses on this target". OBS-02's vocabulary lands in Phase 2, but the *naming* decision is made in Phase 1 and is expensive to change afterwards.
**Warning signs:** any UI string or column name containing "all" or "complete".

### Pitfall 6: A DIST-05 gate that bans built-ins and thereby bans the plugin

**What goes wrong:** the gate asserts `imports ∩ builtinModules === ∅`. It immediately fails, because the plugin correctly imports `crypto` for SHA-256 and may import `fs` for the body cache. Someone "fixes" it by whitelisting everything, and the gate stops catching anything.
**Why it happens:** the requirement's wording ("imports no Node built-ins") describes the *symptom* Caido's build hides, not the *rule*. `caido-dev` externalises `[/caido:.+/, "sqlite", ...builtinModules]` [VERIFIED: @caido-community/dev@0.1.7 dist/cli.js:118], and Caido's QuickJS resolves *some* of those names and not others.
**How to avoid:** see the next section — an allowlist.
**Warning signs:** a gate whose expected-failure fixture has never actually been run.

### Pitfall 7: Restructuring the repo and silently unhooking Phase 0

**What goes wrong:** `packages/` is created, files move, `vitest.config.ts` is regenerated, and `pnpm test` now runs three Phase-1 specs and zero Phase-0 gates — green, and meaningless.
**Why it happens:** `tests/go-no-go.spec.ts` is the Phase 0 exit gate and resolves its inputs relative to cwd; the workspace conversion changes cwd semantics.
**How to avoid:** capture `pnpm test` output *before* the conversion, assert the same test count and the same gate names afterwards. Make it a task with a recorded before/after, not a claim.
**Warning signs:** a falling test count that nobody notices because everything is green.

### Pitfall 8: Measuring the "200-chunk SPA" success criterion inside the same process it measures

**What goes wrong:** success criterion 3 asks that "the plugin's own UI and RPC stay responsive throughout, with the maximum observed synchronous slice recorded". If the responsiveness probe runs *inside* the same QuickJS thread as the analysis, a starved thread cannot report that it is starved.
**Why it happens:** there is exactly one thread and no memory or scheduler introspection (`perf_hooks`, `process`, `llrt:qjs` all fail to load) [VERIFIED: capabilities.json:1].
**How to avoid:** measure from outside. Phase 0 already solved this: an external caller polls an RPC on a fixed interval while load runs, and jitter in the observed response times is the signal. `scripts/spike/probe-run.sh` (install + call over the GraphQL/REST API) and `scripts/spike/instance.sh` (version-asserted isolated instance) are reusable as-is [VERIFIED: read both this session].
**Warning signs:** a max-slice number that is suspiciously close to the budget on every run — that is the instrument, not the system.

---

## The DIST-05 gate must be an allowlist, not a ban

This is the single most consequential correction in this document, so it gets its own section.

**The measured facts.**

1. `@caido-community/dev@0.1.7` builds the backend with `external: [/caido:.+/, "sqlite", ...builtinModules]` [VERIFIED: node_modules/.pnpm/@caido-community+dev@0.1.7…/dist/cli.js:118 — `external: [/caido:.+/, "sqlite", ...builtinModules]`]. Node 26's `builtinModules` has 66 entries and includes `crypto`, `fs`, `path`, `os`, `buffer`, `string_decoder`, `url`, `events`, `zlib`, `stream`, `util`, `process` [VERIFIED: `node -e "require('module').builtinModules"` this session].
2. Caido's QuickJS resolves **some** of those and hard-fails on others. Measured on 0.57.1 [VERIFIED: results/runs/20260820T121824Z-31596/raw/capabilities.json:1]:

   > `"os": [...], "path": [...], "fs": [...], "sqlite": ["Database","default","open"], "caido:http": [...], "crypto": ["Crc32","Crc32c","Md5","Sha1","Sha256","Sha384","Sha512","createCipheriv","createDecipheriv","createHash","createHmac","crypto","default","getRandomValues","randomBytes","randomFill","randomFillSync","randomInt","randomUUID","webcrypto"], "buffer": ["Buffer","atob","btoa","constants","default"], "string_decoder": ["StringDecoder","default"], "url": [...], "events": ["EventEmitter","default"]`
   >
   > and, failing: `"llrt:qjs": "ERR: ReferenceError: could not load module 'llrt:qjs'", "qjs": "ERR…", "perf_hooks": "ERR…", "process": "ERR…", "caido:crypto": "ERR…", "util": "ERR: ReferenceError: could not load module 'util'", "stream": "ERR: ReferenceError: could not load module 'stream'", "zlib": "ERR: ReferenceError: could not load module 'zlib'"`

3. A real, working, Phase 0 backend bundle already emits built-in imports. `tier1/parse/dist/index.js` begins [VERIFIED: tier1/parse/dist/index.js:1-3]:

   > ```
   > // tier1/parse/src/index.ts
   > import { readFileSync } from "fs";
   > import { createHash } from "crypto";
   > ```

**Therefore DIST-05's literal wording — "the built backend bundle imports no Node built-ins" — would fail a correct DefMiner**, and would forbid the native SHA-256 that DET-07 makes mandatory.

**The correct gate.** Assert that the set of import specifiers in the built bundle is a **subset of a measured allowlist**:

```js
// scripts/ci/check-bundle-imports.mjs
// The allowlist is DERIVED, not authored: every entry is a module the Phase 0 capability
// probe loaded successfully inside Caido 0.57.1. Adding an entry by hand is a lie unless
// a probe run proves it. See results/runs/20260820T121824Z-31596/raw/capabilities.json.
const RESOLVABLE = new Set([
  "crypto", "path", "fs", "os", "buffer", "string_decoder", "url", "events", "sqlite",
]);
const CAIDO = /^caido:/;                       // caido:plugin, caido:utils, caido:http

// Measured to FAIL inside Caido despite being externalised by the build:
//   util, stream, zlib, process, perf_hooks, llrt:qjs, qjs, caido:crypto
// Anything not in RESOLVABLE and not caido:* is a build-time pass / runtime crash.

import { parse } from "acorn";
const ast = parse(readFileSync(BUNDLE, "utf8"), { ecmaVersion: "latest", sourceType: "module" });
const specifiers = new Set();
for (const n of ast.body) {
  if (n.type === "ImportDeclaration") specifiers.add(n.source.value);
  if ((n.type === "ExportNamedDeclaration" || n.type === "ExportAllDeclaration") && n.source)
    specifiers.add(n.source.value);
}
// plus a walk for ImportExpression (dynamic import) with a literal source
const bad = [...specifiers].filter((s) => !CAIDO.test(s) && !RESOLVABLE.has(s));
if (bad.length) fail(`backend bundle imports unresolvable module(s): ${bad.join(", ")}`);
```

**Three details the gate must get right, or it is theatre:**

- **`node:`-prefixed specifiers must fail.** `builtinModules` contains only bare names (its four `node:`-prefixed entries are `node:sea`, `node:sqlite`, `node:test`, `node:test/reporters`) [VERIFIED: `node -e` this session], and Caido's probe loaded bare `crypto`, never `node:crypto`. Treat `node:*` as unresolvable until a probe says otherwise. This is a live risk: modern lint configs actively *push* you toward the `node:` prefix.
- **The gate must read the shipped artifact**, `packages/backend/dist/index.js` (and ideally the backend entry inside `dist/plugin_package.zip`), not a re-derived esbuild output.
- **The gate needs a negative fixture.** Add a test that builds a throwaway module importing `zlib` and asserts the gate **fails**. A gate whose failure path has never executed is the shape of every Phase 0 verification defect ("the prose stated a rule correctly, and the gate checked less than the prose claimed" — `.planning/STATE.md:120`).

---

## Schema corrections

`ARCHITECTURE.md` §Question 3 contains a full DDL written before Phase 0 measured anything. Phase 1 should mine it for shape, not copy it. Corrections:

| `ARCHITECTURE.md` proposes | Correction | Reason |
|---|---|---|
| `id TEXT NOT NULL PRIMARY KEY -- uuid` on `assets`, `findings`, `asset_versions` | Use a **composite natural key** as the PRIMARY KEY | `last_insert_rowid()` is unusable on the pooled connection [VERIFIED: STATE.md:92]; a surrogate id you cannot read back is a liability, and STORE-02 wants `project_id` in the key |
| `findings.value_raw TEXT NOT NULL` | **Delete.** HMAC fingerprint + redacted preview only | Directly contradicts SEC-04 |
| `assets.path_key` + `pathKey()` | **Omit from Phase 1** | Serves DIFF-01 only, which is v2; its validating spike moved to v2 with it |
| `PRAGMA foreign_keys = ON` once at init | Do not rely on it | It is **per-connection**, and the pool has up to 5 connections by default [VERIFIED: extra/sqlite.d.ts:32-36]. `PRAGMA_PERSISTS_ACROSS_EXEC` measured that `cache_size` survived — but only because the pool happened to reuse a connection. Prefer application-level integrity |
| A `findings` table in Phase 1 | Omit | No detector exists until Phase 3. Phase 1's success criterion 4 is about **artifacts**, not findings |
| `contents` doubling as the durable job queue | **Keep this — it is the best idea in the document** | `scan_state='pending'` surviving a restart is precisely how ERR-02/CORE-09 recovery becomes cheap, and it costs one column |
| `STRICT` tables, `RETURNING`, window functions | Avoid | SQLite version is unpinned and was not probed in Phase 0 — an open question below |

**Minimum Phase 1 schema** (illustrative shape, not final): `artifacts` (content-addressed, `PRIMARY KEY (project_id, sha256)`), `observations` (the artifact↔request↔URL edge, `PRIMARY KEY (project_id, sha256, request_id)`), `analysis_runs` (`detector_set_hash`, `scan_state`, `max_slice_ms`, `started_at`, `finished_at`), and `settings` (`PRIMARY KEY (project_id, key)`, with `project_id = ''` meaning global). Four tables, every one keyed on `project_id`, every write a single-statement upsert.

---

## Code Examples

### Byte-exact ingest — the ENC-01 path end to end

```ts
// packages/backend/src/ingest/consumer.ts
const rr = await sdk.requests.get(entry.id);        // reload — CORE-05
if (rr?.response === undefined) { markMissing(entry); return; }   // get() may return undefined

const body = rr.response.getBody();
if (body === undefined) { markEmpty(entry); return; }

const raw: Uint8Array = body.toRaw();               // ENC-01: bytes, never toText()
// Measured proof that this matters (SPIKE-08, fixture corpus/encoded/nonutf8.js):
//   sha256(toRaw())            = 4dc8826e5489007f1bb33a221aa67e0b7729c3c9ff0652cb0ad2a47758fee94d
//   sha256(utf8(toText()))     = 9197a051d895474fd1c928fc6401350a2c527568cfa364380100b366a05619e6
//   222 raw bytes became 242 after the toText() round trip.
// Offsets computed on toText() would not map to raw bytes, and the hash would not
// identify the artifact.

import { createHash } from "crypto";                // native; 0.34 ms/MB
const sha256 = createHash("sha256").update(raw).digest("hex");

// Text, when a human needs it, is derived EXPLICITLY and separately:
import { StringDecoder } from "string_decoder";     // TextDecoder does not exist here
const text = new StringDecoder("utf8").end(Buffer.from(raw));
```

### The Phase 0 contract test — write this before anything else

```ts
// packages/engine/src/thresholds.spec.ts
// The Phase 0 exit contract, mechanised. 00-GO-NO-GO.md:26-32 requires that every tunable
// constant import its value from go-no-go.json and be asserted equal to it by a test in
// THIS workspace. A developer who tunes a constant without re-measuring fails CI.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as T from "./thresholds";

const G = JSON.parse(readFileSync(
  ".planning/phases/00-runtime-reality-check/results/go-no-go.json", "utf8"));

describe("engine constants trace to go-no-go.json", () => {
  it("MAX_SYNC_SLICE_MS", () => expect(T.MAX_SYNC_SLICE_MS).toBe(G.thresholds.MAX_SYNC_SLICE_MS.value));
  it("YIELD_COST_MS",     () => expect(T.YIELD_COST_MS).toBe(G.thresholds.YIELD_COST_MS.value));
  it("SIZE_GATE_SOURCE",  () => expect(T.SIZE_GATE_SOURCE).toBe(G.thresholds.SIZE_GATE_SOURCE.value));

  // The inconclusive case, handled EXACTLY as the contract dictates: where a threshold is
  // null with status "inconclusive", the engine imports the ACCOMPANYING ASSUMED value and
  // the test asserts THAT — so the placeholder is visible in review, not buried in a comment.
  it("cache hit rate uses the pessimistic default while cross-day is inconclusive", () => {
    expect(G.thresholds.CACHE_HIT_RATE_CROSS_DAY.value).toBeNull();
    expect(G.thresholds.CACHE_HIT_RATE_CROSS_DAY.status).toBe("inconclusive");
    expect(T.CACHE_HIT_RATE).toBe(G.thresholds.CACHE_HIT_RATE_ASSUMED.value);   // 0.4
  });

  // Fail loudly the day the recorder produces a second calendar day, so nobody keeps
  // budgeting against a placeholder that has been superseded. (Broken Window #6.)
  it("flags when the real cross-day rate becomes available", () => {
    if (G.thresholds.CACHE_SAMPLE_DAYS.value >= 2 &&
        G.thresholds.CACHE_CROSS_DAY_DENOMINATOR.value > 0) {
      expect.fail("CACHE_HIT_RATE_CROSS_DAY is now measurable — re-run aggregate.py + " +
                  "render-go-no-go.py and switch CACHE_HIT_RATE off the assumed default");
    }
  });
});
```

### The bounded queue, with the overflow that CORE-03 requires

```ts
// packages/engine/src/queue.ts — SDK-free, so it unit-tests under plain vitest
export type Entry = { id: string; bytes: number; kind: string };

export class BoundedQueue {
  #buf: Entry[] = [];
  #overflow = 0;
  constructor(private readonly cap: number) {
    // Cap is derived, not chosen: Caido delivered 499 events in a single 20 ms burst
    // after a 30 s handler block (go-no-go.json EVENTS_DELIVERED_UNDER_BLOCK = 500).
    // An entry is ~100-200 bytes because CORE-05 forbids retaining SDK objects, so a
    // cap comfortably above the measured burst costs well under 1 MB.
    if (cap < 500) throw new Error("cap below the measured 500-event burst");
  }
  offer(e: Entry): boolean {
    if (this.#buf.length >= this.cap) { this.#overflow++; this.#buf.shift(); }  // drop oldest
    this.#buf.push(e);
    return this.#overflow === 0;
  }
  get overflowCount() { return this.#overflow; }   // OBS-01 reads this in Phase 2
  get depth() { return this.#buf.length; }
}
```

---

## The ERR-03 seam Phase 1 must leave open

ERR-01…ERR-04 and OBS-01…OBS-03 are Phase 2. But Phase 0 measured that **Caido surfaces neither a synchronous throw nor an async rejection from a handler** [VERIFIED: go-no-go.json:225-231], which means a Phase 1 that ships without any catch is not merely un-observable — it is a plugin where a single bad response stops all analysis, forever, with zero trace in any log.

Phase 1's obligation is narrow and cheap: **one `try/catch` around the hook body and one around each consumer iteration, both routing into an in-memory counter object**. No health surface, no vocabulary, no export — those are Phase 2's. But the counters must exist and must be reachable, or Phase 2 has to retrofit them through code that has already been reviewed. This is a three-line down-payment on a phase-sized debt; do not let it slip.

---

## State of the Art

| Old | Current | When changed | Impact on Phase 1 |
|---|---|---|---|
| Caido **0.57.1** — the build every Phase 0 threshold was measured on | Caido **0.58.0** | 2026-08-20T13:40:16Z (**today**) [VERIFIED: api.github.com/repos/caido/caido/releases] | COMPAT-02 requires a smoke test against the *current* release. 0.58.0 is **not installed** on this machine. |
| `@caido/sdk-backend@0.57.1` | `@caido/sdk-backend@0.58.0`, published 2026-08-20T13:41:15Z | today | `typing.d.ts` is **byte-identical** across the two versions and both declare `"@caido/quickjs-types": "^0.26.0"` [VERIFIED: diffed both tarballs this session]. The type surface has not moved. |
| HTTPQL `raw`-only body/header matching | HTTPQL gains `req.header`, `req.body`, `resp.body` fields | 0.58.0 [CITED: github.com/caido/caido/releases/tag/v0.58.0] | Not Phase 1 — but it materially improves FIND-03's push-down in Phase 6. Record it; do not act on it. |
| Manifest with a minimum-version field | Still none | never [VERIFIED: @caido/plugin-manifest dist/index.d.ts:33-42 — `Manifest` = `{author?, description?, id, links?, name?, plugins, version}`] | COMPAT-01 must be a runtime guard. There is no declarative option. |
| `caido/caido#2211` treated as a hard cliff at ~54–120 sends | Did **not** reproduce at 2,000 sends in any of three variants; `SEND_CLIFF_*` are **floors**, not cliffs | Phase 0, 2026-08-20 | Not Phase 1 (no outbound requests), but it means Phase 8's mitigations are less urgent than the roadmap assumed. Open Broken Window #4. |

**Deprecated / do not use:**
- `TextDecoder` / `TextEncoder` — not globals and exported by no module. Use `string_decoder.StringDecoder` or `Buffer`.
- `structuredClone` — `undefined`. The `meriyah@7` polyfill guard is mandatory and unconditional (Phase 9's problem, but the guard belongs wherever meriyah lands).
- `WebAssembly` — `undefined`. Rules out `oxc`, `swc`, `mappings.wasm` structurally.
- `setImmediate` / `Promise.resolve()` as yields — present but functionally inert for this purpose.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | The go/no-go thresholds measured on Caido 0.57.1 still hold on 0.58.0 | State of the Art | Any budget could be wrong. Mitigated by the byte-identical type surface, but **behaviour is not types** — COMPAT-02's smoke test on 0.58.0 is the only thing that closes this. Treat as the phase's top open risk. |
| A2 | A queue entry costs 100–200 bytes, so a 1024–4096 cap is cheap | Pitfall 3 | If entries grow (e.g. someone adds headers), the memory argument for the cap evaporates. Add a test asserting the entry type has no reference to an SDK object. |
| A3 | `typescript@5.8.3` is the right resolution of the `knip` conflict | Standard Stack | Downgrading TS from 7.x may break Phase 0's existing typecheck (if any). Verify before committing to it; dropping `knip` is the alternative. |
| A4 | The DIST-05 allowlist (`crypto, path, fs, os, buffer, string_decoder, url, events, sqlite`) is complete for Phase 1's needs | DIST-05 section | If the backend needs a module outside it, the gate blocks a legitimate build. The remedy is a probe run, not an allowlist edit — say so in the script's comment. |
| A5 | `node:`-prefixed specifiers do not resolve inside Caido's QuickJS | DIST-05 section | Only bare specifiers were probed. If `node:crypto` *does* resolve, the gate is merely over-strict (safe direction). If it does not and the gate permits it, a runtime crash ships. Strict is correct here. |
| A6 | Caido's bundled SQLite supports `ON CONFLICT … DO UPDATE` (SQLite ≥ 3.24) | Pattern 3 | The entire upsert strategy depends on it and **`SELECT sqlite_version()` was never run in Phase 0**. This is the highest-value five-minute probe in Phase 1. See Open Question 1. |
| A7 | `sdk.requests.get(id)` returns a body for a request whose `onInterceptResponse` has just fired | Code Examples | If there is a persistence lag, the consumer sees `undefined` for recent work and the pipeline silently drops the newest artifacts — the worst possible failure shape. See Open Question 2. |
| A8 | The operator wants the Phase 0 harness preserved in place rather than reorganised | Runtime State Inventory | If they would rather have a clean tree, the LaunchAgent and vitest paths need explicit migration tasks. This is a genuine judgement call the planner should surface. |

---

## Open Questions (RESOLVED — all five closed at planning time, 2026-08-20)

> Each question below is answered by a task in a committed plan. Three cross-references in the original text
> named the wrong plan, because the phase was planned tracer-first and every plan number shifted by one; the
> plan numbers here are corrected and the recommendations are annotated with their real owner. Nothing was
> deferred.

1. **What SQLite version does `sdk.meta.db()` expose?**
   - What we know: the driver is a pooled, worker-threaded, WAL-on implementation with `exec`/`prepare`/`Statement.{run,get,all}` and positional-only binding. `PRAGMA` works.
   - What's unclear: `SELECT sqlite_version()` was never run. `ON CONFLICT … DO UPDATE` needs ≥ 3.24 (2018); partial indexes need ≥ 3.8; `STRICT` needs ≥ 3.37; `RETURNING` needs ≥ 3.35.
   - Recommendation: make this the first thing a live instance is asked. One
     `prepare("SELECT sqlite_version() AS v").get()`, recorded as an artifact. Every schema decision downstream
     branches on it, and the upsert strategy has no fallback if it lands below 3.24.
   - **RESOLVED — owner: plan 01-01, tracer task (reads it at `init()`) and task 3 (records and gates it).**
     *Corrected from "plan 01-03": the phase leads with a tracer, so this lands one plan earlier than the
     research anticipated and before any schema work depends on it — which is what the recommendation actually
     asked for.* `tests/phase1-runtime.spec.ts` fails with a message naming plan 01-04 if the measured version
     is below 3.24.0.

2. **Is a proxied request queryable via `sdk.requests.get(id)` at the instant `onInterceptResponse` fires?**
   - What we know: `get(id): Promise<RequestResponseOpt | undefined>` [VERIFIED: requests.d.ts:779]; proxied traffic is saved so ids are non-zero; SPIKE-03 confirmed Caido queues events and delivers them in bursts *after* a block, which means an event can arrive long after its request completed.
   - What's unclear: whether there is a write lag such that a *freshly* delivered event's request is not yet readable — and, given SPIKE-03's burst behaviour, whether ids remain valid across a long queue delay.
   - Recommendation: probe it with a deliberate delay between event and `get`. If there is a lag, CORE-05's
     reload model needs a bounded retry, and that changes the consumer's shape. This is cheap to test and
     expensive to discover late.
   - **RESOLVED — owner: plan 01-01, task 3 (`scripts/phase1/runtime-answers.sh`).** *Corrected from "plan
     01-02".* The apparatus is not a synthetic delay ladder but the real condition: a `reload_immediate`
     scenario and a `reload_after_burst` scenario driving 500 requests through `scripts/spike/load.sh`, because
     Phase 0 measured Caido delivering 499 events in a single 20 ms burst and that backlog pushes later reloads
     seconds past their originating event on its own. The gate asserts `reloadMissing === 0` and
     `reloadHit === processed` in both, and points at CORE-05 needing a bounded retry if it ever fails.

3. **Does the plugin's own `sdk.api.send`/RPC stay responsive under a 200-chunk SPA load, measured from outside?**
   - What we know: the design should hold — 25 ms slices, single consumer, `setTimeout0` yields with a 0.76 service ratio.
   - What's unclear: the *composite* behaviour under real burst delivery plus SQLite awaits plus hashing. No Phase 0 spike ran the whole pipeline.
   - Recommendation: this **is** success criterion 3 and it needs an external prober, not an internal
     assertion. Reuse `scripts/spike/instance.sh` + `probe-run.sh` + `load.sh`. Budget it as a real task, not a
     verification line.
   - **RESOLVED — owner: plan 01-05, task 3 (`scripts/phase1/spa-load.sh`).** Budgeted as a full task as
     recommended, with a same-machine idle baseline captured first so the loaded distribution has something on
     this rig to be compared against, and `tests/phase1-load.spec.ts` failing on a `max_slice_ms` of 0 rather
     than treating it as a perfect score.

4. **Should Phase 1 ship a frontend package at all?**
   - What we know: the backend has no user-visible message channel; the frontend does.
   - What's unclear: whether pulling the Vue/PrimeVue/Tailwind pin cluster forward from Phase 5 is worth a visible version-mismatch toast.
   - Recommendation: no frontend in Phase 1 (option A above), plus a human-verify checkpoint and a Broken
     Window entry recording the owed UI. Revisit if the planner disagrees — it is a legitimate trade.
   - **RESOLVED — accepted as recommended. Decisions P1-D5 and P6-D2.** One deviation: the proposed
     `checkpoint:human-verify` is not emitted, because `workflow.human_verify_mode` is `end-of-phase`; its
     substance is a `<verify><human-check>` on plan 01-06 task 3 plus an AUTOMATED leg C that launches the real
     `caido-cli 0.55.3` and asserts zero artifact rows — stronger than the proposed manual check. The Broken
     Window entry is written by 01-06 task 3 via `gsd-tools windows append`.

5. **Which port does Phase 1's dev/test Caido use?**
   - What we know: 8998 is occupied by the live recorder, 8999 is `instance.sh`'s default, 8080 is refused unconditionally, 3100 is the `caido-dev` watch port.
   - Recommendation: allocate a Phase-1 range and record it, so a later phase does not collide with a
     long-lived instance the way Phase 0 nearly did.
   - **RESOLVED — owner: plan 01-01, `scripts/phase1/env.sh`. Range CORRECTED to 8971–8975.** The suggested
     8990–8997 is wrong: `scripts/spike/instance.sh:96-97` names **8991–8996** (and 8981–8985) as Phase 0's
     own, so the suggested range overlaps it in six of its eight ports. Verified free this session: 8971, 8972,
     8973, 8974 and 8975 are all unbound, while 8998 (the live SPIKE-10 recorder) and 8080 (the operator's
     desktop Caido) are both in LISTEN. `env.sh` allocates the whole block up front — instance, origin, two
     compatibility legs and one spare — so no later Phase 1 plan edits that file and no two Phase 1 scripts can
     collide.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Caido CLI (app bundle) | COMPAT-02 floor test, all live smoke tests | ✓ | `Caido 0.57.1` at `/Applications/Caido.app/Contents/Resources/bin/caido-cli` | — |
| Caido CLI (current release) | **COMPAT-02** — "runs against the current Caido release" | ✗ | 0.58.0 not installed | Download `https://caido.download/releases/v0.58.0/caido-cli-v0.58.0-mac-aarch64.zip` (verified reachable this session: 302 → R2, ranged GET returns 206). Pin the SHA-512 published by `https://api.caido.io/releases/latest` (`hash` field, base64, 64 bytes decoded) exactly as Phase 0's `fetch-corpus.sh` pins its corpus. |
| Caido CLI on `PATH` | Negative test for COMPAT-01 (below-minimum build) | ✓ | `Caido 0.55.3` | Fortuitous — a real below-minimum binary is already installed and is the ideal fixture for success criterion 7 |
| Node.js | Build, vitest, CI gates | ✓ | v26.7.0 | — |
| pnpm | Workspace | ✓ | 11.22.0 | — |
| Python 3 | Phase 0 analysers (`aggregate.py`, `render-go-no-go.py`) that Phase 1 must not break | ✓ | 3.14.7 | — |
| `sqlite3` CLI | Offline inspection of a plugin DB during migration tests | ✓ | 3.51.0 | Not a substitute for `SELECT sqlite_version()` **inside** Caido — the CLI's version is the host's, not the runtime's |
| `esbuild` | Optional DIST-05 metafile cross-check | ✓ | 0.24.2 (transitive) | `acorn` parse is the primary gate |
| `curl`, `git`, `zip` | Probe install harness | ✓ | curl 8.7.1, git 2.55.0 | — |
| `launchctl` | Re-registering the recorder **if** Phase 1 moves `scripts/spike/` | ✓ | macOS 25.6.0 | Best fallback: do not move it |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Caido 0.58.0 — must be fetched and hash-pinned as a plan task before COMPAT-02 can be satisfied. This is a real gap, not a formality: success criterion 7 and COMPAT-02 both reference "current".

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest@4.1.11` |
| Config file | `vitest.config.ts` (exists; currently includes **only** `tests/**/*.spec.ts`) |
| Quick run command | `pnpm vitest run packages --reporter=dot` |
| Full suite command | `pnpm test` (`vitest run --reporter=dot`) — **must continue to include the Phase 0 gates** |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORE-01 | Hook callback is non-async and returns synchronously | unit + lint | `pnpm vitest run packages/backend/src/hooks/passive.spec.ts` | ❌ Wave 0 |
| CORE-02 | Admission rejects by status / size / kind / scope, and 304 gets its own reason | unit | `pnpm vitest run packages/backend/src/hooks/admit.spec.ts` | ❌ Wave 0 |
| CORE-03 | Queue bounded; overflow counted; never grows past cap | unit | `pnpm vitest run packages/engine/src/queue.spec.ts` | ❌ Wave 0 |
| CORE-03 | Cap is ≥ the measured 500-event burst | unit | same file — constructor throws below 500 | ❌ Wave 0 |
| CORE-04 | Exactly one consumer in flight under concurrent offers | unit | `pnpm vitest run packages/engine/src/consumer.spec.ts` | ❌ Wave 0 |
| CORE-05 | Consumer holds no SDK object across an `await` | unit (fake SDK) + type test | `pnpm vitest run packages/backend/src/ingest/consumer.spec.ts` | ❌ Wave 0 |
| CORE-06 | Yield fires on elapsed time, not chunk count | unit (injected clock) | `pnpm vitest run packages/engine/src/pipeline.spec.ts` | ❌ Wave 0 |
| CORE-07 | Deadline expiry produces `partial`, keeps prior work | unit | same file | ❌ Wave 0 |
| CORE-08 | Identical content hashed and stored once | integration (real SQLite) | `pnpm vitest run packages/backend/src/store/artifacts.spec.ts` | ❌ Wave 0 |
| CORE-09 | `onProjectChange` (incl. `null`) cancels and swaps project_id | unit (fake SDK) | `pnpm vitest run packages/backend/src/lifecycle.spec.ts` | ❌ Wave 0 |
| CORE-10 | Max observed slice is recorded and non-zero under load | **manual-only** — needs a live Caido and external probing | `bash scripts/phase1/spa-load.sh` (records to an artifact) | ❌ Wave 0 |
| STORE-01/02 | Every table has `project_id` in its key | unit — introspect `PRAGMA table_info` for every table | `pnpm vitest run packages/backend/src/store/schema.spec.ts` | ❌ Wave 0 |
| STORE-03 | Digest derives from `toRaw()` bytes | unit | `pnpm vitest run packages/engine/src/digest.spec.ts` | ❌ Wave 0 |
| STORE-05 | Migration ladder runs forward on a **populated** DB | integration | `pnpm vitest run packages/backend/src/store/migrations.spec.ts` | ❌ Wave 0 |
| STORE-06 | Retention sweep bounds row counts | integration | `pnpm vitest run packages/backend/src/store/retention.spec.ts` | ❌ Wave 0 |
| STORE-07 | No SQL string contains a named parameter (`:name`, `@name`, `$name`); no `exec` call passes a second argument | static — grep + AST over `store/**` | `pnpm vitest run packages/backend/src/store/sql-discipline.spec.ts` | ❌ Wave 0 |
| COMPAT-01 | Below-minimum version registers no hooks and yields a reason string | unit (fake sdk.runtime) + **live** on `caido-cli 0.55.3` | `pnpm vitest run packages/backend/src/compat.spec.ts` | ❌ Wave 0 |
| COMPAT-02 | Every SDK surface used is exercised against 0.57.1 **and** 0.58.0 | integration (live instance) | `bash scripts/phase1/compat-smoke.sh` | ❌ Wave 0 |
| ENC-01 | `sha256(toRaw())` ≠ `sha256(utf8(toText()))` on the non-UTF-8 fixture; offsets map to raw bytes | unit, against `corpus/encoded/nonutf8.js` | `pnpm vitest run packages/engine/src/decode.spec.ts` | ❌ Wave 0 |
| DIST-05 | Bundle imports ⊆ allowlist, **and** a `zlib`-importing fixture fails the gate | static | `node scripts/ci/check-bundle-imports.mjs && pnpm vitest run scripts/ci/gate.spec.ts` | ❌ Wave 0 |
| DIST-06 | `pnpm.overrides` pins `primevue@4.1.0` and `tailwindcss@3.4.13`; lockfile agrees | static | `pnpm vitest run tests/pins.spec.ts` | ❌ Wave 0 |
| **Phase 0 contract** | Every engine constant equals its `go-no-go.json` value | unit | `pnpm vitest run packages/engine/src/thresholds.spec.ts` | ❌ Wave 0 |
| **Regression** | The Phase 0 gates still run and still pass after the workspace conversion | meta | `pnpm test` — assert the same gate names appear | ✅ `tests/go-no-go.spec.ts` exists; the assertion that it *still runs* does not |

### Sampling Rate

- **Per task commit:** `pnpm vitest run packages --reporter=dot` (target < 15 s; no live Caido).
- **Per wave merge:** `pnpm test` — the full suite **including** `tests/go-no-go.spec.ts`, `tests/spike-results.spec.ts`, `tests/schema.spec.ts`. Any drop in gate count is a failure.
- **Phase gate:** full suite green, plus the two live runs (`compat-smoke.sh` against 0.57.1 and 0.58.0, `spa-load.sh` with a recorded max-slice artifact) before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `vitest.config.ts` — extend `include` to cover `packages/*/src/**/*.spec.ts` **without dropping** `tests/**/*.spec.ts`, and prove it with a before/after test count
- [ ] `packages/engine/src/thresholds.ts` + `thresholds.spec.ts` — the Phase 0 contract; **write first, before any other Phase 1 code**
- [ ] `packages/engine/src/*.spec.ts` — queue, deadline, chunker, digest, decode, pipeline
- [ ] `packages/backend/src/**/*.spec.ts` — admit, consumer, lifecycle, compat, store (schema, migrations, artifacts, retention, sql-discipline)
- [ ] `packages/backend/test/fixtures/` — a fake `SDK` (`runtime.version`, `projects.getCurrent`, `requests.get`, `requests.inScope`, `meta.db`, `console`, `api`, `events`) so backend logic is unit-testable without Caido
- [ ] An **in-process SQLite fixture** matching the pooled semantics closely enough to be honest. Node 26 has `node:sqlite`, but it is single-connection and therefore *cannot* reproduce the pool-affinity failure mode. Use it for schema/migration/upsert correctness, and mark the pool-specific behaviours as live-only.
- [ ] `scripts/phase1/compat-smoke.sh` — reuses `scripts/spike/instance.sh` with `EXPECT_VERSION` and `probe-run.sh`
- [ ] `scripts/phase1/spa-load.sh` — external RPC prober during a synthetic 200-chunk load
- [ ] `scripts/ci/check-bundle-imports.mjs` + its negative fixture
- [ ] `tests/pins.spec.ts` — DIST-06 override assertions

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` [VERIFIED: .planning/config.json workflow block].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 1 issues no requests and exposes no auth surface |
| V3 Session Management | no | — |
| V4 Access Control | **yes, narrowly** | Project isolation. `project_id` in every key and every `WHERE` is an access-control boundary, not a data-modelling nicety: without it, client A's artifacts appear while the operator works on client B. STORE-02. |
| V5 Input Validation | **yes** | Every byte in an artifact is target-controlled. Phase 1's only parsers are the URL/extension classifier and the header reader — both must be total functions with no unbounded backtracking. No regex in Phase 1 may contain nested quantifiers (`REDOS_RECOVERY = "kill"`; there is no in-runtime recovery). |
| V6 Cryptography | **yes** | SHA-256 via `crypto.createHash` only. No hand-rolled hash. The HMAC key lifecycle (SEC-04/UPGRADE-02) is Phase 4 — Phase 1 must not create a key or a key file it will then have to migrate. |
| V7 Error Handling & Logging | **yes** | ERR-03: Caido surfaces nothing. Log lines must carry no target-controlled content unescaped and no body bytes. |
| V12 Files & Resources | **yes** | Resource exhaustion is the live threat: no memory limit is set in Caido's QuickJS, so OOM **aborts the host** rather than throwing. The admission size ceiling is a security control. |

### Known Threat Patterns for a Caido backend plugin ingesting target-controlled bundles

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Oversized body exhausts host memory; `panic = "abort"` kills `caido-cli` with the operator's project data | Denial of Service | Hard `Body.length` ceiling **before** any decode; measured cost is 102 bytes RSS per input byte [VERIFIED: go-no-go.json:337-341] |
| Catastrophic regex wedges the single thread; no interrupt handler exists, SIGKILL is the only exit | Denial of Service | No nested-quantifier regex in Phase 1; DET-05's static ReDoS check lands in Phase 3 but the *discipline* starts now |
| SQL injection via a URL, host, or header written into a query | Tampering | Positional `?` binding only, enforced by the `sql-discipline` static test. The one unavoidable exception — `PRAGMA user_version = <n>` — takes its value from a literal array, never from input |
| Cross-project data leakage through the plugin-global DB | Information Disclosure | `project_id` in every primary key and every `WHERE`; caches cleared on `onProjectChange`, including the `project === null` branch |
| Target-controlled bytes reaching a log line or an error message | Information Disclosure | Log identifiers and lengths, never body content. No `toText()` of an artifact into a log. |
| Unbounded DB growth in Caido Data that survives project deletion and uninstall | Denial of Service (disk) | STORE-06 retention with a bounded row count and no blob columns |
| A dependency importing an unresolvable module ships and fails only on a user's machine | Tampering / availability | The DIST-05 allowlist gate |
| A stolen plugin `.sqlite` file being a credential dump | Information Disclosure | Phase 1 creates no column that can hold a secret. Enforce by *absence*, and by the schema test asserting the table set. |

---

## Sources

### Primary (HIGH — read or executed on this machine, 2026-08-20)

- `.planning/phases/00-runtime-reality-check/results/go-no-go.json` (681 lines, 50 thresholds, 13 gates) — the authoritative measured contract
- `.planning/phases/00-runtime-reality-check/results/SPIKE-08.json`, `SPIKE-09.json`, `SPIKE-07.json` — encoding, SQLite semantics, capability enumeration
- `.planning/phases/00-runtime-reality-check/results/runs/20260820T121824Z-31596/raw/capabilities.json` — the module/global enumeration the DIST-05 allowlist derives from
- `.planning/phases/00-runtime-reality-check/00-GO-NO-GO.md` — the Phase 1 import contract
- `node_modules/.pnpm/@caido+sdk-backend@0.57.1/…/src/typing.d.ts` — `EventsSDK`, `MetaSDK`, `SDK`
- `node_modules/.pnpm/@caido+quickjs-types@0.26.0/…/src/caido/{requests,projects,runtime}.d.ts` and `src/extra/sqlite.d.ts`
- `node_modules/.pnpm/@caido+plugin-manifest@0.3.0/…/dist/index.d.ts` — proof there is no minimum-version field
- `node_modules/.pnpm/@caido-community+dev@0.1.7…/dist/cli.js:100-119` — the backend tsup config and its `external` list
- `tier1/parse/dist/index.js:1-3` — a real built backend bundle emitting built-in imports
- `package.json`, `pnpm-workspace.yaml`, `caido.config.ts`, `vitest.config.ts`, `.gitignore`, `tests/go-no-go.spec.ts`, `scripts/spike/instance.sh`, `scripts/spike/probe-run.sh`, `probe/tier0-core/manifest.json`
- `~/Library/LaunchAgents/com.defminer.spike.recorder.plist` + `launchctl list` + `lsof -iTCP:8998`
- `node -e "require('module').builtinModules"` (Node v26.7.0) — 66 entries, four `node:`-prefixed
- `diff` of `@caido/sdk-backend` 0.57.1 vs 0.58.0 `typing.d.ts` — no output
- `gsd-tools query package-legitimacy check --ecosystem npm …` — 20 packages, 0 SLOP

### Secondary (MEDIUM/HIGH — official sources fetched this session)

- `https://api.caido.io/releases/latest` — 0.58.0, with per-artifact base64 SHA-512
- `https://api.github.com/repos/caido/caido/releases` — v0.58.0 published 2026-08-20T13:40:16Z; v0.57.1 2026-07-10
- `https://api.github.com/repos/caido/caido/releases/tags/v0.58.0` — changelog; no plugin-SDK breaking changes announced
- `https://registry.npmjs.org/@caido%2Fsdk-backend`, `@caido%2Fquickjs-types`, `@caido-community%2Fdev` — versions and publish dates
- `https://developer.caido.io/plugins/guides/runtime` — `sdk.runtime.version` and the recommended three-part comparison
- `https://developer.caido.io/plugins/reference/manifest` — full field list, no version-constraint field

### Project inputs (not re-derived)

- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/WINDOWS.md`, `.planning/config.json`
- `.planning/research/{SUMMARY,ARCHITECTURE,STACK,PITFALLS,CODEX-REVIEW-01}.md`

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Runtime contracts (yield, queue delivery, encoding, SQLite semantics) | **HIGH** | Every one measured on the shipped binary in Phase 0, cross-read from `go-no-go.json` this session with line-cited verbatim values |
| SDK surface (signatures, nullability, param binding) | **HIGH** | Read directly from the pinned `.d.ts` files this session, not recalled |
| DIST-05 mechanism | **HIGH** | Build config read from `caido-dev`'s shipped `cli.js`; the failure mode reproduced in an existing built artifact; `builtinModules` enumerated on this Node |
| COMPAT-01 (no manifest field, runtime guard is the only option) | **HIGH** | Manifest type read; runtime guide fetched; absence of a backend toast API verified by exhaustive grep |
| Standard stack versions | **HIGH** | Every version confirmed against the npm registry this session |
| Numeric policy choices (queue cap, admission ceiling) | **MEDIUM** | Phase 0 measured the *inputs*; the policy is a derivation, argued but not measured |
| Caido 0.58.0 behavioural parity with 0.57.1 | **MEDIUM** | Type surface proven identical; runtime behaviour untested. This is A1 and it is the phase's top risk |
| Cache hit rate | **LOW** | `CACHE_HIT_RATE_CROSS_DAY` is `null`/inconclusive with a zero denominator. Budget against `0.4`, read from config, never assert it as measured |
| SQLite feature availability (`ON CONFLICT`, partial indexes) | **LOW** | Never probed. Open Question 1 — resolve before writing the schema |

**Research date:** 2026-08-20
**Valid until:** 2026-09-03 — bounded by the `CACHE_HIT_RATE_CROSS_DAY` revisit date and by the fact that Caido released a new minor **on the day of this research**. Re-check `api.caido.io/releases/latest` before Phase 1 execution begins.
