# Phase 05: Workspace & Operator Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-28
**Phase:** 05-workspace-operator-workflow
**Areas discussed:** Irreversible actions

---

## Area selection

Four gray areas were presented. The operator selected one.

| Option | Description | Selected |
|--------|-------------|----------|
| Query contract vs. SQL gate | UI-SPEC mandates server-side filter/sort with keyset pagination and bans client-side sorting, but `sql-discipline.spec.ts` statically bans interpolated and concatenated SQL across the whole backend. Fixed literal matrix, allowlisted identifier-enum builder, or null-guard params? Ad-hoc `sdk.api.register` or a typed versioned contract? | |
| Absent entity schemas | Phase 5 depends on Phase 4; Phases 2–4 are unplanned and `entities`/`evidence` do not exist. Does Phase 5 define the contract Phases 3/4 must satisfy, or build only over the shipped tables? | |
| Triage, suppression, audit | OPS-01…04 plus STORE-08's `audit` table, which Phase 5 owns and nothing specifies. Query-time filter or write-time block? Retroactive? Do suppressed findings still count in totals? What identity does triage key on? | |
| Irreversible actions | FIND-01 dedupe key composition, projection batch cap, and whether exports go to server disk or a browser download. | ✓ |

**Notes:** The three unselected areas are recorded in CONTEXT.md as O-01, O-02 and O-03 —
explicitly open, not defaulted. O-02 is flagged as potentially gating whether the phase is
plannable as scoped.

---

## Irreversible actions

### Q1 — What composes the `dedupeKey` for a projected secret?

| Option | Description | Selected |
|--------|-------------|----------|
| Fingerprint + detector + host | One Finding per unique secret, per detector, per host. Survives bundle rebuilds; separates the same key on two hosts as two exposures. `detector_set_hash` excluded so a corpus bump does not re-project everything. | ✓ |
| Fingerprint only | One Finding per unique secret per project, ever — the absolute floor on permanent noise. Costs visibility of multi-host exposure from the Findings tab. | |
| Include artifact digest | Exact provenance per bundle. Trap: a daily-rebuilt bundle writes a fresh permanent Finding for the same unrotated key every day. | |

**User's choice:** Fingerprint + detector + host.
**Notes:** Grounded in `sdk.findings.create({ title, description, reporter, request, dedupeKey })`
having no update and no delete, `exists(dedupeKey)` being the only guard, and PITFALLS P2 rating an
FP flood PROJECT-SINKING with HIGH, manual-only recovery.

### Q2 — Which request does a projected Finding attach to, and what if it no longer resolves?

| Option | Description | Selected |
|--------|-------------|----------|
| Newest resolvable observation | Walk newest-first through `sdk.requests.get`; if none resolve, the row shows as unprojectable with the reason and the batch proceeds. | ✓ |
| First-seen, pinned at detection | Stable and reproducible, but the earliest observation is exactly what the retention sweep (50k rows / 90 days) deletes first. | |
| Newest, plus re-verify body hash | Same walk plus a fail-closed digest re-check before the irreversible write. Costs one serial reload per row on the single QuickJS thread. | |

**User's choice:** Newest resolvable observation.
**Notes:** `findings.create` requires a `Request` object rather than an id, so resolution through
`sdk.requests.get` is forced at projection time regardless of which option was chosen. The rejected
hash re-verification is preserved in CONTEXT.md's Deferred Ideas.

### Q3 — How is a projection batch bounded so "review row by row" stays true?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-row opt-in, no numeric cap | Every row starts unchecked, no select-all; the batch is bounded by effort, and nothing permanent is written that was not individually chosen. | ✓ |
| Hard cap per batch | At most N (25) rows per batch. Forces review by construction; the number is arbitrary and it penalises a target that legitimately has many. | |
| Select-all with typed confirmation | Fast for a trusted tier, but pre-selection makes "write everything" the default and a typed number confirms the count, not that anyone read the rows. | |

**User's choice:** Per-row opt-in, no numeric cap.
**Notes:** This closes the `overflow / findings-projection-preview` row that `05-UI-SPEC.md`
`## UI Considerations` left `⚠ unresolved`.

### Q4 — Where does an export land?

| Option | Description | Selected |
|--------|-------------|----------|
| Browser download over the RPC | Backend serialises, frontend builds a Blob and downloads to the operator's machine. No server file: nothing to quota, orphan-clean, label or reach, and identical on desktop, remote CLI and Docker. A raw export never touches shared server disk. | ✓ |
| Server file now, Phase 6 delivers | Matches the UI-SPEC copy and the roadmap's phase split, but the file is unreachable on remote or Docker until Phase 6, and a raw export sits in cleartext on shared disk meanwhile. | |
| `sdk.hostedFile` now | Solves reachability immediately, but pulls DEPLOY-03's expiry/redaction and DEPLOY-04's quotas and orphan cleanup into Phase 5. | |

**User's choice:** Browser download over the RPC.
**Notes:** Creates a follow-up against `05-UI-SPEC.md` `## Copywriting Contract` — the raw-export
confirmation's "It is written to the Caido server and is your responsibility from that point on"
is now factually wrong and must be amended. R5's server-path labelling still governs any path the
Settings surface displays.

---

## Raised but not resolved

Surfaced during this area and left open in CONTEXT.md as O-04, O-05 and O-06:

- Sanitisation of target-controlled bytes inside a Finding's `title`/`description`. These render in
  Caido's own UI, outside DefMiner's DOM, so UI-SPEC R1/R2 do not reach them — and unlike a table
  cell they can never be re-rendered, because Findings are immutable.
- Whether projection is blocked, not merely warned, when contributing artifacts are `partial` or
  `failed`.
- The exact composition of the high-signal tier in Phase 5, given network validation ships later
  and OFF by default.

The operator was offered a follow-up round covering these and chose to proceed to context instead.

## Claude's Discretion

None. Every question in this area received an explicit operator choice; no question was answered
with "you decide", and nothing undiscussed was defaulted — the unselected areas are recorded as
open questions rather than as decisions.

## Deferred Ideas

- `sdk.hostedFile` delivery, server-disk quotas and orphan cleanup — stays in Phase 6, and D-04
  removes the export path's need for it.
- Re-verifying an artifact's body hash before every projection — rejected on serial reload cost;
  revisit if projection FP rates prove worse than the corpus predicts.
- Cross-deploy diffing / the "Deployment Diff" panel from `CODEX-CONTRAST.md` §4.9 — already
  deferred to v2 as DIFF-01, blocked on the unsolved asset-identity problem.
