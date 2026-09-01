# Phase 7: Sourcemap Reconstruction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-01
**Phase:** 07-sourcemap-reconstruction
**Areas discussed:** Map acquisition, Identity and the `sources` string, Storage at rest, Pipeline
placement, Hostile-map bounds, MAP-06 without detectors, VLQ, Viewer and export, The missing-request
case

**Areas offered and NOT selected:** "Where recovered source lives (O-01)" was presented in the
opening round and left unselected. It was raised anyway inside the Identity round, because a
metadata-only design still stores target-controlled strings and the question could not be avoided.
It became D-07.

---

## Map acquisition

### Q1 — What counts as map input for Phase 7?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline data-URI only | Rides inside a body `admit.ts` already accepts. No new SDK surface, no outbound, no kind-axis change, no touch to 06-11's push-down superset proof. External `.map` URLs recorded as candidates for Phase 8. Meets half of MAP-01's "discovered AND consumed". | ✓ |
| Inline + retro lookup in traffic Caido already holds | Resolve the `.map` URL and look for it in existing history via `sdk.requests.query()` — Phase 6 machinery, no new outbound. Cost: a second consumer of the HTTPQL composer; D-07 (Phase 6) scope rule applies. | |
| Inline + admit external maps when proxied | Widen `admit.ts`'s kind axis to a `sourcemap` kind. Fits the pipeline exactly. Cost: touches closed `REJECT_REASONS`, its test gate, and 06-11's superset proof. | |
| All three | Meets MAP-01 fully without going active, at the cost of both the kind-axis widening and the second HTTPQL consumer in one phase. | |

**User's choice:** Inline data-URI only → **D-01**
**Notes:** The smallest-surface option, consistent with the minimise-permanent-state preference
carried from Phases 5 and 6. Accepted cost: MAP-01 is met in full only for inline maps, and the
phase must state that rather than smooth it over.

### Q2 — How is the `sourceMappingURL` announcement located in a multi-megabyte body?

| Option | Description | Selected |
|--------|-------------|----------|
| Bounded tail window, `lastIndexOf` only | Search the last N KB, no regex — `admit.ts`'s own discipline, and `REDOS_RECOVERY = kill` takes the operator's project with it. Misses a legal mid-body map. | ✓ |
| Whole-body `lastIndexOf`, no regex | Finds every legal placement. Costs a full-body scan per admitted artifact, including the majority with no map. | |
| Prefilter then bounded window | The Phase 3 two-tier shape applied early. Cheap on the no-map case, complete on the mid-body one. | |

**User's choice:** Bounded tail window → **D-02**
**Notes:** The window size is left to the planner to pick and defend. The two-tier option was
declined as pre-empting DET-01, which owns that shape.

### Q3 — What is recorded for an external `.map` URL this phase will not fetch?

| Option | Description | Selected |
|--------|-------------|----------|
| A counter only | `telemetry.ts` gains a count; nothing durable, no migration, no target-controlled bytes at rest. Phase 8 re-derives candidates from bundles it re-reads anyway. | ✓ |
| A durable candidate row | A ready worklist for Phase 8 and a visible list for the operator. Cost: a one-way migration and a `COLUMN_ALLOWLIST` entry argued for a phase that will not use it. | |
| Counter now, row when Phase 8 needs it | Keeps the migration with its consumer. | |

**User's choice:** A counter only → **D-03**
**Notes:** Chosen over the near-identical third option, so Phase 7 records a counter full stop and
does not pre-commit Phase 8 to a particular worklist shape. A `SourceMap:` response header always
names an external URL and therefore folds into this same counter.

### Q4 — Which data-URI forms are accepted?

| Option | Description | Selected |
|--------|-------------|----------|
| base64 only, strict | What every mainstream bundler emits. One decode path, smallest hostile surface. `TEXTDECODER_MODULE = none` already constrains this area. | ✓ |
| base64 plus percent-encoded JSON | Spec-permitted, emitted by unusual toolchains. Two decode paths, two sets of malformed-input cases. | |
| Anything the media type allows | Most permissive; largest set of shapes MAP-05's suite must cover. | |

**User's choice:** base64 only, strict → **D-04**

---

## Identity and the `sources` string

### Q1 — What identifies a recovered source?

| Option | Description | Selected |
|--------|-------------|----------|
| Content hash as identity, `(map sha256, index)` as the observation | Mirrors the shipped `artifacts`/`observations` split; makes MAP-06's "once per content hash" literal; dedupes across bundles, deploys and targets. Hashing measured at 13.2 ms/8.3 MB native. | ✓ |
| Content hash only | Cheapest schema. Loses "which bundle did this come from" and breaks symmetry with `reads.ts`. | |
| `(map sha256, index)` only | Cheapest CPU. Same file across two deploys becomes two entities; "once per content hash" becomes false. | |

**User's choice:** Content hash + observation → **D-05**

### Q2 — What happens to the raw `sources` entry?

| Option | Description | Selected |
|--------|-------------|----------|
| Verbatim at rest, normalised only for display | Lossless storage; viewer builds a safe display tree under R1/R2. `webpack://` and `..` are evidence of how the bundle was built. | ✓ |
| Verbatim at rest, flat list in the UI | Same storage; nothing has to decide what `webpack://` means as a hierarchy. 781 flat rows is a worse browse. | |
| Sanitised at write time | Nothing hostile ever at rest. Irreversible; destroys evidence that R1/R2 exist to let us keep safely. | |

**User's choice:** Verbatim, normalised for display → **D-06**
**Notes:** This is the first target-controlled string at rest since `observations.url`; the
`COLUMN_ALLOWLIST` entry must be argued in the same register.

### Q3 — Where does a recovered source's CONTENT live? (the O-01 question, raised here)

| Option | Description | Selected |
|--------|-------------|----------|
| Nowhere — derive on demand | Metadata only; re-reconstruct from the original request via `sdk.requests.get`, the same reload-and-re-verify move SEC-05 specifies. D-17, D-24 and the no-BLOB gate stay whole. Browsing depends on Caido still holding the request. | ✓ |
| A TEXT `sources` table — re-open D-24 deliberately | Instant browsing, survives Caido's own retention. D-24's "satisfied by construction" falls; quota reasoning returns as a set. | |
| Run the external-RSS probe first, then decide | Discharge O-01 by measurement before the design is written. May just confirm option A. | |

**User's choice:** Nowhere — derive on demand → **D-07**
**Notes:** This dissolves O-01's **storage** half. The **memory** half survives — `JSON.parse`
materialises every source at peak, which `06-07-SUMMARY.md:311` flagged as reasoned rather than
measured. That surviving half was routed to the bounds round and became D-10's probe.

---

## Pipeline placement

### Q1 — Where does the analysis-time pass run?

| Option | Description | Selected |
|--------|-------------|----------|
| A stage inside the existing bounded consumer | Inherits once-per-hash, epoch re-check, `partial`/`failed`, `retry.ts`, retention. No new lifecycle. A large map's parse lands on the same thread as live browsing. | ✓ |
| Its own operator-triggered job | Long work stays visible (PITFALLS P3). Cost: a second lifecycle and reconstruction stops being automatic — against the passive-pipeline thesis. | |
| Consumer stage, off by default behind a setting | Conservative rollout. Cost: a feature nobody has on does not get exercised. | |

**User's choice:** Consumer stage, always on → **D-08**

### Q2 — What does the analysis-time pass persist, against a 50,000-row default cap?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-source rows, normal caps | The workspace can answer "every recovered source on this target". A handful of large maps consumes the budget; Phase 6's D-25 footprint readout shows it. | ✓ |
| Aggregate on the map, per-source materialised lazily | Costs no rows. Cannot query project-wide without re-deriving; cross-bundle dedupe becomes browse-time. | |
| Per-source rows with a per-map cap | Bounds the pathological map. A 781-source map is legitimate, so the cap sits above real-world large and buys little. | |

**User's choice:** Per-source rows, normal caps → **D-09**

---

## Hostile-map bounds

### Q1 — What sets the byte gate?

| Option | Description | Selected |
|--------|-------------|----------|
| A measured `MAP_MAX_BYTES` from a Phase 7 probe | SPIKE-06 method with a 50 ms external RSS sampler; the O-01 probe repurposed. Also settles whether MAP-02's "781 sources / 12.66 MB / 21 ms" holds inside QuickJS. | ✓ |
| Reuse `AST_MAX_BYTES` (1,334,405) | No new probe. Refuses the monaco case by 9.5×; derived from a meriyah stall, a different cost curve. | |
| Extrapolate from `RSS_BYTES_PER_INPUT_BYTE` | Cheapest defensible-looking number. Extrapolates across operations — the exact "reasoned, not measured" weakness O-01 named. | |

**User's choice:** A measured probe → **D-10**

### Q2 — What records a refused, truncated or malformed map?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse `analyses.scan_state = 'partial'` and its redacted error | One vocabulary, already policed by `error-redaction.spec.ts`. Ships a slice of ERR-02/OBS-02, the declared-not-smuggled move Phase 6's D-11 made. One `scan_state` cannot say "reconstruction failed but detection succeeded" once Phase 3 lands. | ✓ |
| A reconstruction-specific state on the new table | Reconstruction and detection can fail independently. Cost: a second degradation vocabulary where Phase 2 wants exactly one. | |
| Both — `analyses` plus a closed reason code | Artifact verdict plus which bound fired, in the `REJECT_REASONS` shape. Cost: a new closed vocabulary to keep closed. | |

**User's choice:** Reuse `analyses.scan_state` → **D-11**
**Notes:** The Phase-3 cost was on the table and accepted. Its interaction with D-22's tombstone
state was flagged back to the user and recorded as **O-07** rather than resolved here.

### Q3 — What replaces SC3's traversal suite?

| Option | Description | Selected |
|--------|-------------|----------|
| Resource + display + structural, plus traversal kept as a standing proof | Covers what can still hurt, AND keeps traversal fixtures as a non-vacuity proof that `sources` never reaches a path-like sink — a static gate that goes red if a filesystem returns. | ✓ |
| Resource + display + structural only | Smallest honest suite. If a filesystem returns, nothing fires. | |
| Everything, including the three-platform matrix | Meets SC3 literally. Expensive theatre in a codebase lint-banned from touching paths. | |

**User's choice:** Plus traversal as a standing proof → **D-12**

---

## MAP-06 without detectors

### Q1 — Does Phase 7 wire recovered sources into the analysis path?

| Option | Description | Selected |
|--------|-------------|----------|
| Wire it now, bound proven by a test-only detector | Depth capped at 1, no re-entry; the recursion limit is the valuable half and is fully testable today. Works unchanged when a real detector lands. | ✓ |
| Wire it now, untested end-to-end | Cheapest. The depth bound — the one thing preventing a loop — goes untested. | |
| Defer as a named carried obligation | MAP-06 does not move; the depth bound gets designed mid-way through building detectors. | |

**User's choice:** Wire it now with a test-only detector → **D-13**

### Q2 — How does derived content enter, given `admit()` admits `js` only?

| Option | Description | Selected |
|--------|-------------|----------|
| A separate derived-artifact path that bypasses `admit()` | A recovered source has no status, no scope, and an arbitrary kind — four admission axes that do not apply. Cost: `REJECT_REASONS` no longer covers everything refused. | ✓ |
| Widen `admit()` to accept derived kinds | One gate, one vocabulary. Same blast radius declined in D-01, for a case that never touches HTTPQL. | |
| Recovered sources are never artifacts | Nothing about admission changes. "Once per content hash" needs its own bookkeeping — a third place state lives. | |

**User's choice:** Separate derived path → **D-14**
**Notes:** The `REJECT_REASONS` gap was named at the time and recorded as **O-05**.

### Q3 — What ships for SC5, with no corpora?

| Option | Description | Selected |
|--------|-------------|----------|
| Ship the fixtures, record the rate as unmeasurable | A corpus is data, not engine. The FP rate is recorded NOT MEASURED with its reason — Phase 6's D-23 discipline. | ✓ |
| Record SC5 as not met, owned by Phase 3 | Nothing built speculatively. Phase 3 sources real maps under its own time pressure. | |
| Ship fixtures and a placeholder harness | Phase 3's plan 03-04 already owns the harness; a harness written first is one Phase 3 rewrites. | |

**User's choice:** Fixtures ship, rate NOT MEASURED → **D-15**

---

## VLQ (MAP-03)

### Q1 — Is `@jridgewell/sourcemap-codec` called at all?

| Option | Description | Selected |
|--------|-------------|----------|
| No — ship the prohibition, not the capability | No position consumer exists until detectors or the AST tier. MAP-03 ships as an enforced absence; its checkbox does not move. | |
| Yes — for minified↔source position mapping in the viewer | The one position consumer that exists without detectors, and genuinely useful. 167 ms on 8.3 MB against a 25 ms slice, un-chunkable — needs a byte gate or must move off the analysis path. | ✓ |
| Yes, but browse-time and on demand only | A 167 ms stall on a click the operator initiated. Still blocks QuickJS. | |

**User's choice:** Yes, for the viewer → **D-16 (first half)**

### Q2 — How is "no VLQ on the primary path" enforced?

| Option | Description | Selected |
|--------|-------------|----------|
| A static gate, in the shipped sibling shape | Fourth sibling of `outbound-prohibition` / `filesystem-prohibition` / `httpql-discipline`. Firing fixture and legal fixture per rule. | ✓ |
| The bundle-import check only | Polices the shipped artifact; fires late, cannot name the offending module. | |
| A comment and a code review | `admit.ts`'s prohibitions are backed by gates elsewhere precisely because prose is not enforcement. | |

**User's choice:** A static gate → **D-17 (first half)**

### Q3 (follow-up) — Where does the decode execute?

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend — the backend ships `mappings`, the browser decodes | Removes the stall rather than gating around it; the backend never imports the codec, making the gate cleanly package-level. Cost: the raw `mappings` string crosses the RPC as target-controlled data. | ✓ |
| Backend, on demand, once per map | One 167 ms stall per map on a click. Keeps all hostile parsing on the backend. The cache has no home in the current design. | |
| Backend, on demand, per source | `decode()` consumes the whole `mappings` string; per-source means decoding everything anyway or hand-rolling a segment walker against hostile input. | |

**User's choice:** Frontend → **D-16**
**Notes:** Raised as a follow-up because the Q1 answer left the placement open and the gate's shape
depended on it. Moves the codec from a root dependency to `packages/frontend`. The RPC payload
bound became **O-01**.

### Q4 (follow-up) — Where does the gate draw its line?

| Option | Description | Selected |
|--------|-------------|----------|
| Package-level: the backend never imports the codec | Unambiguous; bans the capability, not the usage — the property D-18 (Phase 6) chose deliberately. | ✓ |
| Module-boundary: reconstruction path only | Preserves the option of backend decoding later. Needs a maintained list of "primary path" modules; a boundary a refactor can move is the weaker gate. | |
| Both, whichever the placement makes true | A deferral to the planner rather than a decision. | |

**User's choice:** Package-level → **D-17**

---

## Viewer and export

### Q1 — How is a megabyte-scale recovered file rendered?

| Option | Description | Selected |
|--------|-------------|----------|
| Virtualised, using the scroller already in the stack | `shims-virtual-scroller.d.ts` and `ArtifactsTable.vue` are shipped precedent. Bounded DOM at any file size. Cost: a file with no newlines is one line of 4 MB. | ✓ |
| Whole file, hard-truncated under R2 | Simplest. The operator cannot read past the bound — which is the entire feature. | |
| Virtualised with a no-newline fallback | Covers both cases. Two rendering modes and a rule for choosing between them. | |

**User's choice:** Virtualised → **D-18**
**Notes:** The no-line-structure case was named in the declined third option and is carried as
**O-02**, since "fall back to the thing we declined" is not an answer.

### Q2 — Syntax highlighting?

| Option | Description | Selected |
|--------|-------------|----------|
| None — plain monospaced text | R1's letter and intent. No highlighter dependency, no tokenising of hostile bytes, no markup path at all. | ✓ |
| Highlighting via programmatic text nodes | Satisfies R1 if spans are built as DOM text nodes. Cost: a DIST-05 dependency, and R1's guarantee rests on a library's discipline. | |
| Highlighting, deferred to a later phase | Same as option 1 plus an explicit deferral. | |

**User's choice:** None → **D-19** (deferred to Phase 11 polish)

### Q3 — What does MAP-07's "exportable with a manifest" mean?

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest through the shipped path, content per-file on demand | Manifest rows fit `EXPORT_COLUMNS`/`serialiseRows` exactly and inherit redaction and audit kinds. No new export machinery. No "give me the whole tree". | ✓ |
| Manifest plus a bulk content export | Serves the offline-grep workflow. Needs a second export shape, re-derives every file, and becomes a long serial job with its own progress surface. | |
| Manifest only | Smallest surface. Meets the manifest half; the phase would have to say so. | |

**User's choice:** Manifest through the shipped path, content per-file → **D-20**

### Q4 — Where does the viewer live?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside the Artifacts tab, as a drill-down | A source belongs to an artifact; existing table and selection contracts carry it. Two clicks deep, less discoverable. | ✓ |
| A sixth tab | Discoverable, matches the project-wide-view thesis. The strip already wraps at five. | |
| A sixth tab plus the drill-down | Both entry points. Two selection states to keep coherent with the coalescer. | |

**User's choice:** Artifacts drill-down → **D-21**

---

## The missing-request case

Opened at the closing gate. The user was offered "I'm ready for context" and chose to discuss this
instead — it is the direct consequence of D-07 and has two failure modes, not one.

### Q1 — The origin request is gone. What happens to the rows?

| Option | Description | Selected |
|--------|-------------|----------|
| Kept as a tombstone with a distinct state | Visibly marked under UI-09. That a file existed on this target, at that size and hash, is intelligence on its own. | ✓ |
| Swept when unreachable | The inventory never lists what it cannot show. Destroys evidence on a schedule Caido controls — permanent unrecoverable state loss. | |
| Kept with no distinct state | No new state or copy. Reproduces the "nothing found" vs "analysis broke" confusion ERR/OBS-02 prevents. | |

**User's choice:** Tombstone with a distinct state → **D-22**

### Q2 — When is unreachability detected?

| Option | Description | Selected |
|--------|-------------|----------|
| Lazily at open, and the outcome sticks | No background probing; the same shape as Phase 6's D-03. Optimistic between the loss and the first click. | ✓ |
| Lazily at open, not recorded | Simplest; no write on a read path. Every reader pays the same failed reload and the list never learns. | |
| Eagerly, on a sweep | Always accurate. A reload per row is the cost Phase 6's D-03 was written to avoid. | |

**User's choice:** Lazy and sticky → **D-23**
**Notes:** This puts a write on a read path; whether it fits `sql-discipline.spec.ts` as it stands
was flagged and carried as **O-06**.

### Q3 — The request is there but the body CHANGED. Does the derivation re-verify?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-verify the body hash, fail closed | Exactly SEC-05's move. Source can never be shown under the wrong bundle's identity; detects a redeploy for free (v2's DIFF-01). ~13 ms per open at 8.3 MB. | ✓ |
| Re-verify and re-derive | The operator always sees current source. Silently substitutes a different artifact for the one they selected. | |
| Do not re-verify | Cheapest read path. Content-addressing is the project's entire identity story. | |

**User's choice:** Re-verify, fail closed → **D-24**

---

## Claude's Discretion

The user took every question; nothing was delegated to Claude. Three items were explicitly left to
the planner as numbers or shapes it must defend rather than inherit:

- The D-02 tail-window size
- The D-14 derived-path size bound
- The D-09 row accounting's exact column list

Eight items (O-01 … O-08 in CONTEXT.md) are open questions the researcher settles from evidence and
the planner escalates rather than answering — those are obligations, not discretion.

## Deferred Ideas

- Syntax highlighting in the source viewer — declined under D-19, revisit in Phase 11
- A bulk "export every recovered source" action — declined under D-20
- A top-level `Sources` tab — declined under D-21
- A durable external-`.map` candidate worklist — declined under D-03, belongs with Phase 8
- Retro lookup of `.map` files in captured traffic via `sdk.requests.query()` — declined under
  D-01, cheapest later widening of MAP-01, revisit in Phase 8
- Percent-encoded and other non-base64 `data:` URI forms — declined under D-04
- The eight redundant `@internal` JSDoc tags — carried unclaimed from Phase 5's deferred items
- Three pre-existing conditions carried from Phase 6's `deferred-items.md`: WINDOWS 85
  (`outbound-prohibition.spec.ts` byte-compare), WINDOWS 84 (`sql-discipline.spec.ts` leading-keyword
  blind spot), and the stale SPIKE-10 recorder entry in `STATE.md`
