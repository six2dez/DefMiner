# Phase 1 — Probe Report and Disposition Ledger

**Produced:** 2026-08-20 by `/gsd-plan-phase 1` (spec-less probe fallback: this phase has no SPEC, so both
`EDGE_ABSENT` and `PROHIB_ABSENT` were set and the planner ran the probe protocol itself).

This file exists so the no-silent-drop equality is **checkable rather than asserted**. The edge probe surfaced
38 applicable items; every one is listed below with where it was authored. `(# probe-surfaced) == (# authored
into must_haves) + (# surfaced as flagged assumptions)` — 38 == 27 + 11.

---

## A. Edge probe — deterministic engine output (verbatim)

```json
{
 "coverage": { "applicable": 38, "resolved": 0, "unresolved": 38, "byVerification": { "explicit": 0, "backstop": 0 } },
 "items": [
  { "requirement_id": "CORE-01", "category": "concurrency",  "status": "unresolved", "probe": "If interrupted or run in parallel, what is guaranteed?" },
  { "requirement_id": "CORE-02", "category": "unclassified", "status": "unresolved", "probe": "unclassified — review manually" },
  { "requirement_id": "CORE-03", "category": "boundary",     "status": "unresolved", "probe": "What happens exactly at each min/max/threshold — and one step either side?" },
  { "requirement_id": "CORE-03", "category": "adjacency",    "status": "unresolved", "probe": "When two things are exactly equal or just touch, do they merge, collide, or separate?" },
  { "requirement_id": "CORE-03", "category": "empty",        "status": "unresolved", "probe": "What is the result for empty, single-element, or null input?" },
  { "requirement_id": "CORE-03", "category": "ordering",     "status": "unresolved", "probe": "When elements compare equal, is output order specified and stable?" },
  { "requirement_id": "CORE-03", "category": "precision",    "status": "unresolved", "probe": "Where can precision loss, overflow, or rounding/tie-breaking occur — and what is the exact contract?" },
  { "requirement_id": "CORE-04", "category": "unclassified", "status": "unresolved", "probe": "unclassified — review manually" },
  { "requirement_id": "CORE-05", "category": "concurrency",  "status": "unresolved", "probe": "If interrupted or run in parallel, what is guaranteed?" },
  { "requirement_id": "CORE-06", "category": "adjacency",    "status": "unresolved", "probe": "When two things are exactly equal or just touch, do they merge, collide, or separate?" },
  { "requirement_id": "CORE-06", "category": "empty",        "status": "unresolved", "probe": "What is the result for empty, single-element, or null input?" },
  { "requirement_id": "CORE-06", "category": "ordering",     "status": "unresolved", "probe": "When elements compare equal, is output order specified and stable?" },
  { "requirement_id": "CORE-07", "category": "boundary",     "status": "unresolved", "probe": "What happens exactly at each min/max/threshold — and one step either side?" },
  { "requirement_id": "CORE-07", "category": "precision",    "status": "unresolved", "probe": "Where can precision loss, overflow, or rounding/tie-breaking occur — and what is the exact contract?" },
  { "requirement_id": "CORE-08", "category": "unclassified", "status": "unresolved", "probe": "unclassified — review manually" },
  { "requirement_id": "CORE-09", "category": "unclassified", "status": "unresolved", "probe": "unclassified — review manually" },
  { "requirement_id": "CORE-10", "category": "boundary",     "status": "unresolved", "probe": "What happens exactly at each min/max/threshold — and one step either side?" },
  { "requirement_id": "CORE-10", "category": "precision",    "status": "unresolved", "probe": "Where can precision loss, overflow, or rounding/tie-breaking occur — and what is the exact contract?" },
  { "requirement_id": "STORE-01", "category": "unclassified","status": "unresolved", "probe": "unclassified — review manually" },
  { "requirement_id": "STORE-02", "category": "adjacency",   "status": "unresolved", "probe": "When two things are exactly equal or just touch, do they merge, collide, or separate?" },
  { "requirement_id": "STORE-02", "category": "empty",       "status": "unresolved", "probe": "What is the result for empty, single-element, or null input?" },
  { "requirement_id": "STORE-02", "category": "ordering",    "status": "unresolved", "probe": "When elements compare equal, is output order specified and stable?" },
  { "requirement_id": "STORE-03", "category": "unclassified","status": "unresolved", "probe": "unclassified — review manually" },
  { "requirement_id": "STORE-04", "category": "unclassified","status": "unresolved", "probe": "unclassified — review manually" },
  { "requirement_id": "STORE-05", "category": "unclassified","status": "unresolved", "probe": "unclassified — review manually" },
  { "requirement_id": "STORE-06", "category": "unclassified","status": "unresolved", "probe": "unclassified — review manually" },
  { "requirement_id": "STORE-07", "category": "adjacency",   "status": "unresolved", "probe": "When two things are exactly equal or just touch, do they merge, collide, or separate?" },
  { "requirement_id": "STORE-07", "category": "empty",       "status": "unresolved", "probe": "What is the result for empty, single-element, or null input?" },
  { "requirement_id": "STORE-07", "category": "ordering",    "status": "unresolved", "probe": "When elements compare equal, is output order specified and stable?" },
  { "requirement_id": "COMPAT-01", "category": "boundary",   "status": "unresolved", "probe": "What happens exactly at each min/max/threshold — and one step either side?" },
  { "requirement_id": "COMPAT-01", "category": "empty",      "status": "unresolved", "probe": "What is the result for empty, single-element, or null input?" },
  { "requirement_id": "COMPAT-01", "category": "encoding",   "status": "unresolved", "probe": "Whose definition of length/equality applies — bytes, code points, grapheme clusters, or normalized form?" },
  { "requirement_id": "COMPAT-01", "category": "precision",  "status": "unresolved", "probe": "Where can precision loss, overflow, or rounding/tie-breaking occur — and what is the exact contract?" },
  { "requirement_id": "COMPAT-02", "category": "unclassified","status": "unresolved", "probe": "unclassified — review manually" },
  { "requirement_id": "ENC-01", "category": "empty",         "status": "unresolved", "probe": "What is the result for empty, single-element, or null input?" },
  { "requirement_id": "ENC-01", "category": "encoding",      "status": "unresolved", "probe": "Whose definition of length/equality applies — bytes, code points, grapheme clusters, or normalized form?" },
  { "requirement_id": "DIST-05", "category": "unclassified", "status": "unresolved", "probe": "unclassified — review manually" },
  { "requirement_id": "DIST-06", "category": "concurrency",  "status": "unresolved", "probe": "If interrupted or run in parallel, what is guaranteed?" }
 ]
}
```

## B. Disposition ledger — every item, and where it landed

Resolution rules applied (`--auto`, per `gsd-core/references/specless-probe-fallback.md`): a defensible
acceptance criterion → `resolved` / **explicit** → a plain string in `must_haves.truths`; otherwise
`resolved` / **backstop** → a flat-scalar `{ statement, verification: backstop }` marker in
`must_haves.truths`; `category: "unclassified"` → stays **`unresolved`**, never auto-resolved with backstop,
surfaced as a flagged planner assumption. Nothing was auto-dismissed.

| # | Req | Category | Status | Verification | Authored into | Truth (abbreviated) |
|---|-----|----------|--------|--------------|---------------|---------------------|
| 1 | CORE-01 | concurrency | resolved | explicit | 01-01 `truths` | Two hook invocations arriving while the consumer is mid-await both enqueue; the hook never awaits, so no re-entrancy can interleave inside it |
| 2 | CORE-02 | unclassified | **unresolved** | — | 01-03 flagged assumption | Gate axis order (status → size → kind → scope), first failure names the reason |
| 3 | CORE-03 | boundary | resolved | explicit | 01-03 `truths` | Exactly `cap` → overflow 0, depth cap; `cap + 1` → overflow 1, depth cap |
| 4 | CORE-03 | adjacency | resolved | explicit | 01-03 `truths` | Cap 500 constructs, cap 499 throws |
| 5 | CORE-03 | empty | resolved | explicit | 01-03 `truths` | Fresh queue: depth 0, overflow 0, take returns undefined not throw |
| 6 | CORE-03 | ordering | resolved | explicit | 01-03 `truths` | Strict FIFO; overflow discards oldest; retained window is the most recent `cap` in arrival order |
| 7 | CORE-03 | precision | resolved | explicit | 01-03 `truths` | Overflow count +1 per drop exactly, never reset by a take; after N overflows equals N |
| 8 | CORE-04 | unclassified | **unresolved** | — | 01-03 flagged assumption | "Exactly one consumer" = one drain loop per runtime, not per project or per queue |
| 9 | CORE-05 | concurrency | resolved | explicit | 01-01 `truths` | No SDK object across any await; `get` returning undefined increments a miss counter rather than throwing |
| 10 | CORE-06 | adjacency | resolved | explicit | 01-03 `truths` | 65536 bytes → one window; 65537 → two windows overlapping exactly 4096 with no gap |
| 11 | CORE-06 | empty | resolved | explicit | 01-03 `truths` | Zero-length → zero windows, non-partial, max slice 0, yield never called |
| 12 | CORE-06 | ordering | resolved | explicit | 01-03 `truths` | Strictly ascending; each window carries an ABSOLUTE offset, never chunk-relative |
| 13 | CORE-07 | boundary | resolved | explicit | 01-03 `truths` | Elapsed exactly equal to the deadline is expired; one tick below is not |
| 14 | CORE-07 | precision | resolved | explicit | 01-03 `truths` | Injected-clock deltas only; no wall clock, no time origin; millisecond float, no rounding |
| 15 | CORE-08 | unclassified | **unresolved** | — | 01-04 flagged assumption | "Never re-analysed" = no new analyses row at the same corpus version; counters and observation still update |
| 16 | CORE-09 | unclassified | **unresolved** | — | 01-05 flagged assumption | "Cancel in-flight" leaves the row non-terminal for ERR-02; queued entries from the old project are discarded, not re-attributed |
| 17 | CORE-10 | boundary | resolved | explicit | 01-05 `truths` | Max slice starts at 0, only ever raised; a single span equal to the budget records exactly that |
| 18 | CORE-10 | precision | resolved | explicit | 01-05 `truths` | Float ms from monotonic deltas, no rounding; the artifact value is identical to the computed value |
| 19 | STORE-01 | unclassified | **unresolved** | — | 01-01 flagged assumption | DDL at init before any write, `IF NOT EXISTS`; where `entities`/`evidence`/`audit` land (Phases 4 and 5) |
| 20 | STORE-02 | adjacency | resolved | explicit | 01-04 `truths` | Same digest under two projects = two rows; same digest one project = one row, `seen_count` incremented |
| 21 | STORE-02 | empty | resolved | explicit | 01-04 `truths` | Empty-string `project_id` reserved for global `settings` only; every other table rejects it |
| 22 | STORE-02 | ordering | resolved | explicit | 01-04 `truths` | Explicit deterministic ORDER BY, never rowid order; ties broken by `sha256` ascending |
| 23 | STORE-03 | unclassified | **unresolved** | — | 01-01 flagged assumption | Identity is `(project_id, sha256)`; URL is an observation attribute — same bytes, two URLs, one artifact |
| 24 | STORE-04 | unclassified | **unresolved** | — | 01-04 flagged assumption | Corpus version is an opaque `detector_set_hash` string; Phase 1 writes a distinguishable sentinel |
| 25 | STORE-05 | unclassified | **unresolved** | — | 01-04 flagged assumption | Monotonic integer steps, no down-migrations; "populated" means seeded rows survive and stay readable |
| 26 | STORE-06 | unclassified | **unresolved** | — | 01-04 flagged assumption | Row count AND age, whichever binds first; the sweep must be SCHEDULED, not merely available |
| 27 | STORE-07 | adjacency | resolved | explicit | 01-04 `truths` | Two adjacent placeholders bind left to right, proven by an upsert whose columns would visibly swap |
| 28 | STORE-07 | empty | resolved | explicit | 01-04 `truths` | Zero-placeholder statement runs with zero params; a null param binds SQL NULL, not the string |
| 29 | STORE-07 | ordering | resolved | explicit | 01-04 `truths` | Parameters always spread, never a single array argument; the static gate fails an array expression |
| 30 | COMPAT-01 | boundary | resolved | explicit | 01-06 `truths` | 0.57.1 compares 0 and is supported; 0.57.0 negative; 0.57.2 positive |
| 31 | COMPAT-01 | empty | resolved | explicit | 01-06 `truths` | Absent runtime, undefined version and empty-string version all yield incompatible-with-reason, never a throw |
| 32 | COMPAT-01 | encoding | resolved | explicit | 01-06 `truths` | ASCII digit runs between dots; pre-release and build suffixes compare on the numeric core; non-numeric → reason, not NaN |
| 33 | COMPAT-01 | precision | resolved | explicit | 01-06 `truths` | Base-ten integer per segment: 0.10.0 > 0.9.0 (a float parse inverts this); segments past three ignored |
| 34 | COMPAT-02 | unclassified | **unresolved** | — | 01-06 flagged assumption | The surface list is derived from source, not hand-listed; "current release" is resolved at run time |
| 35 | ENC-01 | empty | resolved | explicit | 01-01 `truths` | Zero-length body rejected at the gate, so no row can carry the empty-string digest |
| 36 | ENC-01 | encoding | resolved | explicit | 01-03 `truths` | Length and equality are BYTES from `toRaw()`: 222 raw vs 242 round-tripped, digests differ |
| 37 | DIST-05 | unclassified | **unresolved** | — | 01-02 flagged assumption | "The built bundle" is the shipped artifact, not a re-derived esbuild run; unprobed ≠ allowed |
| 38 | DIST-06 | concurrency | resolved | explicit | 01-02 `truths` | Overrides and `allowBuilds` are independent controls and both survive a re-install |

**Backstop markers (2).** Neither is an edge-probe item — both are goal-backward truths for measurements that
are genuinely external and cannot be confirmed from inside the process, so they are authored as flat-scalar
`{ statement, verification: backstop }` and abstain to `human_needed` rather than passing silently:
01-05 (max slice and RPC responsiveness under a live 200-chunk load) and 01-06 (the below-minimum refusal
reading as a clear message on a real old binary).

**Tally.** explicit 27 · unresolved-and-flagged 11 · dismissed 0 · **total 38**.

---

## C. Prohibition recall — two-stage, run in-prompt (no compiled engine)

Stage 1 over-produced 12 raw must-NOT candidates across the 22 requirements. Stage 2 dropped
routine-engineering items (input mutation, throwing on empty, leaking a handle — owned by the edge probe or
by code review) and applied canon-referral. Three bespoke items survived, each authored **descriptor-less**
into `must_haves.prohibitions` — no `check_kind` / `check_target` / `check_rule` /
`check_violation_fixture` / `check_clean_fixture` — so each disposes flagged-unverified rather than greening
on an unwired check.

| Kept | Category | Plan | Statement (abbreviated) |
|------|----------|------|--------------------------|
| P1 | privacy | 01-04 | MUST NOT retain operator browsing evidence beyond what the analysis needs — no bodies, headers, cookies, or any column able to hold a secret. A stolen copy of the plugin database must not be a credential dump. |
| P2 | transparency | 01-05 | MUST NOT present partial passive coverage as complete — only proxied traffic reaches the hook and cache hits never enter Caido, so no identifier may assert completeness. |
| P3 | safety | 01-01 | MUST NOT issue any outbound request in this phase — a phase the operator is told is passive cannot silently generate traffic they did not authorise. |

**Canon-referral drops (breadcrumbs, deliberately not minted).** Each is real and each is covered by a
dedicated tool, so minting it here would duplicate that tooling and drown the three bespoke signals:

- SQL injection via target-controlled strings — canon; covered by `/gsd-secure-phase` and by threat T-01-19's positional-binding rule. Not minted.
- Cross-project access control (OWASP V4) — canon; covered by `/gsd-secure-phase` and threats T-01-20 / T-01-25. Not minted.
- Log injection / target-controlled bytes reaching a log line — canon; covered by `/gsd-secure-phase` and threat T-01-04. Not minted.
- Path traversal under `sdk.meta.path()` — canon; covered by `/gsd-secure-phase`. Moot in Phase 1 anyway (decision P1-D3 writes nothing to disk). Not minted.

**Tally.** raw candidates 12 · routine-engineering dropped 5 · canon-referred 4 · **kept and authored 3**.
