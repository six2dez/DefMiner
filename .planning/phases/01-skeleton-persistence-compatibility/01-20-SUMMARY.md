---
phase: 01-skeleton-persistence-compatibility
plan: 20
subsystem: database
tags: [sqlite, redaction, url, idempotence, truncation, disclosure]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "`redactDelimitedSegment`'s CR-07 padding branch (plan 01-15), whose segment-shortening cost `normaliseObservedUrl` its fixed point at the `URL_MAX` cut"
  - phase: 01-skeleton-persistence-compatibility
    provides: "the IN-18 pin (plan 01-15), which deferred the severed-marker repair on the strength of an invariant that branch had already broken"
provides:
  - "`normaliseObservedUrl` truncates on a query-segment boundary: past `URL_MAX` it drops back to the last `&` so the stored value never ends inside a segment or inside a `<redacted>` marker"
  - "a stated, asserted no-separator branch — with no `&` inside the cut the byte cut STANDS, retaining exactly what the old rule retained"
  - "an idempotence assertion over the COMPOSED function that SEARCHES (128 cuts) instead of hard-coding one, and names its own counterexample by length and both tails"
  - "the `redactDelimitedSegment` idempotence claim scoped to the helper, with the composed function's fixed point delegated to the sweep"
  - "IN-18 closed by execution, its deferral rationale deleted, the case kept as a pin on the NEW behaviour"
  - "a `schema.spec.ts` `observations.url` disclosure of the truncation cost and of the two no-separator classes the sweep does not reach"
affects: [phase-2-detectors, phase-4-security, any-future-URL_MAX-change]

actuals:
  tokens: 41000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Assert a property by SEARCHING for its counterexample, not by fixing one input — the sweep reports the length and both tails when it finds one"
    - "A disclosure is written no wider than the evidence: 'a fixed point across the swept range, with these classes unproven', never 'idempotent for every input'"
    - "A docblock invariant names the function it is true OF; the composed function's property is asserted in the suite, not claimed in prose"

key-files:
  created: []
  modified:
    - packages/backend/src/store/observations.ts
    - packages/backend/src/store/observations.spec.ts
    - packages/backend/src/store/schema.spec.ts

key-decisions:
  - "P20-D1: truncate on a query-segment boundary — past `URL_MAX`, drop back to the last `&`. Measured cost: exactly ONE trailing segment more than the old byte cut, never two."
  - "P20-D2 (the no-separator branch): with no `?` inside the cut, or a query with no `&` inside the cut, the byte cut STANDS unchanged. Dropping back to the last `/` or to the `?` would truncate an oversized path back to its authority — discarding ~2 KB a segment-boundary cut would have kept, which is a different and much larger decision."
  - "P20-D3: the `redactDelimitedSegment` idempotence sentence is SCOPED to the helper rather than deleted — the reasoning is sound, the scope was wrong, and a reader needs to see which."
  - "P20-D4: IN-18 is CLOSED by execution, not re-pinned. Its stated deferral reason is deleted rather than replaced, because it deferred to protect an invariant already broken."

patterns-established:
  - "Reproduce by sweep before fixing: a third independent measurement is what turns a quoted defect into a measured one"
  - "A stop condition guards the sentence an autonomous framing rests on, and both halves are measured and recorded together"

requirements-completed: [STORE-03]

coverage:
  - id: D1
    description: "`normaliseObservedUrl` truncates on a query-segment boundary — past `URL_MAX` the value ends on a whole segment, never inside one and never inside a `<redacted>` marker"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#IDEMPOTENT AT THE `URL_MAX` CUT: swept across parameter-name length, not hard-coded (WR-22)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#the truncation drops a WHOLE trailing segment, never half of one, and never more than one (WR-22)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The no-separator branch is a stated decision — the byte cut stands, retaining exactly what the old rule retained — and both residual classes it leaves are pinned by executed bytes"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#THE NO-SEPARATOR BRANCH: with no `&` inside the cut the byte cut STANDS, and that is where the residual lives (WR-22)"
        status: pass
    human_judgment: false
  - id: D3
    description: "IN-18 closed by execution: the severed-marker shape no longer exists on its fixture, its deferral rationale is deleted, and the case now pins the amended behaviour"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#CLOSED 2026-08-22 (IN-18, by WR-22): the URL_MAX cut no longer lands INSIDE a `<redacted>` marker — it drops the WHOLE trailing segment, and this case now pins that"
        status: pass
    human_judgment: false
  - id: D4
    description: "No grammar CR-07 or P10-D1 closed was reopened by the truncation change"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts — `BARE_CREDENTIAL_SHAPES` block (83 tests), PADDED block (8), `HEAD_CASES` block (33), real-SQLite round trip (5)"
        status: pass
      - kind: integration
        ref: "pnpm test — 31 files / 1082 tests"
        status: pass
    human_judgment: false
  - id: D5
    description: "The `redactDelimitedSegment` idempotence claim is scoped to the helper, and the `schema.spec.ts` `observations.url` disclosure claims no more than the sweep proved"
    requirement: "STORE-03"
    verification: []
    human_judgment: true
    rationale: "Whether a prose claim is scoped no wider than its evidence is a reading judgment. The bytes are pinned by D1-D3; that the SENTENCES match them is what a reviewer must confirm."

duration: 25 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 20: The `URL_MAX` Cut, the Invariant Sentence and the Pin That Deferred on It — Summary

**`normaliseObservedUrl` now truncates on a query-segment boundary instead of mid-segment, restoring its fixed point across a 128-cut sweep; the docblock claim that outran it is scoped to the helper, IN-18 is closed by execution rather than re-deferred, and the two classes the sweep cannot reach are disclosed and pinned instead of claimed away.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-24T08:58:00Z
- **Completed:** 2026-08-24T09:23:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Reproduced WR-22 independently by sweep before touching production code, at a **third** measurement: first differing parameter-name length **n=4**, with **25 of 40** lengths not fixed points.
- Closed it with a segment-boundary truncation whose accepted cost is **measured at exactly one trailing segment**, never two.
- Replaced the fixture that could not see its own counterexample with a **sweep of 128 cuts** whose failure message names the length and both tails.
- Scoped the false invariant sentence and **closed IN-18 by execution**, deleting the deferral rationale that rested on an already-broken invariant.
- Disclosed and pinned the surviving residual — including one class where `normaliseObservedUrl` is **genuinely not a fixed point** — rather than writing a sentence the sweep had not earned.

## Task Commits

1. **Task 1 (tracer): the truncation boundary, searched for and closed** — `693cfd9` (fix)
2. **Task 2: the two claims that were false** — `ff0f3c1` (docs)

## Files Created/Modified

- `packages/backend/src/store/observations.ts` — `normaliseObservedUrl` truncates on a segment boundary; `redactDelimitedSegment`'s closing idempotence sentence scoped to the helper. The three redaction branches, `redactUrlHead` and the `;` loop are untouched.
- `packages/backend/src/store/observations.spec.ts` — the sweep, the one-segment bound case, the no-separator branch case, the re-derived `URL_MAX` assertions, and the IN-18 case rewritten from a residual pin into a pin on the amended behaviour.
- `packages/backend/src/store/schema.spec.ts` — the `observations.url` entry carries a truncation row: the measured cost, and the two no-separator classes stated as OPEN.

---

## 1. THE DEFECT REPRODUCED INDEPENDENTLY, BEFORE THE FIX

Swept parameter-name length 1..40 at 900 parameters through the shipped `normaliseObservedUrl`, comparing pass 1 to pass 2. Executed output:

```
LENGTHS TRIED: 40 (n=1..40)
DIFFERING LENGTHS: 25
found at n=4
  tailA "p111=<redacted>&pppp112=" lenA 2048
  tailB "p111=<redacted>&<redacte" lenB 2048
found at n=9
  tailA "=<redacted>&ppppppppp88=" lenA 2048
  tailB "87=<redacted>&<redacted>" lenB 2046
found at n=11
  tailA "0=<redacted>&ppppppppppp" lenA 2048
  tailB "80=<redacted>&<redacted>" lenB 2047
found at n=12
  tailA "pp77=<redacted>&pppppppp" lenA 2048
  tailB "pp77=<redacted>&<redacte" lenB 2048
  … 21 more …
found at n=40
  tailA "pppppppppppppppppppppppp" lenA 2048
  tailB "36=<redacted>&<redacted>" lenB 2020
```

**The first differing length is n=4** — the same cut point the verifier found independently in `01-VERIFICATION.md`, and a different one from the reviewer's. Three parties, two distinct cut points, one mechanism. The finding is measured, not quoted.

**What the sweep also showed that neither earlier measurement did: there are TWO mechanisms, not one.**

- A cut landing just after a `=` leaves a segment with an **empty value half** (`…&pppp112=`), which plan 01-15's CR-07 padding branch redacts WHOLE — the name is destroyed. This is the mechanism WR-22 names.
- A cut landing inside a parameter **NAME** (`…&pppppppppppppppppppppppp`) leaves a segment with **no `=` at all**, which decision P10-D1 redacts whole for the same reason. This one is older than CR-07 and had never been named.

Both are the truncation severing a segment. Both are closed by the same repair.

## 2. THE SAME SWEEP AFTER THE FIX

```
POSTFIX LENGTHS TRIED: 40 (n=1..40)  DIFFERING: 0
(none)
MAX BYTES DROPPED BELOW URL_MAX: 48
```

Widened, since a bounded sweep is only worth its range:

```
WIDE SWEEP TRIED: 192 DIFFERING: 0
   (parameter-name lengths n = 1..64, at 300 / 900 / 1500 parameters)
```

**Range swept: parameter-name lengths 1 through 64 (the whole of `QUERY_NAME_MAX`), at three parameter counts. 192 cuts tried, 0 differing.** The version committed to the suite sweeps 128 of these (1..64 at 300 and 900 parameters); the 1500-parameter arm was run as a one-off widening and is not in the suite, because it moves the cut across the same residue classes at ~3x the runtime.

## 3. THE SWEEP AS IT NOW LIVES IN THE SUITE

`packages/backend/src/store/observations.spec.ts`:

```ts
  it("IDEMPOTENT AT THE `URL_MAX` CUT: swept across parameter-name length, not hard-coded (WR-22)", () => {
    // THE POINT OF THIS CASE IS THE SEARCH, and it is the whole lesson of WR-22.
    //
    // The property "a second pass returns the first byte-for-byte" was already
    // asserted three times in this file — over `redactQueryValues` in `CASES` and
    // in the `BARE_CREDENTIAL_SHAPES` loop, and over `redactUrlHead` in
    // `HEAD_CASES`. All three assert it over a HELPER on a SHORT url, where the
    // truncation never runs. The only assertion over the COMPOSED function was one
    // 140-parameter fixture whose cut happened to land mid-marker, and the defect
    // lives one cut point away: the fixture is green on either side of it.
    //
    // So this case does not choose a cut. It moves the cut across every offset
    // inside a segment by sweeping the parameter-name length, and reports the
    // counterexample it finds by length and by both tails — a future regression
    // names itself instead of leaving the next reader to bisect.
    //
    // MEASURED BEFORE THE FIX, over n = 1..40 at 900 parameters: 25 of the 40
    // lengths were not fixed points, the first at n=4 —
    //   pass1  "…p111=<redacted>&pppp112="   len 2048
    //   pass2  "…p111=<redacted>&<redacte"   len 2048
    // Two mechanisms, both of them the truncation severing a segment: a cut just
    // after a `=` leaves an EMPTY value half, which CR-07's branch redacts whole,
    // and a cut inside a NAME leaves a segment with no `=`, which P10-D1 redacts
    // whole. Either way the retained name is destroyed on the second pass.
    const failures: string[] = [];
    let swept = 0;
    for (const count of [300, 900]) {
      for (let n = 1; n <= 64; n += 1) {
        const parts: string[] = [];
        for (let i = 0; i < count; i += 1) {
          parts.push(`${"p".repeat(n)}${String(i)}=v`);
        }
        const once = normaliseObservedUrl(
          `https://cdn.test/a.js?${parts.join("&")}`,
        );
        const twice = normaliseObservedUrl(once);
        swept += 1;
        if (twice !== once) {
          failures.push(
            `${count} params, name length ${n}: ` +
              `pass1 len ${once.length} tail ${JSON.stringify(once.slice(-24))}; ` +
              `pass2 len ${twice.length} tail ${JSON.stringify(twice.slice(-24))}`,
          );
        }
      }
    }
    expect(swept).toBe(128);
    expect(
      failures,
      `normaliseObservedUrl is NOT a fixed point at ${failures.length} of ${swept} swept cuts:\n${failures.join("\n")}`,
    ).toEqual([]);
  });
```

And the bound case beside it:

```ts
  it("the truncation drops a WHOLE trailing segment, never half of one, and never more than one (WR-22)", () => {
    // THE ACCEPTED COST, MEASURED rather than asserted. Past `URL_MAX` the cut
    // drops back to the last `&`, which costs exactly the segment the byte cut
    // would have severed — a parameter NAME the operator's UAT decision of
    // 2026-08-21 chose to keep. Never two segments: more than one would mean the
    // boundary logic is not doing what it says.
    let worstSegmentsLost = 0;
    for (let n = 1; n <= 40; n += 1) {
      const parts: string[] = [];
      for (let i = 0; i < 900; i += 1)
        parts.push(`${"p".repeat(n)}${String(i)}=v`);
      const out = normaliseObservedUrl(
        `https://cdn.test/a.js?${parts.join("&")}`,
      );

      // The result never ends inside a segment or inside a redaction marker.
      const tail = out.slice(out.lastIndexOf("&") + 1);
      expect(tail.endsWith(QUERY_VALUE_REDACTION), `n=${n} tail ${tail}`).toBe(
        true,
      );

      // What the OLD one-line rule would have produced, for the delta. Built from
      // the same parts rather than from the function, so it survives the function
      // changing again.
      const byteCut = `https://cdn.test/a.js?${parts
        .map((x) => `${x.split("=")[0]}=${QUERY_VALUE_REDACTION}`)
        .join("&")}`.slice(0, URL_MAX);
      const lost =
        byteCut.slice(byteCut.indexOf("?") + 1).split("&").length -
        out.slice(out.indexOf("?") + 1).split("&").length;
      if (lost > worstSegmentsLost) worstSegmentsLost = lost;
    }
    expect(worstSegmentsLost).toBe(1);
  });
```

## 4. THE PRODUCTION CHANGE

```ts
export function normaliseObservedUrl(url: string): string {
  const redacted = redactQueryValues(redactUrlHead(String(url).split("#")[0]));
  if (redacted.length <= URL_MAX) return redacted;

  // The cut fell exactly between two segments: nothing was severed, so nothing
  // is dropped back. Checked against the FULL string, because that is the only
  // place the byte after the cut still exists.
  if (redacted[URL_MAX] === "&") return redacted.slice(0, URL_MAX);

  const cut = redacted.slice(0, URL_MAX);
  const q = cut.indexOf("?");
  const amp = cut.lastIndexOf("&");
  // `amp > q` and not `amp !== -1`: an `&` BEFORE the first `?` is a byte in the
  // path, not a query separator, and dropping back to it would cut the head.
  // With `q === -1` the cut never reached the query at all.
  if (q === -1 || amp <= q) return cut;

  return cut.slice(0, amp);
}
```

REDACT FIRST, TRUNCATE SECOND (decision P5-D8) is preserved exactly — the redaction still runs to completion before a single byte is dropped.

## 5. MUTATION PROOF — EXECUTED

The old one-line truncation was restored **in place** in `observations.ts` and the spec re-run.

```
MUTATED: old one-line truncation restored in place

 FAIL  observations.spec.ts > normaliseObservedUrl > IDEMPOTENT AT THE `URL_MAX` CUT: swept across parameter-name length, not hard-coded (WR-22)
AssertionError: normaliseObservedUrl is NOT a fixed point at 88 of 128 swept cuts:
300 params, name length 4: pass1 len 2048 tail "p111=<redacted>&pppp112="; pass2 len 2048 tail "p111=<redacted>&<redacte"
300 params, name length 9: pass1 len 2048 tail "=<redacted>&ppppppppp88="; pass2 len 2046 tail "87=<redacted>&<redacted>"
300 params, name length 11: pass1 len 2048 tail "0=<redacted>&ppppppppppp"; pass2 len 2047 tail "80=<redacted>&<redacted>"
300 params, name length 12: pass1 len 2048 tail "pp77=<redacted>&pppppppp"; pass2 len 2048 tail "pp77=<redacted>&<redacte"
… 84 more, each naming its own length and both tails …

 FAIL  observations.spec.ts > normaliseObservedUrl > the truncation drops a WHOLE trailing segment, never half of one, and never more than one (WR-22)

 FAIL  observations.spec.ts > RESIDUALS … > CLOSED 2026-08-22 (IN-18, by WR-22): …
AssertionError: expected 2048 to be 2039 // Object.is equality

      Tests  3 failed | 182 passed (185)
```

**The failure message names its own counterexample by length and by both tails** — which is the property the replaced fixture did not have.

Restored, re-run:

```
 Test Files  1 passed (1)
      Tests  185 passed (185)
```

`git diff` after the restore confirms only the intended change remains — the diff on `observations.ts` is exactly two hunks: one pure-docblock addition, and the function body:

```
@@ -391,0 +392,46 @@ export function redactQueryValues(url: string): string {
   (docblock prose only — 46 comment lines)
@@ -394,4 +440,17 @@ export function normaliseObservedUrl(url: string): string {
-  return redactQueryValues(redactUrlHead(String(url).split("#")[0])).slice(
-    0,
-    URL_MAX,
-  );
+  const redacted = redactQueryValues(redactUrlHead(String(url).split("#")[0]));
+  if (redacted.length <= URL_MAX) return redacted;
+  if (redacted[URL_MAX] === "&") return redacted.slice(0, URL_MAX);
+  const cut = redacted.slice(0, URL_MAX);
+  const q = cut.indexOf("?");
+  const amp = cut.lastIndexOf("&");
+  if (q === -1 || amp <= q) return cut;
+  return cut.slice(0, amp);
```

**`redactDelimitedSegment`'s three branches, `redactUrlHead` and the `;` loop are unchanged apart from docblock prose.** No executable line outside `normaliseObservedUrl` moved.

## 6. THE NO-SEPARATOR BRANCH — DECIDED, ASSERTED, AND MEASURED AGAINST THE SAME BOUND

**The decision (P20-D2):** when the cut lands in the HEAD (no `?` inside it), or inside a query with no `&` inside it, **the byte cut STANDS** — identical to what the old one-line rule produced.

**Why not drop back to the last `/` or to the `?`:** on an oversized path the last `/` can be at index 14, so dropping back to it would truncate a 2048-byte result to its authority — discarding roughly two kilobytes that a segment-boundary cut would have kept. The plan names that outcome explicitly as exceeding the bound ("truncates back to the head"), so it was not taken.

**Case title:** `THE NO-SEPARATOR BRANCH: with no `&` inside the cut the byte cut STANDS, and that is where the residual lives (WR-22)`

### BOTH STOP-CONDITION MEASUREMENTS, RECORDED TOGETHER

They guard one sentence — *"the change retains strictly less, bounded at one trailing segment's worth of output"* — so they are recorded beside it.

**Stop condition 1 — the swept fixtures.** Segments lost relative to the old byte cut, over n = 1..40 at 900 parameters, counted by splitting both outputs on `&`:

```
MAX SEGMENTS LOST vs OLD BYTE CUT, over n=1..40: 1
MAX BYTES DROPPED BELOW URL_MAX: 48
```

**One segment. Never two. The stop condition did NOT fire.**

**Stop condition 2 — the no-separator branch, which has no boundary to count against.** Measured on its own inputs, comparing the branch's output against what the old byte cut produced on the same input:

```
oversized path, no query:        len=2048 identicalToOldByteCut=true bytesDroppedBeyondByteCut=0 idempotent=true
oversized path + `;` param:      len=2048 identicalToOldByteCut=true bytesDroppedBeyondByteCut=0 idempotent=true
single enormous query segment:   len=2048 identicalToOldByteCut=true bytesDroppedBeyondByteCut=0 idempotent=true
long head then one param:        len=2048 identicalToOldByteCut=true bytesDroppedBeyondByteCut=0 idempotent=false
```

**Zero bytes discarded beyond the byte cut, on every measured input — this branch retains exactly what it retained before the change. The stop condition did NOT fire.** The autonomous framing continues to describe the change: strictly less retention overall, bounded at one trailing segment, and nothing at all lost in the branch with no boundary.

### WHAT THE FOURTH ROW MEANS — the surviving residual, stated because it is a genuine one

`long head then one param` is **not a fixed point**. It is the class the sweep cannot reach: a query of a single segment, cut inside that segment's NAME, with no `&` to drop back to. Executed bytes:

```
pad=2028 A="ppppp?nnn=" lenA=2048  B="ppppppppp?<red" lenB=2048
pad=2029 A="pppppp?nnn" lenA=2048  B="pppppppppp?<re" lenB=2048
pad=2030 A="ppppppp?nn" lenA=2048  B="ppppppppppp?<r" lenB=2048
pad=2031 A="pppppppp?n" lenA=2048  B="pppppppppppp?<" lenB=2048
```

And a second, milder class — a head-side cut severing a `;` parameter's marker, which **is** stable:

```
SEVERED HEAD MARKER pad=2010 tail="jsessionid=<redacted" idempotent=true
```

**Neither discloses anything new**: no production path applies `normaliseObservedUrl` twice — `recordObservation` runs it once per row. Both are pinned by executed bytes in the case above, and both are disclosed in `schema.spec.ts`. **This is why this SUMMARY does not say "idempotent for every input".** It says: a fixed point across the swept range, with these two classes named.

## 7. EVERY `URL_MAX` ASSERTION, LOCATED BY GREP AND RE-DERIVED ONE AT A TIME

`grep -rn "URL_MAX"` over the whole repository found **11 occurrences across 2 files** — 2 in `observations.ts` (the definition and its use), 1 mirror-constant definition plus 5 assertions in `observations.spec.ts`, and 3 title/comment mentions. `schema.spec.ts` has none. Every assertion, individually:

| # | Site | Was | Now | Why |
|---|------|-----|-----|-----|
| 1 | `observations.spec.ts:46` — the mirror `const URL_MAX = 2048` | docblock said the literal exists so "the ordering case below can assert against it" | unchanged value; docblock amended to state that `URL_MAX` is now an **upper bound, not the output's length**, and that each assertion says at its own site which of three things it means | The constant is not an assertion, but its docblock was the file's only explanation of what the number means, and that meaning changed |
| 2 | IN-18 case — `expect(out.length).toBe(URL_MAX)` | "exactly the bound" — the byte cut landed here | `toBeLessThanOrEqual(URL_MAX)` **and** `toBe(2039)` | It meant "the byte cut landed here". It now means "at most the bound, and short of it by exactly the segment the byte cut would have severed" — **both halves written out.** Relaxing to the inequality alone would have stopped measuring the dropped segment, which is the thing this case now exists to pin |
| 3 | IN-18 case — `expect(out.slice(out.lastIndexOf("&") + 1)).toBe("p133=<re")` | the measured tail: a name, its `=`, and a **severed** marker | `toBe("p132=<redacted>")` | Not a relaxation: the asserted shape no longer exists on this input. Re-derived from an execution, and it is a **whole** segment |
| 4 | P5-D8 ordering case — `expect(out.length).toBeLessThanOrEqual(URL_MAX)` | "at most the bound" | **unchanged**, with a comment recording why | This one always meant "at most". The redacted form of its input is far shorter than `URL_MAX`, so no truncation runs at all — it measures the ordering, not the truncation strategy. Changing it would have been noise |
| 5 | `still bounds the result at URL_MAX when the PATH alone is oversized` — `expect(out.length).toBe(URL_MAX)` | "exactly the bound" | **kept as equality**, with a comment | The input carries no `?` at all, so it takes the **no-separator branch** and the byte cut stands. `URL_MAX` is still the exact output length HERE. Relaxing it because a sibling assertion needed relaxing would have silently stopped measuring this branch |
| 6 | head-side `still strips the fragment and still bounds the result at URL_MAX` — `expect(long.length).toBe(URL_MAX)` | "exactly the bound" | **kept as equality**, with a comment | Same reason as #5: the cut lands in the HEAD, no `?` inside it, no-separator branch, exact length still the fact worth asserting |

**No blanket relaxation was applied.** Two of the four length assertions were kept as strict equality precisely because they exercise the branch where equality is still the truth; one was split into both halves rather than weakened to one; one was left alone.

Three new `URL_MAX` assertions were added by this plan (in the sweep's byte-cut reconstruction and in the no-separator case), each stating its meaning at its site.

## 8. NO REDACTION WAS REOPENED — PROVEN BY THE TABLES, WITH COUNTS

Per-`describe` test counts from the JSON reporter, so a silently shrunken table is visible:

| Block | Table size | Tests |
|-------|-----------|-------|
| `a BARE query segment carrying a credential (P10-D1, T-01-53)` — the `BARE_CREDENTIAL_SHAPES` block | 13 shapes | **83** |
| `a PADDED credential segment — the `=` was padding, not a separator (CR-07, T-01-78)` | — | **8** |
| `the URL HEAD — userinfo and `;` path parameters (WR-11, T-01-57, T-01-58)` — the `HEAD_CASES` block | 25 cases | **33** |
| `redactUrlHead in isolation — the authority is resolved, never searched for` | — | **6** |
| `recordObservation writes the redacted URL, not the raw one` — the real-SQLite round trip | — | **5** |
| `redactQueryValues` | — | **13** |
| `RESIDUALS this rule deliberately LEAVES (CR-07)` | — | **5** |
| `normaliseObservedUrl` | — | **7** (was 4) |
| pattern-gate blocks (3) | — | **25** |
| **File total** | | **185** (was 182) |

All green. The proof that a truncation change did not reopen a redaction is these tables running, not an argument that the diff was elsewhere.

## 9. THE INVARIANT SENTENCE — SCOPED, NOT DELETED

**What was done and why: SCOPED.** The reasoning the sentence offered (`QUERY_VALUE_REDACTION` contains no `=`, so a second pass arrives at a bare segment and is replaced with the same bytes) is *sound* — and it is sound *about the helper*. Deleting it would have thrown away a correct and useful explanation to fix a scoping error. What was wrong was the scope: it ended the docblock unqualified, in a module whose durable column is written through the **composed** function, and a reader takes the last sentence of a docblock for the module's guarantee.

The amended block, whole:

```
 * IDEMPOTENT IN ALL THREE BRANCHES — OF THIS HELPER, AND OF THIS HELPER ONLY.
 * `QUERY_VALUE_REDACTION` contains no `=`, so on a second pass it arrives here as
 * a bare segment and is replaced with the same bytes.
 *
 * SCOPED 2026-08-22 (WR-22) rather than deleted, because the reasoning above is
 * sound and worth keeping — what was wrong was the sentence's SCOPE, and a reader
 * needs to see which. It ended this docblock unqualified, and a reader took it for
 * the function the durable column is actually written through. It was TRUE here
 * and FALSE of {@link normaliseObservedUrl}, which TRUNCATES after redacting: a cut
 * landing just after a `=` handed the second pass a segment with an EMPTY value
 * half, which the padding branch immediately below redacts WHOLE — destroying the
 * retained name. Swept at 900 parameters before the repair, 25 of 40
 * parameter-name lengths were not fixed points, the first at n=4:
 *
 *   pass1  "…p111=<redacted>&pppp112="   len 2048
 *   pass2  "…p111=<redacted>&<redacte"   len 2048
 *
 * NOTHING LEAKED and no sentence here should be read as saying otherwise: the half
 * destroyed is a parameter NAME, which policy retains anyway, and
 * `recordObservation` applies the composition ONCE per row.
 *
 * THE COMPOSED FUNCTION'S FIXED POINT IS NOT CLAIMED HERE. It is asserted by the
 * sweep in `observations.spec.ts` titled "IDEMPOTENT AT THE `URL_MAX` CUT: swept
 * across parameter-name length, not hard-coded (WR-22)", which proves it across the
 * range it swept and no wider. The classes that sweep does not reach are DISCLOSED
 * in `schema.spec.ts`'s `observations.url` entry and pinned by executed cases —
 * never claimed away by a sentence in this module.
 */
```

The sentence no longer stands unqualified under any reading, and the module makes **no** claim about the composed function's fixed point — it points at the sweep instead.

## 10. IN-18 — RESOLVED BY EXECUTION

**The executed output that decided the outcome**, run against the amended function on IN-18's own 140-parameter fixture:

```
IN18 len=2039
IN18 lastSeg="p132=<redacted>"
IN18 idempotent=true
IN18 endsInsideMarker=false
```

**Outcome: CLOSED.** The severed-marker behaviour IN-18 pinned — a tail of `"p133=<re"` at length exactly 2048 — no longer exists on that input. The output is 2039 bytes and ends on a whole segment.

The job IN-18 scoped, in its own words, was *"truncate on a `&` boundary rather than mid-marker, which drops the whole trailing segment instead of half a marker"*. That is exactly what task 1 did. IN-18 named "a later phase, alongside the `URL_MAX` bound itself" as owner; that ownership is discharged here, and **the sentence does not survive**.

The amended case, whole:

```ts
  it("CLOSED 2026-08-22 (IN-18, by WR-22): the URL_MAX cut no longer lands INSIDE a `<redacted>` marker — it drops the WHOLE trailing segment, and this case now pins that", () => {
    // The bytes below were read off an execution, not reasoned to — both the ones
    // that used to be here and the ones that replaced them.
    //
    // WHAT THIS CASE USED TO BE, and why the record is kept rather than the
    // history quietly rewritten. It was a RESIDUAL pin: the `URL_MAX` byte cut
    // could land mid-marker, leaving a tail of `"p133=<re"`, and the case declined
    // the obvious repair with this reasoning —
    //
    //   "The obvious repair — drop the partial marker so the string ends `…&p133=`
    //    — INTERACTS with this plan's new branch: a segment whose value half is
    //    empty now redacts WHOLE, so a second pass over `…&p133=` produces
    //    `…&<redacted>` and the idempotence invariant asserted across every case in
    //    this file breaks."
    //
    // WHY THAT RATIONALE IS GONE, and it is gone under either outcome rather than
    // superseded by a better one. It defers on the strength of an invariant THE
    // SAME BRANCH HAD ALREADY BROKEN, on an input the repair has nothing to do
    // with: swept at 900 parameters, `normaliseObservedUrl` was not a fixed point
    // at 25 of 40 parameter-name lengths, the first at n=4. There was no invariant
    // left to protect. A finding cannot be deferred to protect something already
    // broken, and this comment is the record that it was.
    //
    // THE JOB IT SCOPED — "truncate on a `&` boundary rather than mid-marker,
    // which drops the whole trailing segment instead of half a marker" — WAS DONE,
    // by plan 01-20, in `normaliseObservedUrl`. It named "a later phase" as owner;
    // that ownership is discharged here and the sentence does not survive.
    //
    // WHAT THIS CASE PINS NOW: the amended behaviour, on the same fixture, read
    // off an execution —
    //
    //   len 2039 (BELOW `URL_MAX`, by exactly the dropped segment)
    //   last segment "p132=<redacted>"   — whole, not severed
    //   second pass === first pass
    //
    // so a future change to the truncation strategy goes RED here rather than
    // silently reintroducing a severed marker.
    const parts: string[] = [];
    for (let i = 0; i < 140; i += 1) parts.push(`p${String(i)}=v`);
    const out = normaliseObservedUrl(
      `https://cdn.test/a.js?${parts.join("&")}`,
    );

    // RE-DERIVED 2026-08-22 (WR-22). This read `toBe(URL_MAX)` and meant
    // "the byte cut landed here". It now means "at most the bound, and short of
    // it by exactly the segment the byte cut would have severed" — so it is
    // written as both halves rather than relaxed to the weaker one.
    expect(out.length).toBeLessThanOrEqual(URL_MAX);
    expect(out.length).toBe(2039);
    // The measured tail: a WHOLE segment. It read `"p133=<re"` — a name, its `=`
    // and a severed marker — and that shape no longer exists on this input.
    expect(out.slice(out.lastIndexOf("&") + 1)).toBe("p132=<redacted>");
    // Still a fixed point, now because the cut fell on a boundary rather than
    // because a severed marker happened to re-truncate to the same byte.
    expect(normaliseObservedUrl(out)).toBe(out);

    // The empty-value-half behaviour that the deleted rationale treated as an
    // obstacle. It is unchanged — CR-07's branch is untouched by plan 01-20 — and
    // it is kept here because it is worth pinning on its own account, not because
    // it still blocks anything.
    expect(normaliseObservedUrl("https://cdn.test/a.js?p133=")).toBe(
      `https://cdn.test/a.js?${QUERY_VALUE_REDACTION}`,
    );
  });
```

**The deferral rationale is gone.** It is quoted inside the comment as a record of what was said and why it was wrong — not left standing as reasoning. The case survives as a pin on the **new** behaviour, so a future change to the truncation strategy goes red here.

## 11. THE NEW DISCLOSURE IN `schema.spec.ts`

Added to the `observations.url` entry, in the entry's existing per-grammar / per-tier format (UNIT tier attribution, ENFORCED-vs-OPEN split, named pinning case):

```
 *                               THE TRUNCATION, and what it costs (added
 *                               2026-08-22, plan 01-20, WR-22). "Truncated to
 *                               2048" above is an UPPER BOUND, not the stored
 *                               length. Past `URL_MAX` the cut drops back to the
 *                               last `&`, so the value ends on a WHOLE query
 *                               segment rather than inside one — never inside a
 *                               `<redacted>` marker. THE COST, measured and not
 *                               estimated: exactly ONE trailing segment more than
 *                               the old byte cut discarded, and that segment is a
 *                               parameter NAME the operator's UAT decision of
 *                               2026-08-21 chose to keep. It is accepted because
 *                               the old rule already mangled that same fragment
 *                               into a severed marker, so the direction is
 *                               strictly LESS retention. Rows written before this
 *                               date carry the old shape and are NOT rewritten
 *                               (decision P8-D1), so this column holds both.
 *                               UNIT — `observations.spec.ts`'s "the truncation
 *                               drops a WHOLE trailing segment, never half of
 *                               one, and never more than one (WR-22)".
 *                               OPEN, and stated no wider than the evidence: the
 *                               truncation is a FIXED POINT ACROSS THE RANGE
 *                               SWEPT — parameter-name lengths 1..64 at 300 and
 *                               900 parameters, 128 cuts — and NOT for every
 *                               possible input. TWO classes the sweep does not
 *                               reach, both in the NO-SEPARATOR branch, where
 *                               there is no `&` inside the cut to drop back to
 *                               and the byte cut therefore STANDS: (1) a cut
 *                               landing in the HEAD can still sever a `;`
 *                               parameter's marker — severed but STABLE, since a
 *                               second pass re-expands and re-truncates to the
 *                               same byte; and (2) a query of a SINGLE segment
 *                               cut inside its NAME is NOT a fixed point at all —
 *                               the partial name is a bare segment on the second
 *                               pass and is redacted whole. NEITHER discloses
 *                               anything new: no production path applies
 *                               `normaliseObservedUrl` twice, since
 *                               `recordObservation` runs it once per row. NOT
 *                               CLOSED because the repair — dropping back to the
 *                               last `/` or to the `?` — would truncate an
 *                               oversized path back to its authority, discarding
 *                               far more than one trailing segment and reopening
 *                               a retention question decisions P8-D1 and P10-D1
 *                               settled. PINNED by "THE NO-SEPARATOR BRANCH: with
 *                               no `&` inside the cut the byte cut STANDS, and
 *                               that is where the residual lives (WR-22)", which
 *                               asserts BOTH classes and goes RED the day either
 *                               is closed. UNIT.
```

**The assertion that pins it:**
`THE NO-SEPARATOR BRANCH: with no `&` inside the cut the byte cut STANDS, and that is where the residual lives (WR-22)`

It contains `expect(singleTwice).not.toBe(single)` and `expect(headCut.slice(-20)).toBe("jsessionid=<redacted")` — **both go RED the day either residual is closed**, exactly as the two existing OPEN grammars' pins do.

**The disclosure claims no more than the sweep proved.** Swept range: parameter-name lengths **1..64** (the whole of `QUERY_NAME_MAX`) at **300 and 900** parameters, **128 cuts**, plus a one-off 1500-parameter widening to 192. Input classes **outside** it, named rather than glossed: (1) head-side cuts with no `?` inside the cut; (2) single-segment queries with no `&` inside the cut; (3) parameter names longer than `QUERY_NAME_MAX` = 64 (they are bounded to 64 by the redaction before the truncation ever runs, so they collapse into the swept range, but the sweep does not drive them directly); (4) percent-encoded and non-ASCII segment bytes, which the sweep uses ASCII `p` for throughout.

## Decisions Made

- **P20-D1 — segment-boundary truncation.** Cut to `URL_MAX`; if that cut severed a query segment, drop back to the last `&`. Cost measured at exactly one trailing segment, never two. A cut already landing on a boundary loses nothing.
- **P20-D2 — the no-separator branch keeps the byte cut.** With no `?` inside the cut, or a query with no `&` inside it, the old behaviour stands unchanged. Rationale: the alternatives (drop back to the last `/`, or to the `?`) would truncate an oversized path back to its authority, discarding ~2 KB a segment-boundary cut would have kept — a materially larger retention decision than the one this plan is scoped to, and one belonging to the operator by the same test P8-D1 and P10-D1 were settled under.
- **P20-D3 — the idempotence sentence is scoped, not deleted.** The reasoning is correct about the helper and worth keeping; only its scope was wrong.
- **P20-D4 — IN-18 is closed, not re-pinned.** Its stated reason is deleted rather than replaced, because it deferred a repair in order to protect an invariant that the very branch it named had already broken.

## Deviations from Plan

None — plan executed as written. Two things the plan anticipated but did not predict in detail are recorded above rather than as deviations:

- The pre-fix sweep found **two** mechanisms, not one: the empty-value-half cut WR-22 names, and a cut landing inside a parameter NAME (an `=`-less segment under P10-D1), which is older than CR-07 and had never been named. Both are closed by the same repair. This is the sweep doing its job — a hard-coded fixture would have found at most the one it was written for.
- The plan predicted the no-separator branch would be "the branch most likely to be the surviving residual". It is, and one of its two classes is a genuine fixed-point failure rather than merely a severed-but-stable fragment. Both are disclosed and pinned rather than smoothed over.

**Total deviations:** 0. **Impact on plan:** none.

## Stop Conditions

Both fired **NO**. Recorded together in section 6, beside the sentence they guard:

- **Swept fixtures:** max 1 segment lost vs the old byte cut, over 40 lengths at 900 parameters. Bound holds.
- **No-separator branch:** 0 bytes discarded beyond the byte cut on all 4 measured inputs — this branch retains exactly what it retained before. Bound holds.

The plan's autonomous framing — "retains strictly less, bounded at one trailing segment's worth of output" — continues to describe the change accurately, so no operator checkpoint was opened.

## Known Stubs

None. No stub, placeholder, `TODO`, `FIXME` or skipped test was introduced. The two residuals disclosed in section 6 are pinned by executed assertions that go red the day they are closed — they are documented open behaviour with a named non-closure reason, not unwired code.

## Threat Flags

None. This plan opened no network endpoint, no auth path, no file access pattern and no schema change. The one trust boundary it touches — what lands in the durable `observations.url` column — moves in the **strictly-less-retention** direction and was already in the plan's `<threat_model>` as T-01-113 and T-01-119.

## Issues Encountered

One, resolved: three prettier formatting violations after the new spec cases were inserted. Fixed with `pnpm exec prettier --write` and re-verified (`pnpm lint` exit 0, suite re-run green) before the task 1 commit.

## Verification Results

| # | Check | Result |
|---|-------|--------|
| 1 | `git status --porcelain packages/` clean at start | PASS (empty) |
| 2 | Defect reproduced by executor's own sweep before the fix | PASS — n=4 first, 25/40 differing, tails pasted |
| 3 | Same sweep after the fix finds no differing length | PASS — 0/40, and 0/192 on the widened range |
| 4 | Sweep is in the suite and reports its own counterexample | PASS — source pasted, 128 cuts |
| 5 | Mutation proof executed | PASS — 88/128 RED with lengths and tails; restored; 185/185 green; diff clean |
| 6 | No-separator branch decided, documented, asserted, and measured against the bound | PASS — both measurements recorded, neither stop condition fired |
| 7 | Every `URL_MAX` assertion re-derived individually | PASS — 6-row table, no blanket relaxation |
| 8 | `BARE_CREDENTIAL_SHAPES` / `HEAD_CASES` / real-SQLite green with counts | PASS — 83 / 33 / 5, table sizes 13 and 25 |
| 9 | Idempotence sentence scoped; docblock pasted | PASS |
| 10 | IN-18 resolved by execution; amended case pasted; old rationale gone | PASS — closed |
| 11 | `schema.spec.ts` disclosure pasted, pinned, no wider than the evidence | PASS |
| 12 | Accepted cost measured: one segment | PASS — `worstSegmentsLost === 1`, asserted in the suite |
| 13 | `pnpm test` | PASS — **31 files / 1082 tests**, zero failures (≥31 / ≥1044 required) |
| 14 | `pnpm typecheck` / `pnpm lint` / `pnpm knip` | PASS — all exit 0 |
| 15 | `pnpm build:backend && pnpm check:bundle` | PASS — `1 import specifier(s): crypto` |
| 16 | `git diff --exit-code` on `outbound-prohibition.spec.ts`, `error-redaction.spec.ts`, `tests/`, `scripts/` | PASS — clean |
| 17 | `git diff --exit-code` on `01-01`..`01-19` PLANs, `01-VERIFICATION.md`, `01-REVIEW.md`, `01-UAT.md` | PASS — clean |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

WR-22 and IN-18 are both closed. The suite baseline for the next wave is **31 files / 1082 tests** (up from 1079 entering this wave; +3 from `observations.spec.ts`'s 182 → 185).

Carried forward for the phase verifier and for whoever revisits `URL_MAX`:

- The `observations.url` column now holds **two shapes** — rows written before 2026-08-22 end mid-segment, rows written after end on a segment boundary. No row was rewritten (decision P8-D1 stands).
- Two disclosed OPEN residuals in the no-separator branch, both pinned. Closing either requires deciding whether an oversized path may be truncated back further than one trailing segment, which is an operator decision, not an executor one.
- Plan 01-21 (`error-redaction.spec.ts`) and 01-22 (`tests/pins.spec.ts`, `scripts/phase1/tracer-e2e.sh`) are untouched and unblocked.

## Self-Check: PASSED

- `packages/backend/src/store/observations.ts` — FOUND
- `packages/backend/src/store/observations.spec.ts` — FOUND
- `packages/backend/src/store/schema.spec.ts` — FOUND
- Commit `693cfd9` — FOUND
- Commit `ff0f3c1` — FOUND

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*
