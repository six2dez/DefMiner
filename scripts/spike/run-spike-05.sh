#!/usr/bin/env bash
# scripts/spike/run-spike-05.sh — SPIKE-05 end to end on a fresh instance.
#
# SPIKE-05 (REQUIREMENTS.md is the ID authority): which surfaces deliver
# onInterceptResponse, and does sdk.requests.send() re-fire it under each
# combination of `save` and `plugins`?
#
# Owns port 8995 (Caido) and 8083 (origin), per plan 00-03. Never 8080, never
# plan 00-02's 8991-8993/8082, never the shared recorder on 8998.
#
# Everything the result file quotes is regenerable from this script: no
# measurement in SPIKE-05.json was produced by a command that is not committed.
set -euo pipefail

export PORT="${PORT:-8995}"
export OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
ORIGIN_PORT="${ORIGIN_PORT:-8083}"
CORPUS_PATH="${CORPUS_PATH:-/ace-1.36.5.js}"

ORIGIN_PID=""
cleanup() {
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  # teardown() is defined by instance.sh once it has launched. ALWAYS kill -9.
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
}
trap cleanup EXIT

# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

mkdir -p "$RUN_DIR/raw"
ORIGIN_LOG="$RUN_DIR/raw/origin.log"

# --verbose so the origin logs every request line. That log is the independent
# witness that separates "the surface never put a request on the wire" from
# "it did, and Caido did not deliver the response to the plugin" — without it a
# not-fired cell is ambiguous.
python3 scripts/spike/origin.py --dir corpus --port "$ORIGIN_PORT" --verbose \
  > "$ORIGIN_LOG" 2>&1 &
ORIGIN_PID=$!
for _ in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" && break
  sleep 0.5
done
curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" || {
  echo "FATAL: origin did not come up on 127.0.0.1:$ORIGIN_PORT" >&2; exit 1; }

probe_install probe/tier0-events

MATRIX="$RUN_DIR/raw/spike-05-matrix.json"
node scripts/spike/event-matrix.mjs \
  --port "$PORT" --run-id "$RUN_ID" --backend "$BACKEND_ID" \
  --origin "127.0.0.1:$ORIGIN_PORT" --path "$CORPUS_PATH" \
  --origin-log "$ORIGIN_LOG" --out "$MATRIX"

echo "matrix written: $MATRIX" >&2
echo "RUN_ID=$RUN_ID MATRIX=$MATRIX"
