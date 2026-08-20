#!/usr/bin/env bash
# scripts/spike/send-cliff.sh — SPIKE-04 and SPIKE-04b driver.
#
# The question in words: at how many `sdk.requests.send()` calls does Caido
# 0.57.1 fail, and does the failure differ between `save:true`, `save:false`
# and `caido:http` `fetch`?
#
# ONE FRESH INSTANCE PER VARIANT. THIS IS THE SINGLE MOST IMPORTANT CONSTRAINT
# IN THE SPIKE. caido/caido#2211 is a CUMULATIVE refcount leak across a
# runtime's lifetime. Running three variants in one runtime pollutes variants 2
# and 3 with variant 1's leaked references, and the measured cliff for
# `save:false` would be fiction. The gate asserts run_id UNIQUENESS rather than
# merely `fresh:true`, because a prose-only version of this rule is not
# checkable.
#
#   save-true   port 8984
#   save-false  port 8985
#   fetch       port 8981
#   SPIKE-04b   port 8983   (a FOURTH instance; 8982 may still be wedged)
#
# STDOUT, STDERR AND THE HOST LOG ARE CAPTURED SEPARATELY FOR EVERY RUN. The
# `gc_decref_child` assertion is a C-level abort() under `panic = "abort"`:
# there is no unwind, no graceful shutdown, and it never reaches the structured
# log. The evidence is the exit code (134 == SIGABRT), the assertion text in
# stderr, and whatever the write-ahead journal committed before dying. A result
# with status `fail` and no exit code means the CAPTURE was wrong, not that the
# process merely vanished.
#
# `set -e` is deliberately OFF: a probe that kills its host is a RESULT.
set -uo pipefail

cd "$(dirname "$0")/../.."

export OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
RAW="$OUT/spike-04-runs"
PROBE="probe/tier0-send"
ORIGIN_PORT="${ORIGIN_PORT:-8092}"
# Bodies are small and fixed so the measurement is of WRAPPER pressure, which is
# the #2211 mechanism, rather than of body size. Recorded in the result so a
# later phase can question the choice rather than having to infer it.
SYNTH_BYTES="${SYNTH_BYTES:-2048}"
BATCH="${BATCH:-10}"
MAX_SENDS="${MAX_SENDS:-2000}"
# The kill-in-flight phase. #2211's own abort is the ideal event to validate
# ACTIVE-02's journal against, but it cannot be summoned: if the cliff does not
# arrive inside the cap there is no in-flight send to recover and the must-have
# goes unanswered. A SIGKILL delivered mid-batch is the same event from the
# journal's point of view — an abrupt process death with no unwind, no graceful
# shutdown and no chance to flush — so it exercises exactly what ACTIVE-13 needs
# whether or not the host aborts on its own. The difference between SIGABRT and
# SIGKILL is recorded rather than glossed.
KILL_BATCH="${KILL_BATCH:-3000}"
KILL_DELAY_S="${KILL_DELAY_S:-0.6}"
RETAIN="${RETAIN:-false}"
BATCH_TIMEOUT_S="${BATCH_TIMEOUT_S:-120}"
VARIANTS="${VARIANTS:-save-true save-false fetch}"
DO_04B="${DO_04B:-1}"

mkdir -p "$RAW" .spike

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

gql() {
  local body="$1" tmo="${2:-20}"
  curl -s --max-time "$tmo" -X POST "http://127.0.0.1:$PORT/graphql" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$body"
}

call_backend() {
  local fn="$1" args="$2" tmo="${3:-120}"
  local body
  body="$(python3 -c 'import json,sys; print(json.dumps({"name": sys.argv[1], "args": json.loads(sys.argv[2])}))' "$fn" "$args")"
  curl -s --max-time "$tmo" -X POST "http://127.0.0.1:$PORT/plugin/backend/$BACKEND_ID/function" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$body"
}

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

ensure_project() {
  local pid
  pid="$(gql '{"query":"{ projects { id } }"}' 20 \
    | python3 -c 'import json,sys; p=(json.load(sys.stdin).get("data") or {}).get("projects") or []; print(p[0]["id"] if p else "")')"
  if [ -z "$pid" ]; then
    pid="$(gql '{"query":"mutation{ createProject(input:{name:\"spike-04\",temporary:true}){ project{ id } error{ __typename } } }"}' 60 \
      | python3 -c 'import json,sys; d=(json.load(sys.stdin).get("data") or {}).get("createProject") or {}; sys.exit("createProject failed: "+str(d.get("error"))) if d.get("error") else print((d.get("project") or {}).get("id",""))')"
  fi
  [ -z "$pid" ] && { echo "  WARN: no project id" >&2; return 1; }
  gql "{\"query\":\"mutation{ selectProject(id:\\\"$pid\\\"){ error{ __typename } } }\"}" 90 >/dev/null
  echo "  project selected: $pid (TEMPORARY — a guest cannot create a persistent one)" >&2
  PROJECT_ID="$pid"
  # Record the persistence class on the instance itself, so record-result.py
  # carries it into the result rather than the driver asserting it later.
  # createProject(temporary:false) returns PermissionDeniedUserError for a
  # guest, so this is a fact about the instance, not a choice made here.
  python3 - "$OUT/runs/$RUN_ID/instance.json" <<'PYX'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
d["project_persistence"] = "temporary"
json.dump(d, open(p, "w"), indent=2)
PYX
}

start_origin() {
  [ -n "$ORIGIN_PID" ] && return 0
  python3 scripts/spike/origin.py --dir corpus --port "$ORIGIN_PORT" \
    > .spike/spike-04-origin.log 2>&1 &
  ORIGIN_PID=$!
  for _ in $(seq 1 40); do
    curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:$ORIGIN_PORT/_synth?bytes=$SYNTH_BYTES&status=200" && return 0
    sleep 0.5
  done
  echo "FATAL: origin did not come up on $ORIGIN_PORT" >&2
  return 1
}

up() {
  local port="$1"
  unset RUN_ID DATA_PATH BACKEND_ID PACKAGE_ID
  export PORT="$port"
  # shellcheck disable=SC1091
  source scripts/spike/instance.sh || { echo "FATAL: instance did not come up on $port" >&2; return 1; }
  # shellcheck disable=SC1091
  source scripts/spike/probe-run.sh
  set +e
  ALL_PIDS+=("$CAIDO_PID")
  TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"
  export TOKEN
  ensure_project || return 1
  probe_install "$PROBE" >/dev/null 2>"$OUT/runs/$RUN_ID/raw/install-send.err" || {
    echo "FATAL: send probe install failed on $port" >&2; return 1; }
  echo "  send backend: $BACKEND_ID" >&2
  return 0
}

# preserve_evidence — copy the journal database AND the raw channels out of the
# data path BEFORE teardown deletes it. The -wal and -shm files come too: WAL is
# enabled on this build (measured in SPIKE-09), so a committed row can still be
# sitting in the write-ahead log, and copying the .db alone would silently drop
# exactly the rows this spike exists to read.
preserve_evidence() {
  local label="$1" rid="$RUN_ID" data="$DATA" backend="$BACKEND_ID"
  local dest="$RAW/$label"
  mkdir -p "$dest"
  for suffix in "" "-wal" "-shm"; do
    cp "$data/plugins/$backend/data.db$suffix" "$dest/journal.db$suffix" 2>/dev/null
  done
  cp "$OUT/runs/$rid/caido.stderr.log" "$dest/caido.stderr.log" 2>/dev/null
  cp "$OUT/runs/$rid/caido.stdout.log" "$dest/caido.stdout.log" 2>/dev/null
  cp "$data"/logs/*.log "$dest/host.log" 2>/dev/null
  ls -la "$dest" >&2
}

# analyse_journal <label> <variant> — read the preserved journal OFFLINE and
# answer the ACTIVE-02 question: does the last unfinalised row correctly
# identify the send that was in flight when the host died?
analyse_journal() {
  local label="$1" variant="$2"
  python3 - "$RAW/$label" "$variant" <<'PY'
import json, os, sqlite3, sys, re
dest, variant = sys.argv[1], sys.argv[2]
dbp = os.path.join(dest, "journal.db")
out = {"variant": variant, "journal_present": os.path.isfile(dbp)}
if out["journal_present"]:
    # Opened read-WRITE on purpose: sqlite must be allowed to replay the WAL, or
    # rows committed just before the abort would be invisible.
    conn = sqlite3.connect(dbp)
    try:
        rows = list(conn.execute(
            "SELECT id, runtime_session_id, seq, variant, normalized_candidate, "
            "started_at, finished_at, status, http_code, elapsed_ms, error "
            "FROM send_journal ORDER BY seq ASC"))
    except sqlite3.Error as e:
        out["journal_error"] = str(e); rows = []
    cols = ["id","rs","seq","variant","candidate","started_at","finished_at",
            "status","http_code","elapsed_ms","error"]
    recs = [dict(zip(cols, r)) for r in rows]
    out["total_rows"] = len(recs)
    out["finalised"] = sum(1 for r in recs if r["finished_at"] is not None)
    out["unfinalised"] = sum(1 for r in recs if r["finished_at"] is None)
    out["ok"] = sum(1 for r in recs if r["status"] == "ok")
    out["errors"] = sum(1 for r in recs if r["status"] == "error")
    out["distinct_runtime_sessions"] = sorted({r["rs"] for r in recs})
    open_rows = [r for r in recs if r["finished_at"] is None]
    out["open_rows"] = open_rows[-5:]
    fin = [r for r in recs if r["finished_at"] is not None]
    out["last_finalised_seq"] = fin[-1]["seq"] if fin else None
    out["max_seq"] = recs[-1]["seq"] if recs else None
    # THE measurement: an in-flight send is identified iff exactly one row is
    # open and its seq is the one immediately after the last finalised send.
    if len(open_rows) == 1 and fin:
        out["inflight_seq"] = open_rows[0]["seq"]
        out["inflight_candidate"] = open_rows[0]["candidate"]
        out["inflight_is_next_after_last_finalised"] = (
            open_rows[0]["seq"] == fin[-1]["seq"] + 1)
    elif len(open_rows) == 1 and not fin:
        out["inflight_seq"] = open_rows[0]["seq"]
        out["inflight_candidate"] = open_rows[0]["candidate"]
        out["inflight_is_next_after_last_finalised"] = open_rows[0]["seq"] == 1
    else:
        out["inflight_seq"] = None
        out["inflight_candidate"] = None
        out["inflight_is_next_after_last_finalised"] = None
    out["kill_phase_rows"] = None  # filled by the caller-supplied boundary below
    lat = [r["elapsed_ms"] for r in recs if r["elapsed_ms"] is not None]
    out["latency_count"] = len(lat)
    if lat:
        s = sorted(lat)
        out["latency_median_ms"] = round(s[len(s)//2], 3)
        out["latency_p95_ms"] = round(s[int(len(s)*0.95)-1 if len(s) > 1 else 0], 3)
        out["latency_max_ms"] = round(max(lat), 3)
        out["latency_first10_median_ms"] = round(sorted(lat[:10])[len(lat[:10])//2], 3) if len(lat) >= 3 else None
        out["latency_last10_median_ms"] = round(sorted(lat[-10:])[len(lat[-10:])//2], 3) if len(lat) >= 3 else None
    out["latencies_ms"] = lat

# The abort signature never reaches the structured log. Scan the raw channels.
sig = {}
for name in ("caido.stderr.log", "caido.stdout.log", "host.log"):
    p = os.path.join(dest, name)
    if not os.path.isfile(p):
        sig[name] = {"present": False}
        continue
    hits, lines = [], 0
    with open(p, errors="replace") as fh:
        for line in fh:
            lines += 1
            if re.search(r"ref_count|gc_decref|Assertion failed|assert|panicked|abort|SIGABRT|out of memory",
                         line, re.I):
                if len(hits) < 8:
                    hits.append(line.strip()[:300])
    sig[name] = {"present": True, "lines": lines, "hits": hits, "hit_count": len(hits)}
out["abort_signature_scan"] = sig
print(json.dumps(out, indent=2))
PY
}

TARGET="http://127.0.0.1:$ORIGIN_PORT/_synth?bytes=$SYNTH_BYTES&status=200"

# ===========================================================================
# run_variant <variant> <port>
# ===========================================================================
run_variant() {
  local variant="$1" port="$2"
  local label="${3:-$variant}"
  local RETAIN="${4:-false}"
  echo "=== SPIKE-04 $label (variant $variant, retain=$RETAIN) on port $port (FRESH instance) ===" >&2
  up "$port" || return 1
  local rid="$RUN_ID"
  local sess
  sess="$(call_backend session '[]' 30 | decode_returns)"
  echo "  runtime session: $sess" >&2

  local seq=1 completed=0 batches=0 mode="" fail_seq="" fail_reason=""
  : > "$RAW/$label-batches.jsonl"
  while [ "$seq" -le "$MAX_SENDS" ]; do
    local t0 t1 ms rc resp
    t0="$(python3 -c 'import time; print(time.time())')"
    resp="$(call_backend run "$(jargs "$variant" "$TARGET" "$BATCH" "$seq" "$RETAIN")" "$BATCH_TIMEOUT_S")"
    rc=$?
    t1="$(python3 -c 'import time; print(time.time())')"
    ms="$(python3 -c "print(round(($t1-$t0)*1000,1))")"

    local alive=1
    kill -0 "$CAIDO_PID" 2>/dev/null || alive=0

    local decoded
    decoded="$(printf '%s' "$resp" | decode_returns)"
    local batch_completed
    batch_completed="$(python3 -c '
import json,sys
d=json.loads(sys.argv[1])
print(d.get("completed", 0) if "_error" not in d else -1)' "$decoded")"

    python3 - "$RAW/$label-batches.jsonl" "$seq" "$ms" "$rc" "$alive" "$batch_completed" "$decoded" <<'PY'
import json, sys
path, seq, ms, rc, alive, done, decoded = sys.argv[1:8]
try:
    d = json.loads(decoded)
except Exception:
    d = {"_error": "undecodable"}
with open(path, "a") as fh:
    fh.write(json.dumps({
        "start_seq": int(seq), "batch_wall_ms": float(ms), "curl_rc": int(rc),
        "host_alive_after": alive == "1", "batch_completed": int(done),
        "result": d,
    }) + "\n")
PY

    batches=$((batches + 1))
    echo "  seq=$seq rc=$rc alive=$alive done=$batch_completed wall=${ms}ms" >&2

    if [ "$alive" = "0" ]; then
      mode="abort"; fail_seq="$seq"; fail_reason="host process died during batch starting at seq $seq"
      break
    fi
    if [ "$rc" = "28" ]; then
      mode="stall"; fail_seq="$seq"; fail_reason="batch exceeded ${BATCH_TIMEOUT_S}s with the host still alive"
      break
    fi
    if [ "$batch_completed" -lt 0 ]; then
      mode="error"; fail_seq="$seq"; fail_reason="function call returned a non-success envelope"
      break
    fi
    completed=$((completed + batch_completed))
    if [ "$batch_completed" -lt "$BATCH" ]; then
      mode="partial"; fail_seq="$seq"; fail_reason="batch completed $batch_completed of $BATCH sends"
      break
    fi
    seq=$((seq + BATCH))
  done
  [ -z "$mode" ] && { mode="clean"; fail_reason="reached the $MAX_SENDS cap with every send completing"; }

  # In-runtime read-back, when there IS still a runtime to ask.
  local host_alive_final=1
  kill -0 "$CAIDO_PID" 2>/dev/null || host_alive_final=0
  if [ "$host_alive_final" = "1" ]; then
    call_backend journal_read '[]' 60 | decode_returns > "$RAW/$label-journal-inruntime.json"
  else
    echo '{"_note":"host was already dead; journal read offline only"}' > "$RAW/$label-journal-inruntime.json"
  fi

  # ---- kill-in-flight ----------------------------------------------------
  # Only when the host survived the loop. If it aborted on its own, that abort
  # already provided the in-flight case and staging a second one would overwrite
  # the more interesting evidence.
  local kill_start_seq="" killed_in_flight=false
  if [ "$host_alive_final" = "1" ]; then
    kill_start_seq="$seq"
    echo "  kill-in-flight: firing a $KILL_BATCH-send batch from seq $kill_start_seq, SIGKILL in ${KILL_DELAY_S}s" >&2
    ( call_backend run "$(jargs "$variant" "$TARGET" "$KILL_BATCH" "$kill_start_seq" "$RETAIN")" 120 \
        > "$RAW/$label-kill-batch.raw" 2>/dev/null; echo "$?" > "$RAW/$label-kill-batch.rc" ) &
    local killcurl=$!
    sleep "$KILL_DELAY_S"
    if kill -0 "$CAIDO_PID" 2>/dev/null; then
      kill -9 "$CAIDO_PID" 2>/dev/null
      killed_in_flight=true
    fi
    sleep 1
    kill -9 "$killcurl" 2>/dev/null
  fi

  preserve_evidence "$label"
  local data="$DATA"
  teardown "$CAIDO_PID" "$rid" "$data" >/dev/null
  analyse_journal "$label" "$variant" > "$RAW/$label-journal.json"

  python3 - "$RAW/$label-run.json" "$rid" "$variant" "$port" "$mode" "$completed" \
      "$fail_seq" "$fail_reason" "$host_alive_final" "$OUT/runs/$rid/instance.json" \
      "$TARGET" "$sess" "$kill_start_seq" "$killed_in_flight" "$RETAIN" <<'PY'
import json, sys
(out, rid, variant, port, mode, completed, fail_seq, reason, alive, instp, target,
 sess, kill_start_seq, killed_in_flight, retain) = sys.argv[1:16]
inst = json.load(open(instp))
try:
    sessd = json.loads(sess)
except Exception:
    sessd = {"_raw": sess[:200]}
json.dump({
    "variant": variant,
    "run_id": rid,
    "listen": inst.get("listen"),
    "fresh": inst.get("fresh", True),
    "flags": inst.get("flags", []),
    "data_path": inst.get("data_path"),
    "exit_code": inst.get("exit_code"),
    "project_persistence": "temporary",
    "target": target,
    "runtime_session": sessd,
    "failure_mode": mode,
    "sends_completed": int(completed),
    "failed_at_seq": int(fail_seq) if fail_seq else None,
    "failure_reason": reason,
    "host_alive_at_end": alive == "1",
    "retain_wrappers": retain == "true",
    # The capped loop and the kill phase are separate populations. Conflating
    # them would inflate the cliff figure with sends that only exist to be
    # interrupted.
    "kill_phase_start_seq": int(kill_start_seq) if kill_start_seq else None,
    "killed_in_flight": killed_in_flight == "true",
}, open(out, "w"), indent=2)
PY
  echo "  -> $variant: mode=$mode completed=$completed exit=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("exit_code"))' "$OUT/runs/$rid/instance.json")" >&2
}

start_origin || exit 1

for spec in "save-true:8984" "save-false:8985" "fetch:8981"; do
  v="${spec%%:*}"; p="${spec#*:}"
  case " $VARIANTS " in *" $v "*) run_variant "$v" "$p" ;; esac
done

# ---------------------------------------------------------------------------
# THE CONTROL, and it is not optional decoration.
#
# The three variants above follow ACTIVE-09's discipline exactly as the plan
# specifies: wrappers reduced to primitives inside a frame that returns before
# the journal's await, never retained. But live wrapper pressure IS #2211's
# mechanism, so that discipline is the MITIGATION. A disciplined run that
# reports "no cliff" has measured the mitigation working, and reporting it as
# "the leak does not reproduce" would be a category error with the same shape as
# reporting an undefined rate as zero.
#
# This run is byte-identical except that every RequestSpec, payload, Request,
# Response and Body is retained — the naive shape a plugin author writes by
# accident. Its own FRESH instance, because the leak is cumulative. It answers
# whether there is a leak to reset at all, which is the precondition for
# SPIKE-04b's question, and it is recorded there.
if [ "${DO_RETAIN_CONTROL:-1}" = "1" ]; then
  run_variant save-true 8985 retain-control true
fi

# ===========================================================================
# SPIKE-04b — does toggling the plugin off and on RESET the #2211 leak?
#
# A FOURTH fresh instance, pinned to 8983. Not 8982: SPIKE-01 stage 2 leaves
# that instance wedged, and although it is killed, pinning here removes any
# question about what was measured on what.
#
# The sharpest instrument is the probe's runtime session id. It is minted once
# per MODULE INSTANTIATION, so if it changes across a toggle the QuickJS runtime
# was genuinely torn down and re-created — which is the only mechanism by which
# a toggle could reset a cumulative refcount leak.
# ===========================================================================
if [ "$DO_04B" = "1" ]; then
  echo "=== SPIKE-04b: does a plugin toggle reset the leak? port 8983 (FRESH) ===" >&2

  # Send just BELOW the cliff, per the plan — but "the cliff" has to be a cliff
  # that exists. If the disciplined save:true run never failed inside the cap
  # there is nothing to observe resetting, so the retain-shape control becomes
  # the reference and 04b runs the retain shape: a toggle can only be shown to
  # reset a leak on a shape that leaks.
  eval "$(python3 scripts/spike/pick-04b-reference.py \
            "$RAW/save-true-run.json" "$RAW/retain-control-run.json" "$MAX_SENDS")"
  export RETAIN_04B
  echo "  reference = $REF (source $REF_SOURCE); each leg sends $LEG; retain=$RETAIN_04B" >&2

  if up 8983; then
    RID_04B="$RUN_ID"
    : > "$RAW/04b-legs.jsonl"
    SEQ=1
    TOTAL=0
    for leg in 1 2 3; do
      SESS="$(call_backend session '[]' 30 | decode_returns)"
      RS="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1]).get("runtime_session_id"))' "$SESS")"
      BEFORE="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1]).get("sends_this_runtime"))' "$SESS")"
      echo "  leg $leg: rs=$RS sends_this_runtime=$BEFORE" >&2

      LEG_DONE=0
      LEG_MODE="clean"
      END=$((SEQ + LEG))
      while [ "$SEQ" -lt "$END" ]; do
        RESP="$(call_backend run "$(jargs save-true "$TARGET" "$BATCH" "$SEQ" "${RETAIN_04B:-true}")" "$BATCH_TIMEOUT_S")"
        RC=$?
        ALIVE=1; kill -0 "$CAIDO_PID" 2>/dev/null || ALIVE=0
        DEC="$(printf '%s' "$RESP" | decode_returns)"
        N="$(python3 -c '
import json,sys
d=json.loads(sys.argv[1]); print(d.get("completed",0) if "_error" not in d else -1)' "$DEC")"
        if [ "$ALIVE" = "0" ]; then LEG_MODE="abort"; break; fi
        if [ "$RC" = "28" ]; then LEG_MODE="stall"; break; fi
        if [ "$N" -lt 0 ]; then LEG_MODE="error"; break; fi
        LEG_DONE=$((LEG_DONE + N))
        TOTAL=$((TOTAL + N))
        SEQ=$((SEQ + BATCH))
        [ "$N" -lt "$BATCH" ] && { LEG_MODE="partial"; break; }
      done

      AFTER="$(call_backend session '[]' 30 | decode_returns)"
      printf '{"leg":%s,"runtime_session_before":%s,"sends_this_leg":%s,"cumulative_sends":%s,"mode":"%s","session_after":%s}\n' \
        "$leg" "$SESS" "$LEG_DONE" "$TOTAL" "$LEG_MODE" "$AFTER" >> "$RAW/04b-legs.jsonl"
      echo "  leg $leg done: $LEG_DONE sends (cumulative $TOTAL) mode=$LEG_MODE" >&2
      [ "$LEG_MODE" = "abort" ] && break
      [ "$leg" = "3" ] && break

      # ---- the toggle. Twice over the run, to distinguish a real reset from
      # a one-off. NO RETRY LOOP: if a toggle blocks, that is the finding.
      echo "  toggling plugin OFF ..." >&2
      gql "{\"query\":\"mutation{ togglePlugin(id:\\\"$BACKEND_ID\\\", enabled:false){ plugin{ id } error{ __typename } } }\"}" 90 \
        > "$RAW/04b-toggle-off-$leg.json"
      OFF_RC=$?
      sleep 2
      echo "  toggling plugin ON ..." >&2
      gql "{\"query\":\"mutation{ togglePlugin(id:\\\"$BACKEND_ID\\\", enabled:true){ plugin{ id } error{ __typename } } }\"}" 90 \
        > "$RAW/04b-toggle-on-$leg.json"
      ON_RC=$?
      echo "  toggle rc off=$OFF_RC on=$ON_RC" >&2
      # Wait for the executor to come back rather than sleeping and hoping.
      for _ in $(seq 1 30); do
        call_backend session '[]' 10 | grep -q '"kind":"success"' && break
        sleep 1
      done
    done

    ALIVE_END=1; kill -0 "$CAIDO_PID" 2>/dev/null || ALIVE_END=0
    if [ "$ALIVE_END" = "1" ]; then
      call_backend journal_read '[]' 60 | decode_returns > "$RAW/04b-journal-inruntime.json"
    fi
    preserve_evidence "04b"
    D="$DATA"
    teardown "$CAIDO_PID" "$RID_04B" "$D" >/dev/null
    analyse_journal "04b" "save-true" > "$RAW/04b-journal.json"
    python3 - "$RAW/04b-run.json" "$RID_04B" "$OUT/runs/$RID_04B/instance.json" "$TOTAL" "$LEG" "$REF" "$REF_SOURCE" "$RETAIN_04B" <<'PY'
import json, sys
out, rid, instp, total, leg, ref, ref_source, retain = sys.argv[1:9]
inst = json.load(open(instp))
json.dump({
    "run_id": rid,
    "listen": inst.get("listen"),
    "fresh": inst.get("fresh", True),
    "flags": inst.get("flags", []),
    "data_path": inst.get("data_path"),
    "exit_code": inst.get("exit_code"),
    "project_persistence": "temporary",
    "sends_per_leg": int(leg),
    "save_true_reference": int(ref),
    "reference_source": ref_source,
    "retain_wrappers": retain == "true",
    "total_sends_across_legs": int(total),
}, open(out, "w"), indent=2)
PY
    echo "  -> 04b: total=$TOTAL across legs of $LEG (save:true reference $REF)" >&2
  fi
fi

echo "=== send-cliff.sh done; artifacts in $RAW ===" >&2
