#!/usr/bin/env python3
"""Close out SPIKE-10 from the recorder database into a measurement body.

    python3 scripts/spike/analyse-spike-10.py [--revisit-after YYYY-MM-DD] \
      | python3 scripts/spike/record-result.py --spike SPIKE-10 --status ... --run <id>

SPIKE-10 asks: what is the content-hash cache hit rate on real browsing? It is
the single biggest performance lever in the project — at 40% instead of 90% the
CPU cost is six times the budget — and it is wall-clock-bound, which is why the
recorder shipped in wave 1 and is merely READ here.

THE BRANCH IS CHOSEN BY THE DATA, NOT BY JUDGEMENT. Two facts pick it:
CACHE_SAMPLE_DAYS, and the cross_day_denominator that cache-rate.py emits — the
count of distinct content hashes seen on two or more distinct calendar days.

A rate whose denominator is zero is UNDEFINED, not zero. Reporting 0.0 there
would tell Phase 1's CORE-08 that caching measurably never works, which is a
fabrication in the opposite direction from over-reporting and mis-sizes the
budget just as badly. The job of this phase is to replace assumptions with
measurements; a measurement that could not be taken is honest output, and
emitting the within-session rate under the cross-day name would be the one thing
that is never permitted.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import subprocess
import sys

OUT = os.environ.get("OUT", ".planning/phases/00-runtime-reality-check/results")

# These strings are load-bearing: scripts/spike/aggregate.py requires the
# rationale of an inconclusive cross-day rate to name WHICH cause applies,
# because the two imply different follow-ups.
CAUSE_TOO_FEW_DAYS = "fewer than two distinct days sampled"
CAUSE_NO_RECURRENCE = "no content hash recurred across them"


def m(name, value, unit, **kw):
    d = {"name": name, "value": value, "unit": unit}
    d.update(kw)
    return d


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--revisit-after", default=None,
                    help="ISO date by which the cross-day rate must be re-measured")
    ap.add_argument("--agent-state", default="unknown",
                    choices=["uninstalled", "left-running", "unknown"])
    ap.add_argument("--db", default=None)
    args = ap.parse_args()

    cmd = ["python3", "scripts/spike/cache-rate.py", "--json"]
    if args.db:
        cmd += ["--db", args.db]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f"analyse-spike-10: cache-rate.py failed: {proc.stderr.strip()}")
    r = json.loads(proc.stdout)
    if not r.get("rows"):
        sys.exit("analyse-spike-10: recorder database has no rows")

    days = r["distinct_days"]
    denom = r["cross_day_denominator"]
    measurable = days >= 2 and denom > 0
    revisit = args.revisit_after or (
        datetime.date.today() + datetime.timedelta(days=14)).isoformat()

    measurements = [
        m("cache_hit_rate_within_page", r["within_page"], "ratio", stat="ratio",
          n=r["rows"],
          notes=f"{r['within_page_hits']} of {r['rows']} fetches repeated the same content "
                f"hash inside a 2 s window. Measures duplicate DELIVERY, not caching across "
                f"visits"),
        m("cache_hit_rate_within_session", r["within_session"], "ratio", stat="ratio",
          n=r["rows"],
          notes=f"{r['within_session_hits']} repeats inside a browsing session, split on a "
                f"30-minute inactivity gap. Measures what a warm browser tab saves. This is "
                f"NOT the number that drives the CPU budget and must never be reported under "
                f"the cross-day name"),
        m("cache_hit_rate_cross_day", r["cross_day"], "ratio", stat="ratio",
          n=r["rows"], valid=measurable,
          notes=(f"measured over {denom} content hashes seen on two or more distinct days"
                 if measurable else
                 f"UNDEFINED, not zero: {r.get('cross_day_undefined_reason') or ''}".strip())),
        m("cache_sample_days", days, "days", stat="count",
          notes="distinct calendar days on which the recorder observed traffic: "
                + ", ".join(r["days"])),
        m("cache_cross_day_denominator", denom, "hashes", stat="count",
          notes="count of distinct content hashes observed on two or more distinct calendar "
                "days. This is the denominator of the cross-day rate, and a rate with a zero "
                "denominator is undefined rather than zero"),
        m("cache_rows_recorded", r["rows"], "rows", stat="count",
          notes=f"{r['distinct_hashes']} distinct content hashes over "
                f"{r['total_bytes']} bytes of script-ish responses"),
        m("cache_distinct_hashes", r["distinct_hashes"], "hashes", stat="count"),
        m("cache_sessions_recorded", r["sessions"], "sessions", stat="count",
          notes="split on a 30-minute inactivity gap, so back-to-back scripted runs merge "
                "into one session rather than inflating the count"),
        m("cache_cross_day_stabilised", bool(r["stabilised"]), "boolean", stat="point",
          notes=f"day-over-day change in the cross-day figure: {r['cross_day_last_delta']}. "
                f"Requires at least two days to exist at all"),
    ]

    # ---- the branch -------------------------------------------------------
    thresholds = [
        {
            "id": "CACHE_HIT_RATE_WITHIN_PAGE",
            "value": r["within_page"],
            "unit": "ratio",
            "confidence": "HIGH",
            "status": "resolved",
            "rationale":
                f"{r['within_page_hits']} duplicate-hash deliveries in {r['rows']} recorded "
                f"fetches within a 2 s window, from real proxied browsing.",
        },
        {
            "id": "CACHE_HIT_RATE_WITHIN_SESSION",
            "value": r["within_session"],
            "unit": "ratio",
            "confidence": "HIGH",
            "status": "resolved",
            "rationale":
                f"{r['within_session_hits']} repeats across {r['sessions']} sessions split on "
                f"a 30-minute inactivity gap. Answers 'what does a warm tab save', which is a "
                f"different question from the one that sizes the CPU budget.",
        },
        {
            "id": "CACHE_SAMPLE_DAYS",
            "value": days,
            "unit": "days",
            "confidence": "HIGH",
            "status": "resolved",
            "rationale":
                f"distinct calendar days on which the recorder observed traffic: "
                f"{', '.join(r['days'])}. The confidence of the cross-day rate is DERIVED "
                f"from this number rather than asserted.",
        },
        {
            "id": "CACHE_CROSS_DAY_DENOMINATOR",
            "value": denom,
            "unit": "content hashes seen on 2+ distinct days",
            "confidence": "HIGH",
            "status": "resolved",
            "rationale":
                f"of {r['distinct_hashes']} distinct content hashes recorded, {denom} were "
                f"seen on two or more distinct calendar days. Emitted as a threshold in its "
                f"own right so the difference between 'too few days' and 'enough days but "
                f"nothing recurred' survives into the aggregate instead of having to be "
                f"re-derived from the raw log.",
        },
    ]

    if measurable:
        stabilised = bool(r["stabilised"])
        confidence = "HIGH" if (days >= 3 and stabilised) else ("MEDIUM" if days >= 3 else "LOW")
        threshold = {
            "id": "CACHE_HIT_RATE_CROSS_DAY",
            "value": r["cross_day"],
            "unit": "ratio",
            "confidence": confidence,
            "status": "resolved",
            "rationale":
                f"{r['cross_day_hits']} of {r['rows']} fetches were of a content hash first "
                f"seen on an EARLIER calendar day, over a denominator of {denom} multi-day "
                f"hashes across {days} days. Day-over-day change {r['cross_day_last_delta']}; "
                f"stabilisation tolerance 0.05, met: {stabilised}.",
        }
        if days < 3:
            threshold["revisit_after"] = revisit
        thresholds.append(threshold)
        status = "pass"
    else:
        cause = CAUSE_TOO_FEW_DAYS if days < 2 else CAUSE_NO_RECURRENCE
        follow_up = (
            "keep collecting — the recorder needs to span more calendar days"
            if days < 2 else
            "the corpus or the site list is not exercising re-serving, so the METHOD itself "
            "needs revisiting rather than merely more time")
        thresholds.append({
            "id": "CACHE_HIT_RATE_CROSS_DAY",
            "value": None,
            "unit": "ratio",
            "confidence": "LOW",
            "status": "inconclusive",
            "revisit_after": revisit,
            "rationale":
                f"UNDEFINED, not zero. The cause is {cause}: CACHE_SAMPLE_DAYS={days} and "
                f"CACHE_CROSS_DAY_DENOMINATOR={denom}. Follow-up implied: {follow_up}. "
                f"Reporting 0.0 here would assert that caching measurably never works, and "
                f"reporting the within-session rate ({r['within_session']}) under this name "
                f"would assert a number nobody measured — both mis-size Phase 1's CPU budget "
                f"by the exact 90%-against-40% factor this spike exists to prevent, silently, "
                f"across eleven downstream phases.",
        })
        thresholds.append({
            "id": "CACHE_HIT_RATE_ASSUMED",
            "value": 0.40,
            "unit": "ratio",
            "confidence": "pessimistic-default",
            "revisit_after": revisit,
            "rationale":
                "Phase 1's CORE-08 cache design must budget for the WORST CASE until the real "
                "number lands. 0.40 is the low end of the range the project brief treats as "
                "plausible, where CPU cost is roughly six times what a 90% hit rate would "
                "imply. This is not a measurement and must never be cited as one: it is a "
                "deliberate placeholder that keeps Phase 1 unblocked without letting it build "
                "on a figure nobody observed. Replace it with CACHE_HIT_RATE_CROSS_DAY as "
                "soon as two or more days with a non-zero denominator exist.",
        })
        status = "inconclusive"

    answer = (
        f"Within page load {r['within_page']}, within session {r['within_session']}, over "
        f"{r['rows']} recorded fetches and {r['distinct_hashes']} distinct content hashes "
        f"across {days} calendar day(s). "
        + (f"Cross-day {r['cross_day']} over a denominator of {denom} multi-day hashes — this "
           f"is the rate that drives the CPU budget."
           if measurable else
           f"THE CROSS-DAY RATE — the only one that drives the CPU budget, and the only one a "
           f"single burst can never produce — is UNDEFINED, not zero: "
           f"CACHE_SAMPLE_DAYS={days} and CACHE_CROSS_DAY_DENOMINATOR={denom}. "
           f"CACHE_HIT_RATE_CROSS_DAY is therefore null with status inconclusive and a "
           f"revisit date of {revisit}, and CACHE_HIT_RATE_ASSUMED=0.40 is emitted as an "
           f"explicit pessimistic default for Phase 1's CORE-08 to budget against.")
    )

    if_wrong = (
        "The ingestion budget is the thing that moves. At a 90% cross-day hit rate only one "
        "bundle in ten needs full analysis and the per-bundle CPU cost — SPIKE-06 measured "
        "785.8 ms/MB to parse and 102 bytes of RSS per input byte — is amortised away. At "
        "40% it is six times that, which is the difference between analysing a large SPA "
        "inside the 25 ms slice budget and never finishing it. Concretely, if the real rate "
        "lands materially below 0.40, CORE-08's cache stops being an optimisation and the "
        "admission gate has to shed work instead: Phase 9's degradation ladder becomes the "
        "common path rather than the exception, and AST_MAX_BYTES (1,334,405 B) has to come "
        "down. If it lands materially above 0.40, the budget has slack and the pessimistic "
        "default will simply have made Phase 1 conservative — which is the cheap direction "
        "to be wrong in, and why 0.40 rather than the within-session figure is the honest "
        "placeholder."
    )

    notes = (
        "The reasoning matters more than the number here, because it is the phase's whole "
        "thesis in miniature: the job is to replace assumptions with measurements, and a "
        "measurement that could not be taken is honest output. Three rates are reported "
        "because they answer three different questions, and only the cross-day one sizes the "
        "CPU budget — it is a property of how sites version and re-serve bundles across "
        "deploys, which is why it is wall-clock-bound and why the recorder shipped in wave 1 "
        "instead of being run on demand at the end. "
        f"Collection modes that contributed: scripted pinned-site sessions driven by "
        f"scripts/spike/browse.mjs over scripts/spike/sites.json, run both on demand and by a "
        f"twice-daily LaunchAgent; {r['sessions']} session(s) after splitting on a 30-minute "
        f"inactivity gap. No live operator browsing was recorded — that mode was available "
        f"throughout and was not exercised, which is worth knowing because a pinned list "
        f"under-represents the revisit patterns that produce cross-day recurrence. "
        f"PRIVACY: cache_log stores only {{ts, url, sha256, bytes, content_type, status}} — no "
        f"bodies, no headers, no cookies, no auth material — and .spike/ is gitignored, so "
        f"neither the database nor any recorded URL enters git. Only the aggregate rates and "
        f"counts are published here. "
        f"RECORDER LAUNCHAGENT: {args.agent_state}. Database left at {r['db']}."
    )

    body = {
        "method":
            "A long-lived, deliberately non-disposable recorder instance on 127.0.0.1:8998 "
            "with a backend plugin hashing every script-ish proxied response body into a "
            "cache_log table in its own sdk.meta.db(), running since wave 1. Sessions were "
            "driven by Playwright over a pinned site list, on demand and twice daily via a "
            "per-user LaunchAgent. All three rates are computed OFFLINE from cache_log by "
            "scripts/spike/cache-rate.py, which emits the cross-day DENOMINATOR explicitly so "
            "an undefined rate is distinguishable from a measured zero.",
        "measurements": measurements,
        "containment": {"escaped": False, "escape_paths": []},
        "verdict": {
            "answer": answer,
            "confidence": "HIGH" if measurable and days >= 3 else "LOW",
            "thresholds_set": thresholds,
            "if_wrong": if_wrong,
        },
        "requirements_affected": ["SPIKE-10", "CORE-08", "STORE-03", "STORE-04", "OBS-01"],
        "artifacts": [
            "probe/recorder/backend/script.js",
            "scripts/spike/cache-rate.py",
            "scripts/spike/recorder-session.sh",
            "scripts/spike/recorder-agent.sh",
            f"{OUT}/SPIKE-10-progress.json",
        ],
        "notes": notes,
    }
    # The terminal status goes to stderr, not into the body: the result schema
    # is additionalProperties:false and record-result.py owns the status field.
    print(f"analyse-spike-10: status={status} days={days} denominator={denom}",
          file=sys.stderr)
    print(json.dumps(body, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
