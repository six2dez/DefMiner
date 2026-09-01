#!/usr/bin/env bash
# scripts/phase7/map-bytes.sh — the D-10 probe driver (MAP-01, MAP-02).
#
# The question in words: what does it cost INSIDE CAIDO to find an inline
# sourcemap announcement, base64-decode the payload and `JSON.parse` the result,
# and where does that stop being affordable on the proxy thread? That number is
# `MAP_MAX_BYTES` and D-10 mandates it be MEASURED. No Phase 0 constant
# substitutes: SPIKE-06 measures no `JSON.parse` at all.
#
# ONE FRESH INSTANCE PER SIZE POINT IS NOT FASTIDIOUSNESS — the argument is
# scripts/spike/ladder.sh:12-19's and is reproduced because it applies unchanged:
# RSS is a high-water mark that never falls, the allocator does not return pages
# to the OS, and there is no gc() to force a collection before a reading.
# Reusing an instance makes every point after the first meaningless. The gate
# asserts run_id UNIQUENESS, not merely fresh:true, because a prose-only version
# of that rule passed review twice while the contamination it forbids stayed
# possible.
#
# WHY THIS SCRIPT DECLARES ITS OWN VERSION CONSTANT (D-21, applied a second
# time). `scripts/spike/instance.sh` defaults `EXPECT_VERSION` to "0.57.1"
# against the app bundle, and that bundle now reports 0.58.2 — so the default
# fails closed exactly as designed, and this script must not "fix" it by editing
# the default. Phase 1's "0.57.1" is a deliberate tripwire over artifacts whose
# numbers were measured on 0.57.1; Phase 6 pinned "0.58.2" for the desktop
# bundle. Reusing either would make this probe fail by design or measure a build
# that drifts with the desktop auto-updater. This probe declares its own and
# contaminates neither.
#
# TARGET: `.caido-bin/0.58.0/caido-cli` — in-repo, sha512-verified BEFORE
# extraction (`.caido-bin/0.58.0/release.json`: verified true,
# verified_before_extraction true, computed_sha512 == published_sha512), and
# reproducible by anyone who runs `bash scripts/phase1/fetch-caido.sh 0.58.0`.
# The app bundle can never be that. `~/.caido/caido-cli` is a STALE 0.55.3 and is
# named as the trap in instance.sh:83 — it is never this probe's target.
#
# Ports: the 8941-8945 block, which is free. 8080 is the operator's live desktop
# instance and is refused unconditionally, as instance.sh:94-98 already does.
#
# `set -e` is deliberately OFF: a probe that kills its host is a RESULT to be
# recorded, not a script error to abort on.
set -uo pipefail

cd "$(dirname "$0")/../.."
REPO_ROOT="$(pwd)"

# THE PHASE 7 RESULTS ROOT, EXPORTED BEFORE probe-run.sh IS SOURCED.
# probe-run.sh defaults OUT to Phase 0's results directory, and a Phase 7
# artifact landing there would be gated by tests/spike-results.spec.ts, which
# globs /^SPIKE-\d\d[a-z]?\.json$/ and pins 0.57.1.
export OUT="${OUT:-.planning/phases/07-sourcemap-reconstruction/results}"

MAP_PROBE_EXPECTED_VERSION="0.58.0"
CAIDO_BIN_REL=".caido-bin/${MAP_PROBE_EXPECTED_VERSION}/caido-cli"
PKG="dist/plugin_package"
MAPS=".spike/maps"
POINTS="$OUT/map-bytes-points"
CALL_TIMEOUT="${CALL_TIMEOUT:-900}"
RESULT="$OUT/map-bytes.json"

mkdir -p "$POINTS" "$MAPS"

[ -f "$PKG/manifest.json" ] || {
  echo "FATAL: $PKG missing — run: pnpm exec caido-dev build" >&2
  exit 1
}
[ -x "$CAIDO_BIN_REL" ] || {
  echo "FATAL: $CAIDO_BIN_REL missing — run: bash scripts/phase1/fetch-caido.sh ${MAP_PROBE_EXPECTED_VERSION}" >&2
  exit 1
}

# GATE: the version, asserted HERE as well as inside instance.sh, so the failure
# names this probe's constant rather than instance.sh's default.
ACTUAL_VERSION="$("$CAIDO_BIN_REL" --version 2>/dev/null | awk '{print $2}')"
if [ "$ACTUAL_VERSION" != "$MAP_PROBE_EXPECTED_VERSION" ]; then
  echo "FATAL: $CAIDO_BIN_REL reports '${ACTUAL_VERSION:-<none>}', not $MAP_PROBE_EXPECTED_VERSION." >&2
  echo "       Refusing to record any measurement against an unexpected build (D-21)." >&2
  exit 1
fi

# THE LADDER, declared here rather than computed, so the x-axis of the
# measurement is readable in one place.
#
# Points are DECODED MAP JSON bytes and top out at the STRUCTURAL CEILING rather
# than above it: an inline map's decoded JSON cannot exceed
# floor(PASSIVE_MAX_BYTES * 3/4) = 6,291,456, because base64 expands 4:3 and
# admit() refuses any body over PASSIVE_MAX_BYTES. Measuring above that would be
# pricing a case that cannot reach this code.
#
# `<label> <source-map> <decoded-bytes> <port>`
LADDER="${LADDER:-p1500k monaco-0.52.2.js.map 1572864 8941}"

jargs() {
  python3 -c 'import json,sys; print(json.dumps([json.dumps(a) for a in sys.argv[1:]]))' "$@"
}

ALL_PIDS=()
cleanup() { for p in "${ALL_PIDS[@]:-}"; do [ -n "$p" ] && kill -9 "$p" 2>/dev/null; done; }
trap cleanup EXIT

# ---------------------------------------------------------------------------
# resolve_mapbytes_backend — set BACKEND_ID to THIS probe's backend, by asking.
#
# probe-run.sh takes `backends[0]` from the install response, and this package
# now ships THREE backends. probe-run.sh belongs to Phase 0 and is NOT modified,
# so the resolution happens here: call `mapbytes_info` against each installed
# backend id and keep the one that answers. Explicit and loud beats positional
# and silent — a measurement recorded against the wrong backend is exactly the
# repudiation class T-07-20 is about.
# ---------------------------------------------------------------------------
resolve_mapbytes_backend() {
  local install_json="$OUT/runs/$RUN_ID/install-$(basename "$PKG").json"
  local ids
  ids="$(python3 -c '
import json, sys
r = json.load(open(sys.argv[1]))
d = (r.get("data") or {}).get("installPluginPackage") or {}
pkg = d.get("package") or {}
for p in pkg.get("plugins", []):
    if p.get("__typename") == "PluginBackend":
        print(p["id"])
' "$install_json" 2>/dev/null)"
  local id
  for id in $ids; do
    BACKEND_ID="$id"
    export BACKEND_ID
    if probe_call mapbytes_info '[]' 30 >/dev/null 2>&1; then
      echo "  resolved mapbytes backend: $id" >&2
      return 0
    fi
  done
  echo "FATAL: none of the installed backends [$(echo "$ids" | tr '\n' ' ')] answered mapbytes_info." >&2
  echo "       Rebuild with: pnpm exec caido-dev build" >&2
  return 1
}

# ---------------------------------------------------------------------------
# run_point <label> <fixture-path> <decoded-bytes> <port>
#
# Launches a FRESH version-asserted instance, installs the Tier-1 package,
# resolves this probe's backend, attaches the external RSS sampler UNMODIFIED at
# its 0.05 default to that instance's PID, calls the probe once, SIGKILLs the
# instance, and records everything about the attempt — including the exit code,
# which is the only evidence a C-level abort under `panic = "abort"` leaves.
# 134 is SIGABRT.
# ---------------------------------------------------------------------------
run_point() {
  local label="$1" fixture="$2" decoded="$3" port="$4"
  unset RUN_ID DATA_PATH BACKEND_ID PACKAGE_ID
  export PORT="$port"
  export CAIDO_BIN="$REPO_ROOT/$CAIDO_BIN_REL"
  export EXPECT_VERSION="$MAP_PROBE_EXPECTED_VERSION"

  # shellcheck disable=SC1091
  source scripts/spike/instance.sh || {
    echo "FATAL: instance did not come up for $label" >&2
    return 1
  }
  # shellcheck disable=SC1091
  source scripts/spike/probe-run.sh
  # BOTH sourced scripts begin with `set -euo pipefail`, which switches errexit
  # back ON in this shell. This script needs it OFF, for the reason in the header.
  set +e

  local rid="$RUN_ID" pid="$CAIDO_PID" data="$DATA"
  ALL_PIDS+=("$pid")
  local rundir="$OUT/runs/$rid"
  mkdir -p "$rundir/raw"

  bash scripts/spike/rss-sampler.sh "$pid" "$rundir/rss.csv" 0.05 &
  local sampler=$!

  if ! probe_install "$PKG" >/dev/null 2>"$rundir/raw/install.err"; then
    echo "  $label: install FAILED" >&2
    kill "$sampler" 2>/dev/null
    teardown "$pid" "$rid" "$data" >/dev/null
    LAST_RUN_ID="$rid"; LAST_CALL_RC=127; LAST_ALIVE=0; LAST_OUT=""
    return 1
  fi

  if ! resolve_mapbytes_backend; then
    kill "$sampler" 2>/dev/null
    teardown "$pid" "$rid" "$data" >/dev/null
    LAST_RUN_ID="$rid"; LAST_CALL_RC=126; LAST_ALIVE=0; LAST_OUT=""
    return 1
  fi

  LAST_OUT="$rundir/raw/$label.json"
  probe_call map_bytes "$(jargs "$REPO_ROOT/$fixture")" "$CALL_TIMEOUT" \
    > "$LAST_OUT" 2> "$rundir/raw/$label.err"
  LAST_CALL_RC=$?

  # Did the host survive? A probe that drove the runtime into a C-level abort
  # never reaches the structured log — the exit code and stderr are the whole
  # evidence.
  if kill -0 "$pid" 2>/dev/null; then LAST_ALIVE=1; else LAST_ALIVE=0; fi

  # Let the sampler catch the tail of the allocation before it stops.
  sleep 0.3
  kill "$sampler" 2>/dev/null

  # Preserve stderr BEFORE teardown deletes the data path.
  cp "$rundir/caido.stderr.log" "$rundir/raw/$label.caido-stderr.log" 2>/dev/null

  teardown "$pid" "$rid" "$data" >/dev/null
  LAST_RUN_ID="$rid"

  # --- SCRUB THE CHECKOUT PREFIX OUT OF THE RUN EVIDENCE --------------------
  # A CONTROL, NOT TIDINESS (threat T-00-14). `instance.sh` records the ABSOLUTE
  # CAIDO_BIN it was handed, and the probe echoes the absolute fixture path it
  # was called with — and unlike every earlier phase, THIS probe's binary lives
  # INSIDE THE CHECKOUT, so both strings run through the operator's home
  # directory. Zero tracked files under any results/runs/ carry one today and
  # this phase does not become the first. instance.sh belongs to Phase 0 and is
  # NOT modified; the rewrite happens here, after teardown, on this run's own
  # files. The paths stay REAL and checkable, just repo-relative.
  #
  # LOUD, NOT BEST-EFFORT: the assertion below fails the point if anything
  # survives, because a privacy control that silently no-ops is not a control.
  python3 - "$rundir" "$REPO_ROOT" <<'PY'
import json, os, sys
rundir, root = sys.argv[1], sys.argv[2].rstrip("/") + "/"
for base, _dirs, files in os.walk(rundir):
    for name in files:
        if not name.endswith(".json"):
            continue
        p = os.path.join(base, name)
        raw = open(p, encoding="utf-8").read()
        if root in raw:
            open(p, "w", encoding="utf-8").write(raw.replace(root, ""))
PY
  if grep -rl -- "$REPO_ROOT/" "$rundir" --include='*.json' >/dev/null 2>&1; then
    echo "FATAL: the checkout prefix survived the scrub under $rundir." >&2
    echo "       Refusing to leave a home-directory path in committed evidence." >&2
    return 1
  fi

  local ec
  ec="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("exit_code"))' "$rundir/instance.json" 2>/dev/null)"
  echo "  $label: rc=$LAST_CALL_RC alive=$LAST_ALIVE exit=$ec run=$rid" >&2

  python3 scripts/phase7/record-point.py \
    --out "$POINTS/$label.json" \
    --label "$label" \
    --fixture "$fixture" \
    --decoded "$decoded" \
    --run-id "$rid" \
    --call-rc "$LAST_CALL_RC" \
    --alive "$LAST_ALIVE" \
    --result "$LAST_OUT" \
    --instance "$rundir/instance.json" \
    --rss "$rundir/rss.csv"
  return 0
}

# ===========================================================================
# THE LADDER
# ===========================================================================
echo "=== map-bytes ladder (fresh instance per point, ports 8941-8945) ===" >&2
while read -r label src decoded port; do
  [ -z "$label" ] && continue
  fixture="$MAPS/inline-$label.js"
  SYNTH="$MAPS/$src $decoded $fixture" bash scripts/phase7/fetch-maps.sh >/dev/null || {
    echo "FATAL: could not build $fixture" >&2
    exit 1
  }
  run_point "$label" "$fixture" "$decoded" "$port"
done <<< "$LADDER"

# ===========================================================================
# THE ARTIFACT
# ===========================================================================
python3 scripts/phase7/assemble.py \
  --points "$POINTS" \
  --out "$RESULT" \
  --expected-version "$MAP_PROBE_EXPECTED_VERSION" \
  --binary "$CAIDO_BIN_REL" \
  --reported-version "$ACTUAL_VERSION" || exit 1

echo "=== wrote $RESULT ===" >&2
