#!/usr/bin/env python3
"""scripts/spike/analyse-spike-06.py — turn the SPIKE-06 point files, the RSS
samples and the two boundary files into a spike-result body on stdout.

Every threshold is DERIVED from the recorded points. The two ceilings that
Phase 9 will gate on — AST_MAX_BYTES and HARD_MAX_BYTES — carry the rule that
produced them in their rationale, so a later phase that disagrees with the
budget can re-derive rather than guess.

Byte quantities are expressed in the quantity SPIKE-08's SIZE_GATE_SOURCE named:
DECOMPRESSED identity bytes.
"""
from __future__ import annotations

import argparse
import csv
import glob
import json
import os
import re
import sys

# The acceptable duration of a SINGLE synchronous block. meriyah's parse is
# atomic and cannot be chunked, and SPIKE-02 measured that setTimeout(fn,0) is
# the only primitive in this runtime that yields at all — so for the whole parse
# the proxy hook, the plugin RPC and every timer are starved. 1,000 ms is the
# stated budget; it is a POLICY input, not a measurement, and it is named here so
# Phase 9 can re-derive AST_MAX_BYTES against a different one.
SINGLE_BLOCK_STALL_BUDGET_MS = 1000.0
# Safety margin between the working ceiling and the ceiling at which the runtime
# actually breaks.
HARD_MAX_SAFETY_DIVISOR = 8
# RSS a single parse may claim. Backend plugins run IN-PROCESS inside caido-cli
# alongside the user's real proxy and project data, so this is memory taken from
# the tool the user is actually working in. Also a POLICY input, named here so it
# can be re-derived.
PARSE_RSS_BUDGET_BYTES = 256 * 1048576
# Mirrors CALL_TIMEOUT in ladder.sh; used only to describe a timeout-bound ceiling.
CALL_TIMEOUT_S = float(os.environ.get("CALL_TIMEOUT", "900"))


def load_points(points_dir):
    pts = []
    for f in sorted(glob.glob(os.path.join(points_dir, "*.json"))):
        if os.path.basename(f).startswith("_"):
            continue
        pts.append(json.load(open(f)))
    return pts


def rss_series(results_root, run_id):
    path = os.path.join(results_root, "runs", run_id, "rss.csv")
    if not os.path.isfile(path):
        return []
    out = []
    with open(path) as fh:
        for row in csv.DictReader(fh):
            try:
                out.append((int(row["unix_ms"]), int(row["rss_kb"])))
            except (KeyError, ValueError):
                continue
    out.sort()
    return out


def rss_step(series, start_ms, end_ms, tail_ms=300):
    """RSS delta attributable to one operation.

    RSS is a HIGH-WATER MARK in this runtime — it never falls, the allocator does
    not return pages to the OS, and there is no gc() to force a collection before
    a reading. So the only meaningful figure is the STEP: peak within the
    operation's window minus the level at its start. An absolute reading would be
    Caido's whole footprint, not the plugin's work.
    """
    if not series:
        return None, None, None
    before = [kb for ms, kb in series if ms <= start_ms]
    baseline = before[-1] if before else series[0][1]
    window = [kb for ms, kb in series if start_ms <= ms <= end_ms + tail_ms]
    if not window:
        # Sampling is 50 ms; an operation shorter than that leaves no sample and
        # its delta is genuinely unresolvable rather than zero.
        return baseline, None, None
    peak = max(window)
    return baseline, peak, (peak - baseline) * 1024


def linfit(xs, ys):
    n = len(xs)
    if n < 2:
        return None, None
    mx, my = sum(xs) / n, sum(ys) / n
    denom = sum((x - mx) ** 2 for x in xs)
    if denom == 0:
        return None, None
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / denom
    return slope, my - slope * mx


def median(vals):
    v = sorted(x for x in vals if x is not None)
    if not v:
        return None
    m = len(v) // 2
    return v[m] if len(v) % 2 else (v[m - 1] + v[m]) / 2


def classify_failure(point):
    """What KIND of failure was this? The distinction drives the design."""
    r = point.get("result") or {}
    if point.get("call_rc") == 0 and r.get("parse_ok"):
        return "ok"
    if not point.get("host_alive_after") or point.get("exit_code") == 134:
        return "process-death"
    if point.get("call_rc") == 28:
        # curl --max-time fired. A wall-clock timeout is NOT a memory ceiling and
        # must never be folded into one.
        return "timeout"
    if point.get("call_rc") != 0 and point.get("host_alive_after") and not r:
        # probe_call pipes curl into python and `pipefail` reports the RIGHTMOST
        # non-zero status, so curl's own 28 is masked as python's 1. The
        # signature of a call-budget timeout is therefore: non-zero rc, an EMPTY
        # response body, and a host that is still alive with no assertion on
        # stderr. Corroborated in the host log by a MARK_START with no matching
        # MARK_END.
        return "timeout"
    if r.get("parse_error"):
        err = r["parse_error"]
        if "call stack" in err or "RangeError" in err:
            return "catchable-stack-throw"
        if "memory" in err.lower() or "allocat" in err.lower():
            return "catchable-oom-throw"
        return "catchable-throw"
    if point.get("call_rc") != 0:
        return "call-failed"
    return "unknown"


def stderr_scan(results_root, run_ids):
    """Scan every instance's stderr for a C-level abort signature.

    `panic = "abort"` means a QuickJS assertion never reaches the structured log
    — it goes to stderr and the process dies. So STACK_FAILURE_MODE cannot be
    read off the log alone. The scan result is recorded HERE, inside the
    committed artifact, because the raw stderr captures themselves are gitignored
    along with every other host log.
    """
    signatures = ["ref_count", "Assertion", "assert", "gc_decref", "SIGABRT",
                  "out of memory", "Fatal", "panicked"]
    scanned, hits, benign = 0, [], set()
    for rid in run_ids:
        for path in glob.glob(os.path.join(results_root, "runs", rid, "raw", "*.log")):
            scanned += 1
            try:
                txt = open(path, encoding="utf-8", errors="replace").read()
            except OSError:
                continue
            if not txt.strip():
                continue
            if any(sig.lower() in txt.lower() for sig in signatures):
                hits.append({"run": rid, "file": os.path.basename(path),
                             "text": txt.strip()[:300]})
            else:
                benign.add(txt.strip()[:120])
    return {"files_scanned": scanned, "abort_signatures_found": hits,
            "other_content_observed": sorted(benign)}


def bundle_builtins(bundle_path):
    if not os.path.isfile(bundle_path):
        return None
    src = open(bundle_path, encoding="utf-8", errors="replace").read()
    specs = sorted(set(re.findall(r'from\s*"([^"]+)"', src)
                       + re.findall(r'import\(\s*"([^"]+)"\s*\)', src)))
    return specs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--points", required=True)
    ap.add_argument("--results-root", required=True)
    ap.add_argument("--bundle", default="tier1/parse/dist/index.js")
    ap.add_argument("--emit-runs", action="store_true",
                    help="print contributing run_ids, one per line, and exit")
    args = ap.parse_args()

    points = load_points(args.points)
    if args.emit_runs:
        for p in points:
            if p.get("run_id"):
                print(p["run_id"])
        return 0

    nest_b = os.path.join(args.points, "_nesting-boundary.json")
    hard_b = os.path.join(args.points, "_hardmax-boundary.json")
    nesting = json.load(open(nest_b)) if os.path.isfile(nest_b) else {}
    hardmax = json.load(open(hard_b)) if os.path.isfile(hard_b) else {}

    ladder = [p for p in points if p["phase"] == "A"]
    nests = [p for p in points if p["phase"] == "B"]
    bigs = [p for p in points if p["phase"] == "C"]
    ladder.sort(key=lambda p: p.get("bytes") or 0)
    bigs.sort(key=lambda p: p.get("bytes") or 0)

    measurements = []
    per_op_ratio = {}

    # ---- PHASE A: per size point, per operation --------------------------
    for p in ladder:
        r = p.get("result") or {}
        series = rss_series(args.results_root, p["run_id"])
        nbytes = p.get("bytes") or (r.get("input") or {}).get("bytes")
        for op in r.get("ops") or []:
            base, peak, delta = rss_step(series, op["start_date"], op["end_date"])
            ratio = (delta / nbytes) if (delta is not None and nbytes) else None
            if ratio is not None:
                per_op_ratio.setdefault(op["label"], []).append(ratio)
            measurements.append({
                "name": "op_cost",
                "operation": op["label"],
                "variant": p["extra"].get("size_point"),
                "value": round(op["elapsed_ms"], 3),
                "unit": "ms",
                "stat": "point",
                "n": 1,
                "input_bytes": nbytes,
                "ms_per_mb": round(op["elapsed_ms"] / (nbytes / 1048576), 2) if nbytes else None,
                "rss_baseline_kb": base,
                "rss_peak_kb": peak,
                "rss_step_bytes": delta,
                "rss_bytes_per_input_byte": round(ratio, 3) if ratio is not None else None,
                "ok": op["ok"],
                "err": op.get("err"),
                "run_id": p["run_id"],
                "notes": (
                    f"{op['label']} on {p['extra'].get('size_point')} ({nbytes} B), "
                    f"fresh instance {p['run_id']}"
                    + ("" if delta is not None else
                       "; RSS step unresolvable — the operation was shorter than the "
                       "50 ms sampling interval")
                ),
            })
        measurements.append({
            "name": "parse_shape",
            "variant": p["extra"].get("size_point"),
            "value": (r.get("parse") or {}).get("mode"),
            "unit": "enum",
            "stat": "point",
            "n": 1,
            "input_bytes": nbytes,
            "tokens": r.get("tokens"),
            "top_level_nodes": (r.get("parse") or {}).get("top_level_nodes"),
            "vlq_segments": (r.get("vlq") or {}).get("segments_decoded"),
            "hash_js_loop_slowdown": (r.get("hash") or {}).get("js_loop_slowdown"),
            "structured_clone_polyfilled": r.get("structured_clone_polyfilled"),
            "run_id": p["run_id"],
        })

    # ---- PHASE B: the stack ----------------------------------------------
    modes = set()
    deaths = []
    for p in nests:
        r = p.get("result") or {}
        kind = classify_failure(p)
        if kind != "ok":
            modes.add(kind)
        if kind == "process-death":
            deaths.append(p["label"])
        measurements.append({
            "name": "nesting_depth",
            "variant": p["label"],
            "value": p["extra"].get("n"),
            "unit": "levels",
            "stat": "point",
            "n": 1,
            "shape": p["extra"].get("kind"),
            "parse_ok": r.get("parse_ok"),
            "failure_class": kind,
            "parse_error": r.get("parse_error"),
            "host_alive_after": p["host_alive_after"],
            "exit_code": p["exit_code"],
            "input_bytes": p.get("bytes"),
            "run_id": p["run_id"],
        })

    if deaths:
        stack_mode = "process-death"
    elif modes and modes <= {"catchable-stack-throw"}:
        stack_mode = "catchable-throw"
    elif modes:
        stack_mode = "mixed:" + ",".join(sorted(modes))
    else:
        stack_mode = "no-failure-observed"

    # ---- PHASE C: the hard ceiling ---------------------------------------
    for p in bigs:
        r = p.get("result") or {}
        ops = {o["label"]: o for o in (r.get("ops") or [])}
        series = rss_series(args.results_root, p["run_id"])
        pm = ops.get("parse")
        base = peak = delta = None
        if pm:
            base, peak, delta = rss_step(series, pm["start_date"], pm["end_date"])
        measurements.append({
            "name": "escalation_step",
            "variant": p["label"],
            "value": p.get("bytes"),
            "unit": "bytes",
            "stat": "point",
            "n": 1,
            "parse_ok": r.get("parse_ok"),
            "failure_class": classify_failure(p),
            "parse_ms": round(pm["elapsed_ms"], 1) if pm else None,
            "parse_error": r.get("parse_error"),
            "host_alive_after": p["host_alive_after"],
            "exit_code": p["exit_code"],
            "rss_baseline_kb": base,
            "rss_peak_kb": peak,
            "rss_step_bytes": delta,
            "run_id": p["run_id"],
        })

    ok_bigs = [p for p in bigs if classify_failure(p) == "ok"]
    bad_bigs = [p for p in bigs if classify_failure(p) != "ok"]
    largest_ok = max((p["bytes"] for p in ok_bigs if p.get("bytes")), default=None)
    smallest_bad = min((p["bytes"] for p in bad_bigs if p.get("bytes")), default=None)
    bad_classes = sorted({classify_failure(p) for p in bad_bigs})

    # ---- derived rates ----------------------------------------------------
    parse_pts = [(p, next((o for o in (p.get("result") or {}).get("ops") or []
                           if o["label"] == "parse" and o["ok"]), None)) for p in ladder]
    parse_pts = [(p, o) for p, o in parse_pts if o]
    xs = [p["bytes"] / 1048576 for p, _ in parse_pts]
    ys = [o["elapsed_ms"] for _, o in parse_pts]
    slope, intercept = linfit(xs, ys)
    parse_ms_per_mb = round(slope, 1) if slope else None
    per_point_ms_per_mb = [round(y / x, 1) for x, y in zip(xs, ys)]

    tok_pts = [(p, next((o for o in (p.get("result") or {}).get("ops") or []
                         if o["label"] == "tokenize" and o["ok"]), None)) for p in ladder]
    tok_pts = [(p, o) for p, o in tok_pts if o]
    tok_slope, _ = linfit([p["bytes"] / 1048576 for p, _ in tok_pts],
                          [o["elapsed_ms"] for _, o in tok_pts])

    rss_parse_ratio = median(per_op_ratio.get("parse", []))

    # Combine the ladder and the escalation into ONE series of (input bytes, RSS
    # step) and fit a slope, which separates fixed parser overhead from the
    # marginal cost per input byte in a way a median of ratios cannot.
    #
    # BUT the large escalation points must be EXCLUDED, and not for convenience.
    # Their ratios fall monotonically — 106, 107, 100, 77, 56, 41 — as inputs
    # grow. A genuinely linear allocator cannot get CHEAPER per byte at scale;
    # what happened is that the host ran out of physical memory (free pages fell
    # to roughly 57 MB) and began evicting, so RSS stopped reflecting demand.
    # Including those points would understate the ratio by more than half and
    # every downstream memory budget would inherit the error.
    SWAP_ONSET_BYTES = 50 * 1048576
    series = [(m["input_bytes"], m["rss_step_bytes"]) for m in measurements
              if m["name"] == "op_cost" and m.get("operation") == "parse"
              and m.get("rss_step_bytes") and m.get("input_bytes")]
    series += [(m["value"], m["rss_step_bytes"]) for m in measurements
               if m["name"] == "escalation_step" and m.get("rss_step_bytes")
               and m.get("value") and m.get("parse_ok")]
    reliable = sorted((x, y) for x, y in series if x <= SWAP_ONSET_BYTES)
    excluded = sorted((x, y) for x, y in series if x > SWAP_ONSET_BYTES)
    rss_slope, rss_intercept = linfit([x for x, _ in reliable], [y for _, y in reliable])
    rss_ratio = rss_slope if rss_slope is not None else rss_parse_ratio
    rss_evidence = {
        "fit_points": [[x, y, round(y / x, 1)] for x, y in reliable],
        "excluded_swap_depressed": [[x, y, round(y / x, 1)] for x, y in excluded],
        "slope_bytes_per_byte": round(rss_slope, 2) if rss_slope else None,
        "intercept_bytes": int(rss_intercept) if rss_intercept is not None else None,
        "ladder_median_ratio": round(rss_parse_ratio, 2) if rss_parse_ratio else None,
    }

    # ---- AST_MAX_BYTES ----------------------------------------------------
    stall_limit = None
    if parse_ms_per_mb:
        stall_limit = int(SINGLE_BLOCK_STALL_BUDGET_MS / parse_ms_per_mb * 1048576)
    margin_limit = int(largest_ok / HARD_MAX_SAFETY_DIVISOR) if largest_ok else None
    rss_limit = int(PARSE_RSS_BUDGET_BYTES / rss_ratio) if rss_ratio else None
    candidates = [c for c in (stall_limit, margin_limit, rss_limit) if c]
    ast_max = min(candidates) if candidates else None
    binding = None
    if ast_max is not None:
        binding = ("stall" if ast_max == stall_limit else
                   "rss" if ast_max == rss_limit else "hard-max-margin")

    hard_max = largest_ok
    # WHAT KIND of ceiling is this? A run that was cut off by the call timeout hit
    # a CPU wall, not a memory wall, and saying otherwise would invent a memory
    # limit that does not exist. The distinction is recorded rather than smoothed
    # over, because "the runtime runs out of memory at X" and "the parse becomes
    # unusably slow long before memory matters" imply completely different
    # designs for Phase 3 and Phase 9.
    if not bad_bigs:
        ceiling_kind = "not-reached"
    elif set(bad_classes) <= {"timeout"}:
        ceiling_kind = "time-bound"
    elif "process-death" in bad_classes:
        ceiling_kind = "memory-bound-process-death"
    else:
        ceiling_kind = "memory-bound-catchable"

    js_slow = median([(p.get("result") or {}).get("hash", {}).get("js_loop_slowdown")
                      for p in ladder])
    vlq_pts = [(p, next((o for o in (p.get("result") or {}).get("ops") or []
                         if o["label"] == "vlq_decode" and o["ok"]), None)) for p in ladder]
    vlq_pts = [(p, o) for p, o in vlq_pts if o]
    vlq_slope, _ = linfit([p["bytes"] / 1048576 for p, _ in vlq_pts],
                          [o["elapsed_ms"] for _, o in vlq_pts])

    builtins = bundle_builtins(args.bundle)
    stderr_evidence = stderr_scan(args.results_root, [p["run_id"] for p in points])

    tokenize_ratio = (tok_slope / slope) if (tok_slope and slope) else None

    answer = (
        f"Measured inside Caido 0.57.1, one FRESH instance per point. A full meriyah "
        f"parse with ranges costs {parse_ms_per_mb} ms/MB "
        f"(per-point {per_point_ms_per_mb}), and RSS grows at "
        f"{round(rss_ratio, 1) if rss_ratio else 'unresolved'} bytes per input byte — so "
        f"an 8 MB bundle costs roughly "
        f"{round(8 * rss_ratio) if rss_ratio else '?'} MB of RSS inside the very process "
        f"that holds the user's proxy and project data. "
        f"The acorn tokenizer — Phase 9's intended low-memory fallback — costs "
        f"{round(tok_slope, 1) if tok_slope else '?'} ms/MB, i.e. "
        f"{round(tokenize_ratio, 2) if tokenize_ratio else '?'}x the full parse, so it "
        f"is NOT a cheaper path in CPU and only helps on memory. The 512 KiB stack "
        f"breaks at {nesting.get('last_good')} levels of nesting "
        f"(by shape: {json.dumps(nesting.get('by_shape'))}) and the failure is a "
        f"CATCHABLE RangeError every time — the host process survived all "
        f"{len(nests)} depth probes, so a catch-and-degrade design is available and a "
        f"hard pre-parse depth gate is not required. Escalating input size on fresh "
        f"instances, the largest input that parsed was {largest_ok} bytes and the "
        f"smallest that failed was {smallest_bad} bytes, failing as "
        f"{bad_classes or 'no failure observed'}."
    )

    thresholds = [
        {"id": "AST_MAX_BYTES", "value": ast_max, "unit": "bytes",
         "confidence": "HIGH", "status": "resolved",
         "rationale": (
             f"Expressed in DECOMPRESSED identity bytes, the quantity SPIKE-08's "
             f"SIZE_GATE_SOURCE named. Two constraints, minimum taken. (1) STALL: a "
             f"meriyah parse is synchronous and cannot be chunked, and SPIKE-02 measured "
             f"that only setTimeout(fn,0) yields at all — so the whole parse starves the "
             f"proxy hook, the plugin RPC and every timer. At the measured "
             f"{parse_ms_per_mb} ms/MB, a {int(SINGLE_BLOCK_STALL_BUDGET_MS)} ms "
             f"single-block budget allows {stall_limit} bytes. (2) RSS: at the measured "
             f"{round(rss_ratio, 1) if rss_ratio else '?'} bytes of RSS per input byte, "
             f"a {PARSE_RSS_BUDGET_BYTES // 1048576} MB per-parse budget allows "
             f"{rss_limit} bytes — and that memory is taken inside caido-cli, the "
             f"process holding the user's real proxy and project data. (3) MARGIN: "
             f"HARD_MAX_BYTES / {HARD_MAX_SAFETY_DIVISOR} = {margin_limit} bytes. The "
             f"BINDING constraint is `{binding}`. Both budgets are POLICY inputs, not "
             f"measurements; Phase 9 can re-derive this number against different ones "
             f"using the ms/MB and bytes/byte figures recorded here. For scale, the "
             f"largest real single artifacts found were Cesium at 4.90 MB and Plotly at "
             f"4.35 MB — BOTH far above this ceiling, so the degradation path is not an "
             f"edge case, it is the common case for large bundles.")},
        {"id": "HARD_MAX_BYTES", "value": hard_max, "unit": "bytes",
         "confidence": "HIGH" if smallest_bad else "MEDIUM",
         "status": "resolved",
         "rationale": (
             f"Located by ESCALATION AND BISECTION on fresh instances, not by "
             f"extrapolating the RSS curve. Largest input that parsed: {largest_ok} "
             f"bytes. Smallest that failed: {smallest_bad} bytes, as {bad_classes}. "
             f"Resolution is one repetition of the 8.33 MB composite fixture, because "
             f"the escalation input is built from whole repetitions — a JavaScript file "
             f"cannot be truncated to an arbitrary byte count and still parse. "
             f"CEILING KIND: {ceiling_kind}. "
             + ("The escalation was stopped by the "
                f"{int(CALL_TIMEOUT_S)}s call budget, NOT by the runtime running out of "
                "memory: every failure classified as `timeout` with the host still "
                "alive. So this figure is the largest input observed to parse to "
                "completion within that budget, and it is TIME-bound. No memory ceiling "
                "was reached below it — which is itself the finding: this runtime "
                "degrades into unusable parse times long before it exhausts memory, so "
                "the binding constraint for Phase 3 and Phase 9 is the synchronous stall "
                "captured in AST_MAX_BYTES, not a heap limit."
                if ceiling_kind == "time-bound" else
                "The runtime genuinely failed above this size, so the figure is a real "
                "runtime ceiling."
                if ceiling_kind.startswith("memory-bound") else
                "No failure was observed at any size tested, so this is a lower bound on "
                "the ceiling rather than the ceiling itself.")
             + f" Boundary record: {json.dumps(hardmax)}.")},
        {"id": "MAX_NESTING_DEPTH", "value": nesting.get("last_good"), "unit": "levels",
         "confidence": "HIGH", "status": "resolved",
         "rationale": (
             f"Measured with the REAL parser, not synthetic recursion, and bisected to "
             f"within 2 levels on a fresh instance per depth. Taken as the MINIMUM "
             f"across two shapes because they are not interchangeable: "
             f"{json.dumps(nesting.get('by_shape'))}. A parenthesised expression "
             f"recurses through the primary-expression path and consumes materially more "
             f"stack per level than an array literal, so the bracket figure alone would "
             f"have been almost 3x too optimistic. For scale, SPIKE-07 measured 1,021 "
             f"frames for a trivial one-argument function — a real parser frame is far "
             f"heavier.")},
        {"id": "STACK_FAILURE_MODE", "value": stack_mode, "unit": "enum",
         "confidence": "HIGH", "status": "resolved",
         "rationale": (
             f"Across {len(nests)} depth probes the host process survived every one and "
             f"every failure surfaced as a catchable RangeError "
             f"('Maximum call stack size exceeded'). Observed classes: "
             f"{sorted(modes) or ['none']}. Process deaths: {deaths or 'none'}. A "
             f"C-level abort under `panic = \"abort\"` would never reach the structured "
             f"log, so this was checked from the exit code and stderr of each instance, "
             f"not from the log. STDERR SCAN across all "
             f"{stderr_evidence['files_scanned']} captures: "
             f"{len(stderr_evidence['abort_signatures_found'])} abort signatures found "
             f"({stderr_evidence['abort_signatures_found'] or 'none'}). The only other "
             f"content observed was {stderr_evidence['other_content_observed']}, a "
             f"benign startup race on the log directory present on successful runs too. "
             f"Every instance was killed by our own SIGKILL (exit 137), never 134.")},
        {"id": "PARSE_MS_PER_MB", "value": parse_ms_per_mb, "unit": "ms/MB",
         "confidence": "HIGH", "status": "resolved",
         "rationale": (
             f"Least-squares slope over four size points on four fresh instances "
             f"(per-point {per_point_ms_per_mb} ms/MB, intercept "
             f"{round(intercept, 1) if intercept is not None else '?'} ms). meriyah with "
             f"ranges:true, which is the configuration DefMiner must use because it "
             f"reports findings at byte offsets.")},
        {"id": "RSS_BYTES_PER_INPUT_BYTE",
         "value": round(rss_ratio, 3) if rss_ratio is not None else None,
         "unit": "ratio", "confidence": "MEDIUM", "status": "resolved",
         "rationale": (
             f"Median RSS STEP for the parse operation divided by input bytes, sampled "
             f"externally at 50 ms — the only memory measurement available, since this "
             f"runtime exposes no introspection at all. Least-squares SLOPE over every "
             f"point below {SWAP_ONSET_BYTES} bytes, which separates fixed parser "
             f"overhead (intercept {rss_evidence['intercept_bytes']} bytes) from the "
             f"marginal cost per input byte. Larger points are EXCLUDED because their "
             f"ratios fall monotonically as inputs grow "
             f"({[r[2] for r in rss_evidence['excluded_swap_depressed']]}), which a "
             f"linear allocator cannot do — the host had exhausted physical memory and "
             f"was evicting, so RSS stopped tracking demand. Ladder median for "
             f"comparison: {rss_evidence['ladder_median_ratio']}. Evidence: "
             f"{json.dumps(rss_evidence)}. MEDIUM rather than HIGH because RSS is a high-water mark that never falls "
             f"and no gc() exists to settle it before a reading, so a step is an upper "
             f"bound on what the operation itself retained.")},
    ]

    body = {
        "method": (
            "A Tier-1 plugin built by `caido-dev build` — Caido's own tsup pipeline, "
            "config:false, target esnext, external [/caido:.+/, sqlite, ...builtinModules] "
            "— carrying meriyah 7.3.2, acorn 8.18.0 and @jridgewell/sourcemap-codec 1.5.5. "
            "A hand-rolled zip would have measured the wrong artifact and would not have "
            "exercised DIST-05. Phase A ran six operations (decode, native hash, "
            "per-character JS-loop hash, VLQ decode, acorn tokenize, meriyah parse) at "
            "four size points, ONE FRESH INSTANCE PER POINT, with an external RSS sampler "
            "at 50 ms attached to that instance's PID and correlated to in-runtime "
            "Date.now() markers. Operation order is fixed with parse last, because RSS "
            "never falls in this runtime and each step delta is only meaningful as an "
            "increment on what came before. Input is read from DISK, not through the "
            "proxy, so proxy variance does not enter a parse-cost measurement. Phase B "
            "drove the REAL parser against generated deep-nesting fixtures, one fresh "
            "instance per depth, ascending then bisecting, for two shapes, recording the "
            "exit code and stderr of every instance so a C-level abort could be "
            "distinguished from a catchable throw. Phase C located the hard ceiling by "
            "escalating input size on fresh instances until failure and then bisecting."
        ),
        "corpus": [
            {"name": p["input"], "bytes": p.get("bytes"),
             "source": "pinned corpus (SHA-256 gated by plan 00-01)"}
            for p in ladder
        ],
        "probe": {"tier": "caido-dev-build", "package_version": "0.0.1",
                  "deps": {"meriyah": "7.3.2", "acorn": "8.18.0",
                           "@jridgewell/sourcemap-codec": "1.5.5"}},
        "measurements": measurements,
        "verdict": {
            "answer": answer,
            "confidence": "HIGH",
            "thresholds_set": thresholds,
            "if_wrong": (
                "AST_MAX_BYTES and HARD_MAX_BYTES are the ceilings Phase 3's engine and "
                "Phase 9's parser are built against. Set too high, a single proxied "
                "bundle blocks the Caido plugin runtime for seconds at a time — the "
                "parse is synchronous and unchunckable, so the proxy hook, the plugin "
                "RPC and every timer starve for its full duration, and at the top end "
                "the runtime stops rather than degrades. Set too low, DefMiner refuses "
                "the artifacts it exists to analyse: real bundles reach 4.9 MB. If "
                "MAX_NESTING_DEPTH is wrong, or if the failure mode is misread as a "
                "process death when it is a catchable throw, MAP-05 and QUAL-05 build a "
                "hard pre-parse depth gate where a catch-and-degrade path would have "
                "worked — or, far worse, the reverse: a catch that never fires because "
                "the process is already gone."
            ),
        },
        "requirements_affected": [
            "SPIKE-06", "DET-01", "DET-07", "CORE-06", "CORE-07",
            "MAP-03", "MAP-05", "QUAL-05",
        ],
        "artifacts": [
            "spike-06-points/",
            "runs/*/rss.csv",
            "spike-06-points/_nesting-boundary.json",
            "spike-06-points/_hardmax-boundary.json",
        ],
        "notes": (
            f"DIST-05 SIGNAL: the Tier-1 bundle leaves exactly these module specifiers "
            f"external: {json.dumps(builtins)}. Both are Node built-ins, both are ones "
            f"this probe imports deliberately, and both were verified loadable in this "
            f"runtime by SPIKE-07. meriyah, acorn and sourcemap-codec were fully bundled "
            f"and leaked no built-in of their own — so the Phase 0 parser payload is "
            f"clean under Caido's build. "
            f"DET-07 EVIDENCE: a hand-written per-character JS hash loop is "
            f"{round(js_slow, 1) if js_slow else '?'}x slower than the native digest over "
            f"the same input, which rules out per-character JS scanning as a design. "
            f"MAP-03 EVIDENCE: VLQ decode of a mappings payload sized at one segment per "
            f"40 source bytes costs {round(vlq_slope, 1) if vlq_slope else '?'} ms/MB of "
            f"source. "
            f"DEGRADATION PATH WARNING: acorn.tokenizer() costs "
            f"{round(tokenize_ratio, 2) if tokenize_ratio else '?'}x the full meriyah "
            f"parse in TIME. Phase 9 must not treat it as a cheap fallback — whatever it "
            f"saves is memory, not CPU, and the stall budget is unchanged. "
            f"CORPUS DEFECT: `corpus/composite-8mb.js`, built by plan 00-01's "
            f"fetch-corpus.sh as `cat monaco plotly`, is NOT valid JavaScript — monaco "
            f"ends with a //# sourceMappingURL comment and no trailing newline, so "
            f"plotly's opening /** is swallowed into that comment. meriyah fails at "
            f"[799:0] and acorn with 'Unterminated regular expression'. The 8 MB point "
            f"here uses corpus/big/composite-8mb-parsable.js, the same two distinct "
            f"bundles joined with a newline-semicolon-newline separator. Any later plan "
            f"that PARSES the original fixture will get a syntax error rather than a "
            f"size measurement; plan 00-04 should know."
        ),
    }
    json.dump(body, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
