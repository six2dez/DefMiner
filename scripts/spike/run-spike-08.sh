#!/usr/bin/env bash
# scripts/spike/run-spike-08.sh — SPIKE-08 driver.
#
# The question in words: are proxied response bodies stored DECOMPRESSED, and
# does `Body.length` equal `toRaw().length`?
#
# Everything downstream depends on the answer. CORE-02's admission filter gates
# on response size, and a ceiling expressed against the wrong quantity is off by
# the compression ratio — measured at 3.7x to 7.3x on this corpus. That is why
# this spike runs BEFORE SPIKE-06, whose whole deliverable is a byte ceiling.
#
# Ports: Caido 8991, origin 8082. Both owned by plan 00-02.
#   Never 8080 (the operator's live desktop instance).
#   Never 8998 (the shared long-lived SPIKE-10 recorder).
#   Never 8083/8995/8996 (plan 00-03, running concurrently).
set -euo pipefail

cd "$(dirname "$0")/../.."

export PORT="${PORT:-8991}"
export OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
ORIGIN_PORT="${ORIGIN_PORT:-8082}"
ENCODED_DIR="corpus/encoded"

[ -f "$ENCODED_DIR/fixtures.json" ] || {
  echo "FATAL: $ENCODED_DIR/fixtures.json missing — run: node scripts/spike/make-encoded-fixtures.mjs" >&2
  exit 1
}

ORIGIN_PID=""
SAMPLER_PID=""
cleanup() {
  [ -n "$SAMPLER_PID" ] && kill "$SAMPLER_PID" 2>/dev/null || true
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
}
trap cleanup EXIT

# --- origin -----------------------------------------------------------------
if lsof -nP -iTCP:"$ORIGIN_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "FATAL: origin port $ORIGIN_PORT already in use" >&2
  exit 1
fi
mkdir -p .spike
python3 scripts/spike/origin.py --dir "$ENCODED_DIR" --port "$ORIGIN_PORT" \
  --headers "$ENCODED_DIR/origin-headers.json" > .spike/origin-8082.log 2>&1 &
ORIGIN_PID=$!
for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" && break
  kill -0 "$ORIGIN_PID" 2>/dev/null || { echo "FATAL: origin died"; cat .spike/origin-8082.log; exit 1; }
  sleep 0.25
done
curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" || { echo "FATAL: origin not ready" >&2; exit 1; }
echo "origin up on 127.0.0.1:$ORIGIN_PORT ($(head -1 .spike/origin-8082.log))" >&2

# --- instance ---------------------------------------------------------------
# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

CAIDO_URL="http://127.0.0.1:$PORT"
TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"
RAW="$OUT/runs/$RUN_ID/raw"
mkdir -p "$RAW"

# A fresh Caido has NO project, and with none selected the proxy answers
# "Proxying error: Internal" and onInterceptResponse NEVER FIRES. Plan 00-01
# discovered this the hard way; it is a hard prerequisite for every
# traffic-observing spike, not a nicety. A guest may create temporary projects
# only — createProject(temporary:false) returns PermissionDeniedUserError.
gql() {
  curl -s -X POST "$CAIDO_URL/graphql" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "$1"
}
PROJECT_ID="$(gql '{"query":"mutation{ createProject(input:{name:\"spike-08\",temporary:true}){ project{ id } error{ __typename } } }"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["createProject"]; sys.exit("createProject failed: "+str(d["error"])) if d["error"] else print(d["project"]["id"])')"
gql "{\"query\":\"mutation{ selectProject(id:\\\"$PROJECT_ID\\\"){ error{ __typename } } }\"}" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["selectProject"]; sys.exit("selectProject failed: "+str(d["error"])) if d["error"] else None'
echo "project selected: $PROJECT_ID (temporary)" >&2

probe_install probe/tier0-budgets

# --- the fetch matrix -------------------------------------------------------
# Every fixture is fetched THREE ways per encoding:
#   direct    — straight at the origin, no proxy. Authoritative wire bytes.
#   matching  — through the proxy with an Accept-Encoding the origin's encoding
#               satisfies, i.e. what a real browser sends.
#   identity  — through the proxy with Accept-Encoding: identity.
# The last two together separate "what the origin sent" from "what the plugin
# saw", which is the whole point: origin.py picks its encoding from the query
# string and ignores Accept-Encoding, so the client's advertisement changes
# nothing at the origin and any difference is attributable to Caido.
MATRIX="$RAW/spike-08-fetches.jsonl"
: > "$MATRIX"

accept_for() {
  case "$1" in
    gzip) echo "gzip" ;;
    br) echo "br" ;;
    zstd) echo "zstd" ;;
    *) echo "identity" ;;
  esac
}

fetch_one() {
  # fetch_one <fixture> <encoding> <mode:direct|matching|identity>
  local fx="$1" enc="$2" mode="$3"
  local tag="${fx%.js}-${enc}-${mode}"
  local url="http://127.0.0.1:$ORIGIN_PORT/$fx?encoding=$enc&fx=$tag"
  local hdr="$RAW/h-$tag.txt" bodyf="$RAW/b-$tag.bin"
  local accept args=()
  if [ "$mode" = "direct" ]; then
    accept="$(accept_for "$enc")"
  elif [ "$mode" = "matching" ]; then
    accept="$(accept_for "$enc")"
    args+=(--proxy "$CAIDO_URL")
  else
    accept="identity"
    args+=(--proxy "$CAIDO_URL")
  fi
  # NOTE: no --compressed. curl must NOT transparently decode, or the client-side
  # byte count would measure curl rather than the wire.
  local w
  w="$(curl -s --max-time 120 "${args[@]}" -H "Accept-Encoding: $accept" \
        -D "$hdr" -o "$bodyf" \
        -w '%{http_code} %{size_download}' "$url" || echo "000 0")"
  python3 - "$fx" "$enc" "$mode" "$tag" "$url" "$accept" "$hdr" "$bodyf" "$w" >> "$MATRIX" <<'PY'
import hashlib, json, os, sys
fx, enc, mode, tag, url, accept, hdrf, bodyf, w = sys.argv[1:10]
code, size = (w.split() + ["0", "0"])[:2]
headers = {}
try:
    for line in open(hdrf, "r", errors="replace"):
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip().lower()] = v.strip()
except FileNotFoundError:
    pass
raw = open(bodyf, "rb").read() if os.path.isfile(bodyf) else b""
print(json.dumps({
    "fixture": fx, "encoding": enc, "mode": mode, "tag": tag, "url": url,
    "accept_encoding_sent": accept,
    "http_code": int(code) if code.isdigit() else None,
    "client_bytes": len(raw),
    "size_download": int(size) if size.isdigit() else None,
    "resp_content_encoding": headers.get("content-encoding"),
    "resp_content_length": headers.get("content-length"),
    "resp_x_raw_length": headers.get("x-raw-length"),
    "client_sha256": hashlib.sha256(raw).hexdigest(),
    "client_first16_hex": raw[:16].hex(),
}))
PY
  rm -f "$bodyf"
  echo "  $tag -> $w" >&2
}

for fx in ace-small.js babel-large.js nonutf8.js; do
  for enc in identity gzip br zstd; do
    fetch_one "$fx" "$enc" direct
    fetch_one "$fx" "$enc" matching
    fetch_one "$fx" "$enc" identity
  done
done

# --- drain ------------------------------------------------------------------
# The per-request header dumps have been folded into the matrix; drop them so
# the committed run directory carries analysis input rather than curl scratch.
rm -f "$RAW"/h-*.txt

probe_call drain '[]' > "$RAW/spike-08-drain.json"
echo "drained $(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["drained"])' "$RAW/spike-08-drain.json") rows" >&2

# --- analyse and record -----------------------------------------------------
python3 scripts/spike/analyse-spike-08.py \
  --matrix "$MATRIX" \
  --drain "$RAW/spike-08-drain.json" \
  --fixtures "$ENCODED_DIR/fixtures.json" \
  > "$RAW/spike-08-body.json"

python3 scripts/spike/record-result.py --spike SPIKE-08 --status pass \
  --run "$RUN_ID" < "$RAW/spike-08-body.json"

echo "SPIKE-08 done (run=$RUN_ID)" >&2
