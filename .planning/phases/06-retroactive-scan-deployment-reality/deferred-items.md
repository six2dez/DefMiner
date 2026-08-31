## Deferred by plan 06-06 (2026-08-31)

- **`outbound-prohibition.spec.ts`'s residual byte-compare against `.planning/REQUIREMENTS.md` fails,
  and it is not 06-06's.** Last commit to touch either input is `532491a` (06-07's close-out). The
  shipped block gained three blank lines the generator does not emit. 06-06 modified neither input.
  Recorded as WINDOWS 85 with the exact remedy (the spec prints the authoritative bytes).
- **`sql-discipline.spec.ts`'s leading-keyword blind spot.** Widening the gate to split multi-statement
  blobs on `;` was put to the operator and declined for this plan as unbudgeted scope. WINDOWS 84.
- **`ScanStatusPayload.analysed` stays `null`.** Window 65 named 06-06 as owner; the wiring needs
  either a new `scans` column (another one-way migration) or the telemetry retro sub-map, neither in
  this plan's `files_modified`. Re-owned to 06-09 in WINDOWS 86.

## From 06-10 (the deployment matrix)

- **The SPIKE-10 recorder instance recorded in `STATE.md` is no longer running.** `STATE.md` names
  pid 79273 on `127.0.0.1:8998` with `.spike/recorder-data`, deliberately left alive and not this
  phase's to reap. At 06-10's close-out that pid does not exist and nothing is LISTENing on 8998,
  while the machine has been up 9 days (so no reboot explains it) and `.spike/recorder-data` has not
  been written since 21 Aug — ten days before this plan ran.

  **This plan did not kill it, and the claim is checkable rather than asserted:** no script under
  `scripts/phase6/` references 8998 at all, the matrix owns 8951-8955, `instance.sh`'s teardown
  SIGKILLs only the pid it launched, and the container teardown removes only `$OWN_CONTAINER`. The
  operator's live desktop instance on 8080 (pid 79244) is still running, which is the same protection
  working on the port that was actually adjacent to this run.

  Out of scope for 06-10 under the scope boundary — it is a pre-existing condition in a file this
  plan does not own. What needs doing is a `STATE.md` correction, and, if the SPIKE-10 cache-rate
  numbers still need extending, a fresh recorder. Left named rather than fixed.
