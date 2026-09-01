---
phase: 07-sourcemap-reconstruction
plan: 01
subsystem: infra
tags: [sourcemap, quickjs, caido, measurement, base64, json-parse, thresholds, fixtures]

requires:
  - phase: 00-runtime-reality-check
    provides: SPIKE-06's ladder method and stack boundaries, SPIKE-12's 22-fixture path corpus, the capabilities artifact that found `atob`, `spike-result.schema.json`'s required key set, and the `instance.sh` / `probe-run.sh` / `rss-sampler.sh` harness
  - phase: 01-skeleton-persistence-compatibility
    provides: `scripts/phase1/fetch-caido.sh` and the sha512-verified `.caido-bin/0.58.0` build, `thresholds.ts`'s POLICY/MEASURED split, `thresholds.spec.ts`'s inequality idiom
  - phase: 05-frontend
    provides: `hostile.fixture.ts`'s one-module corpus idiom, `sanitise.ts`'s two grapheme caps, the measured `forCell` / `forCellText` delta on a 4 MiB single-line value
  - phase: 06-retroactive-scan-deployment-reality
    provides: D-21 (a phase pins its OWN Caido version constant), `matrix-result.schema.json`'s sibling-schema shape, `phase6-matrix.spec.ts`'s FAIL-NEVER-SKIP gate doctrine
provides:
  - "MAP_MAX_BYTES as a MEASURED number with its artifact cited by path — 2,621,440 bytes, and the bound is BINDING"
  - "SOURCEMAP_TAIL_WINDOW_BYTES, DERIVED from MAP_MAX_BYTES by the ceil-4/3 relation rather than chosen"
  - "ANNOUNCEMENT_PREFIX_MAX, SOURCE_LINE_COUNT_MAX and SOURCE_ROWS_PER_MAP_MAX, each with a POLICY_DERIVED_FROM entry"
  - "packages/engine/src/sourcemap/map-fixture.ts — 13 hostile map documents, 23 sources labels, a parametric size boundary; the single module three plans read"
  - "scripts/phase7/fetch-maps.sh — three SHA-256-pinned real vendor sourcemaps and a `synth` helper that lands a fixture on an EXACT decoded byte count"
  - "The measured answer to assumption A2: announce_scan is the MOST expensive of the five operations"
  - "The measured confirmation of Pitfall 4: atob and Buffer disagree at every ladder point"
  - "A reusable Tier-1 probe (tier1/mapbytes) and its driver, gate and schema"
affects: [07-02, 07-03, 07-04, 07-05, 07-07, 07-10]

actuals:
  tokens: 72000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A phase's probe declares its OWN pinned Caido version constant (D-21, applied a second time) and targets the in-repo sha512-verified .caido-bin build rather than the drifting app bundle"
    - "A POLICY_DERIVED_FROM entry whose measured term is a FILE PATH rather than an imported symbol, for a measurement that deliberately does not live in go-no-go.json"
    - "A fixture module exporting a parametric BUILDER plus a derived id array, where an eager frozen binding would force a forward dependency on a constant"
    - "A driver that resolves its own backend by asking (`mapbytes_info`) rather than positionally, because probe-run.sh takes backends[0] and the package now ships three"
    - "Run evidence is scrubbed of the checkout prefix after teardown, loudly, so an in-repo binary path cannot become the first home-directory path in tracked results"

key-files:
  created:
    - scripts/phase7/fetch-maps.sh
    - scripts/phase7/map-bytes.sh
    - scripts/phase7/record-point.py
    - scripts/phase7/assemble.py
    - scripts/phase7/build-observations.py
    - tier1/mapbytes/src/index.ts
    - .planning/phases/07-sourcemap-reconstruction/results/map-bytes.schema.json
    - .planning/phases/07-sourcemap-reconstruction/results/map-bytes.json
    - .planning/phases/07-sourcemap-reconstruction/results/map-bytes-observations.json
    - tests/phase7-mapbytes.spec.ts
    - tests/corpus-maps.spec.ts
    - packages/engine/src/sourcemap/map-fixture.ts
  modified:
    - packages/engine/src/thresholds.ts
    - packages/engine/src/thresholds.spec.ts
    - packages/engine/package.json
    - caido.config.ts
    - .gitignore

key-decisions:
  - "MAP_MAX_BYTES is 2,621,440 — the measured stall bound of 2,954,422 ROUNDED DOWN to the nearest 512 KiB boundary, because the bound is a least-squares fit over four timing points that moved 2,752,788 -> 2,954,422 between two runs, and a constant above the fit sits inside its own noise on the wrong side"
  - "The bound is BINDING: the inline path costs 8.87 ms/MB and the 6.29 MB point costs 52.7 ms against MAX_SYNC_SLICE_MS = 25, so the phase will refuse a minority of the inline maps admit() would admit and the UI must say so (UI-09)"
  - "Assumption A2 does NOT hold cleanly. announce_scan at 3.80 ms/MB is the most expensive of the five operations, above json_parse's 2.91 — RESEARCH's named mitigation (a 16-byte lastIndexOf prefilter) is now an evidenced optimisation rather than a precaution"
  - "Buffer.from(payload, 'base64') over atob is now MEASURED rather than reasoned: the two produced different strings at all four points, and Buffer is also faster (2.16 vs 2.55 ms/MB)"
  - "corpus/ is gitignored in its entirety, so RESEARCH § O-03's corpus/maps/ instruction is NOT followed. The corpus splits by size across scripts/phase7/fetch-maps.sh (large, hashed) and packages/engine/src/sourcemap/map-fixture.ts (small, string literals)"
  - "SIZE_BOUNDARY_CASES ships as a builder rather than a frozen binding, which removes a 12 MiB eager allocation, lets 07-02 exercise the boundary at a test size, and removes a forward dependency on a constant task 3 publishes"
  - "mapbytes-probe is APPENDED to caido.config.ts and never inserted, so probe-run.sh's backends[0] still resolves parse-probe and a re-run of ladder.sh cannot silently call `measure` on the wrong backend"
  - "The probe artifact lives in Phase 7's own results/ and its schema REFUSES a SPIKE-NN identifier outright, because tests/spike-results.spec.ts globs that shape under Phase 0's results and pins 0.57.1"

patterns-established:
  - "Round a measured bound DOWN and state the direction: a fitted number's rounding direction is part of its derivation, not a formatting choice"
  - "An opportunistic finding is an OBSERVATION with a status vocabulary that has no `pass` in it, plus a `not_a_policy` sentence, so it cannot be cited later as a decision"
  - "A `not_run` observation carries its reason, because zero survivors and zero attempts look identical in a chart and mean opposite things"
  - "Measure BOTH candidate primitives and record whether they agreed, so the choice between them is measured rather than reasoned"

requirements-completed: [MAP-01, MAP-02, MAP-05]

coverage:
  - id: D1
    description: "MAP_MAX_BYTES exists as a MEASURED number, derived from a four-point ladder taken inside a version-asserted Caido 0.58.0, with the artifact cited by path from thresholds.ts"
    requirement: MAP-02
    verification:
      - kind: integration
        ref: "scripts/phase7/map-bytes.sh -> .planning/phases/07-sourcemap-reconstruction/results/map-bytes.json"
        status: pass
      - kind: unit
        ref: "tests/phase7-mapbytes.spec.ts#the verdict > states a numeric MAP_MAX_BYTES"
        status: pass
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the probe artifact exists and still reports the bound this constant was rounded from"
        status: pass
    human_judgment: false
  - id: D2
    description: "The four ladder points ran on four FRESH instances with four distinct run_ids, each measuring all five declared operations in the fixed order"
    requirement: MAP-02
    verification:
      - kind: unit
        ref: "tests/phase7-mapbytes.spec.ts#the ladder points > each ran on its OWN instance — run_id UNIQUENESS, not merely fresh: true"
        status: pass
      - kind: unit
        ref: "tests/phase7-mapbytes.spec.ts#the ladder points > each carries EVERY declared operation, and names the one that is missing"
        status: pass
      - kind: unit
        ref: "tests/phase7-mapbytes.spec.ts#the ladder points > each records the operations in the DECLARED ORDER"
        status: pass
    human_judgment: false
  - id: D3
    description: "SOURCEMAP_TAIL_WINDOW_BYTES is DERIVED from MAP_MAX_BYTES by ceil-4/3 plus the announcement prefix, with the two rounding directions asserted to oppose"
    requirement: MAP-02
    verification:
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the tail window can never be narrower than the payload it must contain"
        status: pass
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the two base64 rounding directions OPPOSE, which is what makes the window safe"
        status: pass
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the derived window is DERIVED — by reference, never by a copied number"
        status: pass
    human_judgment: false
  - id: D4
    description: "The structural-ceiling inequality goes RED when PASSIVE_MAX_BYTES moves and green when it is restored"
    requirement: MAP-02
    verification:
      - kind: manual_procedural
        ref: "scratch edit PASSIVE_MAX_BYTES 8_388_608 -> 2_097_152; 3 assertions failed; reverted; 54/54 green"
        status: pass
    human_judgment: false
  - id: D5
    description: "One tracked fixture module serves the probe, plan 07-02's MAP-05 suite and plan 07-03's sink gate — 13 hostile documents, 23 sources labels, a parametric size boundary"
    requirement: MAP-05
    verification:
      - kind: unit
        ref: "tests/corpus-maps.spec.ts (114 assertions)"
        status: pass
      - kind: unit
        ref: "git check-ignore -v packages/engine/src/sourcemap/map-fixture.ts (exit 1 — tracked source)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The large half of the corpus is reproducible from scripts/phase7/fetch-maps.sh and its committed SHA-256 hashes, idempotently and fail-closed"
    requirement: MAP-05
    verification:
      - kind: unit
        ref: "tests/corpus-maps.spec.ts#the LARGE half of the corpus — fetch-maps.sh and its committed hashes"
        status: pass
      - kind: manual_procedural
        ref: "bash scripts/phase7/fetch-maps.sh run twice — three `ok` lines, no download"
        status: pass
    human_judgment: false
  - id: D7
    description: "Open Question 1's request-retention curve is recorded as an observation with its own status and never as a settled retention policy"
    requirement: MAP-02
    verification:
      - kind: unit
        ref: "tests/phase7-mapbytes.spec.ts#the opportunistic observation stays an observation"
        status: pass
    human_judgment: true
    rationale: "The observation status is `not_run` — this Caido build's sdk.requests exposes no `create`, so no request could be stored. The GATE is fully automated and green, but whether `not_run` is an acceptable outcome for this phase (rather than a reason to find another way to store a request) is a judgment the phase owner should make. RESEARCH says do not block on it; that instruction is followed, and it is surfaced here rather than buried."
  - id: D8
    description: "MAP-02's `781 sources / 12.66 MB / 21 ms` parenthetical is recorded in the artifact's verdict as measured in standalone quickjs-ng 0.16.1 and as a case that cannot arise on the inline path"
    requirement: MAP-02
    verification:
      - kind: unit
        ref: "tests/phase7-mapbytes.spec.ts#the verdict > records O-04 — MAP-02's parenthetical was NOT measured in Caido"
        status: pass
    human_judgment: true
    rationale: "The ARTIFACT records O-04 and the gate asserts it. But O-04's own recommended action #1 — amend REQUIREMENTS.md's MAP-02 parenthetical to name its harness, or strike it — is a documentation edit this plan does not own and did not make. Until that lands, the unqualified figure still sits beside the requirement."

duration: 46 min
completed: 2026-09-01
status: complete
---

# Phase 07 Plan 01: The Measured Bound and the Fixture Corpus — Summary

**`MAP_MAX_BYTES = 2,621,440` measured inside Caido 0.58.0 across a four-point ladder and found BINDING at 2.3x below the structural ceiling; `announce_scan` turned out to be the most expensive of the five operations, not `json_parse`; and `atob` was caught corrupting non-ASCII at every point.**

## Performance

- **Duration:** 46 min
- **Started:** 2026-09-01T20:15:00Z
- **Completed:** 2026-09-01T21:01:00Z
- **Tasks:** 3 (1 tracer + 2 auto)
- **Files created:** 12 · **modified:** 5

## Accomplishments

### 1. The number this phase could not borrow

`MAP_MAX_BYTES = 2_621_440`. Derived as `min(measured_stall_bound, measured_rss_bound, 6_291_456)` from
`.planning/phases/07-sourcemap-reconstruction/results/map-bytes.json`, then **rounded down** to the nearest 512 KiB boundary:

| Term | Value | Source |
|---|---:|---|
| `measured_stall_bound` | 2,954,422 B | inline path at 8.87 ms/MB against `MAX_SYNC_SLICE_MS` = 25 |
| `measured_rss_bound` | 94,824,930 B | 11.32 RSS bytes per decoded byte against the 1 GiB projection |
| structural ceiling | 6,291,456 B | `floor(PASSIVE_MAX_BYTES * 3/4)` — base64 expands 4:3 |

**The bound is BINDING**, by more than 2x. That is O-03's first `if_wrong` outcome and it has a product consequence
this plan hands to 07-05 and 07-10: DefMiner will refuse a minority of the inline maps `admit()` would let through,
and must **say so** (UI-09) rather than appear to have found nothing.

**Why it is rounded, and why DOWN.** 2,954,422 is a least-squares fit through four timing points. The immediately
preceding run of the same ladder produced 2,752,788 — a 7% swing on identical inputs. A constant *above* the fit sits
inside the measurement's own noise on the wrong side; rounding down puts it outside on the safe side. The direction is
part of the derivation, written into the doc comment, not a formatting choice.

### 2. The four ladder points

Four fresh, version-asserted Caido 0.58.0 instances, one per point, four distinct `run_id`s, on ports 8941–8944:

| Point | Decoded bytes | `run_id` | Source map | `announce_scan` | `b64_decode_atob` | `b64_decode_buffer` | `json_parse` | `sources_materialise` |
|---|---:|---|---|---:|---:|---:|---:|---:|
| p0500k | 524,288 | `20260901T204820Z-10566` | monaco | 1.83 ms | 1.12 ms | 1.00 ms | 1.30 ms | 0.77 ms |
| p1500k | 1,572,864 | `20260901T204823Z-27685` | monaco | 6.65 ms | 4.09 ms | 3.71 ms | 4.68 ms | 2.42 ms |
| p3000k | 3,145,728 | `20260901T204829Z-23167` | babel | 11.84 ms | 7.53 ms | 7.17 ms | 7.93 ms | 7.35 ms |
| p6291k | 6,291,456 | `20260901T204841Z-24486` | tfjs | 22.37 ms | 15.31 ms | 12.50 ms | 17.80 ms | 14.64 ms |

Fitted rates: `announce_scan` **3.80** ms/MB · `json_parse` **2.91** · `b64_decode_atob` **2.55** ·
`sources_materialise` **2.40** · `b64_decode_buffer` **2.16**. RSS: 11.32 bytes per decoded byte.

### 3. Three findings the probe existed to settle

**A2 does not hold cleanly — and this is the headline.** RESEARCH called the `lastIndexOf` announcement scan
"UNMEASURED ANYWHERE" and put it in the operation list precisely to settle whether it was cheap. It is not: at
**3.80 ms/MB it is the most expensive of the five**, above `json_parse`'s 2.91, and it alone accounts for 43% of the
inline path. RESEARCH named the mitigation in advance — a single 16-byte `lastIndexOf("sourceMappingURL")` prefilter
before the two full marker searches — which is now an *evidenced* optimisation with a number behind it rather than a
precaution. Applying it would move `MAP_MAX_BYTES` up by roughly 75%. **Owed to plan 07-02.**

**Pitfall 4 confirmed by measurement, not by documentation.** `atob(payload)` and
`Buffer.from(payload, "base64").toString("utf8")` produced **different strings at all four points**, with `atob`
strictly longer every time — 524,288 vs 523,633 characters at the smallest point, 6,291,456 vs 6,291,441 at the
largest. That is exactly latin1 splitting each multi-byte UTF-8 sequence into one code unit per byte, inside string
values, where `JSON.parse` still succeeds and nothing throws. `Buffer` is *also* marginally faster (2.16 vs 2.55
ms/MB), so the correct primitive costs nothing to choose. The comparison is recorded per point in the artifact as
`decode_agreement`, and the gate asserts that at least one point **disagreed** — a pure-ASCII fixture corpus would
report `identical: true` everywhere and be read as "the primitive does not matter", the exact wrong conclusion.

**O-04 recorded.** `verdict.o_04_map02_parenthetical` names the harness (standalone quickjs-ng 0.16.1 per
`STACK.md:546`, not Caido), quantifies the one operation measured both ways (~1.27x), states that the ratio must NOT
be used to project `JSON.parse`, and states independently that the case cannot arise: 12.66 MB base64-encodes to
~16.9 MB against `PASSIVE_MAX_BYTES` = 8,388,608.

### 4. The request-retention observation (Open Question 1)

**`status: not_run`, with its reason.** The probe enumerated `sdk.requests` on this build and found
`query, matches, get, send, inScope` — and **no `create`**, so no request could be stored and no survival curve
exists. Recorded as `not_run` rather than as a curve of zeros: zero survivors and zero attempts look identical in a
chart and mean opposite things. The observation carries a `not_a_policy` paragraph, and the schema **refuses** a
`pass`-shaped status on an observation outright, so this row cannot later be cited as DefMiner's retention model.
D-22's tombstone design does not depend on it and the phase does not gate on it, exactly as RESEARCH directed.

### 5. The fixture corpus, in its two tracked homes

`corpus/` is gitignored in its entirety (`.gitignore:9`, confirmed with `git check-ignore -v`), so RESEARCH § O-03's
`corpus/maps/` instruction is **not followed**. The corpus splits by size:

- **`scripts/phase7/fetch-maps.sh`** — monaco 0.52.2 (13.28 MB, 781 sources), babel 7.26.4 (7.01 MB, 1,007) and
  tfjs 4.22.0 (16.90 MB, 1,744), each pinned to an immutable versioned jsDelivr path AND a committed SHA-256, with a
  fail-closed mismatch branch. Plus a `synth` helper that lands a fixture on an **exact** decoded byte count — the
  ladder point *is* the x-axis of the measurement, and "roughly 1.5 MB" makes the slope an estimate of an estimate.
- **`packages/engine/src/sourcemap/map-fixture.ts`** — 13 hostile documents (every Pitfall 3/4/5/6 case, the
  800-bracket nesting case past SPIKE-06's measured 710 boundary, a 1,000,000-source map, a 4 MiB single-source map),
  SPIKE-12's 22 label cases verbatim plus D-12's 4 KB label, and `sizeBoundaryCases(ceiling)`.
  `git check-ignore` exits 1: tracked source.

### 6. Four constants, published as inequalities

`MAP_MAX_BYTES`, `ANNOUNCEMENT_PREFIX_MAX`, `SOURCEMAP_TAIL_WINDOW_BYTES` (computed, never written),
`SOURCE_LINE_COUNT_MAX`, `SOURCE_ROWS_PER_MAP_MAX` — each with a `POLICY_DERIVED_FROM` entry naming `map-bytes.json`
**by path**. These are the first entries whose measured term is a file rather than an imported symbol, and the reason
is stated in the map itself: Phase 7's measurement deliberately does not live in `go-no-go.json`, because
`gen-thresholds.mjs` emits `thresholds.generated.ts` from that one artifact and gate 1 byte-compares the result.

## Task Commits

1. **Task 1 (tracer): one map, one size point, one fresh Caido, one gated artifact** — `1d93359` (feat)
2. **Task 2: the full ladder, the five operations, and the tracked fixture corpus** — `827aab7` (feat)
3. **Task 3: publish the four derived constants, as inequalities** — `fd2446e` (feat)

## Files Created/Modified

- `scripts/phase7/fetch-maps.sh` — three SHA-256-pinned vendor maps + the exact-size `synth` helper
- `scripts/phase7/map-bytes.sh` — the driver: own version constant, own backend resolution, one fresh instance per point, post-teardown evidence scrub
- `scripts/phase7/record-point.py` — correlates the RSS trace to the in-runtime markers; relativises recorded paths
- `scripts/phase7/assemble.py` — derives every verdict figure from the points, or records `null` with a reason
- `scripts/phase7/build-observations.py` — keeps the opportunistic finding opportunistic
- `tier1/mapbytes/src/index.ts` — the five-operation probe, `measured()` reused verbatim, plus `retention_probe`
- `.planning/.../results/map-bytes.schema.json` — refuses a `SPIKE-NN` id and a `pass`-shaped observation status
- `.planning/.../results/map-bytes.json` — the artifact `thresholds.ts` cites
- `tests/phase7-mapbytes.spec.ts` — 54 assertions gating the artifact
- `tests/corpus-maps.spec.ts` — 114 assertions gating both halves of the corpus
- `packages/engine/src/sourcemap/map-fixture.ts` — the one fixture module three plans read
- `packages/engine/src/thresholds.ts` / `.spec.ts` — five constants, nine new relations
- `caido.config.ts` — `mapbytes-probe`, appended
- `.gitignore` — Phase 7 token/log exclusions
- `packages/engine/package.json` — the `./sourcemap/map-fixture` export

## Decisions Made

See `key-decisions` in the frontmatter. The three with the longest reach:

1. **Rounding down, with the direction argued.** A fitted number's rounding direction is part of its derivation.
2. **The corpus splits by size across two tracked homes**, discharging the PATTERNS debt in the plan's own words.
3. **`SIZE_BOUNDARY_CASES` is a builder, not a frozen binding** — see the deviation below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] Phase 7 had no `.gitignore` token/log exclusions**

- **Found during:** Task 1, before the first commit
- **Issue:** `instance.sh` mints a live guest bearer token into `$OUT/runs/$RUN_ID/token` and deletes it at teardown — *if* teardown runs. Phases 0, 1 and 6 each carry path-specific exclusions for exactly this; Phase 7 sources the same script into a **fourth** results root and had none. A run that died before teardown could commit live credential material, and every run would commit host logs.
- **Fix:** Added the three Phase 7 rules in the same idiom and with the same reasoning, stating that everything a result legitimately needs from a log is extracted into `map-bytes.json`.
- **Files modified:** `.gitignore`
- **Verification:** `git status --porcelain --ignored` shows the four log files ignored; no `token` file survives a completed run.
- **Committed in:** `1d93359`

**2. [Rule 1 — Bug] The first artifact leaked `/Users/...` — caught by this plan's own gate**

- **Found during:** Task 1, on the first gate run
- **Issue:** Unlike every earlier phase, this probe's binary lives **inside the checkout**, so `instance.sh`'s absolute `CAIDO_BIN` and the probe's echoed fixture path both ran through the operator's home directory. Zero tracked files under any `results/runs/` carried a home path before this; Phase 7 would have been the first.
- **Fix:** Two places, because the leak had two sources. `record-point.py` relativises `binary.path` and `fixture` into the point; `map-bytes.sh` scrubs the checkout prefix from the run directory's JSON after teardown and **fails the point** if anything survives — a privacy control that silently no-ops is not a control.
- **Files modified:** `scripts/phase7/record-point.py`, `scripts/phase7/map-bytes.sh`
- **Verification:** `grep -rl '/Users/' .planning/phases/07-*/results` returns nothing; the gate's home-path assertion is green.
- **Committed in:** `1d93359`

**3. [Rule 3 — Blocking] `SIZE_BOUNDARY_CASES` could not be a frozen binding at `MAP_MAX_BYTES`**

- **Found during:** Task 2 (the fixture module)
- **Issue:** The plan puts the fixture module in task 2 and `MAP_MAX_BYTES` in task 3, so an eager `Object.freeze([...])` built at that constant would not typecheck until task 3 landed — a forward reference in the wrong direction, since the fixture is the more primitive thing.
- **Fix:** Shipped as `sizeBoundaryCases(ceilingBytes)`, a parametric builder, with `SIZE_BOUNDARY_CASE_IDS` still **derived from it** so the id array cannot drift from the cases. This is better than the eager form for two independent reasons stated in the module: it removes a 12 MiB import-time allocation from a module three plans read, and it lets 07-02 exercise the same boundary at a test size as well as at the real ceiling.
- **Files modified:** `packages/engine/src/sourcemap/map-fixture.ts`, `tests/corpus-maps.spec.ts`
- **Verification:** `tests/corpus-maps.spec.ts` asserts the pair is exact at 4,096, at 8,192 and at the deliberately un-round 2,752,789, and that it throws below its own skeleton length.
- **Committed in:** `827aab7`

**4. [Rule 3 — Blocking] `probe_install` resolves `backends[0]`, and the package now ships three backends**

- **Found during:** Task 1 (driver design)
- **Issue:** `scripts/spike/probe-run.sh` takes the FIRST backend from the install response. Adding `mapbytes-probe` to the shared Tier-1 package makes "the first one" ambiguous, and the plan forbids touching `probe-run.sh`.
- **Fix:** Two halves. `mapbytes-probe` is **appended**, never inserted, so `parse-probe` stays at index 0 and a re-run of `scripts/spike/ladder.sh` still resolves correctly. And `map-bytes.sh` resolves ITS backend by calling `mapbytes_info` against each installed id and keeping the one that answers — explicit and loud beats positional and silent, since a measurement recorded against the wrong backend is the repudiation class T-07-20 is about.
- **Files modified:** `caido.config.ts`, `scripts/phase7/map-bytes.sh`, `tier1/mapbytes/src/index.ts`
- **Verification:** each of the four points logs `resolved mapbytes backend: <uuid>`; `scripts/spike/probe-run.sh` and `ladder.sh` are byte-unchanged.
- **Committed in:** `1d93359`

**5. [Rule 1 — Bug] `MIN_CHARS_PER_LINE = 12.6` failed its own inequality by 8,544 bytes**

- **Found during:** Task 3
- **Issue:** The line-density witness was eyeballed at 12.6; the exact quotient is 6,291,456 / 500,000 = 12.582912, so `500_000 * 12.6 = 6,300,000` exceeds the ceiling. The assertion caught it, which is the assertion working.
- **Fix:** Witness corrected to 12.58 and the doc comment now states the figure is computed rather than eyeballed.
- **Files modified:** `packages/engine/src/thresholds.spec.ts`, `packages/engine/src/thresholds.ts`
- **Verification:** 54/54 green.
- **Committed in:** `fd2446e`

### Additional files not named in the plan's `files_modified`

Three python helpers under `scripts/phase7/` — `record-point.py`, `assemble.py`, `build-observations.py` — carry the
RSS correlation, the verdict derivation and the observation shaping. They are separate files rather than bash
heredocs following `scripts/spike/record-result.py`'s precedent (named in `instance.sh`'s own comments); the
alternative was ~250 lines of Python inside `map-bytes.sh`. `packages/engine/package.json` gained the
`./sourcemap/map-fixture` export so 07-02 and 07-03 can import it by specifier.

---

**Total deviations:** 5 auto-fixed (2 bugs, 1 missing critical, 2 blocking). **Impact:** two of the five were caught
by gates this plan wrote, which is the intended cost of writing them. No scope creep; every fix was required for
correctness, privacy or the plan to proceed.

## Threat Flags

None. The plan's `<threat_model>` covers every surface this plan touched, and T-07-SC held exactly: **this plan
installed nothing** — no `pnpm add`, no lockfile change, no new dependency.

## Known Stubs

None. Two forward dependencies are recorded rather than stubbed:

| Item | Owner | Recorded in |
|---|---|---|
| The 16-byte `lastIndexOf("sourceMappingURL")` prefilter A2's measurement now justifies | 07-02 | `thresholds.ts` `SOURCEMAP_TAIL_WINDOW_BYTES` doc comment |
| `SOURCE_LINE_MAX_GRAPHEMES` must land below 4,096 or the 4 KB label stops exercising the truncation boundary | 07-07 | `map-fixture.ts` `four-kilobyte-label` case + `tests/corpus-maps.spec.ts` assertion |
| O-04 recommended action #1: amend or strike MAP-02's unqualified parenthetical in `REQUIREMENTS.md` | unassigned | this SUMMARY's `coverage` D8 rationale |

## Issues Encountered

- **`MAP_MAX_BYTES` is not stable across runs.** Two full ladder runs produced 2,752,788 and 2,954,422 — a 7% swing.
  This is inherent to a wall-clock measurement and is handled rather than hidden: the shipped constant is rounded
  down below both, and `thresholds.spec.ts`'s tripwire is an **inequality** against the artifact (`shipped <=
  measured`) rather than an equality, so a re-run does not turn the suite red for the wrong reason.
- **The RSS sampler cannot resolve sub-50 ms operations.** At the 0.5 MB point every operation finished inside one
  sample interval and every `rss_step` is 0 or `null`. Recorded as `null` with an explicit reason rather than as
  "measured, no growth". The RSS bound is fitted only from points that produced a positive step, and it is slack by
  a factor of thirty, so nothing turns on it.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

Ready for **07-02**. It gets: `MAP_MAX_BYTES` and `SOURCEMAP_TAIL_WINDOW_BYTES` as importable constants;
`HOSTILE_MAP_CASES` / `SOURCES_LABEL_CASES` / `sizeBoundaryCases` as its MAP-05 corpus; the measured argument for
`Buffer.from(…, "base64")` over `atob`; and the `announce_scan` cost that makes the prefilter worth writing.

**One thing 07-02 should decide early:** whether to apply the A2 prefilter. It would raise `MAP_MAX_BYTES` by roughly
75% and turn a binding bound into a much less binding one — which changes how loudly UI-09 has to speak about
refused maps.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-01*

## Self-Check: PASSED

- All 12 created files present on disk (`[ -f ]` per path).
- All 3 task commits present (`git log --oneline --all | grep`): `1d93359`, `827aab7`, `fd2446e`.
- All task `<acceptance_criteria>` re-run and green, including the two manual ones: `bash scripts/phase7/fetch-maps.sh` run twice prints three `ok` lines and downloads nothing, and the structural-ceiling inequality was watched RED under a scratch `PASSIVE_MAX_BYTES` edit and green after revert.
- Plan-level `<verification>`: `pnpm test` 75 files / 3224 tests green; the probe artifact exists and Ajv-validates; `git status --porcelain corpus/` is empty; `git check-ignore -v packages/engine/src/sourcemap/map-fixture.ts` exits 1.
- `pnpm typecheck`, `pnpm lint` and `pnpm knip` all exit 0. `git diff --exit-code -- packages/engine/src/thresholds.generated.ts` exits 0.
- `tests/phase6-matrix.spec.ts` and `scripts/spike/instance.sh` are byte-unchanged: `git diff --stat` against both is empty.
