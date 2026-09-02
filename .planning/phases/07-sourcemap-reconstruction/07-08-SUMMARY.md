---
phase: 07-sourcemap-reconstruction
plan: 08
subsystem: ui
tags:
  [
    vue,
    tailwind,
    vue-virtual-scroller,
    sourcemap-codec,
    vlq,
    sanitisation,
    content-addressing,
    accessibility,
  ]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-06's four-arm DeriveSourceResult / SourceMappingsResult union and the two lazy RPC call shapes the viewer and the strip send"
  - phase: 07-sourcemap-reconstruction
    provides: "07-07's forSourceLine / sourceLineTruncated, SOURCE_LINE_HEIGHT_PX and SOURCE_LINE_HEIGHT_CLASS, and SOURCE_PRODUCIBILITY_PRESENTATION's label set"
  - phase: 07-sourcemap-reconstruction
    provides: "07-03's codec relocation into packages/frontend and the D-17 backend ban this plan's exclusivity assertion makes meaningful"
  - phase: 07-sourcemap-reconstruction
    provides: "07-01's SOURCE_LINE_COUNT_MAX and its executable density inequality in thresholds.spec.ts"
  - phase: 05-workspace-operator-workflow
    provides: "safety/display.ts's copyToClipboard, export-download.ts's browserDownload, InventoryTable.vue's scroller invocation, EvidencePanel.spec.ts's subtree absolutes, hostile.fixture.ts's 4 MiB single-line case"
provides:
  - "SourceViewer.vue — the reading surface: four mutually exclusive body states, two independent bounds, and the save affordance"
  - "SourcePositionStrip.vue — MAP-03's readout, always present at h-12, lazy by contract, and the ONLY consumer of the position codec in the repository"
  - "source-filename.ts — SOURCE_EXTENSION_ALLOWLIST (frozen), SOURCE_EXTENSION_FALLBACK, sourceDownloadName: R6 closed by construction"
  - "table-contract.ts's formatTimestamp — one DefMiner-formatted date, so the tombstones did not become a third private copy"
  - "knip.json's frontend ignoreDependencies is GONE again — the codec entry removed in the same edit as the import"
affects: [07-09-drill-down, 07-10-manifest-export, phase-verification]

# Actuals (#2632). Reported on BOTH scales, and labelled, because the sibling
# summary in this phase (07-07) reports the first and the executor protocol
# names the second. Primary figure matches 07-07 so the two are comparable:
# chars/4 over the FULL TEXT of the 7 changed source files at HEAD (122,033
# chars; knip.json excluded as configuration). The realized-diff figure is
# 111,332 added chars => 27,833.
actuals:
  tokens: 30508
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A four-armed backend union mapped ONE-TO-ONE onto four render states, with the RpcResult failure kept as a separate axis so 'did the backend answer' can never be read as 'what did it find'"
    - "Closure by construction rather than by sanitisation: the download name's total output space over 43 measured hostile labels is 10 DefMiner literals, asserted as a set rather than searched for as a substring"
    - "Two scroller stubs, chosen per fixture size: a passthrough for per-row DOM assertions, a counting stub for the 500,000-line bound so a number is asserted without materialising half a million nodes"
    - "An exact-set walk of a whole source tree's import graph over FIVE specifier forms — import, export-from, type-position import(), dynamic import() and require() — to prove a dependency has exactly one consumer"

key-files:
  created:
    - packages/frontend/src/components/SourceViewer.vue
    - packages/frontend/src/components/SourceViewer.spec.ts
    - packages/frontend/src/components/SourcePositionStrip.vue
    - packages/frontend/src/components/SourcePositionStrip.spec.ts
    - packages/frontend/src/components/source-filename.ts
    - packages/frontend/src/components/source-filename.spec.ts
  modified:
    - packages/frontend/src/components/table-contract.ts
    - knip.json

key-decisions:
  - "P7-D08-1 — The no-line-structure state's condition is DERIVED, not chosen. It fires when the file has exactly one line AND that line is over the per-line cap, which is precisely what the copy's own last clause claims. A threshold in bytes would have been a fourth number nobody could defend; a one-line file of fifty bytes is a short file and correctly gets no marker."
  - "P7-D08-2 — `sourceDownloadName` returns `string | null` rather than throwing. It is called from a render path, so a throw would take the viewer down behind the source it was supposed to offer; and a best-effort name would be a name that does not match R6's pattern, which is the only thing the module promises. `null` means the save affordance is not offered at all — fail-closed."
  - "P7-D08-3 — The download's content type is `text/plain` ALWAYS and is never derived from the matched extension. The extension is cosmetic; the type is not. `text/html` on a recovered 'source' is a stored-XSS primitive on the operator's own machine, delivered by DefMiner."
  - "P7-D08-4 — The position sentence renders BOTH its numbers one-based. The sourcemap spec numbers generated lines and columns from zero and the gutter numbers from one; rendering the two halves of one sentence in two conventions is a defect the operator cannot see and cannot correct for. The decoded integers are held VERBATIM in state and the base shift happens in ONE named function. MAP-03's 'no arithmetic beyond the library's own output' is about DERIVING a position — DefMiner never interpolates, never computes an offset and never guesses."
  - "P7-D08-5 — Truncation takes PRECEDENCE over the position states on the strip. The strip is a fixed-height block that holds one sentence, and the more urgent thing to tell an operator looking at a cut line is that it is cut and how to get the rest. This is what makes the seven states mutually exclusive and each one's test able to assert the other six absent."
  - "P7-D08-6 — `copyFullLine` reuses `safety/display.ts`'s shipped `copyToClipboard` rather than declaring a fourth structural DOM host. That widens the named-import set from the display module to four names, so the equality now states what it proves out loud and adds an explicit assertion that every WALKING wrapper is absent."
  - "P7-D08-7 — The `unavailable` arm of `readSourceMappings` maps to the NO-TABLE sentence and not to the could-not-read one, on plan 07-06's explicit instruction: a sectioned map carries its mappings per section and genuinely has no top-level table."

patterns-established:
  - "Withholding proved structurally at the render boundary: the changed state's test asserts ZERO line rows in the subtree, not an empty string, because the arm has no content key to hide"
  - "A bound asserted on the derived item list rather than on the DOM, so a 500,000-row cap is a real assertion rather than an untestable one"
  - "Both halves of a defensive wrap driven: the throw that reaches the catch, AND the measured fact that the class of input everyone assumes reaches it does not"

requirements-completed: [MAP-03, MAP-04]

coverage:
  - id: D1
    description: "The four body states are mutually exclusive and no two are collapsible; each test asserts its own region present and the other three ABSENT"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#content — the virtualised line list, and NEITHER tombstone"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#gone — D-22's tombstone SENTENCE, and no line rows"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#changed — FAIL CLOSED: the subtree contains ZERO line rows"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#could not ask — the RPC failed, and it is NEVER a tombstone"
        status: pass
    human_judgment: false
  - id: D2
    description: "UI Considerations / source-viewer / error — the rule that outranks the table: a failed call is never a tombstone and the frontend never infers producibility"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#could not ask — the RPC failed, and it is NEVER a tombstone"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#maps the `unavailable` arm to the SAME could-not-ask copy"
        status: pass
    human_judgment: false
  - id: D3
    description: "UI Considerations / source-viewer / populated — the virtualised list at the fixed height, every code cell a TEXT NODE, item-size bound by identity, and the split run once"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#renders exactly one row per newline-separated line"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#renders each line's code as a TEXT NODE carrying forSourceLine's output"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#binds the scroller's item size to SOURCE_LINE_HEIGHT_PX BY IDENTITY"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#splits the content ONCE, at derivation time — never per render"
        status: pass
    human_judgment: false
  - id: D4
    description: "UI Considerations / source-viewer / partial — the two tombstones, each a sentence, each visibly marked, with the Changed case failing closed"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#gone — D-22's tombstone SENTENCE, and no line rows"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#changed — FAIL CLOSED: the subtree contains ZERO line rows"
        status: pass
    human_judgment: false
  - id: D5
    description: "UI Considerations / source-viewer / loading — the producing-this-source sentence, no skeleton and no spinner"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#renders the loading SENTENCE, never a skeleton and never a spinner"
        status: pass
    human_judgment: false
  - id: D6
    description: "UI Considerations / source-viewer / empty and zero-one-many — a zero-byte source renders zero rows, a stated count of zero, and neither tombstone; counts agree at 0, 1 and many"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#renders zero line rows, a stated count of zero, and NEITHER tombstone"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#agrees at 0, 1 and many — never a parenthesised plural"
        status: pass
    human_judgment: false
  - id: D7
    description: "UI Considerations / source-viewer / overflow — the 500,000-line cap renders exactly the cap and states the bound with two DefMiner-computed integers"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#renders exactly the cap and states the bound in DefMiner's integers"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#says nothing about a bound when the file is inside it"
        status: pass
    human_judgment: false
  - id: D8
    description: "UI Considerations / source-viewer / long-text — O-02 against the REAL 4 MiB single-line fixture: one row, capped at the per-line grapheme cap, both markers visible, no title and no data attribute carrying the value"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#is the real fixture, four megabytes on one line"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#renders ONE row, truncated, with a visible marker and no leak"
        status: pass
    human_judgment: true
    rationale: "The row is `backstop` in the UI contract and the SANITISATION, BOUNDING and INERTNESS halves are discharged mechanically here against the real fixture, inside the 5,000 ms freeze budget the shipped hostile backstop uses for the same value. The LAYOUT half — that the rendered row really is 24px and that a 4 MiB line did not grow it — is not assertable in jsdom, where every box is 0x0 because nothing was laid out. That half is owed by a browser-driven load spec, exactly as the three Phase 5 rows and 07-07's source-tree row before it."
  - id: D9
    description: "R6 (MAP-04) — no byte of a target string reaches a download filename; the name is 16 hex digits plus one of ten DefMiner literals, with a firing and a legal fixture"
    requirement: "MAP-04"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/source-filename.spec.ts#gives the traversal-shaped label a name with no path in it"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/source-filename.spec.ts#gives the legal label the allowlist's OWN literal, not the label's"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/source-filename.spec.ts#produces an output set of at most ten members, every one DefMiner's"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/source-filename.spec.ts#puts no 3-character run of the label into the DIGEST half"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#offers a save name that is DefMiner's, not the fixture's"
        status: pass
    human_judgment: false
  - id: D10
    description: "MAP-04/concurrency — the name is a pure function of the content digest and the matched extension, so two saves cannot read each other's label"
    requirement: "MAP-04"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/source-filename.spec.ts#gives two different sources two different names, reading neither label"
        status: pass
    human_judgment: false
  - id: D11
    description: "MAP-03 — the seven position-strip states, each its own copy row, with unmapped and no-table asserted to be DIFFERENT sentences and the FIRST segment shown with a count of further positions"
    requirement: "MAP-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#3. mapped — the FIRST segment, with the further-positions clause"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#3b. mapped once — the sentence alone, no further-positions clause"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#4. unmapped — a DIFFERENT sentence from the no-table one"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#5. no position table — its own sentence, never the unmapped one"
        status: pass
    human_judgment: false
  - id: D12
    description: "UI Considerations / viewer-position-strip / empty, loading and overflow — always present at h-12 with the discovery line, the reading line on first selection, and pre-formatted overflow-hidden geometry"
    requirement: "MAP-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#1. no line selected — the discovery line, at the fixed height"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#2. selected, table not yet read — the reading line"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#keeps the strip present at its fixed height in EVERY body state"
        status: pass
    human_judgment: false
  - id: D13
    description: "The position data is LAZY by contract — 0 calls after mount, 0 after a scroll, 1 after the first line selection, with the viewer fully usable in between"
    requirement: "MAP-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#is not read on mount, not read on scroll, read on the FIRST selection"
        status: pass
    human_judgment: false
  - id: D14
    description: "UI Considerations / viewer-position-strip / error — a decode throw degrades THIS STRIP AND NOTHING ELSE; the line rows survive and no unhandled rejection is raised"
    requirement: "MAP-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#survives a mappings value the contract's `string` does not describe"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#leaves every line row on screen and raises no unhandled rejection"
        status: pass
    human_judgment: false
  - id: D15
    description: "MAP-03/encoding and UI Considerations / viewer-position-strip / long-text — the mappings string is decoded to integers and never enters the DOM, in any form"
    requirement: "MAP-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#puts no 8-character run of it in any text, title, data or style"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#records that a garbage STRING does not throw — measured, not assumed"
        status: pass
    human_judgment: false
  - id: D16
    description: "D-17's other half — the codec has EXACTLY ONE consumer in the frontend source tree, asserted as a set over five specifier forms, and only the decoder is imported"
    requirement: "MAP-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#is imported by SourcePositionStrip.vue and by nothing else"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#imports EXACTLY the decoder from it — never the encoder"
        status: pass
      - kind: other
        ref: "knip RED demonstration — exit 1 with `Unused dependencies (1) @jridgewell/sourcemap-codec` once the import is removed (recorded below)"
        status: pass
    human_judgment: false
  - id: D17
    description: "D-19 and the form-control ban — SourceViewer.vue's module-specifier set is an exact equality containing neither the slicing component nor any form-control module, and its display imports contain no walking wrapper"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#has EXACTLY this module-specifier set"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#imports EXACTLY the text-only wrapper family from the display module"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#parsed a NON-EMPTY script block — the non-vacuity half"
        status: pass
    human_judgment: false
  - id: D18
    description: "O-07 mechanism 5's replacement, requirement 3 — the degraded producibility state is a SENTENCE, not a badge, and the subtree carries no badge marker"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#is longer than every label in the producibility presentation map"
        status: pass
    human_judgment: false
  - id: D19
    description: "R2's absolute at the line level — Copy full line writes the FULL line to the clipboard while the DOM holds only the capped prefix"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceViewer.spec.ts#writes the FULL untruncated line while the DOM holds only the prefix"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourcePositionStrip.spec.ts#7. the line is truncated — the notice plus Copy full line"
        status: pass
    human_judgment: false

duration: 34 min
completed: 2026-09-02
status: complete
---

# Phase 7 Plan 08: The Source Viewer, the Position Strip and the Filename Sink Summary

**Four render states mapped one-to-one onto four backend arms so a call that did not answer can never be painted as a permanent tombstone; a 4 MiB single line that renders as one bounded, marked row; a download name whose entire output space over 43 measured hostile labels is ten DefMiner literals; and the position codec's one and only consumer, asserted as a set over the whole frontend source tree.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-09-02T01:52Z
- **Completed:** 2026-09-02T02:26Z
- **Tasks:** 3 of 3
- **Files modified:** 9 (6 created, 3 modified — 8 source/config, 1 planning)

## Task Commits

1. **Task 1 (TRACER, RED):** `19d7861` — `test(07-08): add the failing tracer spec for the source viewer`
2. **Task 1 (TRACER, GREEN):** `db7389d` — `feat(07-08): the tracer — one recovered source's bytes as virtualised rows`
3. **Task 2:** `e2519db` — `feat(07-08): four body states, two bounds, and a content-addressed filename`
4. **Task 3:** `c552171` — `feat(07-08): the position strip, and the codec's one consumer`

## The four body states, as shipped, with their copy

Mutually exclusive by construction: one `Body` value, not a chain of flags, so a spec can assert the other three regions ABSENT rather than merely assert its own present. That absence half is the half that catches a regression.

| State | Reached from | Marker | Copy as rendered |
| --- | --- | --- | --- |
| **Content** | `{ outcome: "content" }` | `data-defminer-source-viewer-content` | the virtualised line list, plus the stated line count and the notices block |
| **Gone** | `{ outcome: "gone" }` | `data-defminer-source-viewer-gone` | *Recovered 2026-02-14 09:30:15. The response this source came from is no longer in Caido's history, so DefMiner can no longer produce its content. Its name, its size and its content hash are kept — that this file existed on this target is evidence on its own.* |
| **Changed** | `{ outcome: "changed" }` | `data-defminer-source-viewer-changed` | *Recovered 2026-02-14 09:30:15. The response this source came from still exists, but its bytes no longer match the bundle DefMiner recovered from — the target has redeployed. DefMiner will not show you source it cannot attribute to the bundle it came from, so the content is withheld. The recovered name, size and content hash are kept.* |
| **Could not ask** | `{ outcome: "unavailable" }` **or** an `RpcResult` failure | `data-defminer-source-viewer-rpc-failed` | *Could not produce this source.* / *The DefMiner backend did not answer. This source has NOT been marked unavailable — DefMiner does not conclude a file is gone from a call that never returned.* — with **Retry** and **Open Health** |

Two further render states exist and are not among the four, because they are not outcomes: **idle** (nothing selected — *Select a line to see where it appears…*'s sibling, *Select a source to read it.*) and **loading** (*Producing this source from the original response…*, a sentence, with no skeleton row and no element carrying a progressbar role).

**The rule that outranks the table is in the file as a comment and as two tests.** The mapping is one-to-one and derives nothing: `gone` and `changed` are reached only because the backend said so, and both an `RpcResult` failure and the `unavailable` arm reach the copy that claims nothing durable. The could-not-ask test asserts the *has NOT been marked unavailable* sentence is present AND that no `data-defminer-source-producibility` or `data-defminer-status-badge` node exists anywhere in the subtree.

**Changed fails closed structurally.** Its test asserts the rendered subtree contains ZERO `data-defminer-source-line` and ZERO `data-defminer-source-code` nodes — not that a string is empty. The arm has no `content` key at all (plan 07-06), so there is nothing in this component to forget to hide.

**The fifth state is recorded in the component header so nobody looks for it here.** A map that was refused, truncated or malformed produces no source rows at all — D-11's `scan_state = 'partial'` with its redacted error — which is the TREE's empty state and whose reason lives in the `EvidencePanel` at the artifact level.

## The O-02 render observation, on the real 4 MiB fixture

Driven through the REAL component against `HOSTILE_CASES`'s `multi-megabyte-single-line` (4,194,304 characters, no newline), with the fixture's identity asserted first so the scan cannot be vacuous.

| Observation | Result |
| --- | --- |
| Rows rendered | **1**, and the scroller's `items` length is 1 |
| `item-size` | `SOURCE_LINE_HEIGHT_PX` by identity — nothing about the scroller changes |
| Rendered code length | **1,024 graphemes**, `≤ SOURCE_LINE_MAX_GRAPHEMES`, counted by spread rather than by `.length` |
| Per-row marker | `…truncated` present inside the row |
| O-02 marker | *This file has no line structure — it is one line of 4,194,304 bytes. It is minified code that the map declared as a source. The line is truncated at 1,024 characters.* |
| `title` anywhere in the subtree | **none** — collected as an offender list and asserted `toEqual([])` |
| `data-*` carrying the value | none exceeds the per-line cap and none contains a 64-character run of the payload |
| Elapsed, mount to assertions | **well under the 5,000 ms budget** the shipped hostile backstop uses for this same value |
| Save name offered | `9f2c4a17be0d3e5c.txt` from a traversal-shaped label — no `/etc/` in the helper line |

The measured argument this discharges: `display.ts:110-121` records **99 of 396 frames over the 32 ms budget, max 442 ms, scroll 37,395 ms** through `forCell` on exactly this value, against **0 of 396, max 23.8 ms, scroll 4,010 ms** through the text-only family. The mechanism that keeps this component on the right side of that number is the named-import equality, below.

## The generated filename for the firing fixture

The firing fixture is `SOURCES_LABEL_CASES`'s `relative-traversal` — SPIKE-12 #1, `../../../../../../etc/defminer-escape.txt`. The legal fixture is `benign-control`, `src/app/index.js`.

```
digest   9f2c4a17be0d3e5c8a1b6d4f70e29c3a5b8d1f4e7c0a3b6d9e2f5a8c1b4d7e0f

FIRING   ../../../../../../etc/defminer-escape.txt  ->  9f2c4a17be0d3e5c.txt
LEGAL    src/app/index.js                           ->  9f2c4a17be0d3e5c.js
```

Every generated name matches `^[0-9a-f]{16}\.(ts|tsx|js|jsx|vue|css|scss|json|md|txt)$`, and the firing case is additionally asserted to contain no `/`, no `..` and no `etc`.

**The substring assertion is stated in its honest form, and the reason is worth reading.** The acceptance criterion asks that the output contain no 3-character substring of the input label. That cannot be true of the WHOLE name: a label ending `.txt` shares those bytes with the fallback extension *by definition*, and it shares them because DefMiner chose the literal — not because the label was copied. So the substring claim is made over the DIGEST HALF, where it has content, and it is made as the equivalent intersection (no 3-run **of the digest half** appears in the label) so the 4 MiB label costs fourteen `includes` calls rather than four million assertions.

**The extension half is proved by something stronger than any substring search.** Over all 23 `SOURCES_LABEL_CASES`, all 20 `HOSTILE_CASES` and the `null` label — 44 inputs including the NUL byte, the RTL override, the fullwidth full stops, the UNC path, `CON`, `NUL.js` and the 4 MiB value — the set of distinct outputs is asserted to be a subset of the ten names `{digest16 + e : e ∈ allowlist ∪ {fallback}}`. The label's total influence on the filename is a choice among DefMiner's own literals, and there is nowhere for a byte of it to be.

The digest is validated (`^[0-9a-f]{64}$`) rather than trusted, and a digest that fails yields `null` — no save affordance is offered at all. That is P7-D08-2 and it is fail-closed on a render path.

## The seven position-strip states, as shipped

| # | State | Copy as rendered |
| --- | --- | --- |
| 1 | No line selected | *Select a line to see where it appears in the minified bundle.* |
| 2 | Selected, table not yet read | *Reading positions…* |
| 3 | Selected and mapped | *Line 5 appears at line 1, column 1 of the minified bundle.* + *and at 1 other position.* |
| 3b | Selected and mapped once | *Line 10 appears at line 4, column 1 of the minified bundle.* — no clause |
| 4 | Selected and unmapped | *This line has no position in the bundle's mappings.* |
| 5 | Map carries no position table | *This map carries no position table.* |
| 6 | The table could not be read | *DefMiner could not read this map's position table. The source above is unaffected.* |
| 7 | The line is truncated | *Line 1 truncated at 1,024 of 4,194,304 characters.* + **Copy full line** |

Each state's test asserts its own phrase present and the other six ABSENT, driven off one `COPY` record so a state added later has nowhere to hide. **States 4 and 5 are asserted to be different strings**, because "this line has no entry in the table" and "this map has no table" are different facts and an operator told the second when the first is true goes looking for a build problem that is not there.

**The further-positions clause uses `counted`, not the copy table's bare plural.** The table's row reads *and at {k} other positions.*, which renders "1 other positions" at k=1 — the exact shape the rule that outranks that table forbids ("never 1 source(s)", singular/plural agreement required). The clause is DefMiner-authored either way; agreement is not optional.

**Ordering and precision, as MAP-03 asks.** Segments are consumed in the order the library returns them — generated lines ascending, segments within a line in their own order — and the position kept for a source line is THE FIRST one seen, which is what the copy claims. A segment naming a different `sources` index is skipped; the fixture includes one (generated line 4, source index 3) precisely so the filter is exercised. `count` is retained, `count - 1` is rendered as "further", and no segment array is kept, so nothing in the strip's state grows with the map.

**The mappings fixture is a LITERAL, and that is deliberate.** It is `encode(...)`'s output over a hand-written segment table, pasted in with the table in a comment — because a spec that imported `encode` to build a fixture would quietly make its own exclusivity assertion false.

## The decode wrap, and what actually reaches it

The plan asked for a malformed position string to drive the catch. **Measured, the shipped codec contains no `throw` of its own.** `@jridgewell/sourcemap-codec@1.5.5`'s `dist/` has zero throw sites; it is total over garbage STRINGS, returning nonsense integers rather than raising:

```
decode("!!!!")                      -> [[[0,0,0,0]]]
decode(";;;;;;;;;;")                -> [[],[],[],[],[],[],[],[],[],[],[]]
decode("zzzzzzzzzzzzzzzzzzzzzzzzzz")-> [[[-2147483647]]]
decode("@@@@@@@@")                  -> [[[0,0,0,0,0],[0,0,0,0]]]
```

**What does reach the catch is the RPC boundary**, which is where the risk actually is: the renderer receives whatever QuickJS serialised, and the contract's `mappings: string` is a compile-time claim about a runtime value.

```
decode(null)      -> TypeError: Cannot destructure property 'length' of 'mappings' as it is null.
decode(undefined) -> TypeError: Cannot destructure property 'length' of 'mappings' as it is undefined.
decode(42)        -> TypeError: buffer.indexOf is not a function
```

So **both halves are driven**: a `{ outcome: "mappings", mappings: null }` payload exercises the real catch and renders state 6, and the garbage-string corpus is asserted separately as the measured fact — each decodes without raising, the strip still renders, and none of them puts a byte of itself on screen. Through the viewer, after the throw, all four line rows are still present, the first still reads `const a = 1;`, and `process.on("unhandledRejection", …)` collects nothing.

## The exact-set import assertions, as shipped

### `SourceViewer.vue` — the module-specifier set

Collected over four forms — `import`, `export … from`, dynamic `import()` and `require()` — so an equality over a set that counted only static imports would not be an equality over a hole.

```ts
expect(parse().specifiers).toEqual([
  "../api/client",
  "../safety/display",
  "./SourcePositionStrip.vue",
  "./export-download",
  "./source-filename",
  "./table-contract",
  "@defminer/engine/contract",
  "@defminer/engine/sanitise",
  "@defminer/engine/thresholds",
  "vue",
  "vue-virtual-scroller",
]);
expect(parse().visited).toBeGreaterThan(200);   // non-vacuity
```

Neither `safety/HighlightSlices.vue` nor any form-control module is in it. D-19 means the viewer has no slicing path at all, and no Phase 7 surface mounts a form control.

### `SourceViewer.vue` — the named imports from the display module

```ts
expect(parse().namesFromDisplay).toEqual([
  "copyToClipboard",
  "forCellText",
  "forSourceLine",
  "sourceLineTruncated",
]);
for (const walking of ["forCell", "forDisplay", "forPanel", "forEvidence"]) {
  expect(parse().namesFromDisplay).not.toContain(walking);
}
```

`copyToClipboard` is not a wrapper — it is the sanctioned escape R2's absolute names, and reusing it is why this file declares no structural DOM host of its own (P7-D08-6). The equality therefore states what it proves out loud with an explicit second assertion: every WALKING wrapper is absent, which is the T-07-12 mitigation.

### `SourcePositionStrip.vue` — the codec's one consumer, over the whole tree

A recursive walk of `packages/frontend/src` over every `.ts` and `.vue` file, collecting **five** specifier forms (the four above plus a TYPE-position `import("…")`):

```ts
expect(consumers).toEqual([
  "packages/frontend/src/components/SourcePositionStrip.vue",
]);
expect(scanned.length).toBeGreaterThan(40);      // non-vacuity
```

plus an assertion that only the DECODER is imported — `encode` has no consumer here and never will, because DefMiner reads maps and writes none.

## The knip debt, discharged in the same edit — with its RED demonstration

`knip.json`'s frontend `ignoreDependencies: ["@jridgewell/sourcemap-codec"]` carried plan 07-03's note: *"REMOVE THIS ENTRY WHEN 07-08's VIEWER IMPORTS THE CODEC, in the same edit."* It is gone, in commit `c552171`, alongside the import. `pnpm knip` exits 0.

**And the removal is meaningful rather than cosmetic, demonstrated rather than asserted.** With the entry removed and the import replaced by a scratch local stub, `pnpm knip` exits 1:

```
Unused dependencies (1)
@jridgewell/sourcemap-codec  packages/frontend/package.json:14:6
```

Restored, it exits 0. The scratch edit was reverted; `git diff` over the file is clean. That is the fourth time this file's "remove when the import lands" contract has been honoured, which is the only reason such notes are credible in it.

The root devDependency is NOT removed and must not be: `tier1/parse/src/index.ts` is the SPIKE-06 probe and knip treats `tier1/*/src/index.ts` as a root-workspace entry point.

## Deviations from Plan

### 1. [Rule 3 — blocking] The decode-throw fixture had to be a boundary value, not a malformed string

- **Found during:** Task 3
- **Issue:** The plan's acceptance criterion reads *"Assert with a deliberately malformed position string that the line rows are still present after the throw."* Under the shipped codec that criterion is unsatisfiable as written: `@jridgewell/sourcemap-codec@1.5.5` has **no `throw` in its `dist/` at all** and is total over garbage strings. A test built on a malformed string would have driven the happy path while claiming to drive the catch — a wrap nobody has seen fail.
- **Fix:** The catch is driven by the RPC BOUNDARY instead, which is where the risk actually is: `{ outcome: "mappings", mappings: null }` makes `decode` throw a real `TypeError`, and the contract's `string` is a compile-time claim about a value QuickJS serialised. The malformed-string case is kept as its own separate test asserting the MEASURED fact — five garbage shapes, none raising, none leaking a byte on screen. Both halves are now recorded rather than one being assumed.
- **Files modified:** `packages/frontend/src/components/SourcePositionStrip.spec.ts`, `packages/frontend/src/components/SourceViewer.spec.ts`
- **Commit:** `c552171`

### 2. [Rule 2 — missing critical] `formatTimestamp` was EXPORTED rather than copied a third time

- **Found during:** Task 2
- **Issue:** Both tombstone sentences interpolate a DefMiner-formatted date. `ArtifactsTable.vue:98` and `ObservationsTable.vue:68` each already carry a private, byte-identical one-line copy of that format. Writing a third is exactly the defect 07-07's P7-D07-3 was penalised for: copies of one thing stop matching the moment either is edited, and a timezone is a thing a reader would never notice had drifted.
- **Fix:** One exported `formatTimestamp(ms)` in `components/table-contract.ts`, used by the viewer. The two PRE-EXISTING copies were NOT rewritten — they are outside this plan's `files_modified` and neither is reachable from any 07-08 module — but nothing new copies the line, so the duplication stopped growing here. Recorded in `deferred-items.md` with a suggested owner.
- **Files modified:** `packages/frontend/src/components/table-contract.ts`
- **Commit:** `e2519db`

### 3. [Rule 2 — missing critical] The clipboard write reuses the shipped helper, widening the named-import set

- **Found during:** Task 3
- **Issue:** `Copy full line` needs a clipboard. Declaring a structural DOM host inside the SFC hit `no-undef` on `globalThis` under the `.vue` lint config, and would in any case have been a fourth copy of a host `safety/display.ts` and `export-download.ts` already declare. But `safety/display.ts` already ships `copyToClipboard`, and importing it widens the named-import set the plan pins to the text-only wrapper family.
- **Fix:** Reuse `copyToClipboard`, and make the equality say what it proves rather than merely be short: the set is now the four names, AND there is an explicit assertion that `forCell`, `forDisplay`, `forPanel` and `forEvidence` are all absent. `copyToClipboard` is the R2 absolute's own sanctioned escape — it deliberately has no `document.execCommand` fallback, because that path copies by putting the full value INTO the document.
- **Note on the swallowed rejection:** `copyFullLine` calls `.catch(() => undefined)` and the reason is stated at the call site rather than assumed. The helper rejects only on a host with no async clipboard API, which the Caido renderer is not; copying nothing is the fail-closed direction, and an unhandled rejection there would take down the very viewer the strip's own wrap exists to keep on screen.
- **Files modified:** `packages/frontend/src/components/SourceViewer.vue`, `packages/frontend/src/components/SourceViewer.spec.ts`
- **Commit:** `c552171`

### 4. [Rule 2 — missing critical] An `idle` state the plan did not name

- **Found during:** Task 1
- **Issue:** The plan enumerates four body states, all of which are outcomes of a derivation. A viewer mounted before the operator has selected a source has no outcome to render, and 07-09 mounts it in exactly that condition.
- **Fix:** A fifth render state, `idle`, with one DefMiner-authored line — *Select a source to read it.* — the sibling of the strip's discovery line. It is not one of the four body states and is not counted as one; the four-state tests assert their own region present and the other three absent, and `idle` reaches none of them.
- **Files modified:** `packages/frontend/src/components/SourceViewer.vue`
- **Commit:** `db7389d`

**Total deviations:** 4 auto-fixed (3 × Rule 2 missing-critical, 1 × Rule 3 blocking). **Impact:** none on the plan's prohibitions or must-haves. No architectural change and no Rule 4 escalation. Deviation 3 is the only one that changes an assertion the plan specified, and it strengthens it.

## Planner assumptions carried forward

**U7-7 — the download-extension allowlist membership — ships under its stated default and is NOT promoted.** What is binding is implemented and asserted: the list is CLOSED, DefMiner-authored, frozen, MATCHED rather than derived, and the generated name is checked against an exact pattern with a firing and a legal fixture. The nine members plus the `.txt` fallback are a PROPOSAL. If a real target's maps declare sources with an extension outside the list, they fall back to `.txt` — the fail-closed direction — and the list is one edit in one place.

**P7-D08-4 (the one-based position sentence) is the one place a decoded integer is transformed**, and it is stated at the declaration rather than left for a reader to discover. Anyone who concludes that MAP-03/precision means "render the zero-based integers verbatim, even beside a one-based gutter" is changing one function and one pair of expected strings.

## Authentication Gates

None.

## Known Stubs

None. Every state renders from real data, every state has a real path into it, and no copy constant is a placeholder. The two components are not yet MOUNTED — plan 07-09's drill-down shell is their only entry point — which is a wiring gap the plan declares, not a stub: both are complete, exercised through their real props against real result arms, and 07-09's tracer mounts them for real rather than against a stub.

## Threat Flags

None. Every trust boundary this plan crosses was already in its `<threat_model>`, and each disposition is discharged:

| Threat | Discharge |
| --- | --- |
| T-07-07 (markup in recovered source) | Every code cell asserted to have NO element child and only text-node children; `vue/no-v-html` at error with `noInlineConfig`; no highlighter and no slicing component in the module-specifier equality |
| T-07-12 (a 4 MiB line walked by the wrong wrapper) | Named-import set pinned, with every walking wrapper asserted absent by name; the 4 MiB case renders one row inside the freeze budget |
| T-07-01 (a `sources` label reaching a filename) | Closed by construction; output set over 44 measured labels bounded by ten DefMiner literals; exact pattern, firing and legal fixtures |
| T-07-11 (the raw position string reaching the DOM) | No 8-character run of an 81-character fixture in any text, HTML, `title`, `style`, `href`, `src` or `data-*`, with the non-vacuity check on the fixture's length |
| T-07-41 (an uncaught decode throw) | The decode is wrapped; the boundary value that really throws is driven; the line rows survive and no unhandled rejection is raised |
| T-07-13 (a failed call rendered as a tombstone) | One-to-one arm mapping; the could-not-ask copy states it out loud; no producibility or status-badge marker exists in that subtree |
| T-07-42 (an untruncated line in a `title` or `data-*`) | Offender lists asserted `toEqual([])` over the whole rendered subtree on the 4 MiB case; `Copy full line` writes to the clipboard and the DOM holds only the 1,024-grapheme prefix |
| T-07-44 (hostile bytes in a form control) | No form-control module in the module-specifier equality; every row is a native `<button>` with no value binding |
| T-07-SC (package installs) | **Nothing installed.** `pnpm knip`, `pnpm check:bundle` and `pnpm check:externals` all green |

## Issues Encountered

**The two new components are not yet in the shipped bundle, and the build size says so honestly.** `dist/index.js` is **412.32 kB / gzip 82.27 kB**, byte-identical to the figure 07-07 recorded. Nothing reachable from `src/index.ts` imports `SourceViewer.vue` yet — plan 07-09's drill-down is its only entry point — so Rollup tree-shakes both SFCs and the codec out of the artifact entirely. This is expected and is worth stating rather than leaving as a puzzle: `pnpm check:externals` and `pnpm check:bundle` are therefore not yet exercising the codec, and 07-09 is the plan whose build first will. `pnpm knip` analyses SOURCE rather than the bundle, which is why the `ignoreDependencies` removal is correct today and why its RED demonstration above is the honest proof.

**`pnpm --filter @defminer/frontend typecheck` (vue-tsc) still reports the 5 PRE-EXISTING errors** in `ExportDialog.vue` and `SettingsPanel.vue` that 07-07 recorded. This plan adds none — its three new modules are clean — and the repo gate is `pnpm typecheck` (`tsc --build`), which is green. Unchanged in `deferred-items.md`.

## Verification

| Gate | Result |
| --- | --- |
| `pnpm exec caido-dev build packages` | Built; `index.js` 412.32 kB / gzip 82.27 kB, `index.css` 12.81 kB |
| `pnpm test` | **87 files, 4,061 tests, all passing** (84 files / 4,008 at the start of the plan) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 — and exit **1** with the codec import removed, demonstrated |
| `pnpm check:bundle` | 2 specifiers — `crypto`, `string_decoder` — both on the DIST-05 allowlist, unchanged |
| `pnpm check:externals` | 1 bare specifier, `vue`; no new external |
| `pnpm check:css` | 142 rules checked against `#plugin--defminer` |
| `pnpm vitest run scripts/ci/lint-r1.spec.ts` | 6 passed |
| All 13 `## UI Considerations` rows have an assertion | Yes — coverage block D1–D19 above |
| Exact-set import assertions, non-vacuous | Three of them; each carries its own non-vacuity check |
| The 4 MiB backstop against the real fixture | Driven, with the fixture's identity asserted first |

**+53 tests, and three of them arrived without being written.** `frontend-safety.spec.ts:791`'s `it.each(files)("%s obeys every R1 and R2 rule")` enumerates the frontend source tree, so the three new modules were picked up by the shipped per-file R1/R2 gate automatically and pass it. 50 tests were authored here; 3 are the gate widening itself.

## Requirements

**`MAP-03` and `MAP-04` are ticked. `UI-05` is deliberately NOT.**

`gsd-tools requirements ready-ids` returns `{ ready: [MAP-03, MAP-04], blocked: [UI-05] }` for this plan, which is the correct answer on all three counts:

- **MAP-03** was declared by 07-03 and 07-08 only. 07-03 relocated the codec into the frontend and stood up D-17's package-level ban; 07-08 is the one consumer, decoding positions where attribution is genuinely needed and nowhere else. Both declaring plans have shipped, and the exclusivity that makes the requirement's "only where genuinely needed" clause mechanical is asserted here.
- **MAP-04** was declared by 07-03, 07-07 and 07-08. 07-03's `filesystem-prohibition.spec.ts` proves no `sources` value reaches a path-like sink on the backend, 07-07's normaliser keeps the label lossless and out of `node:path`, and `source-filename.ts` closes the one sink neither could see. All three have shipped.
- **UI-05** is shared with **07-09 (the drill-down shell) and 07-10 (the manifest CTA)**, neither of which has shipped. It stays unticked, exactly as 07-06 and 07-07 left it, and exactly as the premature ticks that had to be reverted twice earlier in this phase should have been left.

`REQUIREMENTS.md`'s machine-owned `BEGIN DERIVED RESIDUAL` / `END DERIVED RESIDUAL` span is byte-unchanged by this plan's edit, and `outbound-prohibition.spec.ts` was re-run after it.

## Next Phase Readiness

**Ready for 07-09 (the drill-down shell).** It inherits, shipped and asserted:

- `SourceViewer.vue`, taking `client` / `sourceRef` / `label` and emitting `open-health`. It owns its own derivation, its own retry and its own selection, so the shell wires three props and one event.
- `SourcePositionStrip.vue`, mounted by the viewer and needing nothing from the shell.
- `source-filename.ts`, whose `sourceDownloadName` is the only route to a download name on this surface.
- `table-contract.ts`'s `formatTimestamp`, if the drill-down header needs a date.

Two things 07-09 owes that this plan could not:

1. **O-07 mechanism 5's replacement, requirements 1 and 2.** Requirement 3 — the degraded state is a SENTENCE, not a badge — is settled here and asserted. Requirements 1 and 2 are about two REGIONS on screen at once and can only be asserted over the fully rendered drill-down.
2. **The bundle.** Both components are tree-shaken out today because nothing reachable from `src/index.ts` imports them. 07-09's build is the first that will carry the codec, and its `check:externals` / `check:bundle` run is the first that means anything about it.

## Self-Check: PASSED

All six created files exist on disk:

```
FOUND: packages/frontend/src/components/SourceViewer.vue
FOUND: packages/frontend/src/components/SourceViewer.spec.ts
FOUND: packages/frontend/src/components/SourcePositionStrip.vue
FOUND: packages/frontend/src/components/SourcePositionStrip.spec.ts
FOUND: packages/frontend/src/components/source-filename.ts
FOUND: packages/frontend/src/components/source-filename.spec.ts
```

All four task commits exist in `git log`:

```
FOUND: 19d7861  test(07-08): add the failing tracer spec for the source viewer
FOUND: db7389d  feat(07-08): the tracer — one recovered source's bytes as virtualised rows
FOUND: e2519db  feat(07-08): four body states, two bounds, and a content-addressed filename
FOUND: c552171  feat(07-08): the position strip, and the codec's one consumer
```

Every task's `<acceptance_criteria>` was re-run and passes. The plan-level `<verification>` was re-run at the end of the plan and is recorded in the table above.
