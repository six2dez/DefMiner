#!/usr/bin/env bash
# scripts/spike/run-spike-03.sh — SPIKE-03 end to end on a fresh instance.
#
# RUNS LAST in plan 00-03 and alone on its instance: it deliberately wedges the
# QuickJS thread for thirty seconds. It recovers cleanly — the research measured
# the Caido core staying healthy through a plugin-thread block, with GraphQL
# answering in 7 ms and the proxy returning 200s — but nothing else may be
# scheduled behind it, because everything after it would be measuring a
# recovering runtime rather than a resting one.
#
# Owns port 8995 (Caido) and 8083 (origin), per plan 00-03.
set -euo pipefail

export PORT="${PORT:-8995}"
export OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
ORIGIN_PORT="${ORIGIN_PORT:-8083}"

ORIGIN_PID=""
cleanup() {
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
}
trap cleanup EXIT

# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

mkdir -p "$RUN_DIR/raw"
ORIGIN_LOG="$RUN_DIR/raw/origin.log"
python3 scripts/spike/origin.py --dir corpus --port "$ORIGIN_PORT" > "$ORIGIN_LOG" 2>&1 &
ORIGIN_PID=$!
for _ in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" && break
  sleep 0.5
done
curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" || {
  echo "FATAL: origin did not come up on 127.0.0.1:$ORIGIN_PORT" >&2; exit 1; }

# Without a SELECTED project the proxy returns `Proxying error: Internal` and
# the hook never fires — every request would 502 and the delivered-event count
# would be zero for a reason that has nothing to do with backpressure. Wave 1
# found this the hard way; it is asserted here, not assumed.
TOKEN="$(cat "$RUN_DIR/token")"
gql() {
  curl -s -X POST "http://127.0.0.1:$PORT/graphql" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "$1"
}
PROJECT_ID="$(gql '{"query":"{ projects { id } }"}' \
  | python3 -c 'import json,sys; p=json.load(sys.stdin)["data"]["projects"]; print(p[0]["id"] if p else "")')"
if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID="$(gql '{"query":"mutation{ createProject(input:{name:\"spike-03-block\",temporary:true}){ project{ id } error{ __typename } } }"}' \
    | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["createProject"]; sys.exit("createProject failed: "+str(d["error"])) if d["error"] else print(d["project"]["id"])')"
fi
gql "{\"query\":\"mutation{ selectProject(id:\\\"$PROJECT_ID\\\"){ error{ __typename } } }\"}" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["selectProject"]; sys.exit("selectProject failed: "+str(d["error"])) if d["error"] else None'
echo "project selected: $PROJECT_ID" >&2

probe_install probe/tier0-events

# Prove the apparatus BEFORE the experiment: one proxied request that must be
# delivered. If this does not fire, every count below would be zero for a
# reason unrelated to backpressure and the run must not be recorded.
curl -s -o /dev/null --proxy "http://127.0.0.1:$PORT" \
  "http://127.0.0.1:$ORIGIN_PORT/ace-1.36.5.js?dfm=preflight" -m 30
sleep 2
PRE="$(curl -s -X POST "http://127.0.0.1:$PORT/plugin/backend/$BACKEND_ID/function" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"drain","args":[]}' \
  | python3 -c 'import json,sys; print(json.loads(json.load(sys.stdin)["returns"])["count"])')"
echo "preflight deliveries: $PRE" >&2
if [ "$PRE" -lt 1 ]; then
  echo "FATAL: preflight proxied request was not delivered to the hook. Refusing to run." >&2
  exit 1
fi

ORIGIN="127.0.0.1:$ORIGIN_PORT" bash scripts/spike/block-load.sh

# --- host-log scan, BEFORE teardown removes the data path -------------------
# All three surfaces the plan names: the instance's structured logging.<date>.log,
# its stdout, and its stderr. A C-level abort would land in stderr; a surfaced
# handler error would land in one of the first two, or nowhere.
python3 - "$DATA/logs" "$RUN_DIR/caido.stdout.log" "$RUN_DIR/caido.stderr.log" \
        "$RUN_DIR/raw/error-scan.json" <<'PY'
import glob, json, os, re, sys
logs_dir, stdout_p, stderr_p, out_p = sys.argv[1:5]

ANSI = re.compile(r"\x1b\[[0-9;]*m")
NEEDLES = ["defminer-spike-03", "THROW_SYNC", "REJECT_ASYNC", "ARM ", "BLOCK_RELEASED"]
ERRISH = re.compile(r"unhandled|uncaught|rejection|panic|abort|ERROR|WARN", re.I)

def scan(path):
    try:
        with open(path, "r", errors="replace") as fh:
            lines = [ANSI.sub("", l.rstrip("\n")) for l in fh]
    except OSError:
        return None
    return {
        "path": path,
        "lines": len(lines),
        "probe_marker_lines": [l[-300:] for l in lines if any(nd in l for nd in NEEDLES)],
        # A line naming the probe's own error text is the ONLY unambiguous proof
        # that Caido surfaced the handler error rather than swallowing it: the
        # message is unique to this run and cannot come from anywhere else.
        "handler_error_lines": [l[-400:] for l in lines if "defminer-spike-03" in l and "MARK" not in l],
        "errish_lines": [l[-300:] for l in lines if ERRISH.search(l)][-40:],
        "errish_count": sum(1 for l in lines if ERRISH.search(l)),
    }

surfaces = {}
host_logs = sorted(glob.glob(os.path.join(logs_dir, "*.log")))
surfaces["host_logs"] = [s for s in (scan(p) for p in host_logs) if s]
surfaces["stdout"] = scan(stdout_p)
surfaces["stderr"] = scan(stderr_p)
with open(out_p, "w") as fh:
    json.dump(surfaces, fh, indent=2)
    fh.write("\n")
print("error scan written to", out_p, file=sys.stderr)
PY

echo "RUN_ID=$RUN_ID RAW=$RUN_DIR/raw"
