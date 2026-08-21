# Offline exercise of tracer-e2e.sh's NEW assertion block

NOT A LIVE RUN. The live run is BLOCKED: the tracer pins Caido 0.57.1 and the only
binary on this host is 0.58.0 (see 01-07-SUMMARY.md / the execution checkpoint).

This transcript exercises the python assertion block EXTRACTED VERBATIM from the
script against synthetic fixtures, so the new logic is proven to pass on the
correct shape and to FAIL on both leak shapes before a human ever runs it live.
A gate whose failure path has never run is worth nothing, and this phase has been
bitten by that four times.

## A. redacted column + redacted RPC — the expected shape

```
exit 0

host-computed digest   : aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
digest read back from  : aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
EQUAL                  : True
artifact rows          : 1 seen_count 2
observation rows       : 2 distinct request ids 2
observed url           : http://127.0.0.1:8972/defminer-tracer-fixture.js?v=<redacted>&access_token=<redacted>
secret param name      : access_token= present in raw column: True
SECRET VALUE in raw db : 0 occurrence(s)
SECRET VALUE in RPC    : 0 occurrence(s)
sqlite inside Caido    : 3.46.0
schema version         : 1
max event->reload ms   : 1

```

## B. RPC redacted but the DURABLE COLUMN still dirty — read-path-only redaction

```
exit 1

TRACER FAILED:
  - the SECRET VALUE occurs 2 time(s) in SELECT url FROM observations read with sqlite3 from OUTSIDE Caido — the durable column is dirty

```

## C. no redaction anywhere — the mutation the live run must catch

```
exit 1

TRACER FAILED:
  - observation url 'http://127.0.0.1:8972/defminer-tracer-fixture.js?v=tracer1&access_token=0123456789abcdef0123456789abcdef' still carries the cache buster VALUE 'tracer1'
  - observation url 'http://127.0.0.1:8972/defminer-tracer-fixture.js?v=tracer1&access_token=0123456789abcdef0123456789abcdef' still carries the SECRET VALUE
  - observation url 'http://127.0.0.1:8972/defminer-tracer-fixture.js?v=tracer1&access_token=0123456789abcdef0123456789abcdef' carries no redaction marker
  - observation url 'http://127.0.0.1:8972/defminer-tracer-fixture.js?v=tracer1&access_token=0123456789abcdef0123456789abcdef' still carries the cache buster VALUE 'tracer1'
  - observation url 'http://127.0.0.1:8972/defminer-tracer-fixture.js?v=tracer1&access_token=0123456789abcdef0123456789abcdef' still carries the SECRET VALUE
  - observation url 'http://127.0.0.1:8972/defminer-tracer-fixture.js?v=tracer1&access_token=0123456789abcdef0123456789abcdef' carries no redaction marker
  - the SECRET VALUE occurs 2 time(s) in SELECT url FROM observations read with sqlite3 from OUTSIDE Caido — the durable column is dirty
  - the SECRET VALUE occurs 2 time(s) in observations.json (the RPC)

```
