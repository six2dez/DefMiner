---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-22T12:40:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  previous_verified: 2026-08-21T17:40:00Z
  round: 3
  gaps_closed:
    - "UAT gap 1 (CR-07, padded-credential redaction) — CLOSED, and closed at every tier that was blind to it. I executed it myself: `?dXNlcjpwYTU1dzByZA==` -> `?<redacted>`, `?YWRtaW46aHVudGVyMjI=` -> `?<redacted>`, `;dXNlcjpwYTU1dzByZA==` -> `;<redacted>` (both delimiters, one shared helper), `?=` and `?==` -> `?<redacted>`, and `?token=dXNlcjpwYTU1dzByZA==` still -> `?token=<redacted>`, so the branch that already worked was not weakened. The unit table can now go RED: I reverted the padding branch in place and ran the suite — 22 assertions failed, including the one that reads the row back out of a real SQLite file — then restored the tree. The live tier can go red too: run `20260822T094959Z-31622` is a committed mutation run with 18 red assertions, and run `20260822T094728Z-11865` is the clean counterpart, both on `caido_version=0.58.0` read with `sqlite3 -readonly` from outside Caido."
    - "The fixture table is now STRUCTURALLY incapable of going blind the same way: `observations.spec.ts:439-475` asserts >=3 `=`-bearing shapes AND >=1 of each padding sub-branch AND that every core is non-empty and differs from the literal. That is the assertion round 2 did not have, and its absence was the whole reason round 3 existed."
    - "The tracer dye set now PADS. `grammar-reachability.txt` records `pad_two_padding_bytes=2` and `pad_one_padding_bytes=1` per run, and both dyes are swept under the padded literal AND the padding-stripped core — the run-2 sweep shows `pad-two-literal` at ZERO against a dirty column, which is the exact trap a single-spelling assertion would have fallen into."
    - "The three false claims are now true or scoped. `schema.spec.ts`'s OPEN list moved from one grammar to TWO and the second names the retained NAME half explicitly, including 'the prefix of a token carrying an interior `=`' — the shape I found independently this round (a JWT `…In0=.sig` keeps its prefix) is disclosed and PINNED rather than found. The userinfo `://` precondition and the `;`-inside-authority qualifier are both stated on their own rows."
    - "WR-21 — the tracer's claimed `grep -c` — is now a real gate. `tests/pins.spec.ts:316-347` reads the script as raw text with comments deliberately unfiltered, guards non-vacuity on two independent facts, and I confirmed its detection predicate flags `0.57.1` while ignoring `127.0.0.1` and `0.25`."
  gaps_remaining:
    - "UAT gap 2 (CORE-11 outbound enforcement) — REOPENED as CR-08, and it is a regression against my own round-2 verdict. Round 3 widened the gate's CLAIM past its reach again: boundary 2 now says an assembled receiver key is reported 'including through a one-hop binding', and one hop silently defeats it. Worse, `sdk[b ? \"requests\" : \"net\"].send(req)` — two literal keys, both naming outbound receivers, nothing hidden from the walk at all — reports NOTHING and is covered by no residual clause in any artifact."
  regressions:
    - "TRUTH 9 MOVED FROM VERIFIED TO FAILED. This is not new code breaking old code; it is the same failure shape reappearing one level up, in the file that was fixed for it last round. The score is 8/9 in both rounds and the 8 are not the same 8 — the credential leak is genuinely gone and a gate overclaim took its place. Recording that as 'no change' would be the dishonesty this phase keeps auditing itself for."
gaps:
  - truth: "No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)"
    status: partial
    reason: "CR-08, confirmed by my own execution against `auditSource`, not by repeating the reviewer. The WR-19 assembled-key rule reads the key expression INLINE only, so the receiver's identity survives exactly as long as it is written in place. Executed, positive control first: `const r = \"requests\"; sdk[r].send(req)` -> [\"outbound-send\"], so the gate does resolve `sdk[...]` when it can read the key. Then: `sdk[\"req\" + \"uests\"].send(req)` -> [\"outbound-unanalysable\"] but `const k = \"req\" + \"uests\"; sdk[k].send(req)` -> []. Same for `let k`, for a template `` `req${\"uests\"}` ``, for `[\"req\",\"uests\"].join(\"\")` and for `g()`. The gate gets the identical defect RIGHT one level down — `const m = \"se\" + \"nd\"; sdk.requests[m](req)` -> [\"outbound-unanalysable\"] — and right on the global path — `const k = \"fet\" + \"ch\"; globalThis[k](url)` -> [\"outbound-unanalysable\"]. So the asymmetry is specific to the RECEIVER key, which is precisely what WR-19 was raised to remove. THE SHARPER HALF, and it is undisclosed everywhere: `sdk[b ? \"requests\" : \"net\"].send(req)` -> [] and `sdk[(0, \"requests\")].send(req)` -> []. Neither hides anything — both keys are literals naming outbound receivers, and `initializerReceiver` already resolves a conditional in INITIALIZER position. This is a site the walk can read COMPLETELY, reported by nothing and disclosed by nothing. I applied my own round-2 three-part blocker test and it scores 3/3: (1) the source asserts it cannot happen — boundary 2 at `:106-111` says an assembled key 'is reported wherever that value is used as one, including through a one-hop binding', which I executed as false; (2) every disclosure list omits it — T-01-51 accepts 'a function boundary or MORE THAN ONE HOP', and `const k = ...` is one hop while the conditional is zero; `REQUIREMENTS.md:46` names 'a merely dynamic key (`sdk[k]`)', which a conditional of two literals is not; (3) no tier can go red — there is no fixture for an assembled-and-bound key or a conditional key anywhere in the 1908-line gate. AND THE ONE FIXTURE THAT LOOKS LIKE A BOUND IS NOT ONE: `:1740-1744` asserts `const r = \"requests\"; sdk[r].send(req)` reports `outbound-send` under the sentence 'The ONE-hop version of the same shape is caught, which is what makes the residual a bound rather than a hole'. That case resolves through `constStrings` and is green whether or not `isAssembledKey` can see a hop — it sits directly under the assembled-key describe block and reads as bounding a rule it never touches. There is no second net: the gate's own header states that `sdk.requests.send` needs no import, so `check:bundle` can never see this class. SEVERITY, STATED HONESTLY: this is materially LESS severe than round 2's blocker. Nothing leaks today — I re-ran the gate over the real tree (green) and `check:bundle` (1 specifier, `crypto`) — the defect is prospective, a gate that would stay green on a future call site. It is a BLOCKER on the claim-versus-enforcement standard this phase set for itself and has now had to enforce four times, not on a live secret."
    severity: major
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "`receiverKind`'s element-access branch (~`:757-765`) passes `inner.argumentExpression` straight to `isAssembledKey` (~`:648-661`), which inspects that ONE node — a `+`, a template, or a call. A bare identifier is none of those and `constStrings` resolves only an identifier bound to a string LITERAL, so an assembled-then-bound key falls through both. No conditional handling in key position at all, though `initializerReceiver` has it for initializers."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "Header boundary 2 at `:106-111` claims the assembled key is reported 'including through a one-hop binding'. Executed: false. Residual (a) at `:122-126` bounds the walk at 'MORE THAN ONE HOP', which affirmatively implies one hop is inside. Residual (b) at `:127-133` textually covers `sdk[k]` but justifies the exemption by a measurement — `compat.ts`'s `cur[key]` loop variable and `MIGRATIONS[...]` indexing — that would not have re-fired on a name bound to an assembled expression. Three artifacts, mutually inconsistent."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "`:1740-1744` — the assertion that appears to bound the residual passes through a different mechanism (`constStrings`) than the rule it appears under (`isAssembledKey`), so it is green either way. Green-because-it-cannot-fail, in the file whose header says the phase has removed this shape four times."
      - path: ".planning/REQUIREMENTS.md"
        issue: "`:46` — CORE-11's text reads 'no `sdk.requests.send` in any spelling' and its 2026-08-22 correction declares the PARTIAL enforcement status CLOSED, naming the remaining residual as 'a merely dynamic key (`sdk[k]`), a value crossing a function boundary, and more than one hop of indirection'. A conditional key of two literals is none of those three and is silent."
    missing:
      - "Collect `assembledNames` in the same pass that builds `constStrings` — names whose initializer (or assignment RHS) satisfies `isAssembledKey` — and consult it in `receiverKind`'s element-access branch. CR-08 carries the patch and verifies it fires on neither measured real-tree false positive (`key` is a `for…of` binding, `root` is a parameter; neither is a VariableDeclaration with a `+`/template/call initializer), so residual (b)'s measured bound is preserved."
      - "Read a CONDITIONAL key on both branches in receiver position, the way `initializerReceiver` already does in initializer position. `sdk[b ? \"requests\" : \"net\"]` is fully readable and should report `outbound-send`, not `outbound-unanalysable`."
      - "Add every shape I executed as a failing-path fixture beside `:1702-1727`: `const k = \"req\"+\"uests\"`, the `let` form, the template form, the `.join(\"\")` form, the `g()` form, the conditional and the comma-sequence."
      - "Rewrite the `:1740-1744` comment. The literal-key case is a fine assertion under its own title; it must not sit under the assembled-key block claiming to bound it. State in the header which mechanism resolves which shape."
      - "Reconcile boundary 2, residual (a), residual (b), T-01-51 and `REQUIREMENTS.md:46` to ONE bound after the fix — currently they disagree with each other and three of them disagree with the code."
deferred: []
behavior_unverified_items: []
coincidental_reliance_items:
  - truth: "URL userinfo does not reach `observations.url`"
    reason: undeclared-precondition
    harden: "Now DECLARED rather than assumed — `schema.spec.ts:115-123` states the `://` precondition on the caller and pins the scheme-relative residual. Recorded here only because the guarantee still rests on `consumer.ts:195` handing over an absolute `rr.request.getUrl()`; the day a relative URL reaches `recordObservation` the row stops holding. Advisory, no score effect."
prohibitions:
  - requirement_id: CORE-11
    statement: "No code that ships in the plugin issues an outbound network request in this phase — no `caido:http` fetch, no `sdk.requests.send` in any spelling, no method of an identified `requests` or `net` receiver outside a read-only allowlist, no global `fetch` by any receiver or alias, no `XMLHttpRequest`/`WebSocket`/`EventSource`, no `navigator.sendBeacon`, no dynamic code construction, and no speculative retrieval of any kind."
    verification: gate
    declared_status: resolved
    status: unverified
    flagged: true
    evidence: "FAIL-CLOSED. The must-NOT itself HOLDS — no outbound call exists in any non-spec source under either root, the gate runs green over the real tree in the full suite, and `check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. The ENFORCEMENT is partial and is declared resolved. Executed by me: `const k = \"req\"+\"uests\"; sdk[k].send(req)` -> [], `sdk[b ? \"requests\" : \"net\"].send(req)` -> [], `sdk[(0,\"requests\")].send(req)` -> [], `const e = eval; e(\"sdk.requests.send(r)\")` -> [] (WR-23). Genuinely closed since round 2 and confirmed by me this round: `navigator.sendBeacon(...)` -> [\"outbound-beacon\"], `eval(\"…\")` -> [\"outbound-dynamic-code\"], `sdk[\"req\"+\"uests\"].send(req)` -> [\"outbound-unanalysable\"], `globalThis[\"fet\"+\"ch\"](url)` and its one-hop const form -> [\"outbound-unanalysable\"], `const m = \"se\"+\"nd\"; sdk.requests[m](req)` -> [\"outbound-unanalysable\"], `const r = \"requests\"; sdk[r].send(req)` -> [\"outbound-send\"]."
  - requirement_id: STORE-03
    statement: "MUST NOT persist a query-string VALUE from a target-controlled URL into observations.url. Parameter names, path, scheme and host are retained; every value is replaced before the row is written."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "PROMOTED FROM UNVERIFIED. Every grammar the policy claims is now enforced AND falsifiable, and I proved both halves myself. Enforcement executed through the shipped `normaliseObservedUrl` on 13 shapes including both padding sub-branches and both delimiters. Falsifiability executed by mutation: I disabled the padding branch in place, ran `observations.spec.ts` + `schema.spec.ts`, got 22 red assertions naming the padded sub-branches by title, and restored the tree (`git status` clean of source changes afterwards). Live falsifiability is committed rather than claimed — run `20260822T094959Z-31622` carries 18 red assertions and a dump showing both dyes promoted into the retained name half; run `20260822T094728Z-11865` is the clean counterpart with nine values at 0 in both the raw column and the RPC projection, `raw rows == rpc rows : 2 == 2`. The claim is now no wider than the enforcement: `schema.spec.ts`'s OPEN list names TWO grammars and the second one names 'the prefix of a token carrying an interior `=`' — which is exactly the JWT shape I found independently before reading the list."
  - requirement_id: STORE-07
    statement: "MUST NOT render a caught exception into a persisted or logged string without passing it through describeError first."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "Confirmed again by execution and widened since round 2: `m += e.message` -> [\"unredacted-concat\"], `\"x: \" + e.message` -> [\"unredacted-concat\"], `describeError(e)` quiet. The operator class is blind — `flag ? e.message : \"none\"`, `e.message ?? \"none\"` and `e.message || \"none\"` all -> [] (WR-24) — but the render-form list at `:79-100` is an explicit ENUMERATION that states in its own words that it 'does not claim to be closed'. A bounded enumeration that under-reaches is a warning; it is not the schema.spec.ts-style overclaim that makes a blocker. Zero residual bare stringification under `packages/backend/src/store`."
  - requirement_id: CORE-10
    statement: "MUST NOT present partial passive coverage as complete."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "Carried forward unchanged and accepted by the operator at UAT test 3. Counter identifiers remain honest (`proxiedResponsesObserved`). Judgment-tier, autonomous run: NON-AUTHORITATIVE LLM-judge verdict, human review recommended."
  - requirement_id: STORE-01
    statement: "MUST NOT retain operator browsing evidence beyond what the analysis needs — no body bytes, headers, cookies, or column capable of holding a secret."
    verification: judgment
    status: unverified
    flagged: true
    evidence: "The tension recorded in round 2 is substantially reduced, not eliminated. The column-shape half is gated (PRAGMA-read allowlist + forbidden-name check). The 'capable of holding a secret' half is now HONESTLY BOUNDED rather than contradicted: `observations.url` can still hold a path-embedded token and a retained parameter NAME, both named in the OPEN list, both PINNED by assertions that go red the day somebody closes them, and the second one is kept BY POLICY under the operator's own 2026-08-21 UAT decision. Separately noted, not a gap: the per-run sweeps show tracer dyes present in Caido's own host log (`caido.stdout.log`, `logging.*.log`) on the CLEAN run too — that is the proxy's log of what it proxied, not a plugin write; the plugin's only log call is `consumer.ts:233`, which logs a `describeError`-gated message, not a URL. Judgment-tier: NON-AUTHORITATIVE, human review recommended."
---

# Phase 1: Skeleton, Persistence & Compatibility — Verification Report

**Phase Goal:** A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Verified:** 2026-08-22T12:40:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure ROUND 3 (plans 01-15, 01-16, 01-17)

## The verdict on the question I was asked

**The credential leak is gone. A gate overclaim took its place, one level up, in the file that was fixed for exactly this last round.**

Round 3 was asked to close CR-07 in all three tiers, close five warnings, and add the gate the tracer claimed. It did all three, and it did them well enough that I could not break the redaction with anything I threw at it — including one shape I constructed before reading the OPEN list, which turned out to already be disclosed and pinned there. That is the first time in four rounds a claim in this repo was WIDER in my head than in the source rather than the other way around.

But CR-08 is real, I confirmed it by execution rather than by repeating the reviewer, and it is the same defect this phase keeps producing.

```
positive control  const r = "requests";      sdk[r].send(req)   ["outbound-send"]
inline assembly                              sdk["req"+"uests"].send(req)   ["outbound-unanalysable"]
one hop           const k = "req"+"uests";   sdk[k].send(req)   []
conditional                                  sdk[b?"requests":"net"].send(req)   []
comma sequence                               sdk[(0,"requests")].send(req)   []
```

The positive control matters: the gate DOES resolve `sdk[...]` when it can read the key, so the empty lists are genuine misses and not an artefact of my fixture. And the gate gets the identical defect right one level down (`const m = "se"+"nd"; sdk.requests[m](req)` reports) and right on the global path (`const k = "fet"+"ch"; globalThis[k](url)` reports). The asymmetry is specific to the RECEIVER key — which is the exact asymmetry WR-19 was raised to remove, moved up one level.

**I applied my own round-2 three-part test, because using a softer bar on a new finding than on the one I blocked for last time would be the failure mode, not the finding.**

1. **The source asserts it cannot happen.** Boundary 2 (`:106-111`) says an assembled key "is reported wherever that value is used as one, **including through a one-hop binding**". `const k = "req" + "uests"` is one hop, same file, document order, assembly right there in the AST. Executed: silent.
2. **Every disclosure list omits it.** T-01-51 accepts "a function boundary or MORE THAN ONE HOP" — one hop is inside that bound, not outside it. `REQUIREMENTS.md:46` names "a merely dynamic key (`sdk[k]`)" — a conditional of two literal receiver names is not dynamic in any sense; nothing about it is unreadable.
3. **No tier can go red.** There is no fixture for an assembled-and-bound key or a conditional key anywhere in 1908 lines. And the one assertion that reads as a bound — `:1740-1744`, "The ONE-hop version of the same shape is caught, which is what makes the residual a bound rather than a hole" — resolves through `constStrings`, not through `isAssembledKey`, so it is green whether or not the assembled-key rule can see a hop. Green-because-it-cannot-fail, sitting directly under the rule it appears to bound.

**The sharper half is the conditional.** `sdk[b ? "requests" : "net"]` hides nothing. Both keys are literals naming outbound receivers. `initializerReceiver` already resolves conditionals in initializer position. This is a site the walk can read *completely*, reported by nothing and disclosed by nothing, anywhere in the repo.

**And I will state the severity honestly, because inflating it would be the same sin in the other direction.** Nothing leaks today. I ran the gate over the real tree (green, 1044 tests) and `check:bundle` (one specifier, `crypto`). CR-08 is a *prospective* blindness — a gate that would stay green on a call site somebody writes next year. Round 2's blocker was a whole HTTP Basic credential sitting in a durable column I could `base64 -d` back. These are not the same magnitude, and this report does not pretend they are. CR-08 is a blocker on the claim-versus-enforcement standard this phase set for itself, not on a live secret.

## On WR-22, which I reproduced and then extended

The reviewer said the CR-07 branch cost `normaliseObservedUrl` its idempotence. It did, and I did not take the reviewer's fixture — I swept for the adversarial cut instead, which is what the fix note asks for:

```
sweep: parameter-name length 1..40, 900 params, until pass1 != pass2
found at n=4     tailA "=<redacted>&pppp112="     lenA 2048
                 tailB "=<redacted>&<redacte"     lenB 2048
```

A different cut point from the one in the review, found independently, same mechanism. `redactDelimitedSegment`'s docblock closes with *"Idempotent for free in all three branches"* — true of the helper, false of the composed function the column is written through, and undisclosed. **The IN-18 pin defers on the strength of the invariant this branch already broke.**

It is a WARNING and not a blocker, and the reasoning is specific rather than lenient: the half that gets destroyed is a parameter NAME, which policy retains anyway, so nothing leaks; and no production path applies `normaliseObservedUrl` twice — `recordObservation` runs it once. The finding is that a stated invariant is false and a separate finding is being deferred on it.

## Goal Achievement

**All seven ROADMAP Success Criteria hold, and none regressed under round 3. The phase GOAL is achieved. UAT gap 2 is not closed.** Those stay separate.

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `onInterceptResponse` is non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `passive.ts:120` is `export function onResponse(`, not async. Regression-checked this round; probed independently in verification 1 (returns `undefined`, no `.then`). |
| 2 | The work queue is bounded and its overflow count is visible | ✓ VERIFIED | `queue.ts:96` exposes `overflowCount` as a getter a take does not reset (`:81`); `index.ts:130` surfaces `queueOverflowCount` on `getStatus()`. Cap=500 / 501st offer / FIFO drop probed in verification 1. |
| 3 | Browsing a 200-chunk SPA leaves UI and RPC responsive, max sync slice under the Phase 0 threshold | ✓ VERIFIED | `results/spa-load.json` — `max_slice_ms: 0.029000043869018555` against a `max_sync_slice_ms_budget` of 25 ms, gated by `tests/phase1-load.spec.ts` in the green suite. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `spa-load.json.restart` re-read this round: `identical: true`, `plugin_reattached: true`, `user_version` 2 before and after, 200 artifacts / 200 observations / 200 distinct digests. Dedup proven on a real instance in `results/runs/20260821T075936Z-12874/`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; a non-UTF-8 fixture round-trips | ✓ VERIFIED | `consumer.ts:189` `const raw = body.toRaw()`; the `toText()` AST gate in `admit.spec.ts` passes and is fixture-proven. Digests host-reproduced in verification 1. |
| 6 | A CI gate fails the build if the backend bundle imports any specifier outside the measured allowlist | ✓ VERIFIED | **Re-executed:** `node scripts/ci/check-bundle-imports.mjs` -> `packages/backend/dist/index.js: 1 import specifier(s): crypto`, exit 0. Fail paths executed against seven planted specifiers in verification 1; gated by `check-bundle-imports.spec.ts`. |
| 7 | A Caido build below the declared minimum produces a clear message | ✓ VERIFIED | `MIN_CAIDO = "0.57.1"` at `compat.ts:43`; refusal messages at `:332/:352/:363` naming both versions. Proven against the real 0.55.3 binary in `compat-smoke.json` leg C. |
| 8 | **[UAT gap 1]** `observations.url` does not persist query-string values verbatim | ✓ VERIFIED — **gap CLOSED** | Executed on 13 shapes through the shipped function; both padding sub-branches, both delimiters. Falsifiable at BOTH tiers: my in-place mutation drove 22 unit assertions red; committed run `20260822T094959Z-31622` drove 18 live assertions red against the real DB file. Claims amended to match; the two open grammars named and pinned. |
| 9 | **[UAT gap 2]** No shipped code can introduce outbound traffic without failing a gate | ✗ FAILED (partial) — **REGRESSION** | CR-08, executed by me. One `const` defeats the assembled-key rule; `sdk[b ? "requests" : "net"]` is fully readable and silent and disclosed nowhere. Positive control confirms the misses are real. See gaps. |

**Score:** 8/9 truths verified (0 present, behavior-unverified)

**The 8 is not the same 8 as last round, and saying "no change" would be the dishonest reading.** Truth 8 moved up; truth 9 moved down. A live credential in a durable column was replaced by a prospective gate blindness. That is real progress and a real regression at the same time, and collapsing them into one unchanged number is exactly the kind of arithmetic this phase exists to refuse.

### What round 3 genuinely delivered

Adversarial verification is not one-sided. Five things here are stronger than I expected going in.

| Deliverable | Status | What I executed or re-derived |
|---|---|---|
| CR-07, the padded credential | ✓ CLOSED, and closed everywhere it was blind | Both sub-branches, both delimiters, through the shipped `normaliseObservedUrl`. The `?token=…` branch that already worked was not weakened. `?=` and `?==` — the degenerate shapes — both redact whole. |
| The unit table's ability to fail | ✓ REAL, mutation-proven by me | I disabled `if (valueIsOnlyPadding) return …` in place and ran the specs: **22 red**, by title, including "a PADDED credential does not reach the column on EITHER delimiter" which reads a real SQLite file. Tree restored; `git status` clean of source changes. |
| The table's structural non-blindness | ✓ REAL, and this is the assertion that was missing | `:439-475` asserts >=3 `=`-bearing shapes, >=1 with exactly one `=`, >=1 with exactly two, and that every padding-stripped core is non-empty AND differs from its literal. A table that silently loses the padded shapes now fails loudly instead of quietly measuring nothing. |
| The live tier reaching the padded grammar | ✓ REAL, and the two-spelling sweep is the sharp part | `grammar-reachability.txt` records `padded_segments_reached=yes`, `pad_two_padding_bytes=2`, `pad_one_padding_bytes=1` per run. The run-2 sweep shows `pad-two-literal` at **ZERO** against `observations-url-raw.txt` on a run where a whole credential is in that file — the stored form is the dye minus one byte of padding. A tracer asserting only the padded spelling would have PASSED a dirty column. Both spellings now run. |
| The claims catching up to the code | ✓ REAL | `schema.spec.ts`'s OPEN list went from one grammar to two, and the second names "the prefix of a token carrying an interior `=`". I built `?eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0=.sig` as a novel attack before reading that list and found it already disclosed and pinned. First time in four rounds. |
| The WR-21 gate the tracer claimed | ✓ REAL, non-vacuous, and its predicate works | `tests/pins.spec.ts:316-347`. Comments deliberately NOT filtered (the bug lives in prose), two independent non-vacuity facts, and I confirmed the detection predicate by hand: `0.57.1` flagged, `127.0.0.1` and `0.25` ignored. WR-25's point stands — there is no EXECUTED failing path — but the predicate is correct as written. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/backend/src/store/observations.ts` | Write-path URL redaction, all grammars | ✓ VERIFIED | `redactDelimitedSegment:179-202` now walks the VALUE half with a plain character loop (no pattern — `REDOS_RECOVERY="kill"`). Wired into `recordObservation`, data flowing from `consumer.ts:446`. Residual: `normaliseObservedUrl:393-398` idempotence at `URL_MAX` (WR-22). |
| `packages/backend/src/store/observations.spec.ts` | Fixtures that can fail | ✓ VERIFIED | 13+ `BARE_CREDENTIAL_SHAPES` with a structural assertion on both padding sub-branches and on core-differs-from-literal. Mutation-proven red by me. |
| `packages/backend/src/store/schema.spec.ts` | Per-grammar claim with a complete OPEN list | ✓ VERIFIED | Was ⚠️ OVERCLAIM. OPEN list now names two grammars; the `://` precondition and the `;`-in-authority qualifier are stated on their own rows; per-grammar tier attribution (UNIT / UNIT+LIVE) replaces the blanket "proven end to end". |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 gate over both shipped roots | ⚠️ PARTIAL | 1908 lines, both roots, by-name non-vacuity, `outbound-beacon` and `outbound-dynamic-code` added and confirmed firing. Assembled-and-bound and conditional receiver keys are silent and undisclosed (CR-08); `eval` alias silent (WR-23). |
| `packages/backend/src/store/error-redaction.spec.ts` | STORE-07 gate | ✓ VERIFIED | `+=`, `.concat()` and push-then-join now fire (WR-17 closed, confirmed by me). Operator class (`? :`, `??`, `||`) blind (WR-24) — a warning, because the render-form list states it is an enumeration that does not claim to be closed. |
| `tests/pins.spec.ts` | The WR-21 gate the tracer claimed | ✓ VERIFIED | Real, scoped to one file, non-vacuous on two facts, comments deliberately unfiltered with the inversion documented. Predicate confirmed by hand. |
| `scripts/ci/check-bundle-imports.mjs` | DIST-05 bundle allowlist gate | ✓ VERIFIED | Re-executed: 1 specifier, `crypto`, exit 0. |
| `scripts/phase1/tracer-e2e.sh` | Live end-to-end proof against the DB file | ✓ VERIFIED | Six grammars now, including two padded dyes swept under both spellings. Carries no version literal (gated). |
| `packages/backend/src/compat.ts` | COMPAT-01/02 refusal | ✓ VERIFIED | `MIN_CAIDO` + three distinct messages, proven on a real 0.55.3 binary. |
| `.planning/REQUIREMENTS.md` | Honest ledger | ⚠️ PARTIAL | CORE-11's text correctly widened to name `sendBeacon` and dynamic code, and the PARTIAL status correction is dated. But it declares enforcement CLOSED with a residual list that does not cover CR-08's conditional key. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `hooks/passive.ts` | `engine/queue.ts` | `offer()` from a non-async handler | ✓ WIRED | Regression-checked; unchanged. |
| `ingest/consumer.ts:446` | `store/observations.ts` | `recordObservation(...)` with `got.url` | ✓ WIRED | Real data path; `got.url` from `rr.request.getUrl()` at `:195`. |
| `store/observations.ts` | SQLite `observations.url` | `normaliseObservedUrl(url)` inside the INSERT parameters | ✓ WIRED | Write-path, settled against the real database file by runs `…094728Z` (clean) and `…094959Z` (mutation). |
| `outbound-prohibition.spec.ts` | `packages/engine/src` | `SOURCE_ROOTS[1]` + by-name non-vacuity | ✓ WIRED | `pipeline.ts`, `decode.ts`, `queue.ts` named; per-root contribution asserted. |
| `tests/pins.spec.ts` | `scripts/phase1/tracer-e2e.sh` | `readFileSync` raw text + dotted-numeric scan | ✓ WIRED | New this round. Non-vacuity guards a moved or emptied script. |
| `index.ts:130` | `engine/queue.ts:96` | `queue.overflowCount` -> `getStatus().queueOverflowCount` | ✓ WIRED | RPC-visible. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `observations.url` | `url` | `rr.request.getUrl()` -> `normaliseObservedUrl` | ✓ read back with `sqlite3 -readonly` from outside Caido, 2 rows, `raw rows == rpc rows` | ✓ FLOWING, redacted per policy |
| `getStatus().queueOverflowCount` | `queue.overflowCount` | live `BoundedQueue` instance | ✓ | ✓ FLOWING |
| `spa-load.json.max_slice_ms` | measured slice | live 200-chunk run | ✓ | ✓ FLOWING |
| `check-bundle-imports` specifier set | parsed `dist/index.js` | real built bundle | ✓ | ✓ FLOWING |
| `grammar-reachability.txt` padding counts | `pad_two_padding_bytes` / `pad_one_padding_bytes` | measured off the live request line | ✓ 2 and 1, not assumed | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full suite green | `pnpm test` (run ONCE) | 31 files, **1044 tests passed**, exit 0 | ✓ PASS |
| Typecheck | `pnpm run typecheck` (`tsc --build`) | exit 0 | ✓ PASS |
| Prior-phase regression gate | `vitest run tests/go-no-go tests/schema tests/spike-results` | 3 files, **72 tests**, exit 0 — the Phase 0 baseline, unchanged | ✓ PASS |
| Bundle import gate | `node scripts/ci/check-bundle-imports.mjs` | `1 import specifier(s): crypto`, exit 0 | ✓ PASS |
| CR-07 padded credential | throwaway spec importing `normaliseObservedUrl`, 13 shapes | `?dXNlcjpwYTU1dzByZA==` -> `?<redacted>`; `;` mirror likewise; `?token=…` branch intact | ✓ PASS |
| CR-07 falsifiability | in-place revert of the padding branch, `observations.spec.ts` + `schema.spec.ts` | **22 assertions RED**, by title, incl. the real-SQLite-file case | ✓ PASS (can go red) |
| Tree restored after mutation | `git checkout --` + `git status --short` | no source-tree changes | ✓ PASS |
| WR-22 idempotence sweep | swept name length 1..40 x 900 params through `normaliseObservedUrl` | **non-idempotent at n=4**, `…&pppp112=` -> `…&<redacte` | ✗ FAIL (warning) |
| CR-08 gate reach | throwaway spec importing `auditSource`, 16 shapes | positive control fires; one-hop assembled, conditional and comma-sequence keys all `[]` | ✗ FAIL (blocker) |
| WR-23 eval alias | same probe | `const e = eval; e("…")` -> `[]`; inline `eval("…")` -> `["outbound-dynamic-code"]` | ✗ FAIL (warning) |
| WR-24 operator renders | throwaway spec importing STORE-07 `auditSource`, 6 shapes | `? :`, `??`, `\|\|` all `[]`; `+=` and `+` fire; `describeError` quiet | ✗ FAIL (warning) |
| WR-21 predicate | dotted-numeric filter run by hand on a mixed string | `["0.57.1"]` — flags the version, ignores `127.0.0.1` and `0.25` | ✓ PASS |
| Debt markers | `grep -rn "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` over source, scripts, tests | zero (the `XXXXXX` hits are `mktemp` templates) | ✓ PASS |

**Note on the 1044:** every one of them passes with CR-08 live, and 22 of them go red the instant CR-07's branch is touched. That asymmetry — which findings the suite can see and which it cannot — is the measurement, not the count.

### Probe Execution

| Probe | Command | Result | Status |
|---|---|---|---|
| Live tracer, round 3 clean | recorded run `20260822T094728Z-11865` (`caido_version=0.58.0`) | nine values at 0 in raw column and RPC; `raw rows == rpc rows : 2 == 2`; six redaction markers asserted BY INDEX | PASS (recorded — needs a live Caido instance) |
| Live tracer, round 3 mutation | recorded run `20260822T094959Z-31622` | **18 assertions RED**; both padded dyes visible in the durable column; `pad-two-literal` sweeps to ZERO against a dirty file | PASS (recorded) |
| Live tracer, round 2 clean + mutation | runs `20260821T150022Z-16902`, `20260821T150143Z-19295` | unchanged, still committed | PASS (recorded) |
| Compat smoke | `results/compat-smoke.json` | leg C refuses on the real 0.55.3 binary | PASS (recorded) |

Live-tier probes were not re-executed: they need a running Caido and a proxied origin, which Step 7b's constraints exclude. Every run directory carries `caido-version.txt` written from the resolved `$ACTUAL_VERSION`, and both rounds ship a committed mutation run — the strongest recorded form available without an instance.

### Requirements Coverage

Every id the phase is tagged with appears in at least one plan's frontmatter, and every id in a plan's frontmatter appears in `REQUIREMENTS.md`. **No orphans.**

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| CORE-01 | 01-01, 01-09 | non-async handler | ✓ SATISFIED | `passive.ts:120`; the cross-reference note correctly redirects the prohibition to CORE-11 |
| CORE-02 … CORE-08 | 01-03, 01-04 | admission, dedup, corpus-version skip | ✓ SATISFIED | `admit.ts`, `consumer.ts`; suite green, 1044 tests |
| CORE-09, CORE-10 | 01-05 | honest counters | ✓ SATISFIED | `proxiedResponsesObserved` naming; CORE-10 judgment-tier, accepted at UAT, flagged |
| CORE-11 | 01-10, 01-12, 01-16 | outbound prohibition, gated | ✗ BLOCKED | CR-08. The must-NOT holds; the enforcement is partial and declared resolved |
| STORE-01 | 01-01, 01-04, 01-10, 01-15 | schema scope | ⚠️ TENSION (reduced) | Four tables gated. The "capable of holding a secret" half is now honestly bounded by a two-grammar OPEN list with pinned assertions, instead of contradicted |
| STORE-02, STORE-04, STORE-05, STORE-06 | 01-01, 01-04, 01-08 | persistence, retention, migrations | ✓ SATISFIED | `user_version` 2 before/after restart; retention gated |
| STORE-03 | 01-01, 01-07, 01-10, 01-11, 01-14, 01-15, 01-16, 01-17 | (declared for write-path URL redaction) | ✓ SATISFIED | Promoted this round. Mutation-proven at unit AND live tiers. Ledger collision still recorded as deferred with an owner |
| STORE-07 | 01-01, 01-04, 01-07, 01-11, 01-13, 01-16 | (declared for rendered-error redaction) | ✓ SATISFIED | Gate executed; WR-17 closed; residual is an explicit non-closed enumeration |
| STORE-08 | — | `entities`/`evidence`/`audit` | — DEFERRED | Opened unchecked; Phase 4/5 owners in the ROADMAP traceability table |
| COMPAT-01, COMPAT-02 | 01-06 | minimum-version refusal | ✓ SATISFIED | Real 0.55.3 binary, three distinct messages |
| ENC-01 | 01-01, 01-03 | `toRaw()` bytes | ✓ SATISFIED | `consumer.ts:189`; `toText()` AST gate |
| DIST-05, DIST-06 | 01-02 | bundle import allowlist, exact pins | ✓ SATISFIED | Re-executed, 1 specifier |

**Two ledger collisions remain open and are correctly labelled:** STORE-03's text is about content addressing and STORE-07's is about SQL parameter binding, while both are declared for redaction work. Both are recorded in `REQUIREMENTS.md` as DEFERRED WITH AN OWNER (the operator, at the next requirements pass, by the STORE-01 -> STORE-08 route) and with the reason for deferring rather than splitting written out. That is the right handling; it is not resolved.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `packages/backend/src/outbound-prohibition.spec.ts` | 106-111 | Header claims the assembled-key rule reaches "through a one-hop binding"; executed, it does not | 🛑 BLOCKER | The header is what a reader acts on instead of re-probing. Same defect the round-2 rewrite of this same paragraph was for |
| `packages/backend/src/outbound-prohibition.spec.ts` | 1740-1744 | An assertion that appears to bound the assembled-key residual but resolves through `constStrings` | 🛑 BLOCKER | Green-because-it-cannot-fail, under the rule it appears to bound. The file's own header says the phase has removed this shape four times |
| `packages/backend/src/outbound-prohibition.spec.ts` | `receiverKind` element-access branch | `sdk[b ? "requests" : "net"]` fully readable, silent, in NO residual list | 🛑 BLOCKER | Not a bound the walk cannot cross — a shape it can read completely and does not check |
| `packages/backend/src/store/observations.ts` | 175-177 | *"Idempotent for free in all three branches"* — true of the helper, false of `normaliseObservedUrl` at the `URL_MAX` cut | ⚠️ WARNING | WR-22, reproduced independently at a different cut (n=4). A stated invariant is false and the IN-18 pin defers on it |
| `packages/backend/src/outbound-prohibition.spec.ts` | 94-111 / 1124-1131 | `const e = eval; e(s)` reports clean | ⚠️ WARNING | WR-23, executed. The rule whose stated argument is "a string this gate cannot read into" is defeated by one binding |
| `packages/backend/src/store/error-redaction.spec.ts` | 79-100 | `? :`, `??`, `\|\|` renders unseen | ⚠️ WARNING | WR-24, executed. Not an overclaim — the list states it is a non-closed enumeration — but the re-derived residual names methods and accumulators and does not name the operator class |
| `tests/pins.spec.ts` | 316-347 | The WR-21 gate has no EXECUTED failing path | ⚠️ WARNING | WR-25. I confirmed the predicate by hand, so it works; but the file arguing hardest against unfalsifiable gates does not demonstrate its own can fail |
| `.planning/REQUIREMENTS.md` | 46 | Declares CORE-11's enforcement CLOSED with a residual list that does not cover the conditional key | ⚠️ WARNING | The ledger is the last artifact a reader checks and the one they trust most |

No `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` in any source, script, test or CI file. The five `XXXXXX` hits are `mktemp` templates.

### Human Verification Required

None as a checkpoint. Every truth resolved to VERIFIED or FAILED on evidence I executed; no truth was left present-but-behavior-unverified. The two judgment-tier prohibitions (CORE-10, STORE-01) carry NON-AUTHORITATIVE verdicts and remain flagged for human review, but both were accepted by the operator at UAT test 3 and neither introduces a new checkpoint item.

### Gaps Summary

**One gap. It is not the one that was open, and it is not new either — it is the same shape, one level up, in the file that was fixed for it last round.**

Round 3 did what it was asked. The padded credential is gone from `observations.url` on both delimiters and both padding sub-branches; the unit table can go red and I made it; the live tier can go red and there is a committed run where it did; and the claims that were wider than the code are now narrower than it, with two open grammars named, reasoned about, and pinned by assertions that will fail the day somebody closes them. I built an attack before reading the OPEN list and found it already disclosed there. That has not happened in this phase before and it should be said plainly.

What did not change is the relationship between a claim and its enforcement in `outbound-prohibition.spec.ts`. Plan 01-16 correctly taught the gate that an unreadable RECEIVER is a third state — and then wrote a header sentence saying that state is reached "through a one-hop binding", which one `const` disproves. Underneath it sits an assertion that looks like the bound on exactly that rule and passes through a different mechanism entirely. And one shape the walk can read *completely* — a conditional between two literal receiver names — is reported by nothing and disclosed by nothing, in a requirement whose text says "in any spelling".

Nothing leaks. The gate runs green over the real tree, the bundle imports one specifier, and no outbound call exists anywhere in shipped source. This is a gate that would stay green on a call site written next year, not a secret in a column — materially less severe than what blocked round 2, and this report does not inflate it. But CORE-11 is a `verification: gate` prohibition, and a prohibition whose gate cannot go red on the shapes its own statement enumerates is not verified. Fail closed.

The distance to a clean phase is small and specific: collect `assembledNames` beside `constStrings`, read a conditional key on both branches, add the seven shapes I executed as failing-path fixtures, rewrite the `:1740-1744` comment so the literal case stops standing in for a rule it does not touch, and reconcile boundary 2, residual (a), residual (b), T-01-51 and `REQUIREMENTS.md:46` to one bound. Then close WR-22's four-line `&`-boundary truncation and delete or scope the idempotence sentence.

---

_Verified: 2026-08-22T12:40:00Z_
_Verifier: Claude (gsd-verifier)_
