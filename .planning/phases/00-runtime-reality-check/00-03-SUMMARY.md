---
phase: 00-runtime-reality-check
plan: 03
subsystem: event-delivery
status: complete
tags: [spike, caido, events, intercept, cache, backpressure, playwright, error-handling]

requires:
  - "00-01 — instance.sh, probe-run.sh, record-result.py, origin.py, the schemas and the two vitest gates"
provides:
  - "results/SPIKE-05.json — SEND_REFIRES_INTERCEPT, SAVE_FALSE_SUPPRESSES_INTERCEPT, PLUGINS_FALSE_SUPPRESSES_INTERCEPT, SURFACES_FIRING_INTERCEPT"
  - "results/SPIKE-11.json — CACHED_RESPONSES_REACH_HOOK, STATUS_304_REACHES_HOOK, RETROACTIVE_SCAN_MANDATORY"
  - "results/SPIKE-03.json — EVENT_OVERFLOW_BEHAVIOUR, EVENTS_DELIVERED_UNDER_BLOCK, HANDLER_ERROR_SURFACED"
  - "probe/tier0-events — one probe serving all three spikes: delivered-event log, plugin-originated send, caido:http fetch, blocking and error-injection modes"
  - "SPIKE-10-progress.json refreshed with a third recorder session"
affects:
  - "00-04 — reads all three results into the go/no-go table"
  - "Phase 1 CORE-01/CORE-02/CORE-03/CORE-04/CORE-10 — ingestion contract, queue sizing, admission gate"
  - "Phase 2 ERR-03 / OBS-01 — Caido surfaces no handler error at all"
  - "Phase 6 FIND-03/FIND-04 — retroactive scan is a correctness requirement"
  - "Phase 8 ACTIVE-03/ACTIVE-06/ACTIVE-12 — self-suppression is redundant; active retrieval is invisible to the hook"

tech-stack:
  added: []
  patterns:
    - "One probe, one apparatus, three spikes — the same handler code measured all three questions"
    - "Every not-fired cell carries an independent origin-side witness, so 'never sent' and 'sent but not delivered' are distinguishable"
    - "A CLOSING control re-runs after every negative cell, so a late negative cannot be a dead handler"
    - "Measured negatives encode as values ('no-effect', 'neither'), never as null"

key-files:
  created:
    - probe/tier0-events/manifest.json
    - probe/tier0-events/backend/script.js
    - scripts/spike/event-matrix.mjs
    - scripts/spike/run-spike-05.sh
    - scripts/spike/analyse-spike-05.py
    - scripts/spike/cache-browse.mjs
    - scripts/spike/run-spike-11.sh
    - scripts/spike/analyse-spike-11.py
    - scripts/spike/block-load.sh
    - scripts/spike/run-spike-03.sh
    - scripts/spike/analyse-spike-03.py
    - .planning/phases/00-runtime-reality-check/results/SPIKE-05.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-11.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-03.json
  modified:
    - .gitignore
    - .planning/phases/00-runtime-reality-check/results/SPIKE-10-progress.json

decisions:
  - "The blocking and error-injection modes shipped in the probe from task 1, so all three spikes measured byte-identical handler code"
  - "Every cell and scenario carries an origin-side witness; without it a not-fired result is ambiguous and unusable"
  - "save:false / plugins:false encode as the measured negative 'no-effect' — there is nothing to suppress when the baseline does not fire"
  - "SPIKE-03 ran its own idle baseline on the same instance rather than comparing against the research's 710 req/s"
  - "Replay drove raw GraphQL because @caido/sdk-client 0.5.0's replay.send() never resolves against 0.57.1"
  - "SPIKE-11 scenario 2 uses a second page rather than page.reload(), which Chromium turns into a revalidation"

metrics:
  duration_min: 45
  completed: 2026-08-20
  tasks: 3
  commits: 4
  files_changed: 46

actuals:
  tokens: 41951
  tasks: 3
  commits: 4
---

# Phase 0 Plan 03: Event Matrix, Cache Delivery and Backpressure — Summary

Settled what Caido actually hands to `onInterceptResponse`, from where, and what it does when the plugin will not take it. All three answers are cleaner and more consequential than the plan anticipated, and one of them redraws the ingestion contract for the whole product.

## The Three Answers

| Threshold | Value | Spike |
|---|---|---|
| `SEND_REFIRES_INTERCEPT` | **`false`** | 05 |
| `SAVE_FALSE_SUPPRESSES_INTERCEPT` | **`no-effect`** | 05 |
| `PLUGINS_FALSE_SUPPRESSES_INTERCEPT` | **`no-effect`** | 05 |
| `SURFACES_FIRING_INTERCEPT` | **`proxy`** | 05 |
| `CACHED_RESPONSES_REACH_HOOK` | **`false`** | 11 |
| `STATUS_304_REACHES_HOOK` | **`true`** (body length 0) | 11 |
| `RETROACTIVE_SCAN_MANDATORY` | **`true`** | 11 |
| `EVENT_OVERFLOW_BEHAVIOUR` | **`queue`** | 03 |
| `EVENTS_DELIVERED_UNDER_BLOCK` | **500 of 500** | 03 |
| `HANDLER_ERROR_SURFACED` | **`neither`** | 03 |

## SPIKE-05 — the hook is a proxy hook and nothing else

Eleven cells across seven surfaces. Only the proxy fired.

| Surface | Reached the origin | Hook fired | Caido's own label |
|---|---:|:---:|---|
| proxy (opening control) | 1 | **yes**, 200 | `INTERCEPT` |
| replay | 1 | no | — |
| automate | 2 | no | — |
| import (`createRequest`, source `IMPORT`) | 0 (never on the wire) | no | `IMPORT` |
| workflow (active, JS node `sdk.requests.send()`) | 1 | no | — |
| plugin-send `save:true plugins:true` | 1 | no | — |
| plugin-send `save:true plugins:false` | 1 | no | — |
| plugin-send `save:false plugins:true` | 1 | no | — |
| plugin-send `save:false plugins:false` | 1 | no | — |
| `caido:http` fetch | 1 | no | — |
| proxy (closing control) | 1 | **yes**, 200 | `INTERCEPT` |

Zero blocked cells; no surface refused under the guest token, so the PAT at `~/.caido/pat.env` was never read and no credential entered any file.

**The origin-side witness is what makes this readable.** Every non-proxy surface except the import cell *did* put a real request on the wire and *did* get a 200 with the full 457,965-byte body back — the origin logged each one. So these are not surfaces that failed to send. They are surfaces Caido does not route through the intercept hook. The closing proxy control fired after all of them, so none of the negatives is a handler that quietly died.

The workflow cell needed its own witness because "the hook did not fire" and "the workflow never ran" look identical from outside. The instance log settles it: `DFMWF ok marker=workflow-… status=200` — the JS node ran, sent, and got a 200.

`save:false` returns **request and response ids of `0`** on both of its cells, exactly as documented. That is the fact ACTIVE-12 rests on: an unsaved send leaves the plugin no handle it can resolve later.

**The recursion question is answered and it is moot.** `sdk.requests.send()` does not re-fire the hook under any combination, so ACTIVE-06's fingerprint self-suppression is belt-and-braces rather than load-bearing. But the far bigger consequence runs the other way and is not conditional: **a passive-only DefMiner is blind to every operator-driven surface.** Replay, Automate, workflows and imported traffic never reach the plugin. CORE-01 and CORE-02 must treat the intercept hook as one ingestion path among several.

## SPIKE-11 — a returning visitor's bundle is invisible twice over

Five browser-driven scenarios, Playwright Chromium on a throwaway persistent profile, three witnesses each.

| Scenario | On the wire | Served from cache | Origin | Hook | Delivered |
|---|---|---:|---:|:---:|---|
| cold | `[200]` | 0 | 1 | **yes** | 200, 457,965 bytes |
| cached-fresh | `[]` | **1** | **0** | **no** | — |
| revalidate-prime | `[200]` | 0 | 1 | yes | 200, 457,965 bytes |
| revalidate-304 | `[304]` | 0 | 1 | **yes** | **304, 0 bytes** |
| hard-reload | `[200]` | 0 | 1 | yes | 200, 457,965 bytes |

The `no-store` HTML wrapper fired the hook in **every** window including the cached one, so the handler was demonstrably alive when the cached subresource did not arrive.

**Scenario 2 is the decider.** Chromium served the bundle from its own cache, put nothing on the wire, and the origin saw nothing. The bundle did not merely miss the hook — **it never entered Caido at all.**

**The 304 does reach the hook**, with `Body.length == toRaw().length == 0`. Its delivered headers carry `etag`, `last-modified`, `cache-control` and `content-length: 0` — and **no `content-type` at all**. Any admission gate keyed on content type will classify a 304 as non-script. That is a CORE-02 consequence independent of caching.

Two things follow for Phase 6, and they are complements rather than alternatives. FIND-03's retroactive scan over stored requests recovers a bundle only if it was captured *with a body* at some earlier point; FIND-04 must resolve a stored 304 back to the 200 that carried the body, keyed on URL plus ETag, or it will index an empty response. And because a fresh cache hit never enters Caido in any form, retroactive scanning alone is still not sufficient — the bundle has to be re-fetched actively, which SPIKE-05 just proved is invisible to the hook, so that re-fetch must feed the analyser **directly** rather than expecting its own traffic to come back around.

## SPIKE-03 — Caido queues, and it queues generously

Identical 500-request, 20-way rig run twice on one instance: idle baseline, then a handler armed to spin for 30,000 ms on the first delivered event.

| | Baseline (idle) | Blocked (30 s) |
|---|---:|---:|
| Requests issued | 500 | 500 |
| Returned 200 to client | 500 | 500 |
| Delivered to handler | 500 | **500** |
| Wall clock | 688 ms | **715 ms** |
| Latency p50 / p95 / p99 / max (ms) | 4.12 / 49.26 / 379.17 / 581.09 | 4.80 / 73.32 / 225.94 / 457.49 |

Of the 500 delivered, **exactly one arrived during the block** (the one that caused it) and **499 arrived in a 20 ms burst** after it released, sequence numbers 501–1000 **contiguous**, probe drop counter 0 against a row cap of 4,000 — eight times the request count, so a shortfall could not have been the probe's doing.

**The whole 500-request burst finished in 715 ms while the handler was still spinning**, and the blocked run's p99 and max were *lower* than the idle baseline's. A thirty-second plugin-thread stall is invisible to the proxy's clients. That confirms the research's claim with numbers and settles the distinction the plan asked for: a stalled plugin thread is not a stalled proxy.

**Both handler errors are swallowed.** The probe logged `MARK THROW_SYNC_ABOUT_TO_THROW` and `MARK REJECT_ASYNC_RETURNING_REJECTION` immediately before each injection, so both handlers demonstrably ran. The thrown `Error` carried text unique to this run. It appears **zero times** in the host `logging.2026-08-20.log` (22,876 lines), **zero times** in stdout, **zero times** in stderr. Every error-level line in the run is Caido's own startup noise or a GraphQL trace, none inside an injection window. The plugin kept receiving events afterwards (5 more in each follow-up batch), so the handler was not torn down — the error simply vanished.

For ERR-03 and OBS-01 that is a hard constraint: **Caido provides no handler-error visibility whatsoever.** Every handler must wrap its own body in try/catch and log through `sdk.console` itself. An uncaught rejection inside DefMiner will be silent in production, and a crash-looping analyser will look, from outside, exactly like an idle one.

## Findings Not In The Research

1. **`@caido/sdk-client@0.5.0` `replay.sessions.create()` does not base64-encode `requestSource.raw`**, although `replay.send()` does. The server rejects it with `Expected input type "Blob", found "GET /ace..."`. Encoding by hand fixes it.
2. **`@caido/sdk-client@0.5.0` `replay.send()` never resolves against 0.57.1.** It awaits a task-completion subscription that did not arrive in over six minutes on a guest token, while the underlying `startReplayTask` mutation returns immediately with a created entry and `error: null`. Any later phase driving Replay headlessly must use the mutation pair.
3. **`CreateReplaySessionInput` requires `kind: ReplaySessionKind!`** (`HTTP` or `WS`) in 0.57.1.
4. **`importData` imports tamper rules and findings ONLY.** There is no traffic-import mutation. The only headless way to put externally-obtained traffic into a project is `createRequest(source: IMPORT)`, which is what `RequestSDK.create` maps onto — and it never touches the network.
5. **A guest is limited to ONE project.** Creating a second temporary project returns `PermissionDeniedUserError` even though the first succeeded. Reuse the existing project; do not create per-run.
6. **GraphQL payload shapes are inconsistent about `error`.** `CreateAutomateSessionPayload` and `CreateRequestPayload` have no `error` field at all (and `createRequest` returns `{id, responseId}`, not a `request`), while `UpdateAutomateSessionPayload`, `CreateWorkflowPayload` and `RunActiveWorkflowPayload` do. A driver that assumes the `{thing, error}` shape fails on three mutations.
7. **Chromium bypasses a configured proxy for loopback by default.** `--proxy-bypass-list=<-loopback>` is load-bearing for any local-origin browser spike; without it the browser reaches the origin directly, Caido sees nothing, and every scenario reads not-fired for a reason unrelated to the question.
8. **A 304 delivered to the plugin has no `content-type` header.**
9. **`Network.responseReceived` reports the revalidated 200, not the 304.** The on-the-wire status is only visible in `Network.responseReceivedExtraInfo`. A cache spike measured from `responseReceived` alone would report zero 304s and conclude the browser never revalidated.

## Deviations from Plan

No checkpoints were reached and no architectural decision was needed. All deviations are Rule 1–3 auto-fixes and judgement calls.

### Judgement calls

**1. The blocking and error-injection modes shipped in the probe at task 1, not task 3.**
The plan has task 3 "extend `probe/tier0-events/backend/script.js` with a blocking mode". Writing all the modes up front and arming them by RPC means **SPIKE-05, SPIKE-11 and SPIKE-03 all measured byte-identical handler code**, on the same installed package. Had the probe changed between tasks, SPIKE-03's delivery count would have been taken against a different handler than SPIKE-05's not-fired matrix, and the two would not be directly comparable. The `idle` path is unchanged by the presence of the modes: it is a single `if (mode === IDLE …) return;`.

**2. SPIKE-03 ran its own idle baseline instead of comparing against the research's 710 req/s.**
The plan says "the delta against that baseline is the measurement". A number measured in a different session, on a different instance, under a different host load is a weak baseline for a latency comparison. Running the identical rig against an idle handler on the *same instance minutes earlier* makes the delta attributable to the block and nothing else. The research figure is still confirmed in passing — 500 requests in 688 ms is 727 req/s.

**3. Runner and analyser scripts added beyond `files_modified`.**
`run-spike-05.sh`, `run-spike-11.sh`, `run-spike-03.sh`, `analyse-spike-05.py`, `analyse-spike-11.py`, `analyse-spike-03.py`. Same precedent as waves 1 and 2: the plan names the spikes but no runners, and putting the logic in committed scripts keeps every result regenerable instead of the product of an untracked one-off command. **No result file was hand-edited**; every verdict is derived by the analyser from the recorded evidence, so a changed measurement changes the verdict automatically.

### Auto-fixed

**4. [Rule 1 - Bug] The hard-reload scenario measured the wrong page.**
Found during the first SPIKE-11 run. CDP `Page.reload` reloads whatever is currently loaded, and scenario 4 had left the browser on `p4.html`, so the "hard reload" reloaded the revalidation page while the measurement filtered on the freshness resource. It reported wire `[]`, origin 0, hook false and page-hook false — a scenario that looked like a finding and was an addressing error. Fixed by positioning the browser on `p2.html` *before* the scenario window opens; `scenario()` drains first, so the positioning navigation contributes nothing. The whole spike was re-run from a fresh instance afterwards.

**5. [Rule 3 - Blocking] Three GraphQL payload-shape errors in the matrix driver.**
`createAutomateSession`, `startAutomateTask` and `createRequest` were queried with `{thing, error}` selections that do not exist on those payload types, and `createReplaySession` was missing the required `kind`. Each returned a GraphQL error that the driver correctly recorded as `blocked` with the verbatim text — which is the completeness rule working, but a blocked cell is a hole in the matrix, not a result. Fixed against the live schema and re-run until every cell carried a real state.

**6. [Rule 1 - Bug] `@caido/sdk-client` replay path replaced.**
See findings 1 and 2. The SDK's `replay.send()` hung the driver for the full 400-second budget with no output. Fixed by driving `createReplaySession` + `startReplayTask` directly, and by adding a **per-cell action timeout** so that no single hanging surface can ever again cost the whole matrix — a surface that hangs now records its state and the run continues.

**7. [Rule 2 - Correctness] A cell whose action errored but whose hook fired was being recorded as `blocked`.**
The first version set `state = "blocked"` on any action error and kept it there. That is a false negative: delivery is delivery, and a surface that delivered an event while its driver call timed out demonstrably *does* fire. The rule is now `fired > blocked > not-fired`, with the verbatim error retained either way.

**8. [Rule 2 - Correctness] `SPIKE-10-progress.json` was still carrying wave 1's numbers.**
`recorder-session.sh` runs `cache-rate.py` but not `spike-10-progress.py`, so after three sessions the progress artifact still read 2,268 rows. Plan 00-04 reads this file. Regenerated: **6,827 rows, 1,489 distinct hashes, 2 sessions, still one distinct calendar day**, so `cross_day_denominator` remains 0 and the cross-day rate remains **UNDEFINED, not zero**. This plan's session landed on the same calendar day as waves 1 and 2, as the orchestrator anticipated; 00-04 routes it through its sanctioned inconclusive branch.

**9. [Rule 2 - Correctness] `.gitignore` extended.**
SPIKE-11 builds a 912 KB web root and a 3.4 MB throwaway Chromium profile under the run directory, and fetches the instance's per-run CA. All three are regenerable and none is evidence — everything the result quotes is extracted into `spike-11-cache.json`. Ignored rather than shipped.

**10. [Rule 1 - Bug, in my own analyser] Error attribution was collapsed.**
`analyse-spike-03.py` initially decided `HANDLER_ERROR_SURFACED` from a single aggregate hit count, which could not distinguish "Caido surfaces the throw but not the rejection" from "both" or "neither". The two injected errors carry *different* unique texts; the analyser now attributes hits to each and can report `both`, `sync`, `async`, `partial` or `neither`. The recorded answer is unchanged (`neither`) — the fix removes a way the instrument could have been wrong rather than a wrong number.

## Threat Mitigations Applied

| Threat | Verified |
|---|---|
| T-00-31 | The block was bounded to 30 s, ran last in the plan on an instance nothing else needed, and the instance answered every subsequent RPC. Teardown `kill -9`. The Caido core stayed healthy throughout — 500/500 proxied requests returned 200 *during* the block. |
| T-00-32 | Every instance via `instance.sh`: `127.0.0.1` only, 8080 refused unconditionally. Playwright was pointed at the loopback proxy and the instance's own CA. Operator's pid 90236 untouched and still serving 8080 at the end of the run. |
| T-00-33 | Chromium ran on a throwaway persistent profile inside the run directory against the local origin on 8083 only — no real site, no operator credentials, no logged-in session. The profile is gitignored and the instance data path is removed at teardown. |
| T-00-34 | Every SPIKE-05 cell carried a unique `?dfm=` marker and the event log was drained to empty before each cell and polled to settlement after it. Stray-event counts recorded per cell: **0 across all eleven**. SPIKE-11 attributes by drain window because caching requires a stable URL; the markers still identify the resource. |
| T-00-35 | Every cell carries one of three explicit states and the verify gate asserts that no cell lacks a state and no blocked cell has a null error. **Zero cells were blocked in the recorded run** — every surface was exercised to a real result. |
| T-00-36 | No surface refused under the guest token, so the PAT retry path was never taken. `~/.caido/pat.env` was never read. All three result files scanned clean of credential material; `runs/*/token` remains gitignored and is deleted at teardown. |
| T-00-3SC | **Holds as written.** `git diff --stat pnpm-lock.yaml package.json` is empty — this plan installed nothing. |

## Plan Verification

| # | Check | Result |
|---|---|---|
| 1 | `pnpm vitest run --reporter=dot` | **41/41 passed**, all three new results schema-valid |
| 2 | Every result reports `binary.reported_version` 0.57.1 | asserted by `tests/schema.spec.ts` |
| 3 | SPIKE-05 has no measurement lacking a state, no blocked measurement lacking an error | jq gate passes; 0 blocked |
| 4 | SPIKE-03 reports exactly 500 issued alongside the delivered count | jq gate passes |
| 5 | `git diff --stat pnpm-lock.yaml` empty | empty |
| 6 | No `scripts/spike/` file created by plan 00-01 modified | `git diff --name-status` shows only additions there |

Each task's own `<automated>` gate was run and passed before its commit.

## Known Stubs

None. No placeholder values, no unwired data paths, no TODO/FIXME introduced.

## For Plan 00-04

- **`SURFACES_FIRING_INTERCEPT` is `proxy` and nothing else.** If the go/no-go table implies DefMiner can observe operator-driven traffic passively, it is wrong.
- **`SAVE_FALSE_SUPPRESSES_INTERCEPT` and `PLUGINS_FALSE_SUPPRESSES_INTERCEPT` carry the string `no-effect`, not a boolean.** They are measured negatives in the sense wave 1 established for `TEXTDECODER_MODULE`; do not coerce them to `false`, which would read as "measured, and it does not suppress" when the truth is "there is nothing to suppress".
- **`EVENT_OVERFLOW_BEHAVIOUR: queue` means Caido's buffer is unbounded as far as a 30-second stall could probe.** CORE-03's bounded queue protects DefMiner's own RSS, not Caido — size it against SPIKE-06's 102 bytes of RSS per input byte, not against an assumed upstream limit.
- **`HANDLER_ERROR_SURFACED: neither` is a hard constraint, not a preference.** Any row in the table implying Caido gives error visibility is wrong.
- **SPIKE-10 is still at one distinct calendar day** after this plan's session (6,827 rows, 1,489 hashes, 2 sessions). `cross_day_denominator` is 0 and the rate is UNDEFINED. Take the sanctioned inconclusive branch with `status: "inconclusive"` and `revisit_after`; wave 1 already flagged that a null value plus those two fields is what `tests/spike-results.spec.ts` permits.
- **SPIKE-11's numbers are macOS + Chromium-specific** in the same sense SPIKE-12's are macOS-specific. The cache *decision* is standard HTTP, but the `<-loopback>` proxy behaviour and the CDP event shapes are Chromium's.

## Self-Check: PASSED

All 14 claimed created files and both claimed modified files exist on disk. All 4 claimed commits (`817f7a3`, `a88de78`, `2e1a39f`, `d7a0fc3`) resolve in git. Full vitest suite green at 41/41 with all three new result files validating against `spike-result.schema.json` and reporting `binary.reported_version` 0.57.1. No process remains on 8995, 8996 or 8083; the only live `caido-cli` listeners are the operator's 8080 and the shared recorder's 8998.
