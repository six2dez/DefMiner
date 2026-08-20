#!/usr/bin/env python3
"""Choose SPIKE-04b's send reference, leg size and wrapper shape.

    eval "$(python3 scripts/spike/pick-04b-reference.py \
              <save-true-run.json> <retain-control-run.json> <cap>)"

Emits shell assignments: REF, LEG, RETAIN_04B, REF_SOURCE.

SPIKE-04b asks whether toggling a plugin off and on RESETS the #2211 leak. That
question is only answerable on a shape that leaks. The three SPIKE-04 variants
follow ACTIVE-09's discipline — wrappers reduced to primitives, never retained
across an await — which is precisely the mitigation for live wrapper pressure,
so a clean run there says the mitigation works, not that the leak is absent.

Preference order, and each branch says so in REF_SOURCE so the choice survives
into the result rather than being re-derived from the raw runs:

  1. the retain-shape control cliffed  -> use it, run 04b in retain mode at 80%
     of the cliff, leaving room for three legs below it
  2. the disciplined save:true run cliffed -> use that cliff, disciplined mode
  3. neither cliffed -> there is no leak to reset within the cap. Use the
     disciplined floor and say plainly that it is a floor, not a cliff.
"""
from __future__ import annotations

import json
import os
import sys

FAILED = ("abort", "stall", "partial", "error")


def cliff_of(path: str) -> int | None:
    """Sends completed before a REAL failure, or None if the run stayed clean."""
    if not os.path.isfile(path):
        return None
    with open(path) as fh:
        d = json.load(fh)
    if d.get("failure_mode") in FAILED:
        return int(d.get("sends_completed", 0))
    return None


def floor_of(path: str, cap: int) -> int:
    if not os.path.isfile(path):
        return cap
    with open(path) as fh:
        d = json.load(fh)
    return int(d.get("sends_completed", cap))


def main() -> int:
    if len(sys.argv) < 4:
        sys.exit("usage: pick-04b-reference.py <disciplined-run> <control-run> <cap>")
    disciplined, control, cap = sys.argv[1], sys.argv[2], int(sys.argv[3])

    ctrl = cliff_of(control)
    disc = cliff_of(disciplined)

    if ctrl:
        ref, leg, retain, source = ctrl, max(10, (ctrl * 4) // 5), "true", "retain-control-cliff"
    elif disc:
        ref, leg, retain, source = disc, max(10, disc - 10), "false", "save-true-cliff"
    else:
        n = floor_of(disciplined, cap)
        ref, leg, retain, source = n, n, "false", "save-true-floor-no-cliff"

    print(f"REF={ref}; LEG={leg}; RETAIN_04B={retain}; REF_SOURCE={source}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
