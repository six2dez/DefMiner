#!/usr/bin/env bash
# scripts/spike/probe-run.sh — zip a Tier-0 probe, install it, resolve its backend
# UUID, and optionally call one of its functions over REST.
#
# Sourced usage (the normal one — keeps BACKEND_ID in the caller's shell):
#   source scripts/spike/probe-run.sh
#   probe_install probe/tier0-core
#   probe_call capabilities '[]' > out.json
#
# Direct usage:
#   bash scripts/spike/probe-run.sh <probe-dir> <function-name> [args-json]
#
# Requires RUN_ID / PORT / OUT in the environment (instance.sh exports them).
set -euo pipefail

OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"
RUN_DIR_BASE="$OUT/runs"

_probe_ctx() {
  : "${RUN_ID:?probe-run: RUN_ID not set — source scripts/spike/instance.sh first}"
  : "${PORT:?probe-run: PORT not set — source scripts/spike/instance.sh first}"
  CAIDO_URL="http://127.0.0.1:$PORT"
  TOKEN="$(cat "$RUN_DIR_BASE/$RUN_ID/token")"
}

# probe_install <probe-dir> -> exports BACKEND_ID, PACKAGE_ID
probe_install() {
  local dir="${1:?probe_install: probe directory required}"
  _probe_ctx
  [ -f "$dir/manifest.json" ] || { echo "FATAL: $dir/manifest.json not found" >&2; return 1; }

  local zip; zip="$(cd "$dir" && pwd)/../$(basename "$dir").zip"
  rm -f "$zip"
  # The zip is unsigned. Signing is only required for STORE distribution; a plain
  # archive installs cleanly for local use, which is what caido-dev's own bundler
  # produces anyway.
  ( cd "$dir" && zip -qr "$zip" . )
  PROBE_ZIP_SHA="$(shasum -a 256 "$zip" | cut -d' ' -f1)"

  # force:true is required for reinstall — without it a package whose version is
  # not greater than the installed one fails with AlreadyInstalled.
  # `$f` is a GraphQL variable name and must stay literal in the JSON body.
  # shellcheck disable=SC2016
  local ops='{"query":"mutation I($f: Upload){ installPluginPackage(input:{source:{file:$f},force:true}){ package{ id manifestId plugins{ __typename ... on PluginBackend{ id enabled } } } error{ __typename } } }","variables":{"f":null}}'
  local resp
  resp="$(curl -s -X POST "$CAIDO_URL/graphql" \
    -H "Authorization: Bearer $TOKEN" \
    -F "operations=$ops" \
    -F 'map={"0":["variables.f"]}' \
    -F "0=@$zip;type=application/zip")"
  printf '%s' "$resp" > "$RUN_DIR_BASE/$RUN_ID/install-$(basename "$dir").json"

  # Parse the UUID and ASSERT error is null. A non-null error field with an
  # otherwise-200 response is the failure mode that would silently produce a
  # measurement against a plugin that never installed.
  local parsed
  parsed="$(printf '%s' "$resp" | python3 -c '
import json, sys
r = json.load(sys.stdin)
if r.get("errors"):
    sys.exit("install failed (graphql errors): " + json.dumps(r["errors"])[:400])
d = (r.get("data") or {}).get("installPluginPackage")
if d is None:
    sys.exit("install failed (no data): " + json.dumps(r)[:400])
if d.get("error") is not None:
    sys.exit("install failed (mutation error): " + json.dumps(d["error"])[:400])
pkg = d["package"]
backends = [p["id"] for p in pkg["plugins"] if p["__typename"] == "PluginBackend"]
if not backends:
    sys.exit("install produced no backend plugin")
print(backends[0]); print(pkg["id"])
')"
  BACKEND_ID="$(printf '%s' "$parsed" | sed -n 1p)"
  PACKAGE_ID="$(printf '%s' "$parsed" | sed -n 2p)"
  export BACKEND_ID PACKAGE_ID PROBE_ZIP_SHA
  # Installed plugins auto-enable; there is no separate enable step.
  echo "installed $(basename "$dir"): backend=$BACKEND_ID package=$PACKAGE_ID" >&2
}

# probe_call <function-name> [args-json] [timeout-s] -> parsed `returns` on stdout
probe_call() {
  local fn="${1:?probe_call: function name required}"
  local args="${2:-[]}"
  local tmo="${3:-300}"
  _probe_ctx
  : "${BACKEND_ID:?probe_call: BACKEND_ID not set — run probe_install first}"

  local body
  body="$(python3 -c 'import json,sys; print(json.dumps({"name": sys.argv[1], "args": json.loads(sys.argv[2])}))' "$fn" "$args")"

  # The Python program is intentionally single-quoted; shell expansion would
  # corrupt its source before Python receives it.
  # shellcheck disable=SC2016
  curl -s --max-time "$tmo" -X POST "$CAIDO_URL/plugin/backend/$BACKEND_ID/function" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "$body" \
  | python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    env = json.loads(raw)
except Exception:
    sys.exit("probe_call: non-JSON response: " + raw[:400])
if env.get("kind") != "success":
    sys.exit("probe_call failed: " + json.dumps(env)[:800])
# The envelope DOUBLE-ENCODES: `returns` is itself a JSON string.
print(json.dumps(json.loads(env["returns"])))
'
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  probe_install "${1:?usage: probe-run.sh <probe-dir> <function> [args-json]}"
  [ $# -ge 2 ] && probe_call "$2" "${3:-[]}"
fi
