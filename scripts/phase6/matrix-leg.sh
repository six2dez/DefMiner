#!/usr/bin/env bash
# scripts/phase6/matrix-leg.sh — ONE deployment shape, ONE leg record (DEPLOY-01).
#
#   bash scripts/phase6/matrix-leg.sh <local-desktop|remote-cli|docker-volume|docker-no-volume>
#
# DEPLOY-01 names four shapes, and the property DEPLOY-02 and DEPLOY-03 exist
# because of is that the server's disk is not the operator's. On ONE machine the
# desktop and command-line legs SHARE A FILESYSTEM, so only the container legs
# genuinely exercise that property. Every leg record says which other leg it
# shares a filesystem with, so four green legs are never read as four independent
# confirmations of something two of them test.
#
# D-22's FOUR ASSERTIONS, identical on every leg, chosen because each item
# genuinely differs by deployment shape:
#
#   1. the plugin package installs and startup reports COMPATIBLE — on `caido-cli`
#      as well as the desktop app;
#   2. migrations run and the EXPECTED TABLE SET is present;
#   3. one proxied JavaScript response produces one artifact row and one
#      observation row;
#   4. after the leg's OWN restart the data is PRESENT — EXCEPT on the container
#      without a volume, where it must be ABSENT and the plugin must come back
#      clean on an empty database rather than erroring.
#
# THE FOURTH ASSERTION ON THE NO-VOLUME LEG IS THE ONE THE WHOLE REQUIREMENT
# EXISTS FOR, and it is the one easiest to fake. `docker restart` and
# `docker stop && docker start` both PRESERVE the writable layer — where an
# unmounted container's Caido data lives, because the image declares no VOLUME
# (measured from the registry config blob, not assumed). Either would report a
# pass on the assertion meant to prove ABSENCE. This leg therefore stops, REMOVES
# and RUNS A NEW CONTAINER. See the removal below; the comment beside it says why.
#
# D-21 — THE VERSION CONSTANT IS THIS MATRIX'S OWN. `scripts/spike/instance.sh`
# defaults to Phase 1's pinned value, and five `tests/*.spec.ts` files pin the
# same string. That is not drift: it is a fail-closed tripwire over the Phase 0
# threshold artifacts, every one of which was measured on that older build.
# Reusing it here would make every leg fail by design; editing it would
# contaminate the tripwire. This script declares its own constant below and
# passes it IN as EXPECT_VERSION. It reads neither of theirs and edits neither.
#
# The literal older string appears NOWHERE in this file, deliberately: the
# prohibition is meant to be checkable by grep, and a comment quoting the value
# would defeat the only mechanical check anyone is likely to run.
#
# D-23 — AN UNREACHABLE LEG IS RECORDED `not_run` WITH ITS REASON, never as a
# pass, and every one of its assertions is null. No Docker, a pull failure, an
# install failure, a port refusal: all of them write a leg record and exit 3, a
# code the batch runner distinguishes from a hard failure. The phase can still
# complete; DEPLOY-01's checkbox does not move on the strength of a leg that
# never executed. A local approximation marked green is exactly what this forbids.
#
# PORTS. This leg owns 8951-8955, a block below every one already spoken for:
#   8080       the operator's LIVE Caido desktop instance with real project data.
#              REFUSED UNCONDITIONALLY, here and inside instance.sh.
#   8998       the long-lived SPIKE-10 recorder instance. Nothing here kills a
#              process it did not start, so its pid is never at risk.
#   8999, 8991-8996, 8981-8985, 8081-8083   Phase 0's.
#   8971-8975  Phase 1's.  8961-8965  Phase 6's O-07 probe.
#
# WHAT THIS SCRIPT WILL NOT DO. It will not write into
# `.planning/phases/00-runtime-reality-check/results/` (Pitfall 7, T-06-53), it
# will not edit `scripts/spike/instance.sh`, it will not invoke bare `caido-cli`
# from PATH (a STALE 0.55.3 on this machine), it will not reuse an existing
# container name, and it will not record ANYTHING against a build that reports a
# version other than the constant below.
set -euo pipefail

cd "$(dirname "$0")/../.."

LEG="${1:-}"
case "$LEG" in
  local-desktop | remote-cli | docker-volume | docker-no-volume) ;;
  *)
    echo "usage: matrix-leg.sh <local-desktop|remote-cli|docker-volume|docker-no-volume>" >&2
    exit 2
    ;;
esac

# --- D-21: the matrix's OWN pinned constant ---------------------------------
MATRIX_EXPECTED_VERSION="0.58.2"
IMAGE_REPO="caido/caido"
IMAGE_TAG="$MATRIX_EXPECTED_VERSION"
# The data directory INSIDE the published image. A container-internal path: a
# property of the image, identical on every machine that pulls that digest.
CONTAINER_DATA_PATH="/home/caido/.local/share/caido"

RESULTS=".planning/phases/06-retroactive-scan-deployment-reality/results"
LEGS_DIR="$RESULTS/legs"
LEG_FILE="$LEGS_DIR/$LEG.json"
# instance.sh writes its per-run directory under $OUT. Pointed at THIS phase's
# results root so nothing lands beside the Phase 0 threshold artifacts.
export OUT="${OUT:-$RESULTS}"

case "$LEG" in
  local-desktop) PORT=8951 ;;
  remote-cli) PORT=8952 ;;
  docker-volume) PORT=8953 ;;
  docker-no-volume) PORT=8954 ;;
esac
ORIGIN_PORT="${MATRIX_ORIGIN_PORT:-8955}"
CONTAINER_NAME="defminer-matrix-${LEG#docker-}"

CAIDO_BIN="${CAIDO_BIN:-/Applications/Caido.app/Contents/Resources/bin/caido-cli}"

mkdir -p "$LEGS_DIR"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/defminer-matrix-$LEG.XXXXXX")"

# ---------------------------------------------------------------------------
# Every fact the leg record is built from. Declared up front and defaulted to
# the honest "nothing measured" value, so a leg that dies half way records nulls
# rather than whatever a previous assignment happened to leave behind.
# ---------------------------------------------------------------------------
LEG_STATUS="fail"
LEG_REASON=""
A_INSTALL="null"
A_TABLES="null"
A_ARTIFACT="null"
A_RESTART="null"
REPORTED_VERSION=""
BINARY_SHA=""
MANIFEST_DIGEST=""
PLUGIN_INSTALL_ROUTE="graphql-upload"
PROJECT_PERSISTENCE="temporary"
VOLUME_MOUNTED="false"
VOLUME_FIXUP=""
RESTART_METHOD=""
RESTART_EXPECT_PRESENT="true"
RESTART_DATA_PRESENT="null"
ART_BEFORE="null"
ART_AFTER="null"
OBS_BEFORE="null"
OBS_AFTER="null"
TABLES_AFTER_JSON="null"
STARTUP_CLEAN="null"
SCHEMA_BEFORE="null"
SCHEMA_AFTER="null"
CURSOR_JSON=""
NOTES=""
LEG_RUN_ID=""

[ "$LEG" = "docker-no-volume" ] && RESTART_EXPECT_PRESENT="false"

# WHICH OTHER LEG THIS ONE SHARES A FILESYSTEM WITH, on this host. The two native
# legs run the same binary against two data directories on the same disk, which
# is the honest reading and the exact property DEPLOY-02 and DEPLOY-03 exist
# because of. A container's disk is not the host's, so the container legs are
# null — and they are the two that actually carry the property.
#
# MATRIX_CLI_REMOTE_HOST is the escape hatch: set it when the command-line leg is
# genuinely run against another machine, and both native legs record no sharing.
case "$LEG" in
  local-desktop)
    SHARES='["remote-cli"]'
    [ -n "${MATRIX_CLI_REMOTE_HOST:-}" ] && SHARES='[]'
    ;;
  remote-cli)
    SHARES='["local-desktop"]'
    [ -n "${MATRIX_CLI_REMOTE_HOST:-}" ] && SHARES='null'
    ;;
  *) SHARES='null' ;;
esac

note() { NOTES="${NOTES:+$NOTES }$1"; }

# ---------------------------------------------------------------------------
# EXPECTED_TABLES — READ from the shipped spec, never re-typed here.
#
# A second hand-maintained copy of the table list would drift the moment a
# migration adds a table, and this leg would then be checking the copy. The
# extraction fails loudly rather than falling back to a literal.
# ---------------------------------------------------------------------------
EXPECTED_TABLES_JSON="$(python3 - <<'PY'
import json, re, sys
src = open("packages/backend/src/store/schema.spec.ts", encoding="utf-8").read()
m = re.search(r"const EXPECTED_TABLES = \[(.*?)\];", src, re.S)
if m is None:
    sys.exit("could not read EXPECTED_TABLES out of packages/backend/src/store/schema.spec.ts")
tables = re.findall(r'"([A-Za-z_][A-Za-z0-9_]*)"', m.group(1))
if not tables:
    sys.exit("EXPECTED_TABLES parsed empty")
print(json.dumps(sorted(tables)))
PY
)"
echo "expected tables: $EXPECTED_TABLES_JSON" >&2

# ---------------------------------------------------------------------------
# The leg record. ONE emitter, so every exit path writes the same shape.
# ---------------------------------------------------------------------------
emit_leg() {
  LEG_NAME="$LEG" LEG_STATUS="$LEG_STATUS" LEG_REASON="$LEG_REASON" \
  A_INSTALL="$A_INSTALL" A_TABLES="$A_TABLES" A_ARTIFACT="$A_ARTIFACT" \
  A_RESTART="$A_RESTART" \
  BIN_PATH="$CAIDO_BIN" EXPECTED="$MATRIX_EXPECTED_VERSION" \
  REPORTED="$REPORTED_VERSION" BSHA="$BINARY_SHA" \
  IMG="$IMAGE_REPO" TAG="$IMAGE_TAG" DIGEST="$MANIFEST_DIGEST" \
  CNAME="$CONTAINER_NAME" CDATA="$CONTAINER_DATA_PATH" \
  SHARES="$SHARES" NOTES="$NOTES" LISTEN="127.0.0.1:$PORT" \
  RID="$LEG_RUN_ID" ROUTE="$PLUGIN_INSTALL_ROUTE" PERSIST="$PROJECT_PERSISTENCE" \
  VMOUNT="$VOLUME_MOUNTED" VFIX="$VOLUME_FIXUP" \
  R_METHOD="$RESTART_METHOD" R_EXPECT="$RESTART_EXPECT_PRESENT" \
  R_PRESENT="$RESTART_DATA_PRESENT" \
  AB="$ART_BEFORE" AA="$ART_AFTER" OB="$OBS_BEFORE" OA="$OBS_AFTER" \
  TABLES_AFTER="$TABLES_AFTER_JSON" CLEAN="$STARTUP_CLEAN" \
  SVB="$SCHEMA_BEFORE" SVA="$SCHEMA_AFTER" CURSOR="$CURSOR_JSON" \
  OUTFILE="$LEG_FILE" \
  python3 - <<'PY'
import json, os

def tri(name):
    """A three-state read. `null` is NOT `false`: an assertion that did not run
    and an assertion that ran and failed are different facts, and collapsing
    them is how a leg that never executed becomes a silent result (D-23)."""
    v = os.environ.get(name, "null")
    if v in ("", "null"):
        return None
    return v == "true"

def num(name):
    v = os.environ.get(name, "null")
    if v in ("", "null"):
        return None
    return int(v)

def jsonish(name, default=None):
    v = os.environ.get(name, "")
    if v in ("", "null"):
        return default
    return json.loads(v)

leg = os.environ["LEG_NAME"]
container = leg.startswith("docker-")

if container:
    binary = {
        "kind": "container",
        "image": os.environ["IMG"],
        "tag": os.environ["TAG"],
        "expected_version": os.environ["EXPECTED"],
        "reported_version": os.environ["REPORTED"] or None,
        "manifest_digest": os.environ["DIGEST"] or None,
        "container_name": os.environ["CNAME"],
        "data_path": os.environ["CDATA"],
    }
else:
    binary = {
        "kind": "native",
        "path": os.environ["BIN_PATH"],
        "expected_version": os.environ["EXPECTED"],
        "reported_version": os.environ["REPORTED"] or None,
        "sha256": os.environ["BSHA"] or None,
    }

rec = {
    "leg": leg,
    "status": os.environ["LEG_STATUS"],
    "assertions": {
        "install_and_compatible": tri("A_INSTALL"),
        "migrations_and_tables": tri("A_TABLES"),
        "artifact_and_observation": tri("A_ARTIFACT"),
        "restart_data_presence": tri("A_RESTART"),
    },
    "binary": binary,
    "shares_filesystem_with": jsonish("SHARES"),
    "notes": os.environ["NOTES"],
    "run_id": os.environ["RID"] or None,
    "listen": os.environ["LISTEN"],
    "project_persistence": os.environ["PERSIST"] or None,
    "plugin_install_route": os.environ["ROUTE"] or None,
}

reason = os.environ.get("LEG_REASON", "").strip()
if reason:
    rec["reason"] = reason

if container:
    rec["volume"] = {
        "mounted": os.environ["VMOUNT"] == "true",
        "ownership_fixup": os.environ["VFIX"] or None,
    }

if os.environ.get("R_METHOD"):
    rec["restart"] = {
        "method": os.environ["R_METHOD"],
        "expected_data_present": os.environ["R_EXPECT"] == "true",
        "data_present": tri("R_PRESENT"),
        "artifacts_before": num("AB"),
        "artifacts_after": num("AA"),
        "observations_before": num("OB"),
        "observations_after": num("OA"),
        "tables_after": jsonish("TABLES_AFTER"),
        "startup_clean": tri("CLEAN"),
        "schema_version_before": num("SVB"),
        "schema_version_after": num("SVA"),
    }

cursor = jsonish("CURSOR")
if cursor is not None:
    rec["cursor_probe"] = cursor

with open(os.environ["OUTFILE"], "w", encoding="utf-8") as fh:
    json.dump(rec, fh, indent=2)
    fh.write("\n")
print("leg record written: " + os.environ["OUTFILE"])
PY
}

# NOT RUN — D-23's discipline as a function. Every assertion is BLANKED, so an
# assertion that happened to succeed before the blocker appeared cannot be
# carried into a record for a leg that did not complete.
not_run() {
  LEG_STATUS="not_run"
  LEG_REASON="$1"
  A_INSTALL="null"; A_TABLES="null"; A_ARTIFACT="null"; A_RESTART="null"
  RESTART_METHOD=""
  CURSOR_JSON=""
  note "NOT RUN."
  echo "NOT RUN [$LEG]: $1" >&2
  emit_leg
  exit 3
}

leg_fail() {
  LEG_STATUS="fail"
  LEG_REASON="$1"
  echo "FAIL [$LEG]: $1" >&2
  emit_leg
  exit 1
}

# ---------------------------------------------------------------------------
# Teardown. NOTHING here kills a process or removes a container it did not
# create: the operator's live instance on 8080 and the long-lived recorder on
# 8998 are both out of reach by construction (T-06-50).
# ---------------------------------------------------------------------------
ORIGIN_PID=""
OWN_CONTAINER=""
cleanup() {
  local code=$?
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  # instance.sh's OWN teardown, never a fresh kill: it force-kills (a wedged
  # QuickJS thread never honours SIGTERM), copies the host log out and deletes
  # the guest token.
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
  if [ -n "$OWN_CONTAINER" ]; then
    docker rm -f "$OWN_CONTAINER" >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK" "${MATRIX_DATA_PATH:-}"
  exit $code
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# GATE 1 — the ports are ours to take. BEFORE anything is launched or recorded.
#
# 8080 is refused UNCONDITIONALLY and before the LISTEN check, so the error names
# the real reason: it is the operator's live Caido desktop instance, with real
# project data. instance.sh refuses it too; the check is repeated here because the
# container legs never reach instance.sh at all.
# ---------------------------------------------------------------------------
for p in "$PORT" "$ORIGIN_PORT"; do
  if [ "$p" = "8080" ]; then
    echo "FATAL: refusing port 8080 — that is the operator's live Caido desktop instance." >&2
    exit 1
  fi
done
for p in "$PORT" "$ORIGIN_PORT"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    not_run "port $p is already in LISTEN state; refusing to collide with a process this harness did not start"
  fi
done

HOST_OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
HOST_ARCH="$(uname -m)"

# ---------------------------------------------------------------------------
# GATE 2 — the build. Refuse to record ANYTHING against an unexpected version.
# ---------------------------------------------------------------------------
if [ "${LEG#docker-}" != "$LEG" ]; then
  # --- container-shaped version gate -----------------------------------------
  command -v docker >/dev/null 2>&1 ||
    not_run "the docker CLI is not installed on this host"
  docker info >/dev/null 2>&1 ||
    not_run "the Docker engine is not running or is unreachable from this host"

  docker image inspect "$IMAGE_REPO:$IMAGE_TAG" >/dev/null 2>&1 ||
    docker pull "$IMAGE_REPO:$IMAGE_TAG" >/dev/null 2>&1 ||
    not_run "could not pull $IMAGE_REPO:$IMAGE_TAG"

  # The RESOLVED digest, not the moving tag — so the artifact names the exact
  # image a future reader would have to re-pull to reproduce this (T-06-SC).
  MANIFEST_DIGEST="$(docker image inspect --format '{{if .RepoDigests}}{{index .RepoDigests 0}}{{end}}' \
    "$IMAGE_REPO:$IMAGE_TAG" 2>/dev/null || true)"
  [ -n "$MANIFEST_DIGEST" ] ||
    not_run "could not resolve a manifest digest for $IMAGE_REPO:$IMAGE_TAG"

  # The image's own command-line entry point, through a THROW-AWAY container,
  # before anything is recorded. No architecture platform flag: the registry
  # publishes a native manifest for this machine's architecture, measured rather
  # than inherited from documentation that is stale on this point.
  REPORTED_VERSION="$(docker run --rm --entrypoint caido-cli "$IMAGE_REPO:$IMAGE_TAG" --version 2>/dev/null | awk '{print $2}' || true)"
  if [ "$REPORTED_VERSION" != "$MATRIX_EXPECTED_VERSION" ]; then
    echo "FATAL: version mismatch. expected $MATRIX_EXPECTED_VERSION, got ${REPORTED_VERSION:-<none>} ($IMAGE_REPO:$IMAGE_TAG)" >&2
    echo "       Refusing to record any measurement against an unexpected build (D-21)." >&2
    leg_fail "the image $IMAGE_REPO:$IMAGE_TAG reports ${REPORTED_VERSION:-<none>}, not $MATRIX_EXPECTED_VERSION"
  fi

  # An existing container name is REFUSED, never reused. The same reason that
  # makes the 8080 refusal unconditional: nothing here may touch state the
  # harness did not create.
  if [ -n "$(docker ps -aq -f "name=^${CONTAINER_NAME}$" 2>/dev/null)" ]; then
    not_run "a container named $CONTAINER_NAME already exists; refusing to reuse or remove state this harness did not create"
  fi
  echo "image       : $IMAGE_REPO:$IMAGE_TAG reports $REPORTED_VERSION ($MANIFEST_DIGEST)" >&2
else
  # --- native version gate ---------------------------------------------------
  # Repeated here rather than left to instance.sh for one reason: on a mismatch
  # this leg must record a REFUSAL, and by the time instance.sh has failed we are
  # already inside the run.
  [ -x "$CAIDO_BIN" ] ||
    not_run "$CAIDO_BIN is not executable on this host"
  REPORTED_VERSION="$("$CAIDO_BIN" --version 2>/dev/null | awk '{print $2}' || true)"
  if [ "$REPORTED_VERSION" != "$MATRIX_EXPECTED_VERSION" ]; then
    echo "FATAL: version mismatch. expected $MATRIX_EXPECTED_VERSION, got ${REPORTED_VERSION:-<none>} ($CAIDO_BIN)" >&2
    echo "       Refusing to record any measurement against an unexpected build (D-21)." >&2
    echo "       NOTE: bare 'caido-cli' on PATH resolves to a STALE 0.55.3 on this machine." >&2
    leg_fail "$CAIDO_BIN reports ${REPORTED_VERSION:-<none>}, not $MATRIX_EXPECTED_VERSION"
  fi
  BINARY_SHA="$(shasum -a 256 "$CAIDO_BIN" | cut -d' ' -f1)"
  echo "binary      : $CAIDO_BIN reports $REPORTED_VERSION" >&2
fi

# ---------------------------------------------------------------------------
# The build under test. The SHIPPED plugin, unmodified — a matrix run against a
# modified build is evidence about nothing that ships.
# ---------------------------------------------------------------------------
pnpm exec caido-dev build packages >/dev/null 2>&1 ||
  not_run "the plugin build failed on this host"
[ -f packages/dist/plugin_package/manifest.json ] ||
  not_run "the build produced no plugin package"

# ---------------------------------------------------------------------------
# The origin — one JavaScript response, generated rather than taken from the
# gitignored corpus, so this harness re-runs on a clean checkout.
# ---------------------------------------------------------------------------
FIXDIR="$WORK/fixtures"
mkdir -p "$FIXDIR"
python3 - "$FIXDIR" <<'PY'
import os, sys
# THREE fixtures, not one, and each with a DISTINCT body.
#
# One request cannot demonstrate an ORDER, and assumption A2 — that `row.id`
# ordering agrees with `descending("req","id")` — is one of the two facts the
# re-derivable resume position actually depends on. A single-row probe reports it
# as null forever, which reads as "not measured" when the truth is "not
# measurable from one row".
#
# DISTINCT bodies, not the same body three times: three requests for identical
# content would be two content-hash cache SKIPS, which exercises CORE-08's skip
# rather than the walk and would leave one artifact row where the leg expects
# three.
#
# Deterministic, comfortably inside AST_MAX_BYTES, and unmistakably JavaScript so
# admit()'s kind axis has no ambiguity to resolve.
d = sys.argv[1]
for n in range(3):
    lines = ["// DefMiner deployment-matrix fixture %d — generated, never fetched.\n" % n]
    for i in range(200):
        lines.append(
            "export function matrixFixture%d_%03d(a, b) { return a + b + %d; }\n"
            % (n, i, i * (n + 1))
        )
    open(os.path.join(d, "matrix-fixture-%d.js" % n), "w", encoding="utf-8").write("".join(lines))
PY

python3 scripts/spike/origin.py --dir "$FIXDIR" --port "$ORIGIN_PORT" \
  > "$WORK/origin.log" 2>&1 &
ORIGIN_PID=$!
for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" && break
  kill -0 "$ORIGIN_PID" 2>/dev/null ||
    not_run "the local origin died during startup"
  sleep 0.25
done
curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" ||
  not_run "the local origin did not become ready on 127.0.0.1:$ORIGIN_PORT"
echo "origin      : up on 127.0.0.1:$ORIGIN_PORT" >&2

# ---------------------------------------------------------------------------
# Shared helpers. Identical on every leg, so the four assertions are literally
# the same code on all four shapes rather than four look-alike implementations.
# ---------------------------------------------------------------------------
CAIDO_URL="http://127.0.0.1:$PORT"
TOKEN=""

gql() {
  curl -s -X POST "$CAIDO_URL/graphql" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "$1"
}

mint_token() {  # $1 = run id; writes the token under 0600 BEFORE it exists
  local rid="$1" rd="$OUT/runs/$1"
  mkdir -p "$rd"
  local t
  t="$(curl -s -X POST "$CAIDO_URL/graphql" -H 'Content-Type: application/json' \
    -d '{"query":"mutation{ loginAsGuest{ token{ accessToken } } }"}' \
    | python3 -c 'import json,sys
d=json.load(sys.stdin)
print((((d.get("data") or {}).get("loginAsGuest") or {}).get("token") or {}).get("accessToken") or "")' 2>/dev/null || true)"
  [ -n "$t" ] || return 1
  ( umask 077; printf '%s\n' "$t" > "$rd/token" )
  chmod 600 "$rd/token"
  TOKEN="$t"
  export RUN_ID="$rid"
}

# A fresh Caido has NO project, and with none selected the proxy answers
# "Proxying error: Internal" and onInterceptResponse NEVER FIRES. A hard
# prerequisite for every traffic-observing leg. A guest may create TEMPORARY
# projects only — which is also why the after-restart counts are read from the
# DATABASE FILE and never from the project-scoped RPC (see snapshot_db).
select_project() {
  local pid
  pid="$(gql "{\"query\":\"mutation{ createProject(input:{name:\\\"matrix-$LEG\\\",temporary:true}){ project{ id } error{ __typename } } }\"}" \
    | python3 -c 'import json,sys
d=(json.load(sys.stdin).get("data") or {}).get("createProject") or {}
print("" if d.get("error") or not d.get("project") else d["project"]["id"])')"
  [ -n "$pid" ] || return 1
  gql "{\"query\":\"mutation{ selectProject(id:\\\"$pid\\\"){ error{ __typename } } }\"}" \
    | python3 -c 'import json,sys
d=(json.load(sys.stdin).get("data") or {}).get("selectProject") or {}
sys.exit(1 if d.get("error") else 0)'
}

poll_ready() {  # $1 = seconds
  local n="${1:-90}"
  for _ in $(seq 1 "$n"); do
    if curl -sf -o /dev/null -X POST "$CAIDO_URL/graphql" \
        -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}' 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# THE DATABASE, READ FROM OUTSIDE CAIDO — the only instrument that works on both
# sides of a restart.
#
# `sdk.meta.db()` lands at <data-path>/plugins/<backend-uuid>/data.db. The whole
# plugin directory is COPIED to scratch and opened read-write THERE, never in
# place: a copy can checkpoint its own WAL, so a SIGKILLed instance's committed
# rows are visible, and the original is never touched by the measuring
# instrument. `$1` is the source directory, `$2` the output JSON.
snapshot_db() {
  local src="$1" out="$2" scratch
  scratch="$WORK/db-$(date +%s%N)"
  mkdir -p "$scratch"
  cp -R "$src"/. "$scratch"/ 2>/dev/null || true
  local db
  db="$(find "$scratch" -name 'data.db' 2>/dev/null | head -1)"
  if [ -z "$db" ] || [ ! -f "$db" ]; then
    printf '%s\n' '{"found": false}' > "$out"
    return 0
  fi
  python3 - "$db" "$out" <<'PY'
import json, sqlite3, sys
db, out = sys.argv[1], sys.argv[2]
con = sqlite3.connect(db)
cur = con.cursor()
def scalar(sql):
    try:
        return cur.execute(sql).fetchone()[0]
    except sqlite3.Error:
        return None
tables = sorted(r[0] for r in cur.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
json.dump({
    "found": True,
    "tables": tables,
    "user_version": scalar("PRAGMA user_version"),
    "artifacts": scalar("SELECT COUNT(*) FROM artifacts"),
    "observations": scalar("SELECT COUNT(*) FROM observations"),
}, open(out, "w"), indent=2)
PY
}

# EVERY ARGUMENT IS DOUBLE-ENCODED: one json.dumps per argument, then one for
# the array. This is a measured property of the backend-function route, not a
# style — `{"args":[["1","2"]]}` is rejected outright with `invalid type:
# sequence, expected a string`, and a SINGLY-encoded string is JSON-decoded once
# by the route before the handler sees it. A bare base64 cursor passed singly
# comes back as `unexpected token`, because the route tries to parse the cursor
# itself as JSON. `scripts/phase6/o07-body-length.sh` names the same shape.
jargs() {
  python3 -c 'import json,sys; print(json.dumps([json.dumps(a) for a in sys.argv[1:]]))' "$@"
}

jq_get() {  # $1 = file, $2 = python expression over `d`
  python3 -c 'import json,sys
d=json.load(open(sys.argv[1]))
v=eval(sys.argv[2])
print("null" if v is None else ("true" if v is True else ("false" if v is False else v)))' "$1" "$2"
}

# The four assertions' shared measurement: one proxied JavaScript response, then
# WAIT for the consumer to drain. Never sleep-and-hope.
proxy_js_fixtures() {  # $1 = origin host AS THE PROXY MUST REACH IT
  local host="$1" n code ok=0
  for n in 0 1 2; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 \
      --proxy "$CAIDO_URL" "http://$host:$ORIGIN_PORT/matrix-fixture-$n.js" 2>/dev/null || echo 000)"
    [ "$code" = "200" ] && ok=$((ok + 1))
  done
  printf '%s' "$ok"
}

drain() {  # poll the SHIPPED plugin's own status until the queue empties
  local n="${1:-60}"
  for _ in $(seq 1 "$n"); do
    if probe_call getStatus '[]' 30 > "$WORK/status.json" 2>/dev/null; then
      local depth
      depth="$(jq_get "$WORK/status.json" 'd.get("queueDepth")')"
      [ "$depth" = "0" ] && return 0
    fi
    sleep 1
  done
  return 1
}

# ---------------------------------------------------------------------------
# THE FOUR ASSERTIONS, run identically on every shape once an instance is up.
# `run_boot1_assertions` leaves ART_BEFORE / OBS_BEFORE / SCHEMA_BEFORE set.
# ---------------------------------------------------------------------------
run_boot1_assertions() {
  local origin_host="$1"

  # --- 1. install and compatible ------------------------------------------
  probe_install packages/dist/plugin_package >&2 ||
    leg_fail "the plugin package did not install on this shape"
  DEFMINER_BACKEND="$BACKEND_ID"
  probe_install probe/phase6-matrix >&2 ||
    leg_fail "the cursor probe did not install on this shape"
  MATRIX_BACKEND="$BACKEND_ID"

  export BACKEND_ID="$DEFMINER_BACKEND"
  probe_call getStatus '[]' 60 > "$WORK/status-boot1.json" ||
    leg_fail "the plugin did not answer getStatus after install"
  local compatible
  compatible="$(jq_get "$WORK/status-boot1.json" 'd.get("compatible")')"
  SCHEMA_BEFORE="$(jq_get "$WORK/status-boot1.json" 'd.get("schemaVersion")')"
  if [ "$compatible" = "true" ]; then
    A_INSTALL="true"
    note "Plugin installed over the GraphQL upload route and reported compatible on boot 1."
  else
    A_INSTALL="false"
    note "Plugin reported INCOMPATIBLE on boot 1."
  fi

  # --- 3. one proxied JavaScript response -> one artifact, one observation --
  local okcount
  okcount="$(proxy_js_fixtures "$origin_host")"
  if [ "$okcount" != "3" ]; then
    A_ARTIFACT="false"
    note "Only $okcount of 3 proxied fetches returned 200."
  else
    drain 90 || true
    local arts obs
    probe_call getArtifacts '[]' 60 > "$WORK/artifacts.json" 2>/dev/null || echo '[]' > "$WORK/artifacts.json"
    probe_call getObservations '[]' 60 > "$WORK/observations.json" 2>/dev/null || echo '[]' > "$WORK/observations.json"
    arts="$(python3 -c 'import json,sys;print(len(json.load(open(sys.argv[1])) or []))' "$WORK/artifacts.json")"
    obs="$(python3 -c 'import json,sys;print(len(json.load(open(sys.argv[1])) or []))' "$WORK/observations.json")"
    if [ "$arts" -ge 1 ] && [ "$obs" -ge 1 ]; then
      A_ARTIFACT="true"
    else
      A_ARTIFACT="false"
      note "One proxied JavaScript response produced $arts artifact rows and $obs observation rows."
    fi
  fi

  # --- O-04, taken BEFORE the restart: mint a cursor -----------------------
  export BACKEND_ID="$MATRIX_BACKEND"
  CURSOR_VALUE=""
  CURSOR_PRESENT="null"
  ID_DECIMAL="null"
  ID_ORDER="null"
  CURSOR_SAMPLE="null"
  if probe_call cursorHead '[]' 60 > "$WORK/cursor-head.json" 2>/dev/null; then
    CURSOR_VALUE="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("cursor") or "")' "$WORK/cursor-head.json")"
    [ -n "$CURSOR_VALUE" ] && CURSOR_PRESENT="true" || CURSOR_PRESENT="false"
  fi
  if probe_call idOrder "$(jargs 20)" 60 > "$WORK/id-order.json" 2>/dev/null; then
    ID_DECIMAL="$(jq_get "$WORK/id-order.json" 'd.get("id_is_decimal_integer")')"
    ID_ORDER="$(jq_get "$WORK/id-order.json" 'd.get("id_ordering_agrees")')"
    CURSOR_SAMPLE="$(jq_get "$WORK/id-order.json" 'd.get("count")')"
  fi
  export BACKEND_ID="$DEFMINER_BACKEND"
}

# THE BEFORE-COUNTS ARE READ AFTER THE INSTANCE HAS STOPPED, and that timing is
# the point rather than an accident. A snapshot taken while Caido is still running
# can miss rows sitting in the write-ahead log, and a before-count that is quietly
# too low turns the restart comparison into a test of flush timing. Stopping first
# is the only moment at which "the state the restart begins from" is fully on disk.
# Is the SHIPPED expected table set present in this snapshot? One implementation,
# used for boot 1 and for the empty-database boot alike.
judge_tables() {  # $1 = snapshot json -> prints true|false
  python3 - "$1" "$EXPECTED_TABLES_JSON" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
want = set(json.loads(sys.argv[2]))
print("true" if d.get("found") and want.issubset(set(d.get("tables") or [])) else "false")
PY
}

capture_before() {  # $1 = plugins directory on the host
  snapshot_db "$1" "$WORK/db-before.json"
  ART_BEFORE="$(jq_get "$WORK/db-before.json" 'd.get("artifacts")')"
  OBS_BEFORE="$(jq_get "$WORK/db-before.json" 'd.get("observations")')"

  # ASSERTION 2 IS JUDGED HERE, at the same flush-safe moment as the counts, and
  # deliberately not on boot 1's live database. A snapshot taken while the
  # instance is running can catch the schema still in the write-ahead log — which
  # is exactly what the container legs did, reporting the table set absent on a
  # database that plainly had it a moment later. Reading after the stop measures
  # the same fact without racing the flush.
  A_TABLES="$(judge_tables "$WORK/db-before.json")"
  [ "$A_TABLES" = "true" ] ||
    note "EXPECTED_TABLES was NOT satisfied in boot 1's database."
}

# O-04's answer, taken AFTER the restart with the cursor minted before it, and
# recorded whichever way it lands. Nothing in the shipped design depends on the
# result: the durable resume position is `scans.last_request_id`, a re-derivable
# decimal integer, and `init()` NULLs `last_cursor` on every boot anyway. A future
# reader must not read a negative answer as a defect.
measure_cursor_after() {
  local resolved="null" err="" measured="false" reason="" control="null"

  # THE CONTROL, AND THE MEASUREMENT IS WORTHLESS WITHOUT IT.
  #
  # A cursor query that fails after a restart has TWO possible causes, and they
  # are different answers to O-04: the cursor was rejected by a runtime that no
  # longer recognises it, or NO query could run at all. On a guest instance the
  # project is TEMPORARY and does not survive the restart, and with none selected
  # every request query fails with MissingConnectionPool — which has nothing to
  # say about cursor lifetime. So a CURSORLESS query runs first. Only if that
  # resolves is the cursored query's failure attributable to the cursor.
  export BACKEND_ID="$MATRIX_BACKEND"
  if probe_call cursorHead '[]' 60 > "$WORK/cursor-control.json" 2>/dev/null; then
    control="$(jq_get "$WORK/cursor-control.json" 'd.get("ok")')"
    [ "$control" = "true" ] ||
      reason="the cursorless control query did not resolve after the restart ($(jq_get "$WORK/cursor-control.json" 'd.get("error") or ""'))"
  else
    control="false"
    reason="the cursorless control query could not run after the restart, so nothing measured here is attributable to the cursor"
  fi
  export BACKEND_ID="$DEFMINER_BACKEND"

  if [ -z "${CURSOR_VALUE:-}" ]; then
    reason="no cursor was available before the restart"
  elif [ "$control" != "true" ]; then
    : # the control already set the reason; the cursored query is not run at all
  else
    export BACKEND_ID="$MATRIX_BACKEND"
    local args
    args="$(jargs "$CURSOR_VALUE")"
    if probe_call cursorAfter "$args" 60 > "$WORK/cursor-after.json" 2>"$WORK/cursor-after.err"; then
      measured="true"
      resolved="$(jq_get "$WORK/cursor-after.json" 'd.get("resolved")')"
      err="$(jq_get "$WORK/cursor-after.json" 'd.get("error") or ""')"
    else
      # The PRECISE text, not a generic sentence. "The probe did not answer" and
      # "the probe answered that the cursor was rejected" are different answers to
      # O-04, and a reason that cannot tell them apart is not a measurement.
      reason="the cursor probe did not answer after the restart: $(tr -d '\n' < "$WORK/cursor-after.err" 2>/dev/null | cut -c1-240)"
    fi
    export BACKEND_ID="$DEFMINER_BACKEND"
  fi
  CURSOR_JSON="$(MEAS="$measured" RES="$resolved" ERR="$err" REA="$reason" \
    CTRL="$control" \
    PRE="${CURSOR_PRESENT:-null}" DEC="${ID_DECIMAL:-null}" ORD="${ID_ORDER:-null}" \
    N="${CURSOR_SAMPLE:-null}" python3 - <<'PY'
import json, os
def tri(v):
    return None if v in ("", "null") else v == "true"
def num(v):
    return None if v in ("", "null") else int(v)
print(json.dumps({
    "measured": os.environ["MEAS"] == "true",
    "reason": os.environ["REA"] or None,
    "cursor_present_before": tri(os.environ["PRE"]),
    "control_query_resolved": tri(os.environ["CTRL"]),
    "resolved_after_restart": tri(os.environ["RES"]),
    "error_after_restart": os.environ["ERR"] or None,
    "id_is_decimal_integer": tri(os.environ["DEC"]),
    "id_ordering_agrees": tri(os.environ["ORD"]),
    "sample_size": num(os.environ["N"]),
    "notes": (
        "control_query_resolved is the attribution control: a CURSORLESS query "
        "run at the same moment. When it is false, the cursored query was never "
        "run and resolved_after_restart is null, because a failure that every "
        "query shares says nothing about cursor lifetime. "
        "O-04, recorded as an observation. The shipped design does not depend on "
        "it: the durable resume position is scans.last_request_id, a re-derivable "
        "decimal integer, and init() NULLs scans.last_cursor on every boot, so a "
        "resume after restart always goes through last_request_id whatever this "
        "says. A negative result here is a measurement, not a defect."
    ),
}))
PY
)"
}

# The fourth assertion, given a snapshot taken after the restart.
judge_restart() {  # $1 = after-snapshot json
  ART_AFTER="$(jq_get "$1" 'd.get("artifacts")')"
  OBS_AFTER="$(jq_get "$1" 'd.get("observations")')"
  TABLES_AFTER_JSON="$(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]));print(json.dumps(d.get("tables")) if d.get("found") else "null")' "$1")"

  local present="null"
  if [ "$ART_AFTER" != "null" ]; then
    [ "$ART_AFTER" -gt 0 ] && present="true" || present="false"
  fi
  RESTART_DATA_PRESENT="$present"

  if [ "$RESTART_EXPECT_PRESENT" = "true" ]; then
    if [ "$present" = "true" ] && [ "$ART_AFTER" = "$ART_BEFORE" ]; then
      A_RESTART="true"
    else
      A_RESTART="false"
      note "After the restart the artifact count went from $ART_BEFORE to $ART_AFTER."
    fi
  else
    # The no-volume leg. ABSENCE is the expected result, and a clean start on an
    # EMPTY database is the other half of it — the plugin must come back working,
    # not merely come back to nothing.
    local tables_ok
    tables_ok="$(judge_tables "$1")"
    if [ "$present" = "false" ] && [ "$STARTUP_CLEAN" = "true" ] && [ "$tables_ok" = "true" ]; then
      A_RESTART="true"
      note "Second boot found an EMPTY database: the expected table set present, zero artifact rows, startup clean, no error."
    else
      A_RESTART="false"
      note "Second boot: artifacts=$ART_AFTER startup_clean=$STARTUP_CLEAN tables_ok=$tables_ok — expected absence with a clean start."
    fi
  fi
}

finish() {
  if [ "$A_INSTALL" = "true" ] && [ "$A_TABLES" = "true" ] &&
     [ "$A_ARTIFACT" = "true" ] && [ "$A_RESTART" = "true" ]; then
    LEG_STATUS="pass"
  else
    LEG_STATUS="fail"
    LEG_REASON="one or more of D-22's four assertions did not hold on this shape"
  fi
  emit_leg
  [ "$LEG_STATUS" = "pass" ] || exit 1
}

# ===========================================================================
# THE NATIVE LEGS — local-desktop and remote-cli.
#
# instance.sh is SOURCED, never re-implemented. The absolute app-path default,
# the version gate, the unconditional 8080 refusal, the LISTEN-collision check,
# the polled readiness loop, the `umask 077` guest-token write and the
# always-SIGKILL teardown are all already correct in that file. It is passed this
# matrix's OWN EXPECT_VERSION and its default is never edited.
# ===========================================================================
run_native() {
  # A FIXED data path with KEEP_DATA=1, because the restart deliberately keeps it
  # alive across a teardown. It is ours, it is under the system temp directory,
  # and this script's own cleanup removes it — never the operator's data path.
  MATRIX_DATA_PATH="${TMPDIR:-/tmp}/defminer-matrix-$LEG-data"
  rm -rf "$MATRIX_DATA_PATH"
  export DATA_PATH="$MATRIX_DATA_PATH"
  export KEEP_DATA=1
  export EXPECT_VERSION="$MATRIX_EXPECTED_VERSION"
  export CAIDO_BIN PORT

  # shellcheck disable=SC1091
  source scripts/spike/instance.sh
  # shellcheck disable=SC1091
  source scripts/spike/probe-run.sh

  BOOT1_RUN_ID="$RUN_ID"
  LEG_RUN_ID="$RUN_ID"
  TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"
  select_project || leg_fail "could not create and select a temporary project"

  run_boot1_assertions "127.0.0.1"

  # --- the restart: SIGKILL, then a NEW instance on the SAME data path ------
  RESTART_METHOD="process-sigkill-relaunch"
  teardown || true
  # The data directory survives (KEEP_DATA=1) and the process is gone, so this is
  # the moment the on-disk state is complete.
  capture_before "$MATRIX_DATA_PATH/plugins"
  # instance.sh set it; blanked so the EXIT trap cannot aim at a pid that is
  # already gone and, on a busy machine, reused.
  CAIDO_PID=""
  for _ in $(seq 1 60); do
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
    sleep 0.5
  done

  RUN_ID="${BOOT1_RUN_ID}-restart"
  # shellcheck disable=SC1091
  source scripts/spike/instance.sh
  TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"

  # The plugin was installed into this data path and should still be there. The
  # PREVIOUS id is tried FIRST: reinstalling unconditionally could mint a new
  # plugin uuid and therefore a NEW, EMPTY database, which would make the
  # persistence assertion fail for entirely the wrong reason.
  export BACKEND_ID="$DEFMINER_BACKEND"
  if probe_call getStatus '[]' 60 > "$WORK/status-boot2.json" 2>/dev/null; then
    STARTUP_CLEAN="$(jq_get "$WORK/status-boot2.json" 'd.get("compatible")')"
    SCHEMA_AFTER="$(jq_get "$WORK/status-boot2.json" 'd.get("schemaVersion")')"
  else
    STARTUP_CLEAN="false"
    note "The plugin did not answer on its previous id after the restart."
  fi
  measure_cursor_after

  snapshot_db "$MATRIX_DATA_PATH/plugins" "$WORK/db-boot2.json"
  judge_restart "$WORK/db-boot2.json"

  case "$LEG" in
    local-desktop)
      note "Desktop shape: the app-bundle caido-cli, launched headless against an isolated --data-path on this host."
      ;;
    remote-cli)
      note "Command-line shape: the same app-bundle caido-cli run as a headless server on a second port and data directory. ON THIS MACHINE IT SHARES A FILESYSTEM WITH THE DESKTOP LEG, so it does not exercise the remote-disk property DEPLOY-02 and DEPLOY-03 exist for — the two container legs are the ones that do."
      ;;
  esac
  finish
}

# ===========================================================================
# THE CONTAINER LEGS — docker-volume and docker-no-volume.
#
# Every gate instance.sh provides is rebuilt here rather than skipped: a
# container-shaped version gate that runs BEFORE anything is recorded, a resolved
# manifest digest, an unconditional 8080 refusal, a refusal to reuse a container
# name, polled readiness against the published port, and a teardown that removes
# only the container this script created.
# ===========================================================================
run_container() {
  local mount_args=()
  if [ "$LEG" = "docker-volume" ]; then
    VOLDIR="$WORK/volume"
    mkdir -p "$VOLDIR"
    # The official guide recommends `chown -R 999:999 <host-path>`, the image's
    # `caido` uid. Under Docker Desktop on macOS the VM handles uid mapping, so
    # this is expected to be a no-op locally — RECORD WHAT WAS DONE and whether
    # it took, rather than assuming the platform made it unnecessary.
    if chown -R 999:999 "$VOLDIR" 2>/dev/null; then
      VOLUME_FIXUP="chown -R 999:999 on the host directory succeeded"
    else
      VOLUME_FIXUP="chown -R 999:999 on the host directory was refused; Docker Desktop's VM handles uid mapping on this platform, so the mount is expected to work regardless — recorded rather than assumed"
    fi
    mount_args=(-v "$VOLDIR:$CONTAINER_DATA_PATH")
    VOLUME_MOUNTED="true"
  fi

  # The image's own Cmd is `caido-cli --no-renderer-sandbox --no-open --listen
  # 0.0.0.0:8080`. It is overridden to add --allow-guests (no login setup, which
  # is what makes an unattended leg possible) and --no-sync (which suppresses the
  # outbound Caido Cloud connection). The listen address is the CONTAINER's
  # 0.0.0.0; the PUBLISHED port is bound to 127.0.0.1 on this host and never to
  # 0.0.0.0, so the instance is no more reachable than a native leg's.
  start_container() {
    docker run -d --name "$CONTAINER_NAME" \
      -p "127.0.0.1:$PORT:8080" "${mount_args[@]}" \
      "$IMAGE_REPO:$IMAGE_TAG" \
      caido-cli --no-renderer-sandbox --no-open --no-sync --allow-guests \
      --listen 0.0.0.0:8080 >/dev/null
    OWN_CONTAINER="$CONTAINER_NAME"
  }

  start_container || not_run "docker run failed for $CONTAINER_NAME"
  poll_ready 120 || not_run "the container did not become ready on 127.0.0.1:$PORT within 120s"

  LEG_RUN_ID="matrix-$LEG-$(date -u +%Y%m%dT%H%M%SZ)"
  mint_token "$LEG_RUN_ID" || not_run "could not mint a guest token against the container"
  # shellcheck disable=SC1091
  source scripts/spike/probe-run.sh
  select_project || leg_fail "could not create and select a temporary project in the container"

  # The container's own data directory, materialised on the host for the
  # database reads. `docker cp` rather than a bind mount, so the no-volume leg's
  # containment is not quietly broken by the measuring instrument.
  container_plugins_dir() {  # -> prints a host path holding the plugins tree
    local dest="$WORK/cp-$(date +%s%N)"
    mkdir -p "$dest"
    docker cp "$CONTAINER_NAME:$CONTAINER_DATA_PATH/plugins" "$dest/" >/dev/null 2>&1 || true
    printf '%s' "$dest"
  }

  # `host.docker.internal` is how a Docker Desktop container reaches a service
  # bound to this host's loopback. Verified against a throw-away container before
  # this harness was written rather than taken on trust.
  run_boot1_assertions "host.docker.internal"

  if [ "$LEG" = "docker-volume" ]; then
    # WITH a volume: stop and start THE SAME container. The mount is what carries
    # the data, so the writable layer is irrelevant either way.
    RESTART_METHOD="container-stop-start"
    docker stop "$CONTAINER_NAME" >/dev/null || leg_fail "docker stop failed"
    capture_before "$(container_plugins_dir)"
    docker start "$CONTAINER_NAME" >/dev/null || leg_fail "docker start failed"
    note "Volume shape: a host directory mounted at the image's data path; the container was STOPPED and STARTED, and the mount is what carries the data across."
  else
    # WITHOUT a volume: stop, REMOVE, and run a NEW container.
    #
    # THIS IS A REMOVAL AND NOT A RESTART, AND THAT IS THE WHOLE POINT.
    # The image declares no VOLUME — measured from its registry config blob — so
    # an unmounted container's Caido data lives in the WRITABLE LAYER. `docker
    # restart` and `docker stop && docker start` both PRESERVE that layer, so
    # either would find the data still there and report a pass on the assertion
    # meant to prove ABSENCE. Only `docker rm` destroys the layer, and only a
    # NEW container proves the plugin comes back clean on an empty database
    # rather than erroring (Pitfall 8, T-06-55).
    RESTART_METHOD="container-stop-rm-run"
    docker stop "$CONTAINER_NAME" >/dev/null || leg_fail "docker stop failed"
    # Read the before-state out of the STOPPED container, while the writable
    # layer still exists. After the `docker rm` below there is nothing left to
    # read, which is precisely the fact this leg is here to establish.
    capture_before "$(container_plugins_dir)"
    docker rm "$CONTAINER_NAME" >/dev/null || leg_fail "docker rm failed"
    OWN_CONTAINER=""
    start_container || leg_fail "docker run failed on the second boot"
    note "No-volume shape: nothing mounted; the container was stopped, REMOVED and re-created, which destroys the writable layer the data lived in. A container restart would have preserved it and proven nothing."
  fi

  poll_ready 120 || leg_fail "the container did not become ready after the restart"
  # The RESTART boot gets its own run directory and its own token, but LEG_RUN_ID
  # keeps naming BOOT 1 — the run that produced the measurements. The native legs
  # already behave that way, and a leg record whose run_id silently means a
  # different boot on two of the four shapes is not a record anyone can follow.
  mint_token "${LEG_RUN_ID}-restart" || leg_fail "could not mint a guest token after the restart"

  if [ "$LEG" = "docker-no-volume" ]; then
    # A NEW container: the plugin went with the writable layer, so it is
    # reinstalled. Coming back CLEAN on the empty database it now faces — rather
    # than erroring — is the half of D-22's fourth assertion this leg exists for.
    select_project || leg_fail "could not select a project on the second boot"
    if probe_install packages/dist/plugin_package >&2; then
      export BACKEND_ID
      if probe_call getStatus '[]' 60 > "$WORK/status-boot2.json" 2>/dev/null; then
        STARTUP_CLEAN="$(jq_get "$WORK/status-boot2.json" 'd.get("compatible")')"
        SCHEMA_AFTER="$(jq_get "$WORK/status-boot2.json" 'd.get("schemaVersion")')"
        local le
        le="$(jq_get "$WORK/status-boot2.json" 'd.get("lastError") or ""')"
        if [ -n "$le" ] && [ "$le" != "null" ]; then
          STARTUP_CLEAN="false"
          note "The plugin reported lastError on the empty-database boot."
        fi
      else
        STARTUP_CLEAN="false"
      fi
      probe_install probe/phase6-matrix >&2 && MATRIX_BACKEND="$BACKEND_ID" || true
    else
      STARTUP_CLEAN="false"
      note "The plugin did not reinstall on the second boot."
    fi
  else
    export BACKEND_ID="$DEFMINER_BACKEND"
    if probe_call getStatus '[]' 60 > "$WORK/status-boot2.json" 2>/dev/null; then
      STARTUP_CLEAN="$(jq_get "$WORK/status-boot2.json" 'd.get("compatible")')"
      SCHEMA_AFTER="$(jq_get "$WORK/status-boot2.json" 'd.get("schemaVersion")')"
    else
      STARTUP_CLEAN="false"
      note "The plugin did not answer on its previous id after the restart."
    fi
  fi

  measure_cursor_after
  snapshot_db "$(container_plugins_dir)" "$WORK/db-boot2.json"
  judge_restart "$WORK/db-boot2.json"
  finish
}

if [ "${LEG#docker-}" != "$LEG" ]; then
  run_container
else
  run_native
fi
