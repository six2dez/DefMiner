---
phase: 01-skeleton-persistence-compatibility
plan: 12
subsystem: testing
tags: [typescript-ast, static-analysis, gate, outbound-prohibition, caido-sdk, coverage-matrix]

requires:
  - phase: 01-09
    provides: "The round-1 outbound gate — auditSource, FORBIDDEN_OUTBOUND, the recursive backend walk and the by-name non-vacuity assertion this plan widened rather than replaced"
  - phase: 01-10
    provides: "CORE-11 opened in REQUIREMENTS.md, ROADMAP and STATE.md — the ledger half of the CORE-01 split, two waves before this plan declared the id"
  - phase: 01-11
    provides: "Sequencing only: 01-11's mutation window had to close before this plan opened three of its own against the same tree"
provides:
  - "CORE-11's gate at the reach its own header claims: six rules over BOTH shipped source roots, packages/backend/src and packages/engine/src"
  - "All 14 shapes the verifier's 22-shape probe found MISSED now report; all 8 it found CAUGHT still do — executed as suite cases, not as a document"
  - "outbound-unanalysable: a computed key on an identified receiver, and a specifier that will not reduce to a literal, are REPORTED rather than silently dropped"
  - "packages/engine/src walked for outbound surfaces for the first time — 9 modules including pipeline.ts, the 'no speculative retrieval' module"
  - "Three mutations run against real shipped modules, each failing with file + rule + reason, each reverted and cross-checked by a bundle rebuild"
  - "The gate names CORE-11 in its header, its rule table and its add() failure text, with the move dated and reasoned"
affects: [phase-8-active-retrieval, phase-3-detectors, any-plan-touching-packages-engine]

actuals:
  tokens: 19147
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Member-REFERENCE rules over call-shape rules: once a receiver is positively identified, any member outside a read-only allowlist fails wherever it is mentioned"
    - "Unanalysable-as-a-violation: an AST gate that cannot read a construct reports it rather than passing it"
    - "Evasions enumerated and confirmed RED before the rule that catches them"
    - "One path convention (POSIX) end to end in a file-walking gate"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/phases/01-skeleton-persistence-compatibility/COVERAGE.md

key-decisions:
  - "The read-only allowlist for a `requests` receiver is get/query/inScope/matches, derived from what the backend actually calls (consumer.ts:344, admit.ts:197) plus COVERAGE.md's OPT-OUT-but-read-only rows — so a future sendRaw fails without a gate change"
  - "The global-fetch member rule is restricted to globalThis/self/global/window rather than any receiver, because cache.fetch(url) and client.fetch(u) must stay legal"
  - "Per-root descent is asserted CONDITIONALLY on the root having a subdirectory: packages/engine/src is flat today, and a test that fails because a directory is flat teaches nothing"
  - "scripts/ci/check-bundle-imports.mjs left untouched (P9-D2): its allowlist answers 'measured loadable', not 'permitted'"
  - "The CORE-01 -> CORE-11 source retag rode inside the same rewrite that touched those strings, rather than being deferred to a later plan that would have had to re-edit a paragraph this one just wrote"

patterns-established:
  - "Verifier probes re-run as suite cases: the 22-shape probe now lives in the gate, where a regression is a red test rather than a paragraph nobody re-reads"
  - "Mutation-proof against REAL shipped modules, not fixtures, with the failure block captured verbatim and the revert cross-checked by a bundle rebuild"

requirements-completed: [CORE-11]

coverage:
  - id: D1
    description: "Every one of the 14 shapes the verifier's probe found MISSED now produces a violation, and every one of the 8 it found CAUGHT still does"
    requirement: CORE-11
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the 22-shape gate-reach probe from 01-VERIFICATION.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "The load-bearing false positives stay quiet: sdk.requests.get (the CORE-05 reload) directly and through an alias, and the real telemetry.ts globalThis idiom"
    requirement: CORE-11
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the shapes that MUST stay quiet — each one real in or adjacent to this codebase"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#telemetry.ts reaches globalThis the way this codebase reaches globals, and still reports clean"
        status: pass
    human_judgment: false
  - id: D3
    description: "A construct the walk cannot read is REPORTED as outbound-unanalysable, never treated as clean"
    requirement: CORE-11
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#a module specifier the walk can resolve, and one it cannot"
        status: pass
    human_judgment: false
  - id: D4
    description: "packages/engine/src is walked by the gate — 9 modules including pipeline.ts, decode.ts and queue.ts — with a per-root non-vacuity assertion"
    requirement: CORE-11
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#every root contributes at least one file to the scan"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#enumerates a NON-EMPTY set of shipped modules, BY NAME, ACROSS BOTH ROOTS"
        status: pass
    human_judgment: false
  - id: D5
    description: "The widened gate fails against real shipped source: three mutations planted in hooks/passive.ts, packages/engine/src/pipeline.ts and ingest/consumer.ts, each naming file, rule and reason, each reverted"
    requirement: CORE-11
    verification:
      - kind: integration
        ref: "pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts (three planted mutations, output pasted verbatim in this SUMMARY)"
        status: pass
      - kind: integration
        ref: "git diff --exit-code packages/backend/src/hooks/passive.ts packages/engine/src/pipeline.ts packages/backend/src/ingest/consumer.ts"
        status: pass
      - kind: integration
        ref: "pnpm build:backend && pnpm check:bundle"
        status: pass
    human_judgment: false
  - id: D6
    description: "The gate's header discloses the boundary the walk actually has, and COVERAGE.md rows 9, 27 and 38 describe the enforcement that exists — in both tables, with no disposition, row or count changed"
    requirement: CORE-11
    verification:
      - kind: integration
        ref: "gsd-tools check api-coverage.verify-pre .planning/phases/01-skeleton-persistence-compatibility (40 / 17 / 23, passed: true)"
        status: pass
      - kind: unit
        ref: "tests/phase1-compat.spec.ts (REQUIRED_SURFACES reconciles with COVERAGE.md)"
        status: pass
    human_judgment: true
    rationale: "A header and three justification cells are prose about a gate's reach. The gate's reach is machine-checked above; whether the PROSE describes it accurately is exactly the judgment the round-1 header failed, and no test can make that call."

duration: 22 min
completed: 2026-08-21
status: complete
---

# Phase 01 Plan 12: Widen the CORE-11 Outbound Gate Summary

**The outbound gate now catches all 22 probed shapes instead of 8, walks `packages/engine/src` as well as the backend, reports what it cannot read instead of passing it, and carries the requirement id whose text actually states the prohibition.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-21T13:58Z
- **Completed:** 2026-08-21T14:20Z
- **Tasks:** 2 of 2
- **Files modified:** 2 durable (+3 mutated transiently and restored)

## Accomplishments

- **All 14 previously-missed shapes now report, all 8 controls still do.** The verifier's 22-shape probe stopped being a table in a document and became executed suite cases, so a regression that reopens any of them is a red test.
- **`packages/engine/src` is walked for the first time.** 9 engine modules joined the 14 backend ones under one rule set — including `pipeline.ts`, whose job is "no speculative retrieval of any kind", CORE-11's literal wording, and which no gate in the repository had ever opened for outbound surfaces.
- **"Could not read" no longer means "clean".** `outbound-unanalysable` fires on a computed key on a positively identified receiver and on a module specifier that will not reduce to a literal — the one shape that defeats an AST gate silently.
- **Three mutations planted in real shipped modules, all three red with usable messages, all three restored** and cross-checked by a bundle rebuild reporting one specifier.
- **The header now discloses the boundary the walk actually has.** The old boundary 2 named "an alias rebound in an inner scope"; not one of the fourteen missed shapes was an inner-scope rebind.

## Task Commits

1. **Task 1 (RED): the 22-shape probe and every evasion, as executed fixtures** — `2cc3aaa` (test)
2. **Task 1 (GREEN): widen the gate to the shapes it missed, and report what it cannot read** — `a3a2cc9` (feat)
3. **Task 2: walk `packages/engine/src` under the same rule set, and say so in COVERAGE** — `51545c0` (feat)

No REFACTOR commit: the GREEN implementation is the shape the rules were designed in, and a cleanup pass would have moved code without changing behaviour.

## Evidence

### 1. The verifier's 22-shape probe, RE-RUN — before 8/22, after 22/22

Before (`01-VERIFICATION.md:150-171`, the verifier's own executed probe): **8 caught, 14 missed.**
After, executed inside the suite (`pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts --reporter=verbose`):

```
 ✓ … > control — sdk.requests.send(q) is still caught 0ms
 ✓ … > control — const r = sdk.requests; r.send(q) is still caught 0ms
 ✓ … > control — const { send } = sdk.requests; send(q) is still caught 0ms
 ✓ … > control — fetch(u) bare is still caught 0ms
 ✓ … > control — import ... from "caido:http" is still caught 0ms
 ✓ … > control — sdk.net.connect(h,p) is still caught 0ms
 ✓ … > control — this.sdk.requests.send(q) is still caught 0ms
 ✓ … > control — sdk.requests.send?.(q) is still caught 0ms
 ✓ … > previously MISSED — globalThis.fetch(u) now reports 0ms
 ✓ … > previously MISSED — (globalThis as any).fetch(u) now reports 0ms
 ✓ … > previously MISSED — window.fetch(u) now reports 0ms
 ✓ … > previously MISSED — const { requests } = sdk; requests.send(q) now reports 0ms
 ✓ … > previously MISSED — let r; r = sdk.requests; r.send(q) now reports 0ms
 ✓ … > previously MISSED — sdk.requests.send.call(...) now reports 0ms
 ✓ … > previously MISSED — sdk.requests.send.apply(...) now reports 0ms
 ✓ … > previously MISSED — Reflect.apply(sdk.requests.send, ...) now reports 0ms
 ✓ … > previously MISSED — const s = sdk.requests.send; s(q) now reports 0ms
 ✓ … > previously MISSED — const m = "send"; sdk.requests[m](q) now reports 0ms
 ✓ … > previously MISSED — const r = "requests"; sdk[r].send(q) now reports 0ms
 ✓ … > previously MISSED — sdk.requests.sendRaw(q) now reports 0ms
 ✓ … > previously MISSED — await import("caido:" + "http") now reports 0ms
 ✓ … > previously MISSED — new XMLHttpRequest() ... .send() now reports 0ms
 ✓ … > previously MISSED — new WebSocket("wss://...") now reports 0ms
```

| # | Shape | Before | After |
|---|---|---|---|
| 1 | `sdk.requests.send(q)` | ✓ CAUGHT | ✓ CAUGHT |
| 2 | `const r = sdk.requests; r.send(q)` | ✓ CAUGHT | ✓ CAUGHT |
| 3 | `const { send } = sdk.requests; send(q)` | ✓ CAUGHT | ✓ CAUGHT |
| 4 | `fetch(u)` bare | ✓ CAUGHT | ✓ CAUGHT |
| 5 | `import ... from "caido:http"` | ✓ CAUGHT | ✓ CAUGHT |
| 6 | `sdk.net.connect(h,p)` | ✓ CAUGHT | ✓ CAUGHT |
| 7 | `this.sdk.requests.send(q)` | ✓ CAUGHT | ✓ CAUGHT |
| 8 | `sdk.requests.send?.(q)` | ✓ CAUGHT | ✓ CAUGHT |
| 9 | `globalThis.fetch(u)` | ✗ MISSED | ✓ `outbound-fetch` |
| 10 | `(globalThis as any).fetch(u)` | ✗ MISSED | ✓ `outbound-fetch` |
| 11 | `window.fetch(u)` | ✗ MISSED | ✓ `outbound-fetch` |
| 12 | `const { requests } = sdk; requests.send(q)` | ✗ MISSED | ✓ `outbound-send` |
| 13 | `let r; r = sdk.requests; r.send(q)` | ✗ MISSED | ✓ `outbound-send` |
| 14 | `sdk.requests.send.call(...)` | ✗ MISSED | ✓ `outbound-send` |
| 15 | `sdk.requests.send.apply(...)` | ✗ MISSED | ✓ `outbound-send` |
| 16 | `Reflect.apply(sdk.requests.send, ...)` | ✗ MISSED | ✓ `outbound-send` |
| 17 | `const s = sdk.requests.send; s(q)` | ✗ MISSED | ✓ `outbound-send` |
| 18 | `const m = "send"; sdk.requests[m](q)` | ✗ MISSED | ✓ `outbound-send` |
| 19 | `const r = "requests"; sdk[r].send(q)` | ✗ MISSED | ✓ `outbound-send` |
| 20 | `sdk.requests.sendRaw(q)` | ✗ MISSED | ✓ `outbound-send` |
| 21 | `await import("caido:" + "http")` | ✗ MISSED | ✓ `outbound-unanalysable` |
| 22 | `new XMLHttpRequest()` … `.send()` | ✗ MISSED | ✓ `outbound-global-ctor` |
| 23 | `new WebSocket("wss://…")` | ✗ MISSED | ✓ `outbound-global-ctor` |

**23 rows, not 22, and the difference is disclosed rather than rounded away:** the verifier's table listed `.call` / `.apply` as one row; here they are two executed cases (14 and 15). The probe's 22 shapes are all present; the count differs because one row became two.

**One fixture-level correction, recorded because it is a real parser fact and not a gate limitation.** `await (globalThis as any).fetch(url);` written as a bare top-level statement in a file with NO import and NO export is parsed by TypeScript in SCRIPT context, where `await` is an ordinary identifier — so `await (globalThis as any)` becomes a CALL to a function named `await` and the cast stops being the callee's receiver. Verified by dumping the AST of all four spellings. Every module this gate walks has an import or an export, so the fixture carries `export {};` and the comment beside it says why. Without that the fixture would have been testing the parser, not the gate.

### 2. RED before GREEN — the evasions were confirmed missed before the rule was touched

The fixture commit `2cc3aaa` ran against the round-1 walk:

```
 Test Files  1 failed (1)
      Tests  44 failed | 54 passed (98)
```

Every MUST-FLAG shape failed (reported clean against the old walk); every MUST-STAY-QUIET shape passed already. That ordering is the whole point of the task — round 1's gate passed every fixture it had and still missed 14 of 22, because the fixtures were written by the same reasoning that wrote the rule.

### 3. THREE MUTATIONS AGAINST REAL SHIPPED MODULES

`git status --porcelain packages/` was empty before each plant, per the plan's own precondition.

**Mutation 1 — the DESTRUCTURED form, into the real `packages/backend/src/hooks/passive.ts`:**

```ts
    const { requests } = sdk as unknown as { requests: { send: (r: unknown) => void } };
    requests.send(request);
```

```
 FAIL  packages/backend/src/outbound-prohibition.spec.ts > CORE-11 — no outbound surface is reachable from packages/backend/src or packages/engine/src > packages/backend/src/hooks/passive.ts reaches no outbound surface
AssertionError: packages/backend/src/hooks/passive.ts reaches an outbound network surface, which CORE-11 forbids in every module the plugin ships — packages/backend/src and packages/engine/src: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "outbound-send: packages/backend/src/hooks/passive.ts: a reference to `send` on a `requests` receiver reaches sdk.requests.send, or any other non-read-only member of a requests receiver, which CORE-11 forbids in this phase — plugin-originated traffic does not come back through onInterceptResponse (SURFACES_FIRING_INTERCEPT = \"proxy\"), so a leak would move no counter in this plugin and leave no trace in its own telemetry; and caido/caido#2211, filed against 0.57.1, means cumulative sends can abort caido-cli with the operator's project data. Active retrieval is Phase 8 (ACTIVE-*) and it arrives with the send counter and the write-ahead journal Phase 0 built for it — not by someone adding a call. CORE-11 is the requirement whose text states this prohibition.",
+ ]

 Test Files  1 failed (1)
      Tests  1 failed | 109 passed (110)
```

This is the shape CR-03 called the one that matters most, and the shape the round-1 gate reported clean.

**Mutation 2 — `globalThis.fetch(url)` into the real `packages/engine/src/pipeline.ts`:**

```ts
  const sourcemap = await globalThis.fetch(String(ctx.windowSize));
```

```
 FAIL  packages/backend/src/outbound-prohibition.spec.ts > CORE-11 — no outbound surface is reachable from packages/backend/src or packages/engine/src > packages/engine/src/pipeline.ts reaches no outbound surface
AssertionError: packages/engine/src/pipeline.ts reaches an outbound network surface, which CORE-11 forbids in every module the plugin ships — packages/backend/src and packages/engine/src: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "outbound-fetch: packages/engine/src/pipeline.ts: a `fetch` member of `globalThis` reaches the global fetch(), by any receiver or alias, which CORE-11 forbids in this phase — the global fetch reaches any host, including one that is not the target at all. The operator authorised a PASSIVE observer; this is a boundary they were told does not exist. COVERAGE.md row 38 places it under the same CORE-11 prohibition. telemetry.ts already reaches globalThis for `performance`, so the codebase's own idiom for reaching a global is the spelling this rule exists to see.",
+ ]

 Test Files  1 failed (1)
      Tests  1 failed | 109 passed (110)
```

One mutation, two holes: the missed spelling AND the unwalked root. Before this plan the gate reported clean twice over, and so would `check:bundle`, since a global needs no import.

**Mutation 3 — `sdk.requests.sendRaw(req)` into the real `packages/backend/src/ingest/consumer.ts`:**

```ts
    await sdk.requests.sendRaw(entry.id);
```

```
 FAIL  packages/backend/src/outbound-prohibition.spec.ts > CORE-11 — no outbound surface is reachable from packages/backend/src or packages/engine/src > packages/backend/src/ingest/consumer.ts reaches no outbound surface
AssertionError: packages/backend/src/ingest/consumer.ts reaches an outbound network surface, which CORE-11 forbids in every module the plugin ships — packages/backend/src and packages/engine/src: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "outbound-send: packages/backend/src/ingest/consumer.ts: a reference to `sendRaw` on a `requests` receiver reaches sdk.requests.send, or any other non-read-only member of a requests receiver, which CORE-11 forbids in this phase — plugin-originated traffic does not come back through onInterceptResponse (SURFACES_FIRING_INTERCEPT = \"proxy\"), so a leak would move no counter in this plugin and leave no trace in its own telemetry; and caido/caido#2211, filed against 0.57.1, means cumulative sends can abort caido-cli with the operator's project data. Active retrieval is Phase 8 (ACTIVE-*) and it arrives with the send counter and the write-ahead journal Phase 0 built for it — not by someone adding a call. CORE-11 is the requirement whose text states this prohibition.",
+ ]

 Test Files  1 failed (1)
      Tests  1 failed | 109 passed (110)
```

`sendRaw` is a method nobody enumerated. It fails because the receiver was positively identified and the member is not on the read-only allowlist — which is the rule that stops the next outbound method needing a gate change. Note the file it landed in already calls `sdk.requests.get(entry.id)` two lines below, and that call stayed quiet.

**All three reverted:**

```
ALL THREE MUTATIONS RESTORED — git diff --exit-code clean
porcelain packages/: []
```

### 4. The green baseline, restored

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  885 passed (885)
```

```
$ pnpm build:backend && pnpm check:bundle
[*] Plugin package built successfully
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

```
$ pnpm typecheck && pnpm lint && pnpm knip
typecheck/lint/knip exit 0

$ pnpm vitest run packages/engine/src/boundary.spec.ts
 Test Files  1 passed (1)
      Tests  15 passed (15)          # DET-03's SDK-free boundary intact

$ gsd-tools check api-coverage.verify-pre .planning/phases/01-skeleton-persistence-compatibility
{ "block": false, "passed": true, "counts": { "surface": 40, "integrate": 17, "optout": 23 } }
```

Suite went 807 → 885 (+78: 32 → 110 in this gate, of which +9 are the newly walked engine modules).

### 5. The CORE-11 retag changed no behaviour — measured, not asserted

The retag rode inside the same rewrite, so it has no isolated commit to diff. Measured directly instead, by replacing every `CORE-11` in the file with `CORE-01` and running the gate:

```
$ python3 …  # un-retagged 17 CORE-11 occurrences -> CORE-01 (measurement only)
--- gate with EVERY CORE-11 reverted to CORE-01 ---
 Test Files  1 passed (1)
      Tests  110 passed (110)
--- gate as committed (CORE-11) ---
 Test Files  1 passed (1)
      Tests  110 passed (110)
```

Identical, as a naming edit must be. `grep -c 'CORE-11'` returns **16**. Every remaining `CORE-01` in the file was read individually and refers either to the retag note itself (lines 11, 14 and the rule-table comment) or to the non-async-handler requirement that keeps the id (line 17) — confirmed by reading each hit, not by a count. `.planning/REQUIREMENTS.md:46` already contained CORE-11 before this plan started (opened by plan 01-10, wave 10), so the precondition to STOP-and-report did not fire.

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — the gate. Header boundary 2 rewritten; `SOURCE_ROOTS` exported; `backendFiles()` → `shippedFiles()` over both roots on one POSIX path convention; `FORBIDDEN_OUTBOUND` derived from a KEYED rule record (IN-12); `unwrap` helper; `receiverAliases` from declarations, destructures, assignments and conditionals; single-hop `const` string map; member-reference rule with a read-only allowlist; `outbound-global-ctor`; `outbound-unanalysable`; 78 new executed cases.
- `.planning/phases/01-skeleton-persistence-compatibility/COVERAGE.md` — rows 9, 27 and 38 in the main table and their three duplicates in the machine-readable table, describing the reach that now exists. Six cells, `6 insertions(+), 6 deletions(-)`. No disposition, no row, no count, no INTEGRATE/OPT-OUT split changed; machine-readable cells measured at 167 / 174 / 176 chars against the gate's 200-char limit.

**Transiently mutated and restored, durably unmodified** (disclosed beside `files_modified` in the plan): `packages/backend/src/hooks/passive.ts`, `packages/engine/src/pipeline.ts`, `packages/backend/src/ingest/consumer.ts`.

## Decisions Made

- **The read-only allowlist is `get` / `query` / `inScope` / `matches`, derived not guessed.** `get` is the CORE-05 reload at `consumer.ts:344`; `inScope` is at `admit.ts:197`; `query` and `matches` are COVERAGE.md rows 7 and 8, OPT-OUT-but-read-only and deferred to Phase 6. Every one reads existing traffic and generates none — that is the whole membership test, which is why the rule can be "any member NOT on this list".
- **The fetch member rule is restricted to four global receivers.** Matching any receiver would break `cache.fetch(url)` and `client.fetch(u)`; both are must-stay-quiet fixtures, and the restriction is stated where it is written.
- **Per-root descent is asserted conditionally.** `packages/engine/src` is flat today, so an unconditional per-root descent assertion would fail for a fact about the engine's layout rather than a defect in the walk. The condition is read from disk, so the day the engine grows a subdirectory the assertion starts holding it to the same standard with no edit.
- **`XMLHttpRequest` / `WebSocket` / `EventSource` are gated despite probably not existing in Caido's QuickJS.** That makes the rule cheap, not unnecessary — a surface excluded because it probably does not exist is a surface nobody checked.
- **`scripts/ci/check-bundle-imports.mjs` untouched (P9-D2).** Its allowlist answers "which specifiers QuickJS resolved WHEN MEASURED". Removing `caido:http` would redefine that file's semantics from "measured loadable" to "permitted" — a lie about a measurement. The two gates answer different questions and both must exist, which the new `outbound-unanalysable` rule makes concrete: a dynamic import through a variable was invisible to both at once.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The `(globalThis as any).fetch(url)` fixture was testing the parser, not the gate**

- **Found during:** Task 1 (GREEN)
- **Issue:** Written as a bare top-level statement in a fixture with no import or export, `await (globalThis as any).fetch(url);` parses in SCRIPT context, where `await` is an ordinary identifier — TypeScript produces a `CallExpression` named `await` wrapping the cast, so the cast is never the callee's receiver. The fixture failed for a reason that had nothing to do with the rule under test.
- **Fix:** Prefixed the fixture with `export {};` to put it in module context, which is what every module the gate actually walks is in. Verified by dumping the AST of four spellings (`const res = await …`, bare statement, inside an async function, and with `export {};`) before changing anything. The reason is recorded in a comment beside the fixture so nobody later "simplifies" it back.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** `pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts` → 98/98 at that point; the shape is now caught as `outbound-fetch`.
- **Committed in:** `a3a2cc9`

**2. [Rule 3 - Blocker] `join` left dangling after the path-convention change**

- **Found during:** Task 2
- **Issue:** Switching the walk to `posix.join` (IN-09) removed the `join` import while two live-file cases still called `join(BACKEND_SRC, "telemetry.ts")`. Vitest transpiles without typechecking, so both failed at runtime rather than at compile time.
- **Fix:** Both call sites moved to `posix.join`, completing the single-convention change the task required rather than leaving a second convention behind in the assertions.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** `pnpm vitest run …` → 110/110; `pnpm typecheck` exit 0.
- **Committed in:** `51545c0`

**3. [Rule 2 - Missing critical] The live `globalThis` false-positive case did not exist**

- **Found during:** Task 1 acceptance verification
- **Issue:** The plan requires the `telemetry.ts` `globalThis.performance` idiom asserted "both as an inline fixture AND live against the real file". The inline fixture existed; the live assertion did not — the real file was only covered by the generic per-file case, which would have passed vacuously if the file ever stopped using the idiom.
- **Fix:** Added `telemetry.ts reaches globalThis the way this codebase reaches globals, and still reports clean`, with a containment assertion on the idiom so a reword fails loudly rather than leaving a case that proves nothing — the same shape as the existing `caido:http` documentation case.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** `pnpm vitest run …` → 99/99 at that point.
- **Committed in:** `a3a2cc9`

---

**Total deviations:** 3 auto-fixed (1 × Rule 1, 1 × Rule 2, 1 × Rule 3)
**Impact on plan:** None on scope. All three were inside the files the plan already assigned, and each closes an acceptance criterion rather than extending one.

## Issues Encountered

**The plan's recorded seam was not needed.** Task 1 was flagged `confidence: low` and carried a note offering a fixtures-and-rules / header-plus-retag split if the executor ran hot. It did not: the task landed in one RED and one GREEN commit with the retag inside the GREEN rewrite, as the plan preferred.

**The `.call` / `.apply` row split.** The verifier's probe listed `sdk.requests.send.call(...)` / `.apply(...)` as a single row. Executed here as two cases, so the re-run table has 23 rows for 22 probed shapes. Disclosed above rather than silently reconciled to 22.

**Estimate vs actual.** The plan estimated 90,000 tokens for 2 tasks at `confidence: low`. Actual, on the same chars/4-over-the-realized-diff scale: **19,147** — a 4.7× overestimate. Recorded unrounded, because a flattering number here corrupts every later projection. The likely cause: the estimate priced task 1 as a rewrite of a 564-line file, when in practice the header and the test half were preserved and only the walk was replaced.

## User Setup Required

None — no external service configuration required. This plan installs no package (`T-01-SC`: `typescript` and `vitest` were already dependencies; `pnpm install` was not run).

## Known Stubs

None. No hardcoded empty value, placeholder string, `TODO`, `FIXME` or unwired component was introduced. The one accepted residual is a DISCLOSED boundary, not a stub: a value flowing through a function boundary or more than one hop of indirection is beyond the walk (T-01-51, `accept`). It is now stated precisely in the header instead of being described as something narrower, and where the walk can tell indirection is happening it reports `outbound-unanalysable` rather than staying silent.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change was introduced — this plan widens a static gate over already-shipped code and changes no production module. Every threat in the plan's register (`T-01-62` … `T-01-67`, `T-01-71`, plus the carried-forward `T-01-47`) is mitigated by an executed case listed under Evidence above.

## Next Phase Readiness

- **CORE-11's enforcement now matches its statement.** UAT gap 2's outbound half is closed: 22/22 probed shapes, both shipped source roots, unanalysable constructs reported, and three mutation runs against real modules.
- **Ready for `01-13`,** which widens the STORE-07 redaction gate. It needs the same wrapper-unwrapping helper; per this gate's boundary 3 it should get its OWN copy rather than importing this one, and the reason is stated where the helper is defined here.
- **Phase 8 (ACTIVE-*) inherits a gate that will fail on its first line of legitimate work.** That is intended — active retrieval arrives with the send counter and the write-ahead journal Phase 0 built for it, and the allowlist is the single place to record the change.
- **No blockers.** Baseline restored: 31 files / 885 tests, typecheck / lint / knip clean, bundle at one specifier (`crypto`), DET-03 boundary intact, COVERAGE at 40 / 17 / 23.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-21*

## Self-Check: PASSED

All modified files present on disk; all four commits (`2cc3aaa`, `a3a2cc9`, `51545c0`, `f7c8d21`) present in `git log`.
