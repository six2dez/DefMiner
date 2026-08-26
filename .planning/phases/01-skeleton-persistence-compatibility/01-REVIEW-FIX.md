---
phase: 01-skeleton-persistence-compatibility
reviewed_at: 2026-08-27
base_commit: dca732c
implementation_head: 270e8a0
verdict: AUTOMATED_AUDIT_PASS_WITH_OPEN_PHASE_VERIFICATION
---

# Autonomous audit and fix closure

## Verdict

The code, build, package, dependency graph and authored shell drivers have no
remaining finding that both reproduces and is safe to repair autonomously. The
packaged backend also passed a fresh end-to-end tracer run on real Caido 0.58.2.

This is **not** the Phase 01 verdict. Verification pass 12 still owns the
CORE-11 checkbox and the live security-register adjudication. This review does
not change either record.

## Closed findings

| ID    | Severity                | Demonstrated condition                                                                                                                                                               | Resolution                                                                                                                                             | Commit    |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| AF-01 | Medium                  | Retention swept five times after 128 processed entries plus three missing reloads; the contract requires two processed-count boundaries                                              | Track the last processed count swept and pin the exact two-pass result                                                                                 | `a142488` |
| AF-02 | Medium                  | MIME substring matching admitted JSON/HTML parameter text containing `javascript`/`ecmascript`, rejected valid parameter names containing `module`, and missed `text/livescript`     | Parse the MIME essence and compare it to an exact JavaScript MIME allowlist                                                                            | `6583c68` |
| AF-03 | High                    | Passive-hook and compatibility error surfaces emitted target URLs, query secrets, hosts and operator paths without the shared redactor                                               | Route both surfaces through `describeError`; add behavioural leak checks                                                                               | `0f60af1` |
| AF-04 | High (scanner)          | `pnpm audit` reported 22 build/dev transitive advisories: 5 high, 13 moderate and 4 low                                                                                              | Pin the first fixed transitive versions with pnpm 11 workspace overrides                                                                               | `790a193` |
| AF-05 | Low                     | Production telemetry, queue and compatibility modules carried 179 lines of unused state/API and an unsupported concurrency claim                                                     | Remove dead surfaces and state the consumer's real sequential precondition                                                                             | `2efd48f` |
| AF-06 | Medium                  | The bundle spec secretly built the bundle it claimed to inspect; README/package copy and the manifest described a stale/no-code state                                                | Make `pretest` build explicitly, keep the bundle spec observational, and align package documentation/manifest                                          | `4f88137` |
| AF-07 | High                    | Windows/UNC paths, quoted paths with spaces and schemeless host references could cross error/status boundaries; labelled values also exposed edge cases                              | Add a linear string scanner for POSIX, drive, UNC, quoted and schemeless-host carriers; preserve negative diagnostic controls and the one-regex gate   | `444c355` |
| AF-08 | Informational hardening | Gitleaks found 28 historical matches, all introduced as synthetic credential-shaped test payloads or their reports                                                                   | Baseline exact historical fingerprints only; no rule or path is globally exempted                                                                      | `1236670` |
| AF-09 | Medium                  | ShellCheck found a real same-`local` expansion bug: `make_big` constructed its filename before `mb` had its assigned value; it also found dead driver state and unsafe/opaque idioms | Split dependent assignments, remove dead state, retain literal GraphQL/Python quoting with explicit reasons, and make all authored shell scripts clean | `a9799bc` |

Formatting-only normalization for the early fixes is isolated in `995e595`.

## Verification evidence

### Static and package gates

- `pnpm test`: 31 files, 1,390 tests, zero failures. `pretest` rebuilt the real
  plugin first.
- `pnpm typecheck`, `pnpm lint`, `pnpm knip`: exit 0.
- `pnpm check:bundle`: the built backend has exactly one import specifier,
  `crypto`.
- `pnpm audit --audit-level low`: no known vulnerabilities.
- Semgrep TypeScript/Node rules over `packages/backend/src` and
  `packages/engine/src`: zero findings.
- ShellCheck over every tracked `*.sh`, followed by `bash -n` over every changed
  driver: zero findings.
- Gitleaks over 373 commits after exact-fingerprint baselining: zero unignored
  findings. A staged scan over the fresh runtime evidence also returned zero.

### Clean-build proof

With both ignored `dist` directories moved aside, running the bundle spec alone
failed on the three real-bundle cases and did not recreate either directory.
`pnpm test` then visibly ran `pretest`, rebuilt the backend/package and passed.
This distinguishes a build-dependent test from a self-fulfilling test.

### Real Caido proof

Run `20260826T224147Z-25836` installed the newly built package into an isolated
Caido 0.58.2 instance on port 8971 and proxied two local JavaScript responses.
It demonstrated:

- one content-addressed artifact with `seen_count = 2`;
- two observations with two distinct request IDs;
- host SHA-256 equal to the digest read back from the plugin database;
- `reloadHit = 2`, zero reload misses, zero queue overflow and zero hook,
  consumer or store errors;
- all query-pair, bare-segment, path-parameter and padded tracer-dye forms absent
  from both the raw SQLite column and the RPC projection;
- database opened read-only from outside Caido, with 14 schema objects visible.

Only the sanitized 11-file evidence set is committed in
`results/runs/20260826T224147Z-25836/`. Caido's debug logs contain the synthetic
per-run tracer dyes and remain ignored; they were not force-added.

## Deliberately open or bounded

1. **Verification pass 12 / CORE-11.** All 45 plans have summaries, and the
   outbound suite is green, but the phase's own contract assigns this checkbox
   and security-register transition to the next verifier. They remain open.
2. **Three-leg compatibility rerun.** The original harness needs real Caido
   0.57.1, 0.58.0 and 0.55.3 binaries. This host has the pinned 0.58.0 fixture
   and old 0.55.3 fixture, but the app bundle auto-updated to 0.58.2 and 0.57.1
   is unavailable. The historical matrix was not relabelled or fabricated. The
   new tracer establishes install/ingest/store behaviour on 0.58.2, not the
   missing three-leg comparison.
3. **Error-text ambiguity.** An unquoted path ends at whitespace; the structured
   user-bearing prefix is redacted and the tail remains diagnostic text. A
   dotted relative source prefix followed by `/`, `?` or `#` is instead treated
   as a schemeless host and redacted. Tests pin both sides of this privacy versus
   diagnosis boundary.
4. **Tracer userinfo reachability.** Curl converts URL userinfo into an
   `Authorization` header before Caido sees the request URL. The runtime run
   therefore does not attest the userinfo URL grammar; the SQLite behavioural
   tests remain the evidence for that branch.
5. **Dependency drift.** New majors exist for ESLint, Knip and TypeScript, and a
   newer Caido SDK exists. They are compatibility-contract changes, not security
   fixes. This audit leaves the measured Caido 0.57.1 SDK and TypeScript 5 tool
   chain pinned rather than silently redefining the phase baseline.

## Stopping rule

Resume autonomous fixes only when a new condition can be reproduced against the
current tree, or when verification pass 12 produces a concrete finding. Do not
reopen the closed items above from prose alone, and do not mark CORE-11 complete
from this report.
