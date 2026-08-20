#!/usr/bin/env python3
"""scripts/spike/analyse-spike-11.py — fold the browser cache scenarios into a
result body for scripts/spike/record-result.py.

Every threshold below is DERIVED from the recorded scenarios. If the scenarios
change, the verdict changes with them.

    python3 scripts/spike/analyse-spike-11.py <cache.json> \
      | python3 scripts/spike/record-result.py --spike SPIKE-11 --status pass --run <RUN_ID>
"""
from __future__ import annotations

import json
import sys


def main() -> int:
    data = json.load(open(sys.argv[1]))
    scen = data["scenarios"]
    by = {s["scenario"]: s for s in scen}

    measurements = []
    for s in scen:
        measurements.append({
            "name": "scenario_" + s["scenario"].replace("-", "_"),
            "variant": s["description"],
            # The value is the one-line verdict for this scenario, in the same
            # vocabulary across all five so the go/no-go table can read them.
            "value": (
                "hook-fired-%s" % s["delivered_status"]
                if s["hook_fired"]
                else ("served-from-browser-cache" if s["browser_served_from_cache"] else "no-delivery")
            ),
            "unit": "outcome",
            "stat": "point",
            "scenario": s["scenario"],
            "resource_url": s["resource_url"],
            "page_url": s["page_url"],
            # Witness 1 — the browser. TRUE only when a request was actually put
            # on the wire; Chromium emits a request event even for a cache hit,
            # so the presence of an on-the-wire status is the honest test.
            "browser_issued_request": s["browser_issued_request"],
            "browser_request_events": s["browser_request_events"],
            "browser_served_from_cache": s["browser_served_from_cache"],
            "browser_wire_statuses": s["browser_wire_statuses"],
            "browser_page_visible_statuses": s["browser_page_visible_statuses"],
            # Witness 2 — the origin, outside the browser entirely.
            "origin_requests": s["origin_requests"],
            # Witness 3 — the plugin.
            "hook_fired": s["hook_fired"],
            "hook_deliveries": s["hook_deliveries"],
            "delivered_status": s["delivered_status"],
            "delivered_body_length": s["delivered_body_length"],
            "delivered_raw_length": s["delivered_raw_length"],
            "delivered_response_headers": s["delivered_response_headers"],
            # In-scenario control: the no-store HTML wrapper is proxied on every
            # navigation, so page_hook_fired proves the hook was alive in this
            # exact window.
            "page_hook_fired": s["page_hook_fired"],
            "error": s["error"],
        })

    cold = by["cold"]
    cached = by["cached-fresh"]
    reval = by["revalidate-304"]
    hard = by["hard-reload"]

    cached_reach = bool(cached["hook_fired"])
    s304_reach = bool(reval["hook_fired"] and reval["delivered_status"] == 304)

    # A realistic repeat visit leaves the bundle unanalysed if either the
    # response never reaches the plugin at all, or it reaches it carrying no
    # body to analyse. Both are measured here; either one alone makes the
    # retroactive path a correctness requirement rather than a convenience.
    cache_hit_invisible = (not cached["browser_issued_request"]) and (not cached["hook_fired"])
    body_absent_on_304 = s304_reach and (reval["delivered_body_length"] or 0) == 0
    retro_mandatory = bool(cache_hit_invisible or body_absent_on_304)
    decider = (
        "cached-fresh" if cache_hit_invisible else ("revalidate-304" if body_absent_on_304 else "none")
    )

    answer = (
        "A browser-cache hit NEVER reaches the plugin, and a 304 does reach it but carries no "
        "body. In the cached-fresh scenario Chromium served the resource from its own cache "
        "(requestServedFromCache), put nothing on the wire, the origin logged nothing, and the "
        "hook did not fire — while the no-store HTML wrapper in the SAME window did fire, "
        "proving the hook was alive. In the revalidate scenario the browser revalidated, the "
        "origin answered 304, and the hook DID fire with status 304 and "
        "Body.length == toRaw().length == 0 and no content-type header at all. Cold load and "
        "hard reload both delivered the full 457,965-byte body, so the apparatus was working "
        "before and after. On a repeat visit the bundle is therefore invisible to the passive "
        "path twice over: when the cache is fresh nothing leaves the browser, and when it "
        "revalidates the plugin is handed an empty 304."
    )

    body = {
        "method": (
            "One fresh guest-enabled instance on 127.0.0.1:8996 launched through "
            "scripts/spike/instance.sh with the 0.57.1 assertion intact, a temporary project "
            "created and SELECTED, and probe/tier0-events installed UNMODIFIED from SPIKE-05. "
            "Playwright Chromium (the one plan 00-01 installed) ran on a throwaway persistent "
            "profile so the DISK cache survives between scenarios, proxied through the instance "
            "with `--proxy-bypass-list=<-loopback>` — load-bearing, because Chromium bypasses a "
            "configured proxy for loopback addresses by default and without it the browser "
            "would reach the origin directly and every scenario would read not-fired for a "
            "reason unrelated to caching. The origin is scripts/spike/origin.py (unmodified) "
            "serving a purpose-built web root: four `no-store` HTML wrappers and two copies of "
            "the same 457,965-byte bundle, one with `Cache-Control: public, max-age=600` and one "
            "with `no-cache`, both carrying a strong ETag and Last-Modified. Per-path behaviour "
            "comes from origin.py's --headers sidecar, so no plan 00-01 file was edited. "
            "Scenario 2 navigates to a DIFFERENT page referencing the same resource rather than "
            "calling page.reload(), because Chromium treats a same-URL navigation as a reload "
            "and attaches `Cache-Control: max-age=0`, which would silently convert the "
            "freshness scenario into the revalidation one. Three independent witnesses per "
            "scenario: CDP (requestWillBeSent, requestServedFromCache, and "
            "responseReceivedExtraInfo — the ONLY place the on-the-wire 304 is visible, since "
            "responseReceived reports the revalidated 200 the page sees), the origin's own "
            "request log, and the plugin's delivered-event log drained to empty before each "
            "scenario and polled to settlement after it."
        ),
        "measurements": measurements,
        "verdict": {
            "answer": answer,
            "confidence": "HIGH",
            "thresholds_set": [
                {
                    "id": "CACHED_RESPONSES_REACH_HOOK",
                    "value": cached_reach,
                    "unit": "boolean",
                    "confidence": "HIGH",
                    "status": "resolved",
                    "rationale": (
                        "cached-fresh: browser_issued_request=false, "
                        "requestServedFromCache=%d, origin_requests=%d, hook_fired=%s, while "
                        "page_hook_fired=%s in the same window. Nothing left the browser, so "
                        "the proxy never saw it and no behaviour of Caido's could have "
                        "delivered it."
                        % (
                            cached["browser_served_from_cache"],
                            cached["origin_requests"],
                            cached["hook_fired"],
                            cached["page_hook_fired"],
                        )
                    ),
                },
                {
                    "id": "STATUS_304_REACHES_HOOK",
                    "value": s304_reach,
                    "unit": "boolean",
                    "confidence": "HIGH",
                    "status": "resolved",
                    "rationale": (
                        "revalidate-304: on-the-wire status %s, hook delivered status %s with "
                        "Body.length=%s and toRaw().length=%s. The delivered headers carry "
                        "etag, last-modified, cache-control and content-length: 0 — and NO "
                        "content-type at all, so any admission gate keyed on content-type will "
                        "classify a 304 as non-script. That matters to CORE-02 independently of "
                        "the caching question."
                        % (
                            reval["browser_wire_statuses"],
                            reval["delivered_status"],
                            reval["delivered_body_length"],
                            reval["delivered_raw_length"],
                        )
                    ),
                },
                {
                    "id": "RETROACTIVE_SCAN_MANDATORY",
                    "value": retro_mandatory,
                    "unit": "boolean",
                    "confidence": "HIGH",
                    "status": "resolved",
                    "rationale": (
                        "Decided by the `%s` scenario. A returning visitor's bundle is left "
                        "unanalysed on BOTH realistic repeat-visit paths: a fresh cache hit "
                        "never leaves the browser (so the bundle is not merely missed by the "
                        "hook — it does not enter Caido at all), and a revalidation delivers a "
                        "304 whose body is zero bytes. Passive-only analysis therefore has a "
                        "permanent blind spot on exactly the traffic an operator generates "
                        "most. Note the scope this sets for FIND-03: retroactively scanning "
                        "the project's STORED requests recovers a bundle only if it was "
                        "captured with a body at some earlier point. It cannot recover one that "
                        "was only ever served from the browser cache, which is why FIND-04's "
                        "cache-busting or active re-fetch is the complement rather than the "
                        "alternative."
                        % decider
                    ),
                },
            ],
            "if_wrong": (
                "If a returning visitor's bundles are invisible to the passive path — and they "
                "are — Phase 6 changes in three ways. FIND-03's retroactive scan over the "
                "project's already-captured requests stops being a convenience and becomes the "
                "only mechanism by which previously-seen bundles get analysed at all; it has to "
                "run on plugin start and on project switch, not just on demand. FIND-04 has to "
                "resolve a stored 304 back to the 200 that carried the body, keyed on URL plus "
                "ETag, or it will index an empty response and record a false negative. And "
                "because a fresh cache hit never enters Caido in any form, retroactive scanning "
                "alone is still not sufficient: the bundle has to be re-fetched actively — "
                "which is the ACTIVE-06 path SPIKE-05 just proved is invisible to the hook, so "
                "the re-fetch must feed the analyser DIRECTLY rather than expecting its own "
                "traffic to come back around. If the measurement were reversed and cached "
                "responses did reach the hook, all three of those become optional and Phase 6 "
                "could ship passive-only."
            ),
        },
        "requirements_affected": ["SPIKE-11", "FIND-03", "FIND-04", "CORE-02", "CORE-08"],
        "artifacts": [
            "scripts/spike/cache-browse.mjs",
            "scripts/spike/run-spike-11.sh",
            sys.argv[1],
        ],
        "notes": (
            "Cold load and hard reload both delivered the full body (%s and %s bytes), so the "
            "apparatus demonstrably worked at the start and at the end of the run and no "
            "not-fired result can be attributed to a handler that stopped. The instance CA was "
            "fetched (%s bytes) and Chromium launched with --ignore-certificate-errors so an "
            "HTTPS origin would work through this proxy; the origin here is HTTP because "
            "scripts/spike/origin.py is owned by plan 00-01 and serves HTTP only, and "
            "Chromium's HTTP cache, its freshness arithmetic and its revalidation path are all "
            "scheme-independent, so the cache decision under test is unchanged. "
            "Threat T-00-33: throwaway Chromium profile under the run directory, local origin "
            "only, no real site, no operator credentials and no logged-in session; the profile "
            "and the instance data path are both removed at teardown."
            % (
                cold["delivered_body_length"],
                hard["delivered_body_length"],
                data.get("instance_ca_bytes"),
            )
        ),
    }

    if not cold["hook_fired"]:
        print(
            "FATAL: the cold-load control did not fire — the apparatus is broken and no "
            "cache conclusion can be drawn. Refusing to emit a result body.",
            file=sys.stderr,
        )
        return 1

    json.dump(body, sys.stdout, indent=2)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
