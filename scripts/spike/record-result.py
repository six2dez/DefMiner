#!/usr/bin/env python3
"""Assemble a spike-result.schema.json-shaped result file.

Reads the measurement body from stdin, merges in the binary / host / instances
blocks from each contributing run's instance.json, and writes
results/SPIKE-NN.json.

    echo '{"method": "...", "measurements": [...], "verdict": {...},
           "requirements_affected": ["SPIKE-07"]}' \
      | python3 scripts/spike/record-result.py --spike SPIKE-07 --status pass \
          --run 20260820T1200Z-1234

HARD FAIL, by design: if ANY contributing run reports a binary version other
than the one it expected, this exits non-zero rather than recording a number
measured against the wrong build. The stale 0.55.3 that owns PATH on this
machine is the exact reason this check exists (threat T-00-18).
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import platform
import subprocess
import sys

RESULTS = os.environ.get(
    "OUT", ".planning/phases/00-runtime-reality-check/results"
)


def _utcnow() -> str:
    return datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _sh(cmd: list[str]) -> str | None:
    try:
        return subprocess.run(
            cmd, capture_output=True, text=True, timeout=10
        ).stdout.strip() or None
    except Exception:
        return None


def host_block() -> dict:
    ram = _sh(["sysctl", "-n", "hw.memsize"])
    try:
        load1 = os.getloadavg()[0]
    except OSError:
        load1 = None
    return {
        "os": platform.system().lower(),
        "release": platform.release(),
        "arch": platform.machine(),
        "cpu": _sh(["sysctl", "-n", "machdep.cpu.brand_string"]) or platform.processor(),
        "cores": os.cpu_count(),
        "ram_gb": round(int(ram) / (1024**3), 1) if ram and ram.isdigit() else None,
        "loadavg_1m": round(load1, 2) if load1 is not None else None,
    }


def load_run(run_id: str) -> dict:
    path = os.path.join(RESULTS, "runs", run_id, "instance.json")
    if not os.path.isfile(path):
        sys.exit(f"record-result: no instance.json for run {run_id} at {path}")
    with open(path) as fh:
        return json.load(fh)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--spike", required=True)
    ap.add_argument("--status", required=True,
                    choices=["pass", "fail", "inconclusive", "blocked"])
    ap.add_argument("--run", action="append", required=True, dest="runs",
                    help="contributing RUN_ID (repeatable)")
    ap.add_argument("--duration-s", type=float, default=None)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    try:
        body = json.load(sys.stdin)
    except Exception as exc:  # noqa: BLE001
        sys.exit(f"record-result: measurement body on stdin is not valid JSON: {exc}")

    runs = [load_run(r) for r in args.runs]

    # ---- the version gate -------------------------------------------------
    mismatched = [
        (r["run_id"], r["binary"]["expected_version"], r["binary"]["reported_version"])
        for r in runs
        if r["binary"]["reported_version"] != r["binary"]["expected_version"]
    ]
    if mismatched:
        for run_id, want, got in mismatched:
            print(
                f"FATAL: run {run_id} measured binary {got}, expected {want}.",
                file=sys.stderr,
            )
        print(
            "       Refusing to record a measurement from the wrong build. "
            "Status would be `blocked`; re-run against the app-bundle binary.",
            file=sys.stderr,
        )
        return 1

    # Every contributing run must agree on which binary was under test, or the
    # result is a blend of two builds and means nothing.
    versions = {r["binary"]["reported_version"] for r in runs}
    if len(versions) > 1:
        print(
            f"FATAL: contributing runs disagree on binary version: {sorted(versions)}",
            file=sys.stderr,
        )
        return 1

    instances = [
        {
            "run_id": r["run_id"],
            "data_path": r.get("data_path"),
            "listen": r.get("listen", f"127.0.0.1:{r.get('port')}"),
            "fresh": r.get("fresh", True),
            "flags": r.get("flags", []),
            "exit_code": r.get("exit_code"),
            # Carried through from instance.json when the run recorded it.
            # SPIKE-04 needs it because a guest instance can hold only TEMPORARY
            # projects, so "the abort dropped the project" is a claim about a
            # temporary one and the persistent case is genuinely out of scope.
            # null means the run did not record it, which the schema permits.
            "project_persistence": r.get("project_persistence"),
        }
        for r in runs
    ]
    # run_id uniqueness across the array is what proves no two measurements
    # shared a runtime. Plans 00-02 and 00-04 assert it; catch it at write time.
    ids = [i["run_id"] for i in instances]
    if len(ids) != len(set(ids)):
        print(f"FATAL: duplicate run_id in instances: {ids}", file=sys.stderr)
        return 1

    result = {
        "$schema": "./spike-result.schema.json",
        "spike": args.spike,
        "status": args.status,
        "recorded_at": _utcnow(),
        "duration_s": args.duration_s,
        "run_ids": ids,
        "binary": runs[0]["binary"],
        "host": host_block(),
        "instances": instances,
    }
    # Body wins for everything it supplies except the blocks assembled above.
    for key, value in body.items():
        if key in ("binary", "host", "instances", "spike", "status"):
            print(f"record-result: ignoring caller-supplied `{key}` (assembled here)",
                  file=sys.stderr)
            continue
        result[key] = value

    for required in ("method", "measurements", "verdict", "requirements_affected"):
        if required not in result:
            sys.exit(f"record-result: measurement body is missing `{required}`")

    out = args.out or os.path.join(RESULTS, f"{args.spike}.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as fh:
        json.dump(result, fh, indent=2)
        fh.write("\n")
    print(f"wrote {out} (status={args.status}, runs={','.join(ids)})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
