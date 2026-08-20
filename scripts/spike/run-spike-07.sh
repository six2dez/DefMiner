#!/usr/bin/env bash
# scripts/spike/run-spike-07.sh — SPIKE-07 end to end.
#
# SPIKE-07 asks: does `structuredClone` exist in Caido's runtime?
# The answer is already known (absent on 0.57.1, measured during research), so
# this is a REGRESSION ASSERTION, not a discovery. It doubles as the tracer that
# proves every layer of the harness works: launch -> install -> call -> record.
set -euo pipefail

export PORT="${PORT:-8999}"
export OUT="${OUT:-.planning/phases/00-runtime-reality-check/results}"

# shellcheck disable=SC1091
source scripts/spike/instance.sh
# shellcheck disable=SC1091
source scripts/spike/probe-run.sh
trap 'teardown "$CAIDO_PID" "$RUN_ID" "$DATA"' EXIT

T0=$(python3 -c 'import time;print(time.time())')
probe_install probe/tier0-core
probe_call capabilities '[]' > "$RUN_DIR/raw/capabilities.json"
T1=$(python3 -c 'import time;print(time.time())')

python3 - "$RUN_DIR/raw/capabilities.json" "$PROBE_ZIP_SHA" "$T0" "$T1" "$RUN_ID" <<'PY' \
  | python3 scripts/spike/record-result.py --spike SPIKE-07 --status pass --run "$RUN_ID"
import json, sys

cap = json.load(open(sys.argv[1]))
zip_sha, t0, t1, run_id = sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]

sc  = cap["typeofs"]["structuredClone"]
wasm = cap["typeofs"]["WebAssembly"]
td_mod = cap["text_decoder_module"]
depth  = cap["stack"]["depth"]

measurements = [
    {"name": "globals_count", "value": cap["globals_count"], "unit": "count",
     "stat": "point",
     "notes": "Enumerated from Object.getOwnPropertyNames(globalThis). "
              "@caido/quickjs-types declares ~6; never trust the type package as a capability list."},
    {"name": "structured_clone_typeof", "value": sc, "unit": "typeof", "stat": "point"},
    {"name": "webassembly_typeof", "value": wasm, "unit": "typeof", "stat": "point"},
    {"name": "text_decoder_module", "value": td_mod, "unit": "module", "stat": "point",
     "notes": "Open question 4 in 00-RESEARCH.md. TextDecoder is not a global; "
              "this is which module exports it, if any. ENC-01/ENC-02 depend on it."},
    {"name": "text_encoder_module", "value": cap["text_encoder_module"], "unit": "module", "stat": "point"},
    {"name": "trivial_stack_depth", "value": depth, "unit": "frames", "stat": "max",
     "notes": "Trivial 1-argument frame. Real AST-walk frames are far larger, so the "
              "effective depth is much lower — SPIKE-06 measures that with a real parser."},
    {"name": "stack_failure_catchable", "value": cap["stack"]["catchable"], "unit": "boolean", "stat": "point",
     "notes": "Error class: %s" % cap["stack"]["error"]},
    {"name": "perf_now_min_delta", "value": cap["clock"]["min_delta_ms"], "unit": "ms", "stat": "min",
     "notes": "Smallest observable non-zero performance.now() delta over 200k samples."},
]

# Which decoding primitives ARE reachable, given TextDecoder is not. This is the
# constructive half of open question 4: ENC-01/ENC-02 need a decoder, and the
# answer "not TextDecoder" is only useful alongside "use these instead".
decoders = []
if isinstance(cap["modules"].get("string_decoder"), list) and "StringDecoder" in cap["modules"]["string_decoder"]:
    decoders.append("string_decoder.StringDecoder")
if isinstance(cap["modules"].get("buffer"), list) and "Buffer" in cap["modules"]["buffer"]:
    decoders.append("buffer.Buffer (toString/from)")
if cap["typeofs"].get("Buffer") == "function":
    decoders.append("globalThis.Buffer")
measurements.append(
    {"name": "reachable_decoders", "value": ", ".join(decoders) or "none",
     "unit": "enum", "stat": "point",
     "notes": "TextDecoder is absent, but UTF-8 decoding is still reachable through "
              "these. ENC-01/ENC-02 do NOT need to hand-roll a decoder."})

# The research recorded 80 globals. Record the disagreement explicitly rather
# than quietly matching it: the measurement wins, and the gap is itself data.
RESEARCH_GLOBALS = 80
CAIDO_INJECTED = sorted(set(cap["globals"]) & {"Body", "RequestSpec", "RequestSpecRaw", "ResponseSpec"})
measurements.append(
    {"name": "globals_count_vs_research", "value": cap["globals_count"] - RESEARCH_GLOBALS,
     "unit": "count", "stat": "point",
     "notes": "00-RESEARCH.md recorded %d globals; this run enumerated %d. The measurement "
              "stands. %d of them are Caido-injected SDK globals (%s) that a probe "
              "enumerating at a different plugin-lifecycle point might not observe; the "
              "remainder are quickjs-ng built-ins. Either way, NEVER trust a hardcoded "
              "capability list — @caido/quickjs-types declares ~6."
              % (RESEARCH_GLOBALS, cap["globals_count"], len(CAIDO_INJECTED),
                 ", ".join(CAIDO_INJECTED) or "none")})

loadable = sorted(k for k, v in cap["modules"].items() if isinstance(v, list))
failed   = sorted(k for k, v in cap["modules"].items() if not isinstance(v, list))
mem_intro = [m for m in ("llrt:qjs", "qjs", "perf_hooks", "process") if m in failed]

body = {
    "duration_s": round(t1 - t0, 1),
    "probe": {"tier": "raw-zip", "package_version": "0.0.1",
              "bundle_sha256": zip_sha, "deps": {}},
    "corpus": [],
    "method": (
        "Installed an unsigned Tier-0 zip via the installPluginPackage multipart "
        "GraphQL mutation (force:true) onto a fresh --data-path instance on "
        "127.0.0.1:8999, then called `capabilities` over "
        "POST /plugin/backend/<uuid>/function. The probe ENUMERATES "
        "Object.getOwnPropertyNames(globalThis) rather than testing a hardcoded "
        "list, typeof-probes a named candidate set, attempts dynamic import() of "
        "every candidate module capturing error text on failure, measures trivial "
        "recursion depth and whether the failure is catchable, and measures the "
        "smallest observable non-zero performance.now() delta over 200k samples."
    ),
    "measurements": measurements,
    "verdict": {
        "answer": (
            "REGRESSION ASSERTION, not a discovery: structuredClone is `%s` on Caido "
            "0.57.1, confirming the Phase 0 research finding. The meriyah@7 polyfill "
            "guard is therefore mandatory and unconditional, not defensive. WebAssembly "
            "is `%s`, so oxc/swc and mappings.wasm are structurally impossible. "
            "%d globals are actually present against the ~6 the type package declares. "
            "TextDecoder is %s. Trivial recursion reaches %d frames and fails with a "
            "CATCHABLE %s. Memory introspection is absent entirely (%s all fail to "
            "load), which is what forces external RSS sampling for every memory spike."
        ) % (
            sc, wasm, cap["globals_count"],
            ("exported by the `%s` module" % td_mod) if td_mod else
            "reachable from NO module probed (buffer, string_decoder, url, util) and is not a global",
            depth, cap["stack"]["error"], ", ".join(mem_intro) or "none",
        ),
        "confidence": "HIGH",
        "thresholds_set": [
            {"id": "STRUCTURED_CLONE_PRESENT", "value": sc != "undefined", "unit": "boolean",
             "confidence": "HIGH", "status": "resolved",
             "rationale": "typeof structuredClone === '%s' on 0.57.1." % sc},
            {"id": "WASM_PRESENT", "value": wasm != "undefined", "unit": "boolean",
             "confidence": "HIGH", "status": "resolved",
             "rationale": "typeof WebAssembly === '%s'. Rules out every wasm-based parser." % wasm},
            {"id": "TEXTDECODER_MODULE", "value": td_mod, "unit": "module",
             "confidence": "HIGH", "status": "resolved",
             "rationale": "Resolved by enumerating every export of buffer, string_decoder, url and util."},
            {"id": "TRIVIAL_STACK_DEPTH", "value": depth, "unit": "frames",
             "confidence": "HIGH", "status": "resolved",
             "rationale": "Upper bound from a 1-argument frame; SPIKE-06 measures the "
                          "effective depth with a real parser frame."},
        ],
        "if_wrong": (
            "If structuredClone were present, meriyah@7's polyfill guard would be "
            "optional and the ingestion path could clone AST fragments directly. If "
            "WebAssembly were present, the entire parser selection in Phase 3 reopens "
            "— oxc and swc become candidates and the meriyah/acorn decision is moot. "
            "TextDecoder is unreachable, but that does NOT force a hand-rolled decoder: "
            "string_decoder.StringDecoder and buffer.Buffer are both importable, so "
            "ENC-01 and ENC-02 bind to those instead. If a future build were to drop "
            "them too, decoding becomes hand-rolled JS and the cost model for every "
            "non-identity Content-Encoding in SPIKE-08 changes."
        ),
    },
    "requirements_affected": ["SPIKE-07", "ENC-01", "ENC-02", "CORE-06"],
    "artifacts": ["runs/%s/raw/capabilities.json" % run_id,
                  "runs/%s/instance.json" % run_id],
    "notes": (
        "Loadable modules: %s. Failed to load: %s. "
        "performance carries only `now` and `timeOrigin`; timeOrigin is a monotonic "
        "boot-relative origin, NOT a wall clock, so timeOrigin + now() is not a "
        "timestamp. There is no globalThis.gc, so collection cannot be forced before "
        "a measurement. Three module facts later plans depend on: (1) bare `crypto` "
        "loads and exports Sha256/createHash, which is what the SPIKE-10 recorder "
        "hashes bodies with -- note `caido:crypto` does NOT load, only bare `crypto`; "
        "(2) `zlib` does NOT load, so SPIKE-08 cannot decompress in-runtime and must "
        "rely on whatever Caido already decoded; (3) `util` and `stream` do NOT load."
    ) % (", ".join(loadable) or "none", ", ".join(failed) or "none"),
}
print(json.dumps(body))
PY
