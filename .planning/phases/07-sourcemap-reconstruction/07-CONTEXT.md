# Phase 07: Sourcemap Reconstruction - Context

**Gathered:** 2026-09-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Recover developer-readable source from sourcemaps that arrive **inside a body the plugin already
admits**, and make it browsable and exportable — without the plugin ever holding that source at
rest and without going active.

Fixed by `ROADMAP.md` Phase 7. Requirements: **MAP-01 … MAP-07, UI-05**.

**Not this phase:** active `.map` probing and the send journal (Phase 8, ACTIVE-01/02); the
detectors themselves and the FP harness (Phases 3/4, none of which have been built — see below);
the AST substrate (Phase 9); chunk enumeration (Phase 10); cross-deploy diffing (v2, DIFF-01).

**Three facts about the shipped tree that the roadmap entry does not carry, and that reshape this
phase before a single plan is written:**

1. **`admit.ts` admits `js` and nothing else.** `KIND_JS` is the one kind, and the header states
   detectors arrive in Phase 3. A `.map` served as `application/json` is rejected today. Any
   external-map path therefore widens the kind axis, the closed `REJECT_REASONS`, its
   every-reason-has-a-test gate, and 06-11's push-down superset proof. **D-01 declines that
   widening.**

2. **No detectors exist.** Phases 2, 3 and 4 have not been executed — `.planning/phases/` holds
   00, 01, 05, 06 only. `ingest/consumer.ts`'s `visit` is a documented no-op ("no detector exists
   until Phase 3"), and there is no corpus. MAP-06 and success criterion 5 land in that world, and
   **D-13/D-15 say what ships instead of pretending otherwise.**

3. **`export.ts` is row-based.** `EXPORT_RPC_CHUNK_ROWS = 20_000`, `EXPORT_COLUMNS`,
   `serialiseRows` — a manifest fits it exactly; file contents do not. **D-20 splits MAP-07 along
   that seam rather than bending the export path.**

**Note on the roadmap's own success criteria.** SC1 ("a real large map completes within the Phase 0
budget") names a budget that does not exist for this operation — every Phase 0 threshold is a parse
or hash number, none is a `JSON.parse`-of-a-map number. **D-10 makes the phase produce that
constant rather than borrow a neighbouring one.** SC3's malicious-`sources` fixture suite lost its
subject to Phase 6's D-17 and **D-12 says precisely what replaces it and what is retained as
proof.** SC6's "retrievable via the Phase 6 delivery path with a manifest" is met in two halves by
D-20, and the phase must say which half is which.

</domain>

<decisions>
## Implementation Decisions

Seven areas were discussed and one more was opened at the closing gate. **Twenty-four decisions are
locked below.** The operator took every question; nothing was delegated. Where a decision
contradicts a roadmap assumption or costs something, that is stated rather than smoothed over.

### Map acquisition — what this phase consumes

- **D-01:** **Inline `data:` URI sourcemaps ONLY. External `.map` files are not fetched, not looked up
  in existing traffic, and not admitted.** An inline map rides inside a body `admit.ts` already
  accepts, so the phase adds zero SDK surface, zero outbound traffic, and no touch to the kind
  axis, the closed `REJECT_REASONS`, or 06-11's push-down superset proof. Rejected: a retro lookup
  through `sdk.requests.query()` (a second consumer of the Phase 6 HTTPQL composer), admitting
  proxied `.map` responses (widens the kind axis), and fetching them (that is ACTIVE-01, Phase 8).
  **Intended consequence, and the phase must state it rather than let a verifier find it: MAP-01
  says "discovered AND consumed", and this meets the discovery half for external maps and the full
  requirement only for inline ones.**

- **D-02:** **The `sourceMappingURL` announcement is located by `lastIndexOf` over a BOUNDED TAIL
  WINDOW. No regular expression, anywhere on this path.** The window size is a number the planner
  picks and defends. Bundlers put the comment on the last line by convention. This is `admit.ts`'s
  own `indexOf`/`endsWith` discipline extended to the next path that touches a full body, and it
  answers to the same measurement: `REDOS_INTERRUPTIBLE = false` and `REDOS_RECOVERY = kill`, where
  the kill takes the operator's project with it. Rejected: a whole-body backward scan (a full-body
  cost on every admitted artifact, including the majority with no map), and an `indexOf` prefilter
  plus bounded windows (the Phase 3 two-tier shape — correct, but it is DET-01's to define and
  building it here pre-empts a phase that owns it).
  — **Reversibility:** reversible — one function, one constant.

- **D-03:** **An external `.map` announcement increments a COUNTER and nothing else.** No table, no
  migration, no `COLUMN_ALLOWLIST` entry, no target-controlled URL at rest for a phase that will
  not use it. Counters live in `telemetry.ts` and nowhere else — `telemetry.spec.ts` scans the
  package AST and fails on a second counters object. **A `SourceMap:` response header always names
  an external URL, so under D-01 it folds into this same counter rather than becoming a third
  code path.** Phase 8 builds its own worklist alongside its send journal, where the consumer is;
  it re-derives candidates from bundles it will be re-reading regardless.

- **D-04:** **`data:` URIs are accepted in base64 form only** — `data:application/json;base64,` and its
  `;charset=` variant. One decode path, one set of malformed-input cases, smallest hostile surface,
  and the runtime is already constrained here (`TEXTDECODER_MODULE = none`). Rejected:
  percent-encoded JSON payloads and "anything the media type allows" — both widen MAP-05's fixture
  obligation for forms no mainstream bundler emits.

### Identity, and the `sources` string

- **D-05:** **A recovered source's identity is the sha256 of its CONTENT; each sighting is recorded as
  `(map sha256, index)`.** This mirrors the shipped `artifacts` / `observations` split exactly, so
  every read query in `reads.ts` is already shaped for it, and it makes MAP-06's "once per content
  hash" literal rather than aspirational. It dedupes a shared vendor file across bundles, deploys
  and targets — the project's whole storage idiom. Cost accepted: hashing every source, measured
  at 13.2 ms for 8.3 MB on the native path (the JS-loop fallback was 720 ms), so a 12 MB map is
  roughly 20 ms.
  — **Reversibility:** one-way — it is a table shape and a published identity, and `schema.spec.ts`
  asserts `EXPECTED_TABLES` exactly.

- **D-06:** **The raw `sources` entry is stored VERBATIM and normalised only for display.** It is
  evidence: the developer's real directory layout is half of what makes reconstruction valuable,
  and `webpack://`, `..` and absolute paths say how the bundle was built. The viewer builds a safe
  display tree from it under `05-UI-SPEC.md` R1 (text, never markup) and R2 (truncation and
  sanitisation), both already shipped and already tested. Rejected: write-time sanitisation, which
  is irreversible and destroys the evidence R1/R2 exist to let us keep safely.
  **This is the first target-controlled string at rest since `observations.url`; the precedent is
  there, but the `COLUMN_ALLOWLIST` entry must be argued in the same terms, not waved through.**

### Where recovered source lives — the load-bearing decision

- **D-07:** **NOTHING is held at rest. Only metadata is stored; content is DERIVED ON DEMAND by
  reloading the originating request through `sdk.requests.get` and re-parsing the map.**

  Phase 6's D-17 (no server disk, `sdk.hostedFile` declined) and D-24 (no BLOB, no untyped column,
  a per-table `COLUMN_ALLOWLIST`) both stay whole and unamended. This is the same reload-and-verify
  move SEC-05 already specifies for revealing a secret, applied to the same problem in a new
  surface.

  **O-01 is DISSOLVED, not answered — and only half of it.** The storage half disappears because
  nothing is ever held. **The memory half does not:** `JSON.parse` of a whole map materialises
  every source at peak, which is exactly the argument `06-07-SUMMARY.md:311` recorded as *reasoned,
  not measured*. That surviving half is what D-10's probe now measures. The planner must not read
  "O-01 dissolved" as "no probe needed".

  Cost accepted, and it generates D-22/D-23/D-24: browsing depends on Caido still holding the
  originating request, and each view re-parses the map.
  — **Reversibility:** costly — reversing it means adding a content column, which fires
  `schema.spec.ts` by design and re-opens D-24's "DEPLOY-04 is satisfied by construction".

- **D-22:** **When the originating request is gone, the row is KEPT AS A TOMBSTONE with a distinct
  state** — "recovered 14 Aug, content no longer producible" — visibly marked under Phase 5's UI-09
  stance that degraded states are never silently presented as complete. That a file called
  `src/auth/session-token.ts` existed on this target, at that size, with that hash, is intelligence
  on its own. Rejected: sweeping the row, which destroys evidence on a schedule *Caido* controls
  and is the permanent unrecoverable state loss the operator has declined at every decision since
  Phase 5; and keeping it with no state, which is the "nothing found" versus "analysis broke"
  confusion ERR/OBS-02 exists to prevent, relocated into a new surface.

- **D-23:** **Unreachability is detected LAZILY at open, and the outcome STICKS to the row.** No
  background probing; the row is producible until an operator opens it and it is not, and that
  observation is then recorded so the next reader sees the tombstone without repeating the reload.
  Same shape as Phase 6's D-03 — one bounded read instead of thousands of megabyte reloads.
  **This puts a WRITE on a READ path**, so the statement must satisfy `sql-discipline.spec.ts`
  (single statement, fully bound, `project_id`-scoped) and re-check the project epoch like every
  other write. Cost accepted: the inventory is optimistic between the loss and the first click.

- **D-24:** **Every on-demand derivation RE-VERIFIES the reloaded body against the recorded artifact
  sha256 and FAILS CLOSED on a mismatch.** Exactly SEC-05's move. The operator can never be shown
  source attributed to a bundle it did not come from, and a re-deploy is detected for free — which
  is what DIFF-01 will want in v2. One native hash per open, ~13 ms at 8.3 MB. Rejected:
  transparently re-deriving from the new body (the row says one hash and the viewer shows another
  — the quiet mismatch every gate in this codebase exists to prevent), and not verifying at all.

### Pipeline placement

- **D-08:** **Reconstruction is a STAGE INSIDE the existing bounded consumer, always on, no toggle.**
  It runs where `visit` is a no-op today, one artifact at a time, sharing the 25 ms slice
  (`MAX_SYNC_SLICE_MS`) and the `setTimeout0` yield (`YIELD_PRIMITIVE`, `YIELD_COST_MS = 5.029`).
  It inherits everything the pipeline already guarantees: analysed once per content hash, epoch
  re-checked mid-flight, `partial`/`failed` states, `retry.ts` semantics, retention swept every
  128. Rejected: a separate operator-triggered job (a second lifecycle, a second suspend/resume/
  epoch story, a second thing `init()` sweeps — and it would make reconstruction manual, which is
  the passive-pipeline thesis the project exists for), and a default-off setting (a shipped feature
  nobody has on does not get exercised). **Consequence: a large map's `JSON.parse` lands on the
  same thread as live browsing, so D-10's byte gate is load-bearing, not advisory.**

- **D-09:** **One row per recovered source, subject to the NORMAL retention caps.** No special
  exemption, no per-map cap. The workspace can then answer "every recovered source on this target"
  — the project-wide-view thesis applied to source. Cost accepted, openly: a 781-source map is 781
  rows against a `DEFAULT_RETENTION_MAX_ROWS` of 50,000, so a handful of large maps consumes the
  budget and the operator meets eviction sooner here than on any other table. Phase 6's D-25
  footprint readout will show it, which is at least honest. Rejected: aggregate-only rows (loses
  the queryable inventory and pushes cross-bundle dedupe to browse time) and a per-map cap (a
  781-source map is legitimate, not pathological, so the cap would have to sit above real-world
  large and would buy little).

### Bounds and hostile input (MAP-05)

- **D-10:** **`MAP_MAX_BYTES` is MEASURED by a Phase 7 probe, not borrowed and not extrapolated.**
  SPIKE-06's method: fresh instance per size point, external RSS sampler at 50 ms correlated to
  in-runtime markers, since this runtime exposes no memory introspection at all (QUAL-06). This is
  the probe O-01 was going to need, repurposed onto the question that survived D-07.
  **It also settles whether MAP-02's parenthetical — "781 sources recovered from a 12.66 MB monaco
  map in 21 ms" — holds inside QuickJS, which is not where that number was taken.** Rejected:
  reusing `AST_MAX_BYTES` (1,334,405 B — it refuses the monaco case by 9.5×, and it was derived
  from a meriyah stall, a different cost curve), and extrapolating from
  `RSS_BYTES_PER_INPUT_BYTE = 102.112` (measured for a meriyah parse with `ranges:true`; applying
  it to `JSON.parse` is the "reasoned, not measured" move that was the weak link in O-01 to begin
  with).

- **D-11:** **A refused, truncated or malformed map records `analyses.scan_state = 'partial'` with its
  existing redacted 240-char error.** One degradation vocabulary, in the one place that already has
  it, rendered through `describeError` and policed by `error-redaction.spec.ts`. **This ships a
  slice of ERR-02/OBS-02's "one vocabulary defined once and used identically" ahead of Phase 2 —
  the same declared-not-smuggled move Phase 6's D-11 made, and the plan must say so out loud rather
  than let a verifier discover it.** Cost accepted: one `scan_state` cannot express "reconstruction
  failed but detection succeeded" once Phase 3 lands; Phase 3 inherits that, and inherits it
  knowingly. **Note the interaction with D-22:** the tombstone state is a *producibility* axis, not
  an *analysis* axis. They are different questions and must not be collapsed into one column — but
  the planner should decide that deliberately, not discover the collision.

- **D-12:** **The MAP-05 fixture suite covers resource, display and structural hostility — AND retains
  the traversal fixtures as a standing non-vacuity proof.** Resource: giant `sourcesContent`,
  millions of tiny sources, deeply nested JSON. Structural: `sections` indexed maps, reference
  cycles, absent/null `sourcesContent`. Display: RTL overrides, NUL bytes, 4 KB labels. **And the
  traversal fixtures stay, not to test a defence, but to prove a `sources` entry never reaches a
  path-like sink** — a static gate in the shape of `filesystem-prohibition.spec.ts`, which goes red
  the day a filesystem returns. Rejected: dropping traversal entirely (the dissolution would then
  be recorded in prose and enforced by nothing), and running the original three-platform matrix
  (expensive theatre in a codebase lint-banned from touching paths; Phase 6's deployment matrix
  showed what a multi-shape harness costs to build and keep green).

### MAP-06, in a project with no detectors

- **D-13:** **Recovered sources are wired into the analysis path NOW, depth capped at 1, no re-entry,
  and the bound is proven by a detector that exists ONLY in the test suite.** The recursion limit
  is the valuable half of MAP-06 and it is fully testable today — designed before Phase 3 arrives
  with pressure to skip it. The day a real detector lands this works unchanged. Rejected: wiring it
  untested (a path with no detector behind it and no test in front of it is a path nobody has
  executed, and the depth bound is exactly what goes untested), and deferring (the bound would then
  be designed by whoever is mid-way through building detectors).

- **D-14:** **Recovered sources enter through a SEPARATE derived-artifact path that BYPASSES
  `admit()`.** Admission answers "should this proxied response become an artifact" across status,
  body presence, size, kind and scope. A recovered `.ts`/`.vue`/`.scss` has no status, no scope of
  its own, and a kind that is whatever the developer wrote — running it through `admit()` means
  inventing answers for four axes that do not apply. The derived path carries a size bound only.
  Rejected: widening `admit()` (the same blast radius declined in D-01 — closed `REJECT_REASONS`,
  its test gate, 06-11's proof — for a case that never touches HTTPQL), and keeping recovered
  sources out of `artifacts` entirely (state would then live in a third place).
  **Cost accepted, and it needs an answer in the plan: `REJECT_REASONS` no longer covers everything
  the pipeline refuses.** See O-05.
  — **Reversibility:** costly — a second entry point into the pipeline is a contract every later
  ingestion feature reasons against.

- **D-15:** **The reconstructed-source corpus FIXTURES ship; the false-positive RATE is recorded NOT
  MEASURED, with its reason.** A corpus is data, not engine — real maps from real bundles, with
  their recovered source, can be committed now so Phase 3's harness finds them waiting. The rate
  cannot exist without a detector, and that is recorded the way Phase 6's D-23 recorded an
  unreachable matrix leg: **never as a silent pass.** Rejected: shipping a placeholder harness —
  Phase 3's own plan 03-04 owns "the FP harness and CI wiring", and a harness written before the
  engine it measures is a harness Phase 3 rewrites.

### VLQ (MAP-03)

- **D-16:** **`@jridgewell/sourcemap-codec` is used, for minified↔source position mapping in the
  viewer, and the decode runs in the FRONTEND.** The backend ships the raw `mappings` string and
  the browser decodes it. This is the one position consumer that exists without detectors, and it
  is genuinely useful to a hunter reading recovered code. **Moving the decode to the browser
  removes the stall problem rather than gating around it:** SPIKE-06 measured `vlq_decode` at
  167 ms on 8.3 MB against a 25 ms slice, `decode()` consumes the whole `mappings` string so it
  cannot be chunked, and 167 ms of blocked QuickJS is 167 ms in which live browsing is not being
  proxied. In a real browser it is a shrug. Rejected: backend decoding on demand (still blocks the
  proxy thread, and the per-session cache has no home in the current design) and per-source
  decoding (the library has no partial decode; it would mean hand-rolling a segment walker against
  hostile input).
  **Consequence: the codec moves from a root dependency to `packages/frontend`, and the raw
  `mappings` string — target-controlled data — now crosses the RPC.** See O-01.

- **D-17:** **A PACKAGE-LEVEL static gate: no `packages/backend` module imports the codec, in any
  specifier form.** Because D-16 puts the decode in the browser, MAP-02's "no VLQ decoding on the
  primary path" becomes a clean capability ban rather than a maintained list of which modules are
  "the primary path" — and a boundary a refactor can quietly move is the weaker kind of gate. Same
  walk skeleton, same by-name non-vacuity block, same firing-fixture/legal-fixture pair as
  `outbound-prohibition.spec.ts`, `filesystem-prohibition.spec.ts` and
  `scan/httpql-discipline.spec.ts` — the fourth sibling in an established family. It bans the
  capability, not the usage, which is the property D-18 (Phase 6) chose deliberately. Rejected:
  relying on `scripts/ci/check-bundle-imports.mjs` alone (it polices the shipped artifact, so it
  fires late and cannot name the module that pulled the codec in) and a header comment (the
  `export.ts` header's own rule: a gate a comment can trip is a gate that gets weakened rather than
  obeyed).
  — **Reversibility:** costly — it is a project gate, and code written under it assumes the backend
  cannot decode positions.

### The viewer (UI-05) and export (MAP-07)

- **D-18:** **The content is rendered VIRTUALISED, using the scroller already in the stack.**
  `shims-virtual-scroller.d.ts` is already in `packages/frontend/src` and `ArtifactsTable.vue`
  established the pattern — the dependency, its typing and its precedent are all shipped. A window
  of lines, never the file, so the DOM stays bounded regardless of file size. Rejected: whole-file
  rendering with an R2 hard truncation — "read the recovered source" is the entire feature and a
  bound the operator cannot read past defeats it. **Cost accepted and it needs an answer:** a file
  with no usable line structure is one line of several MB. See O-02.

- **D-19:** **No syntax highlighting. Plain monospaced text.** Recovered source renders as text and
  nothing else — R1's letter and its intent, with no path by which a crafted file becomes markup,
  no highlighter dependency answering to DIST-05's bundle allowlist, and no tokenising of hostile
  bytes in the frontend. This is the most hostile data the product renders and it ships with the
  smallest possible render surface. Highlighting is recorded as a deferred idea.

- **D-20:** **MAP-07 splits at the export path's own seam. The MANIFEST exports as rows through
  `export.ts` unchanged; CONTENT is saved one file at a time from the viewer, re-derived on demand
  per D-07.** Manifest rows — hash, `sources` label, byte length, which map, which artifact — fit
  `EXPORT_COLUMNS`/`serialiseRows` exactly, and inherit the shipped redaction and the
  `export_raw`/`export_redacted` audit kinds. Rejected: a bulk content export, which would need a
  second export shape `serialiseRows` does not describe, would re-derive every file during the
  export, and would be a long serial job needing its own progress surface — Phase 6's lesson about
  what a long serial job costs, paid a second time. **The phase must state which half of "browsable
  and exportable with a manifest" each mechanism meets.**

- **D-21:** **The viewer lives INSIDE the Artifacts tab as a drill-down.** A recovered source belongs
  to an artifact and the Artifacts tab is already the inventory; selecting a JS artifact with a map
  reveals its sources. No sixth tab — the strip already wraps at five, which the Phase 5 UI
  contract noted — and the existing table and selection contracts carry it. Cost accepted: source
  browsing is two clicks deep and less discoverable than a top-level tab.

### Claude's Discretion

The operator took every question. Nothing was delegated. Where a decision above names an open
question (O-01 … O-08), the researcher settles it from evidence and the planner escalates rather
than inventing an answer — that is not discretion.

Genuinely left to the planner, and only these: the D-02 tail-window size, the D-14 derived-path
size bound, and the D-09 row accounting's exact column list. Each must be a number or a shape the
plan defends, not one it inherits.

### Open — raised, NOT decided

These are not defaults and must not be read as locked.

- **O-01: What bounds the raw `mappings` string crossing the RPC?** D-16 sends target-controlled
  data to the frontend. A 12 MB map's `mappings` is itself large, and the only chunked transport
  this project has is `export.ts`'s row-based one, which does not describe a single large string.
  It also answers to `05-UI-SPEC.md` R1/R2 like every other untrusted value. Settle the transport
  and the bound before the viewer is planned.

- **O-02: How does the virtualised viewer handle a file with no usable line structure?** D-18 chose
  line-window virtualisation; a minified file recovered as a "source" is one line of several MB.
  The option that named a byte-window fallback was not selected, so this needs an answer that is
  not "fall back to the thing we declined" — most likely a visibly-marked degradation under UI-09.

- **O-03: What is `MAP_MAX_BYTES`?** D-10 mandates the measurement; the number does not exist yet.
  The probe is Phase 7's first obligation and D-08 makes it load-bearing — the parse lands on the
  proxy thread.

- **O-04: Does MAP-02's "781 sources from a 12.66 MB map in 21 ms" hold inside QuickJS?** It is a
  parenthetical in `REQUIREMENTS.md` and it is not a Phase 0 measurement. D-10's probe settles it.
  If it does not hold, SC1's "completes within the Phase 0 budget" needs restating rather than
  quietly failing.

- **O-05: With D-14 bypassing `admit()`, what vocabulary reports a refused derived artifact?**
  `REJECT_REASONS` is closed and has a mechanical every-reason-has-a-test gate, and it no longer
  covers everything the pipeline refuses. Either extend it (touching the gate D-01 was chosen to
  avoid touching) or define a sibling and say why two are correct — do not leave refusals
  unnamed.

- **O-06: Does D-23's write-on-a-read-path fit `sql-discipline.spec.ts` as it stands?** Single
  statement, fully bound, `project_id`-scoped, epoch re-checked — the gate is static and parses
  every non-spec backend `.ts`. Confirm before the read path is designed around it.

- **O-07: Can the tombstone (D-22) and the analysis state (D-11) stay separate columns without
  producing two degradation vocabularies?** They are different axes — producibility versus analysis
  outcome — and ERR/OBS-02 wants exactly one vocabulary. Decide deliberately; do not let the
  collision be discovered.

- **O-08: What is the display-tree normalisation rule for D-06?** `webpack://`, `..`, absolute
  paths and duplicate labels all have to become a hierarchy the viewer can render. The rule is
  itself a small attack surface and it must be lossless with respect to the stored verbatim string.

### Carried Forward — locked upstream, do not re-open

From `06-CONTEXT.md` (2026-08-31):

- **Phase 6 D-17**: nothing reaches server disk; `llrt/fs`, `node:fs` and `sdk.hostedFile` are
  banned by `filesystem-prohibition.spec.ts`. **D-07 keeps this whole and dissolves O-01's storage
  half; it does NOT re-open it.**
- **Phase 6 D-24**: no BLOB column, no untyped column, a per-table `COLUMN_ALLOWLIST`.
  DEPLOY-04 is satisfied by construction. **Every new Phase 7 table must fit inside this gate; the
  day one does not, the gate fires and D-24 is re-opened deliberately, not routed around.**
- **Phase 6 D-02/D-16**: counters live in `telemetry.ts` and nowhere else, enforced by an AST
  scan; `audit` is written to ONLY when something is destroyed, and its `kind` is a closed CHECK.
- **Phase 6 D-19/D-25**: the Settings surface never shows a path; footprint is reported as row
  counts against retention caps.
- The operator's stated preference across every Phase 5 and Phase 6 decision was **the option that
  minimises permanent, unrecoverable state.** It held again throughout this phase — D-01, D-03,
  D-07, D-19, D-20 and D-22 are all that same call. Resolve residual ambiguity the same way.

From `05-CONTEXT.md` and `05-UI-SPEC.md`:

- **Phase 5 D-04**: exports are a browser download over the RPC; no server-side file is written.
- `05-UI-SPEC.md` `## Rendering Safety Contract` R1–R5 and `## Data & Interaction Contract` govern
  the source viewer exactly as they govern the five existing surfaces. **R1 (text, never markup) is
  the binding constraint on the most hostile data this product has ever rendered.**
- UI-09: degraded and partial states are visibly marked, never silently presented as complete.

From `PROJECT.md` / `STATE.md`, project-wide and non-negotiable:

- QuickJS is single-threaded with no worker threads; CPU-bound work is strictly serial.
- Every write is `project_id`-scoped and re-checks the project epoch; `describeError` redacts
  URL-shaped substrings **before** truncating on anything crossing the RPC.
- Single-statement idempotent writes only — `BEGIN` does not span `exec` calls and fails silently;
  `last_insert_rowid()` is unusable on the pooled connection.
- No raw secret value is ever persisted to SQLite, logs, or any frontend event.
- No regular expression on any path that touches a full body: `REDOS_INTERRUPTIBLE = false`,
  `REDOS_RECOVERY = kill`, and the kill takes the operator's project with it.
- Caido 0.57.1 is UNOBTAINABLE; `~/.caido/caido-cli` on `PATH` is a stale 0.55.3. Every script uses
  the absolute app path and asserts the reported version before recording anything. Phase 1's
  `EXPECTED_CAIDO_VERSION = "0.57.1"` is a deliberate fail-closed tripwire — **D-10's probe must
  declare its own pinned version constant, as Phase 6's D-21 did, and must not contaminate it.**

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/ROADMAP.md` § "Phase 7: Sourcemap Reconstruction" — goal, six success criteria, four
  plan titles. **Note D-01's effect on SC1's external-map coverage, D-10's effect on SC1's "Phase 0
  budget", D-12's on SC3, D-15's on SC5, and D-20's on SC6.**
- `.planning/ROADMAP.md` § "Phase 8: Active Retrieval & Crash Survivability" — ACTIVE-01/02/08.
  D-01 and D-03 hand external `.map` acquisition and its worklist to this phase.
- `.planning/ROADMAP.md` § "Dependency corrections applied" — the row recording that UI-05 and
  MAP-07 were deliberately co-located in Phase 7, and that MAP-06 was moved here to extend corpora
  fixed in an earlier phase. **That earlier phase has not run; D-15 is the consequence.**
- `.planning/REQUIREMENTS.md` § "Sourcemaps (MAP)" — MAP-01 … MAP-07, including MAP-02's
  unverified "781 sources / 12.66 MB / 21 ms" parenthetical (O-04) and MAP-04's now-obsolete
  `realpath`/`lstat` note.
- `.planning/REQUIREMENTS.md` § UI-05 — the reconstructed-source viewer.
- `.planning/REQUIREMENTS.md` § "Persistence (STORE)" — the retention bounds D-09 accepts.
- `.planning/REQUIREMENTS.md` § "Error containment and recovery (ERR)" and OBS-02 — the one-
  vocabulary requirement D-11 ships a slice of, and O-07 must not violate.
- `.planning/REQUIREMENTS.md` § SEC-04/SEC-05 — the reload-and-re-verify pattern D-24 copies.

### Prior decisions this phase builds on
- `.planning/phases/06-retroactive-scan-deployment-reality/06-CONTEXT.md` — **D-17** (no server
  disk, hostedFile declined), **D-24** (no content-bearing column), D-02/D-16 (counters and audit),
  D-19/D-25 (Settings and footprint), D-21 (a separate pinned version constant), and **O-01**, which
  D-07 dissolves by half and D-10 measures the other half of.
- `.planning/phases/06-retroactive-scan-deployment-reality/06-07-SUMMARY.md` §§ 311–312 — the exact
  statement of O-01 as a carried Phase 7 obligation, the "reasoned, not measured" caveat, and the
  record that SC3's traversal suite lost its subject. **Read before touching D-07, D-10 or D-12.**
- `.planning/phases/06-retroactive-scan-deployment-reality/06-01-SUMMARY.md` §378 — O-01 named as
  owned by Phase 7's first plan, discharged by an external-RSS probe.
- `.planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md` — the binding contract.
  `## Rendering Safety Contract` R1–R5 (R1 governs D-18/D-19), `## Data & Interaction Contract`
  (table and selection contracts D-21 reuses), `### Event coalescing (UI-07)`, and
  `### Status vocabulary (UI-09, OBS-02)` for D-22's tombstone copy.
- `.planning/phases/05-workspace-operator-workflow/05-CONTEXT.md` — D-04 (browser download), D-06
  (`audit` age exemption), and the minimise-permanent-state preference.
- `.planning/phases/05-workspace-operator-workflow/05-ENTITY-CONTRACT.md` — the published contract
  and its Deferral Register; the source viewer must not assume any deferred entity surface.

### Measurements that settle specific questions
- `.planning/phases/00-runtime-reality-check/results/SPIKE-06.json` — **the method D-10 must
  reproduce**: fresh instance per size point, external RSS sampler at 50 ms correlated to
  in-runtime markers, fixed operation order. Also the source of `vlq_decode` at 167 ms/8.3 MB
  (D-16), the native `hash` at 13.2 ms/8.3 MB versus 720 ms for the JS loop (D-05/D-24), and
  `decode` at 11.0 ms/8.3 MB.
- `.planning/phases/00-runtime-reality-check/results/go-no-go.json` — `MAX_SYNC_SLICE_MS` (25),
  `YIELD_COST_MS` (5.029), `YIELD_PRIMITIVE` (setTimeout0), `AST_MAX_BYTES` (1,334,405),
  `RSS_BYTES_PER_INPUT_BYTE` (102.112), `HARD_MAX_BYTES`, `REDOS_INTERRUPTIBLE` (false),
  `REDOS_RECOVERY` (kill), `TEXTDECODER_MODULE` (none), `SIZE_GATE_SOURCE`. **All measured on
  0.57.1 and none re-measured — D-10 declares its own version constant.**
- `.planning/phases/00-runtime-reality-check/results/SPIKE-12.json` — the `llrt/fs` containment
  measurement and its 22 hostile fixtures. **Its subject is gone under D-17, but its FIXTURE LIST
  is the starting point for D-12's retained traversal proof.**
- `.planning/research/CODEX-CONTRAST.md` §471 — the argument that large reconstructed source
  belongs in files rather than SQLite. **D-07 answers it by storing neither; the counter-case is
  preserved here rather than deleted.**
- `.planning/research/PITFALLS.md` § "P3: Event-loop starvation" — why a long serial job on the
  QuickJS thread looks like a frozen page. D-08 puts reconstruction on that thread; D-10's gate is
  what keeps P3 from firing.

### Code that constrains this phase
- `packages/backend/src/hooks/admit.ts` — `KIND_JS` as the ONLY admitted kind, the closed
  `REJECT_REASONS` with its every-reason-has-a-test gate, the status→body→size→kind→scope axis
  order, and the two prohibitions (no decode, no regex). **D-01 declines to widen it; D-14 bypasses
  it; O-05 is the debt that creates.**
- `packages/backend/src/ingest/consumer.ts` — the drain loop, `analyseAndFinish`, the `visit` no-op
  where D-08's stage lands, the reload through `sdk.requests.get` that D-07/D-24 depend on, and
  `RETENTION_SWEEP_EVERY_N` (128).
- `packages/backend/src/store/migrations.ts` — the shipped schema, `audit`'s closed `kind` CHECK,
  and where Phase 7's forward step lands. `EXPECTED_TABLES` grows from six.
- `packages/backend/src/store/schema.spec.ts` — **`COLUMN_ALLOWLIST`, `PERMITTED_DECLARED_TYPES`,
  the no-BLOB and no-untyped-column rules, and the per-column justifications.** Every Phase 7 column
  must be added here with an argument in the same register as `observations.url`'s.
- `packages/backend/src/store/sql-discipline.spec.ts` — the static AST gate over every non-spec
  backend `.ts`. D-23's write-on-a-read-path must satisfy it (O-06).
- `packages/backend/src/store/analyses.ts` and `store/retry.ts` — the `scan_state` vocabulary D-11
  reuses and the `partial`/`failed` transition set.
- `packages/backend/src/store/reads.ts` — keyset pagination with deterministic tie-breaking; the
  source list follows this shape rather than inventing one.
- `packages/backend/src/store/export.ts` — `EXPORT_RPC_CHUNK_ROWS` (20,000), `EXPORT_COLUMNS`,
  `serialiseRows`, `redactUrlForExport`, `exportFilename`. **D-20's manifest rides this unchanged;
  content does not ride it at all.**
- `packages/backend/src/telemetry.ts` — `counters` (D-03's home, and the only legal one),
  `slimStatus()`, `describeError`, `URL_REDACTION`, `PATH_REDACTION`.
- `packages/backend/src/filesystem-prohibition.spec.ts` — **the shape D-17's codec gate copies**,
  and the file that makes D-07's premise enforceable rather than aspirational.
- `packages/backend/src/outbound-prohibition.spec.ts` and `scan/httpql-discipline.spec.ts` — the
  other two siblings in the gate family; D-17 is the fourth.
- `packages/backend/src/index.ts` — `sdk.api.register` and `init()`'s ordering contract; the
  on-demand derivation RPC (D-07) and the source-list reads land here.
- `packages/frontend/src/App.vue` — the five-tab strip; D-21 adds nothing to it and extends the
  Artifacts tab instead.
- `packages/frontend/src/components/ArtifactsTable.vue` and
  `packages/frontend/src/shims-virtual-scroller.d.ts` — **the virtualisation precedent and typing
  D-18 reuses.**
- `packages/frontend/src/safety/display.ts` and `safety/HighlightSlices.vue` — the shipped R1/R2
  implementations the viewer must render through.
- `packages/frontend/src/components/export-download.ts` — the measured chunked RPC download D-20's
  manifest uses.
- `package.json` line 32 — `@jridgewell/sourcemap-codec` 1.5.5 is currently a ROOT dependency and
  is in neither workspace package. **D-16 moves it to `packages/frontend`; D-17 keeps it out of
  `packages/backend`.**
- `scripts/ci/check-bundle-imports.mjs` — the DIST-05 bundle allowlist; D-17's gate is the source-
  side sibling that fires earlier and names the offender.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`ingest/consumer.ts` + the bounded queue** — the whole analysis path exists, including the
  once-per-content-hash guard, the epoch re-check, `partial`/`failed` states and the retention
  cadence. D-08 is a stage inside it, not a second pipeline.
- **The `artifacts` / `observations` split** — D-05's identity model is this split applied to a
  second entity class, so `reads.ts`'s keyset queries and tie-breaking carry over unchanged.
- **`store/export.ts` + `frontend/components/export-download.ts`** — the measured chunked RPC
  download. D-20's manifest needs nothing new from it.
- **`shims-virtual-scroller.d.ts` + `ArtifactsTable.vue`** — virtualisation is already in the
  stack, typed, and precedented. D-18 reuses rather than introduces.
- **`safety/display.ts` + `HighlightSlices.vue`** — the shipped R1/R2 machinery; the viewer renders
  through it rather than around it.
- **`filesystem-prohibition.spec.ts`** — a complete, four-times-repeated template for D-17's gate:
  POSIX source-root enumeration, by-name non-vacuity block, firing-and-legal fixture pair per rule.
- **`scripts/spike/instance.sh` and the Phase 0 result-artifact + JSON-schema pattern** — D-10's
  probe harness template, including the absolute-app-path and version-assertion discipline.

### Established Patterns
- **The SQL discipline gate is the strongest invariant in the backend and it is static** — it
  parses every non-spec `.ts` and fails on interpolated SQL, concatenated SQL, named parameters,
  module-scope `prepare`, and any multi-row statement not scoped by `project_id`.
- **`schema.spec.ts` is a per-column allowlist with a written justification per column.** Adding a
  column is a paragraph of argument, not a diff. This is the gate D-07 was chosen to avoid firing.
- **Counters live in `telemetry.ts` and nowhere else**, enforced by an AST scan.
- **A gate a comment can trip is a gate that gets weakened rather than obeyed** (`export.ts`
  header) — D-17 is written against imports, not strings.
- **Prove the branch is unreachable rather than shipping a defence for it** — D-24 (Phase 6) and
  now D-07/D-12: the traversal fixtures are retained as proof of unreachability, not as a test of a
  defence.
- **Record NOT RUN / NOT MEASURED with its reason, never as a silent pass** (Phase 6 D-23,
  `05-VERIFICATION.md`) — D-15 is that discipline applied to a success criterion.
- **Anything crossing the RPC is redacted through `describeError`** — URL-shaped substrings
  replaced BEFORE truncation.

### Integration Points
- `ingest/consumer.ts`'s `visit` seam — D-08's stage.
- `store/migrations.ts` — one forward step for the map and source tables (D-05, D-09, D-22).
- `schema.spec.ts`'s `COLUMN_ALLOWLIST` and `EXPECTED_TABLES` — must be extended in the same
  register as the existing entries.
- `sdk.requests.get` in the consumer — already the reload path; D-07/D-24 make it a read path too.
- `sdk.api.register` in `index.ts` — the on-demand derivation and source-list RPCs.
- `packages/frontend` `package.json` — gains the codec (D-16); `packages/backend` must not.
- The Artifacts tab's selection state and the UI-07 coalescer — D-21's drill-down.

</code_context>

<specifics>
## Specific Ideas

- **The phase got narrower at the front and sharper at the back.** D-01 removes external-map
  acquisition entirely and D-07 removes the storage design, which between them delete most of what
  the roadmap's four plan titles imply — `07-02`'s "content-addressed safe writing" has no writing
  in it, and `07-03`'s "hostile-map fixture suite across three platforms" has one platform and a
  different subject. **The planner must amend the roadmap or state the divergence explicitly in the
  plan set; it must not ship something else under those titles.** That is the same instruction
  Phase 6 gave itself about `06-03`, and Phase 6 honoured it.

- **The one thing that got bigger is the measurement.** D-10 turns SC1's borrowed "Phase 0 budget"
  into a probe this phase owns, and D-08 makes its result load-bearing rather than informational —
  the parse runs on the proxy thread. If the probe is the first plan, everything downstream is
  designed against a real number instead of an extrapolation, which is the failure mode
  `06-07-SUMMARY.md` named in O-01.

- **Two decisions deliberately reach outside the phase and must be declared, not smuggled:**
  D-11 ships a slice of ERR-02/OBS-02 (Phase 2) — the same move Phase 6's D-11 made and announced
  — and D-15 pre-builds corpus data that Phase 3's plan 03-04 owns the harness for. Neither should
  reach a verifier as a surprise.

- **The copy for D-22 matters more than usual, for the same reason Phase 6's D-07 and D-14 did.** "This
  file was recovered on 14 August; the request it came from is no longer in Caido's history, so its
  content can no longer be produced" is explaining an absence, and UI-09's stance — degraded states
  visibly marked, never silently presented as complete — is what makes the difference between an
  honest tool and a broken-looking one.

- **The viewer is the most hostile render surface in the product.** Target-controlled bytes, at
  megabyte scale, in a component whose whole job is to display them faithfully. D-18 and D-19
  together keep that surface as small as it can be while still delivering the feature, and R1's
  "text, never markup" is doing the load-bearing work.

</specifics>

<deferred>
## Deferred Ideas

- **Syntax highlighting in the source viewer.** Declined under D-19 to keep this phase's untrusted-
  render surface minimal while the feature is new. Revisit in Phase 11's hardening/polish, and note
  that any highlighter answers to DIST-05's bundle allowlist and the store's no-obfuscation policy.

- **A bulk "export every recovered source" action.** Declined under D-20 because it needs a second
  export shape `serialiseRows` does not describe and would be a long serial job requiring its own
  progress surface. The offline-grep workflow it serves is real; revisit once there is evidence an
  operator wants the whole tree rather than the files they looked at.

- **A top-level `Sources` tab.** Declined under D-21 because the tab strip already wraps at five.
  Revisit if source browsing turns out to be a primary entry point rather than an artifact
  drill-down.

- **A durable external-`.map` candidate worklist.** Declined under D-03; it belongs with its
  consumer, which is Phase 8's active probe alongside the ACTIVE-02 send journal.

- **Retro lookup of `.map` files in already-captured traffic** via `sdk.requests.query()`. Declined
  under D-01 as a second consumer of the Phase 6 HTTPQL composer for a phase that is otherwise
  passive-only. It is the cheapest way to widen MAP-01 later without going active — revisit in
  Phase 8, where the scope-and-composer machinery is being touched anyway.

- **Percent-encoded and other non-base64 `data:` URI forms.** Declined under D-04. Revisit only if
  a real target is observed emitting one.

- **Removing the eight now-redundant `@internal` JSDoc tags** — carried from
  `.planning/phases/05-workspace-operator-workflow/deferred-items.md` (D-05-07-01) and still
  unclaimed at the end of Phase 6. Needs a plan not diff-locked on `artifacts.ts` /
  `observations.ts`. Not a Phase 7 obligation.

- **Three pre-existing conditions carried from Phase 6's `deferred-items.md`, none of them Phase
  7's but none of them fixed:** `outbound-prohibition.spec.ts`'s byte-compare against
  `REQUIREMENTS.md` failing at `532491a` (WINDOWS 85, remedy printed by the spec itself);
  `sql-discipline.spec.ts`'s leading-keyword blind spot (WINDOWS 84); and the stale SPIKE-10
  recorder entry in `STATE.md` naming a pid that no longer exists.

</deferred>

---

*Phase: 07-sourcemap-reconstruction*
*Context gathered: 2026-09-01*
