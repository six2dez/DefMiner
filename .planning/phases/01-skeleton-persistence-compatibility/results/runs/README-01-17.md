# Plan 01-17 tracer evidence — the PADDED grammar, proven live on both sub-branches

Two runs, in order, both against **live Caido**. The build is not named in prose
here: each run directory carries `caido-version.txt`, written from the
`$ACTUAL_VERSION` the preflight guard compared, so the evidence carries the build
rather than this sentence claiming it. Both read `caido_version=0.58.0`. See
`scripts/phase1/env.sh` for decision P7-D5 and why `P1_EXPECT_VERSION` is what it
is.

| Run ID | What it proves | Outcome |
|--------|----------------|---------|
| `20260822T094728Z-11865` | The redaction holds on the PADDED grammar, both sub-branches, against the database FILE. Nine values — the five grammars plan 01-14 proved, plus two padded dyes and their two padding-stripped cores — all at 0 occurrences in both the raw column and the RPC projection | **PASSED** |
| `20260822T094959Z-31622` | **The new padded-segment assertions can FAIL.** Plan 01-15's padding branch in `redactDelimitedSegment` reverted, rebuilt, re-run. Nothing else changed | **FAILED**, as required — 18 assertions, every one naming a padded sub-branch or its core |

## What run 1 stored, read with `sqlite3 -readonly` from OUTSIDE Caido

```
http://127.0.0.1:8972/defminer-tracer-fixture.js;jsessionid=<redacted>?v=<redacted>&access_token=<redacted>&<redacted>&<redacted>&<redacted>
```

Two rows, and `raw rows == rpc rows : 2 == 2`. Six redaction markers now, not
four: the last two are the padded pair, appended by this plan as the last two
query segments. Each is asserted BY INDEX to be exactly the marker, so the run
cannot pass on the secret merely being absent — a URL that never reached the
plugin would satisfy absence and fail this.

The observed padding on that run, from `grammar-reachability.txt`:

```
pad_two_padding_bytes=2      # openssl rand -base64 16 -> 24 chars, value half a lone `=`
pad_one_padding_bytes=1      # openssl rand -base64 32 -> 44 chars, value half EMPTY
```

## What run 2 stored, with the padding branch reverted

```
http://127.0.0.1:8972/defminer-tracer-fixture.js;jsessionid=<redacted>?v=<redacted>&access_token=<redacted>&<redacted>&9xUbJAATIR5fA3NpO+WUHA=<redacted>&Hf0sCN7lYIrnsKODDtzkUOZDO1/mumKR1nqAH0duYwU=<redacted>
```

Both padded dyes are sitting in the durable column, promoted into the retained
NAME half of a pair that was never a pair. Re-pad `9xUbJAATIR5fA3NpO+WUHA=` with
one `=`, run `base64 -d`, and the 16 raw bytes come back. These are `openssl
rand -base64` tracer dyes, meaningful nowhere and generated fresh per run — which
is what makes committing this dump an honest artifact rather than a leak, the same
reasoning `README-01-07.md` and `README-01-14.md` record for their own mutation
runs.

The failures, verbatim from `20260822T094959Z-31622/tracer-stderr.txt` (the two
row-1 duplicates and the four `observation row N` restatements elided with `…`;
the file carries all 18):

```
TRACER FAILED:
  - [padded bare segment, TWO `=` — value half is a lone `=` (01-17) [PADDING-STRIPPED CORE]] the per-run secret occurs 2 time(s) in SELECT url FROM observations, read with sqlite3 from OUTSIDE Caido — the DURABLE column is dirty
  - [padded bare segment, TWO `=` — value half is a lone `=` (01-17) [PADDING-STRIPPED CORE]] the per-run secret occurs 2 time(s) in observations.json (the RPC projection)
  - [padded bare segment, ONE `=` — value half is EMPTY (01-17)] the per-run secret occurs 2 time(s) in SELECT url FROM observations, read with sqlite3 from OUTSIDE Caido — the DURABLE column is dirty
  - [padded bare segment, ONE `=` — value half is EMPTY (01-17)] the per-run secret occurs 2 time(s) in observations.json (the RPC projection)
  - [padded bare segment, ONE `=` — value half is EMPTY (01-17) [PADDING-STRIPPED CORE]] the per-run secret occurs 2 time(s) in SELECT url FROM observations, read with sqlite3 from OUTSIDE Caido — the DURABLE column is dirty
  - [padded bare segment, ONE `=` — value half is EMPTY (01-17) [PADDING-STRIPPED CORE]] the per-run secret occurs 2 time(s) in observations.json (the RPC projection)
  - raw column row 0: query segment -2 reads '9xUbJAATIR5fA3NpO+WUHA=<redacted>', not <redacted> — SUB-BRANCH 'value half is a lone `=`' (the TWO-pad dye) did not reach the column redacted WHOLE. Against the defect this reads as the padding-stripped core, an `=`, and the marker, from which one re-pad and one `base64 -d` returns the credential: '…'
  - raw column row 0: query segment -1 reads 'Hf0sCN7lYIrnsKODDtzkUOZDO1/mumKR1nqAH0duYwU=<redacted>', not <redacted> — SUB-BRANCH 'value half is EMPTY' (the ONE-pad dye) did not reach the column redacted WHOLE: '…'
  - raw column row 0 does not END with &<redacted> — the LAST query segment, which is the ONE-pad dye since plan 01-17, did not reach the column redacted: '…'
  - [… the same three, for raw column row 1 …]
```

## THE ONE RESULT THIS PLAN EXISTS FOR — read the run-2 sweep, not the prose

`20260822T094959Z-31622/secret-sweep.txt`, the four lines that matter:

```
pad-two-literal  logging.2026-08-22.log     4
pad-two-literal  caido.stdout.log           4
pad-two-CORE     observations-url-raw.txt   2      <-- the column is dirty
pad-two-CORE     observations.json          2
```

**`pad-two-literal` does not appear against `observations-url-raw.txt` at all.**
Zero hits, on a run where a whole credential is sitting in that file. The stored
value is the dye MINUS ONE BYTE of padding, so the padded literal is not a
substring of it and a fixed-string search returns clean. A tracer that asserted
only the padded spelling — which is the obvious way to write it, and the way plan
01-14 would have written it — would have PASSED this run and reported a redacted
column. That is the CR-07 trap, measured against the real database file rather
than argued about.

The ONE-pad dye does not have this property: its stored form is `<core>=<redacted>`
and the padded literal `<core>=` is a prefix of it, so the literal fires too. The
asymmetry between the two sub-branches is exactly why both dyes and both spellings
exist, and why a single dye would have proved half the rule while reading as if it
proved all of it.

## What the live tier could and could NOT exercise, per run

MEASURED on both runs and recorded in each run's `grammar-reachability.txt` and
`userinfo-measurement.txt` — never assumed in either direction.

| Grammar | Reached `observations.url`? | How that was measured | What enforces it |
|---------|------------------------------|------------------------|------------------|
| `name=value` query pair | **yes** | `access_token=<redacted>` present in every raw row | this run, plus 01-07's and 01-14's |
| bare `=`-less segment | **yes** | query segment `-3` is exactly `<redacted>` in every raw row | 01-14's mutation run; re-asserted here at its new index |
| `;` path parameter | **yes** | `pathparam_reached=yes`; `;jsessionid=<redacted>` asserted in every raw row | 01-14's run and this one |
| padded bare segment, TWO `=` (value half a lone `=`) | **yes** | two channels. `pad_two_in_request_line=yes` — curl's own `-v` request-line trace, fixed-string, confirming the dye left this host with its padding intact. And `padded_segments_reached=yes` — every raw row carries the 5 query segments the fixture sent, in order. Run 2 closes it: the same segment goes dirty when the branch is reverted | this run — **new**; 01-15 had only unit coverage |
| padded bare segment, ONE `=` (value half EMPTY) | **yes** | as above, `pad_one_in_request_line=yes` | this run — **new**; 01-15 had only unit coverage |
| URL userinfo | **NO** | `userinfo_in_request_line=no`, `userinfo_sent_as_authorization_header=yes`. curl lifts `user:pass@` into `Authorization: Basic` before the request line is built, so userinfo cannot reach the plugin through this tier at all. Unchanged from 01-14 and re-measured here rather than carried over | `observations.spec.ts` — "USERINFO does not reach the column either, nor does a `;` parameter value (WR-11)", which reads the row back out of a real SQLite file, and "userinfo with a password: NEITHER half survives, and the `@` does" |

**The padded rows are the ones to read carefully, and they are the reason the
tracer now aborts rather than reporting a zero.** A dye mangled in transit — `+`
read as a space, padding stripped by a normaliser — would make its absence from the
column trivially true, and every padded assertion would pass for the wrong reason.
So `pad_two_in_request_line` / `pad_one_in_request_line` are asserted `yes` in the
script itself and the run dies with the item named if either is `no`. Both runs
measured `yes`.

## The committed evidence carries no dye and no core

Run 1's directory commits 12 files; four `*.log` files are excluded by
`.gitignore:35` — a pre-existing rule, not a choice made here — and were **not**
force-added, because Caido's `--debug` output records the full request URL
unredacted.

Two independent sweeps, both zero:

1. **In-run**, by `secret_sweep` itself, which held all nine values in scope:
   `20260822T094728Z-11865/secret-sweep.txt` lists a non-zero count for
   `logging.2026-08-22.log` and `caido.stdout.log` and for **no other file**. Every
   committed file is absent from that list, which is what a zero reads as in a
   report that only prints non-zero rows.
2. **Post-hoc and independent**, recovering the seven URL-borne values back out of
   run 1's gitignored host log and grepping the 12 committed files for each:

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
```

The two userinfo values are not recoverable that way and do not need to be:
`userinfo_reached=no`, they never entered the request line, and sweep 1 — which
DID hold them — reports them at zero occurrences in every file of the run,
committed or not.

## The instrument was corrected, and it reported the same number

`secret_sweep`'s header says it counts occurrences per file; it counted matching
LINES (`grep -c -F`) until 2026-08-22. Two hits on one line reported as one, which
is the shape of a proxy log recording a request line and a response line. It now
counts with `grep -o -F` piped through `wc -l`.

On run 1 the corrected instrument reports **four** occurrences of each wire value
in `logging.2026-08-22.log` and **four** in `caido.stdout.log` — the same figure
the line counter reported. That is a negative result and it is recorded rather
than dropped: Caido happens to log each URL on its own line, so the two counters
agree here by luck of the log format. The old number was not wrong on this shape;
it was unsound, which is the fault that matters and the one that was fixed.

## How the database was read

`db-read-mode.txt`, per run. Both took the first rung of decision P8-D2's ladder,
unchanged from plan 01-14 and asserted unchanged by this plan:

```
read_mode=readonly
sqlite_master_objects=14
wal_bytes=168952
shm_present=yes
sqlite3_cli=3.51.0
```

## Relationship to the earlier runs

`README-01-14.md` covers the same tracer at five grammars and `README-01-07.md` at
one. Neither is superseded and neither is re-run here. What changed: two more
grammars and two padding-stripped cores, absence asserted under the spelling that
is actually recoverable, the stored tail asserted by SEGMENT INDEX rather than by
`endswith`, the padded dyes measured on the wire before the column is trusted, and
an occurrence counter that reports what its header claims.

**One ordering note, stated rather than left to be noticed.** Run 1 was produced by
the script as committed in this plan's first commit; the second commit amends one
comment block in `secret_sweep` to cite the count run 1 measured — a number that
could not honestly be written before the run that produced it. The amendment is
comment-only (`git diff` on the two commits shows no non-comment line changed) and
run 2 was produced by the final text.
---

## AMENDMENT, 2026-08-24 (plan 01-22) — which predicate produced the `padded_segments_reached` row

Appended, not edited. Nothing above this line is rewritten and neither run directory
is touched; this phase amends evidence by pointer and dates the pointer.

**What changed in the instrument.** `padded_segments_reached` in
`scripts/phase1/tracer-e2e.sh` read `bool(raw_rows) and all(… for r in raw_rows if "?"
in r)`. `bool(raw_rows)` catches an empty row LIST, but not a row list where no row
carries a `?` — the generator is then empty and `all()` over an empty generator is
`True`. On that input the pre-fix predicate would have written
`padded_segments_reached=yes` into `grammar-reachability.txt` having measured nothing.
Executed standalone under `python3` rather than read off the page (01-REVIEW.md IN-21):

```
--- padded_segments_reached, PRE-FIX form ---
A. empty row list                                   -> padded_segments_reached=False  -> writes DID-NOT-REACH
B. rows present, NONE carries a query string        -> padded_segments_reached=True   -> writes REACHED
C. rows carrying the 5 segments the fixture sent    -> padded_segments_reached=True   -> writes REACHED
D. rows carrying a query of the WRONG segment count -> padded_segments_reached=False  -> writes DID-NOT-REACH
```

Plan 01-22 adds `any("?" in r for r in raw_rows)` to the conjunction, keeping the
existing `bool(raw_rows)` guard. Case B now reads `False`; A, C and D are unchanged.

**WHAT THIS DOES AND DOES NOT PUT IN DOUBT, stated precisely, because overstating it
would be the same fault aimed backwards.** The two runs indexed above, and the runs
under `README-01-14.md`, carry `padded_segments_reached=yes` produced by the PRE-FIX
predicate. Their note is NOT retrospectively in doubt: on those runs the segment-count
assertion `check(len(q_seg) == 5, …)` PASSED for every row, which is only reachable on
rows that carry a `?` and carry exactly five query segments. The reachability note was
therefore independently corroborated on the runs that were taken, by an assertion that
would have failed loudly on the input that makes the pre-fix predicate vacuous. What
was wrong was the predicate's INDEPENDENCE, not its answer here: its truth depended on
another assertion having already failed, and that is not a property an evidence file
should have.

**Scope of the correction.** Runs from plan 01-22 onward use the corrected
conjunction. No live Caido cycle was run to establish any of the above: the predicate
is pure, and its empty-generator branch is structurally unreachable on a passing live
run — the segment-count check fails first — so the standalone execution exercises a
branch a live run could not have reached.

The two sibling predicates, `pathparam_reached` and `userinfo_reached`, were checked
and are plain substring tests over the joined blob with no filtered generator; both
read `False` on an empty blob. Non-vacuous by construction, confirmed by execution,
and untouched.
