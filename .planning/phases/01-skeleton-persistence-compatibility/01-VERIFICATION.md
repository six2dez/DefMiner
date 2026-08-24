---
phase: 01-skeleton-persistence-compatibility
verified: 2026-08-24T12:20:00Z
status: gaps_found
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  previous_verified: 2026-08-22T12:40:00Z
  round: 4
  verification_pass: 5
  gaps_closed:
    - "CR-08 (the round-3 blocker) — GENUINELY CLOSED, and I verified all eight shapes myself rather than reading the discharge table. Executed against `auditSource`: `const k = \"req\" + \"uests\"; sdk[k].send(req)` -> [\"outbound-unanalysable\"], and the same through `let`, a template, `[\"req\",\"uests\"].join(\"\")` and an opaque call `g()`; `sdk[b ? \"requests\" : \"net\"].send(req)` -> [\"outbound-send\"]; `sdk[(0, \"requests\")].send(req)` -> [\"outbound-send\"]. Every one of those returned `[]` when I probed them in round 3. The `:1740-1744` `constStrings` fixture is gone from under the assembled-key rule, and the mechanism->shape table at `:150-170` matches what I measured row for row for the rows it names. This was the blocker and it is closed."
    - "WR-23 — `const e = eval; e(\"…\")` -> [\"outbound-dynamic-code\"]. Silent in round 3, reports now. The receiver-anchoring twin survived: `const o = { eval(s){} }; const e = o.eval; e(\"x\")` stays quiet."
    - "IN-20 — `const g = globalThis; g.fetch(u)` reports, and I found the alias sets chain to arbitrary depth: 2-hop, 3-hop and 4-hop `fetch`/`sdk.requests`/`navigator`/`eval`/`WebSocket` chains all report."
    - "WR-24 (STORE-07 operator class) — CLOSED, executed by me through the shipped `error-redaction.spec.ts` `auditSource`. `flag ? e.message : \"none\"`, `e.message ?? \"none\"`, `e.message || \"none\"` and `flag && e.message` ALL now report `unredacted-concat`; all were `[]` in round 3. Every `describeError` twin stays quiet, so the descent did not reach past the safe form."
    - "WR-22 (the `normaliseObservedUrl` idempotence break at the `URL_MAX` cut) — the segment-boundary truncation landed and does what it says on the branch it covers. I swept 200 head lengths (n=1900..2100) through the shipped function against a `;jsessionid=SECRETSESSION` payload: ZERO leaks. The redaction half is intact. The DISCLOSURE half is not — see WR-28."
    - "Ledger, mechanically: every requirement id declared in any of the 22 plans' frontmatter resolves in `REQUIREMENTS.md`, and every id the phase is tagged with appears in at least one plan. 23 ids, NO ORPHANS."
  gaps_remaining:
    - "UAT gap 2 / truth 9 (CORE-11 outbound enforcement) — STILL OPEN, and for THREE DIFFERENT REASONS than last round. CR-08 is closed; CR-09, CR-10 and WR-27 are open, and I confirmed all three by execution. The score is 8/9 for the third consecutive round and the failing truth fails for a new cause each time."
  regressions:
    - "CORE-11's CHECKBOX. Round 3 left it `[ ]` and `REQUIREMENTS.md` recorded WHY in its own words: 'While any shape this requirement's own text enumerates is unenforced, its stated reach exceeds its executed reach.' Plan 01-19 flipped it to `[x]` against an eight-row discharge table. I executed the discharge text and found at least THREE of its sentences false — the same standard that produced the `e7cc4b6` revert, now applied to a box that is checked. Round 3's ledger was honest and round 4's is not. That is a regression, and it is the sharpest one in this report."
    - "No behavioural regression. Truths 1-8 all re-verified; `pnpm test` 31 files / 1105 tests exit 0; `pnpm run typecheck` exit 0; prior-phase gate 3 files / 72 tests exit 0; `check:bundle` 1 specifier."
gaps:
  - truth: "No shipped code can introduce outbound traffic without failing a gate (CORE-11 / UAT gap 2)"
    status: partial
    reason: "THREE separate executed findings, all confirmed by me against `auditSource` rather than by repeating the reviewer, and the first of them lands on the text CORE-11's `[x]` was flipped against. (1) CR-09 — THE DOCUMENT-ORDER READ BOUND IS FALSE. `auditSource` runs `collect(sf)` at `:1521` to completion and only then `visit(sf)` at `:1726`, so the position of a USE relative to a DECLARATION cannot bound anything. Executed, six ways: `g.fetch(u);\\nconst g = globalThis;` -> [\"outbound-fetch\"]; `function z(){ return g.fetch(u); }\\nconst g = globalThis;` -> [\"outbound-fetch\"]; `sdk[r].send(req);\\nconst r = \"requests\";` -> [\"outbound-send\"]; `sdk[k].send(req);\\nconst k = \"req\"+\"uests\";` -> [\"outbound-unanalysable\"]; `s.send(req);\\nconst s = sdk.requests;` -> [\"outbound-send\"]; `n.sendBeacon(u,d);\\nconst n = navigator;` -> [\"outbound-beacon\"]; `e(\"x\");\\nconst e = eval;` -> [\"outbound-dynamic-code\"]. THE FIXTURE THAT CLAIMS TO PIN THIS IS GREEN FOR A DIFFERENT REASON: `:2798` is titled 'a chain READ BEFORE ITS ROOT is silent' and its body is `function z() { return g.fetch(u); }\\nconst g = a;\\nconst a = globalThis;`. I removed the function wrapper and moved the read to LAST — `const g = a;\\nconst a = globalThis;\\ng.fetch(u);` -> [] — so the read position is doing nothing. What silences it is INVERTED BINDING ORDER (`g` bound from `a` before `a` is bound), which the title does not name. The TRUE bound, measured: `const a = fetch; const b = a; const c = b; const d = c; d(u)` reports at four hops, while `const b = a; const a = fetch; b(u)` is silent. That is binding-declaration order among the bindings, not read order. WHY THIS IS THE BLOCKING HALF: the false sentence is copied VERBATIM into `REQUIREMENTS.md:46` ('while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass'), into residual (a) at `:212-215`, into THE FINAL RESIDUAL at `:255-257`, into residual (b) at `:216` ('a name whose binding is out of document order ... is NOT reported'), and into `assembledNames`' docblock at `:1049-1053` ('a binding is seen only if its declaration is read before the use site'). `REQUIREMENTS.md:46` is the text CORE-11's `[x]` was flipped against in plan 01-19. (2) CR-10 — A STALE FIRST LITERAL SHADOWS EVERY LATER REBINDING. `keyReceiver` at `:1172` calls `literalOf(key)` FIRST; `literalOf` at `:1243` returns `constStrings.get(name)`; `constStrings` is written ONLY at the VariableDeclaration branch `:1398` and never at the assignment branch. So a name whose declaration bound a harmless literal short-circuits `isAssembledKey` AND `assembledNames` below it. Executed: `let k = \"harmless\"; k = \"requests\"; sdk[k].send(req)` -> []; `let k = \"harmless\"; k = \"req\" + \"uests\"; sdk[k].send(req)` -> []; `let k = \"req\"; k += \"uests\"; sdk[k].send(req)` -> []; `let k; k = \"requests\"; sdk[k].send(req)` -> []; `var k = \"harmless\"; k = \"requests\"; sdk[k].send(req)` -> []. The controls prove these are real misses and not a fixture artefact: `let k; k = \"req\"+\"uests\"; sdk[k].send(req)` -> [\"outbound-unanalysable\"] and `let k = 1; k = \"req\"+\"uests\"; sdk[k]` -> [\"outbound-unanalysable\"] — the SAME assignment fires when no string initializer precedes it. The global path has it too: `let k = \"harmless\"; k = \"fetch\"; globalThis[k](url)` -> [] while `let k; k = \"fetch\"; globalThis[k](url)` -> [\"outbound-unanalysable\"]. WHAT THIS FALSIFIES BY NAME: boundary 2 at `:83-85` says bindings are file-wide 'which OVER-approximates rather than UNDER-approximates: a name bound to an outbound receiver anywhere in the file is treated as one everywhere in it'. Here `k` IS bound to \"requests\" in the file and is treated as one NOWHERE. And `:127-130` says the assembled key resolves 'through EITHER a declaration or an assignment (`assembledNames`)' — executed, the assignment spelling is defeated by any preceding string initializer. (3) WR-27 — A CONDITIONAL RECEIVER IN CALL POSITION IS SILENT, on a fully readable site containing a literal `sdk.requests`. Executed: `(b ? sdk.requests : sdk.net).send(req)` -> []; `(sdk.requests ?? sdk.net).send(req)` -> []; `(sdk.requests || sdk.net).send(req)` -> []. The two controls added in the SAME round both report: the conditional KEY `sdk[b ? \"requests\" : \"net\"].send(req)` -> [\"outbound-send\"] and the conditional INITIALIZER `const r = b ? sdk.requests : sdk.net; r.send(req)` -> [\"outbound-send\"]. Round 4 taught the operator to two of its three faces and left the third, and no residual list names it — the FINAL RESIDUAL enumerates two hops of key, a function boundary, a parameter, a loop binding, another file and the `NUMERIC_MEMBERS` heuristic, and a conditional receiver is none of those. SEVERITY, STATED THE SAME WAY IT WAS LAST ROUND: nothing leaks. The gate runs green over the real tree in the full suite, `check:bundle` reports one specifier (`crypto`), and no outbound call exists in any non-spec source under either root. All three are PROSPECTIVE blindnesses. This is a blocker on the claim-versus-enforcement standard this phase set for itself and has now enforced five times — not on a live secret — AND on the fact that CORE-11's box is now checked against a disclosure I falsified in three sentences."
    severity: major
    artifacts:
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "`:1521` `collect(sf)` completes before `:1726` `visit(sf)`. Therefore every sentence in this file and in `REQUIREMENTS.md` bounding the walk by where a name is READ is false. Five locations: `:212-215` (residual (a)), `:216` (residual (b)), `:255-257` (THE FINAL RESIDUAL), `:1049-1053` (`assembledNames`' docblock), `REQUIREMENTS.md:46`."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "`:2798` — the fixture titled 'a chain READ BEFORE ITS ROOT is silent' is green because its BINDINGS are inverted, not because of the read. Removing the function wrapper and moving the read last keeps it `[]`; keeping the wrapper and binding the root directly makes it report. This is precisely the CR-08 substitution defect — a green-for-a-different-mechanism fixture standing as a rule's bound — in the file whose header at `:148-155` states a reader 'cannot make that substitution again, because every fixture below names its mechanism in its own title'."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "`keyReceiver` at `:1172-1190` consults `literalOf` (and thus `constStrings`) before both unreadable branches, and `constStrings` is populated only from a VariableDeclaration with a string-literal initializer (`:1396-1400`), never from the assignment branch at `:1465-1481`. A stale first literal therefore shadows every later rebinding of the same name, including an assembly. Contradicts `:83-85` ('over-approximates rather than under-approximates') and `:127-130` ('through either a declaration or an assignment')."
      - path: "packages/backend/src/outbound-prohibition.spec.ts"
        issue: "`receiverKind` reads a CONDITIONAL in key position and `initializerReceiver` reads one in initializer position, but nothing reads one in CALL-RECEIVER position. `(b ? sdk.requests : sdk.net).send(req)`, `(sdk.requests ?? sdk.net).send(req)` and `(sdk.requests || sdk.net).send(req)` are all `[]` and are named by no residual clause anywhere."
      - path: ".planning/REQUIREMENTS.md"
        issue: "`:46` — CORE-11 is `[x]`. The discharge text it was flipped against contains at least three sentences I falsified by execution: 'a chain read BEFORE its root is bound is SILENT'; 'a name bound out of document order ... is NOT reported'; and the assembled key resolving 'through either a declaration or an assignment'. Round 3 left this box `[ ]` for exactly this class of reason and said so."
    missing:
      - "Delete the READ-position bound from all five locations and replace it with the bound I measured: an alias chain resolves to ANY depth provided each binding's declaration precedes the declaration of the name it is grown from; a chain whose intermediate is declared before its root is silent. The read site's position is irrelevant because `collect` completes before `visit`."
      - "Re-title `:2798` to name the mechanism that actually silences it (inverted binding order) and add the two shapes that separate it from the read: `function z(){ return g.fetch(u); } const g = globalThis;` (reports) and `const g = a; const a = globalThis; g.fetch(u);` (silent). As written the fixture cannot distinguish the claim from its negation."
      - "Fix CR-10 at the seam rather than the symptom: either make `constStrings` a poisoned map (any second binding of a name removes it, the way `poisonedNumericNames` already works for numbers) or have the assignment branch overwrite/erase the `constStrings` entry. Then `let k = \"harmless\"; k = \"requests\"; sdk[k].send(req)` reports `outbound-send` and `k += \"uests\"` reports `outbound-unanalysable`. Add all five executed shapes as failing-path fixtures, plus the two `let k;` controls that already pass, so the asymmetry is pinned in both directions."
      - "Read a conditional/`??`/`||` receiver in CALL position on all branches, the way key position and initializer position already do. Add `(b ? sdk.requests : sdk.net).send(req)` and both operator twins as fixtures."
      - "Revert CORE-11 to `[ ]` until its disclosure survives execution, or amend the disclosure first and flip after. The `e7cc4b6` precedent is this phase's own and it was applied for a strictly smaller discrepancy than three false sentences."
      - "Correct the three `ONE HOP AND NO MORE` docblocks (WR-30) — each names a source string as silent that reports; `:969`'s exact string is asserted to REPORT by the passing test at `:2782`, 1,800 lines below it."
      - "Correct the 'severed but STABLE' claim (WR-28) in `observations.spec.ts:987` and `schema.spec.ts:272`, or widen the fixture beyond the single offset it picked."
deferred: []
behavior_unverified_items: []
coincidental_reliance_items:
  - truth: "URL userinfo does not reach `observations.url`"
    reason: undeclared-precondition
    harden: "Carried forward from round 3 unchanged and still correct. The `://` precondition is now DECLARED at `schema.spec.ts:115-123` rather than assumed, but the guarantee still rests on `consumer.ts:195` handing over an absolute `rr.request.getUrl()`. Advisory, no score effect."
  - truth: "The head-side `;` truncation residual is a fixed point"
    reason: fixture-only
    harden: "The pinned case at `observations.spec.ts:987` picks head length 2010 and asserts `normaliseObservedUrl(headCut) === headCut`. It holds AT THAT OFFSET. I swept the 71 adjacent offsets (n=1975..2045) and 11 of them are not fixed points — n=2019..2029 inclusive. The fixture's own setup selects the offset that makes the claim true. Advisory here because the claim's failure leaks nothing (0 secret leaks over n=1900..2100) and no production path applies the function twice; recorded as WR-28 in the anti-pattern table."
prohibitions:
  - requirement_id: CORE-11
    statement: "No code that ships in the plugin issues an outbound network request in this phase — no `caido:http` fetch, no `sdk.requests.send` in any spelling, no method of an identified `requests` or `net` receiver outside a read-only allowlist, no global `fetch` by any receiver or alias, no `XMLHttpRequest`/`WebSocket`/`EventSource`, no `navigator.sendBeacon`, no dynamic code construction, and no speculative retrieval of any kind."
    verification: gate
    declared_status: resolved
    status: unverified
    flagged: true
    evidence: "FAIL-CLOSED, for the fourth consecutive round and for a NEW set of reasons. The must-NOT itself HOLDS — no outbound call exists in any non-spec source under either root, the gate runs green over the real tree inside a 1105-test suite, and `check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. The ENFORCEMENT is partial and is declared CLOSED with the box flipped to `[x]`. Genuinely closed since round 3 and confirmed by MY execution: all eight CR-08 shapes report; `const e = eval; e(s)` -> [\"outbound-dynamic-code\"]; `const g = globalThis; g.fetch(u)` -> [\"outbound-fetch\"]; alias chains resolve at 2, 3 and 4 hops across `fetch`, `sdk.requests`, `navigator`, `eval` and `WebSocket`. Still silent, executed by me: `let k = \"harmless\"; k = \"requests\"; sdk[k].send(req)` -> []; `let k = \"req\"; k += \"uests\"; sdk[k].send(req)` -> []; `(b ? sdk.requests : sdk.net).send(req)` -> []; `(sdk.requests ?? sdk.net).send(req)` -> []; `const { k } = o; sdk[k].send(req)` -> []. And the residual list that is supposed to bound this is false in three sentences (CR-09). A `verification: gate` prohibition whose gate cannot go red on shapes its own statement enumerates, and whose disclosure of what it misses is itself falsifiable, is not verified."
  - requirement_id: STORE-03
    statement: "MUST NOT persist a query-string VALUE from a target-controlled URL into observations.url. Parameter names, path, scheme and host are retained; every value is replaced before the row is written."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "HOLDS, re-executed this round on the shape round 4 changed. I swept 200 consecutive head lengths (n=1900..2100) of `https://cdn.test/{p*n};jsessionid=SECRETSESSION` through the shipped `normaliseObservedUrl`: ZERO occurrences of the secret in any output. The round-3 mutation proofs (22 unit assertions red on an in-place revert; committed live runs `20260822T094959Z-31622` red and `20260822T094728Z-11865` clean, read with `sqlite3 -readonly` from outside Caido) stand unchanged and are still committed. The WR-28 defect I found is in the residual's STABILITY claim, not in the redaction: the output is not a fixed point at 11 of 71 adjacent offsets, and nothing leaks at any of them. Recorded as a warning and as a coincidental-reliance item, not as a failure of this prohibition."
  - requirement_id: STORE-07
    statement: "MUST NOT render a caught exception into a persisted or logged string without passing it through describeError first."
    verification: gate
    declared_status: resolved
    status: verified
    flagged: false
    evidence: "PROMOTED — WR-24 is closed and I executed both directions myself through the shipped `error-redaction.spec.ts` `auditSource`. The operator class that was entirely blind in round 3 now reports: `flag ? e.message : \"none\"`, `e.message ?? \"none\"`, `e.message || \"none\"` and `flag && e.message` all -> [\"unredacted-concat\"], alongside the plain `+` control. Every `describeError` twin — including the ternary twin — stays quiet, so the descent bans the leak and not the idiom. Zero residual bare stringification under `packages/backend/src/store`."
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
    evidence: "Carried forward from round 3 substantially unchanged. The column-shape half is gated (PRAGMA-read allowlist + forbidden-name check). The 'capable of holding a secret' half is honestly bounded rather than contradicted: `observations.url` can still hold a path-embedded token and a retained parameter NAME, both named in the OPEN list, both pinned, the second kept BY POLICY under the operator's 2026-08-21 UAT decision. Judgment-tier: NON-AUTHORITATIVE, human review recommended."
---

# Phase 1: Skeleton, Persistence & Compatibility — Verification Report

**Phase Goal:** A plugin that installs, observes every proxied response without stalling, and durably remembers what it saw — with nothing analysed yet beyond a hash.
**Verified:** 2026-08-24T12:20:00Z
**Status:** gaps_found
**Re-verification:** Yes — verification pass 5, after gap-closure ROUND 4 (plans 01-18 … 01-22)

## The verdict on the question I was asked

**Round 4 closed the blocker. It also flipped CORE-11's box to `[x]` against a disclosure I falsified in three sentences — which is the one thing round 3 explicitly refused to do, for the same reason.**

I was asked to reach my own conclusion on CR-09 and CR-10 by execution rather than by repeating the reviewer. I did. Both hold. A third, WR-27, holds too and is in some ways the plainest of the three.

Start with the credit, because it is real and it is large.

**CR-08 is closed and I proved it myself, not from the discharge table.** Every one of the eight shapes I found silent in round 3 now reports:

```
const k = "req" + "uests";  sdk[k].send(req)        ["outbound-unanalysable"]
let k   = "req" + "uests";  sdk[k].send(req)        ["outbound-unanalysable"]
const k = `req${"uests"}`;  sdk[k].send(req)        ["outbound-unanalysable"]
const k = ["req","uests"].join(""); sdk[k].send(req) ["outbound-unanalysable"]
const k = g();              sdk[k].send(req)        ["outbound-unanalysable"]
                            sdk[b?"requests":"net"].send(req)  ["outbound-send"]
                            sdk[(0,"requests")].send(req)      ["outbound-send"]
const e = eval;             e("sdk.requests.send(r)")          ["outbound-dynamic-code"]
```

WR-24 is closed too, and I executed that one end to end as well — the entire operator class that was blind to the STORE-07 gate in round 3 now reports, and every `describeError` twin stays quiet. WR-22's truncation fix works: I swept 200 head lengths against a `;jsessionid=` credential and found zero leaks. And plan 01-19's discovery that alias sets chain to **arbitrary depth** is correct — I confirmed it at two, three and four hops across five different alias sets. That is a finding running in the honest direction, the gate reaching *further* than its disclosure, and round 4 volunteered it rather than being caught at it.

Now the three findings.

### CR-09 — holds. The document-order READ bound is false, and it is false in `REQUIREMENTS.md:46`

`auditSource` runs `collect(sf)` at `:1521` to completion, then `visit(sf)` at `:1726`. There is no way for the position of a *use* to bound anything. Executed, seven ways, every one of which the residual says should be silent:

```
g.fetch(u);              const g = globalThis;     ["outbound-fetch"]
function z(){g.fetch(u)} const g = globalThis;     ["outbound-fetch"]
sdk[r].send(req);        const r = "requests";     ["outbound-send"]
sdk[k].send(req);        const k = "req"+"uests";  ["outbound-unanalysable"]
s.send(req);             const s = sdk.requests;   ["outbound-send"]
n.sendBeacon(u,d);       const n = navigator;      ["outbound-beacon"]
e("x");                  const e = eval;           ["outbound-dynamic-code"]
```

**And the fixture that claims to pin this is green for a different reason.** `:2798` is titled *"a chain READ BEFORE ITS ROOT is silent"*. Its body is `function z() { return g.fetch(u); }` followed by `const g = a; const a = globalThis;`. I removed the function wrapper and moved the read to the end — still `[]`. I kept the wrapper and bound the root directly — it reports. **The read position does nothing; the inverted bindings do everything.** The title names a mechanism the fixture does not test, which is exactly the substitution CR-08 was raised for, in the file whose header at `:148-155` promises a reader "cannot make that substitution again, because every fixture below names its mechanism in its own title."

The true bound, measured rather than reasoned: `const a = fetch; const b = a; const c = b; const d = c; d(u)` reports at four hops, and `const b = a; const a = fetch; b(u)` is silent. It is the order of the **binding declarations relative to each other**, not the read.

**Why this is the blocking half.** That false sentence is not confined to a docblock. It is copied verbatim into residual (a) at `:212-215`, into residual (b) at `:216`, into THE FINAL RESIDUAL at `:255-257`, into `assembledNames`' docblock at `:1049-1053`, and into `REQUIREMENTS.md:46` — **the text CORE-11's `[x]` was flipped against in plan 01-19.** Round 3 left that box `[ ]` and wrote the reason down: *"While any shape this requirement's own text enumerates is unenforced, its stated reach exceeds its executed reach."* Round 4 checked it against a disclosure whose stated reach exceeds its executed reach.

### CR-10 — holds, and the mechanism is one line

`keyReceiver` at `:1172` calls `literalOf(key)` first. `literalOf` at `:1243` returns `constStrings.get(name)`. `constStrings` is written **only** at the VariableDeclaration branch (`:1398`) and **never** at the assignment branch (`:1465-1481`). So a name whose declaration bound a harmless literal short-circuits `isAssembledKey` and `assembledNames` beneath it.

```
let k = "harmless"; k = "requests";      sdk[k].send(req)      []
let k = "harmless"; k = "req"+"uests";   sdk[k].send(req)      []
let k = "req";      k += "uests";        sdk[k].send(req)      []
let k;              k = "requests";      sdk[k].send(req)      []
var k = "harmless"; k = "requests";      sdk[k].send(req)      []
let k = "harmless"; k = "fetch";         globalThis[k](url)    []
```

The controls prove these are genuine misses, not a fixture artefact — **the same assignment fires when no string initializer precedes it**:

```
let k;      k = "req"+"uests";  sdk[k].send(req)     ["outbound-unanalysable"]
let k = 1;  k = "req"+"uests";  sdk[k]               ["outbound-unanalysable"]
let k;      k = "fetch";        globalThis[k](url)   ["outbound-unanalysable"]
```

Two sentences written this round are falsified by this. Boundary 2 at `:83-85`: bindings are file-wide, *"which over-approximates rather than under-approximates: a name bound to an outbound receiver anywhere in the file is treated as one everywhere in it."* Here `k` **is** bound to `"requests"` in the file and is treated as one **nowhere**. And `:127-130`: the assembled key resolves *"through EITHER a declaration or an assignment."* The assignment spelling is defeated by any preceding string initializer.

The member path is immune (`let m = "harmless"; m = "send"; sdk.requests[m](req)` reports) because `sdk.requests` is positively identified by name. So this is the receiver-key/global-key asymmetry again — the fifth appearance of the same shape.

### WR-27 — holds, and it is the plainest of the three

```
(b ? sdk.requests : sdk.net).send(req)    []
(sdk.requests ?? sdk.net).send(req)       []
(sdk.requests || sdk.net).send(req)       []
```

Nothing is hidden. `sdk.requests` is written out in full. The two controls added in the **same round** both report — the conditional KEY (`sdk[b ? "requests" : "net"]` → `outbound-send`) and the conditional INITIALIZER (`const r = b ? sdk.requests : sdk.net; r.send(req)` → `outbound-send`). Round 4 taught the operator two of its three faces and left the third, and no residual clause anywhere names it.

### On severity, stated the same way it was last round

**Nothing leaks.** The gate runs green over the real tree inside a 1105-test suite. `check:bundle` reports one specifier, `crypto`. No outbound call exists in any non-spec source under either root. All three findings are *prospective* blindnesses — a gate that would stay green on a call site somebody writes next year. This report does not inflate them into round 2's live credential.

The blocker is not the leak. It is that CORE-11's box is now checked against a disclosure that fails execution in three places, after a round that reverted the same box for a strictly smaller discrepancy.

## On WR-28, which I reproduced with my own sweep

The head-side `;` residual is asserted "severed but STABLE — a second pass re-expands the marker and re-truncates to the same byte" in two files (`observations.spec.ts:987`, `schema.spec.ts:272`). I swept the 71 offsets adjacent to the one the fixture picked:

```
swept n=1975..2045 : total=71  unstable=11
unstable offsets: 2019 2020 2021 2022 2023 2024 2025 2026 2027 2028 2029

n=2019  pass1 tail "pppppppppppp;jsessionid="   len 2048
        pass2 tail "ppppppppppppp;<redacted>"   len 2047
```

The fixture picks n=2010, where the claim is true. Eleven of its seventy-one neighbours are not fixed points. **Secret leaks over n=1900..2100: zero** — the redaction is intact, the stability claim is not. This is a WARNING, not a blocker, and the reasoning is specific: no production path applies `normaliseObservedUrl` twice, and nothing escapes. But it is WR-22's own lesson — *don't take the reviewer's cut point, sweep for the adversarial one* — applied to the tail branch and not the head branch, in the same commit.

## On WR-30

Three docblocks say `ONE HOP AND NO MORE` and each names a specific source string as silent. All three report:

```
:969   const a = globalThis; const g = a; g.fetch(u)   ["outbound-fetch"]
:1104  const a = eval;       const b = a; b(s)         ["outbound-dynamic-code"]
:1077  const a = navigator;  const n = a; n.sendBeacon(u,d)  ["outbound-beacon"]
```

`:969`'s exact string is asserted to **report** by the passing test at `:2782`, in the same file, 1,800 lines below it. This is under-claiming — the gate reaches further than the prose — so it opens no hole. It is still a claim contradicted by an executed test in the same file.

## Goal Achievement

**All seven ROADMAP Success Criteria hold, and none regressed under round 4. The phase GOAL is achieved. UAT gap 2 is not closed.** Those stay separate, as they have every round.

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `onInterceptResponse` is non-async, gates cheaply, enqueues, returns — analysis never inline | ✓ VERIFIED | `passive.ts:120` is `export function onResponse(`, not async. Regression-checked this round; probed independently in verification 1. |
| 2 | The work queue is bounded and its overflow count is visible | ✓ VERIFIED | `queue.ts:96` exposes `overflowCount` as a getter a take does not reset (`:81`); `index.ts:130` surfaces `queueOverflowCount` on `getStatus()`. `queue.spec.ts` asserts cap+1 → overflow 1 and 3000 offers → 952. |
| 3 | Browsing a 200-chunk SPA leaves UI and RPC responsive, max sync slice under the Phase 0 threshold | ✓ VERIFIED | `results/spa-load.json` re-read: `max_slice_ms 0.029` against a 25 ms budget, gated by `tests/phase1-load.spec.ts` in the green suite. |
| 4 | Artifacts persist across restart, keyed by `project_id`, identical content stored and hashed once | ✓ VERIFIED | `spa-load.json.restart` re-read this round: `identical: true`, `plugin_reattached: true`, `user_version` 2 before and after, 200 artifacts / 200 observations / 200 distinct digests, identical `schema_sha256`. |
| 5 | Offsets and hashes derive from `toRaw()` bytes; a non-UTF-8 fixture round-trips | ✓ VERIFIED | `consumer.ts:189` `const raw = body.toRaw()`; the `toText()` AST gate in `admit.spec.ts` passes and is fixture-proven. |
| 6 | A CI gate fails the build if the backend bundle imports any specifier outside the measured allowlist | ✓ VERIFIED | **Re-executed:** `node scripts/ci/check-bundle-imports.mjs` → `packages/backend/dist/index.js: 1 import specifier(s): crypto`, exit 0. |
| 7 | A Caido build below the declared minimum produces a clear message | ✓ VERIFIED | `MIN_CAIDO = "0.57.1"` at `compat.ts:43`; refusal messages at `:332/:352/:363` naming both versions. Proven against the real 0.55.3 binary in `compat-smoke.json` leg C. |
| 8 | **[UAT gap 1]** `observations.url` does not persist query-string values verbatim | ✓ VERIFIED — holds | My own 200-offset sweep of a `;jsessionid=SECRETSESSION` payload through the shipped `normaliseObservedUrl`: **zero leaks**. Round-3 mutation proofs at both unit and live tiers stand unchanged. WR-28 is a defect in the residual's STABILITY claim, not in the redaction. |
| 9 | **[UAT gap 2]** No shipped code can introduce outbound traffic without failing a gate | ✗ FAILED (partial) | CR-08 closed. CR-09, CR-10 and WR-27 open, all three executed by me. `let k = "harmless"; k = "requests"; sdk[k].send(req)` → `[]`; `(b ? sdk.requests : sdk.net).send(req)` → `[]`; and the document-order READ bound is false in five artifacts including `REQUIREMENTS.md:46`, the text the `[x]` was flipped against. |

**Score:** 8/9 truths verified (0 present, behavior-unverified)

**8/9 for the third round running, and the 8 is the same 8 as last time while the 9 fails for entirely new causes.** Round 3's failing truth was CR-08 — an assembled key defeated by one `const`, and a conditional key nobody had disclosed. That is closed; I verified all eight shapes. What replaced it is a stale literal shadowing every rebinding, a conditional receiver in call position, and a residual sentence that is false in five places. **The one genuinely new thing this round is that the ledger moved in the wrong direction:** round 3's `REQUIREMENTS.md` said "this box stays `[ ]` deliberately, and this is the reason", and round 4 checked it.

### What round 4 genuinely delivered

Adversarial verification is not one-sided, and this round delivered more than any previous one.

| Deliverable | Status | What I executed or re-derived |
|---|---|---|
| CR-08, the round-3 blocker | ✓ CLOSED, all eight shapes, verified by me | One-hop assembled key in five spellings, the conditional key, the comma sequence — every one silent in round 3, every one reporting now. |
| WR-23, the `eval` alias | ✓ CLOSED | `const e = eval; e("…")` → `outbound-dynamic-code`. The receiver-anchoring twin (`const o = { eval(s){} }`) stays quiet, so the widening did not over-reach. |
| IN-20, the `globalThis` hop | ✓ CLOSED, and it uncovered more than it fixed | `const g = globalThis; g.fetch(u)` reports. Plan 01-19 then MEASURED that alias sets chain to arbitrary depth and said so — I confirmed at 2, 3 and 4 hops across five sets. A finding volunteered in the honest direction. |
| WR-24, the STORE-07 operator class | ✓ CLOSED, executed by me end to end | `? :`, `??`, `\|\|` and `&&` all report `unredacted-concat`; all four were `[]` in round 3. Every `describeError` twin stays quiet including the ternary twin. |
| WR-22, the truncation | ✓ CLOSED on the branch it covers | My own 200-offset sweep: zero secret leaks. The `&`-boundary drop-back works. Its DISCLOSURE is where WR-28 lives. |
| Residual (a)'s split | ✓ HALF RIGHT, and the right half is the honest one | The ALIAS half is correct and I confirmed it — chains resolve to any depth. The BOUND it substituted ("a chain read before its root is silent") is false, which is CR-09. Round 4 got the widening right and the new limit wrong. |
| The mechanism→shape table | ✓ ACCURATE for the rows it names | I checked it row for row against execution. Every row it lists is true. The defect is what it omits — a reassigned key, a conditional receiver — and those omissions are not in the NOTHING rows either. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/backend/src/store/observations.ts` | Write-path URL redaction, all grammars | ✓ VERIFIED | `redactDelimitedSegment` walks the VALUE half; `normaliseObservedUrl:463-475` now drops back to a segment boundary. Wired into `recordObservation`, data flowing from `consumer.ts:446`. Zero leaks in my 200-offset sweep. |
| `packages/backend/src/store/observations.spec.ts` | Fixtures that can fail | ⚠️ PARTIAL | The `BARE_CREDENTIAL_SHAPES` table and its structural assertions are strong and mutation-proven. `:987`'s "severed but STABLE" pin holds only at the one offset it picked (WR-28). |
| `packages/backend/src/store/schema.spec.ts` | Per-grammar claim with a complete OPEN list | ⚠️ PARTIAL | Two grammars named with per-grammar tier attribution — the round-3 fix stands. `:272` repeats the false stability claim. |
| `packages/backend/src/outbound-prohibition.spec.ts` | CORE-11 gate over both shipped roots | ⚠️ PARTIAL | 2911 lines, both roots, by-name non-vacuity. CR-08's eight shapes all closed. Stale-literal key shadowing, conditional receiver in call position, and destructured key bindings all silent; the document-order READ bound false in four places in this file; three `ONE HOP` docblocks contradicted by their own tests. |
| `packages/backend/src/store/error-redaction.spec.ts` | STORE-07 gate | ✓ VERIFIED | WR-17 and WR-24 both closed, both executed by me. The full operator class reports; every `describeError` twin quiet. |
| `tests/pins.spec.ts` | The WR-21 gate the tracer claimed | ✓ VERIFIED | WR-25 closed — `versionLiterals` lifted out, four fixtures execute both directions, the load-bearing one plants the literal into the real file's bytes. |
| `scripts/ci/check-bundle-imports.mjs` | DIST-05 bundle allowlist gate | ✓ VERIFIED | Re-executed: 1 specifier, `crypto`, exit 0. |
| `scripts/phase1/tracer-e2e.sh` | Live end-to-end proof against the DB file | ✓ VERIFIED | Six grammars, two padded dyes under both spellings; IN-21 closed (`padded_segments_reached` can no longer report off an empty generator). |
| `packages/backend/src/compat.ts` | COMPAT-01/02 refusal | ✓ VERIFIED | `MIN_CAIDO` + three distinct messages, proven on a real 0.55.3 binary. |
| `.planning/REQUIREMENTS.md` | Honest ledger | ✗ FAILED | CORE-11 is `[x]`. Its discharge text contains three sentences I falsified by execution. Round 3 left this box `[ ]` for a strictly smaller discrepancy and recorded the reason. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `hooks/passive.ts` | `engine/queue.ts` | `offer()` from a non-async handler | ✓ WIRED | Regression-checked; unchanged. |
| `ingest/consumer.ts:446` | `store/observations.ts` | `recordObservation(...)` with `got.url` | ✓ WIRED | Real data path; `got.url` from `rr.request.getUrl()` at `:195`. |
| `store/observations.ts` | SQLite `observations.url` | `normaliseObservedUrl(url)` inside the INSERT parameters | ✓ WIRED | Write-path, settled against the real database file by the committed clean and mutation runs. |
| `outbound-prohibition.spec.ts` | `packages/engine/src` | `SOURCE_ROOTS[1]` + by-name non-vacuity | ✓ WIRED | 23 files over both roots, zero violations on the real tree. |
| `tests/pins.spec.ts` | `scripts/phase1/tracer-e2e.sh` | `readFileSync` raw text + `versionLiterals` | ✓ WIRED | Now with four executed fixtures in both directions (WR-25 closed). |
| `index.ts:130` | `engine/queue.ts:96` | `queue.overflowCount` → `getStatus().queueOverflowCount` | ✓ WIRED | RPC-visible. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `observations.url` | `url` | `rr.request.getUrl()` → `normaliseObservedUrl` | ✓ read back with `sqlite3 -readonly` from outside Caido, `raw rows == rpc rows` | ✓ FLOWING, redacted per policy |
| `getStatus().queueOverflowCount` | `queue.overflowCount` | live `BoundedQueue` instance | ✓ | ✓ FLOWING |
| `spa-load.json.max_slice_ms` | measured slice | live 200-chunk run | ✓ 0.029 ms vs 25 ms budget | ✓ FLOWING |
| `check-bundle-imports` specifier set | parsed `dist/index.js` | real built bundle | ✓ 1 specifier | ✓ FLOWING |
| `spa-load.json.restart` digests | live SQLite file, before and after | real Caido restart | ✓ 200/200 distinct, identical `schema_sha256` | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full suite green | `pnpm test` (run ONCE) | 31 files, **1105 tests passed**, exit 0 | ✓ PASS |
| Typecheck | `pnpm run typecheck` (`tsc --build`) | exit 0 | ✓ PASS |
| Prior-phase regression gate | `vitest run tests/go-no-go tests/schema tests/spike-results` | 3 files, **72 tests**, exit 0 — Phase 0 baseline unchanged | ✓ PASS |
| Bundle import gate | `node scripts/ci/check-bundle-imports.mjs` | `1 import specifier(s): crypto`, exit 0 | ✓ PASS |
| CR-08 closure, all 8 shapes | throwaway spec importing `auditSource` | every shape that was `[]` in round 3 now reports | ✓ PASS |
| WR-23 / IN-20 / alias chaining | same probe, 6 shapes | `const e = eval; e(s)` reports; chains report at 2, 3 and 4 hops across 5 sets | ✓ PASS |
| WR-24 operator class | throwaway spec importing STORE-07 `auditSource`, 7 shapes | `? :`, `??`, `\|\|`, `&&` all report; both `describeError` twins quiet | ✓ PASS |
| STORE-03 leak sweep | 200 head lengths × `;jsessionid=SECRETSESSION` through `normaliseObservedUrl` | **0 leaks** | ✓ PASS |
| CR-09 document-order read | throwaway spec, 7 use-before-declaration shapes | **all 7 report** — the READ bound is false | ✗ FAIL (blocker) |
| CR-09 fixture diagnosis | `:2798`'s body, wrapper removed and read moved last | still `[]`; wrapper kept with root bound directly → reports | ✗ FAIL (blocker) |
| CR-10 stale literal | throwaway spec, 6 shapes + 3 controls | 6 silent, 3 controls fire — the miss is real | ✗ FAIL (blocker) |
| WR-27 conditional receiver | throwaway spec, 3 operator forms + 2 controls | `? :`, `??`, `\|\|` in call position all `[]`; both controls report | ✗ FAIL (blocker) |
| WR-28 stability sweep | 71 adjacent head offsets through `normaliseObservedUrl` twice | **11 of 71 not fixed points** (n=2019..2029); 0 leaks | ✗ FAIL (warning) |
| WR-30 one-hop docblocks | 3 docblock source strings executed verbatim | all 3 report; `:969`'s string is asserted to report at `:2782` | ✗ FAIL (warning) |
| IN-26 destructured key | `const { k } = o; sdk[k].send(req)` | `[]`, and not in any residual row | ✗ FAIL (warning) |
| Tree clean after probes | `git status --short` | no probe artefacts, no source-tree changes | ✓ PASS |
| Debt markers | `grep -rn "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` over source, scripts, tests | **zero** | ✓ PASS |

**Note on the 1105:** every one of them passes with CR-09, CR-10 and WR-27 live. The suite grew 1044 → 1105 across this round and none of the 61 new assertions can see any of the three. That asymmetry — which findings the suite can see and which it cannot — is the measurement, not the count.

### Probe Execution

| Probe | Command | Result | Status |
|---|---|---|---|
| Live tracer, round 3 clean | recorded run `20260822T094728Z-11865` (`caido_version=0.58.0`) | nine values at 0 in raw column and RPC; `raw rows == rpc rows : 2 == 2` | PASS (recorded — needs a live Caido instance) |
| Live tracer, round 3 mutation | recorded run `20260822T094959Z-31622` | 18 assertions RED; both padded dyes visible in the durable column | PASS (recorded) |
| Live tracer, round 2 clean + mutation | runs `20260821T150022Z-16902`, `20260821T150143Z-19295` | unchanged, still committed | PASS (recorded) |
| Compat smoke | `results/compat-smoke.json` | leg C refuses on the real 0.55.3 binary | PASS (recorded) |

Live-tier probes were not re-executed: they need a running Caido and a proxied origin, which Step 7b's constraints exclude. Round 4 changed no live-tier behaviour — its edits are confined to the two AST gates and to `normaliseObservedUrl`'s truncation, and I covered the last of those with a host-side 200-offset sweep instead.

### Requirements Coverage

Every id declared in any of the 22 plans' frontmatter resolves in `REQUIREMENTS.md`, and every id the phase is tagged with appears in at least one plan's frontmatter. **23 ids, no orphans.**

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| CORE-01 | 01-01, 01-09 | non-async handler | ✓ SATISFIED | `passive.ts:120` |
| CORE-02 … CORE-08 | 01-03, 01-04 | admission, dedup, corpus-version skip | ✓ SATISFIED | `admit.ts`, `consumer.ts`; suite green, 1105 tests |
| CORE-09, CORE-10 | 01-05 | honest counters | ✓ SATISFIED | `proxiedResponsesObserved` naming; CORE-10 judgment-tier, accepted at UAT, flagged |
| CORE-11 | 01-10, 01-12, 01-16, 01-18, 01-19 | outbound prohibition, gated | ✗ BLOCKED | The must-NOT holds. The enforcement is partial, the residual is false in five places, and the box is `[x]` |
| STORE-01 | 01-01, 01-04, 01-10, 01-15 | schema scope | ⚠️ TENSION (unchanged from round 3) | Four tables gated; the "capable of holding a secret" half honestly bounded and pinned |
| STORE-02, STORE-04, STORE-05, STORE-06 | 01-01, 01-04, 01-08 | persistence, retention, migrations | ✓ SATISFIED | `user_version` 2 before/after restart; retention gated |
| STORE-03 | 01-01, 01-07, 01-10, 01-11, 01-14 … 01-17, 01-20 | (declared for write-path URL redaction) | ✓ SATISFIED | 200-offset leak sweep clean; round-3 mutation proofs at both tiers stand. Ledger collision still deferred with an owner |
| STORE-07 | 01-01, 01-04, 01-07, 01-11, 01-13, 01-16, 01-21 | (declared for rendered-error redaction) | ✓ SATISFIED | PROMOTED — WR-24 closed, operator class executed by me in both directions |
| STORE-08 | — | `entities`/`evidence`/`audit` | — DEFERRED | Opened unchecked; Phase 4/5 owners in the ROADMAP traceability table |
| COMPAT-01, COMPAT-02 | 01-06 | minimum-version refusal | ✓ SATISFIED | Real 0.55.3 binary, three distinct messages |
| ENC-01 | 01-01, 01-03 | `toRaw()` bytes | ✓ SATISFIED | `consumer.ts:189`; `toText()` AST gate |
| DIST-05, DIST-06 | 01-02 | bundle import allowlist, exact pins | ✓ SATISFIED | Re-executed, 1 specifier |

**Two ledger collisions remain open and are correctly labelled** (STORE-03's text is about content addressing, STORE-07's about SQL parameter binding, while both are declared for redaction work). Both are recorded in `REQUIREMENTS.md` as DEFERRED WITH AN OWNER, with the reason written out. That handling is right; it is not resolved.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `packages/backend/src/outbound-prohibition.spec.ts` | 212-215, 216, 255-257, 1049-1053 | The READ-position document-order bound, stated four times, false in all four | 🛑 BLOCKER | `collect(sf)` at `:1521` completes before `visit(sf)` at `:1726`. Seven executed shapes report where the residual says they are silent |
| `.planning/REQUIREMENTS.md` | 46 | CORE-11 `[x]`, flipped against a discharge text containing three sentences I falsified | 🛑 BLOCKER | The ledger is the last artifact a reader checks. Round 3 left this box `[ ]` for a strictly smaller discrepancy and wrote the reason down |
| `packages/backend/src/outbound-prohibition.spec.ts` | 2798 | Fixture titled "a chain READ BEFORE ITS ROOT is silent" is green because its bindings are inverted | 🛑 BLOCKER | Green-for-a-different-mechanism, under a title naming the mechanism it does not test — the CR-08 defect, in the file whose header promises it cannot recur |
| `packages/backend/src/outbound-prohibition.spec.ts` | 1172-1190 / 1398 / 1465-1481 | `constStrings` consulted first, written only from declarations — a stale literal shadows every rebinding | 🛑 BLOCKER | Six executed shapes silent, three controls firing. Falsifies `:83-85` ("over-approximates rather than under-approximates") and `:127-130` ("declaration or an assignment") |
| `packages/backend/src/outbound-prohibition.spec.ts` | `receiverKind`, call position | `(b ? sdk.requests : sdk.net).send(req)`, `??` and `\|\|` all `[]` | 🛑 BLOCKER | A fully readable site with a literal `sdk.requests` in it, silent, in no residual list — while the key and initializer faces of the same operator were both added this round |
| `packages/backend/src/store/observations.spec.ts` | 987 | "severed but STABLE" holds at the one offset the fixture picked | ⚠️ WARNING | WR-28. 11 of 71 adjacent offsets are not fixed points. Zero leaks, so it is a false claim rather than an exposure |
| `packages/backend/src/store/schema.spec.ts` | 272 | The same false stability claim, repeated in the schema ledger | ⚠️ WARNING | WR-28's second location. The schema entry is the disclosure a reader trusts |
| `packages/backend/src/outbound-prohibition.spec.ts` | 969, 1077, 1104 | Three `ONE HOP AND NO MORE` docblocks naming source strings that report | ⚠️ WARNING | WR-30. `:969`'s exact string is asserted to REPORT by the passing test at `:2782`. Under-claiming, so no hole — but contradicted in-file |
| `packages/backend/src/outbound-prohibition.spec.ts` | `assembledNames` collect branch | A destructured key binding is not collected | ⚠️ WARNING | IN-26. `const { k } = o; sdk[k].send(req)` → `[]`, and it is in no residual row |

No `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` in any source, script, test or CI file.

### Human Verification Required

None as a checkpoint. This is an infrastructure/foundation phase; every truth resolved to VERIFIED or FAILED on evidence I executed, and no truth was left present-but-behavior-unverified. The two judgment-tier prohibitions (CORE-10, STORE-01) carry NON-AUTHORITATIVE verdicts and remain flagged for human review; both were accepted by the operator at UAT test 3 and neither introduces a new checkpoint item.

### Gaps Summary

**One gap, third round running, failing for its third distinct cause — and one regression that is new.**

Round 4 was the most productive round of the five. It closed the blocker completely: I verified all eight CR-08 shapes myself and every one that was silent in round 3 now reports. It closed WR-23, WR-24, IN-20, WR-25, IN-21 and IN-22. It landed a truncation fix I swept 200 offsets against without finding a leak. And in the middle of it, plan 01-19 measured that the alias sets reach *further* than every residual list had ever said and volunteered that correction rather than being caught at it — the first time in five rounds a claim in this repo was narrower than its code.

What did not change is the relationship between a claim and its enforcement. In closing CR-08, round 4 wrote a new bound — *"a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass"* — into five artifacts, and the function it describes runs `collect` to completion before `visit`, so the read position bounds nothing at all. Seven shapes I executed report where that sentence says they are silent. The fixture pinning it is green because its bindings are inverted, under a title naming the read. Beside it, a stale first literal shadows every later rebinding of a receiver key, silently, in contradiction of a sentence two paragraphs up that says this gate over-approximates rather than under-approximates. And the operator that round 4 taught to key position and initializer position was left untaught in call position, so `(b ? sdk.requests : sdk.net).send(req)` — a literal `sdk.requests`, hiding nothing — reports nothing.

**Nothing leaks.** The gate runs green over the real tree, the bundle imports one specifier, no outbound call exists in shipped source, and all three findings are prospective. Weighed against round 2's live credential in a durable column, they are small.

**The regression is the ledger.** Round 3's `REQUIREMENTS.md` left CORE-11 `[ ]` and stated why in its own words: *"While any shape this requirement's own text enumerates is unenforced, its stated reach exceeds its executed reach, which is precisely the defect this correction closes one level down."* Round 4 checked the box against a disclosure whose stated reach exceeds its executed reach in three sentences. That box was reverted once already, at `e7cc4b6`, for less.

The distance to a clean phase is small and entirely specific: delete the READ-position bound from five places and replace it with the binding-order bound I measured; re-title `:2798` and give it the two shapes that separate the claim from its negation; poison `constStrings` on rebinding so a stale literal stops short-circuiting the branches beneath it; read the operator in call position the way it is already read in the other two; correct the three `ONE HOP` docblocks and the two "severed but STABLE" sentences; and either revert CORE-11 to `[ ]` or amend its disclosure before flipping it.

---

_Verified: 2026-08-24T12:20:00Z_
_Verifier: Claude (gsd-verifier)_
