---
phase: 01-skeleton-persistence-compatibility
plan: 34
subsystem: testing
tags: [outbound-gate, typescript-ast, measured-silence, derived-residual, redaction, disclosure]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "wave 33's whole-file wrap-tolerant quantifier guard, HEADER_QUANTIFIER_EXEMPTIONS, and the header stripped of every hand-written bound"
provides:
  - "CR-15 and CR-16 disclosed as named rows in the derived residual, with executed probes and executed counter-probes"
  - "three widenings, each taken only after cheap / obviously correct / measured were answered in writing"
  - "a third residual mechanism nobody predicted — an outbound constructor in receiver position — found by re-measuring"
  - "the head-side truncation discriminator re-derived from a sweep across four parameter-name lengths"
  - "the rendered-error spread residual split into the three mechanisms it actually exhibits"
  - "dated CORE-11, STORE-03 and STORE-07 ledger corrections that say plainly no class was ended"
affects: [wave 35, CORE-11 checkbox, outbound gate reach, requirements ledger]

actuals:
  tokens: 96000
  tasks: 3
  commits: 9

tech-stack:
  added: []
  patterns:
    - "row-first disclosure: the measured-silence row lands and commits BEFORE any branch exists, so the disclosure is the deliverable and a branch beside it is a bonus"
    - "narrow-by-measurement: a row whose probe starts reporting is cut back to the mechanism that survives, never deleted wholesale and never left standing"
    - "effect-only mutation: neuter the branch's `add(...)` while leaving its condition and anchor line byte-identical, so the proof is of the BRANCH and not of the line"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - packages/backend/src/store/observations.spec.ts
    - packages/backend/src/store/schema.spec.ts
    - packages/backend/src/store/observations.ts
    - packages/backend/src/store/error-redaction.spec.ts
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "CR-15 and CR-16 were DISCLOSED, not closed. The deliverable is a row on a derived list, not a branch."
  - "Three widenings taken as a bonus, each gated on cheap + obviously correct + measured, all three answered in writing."
  - "WR-41 disposition: DISCLOSE, not widen. The module-loader surface is bounded from the other end by check:bundle."
  - "IN-32 disposition: bound the `asserted both ways` claim rather than change behaviour — it errs safe."
  - "The CR-16 row was NARROWED to the resolution boundary after measurement contradicted the plan's prediction."

patterns-established:
  - "Disposition vocabulary of exactly three words — DISCLOSE, DISCLOSE AND WIDEN, DEFER — one per finding, each with an executed measurement"
  - "A widening's residual is re-measured and re-rowed in the same commit; an unmeasured residual converts a disclosed silence into an undisclosed one"

requirements-completed: [CORE-11, STORE-03, STORE-07]

coverage:
  - id: D1
    description: "CR-15 — the receiver-position family disclosed by row in the derived span, with executed probes and counter-probes"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#registry row silence-global-fetch-receiver-position — its probe AND its counter-probe are executed against auditSource"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#registry row silence-bare-global-argument-position — its probe AND its counter-probe are executed against auditSource"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte"
        status: pass
    human_judgment: false
  - id: D2
    description: "CR-16 — an unreadable computed member on an identified navigator receiver disclosed by row, and the arm widened to accept that receiver"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-unanalysable fires on an unreadable computed member of an identified `navigator` receiver — with the DESTRUCTURE spelling that already reported as the control in the same case"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#registry row silence-unreadable-member-of-navigator — its probe AND its counter-probe are executed against auditSource"
        status: pass
    human_judgment: false
  - id: D3
    description: "The receiver-position arm and the dynamic-code receiver arm, each with an exactly-once control and each mutation-proved separately"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-fetch fires on the global in RECEIVER position, and on an identified alias in the same position — with the CALLEE spelling of that alias as the control in the same case"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the member-qualified global fetch under `.call` reports EXACTLY ONCE — the receiver-position arm does not double the arm above it"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#outbound-dynamic-code fires on a dynamic-code global in RECEIVER position, and through an alias in the same position"
        status: pass
    human_judgment: false
  - id: D4
    description: "WR-39 — the head-side discriminator re-derived across four parameter-name lengths, the branch selector asserted, the byte-identical duplicate deleted"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#THE NO-SEPARATOR BRANCH: with no `&` inside the cut the byte cut STANDS, and the residual that lives there is SWEPT, not pinned at one chosen offset (WR-22/WR-28/WR-29)"
        status: pass
      - kind: other
        ref: "grep -c 'shape (2) SHRINKS and shape (3) does not' packages/backend/src/store/observations.spec.ts == 0; grep -c 'does NOT shrink' over schema.spec.ts and observations.ts == 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "WR-40/WR-42 — the spread residual split into three mechanisms, both pinned cases re-titled by mechanism, one example of an open class pinned"
    requirement: "STORE-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#RESIDUAL, ONE EXAMPLE OF AN OPEN CLASS PINNED (WR-42): the TOP-LEVEL spread of the caught binding into the returned literal — the plainest spelling an author would type, and the one a reader looks for and does not find"
        status: pass
      - kind: other
        ref: "grep -c 'the three SPREAD shapes' packages/backend/src/store/error-redaction.spec.ts == 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "The dated CORE-11, STORE-03 and STORE-07 ledger corrections, both pointer surfaces, and the full gate set"
    requirement: "CORE-11"
    verification: []
    human_judgment: true
    rationale: "Whether a paragraph of prose successfully prevents a reader from mistaking a disclosure for a closure is a judgement no assertion makes. The mechanical halves — append-only, checkbox byte-unchanged, span byte-identical, one open ledger entry — are all asserted; the readability of the disclaimer is not."

duration: 41 min
completed: 2026-08-25
status: complete
---

# Phase 01 Plan 34: Disclose CR-15 and CR-16 Summary

**Two shapes were put onto the derived list with executed probes and executed counter-probes, three cheap-and-obvious-and-measured widenings were taken beside them as a bonus, everything still silent afterwards was rowed — and NO CLASS WAS ENDED.**

## Performance

- **Duration:** 41 min
- **Tasks:** 3
- **Files modified:** 8
- **Commits:** 9

---

## THE ONE SENTENCE THIS WAVE OWES ITS READER

**This wave DISCLOSED two shapes and ENDED NO CLASS.** Closing them is not what earns
CORE-11's `[x]` under the bar the operator adopted — DERIVED, DRIFT-DETECTABLE, SOLE BOUND
— and the class is open because the space of JavaScript spellings that reach a function
through a value is open. **CORE-11's box is untouched and belongs to wave 35.**

---

## 1. THE BEFORE TABLE — the receiver-position family, executed at HEAD before any edit

Run through `auditSource` at `d05fe52`, before the first edit:

| # | Shape | Source | Result |
|---|---|---|---|
| S1 | fetch as receiver of `.call` | `fetch.call(null, url);` | `[]` |
| S2 | fetch as receiver of `.apply` | `fetch.apply(null, [url]);` | `[]` |
| S3 | fetch as receiver of `.bind` | `const f = fetch.bind(null);\nf(url);` | `[]` |
| S4 | fetch as an ARGUMENT | `Reflect.apply(fetch, null, [url]);` | `[]` |
| S5 | eval as receiver of `.call` | `eval.call(null, src);` | `[]` |
| S6 | Function as receiver of `.call` | `Function.call(null, src);` | `[]` |
| S7a | identified alias as RECEIVER | `const f = fetch;\nf.call(null, url);` | `[]` |
| S7b | **the same alias as CALLEE** | `const f = fetch;\nf(url);` | `["outbound-fetch"]` |
| T1 | SDK send under `.call` | `sdk.requests.send.call(null, req);` | `["outbound-send"]` |
| T2 | SDK send under `.bind` | `const s = sdk.requests.send.bind(sdk.requests);\ns(req);` | `["outbound-send"]` |
| T3 | SDK send via `Reflect.apply` | `Reflect.apply(sdk.requests.send, sdk.requests, [req]);` | `["outbound-send"]` |
| T4 | member-qualified fetch, `.call` | `globalThis.fetch.call(null, url);` | `["outbound-fetch"]` |
| T5 | member-qualified fetch, `.bind` | `const f = globalThis.fetch.bind(null);\nf(url);` | `["outbound-fetch"]` |
| T6 | navigator beacon under `.call` | `navigator.sendBeacon.call(navigator, u, d);` | `["outbound-beacon"]` |

**RECONCILIATION AGAINST THE VERIFIER'S OWN TABLE: NO DISAGREEMENT.** Seven silent, six
reporting twins, and the S7a/S7b pair — the same identified binding, one position over,
two answers — reproduced exactly. Nothing was absorbed and nothing was adopted silently.

**THE SPAN'S PRE-WAVE VOCABULARY, MEASURED AT HEAD** over the 510-line span extracted from
`.planning/REQUIREMENTS.md`:

```
BEFORE \.call             0
BEFORE \.apply            0
BEFORE \.bind             0
BEFORE Reflect            0
BEFORE navigator\[        0
BEFORE require(           0
BEFORE tagged template    1
```

All six zeros reproduce the planner's measurement. A reader of the residual OF RECORD
learned nothing whatever about any shape in this plan.

---

## 2. THE ROW-FIRST COMMIT — and the sentence the plan requires

```
$ git log --oneline
d971aa7 feat(01-34): disclose the receiver-family by row — four mechanisms, no branch yet
```

**THAT COMMIT ALONE SATISFIES THIS WAVE'S BAR FOR THE RECEIVER-POSITION FAMILY.** Both byte
comparisons were green *in that commit* — `pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts` returned
`Tests 414 passed (414)` immediately before it was made, and the two cases
`the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY), byte for byte`
and its `.planning/REQUIREMENTS.md` twin are among those 414. No branch existed at that
point. Everything after it is a bonus, and this SUMMARY says so in those words.

**measured-silence count, executed:**

```
$ grep -c 'kind: "measured-silence"' packages/backend/src/outbound-prohibition.spec.ts
16      # before (HEAD d05fe52)
26      # after  (HEAD a056031)
```

Strictly greater, and moving it UP is the honest direction.

---

## 3. THE THREE-CONDITION TEST — a verdict per condition, per widening

| Widening | CHEAP | OBVIOUSLY CORRECT | MEASURED | Taken? |
|---|---|---|---|---|
| **Receiver-position arm (fetch surface)** | PASS — one `else if` beside three arms that already anchor on a positively identified receiver | PASS — `globalThis.fetch.call(null, url)` already reported through the arm above it, so the machinery existed and was not reached | PASS — thirteen shapes executed before, eighteen after, both tables here | **YES** |
| **Dynamic-code receiver arm** | PASS — one `else if` mirroring the arm above it | PASS — `globalThis.eval.call(null, src)` already reported `outbound-dynamic-code` | PASS — nine shapes executed before and after | **YES** |
| **`navigator` admitted to the unreadable-member arm** | PASS — one `\|\|` on an existing guard | PASS — `globalThis`, `window`, an identified send receiver AND the navigator DESTRUCTURE twenty lines away all reported the identical shape | PASS — ten shapes before, eleven after | **YES** |

No widening was made on two conditions out of three, and none was made without its
after-table.

---

## 4. THE AFTER TABLE — same shapes, after all three widenings

| # | Shape | BEFORE | AFTER |
|---|---|---|---|
| S1 | `fetch.call(null, url);` | `[]` | `["outbound-fetch"]` |
| S2 | `fetch.apply(null, [url]);` | `[]` | `["outbound-fetch"]` |
| S3 | `const f = fetch.bind(null); f(url);` | `[]` | `["outbound-fetch"]` |
| S4 | `Reflect.apply(fetch, null, [url]);` | `[]` | **`[]` — STILL SILENT, ROWED** |
| S5 | `eval.call(null, src);` | `[]` | `["outbound-dynamic-code"]` |
| S6 | `Function.call(null, src);` | `[]` | `["outbound-dynamic-code"]` |
| S7a | `const f = fetch; f.call(null, url);` | `[]` | `["outbound-fetch"]` |
| S7b | `const f = fetch; f(url);` | `["outbound-fetch"]` | `["outbound-fetch"]` |
| T1–T6 | the six reporting twins | report | report, unchanged |
| T4 | `globalThis.fetch.call(null, url);` | once | **once — verified after the widening** |
| N1 | `fetch["ca" + "ll"](null, url);` | `[]` | **`[]` — STILL SILENT, ROWED** |
| N3 | `fetch(url);` | once | **once — the plain call did not double** |
| N4 | `obj.fetch(url);` | `[]` | `[]` — the arm did not become a catch-all |
| D1 | `const e = eval; e.call(null, src);` | `[]` | `["outbound-dynamic-code"]` |
| D2 | `globalThis.eval.call(null, src);` | once | **once** |
| D4 | `eval["ca" + "ll"](null, src);` | `[]` | **`[]` — STILL SILENT, ROWED** |
| D5 | `WebSocket.call(null, u);` | `[]` | **`[]` — STILL SILENT, ROWED (unpredicted)** |

**THE MEMBER-QUALIFIED SPELLING REPORTS EXACTLY ONCE.** The `ts.isIdentifier(unwrap(node.expression))`
restriction in both new arms is load-bearing, not tidiness: without it the outer node
`globalThis.fetch.call` reports through the new arm while the inner `globalThis.fetch`
reports through the old one, and the shape reports twice. Executed after the widening:
`["outbound-fetch"]`, one element. A dedicated case asserts it and says why.

### CR-16's eight shapes, before and after

| # | Shape | BEFORE | AFTER |
|---|---|---|---|
| C1 | `const m = "send" + "Beacon"; navigator[m](u, d);` | `[]` | `["outbound-unanalysable"]` |
| C2 | `const n = navigator; ... n[m](u, d);` | `[]` | `["outbound-unanalysable"]` |
| C3 | `function h(m) { return navigator[m](u, d); }` | `[]` | `["outbound-unanalysable"]` |
| C4 | `navigator["send" + "Beacon"](u, d);` | `[]` | `["outbound-unanalysable"]` |
| C5 | `globalThis.navigator[m](u, d);` | `[]` | `["outbound-unanalysable"]` |
| T7 | `sdk.requests[m](req);` | `["outbound-unanalysable"]` | unchanged |
| T8 | `globalThis[m](url);` | `["outbound-unanalysable"]` | unchanged |
| T9 | `window[m](url);` | `["outbound-unanalysable"]` | unchanged |
| T10 | the navigator DESTRUCTURE | `["outbound-unanalysable"]` | unchanged |
| T11 | `navigator.sendBeacon(u, d);` | `["outbound-beacon"]` | unchanged |
| X1 | `const m = "se" + "nd"; plain[m](x);` | `[]` | **`[]` — ordinary objects unaffected** |
| C7 | `function h(n) { ... n[m](u, d); } h(navigator);` | `[]` | **`[]` — STILL SILENT, ROWED** |
| C8 | `[navigator][0][m](u, d);` | `[]` | `[]` |

---

## 5. THE PREDICTION-VS-MEASUREMENT DISCREPANCIES — recorded, not absorbed

**There were TWO, and neither was absorbed.**

**(1) THE PLAN PREDICTED THE PARAMETER-KEY SPELLING WOULD SURVIVE THE NAVIGATOR WIDENING.
IT DOES NOT.** The plan's words: *"the parameter spelling — an unreadable member whose key
is a function parameter — stays silent after the widening for the reason
`silence-parameter-key` already records."* Measured: C3 reports `["outbound-unanalysable"]`.
The reason the prediction was wrong is worth the sentence: on a receiver the arm ACCEPTS,
`member === undefined` is the whole test, so an unreadable member reports whatever the
reason the key would not reduce, and the reason it is unbound never comes up.
`silence-parameter-key` is about a key not being marked unreadable, which is a different
question from whether the shape reports. The row written for that family was therefore
**NARROWED BY MEASUREMENT** to the mechanism that does survive — the RESOLUTION boundary
rather than the readability one: an unreadable member of a `navigator` handed across a
FUNCTION BOUNDARY is silent, the same limit `QUANTIFIED_CLAUSES.isFetchExpression` already
bounds for global receivers, cross-referenced there rather than duplicated.

**(2) A THIRD RESIDUAL MECHANISM NOBODY PREDICTED, FOUND BY RE-MEASURING AFTER THE
DYNAMIC-CODE ARM.** `WebSocket.call(null, u)` — an outbound CONSTRUCTOR global in receiver
position — is silent, and neither new arm reaches it: the fetch arm consults
`isFetchExpression`, the dynamic-code arm consults `dynamicCodeOf`, and `outboundCtorOf`
is consulted where a `new` target or a callee is expected. It has its own row,
`silence-outbound-ctor-receiver-position`, with `globalThis.WebSocket.call(null, u)` →
`["outbound-global-ctor"]` as counter-probe. **This is exactly the failure mode the plan
named:** a widening that moves some shapes and rows none of the survivors converts a
disclosed silence into an undisclosed one. It was caught by re-measuring rather than by
reasoning about the diff.

---

## 6. THE DISPOSITION TABLE — one row per finding, three-word vocabulary

| Finding | Executed measurement | Disposition | Reason |
|---|---|---|---|
| **CR-15** | 7 silent / 6 twins reporting before; 4 of 7 moved after the two arms | **DISCLOSE AND WIDEN** | Disclosure is the deliverable; both arms passed all three conditions. Everything still silent is rowed. |
| **CR-16** | 5 silent / 5 twins reporting before; all 5 moved after | **DISCLOSE AND WIDEN** | The destructure twenty lines away in the same rule proved the machinery existed and was not reached. |
| **Dynamic-code receivers** | `eval.call` and `Function.call` `[]`; `globalThis.eval.call` `["outbound-dynamic-code"]` | **DISCLOSE AND WIDEN** | A SECOND decision, not a footnote: this family resolves through `dynamicCodeOf`, not `isFetchExpression`. |
| **WR-41** | `const r = require; r("caido:http")` `[]`; `const r = require; r(s)` `[]`; direct spellings `["outbound-import"]` / `["outbound-unanalysable"]`; `await import(s)` `["outbound-unanalysable"]` | **DISCLOSE** | NOT widened, and the reason is in the row's own clause: the surface is bounded from the other end by `check:bundle`, asserted at exactly one import specifier, which a spec file never enters. Growing the resolver machinery here adds reach the bundle check already has. |
| **IN-31** | ``fetch`https://x/${p}` `` `[]`; `fetch("https://x")` `["outbound-fetch"]` | **DISCLOSE** | Contrived; rowed rather than branched. The row NAMES `silence-tagged-template-key` BY ID and states the two mechanisms differ, so a reader searching the span is redirected rather than misled. |
| **IN-32** | `const { ["sendBeacon"]: b } = navigator` `["outbound-unanalysable"]`; plain spelling `["outbound-beacon"]` | **DISCLOSE** | Errs SAFE — it reports, with the wrong rule id. The `asserted both ways` claim is BOUNDED rather than widened, and `boundPropertyName` now states its computed bound. Made executable by a fixture. |
| **IN-33** | one-deep `["outbound-send"]`; three-deep `[]`; array-nested `[]`; object→array `[]` | **DISCLOSE** | The DEPTH bound and the PATTERN-KIND bound now sit in `reportReceiverMembers`' own clause; both neighbours executed and rowed separately, because the two bounds are different. |
| **WR-39** | four name lengths swept; see §8 | **DISCLOSE (correction)** | A disclosure defect, corrected as one. The redaction did not move. |
| **WR-40 / WR-42** | seven shapes executed; see §9 | **DISCLOSE (correction)** | Three mechanisms, not one. The prohibition did not move. |
| **CR-14, WR-38, WR-43** | not touched | **DEFER BY OWNERSHIP** | Wave 33's. Editing that surface here would revise this plan's own dependency. `git diff` over the header region shows nothing from this wave. |

**No finding is absent, and none is marked resolved without an executed probe.**

---

## 7. EVERY NEW ROW, QUOTED

| id | mechanism | probe | expect | counterProbe | counterExpect |
|---|---|---|---|---|---|
| `silence-global-fetch-receiver-position` | an UNREADABLE computed member of the bare global fetch; the catch-all is guarded on the four global receivers and the bare global fetch is not one | `fetch["ca" + "ll"](null, url);` | `[]` | `globalThis["fet" + "ch"](url);` | `["outbound-unanalysable"]` |
| `silence-fetch-alias-receiver-position` | the unreadable half on an identified alias — the arm added needs a member name it can read | `const f = fetch;\nf["ca" + "ll"](null, url);` | `[]` | `const f = fetch;\nf.call(null, url);` | `["outbound-fetch"]` |
| `silence-bare-global-argument-position` | an identifier with no member written beside it is interrogated only where a CALLEE is expected | `Reflect.apply(fetch, null, [url]);` | `[]` | `Reflect.apply(sdk.requests.send, sdk.requests, [req]);` | `["outbound-send"]` |
| `silence-dynamic-code-global-receiver-position` | the unreadable half of the dynamic-code family | `eval["ca" + "ll"](null, src);` | `[]` | `eval.call(null, src);` | `["outbound-dynamic-code"]` |
| `silence-outbound-ctor-receiver-position` | an outbound CONSTRUCTOR in receiver position; `outboundCtorOf` is consulted where a `new` target or a callee is expected | `WebSocket.call(null, u);` | `[]` | `globalThis.WebSocket.call(null, u);` | `["outbound-global-ctor"]` |
| `silence-unreadable-member-of-navigator` | the RESOLUTION boundary, not the readability one — a navigator handed across a FUNCTION BOUNDARY | `function h(n) { const m = "send" + "Beacon"; return n[m](u, d); }\nh(navigator);` | `[]` | `const m = "send" + "Beacon";\nnavigator[m](u, d);` | `["outbound-unanalysable"]` |
| `silence-aliased-module-loader-specifier` | both directions of the loader rule are unreachable once the loader is bound to a local name | `const r = require;\nr(s);` | `[]` | `require(s);` | `["outbound-unanalysable"]` |
| `silence-tagged-template-fetch-call` | a tagged template is not a call expression, so the bare-global rule is never reached | ``fetch`https://example.test/${p}`;`` | `[]` | `fetch("https://example.test");` | `["outbound-fetch"]` |
| `silence-destructure-deeper-than-one` | the composition descends ONE element | `const { a: { requests: { send } } } = wrap;\nsend(req);` | `[]` | `const { requests: { send } } = sdk;\nsend(req);` | `["outbound-send"]` |
| `silence-destructure-array-nested` | the composition looks at an object binding pattern; an array one is a different node kind | `const [{ send }] = [sdk.requests];\nsend(req);` | `[]` | `const { requests: { send } } = sdk;\nsend(req);` | `["outbound-send"]` |

**QUANTIFIED_CLAUSES.isFetchExpression, before and after.**

BEFORE, its measured bound ended: *"…each MEASURED silent in this same session: a function
boundary …, an array-slot binding …, a class field and a parameter default - all report
NOTHING."* Receiver position was not named at all.

AFTER, appended in the same commit as the widening: *"WIDENED 2026-08-25 (CR-15, wave 34)
with RECEIVER POSITION, which this entry did not name at all before … MEASURED after that
widening `fetch.call(null, url)` reports outbound-fetch … while `globalThis.fetch.call(null,
url)` still reports EXACTLY ONCE … The bound after it is still not empty and is MEASURED,
not assumed: `Reflect.apply(fetch, null, [url])` reports NOTHING because the global is an
argument … and `fetch["ca" + "ll"](null, url)` reports NOTHING because the member will not
reduce - each has its own registry row, and the set of ways a value reaches a call is open."*

**A bound narrower than the residual it claims to state is the specific defect CR-15 names,
and it is closed here.**

---

## 8. THE SPAN'S VOCABULARY — the positive greps, with their pre-wave zeros

| pattern | BEFORE (510-line span at `d05fe52`) | AFTER (580-line span at `a056031`) |
|---|---|---|
| `\.call` | **0** | **8** |
| `\.apply` | **0** | **4** |
| `\.bind` | **0** | **1** |
| `Reflect` | **0** | **3** |
| `navigator\[` | **0** | **1** |
| `require(` | **0** | **1** |
| `tagged template` | 1 (the KEY row) | 2 (the key row **and** the call row that names it by id) |

A reader of the residual OF RECORD now learns that `fetch.call(null, url)` was silent and
what happened to it, and the same about an unreadable computed member on an identified
`navigator` — neither of which the span said anything about before this wave.

---

## 9. WR-39 — the varied-length sweep, read out of the run

**THE SUPERSEDED CLAIM, PRESERVED HERE AS HISTORY** (this SUMMARY is the one place that is
not a bound, so the rounds that believed it are not erased). From
`observations.spec.ts`, deleted by this wave:

> *"THE DISCRIMINATOR, STATED AS AN ASSERTION: shape (2) SHRINKS and shape (3) does not."*

and from `schema.spec.ts`:

> *"(3) a cut landing inside a parameter NAME is not stable either — the second pass sees a
> segment with no `=` at all, P10-D1 redacts it WHOLE, and the value **does NOT shrink**."*

and from `observations.ts`:

> *"the retained name is destroyed on the second pass and the stored value **SHRINKS by a
> byte**."*

**MEASURED, four parameter-name lengths bracketing the `<redacted>` marker's own length
from both sides, every band and every delta read out of the run:**

```
WR-39 head-side profiles:
  name=1   band=2028..2029  deltas=0
  name=10  band=2019..2029  deltas=-1,0
  name=29  band=2000..2029  deltas=-20,-19,-18,-17,-16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0
  name=44  band=1985..2029  deltas=-35,-34,-33,-32,-31,-30,-29,-28,-27,-26,-25,-24,-23,-22,-21,-20,
                                   -19,-18,-17,-16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0
```

The band WIDENS with the name and the delta scales with it. **The one-byte figure three
surfaces stated as a mechanism is the `name=10` row and nothing more** — and
`jsessionid` is ten characters, exactly the length of `<redacted>`.

**WHAT THE FIXTURE NOW ASSERTS INSTEAD:** the BRANCH SELECTOR. The presence of an `=` in
the final delimited segment is what chooses between the CR-07 padding branch and P10-D1's
whole-segment branch, and the two pass-1 outputs the second pass reads are asserted to take
DIFFERENT branches. The finding itself is asserted too: the delta profiles must NOT all
agree across name lengths, or the correction is wrong.

**THE BYTE-IDENTICAL DUPLICATE IS GONE.** The line the discriminator comment sat on —
`expect(emptyValueCutTwice.length).toBe(emptyValueCut.length - 1);` — was byte-identical to
the assertion fourteen lines above it. It re-asserted a fact already asserted and could not
detect the disagreement its own comment claimed to watch for.

**Negative greps, executed:**

```
$ grep -c 'shape (2) SHRINKS and shape (3) does not' packages/backend/src/store/observations.spec.ts
0
$ grep -c 'does NOT shrink' packages/backend/src/store/schema.spec.ts
0
$ grep -c 'does NOT shrink' packages/backend/src/store/observations.ts
0
```

The replacement prose was written not to contain the superseded claim, so no gate here is
satisfied by a quotation.

**ALL THREE SITES MOVED IN ONE COMMIT** (`64745ef`), and `observations.ts` is COMMENT-ONLY:

```
$ git diff -U0 packages/backend/src/store/observations.ts | grep '^[+-]' \
    | grep -v '^\(+++\|---\)' | grep -v '^[+-]\s*\*' | grep -v '^[+-]\s*//' | wc -l
0
```

**Non-comment changed line count: 0.** Every assertion that HOLDS survives: secret-absence
at both passes at every swept offset of every swept name length, and the length ceiling.
The swept-input count grew by 71 offsets × 4 name lengths × 2 passes = **568 additional
secret-absence assertions** on top of the pre-existing sweeps.

---

## 10. WR-40 / WR-42 — the spread residual split into the three mechanisms it exhibits

**THE SUPERSEDED TITLES, PRESERVED AS HISTORY:**

> *"RESIDUAL, STILL OPEN AFTER IN-25 AND AFTER WR-36's SCOPING — … and (2026-08-24) **the
> three SPREAD shapes**"*

> *"Each is a value routed through an object literal and each is SILENT, **because
> `derivesFrom` reads a `SpreadAssignment` as neither a render nor a derivation**."*

**THE SEVEN EXECUTED SHAPES:**

| Shape | Result | Mechanism |
|---|---|---|
| `{ ...e }` in a property value | `[]` | **(i)** a spread element is not a property assignment |
| `Object.assign({}, e)` | `[]` | **(ii)** a call's ARGUMENTS are never descended — **and this shape contains no spread at all** |
| `structuredClone(e)` | `[]` | **(ii)** |
| `Object.entries(e)` | `[]` | **(ii)** |
| `Object.values(e)` | `[]` | **(ii)** |
| top-level `{ ok: false, ...e }` | `[]` | **(i)** at one position over |
| `[...e]` | `[]` | **(i)** |
| `fmt(e)` (bare-identifier callee) | `[]` | **(iii)** — already item 1 of the same list, **cross-referenced there, not restated** |
| `e.message` (control) | `["unredacted-object-value"]` | reports |
| `JSON.stringify(e)` (control) | `["unredacted-string-call"]` | reports as a render form |

**Mechanism (ii) was named NOWHERE on that list before this wave, and naming it is the
deliverable.** Calling `Object.assign({}, e)` a spread shape sent a reader looking for
spread handling in a shape that contains no spread.

**Both pinned cases re-titled by MECHANISM rather than by count.** Executed:

```
$ grep -c 'the three SPREAD shapes' packages/backend/src/store/error-redaction.spec.ts
0
```

A title that counts goes stale the moment a fourth shape is measured — which is exactly
what WR-42 turned out to be.

**EXACTLY ONE FURTHER SHAPE IS PINNED**, the top-level spread, and its title says so in its
own words: *"RESIDUAL, ONE EXAMPLE OF AN OPEN CLASS PINNED (WR-42): the TOP-LEVEL spread of
the caught binding into the returned literal — the plainest spelling an author would type,
and the one a reader looks for and does not find."* **The file's own decision note is the
reason, quoted:**

> *"Item 2 and the three surviving halves of item 3 are still NOT pinned, and that is the
> other half of the decision: each names an open CLASS rather than one shape, so a fixture
> would pin one example while READING as though it pinned the class — a narrower guarantee
> wearing a wider claim, which is the defect this whole round is about."*

The remaining three shapes are recorded in a case titled `MEASURED SILENCES, NOT PINNED AS
A CLASS`.

---

## 11. THE MUTATION PROOFS — one per branch, executed SEPARATELY, never combined

**Run order: 1 → 2 → 3 → 4.** Every one was planted only AFTER its own real work was
committed, because wave 29 destroyed its own Task 1 with `git checkout --` against
uncommitted work. Each mutation neuters the branch's EFFECT while leaving its CONDITION and
its ANCHOR LINE byte-identical.

| # | Branch | `git log --oneline -1` before | RED test title | Full assertion message | Restore |
|---|---|---|---|---|---|
| **1** | receiver-position arm (fetch) — `add("outbound-fetch", …)` → `void member;` | `646044b feat(01-34): the receiver-position arm — one widening that passed all three conditions` | `outbound-fetch fires on the global in RECEIVER position, and on an identified alias in the same position — with the CALLEE spelling of that alias as the control in the same case` **and** `registry row silence-fetch-alias-receiver-position — its probe AND its counter-probe are executed against auditSource` | `AssertionError: expected [] to deeply equal [ 'outbound-fetch' ]` and ``AssertionError: registry row `silence-fetch-alias-receiver-position`'s COUNTER-probe reports something other than [outbound-fetch]. A row that only records the firing direction is half a fact; this half moved.: expected [] to deeply equal [ 'outbound-fetch' ]`` | `git diff --exit-code` **clean**; re-run `Tests 418 passed (418)` |
| **2** | unreadable-member arm (`navigator` admitted) — `add("outbound-unanalysable", …)` → `void node;` | `9931ea4 feat(01-34): navigator joins the receivers the unreadable-member arm accepts` | ``outbound-unanalysable fires on an unreadable computed member of an identified `navigator` receiver — with the DESTRUCTURE spelling that already reported as the control in the same case`` **and** `registry row silence-unreadable-member-of-navigator — …` (11 cases RED in total, row-granular) | `AssertionError: expected [] to deeply equal [ 'outbound-unanalysable' ]` and ``AssertionError: registry row `silence-unreadable-member-of-navigator`'s COUNTER-probe reports something other than [outbound-unanalysable]. A row that only records the firing direction is half a fact; this half moved.: expected [] to deeply equal [ 'outbound-unanalysable' ]`` | `git diff --exit-code` **clean**; re-run `Tests 421 passed (421)` |
| **3** | dynamic-code receiver arm — `add("outbound-dynamic-code", …)` → `void member;` | `147a318 feat(01-34): the dynamic-code receiver arm — a second decision, not a footnote` | `outbound-dynamic-code fires on a dynamic-code global in RECEIVER position, and through an alias in the same position` **and** `registry row silence-dynamic-code-global-receiver-position — …` | `AssertionError: expected [] to deeply equal [ 'outbound-dynamic-code' ]` and ``AssertionError: registry row `silence-dynamic-code-global-receiver-position`'s COUNTER-probe reports something other than [outbound-dynamic-code]. A row that only records the firing direction is half a fact; this half moved.: expected [] to deeply equal [ 'outbound-dynamic-code' ]`` | `git diff --exit-code` **clean**; re-run `Tests 424 passed (424)` |
| **4** | WR-39's REPLACEMENT assertion — branch selector inverted once (`/;[^;]*=/` → `!/;[^;]*=/`) | `64745ef fix(01-34): WR-39 — re-derive the head-side discriminator from a varied-length sweep` | ``THE NO-SEPARATOR BRANCH: with no `&` inside the cut the byte cut STANDS, and the residual that lives there is SWEPT, not pinned at one chosen offset (WR-22/WR-28/WR-29)`` | ``AssertionError: the FIRST offset of the head-side band was expected to leave a final `;` segment carrying an `=` with an empty value half — the CR-07 padding branch's selector.: expected false to be true`` | `git diff --exit-code` **clean**; re-run `Tests 185 passed (185)` |

**Each mutation went red row-granularly** — the registry row for the exact mechanism went
red alongside the fixture — which is what proves the ROW is bound to the branch and not
merely to a line.

---

## 12. WAVE 33's GUARD — green after every commit, and byte-unchanged

Executed after **every** commit in this wave, as part of the gate spec's own run
(`the surface carries N declared-phrasing occurrence(s)…`, the exemption-map equality, and
both pinned counts). Green each time.

```
$ git diff <base>..HEAD -- packages/backend/src/outbound-prohibition.spec.ts \
    | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' \
    | grep -icE 'HEADER_QUANTIFIER_EXEMPTIONS|UNBOUNDED_QUANTIFIERS|EXCLUSION'
0
```

**EMPTY over its exclusions, its exemption map and both its pinned counts.** The guard was
satisfied by REWRITING new prose, three times, never by widening anything:

| Trip | Declared phrasing hit | Rewritten to |
|---|---|---|
| `silence-bare-global-argument-position` | `"a bare identifier"` | `"an identifier with no member written beside it"` |
| `silence-outbound-ctor-receiver-position` | `"in construction position"` | `"where a `new` target or a callee is expected"` |
| `silence-aliased-module-loader-specifier` | `"through an alias"` (×3 sites in one clause) | `"by way of a local binding"` / `"once the loader is bound to a local name"` / `"the resolver machinery"` |

No exclusion was widened. No exemption entry was added. Both counts are byte-unchanged.

---

## 13. THE REAL TREE — zero after EVERY widening

Executed after each of the three widenings, and again at the end:

```
$ pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts --reporter=verbose \
    | grep -c 'reaches no outbound surface'
23
```

**23 files, 0 violations, every time.** The four measured-exempt sites are asserted quiet
BY NAME in every one of those runs: `compat.ts`'s `cur[key]` and `ctx[root]`, and
`observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]`. No widening in
this wave fires on real shipped code, so none needed a measured exemption and none was
reverted.

---

## 14. THE DERIVED SPANS — both files side by side

| | `packages/backend/src/outbound-prohibition.spec.ts` | `.planning/REQUIREMENTS.md` |
|---|---|---|
| span lines | **580** | **580** |
| entries (`* ` rows) | **61** | **61** |
| sha256, **without** trailing newline | `15e860382fddc6a291f5fa58cfdb8345ffd4c35cecb97aac5ec56eae38a3bbda` | `15e860382fddc6a291f5fa58cfdb8345ffd4c35cecb97aac5ec56eae38a3bbda` |
| sha256, **with** trailing newline (the naive pipe) | `cc5079aca49128ad2893e66b49606f18f346d652e01ae5ecc9fa89c8f3d98063` | `cc5079aca49128ad2893e66b49606f18f346d652e01ae5ecc9fa89c8f3d98063` |

**THE HASHING CONVENTION, STATED SO NOBODY RE-DERIVES IT:** the digest reproduces only when
the extracted span is hashed WITHOUT a trailing newline, which is what `extractDerivedBlock`
returns. A naive `sed | shasum` includes the trailing newline and yields the second digest.
**That is a CONVENTION, not a divergence**, and both digests are shown so a future session
can tell them apart at a glance.

Registry growth: **51 rows → 61 rows**; span **510 lines → 580 lines**; measured-silence
rows **16 → 26**.

---

## 15. THE LEDGER — append-only, and the sentence that says no class was ended

**CORE-11's dated correction is present above the BEGIN sentinel, naming plan 01-34 and
wave 34.** The required sentence, quoted verbatim from `.planning/REQUIREMENTS.md`:

> **"AND NOW THE OTHER HALF, IN THIS SAME PARAGRAPH: THIS WAVE ENDED NO CLASS. The space of
> JavaScript spellings that reach a function through a value does not close, so no scan and
> no bar ever ends the class these two belong to. Under the bar the operator adopted — the
> residual must be DERIVED from the code, drift between text and code must be MECHANICALLY
> DETECTABLE, and the disclosure must be THE SOLE BOUND on every surface a reader touches —
> what earns this requirement's `[x]` is that a shape sits on a list nobody can silently
> edit, NOT that the gate goes red on it. Closing these shapes is therefore not what earns
> the box, and a reader who takes this correction for the end of the finding stream has
> been misled by it. CORE-11's checkbox is UNTOUCHED by this wave and is exactly as waves
> 32 and 33 left it; WAVE 35 OWNS IT."**

**APPEND-NEVER-REWRITE, EXECUTED:**

```
$ git diff .planning/REQUIREMENTS.md | grep -c '^-[^-]'
0
$ git diff .planning/STATE.md | grep -c '^-[^-]'
0        # 1 file changed, 1 insertion(+)
$ grep -n '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
46:- [ ] **CORE-11**: …        # exactly one row, and the line is byte-unchanged
```

**CORE-11's box is `[ ]` and this wave did not touch it.**

**STORE-03 AND STORE-07 — each states what it does NOT reach.** Both corrections state that
the finding was a DISCLOSURE defect and that the prohibition did not move, AND each states
in its own text:

> *"AND THIS CORRECTION DOES NOT REACH THE LEDGER COLLISION. The 2026-08-21 notice on this
> entry … REMAINS DEFERRED WITH ITS OWNER, the operator, at the next requirements pass, by
> the STORE-01 → STORE-08 route. That is a different, still-open matter … and nothing in
> this wave touches it; a `resolved` disposition on the finding above is not a disposition
> on the collision below."*

A dated `resolved` sitting beside a standing deferral with nothing distinguishing the two
is two dispositions on one entry, and both are distinguished here in writing.

---

## 16. THE `gsd-tools windows` COMMANDS, WITH RAW OUTPUT

```
$ node "$HOME/.claude/gsd-core/bin/gsd-tools.cjs" windows fixed 38
…
        "id": 38,
        "kind": "deviation",
        "phase": "01",
        "file": "packages/backend/src/outbound-prohibition.spec.ts",
        "description": "POINTER, NOT A BOUND (plan 01-33, gap-closure round 7, CR-14 + WR-38 + WR-43). …",
        "status": "fixed",
        "recorded_at": "2026-08-25T09:58:29.290Z",
        "resolved_at": "2026-08-25T10:47:46.162Z"
```

```
$ node "$HOME/.claude/gsd-core/bin/gsd-tools.cjs" windows append \
    --kind deviation --phase 01 \
    --file "packages/backend/src/outbound-prohibition.spec.ts" \
    --description "POINTER, NOT A BOUND (plan 01-34, gap-closure round 8, …)"
    "id": 39,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/backend/src/outbound-prohibition.spec.ts",
    "status": "open",
    "recorded_at": "2026-08-25T10:48:11.804Z",
    "resolved_at": null
```

```
$ grep 'outbound-prohibition.spec.ts' .planning/WINDOWS.md | grep -c '| open |'
1
```

**Open entries for this gate file: 1.** Never hand-edited; both operations went through the
tool. Entry 38 was closed as SUPERSEDED, not as a defect closure — wave 33's header
deletion and its guard stand untouched and byte-unchanged.

---

## 17. THE FULL GATE SET — run by hand, because this repo has no active git hooks

`.git/hooks` holds only `.sample` files and `core.hooksPath` is unset, so nothing runs these
at a commit boundary.

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1372 passed (1372)
```

**31 files / 1372 tests**, against the pre-wave baseline of 31 files / 1348 tests. Neither
count is lower.

```
$ pnpm typecheck        # tsc --build          → exit 0
$ pnpm lint             # eslint .             → exit 0
$ pnpm knip             # knip                 → exit 0
$ pnpm build:backend && pnpm check:bundle
[*] Plugin package built successfully
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

**Exactly one import specifier, `crypto`.**

```
$ git diff --exit-code 01-01-PLAN.md … 01-33-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md
                        # exit 0, no output
```

---

## 18. NOTHING LEAKS, AND THIS PLAN DOES NOT IMPLY OTHERWISE

Every finding this wave touched is **PROSPECTIVE blindness in a TEST-ONLY gate**. The
must-NOT holds and did not move at any point:

- Zero outbound-shaped tokens in any shipped non-spec source across both `SOURCE_ROOTS` and
  the frontend — 23 files, **0 violations**, re-measured after every widening.
- The shipped bundle's entire import set is **one specifier, `crypto`**.
- `observations.ts`'s redaction code is **byte-identical since round 5** — this wave changed
  that file by COMMENT ONLY, non-comment changed line count **0** — and has now survived
  **20,340** swept inputs with **zero** secret survivals (19,772 entering this wave, plus
  568 added by the varied-length sweep).
- WR-39 and WR-40/WR-42 are warnings on DISCLOSURE TEXT, not failures of a prohibition.

---

## Task Commits

1. **Task 1 — row-first disclosure of the receiver-position family** — `d971aa7` (feat)
2. **Task 1 — the receiver-position arm** — `646044b` (feat)
3. **Task 2 — CR-16 disclosed by row** — `c67d449` (feat)
4. **Task 2 — navigator admitted to the unreadable-member arm** — `9931ea4` (feat)
5. **Task 2 — the dynamic-code receiver arm** — `147a318` (feat)
6. **Task 2 — WR-41, IN-31, IN-32, IN-33 dispositions** — `d9ad668` (docs)
7. **Task 3 — WR-39, the varied-length sweep, all three sites** — `64745ef` (fix)
8. **Task 3 — WR-40/WR-42, the spread residual split** — `1161719` (fix)
9. **Task 3 — ledger corrections, both pointer surfaces, full gate set** — `a056031` (docs)

---

## Decisions Made

1. **CR-15 and CR-16 were DISCLOSED, not closed, and the ordering says so.** The rows landed
   and committed before any branch existed. That commit alone satisfies the wave's bar.
2. **All three widenings were taken as a BONUS**, each only after cheap / obviously correct /
   measured were answered in writing (§3).
3. **WR-41: DISCLOSE, not widen.** Two dispositions were legitimate; the reason for this one
   is in the row's own clause — `check:bundle` bounds that surface from the other end.
4. **IN-32: bound the claim rather than change behaviour.** It errs safe; the cost is a
   debugging reader getting the wrong rule id, and that is now written down where the claim
   was made.
5. **The CR-16 row was NARROWED, not deleted**, when measurement contradicted the plan.
6. **WR-42's fourth-shape set is stated as a class with its mechanism and exactly ONE example
   is pinned**, honouring the file's own decision note rather than overriding it.

---

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 2 - Missing critical] A third residual mechanism nobody predicted, rowed**
- **Found during:** Task 2, re-measuring after the dynamic-code arm
- **Issue:** `WebSocket.call(null, u)` — an outbound CONSTRUCTOR global in receiver position
  — is silent, and neither new arm reaches it. Leaving it unrowed would have converted a
  disclosed silence into an undisclosed one, which the plan prohibits by name.
- **Fix:** `silence-outbound-ctor-receiver-position` added with probe, expect, counterProbe
  and counterExpect.
- **Verification:** executed both directions; registry row case green.
- **Committed in:** `147a318`

**2. [Rule 1 - Bug] Two registry `site` anchors went stale when the CR-16 widening reflowed
their line**
- **Found during:** Task 2
- **Issue:** admitting `navigator` reformatted `} else if (member === undefined && …)` across
  five lines, and the provenance guard `the registry is NON-EMPTY and every row's provenance
  anchor still EXISTS, AT A DECLARATION, in this file` went red for two rows — correctly.
- **Fix:** both `site` values updated to the surviving anchor `(isGlobalReceiver(node.expression) ||`.
- **Verification:** the guard case green; the guard did its job and is stronger for having
  fired.
- **Committed in:** `9931ea4`

**3. [Rule 3 - Blocker] Three new clauses tripped wave 33's guard and were REWRITTEN**
- See §12. No exclusion widened, no exemption entry added.

**4. [Process] The four DISCLOSE-only findings share one commit**
- The plan says "TAKE EACH FINDING IN ITS OWN COMMIT". WR-41, IN-31, IN-32 and IN-33 all
  resolved to DISCLOSE and none adds a branch, so they were committed together in `d9ad668`
  with a message enumerating each finding, its disposition and its reason separately. Every
  finding still carries its own executed measurement and its own row or docblock correction.
  Recorded here rather than left for a reviewer to notice.

**5. [Process] `pnpm exec eslint --fix` reformatted the two spec files**
- Prettier reflow only, run at the Task 3 gate boundary. `pnpm test` re-run afterwards:
  1372 passed, both byte comparisons still green.

---

**Total deviations:** 3 auto-fixed (1 × Rule 2, 1 × Rule 1, 1 × Rule 3) + 2 process notes.
**Impact:** all necessary for correctness of the disclosure. The Rule 2 item is the wave's
own prohibition working: re-measure, and row what you find. No scope creep.

---

## Issues Encountered

**A vitest probe importing the gate spec re-runs the whole suite.** `auditSource` is exported
from a `.spec.ts` file, so any probe harness importing it pulls in 400+ tests. One probe run
exceeded a 600 s tool timeout and was moved to the background, where it kept executing and
overwrote a freshly regenerated span with a stale one — producing a confusing "55 entries,
registry has 56" failure that looked like a regeneration bug. Resolved by killing the stray
process and re-running the regeneration alone with `-t regen`. Recorded because the symptom
is misleading and a future session will hit it.

## User Setup Required

None.

## Next Phase Readiness

**Ready for wave 35, which owns the re-scope and the CORE-11 discharge.** What wave 35
inherits:

- CR-15 and CR-16 on the derived list, with three widenings taken and every survivor rowed.
- **Ten new measured-silence rows** and a 61-row registry byte-pinned into both files.
- **CORE-11's box at `[ ]`, untouched**, with the five wave-32 blocking rows and the residuals
  this wave added all disclosed.
- Wave 33's guard green and byte-unchanged.
- Suite at 31 files / 1372 tests; real tree 23 files / 0 violations; bundle at one specifier.

**And the standing constraint wave 35 must honour:** the space of JavaScript spellings that
reach a function through a value is open. No wave ends that class, and the `[x]` this phase
is working toward is earned by the residual being DERIVED, DRIFT-DETECTABLE and the SOLE
BOUND — not by the gate going red on every spelling.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-25*

## Self-Check: PASSED

All 8 modified files verified present on disk with `[ -f ]`. All 10 commit hashes verified
present in `git log --oneline --all`. Plan-level `<verification>` re-run at the Task 3
boundary: `pnpm test` 31 files / 1372 tests exit 0, `pnpm typecheck` / `pnpm lint` /
`pnpm knip` all exit 0, `pnpm build:backend && pnpm check:bundle` at one specifier
(`crypto`), real tree 23 files / 0 violations, both derived spans byte-identical at sha256
`15e860382fddc6a291f5fa58cfdb8345ffd4c35cecb97aac5ec56eae38a3bbda` over 580 lines and 61
entries, `git diff --exit-code` over the frozen plan/verification/review/UAT artifacts clean.
