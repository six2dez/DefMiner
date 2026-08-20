#!/usr/bin/env python3
"""Scan a run's raw channels for interrupt / timeout / abort signatures.

    python3 scripts/spike/scan-signals.py <run-dir> > signals.json

Why this is a separate script and not an inline shell helper: it must run AFTER
teardown, because teardown is what copies the structured host log out of the
data path before deleting it. Scanning before teardown silently omits the
largest and most informative channel, and the resulting "zero interrupt signals"
claim would rest on a fraction of the evidence it appears to.

Three channels are scanned separately and reported separately:
  * stdout — ANSI-coloured, --debug spans
  * stderr — where a C-level QuickJS abort() under panic="abort" lands, and
             the ONLY place it lands
  * logging.<date>.log — the structured host log, plain text, us-resolution UTC
"""
from __future__ import annotations

import json
import os
import re
import sys

PATTERNS = {
    "interrupt": r"interrupt",
    "timeout": r"timed?.?out|timeout",
    "regexp_error": r"RegExp|regex.*(too|limit|abort)",
    "stack_overflow": r"stack overflow|Maximum call stack",
    "abort_assertion": r"ref_count|gc_decref|Assertion failed|panicked|SIGABRT",
    "out_of_memory": r"out of memory|OutOfMemory|OOM",
}


def main() -> int:
    if len(sys.argv) < 2:
        sys.exit("usage: scan-signals.py <run-dir>")
    d = sys.argv[1]
    files = []
    for root in (d, os.path.join(d, "raw")):
        if not os.path.isdir(root):
            continue
        for name in sorted(os.listdir(root)):
            p = os.path.join(root, name)
            if os.path.isfile(p) and name.endswith(".log"):
                files.append(p)
    # De-duplicate by content size + basename stem, so the raw/ copies of stdout
    # and stderr are not counted twice and do not inflate the denominator.
    seen = set()
    unique = []
    for p in files:
        key = (os.path.getsize(p), os.path.basename(p).replace("-final", "").replace("caido.", "caido-"))
        if key in seen:
            continue
        seen.add(key)
        unique.append(p)

    out = {
        "run_dir": d,
        "files_scanned": [os.path.relpath(p, d) for p in unique],
        "lines_scanned": 0,
        "per_file_lines": {},
        "hits": {k: {"count": 0, "samples": []} for k in PATTERNS},
    }
    for p in unique:
        n = 0
        try:
            with open(p, errors="replace") as fh:
                for line in fh:
                    n += 1
                    for k, pat in PATTERNS.items():
                        if re.search(pat, line, re.I):
                            h = out["hits"][k]
                            h["count"] += 1
                            if len(h["samples"]) < 3:
                                h["samples"].append(
                                    os.path.basename(p) + ": " + line.strip()[:280])
        except Exception as exc:  # noqa: BLE001
            out.setdefault("errors", []).append(f"{os.path.basename(p)}: {exc}")
        out["per_file_lines"][os.path.relpath(p, d)] = n
        out["lines_scanned"] += n
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
