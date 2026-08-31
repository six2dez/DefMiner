#!/usr/bin/env bash
# scripts/phase6/o07-body-length.sh — the O-07 probe.
#
# THE QUESTION IN WORDS: does `Body.length` on a response returned by
# `sdk.requests.get()` and by `sdk.requests.query()` report the DECOMPRESSED
# identity byte count, or the WIRE byte count?
#
# WHY IT MATTERS. `admit()`'s size axis is a security control — it is what keeps
# an oversized body from taking `caido-cli` down under `panic = "abort"` — and it
# is written against the decompressed count, because that is the quantity
# SPIKE-08's SIZE_GATE_SOURCE named. Compression ratios on this project's own
# corpus ran to 7.25x. If a STORED response reports the wire count instead, the
# ceiling admits up to 7.25x more bytes than intended, and it does so ON THE
# RETRO PATH ONLY — a hole that exists nowhere in the passive pipeline and would
# therefore never show up in anything Phase 1 measured.
#
# WHY IT IS OPEN AT ALL. SPIKE-08's method names ONE surface: "twice through the
# Caido proxy… A Tier-0 probe recorded, per INTERCEPTED RESPONSE…". Neither
# `sdk.requests.get()` nor `sdk.requests.query()` appears anywhere in it. So
# SIZE_GATE_SOURCE, BODY_STORED_DECOMPRESSED and BODY_LENGTH_EQUALS_RAW_LENGTH
# are facts about the HOOK, all three carry SPIKE-08, and re-quoting any of them
# as an answer about a read path would be the "asserted in four places, gated in
# one" failure `.planning/STATE.md` names as this project's recurring shape.
#
# WHAT THIS RUN PRODUCES, AND WHAT EACH LEG IS FOR:
#   1. `counters.byteLenMismatch` off the SHIPPED plugin's `getStatus`, after the
#      consumer has drained. A shipped, already-running instrument — not new code.
#      It compares the hook's `Body.length` against `toRaw().length` on the
#      RELOADED response, so it says whether the two AGREE. It cannot by itself
#      say what either one IS, which is why leg 2 exists.
#   2. A direct per-encoding measurement through `probe/phase6-o07`:
#      `sdk.requests.get(id)` and `sdk.requests.query()…execute()`, each compared
#      against the fixture's KNOWN identity byte count and against the wire byte
#      count the origin actually sent on an unproxied control fetch.
#
# PORTS. This phase owns 8961-8965, a block below every one already spoken for:
#   8080       the operator's LIVE Caido desktop instance with real project data.
#   8998       the long-lived SPIKE-10 recorder instance. NEVER killed by anything
#              here — nothing in this script kills a process it did not start.
#   8999, 8991-8996, 8981-8985, 8081-8083   Phase 0's.
#   8971-8975  Phase 1's (scripts/phase1/env.sh).
#
# WHAT THIS SCRIPT WILL NOT DO. It will not write into
# `.planning/phases/00-runtime-reality-check/results/`, it will not touch a Phase 0
# threshold artifact, it will not invoke bare `caido-cli` from PATH (a stale
# 0.55.3 on this machine), and it will not record ANYTHING if the binary reports a
# version other than the pinned constant below.
set -euo pipefail

cd "$(dirname "$0")/../.."

# THIS PHASE'S OWN PINNED VERSION (D-21). `scripts/spike/instance.sh` defaults to
# Phase 0's 0.57.1 and `tests/phase1-*.spec.ts` pin the same value; both are
# deliberate fail-closed tripwires over artifacts measured on that build, and
# neither is edited from here. This value is passed IN as EXPECT_VERSION.
MATRIX_EXPECTED_VERSION="0.58.2"

export EXPECT_VERSION="$MATRIX_EXPECTED_VERSION"
export CAIDO_BIN="${CAIDO_BIN:-/Applications/Caido.app/Contents/Resources/bin/caido-cli}"
export PORT="${PORT:-8961}"
ORIGIN_PORT="${ORIGIN_PORT:-8962}"

RESULTS=".planning/phases/06-retroactive-scan-deployment-reality/results"
export OUT="${OUT:-$RESULTS}"
ARTIFACT="$RESULTS/o07-body-length.json"
SCHEMA="$RESULTS/o07-body-length.schema.json"
ENCODED_DIR="corpus/encoded"
FIXTURE="ace-small.js"
ENCODINGS="identity gzip br zstd"
# ace-small.js and not babel-large.js, and the reason is a property of the
# SUBJECT rather than a convenience: AST_MAX_BYTES is 1,334,405 decompressed
# bytes and babel-large.js is 2,983,904, so `admit()` rejects it `too_large`, it
# never enters the queue, it is never reloaded, and it could contribute nothing
# to `byteLenMismatch`. One fixture across four encodings also makes every block
# in the artifact differ by ENCODING alone, which is the comparison being made.

# ---------------------------------------------------------------------------
# GATE 0 — the binary, BEFORE anything is launched or written.
#
# instance.sh runs this same check and would refuse too. It is repeated here for
# one reason: on a mismatch this script must write NOTHING AT ALL, and by the
# time instance.sh has failed we are already inside the run.
# ---------------------------------------------------------------------------
[ -x "$CAIDO_BIN" ] || {
  echo "FATAL: $CAIDO_BIN is not executable" >&2; exit 1; }
REPORTED_VERSION="$("$CAIDO_BIN" --version 2>/dev/null | awk '{print $2}')"
if [ "$REPORTED_VERSION" != "$MATRIX_EXPECTED_VERSION" ]; then
  echo "FATAL: version mismatch. expected $MATRIX_EXPECTED_VERSION, got ${REPORTED_VERSION:-<none>} ($CAIDO_BIN)" >&2
  echo "       Refusing to record any measurement against an unexpected build (D-21)." >&2
  echo "       NOTE: bare 'caido-cli' on PATH resolves to a STALE 0.55.3 on this machine." >&2
  exit 1
fi
BINARY_SHA="$(shasum -a 256 "$CAIDO_BIN" | cut -d' ' -f1)"
echo "binary      : $CAIDO_BIN reports $REPORTED_VERSION" >&2

mkdir -p "$RESULTS"

HOST_OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
HOST_RELEASE="$(uname -r)"
HOST_ARCH="$(uname -m)"
HOST_CORES="$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 0)"

# ---------------------------------------------------------------------------
# NOT RUN — D-23's discipline, as a function.
#
# A leg that could not run is recorded WITH ITS REASON and never as a pass. The
# artifact still names its binary, still validates against the schema, and still
# carries the four encoding blocks — with nulls, so that "not measured" is
# visibly not "measured as zero".
# ---------------------------------------------------------------------------
write_not_run() {
  local reason="$1"
  echo "NOT RUN: $reason" >&2
  REASON="$reason" \
  ART="$ARTIFACT" BIN_PATH="$CAIDO_BIN" EXPECTED="$MATRIX_EXPECTED_VERSION" \
  REPORTED="$REPORTED_VERSION" BSHA="$BINARY_SHA" LISTEN="127.0.0.1:$PORT" \
  RID="${RUN_ID:-not-run}" HOS="$HOST_OS" HREL="$HOST_RELEASE" HARCH="$HOST_ARCH" \
  HCORES="$HOST_CORES" ENCS="$ENCODINGS" FIX="$FIXTURE" \
  python3 - <<'PY'
import datetime, json, os
encs = os.environ["ENCS"].split()
doc = {
    "$schema": "./o07-body-length.schema.json",
    "probe": "O-07",
    "status": "not_run",
    "reason": os.environ["REASON"],
    "recorded_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "binary": {
        "path": os.environ["BIN_PATH"],
        "expected_version": os.environ["EXPECTED"],
        "reported_version": os.environ["REPORTED"],
        "sha256": os.environ["BSHA"],
    },
    "host": {
        "os": os.environ["HOS"], "release": os.environ["HREL"],
        "arch": os.environ["HARCH"], "cores": int(os.environ["HCORES"] or 0),
    },
    "instances": [{"run_id": os.environ["RID"], "listen": os.environ["LISTEN"]}],
    "method": "The run did not reach the measurement. See `reason`.",
    "measurements": {
        "byte_len_mismatch": 0,
        "reload_pairs_compared": None,
        **{e: {
            "fixture": os.environ["FIX"],
            "identity_byte_len": None, "hook_body_length": None,
            "reload_raw_length": None, "query_body_length": None,
            "wire_byte_len": None,
        } for e in encs},
    },
    "verdict": {
        "get_path_reports": "not_measured",
        "query_path_reports": "not_measured",
        "answer": "Not measured. " + os.environ["REASON"],
    },
    "requirements_affected": ["FIND-03"],
}
json.dump(doc, open(os.environ["ART"], "w"), indent=2)
open(os.environ["ART"], "a").write("\n")
PY
  node scripts/spike/validate-schema.mjs "$SCHEMA" "$ARTIFACT" >&2
  exit 0
}

# ---------------------------------------------------------------------------
# GATE 1 — the fixtures. Generated, gitignored and rebuilt rather than committed.
# ---------------------------------------------------------------------------
if [ ! -f "$ENCODED_DIR/fixtures.json" ] || [ ! -f "$ENCODED_DIR/$FIXTURE" ]; then
  write_not_run "the generated encoded corpus is absent — run: node scripts/spike/make-encoded-fixtures.mjs"
fi
IDENTITY_BYTES="$(wc -c < "$ENCODED_DIR/$FIXTURE" | tr -d ' ')"
echo "fixture     : $FIXTURE, $IDENTITY_BYTES identity bytes" >&2

# ---------------------------------------------------------------------------
# GATE 2 — the ports. instance.sh refuses 8080 unconditionally and refuses a
# port already in LISTEN; the origin port gets the same treatment here.
# ---------------------------------------------------------------------------
if [ "$ORIGIN_PORT" = "8080" ] || [ "$PORT" = "8080" ]; then
  echo "FATAL: refusing port 8080 — that is the operator's live Caido desktop instance." >&2
  exit 1
fi
if lsof -nP -iTCP:"$ORIGIN_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "FATAL: origin port $ORIGIN_PORT is already in LISTEN state. Refusing to collide." >&2
  exit 1
fi

ORIGIN_PID=""
cleanup() {
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  # ALWAYS instance.sh's own teardown — never a new kill. It force-kills (a
  # wedged QuickJS thread never honours SIGTERM), copies the host log out,
  # deletes the guest token and removes the isolated data directory.
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# The build. The SHIPPED plugin, unmodified — `byteLenMismatch` is only evidence
# if it comes from the build that ships.
# ---------------------------------------------------------------------------
pnpm exec caido-dev build packages >/dev/null
[ -f packages/dist/plugin_package/manifest.json ] || {
  echo "FATAL: build produced no plugin package" >&2; exit 1; }

# ---------------------------------------------------------------------------
# The origin.
# ---------------------------------------------------------------------------
mkdir -p .spike
python3 scripts/spike/origin.py --dir "$ENCODED_DIR" --port "$ORIGIN_PORT" \
  --headers "$ENCODED_DIR/origin-headers.json" > ".spike/o07-origin-$ORIGIN_PORT.log" 2>&1 &
ORIGIN_PID=$!
for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" && break
  kill -0 "$ORIGIN_PID" 2>/dev/null || {
    echo "origin died:" >&2; cat ".spike/o07-origin-$ORIGIN_PORT.log" >&2
    write_not_run "the local origin did not start"; }
  sleep 0.25
done
curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" || \
  write_not_run "the local origin did not become ready on $ORIGIN_PORT"
echo "origin      : up on 127.0.0.1:$ORIGIN_PORT" >&2

# ---------------------------------------------------------------------------
# The instance. SOURCED, never re-implemented: the absolute-app-path default, the
# version gate, the 8080 refusal, the LISTEN collision check, the polled
# readiness loop, the `umask 077` guest-token write and the always-SIGKILL
# teardown are already correct in that file and are not copied here.
# ---------------------------------------------------------------------------
# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

CAIDO_URL="http://127.0.0.1:$PORT"
TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"
RAW="$RUN_DIR/raw"
mkdir -p "$RAW"

gql() {
  curl -s -X POST "$CAIDO_URL/graphql" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "$1"
}

# A fresh Caido has NO project, and with none selected the proxy answers
# "Proxying error: Internal" and onInterceptResponse NEVER FIRES. A hard
# prerequisite for every traffic-observing run, not a nicety. A guest may create
# TEMPORARY projects only.
PROJECT_ID="$(gql '{"query":"mutation{ createProject(input:{name:\"phase6-o07\",temporary:true}){ project{ id } error{ __typename } } }"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["createProject"]; sys.exit("createProject failed: "+str(d["error"])) if d["error"] else print(d["project"]["id"])')"
gql "{\"query\":\"mutation{ selectProject(id:\\\"$PROJECT_ID\\\"){ error{ __typename } } }\"}" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["selectProject"]; sys.exit("selectProject failed: "+str(d["error"])) if d["error"] else None'
echo "project     : selected (temporary)" >&2

# TWO plugins, and each is load-bearing for a DIFFERENT leg.
#   defminer      — the shipped build, for `counters.byteLenMismatch`.
#   phase6-o07    — the read-path probe, for the direct per-encoding numbers.
# `probe_install` exports BACKEND_ID, so each id is captured immediately after
# its own install; the last install would otherwise silently own both legs.
probe_install packages/dist/plugin_package
DEFMINER_BACKEND="$BACKEND_ID"
DEFMINER_ZIP_SHA="$PROBE_ZIP_SHA"
probe_install probe/phase6-o07
O07_BACKEND="$BACKEND_ID"
O07_ZIP_SHA="$PROBE_ZIP_SHA"

# ---------------------------------------------------------------------------
# The fetches. Per encoding, TWO requests:
#   direct    — straight at the origin, no proxy, no --compressed. The
#               AUTHORITATIVE wire byte count, measured rather than taken from
#               the fixture manifest: origin.py compresses on demand with
#               Python's codecs, and the manifest's numbers came from Node's.
#   proxied   — through Caido with a matching Accept-Encoding, i.e. what a real
#               browser sends. This is the one the hook sees and the one the two
#               read paths later reload.
# `fx=` is a per-encoding tag carried in the query string so the hook rows can be
# attributed to an encoding without parsing anything.
# ---------------------------------------------------------------------------
FETCHES="$RAW/fetches.jsonl"
: > "$FETCHES"

accept_for() {
  case "$1" in
    gzip) echo "gzip" ;;
    br) echo "br" ;;
    zstd) echo "zstd" ;;
    *) echo "identity" ;;
  esac
}

for enc in $ENCODINGS; do
  tag="o07-$enc"
  url="http://127.0.0.1:$ORIGIN_PORT/$FIXTURE?encoding=$enc&fx=$tag"
  accept="$(accept_for "$enc")"

  direct="$(curl -s --max-time 120 -H "Accept-Encoding: $accept" \
    -o /dev/null -w '%{http_code} %{size_download}' "$url" || echo "000 0")"
  proxied="$(curl -s --max-time 120 --proxy "$CAIDO_URL" -H "Accept-Encoding: $accept" \
    -o /dev/null -w '%{http_code} %{size_download}' "$url" || echo "000 0")"

  python3 - "$enc" "$tag" "$accept" "$direct" "$proxied" >> "$FETCHES" <<'PY'
import json, sys
enc, tag, accept, direct, proxied = sys.argv[1:6]
def split(w):
    parts = (w.split() + ["0", "0"])[:2]
    return (int(parts[0]) if parts[0].isdigit() else None,
            int(parts[1]) if parts[1].isdigit() else None)
dcode, dbytes = split(direct)
pcode, pbytes = split(proxied)
print(json.dumps({
    "encoding": enc, "tag": tag, "accept_encoding_sent": accept,
    "direct_http_code": dcode, "direct_wire_bytes": dbytes,
    "proxied_http_code": pcode, "proxied_client_bytes": pbytes,
}))
PY
  echo "  $tag      : direct=$direct proxied=$proxied" >&2
  if [ "${direct%% *}" != "200" ] || [ "${proxied%% *}" != "200" ]; then
    write_not_run "the $enc leg did not return 200 (direct=$direct proxied=$proxied) — the encoding may be unavailable to scripts/spike/origin.py on this machine"
  fi
done

# ---------------------------------------------------------------------------
# Drain. POLLED, never slept-and-hoped: the consumer is asynchronous and a fixed
# sleep would read a number that had not finished moving.
# ---------------------------------------------------------------------------
status_json() { BACKEND_ID="$DEFMINER_BACKEND" probe_call getStatus '[]' 60; }
STATUS=""
for _ in $(seq 1 60); do
  STATUS="$(status_json || echo '{}')"
  done_n="$(printf '%s' "$STATUS" | python3 -c '
import json,sys
d=json.load(sys.stdin).get("counters",{}) or {}
print(int(d.get("reloadHit",0)) + int(d.get("reloadMissing",0)) + int(d.get("reloadNoResponse",0)))')"
  [ "${done_n:-0}" -ge 4 ] && break
  sleep 1
done
printf '%s' "$STATUS" > "$RAW/status.json"
echo "defminer    : $(printf '%s' "$STATUS" | python3 -c 'import json,sys; c=json.load(sys.stdin).get("counters",{}); print("admitted="+str(c.get("admitted"))+" reloadHit="+str(c.get("reloadHit"))+" byteLenMismatch="+str(c.get("byteLenMismatch")))')" >&2

# ---------------------------------------------------------------------------
# The two read legs, through the probe.
# ---------------------------------------------------------------------------
BACKEND_ID="$O07_BACKEND" probe_call hookRows '[]' 60 > "$RAW/hook-rows.json"
# ARGS CROSS THE PLUGIN-FUNCTION ROUTE DOUBLE-ENCODED, and both halves of that
# were MEASURED here rather than inferred:
#   * `{"args":[["1","2"]]}` is rejected outright — `invalid type: sequence,
#     expected a string`. Every element of `args` must be a STRING.
#   * a SINGLY-encoded string is JSON-decoded once by the route before the
#     handler sees it, so `"[\"1\",\"2\"]"` arrives as an ARRAY, gets
#     `String()`d to `1,2` and fails to re-parse with `unexpected data at the
#     end`. That was this probe's first failure and it is what named the shape.
# `jargs` is `scripts/spike/run-spike-09-12.sh`'s helper, copied rather than
# sourced (that file is a driver, not a library) and doing exactly what its own
# comment says: one `json.dumps` per argument, then one for the array.
jargs() {
  python3 -c 'import json,sys; print(json.dumps([json.dumps(a) for a in sys.argv[1:]]))' "$@"
}
IDS_JSON="$(python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
print(json.dumps([r["id"] for r in d["rows"]]))' "$RAW/hook-rows.json")"
BACKEND_ID="$O07_BACKEND" probe_call reloadMeasure "$(jargs "$IDS_JSON")" 120 > "$RAW/reload.json"
BACKEND_ID="$O07_BACKEND" probe_call queryMeasure "$(jargs 50)" 120 > "$RAW/query.json"

# ---------------------------------------------------------------------------
# Assemble, VALIDATE, then write. In that order: an artifact that does not
# validate must never reach the results directory at all.
# ---------------------------------------------------------------------------
TMP_ARTIFACT="$RAW/o07-body-length.candidate.json"
ART="$TMP_ARTIFACT" FETCHES="$FETCHES" HOOKS="$RAW/hook-rows.json" \
RELOAD="$RAW/reload.json" QUERY="$RAW/query.json" STATUSF="$RAW/status.json" \
BIN_PATH="$CAIDO_BIN" EXPECTED="$MATRIX_EXPECTED_VERSION" \
REPORTED="$REPORTED_VERSION" BSHA="$BINARY_SHA" LISTEN="127.0.0.1:$PORT" \
RID="$RUN_ID" HOS="$HOST_OS" HREL="$HOST_RELEASE" HARCH="$HOST_ARCH" \
HCORES="$HOST_CORES" ENCS="$ENCODINGS" FIX="$FIXTURE" IDBYTES="$IDENTITY_BYTES" \
DZIP="$DEFMINER_ZIP_SHA" PZIP="$O07_ZIP_SHA" \
python3 scripts/phase6/o07-assemble.py

node scripts/spike/validate-schema.mjs "$SCHEMA" "$TMP_ARTIFACT"
cp "$TMP_ARTIFACT" "$ARTIFACT"
echo "artifact    : $ARTIFACT" >&2
python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
print("verdict     : get()="+d["verdict"]["get_path_reports"]+"  query()="+d["verdict"]["query_path_reports"], file=sys.stderr)
print("status      : "+d["status"], file=sys.stderr)' "$ARTIFACT"

echo "O-07 done (run=$RUN_ID)" >&2
