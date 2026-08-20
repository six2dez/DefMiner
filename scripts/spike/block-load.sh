#!/usr/bin/env bash
# scripts/spike/block-load.sh — SPIKE-03's experiment.
#
# SPIKE-03 in words (REQUIREMENTS.md is the ID authority; PITFALLS.md agrees on
# this number but its IDs must never be trusted): what does Caido do with
# onInterceptResponse events the plugin cannot consume fast enough — queue them
# unboundedly, drop them, or apply backpressure?
#
# CORE-03's bounded queue is sized completely differently under each answer, and
# if Caido drops silently then the plugin's own overflow counter is measuring
# the wrong thing.
#
# Three numbers decide it, and all three are recorded:
#   500  requests issued
#   N    responses returned to the CLIENT
#   M    events delivered to the HANDLER
# M == 500 with the events arriving in a burst after the block is QUEUEING.
# M materially below 500 is DROPPING.
# Client latency inflating in step with the block is BACKPRESSURE.
#
# The client latency distribution is reported explicitly because it separates
# two things that are easy to conflate: a stalled PLUGIN THREAD and a stalled
# PROXY. The research asserts the proxy keeps serving during a plugin hang; this
# confirms or corrects that with numbers.
#
# A BASELINE run of the identical 500 requests against an IDLE handler runs
# first on the same instance, so the blocked run is compared against this rig on
# this machine rather than against a number measured elsewhere.
#
# Requires PORT, RUN_ID, BACKEND_ID and RUN_DIR in the environment
# (instance.sh + probe-run.sh export them).
set -euo pipefail

: "${PORT:?block-load: PORT not set — source scripts/spike/instance.sh first}"
: "${RUN_ID:?block-load: RUN_ID not set}"
: "${BACKEND_ID:?block-load: BACKEND_ID not set — run probe_install first}"
OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
RUN_DIR="${RUN_DIR:-$OUT/runs/$RUN_ID}"
TOKEN="$(cat "$RUN_DIR/token")"

N="${N:-500}"
C="${C:-20}"
BLOCK_MS="${BLOCK_MS:-30000}"
ORIGIN="${ORIGIN:-127.0.0.1:8083}"
ORIGIN_PATH="${ORIGIN_PATH:-/ace-1.36.5.js}"
# Generous, and deliberately so: a per-request timeout shorter than the block
# would convert backpressure into a wall of curl timeouts and the run would
# report "the proxy died" when what actually happened is that it waited.
TMO="${TMO:-90}"

RAW="$RUN_DIR/raw"
mkdir -p "$RAW"

pcall() { # pcall <name> [json-arg ...]
  local name="$1"; shift
  local args="[]"
  if [ "$#" -gt 0 ]; then
    args="$(printf '%s\n' "$@" | python3 -c 'import json,sys; print(json.dumps([l.rstrip("\n") for l in sys.stdin]))')"
  fi
  curl -s --max-time 600 -X POST "http://127.0.0.1:$PORT/plugin/backend/$BACKEND_ID/function" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "$(python3 -c 'import json,sys; print(json.dumps({"name": sys.argv[1], "args": json.loads(sys.argv[2])}))' "$name" "$args")" \
  | python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    env = json.loads(raw)
except Exception:
    sys.exit("pcall: non-JSON response: " + raw[:400])
if env.get("kind") != "success":
    sys.exit("pcall failed: " + json.dumps(env)[:600])
print(json.dumps(json.loads(env["returns"])))
'
}

# load <label> <count> -> writes $RAW/load-<label>.tsv, echoes the wall-clock
# window. Per-request status AND per-request client-observed latency, because
# elapsed time alone is a trap: the fastest possible run is one where every
# request fails (the defect plan 00-01 found and fixed in load.sh).
load() {
  local label="$1" count="$2"
  local tsv="$RAW/load-$label.tsv"
  : > "$tsv"
  local t0 t1
  t0=$(python3 -c 'import time;print(repr(time.time()))')
  seq 1 "$count" | xargs -P "$C" -I{} \
    curl -s -o /dev/null \
      -w '%{http_code}\t%{time_total}\t%{time_connect}\t%{time_starttransfer}\n' \
      --proxy "http://127.0.0.1:$PORT" -m "$TMO" \
      "http://$ORIGIN$ORIGIN_PATH?dfm=$label&n={}" >> "$tsv" || true
  t1=$(python3 -c 'import time;print(repr(time.time()))')
  echo "$t0 $t1"
}

echo "block-load: N=$N C=$C block=${BLOCK_MS}ms origin=$ORIGIN" >&2

pcall reset > /dev/null

# --- 1. BASELINE: the identical rig against an idle handler -----------------
echo "block-load: baseline run (idle handler)" >&2
BASE_WINDOW=$(load baseline "$N")
sleep 3
pcall drain > "$RAW/drain-baseline.json"

# --- 2. ARM the block, then drive the same 500 requests ---------------------
# The handler blocks on the FIRST delivered event for BLOCK_MS and then returns;
# every subsequent delivered event is still appended with its sequence number
# and both clocks, which is what makes the post-block burst visible.
echo "block-load: arming ${BLOCK_MS}ms block" >&2
pcall arm '"block"' "$BLOCK_MS" '1' > "$RAW/arm-block.json"

echo "block-load: blocked run" >&2
BLOCK_WINDOW=$(load blocked "$N")
echo "block-load: load finished, waiting for the block to release" >&2

# The plugin RPC is queued behind the blocked handler rather than dropped
# (research), so this drain simply waits until the handler returns. Poll to
# settlement afterwards so a post-block burst is captured in full.
sleep 2
: > "$RAW/drain-blocked.jsonl"
EMPTY=0
DEADLINE=$(( $(date +%s) + 120 ))
while [ "$EMPTY" -lt 8 ] && [ "$(date +%s)" -lt "$DEADLINE" ]; do
  D=$(pcall drain)
  echo "$D" >> "$RAW/drain-blocked.jsonl"
  CNT=$(printf '%s' "$D" | python3 -c 'import json,sys;print(json.load(sys.stdin)["count"])')
  if [ "$CNT" -eq 0 ]; then EMPTY=$((EMPTY+1)); else EMPTY=0; fi
  sleep 0.5
done

# --- 3. ERROR INJECTION -----------------------------------------------------
# ERR-03 rests on whether Caido surfaces a handler error at all, and this is the
# same apparatus, so it runs here rather than in a separate rig.
ERR_N="${ERR_N:-5}"
for MODE in throw-sync reject-async; do
  echo "block-load: error injection $MODE" >&2
  pcall arm "\"$MODE\"" '0' '1' > "$RAW/arm-$MODE.json"
  # A wall-clock marker so the log scan can attribute a host-log line to this
  # injection rather than to something earlier in the run.
  python3 -c 'import time;print(repr(time.time()))' > "$RAW/mark-$MODE.txt"
  load "err-$MODE" "$ERR_N" > /dev/null
  sleep 3
  pcall drain > "$RAW/drain-$MODE.json"
  # Does the plugin keep receiving events after the error? A handler that is
  # torn down by an uncaught throw would show zero here, and that is a
  # first-order fact for ERR-03.
  load "after-$MODE" "$ERR_N" > /dev/null
  sleep 3
  pcall drain > "$RAW/drain-after-$MODE.json"
done

pcall status > "$RAW/status-final.json"

python3 - "$RAW" "$N" "$C" "$BLOCK_MS" "$ERR_N" "$BASE_WINDOW" "$BLOCK_WINDOW" <<'PY'
import json, os, sys
raw, n, c, block_ms, err_n = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
base_window = sys.argv[6].split()
block_window = sys.argv[7].split()
out = {
    "requests_issued": n, "concurrency": c, "block_ms": block_ms, "error_requests": err_n,
    "baseline_window": [float(base_window[0]), float(base_window[1])],
    "blocked_window": [float(block_window[0]), float(block_window[1])],
}
with open(os.path.join(raw, "block-load-meta.json"), "w") as fh:
    json.dump(out, fh, indent=2)
    fh.write("\n")
print(json.dumps(out))
PY

echo "block-load: done, raw under $RAW" >&2
