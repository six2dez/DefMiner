#!/usr/bin/env bash
# scripts/spike/run-spike-09-12.sh — SPIKE-09 then SPIKE-12.
#
# Two independent questions sharing one Tier-0 probe, run in this order for a
# reason: SPIKE-09 is harmless and runs on a shared instance; SPIKE-12
# deliberately attempts path traversal against the host filesystem, so it runs
# LAST, ALONE, on its own fresh instance whose data path is disposable and which
# nothing afterwards needs (threat T-00-21).
#
# SPIKE-09 in words: do PRAGMA settings and BEGIN/COMMIT survive across separate
#   exec calls on the pooled SQLite connection, and does the plugin database
#   survive a genuine uninstall-and-reinstall rather than only a force-reinstall?
# SPIKE-12 in words: how does llrt/fs behave for containment?
#
# Ports: SPIKE-09 on 8991, SPIKE-12 on 8993. Never 8080, never 8998,
# never plan 00-03's 8083/8995/8996.
set -euo pipefail

cd "$(dirname "$0")/../.."

export OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
WITNESS_DIR=".spike/spike-12-witness"
mkdir -p "$WITNESS_DIR" .spike

# MEASURED, and not documented anywhere: the REST function endpoint
# JSON.parse()s EACH ELEMENT of `args` individually. The array elements must be
# strings at the HTTP layer (a bare JSON number returns 400 invalid_json), and
# each of those strings is then parsed as JSON in the runtime. So the string
# "sentinel-original" arrives as SOURCE and fails with `unexpected token`, while
# "\"sentinel-original\"" arrives as a string. Verified negatively too: `1+1`
# fails with "unexpected data at the end" and `globalThis.toString()` with
# "unexpected token", so this is JSON.parse and NOT eval — the endpoint is not a
# code-execution surface. The `returns` envelope double-encodes the same way, so
# the transport is symmetric.
#
# jargs builds a correctly double-encoded args array from plain shell strings.
jargs() {
  python3 -c 'import json,sys; print(json.dumps([json.dumps(a) for a in sys.argv[1:]]))' "$@"
}

CLEAN_PIDS=()
cleanup() {
  for p in "${CLEAN_PIDS[@]:-}"; do
    [ -n "$p" ] && kill -9 "$p" 2>/dev/null || true
  done
}
trap cleanup EXIT

# ===========================================================================
# SPIKE-09 — SQLite contracts on the pooled connection
# ===========================================================================
echo "=== SPIKE-09 ===" >&2
export PORT=8991
unset RUN_ID DATA_PATH 2>/dev/null || true

# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

RUN_09="$RUN_ID"
DATA_09="$DATA"
PID_09="$CAIDO_PID"
CLEAN_PIDS+=("$PID_09")
RAW_09="$OUT/runs/$RUN_09/raw"
mkdir -p "$RAW_09"
CAIDO_URL="http://127.0.0.1:$PORT"
TOKEN="$(cat "$OUT/runs/$RUN_09/token")"

gql() {
  curl -s -X POST "$CAIDO_URL/graphql" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "$1"
}

plugin_dirs() { ls -1 "$DATA_09/plugins" 2>/dev/null | sort | tr '\n' ' '; }

probe_install probe/tier0-budgets
BACKEND_1="$BACKEND_ID"; PACKAGE_1="$PACKAGE_ID"
DIRS_1="$(plugin_dirs)"

probe_call sqlite_contracts '[]' > "$RAW_09/spike-09-contracts.json"
echo "contracts recorded" >&2

probe_call sqlite_sentinel_write "$(jargs sentinel-original)" > "$RAW_09/spike-09-sentinel-write.json"

# --- force-reinstall (the case the research already verified) ---------------
probe_install probe/tier0-budgets
BACKEND_2="$BACKEND_ID"; PACKAGE_2="$PACKAGE_ID"
DIRS_2="$(plugin_dirs)"
probe_call sqlite_sentinel_read '[]' > "$RAW_09/spike-09-after-force.json"

# --- genuine uninstall, then a fresh install -------------------------------
# This is research open question 2 and a direct precondition for UPGRADE-01 and
# UPGRADE-04. The UUID was verified stable across five force:true reinstalls;
# what is unknown is whether an OUTRIGHT uninstall allocates a new UUID and
# therefore hands the plugin a brand new, empty database.
#
# The payload's field set is introspected rather than assumed, so a schema
# difference surfaces as a clear error instead of a silent no-op that would make
# "the database survived" mean "nothing was ever uninstalled".
UNINSTALL_FIELDS="$(gql '{"query":"{ __type(name:\"UninstallPluginPackagePayload\"){ fields { name } } }"}' \
  | python3 -c '
import json,sys
d=json.load(sys.stdin)["data"]["__type"]
if not d: sys.exit("UninstallPluginPackagePayload not in schema")
names=[f["name"] for f in d["fields"]]
sel=[]
if "deletedId" in names: sel.append("deletedId")
if "error" in names: sel.append("error{ __typename }")
if not sel: sel.append("__typename")
print(" ".join(sel))')"
echo "uninstall payload selection: $UNINSTALL_FIELDS" >&2

UNINSTALL_RESP="$(gql "{\"query\":\"mutation{ uninstallPluginPackage(id:\\\"$PACKAGE_2\\\"){ $UNINSTALL_FIELDS } }\"}")"
printf '%s\n' "$UNINSTALL_RESP" > "$RAW_09/spike-09-uninstall.json"
python3 -c '
import json,sys
r=json.loads(sys.argv[1])
if r.get("errors"): sys.exit("uninstall graphql errors: "+json.dumps(r["errors"])[:400])
d=r["data"]["uninstallPluginPackage"]
if d.get("error"): sys.exit("uninstall returned error: "+json.dumps(d["error"]))
print("uninstalled ok:", json.dumps(d), file=sys.stderr)
' "$UNINSTALL_RESP"
sleep 2
DIRS_AFTER_UNINSTALL="$(plugin_dirs)"

probe_install probe/tier0-budgets
BACKEND_3="$BACKEND_ID"; PACKAGE_3="$PACKAGE_ID"
DIRS_3="$(plugin_dirs)"
probe_call sqlite_sentinel_read '[]' > "$RAW_09/spike-09-after-uninstall.json"

python3 - "$RAW_09/spike-09-identity.json" <<PY
import json, sys
json.dump({
  "backend_uuid_initial": "$BACKEND_1",
  "backend_uuid_after_force_reinstall": "$BACKEND_2",
  "backend_uuid_after_uninstall_reinstall": "$BACKEND_3",
  "package_id_initial": "$PACKAGE_1",
  "package_id_after_force_reinstall": "$PACKAGE_2",
  "package_id_after_uninstall_reinstall": "$PACKAGE_3",
  "plugin_dirs_initial": "$DIRS_1".split(),
  "plugin_dirs_after_force_reinstall": "$DIRS_2".split(),
  "plugin_dirs_after_uninstall": "$DIRS_AFTER_UNINSTALL".split(),
  "plugin_dirs_after_reinstall": "$DIRS_3".split(),
}, open(sys.argv[1], "w"), indent=2)
PY

teardown "$PID_09" "$RUN_09" "$DATA_09"

python3 scripts/spike/analyse-spike-09-12.py --spike SPIKE-09 \
  --contracts "$RAW_09/spike-09-contracts.json" \
  --sentinel-force "$RAW_09/spike-09-after-force.json" \
  --sentinel-uninstall "$RAW_09/spike-09-after-uninstall.json" \
  --identity "$RAW_09/spike-09-identity.json" \
  > "$RAW_09/spike-09-body.json"

python3 scripts/spike/record-result.py --spike SPIKE-09 --status pass \
  --run "$RUN_09" < "$RAW_09/spike-09-body.json"

# ===========================================================================
# SPIKE-12 — llrt/fs containment, LAST and ALONE on a fresh instance
# ===========================================================================
echo "=== SPIKE-12 ===" >&2
export PORT=8993
unset RUN_ID DATA_PATH BACKEND_ID PACKAGE_ID 2>/dev/null || true

# Witness BEFORE the run. Targeted rather than broad on purpose: plan 00-03 is
# running concurrently and creates its own /tmp/defminer-probe-* data paths, so a
# blanket directory diff would be full of another plan's noise and the signal
# would drown. What matters is whether anything named like a SPIKE-12 escape
# artifact appears anywhere outside this instance's own data path.
python3 scripts/spike/analyse-spike-09-12.py --witness "$WITNESS_DIR/before.json"

# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

RUN_12="$RUN_ID"
DATA_12="$DATA"
PID_12="$CAIDO_PID"
CLEAN_PIDS+=("$PID_12")
RAW_12="$OUT/runs/$RUN_12/raw"
mkdir -p "$RAW_12"

SCRATCH="$DATA_12/spike12/scratch"
OUTSIDE="$DATA_12/spike12/outside"

probe_install probe/tier0-budgets
probe_call fs_surface '[]' > "$RAW_12/spike-12-surface.json"
probe_call fs_containment "$(jargs "$SCRATCH" "$OUTSIDE")" > "$RAW_12/spike-12-containment.json"

# Full recursive listing of everything the run created, captured BEFORE teardown
# removes the data path. This is the positive half of the containment proof: it
# shows where the writes DID land.
find "$DATA_12/spike12" -mindepth 1 2>/dev/null | sed "s|^$DATA_12/||" | sort \
  > "$RAW_12/spike-12-scratch-tree.txt" || true
echo "scratch tree: $(wc -l < "$RAW_12/spike-12-scratch-tree.txt") entries" >&2

python3 scripts/spike/analyse-spike-09-12.py --witness "$WITNESS_DIR/after.json"

teardown "$PID_12" "$RUN_12" "$DATA_12"

python3 scripts/spike/analyse-spike-09-12.py --spike SPIKE-12 \
  --surface "$RAW_12/spike-12-surface.json" \
  --containment "$RAW_12/spike-12-containment.json" \
  --witness-before "$WITNESS_DIR/before.json" \
  --witness-after "$WITNESS_DIR/after.json" \
  --data-path "$DATA_12" \
  --tree "$RAW_12/spike-12-scratch-tree.txt" \
  > "$RAW_12/spike-12-body.json"

python3 scripts/spike/record-result.py --spike SPIKE-12 --status pass \
  --run "$RUN_12" < "$RAW_12/spike-12-body.json"

echo "SPIKE-09 run=$RUN_09  SPIKE-12 run=$RUN_12" >&2
