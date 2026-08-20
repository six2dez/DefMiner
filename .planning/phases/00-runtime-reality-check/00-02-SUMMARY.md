---
phase: 00-runtime-reality-check
plan: 02
subsystem: runtime-budgets
status: complete
tags: [spike, caido, quickjs, budgets, sqlite, filesystem, compression, meriyah]

requires:
  - "00-01 — instance.sh, probe-run.sh, record-result.py, rss-sampler.sh, origin.py, the schemas and the two vitest gates"
provides:
  - "results/SPIKE-08.json — BODY_STORED_DECOMPRESSED, BODY_LENGTH_EQUALS_RAW_LENGTH, SIZE_GATE_SOURCE"
  - "results/SPIKE-06.json — AST_MAX_BYTES, HARD_MAX_BYTES, MAX_NESTING_DEPTH, STACK_FAILURE_MODE, PARSE_MS_PER_MB, RSS_BYTES_PER_INPUT_BYTE"
  - "results/SPIKE-09.json — PRAGMA_PERSISTS_ACROSS_EXEC, TRANSACTION_PERSISTS_ACROSS_EXEC, MULTISTATEMENT_EXEC_ATOMIC, WAL_ENABLED, DB_SURVIVES_REINSTALL"
  - "results/SPIKE-12.json — FS_HAS_REALPATH, FS_HAS_LSTAT, FS_CONTAINMENT_STRATEGY"
  - "caido.config.ts + tier1/parse — the Tier-1 build pipeline Phase 1's DIST-05 gate depends on"
  - "probe/tier0-budgets — body-semantics, SQLite and filesystem probe"
affects:
  - "00-04 — reads all four results into the go/no-go table"
  - "Phase 1 CORE-02 (size gate quantity), STORE-01..07 (no transactions), DIST-05 (build setup)"
  - "Phase 3 / Phase 9 — AST_MAX_BYTES, MAX_NESTING_DEPTH, the degradation path"
  - "Phase 7 MAP-04/MAP-05 — containment strategy"

tech-stack:
  added:
    - "typescript 7.0.2 — required by tsup at load time; approved at a blocking-human checkpoint"
  patterns:
    - "Fresh instance per measurement point, with run_id uniqueness asserted rather than described"
    - "Every ceiling expressed in the length quantity SPIKE-08 defined, and says so in its rationale"
    - "Verdicts derived from recorded evidence by the analyser, never asserted by hand"
    - "Policy inputs (stall budget, RSS budget) named explicitly so a later phase can re-derive"

key-files:
  created:
    - caido.config.ts
    - tier1/parse/src/index.ts
    - probe/tier0-budgets/manifest.json
    - probe/tier0-budgets/backend/script.js
    - scripts/spike/make-encoded-fixtures.mjs
    - scripts/spike/deep-nest.mjs
    - scripts/spike/ladder.sh
    - scripts/spike/run-spike-08.sh
    - scripts/spike/run-spike-09-12.sh
    - scripts/spike/analyse-spike-06.py
    - scripts/spike/analyse-spike-08.py
    - scripts/spike/analyse-spike-09-12.py
    - README.md
    - .planning/phases/00-runtime-reality-check/results/SPIKE-06.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-08.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-09.json
    - .planning/phases/00-runtime-reality-check/results/SPIKE-12.json
  modified:
    - .gitignore
    - package.json
    - pnpm-lock.yaml

decisions:
  - "SIZE_GATE_SOURCE is decompressed identity bytes — Caido decodes every encoding before the hook"
  - "MAX_NESTING_DEPTH taken as the MINIMUM across nesting shapes, not the bracket figure"
  - "HARD_MAX_BYTES labelled time-bound; the timeout boundary was deliberately not bisected"
  - "RSS ratio fitted below 50 MB only, because larger points were depressed by host swap"
  - "AST_MAX_BYTES derived from a named stall budget and a named RSS budget, both re-derivable"
  - "No partial SPIKE-06.json was written while the build was blocked"

metrics:
  duration_min: 105
  completed: 2026-08-20
  tasks: 3
  commits: 4
  files_changed: 53

actuals:
  tokens: 78864
  tasks: 3
  commits: 4
---

# Phase 0 Plan 02: Budgets and Persistence — Summary

Fixed the four ceilings and contracts the rest of DefMiner will be built against, measured inside Caido 0.57.1 on 33 fresh instances. Three of the four answers contradict what the plan assumed.

## The Numbers

| Threshold | Value | Spike |
|---|---|---|
| `SIZE_GATE_SOURCE` | decompressed identity bytes | 08 |
| `BODY_STORED_DECOMPRESSED` | `true` | 08 |
| `BODY_LENGTH_EQUALS_RAW_LENGTH` | `true` (24/24) | 08 |
| `AST_MAX_BYTES` | **1,334,405** | 06 |
| `HARD_MAX_BYTES` | 274,736,748 (**time-bound**) | 06 |
| `MAX_NESTING_DEPTH` | **246** | 06 |
| `STACK_FAILURE_MODE` | **catchable-throw** | 06 |
| `PARSE_MS_PER_MB` | 785.8 | 06 |
| `RSS_BYTES_PER_INPUT_BYTE` | 102.1 | 06 |
| `PRAGMA_PERSISTS_ACROSS_EXEC` | both scopes survived | 09 |
| `TRANSACTION_PERSISTS_ACROSS_EXEC` | **`false`** | 09 |
| `MULTISTATEMENT_EXEC_ATOMIC` | `true` | 09 |
| `WAL_ENABLED` | `true` | 09 |
| `DB_SURVIVES_REINSTALL` | **survives force-reinstall only** | 09 |
| `FS_HAS_REALPATH` | `false` | 12 |
| `FS_HAS_LSTAT` | **`true`** | 12 |

## SPIKE-08 — Caido decompresses before the hook

gzip, brotli and zstd all arrive **decoded**. The `toRaw()` digest equals the identity digest on both a 458 KB and a 2.98 MB artifact, the leading bytes are plain JavaScript rather than a container, and Caido strips `Content-Encoding` and rewrites `Content-Length` to the decoded size. `Body.length == toRaw().length` on all 24 proxied round trips.

Observed ratios ran 3.58×–7.25×, so a ceiling written against wire bytes would have been wrong by up to seven times. That is why this ran before SPIKE-06, and every byte figure in SPIKE-06 names this quantity in its rationale.

The non-UTF-8 fixture produced the sharpest result in the spike. `toText()` re-encoded as UTF-8 is **242 bytes against 222 raw** and the digests differ — but `text.length` is **222**, exactly equal to `raw.length`. Ten invalid bytes each became a 3-byte U+FFFD while three neighbouring bytes were valid ASCII, and the UTF-16 unit count landed on the byte count by coincidence. **Length agreement is not byte agreement.** A guard written as `if (text.length === body.length)` would pass and every offset after the first bad sequence would still be wrong by up to 20 bytes. This is precisely the hazard ENC-01 exists to prevent, and it now has a fixture.

## SPIKE-06 — the binding constraint is the stall, not memory

The tokenizer is not a fallback. `acorn.tokenizer()` costs **783.2 ms/MB against meriyah's 785.8** — 1.0×. Phase 9 planned it as the low-memory degradation path; it is that, but it buys **nothing** in CPU, and the stall budget is unchanged when you take it.

RSS is 102 bytes per input byte, so an 8 MB bundle costs **~817 MB inside `caido-cli`** — the same process holding the user's proxy and project data.

`AST_MAX_BYTES` is 1.33 MB, bound by a 1,000 ms single-block stall budget. A meriyah parse is synchronous and unchunkable, and SPIKE-02 established that only `setTimeout(fn,0)` yields at all, so the whole parse starves the proxy hook, the plugin RPC and every timer. Cesium (4.90 MB) and Plotly (4.35 MB) are both far above this, so **degradation is the common case for large bundles, not an edge case.** Both budget constants are named in the result so Phase 9 can re-derive against different ones.

`MAX_NESTING_DEPTH` is **246, not 710**. Measuring only the bracket shape would have given 710; the parenthesised shape bottoms out at 246 because it recurses through the primary-expression path and carries more stack per level. Reporting the bracket figure would have been almost 3× too generous, on a number Phase 9 gates on.

`STACK_FAILURE_MODE` is **catchable**. All 18 depth probes threw `RangeError: Maximum call stack size exceeded`, the host survived every one, 0 abort signatures across 29 stderr captures, and every exit was 137 (our own SIGKILL) — never 134. This closes research open question 3: MAP-05 and QUAL-05 can use catch-and-degrade and do not need a hard pre-parse depth gate.

`HARD_MAX_BYTES` is **time-bound and labelled as such**. Nothing failed for memory at any size reached: 274 MB parsed in 420 s, and 541 MB was still parsing when the 900 s call budget fired with the host alive and no assertion on stderr. See "Deviations" for why I did not bisect that boundary.

## SPIKE-09 — the transaction failure is silent

`BEGIN` does **not** span `exec` calls. The decisive evidence is not a row count — a split BEGIN/INSERT/COMMIT looks identical whether the transaction held or the insert autocommitted — but a **second `BEGIN` in the next exec, which succeeded.** SQLite permits that only when no transaction is active. A second consecutive `ROLLBACK` also succeeded, so more than one transaction was open at once across the pool.

What makes this dangerous is that `BEGIN`, `COMMIT` and `ROLLBACK` **all return success throughout.** Code that looks transactional passes every test and provides no atomicity whatsoever. STORE-01 through STORE-07 must be designed around single-statement idempotent upserts.

A single multi-statement `exec` **is** atomic — but establishing that took a second instrument. The in-run count of zero was not proof: the failed batch left an open write transaction on its own pooled connection, the next write died with `SQLITE_BUSY (code 5) database is locked`, and neither a bare COMMIT nor a bare ROLLBACK could clear it because those land on other connections. Zero was equally consistent with "rolled back" and "uncommitted over there". The unconfounded count came from a **fresh connection pool after a plugin restart**. The connection-poisoning behaviour is itself a first-order Phase 1 finding: nothing in the plugin API can reach the stuck connection, and the database stays locked for writes until the plugin restarts.

The plugin database does **not** survive a genuine uninstall. The backend UUID changed and the sentinel row was gone; a `force: true` reinstall preserves both. UPGRADE-01 and UPGRADE-04 cannot rely on `sdk.meta.db()` across a version change without an export/import path.

## SPIKE-12 — `lstat` exists, and that changes MAP-04

The plan's premise was "no `realpath` and no `lstat`". Half wrong: **`lstat` is available and works**, correctly reporting `is_symlink: true` where `stat` follows the link and reports a directory. `realpath` and `readlink` are genuinely absent.

22 hostile `sources` fixtures were resolved. Five escape via `path.resolve` and are caught lexically: relative traversal, two absolute POSIX forms, an embedded NUL (which did **not** truncate the path — the traversal after it was honoured), and trailing dots-and-spaces. Percent-encoded traversal, Windows drive letters, UNC prefixes, reserved device names and `webpack://`/`file://`/`http://` prefixes are all inert on POSIX and resolve to literal filenames inside the root.

Writing through a symlink that the lexical rule accepts **did** leave the scratch root, so a prefix rule is insufficient alone — but because `lstat` exists, the fix is available: walk each component and reject any that is a symbolic link.

Two collisions were invisible to string comparison and only appeared in the filesystem: NFD folded onto NFC, and `SRCDIR` onto `srcdir`. **15 accepted writes produced 13 files.** Any dedupe keyed on the raw `sources` string will treat these as distinct and silently overwrite. Both are macOS/APFS answers and are recorded as platform-scoped; MAP-05 must repeat the matrix on Linux and Windows.

`containment.escaped` is `false`. Nothing was written outside the instance data path.

## Runtime Facts Not In The Research

1. **An event handler registered after `init()` returns is silently dropped.** A non-async `init` that registered `onInterceptResponse` inside a `.then()` logged "ready", answered `drain` over REST, and delivered **zero** of 34 proxied responses — no error anywhere. `sdk.api.register` at the same point works fine. `init` must be `async` and the event registration must happen while it is still on the stack.
2. **The REST function endpoint `JSON.parse`s each `args` element individually.** `"sentinel-original"` arrives as source and fails with `unexpected token`; `"\"sentinel-original\""` arrives as a string. Verified **not** eval — `1+1` fails with "unexpected data at the end" and `globalThis.toString()` with "unexpected token" — so it is not a code-execution surface. The `returns` envelope double-encodes the same way; the transport is symmetric. This completes wave 1's "array of strings only".
3. **`path.sep` reads back `undefined`** even though `sep` is listed among the module's exports; `path.default.sep` answers correctly. A rule written as `root + path.sep` silently becomes `root + "undefined"` and then rejects everything — which looks exactly like a clean pass. It cost me one empty run before I caught it.
4. **`@caido-community/dev@0.1.7` cannot build ANY backend plugin without `typescript` installed**, including a plugin written in plain JavaScript, because tsup 8.3.5's bundled dist does an unconditional top-level `require('typescript')` despite declaring it an optional peer. It also requires a `README.md` in the project root or the bundle step throws. **Both belong in DIST-05's setup requirements.**
5. **`caido-dev` builds cleanly under TypeScript 7.0.2** despite developing against 5.7.2 — 505 KB bundle in 110 ms, no compiler-API incompatibility. No fallback to 5.7.2 was needed.
6. **`corpus/composite-8mb.js` is not valid JavaScript.** See Deviations.

## Deviations from Plan

### Approved at checkpoint

**1. `typescript` 7.0.2 installed; plan verification 5 amended.**
The Tier-1 build was impossible without it (finding 4 above). I stopped rather than installing, per the package-install exclusion and the plan's own "this plan installs nothing" invariant, and the operator approved latest. **`pnpm-lock.yaml` and `package.json` therefore changed, and that is expected and approved** — verification 5 no longer holds as written, and threat register T-00-2SC's "no package-manager install occurs here" is superseded, because 00-01 could not have installed typescript when nobody knew `caido-dev` needed it. Legitimacy verified live at the gate: github.com/microsoft/TypeScript, 225,722,105 weekly downloads, first published 2012-10-01, maintainers microsoft1es / typescript-bot / weswigham / andrewbranch, **no install-time scripts** (no preinstall/install/postinstall/prepare). It satisfies tsup's declared peer range `>=4.5.0`.

### Auto-fixed

**2. [Rule 1 - Bug] `onInterceptResponse` never fired; 34 responses, zero rows.**
Found during Task 1 verification. Fixed by making `init` async and awaiting the imports so the event registration happens on the init stack. The failed run is committed as evidence (`runs/20260820T125759Z-22096`) because the current code no longer reproduces it. Commit `75188b9`.

**3. [Rule 1 - Bug] SPIKE-09's atomicity verdict was confounded.**
The first version read zero rows after the failed batch and concluded "atomic". It was not proof — the batch's own pooled connection still held an open write transaction and no other connection could see its rows either way. Caught because the follow-up write failed with `SQLITE_BUSY`. Fixed by reading from a fresh connection pool after a plugin restart, and by moving the pool test before the batch so it is not poisoned. The weak instrument (bare COMMIT/ROLLBACK) is retained but explicitly labelled as weak in the analyser. Commit `c82fd4b`.

**4. [Rule 1 - Bug] `path.sep` undefined made SPIKE-12 measure nothing.**
Every fixture was rejected by the containment rule and not one write was attempted — a silently empty measurement that still looked like a clean pass. Fixed with a recorded fallback that reports which source answered. Commit `c82fd4b`.

**5. [Rule 1 - Bug] `corpus/composite-8mb.js` does not parse.**
Plan 00-01's `fetch-corpus.sh` builds it as `cat monaco plotly`; monaco ends with a `//# sourceMappingURL=` comment and **no trailing newline**, so plotly's opening `/**` is swallowed into that line comment. meriyah fails at `[799:0]` with `Unexpected token: '*'`, acorn with "Unterminated regular expression". This would have poisoned Phase C in a way that looks like a ceiling: the escalation starts at 8 MB, so **every step would have "failed" for a syntax reason and HARD_MAX_BYTES would have been recorded as ~8 MB.** Fixed by building `corpus/big/composite-8mb-parsable.js` — the same two distinct bundles joined with a newline-semicolon-newline. **`fetch-corpus.sh` was not modified**, because plan 00-03 is running against it concurrently. Commit `eecf8da`.

**6. [Rule 3 - Blocking] Missing `README.md`.**
`caido-dev`'s bundle step requires one in the project root. Wrote a real one describing the repo rather than a placeholder. Commit `eecf8da`.

**7. [Rule 2 - Correctness] Schema field collision caught by the gate.**
My symlink measurement used a key `stat` to hold the `fs.statSync` payload; `stat` is reserved in `spike-result.schema.json` for the statistic kind. **I renamed the data, not the enum.** Commit `c82fd4b`.

### Judgement calls

**8. Task 3 was executed before Task 2.**
When Task 2 blocked, Tasks 2 and 3 shared no state — Task 3 uses only the Tier-0 probe — and Task 2's precondition was already satisfied. Running Task 3 first delivered two of the four spikes before the human gate instead of none.

**9. The HARD_MAX_BYTES boundary was deliberately not bisected.**
Two reasons, both recorded in `_hardmax-boundary.json`. First, the only failure class was `timeout`: bisecting it would have measured my own 900 s call-budget constant rather than any property of the runtime. Second, each step drove the host into swap — free pages fell to ~57 MB — and **that pressure is host-wide, not confined to the disposable instance the way threat T-00-22 assumed**, with the operator's live Caido and real project data running on 8080 throughout. I stopped the escalation, reported the bracket as measured, and labelled the ceiling time-bound. The gate still gets a real non-null number; what it does not get is false precision.

**10. RSS ratio fitted below 50 MB only.**
The large escalation points show ratios falling monotonically — 106, 107, 100, 77, 56, 41 — as inputs grow. A linear allocator cannot get cheaper per byte at scale; the host was evicting and RSS stopped tracking demand. Including them would have understated the ratio by more than half and every downstream memory budget would have inherited it. The excluded points and the reason are both in the threshold rationale.

**11. Runner and analyser scripts added beyond `files_modified`.**
`run-spike-08.sh`, `run-spike-09-12.sh`, `analyse-spike-06.py`, `analyse-spike-08.py`, `analyse-spike-09-12.py`. The plan named the spikes but no runners; following wave 1's precedent, putting the logic in committed scripts keeps every result regenerable rather than the product of an untracked one-off command. No result file was hand-edited.

**12. `.gitignore` extended.**
`ladder.sh` copies per-operation stderr into `runs/*/raw/`, which the existing one-level rule did not cover. Rather than ship raw host logs, the abort-signature **scan result** is now recorded inside `SPIKE-06.json` itself, so the evidence survives as an assertion.

## Threat Mitigations Applied

| Threat | Verified |
|---|---|
| T-00-21 | SPIKE-12 ran last, alone, on a fresh instance; every write target inside its own data path; targeted before/after witness across `/tmp`, `$HOME`, `/etc`, `/var/tmp` and the repo; `containment.escaped` recorded as a hard field the gate asserts. The symlink experiment was deliberately retargeted inside the data path so it could prove an escape from the scratch root without escaping the data path. |
| T-00-22 | **Partially superseded — see deviation 9.** The DoS is not confined to the disposable instance: memory pressure is host-wide. Escalation stopped rather than accepted. |
| T-00-23 | Corpus parsed and hashed, never evaluated. `eval`/`new Function` appear in no probe. Separately proven: the function REST endpoint is `JSON.parse`, not eval. |
| T-00-24 | Every instance via `instance.sh`, `127.0.0.1` only, 8080 refused unconditionally. Operator's pid 90236 untouched throughout. |
| T-00-25 | SPIKE-08 ran first; SPIKE-06's precondition asserted `SIZE_GATE_SOURCE` non-null; every byte threshold names the quantity. |
| T-00-26 | Data paths removed at teardown; raw logs gitignored including the new `raw/*.log` path; all four results scanned clean of credentials. |
| T-00-2SC | **Superseded by the approved checkpoint.** One install, human-verified, no install-time scripts. |

## For Plan 00-04

- **`corpus/composite-8mb.js` does not parse.** Anything that parses it gets a syntax error, not a size measurement. Use `corpus/big/composite-8mb-parsable.js` or rebuild with a separator.
- **`HARD_MAX_BYTES` is time-bound**, not a memory ceiling. Do not present it as "where the runtime breaks" in the go/no-go table.
- **The `acorn.tokenizer()` degradation path saves no CPU.** If the table implies a cheaper fallback exists, it is wrong.
- **`MULTISTATEMENT_EXEC_ATOMIC: true` carries a caveat** — a failed batch locks its pooled connection until the plugin restarts.
- **SPIKE-12 is macOS-only.** The case and Unicode-normalisation results do not generalise.
- **`REQUIREMENTS.md`'s SPIKE-12 wording is now factually wrong** — it reads "with no `realpath` and no `lstat` available", and `lstat` is available. I left the requirement text untouched because that file is the ID authority and plan 00-03 may be writing to it; the correction lives in `SPIKE-12.json`. Someone should fix the wording before Phase 7 reads it as a constraint.
- `SPIKE-10` gained one more session (4,529 rows, 1,397 hashes, 80/80 loads). Still **one distinct day** — my session fell on the same calendar day as wave 1's, so the cross-day denominator is still 0.

## Known Stubs

None. No placeholder values, no unwired data paths, no TODO/FIXME introduced.

## Self-Check: PASSED

All 18 claimed files exist on disk (including `tier1/parse/dist/index.js`, the Tier-1 build artifact the verify gate asserts) and all 4 claimed commits resolve in git. Full vitest suite green at 29/29, with all four new result files validating against `spike-result.schema.json` and reporting `binary.reported_version` 0.57.1.
