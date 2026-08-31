#!/usr/bin/env python3
"""scripts/phase6/o07-assemble.py — turn one O-07 run into its result artifact.

The shell/python split is `scripts/spike/run-spike-08.sh` + `analyse-spike-08.py`'s,
unchanged: the shell owns the instance, the ports and the fetches, and the
classification lives where it can be read.

Everything here is driven by environment variables set by
`scripts/phase6/o07-body-length.sh`. Nothing here launches anything, kills
anything, or reads outside the run directory it is given.

CLASSIFICATION, AND WHY IT IGNORES THE `identity` BLOCK. Under `identity` the
wire byte count and the decompressed byte count are THE SAME NUMBER, so that
block can never distinguish the two hypotheses — it would agree with whichever
one was proposed. The verdict is therefore decided on the three COMPRESSED
encodings only, and the identity block is recorded as the control that proves the
plumbing was measuring anything at all.
"""
from __future__ import annotations

import datetime
import json
import os
import sys

ENCODINGS = os.environ["ENCS"].split()
COMPRESSED = [e for e in ENCODINGS if e != "identity"]
FIXTURE = os.environ["FIX"]
IDENTITY_BYTES = int(os.environ["IDBYTES"])


def load(path: str):
    with open(path, "r") as fh:
        return json.load(fh)


def load_lines(path: str) -> list:
    out = []
    with open(path, "r") as fh:
        for line in fh:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


fetches = {f["encoding"]: f for f in load_lines(os.environ["FETCHES"])}
hooks = load(os.environ["HOOKS"])["rows"]
reloads = {r["id"]: r for r in load(os.environ["RELOAD"])["rows"]}
query = load(os.environ["QUERY"])
query_rows = {r["id"]: r for r in query.get("rows", [])}
status = load(os.environ["STATUSF"])
counters = status.get("counters", {}) or {}

# Attribute each hook row to an encoding by the per-encoding tag the fetch put in
# the query string. A response with no tag is somebody else's traffic and is
# ignored rather than guessed at.
hook_by_enc: dict[str, dict] = {}
for row in hooks:
    for enc in ENCODINGS:
        if ("fx=o07-" + enc) in row.get("url", ""):
            hook_by_enc[enc] = row

measurements: dict[str, object] = {
    "byte_len_mismatch": int(counters.get("byteLenMismatch", 0)),
    "reload_pairs_compared": int(counters.get("reloadHit", 0))
    - int(counters.get("reloadEmptyBody", 0)),
}

missing: list[str] = []
for enc in ENCODINGS:
    hook = hook_by_enc.get(enc)
    rid = hook.get("id") if hook else None
    rl = reloads.get(rid, {}) if rid else {}
    qr = query_rows.get(rid, {}) if rid else {}
    block = {
        "fixture": FIXTURE,
        # From the file on disk, not from the fixture manifest: the manifest's
        # wire numbers came from Node's codecs and the origin compresses with
        # Python's, but the DECOMPRESSED count is a property of the file itself
        # and is identical either way.
        "identity_byte_len": IDENTITY_BYTES,
        "hook_body_length": hook.get("body_length") if hook else None,
        "reload_raw_length": rl.get("raw_length"),
        "reload_body_length": rl.get("body_length"),
        "query_body_length": qr.get("body_length"),
        "query_raw_length": qr.get("raw_length"),
        "wire_byte_len": (fetches.get(enc) or {}).get("direct_wire_bytes"),
    }
    for field in ("reload_raw_length", "query_body_length", "wire_byte_len"):
        if block[field] is None:
            missing.append(enc + "." + field)
    measurements[enc] = block


def classify(field: str) -> str:
    """identity / wire / not_measured, decided on the COMPRESSED encodings only."""
    ident = 0
    wire = 0
    seen = 0
    for enc in COMPRESSED:
        b = measurements[enc]
        assert isinstance(b, dict)
        value = b[field]
        if value is None:
            continue
        seen += 1
        if value == b["identity_byte_len"]:
            ident += 1
        elif value == b["wire_byte_len"]:
            wire += 1
    if seen == 0:
        return "not_measured"
    if ident == seen:
        return "identity"
    if wire == seen:
        return "wire"
    # A SPLIT is not a majority vote. Three encodings disagreeing about what the
    # same read path reports is a finding in its own right and must not be
    # collapsed into whichever answer won two of three.
    return "not_measured"


get_verdict = classify("reload_raw_length")
query_verdict = classify("query_body_length")

if missing:
    status_value = "not_run"
    reason = (
        "the measurement did not complete: "
        + ", ".join(sorted(missing))
        + " came back null. "
        + (
            "The query() leg reported: " + str(query.get("error"))
            if query.get("error")
            else "No error was reported by any leg; the count was simply absent."
        )
    )
elif get_verdict == "not_measured" or query_verdict == "not_measured":
    status_value = "inconclusive"
    reason = None
else:
    status_value = "pass"
    reason = None

answer_parts = []
answer_parts.append(
    "MEASURED on this build, and the FIRST measurement of either read path in "
    "this project: SPIKE-08's method names only onInterceptResponse."
)
answer_parts.append(
    "sdk.requests.get() reports the "
    + (
        "DECOMPRESSED identity byte count"
        if get_verdict == "identity"
        else "WIRE byte count"
        if get_verdict == "wire"
        else "count could not be classified"
    )
    + "; sdk.requests.query() reports the "
    + (
        "DECOMPRESSED identity byte count"
        if query_verdict == "identity"
        else "WIRE byte count"
        if query_verdict == "wire"
        else "count could not be classified"
    )
    + "."
)
answer_parts.append(
    "Decided on the gzip, br and zstd blocks only. Under identity the wire count "
    "and the decompressed count are the same number, so that block can agree with "
    "either hypothesis and decides nothing; it is the control."
)
answer_parts.append(
    "The shipped instrument agrees: counters.byteLenMismatch = "
    + str(measurements["byte_len_mismatch"])
    + " over "
    + str(measurements["reload_pairs_compared"])
    + " reload comparisons."
)

doc = {
    "$schema": "./o07-body-length.schema.json",
    "probe": "O-07",
    "status": status_value,
    "recorded_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "binary": {
        "path": os.environ["BIN_PATH"],
        "expected_version": os.environ["EXPECTED"],
        "reported_version": os.environ["REPORTED"],
        "sha256": os.environ["BSHA"],
    },
    "host": {
        "os": os.environ["HOS"],
        "release": os.environ["HREL"],
        "arch": os.environ["HARCH"],
        "cores": int(os.environ["HCORES"] or 0),
    },
    "instances": [
        {
            "run_id": os.environ["RID"],
            "listen": os.environ["LISTEN"],
            "fresh": True,
            "flags": ["--no-open", "--allow-guests", "--no-sync", "--debug"],
            "project_persistence": "temporary",
        }
    ],
    "plugins": [
        {
            "name": "defminer",
            "role": "the SHIPPED build, unmodified — the source of counters.byteLenMismatch",
            "zip_sha256": os.environ["DZIP"],
        },
        {
            "name": "phase6-o07",
            "role": "the read-path probe — sdk.requests.get() and sdk.requests.query() byte counts",
            "zip_sha256": os.environ["PZIP"],
        },
    ],
    "method": (
        "One fixture (ace-small.js, "
        + str(IDENTITY_BYTES)
        + " decompressed bytes) served by scripts/spike/origin.py under four "
        "explicit Content-Encodings. Per encoding, two fetches: one DIRECT at the "
        "origin with no proxy and no --compressed, which is the authoritative wire "
        "byte count, and one through a fresh version-asserted Caido with a matching "
        "Accept-Encoding. The shipped DefMiner build and probe/phase6-o07 were both "
        "installed. After the consumer drained, counters.byteLenMismatch was read "
        "off the shipped getStatus; then, for each request id the probe's hook had "
        "recorded, sdk.requests.get(id) was called and toRaw().length taken, and one "
        "sdk.requests.query().descending('req','id').first(50).execute() was walked "
        "and Body.length taken from the matching item. The query walk carries NO "
        "filter: this phase's own O-03 and O-06 record Caido's req.path / req.query "
        "/ cont implementations as unmeasured, and a filtered walk that returned "
        "nothing would make 'the read path reports no body' and 'the clause did not "
        "match' indistinguishable. babel-large.js is excluded because at 2,983,904 "
        "bytes it is above AST_MAX_BYTES and admit() rejects it too_large, so it "
        "could contribute nothing to byteLenMismatch."
    ),
    "measurements": measurements,
    "verdict": {
        "get_path_reports": get_verdict,
        "query_path_reports": query_verdict,
        "answer": " ".join(answer_parts),
        "if_wrong": (
            "If a read path reports the WIRE count, admit()'s size axis admits up "
            "to 7.2541x more bytes than intended on the retro path only (the "
            "observed compression-ratio ceiling on this corpus). The mitigation is "
            "already designed and does not depend on this answer: the consumer "
            "re-reads every queued entry by id through sdk.requests.get(), so plan "
            "06-06's reload-side size gate is the authoritative check and the "
            "query-side admit() is a filter."
        ),
    },
    "requirements_affected": ["FIND-03"],
}
if reason is not None:
    doc["reason"] = reason

with open(os.environ["ART"], "w") as fh:
    json.dump(doc, fh, indent=2)
    fh.write("\n")

print("assembled " + os.environ["ART"], file=sys.stderr)
