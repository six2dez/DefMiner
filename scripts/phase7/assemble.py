#!/usr/bin/env python3
"""scripts/phase7/assemble.py — the D-10 probe artifact.

Reads the per-point evidence `record-point.py` wrote and produces
`.planning/phases/07-sourcemap-reconstruction/results/map-bytes.json`, the file
`packages/engine/src/thresholds.ts` cites as `MAP_MAX_BYTES`'s derivation and
`tests/phase7-mapbytes.spec.ts` gates.

THE ONE RULE THIS FILE FOLLOWS THROUGHOUT: derive, never choose. Every number in
the verdict is computed from the recorded points, and where the points do not
support a number the field is `null` with a `*_reason` beside it — never a
plausible figure. `pessimistic-default` exists in the Phase 0 confidence
vocabulary for exactly this reason: it marks a value nobody measured, and
folding it into LOW would erase the distinction a later reader needs.
"""

import argparse
import datetime
import glob
import json
import os
import platform
import subprocess
import sys

# --- The bounds this probe measures AGAINST, each imported as a fact ----------
#
# `MAX_SYNC_SLICE_MS = 25` (SPIKE-02, HIGH) — D-08 puts the inline decode+parse
# on the PROXY THREAD, and 25 ms is the measured slice budget a synchronous
# stretch may occupy before it is a stall rather than work.
MAX_SYNC_SLICE_MS = 25

# `PASSIVE_MAX_BYTES = 8_388_608` — admit()'s ceiling in DECOMPRESSED identity
# bytes. Base64 expands 4:3, so an INLINE map's decoded JSON can never exceed
# floor(8_388_608 * 3/4). This is a STRUCTURAL ceiling: not a preference, a
# consequence of two shipped constants.
PASSIVE_MAX_BYTES = 8_388_608
STRUCTURAL_CEILING = (PASSIVE_MAX_BYTES * 3) // 4  # 6_291_456

# The RSS ceiling `thresholds.spec.ts` already asserts PASSIVE_MAX_BYTES against:
# a ceiling-sized artifact must project under 1 GiB of peak RSS inside caido-cli,
# because Caido's QuickJS sets NO memory limit and runs under `panic = "abort"` —
# an OOM is a host kill that takes the operator's project data with it.
RSS_CEILING_BYTES = 1073741824

# The operations that make up the INLINE PATH — the stretch D-08 places on the
# proxy thread. `sources_materialise` is measured but is NOT in this sum: D-05
# materialises derived sources on the consumer path, not in the hook.
INLINE_PATH_OPS = ["announce_scan", "b64_decode_buffer", "json_parse"]

DECLARED_OPS = [
    "announce_scan",
    "b64_decode_atob",
    "b64_decode_buffer",
    "json_parse",
    "sources_materialise",
]

MB = 1048576.0


def slope_through_origin(pairs):
    """Least-squares slope of y = m*x forced through the origin.

    Forced through the origin deliberately: a fitted intercept on four points
    would absorb a real fixed cost into a number nobody can interpret, and the
    quantity this probe needs is a RATE. Returns None on fewer than two points —
    a slope from one point is the point, restated.
    """
    pairs = [(x, y) for x, y in pairs if x and y is not None]
    if len(pairs) < 2:
        return None
    num = sum(x * y for x, y in pairs)
    den = sum(x * x for x, _ in pairs)
    return (num / den) if den else None


def host():
    try:
        cores = os.cpu_count()
    except Exception:  # noqa: BLE001
        cores = None
    return {
        "os": platform.system().lower(),
        "release": platform.release(),
        "arch": platform.machine(),
        "cores": cores,
    }


def sha256_of(path):
    try:
        out = subprocess.run(
            ["shasum", "-a", "256", path], capture_output=True, text=True, timeout=120
        )
        return out.stdout.split()[0] if out.stdout else None
    except Exception:  # noqa: BLE001
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--points", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--expected-version", required=True)
    ap.add_argument("--binary", required=True)
    ap.add_argument("--reported-version", required=True)
    ap.add_argument("--observations", default="")
    a = ap.parse_args()

    files = sorted(glob.glob(os.path.join(a.points, "*.json")))
    points = [json.load(open(f)) for f in files]
    points.sort(key=lambda p: p.get("decoded_bytes") or 0)
    if not points:
        sys.exit("assemble: no points under %s — run scripts/phase7/map-bytes.sh" % a.points)

    # --- run_id UNIQUENESS, asserted HERE as well as in the gate -------------
    # The gate is the control that ships; this is the one that stops a
    # contaminated artifact being written in the first place. Two points sharing
    # a run_id means they shared an instance, and RSS is a high-water mark that
    # never falls — every point after the first would be meaningless.
    rids = [p.get("run_id") for p in points]
    if len(set(rids)) != len(rids):
        sys.exit(
            "assemble: run_id collision across ladder points (%s). One FRESH "
            "INSTANCE PER POINT is non-negotiable — see scripts/spike/ladder.sh:12-19."
            % ", ".join(sorted(rids))
        )

    # --- The measurement rows -------------------------------------------------
    measurements = []
    for p in points:
        for op in DECLARED_OPS:
            if op in p.get("op_cost", {}):
                measurements.append(
                    {
                        "name": op,
                        "primitive": op,
                        "variant": p["label"],
                        "value": p["op_cost"][op],
                        "unit": "ms",
                        "stat": "point",
                        "n": 1,
                        "valid": bool(p.get("op_ok", {}).get(op, True)),
                        "notes": "decoded_bytes=%d run_id=%s" % (p["decoded_bytes"], p["run_id"]),
                    }
                )
        step = (p.get("rss_step") or {}).get("json_parse") or {}
        measurements.append(
            {
                "name": "rss_step_json_parse",
                "primitive": "rss_step",
                "variant": p["label"],
                "value": step.get("bytes"),
                "unit": "bytes",
                "stat": "point",
                "n": 1,
                "valid": step.get("bytes") is not None,
                "notes": step.get("reason") or "delta from the mark-start sample",
            }
        )

    # --- The inline-path rate, and the stall bound it implies -----------------
    def inline_ms(p):
        costs = p.get("op_cost", {})
        if not all(op in costs for op in INLINE_PATH_OPS):
            return None
        return sum(costs[op] for op in INLINE_PATH_OPS)

    inline_pairs = [(p["decoded_bytes"] / MB, inline_ms(p)) for p in points]
    inline_ms_per_mb = slope_through_origin(inline_pairs)

    op_rates = {}
    for op in DECLARED_OPS:
        rate = slope_through_origin(
            [(p["decoded_bytes"] / MB, p.get("op_cost", {}).get(op)) for p in points]
        )
        if rate is not None:
            op_rates[op] = round(rate, 4)

    worst_inline = max((v for _, v in inline_pairs if v is not None), default=None)
    top_point = points[-1]["decoded_bytes"]

    if inline_ms_per_mb is None:
        stall_bound = None
        stall_reason = (
            "fewer than two ladder points carry the full inline-path operation set, "
            "so no rate can be fitted. Re-run the full ladder."
        )
    elif inline_ms_per_mb <= 0:
        stall_bound = None
        stall_reason = "the fitted inline-path rate is non-positive, which is a correlation failure rather than a measurement"
    else:
        stall_bound = int((MAX_SYNC_SLICE_MS / inline_ms_per_mb) * MB)
        stall_reason = None

    # --- The RSS bound --------------------------------------------------------
    rss_pairs = []
    for p in points:
        steps = [
            (p.get("rss_step") or {}).get(op, {}).get("bytes")
            for op in DECLARED_OPS
            if op in (p.get("rss_step") or {})
        ]
        observed = [s for s in steps if s is not None and s > 0]
        if observed:
            rss_pairs.append((p["decoded_bytes"], sum(observed)))
    rss_bytes_per_byte = slope_through_origin([(float(x), float(y)) for x, y in rss_pairs])
    if rss_bytes_per_byte and rss_bytes_per_byte > 0:
        rss_bound = int(RSS_CEILING_BYTES / rss_bytes_per_byte)
        rss_reason = None
    else:
        rss_bound = None
        rss_reason = (
            "the external RSS sampler recorded no positive step it could attribute to a "
            "measured operation at two or more points. At the sampler's 50 ms default an "
            "operation shorter than one interval leaves no sample inside its window; that "
            "is a real outcome and is recorded as unmeasured rather than as zero growth."
        )

    candidates = [("structural_ceiling", STRUCTURAL_CEILING)]
    if stall_bound is not None:
        candidates.append(("measured_stall_bound", stall_bound))
    if rss_bound is not None:
        candidates.append(("measured_rss_bound", rss_bound))
    binding_name, map_max_bytes = min(candidates, key=lambda c: c[1])
    binding = binding_name != "structural_ceiling"

    full_ladder = len(points) >= 4
    all_alive = all(p.get("host_alive_after") for p in points)
    all_parsed = all(p.get("op_ok", {}).get("json_parse", False) for p in points)

    if not all_alive or not all_parsed:
        status = "fail"
    elif full_ladder and (stall_bound is not None):
        status = "pass"
    else:
        status = "inconclusive"

    confidence = "HIGH" if status == "pass" else ("LOW" if points else "pessimistic-default")

    if binding:
        answer = (
            "MAP_MAX_BYTES = %d bytes, and the bound is BINDING: it is the %s, below the "
            "structural ceiling of %d = floor(PASSIVE_MAX_BYTES * 3/4). The inline path "
            "(announce_scan + b64_decode_buffer + json_parse) was measured at %s ms/MB "
            "across %d ladder point(s) topping out at %d decoded bytes; the worst single "
            "point cost %s ms against MAX_SYNC_SLICE_MS = %d."
            % (
                map_max_bytes,
                binding_name.replace("_", " "),
                STRUCTURAL_CEILING,
                ("%.3f" % inline_ms_per_mb) if inline_ms_per_mb else "un-fitted",
                len(points),
                top_point,
                ("%.3f" % worst_inline) if worst_inline is not None else "unmeasured",
                MAX_SYNC_SLICE_MS,
            )
        )
    else:
        answer = (
            "MAP_MAX_BYTES = %d bytes — the STRUCTURAL CEILING, floor(PASSIVE_MAX_BYTES * 3/4). "
            "MEASURED TO BE NON-BINDING, which is a legitimate outcome and is NOT 'not measured': "
            "the inline path (announce_scan + b64_decode_buffer + json_parse) was measured at "
            "%s ms/MB across %d ladder point(s) topping out at %d decoded bytes, the worst single "
            "point cost %s ms against MAX_SYNC_SLICE_MS = %d, and the implied stall bound is %s — "
            "at or above the ceiling. The RSS bound is %s."
            % (
                map_max_bytes,
                ("%.3f" % inline_ms_per_mb) if inline_ms_per_mb else "un-fitted",
                len(points),
                top_point,
                ("%.3f" % worst_inline) if worst_inline is not None else "unmeasured",
                MAX_SYNC_SLICE_MS,
                ("%d bytes" % stall_bound) if stall_bound is not None else "unfitted (" + (stall_reason or "") + ")",
                ("%d bytes" % rss_bound) if rss_bound is not None else "unmeasured (" + (rss_reason or "") + ")",
            )
        )

    if_wrong = (
        "RESEARCH § O-03's two outcomes, and both are shippable. IF MAP_MAX_BYTES LANDS FAR "
        "BELOW the 6,291,456-byte structural ceiling: D-08's always-on placement is still "
        "correct, but the phase recovers source from a MINORITY of inline maps and the UI must "
        "SAY SO rather than appear to have found nothing — a silent floor reads to the operator "
        "as an empty result. IF IT LANDS AT THE CEILING: the bound is non-binding and the D-02 "
        "tail window is the full base64 span, which is what SOURCEMAP_TAIL_WINDOW_BYTES's "
        "ceil-4/3 derivation already produces. The outcome that is not shippable is not "
        "measuring: reusing AST_MAX_BYTES (a meriyah stall at 785.8 ms/MB, a different cost "
        "curve and a different allocator profile) or RSS_BYTES_PER_INPUT_BYTE (scoped verbatim "
        "to 'the parse operation', at MEDIUM confidence) is the 'reasoned, not measured' move "
        "D-10 forbids."
    )

    o_04 = (
        "MAP-02's parenthetical — 781 sources from a 12.66 MB map in 21 ms — is REAL but was "
        "NOT measured in Caido. .planning/research/STACK.md:546 names the harness: standalone "
        "quickjs-ng 0.16.1 (Homebrew, arm64) via `qjs --stack-size 65536 --memory-limit "
        "4194304`. That is a materially different runtime from Caido's embedded QuickJS — the "
        "one operation measured both ways, meriyah parse, ran ~1.27x slower inside Caido (620 "
        "ms/MB standalone vs 785.8 ms/MB measured) — and that ratio is a single-operation "
        "observation which must NOT be used to project JSON.parse. SEPARATELY, THE CASE CANNOT "
        "ARISE ON THE INLINE PATH AT ALL: 12.66 MB of map JSON base64-encodes to roughly 16.9 "
        "MB, which admit() refuses as too_large against PASSIVE_MAX_BYTES = 8,388,608 by more "
        "than 2x. Monaco's map is in any case announced EXTERNALLY, 67 bytes from EOF, which "
        "under D-01 is a D-03 counter increment and nothing else."
    )

    doc = {
        "$schema": "./map-bytes.schema.json",
        # NOT a `SPIKE-NN` id, and the schema forbids that shape outright. Phase
        # 0's results directory holds the threshold artifacts every later phase
        # budgets against, and tests/spike-results.spec.ts globs
        # /^SPIKE-\d\d[a-z]?\.json$/ there while pinning 0.57.1. An artifact that
        # could be mistaken for one of those is an artifact that gets read as one.
        "spike": "MAP-BYTES",
        "status": status,
        "recorded_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "binary": {
            "path": a.binary,
            "expected_version": a.expected_version,
            "reported_version": a.reported_version,
            "sha256": sha256_of(a.binary),
        },
        "host": host(),
        "instances": [
            {
                "run_id": p["run_id"],
                "listen": p.get("listen") or "unknown",
                "data_path": p.get("data_path"),
                "fresh": bool(p.get("fresh", True)),
                "flags": p.get("flags", []),
                "exit_code": p.get("exit_code"),
            }
            for p in points
        ],
        "method": (
            "Reproduces SPIKE-06's method clause by clause, with the operation set Phase 7 "
            "needs and Phase 0 does not have. One FRESH version-asserted Caido "
            + a.expected_version
            + " instance PER SIZE POINT, launched from the in-repo sha512-verified "
            ".caido-bin binary on a port from the free 8941-8945 block with 8080 refused "
            "unconditionally. scripts/spike/rss-sampler.sh attached UNMODIFIED at its 0.05 "
            "default to that instance's PID, emitting unix-millisecond timestamps correlated "
            "against the probe's own Date.now() MARK_START/MARK_END lines. Operation order is "
            "FIXED and heaviest last, because RSS never falls in this runtime and each step "
            "delta is only meaningful as an increment on what came before. Input is read from "
            "DISK, not through the proxy, so proxy variance does not enter a parse-cost "
            "measurement. Each fixture is a REAL vendor sourcemap (SHA-256-pinned in "
            "scripts/phase7/fetch-maps.sh) wrapped as an inline-map JS body sized to EXACTLY "
            "the ladder point's decoded byte count — real rather than generated because "
            "JSON.parse cost depends on the string-vs-structure ratio and a map is ~90% long "
            "string literals in sourcesContent."
        ),
        "measurements": measurements,
        "points": points,
        "derivation": {
            "inline_path_ops": INLINE_PATH_OPS,
            "inline_path_ms_per_mb": round(inline_ms_per_mb, 4) if inline_ms_per_mb else None,
            "op_ms_per_mb": op_rates,
            "worst_point_inline_ms": round(worst_inline, 4) if worst_inline is not None else None,
            "max_sync_slice_ms": MAX_SYNC_SLICE_MS,
            "passive_max_bytes": PASSIVE_MAX_BYTES,
            "structural_ceiling_bytes": STRUCTURAL_CEILING,
            "structural_ceiling_rule": "floor(PASSIVE_MAX_BYTES * 3 / 4) — base64 expands 4:3, so an inline map's decoded JSON cannot exceed this and the ladder tops out AT it rather than above it",
            "measured_stall_bound_bytes": stall_bound,
            "measured_stall_bound_reason": stall_reason,
            "measured_rss_bound_bytes": rss_bound,
            "measured_rss_bound_reason": rss_reason,
            "rss_bytes_per_decoded_byte": round(rss_bytes_per_byte, 4) if rss_bytes_per_byte else None,
            "rss_ceiling_bytes": RSS_CEILING_BYTES,
            "binding_term": binding_name,
            "ladder_points": len(points),
            "ladder_complete": full_ladder,
        },
        "verdict": {
            "answer": answer,
            "confidence": confidence,
            "if_wrong": if_wrong,
            "map_max_bytes": map_max_bytes,
            "binding": binding,
            "o_04_map02_parenthetical": o_04,
        },
        "requirements_affected": ["MAP-01", "MAP-02", "MAP-05"],
    }

    if a.observations and os.path.isfile(a.observations):
        doc["observations"] = json.load(open(a.observations))

    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w") as fh:
        json.dump(doc, fh, indent=2)
        fh.write("\n")
    print(
        "  MAP_MAX_BYTES=%d binding=%s status=%s points=%d"
        % (map_max_bytes, binding, status, len(points)),
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
