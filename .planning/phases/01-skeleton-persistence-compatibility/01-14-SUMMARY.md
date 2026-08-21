---
phase: 01-skeleton-persistence-compatibility
plan: 14
subsystem: testing
tags:
  [tracer, live-caido, sqlite, url-redaction, evidence, read-only, wal, store-03]

requires:
  - phase: 01-07
    provides: "The live tracer itself — the fixture, the two proxied requests, the raw-column read and the mutation-run format this plan widened rather than replaced"
  - phase: 01-10
    provides: "Decision P10-D1's bare-segment branch — the thing run 2 reverts to prove the new assertion can go red"
  - phase: 01-11
    provides: "redactUrlHead — the `;` path parameter and userinfo grammars this plan takes to the live tier for the first time"
  - phase: 01-13
    provides: "Sequencing only: 01-13's mutation window against the shared tree had to close before this plan opened one of its own"
provides:
  - "The live tracer widened from ONE credential grammar to four, with five per-run random values so a failure names WHICH grammar leaked"
  - "The `;` path parameter proven redacted against the DURABLE COLUMN on a live Caido — 01-11 previously had unit coverage only"
  - "A MEASURED, recorded answer to the userinfo question: it cannot be exercised through this tier, because curl lifts `user:pass@` into an Authorization header"
  - "WR-16: both sqlite3 reads open read-only through decision P8-D2's ladder, with the named-error rung that refuses to fabricate a clean-looking empty result"
  - "IN-13: the raw column asserted per row and the raw row count required to equal the RPC row count"
  - "WR-15: no version literal survives in the tracer; the resolved build is written into every run directory"
  - "Two committed live runs — one PASS, one MUTATION that FAILED naming the bare segment — plus README-01-14.md indexing what each proves and what the tier could not reach"
  - "secret-sweep.txt: a per-file measurement showing that Caido's own --debug logs carry the unredacted request URL"
affects: [phase-verification, phase-02-observability, phase-04-sec-04-hmac]

actuals:
  # chars/4 over the two durably modified files (43,333 chars), the same
  # convention 01-12 and 01-13 used. The realized diff on tracer-e2e.sh alone is
  # 32,995 chars / 4 = 8,248 across 470 changed lines.
  tokens: 10833
  tasks: 2
  commits: 6

tech-stack:
  added: []
  patterns:
    - "MEASURE reachability, then assert conditionally: an unconditional secret-absence assertion plus a separately labelled name assertion that runs only where the run shows the grammar arrived"
    - "One random value PER GRAMMAR, so a failure identifies which grammar leaked rather than only that something did"
    - "A read ladder whose failure rung ABORTS BY NAME rather than falling back to a mode that returns an empty result"
    - "Sweep the evidence directory for the values the evidence is about, and sweep it AFTER the teardown that copies the last file in"

key-files:
  created:
    - .planning/phases/01-skeleton-persistence-compatibility/results/runs/README-01-14.md
    - .planning/phases/01-skeleton-persistence-compatibility/results/runs/20260821T150022Z-16902/
    - .planning/phases/01-skeleton-persistence-compatibility/results/runs/20260821T150143Z-19295/
  modified:
    - scripts/phase1/tracer-e2e.sh

key-decisions:
  - "P14-D1: the two grammars whose live reach is not knowable from source are MEASURED and the assertion is written against the measurement — an UNCONDITIONAL secret-absence check (which holds however the URL was normalised) plus a SEPARATELY LABELLED name check that runs only where the run shows the grammar reached the plugin. A conditional secret check would be self-fulfilling; an unconditional name check would go red for a reason unrelated to redaction."
  - "P14-D2: the `;` path parameter DOES reach observations.url through Caido 0.58.0 — measured, not assumed. 01-11's redactUrlHead is now proven against the database file."
  - "P14-D3: URL userinfo CANNOT be exercised through this tier. curl lifts `user:pass@` into an `Authorization: Basic` header before the request line is built, measured from curl's own `-v` trace. Both userinfo values reading zero in the column is therefore a property of the TIER, not evidence that redactUrlHead ran — stated in those words rather than counted as a pass."
  - "P14-D4: the userinfo USERNAME is a per-run random value, not the literal `tracer`. 01-11 decided BOTH halves of the userinfo go, so the username needs a value whose absence can be asserted — and `tracer` is a substring of `defminer-tracer-fixture.js`, so a check on it would have matched the fixture NAME and proven nothing."
  - "P14-D5: Caido's own --debug logs are NOT committed, and that is now MEASURED rather than assumed. secret-sweep.txt counts four occurrences of every wire value in logging.<date>.log and caido.stdout.log. The exclusion is enforced by a pre-existing .gitignore rule; they were not force-added."
  - "P14-D6: the assertion block's parameters move to a 0600 file in the temporary fixture directory. Five live per-run values previously rode an argv, which `ps` exposes host-wide for the lifetime of the process."

patterns-established:
  - "A limit of the harness that is measured and named is evidence; the same limit unmeasured is a silence. Every grammar the live tier cannot exercise carries the measurement that established it and the unit case that enforces it instead."
  - "Mutation isolation is half the proof: the mutation run is only evidence for the NEW assertion if the OTHER grammars stay green in the same row."

requirements-completed: []

coverage:
  - id: D1
    description: "A per-run random secret pasted as a BARE `=`-less query segment is absent from `SELECT url FROM observations` read with sqlite3 from OUTSIDE Caido, on a live Caido, against the real database file"
    requirement: STORE-03
    verification:
      - kind: e2e
        ref: "scripts/phase1/tracer-e2e.sh — run 20260821T150022Z-16902, raw=0 rpc=0 for the bare-segment value; every raw row ends with &<redacted>"
        status: pass
      - kind: e2e
        ref: "scripts/phase1/tracer-e2e.sh — run 20260821T150143Z-19295, the same assertion RED with the pre-01-10 branch restored"
        status: pass
    human_judgment: false
  - id: D2
    description: "A per-run random secret carried as a `;`-delimited path parameter gets the same treatment, and whether it reaches the plugin at all is a measured fact"
    requirement: STORE-03
    verification:
      - kind: e2e
        ref: "scripts/phase1/tracer-e2e.sh — run 20260821T150022Z-16902, pathparam_reached=yes in grammar-reachability.txt; ;jsessionid=<redacted> asserted in every raw row"
        status: pass
    human_judgment: false
  - id: D3
    description: "Whether URL userinfo can be exercised through this live tier is MEASURED once and recorded, rather than assumed in either direction"
    requirement: STORE-03
    verification:
      - kind: e2e
        ref: "scripts/phase1/tracer-e2e.sh — userinfo-measurement.txt, userinfo_in_request_line=no / userinfo_sent_as_authorization_header=yes, derived from curl's own -v request-line trace"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#USERINFO does not reach the column either, nor does a `;` parameter value (WR-11)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The raw-column assertion is as strong as the per-row one: the redaction marker is asserted present in the raw text and the raw row count equals the number of rows the RPC returned"
    requirement: STORE-03
    verification:
      - kind: e2e
        ref: "scripts/phase1/tracer-e2e.sh — 'raw rows == rpc rows : 2 == 2'; marker and both parameter names asserted per raw row"
        status: pass
      - kind: e2e
        ref: "offline dry-run scenario 'rowcount' — 3 raw rows against 2 RPC rows exits 1"
        status: pass
    human_judgment: false
  - id: D5
    description: "The tracer opens the live plugin database READ-ONLY while Caido holds it, and refuses to fall back to a mode that can report an empty result"
    requirement: STORE-03
    verification:
      - kind: e2e
        ref: "scripts/phase1/tracer-e2e.sh — db-read-mode.txt, read_mode=readonly with a 168,952-byte -wal live at read time"
        status: pass
    human_judgment: false
  - id: D6
    description: "The script's header names no Caido build, and the RESOLVED version is written into the run directory beside status.json"
    requirement: STORE-03
    verification:
      - kind: command
        ref: "grep -c '0\\.57\\.1' scripts/phase1/tracer-e2e.sh -> 0"
        status: pass
      - kind: e2e
        ref: "caido-version.txt in both run directories: caido_version=0.58.0"
        status: pass
    human_judgment: false
  - id: D7
    description: "The three deliberate version pins are unchanged — they are a loud-failure net, not drift"
    requirement: STORE-03
    verification:
      - kind: command
        ref: "git diff --exit-code tests/phase1-load.spec.ts tests/phase1-runtime.spec.ts packages/backend/src/compat.ts -> exit 0"
        status: pass
    human_judgment: false

duration: 18 min
completed: 2026-08-21
status: complete
---

# Phase 01 Plan 14: Live Tracer Widening Summary

The Phase 1 tracer now proves every URL grammar this phase claims to redact against a real
SQLite file on a live Caido — four grammars instead of one, read read-only through decision
P8-D2's ladder, with a committed mutation run that goes red naming the bare segment.

**Duration:** 18 min · **Tasks:** 2 · **Commits:** 6 · **Files:** 26

---

## The evidence, as terminal output

### Run 1 — `20260821T150022Z-16902`, PASSED

```
db read mode: readonly (14 objects in sqlite_master)
raw url rows: 2

raw rows == rpc rows   : 2 == 2
stored url (raw column): http://127.0.0.1:8972/defminer-tracer-fixture.js;jsessionid=<redacted>?v=<redacted>&access_token=<redacted>&<redacted>

per-grammar secret occurrences (raw column / RPC json):
  name=value query pair (01-07)                  raw=0 rpc=0
  bare `=`-less query segment (01-10, P10-D1)    raw=0 rpc=0
  `;` path parameter (01-11, redactUrlHead)      raw=0 rpc=0
  userinfo PASSWORD half (01-11)                 raw=0 rpc=0
  userinfo USERNAME half (01-11)                 raw=0 rpc=0

  measured: `;` path parameter: REACHED the plugin; asserted as ;jsessionid=<redacted> in every raw row
  measured: URL userinfo: DID NOT REACH the plugin — curl put userinfo in the request line: no; sent it as an Authorization: Basic header: yes.

TRACER PASSED
secret sweep : 2 file(s) in the run directory carry a per-run value, over 6 (grammar, file) pair(s)
```

That URL is the load-bearing artifact. It is `sqlite3 -readonly … "SELECT url FROM
observations"`, read from **outside** Caido, and it is the only thing that distinguishes a
write-path redaction from a read-path one.

**The resolved Caido version**, from `20260821T150022Z-16902/caido-version.txt`:

```
caido_version=0.58.0
expected_version=0.58.0
caido_bin=/Applications/Caido.app/Contents/Resources/bin/caido-cli
```

### Run 2 — `20260821T150143Z-19295`, the MUTATION, FAILED

`redactDelimitedSegment`'s `eq === -1` branch reverted to its pre-01-10 form
(`segment.slice(0, QUERY_NAME_MAX)`, taken from commit `2458713`'s own diff rather than
guessed), rebuilt, re-run. Exit code 1:

```
TRACER FAILED:
  - [bare `=`-less query segment (01-10, P10-D1)] the per-run secret occurs 2 time(s) in SELECT url FROM observations, read with sqlite3 from OUTSIDE Caido — the DURABLE column is dirty
  - [bare `=`-less query segment (01-10, P10-D1)] the per-run secret occurs 2 time(s) in observations.json (the RPC projection)
  - [bare `=`-less query segment (01-10, P10-D1)] observation row 0 still carries the per-run secret: 'http://127.0.0.1:8972/defminer-tracer-fixture.js;jsessionid=<redacted>?v=<redacted>&access_token=<redacted>&1d984bbcfeb14c2d3a26ab9c8c20560e'
  - [bare `=`-less query segment (01-10, P10-D1)] observation row 1 still carries the per-run secret: '…&1d984bbcfeb14c2d3a26ab9c8c20560e'
  - raw column row 0 does not END with &<redacted> — the BARE (`=`-less) query segment did not reach the column redacted, which is decision P10-D1: '…'
  - raw column row 1 does not END with &<redacted> — …
```

Six failures, every one naming the bare-segment grammar. **That the `;` parameter,
`access_token` and `v` are all still `<redacted>` in the same dirty row is half the proof** —
a mutation that turned everything red would show the tracer can fail without showing that the
new assertion is what failed.

### The restore

```
$ git checkout -- packages/backend/src/store/observations.ts
$ git diff --exit-code packages/backend/src/store/observations.ts
RESTORE: git diff --exit-code CLEAN (exit 0)
$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

### The zero-hit grep over run 1's committed artifacts

Each of the three wire values recovered from the (uncommitted) Caido log and grepped with
`grep -F` across every file this plan commits for run 1:

```
  grep -F '<query-pair value>'   over the 11 committed files -> 0
  grep -F '<bare-segment value>' over the 11 committed files -> 0
  grep -F '<path-param value>'   over the 11 committed files -> 0
```

### The restored baseline

```
 Test Files  31 passed (31)
      Tests  931 passed (931)

pnpm typecheck  -> exit 0
pnpm lint       -> exit 0
pnpm knip       -> exit 0
packages/backend/dist/index.js: 1 import specifier(s): crypto
git status --porcelain packages/   -> (empty)
git diff --exit-code tests/phase1-load.spec.ts tests/phase1-runtime.spec.ts packages/backend/src/compat.ts -> exit 0
```

---

## What this plan changed

**Task 1 (`59c9c67`, `6d32e01`, `0c651c5`) — the harness.**

- `FIXTURE_URL` carries four credential-bearing grammars in one request, so the artifact
  assertions (exactly one artifact row, `seen_count` 2, exactly two observations) survive
  intact. Five per-run `openssl rand -hex` values — one per grammar plus the userinfo
  username — so a failure names which grammar leaked.
- **WR-16.** Both `sqlite3` invocations open read-only through P8-D2's ladder: WAL-aware
  `-readonly` first; `immutable=1` only where no non-empty `-wal` exists; and where a
  read-only open fails beside a live `-wal`, a **named FATAL, never a fallback**. 01-08
  measured that an immutable read of a WAL database reports no tables at all. Here that would
  produce an empty `SELECT url` dump in which every secret is trivially absent — a pass for
  the wrong reason. Both live runs took rung 1 with a 168,952-byte `-wal` open.
- **IN-13.** The raw column is now asserted per row: marker present, `v=<redacted>` and
  `access_token=<redacted>` present, the row ending in `&<redacted>` (P10-D1 against the
  file), and `len(raw_rows) == len(obs)`.
- **WR-15.** No version literal survives anywhere in the script (`grep -c` returns 0), and the
  resolved build is written into every run directory.
- Assertion parameters moved to a `0600` file in the temporary fixture directory.

**Task 2 (`ce6d87e`, `0dceed8`, `cce34e4`) — the runs.** Both committed, plus
`README-01-14.md` indexing them.

---

## Deviations from Plan

### 1. [Rule 1 — Bug, inherited work] The inherited header still spelled the superseded version literal twice

**Found during:** Task 1, checking the acceptance criterion.

**Issue:** The previous executor's WR-15 rewrite replaced the header's version *claim* with a
citation of `$P1_EXPECT_VERSION` — correct in spirit — but then explained itself using the
superseded literal twice ("It used to read …", "The three deliberate 0.57.1 pins …"). The
acceptance criterion is mechanical: `grep -c` must return 0. It returned 2.

**Fix:** Rewrote the explanation to name the files and the decision without spelling either
build. `env.sh`'s P7-D5 block carries both numbers and the full reasoning; the tracer points
there.

**Commit:** `59c9c67`

### 2. [Rule 1 — Bug] The secret sweep ran before the teardown that copies in the file it exists to find

**Found during:** Task 2, first live run.

**Issue:** I added a sweep counting every per-run value per file across the run directory. It
reported `logging.<date>.log` as clean. A manual grep of the same directory found **four**
occurrences of each wire value in that file. The sweep ran at the end of the script body;
`instance.sh`'s `teardown` — which copies Caido's host log in — runs afterwards in the EXIT
trap. The instrument built to prevent a confident zero produced one.

**Fix:** The sweep moved into `cleanup()`, after `teardown`, guarded on `RUN_DIR` existing.
The corrected sweep reports 2 files / 6 pairs.

**Commit:** `0c651c5`. Both pre-fix runs were discarded and run 1 was re-run, so both
committed runs come from an identical script.

### 3. [Rule 1 — Bug] The sweep's summary line counted pairs and called them files

**Found during:** Task 2. Printed "3 file(s)" for three (grammar, file) pairs naming one file.

**Fix:** Count distinct files, and report the pair count separately. **Commit:** `6d32e01`

### 4. [Rule 3 — Blocker] The origin log cannot be committed

**Issue:** The plan's action asks for the origin log in run 1's committed set.
`.gitignore:35` (`results/runs/*/*.log`) excludes it. Committing it needs `git add -f`.

**Resolution:** Not force-added. The rule is pre-existing and it is the same rule that keeps
Caido's debug logs out — which `secret-sweep.txt` now shows is load-bearing, not incidental.
Plan 01-07's committed run has no origin log either, for the same reason. Recorded in
`README-01-14.md`.

**Total deviations:** 3 auto-fixed bugs (2 in my own new code, 1 in inherited work) and 1
blocker resolved by respecting an existing repository rule. **Impact:** none on the plan's
claims; deviations 2 and 3 were caught before either committed run was produced.

---

## Inherited work — reviewed, not authored

This plan survived an executor restart. A previous executor left
`scripts/phase1/tracer-e2e.sh` modified and **uncommitted** (106 insertions, 13 deletions),
having run nothing. I read the whole diff and treated it as an unreviewed pull request.

**Kept, after verifying each claim myself:**

| Inherited part | How I verified it |
|---|---|
| WR-15 header rewrite | Kept the approach; **fixed** its two literal occurrences (deviation 1) |
| `caido-version.txt` written after both `source`s | Confirmed `RUN_DIR` is set by `instance.sh`'s auto-running `_spike_up`, so the write is valid at that point |
| Four grammars wired into `FIXTURE_URL` | Confirmed the origin still answers 200 by executing `urllib.parse.urlparse` on the exact fixture path — `.path` resolves to the fixture, the `;` parameter lands in `.params` |
| curl-trace userinfo measurement | Confirmed it measures the request line rather than assuming, and **wrote the assertions against the measurement** — that half did not exist |
| Distinct secret per grammar | Kept, and extended: the userinfo **username** became random too (P14-D4) |

**Changed:** the username literal, the header's two literals, and the masked echo. **Not
inherited at all:** WR-16, the entire widened assertion block, IN-13, the sweep, the
reachability artifact and both runs — the previous executor stopped at the point of starting
WR-16.

---

## What this phase's evidence does NOT prove — read this before closing the phase

The plan asked me to say explicitly where a claim made across 01-10 … 01-13 is not in fact
proven end to end by this run. Three items:

1. **URL userinfo redaction is NOT proven at the live tier, and cannot be.** 01-11 provides
   "URL userinfo … redacted before `observations.url` is written". Measured here: curl lifts
   `user:pass@` into an `Authorization: Basic` header, so userinfo never reaches the plugin
   through this tier. Both userinfo values read zero in run 1's column **because they never
   arrived**, not because `redactUrlHead` redacted them. The grammar is enforced by
   `observations.spec.ts`'s real-SQLite round trip. This is a measured limit, recorded with
   the measurement — not a silence — but it is not live-tier proof.

2. **The path-embedded token residual is untouched and remains open.** 01-11 pins it with a
   spec case. This run does not exercise it and does not close it.

3. **The 01-11 space-in-path residual is untouched.** A filesystem path containing a space
   loses only the portion before the space in `describeError`. Recorded in `WINDOWS.md`; no
   assertion here depends on it, and none was written that could.

Newly **closed** by this run, and worth stating as clearly: the `;` path parameter grammar,
which had unit coverage only, is now proven against the durable column on a live Caido.

---

## Requirements ledger — what actually happened

The dispatch expected `requirements mark-complete` to finally flip STORE-03 and STORE-07.
**It flipped nothing, and both were already complete.** Run verbatim:

```json
{ "updated": false, "marked_complete": [], "already_complete": ["STORE-03"], "total": 1 }
```

`REQUIREMENTS.md` is byte-identical after the call. STORE-03 was marked by plan 01-10 and
re-affirmed by 01-11; STORE-07 was marked by 01-11 and is **not declared by this plan at
all** (`requirements: [STORE-03]`). The shared-ID gate was never blocking them.

Both ids remain recorded as **ledger collisions, deferred with an owner** — STORE-03's text
is about content addressing, STORE-07's about SQL parameter binding, and neither says
anything about redaction. That deferral is deliberate and is not touched here.

---

## Authentication Gates

None.

## Known Stubs

None.

## Issues Encountered

**`state update-progress` withheld the progress percent again** —
`progress percent withheld by buildStateFrontmatter`, now on six consecutive plans
(01-07 … 01-11, and this one). Steady handler behaviour on this repo, not a transient. The
phase-local figure in STATE.md was updated by hand from the 14 PLAN / 14 SUMMARY files on
disk, with its basis stated, exactly as the preceding plans did.

**A correction to the dispatch brief:** it stated no other `caido-cli` was running besides
the SPIKE-10 recorder on 8998. There are two — pid 79273 (the recorder) and pid **67692**,
the operator's live Caido desktop instance on port **8080**. Neither is mine, neither was
touched, and neither collides: this plan used 8971/8972 and `instance.sh` refuses 8080
unconditionally. Both ports were confirmed free before the runs and after.

## Threat Flags

None. No new network endpoint, auth path or schema change. The one new file-access pattern is
a **read-only** `sqlite3` open of a database inside a temporary, isolated `--data-path`
instance, performed by a script that no shipped code calls.

## Next Phase Readiness

Plan 14 of 14. The phase's plans are complete and its green baseline is restored and
recorded. Ready for code review, the regression gate and phase verification.

---

## Self-Check: PASSED

- `01-14-SUMMARY.md`, `README-01-14.md`, both run directories' `observations-url-raw.txt`
  and `scripts/phase1/tracer-e2e.sh` all present on disk.
- All seven commits (`59c9c67`, `6d32e01`, `0c651c5`, `ce6d87e`, `0dceed8`, `cce34e4`,
  and this metadata commit) verified in `git log`.
- 12 tracked evidence files in each run directory.
- Plan-level `<verification>` re-run after the restore: 31 files / 931 tests, typecheck /
  lint / knip exit 0, bundle at one specifier `crypto`, `git status --porcelain packages/`
  empty, the three deliberate version pins `git diff --exit-code` clean.
- Working tree carries only the dirt that predates this plan (`config.json`, `.gsd/`,
  `milestone.lock`, a Phase 0 verification file and two untracked run directories). Nothing
  under `packages/` and nothing produced by this plan is left uncommitted.
- The live-tier userinfo coverage gap is recorded in `.planning/WINDOWS.md` so it is visible
  at ship time rather than only in this file.
