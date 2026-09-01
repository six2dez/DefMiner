#!/usr/bin/env python3
"""scripts/phase7/record-point.py — turn one ladder point into evidence.

Copied in role from `scripts/spike/record-result.py`: the driver runs the
measurement, this file turns the raw probe response, the instance record and the
external RSS trace into ONE point object with a stable shape.

TWO THINGS THIS FILE EXISTS TO DO THAT THE DRIVER CANNOT DO IN BASH:

1.  CORRELATE THE RSS TRACE TO THE IN-RUNTIME MARKERS. Caido's QuickJS exposes
    no memory introspection whatsoever — no `llrt:qjs`, no `perf_hooks`, no
    `process`, no `gc()` — so `scripts/spike/rss-sampler.sh` sampling `ps` on the
    instance PID is the ONLY memory measurement that exists here. It is Caido's
    RSS plus the plugin's, which is why every figure below is a DELTA FROM A
    MARKER and never an absolute.

2.  KEEP THE STEP DELTAS HONEST ABOUT DIRECTION. RSS never falls in this runtime,
    so a NEGATIVE step is not a memory release — it is a correlation failure
    (a marker window with no sample in it, or a clock that drifted). It is
    recorded as-is rather than clamped to zero, because a clamped negative is
    indistinguishable from a real zero.
"""

import argparse
import bisect
import json
import os
import sys

# The five operation labels this probe declares. The artifact's `op_cost` is
# built from THIS list, so an operation that the probe stopped emitting shows up
# as a missing key rather than as a silently shorter object.
DECLARED_OPS = [
    "announce_scan",
    "b64_decode_atob",
    "b64_decode_buffer",
    "json_parse",
    "sources_materialise",
]


def relativise(value):
    """Strip this checkout's absolute prefix off a recorded path.

    THIS IS A CONTROL, NOT TIDINESS (threats T-00-14, T-07-20). The artifact
    ships in git, and `instance.sh` records `binary.path` as the ABSOLUTE
    `CAIDO_BIN` the driver handed it. Leaving that in would publish the
    operator's home directory in every point — and it would also blind the
    gate's home-path assertion, which is the tripwire for a run against the
    stale `~/.caido/caido-cli` 0.55.3. The path stays REAL and checkable, just
    repo-relative.
    """
    if not isinstance(value, str):
        return value
    root = os.getcwd().rstrip("/") + "/"
    return value[len(root):] if value.startswith(root) else value


def relativise_binary(block):
    if not isinstance(block, dict):
        return block
    out = dict(block)
    if "path" in out:
        out["path"] = relativise(out["path"])
    return out


def load_rss(path):
    """[(unix_ms, rss_bytes)], sorted. Empty when the sampler produced nothing."""
    if not path or not os.path.isfile(path):
        return []
    rows = []
    with open(path) as fh:
        next(fh, None)  # header
        for line in fh:
            parts = line.strip().split(",")
            if len(parts) < 2:
                continue
            try:
                rows.append((int(parts[0]), int(parts[1]) * 1024))
            except ValueError:
                continue
    rows.sort()
    return rows


def rss_at(rows, t):
    """The last sample at or before t. None when t precedes the trace."""
    if not rows:
        return None
    i = bisect.bisect_right([r[0] for r in rows], t)
    return rows[i - 1][1] if i > 0 else None


def rss_peak(rows, lo, hi):
    """The highest sample inside [lo, hi]. None when no sample lands there."""
    inside = [v for t, v in rows if lo <= t <= hi]
    return max(inside) if inside else None


def step_for(rows, mark):
    """One operation's RSS step, in bytes, plus the evidence for it."""
    start = mark.get("start_date")
    end = mark.get("end_date")
    if start is None or end is None:
        return {"bytes": None, "reason": "the mark carries no wall-clock window"}
    before = rss_at(rows, start)
    peak = rss_peak(rows, start, end)
    after = rss_at(rows, end)
    if before is None:
        return {"bytes": None, "reason": "no RSS sample at or before the mark start"}
    top = max(v for v in (peak, after) if v is not None) if (peak or after) else None
    if top is None:
        return {
            "bytes": None,
            # A sub-sample-interval operation is a real and common outcome at the
            # 50 ms sampler default, and saying so is more useful than a zero
            # that reads as "measured, no growth".
            "reason": "no RSS sample inside the mark window (operation shorter than the 50 ms sample interval)",
            "rss_before_bytes": before,
        }
    return {
        "bytes": top - before,
        "rss_before_bytes": before,
        "rss_peak_bytes": top,
        "reason": None,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--label", required=True)
    ap.add_argument("--fixture", required=True)
    ap.add_argument("--decoded", type=int, required=True)
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--call-rc", type=int, required=True)
    ap.add_argument("--alive", required=True)
    ap.add_argument("--result", default="")
    ap.add_argument("--instance", default="")
    ap.add_argument("--rss", default="")
    a = ap.parse_args()

    payload = None
    if a.result and os.path.isfile(a.result) and os.path.getsize(a.result):
        try:
            payload = json.load(open(a.result))
        except Exception as exc:  # noqa: BLE001 — the parse failure IS the record
            payload = {"_unparseable": str(exc)[:200]}

    instance = {}
    if a.instance and os.path.isfile(a.instance):
        instance = json.load(open(a.instance))

    rows = load_rss(a.rss)
    marks = {m["label"]: m for m in (payload or {}).get("ops", []) if isinstance(m, dict)}

    op_cost = {}
    rss_step = {}
    for name in DECLARED_OPS:
        m = marks.get(name)
        if m is None:
            continue
        op_cost[name] = round(float(m.get("elapsed_ms", 0.0)), 4)
        rss_step[name] = step_for(rows, m)

    point = {
        "label": a.label,
        "run_id": a.run_id,
        "fixture": relativise(a.fixture),
        "decoded_bytes": a.decoded,
        "decoded_bytes_observed": (payload or {}).get("decoded_bytes"),
        "payload_chars": (payload or {}).get("payload_chars"),
        "file_bytes": (payload or {}).get("input", {}).get("bytes"),
        "fixture_sha256": (payload or {}).get("input", {}).get("sha256"),
        "announcement": (payload or {}).get("announcement"),
        "map": (payload or {}).get("map"),
        "materialise": (payload or {}).get("materialise"),
        # THE PITFALL 4 EVIDENCE, promoted out of raw/ into the artifact itself.
        # Plans 07-02 and 07-03 cite the atob-vs-Buffer choice; a comparison that
        # lives only in a per-run raw file is a comparison nobody reads.
        "decode_agreement": (payload or {}).get("decode_agreement"),
        "op_cost": op_cost,
        "op_ok": {
            name: bool(marks[name].get("ok")) for name in DECLARED_OPS if name in marks
        },
        "op_err": {
            name: marks[name].get("err") for name in DECLARED_OPS if name in marks
        },
        "rss_step": rss_step,
        "rss_samples": len(rows),
        "rss_baseline_bytes": rows[0][1] if rows else None,
        "rss_peak_bytes": max((v for _, v in rows), default=None),
        "call_rc": a.call_rc,
        "host_alive_after": a.alive == "1",
        "exit_code": instance.get("exit_code"),
        "listen": instance.get("listen"),
        "fresh": instance.get("fresh", True),
        "flags": instance.get("flags", []),
        "data_path": instance.get("data_path"),
        "binary": relativise_binary(instance.get("binary")),
    }

    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    json.dump(point, open(a.out, "w"), indent=2)
    print(
        "  recorded %s: %s" % (a.label, ", ".join("%s=%.3fms" % (k, v) for k, v in op_cost.items())),
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
