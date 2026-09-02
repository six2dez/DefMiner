---
phase: 07-sourcemap-reconstruction
plan: 12
status: in-progress
---

# Phase 7 Plan 12: The Key Names The Bundle — Summary (IN PROGRESS)

> This file was created BEFORE any edit to `migrations.ts`, to satisfy Task 1's
> first acceptance criterion: "An option letter and a date are recorded in
> `07-12-SUMMARY.md` before any edit to `migrations.ts`." It is rewritten in full
> when tasks 2, 3 and 4 land. `status: in-progress` until then.

## Task 1 — the fifth one-way `EXPECTED_TABLES` approval: RECORDED

**Option: A — approve as specified.**
**Date answered: 2026-09-02.**
**Gate: `blocking-human`.** Not auto-approved; the operator answered explicitly.

Option A as the checkpoint stated it: the four-column primary key
`(project_id, artifact_sha256, map_sha256, source_index)`; migration `v: 9` as a
`v: 7`-shaped table rebuild; `EXPECTED_TABLES` byte-unchanged at eight members
with a fifth approval event added to its doc comment carrying today's date and
this plan's id; the interim guard and its counter removed in the same plan.

The operator additionally confirmed both explicit points the checkpoint asked for:

1. The approval event MAY be written into `EXPECTED_TABLES`'s doc comment, naming
   plan **07-12** and date **2026-09-02**.
2. Both occurrences of the approval count advance **FOUR → FIVE**, while the
   array-length word **`eight` stays byte-identical**.

### The four numbers measured at HEAD (`8744be0`) before any edit

| Command over `packages/backend/src/store/schema.spec.ts` | At `8744be0` | Required after Task 3 |
|---|---|---|
| `grep -c 'FOUR'` | 2 | 0 |
| `grep -c 'FIVE'` | 0 | 2 |
| `grep -c 'The eight tables the operator approved'` | 1 | 1 (byte-unchanged) |
| `grep -c '07-12'` | 0 | ≥ 1 |

### Scope the approval does NOT extend to

No foreign key. No `ON DELETE CASCADE`. No content column. No new table. D-07 is
unamended and `FORBIDDEN_COLUMNS` stays green. `sources` (PK
`(project_id, source_sha256)`) is entirely untouched. The eviction cascade for
these tables is plan 07-13's anti-join — deliberately not a foreign key, so it
needs no schema change and no sixth approval.

Tasks 2, 3 and 4 proceed under option A.
