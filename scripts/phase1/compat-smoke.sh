#!/usr/bin/env bash
# scripts/phase1/compat-smoke.sh — COMPAT-01 and COMPAT-02, on three real Caido
# builds.
#
# THE QUESTION, IN WORDS
# ----------------------
# Every Phase 0 threshold this project depends on was measured on Caido 0.57.1.
# Caido 0.58.0 shipped on 2026-08-20, hours before this phase was researched.
# `@caido/sdk-backend@0.58.0`'s `typing.d.ts` is byte-identical to 0.57.1's and
# still pins the same `@caido/quickjs-types` — but BEHAVIOUR IS NOT TYPES, and
# COMPAT-02 asks for a smoke test against the CURRENT release, not against the
# one we like. So: does every SDK surface the plugin calls still work on 0.58.0,
# and does a build below the declared minimum refuse LEGIBLY?
#
# THREE LEGS, EACH ON ITS OWN ISOLATED INSTANCE
# ---------------------------------------------
#   A — 0.57.1, the app bundle. The build everything was measured on.
#   B — 0.58.0, fetched and SHA-512-verified by scripts/phase1/fetch-caido.sh.
#       This leg is the one that closes assumption A1.
#   C — 0.55.3, the stale binary that owns `caido-cli` on PATH. Normally
#       forbidden — scripts/spike/instance.sh warns against it because a
#       MEASUREMENT recorded against it would be silently wrong. Here it is the
#       SUBJECT under test rather than the instrument, so its path is passed
#       explicitly and is never resolved from PATH (decision P6-D3).
#
# THE SURFACE LIST IS DERIVED, NOT RESTATED
# -----------------------------------------
# Legs A and B read their surface list from the plugin's own `getCompat` RPC,
# which projects `REQUIRED_SURFACES` from packages/backend/src/compat.ts. A
# surface added there appears here automatically; a surface dropped there fails
# tests/phase1-compat.spec.ts, which compares this artifact against both the
# exported list AND the INTEGRATE rows of COVERAGE.md.
#
# EXERCISED, NOT MERELY PRESENT
# -----------------------------
# `getCompat` proves a surface EXISTS. That is the weaker half. Each surface also
# carries live evidence that it RAN: a proxied response that became a row, a
# project change that moved `projectId`, a digest that equals `shasum -a 256` on
# the host. `probe_ok` and `exercised` are recorded as separate fields, because
# they are separate claims.
#
# Nothing here kills a process it did not start; every leg tears down through
# instance.sh's own teardown.
set -euo pipefail

cd "$(dirname "$0")/../.."

# shellcheck disable=SC1091
source scripts/phase1/env.sh

RESULT="$P1_OUT/compat-smoke.json"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/defminer-compat.XXXXXX")"
LEG_A_BIN="$P1_CAIDO_BIN"
LEG_B_BIN=".caido-bin/0.58.0/caido-cli"
LEG_C_BIN="$P1_CAIDO_BIN_OLD"
LEG_A_VERSION="0.57.1"
LEG_B_VERSION="0.58.0"
LEG_C_VERSION="0.55.3"

# --- preflight: fail before touching anything -------------------------------
for spec in "$LEG_A_BIN|$LEG_A_VERSION" "$LEG_B_BIN|$LEG_B_VERSION" "$LEG_C_BIN|$LEG_C_VERSION"; do
  bin="${spec%%|*}"; want="${spec##*|}"
  [ -x "$bin" ] || { echo "FATAL: $bin is not executable" >&2
    echo "       For 0.58.0 run: bash scripts/phase1/fetch-caido.sh 0.58.0" >&2; exit 1; }
  got="$("$bin" --version 2>/dev/null | awk '{print $2}')"
  [ "$got" = "$want" ] || { echo "FATAL: $bin reports '${got:-<none>}', expected $want" >&2; exit 1; }
done
command -v sqlite3 >/dev/null 2>&1 || { echo "FATAL: sqlite3 not on PATH" >&2; exit 1; }
for p in "$P1_COMPAT_PORT" "$P1_COMPAT_PORT_ALT" "$P1_ORIGIN_PORT"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "FATAL: port $p is already in LISTEN state. Refusing to collide." >&2; exit 1
  fi
done

# --- the release the API calls current, resolved AT RUN TIME ----------------
# Recorded, and asserted by the gate against leg B's expected version. Without
# it this smoke test silently becomes a test of whatever release was current the
# day somebody wrote the number down (threat T-01-35).
CURRENT_RELEASE="$(curl -fsSL --max-time 60 https://api.caido.io/releases/latest \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])')" || {
  echo "FATAL: could not resolve the current release from api.caido.io." >&2
  echo "       COMPAT-02's whole value is that the smoke test runs against CURRENT." >&2
  exit 1; }
echo "current Caido release per api.caido.io: $CURRENT_RELEASE" >&2

# --- fixtures ---------------------------------------------------------------
# Two DISTINCT JavaScript bodies with distinct digests: one proxied twice under
# the first project (so the upsert is exercised), one proxied once under the
# second project (so the project-change path writes something of its own).
FIXDIR="$WORK/origin"
mkdir -p "$FIXDIR"
{
  echo "// DefMiner compat fixture ONE. Deterministic content, never evaluated."
  for i in $(seq 1 40); do echo "export const one$i = \"value-$i-aaaaaaaaaaaaaaaaaaaa\";"; done
} > "$FIXDIR/compat-one.js"
{
  echo "// DefMiner compat fixture TWO. Distinct bytes, therefore a distinct digest."
  for i in $(seq 1 55); do echo "export const two$i = \"value-$i-bbbbbbbbbbbbbbbbbbbb\";"; done
} > "$FIXDIR/compat-two.js"
SHA_ONE="$(shasum -a 256 "$FIXDIR/compat-one.js" | cut -d' ' -f1)"
SHA_TWO="$(shasum -a 256 "$FIXDIR/compat-two.js" | cut -d' ' -f1)"
BYTES_ONE="$(wc -c < "$FIXDIR/compat-one.js" | tr -d ' ')"
echo "host digests: one=$SHA_ONE two=$SHA_TWO" >&2

# --- build ------------------------------------------------------------------
pnpm exec caido-dev build packages >/dev/null
[ -f packages/dist/plugin_package.zip ] || { echo "FATAL: build produced no zip" >&2; exit 1; }

# --- lifecycle --------------------------------------------------------------
ORIGIN_PID=""
cleanup() {
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
  rm -rf "$WORK"
}
trap cleanup EXIT

export OUT="$P1_OUT"
mkdir -p "$OUT"

# --- origin, shared by all three legs ---------------------------------------
mkdir -p "$WORK/logs"
python3 scripts/spike/origin.py --dir "$FIXDIR" --port "$P1_ORIGIN_PORT" \
  > "$WORK/logs/origin.log" 2>&1 &
ORIGIN_PID=$!
for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$P1_ORIGIN_PORT/_health" && break
  kill -0 "$ORIGIN_PID" 2>/dev/null || { echo "FATAL: origin died" >&2; cat "$WORK/logs/origin.log" >&2; exit 1; }
  sleep 0.25
done
curl -sf -o /dev/null "http://127.0.0.1:$P1_ORIGIN_PORT/_health" || {
  echo "FATAL: origin not ready on $P1_ORIGIN_PORT" >&2; exit 1; }

# ---------------------------------------------------------------------------
# run_full_leg <label> <bin> <version> <port> <outdir>
#
# Legs A and B. Identical sequence on identical bytes, so the ONLY difference
# between the two recorded matrices is the Caido underneath them — which is what
# makes a difference between them a finding rather than noise.
# ---------------------------------------------------------------------------
run_full_leg() {
  local label="$1" bin="$2" version="$3" port="$4" outdir="$5"
  mkdir -p "$outdir"
  echo >&2
  echo "=== leg $label — Caido $version on $port ===" >&2

  unset RUN_ID DATA CAIDO_PID RUN_DIR BACKEND_ID PACKAGE_ID
  export CAIDO_BIN="$bin" EXPECT_VERSION="$version" PORT="$port"
  # shellcheck disable=SC1091
  source scripts/spike/instance.sh
  # shellcheck disable=SC1091
  source scripts/spike/probe-run.sh

  local url="http://127.0.0.1:$port"
  local token; token="$(cat "$OUT/runs/$RUN_ID/token")"
  gql() { curl -s -X POST "$url/graphql" -H "Authorization: Bearer $token" \
            -H 'Content-Type: application/json' -d "$1"; }

  mk_project() {  # $1 = name -> prints id
    gql "{\"query\":\"mutation{ createProject(input:{name:\\\"$1\\\",temporary:true}){ project{ id } error{ __typename } } }\"}" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["createProject"]; sys.exit("createProject failed: "+str(d["error"])) if d["error"] else print(d["project"]["id"])'
  }
  select_project() {
    gql "{\"query\":\"mutation{ selectProject(id:\\\"$1\\\"){ error{ __typename } } }\"}" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["selectProject"]; sys.exit("selectProject failed: "+str(d["error"])) if d["error"] else None'
  }

  # --- install FIRST, with NO project selected -------------------------------
  # MEASURED during this run, and it changed the shape of the leg: a guest may
  # hold at most ONE temporary project. A second createProject returns
  # PermissionDeniedUserError even before either is selected, so the obvious way
  # to fire `onProjectChange` — switch between two projects — is not available
  # on a guest instance at all.
  #
  # The route that IS available is better anyway. Install into an instance with
  # NO project, so init() resolves `projects.getCurrent()` to nothing and
  # getStatus().projectId is null; then select a project and watch it move. That
  # drives the null -> project transition, which is the branch lifecycle.spec.ts
  # can only reach with a fake, and nothing else in the plugin can move that
  # field.
  probe_install packages/dist/plugin_package
  probe_call getStatus '[]' 60 > "$outdir/status-before.json"

  local project_one
  project_one="$(mk_project "compat-$label")"
  select_project "$project_one"
  # Poll for the transition rather than sleeping and hoping.
  local pid_seen=""
  for _ in $(seq 1 30); do
    pid_seen="$(probe_call getStatus '[]' 60 2>/dev/null \
      | python3 -c 'import json,sys; print(json.load(sys.stdin).get("projectId") or "")' 2>/dev/null || echo "")"
    [ -n "$pid_seen" ] && break
    sleep 1
  done

  # --- exercise: two proxied sightings of ONE body ---------------------------
  local code
  for _ in 1 2; do
    code="$(curl -s --max-time 60 --proxy "$url" -o /dev/null -w '%{http_code}' \
      "http://127.0.0.1:$P1_ORIGIN_PORT/compat-one.js?v=$label")"
    [ "$code" = "200" ] || { echo "FATAL: leg $label proxied request returned $code" >&2; return 1; }
  done
  # Settle: poll until the artifact is written rather than sleeping and hoping.
  local n=0
  for _ in $(seq 1 60); do
    n="$(probe_call getArtifacts '[]' 60 2>/dev/null | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 0)"
    [ "$n" -ge 1 ] && break
    sleep 1
  done

  probe_call getStatus       '[]' 60  > "$outdir/status-one.json"
  probe_call getCompat       '[]' 60  > "$outdir/compat.json"
  probe_call getArtifacts    '[]' 60  > "$outdir/artifacts-one.json"
  probe_call getObservations '[]' 60  > "$outdir/observations-one.json"

  # --- a SECOND distinct body, so the leg proves more than one digest --------
  code="$(curl -s --max-time 60 --proxy "$url" -o /dev/null -w '%{http_code}' \
    "http://127.0.0.1:$P1_ORIGIN_PORT/compat-two.js?v=$label")"
  [ "$code" = "200" ] || { echo "FATAL: leg $label second proxied request returned $code" >&2; return 1; }
  for _ in $(seq 1 60); do
    n="$(probe_call getArtifacts '[]' 60 2>/dev/null | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 0)"
    [ "$n" -ge 2 ] && break
    sleep 1
  done
  probe_call getStatus    '[]' 60 > "$outdir/status-two.json"
  probe_call getArtifacts '[]' 60 > "$outdir/artifacts-two.json"

  # --- the plugin database, read from OUTSIDE Caido -------------------------
  local plugin_db="$DATA/plugins/$BACKEND_ID/data.db"
  [ -f "$plugin_db" ] || plugin_db="$(find "$DATA/plugins" -name 'data.db' 2>/dev/null | head -1)"
  if [ -n "$plugin_db" ] && [ -f "$plugin_db" ]; then
    sqlite3 "$plugin_db" \
      "SELECT (SELECT COUNT(*) FROM artifacts)||'|'||(SELECT COUNT(*) FROM observations)||'|'||(SELECT COUNT(DISTINCT project_id) FROM artifacts)" \
      > "$outdir/db-counts.txt" 2>/dev/null || echo "|" > "$outdir/db-counts.txt"
  else
    echo "|" > "$outdir/db-counts.txt"
  fi

  # --- the host log: sdk.console.log's only observable destination ----------
  cat "$DATA"/logs/*.log > "$outdir/host.log" 2>/dev/null || : > "$outdir/host.log"
  grep -c '\[defminer\]' "$outdir/host.log" > "$outdir/log-lines.txt" 2>/dev/null || echo 0 > "$outdir/log-lines.txt"

  printf '%s\n%s\n%s\n%s\n' "$version" "$project_one" "$pid_seen" \
    "$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["binary"]["reported_version"])' "$OUT/runs/$RUN_ID/instance.json")" \
    > "$outdir/meta.txt"

  teardown
  unset -f gql mk_project select_project
}

# ---------------------------------------------------------------------------
# LEG A and LEG B
# ---------------------------------------------------------------------------
run_full_leg A "$LEG_A_BIN" "$LEG_A_VERSION" "$P1_COMPAT_PORT"     "$WORK/legA"
run_full_leg B "$LEG_B_BIN" "$LEG_B_VERSION" "$P1_COMPAT_PORT_ALT" "$WORK/legB"

# ---------------------------------------------------------------------------
# LEG C — the below-minimum fixture
#
# Two outcomes are BOTH legitimate and both must be recorded rather than one
# being assumed: the package installs and the runtime guard refuses, or the
# package does not install on that build at all and the observed refusal mode is
# the installer rather than the guard. A third is possible and equally honest:
# the instance does not start. Which one happened goes in a field with a CLOSED
# value set, so a later reader does not have to infer it.
# ---------------------------------------------------------------------------
LEGC_DIR="$WORK/legC"
mkdir -p "$LEGC_DIR"
: > "$LEGC_DIR/install.err"
: > "$LEGC_DIR/host.log"
LEGC_MODE=""
LEGC_MESSAGE=""
LEGC_REPORTED=""
LEGC_ARTIFACT_ROWS="null"
LEGC_DB_PRESENT="false"
LEGC_LOG_INCOMPATIBLE=0

echo >&2
echo "=== leg C — Caido $LEG_C_VERSION on $P1_COMPAT_PORT (below-minimum fixture) ===" >&2

unset RUN_ID DATA CAIDO_PID RUN_DIR BACKEND_ID PACKAGE_ID
# EXPLICIT path, never PATH resolution. instance.sh's own gate 1 warns against
# this binary because a MEASUREMENT recorded against it would be silently wrong;
# here it is the subject under test, and passing the path explicitly is what
# keeps that exception deliberate rather than accidental (decision P6-D3).
export CAIDO_BIN="$LEG_C_BIN" EXPECT_VERSION="$LEG_C_VERSION" PORT="$P1_COMPAT_PORT"
LEGC_UP=1
# shellcheck disable=SC1091
source scripts/spike/instance.sh || LEGC_UP=0

if [ "$LEGC_UP" -ne 1 ]; then
  LEGC_MODE="instance_failed"
  LEGC_MESSAGE="Caido $LEG_C_VERSION did not start under scripts/spike/instance.sh; the runtime guard was never reached."
else
  LEGC_REPORTED="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["binary"]["reported_version"])' "$OUT/runs/$RUN_ID/instance.json")"
  # shellcheck disable=SC1091
  source scripts/spike/probe-run.sh
  LEGC_URL="http://127.0.0.1:$PORT"
  LEGC_TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"
  legc_gql() { curl -s -X POST "$LEGC_URL/graphql" -H "Authorization: Bearer $LEGC_TOKEN" \
                 -H 'Content-Type: application/json' -d "$1"; }
  LEGC_PROJECT="$(legc_gql '{"query":"mutation{ createProject(input:{name:\"compat-C\",temporary:true}){ project{ id } error{ __typename } } }"}' \
    | python3 -c 'import json,sys
try:
    d=json.load(sys.stdin)["data"]["createProject"]
    print("" if d["error"] else d["project"]["id"])
except Exception:
    print("")' )"
  if [ -n "$LEGC_PROJECT" ]; then
    legc_gql "{\"query\":\"mutation{ selectProject(id:\\\"$LEGC_PROJECT\\\"){ error{ __typename } } }\"}" >/dev/null || true
  fi

  LEGC_INSTALLED=1
  probe_install packages/dist/plugin_package 2>"$LEGC_DIR/install.err" || LEGC_INSTALLED=0

  if [ "$LEGC_INSTALLED" -ne 1 ]; then
    LEGC_MODE="install_rejected"
    LEGC_MESSAGE="$(tr '\n' ' ' < "$LEGC_DIR/install.err" | cut -c1-600)"
  else
    # The plugin installed. Ask it what it thinks of this build.
    probe_call getCompat '[]' 60 > "$LEGC_DIR/compat.json" 2>"$LEGC_DIR/compat.err" || : > "$LEGC_DIR/compat.json"
    probe_call getStatus '[]' 60 > "$LEGC_DIR/status.json" 2>"$LEGC_DIR/status.err" || : > "$LEGC_DIR/status.json"
    if [ -s "$LEGC_DIR/compat.json" ] || [ -s "$LEGC_DIR/status.json" ]; then
      LEGC_MODE="guard_refused"
      LEGC_MESSAGE="$(python3 - "$LEGC_DIR/compat.json" "$LEGC_DIR/status.json" <<'PY'
import json, sys
for p in sys.argv[1:]:
    try:
        d = json.load(open(p))
    except Exception:
        continue
    r = d.get("reason")
    if r:
        print(str(r)[:800]); break
else:
    print("")
PY
)"
    else
      LEGC_MODE="plugin_not_reached"
      LEGC_MESSAGE="the package installed but neither getCompat nor getStatus answered on Caido $LEG_C_VERSION"
    fi

    # A JavaScript response, PROXIED. A refusal that still wrote a row would be
    # no refusal at all, so the row count is read rather than assumed.
    curl -s --max-time 60 --proxy "$LEGC_URL" -o /dev/null \
      "http://127.0.0.1:$P1_ORIGIN_PORT/compat-one.js?v=C" >/dev/null 2>&1 || true
    sleep 5
    LEGC_DB="$DATA/plugins/$BACKEND_ID/data.db"
    [ -f "$LEGC_DB" ] || LEGC_DB="$(find "$DATA/plugins" -name 'data.db' 2>/dev/null | head -1)"
    if [ -n "$LEGC_DB" ] && [ -f "$LEGC_DB" ]; then
      LEGC_DB_PRESENT="true"
      LEGC_ARTIFACT_ROWS="$(sqlite3 "$LEGC_DB" "SELECT COUNT(*) FROM artifacts" 2>/dev/null || echo 0)"
    else
      # No database file at all is the STRONGEST form of the claim: the guard
      # returned before sdk.meta.db() was ever called.
      LEGC_DB_PRESENT="false"
      LEGC_ARTIFACT_ROWS=0
    fi
  fi
  cat "$DATA"/logs/*.log > "$LEGC_DIR/host.log" 2>/dev/null || : > "$LEGC_DIR/host.log"
  LEGC_LOG_INCOMPATIBLE="$(grep -c 'INCOMPATIBLE' "$LEGC_DIR/host.log" 2>/dev/null || echo 0)"
  teardown
  unset -f legc_gql
fi
echo "leg C refusal mode: $LEGC_MODE" >&2

# ---------------------------------------------------------------------------
# THE ARTIFACT
# ---------------------------------------------------------------------------
mkdir -p "$(dirname "$RESULT")"
python3 - "$RESULT" "$WORK" "$CURRENT_RELEASE" "$SHA_ONE" "$SHA_TWO" "$BYTES_ONE" \
        "$LEGC_MODE" "$LEGC_MESSAGE" "$LEGC_REPORTED" "$LEGC_ARTIFACT_ROWS" \
        "$LEGC_DB_PRESENT" "$LEGC_LOG_INCOMPATIBLE" "$LEG_C_BIN" <<'PY'
import datetime, json, os, sys

(out, work, current, sha_one, sha_two, bytes_one, legc_mode, legc_msg,
 legc_reported, legc_rows, legc_db_present, legc_log_incompat, legc_bin) = sys.argv[1:14]
bytes_one = int(bytes_one)

def read(path, default=None):
    try:
        with open(path) as fh:
            return json.load(fh)
    except Exception:
        return default

def text(path, default=""):
    try:
        with open(path) as fh:
            return fh.read().strip()
    except Exception:
        return default

def leg(label, expected, port, bindir):
    """One full leg, or null-with-a-reason. NEVER an empty success."""
    d = os.path.join(work, "leg" + label)
    compat = read(os.path.join(d, "compat.json"))
    if compat is None:
        return {"ran": False, "reason": f"leg {label} produced no getCompat output"}
    st0 = read(os.path.join(d, "status-before.json"), {}) or {}
    st1 = read(os.path.join(d, "status-one.json"), {}) or {}
    st2 = read(os.path.join(d, "status-two.json"), {}) or {}
    arts1 = read(os.path.join(d, "artifacts-one.json"), []) or []
    arts2 = read(os.path.join(d, "artifacts-two.json"), []) or []
    obs1 = read(os.path.join(d, "observations-one.json"), []) or []
    meta = text(os.path.join(d, "meta.txt")).splitlines()
    counts = text(os.path.join(d, "db-counts.txt")).split("|")
    log_lines = int(text(os.path.join(d, "log-lines.txt"), "0") or 0)
    reported = meta[3] if len(meta) > 3 else None
    project_one = meta[1] if len(meta) > 1 else None
    project_seen = meta[2] if len(meta) > 2 else None

    c1 = st1.get("counters") or {}
    rejected = c1.get("rejected") or {}
    a1 = arts1[0] if arts1 else {}
    sqlite_version = st1.get("sqliteVersion")

    # --- live evidence, per surface -----------------------------------------
    # Each entry is (did it RUN, what proves it). The strings are the evidence a
    # human reads in the human-check, so they name the observation and not the
    # surface.
    def rows(n):
        try:
            return int(counts[n])
        except Exception:
            return None

    ev = {
      "sdk.events.onInterceptResponse": (
          len(arts1) >= 1 and (c1.get("proxiedResponsesObserved") or 0) >= 2,
          f"{c1.get('proxiedResponsesObserved')} proxied responses observed; "
          f"{len(arts1)} artifact row(s) written"),
      # The null -> project transition. init() ran with no project selected, so
      # getStatus().projectId started null; selectProject fired the hook and
      # moved it. Nothing else in the plugin can move that field.
      "sdk.events.onProjectChange": (
          st0.get("projectId") is None and bool(project_one)
          and st1.get("projectId") == project_one,
          f"projectId moved {st0.get('projectId')!r} (installed with NO project) "
          f"-> {st1.get('projectId')!r} after selectProject"),
      "sdk.requests.get": (
          (c1.get("processed") or 0) >= 2 and (c1.get("reloadMissing") or 0) == 0,
          f"processed={c1.get('processed')} reloadHit={c1.get('reloadHit')} "
          f"reloadMissing={c1.get('reloadMissing')}"),
      "sdk.requests.inScope": (
          (c1.get("admitted") or 0) >= 2 and (rejected.get("out_of_scope") or 0) == 0,
          f"admitted={c1.get('admitted')} with out_of_scope rejections="
          f"{rejected.get('out_of_scope')} — the scope axis ran and passed"),
      "sdk.projects.getCurrent": (
          bool(st1.get("projectId")),
          f"getStatus().projectId resolved to {st1.get('projectId')!r}"),
      "sdk.meta.db": (
          bool(sqlite_version) and rows(0) is not None,
          f"handle obtained; the plugin database holds {rows(0)} artifact "
          f"and {rows(1)} observation row(s)"),
      "sdk.runtime.version": (
          compat.get("caidoVersion") == expected,
          f"getCompat().caidoVersion = {compat.get('caidoVersion')!r}"),
      "sdk.console.log": (
          log_lines > 0,
          f"{log_lines} '[defminer]' line(s) in the host log"),
      "sdk.api.register": (
          bool(st1) and bool(compat) and isinstance(arts1, list) and isinstance(obs1, list),
          "getStatus, getCompat, getArtifacts and getObservations all answered over RPC"),
      "Database.exec": (
          (st1.get("schemaVersion") or 0) >= 2,
          f"schema reached v{st1.get('schemaVersion')} — the DDL ladder runs "
          f"through exec()"),
      "Database.prepare": (
          len(arts1) >= 1,
          f"{len(arts1)} artifact row(s) written; every write is prepare-per-write"),
      "Statement.run": (
          a1.get("seen_count") == 2,
          f"seen_count={a1.get('seen_count')} after two sightings — one upsert, "
          f"bound positionally, run twice"),
      "Statement.get": (
          bool(sqlite_version),
          f"SELECT sqlite_version() returned {sqlite_version!r} through prepare().get()"),
      "Statement.all": (
          len(arts1) >= 1 and len(obs1) >= 2,
          f"listArtifacts returned {len(arts1)} row(s) and listObservations "
          f"{len(obs1)} — both are .all()"),
      "crypto.createHash": (
          a1.get("sha256") == sha_one and a1.get("byte_len") == bytes_one,
          f"digest read back {a1.get('sha256')} vs host shasum -a 256 {sha_one} "
          f"over {bytes_one} bytes"),
    }
    # The capability entry's name carries the minimum, so match it by prefix.
    for s in compat.get("surfaces") or []:
        if s["name"].startswith("sqlite.version"):
            ev[s["name"]] = (
                bool(sqlite_version),
                f"sdk.meta.db() is backed by SQLite {sqlite_version}")

    surfaces = []
    for s in compat.get("surfaces") or []:
        exercised, evidence = ev.get(s["name"], (False, "no live evidence collected"))
        ok = bool(s.get("ok")) and bool(exercised)
        surfaces.append({
            "name": s["name"],
            "scope": s.get("scope"),
            "coverage_row": s.get("coverage_row"),
            "probe_ok": bool(s.get("ok")),
            "exercised": bool(exercised),
            "outcome": "ok" if ok else "failed",
            "evidence": evidence,
            "error": (str(s.get("error"))[:200] if s.get("error") else None),
        })

    return {
        "ran": True,
        "caido_binary": bindir,
        "port": port,
        # TWO fields, deliberately. The first catches a leg recorded against the
        # wrong binary. The second catches an expectation quietly moved to match
        # whatever happened to be measured.
        "expected_version": expected,
        "reported_version": reported,
        "compatible": compat.get("compatible"),
        "reason": compat.get("reason"),
        "min_caido": compat.get("minCaido"),
        "min_sqlite": compat.get("minSqlite"),
        "sqlite_version": sqlite_version,
        "schema_version": st1.get("schemaVersion"),
        "project_id": project_one,
        "project_id_before_select": st0.get("projectId"),
        "project_id_seen_after_select": project_seen or None,
        "artifact_rows_after_first_body": len(arts1),
        "artifact_rows_after_second_body": len(arts2),
        "observation_rows_after_first_body": len(obs1),
        "db_artifact_rows": rows(0),
        "db_observation_rows": rows(1),
        "db_distinct_projects": rows(2),
        "defminer_log_lines": log_lines,
        "counters": c1,
        "surfaces": surfaces,
    }

legA = leg("A", "0.57.1", 8973, "/Applications/Caido.app/Contents/Resources/bin/caido-cli")
legB = leg("B", "0.58.0", 8974, ".caido-bin/0.58.0/caido-cli")

REFUSAL_MODES = ["guard_refused", "install_rejected", "plugin_not_reached", "instance_failed"]
legC = {
    "ran": legc_mode != "",
    "caido_binary": legc_bin,
    "expected_version": "0.55.3",
    "reported_version": legc_reported or None,
    # CLOSED value set. A reader must not have to infer which refusal this was.
    "refusal_mode": legc_mode or None,
    "refusal_modes_possible": REFUSAL_MODES,
    "message": legc_msg or None,
    "guard_reached": legc_mode == "guard_refused",
    "artifact_rows_after_proxied_js": (int(legc_rows) if str(legc_rows).isdigit() else None),
    "database_file_present": legc_db_present == "true",
    "host_log_incompatible_lines": int(legc_log_incompat or 0),
}
if not legC["ran"]:
    legC = {"ran": False, "reason": "leg C did not execute"}

doc = {
    "produced_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "requirements": ["COMPAT-01", "COMPAT-02"],
    # Resolved from api.caido.io AT RUN TIME, never hard-coded. The gate asserts
    # leg B's expected version equals it, so this test cannot silently become a
    # test of a release that is no longer current.
    "current_release": current,
    "fixtures": {
        "compat-one.js": {"sha256": sha_one, "bytes": bytes_one},
        "compat-two.js": {"sha256": sha_two},
    },
    "legs": {"A": legA, "B": legB, "C": legC},
}
with open(out, "w") as fh:
    json.dump(doc, fh, indent=2)
    fh.write("\n")

for label in ("A", "B"):
    L = doc["legs"][label]
    if not L.get("ran"):
        print(f"leg {label}: DID NOT RUN — {L.get('reason')}")
        continue
    bad = [s["name"] for s in L["surfaces"] if s["outcome"] != "ok"]
    print(f"leg {label}: Caido {L['reported_version']} sqlite {L['sqlite_version']} "
          f"{len(L['surfaces'])} surfaces, {len(bad)} failed {bad if bad else ''}")
print(f"leg C: refusal_mode={doc['legs']['C'].get('refusal_mode')} "
      f"rows={doc['legs']['C'].get('artifact_rows_after_proxied_js')}")
PY

echo
echo "wrote $RESULT"
