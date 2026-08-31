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
