#!/usr/bin/env python3
"""Compute the SPIKE-10 content-hash cache hit rates OFFLINE from cache_log.

Three rates, because they answer three different questions:

  within_page   — the same content hash served more than once inside one page
                  load (a ~2 s window). Measures duplicate delivery.
  within_session— repeats inside one browsing session (default 30 min gap).
                  Measures what a warm browser tab saves.
  cross_day     — the same content hash seen on two or more DISTINCT calendar
                  days. THIS is the number that drives the CPU budget, and it is
                  the one a single burst can never produce, because it is a
                  property of how sites version and re-serve bundles across
                  deploys.

The cross-day DENOMINATOR is emitted explicitly as `cross_day_denominator`: the
count of distinct content hashes observed on two or more distinct calendar days.

A rate with a zero denominator is UNDEFINED, not zero, and the two are
completely different claims. "Undefined" means nothing repeated across days yet.
"0.0" asserts that caching measurably never works. Emitting the latter for the
former would mis-size Phase 1's CPU budget exactly as badly as over-reporting
it. Plan 00-04 routes a zero denominator to its inconclusive branch, which it
can only do if this field exists.

Usage:
    python3 scripts/spike/cache-rate.py [--db path] [--json] [--session-gap-min 30]
"""
from __future__ import annotations

import argparse
import datetime
import glob
import json
import sqlite3
import sys
from collections import defaultdict

DEFAULT_GLOB = ".spike/recorder-data/plugins/*/data.db"


def find_db(explicit: str | None) -> str | None:
    if explicit:
        return explicit
    hits = sorted(glob.glob(DEFAULT_GLOB))
    for h in hits:
        try:
            c = sqlite3.connect(f"file:{h}?mode=ro", uri=True)
            c.execute("SELECT 1 FROM cache_log LIMIT 1")
            return h
        except sqlite3.Error:
            continue
    return hits[0] if hits else None


def day_of(ts_ms: int) -> str:
    return datetime.datetime.fromtimestamp(ts_ms / 1000).strftime("%Y-%m-%d")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=None)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--session-gap-min", type=int, default=30)
    ap.add_argument("--page-window-s", type=int, default=2)
    args = ap.parse_args()

    path = find_db(args.db)
    if not path:
        out = {"error": "no recorder database found", "rows": 0}
        print(json.dumps(out) if args.json else out["error"])
        return 1

    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    rows = list(conn.execute(
        "SELECT ts, url, sha256, bytes FROM cache_log ORDER BY ts ASC"))

    if not rows:
        out = {"db": path, "rows": 0, "distinct_days": 0,
               "within_page": None, "within_session": None,
               "cross_day": None, "cross_day_denominator": 0,
               "note": "no rows recorded yet"}
        print(json.dumps(out, indent=2) if args.json else out["note"])
        return 0

    days = sorted({day_of(ts) for ts, _, _, _ in rows})

    # ---- within page load -------------------------------------------------
    # A repeat of the same hash inside a short window is a duplicate delivery
    # that a content-hash cache would have absorbed entirely.
    page_window_ms = args.page_window_s * 1000
    last_seen: dict[str, int] = {}
    page_hits = 0
    for ts, _url, sha, _b in rows:
        prev = last_seen.get(sha)
        if prev is not None and ts - prev <= page_window_ms:
            page_hits += 1
        last_seen[sha] = ts

    # ---- within session ---------------------------------------------------
    # Sessions are split on an inactivity gap rather than on wall-clock days,
    # because that is what a browsing session actually is.
    gap_ms = args.session_gap_min * 60 * 1000
    sessions: list[list[tuple]] = [[]]
    prev_ts = None
    for r in rows:
        if prev_ts is not None and r[0] - prev_ts > gap_ms:
            sessions.append([])
        sessions[-1].append(r)
        prev_ts = r[0]

    sess_total = 0
    sess_hits = 0
    for s in sessions:
        seen: set[str] = set()
        for _ts, _url, sha, _b in s:
            sess_total += 1
            if sha in seen:
                sess_hits += 1
            else:
                seen.add(sha)

    # ---- cross day --------------------------------------------------------
    # Denominator = distinct hashes seen on 2+ distinct days. Numerator = the
    # fetches of those hashes that were NOT the first sighting on their day, i.e.
    # the fetches a persistent content-hash cache would have avoided.
    hash_days: dict[str, set[str]] = defaultdict(set)
    for ts, _url, sha, _b in rows:
        hash_days[sha].add(day_of(ts))

    multiday = {h for h, ds in hash_days.items() if len(ds) >= 2}
    cross_day_denominator = len(multiday)

    first_day_seen: dict[str, str] = {}
    cross_total = 0
    cross_hits = 0
    for ts, _url, sha, _b in rows:
        d = day_of(ts)
        if sha not in first_day_seen:
            first_day_seen[sha] = d
            cross_total += 1
            continue
        cross_total += 1
        if d != first_day_seen[sha]:
            cross_hits += 1

    # UNDEFINED, not zero, when nothing has repeated across days.
    cross_day = round(cross_hits / cross_total, 4) if cross_day_denominator > 0 else None

    # ---- per-day cross-day rate, for stabilisation ------------------------
    # Plan 00-04 must be able to say whether the estimate has SETTLED rather
    # than assert a number from one day of data.
    per_day = []
    for d in days:
        upto = [r for r in rows if day_of(r[0]) <= d]
        fd: dict[str, str] = {}
        tot = hit = 0
        for ts, _u, sha, _b in upto:
            dd = day_of(ts)
            tot += 1
            if sha not in fd:
                fd[sha] = dd
            elif dd != fd[sha]:
                hit += 1
        md = len({h for h, ds in
                  ((h2, {day_of(t) for t, _u2, s2, _b2 in upto if s2 == h2})
                   for h2 in {s3 for _t3, _u3, s3, _b3 in upto}) if len(ds) >= 2})
        per_day.append({"day": d, "rows": tot,
                        "cross_day": round(hit / tot, 4) if md > 0 else None,
                        "cross_day_denominator": md})

    deltas = [abs(per_day[i]["cross_day"] - per_day[i - 1]["cross_day"])
              for i in range(1, len(per_day))
              if per_day[i]["cross_day"] is not None
              and per_day[i - 1]["cross_day"] is not None]
    last_delta = round(deltas[-1], 4) if deltas else None

    out = {
        "db": path,
        "rows": len(rows),
        "distinct_hashes": len(hash_days),
        "distinct_days": len(days),
        "days": days,
        "sessions": len(sessions),
        "within_page": round(page_hits / len(rows), 4),
        "within_page_hits": page_hits,
        "within_session": round(sess_hits / sess_total, 4) if sess_total else None,
        "within_session_hits": sess_hits,
        "cross_day": cross_day,
        "cross_day_hits": cross_hits,
        "cross_day_denominator": cross_day_denominator,
        "cross_day_undefined_reason": (
            None if cross_day_denominator > 0 else
            "No content hash has been observed on two or more distinct calendar "
            "days yet, so the cross-day rate is UNDEFINED — not zero. Zero would "
            "assert that caching measurably never works."
        ),
        "per_day": per_day,
        "cross_day_last_delta": last_delta,
        "stabilised": (last_delta is not None and last_delta < 0.05),
        "total_bytes": sum(b for _t, _u, _s, b in rows),
    }

    if args.json:
        print(json.dumps(out, indent=2))
    else:
        print(f"db                    {out['db']}")
        print(f"rows                  {out['rows']}")
        print(f"distinct hashes       {out['distinct_hashes']}")
        print(f"distinct days         {out['distinct_days']}  {days}")
        print(f"sessions              {out['sessions']}")
        print(f"within page load      {out['within_page']}")
        print(f"within session        {out['within_session']}")
        print(f"cross day             {out['cross_day']}"
              f"   (denominator {out['cross_day_denominator']})")
        if out["cross_day_undefined_reason"]:
            print(f"  ! {out['cross_day_undefined_reason']}")
        print(f"stabilised            {out['stabilised']} (last delta {last_delta})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
