#!/usr/bin/env bash
# scripts/spike/instance.sh — launch an isolated, version-asserted Caido for one spike run.
#
# Works both ways:
#   bash   scripts/spike/instance.sh    -> launches, prints KEY=VALUE, exits 0 (non-zero if a gate fires)
#   source scripts/spike/instance.sh    -> launches AND defines teardown() in the caller's shell
#
# Environment overrides:
#   CAIDO_BIN       absolute path to the binary under test (default: the app bundle)
#   EXPECT_VERSION  version that MUST be reported before anything is measured (default 0.57.1)
#   PORT            listen port (default 8999). 8080 is refused unconditionally.
#   RUN_ID          run identifier (default: UTC timestamp + $RANDOM)
#   DATA_PATH       where the isolated data directory lives (default /tmp/defminer-probe-$RUN_ID)
#   KEEP_DATA=1     do not delete the data directory on teardown (the long-lived recorder needs this)
#   OUT             results root
set -euo pipefail

CAIDO_BIN="${CAIDO_BIN:-/Applications/Caido.app/Contents/Resources/bin/caido-cli}"
EXPECT_VERSION="${EXPECT_VERSION:-0.57.1}"
PORT="${PORT:-8999}"
RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM}"
DATA="${DATA_PATH:-/tmp/defminer-probe-$RUN_ID}"
OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
KEEP_DATA="${KEEP_DATA:-}"
# Per-run artifacts live under results/runs/<RUN_ID>/ — the layout every gate,
# and record-result.py, is written against.
RUN_DIR="$OUT/runs/$RUN_ID"

_spike_sourced() { [ "${BASH_SOURCE[0]}" != "${0}" ]; }

# ---------------------------------------------------------------------------
# teardown — ALWAYS SIGKILL. A spike that wedged the QuickJS thread will never
# honour SIGTERM; the host accepts the stop request and then waits on a thread
# that is not coming back. Proven during research: a catastrophic regex held the
# executor for 27 s and force-reinstall blocked for the full duration.
# ---------------------------------------------------------------------------
teardown() {
  local pid="${1:-${CAIDO_PID:-}}" run="${2:-${RUN_ID:-}}" data="${3:-${DATA:-}}"
  local code=""
  if [ -n "$pid" ]; then
    kill -9 "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || code=$?
    [ -z "$code" ] && code=0
  fi
  # Copy the host log out before the data directory goes away. 134 == SIGABRT,
  # which is the caido/caido#2211 crash signature.
  if [ -n "$run" ] && [ -d "$data/logs" ]; then
    cp "$data"/logs/*.log "$OUT/runs/$run/" 2>/dev/null || true
  fi
  # The guest bearer token is live credential material; it does not outlive the run.
  [ -n "$run" ] && rm -f "$OUT/runs/$run/token" 2>/dev/null || true
  if [ -z "$KEEP_DATA" ] && [ -n "$data" ] && [ "$data" != "/" ]; then
    rm -rf "$data"
  fi
  if [ -n "$run" ] && [ -f "$OUT/runs/$run/instance.json" ]; then
    python3 - "$OUT/runs/$run/instance.json" "${code:-null}" <<'PY'
import json, sys
p, code = sys.argv[1], sys.argv[2]
d = json.load(open(p))
d["exit_code"] = None if code in ("", "null") else int(code)
d["stopped_at"] = __import__("datetime").datetime.now(__import__("datetime").UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
json.dump(d, open(p, "w"), indent=2)
PY
  fi
  echo "teardown: run=$run pid=$pid exit=${code:-n/a}"
}

_spike_up() {
  # --- GATE 1: the binary is the one we mean --------------------------------
  # This is the SECOND line of defence, not the first. The first is that no
  # script in this tree names the binary by any path but the app bundle, so the
  # wrong build is never launched at all. This gate catches a wrong build that
  # somehow got launched anyway.
  if [ ! -x "$CAIDO_BIN" ]; then
    echo "FATAL: $CAIDO_BIN is not executable" >&2
    return 1
  fi
  local actual
  actual="$("$CAIDO_BIN" --version 2>/dev/null | awk '{print $2}')"
  if [ "$actual" != "$EXPECT_VERSION" ]; then
    echo "FATAL: version mismatch. expected $EXPECT_VERSION, got ${actual:-<none>} ($CAIDO_BIN)" >&2
    echo "       Refusing to record any measurement against an unexpected build." >&2
    echo "       NOTE: bare 'caido-cli' on PATH resolves to a STALE 0.55.3 on this machine." >&2  # spike-allow
    echo "       Always use the absolute app-bundle path. Never \$HOME/.caido/." >&2              # spike-allow
    return 1
  fi
  local bin_sha
  bin_sha="$(shasum -a 256 "$CAIDO_BIN" | cut -d' ' -f1)"

  # --- GATE 2: the port is ours to take -------------------------------------
  # 8080 is the operator's live desktop instance with real project data. It is
  # refused unconditionally and BEFORE the LISTEN check, so the error names the
  # real reason. Nothing in this script ever kills a process it did not start.
  if [ "$PORT" = "8080" ]; then
    echo "FATAL: refusing port 8080 — that is the operator's live Caido desktop instance." >&2
    echo "       This phase owns 8999 (probe), 8998 (recorder), 8991-8996, 8981-8985." >&2
    return 1
  fi
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "FATAL: port $PORT is already in LISTEN state. Refusing to collide." >&2
    return 1
  fi

  mkdir -p "$DATA" "$RUN_DIR/raw"

  # --allow-guests removes all login setup but makes the instance trust any
  # caller, so the bind address is 127.0.0.1 ONLY, never 0.0.0.0 (threat T-00-11).
  # --no-sync suppresses the outbound Caido Cloud connection, the one thing a
  # --data-path instance would otherwise still share with the operator's.
  # Never --safe: it disables backend plugins entirely, which is the whole point.
  # Never --reset-credentials.
  local flags=(--no-open --allow-guests --no-sync --debug)
  nohup "$CAIDO_BIN" --data-path "$DATA" --listen "127.0.0.1:$PORT" "${flags[@]}" \
    > "$RUN_DIR/caido.stdout.log" 2> "$RUN_DIR/caido.stderr.log" &
  CAIDO_PID=$!

  # --- GATE 3: poll for readiness, never sleep-and-hope ---------------------
  local ready=0 i
  for i in $(seq 1 60); do
    if curl -sf -o /dev/null -X POST "http://127.0.0.1:$PORT/graphql" \
         -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}' 2>/dev/null; then
      ready=1; break
    fi
    if ! kill -0 "$CAIDO_PID" 2>/dev/null; then
      echo "FATAL: caido died during startup. stderr tail:" >&2
      tail -20 "$RUN_DIR/caido.stderr.log" >&2 || true
      return 1
    fi
    sleep 1
  done
  if [ "$ready" -ne 1 ]; then
    echo "FATAL: caido did not become ready on 127.0.0.1:$PORT within 60s" >&2
    kill -9 "$CAIDO_PID" 2>/dev/null || true
    return 1
  fi

  # Guest token. Unauthenticated introspection works but every real mutation
  # returns INVALID_TOKEN, so this is required for install and function calls.
  local token
  token="$(curl -s -X POST "http://127.0.0.1:$PORT/graphql" -H 'Content-Type: application/json' \
    -d '{"query":"mutation{ loginAsGuest{ token{ accessToken } } }"}' \
    | python3 -c 'import json,sys;print(json.load(sys.stdin)["data"]["loginAsGuest"]["token"]["accessToken"])')"
  if [ -z "$token" ]; then
    echo "FATAL: could not mint a guest token" >&2
    kill -9 "$CAIDO_PID" 2>/dev/null || true
    return 1
  fi
  # 0600 BEFORE the secret is written, not after (threat T-00-14).
  ( umask 077; printf '%s\n' "$token" > "$RUN_DIR/token" )
  chmod 600 "$RUN_DIR/token"

  python3 - "$RUN_DIR/instance.json" <<PY
import json, sys, datetime
json.dump({
  "run_id": "$RUN_ID",
  "pid": $CAIDO_PID,
  "port": $PORT,
  "listen": "127.0.0.1:$PORT",
  "data_path": "$DATA",
  "fresh": $( [ -n "$KEEP_DATA" ] && echo False || echo True ),
  "binary": {
    "path": "$CAIDO_BIN",
    "expected_version": "$EXPECT_VERSION",
    "reported_version": "$actual",
    "sha256": "$bin_sha"
  },
  "flags": ["--no-open", "--allow-guests", "--no-sync", "--debug"],
  "started_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "exit_code": None,
}, open(sys.argv[1], "w"), indent=2)
PY

  export RUN_ID PORT DATA OUT CAIDO_PID RUN_DIR
  echo "RUN_ID=$RUN_ID CAIDO_PID=$CAIDO_PID PORT=$PORT DATA=$DATA RUN_DIR=$RUN_DIR"
}

if ! _spike_up; then
  if _spike_sourced; then return 1; else exit 1; fi
fi
