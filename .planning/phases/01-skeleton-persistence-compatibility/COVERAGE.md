# Phase 1 — Caido Backend SDK Coverage Matrix

**Produced:** 2026-08-20 (planning time, `/gsd-plan-phase 1`)
**Trigger:** the deterministic api-coverage detector reported `detected: true` over this phase's PLAN bodies.
**Policy:** `INTEGRATE` is the default. Every `OPT-OUT` carries a one-line reason. Nothing is omitted silently.

**Surface source:** enumerated from the pinned type packages this session, not recalled —
`@caido/sdk-backend@0.57.1/src/typing.d.ts` (the root `SDK` members, `APISDK`, `EventsSDK`, `MetaSDK`) and
`@caido/quickjs-types@0.26.0/src/caido/*.d.ts` (each sub-SDK's method list). The root SDK has exactly fourteen
members: `console`, `findings`, `requests`, `replay`, `projects`, `scope`, `env`, `api`, `events`, `meta`,
`runtime`, `graphql`, `hostedFile`, `net`.

**How to read `Exercised by`:** the plan and task that both USES the surface in production code and PROVES it,
plus the leg of `scripts/phase1/compat-smoke.sh` that re-exercises it against both Caido 0.57.1 and 0.58.0
(COMPAT-02). A surface marked `INTEGRATE` must appear in `REQUIRED_SURFACES` in `packages/backend/src/compat.ts`,
and plan 01-06's gate asserts the smoke-test surface set equals that list — so a surface cannot be integrated
here and quietly dropped from the compatibility test.

---

## Root SDK members

| # | Surface | Disposition | Exercised by | Reason (opt-outs only) |
|---|---------|-------------|--------------|------------------------|
| 1 | `sdk.events.onInterceptResponse` | **INTEGRATE** | 01-01 tracer; 01-03 task 1; smoke legs A+B | — |
| 2 | `sdk.events.onProjectChange` | **INTEGRATE** | 01-05 task 1; smoke legs A+B | — |
| 3 | `sdk.events.onInterceptRequest` | OPT-OUT | — | Phase 1 observes responses only; a request hook would fire on traffic that has no body to hash and would add a second admission surface with no Phase 1 consumer. |
| 4 | `sdk.events.onUpstream` | OPT-OUT | — | Synchronous, called before the request leaves, and only fires when the operator enables Upstream Plugins for a domain. It exists to *modify* routing — DefMiner modifies nothing. |
| 5 | `sdk.requests.get` | **INTEGRATE** | 01-01 tracer + task 2 (delay ladder); 01-03 task 3; smoke legs A+B | — |
| 6 | `sdk.requests.inScope` | **INTEGRATE** | 01-03 task 1 (`admit.ts` scope axis); smoke legs A+B | — |
| 7 | `sdk.requests.query` | OPT-OUT | — | HTTPQL push-down over existing traffic is FIND-03, the retroactive scan, in Phase 6. Phase 1 observes live proxied traffic only. |
| 8 | `sdk.requests.matches` | OPT-OUT | — | Consumer is the Phase 6 retroactive filter and the Phase 5 suppression rules; no Phase 1 caller exists. |
| 9 | `sdk.requests.send` | OPT-OUT | — | **Prohibited in this phase**, not merely unused: plan 01-01 authors a `must_haves.prohibitions` entry forbidding any outbound request. Active retrieval is Phase 8 (ACTIVE-*). |
| 10 | `sdk.projects.getCurrent` | **INTEGRATE** | 01-01 tracer (`project_id` resolution); 01-05 task 1; smoke legs A+B | — |
| 11 | `sdk.meta.db` | **INTEGRATE** | 01-01 tracer; 01-04 all tasks; smoke legs A+B (incl. `sqlite_version()` re-read on B) | — |
| 12 | `sdk.meta.path` | OPT-OUT | — | Decision P1-D3: Phase 1 stores no response bytes on disk. Writing under this path pulls the Phase 6 quota, orphan-cleanup and server-side-delivery problem (DEPLOY-*) forward for no Phase 1 benefit. |
| 13 | `sdk.meta.assetsPath` | OPT-OUT | — | Reads static plugin assets. The detector rule corpus that will live there does not exist until Phase 3. |
| 14 | `sdk.meta.id` | OPT-OUT | — | The plugin id is a build-time constant in `packages/backend/caido.config.ts`; reading it back adds a runtime call with no consumer until the Phase 2 diagnostics export. |
| 15 | `sdk.meta.version` | OPT-OUT | — | Consumer is UPGRADE-01's populated-database upgrade matrix (Phase 11) and the Phase 2 diagnostics export. Phase 1 has no migration keyed on plugin version — the schema ladder uses `PRAGMA user_version`. |
| 16 | `sdk.meta.updateAvailable` | OPT-OUT | — | Documented to throw when Caido Cloud is offline, and the Caido Developer Policy forbids any plugin self-update mechanism (DIST-03). Never integrated, in any phase. |
| 17 | `sdk.runtime.version` | **INTEGRATE** | 01-06 task 2 (`compat.ts`); smoke legs A+B+C | — |
| 18 | `sdk.console.log` | **INTEGRATE** | 01-01 tracer (error containment); 01-06 (the COMPAT-01 message); smoke legs A+B | — |
| 19 | `sdk.api.register` | **INTEGRATE** | 01-01 tracer (`getStatus`, `getArtifacts`); smoke legs A+B | — |
| 20 | `sdk.api.send` | OPT-OUT | — | Pushes events to a frontend. Decision P1-D5/P6-D2: Phase 1 ships no frontend, so there is no subscriber. Phase 5 (UI-*) integrates it, with UI-02's event coalescing as the reason it needs designing rather than just calling. |
| 21 | `sdk.scope.getAll` | OPT-OUT | — | `sdk.requests.inScope(request)` already evaluates the default scope, which is the whole Phase 1 requirement (CORE-02). Enumerating scopes is only needed to check against a *specific* scope, which no Phase 1 caller does. |
| 22 | `sdk.findings.create` / `.exists` / `.get` | OPT-OUT | — | Native Findings projection is FIND-01/FIND-02 in Phase 5, and gated on high-signal results with stable dedupe keys. Phase 1 produces no findings at all — no detector exists until Phase 3. |
| 23 | `sdk.replay.createSession` / `.getCollections` | OPT-OUT | — | One-click Replay handoff is ENDP-04 in Phase 9, and it needs the AST substrate to synthesise a request worth replaying. |
| 24 | `sdk.env.*` (8 methods) | OPT-OUT | — | Environment variables are operator-managed request substitution. DefMiner reads no secrets from the environment; the SEC-04 HMAC key lifecycle is Phase 4 and deliberately does not create a key or key file Phase 1 would then have to migrate. |
| 25 | `sdk.graphql` | OPT-OUT | — | GraphQL *operation extraction* from bundles is ENDP-06/Phase 9 and is a parsing problem, not an SDK one. This surface issues GraphQL against Caido itself, which nothing in v1 needs. |
| 26 | `sdk.hostedFile.create` / `.getAll` | OPT-OUT | — | The operator-facing delivery path is DEPLOY-04 in Phase 6, and Phase 7's reconstructed sources are the first artifact worth delivering. Phase 1 produces no file to deliver (P1-D3). |
| 27 | `sdk.net.connect` | OPT-OUT | — | Raw outbound connection. Same prohibition as `sdk.requests.send`: no outbound traffic in this phase, by an authored `must_haves.prohibitions` entry. |

## `sdk.meta.db()` — `Database` and `Statement` (`@caido/quickjs-types/src/extra/sqlite.d.ts`)

| # | Surface | Disposition | Exercised by | Reason (opt-outs only) |
|---|---------|-------------|--------------|------------------------|
| 28 | `Database.exec(sql)` | **INTEGRATE** | 01-01 tracer; 01-04 task 1 (DDL only, `IF NOT EXISTS`, plus the `PRAGMA user_version` write) | — |
| 29 | `Database.prepare(sql)` | **INTEGRATE** | 01-01 tracer; 01-04 tasks 2 and 3 (prepare-per-write) | — |
| 30 | `Statement.run(...params)` | **INTEGRATE** | 01-01 tracer; 01-04 task 2; gated by `sql-discipline.spec.ts` | — |
| 31 | `Statement.get(...params)` | **INTEGRATE** | 01-01 tracer (`PRAGMA user_version`, `sqlite_version()`); 01-04 tasks 1-3 | — |
| 32 | `Statement.all(...params)` | **INTEGRATE** | 01-04 task 2 (`listArtifacts`); 01-01 `getArtifacts` RPC | — |
| 33 | `open(options)` / `OpenOptions` | OPT-OUT | — | `sdk.meta.db()` returns an already-opened pooled handle; the plugin never opens its own database and therefore cannot set `maxConnections`, `busyTimeout` or `foreignKeys`. Recorded because decision P4-D3 depends on it: `foreign_keys` is per-connection and the pool holds up to five, so integrity is enforced at the application level instead. |

## Runtime modules reachable from the backend (not SDK, but part of the integration surface)

Included because the DIST-05 allowlist gate (plan 01-02) governs exactly this set, and because two of them are
where the SDK's absence forces a choice.

| # | Surface | Disposition | Exercised by | Reason (opt-outs only) |
|---|---------|-------------|--------------|------------------------|
| 34 | `crypto` (bare) — `createHash` | **INTEGRATE** | 01-01 `digest.ts`; DIST-05 allowlist | — |
| 35 | `string_decoder` — `StringDecoder` | **INTEGRATE (source-only)** | 01-03 task 3 (`decode.ts`) — ENC-02 binds here specifically; NOT in the shipped bundle, NOT in `REQUIRED_SURFACES` | Reconciled during 01-06 against the built artifact: `decode.ts` has no consumer in the shipped path (Broken Windows entry 8), so it is tree-shaken out and `grep -c StringDecoder packages/backend/dist/index.js` is **0**. Requiring it at runtime would mean statically importing a module the plugin does not use, so a module-load failure on a future Caido would take the whole plugin down to satisfy a probe. Promote to `INTEGRATE` in the wave that gives `decode.ts` a shipped consumer (Phase 3/5). |
| 36 | `buffer` — `Buffer` | **INTEGRATE (source-only)** | 01-03 task 3 (`decode.ts`, the cross-checked second path); NOT in the shipped bundle, NOT in `REQUIRED_SURFACES` | Same reconciliation as row 35, same measurement, same promotion condition. |
| 37 | `caido:crypto` | OPT-OUT | — | Measured to FAIL to load inside Caido 0.57.1 (`could not load module`). Bare `crypto` is the working path. Explicitly listed in the DIST-05 gate's failing set so a `caido:` prefix match cannot blanket-allow it. |
| 38 | `caido:http` — `fetch` | OPT-OUT | — | Loads successfully, and is deliberately not used: same outbound-traffic prohibition as `sdk.requests.send`. Phase 0 also measured that it delivers nothing back to `onInterceptResponse`. |
| 39 | `fs`, `os`, `path`, `url`, `events`, `sqlite` | OPT-OUT (allowlisted, unused) | — | All load inside Caido and are on the DIST-05 allowlist, but Phase 1 has no caller: no bodies are written to disk (P1-D3) and `sqlite` is reached only through `sdk.meta.db()`. Allowlisted-but-unused is recorded here so a future import is a deliberate change rather than a surprise. |
| 40 | `TextDecoder` / `TextEncoder` | OPT-OUT (unavailable) | — | Not globals and exported by no module Phase 0 probed. This is *why* items 35 and 36 exist; recorded so nobody re-derives the finding. |

---

## Coverage summary

| Disposition | Count |
|---|---|
| INTEGRATE (in `REQUIRED_SURFACES`, gated at runtime) | 15 |
| INTEGRATE (source-only — shipped source, tree-shaken out of the bundle) | 2 |
| OPT-OUT (deferred to a named later phase) | 12 |
| OPT-OUT (prohibited in this phase) | 4 |
| OPT-OUT (structurally unavailable or unreachable) | 3 |
| OPT-OUT (available or reachable, no Phase 1 caller) | 4 |
| **Total surfaces enumerated** | **40** |

**Counts corrected during 01-06 execution, and how.** This table previously read
`INTEGRATE 16` while SEVENTEEN rows carried the `INTEGRATE` mark, and its opt-out buckets summed to 24 against
23 opt-out rows — so it added to 40 only by two errors cancelling. Re-derived row by row against the tables
above: rows 3, 4 and 21 are available-with-no-Phase-1-caller rather than deferred-to-a-named-phase (none names a
later phase), row 38 (`caido:http` fetch) is prohibited rather than deferred (it is the same
outbound-traffic prohibition as rows 9 and 27), and rows 35 and 36 are the source-only pair reconciled above.
The gate in `tests/phase1-compat.spec.ts` now parses THIS FILE and asserts these counts against the parsed
rows, so the summary can no longer drift from the table it summarises.

Every OPT-OUT names either the phase that owns it, the requirement that forbids it, or the measurement that
makes it unavailable. None is "not needed" without a reason.

## Enforcement

The sixteen `INTEGRATE` surfaces are not covered by prose. Plan 01-06 exports them as `REQUIRED_SURFACES` in
`packages/backend/src/compat.ts`, `checkCompat()` refuses to register any hook when one is missing, and
`tests/phase1-compat.spec.ts` asserts that the surface-name set recorded by BOTH smoke-test legs equals that
exported list — so a surface integrated here and later dropped from the compatibility test fails the build
rather than drifting.
