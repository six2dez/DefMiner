# Phase 1: Skeleton, Persistence & Compatibility - Pattern Map

**Mapped:** 2026-08-20
**Files analyzed:** 38 new/modified files
**Analogs found:** 27 / 38

> **Framing (from RESEARCH.md:103):** Phase 1 is a **refactor of a live Phase 0 harness**, not a greenfield scaffold. Almost every "new" Phase 1 file has a real, executed, measured analog already in this repo — written against a real Caido 0.57.1. Prefer those analogs over RESEARCH.md's illustrative snippets: the repo code has been *run*.

**The five load-bearing analogs (read in full this session):**

| Analog | Lines | Why it is the reference |
|---|---|---|
| `probe/recorder/backend/script.js` | 142 | The **whole Phase 1 vertical slice in miniature**: non-async `onInterceptResponse` → cheap admission gate → `toRaw()` → native sha256 → `prepare()`/`run(...spread)` insert → `init(sdk)` with `sdk.meta.db()` + `IF NOT EXISTS` DDL. Currently running against the operator's real traffic. |
| `probe/tier0-budgets/backend/script.js` | 721 | The SQLite contract probe — `PRAGMA user_version`, pooled-connection hazards, `safe()`/`step()` error capture. Analog for `store/migrations.ts`, `store/db.ts`. |
| `probe/tier0-events/backend/script.js` | 343 | Hook-side row building, bounded buffer + `DROPPED++` overflow counter, error-row-instead-of-throw. Analog for `hooks/passive.ts` and `engine/queue.ts`. |
| `probe/tier0-core/backend/script.js` | 404 | The yield-primitive experiment (`setTimeout0` etc.) and `performance.now()` discipline. Analog for `engine/yield.ts`, `engine/pipeline.ts`, `engine/deadline.ts`. |
| `tier1/parse/src/index.ts` | 393 | The only **TypeScript** Caido backend in the repo, built by `caido-dev`. Analog for `packages/backend/src/index.ts` shape, `crypto`/`fs` import style, `init(sdk)` + `sdk.api.register` wiring, and it is the artifact DIST-05 must classify. |

**Test analogs:** `tests/schema.spec.ts` (115), `tests/spike-results.spec.ts` (99), `tests/go-no-go.spec.ts` (288) — all read this session.

---

## File Classification

### `packages/engine` — SDK-free

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/thresholds.ts` | config | transform | *(none — new shape)* | **none** |
| `src/thresholds.spec.ts` | test | transform | `tests/go-no-go.spec.ts` | exact |
| `src/queue.ts` | utility | batch | `probe/tier0-events/backend/script.js:145-151` | role+flow |
| `src/queue.spec.ts` | test | batch | `tests/spike-results.spec.ts` | role-match |
| `src/deadline.ts` | utility | transform | `probe/tier0-core/backend/script.js:150-166` | role+flow |
| `src/yield.ts` | utility | event-driven | `probe/tier0-core/backend/script.js:141-143` | **exact** |
| `src/pipeline.ts` | service | streaming | `probe/tier0-core/backend/script.js:150-166` | role+flow |
| `src/chunker.ts` | utility | streaming | *(none — new shape)* | **none** |
| `src/digest.ts` | utility | transform | `probe/recorder/backend/script.js:118-121` | **exact** |
| `src/decode.ts` | utility | transform | `tier1/parse/src/index.ts:234-239` | **exact** |
| `src/*.spec.ts` (5 more) | test | unit | `tests/schema.spec.ts` | role-match |

### `packages/backend` — the Caido plugin

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/index.ts` | entrypoint | event-driven | `probe/recorder/backend/script.js:115-142` + `tier1/parse/src/index.ts:387-393` | **exact** |
| `src/compat.ts` | middleware | request-response | `tier1/parse/src/index.ts:375-385` (`sdk.runtime?.version`) | partial |
| `src/hooks/passive.ts` | hook | event-driven | `probe/recorder/backend/script.js:76-113` | **exact** |
| `src/hooks/admit.ts` | utility | request-response | `probe/recorder/backend/script.js:30-48` | **exact** |
| `src/ingest/consumer.ts` | service | streaming | *(none — no probe reloads via `sdk.requests.get`)* | **none** |
| `src/store/db.ts` | service | CRUD | `probe/tier0-budgets/backend/script.js:205-207` | role+flow |
| `src/store/migrations.ts` | migration | CRUD | `probe/tier0-budgets/backend/script.js:235-243` + `probe/recorder/…:124-136` | role+flow |
| `src/store/artifacts.ts` | model | CRUD | `probe/recorder/backend/script.js:26-28,63-74` | **exact** |
| `src/store/retention.ts` | service | batch | *(none)* | **none** |
| `src/lifecycle.ts` | service | event-driven | *(none — no probe handles `onProjectChange`)* | **none** |
| `src/telemetry.ts` | utility | event-driven | `tier1/parse/src/index.ts:78-133` (`Mark`/`measured`/`slim`) | role+flow |
| `test/fixtures/fake-sdk.ts` | test fixture | — | *(none)* | **none** |
| `src/**/*.spec.ts` (~10) | test | unit/integration | `tests/schema.spec.ts` | role-match |

### `packages/shared`

| File | Role | Data Flow | Analog | Quality |
|---|---|---|---|---|
| `src/{api,events,dto,result,index}.ts` | types | — | *(none — types-only package is new)* | **none** |

### Root / CI / scripts (modified)

| File | Role | Data Flow | Analog | Quality |
|---|---|---|---|---|
| `vitest.config.ts` | config | — | itself (lines 1-15) — **extend, never regenerate** | exact |
| `pnpm-workspace.yaml` | config | — | itself (lines 1-16) — add `packages:`, keep `allowBuilds` verbatim | exact |
| `package.json` | config | — | itself (lines 18-32) — add `pnpm.overrides` | exact |
| `caido.config.ts` | config | — | itself (lines 24-40) — append a `plugins[]` entry | exact |
| `packages/*/package.json` | config | — | *(none — repo has exactly one `package.json`)* | **none** |
| `scripts/ci/check-bundle-imports.mjs` | script | file-I/O | `scripts/spike/validate-schema.mjs:1-49` | **exact** (CLI shape) |
| `scripts/phase1/compat-smoke.sh` | script | request-response | `scripts/spike/instance.sh` + `probe-run.sh` | **exact** (reuse as-is) |
| `scripts/phase1/spa-load.sh` | script | request-response | `scripts/spike/load.sh` / `block-load.sh` | role+flow |
| `tests/pins.spec.ts` | test | file-I/O | `tests/schema.spec.ts:1-17` | exact |

---

## Pattern Assignments

### `packages/backend/src/hooks/passive.ts` + `hooks/admit.ts` (hook, event-driven)

**Analog: `probe/recorder/backend/script.js` — this is the single most important file to copy from.** It already implements CORE-01's exact shape and has survived days of real traffic.

**Hook body pattern** (`probe/recorder/backend/script.js:76-113`) — note: non-async, `if (!ready) return;` guard first, whole body in `try`, `catch` logs and swallows:
```js
function onInterceptResponse(sdk, request, response) {
  if (!ready) return;
  try {
    const url = request.getUrl();
    const headers = response.getHeaders();
    // Header lookup casing is not guaranteed; check both rather than assuming
    // which spelling Caido normalises to.
    const ctRaw = headers["content-type"] || headers["Content-Type"];
    const contentType = Array.isArray(ctRaw) ? ctRaw[0] : ctRaw;
    if (!isScriptish(contentType, url)) return;
    const body = response.getBody();
    if (!body) return;
    ...
  } catch (e) {
    try { sdk.console.log("[defminer-recorder] skip: " + String(e).slice(0, 160)); }
    catch (_) { /* nothing left to do */ }
  }
}
```
Three details to carry over verbatim and that RESEARCH.md's Pattern 1 snippet omits:
1. **Both header casings** are checked, and the value may be an **array** (line 83-84).
2. The `catch` is itself wrapped in a `try` (line 109-111) — `sdk.console.log` can throw during teardown.
3. `if (!ready) return;` — events arrive **before** `init()` finishes its `await`s.

**Admission-gate pattern** (`probe/recorder/backend/script.js:30-48`) — copy the shape, then extend with size/status/scope per CORE-02:
```js
const SCRIPTISH = ["javascript", "ecmascript", "application/x-javascript", "text/js", "module"];
function isScriptish(contentType, url) {
  if (contentType) { const ct = String(contentType).toLowerCase();
    for (const needle of SCRIPTISH) if (ct.indexOf(needle) !== -1) return true; }
  if (url) { // Strip query and fragment before looking at the extension, or
             // `/app.js?v=2` would miss.
    const bare = String(url).split("#")[0].split("?")[0].toLowerCase();
    if (bare.endsWith(".js") || bare.endsWith(".mjs")) return true; }
  return false;
}
```
**Deviation required (Pitfall 4):** this analog returns `false` for a 304 (no content-type, no `.js` suffix on some URLs). Phase 1's `admit()` must give 304 its **own reject reason**, not fold it into `not_scriptish`.

**Body-size access** — take it from `probe/tier0-events/backend/script.js:133-134`, which measured both:
```js
body_length: body ? body.length : null,
raw_length:  body ? body.toRaw().length : null,
```
Use `body.length` **only** in the hook (no decode); `toRaw()` belongs in the consumer.

---

### `packages/backend/src/store/artifacts.ts` (model, CRUD)

**Analog:** `probe/recorder/backend/script.js:20-28` and `:63-74`.

**Bind-parameter pattern with its measured rationale** (lines 20-28) — reproduce this comment, it encodes a silent-failure Phase 0 actually hit:
```js
// db.exec(sql) takes NO parameters — verified against @caido/quickjs-types
// (extra/sqlite.d.ts: `exec(sql: string): Promise<void>`). Passing an array of
// bind values to exec() is silently IGNORED, which produced rows with every
// column NULL and a "NOT NULL constraint failed" that never surfaced. Binding
// requires prepare() -> Statement.run(...params), with params SPREAD, not an
// array. Named parameters are unsupported.
const INSERT_SQL = "INSERT INTO cache_log (...) VALUES (?, ?, ?, ?, ?, ?)";
```

**Prepare-per-write pattern** (lines 50-74) — **prepare inside each write, never module-level**:
```js
function enqueueInsert(sdk, values) {
  db.prepare(INSERT_SQL)
    .then((stmt) => stmt.run(...values))
    .catch((e) => { try { sdk.console.log("[…] INSERT_FAILED " + String(e).slice(0, 200)); } catch (_) {} });
}
```
Two measured reasons in the comment at lines 50-62, both of which Phase 1 inherits:
- Chaining onto a **module-level promise does not work**: a continuation attached to an already-settled promise from a previous event invocation is *never driven*. No row, no error, nothing in the log.
- `sdk.meta.db()` is a **pool over worker threads**; a shared mutable `Statement` can land on different connections with interleaved bindings.

**Deviation for Phase 1:** the analog uses `id INTEGER PRIMARY KEY AUTOINCREMENT`. Phase 1 must **not** — `last_insert_rowid()` is unusable on the pool. Use `PRIMARY KEY (project_id, sha256)` and `ON CONFLICT … DO UPDATE` (RESEARCH.md Pattern 3).

---

### `packages/backend/src/store/migrations.ts` + `store/db.ts` (migration, CRUD)

**Analog A — DDL style:** `probe/recorder/backend/script.js:123-136`. Every statement `IF NOT EXISTS`, DDL split into separate `exec` calls, indexes created alongside the table:
```js
db = await sdk.meta.db();
await db.exec("CREATE TABLE IF NOT EXISTS cache_log (" + … + ")");
await db.exec("CREATE INDEX IF NOT EXISTS idx_cache_log_sha ON cache_log (sha256)");
```

**Analog B — `user_version` read/write:** `probe/tier0-budgets/backend/script.js:235-241`, with the comment that explains why `user_version` and not `cache_size` is the trustworthy signal:
```js
// user_version is a real persisted header field, so it survives even if the
// pool hands the second exec a DIFFERENT connection. cache_size is
// per-CONNECTION and does NOT. Reading BOTH is what distinguishes "the PRAGMA
// persisted" from "the pool happened to reuse the connection".
await step("pragma_set_user_version", () => db.exec("PRAGMA user_version = 4242"));
const uv = await step("pragma_read_user_version", async () =>
  (await db.prepare("PRAGMA user_version")).get());
```
Note the read shape: `(await db.prepare("PRAGMA user_version")).get()` returns `{ user_version: n }`.

**Analog C — error capture around every DDL step:** `probe/tier0-budgets/backend/script.js:195-213`. `store/migrations.ts` should keep this `safe`/`step` shape so a failed migration produces a structured record rather than an unobservable rejection:
```js
async function safe(fn) {
  try { return { ok: true, value: await fn() }; }
  catch (e) { return { ok: false, error: String(e).slice(0, 300) }; }
}
const step = async (name, fn) => { const r = await safe(fn); out.steps.push({ step: name, ...r }); return r; };
```

**Hard-won ordering rule to carry over** (`probe/tier0-budgets/backend/script.js:219-222`):
> "Every table is created UP FRONT, before any experiment can leave a transaction open. An earlier version created `pool_probe` after the batch experiment and its CREATE landed inside the batch's dangling transaction — the table then read back as 'no such table' and the measurement was lost."

That is Pitfall 1 observed in the wild. Migration DDL must run before any data write in `init()`.

---

### `packages/backend/src/index.ts` (entrypoint, event-driven)

**Analog A — `init` ordering:** `probe/recorder/backend/script.js:115-142`. The exact sequence Phase 1 needs, with the `ready` flag as the hook's admission latch:
```js
export async function init(sdk) {
  sdk.console.log("[defminer-recorder] init");
  // `caido:crypto` does NOT load in this runtime; bare `crypto` does and
  // exports createHash/Sha256. Measured in SPIKE-07.
  const crypto = await import("crypto");
  sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
  db = await sdk.meta.db();
  await db.exec("CREATE TABLE IF NOT EXISTS …");
  ready = true;                                   // ← set AFTER migrate, BEFORE register
  sdk.events.onInterceptResponse((s, request, response) =>
    onInterceptResponse(s, request, response));
  sdk.console.log("[defminer-recorder] cache_log ready");
}
```
Phase 1 inserts the COMPAT-01 guard **before** `sdk.meta.db()` and returns early without registering (RESEARCH.md Pattern 5). The `ready` latch stays.

**Analog B — RPC registration (TypeScript):** `tier1/parse/src/index.ts:387-393`:
```ts
export function init(sdk: any) {
  sdk.console.log("[tier1-parse] init");
  sdk.api.register("measure", measure);
  sdk.api.register("parse_only", parse_only);
  sdk.api.register("probe_info", probe_info);
  sdk.console.log("[tier1-parse] ready");
}
```
**Deviation:** `sdk: any` is a Phase 0 probe shortcut. `packages/backend` types the SDK properly against `@caido/sdk-backend@0.57.1`.

**Analog C — version read:** `tier1/parse/src/index.ts:377` — `String(sdk.runtime?.version ?? "unknown")`. Keep the optional chain in `compat.ts`: a missing `runtime` on an old build must produce the incompatibility message, not a TypeError inside `init()`.

---

### `packages/engine/src/yield.ts` + `pipeline.ts` + `deadline.ts` (utility/service, streaming)

**Analog:** `probe/tier0-core/backend/script.js:120-166` — the code that *produced* `YIELD_PRIMITIVE = "setTimeout0"`.

**The yield primitive** (line 141-143), with the clamp comment:
```js
// setTimeout clamps to >=4 ms in this runtime, so setTimeout(fn,0) and
// setTimeout(fn,1) are indistinguishable. Measured, not assumed, below.
setTimeout0: () => new Promise((r) => setTimeout(r, 0)),
```

**The temporal slice loop** (lines 153-165) — the exact structure `pipeline.ts` generalises; note both clocks and that the sync slice is bounded by elapsed time, not iteration count:
```js
const t0 = performance.now();
while (performance.now() - t0 < durationMs) {
  const w0 = performance.now();
  …
  while (performance.now() - w0 < syncSliceMs) { acc += Math.sqrt(acc + 1); }
  …
}
const total = performance.now() - t0;
```

**Clock discipline** — `tier1/parse/src/index.ts:69-77`, reproduce this rule in `deadline.ts`/`telemetry.ts`:
> "Every marker carries BOTH clocks: `Date.now()` — the ONLY bridge to the external RSS sampler and the host log. `performance.now()` — ~1 µs monotonic, but boot-relative; `performance.timeOrigin` is NOT a Unix epoch, so a timestamp is never computed from it. The elapsed figure always comes from `performance.now()`; the correlation keys always come from `Date.now()`."

`deadline.ts` must take its clock by **injection** (`ctx.now()`) so `pipeline.spec.ts` can drive it deterministically — the analog calls `performance.now()` directly, which is the one thing not to copy.

---

### `packages/engine/src/queue.ts` (utility, batch)

**Analog:** `probe/tier0-events/backend/script.js:145-151` — a bounded buffer with a visible drop counter, already exactly CORE-03's semantics minus the ring:
```js
if (EVENTS.length < MAX_ROWS) {
  EVENTS.push(row);
} else {
  DROPPED++;
}
```
**Deviation:** the analog drops *newest*; RESEARCH.md's `BoundedQueue` drops *oldest* (`#buf.shift()`). Phase 1 picks drop-oldest and must state why in a comment.

**Error-row-instead-of-throw pattern** (`probe/tier0-events/backend/script.js:139-143`) — carry the principle into the queue entry type:
```js
} catch (e) {
  // A row that could not be built is still a delivered event. Recording the
  // failure keeps the count honest.
  row = { seq: seq, date: date, qjs: qjs, error: String(e).slice(0, 200) };
}
```

---

### `packages/engine/src/digest.ts` + `decode.ts` (utility, transform)

**Digest analog:** `probe/recorder/backend/script.js:118-121` — including the fact that `caido:crypto` fails and bare `crypto` works, and that the digest is taken over the **raw buffer**, not a string (`:90-95`):
```js
const raw = body.toRaw();
const bytes = raw ? raw.length : 0;
if (!bytes) return;
// Hash and discard. `raw` goes out of scope here and is never persisted.
const digest = sha256(raw);
```

**Decode analog:** `tier1/parse/src/index.ts:234-239`:
```ts
// 1. decode — raw bytes to a JS string. There is NO TextDecoder on this build
//    (exported by no module, measured in SPIKE-07), so Buffer.toString is the
//    decode path ENC-01 actually has available.
const decodeMark = measured(sdk, "decode", () => bytes.toString("utf8") as string);
```
Phase 1's `decode.ts` should offer **both** measured paths (`Buffer.from(u8).toString("utf8")` and `new StringDecoder("utf8").end(...)`) and assert they agree, since ENC-02 binds to `string_decoder` specifically.

**Anti-pattern with a live example:** `tier1/parse/src/index.ts:194-204` (`jsLoopHash`, FNV-1a per-character loop). That function is the *measurement* that made DET-07 forbid the technique — do not copy it into `packages/engine`.

---

### `packages/backend/src/telemetry.ts` (utility, event-driven)

**Analog:** `tier1/parse/src/index.ts:78-133` — `Mark<T>` type, `measured()` wrapper, `slim()` projection. Copy the three-part shape:
- `Mark<T>` carries `elapsed_ms`, both clocks at both ends, `ok`, `err`, `out`.
- `measured()` never lets `fn` throw past it: `err = (e && e.constructor ? e.constructor.name + ": " : "") + String(e).slice(0, 400)` (line 101) — **error class name preserved**, which a bare `String(e)` loses.
- `slim()` (lines 121-133) strips the payload before it crosses the RPC boundary. Phase 1's `getStatus()` needs the same discipline.

---

### `packages/engine/src/thresholds.spec.ts` (test, transform) — **write this first**

**Analog:** `tests/go-no-go.spec.ts` (288 lines). Copy four things:

**1. Constants block naming the threshold ids** (`tests/go-no-go.spec.ts:14-32`):
```ts
const RESULTS = ".planning/phases/00-runtime-reality-check/results";
const AGGREGATE = join(RESULTS, "go-no-go.json");
const CROSS_DAY = "CACHE_HIT_RATE_CROSS_DAY";
const SAMPLE_DAYS = "CACHE_SAMPLE_DAYS";
const DENOMINATOR = "CACHE_CROSS_DAY_DENOMINATOR";
const ASSUMED = "CACHE_HIT_RATE_ASSUMED";
```
These four ids are already named in the Phase 0 gate — `thresholds.ts` must use the same spellings.

**2. Fail-never-skip doctrine** (`tests/go-no-go.spec.ts:9-13, 40-45`):
```ts
// Everything here must FAIL, never skip, when unmet: a skipped assertion on
// this file is indistinguishable from a passing one at the point where it
// matters, which is eleven phases downstream.
expect(existsSync(AGGREGATE), `${AGGREGATE} missing — run scripts/spike/aggregate.py`).toBe(true);
```
Note the load-once-guarded pattern at line 46: `const d = existsSync(AGGREGATE) ? loadJson(AGGREGATE) : null;` then `d?.thresholds ?? {}` throughout.

**3. Path resolution is cwd-relative from the repo root** — `RESULTS` is a bare relative path in all three existing specs. **This is Pitfall 7's exact tripwire.** If `packages/engine/vitest.config.ts` sets a package-local `root`, `thresholds.spec.ts` must resolve `go-no-go.json` from the repo root explicitly, not by copying the bare relative literal.

**4. Assertion messages carry the remedy, not just the fact** — every `expect` in the analog passes a second argument naming the script to run or the rule violated (`tests/go-no-go.spec.ts:44, 66-71`).

---

### `tests/pins.spec.ts` and the `packages/**/*.spec.ts` family

**Analog:** `tests/schema.spec.ts:1-17` for the import block and JSON loader, which every Phase 1 spec should match:
```ts
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
function loadJson(path: string): any {
  const raw = readFileSync(path, "utf8");
  try { return JSON.parse(raw); }
  catch (err) { throw new Error(`${path} is not valid JSON: ${(err as Error).message}`); }
}
```
Note `node:`-prefixed imports are correct **in tests** (they run on Node) and forbidden **in the backend bundle** (DIST-05 — Caido resolves bare `crypto`, never `node:crypto`).

**Data-driven `it.each` over a discovered file list** (`tests/schema.spec.ts:44-53`, `spike-results.spec.ts:22-29`) is the shape for `sql-discipline.spec.ts` and `schema.spec.ts` (iterate every table from `PRAGMA table_info`), including the guard against vacuous passes:
```ts
it("at least one result file exists", () => {
  // an empty results directory means the gate is measuring nothing, which must
  // fail rather than pass vacuously.
  expect(files.length, `no SPIKE-NN.json under ${RESULTS}`).toBeGreaterThan(0);
});
```
STORE-01/02's "every table has `project_id` in its key" test must contain that same non-vacuity assertion, or it passes on an empty schema.

**Two-assertion consistency pattern** (`tests/schema.spec.ts:80-88`) — directly reusable for COMPAT-02 (assert reported version **and** that the expectation was not moved to match it):
```ts
// Two separate assertions on purpose. The first catches a result recorded
// against the stale 0.55.3 that owns PATH on this machine. The second catches
// a result whose own expectation was quietly moved to match whatever it measured.
expect(data.binary?.reported_version).toBe(EXPECTED_CAIDO_VERSION);
expect(data.binary?.expected_version).toBe(data.binary?.reported_version);
```

---

### `scripts/ci/check-bundle-imports.mjs` (script, file-I/O)

**Analog:** `scripts/spike/validate-schema.mjs:1-49` — the exact CLI contract for a Node-side gate in this repo:
- Header comment gives usage and **why this exists rather than the obvious alternative** (lines 1-14).
- `const [a, ...rest] = process.argv.slice(2)`; usage error → `process.exit(2)` (lines 19-23).
- Accumulate `failed++` across all inputs, print `path: detail` per error, `process.exit(failed === 0 ? 0 : 1)` (lines 31-49) — **never bail on the first failure**; the operator wants the full list of bad specifiers.
- `acorn@8.18.0` and `ajv` are already root devDependencies (`package.json:19-21`) — no install needed.

**The artifact this gate must classify already exists:** `tier1/parse/src/index.ts:17-21` imports `fs`, `crypto`, `acorn`, `meriyah`, `@jridgewell/sourcemap-codec`, and its built `tier1/parse/dist/index.js` therefore emits bare `import … from "fs"` / `"crypto"`. Use it as the **positive fixture**; RESEARCH.md requires a `zlib` negative fixture too.

### `scripts/phase1/compat-smoke.sh` + `spa-load.sh` (script, request-response)

**Analog: reuse, do not re-implement.** `scripts/spike/instance.sh` and `scripts/spike/probe-run.sh` are sourceable libraries with documented contracts:
- `instance.sh:1-17` — the dual `bash`/`source` calling convention, and env overrides `CAIDO_BIN`, `EXPECT_VERSION`, `PORT`, `RUN_ID`, `DATA_PATH`, `KEEP_DATA`, `OUT`. `compat-smoke.sh` sets `EXPECT_VERSION=0.58.0` and gets the version assertion for free.
- `instance.sh:33-38` — teardown **always SIGKILLs**; a wedged QuickJS thread never honours SIGTERM. Any Phase 1 script that starts an instance must reuse `teardown()`, not write its own `kill`.
- `probe-run.sh:5-13` — `source` then `probe_install <dir>` / `probe_call <fn> <args-json>`; requires `RUN_ID`/`PORT`/`OUT` exported by `instance.sh`.
- `set -euo pipefail` on line 1 of both.

**Port constraint (RESEARCH.md Runtime State Inventory):** 8998 is the live recorder, 8999 is `instance.sh`'s default, 8080 is refused unconditionally (`instance.sh:20-21`), 3100 is `caido.config.ts` watch. Phase 1 scripts must pass an explicit `PORT` outside that set.

---

## Shared Patterns

### Error containment inside a Caido handler
**Source:** `probe/recorder/backend/script.js:66-73` and `:108-112`; `probe/tier0-budgets/backend/script.js:195-200`.
**Apply to:** every hook, every `.then()` chain, every store write, `init()` itself.
```js
.catch((e) => {
  // Never let a recording failure disturb the proxied traffic, and never let it
  // vanish either: an async rejection in a non-async handler is invisible unless
  // it is caught here.
  try { sdk.console.log("[defminer] INSERT_FAILED " + String(e).slice(0, 200)); }
  catch (_) { /* nothing left to do */ }
});
```
Truncate every error string (`.slice(0, 160|200|300|400)`) — the analogs do this consistently; a target-controlled body can produce an unbounded error message.

### The `ready` latch
**Source:** `probe/recorder/backend/script.js:17, 77, 138`.
**Apply to:** `index.ts` + every hook. Module-level `let ready = false`; hook's first line is `if (!ready) return;`; set `true` only after DB + migrations complete and before `onInterceptResponse` is registered.

### Comment-the-measurement discipline
**Source:** every analog file. `probe/recorder/…:20-25`, `:50-62`, `probe/tier0-budgets/…:235-238`, `tier1/parse/…:24-30`.
**Apply to:** all Phase 1 source. Every non-obvious choice cites the spike that measured it and states what silently broke without it. This is the established house style and the planner should require it in acceptance criteria, not leave it to taste.

### Repo-root-relative artifact paths
**Source:** `tests/schema.spec.ts:7`, `spike-results.spec.ts:5`, `go-no-go.spec.ts:15-18`, `instance.sh:26`, `probe-run.sh:16` — all use the bare literal `.planning/phases/00-runtime-reality-check/results`.
**Apply to:** anything reading `go-no-go.json`. The workspace conversion is the event that breaks all five of these simultaneously.

---

## No Analog Found

These are the genuinely new-shape files. The planner must specify them in detail; RESEARCH.md's own code examples are the best available reference for each.

| File | Role | Data Flow | Reason no analog exists | Best available reference |
|---|---|---|---|---|
| `packages/engine/src/thresholds.ts` | config | transform | Nothing in the repo imports `go-no-go.json` as *source constants*; the specs only assert over it | RESEARCH.md "The Phase 0 contract test"; threshold ids in `tests/go-no-go.spec.ts:29-32` |
| `packages/engine/src/chunker.ts` | utility | streaming | No probe implements a 64 KB/4 KB overlapping window or absolute-offset arithmetic | RESEARCH.md Pattern 2 (`windows(bytes, 65_536, 4_096)`) |
| `packages/backend/src/ingest/consumer.ts` | service | streaming | **No probe ever calls `sdk.requests.get(id)`** — every probe reads the body inside the hook. The reload path, the `undefined` branch, and the never-retain-across-await rule are all unexercised in this repo | RESEARCH.md "Byte-exact ingest"; `requests.d.ts:779` |
| `packages/backend/src/lifecycle.ts` | service | event-driven | No probe registers `onProjectChange`; the `project === null` case has never run here | `sdk-backend typing.d.ts:128-149`; `projects.d.ts:12-16` |
| `packages/backend/src/store/retention.ts` | service | batch | No probe deletes rows; the recorder is append-only forever | STORE-06; `DB_SURVIVES_REINSTALL` in `go-no-go.json:177-181` |
| `packages/backend/test/fixtures/fake-sdk.ts` | test fixture | — | Every existing test asserts over **JSON artifacts**; nothing in the repo fakes an SDK object | Surface list in RESEARCH.md Wave 0 Gaps |
| `packages/shared/src/*.ts` | types | — | No types-only package, and `@caido/sdk-shared` is not installed | RESEARCH.md Standard Stack |
| `packages/*/package.json`, per-package `tsconfig.json` | config | — | **The repo has exactly one `package.json`** and `pnpm-workspace.yaml:1-2` explicitly documents having no `packages:` key by design. Every package manifest is a new-shape file | `package.json:10-17` (`devEngines`); `pnpm-workspace.yaml:7-16` (`allowBuilds` must survive verbatim) |
| In-process SQLite test fixture | test fixture | CRUD | `node:sqlite` is single-connection and **cannot** reproduce the pool-affinity failure modes `probe/tier0-budgets` measured | RESEARCH.md Wave 0 Gaps — mark pool behaviours live-only |
| `packages/backend/src/compat.ts` capability probe table | middleware | request-response | Partial only: `probe/tier0-core/backend/script.js:30-40` enumerates globals/modules for *reporting*, never to gate registration | `tier1/parse/src/index.ts:375-385`; RESEARCH.md Pattern 5 |

---

## Metadata

**Analog search scope:** `probe/*/backend/script.js` (5 files, 1,952 lines), `tier1/*/src/index.ts` (2), `tests/*.spec.ts` (3, 502 lines), `scripts/spike/` (44 entries; `instance.sh`, `probe-run.sh`, `validate-schema.mjs` read), root configs (`vitest.config.ts`, `package.json`, `pnpm-workspace.yaml`, `caido.config.ts`), `node_modules/@caido/` (only `quickjs-types`, `sdk-backend`, `sdk-client` present — **no vendored third-party Caido plugin exists to cite as an external analog**).
**Files scanned:** 60
**Pattern extraction date:** 2026-08-20
