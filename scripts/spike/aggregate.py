#!/usr/bin/env python3
"""Build results/go-no-go.json from every results/SPIKE-*.json.

    python3 scripts/spike/aggregate.py [--out <path>] [--check]

go-no-go.json is the ONLY Phase 0 artifact later phases are permitted to import,
and its threshold ids become the names every tunable constant in DefMiner traces
to. So this fails LOUDLY rather than emitting a plausible-looking aggregate:

  * every contributing result is validated against spike-result.schema.json
    first, using the same ajv the vitest gate uses
  * a threshold id outside the closed enum is a hard error, not a new threshold
  * the same id claimed by two spikes with DIFFERENT values is a hard error
  * a contributing result not reporting 0.57.1 is a hard error
  * the cross-day cache rate's one sanctioned null is checked in BOTH
    directions — see check_cache_biconditional, which is where three rounds of
    adversarial review actually live

Gate questions come from .planning/REQUIREMENTS.md, which is the sole authority
for what each SPIKE-nn means. Five of the twelve ids in .planning/research/
PITFALLS.md collide with a different meaning, so nothing here reads that file.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import subprocess
import sys

RESULTS = os.environ.get("OUT", ".planning/phases/00-runtime-reality-check/results")
REQUIREMENTS = ".planning/REQUIREMENTS.md"
EXPECTED_VERSION = "0.57.1"
RESULT_RE = re.compile(r"^SPIKE-\d\d[a-z]?\.json$")

# The thirteen Phase 0 requirement ids. SPIKE-04b is a first-class sub-spike
# with its own REQUIREMENTS.md line, so it gets its own gate.
PHASE0_SPIKES = [f"SPIKE-{n:02d}" for n in range(1, 13)]
PHASE0_SPIKES.insert(PHASE0_SPIKES.index("SPIKE-04") + 1, "SPIKE-04b")

CROSS_DAY = "CACHE_HIT_RATE_CROSS_DAY"
SAMPLE_DAYS = "CACHE_SAMPLE_DAYS"
DENOMINATOR = "CACHE_CROSS_DAY_DENOMINATOR"
ASSUMED = "CACHE_HIT_RATE_ASSUMED"

# The two causes of an undefined cross-day rate imply DIFFERENT follow-ups —
# "keep collecting" versus "the method itself needs revisiting" — so the
# rationale has to name which one applies and a later reader must not have to
# re-derive it from the raw log.
CAUSE_MARKERS = {
    "too-few-days": "fewer than two distinct days sampled",
    "no-recurrence": "no content hash recurred across them",
}


def die(msg: str) -> "NoReturn":  # noqa: F821
    print(f"aggregate: FATAL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def load(path: str):
    with open(path) as fh:
        return json.load(fh)


def result_files() -> list[str]:
    if not os.path.isdir(RESULTS):
        die(f"{RESULTS} does not exist")
    files = sorted(
        os.path.join(RESULTS, f) for f in os.listdir(RESULTS) if RESULT_RE.match(f)
    )
    if not files:
        die(f"no SPIKE-NN.json under {RESULTS} — nothing to aggregate")
    return files


def validate(files: list[str]) -> None:
    """Validate every contributing result before a single field is read."""
    schema = os.path.join(RESULTS, "spike-result.schema.json")
    if not os.path.isfile(schema):
        die(f"{schema} missing")
    proc = subprocess.run(
        ["node", "scripts/spike/validate-schema.mjs", schema, *files],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        die("contributing results failed schema validation:\n" + proc.stderr.strip())


def threshold_enum() -> set[str]:
    """The closed enum, read from the schema so there is ONE source of truth."""
    schema = load(os.path.join(RESULTS, "go-no-go.schema.json"))
    return set(schema["properties"]["thresholds"]["propertyNames"]["enum"])


def gate_questions() -> dict[str, str]:
    """Restate each spike's question in words, from REQUIREMENTS.md only."""
    if not os.path.isfile(REQUIREMENTS):
        die(f"{REQUIREMENTS} missing — it is the sole authority for what SPIKE-nn means")
    out: dict[str, str] = {}
    line_re = re.compile(r"^- \[[ x]\] \*\*(SPIKE-\d\d[a-z]?)\*\*:\s*(.+)$")
    for raw in open(REQUIREMENTS):
        mo = line_re.match(raw.strip())
        if not mo:
            continue
        spike, text = mo.group(1), mo.group(2)
        # Keep the QUESTION, not the accumulated answer commentary that later
        # plans folded back into the same line. Strikethrough is UNWRAPPED
        # rather than deleted: on SPIKE-07 it marks a question already answered
        # during research, and the struck text is still the question.
        # Italic parentheticals are editorial commentary, not the question.
        # Drop them BEFORE unwrapping emphasis, or the parentheses survive and
        # the naive "cut at the first bracket" rule truncates real question text
        # such as SPIKE-06's "(not standalone quickjs-ng)".
        text = re.sub(r"\s*\*\(.+?\)\*", "", text)
        text = re.sub(r"~~(.+?)~~", r"\1", text)
        text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
        text = re.sub(r"\*(.+?)\*", r"\1", text)
        text = text.replace("`", "")
        # Later plans fold their ANSWER back into the same requirement line.
        # The gate wants the question; the answer has its own field.
        mo_ans = re.search(r"[\s—-]+ANSWERED\b", text)
        if mo_ans and mo_ans.start() > 20:
            text = text[:mo_ans.start()]
        sentences = re.split(r"(?<=[.?])\s+", text.strip())
        first = " ".join(sentences[:2]).strip()
        if len(first) > 360:
            first = sentences[0].strip()
        out[spike] = first or text.strip()
    missing = [s for s in PHASE0_SPIKES if s not in out]
    if missing:
        die(f"{REQUIREMENTS} has no line for {missing} — every gate needs its question "
            f"restated in words from the authority, not invented here")
    return out


def check_cache_biconditional(thresholds: dict) -> None:
    """The cross-day cache rate's one sanctioned null, checked BOTH ways.

    The day count, the denominator and the value are a BICONDITIONAL, not a
    one-way permission. Guarding only the null direction leaves two fabrication
    paths open: a one-day run reporting a confident-looking number, and a
    multi-day run reporting 0.0 for a rate whose denominator was zero. Both
    would otherwise pass everything downstream.
    """
    if CROSS_DAY not in thresholds:
        return  # SPIKE-10 has not been aggregated yet; nothing to check.

    cd = thresholds[CROSS_DAY]

    if SAMPLE_DAYS not in thresholds:
        die(f"{CROSS_DAY} is present but {SAMPLE_DAYS} is not. The cross-day rate cannot "
            f"be interpreted without the day count it was computed over.")
    if DENOMINATOR not in thresholds or thresholds[DENOMINATOR].get("value") is None:
        die(f"{DENOMINATOR} is missing or null. It is the count of content hashes seen on "
            f"two or more distinct days, and the aggregator cannot classify the cross-day "
            f"outcome without it.")

    days = thresholds[SAMPLE_DAYS]["value"]
    denom = thresholds[DENOMINATOR]["value"]
    value = cd.get("value")
    measurable = days >= 2 and denom > 0

    if measurable and value is None:
        die(f"{CROSS_DAY} is null, but {SAMPLE_DAYS}={days} and {DENOMINATOR}={denom}: the "
            f"rate WAS measurable and a real measurement has been discarded.")

    if not measurable and value is not None:
        # The dangerous direction. Say so in the error.
        why = (f"{SAMPLE_DAYS}={days} is below 2" if days < 2
               else f"{DENOMINATOR}={denom} is zero")
        die(f"{CROSS_DAY}={value!r} is NON-NULL but {why}, so the rate is UNDEFINED and this "
            f"value is a fabrication. This is the failure the whole rule exists to stop: a "
            f"within-session figure wearing the cross-day name, with the 0.40 pessimistic "
            f"default silently dropped. A value of 0.0 is its most plausible disguise — an "
            f"undefined rate reported as a measured zero tells Phase 1's CORE-08 that "
            f"caching measurably never works, which mis-sizes the CPU budget as badly as "
            f"over-reporting it. Record value:null with status:inconclusive instead.")

    if value is None:
        if cd.get("status") != "inconclusive":
            die(f"{CROSS_DAY} is null but status is {cd.get('status')!r}; a null value is "
                f"permitted only alongside status 'inconclusive'.")
        if not cd.get("revisit_after"):
            die(f"{CROSS_DAY} is inconclusive but carries no revisit_after. An unmeasured "
                f"threshold must name when it gets measured.")
        if ASSUMED not in thresholds or thresholds[ASSUMED].get("value") != 0.40:
            die(f"{CROSS_DAY} is inconclusive but {ASSUMED} is missing or not 0.40. Phase 1's "
                f"CORE-08 must budget for the worst case until the real number lands; "
                f"without it Phase 1 is blocked or, worse, guesses.")
        rationale = (cd.get("rationale") or "").lower()
        named = [k for k, marker in CAUSE_MARKERS.items() if marker in rationale]
        if not named:
            die(f"{CROSS_DAY} is inconclusive but its rationale does not name WHICH cause "
                f"applies. '{CAUSE_MARKERS['too-few-days']}' and "
                f"'{CAUSE_MARKERS['no-recurrence']}' are different findings implying "
                f"different follow-ups — the first says keep collecting, the second says the "
                f"corpus or site list is not exercising re-serving and the method itself "
                f"needs revisiting. A later reader must be able to tell them apart without "
                f"re-deriving it from the raw log.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(RESULTS, "go-no-go.json"))
    ap.add_argument("--stdout", action="store_true",
                    help="print the aggregate instead of writing it")
    args = ap.parse_args()

    files = result_files()
    validate(files)

    enum = threshold_enum()
    questions = gate_questions()

    thresholds: dict[str, dict] = {}
    claimed_by: dict[str, str] = {}
    source_runs: dict[str, list[str]] = {}
    gates: list[dict] = []
    unresolved: list[dict] = []
    versions: set[str] = set()
    binaries: dict[str, dict] = {}
    hosts: dict[str, dict] = {}

    for path in files:
        d = load(path)
        spike = d["spike"]

        reported = (d.get("binary") or {}).get("reported_version")
        if reported != EXPECTED_VERSION:
            die(f"{path}: binary.reported_version is {reported!r}, expected "
                f"{EXPECTED_VERSION!r}. Refusing to fold a measurement taken against a "
                f"different build into the aggregate.")
        versions.add(reported)
        binaries[spike] = d["binary"]
        hosts[spike] = d["host"]

        source_runs[spike] = [i["run_id"] for i in d.get("instances", [])]

        for t in (d.get("verdict") or {}).get("thresholds_set", []):
            tid = t["id"]
            if tid not in enum:
                die(f"{path}: threshold id {tid!r} is not in the closed enum. A typo must "
                    f"fail validation rather than create an orphan threshold nothing "
                    f"downstream will ever read.")
            entry = {
                "value": t["value"],
                "unit": t["unit"],
                "spike": spike,
                "confidence": t["confidence"],
            }
            for optional in ("status", "rationale", "revisit_after"):
                if t.get(optional) is not None:
                    entry[optional] = t[optional]

            if tid in thresholds:
                prev = thresholds[tid]
                if prev["value"] != entry["value"]:
                    die(f"threshold {tid} is claimed by {claimed_by[tid]} with value "
                        f"{prev['value']!r} and by {spike} with value {entry['value']!r}. "
                        f"Two spikes disagreeing on one threshold is a contradiction the "
                        f"aggregate cannot silently resolve.")
                # Same value from two spikes is corroboration, not conflict.
                prev["spike"] = f"{claimed_by[tid]}"
                continue
            thresholds[tid] = entry
            claimed_by[tid] = spike

            if entry.get("status") == "inconclusive" and not entry.get("revisit_after"):
                die(f"threshold {tid} is inconclusive but carries no revisit_after.")
            if entry["value"] is None and tid != CROSS_DAY:
                die(f"threshold {tid} has a null value. Only {CROSS_DAY} may be null, and "
                    f"only to carry the one sanctioned inconclusive case. A measured "
                    f"negative encodes as a VALUE — 'none', 'neither', false — never as "
                    f"null, or a later phase reads an unmeasured field as a fact.")
            if entry["confidence"] == "PENDING":
                die(f"threshold {tid} has confidence PENDING. PENDING fails the phase exit "
                    f"gate and communicates nothing about why it is unresolved; record the "
                    f"measurement or record it as inconclusive with a revisit date.")

            if entry.get("status") == "inconclusive":
                unresolved.append({
                    "id": tid,
                    "why": entry.get("rationale", "declared inconclusive by " + spike),
                    "revisit_after": entry["revisit_after"],
                })

        # Downstream requirement ids this gate blocks: everything the result
        # names EXCEPT the spike ids themselves, which are Phase 0's own.
        blocks = [r for r in d.get("requirements_affected", [])
                  if not r.startswith("SPIKE-")]
        gates.append({
            "spike": spike,
            "question": questions[spike],
            "answer": (d.get("verdict") or {}).get("answer", "").strip(),
            "status": d["status"],
            "blocks": blocks,
            "changes_if_wrong": (d.get("verdict") or {}).get("if_wrong", "").strip(),
        })

    check_cache_biconditional(thresholds)

    have = {g["spike"] for g in gates}
    missing = [s for s in PHASE0_SPIKES if s not in have]
    if missing:
        die(f"no result file for {missing}. Every Phase 0 requirement id needs a gate; a "
            f"missing one is an unanswered question wearing a complete-looking table.")
    extra = sorted(have - set(PHASE0_SPIKES))
    if extra:
        die(f"result files for unknown spikes {extra}. .planning/REQUIREMENTS.md is the "
            f"sole authority for Phase 0 requirement ids.")

    for g in gates:
        if not g["answer"]:
            die(f"gate {g['spike']} has an empty answer.")
        if not g["changes_if_wrong"]:
            die(f"gate {g['spike']} has an empty changes_if_wrong. A gate that cannot say "
                f"what changes if it is wrong will not protect the phases built on it.")

    gates.sort(key=lambda g: (g["spike"][:9], g["spike"]))

    # Provenance, asserted rather than assumed. A table whose rows were measured
    # on two different binaries or two different machines is not one table.
    shas = {b.get("sha256") for b in binaries.values() if b.get("sha256")}
    if len(shas) > 1:
        die(f"contributing results disagree on the binary SHA-256: {sorted(shas)}. Every row "
            f"in this table must come from the same build.")
    fingerprints = {(h.get("os"), h.get("arch"), h.get("cpu")) for h in hosts.values()}
    if len(fingerprints) > 1:
        die(f"contributing results were measured on different hosts: {sorted(fingerprints)}. "
            f"CPU and RSS figures from two machines cannot share one table.")
    ref_host = next(iter(hosts.values()))

    aggregate = {
        "$schema": "./go-no-go.schema.json",
        "caido_version": versions.pop(),
        "generated_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "provenance": {
            "binary": next(iter(binaries.values())),
            "host": {k: ref_host.get(k)
                     for k in ("os", "release", "arch", "cpu", "cores", "ram_gb")},
        },
        "source_runs": source_runs,
        "thresholds": dict(sorted(thresholds.items())),
        "gates": gates,
        "unresolved": unresolved,
    }

    text = json.dumps(aggregate, indent=2) + "\n"
    if args.stdout:
        sys.stdout.write(text)
    else:
        with open(args.out, "w") as fh:
            fh.write(text)
        print(f"wrote {args.out}: {len(gates)} gates, {len(thresholds)} thresholds, "
              f"{len(unresolved)} unresolved", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
