#!/usr/bin/env bash
# scripts/phase1/spa-load.sh — CORE-10, measured from OUTSIDE the plugin, plus
# the live half of success criterion 4.
#
# THE QUESTION, IN WORDS
# ----------------------
# Under a synthetic 200-chunk SPA load through a real Caido 0.57.1: what is the
# largest synchronous stretch the plugin actually took on the one thread, does
# its own RPC keep answering an external caller throughout, and do the artifacts
# it wrote survive the host being killed and brought back?
#
# WHY THE PROBE IS EXTERNAL
# -------------------------
# A starved thread cannot report that it is starved. This runtime exposes no
# scheduler or memory introspection at all — `perf_hooks`, `process` and
# `llrt:qjs` all fail to load — so an in-process responsiveness assertion would
# measure the instrument. The signal comes from a caller polling `getStatus` on a
# fixed interval from outside the QuickJS thread, with jitter in the observed
# response times as the evidence (Pitfall 8, decision P5-D3).
#
# WHY A BASELINE RUNS FIRST
# -------------------------
# The identical prober, on the identical instance, against an idle handler,
# BEFORE any load. Without it a loaded latency number has nothing to be compared
# against on THIS machine — and the comparison, not the absolute figure, is the
# claim. `scripts/spike/block-load.sh` establishes the same discipline.
#
# WHAT IS REUSED RATHER THAN REINVENTED
# -------------------------------------
# `scripts/spike/instance.sh` (version-asserted isolated instance, always-SIGKILL
# teardown, port gates), `scripts/spike/probe-run.sh` (install + REST call),
# `scripts/spike/load.sh` (the request driver Phase 0 validated at 710 req/s) and
# `scripts/spike/origin.py`. The load driver must not change between the baseline
# and the loaded run or the comparison is meaningless, so it is not touched.
#
# Nothing here reads or writes `.spike/`, and nothing kills a process it did not
# start.
set -euo pipefail

cd "$(dirname "$0")/../.."

# shellcheck disable=SC1091
source scripts/phase1/env.sh

GO_NO_GO=".planning/phases/00-runtime-reality-check/results/go-no-go.json"
RESULT="$P1_OUT/spa-load.json"

# --- load parameters --------------------------------------------------------
CHUNKS=200
CONCURRENCY=20
# The prober's fixed interval. Fixed is the point: a variable interval makes a
# gap in the sample stream indistinguishable from the prober being slow.
PROBE_INTERVAL_S=0.2
BASELINE_WINDOW_S=12
# How far above the SAME-MACHINE baseline maximum the loaded maximum may sit.
# RECORDED IN THE ARTIFACT so the gate reads it as data — a literal in the spec
# would be a magic number nobody could re-derive.
RPC_TOLERANCE_MULTIPLE=10

# --- preflight: fail before touching anything -------------------------------
[ -x "$P1_CAIDO_BIN" ] || { echo "FATAL: $P1_CAIDO_BIN is not executable" >&2; exit 1; }
ACTUAL_VERSION="$("$P1_CAIDO_BIN" --version 2>/dev/null | awk '{print $2}')"
[ "$ACTUAL_VERSION" = "$P1_EXPECT_VERSION" ] || {
  echo "FATAL: expected Caido $P1_EXPECT_VERSION, got ${ACTUAL_VERSION:-<none>}" >&2; exit 1; }
python3 -c "import json,sys; json.load(open('$GO_NO_GO'))" || {
  echo "FATAL: $GO_NO_GO missing or unparseable" >&2; exit 1; }
command -v sqlite3 >/dev/null 2>&1 || { echo "FATAL: sqlite3 not on PATH" >&2; exit 1; }
for p in "$P1_CAIDO_PORT" "$P1_ORIGIN_PORT"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "FATAL: port $p is already in LISTEN state. Refusing to collide." >&2; exit 1
  fi
done

# --- the 200-chunk SPA ------------------------------------------------------
# DISTINCT PATHS AND DISTINCT BYTES. 200 requests for one body would be 199
# content-hash cache hits on one digest, which exercises CORE-08's skip and NOT
# the walk — the opposite of what this run is for.
#
# Generated here rather than taken from corpus/, which is gitignored: a
# measurement that only runs on a machine that has already fetched a corpus is
# not a measurement anybody else can reproduce.
FIXDIR="$(mktemp -d "${TMPDIR:-/tmp}/defminer-spa.XXXXXX")"
python3 - "$FIXDIR" "$CHUNKS" <<'PY'
import json, os, sys
outdir, n = sys.argv[1], int(sys.argv[2])
# A realistic SPA size mix: mostly small lazy-loaded route chunks, a middle band
# of feature bundles, a handful of large vendor bundles. Every size is DISTINCT,
# so every body is distinct and every digest is distinct.
sizes = []
for i in range(n):
    if i < 140:
        sizes.append(8_192 + i * 373)          #  8 KB ..  60 KB
    elif i < 190:
        sizes.append(65_536 + (i - 140) * 3_701)  # 64 KB .. 246 KB
    else:
        sizes.append(262_144 + (i - 190) * 61_000)  # 256 KB .. 805 KB
manifest = []
for i, size in enumerate(sizes, start=1):
    name = f"chunk-{i}.js"
    # Deterministic, per-chunk content. The leading comment differs per chunk, so
    # two chunks of coincidentally equal length would still hash differently.
    head = f"/* defminer spa chunk {i} of {n}, {size} bytes */\n".encode()
    seed = f"export function c{i}(a){{return a+{i};}};var p{i}=[1,2,3];".encode()
    body = head + (seed * (size // len(seed) + 1))
    body = body[:size]
    with open(os.path.join(outdir, name), "wb") as fh:
        fh.write(body)
    manifest.append({"path": "/" + name, "bytes": size})
with open(os.path.join(outdir, "_manifest.json"), "w") as fh:
    json.dump(manifest, fh)
print(f"generated {len(manifest)} chunks, {sum(sizes)} bytes total, "
      f"min {min(sizes)} max {max(sizes)}")
PY
CHUNK_BYTES_TOTAL="$(python3 -c '
import json,sys
m=json.load(open(sys.argv[1]))
print(sum(c["bytes"] for c in m))' "$FIXDIR/_manifest.json")"

# --- build ------------------------------------------------------------------
pnpm exec caido-dev build packages >/dev/null
[ -f packages/dist/plugin_package.zip ] || { echo "FATAL: build produced no zip" >&2; exit 1; }

# --- lifecycle --------------------------------------------------------------
# KEEP_DATA=1 and a FIXED data path, because the restart check deliberately keeps
# this directory alive across a teardown. It is ours, it is under the system temp
# directory, and it is removed by this script's own cleanup — never `.spike/` and
# never the operator's data path (T-01-28).
export DATA_PATH="${TMPDIR:-/tmp}/defminer-spa-load-data"
export KEEP_DATA=1
rm -rf "$DATA_PATH"

ORIGIN_PID=""
PROBE_PID=""
cleanup() {
  [ -n "$PROBE_PID" ] && kill "$PROBE_PID" 2>/dev/null || true
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  # ALWAYS instance.sh's own teardown — never a new kill. It force-kills (a
  # wedged QuickJS thread never honours SIGTERM), copies the host log out and
  # deletes the guest token.
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
  rm -rf "$FIXDIR" "$DATA_PATH"
}
trap cleanup EXIT

export EXPECT_VERSION="$P1_EXPECT_VERSION"
export CAIDO_BIN="$P1_CAIDO_BIN"
export PORT="$P1_CAIDO_PORT"
export OUT="$P1_OUT"
# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

BOOT1_RUN_ID="$RUN_ID"
BOOT1_RUN_DIR="$RUN_DIR"
CAIDO_URL="http://127.0.0.1:$PORT"
TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"
gql() {
  curl -s -X POST "$CAIDO_URL/graphql" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "$1"
}

# --- origin -----------------------------------------------------------------
python3 scripts/spike/origin.py --dir "$FIXDIR" --port "$P1_ORIGIN_PORT" \
  > "$RUN_DIR/origin-$P1_ORIGIN_PORT.log" 2>&1 &
ORIGIN_PID=$!
for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$P1_ORIGIN_PORT/_health" && break
  kill -0 "$ORIGIN_PID" 2>/dev/null || { echo "FATAL: origin died" >&2; exit 1; }
  sleep 0.25
done
curl -sf -o /dev/null "http://127.0.0.1:$P1_ORIGIN_PORT/_health" || {
  echo "FATAL: origin not ready on $P1_ORIGIN_PORT" >&2; exit 1; }

# --- project ----------------------------------------------------------------
# A fresh Caido has NO project, and with none selected the proxy answers
# "Proxying error: Internal" and onInterceptResponse NEVER FIRES. A guest may
# create TEMPORARY projects only — `temporary:false` returns
# PermissionDeniedUserError, verified against this build — which is exactly why
# the restart check below reads the plugin database from the filesystem rather
# than through getArtifacts: the project does not survive the restart, and the
# artifacts must anyway. That asymmetry IS the CORE-09 fact — `sdk.meta.db()` is
# one database for the plugin across every project and is not deleted when a
# project is.
PROJECT_ID="$(gql '{"query":"mutation{ createProject(input:{name:\"phase1-spa-load\",temporary:true}){ project{ id } error{ __typename } } }"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["createProject"]; sys.exit("createProject failed: "+str(d["error"])) if d["error"] else print(d["project"]["id"])')"
gql "{\"query\":\"mutation{ selectProject(id:\\\"$PROJECT_ID\\\"){ error{ __typename } } }\"}" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["selectProject"]; sys.exit("selectProject failed: "+str(d["error"])) if d["error"] else None'
echo "project selected: $PROJECT_ID (temporary)"

probe_install packages/dist/plugin_package
BOOT1_BACKEND_ID="$BACKEND_ID"

# --- the external prober ----------------------------------------------------
# curl reports its OWN round-trip time, so the measurement does not include the
# shell's or python's start-up cost. A wall-clock stamp goes with each sample so
# a GAP in the stream — the plugin going quiet and then answering in a burst — is
# visible to the human check, which a latency figure alone would hide.
probe_rpc() {   # $1 = flag file  $2 = output jsonl
  while [ -f "$1" ]; do
    printf '{"at":%s,' "$EPOCHREALTIME" >> "$2"
    curl -s -o /dev/null --max-time 30 \
      -w '"ms":%{time_total},"code":%{http_code}}\n' \
      -X POST "$CAIDO_URL/plugin/backend/$BACKEND_ID/function" \
      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      -d '{"name":"getStatus","args":[]}' >> "$2" 2>/dev/null \
      || printf '"ms":null,"code":0}\n' >> "$2"
    sleep "$PROBE_INTERVAL_S"
  done
}

# settle: wait until `processed` has not advanced for three consecutive reads.
settle() {
  local stable=0 last=-1 cur
  for _ in $(seq 1 180); do
    cur="$(probe_call getStatus '[]' 60 \
      | python3 -c 'import json,sys; print((json.load(sys.stdin).get("counters") or {}).get("processed",0))' 2>/dev/null || echo "-1")"
    if [ "$cur" = "$last" ]; then
      stable=$((stable + 1))
      [ "$stable" -ge 3 ] && return 0
    else
      stable=0
    fi
    last="$cur"
    sleep 1
  done
  echo "WARNING: processed never stopped advancing within the timeout" >&2
  return 0
}

probe_call getStatus '[]' 60 > "$RUN_DIR/status-baseline.json"

# --- 1. BASELINE ------------------------------------------------------------
echo "baseline: probing getStatus every ${PROBE_INTERVAL_S}s for ${BASELINE_WINDOW_S}s with NO load" >&2
BASE_SAMPLES="$RUN_DIR/rpc-baseline.jsonl"
: > "$BASE_SAMPLES"
touch "$RUN_DIR/.probing"
probe_rpc "$RUN_DIR/.probing" "$BASE_SAMPLES" &
PROBE_PID=$!
sleep "$BASELINE_WINDOW_S"
rm -f "$RUN_DIR/.probing"
wait "$PROBE_PID" 2>/dev/null || true
PROBE_PID=""

# --- 2. THE LOADED RUN ------------------------------------------------------
# `-u "/chunk-{}.js"` is not a typo. `load.sh` runs its URL through
# `xargs -I{}`, which substitutes EVERY occurrence of the placeholder — so the
# path varies per request alongside the cache-busting query, and 200 requests
# fetch 200 distinct bodies. The driver itself is untouched, which is what keeps
# this comparable to the Phase 0 runs.
echo "loaded: $CHUNKS distinct chunks at concurrency $CONCURRENCY, prober running throughout" >&2
LOAD_SAMPLES="$RUN_DIR/rpc-loaded.jsonl"
: > "$LOAD_SAMPLES"
# The flag file is created BEFORE the prober launches. The other order is a race
# the prober always loses: it evaluates the guard immediately and exits.
touch "$RUN_DIR/.probing"
probe_rpc "$RUN_DIR/.probing" "$LOAD_SAMPLES" &
PROBE_PID=$!

scripts/spike/load.sh -n "$CHUNKS" -c "$CONCURRENCY" -u "/chunk-{}.js" \
  -o "127.0.0.1:$P1_ORIGIN_PORT" -t 120 \
  > "$RUN_DIR/load.json" 2>"$RUN_DIR/load.err" || true
settle
rm -f "$RUN_DIR/.probing"
wait "$PROBE_PID" 2>/dev/null || true
PROBE_PID=""

probe_call getStatus '[]' 120 > "$RUN_DIR/status-loaded.json"
probe_call getArtifacts '[]' 180 > "$RUN_DIR/artifacts-before.json"

# --- 3. THE DATABASE, READ FROM OUTSIDE CAIDO -------------------------------
# `sdk.meta.db()` lands at <data-path>/plugins/<backend-plugin-uuid>/data.db, and
# probe_install exported that uuid as BACKEND_ID.
locate_db() {
  local p="$DATA_PATH/plugins/$BOOT1_BACKEND_ID/data.db"
  if [ ! -f "$p" ]; then
    p="$(find "$DATA_PATH/plugins" -name 'data.db' 2>/dev/null | head -1)"
  fi
  printf '%s' "$p"
}
PLUGIN_DB="$(locate_db)"
[ -n "$PLUGIN_DB" ] && [ -f "$PLUGIN_DB" ] || {
  echo "FATAL: could not locate the plugin database under $DATA_PATH/plugins" >&2; exit 1; }
echo "plugin db: $PLUGIN_DB" >&2

# One JSON snapshot of the file's OWN state — row counts, schema position, a
# digest sample and the table list. Taken with sqlite3 rather than through the
# RPC so it can be repeated after the restart, when no project is selected.
snapshot_db() {  # $1 = output path
  python3 - "$PLUGIN_DB" "$1" <<'PY'
import json, sqlite3, sys
db, out = sys.argv[1], sys.argv[2]
con = sqlite3.connect("file:" + db + "?mode=ro", uri=True)
cur = con.cursor()
def scalar(sql):
    try:
        return cur.execute(sql).fetchone()[0]
    except sqlite3.Error:
        return None
tables = [r[0] for r in cur.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").fetchall()]
schema = [r[0] for r in cur.execute(
    "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name").fetchall()]
snap = {
    "user_version": scalar("PRAGMA user_version"),
    "tables": tables,
    "artifacts": scalar("SELECT COUNT(*) FROM artifacts"),
    "observations": scalar("SELECT COUNT(*) FROM observations"),
    "analyses": scalar("SELECT COUNT(*) FROM analyses"),
    "distinct_digests": scalar("SELECT COUNT(DISTINCT sha256) FROM artifacts"),
    # A deterministic sample, not a random one: the SAME rows must come back
    # after the restart for the comparison to mean anything.
    "digest_sample": [r[0] for r in cur.execute(
        "SELECT sha256 FROM artifacts ORDER BY sha256 ASC LIMIT 10").fetchall()],
    # The full DDL text, hashed. Comparing the hash is how "no table was
    # re-created" becomes a claim about what LANDED rather than about what the
    # plugin shipped.
    "schema_sha256": __import__("hashlib").sha256(
        "\n".join(schema).encode()).hexdigest(),
}
con.close()
with open(out, "w") as fh:
    json.dump(snap, fh, indent=2)
PY
}
snapshot_db "$RUN_DIR/db-before.json"

# --- 4. THE RESTART ---------------------------------------------------------
# Success criterion 4's live half. Tear the instance down with instance.sh's own
# always-SIGKILL teardown (KEEP_DATA=1, so the data directory survives), then
# bring a NEW instance up on the SAME data path.
echo "restart: tearing the instance down and bringing a new one up on the same data path" >&2
teardown || true
# instance.sh set it; blanked so the EXIT trap's teardown cannot aim at a pid
# that is already gone (and, on a busy machine, reused).
# shellcheck disable=SC2034
CAIDO_PID=""
for _ in $(seq 1 60); do
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
  sleep 0.5
done

RUN_ID="${BOOT1_RUN_ID}-restart"
# shellcheck disable=SC1091
source scripts/spike/instance.sh
BOOT2_RUN_DIR="$RUN_DIR"
TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"

# The plugin was installed into this data path and should still be there. Try
# the id from the first boot FIRST: reinstalling unconditionally could mint a new
# plugin uuid and therefore a new, empty database, which would make the
# persistence check pass or fail for the wrong reason.
REINSTALLED=false
export BACKEND_ID="$BOOT1_BACKEND_ID"
if ! probe_call getStatus '[]' 60 > "$RUN_DIR/status-restart.json" 2>/dev/null; then
  echo "restart: the plugin did not answer on its previous id; reinstalling" >&2
  probe_install packages/dist/plugin_package
  REINSTALLED=true
  probe_call getStatus '[]' 60 > "$RUN_DIR/status-restart.json"
fi
PLUGIN_DB="$(locate_db)"
snapshot_db "$RUN_DIR/db-after.json"

# --- 5. THE ARTIFACT --------------------------------------------------------
python3 - "$RESULT" "$BOOT1_RUN_DIR" "$BOOT2_RUN_DIR" \
         "$OUT/runs/$BOOT1_RUN_ID/instance.json" "$GO_NO_GO" \
         "$CHUNKS" "$CONCURRENCY" "$CHUNK_BYTES_TOTAL" "$PROBE_INTERVAL_S" \
         "$RPC_TOLERANCE_MULTIPLE" "$BASELINE_WINDOW_S" "$REINSTALLED" \
         "$FIXDIR/_manifest.json" <<'PY'
import datetime, json, os, statistics, sys

(result, boot1, boot2, instance_path, go_no_go, chunks, concurrency,
 chunk_bytes, interval_s, tolerance, baseline_window_s, reinstalled,
 manifest_path) = sys.argv[1:14]


def load(path):
    if not os.path.exists(path):
        return None
    try:
        with open(path) as fh:
            return json.load(fh)
    except Exception:
        return None


def counters(st):
    return (st or {}).get("counters") or {}


def distribution(path, label):
    """A distribution, or NULL WITH A REASON. Never a zero: a zero here reads as
    'measured and found to be none', which is a completely different claim."""
    if not os.path.exists(path):
        return {"measured": None, "reason": f"the {label} prober wrote no sample file"}
    ms, errors, stamps = [], 0, []
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                s = json.loads(line)
            except Exception:
                continue
            if s.get("code") != 200 or s.get("ms") is None:
                errors += 1
                continue
            ms.append(float(s["ms"]) * 1000.0)
            if s.get("at") is not None:
                stamps.append(float(s["at"]))
    if not ms:
        return {"measured": None,
                "reason": f"the {label} prober recorded {errors} samples and none succeeded"}
    ms.sort()
    # The largest gap between consecutive samples. The prober polls on a fixed
    # interval, so a gap far above it is the plugin going quiet — which a latency
    # figure alone cannot show, because a request that never started has no
    # latency.
    gaps = [b - a for a, b in zip(stamps, stamps[1:])] if len(stamps) > 1 else []
    return {
        "measured": True,
        "samples": len(ms),
        "errors": errors,
        "median_ms": round(statistics.median(ms), 3),
        "p95_ms": round(ms[max(0, int(len(ms) * 0.95) - 1)], 3),
        "max_ms": round(ms[-1], 3),
        "min_ms": round(ms[0], 3),
        "max_gap_between_samples_s": round(max(gaps), 3) if gaps else None,
    }


inst = json.load(open(instance_path))
base = load(os.path.join(boot1, "status-baseline.json"))
loaded = load(os.path.join(boot1, "status-loaded.json"))
restart_status = load(os.path.join(boot2, "status-restart.json"))
load_rec = load(os.path.join(boot1, "load.json"))
before = load(os.path.join(boot1, "db-before.json"))
after = load(os.path.join(boot2, "db-after.json"))
manifest = load(manifest_path) or []
thresholds = json.load(open(go_no_go))["thresholds"]

b, a = counters(base), counters(loaded)
delta = {k: a.get(k, 0) - b.get(k, 0)
         for k in a if isinstance(a.get(k), int)}

# max_slice_ms is a running MAXIMUM, not a counter: reported as observed rather
# than differenced. The baseline ran against an idle handler, so it is 0 there
# and everything below it is the load's.
max_slice = (loaded or {}).get("maxSliceMs")

restart_ok = None
restart_reason = None
if before is None or after is None:
    restart_reason = "one of the two database snapshots was not produced"
else:
    restart_ok = (
        before["artifacts"] == after["artifacts"]
        and before["observations"] == after["observations"]
        and before["digest_sample"] == after["digest_sample"]
        and before["user_version"] == after["user_version"]
        and before["schema_sha256"] == after["schema_sha256"]
    )
    if not restart_ok:
        restart_reason = "the database differs across the restart"

out = {
    "generated_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "question": (
        "Success criterion 3 — under a synthetic 200-chunk SPA load, what is the "
        "maximum synchronous slice the plugin actually took, and does its own RPC "
        "keep answering an EXTERNAL prober throughout? Plus criterion 4's live "
        "half: do artifacts survive a real Caido restart?"
    ),
    "method": (
        "An external caller polls getStatus over REST on a fixed interval while "
        "load runs. A starved thread cannot report that it is starved and this "
        "runtime exposes no scheduler introspection, so the measurement is taken "
        "from outside the process (decision P5-D3, Pitfall 8)."
    ),
    # Two SEPARATE fields, never one derived from the other.
    "reported_version": inst["binary"]["reported_version"],
    "expected_version": inst["binary"]["expected_version"],
    "caido_version_inside_plugin": (loaded or base or {}).get("caidoVersion"),
    "binary": inst["binary"],
    "run_id": inst["run_id"],
    "restart_run_id": os.path.basename(boot2),

    "load": {
        "chunks_requested": int(chunks),
        "concurrency": int(concurrency),
        "path_template": "/chunk-{n}.js",
        "distinct_paths": len(manifest),
        "bytes_total": int(chunk_bytes),
        "min_chunk_bytes": min((c["bytes"] for c in manifest), default=None),
        "max_chunk_bytes": max((c["bytes"] for c in manifest), default=None),
        "origin": "scripts/spike/origin.py on 127.0.0.1",
        "driver": "scripts/spike/load.sh (unchanged from Phase 0)",
        "requests_completed": (load_rec or {}).get("completed"),
        "requests_ok": (load_rec or {}).get("ok"),
        "requests_failed": (load_rec or {}).get("failed"),
        "elapsed_s": (load_rec or {}).get("elapsed_s"),
        "rate_rps": (load_rec or {}).get("rate_rps"),
    },

    "max_slice_ms": max_slice,
    "max_sync_slice_ms_budget": thresholds["MAX_SYNC_SLICE_MS"]["value"],
    "processed": delta.get("processed"),
    "admitted": delta.get("admitted"),
    "proxied_responses_observed": delta.get("proxiedResponsesObserved"),
    "distinct_digests": (before or {}).get("distinct_digests"),
    "overflow": (loaded or {}).get("queueOverflowCount"),
    "queue_depth_at_end": (loaded or {}).get("queueDepth"),
    "queue_cap": (loaded or {}).get("queueCap"),
    "reload": {k: delta.get(k) for k in
               ("reloadHit", "reloadMissing", "reloadNoResponse", "reloadEmptyBody")},
    "errors": {k: delta.get(k) for k in
               ("storeErrors", "consumerErrors", "hookErrors",
                "byteLenMismatch", "abandonedOnProjectChange")},
    "last_error": (loaded or {}).get("lastError"),
    "counters_delta": delta,

    "rpc": {
        "probe": "external — curl over the backend function REST endpoint",
        "interval_s": float(interval_s),
        "baseline_window_s": int(baseline_window_s),
        # The tolerance lives HERE, in the data, so the gate reads it rather than
        # carrying a magic number nobody can re-derive.
        "tolerance_multiple": float(tolerance),
        "baseline": distribution(os.path.join(boot1, "rpc-baseline.jsonl"), "baseline"),
        "loaded": distribution(os.path.join(boot1, "rpc-loaded.jsonl"), "loaded"),
    },

    "restart": {
        "checked": before is not None and after is not None,
        "reason": restart_reason,
        "identical": restart_ok,
        "plugin_reattached": (restart_status or {}).get("compatible"),
        "reinstalled": reinstalled == "true",
        "schema_version_before": (loaded or {}).get("schemaVersion"),
        "schema_version_after": (restart_status or {}).get("schemaVersion"),
        "migration_advanced_version": (
            None if before is None or after is None
            else after["user_version"] != before["user_version"]
        ),
        "schema_changed": (
            None if before is None or after is None
            else after["schema_sha256"] != before["schema_sha256"]
        ),
        "before": before,
        "after": after,
        "note": (
            "A guest may create TEMPORARY projects only (temporary:false returns "
            "PermissionDeniedUserError), so the project does not survive the "
            "restart and getArtifacts reports nothing afterwards. The ARTIFACTS "
            "must survive anyway: sdk.meta.db() is one database for the plugin "
            "across every project and is not deleted when a project is. That is "
            "why the comparison below is taken from the database file rather than "
            "through the RPC."
        ),
    },
}

with open(result, "w") as fh:
    json.dump(out, fh, indent=2)
    fh.write("\n")

print()
print("reported / expected     :", out["reported_version"], "/", out["expected_version"])
print("processed / distinct    :", out["processed"], "/", out["distinct_digests"])
print("max_slice_ms            :", out["max_slice_ms"], "budget", out["max_sync_slice_ms_budget"])
print("overflow / peak depth   :", out["overflow"], "/", out["queue_depth_at_end"])
for name in ("baseline", "loaded"):
    d = out["rpc"][name]
    if d.get("measured"):
        print(f"rpc {name:<8}          : n={d['samples']} median={d['median_ms']}ms "
              f"p95={d['p95_ms']}ms max={d['max_ms']}ms gap_max={d['max_gap_between_samples_s']}s "
              f"errors={d['errors']}")
    else:
        print(f"rpc {name:<8}          : NOT MEASURED — {d.get('reason')}")
print("restart identical       :", out["restart"]["identical"],
      "| reattached", out["restart"]["plugin_reattached"],
      "| reinstalled", out["restart"]["reinstalled"])
print()
print("wrote", result)
PY

echo
echo "SPA LOAD RECORDED"
