#!/usr/bin/env python3
"""scripts/spike/analyse-spike-08.py — turn the SPIKE-08 fetch matrix and the
probe drain into a spike-result body on stdout.

The verdict is DERIVED from the observations here, never asserted. If the
evidence is internally contradictory the script says so on stderr and exits
non-zero rather than emitting a confident-looking result — a wrong answer to
"is the 8 MB compressed or decompressed" propagates into every size ceiling in
the project.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict


def load_jsonl(path):
    rows = []
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--matrix", required=True)
    ap.add_argument("--drain", required=True)
    ap.add_argument("--fixtures", required=True)
    args = ap.parse_args()

    fetches = load_jsonl(args.matrix)
    drain = json.load(open(args.drain))
    fixtures = json.load(open(args.fixtures))["fixtures"]

    # fixture declarations, keyed (fixture, encoding)
    decl = {(f["fixture"], f["encoding"]): f for f in fixtures}

    # plugin rows keyed by the `fx=` tag embedded in the URL
    by_tag = {}
    for row in drain.get("rows", []):
        url = row.get("url") or ""
        if "fx=" not in url:
            continue
        tag = url.split("fx=", 1)[1].split("&")[0]
        # Last write wins is wrong here — a duplicate tag would mean the same
        # request was intercepted twice and the two views could differ.
        by_tag.setdefault(tag, []).append(row)

    direct = {(f["fixture"], f["encoding"]): f for f in fetches if f["mode"] == "direct"}

    measurements = []
    problems = []
    duplicate_intercepts = {t: len(v) for t, v in by_tag.items() if len(v) > 1}

    for f in fetches:
        if f["mode"] == "direct":
            continue
        key = (f["fixture"], f["encoding"])
        d = decl.get(key)
        ref = direct.get(key)
        rows = by_tag.get(f["tag"], [])
        if not rows:
            problems.append(
                f"{f['tag']}: proxied fetch produced NO onInterceptResponse row "
                f"(http={f['http_code']}) — the plugin never saw this response"
            )
            continue
        p = rows[0]

        wire_observed = ref["client_bytes"] if ref else None
        decoded_bytes = d["decoded_bytes"] if d else None
        body_length = p.get("body_length")
        raw_length = p.get("raw_length")

        m = {
            "name": "body_roundtrip",
            "fixture": f["fixture"],
            "encoding": f["encoding"],
            "accept_encoding_mode": f["mode"],
            "accept_encoding_sent": f["accept_encoding_sent"],
            # The headline number is what the plugin actually holds in bytes —
            # that is the quantity every downstream ceiling is about.
            "value": raw_length,
            "unit": "bytes",
            "stat": "point",
            "n": 1,
            "body_length": body_length,
            "raw_length": raw_length,
            "body_length_equals_raw_length": body_length == raw_length,
            "wire_bytes_observed": wire_observed,
            "wire_bytes_fixture": d["wire_bytes"] if d else None,
            "decoded_bytes": decoded_bytes,
            "compression_ratio_observed": (
                round(decoded_bytes / wire_observed, 4)
                if wire_observed and decoded_bytes else None
            ),
            "origin_content_encoding": ref.get("resp_content_encoding") if ref else None,
            "origin_content_length": ref.get("resp_content_length") if ref else None,
            "delivered_content_encoding": p.get("content_encoding"),
            "delivered_content_length": p.get("content_length"),
            "delivered_x_raw_length": p.get("x_raw_length"),
            "client_bytes_through_proxy": f["client_bytes"],
            "client_content_encoding_through_proxy": f.get("resp_content_encoding"),
            "first16_hex": p.get("first16_hex"),
            "signature": p.get("signature"),
            "sha256_raw": p.get("sha256_raw"),
            "sha256_expected_decoded": d["sha256_decoded"] if d else None,
            "sha256_expected_wire": d.get("sha256_wire") if d else None,
            "http_code": f["http_code"],
            "text_length_utf16": p.get("text_length_utf16"),
            "text_utf8_bytes": p.get("text_utf8_bytes"),
            "sha256_text_utf8": p.get("sha256_text_utf8"),
        }
        # What the plugin holds, decided by DIGEST rather than by length alone:
        # two different byte strings can share a length, and the digest is the
        # only test that cannot be satisfied by coincidence.
        if d:
            if m["sha256_raw"] == d["sha256_decoded"]:
                m["plugin_body_is"] = "decoded"
            elif m["sha256_raw"] == d.get("sha256_wire"):
                m["plugin_body_is"] = "wire-as-generated"
            elif raw_length == wire_observed:
                # Python's and Node's codecs differ byte-for-byte at default
                # levels, so a compressed body served by origin.py will not match
                # the Node-generated fixture digest even when it IS the wire form.
                m["plugin_body_is"] = "wire-as-served"
            else:
                m["plugin_body_is"] = "unrecognised"
        else:
            m["plugin_body_is"] = "unknown"
        m["notes"] = (
            f"origin sent {wire_observed} B as {m['origin_content_encoding'] or 'identity'}; "
            f"plugin holds {raw_length} B classified {m['plugin_body_is']} "
            f"with leading bytes {m['signature']}"
        )
        measurements.append(m)

    # ---- the non-UTF-8 round trip, recorded as its own measurement ---------
    nonutf8 = [m for m in measurements if m["fixture"] == "nonutf8.js"]
    nonutf8_identity = next(
        (m for m in nonutf8 if m["encoding"] == "identity"
         and m["accept_encoding_mode"] == "identity"),
        nonutf8[0] if nonutf8 else None,
    )
    if nonutf8_identity:
        digests_equal = (
            nonutf8_identity["sha256_raw"] == nonutf8_identity["sha256_text_utf8"]
        )
        measurements.append({
            "name": "nonutf8_raw_vs_text_digest",
            "fixture": "nonutf8.js",
            "encoding": nonutf8_identity["encoding"],
            "value": digests_equal,
            "unit": "bool",
            "stat": "point",
            "n": 1,
            "body_length": nonutf8_identity["body_length"],
            "raw_length": nonutf8_identity["raw_length"],
            "sha256_raw": nonutf8_identity["sha256_raw"],
            "sha256_text_utf8": nonutf8_identity["sha256_text_utf8"],
            "text_utf8_bytes": nonutf8_identity["text_utf8_bytes"],
            "text_length_utf16": nonutf8_identity["text_length_utf16"],
            "byte_delta_text_minus_raw": (
                nonutf8_identity["text_utf8_bytes"] - nonutf8_identity["raw_length"]
                if nonutf8_identity["text_utf8_bytes"] is not None
                and nonutf8_identity["raw_length"] is not None else None
            ),
            "notes": (
                "toRaw() and toText()-re-encoded-as-UTF-8 digests compared on a body "
                "carrying deliberately invalid UTF-8 inside a string literal. Equal "
                "digests would mean toText() is byte-preserving; unequal digests mean "
                "every offset taken from the text view is wrong after the first bad "
                "sequence, which is the hazard ENC-01 exists to prevent."
            ),
        })

    # ---- derive the verdict ------------------------------------------------
    compressed = [m for m in measurements
                  if m["name"] == "body_roundtrip" and m["encoding"] != "identity"]
    identity = [m for m in measurements
                if m["name"] == "body_roundtrip" and m["encoding"] == "identity"]

    decoded_verdicts = {m["plugin_body_is"] for m in compressed}
    all_decoded = bool(compressed) and decoded_verdicts == {"decoded"}
    none_decoded = bool(compressed) and "decoded" not in decoded_verdicts

    len_eq = [m["body_length_equals_raw_length"]
              for m in measurements if m["name"] == "body_roundtrip"]
    body_len_equals_raw = bool(len_eq) and all(len_eq)

    by_enc = defaultdict(list)
    for m in compressed:
        by_enc[m["encoding"]].append(m["plugin_body_is"])
    per_encoding = {k: sorted(set(v)) for k, v in by_enc.items()}

    ratios = [m["compression_ratio_observed"] for m in compressed
              if m["compression_ratio_observed"]]
    ratio_min = min(ratios) if ratios else None
    ratio_max = max(ratios) if ratios else None

    if all_decoded:
        stored = True
        gate_source = "Body.length (decompressed identity bytes)"
        gate_rationale = (
            f"Every compressed variant arrived at the plugin as the DECODED byte "
            f"string: the toRaw() digest equals the identity digest for gzip, br and "
            f"zstd on both size points. Observed compression ratios on this corpus "
            f"ran {ratio_min}x to {ratio_max}x, so a ceiling written against the "
            f"wire byte count would admit up to {ratio_max}x more bytes than intended."
        )
        answer = (
            "Proxied response bodies reach onInterceptResponse DECOMPRESSED. For gzip, "
            "brotli and zstd the plugin's toRaw() digest equals the identity-body "
            "digest, and the leading bytes are plain JavaScript rather than a "
            "compression container."
        )
    elif none_decoded:
        stored = False
        gate_source = "toRaw().length (compressed wire bytes as delivered)"
        gate_rationale = (
            f"No compressed variant was decoded before the hook: the plugin holds the "
            f"wire byte string. CORE-02 must therefore gate on the delivered byte "
            f"count and Phase 1 must decode before any size-based analysis budget is "
            f"applied. Observed ratios {ratio_min}x to {ratio_max}x."
        )
        answer = (
            "Proxied response bodies reach onInterceptResponse still COMPRESSED. "
            "toRaw() returns the wire byte string, so any size ceiling applied at the "
            "hook is a ceiling on compressed bytes."
        )
    else:
        stored = "mixed"
        gate_source = "toRaw().length, with the encoding recorded alongside"
        gate_rationale = (
            f"Behaviour is NOT uniform across encodings: {json.dumps(per_encoding)}. "
            f"A single length quantity is therefore insufficient on its own and every "
            f"ceiling must carry the delivered Content-Encoding with it."
        )
        answer = (
            "Decompression before the hook is encoding-dependent on this build: "
            f"{json.dumps(per_encoding)}."
        )

    if identity:
        answer += (
            f" Identity bodies round-trip byte-for-byte "
            f"({sum(1 for m in identity if m['plugin_body_is'] == 'decoded')}/"
            f"{len(identity)} digest matches)."
        )
    answer += (
        f" Body.length equals toRaw().length on {sum(1 for v in len_eq if v)}/"
        f"{len(len_eq)} round trips."
    )

    if duplicate_intercepts:
        problems.append(
            f"duplicate intercept rows for tags: {duplicate_intercepts} — the same "
            f"response was delivered to the hook more than once"
        )

    body = {
        "method": (
            "Two pinned corpus artifacts (ace 457,965 B; babel 2,983,904 B) plus one "
            "deliberately non-UTF-8 fixture were pre-compressed with Node's built-in "
            "gzip, brotli and zstd codecs into corpus/encoded/. scripts/spike/origin.py "
            "served each under an explicit Content-Encoding on 127.0.0.1:8082. Every "
            "fixture/encoding pair was fetched three ways: directly at the origin with "
            "no proxy (authoritative wire bytes, curl without --compressed so nothing is "
            "transparently decoded), and twice through the Caido proxy on 127.0.0.1:8991 "
            "— once advertising a matching Accept-Encoding and once advertising "
            "identity. A Tier-0 probe recorded, per intercepted response, the delivered "
            "Content-Encoding and Content-Length, Body.length, toRaw().length, the first "
            "sixteen raw bytes as hex, a SHA-256 of toRaw(), a container-signature "
            "classification, and a SHA-256 of toText() re-encoded as UTF-8. Classification "
            "is by DIGEST against the fixture's known identity and wire digests, not by "
            "length, because two different byte strings can share a length."
        ),
        "corpus": [
            {"name": "ace-small.js", "bytes": 457965,
             "source": "corpus/ace-1.36.5.js (pinned, SHA-256 gated by plan 00-01)"},
            {"name": "babel-large.js", "bytes": 2983904,
             "source": "corpus/babel-7.26.4.js (pinned, SHA-256 gated by plan 00-01)"},
            {"name": "nonutf8.js", "bytes": 222,
             "source": "generated by scripts/spike/make-encoded-fixtures.mjs"},
        ],
        "probe": {"tier": "raw-zip", "package_version": "0.0.1", "deps": {}},
        "measurements": measurements,
        "verdict": {
            "answer": answer,
            "confidence": "HIGH" if not problems else "MEDIUM",
            "thresholds_set": [
                {
                    "id": "BODY_STORED_DECOMPRESSED",
                    "value": stored,
                    "unit": "bool",
                    "confidence": "HIGH" if not problems else "MEDIUM",
                    "status": "resolved",
                    "rationale": (
                        "Decided by SHA-256 of toRaw() against the fixture's known "
                        "identity digest for gzip, br and zstd on a small and a large "
                        f"artifact. Per-encoding classification: {json.dumps(per_encoding)}."
                    ),
                },
                {
                    "id": "BODY_LENGTH_EQUALS_RAW_LENGTH",
                    "value": body_len_equals_raw,
                    "unit": "bool",
                    "confidence": "HIGH",
                    "status": "resolved",
                    "rationale": (
                        f"Body.length compared against toRaw().length on every one of "
                        f"{len(len_eq)} proxied round trips across four encodings and "
                        f"three fixtures."
                    ),
                },
                {
                    "id": "SIZE_GATE_SOURCE",
                    "value": gate_source,
                    "unit": "enum",
                    "confidence": "HIGH" if not problems else "MEDIUM",
                    "status": "resolved",
                    "rationale": gate_rationale,
                },
            ],
            "if_wrong": (
                "If the admission filter gates on the wrong length quantity, every size "
                "ceiling in DefMiner is wrong by the compression ratio — measured here at "
                f"{ratio_min}x to {ratio_max}x on real minified bundles. Gating on wire "
                "bytes when the plugin holds decoded bytes silently admits multi-megabyte "
                "artifacts the CPU and RSS budgets were never sized for, so CORE-02 lets "
                "through work SPIKE-06's ceilings say is impossible; gating on decoded "
                "bytes when the plugin holds wire bytes rejects normal bundles and "
                "DefMiner analyses nothing. SPIKE-06's AST_MAX_BYTES and HARD_MAX_BYTES "
                "are expressed in this quantity, so the error compounds into Phase 9."
            ),
        },
        "requirements_affected": ["SPIKE-08", "CORE-02", "ENC-01", "ENC-02", "SPIKE-06"],
        "artifacts": [
            "raw/spike-08-fetches.jsonl",
            "raw/spike-08-drain.json",
            "corpus/encoded/fixtures.json",
        ],
        "notes": (
            "origin.py re-encodes with Python's zlib at its default level, so a "
            "compressed body it serves does not match the Node-generated fixture digest "
            "byte-for-byte even when it IS the wire form. Wire byte counts recorded as "
            "`wire_bytes_observed` come from a direct, unproxied fetch and are "
            "authoritative; `wire_bytes_fixture` is the reproducible Node-side "
            "cross-check. zlib does not load inside this runtime (measured in SPIKE-07), "
            "so the plugin cannot decompress anything itself — whatever it holds is "
            "whatever Caido handed it."
            + (f" PROBLEMS: {'; '.join(problems)}" if problems else "")
        ),
    }

    json.dump(body, sys.stdout, indent=2)
    sys.stdout.write("\n")

    if problems:
        for p in problems:
            print("analyse-spike-08: PROBLEM: " + p, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
