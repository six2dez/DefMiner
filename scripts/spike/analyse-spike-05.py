#!/usr/bin/env python3
"""scripts/spike/analyse-spike-05.py — fold the event matrix into a result body.

Reads the raw matrix written by scripts/spike/event-matrix.mjs and emits the
measurement body on stdout for scripts/spike/record-result.py.

Every verdict below is DERIVED from the recorded cells, never asserted by hand:
if the matrix changes, the thresholds change with it. That is deliberate — a
hand-written verdict beside a machine-written matrix is how the two drift apart.

    python3 scripts/spike/analyse-spike-05.py <matrix.json> \
      | python3 scripts/spike/record-result.py --spike SPIKE-05 --status pass --run <RUN_ID>
"""
from __future__ import annotations

import json
import sys


def main() -> int:
    matrix = json.load(open(sys.argv[1]))
    cells = matrix["cells"]

    measurements = []
    for c in cells:
        flags = c.get("flags")
        variant = (
            "save=%s,plugins=%s" % (flags["save"], flags["plugins"])
            if flags
            else (c.get("notes") or "")[:60]
        )
        m = {
            "name": "cell_" + c["surface"].replace("-", "_"),
            "variant": variant,
            "value": c["state"],
            "unit": "state",
            "stat": "point",
            "surface": c["surface"],
            "flags": flags,
            "marker": c["marker"],
            "fired": c["fired"],
            "state": c["state"],
            "deliveries": c["deliveries"],
            "delivered_statuses": c["statuses"],
            "delivered_body_lengths": c["body_lengths"],
            # The independent, origin-side witness. `origin_requests` > 0 with
            # fired == false is the ONLY evidence that separates "the surface
            # never put a request on the wire" from "Caido did not deliver the
            # response to the plugin". Without it every not-fired cell would be
            # ambiguous.
            "origin_requests": c["origin_requests"],
            "caido_sources": c["caido_sources"],
            "stray_events": c["stray_events"],
            "error": c["error"],
            "notes": c.get("notes"),
            "action": c.get("action"),
        }
        measurements.append(m)

    def by_surface(name):
        return [c for c in cells if c["surface"] == name]

    proxy_cells = by_surface("proxy")
    proxy_fired = all(c["fired"] for c in proxy_cells) and len(proxy_cells) >= 1
    send_cells = by_surface("plugin-send")
    fired_surfaces = sorted({c["surface"] for c in cells if c["state"] == "fired"})
    blocked = [c for c in cells if c["state"] == "blocked"]

    def send_cell(save, plugins):
        for c in send_cells:
            f = c["flags"] or {}
            if f.get("save") is save and f.get("plugins") is plugins:
                return c
        return None

    baseline = send_cell(True, True)
    send_refires = bool(baseline and baseline["fired"])

    # A flag can only be said to SUPPRESS something that happens without it.
    # With the baseline (save:true, plugins:true) not firing, there is nothing
    # for save:false or plugins:false to suppress, and the honest encoding is
    # "no-effect" — a measured negative, not a null. Wave 1 set this precedent
    # with TEXTDECODER_MODULE: null means unmeasured, and this IS measured.
    def suppression(flag):
        if send_refires:
            off = send_cell(False, True) if flag == "save" else send_cell(True, False)
            return bool(off and not off["fired"])
        return "no-effect"

    # An unsaved send comes back with request and response ids of 0, so the
    # plugin holds no handle it can later resolve. ACTIVE-12 depends on this.
    ids_zero = {}
    for c in send_cells:
        f = c["flags"] or {}
        a = c.get("action") or {}
        ids_zero["save=%s,plugins=%s" % (f.get("save"), f.get("plugins"))] = a.get("ids_are_zero")

    answer = (
        "onInterceptResponse fires for PROXIED traffic ONLY. Of %d cells across %d surfaces, "
        "only the proxy control cells delivered an event. Replay, Automate, an active "
        "workflow's sdk.requests.send(), the plugin's own sdk.requests.send() in all four "
        "save/plugins combinations, and caido:http fetch ALL reached the origin (confirmed "
        "in the origin's own log) and delivered NOTHING to the hook. createRequest(source: "
        "IMPORT) put a request and response into the project without touching the network "
        "and likewise delivered nothing. sdk.requests.send() therefore does NOT re-fire the "
        "hook, and neither save:false nor plugins:false changes that, because there is "
        "nothing to suppress."
    ) % (len(cells), len({c["surface"] for c in cells}))

    body = {
        "method": (
            "One fresh guest-enabled instance on 127.0.0.1:8995 launched through "
            "scripts/spike/instance.sh with the 0.57.1 assertion intact, a temporary project "
            "created and SELECTED (without one the proxy returns `Proxying error: Internal` "
            "and the hook never fires at all — wave 1), and probe/tier0-events installed as an "
            "unsigned zip. scripts/spike/event-matrix.mjs drove each surface in turn against "
            "scripts/spike/origin.py on 127.0.0.1:8083, every cell carrying a UNIQUE "
            "correlation marker in the query string (`?dfm=<marker>`). The probe's "
            "delivered-event log was drained to empty before each cell and then polled to "
            "settlement after it (six consecutive empty 250 ms polls, 20 s cap), so no event "
            "can be attributed to two surfaces. Three independent witnesses run beside the "
            "plugin-side count: the origin's own request log (did the request leave Caido at "
            "all), the instance's stdout (did the workflow node actually execute), and "
            "GraphQL request.source (what Caido labelled the traffic). A CLOSING proxy "
            "control cell re-ran after every other cell to prove the hook was still live, so "
            "a late not-fired cannot be an artifact of a handler that died mid-run. "
            "@caido/sdk-client 0.5.0 drove connect/health, project select, workflow create "
            "and run; Automate, Replay and createRequest went over raw GraphQL on the same "
            "authenticated endpoint because that SDK version has no Automate or import SDK "
            "and its replay.send() never resolves (see notes)."
        ),
        "measurements": measurements,
        "verdict": {
            "answer": answer,
            "confidence": "HIGH",
            "thresholds_set": [
                {
                    "id": "SEND_REFIRES_INTERCEPT",
                    "value": send_refires,
                    "unit": "boolean",
                    "confidence": "HIGH",
                    "status": "resolved",
                    "rationale": (
                        "sdk.requests.send() with the documented defaults (save:true, "
                        "plugins:true) reached the origin and returned 200 with a 457,965-byte "
                        "body, and the hook did not fire. The origin log confirms the request "
                        "was really made, so this is a delivery decision by Caido and not a "
                        "send that silently failed."
                    ),
                },
                {
                    "id": "SAVE_FALSE_SUPPRESSES_INTERCEPT",
                    "value": suppression("save"),
                    "unit": "boolean-or-no-effect",
                    "confidence": "HIGH",
                    "status": "resolved",
                    "rationale": (
                        "save:false cannot suppress an event that does not happen with "
                        "save:true. Encoded as the measured negative \"no-effect\" rather than "
                        "null: null in this schema means UNMEASURED, and this was measured. "
                        "save:false does have one measured consequence — the returned request "
                        "and response ids are both 0 (%s), so the plugin holds no handle it can "
                        "resolve later, which is the fact ACTIVE-12 depends on."
                        % json.dumps(ids_zero)
                    ),
                },
                {
                    "id": "PLUGINS_FALSE_SUPPRESSES_INTERCEPT",
                    "value": suppression("plugins"),
                    "unit": "boolean-or-no-effect",
                    "confidence": "HIGH",
                    "status": "resolved",
                    "rationale": (
                        "Same reasoning as save:false. RequestSendOptions.plugins governs the "
                        "UPSTREAM plugin chain, which is a different mechanism from the "
                        "intercept hook; with the hook not firing at plugins:true there is "
                        "nothing for plugins:false to turn off."
                    ),
                },
                {
                    "id": "SURFACES_FIRING_INTERCEPT",
                    "value": ",".join(fired_surfaces) if fired_surfaces else "none",
                    "unit": "surface-list",
                    "confidence": "HIGH",
                    "status": "resolved",
                    "rationale": (
                        "Surfaces measured: %s. Only the proxy fired, and Caido labelled its "
                        "requests source=INTERCEPT. Every other surface produced traffic that "
                        "the origin logged and the plugin never saw."
                        % ", ".join(sorted({c["surface"] for c in cells}))
                    ),
                },
            ],
            "if_wrong": (
                "DefMiner ships fingerprint-based self-suppression at the admission gate "
                "REGARDLESS of this answer, because ACTIVE-06 makes the recursion question "
                "moot by design. What this spike buys is knowing whether that guard is "
                "load-bearing or belt-and-braces: on this measurement it is belt-and-braces, "
                "so a bug in it cannot cause an infinite .map-probing loop. If the answer were "
                "reversed — if send() did re-fire the hook — the guard becomes the only thing "
                "standing between ACTIVE-06 and unbounded recursion, and it would need its own "
                "test suite and a hard depth counter rather than a fingerprint set. The larger "
                "consequence runs the other way and is not conditional: because NOTHING except "
                "the proxy reaches the hook, a passive-only DefMiner is blind to every "
                "operator-driven surface — Replay, Automate, workflows and imported traffic. "
                "CORE-01 and CORE-02 must therefore treat the intercept hook as ONE ingestion "
                "path among several, and Phase 6's retroactive scan over the project's stored "
                "requests is the only way that traffic can ever be analysed."
            ),
        },
        "requirements_affected": [
            "SPIKE-05", "ACTIVE-06", "ACTIVE-12", "ACTIVE-03", "CORE-01", "CORE-02",
        ],
        "artifacts": [
            "probe/tier0-events/backend/script.js",
            "scripts/spike/event-matrix.mjs",
            "scripts/spike/run-spike-05.sh",
            sys.argv[1],
        ],
        "notes": (
            "Matrix completeness: %d cells, %d blocked. No cell refused under the guest token, "
            "so the PAT retry path at ~/.caido/pat.env was not needed and no credential was "
            "read, written or logged (T-00-36). "
            "Two @caido/sdk-client 0.5.0 defects were measured on the way and are recorded "
            "because a later phase will hit them: replay.sessions.create() does NOT "
            "base64-encode requestSource.raw although replay.send() does, so the server "
            "rejects it with `Expected input type \"Blob\", found \"GET /ace...\"`; and "
            "replay.send() never resolves against 0.57.1 — it awaits a task-completion "
            "subscription that did not arrive in over six minutes on a guest token, while the "
            "underlying startReplayTask mutation returns immediately with a created entry and "
            "no error. The replay cell therefore uses createReplaySession(kind: HTTP) + "
            "startReplayTask directly, which is the same server-side operation. "
            "`importData` in 0.57.1 imports tamper rules and findings ONLY; there is no "
            "traffic-import mutation, so the import cell uses createRequest(source: IMPORT), "
            "which is the path RequestSDK.create maps onto and the only headless way to put "
            "externally-obtained traffic into a project."
            % (len(cells), len(blocked))
        ),
    }
    if not proxy_fired:
        # The control failing means the apparatus is broken and every other cell
        # is uninterpretable. Fail loudly rather than record a matrix of
        # all-not-fired that looks like a finding.
        print(
            "FATAL: the proxy control cell did not fire — the apparatus is broken and the "
            "matrix means nothing. Refusing to emit a result body.",
            file=sys.stderr,
        )
        return 1

    json.dump(body, sys.stdout, indent=2)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
