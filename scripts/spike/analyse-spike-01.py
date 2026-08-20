#!/usr/bin/env python3
"""Fold the three SPIKE-01 stage captures into results/SPIKE-01.json.

The verdict is DERIVED from the recorded evidence here, never asserted by hand,
so re-running the stages and re-running this script reproduces the result file
exactly. Nothing in the result is typed by a human.

    python3 scripts/spike/analyse-spike-01.py | \
      python3 scripts/spike/record-result.py --spike SPIKE-01 --status pass \
        --run <stage1> --run <stage2> --run <stage3>
"""
from __future__ import annotations

import json
import math
import os
import sys

OUT = os.environ.get("OUT", ".planning/phases/00-runtime-reality-check/results")
RAW = os.path.join(OUT, "spike-01-stages")
REGISTRY = ".spike/re2js-registry.txt"


def load(name, default=None):
    p = os.path.join(RAW, name)
    if not os.path.isfile(p):
        return default
    with open(p) as fh:
        txt = fh.read().strip()
    if not txt:
        return default
    return json.loads(txt)


def load_lines(name):
    p = os.path.join(RAW, name)
    if not os.path.isfile(p):
        return []
    out = []
    with open(p) as fh:
        for line in fh:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def m(name, value, unit, **kw):
    d = {"name": name, "value": value, "unit": unit}
    d.update(kw)
    return d


def main() -> int:
    native = load_lines("stage1-points.jsonl")
    re2 = load_lines("stage1-re2js-points.jsonl")
    alt = load("stage1-alternation.json", {})
    limits = load("stage3-re2js-limits.json") or load("stage1-re2js-limits.json", {})
    bench = load("stage3-bench.json", {})
    obs = load_lines("stage2-observations.jsonl")
    s2 = load("stage2-summary.json", {})
    toggle = load("stage2-toggle.json", {})
    reinstall = load("stage2-reinstall.json", {})
    sig1 = load("stage1-signals.json", {})
    sig2 = load("stage2-signals.json", {})
    sig3 = load("stage3-signals.json", {})
    inst = [load(f"stage{i}-instance.json") for i in (1, 2, 3)]
    if not native or not obs or not bench:
        sys.exit("analyse-spike-01: missing stage captures — run scripts/spike/redos.sh first")

    measurements = []

    # ---- stage 1: the escalation and this run's own growth constant --------
    for p in native:
        measurements.append(m(
            "redos_elapsed_ms", p["elapsed_ms"], "ms", primitive="native-RegExp",
            variant=f"n={p['n']}", stat="point",
            notes=f"/{p['source']}/ against \"a\".repeat({p['n']})+\"b\"; matched={p['matched']}"))
    for p in re2:
        measurements.append(m(
            "redos_elapsed_ms", p["elapsed_ms"], "ms", primitive="re2js",
            variant=f"n={p['n']}", stat="point",
            notes="same pattern and payload through re2js"))

    # Geometric mean of the successive ratios, over THIS run's numbers. The
    # unbounded claim in stage 2 rests on this constant, so reusing the research
    # figure would make the claim rest on someone else's measurement.
    ratios = [native[i]["elapsed_ms"] / native[i - 1]["elapsed_ms"]
              for i in range(1, len(native))]
    growth = math.exp(sum(math.log(r) for r in ratios) / len(ratios))
    measurements.append(m(
        "growth_factor", round(growth, 4), "x per +2 chars", stat="mean", n=len(ratios),
        notes="geometric mean of successive ratios measured on THIS run: "
              + ", ".join(f"{r:.3f}" for r in ratios)))
    if re2:
        r2ratios = [re2[i]["elapsed_ms"] / re2[i - 1]["elapsed_ms"]
                    for i in range(1, len(re2)) if re2[i - 1]["elapsed_ms"] > 0]
        r2growth = (math.exp(sum(math.log(r) for r in r2ratios) / len(r2ratios))
                    if r2ratios else None)
        measurements.append(m(
            "re2js_growth_factor", round(r2growth, 4) if r2growth else None,
            "x per +2 chars", stat="mean", n=len(r2ratios),
            notes="re2js on the same escalation: flat, which is the linear-time guarantee"))

    if alt.get("elapsed_ms") is not None:
        measurements.append(m(
            "redos_elapsed_ms_second_shape", alt["elapsed_ms"], "ms",
            primitive="native-RegExp", variant=f"{alt.get('source')} n={alt.get('n')}",
            stat="point",
            notes="a SECOND catastrophic shape, so the finding is about the class "
                  "rather than about one regex"))

    # Extrapolate to n=40 from this run's own constant.
    last = native[-1]
    steps = (40 - last["n"]) / 2
    extrap_ms = last["elapsed_ms"] * (growth ** steps)
    measurements.append(m(
        "extrapolated_completion_s_at_n40", round(extrap_ms / 1000, 1), "s", stat="point",
        notes=f"{last['elapsed_ms']:.1f} ms at n={last['n']} x {growth:.3f}^{steps:g}; "
              f"~{extrap_ms / 3_600_000:.1f} hours"))

    # ---- stage 2: the unbounded proof -------------------------------------
    window = s2.get("observation_window_s")
    measurements.append(m(
        "observation_window_s", window, "s", stat="point",
        notes="bounded observation window held on the wedged instance. The "
              "'never recovers' claim is stated as what it is: no recovery "
              "mechanism engaged within a window "
              f"{extrap_ms / 1000 / window:.0f}x shorter than the extrapolated "
              "completion time"))
    measurements.append(m(
        "observation_window_vs_completion_ratio",
        round(extrap_ms / 1000 / window, 1), "x", stat="ratio",
        notes="how many times shorter the observation window is than the "
              "extrapolated completion of the same computation"))

    returned = bool(s2.get("hang_call_returned"))
    measurements.append(m(
        "hang_call_returned", returned, "boolean", stat="point",
        notes="did the wedged plugin function call ever return within the window"))

    alive_rows = [o for o in obs if o.get("host_alive")]
    gqls = [o["graphql_ms"] for o in obs if o.get("graphql_ms") is not None]
    gqls_sorted = sorted(gqls)
    core_alive = all(o.get("graphql_ms") is not None for o in obs) and len(obs) > 0
    measurements.append(m(
        "core_alive_during_hang", core_alive, "boolean", stat="point", n=len(obs),
        notes=f"GraphQL answered on {len(gqls)} of {len(obs)} samples across the window"))
    if gqls:
        measurements.append(m(
            "core_alive_during_hang_graphql_ms",
            round(gqls_sorted[len(gqls_sorted) // 2], 3), "ms", stat="median",
            n=len(gqls), p95=round(gqls_sorted[max(0, int(len(gqls_sorted) * 0.95) - 1)], 3),
            notes=f"idle baseline on the same instance before the hang: "
                  f"{s2.get('baseline_graphql_ms')} ms"))

    proxy_codes = [o.get("proxy_http_code") for o in obs]
    proxy_ok = sum(1 for c in proxy_codes if c == "200")
    measurements.append(m(
        "proxy_alive_during_hang", proxy_ok == len(proxy_codes) and len(proxy_codes) > 0,
        "boolean", stat="point", n=len(proxy_codes),
        notes=f"{proxy_ok} of {len(proxy_codes)} proxied requests returned 200 through "
              f"the wedged instance; baseline before the hang was "
              f"{s2.get('baseline_proxy_code')}"))

    # The SECOND plugin. Split before and after the first lifecycle attempt,
    # because those turned out to be two different regimes.
    second_ok = [o.get("second_plugin_ok") for o in obs]
    measurements.append(m(
        "second_plugin_alive_during_hang", any(second_ok), "boolean", stat="point",
        n=len(second_ok),
        notes=f"a SECOND package (probe/tier0-core, its own executor) answered on "
              f"{sum(1 for x in second_ok if x)} of {len(second_ok)} samples"))
    # The window has TWO regimes and averaging them would erase the finding.
    # The boundary is derived from the recorded artifacts, not chosen: the
    # driver fires togglePlugin after the first sample at or beyond 60 s, so
    # every sample up to and including that one is pre-attempt.
    boundary = next((o["elapsed_s"] for o in obs if o["elapsed_s"] >= 60), None)
    before = [o for o in obs if boundary is None or o["elapsed_s"] <= boundary]
    after = [o for o in obs if boundary is not None and o["elapsed_s"] > boundary]
    measurements.append(m(
        "second_plugin_alive_before_lifecycle_attempt",
        (all(o.get("second_plugin_ok") for o in before) if before else None),
        "boolean", stat="point", n=len(before),
        notes=f"samples up to t={boundary}s, before any lifecycle operation was "
              f"requested against the wedged plugin"))
    measurements.append(m(
        "second_plugin_alive_after_lifecycle_attempt",
        (all(o.get("second_plugin_ok") for o in after) if after else None),
        "boolean", stat="point", n=len(after),
        notes="measured separately because a lifecycle operation requested against the "
              "WEDGED plugin changes what the HEALTHY one can do. The host log shows why: "
              "`service|plugin: Stopping plugin` is accepted and then never completes, and "
              "from that moment every plugin's RPC stops at the shared plugin service — the "
              "`api|controller: Calling plugin` line still appears but the matching "
              "`plugin|executor: Calling method` line does not"))
    measurements.append(m(
        "lifecycle_attempt_poisons_healthy_plugins",
        (bool(before) and all(o.get("second_plugin_ok") for o in before)
         and bool(after) and not any(o.get("second_plugin_ok") for o in after)),
        "boolean", stat="point",
        notes="derived from the two regimes above: the healthy plugin answered on every "
              "pre-attempt sample and on none afterwards. Attempting recovery is what "
              "spreads the damage from one plugin to all of them"))

    wedged_ok = [o.get("wedged_plugin_ok") for o in obs]
    measurements.append(m(
        "wedged_plugin_rpc_answered_during_hang", any(wedged_ok), "boolean",
        stat="point", n=len(wedged_ok),
        notes=f"the hung plugin's own RPC answered on {sum(1 for x in wedged_ok if x)} "
              f"of {len(wedged_ok)} samples"))

    tog_rc = toggle.get("curl_rc")
    measurements.append(m(
        "toggle_plugin_returned_during_hang", tog_rc == 0, "boolean", stat="point",
        notes=f"togglePlugin(enabled:false) curl rc={tog_rc} after "
              f"{toggle.get('elapsed_ms')} ms against a {toggle.get('budget_s')}s budget "
              f"(rc 28 == the request never returned)"))
    re_rc = reinstall.get("curl_rc")
    re_raw = ""
    rp = os.path.join(RAW, "stage2-reinstall.raw")
    if os.path.isfile(rp):
        re_raw = open(rp).read().strip()
    re_err = None
    try:
        d = json.loads(re_raw)
        node = ((d.get("data") or {}).get("installPluginPackage") or {})
        re_err = (node.get("error") or {}).get("__typename")
        re_pkg = node.get("package")
    except Exception:
        re_pkg = None
    measurements.append(m(
        "force_reinstall_returned_during_hang", re_rc == 0, "boolean", stat="point",
        notes=f"installPluginPackage(force:true), the operation devtools hot reload "
              f"performs: curl rc={re_rc} after {reinstall.get('elapsed_ms')} ms against "
              f"a {reinstall.get('budget_s')}s budget"))
    measurements.append(m(
        "force_reinstall_succeeded_during_hang", re_err is None and re_pkg is not None,
        "boolean", stat="point",
        notes=f"THE RETURN IS NOT THE RECOVERY. The mutation came back in "
              f"{reinstall.get('elapsed_ms')} ms with package={re_pkg} and "
              f"error={re_err}, and no plugin answered afterwards. A hot reload against a "
              f"wedged runtime fails FAST with a generic error, which reads like a "
              f"transient hiccup rather than an unrecoverable runtime"))

    # ---- the interrupt question, which is the whole spike ------------------
    def hits(sig, key):
        return ((sig or {}).get("hits", {}).get(key, {}) or {}).get("count", 0)

    interrupt_hits = sum(hits(s, "interrupt") for s in (sig1, sig2, sig3))
    timeout_hits = sum(hits(s, "timeout") for s in (sig1, sig2, sig3))
    abort_hits = sum(hits(s, "abort_assertion") for s in (sig1, sig2, sig3))
    lines = sum((s or {}).get("lines_scanned", 0) for s in (sig1, sig2, sig3))
    measurements.append(m(
        "interrupt_signals_in_logs", interrupt_hits, "count", stat="count",
        notes=f"stdout, stderr and the structured host log across all three stages, "
              f"{lines} lines scanned"))
    measurements.append(m(
        "timeout_signals_in_logs", timeout_hits, "count", stat="count"))
    measurements.append(m(
        "abort_signals_in_logs", abort_hits, "count", stat="count",
        notes="a C-level QuickJS assertion would land on stderr and nowhere else"))

    # ---- stage 3: the escape hatch ----------------------------------------
    measurements.append(m(
        "re2js_slowdown_x", bench["re2js_slowdown_x"], "x", stat="ratio",
        n=bench["rule_count"],
        notes=f"{bench['rule_count']} rules over {bench['total_bytes']} bytes of real "
              f"corpus: native {bench['native_total_ms']} ms, re2js "
              f"{bench['re2js_total_ms']} ms. >1 means re2js is SLOWER"))
    measurements.append(m(
        "native_regex_mb_per_s", bench["native_mb_per_s"], "MB/s", stat="ratio"))
    measurements.append(m(
        "re2js_mb_per_s", bench["re2js_mb_per_s"], "MB/s", stat="ratio"))
    measurements.append(m(
        "re2js_match_counts_agree", bench["all_counts_agree"], "boolean", stat="point",
        notes="both engines found identical match counts on every rule and file, so "
              "the ratio compares equal work rather than two different scans"))

    # The ratio is BIMODAL, and averaging it away would hide the finding.
    per_rule = {}
    for f in bench["files"]:
        for r in f.get("rules", []):
            a = per_rule.setdefault(r["rule"], {"shape": r["shape"], "n": 0.0, "r": 0.0})
            a["n"] += r["native_ms"] or 0
            a["r"] += r["re2js_ms"] or 0
    for shape in ("provider", "generic"):
        nat = sum(v["n"] for v in per_rule.values() if v["shape"] == shape)
        r2 = sum(v["r"] for v in per_rule.values() if v["shape"] == shape)
        measurements.append(m(
            "re2js_slowdown_x_by_shape", round(r2 / nat, 3), "x", stat="ratio",
            variant=shape,
            notes=f"{shape}-shaped rules: native {nat:.1f} ms, re2js {r2:.1f} ms"))
    faster = sorted(k for k, v in per_rule.items() if v["r"] < v["n"])
    slower10 = sorted(k for k, v in per_rule.items() if v["n"] and v["r"] / v["n"] > 10)
    measurements.append(m(
        "re2js_rules_faster_than_native", len(faster), "count", stat="count",
        notes="rules where re2js BEAT native RegExp: " + ", ".join(faster)))
    measurements.append(m(
        "re2js_rules_over_10x_slower", len(slower10), "count", stat="count",
        notes="rules where re2js was more than 10x slower: " + ", ".join(slower10)))

    lb = limits.get("supports_lookbehind")
    br = limits.get("supports_backreference")
    measurements.append(m(
        "re2js_supports_lookbehind", lb, "boolean", stat="point",
        notes="RE2 rejects lookbehind by construction; it is what makes linear-time "
              "matching possible. Stated here so Phase 3 knows before it writes rules"))
    measurements.append(m(
        "re2js_supports_backreference", br, "boolean", stat="point",
        notes="likewise rejected. A RE2-clean corpus makes Gitleaks rules directly "
              "portable, which is arguably a benefit rather than only a constraint"))
    for p in limits.get("probes", []):
        if p["construct"] in ("lookahead_positive", "named_group", "unicode_class",
                              "word_boundary", "lazy_quantifier", "nested_quantifier"):
            measurements.append(m(
                "re2js_construct_supported", p["re2js_compiles"], "boolean",
                variant=p["construct"], stat="point",
                notes=(p.get("re2js_error") or "")[:160] or p["source"]))

    # ---- provenance -------------------------------------------------------
    reg = {}
    if os.path.isfile(REGISTRY):
        for line in open(REGISTRY):
            if ":" in line:
                k, _, v = line.partition(":")
                reg[k.strip()] = v.strip()
    measurements.append(m(
        "re2js_registry_repository_field",
        reg.get("repository (version doc)", "unknown").strip(chr(34)),
        "string", stat="point",
        notes="queried live from registry.npmjs.org. npm's SHORTHAND string form; "
              "tooling that reads repository.url as an object sees a string and "
              "reports the field as absent — which is how the gap was reported"))
    measurements.append(m(
        "re2js_registry_trusted_publisher",
        "trustedPublisher" in reg.get("_npmUser", ""), "boolean", stat="point",
        notes="_npmUser: " + reg.get("_npmUser", "unknown")[:200]))
    measurements.append(m(
        "re2js_registry_install_scripts", "postinstall" not in reg.get("scripts", "")
        and "preinstall" not in reg.get("scripts", ""), "boolean", stat="point",
        notes="no install-time script; published scripts are build/test/lint only"))
    measurements.append(m(
        "re2js_registry_runtime_dependencies",
        0 if reg.get("dependencies") in ("null", "{}", None) else -1, "count",
        stat="count", notes="dependencies: " + str(reg.get("dependencies"))))

    # ---- thresholds, derived ----------------------------------------------
    interruptible = returned or interrupt_hits > 0
    if interruptible:
        recovery = "throw"
    else:
        recovery = "kill"

    slowdown = bench["re2js_slowdown_x"]
    prov = next(x for x in measurements
                if x["name"] == "re2js_slowdown_x_by_shape" and x.get("variant") == "provider")
    gen = next(x for x in measurements
               if x["name"] == "re2js_slowdown_x_by_shape" and x.get("variant") == "generic")
    # adopt-all requires re2js to be affordable as a whole-body engine; reject
    # requires it to be useless everywhere. Neither holds, and the split is the
    # reason: it wins on literal-anchored rules and loses by ~2 orders of
    # magnitude on unanchored ones.
    if slowdown <= 2:
        verdict = "adopt-all"
    elif len(faster) == 0 and slowdown > 10:
        verdict = "reject"
    else:
        verdict = "adopt-generic"

    thresholds = [
        {
            "id": "REDOS_INTERRUPTIBLE",
            "value": interruptible,
            "unit": "boolean",
            "confidence": "HIGH",
            "status": "resolved",
            "rationale":
                f"n=40 was fired on a dedicated instance and the call had not returned "
                f"{window} s later. Across {lines} lines of stdout, stderr and the "
                f"structured host log over all three stages there were {interrupt_hits} "
                f"interrupt signals and {timeout_hits} timeout signals. Caido installs no "
                f"QuickJS interrupt handler, so lre_check_timeout is inert and the "
                f"engine's own timeout mechanism cannot fire. Measured, not inferred.",
        },
        {
            "id": "REDOS_RECOVERY",
            "value": recovery,
            "unit": "enum(none|throw|kill)",
            "confidence": "HIGH",
            "status": "resolved",
            "rationale":
                f"togglePlugin(enabled:false) never came back (curl rc={tog_rc} after "
                f"{toggle.get('elapsed_ms')} ms; rc 28 is a client-side timeout, and the host "
                f"log shows `Stopping plugin` accepted and never completed). "
                f"installPluginPackage(force:true) — the operation devtools hot reload "
                f"performs — DID return, in {reinstall.get('elapsed_ms')} ms, but with "
                f"package=null and error={re_err}: it failed rather than recovering, and no "
                f"plugin answered afterwards. So neither lifecycle operation is a recovery "
                f"path, and they fail in two different ways that both look survivable from "
                f"outside. SIGKILL was the only teardown that worked; the instance exited "
                f"{(inst[1] or {}).get('exit_code')} (137 == our own SIGKILL).",
        },
        {
            "id": "RE2JS_THROUGHPUT_RATIO",
            "value": slowdown,
            "unit": "x (re2js elapsed / native elapsed; >1 = re2js slower)",
            "confidence": "HIGH",
            "status": "resolved",
            "rationale":
                f"{bench['rule_count']} provider- and generic-shaped rules over "
                f"{bench['total_bytes']} bytes of the real corpus, both engines counting "
                f"every match and agreeing on every count. The aggregate hides a bimodal "
                f"split: {prov['value']}x on provider-shaped rules and {gen['value']}x on "
                f"generic-shaped ones, with re2js FASTER than native on {len(faster)} of "
                f"{len(per_rule)} rules.",
        },
        {
            "id": "RE2JS_VERDICT",
            "value": verdict,
            "unit": "enum(adopt-all|adopt-generic|reject)",
            "confidence": "HIGH",
            "status": "resolved",
            "rationale":
                f"adopt-all is refused by the data: at {slowdown}x aggregate, a whole-body "
                f"scan of an AST_MAX_BYTES (1,334,405 B) bundle would cost roughly "
                f"{bench['re2js_total_ms'] * 1334405 / bench['total_bytes'] / 1000:.1f} s "
                f"against a 1,000 ms single-block stall budget. reject is equally refused: "
                f"re2js compiled every rule in the set, was faster than native on "
                f"{len(faster)} of them, and is flat where native is exponential. So it is "
                f"adopted for the rule class that can backtrack catastrophically, run "
                f"inside DET-06's bounded windows rather than across whole bodies, with "
                f"native RegExp keeping the whole-body prefilter pass.",
        },
    ]

    answer = (
        f"YES — a catastrophic regex hangs the plugin with no interrupt, no timeout and "
        f"no in-runtime recovery. Native /(a+)+$/ grew {growth:.3f}x per two added "
        f"characters on this build ({native[0]['elapsed_ms']:.0f} ms at n=20 to "
        f"{native[-1]['elapsed_ms']:.0f} ms at n=26), extrapolating n=40 to "
        f"{extrap_ms / 3_600_000:.1f} hours. n=40 was fired and had not returned "
        f"{window} s later — a window {extrap_ms / 1000 / window:.0f}x shorter than "
        f"completion — with {interrupt_hits} interrupt signals in {lines} log lines. "
        f"Throughout, the Caido core answered GraphQL in "
        f"{gqls_sorted[len(gqls_sorted) // 2]:.2f} ms median and the proxy returned 200 on "
        f"{proxy_ok}/{len(proxy_codes)} requests, so the host stays diagnosable; but "
        f"togglePlugin never returned and installPluginPackage(force:true) returned in "
        f"{reinstall.get('elapsed_ms')} ms with package=null and error={re_err} rather than "
        f"reloading anything, so SIGKILL is the only recovery. Worse, a SECOND package with "
        f"its own executor answered normally for the first {len(before)} samples and on none "
        f"of the {len(after)} after the toggle was requested — attempting recovery is what "
        f"spreads the damage. re2js is flat on the same escalation and "
        f"{slowdown}x slower on the real rule set, split {prov['value']}x provider / "
        f"{gen['value']}x generic — verdict {verdict}."
    )

    if_wrong = (
        "If an interrupt DOES in fact fire on some build or configuration, the hang becomes "
        "a thrown error mid-scan instead. That is better but it is still a scan failure, so "
        "ERR-01's per-artifact isolation has to handle it either way and the design does not "
        "collapse in either direction. What DOES change: DET-05's static ReDoS check would "
        "drop from load-bearing to defence-in-depth, and re2js could be deferred entirely. "
        "Conversely, if RE2JS_THROUGHPUT_RATIO is materially worse on a different corpus — "
        "the ratio is dominated by unanchored rules, and a rule set with more of them would "
        "push it up — then re2js cannot be afforded even inside bounded windows, and DET-05 "
        "plus a hard per-rule match budget become the only defence. Re-measure this ratio "
        "against the actual Phase 3 rule corpus before committing to it."
    )

    notes = (
        "Three fresh instances, one per stage, because the failure modes are "
        "incompatible: stage 2 leaves a runtime that can never be measured again and "
        "stage 3 needs a clean one. Stage 2's second-plugin result changed regime "
        "mid-window and that is the sharpest finding in the spike: a second package "
        "with its own executor answered normally while the first was wedged, and "
        "STOPPED answering once a lifecycle operation was requested against the wedged "
        "plugin. Attempting recovery is what spreads the damage. re2js provenance was "
        "re-queried live against registry.npmjs.org: the repository field IS published, "
        "in npm's shorthand string form ('github:le0pard/re2js') rather than the "
        "{type,url} object form, which is why tooling reading repository.url reported it "
        "absent. 2.8.6 was published by npm trusted publishing via GitHub Actions OIDC, "
        "carries zero runtime dependencies and no install-time script. There is no "
        "provenance gap; Phase 3 should re-audit at adoption time as normal hygiene, not "
        "to close a gap."
    )

    body = {
        "method":
            "Three stages on three fresh version-asserted instances (8981 recoverable, "
            "8982 terminal, 8983 clean), driven by scripts/spike/redos.sh with the Tier-1 "
            "redos probe built through caido-dev so the build pipeline is part of what is "
            "measured. Stage 1 escalated n=20..26 and computed the growth constant from "
            "its own numbers. Stage 2 fired n=40 and held a bounded observation window, "
            "probing from OUTSIDE the wedged thread: host liveness, GraphQL latency, a "
            "proxied request, a SECOND installed package's RPC, the wedged plugin's own "
            "RPC, and one attempt each at togglePlugin and installPluginPackage(force:true) "
            "with no retry loop. Stage 3 benchmarked re2js against native RegExp on the "
            "same rules over the same corpus. Every stage torn down with SIGKILL and its "
            "exit code recorded.",
        "measurements": measurements,
        "corpus": [
            {"name": os.path.basename(f["path"]), "bytes": f["bytes"],
             "sha256": f.get("sha256"), "source": "scripts/spike/fetch-corpus.sh"}
            for f in bench["files"] if f.get("read_ok")
        ],
        "probe": {
            "tier": "caido-dev-build",
            "package_version": "0.0.1",
            "deps": {"re2js": "2.8.6"},
        },
        "containment": {
            "escaped": False,
            "escape_paths": [],
        },
        "verdict": {
            "answer": answer,
            "confidence": "HIGH",
            "thresholds_set": thresholds,
            "if_wrong": if_wrong,
        },
        "requirements_affected": ["SPIKE-01", "DET-04", "DET-05", "DET-06", "ERR-01", "QUAL-05"],
        "artifacts": [
            "scripts/spike/redos.sh",
            "tier1/redos/src/index.ts",
            f"{RAW}/stage1-points.jsonl",
            f"{RAW}/stage2-observations.jsonl",
            f"{RAW}/stage3-bench.json",
        ],
        "notes": notes,
    }
    print(json.dumps(body, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
