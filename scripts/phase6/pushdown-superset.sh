#!/usr/bin/env bash
# scripts/phase6/pushdown-superset.sh — the D-06 push-down superset capture.
#
# THE QUESTION IN WORDS: is the HTTPQL clause DefMiner pushes down to
# `sdk.requests.query()` a SUPERSET of `admit()`'s kind axis — for every response
# the shipped classifier would accept, does Caido's own evaluator match the
# shipped clause?
#
# WHY IT MATTERS. The push-down is an OPTIMISATION and `admit()` is the GATE. An
# over-matching clause costs bandwidth. An UNDER-matching clause costs artifacts
# the operator will never learn were missed — silently, because a subset returns
# FEWER ROWS, not an error. D-06 is the decision that a disagreement must be a red
# test rather than a silent hole, and 06-RESEARCH § O-03 already found a concrete
# one: `req.ext.eq:".js"` is documented CASE SENSITIVE while `isScriptish`
# lowercases, so `/APP.JS` is admitted by DefMiner and missed by the obvious term.
#
# WHAT THIS SCRIPT PRODUCES, AND WHAT IT DELIBERATELY DOES NOT.
# It produces a TRANSCRIPT: one row per fixture carrying Caido's own boolean for
# the shipped clause, plus the exact clause bytes those booleans came from. It
# does NOT decide whether the superset relation holds. That decision is
# `tests/phase6-pushdown.spec.ts`'s, made against the SHIPPED `isScriptish`
# imported in-process — because `matches()` exists only inside the plugin and
# `isScriptish` is only trustworthy as the shipped module, so the proof is split
# at the runtime boundary and joined by FIXTURE IDENTITY. Neither half is a
# re-implementation of the other, and that is the point.
#
# THE PROBE EVALUATES; IT NEVER REPAIRS. A failed superset relation is a red test
# and the clause is corrected in `packages/backend/src/scan/filter.ts` — really in
# `packages/engine/src/contract.ts`, where the constant lives — in its own commit.
# Nothing here ever widens a clause to make itself green.
#
# PORTS. This probe owns 8963-8964, inside the Phase 6 block and clear of every
# port already spoken for:
#   8080       the operator's LIVE Caido desktop instance with real project data.
#              REFUSED UNCONDITIONALLY, here and again inside instance.sh.
#   8998       the long-lived SPIKE-10 recorder instance. NEVER killed by anything
#              here — nothing in this script kills a process it did not start.
#   8951-8955  plan 06-08's deployment matrix.
#   8961-8962  plan 06-02's O-07 probe.
#   8999, 8991-8996, 8981-8985, 8081-8083   Phase 0's.
#   8971-8975  Phase 1's (scripts/phase1/env.sh).
#
# WHAT THIS SCRIPT WILL NOT DO. It will not write into
# `.planning/phases/00-runtime-reality-check/results/`, it will not touch a Phase 0
# threshold artifact, it will not edit `scripts/spike/instance.sh`,
# `scripts/spike/probe-run.sh` or `scripts/spike/origin.py`, it will not invoke
# bare `caido-cli` from PATH (a stale 0.55.3 on this machine), and it will not
# record ANYTHING if the binary reports a version other than the pinned constant
# below.
set -euo pipefail

cd "$(dirname "$0")/../.."

# THIS PHASE'S OWN PINNED VERSION (D-21). `scripts/spike/instance.sh` defaults to
# Phase 0's 0.57.1 and `tests/phase1-*.spec.ts` pin the same value; both are
# deliberate fail-closed tripwires over artifacts measured on that build, and
# neither is read, reused or edited from here. This value is passed IN as
# EXPECT_VERSION.
PUSHDOWN_EXPECTED_VERSION="0.58.2"

export EXPECT_VERSION="$PUSHDOWN_EXPECTED_VERSION"
export CAIDO_BIN="${CAIDO_BIN:-/Applications/Caido.app/Contents/Resources/bin/caido-cli}"
export PORT="${PORT:-8963}"
ORIGIN_PORT="${ORIGIN_PORT:-8964}"

RESULTS=".planning/phases/06-retroactive-scan-deployment-reality/results"
export OUT="${OUT:-$RESULTS}"
ARTIFACT="$RESULTS/pushdown-superset.json"
SCHEMA="$RESULTS/pushdown-superset.schema.json"
CORPUS_DIR="corpus/pushdown"
MANIFEST="$CORPUS_DIR/manifest.json"
SIDECAR="$CORPUS_DIR/origin-headers.json"

START_EPOCH="$(date +%s)"

# ---------------------------------------------------------------------------
# GATE 0 — the binary, BEFORE anything is launched or written.
#
# instance.sh runs this same check and would refuse too. It is repeated here for
# one reason: on a mismatch this script must write NOTHING AT ALL, and by the time
# instance.sh has failed we are already inside the run.
# ---------------------------------------------------------------------------
[ -x "$CAIDO_BIN" ] || { echo "FATAL: $CAIDO_BIN is not executable" >&2; exit 1; }
REPORTED_VERSION="$("$CAIDO_BIN" --version 2>/dev/null | awk '{print $2}')"
if [ "$REPORTED_VERSION" != "$PUSHDOWN_EXPECTED_VERSION" ]; then
  echo "FATAL: version mismatch. expected $PUSHDOWN_EXPECTED_VERSION, got ${REPORTED_VERSION:-<none>} ($CAIDO_BIN)" >&2
  echo "       Refusing to record any measurement against an unexpected build (D-21)." >&2
  echo "       NOTE: bare 'caido-cli' on PATH resolves to a STALE 0.55.3 on this machine." >&2
  exit 1
fi
BINARY_SHA="$(shasum -a 256 "$CAIDO_BIN" | cut -d' ' -f1)"
echo "binary      : $CAIDO_BIN reports $REPORTED_VERSION" >&2

mkdir -p "$RESULTS"

HOST_OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
HOST_RELEASE="$(uname -r)"
HOST_ARCH="$(uname -m)"
HOST_CORES="$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 0)"

CLAUSE=""
CLAUSE_ROUTE=""

# ---------------------------------------------------------------------------
# NOT RUN — D-23's discipline, as a function.
#
# A capture that could not run is recorded WITH ITS REASON and never as a pass.
# The artifact still names its binary, still validates against the schema, and
# carries NO per-fixture verdicts at all — the schema forbids them alongside
# `not_run`, because a recorded verdict on a run that did not happen is exactly
# the shape D-23 exists to prevent.
# ---------------------------------------------------------------------------
write_not_run() {
  local reason="$1"
  echo "NOT RUN: $reason" >&2
  REASON="$reason" ART="$ARTIFACT" BIN_PATH="$CAIDO_BIN" \
  EXPECTED="$PUSHDOWN_EXPECTED_VERSION" REPORTED="$REPORTED_VERSION" \
  BSHA="$BINARY_SHA" LISTEN="127.0.0.1:$PORT" RID="${RUN_ID:-not-run}" \
  HOS="$HOST_OS" HREL="$HOST_RELEASE" HARCH="$HOST_ARCH" HCORES="$HOST_CORES" \
  CLAUSE="$CLAUSE" CLAUSE_ROUTE="${CLAUSE_ROUTE:-node-type-stripping}" \
  python3 - <<'PY'
import datetime, json, os
doc = {
    "$schema": "./pushdown-superset.schema.json",
    "probe": "D-06",
    "status": "not_run",
    "reason": os.environ["REASON"],
    "recorded_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "binary": {
        "path": os.environ["BIN_PATH"],
        "expected_version": os.environ["EXPECTED"],
        "reported_version": os.environ["REPORTED"],
        "sha256": os.environ["BSHA"],
    },
    "host": {
        "os": os.environ["HOS"], "release": os.environ["HREL"],
        "arch": os.environ["HARCH"], "cores": int(os.environ["HCORES"] or 0),
    },
    "instances": [{"run_id": os.environ["RID"], "listen": os.environ["LISTEN"],
                   "probe_zip_sha256": None}],
    "method": "The run did not reach the capture. See `reason`.",
    "clause": {
        "value": os.environ["CLAUSE"] or "(not obtained)",
        "route": os.environ["CLAUSE_ROUTE"],
        "echoed_by_probe": None,
    },
    "fixtures": [],
    "unmatched": {"records_without_manifest_entry": [],
                  "manifest_entries_without_record": []},
    "verdict": {
        "fixtures_captured": 0, "fixtures_matched": None,
        "fixtures_not_matched": None, "manifest_fixture_count": None,
        "answer": "Not measured. " + os.environ["REASON"],
    },
    "requirements_affected": ["FIND-03"],
}
json.dump(doc, open(os.environ["ART"], "w"), indent=2)
open(os.environ["ART"], "a").write("\n")
PY
  node scripts/spike/validate-schema.mjs "$SCHEMA" "$ARTIFACT" >&2
  exit 0
}

# ---------------------------------------------------------------------------
# GATE 1 — the ports. instance.sh refuses 8080 unconditionally and refuses a port
# already in LISTEN; the origin port gets the same treatment here, BEFORE the
# instance is launched.
# ---------------------------------------------------------------------------
if [ "$ORIGIN_PORT" = "8080" ] || [ "$PORT" = "8080" ]; then
  echo "FATAL: refusing port 8080 — that is the operator's live Caido desktop instance." >&2
  exit 1
fi
if lsof -nP -iTCP:"$ORIGIN_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "FATAL: origin port $ORIGIN_PORT is already in LISTEN state. Refusing to collide." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# GATE 2 — the corpus. Generated, gitignored and rebuilt rather than committed,
# and regenerated HERE so a stale corpus can never be joined against a fresh
# capture.
# ---------------------------------------------------------------------------
node scripts/phase6/make-pushdown-fixtures.mjs >/dev/null || \
  write_not_run "the fixture generator failed — run: node scripts/phase6/make-pushdown-fixtures.mjs"
[ -f "$MANIFEST" ] && [ -f "$SIDECAR" ] || \
  write_not_run "the generated fixture corpus is absent — run: node scripts/phase6/make-pushdown-fixtures.mjs"
FIXTURE_COUNT="$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["fixtures"]))' "$MANIFEST")"
echo "corpus      : $FIXTURE_COUNT fixtures in $CORPUS_DIR" >&2

# ---------------------------------------------------------------------------
# GATE 3 — the clause, READ from the shipped module rather than retyped.
#
# PRIMARY ROUTE: let Node evaluate the TypeScript source directly and print the
# exported constant. Node 26 strips types natively. FALLBACK: build the backend
# and read the constant out of the build output.
#
# EITHER ROUTE IS SAFE, and the reason is not the route. `tests/phase6-pushdown.
# spec.ts` asserts the RECORDED clause byte-identical to the shipped constant it
# imports itself, so a route that returned the wrong string produces a RED TEST
# rather than a confidently wrong artifact. The route is an engineering
# convenience; that assertion is the guarantee — which is why the route is
# recorded in the artifact rather than left implicit.
# ---------------------------------------------------------------------------
if CLAUSE="$(node -e 'import("./packages/engine/src/contract.ts").then(m=>process.stdout.write(m.SCAN_KIND_CLAUSE))' 2>/dev/null)" && [ -n "$CLAUSE" ]; then
  CLAUSE_ROUTE="node-type-stripping"
else
  pnpm exec caido-dev build packages >/dev/null 2>&1 || true
  CLAUSE="$(python3 - <<'PY'
import glob, json, re, sys
# The constant is a plain string literal in the bundle. Read it out by finding the
# 2xx-bounded kind clause; no other string in the build carries `resp.code.gte:200`.
pat = re.compile(r'"((?:[^"\\]|\\.)*resp\.code\.gte:200(?:[^"\\]|\\.)*)"')
for f in glob.glob("packages/dist/**/*.js", recursive=True):
    m = pat.search(open(f, encoding="utf-8", errors="replace").read())
    if m:
        sys.stdout.write(json.loads('"' + m.group(1) + '"'))
        break
PY
)"
  CLAUSE_ROUTE="built-backend-bundle"
fi
[ -n "$CLAUSE" ] || write_not_run "could not read SCAN_KIND_CLAUSE from the shipped module by either route"
echo "clause      : $CLAUSE_ROUTE, ${#CLAUSE} bytes" >&2

# ---------------------------------------------------------------------------
# The origin. `scripts/spike/origin.py` is SOURCED AS DATA, never edited: its
# per-path sidecar already carries `content_type`, `status` and `cache_control`,
# which is exactly what the whole fixture set is expressed in.
# ---------------------------------------------------------------------------
ORIGIN_PID=""
cleanup() {
  [ -n "$ORIGIN_PID" ] && kill -9 "$ORIGIN_PID" 2>/dev/null || true
  # ALWAYS instance.sh's own teardown — never a new kill. It force-kills (a wedged
  # QuickJS thread never honours SIGTERM), copies the host log out, deletes the
  # guest token and removes the isolated data directory. Nothing here kills a
  # process this script did not start.
  if declare -F teardown >/dev/null 2>&1; then teardown || true; fi
}
trap cleanup EXIT

mkdir -p .spike
python3 scripts/spike/origin.py --dir "$CORPUS_DIR" --port "$ORIGIN_PORT" \
  --headers "$SIDECAR" > ".spike/pushdown-origin-$ORIGIN_PORT.log" 2>&1 &
ORIGIN_PID=$!
for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" && break
  kill -0 "$ORIGIN_PID" 2>/dev/null || {
    echo "origin died:" >&2; cat ".spike/pushdown-origin-$ORIGIN_PORT.log" >&2
    write_not_run "the local origin did not start"; }
  sleep 0.25
done
curl -sf -o /dev/null "http://127.0.0.1:$ORIGIN_PORT/_health" || \
  write_not_run "the local origin did not become ready on $ORIGIN_PORT"
echo "origin      : up on 127.0.0.1:$ORIGIN_PORT" >&2

# ---------------------------------------------------------------------------
# The instance. SOURCED, never re-implemented: the absolute-app-path default, the
# version gate, the 8080 refusal, the LISTEN collision check, the polled readiness
# loop, the `umask 077` guest-token write and the always-SIGKILL teardown are
# already correct in that file and are not copied here.
# ---------------------------------------------------------------------------
# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh

CAIDO_URL="http://127.0.0.1:$PORT"
TOKEN="$(cat "$OUT/runs/$RUN_ID/token")"
RAW="$RUN_DIR/raw"
mkdir -p "$RAW"

gql() {
  curl -s -X POST "$CAIDO_URL/graphql" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "$1"
}

# A fresh Caido has NO project, and with none selected the proxy answers
# "Proxying error: Internal" and nothing reaches the traffic table at all. A hard
# prerequisite for every traffic-observing run. A guest may create TEMPORARY
# projects only, and a temporary project is also what keeps this run away from the
# operator's real project data.
PROJECT_ID="$(gql '{"query":"mutation{ createProject(input:{name:\"phase6-pushdown\",temporary:true}){ project{ id } error{ __typename } } }"}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["createProject"]; sys.exit("createProject failed: "+str(d["error"])) if d["error"] else print(d["project"]["id"])')"
gql "{\"query\":\"mutation{ selectProject(id:\\\"$PROJECT_ID\\\"){ error{ __typename } } }\"}" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]["selectProject"]; sys.exit("selectProject failed: "+str(d["error"])) if d["error"] else None'
echo "project     : selected (temporary)" >&2

probe_install probe/pushdown-superset || write_not_run "the disposable probe failed to install"
PROBE_ZIP_SHA256="$PROBE_ZIP_SHA"

# ---------------------------------------------------------------------------
# The capture pass. ONE proxied request per fixture — `matches()` is synchronous
# and in-process, so the corpus crosses the proxy once and every verdict is read
# without touching the network again (O-03).
#
# The fragment fixture is requested WITH its fragment on purpose. curl strips it
# before the wire, which is the answer: a fragment is client-side only and the
# proxy never sees one. Recording that rather than assuming it is the point.
# ---------------------------------------------------------------------------
FETCHES="$RAW/fetches.jsonl"
: > "$FETCHES"
python3 -c '
import json,sys
m=json.load(open(sys.argv[1]))
for f in m["fixtures"]:
    url=f["request_path"]
    if f.get("request_query"): url += "?" + f["request_query"]
    if f.get("request_fragment"): url += "#" + f["request_fragment"]
    print(f["fixture_id"] + "\t" + url)
' "$MANIFEST" > "$RAW/urls.tsv"

FETCH_OK=0
while IFS="$(printf '\t')" read -r fid rel; do
  code="$(curl -s --max-time 60 --proxy "$CAIDO_URL" -o /dev/null -w '%{http_code}' \
    "http://127.0.0.1:$ORIGIN_PORT$rel" || echo "000")"
  printf '{"fixture_id":%s,"rel":%s,"http_code":%s}\n' \
    "$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$fid")" \
    "$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$rel")" \
    "$( [ "$code" = "000" ] && echo null || echo "$code" )" >> "$FETCHES"
  [ "$code" = "200" ] && FETCH_OK=$((FETCH_OK + 1))
done < "$RAW/urls.tsv"
echo "fetched     : $FETCH_OK/$FIXTURE_COUNT returned 200 through the proxy" >&2
[ "$FETCH_OK" -gt 0 ] || write_not_run "no fixture returned 200 through the proxy — nothing reached the traffic table"

# ---------------------------------------------------------------------------
# The oracle. POLLED for visibility, never slept-and-hoped: the traffic table is
# written asynchronously and a fixed sleep would read a transcript that had not
# finished growing. The readiness idiom instance.sh already establishes.
#
# ARGS CROSS THE PLUGIN-FUNCTION ROUTE DOUBLE-ENCODED. `{"args":[[...]]}` is
# rejected outright (`invalid type: sequence, expected a string`), and the route
# JSON-DECODES each string element once before the handler sees it — so a singly
# encoded argument arrives already unwrapped. `jargs` is the shape
# scripts/spike/run-spike-09-12.sh established and plan 06-02 re-measured; it is
# copied rather than sourced, because that file is a driver and not a library.
# ---------------------------------------------------------------------------
jargs() {
  python3 -c 'import json,sys; print(json.dumps([json.dumps(a) for a in sys.argv[1:]]))' "$@"
}

EVAL_JSON="$RAW/evaluate.json"
for _ in $(seq 1 40); do
  probe_call evaluate "$(jargs "$CLAUSE")" 120 > "$EVAL_JSON" 2>/dev/null || echo '{}' > "$EVAL_JSON"
  n="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(int(d.get("count") or 0))' "$EVAL_JSON" 2>/dev/null || echo 0)"
  [ "${n:-0}" -ge "$FETCH_OK" ] && break
  sleep 1
done
CAPTURED="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(int(d.get("count") or 0))' "$EVAL_JSON")"
echo "oracle      : $CAPTURED stored pairs evaluated" >&2
[ "$CAPTURED" -gt 0 ] || write_not_run "the oracle saw zero stored pairs — no fixture reached the traffic table"

DURATION_S=$(( $(date +%s) - START_EPOCH ))

# ---------------------------------------------------------------------------
# Join, ASSEMBLE, VALIDATE, then write. In that order: an artifact that does not
# validate must never reach the results directory at all.
#
# The join is on the REQUEST PATH, which the generator guarantees unique per
# fixture. BOTH directions of failure are recorded rather than dropped: a stored
# pair the manifest does not name, and a manifest fixture with no stored pair. A
# fixture that never reached the traffic table must be VISIBLE, because silently
# reducing the corpus is how a proof shrinks until it proves nothing.
# ---------------------------------------------------------------------------
TMP_ARTIFACT="$RAW/pushdown-superset.candidate.json"
ART="$TMP_ARTIFACT" MANIFEST="$MANIFEST" EVAL="$EVAL_JSON" \
BIN_PATH="$CAIDO_BIN" EXPECTED="$PUSHDOWN_EXPECTED_VERSION" \
REPORTED="$REPORTED_VERSION" BSHA="$BINARY_SHA" LISTEN="127.0.0.1:$PORT" \
RID="$RUN_ID" HOS="$HOST_OS" HREL="$HOST_RELEASE" HARCH="$HOST_ARCH" \
HCORES="$HOST_CORES" CLAUSE="$CLAUSE" CLAUSE_ROUTE="$CLAUSE_ROUTE" \
PZIP="$PROBE_ZIP_SHA256" DUR="$DURATION_S" \
python3 - <<'PY'
import datetime, json, os, urllib.parse

man = json.load(open(os.environ["MANIFEST"]))
ev = json.load(open(os.environ["EVAL"]))
by_path = {f["request_path"]: f for f in man["fixtures"]}
seen = {}
extra = []

for row in ev.get("rows") or []:
    path = urllib.parse.urlparse(row["request_url"]).path
    f = by_path.get(path)
    if f is None:
        extra.append(row["request_url"])
        continue
    # First writer wins: a fixture fetched twice would otherwise silently become
    # two rows and break the exactly-once join the gate asserts.
    seen.setdefault(f["fixture_id"], {
        "fixture_id": f["fixture_id"],
        "request_path": path,
        "request_url": row["request_url"],
        "request_id": row.get("request_id"),
        "response_status": row.get("response_status"),
        "response_content_type": row.get("response_content_type"),
        "clause_matched": row.get("clause_matched"),
        "expected": f["expected"],
        "media_type_exercised": f.get("media_type_exercised"),
    })

fixtures = [seen[f["fixture_id"]] for f in man["fixtures"] if f["fixture_id"] in seen]
missing = [f["fixture_id"] for f in man["fixtures"] if f["fixture_id"] not in seen]
matched = sum(1 for f in fixtures if f["clause_matched"] is True)
not_matched = sum(1 for f in fixtures if f["clause_matched"] is False)

# `pass` here means ONLY that the transcript is whole: every manifest fixture
# reached the traffic table, nothing unnamed crept in, and the oracle answered.
# It is NOT a claim that the superset relation holds — that is decided by
# tests/phase6-pushdown.spec.ts against the shipped classifier, and saying so in
# the artifact is what stops a later reader quoting `status` as the answer.
if missing or extra or ev.get("error"):
    status = "inconclusive"
    answer = ("The transcript is incomplete: %d manifest fixtures never reached the traffic "
              "table and %d stored pairs were not named by the manifest. The superset relation "
              "is NOT decidable from this artifact." % (len(missing), len(extra)))
else:
    status = "pass"
    answer = ("Caido's own evaluator answered for all %d manifest fixtures against the shipped "
              "clause: %d matched, %d did not. The transcript is whole. Whether the relation "
              "`isScriptish accepts implies the clause matches` HOLDS is decided by "
              "tests/phase6-pushdown.spec.ts, which imports the shipped classifier and the "
              "shipped constant and joins them to these rows by fixture id."
              % (len(fixtures), matched, not_matched))

doc = {
    "$schema": "./pushdown-superset.schema.json",
    "probe": "D-06",
    "status": status,
    "recorded_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "duration_s": int(os.environ["DUR"]),
    "binary": {
        "path": os.environ["BIN_PATH"],
        "expected_version": os.environ["EXPECTED"],
        "reported_version": os.environ["REPORTED"],
        "sha256": os.environ["BSHA"],
    },
    "host": {
        "os": os.environ["HOS"], "release": os.environ["HREL"],
        "arch": os.environ["HARCH"], "cores": int(os.environ["HCORES"] or 0),
    },
    "instances": [{
        "run_id": os.environ["RID"],
        "listen": os.environ["LISTEN"],
        "probe_zip_sha256": os.environ["PZIP"] or None,
    }],
    "method": (
        "A fresh, version-asserted Caido on an isolated data path with a temporary project. "
        "The generated fixture corpus is served by scripts/spike/origin.py from a per-path "
        "sidecar and proxied through the instance once. A disposable backend plugin then calls "
        "sdk.requests.matches(clause, request, response) — synchronous and in-process — for "
        "every stored pair, so the proof costs one capture pass and not one round trip per "
        "case. The probe records the evaluator's answers and makes no classification decision "
        "of its own; the shipped isScriptish is applied in tests/phase6-pushdown.spec.ts and "
        "joined to these rows by fixture id."
    ),
    "clause": {
        "value": os.environ["CLAUSE"],
        "route": os.environ["CLAUSE_ROUTE"],
        "echoed_by_probe": ev.get("clause"),
    },
    "fixtures": fixtures,
    "fail_closed": ev.get("fail_closed"),
    "unmatched": {
        "records_without_manifest_entry": extra,
        "manifest_entries_without_record": missing,
    },
    "verdict": {
        "fixtures_captured": len(fixtures),
        "fixtures_matched": matched,
        "fixtures_not_matched": not_matched,
        "manifest_fixture_count": len(man["fixtures"]),
        "answer": answer,
    },
    "requirements_affected": ["FIND-03"],
}
json.dump(doc, open(os.environ["ART"], "w"), indent=2)
open(os.environ["ART"], "a").write("\n")
PY

node scripts/spike/validate-schema.mjs "$SCHEMA" "$TMP_ARTIFACT"
cp "$TMP_ARTIFACT" "$ARTIFACT"
echo "artifact    : $ARTIFACT" >&2
python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
v=d["verdict"]
print("status      : "+d["status"], file=sys.stderr)
print("verdict     : captured=%s matched=%s not_matched=%s of %s manifest fixtures"
      % (v["fixtures_captured"], v["fixtures_matched"], v["fixtures_not_matched"],
         v["manifest_fixture_count"]), file=sys.stderr)' "$ARTIFACT"

echo "D-06 capture done (run=$RUN_ID)" >&2
