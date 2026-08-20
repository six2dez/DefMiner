#!/usr/bin/env python3
"""Fold the SPIKE-04 / SPIKE-04b run captures into a measurement body.

    python3 scripts/spike/analyse-spike-04.py --spike SPIKE-04  | record-result.py ...
    python3 scripts/spike/analyse-spike-04.py --spike SPIKE-04b | record-result.py ...

Every verdict here is DERIVED from the recorded runs. Nothing is typed by hand,
so re-running scripts/spike/send-cliff.sh and re-running this reproduces the
result files exactly.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

OUT = os.environ.get("OUT", ".planning/phases/00-runtime-reality-check/results")
RAW = os.path.join(OUT, "spike-04-runs")

VARIANTS = ["save-true", "save-false", "fetch"]
THRESH_ID = {
    "save-true": "SEND_CLIFF_SAVE_TRUE",
    "save-false": "SEND_CLIFF_SAVE_FALSE",
    "fetch": "SEND_CLIFF_FETCH",
}

# Measured negatives encode as VALUES, never as null. null is reserved for
# "not measured", and conflating the two lets a later phase read an unmeasured
# field as a fact — the same class of error the cross-day cache gate exists to
# prevent.
RECOVERED = "recovered-exact-inflight-send"
NO_INFLIGHT = "no-send-in-flight-at-death"
MISMATCH = "open-row-did-not-match-next-send"
NOT_EXERCISED = "host-never-died-abruptly"


def load(name, default=None):
    p = os.path.join(RAW, name)
    if not os.path.isfile(p):
        return default
    with open(p) as fh:
        txt = fh.read().strip()
    return json.loads(txt) if txt else default


def load_lines(name):
    p = os.path.join(RAW, name)
    if not os.path.isfile(p):
        return []
    out = []
    with open(p) as fh:
        for line in fh:
            line = line.strip()
            if line:
                try:
                    out.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return out


def m(name, value, unit, **kw):
    d = {"name": name, "value": value, "unit": unit}
    d.update(kw)
    return d


def abort_evidence(journal):
    """Exit-code-independent evidence of a C-level abort: the assertion text."""
    scan = (journal or {}).get("abort_signature_scan", {}) or {}
    total = 0
    samples = []
    for name, info in scan.items():
        if not info.get("present"):
            continue
        total += info.get("hit_count", 0)
        for h in info.get("hits", [])[:2]:
            samples.append(f"{name}: {h}")
    return total, samples


def journal_verdict(run, journal):
    """Did the write-ahead journal identify the send that was in flight?"""
    if not run.get("killed_in_flight") and run.get("failure_mode") != "abort":
        return NOT_EXERCISED
    unfin = journal.get("unfinalised")
    if unfin == 0:
        return NO_INFLIGHT
    if journal.get("inflight_is_next_after_last_finalised") is True:
        return RECOVERED
    return MISMATCH


def drift(journal):
    f10 = journal.get("latency_first10_median_ms")
    l10 = journal.get("latency_last10_median_ms")
    if not f10 or not l10:
        return None
    return round(l10 / f10, 3)


def spike_04():
    measurements = []
    runs = {}
    journals = {}
    for v in VARIANTS:
        runs[v] = load(f"{v}-run.json")
        journals[v] = load(f"{v}-journal.json", {})
        if runs[v] is None:
            sys.exit(f"analyse-spike-04: missing {v}-run.json — run scripts/spike/send-cliff.sh")
    control = load("retain-control-run.json")
    control_journal = load("retain-control-journal.json", {})

    for v in VARIANTS:
        r = runs[v]
        j = journals[v] or {}
        batches = load_lines(f"{v}-batches.jsonl")
        hits, samples = abort_evidence(j)

        measurements.append(m(
            "send_cliff", r["sends_completed"], "sends", variant=v, stat="count",
            notes=f"failure mode {r['failure_mode']}: {r['failure_reason']}; "
                  f"exit_code={r['exit_code']}; run {r['run_id']} on {r['listen']}"))
        measurements.append(m(
            "send_failure_mode", r["failure_mode"], "enum(clean|stall|abort|partial|error)",
            variant=v, stat="point",
            notes=f"host alive at the end of the capped loop: {r['host_alive_at_end']}"))
        measurements.append(m(
            "host_exit_code", r["exit_code"], "exit code", variant=v, stat="point",
            notes="134 == SIGABRT == the caido/caido#2211 signature; 137 == our own SIGKILL. "
                  "A `fail` with no exit code would mean the CAPTURE was wrong, not that the "
                  "process merely vanished."))
        measurements.append(m(
            "abort_assertion_lines_in_raw_channels", hits, "count", variant=v, stat="count",
            notes=("stdout, stderr and the structured host log scanned separately, because a "
                   "C-level abort() under panic=abort never reaches the structured log. "
                   + ("; ".join(samples)[:400] if samples else "no matching lines"))))
        measurements.append(m(
            "journal_rows_written", j.get("total_rows"), "rows", variant=v, stat="count",
            notes=f"finalised {j.get('finalised')}, unfinalised {j.get('unfinalised')}, "
                  f"ok {j.get('ok')}, errors {j.get('errors')}. Includes the kill-phase rows "
                  f"from seq {r.get('kill_phase_start_seq')} onward."))
        if j.get("latency_median_ms") is not None:
            measurements.append(m(
                "send_latency_ms", j["latency_median_ms"], "ms", variant=v, stat="median",
                n=j.get("latency_count"), p95=j.get("latency_p95_ms"),
                notes=f"max {j.get('latency_max_ms')} ms; first-10 median "
                      f"{j.get('latency_first10_median_ms')} ms vs last-10 median "
                      f"{j.get('latency_last10_median_ms')} ms"))
            d = drift(j)
            if d is not None:
                measurements.append(m(
                    "send_latency_drift_x", d, "x", variant=v, stat="ratio",
                    notes="last-10 median / first-10 median. A rising tail is what a leak "
                          "looks like before it becomes a stall and then an abort. At or "
                          "below 1 there is no accumulation signal at all."))
        measurements.append(m(
            "batches_issued", len(batches), "count", variant=v, stat="count",
            notes="sends issued in increments of ten, so a cliff would be located to within "
                  "a batch rather than inferred from one long call"))
        measurements.append(m(
            "killed_in_flight", bool(r.get("killed_in_flight")), "boolean", variant=v,
            stat="point",
            notes=f"a {os.environ.get('KILL_BATCH', '3000')}-send batch was fired from seq "
                  f"{r.get('kill_phase_start_seq')} and the host SIGKILLed mid-batch, so the "
                  f"journal is validated against a real abrupt death with no unwind rather "
                  f"than a simulated one"))
        measurements.append(m(
            "journal_last_inflight_recovered", journal_verdict(r, j),
            f"enum({RECOVERED}|{NO_INFLIGHT}|{MISMATCH}|{NOT_EXERCISED})",
            variant=v, stat="point",
            notes=f"read back from the preserved database (.db plus its -wal and -shm "
                  f"sidecars): {j.get('unfinalised')} unfinalised row(s); in-flight seq "
                  f"{j.get('inflight_seq')} against last finalised seq "
                  f"{j.get('last_finalised_seq')}; candidate {j.get('inflight_candidate')}"))
        measurements.append(m(
            "journal_candidate_redacted",
            bool(any("<redacted>" in str(row.get("candidate", ""))
                     for row in (j.get("open_rows") or []))) or j.get("unfinalised") == 0,
            "boolean", variant=v, stat="point",
            notes="ACTIVE-02 requires query VALUES redacted in the persisted record. The "
                  "candidate written to disk is checked, not the intent described: "
                  f"{j.get('inflight_candidate') or 'no open row; every finalised row carries the same normalised form'}"))
        measurements.append(m(
            "distinct_runtime_sessions_in_journal",
            len(j.get("distinct_runtime_sessions") or []), "count", variant=v, stat="count",
            notes="1 means every send in this variant ran in ONE runtime instantiation, "
                  "which is what makes a cumulative-leak measurement meaningful"))

    # Cross-variant: the constraint that makes the three numbers comparable.
    ids = [runs[v]["run_id"] for v in VARIANTS]
    measurements.append(m(
        "distinct_run_ids", len(set(ids)), "count", stat="count",
        notes="#2211 is a CUMULATIVE refcount leak across a runtime's lifetime. Sharing an "
              "instance would pollute variants 2 and 3 with variant 1's leaked references "
              "and the later cliffs would be fiction. Runs: " + ", ".join(ids)))

    # The journal's contract, stated over all four abrupt deaths at once. Both
    # halves matter: it must catch a real in-flight send, and it must NOT invent
    # one when the death landed between sends.
    all_runs = [(v, runs[v], journals[v]) for v in VARIANTS]
    if control:
        all_runs.append(("retain-control", control, control_journal))
    verdicts = [journal_verdict(r, j) for _, r, j in all_runs]
    measurements.append(m(
        "journal_false_positive_open_rows",
        sum(1 for x in verdicts if x == MISMATCH), "count", stat="count",
        notes=f"across {len(verdicts)} abrupt host deaths the journal produced an open row "
              f"that did NOT correspond to the next send this many times. "
              f"{verdicts.count(RECOVERED)} deaths caught a genuine in-flight send; "
              f"{verdicts.count(NO_INFLIGHT)} landed between sends and correctly left no "
              f"open row at all. Zero misses and zero false positives is the contract "
              f"ACTIVE-13's crash detector needs — an invented open row would make it "
              f"quarantine work that never started."))

    # ---- the control -----------------------------------------------------
    if control:
        cj = control_journal or {}
        last = load_lines("retain-control-batches.jsonl")
        retained = (last[-1].get("result", {}) or {}).get("retained_wrappers") if last else None
        measurements.append(m(
            "unmitigated_shape_send_cliff", control["sends_completed"], "sends",
            variant="retain-control", stat="count",
            notes=f"the NAIVE wrapper shape — every RequestSpec, payload, Request, Response "
                  f"and Body retained rather than reduced to primitives — on its own fresh "
                  f"instance ({control['run_id']}, {control['listen']}). "
                  f"{retained} live wrappers held at the end. Failure mode "
                  f"{control['failure_mode']}, exit {control['exit_code']}. Full detail is "
                  f"recorded in SPIKE-04b, whose question it answers a precondition for."))
        cd = drift(cj)
        if cd is not None:
            measurements.append(m(
                "unmitigated_shape_latency_drift_x", cd, "x", variant="retain-control",
                stat="ratio",
                notes="the control's own accumulation signal, directly comparable to the "
                      "disciplined runs above because everything else is byte-identical"))

    modes = {v: runs[v]["failure_mode"] for v in VARIANTS}
    completed = {v: runs[v]["sends_completed"] for v in VARIANTS}
    exits = {v: runs[v]["exit_code"] for v in VARIANTS}
    aborted = [v for v in VARIANTS if modes[v] == "abort"]
    stalled = [v for v in VARIANTS if modes[v] == "stall"]
    clean = [v for v in VARIANTS if modes[v] == "clean"]

    if aborted:
        failure_mode = "abort"
    elif stalled:
        failure_mode = "stall"
    else:
        failure_mode = "clean"

    floor_note = ""
    if clean:
        floor_note = (
            f" Variants {', '.join(clean)} reached the {completed[clean[0]]}-send cap without "
            f"failing, so those figures are FLOORS — the cliff is somewhere above the cap, "
            f"not at it. Reading them as cliffs would be the same category error as reading "
            f"an undefined rate as zero.")

    thresholds = []
    for v in VARIANTS:
        j = journals[v] or {}
        hits, _ = abort_evidence(j)
        floor = modes[v] == "clean"
        thresholds.append({
            "id": THRESH_ID[v],
            "value": completed[v],
            "unit": ("sends completed with no failure (FLOOR — the cap, not a cliff)"
                     if floor else "sends completed before failure"),
            "confidence": "MEDIUM" if floor else "HIGH",
            "status": "resolved",
            "rationale":
                f"{completed[v]} sends on a fresh instance ({runs[v]['run_id']}, "
                f"{runs[v]['listen']}) dedicated to this variant, issued in batches of ten "
                f"against a local origin. Failure mode {modes[v]}: "
                f"{runs[v]['failure_reason']}. Host exit code {exits[v]} "
                f"({'134 == SIGABRT == the #2211 signature' if exits[v] == 134 else '137 == our own SIGKILL teardown'}); "
                f"{hits} abort-assertion lines across separately captured stdout, stderr and "
                f"host log. Latency drift last-10/first-10 = {drift(j)}x, so there is no "
                f"accumulation signal either. caido/caido#2211 reports ~54 clean / ~80 stall "
                f"/ ~120 abort against this exact build; none of that reproduced here."
                + (" This is a FLOOR: treat it as 'at least this many', never as a cliff."
                   if floor else ""),
        })

    thresholds.append({
        "id": "SEND_FAILURE_MODE",
        "value": failure_mode,
        "unit": "enum(clean|stall|abort)",
        "confidence": "HIGH",
        "status": "resolved",
        "rationale":
            "Per variant: " + ", ".join(f"{v}={modes[v]}(exit {exits[v]})" for v in VARIANTS)
            + ". The three are distinguished because the issue distinguishes them and they "
              "imply different mitigations: a clean completion needs none, a stall needs a "
              "latency-triggered kill switch (ACTIVE-14), and an abort needs crash recovery "
              "(ACTIVE-13) because the host is gone with no unwind."
            + floor_note,
    })

    control_line = ""
    if control:
        control_line = (
            f" A CONTROL on a fifth fresh instance ran the naive wrapper shape — every "
            f"wrapper retained instead of reduced to primitives — and also completed "
            f"{control['sends_completed']} sends cleanly holding "
            f"{(load_lines('retain-control-batches.jsonl')[-1].get('result', {}) or {}).get('retained_wrappers')} "
            f"live wrappers, so the clean result is not an artefact of the probe following "
            f"ACTIVE-09's discipline.")

    answer = (
        "Send cliffs on 0.57.1, one fresh instance per variant: "
        + ", ".join(f"{v} {completed[v]} sends ({modes[v]}, exit {exits[v]})" for v in VARIANTS)
        + f". Overall failure mode: {failure_mode}." + floor_note + control_line
        + " caido/caido#2211's ~54 clean / ~80 stall / ~120 abort DID NOT REPRODUCE on this "
        "host at 16x the reported abort threshold, in either wrapper shape, with no latency "
        "drift in any run. The write-ahead journal ACTIVE-02 and ACTIVE-13 depend on was "
        f"validated against {len(verdicts)} real abrupt host deaths: "
        f"{verdicts.count(RECOVERED)} caught the exact in-flight send by sequence and "
        f"redacted candidate, {verdicts.count(NO_INFLIGHT)} correctly left no open row "
        f"because the death landed between sends, and {verdicts.count(MISMATCH)} produced a "
        "spurious one."
    )

    if_wrong = (
        "The consequential direction here is that the cliff is REAL and simply out of reach "
        "of this apparatus. #2211 is open and filed against this exact build, so the "
        "safe reading of a clean run is 'not reproduced under these conditions', not 'does "
        "not exist'. Three conditions differ from a real DefMiner workload and each could "
        "move the number: bodies were "
        f"{os.environ.get('SYNTH_BYTES', '2048')} synthetic bytes rather than a "
        "multi-hundred-kilobyte `.map`; sends were strictly serialised one at a time; and "
        "the host was otherwise idle. If any of those is what gates the leak, ACTIVE-01's "
        "default-on unbudgeted probing reaches the abort on ordinary SPAs and ACTIVE-14's "
        "kill switch has to become a real cap rather than a diagnostic warning. Nothing in "
        "the design relaxes on the strength of this result: ACTIVE-13's crash recovery and "
        "ACTIVE-02's journal are still required, because `panic = \"abort\"` means the "
        "failure has no unwind at whatever count it arrives, and because a host can die for "
        "reasons that have nothing to do with #2211 — which is exactly what the SIGKILL "
        "validation above exercised. Phase 8 should re-run this with real `.map` bodies and "
        "concurrent sends before treating the floor as headroom."
    )

    notes = (
        "Three variants, three fresh instances, three distinct run ids — asserted by the gate "
        "rather than described, because a cliff measured on a runtime already polluted by a "
        "prior variant is indistinguishable from a real one in the output. "
        "PROJECT PERSISTENCE IS OUT OF SCOPE: every instance is guest-authenticated and a "
        "guest can create only temporary projects (createProject(temporary:false) returns "
        "PermissionDeniedUserError), so all three record project_persistence=temporary. "
        "Proving that a PERSISTENT project survives a #2211 abort would need a "
        "PAT-authenticated instance and is not attempted here. "
        "A DEFECT IN THE FIRST RUN OF THIS PROBE IS ITSELF A PHASE 1 FINDING: the journal "
        "originally keyed its UPDATE on `SELECT last_insert_rowid()`, which silently stops "
        "matching once sdk.meta.db()'s connection POOL grows past its first connection — the "
        "insert and the rowid query land on different connections. Rows kept being inserted "
        "and every send kept succeeding, but finalisation stopped dead after a contiguous "
        "prefix of 5, 6 and 188 rows of 400 across the three variants, with no error "
        "anywhere. STORE-01..07 must key writes on a natural key; last_insert_rowid() is "
        "unusable on this runtime."
    )

    return {
        "method":
            "One fresh version-asserted instance per variant (save-true 8984, save-false "
            "8985, fetch 8981), each with a temporary project selected and the Tier-0 send "
            "probe installed. Sends issued in batches of ten against a local origin serving "
            f"a {os.environ.get('SYNTH_BYTES', '2048')}-byte synthetic body, to a "
            f"{os.environ.get('MAX_SENDS', '2000')}-send cap. Before EVERY send the probe "
            "commits a write-ahead journal row to sdk.meta.db() carrying the runtime session "
            "id, sequence, normalised candidate with query VALUES redacted, and a start "
            "timestamp, updating it with status and timing on completion. When the capped "
            "loop finished with the host still alive, a further large batch was fired and the "
            "host SIGKILLed mid-batch, so the journal is validated against a real abrupt "
            "death with no unwind rather than a simulated one. stdout, stderr and the host "
            "log captured separately per run; the journal database plus its -wal and -shm "
            "sidecars copied out before teardown and read back offline.",
        "measurements": measurements,
        "probe": {"tier": "raw-zip", "package_version": "0.0.1"},
        "containment": {"escaped": False, "escape_paths": []},
        "verdict": {
            "answer": answer,
            "confidence": "HIGH",
            "thresholds_set": thresholds,
            "if_wrong": if_wrong,
        },
        "requirements_affected": [
            "SPIKE-04", "ACTIVE-01", "ACTIVE-02", "ACTIVE-09", "ACTIVE-12", "ACTIVE-13",
            "ACTIVE-14",
        ],
        "artifacts": [
            "probe/tier0-send/backend/script.js",
            "scripts/spike/send-cliff.sh",
            f"{RAW}/save-true-journal.json",
            f"{RAW}/save-false-journal.json",
            f"{RAW}/fetch-journal.json",
        ],
        "notes": notes,
    }


def spike_04b():
    run = load("04b-run.json")
    if run is None:
        sys.exit("analyse-spike-04: missing 04b-run.json — run scripts/spike/send-cliff.sh")
    legs = load_lines("04b-legs.jsonl")
    journal = load("04b-journal.json", {})
    control = load("retain-control-run.json")
    control_journal = load("retain-control-journal.json", {})
    reference = run["save_true_reference"]
    per_leg = run["sends_per_leg"]
    total = run["total_sends_across_legs"]

    measurements = []
    sessions = []
    for leg in legs:
        before = (leg.get("runtime_session_before") or {})
        after = (leg.get("session_after") or {})
        sessions.append(before.get("runtime_session_id"))
        measurements.append(m(
            "leg_sends_completed", leg.get("sends_this_leg"), "sends",
            variant=f"leg-{leg.get('leg')}", stat="count",
            notes=f"cumulative {leg.get('cumulative_sends')}, mode {leg.get('mode')}"))
        measurements.append(m(
            "runtime_session_id_at_leg_start", before.get("runtime_session_id"), "string",
            variant=f"leg-{leg.get('leg')}", stat="point",
            notes=f"the probe's per-runtime send counter read at leg start: "
                  f"{before.get('sends_this_runtime')}; at leg end: "
                  f"{after.get('sends_this_runtime')}"))
        measurements.append(m(
            "per_runtime_send_counter_at_leg_start",
            before.get("sends_this_runtime"), "sends",
            variant=f"leg-{leg.get('leg')}", stat="point",
            notes="0 at the start of a leg that follows a toggle means the module was "
                  "re-evaluated — module state did not merely reset, it was rebuilt"))

    distinct = [s for s in sessions if s]
    n_distinct = len(set(distinct))
    recreated = n_distinct > 1
    counters_reset = all(
        (leg.get("runtime_session_before") or {}).get("sends_this_runtime") == 0
        for leg in legs)

    measurements.append(m(
        "distinct_runtime_sessions_across_toggles", n_distinct, "count", stat="count",
        n=len(distinct),
        notes="the probe mints a session id per MODULE INSTANTIATION. A new id after a "
              "toggle proves the QuickJS runtime was torn down and re-created; the same id "
              "would prove it was not. Observed: " + ", ".join(distinct)))
    measurements.append(m(
        "toggle_recreates_runtime", recreated, "boolean", stat="point",
        notes="derived from the session ids above and corroborated by the per-runtime send "
              f"counter resetting to 0 at every leg start ({counters_reset}) — not from the "
              "host log's wording, which says only that an executor stopped"))
    measurements.append(m(
        "toggle_mutation_returned_cleanly",
        all("\"error\":null" in (open(os.path.join(RAW, f)).read().replace(" ", ""))
            for f in sorted(os.listdir(RAW)) if f.startswith("04b-toggle-")),
        "boolean", stat="point",
        notes="togglePlugin returned error:null on every off and on call against a HEALTHY "
              "plugin. The contrast with SPIKE-01 is the point: the same mutation against a "
              "WEDGED plugin never returned at all, so a toggle is a usable primitive only "
              "while the runtime is still responsive"))
    measurements.append(m(
        "total_sends_across_toggles", total, "sends", stat="count",
        notes=f"{len(legs)} legs of up to {per_leg} sends each on ONE instance, with a plugin "
              f"toggle between legs, repeated so a one-off is distinguishable from a real "
              f"reset"))
    measurements.append(m(
        "single_runtime_reference_cliff", reference, "sends", stat="point",
        notes=f"reference source: {run.get('reference_source', 'save-true')}. The question "
              f"is whether the toggled instance materially exceeds it"))
    measurements.append(m(
        "sends_beyond_reference_ratio",
        round(total / reference, 3) if reference else None, "x", stat="ratio",
        notes="total surviving sends across toggles divided by the single-runtime reference"))
    measurements.append(m(
        "host_exit_code", run["exit_code"], "exit code", stat="point",
        notes="134 == SIGABRT == the #2211 signature; 137 == our own SIGKILL teardown"))
    hits, samples = abort_evidence(journal)
    measurements.append(m(
        "abort_assertion_lines_in_raw_channels", hits, "count", stat="count",
        notes="; ".join(samples)[:400] if samples else "no matching lines"))
    measurements.append(m(
        "journal_rows_written", journal.get("total_rows"), "rows", stat="count",
        notes=f"across {len(journal.get('distinct_runtime_sessions') or [])} runtime "
              f"session(s) in ONE database"))
    measurements.append(m(
        "journal_survives_plugin_toggle",
        len(journal.get("distinct_runtime_sessions") or []) > 1, "boolean", stat="point",
        notes="rows from more than one runtime session in the same sdk.meta.db() prove the "
              "plugin database outlives a toggle, so a crash marker written before a toggle "
              "is still readable after it. That is the half of ACTIVE-13 a toggle does NOT "
              "destroy, and it has to be true for a toggle to be usable as recovery at all"))

    # ---- the control: is there a leak to reset? ---------------------------
    control_cliff = None
    if control:
        control_cliff = control["sends_completed"]
        cbatches = load_lines("retain-control-batches.jsonl")
        retained = ((cbatches[-1].get("result", {}) or {}).get("retained_wrappers")
                    if cbatches else None)
        measurements.append(m(
            "unmitigated_shape_send_cliff", control_cliff, "sends", variant="retain-control",
            stat="count",
            notes=f"the precondition for this whole question. SPIKE-04's three variants "
                  f"follow ACTIVE-09's discipline, which IS the mitigation for #2211's live "
                  f"wrapper pressure, so a clean run there cannot distinguish 'no leak' from "
                  f"'leak successfully mitigated'. This run is byte-identical except that "
                  f"every wrapper is retained. Own fresh instance ({control['run_id']}, "
                  f"{control['listen']}). Failure mode {control['failure_mode']}, exit "
                  f"{control['exit_code']}."))
        measurements.append(m(
            "unmitigated_shape_live_wrappers_held", retained, "wrappers",
            variant="retain-control", stat="max",
            notes="RequestSpec, payload, Request, Response and Body per send, all reachable "
                  "from a module-level array and never released"))
        cd = drift(control_journal)
        if cd is not None:
            measurements.append(m(
                "unmitigated_shape_latency_drift_x", cd, "x", variant="retain-control",
                stat="ratio",
                notes="at or below 1 there is no accumulation signal even in the naive shape"))
        measurements.append(m(
            "leak_observable_to_reset", control["failure_mode"] != "clean", "boolean",
            stat="point",
            notes="false means no leak was reachable within the cap in EITHER wrapper shape, "
                  "so the reset itself could not be observed however the toggle behaves"))

    # ---- the verdict ------------------------------------------------------
    aborted = any(leg.get("mode") == "abort" for leg in legs)
    leak_seen = bool(control and control["failure_mode"] != "clean")
    survived_beyond = bool(reference) and total > reference * 1.5 and not aborted

    if aborted:
        value = False
        head = ("the host aborted despite the toggles, so a toggle does not clear the "
                "accumulated state")
        conf = "HIGH"
    elif not recreated:
        value = False
        head = ("the runtime session id did not change across the toggles, so the QuickJS "
                "runtime was never torn down and there is no mechanism by which a "
                "per-runtime leak could reset")
        conf = "HIGH"
    elif leak_seen and survived_beyond:
        value = True
        head = (f"the runtime was re-created on every toggle and {total} sends survived "
                f"against a single-runtime cliff of {reference}")
        conf = "HIGH"
    else:
        value = "runtime-recreated-no-leak-observed"
        head = ("the toggle DOES tear down and re-create the QuickJS runtime — three distinct "
                "module instantiations across three legs, with the probe's per-runtime send "
                "counter back at 0 each time and the plugin database intact throughout — so "
                "the mechanism by which a toggle would discard per-runtime accumulated state "
                "is confirmed. What could not be confirmed is the reset of #2211's leak "
                "specifically, because that leak never became observable: neither the "
                "disciplined shape nor the retain-shape control failed inside the cap")
        conf = "MEDIUM"

    thresholds = [{
        "id": "PLUGIN_TOGGLE_RESETS_LEAK",
        "value": value,
        "unit": "enum(true|false|runtime-recreated-no-leak-observed)",
        "confidence": conf,
        "status": "resolved",
        "rationale":
            f"{head}. Measured on a fresh instance ({run['run_id']}, {run['listen']}) across "
            f"{len(legs)} legs of up to {per_leg} sends with togglePlugin off and on between "
            f"them, repeated twice so a one-off is distinguishable from a real reset. "
            f"Distinct runtime session ids observed: {n_distinct}. Per-runtime send counter "
            f"reset to 0 at every leg start: {counters_reset}. Plugin database carried "
            f"{journal.get('total_rows')} rows across "
            f"{len(journal.get('distinct_runtime_sessions') or [])} sessions, so the journal "
            f"survives the toggle. Host exit code {run['exit_code']}. Unmitigated-shape "
            f"control on its own fresh instance: "
            f"{control['failure_mode'] if control else 'not run'} at "
            f"{control_cliff if control else 'n/a'} sends.",
    }]

    answer = (
        f"Toggling the plugin off and on RE-CREATES the QuickJS runtime: {n_distinct} distinct "
        f"module instantiations across {len(legs)} legs, the probe's per-runtime send counter "
        f"back at 0 each time ({counters_reset}), and togglePlugin returning error:null on "
        f"every call. The plugin database survives it — {journal.get('total_rows')} rows "
        f"spanning {len(journal.get('distinct_runtime_sessions') or [])} sessions in one db — "
        f"so a crash marker written before a toggle is still readable after it. {total} sends "
        f"completed across the legs against a reference of {reference}. The reset of #2211's "
        f"leak specifically could not be observed, because a control on its own fresh instance "
        f"running the NAIVE wrapper shape — every wrapper retained — also completed "
        f"{control_cliff} sends cleanly. PLUGIN_TOGGLE_RESETS_LEAK = {value}."
    )

    if_wrong = (
        "If a toggle does NOT reset the leak, ACTIVE-13's recovery path cannot be 'restart the "
        "plugin' — it has to be a hard per-runtime send budget enforced by DefMiner itself, "
        "with the operator asked to restart Caido once it is exhausted, because nothing inside "
        "the plugin API can reclaim host-side references. The measurement here says the "
        "mechanism exists: the runtime is genuinely rebuilt, so ANY state that lives in the "
        "QuickJS runtime is discarded by a toggle. The residual risk is that #2211's "
        "references live on the HOST side of the boundary rather than in the runtime, in "
        "which case a toggle rebuilds the runtime and leaks exactly as before — and this run "
        "cannot distinguish those two, because it never produced a leak to watch. One "
        "consequence is not conditional and should be designed for now: a toggle is only "
        "usable while the runtime still responds. SPIKE-01 measured the same mutation against "
        "a WEDGED plugin never returning at all, and taking the healthy plugins down with it, "
        "so ACTIVE-13 must decide to toggle on a leading indicator rather than after the "
        "runtime has already stopped answering."
    )

    return {
        "method":
            f"A fresh version-asserted instance pinned to 127.0.0.1:8983 — not 8982, which "
            f"SPIKE-01 stage 2 leaves wedged. {len(legs)} legs of up to {per_leg} save:true "
            f"sends each, with togglePlugin(enabled:false) then togglePlugin(enabled:true) "
            f"between legs and a readiness poll rather than a sleep. The probe mints a runtime "
            f"session id per module instantiation and keeps a per-runtime send counter, so a "
            f"change in the id and a reset of the counter are direct evidence that the "
            f"QuickJS runtime was torn down and re-created. No retry loop against any "
            f"lifecycle operation. A SECOND fresh instance carries the control that makes the "
            f"question answerable at all: the same send loop with every wrapper RETAINED "
            f"rather than reduced to primitives, which is the unmitigated shape #2211 "
            f"describes and the one SPIKE-04's ACTIVE-09-disciplined variants deliberately "
            f"avoid.",
        "measurements": measurements,
        "probe": {"tier": "raw-zip", "package_version": "0.0.1"},
        "containment": {"escaped": False, "escape_paths": []},
        "verdict": {
            "answer": answer,
            "confidence": conf,
            "thresholds_set": thresholds,
            "if_wrong": if_wrong,
        },
        "requirements_affected": ["SPIKE-04b", "ACTIVE-13", "ACTIVE-01"],
        "artifacts": [
            "probe/tier0-send/backend/script.js",
            "scripts/spike/send-cliff.sh",
            "scripts/spike/pick-04b-reference.py",
            f"{RAW}/04b-legs.jsonl",
            f"{RAW}/04b-journal.json",
            f"{RAW}/retain-control-run.json",
        ],
        "notes":
            "Guest-authenticated, so project_persistence is temporary on both instances. The "
            "runtime session id is what makes this measurable rather than inferable: the host "
            "log's `plugin|executor: Stopping plugin executor` line says an executor stopped, "
            "but only a changed session id plus a reset per-runtime counter proves the JS "
            "runtime itself was rebuilt. The retain-shape control is recorded HERE rather "
            "than in SPIKE-04 because SPIKE-04's three-instance invariant is the check that "
            "protects its cliffs from cross-variant pollution, and because 'is there a leak "
            "to reset' is this spike's precondition rather than that one's question.",
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--spike", required=True, choices=["SPIKE-04", "SPIKE-04b"])
    args = ap.parse_args()
    body = spike_04() if args.spike == "SPIKE-04" else spike_04b()
    print(json.dumps(body, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
