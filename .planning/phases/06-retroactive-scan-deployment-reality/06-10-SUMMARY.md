---
phase: 06-retroactive-scan-deployment-reality
plan: 10
subsystem: testing
tags: [docker, deployment-matrix, caido, sqlite, json-schema, vitest, bash, container]

requires:
  - phase: 00-runtime-reality-check
    provides: "scripts/spike/instance.sh (absolute app path, version gate, 8080 refusal, LISTEN check, polled readiness, guest token under a tightened umask, always-SIGKILL teardown), scripts/spike/probe-run.sh, scripts/spike/origin.py, scripts/spike/validate-schema.mjs, and spike-result.schema.json as the artifact shape this one is a sibling of"
  - phase: 01-skeleton-persistence-compatibility
    provides: "the FAIL-NEVER-SKIP artifact-gate doctrine, the string walker, and the restart idiom (teardown, blank CAIDO_PID, re-source instance.sh on the same data path)"
  - phase: 06-retroactive-scan-deployment-reality
    provides: "06-02's Phase 6 results root and its separate pinned version constant; 06-09's walking retroactive scan, which is the build every leg ran against"
provides:
  - "A re-runnable deployment matrix for DEPLOY-01: four shapes, one scripted harness per shape, one schema-validated artifact"
  - "matrix-result.schema.json — a two-variant binary block (native path+hash / container image+resolved digest), not_run with a REQUIRED reason and all-null assertions, and a REQUIRED shares_filesystem_with"
  - "tests/phase6-matrix.spec.ts — 46 assertions gating the artifact, declaring the matrix's own version constant"
  - "scripts/phase6/matrix-leg.sh — the four shapes, D-22's four assertions, and the container path this repo had no precedent for"
  - "scripts/phase6/matrix.sh — the sequential batch runner whose exit code encodes D-23"
  - "probe/phase6-matrix — O-04's cursor probe, carrying the attribution control that makes its answer readable"
  - "A MEASURED answer to assumptions A1 and A2, both TRUE, on the live build"
  - "A measured NEGATIVE result about O-04's measurability: on a guest instance the temporary project does not survive a restart, so no request query of any kind runs afterwards"
affects: [deployment, docker, verification, DEPLOY-02, DEPLOY-03, retroactive-scan]

actuals:
  tokens: 34126
  tasks: 3
  commits: 4

tech-stack:
  added: ["caido/caido:0.58.2 container image (harness-only; no runtime dependency added)"]
  patterns:
    - "A leg record with three-state assertions: true ran-and-held, false ran-and-failed, null did-not-run — never collapsed"
    - "An attribution control beside every negative measurement"
    - "One checker implementation shared by hand-built fixtures and the live artifact"

key-files:
  created:
    - .planning/phases/06-retroactive-scan-deployment-reality/results/matrix-result.schema.json
    - .planning/phases/06-retroactive-scan-deployment-reality/results/matrix-result.json
    - .planning/phases/06-retroactive-scan-deployment-reality/results/legs/local-desktop.json
    - .planning/phases/06-retroactive-scan-deployment-reality/results/legs/remote-cli.json
    - .planning/phases/06-retroactive-scan-deployment-reality/results/legs/docker-volume.json
    - .planning/phases/06-retroactive-scan-deployment-reality/results/legs/docker-no-volume.json
    - tests/phase6-matrix.spec.ts
    - scripts/phase6/matrix-leg.sh
    - scripts/phase6/matrix.sh
    - probe/phase6-matrix/manifest.json
    - probe/phase6-matrix/backend/script.js
  modified:
    - .planning/phases/06-retroactive-scan-deployment-reality/deferred-items.md

key-decisions:
  - "The matrix declares its own pinned version constant (0.58.2) and the older Phase 1 literal appears NOWHERE in the harness, so the D-21 prohibition is checkable by grep rather than by reading"
  - "Assertion 2 (the expected table set) is judged at the same post-stop, flush-safe moment as the row counts, because a live read raced the container's write-ahead log and reported the table set absent from a database that plainly had it"
  - "Row counts are read from the plugin's SQLite file copied to scratch, never through the project-scoped RPC, because a guest's temporary project does not survive a restart and the RPC would report an empty result for a database that is not empty"
  - "O-04's probe carries a cursorless CONTROL query; without it, a cursor failing after a restart is indistinguishable from no query running at all, and only one of those is an answer"
  - "Three DISTINCT proxied fixtures rather than one: a single row cannot demonstrate an order (assumption A2), and three identical bodies would be two content-hash cache skips rather than three artifacts"
  - "A new probe package was added outside the plan's files_modified because must-have truth 10 (O-04 answered inside the restart leg) is unreachable from a shell script without one"

patterns-established:
  - "Three-state assertions: null is never read as false, so a leg that did not run cannot be confused with a leg that failed"
  - "Attribution control: a negative measurement ships beside a control that proves the negative is about the thing named, not about the harness"
  - "Single-implementation checkers: classifyMatrix() and noVolumeViolations() judge the fixtures and the live artifact with the same code, so the gate cannot end up proving only that its fixtures are well-formed"
  - "The honest limit is a REQUIRED schema field, not prose: shares_filesystem_with and verdict.remote_filesystem_property are required because the overclaim they prevent is silent when the field is merely absent"

requirements-completed: [DEPLOY-01, FIND-03]

coverage:
  - id: D1
    description: "One scripted harness per deployment shape, on the Phase 0 result-artifact pattern: a fresh instance, the reported version asserted before anything is recorded, the plugin installed, a fixed assertion set run, and a schema-validated JSON result written"
    requirement: DEPLOY-01
    verification:
      - kind: integration
        ref: "bash scripts/phase6/matrix.sh"
        status: pass
      - kind: unit
        ref: "tests/phase6-matrix.spec.ts#the matrix artifact validates against its own schema"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each leg asserts the same four things: plugin installs and reports compatible; migrations ran and the expected table set is present; a proxied JavaScript response produces an artifact and an observation; and after a restart the data is present"
    requirement: DEPLOY-01
    verification:
      - kind: integration
        ref: "results/matrix-result.json legs[].assertions — all four true on all four legs"
        status: pass
      - kind: unit
        ref: "tests/phase6-matrix.spec.ts#the declared legs are all present, in the declared order, with none omitted"
        status: pass
    human_judgment: false
  - id: D3
    description: "The no-volume leg restarts by stop, REMOVE and run, and asserts the data is ABSENT with the plugin clean on an empty database"
    requirement: DEPLOY-01
    verification:
      - kind: integration
        ref: "results/matrix-result.json docker-no-volume: 3 artifacts before, 0 after, tables present, startup_clean true"
        status: pass
      - kind: unit
        ref: "tests/phase6-matrix.spec.ts#the no-volume leg removed and re-created the container rather than restarting it"
        status: pass
      - kind: unit
        ref: "tests/phase6-matrix.spec.ts#rejects a no-volume leg whose restart was a container restart"
        status: pass
    human_judgment: false
  - id: D4
    description: "An unreachable leg is recorded NOT RUN with its reason and all-null assertions, and the matrix still completes as PARTIAL"
    requirement: DEPLOY-01
    verification:
      - kind: integration
        ref: "forced port-8952 collision across a full run: remote-cli recorded not_run, kept its slot, runner exited 0 and printed MATRIX PARTIAL"
        status: pass
      - kind: unit
        ref: "tests/phase6-matrix.spec.ts#REFUSES a not_run leg that recorded an assertion result"
        status: pass
    human_judgment: false
  - id: D5
    description: "The matrix's own pinned version constant, separate from the Phase 1 tripwire, and a refusal to record against any other build"
    requirement: DEPLOY-01
    verification:
      - kind: other
        ref: "grep -c '0\\.57\\.1' scripts/phase6/matrix-leg.sh -> 0"
        status: pass
      - kind: unit
        ref: "tests/phase6-matrix.spec.ts#pins the matrix's OWN version, not Phase 1's tripwire"
        status: pass
    human_judgment: false
  - id: D6
    description: "The shared-filesystem limit is stated in the artifact rather than left implicit, so four passing legs are not read as four independent confirmations"
    requirement: DEPLOY-01
    verification:
      - kind: unit
        ref: "tests/phase6-matrix.spec.ts#names the legs that carry the remote-filesystem property in the verdict"
        status: pass
      - kind: unit
        ref: "tests/phase6-matrix.spec.ts#records the shared filesystem between the two native legs"
        status: pass
    human_judgment: false
  - id: D7
    description: "O-04 answered as an observation inside the restart leg, with assumptions A1 and A2 alongside it"
    requirement: FIND-03
    verification:
      - kind: integration
        ref: "results/matrix-result.json legs[].cursor_probe — A1 and A2 both true; O-04 measured:false with its control-backed reason"
        status: pass
      - kind: unit
        ref: "tests/phase6-matrix.spec.ts#an UNmeasured cursor probe says why, and claims no answer"
        status: pass
    human_judgment: false
  - id: D8
    description: "The command-line leg run against a genuinely remote host, confirming the plugin behaves identically where the server's disk is not the operator's"
    verification: []
    human_judgment: true
    rationale: "No remote host was available. On this machine the leg shares a filesystem with the desktop leg, and the artifact SAYS SO rather than reporting it as an independent confirmation — which is what D-23 prescribes for exactly this case. Confirming the genuinely-remote behaviour needs a second machine and an operator to point the leg at it (MATRIX_CLI_REMOTE_HOST is the switch)."

duration: 42 min
completed: 2026-09-01
status: complete
---

# Phase 6 Plan 10: The Deployment Matrix Summary

**DEPLOY-01 now has re-runnable evidence rather than a memory: four deployment shapes, all four passing on this machine, in one schema-validated artifact that names the exact build and image each leg ran and states in its own text which two legs actually carry the property the other two cannot.**

## Performance

- **Duration:** 42 min
- **Started:** 2026-08-31T22:20:00Z
- **Completed:** 2026-08-31T22:42:00Z (plus repeated live matrix runs)
- **Tasks:** 3 of 3
- **Files modified:** 26 (11 created, 15 result/run artifacts)

## Accomplishments

- **All four declared shapes ran and passed** — `local-desktop`, `remote-cli`, `docker-volume`, `docker-no-volume` — against `caido-cli` 0.58.2 and `caido/caido@sha256:d34929fd…`, each recording its own binary hash or resolved manifest digest.
- **The leg the whole requirement turns on behaves correctly.** With nothing mounted, 3 artifact rows and 3 observation rows before the restart became **0 after `stop && rm && run`**, with the expected table set present, startup clean and no error. The image declares no `VOLUME`, so the data lived in the writable layer and died with it — exactly as the research measured, now demonstrated rather than assumed.
- **The container half of the harness is new work with no precedent in this repo.** Nothing here had ever pulled or run a container. It rebuilds every gate `instance.sh` provides rather than skipping them: a version gate through a throw-away container before anything is recorded, the resolved manifest digest rather than the moving tag, an unconditional 8080 refusal, a refusal to reuse a container name, polled readiness, and a teardown that removes only the container it created.
- **D-23 is mechanised, not narrated.** A forced port collision across a full run produced a genuine `not_run` leg that kept its slot in the declared order; the runner exited **0** and reported `MATRIX PARTIAL`. The failed-leg branch exits **1**, verified against the shipped expression.
- **O-04 was taken as far as this build allows, and no further.** A1 (request ids are decimal integer strings) and A2 (`row.id` ordering agrees with `descending("req","id")`) are both measured **true** — those are the two facts the shipped resume position actually depends on. O-04 itself is recorded `measured: false` with a control-backed reason, because a cursorless control query proved that *no* request query runs after the restart on a guest instance.
- **The honest limit is in the artifact.** `verdict.remote_filesystem_property` reads: *"The local-desktop and remote-cli legs share a filesystem on the recording host and therefore do NOT exercise the property DEPLOY-02 and DEPLOY-03 exist for… 4 passing legs are NOT 4 independent confirmations of that property."*

## Task Commits

1. **Task 1: The matrix result schema and its artifact gate** — `e1eeef6` (test)
2. **Task 2: The per-leg harness, the container path, and O-04's cursor assertion** — `6ca970f` (feat)
3. **Task 3: The batch runner and one recorded matrix** — `0593e85` (feat)

**Deferred-item log:** `ed68179` (docs)

## Files Created/Modified

- `results/matrix-result.schema.json` — the sibling schema. A one-of binary block discriminated on `kind`, so an object mixing a native `path` with a container `manifest_digest` matches neither branch. `not_run` requires a non-empty `reason` **and** all-null assertions, as two separate schema conditionals.
- `results/matrix-result.json` — the recorded run: four legs, all pass, `partial: false`.
- `results/legs/*.json` — one record per leg, each keeping its own slot.
- `tests/phase6-matrix.spec.ts` — 46 assertions. Declares its own `EXPECTED_CAIDO_VERSION = "0.58.2"`.
- `scripts/phase6/matrix-leg.sh` — one shape, one leg record. Sources `instance.sh` for the native legs; builds the equivalent gates for the container legs.
- `scripts/phase6/matrix.sh` — sequential batch runner, schema-validating before it writes.
- `probe/phase6-matrix/` — `cursorHead`, `cursorAfter`, `idOrder`.

## Decisions Made

- **`EXPECTED_TABLES` is read out of `packages/backend/src/store/schema.spec.ts`, never re-typed.** A second hand-maintained copy would drift on the next migration and the harness would then be checking the copy.
- **Assertion 2 moved to the post-stop snapshot.** See deviation 3 — a live read raced the container's WAL.
- **Counts come from the database file, not the RPC.** `getArtifacts` is project-scoped, and a guest's temporary project does not survive a restart, so the RPC would report an empty result for a database that is not empty. Phase 1 reached the same conclusion for the same reason.
- **The no-volume second boot reinstalls the plugin.** The writable layer took it, so "the plugin comes back clean on an empty database" is only observable after a reinstall — which is itself the assertion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical functionality] O-04's assertion is unreachable from a shell script without a probe**

- **Found during:** Task 2
- **Issue:** Must-have truth 10 requires the cursor assertion *inside the restart leg*, but a `Cursor` only exists inside the QuickJS runtime. The shipped plugin exposes no such surface, and `probe/phase6-o07`'s `queryMeasure` returns only `cursor_present` — never the cursor value, and it cannot call `.after()`.
- **Fix:** Added `probe/phase6-matrix` with `cursorHead`, `cursorAfter` and `idOrder`. It stores nothing, reads no body, and returns only ids, counts and booleans; the cursor value goes to the harness (which carries it across the restart in shell state) and is never written into the artifact, being opaque internal state.
- **Files modified:** `probe/phase6-matrix/manifest.json`, `probe/phase6-matrix/backend/script.js`
- **Verification:** A1 and A2 both measured `true` on all four legs.
- **Committed in:** `6ca970f`

**2. [Rule 1 — Bug] Probe arguments were singly encoded; the backend-function route double-encodes**

- **Found during:** Task 2
- **Issue:** `cursorAfter` failed with `unexpected token: 'eyJpZCI6Mywib3JkZXJfdmFsdWUi…'` — the route was trying to parse the base64 cursor as JSON. `idOrder` had appeared to work only by accident: its argument `"20"` happens to be valid JSON.
- **Fix:** Adopted the `jargs` helper already used by `scripts/phase6/o07-body-length.sh` — one `json.dumps` per argument, then one for the array — with the reason recorded beside it.
- **Files modified:** `scripts/phase6/matrix-leg.sh`
- **Verification:** The cursor probe now reaches the runtime and returns a structured answer.
- **Committed in:** `6ca970f`

**3. [Rule 1 — Bug] The boot-1 table read raced the container's write-ahead log**

- **Found during:** Task 2
- **Issue:** `docker-volume` reported `migrations_and_tables: false` on a database whose `tables_after` a moment later listed all six expected tables. The live `docker cp` had caught the schema still in the WAL.
- **Fix:** Assertion 2 is judged from the post-stop snapshot, the same flush-safe moment as the row counts, uniformly on all four legs. One `judge_tables` helper now serves both boot 1 and the empty-database boot.
- **Files modified:** `scripts/phase6/matrix-leg.sh`
- **Verification:** All four legs report `migrations_and_tables: true`.
- **Committed in:** `6ca970f`

**4. [Rule 1 — Bug] The before-counts were captured before the traffic they were meant to count**

- **Found during:** Task 2
- **Issue:** `artifacts_before: 0, artifacts_after: 1` on a leg where nothing was lost — the before-snapshot ran during assertion 2, ahead of the proxied fetch in assertion 3. The restart comparison was measuring the wrong interval.
- **Fix:** Added `capture_before`, called after the instance stops and before the restart, on all three restart paths.
- **Files modified:** `scripts/phase6/matrix-leg.sh`
- **Verification:** 3 before / 3 after on the persisting legs; 3 before / 0 after on the no-volume leg.
- **Committed in:** `6ca970f`

**5. [Rule 2 — Missing critical functionality] O-04's negative was unattributable without a control**

- **Found during:** Task 2
- **Issue:** With the marshalling fixed, `cursorAfter` returned `resolved: false` with `MissingConnectionPool`. Recorded as-is that would have published "cursors do not survive a restart" — but the cause was that the guest's **temporary project** does not survive, so no request query runs at all. The two are different answers and the run had not distinguished them.
- **Fix:** The probe now runs a **cursorless control query** first. If the control does not resolve, the cursored query is not run at all, `resolved_after_restart` stays `null`, and `measured` is `false` with the reason. Added `control_query_resolved` to the schema, and gate assertions that a `measured: true` probe must carry a resolved control and an `measured: false` probe must claim no answer.
- **Files modified:** `probe/phase6-matrix/backend/script.js`, `scripts/phase6/matrix-leg.sh`, `results/matrix-result.schema.json`, `tests/phase6-matrix.spec.ts`
- **Verification:** The control does not resolve on this build, so O-04 is honestly recorded as not measurable by this route.
- **Committed in:** `6ca970f`

**6. [Rule 1 — Bug] One proxied fixture cannot demonstrate an order**

- **Found during:** Task 2
- **Issue:** `id_ordering_agrees: null, sample_size: 1`. A single row makes A2 permanently unmeasurable.
- **Fix:** Three **distinct** fixtures. Distinct rather than repeated because three identical bodies would be two content-hash cache skips, exercising CORE-08 rather than the walk.
- **Files modified:** `scripts/phase6/matrix-leg.sh`
- **Verification:** `sample_size: 3`, `id_ordering_agrees: true`.
- **Committed in:** `6ca970f`

**7. [Rule 1 — Bug] A container leg's `run_id` named the restart boot, not the leg's**

- **Found during:** Task 3
- **Issue:** The container path overwrote `LEG_RUN_ID` with the `-restart` id, so two of four legs recorded a run id meaning a different boot from the other two.
- **Fix:** The restart boot gets its own run directory and token; `LEG_RUN_ID` keeps naming boot 1, the run that produced the measurements.
- **Files modified:** `scripts/phase6/matrix-leg.sh`
- **Verification:** All four leg records now name their boot-1 run id.
- **Committed in:** `0593e85`

**8. [Rule 1 — Bug] Two gate fixtures asserted the cheat was good**

- **Found during:** Task 1
- **Issue:** The no-volume fixture tests read `expect(cheat.restart.data_present === false).toBe(true)` — asserting the *bad* fixture was fine, which failed for the right value and the wrong reason.
- **Fix:** Extracted `noVolumeViolations()`, used by the fixtures **and** the live artifact, plus a positive case proving the checker is not vacuously strict.
- **Files modified:** `tests/phase6-matrix.spec.ts`
- **Verification:** 46 assertions pass, including the honest-leg case.
- **Committed in:** `e1eeef6`

---

**Total deviations:** 8 auto-fixed (6 × Rule 1 bug, 2 × Rule 2 missing critical functionality)
**Impact on plan:** No scope creep. Six were measurement bugs that would each have produced a *confidently wrong* artifact — the most dangerous failure mode for a plan whose entire output is evidence. The two Rule 2 additions were both required by must-have truth 10. One file was added outside `files_modified` (`probe/phase6-matrix/`) because the O-04 assertion is not reachable from a shell script without it.

## Issues Encountered

**The plan's `<precondition>` gates were both MET, and the second needed action.** Docker was installed but its daemon was down; it was started (`open -ga Docker`) and reported 29.7.2 — a legitimate way to satisfy a precondition rather than a workaround. The desktop app reported the pinned 0.58.2 at the absolute app-bundle path. Both container legs therefore RAN; neither is a `not_run`.

**`host.docker.internal` reachability was verified rather than assumed.** A throw-away `curlimages/curl` container was pointed at a host loopback origin and returned 200 before the harness was written against it.

**The `MissingConnectionPool` finding is worth carrying forward.** On a guest instance the project is temporary and does not survive a restart, so `sdk.requests.query()` cannot run afterwards *at all*. Any future probe that needs Caido's request store to persist across a restart will hit this and must not read it as a statement about whatever it was trying to measure.

**Out of scope, logged not fixed:** `STATE.md` records the SPIKE-10 recorder as running (pid 79273, `127.0.0.1:8998`); that pid no longer exists and nothing listens on 8998. This plan did not kill it — nothing under `scripts/phase6/` references 8998, the matrix owns 8951-8955, `instance.sh` SIGKILLs only the pid it launched, the machine has been up 9 days, `.spike/recorder-data` has not been written since 21 Aug, and the operator's live 8080 instance (pid 79244) is still running. Recorded in `deferred-items.md` and WINDOWS.

## Known Stubs

None. Every assertion in the shipped harness executes against a live instance; no leg is recorded on the strength of an assertion that did not run.

## User Setup Required

None at close-out — both `user_setup` services were satisfied during this run. Docker Desktop must be running to re-run the container legs; without it they record `not_run` with that reason and the matrix reports PARTIAL rather than failing.

## Next Phase Readiness

- **DEPLOY-01 is evidenced by a re-runnable artifact**, and `bash scripts/phase6/matrix.sh` reproduces it.
- **DEPLOY-02 and DEPLOY-03** now have a named carrier: the two container legs are the only ones that exercise a server whose disk the operator cannot reach, and the artifact says so.
- **One human-judgment item remains (D8):** running the command-line leg against a genuinely remote host. `MATRIX_CLI_REMOTE_HOST` is the switch; absent it, the local run with the limitation stated is what D-23 prescribes.
- **Baseline at close-out:** `pnpm test` green — 69 files, 2876 tests. `pnpm knip` exits 0 (22 tag hints, the known state). `scripts/spike/instance.sh` byte-unchanged; the Phase 0 results directory clean.

---
*Phase: 06-retroactive-scan-deployment-reality*
*Completed: 2026-09-01*
