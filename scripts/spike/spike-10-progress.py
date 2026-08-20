#!/usr/bin/env python3
"""Write results/SPIKE-10-progress.json — a PROGRESS artifact, not the answer.

SPIKE-10's answer is plan 00-04's output and lives in results/SPIKE-10.json.
This file exists so that wave 2 can see the recorder is collecting, and so the
cross-day estimate's stabilisation can be tracked day over day.

Deliberately NOT named SPIKE-10.json: it must not be picked up by the
`SPIKE-NN.json` result gates, because it is not a spike result and does not
carry a verdict.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import datetime

RESULTS = ".planning/phases/00-runtime-reality-check/results"
STATE = ".spike/recorder.state"


def main() -> int:
    rates = json.loads(subprocess.run(
        [sys.executable, "scripts/spike/cache-rate.py", "--json"],
        capture_output=True, text=True, check=True).stdout)

    state = {}
    if os.path.isfile(STATE):
        for line in open(STATE):
            if "=" in line:
                k, v = line.strip().split("=", 1)
                state[k] = v.strip().strip('"')

    run_id = state.get("RECORDER_RUN_ID", "")
    inst_path = os.path.join(RESULTS, "runs", run_id, "instance.json")
    instance = json.load(open(inst_path)) if os.path.isfile(inst_path) else {}

    doc = {
        "spike": "SPIKE-10",
        "artifact": "progress",
        "provisional": True,
        "generated_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "question": "What is the content-hash cache hit rate on real browsing?",
        "why_wall_clock_bound": (
            "The number that matters is the CROSS-DAY rate, which is a property of "
            "how sites version and re-serve their bundles across deploys. It cannot "
            "be synthesised from a scripted burst and cannot be produced on demand "
            "at the end of the phase. That is why the recorder ships in wave 1 and "
            "is merely READ in plan 00-04."
        ),
        "recorder": {
            "run_id": run_id,
            "listen": instance.get("listen"),
            "data_path": instance.get("data_path"),
            "binary": instance.get("binary", {}),
            "long_lived": True,
            "disposable": False,
            "note": (
                "The one instance in this phase that is deliberately NOT disposable. "
                "Guest-enabled and therefore bound to 127.0.0.1 only, permanently."
            ),
            "db": rates.get("db"),
        },
        "rows": rates.get("rows", 0),
        "distinct_hashes": rates.get("distinct_hashes"),
        "distinct_days": rates.get("distinct_days", 0),
        "days": rates.get("days", []),
        "sessions": rates.get("sessions"),
        "total_bytes": rates.get("total_bytes"),
        "rates": {
            "within_page": rates.get("within_page"),
            "within_session": rates.get("within_session"),
            "cross_day": rates.get("cross_day"),
            "cross_day_denominator": rates.get("cross_day_denominator"),
            "cross_day_undefined_reason": rates.get("cross_day_undefined_reason"),
        },
        "per_day": rates.get("per_day", []),
        "stabilised": rates.get("stabilised", False),
        "cross_day_last_delta": rates.get("cross_day_last_delta"),
        "collection": {
            "mode": "scripted",
            "sites_file": "scripts/spike/sites.json",
            "passes_per_session": 2,
            "launch_agent": "com.defminer.spike.recorder",
            "schedule": "twice daily (10:30, 18:30 local)",
            "live_mode_available": (
                "The operator may additionally point their real browser at "
                "127.0.0.1:8998 for a normal work session. Higher realism, lower "
                "reproducibility. Entirely their choice; the scripted sessions run "
                "unattended regardless."
            ),
        },
        "provisional_note": (
            "PROVISIONAL. The cross-day figure here is computed from whatever has "
            "accumulated so far and MUST be re-read by plan 00-04, which owns "
            "results/SPIKE-10.json. If cross_day_denominator is 0 the cross-day rate "
            "is UNDEFINED, not zero — plan 00-04 routes that to its inconclusive "
            "branch. Do not import this file as a threshold source."
        ),
        "privacy": (
            "cache_log stores only {ts, url, sha256, bytes, content_type, status}. "
            "No bodies, no headers, no cookies, no auth material. .spike/ is "
            "gitignored, so neither the database nor any recorded URL enters git."
        ),
    }

    os.makedirs(RESULTS, exist_ok=True)
    out = os.path.join(RESULTS, "SPIKE-10-progress.json")
    with open(out, "w") as fh:
        json.dump(doc, fh, indent=2)
        fh.write("\n")
    print(f"wrote {out} (rows={doc['rows']}, days={doc['distinct_days']}, "
          f"cross_day={doc['rates']['cross_day']}, "
          f"denominator={doc['rates']['cross_day_denominator']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
