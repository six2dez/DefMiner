---
phase: 07-sourcemap-reconstruction
plan: 22
subsystem: api
tags: [export, redaction, sourcemap, disclosure, docblock, vitest]
status: in-progress
---

# Phase 07 Plan 22: Loader-query disclosure direction — DECISION RECORD

> **This file is being written incrementally.** Task 1 of `07-22-PLAN.md` requires the
> option letter and its date to be recorded here BEFORE any edit to
> `packages/backend/src/store/export.ts`. This commit is that record and nothing else;
> tasks 2 and 3 fill in the rest.

## Task 1 — CHECKPOINT: is a loader query analytic content, or a residual to cut?

**Option letter: `A` — split the two axes.**
**Date answered: 2026-09-02.**
**Answered by: the operator**, in response to this plan's `<options>` block presented verbatim
with its costs, and with the recommendation's premise explicitly marked rejectable.

### The premise the operator was asked to accept or reject

> A `?` appearing in a `sources` label emitted by a bundler is a loader or URL artifact
> rather than part of a source name.

**The operator ACCEPTED it.** They were shown, in the same breath, that this is
PROBABILISTIC about what bundlers emit and NOT absolute about what a name may legally
contain — that `?` is a reserved delimiter in URI syntax (RFC 3986) and is rejected by
the Win32 API, but that APFS and ext4 both accept it and reject only `/` and NUL, which
was measured on this machine by creating `what?.txt` successfully, and which
`export.spec.ts` already anticipated by carrying `src/gen/what?.ts` in its byte-budget
`extra` array. They were told plainly that **option B was the correct choice if they
judged a `?` could legitimately be part of a source name**. They selected A under that
framing.

### The withholding sentence written into the docblock

The operator answered with the letter and the premise verdict; they did **not** dictate a
separate sentence of their own wording. The sentence recorded here and written verbatim
into `export.ts`'s docblock is therefore **option A's own defining text, as presented to
and accepted by the operator**, quoted rather than paraphrased so the docblock carries the
words the decision was actually made against:

> A non-protocol label is cut at the first `?` only, with the SHIPPED marker appended, and
> keeps its `#` tail.

This substitution is recorded as a deviation below (see `## Deviations from Plan`) rather
than presented as an operator quotation it is not.

### What A does and does not change

| | Behaviour |
|---|---|
| Protocol-shaped label | Unchanged. Keeps delegating to `redactUrlForExport` — query AND fragment cut. |
| Non-protocol label with a `?` | **CHANGES.** Cut at the first `?`, shipped marker appended. Restores the pre-07-16 safe-mode behaviour on the query axis. |
| Non-protocol label with a `#` and no `?` | Unchanged. Keeps its tail, acquires no marker — LO-04's fix, untouched. |
| `observations.url` | Unchanged. `redactUrlForExport` is not edited and this column never reaches `redactSourceLabelForExport`. |

Branches **B and C do not apply and were not executed.** C in particular would have
halted this plan rather than run, because it reopens LO-04.
