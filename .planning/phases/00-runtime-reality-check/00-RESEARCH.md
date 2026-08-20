# Phase 0: Runtime Reality Check — Research

**Researched:** 2026-08-20
**Domain:** Spike execution mechanics — how to build, host, drive, measure, and record twelve runtime experiments against Caido 0.57.1
**Confidence:** HIGH (most findings were executed on this machine, not inferred)

> **Scope note.** This document deliberately does **not** re-derive QuickJS internals, the Caido SDK surface, parser benchmarks, or ReDoS theory. Those live in `.planning/research/` (4,206 lines) and are the input to this document, not its output. What follows is the missing layer: *how do we actually run these experiments.*

---

## Summary

Every mechanical question in the brief was answered by execution rather than inference. A disposable Caido 0.57.1 instance was launched on this machine with an isolated data path, a probe plugin was built, installed unsigned, driven headlessly, deliberately hung with a catastrophic regex, and torn down — without the operator's working Caido being touched at any point. The workflow requires no browser, no manual clicking, and no Caido account.

Three findings change the shape of Phase 0. First, **there is no memory introspection inside Caido's QuickJS at all** — `llrt:qjs`, `perf_hooks`, and `process` all fail to load, and the `performance` object carries exactly `now` and `timeOrigin`. Memory must be measured externally as RSS of the `caido-cli` process, correlated against host-written log timestamps, and RSS is a high-water mark that never falls. Second, **`performance.now()` does exist with ~1 µs resolution**, so wall-clock measurement inside the runtime is excellent even though memory measurement is impossible. Third, **`setTimeout(fn, 0)` is the only primitive that yields the event loop, and it costs ~5.7 ms per yield** — `setImmediate` and `queueMicrotask` starve timers exactly as hard as a fully blocking loop. That last one is load-bearing for CORE-06 and was measured, not guessed.

The ROADMAP's four-plan sketch has four genuine ordering defects, and — more seriously — `PITFALLS.md` and `REQUIREMENTS.md` use **incompatible SPIKE numbering for five of the twelve spikes**. A planner that reads PITFALLS.md's methods table and maps it onto REQUIREMENTS.md's IDs will wire the wrong method to the wrong spike. That is called out explicitly below.

**Primary recommendation:** Build one shared probe harness in plan 00-01 — a disposable-instance launcher, a raw-zip probe package, a curl/Node driver, and a results writer — then run the ten non-destructive spikes across two shared instances and the two destructive spikes (SPIKE-01, SPIKE-04) on fresh throwaway instances, one per variant.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hosting the experiment | Disposable `caido-cli` process | — | Everything under test lives in the Caido server process; the desktop shell is irrelevant |
| Executing probe code | Caido backend QuickJS runtime | — | This is the object of study; no proxy for it exists |
| Wall-clock timing | Inside QuickJS (`performance.now()`) | Host log timestamps (µs) | Verified 1 µs resolution in-runtime; host timestamps give an independent cross-check |
| Memory measurement | **External** — RSS of `caido-cli` | — | No in-runtime introspection exists. This tier assignment is forced, not chosen |
| Driving the experiment | Node/curl driver process | Caido GraphQL + REST API | Fully scriptable; no frontend plugin and no browser required |
| Load generation | Local static HTTP server + curl | — | Removes network variance; measured 710 req/s through the Caido proxy |
| Corpus hosting | Local static HTTP server | jsDelivr (fetch-once, hash-pinned) | CI reproducibility requires local, hash-verified files |
| Result recording | JSON artifacts in the repo | CI schema validation | Later phases must read numbers, not prose |

---

## Answers to the Seven Questions

### Q1 — The disposable probe plugin

#### Two tiers, not one

A single probe design is wrong because the twelve spikes have two different needs.

**Tier 0 — hand-rolled zip, no build step.** For every spike whose payload is plain JavaScript with no npm dependency: SPIKE-02, -03, -05, -07, -08, -09, -10, -11, -12, and the capability probe. A `manifest.json` plus one `.js` file, zipped. **Verified working**: an unsigned zip of exactly this shape installed successfully into Caido 0.57.1 and its `init()` ran. Edit-to-running is ~2 seconds.

**Tier 1 — `caido-dev build`.** Mandatory for SPIKE-01 (`re2js`) and SPIKE-06 (`meriyah`, `acorn`), because in those spikes **the build pipeline itself is part of what is under test**. `@caido-community/dev@0.1.7` sets `config: false` and `external: [/caido:.+/, "sqlite", ...builtinModules]` (read from `src/build/backend.ts`), so a dependency that imports a Node built-in survives the build silently and fails only at runtime. Measuring meriyah on a hand-rolled bundle would measure the wrong artifact and would not exercise DIST-05.

#### Tier 0 file layout

```
probe/
├── manifest.json
└── backend/
    └── script.js
```

`manifest.json` — every field here is required by Caido's installer (verified against the manifest reference and by installing):

```json
{
  "id": "defminer-probe",
  "name": "DefMiner Probe",
  "version": "0.0.1",
  "description": "Disposable Phase 0 runtime probe",
  "plugins": [
    {
      "kind": "backend",
      "id": "probe-backend",
      "name": "Probe Backend",
      "runtime": "javascript",
      "entrypoint": "backend/script.js"
    }
  ]
}
```

`backend/script.js` — the smallest thing that works. Note it is plain ESM with no `caido:` imports at all; the SDK arrives as the `init` argument:

```js
function capabilities(sdk) {
  let stackDepth = -1;
  try { (function d(n){ stackDepth = n; return d(n + 1); })(0); } catch (e) { /* RangeError */ }
  return {
    caidoVersion: String(sdk.runtime.version),
    globals: Object.getOwnPropertyNames(globalThis).sort(),
    stackDepth
  };
}

export function init(sdk) {
  sdk.console.log("[defminer-probe] init");
  sdk.api.register("capabilities", capabilities);
}
```

Build it with `cd probe && zip -qr ../probe.zip .`. That is the entire build.

> **Enumerate `globalThis`, do not test a hardcoded list.** `@caido/quickjs-types@0.26.0` — which Caido's own docs name as the source of truth — declares only `console`, the four timer functions, `Timeout`, and `Symbol.dispose` as globals. The runtime actually exposes 80. The type surface is materially incomplete; only enumeration gives ground truth.

#### Tier 1 `caido.config.ts`

The config schema is a `z.strictObject` (read from `@caido-community/dev` `src/types.ts`) — unknown keys are rejected, and `version` must match `/^\d+\.\d+\.\d+$/`. Minimum viable:

```ts
import { defineConfig } from "@caido-community/dev";

export default defineConfig({
  id: "defminer-probe",
  name: "DefMiner Probe",
  description: "Disposable Phase 0 runtime probe",
  version: "0.0.1",
  author: { name: "DefMiner" },
  plugins: [{ kind: "backend", id: "probe-backend", root: "packages/probe" }],
  watch: { port: 3100 }
});
```

`root` is a directory; the build entry is `<root>/src/index.ts` and the output is `<root>/dist/index.js`. Use port 3100, not the 3000 default, so the probe's watch server can never collide with a real DefMiner dev loop later.

#### Getting it into Caido — three routes, ranked

| Route | Command | Latency | Use when |
|---|---|---|---|
| **GraphQL multipart upload** | `curl -F operations=… -F map=… -F 0=@probe.zip` | ~1 s | **Default.** Fully scriptable, no browser, no dev server |
| Client SDK | `client.plugin.install({ file })` | ~1 s | When the driver is already a Node script |
| `installPluginPackage(source:{url})` | serve the zip over HTTP | ~1 s | Reuses `caido-dev watch`'s own artifact URL |

The multipart form, verified working:

```bash
OPS='{"query":"mutation Install($f: Upload) { installPluginPackage(input:{source:{file:$f}, force:true}) { package { id manifestId plugins { __typename ... on PluginBackend { id enabled } } } error { __typename } } }","variables":{"f":null}}'

curl -s -X POST "$CAIDO_URL/graphql" \
  -H "Authorization: Bearer $TOKEN" \
  -F "operations=$OPS" \
  -F 'map={"0":["variables.f"]}' \
  -F '0=@probe.zip;type=application/zip'
```

`force: true` is required for reinstall — without it, installing a package whose version is not greater than the installed one fails with `AlreadyInstalled`. Installed plugins are **auto-enabled**; there is no separate enable step.

**Signing is not required for local install.** The docs describe store packages as signed, but `caido-dev`'s own bundler (`src/bundle/index.ts`) produces a plain JSZip archive with no signature step, and an unsigned zip installed cleanly here. Signing only matters for store distribution (DIST-07).

#### Calling probe functions without a frontend

Two equivalent channels. The raw REST endpoint is the one to script:

```
POST <CAIDO_URL>/plugin/backend/<backend-plugin-uuid>/function
Authorization: Bearer <token>
Content-Type: application/json

{"name":"capabilities","args":[]}
```

Response envelope (note `returns` is a JSON **string** requiring a second parse):

```json
{"kind":"success","returns":"{\"t\":1787222373666,\"qjs\":14449.986}"}
```

The `<backend-plugin-uuid>` comes back from the install mutation, or from `{ pluginPackages { plugins { ... on PluginBackend { id } } } }`.

The Node path via `@caido/sdk-client@0.5.0` is more ergonomic and gives typed errors:

```js
const pkg = await client.plugin.pluginPackage("defminer-probe");
const result = await pkg.callFunction({ name: "capabilities" });
```

Measured round-trip: **1.3 ms**. Errors thrown inside a probe function surface to the caller as `PluginFunctionCallError` **with a stack trace carrying `plugin:LINE:COL`** — a genuinely useful diagnostic channel that ERR-03 should reuse in Phase 2.

#### Does devtools hot reload survive a hang? **No. Proven.**

`caido-dev watch` (read from `src/commands/watch.ts`) runs an express server plus a `ws` `WebSocketServer` on port 3000, serves `dist/plugin_package.zip`, and on rebuild broadcasts `{"kind":"rebuild","downloadUrl":"http://localhost:3000/plugin_package.zip"}`. The devtools **frontend** plugin receives that and triggers `installPluginPackage(force: true)`.

That is exactly the operation that was tested against a hung runtime. Timeline from the host log:

```
10:37:38.385  REDOS_START n=29                    <- QuickJS thread enters catastrophic regex
10:37:40.415  service|plugin: Stopping plugin     <- force-reinstall accepted, stop requested
              ... 25 seconds of nothing ...
10:38:05.377  REDOS_END n=29 elapsed=26991.8      <- regex finally returns
10:38:05.377  plugin|executor: Stopping plugin executor
10:38:05.378  service|plugin: Starting plugin Probe Backend
```

The host accepts the stop request immediately but **the executor cannot stop until the QuickJS thread returns**. For a real catastrophic regex that is hours (measured growth is 4.03× per two added characters; `n=30` took 54.2 s, so `n=40` extrapolates to ~15 hours). `togglePlugin(enabled:false)` behaves identically.

**Verdict: hot reload is excellent for the ten non-destructive spikes and useless for SPIKE-01. The only recovery from a hang is killing the process.** Plan accordingly — do not put a hang spike anywhere that expects to hot-reload afterwards.

---

### Q2 — The sacrificial instance

#### It is a solved problem, and it is fully isolated

Verified by launching one and comparing against the operator's running instance.

```bash
/Applications/Caido.app/Contents/Resources/bin/caido-cli \
  --data-path /tmp/defminer-probe-$RUN_ID \
  --listen 127.0.0.1:8999 \
  --no-open \
  --allow-guests \
  --debug
```

**Use the absolute path to the app-bundled binary.** This machine has two:

| Path | Version |
|---|---|
| `~/.caido/caido-cli` | **0.55.3** — stale standalone download, but it is what bare `caido-cli` resolves to |
| `/Applications/Caido.app/Contents/Resources/bin/caido-cli` | **0.57.1** — what the operator actually runs |

The desktop app is literally this CLI plus an Electron shell; its own process line is
`caido-cli --listen 127.0.0.1:8080 --no-open --parent-pid 90232 --allow-guests`.
Confirmed via `defaults read /Applications/Caido.app/Contents/Info.plist CFBundleShortVersionString` → `0.57.1`.

**0.57.1 is the latest Caido release** (published 2026-07-10; confirmed against `api.caido.io/releases/latest`, the GitHub releases list, and Docker Hub tags). There is nothing newer to upgrade to and nothing older worth comparing against. `caido/caido#2211` is **open, unfixed, and filed against 0.57.1** — the exact build in use. SPIKE-04 is therefore a direct reproduction, and the issue's reported ~54 clean / ~80 stall / ~120 abort thresholds are directly comparable to whatever is measured.

#### Answers to the four specific questions

**`--allow-guests` — yes, it genuinely eliminates all login setup, with one caveat.**
The instance logs `DANGER: Unauthenticated guests allowed to connect`, and `mutation { loginAsGuest { token { accessToken } } }` returns a usable bearer token with zero prior setup, no account, and no cloud interaction. Unauthenticated GraphQL introspection works; unauthenticated *mutations* return `INVALID_TOKEN`, so the guest token is required for everything real.

**Caveat, and it matters:** a guest can create `temporary: true` projects but **not persistent ones** — `createProject(input:{temporary:false})` returns `PermissionDeniedUserError`. Persistent projects are entitlement-gated. Since SPIKE-04's documented failure mode is "aborts the process **and drops temporary projects**", a guest-mode instance can only ever reproduce the temporary-project-loss case. If a spike needs to prove that a *persistent* project survives an abort, that instance must be authenticated with a PAT (`auth: { pat: process.env.CAIDO_PAT }`). A `~/.caido/pat.env` already exists on this machine, so that path is available.

**`--safe` — it disables backend plugins entirely. Never use it for probing.**
Controlled A/B on the same data path:

| Flags | Host log | REST call to probe |
|---|---|---|
| `--allow-guests --debug` | `Starting plugin Probe Backend` + `[defminer-probe] init` | `{"kind":"success","returns":"…"}` |
| `--allow-guests --debug --safe` | *(no `Starting plugin` line at all)* | `500` — host log: `Plugin … is not running` |

Corroborated in the frontend bundle, where `isSafeMode` also gates plugin JS/CSS loading and custom JS execution. `--safe` is a rescue mode for a Caido broken *by* a plugin — useful if a probe ever wedges an instance you want to inspect rather than delete, and useless for running probes.

**`--debug` — yes, and the logs land in two places.**
`--debug` promotes `DEBUG`-level spans into both stdout and the file log. It is what surfaces `service|plugin: Stopping plugin`, `api|controller: Calling plugin (<uuid>) function: <name>`, and `Plugin <uuid> is not running`.

- **stdout** — ANSI-coloured; capture it, but parse the file instead.
- **file** — `<data-path>/logs/logging.<YYYY-MM-DD>.log`, plain text, no ANSI, µs-resolution UTC timestamps. This is the file to parse.

Format, verified:

```
2026-08-20T10:30:01.740000Z  INFO plugin:01489616-133e-4df9-b7a7-3e3b3aa8476f plugin|defminer-probe: BLOCK_START ms=5000 date=1787221801739
```

Every `sdk.console.log()` line carries the backend plugin UUID as its tracing span and the module tag `plugin|<manifest-id>`. `--no-logging` disables the file log; do not use it.

**Will `--debug` surface the `gc_decref_child` assertion?** Almost certainly not, and it does not need to. That assertion is a C-level `abort()` from QuickJS written to **stderr** immediately before the process dies — it is not a `tracing` event and will not appear in the structured log. **Capture stderr separately and check the exit code:**

```bash
caido-cli … > run.stdout.log 2> run.stderr.log
# on exit:
echo "exit=$?"                      # SIGABRT → 134
grep -c "ref_count > 0" run.stderr.log
```

`llrt` builds with `panic = "abort"`, so there is no unwind and no graceful shutdown. The evidence is: exit code 134, the assertion text in stderr, and — critically — whatever the probe wrote to the file log *before* dying. That last point is why ACTIVE-02's write-ahead journal exists, and SPIKE-04 should validate the journal technique at the same time it measures the cliff.

**`--data-path` — isolation is complete. Verified, not assumed.**

| Shared? | Evidence |
|---|---|
| CA certificate | **No.** The disposable instance generated its own CA at startup — SHA-256 `34:77:CA:33…`, `notBefore` = the instance's own launch minute — versus the primary's `F7:B6:2B:0E…` from December 2025 |
| Config / secrets / projects / plugins DBs | **No.** All four (`config.db`, `secrets.db`, `projects.db`, `plugins.db`) are created fresh under `--data-path`; the log states `Data directory: /private/tmp/defminer-probe` |
| Installed plugins | **No.** Separate `<data-path>/plugins/<uuid>/`; the disposable instance started with `pluginPackages: []` while the primary had ~25 installed |
| Logs, backups, hosted files | **No.** All under `--data-path` |
| Credentials / instance identity | **No.** A fresh client ID is minted (`Client: 01M0FAXFH1R0J3QXV3FGXQWMT7`) |
| **Caido Cloud + sync server** | **Yes — the one shared thing.** The instance connects out and starts a sync client. Pass `--no-sync` to suppress it |
| **TCP ports** | **Yes, if you collide.** Pick 8999+ and assert the port is free before launch |

`SIGKILL`ing the disposable instance cannot affect the primary. This was done repeatedly during this research; the operator's Caido (pid 90236) ran untouched throughout.

> ⚠️ **Do not use `--reset-credentials`.** Its help text says `(DANGEROUS)`. With `--data-path` set it should only affect the disposable instance, but there is no reason to find out.

#### Disposable-instance launcher, with the version assertion

```bash
#!/usr/bin/env bash
# scripts/spike/instance.sh — launch an isolated, version-asserted Caido for one spike run
set -euo pipefail

CAIDO_BIN="${CAIDO_BIN:-/Applications/Caido.app/Contents/Resources/bin/caido-cli}"
EXPECT_VERSION="${EXPECT_VERSION:-0.57.1}"
PORT="${PORT:-8999}"
RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM}"
DATA="/tmp/defminer-probe-$RUN_ID"
OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"

# --- GATE 1: the binary is the one we mean -------------------------------
[ -x "$CAIDO_BIN" ] || { echo "FATAL: $CAIDO_BIN not executable"; exit 1; }
ACTUAL="$($CAIDO_BIN --version | awk '{print $2}')"
if [ "$ACTUAL" != "$EXPECT_VERSION" ]; then
  echo "FATAL: version mismatch. expected $EXPECT_VERSION, got $ACTUAL ($CAIDO_BIN)"
  echo "       bare 'caido-cli' on PATH is a STALE 0.55.3 — always use the absolute path."
  exit 1
fi
BIN_SHA="$(shasum -a 256 "$CAIDO_BIN" | cut -d' ' -f1)"

# --- GATE 2: the port is free (never collide with the operator's 8080) ---
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "FATAL: port $PORT already in use"; exit 1
fi
[ "$PORT" = "8080" ] && { echo "FATAL: refusing to use the desktop app's port"; exit 1; }

mkdir -p "$DATA" "$OUT/$RUN_ID"
"$CAIDO_BIN" --data-path "$DATA" --listen "127.0.0.1:$PORT" \
             --no-open --allow-guests --no-sync --debug \
  > "$OUT/$RUN_ID/caido.stdout.log" 2> "$OUT/$RUN_ID/caido.stderr.log" &
CAIDO_PID=$!

# --- GATE 3: wait for readiness, do not sleep and hope --------------------
for _ in $(seq 1 60); do
  curl -sf -o /dev/null -X POST "http://127.0.0.1:$PORT/graphql" \
    -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}' && break
  kill -0 "$CAIDO_PID" 2>/dev/null || { echo "FATAL: caido died during startup"; exit 1; }
  sleep 1
done

TOKEN="$(curl -s -X POST "http://127.0.0.1:$PORT/graphql" -H 'Content-Type: application/json' \
  -d '{"query":"mutation{ loginAsGuest{ token{ accessToken } } }"}' \
  | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"]["loginAsGuest"]["token"]["accessToken"])')"

cat > "$OUT/$RUN_ID/instance.json" <<EOF
{"run_id":"$RUN_ID","pid":$CAIDO_PID,"port":$PORT,"data_path":"$DATA",
 "binary":{"path":"$CAIDO_BIN","reported_version":"$ACTUAL","expected_version":"$EXPECT_VERSION","sha256":"$BIN_SHA"},
 "flags":["--no-open","--allow-guests","--no-sync","--debug"],"started_at":"$(date -u +%FT%TZ)"}
EOF

echo "$TOKEN" > "$OUT/$RUN_ID/token"
echo "RUN_ID=$RUN_ID CAIDO_PID=$CAIDO_PID PORT=$PORT DATA=$DATA"
```

Teardown — **always `SIGKILL`, never `SIGTERM`**, because a hung spike will not honour a graceful shutdown:

```bash
kill -9 "$CAIDO_PID" 2>/dev/null || true
wait "$CAIDO_PID" 2>/dev/null; echo "exit=$?"   # 134 == SIGABRT == the #2211 crash
cp "$DATA/logs/"*.log "$OUT/$RUN_ID/"
rm -rf "$DATA"
```

#### Is Docker cleaner? No, for this phase.

`caido/caido:0.57.1` and `:0.57.1-slim` exist (128 MB / 93 MB, both pushed 2026-07-10), with the in-container data path `/home/caido/.local/share/caido` and uid/gid 999. But Docker Desktop is installed and **not running** on this machine, the image is linux/amd64 under emulation on this M4 Pro, and emulation would make every CPU number in SPIKE-06 meaningless.

More decisively: `--data-path` already gives complete isolation, so Docker's only added value would be resource limits — and there is no reason to cap memory when SPIKE-06's whole purpose is to find where the runtime breaks naturally.

**Use Docker in Phase 6 (DEPLOY-01), not Phase 0.** One caveat worth recording now: containers get an OOM-killer that a desktop does not, so an OOM abort in Docker looks different from an OOM abort on the desktop. Phase 6 must test both.

---

### Q3 — Measuring from inside

#### What exists: excellent clocks

| API | Present? | Evidence |
|---|---|---|
| `performance.now()` | **YES** | Measured. `typeof performance === "object"`, `typeof performance.now === "function"` |
| Resolution | **~1 µs** | Smallest observed non-zero delta: **0.000999987 ms** across 50 samples |
| `performance.timeOrigin` | YES, **but not wall-clock** | Returned `266547596.912` — a monotonic boot-relative origin, not a Unix epoch. `timeOrigin + now()` is **not** a timestamp |
| `Date.now()` | YES | Millisecond resolution; the correct bridge to host log timestamps |

`performance` has exactly two own-enumerable properties: `now` and `timeOrigin`. Its prototype carries only `Object.prototype`. There is no `performance.memory`.

#### What does not exist: any memory introspection at all

Every candidate was probed by dynamic `import()` inside the runtime:

```
llrt:qjs     → ReferenceError: could not load module 'llrt:qjs'
qjs          → ReferenceError: could not load module 'qjs'
perf_hooks   → ReferenceError: could not load module 'perf_hooks'
process      → ReferenceError: could not load module 'process'
os           → LOADS, but exports only: EOL, arch, availableParallelism,
               default, homedir, platform, release, tmpdir, type, version
typeof globalThis.gc  → "undefined"
```

Upstream LLRT ships `llrt:qjs`, which wraps QuickJS's native `JS_ComputeMemoryUsage` and would have given `malloc_size`, `memory_used_size`, `obj_count` and 20 more fields. **Caido does not compile it in** — corroborated by string analysis: neither `llrt:qjs` nor `ComputeMemoryUsage` appears anywhere in the 0.57.1 binary.

There is also **no `gc()`**, so collection cannot be forced before a measurement.

**Conclusion, stated plainly: heap usage cannot be observed from inside a Caido backend plugin. There is no workaround inside the runtime. The external proxy is not a fallback — it is the only method.**

#### The external technique, validated

Backend plugins run **in-process** inside `caido-cli` (single process; only the operator's Electron shell adds others). So RSS of that one PID is a real signal — but it is the RSS of Caido plus your plugin, which is why every measurement must be a **delta from a marker**, never an absolute.

**The rig:**

1. Probe writes markers via `sdk.console.log()` around the operation. Include `Date.now()` **and** `performance.now()` in every marker.
2. External sampler polls `ps -o rss=,%cpu= -p $CAIDO_PID` at 50–100 ms with Unix-ms timestamps.
3. Correlate by timestamp against the host log's µs-resolution lines.

Sampler:

```bash
#!/usr/bin/env bash
# scripts/spike/rss-sampler.sh <pid> <out.csv> [interval_s]
PID=$1; OUT=$2; HZ=${3:-0.05}
echo "unix_ms,rss_kb,cpu_pct" > "$OUT"
while kill -0 "$PID" 2>/dev/null; do
  read -r rss cpu <<< "$(ps -o rss=,%cpu= -p "$PID" 2>/dev/null)"
  [ -z "$rss" ] && break
  printf '%s,%s,%s\n' "$(python3 -c 'import time;print(int(time.time()*1000))')" "$rss" "$cpu" >> "$OUT"
  sleep "$HZ"
done
```

Probe-side marker:

```js
function measure(sdk, label, work) {
  sdk.console.log(`MARK_START ${label} date=${Date.now()} qjs=${performance.now().toFixed(3)}`);
  const t0 = performance.now();
  const result = work();
  const elapsed = performance.now() - t0;
  sdk.console.log(`MARK_END ${label} elapsed_ms=${elapsed.toFixed(3)} date=${Date.now()} qjs=${performance.now().toFixed(3)}`);
  return { label, elapsed_ms: elapsed, result };
}
```

**Correlation accuracy is proven.** A probe wrote `date=1787221801739`; the host wrote that line at `2026-08-20T10:30:01.740000Z` — **0.26 ms apart**. Inside-runtime and outside-host timelines can be aligned with sub-millisecond confidence.

**Attribution is proven.** Holding N MB of JS strings and sampling RSS:

| Phase | RSS | Δ | Ratio |
|---|---|---|---|
| baseline | 69.3 MB | — | — |
| +32 MB held | 103.1 MB | +33.8 MB | 1.06× |
| +64 MB more | 168.4 MB | +65.3 MB | 1.02× |
| references dropped | **168.5 MB** | **+0.1 MB** | — |

Two consequences the planner must build into every memory spike:

1. **Attribution is excellent on the way up** — RSS tracks JS allocation to within 6%.
2. **RSS never comes back down.** Dropping every reference recovered nothing. QuickJS's allocator does not return pages to the OS, and there is no `gc()` to force the issue. **RSS is a high-water mark, not a live gauge.**

Therefore:

- **SPIKE-06 must use a fresh instance per size point**, or accept monotonic accumulation and record only the *step* at each marker. A fresh instance per size point is cleaner and costs ~15 s each.
- **QUAL-06's "no growing heap" soak assertion cannot be written against absolute RSS** — RSS grows monotonically by design. The correct assertion is that the *per-artifact RSS delta* converges toward zero across repetitions, not that total RSS is flat. Carry this correction forward to Phase 11.

#### Fallbacks if RSS proves too coarse

| Method | Availability | Note |
|---|---|---|
| `ps -o rss` @ 50 ms | ✅ verified working | Default. Adequate for MB-scale steps |
| `/usr/bin/time -l` peak RSS | ✅ macOS | Whole-process peak only; useful as a run-level ceiling |
| `footprint -p <pid>` | macOS-only | Finer breakdown; not portable to the Linux/Docker matrix in Phase 6 |
| `vmmap -summary <pid>` | macOS-only | Heaviest, but distinguishes malloc zones if a step is ambiguous |
| Crash-boundary bisection | ✅ portable | If RSS is too noisy, binary-search the input size at which the host aborts. Gives the ceiling directly, which is what SPIKE-06 actually needs |

Crash-boundary bisection deserves emphasis: **SPIKE-06's deliverable is a size ceiling, not a memory curve.** The ceiling can be measured directly by escalating input size on a fresh instance until exit code 134, no sampler required. Use RSS sampling for the shape and bisection for the number.

---

### Q4 — Generating load

#### Reproducible: a local static server behind the Caido proxy

Do not proxy the public internet. Serve the corpus locally and proxy that. This removes DNS, TLS handshakes, CDN variance, and rate limits in one move, and makes CI replay trivial.

```bash
# terminal 1 — corpus origin
cd corpus && python3 -m http.server 8081 --bind 127.0.0.1

# terminal 2 — 500 requests through Caido, 20 concurrent
seq 1 500 | xargs -P 20 -I{} \
  curl -s -o /dev/null --proxy "http://127.0.0.1:$PORT" \
       "http://127.0.0.1:8081/ace-1.36.5.js?n={}" -m 30
```

**Measured on this machine: 500 requests in 0.70 s = 710 req/s, and all 500 were delivered to `onInterceptResponse`** with an idle handler. That is SPIKE-03's apparatus, already validated — the spike itself is the same run with a blocking handler and a delivered-event count.

Throughput of a single 1 MB body through the Caido proxy from the local origin: **4.2 ms**.

HTTPS through the proxy works once the disposable instance's CA is fetched — the instance serves it at `GET /ca.crt` (656 bytes, verified):

```bash
curl -s "http://127.0.0.1:$PORT/ca.crt" -o "$OUT/$RUN_ID/ca.crt"
curl -s --proxy "http://127.0.0.1:$PORT" --cacert "$OUT/$RUN_ID/ca.crt" https://example.com/
```

#### Which generator for which spike

| Spike | Generator | Why |
|---|---|---|
| SPIKE-03 (backpressure) | `seq | xargs -P 20 curl --proxy` against local origin | Deterministic count, deterministic size, controllable concurrency. Only the delivered-event count matters |
| SPIKE-06 (CPU/RSS budgets) | **Neither** — call the probe directly via REST | The proxy path adds variance to a measurement that is about parse cost. Bundle the corpus as a plugin asset or read it from disk |
| SPIKE-08 (body semantics) | Custom Python origin that controls `Content-Encoding` | Serving `gzip`/`br`/`zstd` with matching headers is the whole experiment. `http.server` cannot do it; a 30-line `BaseHTTPRequestHandler` can |
| SPIKE-05 / SPIKE-11 (event matrix, 304s) | Custom Python origin emitting `ETag`/`Last-Modified` + a real browser for cache behaviour | 304s require a client with a real HTTP cache. `curl` will not produce them naturally; **Playwright Chromium is required here** |
| SPIKE-10 (cache hit rate) | **Real browsing through the disposable proxy, over days** | See below |

#### SPIKE-10 needs a different shape entirely

SPIKE-10 asks for the content-hash cache hit rate on *real* browsing. That number is a property of how sites actually version and re-serve their bundles across sessions and deploys. It cannot be synthesised from a scripted burst, and it cannot be produced on demand at the end of the phase — it is **wall-clock-bound**.

The right mechanism, in three parts:

1. **A passive recorder, installed on day one.** A Tier-0 probe whose `onInterceptResponse` does nothing but SHA-256 the body and append `{ts, url, sha256, bytes, content_type, status}` to its own SQLite via `sdk.meta.db()`. Cheap enough to leave running.
2. **Two collection modes, both recorded:**
   - *Live* — the operator points their real browser at the disposable instance's proxy for normal work over several days. Highest realism, lowest reproducibility.
   - *Scripted* — a Playwright script visits a **pinned list of 30–50 real sites**, twice per session, across several sessions and several days. Reproducible, and the only version that can run in CI.
3. **Compute the rate offline** from the recorded log, not inside the plugin. Report *three* numbers, because they answer different questions: within-page-load hit rate, within-session hit rate, and across-day hit rate. The across-day number is the one that drives the CPU budget, and it is the one a single burst can never produce.

**This is a scheduling constraint, not a methodology detail.** SPIKE-10's recorder must be built and deployed in plan 00-01 and merely *read* in plan 00-04. See Q7.

#### Rejected: HAR replay

HAR replay looks attractive for reproducibility and is wrong here. A HAR is a record of a *client's* view — it has already resolved caching, already followed redirects, and stores bodies base64-encoded and often truncated. Replaying it through a proxy fabricates traffic that never traverses the real code path being measured. If reproducible realistic traffic is needed, use a pinned Playwright script against a pinned site list; if reproducible *deterministic* traffic is needed, use the local corpus origin.

---

### Q5 — The corpus

Every artifact below was **downloaded and hashed during this research**. Sizes are exact bytes, not estimates. All are permanently versioned immutable jsDelivr paths.

| Target | Artifact | Bytes | MB | SHA-256 |
|---|---|---:|---:|---|
| **~0.5 MB** | `ace-builds@1.36.5/src-min-noconflict/ace.js` | 457,965 | 0.44 | `519c9f3866177fe911c7a065a5f30868892a970b69a79b52a98b01fb441f680e` |
| **~1.0 MB** | `echarts@5.5.1/dist/echarts.min.js` | 1,030,855 | 0.98 | `e84270bd0cd5bdf60fefc26d00c2a391cb2e81f4d26a7a9ee16185a54773a3cf` |
| **~1.5 MB** | `@tensorflow/tfjs@4.22.0/dist/tf.min.js` | 1,469,843 | 1.40 | `300dfae273d20b4046f46a06d735688f03675a807561e9bcb5f664eb2f3d2831` |
| **~3 MB** | `@babel/standalone@7.26.4/babel.min.js` | 2,983,904 | 2.85 | `a12872ea8da3d29b2a296c51bfac7c482e81419c755f2207a49ad9b77200f4ea` |
| **~3.6 MB** | `monaco-editor@0.52.2/min/vs/editor/editor.main.js` | 3,766,654 | 3.59 | `90b588bc0b624e24052a576e1bcab2eaffec7bc666895188862eebd9c9745782` |
| **~4.3 MB** | `plotly.js-dist-min@2.35.2/plotly.min.js` | 4,558,696 | 4.35 | `6d21266ce1bd7d9e5ab4e115989c70c20de0382fd973a8f26ab58619eba4d603` |
| **~4.9 MB** | `cesium@1.124.0/Build/Cesium/Cesium.js` | 5,139,114 | 4.90 | `7520b29545f5803c1f690650545d84d1bf5c25ce3c47ca65a43059604cdf1f58` |
| **~8 MB** | `monaco ‖ plotly` (byte concatenation, in that order) | 8,325,350 | **7.94** | *derive at fetch time* |

Base URL for all: `https://cdn.jsdelivr.net/npm/<artifact>`.

**On the 8 MB tier — be honest about what it is.** A single 8 MB minified JS file is genuinely rare in the wild; the largest real single artifacts found were Cesium at 4.9 MB and Plotly at 4.35 MB. So 8 MB is an **upper stress bound**, not a realistic sample, and it must be labelled as such in the go/no-go table. Concatenating two *distinct* bundles is materially better than the `echarts×5` self-concatenation used in the earlier benchmarks, because self-concatenation gives an artificially favourable string table, artificially high internal duplication, and would make a content-hash cache look better than it is.

**Second reason not to reuse `echarts×5`:** it also makes ReDoS and prefilter measurements optimistic, because a repeated corpus has an unrepresentatively small distinct-literal set.

**Fetch script — hash-verified, CI-safe:**

```bash
#!/usr/bin/env bash
# scripts/spike/fetch-corpus.sh — idempotent, fails closed on hash mismatch
set -euo pipefail
DIR="${1:-corpus}"; mkdir -p "$DIR"; cd "$DIR"
CDN="https://cdn.jsdelivr.net/npm"

fetch() { # <local> <sha256> <cdn-path>
  local f="$1" want="$2" p="$3"
  [ -f "$f" ] || curl -fsSL --retry 3 --max-time 180 "$CDN/$p" -o "$f"
  local got; got="$(shasum -a 256 "$f" | cut -d' ' -f1)"
  [ "$got" = "$want" ] || { echo "HASH MISMATCH $f: want $want got $got"; rm -f "$f"; exit 1; }
  printf '  %-24s %9d B  ok\n' "$f" "$(wc -c < "$f")"
}

fetch ace-1.36.5.js     519c9f3866177fe911c7a065a5f30868892a970b69a79b52a98b01fb441f680e "ace-builds@1.36.5/src-min-noconflict/ace.js"
fetch echarts-5.5.1.js  e84270bd0cd5bdf60fefc26d00c2a391cb2e81f4d26a7a9ee16185a54773a3cf "echarts@5.5.1/dist/echarts.min.js"
fetch tfjs-4.22.0.js    300dfae273d20b4046f46a06d735688f03675a807561e9bcb5f664eb2f3d2831 "@tensorflow/tfjs@4.22.0/dist/tf.min.js"
fetch babel-7.26.4.js   a12872ea8da3d29b2a296c51bfac7c482e81419c755f2207a49ad9b77200f4ea "@babel/standalone@7.26.4/babel.min.js"
fetch monaco-0.52.2.js  90b588bc0b624e24052a576e1bcab2eaffec7bc666895188862eebd9c9745782 "monaco-editor@0.52.2/min/vs/editor/editor.main.js"
fetch plotly-2.35.2.js  6d21266ce1bd7d9e5ab4e115989c70c20de0382fd973a8f26ab58619eba4d603 "plotly.js-dist-min@2.35.2/plotly.min.js"
fetch cesium-1.124.0.js 7520b29545f5803c1f690650545d84d1bf5c25ce3c47ca65a43059604cdf1f58 "cesium@1.124.0/Build/Cesium/Cesium.js"

cat monaco-0.52.2.js plotly-2.35.2.js > composite-8mb.js
printf '  %-24s %9d B  (derived)\n' composite-8mb.js "$(wc -c < composite-8mb.js)"
```

Commit the script and the hashes; `.gitignore` the files. `npm pack <pkg>@<version>` is an equally valid source if jsDelivr is ever unavailable — it produces the same dist files with registry-level integrity.

**Two more corpora Phase 0 needs, distinct from the size ladder:**

- **Deep-nesting fixtures for the stack probe (SPIKE-06).** Generated, not downloaded — `"[".repeat(n) + "]".repeat(n)` and `"(".repeat(n) + "1" + ")".repeat(n)` across `n ∈ {100, 500, 1k, 2k, 5k, 10k, 20k}`. Deterministic and requires no network.
- **ReDoS payloads (SPIKE-01).** Also generated. Measured growth on Caido 0.57.1 with `/(a+)+$/` against `"a".repeat(n) + "b"`: n=20 → 51 ms, n=22 → 208 ms, n=24 → 825 ms, n=26 → 3,289 ms, n=28 → 13,428 ms, n=30 → 54,168 ms. **Exactly 4.03× per two characters.** Use n ≤ 26 for anything you intend to recover from, and n ≥ 40 (≈15 h extrapolated) for the genuinely-unbounded proof.

---

### Q6 — Recording results

The requirement is that later phases read *numbers*, not prose. Two artifact classes achieve that.

#### Per-run: `results/<RUN_ID>/SPIKE-NN.json`

```jsonc
{
  "$schema": "../spike-result.schema.json",
  "spike": "SPIKE-02",
  "run_id": "20260821T091403Z-8842",
  "status": "pass",                        // pass | fail | inconclusive | blocked
  "recorded_at": "2026-08-21T09:14:44Z",
  "duration_s": 41,

  "binary": {
    "path": "/Applications/Caido.app/Contents/Resources/bin/caido-cli",
    "expected_version": "0.57.1",
    "reported_version": "0.57.1",          // MUST equal expected_version or status=blocked
    "sha256": "…"
  },
  "host": { "os": "darwin", "release": "26.6.1", "arch": "arm64",
            "cpu": "Apple M4 Pro", "cores": 14, "ram_gb": 24, "loadavg_1m": 1.8 },
  "instance": { "data_path": "/tmp/defminer-probe-20260821T091403Z-8842",
                "listen": "127.0.0.1:8999", "fresh": true,
                "flags": ["--no-open","--allow-guests","--no-sync","--debug"],
                "exit_code": 0 },
  "probe": { "tier": "raw-zip", "package_version": "0.0.7",
             "bundle_sha256": "…", "deps": {} },
  "corpus": [],

  "method": "Fixed 300 ms wall-clock window per primitive, 1 ms synchronous slice between yields, 4 ms setInterval counting service opportunities.",

  "measurements": [
    { "name": "yield_cost", "primitive": "setTimeout0", "value": 5.674,
      "unit": "ms", "stat": "median", "p95": 5.77, "n": 48 },
    { "name": "timer_service_ratio", "primitive": "setTimeout0", "value": 0.76,
      "unit": "ratio", "stat": "point", "n": 1 },
    { "name": "timer_service_ratio", "primitive": "setImmediate", "value": 0.0,
      "unit": "ratio", "stat": "point", "n": 1 }
  ],

  "verdict": {
    "answer": "setTimeout(fn,0) is the only primitive that yields the event loop; setImmediate and queueMicrotask starve timers identically to a fully blocking loop.",
    "confidence": "HIGH",
    "thresholds_set": [
      { "id": "YIELD_PRIMITIVE",    "value": "setTimeout0", "unit": "enum" },
      { "id": "YIELD_COST_MS",      "value": 5.7,           "unit": "ms" },
      { "id": "MIN_SYNC_SLICE_MS",  "value": 25,            "unit": "ms",
        "rationale": "Yield on elapsed time, not chunk count: 5.7ms per yield over 128 64KB chunks would cost 730ms of pure overhead." }
    ],
    "if_wrong": "CORE-06's chunk-and-yield model is invalid and the ingestion execution model must change."
  },

  "requirements_affected": ["CORE-06", "CORE-07", "CORE-04"],
  "artifacts": ["raw/SPIKE-02.jsonl", "caido.stdout.log", "caido.stderr.log",
                "logging.2026-08-21.log", "rss.csv"],
  "notes": "First attempt used a fixed iteration count; runs completed in <1 interval period and produced a false negative for setTimeout0. Corrected to fixed wall-clock duration."
}
```

Three fields carry disproportionate weight and must never be omitted:

- **`binary.reported_version` vs `expected_version`** — the stale 0.55.3 on `PATH` is a live footgun. If they differ, `status` is `blocked` and the run is discarded.
- **`verdict.thresholds_set[]`** — this is what makes the go/no-go table machine-checkable. Every constant in DefMiner's source must trace to one of these IDs.
- **`verdict.if_wrong`** — Phase 0's stated goal is a table saying "what changes if this is wrong". Encode it, do not narrate it.

Raw sample streams go to `raw/SPIKE-NN.jsonl` (one JSON object per line, never a CSV) so a later re-analysis can recompute statistics without re-running the spike.

#### Phase-level: `results/go-no-go.json`

One file, generated by aggregating the per-run files, and the **only** artifact later phases are allowed to import.

```jsonc
{
  "$schema": "./go-no-go.schema.json",
  "caido_version": "0.57.1",
  "generated_at": "2026-08-22T17:02:00Z",
  "source_runs": { "SPIKE-01": "20260822T1140Z-1193", "SPIKE-02": "20260821T091403Z-8842" },

  "thresholds": {
    "YIELD_PRIMITIVE":       { "value": "setTimeout0", "unit": "enum",  "spike": "SPIKE-02", "confidence": "HIGH" },
    "YIELD_COST_MS":         { "value": 5.7,   "unit": "ms",    "spike": "SPIKE-02", "confidence": "HIGH" },
    "MAX_SYNC_SLICE_MS":     { "value": 25,    "unit": "ms",    "spike": "SPIKE-02", "confidence": "HIGH" },
    "AST_MAX_BYTES":         { "value": null,  "unit": "bytes", "spike": "SPIKE-06", "confidence": "PENDING" },
    "HARD_MAX_BYTES":        { "value": null,  "unit": "bytes", "spike": "SPIKE-06", "confidence": "PENDING" },
    "MAX_NESTING_DEPTH":     { "value": null,  "unit": "frames","spike": "SPIKE-06", "confidence": "PENDING" },
    "SEND_CLIFF_SAVE_TRUE":  { "value": null,  "unit": "count", "spike": "SPIKE-04", "confidence": "PENDING" },
    "CACHE_HIT_RATE_CROSS_DAY": { "value": null, "unit": "ratio", "spike": "SPIKE-10", "confidence": "PENDING" }
  },

  "gates": [
    { "spike": "SPIKE-01", "question": "Does a catastrophic regex hang the plugin forever?",
      "answer": "…", "status": "pass",
      "blocks": ["DET-04","DET-05","DET-06"],
      "changes_if_wrong": "…" }
  ],

  "unresolved": []
}
```

#### Making it machine-checkable, concretely

A vitest test in the SDK-free engine workspace imports `go-no-go.json` and asserts that every tunable constant equals its recorded threshold:

```ts
// packages/engine/src/budget.spec.ts
import gonogo from "../../../.planning/phases/00-runtime-reality-check/results/go-no-go.json";
import { MAX_SYNC_SLICE_MS, AST_MAX_BYTES } from "./budget";

it("budget constants trace to Phase 0 measurements", () => {
  expect(MAX_SYNC_SLICE_MS).toBe(gonogo.thresholds.MAX_SYNC_SLICE_MS.value);
  expect(AST_MAX_BYTES).toBe(gonogo.thresholds.AST_MAX_BYTES.value);
});

it("no budget constant rests on a PENDING measurement", () => {
  for (const [id, t] of Object.entries(gonogo.thresholds)) {
    expect(t.confidence, `${id} is still PENDING`).not.toBe("PENDING");
  }
});
```

Now a developer who "tunes" a constant without re-measuring fails CI, and Phase 0's numbers cannot silently rot. Add a JSON Schema (`spike-result.schema.json`, `go-no-go.schema.json`) validated by `ajv` in the same CI job so a malformed result file also fails the build.

**Prose still has a place** — a human-readable `00-GO-NO-GO.md` rendered *from* `go-no-go.json` is the right artifact for the operator. It must be generated, never hand-written, so the two cannot diverge.

---

### Q7 — Ordering and safety

#### 🚨 First, a numbering collision the planner will otherwise walk straight into

`REQUIREMENTS.md` and `PITFALLS.md` use **incompatible SPIKE numbering**. `STACK.md` uses a third scheme ("Spike 1–5"). Five IDs mean different things in different documents:

| ID | `REQUIREMENTS.md` (**authoritative**) | `PITFALLS.md` (**do not use its numbers**) |
|---|---|---|
| SPIKE-01 | ReDoS + `re2js` | ✅ same |
| SPIKE-02 | **`setTimeout(fn,0)` yields?** | ❌ CPU/RSS budgets *(= REQ SPIKE-06)* |
| SPIKE-03 | Event overflow/backpressure | ✅ same |
| SPIKE-04 | `#2211` send cliff | ✅ same |
| SPIKE-05 | Event matrix | ✅ same |
| SPIKE-06 | **CPU/RSS budgets + stack** | ❌ `llrt/fs` containment *(= REQ SPIKE-12)* |
| SPIKE-07 | **`structuredClone`** | ❌ `PRAGMA`/`BEGIN`/`COMMIT` *(= REQ SPIKE-09)* |
| SPIKE-08 | Body decompression | ✅ same |
| SPIKE-09 | **`PRAGMA`/transactions** | ❌ False-positive corpus *(= REQ QUAL-01…03, Phase 3)* |
| SPIKE-10 | **Cache hit rate** | ❌ Store-policy pre-clearance *(= REQ DIST-03, Phase 11)* |
| SPIKE-11 | 304s reach the hook? | — absent |
| SPIKE-12 | `llrt/fs` containment | — absent |

**`REQUIREMENTS.md` is authoritative.** PITFALLS.md's *methods* are valuable and should be mined; its *IDs* must be discarded on sight. Every plan should cite the requirement ID and restate the question in words, so a mis-mapping is visible rather than silent.

#### Destructiveness classification

| Spike | Class | Effect | Instance policy |
|---|---|---|---|
| SPIKE-01 | **DESTRUCTIVE — terminal** | Hangs the QuickJS thread for hours. Reinstall, toggle, and hot reload all block behind it | **Fresh instance, killed after. Never share.** |
| SPIKE-04 | **DESTRUCTIVE — terminal** | Aborts `caido-cli` (`panic = "abort"`, exit 134). Drops temporary projects | **Fresh instance per variant.** See below |
| SPIKE-06 | **DESTRUCTIVE — probable** | Deliberately escalates to the memory/stack ceiling; OOM aborts the host | Fresh instance per size point |
| SPIKE-03 | Semi-destructive — recoverable | Blocks the thread ~30 s; recovers cleanly | Run **last** in its plan |
| SPIKE-02, -05, -07, -08, -09, -10, -11, -12 | Non-destructive | Safe to share an instance and hot reload | Share freely |

Two facts that make this classification actionable:

- **The Caido core survives a plugin hang.** During a 54 s catastrophic regex, GraphQL answered in 7 ms and the proxy returned 200s. So a hung instance is still *diagnosable* — you can read its state, you just cannot restart its plugin.
- **`SIGKILL` is the only reliable teardown.** `SIGTERM` on a hung instance waits for the QuickJS thread.

#### SPIKE-04 needs a fresh instance per variant — this is a defect in the sketch

The ROADMAP success criterion says the send loop is *"repeated with `save:false` and with `caido:http` `fetch`"*. `#2211` is a **cumulative refcount leak across the runtime's lifetime**. Running three variants in one runtime pollutes variants 2 and 3 with variant 1's leaked references, and the measured cliff for `save:false` would be meaningless.

**Fix: three runs, three fresh instances, one variant each.**

There is also a cheap and valuable question the sketch does not ask: **does toggling the plugin off and on reset the leak?** The log shows a per-plugin executor (`plugin|executor: Stopping plugin executor`), which suggests the QuickJS runtime may be per-plugin and torn down on toggle. If it is, the leak resets on plugin restart, and ACTIVE-13's crash-loop recovery gains a far cheaper mitigation than "restart Caido". **One extra 10-minute test, potentially a large design win.** Add it to SPIKE-04.

#### Two more defects in the sketch

**Defect A — SPIKE-10 cannot be a plan-00-04 activity.** Cross-day cache hit rate is wall-clock-bound. Its recorder must ship in plan 00-01 and merely be *read* in 00-04. The sketch places the whole spike at the end, where there is no time left to collect the data. This is the most consequential ordering error, because SPIKE-10 is named in SUMMARY.md as the single biggest performance lever.

**Defect B — "memory is measured inside Caido" is not achievable.** ROADMAP success criterion 5 reads *"Wall-clock and memory are measured inside Caido"*. Wall clock, yes — `performance.now()` at 1 µs. Memory, no — there is no introspection API of any kind. **Reword to "measured for Caido via external RSS sampling correlated to in-runtime markers."** Otherwise the phase has an unsatisfiable exit criterion.

**Minor — SPIKE-11 belongs with SPIKE-05.** They share one apparatus (a caching-aware origin plus an event log), and splitting them across plans 00-02 and 00-03 builds that apparatus twice.

**Minor — plan 00-01 is under-scoped.** As written it is only the capability probe, which took about ten minutes here. Re-scope it to own the shared harness that the other three plans consume.

#### Recommended execution order

Still four plans, redistributed. Each wave's instance policy is explicit.

**Plan 00-01 — Harness and capability probe** *(non-destructive, one shared instance)*
1. `scripts/spike/instance.sh` with the three startup gates and the version assertion
2. `scripts/spike/rss-sampler.sh`, `scripts/spike/fetch-corpus.sh`, the local origin server, the results writer, and the two JSON Schemas
3. Tier-0 probe: `globalThis` enumeration, `structuredClone`, `WebAssembly`, `performance`, stack depth **(SPIKE-07)**
4. **SPIKE-02** — yield primitives. Moved forward from 00-02: it is non-destructive, it is cheap, and its answer shapes the measurement loop of every spike that follows
5. **Deploy the SPIKE-10 recorder** and start collecting

**Plan 00-02 — Budgets and persistence** *(one shared instance; fresh instance per SPIKE-06 size point)*
6. **SPIKE-08** — body semantics. Must precede SPIKE-06: an "8 MB ceiling" is meaningless until you know whether the 8 MB is compressed or decompressed
7. **SPIKE-06** — CPU/RSS across the size ladder, plus the stack-break probe. Tier-1 build (meriyah/acorn). Fresh instance per size point; RSS sampler for shape, crash bisection for the number
8. **SPIKE-09** — `PRAGMA` / `BEGIN` / `COMMIT` across pooled `exec` calls
9. **SPIKE-12** — `llrt/fs` containment with no `realpath` and no `lstat`

**Plan 00-03 — Event matrix** *(one shared instance; SPIKE-03 last)*
10. **SPIKE-05 + SPIKE-11** — one apparatus. Per-surface matrix (Proxy, Replay, Automate, import, workflow, plugin-originated) × `save:{true,false}` × `plugins:{true,false}`, plus 304/cached delivery. Playwright required for genuine 304s
11. **SPIKE-03** — blocking handler under 500 proxied responses. Run last; it wedges the thread for ~30 s

**Plan 00-04 — Destructive spikes and the go/no-go table** *(fresh instance per run, no exceptions)*
12. **SPIKE-01** — ReDoS. Escalating `n` on one instance up to n=26 (recoverable), then n≥40 on a final instance that is killed. Then the `re2js` comparison on a **separate, clean** instance, since the hung one is unusable
13. **SPIKE-04** — send cliff. **Three fresh instances**: `save:true`, `save:false`, `caido:http fetch`. Plus the plugin-toggle-resets-the-leak test. Capture stderr and exit code on every run
14. Read the SPIKE-10 recorder; compute the three hit rates offline
15. Aggregate `go-no-go.json`; render `00-GO-NO-GO.md`; wire the vitest threshold assertion

**Rule that must survive into every plan: never run a destructive spike on an instance that a later step still needs.** The failure mode is not a lost instance — it is a silently-wrong measurement taken on a poisoned runtime.

---

## Verified Runtime Facts (measured this session, Caido 0.57.1)

These came out of proving the harness works. They are real measurements on the target build and should be recorded as such — but each spike still owns its full question, and these numbers are a starting point, not a substitute.

| Fact | Value | Bearing |
|---|---|---|
| `structuredClone` | **`undefined`** | **SPIKE-07 answered.** meriyah@7's polyfill guard is mandatory, not defensive |
| `WebAssembly` | `undefined` | Confirms oxc/swc/`mappings.wasm` are structurally impossible |
| `performance.now()` | present, **~1 µs** | Timing primitive for every spike |
| `performance.timeOrigin` | present, **not wall-clock** | Do not compute timestamps from it; use `Date.now()` |
| Memory introspection | **none whatsoever** | Forces external RSS. See Q3 |
| `globalThis.gc` | `undefined` | Cannot force collection before a measurement |
| `TextDecoder` / `TextEncoder` | **not globals** | Must come from a module import; ENC-01/-02 depend on this |
| `Atomics`, `SharedArrayBuffer` | **present** | Corrects the earlier bare-quickjs-ng finding of "Atomics undefined". Moot without `Worker`, but the prior claim was wrong |
| `queueMicrotask`, `setImmediate` | present | See yield table below |
| Recursion depth (trivial 1-arg frame) | **1,021 frames**, catchable `RangeError` | Real AST-walk frames are far larger, so the effective depth is much lower. SPIKE-06 must measure with realistic frames |
| Globals total | 80, enumerated | The type package declares ~6. Always enumerate |
| `setTimeout` clamp | **≥4 ms** (documented and observed) | `setTimeout(fn,0)` and `setTimeout(fn,1)` are indistinguishable |

**Yield primitives — 300 ms window, 1 ms synchronous slice between yields, 4 ms `setInterval` counting service opportunities:**

| Primitive | Yields | Timer ticks (of 75) | Service ratio | Verdict |
|---|---:|---:|---:|---|
| `setTimeout(r, 0)` | 48 | **57** | **0.76** | **Genuinely yields the event loop** |
| `setImmediate(r)` | 300 | 0 | 0.00 | Does **not** yield to timers |
| `Promise.resolve()` | 300 | 0 | 0.00 | Microtask only |
| *(no yield, blocking)* | 0 | 0 | 0.00 | baseline |

Cost: `setTimeout(r,0)` medians **5.67 ms** per yield (p95 5.77 ms).

**Design consequence for CORE-06.** At 5.7 ms per yield, an 8 MB bundle chunked at 64 KB is 128 yields ≈ **730 ms of pure overhead**, on top of analysis. Chunk *geometry* should therefore not drive yielding. Accumulate synchronous work and yield when elapsed time approaches the budget: at a 25 ms slice the overhead is 5.7/(25+5.7) ≈ **19%** instead of 5.7 ms per 64 KB. The 64 KB / 4 KB geometry can stay for *matching-window* reasons while the *yield* trigger becomes temporal. SPIKE-02 should confirm this at the real geometry with real detector work in the slice.

**Catastrophic regex on 0.57.1** — `/(a+)+$/` vs `"a".repeat(n)+"b"`:

| n | elapsed | | n | elapsed |
|---:|---:|---|---:|---:|
| 20 | 51 ms | | 26 | 3,289 ms |
| 22 | 208 ms | | 28 | 13,428 ms |
| 24 | 825 ms | | 30 | **54,168 ms** |

Growth **4.03× per +2 chars**, no interrupt, no timeout, no recovery. Extrapolated n=40 ≈ 15 hours. During the hang: GraphQL 200 in 7 ms, proxy 200, **plugin RPC queued (not dropped) and served after the hang ended**, and `installPluginPackage(force:true)` blocked for the full duration.

---

## Standard Stack

### Core (probe harness)

| Library | Version | Purpose | Why standard |
|---|---|---|---|
| `@caido-community/dev` | 0.1.7 | Tier-1 probe build | The only pipeline that reproduces Caido's exact tsup config (`config:false`, `target:esnext`, builtins external). Required wherever the build is under test |
| `@caido/sdk-client` | 0.5.0 | Headless driver | Official. `install()`, `pluginPackage()`, `callFunction()`, `subscribeEvent()`. Verified working with a guest token via `auth:{ token }` |
| `@caido/sdk-backend` | 0.57.1 | Types only | Version-match the target build |
| `@caido/quickjs-types` | 0.26.0 | Runtime types | Caido's docs name it the source of truth — **but it under-declares globals by ~13×.** Types for editing; enumeration for facts |

### Supporting (spike payloads)

| Library | Version | Purpose | When |
|---|---|---|---|
| `meriyah` | 7.3.2 | AST parse under measurement | SPIKE-06 |
| `acorn` | 8.18.0 | Fallback parser + `tokenizer()` low-memory path | SPIKE-06 |
| `re2js` | 2.8.6 | Linear-time regex escape hatch | SPIKE-01 |
| `@jridgewell/sourcemap-codec` | 1.5.5 | VLQ decode cost | SPIKE-06 (optional) |
| `playwright` | current | 304s and realistic browsing | SPIKE-05/-11, SPIKE-10 scripted mode |

### Alternatives considered

| Instead of | Could use | Trade-off |
|---|---|---|
| Raw-zip Tier-0 probe | Always `caido-dev build` | ~10× slower iteration and it bundles what you did not intend to measure. Use Tier-1 only where the build is under test |
| GraphQL multipart install | devtools + `caido-dev watch` | Fine for the ten non-destructive spikes; **cannot recover a hung runtime** (proven). Not a foundation to build the harness on |
| Isolated `--data-path` instance | Docker `caido/caido:0.57.1` | amd64 emulation on this M4 Pro invalidates every CPU number. Defer Docker to Phase 6 |
| `ps -o rss` sampling | `vmmap` / `footprint` | Finer, macOS-only, and breaks the Phase 6 Linux matrix. Escalate only if RSS is ambiguous |
| Local corpus origin | Public CDN through the proxy | Network variance and rate limits destroy reproducibility |
| Pinned Playwright site list | HAR replay | A HAR is a client-side record with caching already resolved and bodies truncated; replaying it does not traverse the code path under test |

**Installation:**

```bash
pnpm add -D @caido-community/dev@0.1.7 @caido/sdk-backend@0.57.1 @caido/quickjs-types@0.26.0
pnpm add -D @caido/sdk-client@0.5.0        # headless driver
pnpm add    meriyah@7.3.2 acorn@8.18.0 re2js@2.8.6 @jridgewell/sourcemap-codec@1.5.5   # SPIKE-01/-06 payloads only
```

---

## Package Legitimacy Audit

`slopcheck 0.6.1`, run with `--ecosystem npm` explicitly. Note the first run auto-detected **PyPI** and reported all seven scoped/JS packages as `[SLOP]` — a textbook cross-ecosystem false positive. **Always force the ecosystem.**

| Package | Registry | First published | Downloads/wk | Source repo | slopcheck | postinstall | Disposition |
|---|---|---|---:|---|---|---|---|
| `@caido/sdk-client` | npm | 2026-02-09 | 4,212 | github.com/caido/sdk-js | `[OK]` | none | Approved |
| `@caido/sdk-backend` | npm | 2024-06-28 | 317 | github.com/caido/sdk-js | `[OK]` | none | Approved |
| `@caido/quickjs-types` | npm | 2024-08-03 | 292 | github.com/caido/sdk-js | `[OK]` | none | Approved |
| `@caido-community/dev` | npm | 2025-01-03 | 162 | github.com/caido-community/dev | `[OK]` | none | Approved |
| `meriyah` | npm | 2019-04-08 | 10,262,046 | github.com/meriyah/meriyah | `[OK]` | none | Approved |
| `acorn` | npm | 2012-09-24 | 209,258,612 | github.com/acornjs/acorn | `[SUS]`¹ | none | Approved |
| `re2js` | npm | 2023-07-14 | 4,542,332 | *(none linked)*² | `[OK]` | none | Approved |
| `@jridgewell/sourcemap-codec` | npm | 2022-02-05 | 171,709,831 | github.com/jridgewell/sourcemaps | `[OK]` | none | Approved |

¹ `acorn` was flagged *"suspiciously close to 'cors'"* — a heuristic false positive. 209 M weekly downloads, 14 years old, canonical ESTree parser, already a transitive dependency of most of the toolchain. Approved with the flag recorded.

² **CORRECTED 2026-08-20 at the Task 0 gate — this footnote was wrong.** `re2js` *does* publish a repository field: `"repository": "github:le0pard/re2js"`, in npm's shorthand string form rather than the `{type, url}` object form. Tooling that reads `repository.url` sees a string and reports the field as absent. Homepage `https://github.com/le0pard/re2js#readme` agrees, maintainer is `leopard_me`, and its published `scripts` are build/test/lint only — nothing that runs on consumer install. **There is no provenance gap.** 4.5 M weekly downloads. **Not a blocker for SPIKE-01, where it is a measurement subject rather than shipped code** — if SPIKE-01 recommends shipping it, Phase 3 should re-audit as normal — but not for a provenance gap, which does not exist.

**Removed for `[SLOP]`:** none. **Flagged `[SUS]`:** `acorn` (heuristic false positive, no checkpoint needed).

### Addendum — the four `[ASSUMED]` harness packages, audited against the npm registry (2026-08-20)

The planner marked plan `00-01` non-autonomous because these four were absent from the table above. Queried directly; all four are canonical and clean:

| Package | Created | Weekly downloads | Repository | Verdict |
|---|---|---:|---|---|
| `vitest` | 2021-12-03 | 77,728,812 | github.com/vitest-dev/vitest | Approved |
| `ajv` | 2015-05-29 | **312,868,386** | github.com/ajv-validator/ajv | Approved |
| `ajv-formats` | 2020-01-14 | 104,639,294 | github.com/ajv-validator/ajv-formats | Approved |
| `playwright` | 2015-01-23 | 70,082,199 | github.com/microsoft/playwright | Approved |

Every one publishes a `repository.url` resolving to its canonical GitHub organisation, and all four are long-established with very high volume. Together with `acorn`'s flag being a known heuristic false positive (*"suspiciously close to 'cors'"*), **no package in Phase 0 is genuinely suspicious.** The `00-01` checkpoint remains a policy gate rather than a risk gate — approve it with this table in hand.

The four `@caido/*` and `@caido-community/*` packages have low download counts because they are a niche developer toolchain. All four are named in Caido's official documentation and all resolve to Caido-owned GitHub organisations, so low volume is expected rather than suspicious.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Getting a probe into Caido | Screen-driving the UI, or copying files into `<data-path>/plugins/` | `installPluginPackage` GraphQL mutation | Direct file copy skips registration in `plugins.db`; the plugin will not load |
| Authenticating the driver | Anything involving the Caido Dashboard | `loginAsGuest` + `auth:{ token }` | One mutation, zero setup, no account, no cloud |
| Calling probe functions | A frontend plugin with a button | `POST /plugin/backend/<uuid>/function` | No browser, no Vue, no PrimeVue, 1.3 ms round-trip |
| Timing inside the runtime | `Date.now()` deltas | `performance.now()` | 1 µs vs 1 ms resolution; the chunk budget lives at 25 ms |
| Measuring heap inside the runtime | A JS object-graph walker | **Nothing works — sample RSS externally** | No introspection API exists. A JS walker would perturb the heap it measures and is anyway prohibited by DET-07 |
| Correlating inside/outside timelines | Clock-offset estimation | `Date.now()` in `sdk.console.log()` + host log timestamp | Measured agreement 0.26 ms. The host already writes µs timestamps |
| Parsing Caido logs | Scraping coloured stdout | `<data-path>/logs/logging.<date>.log` | Plain text, no ANSI, structured spans carrying the plugin UUID |
| Pinning the corpus | "grab a big JS file" | Immutable jsDelivr paths + SHA-256 gate | CI must fail closed when an artifact changes |
| Making an 8 MB fixture | Self-concatenating one bundle 5× | Concatenating two **distinct** bundles | Self-concatenation gives an unrepresentatively small distinct-literal set and flatters both the prefilter and the cache |
| Generating 304s | Hand-crafting `If-None-Match` with curl | Playwright with a real HTTP cache | A 304 is a *cache* behaviour; a scripted conditional request is not the same event |
| Recovering a hung instance | Retry loops on `togglePlugin` / reinstall | `kill -9` | Proven: every plugin-lifecycle operation blocks behind the QuickJS thread |
| Recording results | A markdown table | JSON + schema + CI assertion | Twelve numbers gate eleven downstream phases. Prose rots silently |

**Key insight:** almost every mechanical problem in this phase already has an official, scriptable answer in the Caido GraphQL/REST API or the client SDK. The one genuine gap — memory introspection — has *no* in-runtime answer, and pretending otherwise is the single largest methodological risk in Phase 0.

---

## Common Pitfalls

### Pitfall 1: Measuring the wrong binary
**What goes wrong:** `caido-cli` on `PATH` is **0.55.3**; the operator runs **0.57.1**. Numbers are recorded for a build nobody uses.
**Why it happens:** two binaries, and the stale one wins the `PATH` lookup.
**How to avoid:** absolute path to `/Applications/Caido.app/Contents/Resources/bin/caido-cli`, plus a hard version assertion before any measurement (gate 1 in `instance.sh`). Record `binary.reported_version` in every result file.
**Warning sign:** a result file whose `reported_version` differs from `expected_version`, or is absent.

### Pitfall 2: Fixed-iteration timing loops that finish too fast to observe the effect
**What goes wrong:** a 50-iteration yield test completed in 0.355 ms — shorter than one 4 ms timer period — and reported "`setImmediate` starves timers" for the wrong reason, while also under-measuring `setTimeout0`. The conclusion happened to be right; the evidence was not.
**Why it happens:** iteration counts are the intuitive control, but the phenomenon is time-based.
**How to avoid:** every event-loop experiment runs for a **fixed wall-clock window** and reports both the count observed and the count theoretically possible.
**Warning sign:** `duration_ms` smaller than a few times the timer period under test.

### Pitfall 3: Treating RSS as a live heap gauge
**What goes wrong:** "memory did not drop after release, therefore we leak." RSS never drops in this runtime, leak or not.
**Why it happens:** the mental model comes from `process.memoryUsage().heapUsed`, which does not exist here.
**How to avoid:** measure *step deltas* from markers, use a fresh instance per size point, and assert leak-freedom as "per-artifact delta converges to zero across repetitions" rather than "total RSS is flat."
**Warning sign:** any assertion of the form `expect(rssAfter).toBeLessThanOrEqual(rssBefore)`.

### Pitfall 4: Running SPIKE-04's three variants in one runtime
**What goes wrong:** `#2211` leaks cumulatively across the runtime lifetime, so variants 2 and 3 inherit variant 1's leaked references and their cliffs are fiction.
**Why it happens:** the ROADMAP sketch reads as one continuous loop.
**How to avoid:** one fresh instance per variant. Record `instance.fresh: true` and the exit code in each result file.
**Warning sign:** two SPIKE-04 result files sharing a `run_id`.

### Pitfall 5: Expecting the `gc_decref_child` assertion in the structured log
**What goes wrong:** the crash evidence is looked for in `logging.<date>.log`, is absent, and the crash is recorded as "process vanished."
**Why it happens:** it is a C-level `abort()` on **stderr**, not a `tracing` event, and `panic = "abort"` means no unwinding.
**How to avoid:** redirect stderr to its own file, always capture the exit code (SIGABRT = 134), and rely on the probe's own write-ahead journal for the last-known state.
**Warning sign:** a SPIKE-04 result with `status: "fail"` and no `exit_code`.

### Pitfall 6: Building the harness on devtools hot reload
**What goes wrong:** SPIKE-01 hangs, hot reload stops working, and the harness has no recovery path.
**Why it happens:** hot reload is genuinely excellent for the other ten spikes, so it looks like the right foundation.
**How to avoid:** the harness is `instance.sh` + zip + `installPluginPackage`. Hot reload is a convenience layered on top, never a dependency.
**Warning sign:** a plan step that says "reconnect devtools and retry."

### Pitfall 7: Assuming the guest can do everything
**What goes wrong:** a spike needs a persistent project, `createProject(temporary:false)` returns `PermissionDeniedUserError`, and the spike silently measures the temporary-project case instead.
**Why it happens:** guest mode is otherwise so complete that the entitlement boundary is invisible until crossed.
**How to avoid:** any spike touching project persistence declares whether it needs a persistent project; if so, authenticate that instance with a PAT.
**Warning sign:** an unchecked `error` field in a `createProject` response.

### Pitfall 8: Trusting `@caido/quickjs-types` as the capability list
**What goes wrong:** the probe checks the ~6 declared globals, misses `performance` entirely, and concludes there is no in-runtime clock.
**Why it happens:** Caido's own docs call the package the source of truth. For *types* it is; for *presence* it is not.
**How to avoid:** `Object.getOwnPropertyNames(globalThis)` plus `typeof` probes plus dynamic `import()` attempts for every candidate module.
**Warning sign:** a capability table with fewer than ~80 globals.

---

## Code Examples

### Complete headless probe cycle — bash only, no Node

```bash
#!/usr/bin/env bash
set -euo pipefail
source scripts/spike/instance.sh          # exports RUN_ID, PORT, CAIDO_PID, OUT
URL="http://127.0.0.1:$PORT"
TOKEN="$(cat "$OUT/$RUN_ID/token")"

# 1) build the Tier-0 probe
( cd probe && rm -f ../probe.zip && zip -qr ../probe.zip . )

# 2) install (unsigned; force allows reinstall at the same version)
OPS='{"query":"mutation I($f: Upload){ installPluginPackage(input:{source:{file:$f},force:true}){ package{ id manifestId plugins{ __typename ... on PluginBackend{ id enabled } } } error{ __typename } } }","variables":{"f":null}}'
INSTALL="$(curl -s -X POST "$URL/graphql" -H "Authorization: Bearer $TOKEN" \
  -F "operations=$OPS" -F 'map={"0":["variables.f"]}' -F '0=@probe.zip;type=application/zip')"
echo "$INSTALL" > "$OUT/$RUN_ID/install.json"

BACKEND_ID="$(python3 - "$INSTALL" <<'PY'
import json,sys
d=json.loads(sys.argv[1])["data"]["installPluginPackage"]
assert d["error"] is None, d["error"]
print(next(p["id"] for p in d["package"]["plugins"] if p["__typename"]=="PluginBackend"))
PY
)"

# 3) start the external RSS sampler
scripts/spike/rss-sampler.sh "$CAIDO_PID" "$OUT/$RUN_ID/rss.csv" 0.05 &
SAMPLER=$!

# 4) call a probe function
curl -s -X POST "$URL/plugin/backend/$BACKEND_ID/function" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"capabilities","args":[]}' \
  | python3 -c 'import json,sys; print(json.dumps(json.loads(json.load(sys.stdin)["returns"]), indent=1))' \
  | tee "$OUT/$RUN_ID/raw/capabilities.json"

# 5) teardown — SIGKILL, always
kill "$SAMPLER" 2>/dev/null || true
kill -9 "$CAIDO_PID" 2>/dev/null || true
wait "$CAIDO_PID" 2>/dev/null; echo "caido exit=$?"     # 134 == SIGABRT
cp "$OUT/$RUN_ID"/../../../tmp/defminer-probe-$RUN_ID/logs/*.log "$OUT/$RUN_ID/" 2>/dev/null || true
```

### Capability probe — enumerate, never assume

```js
// Source: verified against Caido 0.57.1 on 2026-08-20
async function capabilities(sdk) {
  const typeofs = {};
  for (const n of ["WebAssembly","structuredClone","performance","queueMicrotask",
                   "setImmediate","TextDecoder","TextEncoder","atob","URL",
                   "Atomics","WeakRef","Worker","crypto","Buffer"]) {
    typeofs[n] = typeof globalThis[n];
  }

  const modules = {};
  for (const spec of ["llrt:qjs","qjs","perf_hooks","process","os","path","fs",
                      "sqlite","caido:http","caido:crypto","buffer","url"]) {
    try { modules[spec] = Object.keys(await import(spec)); }
    catch (e) { modules[spec] = "ERR: " + String(e).slice(0, 120); }
  }

  let stackDepth = -1, stackError = null;
  try { (function d(n){ stackDepth = n; return d(n + 1); })(0); }
  catch (e) { stackError = e.constructor.name; }

  // performance.now() resolution — the smallest observable non-zero delta
  let minDelta = Infinity;
  if (typeof performance?.now === "function") {
    let last = performance.now();
    for (let i = 0; i < 200000; i++) {
      const n = performance.now();
      if (n !== last) { minDelta = Math.min(minDelta, n - last); last = n; }
    }
  }

  return {
    caidoVersion: String(sdk.runtime.version),
    globals: Object.getOwnPropertyNames(globalThis).sort(),
    typeofs, modules,
    stackDepth, stackError,
    clock: { minDelta_ms: minDelta === Infinity ? null : minDelta,
             timeOrigin: performance?.timeOrigin ?? null, dateNow: Date.now() }
  };
}
```

### Instrumented measurement with external correlation

```js
// Source: verified. Host log agreement measured at 0.26 ms.
function measured(sdk, label, fn) {
  sdk.console.log(`MARK_START ${label} date=${Date.now()} qjs=${performance.now().toFixed(3)}`);
  const t0 = performance.now();
  let ok = true, err = null, out = null;
  try { out = fn(); } catch (e) { ok = false; err = String(e).slice(0, 300); }
  const elapsed = performance.now() - t0;
  sdk.console.log(`MARK_END ${label} elapsed_ms=${elapsed.toFixed(3)} ok=${ok} date=${Date.now()}`);
  return { label, elapsed_ms: elapsed, ok, err, out };
}
```

### Fixed-duration yield experiment (the corrected form)

```js
// Source: verified. Reports both observed AND theoretically-possible tick counts,
// so a run too short to observe the effect is self-evidently invalid.
async function yieldExperiment(sdk, durationMs, syncSliceMs, yielder) {
  let ticks = 0;
  const iv = setInterval(() => { ticks++; }, 4);
  const t0 = performance.now();
  let yields = 0;
  while (performance.now() - t0 < durationMs) {
    const w0 = performance.now();
    while (performance.now() - w0 < syncSliceMs) { /* representative sync work */ }
    await yielder();
    yields++;
  }
  clearInterval(iv);
  const total = performance.now() - t0;
  const possible = Math.floor(total / 4);
  return { duration_ms: total, yields, timer_ticks: ticks,
           expected_ticks_if_free: possible,
           timer_service_ratio: ticks / Math.max(1, possible),
           valid: possible >= 20 };   // guard against Pitfall 2
}
```

---

## State of the Art

| Old assumption (from prior research) | Measured reality on Caido 0.57.1 | Impact |
|---|---|---|
| `structuredClone` presence "MEDIUM confidence, spike required" | **Absent.** Confirmed | SPIKE-07 resolved; meriyah polyfill guard is unconditional |
| `Atomics` undefined (bare quickjs-ng probe) | **Present** (as is `SharedArrayBuffer`) | Prior finding was wrong for Caido. Moot without `Worker`, but shows bare-qjs probes do not generalise |
| Yield via `await new Promise(r => setTimeout(r, 0))` | Works, and costs **5.7 ms** each | Yield trigger must be temporal, not per-chunk. See CORE-06 note |
| `setImmediate` as a cheaper yield | **Does not yield to timers at all** | Not a substitute. Would have silently starved RPC and timers |
| "Measure memory inside Caido" (ROADMAP criterion 5) | **Impossible — no API exists** | Criterion must be reworded; external RSS is the only method |
| Target version 0.55.3 | Operator runs **0.57.1**, which is also the latest release | SPIKE-04 is a direct reproduction of `#2211`, not an extrapolation |
| Plugin package must be signed | Unsigned zips install fine locally | Signing is a store-distribution concern only (DIST-07) |
| Probing needs the devtools plugin | Fully scriptable over GraphQL/REST | No browser, no frontend plugin, no manual steps |

**Deprecated for this phase:**
- Bare `caido-cli` from `PATH` — resolves to 0.55.3 here.
- `echarts×5` as the large-corpus fixture — replaced by two distinct bundles.
- Iteration-count-based event-loop experiments — replaced by fixed-duration windows.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| `caido-cli` 0.57.1 (app-bundled) | Every spike | ✓ | 0.57.1 | none needed |
| `caido-cli` 0.55.3 (`~/.caido`) | — | ✓ | 0.55.3 | **Actively harmful — assert against it** |
| Node.js | Driver, Playwright | ✓ | v26.7.0 | curl-only path exists |
| pnpm | Tier-1 probe build | ✓ | 11.22.0 | npm |
| Python 3 | Sampler, corpus origin, JSON handling | ✓ | 3.14.7 | — |
| `zip` | Tier-0 probe packaging | ✓ | system | `caido-dev build` |
| `curl` | Load generation, API | ✓ | system | — |
| `jq` | Result post-processing | ✓ | present | python3 |
| `shasum` | Corpus + binary hashing | ✓ | system | — |
| `lsof` | Port-collision gate | ✓ | system | `nc -z` |
| `slopcheck` | Package legitimacy | ✓ | 0.6.1 | — |
| Playwright + Chromium | SPIKE-05/-11 (304s), SPIKE-10 scripted | ✗ | — | `pnpm dlx playwright install chromium` |
| Docker | Phase 6, not Phase 0 | ✗ (installed, daemon stopped) | — | Not needed this phase |
| `hey` / `wrk` | Load generation | ✗ | — | `xargs -P` measured at 710 req/s — sufficient |
| Caido PAT | Persistent-project spikes only | ✓ (`~/.caido/pat.env`) | — | Guest mode covers temporary projects |

**Missing with no fallback:** none.
**Missing with fallback:** Playwright (one install command); `hey`/`wrk` (`xargs -P` is adequate).

Host reference for every measurement recorded in this phase: **Apple M4 Pro, 14 cores, 24 GB, macOS 26.6.1 (25G76)**.

---

## Validation Architecture

### Test framework

| Property | Value |
|---|---|
| Framework | vitest 4.1.11 (per `STACK.md`; not yet installed — repo has no `package.json`) |
| Config file | none — **Wave 0** |
| Quick run command | `pnpm vitest run --reporter=dot` |
| Full suite command | `pnpm validate` (typecheck && lint && knip && test) |

Phase 0's primary output is measurements, not shipped code — so most SPIKE requirements are verified by **artifact assertions** (does a schema-valid result file exist with a non-null threshold?) rather than unit tests. The scripts themselves are shell and are verified by execution.

### Phase requirements → test map

| Req ID | Behavior | Test type | Automated command | Exists? |
|---|---|---|---|---|
| SPIKE-01 | ReDoS hang recorded; `re2js` cost measured | artifact | `pnpm vitest run tests/spike-results.spec.ts -t SPIKE-01` | ❌ Wave 0 |
| SPIKE-02 | Yield primitive + cost recorded | artifact | `… -t SPIKE-02` | ❌ Wave 0 |
| SPIKE-03 | Delivered-event count under a blocked handler | artifact | `… -t SPIKE-03` | ❌ Wave 0 |
| SPIKE-04 | Cliff per variant, 3 fresh instances, exit codes | artifact | `… -t SPIKE-04` | ❌ Wave 0 |
| SPIKE-05 | Event matrix complete across all surfaces × flags | artifact | `… -t SPIKE-05` | ❌ Wave 0 |
| SPIKE-06 | Time + RSS at 4 sizes; stack break located | artifact | `… -t SPIKE-06` | ❌ Wave 0 |
| SPIKE-07 | Capability probe; `structuredClone` answered | artifact | `… -t SPIKE-07` | ❌ Wave 0 |
| SPIKE-08 | `Body.length` vs `toRaw().length` per encoding | artifact | `… -t SPIKE-08` | ❌ Wave 0 |
| SPIKE-09 | `PRAGMA`/transaction survival across `exec` | artifact | `… -t SPIKE-09` | ❌ Wave 0 |
| SPIKE-10 | Three cache hit rates from ≥3 distinct days | artifact | `… -t SPIKE-10` | ❌ Wave 0 |
| SPIKE-11 | 304/cached delivery recorded | artifact | `… -t SPIKE-11` | ❌ Wave 0 |
| SPIKE-12 | `llrt/fs` containment behaviour recorded | unit + artifact | `… -t SPIKE-12` | ❌ Wave 0 |
| *(cross-cutting)* | Every result validates against the schema | unit | `pnpm vitest run tests/schema.spec.ts` | ❌ Wave 0 |
| *(cross-cutting)* | No threshold left `PENDING` at phase exit | unit | `pnpm vitest run tests/go-no-go.spec.ts` | ❌ Wave 0 |

### Sampling rate

- **Per task commit:** `pnpm vitest run tests/schema.spec.ts --reporter=dot` (schema validity only — fast)
- **Per wave merge:** `pnpm vitest run` (all artifact assertions for spikes completed so far)
- **Phase gate:** full suite green **and** `go-no-go.json` contains zero `PENDING` thresholds

### Wave 0 gaps

- [ ] `package.json` + `pnpm-workspace.yaml` — the repo currently has no Node project at all
- [ ] `vitest.config.ts`
- [ ] `.planning/phases/00-runtime-reality-check/results/spike-result.schema.json`
- [ ] `.planning/phases/00-runtime-reality-check/results/go-no-go.schema.json`
- [ ] `tests/schema.spec.ts` — ajv validation of every result file
- [ ] `tests/spike-results.spec.ts` — per-spike presence + non-null threshold assertions
- [ ] `tests/go-no-go.spec.ts` — no `PENDING`, and `binary.reported_version === "0.57.1"` everywhere
- [ ] `scripts/spike/{instance,rss-sampler,fetch-corpus,origin}.sh`
- [ ] Playwright + Chromium install

---

## Security Domain

`security_enforcement: true`, ASVS level 1. Phase 0 ships no product code, but it does execute deliberately hostile input and handle credentials.

### Applicable ASVS categories

| ASVS Category | Applies | Standard control |
|---|---|---|
| V2 Authentication | yes | Guest tokens are ephemeral and per-instance. A PAT, if used, comes from `process.env`/`~/.caido/pat.env` and is **never** written into a result file or log |
| V3 Session Management | yes | The guest token lives in `$OUT/$RUN_ID/token`, mode `0600`, deleted at teardown. `.gitignore` `results/*/token` |
| V4 Access Control | yes | `--allow-guests` prints `DANGER: Unauthenticated guests allowed to connect` for a reason. Bind `127.0.0.1` only; never `0.0.0.0` |
| V5 Input Validation | yes | Corpus artifacts are third-party JavaScript. They are **parsed and pattern-matched, never evaluated.** `eval` and `new Function` appear nowhere in any probe |
| V6 Cryptography | yes | SHA-256 via `shasum` for corpus and binary integrity. No hand-rolled hashing |
| V7 Error Handling & Logging | yes | Probe logs go to a disposable data path. No target traffic, no credentials, no secret material in any result artifact |
| V12 File Resources | yes | SPIKE-12 deliberately exercises path traversal against `llrt/fs`. Confine it to the disposable instance's data path; the ceiling is the host filesystem, so treat it as untrusted-code execution |

### Known threat patterns for this phase

| Pattern | STRIDE | Mitigation |
|---|---|---|
| Guest-enabled instance reachable off-host | Elevation of Privilege | `--listen 127.0.0.1:<port>` only; refuse `0.0.0.0`; assert the port before binding |
| Probe zip installs unsigned code into Caido | Tampering | Acceptable *only* on the disposable instance. Never install a probe into the operator's Caido |
| Corpus artifact silently changes upstream | Tampering | SHA-256 gate in `fetch-corpus.sh`, failing closed |
| Catastrophic regex denies service | Denial of Service | Confined to the disposable instance; `SIGKILL` teardown; never run against the operator's Caido |
| SPIKE-12 path traversal escapes the data path | Tampering | Run last, on a fresh instance, on a scratch data path, and verify nothing was written outside it before teardown |
| PAT leaks into a committed result file | Information Disclosure | Result schema has no credential field; `.gitignore` `results/*/token`; grep results for `caido_` before commit |
| Cross-ecosystem package confusion | Spoofing | Force `slopcheck --ecosystem npm` (the default PyPI detection produced seven false `[SLOP]` verdicts here) |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | `--safe` disables backend plugins *by design* rather than as a side effect of state left by an earlier toggle | Q2 | Low. The A/B was run on the same data path back-to-back and the `Starting plugin` line is present without the flag and absent with it. If wrong, `--safe` becomes a usable probing flag — no harm either way |
| A2 | The `gc_decref_child` assertion reaches **stderr** and not the structured log | Q2 | Medium. Not directly observed (that would require reproducing #2211). Based on `panic = "abort"`, C-level `assert()` semantics, and the absence of any such string in the tracing subscriber. **Mitigation: capture stderr AND stdout AND the file log — cost is zero** |
| A3 | Playwright is required to produce genuine 304s | Q4 | Low. A hand-built conditional request can produce a 304 *response*, but not the browser-cache *decision path* SPIKE-11 is about |
| A4 | `caido/caido:0.57.1` Docker is amd64-only and would need emulation here | Q2 | Low, and Phase 0 does not use Docker regardless. Phase 6 must verify |
| A5 | Toggling a plugin off/on may reset the #2211 refcount leak | Q7 | Unknown — explicitly listed as a *test to add*, not a finding. Based on the `plugin\|executor: Stopping plugin executor` log line implying a per-plugin runtime |
| A6 | vitest 4.1.11 is the test framework | Validation Architecture | Low. Taken from `STACK.md`; the repo has no `package.json` yet, so nothing is installed |
| A7 | `re2js`'s source is `github.com/le0pard/re2js` | Package audit | Low. npm publishes no `repository.url`; the attribution comes from `PITFALLS.md`. Re-verify before shipping it in Phase 3 |
| A8 | Real AST-walk frames consume materially more stack than the 1-arg probe frame that reached 1,021 | Verified Facts | Low. Standard for any parser with locals and arguments per frame, but the actual number is SPIKE-06's job |

Everything not listed here was executed on this machine on 2026-08-20 and is `[VERIFIED]`.

---

## Open Questions

1. **Does restarting the plugin reset the `#2211` refcount leak?**
   - Known: the host logs a per-plugin executor lifecycle (`Stopping plugin executor` / `Starting plugin`), so a per-plugin QuickJS runtime is plausible.
   - Unclear: whether the leaked host `Request`/`Response` refcounts live in the plugin runtime or the host.
   - Recommendation: add a ~10-minute test to SPIKE-04 — send to just below the cliff, toggle the plugin off and on, resume sending, observe whether the cliff resets. If it does, ACTIVE-13 gains a far cheaper recovery than "restart Caido," and the `.map`-probing default becomes materially safer.

2. **Does `sdk.meta.db()` survive a plugin reinstall?**
   - Known: the plugin's `data.db` lives at `<data-path>/plugins/<uuid>/data.db`, and the UUID is stable across `force:true` reinstalls (verified — five reinstalls kept `01489616-…`).
   - Unclear: whether uninstall/reinstall (as opposed to force-reinstall) allocates a new UUID and therefore a new database.
   - Recommendation: fold into SPIKE-09. It is a direct precondition for UPGRADE-01/-04 and is nearly free to answer here.

3. **What is the effective recursion depth for a realistic parser frame?**
   - Known: 1,021 frames for a trivial 1-argument function, thrown as a catchable `RangeError`.
   - Unclear: whether meriyah's larger frames still throw catchably at 512 KiB, or whether they can cross a guard page and `SIGSEGV` as prior research observed at larger stack sizes in bare quickjs-ng.
   - Recommendation: SPIKE-06 must measure with the *actual parser*, not a synthetic recursion, and must record whether the failure is catchable. "It throws" and "it segfaults" produce completely different designs for MAP-05 and QUAL-05.

4. **Is `TextDecoder` reachable at all?**
   - Known: `typeof TextDecoder === "undefined"` as a global; the docs' module table marks `buffer` and `url` as providing globals, yet no decoder appears.
   - Unclear: which module exports it, if any.
   - Recommendation: the capability probe already attempts `import()` on every module; extend it to enumerate every export of `buffer`, `string_decoder`, and `url`. ENC-01 and ENC-02 depend on the answer.

5. **How many distinct days of browsing does SPIKE-10 actually need?**
   - Known: the number that matters is the cross-day rate; a single session cannot produce it.
   - Unclear: whether three days is enough for a stable estimate.
   - Recommendation: start the recorder on day one, compute the rate daily, and stop when the day-over-day change falls below a stated tolerance — reporting the number of days it took as part of the result.

---

## Sources

### Primary (HIGH — executed or read on this machine, 2026-08-20)

- Live Caido 0.57.1 disposable instance — capability probe, clock resolution, yield experiments, memory-introspection probes, RSS correlation, ReDoS escalation, hang-recovery behaviour, plugin install/toggle/reinstall lifecycle, proxy load test
- `/Applications/Caido.app/Contents/Resources/bin/caido-cli --help`, `--version`, `Info.plist` — flags and version
- `<data-path>/logs/logging.2026-08-20.log` — host log format, span structure, timestamp correlation
- `@caido/quickjs-types@0.26.0` (npm tarball) — declared runtime type surface; `extra/timers.d.ts` documents the ≥4 ms `setTimeout` clamp and `setImmediate`
- `@caido-community/dev` source — `src/types.ts` (config zod schema), `src/build/backend.ts` (exact tsup config), `src/commands/watch.ts` (hot-reload protocol), `src/bundle/index.ts` (unsigned JSZip packaging)
- LLRT source (`llrt_core/src/modules/llrt/qjs.rs`, `modules/llrt_perf_hooks/`) — what upstream provides vs. what Caido compiles in
- `strings` analysis of both `caido-cli` binaries — absence of `llrt:qjs`/`ComputeMemoryUsage`, presence of `performance`/`timeOrigin` in the QuickJS atom table
- jsDelivr — corpus artifacts downloaded and SHA-256 verified
- `slopcheck 0.6.1` + npm registry — package legitimacy, download counts, postinstall audit

### Secondary (HIGH — official documentation)

- developer.caido.io (full corpus) — manifest reference, plugin architecture, backend SDK, client SDK guides (`install_plugin`, `function_call`, `auth`, `base_setup`), QuickJS module table
- `api.caido.io/releases/latest` + GitHub `caido/caido` releases + Docker Hub `caido/caido` tags — **0.57.1 is the latest release**, published 2026-07-10
- docs.caido.io Docker guide — image, data path `/home/caido/.local/share/caido`, uid/gid 999

### Tertiary (MEDIUM — fetched summaries)

- `github.com/caido/caido/issues/2211` — open, unfixed, filed against 0.57.1; thresholds ~54 clean / ~80 stall / ~120 abort; `gc_decref_child` assertion
- `github.com/caido-community/devtools` README — connect flow; documents no behaviour under a hung backend (the gap this research closed by measurement)

### Project inputs (not re-derived)

- `.planning/research/{SUMMARY,STACK,PITFALLS,ARCHITECTURE,CODEX-CONTRAST,CODEX-REVIEW-01}.md`
- `.planning/{REQUIREMENTS,ROADMAP,STATE}.md`

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| Disposable instance & isolation | **HIGH** | Launched, driven, hung, killed, and compared against the primary. CA fingerprints differ; primary untouched |
| Probe plugin mechanics | **HIGH** | Built, installed unsigned, called, reinstalled, and force-reloaded end to end |
| Memory measurement | **HIGH** | Negative result confirmed three ways (dynamic `import()`, property enumeration, binary string analysis); external technique validated with a 1.02–1.06× attribution ratio |
| Yield primitives | **HIGH** | Fixed-duration experiment after correcting a fixed-iteration methodology flaw; four primitives compared against a blocking baseline |
| Hot-reload-under-hang | **HIGH** | Directly measured with a 25 s host-log timeline |
| Corpus | **HIGH** | Every artifact downloaded, byte-counted, and SHA-256'd |
| Load generation | **HIGH** | 500 requests at 710 req/s; all 500 events delivered |
| Results schema | **MEDIUM** | A design proposal, not a measurement. Sound but unexercised until plan 00-01 |
| Ordering critique | **HIGH** | Every claimed defect traces to a measured constraint. The numbering collision was verified line by line across both documents |
| Docker | **MEDIUM** | Tags and paths verified against Docker Hub and docs; not run (daemon stopped, and out of scope for Phase 0) |

**Research date:** 2026-08-20
**Valid until:** 2026-09-19 (30 days) — or immediately on any Caido release after 0.57.1, which would invalidate every version-pinned measurement and reopen the `#2211` fix question.
