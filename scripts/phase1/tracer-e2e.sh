#!/usr/bin/env bash
# scripts/phase1/tracer-e2e.sh — the Phase 1 tracer's end-to-end proof.
#
# The question in words: does a JavaScript response proxied through a REAL Caido
# — the build `$P1_EXPECT_VERSION` names in scripts/phase1/env.sh, never a literal
# repeated here — come out the other end as one content-addressed row whose digest
# matches a SHA-256 this script computed itself, plus one observation per sighting
# saying where it came from?
#
# WHY NO VERSION LITERAL LIVES IN THIS HEADER, AND WHY THAT IS A RULE RATHER THAN
# A TIDY-UP (01-REVIEW.md WR-15). This sentence used to name a build outright.
# Decision P7-D5 then moved `P1_EXPECT_VERSION` and the sentence did not follow, so
# a reader checking what the artifact was produced on found one build in the prose
# and another in the environment — which makes every number in the artifact
# unciteable. Naming the CURRENT build here would only reset the clock on the same
# failure. The prose cites the variable; the RESOLVED value is written into every
# run directory as `caido-version.txt` beside `status.json`, so the evidence CARRIES
# the build rather than a comment claiming it. A literal in this file is a bug, and
# a `grep -c` for the superseded one returning zero is how that is enforced.
#
# The three deliberate pins elsewhere in the tree — tests/phase1-load.spec.ts,
# tests/phase1-runtime.spec.ts and packages/backend/src/compat.ts — are NOT drift and
# are NOT aligned with this. They pin the build every Phase 0 threshold was MEASURED
# on, so re-running those harnesses on a newer build fails loudly rather than
# silently rebaselining a threshold artifact. Aligning them would delete the
# loud-failure net. See env.sh's P7-D5 block, which names both builds and why.
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
# STORE-03's live probe. EVERY secret below is sixteen random bytes rendered as hex
# and generated FRESH at every run: a value that cannot appear in the database by
# coincidence, cannot be satisfied by a hard-coded expectation, and is a tracer dye
# rather than a credential — which is what makes committing a FAILING run's raw dump
# an honest artifact instead of a leak.
#
# ONE SECRET PER GRAMMAR, and they are distinct on purpose: a single value reused
# across all four would tell you that SOMETHING leaked without telling you WHICH
# grammar leaked it, and the whole reason plan 01-14 exists is that the live tier
# had only ever exercised one of them.
#
#   SECRET_VALUE     `name=value` query pair   — plan 01-07's original grammar
#   BARE_SECRET      `=`-less query segment    — plan 01-10, decision P10-D1
#   PATHPARAM_SECRET `;`-delimited path param  — plan 01-11, redactUrlHead
#   USERINFO_SECRET  `user:pass@host` password — plan 01-11, redactUrlHead
#   USERINFO_USER    `user:pass@host` username — plan 01-11, "BOTH halves go"
SECRET_PARAM="access_token"
SECRET_VALUE="$(openssl rand -hex 16)"
BARE_SECRET="$(openssl rand -hex 16)"
PATHPARAM_NAME="jsessionid"
PATHPARAM_SECRET="$(openssl rand -hex 16)"
# The USERNAME half is random too, and that is not decoration. Decision 01-11
# ("BOTH halves of the userinfo go, never just the password") is a claim about the
# username, so the username has to be a value whose absence can be asserted. A
# fixed literal could not be: `tracer` — the obvious choice — is a substring of
# `defminer-tracer-fixture.js`, so an "absent from the column" check on it would
# have failed against the fixture NAME and told us nothing about userinfo.
USERINFO_USER="$(openssl rand -hex 8)"
USERINFO_SECRET="$(openssl rand -hex 16)"

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

# --- the sweep, over the WHOLE run directory ---------------------------------
# T-01-35: the artifact proving a secret was redacted must not itself carry one.
# This MEASURES that per file rather than asserting it in prose, and it is a
# MEASUREMENT rather than a gate on purpose — the mutation run is SUPPOSED to
# leave the bare secret in `observations-url-raw.txt`, and a gate here would make
# that run impossible to produce. What it exists to surface is the file nobody
# thinks about: Caido's own `--debug` output records the full request URL,
# unredacted, which is why those logs are NOT among the files this plan commits.
#
# IT RUNS FROM cleanup(), AFTER teardown, AND THAT ORDERING IS THE POINT. teardown
# is what copies Caido's host log into the run directory. Swept from the end of the
# script body instead — where it was first written — it reported `logging.<date>.log`
# as clean because that file did not exist yet, which is precisely the confident
# zero this phase keeps having to stamp out. Measured on the first live run of the
# widened tracer; the file holds four occurrences of each wire value.
secret_sweep() {
  [ -n "${RUN_DIR:-}" ] && [ -d "${RUN_DIR:-}" ] || return 0
  {
    echo "# Occurrences of each per-run value across the run directory, per file."
    echo "# Counts only, never the values. Swept AFTER teardown, so Caido's own"
    echo "# host log is in scope. See README-01-14.md for what is committed."
    for pair in "query-pair:$SECRET_VALUE" "bare-segment:$BARE_SECRET" \
                "path-param:$PATHPARAM_SECRET" "userinfo-pass:$USERINFO_SECRET" \
                "userinfo-user:$USERINFO_USER"; do
      label="${pair%%:*}"; value="${pair#*:}"
      while IFS= read -r f; do
        n="$(grep -c -F -- "$value" "$f" 2>/dev/null || true)"
        [ "${n:-0}" -gt 0 ] && echo "$label $(basename "$f") $n"
      done < <(find "$RUN_DIR" -type f ! -name 'secret-sweep.txt')
    done
    echo "# end"
  } > "$RUN_DIR/secret-sweep.txt"
  echo "secret sweep : $(grep -v '^#' "$RUN_DIR/secret-sweep.txt" | awk '{print $2}' | sort -u | wc -l | tr -d ' ') file(s) in the run directory carry a per-run value, over $(grep -vc '^#' "$RUN_DIR/secret-sweep.txt" || true) (grammar, file) pair(s)"
}

cleanup() {
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  # ALWAYS instance.sh's own teardown — never a new kill. It force-kills (a wedged
  # QuickJS thread never honours SIGTERM), copies the host log out, deletes the
  # guest token and removes the isolated data directory.
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
  secret_sweep || true
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

# The build this run was ACTUALLY produced on, written beside status.json (WR-15).
# `$ACTUAL_VERSION` is the string the preflight guard already compared, so this
# records the resolved value rather than re-deriving one that could differ.
printf 'caido_version=%s\nexpected_version=%s\ncaido_bin=%s\nrun_id=%s\n' \
  "$ACTUAL_VERSION" "$P1_EXPECT_VERSION" "$P1_CAIDO_BIN" "$RUN_ID" \
  > "$RUN_DIR/caido-version.txt"

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
#
# The url ALSO carries FOUR credential-bearing grammars, each with its own random
# per-run value (STORE-03, UAT decision 2026-08-21, widened by plan 01-14). What the
# assertions below prove is that the parameter NAMES survive and every VALUE does
# not — read out of the database FILE with sqlite3, not only out of the RPC
# projection.
#
# ALL FOUR RIDE THE SAME TWO REQUESTS rather than getting requests of their own.
# That is deliberate: the artifact assertions require EXACTLY one artifact row with
# seen_count 2 and EXACTLY two observations, and a fifth request would break the
# upsert proof to make room for a redaction proof. One URL carrying every grammar
# keeps both.
#
# The origin still answers 200 for this shape, and it is checked rather than
# assumed — a 404 here would abort the run for a reason that has nothing to do with
# redaction. `urllib.parse.urlparse` in scripts/spike/origin.py:158 splits the
# `;`-delimited parameter off the LAST path segment into `.params`, so `.path`
# resolves to the fixture file unchanged; the Authorization header the userinfo
# becomes is ignored by the origin entirely.
FIXTURE_PATH="$FIXTURE_NAME;$PATHPARAM_NAME=$PATHPARAM_SECRET"
FIXTURE_QUERY="$CACHE_BUSTER&$SECRET_PARAM=$SECRET_VALUE&$BARE_SECRET"
FIXTURE_URL="http://$USERINFO_USER:$USERINFO_SECRET@127.0.0.1:$P1_ORIGIN_PORT/$FIXTURE_PATH?$FIXTURE_QUERY"

# WHAT CURL ACTUALLY PUT ON THE WIRE, captured so the userinfo question is MEASURED
# rather than assumed in either direction. curl may lift `user:pass@` out of the
# request line into an `Authorization: Basic` header, in which case userinfo cannot
# reach `observations.url` through this tier at all — a limit of the tier, and one
# that is evidence only if it is measured and named.
#
# The trace lands in FIXDIR, which the EXIT trap removes, and is NEVER committed:
# an `Authorization: Basic` header is base64 of `user:secret`, which is a recoverable
# encoding of a value this run exists to prove is not persisted. Only the DERIVED
# yes/no answers below are written into the run directory.
CURL_TRACE="$FIXDIR/curl-verbose.txt"
: > "$CURL_TRACE"
for n in 1 2; do
  code="$(curl -s -v --max-time 60 --proxy "$CAIDO_URL" -o /dev/null -w '%{http_code}' \
            "$FIXTURE_URL" 2>>"$CURL_TRACE")"
  [ "$code" = "200" ] || { echo "FATAL: proxied request $n returned $code" >&2; exit 1; }
done
# `> GET ...` is curl's own record of the request line it emitted.
if grep -q "^> GET .*$USERINFO_SECRET" "$CURL_TRACE"; then
  USERINFO_ON_WIRE="yes"
else
  USERINFO_ON_WIRE="no"
fi
if grep -qi "^> Authorization: Basic" "$CURL_TRACE"; then
  USERINFO_AS_AUTH_HEADER="yes"
else
  USERINFO_AS_AUTH_HEADER="no"
fi
{
  echo "# Measured, not assumed: can URL userinfo be exercised through this tier?"
  echo "# Derived from curl's own -v request-line trace. No secret bytes here, and"
  echo "# no Authorization header value either — that is base64 of user:secret."
  echo "userinfo_in_request_line=$USERINFO_ON_WIRE"
  echo "userinfo_sent_as_authorization_header=$USERINFO_AS_AUTH_HEADER"
  echo "request_lines_emitted=$(grep -c '^> GET ' "$CURL_TRACE" || true)"
} > "$RUN_DIR/userinfo-measurement.txt"

# Echo the URL with every secret masked. The two proxied requests are the thing
# being reported; printing five live per-run values into the run log is not.
echo "proxied 2 requests for http://<userinfo-user>:<userinfo-secret>@127.0.0.1:$P1_ORIGIN_PORT/$FIXTURE_NAME;$PATHPARAM_NAME=<secret>?$CACHE_BUSTER&$SECRET_PARAM=<secret>&<bare-secret>"
echo "userinfo on wire       : $USERINFO_ON_WIRE (as Authorization header: $USERINFO_AS_AUTH_HEADER)"

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
# sdk.meta.db() lands at <data-path>/plugins/<backend-plugin-uuid>/data.db, and
# probe_install exported that uuid as BACKEND_ID.
PLUGIN_DB="$DATA/plugins/$BACKEND_ID/data.db"
if [ ! -f "$PLUGIN_DB" ]; then
  PLUGIN_DB="$(find "$DATA/plugins" -name 'data.db' 2>/dev/null | head -1)"
fi
[ -n "$PLUGIN_DB" ] && [ -f "$PLUGIN_DB" ] || {
  echo "FATAL: could not locate the plugin database under $DATA/plugins" >&2; exit 1; }

# --- READ-ONLY, by decision P8-D2's ladder (01-REVIEW.md WR-16) -------------
# Both reads below run against a file that Caido AND the plugin are holding open,
# and `sqlite3` opens READ-WRITE by default. A measuring instrument that can write
# to its subject is not an instrument: a read-write open can create a `-wal`/`-shm`
# sidecar on the artifact being measured, and can block on a lock the plugin holds
# — which under `set -euo pipefail` discards the whole run AFTER the traffic has
# already been proxied and the evidence already produced.
#
# THE LADDER IS P8-D2's, not a second convention invented here, and plan 01-08
# learned each rung the hard way on this exact host (01-08-SUMMARY.md, "The
# methodological finding: an immutable read of a WAL database lies quietly"):
#
#   1. `sqlite3 -readonly` — WAL-aware, and the ONLY mode that can see rows still
#      resident in the `-wal`. Preferred unconditionally. It FAILED on seven of
#      the eight plugin databases 01-08 measured (`unable to open database file
#      (14)`: WAL journal mode with no usable `-shm`), so rung 2 is not theoretical.
#   2. It fails AND there is no non-empty `-wal` -> `file:...?mode=ro&immutable=1`.
#      Complete BY DEFINITION in that case, because there are no WAL-resident rows
#      for it to miss.
#   3. It fails AND a non-empty `-wal` EXISTS -> FATAL, by name. Never a fallback.
#      01-08 MEASURED the failure this rung exists to stop: an immutable read of
#      the one DefMiner database (45,352-byte `-wal`) reported NO TABLES AT ALL,
#      while the WAL-aware read of the same file reported `artifacts` and
#      `observations`. A counting harness derives a confident zero from that. This
#      tracer would derive something worse — an EMPTY `SELECT url` dump, in which
#      every secret is trivially absent and every assertion below passes. A gate
#      green because it read nothing is the exact failure shape this phase exists
#      to stop shipping, so the run dies here instead.
#
# The probe is `SELECT count(*) FROM sqlite_master` rather than `SELECT 1`: reading
# the schema is precisely the read that exposed the immutable lie, and a mode that
# opens but cannot see a table must not be selected.
SQLITE_RO_ARGS=()
SQLITE_READ_MODE=""
SQLITE_MASTER_OBJECTS=""
if SQLITE_MASTER_OBJECTS="$(sqlite3 -readonly "$PLUGIN_DB" "SELECT count(*) FROM sqlite_master" 2>/dev/null)"; then
  SQLITE_READ_MODE="readonly"
  SQLITE_RO_ARGS=(-readonly "$PLUGIN_DB")
elif [ -s "${PLUGIN_DB}-wal" ]; then
  echo "FATAL: 'sqlite3 -readonly' failed on $PLUGIN_DB and a non-empty -wal sidecar" >&2
  echo "       exists ($(wc -c < "${PLUGIN_DB}-wal" | tr -d ' ') bytes)." >&2
  echo "       Decision P8-D2: there is NO fallback on this rung. An immutable read of a" >&2
  echo "       WAL database reports rows it cannot see, and an empty dump would make every" >&2
  echo "       redaction assertion below pass for the wrong reason. Refusing to measure." >&2
  exit 1
elif SQLITE_MASTER_OBJECTS="$(sqlite3 "file:${PLUGIN_DB}?mode=ro&immutable=1" "SELECT count(*) FROM sqlite_master" 2>/dev/null)"; then
  # Safe ONLY because the branch above proved there is no non-empty -wal.
  SQLITE_READ_MODE="immutable-no-wal"
  SQLITE_RO_ARGS=("file:${PLUGIN_DB}?mode=ro&immutable=1")
else
  echo "FATAL: neither a read-only nor an immutable open of $PLUGIN_DB succeeded." >&2
  exit 1
fi
[ "${SQLITE_MASTER_OBJECTS:-0}" -gt 0 ] || {
  echo "FATAL: the $SQLITE_READ_MODE open of $PLUGIN_DB reports ${SQLITE_MASTER_OBJECTS:-<none>}" >&2
  echo "       objects in sqlite_master. A database with no schema cannot be the one the" >&2
  echo "       plugin just wrote to, and reading nothing is not a clean result." >&2
  exit 1; }

# Every read of the live database goes through here. There is no second spelling.
sqlite_ro() { sqlite3 "${SQLITE_RO_ARGS[@]}" "$1"; }

# The mode is recorded rather than assumed: which rung this host took is a fact
# about the run, and the next reader should not have to re-derive it.
{
  echo "# How the LIVE plugin database was read (decision P8-D2, 01-REVIEW.md WR-16)."
  echo "plugin_db=$PLUGIN_DB"
  echo "read_mode=$SQLITE_READ_MODE"
  echo "sqlite_master_objects=$SQLITE_MASTER_OBJECTS"
  echo "wal_bytes=$([ -f "${PLUGIN_DB}-wal" ] && wc -c < "${PLUGIN_DB}-wal" | tr -d ' ' || echo 0)"
  echo "shm_present=$([ -f "${PLUGIN_DB}-shm" ] && echo yes || echo no)"
  echo "sqlite3_cli=$(sqlite3 --version | awk '{print $1}')"
} > "$RUN_DIR/db-read-mode.txt"

# PRAGMA table_info(artifacts) is asserted against the real file rather than
# against the DDL string the plugin shipped, because "the column is absent" is a
# claim about what landed, not about what was written.
ARTIFACT_COLUMNS="$(sqlite_ro "PRAGMA table_info(artifacts)" | cut -d'|' -f2 | tr '\n' ' ')"
echo "plugin db   : $PLUGIN_DB"
echo "db read mode: $SQLITE_READ_MODE ($SQLITE_MASTER_OBJECTS objects in sqlite_master)"
echo "artifacts   : $ARTIFACT_COLUMNS"

# The RAW column, read from OUTSIDE Caido. The RPC could redact on READ while the
# column stayed dirty, and only the file can tell you which happened — the same
# reason the PRAGMA above is asserted against the real file rather than against the
# DDL string the plugin shipped.
sqlite_ro "SELECT url FROM observations" > "$RUN_DIR/observations-url-raw.txt"
echo "raw url rows: $(wc -l < "$RUN_DIR/observations-url-raw.txt" | tr -d ' ')"

# --- assertions -------------------------------------------------------------
# THE PARAMETERS GO THROUGH A FILE IN FIXDIR, not on the command line. Five of
# them are live per-run values, and an argv is world-readable through `ps` for the
# lifetime of the process — on a host where the whole point of the run is that a
# credential-shaped value is not left lying around. FIXDIR is a mktemp directory
# the EXIT trap removes, and it is never under RUN_DIR, which is committed.
export TRACER_PARAMS="$FIXDIR/params.json"
TP_EXPECTED_SHA="$EXPECTED_SHA" TP_EXPECTED_BYTES="$EXPECTED_BYTES" \
TP_FIXTURE_NAME="$FIXTURE_NAME" TP_CACHE_BUSTER="$CACHE_BUSTER" \
TP_ARTIFACTS="$RUN_DIR/artifacts.json" TP_OBSERVATIONS="$RUN_DIR/observations.json" \
TP_STATUS="$RUN_DIR/status.json" TP_RAW="$RUN_DIR/observations-url-raw.txt" \
TP_REACH_OUT="$RUN_DIR/grammar-reachability.txt" \
TP_COLUMNS="$ARTIFACT_COLUMNS" TP_SECRET_PARAM="$SECRET_PARAM" \
TP_SECRET_VALUE="$SECRET_VALUE" TP_BARE_SECRET="$BARE_SECRET" \
TP_PATHPARAM_NAME="$PATHPARAM_NAME" TP_PATHPARAM_SECRET="$PATHPARAM_SECRET" \
TP_USERINFO_USER="$USERINFO_USER" TP_USERINFO_SECRET="$USERINFO_SECRET" \
TP_USERINFO_ON_WIRE="$USERINFO_ON_WIRE" TP_USERINFO_AS_AUTH="$USERINFO_AS_AUTH_HEADER" \
TP_READ_MODE="$SQLITE_READ_MODE" \
python3 - <<'PY'
import json, os
json.dump({k[3:].lower(): v for k, v in os.environ.items() if k.startswith("TP_")},
          open(os.environ["TRACER_PARAMS"], "w"))
PY
chmod 600 "$TRACER_PARAMS"

python3 - <<'PY'
import json, os, sys

P = json.load(open(os.environ["TRACER_PARAMS"], encoding="utf-8"))

sha      = P["expected_sha"]
nbytes   = int(P["expected_bytes"])
fixture  = P["fixture_name"]
buster   = P["cache_buster"]
cols     = P["columns"].split()
secret_param   = P["secret_param"]
pathparam_name = P["pathparam_name"]

arts = json.load(open(P["artifacts"], encoding="utf-8"))
obs  = json.load(open(P["observations"], encoding="utf-8"))
st   = json.load(open(P["status"], encoding="utf-8"))
raw_urls      = open(P["raw"], encoding="utf-8").read()
obs_json_text = open(P["observations"], encoding="utf-8").read()
# One line per row: `sqlite3` emits exactly that for a single-column SELECT, and
# no URL this fixture can produce contains a newline.
raw_rows = raw_urls.splitlines()

# The cache buster is `v=tracer1`. Under the redaction policy the NAME half
# survives and the VALUE half must not, so it is split rather than searched whole.
buster_name, _, buster_value = buster.partition("=")
REDACTION = "<redacted>"

# ONE ROW PER GRAMMAR, and the LABEL is the point. A single reused value would say
# that SOMETHING leaked without saying WHICH grammar leaked it — and plan 01-14
# exists precisely because the live tier had only ever exercised the first row.
GRAMMARS = [
    ("name=value query pair (01-07)",                P["secret_value"]),
    ("bare `=`-less query segment (01-10, P10-D1)",  P["bare_secret"]),
    ("`;` path parameter (01-11, redactUrlHead)",    P["pathparam_secret"]),
    ("userinfo PASSWORD half (01-11)",               P["userinfo_secret"]),
    ("userinfo USERNAME half (01-11)",               P["userinfo_user"]),
]

fails = []
notes = []
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
    # The NAMES survive — that is the analytic value the operator's decision kept.
    check(f"{buster_name}=" in url,
          f"observation url {url!r} lost the cache-busting parameter NAME")
    check(f"{secret_param}=" in url,
          f"observation url {url!r} lost the {secret_param} parameter NAME")
    # The VALUES do not.
    check(buster_value not in url,
          f"observation url {url!r} still carries the cache buster VALUE {buster_value!r}")
    check(REDACTION in url,
          f"observation url {url!r} carries no redaction marker")
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

# ==========================================================================
# THE ASSERTIONS THAT MAKE THIS AN END-TO-END PROOF RATHER THAN A PROJECTION
# TEST. The RPC could redact on READ while the column stayed dirty. Only the
# file can tell you which happened, so BOTH channels are asserted — never either.
# ==========================================================================

# --- per grammar, UNCONDITIONALLY. This is the load-bearing claim, and it holds
#     however the URL was normalised on the way in: if a grammar never reached the
#     plugin its secret is absent too, and absent is what is being asserted.
#     Counted rather than merely tested, so a failure can say HOW MANY times.
occurrences = {}
for label, secret in GRAMMARS:
    raw_hits  = raw_urls.count(secret)
    json_hits = obs_json_text.count(secret)
    occurrences[label] = (raw_hits, json_hits)
    check(raw_hits == 0,
          f"[{label}] the per-run secret occurs {raw_hits} time(s) in "
          f"SELECT url FROM observations, read with sqlite3 from OUTSIDE Caido — "
          f"the DURABLE column is dirty")
    check(json_hits == 0,
          f"[{label}] the per-run secret occurs {json_hits} time(s) in "
          f"observations.json (the RPC projection)")
    for i, o in enumerate(obs):
        u = o.get("url") or ""
        check(secret not in u,
              f"[{label}] observation row {i} still carries the per-run secret: {u!r}")

# --- IN-13, half one: the RAW column is asserted as strictly as the per-row RPC
#     checks. The marker was only ever searched for in the concatenated text.
check(REDACTION in raw_urls,
      f"the raw column carries NO redaction marker anywhere: {raw_urls!r}")
for i, r in enumerate(raw_rows):
    check(REDACTION in r,
          f"raw column row {i} carries no redaction marker: {r!r}")
    check(f"{buster_name}={REDACTION}" in r,
          f"raw column row {i} does not read {buster_name}={REDACTION}: {r!r}")
    check(f"{secret_param}={REDACTION}" in r,
          f"raw column row {i} does not read {secret_param}={REDACTION}: {r!r}")
    # DECISION P10-D1 AGAINST THE FILE. The bare segment is LAST in the fixture
    # query and `redactQueryValues` preserves segment order, so the stored query
    # must END with `&<redacted>`. This is the assertion that goes red when the
    # `eq === -1` branch is reverted: a 32-character hex value is shorter than
    # QUERY_NAME_MAX, so the pre-01-10 branch stores it verbatim.
    check(r.endswith(f"&{REDACTION}"),
          f"raw column row {i} does not END with &{REDACTION} — the BARE "
          f"(`=`-less) query segment did not reach the column redacted, which is "
          f"decision P10-D1: {r!r}")

# --- IN-13, half two: the raw row count must EQUAL the number of rows the RPC
#     returned. A run where the RPC returned two rows and the table held ten used
#     to pass, because every per-row check ran over the RPC's two.
check(len(raw_rows) == len(obs),
      f"the raw column holds {len(raw_rows)} row(s) but the RPC returned "
      f"{len(obs)} — every per-row assertion above ran over the RPC's rows only, "
      f"so a disagreement here means the file holds rows nothing checked")

# --- the two grammars whose LIVE reach is not knowable from the source. MEASURED,
#     never assumed in either direction. Each gets an unconditional secret-absence
#     assertion (above) plus a SEPARATELY LABELLED name assertion that runs only
#     where this run shows the grammar actually reached the plugin.
pathparam_reached = ";" in raw_urls
if pathparam_reached:
    for i, r in enumerate(raw_rows):
        check(f";{pathparam_name}={REDACTION}" in r,
              f"raw column row {i} carries a `;` path parameter but not "
              f";{pathparam_name}={REDACTION} — the `;` grammar reached the "
              f"plugin and was not redacted by the policy: {r!r}")
    notes.append(f"`;` path parameter: REACHED the plugin; asserted as "
                 f";{pathparam_name}={REDACTION} in every raw row")
else:
    notes.append("`;` path parameter: DID NOT REACH the plugin — no `;` survived "
                 "into observations.url at all through this tier. The secret's "
                 "absence above is therefore not evidence that redactUrlHead ran. "
                 "Enforced instead by observations.spec.ts, \"USERINFO does not "
                 "reach the column either, nor does a `;` parameter value "
                 "(WR-11)\", which reads the row back out of a real SQLite file.")

userinfo_reached = "@" in raw_urls
if userinfo_reached:
    for i, r in enumerate(raw_rows):
        check(f"{REDACTION}@" in r,
              f"raw column row {i} carries an `@` in the authority but not "
              f"{REDACTION}@ — userinfo reached the plugin and was not redacted: {r!r}")
    notes.append(f"URL userinfo: REACHED the plugin; asserted as {REDACTION}@ in "
                 f"every raw row")
else:
    notes.append(f"URL userinfo: DID NOT REACH the plugin — curl put userinfo in "
                 f"the request line: {P['userinfo_on_wire']}; sent it as an "
                 f"Authorization: Basic header: {P['userinfo_as_auth']}. "
                 f"Userinfo cannot be exercised through this tier, so the "
                 f"absence of both halves above is a property of the TIER, not "
                 f"of redactUrlHead. Enforced instead by observations.spec.ts, "
                 f"\"USERINFO does not reach the column either, nor does a `;` "
                 f"parameter value (WR-11)\", and by \"userinfo with a password: "
                 f"NEITHER half survives, and the `@` does\".")

# The measured reachability is WRITTEN INTO THE RUN DIRECTORY. A limit of the live
# tier that is recorded with the run that measured it is evidence; the same limit
# left in a terminal scrollback is a silence.
with open(P["reach_out"], "w", encoding="utf-8") as fh:
    fh.write("# Which credential-bearing URL grammars reached observations.url\n")
    fh.write("# through the LIVE tier on this run. Measured, not assumed.\n")
    fh.write("# No secret bytes here — occurrence counts only.\n")
    fh.write(f"db_read_mode={P['read_mode']}\n")
    fh.write(f"raw_rows={len(raw_rows)}\nrpc_rows={len(obs)}\n")
    fh.write(f"pathparam_reached={'yes' if pathparam_reached else 'no'}\n")
    fh.write(f"userinfo_reached={'yes' if userinfo_reached else 'no'}\n")
    fh.write(f"userinfo_in_request_line={P['userinfo_on_wire']}\n")
    fh.write(f"userinfo_as_authorization_header={P['userinfo_as_auth']}\n")
    for label, (rh, jh) in occurrences.items():
        fh.write(f"secret_occurrences[{label}] raw={rh} rpc={jh}\n")
    for n in notes:
        fh.write(f"note: {n}\n")

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
print("raw rows == rpc rows   :", len(raw_rows), "==", len(obs))
print("db read mode           :", P["read_mode"])
print("stored url (raw column):", raw_rows[0] if raw_rows else "<none>")
print()
print("per-grammar secret occurrences (raw column / RPC json):")
for label, (rh, jh) in occurrences.items():
    print(f"  {label:<46} raw={rh} rpc={jh}")
print()
for n in notes:
    print("  measured:", n)
print()
print("sqlite inside Caido    :", st["sqliteVersion"])
print("schema version         :", st.get("schemaVersion"))
print("max event->reload ms   :", st.get("maxEventToReloadMs"))
PY

echo
echo "TRACER PASSED"
# The secret sweep runs from cleanup(), after teardown — see secret_sweep() for
# why the ordering is load-bearing. Its line appears below this one.
