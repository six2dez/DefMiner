#!/usr/bin/env bash
# scripts/spike/recorder-up.sh — bring up (or reuse) the long-lived SPIKE-10
# recorder instance on port 8998 and ensure the recorder probe is installed.
#
# This is the ONE instance in this phase that is deliberately NOT disposable.
# SPIKE-10's number is the CROSS-DAY content-hash cache hit rate, which is a
# property of how sites version and re-serve bundles across deploys. It cannot
# be synthesised from a scripted burst — it is wall-clock-bound, which is why
# the recorder ships in wave 1 and is merely READ in plan 00-04.
#
# DATA_PATH is .spike/recorder-data (not /tmp, which macOS prunes) and
# KEEP_DATA=1, so the cache_log database survives reboots.
#
# Still guest-enabled, therefore still 127.0.0.1 ONLY, permanently (T-00-11).
#
# Idempotent: if the instance is already listening and the probe responds, this
# is a no-op. Prints RECORDER_PORT / RECORDER_RUN_ID / RECORDER_BACKEND.
set -euo pipefail

export PORT="${RECORDER_PORT:-8998}"
export OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
STATE=".spike/recorder.state"
mkdir -p .spike

# A fresh Caido has NO project, and with no project selected the proxy returns
# "Proxying error: Internal" and onInterceptResponse never fires. This was not
# in the research and is a hard prerequisite for any traffic-observing spike.
#
# A guest can create temporary:true projects but NOT persistent ones —
# createProject(temporary:false) returns PermissionDeniedUserError. That is fine
# here: cache_log lives in the plugin's own data.db under
# <data-path>/plugins/<uuid>/, which is independent of project lifetime, so the
# recorded data survives even though the project does not.
ensure_project() {
  local token url pid
  url="http://127.0.0.1:$PORT"
  token="$(cat "$OUT/runs/$RUN_ID/token")"
  gql() {
    curl -s -X POST "$url/graphql" -H "Authorization: Bearer $token" \
      -H 'Content-Type: application/json' -d "$1"
  }
  pid="$(gql '{"query":"{ projects { id } }"}' \
    | python3 -c 'import json,sys; p=json.load(sys.stdin)["data"]["projects"]; print(p[0]["id"] if p else "")')"
  if [ -z "$pid" ]; then
    pid="$(gql '{"query":"mutation{ createProject(input:{name:\"spike-recorder\",temporary:true}){ project{ id } error{ __typename } } }"}' \
      | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["createProject"]; sys.exit("createProject failed: "+str(d["error"])) if d["error"] else print(d["project"]["id"])')"
    echo "created temporary project $pid" >&2
  fi
  gql "{\"query\":\"mutation{ selectProject(id:\\\"$pid\\\"){ error{ __typename } } }\"}" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["selectProject"]; sys.exit("selectProject failed: "+str(d["error"])) if d["error"] else None'
  echo "project selected: $pid" >&2
}

recorder_is_up() {
  curl -sf -o /dev/null --max-time 5 -X POST "http://127.0.0.1:$PORT/graphql" \
    -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}' 2>/dev/null
}

if recorder_is_up && [ -f "$STATE" ]; then
  # shellcheck disable=SC1090
  . "$STATE"
  RUN_ID="${RECORDER_RUN_ID:-}"
  # Re-assert the project even on the reuse path: the project is TEMPORARY and
  # does not survive a restart, and without one selected the proxy fails and the
  # intercept hook never fires. ensure_project is idempotent.
  if [ -n "$RUN_ID" ] && [ -f "$OUT/runs/$RUN_ID/token" ]; then
    ensure_project || echo "WARN: could not re-assert project on reuse path" >&2
  fi
  echo "recorder already up: port=$PORT run_id=${RECORDER_RUN_ID:-?} backend=${RECORDER_BACKEND:-?}" >&2
  echo "RECORDER_PORT=$PORT RECORDER_RUN_ID=${RECORDER_RUN_ID:-} RECORDER_BACKEND=${RECORDER_BACKEND:-}"
  exit 0
fi

if recorder_is_up; then
  echo "FATAL: something is already listening on 127.0.0.1:$PORT but $STATE is missing." >&2
  echo "       Refusing to guess whether it is ours. Inspect it, then remove or stop it." >&2
  exit 1
fi

DATA_PATH="$(pwd)/.spike/recorder-data"
export DATA_PATH
export KEEP_DATA=1
RUN_ID="recorder-$(date -u +%Y%m%dT%H%M%SZ)"
export RUN_ID

# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

probe_install probe/recorder
ensure_project

cat > "$STATE" <<EOF
RECORDER_RUN_ID="$RUN_ID"
RECORDER_BACKEND="$BACKEND_ID"
RECORDER_PID="$CAIDO_PID"
RECORDER_DATA="$DATA_PATH"
RECORDER_PORT="$PORT"
EOF

echo "RECORDER_PORT=$PORT RECORDER_RUN_ID=$RUN_ID RECORDER_BACKEND=$BACKEND_ID"
