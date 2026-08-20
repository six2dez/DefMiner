#!/usr/bin/env bash
# scripts/spike/run-spike-02.sh — SPIKE-02.
#
# Asks, in words: does setTimeout(fn, 0) actually yield the QuickJS event loop?
# If it does not, budget-and-background does not work and the entire ingestion
# design in CORE-06 and CORE-07 must change. Runs before every other measurement
# in the phase because its answer shapes the measurement loop of everything else.
set -euo pipefail

export PORT="${PORT:-8999}"
export OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"

# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

SAMPLER=""
cleanup() {
  [ -n "$SAMPLER" ] && kill "$SAMPLER" 2>/dev/null || true
  teardown "$CAIDO_PID" "$RUN_ID" "$DATA"
}
trap cleanup EXIT

probe_install probe/tier0-core

# The sampler runs for the WHOLE run, attached to the Caido PID, so the
# attribution markers land inside a continuous series.
bash scripts/spike/rss-sampler.sh "$CAIDO_PID" "$RUN_DIR/rss.csv" 0.05 &
SAMPLER=$!
sleep 1

T0=$(python3 -c 'import time;print(time.time())')
probe_call yieldExperiment '["300","1","48"]'                 > "$RUN_DIR/raw/yield-experiment.json"
probe_call yieldAtGeometry '["8388608","65536","4096","25"]' 900 > "$RUN_DIR/raw/yield-geometry.json"
probe_call rssAttribution  '["900"]'                        > "$RUN_DIR/raw/rss-attribution.json"
T1=$(python3 -c 'import time;print(time.time())')

sleep 1
kill "$SAMPLER" 2>/dev/null || true; SAMPLER=""

python3 scripts/spike/analyse-spike-02.py \
  --run-dir "$RUN_DIR" --run-id "$RUN_ID" --t0 "$T0" --t1 "$T1" \
  | python3 scripts/spike/record-result.py --spike SPIKE-02 --status pass --run "$RUN_ID"
