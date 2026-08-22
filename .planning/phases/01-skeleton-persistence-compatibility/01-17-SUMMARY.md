---
phase: 01-skeleton-persistence-compatibility
plan: 17
subsystem: testing
tags: [tracer, live-e2e, sqlite, redaction, base64-padding, store-03, cr-07, wr-21]

requires:
  - phase: 01-15
    provides: the redactDelimitedSegment padding branch this plan's live tier must be able to fail on, and the paddingStrippedCore derivation the shell mirrors
  - phase: 01-16
    provides: the gate widenings that had to be landed and green before spending a live Caido launch cycle
  - phase: 01-14
    provides: the read-only sqlite3 ladder, the resolved-version file, the raw-rows-equal-rpc-rows assertion and the run-index format, all carried forward unchanged
provides:
  - two per-run `openssl rand -base64` dyes in the live tracer, one per sub-branch of the CR-07 padding rule
  - absence asserted on the PADDING-STRIPPED CORE as well as the padded literal, in the assertions and in the secret sweep
  - a stored-tail assertion by segment INDEX, naming which sub-branch produced the wrong shape
  - a secret sweep that counts occurrences rather than lines
  - the no-version-literal gate the tracer's header has claimed since round 2, observed failing twice
  - the QUERY ENFORCED live-proof sentence closed per grammar against a committed run
affects: [phase-02-STORE, phase-04-SEC-04, phase-08-ACTIVE]

actuals:
  tokens: 20704
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A live dye is asserted under every spelling that is RECOVERABLE, not only the one it was generated as"
    - "A gate whose subject is evidence PROSE scans comments deliberately, and says so in its own comment so the next author does not 'fix' it"
    - "A transport-fidelity precondition is asserted before a zero is reported: if the dye did not leave the host intact, the run dies rather than reporting an absence it did not earn"

key-files:
  created:
    - .planning/phases/01-skeleton-persistence-compatibility/results/runs/README-01-17.md
    - .planning/phases/01-skeleton-persistence-compatibility/results/runs/20260822T094728Z-11865/
    - .planning/phases/01-skeleton-persistence-compatibility/results/runs/20260822T094959Z-31622/
  modified:
    - scripts/phase1/tracer-e2e.sh
    - tests/pins.spec.ts
    - packages/backend/src/store/schema.spec.ts

key-decisions:
  - "The padded dyes are asserted under BOTH their padded literal and their padding-stripped core, and run 2 proved that is not belt-and-braces: the TWO-pad literal reports ZERO hits against a column that holds the credential"
  - "TWO dyes, not one — 16 raw bytes gives TWO `=` (value half a lone `=`), 32 gives ONE (value half EMPTY); a single dye proves half the predicate while reading as if it proved all of it"
  - "The stored tail is asserted by SEGMENT INDEX, not by `endswith`: appending the padded pair moved the bare segment from last to third-from-last, and an `endswith` left in place would have gone on passing while checking a different segment"
  - "The WR-21 gate scans the tracer's comments deliberately — the rule is about evidence prose, so the usual comment-stripping hygiene would scan past the only place the bug can live"
  - "A version literal is defined as a dotted-numeric run of EXACTLY THREE components, not as one superseded number: pinning the scan to `0.57.1` would go quiet the day somebody pastes the current build in, which is how the rule broke the first time"
  - "The tracer aborts if a padded dye did not reach the request line byte-for-byte — an absence caused by the transport is not evidence about the redactor"
  - "`scripts/phase1/env.sh`'s usage example was CONFIRMED ACCURATE and left unchanged; the override was executed and observed taking effect"

patterns-established:
  - "Padding-stripped-core absence: every live assertion and every sweep entry carries the recoverable spelling, derived in shell by the same loop the unit tier uses in TypeScript"
  - "Two-channel reachability: a grammar is 'reached' only when curl's own request-line trace shows it left the host AND the stored value shows the segment arrived"
  - "A negative measurement result (the corrected counter agreeing with the broken one) is recorded rather than dropped"

requirements-completed: [STORE-03]

coverage:
  - id: D1
    description: "A padded credential proxied through a real Caido is absent from observations.url under BOTH its padded literal and its padding-stripped core, on both sub-branches of the CR-07 rule, read with sqlite3 from OUTSIDE Caido"
    requirement: "STORE-03"
    verification:
      - kind: e2e
        ref: "scripts/phase1/tracer-e2e.sh (live run 20260822T094728Z-11865) — 9 values, raw=0 rpc=0"
        status: pass
    human_judgment: false
  - id: D2
    description: "The new padded-segment assertions can go RED against the real database file, isolated to the branch under test"
    requirement: "STORE-03"
    verification:
      - kind: e2e
        ref: "scripts/phase1/tracer-e2e.sh (mutation run 20260822T094959Z-31622) — 18 failures, all naming a padded sub-branch or its core; nothing unrelated fired"
        status: pass
    human_judgment: false
  - id: D3
    description: "The tracer's header claim that a gate enforces the no-version-literal rule is TRUE — the gate exists, runs inside `pnpm test`, reads the script's comments, and fails when a literal is planted or when its own scan goes vacuous"
    verification:
      - kind: unit
        ref: "tests/pins.spec.ts#names no Caido version literal anywhere, COMMENTS INCLUDED"
        status: pass
      - kind: unit
        ref: "tests/pins.spec.ts#is scanning the real script, and the script still cites the variable"
        status: pass
    human_judgment: false
  - id: D4
    description: "secret-sweep.txt reports what its instrument measures — occurrences, not lines"
    verification:
      - kind: e2e
        ref: "scripts/phase1/tracer-e2e.sh secret_sweep (grep -o -F | wc -l), measured on run 20260822T094728Z-11865"
        status: pass
    human_judgment: false
  - id: D5
    description: "The committed run evidence carries no dye and no padding-stripped core"
    requirement: "STORE-03"
    verification:
      - kind: other
        ref: "grep -a -c -F over 7 recovered values x 12 committed files = 0 hits; plus the in-run secret_sweep over all 9 values naming only gitignored .log files"
        status: pass
    human_judgment: false
  - id: D6
    description: "The QUERY ENFORCED live-proof sentence plan 01-15 left transitional is retired per grammar, citing a run index that resolves"
    verification:
      - kind: other
        ref: "cited path == committed path (.planning/phases/01-skeleton-persistence-compatibility/results/runs/README-01-17.md), 9 padded-grammar rows present"
        status: pass
    human_judgment: false

duration: 19 min
completed: 2026-08-22
status: complete
---

# Phase 01 Plan 17: Live Padded-Credential Proof and the WR-21 Gate Summary

**Two per-run base64 dyes carry a padded credential through a real Caido into the real SQLite file on both sub-branches of the CR-07 rule, asserted absent under the padding-stripped core rather than the padded literal — and a committed mutation run shows exactly why that distinction was load-bearing, plus the no-version-literal gate the tracer's header had claimed for two rounds with nothing behind it.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-08-22T09:33Z
- **Completed:** 2026-08-22T09:52Z
- **Tasks:** 2
- **Files modified:** 3 modified, 25 created (2 run directories + 1 index)

## Accomplishments

- The live tier can now fail on CR-07. It could not before: all five tracer dyes came from `openssl rand -hex`, hex carries no `=`, and no live run had ever exercised a padded segment.
- Both sub-branches are exercised, separately and by name — `openssl rand -base64 16` (TWO `=`, value half a lone `=`) and `openssl rand -base64 32` (ONE `=`, value half EMPTY).
- Every absence assertion and every sweep entry carries the PADDING-STRIPPED CORE. Run 2 proved this was not redundancy: **the padded literal reports zero hits against a column that holds the credential.**
- WR-21 closed: `tests/pins.spec.ts` now performs the check the tracer's header has claimed since round 2, observed RED twice.
- The sweep counts occurrences rather than lines.

## Task Commits

1. **Task 1: dye, assertions, instrument, gate** — `ce5f3a5` (feat)
2. **Task 2: run it live, one pass and one deliberate failure** — `53529f1` (test)

## Files Created/Modified

- `scripts/phase1/tracer-e2e.sh` — two padded dyes, core derivation, index-based stored-tail assertions, wire-fidelity abort, corrected occurrence counter, header claim now naming a real gate
- `tests/pins.spec.ts` — the WR-21 no-version-literal gate, non-vacuity first
- `packages/backend/src/store/schema.spec.ts` — QUERY ENFORCED live-proof sentence retired per grammar (one contiguous hunk, `analyses.error` untouched)
- `results/runs/README-01-17.md` — the run index
- `results/runs/20260822T094728Z-11865/` — the PASS
- `results/runs/20260822T094959Z-31622/` — the deliberate FAILURE

---

## THE TWO MUTATION PROOFS FOR THE NEW `tests/pins.spec.ts` GATE

### Proof 1 — a planted version literal drives it RED

Planted (a COMMENT line, deliberately — the rule is about prose):

```
892:# MUTATION PROOF (plan 01-17): this comment names Caido 0.57.1 deliberately.
```

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/pins.spec.ts > WR-21 — the tracer's own no-version-literal rule is ENFORCED, not merely claimed > names no Caido version literal anywhere, COMMENTS INCLUDED
AssertionError: scripts/phase1/tracer-e2e.sh names version literal(s) 0.57.1. Its header states that a literal in that file is a bug: decision P7-D5 moved `P1_EXPECT_VERSION` once and the prose did not follow, so a reader found one build in the comment and another in the environment and every number in the artifact became unciteable. Cite `P1_EXPECT_VERSION` instead — the RESOLVED value is written into every run directory as `caido-version.txt`, so the evidence carries the build rather than a comment claiming it.: expected [ '0.57.1' ] to deeply equal []

 Test Files  1 failed (1)
      Tests  1 failed | 33 passed (34)
```

### Proof 2 — removing the non-vacuity marker ALSO drives it red

Isolated: `sed 's/P1_EXPECT_VERSION/P1_XXXXXX_VERSION/g'`, **no planted literal** (`planted version literals: 0`).

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/pins.spec.ts > WR-21 — the tracer's own no-version-literal rule is ENFORCED, not merely claimed > is scanning the real script, and the script still cites the variable
AssertionError: scripts/phase1/tracer-e2e.sh no longer mentions `P1_EXPECT_VERSION`. Either the script moved (update TRACER here) or its version handling was rewritten — the scan below cannot be trusted until one of those is resolved.: expected false to be true // Object.is equality

 Test Files  1 failed (1)
      Tests  1 failed | 33 passed (34)
```

**Read the two together.** In proof 2 the literal scan stayed GREEN — because with no literal planted it had nothing to find. That is precisely the vacuous pass the non-vacuity assertion exists to catch: without it, a renamed or moved script would report clean forever.

### Restored, green, clean

```
 Test Files  1 passed (1)
      Tests  34 passed (34)

=== bash -n / shellcheck after restore ===
bash -n OK
shellcheck OK (0 findings, same as pre-change baseline)
```

`shellcheck` reported **0 findings both before and after** the change.

---

## THE OBSERVED PADDING COUNT OF EACH NEW DYE

From run 1's first stdout line and its `grammar-reachability.txt`:

```
padded dyes : TWO-pad '=' x2 (core 22B), ONE-pad '=' x1 (core 43B)

pad_two_padding_bytes=2
pad_one_padding_bytes=1
```

Two and one respectively, as the plan required. The preflight refuses any other count — a dye with no padding would take the `=`-less branch and prove nothing.

---

## RUN 1 — THE PASS, AND THE ACTUAL STORED URL

```
TRACER PASSED
```

The value read out of the file with `sqlite3 -readonly` from OUTSIDE Caido (`observations-url-raw.txt`, both rows identical):

```
http://127.0.0.1:8972/defminer-tracer-fixture.js;jsessionid=<redacted>?v=<redacted>&access_token=<redacted>&<redacted>&<redacted>&<redacted>
```

Six markers, not four. The last two are the padded pair, each asserted BY INDEX to be exactly `<redacted>`.

```
host-computed digest   : cec8f86026513c30a2c5068010eb8bde477050101bb30257f88d7c6bdfdf6d44
digest read back from  : cec8f86026513c30a2c5068010eb8bde477050101bb30257f88d7c6bdfdf6d44
EQUAL                  : True
artifact rows          : 1 seen_count 2
observation rows       : 2 distinct request ids 2
raw rows == rpc rows   : 2 == 2
db read mode           : readonly

per-grammar secret occurrences (raw column / RPC json):
  name=value query pair (01-07)                  raw=0 rpc=0
  bare `=`-less query segment (01-10, P10-D1)    raw=0 rpc=0
  `;` path parameter (01-11, redactUrlHead)      raw=0 rpc=0
  userinfo PASSWORD half (01-11)                 raw=0 rpc=0
  userinfo USERNAME half (01-11)                 raw=0 rpc=0
  padded bare segment, TWO `=` — value half is a lone `=` (01-17) raw=0 rpc=0
  padded bare segment, TWO `=` — value half is a lone `=` (01-17) [PADDING-STRIPPED CORE] raw=0 rpc=0
  padded bare segment, ONE `=` — value half is EMPTY (01-17) raw=0 rpc=0
  padded bare segment, ONE `=` — value half is EMPTY (01-17) [PADDING-STRIPPED CORE] raw=0 rpc=0
```

---

## THE ZERO-HIT SWEEP OVER RUN 1'S COMMITTED DIRECTORY

Two independent sweeps, both zero.

**Sweep 1, in-run.** `secret_sweep` held all nine values in scope and greps every file in the run directory. It prints only non-zero rows, and its output names exactly two files — both `.log`, both excluded by `.gitignore:35`:

```
query-pair logging.2026-08-22.log 4        query-pair caido.stdout.log 4
bare-segment logging.2026-08-22.log 4      bare-segment caido.stdout.log 4
path-param logging.2026-08-22.log 4        path-param caido.stdout.log 4
pad-two-literal logging.2026-08-22.log 4   pad-two-literal caido.stdout.log 4
pad-two-CORE logging.2026-08-22.log 4      pad-two-CORE caido.stdout.log 4
pad-one-literal logging.2026-08-22.log 4   pad-one-literal caido.stdout.log 4
pad-one-CORE logging.2026-08-22.log 4      pad-one-CORE caido.stdout.log 4
```

No committed file appears. `userinfo-user` and `userinfo-pass` appear nowhere at all — they never entered the request line (`userinfo_reached=no`).

**Sweep 2, post-hoc and independent.** The seven URL-borne values recovered back out of run 1's gitignored host log, then grepped against the 12 committed files:

```
recovered 7 per-run value(s) from run 1's GITIGNORED host log
  path-param         length=32  padding=0
  query-pair         length=32  padding=0
  bare-segment       length=32  padding=0
  pad-two-literal    length=24  padding=2
  pad-one-literal    length=44  padding=1
  pad-two-CORE       length=22  padding=0
  pad-one-CORE       length=43  padding=0

COMMAND (per value V, per committed file F):  grep -a -c -F -- "$V" "$F"
committed files: 12

TOTAL HITS ACROSS 7 VALUES x 12 COMMITTED FILES: 0
EXPECTED: 0
```

---

## RUN 2 — THE DELIBERATE MUTATION

### The diff, proving only the padding branch was reverted

```diff
@@ -180,22 +180,6 @@ function redactDelimitedSegment(segment: string): string {
   const eq = segment.indexOf("=");
   if (eq === -1) return segment === "" ? "" : QUERY_VALUE_REDACTION;
 
-  // WAS THAT `=` A SEPARATOR OR WAS IT PADDING? The VALUE half answers it, and
-  // nothing else can. Walk it: if it is EMPTY, or if every byte in it is `=`,
-  // the segment was never a `name=value` pair — it is one opaque token that
-  // happens to end in base64 padding, and the whole segment goes.
-  //
-  // A plain character loop, never a pattern: `REDOS_RECOVERY` is "kill" on this
-  // runtime and the shipped bundle's entire import set is one specifier.
-  let valueIsOnlyPadding = true;
-  for (let i = eq + 1; i < segment.length; i += 1) {
-    if (segment[i] !== "=") {
-      valueIsOnlyPadding = false;
-      break;
-    }
-  }
-  if (valueIsOnlyPadding) return QUERY_VALUE_REDACTION;
-
   return (
     segment.slice(0, eq).slice(0, QUERY_NAME_MAX) + "=" + QUERY_VALUE_REDACTION
   );
```

One hunk. The `=`-less branch, the `;` loop and `redactUrlHead` are untouched.

### What the column held

```
http://127.0.0.1:8972/defminer-tracer-fixture.js;jsessionid=<redacted>?v=<redacted>&access_token=<redacted>&<redacted>&9xUbJAATIR5fA3NpO+WUHA=<redacted>&Hf0sCN7lYIrnsKODDtzkUOZDO1/mumKR1nqAH0duYwU=<redacted>
```

Re-pad `9xUbJAATIR5fA3NpO+WUHA=` with one `=` and `base64 -d` returns the 16 raw bytes.

### The FAILED block, verbatim (row-1 duplicates elided; the committed `tracer-stderr.txt` carries all 18)

```
TRACER FAILED:
  - [padded bare segment, TWO `=` — value half is a lone `=` (01-17) [PADDING-STRIPPED CORE]] the per-run secret occurs 2 time(s) in SELECT url FROM observations, read with sqlite3 from OUTSIDE Caido — the DURABLE column is dirty
  - [padded bare segment, TWO `=` — value half is a lone `=` (01-17) [PADDING-STRIPPED CORE]] the per-run secret occurs 2 time(s) in observations.json (the RPC projection)
  - [padded bare segment, TWO `=` — value half is a lone `=` (01-17) [PADDING-STRIPPED CORE]] observation row 0 still carries the per-run secret: '…&9xUbJAATIR5fA3NpO+WUHA=<redacted>&Hf0sCN7lYIrnsKODDtzkUOZDO1/mumKR1nqAH0duYwU=<redacted>'
  - [padded bare segment, ONE `=` — value half is EMPTY (01-17)] the per-run secret occurs 2 time(s) in SELECT url FROM observations, read with sqlite3 from OUTSIDE Caido — the DURABLE column is dirty
  - [padded bare segment, ONE `=` — value half is EMPTY (01-17)] the per-run secret occurs 2 time(s) in observations.json (the RPC projection)
  - [padded bare segment, ONE `=` — value half is EMPTY (01-17)] observation row 0 still carries the per-run secret: '…'
  - [padded bare segment, ONE `=` — value half is EMPTY (01-17) [PADDING-STRIPPED CORE]] the per-run secret occurs 2 time(s) in SELECT url FROM observations, read with sqlite3 from OUTSIDE Caido — the DURABLE column is dirty
  - [padded bare segment, ONE `=` — value half is EMPTY (01-17) [PADDING-STRIPPED CORE]] the per-run secret occurs 2 time(s) in observations.json (the RPC projection)
  - [padded bare segment, ONE `=` — value half is EMPTY (01-17) [PADDING-STRIPPED CORE]] observation row 0 still carries the per-run secret: '…'
  - raw column row 0: query segment -2 reads '9xUbJAATIR5fA3NpO+WUHA=<redacted>', not <redacted> — SUB-BRANCH 'value half is a lone `=`' (the TWO-pad dye) did not reach the column redacted WHOLE. Against the defect this reads as the padding-stripped core, an `=`, and the marker, from which one re-pad and one `base64 -d` returns the credential: '…'
  - raw column row 0: query segment -1 reads 'Hf0sCN7lYIrnsKODDtzkUOZDO1/mumKR1nqAH0duYwU=<redacted>', not <redacted> — SUB-BRANCH 'value half is EMPTY' (the ONE-pad dye) did not reach the column redacted WHOLE: '…'
  - raw column row 0 does not END with &<redacted> — the LAST query segment, which is the ONE-pad dye since plan 01-17, did not reach the column redacted: '…'
  - [… the same six, for raw column row 1 …]
```

**Both stored-tail assertions fired (segment -2 and segment -1, one per sub-branch, each naming which). Both cores fired.** Required set complete.

### No unrelated assertion fired

`v=<redacted>`, `access_token=<redacted>`, `;jsessionid=<redacted>` and the bare hex segment `&<redacted>` are all still redacted in the dirty row. The query-pair, path-param and userinfo grammars stayed at `raw=0 rpc=0`, the segment-count non-vacuity check passed, `raw rows == rpc rows` passed, and the digest / `seen_count` / artifact-shape assertions passed. The revert isolated exactly one branch and exactly one branch went red. **The run was not redone.**

### THE RESULT THIS PLAN EXISTS FOR

From run 2's `secret-sweep.txt`:

```
pad-two-literal  logging.2026-08-22.log     4
pad-two-literal  caido.stdout.log           4
pad-two-CORE     observations-url-raw.txt   2      <-- the column is dirty
pad-two-CORE     observations.json          2
```

**`pad-two-literal` does not appear against `observations-url-raw.txt` at all — zero hits, on a run where a whole credential is sitting in that file.** The stored value is the dye minus one byte of padding, so the padded literal is not a substring of it. A tracer that asserted only the padded spelling — the obvious way to write it — would have PASSED this run and reported a clean column.

The ONE-pad dye behaves differently: its stored form is `<core>=<redacted>` and the padded literal `<core>=` is a prefix, so the literal fires too. That asymmetry between the two sub-branches is exactly why both dyes and both spellings exist.

### The restore, cross-checked

```
RESTORE CROSS-CHECK: git diff --exit-code packages/backend/src/store/observations.ts -> CLEAN
```

---

## REACHABILITY ROWS FOR THE TWO NEW GRAMMARS

From `grammar-reachability.txt` (present in **both** runs):

```
padded_segments_reached=yes
pad_two_in_request_line=yes
pad_one_in_request_line=yes
pad_two_padding_bytes=2
pad_one_padding_bytes=1
```

Two independent channels. `pad_*_in_request_line` comes from curl's own `-v` request-line trace, fixed-string, and answers "did the dye leave this host with its padding intact?". `padded_segments_reached` comes from the stored value and answers "did the segment arrive as its own query segment?". The tracer ABORTS if either wire answer is `no` — an absence caused by the transport is not evidence about the redactor.

Unchanged and re-measured rather than carried over: `userinfo_reached=no`, `userinfo_sent_as_authorization_header=yes` — curl lifts `user:pass@` into an `Authorization: Basic` header before the request line exists, so userinfo cannot be exercised through this tier. Named in the README with the unit case that enforces it instead.

---

## `pnpm check:bundle` BEFORE RUN 1 AND AFTER THE RESTORE

```
# before run 1
$ node scripts/ci/check-bundle-imports.mjs
packages/backend/dist/index.js: 1 import specifier(s): crypto

# after the restore
$ node scripts/ci/check-bundle-imports.mjs
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

---

## THE AMENDED QUERY ENFORCED ENTRY, PASTED WHOLE, BESIDE THE COMMITTED PATH

```
 *     LIVE PROOF, PER GRAMMAR, WITH THE TIER THAT PROVES EACH ONE NAMED
 *     (2026-08-22). This entry once ended "Proven end to end by
 *     `scripts/phase1/tracer-e2e.sh`, which reads the column with sqlite3 from
 *     outside Caido" — full stop, covering the whole grammar — and that was wider
 *     than what ran: every dye in that script came from `openssl rand -hex`, and
 *     hex carries no `=`, so the padded grammar was unreachable from the live tier
 *     entirely. It is stated per grammar now:
 *       `=`-less bare segment  UNIT and LIVE. `redactDelimitedSegment`'s `eq === -1`
 *                              branch, plus the tracer's `openssl rand -hex` dye,
 *                              asserted absent from `SELECT url FROM observations`
 *                              read with `sqlite3` from OUTSIDE Caido.
 *       PADDED segment, both   UNIT and LIVE. Unit: the `BARE_CREDENTIAL_SHAPES`
 *       sub-branches           cases named above, including the one that reads the
 *                              row back out of a real SQLite file ("a PADDED
 *                              credential does not reach the column on EITHER
 *                              delimiter"). Live: the tracer's per-run dye set
 *                              carries TWO padded bare segments — `openssl rand
 *                              -base64 16`, whose value half is a lone `=`, and
 *                              `openssl rand -base64 32`, whose value half is EMPTY
 *                              — and asserts each absent under BOTH its padded
 *                              literal AND its PADDING-STRIPPED CORE, because
 *                              against the defect the column stores the dye minus
 *                              one byte of padding and a search for the padded
 *                              spelling alone returns zero on a live credential.
 *       `;` path parameter     UNIT and LIVE, measured — the `;` grammar is recorded
 *                              per run in `grammar-reachability.txt` rather than
 *                              assumed to arrive.
 *       URL userinfo           UNIT only. MEASURED not assumed: curl lifts
 *                              `user:pass@` into an `Authorization: Basic` header
 *                              before the request line exists, so userinfo cannot be
 *                              exercised through the live tier at all. Recorded per
 *                              run in `userinfo-measurement.txt`; enforced by
 *                              `observations.spec.ts`'s HEAD_CASES.
 *     THE RUN EVIDENCE IS INDEXED AT
 *     `.planning/phases/01-skeleton-persistence-compatibility/results/runs/README-01-17.md`,
 *     which names each committed run, the resolved Caido build it ran on, the stored
 *     URL read back out of the file, and the deliberate mutation run in which the
 *     padded-segment assertions are driven RED. Read it before citing this entry:
 *     what the sentence above claims is that the committed script EXERCISES each
 *     grammar at the tier named beside it, which is a fact about the script; whether
 *     a given run passed is a fact about that run, and only the index can tell you.
```

**The cited path and the committed path, side by side:**

```
CITED (schema.spec.ts):     .planning/phases/01-skeleton-persistence-compatibility/results/runs/README-01-17.md
COMMITTED (on disk):        .planning/phases/01-skeleton-persistence-compatibility/results/runs/README-01-17.md
resolves:                   YES — the cited path resolves to a file that exists
padded-grammar rows in it:  9
```

Plan 01-15's transitional note and its forward reference to "PLAN 01-17" are **gone** (`grep "PLAN 01-17"` returns nothing). The sentence does **not** assert in the past tense that a run has passed — it states what the committed script EXERCISES and points at the index for what any given run did. The `git diff` on this file is **one contiguous hunk** (`@@ -65,14 +65,41 @@`) and touches nothing in the `analyses.error` entry plan 01-16 owns.

---

## `scripts/phase1/env.sh`'s USAGE EXAMPLE — CONFIRMED ACCURATE, NOT UPDATED

The example at `env.sh:78`:

```
#   P1_EXPECT_VERSION=0.57.1 bash scripts/phase1/tracer-e2e.sh
```

Executed:

```
$ P1_EXPECT_VERSION=0.57.1 bash scripts/phase1/tracer-e2e.sh
FATAL: expected Caido 0.57.1, got 0.58.0
exit=1
```

**Confirmed accurate and left unchanged**, on two grounds. First, the mechanism it documents WORKS and was observed working: the command-prefix assignment reaches `env.sh`'s `${P1_EXPECT_VERSION:-…}`, the preflight compares against the overridden value, and it aborts before touching anything. Second, it is stated under an explicit condition — "Override per-invocation **if a 0.57.1 build is ever restored**" — so it is not a claim that the command succeeds today.

That file is deliberately OUTSIDE the new gate's scope, and the gate's header says so with the reason: `env.sh`'s example demonstrates OVERRIDING the variable, which is the opposite of embedding a claim about the build a measurement was taken on, and it sits inside the P7-D5 block whose whole subject is that both builds exist and which is which. Widening the scan to it would delete the documentation of the rule in order to enforce the rule.

---

## THE READ-ONLY LADDER AND 01-14's WORK, UNTOUCHED

A scoped grep over this plan's diff of `tracer-e2e.sh`:

```
NO diff lines touch the sqlite3 ladder, caido-version.txt, or the raw-rows==rpc-rows assertion
```

Both runs took the first rung (`read_mode=readonly`, `sqlite_master_objects=14`, `wal_bytes=168952`, `shm_present=yes`).

---

## FINAL GATE RESULTS

```
 Test Files  31 passed (31)
      Tests  1044 passed (1044)

$ tsc --build      exit=0
$ eslint .         exit=0
$ knip             exit=0
```

Baseline before this plan was 31 files / 1042 tests; the two new `pins.spec.ts` cases take it to 1044. Above the required floor of 31 files / 931 tests.

Scoped clean diffs:

```
git diff --exit-code tests/phase1-load.spec.ts tests/phase1-runtime.spec.ts packages/backend/src/compat.ts               -> CLEAN
git diff --exit-code packages/backend/src/store/observations.ts                                                          -> CLEAN
git diff --exit-code packages/backend/src/outbound-prohibition.spec.ts .../error-redaction.spec.ts .../telemetry.ts      -> CLEAN
git diff --exit-code 01-0*-PLAN.md 01-1[0-6]-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md                            -> CLEAN
```

The three deliberate pins are decision P7-D5's loud-failure net and were not touched.

---

## Decisions Made

- **Two dyes, not one.** 16 raw bytes and 32 raw bytes give TWO `=` and ONE `=` respectively — different paths through one predicate. A single dye would have proved half the rule while reading as if it proved all of it.
- **Cores in every assertion and in the sweep.** Run 2 turned this from a precaution into a measured necessity.
- **Stored tail asserted by segment INDEX.** Appending the padded pair moved the bare segment from last to third-from-last; an `endswith` left in place would have gone on passing while checking a different segment. The old `endswith` line is kept as a coarse whole-row check that does not depend on the split being right, with its comment retargeted to say it now covers the ONE-pad dye.
- **The gate scans comments, deliberately, and says so in its own comment.** The rule is about evidence prose; comment-stripping hygiene would scan past the only place the bug can live.
- **A version literal is a rule, not a number.** Dotted-numeric run of exactly three components — `127.0.0.1` is four and survives, `0.25` is two and survives. Pinning to `0.57.1` would go quiet the day somebody pastes the current build in, which is how the rule broke the first time.
- **The tracer aborts on a mangled dye.** An absence caused by the transport is not evidence about the redactor.

## Deviations from Plan

### Auto-fixed / plan-adjusted items

**1. [Rule 2 — Missing Critical] Wire-fidelity preflight and abort for the padded dyes**
- **Found during:** Task 1
- **Issue:** base64 carries `+` and `/`. If either were mangled in transit, the dye's absence from the column would be trivially true and every padded assertion would pass for the wrong reason — the "confident zero" this phase exists to stop shipping. The plan did not specify a guard.
- **Fix:** `pad_*_in_request_line` measured from curl's own `-v` trace with a fixed-string match; the run dies with the item named if either is `no`. Also a preflight assertion that the padding counts are exactly 2 and 1 and that neither core is empty — a dye with no padding would take the `=`-less branch and prove nothing.
- **Verification:** Both runs measured `yes`; the padding-count guard passed with `x2` and `x1`.
- **Committed in:** `ce5f3a5`

**2. [Rule 2 — Missing Critical] Non-vacuity on the query segment count**
- **Found during:** Task 1
- **Issue:** The index-based stored-tail assertions (`q_seg[-1]`, `[-2]`, `[-3]`) are meaningless if the query did not arrive with the five segments the fixture sent — they would silently index something else.
- **Fix:** `check(len(q_seg) == 5, …)` runs first and the indexed assertions are guarded by it.
- **Verification:** Passed in both runs; the count is also what `padded_segments_reached` is derived from.
- **Committed in:** `ce5f3a5`

**3. [Ordering] The corrected sweep count was cited in task 2, not task 1**
- **Found during:** Task 1 → Task 2
- **Issue:** Task 1's acceptance criteria require the cited count in `secret_sweep`'s comment to match what the corrected instrument reported **on the live run** — but the live run is task 2. Writing a number in task 1 would have been asserting a measurement that did not exist yet, which is the exact defect this plan exists to remove, one file over.
- **Fix:** Task 1 committed the comment with the unsound old number removed and no replacement asserted. Task 2, after run 1, amended it to the measured figure. The amendment is **comment-only** — verified: `git diff -U0 | grep '^[-+][^-+]' | grep -v '^[-+]\s*#'` returned nothing. Run 1 was produced by the pre-amendment script and run 2 by the final text; `README-01-17.md` states this ordering explicitly rather than leaving it to be noticed.
- **Committed in:** `53529f1`

**4. [Measurement, recorded not dropped] The corrected counter reports the same number as the broken one**
- **Found during:** Task 2, run 1
- **Issue:** `grep -o | wc -l` reports FOUR occurrences per value per log file — identical to what `grep -c` (lines) reported.
- **Fix:** Recorded as a negative result in the script comment and in `README-01-17.md` rather than quietly dropped. Caido logs each URL on its own line, so the two counters agree here by luck of the log format. The old number was not wrong on this shape; it was **unsound**, which is the fault that was fixed.
- **Committed in:** `53529f1`

---

**Total deviations:** 2 auto-fixed (both Rule 2 — missing critical non-vacuity/anti-false-green guards), 1 ordering adjustment, 1 measurement finding recorded.
**Impact on plan:** No scope creep. Both auto-fixes close ways the new live assertions could have passed without proving anything — the exact failure class the plan was written against.

## Issues Encountered

- **The `cp` restore in the first mutation-proof sequence did not overwrite** (an interactive `cp -i` alias), so the second mutation ran on top of the first and its proof was contaminated. Detected immediately from the two-failure output, restored with `cat >`, and mutation 2 was **redone in isolation** with `planted version literals: 0` confirmed before running. The isolated result is what is pasted above.
- Nothing else. Both live runs behaved as designed on the first attempt; neither was redone.

## Known Stubs

None. A scan of every `.ts` / `.sh` file changed by this plan for `TODO`, `FIXME`, `placeholder`, `.skip(`, `.todo(` and placeholder-text patterns returned no matches.

## Threat Flags

None. This plan adds no network endpoint, no auth path, no file-access pattern and no schema change. Its only new file access is a read-only `sqlite3` open under decision P8-D2's existing ladder, unchanged from plan 01-14 and asserted unchanged here.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **STORE-03's redaction claim is now proven at the tier that can tell a write-path redaction from a read-path one**, on every grammar the live tier can reach, with a committed failing run per branch.
- **The phase's last outstanding "claim without enforcement" is closed.** WR-21 was the one enforcement claim in this phase with nothing behind it.
- **Carried forward, MEASURED and named rather than left silent:** URL userinfo cannot be exercised through the live `curl` tier — it is lifted into an `Authorization: Basic` header before the request line exists. Enforced at the unit tier by `observations.spec.ts`'s HEAD_CASES, recorded per run in `userinfo-measurement.txt`. Any future phase wanting live userinfo coverage needs a client that does not do this lift.
- **Still OPEN by policy, unchanged and pinned:** path-embedded tokens, and the retained NAME half of a genuine pair. Both are named in `schema.spec.ts`'s OPEN block and pinned by RESIDUAL cases that go RED the day somebody closes them.
- **Still deferred with an owner:** the STORE-03 ledger collision (`REQUIREMENTS.md:52` reads "Artifacts are content-addressed by digest, decoupling identity from URL" and says nothing about redaction). Inherited from 01-01/01-07. This plan did not fix it and did not pretend to.
- Phase 01 is at 17 of 17 plans.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-22*

## Self-Check: PASSED

All created files verified present on disk; all three task/summary commits (`ce5f3a5`, `53529f1`, `ca6aede`) verified in `git log`; the three modified files verified tracked.
