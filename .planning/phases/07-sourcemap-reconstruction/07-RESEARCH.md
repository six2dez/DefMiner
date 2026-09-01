# Phase 07: Sourcemap Reconstruction — Research

**Researched:** 2026-09-01
**Domain:** Sourcemap parsing inside Caido's QuickJS; static-gate-constrained SQLite schema growth; hostile-string rendering in a Vue frontend
**Confidence:** HIGH on the codebase and gate landscape; HIGH on the seven open items settled from evidence; **LOW by construction on `MAP_MAX_BYTES`, which is a measurement this phase must take** (O-03).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions — twenty-four, not re-openable

Copied from `.planning/phases/07-sourcemap-reconstruction/07-CONTEXT.md` `<decisions>`. Headline text is verbatim; the supporting argument is in CONTEXT.md and is not restated here.

| ID | Locked decision |
|----|-----------------|
| D-01 | **Inline `data:` URI sourcemaps ONLY. External `.map` files are not fetched, not looked up in existing traffic, and not admitted.** MAP-01's "discovered AND consumed" is met in full only for inline maps; the discovery half only for external ones, and the phase must state that rather than let a verifier find it. |
| D-02 | **The `sourceMappingURL` announcement is located by `lastIndexOf` over a BOUNDED TAIL WINDOW. No regular expression, anywhere on this path.** Window size is the planner's to pick and defend. |
| D-03 | **An external `.map` announcement increments a COUNTER and nothing else.** A `SourceMap:` response header folds into the same counter. Counters live in `telemetry.ts` and nowhere else. |
| D-04 | **`data:` URIs are accepted in base64 form only** — `data:application/json;base64,` and its `;charset=` variant. |
| D-05 | **A recovered source's identity is the sha256 of its CONTENT; each sighting is recorded as `(map sha256, index)`.** Mirrors the `artifacts`/`observations` split. One-way. |
| D-06 | **The raw `sources` entry is stored VERBATIM and normalised only for display.** No write-time sanitisation. |
| D-07 | **NOTHING is held at rest. Only metadata is stored; content is DERIVED ON DEMAND** by reloading the originating request through `sdk.requests.get` and re-parsing the map. **O-01 (Phase 6) is dissolved only in its storage half; the memory half is what D-10 measures.** |
| D-08 | **Reconstruction is a STAGE INSIDE the existing bounded consumer, always on, no toggle** — at `visit`, sharing the 25 ms slice and the `setTimeout0` yield. |
| D-09 | **One row per recovered source, subject to the NORMAL retention caps.** No exemption, no per-map cap. |
| D-10 | **`MAP_MAX_BYTES` is MEASURED by a Phase 7 probe, not borrowed and not extrapolated.** SPIKE-06's method. Declares its OWN pinned version constant. |
| D-11 | **A refused, truncated or malformed map records `analyses.scan_state = 'partial'` with its existing redacted 240-char error.** Ships a slice of ERR-02/OBS-02 ahead of Phase 2 — declared, not smuggled. |
| D-12 | **The MAP-05 fixture suite covers resource, display and structural hostility — AND retains the traversal fixtures as a standing non-vacuity proof** that a `sources` entry never reaches a path-like sink. |
| D-13 | **Recovered sources are wired into the analysis path NOW, depth capped at 1, no re-entry, and the bound is proven by a detector that exists ONLY in the test suite.** |
| D-14 | **Recovered sources enter through a SEPARATE derived-artifact path that BYPASSES `admit()`.** Carries a size bound only. Costly to reverse. |
| D-15 | **The reconstructed-source corpus FIXTURES ship; the false-positive RATE is recorded NOT MEASURED, with its reason.** Never a silent pass. |
| D-16 | **`@jridgewell/sourcemap-codec` is used, for minified↔source position mapping in the viewer, and the decode runs in the FRONTEND.** The codec moves to `packages/frontend`; the raw `mappings` string crosses the RPC. |
| D-17 | **A PACKAGE-LEVEL static gate: no `packages/backend` module imports the codec, in any specifier form.** Fourth sibling of the gate family. Costly to reverse. |
| D-18 | **The content is rendered VIRTUALISED, using the scroller already in the stack.** A window of lines, never the file. |
| D-19 | **No syntax highlighting. Plain monospaced text.** |
| D-20 | **MAP-07 splits at the export path's own seam. The MANIFEST exports as rows through `export.ts` unchanged; CONTENT is saved one file at a time from the viewer**, re-derived on demand per D-07. |
| D-21 | **The viewer lives INSIDE the Artifacts tab as a drill-down.** No sixth tab. |
| D-22 | **When the originating request is gone, the row is KEPT AS A TOMBSTONE with a distinct state** — visibly marked under UI-09. |
| D-23 | **Unreachability is detected LAZILY at open, and the outcome STICKS to the row.** Puts a WRITE on a READ path. |
| D-24 | **Every on-demand derivation RE-VERIFIES the reloaded body against the recorded artifact sha256 and FAILS CLOSED on a mismatch.** |

### Claude's Discretion

Verbatim from CONTEXT.md:

> The operator took every question. Nothing was delegated. Where a decision above names an open
> question (O-01 … O-08), the researcher settles it from evidence and the planner escalates rather
> than inventing an answer — that is not discretion.
>
> Genuinely left to the planner, and only these: the D-02 tail-window size, the D-14 derived-path
> size bound, and the D-09 row accounting's exact column list. Each must be a number or a shape the
> plan defends, not one it inherits.

**All three of those discretionary numbers are constrained by findings below.** The D-02 window is *derivable* from D-10's measurement rather than free (see §O-03 / Pitfall 1); the D-14 size bound is the same number as `MAP_MAX_BYTES` in the common case; and the D-09 column list collides with a shipped convergence assertion (Pitfall 2).

### Deferred Ideas (OUT OF SCOPE)

Verbatim headlines from CONTEXT.md `<deferred>`:

- **Syntax highlighting in the source viewer.** Declined under D-19. Revisit in Phase 11.
- **A bulk "export every recovered source" action.** Declined under D-20.
- **A top-level `Sources` tab.** Declined under D-21.
- **A durable external-`.map` candidate worklist.** Declined under D-03; belongs with Phase 8.
- **Retro lookup of `.map` files in already-captured traffic** via `sdk.requests.query()`. Declined under D-01; revisit in Phase 8.
- **Percent-encoded and other non-base64 `data:` URI forms.** Declined under D-04.
- **Removing the eight now-redundant `@internal` JSDoc tags** (D-05-07-01). Not a Phase 7 obligation.
- **Three pre-existing conditions carried from Phase 6's `deferred-items.md`**, none of them Phase 7's: `outbound-prohibition.spec.ts`'s byte-compare failing at `532491a` (WINDOWS 85), `sql-discipline.spec.ts`'s leading-keyword blind spot (WINDOWS 84), and the stale SPIKE-10 recorder entry in `STATE.md`.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

Requirement text quoted verbatim from `.planning/REQUIREMENTS.md` §"Sourcemaps (MAP)" lines 838–844 and §UI-05 line 884.

| ID | Description (verbatim) | Research support |
|----|------------------------|------------------|
| MAP-01 | "Sourcemaps announced by `sourceMappingURL` comments, data URIs, and `SourceMap` response headers are discovered and consumed." | §O-03/Pitfall 1 (the tail window and why its size is derived, not chosen); measured announcement geometry from three real bundles; D-03's counter covers the external and header cases as *discovery only* — the phase must say so. |
| MAP-02 | "Source reconstruction from `sourcesContent` via `JSON.parse`, with no VLQ decoding on the primary path. *(Measured: 781 sources recovered from a 12.66 MB monaco map in 21 ms.)*" | **§O-04 settles the parenthetical's provenance: it was measured in standalone native quickjs-ng 0.16.1, not in Caido.** §O-03 specifies the probe that replaces it. D-17's package gate is what makes "no VLQ on the primary path" mechanical. |
| MAP-03 | "VLQ decoding via `@jridgewell/sourcemap-codec` (1,961 bytes minified) only where position attribution is genuinely needed." | §Standard Stack (codec API verified from the installed package: `decode(mappings: string)`, whole-string only, zero runtime deps); §O-01 (the transport for `mappings`); §D-16 move requirements. |
| MAP-04 | "Reconstructed files are written to content-addressed safe paths. `sources` entries from the map are never used as filesystem paths. *(JSMiner's canonical-path defence cannot be copied — `llrt/fs` has no `realpath` and no `lstat`.)*" | **First clause has no subject under D-07/D-17 — nothing is written.** Second clause is met by D-12's retained traversal proof (§SPIKE-12 enumeration). The parenthetical is doubly obsolete: SPIKE-12 measured `lstat` *is* available (`REQUIREMENTS.md:28`), and the filesystem is banned regardless. |
| MAP-05 | "Malformed maps, decompression bombs, path traversal attempts, and reference cycles are bounded and survive a fixture suite." | §Common Pitfalls (the structural hostility set, grounded in the spec); §SPIKE-12 enumeration for the traversal half; §Validation Architecture for what each class is testable at. |
| MAP-06 | "Reconstructed sources are themselves analysed, once per content hash, with depth and aggregate limits." | §consumer.ts seam (the once-per-content-hash guard already exists at `isAnalysed`/`claimAnalysis`); D-13's test-only detector; **Pitfall 2 is the aggregate limit nobody has costed.** |
| MAP-07 | "Reconstructed source is browsable in the plugin UI and exportable with a manifest." | §O-01 (the manifest rides `export.ts` unchanged — `EXPORT_COLUMNS`/`serialiseRows`); content is the viewer's single-file save per D-20. The phase must state which half each mechanism meets. |
| UI-05 | "Reconstructed-source viewer." | §O-02 (the no-line-structure case); §O-08 (the display tree); R1/R2 landscape and the **third truncation tier** the viewer needs. |

</phase_requirements>

---

## Summary

Phase 7 is not the phase the roadmap describes, and the divergence is larger than CONTEXT.md's own note claims. Three structural facts, each discovered from the shipped tree rather than reasoned:

**First, D-01 plus the shipped admission ceiling bounds this phase's whole input space by construction.** `PASSIVE_MAX_BYTES = 8_388_608` [VERIFIED: packages/engine/src/thresholds.ts:40] is the largest body `admit()` accepts, and it is re-checked authoritatively at the reload [VERIFIED: packages/backend/src/ingest/consumer.ts:583 `if (got.byteLen > PASSIVE_MAX_BYTES)`]. An inline `data:application/json;base64,` map lives *inside* that body, so its decoded JSON can never exceed ⌊8,388,608 × 3/4⌋ = **6,291,456 bytes**, minus the announcement prefix and the JS around it. MAP-02's 12.66 MB monaco case is therefore not merely unmeasured in QuickJS — **it cannot arise on the inline path at all**, and monaco's own map is announced externally anyway [VERIFIED: `corpus/monaco-0.52.2.js` tail = `//# sourceMappingURL=../../../min-maps/vs/editor/editor.main.js.map`]. This reframes O-03 and O-04 from "can we afford the monaco case" to "where inside a 6.29 MB ceiling does `JSON.parse` stop being affordable on the proxy thread".

**Second, none of the eight pinned corpus bundles carries an inline map.** All three that announce one announce an *external* `.map` [VERIFIED: measured tail bytes of `corpus/*.js`, this session — babel, monaco, tfjs; five others carry no announcement in their last 300 bytes]. Under D-01 the entire committed real-world corpus produces **zero** recovered sources and eight D-03 counter increments. D-15's corpus fixtures must therefore be *manufactured or newly fetched*; they cannot be derived from what is already in the repo.

**Third, D-09 as written breaks a shipped, asserted convergence inequality.** `RETENTION_SWEEP_MAX_ROWS (512) >= ROWS_INSERTED_PER_ARTIFACT_MAX (3) × RETENTION_SWEEP_EVERY_N (128)` is asserted mechanically [VERIFIED: packages/engine/src/thresholds.spec.ts:189-202], and the same file caps the left-hand side at 1024 [VERIFIED: thresholds.spec.ts:204-212]. One 781-source map inserts up to 1,562 rows in a single consumer iteration under D-05's two-table split, against a per-artifact worst case of 3. This is Pitfall 2 and it needs a decision in the plan, not a discovery in review.

**Primary recommendation:** make the probe (O-03) the first plan, size **both** `MAP_MAX_BYTES` and the D-02 tail window from its result, and resolve Pitfall 2 by changing the sweep cadence to count *rows inserted* rather than *artifacts processed* — which satisfies the inequality without the per-map cap D-09 rejected.

---

## Architectural Responsibility Map

There is no "browser tier vs API tier" here in the usual sense — this is a Caido plugin with a QuickJS backend and a Vue frontend that talk over `sdk.api.register` — but the tier assignment is exactly where this phase can go wrong, because D-16 deliberately moves one capability across the boundary.

| Capability | Primary tier | Secondary tier | Rationale |
|------------|--------------|----------------|-----------|
| Announcement discovery (`//# sourceMappingURL=`) | **Backend — `ingest/consumer.ts` `visit` seam** | — | D-08. The body only exists on the backend; it is never shipped whole. |
| base64 decode of the `data:` payload | **Backend** | — | D-04. Must happen before `JSON.parse`; `atob`/`Buffer` are backend globals (§Decode Primitives). |
| `JSON.parse` of the map | **Backend** | — | D-07/D-08. On the proxy thread, inside the 25 ms slice budget. **This is the operation O-03 must measure.** |
| sha256 of each recovered source | **Backend — `@defminer/engine/digest`** | — | D-05. Native `createHash` [VERIFIED: packages/engine/src/digest.ts:9,23-25]. 13.2 ms/8.3 MB measured vs 720 ms for the JS loop. |
| Metadata persistence (map row, source row, sighting row) | **Backend — `store/`** | — | D-05/D-09. Subject to `schema.spec.ts` and `sql-discipline.spec.ts`. |
| On-demand content derivation + sha256 re-verify | **Backend RPC** | — | D-07/D-24. Requires `sdk.requests.get`, which only the backend has. |
| Producibility (tombstone) detection and its write | **Backend, on a read RPC** | — | D-23. §O-06. |
| **VLQ decode of `mappings`** | **Frontend** | — | **D-16 — the one deliberate tier move.** 167 ms/8.3 MB in QuickJS vs a shrug in a real browser. D-17 makes it a capability ban, not a convention. |
| Display-tree normalisation of `sources` | **Frontend** | — | D-06 stores verbatim; normalisation is display-only, so it belongs where display lives. §O-08. |
| R1/R2 sanitisation and truncation | **Frontend — `safety/display.ts`** | — | Shipped, tested, and the only correct home. §O-02. |
| Line-window virtualisation | **Frontend** | — | D-18. `RecycleScroller` is already in the stack. |
| Manifest export | **Backend `export.ts` → frontend `export-download.ts`** | — | D-20. Rides the chunked RPC unchanged. |
| Single-file content save | **Frontend, from the viewer** | Backend derivation RPC | D-20. Re-derives per D-07 rather than exporting in bulk. |

**The one tier error this phase is most likely to make:** putting the VLQ decode in the backend "just for now". That is precisely what D-17's gate exists to catch on the day it is written, and why the ban is on the *import* rather than on the *call*.

---

## The Eight Open Items — Verdicts

This is the section the planner should read first. Seven of the eight are settled from evidence in the shipped tree; one is a measurement and is marked as such. Where a verdict rests on an argument rather than a measurement, that is stated in the verdict, because substituting the one for the other is the exact failure `06-07-SUMMARY.md` recorded against Phase 6's O-01.

---

### O-01 — What bounds the raw `mappings` string crossing the RPC?

**VERDICT: SETTLED. No new transport and no new bound are needed. The bound already exists, twice over, and the composition is tight enough to state as an invariant. But the number it is compared against is a project *budget*, not a measured Caido ceiling — and the phase must not represent it as one.**

**What exists.**

The only chunked transport in the project is row-based:

> `export const EXPORT_RPC_CHUNK_ROWS = 20_000;` [VERIFIED: packages/backend/src/store/export.ts:130]

Its derivation is stated in the doc comment immediately above it [VERIFIED: packages/backend/src/store/export.ts:104-129], and the load-bearing sentence is this, verbatim:

> `THE 8 MiB FIGURE IS A BUDGET THIS PROJECT SETS, NOT A CEILING IT MEASURED FROM CAIDO. Nothing in this repository can push bytes through Caido's RPC, so the real ceiling is live-only`

The budget itself is declared in the spec that derives the chunk constant:

> `const MAX_RPC_PAYLOAD_BYTES = 8 * 1024 * 1024;` [VERIFIED: tests/export-payload-budget.spec.ts:86]

with the justification, verbatim:

> `A BUDGET, NOT A DISCOVERED LIMIT` [VERIFIED: tests/export-payload-budget.spec.ts:78]

The derivation the spec asserts: 50,000 rows is 13.87 MiB of CSV / 17.49 MiB of JSON, worst case 366.87 B/row; 20,000 rows is 7.00 MiB and fits, 25,000 is 8.75 MiB and does not [VERIFIED: packages/backend/src/store/export.ts:108-113].

**So: is there a measured payload ceiling anywhere? No.** There is an 8 MiB policy budget, asserted mechanically, and an explicit written statement that nothing in the repo can measure the real one.

**Why the `mappings` string needs neither chunking nor a new bound.**

The bound comes from composing two shipped facts:

1. `admit()` refuses any body over `PASSIVE_MAX_BYTES` [VERIFIED: packages/backend/src/hooks/admit.ts:207 `if (bytes > cfg.maxBytes) return reject("too_large");`, with `maxBytes: PASSIVE_MAX_BYTES` at admit.ts:77], and the consumer re-checks it authoritatively against bytes in hand [VERIFIED: packages/backend/src/ingest/consumer.ts:583].
2. `export const PASSIVE_MAX_BYTES = 8_388_608;` [VERIFIED: packages/engine/src/thresholds.ts:40] — 8 MiB, the *same number* as the RPC budget.

Under D-01 the map is base64-embedded inside that body. Base64 expands 4:3, so:

```
decoded map JSON  ≤  ⌊8,388,608 × 3/4⌋  =  6,291,456 bytes
mappings          ⊂  map JSON            (a JSON string member of it)
∴ mappings        <  6,291,456 bytes  <  8,388,608 = MAX_RPC_PAYLOAD_BYTES
```

The inequality is strict and has ~2.1 MiB of slack, before the announcement prefix and the surrounding JS are even subtracted. **A single un-chunked RPC response carrying the whole `mappings` string is inside the project's own budget by construction.**

**What the plan must therefore do — four things, none of them a new transport:**

1. **Assert the inequality in code**, in the `POLICY_DERIVED_FROM` idiom [VERIFIED: packages/engine/src/thresholds.ts:196-217] and in `thresholds.spec.ts`'s style of asserting *the inequality, not the number it currently evaluates to* [VERIFIED: packages/engine/src/thresholds.spec.ts:216-220, verbatim: `THE INEQUALITY IS THE PROPERTY, not the number it currently evaluates to`]. Written as `MAP_MAX_BYTES <= MAX_RPC_PAYLOAD_BYTES`, it goes red the day `PASSIVE_MAX_BYTES` is raised — which is the only way this composition can break.
2. **Bound it a second time at `MAP_MAX_BYTES`**, once O-03 lands. `mappings ⊂ map JSON ≤ MAP_MAX_BYTES`, and `MAP_MAX_BYTES` will almost certainly be *below* 6.29 MB, making the RPC bound doubly slack.
3. **Refuse rather than truncate** when the map is over `MAP_MAX_BYTES` — D-11's `partial` state with its redacted error, not a silently shortened `mappings` string. A truncated VLQ stream decodes to *wrong positions*, not to an error, which is the quiet-wrongness class every gate in this codebase exists to prevent.
4. **Sanitise it on arrival like every other untrusted value.** `mappings` is target-controlled and answers to R1/R2. It is never rendered directly — it is decoded to integers — but the *decode can throw* on hostile input, and the frontend must catch and degrade rather than let an exception take the viewer down. `05-UI-SPEC.md` R2's tooltip clause is the relevant precedent for "this value never goes in the DOM".

**Residual, stated:** the 8 MiB figure remains unmeasured against real Caido. If Caido's RPC has a lower real ceiling, a 6 MB `mappings` response fails at a layer this repo cannot test. That residual is **pre-existing and unchanged by Phase 7** — `exportInventory` already ships 7.00 MiB responses under the same assumption — so Phase 7 inherits it rather than creating it. Recording it here is the honest form; adding a chunked string transport to hedge against an unmeasured number would be building machinery for a defect nobody has observed.

---

### O-02 — How does the virtualised viewer handle a file with no usable line structure?

**VERDICT: SETTLED. The answer is a per-line application of R2 with its own cap, plus a UI-09 degradation marker — and the shipped code already contains both the mechanism and the measurement that makes it necessary.**

**First, correct a factual slip in D-18.** CONTEXT.md says "`ArtifactsTable.vue` established the pattern". It did not. `ArtifactsTable.vue` declares a column list and mounts the shared shell [VERIFIED: packages/frontend/src/components/ArtifactsTable.vue:1-13, verbatim: `Every state — empty, filtered-empty, loading, error, populated — belongs to InventoryTable.vue`]. The actual `RecycleScroller` usage is in `InventoryTable.vue` [VERIFIED: packages/frontend/src/components/InventoryTable.vue:55 `import { RecycleScroller } from "vue-virtual-scroller";`, used at :473-531]. The planner should read `InventoryTable.vue`, not `ArtifactsTable.vue`, for the precedent.

**Second, the shipped code already declined virtualisation once, for exactly this reason.** `ScanHistoryList.vue` records it verbatim:

> `a VARIABLE ROW HEIGHT — the one thing RecycleScroller's fast path forbids` [VERIFIED: packages/frontend/src/components/ScanHistoryList.vue:33]

and the shim's own doc comment says the same:

> `The FIXED item height in CSS pixels. A variable height here degrades the scroller to its dynamic variant and costs the 10,000-row target.` [VERIFIED: packages/frontend/src/shims-virtual-scroller.d.ts:22-23]

So a variable-height line window is not available. The window must be fixed-height rows.

**Third, the cost of getting this wrong is measured, in this repo, on this surface.** `safety/display.ts` carries the numbers verbatim [VERIFIED: packages/frontend/src/safety/display.ts:110-121]:

> `On a 4 MiB single-line hostile value that walk is ~170 ms, and tests/frontend-load.spec.ts measured what it costs on the real surface. BOTH NUMBERS, because the delta is the argument:`
> `  through forCell      99 of 396 frames over the 32 ms budget, max 442 ms, p95 418 ms, scroll 37,395 ms`
> `  through forCellText   0 of 396 frames over budget, max 23.8 ms, p95 17.1 ms, scroll 4,010 ms`

A 4 MiB single-line value is *precisely* the O-02 case, and the repo has already measured that the wrong call on it produces a 37-second scroll.

**The recommended rule, in four parts:**

1. **Split on `\n` only, into a fixed-length array of line strings, ONCE, at derivation time — never per render.** The split is bounded because the map is bounded (`MAP_MAX_BYTES`).
2. **Apply R2 steps 1, 2 and 4 (control strip, bidi strip, `white-space: pre` + `overflow: hidden`) per rendered line**, through `forCellText` — the text-only path, for the measured reason above. **Never `forCell`** on this surface: `forCell` returns `total`, which forces a walk of the whole value [VERIFIED: display.ts:110-114].
3. **Apply R2 step 3 (grapheme truncation) per line, at a NEW third cap.** The shipped caps are `TABLE_CELL_MAX_GRAPHEMES = 256` [VERIFIED: packages/engine/src/sanitise.ts:116] and `EVIDENCE_PANEL_MAX_GRAPHEMES = 2048` [VERIFIED: packages/engine/src/sanitise.ts:120]. Neither describes a source-code line. `display.ts`'s header is explicit that the cap must be **bound in the function name** so a call site cannot reach the wrong one by mistyping [VERIFIED: display.ts:22-23 and :124-125, verbatim: `bound in the function name for the reason this file's header gives, so a call site cannot reach for the panel's 2,048 by mistyping`]. So the phase adds `SOURCE_LINE_MAX_GRAPHEMES` to `sanitise.ts` and a `forSourceLine()` to `display.ts` — two named additions, in the existing idiom, not a fourth ad-hoc number at a call site.
4. **Mark the degradation visibly, per UI-09.** A file whose longest line exceeds the cap, or whose line count is 1 while its byte length is large, is *minified source recovered as a "source"* — which is real intelligence about the bundle, not a rendering failure. The viewer says so in DefMiner's own words, in the register D-22's copy uses: something of the shape *"This file has no line structure — it is one line of N bytes. Lines are truncated at {cap} characters."* The copy is the UI phase's to fix; the **requirement** is that the state is named and rendered, never silently presented as a complete view.

**Why this is not "fall back to the byte window we declined".** The declined option was a *different virtualisation geometry* — windows measured in bytes rather than lines. This keeps line-window virtualisation exactly as D-18 chose it, and handles the degenerate case the way the product handles every other degenerate case: bound it, mark it, and say what it means. A one-line file renders as one row. That row is truncated and labelled. Nothing about the scroller changes.

**Residual:** a file with 6 million *short* lines is line-structured and passes every check above, and the split array is then ~6M strings. The line **count** therefore also needs a cap, with the same UI-09 marking. The planner should derive it from the same probe as `MAP_MAX_BYTES` — the array-of-strings allocation is part of what the probe's RSS sampler will see.

---

### O-03 — What is `MAP_MAX_BYTES`?

**VERDICT: UNSETTLED — needs a probe.** This is a measurement and nothing in the repo substitutes for it. What *is* settled is the ceiling it must sit under, the method it must reproduce, and the target it must run against — all specified below tightly enough to build from.

**Why no existing number can be borrowed, verified rather than asserted.**

I read the SPIKE-06 probe source. Its six measured operations are, verbatim from the source: `read`, `decode`, `hash`, `hash_js_loop`, `vlq_decode`, `tokenize`, `parse` [VERIFIED: tier1/parse/src/index.ts:225-263 — `measured(sdk, "read", …)`, `measured(sdk, "decode", () => bytes.toString("utf8"))`, `measured(sdk, "hash", …)`, `measured(sdk, "hash_js_loop", …)`, `measured(sdk, "vlq_decode", …)`, and the parse marks at :333-370]. **`decode` is `Buffer.toString("utf8")`, not a base64 decode and not `JSON.parse`.** There is no `JSON.parse` operation anywhere in the probe, and no `json_parse` measurement in `SPIKE-06.json` [VERIFIED: enumerated every `op_cost` row in `.planning/phases/00-runtime-reality-check/results/SPIKE-06.json` this session; the operation set is exactly the seven names above].

The two numbers most likely to be misappropriated, and why each is wrong:

- `AST_MAX_BYTES = 1334405` [VERIFIED: packages/engine/src/thresholds.generated.ts:19] — derived from a *meriyah stall*, at 785.8 ms/MB. `JSON.parse` is a different cost curve and a different allocator profile. D-10 already rejects it.
- `RSS_BYTES_PER_INPUT_BYTE = 102.112` [VERIFIED: thresholds.generated.ts:38] — the go-no-go rationale states its scope verbatim: `Median RSS STEP for the parse operation divided by input bytes` and its confidence is **MEDIUM**, not HIGH. Applying a meriyah-with-`ranges:true` figure to `JSON.parse` is the exact "reasoned, not measured" move Phase 6's O-01 was faulted for.

**The ceiling `MAP_MAX_BYTES` must sit under, which IS settled.**

From §Summary: an inline map's decoded JSON cannot exceed **6,291,456 bytes** (⌊`PASSIVE_MAX_BYTES` × 3/4⌋). So the probe's size ladder needs no point above ~6.3 MB, and `MAP_MAX_BYTES` is `min(measured_stall_bound, measured_rss_bound, 6_291_456)`. If the probe finds the parse affordable across the whole range, `MAP_MAX_BYTES` is simply the structural ceiling — and that is a legitimate, defensible outcome that must be recorded as *measured to be non-binding*, not as *not measured*.

**THE PROBE SPECIFICATION**

*Target binary — and this is the first thing to get right.*

`scripts/spike/instance.sh` defaults to `EXPECT_VERSION=0.57.1` [VERIFIED: scripts/spike/instance.sh:19] against `/Applications/Caido.app/Contents/Resources/bin/caido-cli` [VERIFIED: instance.sh:18]. **That app bundle now reports `Caido 0.58.2`** [VERIFIED: executed `/Applications/Caido.app/Contents/Resources/bin/caido-cli --version` this session → `Caido 0.58.2`]. The default therefore fails closed, exactly as designed — and the probe must not "fix" it by editing the default.

Three runnable builds exist on this host [VERIFIED: executed this session]:

| Path | Reports | Use |
|------|---------|-----|
| `/Applications/Caido.app/Contents/Resources/bin/caido-cli` | `Caido 0.58.2` | Drifts with the desktop auto-updater. Phase 6 pinned this one (`EXPECTED_CAIDO_VERSION = "0.58.2"` [VERIFIED: tests/phase6-matrix.spec.ts:53]). |
| `.caido-bin/0.58.0/caido-cli` | `Caido 0.58.0` | **Recommended.** In-repo, sha512-verified before extraction, reproducible via `bash scripts/phase1/fetch-caido.sh 0.58.0`. |
| `~/.caido/caido-cli` | `Caido 0.55.3` | **Banned.** Named as the stale trap in `instance.sh:83`. |

`.caido-bin/0.58.0/release.json` records `"verified": true`, `"verified_before_extraction": true`, `"hash_source": "api"`, and `"computed_sha512"` equal to `"published_sha512"` [VERIFIED: .caido-bin/0.58.0/release.json]. Pinning the probe to this build makes the measurement reproducible by anyone who runs `fetch-caido.sh 0.58.0`, which the app bundle can never be.

**So: `MAP_PROBE_EXPECTED_VERSION = "0.58.0"`, its own constant, in the probe's own files, contaminating neither Phase 1's `"0.57.1"` tripwire nor Phase 6's `"0.58.2"`.** This is D-21 (Phase 6) applied a second time, and `tests/phase6-matrix.spec.ts:19-27` states the argument verbatim for reuse.

*Method — reproducing SPIKE-06's, quoted so it cannot drift.* From `SPIKE-06.json`'s `method` field, verbatim:

> `Phase A ran six operations (decode, native hash, per-character JS-loop hash, VLQ decode, acorn tokenize, meriyah parse) at four size points, ONE FRESH INSTANCE PER POINT, with an external RSS sampler at 50 ms attached to that instance's PID and correlated to in-runtime Date.now() markers. Operation order is fixed with parse last, because RSS never falls in this runtime and each step delta is only meaningful as an increment on what came before. Input is read from DISK, not through the proxy, so proxy variance does not enter a parse-cost measurement.`

The Phase 7 probe reproduces every clause of that:

1. **Fresh instance per size point.** Non-negotiable, and `ladder.sh` states why verbatim: `RSS is a high-water mark that never falls, the allocator does not return pages to the OS, and there is no gc() to force a collection before a reading. Reusing an instance makes every point after the first meaningless.` [VERIFIED: scripts/spike/ladder.sh:12-19]. It also names the gate: `The gate asserts run_id UNIQUENESS, not merely fresh:true` — and that gate is live [VERIFIED: tests/spike-results.spec.ts:81-85].
2. **External RSS sampler at 50 ms**, reusing `scripts/spike/rss-sampler.sh` unmodified. Its default interval is already `HZ="${3:-0.05}"` [VERIFIED: scripts/spike/rss-sampler.sh:19] and it emits unix-millisecond timestamps for correlation [VERIFIED: rss-sampler.sh:12-14]. It is the only memory measurement available: `Caido's QuickJS exposes no memory introspection whatsoever` [VERIFIED: rss-sampler.sh:6-8].
3. **In-runtime markers correlated to it**, via the `measured()` helper's `MARK_START`/`MARK_END` lines carrying both `Date.now()` and `performance.now()` [VERIFIED: tier1/parse/src/index.ts, `function measured` — logs `MARK_START ${label} date=${startDate} qjs=${t0}` and the matching `MARK_END`].
4. **Fixed operation order, heaviest last**, for the reason quoted above.

*Operations to measure — the ones Phase 7 actually needs and SPIKE-06 does not have:*

| Op | What it is | Why |
|----|-----------|-----|
| `b64_decode_atob` | `atob(payload)` | D-04's decode, primitive 1. §Decode Primitives. |
| `b64_decode_buffer` | `Buffer.from(payload, "base64")` | D-04's decode, primitive 2 — and the **correct** one for non-ASCII (§Pitfall 4). Measure both; the delta is the argument for choosing. |
| `json_parse` | `JSON.parse(mapJson)` | **The operation this whole probe exists for.** D-08 puts it on the proxy thread against a 25 ms slice. |
| `sources_materialise` | iterate `map.sourcesContent`, hash each with native `createHash` | D-05's cost, and the step where peak RSS actually lands — `JSON.parse` alone does not tell you what holding 781 strings costs. |
| `announce_scan` | `body.lastIndexOf("//# sourceMappingURL=")` over the tail window | **UNMEASURED ANYWHERE.** D-02's whole cost model rests on it. §Pitfall 1. |

*Size ladder.* Points at roughly 0.5, 1.5, 3, 6.29 MB of **decoded map JSON** — matching SPIKE-06's ladder shape and topping out at the structural ceiling rather than above it. Each point is a real map, not synthetic JSON: `JSON.parse` cost depends on string-vs-structure ratio, and a map is ~90% long string literals in `sourcesContent`, which is not what a generic JSON fixture looks like.

*Fixture sourcing — and this is a real obstacle, named rather than assumed away.* **No corpus bundle carries an inline map** (§Summary). The probe must therefore build its own: take a real external `.map` (monaco's, babel's, tfjs's — all three are announced and fetchable), base64-encode it, and synthesise the containing JS. That synthesis is legitimate for a *cost* measurement and it is the same fixture set D-15 needs, so build it once and commit it under `corpus/maps/` with a sha256 gate in the `fetch-corpus.sh` idiom.

*Artifact and gate.* The result JSON must satisfy `.planning/phases/00-runtime-reality-check/results/spike-result.schema.json`, whose required keys are `["spike","status","recorded_at","binary","host","instances","method","measurements","verdict","requirements_affected"]` [VERIFIED: read this session]. But **do not write it into Phase 0's results directory** — `tests/spike-results.spec.ts` globs `/^SPIKE-\d\d[a-z]?\.json$/` under `.planning/phases/00-runtime-reality-check/results` [VERIFIED: tests/spike-results.spec.ts:5,17] and a Phase 7 artifact landing there would be gated by a spec that pins 0.57.1. Follow Phase 6: its own `results/` directory with its own schema and its own `tests/phase7-*.spec.ts` gate [VERIFIED: `.planning/phases/06-retroactive-scan-deployment-reality/results/` holds `matrix-result.json` + `matrix-result.schema.json`, gated by `tests/phase6-matrix.spec.ts`]. That gate's doctrine, verbatim: `FAIL, NEVER SKIP, and name the remedy in every message` [VERIFIED: tests/phase6-matrix.spec.ts:16].

*Ports.* Allocated in the repo today: 3100, 8080–8083, 8951–8955, 8961–8965, 8971–8975, 8981–8985, 8990–8999 [VERIFIED: grep over `scripts/` this session]. **8941–8945 is free**; take that block, and refuse 8080 unconditionally as `instance.sh:94-98` already does.

*What "if wrong" means, since the schema requires `verdict.if_wrong`.* If `MAP_MAX_BYTES` lands far below the 6.29 MB structural ceiling, D-08's always-on placement is still correct but the phase recovers source from a *minority* of inline maps and must say so in the UI rather than appear to have found nothing. If it lands at the ceiling, `MAP_MAX_BYTES` is non-binding and the D-02 window is the full base64 span. Both outcomes are shippable; the one that is not is not measuring.

---

### O-04 — Does MAP-02's "781 sources from a 12.66 MB map in 21 ms" hold inside QuickJS?

**VERDICT: SETTLED as to provenance — the number is real but was NOT measured in Caido, and under D-01 the case it describes cannot occur. It must be struck from SC1 rather than re-validated.**

**Where the number came from.** `.planning/research/STACK.md` states the corpus and the harness on the same line [VERIFIED: STACK.md:201, verbatim]:

> `Corpus: the **real** monaco-editor@0.52.2 sourcemap — 12.66 MB, 781 sources, 3.67 MB of VLQ mappings, with sourcesContent. Native quickjs-ng.`

and the appendix names the harness precisely [VERIFIED: STACK.md:546, verbatim]:

> `**Harnesses:** (a) native quickjs-ng 0.16.1 (Homebrew, arm64) via qjs --stack-size 65536 --memory-limit 4194304; (b) quickjs-emscripten (wasm32 QuickJS) for the memory-instrumented runs; (c) Node 26.7.0 / V8 as the reference.`

with the figure itself at [VERIFIED: STACK.md:570]:

> `**Sourcemap (12.66 MB monaco map), native quickjs-ng:** JSON.parse+sourcesContent **21 ms** · @jridgewell/sourcemap-codec decode **554 ms** · @jridgewell/trace-mapping +1000 lookups **570 ms** · source-map-js +1000 lookups **2,866 ms**.`

**So the answer to "was it measured on Node?" is: no — but not in Caido either.** It was standalone `quickjs-ng 0.16.1`. That is a meaningfully different runtime from Caido's embedded QuickJS, and this project already knows the gap is material: SPIKE-06's own header states the reason it exists, verbatim — `what are the real CPU and RSS budgets INSIDE Caido — not standalone quickjs-ng` [VERIFIED: tier1/parse/src/index.ts:6-7].

**The gap is quantifiable on the one operation measured both ways.** STACK.md's native meriyah figure is 4.91 MB in 3,043 ms = **620 ms/MB** [VERIFIED: STACK.md:551-554]; SPIKE-06 measured **785.8 ms/MB** in Caido [VERIFIED: go-no-go.json `AST_MAX_BYTES` rationale, verbatim: `At the measured 785.8 ms/MB`]. So Caido ran ~**1.27×** slower than standalone on parse. **This ratio is a single-operation observation and must NOT be used to project `JSON.parse`** — that projection is exactly the move D-10 forbids. It is stated here only to establish that the gap is real and non-zero, which is why the parenthetical cannot be carried across.

**A second, independent reason the number cannot be carried: the case cannot arise.** Monaco's map is announced externally — `//# sourceMappingURL=../../../min-maps/vs/editor/editor.main.js.map`, 67 bytes from EOF [VERIFIED: measured `corpus/monaco-0.52.2.js` this session]. Under D-01 that is a D-03 counter increment and nothing else. And even were it inline, a 12.66 MB map base64-encodes to ~16.9 MB, which `admit()` refuses at `too_large` more than 2× over.

**Recommended action for the plan — three edits, all documentation:**

1. **Amend `REQUIREMENTS.md` MAP-02's parenthetical** to name its harness, or strike it. Leaving `*(Measured: …)*` unqualified beside a requirement this phase implements is the precise shape of the defect Phase 0 exists to prevent — a number that reads as a Caido measurement and is not one.
2. **Restate SC1.** "completes within the Phase 0 budget" has no referent (D-10 already says so) *and* "a real large map" now means ≤ 6.29 MB, not 12.66 MB. The corrected criterion is: *a real inline map at the measured `MAP_MAX_BYTES` completes within `MAX_SYNC_SLICE_MS` per slice and `ARTIFACT_DEADLINE_MS` overall, or records `partial`.*
3. **Record MAP-02's `no VLQ on the primary path` as met by D-17's capability ban**, not by inspection — the ban is the mechanical form and it is strictly stronger.

---

### O-05 — With D-14 bypassing `admit()`, what vocabulary reports a refused derived artifact?

**VERDICT: SETTLED. Define a sibling vocabulary. Do NOT extend `REJECT_REASONS`. The precedent is not merely available — it is already shipped, twice, and one of the two says in its own doc comment that it copies `REJECT_REASONS`'s idiom for exactly this reason.**

**What extending `REJECT_REASONS` would cost, verified.**

The set is closed and its type is derived from the array [VERIFIED: packages/backend/src/hooks/admit.ts:51-60]:

```ts
export const REJECT_REASONS = [
  "status",
  "revalidation",
  "empty",
  "too_large",
  "not_scriptish",
  "out_of_scope",
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];
```

Three things fire on a seventh member:

1. **`admit.spec.ts`'s every-reason-has-a-case gate** — it compares the reasons its `CASES` table exercises against the array and fails on any untested member [VERIFIED: packages/backend/src/hooks/admit.spec.ts:436-455]. A derived-path reason has *no `admit()` case that can produce it*, because `admit()` is not on the derived path. The case would have to be a lie.
2. **`telemetry.ts`'s counter map** is keyed on the union [VERIFIED: packages/backend/src/telemetry.ts:123 `rejected: Record<RejectReason, number>;` and :242 `rejected: zeroedRejectCounters(REJECT_REASONS)`], and `telemetry.spec.ts` asserts the key set equals the array [VERIFIED: telemetry.spec.ts:107,112,128]. A derived reason would appear in the *admission* counters, where it describes something admission never did.
3. **06-11's push-down superset proof.** `scan/filter.ts` and the `corpus/pushdown/` fixtures reason about what the HTTPQL composer can and cannot pre-filter. A derived artifact never touches HTTPQL, so a reason in that vocabulary is a member the superset argument has no statement about. This is the blast radius D-01 was explicitly chosen to avoid, and D-14 must not spend it either.

**The precedent for a sibling, which already exists.**

`packages/backend/src/scan/filter.ts:266-274` is the second closed rejection vocabulary in this package, and its doc comment names the pattern verbatim:

> `The REJECT_REASONS idiom from hooks/admit.ts, for the same reason: it is what makes the "every reason has a case" gate in filter.spec.ts mechanical. A fifth reason added here with no case fails immediately, and a hand-maintained parallel union and list would drift silently.`

```ts
export const OPERATOR_CLAUSE_REJECTIONS = Object.freeze([
  "comment_construct",
  "unbalanced_parentheses",
  "whitespace_only",
  "too_long",
] as const);
```

Its own every-reason gate is a copy of `admit.spec.ts`'s, and says so [VERIFIED: packages/backend/src/scan/filter.spec.ts:262-268, verbatim: `Mechanical, against the closed array — not a hand count of the cases above. admit.spec.ts does this for REJECT_REASONS and the argument is identical`].

**So "why are two correct?" is already answered in the tree, and the answer generalises to three.** The repo currently ships **eleven** closed vocabularies [VERIFIED: enumerated this session — `REJECT_REASONS` (admit.ts:51), `OPERATOR_CLAUSE_REJECTIONS` (filter.ts:268), `BOUND_REJECTIONS` (contract.ts:1371), `AUDIT_KINDS` (audit.ts:73), `SUSPEND_REASONS` (contract.ts:170), `SCAN_STATES` (contract.ts:79), `SCAN_LIFECYCLE_STATES` (contract.ts:137), `TRIAGE_STATES` (contract.ts:564), `INVALIDATION_CATEGORIES` (contract.ts:756), `EXPORT_FORMATS` (contract.ts:1125), `EXPORT_REDACTION_MODES` (contract.ts:1146)]. The project's actual rule is not *one vocabulary* — it is **one vocabulary per subject, each closed, each with a mechanical every-member-has-a-case gate**. A derived-artifact refusal is a different subject from a proxied-response admission, so it gets its own.

**Recommended shape.** `DERIVED_REJECT_REASONS`, declared beside the derived-path entry point, `Object.freeze([...] as const)` with the type derived from it, and a `CASES` table plus every-reason gate in its spec. D-14 says the derived path *carries a size bound only*, which makes the initial membership small and honest:

| Member | Fires when |
|--------|-----------|
| `too_large` | the recovered source exceeds the D-14 derived-path size bound |
| `empty` | `sourcesContent[i]` is `null` or `""` — **both legal per spec** (§Common Pitfalls) |
| `depth_exceeded` | D-13's depth-1 bound refuses re-entry |

Note `too_large` and `empty` are *word-identical* to members of `REJECT_REASONS`. That is fine and is the point: they are different vocabularies about different subjects, and the type system keeps them apart. `contract.ts:88-120` already documents this exact situation for `running`, which is a literal member of both `SCAN_STATES` and `SCAN_LIFECYCLE_STATES`, and names the four mechanisms that keep them apart — **adjacent declaration, distinct column name, non-prefix labels, and separate presentation maps.** Apply the same four.

**One thing the plan must not do:** put these counters in a second counters object. `telemetry.spec.ts` scans the package AST and fails on one [VERIFIED: packages/backend/src/telemetry.ts:203-210 documents the scan; the retro sub-map at telemetry.ts:~232 is a **sub-map of the same object**, not a sibling — verbatim: `A SUB-MAP OF THIS OBJECT and not a sibling of it. See the header: the AST scan in telemetry.spec.ts fails on a second counters object anywhere in this package`]. Phase 7's derived-path counters follow that sub-map precedent exactly.

---

### O-06 — Does D-23's write-on-a-read-path fit `sql-discipline.spec.ts` as it stands?

**VERDICT: SETTLED — YES, it fits unchanged, and the gate has nothing to say about which RPC issues a statement. The shipped `RETRY_ANALYSIS_SQL` is a working precedent for the exact shape. The epoch convention D-23 must also satisfy is a caller-side one, not a SQL one, and is likewise already established.**

**Why the gate does not care that it is a read path.** The gate is a pure static function over `(filename, source)` [VERIFIED: packages/backend/src/store/sql-discipline.spec.ts:351-355 `export function auditSource(file: string, source: string)`], walking every non-spec `.ts` under `packages/backend/src` at any depth [VERIFIED: sql-discipline.spec.ts:47-62 `backendFiles()`, walking `BACKEND_SRC = "packages/backend/src"`]. **Nothing in it models call sites, RPC handlers, or read-vs-write intent.** It classifies statement text. So "a write on a read path" is not a category the gate can express, and the question reduces to: does the statement text pass?

**The fifteen rules it can emit** [VERIFIED: sql-discipline.spec.ts:74-88, verbatim]:

```
"named-parameter", "returning", "last-insert-rowid", "unscoped-multi-row",
"interpolated-sql", "concatenated-sql", "exec-arity", "array-bind",
"module-scope-await", "module-scope-statement", "cte-unscoped",
"insert-select", "unscoped-subquery", "unscoped-union-arm",
"fragment-composition"
```

**A single-statement, fully-bound, `project_id`-scoped UPDATE against each rule that could plausibly fire:**

| Rule | Applies? | Why |
|------|----------|-----|
| `unscoped-multi-row` | **YES — and it is satisfied.** `isMultiRowStatement` returns true for `UPDATE` [VERIFIED: sql-discipline.spec.ts:133-136]. The check reads from the first `WHERE` onward and requires `project_id` in that predicate [VERIFIED: sql-discipline.spec.ts:396-407, and the mutation note verbatim: `Found by mutation: dropping project_id = ? from GET_ARTIFACT_SQL left the column list matching and the gate green`]. So `WHERE project_id = ? AND …` passes. |
| `named-parameter` | Satisfied by using `?` only. Three forms are banned — colon, at, dollar [VERIFIED: sql-discipline.spec.ts:341-345]. |
| `returning` | Satisfied by not using `RETURNING` [VERIFIED: sql-discipline.spec.ts:376-381]. |
| `last-insert-rowid` | Satisfied — address the row by natural key [VERIFIED: sql-discipline.spec.ts:382-387]. |
| `array-bind` / `exec-arity` | Satisfied by **spreading** bind values into `.run()`, never passing an array. |
| `interpolated-sql` / `concatenated-sql` / `fragment-composition` | Satisfied by one module-level template literal with no substitutions. The only allowlisted interpolation in the package is `migrations.ts`'s `PRAGMA user_version = ` [VERIFIED: sql-discipline.spec.ts:338-340]. |
| `module-scope-statement` / `module-scope-await` | Satisfied by declaring the SQL **string** at module scope and calling `db.prepare()` **inside** the function. |
| `cte-unscoped`, `insert-select`, `unscoped-subquery`, `unscoped-union-arm` | Do not apply — no `WITH`, no `INSERT … SELECT`, no subquery, no set operation. |

**The working precedent, verbatim** [VERIFIED: packages/backend/src/store/retry.ts:103-109]:

```sql
UPDATE analyses
SET scan_state = ?, started_at = ?, finished_at = NULL, max_slice_ms = NULL,
    bytes_walked = NULL, error = NULL
WHERE project_id = ? AND sha256 = ? AND detector_set_hash = ?
  AND scan_state IN (?, ?)
```

executed as `stmt.run(RETRY_TARGET_SCAN_STATE, startedAt, projectId, sha256, detectorSetHash, RETRYABLE_SCAN_STATES[0], RETRYABLE_SCAN_STATES[1])` — spread, with the reason stated verbatim in the code [VERIFIED: retry.ts:150-152: `SPREAD, never passed as one array: an array handed to a bind position is silently ignored on this driver and produced rows with every column NULL in Phase 0`]. **This is D-23's statement shape, already shipped and already green.**

**The epoch convention, which is the part that is NOT in the SQL.**

`retryAnalysis` is registered through `sdk.api.register` and it writes [VERIFIED: packages/backend/src/index.ts:846-874]. Its convention is:

```ts
const pid = currentProjectId();        // captured BEFORE the await
if (!db || pid === null) return NO_RETRY;
const outcome = await retryAnalysis(db, pid, …);
```

`pid` is captured before the await and lands in the `WHERE` clause. **The scoping IS the epoch check for a single statement:** if the project changed during the await, the predicate matches zero rows and the write is a no-op — there is no window in which it can land under the wrong project. That is why `retryAnalysis` needs no `stillCurrent()` re-check while `consumer.ts` does: the consumer performs *many* statements across *many* awaits and must re-check between them [VERIFIED: consumer.ts:520-522 `const epochAtEntry = deps.projectEpoch?.() ?? 0; const stillCurrent = (): boolean => (deps.projectEpoch?.() ?? 0) === epochAtEntry;`, with re-checks at :620, :672, :693].

**So D-23's rule for the planner:** capture `pid` once at the top of the RPC handler, before any `await`; put it in the `WHERE`; issue exactly one statement; do not re-read-then-write. If the tombstone write ever needs to be preceded by a read *in the same handler*, that is two operations and the epoch must be re-checked between them in the `consumer.ts` idiom — but D-23's lazy detection does not need it, because the derivation attempt itself is the read and its outcome is the bound value.

**Known blind spot, carried forward not introduced.** `sql-discipline.spec.ts` has a documented leading-keyword blind spot (WINDOWS 84, in Phase 6's `deferred-items.md`). `statementKind` matches the *first* keyword in the text [VERIFIED: sql-discipline.spec.ts:126-129], so a statement whose first keyword is not the operative one is misclassified. A plain `UPDATE analyses SET …` is not that shape. Phase 7 should not attempt to fix it — it is not this phase's — but should not write a statement that depends on it either.

---

### O-07 — Can D-22's tombstone and D-11's `analyses.scan_state` stay separate without producing two degradation vocabularies?

**VERDICT: SETTLED — YES, and the project has already done this exact thing once, deliberately, with the argument written out. Four of the five mechanisms that keep the existing pair apart transfer directly. The fifth does not, and that is the one thing the plan must solve.**

**The shipped precedent.** `contract.ts` declares two vocabularies that share the word "scan" and share a literal member, and its header is an essay on why that is correct [VERIFIED: packages/engine/src/contract.ts:88-120]. Verbatim:

> `READ THIS BEFORE TOUCHING EITHER LIST. SCAN_STATES above is the ANALYSIS state of one artifact — has this digest been through the detectors. The list immediately below is the LIFECYCLE state of a retroactive backfill — is that job running, paused, finished or thrown away. They are different closed vocabularies about different subjects, and running is a literal member of BOTH.`

and its closing refusal, verbatim:

> `The temptation this note exists to refuse is merging them. They cannot be merged: pending and partial are meaningless for a backfill, suspended and discarded are meaningless for an analysis, and a union of the two would give the compiler nothing to check at exactly the sites where a wrong state is invisible.`

The two arrays [VERIFIED: contract.ts:79-85 and :137-150]:

```ts
export const SCAN_STATES = ["pending","running","done","partial","failed"] as const;
export const SCAN_LIFECYCLE_STATES = ["running","suspended","completed","discarded"] as const;
```

**The five mechanisms, quoted and then mapped onto Phase 7** [VERIFIED: contract.ts:101-113, verbatim]:

> `Four more mechanisms keep them apart downstream and each is load-bearing: the database column is state and never scan_state (analyses.scan_state already exists and would have accepted the second vocabulary silently); no operator-facing label is shared OR is a prefix of another — completed renders as **Finished** and never "Completed", because the analysis vocabulary already ships "Complete" and a one-character difference between two states that mean opposite things is not a difference; the lifecycle gets its own presentation map, its own renderer and its own data-defminer-* marker rather than widening StatusBadge's prop; and no surface renders both`

Plus the declaration-adjacency rule stated just above it: *"The two declarations are adjacent DELIBERATELY, so the collision is visible at the point of declaration rather than discovered at a call site three packages away."*

| Mechanism | Transfers to Phase 7? |
|-----------|----------------------|
| **Adjacent declaration** | ✅ Declare `SOURCE_PRODUCIBILITY_STATES` in `contract.ts` immediately after `SCAN_LIFECYCLE_STATES`, with the same style of note naming the third collision. |
| **Distinct column name** | ✅ The producibility column is `producibility` (or `content_state`) and **never** `scan_state` or `state`. Both those names are taken and both would accept a wrong value silently. |
| **No shared or prefix label** | ⚠️ **This one needs care.** `05-UI-SPEC.md` already ships **Queued / Analysing / Complete / Partial / Failed** [VERIFIED: 05-UI-SPEC.md §"Status vocabulary (UI-09, OBS-02)"] and Phase 6 added **Finished**. A producibility label of "Unavailable" or "Gone" is safe; "Missing", "Lost" and "Incomplete" are not clearly safe against "Partial" in an operator's peripheral vision. Pick words that share no stem with the seven already in use. |
| **Own presentation map + renderer + `data-defminer-*` marker** | ✅ Frontend already has `scan-state-presentation.ts` and `scan-lifecycle-presentation.ts` as two files [VERIFIED: packages/frontend/src/components/]. Phase 7 adds a third. Do **not** widen `StatusBadge`'s prop. |
| **No surface renders both** | ❌ **BREAKS.** The source drill-down renders the analysis state of the artifact *and* the producibility of each recovered source, in the same view. |

**The replacement for the broken fifth mechanism — and this is the actual deliverable of O-07.** Since one surface must render both, separation has to be carried by *layout and label*, not by absence. Three requirements for the UI phase:

1. **The two states are never in the same column and never in the same badge component.** The analysis state belongs to the *artifact* row (the parent). Producibility belongs to the *source* row (the child). They are at different levels of the drill-down.
2. **The producibility state is a sentence, not a badge, when it is degraded.** D-22's own copy requirement — *"recovered 14 Aug, content no longer producible"* — is a sentence because it explains an absence, and CONTEXT.md's `<specifics>` says so directly: *"D-22's copy matters more than usual… explaining an absence."* A one-word badge beside another one-word badge is exactly the confusion this mechanism guards against.
3. **The producible case renders nothing at all.** Only the tombstone is marked. A vocabulary whose common member is invisible cannot be confused with one whose every member is visible.

**And the axis distinction, stated so a verifier cannot collapse it.** CONTEXT.md's D-11 already names it — *"the tombstone state is a producibility axis, not an analysis axis"* — and the plan must carry that sentence into the code, in the register `contract.ts:88-120` uses. Concretely:

- `analyses.scan_state` answers: **did DefMiner finish looking at these bytes?** A refused/malformed/oversized map is `partial` (D-11).
- `producibility` answers: **can DefMiner still show you these bytes?** It is `producible` until a derivation attempt proves otherwise, then `unproducible` forever (D-23's stickiness).

They are orthogonal, and all four combinations are reachable and meaningful: `done`/`producible` (normal), `done`/`unproducible` (tombstone — the map parsed fine, Caido lost the request), `partial`/`producible` (map was over the bound; nothing to produce anyway), `partial`/`unproducible` (both). **A single column cannot express four states across two axes without inventing product names for combinations**, which is the "nothing found vs analysis broke" confusion ERR/OBS-02 exists to prevent, relocated.

**One caveat the plan must own.** D-11 already ships a slice of ERR-02/OBS-02 ahead of Phase 2, and CONTEXT.md instructs that this be *declared, not smuggled*. Adding a second vocabulary in the same phase widens that pre-emption. The honest form is one paragraph in the plan and in `07-VERIFICATION.md` stating: Phase 7 defines a producibility axis that OBS-02 does not yet own; if Phase 2 rules that producibility belongs inside one vocabulary, this column is what changes, and it is a `migrations.ts` forward step plus one presentation map.

---

### O-08 — What is the display-tree normalisation rule for D-06?

**VERDICT: SETTLED. The rule is a five-step pure function in the frontend, and the losslessness requirement is met by never mutating the stored string — the tree carries display labels beside the verbatim value, it does not replace it.**

**What already exists and must be reused rather than reimplemented.** `packages/frontend/src/safety/display.ts` ships R2 as `forCell` / `forCellText` / `forPanel`, and the C0/C1 strip and bidi strip live in `@defminer/engine/sanitise` [VERIFIED: display.ts:44-51 imports `EVIDENCE_PANEL_MAX_GRAPHEMES`, `TABLE_CELL_MAX_GRAPHEMES` from the engine; `BIDI_OVERRIDES_ISOLATES` and `C0_C1_CONTROLS` are exported from `@defminer/engine/sanitise` and imported by `export.ts:81-84`]. `display.ts`'s header states the reuse rule verbatim: it *re-asserts R2 by CALLING the engine rather than by restating it* [VERIFIED: paraphrased in export.ts:36-38, verbatim: `The same argument the frontend's safety/display.ts makes for re-asserting R2 by CALLING the engine rather than by restating it`].

**The rule — five steps, in this order, all pure, all display-only:**

**Step 1 — Classify the string's shape, do not repair it.** Read a *prefix kind* off the verbatim string by `indexOf`/`startsWith` only (never a regex — the ReDoS rule in `admit.ts:30-36` is a project rule, and while this runs in a browser, the discipline and the fixture cost are the same):

| Shape | Test | Display root |
|-------|------|-------------|
| protocol-ish | contains `://` before any `/`, or starts with `webpack:`/`file:`/`http:`/`https:` | the scheme, as a synthetic root label |
| absolute POSIX | starts with `/` | a synthetic `/` root |
| Windows drive | second char is `:` and third is `\` or `/` | a synthetic drive root |
| UNC | starts with `\\` | a synthetic UNC root |
| relative | everything else | the implicit root |

These are exactly the shapes SPIKE-12 enumerated (§SPIKE-12 Fixture Enumeration), so the fixture set already exists.

**Step 2 — Split into segments on `/` AND `\`, both.** A Windows-authored `sources` entry uses backslashes and a naive `/`-only split renders it as one enormous leaf. Splitting on both is display-only and cannot corrupt anything, because the verbatim string is untouched.

**Step 3 — Resolve `.` and `..` **for the tree only**, and never above the root.** `..` popping past the root is *clamped at the root and marked*, not followed and not dropped. This is the one step where the traversal fixtures earn their keep: `webpack://app/src/../../secret.ts` must render as a node the operator can see, at a position that is honest about the `..`, and must never be silently rewritten to `secret.ts` as though the developer had written that. **Recommendation: clamp, and label the affected node with the count of climbs that went past the root.** The developer's real layout is the evidence D-06 exists to preserve; the `..` is part of it.

**Step 4 — Sanitise each SEGMENT for display through the shipped path.** `forCellText(segment)` — the text-only variant, for the measured reason in §O-02. This is what handles RTL overrides, NUL bytes and 4 KB labels: the bidi strip removes `U+202A`–`U+202E` and `U+2066`–`U+2069`, the C0/C1 strip removes NUL, and the grapheme truncation caps the 4 KB label at 256. All three are R2 steps 1–3 [VERIFIED: 05-UI-SPEC.md §R2, and the constants at packages/engine/src/sanitise.ts:116,120].

**Step 5 — Disambiguate duplicate labels by position, not by renaming.** Two different `sources` entries can normalise to the same display path — SPIKE-12 measured both mechanisms in the wild: NFD `café/app.js` and NFC `café/app.js` are different strings, and `SRCDIR/app.js` vs `srcdir/app.js` differ only in case [VERIFIED: SPIKE-12.json `path_resolution` rows `unicode_nfd`, `unicode_nfc`, `case_upper`, `case_lower`]. **Do not normalise Unicode and do not case-fold** — that would collapse two genuinely distinct source files into one node and lose evidence. Instead: siblings key on `(display label, sources index)`, so duplicates render as separate nodes, and the node carries its index. The operator sees two `app.js` entries and can tell them apart by opening either.

**How losslessness is guaranteed, and how to prove it.** The tree node is:

```
{ label: string          // display-only, sanitised, truncated
, sourcesIndex: number   // the index into the map's `sources` array
, degraded: boolean }    // step 3 clamped, or step 4 truncated
```

`label` is **never** the identity. Every read that needs the real string goes back to the stored row by `sourcesIndex`. **The losslessness property is therefore structural — the normaliser has no write path — and the spec that proves it is a round-trip assertion: for every fixture, the stored verbatim string is byte-identical before and after tree construction.** That assertion is cheap, mechanical, and is the form this repo uses everywhere else (`observations.spec.ts`'s MUST-NOT-TOUCH half is the model [VERIFIED: schema.spec.ts's `COLUMN_ALLOWLIST` comment describes it: *"whose MUST-NOT-TOUCH half asserts that an `@` in a PATH … is byte-identical, because an `@`-anywhere rule is the obvious wrong implementation"*]).

**Two things the rule must NOT do:**

- **Must not call `path.join`, `path.resolve`, `path.normalize` or `path.isAbsolute`.** Those are `node:path` and the frontend has no business importing them; more importantly, SPIKE-12 measured that `path.resolve` *escapes* on five of the 22 fixtures and that `path.normalize` silently rewrites RTL and fullwidth forms [VERIFIED: SPIKE-12 `escapes_via_resolve: true` on `relative_traversal`, `absolute_posix`, `absolute_posix_etc`, `null_byte`, `trailing_dots_spaces`; and `unicode_rtl_override` normalising `sub/\u202Eresrc\u202C/../../defminer-escape.txt` → `defminer-escape.txt`]. The normaliser must be hand-written string work over segments, which is also what makes it testable against the retained fixtures.
- **Must not be shared with anything path-shaped.** D-12's retained traversal proof is a static gate asserting a `sources` entry never reaches a path-like sink. A display normaliser that imported `path` would fire it — correctly.

---

## The Static-Gate Landscape

Every Phase 7 table, column, statement and import passes through one of these. They are the strongest invariants in the backend and the plan must fit inside them rather than around them.

### `schema.spec.ts` — the exact shape a new table entry must take

**Four separate failures, named in the file's own header** [VERIFIED: packages/backend/src/store/schema.spec.ts:1-17]:

> `1. STORE-02 — every table has project_id IN ITS PRIMARY KEY, by ordinal.`
> `2. T-01-21  — every column is on an explicit allowlist, so a column able to hold a body, a header, a cookie or a secret cannot arrive by accident. Adding a column is a deliberate TWO-PLACE edit.`
> `3. The table SET is exact. A fifth table fails as loudly as a missing one.`

plus the D-24 declared-type rule added later.

**(a) `EXPECTED_TABLES` — currently six, asserted exactly, in `name ASC` order** [VERIFIED: schema.spec.ts:50-57]:

```ts
const EXPECTED_TABLES = [
  "analyses",
  "artifacts",
  "audit",
  "observations",
  "scans",
  "settings",
];
```

Its doc comment records **three one-way operator checkpoints** — plan 01-01 (option-a, 2026-08-20), plan 05-06 (`blocking-human`, option-a, 2026-08-28), plan 06-01 (`blocking-human`, approve-as-specified, 2026-08-31) — and states verbatim: *"ALL THREE approval events are named on purpose. A comment reading 'five' above an array holding six is the exact drift shape this repo keeps catching."* [VERIFIED: schema.spec.ts:29-49].

**⇒ Phase 7 adding tables is a fourth one-way operator checkpoint.** The plan must schedule it as `blocking-human`, show the full column list before the migration is written, and add the approval event to that comment. Under D-05 the natural shape is two tables, alphabetically placed:

```
["analyses", "artifacts", "audit", "observations", "scans", "settings",
 "source_sightings", "sources"]      ← names illustrative; ordering is name ASC
```

**(b) `COLUMN_ALLOWLIST` — a per-column list with a written justification per column** [VERIFIED: schema.spec.ts:409-479]. The entry shape is a plain `Record<string, string[]>`; the *argument* lives in the doc comment above it, and the register is set by `observations.url`'s entry, which runs to roughly ninety lines covering the query grammar, userinfo, and per-grammar live-proof provenance [VERIFIED: schema.spec.ts:~300-400].

The single most important line for Phase 7 is `scans`'s, verbatim [VERIFIED: schema.spec.ts:453-462]:

> `WHAT IS NOT HERE IS THE MITIGATION. There is no reject-reason column per member of REJECT_REASONS and there is no JSON column: six columns would couple a one-way migration to a vocabulary Phases 3 and 4 will grow, and a JSON blob is a column able to hold arbitrary content, which is precisely what this allowlist exists to prevent.`

**⇒ D-06's `sources` entry is the first target-controlled string at rest since `observations.url`, and its justification must be argued in that same register.** The argument that is actually available, and it is a strong one: the `sources` entry is a *developer-authored path label*, not a response body and not a credential-bearing URL; it carries no query string, no userinfo and no header value; it is bounded by the map's own size; and D-07 guarantees no *content* column exists beside it. What the allowlist entry must **also** say, because a reviewer will ask: this column is not redacted at write time (D-06 forbids it) and is therefore the one column whose safety rests entirely on R1/R2 at render and on §O-08's normaliser — which is a *display* control, not a *storage* control, and the entry should say so plainly rather than implying storage-side safety it does not have.

**(c) `FORBIDDEN_COLUMNS` — names banned everywhere, whatever the table** [VERIFIED: schema.spec.ts:490-499]:

```
value_raw, path_key, body, headers, cookie, authorization, id
```

`id` is banned because `last_insert_rowid()` is unusable on the pooled connection [VERIFIED: schema.spec.ts:498]. **⇒ Phase 7's key columns are `source_id`-style natural keys, never `id`** — the `audit.event_id` / `scans.scan_id` precedent. And `body` is banned by name, which is a second, independent reason D-07's no-content-at-rest holds.

**(d) `PERMITTED_DECLARED_TYPES` and the no-BLOB / no-untyped rule** [VERIFIED: schema.spec.ts:532-536]:

```ts
const PERMITTED_DECLARED_TYPES: readonly string[] = Object.freeze([
  "INTEGER",
  "REAL",
  "TEXT",
]);
```

with `const UNTYPED_DECLARATION = "";` [VERIFIED: schema.spec.ts:~539] and the rule read out of `PRAGMA table_info`, structurally, the same way the STORE-02 gate reads the `pk` ordinal. The argument, verbatim [VERIFIED: schema.spec.ts:518-527]:

> `That guarantee has exactly one other way to fail: a column that can hold arbitrary bytes. A BLOB column, or an UNTYPED column — which takes BLOB affinity in SQLite and which a name-based check misses entirely — re-opens the footprint argument and decision D-24 with it.`

Both failure paths are executed against synthetic fixtures in the same file [VERIFIED: schema.spec.ts:721 "a BLOB column turns the collector non-empty", :749 "an UNTYPED column fails too"]. The assertions also pin the list itself: `expect(PERMITTED_DECLARED_TYPES).not.toContain("BLOB")` and `not.toContain("NUMERIC")` [VERIFIED: schema.spec.ts:805-806].

**⇒ Every Phase 7 column declares `TEXT` or `INTEGER` explicitly.** A column declared with no type fails, and it fails for a reason a name check would miss.

**(e) The migration step itself.** Phase 7's forward step lands in `MIGRATIONS` [VERIFIED: packages/backend/src/store/migrations.ts:83], and `SCHEMA_VERSION` is derived, never restated: `export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].v;` [VERIFIED: migrations.ts:854]. The `v: 5` `scans` step is the model to copy [VERIFIED: migrations.ts:396-425] — `CREATE TABLE IF NOT EXISTS`, `CHECK (length(project_id) > 0)` on the scope column, a `CHECK (x IN (...))` closed constraint on any vocabulary column, `PRIMARY KEY (project_id, …)`, and indexes in one uniform direction because *"SQLite traverses an index in reverse for the opposite ORDER BY, so one direction serves both"* [VERIFIED: migrations.ts:391-395].

Two driver facts the step must respect, both measured:

- `MULTISTATEMENT_EXEC_ATOMIC = true` [VERIFIED: packages/engine/src/thresholds.generated.ts:33] — one `exec` string is one atomic unit, so a table plus its indexes belong in **one** step.
- `TRANSACTION_PERSISTS_ACROSS_EXEC = false` [VERIFIED: thresholds.generated.ts:38] — `BEGIN` does not span `exec` calls and **fails silently**. No invariant may require two statements to land together.

**⇒ The producibility CHECK constraint must be asserted back out of the schema and compared member-by-member against the `contract.ts` array**, the way `scans.spec.ts` already does for `SCAN_LIFECYCLE_STATES` [VERIFIED: contract.ts:145-148, verbatim: *"scans.spec.ts reads the constraint back out of the schema and compares it member by member rather than trusting the two to stay in step"*].

### `sql-discipline.spec.ts` — covered in full under §O-06

Fifteen rules, static, over every non-spec `.ts` under `packages/backend/src` at any depth. Phase 7's statements pass unchanged provided they are: one statement, `?`-bound with values **spread** into `run`/`get`/`all`, `project_id` in the `WHERE`, no `RETURNING`, no `last_insert_rowid()`, no interpolation, and `db.prepare()` called inside a function rather than at module scope.

### `filesystem-prohibition.spec.ts` — the skeleton D-17's codec gate must copy

This is the fourth sibling in an established family, and the family's shape is explicitly documented as reusable [VERIFIED: packages/backend/src/filesystem-prohibition.spec.ts:19-27, verbatim]:

> `The precedent for a sibling is already set twice in this package. outbound-prohibition.spec.ts says in its own header that it copies its SHAPE — a pure auditSource(file, source), a named non-vacuity assertion, and every rule's failing path executed against an inline fixture — from store/sql-discipline.spec.ts rather than its rules. store/httpql-discipline.spec.ts did the same again in Phase 6. This file is the third, and it copies the SAME shape from outbound-prohibition.spec.ts: same walk skeleton, same POSIX source-root enumeration, same by-name non-vacuity block, same firing-and-legal fixture pair per rule.`

**THE SKELETON — nine parts, each with its file-and-line source:**

**1. POSIX source-root enumeration, both roots** [VERIFIED: filesystem-prohibition.spec.ts:152-155]:

```ts
const SOURCE_ROOTS: readonly string[] = Object.freeze([
  "packages/backend/src",
  "packages/engine/src",
]);
```

**`packages/engine/src` is NOT optional and this matters more for D-17 than it did for D-18.** The file states why for the fs case, verbatim [VERIFIED: filesystem-prohibition.spec.ts:147-151]: *"the engine is bundled into the backend's dist, and pipeline.ts is the module most likely to grow a 'just write the sourcemap out' line."* For the codec the argument is stronger and I verified it: `@defminer/engine` is a `workspace:*` dependency of **both** `@defminer/backend` and `@defminer/frontend` [VERIFIED: packages/backend/package.json `"dependencies": {"@defminer/engine": "workspace:*"}` and packages/frontend/package.json, same]. So a codec import placed in the engine would satisfy D-16's "the decode runs in the frontend" *by accident* while shipping the codec into the backend bundle. **The engine root must be scanned.**

**2. The walk skips `.spec.ts`**, which is what lets the fixtures live inline; the cost is stated and bounded from the other end by `pnpm check:bundle` [VERIFIED: filesystem-prohibition.spec.ts:104-113]. Paths are built with `posix.join` end-to-end [VERIFIED: filesystem-prohibition.spec.ts:308-315, verbatim: *"a gate that quietly matches nothing is the same defect as a gate that quietly scans nothing"*].

**3. Specifier forms DERIVED from prefix families, not enumerated** [VERIFIED: filesystem-prohibition.spec.ts:181-202]. For fs it is three prefixes × two suffixes. **For the codec the equivalent axis is the package's own export map**, which I read from the installed package [VERIFIED: `node_modules/.pnpm/@jridgewell+sourcemap-codec@1.5.5/…/package.json` `exports`]:

```
"."                                → the bare specifier
"./dist/sourcemap-codec.umd.js"    → a SECOND legal specifier, exported deliberately
"./package.json"
```

⇒ the specifier list is at minimum `@jridgewell/sourcemap-codec`, `@jridgewell/sourcemap-codec/dist/sourcemap-codec.umd.js`, and any `@jridgewell/sourcemap-codec/*` subpath. **Banning only the bare name is banning nothing** — the file's own words: *"Banning one spelling of a capability is banning nothing"* [VERIFIED: filesystem-prohibition.spec.ts:178].

**4. `RULES` as a frozen record KEYED BY RULE ID, with a `why` that travels into the failure message** [VERIFIED: filesystem-prohibition.spec.ts:234-286]. The reason for the keyed shape, verbatim: *"`RuleId` is `keyof typeof RULES`, a typo is a compile error, and there is no `no such rule` branch left over that no test could ever execute."*

**5. An exported array DERIVED from the record**, never hand-maintained [VERIFIED: filesystem-prohibition.spec.ts:294-296 `export const FORBIDDEN_FILESYSTEM: readonly FilesystemRule[] = Object.freeze(Object.values(RULES));`], with an assertion that the two cannot disagree [VERIFIED: :1243-1249].

**6. A pure `auditSource(file, source): Violation[]`** [VERIFIED: filesystem-prohibition.spec.ts:407], TypeScript-compiler AST walk, not a regex. The reason is load-bearing for D-17 specifically: the gate file will name `@jridgewell/sourcemap-codec` dozens of times in prose and in fixture string literals, and *"A substring scan would fail on its own documentation, and the only way to make it pass would be deleting the reasoning — precisely backwards"* [VERIFIED: filesystem-prohibition.spec.ts:88-98].

**7. The by-name non-vacuity block — four assertions, not one** [VERIFIED: filesystem-prohibition.spec.ts:701-790]:
- `"enumerates a NON-EMPTY set of shipped modules, BY NAME, ACROSS BOTH ROOTS"` (:701)
- `"every root contributes at least one file to the scan"` (:739)
- `"the walk really DESCENDED into subdirectories, per root"` (:751)
- `"the per-file cases iterate the SAME binding the assertions above measured"` (:774)

plus a source-root agreement check that reads `SOURCE_ROOTS` **out of the sibling gate's source text** and fails if that declaration disappears [VERIFIED: filesystem-prohibition.spec.ts:781-790].

**8. A firing fixture AND a legal fixture per rule, both asserted as sets** [VERIFIED: filesystem-prohibition.spec.ts:1207 `"EVERY declared rule id has at least one firing fixture"`, :1217 `"EVERY declared rule id has at least one legal fixture proving it stays quiet"`], with the case table asserted to be the **full cross product** of specifier forms × import shapes [VERIFIED: :1258].

**9. A self-audit case** — the gate run on its own file, reporting exactly its own real import and nothing from its prose or fixtures [VERIFIED: filesystem-prohibition.spec.ts:839].

**Import shapes the codec walk must cover** (the cross product's second axis), taken from what the fs gate already handles [VERIFIED: filesystem-prohibition.spec.ts:88-102]: `import x from`, `import {x} from`, `import * as x from`, **`import type`** (banned too — *"a module typing itself against fs is a module being written to use fs, and catching it at the type is catching it early"* [VERIFIED: :~245]), `export … from`, `export * from`, dynamic `import()` with a literal specifier, and `import x = require()`.

---

## The `consumer.ts` Seam D-08 Lands On

### The exact seam

`analyseAndFinish` calls `walk(got.bytes, {...})` and passes a `visit` callback that is a documented no-op [VERIFIED: packages/backend/src/ingest/consumer.ts:771-793]:

```ts
async function analyseAndFinish(
  projectId: string,
  got: Extracted,
  detectorHash: string,
  stillCurrent: () => boolean,
): Promise<void> {
  const deadline = artifactDeadline(clock);
  const result = await walk(got.bytes, {
    now: clock,
    deadline,
    signal: deps.signal,
    visit: () => {
      /* Phase 3 puts the detector here. */
    },
  });
```

Its doc comment states what the seam guarantees, verbatim [VERIFIED: consumer.ts:760-770]:

> `visit is a no-op because no detector exists until Phase 3. The walk's yielding, its deadline and its offset accounting are all real regardless, and proving them now is the point: there is nothing to hide behind yet.`

**`visit` is called once per WINDOW, synchronously, in ascending offset order** [VERIFIED: packages/engine/src/pipeline.ts:87-89 and the loop at :150-175]. Its signature is `(window: Window) => void` — **synchronous, returning void**. It cannot `await`.

**⇒ This is the single most important structural fact for D-08, and it changes where reconstruction actually goes.** Sourcemap reconstruction is not a per-window operation: the announcement is at the tail, the base64 decode needs the whole payload, and `JSON.parse` needs the whole map. **A stage inside `visit` is the wrong shape.** The correct reading of D-08 — *"a stage inside the existing bounded consumer"* — is a stage inside **`analyseAndFinish`**, after the `walk()` returns and before `finishAnalysis`, where it can be `await`ed, can share the same `deadline`, and can report into the same `result.partial`. D-08's intent (one artifact at a time, same slice budget, same yield primitive, same epoch discipline, same `partial`/`failed` states, same retention cadence) is fully preserved; only the insertion point differs from a literal reading of "where `visit` is a no-op today".

The plan should state this explicitly rather than let the executor discover that `visit` cannot await.

### The epoch re-check convention

Captured **once, before the first await**, then re-checked before every write [VERIFIED: consumer.ts:520-522]:

```ts
const epochAtEntry = deps.projectEpoch?.() ?? 0;
const stillCurrent = (): boolean =>
  (deps.projectEpoch?.() ?? 0) === epochAtEntry;
```

with the reason verbatim [VERIFIED: consumer.ts:513-519]:

> `Captured BEFORE the reload, not after: this entry was admitted under whatever project was active when the queue took it, and the reload that follows is an await. If a project change lands during it, the entry belongs to the PREVIOUS project — writing it under the new one would import one client's traffic into another's view.`

Re-check sites, each with its own counter increment and log [VERIFIED: consumer.ts:604 (before the identity write), :620, :672 (before the observation), :693 (before starting an analysis), :785 (inside `analyseAndFinish`, before `finishAnalysis`)]. Every one increments `c.abandonedOnProjectChange` and returns.

**⇒ Phase 7's reconstruction stage adds writes and must add re-checks in the same idiom — one immediately before each new statement**, and `stillCurrent` is already in `analyseAndFinish`'s parameter list, so it is in scope.

### `RETENTION_SWEEP_EVERY_N` and the sweep cadence

`export const RETENTION_SWEEP_EVERY_N = 128;` [VERIFIED: packages/engine/src/thresholds.ts:117]. The counter and its trigger [VERIFIED: consumer.ts:399, :661, :851-858]:

```ts
let processedForSweep = 0;                              // :399
processedForSweep += 1;                                 // :661
…
(processedForSweep > 0 &&
  processedForSweep % RETENTION_SWEEP_EVERY_N === 0 &&  // :852
  processedForSweep !== lastSweptAtProcessedCount)
```

`processedForSweep += 1` sits immediately after the artifact write, deliberately, and the comment explains that moving it broke convergence once already [VERIFIED: consumer.ts:648-660, verbatim: *"THE RETENTION INTERVAL COUNTS WRITES, NOT COMPLETIONS… That breaks the convergence inequality thresholds.spec.ts asserts, whose right-hand side is 'rows inserted per sweep interval' and holds only if every row-inserting iteration advances the interval."*].

**⇒ That sentence is the exact hook for Pitfall 2's fix**: the interval's right-hand side is *already* documented as "rows inserted per sweep interval", but the counter increments by 1 per artifact. Under D-09 those two stop being proportional.

### How `analyseAndFinish` records `max_slice_ms` / `bytes_walked`

Both come **straight through from the same `walk` result**, paired with the write [VERIFIED: consumer.ts:794-813]:

```ts
recordSlice(result.maxSliceMs);
const finished = await finishAnalysis(
  deps.db, projectId, got.sha256, detectorHash,
  result.partial ? "partial" : "done",
  Date.now(),
  result.maxSliceMs,
  result.bytesWalked,
  null,                       // ← the `error` column
);
```

The pairing is asserted, and the comment records that the negative demonstration was executed [VERIFIED: consumer.ts:794-802, verbatim]:

> `The in-memory maximum getStatus() reports and the per-artifact analyses.max_slice_ms column take the SAME number from the SAME walk result, one statement apart, so the two cannot drift into disagreeing. PAIRED with the write rather than merely near it… Delete this line and consumer.spec.ts fails — that negative demonstration was RUN, not described.`

`WalkResult` is `{ partial, maxSliceMs, bytesWalked, yieldCount }` [VERIFIED: packages/engine/src/pipeline.ts:103-116]. `partial: true` is returned when the deadline expires mid-walk, degrading rather than discarding [VERIFIED: pipeline.ts:157-163].

**⇒ Three consequences for D-11:**

1. **The `partial` state D-11 reuses is already produced by exactly one mechanism — deadline expiry.** A map refused for size, or malformed, is a *different cause* reaching the *same* state. That is what D-11 chose, and it is defensible, but the plan must ensure the **`error` column** carries the distinction: it is currently always `null` on this path [VERIFIED: consumer.ts:803]. Phase 7 is the first writer of a non-null `error` from the consumer.
2. **The error is bounded twice.** `describeError` redacts then truncates at `ERROR_TEXT_LIMIT = 240` [VERIFIED: packages/backend/src/telemetry.ts:96 and :673 `return redactSensitiveTokens(redactUrls(text)).slice(0, ERROR_TEXT_LIMIT);`], and the column's own bound is `ERROR_MAX = 300` [VERIFIED: packages/backend/src/store/analyses.ts:89], asserted as `ERROR_TEXT_LIMIT <= ERROR_MAX` [VERIFIED: analyses.ts:84-87]. **Redaction runs BEFORE truncation** — the ordering is the mitigation, not an implementation detail.
3. **`max_slice_ms` must include the reconstruction stage's own slice.** If reconstruction runs after `walk()` returns, its synchronous stretch is *not* in `result.maxSliceMs`, and the column would under-report the real block. CORE-10's whole claim — *"is this plugin blocking the thread"* — depends on that number being the true maximum. **The plan must take `max(result.maxSliceMs, reconstructionSliceMs)`,** or the health surface reports 25 ms while the thread blocked for 300 ms doing a `JSON.parse`. This is a genuine defect the shape invites and it is worth an explicit acceptance criterion.

### The reload path D-07/D-24 reuse

Already present, with two distinct undefined branches and a counter each [VERIFIED: consumer.ts:530-542]:

```ts
const rr = (await sdk.requests.get(entry.id)) as
  | { request: any; response?: any }
  | undefined;
if (!rr) { c.reloadMissing++; return; }
const response = rr.response;
if (!response) { c.reloadNoResponse++; return; }
c.reloadHit++;
```

with the reason verbatim [VERIFIED: consumer.ts:524-529]: *"TWO undefined branches, not one, with a counter each… conflating them hides WHICH one is happening, which is the only thing that would tell an operator whether Caido lost the request or never recorded a response for it."*

**⇒ D-22's tombstone has both of its trigger conditions already distinguished in shipped code, and the same two-branch discipline must carry into the derivation RPC.** "Caido lost the request" and "Caido has the request but no response" are different facts about the target's history and the tombstone copy should be able to say which.

**⇒ And a caution about D-24's re-verify.** The consumer already counts `byteLenMismatch` when the hook's `body.length` disagrees with the reloaded `toRaw().length` [VERIFIED: consumer.ts:558 and telemetry.ts:~178, whose comment notes that a non-zero value means `BODY_LENGTH_EQUALS_RAW_LENGTH` no longer holds]. D-24's sha256 re-verify is strictly stronger and should **fail closed** rather than merely counting — but the plan should reuse this counter's *reporting* shape so a re-deploy (the expected benign cause) is visible as a number rather than only as a refusal the operator cannot explain.

---

## Standard Stack

Nothing new is introduced. Phase 7 ships with the dependencies already in the tree, and moves exactly one.

### Core

| Library | Version | Purpose | Why standard |
|---------|---------|---------|--------------|
| `@jridgewell/sourcemap-codec` | 1.5.5 | VLQ decode of `mappings`, **frontend only** (D-16) | Already selected and benchmarked against three alternatives; `source-map@0.8` was disqualified on two verified hard failures (ships `mappings.wasm`, and leaks `fs`/`path`/`url` as unbundlable externals under Caido's exact build config) [CITED: .planning/research/STACK.md:207-210]. Zero runtime dependencies [VERIFIED: installed `package.json` has no `dependencies` key]. MIT. |
| `vue-virtual-scroller` | 2.0.0-beta.8 | Line-window virtualisation (D-18) | Already a `packages/frontend` dependency [VERIFIED: packages/frontend/package.json]. Typed in-repo by a deliberately narrow shim [VERIFIED: packages/frontend/src/shims-virtual-scroller.d.ts]. |
| `crypto` (`createHash`) | runtime built-in | sha256 identity (D-05) and re-verify (D-24) | On the DIST-05 allowlist as measured-loadable; already the shipped path [VERIFIED: packages/engine/src/digest.ts:9,23-25]. 13.2 ms/8.3 MB vs 720 ms for the JS loop [VERIFIED: SPIKE-06 `op_cost` rows, variant `composite8mb`]. |
| `buffer` / global `Buffer`, global `atob` | runtime built-ins | base64 decode (D-04) | §Decode Primitives. |

### The codec API, verified from the installed package

[VERIFIED: `node_modules/.pnpm/@jridgewell+sourcemap-codec@1.5.5/node_modules/@jridgewell/sourcemap-codec/types/sourcemap-codec.d.mts`, read in full this session]:

```ts
export type SourceMapSegment = [number] | [number, number, number, number] | [number, number, number, number, number];
export type SourceMapLine = SourceMapSegment[];
export type SourceMapMappings = SourceMapLine[];
export declare function decode(mappings: string): SourceMapMappings;
export declare function encode(decoded: SourceMapMappings): string;
export declare function encode(decoded: Readonly<SourceMapMappings>): string;
export { decodeOriginalScopes, encodeOriginalScopes, decodeGeneratedRanges, encodeGeneratedRanges } from './scopes.mts';
```

**`decode` takes the whole string and returns the whole structure. There is no partial, streaming, or per-line decode.** This confirms D-16's rejection of per-source decoding — *"the library has no partial decode; it would mean hand-rolling a segment walker against hostile input"* — as a fact about the API rather than an assumption. Dist size is 12,869 bytes unminified ESM [VERIFIED: `wc -c dist/sourcemap-codec.mjs`]; MAP-03's "1,961 bytes minified" is the minified figure and is not contradicted.

### What the D-16 move requires

**Current state** [VERIFIED: package.json:32, inside `devDependencies`]:

```json
"@jridgewell/sourcemap-codec": "1.5.5",
```

It is a **root devDependency**, not a root `dependencies` entry as CONTEXT.md's canonical-refs line describes, and it is in neither workspace package. Its only consumer today is `tier1/parse/src/index.ts` — the SPIKE-06 probe [VERIFIED: the only non-node_modules import is at tier1/parse/src/index.ts:21].

**The move, in five parts:**

1. **Add it to `packages/frontend/package.json` `dependencies`.** Not the root, and not `devDependencies` — the frontend bundles it at build time, so it is a real runtime dependency of that package.
2. **Keep the root devDependency.** `tier1/parse` still needs it, and `knip.json` treats `tier1/*/src/index.ts` as a root-workspace entry point [VERIFIED: knip.json `workspaces["."].entry` includes `"tier1/*/src/index.ts"`]. Removing it from the root would make the SPIKE-06 probe unbuildable and would be an unrelated regression.
3. **`scripts/ci/check-bundle-imports.mjs` needs NO change — and the reason is the sharpest argument for D-17 existing at all.** That gate collects import *specifiers* from the built bundle via an acorn walk [VERIFIED: check-bundle-imports.mjs:101-141] and compares them against `ALLOWED` [VERIFIED: :76-87]:

   ```
   os, path, fs, sqlite, caido:http, crypto, buffer, string_decoder, url, events
   ```

   The codec is **bundled, not externalised** — SPIKE-06 measured this directly and recorded it verbatim: *"meriyah, acorn and sourcemap-codec were fully bundled and leaked no built-in of their own — so the Phase 0 parser payload is clean under Caido's build"* [VERIFIED: SPIKE-06.json `notes`]. A bundled dependency emits **no import specifier at all**.

   **⇒ Therefore `check-bundle-imports.mjs` would not fire late on a backend codec import — it would not fire at all.** CONTEXT.md's D-17 rationale says the bundle gate *"fires late and cannot name the module that pulled the codec in"*; the measured truth is stronger and the plan should say so: the bundle gate is **silent by construction** on this defect, exactly as `sql-discipline.spec.ts` is silent on HTTPQL by construction [VERIFIED: packages/backend/src/scan/httpql-discipline.spec.ts:1-15, the same argument in the same words]. **D-17's source gate is not a belt-and-braces addition; it is the only gate that can see this.**

4. **`scripts/ci/frontend-externals.mjs` needs no change either, but for the opposite reason** — and it must be checked rather than assumed. That gate enforces two rules: every member of `REQUIRED_IMPORTS` must be present, and every **bare specifier the bundle imports** must be declared external [VERIFIED: frontend-externals.mjs:176-195]. `EXTERNAL_NAMES = ["vue", "@caido/frontend-sdk"]`, `EXTERNAL_PREFIXES = ["@codemirror/", "@lezer/"]`, `REQUIRED_IMPORTS = ["vue"]` [VERIFIED: packages/frontend/externals.mjs:19,26,45]. A **bundled** codec emits no bare specifier, so it triggers neither rule. **⇒ Do not add the codec to `externals.mjs`.** Doing so would mark it external, it would then survive as a bare import Caido cannot resolve, and the plugin would fail at runtime on the operator's machine — which is precisely the inverse defect that file's second rule exists to catch [VERIFIED: frontend-externals.mjs:44-48].
5. **`knip.json`** — the frontend workspace has no `ignoreDependencies` as of plan 05-09 [VERIFIED: knip.json comment: *"`ignoreDependencies` IS GONE from this workspace as of plan 05-09."*], so the new dependency must be genuinely imported by frontend source or knip reports it. It will be, by the viewer.

### Alternatives considered

| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| frontend `decode()` | backend `decode()` on demand | Rejected by D-16 on a measurement: 167 ms/8.3 MB [VERIFIED: SPIKE-06 `vlq_decode`, variant `composite8mb`] against a 25 ms slice, un-chunkable because `decode` consumes the whole string. |
| `@jridgewell/sourcemap-codec` | `@jridgewell/trace-mapping` | 6.0 KB vs 1.9 KB, and it solves position *lookup* rather than decode. Add later if per-position queries are needed; not needed for a viewer that decodes once. [CITED: .planning/research/STACK.md:208] |
| `vue-virtual-scroller` | hand-rolled windowing | Rejected — the shim, the typing and the precedent are all shipped, and `InventoryTable.spec.ts` already asserts `itemSize` against `TABLE_ROW_HEIGHT_PX`. |

**Installation:**

```bash
pnpm --filter @defminer/frontend add @jridgewell/sourcemap-codec@1.5.5
```

---

## Package Legitimacy Audit

Both packages are already in the lockfile and one is already shipped. Verdicts from `gsd-tools query package-legitimacy check --ecosystem npm`, run this session.

| Package | Registry | Age signal | Downloads | Source repo | Verdict | Disposition |
|---------|----------|-----------|-----------|-------------|---------|-------------|
| `@jridgewell/sourcemap-codec` | npm | latest publish 2026-08-28 | 209,862,432 /wk | `github.com/jridgewell/sourcemaps` | **SUS** (`too-new`) | **Approved — signal discounted, see below** |
| `vue-virtual-scroller` | npm | latest publish 2026-08-12 | 565,993 /wk | `github.com/Akryum/vue-virtual-scroller` | **SUS** (`too-new`) | **Approved — already shipped** |

**Why the `too-new` verdict is discounted, stated rather than waved.** The seam's `publishedAt` is the **most recent release date**, not the package's creation date; a maintained package is permanently "new" by that measure. Both packages fail the freshness heuristic while passing every substantive one: `exists: true`, `deprecated: false`, `postinstall: null`, an established source repository, and download volumes (209M/wk and 566K/wk) that are incompatible with a slopsquat. `npm view … time.created` could not be run to confirm creation dates — the command returned no output in this sandbox — so the age discount rests on the download and repository signals, not on a verified creation date. [VERIFIED: seam output, this session; `postinstall: null` on both is the specific check the Node.js supply-chain step calls for.]

**Provenance of the selection itself.** Neither package was discovered by WebSearch or from training data in this session. `@jridgewell/sourcemap-codec` was selected in `.planning/research/STACK.md` against a measured four-way benchmark and is locked by D-16; `vue-virtual-scroller` is already a shipped frontend dependency. Their APIs were verified by reading the installed packages on disk, not by recalling them.

**Packages removed due to `SLOP`:** none.
**Packages flagged `SUS` requiring a `checkpoint:human-verify`:** none — both are pre-existing lockfile entries, not new installs. The D-16 move changes *which workspace declares* `@jridgewell/sourcemap-codec`; it does not introduce a package. If the planner disagrees, the cheapest resolution is a one-line `pnpm why` in the plan rather than a checkpoint.

---

## Decode Primitives — What This Runtime Actually Has

D-04 mandates a base64 decode, and CONTEXT.md flags `TEXTDECODER_MODULE = none` and `STRUCTURED_CLONE_PRESENT = false` as constraints on it. Both are real, and both are less constraining than they look, because the capability probe enumerated the globals rather than testing a hardcoded list.

**Source:** `.planning/phases/00-runtime-reality-check/results/runs/20260820T121824Z-31596/raw/capabilities.json`, read in full this session. This is the artifact `check-bundle-imports.mjs` cites as its own derivation [VERIFIED: check-bundle-imports.mjs:71-73].

**`atob` and `btoa` are BOTH present as globals and both are functions** [VERIFIED: capabilities.json — `globals` array contains `"atob"` and `"btoa"`; `typeofs` reports `"atob": "function"` and `"btoa": "function"`]. They are additionally exported by the `buffer` module: `"buffer": ["Buffer", "atob", "btoa", "constants", "default"]` [VERIFIED: capabilities.json `modules.buffer`]. `Buffer` is also a global and a function [VERIFIED: `typeofs."Buffer": "function"`].

This was not previously written down anywhere in the planning tree: SPIKE-07's *result* file records `reachable_decoders` as `"string_decoder.StringDecoder, buffer.Buffer (toString/from), globalThis.Buffer"` and does not mention base64 at all [VERIFIED: SPIKE-07.json `measurements`, `reachable_decoders` row]. The `atob` fact is only in the raw capabilities artifact. `.planning/research/STACK.md:583` corroborates it from the other direction [CITED: STACK.md, verbatim: *"`setTimeout`, `URL`, `TextDecoder`, `atob` are **host**-provided in Caido via `extra/timers`, `llrt/url`, `llrt/buffer`"*].

**The available decode paths, ranked:**

| Path | Available? | Correct for D-04? |
|------|-----------|-------------------|
| `Buffer.from(payload, "base64").toString("utf8")` | ✅ global + `buffer` on the DIST-05 allowlist | **✅ RECOMMENDED.** Handles UTF-8 correctly. Same primitive `packages/engine/src/decode.ts:45-47` already uses for the utf-8 half. |
| `atob(payload)` | ✅ global | ⚠️ **Produces a latin1 "binary string", not UTF-8.** See Pitfall 4. |
| `new StringDecoder("utf8").end(Buffer.from(bytes))` | ✅ `string_decoder` on the allowlist | ✅ for the utf-8 step; does not do base64. Already shipped as the cross-check path [VERIFIED: packages/engine/src/decode.ts:56-58]. |
| `TextDecoder` | ❌ absent [VERIFIED: `typeofs."TextDecoder": "undefined"`] | n/a |
| `structuredClone` | ❌ absent [VERIFIED: `typeofs."structuredClone": "undefined"`] | Irrelevant to decode; relevant only if meriyah is ever on this path (it is not). |
| `zlib` | ❌ `could not load module 'zlib'` [VERIFIED: capabilities.json `modules.zlib`] | **Relevant to MAP-05's "decompression bombs": DefMiner cannot decompress anything, so a compressed-map bomb has no decompressor to attack.** Caido decompresses before the hook (`BODY_STORED_DECOMPRESSED = true`), which is where that threat actually lands, and it is already bounded by `PASSIVE_MAX_BYTES`. |

**⇒ Recommendation: use `Buffer.from(payload, "base64")` and add it to `@defminer/engine/decode` as `decodeBase64()`, beside the existing `decodeViaBuffer`/`decodeViaStringDecoder` pair**, so the base64 step inherits that module's existing cross-check idiom and its spec. Measure both primitives in the O-03 probe (`b64_decode_atob` vs `b64_decode_buffer`) so the choice is recorded as measured rather than reasoned.

---

## SPIKE-12 Fixture Enumeration — the seed for D-12's retained traversal proof

All 22 fixtures, with their exact `source` strings, from `.planning/phases/00-runtime-reality-check/results/SPIKE-12.json`'s `path_resolution` measurement rows [VERIFIED: enumerated in full this session]. RTL and NUL bytes are shown escaped.

| # | Variant | `source` (verbatim) | Escaped via `resolve`? |
|---|---------|---------------------|------------------------|
| 1 | `relative_traversal` | `../../../../../../etc/defminer-escape.txt` | **yes** |
| 2 | `relative_traversal_encoded` | `..%2f..%2f..%2fdefminer-escape.txt` | no |
| 3 | `absolute_posix` | `/tmp/defminer-absolute-escape.txt` | **yes** |
| 4 | `absolute_posix_etc` | `/etc/defminer-escape.txt` | **yes** |
| 5 | `windows_drive` | `C:\Windows\Temp\defminer-escape.txt` | no |
| 6 | `windows_unc` | `\\server\share\defminer-escape.txt` | no |
| 7 | `windows_reserved_device` | `CON` | no |
| 8 | `windows_reserved_device_ext` | `NUL.js` | no |
| 9 | `protocol_webpack` | `webpack:///./src/app.js` | no |
| 10 | `protocol_file` | `file:///etc/defminer-escape.txt` | no |
| 11 | `protocol_http` | `http://evil.example/app.js` | no |
| 12 | `null_byte` | `safe.js\u0000/../../../etc/defminer-escape.txt` | **yes** |
| 13 | `unicode_nfc` | `café/app.js` (NFC) | no |
| 14 | `unicode_nfd` | `cafe\u0301/app.js` (NFD) | no |
| 15 | `case_lower` | `srcdir/app.js` | no |
| 16 | `case_upper` | `SRCDIR/app.js` | no |
| 17 | `unicode_fullwidth` | `．．/．．/defminer-escape.txt` (U+FF0E) | no |
| 18 | `unicode_rtl_override` | `sub/\u202Eresrc\u202C/../../defminer-escape.txt` | no |
| 19 | `trailing_dots_spaces` | `sub/../../defminer-escape.txt   ` | **yes** |
| 20 | `empty` | `` (empty string) | no |
| 21 | `dot_only` | `.` | no |
| 22 | `benign_control` | `src/app/index.js` — **the legal control** | no |

Plus a 23rd measurement that is not a `sources` fixture: `symlink_write_through_scratch_root: true` [VERIFIED: SPIKE-12.json], the finding that broke the lexical containment rule.

**How D-12 reuses these, and how the subject changes.** SPIKE-12's own subject — filesystem containment — is gone under D-17. What survives is the **string corpus**, and it now serves three different purposes at once:

1. **The retained traversal proof (D-12).** A static gate asserting that no `sources` entry reaches a path-like sink. Fixtures 1–12 and 17–19 are the firing corpus; #22 is the legal control. The gate's shape is `filesystem-prohibition.spec.ts`'s — and note it goes red *automatically* the day a filesystem returns, because the sink it forbids would then exist. That is the "prove the branch unreachable rather than shipping a defence for it" pattern this repo uses [VERIFIED: CONTEXT.md `<code_context>` names it; `filesystem-prohibition.spec.ts` is the shipped instance].
2. **The O-08 display-normaliser corpus.** Every one of the 22 is a legitimate `sources` value that the tree must render *without crashing and without losing the original*. Fixtures 13–16 are the duplicate-label cases; 17–18 are the R2 bidi/fullwidth cases; 12 is the NUL case; 20–21 are the degenerate cases.
3. **Two of them are documented `path.normalize` corruption cases** and are the direct evidence for §O-08's "must not call `node:path`": `unicode_rtl_override` normalises to `defminer-escape.txt` (the RTL run is *consumed*, and the `..` climbs), and `trailing_dots_spaces` retains its trailing whitespace into the resolved path [VERIFIED: SPIKE-12.json `normalized` fields for both].

**One fixture class SPIKE-12 does NOT cover and D-12 must add:** the 4 KB label. CONTEXT.md's D-12 names *"RTL overrides, NUL bytes, 4 KB labels"* for the display axis; SPIKE-12 has the first two and not the third. Add it, sized just above `TABLE_CELL_MAX_GRAPHEMES` and just above whatever `SOURCE_LINE_MAX_GRAPHEMES` §O-02 settles on, so the truncation boundary is exercised from both sides — the `admit.spec.ts` boundary idiom [VERIFIED: admit.spec.ts:214-238 *"accepts at exactly the ceiling and rejects one byte above"*].

---

## Architecture Patterns

### System architecture — the two flows

**Flow A — ingest (backend, on the proxy thread, inside the consumer's bounded iteration):**

```
proxied response
   │
   ▼
onInterceptResponse ──► admit()  ──[reject]──► telemetry.counters.rejected[reason]
   │ accept (KIND_JS, ≤ PASSIVE_MAX_BYTES)
   ▼
BoundedQueue {id, bytes, kind}
   │
   ▼  consumer drain loop, one entry at a time
sdk.requests.get(id) ──[undefined]──► reloadMissing / reloadNoResponse
   │
   ▼
extract() ──► bytes, sha256, byteLen, url, status, contentType
   │
   ├─► upsertArtifact ──► noteChange("artifacts")
   ├─► recordObservation ──► noteChange("observations")
   │
   ▼  isAnalysed? ──[yes]──► analysisCacheHit, STOP
   │  claimAnalysis
   ▼
analyseAndFinish
   │
   ├─► walk(bytes, {visit: no-op})  ──► {partial, maxSliceMs, bytesWalked}
   │
   ├─► ╔═══════ D-08: THE PHASE 7 STAGE ═══════════════════════════╗
   │   ║ 1. announce: lastIndexOf("//# sourceMappingURL=", tail)   ║
   │   ║      ├─[external / SourceMap: header]─► counter (D-03) ────╫──► STOP
   │   ║      └─[data:…;base64,]─► continue                        ║
   │   ║ 2. size gate: payload ≤ MAP_MAX_BYTES?                    ║
   │   ║      └─[no]─► scan_state='partial' + error (D-11) ────────╫──► STOP
   │   ║ 3. Buffer.from(payload,"base64").toString("utf8")         ║
   │   ║ 4. JSON.parse  ──[throw]──► 'partial' + error (D-11)      ║
   │   ║ 5. shape check: sections? sourcesContent? null entries?   ║
   │   ║ 6. per source i: sha256(content) → upsertDerivedSource    ║
   │   ║                  recordSighting(mapSha, i, sourcesVerbatim)║
   │   ║      each preceded by stillCurrent()  ── epoch re-check   ║
   │   ║ 7. D-13: depth-1 analysis wiring, no re-entry             ║
   │   ║ 8. reconstructionSliceMs ──► max() into maxSliceMs        ║
   │   ╚═══════════════════════════════════════════════════════════╝
   ▼
finishAnalysis(state, maxSliceMs, bytesWalked, error)
   │
   ▼
processedForSweep += ROWS  (Pitfall 2) ──► retention sweep every N
```

**Flow B — browse and derive (frontend request → backend RPC → frontend render):**

```
Artifacts tab ──► select a JS artifact (D-21 drill-down)
   │
   ▼  RPC: listRecoveredSources(sha256, cursor)     [keyset, reads.ts shape]
   │       ← rows: {sourceSha, sourcesVerbatim, byteLen, index, producibility}
   ▼
display-tree normaliser (O-08, frontend, pure)  ──► tree of {label, sourcesIndex, degraded}
   │
   ▼  operator opens one source
   ▼  RPC: deriveSource(mapSha256, index)
        │
        ├─ sdk.requests.get(originatingRequestId)
        │     └─[missing/no-response]─► D-23: single bound UPDATE
        │                                producibility='unproducible'
        │                                ──► return TOMBSTONE (D-22)
        ├─ sha256(reloadedBody) === recorded artifact sha256 ?
        │     └─[no]─► D-24: FAIL CLOSED, return mismatch reason
        ├─ re-parse map, take sourcesContent[index]
        ▼
     { content, mappings }  ← one un-chunked RPC response (O-01)
   │
   ▼  frontend
   ├─ split("\n") once  ──► fixed-height line rows
   ├─ forSourceLine() per rendered line   [R2 steps 1,2,3,4]
   ├─ RecycleScroller, itemSize fixed     (D-18)
   ├─ plain monospace, no highlighter     (D-19)
   └─ decode(mappings) for positions      (D-16, frontend only, D-17 enforced)
```

### Recommended module placement

```
packages/engine/src/
├── decode.ts              # + decodeBase64() beside the existing utf-8 pair
├── sanitise.ts            # + SOURCE_LINE_MAX_GRAPHEMES
├── contract.ts            # + SOURCE_PRODUCIBILITY_STATES (adjacent to the other two)
│                          # + "sources" / "source_sightings" invalidation categories
└── sourcemap/             # NEW — pure, SDK-free, the parse and shape logic
    ├── announce.ts        #   lastIndexOf tail-window scan (D-02)
    ├── parse.ts           #   base64 → JSON.parse → shape validation (D-04, MAP-05)
    └── *.spec.ts          #   the MAP-05 fixture suite runs here, on Node, fast

packages/backend/src/
├── ingest/consumer.ts     # the D-08 stage, inside analyseAndFinish
├── store/sources.ts       # upsertDerivedSource / recordSighting / producibility UPDATE
├── store/migrations.ts    # one forward step
├── store/schema.spec.ts   # EXPECTED_TABLES + COLUMN_ALLOWLIST + justifications
├── codec-prohibition.spec.ts   # D-17, the fourth sibling
└── index.ts               # listRecoveredSources, deriveSource RPCs

packages/frontend/src/
├── safety/display.ts      # + forSourceLine()
├── sourcemap/tree.ts      # the O-08 normaliser, pure, no node:path
└── components/SourceViewer.vue  # RecycleScroller over lines
```

**Why the parse logic belongs in `packages/engine` and not `packages/backend`:** the engine is SDK-free by construction (DET-03), enforced four ways [VERIFIED: eslint.config.js:355-385 documents all four — the engine's own tsconfig omitting `@caido/quickjs-types`, `boundary.spec.ts`'s AST scan, that spec's assertion over `package.json`, and the `no-restricted-imports` rule banning `caido:*` and `@caido/*`]. That means the MAP-05 fixture suite runs under plain vitest on Node with **no Caido present** — hundreds of hostile fixtures, in milliseconds, in CI. Putting the parser in the backend would make every one of those fixtures need a fake SDK.

**Constraint the placement must respect:** `packages/engine/src` is inside D-17's `SOURCE_ROOTS`, so the engine may not import the codec either. It does not need to — the engine does the `JSON.parse` half; the codec is frontend-only.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| base64 decode | a lookup-table loop | `Buffer.from(s, "base64")` | Measured: a per-character JS loop is 52.3× slower than the native path on the same input [VERIFIED: SPIKE-06.json `notes`, verbatim: *"a hand-written per-character JS hash loop is 52.3x slower than the native digest over the same input, which rules out per-character JS scanning as a design"*]. |
| sha256 | anything | `@defminer/engine/digest`'s `sha256Hex` | 13.2 ms vs 720 ms at 8.3 MB [VERIFIED: SPIKE-06 `hash` / `hash_js_loop`, variant `composite8mb`]. Already shipped. |
| VLQ decode | a segment walker | `@jridgewell/sourcemap-codec` `decode()` | D-16. Hand-rolling it *against hostile input* is the specific thing D-16 rejected, and the library has no partial-decode API to make the hand-roll tempting-but-bounded. |
| utf-8 decode | a byte walker | `@defminer/engine/decode` | Already exists with a two-implementation cross-check that throws `DecodeDivergence` on disagreement [VERIFIED: packages/engine/src/decode.ts:97-108]. |
| R2 sanitisation | a `replace()` chain in the viewer | `safety/display.ts` → `@defminer/engine/sanitise` | `display.ts`'s header states the rule: re-assert R2 *by calling the engine*, never by restating it. Two implementations of one security rule means the wrong one stays wrong because nobody diffs them. |
| CSV/JSON field escaping for the manifest | anything | `@defminer/engine/csv` via `export.ts`'s `serialiseRows` | `export.ts`'s header, verbatim: *"Writing a second field escaper here would mean the exported bytes and the tested rule are two different things."* D-20 rides this unchanged. |
| path normalisation for the display tree | `node:path` | hand-written segment splitting (§O-08) | **Inverted from the usual advice, and the inversion is measured.** `path.resolve` escaped on 5 of 22 fixtures and `path.normalize` silently rewrote RTL and trailing-whitespace forms [VERIFIED: SPIKE-12.json]. Here the library is the hazard. |
| a keyset pagination scheme for the source list | anything | `reads.ts`'s existing statement matrix shape | `KEYSET_PAGE_ROWS = 100` [VERIFIED: reads.ts:100] with deterministic tie-breaking. D-05's identity model is the `artifacts`/`observations` split, so the queries are already shaped for it. |
| a chunked transport for `mappings` | anything | nothing — it fits in one call | §O-01. |

**Key insight:** this codebase's failure mode is not reaching for a library that does not exist — it is reaching for a *general-purpose* library (`node:path`, a regex, a JSON schema validator) on a path where the general behaviour is the vulnerability. Every hand-roll above is refused for a measured cost; the one hand-roll that is *required* is refused-in-reverse for a measured hazard.

---

## Common Pitfalls

### Pitfall 1 — The D-02 tail window cannot be a small constant, and picking one silently breaks the inline path

**What goes wrong:** the planner picks a sensible-looking window — 4 KB, 64 KB — and `lastIndexOf` finds the announcement for every *external* map and **none of the inline ones**, which are the only ones D-01 consumes. The phase ships, all the tests pass, and it recovers nothing.

**Why it happens:** for an external map the announcement is a short comment at the very end. I measured all three announcing bundles in the corpus [VERIFIED: this session]:

| Bundle | Bytes | Offset of `//# sourceMappingURL=` from EOF | Trailing newline? |
|--------|-------|-------------------------------------------|-------------------|
| `corpus/babel-7.26.4.js` | 2,983,904 | **38** | yes |
| `corpus/monaco-0.52.2.js` | 3,766,654 | **67** | **no** |
| `corpus/tfjs-4.22.0.js` | 1,469,843 | **35** | yes |

For an **inline** map the announcement is `//# sourceMappingURL=data:application/json;base64,` followed by the *entire base64 payload*, running to EOF. The marker therefore sits `payload_length + ~45` bytes from the end — up to **~8.4 MB** from the end. A 64 KB window misses it by two orders of magnitude.

**How to avoid it:** derive the window rather than choosing it.

```
SOURCEMAP_TAIL_WINDOW_BYTES = ceil(MAP_MAX_BYTES * 4 / 3) + ANNOUNCEMENT_PREFIX_MAX
```

where `ANNOUNCEMENT_PREFIX_MAX` covers `//# sourceMappingURL=data:application/json;charset=utf-8;base64,` (~60 bytes) with margin. **This ties D-02's discretionary number to D-10's measurement**, which is the right dependency: the window only needs to be as large as the largest map the phase will accept. Assert the relationship in `thresholds.spec.ts`'s inequality idiom, not as a literal.

**Also note:** `//@ sourceMappingURL=` is a legal legacy spelling that consumers accept — the spec's own pattern is `^[@#]\s*sourceMappingURL=(\S*?)\s*$` [CITED: tc39.es/ecma426/]. None of the three corpus bundles uses it [VERIFIED: `rfind("//@ sourceMappingURL=")` returned −1 on all three, this session], but a `lastIndexOf` for `//#` alone will miss it. Two `lastIndexOf` calls, not a regex.

**Warning signs:** the D-03 external counter climbing while the recovered-source count stays at zero on a target you know serves inline maps.

**Residual, and it is honest to state it:** a window that large is very close to "scan the whole body backwards", which D-02 rejected on cost. **The cost is UNMEASURED** — there is no `indexOf`/`lastIndexOf` measurement anywhere in Phase 0 [VERIFIED: SPIKE-06's operation set contains no string-search op]. That is why `announce_scan` is in the O-03 probe's operation list. If it turns out expensive, the mitigation is a cheap prefilter: `lastIndexOf("sourceMappingURL")` once (16 bytes, one pass) before the two full marker searches.

### Pitfall 2 — D-09 breaks a shipped, mechanically-asserted convergence inequality

**What goes wrong:** the retention sweep stops bounding the database, silently, while running exactly as designed.

**Why it happens.** Three shipped constants and one shipped assertion [all VERIFIED: packages/engine/src/thresholds.ts:82, :105, :117; packages/engine/src/thresholds.spec.ts:189-202]:

```ts
export const ROWS_INSERTED_PER_ARTIFACT_MAX = 3;
export const RETENTION_SWEEP_MAX_ROWS = 512;
export const RETENTION_SWEEP_EVERY_N = 128;
```

asserted as `RETENTION_SWEEP_MAX_ROWS >= ROWS_INSERTED_PER_ARTIFACT_MAX × RETENTION_SWEEP_EVERY_N` (512 ≥ 384 ✓), with the failure message verbatim: *"A sweep that deletes fewer rows per interval than the interval inserts bounds NOTHING: past the retention ceiling the database grows monotonically while the sweep runs exactly as designed."* And a second assertion caps the left-hand side: `expect(RETENTION_SWEEP_MAX_ROWS).toBeLessThanOrEqual(1024)` [VERIFIED: thresholds.spec.ts:204-212], whose message says *"Lower RETENTION_SWEEP_EVERY_N instead."*

`ROWS_INSERTED_PER_ARTIFACT_MAX = 3`'s derivation is stated as *"an `artifacts` row and an `analyses` row when the digest is new at the current corpus version, plus an `observations` row EVERY time"* [VERIFIED: thresholds.ts:75-81].

**Under D-05 + D-09, one artifact carrying a 781-source map inserts up to 3 + 781 + 781 = 1,565 rows** — a derived-source row per new content hash and a sighting row per `(map, index)`. That is **521× the declared worst case**. Satisfying the inequality by raising `RETENTION_SWEEP_MAX_ROWS` needs 1,565 × 128 = 200,320, which violates the 1024 cap by 195×. Satisfying it by lowering `RETENTION_SWEEP_EVERY_N` drives it below 1.

Meanwhile `processedForSweep += 1` counts **artifacts**, not rows [VERIFIED: consumer.ts:661], so 128 map-bearing artifacts could insert ~200,000 rows between sweeps against a `DEFAULT_RETENTION_MAX_ROWS` of 50,000 [VERIFIED: packages/backend/src/store/settings.ts:165].

**How to avoid it — and the fix is already named in the shipped comment.** `consumer.ts:648-660` states the interval's real semantic verbatim: *"whose right-hand side is 'rows inserted per sweep interval' and holds only if every row-inserting iteration advances the interval."* Change the counter to advance by **rows actually inserted** rather than by one:

```ts
processedForSweep += rowsInsertedThisIteration;   // was: += 1
```

Then the inequality becomes `RETENTION_SWEEP_MAX_ROWS >= RETENTION_SWEEP_EVERY_N` (512 ≥ 128 ✓) and holds *independently of how many rows any single artifact produces* — which is exactly the property D-09 needs, and it delivers it **without** the per-map cap D-09 rejected. `ROWS_INSERTED_PER_ARTIFACT_MAX` then becomes a documentation constant rather than a load-bearing one, and `thresholds.spec.ts`'s assertion is restated in the new terms.

**This is a change to Phase 1 machinery and it needs to be called out as such in the plan**, not slipped in. It touches `thresholds.ts`, `thresholds.spec.ts` and `consumer.ts`, and it re-derives a constant whose derivation is written down. The alternative — accepting a per-map row cap — contradicts D-09 and would need the operator, so this is the path that keeps the locked decision intact.

**Warning signs:** `getStorageFootprint` (D-25, Phase 6) showing row counts above the retention cap while `retentionSweeps` climbs normally.

### Pitfall 3 — `sourcesContent` is legally sparse, legally null, and legally absent

**What goes wrong:** `map.sourcesContent[i]` is `undefined` or `null` and the code writes a row for a source it cannot produce, or throws.

**Why it happens:** the spec permits all three [CITED: tc39.es/ecma426/, fetched this session]:

- `sourcesContent` is **optional** — the whole field may be absent.
- Entries **may be null**: *"Entries may be null if some original sources should be retrieved by name."*
- The array **may be shorter than `sources`** — the algorithm is conditioned on `sourcesContentCount > index`.
- And separately, **`sources` entries may themselves be null**: *"Each entry is either a string that is a (potentially relative) URL or null if the source name is not known."*

**How to avoid it:** four distinct cases, four distinct outcomes, each a fixture:

| Case | Outcome |
|------|---------|
| `sourcesContent` absent entirely | The map is *announced and parsed* but yields no recoverable source. Record the map, record zero sources, and **say so** — this is not a failure and must not read as one (UI-09). |
| `sourcesContent[i]` is `null` | Skip index `i`. `DERIVED_REJECT_REASONS.empty` (§O-05) if the phase wants it counted. |
| `sourcesContent.length < sources.length` | Iterate `sources`, guard on the content array's length. Never iterate `sourcesContent` and index into `sources`. |
| `sources[i]` is `null` | The content may still be recoverable. D-06 says store the entry verbatim — a `null` entry stores as SQL `NULL`, and the display tree needs an "unnamed source" label at that index. **This is a real column-nullability decision for `schema.spec.ts`.** |

### Pitfall 4 — `atob` returns latin1 and quietly corrupts non-ASCII recovered source

**What goes wrong:** a recovered `.vue` or `.ts` file containing any non-ASCII character — a comment in Spanish, an emoji in a string literal, a curly quote — comes back mojibake. `JSON.parse` may even succeed, because the corruption is inside string values, not in the JSON structure. Nothing throws. The operator reads wrong source.

**Why it happens:** `atob` decodes base64 to a "binary string" — one UTF-16 code unit per *byte*, latin1. UTF-8 multi-byte sequences become two or three separate characters. The classic fix is `decodeURIComponent(escape(atob(s)))`, which relies on the deprecated `escape`.

**How to avoid it:** use `Buffer.from(payload, "base64").toString("utf8")`, which does the base64 and the UTF-8 in one correct step. `Buffer` is a global here [VERIFIED: capabilities.json `typeofs."Buffer": "function"`] and `buffer` is on the DIST-05 allowlist.

**Warning signs:** a fixture with a `£`, a `—` or a CJK character in `sourcesContent` round-tripping to a different sha256 than the source file it was built from. **That fixture belongs in the MAP-05 suite**, and it is cheap: it runs in the engine, on Node, with no Caido.

### Pitfall 5 — indexed maps (`sections`) are a second, recursive shape

**What goes wrong:** the parser reads `map.sources` on an index map, gets `undefined`, and reports "no sources" for a map that has hundreds.

**Why it happens:** an index map has no top-level `sources`/`sourcesContent`. It has `sections`, each `{offset: {line, column}, map: <a complete source map>}` [CITED: tc39.es/ecma426/, verbatim: *"The `map` field is an embedded complete source map object"*]. The spec also states sections *"shall be sorted by starting position and the represented sections shall not overlap"* — a **shall**, which a hostile map will violate.

**Two facts that bound the danger, both from the spec** [CITED: tc39.es/ecma426/]:

- **Sections contain inline embedded maps only** — the spec defines only the `map` field, not a `url` alternative. So there is no fetch to refuse and no external reference to resolve. (An older draft permitted `url`; the current spec does not, and D-01 would refuse it anyway.)
- **Index maps do not nest** — a section's `map` is a complete source map, not another index map. **This bounds MAP-05's "reference cycles" to a depth of exactly one**, which is a much smaller problem than it sounds. The plan should say so: the recursion bound is `1` by specification, and the fixture proves the parser enforces it rather than trusting the input.

**How to avoid it:** detect `sections` before `sources`, iterate one level, refuse a nested `sections` explicitly with a named reason, cap the section count, and count sources across sections against the same aggregate bound. Fixtures: a valid index map, a nested one (must be refused), an overlapping/unsorted one (must not crash), and one whose `map` is `null`.

### Pitfall 6 — the `)]}'` XSSI prefix

**What goes wrong:** `JSON.parse` throws on a map that is perfectly valid, and D-11 records `partial` for a map DefMiner should have read.

**Why it happens:** the spec permits it: *"when delivering source maps over HTTP(S), servers may prepend a line starting with the string `)]}'` to the source map"*, and the fetch algorithm strips it [CITED: tc39.es/ecma426/].

**How to avoid it:** strip a leading `)]}'` through end-of-line before `JSON.parse`, by `startsWith` and `indexOf("\n")` — not a regex. **Note the scope:** the spec attaches this to HTTP(S) delivery, which is the *external* `.map` case D-01 excludes. Inside a `data:` URI it should never occur. Handle it anyway — it costs four lines and one fixture, and "should never occur" is not a property of target-controlled input.

### Pitfall 7 — `partial` will mean four different things

**What goes wrong:** the operator sees `Partial`, which `05-UI-SPEC.md` defines as *"Stopped early — results are a floor"*, and cannot tell whether the analysis deadline expired, the map was too big, the map was malformed, or the base64 was corrupt.

**Why it happens:** D-11 folds every reconstruction failure into the one existing state, and today `partial` has exactly one producer (deadline expiry) and always writes `error = null` [VERIFIED: consumer.ts:803]. CONTEXT.md accepts this cost explicitly for the detector axis; it does not discuss the *four-way* ambiguity within reconstruction itself.

**How to avoid it:** the `error` column is the discriminator and Phase 7 is its first non-null writer. Write a **DefMiner-authored reason code** there, from `DERIVED_REJECT_REASONS` (§O-05) — never a caught exception's text. `describeError` redacts and truncates [VERIFIED: telemetry.ts:673] and is the right function for a *diagnostic*, but the operator-facing discriminator must be a code the UI can map to copy, which is the rule every other vocabulary in this repo follows [VERIFIED: contract.ts:1354-1357, verbatim: *"REASONS, NEVER MESSAGES — the same rule the RPC client's RpcReason states. The frontend maps each member to its own copy, so nothing a driver said can be interpolated into a sentence the operator reads."*].

### Pitfall 8 — the corpus cannot exercise this phase

**What goes wrong:** the MAP-05 and D-15 fixture work is planned against `corpus/`, and produces zero coverage of the actual consumed path.

**Why it happens:** measured — **no pinned corpus bundle carries an inline map**; three carry external announcements and five carry none [VERIFIED: tail-scan of all eight `corpus/*.js` and `corpus/big/*.js` this session].

**How to avoid it:** build `corpus/maps/` deliberately, in the `fetch-corpus.sh` sha256-gated idiom, containing (a) real external `.map` files fetched from the same pinned bundle versions, (b) synthesised inline-map JS wrapping them at each probe size point, and (c) the hostile set. This is one artifact serving the O-03 probe, MAP-05 and D-15 at once, so it should be one plan's deliverable and should come early.

**And a related trap already recorded in the tree:** `corpus/composite-8mb.js` is not valid JavaScript *because* monaco ends with a `//# sourceMappingURL` comment and no trailing newline, which swallowed the next file's opening `/**` [VERIFIED: SPIKE-06.json `notes`, verbatim: *"monaco ends with a //# sourceMappingURL comment and no trailing newline, so plotly's opening /** is swallowed into that comment"*]. Any Phase 7 fixture built by concatenation will hit the same thing, and it is the same defect the announcement scanner must be robust to: **an announcement is only an announcement if it is on the last line.**

---

## Code Examples

All patterns below are traced from shipped code in this repository. Nothing here is invented.

### The announcement scan (D-02) — `lastIndexOf`, bounded, no regex

```ts
// Pattern source: packages/backend/src/hooks/admit.ts:112-127, which does the
// same job with indexOf/endsWith and states the ReDoS reason at :30-36.
const MARKERS = ["//# sourceMappingURL=", "//@ sourceMappingURL="] as const;

export function findAnnouncement(
  body: string,
  windowBytes: number,          // SOURCEMAP_TAIL_WINDOW_BYTES — derived, see Pitfall 1
): { at: number; url: string } | null {
  const from = body.length > windowBytes ? body.length - windowBytes : 0;
  let best = -1;
  let marker = "";
  for (const m of MARKERS) {
    const at = body.lastIndexOf(m);
    if (at >= from && at > best) { best = at; marker = m; }
  }
  if (best < 0) return null;
  // The announcement runs to end-of-line; a data: URI runs to EOF when there is
  // no trailing newline (measured: corpus/monaco-0.52.2.js has none).
  const nl = body.indexOf("\n", best);
  const end = nl < 0 ? body.length : nl;
  return { at: best, url: body.slice(best + marker.length, end).trim() };
}
```

### The base64 + parse step (D-04) — the correct primitive

```ts
// Pattern source: packages/engine/src/decode.ts:44-47, which uses the same
// primitive for the utf-8 half and states why TextDecoder is unavailable.
const B64_PREFIXES = [
  "data:application/json;base64,",
  "data:application/json;charset=utf-8;base64,",
] as const;

export function decodeInlineMap(url: string, maxBytes: number): string | null {
  for (const p of B64_PREFIXES) {
    if (!url.startsWith(p)) continue;
    const payload = url.slice(p.length);
    // Gate on the ENCODED length before allocating the decoded buffer.
    if (payload.length > Math.ceil((maxBytes * 4) / 3) + 4) return null;
    // Buffer, NOT atob — atob yields latin1 and corrupts non-ASCII (Pitfall 4).
    return Buffer.from(payload, "base64").toString("utf8");
  }
  return null;
}
```

### The producibility UPDATE on a read path (D-23) — the statement shape

```ts
// Pattern source: packages/backend/src/store/retry.ts:103-156, verbatim in shape.
// One statement, ? placeholders, project_id in the WHERE, values SPREAD.
const MARK_UNPRODUCIBLE_SQL = `
UPDATE source_sightings
SET producibility = ?, producibility_at = ?
WHERE project_id = ? AND map_sha256 = ? AND source_index = ?
  AND producibility = ?
`;

export async function markUnproducible(
  db: Database, projectId: string, mapSha256: string,
  sourceIndex: number, at: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(MARK_UNPRODUCIBLE_SQL);   // inside the fn, never module scope
    const res = await stmt.run(
      "unproducible", at, projectId, mapSha256, sourceIndex, "producible",
    );                                                       // SPREAD, never an array
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}
```

The trailing `AND producibility = ?` makes it idempotent and makes D-23's stickiness a property of the statement: a second attempt changes zero rows and cannot un-stick a tombstone.

### The RPC handler shape (D-07/D-23/D-24)

```ts
// Pattern source: packages/backend/src/index.ts:846-874 (retryAnalysis).
sdk.api.register("deriveSource", async (_s, req) => {
  const pid = currentProjectId();          // BEFORE any await; lands in every WHERE
  if (!db || pid === null) return NOT_PRODUCIBLE;

  const rr = await sdk.requests.get(req.requestId);
  if (!rr)          { await markUnproducible(db, pid, …); return TOMBSTONE_NO_REQUEST; }
  if (!rr.response) { await markUnproducible(db, pid, …); return TOMBSTONE_NO_RESPONSE; }

  const bytes = /* extract */;
  if (sha256Hex(bytes) !== req.artifactSha256) return MISMATCH;   // D-24, FAIL CLOSED

  /* re-announce, re-decode, re-parse, take sourcesContent[req.index] */
  return { ok: true, content, mappings };
});
```

### The D-17 gate's rule record

```ts
// Pattern source: packages/backend/src/filesystem-prohibition.spec.ts:234-296.
const CODEC_PACKAGE = "@jridgewell/sourcemap-codec";

const CODEC_SPECIFIER_LIST: readonly string[] = Object.freeze([
  CODEC_PACKAGE,
  `${CODEC_PACKAGE}/dist/sourcemap-codec.umd.js`,   // a SECOND legal export path
]);

const RULES = Object.freeze({
  "codec-import": Object.freeze({
    rule: "codec-import",
    surface: `an import of ${CODEC_SPECIFIER_LIST.map((s) => `"${s}"`).join(", ")}, ` +
             `or any ${CODEC_PACKAGE}/* subpath, in any import shape including type-only`,
    why:
      "MAP-02 requires no VLQ decoding on the primary path, and D-16 discharges it by " +
      "moving the decode to the browser: SPIKE-06 measured vlq_decode at 167 ms on 8.3 MB " +
      "against a 25 ms slice, decode() consumes the whole mappings string so it cannot be " +
      "chunked, and 167 ms of blocked QuickJS is 167 ms in which live browsing is not being " +
      "proxied. The ban is on the CAPABILITY, not the usage, because a boundary a refactor " +
      "can quietly move is the weaker kind of gate. AND NO OTHER GATE CAN SEE THIS: " +
      "scripts/ci/check-bundle-imports.mjs reads import SPECIFIERS out of the built bundle, " +
      "and SPIKE-06 measured that this codec is FULLY BUNDLED under Caido's own build — so " +
      "it emits no specifier and that gate is silent by construction, exactly as " +
      "sql-discipline.spec.ts is silent on HTTPQL. packages/engine/src is in scope because " +
      "the engine is bundled into BOTH the backend and the frontend dist, so a codec import " +
      "placed there would satisfy 'the decode runs in the frontend' by accident while " +
      "shipping the codec into the backend.",
  }),
  "codec-unanalysable": Object.freeze({
    rule: "codec-unanalysable",
    surface: "a dynamic import() whose specifier is not a literal",
    why:
      "this is the argument, not the rule. A specifier assembled from pieces is the one " +
      "shape that defeats an AST gate SILENTLY — the walk returns nothing and the file " +
      "reports clean, which is INDISTINGUISHABLE FROM A PASS. Resolve the value, or delete " +
      "the indirection.",
  }),
});
```

---

## Runtime State Inventory

Phase 7 is additive rather than a rename or refactor, so most categories are empty. They are answered explicitly rather than omitted, because "checked and found nothing" and "not checked" must be distinguishable.

| Category | Items found | Action required |
|----------|-------------|-----------------|
| **Stored data** | The plugin's own SQLite gains two tables. **No existing row's meaning changes.** `analyses.error` goes from always-`null` on the consumer path to sometimes-populated [VERIFIED: consumer.ts:803 currently passes `null`] — a **behaviour** change, not a data migration. | Forward migration step only. No backfill: existing artifacts were never scanned for maps, and re-scanning them is Phase 6's retroactive scan, not this phase. |
| **Live service config** | None — verified. DefMiner registers no external service, no webhook, no scheduled job. `sdk.api.register` names are in-process [VERIFIED: packages/backend/src/index.ts:576-1305]. | None. |
| **OS-registered state** | One item, and it is **not Phase 7's**: the SPIKE-10 recorder LaunchAgent, whose `STATE.md` entry names a pid that no longer exists — carried in Phase 6's `deferred-items.md`. | None for Phase 7. Do not touch it; do not let it be "fixed" opportunistically inside this phase. |
| **Secrets / env vars** | None. No new secret, no new env var. `scripts/spike/instance.sh` mints a guest bearer token per run and deletes it at teardown [VERIFIED: instance.sh:51, :148-150 — written under `umask 077` then `chmod 600`]; the O-03 probe inherits that unchanged. | None. |
| **Build artifacts / installed packages** | `pnpm-lock.yaml` changes (the codec's workspace moves). `packages/dist/plugin_package/defminer-frontend/index.js` grows by the codec's bundled size. `node_modules/.pnpm` already holds 1.5.5, so nothing is fetched. | `pnpm install` after the manifest edit; re-run `pnpm check:bundle`, `pnpm check:externals`, `pnpm knip`. |

**The one thing that IS a state change and is easy to miss:** `SCHEMA_VERSION` is derived from the last migration's `v` [VERIFIED: migrations.ts:854], and `DB_SURVIVES_REINSTALL = "survives force-reinstall only"` [VERIFIED: thresholds.generated.ts:~29]. An operator who force-reinstalls keeps their database and runs the new migration; one who uninstalls and reinstalls loses it entirely. Neither is new, but Phase 7 is the first phase to add tables since the operator has had meaningful data in them.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Caido CLI, version-pinned | O-03 probe | ✅ | `.caido-bin/0.58.0/caido-cli` → **0.58.0**, sha512-verified | App bundle at **0.58.2** (drifts); `~/.caido/caido-cli` at 0.55.3 is **banned** |
| `caido-dev build` (`@caido-community/dev`) | Tier-1 probe build (DIST-05 is part of what is measured) | ✅ | 0.1.7 [VERIFIED: package.json devDependencies] | None — a hand-zipped probe measures the wrong artifact [VERIFIED: SPIKE-06.json `method`] |
| `python3` | RSS sampler, result writer, schema validation | ✅ | 3.14.7 | None |
| `curl`, `lsof`, `shasum`, `zip` | `instance.sh` / `probe-run.sh` | ✅ | system | None |
| `vitest` | every gate | ✅ | 4.1.11 [VERIFIED: package.json] | None |
| `jsdom` | frontend component specs | ✅ | 30.0.1 | None |
| `playwright` | frame-budget load test (`tests/frontend-load.spec.ts` precedent) | ✅ | 1.62.1 | Assert the bounded window without frame timing — weaker but not vacuous |
| `@jridgewell/sourcemap-codec` | D-16 | ✅ | 1.5.5, already in `node_modules/.pnpm` | None |
| Network (npm registry) | version confirmation | ❌ | — | Lockfile + installed package on disk; both were read directly |
| A real target serving an **inline** sourcemap | end-to-end proof | ❌ **not in the corpus** | — | **Synthesise fixtures from real external `.map` files** (Pitfall 8) |

**Missing with no fallback:** none blocking.
**Missing with fallback:** the inline-map corpus — synthesis is the fallback and it is also the D-15 deliverable, so it is work the phase owes anyway rather than a workaround.

**Port block:** 8941–8945 is unallocated [VERIFIED: enumerated every port literal under `scripts/` this session — 3100, 8080–8083, 8951–8955, 8961–8965, 8971–8975, 8981–8985, 8990–8999 are taken]. 8080 must be refused unconditionally, as `instance.sh:94-98` already does.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` [VERIFIED: .planning/config.json]). This section is what `plan-phase` turns into VALIDATION.md.

### Test framework

| Property | Value |
|----------|-------|
| Framework | **vitest 4.1.11** [VERIFIED: package.json devDependencies] |
| Config file | `vitest.config.ts` (root, single config — **no `projects`/`workspace` key, deliberately**) |
| Include globs | `tests/**/*.spec.ts`, `packages/*/src/**/*.spec.ts`, `scripts/ci/**/*.spec.ts` [VERIFIED: vitest.config.ts] |
| jsdom selection | per-file `// @vitest-environment jsdom` docblock on line 1 — `environmentMatchGlobs` was removed in vitest 4 [VERIFIED: vitest.config.ts comment] |
| Quick run | `pnpm vitest run packages/engine/src/sourcemap --reporter=dot` |
| Full suite | `pnpm test` (= `vitest run --reporter=dot`, with `pretest` = `pnpm build:backend`) |
| Timeouts | `testTimeout: 120_000`, `hookTimeout: 120_000` |

**A hard constraint on any new spec file, quoted because breaking it is silent** [VERIFIED: vitest.config.ts, verbatim]:

> `NO projects or workspace key, and no per-package vitest config (decision P2-D4). Five files in this repo — tests/schema.spec.ts, tests/spike-results.spec.ts, tests/go-no-go.spec.ts, scripts/spike/instance.sh and scripts/spike/probe-run.sh — resolve the Phase 0 results directory from a bare relative literal, so a per-project root would break all five at once.`

⇒ Phase 7 adds spec files to the existing globs. It does **not** add a vitest project.

### The three validation tiers

The project's own doctrine, which this section applies rather than invents: **fail, never skip, and name the remedy in every message** [VERIFIED: tests/phase6-matrix.spec.ts:16]. An absent artifact fails; it never passes vacuously.

#### Tier 1 — Unit / static, no Caido, runs in CI on every commit

Everything here runs under plain vitest on Node. This is where the *majority* of Phase 7's assurance lives, and deliberately so: putting the parser in `packages/engine` (SDK-free by construction) is what makes it possible.

| What | Where | Assertion |
|------|-------|-----------|
| Announcement scan (D-02) | `packages/engine/src/sourcemap/announce.spec.ts` | Both markers; window boundary at exactly the cap and one byte beyond; no trailing newline (the monaco shape); announcement not on the last line is **not** an announcement; no regex anywhere in the module (AST assertion) |
| base64 decode (D-04) | `packages/engine/src/decode.spec.ts` | Both prefixes and the `;charset=` variant; malformed base64; **non-ASCII round-trip** (Pitfall 4); the `atob`-vs-`Buffer` divergence demonstrated, not asserted-away |
| Map shape (MAP-05) | `packages/engine/src/sourcemap/parse.spec.ts` | Absent / null / short `sourcesContent`; null `sources` entry; `sections` index map; **nested `sections` refused**; unsorted/overlapping sections; `)]}'` prefix; deep JSON nesting against the measured 246-level parens / 710-level bracket stack limits [VERIFIED: SPIKE-06 `nesting_depth` rows]; millions of tiny sources; giant single `sourcesContent` |
| Display hostility | same suite + `packages/frontend/src/sourcemap/tree.spec.ts` | All 22 SPIKE-12 fixtures + the 4 KB label; **round-trip losslessness** of the stored verbatim string |
| Traversal non-reachability (D-12) | `packages/backend/src/codec-prohibition.spec.ts`'s sibling, or its own file | Static gate: no `sources` value reaches a path-like sink; firing fixture + legal fixture; **goes red the day a filesystem returns** |
| Codec ban (D-17) | `packages/backend/src/codec-prohibition.spec.ts` | Full cross product of specifier forms × import shapes; by-name non-vacuity across **both** source roots; self-audit; legal fixture per rule |
| SQL discipline (O-06) | `packages/backend/src/store/sql-discipline.spec.ts` (existing, no edit) | Picks up the new statements automatically — the walk is over the whole package |
| Schema (D-05, D-09, D-24) | `packages/backend/src/store/schema.spec.ts` | `EXPECTED_TABLES` exact; every column allowlisted with justification; `project_id` in every PK by ordinal; every declared type in `{INTEGER, REAL, TEXT}`; producibility CHECK read back and compared member-by-member to the `contract.ts` array |
| Convergence (Pitfall 2) | `packages/engine/src/thresholds.spec.ts` | The **inequality**, restated in rows-per-interval terms; never the number |
| Every-reason gates (O-05) | the derived path's own spec | `DERIVED_REJECT_REASONS` exercised exactly, closed, duplicate-free |
| Depth bound (D-13) | consumer spec | The test-only detector proves depth-1 and no re-entry |
| RPC contract | `packages/backend/src/api/spec.ts` + frontend `backend.ts` | `CONTRACT_VERSION` bumped from 5 [VERIFIED: api/spec.ts:148] |

#### Tier 2 — jsdom component, no Caido, runs in CI

| What | Assertion |
|------|-----------|
| Source viewer render | R1: no `v-html`, no `innerHTML`, nothing target-controlled in `:style`/`href`/`src` — enforced by lint at `error` with no per-line disable, plus `scripts/ci/lint-r1.spec.ts` |
| R2 per line | control strip, bidi strip, grapheme-safe truncation at `SOURCE_LINE_MAX_GRAPHEMES`, `white-space: pre` |
| **O-02: no line structure** | a single-line multi-MB source renders one truncated row **and a visible UI-09 degradation marker**; no `title` and no `data-*` carries the untruncated value |
| Tombstone (D-22) | the degraded state renders as a sentence, is visibly marked, and is never presented as complete |
| O-07 separation | analysis state and producibility never share a column or a badge component; no shared or prefix label against the seven existing ones |
| Virtualisation | `itemSize` bound to a fixed constant; a bounded DOM window at 10,000 lines |

#### Tier 3 — needs a live Caido instance (external harness, NOT `pnpm test`)

Nothing inside QuickJS can observe these; they are shell-driven, artifact-producing, and gated by a spec that reads the artifact.

| What | Why it cannot be a unit test |
|------|------------------------------|
| **O-03: `MAP_MAX_BYTES`** | The whole point. CPU and RSS inside Caido's embedded QuickJS, which is measurably not standalone quickjs-ng (§O-04). |
| `announce_scan` cost | `lastIndexOf` over multi-MB strings, in *that* engine. Unmeasured anywhere (Pitfall 1). |
| `JSON.parse` cost + peak RSS | The operation Phase 0 never measured. |
| Real `sdk.requests.get` behaviour for D-22 | Whether and when Caido drops a request from history. **Not measurable in-repo** — see Open Questions. |
| Actual RPC payload ceiling | `export.ts:115` states it verbatim: *"Nothing in this repository can push bytes through Caido's RPC, so the real ceiling is live-only."* |

**Harness, reusing Phase 0's unchanged:** `scripts/spike/instance.sh` (with the phase's own `EXPECT_VERSION`), `scripts/spike/rss-sampler.sh` at 50 ms, `scripts/spike/probe-run.sh`, a Tier-1 probe built by `caido-dev build`, a `ladder.sh`-shaped driver with **one fresh instance per size point**.

**Artifact + gate:** result JSON in Phase 7's own `results/` with its own JSON Schema, gated by `tests/phase7-mapbytes.spec.ts` in the `tests/phase6-matrix.spec.ts` shape — Ajv-validated, `run_id` uniqueness asserted, its own pinned version constant, fail-never-skip.

#### Tier 4 — only observable through an external probe

The RSS sampler *is* the standing example and it is the only memory measurement that exists here [VERIFIED: scripts/spike/rss-sampler.sh:5-10, verbatim: *"This is not a convenience — it is the ONLY memory measurement method available. Caido's QuickJS exposes no memory introspection whatsoever: llrt:qjs, perf_hooks and process all fail to load, `performance` carries only `now` and `timeOrigin`, and there is no gc()."*]. Peak RSS during `JSON.parse` of a bounded map cannot be observed from inside the runtime at all, and every reading must be a **delta from a marker**, never an absolute.

### Requirements → test map

| Req | Behaviour | Tier | Command | Exists? |
|-----|-----------|------|---------|---------|
| MAP-01 | inline announcement found; external counted | 1 | `pnpm vitest run packages/engine/src/sourcemap/announce.spec.ts` | ❌ Wave 0 |
| MAP-02 | `sourcesContent` reconstruction; no VLQ on the primary path | 1 + 3 | `pnpm vitest run packages/engine/src/sourcemap` + the probe | ❌ Wave 0 |
| MAP-03 | codec decode, frontend only | 1 + 2 | `pnpm vitest run packages/backend/src/codec-prohibition.spec.ts` | ❌ Wave 0 |
| MAP-04 | `sources` never reaches a path-like sink | 1 | the retained-traversal gate | ❌ Wave 0 |
| MAP-05 | hostile maps bounded | 1 | `pnpm vitest run packages/engine/src/sourcemap/parse.spec.ts` | ❌ Wave 0 |
| MAP-06 | once per content hash; depth-1 | 1 | `pnpm vitest run packages/backend/src/ingest/consumer.spec.ts` | ⚠️ file exists, cases do not |
| MAP-07 | manifest rows export; content single-file | 1 + 2 | `pnpm vitest run packages/backend/src/store/export.spec.ts` | ⚠️ file exists, cases do not |
| UI-05 | viewer, incl. the no-line-structure case | 2 | `pnpm vitest run packages/frontend/src/components/SourceViewer.spec.ts` | ❌ Wave 0 |

### Sampling rate

- **Per task commit:** `pnpm vitest run packages/engine/src/sourcemap --reporter=dot` — the parse and fixture suite, seconds.
- **Per wave merge:** `pnpm test` — full suite, including every static gate.
- **Phase gate:** full suite green, **plus** the Tier-3 probe artifact committed and `tests/phase7-*.spec.ts` green, before `/gsd-verify-work`.

### Wave 0 gaps

- [ ] ~~`corpus/maps/`~~ **[SUPERSEDED — see PATTERNS debt 3 and plan `07-01`]** — real `.map` files + synthesised inline fixtures + the hostile set, sha256-gated (Pitfall 8). **Blocks the probe, MAP-05 and D-15 simultaneously; do it first.** The `corpus/maps/` PATH is not followed: `.gitignore:9` excludes `corpus/` entirely, so bytes written there do not survive a clean checkout. The fixtures take TWO TRACKED HOMES instead — `scripts/phase7/fetch-maps.sh` (fetcher plus committed SHA-256s) and `packages/engine/src/sourcemap/map-fixture.ts` (string literals). Everything else in this line stands.
- [ ] `packages/engine/src/sourcemap/{announce,parse}.ts` + specs
- [ ] `packages/backend/src/codec-prohibition.spec.ts` (D-17)
- [ ] The retained-traversal gate (D-12)
- [ ] `.planning/phases/07-sourcemap-reconstruction/results/` + its JSON Schema + `tests/phase7-mapbytes.spec.ts`
- [ ] `scripts/phase7/` probe driver + Tier-1 probe under `tier1/`
- [ ] `packages/frontend/src/sourcemap/tree.ts` + spec (O-08)
- [ ] `SourceViewer.spec.ts` with `// @vitest-environment jsdom` on line 1

*No framework install is needed — vitest, jsdom and playwright are all present.*

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"` [VERIFIED: .planning/config.json].

**This phase renders the most hostile data the product has ever handled**, and CONTEXT.md says so: *"Target-controlled bytes, at megabyte scale, in a component whose whole job is to display them faithfully."*

### Applicable ASVS categories

| Category | Applies | Standard control here |
|----------|---------|----------------------|
| **V1 Architecture** | yes | The tier map above; D-17's capability ban; D-07's no-content-at-rest |
| **V2 Authentication** | no | The plugin authenticates nothing; Caido owns the session |
| **V3 Session Management** | no | Same |
| **V4 Access Control** | yes | `project_id` in every primary key and every `WHERE`; the epoch re-check. `schema.spec.ts` enforces the first structurally, `sql-discipline.spec.ts` the second |
| **V5 Input Validation / Output Encoding** | **yes — the load-bearing one** | R1 (text, never markup — lint-enforced at `error`), R2 (control strip → bidi strip → grapheme truncation), `@defminer/engine/sanitise`, `safety/display.ts`. Plus the shape validation in `parse.ts` |
| **V6 Cryptography** | yes, narrowly | sha256 via `crypto.createHash` for identity (D-05) and integrity (D-24). **Never hand-rolled** — and D-24's fail-closed comparison is an *integrity* control, not merely a cache key |
| **V7 Error Handling / Logging** | yes | `describeError` redacts URL- and path-shaped substrings **before** truncating; `error-redaction.spec.ts` polices it; reason codes cross the RPC, never driver text |
| **V8 Data Protection** | yes | No content at rest (D-07); no BLOB / untyped column (D-24, Phase 6); retention bounds apply with no exemption (D-09) |
| **V12 Files / Resources** | **dissolved, not satisfied** | There is no filesystem. `filesystem-prohibition.spec.ts` is what keeps that true. Record it as a dissolution — that is the register `filesystem-prohibition.spec.ts:52-57` itself uses for DEPLOY-03's expiry clause |
| **V13 API / Web Service** | yes | RPC payloads are bounded (§O-01); reason codes not messages; no untrusted value in an event payload |

### Threat patterns for this stack

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| Hostile `sources` used as a path → traversal | Tampering / EoP | **Dissolved** — no filesystem. D-12's retained gate proves the sink does not exist and fires the day it returns |
| Bidi override spoofing a filename in the tree | Spoofing | R2 step 2 strips `U+202A`–`U+202E`, `U+2066`–`U+2069`. Fixture #18 |
| NUL byte truncating a display label | Tampering | R2 step 1 strips C0/C1. Fixture #12 |
| Homoglyph / NFC-vs-NFD / case duplicate labels | Spoofing | §O-08 step 5 — disambiguate by index, **never** by normalising or case-folding (which would *lose* the distinction). Fixtures #13–16 |
| Recovered source containing markup executed in the viewer | EoP | R1: no `v-html`, no `innerHTML`, banned by lint at `error` with no per-line disable. **D-19's no-highlighter is a second layer** — nothing tokenises these bytes |
| Decompression bomb | DoS | **No decompressor exists** — `zlib` does not load [VERIFIED: capabilities.json]. Caido decompresses before the hook and `PASSIVE_MAX_BYTES` bounds the result |
| Resource exhaustion via giant / millions-of-tiny `sourcesContent` | DoS | `MAP_MAX_BYTES` (O-03) + the source-count cap + the line-count cap (§O-02 residual) |
| Deeply nested JSON → stack exhaustion | DoS | Measured: 246 nested parens / 710 nested brackets break the 512 KiB stack, and **the failure is a catchable `RangeError` every time; the host survived all 18 probes** [VERIFIED: SPIKE-06.json `verdict.answer`]. So catch-and-degrade is available and a pre-parse depth gate is not required — but the catch must exist and be tested |
| ReDoS taking the host down | DoS | `REDOS_INTERRUPTIBLE = false`, `REDOS_RECOVERY = "kill"`, and the kill takes the operator's project. **No regex on any path touching a full body** — D-02, and `admit.ts:30-36` states it |
| Source attributed to a bundle it did not come from | Spoofing / Repudiation | **D-24, fail closed.** The single most valuable security property this phase adds |
| Cross-project leakage of recovered sources | Information disclosure | `project_id` in the PK by ordinal + in every `WHERE`; enforced by two static gates |
| Secret material inside recovered source reaching a log or an event | Information disclosure | Recovered content **never** enters a log, an event payload, or a `data-*` attribute. `InvalidationSummary` carries four scalars only, and `newestId` is *"a row identifier (a digest, a request id), never a value and never a URL"* [VERIFIED: contract.ts:~780] |

**One security consequence of D-07 worth stating plainly, because it is a genuine win:** recovered source is the most sensitive data this tool ever touches — it is the target's actual source code, plausibly containing credentials, internal hostnames and business logic. **D-07 means a stolen copy of the plugin database contains none of it.** That is `schema.spec.ts`'s stated mitigation — *"a stolen copy of the plugin database must be a list of URLs, digests and byte counts, not a credential dump"* [VERIFIED: schema.spec.ts:~360] — extended to the highest-value data class in the product. The plan should claim this explicitly; it is the strongest argument for the on-demand design and it is currently only implicit.

---

## State of the Art

| Old approach | Current approach | When changed | Impact on this phase |
|--------------|------------------|--------------|----------------------|
| Source Map Revision 3 as a Google doc | **ECMA-426, a TC39 standard** with a formal `FetchSourceMap` algorithm | ratified 2024–2025 | Nullability, the `sections` shape, `ignoreList` and the `)]}'` prefix are now normative rather than folklore. Pitfalls 3, 5 and 6 all cite it |
| `source-map@0.8` as the default library | `@jridgewell/*` family | ~2022 onward | `source-map@0.8` ships `mappings.wasm` and there is **no WebAssembly** in this runtime [VERIFIED: capabilities.json `typeofs."WebAssembly": "undefined"`]. Disqualified on two independent hard failures [CITED: STACK.md:210-212] |
| `x_google_ignoreList` | `ignoreList` | recent | Not used by this phase, but a map may carry either. Ignore both; do not fail on them |
| Index maps with a `url` per section | embedded `map` only | current spec | **Bounds MAP-05's cycle problem to depth 1** (Pitfall 5) and removes any fetch temptation |
| JSMiner's `realpath`-based containment | not applicable | — | Doubly obsolete: `realpath` does not exist here, and there is no filesystem. `REQUIREMENTS.md:28` already records that `lstat` *does* exist, contradicting MAP-04's parenthetical |

**Deprecated / outdated in this repo's own documents:**

- **`REQUIREMENTS.md` MAP-02's parenthetical** — a standalone-quickjs-ng figure presented without its harness (§O-04).
- **`REQUIREMENTS.md` MAP-04's parenthetical** — the `realpath`/`lstat` note, contradicted by SPIKE-12 and mooted by D-17.
- **`ROADMAP.md` Phase 7 SC1, SC3, SC5, SC6 and all four plan titles** — CONTEXT.md's `<specifics>` requires the planner to amend the roadmap or state the divergence explicitly, and names the Phase 6 precedent for doing so.

---

## Assumptions Log

Claims tagged `[ASSUMED]` in this document, and where a reasoned argument is standing in for something unmeasured. The planner should treat every row as needing confirmation before it becomes a locked design commitment.

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | `JSON.parse` of a bounded map is affordable somewhere below 6.29 MB on the proxy thread | O-03 | **This is the phase's premise.** If it is affordable nowhere useful, D-08's always-on placement needs revisiting. **The probe is the mitigation and it must run first.** |
| A2 | `lastIndexOf` over a multi-MB string is cheap enough for the derived tail window | Pitfall 1 | If expensive, every admitted artifact pays it — including the majority with no map, which is exactly the cost D-02 rejected the whole-body scan over. Mitigation: the 16-byte prefilter, and `announce_scan` is in the probe |
| A3 | Caido's real RPC ceiling is at or above the project's 8 MiB budget | O-01 | A 6 MB `mappings` response fails live. **Pre-existing** — `exportInventory` already ships 7.00 MiB under the same assumption — so Phase 7 inherits rather than creates it |
| A4 | The `SUS`/`too-new` verdicts on both packages are freshness artefacts, not real signals | Package Audit | Rests on download volume and repository, **not** on a verified creation date — `npm view … time.created` returned nothing in this sandbox |
| A5 | Caido's `requests.get` remains satisfiable for a useful window after ingest | D-22 / O-07 | If Caido evicts aggressively, most rows become tombstones quickly and the feature is mostly an inventory. **Unmeasured — see Open Question 1** |
| A6 | Mainstream bundlers put the announcement on the last line | D-02 | Measured true for 3/3 announcing corpus bundles, but n=3 and all external. An inline map placed mid-file would be missed |
| A7 | `MAP_MAX_BYTES` will land below 6,291,456, making the RPC bound doubly slack | O-01 | If it lands *at* the ceiling, the `mappings` response is 6.29 MB against an 8 MiB budget — still inside, but with less margin than stated |
| A8 | Changing `processedForSweep` to count rows does not destabilise the sweep's cost bound | Pitfall 2 | The sweep would then trigger more often on map-heavy traffic. `RETENTION_SWEEP_MAX_ROWS`'s cost half needs re-checking against the new cadence, not just its convergence half |
| A9 | The producibility axis will survive Phase 2's OBS-02 review as a separate column | O-07 | If OBS-02 rules for one vocabulary, this is a migration step plus one presentation map — bounded, but real |
| A10 | Two tables (content-addressed + sighting) is the right D-05 shape | O-03/Pitfall 2 | Drives the row-count arithmetic. A single denormalised table halves the rows and loses the cross-bundle dedupe D-05 exists for |

---

## Open Questions (RESOLVED)

*All four are discharged in plan text. Each carries its resolution and the plan location that
discharges it. None is left open into execution.*

**1. How long does Caido keep a request retrievable by `sdk.requests.get`? — (RESOLVED: not blocking; measured opportunistically)**
- *What we know:* the reload can already return `undefined` at two distinct points, milliseconds after admission, and both are counted [VERIFIED: consumer.ts:530-542, `reloadMissing` / `reloadNoResponse`]. SPIKE-11 measured that a browser-cache hit never reaches the plugin and a 304 arrives with a zero-length body [VERIFIED: SPIKE-11.json `verdict.answer`] — but that is about the **hook**, not about retention of an already-stored request.
- *What is unclear:* whether Caido prunes stored requests by age, by count, or not at all; and what a project switch or delete does to them.
- *Recommendation:* **do not block on it.** D-22/D-23's design is correct whatever the answer — lazy detection, sticky outcome, tombstone kept. If the probe instance is already up for O-03, a cheap opportunistic measurement is: store N requests, wait, re-`get` them, record the survival curve. Worth one paragraph in the probe, not its own plan.
- **RESOLVED IN:** plan `07-01`, `must_haves.truths` — the opportunistic survival-curve measurement is recorded in `map-bytes.json` as an OBSERVATION with its own `status`, carried as a `verification: backstop` truth, and is never presented as a settled retention policy. Restated as assumption A5 in plan `07-05`: it informs the tombstone copy and does not gate the phase.

**2. Does an operator actually encounter inline maps in the wild? — (RESOLVED: does not reopen D-01; the D-03 counter is surfaced)**
- *What we know:* zero of eight pinned production bundles carry one [VERIFIED this session]. Inline maps are overwhelmingly a *development* artifact; production bundlers default to external `.map`.
- *What is unclear:* the hit rate on the traffic a bug-bounty operator actually proxies — which includes staging, misconfigured production and internal tools, where inline maps are much more common.
- *Recommendation:* **this does not reopen D-01** — that is locked. But it materially raises the value of D-03's counter, which becomes the *measurement* of how much MAP-01 the phase is leaving on the table for Phase 8. The plan should surface that counter in the health/footprint surface rather than leaving it internal, and should say in `07-VERIFICATION.md` that a low recovered-source count on real traffic is an **expected** outcome, not a defect.
- **RESOLVED IN:** plan `07-05`, "Assumptions and open questions carried forward" — the expected-outcome statement is owed to `07-VERIFICATION.md` there; and plan `07-10`, which surfaces the D-03 counter in the health surface rather than leaving it internal. D-01 is NOT reopened.

**3. What is the aggregate source-count cap MAP-06 asks for? — (RESOLVED: derived from the probe's RSS curve as a ROW bound)**
- *What we know:* MAP-06 says "with depth and aggregate limits". D-13 settles depth (1). CONTEXT.md leaves the aggregate to the planner via the D-09 row accounting. 781 sources is real and legitimate, not pathological.
- *What is unclear:* the number.
- *Recommendation:* derive it from the probe's RSS curve, not from a preference — the aggregate cap and `MAP_MAX_BYTES` are two views of the same measurement. Express it as a **row** bound so Pitfall 2's fix and MAP-06's aggregate limit are the same constant.
- **RESOLVED IN:** plan `07-01`, "Artifacts this phase produces" — `SOURCE_ROWS_PER_MAP_MAX` is a new `thresholds.ts` constant with its own `POLICY_DERIVED_FROM` entry citing the probe artifact, so the aggregate cap and `MAP_MAX_BYTES` are two views of the same measurement. Consumed by plan `07-04`'s row accounting and plan `07-05`'s convergence inequality.

**4. Does `CONTRACT_VERSION` bumping break a running frontend mid-upgrade? — (RESOLVED: bumped 5 → 6)**
- *What we know:* it is 5 [VERIFIED: api/spec.ts:148] and exists precisely to prevent a stale frontend talking to a new backend.
- *What is unclear:* nothing structural — this is a routine bump, noted so it is not forgotten.
- *Recommendation:* bump it; the frontend's `client.ts` already handles the mismatch.
- **RESOLVED IN:** plan `07-06`, task 2 — `CONTRACT_VERSION` is bumped from 5 to 6, with `packages/frontend/src/api/client.spec.ts` asserted green against it in the same task's acceptance criteria.

---

## Sources

### Primary — code and artifacts read directly this session (HIGH confidence)

**Backend:** `hooks/admit.ts` (full), `hooks/admit.spec.ts` (structure), `ingest/consumer.ts` (full seam, lines 399–905), `store/schema.spec.ts` (headers + `EXPECTED_TABLES`/`COLUMN_ALLOWLIST`/`FORBIDDEN_COLUMNS`/`PERMITTED_DECLARED_TYPES`), `store/sql-discipline.spec.ts` (lines 1–520), `store/migrations.ts` (structure + step v5), `store/export.ts` (lines 1–180), `store/analyses.ts`, `store/retry.ts`, `store/reads.ts` (structure), `store/retention.ts` (structure), `store/settings.ts`, `store/audit.ts`, `telemetry.ts` (`Counters`), `filesystem-prohibition.spec.ts` (lines 1–330, 694–1310), `outbound-prohibition.spec.ts` (`SOURCE_ROOTS`), `scan/httpql-discipline.spec.ts` (header), `scan/filter.ts` + `filter.spec.ts` (the sibling-vocabulary precedent), `index.ts` (`api.register` sites, `retryAnalysis` handler), `api/spec.ts`, `lifecycle.ts` (epoch)

**Engine:** `thresholds.ts`, `thresholds.generated.ts`, `thresholds.spec.ts` (the convergence assertions), `contract.ts` (all eleven vocabularies + the two-vocabulary essay), `pipeline.ts` (`walk`, `WalkResult`, `visit`), `digest.ts`, `decode.ts`, `sanitise.ts` (caps)

**Frontend:** `safety/display.ts` (full API + the measured `forCell`/`forCellText` delta), `shims-virtual-scroller.d.ts`, `components/InventoryTable.vue` (the real `RecycleScroller` usage), `components/ArtifactsTable.vue`, `components/ScanHistoryList.vue` (the declined-virtualisation precedent), `externals.mjs`, `api/client.ts` (`RpcReason`)

**Build / CI:** `scripts/ci/check-bundle-imports.mjs` (full), `scripts/ci/frontend-externals.mjs`, `scripts/spike/instance.sh` (full), `scripts/spike/rss-sampler.sh` (full), `scripts/spike/ladder.sh`, `scripts/spike/probe-run.sh`, `scripts/phase1/fetch-caido.sh`, `scripts/phase1/env.sh`, `tier1/parse/src/index.ts` (the probe's operation set and `measured()`), `vitest.config.ts`, `eslint.config.js` (DET-03 + CORE-01 rules), `knip.json`, all four `package.json`

**Measurements:** `go-no-go.json` (every threshold + rationale), `SPIKE-06.json` (method, all `op_cost` rows, `parse_shape`, `nesting_depth`, `escalation_step`, verdict, notes), `SPIKE-07.json`, **`runs/20260820T121824Z-31596/raw/capabilities.json`** (the `atob` finding), `SPIKE-11.json`, `SPIKE-12.json` (all 22 fixtures), `spike-result.schema.json`, `.caido-bin/0.58.0/release.json`

**Executed this session:** `caido-cli --version` on all three builds; tail-byte scan of all eight corpus bundles; port enumeration over `scripts/`; `gsd-tools query package-legitimacy check`

### Primary — official documentation (MEDIUM–HIGH confidence)

- **`tc39.es/ecma426/`** — the Source Map format specification, fetched this session. Nullability of `sourcesContent` and `sources`; the `sections` shape and its non-nesting; `ignoreList`; the `)]}'` HTTP(S) prefix; the `^[@#]\s*sourceMappingURL=(\S*?)\s*$` comment pattern. All Pitfall 3/5/6 claims are `[CITED]` to this.
- **`@jridgewell/sourcemap-codec@1.5.5`** — API read from the installed `types/sourcemap-codec.d.mts` and `package.json` on disk, not from documentation.

### Secondary — this project's own prior research (MEDIUM confidence, provenance flagged)

- `.planning/research/STACK.md` — the sourcemap benchmark table and Appendix A. **Used only to establish the provenance of MAP-02's parenthetical (§O-04); none of its figures is carried forward as a Caido measurement.**
- `.planning/research/PITFALLS.md` §P3, `.planning/research/CODEX-CONTRAST.md` §471 — context, not evidence.

### Not consulted

No WebSearch was used for package selection. Context7 is not available in this environment; the one documentation lookup fell back to a direct fetch of the primary specification, which is the authoritative source for it.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Gate landscape (`schema`, `sql-discipline`, `filesystem-prohibition`, bundle allowlist) | **HIGH** | Every file read directly; every constant quoted with a line number |
| O-01, O-02, O-05, O-06, O-07, O-08 | **HIGH** | Each settled against shipped code with a working precedent quoted |
| O-04 (provenance) | **HIGH** | The harness is named verbatim in `STACK.md`'s own appendix |
| Decode primitives | **HIGH** | The raw capability artifact enumerates globals rather than testing a list |
| Sourcemap format claims | **MEDIUM–HIGH** | `[CITED]` to the primary spec, fetched this session, not read as raw spec text |
| Pitfall 2 (convergence) | **HIGH** on the arithmetic, **MEDIUM** on the recommended fix | The assertion and constants are verified; the fix is a reasoned design proposal that needs the planner's judgement |
| **O-03 (`MAP_MAX_BYTES`)** | **UNRESOLVED BY DESIGN** | A measurement. No substitute is offered and none should be accepted |
| A5 (Caido request retention) | **LOW** | Unmeasured; flagged in the Assumptions Log and Open Questions |

**Research date:** 2026-09-01
**Valid until:** ~2026-10-01 for the codebase findings (they go stale only when the files change). **The measured Phase 0 thresholds were all taken on Caido 0.57.1, which is unobtainable; the host now runs 0.58.0/0.58.2 and none has been re-measured.** Every threshold cited here inherits that caveat, which is exactly why D-10 requires Phase 7 to declare its own pinned version constant rather than reuse Phase 1's tripwire.

---

## RESEARCH COMPLETE

**Phase:** 07 — Sourcemap Reconstruction
**File:** `/Users/six2dez/Tools/DefMiner/.planning/phases/07-sourcemap-reconstruction/07-RESEARCH.md`
**Confidence:** HIGH on everything except the one item that is a measurement.

### Open items — seven settled, one is a probe

| Item | Verdict |
|------|---------|
| **O-01** transport/bound for `mappings` | **SETTLED.** No new transport. `PASSIVE_MAX_BYTES × 3/4 = 6,291,456 < 8 MiB` budget, by construction. Assert the inequality; refuse rather than truncate. The 8 MiB figure is a project **budget**, not a measured Caido ceiling — `export.ts:115` says so verbatim. |
| **O-02** no line structure | **SETTLED.** Split once on `\n`; apply R2 per line through `forCellText`, never `forCell` (measured 37,395 ms vs 4,010 ms scroll); add a third cap `SOURCE_LINE_MAX_GRAPHEMES` + `forSourceLine()`; mark the degradation under UI-09. Also corrects D-18: the precedent is `InventoryTable.vue`, not `ArtifactsTable.vue`. |
| **O-03** `MAP_MAX_BYTES` | **UNSETTLED — needs a probe.** Fully specified: target `.caido-bin/0.58.0/caido-cli` with its own `MAP_PROBE_EXPECTED_VERSION`; fresh instance per point; external RSS sampler at 50 ms correlated to `Date.now()` markers; fixed order; five operations including the three nobody has measured (`json_parse`, `b64_decode_*`, `announce_scan`); ladder topping out at the 6.29 MB structural ceiling; own results dir + schema + `tests/phase7-*.spec.ts`; ports 8941–8945. |
| **O-04** the 781/12.66 MB/21 ms figure | **SETTLED.** Measured in **standalone native quickjs-ng 0.16.1**, not Caido and not Node [`STACK.md:546`]. And under D-01 + `PASSIVE_MAX_BYTES` the case **cannot arise**. Strike it from SC1; amend the requirement's parenthetical. |
| **O-05** vocabulary for a refused derived artifact | **SETTLED — define a sibling.** `OPERATOR_CLAUSE_REJECTIONS` (`filter.ts:268`) is already the second, and its own comment names `REJECT_REASONS`'s idiom as its model. Eleven closed vocabularies ship today. Extending `REJECT_REASONS` would force a lying test case, corrupt the admission counters, and touch 06-11's proof. |
| **O-06** write-on-a-read-path vs `sql-discipline` | **SETTLED — YES, unchanged.** The gate models statement text, not call sites. `RETRY_ANALYSIS_SQL` (`retry.ts:103-109`) is a shipped, green precedent for the exact shape. Epoch convention: capture `pid` before the first `await`, put it in the `WHERE`, one statement. |
| **O-07** tombstone vs `scan_state` | **SETTLED — separate, and the project has done this before deliberately.** Four of the five mechanisms from `contract.ts:88-120` transfer; the fifth ("no surface renders both") breaks and is replaced by three layout/label rules. All four combinations of the two axes are reachable and meaningful. |
| **O-08** display-tree normalisation | **SETTLED.** Five pure steps; losslessness is structural (the normaliser has no write path — nodes carry `sourcesIndex`, never the string); **must not use `node:path`**, because SPIKE-12 measured `path.resolve` escaping on 5/22 fixtures and `path.normalize` silently rewriting RTL and trailing-whitespace forms. |

### Three findings the phase did not know it had

1. **No corpus bundle carries an inline map** — all three announcing bundles announce external `.map` files. Under D-01 the committed corpus yields zero recovered sources. D-15's fixtures must be built, and that work blocks the probe, MAP-05 and D-15 at once.
2. **D-09 breaks a shipped, mechanically-asserted convergence inequality** by up to 521×. Fix: advance `processedForSweep` by rows inserted rather than by 1 — which the shipped comment already describes as the interval's true semantic, and which satisfies D-09 without the per-map cap D-09 rejected.
3. **`visit` is synchronous and cannot `await`**, so D-08's stage belongs in `analyseAndFinish` after `walk()` returns, not literally at the `visit` seam. Related: `max_slice_ms` must take `max(walk, reconstruction)` or CORE-10's health number under-reports the real block.

### Ready for planning

Sequence the probe first — everything downstream (`MAP_MAX_BYTES`, the D-02 window, the D-14 size bound, MAP-06's aggregate limit) is derived from its result, and the fixture corpus it needs is the same corpus MAP-05 and D-15 need. That ordering is what turns CONTEXT.md's "the one thing that got bigger is the measurement" into a plan rather than an aspiration.








