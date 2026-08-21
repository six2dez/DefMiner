# Plan 01-14 tracer evidence — every redacted grammar, proven live

Two runs, in order, both against **live Caido 0.58.0**. The build is not named in
prose here either: each run directory carries `caido-version.txt`, written from the
`$ACTUAL_VERSION` the preflight guard compared, so the evidence carries the build
rather than this sentence claiming it. See `scripts/phase1/env.sh` for decision
P7-D5 and why `P1_EXPECT_VERSION` is what it is.

| Run ID | What it proves | Outcome |
|--------|----------------|---------|
| `20260821T150022Z-16902` | The redaction holds across every grammar this phase claims to close, against the database FILE. Five per-run values — `name=value` pair, bare `=`-less segment, `;` path parameter, userinfo password, userinfo username — all at 0 occurrences in both the raw column and the RPC projection | **PASSED** |
| `20260821T150143Z-19295` | **The new bare-segment assertion can FAIL.** `redactDelimitedSegment`'s `eq === -1` branch reverted to its pre-01-10 form, rebuilt, re-run. Nothing else changed | **FAILED**, as required — six assertions, every one naming the bare-segment grammar |

## What run 1 stored, read with `sqlite3 -readonly` from OUTSIDE Caido

```
http://127.0.0.1:8972/defminer-tracer-fixture.js;jsessionid=<redacted>?v=<redacted>&access_token=<redacted>&<redacted>
```

Two rows, and `raw rows == rpc rows : 2 == 2`. That equality is new (IN-13): the
raw column used to be searched only as concatenated text, so a run where the RPC
returned two rows and the table held ten would have passed every per-row check.

## What run 2 stored, with P10-D1 reverted

```
http://127.0.0.1:8972/defminer-tracer-fixture.js;jsessionid=<redacted>?v=<redacted>&access_token=<redacted>&1d984bbcfeb14c2d3a26ab9c8c20560e
```

The six failures, verbatim from `20260821T150143Z-19295/tracer-stderr.txt`:

```
TRACER FAILED:
  - [bare `=`-less query segment (01-10, P10-D1)] the per-run secret occurs 2 time(s) in SELECT url FROM observations, read with sqlite3 from OUTSIDE Caido — the DURABLE column is dirty
  - [bare `=`-less query segment (01-10, P10-D1)] the per-run secret occurs 2 time(s) in observations.json (the RPC projection)
  - [bare `=`-less query segment (01-10, P10-D1)] observation row 0 still carries the per-run secret: '…&1d984bbcfeb14c2d3a26ab9c8c20560e'
  - [bare `=`-less query segment (01-10, P10-D1)] observation row 1 still carries the per-run secret: '…&1d984bbcfeb14c2d3a26ab9c8c20560e'
  - raw column row 0 does not END with &<redacted> — the BARE (`=`-less) query segment did not reach the column redacted, which is decision P10-D1: '…'
  - raw column row 1 does not END with &<redacted> — …
```

**That the other three grammars stayed `<redacted>` in the same row is half the
proof.** A mutation that turned everything red would show that the tracer can
fail; it would not show that the NEW assertion is the thing failing. The `;`
parameter, `access_token` and `v` are all still redacted in the dirty row, so the
revert isolated exactly one branch and exactly one branch went red.

## What the live tier could NOT exercise, and how that was established

This is the section the plan exists to make impossible to omit. Both answers are
MEASURED on the runs above and recorded in each run's
`grammar-reachability.txt` and `userinfo-measurement.txt` — not assumed in
either direction.

| Grammar | Reached `observations.url`? | How that was measured | What enforces it |
|---------|------------------------------|------------------------|------------------|
| `name=value` query pair | **yes** | `access_token=<redacted>` present in every raw row | this run, plus 01-07's |
| bare `=`-less segment | **yes** | every raw row ENDS with `&<redacted>`; run 2 shows the same position dirty when reverted | this run |
| `;` path parameter | **yes** | `;` survives into the column; `;jsessionid=<redacted>` asserted in every raw row | this run — **new**; 01-11 had only unit coverage |
| URL userinfo | **NO** | `curl -v`'s own request-line trace: `userinfo_in_request_line=no`, `userinfo_sent_as_authorization_header=yes`. curl lifts `user:pass@` into `Authorization: Basic` before the request line is built, so userinfo cannot reach the plugin through this tier at all | `observations.spec.ts` — "USERINFO does not reach the column either, nor does a `;` parameter value (WR-11)", which reads the row back out of a real SQLite file, and "userinfo with a password: NEITHER half survives, and the `@` does" |

**Read the userinfo row carefully.** Both userinfo values are at 0 occurrences in
run 1's column — but that is a property of the TIER, not evidence that
`redactUrlHead` ran on them. A value that never arrives is absent whether or not
anything redacts it. Saying so is the whole point; the unmeasured version of this
row would have been a silence dressed as a pass.

The `;` row is the opposite case and the genuinely new result: the `;` parameter
DOES survive Caido's URL handling and reach the plugin, which was an open question
before this run. 01-11's head redactor is now proven against the durable column.

## Why Caido's own logs are not committed

`secret-sweep.txt` in each run directory counts every per-run value per file,
swept AFTER teardown so Caido's host log is in scope. On run 1:

```
query-pair    logging.2026-08-21.log 4     query-pair    caido.stdout.log 4
bare-segment  logging.2026-08-21.log 4     bare-segment  caido.stdout.log 4
path-param    logging.2026-08-21.log 4     path-param    caido.stdout.log 4
```

Caido's `--debug` output records the full request URL unredacted. Those files are
excluded from git by `.gitignore:35` (`results/runs/*/*.log`) — a pre-existing
rule, not a choice made here — and they were **not** force-added. The plan's
action line asks for the origin log too; it falls under the same rule and is also
absent. Every value greps to **zero** across the 11 committed files of run 1.

Run 2's sweep is different ON PURPOSE and says so: `bare-segment
observations-url-raw.txt 2` and `observations.json 1`. That IS the artifact — what
the durable column looks like without the redaction, captured from the real file.
Each value is `openssl rand -hex 16`, generated fresh per run and meaningful
nowhere: a tracer dye, not a credential. Same reasoning `README-01-07.md` records
for its own mutation run.

## How the database was read

`db-read-mode.txt`, per run. Both took the first rung of decision P8-D2's ladder:

```
read_mode=readonly
sqlite_master_objects=14
wal_bytes=168952
shm_present=yes
sqlite3_cli=3.51.0
```

A 168,952-byte `-wal` was live at read time, which is exactly the condition under
which 01-08 measured `immutable=1` reporting **no tables at all**. The WAL-aware
`-readonly` open succeeded here, so the fallback was not taken — but the ladder is
what makes that a fact rather than a lucky default, and its third rung aborts by
name rather than falling back to a read that would have produced an EMPTY dump in
which every secret is trivially absent. A gate green because it read nothing is
the failure this rung exists to prevent.

## Relationship to plan 01-07's runs

`README-01-07.md` covers the same tracer at one grammar. Its three runs are not
superseded and are not re-run here. What changed: four grammars instead of one,
five per-run values instead of one, the raw column asserted per row rather than
as concatenated text, the row counts required to agree, and a read-only open.
