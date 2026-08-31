#!/usr/bin/env bash
# scripts/phase6/matrix.sh — the DEPLOY-01 deployment matrix, run end to end.
#
#   bash scripts/phase6/matrix.sh
#
# Runs the four declared shapes ONE AT A TIME, in a FIXED DECLARED ORDER,
# aggregates their records into one artifact, validates it against the schema
# BEFORE writing it, and writes it to THIS phase's own results directory.
#
# SEQUENTIALLY, AND NEVER IN PARALLEL. Three separate reasons, any one of which
# would be sufficient: two legs would contend for the origin port and the Caido
# ports; two container legs would contend for the Docker daemon and for the same
# image; and a failure in one leg must not be masked by another's interleaved
# output. There is no background job and no `&` anywhere below.
#
# THE ORDER IS DECLARED AND A LEG KEEPS ITS SLOT. The native legs run first
# because they are the cheap ones that fail fast, and the no-volume leg runs last
# because it is the one whose result the whole requirement turns on. A leg that
# cannot run is carried into the artifact as `not_run` WITH ITS REASON, in its
# own slot — never reordered away, never dropped (D-23).
#
# THE EXIT CODE ENCODES D-23. Zero when every leg either PASSED or was recorded
# NOT RUN; non-zero only when a leg that RAN failed an assertion. An unreachable
# leg does not stop the phase completing — it makes the matrix PARTIAL, and the
# gate is what reports that, so DEPLOY-01's checkbox does not move on the
# strength of a leg that never executed.
#
# THE HONEST LIMIT IS RECORDED IN THE ARTIFACT, NOT ONLY IN A DOCUMENT. On one
# machine the desktop and command-line legs SHARE A FILESYSTEM, which is the
# exact property DEPLOY-02 and DEPLOY-03 exist because of, so only the two
# container legs genuinely test it. `shares_filesystem_with` carries that per leg
# and `verdict.remote_filesystem_property` carries it for the matrix. Four
# passing legs must not be read as four independent confirmations — that is
# D-23's discipline applied to a leg that RAN rather than to one that did not.
#
# If the command-line leg is instead run against a genuinely remote host, set
# MATRIX_CLI_REMOTE_HOST before running: the leg script then clears its
# `shares_filesystem_with` and the note below changes with it. Absent that, the
# local run WITH THE LIMITATION STATED is a legitimate result and is exactly what
# D-23 prescribes — it is the unlabelled approximation that is forbidden, not the
# labelled one.
#
# This script writes NOTHING into the Phase 0 results directory and edits no
# Phase 0 threshold artifact (Pitfall 7, T-06-53).
set -euo pipefail

cd "$(dirname "$0")/../.."

MATRIX_EXPECTED_VERSION="0.58.2"
RESULTS=".planning/phases/06-retroactive-scan-deployment-reality/results"
LEGS_DIR="$RESULTS/legs"
ARTIFACT="$RESULTS/matrix-result.json"
SCHEMA="$RESULTS/matrix-result.schema.json"

# THE DECLARED ORDER. The gate asserts this exact sequence.
LEGS=(local-desktop remote-cli docker-volume docker-no-volume)

mkdir -p "$LEGS_DIR"

HOST_OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
HOST_RELEASE="$(uname -r)"
HOST_ARCH="$(uname -m)"
HOST_CORES="$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 0)"
DOCKER_SERVER="$(docker info --format '{{.ServerVersion}}' 2>/dev/null || true)"

# ---------------------------------------------------------------------------
# The legs. One at a time.
#
# Exit 3 is the leg script's NOT RUN — a recorded absence, not a failure, and the
# loop continues. Any other non-zero is a leg that ran and failed; the loop still
# continues, because a failing leg must not hide the results of the legs after
# it, and the aggregate is what reports the verdict.
# ---------------------------------------------------------------------------
for leg in "${LEGS[@]}"; do
  echo "" >&2
  echo "=== leg: $leg ==========================================" >&2
  rm -f "$LEGS_DIR/$leg.json"
  set +e
  bash scripts/phase6/matrix-leg.sh "$leg"
  code=$?
  set -e
  case "$code" in
    0) echo "--- $leg: passed" >&2 ;;
    3) echo "--- $leg: NOT RUN (recorded with its reason)" >&2 ;;
    *) echo "--- $leg: FAILED (exit $code)" >&2 ;;
  esac
  # A leg that died before writing its own record leaves NO record, and an
  # absent slot is not a state the artifact may carry. It becomes `not_run` with
  # that as the reason — the same treatment as any other leg that produced no
  # measurement.
  if [ ! -f "$LEGS_DIR/$leg.json" ]; then
    echo "--- $leg: wrote no record; recording it as NOT RUN" >&2
    LEG_NAME="$leg" EXPECTED="$MATRIX_EXPECTED_VERSION" CODE="$code" \
      OUTFILE="$LEGS_DIR/$leg.json" python3 - <<'PY'
import json, os
leg = os.environ["LEG_NAME"]
container = leg.startswith("docker-")
binary = (
    {
        "kind": "container",
        "image": "caido/caido",
        "tag": os.environ["EXPECTED"],
        "expected_version": os.environ["EXPECTED"],
        "reported_version": None,
        "manifest_digest": None,
    }
    if container
    else {
        "kind": "native",
        "path": "Caido.app/Contents/Resources/bin/caido-cli",
        "expected_version": os.environ["EXPECTED"],
        "reported_version": None,
        "sha256": None,
    }
)
shares = None if container else (
    ["remote-cli"] if leg == "local-desktop" else ["local-desktop"]
)
json.dump({
    "leg": leg,
    "status": "not_run",
    "reason": "the leg script exited %s without writing a record" % os.environ["CODE"],
    "assertions": {
        "install_and_compatible": None,
        "migrations_and_tables": None,
        "artifact_and_observation": None,
        "restart_data_presence": None,
    },
    "binary": binary,
    "shares_filesystem_with": shares,
    "notes": "NOT RUN. The leg script produced no record of its own.",
}, open(os.environ["OUTFILE"], "w"), indent=2)
PY
  fi
done

# ---------------------------------------------------------------------------
# The aggregate. Validated BEFORE it is written into place, so an invalid
# document never becomes the committed evidence.
# ---------------------------------------------------------------------------
echo "" >&2
echo "=== aggregating ========================================" >&2

TMP_ART="$(mktemp "${TMPDIR:-/tmp}/matrix-result.XXXXXX.json")"

LEGS_JSON="$(printf '%s\n' "${LEGS[@]}" | python3 -c 'import json,sys;print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))')"

LEGS_DIR="$LEGS_DIR" LEGS_ORDER="$LEGS_JSON" EXPECTED="$MATRIX_EXPECTED_VERSION" \
HOS="$HOST_OS" HREL="$HOST_RELEASE" HARCH="$HOST_ARCH" HCORES="$HOST_CORES" \
DOCKERV="$DOCKER_SERVER" OUTFILE="$TMP_ART" \
python3 - <<'PY'
import datetime, json, os

order = json.loads(os.environ["LEGS_ORDER"])
legs = []
for name in order:
    with open(os.path.join(os.environ["LEGS_DIR"], name + ".json"), encoding="utf-8") as fh:
        legs.append(json.load(fh))

ASSERTIONS = [
    "install_and_compatible",
    "migrations_and_tables",
    "artifact_and_observation",
    "restart_data_presence",
]

not_run = [l for l in legs if l["status"] == "not_run"]
ran = [l for l in legs if l["status"] != "not_run"]
# A leg's own `status` is a SUMMARY, and a summary can be wrong. The assertions
# are the evidence, so a leg is broken if either says so.
broke = [
    l for l in ran
    if l["status"] == "fail"
    or any(l["assertions"].get(k) is False for k in ASSERTIONS)
]

# WHICH LEGS ACTUALLY CARRY THE REMOTE-FILESYSTEM PROPERTY — required by the
# schema, because the overclaim it prevents is silent when it is merely absent.
shared = sorted({
    l["leg"] for l in legs
    if l.get("shares_filesystem_with")
})
containers = [l["leg"] for l in legs if l["leg"].startswith("docker-")]
carriers = [l for l in containers if next(
    (x for x in legs if x["leg"] == l), {}).get("status") == "pass"]

if shared:
    limit = (
        "The %s legs share a filesystem on the recording host and therefore do "
        "NOT exercise the property DEPLOY-02 and DEPLOY-03 exist for — that a "
        "server's disk is not the operator's. Only the container legs (%s) do. "
        "%d passing legs are NOT %d independent confirmations of that property."
        % (
            " and ".join(shared),
            ", ".join(containers),
            len([l for l in legs if l["status"] == "pass"]),
            len([l for l in legs if l["status"] == "pass"]),
        )
    )
else:
    limit = (
        "No two legs share a filesystem on the recording host; the command-line "
        "leg was run against a genuinely remote host, so it carries the "
        "remote-filesystem property alongside the container legs (%s)."
        % ", ".join(containers)
    )
if not carriers:
    limit += (
        " NOTE: no container leg PASSED in this run, so the remote-filesystem "
        "property is not evidenced by it at all."
    )

if len(not_run) == len(legs):
    status = "not_run"
elif broke:
    status = "fail"
else:
    status = "pass"

answer_bits = [
    "%d of %d declared deployment shapes ran" % (len(ran), len(legs)),
    "%d passed" % len([l for l in legs if l["status"] == "pass"]),
]
if not_run:
    answer_bits.append(
        "%d recorded NOT RUN (%s)"
        % (len(not_run), "; ".join("%s: %s" % (l["leg"], l.get("reason") or "no reason") for l in not_run))
    )
if broke:
    answer_bits.append("%d FAILED an assertion" % len(broke))

doc = {
    "$schema": "./matrix-result.schema.json",
    "matrix": "DEPLOY-01",
    "status": status,
    "recorded_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "expected_version": os.environ["EXPECTED"],
    "method": (
        "scripts/phase6/matrix.sh runs scripts/phase6/matrix-leg.sh once per "
        "declared shape, sequentially and in a fixed order. Each leg brings up a "
        "fresh isolated instance, asserts the reported version BEFORE recording "
        "anything, installs the shipped plugin package over the GraphQL upload "
        "route, and runs D-22's four assertions: the plugin installs and reports "
        "compatible; migrations ran and the shipped EXPECTED_TABLES set is "
        "present; three distinct proxied JavaScript responses produce artifact "
        "and observation rows; and after the leg's own restart the data is "
        "present — except on the no-volume container, where it must be ABSENT "
        "and the plugin must come back clean on an empty database. Row counts "
        "and the table set are read from the plugin's SQLite file copied to "
        "scratch, never through the project-scoped RPC, because a guest's "
        "temporary project does not survive a restart and the RPC would report "
        "an empty result for a database that is not empty."
    ),
    "host": {
        "os": os.environ["HOS"],
        "release": os.environ["HREL"],
        "arch": os.environ["HARCH"],
        "cores": int(os.environ["HCORES"] or 0),
        "docker_server_version": os.environ["DOCKERV"] or None,
    },
    "legs": legs,
    "verdict": {
        "answer": "; ".join(answer_bits) + ".",
        "legs_run": len(ran),
        "legs_not_run": len(not_run),
        "legs_failed": len(broke),
        "partial": len(not_run) > 0,
        "remote_filesystem_property": limit,
        "if_wrong": (
            "If a leg is recorded as passing on an assertion it did not actually "
            "run, DEPLOY-01 reads as evidenced when it is not. The gate in "
            "tests/phase6-matrix.spec.ts refuses a not_run leg carrying any "
            "non-null assertion, and refuses a no-volume leg that found data "
            "present after its restart."
        ),
    },
    "requirements_affected": ["DEPLOY-01", "FIND-03"],
}

with open(os.environ["OUTFILE"], "w", encoding="utf-8") as fh:
    json.dump(doc, fh, indent=2)
    fh.write("\n")

print("aggregated %d legs: status=%s partial=%s" % (len(legs), status, doc["verdict"]["partial"]))
PY

# VALIDATE BEFORE WRITING INTO PLACE. An artifact that does not satisfy its own
# schema must never become the committed evidence, even for one commit.
if ! node scripts/spike/validate-schema.mjs "$SCHEMA" "$TMP_ART"; then
  echo "FATAL: the aggregated matrix does not validate against $SCHEMA." >&2
  echo "       Refusing to write it. The candidate is at $TMP_ART." >&2
  exit 1
fi

mv "$TMP_ART" "$ARTIFACT"
echo "matrix written: $ARTIFACT" >&2

# ---------------------------------------------------------------------------
# The exit code. D-23, mechanised: a partial matrix is not a failed one.
# ---------------------------------------------------------------------------
FAILED="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["verdict"]["legs_failed"])' "$ARTIFACT")"
PARTIAL="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["verdict"]["partial"])' "$ARTIFACT")"
if [ "$FAILED" != "0" ]; then
  echo "MATRIX FAILED: $FAILED leg(s) ran and failed an assertion." >&2
  exit 1
fi
if [ "$PARTIAL" = "True" ]; then
  echo "MATRIX PARTIAL: every leg that ran passed; one or more were recorded NOT RUN with a reason." >&2
  echo "                The phase can complete; DEPLOY-01 is not fully evidenced (D-23)." >&2
fi
exit 0
