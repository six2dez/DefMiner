#!/usr/bin/env bash
# scripts/phase1/runtime-answers.sh — measure RESEARCH.md Open Questions 1 and 2.
#
# Q1: what SQLite version does sdk.meta.db() expose? `ON CONFLICT ... DO UPDATE`
#     needs >= 3.24 and the Phase 1 upsert strategy has NO FALLBACK below it, yet
#     `SELECT sqlite_version()` was never run inside Caido in Phase 0
#     (assumption A6, confidence LOW).
#
# Q2: is a proxied request readable via sdk.requests.get(id) at the instant
#     onInterceptResponse fires, AND after a long queue delay? No probe in this
#     repo has ever called it (assumption A7, "the worst possible failure shape":
#     a lag means the consumer silently drops the NEWEST artifacts).
#
# The apparatus for Q2 is not a synthetic delay ladder but the real condition.
# Phase 0 measured Caido delivering 499 events in a single 20 ms burst after a
# block, and that backlog pushes later reloads seconds past their originating
# event on its own — which is exactly what A7 is uncertain about.
#
# Same instance/origin/install sequence as scripts/phase1/tracer-e2e.sh.
set -euo pipefail

cd "$(dirname "$0")/../.."

# shellcheck disable=SC1091
source scripts/phase1/env.sh

FIXTURE_NAME="defminer-runtime-fixture.js"
ANSWERS="$P1_OUT/runtime-answers.json"
IMMEDIATE_N=10
BURST_N=500
BURST_C=20

# --- preflight --------------------------------------------------------------
[ -x "$P1_CAIDO_BIN" ] || { echo "FATAL: $P1_CAIDO_BIN is not executable" >&2; exit 1; }
ACTUAL_VERSION="$("$P1_CAIDO_BIN" --version 2>/dev/null | awk '{print $2}')"
[ "$ACTUAL_VERSION" = "$P1_EXPECT_VERSION" ] || {
  echo "FATAL: expected Caido $P1_EXPECT_VERSION, got ${ACTUAL_VERSION:-<none>}" >&2; exit 1; }
for p in "$P1_CAIDO_PORT" "$P1_ORIGIN_PORT"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "FATAL: port $p is already in LISTEN state. Refusing to collide." >&2; exit 1
  fi
done

FIXDIR="$(mktemp -d "${TMPDIR:-/tmp}/defminer-answers.XXXXXX")"
{
  echo "// DefMiner Phase 1 runtime-answers fixture. Deterministic, never evaluated."
  echo "export const DEFMINER_ANSWERS = {"
  for i in $(seq 1 40); do
    echo "  key$i: \"value-$i-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\","
  done
  echo "};"
} > "$FIXDIR/$FIXTURE_NAME"
FIXTURE_SHA="$(shasum -a 256 "$FIXDIR/$FIXTURE_NAME" | cut -d' ' -f1)"

pnpm exec caido-dev build packages >/dev/null

# --- instance ---------------------------------------------------------------
ORIGIN_PID=""
SAMPLER_PID=""
cleanup() {
  [ -n "$SAMPLER_PID" ] && kill "$SAMPLER_PID" 2>/dev/null || true
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
  rm -rf "$FIXDIR"
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

CAIDO_URL="http://127.0.0.1:$PORT"
TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"
gql() {
  curl -s -X POST "$CAIDO_URL/graphql" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "$1"
}

python3 scripts/spike/origin.py --dir "$FIXDIR" --port "$P1_ORIGIN_PORT" \
  > "$RUN_DIR/origin-$P1_ORIGIN_PORT.log" 2>&1 &
ORIGIN_PID=$!
for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$P1_ORIGIN_PORT/_health" && break
  kill -0 "$ORIGIN_PID" 2>/dev/null || { echo "FATAL: origin died" >&2; exit 1; }
  sleep 0.25
done
curl -sf -o /dev/null "http://127.0.0.1:$P1_ORIGIN_PORT/_health" || {
  echo "FATAL: origin not ready" >&2; exit 1; }

PROJECT_ID="$(gql '{"query":"mutation{ createProject(input:{name:\"phase1-answers\",temporary:true}){ project{ id } error{ __typename } } }"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["createProject"]; sys.exit("createProject failed: "+str(d["error"])) if d["error"] else print(d["project"]["id"])')"
gql "{\"query\":\"mutation{ selectProject(id:\\\"$PROJECT_ID\\\"){ error{ __typename } } }\"}" >/dev/null
probe_install packages/dist/plugin_package

# Baseline BEFORE any traffic: every scenario figure below is a DELTA against the
# previous snapshot, because the counters are cumulative for the plugin's lifetime
# and a raw reading would attribute the first scenario's work to the second.
probe_call getStatus '[]' 60 > "$RUN_DIR/status-baseline.json"

# settle: wait until `processed` has not advanced for `stable` consecutive reads.
settle() {
  local stable=0 last=-1 cur i
  for i in $(seq 1 120); do
    cur="$(probe_call getStatus '[]' 60 \
      | python3 -c 'import json,sys; print((json.load(sys.stdin).get("counters") or {}).get("processed",0))')"
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

# --- scenario 1: reload_immediate -------------------------------------------
# Sequential requests at concurrency 1. Each event is delivered while the consumer
# is essentially idle, so this is the "at the instant the hook fires" leg.
echo "scenario reload_immediate: $IMMEDIATE_N requests, concurrency 1" >&2
for i in $(seq 1 "$IMMEDIATE_N"); do
  curl -s --max-time 60 --proxy "$CAIDO_URL" -o /dev/null \
    "http://127.0.0.1:$P1_ORIGIN_PORT/$FIXTURE_NAME?imm=$i" >/dev/null
done
settle
probe_call getStatus '[]' 60 > "$RUN_DIR/status-immediate.json"

# --- scenario 2: reload_after_burst -----------------------------------------
# 500 requests at concurrency 20 through the same instance. The backlog is what
# pushes later reloads seconds past their originating event.
echo "scenario reload_after_burst: $BURST_N requests, concurrency $BURST_C" >&2
SAMPLES="$RUN_DIR/queue-depth-samples.jsonl"
: > "$SAMPLES"
# The flag file is created BEFORE the sampler launches. The other order is a race
# the sampler always loses: it evaluates the guard immediately and exits, and the
# scenario then reports a null peak depth having sampled nothing.
touch "$RUN_DIR/.sampling"
(
  while [ -f "$RUN_DIR/.sampling" ]; do
    probe_call getStatus '[]' 30 >> "$SAMPLES" 2>/dev/null || true
    sleep 0.1
  done
) &
SAMPLER_PID=$!

scripts/spike/load.sh -n "$BURST_N" -c "$BURST_C" -u "/$FIXTURE_NAME" \
  -o "127.0.0.1:$P1_ORIGIN_PORT" > "$RUN_DIR/load.json" 2>"$RUN_DIR/load.err" || true
settle
rm -f "$RUN_DIR/.sampling"
wait "$SAMPLER_PID" 2>/dev/null || true
SAMPLER_PID=""
probe_call getStatus '[]' 60 > "$RUN_DIR/status-burst.json"

# --- the durable evidence ---------------------------------------------------
probe_call getArtifacts '[]' 120 > "$RUN_DIR/artifacts.json"

python3 - "$ANSWERS" "$RUN_DIR" "$OUT/runs/$RUN_ID/instance.json" "$FIXTURE_NAME" \
         "$FIXTURE_SHA" "$IMMEDIATE_N" "$BURST_N" "$BURST_C" <<'PY'
import datetime, json, os, sys

answers, run_dir, instance_path, fixture, fixture_sha, imm_n, burst_n, burst_c = sys.argv[1:9]

def load(name):
    p = os.path.join(run_dir, name)
    if not os.path.exists(p):
        return None
    try:
        with open(p) as fh:
            return json.load(fh)
    except Exception:
        return None

inst = json.load(open(instance_path))
base = load("status-baseline.json")
imm  = load("status-immediate.json")
burst = load("status-burst.json")
arts = load("artifacts.json") or []

def counters(st):
    return (st or {}).get("counters") or {}

def scenario(before, after, name, requests, concurrency, extra=None):
    """A missing scenario is null WITH A REASON, never a zero — a zero here reads
    as 'measured and found to be none', which is a different claim entirely."""
    if before is None or after is None:
        return {"scenario": name, "measured": None,
                "reason": "the getStatus snapshot for this scenario was not produced"}
    b, a = counters(before), counters(after)
    d = {
        "scenario": name,
        "measured": True,
        "requests_issued": requests,
        "concurrency": concurrency,
        "processed": a.get("processed", 0) - b.get("processed", 0),
        "reloadHit": a.get("reloadHit", 0) - b.get("reloadHit", 0),
        "reloadMissing": a.get("reloadMissing", 0) - b.get("reloadMissing", 0),
        "reloadEmptyBody": a.get("reloadEmptyBody", 0) - b.get("reloadEmptyBody", 0),
        "admitted": a.get("admitted", 0) - b.get("admitted", 0),
        "storeErrors": a.get("storeErrors", 0) - b.get("storeErrors", 0),
        "consumerErrors": a.get("consumerErrors", 0) - b.get("consumerErrors", 0),
        # maxEventToReloadMs is a running MAXIMUM, not a counter: it is reported as
        # observed rather than differenced.
        "maxEventToReloadMs": after.get("maxEventToReloadMs"),
    }
    if extra:
        d.update(extra)
    return d

# Peak queue depth, sampled from OUTSIDE the plugin while the burst ran. A starved
# thread cannot report that it is starved, so the instrument is external
# (Pitfall 8).
peak_depth = None
overflow = None
samples = 0
sp = os.path.join(run_dir, "queue-depth-samples.jsonl")
if os.path.exists(sp):
    depths, overflows = [], []
    with open(sp) as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                s = json.loads(line)
            except Exception:
                continue
            samples += 1
            if isinstance(s.get("queueDepth"), int):
                depths.append(s["queueDepth"])
            if isinstance(s.get("queueOverflowCount"), int):
                overflows.append(s["queueOverflowCount"])
    if depths:
        peak_depth = max(depths)
    if overflows:
        overflow = max(overflows)

burst_extra = {
    "peakQueueDepth": peak_depth,
    "peakQueueDepthSamples": samples,
    "overflow": overflow if overflow is not None else (burst or {}).get("queueOverflowCount"),
}
if peak_depth is None:
    burst_extra["peakQueueDepthReason"] = "the external sampler produced no readable sample"

# ON CONFLICT DO UPDATE is recorded as EXERCISED, not inferred from the version
# string: the same bytes were proxied many times and the upsert had to collapse
# them into one row with an incremented count for this to be true.
total_processed = counters(burst).get("processed", 0) if burst else 0
on_conflict = None
on_conflict_reason = None
if len(arts) == 1 and total_processed >= 2:
    seen = arts[0].get("seen_count")
    on_conflict = (seen == total_processed)
    if not on_conflict:
        on_conflict_reason = (
            f"one artifact row exists but seen_count is {seen!r} against "
            f"{total_processed} processed artifacts")
else:
    on_conflict_reason = (
        f"expected exactly 1 artifact row after {total_processed} processed sightings "
        f"of one fixture, found {len(arts)}")

out = {
    "generated_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "question": {
        "q1": "RESEARCH.md Open Question 1 — what SQLite version does sdk.meta.db() expose?",
        "q2": "RESEARCH.md Open Question 2 — is sdk.requests.get(id) readable at the "
              "instant the hook fires, and after a long queue delay?",
    },
    # Two SEPARATE fields, never one derived from the other.
    "reported_version": inst["binary"]["reported_version"],
    "expected_version": inst["binary"]["expected_version"],
    # What the PLUGIN saw from inside the runtime, as a cross-check on the binary.
    "caido_version_inside_plugin": (burst or imm or base or {}).get("caidoVersion"),
    "binary": inst["binary"],
    "run_id": inst["run_id"],
    "sqlite_version": (burst or imm or base or {}).get("sqliteVersion"),
    "schema_version": (burst or imm or base or {}).get("schemaVersion"),
    "features": {
        "on_conflict_do_update": on_conflict,
        "on_conflict_do_update_reason": on_conflict_reason,
        "on_conflict_do_update_method":
            "exercised — one fixture proxied many times must collapse to a single "
            "artifacts row whose seen_count equals the processed count",
    },
    # The synthetic fixture and NOTHING else. No target URL, no response body, no
    # header value is recorded anywhere in this file.
    "fixture": {"path": "/" + fixture, "sha256": fixture_sha,
                "origin": "scripts/spike/origin.py on 127.0.0.1"},
    "scenarios": {
        "reload_immediate": scenario(base, imm, "reload_immediate", int(imm_n), 1),
        "reload_after_burst": scenario(imm, burst, "reload_after_burst",
                                       int(burst_n), int(burst_c), burst_extra),
    },
}

with open(answers, "w") as fh:
    json.dump(out, fh, indent=2)
    fh.write("\n")

print()
print("sqlite inside Caido       :", out["sqlite_version"])
print("reported / expected       :", out["reported_version"], "/", out["expected_version"])
print("ON CONFLICT DO UPDATE     :", out["features"]["on_conflict_do_update"])
for k, s in out["scenarios"].items():
    print(f"{k:26}: processed={s.get('processed')} reloadHit={s.get('reloadHit')} "
          f"reloadMissing={s.get('reloadMissing')} maxEventToReloadMs="
          f"{s.get('maxEventToReloadMs')}" +
          (f" peakQueueDepth={s.get('peakQueueDepth')} overflow={s.get('overflow')}"
           if "peakQueueDepth" in s else ""))
print()
print("wrote", answers)
PY
