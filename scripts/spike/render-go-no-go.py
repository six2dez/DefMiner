#!/usr/bin/env python3
"""Render 00-GO-NO-GO.md from results/go-no-go.json.

    python3 scripts/spike/render-go-no-go.py [--stdout]

00-GO-NO-GO.md IS GENERATED AND MUST NEVER BE HAND-EDITED. The exit gate
re-runs this into a temporary file and diffs, so an edit to the prose fails CI.
That is the whole point: the operator-readable table and the machine-readable
data cannot drift apart, because one is a pure function of the other.

Everything rendered comes from go-no-go.json ALONE — including the host and
binary provenance, which aggregate.py folds in for exactly this reason. If the
renderer reached into the per-spike results for anything, the render-and-diff
check would stop proving what it claims to prove.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

RESULTS = os.environ.get("OUT", ".planning/phases/00-runtime-reality-check/results")
AGGREGATE = os.path.join(RESULTS, "go-no-go.json")
TARGET = ".planning/phases/00-runtime-reality-check/00-GO-NO-GO.md"


def cell(text: str) -> str:
    """Make a string safe inside a markdown table cell."""
    return (str(text).replace("|", "\\|").replace("\n", " ").strip())


def fmt(value) -> str:
    if value is None:
        return "`null`"
    if isinstance(value, bool):
        return f"`{str(value).lower()}`"
    return f"`{value}`"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stdout", action="store_true")
    ap.add_argument("--out", default=TARGET)
    args = ap.parse_args()

    if not os.path.isfile(AGGREGATE):
        sys.exit(f"render-go-no-go: {AGGREGATE} missing — run scripts/spike/aggregate.py")
    with open(AGGREGATE) as fh:
        d = json.load(fh)

    prov = d.get("provenance", {})
    binary = prov.get("binary", {})
    host = prov.get("host", {})
    gates = d["gates"]
    thresholds = d["thresholds"]
    unresolved = d.get("unresolved", [])

    L: list[str] = []
    w = L.append

    w("<!-- GENERATED FILE — DO NOT EDIT.")
    w("     Produced by scripts/spike/render-go-no-go.py from")
    w("     .planning/phases/00-runtime-reality-check/results/go-no-go.json.")
    w("     tests/go-no-go.spec.ts re-runs the renderer and diffs, so any hand edit fails CI.")
    w("-->")
    w("")
    w("# Phase 0 — Go / No-Go")
    w("")
    w(f"Every threshold below was measured against **Caido {d['caido_version']}** on this "
      f"machine. This file and the JSON beside it are the only Phase 0 artifacts later "
      f"phases may import.")
    w("")

    # ---- provenance -------------------------------------------------------
    w("## Provenance")
    w("")
    w("| Field | Value |")
    w("| --- | --- |")
    w(f"| Binary | `{cell(binary.get('path', 'unknown'))}` |")
    w(f"| Version reported | `{cell(binary.get('reported_version', 'unknown'))}` |")
    w(f"| Version expected | `{cell(binary.get('expected_version', 'unknown'))}` |")
    w(f"| Binary SHA-256 | `{cell(binary.get('sha256', 'unknown'))}` |")
    w(f"| Host | {cell(host.get('os', '?'))} {cell(host.get('release', '?'))} "
      f"/ {cell(host.get('arch', '?'))} |")
    w(f"| CPU | {cell(host.get('cpu', '?'))} ({cell(host.get('cores', '?'))} cores) |")
    w(f"| RAM | {cell(host.get('ram_gb', '?'))} GB |")
    w(f"| Generated | `{cell(d['generated_at'])}` |")
    w("")
    w("Bare `caido-cli` on this machine resolves to a stale 0.55.3. Every measurement here "
      "was taken through the absolute app-bundle path above, asserted before the run rather "
      "than checked afterwards.")
    w("")

    # ---- the contract -----------------------------------------------------
    w("## The contract Phase 1 must satisfy")
    w("")
    w("This is a requirement, not a suggestion.")
    w("")
    w("**Every tunable constant in the engine imports its value from `go-no-go.json` and is "
      "asserted equal to it by a test in the SDK-free engine workspace.** A developer who "
      "tunes a constant without re-measuring fails CI.")
    w("")
    w("The mechanism matters as much as the rule. A constant copied into source drifts "
      "silently the first time someone tunes it to make a test pass; a constant imported and "
      "asserted cannot. Where a threshold is `null` with status `inconclusive`, the engine "
      "imports the accompanying assumed value and the test asserts THAT, so the placeholder "
      "is visible in code review rather than buried in a comment.")
    w("")

    # ---- gates ------------------------------------------------------------
    w(f"## Gates ({len(gates)})")
    w("")
    w("One per Phase 0 requirement id. `Blocks` names the downstream requirements each "
      "answer unlocks.")
    w("")
    for g in gates:
        w(f"### {g['spike']} — {g['status'].upper()}")
        w("")
        w(f"**Question.** {g['question']}")
        w("")
        w(f"**Answer.** {g['answer']}")
        w("")
        blocks = (", ".join(f"`{b}`" for b in g["blocks"])
                  if g["blocks"] else "_(none recorded)_")
        w(f"**Blocks.** {blocks}")
        w("")
        w(f"**What changes if this is wrong.** {g['changes_if_wrong']}")
        w("")
        owned = sorted(k for k, v in thresholds.items() if v["spike"] == g["spike"])
        if owned:
            w("**Thresholds set.**")
            w("")
            w("| Threshold | Value | Unit | Confidence |")
            w("| --- | --- | --- | --- |")
            for k in owned:
                t = thresholds[k]
                w(f"| `{k}` | {fmt(t['value'])} | {cell(t['unit'])} | "
                  f"`{cell(t['confidence'])}` |")
            w("")

    # ---- thresholds -------------------------------------------------------
    w(f"## All thresholds ({len(thresholds)})")
    w("")
    w("| Threshold | Value | Unit | Spike | Confidence | Status |")
    w("| --- | --- | --- | --- | --- | --- |")
    for k in sorted(thresholds):
        t = thresholds[k]
        w(f"| `{k}` | {fmt(t['value'])} | {cell(t['unit'])} | `{t['spike']}` | "
          f"`{cell(t['confidence'])}` | `{cell(t.get('status', 'resolved'))}` |")
    w("")

    w("### Rationales")
    w("")
    w("Why each value is what it is. A threshold nobody can re-derive is a number nobody "
      "should trust.")
    w("")
    for k in sorted(thresholds):
        t = thresholds[k]
        if not t.get("rationale"):
            continue
        w(f"- **`{k}`** = {fmt(t['value'])} — {t['rationale']}"
          + (f" _Revisit after {t['revisit_after']}._" if t.get("revisit_after") else ""))
    w("")

    # ---- unresolved -------------------------------------------------------
    w(f"## Unresolved ({len(unresolved)})")
    w("")
    if not unresolved:
        w("None. Every threshold in the phase resolved to a measured value.")
    else:
        w("A measurement that could not be taken is honest output. Each entry below carries "
          "the date by which it must be taken.")
        w("")
        for u in unresolved:
            w(f"### `{u['id']}`")
            w("")
            w(f"**Revisit after.** `{u.get('revisit_after', 'unspecified')}`")
            w("")
            w(f"{u['why']}")
            w("")
    w("")

    # ---- source runs ------------------------------------------------------
    w("## Source runs")
    w("")
    w("Every gate traces to the disposable instances that produced it. Distinct run ids "
      "within a spike are what prove no two measurements shared a runtime.")
    w("")
    w("| Spike | Instances | Run ids |")
    w("| --- | --- | --- |")
    for spike in sorted(d["source_runs"], key=lambda s: (s[:9], s)):
        runs = d["source_runs"][spike]
        w(f"| `{spike}` | {len(runs)} | {cell(', '.join(f'`{r}`' for r in runs))} |")
    w("")

    text = "\n".join(L)
    if not text.endswith("\n"):
        text += "\n"

    if args.stdout:
        sys.stdout.write(text)
    else:
        with open(args.out, "w") as fh:
            fh.write(text)
        print(f"wrote {args.out} ({len(L)} lines)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
