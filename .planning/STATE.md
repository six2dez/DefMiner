---
gsd_state_version: 1.0
milestone: v2
current_phase: 01
current_phase_name: Skeleton, Persistence & Compatibility
status: executing
stopped_at: Completed 01-21-PLAN.md
last_updated: "2026-08-24T09:33:29.186Z"
last_activity: 2026-08-24
last_activity_desc: Phase 01 execution started
state_head: 1977b00467817118c2c679add584413986dd021b
progress:
  total_phases: 11
  completed_phases: 0
  total_plans: 22
  completed_plans: 21
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-20)

**Core value:** When a target's JavaScript contains something that expands the attack surface, DefMiner surfaces it — with a low enough false-positive rate that the operator actually reads every finding.
**Current focus:** Phase 01 — Skeleton, Persistence & Compatibility

## Current Position

Phase: 01 (Skeleton, Persistence & Compatibility) — EXECUTING
Plan: 22 of 22
Status: Ready to execute
Last activity: 2026-08-24 — Completed 01-20 (URL_MAX segment-boundary truncation, WR-22 / IN-18)

Progress: [█████████░] 91% of phase 01 (20 of 22 plans)

> The frontmatter's project-wide bar is still not recomputed here: `state.update-progress`
> returned `progress percent withheld by buildStateFrontmatter` on this run too — it has
> now done so on SEVEN consecutive plans (01-07 … 01-11, 01-14 and 01-17), so this is the
> handler's steady behaviour on this repo and not a transient. The figure above is the
> phase-local one, computed from the 17 PLAN / 17 SUMMARY files on disk and stated with
> its basis rather than as an unexplained number.
>
> THE PROSE ABOVE WENT STALE AGAIN AND IS CORRECTED AGAIN, named rather than fixed
> quietly, because the SHAPE of the staleness is the point. It read "Plan: 4 of 22" and
> "100% of phase 01 (17 of 17 plans)" while 22 PLAN files and 20 SUMMARY files sat on
> disk — so the bar read 100% with two plans unwritten, which is the SAME
> confident-green failure the identical note recorded at 01-17 for the 14 -> 17 move.
> The `Plan:` counter is what drifts: `state.advance-plan` increments whatever number is
> already there, so once it falls behind it stays behind and the bar built on it reads
> full. Recomputed here from the files on disk (22 PLAN / 20 SUMMARY = 91%), which is
> the only number that cannot drift, and the `Plan:` counter set to 21 from the same
> count rather than from its own previous value.

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 00 P01 | 33m | 3 tasks | 45 files |
| Phase 00 P02 | 105m | 3 tasks | 53 files |
| Phase 00 P03 | 45m | 3 tasks | 46 files |
| Phase 00 P04 | 92 | 3 tasks | 123 files |
| Phase 01 P01 | 35 min | 2 tasks | 38 files |
| Phase 01 P02 | 21 min | 2 tasks | 26 files |
| Phase 01 P04 | 28 min | 3 tasks | 15 files |
| Phase 01 P03 | 37 min | 3 tasks | 22 files |
| Phase 01 P05 | 35 min | 3 tasks | 14 files |
| Phase 01 P06 | 24 min | 3 tasks | 37 files |
| Phase 01 P07 | 49 min | 3 tasks | 35 files |
| Phase 01 P08 | 18 min | 3 tasks | 4 files |
| Phase 01 P09 | 22 min | 2 tasks | 2 files |
| Phase 01 P10 | 18 min | 4 tasks | 7 files |
| Phase 01 P11 | 30 min | 3 tasks | 7 files |
| Phase 01 P12 | 22 min | 2 tasks | 2 files |
| Phase 01 P13 | 13 min | 1 tasks | 1 files |
| Phase 01 P14 | 18 min | 2 tasks | 26 files |
| Phase 01 P15 | 18 min | 3 tasks | 4 files |
| Phase 01 P16 | 34 min | 3 tasks | 8 files |
| Phase 01 P17 | 19 min | 2 tasks | 28 files |
| Phase 01 P18 | 22 min | 3 tasks | 4 files |
| Phase 01 P19 | 18 min | 3 tasks | 4 files |
| Phase 01 P20 | 25 min | 2 tasks | 3 files |
| Phase 01 P21 | 12 min | 2 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Those affecting current work:

- **Init**: Build on Caido, not a JSMiner port — JSMiner is unmaintained since 2023 and its detection ceiling is low
- **Init**: Parity baseline is `caido-community/JS-Analyzer`, not JSMiner. The differentiator is architectural — a pipeline that actually analyses, persists, aggregates, and diffs
- **Init**: Hybrid regex + AST engine. Meriyah over Acorn, confirmed independently by two models with separate benchmarks
- **Init**: Extract JWT / GraphQL / CSP data, do not analyse it deeply — dedicated Caido plugins already own those niches
- **Init**: Raw secrets never persisted; HMAC fingerprint plus redacted preview, revealed by re-verifying the original request's body hash
- **Init**: ⚠️ `.map` guessing ON by default and unbudgeted, per operator decision taken with `caido/caido#2211` evidence on the table. Accepted risk: cumulative `sdk.requests.send()` can abort `caido-cli`. Mitigation is diagnostic only (visible send counter). Revisit if fixed upstream
- **Init**: Detector corpus from permissive sources only — gitleaks, nuclei-templates, retire.js, jsluice. TruffleHog (AGPL) and SecretFinder (GPL) studied, never copied
- **Init**: Detector rules ship with the plugin version — the Caido Developer Policy forbids any plugin self-update mechanism
- [Phase 0]: setTimeout(fn,0) is the only primitive that yields the QuickJS event loop; cost 5.03ms median, so the yield trigger must be temporal (MAX_SYNC_SLICE_MS=25), not per-chunk
- [Phase 0]: RSS is a high-water mark, not a live gauge — it never falls, so QUAL-06 cannot assert 'memory after <= memory before'
- [Phase 0]: TextDecoder is reachable from no module, but string_decoder.StringDecoder and buffer.Buffer are — ENC-01/ENC-02 bind to those
- [Phase 0]: A Caido instance with no project selected fails all proxying and never fires onInterceptResponse — a prerequisite for every traffic-observing spike
- [Phase 0]: sdk.meta.db().exec takes no bind parameters; binding requires prepare() then Statement.run(...params)
- [Phase 0]: SIZE_GATE_SOURCE is decompressed identity bytes — Caido decodes gzip/br/zstd before onInterceptResponse
- [Phase 0]: MAX_NESTING_DEPTH taken as the minimum across nesting shapes (246 parens, not 710 brackets)
- [Phase 0]: HARD_MAX_BYTES is time-bound not memory-bound; the timeout boundary was deliberately not bisected
- [Phase 0]: Phase 1 storage must use single-statement idempotent upserts — BEGIN does not span exec calls, and fails silently
- [Phase 0]: MAP-04 containment can use an lstat component walk; lstat exists on this build, realpath does not
- [Phase 0]: onInterceptResponse fires for proxied traffic ONLY — replay, automate, workflow, plugin sends and caido:http fetch are all invisible to it (SPIKE-05)
- [Phase 0]: sdk.requests.send() does not re-fire the hook under any save/plugins combination, so ACTIVE-06 self-suppression is belt-and-braces, not load-bearing
- [Phase 0]: A browser-cache hit never enters Caido at all and a 304 arrives with a zero-length body and no content-type — RETROACTIVE_SCAN_MANDATORY is true
- [Phase 0]: Caido QUEUES intercept events: 499 survived a 30 s handler block and arrived in a 20 ms burst, contiguous, nothing lost; the proxy never stalled
- [Phase 0]: Caido surfaces neither a synchronous throw nor an async rejection from a handler — ERR-03/OBS-01 must do all error visibility themselves
- [Phase 0]: SPIKE-01: a catastrophic regex hangs the QuickJS thread with no interrupt and no in-runtime recovery — SIGKILL is the only way out, and attempting togglePlugin against a wedged plugin takes every OTHER plugin's RPC down with it
- [Phase 0]: re2js adopted for generic-shaped rules only (adopt-generic): 59.7x slower in aggregate but FASTER than native on 7 of 13 literal-anchored rules; runs inside DET-06's bounded windows, native keeps the whole-body prefilter
- [Phase 0]: caido/caido#2211 did not reproduce at 2,000 sends in either wrapper shape, so SEND_CLIFF_* are FLOORS not cliffs; Phase 8 must re-test with real .map bodies and concurrent sends before treating the floor as headroom
- [Phase 0]: ACTIVE-02's write-ahead journal validated against four real abrupt host deaths: 2 caught the exact in-flight send, 2 correctly left no open row, 0 false positives
- [Phase 0]: last_insert_rowid() is unusable on sdk.meta.db()'s pooled connection — STORE-01..07 must key writes on a natural key
- [Phase 0]: togglePlugin genuinely rebuilds the QuickJS runtime (new session id, per-runtime counter reset to 0) and the plugin database survives it, so ACTIVE-13 has a cheap reset primitive — but only while the runtime still answers
- [Phase 0]: CACHE_HIT_RATE_CROSS_DAY is inconclusive at 1 sampled day and a zero denominator; Phase 1 CORE-08 budgets against CACHE_HIT_RATE_ASSUMED=0.40 until it is re-measured after 2026-09-03
- [Phase 0]: go-no-go.json is the only Phase 0 artifact later phases may import; every tunable constant must import from it and be asserted equal by a test in the SDK-free engine workspace
- [Phase 01]: P2-D5 (execution-time correction to where P2-D1's pins live): DIST-06's overrides go in pnpm-workspace.yaml, NOT package.json's `pnpm` key — pnpm 11 no longer reads that field, so a pin written where the plan specified it would have been NO pin at all — Measured during execution: pnpm install printed `The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.overrides"`. tests/pins.spec.ts asserts the overrides in pnpm-workspace.yaml AND in the lockfile, and asserts the dead package.json key has not come back.
- [Phase 01]: @caido/eslint-config@0.10.0 installed after a human-approved gate="blocking-human" checkpoint on 2026-08-20 — the one Phase 1 package never exercised in Phase 0 (153 weekly downloads), approved with the github.com/caido/typescript-configs 404 known and explicit — Publisher/provenance PASS (last four releases via GitHub Actions OIDC trusted publishing), GitHub org MIXED (caido/typescript-configs and caido/tailwindcss 404 to the API while caido/sdk-js, caido/caido and caido-community/dev return 200 — Caido keeps some config repos private, not a lookalike org), install scripts PASS (none; the tree's only install script is still esbuild's). 01-RESEARCH.md's claim that no new package enters the Phase 1 build was FALSE for this package and is corrected in place.
- [Phase 01]: P2-D6: pnpm lint gates packages/**, scripts/ci/** and root config only — the Phase 0 harness is excluded BY NAME, because the Caido preset runs prettier as an error and this plan's own acceptance criterion freezes those trees byte-for-byte — Files are listed individually rather than as tests/**, so anything ADDED to tests/ later is linted by default and tests/pins.spec.ts is gated. A later phase allowed to touch the Phase 0 trees can widen the list in the same commit that reformats them.
- [Phase 01]: P4-D6: STORE-02 non-empty project_id is retrofitted onto the immutable v1 tables by BEFORE INSERT TRIGGERS, not a table rebuild — a rebuild is a multi-statement migration that can fail and would strand an open write transaction on an unreachable pooled connection; a trigger is stored in the schema and binds on every pooled connection
- [Phase 01]: P4-D7: retention bounds (row count AND age) apply PER TABLE PER PROJECT, not only to artifacts — real traffic upserts one artifact and inserts a new observation on every re-serve, so an artifact-only bound leaves the fastest-growing table unbounded
- [Phase 01]: P4-D8: failed is a TERMINAL scan_state in Phase 1, so a failed analysis is a cache hit — with no retry policy until ERR-02, a re-analysable failed re-walks the same bytes on every sighting with nothing to break the loop
- [Phase 01]: P3-D4 held: all four store call sites (upsertArtifact, recordObservation, the CORE-08 skip, the STORE-06 sweep) live in consumer.ts, each with a negative demonstration that was EXECUTED against the real source rather than described
- [Phase 01]: The consumer in-flight latch is MODULE-scoped, not per-call: a closure-local flag cannot see a second startConsumer(), which is the realistic way a second drain loop appears
- [Phase 01]: reloadMissing split into reloadMissing and reloadNoResponse — the SDK types these as two different optionality points and they call for different investigations
- [Phase 01]: walk() takes its abort surface structurally ({aborted, reason?}) rather than as AbortSignal, because Phase 0 never enumerated AbortController in this runtime
- [Phase 01]: knip's exports/types rules restored to error (01-02's instruction to this plan), at the cost of ignoreExportsUsedInFile — a documented hole to revisit in Phase 5
- [Phase 01]: P5-D5: PassiveDeps.admissionAllowed is REQUIRED, not optional-with-a-permissive-default — a default of allow is invisible when init() forgets to wire CORE-09's gate, so the plugin works and the isolation simply is not there
- [Phase 01]: P5-D6: the consumer captures a project EPOCH at the top of handleOne and re-checks it before every write — resolving the project id after the reload await wrote project A's traffic under project B, reproduced by neutering the guard, then closed
- [Phase 01]: P5-D7: the restart check reads the plugin database with sqlite3 rather than getArtifacts — a guest can create TEMPORARY projects only (temporary:false returns PermissionDeniedUserError, measured on 0.57.1), so the project dies with the restart while the artifacts must not
- [Phase 01]: P5-D8: describeError redacts URL-shaped substrings BEFORE truncating — truncating first leaves the front half of a URL, which is the half carrying the host (T-01-26). Found by the spec's recursive walk, not by review
- [Phase 01]: CORE-10 measured externally on 0.57.1: max_slice_ms 0.028 against a 25 ms budget over 200 distinct chunks, and the loaded RPC distribution sits AT OR BELOW the idle baseline — Phase 1's visit is a no-op, so the instrument is proven wired and the stress test only becomes meaningful in Phase 3
- [Phase 01]: P6-D4: the capability gate is TWO stages — checkCompat(sdk) reads properties only so its refusal opens nothing, checkRuntimeSurfaces(ctx) runs after meta.db() and before any hook, because a Database's method set is not discoverable without a Database
- [Phase 01]: P6-D5: api.caido.io publishes artifact hashes for 'latest' ONLY (/releases, /releases/0.57.1, /releases/v0.57.1 all 404), so fetch-caido.sh REFUSES a non-latest version unless its hash is committed in PINNED_SHA512 — an unverifiable executable is never downloaded
- [Phase 01]: P6-D6: COVERAGE.md rows 35/36 (string_decoder, buffer) reclassified INTEGRATE -> INTEGRATE (source-only): decode.ts is tree-shaken out of the shipped bundle, whose entire import set is one specifier (crypto). Requiring them would mean statically importing modules the plugin does not use
- [Phase 01]: P6-D7: a guest may hold at most ONE temporary project — a second createProject returns PermissionDeniedUserError even before either is selected — so onProjectChange is driven through the null -> project transition instead of a project switch
- [Phase 01]: [Phase 01] COMPAT-02 CLOSED by measurement: all 16 REQUIRED_SURFACES exercised on both Caido 0.57.1 and 0.58.0, matrices differ in exactly 3 fields (two fresh project UUIDs and the version under test). SQLite 3.46.0 on both. No behavioural difference.
- [Phase 01]: [Phase 01] The plan's cmpCaidoVersion(0.6.0, 0.57.1) POSITIVE criterion was INVERTED — Caido's minor runs 55/57/58, so 0.6.0 is ancient and must compare NEGATIVE. POSITIVE is what the string-compare trap produces. Implementing it as written would have accepted builds from before the measured minimum.

- [Phase 01]: P7-D1: a query VALUE is replaced WHOLE, carrying no length, no hash and no fingerprint — a length leaks a token's scheme, and an unsalted digest of a low-entropy value (`?debug=true`, `?user=alice`) is a rainbow-table lookup. The keyed fingerprint is SEC-04's HMAC and belongs to Phase 4; 01-RESEARCH.md's security domain says Phase 1 must not create a key it will then have to migrate. Idempotence falls out for free
- [Phase 01]: P7-D2: QUERY_NAME_MAX=64 bounds a RETAINED parameter name. A segment with no `=` is syntactically a NAME, so a values-only rule would pass a bare pasted token through verbatim (T-01-31). Residual, named rather than left to be found: a secret shorter than 64 chars used as a bare parameter name still survives
- [Phase 01]: P7-D3: the store redaction gate carries a FOURTH rule, `unredacted-persisted-error`, over error-shaped function PARAMETERS. The three catch-scoped rules cannot reach `analyses.ts:194` by construction — its binding is a parameter, not a caught exception — and :194 is the ONE line in the store layer that writes the `analyses.error` column. A catch-scoped-only gate would have had a hole one line below a site it does cover
- [Phase 01]: P7-D4 (execution-time correction to plan 01-07): the plan's stated rationale for the redact-before-truncate test is WRONG FOR THIS REDACTOR. Because a value is replaced whole regardless of length and URL_MAX truncation removes only a tail, the first `=` of every segment is stable — so truncate-first cannot expose a value either, and the assertion the plan asked for would have passed under BOTH orderings. The ordering case instead asserts the difference that IS observable (parameter names past the cut survive redact-first, are lost truncate-first) and fails under the mutation. The ordering stays load-bearing: any future redactor that preserves a length, a prefix or a fingerprint makes truncate-first leak immediately
- [Phase 01]: P7-D5 (operator decision at a blocking-human checkpoint, 2026-08-21): P1_EXPECT_VERSION moved 0.57.1 -> 0.58.0. An AUTHORISED EVIDENCE-CONTRACT CHANGE, not a version bump — 0.57.1 is unobtainable (the app bundle auto-upgraded in place; no PINNED_SHA512 entry; P6-D5 recorded api.caido.io 404s every non-`latest` version). COMPATIBLE IS NOT RE-MEASURED: 01-06 proved the 16 SDK surfaces behave identically, which is a claim about surface BEHAVIOUR, not timing or memory. Every go-no-go.json threshold was measured on 0.57.1 and none has been re-measured — a phase wanting to trust a Phase 0 NUMBER on 0.58.0 must re-measure first. Fail-closed tripwire verified in place: tests/phase1-load.spec.ts and tests/phase1-runtime.spec.ts still hard-code EXPECTED_CAIDO_VERSION "0.57.1", so re-running spa-load.sh or runtime-answers.sh FAILS loudly rather than contaminating a threshold artifact
- [Phase 01]: P10-D1 (operator decision at a `gate="blocking-human"` checkpoint, 2026-08-21): the bare-segment policy is **`redact-bare`** — a query segment carrying no `=` is a VALUE WITH NO NAME and is replaced with `QUERY_VALUE_REDACTION` whole; an EMPTY segment stays empty so the query's shape is not normalised. Re-opens P7-D2, which was a faithful reading of the operator's UAT words ("keeping the path and the parameter names") and not a bug: a bare segment is syntactically a name, so a values-only rule kept it — Executed evidence taken before the decision, through the real `normaliseObservedUrl`: eight credential formats (GitHub PAT 40, AWS access key id 20, Stripe secret 32, session hex 32, UUID 36, compact JWT 43, opaque 16, opaque 12) each came back BYTE-FOR-BYTE as a bare segment while the `?token=<literal>` form redacted correctly. Every one is shorter than `QUERY_NAME_MAX` = 64. WHY NOT `tighten-bound`, rejected on MEASUREMENT rather than taste: a 12-character opaque token survives at any bound ≥ 12, so catching it needs ≤ 11, which truncates `disableAnalytics` (16) and `enableExperimentalFeature` (25) into prefixes that still read as real flag names; at the proposed 16 the AWS key is caught but a 16-character token survives exactly and `sk_live_4eC39HqL` stays in the column. A bound picks which credentials are acceptable to keep; a rule does not. WHY NOT `allowlist`: its retained set is closed and length-immune, but Phase 1 has no corpus of real bundle-URL flags so the list would start as a guess, and a miss is indistinguishable from a caught credential. Adding an allowlist on top of `redact-bare` once there is real data is straightforward; recovering a by-construction guarantee after shipping a guessed list is not. ACCEPTED COST, stated rather than buried: bare feature flags (`?debug`, `?nocache`, `?prod`) become `<redacted>`, and bundle-URL flags are a genuine read on a target's build — but feature-flag analysis is not a Phase 1 capability, so nothing that exists today loses a signal it was using. Governs FUTURE writes only; rows already on disk were settled by P8-D1 against a measured zero. Enforced by `observations.spec.ts`'s `BARE_CREDENTIAL_SHAPES` block, mutation-proven: reverting the `eq === -1` branch turns 20 cases red, each naming the format whose literal survived
- [Phase 01]: P8-D1 (operator decision at a gate="blocking-human" checkpoint, 2026-08-21, resume signal `leave`): pre-policy `observations.url` rows are LEFT AS THEY ARE. The load-bearing reason is NOT that the measured count (0) is small — it is that the target population is CLOSED BY CONSTRUCTION. A pre-policy row can only be written by a build predating 01-07's write-path redactor; DefMiner has never shipped, so only a developer machine could hold one, and the one DefMiner database on this host holds zero. Every build from 01-07 onward redacts at write, so none can ever be added. A sweep would therefore be permanently dead code guarding an empty set that cannot grow — not machinery arriving early. STORE-06's 90-day window bounds an EMPTY SET: recorded as "no exposure to accept", not as an accepted exposure. T-01-36 closed by measurement; STORE-03 settled rather than dangling into 01-09
- [Phase 01]: P8-D2: an exposure measurement prefers `sqlite3 -readonly` (WAL-aware) and falls back to `file:<db>?mode=ro&immutable=1` ONLY where no `-wal` sidecar exists; where a read-only open fails AND a non-empty `-wal` is present, NO count is taken and the database is reported as a named error, never as a zero. Proven necessary on this run rather than argued: an immutable read of the one DefMiner database (45,352-byte `-wal`) reports NO TABLES AT ALL, from which a COUNT(*) harness derives a confident zero indistinguishable from a clean bill of health. Seven of the eight plugin databases on this host refused `-readonly` outright, so the naive fallback was the obvious path and would have fabricated the number the operator then decided against
- [Phase 01]: P9-D1: CORE-01's prohibition is now a GATE, not prose: packages/backend/src/outbound-prohibition.spec.ts audits every non-spec module in the backend package on every `pnpm test`, over four rules — outbound-send (direct call, element-access form, receiver alias, destructured method), outbound-net (ANY method on a `net` receiver, not just `connect`), outbound-fetch (the bare global only), outbound-import (all four caido:http specifier forms). Every rule has a firing fixture AND a legal fixture, and the whole gate was mutation-proven twice against real shipped source — The verifier's evidence line was explicit that NO WIRED ENFORCEMENT EXISTED: the DIST-05 bundle allowlist ADMITS caido:http (Phase 0 measured it loadable), and sdk.requests.send needs no import at all — so neither existing gate could catch a regression. Three Phase 0 measurements make that regression worse than it sounds: SURFACES_FIRING_INTERCEPT="proxy" and the non-re-firing send mean plugin-originated traffic is invisible to this plugin's own counters (no number anywhere would move), and caido/caido#2211 was filed against the exact target build. Both mutations were RUN, not described: a send planted in hooks/passive.ts produced `outbound-send: …/passive.ts`, a static caido:http import produced `outbound-import: …/passive.ts`. Note which one matters more — check:bundle would have PASSED mutation B (caido:http is on its allowlist as loadable) and can never see mutation A at all — RETAG 2026-08-21 (gap-closure round 2, plan 01-10 task 3): the prohibition this decision describes is **CORE-11**, not CORE-01. CORE-01 remains the non-async-handler requirement and says nothing about outbound traffic; the split reason and the STORE-01 → STORE-08 precedent are recorded inline on CORE-11 in `.planning/REQUIREMENTS.md`. This is a POINTER amendment appended to the decision, visible as such: not one word of P9-D1's own text or of the mutation outputs it quotes has been rewritten, because those are the record of what was actually run.
- [Phase 01]: P9-D2: scripts/ci/check-bundle-imports.mjs is deliberately NOT touched, and the two gates coexist by design — the bundle gate bounds what can LOAD, the new source gate bounds what the source may CALL — Its allowlist answers a different question: which specifiers Caido's QuickJS was MEASURED to resolve. caido:http is on it because the Phase 0 capability probe loaded it successfully, and that file's own header says the list is derived from a probe run and not authored. Removing an entry would silently redefine its semantics from "measured loadable" to "permitted", which is a lie about a measurement. The policy belongs in a source gate
- [Phase 01]: P9-D3: the outbound gate's alias tracking is scope-blind ON PURPOSE and says so in its own header — it resolves `const r = sdk.requests; r.send(req)` and `const { send } = sdk.requests; send(req)` but builds no symbol table, so an alias rebound in an inner scope escapes it (T-01-51, accept). Its second residual: a .spec.ts file could call an outbound surface unnoticed (T-01-50, accept), bounded by check:bundle, which specs never enter — The same bound consumer.spec.ts's CORE-05 audit works within. Claiming a precision the walk does not have is worse than the gap, because it gets trusted — so both residuals are stated in the gate's header rather than left for a reader to discover. The .spec.ts exclusion is not incidental: it is what lets this gate's own fixtures, which necessarily contain the forbidden shapes as source text, live inline with no temp file and no stray module for `tsc --build` to trip over — POINTER AMENDMENT 2026-08-24 (gap-closure round 4, plan 01-18 task 3): T-01-51's bound AS ORIGINALLY ACCEPTED — an alias rebound in an inner scope, later restated as a function boundary or more than one hop of indirection — DID NOT COVER two shapes that were silent. CR-08 executed them: a one-hop ASSEMBLED receiver key (`const k = "req" + "uests"; sdk[k].send(req)`) reported nothing while the member-level twin (`const m = "se" + "nd"; sdk.requests[m](req)`) and the global-level twin (`const k = "fet" + "ch"; globalThis[k](url)`) both reported; and a CONDITIONAL key of two receiver literals (`sdk[b ? "requests" : "net"]`), which hides nothing at all, was reported by no rule and named by no residual list. BOTH NOW REPORT, together with a comma sequence (`sdk[(0, "requests")]`), each pinned by a mutation-proven fixture titled with the mechanism that resolves it. THE ACCEPTED RESIDUAL AFTER THIS PLAN, in the same words as the gate's boundary 2 and as `REQUIREMENTS.md`'s CORE-11 correction: more than ONE HOP of indirection, a value crossing a FUNCTION BOUNDARY, and a key the walk NEVER SAW BOUND — a parameter, a loop binding, a name bound out of document order or in another file. That last exemption is preserved BY MEASUREMENT, re-run after the widening: 23 files over both source roots, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name. T-01-50 is unchanged. This is a POINTER amendment appended to the decision, visible as such, in P9-D1's retag style: not one word of P9-D3's own text above has been rewritten, because that is the record of what was actually accepted and when — SECOND POINTER AMENDMENT 2026-08-24 (gap-closure round 4, plan 01-19 task 3): T-01-51's bound is amended AGAIN, and this time it is amended in BOTH directions. CLOSED SINCE THE AMENDMENT ABOVE: WR-23 — `const e = eval; e(s)`, `const { eval: ev } = globalThis; ev(s)`, `const F = Function; new F("a", s)` and `const W = WebSocket; new W(url)` all reported NOTHING, in the rule whose own docblock told a reader it reached as far as the receiver rules beside it; all four now report through `globalAliases` and a single `globalNameOf` lookup shared by the call rule and the `new` rule. IN-20 — `const g = globalThis; g.fetch(u)` was silent because the aliases resolved one hop and the receiver they sit on did not; `globalThisAliases` closes it across all five global surfaces. WR-26 — `isProvablyNumeric`'s docblock claimed it PROVES rather than assumes and fails SAFE while two of its branches decide by member NAME and fail OPEN; the DOCBLOCK was corrected rather than the branch, and the choice was made by measurement, not preference (the review's proposed narrowing was applied and run and changed nothing; removing the branch entirely changed exactly two shapes, both ordinary `+` index compositions; and the motivating shape is silent under every variant because residual (b) silences it and the numeric exemption never does). AND ONE THING WAS FOUND OPENING WIDER THAN ANY DISCLOSURE HAD SAID, which is why this amendment is not only a narrowing: every alias set here is grown by consulting the LIVE set, so an ALIAS CHAIN resolves to ARBITRARY DEPTH, not one hop — true of `fetchAliases` and `navigatorAliases` since the day they were written and named by no residual list until now. THE ACCEPTED RESIDUAL AFTER THIS PLAN, in the same words as the gate's `THE FINAL RESIDUAL, AFTER PLAN 01-19` block, `REQUIREMENTS.md`'s CORE-11 correction and `WINDOWS.md`: CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in DOCUMENT ORDER: `const a = globalThis; const b = a; const g = b; g.fetch(u)` reports and so does the `sdk.requests` twin, while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary `+` indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name. T-01-50 is unchanged. CORE-11 is now `[x]`, flipped against an eight-row discharge table and not before it. This is a POINTER amendment appended to the decision, visible as such, in P9-D1's retag style: not one word of P9-D3's own text above, nor of plan 01-18's amendment to it, has been rewritten
- [Phase 01]: The `;` delimiter is a second DELIMITER, not a second POLICY: `redactDelimitedSegment` is the single helper both the query loop and the path loop call, so P10-D1's bare-segment rule reaches `;` by construction rather than by a second edit (plan 01-11).
- [Phase 01]: `redactPaths` is a STRING SCAN, not WR-12's suggested `(?:\/[A-Za-z0-9._-]+){2,}` — that nests a quantifier inside a quantifier on a runtime where REDOS_RECOVERY is "kill" and SIGKILL is the only exit (plan 01-11).
- [Phase 01]: `redactUrls`'s safety claim is a MEASUREMENT (200k adversarial input under 250 ms), not an argument about the pattern's shape; the argued paragraph was deleted (plan 01-11).
- [Phase 01]: The no-pattern gate's `telemetry.ts` exemption is a COUNT plus an ANCHOR — exactly one regex literal, inside `redactUrls` — never a file-name skip, so moving or renaming it fails until a new linearity measurement is owed (plan 01-11).
- [Phase 01]: The read-only allowlist for a requests receiver is get/query/inScope/matches, derived from what the backend actually calls (consumer.ts:344, admit.ts:197) plus COVERAGE.md rows 7 and 8 — so a future outbound method like sendRaw fails the CORE-11 gate without anybody having to enumerate it — Every one of those four reads EXISTING traffic and generates none; that is the whole membership test, which is what lets the rule be 'any member NOT on this list' rather than a list of forbidden method names that the next SDK release invalidates.
- [Phase 01]: An AST gate that cannot READ a construct must report it, never pass it: outbound-unanalysable fires on a computed key on a positively identified outbound receiver and on an import specifier that will not reduce to a literal — check-bundle-imports.mjs ALLOWLISTS caido:http (it answers 'measured loadable', not 'permitted'), so a dynamic import through a variable was invisible to both gates simultaneously — the single combination the two-gate design exists to rule out. Silence is indistinguishable from a pass.
- [Phase 01]: STORE-07's gate follows the binding (derivesFrom) rather than matching it, and every residual it does not cover carries a named owner with a checkable requirement id — isRefTo required a bare identifier, so e.message and every cast form useUnknownInCatchVariables pushes an author toward reported clean; a disclosure without an owner is read as somebody else's problem by every reader in turn
- [Phase 01]: P14-D2/D3: the `;` path parameter DOES reach observations.url through live Caido and is proven redacted against the database file; URL userinfo does NOT reach it at all, because curl lifts user:pass@ into an Authorization header — measured from curl's own -v trace, recorded with the run, and enforced instead by the observations.spec.ts real-SQLite round trip.
- [Phase 01]: P14-D5: Caido's own --debug logs carry the unredacted request URL and are not committed. Measured per file by the tracer's own secret sweep rather than assumed, and already excluded by .gitignore:35 — not force-added.
- [Phase 01]: A pair whose value half is empty or is entirely `=` padding was never a pair — the whole segment is redacted, on both delimiters through the one shared helper (CR-07)
- [Phase 01]: ACCEPTED COST: `?debug=` loses its NAME as well as its value — the faithful reading of P10-D1, so no new operator checkpoint was opened
- [Phase 01]: Rows already written are LEFT, on decision P8-D1's CLOSURE half alone; the MEASURED half is explicitly not claimed and no new count was performed
- [Phase 01]: The retained NAME half of a genuine pair is kept BY POLICY and is now the second entry in schema.spec.ts's OPEN list rather than closed
- [Phase 01]: The QUERY ENFORCED entry's live-proof sentence is scoped to the grammars tracer-e2e.sh exercises today, with plan 01-17 named by number as the owner of the padded grammar's live proof
- [Phase 01]: WR-19 bound is ASSEMBLED-KEY, set by a real-tree measurement: reporting every non-reducing element-access key fired on compat.ts dotted-path walk and on array indexing, so the CORE-11 walk reports what it can see being HIDDEN and discloses what it merely cannot FOLLOW.
- [Phase 01]: Pattern gate took option (a) — the rule. The one permitted regex literal stays permitted through the SAME count-plus-anchor: rule 4 passes a regex-literal first argument through without a verdict, so the call is covered by its literal being covered. No file-name skip added.
- [Phase 01]: describeError cannot throw (IN-17): both reads wrapped, one shared UNRENDERABLE_ERROR literal with recordError. Six store call sites invoke it unwrapped, so a handled store failure would have become an unhandled rejection out of recordObservation.
- [Phase 01]: P9-D3 RESTATED (plan 01-18, CR-08): a receiver key is resolved through a one-hop assembly in every spelling, a conditional on both branches, and a comma sequence to its rightmost operand; the residual is two hops, a function boundary, and a key the walk never saw bound — The gate's stated reach was wider than its executed reach for the fourth review running, inside the file rewritten for that defect one wave earlier. The bound is now derived FROM the code and written identically into the gate header, REQUIREMENTS.md, STATE.md and WINDOWS.md; the exemption is preserved by re-measurement (23 files, 0 violations), not by argument.
- [Phase 01]: CORE-11 stays unchecked after plan 01-18; plan 01-19 owns the flip — The requirement's own text enumerates 'no dynamic code construction' and WR-23's `const e = eval; e(s)` is still silent, as is IN-20's `const g = globalThis`. CORE-11 was reverted from [x] to [ ] at e7cc4b6 for exactly this reason; re-checking it one blindness early would repeat the act that revert undid.
- [Phase 01]: CORE-11 marked [x] against an eight-row discharge table — every surface its own first sentence enumerates has a fixture that has been observed failing — The box was reverted at e7cc4b6 because the gate could not go red on dynamic code construction, a shape the requirement enumerates. WR-23 closed that in all four alias spellings and IN-20 closed the receiver they sit on, each mutation-proven separately. The table is the evidence and the box is not.
- [Phase 01]: WR-26 resolved by correcting the DOCBLOCK rather than the branch, picked by measurement — The review's own proposed narrowing was applied and run and changed nothing; removing the branch entirely changed exactly two shapes, both ordinary + index compositions of the class that got WR-19 narrowed; and WR-26's motivating shape is silent under every variant because residual (b) silences it, not the numeric exemption. isProvablyNumeric now states that it PROVES for literals and arithmetic and ASSUMES BY NAME, failing OPEN, for a member or method call.
- [Phase 01]: Residual (a) split: receiver KEYS stop at one hop, ALIAS CHAINS resolve to arbitrary depth in document order — Found by measurement while writing what was expected to be a routine two-hop silence fixture, which failed. Every alias set is grown by consulting the live set, so chains resolve to any depth — true of fetchAliases and navigatorAliases since they were written and named by no residual list. The phase's signature defect running in the direction of the gate reaching FURTHER than its disclosure, recorded with the same weight.
- [Phase 01]: P20-D1: normaliseObservedUrl truncates on a query-segment boundary — past URL_MAX it drops back to the last `&`, so the stored value never ends inside a segment or inside a `<redacted>` marker. Measured cost: exactly one trailing segment, never two. — Reproduced independently by sweep (n=4 first differing length, 25 of 40 lengths not fixed points) before any production change; the old byte cut severed a segment, and CR-07 / P10-D1 then redact the remnant whole on a second pass.
- [Phase 01]: P20-D2 (the no-separator branch): with no `?` inside the cut, or a query with no `&` inside it, the URL_MAX byte cut STANDS unchanged — the branch retains exactly what it retained before. — Dropping back to the last `/` or to the `?` would truncate an oversized path back to its authority, discarding ~2 KB a segment-boundary cut would have kept — a materially larger retention decision belonging to the operator. Measured: 0 bytes discarded beyond the byte cut on all four measured inputs, so the plan bound held and no checkpoint was opened.
- [Phase 01]: P20-D3/D4: the redactDelimitedSegment idempotence sentence is SCOPED to the helper (not deleted), and IN-18 is CLOSED by execution with its deferral rationale deleted rather than replaced. — The sentence reasoned correctly about the helper and only its scope was wrong. IN-18 deferred the repair to protect an idempotence invariant the branch it named had already broken at 25 of 40 swept cut points, so the reason could not survive under either outcome; on its own fixture the amended truncation gives len 2039 with a whole trailing segment, so it is closed.
- [Phase 01]: WR-24: derivesFrom descends the OPERATOR class — a conditional's two branches and a `??`/`||`/`&&` binary's two operands — with either-side semantics; the condition of a `? :` is deliberately not descended. — The standard useUnknownInCatchVariables narrowing idiom `e instanceof Error ? e.message : String(e)` reported [] while the bare `e.message` beside it reported. Either-side matches initializerReceiver one package away.
- [Phase 01]: IN-22: pin the two named limits with executed "RESIDUAL, PINNED" cases; deliberately do NOT pin the three open residual CLASSES — both halves recorded in the residual paragraph itself. — A fixture for one shape of an open class would pin an example while reading as though it pinned the class — a narrower guarantee wearing a wider claim, which is this round's subject.

### Known Risks Carried Forward

| Risk | Status |
|---|---|
| ReDoS is unrecoverable — Caido installs no QuickJS interrupt handler, so `lre_check_timeout` is inert | Gated on SPIKE-01 |
| `setTimeout(fn, 0)` may not yield the event loop, invalidating budget-and-background | Gated on SPIKE-02 |
| `caido/caido#2211` — cumulative `sdk.requests.send()` aborts the process | Filed against **0.57.1 — the exact target build**, so SPIKE-04 is a direct reproduction, not an extrapolation. Accepted for the `.map` default |
| Content-hash cache hit rate is the biggest performance lever; 40% instead of 90% means 6× the CPU budget | Gated on SPIKE-10 |
| Asset identity across deploys is unsolved; blocks cross-deploy diffing | SPIKE-13 and DIFF-01 both moved to v2 — the spike served only the deferred feature |
| No memory limit is set — OOM aborts the host rather than throwing | Size ceilings enforced by us, set in Phase 0 |
| Pre-policy `observations.url` rows — written before plan 01-07's write-path redactor — hold verbatim query values in a database Caido never garbage-collects, which survives project deletion and force-reinstall | **CLOSED BY MEASUREMENT, 2026-08-21.** Disposition `leave`, chosen by the operator at plan 01-08's `gate="blocking-human"` checkpoint. **0** affected rows, measured read-only across the **1** DefMiner plugin database that exists on this host (`.planning/phases/01-skeleton-persistence-compatibility/results/observation-url-exposure.json`, commit `640ceb0`). The population is closed **by construction**: a pre-policy row can only be written by a build predating 01-07, DefMiner has never shipped, so only a developer machine could hold one — and every build from 01-07 onward redacts at write, so none can ever be added. STORE-06's 90-day window therefore bounds an EMPTY SET. This is not an accepted exposure; there is no exposure to accept, and no sweep was shipped because the branch is unreachable rather than merely small. T-01-36 resolved; STORE-03 settled |

### Cross-AI Review

Codex (`gpt-5.6-sol`, xhigh) is configured as the default GSD reviewer (`review.default_reviewers`).

- `.planning/research/CODEX-CONTRAST.md` — its independent design research (produced without sight of the other tracks)
- `.planning/research/CODEX-REVIEW-01.md` — its adversarial review of the plan. Found: 2 blockers, 8 high-severity issues, 5 dependency inversions, a 47-requirement undercount, and one thing all five research tracks missed (the backend filesystem is server-side, not the operator's machine)
- `.planning/research/SUMMARY.md` — synthesis, including a corrected treatment of what convergence between two LLMs actually proves

**Corrections it forced:** `ACTIVE-03` claimed `sdk.requests.send()` inherits authentication — the SDK documents routing only. `.map` probing on authenticated apps now requires an explicit credential-propagation contract.

### Phase 0 Planning Notes

The verification loop found 11 real defects across three rounds — **none conceptual**. Requirement coverage, SPIKE ID mapping, wave disjointness, and the no-in-runtime-memory discipline were correct in the first draft. Every failure was the same shape: *the prose stated a rule correctly, and the gate checked less than the prose claimed.*

- Round 1 — three verify gates that lied (one green on failure, one erroring on success, one a jq type error), the fresh-instance policy asserted in prose across four plans but mechanised in only one, a schema two plans consumed and neither could amend, and a definitional contradiction where the only path through the gate was fabricating a number
- Round 2 — the corrected rule was **asymmetric**: it closed the null path and left the fabrication path open, so the one shape named as fabrication was the one shape that passed. Plus a gate that failed against the implementation its own plan mandated
- Round 3 — the biconditional left a third route: zero cross-day denominator with sufficient days, where `0.0` passes as a measurement of something undefined

Lesson for later phases: a plan that states a policy in four places and asserts it in one passes any review done by reading. Only executing the gates catches it.

### Pending Todos

None.

---
*Last updated: 2026-08-20 after initialization*

## Session

**Last session:** 2026-08-24T09:33:15.213Z
**Stopped at:** Completed 01-21-PLAN.md
**Resume file:** None

### Blockers

- SPIKE-10 cross-day cache hit rate is UNDEFINED (1 day sampled, denominator 0) and collection has STOPPED — the recorder LaunchAgent was uninstalled. **CORRECTION (2026-08-21, plan 01-08): the 8998 INSTANCE WAS NOT KILLED.** This line previously claimed it was, per plan 00-04's teardown responsibility; that claim is false. `caido-cli --data-path .spike/recorder-data --listen 127.0.0.1:8998 --no-open --debug` is pid 79273 and has been up since 2026-08-20 (16h44m elapsed when observed). It is deliberately LEFT RUNNING — 01-08 found it while enumerating plugin databases and has no mandate to kill an operator process. Its plugin database holds `cache_log`, not DefMiner's tables, so it affects no count in 01-08. **Worth an operator decision, not taken here and NOT assumed either way:** the uninstalled LaunchAgent is what drove collection, so a bare instance being up does not by itself mean sampling resumed — but this line's opening premise (collection stopped, cross-day denominator 0) now rests on a teardown that provably only half happened, so it should be checked rather than inherited. 01-08 did not check it: the SPIKE-10 question is outside this plan's scope and re-opening it is the operator's call. Phase 1 budgets against CACHE_HIT_RATE_ASSUMED=0.40. To re-measure: bash scripts/spike/recorder-agent.sh install, let it span 2+ calendar days, then re-run analyse-spike-10.py + aggregate.py + render-go-no-go.py. Revisit after 2026-09-03.
- DISCLOSED OPEN (plan 01-20, WR-22): normaliseObservedUrl is a fixed point across the swept range (parameter-name lengths 1..64 at 300/900 params, 128 cuts) but NOT for every input. Two no-separator classes remain — a head-side cut can sever a `;` parameter marker (severed but stable), and a single-segment query cut inside its NAME is not a fixed point at all. Neither discloses anything new (recordObservation applies the function once per row). Both pinned in observations.spec.ts and disclosed in schema.spec.ts.
