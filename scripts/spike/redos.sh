#!/usr/bin/env bash
# scripts/spike/redos.sh — SPIKE-01 driver.
#
# The question in words: does a catastrophic regex hang the plugin FOREVER
# inside Caido, and is `re2js` a viable escape hatch at acceptable cost?
#
# THREE STAGES, THREE FRESH INSTANCES, AND THE SEPARATION IS NOT FASTIDIOUSNESS:
#
#   1  escalation   port 8981  RECOVERABLE — n=20..26, every step returns
#   2  unbounded    port 8982  TERMINAL    — n=40, never returns, SIGKILL only
#   3  re2js bench  port 8983  CLEAN       — a hung runtime cannot be measured
#
# Stage 2 wedges the QuickJS thread for an extrapolated ~15 hours. There is no
# interrupt (Caido installs no QuickJS interrupt handler, so `lre_check_timeout`
# is inert), no timeout, and no recovery: `togglePlugin` and
# `installPluginPackage(force:true)` both provably BLOCK behind the wedged
# thread. Stage 3 therefore cannot share stage 2's instance, and no retry loop
# against any plugin-lifecycle operation is written anywhere in this file.
#
# Stages 1 and 2 install TWO packages — the Tier-1 redos package and plan
# 00-01's `probe/tier0-core` — because the roadmap success criterion asks
# whether OTHER plugins keep working during the hang, and that cannot be
# answered with one plugin installed.
#
# Ports: 8981-8983, owned by plan 00-04. NEVER 8080 (the operator's live desktop
# instance, pid 90236, with real project data), never 8998 (the SPIKE-10
# recorder), never 8992/8993 (plan 00-02) or 8995/8996 (plan 00-03).
#
# `set -e` is deliberately OFF: a probe that wedges or kills its host is a
# RESULT, not a script error.
set -uo pipefail

cd "$(dirname "$0")/../.."

export OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
PKG="dist/plugin_package"
RAW="$OUT/spike-01-stages"
ORIGIN_PORT="${ORIGIN_PORT:-8091}"
# The bounded observation window for stage 2. At least ten minutes, per the
# plan; the point is to state the "never recovers" claim as what it honestly is
# — no recovery mechanism engaged within a window N orders of magnitude shorter
# than the extrapolated completion time.
OBS_WINDOW_S="${OBS_WINDOW_S:-660}"
OBS_INTERVAL_S="${OBS_INTERVAL_S:-15}"
STAGES="${STAGES:-123}"

mkdir -p "$RAW" .spike

[ -f "$PKG/manifest.json" ] || { echo "FATAL: $PKG missing — run: pnpm exec caido-dev build" >&2; exit 1; }

ALL_PIDS=()
ORIGIN_PID=""
cleanup() {
  for p in "${ALL_PIDS[@]:-}"; do [ -n "$p" ] && kill -9 "$p" 2>/dev/null; done
  [ -n "$ORIGIN_PID" ] && kill "$ORIGIN_PID" 2>/dev/null
}
trap cleanup EXIT

jargs() {
  python3 -c 'import json,sys; print(json.dumps([json.dumps(a) for a in sys.argv[1:]]))' "$@"
}

# ---------------------------------------------------------------------------
# gql <query-json> [timeout-s] — authenticated GraphQL against the current
# instance. Prints the raw response; returns curl's exit code, so 28 (timeout)
# is distinguishable from a real answer. That distinction IS the measurement for
# the two lifecycle operations in stage 2.
# ---------------------------------------------------------------------------
gql() {
  local body="$1" tmo="${2:-15}"
  curl -s --max-time "$tmo" -X POST "http://127.0.0.1:$PORT/graphql" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$body"
}

# resolve_backend <manifest-plugin-id> — map a manifest plugin id (e.g.
# "redos-probe") to its runtime backend UUID.
#
# probe_install returns backends[0], which is ambiguous once one package carries
# TWO backends. Resolving by manifestId is the difference between measuring the
# redos probe and measuring the parse probe.
resolve_backend() {
  local want="$1"
  gql '{"query":"{ pluginPackages { id manifestId plugins { __typename ... on PluginBackend { id manifestId name enabled } } } }"}' 20 \
    | python3 -c '
import json, sys
want = sys.argv[1]
d = json.load(sys.stdin)
for pkg in (d.get("data") or {}).get("pluginPackages") or []:
    for p in pkg.get("plugins") or []:
        if p.get("__typename") == "PluginBackend" and p.get("manifestId") == want:
            print(p["id"]); sys.exit(0)
sys.exit("resolve_backend: no PluginBackend with manifestId " + want)
' "$want"
}

# call_backend <backend-uuid> <fn> <args-json> [timeout-s]
# Prints the decoded `returns`; exit code is curl's, so a timeout (28) means the
# call did NOT return — which is the whole point in stage 2.
call_backend() {
  local backend="$1" fn="$2" args="$3" tmo="${4:-300}"
  local body
  body="$(python3 -c 'import json,sys; print(json.dumps({"name": sys.argv[1], "args": json.loads(sys.argv[2])}))' "$fn" "$args")"
  curl -s --max-time "$tmo" -X POST "http://127.0.0.1:$PORT/plugin/backend/$backend/function" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$body"
}

# decode_returns — the function envelope DOUBLE-ENCODES: `returns` is itself a
# JSON string. Fails loudly rather than emitting an empty object, so a failed
# call can never be mistaken for a zero measurement.
decode_returns() {
  python3 -c '
import json, sys
raw = sys.stdin.read()
if not raw.strip():
    print(json.dumps({"_error": "empty response"})); sys.exit(0)
try:
    env = json.loads(raw)
except Exception:
    print(json.dumps({"_error": "non-JSON", "_raw": raw[:400]})); sys.exit(0)
if env.get("kind") != "success":
    print(json.dumps({"_error": "call failed", "_envelope": env})); sys.exit(0)
print(json.dumps(json.loads(env["returns"])))
'
}

# ensure_project — a fresh Caido has NO project, and with none selected the
# proxy returns "Proxying error: Internal". Stage 2 probes the proxy for
# liveness during the hang, so this is a hard prerequisite, not hygiene.
# (Measured in plan 00-01; a guest can create temporary projects only.)
ensure_project() {
  local pid
  pid="$(gql '{"query":"{ projects { id } }"}' 20 \
    | python3 -c 'import json,sys; p=(json.load(sys.stdin).get("data") or {}).get("projects") or []; print(p[0]["id"] if p else "")')"
  if [ -z "$pid" ]; then
    pid="$(gql '{"query":"mutation{ createProject(input:{name:\"spike-01\",temporary:true}){ project{ id } error{ __typename } } }"}' 30 \
      | python3 -c 'import json,sys; d=(json.load(sys.stdin).get("data") or {}).get("createProject") or {}; sys.exit("createProject failed: "+str(d.get("error"))) if d.get("error") else print((d.get("project") or {}).get("id",""))')"
  fi
  [ -z "$pid" ] && { echo "  WARN: no project id" >&2; return 1; }
  gql "{\"query\":\"mutation{ selectProject(id:\\\"$pid\\\"){ error{ __typename } } }\"}" 60 >/dev/null
  echo "  project selected: $pid" >&2
}

start_origin() {
  [ -n "$ORIGIN_PID" ] && return 0
  python3 scripts/spike/origin.py --dir corpus --port "$ORIGIN_PORT" \
    > .spike/spike-01-origin.log 2>&1 &
  ORIGIN_PID=$!
  for _ in $(seq 1 30); do
    curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:$ORIGIN_PORT/ace-1.36.5.js" && return 0
    sleep 0.5
  done
  echo "  WARN: origin did not come up on $ORIGIN_PORT" >&2
  return 1
}

# ---------------------------------------------------------------------------
# up <port> — fresh, version-asserted instance + both packages installed.
# Exports RUN_ID CAIDO_PID PORT DATA TOKEN REDOS_BACKEND CORE_BACKEND.
# ---------------------------------------------------------------------------
up() {
  local port="$1" install_core="${2:-1}"
  unset RUN_ID DATA_PATH BACKEND_ID PACKAGE_ID REDOS_BACKEND CORE_BACKEND
  export PORT="$port"

  # shellcheck disable=SC1091
  source scripts/spike/instance.sh || { echo "FATAL: instance did not come up on $port" >&2; return 1; }
  # shellcheck disable=SC1091
  source scripts/spike/probe-run.sh
  # Both sourced scripts turn errexit back ON. This driver needs it OFF.
  set +e

  ALL_PIDS+=("$CAIDO_PID")
  TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"
  export TOKEN

  probe_install "$PKG" >/dev/null 2>"$OUT/runs/$RUN_ID/raw/install-tier1.err" || {
    echo "FATAL: tier-1 install failed on $port" >&2; return 1; }
  REDOS_BACKEND="$(resolve_backend redos-probe)" || return 1
  export REDOS_BACKEND
  echo "  redos backend: $REDOS_BACKEND" >&2

  if [ "$install_core" = "1" ]; then
    probe_install probe/tier0-core >/dev/null 2>"$OUT/runs/$RUN_ID/raw/install-core.err" || {
      echo "FATAL: tier0-core install failed on $port" >&2; return 1; }
    CORE_BACKEND="$(resolve_backend tier0-core-backend)" || return 1
    export CORE_BACKEND
    echo "  tier0-core backend: $CORE_BACKEND" >&2
  fi
  return 0
}

down() {
  local rid="$RUN_ID" pid="$CAIDO_PID" data="$DATA"
  # Preserve stderr BEFORE teardown deletes the data path. A C-level QuickJS
  # abort or an interrupt would land there and nowhere else.
  cp "$OUT/runs/$rid/caido.stderr.log" "$OUT/runs/$rid/raw/caido-stderr-final.log" 2>/dev/null
  cp "$OUT/runs/$rid/caido.stdout.log" "$OUT/runs/$rid/raw/caido-stdout-final.log" 2>/dev/null
  teardown "$pid" "$rid" "$data" >/dev/null
  python3 -c 'import json,sys; print("  exit_code:", json.load(open(sys.argv[1])).get("exit_code"))' \
    "$OUT/runs/$rid/instance.json" >&2
}

# scan_signals <run-id> — search stdout, stderr AND the structured host log for
# anything indicating an interrupt, a timeout or a surfaced error.
#
# MUST run AFTER teardown: teardown is what copies logging.<date>.log out of the
# data path before deleting it, and that file is the largest channel by far. An
# earlier scan would report "zero interrupt signals" over a fraction of the
# evidence it appears to cover.
scan_signals() {
  python3 scripts/spike/scan-signals.py "$OUT/runs/$1"
}

# ===========================================================================
# STAGE 1 — the escalation. Port 8981. Every step returns; the instance lives.
# ===========================================================================
case "$STAGES" in *1*)
echo "=== STAGE 1: escalation, port 8981 (recoverable) ===" >&2
if up 8981 1; then
  S1_RUN="$RUN_ID"
  # A baseline call to the SECOND plugin on a HEALTHY instance. Without it,
  # "the second plugin answered during the hang" has nothing to be compared
  # against and "it did not answer" could just mean it never worked.
  call_backend "$CORE_BACKEND" capabilities '[]' 60 | decode_returns \
    > "$RAW/stage1-core-baseline.json"
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print("  core baseline:", "ok" if "globals" in d or "typeofs" in d else list(d)[:4])' \
    "$RAW/stage1-core-baseline.json" >&2

  call_backend "$REDOS_BACKEND" probe_info '[]' 60 | decode_returns > "$RAW/stage1-probe-info.json"
  call_backend "$REDOS_BACKEND" re2js_limits '[]' 60 | decode_returns > "$RAW/stage1-re2js-limits.json"

  : > "$RAW/stage1-points.jsonl"
  for n in 20 22 24 26; do
    echo "  n=$n ..." >&2
    call_backend "$REDOS_BACKEND" redos "$(jargs nested_quantifier "$n" native)" 600 \
      | decode_returns >> "$RAW/stage1-points.jsonl"
  done
  # A second catastrophic SHAPE, so "catastrophic" is a property of the class
  # rather than a claim about one regex.
  call_backend "$REDOS_BACKEND" redos "$(jargs alternation 24 native)" 600 \
    | decode_returns > "$RAW/stage1-alternation.json"
  # And the same escalation through re2js, which is the escape hatch's whole
  # claim: linear time on the payload that is exponential natively.
  : > "$RAW/stage1-re2js-points.jsonl"
  for n in 20 22 24 26; do
    call_backend "$REDOS_BACKEND" redos "$(jargs nested_quantifier "$n" re2js)" 600 \
      | decode_returns >> "$RAW/stage1-re2js-points.jsonl"
  done

  # Both plugins still answer AFTER the escalation: this instance recovered.
  call_backend "$CORE_BACKEND" capabilities '[]' 60 | decode_returns > "$RAW/stage1-core-after.json"
  call_backend "$REDOS_BACKEND" alive '[]' 30 | decode_returns > "$RAW/stage1-redos-after.json"

  down
  scan_signals "$S1_RUN" > "$RAW/stage1-signals.json"
  python3 -c '
import json,sys
inst=json.load(open(sys.argv[1]))
json.dump({"run_id":inst["run_id"],"listen":inst["listen"],"fresh":inst.get("fresh",True),
           "exit_code":inst.get("exit_code"),"flags":inst.get("flags",[]),
           "data_path":inst.get("data_path")}, open(sys.argv[2],"w"), indent=2)
' "$OUT/runs/$S1_RUN/instance.json" "$RAW/stage1-instance.json"
fi
esac

# ===========================================================================
# STAGE 2 — the unbounded proof. Port 8982. TERMINAL.
# ===========================================================================
case "$STAGES" in *2*)
echo "=== STAGE 2: unbounded n=40, port 8982 (TERMINAL) ===" >&2
if up 8982 1; then
  S2_RUN="$RUN_ID"
  ensure_project
  start_origin

  # Idle baselines FIRST, on this same instance. Every "during the hang" number
  # below is meaningless without the same measurement taken while healthy.
  BASE_GQL_MS="$(curl -s -o /dev/null -w '%{time_total}' --max-time 15 \
    -X POST "http://127.0.0.1:$PORT/graphql" -H 'Content-Type: application/json' \
    -d '{"query":"{ __typename }"}' | python3 -c 'import sys; print(round(float(sys.stdin.read())*1000,2))')"
  BASE_PROXY_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
    --proxy "http://127.0.0.1:$PORT" "http://127.0.0.1:$ORIGIN_PORT/ace-1.36.5.js?base=1")"
  BASE_CORE_RC=0
  call_backend "$CORE_BACKEND" capabilities '[]' 60 > "$RAW/stage2-core-baseline.raw" || BASE_CORE_RC=$?
  echo "  baseline: graphql=${BASE_GQL_MS}ms proxy=$BASE_PROXY_CODE core_rc=$BASE_CORE_RC" >&2

  # ---- fire the unbounded regex, and do NOT wait for it --------------------
  # n=40. At the growth constant this run measures in stage 1, that is roughly
  # fifteen hours. The curl budget is deliberately longer than the observation
  # window so that "the call did not return" is a fact about the runtime rather
  # than about our timeout.
  HANG_START="$(python3 -c 'import time; print(int(time.time()*1000))')"
  ( call_backend "$REDOS_BACKEND" redos "$(jargs nested_quantifier 40 native)" $((OBS_WINDOW_S + 120)) \
      > "$RAW/stage2-hang-call.raw" 2>"$RAW/stage2-hang-call.err"; \
    echo "$?" > "$RAW/stage2-hang-call.rc" ) &
  HANG_CURL_PID=$!
  echo "  fired n=40 at $HANG_START (curl pid $HANG_CURL_PID)" >&2
  sleep 3

  : > "$RAW/stage2-observations.jsonl"
  TOGGLE_DONE=0
  REINSTALL_DONE=0
  OBS_T0="$(python3 -c 'import time; print(time.time())')"
  while :; do
    NOW="$(python3 -c 'import time; print(time.time())')"
    ELAPSED="$(python3 -c "print(round($NOW - $OBS_T0, 1))")"
    STOP="$(python3 -c "print(1 if $ELAPSED >= $OBS_WINDOW_S else 0)")"
    [ "$STOP" = "1" ] && break

    # host alive?
    if kill -0 "$CAIDO_PID" 2>/dev/null; then HOST_ALIVE=true; else HOST_ALIVE=false; fi

    # GraphQL: does the Caido CORE still answer, and how fast?
    GQL_MS="$(curl -s -o /dev/null -w '%{time_total}' --max-time 10 \
      -X POST "http://127.0.0.1:$PORT/graphql" -H 'Content-Type: application/json' \
      -d '{"query":"{ __typename }"}' 2>/dev/null | python3 -c 'import sys
try: print(round(float(sys.stdin.read())*1000,2))
except Exception: print("null")')"
    # Proxy: does a request through the wedged instance still get a 200?
    PROXY_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
      --proxy "http://127.0.0.1:$PORT" "http://127.0.0.1:$ORIGIN_PORT/ace-1.36.5.js?t=$ELAPSED" 2>/dev/null)"

    # The SECOND plugin, in its own package with its own executor.
    CORE_RC=0
    call_backend "$CORE_BACKEND" alive '[]' 12 > "$RAW/stage2-core-probe.raw" 2>/dev/null || CORE_RC=$?
    CORE_OK=false
    grep -q '"kind":"success"' "$RAW/stage2-core-probe.raw" 2>/dev/null && CORE_OK=true
    if [ "$CORE_OK" = "false" ]; then
      # tier0-core registers `capabilities`, not `alive`; fall back so that an
      # unknown-function error is never mistaken for a blocked executor.
      CORE_RC=0
      call_backend "$CORE_BACKEND" capabilities '[]' 12 > "$RAW/stage2-core-probe.raw" 2>/dev/null || CORE_RC=$?
      grep -q '"kind":"success"' "$RAW/stage2-core-probe.raw" 2>/dev/null && CORE_OK=true
    fi

    # The WEDGED plugin's own RPC. Expected to block; measured, not assumed.
    OWN_RC=0
    call_backend "$REDOS_BACKEND" alive '[]' 12 > "$RAW/stage2-own-probe.raw" 2>/dev/null || OWN_RC=$?
    OWN_OK=false
    grep -q '"kind":"success"' "$RAW/stage2-own-probe.raw" 2>/dev/null && OWN_OK=true

    # Did the hang call return?
    HANG_RETURNED=false
    [ -f "$RAW/stage2-hang-call.rc" ] && HANG_RETURNED=true

    python3 - "$RAW/stage2-observations.jsonl" "$ELAPSED" "$HOST_ALIVE" "$GQL_MS" "$PROXY_CODE" \
      "$CORE_OK" "$CORE_RC" "$OWN_OK" "$OWN_RC" "$HANG_RETURNED" <<'PY'
import json, sys
path, el, host, gql, proxy, core_ok, core_rc, own_ok, own_rc, hang = sys.argv[1:11]
row = {
    "elapsed_s": float(el),
    "host_alive": host == "true",
    "graphql_ms": None if gql in ("null", "") else float(gql),
    "proxy_http_code": proxy,
    "second_plugin_ok": core_ok == "true",
    "second_plugin_curl_rc": int(core_rc),
    "wedged_plugin_ok": own_ok == "true",
    "wedged_plugin_curl_rc": int(own_rc),
    "hang_call_returned": hang == "true",
}
with open(path, "a") as fh:
    fh.write(json.dumps(row) + "\n")
PY
    echo "  t=${ELAPSED}s host=$HOST_ALIVE gql=${GQL_MS}ms proxy=$PROXY_CODE second_plugin=$CORE_OK wedged_plugin=$OWN_OK returned=$HANG_RETURNED" >&2

    # ---- the two lifecycle operations, once each -------------------------
    # NO RETRY LOOP. Both provably block behind the wedged thread; retrying
    # would be writing a recovery path that does not exist.
    if [ "$TOGGLE_DONE" = "0" ]; then
      OVER="$(python3 -c "print(1 if $ELAPSED >= 60 else 0)")"
      if [ "$OVER" = "1" ]; then
        TOGGLE_DONE=1
        echo "  attempting togglePlugin(enabled:false) ..." >&2
        T0="$(python3 -c 'import time; print(time.time())')"
        gql "{\"query\":\"mutation{ togglePlugin(id:\\\"$REDOS_BACKEND\\\", enabled:false){ plugin{ id } error{ __typename } } }\"}" 90 \
          > "$RAW/stage2-toggle.raw" 2>/dev/null
        TOGGLE_RC=$?
        T1="$(python3 -c 'import time; print(time.time())')"
        TOGGLE_MS="$(python3 -c "print(round(($T1-$T0)*1000,1))")"
        echo "  togglePlugin rc=$TOGGLE_RC after ${TOGGLE_MS}ms" >&2
        printf '{"op":"togglePlugin","curl_rc":%s,"elapsed_ms":%s,"budget_s":90}\n' \
          "$TOGGLE_RC" "$TOGGLE_MS" > "$RAW/stage2-toggle.json"
      fi
    fi
    if [ "$REINSTALL_DONE" = "0" ]; then
      OVER="$(python3 -c "print(1 if $ELAPSED >= 200 else 0)")"
      if [ "$OVER" = "1" ]; then
        REINSTALL_DONE=1
        echo "  attempting installPluginPackage(force:true) [hot reload] ..." >&2
        T0="$(python3 -c 'import time; print(time.time())')"
        # `$f` is a GraphQL variable name and must stay literal in the JSON body.
        # shellcheck disable=SC2016
        OPS='{"query":"mutation I($f: Upload){ installPluginPackage(input:{source:{file:$f},force:true}){ package{ id } error{ __typename } } }","variables":{"f":null}}'
        curl -s --max-time 120 -X POST "http://127.0.0.1:$PORT/graphql" \
          -H "Authorization: Bearer $TOKEN" \
          -F "operations=$OPS" -F 'map={"0":["variables.f"]}' \
          -F "0=@dist/plugin_package.zip;type=application/zip" \
          > "$RAW/stage2-reinstall.raw" 2>/dev/null
        REINSTALL_RC=$?
        T1="$(python3 -c 'import time; print(time.time())')"
        REINSTALL_MS="$(python3 -c "print(round(($T1-$T0)*1000,1))")"
        echo "  installPluginPackage rc=$REINSTALL_RC after ${REINSTALL_MS}ms" >&2
        printf '{"op":"installPluginPackage_force","curl_rc":%s,"elapsed_ms":%s,"budget_s":120}\n' \
          "$REINSTALL_RC" "$REINSTALL_MS" > "$RAW/stage2-reinstall.json"
      fi
    fi

    sleep "$OBS_INTERVAL_S"
  done

  OBS_T1="$(python3 -c 'import time; print(time.time())')"
  OBS_ACTUAL="$(python3 -c "print(round($OBS_T1 - $OBS_T0, 1))")"
  echo "  observation window closed at ${OBS_ACTUAL}s" >&2

  HANG_RETURNED_FINAL=false
  [ -f "$RAW/stage2-hang-call.rc" ] && HANG_RETURNED_FINAL=true
  kill -9 "$HANG_CURL_PID" 2>/dev/null


  printf '{"observation_window_s": %s, "baseline_graphql_ms": %s, "baseline_proxy_code": "%s", "hang_started_at_ms": %s, "hang_call_returned": %s, "n": 40}\n' \
    "$OBS_ACTUAL" "$BASE_GQL_MS" "$BASE_PROXY_CODE" "$HANG_START" "$HANG_RETURNED_FINAL" \
    > "$RAW/stage2-summary.json"

  # SIGKILL is the ONLY teardown for a wedged instance. SIGTERM waits on the
  # QuickJS thread and never returns.
  down
  scan_signals "$S2_RUN" > "$RAW/stage2-signals.json"
  python3 -c '
import json,sys
inst=json.load(open(sys.argv[1]))
json.dump({"run_id":inst["run_id"],"listen":inst["listen"],"fresh":inst.get("fresh",True),
           "exit_code":inst.get("exit_code"),"flags":inst.get("flags",[]),
           "data_path":inst.get("data_path")}, open(sys.argv[2],"w"), indent=2)
' "$OUT/runs/$S2_RUN/instance.json" "$RAW/stage2-instance.json"
fi
esac

# ===========================================================================
# STAGE 3 — the escape hatch. Port 8983. CLEAN, because a hung runtime cannot
# produce a throughput number.
# ===========================================================================
case "$STAGES" in *3*)
echo "=== STAGE 3: re2js vs native throughput, port 8983 (clean) ===" >&2
if up 8983 0; then
  S3_RUN="$RUN_ID"
  BENCH_FILES='["corpus/ace-1.36.5.js","corpus/echarts-5.5.1.js","corpus/tfjs-4.22.0.js"]'
  ABS="$(python3 -c '
import json, os, sys
print(json.dumps([os.path.abspath(p) for p in json.loads(sys.argv[1])]))' "$BENCH_FILES")"
  echo "  benchmarking $(python3 -c 'import json,sys;print(len(json.loads(sys.argv[1])))' "$ABS") files x 13 rules x 2 engines ..." >&2
  call_backend "$REDOS_BACKEND" bench "$(jargs "$ABS")" 900 | decode_returns > "$RAW/stage3-bench.json"
  call_backend "$REDOS_BACKEND" re2js_limits '[]' 60 | decode_returns > "$RAW/stage3-re2js-limits.json"
  call_backend "$REDOS_BACKEND" probe_info '[]' 60 | decode_returns > "$RAW/stage3-probe-info.json"
  down
  scan_signals "$S3_RUN" > "$RAW/stage3-signals.json"
  python3 -c '
import json,sys
inst=json.load(open(sys.argv[1]))
json.dump({"run_id":inst["run_id"],"listen":inst["listen"],"fresh":inst.get("fresh",True),
           "exit_code":inst.get("exit_code"),"flags":inst.get("flags",[]),
           "data_path":inst.get("data_path")}, open(sys.argv[2],"w"), indent=2)
' "$OUT/runs/$S3_RUN/instance.json" "$RAW/stage3-instance.json"
fi
esac

echo "=== redos.sh done; stage artifacts in $RAW ===" >&2
