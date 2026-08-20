#!/usr/bin/env bash
# scripts/spike/rss-sampler.sh <pid> <out.csv> [interval_s]
#
# External RSS/CPU sampler. This is not a convenience — it is the ONLY memory
# measurement method available. Caido's QuickJS exposes no memory introspection
# whatsoever: llrt:qjs, perf_hooks and process all fail to load, `performance`
# carries only `now` and `timeOrigin`, and there is no gc(). Backend plugins run
# in-process, so RSS of that one PID is a real signal — but it is Caido's RSS
# plus the plugin's, so every measurement must be a DELTA FROM A MARKER, never
# an absolute.
#
# Emits unix-MILLISECOND timestamps. That is the correlation key against the
# host log's microsecond lines and the probe's own Date.now() markers; measured
# agreement during research was 0.26 ms.
set -uo pipefail

PID="${1:?usage: rss-sampler.sh <pid> <out.csv> [interval_s]}"
OUT="${2:?usage: rss-sampler.sh <pid> <out.csv> [interval_s]}"
HZ="${3:-0.05}"

mkdir -p "$(dirname "$OUT")"
echo "unix_ms,rss_kb,cpu_pct" > "$OUT"

# One long-lived python3 process does the timestamping. Spawning an interpreter
# per sample (as the research sketch did) costs ~20 ms and would dominate a 50 ms
# interval, aliasing the very allocation steps this is meant to resolve.
exec python3 -u - "$PID" "$OUT" "$HZ" <<'PY'
import subprocess, sys, time

pid, out, hz = sys.argv[1], sys.argv[2], float(sys.argv[3])
with open(out, "a", buffering=1) as fh:
    while True:
        try:
            r = subprocess.run(["ps", "-o", "rss=,%cpu=", "-p", pid],
                               capture_output=True, text=True, timeout=5)
        except Exception:
            break
        line = r.stdout.strip()
        if not line:            # process is gone
            break
        parts = line.split()
        if len(parts) < 2:
            break
        fh.write("%d,%s,%s\n" % (int(time.time() * 1000), parts[0], parts[1]))
        time.sleep(hz)
PY
