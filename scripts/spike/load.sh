#!/usr/bin/env bash
# scripts/spike/load.sh — N requests at configurable concurrency through the
# disposable instance's proxy against the local origin.
#
# Validated apparatus: research measured 500 requests in 0.70 s (710 req/s) with
# all 500 delivered to onInterceptResponse under an idle handler. SPIKE-03 in
# plan 00-03 is the SAME run with a blocking handler and a delivered-event count,
# so this script must not change between the two.
#
# Usage:
#   scripts/spike/load.sh [-n 500] [-c 20] [-u path] [-o origin] [-s] [-t 30]
#     -n  request count            (default 500)
#     -c  concurrency              (default 20)
#     -u  path on the origin       (default /ace-1.36.5.js)
#     -o  origin host:port         (default 127.0.0.1:8081)
#     -s  use HTTPS through the proxy with the instance CA
#     -t  per-request timeout secs (default 30)
#
# Requires PORT (Caido proxy) in the environment; RUN_DIR if you want the CA and
# the rate recorded alongside the run.
set -euo pipefail

N=500; C=20; PATH_ON_ORIGIN="/ace-1.36.5.js"; ORIGIN="127.0.0.1:8081"; HTTPS=0; TMO=30
while getopts "n:c:u:o:st:" opt; do
  case "$opt" in
    n) N="$OPTARG" ;; c) C="$OPTARG" ;; u) PATH_ON_ORIGIN="$OPTARG" ;;
    o) ORIGIN="$OPTARG" ;; s) HTTPS=1 ;; t) TMO="$OPTARG" ;;
    *) echo "usage: load.sh [-n N] [-c C] [-u path] [-o host:port] [-s] [-t secs]" >&2; exit 2 ;;
  esac
done

: "${PORT:?load.sh: PORT (the Caido proxy port) not set}"
OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
RUN_DIR="${RUN_DIR:-}"

CURL_EXTRA=()
SCHEME="http"
if [ "$HTTPS" -eq 1 ]; then
  SCHEME="https"
  # Each instance mints its OWN CA under --data-path — it is not the operator's.
  # Fetch it rather than disabling verification, so TLS through the proxy is
  # genuinely exercised.
  CA="${RUN_DIR:-/tmp}/ca.crt"
  curl -sf "http://127.0.0.1:$PORT/ca.crt" -o "$CA" || {
    echo "FATAL: could not fetch instance CA from http://127.0.0.1:$PORT/ca.crt" >&2; exit 1; }
  CURL_EXTRA=(--cacert "$CA")
fi

URL="$SCHEME://$ORIGIN$PATH_ON_ORIGIN"
echo "load: $N requests, concurrency $C, via proxy 127.0.0.1:$PORT -> $URL" >&2

CODES="$(mktemp)"
trap 'rm -f "$CODES"' EXIT

T0=$(python3 -c 'import time;print(time.time())')
# Cache-busting query param per request so the proxy sees N distinct requests
# rather than a client-side or upstream cache collapsing them.
#
# Every request's HTTP status is recorded. Reporting elapsed time alone is a
# trap: a run where EVERY request failed finishes fastest of all and would look
# like a throughput record. SPIKE-03 in plan 00-03 compares delivered-event
# counts against this request count, so a silently-failed run there would
# produce a completely wrong backpressure verdict.
seq 1 "$N" | xargs -P "$C" -I{} \
  curl -s -o /dev/null -w '%{http_code}\n' --proxy "http://127.0.0.1:$PORT" \
       "${CURL_EXTRA[@]}" -m "$TMO" "$URL?n={}" >> "$CODES" || true
T1=$(python3 -c 'import time;print(time.time())')

python3 - "$T0" "$T1" "$N" "$C" "$URL" "${RUN_DIR:-}" "$CODES" <<'PY'
import collections, json, sys
t0, t1, n, c, url, run_dir, codes_path = (
    float(sys.argv[1]), float(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]),
    sys.argv[5], sys.argv[6], sys.argv[7])
el = t1 - t0
codes = collections.Counter()
with open(codes_path) as fh:
    for line in fh:
        line = line.strip()
        if line:
            codes[line] += 1
# curl writes 000 when the transfer never completed (connect refused, TLS
# failure, timeout). Those are NOT successes.
ok = sum(v for k, v in codes.items() if k.startswith("2") or k.startswith("3"))
rec = {"requests": n, "concurrency": c, "url": url,
       "elapsed_s": round(el, 3),
       "completed": sum(codes.values()), "ok": ok, "failed": sum(codes.values()) - ok,
       "status_codes": dict(sorted(codes.items())),
       # Rate is computed over SUCCESSFUL requests only.
       "rate_rps": round(ok / el, 1) if el > 0 and ok else 0.0}
if ok < n:
    rec["warning"] = (
        "%d of %d requests did NOT succeed. Do not read rate_rps as throughput "
        "for this run." % (n - ok, n))
print(json.dumps(rec))
if run_dir:
    import os
    os.makedirs(os.path.join(run_dir, "raw"), exist_ok=True)
    with open(os.path.join(run_dir, "raw", "load.json"), "w") as fh:
        json.dump(rec, fh, indent=2); fh.write("\n")
PY
