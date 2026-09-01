---
phase: 07-sourcemap-reconstruction
plan: 02
subsystem: testing
tags: [sourcemap, parser, base64, json-parse, redos, ast-gate, engine, hostile-fixtures]

requires:
  - phase: 00-runtime-reality-check
    provides: "SPIKE-01's measured ReDoS verdict (no interrupt, SIGKILL the only teardown), SPIKE-06's 710-bracket / 246-paren stack boundaries and its `catchable-stack-throw` failure class, SPIKE-07's finding that TextDecoder does not exist on this runtime"
  - phase: 01-skeleton-persistence-compatibility
    provides: "packages/engine's SDK-free construction and its four enforcement mechanisms, decode.ts's two-implementation cross-check idiom and DecodeDivergence, admit.ts's REJECT_REASONS closed-vocabulary idiom and its no-decode / no-regex prohibition header"
  - phase: 05-frontend
    provides: "hostile.fixture.ts's assert-the-id-array-IN-FULL doctrine and sanitise.spec.ts's `exercised` Set idiom"
  - phase: 06-retroactive-scan-deployment-reality
    provides: "filter.ts's OPERATOR_CLAUSE_REJECTIONS shape and filter.spec.ts's every-reason-has-a-case gate; filesystem-prohibition.spec.ts's pure `auditSource(file, source)` AST walk and its argument for a walk over a substring scan"
  - phase: 07-sourcemap-reconstruction
    provides: "plan 07-01's MAP_MAX_BYTES = 2,621,440, SOURCEMAP_TAIL_WINDOW_BYTES, SOURCE_ROWS_PER_MAP_MAX, the 13-case HOSTILE_MAP_CASES corpus, sizeBoundaryCases(ceiling), and the measured announce_scan / atob-vs-Buffer findings this plan acts on"
provides:
  - "packages/engine/src/sourcemap/announce.ts — findAnnouncement over a bounded tail window, by lastIndexOf and startsWith only, with the A2 prefilter TAKEN"
  - "packages/engine/src/sourcemap/parse.ts — B64_PREFIXES, decodeInlineMap, parseSourceMap, the closed MAP_PARSE_REASONS vocabulary and reasonForParseError"
  - "packages/engine/src/decode.ts — decodeBase64, the one correct base64+UTF-8 step, with Pitfall 4's argument in its doc comment"
  - "The no-pattern property proven STRUCTURALLY over BOTH modules by a TypeScript-AST walk with a non-vacuity assertion, watched RED against a planted literal"
  - "A differential proof that the prefilter's fast path is EQUIVALENT to the two-full-scan reference, over 15 bodies at 5 window widths"
  - "The MAP-05 hostile matrix: 13 fixtures, 13 distinct outcomes, the id set asserted in full and watched red on deletion"
  - "sizeBoundaryCases(MAP_MAX_BYTES) exercised at the REAL ceiling — closing 07-01's open WINDOW 109"
affects: [07-03, 07-04, 07-05, 07-07, 07-08, 07-10]

actuals:
  tokens: 20136
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "A PREFILTER whose fast path is proven EQUIVALENT to the naive reference by a differential assertion over every fixture, rather than by the cases somebody thought to write"
    - "A bounded window applied as an OFFSET TEST rather than as a slice, so a backwards search never allocates a multi-megabyte copy of target-controlled bytes"
    - "An exported error CLASSIFIER, so a catch branch whose trigger the test runtime cannot produce is still executed by something"
    - "A refusal-reason type declared as a frozen runtime array with the type derived from it, plus an every-reason-was-OBSERVED gate that names the reasons no case produced"
    - "A per-index skip list beside the recovered list, so 'this map carries nothing' and 'this map failed' stay two different outcomes all the way to UI-09"

key-files:
  created:
    - packages/engine/src/sourcemap/announce.ts
    - packages/engine/src/sourcemap/announce.spec.ts
    - packages/engine/src/sourcemap/parse.ts
    - packages/engine/src/sourcemap/parse.spec.ts
  modified:
    - packages/engine/src/decode.ts
    - packages/engine/src/decode.spec.ts

key-decisions:
  - "THE A2 PREFILTER IS TAKEN, and in the form that actually addresses what was measured: one lastIndexOf for the 16-byte common substring, then a bounded startsWith fast path, with the two full marker searches kept as the fallback for the one shape the fast path cannot settle"
  - "MAP_MAX_BYTES IS NOT RAISED. 07-01's ~75% projection was made against the two-full-scan implementation; thresholds.spec.ts asserts shipped <= measured, and re-measuring means running the ladder inside Caido — which this SDK-free plan may not do. Recorded as WINDOW 111 with the exact re-run command"
  - "The window is applied as an OFFSET TEST, never a slice. `lastIndexOf` has no stop-at parameter, so a windowed backwards search would have to materialise the tail; searching the whole body and testing `at >= windowStart` is exactly equivalent and allocates nothing"
  - "Base64 is VALIDATED before it is decoded, by a character loop. Buffer.from(x, 'base64') silently returns a SHORTER buffer on a stray character, so without the check a two-file concatenation decodes to a perfectly valid empty map"
  - "Padding is REQUIRED. An unpadded but legal payload is refused malformed_base64 — the fail-closed direction, and what makes 'a truncated final quantum' distinguishable from 'a short last group'. Recorded as WINDOW 112 with the condition for relaxing it"
  - "The decoded gate measures BYTES via Buffer.byteLength, not UTF-16 code units. json.length under-counts every character outside Basic Latin, and MAP_MAX_BYTES was measured in bytes"
  - "reasonForParseError is EXPORTED, because V8's JSON.parse is iterative and no document can drive the RangeError catch from the front door on Node. The mapping is executed against a real RangeError rather than described"
  - "A nested `sections` member is refused on PRESENCE rather than on shape, because the recursion bound is 1 BY SPECIFICATION and not by budget"
  - "MAP-01 / MAP-02 / MAP-05 are NOT marked complete in REQUIREMENTS.md. This plan is the SDK-free half; MAP-01's `SourceMap` response-header route and MAP-02's storage half belong to 07-03 / 07-04 / 07-05"

patterns-established:
  - "Prove an optimisation DIFFERENTIALLY against the implementation it replaced, at several parameter values, and prove the slow path is still TAKEN by a named fixture — otherwise the fallback is unexecuted code the differential silently agrees with"
  - "When a branch's trigger cannot be produced on the test runtime, say so in the file, export the classifier, and execute the mapping directly — never leave the branch unrun and call the suite complete"
  - "Deliver a fixture AS A TARGET WOULD (JSON.stringify(JSON.parse(value))) when the corpus deliberately writes its adversarial characters as escapes — the escapes make the fixture reviewable and make its bytes pure ASCII, on which the two base64 primitives agree"
  - "State a control beside every hostile case: the non-concatenated announcement that DOES decode, the pure-ASCII payload on which the two primitives DO agree, the legacy spelling later as well as earlier"

requirements-completed: []

coverage:
  - id: D1
    description: "findAnnouncement locates the announcement by lastIndexOf over a bounded tail window, with the window exercised from both sides and no pattern anywhere on the path"
    requirement: MAP-01
    verification:
      - kind: unit
        ref: "packages/engine/src/sourcemap/announce.spec.ts#the tail window is a boundary, stated"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sourcemap/announce.spec.ts#./announce.ts contains no pattern, structurally"
        status: pass
      - kind: manual_procedural
        ref: "scratch edit planting a pattern literal and a `new RegExp` in announce.ts; two assertions red; reverted; 98/98 green"
        status: pass
    human_judgment: false
  - id: D2
    description: "The A2 prefilter's fast path is proven equivalent to the two-full-scan reference the D-10 probe measured, and the fallback is proven to be taken"
    requirement: MAP-01
    verification:
      - kind: unit
        ref: "packages/engine/src/sourcemap/announce.spec.ts#the prefilter fast path equals the two-full-scan reference"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sourcemap/announce.spec.ts#the FALLBACK path is actually taken by that fixture, not merely present"
        status: pass
    human_judgment: false
  - id: D3
    description: "decodeInlineMap accepts the two D-04 base64 forms, gates on the ENCODED length before allocating, validates the alphabet, and reports everything else as external"
    requirement: MAP-02
    verification:
      - kind: unit
        ref: "packages/engine/src/sourcemap/parse.spec.ts#the ENCODED-length gate fires BEFORE the decoded buffer is allocated"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sourcemap/parse.spec.ts#the base64 refusals are named, and never a shorter buffer"
        status: pass
    human_judgment: false
  - id: D4
    description: "The base64 primitive is the Buffer one, and the divergence from the latin1 primitive is DEMONSTRATED on a raw-UTF-8 payload rather than asserted away"
    requirement: MAP-02
    verification:
      - kind: unit
        ref: "packages/engine/src/decode.spec.ts#Pitfall 4 — the base64 primitive is a choice, and the wrong one is silent"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sourcemap/parse.spec.ts#round-trips the non-ASCII source to a BYTE-IDENTICAL sha256"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every legal sourcesContent absence shape and every structural hostility in HOSTILE_MAP_CASES has a distinct outcome, with the id set asserted in full"
    requirement: MAP-05
    verification:
      - kind: unit
        ref: "packages/engine/src/sourcemap/parse.spec.ts#MAP-05 — the hostile matrix (13 rows)"
        status: pass
      - kind: manual_procedural
        ref: "scratch edit dropping one it.each row; `exercised EVERY id` red with the missing id named; reverted"
        status: pass
    human_judgment: false
  - id: D6
    description: "The refusal vocabulary is closed, DefMiner-authored, and every member is produced by a case"
    requirement: MAP-05
    verification:
      - kind: unit
        ref: "packages/engine/src/sourcemap/parse.spec.ts#every member of MAP_PARSE_REASONS was OBSERVED, and names the ones that were not"
        status: pass
      - kind: manual_procedural
        ref: "scratch edit adding a ninth reason with no case; gate red naming `scratch_ninth_reason`; reverted"
        status: pass
    human_judgment: false
  - id: D7
    description: "The MAP-05 size boundary is exercised at the REAL ceiling by calling sizeBoundaryCases(MAP_MAX_BYTES) — closing 07-01's open WINDOW 109"
    requirement: MAP-05
    verification:
      - kind: unit
        ref: "packages/engine/src/sourcemap/parse.spec.ts#MAP-05 — the decoded ceiling, from both sides, at MAP_MAX_BYTES"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sourcemap/parse.spec.ts#the ENCODED gate cannot have been what refused the one-over case"
        status: pass
    human_judgment: false
  - id: D8
    description: "The A2 prefilter decision, taken with the announce_scan figure as its reason, and the consequence for MAP_MAX_BYTES recorded rather than assumed"
    requirement: MAP-01
    verification:
      - kind: manual_procedural
        ref: ".planning/WINDOWS.md entry 111 — the re-run condition and the command"
        status: pass
    human_judgment: true
    rationale: "Whether shipping the prefilter WITHOUT re-running the ladder is acceptable is a phase-owner judgment, not a test outcome. The optimisation is proven correct and is free; what is NOT established is the 75% headroom 07-01 projected, and UI-09's copy in plan 07-08 depends on which of those two facts the phase owner treats as settled. Surfaced here rather than buried in the doc comment."
  - id: D9
    description: "The too_deep branch's mapping is executed, and the reason its trigger cannot be produced on Node is stated in the file rather than left as a silent gap"
    requirement: MAP-05
    verification:
      - kind: unit
        ref: "packages/engine/src/sourcemap/parse.spec.ts#`too_deep` is produced by the shipped classifier from a REAL RangeError"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sourcemap/parse.spec.ts#MAP-05 — the hostile matrix > deep-nested-past-stack-limit (asserts the call RETURNS)"
        status: pass
    human_judgment: true
    rationale: "The catch and the classifier are each executed, but never TOGETHER — no Node document can make JSON.parse throw a RangeError. The composition can only be proven inside Caido's QuickJS, which this SDK-free plan cannot reach. Recorded as WINDOW 113 with 07-04 or a Tier-1 probe as the place to close it."

duration: 28 min
completed: 2026-09-01
status: complete
---

# Phase 07 Plan 02: The Announcement, the Decode and the Parse — Summary

**MAP-01's discovery half, MAP-02's reconstruction and the whole MAP-05 matrix now run under plain vitest on Node with no Caido present — the A2 prefilter is taken and proven equivalent to the implementation the ladder measured, `MAP_MAX_BYTES` is deliberately NOT raised on a projection, and the no-pattern property has been watched failing.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-09-01T21:01:00Z
- **Completed:** 2026-09-01T21:29:00Z
- **Tasks:** 3 (1 tracer + 2 auto) · **Commits:** 5 (2 RED, 2 GREEN, 1 test)
- **Files created:** 4 · **modified:** 2 · **Tests:** 3,224 → 3,332 across 75 → 77 files

## The prefilter decision, made explicitly

**TAKEN.** The evidence, from `.planning/phases/07-sourcemap-reconstruction/results/map-bytes.json`
(`derivation.op_ms_per_mb`):

| Operation | ms/MB |
|---|---:|
| **`announce_scan`** | **3.8029** |
| `json_parse` | 2.9102 |
| `b64_decode_atob` | 2.5509 |
| `sources_materialise` | 2.3975 |
| `b64_decode_buffer` | 2.1599 |

Assumption A2 did not hold: the scan RESEARCH called "UNMEASURED ANYWHERE" is the most expensive of
the five and 43% of the inline path on its own. So the mitigation RESEARCH named in advance is now an
evidenced optimisation, and it is taken.

**In the form that addresses what was actually measured, which the naive form does not.** The probe's
`announceScan` ran two full `lastIndexOf` calls, and on all four fixtures the legacy `//@` marker was
absent — so one of the two scans read the entire body to return `-1` every time. *That* failing scan
is the 3.80 ms/MB. A prefilter used only as an early `-1` reject would halve the no-announcement case
and leave the measured case exactly where it was. The shipped form therefore has three parts:

1. **One `lastIndexOf("sourceMappingURL")`** — the 16-byte substring both markers share. `-1`, or a
   last occurrence already outside the window, returns null having run one scan.
2. **A bounded fast path.** Every marker occurrence begins `COMMON_OFFSET` (4) before an occurrence of
   that substring, and this is the *last* occurrence — so if `body.startsWith(marker, at - 4)` for
   either spelling, that offset *is* `max(lastIndexOf(H), lastIndexOf(A))`, and **neither full marker
   search runs**. This is the case every real bundle is in, and the case the ladder measured.
3. **The two full searches, kept as the fallback**, for the one shape the fast path cannot settle: a
   body whose last `sourceMappingURL` occurrence is not preceded by a marker — a decoy identifier, a
   string literal — while an earlier occurrence is a real announcement.

**And it is proven equivalent rather than assumed to be.** `announce.spec.ts` carries a naive
two-full-scan reference — deliberately the slow, obvious implementation the probe used — and asserts
`findAnnouncement` equals it over **15 bodies at 5 window widths**, including a decoy-after-real
fixture. A second case proves the fallback is genuinely *taken* by that fixture rather than merely
present, because an optimisation whose slow path is never executed is one the differential silently
agrees with.

**A second, unbudgeted saving fell out of it.** The window is applied as an **offset test**, never as
a slice. `lastIndexOf` has no stop-at parameter, so a genuinely windowed backwards search has to
materialise the tail — the probe recorded that as its `sliced` field. Searching the whole body and
then testing `at >= windowStart` is *exactly* equivalent (every marker the sliced search could find is
at or after the window start, and the last occurrence in the body is the last in the window whenever
one is there at all), and allocates nothing. At `SOURCEMAP_TAIL_WINDOW_BYTES` = 3,495,382 against
`PASSIVE_MAX_BYTES` = 8,388,608 that is up to a 3.5 MB copy of target-controlled bytes not made on the
proxy thread.

### What was NOT done, and why

**`MAP_MAX_BYTES` is not raised.** 07-01 projected the prefilter would move it up by roughly 75% and
handed the call here. The projection is not evidence: every point on the ladder was taken against the
two-full-scan implementation, and `thresholds.spec.ts`'s tripwire is `shipped <= measured` against
`map-bytes.json`. Moving the constant means re-running `scripts/phase7/map-bytes.sh` with the
prefiltered scan in `tier1/mapbytes/src/index.ts` — four fresh Caido instances — which is precisely
the Caido-touching work this SDK-free plan is scoped out of. Recorded as **WINDOW 111** with the exact
command. Until it lands, the bound stays BINDING at 2,621,440 and **UI-09 must still speak loudly
about refused maps**.

## Accomplishments

### 1. `announce.ts` — discovery, with no pattern anywhere on the path

`MARKERS` (frozen, two spellings, asserted equal-length and asserted to carry the common substring at
the same offset), `findAnnouncement(body, windowBytes)` and the `Announcement` type. `lastIndexOf`,
`startsWith`, `indexOf` and `slice`; nothing else.

The boundary is exercised from both sides in `admit.spec.ts`'s idiom — a marker at exactly the window
start is found, one byte of window later it is not — plus a zero-length body, a zero-width window, a
body shorter than the window, a body with no marker, an empty announcement URL and a CRLF line ending.
Both spellings are tested in **both orders**, so "the later wins" cannot pass as "the current spelling
wins" while every fixture in the repo uses `//#`. The equal-offset case is shown **unreachable by
construction** (`MARKER_HASH[2] !== MARKER_AT[2]`, and the two agree everywhere else) rather than
branched on.

### 2. The concatenation defect, and what it revealed

The plan asked for the `corpus/composite-8mb.js` shape — monaco's announcement at EOF with no trailing
newline, so the next file is swallowed into the line comment. The expected outcome was "the URL matches
no `data:` prefix, so it is reported external". **It is not.** The swallowed text lands *inside the
base64 payload*, and the alphabet check refuses it by name as `malformed_base64`.

That is the stronger outcome, and the spec now executes the counterexample beside it:

```
Buffer.from("e30=/* next file */var b=2;", "base64").toString("utf8")  ===  "{}"
```

The lenient primitive **skips the stray characters and returns a perfectly valid empty map** from bytes
that are two files. Without the alphabet check the concatenation defect would have produced a map that
parses. A control case — the same announcement without the concatenation — decodes cleanly, so the
refusal is about the input and not about the EOF shape.

### 3. `parse.ts` — the decode, the parse, and eight named reasons

`B64_PREFIXES` (the two D-04 forms, matched case-insensitively over the prefix region only, so a
multi-megabyte URI is never lower-cased to test 43 bytes), `encodedCeiling`, `decodeInlineMap`,
`parseSourceMap`, `reasonForParseError`, `MAP_PARSE_REASONS` and the four published result types.

**The reason-code vocabulary as shipped**, a frozen array with the type derived from it, in
`OPERATOR_CLAUSE_REJECTIONS`' idiom:

| Reason | Produced by |
|---|---|
| `too_large` | encoded length over `encodedCeiling(maxBytes)`, or decoded **bytes** over `maxBytes` |
| `too_deep` | a caught `RangeError` from `JSON.parse` |
| `too_many_sources` | declared `sources` count, summed across sections, over `SOURCE_ROWS_PER_MAP_MAX` |
| `malformed_json` | anything else `JSON.parse` throws |
| `malformed_base64` | alphabet or padding violation, checked *before* decoding |
| `nested_sections` | a `sections` member present on a section's own map |
| `not_a_map` | not an object, or neither `sections` nor a `sources` array |
| `empty` | an empty payload, or a payload decoding to nothing — **and** the per-index skip reason |

`empty` appearing in two positions is deliberate rather than an overload: both mean *there is nothing
there*, and splitting them would be two words for one fact.

**Gate order is proven, not asserted.** The encoded gate fires before anything is allocated: at exactly
`Math.ceil(MAP_MAX_BYTES * 4 / 3) + 4` the outcome is `malformed_base64` (that length is not a multiple
of four — so reaching the alphabet check *means* the size check ran and let it through), and one byte
above it is `too_large` with a null payload field.

### 4. The MAP-05 matrix — 13 fixtures, 13 distinct outcomes

Every case from `HOSTILE_MAP_CASES`, one `it.each` row per fixture with the id in the title, and the
exercised id set asserted `toEqual` `HOSTILE_MAP_CASE_IDS`. **All four legal absence shapes are four
different expectations**, never one no-content branch:

| Fixture | Outcome |
|---|---|
| `sources-content-absent` | **ok**, empty recovered list, both indexes skipped, and `"reason" in result` asserted `false` |
| `sources-content-shorter-than-sources` | recovered `[0]`, skipped `[1, 2]` |
| `sources-content-null-entry` | skipped `[{1, "empty"}]` exactly |
| `sources-null-entry` | recovered, `sourcesVerbatim` a **null** and asserted `not.toBe("null")` |
| `sections-index-map` | `sectioned: true`, two sources, aggregate indexes 0 and 1 |
| `sections-nested` | refused `nested_sections` |
| `sections-unsorted-overlapping` | **document order preserved**: b, a, c — the order is input, not an invariant |
| `sections-map-null` | first section skipped, second recovered, no throw |
| `xssi-prefix` | stripped by `startsWith` + `indexOf("\n")`, map parses |
| `deep-nested-past-stack-limit` | the call **returns**; on Node it parses (see below) |
| `million-tiny-sources` | refused `too_many_sources` on the **declared** count, before any entry is visited |
| `single-giant-sources-content` | one row, 4 MiB, the string the JSON parser already produced |
| `non-ascii-round-trip` | the pound sign, em dash and CJK survive |

Plus: `ignoreList` and `x_google_ignoreList` neither used nor failed on, said out loud because
"ignored" and "unimplemented" look identical from outside.

### 5. `sizeBoundaryCases(MAP_MAX_BYTES)` — WINDOW 109 closed

07-01 shipped the boundary as a *builder* and recorded the consequence as an open defect: the MAP-05
boundary truth was met by apparatus, not by an exercised bound. It is called here at the real ceiling.
`exactly-map-max-bytes` decodes to exactly 2,621,440 bytes and is **accepted**; `one-over-map-max-bytes`
is **refused `too_large`** with a null payload.

And the pair is proven to be testing the right gate. Both documents base64-encode to the **same**
length — base64 quantises to three-byte groups — so the encoded gate lets both through and the decoded
**byte** check is what separates them. Without that assertion the pair would look like it proved the
encoded gate and would prove nothing about the decoded one. The builder's second stated reason is
discharged too: the same property is asserted at `SIZE_BOUNDARY_MIN_BYTES + 1024`.

### 6. The two base64 primitives, measured diverging on Node

`decode.spec.ts` computes **both** results and asserts them unequal, with the direction asserted as
well (latin1 is strictly longer, exactly as the probe recorded at all four ladder points). Then it
asserts the three things that make the hazard silent: the wrong digest, **`JSON.parse` still succeeding
on the corrupted string**, and a pure-ASCII control on which the two primitives *do* agree.

**A fixture note worth carrying forward.** `map-fixture.ts` writes its adversarial characters as
`\uXXXX` escapes on purpose — a literal control or bidi character is invisible in every diff — which
makes the fixture's own bytes pure ASCII, and on pure ASCII the two primitives agree. Re-serialising
through `JSON.stringify(JSON.parse(value))` produces the raw-UTF-8 form a bundler actually emits,
without forking the corpus. Both `parse.spec.ts` and `decode.spec.ts` use it and say why.

### 7. The no-pattern property, watched failing

The AST walk covers **both** `announce.ts` and `parse.ts`: zero `RegularExpressionLiteral` nodes, zero
`new RegExp` constructions, and a non-vacuity assertion that the walk visited more than fifty nodes and
found at least one `CallExpression`. An AST walk and not a substring scan, for the reason
`filesystem-prohibition.spec.ts` gives: both modules discuss patterns at length in their headers, so a
text scan would fail on its own documentation and the only way to make it pass would be deleting the
reasoning.

## RED observations — three scratch edits, each watched failing and reverted

**1. A pattern literal and a `new RegExp` planted in `announce.ts`.** Two assertions red, verbatim:

```
FAIL  ./announce.ts contains no pattern, structurally > has ZERO regular-expression literals
AssertionError: ./announce.ts now contains 1 pattern literal(s). REDOS_INTERRUPTIBLE is false and
REDOS_RECOVERY is `kill`: SPIKE-01 measured that a catastrophic pattern hangs the QuickJS thread with
NO interrupt and that SIGKILL — which takes caido-cli down with the operator's real project data — was
the only teardown that worked. The input here is a multi-megabyte body a target chose. Use
lastIndexOf / indexOf / startsWith.: expected 1 to be +0

FAIL  ./announce.ts contains no pattern, structurally > has ZERO `new RegExp` constructions
AssertionError: ./announce.ts now constructs a pattern at runtime. A pattern assembled from
target-influenced pieces is the same hazard as a literal one and is harder to see.: expected 1 to be +0
```

Reverted with `git checkout --`; **98/98 green**.

**2. One `it.each` row dropped** (`[...HOSTILE_MAP_CASES].slice(1)`):

```
FAIL  MAP-05 — the hostile matrix > exercised EVERY id in HOSTILE_MAP_CASE_IDS, not a subset
AssertionError: expected [ …(12) ] to deeply equal [ …(13) ]
-   "sources-content-absent",
```

Reverted; green.

**3. A ninth reason added to `MAP_PARSE_REASONS` with no case:**

```
FAIL  EVERY reason in the closed vocabulary has a case > every member of MAP_PARSE_REASONS was
OBSERVED, and names the ones that were not
AssertionError: these reasons are declared and never produced by any case in this file:
scratch_ninth_reason. A reason nothing can produce is a copy string plan 07-08 will write for an
outcome that never happens.: expected [ 'scratch_ninth_reason' ] to deeply equal []
```

Reverted; green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] `Buffer.from(x, "base64")` is LENIENT, so the alphabet had to be checked before decoding**

- **Found during:** Task 1, writing `decodeInlineMap`
- **Issue:** The plan's action text has `decodeInlineMap` gate on encoded length and then call `decodeBase64`. Node's (and QuickJS's) base64 primitive **silently skips characters outside the alphabet and returns a shorter buffer** rather than failing — so `malformed_base64`, which the plan names as a required reason, was unreachable, and a map with one stray byte would have decoded to a truncated document whose `JSON.parse` error described somewhere unrelated. The plan's own truth ("never silently produces a shorter buffer") cannot hold without a pre-check.
- **Fix:** `isCanonicalBase64` — a character loop over code points (never a pattern, per this file's own prohibition) checking the alphabet and the padding, run before `decodeBase64`. The counterexample is executed in both spec files rather than described.
- **Files modified:** `packages/engine/src/sourcemap/parse.ts`, `parse.spec.ts`, `announce.spec.ts`
- **Committed in:** `511ca1b`, `b31df02`

**2. [Rule 1 — Bug] The decoded ceiling was measured in the wrong units**

- **Found during:** Task 1
- **Issue:** `json.length` is UTF-16 code units and `MAP_MAX_BYTES` is bytes. `byteLength >= length` always, so a length check **under-counts** — a map of CJK-commented sources would pass a check while being well over the ceiling in the units the ceiling was measured in.
- **Fix:** `Buffer.byteLength(json, "utf8") > maxBytes`. The reason is in the file at the comparison.
- **Committed in:** `511ca1b`

**3. [Rule 1 — Bug] Lower-casing the URL to test a 43-byte prefix would have copied the payload**

- **Found during:** Task 1
- **Issue:** RFC 2397 makes the scheme, media type and parameter names case-insensitive, and `;charset=UTF-8;base64,` is a spelling real bundlers emit — so the prefix compare has to be case-insensitive. The obvious `url.toLowerCase()` allocates a second copy of a multi-megabyte data URI on the proxy thread to test 43 characters.
- **Fix:** lower-case at most `B64_PREFIX_MAX` characters. `parse.spec.ts` asserts the `charset=UTF-8` spelling decodes.
- **Committed in:** `511ca1b`

**4. [Rule 3 — Blocking] `too_deep` is unreachable on the test runtime**

- **Found during:** Task 2
- **Issue:** The plan requires the deep-nesting fixture to produce a caught `RangeError` mapped to `too_deep`. **V8's `JSON.parse` is iterative** — measured this session: 800, 20,000 and 2,000,000 nested levels all parse without complaint, in both array and object form. SPIKE-06's 710-bracket boundary was measured against Caido's QuickJS *JS parser*. So no document can drive that branch from the front door on Node, and an every-reason-has-a-case gate over an eight-member vocabulary could not pass honestly.
- **Fix:** the classifier is factored out as an exported `reasonForParseError(error)` and executed directly against a real `RangeError`; the fixture asserts the weaker, universally-true property (**the call returns rather than throws**) and accepts either leg. Both the asymmetry and its reason are written into `parse.ts` and into the spec, not into this document alone.
- **Residual:** the catch and the classifier are each executed but never *together*. **WINDOW 113.**
- **Committed in:** `cc86d94`

**5. [Rule 2 — Missing Critical] Four published types were dead to `knip`**

- **Found during:** Task 1, on the first `pnpm knip`
- **Issue:** `InlineMapResult`, `SkippedSource`, `ParseLimits` and `MapParseResult` were exported and only inferred at the call sites, so `knip` (running with `ignoreExportsUsedInFile: false` and `exports`/`types` at `error`) reported four unused exported types and the gate failed.
- **Fix:** `parse.spec.ts` now **annotates** rather than infers — four small helpers that name the published types at their boundaries. This is the better spec anyway: a change to any of the four is a compile error in the file that asserts against them.
- **Committed in:** `511ca1b`

### Plan expectations that the code corrected

- **The concatenation case is `malformed_base64`, not `external`** (accomplishment 2). The plan predicted the swallowed text would make the URL match no `data:` prefix; it matches the prefix and corrupts the *payload*. The shipped outcome is strictly safer and the counterexample is now executed.
- **The prefilter is shipped with a bounded fast path**, not as a bare early-`-1` reject. The naive form saves nothing in the case the ladder measured. The two full marker searches remain, as the plan's adjacency truth requires, and are proven to be *taken* by a named fixture.

## Threat Flags

None. Every surface this plan touched is in the plan's own `<threat_model>`, and T-07-SC held exactly:
**nothing was installed** — no `pnpm add`, no lockfile change, no new dependency. `pnpm knip` exits 0.

T-07-15 (an outbound `.map` fetch) remains structurally impossible: both new modules are pure, and
`outbound-prohibition.spec.ts` and `filesystem-prohibition.spec.ts` both walk `packages/engine/src`
recursively and report zero violations over the new `sourcemap/` subdirectory — which also flips both
gates' "the walk really DESCENDED into subdirectories" assertion live for the engine root for the
first time.

## Known Stubs

None. Three residuals are recorded rather than stubbed, all in `.planning/WINDOWS.md`:

| # | Item | Owner |
|---|---|---|
| 111 | The A2 prefilter is shipped but `MAP_MAX_BYTES` is not raised — needs `scripts/phase7/map-bytes.sh` re-run with the prefiltered scan in the probe | a Caido-touching plan (07-04 or a follow-up ladder run) |
| 112 | `isCanonicalBase64` requires padding, so an unpadded but legal payload is refused `malformed_base64` | revisit if the field shows unpadded inline maps |
| 113 | The `too_deep` catch and its classifier are each executed, never together — V8's JSON parser cannot be made to throw | 07-04, or a Tier-1 probe inside Caido |

WINDOW **109 is marked fixed**: `sizeBoundaryCases(MAP_MAX_BYTES)` is called and both sides of the
boundary are exercised at the real ceiling.

## Issues Encountered

- **`MAP-01` / `MAP-02` / `MAP-05` are NOT checked off in `REQUIREMENTS.md`, deliberately.** The plan's
  frontmatter names all three, but MAP-01's text includes the `SourceMap` **response header** route and
  MAP-02's includes storage — neither of which this SDK-free half touches. `requirements-completed` is
  therefore empty and the boxes stay open for 07-03 / 07-04 / 07-05. A checked box is a claim; three
  wrong claims in a traceability table are worse than three open ones.
- **WINDOW 110 (O-04's unqualified MAP-02 parenthetical) is still unassigned** and was not touched here
  — it is a `REQUIREMENTS.md` edit this plan does not own, exactly as 07-01 recorded.

## User Setup Required

None.

## Next Phase Readiness

Ready for **07-03** (the retained traversal-sink gate, which reads `SOURCES_LABEL_CASES`) and for
**07-04 / 07-05** (the SDK half). They get `findAnnouncement`, `decodeInlineMap`, `parseSourceMap` and
the eight-member `MAP_PARSE_REASONS` vocabulary that plan 07-05 writes into `analyses.error` and plan
07-08 maps to copy.

**Two things the next plans should read before they start:**

1. `packages/engine/package.json` has **no `exports` entry** for `./sourcemap/announce` or
   `./sourcemap/parse` yet. Adding one now would be a speculative seam with no importer; the first
   plan that imports them across the package boundary should add it in the same commit.
2. **The prefilter/`MAP_MAX_BYTES` question is open** (WINDOW 111). 07-08's UI-09 copy depends on
   whether the bound stays binding by 2.3× or by rather less, and that is settled by a ladder re-run,
   not by argument.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-01*

## Self-Check: PASSED

- All 4 created files and both modified files present on disk (`[ -f ]` per path).
- All 5 task commits present (`git log --oneline --all | grep`): `bb72f87`, `511ca1b`, `56ac736`,
  `cc86d94`, `b31df02`.
- Every task's `<acceptance_criteria>` re-run and green, including the three manual ones: the planted
  pattern literal watched RED (both assertions, messages quoted verbatim above) and green after
  `git checkout --`; one `it.each` row dropped and the exercised-id assertion watched RED naming
  `sources-content-absent`; a ninth reason added to `MAP_PARSE_REASONS` and the every-reason gate
  watched RED naming it.
- Plan-level `<verification>`: `pnpm vitest run packages/engine/src/sourcemap packages/engine/src/decode.spec.ts`
  green (3 files); `pnpm test` green at **77 files / 3,332 tests** (from 75 / 3,224 at 07-01's close —
  +2 files, +108 tests, zero regressions).
- `pnpm typecheck`, `pnpm lint` and `pnpm knip` all exit 0.
- `git status --porcelain corpus/` is empty — no fixture bytes were written to the gitignored tree.
- `.planning/WINDOWS.md`: entry 109 marked `fixed`; entries 111, 112 and 113 appended.
