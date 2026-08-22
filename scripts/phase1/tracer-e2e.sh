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
# the build rather than a comment claiming it. A version literal in this file is a
# bug, and `tests/pins.spec.ts` — describe block "WR-21 — the tracer's own
# no-version-literal rule is ENFORCED, not merely claimed" — is what enforces it: it
# reads this whole file, COMMENTS INCLUDED, and fails on any semver-shaped token.
#
# THAT SENTENCE USED TO BE FALSE, AND THAT IS WHY IT NOW NAMES A FILE (01-VERIFICATION.md
# WR-21). Until 2026-08-22 it read "a `grep -c` for the superseded one returning zero
# is how that is enforced", and NOTHING in the repository performed that grep — a
# search for this script's own name over `*.ts`, `*.mjs`, `*.sh` and `*.json` outside
# `.planning/` returned seven hits and every one was prose. A claim that a check
# EXISTS is the claim a reader will not re-verify, and it sat in the file whose entire
# purpose is producing citeable evidence. Plan 01-17 wrote the gate rather than
# deleting the sentence, and the gate has been OBSERVED failing: a planted literal
# drives it red, and so does removing the marker that makes its scan non-vacuous.
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
# STORE-03's live probe. EVERY secret below is random bytes generated FRESH at every
# run: a value that cannot appear in the database by coincidence, cannot be satisfied
# by a hard-coded expectation, and is a tracer dye rather than a credential — which is
# what makes committing a FAILING run's raw dump an honest artifact instead of a leak.
#
# ONE SECRET PER GRAMMAR, and they are distinct on purpose: a single value reused
# across all of them would tell you that SOMETHING leaked without telling you WHICH
# grammar leaked it, and the whole reason plan 01-14 exists is that the live tier
# had only ever exercised one of them.
#
#   SECRET_VALUE     `name=value` query pair   — plan 01-07's original grammar
#   BARE_SECRET      `=`-less query segment    — plan 01-10, decision P10-D1
#   PATHPARAM_SECRET `;`-delimited path param  — plan 01-11, redactUrlHead
#   USERINFO_SECRET  `user:pass@host` password — plan 01-11, redactUrlHead
#   USERINFO_USER    `user:pass@host` username — plan 01-11, "BOTH halves go"
#   PAD_TWO_SECRET   bare segment, TWO `=`     — plan 01-17, CR-07
#   PAD_ONE_SECRET   bare segment, ONE `=`     — plan 01-17, CR-07
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

# ---- THE PADDED PAIR (plan 01-17, CR-07) -----------------------------------
# Every dye above is `openssl rand -hex`, AND HEX NEVER CONTAINS AN `=`. That one
# fact is why the live tier could not go red on CR-07: the whole class of credential
# whose redaction turns on an `=` was unreachable from here, in exactly the same blind
# spot the unit tier had, at the same moment. `observations.spec.ts` closed it at the
# unit tier; these two dyes close it at the tier that reads the real database file.
#
# TWO DYES, NOT ONE, BECAUSE THE RULE HAS TWO SUB-BRANCHES. `redactDelimitedSegment`
# redacts a segment WHOLE when its value half — everything after the FIRST `=` — is
# empty OR is nothing but `=`. Standard base64 of 16 raw bytes is 24 characters with
# TWO `=` of padding, so its value half is a lone `=`; standard base64 of 32 raw bytes
# is 44 characters with exactly ONE, so its value half is EMPTY. Those are different
# paths through one predicate, and a live tier that exercises one of them proves half
# the rule.
#
# THE CORES ARE THE POINT, AND THIS IS THE LOAD-BEARING PART OF THIS BLOCK. Against
# the defect the column stores the dye MINUS ONE BYTE of padding followed by the
# marker — `dXNlcjpwYTU1dzByZA==` lands as `dXNlcjpwYTU1dzByZA=<redacted>`, from which
# one re-pad and one `base64 -d` returns the credential. So the PADDED literal is NOT
# a substring of the stored value, a fixed-string search for it returns zero, and a
# tracer that asserted only that would PASS with a whole credential in the row. The
# recoverable spelling is the PADDING-STRIPPED CORE, so every absence assertion below
# and every entry in `secret_sweep` carries both.
#
# The stripper is a loop over parameter expansion, not a pattern, and it strips only
# TRAILING `=` — byte-for-byte the same derivation as `paddingStrippedCore` in
# `packages/backend/src/store/observations.spec.ts`, so the two tiers cannot come to
# disagree about what "the recoverable half" spells.
strip_padding() {
  local s="$1"
  while [ "${s%=}" != "$s" ]; do s="${s%=}"; done
  printf '%s' "$s"
}
PAD_TWO_SECRET="$(openssl rand -base64 16 | tr -d '\n')"
PAD_ONE_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
PAD_TWO_CORE="$(strip_padding "$PAD_TWO_SECRET")"
PAD_ONE_CORE="$(strip_padding "$PAD_ONE_SECRET")"
PAD_TWO_PADDING=$(( ${#PAD_TWO_SECRET} - ${#PAD_TWO_CORE} ))
PAD_ONE_PADDING=$(( ${#PAD_ONE_SECRET} - ${#PAD_ONE_CORE} ))

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
# THE PADDED DYES ARE ASSERTED INTO SHAPE BEFORE THE RUN, and this guard is not
# ceremony. A dye that arrived with no padding would exercise the `=`-LESS branch
# instead of the padding branch — a run that looks identical, passes identically, and
# proves nothing about CR-07. That is a green-because-it-could-not-fail run, which is
# the exact shape this phase has now had to stamp out four times (T-01-54). The core
# is checked non-empty for the same reason `expectSecretAbsent` checks it: a literal
# that is entirely padding has no recoverable core, and `"x".includes("")` is always
# true, so an all-`=` dye would report a survival that never happened.
[ "$PAD_TWO_PADDING" -eq 2 ] || {
  echo "FATAL: the TWO-pad dye carries $PAD_TWO_PADDING '=' of padding, expected 2." >&2
  echo "       Its value half would not be a lone '=' and the sub-branch under test" >&2
  echo "       would not be exercised. Refusing to run a proof that cannot fail." >&2; exit 1; }
[ "$PAD_ONE_PADDING" -eq 1 ] || {
  echo "FATAL: the ONE-pad dye carries $PAD_ONE_PADDING '=' of padding, expected 1." >&2
  echo "       Its value half would not be EMPTY and the sub-branch under test would" >&2
  echo "       not be exercised. Refusing to run a proof that cannot fail." >&2; exit 1; }
[ -n "$PAD_TWO_CORE" ] && [ -n "$PAD_ONE_CORE" ] || {
  echo "FATAL: a padded dye stripped to an EMPTY core. A literal that is entirely" >&2
  echo "       padding has no recoverable spelling to assert absent." >&2; exit 1; }
echo "padded dyes : TWO-pad '=' x$PAD_TWO_PADDING (core ${#PAD_TWO_CORE}B), ONE-pad '=' x$PAD_ONE_PADDING (core ${#PAD_ONE_CORE}B)"

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
# zero this phase keeps having to stamp out.
#
# IT COUNTS OCCURRENCES, NOT LINES (IN-14, corrected 2026-08-22). The header line
# below says "occurrences" and the counter used to be `grep -c -F`, which counts
# matching LINES. Two hits on one line reported as ONE — and that is not a corner
# case here, it is the SHAPE OF THE INSTRUMENT'S MAIN SUBJECT: a proxy log records a
# request line and a response line, and a single-line JSON dump records every value it
# holds on one line. The number quoted in this comment before the fix ("four
# occurrences of each wire value") was a number `grep -c` CANNOT PRODUCE, so it is
# gone rather than adjusted. It now counts with `grep -o` piped through `wc -l`.
#
# NO CORRECTED NUMBER IS QUOTED HERE, and that is deliberate rather than an omission.
# The corrected count is whatever the corrected instrument measures on a given run,
# and every run writes it into its OWN `secret-sweep.txt`. Quoting one here would put
# this comment back in the business of claiming a measurement instead of pointing at
# it — the same discipline this file's header applies to the Caido version, and for
# the same reason. Plan 01-17's measured figures are in `README-01-17.md`.
#
# `grep -a` because Caido's host log is not guaranteed to be valid text end to end and
# `grep -o` on a file it decides is binary prints "Binary file matches" instead of the
# matches — a silent undercount, in a sweep whose entire job is not to undercount.
#
# STILL A MEASUREMENT AND NOT A GATE, deliberately: the mutation run is SUPPOSED to
# leave a secret in `observations-url-raw.txt`, and a gate here would make that run
# impossible to produce.
secret_sweep() {
  [ -n "${RUN_DIR:-}" ] && [ -d "${RUN_DIR:-}" ] || return 0
  {
    echo "# Occurrences of each per-run value across the run directory, per file."
    echo "# Counts only, never the values. Swept AFTER teardown, so Caido's own"
    echo "# host log is in scope. See README-01-14.md for what is committed."
    echo "# The two padded dyes are swept under BOTH spellings: the padded literal"
    echo "# and the PADDING-STRIPPED CORE. The core is the half that is recoverable"
    echo "# (re-pad, base64 -d), and a sweep that checked only the padded spelling"
    echo "# would be blind in exactly the place the assertions used to be (CR-07)."
    for pair in "query-pair:$SECRET_VALUE" "bare-segment:$BARE_SECRET" \
                "path-param:$PATHPARAM_SECRET" "userinfo-pass:$USERINFO_SECRET" \
                "userinfo-user:$USERINFO_USER" \
                "pad-two-literal:$PAD_TWO_SECRET" "pad-two-CORE:$PAD_TWO_CORE" \
                "pad-one-literal:$PAD_ONE_SECRET" "pad-one-CORE:$PAD_ONE_CORE"; do
      label="${pair%%:*}"; value="${pair#*:}"
      while IFS= read -r f; do
        n="$({ grep -a -o -F -- "$value" "$f" 2>/dev/null || true; } | wc -l | tr -d ' ')"
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
# THE LAST TWO SEGMENTS ARE THE PADDED PAIR, in this order, and the ORDER IS PART OF
# THE ASSERTION: the query redactor preserves segment order, so the stored query's
# final two segments are the two padded dyes' positions and each must read as exactly
# the redaction marker. Appending them moved the bare `=`-less segment from LAST to
# THIRD FROM LAST — the assertion block below is retargeted accordingly rather than
# left describing a position that moved.
FIXTURE_PATH="$FIXTURE_NAME;$PATHPARAM_NAME=$PATHPARAM_SECRET"
FIXTURE_QUERY="$CACHE_BUSTER&$SECRET_PARAM=$SECRET_VALUE&$BARE_SECRET&$PAD_TWO_SECRET&$PAD_ONE_SECRET"
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
# THE PADDED DYES ON THE WIRE, measured the same way and for the same reason. A dye
# mangled in transit — `+` read as a space, padding stripped by a normaliser — would
# make its absence from the column trivially true and the run a confident zero. This
# is a FIXED-STRING search because base64 carries `+` and `/`, both of which a regex
# would read as operators.
wire_carries() { grep '^> GET ' "$CURL_TRACE" | grep -qF -- "$1"; }
if wire_carries "$PAD_TWO_SECRET"; then PAD_TWO_ON_WIRE="yes"; else PAD_TWO_ON_WIRE="no"; fi
if wire_carries "$PAD_ONE_SECRET"; then PAD_ONE_ON_WIRE="yes"; else PAD_ONE_ON_WIRE="no"; fi
{
  echo "# Measured, not assumed: can URL userinfo be exercised through this tier?"
  echo "# Derived from curl's own -v request-line trace. No secret bytes here, and"
  echo "# no Authorization header value either — that is base64 of user:secret."
  echo "userinfo_in_request_line=$USERINFO_ON_WIRE"
  echo "userinfo_sent_as_authorization_header=$USERINFO_AS_AUTH_HEADER"
  echo "request_lines_emitted=$(grep -c '^> GET ' "$CURL_TRACE" || true)"
  echo "# The padded pair, on the wire, byte-for-byte as generated (plan 01-17)."
  echo "pad_two_literal_in_request_line=$PAD_TWO_ON_WIRE"
  echo "pad_one_literal_in_request_line=$PAD_ONE_ON_WIRE"
  echo "pad_two_padding_bytes=$PAD_TWO_PADDING"
  echo "pad_one_padding_bytes=$PAD_ONE_PADDING"
} > "$RUN_DIR/userinfo-measurement.txt"
[ "$PAD_TWO_ON_WIRE" = "yes" ] && [ "$PAD_ONE_ON_WIRE" = "yes" ] || {
  echo "FATAL: a padded dye did not reach the request line byte-for-byte" >&2
  echo "       (two-pad=$PAD_TWO_ON_WIRE one-pad=$PAD_ONE_ON_WIRE). Its absence from" >&2
  echo "       the column would then be a property of the TRANSPORT and not of the" >&2
  echo "       redactor, and every padded assertion below would pass for the wrong" >&2
  echo "       reason. Refusing to report a zero this run did not earn." >&2; exit 1; }

# Echo the URL with every secret masked. The two proxied requests are the thing
# being reported; printing five live per-run values into the run log is not.
echo "proxied 2 requests for http://<userinfo-user>:<userinfo-secret>@127.0.0.1:$P1_ORIGIN_PORT/$FIXTURE_NAME;$PATHPARAM_NAME=<secret>?$CACHE_BUSTER&$SECRET_PARAM=<secret>&<bare-secret>&<pad-two-secret>&<pad-one-secret>"
echo "userinfo on wire       : $USERINFO_ON_WIRE (as Authorization header: $USERINFO_AS_AUTH_HEADER)"
echo "padded pair on wire    : two-pad=$PAD_TWO_ON_WIRE one-pad=$PAD_ONE_ON_WIRE"

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
TP_PAD_TWO_SECRET="$PAD_TWO_SECRET" TP_PAD_TWO_CORE="$PAD_TWO_CORE" \
TP_PAD_ONE_SECRET="$PAD_ONE_SECRET" TP_PAD_ONE_CORE="$PAD_ONE_CORE" \
TP_PAD_TWO_ON_WIRE="$PAD_TWO_ON_WIRE" TP_PAD_ONE_ON_WIRE="$PAD_ONE_ON_WIRE" \
TP_PAD_TWO_PADDING="$PAD_TWO_PADDING" TP_PAD_ONE_PADDING="$PAD_ONE_PADDING" \
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
#
# THE PADDED PAIR CONTRIBUTES FOUR ROWS, NOT TWO (plan 01-17, CR-07). Each padded dye
# is listed under its PADDED LITERAL and, separately, under its PADDING-STRIPPED CORE.
# They are separate rows rather than one because they FAIL SEPARATELY and the failure
# has to say which: against the defect the column stores the dye minus one byte of
# padding, so the two-pad LITERAL is absent while its CORE is sitting in the row. A
# table carrying only the literal would report `raw=0` and pass. That is the same
# blindness the unit tier had, at the same spot, and closing it here is the whole
# reason this dye exists.
PAD_TWO_LABEL = "padded bare segment, TWO `=` — value half is a lone `=` (01-17)"
PAD_ONE_LABEL = "padded bare segment, ONE `=` — value half is EMPTY (01-17)"
GRAMMARS = [
    ("name=value query pair (01-07)",                P["secret_value"]),
    ("bare `=`-less query segment (01-10, P10-D1)",  P["bare_secret"]),
    ("`;` path parameter (01-11, redactUrlHead)",    P["pathparam_secret"]),
    ("userinfo PASSWORD half (01-11)",               P["userinfo_secret"]),
    ("userinfo USERNAME half (01-11)",               P["userinfo_user"]),
    (PAD_TWO_LABEL,                                  P["pad_two_secret"]),
    (PAD_TWO_LABEL + " [PADDING-STRIPPED CORE]",     P["pad_two_core"]),
    (PAD_ONE_LABEL,                                  P["pad_one_secret"]),
    (PAD_ONE_LABEL + " [PADDING-STRIPPED CORE]",     P["pad_one_core"]),
]

# NON-VACUITY ON THE CORES THEMSELVES, first, in the shape `expectSecretAbsent` uses
# in `observations.spec.ts`. A literal that is entirely padding strips to the empty
# string, `"anything".count("")` is not zero but `"x" in "y"` on an empty needle is
# ALWAYS True — either way the assertion would be reporting something other than what
# it says. The shell preflight already refuses such a dye; this is the same guard on
# the far side of the parameter file, so a hand-edited params.json cannot smuggle one
# past it.
for _core_label, _core in (("two-pad", P["pad_two_core"]), ("one-pad", P["pad_one_core"])):
    if not _core:
        print(f"FATAL: the {_core_label} core is EMPTY — an absence assertion on it "
              f"would be meaningless", file=sys.stderr)
        sys.exit(1)

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
    # THE SHAPE OF THE STORED TAIL, not only the absence of the secret. Absence
    # alone is satisfiable by a URL that never reached the plugin at all, so the
    # last three query segments are asserted to BE the redaction marker, by
    # position. `redactQueryValues` preserves segment order, so position is a
    # fact about the stored value rather than an assumption about it.
    #
    # RETARGETED BY PLAN 01-17, AND THE RETARGET IS THE POINT. This block used to
    # be one `r.endswith(f"&{REDACTION}")` whose comment said "the bare segment is
    # LAST in the fixture query". Appending the two padded dyes moved it to THIRD
    # FROM LAST, and an `endswith` left in place would have gone on passing while
    # silently checking a padded dye instead of the bare one — a comment describing
    # a position that moved is how a gate stops testing what it says it tests.
    # Asserted by INDEX now, one named assertion per segment.
    q_seg = r.partition("?")[2].split("&") if "?" in r else []
    # NON-VACUITY FIRST: the index arithmetic below is meaningless if the query did
    # not arrive with the five segments the fixture sent.
    check(len(q_seg) == 5,
          f"raw column row {i} carries {len(q_seg)} query segment(s), expected the "
          f"5 the fixture sent (v, {secret_param}, bare, two-pad, one-pad) — the "
          f"positional assertions below would be indexing something else: {r!r}")
    if len(q_seg) == 5:
        # Decision P10-D1 against the file. Goes red when the `eq === -1` branch is
        # reverted: a 32-character hex value is shorter than QUERY_NAME_MAX, so the
        # pre-01-10 branch stores it verbatim.
        check(q_seg[-3] == REDACTION,
              f"raw column row {i}: query segment -3 reads {q_seg[-3]!r}, not "
              f"{REDACTION} — the BARE (`=`-less) query segment did not reach the "
              f"column redacted, which is decision P10-D1: {r!r}")
        # CR-07, sub-branch ONE: an `=` that was PADDING and not a separator, value
        # half a lone `=`. Goes red when plan 01-15's padding branch is reverted —
        # the segment then stores as `<core>=<redacted>` instead.
        check(q_seg[-2] == REDACTION,
              f"raw column row {i}: query segment -2 reads {q_seg[-2]!r}, not "
              f"{REDACTION} — SUB-BRANCH 'value half is a lone `=`' (the TWO-pad "
              f"dye) did not reach the column redacted WHOLE. Against the defect "
              f"this reads as the padding-stripped core, an `=`, and the marker, "
              f"from which one re-pad and one `base64 -d` returns the credential: "
              f"{r!r}")
        # CR-07, sub-branch TWO: value half EMPTY.
        check(q_seg[-1] == REDACTION,
              f"raw column row {i}: query segment -1 reads {q_seg[-1]!r}, not "
              f"{REDACTION} — SUB-BRANCH 'value half is EMPTY' (the ONE-pad dye) "
              f"did not reach the column redacted WHOLE: {r!r}")
    # The coarse whole-row spelling is KEPT, and it now covers the LAST segment,
    # which since plan 01-17 is the ONE-pad dye rather than the bare one. It is
    # redundant with `q_seg[-1]` above by construction and that is deliberate: it is
    # the one check in this block that does not depend on the segment split being
    # right, so a bug in the split cannot make the whole block vacuous.
    check(r.endswith(f"&{REDACTION}"),
          f"raw column row {i} does not END with &{REDACTION} — the LAST query "
          f"segment, which is the ONE-pad dye since plan 01-17, did not reach the "
          f"column redacted: {r!r}")

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

# --- the padded pair's reachability, MEASURED on two independent channels.
#     Channel 1 is curl's own request-line trace: did the dye leave this host
#     byte-for-byte, padding intact? (The shell aborts the run if not — a dye
#     mangled in transit makes its own absence trivially true.) Channel 2 is the
#     stored value: did the segment ARRIVE as its own query segment? Segment COUNT
#     answers that without needing the secret to survive, which is the only way to
#     ask the question on a run where the correct answer is that it did not.
padded_segments_reached = bool(raw_rows) and all(
    len(r.partition("?")[2].split("&")) == 5 for r in raw_rows if "?" in r
)
if padded_segments_reached:
    notes.append("padded bare segments (TWO `=` and ONE `=`): REACHED the plugin — "
                 "every raw row carries 5 query segments in fixture order, and the "
                 "last two are asserted to BE the redaction marker. Both sub-branches "
                 "of the CR-07 padding rule are exercised LIVE by this run.")
else:
    notes.append("padded bare segments: DID NOT REACH the plugin as distinct query "
                 "segments — the stored query does not carry the 5 segments the "
                 "fixture sent, so the absence of both dyes above is a property of "
                 "the TIER and not of redactDelimitedSegment. Enforced instead by "
                 "observations.spec.ts's BARE_CREDENTIAL_SHAPES entries \"HTTP Basic "
                 "credential, standard base64 with TWO `=` of padding\" and \"... with "
                 "ONE `=` of padding\", and by \"a PADDED credential does not reach the "
                 "column on EITHER delimiter\", which reads the row back out of a real "
                 "SQLite file.")

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
    # The two padded grammars, one row each, on both measured channels (01-17).
    fh.write(f"padded_segments_reached={'yes' if padded_segments_reached else 'no'}\n")
    fh.write(f"pad_two_in_request_line={P['pad_two_on_wire']}\n")
    fh.write(f"pad_one_in_request_line={P['pad_one_on_wire']}\n")
    fh.write(f"pad_two_padding_bytes={P['pad_two_padding']}\n")
    fh.write(f"pad_one_padding_bytes={P['pad_one_padding']}\n")
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
