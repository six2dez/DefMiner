#!/usr/bin/env bash
# scripts/phase1/tracer-e2e.sh — the Phase 1 tracer's end-to-end proof.
#
# The question in words: does a JavaScript response proxied through a REAL Caido
# 0.57.1 come out the other end as one content-addressed row whose digest matches
# a SHA-256 this script computed itself, plus one observation per sighting saying
# where it came from?
#
# Everything the tracer asserts about identity is asserted here against a digest
# computed on the HOST with shasum, independently of anything Caido did. A test
# that hashed the bytes with the same code the plugin uses would prove only that
# the code is self-consistent.
#
# Ports come from scripts/phase1/env.sh and are passed explicitly; nothing here
# takes instance.sh's default. Nothing here reads or writes .spike/.
set -euo pipefail

cd "$(dirname "$0")/../.."

# shellcheck disable=SC1091
source scripts/phase1/env.sh

GO_NO_GO=".planning/phases/00-runtime-reality-check/results/go-no-go.json"
FIXTURE_NAME="defminer-tracer-fixture.js"
CACHE_BUSTER="v=tracer1"

# --- preflight: fail before touching anything ------------------------------
[ -x "$P1_CAIDO_BIN" ] || { echo "FATAL: $P1_CAIDO_BIN is not executable" >&2; exit 1; }
ACTUAL_VERSION="$("$P1_CAIDO_BIN" --version 2>/dev/null | awk '{print $2}')"
[ "$ACTUAL_VERSION" = "$P1_EXPECT_VERSION" ] || {
  echo "FATAL: expected Caido $P1_EXPECT_VERSION, got ${ACTUAL_VERSION:-<none>}" >&2; exit 1; }
python3 -c "import json,sys; json.load(open('$GO_NO_GO'))" || {
  echo "FATAL: $GO_NO_GO missing or unparseable" >&2; exit 1; }
for p in "$P1_CAIDO_PORT" "$P1_ORIGIN_PORT"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "FATAL: port $p is already in LISTEN state. Refusing to collide." >&2; exit 1
  fi
done

# --- the fixture ------------------------------------------------------------
# Generated here rather than taken from corpus/, which is gitignored: a proof
# that only runs on a machine that has already fetched a corpus is not a proof.
FIXDIR="$(mktemp -d "${TMPDIR:-/tmp}/defminer-tracer.XXXXXX")"
{
  echo "// DefMiner Phase 1 tracer fixture. Deterministic content, never evaluated."
  echo "export const DEFMINER_TRACER = {"
  for i in $(seq 1 40); do
    echo "  key$i: \"value-$i-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\","
  done
  echo "};"
} > "$FIXDIR/$FIXTURE_NAME"

EXPECTED_SHA="$(shasum -a 256 "$FIXDIR/$FIXTURE_NAME" | cut -d' ' -f1)"
EXPECTED_BYTES="$(wc -c < "$FIXDIR/$FIXTURE_NAME" | tr -d ' ')"
echo "host digest : $EXPECTED_SHA ($EXPECTED_BYTES bytes)"

# --- build ------------------------------------------------------------------
pnpm exec caido-dev build packages >/dev/null
[ -f packages/backend/dist/index.js ] || { echo "FATAL: build produced no index.js" >&2; exit 1; }
[ -f packages/dist/plugin_package.zip ] || { echo "FATAL: build produced no zip" >&2; exit 1; }

# --- instance ---------------------------------------------------------------
ORIGIN_PID=""
cleanup() {
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  # ALWAYS instance.sh's own teardown — never a new kill. It force-kills (a wedged
  # QuickJS thread never honours SIGTERM), copies the host log out, deletes the
  # guest token and removes the isolated data directory.
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
  rm -rf "$FIXDIR"
}
trap cleanup EXIT

export EXPECT_VERSION="$P1_EXPECT_VERSION"
export CAIDO_BIN="$P1_CAIDO_BIN"
export PORT="$P1_CAIDO_PORT"
export OUT="$P1_OUT"
# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

CAIDO_URL="http://127.0.0.1:$PORT"
TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"
gql() {
  curl -s -X POST "$CAIDO_URL/graphql" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "$1"
}

# --- origin -----------------------------------------------------------------
python3 scripts/spike/origin.py --dir "$FIXDIR" --port "$P1_ORIGIN_PORT" \
  > "$RUN_DIR/origin-$P1_ORIGIN_PORT.log" 2>&1 &
ORIGIN_PID=$!
for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$P1_ORIGIN_PORT/_health" && break
  kill -0 "$ORIGIN_PID" 2>/dev/null || { echo "FATAL: origin died" >&2; cat "$RUN_DIR/origin-$P1_ORIGIN_PORT.log" >&2; exit 1; }
  sleep 0.25
done
curl -sf -o /dev/null "http://127.0.0.1:$P1_ORIGIN_PORT/_health" || {
  echo "FATAL: origin not ready on $P1_ORIGIN_PORT" >&2; exit 1; }

# --- project ----------------------------------------------------------------
# A fresh Caido has NO project, and with none selected the proxy answers
# "Proxying error: Internal" and onInterceptResponse NEVER FIRES. This is a hard
# prerequisite for every traffic-observing run, not a nicety. A guest may create
# temporary projects only.
PROJECT_ID="$(gql '{"query":"mutation{ createProject(input:{name:\"phase1-tracer\",temporary:true}){ project{ id } error{ __typename } } }"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["createProject"]; sys.exit("createProject failed: "+str(d["error"])) if d["error"] else print(d["project"]["id"])')"
gql "{\"query\":\"mutation{ selectProject(id:\\\"$PROJECT_ID\\\"){ error{ __typename } } }\"}" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["selectProject"]; sys.exit("selectProject failed: "+str(d["error"])) if d["error"] else None'
echo "project selected: $PROJECT_ID (temporary)"

# --- install ----------------------------------------------------------------
probe_install packages/dist/plugin_package

# --- two proxied requests ---------------------------------------------------
# The SAME url twice, carrying a cache-busting query parameter so the round trip
# of the query is observable. Two requests, two distinct Caido request ids, one
# set of bytes: exactly one artifact with seen_count 2 and exactly two
# observations is what proves the upsert is the only write path on both tables.
FIXTURE_URL="http://127.0.0.1:$P1_ORIGIN_PORT/$FIXTURE_NAME?$CACHE_BUSTER"
for n in 1 2; do
  code="$(curl -s --max-time 60 --proxy "$CAIDO_URL" -o /dev/null -w '%{http_code}' "$FIXTURE_URL")"
  [ "$code" = "200" ] || { echo "FATAL: proxied request $n returned $code" >&2; exit 1; }
done
echo "proxied 2 requests for $FIXTURE_URL"

# --- poll for the row -------------------------------------------------------
ARTIFACTS_JSON=""
for _ in $(seq 1 60); do
  ARTIFACTS_JSON="$(probe_call getArtifacts '[]' 60 || echo '[]')"
  n="$(printf '%s' "$ARTIFACTS_JSON" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
  seen="$(printf '%s' "$ARTIFACTS_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["seen_count"] if d else 0)')"
  [ "$n" -ge 1 ] && [ "$seen" -ge 2 ] && break
  sleep 1
done
OBSERVATIONS_JSON="$(probe_call getObservations '[]' 60)"
STATUS_JSON="$(probe_call getStatus '[]' 60)"

printf '%s' "$ARTIFACTS_JSON"    > "$RUN_DIR/artifacts.json"
printf '%s' "$OBSERVATIONS_JSON" > "$RUN_DIR/observations.json"
printf '%s' "$STATUS_JSON"       > "$RUN_DIR/status.json"

# --- the plugin database, read from OUTSIDE Caido ---------------------------
# PRAGMA table_info(artifacts) is asserted against the real file rather than
# against the DDL string the plugin shipped, because "the column is absent" is a
# claim about what landed, not about what was written.
# sdk.meta.db() lands at <data-path>/plugins/<backend-plugin-uuid>/data.db, and
# probe_install exported that uuid as BACKEND_ID.
PLUGIN_DB="$DATA/plugins/$BACKEND_ID/data.db"
if [ ! -f "$PLUGIN_DB" ]; then
  PLUGIN_DB="$(find "$DATA/plugins" -name 'data.db' 2>/dev/null | head -1)"
fi
[ -n "$PLUGIN_DB" ] && [ -f "$PLUGIN_DB" ] || {
  echo "FATAL: could not locate the plugin database under $DATA/plugins" >&2; exit 1; }
ARTIFACT_COLUMNS="$(sqlite3 "$PLUGIN_DB" "PRAGMA table_info(artifacts)" | cut -d'|' -f2 | tr '\n' ' ')"
echo "plugin db   : $PLUGIN_DB"
echo "artifacts   : $ARTIFACT_COLUMNS"

# --- assertions -------------------------------------------------------------
python3 - "$EXPECTED_SHA" "$EXPECTED_BYTES" "$FIXTURE_NAME" "$CACHE_BUSTER" \
         "$RUN_DIR/artifacts.json" "$RUN_DIR/observations.json" "$RUN_DIR/status.json" \
         "$ARTIFACT_COLUMNS" <<'PY'
import json, sys

sha, nbytes, fixture, buster, af, of, sf, columns = sys.argv[1:9]
nbytes = int(nbytes)
arts = json.load(open(af))
obs  = json.load(open(of))
st   = json.load(open(sf))
cols = columns.split()

fails = []
def check(cond, msg):
    if not cond:
        fails.append(msg)

check(len(arts) == 1, f"expected exactly 1 artifact row, got {len(arts)}: {arts!r}")
if arts:
    a = arts[0]
    check(a.get("sha256") == sha,
          f"digest mismatch: plugin {a.get('sha256')!r} != host {sha!r}")
    check(a.get("byte_len") == nbytes,
          f"byte_len {a.get('byte_len')!r} != fixture size {nbytes}")
    check(a.get("seen_count") == 2,
          f"seen_count is {a.get('seen_count')!r}, expected 2 — two proxied requests "
          f"must upsert one row, not insert two")
    check("url" not in a,
          f"the artifact row carries a url key: {sorted(a)!r} — identity is "
          f"content-addressed and the URL belongs on the observation")

check("url" not in cols,
      f"PRAGMA table_info(artifacts) lists a url column: {cols!r}")
check("sha256" in cols and "seen_count" in cols,
      f"artifacts table is missing expected columns: {cols!r}")

check(len(obs) == 2, f"expected exactly 2 observation rows, got {len(obs)}: {obs!r}")
ids = {o.get("request_id") for o in obs}
check(len(ids) == 2, f"expected 2 DISTINCT request ids, got {ids!r}")
for o in obs:
    check(o.get("sha256") == sha, f"observation sha256 {o.get('sha256')!r} != host digest")
    url = o.get("url") or ""
    check(fixture in url, f"observation url {url!r} does not name the fixture")
    check(buster in url, f"observation url {url!r} lost the cache-busting query")
    check("#" not in url, f"observation url {url!r} carries a fragment")
    check(o.get("status") == 200, f"observation status {o.get('status')!r} != 200")

check(bool(st.get("sqliteVersion")),
      f"getStatus().sqliteVersion is absent: {st!r}")
check(st.get("compatible") is True, f"plugin reports incompatible: {st.get('reason')!r}")
check(st.get("projectId"), "getStatus().projectId is empty")
c = st.get("counters") or {}
check(c.get("processed", 0) >= 2, f"counters.processed is {c.get('processed')!r}, expected >= 2")
check(c.get("reloadMissing", 1) == 0,
      f"counters.reloadMissing is {c.get('reloadMissing')!r} — sdk.requests.get(id) "
      f"was not readable for every enqueued event")

if fails:
    print("\nTRACER FAILED:", file=sys.stderr)
    for f in fails:
        print("  - " + f, file=sys.stderr)
    sys.exit(1)

print()
print("host-computed digest   :", sha)
print("digest read back from  :", arts[0]["sha256"])
print("EQUAL                  :", arts[0]["sha256"] == sha)
print("artifact rows          :", len(arts), "seen_count", arts[0]["seen_count"])
print("observation rows       :", len(obs), "distinct request ids", len(ids))
print("observed url           :", obs[0]["url"])
print("sqlite inside Caido    :", st["sqliteVersion"])
print("schema version         :", st.get("schemaVersion"))
print("max event->reload ms   :", st.get("maxEventToReloadMs"))
PY

echo
echo "TRACER PASSED"
