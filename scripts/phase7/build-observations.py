#!/usr/bin/env python3
"""scripts/phase7/build-observations.py — the opportunistic findings, kept opportunistic.

RESEARCH Open Question 1 asks how long Caido keeps a request retrievable by
`sdk.requests.get`, and answers its own question with a recommendation: DO NOT
BLOCK ON IT. D-22/D-23's design — lazy detection, sticky outcome, tombstone
kept — is correct whatever the answer, so the measurement is worth one paragraph
in a probe that is already running and nothing more.

THIS FILE EXISTS TO STOP THAT PARAGRAPH BECOMING A POLICY.

An observation carries its OWN status from a vocabulary that has no `pass` in it
— `observed`, `inconclusive`, `not_run` — and the artifact schema REFUSES a
pass-shaped status outright. It also carries `not_a_policy` in words, because
the failure mode here is not a wrong number: it is a later reader citing a
two-point survival curve, taken once on one machine against a loopback listener,
as DefMiner's retention model.

A probe that could not run is `not_run` WITH ITS REASON, never a curve of zeros.
Zero survivors and zero attempts look identical in a chart and mean opposite
things.
"""

import argparse
import json
import os
import sys

QUESTION = (
    "How long does Caido keep a request retrievable by sdk.requests.get? "
    "The reload path can already return undefined at two distinct points "
    "milliseconds after admission (consumer.ts:530-542, reloadMissing / "
    "reloadNoResponse), and both are counted — but nothing measures whether "
    "Caido prunes STORED requests by age, by count, or not at all."
)

NOT_A_POLICY = (
    "THIS IS AN OBSERVATION AND NOT A RETENTION POLICY. It is a single "
    "opportunistic reading, taken on one machine, on one build, against a "
    "loopback listener this run started, over seconds rather than the hours or "
    "days a real project spans. D-22's tombstone design does not depend on it "
    "and this phase does not gate on it. Do not cite this row as DefMiner's "
    "retention model; if a decision needs one, measure it properly first."
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--raw", default="")
    ap.add_argument("--run-id", default="")
    ap.add_argument("--count", type=int, default=0)
    ap.add_argument("--wait-ms", type=int, default=0)
    a = ap.parse_args()

    payload = None
    if a.raw and os.path.isfile(a.raw) and os.path.getsize(a.raw):
        try:
            payload = json.load(open(a.raw))
        except Exception as exc:  # noqa: BLE001 — the parse failure IS the record
            payload = {"status": "inconclusive", "reason": "unparseable probe response: " + str(exc)[:200]}

    if payload is None:
        entry = {
            "id": "OQ-1-request-retention",
            "status": "not_run",
            "question": QUESTION,
            "finding": (
                "The retention probe produced no response on this run. Recorded as NOT RUN "
                "rather than as a curve of zeros: zero survivors and zero attempts look "
                "identical in a chart and mean opposite things."
            ),
            "not_a_policy": NOT_A_POLICY,
        }
    else:
        status = payload.get("status") or "inconclusive"
        if status not in ("observed", "inconclusive", "not_run"):
            status = "inconclusive"
        curve = payload.get("survival_curve") or []
        if status == "observed" and curve:
            first = curve[0]
            last = curve[-1]
            finding = (
                "Stored %d loopback request(s) through sdk.requests.send, then re-get each. "
                "%d of %d were retrievable IMMEDIATELY and %d of %d were still retrievable "
                "after %d ms. Nothing here says what happens over hours, across a project "
                "switch, or across a delete — those are the cases the question actually "
                "cares about and this reading does not reach them."
                % (
                    payload.get("stored", 0),
                    first.get("retrievable", 0),
                    payload.get("stored", 0),
                    last.get("retrievable", 0),
                    payload.get("stored", 0),
                    last.get("at_ms", 0),
                )
            )
        else:
            finding = (
                "No survival curve was produced. Reason as recorded by the probe: "
                + str(payload.get("reason") or "none given")
            )
        entry = {
            "id": "OQ-1-request-retention",
            "status": status,
            "question": QUESTION,
            "finding": finding,
            "not_a_policy": NOT_A_POLICY,
            "data": {
                "requested_count": a.count,
                "requested_wait_ms": a.wait_ms,
                "stored": payload.get("stored"),
                "send_errors": payload.get("send_errors"),
                "survival_curve": curve,
                "sdk_surface": payload.get("surface"),
                "probe_reason": payload.get("reason"),
            },
        }
        if a.run_id:
            entry["run_id"] = a.run_id

    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w") as fh:
        json.dump([entry], fh, indent=2)
        fh.write("\n")
    print("  observation OQ-1-request-retention: %s" % entry["status"], file=sys.stderr)


if __name__ == "__main__":
    main()
