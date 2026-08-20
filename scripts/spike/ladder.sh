#!/usr/bin/env bash
# scripts/spike/ladder.sh — SPIKE-06 driver.
#
# The question in words: what are the real CPU and RSS budgets INSIDE Caido —
# not standalone quickjs-ng — and where does the 512 KiB stack actually break?
# This sets every size ceiling in the project.
#
# Three phases, each on its OWN fresh instances:
#   A  size ladder at 0.5 / 1.5 / 3 / 8 MB, one fresh instance per size point
#   B  stack-break sweep with the REAL parser, one fresh instance per depth
#   C  HARD_MAX_BYTES located by crash-boundary bisection
#
# ONE FRESH INSTANCE PER SIZE POINT IS NOT FASTIDIOUSNESS. RSS is a high-water
# mark that never falls, the allocator does not return pages to the OS, and there
# is no gc() to force a collection before a reading. Reusing an instance makes
# every point after the first meaningless. The gate asserts run_id UNIQUENESS,
# not merely fresh:true, because a prose-only version of this rule passed review
# twice while the contamination it forbids stayed possible.
#
# Ports: 8992 for phases A and B, 8993 for phase C. Never 8080 (the operator's
# live desktop instance), never 8998 (the shared SPIKE-10 recorder), never plan
# 00-03's 8083/8995/8996.
set -uo pipefail

cd "$(dirname "$0")/../.."

export OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
PKG="dist/plugin_package"
BIG=".spike/big"
POINTS="$OUT/spike-06-points"
CALL_TIMEOUT="${CALL_TIMEOUT:-900}"
# PHASES lets a phase be re-run on its own after a correction, without redoing
# the ones that already produced good points.
PHASES="${PHASES:-ABC}"
mkdir -p "$BIG" "$POINTS" .spike

[ -f "$PKG/manifest.json" ] || { echo "FATAL: $PKG missing — run: pnpm exec caido-dev build" >&2; exit 1; }

jargs() {
  python3 -c 'import json,sys; print(json.dumps([json.dumps(a) for a in sys.argv[1:]]))' "$@"
}

# ---------------------------------------------------------------------------
# ensure_composite — a parsable 8 MB fixture.
#
# MEASURED DEFECT in the wave-1 corpus: `corpus/composite-8mb.js` is NOT valid
# JavaScript. fetch-corpus.sh builds it as `cat monaco plotly`, and monaco ends
# with `//# sourceMappingURL=...` and NO trailing newline, so plotly's opening
# `/**` is swallowed into that line comment and the rest of plotly's banner leaks
# out as code. meriyah fails at [799:0] with "Unexpected token: '*'" and acorn
# with "Unterminated regular expression".
#
# That would have poisoned this whole spike in a way that looks like a ceiling:
# phase C's escalation starts at 8 MB, so EVERY step would have "failed" for a
# syntax reason and HARD_MAX_BYTES would have been recorded as ~8 MB. The
# separator is the entire fix; the fixture is still the same two DISTINCT bundles
# the research required, so the string table stays representative.
#
# fetch-corpus.sh belongs to plan 00-01 and is NOT modified here (plan 00-03 is
# running against it concurrently); the corrected fixture is written alongside.
ensure_composite() {
  local out="corpus/big/composite-8mb-parsable.js"
  mkdir -p corpus/big
  if [ ! -f "$out" ]; then
    { cat corpus/monaco-0.52.2.js; printf '\n;\n'; cat corpus/plotly-2.35.2.js; } > "$out"
    echo "built $out ($(wc -c < "$out" | tr -d ' ') bytes)" >&2
  fi
  echo "$out"
}

ALL_PIDS=()
cleanup() { for p in "${ALL_PIDS[@]:-}"; do [ -n "$p" ] && kill -9 "$p" 2>/dev/null; done; }
trap cleanup EXIT

# ---------------------------------------------------------------------------
# run_probe <port> <label> <fn> <args-json> <rss:0|1>
#
# Launches a FRESH version-asserted instance, installs the Tier-1 package, calls
# one probe function, tears the instance down with SIGKILL, and records
# everything about the attempt — including the exit code, which is the only
# evidence a C-level abort leaves. 134 is SIGABRT. `set -e` is deliberately OFF
# in this script: a probe that kills its host is a RESULT, not a script error.
#
# Sets: LAST_RUN_ID LAST_CALL_RC LAST_ALIVE LAST_OUT
# ---------------------------------------------------------------------------
run_probe() {
  local port="$1" label="$2" fn="$3" args="$4" rss="${5:-0}"
  unset RUN_ID DATA_PATH BACKEND_ID PACKAGE_ID
  export PORT="$port"

  # shellcheck disable=SC1091
  source scripts/spike/instance.sh || { echo "FATAL: instance did not come up for $label" >&2; return 1; }
  # shellcheck disable=SC1091
  source scripts/spike/probe-run.sh
  # BOTH sourced scripts begin with `set -euo pipefail`, which switches errexit
  # back ON in this shell. This script needs it OFF: a probe that kills its host
  # is a RESULT to be recorded, not a script error to abort on.
  set +e

  local rid="$RUN_ID" pid="$CAIDO_PID" data="$DATA"
  ALL_PIDS+=("$pid")
  local rundir="$OUT/runs/$rid"
  mkdir -p "$rundir/raw"

  local sampler=""
  if [ "$rss" = "1" ]; then
    bash scripts/spike/rss-sampler.sh "$pid" "$rundir/rss.csv" 0.05 &
    sampler=$!
  fi

  probe_install "$PKG" >/dev/null 2>"$rundir/raw/install.err"
  if [ $? -ne 0 ]; then
    echo "  $label: install FAILED" >&2
    [ -n "$sampler" ] && kill "$sampler" 2>/dev/null
    teardown "$pid" "$rid" "$data" >/dev/null
    LAST_RUN_ID="$rid"; LAST_CALL_RC=127; LAST_ALIVE=0; LAST_OUT=""
    return 1
  fi

  LAST_OUT="$rundir/raw/$label.json"
  probe_call "$fn" "$args" "$CALL_TIMEOUT" > "$LAST_OUT" 2> "$rundir/raw/$label.err"
  LAST_CALL_RC=$?

  # Did the host survive? A probe that drove the runtime into a C-level abort
  # under `panic = "abort"` never reaches the structured log — the exit code and
  # stderr are the whole evidence.
  if kill -0 "$pid" 2>/dev/null; then LAST_ALIVE=1; else LAST_ALIVE=0; fi

  # Let the sampler catch the tail of the allocation before it stops.
  [ -n "$sampler" ] && { sleep 0.3; kill "$sampler" 2>/dev/null; }

  # Preserve stderr BEFORE teardown deletes the data path. This is where a
  # QuickJS assertion would land.
  cp "$rundir/caido.stderr.log" "$rundir/raw/$label.caido-stderr.log" 2>/dev/null

  teardown "$pid" "$rid" "$data" >/dev/null
  LAST_RUN_ID="$rid"

  local ec; ec="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("exit_code"))' "$rundir/instance.json" 2>/dev/null)"
  echo "  $label: rc=$LAST_CALL_RC alive=$LAST_ALIVE exit=$ec run=$rid" >&2
  return 0
}

record_point() {
  # record_point <phase> <label> <input-path> <extra-json>
  python3 - "$POINTS/$2.json" "$1" "$2" "$3" "$LAST_RUN_ID" "$LAST_CALL_RC" "$LAST_ALIVE" "$LAST_OUT" "${4:-{\}}" <<'PY'
import json, os, sys
out, phase, label, path, rid, rc, alive, resfile, extra = sys.argv[1:10]
payload = None
if resfile and os.path.isfile(resfile) and os.path.getsize(resfile):
    try:
        payload = json.load(open(resfile))
    except Exception as e:
        payload = {"_unparseable": str(e)[:200]}
inst = os.path.join(os.environ.get("OUT", ""), "runs", rid, "instance.json")
instance = json.load(open(inst)) if os.path.isfile(inst) else {}
json.dump({
    "phase": phase, "label": label, "input": path,
    "run_id": rid, "call_rc": int(rc), "host_alive_after": alive == "1",
    "exit_code": instance.get("exit_code"),
    "listen": instance.get("listen"), "fresh": instance.get("fresh", True),
    "flags": instance.get("flags", []), "data_path": instance.get("data_path"),
    "bytes": os.path.getsize(path) if path and os.path.isfile(path) else None,
    "result": payload,
    "extra": json.loads(extra),
}, open(out, "w"), indent=2)
PY
}

# ===========================================================================
# PHASE A — the size ladder
# ===========================================================================
case "$PHASES" in *A*)
echo "=== PHASE A: size ladder (fresh instance per point, port 8992) ===" >&2
for spec in "ace:corpus/ace-1.36.5.js" "tfjs:corpus/tfjs-4.22.0.js" \
            "babel:corpus/babel-7.26.4.js" "composite8mb:$(ensure_composite)"; do
  name="${spec%%:*}"; file="${spec#*:}"
  [ -f "$file" ] || { echo "FATAL: $file missing — run scripts/spike/fetch-corpus.sh" >&2; exit 1; }
  abs="$(pwd)/$file"
  run_probe 8992 "ladder-$name" measure "$(jargs "$abs")" 1
  record_point A "ladder-$name" "$file" "{\"size_point\":\"$name\"}"
done

esac

# ===========================================================================
# PHASE B — where the 512 KiB stack actually breaks, under the REAL parser
# ===========================================================================
case "$PHASES" in *B*)
echo "=== PHASE B: stack break (fresh instance per depth, port 8992) ===" >&2
node scripts/spike/deep-nest.mjs >/dev/null

nest_ok() {
  # nest_ok <n> <kind> -> 0 if the parse succeeded, 1 otherwise. Sets NEST_NOTE.
  local n="$1" kind="$2"
  node scripts/spike/deep-nest.mjs --n "$n" >/dev/null
  local f="corpus/nesting/$kind-$n.js"
  run_probe 8992 "nest-$kind-$n" parse_only "$(jargs "$(pwd)/$f")" 0
  record_point B "nest-$kind-$n" "$f" "{\"n\":$n,\"kind\":\"$kind\"}"
  python3 - "$POINTS/nest-$kind-$n.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
r = d.get("result") or {}
ok = bool(r.get("parse_ok")) and d.get("host_alive_after") and d.get("call_rc") == 0
print("OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
PY
}

# Both shapes get the full ascend-then-bisect treatment. They are NOT
# interchangeable: a parenthesised expression recurses through the primary
# expression path and consumes more stack per level than an array literal, so
# the bracket number alone is optimistic and Phase 9 would gate too high on it.
# MAX_NESTING_DEPTH is taken as the MINIMUM across shapes.
sweep_shape() {
  local kind="$1" lo=0 hi=0 n mid
  for n in 100 500 1000 2000 5000 10000 20000; do
    if nest_ok "$n" "$kind" >/dev/null; then lo="$n"; else hi="$n"; break; fi
  done
  echo "  $kind sweep: last_good=$lo first_bad=$hi" >&2
  if [ "$hi" -gt 0 ]; then
    # Bisect to within 2 levels, or 2% of the depth, whichever is coarser.
    while [ $((hi - lo)) -gt 2 ] && [ $((hi - lo)) -gt $((lo / 50)) ]; do
      mid=$(( (lo + hi) / 2 ))
      if nest_ok "$mid" "$kind" >/dev/null; then lo="$mid"; else hi="$mid"; fi
    done
  fi
  echo "  $kind boundary: last_good=$lo first_bad=$hi" >&2
  SHAPE_LAST_GOOD="$lo"; SHAPE_FIRST_BAD="$hi"
}

sweep_shape brackets
BR_GOOD="$SHAPE_LAST_GOOD"; BR_BAD="$SHAPE_FIRST_BAD"
sweep_shape parens
PA_GOOD="$SHAPE_LAST_GOOD"; PA_BAD="$SHAPE_FIRST_BAD"

NEST_LAST_GOOD="$BR_GOOD"
[ "$PA_GOOD" -lt "$NEST_LAST_GOOD" ] && NEST_LAST_GOOD="$PA_GOOD"
NEST_FIRST_BAD="$BR_BAD"
if [ "$PA_BAD" -gt 0 ] && { [ "$NEST_FIRST_BAD" -eq 0 ] || [ "$PA_BAD" -lt "$NEST_FIRST_BAD" ]; }; then
  NEST_FIRST_BAD="$PA_BAD"
fi
echo "  ACROSS SHAPES: last_good=$NEST_LAST_GOOD first_bad=$NEST_FIRST_BAD" >&2

python3 - "$POINTS/_nesting-boundary.json" "$NEST_LAST_GOOD" "$NEST_FIRST_BAD" "$BR_GOOD" "$BR_BAD" "$PA_GOOD" "$PA_BAD" <<'PY'
import json, sys
a = sys.argv
json.dump({
    "last_good": int(a[2]), "first_bad": int(a[3]),
    "by_shape": {
        "brackets": {"last_good": int(a[4]), "first_bad": int(a[5])},
        "parens": {"last_good": int(a[6]), "first_bad": int(a[7])},
    },
}, open(a[1], "w"), indent=2)
PY

esac

# ===========================================================================
# PHASE C — HARD_MAX_BYTES by crash-boundary bisection
# ===========================================================================
# Located by ESCALATION AND BISECTION, not by extrapolating the RSS curve.
# SPIKE-06's deliverable is a ceiling and the ceiling can be measured directly:
# the RSS sampler gives the SHAPE of the curve, bisection gives the NUMBER.
case "$PHASES" in *C*)
echo "=== PHASE C: HARD_MAX_BYTES bisection (fresh instance per step, port 8993) ===" >&2

make_big() {
  # make_big <target_mb> -> path. Built by repeating composite-8mb.js, which is
  # already two DISTINCT bundles concatenated. Repetition inflates the string
  # table's internal duplication, so this is an allocation stress input and NOT a
  # realistic artifact — it is labelled as such in the result.
  local mb="$1" f="$BIG/big-${mb}mb.js"
  if [ ! -f "$f" ]; then
    local src; src="$(ensure_composite)"
    local srcsz; srcsz="$(wc -c < "$src" | tr -d " ")"
    local reps=$(( (mb * 1048576) / srcsz + 1 ))
    : > "$f"
    for _ in $(seq 1 "$reps"); do cat "$src" >> "$f"; printf '\n;\n' >> "$f"; done
  fi
  echo "$f"
}

big_ok() {
  local mb="$1" f
  f="$(make_big "$mb")"
  run_probe 8993 "hardmax-${mb}mb" parse_only "$(jargs "$(pwd)/$f")" 1
  record_point C "hardmax-${mb}mb" "$f" "{\"target_mb\":$mb}"
  python3 - "$POINTS/hardmax-${mb}mb.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
r = d.get("result") or {}
ok = bool(r.get("parse_ok")) and d.get("host_alive_after") and d.get("call_rc") == 0
print("OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
PY
}

HM_LAST_GOOD=0; HM_FIRST_BAD=0
for mb in 8 16 32 64 128 256 512; do
  if big_ok "$mb" >/dev/null; then HM_LAST_GOOD="$mb"; else HM_FIRST_BAD="$mb"; break; fi
done
echo "  escalation: last_good=${HM_LAST_GOOD}MB first_bad=${HM_FIRST_BAD}MB" >&2

if [ "$HM_FIRST_BAD" -gt 0 ]; then
  lo="$HM_LAST_GOOD"; hi="$HM_FIRST_BAD"
  while [ $((hi - lo)) -gt 4 ]; do
    mid=$(( (lo + hi) / 2 ))
    if big_ok "$mid" >/dev/null; then lo="$mid"; else hi="$mid"; fi
  done
  echo "  hard max boundary: last_good=${lo}MB first_bad=${hi}MB" >&2
  HM_LAST_GOOD="$lo"; HM_FIRST_BAD="$hi"
fi

python3 - "$POINTS/_hardmax-boundary.json" "$HM_LAST_GOOD" "$HM_FIRST_BAD" <<'PY'
import json, sys
json.dump({"last_good_mb": int(sys.argv[2]), "first_bad_mb": int(sys.argv[3])},
          open(sys.argv[1], "w"), indent=2)
PY

esac

rm -rf "$BIG"
echo "=== ladder complete: $(ls "$POINTS" | wc -l | tr -d ' ') point files ===" >&2
