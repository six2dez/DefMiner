# Plan 01-07 tracer evidence — STORE-03 redaction, proven live

Three runs, in order, all against **live Caido 0.58.0** (see the `P1_EXPECT_VERSION`
decision recorded in `scripts/phase1/env.sh` and in PROJECT.md's Key Decisions).

| Run ID | What it proves | Outcome |
|--------|----------------|---------|
| `20260821T102451Z-31716` | The redaction works end to end. `SECRET_VALUE=819d2c4a…89ab` | **PASSED** — 0 occurrences in the raw `SELECT url FROM observations` dump, 0 in the RPC |
| `20260821T102509Z-4998`  | **The gate can FAIL.** `redactQueryValues` removed from `normaliseObservedUrl`, nothing else changed. `SECRET_VALUE=d8cdea11…abf1` | **FAILED**, as required — 8 assertions fired, including the load-bearing raw-column one |
| `20260821T102525Z-17213` | Restored, re-run, still green. `SECRET_VALUE` regenerated again | **PASSED**, exit code 0 |

## Why the mutation run is committed even though its `observations-url-raw.txt`
## contains an unredacted secret-shaped value

That is the entire point of the artifact: it is what the durable column looks like
WITHOUT the redaction, captured from the real database file. The value is sixteen
bytes from `openssl rand -hex 16`, generated fresh for that run and meaningful
nowhere — it is not a credential, it is a tracer dye. A fresh value per run is also
why no assertion here can be satisfied by a hard-coded expectation.

## What the raw dump is for

`observations-url-raw.txt` is `sqlite3 "$PLUGIN_DB" "SELECT url FROM observations"`,
read from OUTSIDE Caido. The RPC could redact on READ while the column stayed dirty,
and only the file can tell you which happened. The tracer asserts the secret's
absence from BOTH the file and the RPC json — both, never either.

## Relationship to the offline harness

`../offline/tracer-assertions-offline.md` exercises the same python assertion block
against synthetic fixtures. It was written while the live run was BLOCKED on an
unobtainable Caido 0.57.1, and it covers a case the live runs cannot cheaply
produce: a read-path-only redaction (RPC clean, column dirty). The live runs above
are the real proof; the offline harness is a supplement and is not a substitute.
