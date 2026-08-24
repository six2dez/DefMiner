---
phase: 01-skeleton-persistence-compatibility
plan: 29
subsystem: testing
tags: [outbound-gate, core-11, derived-residual, mutation-testing, typescript-ast, wr-32]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "the derived residual — RESOLVER_REGISTRY, deriveResidual, extractDerivedBlock, the two byte-compared surfaces, the two-population coverage guard (waves 27 and 28)"
provides:
  - "`BranchProbe` and `ResolverRecord.branches` — the THIRD binding: a row's CLAUSE to the BRANCHES it names, by execution"
  - "60 branch probes across 32 rows; every resolver row carries at least one"
  - "`BRANCH_VOCABULARY` (47 phrases) and the coverage guard that makes a clause naming a branch with no probe a FAILING TEST"
  - "`UNBOUNDED_QUANTIFIERS` (9 phrasings) + `QUANTIFIED_CLAUSES` (7 measured bounds) — a universal in a declared phrasing must name what bounds it"
  - "`FALSIFIED_HANDOFFS` — the handoff as DATA with an executed probe, closing the widening-without-phrase direction the vocabulary guard cannot reach"
  - "corrected preamble point 1 and a new point 5 naming FOUR things clause-to-branch binding cannot prove, shipped on both byte-compared surfaces"
affects: [wave-30-CR-13, wave-31-CR-12, wave-32-CR-11-and-CORE-11]

actuals:
  tokens: 62000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Clause-to-branch binding: a declared phrase vocabulary turns 'this clause names that branch' into a string test rather than a reading"
    - "Handoff-as-data: the owning wave lives in a frozen list, so discharging the handoff and deleting the note are ONE act"
    - "A pin expected to reach ZERO deliberately carries NO non-vacuity assertion, so the discharging wave need not delete an assertion"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "`branches` with a `names` field rather than the reviewer's cheaper flat `probes` array: a flat array proves N probes RUN, not that they CORRESPOND to the N branches the clause names, which is the whole of WR-32"
  - "Three vocabulary collisions the guard found were fixed at the CLAUSE, never at the guard"
  - "The owning wave is DATA in `FALSIFIED_HANDOFFS`, never prose inside a clause — enforced by its own guard"
  - "`FALSIFIED_HANDOFFS` carries no non-vacuity assertion because its correct final value is ZERO"
  - "Preamble point 1 was CORRECTED to the stronger claim the new probes support, not truncated to the safe half"
  - "`UNBOUNDED_QUANTIFIERS`' reach is DECLARED-PHRASING OR NOTHING, disclosed in the docblock, the shipped block and the ledger"

patterns-established:
  - "Every new enumeration pins its count by equality with a message saying a SHRINKING enumeration is the failure"
  - "A branch anchor must match at the START of a trimmed line, because the anchor text now appears on THREE self-satisfying surfaces"

requirements-completed: []

coverage:
  - id: D1
    description: "A registry row's CLAUSE is bound to the BRANCHES it names, by execution — 60 probes across 32 rows, each read off its own code site"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#branch %s — its probe is executed against auditSource"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#every RESOLVER row carries at least one branch"
        status: pass
    human_judgment: false
  - id: D2
    description: "WR-32 closed at the seam: the verifier's own PlusEqualsToken deletion turns the assembledNames ROW red, at ROW granularity"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "mutation proof 1 — executed 2026-08-24, RED title and message pasted below, restored, re-run green"
        status: pass
    human_judgment: false
  - id: D3
    description: "A clause naming a branch with no probe is a failing test — BRANCH_VOCABULARY coverage guard with non-vacuity and pinned counts"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#every BRANCH_VOCABULARY phrase present in a clause has a BRANCH answering it"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#BRANCH_VOCABULARY is NON-EMPTY, every phrase in it occurs in at least one clause, and the hit count is PINNED"
        status: pass
    human_judgment: false
  - id: D4
    description: "A universal in a DECLARED phrasing names a measured bound — UNBOUNDED_QUANTIFIERS + QUANTIFIED_CLAUSES, checked against this round's three false universals"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#every clause carrying a DECLARED quantifier phrasing names a MEASURED bound"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the quantifier scan catches ALL THREE universals this round falsified"
        status: pass
    human_judgment: false
  - id: D5
    description: "FALSIFIED_HANDOFFS: six phrases measured false, each with the probe that measured it and a case asserting it is STILL false"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#handoff %s — the falsified phrase is STILL false, measured against the code as it stands"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#no corrected clause names its owning wave in prose — the owner is DATA"
        status: pass
    human_judgment: false
  - id: D6
    description: "Corrected preamble point 1 and the FOUR-limit point 5 ship byte-identically on both surfaces"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY), byte for byte"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte"
        status: pass
    human_judgment: false
  - id: D7
    description: "STATE.md's sixth P9-D3 pointer amendment and WINDOWS.md entry 34 restate no bound — a rule with NO mechanical check"
    verification: []
    human_judgment: true
    rationale: "The pointer-not-a-bound rule is a PROHIBITION WITH NO MECHANICAL CHECK: the byte comparison reaches the gate header and REQUIREMENTS.md and no further. Whether these two amendments restate a bound is a reading, and this plan says so rather than implying the rule is enforced."

duration: 28 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 29: Clause-to-Branch Binding Summary

**The third binding: `ResolverRecord.branches` gives every clause-named branch its own executed probe, so the verifier's `PlusEqualsToken` deletion — which left the whole derived block at 52 passed, 0 failed — now turns the `assembledNames` ROW red by name.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-08-24T18:37:00Z
- **Completed:** 2026-08-24T19:05:11Z
- **Tasks:** 3
- **Files modified:** 4

## Task Commits

1. **Task 1: one clause end to end (tracer)** — `4d61c73` (feat)
2. **Task 2: branches for every row + the six falsified clauses** — `8eb82cc` (feat)
3. **Task 3: quantifier guard, corrected preamble, pointer surfaces** — `006756d` (feat)

## Precondition

Asserted before the first edit: both byte comparisons green, `pnpm test` at **31 files / 1200 tests, exit 0**.

## 1. `BranchProbe`, and why it is not a flat `probes` array

```ts
export type BranchProbe = {
  /** The clause phrase this branch answers, spelled EXACTLY as `BRANCH_VOCABULARY` spells it. */
  readonly names: string;
  /** A greppable anchor for THIS branch's own code site, in `site`'s convention. */
  readonly anchor: string;
  /** A source string exercising THAT branch and no other. */
  readonly probe: string;
  /** What `auditSource` reports for `probe`. MEASURED, never predicted. */
  readonly expect: readonly RuleId[];
};
```

Docblock, pasted:

> **WHY THIS IS `branches` WITH A `names` FIELD AND NOT A FLAT `probes` ARRAY, AND A LATER AUTHOR MUST NOT SIMPLIFY IT BACK.** The cheaper repair WR-32 offered was a flat list of extra probes per row. A flat array proves that N probes RUN. It does not prove they CORRESPOND to the N branches the CLAUSE names, and the correspondence is the whole finding — each row's single probe already happened to exercise one branch, and that is exactly what stayed green under the mutation. `names` carries the clause phrase VERBATIM, which is what lets `BRANCH_VOCABULARY` turn "this clause names that branch" into a string test rather than a reading. Collapsing `branches` into an unnamed list would delete the guard and keep the tests, which is the shape of every finding in this phase.

## 2. The branch table — 60 probes, 32 rows, each read off its own code site

| Row | Phrase | Anchor (line-start asserted) | Measured |
|---|---|---|---|
| constStrings | a string-literal declaration | `collect > if (ts.isStringLiteralLike(init)) {` | `["outbound-send"]` |
| constStrings | a string-literal assignment | `collect > if (ts.isStringLiteralLike(assignedString)) {` | `["outbound-send"]` |
| assembledNames | a declaration | `collect > if (isAssembledKey(init, …)) {` | `["outbound-unanalysable"]` |
| assembledNames | an assignment | `collect > if (isAssembledKey(node.right, …)) {` | `["outbound-unanalysable"]` |
| **assembledNames** | **a `+=` compound assignment** | **`collect > node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken &&`** | `["outbound-unanalysable"]` |
| assembledNames | either binding-pattern spelling | `collect > destructuredInitializer(init, el, 0),` | `["outbound-unanalysable"]` |
| assembledNames | either binding-pattern spelling | `collect > destructuredInitializer(init, el, index),` | `["outbound-unanalysable"]` |
| receiverAliases | a declaration | `collect > receiverAliases.set(node.name.text, kind);` | `["outbound-send"]` |
| receiverAliases | an assignment | `collect > receiverAliases.set(node.left.text, kind);` | `["outbound-send"]` |
| unreadableAliases | where the name is USED as a receiver | `receiverKind > return unreadableAliases.has(inner.text)` | `["outbound-unanalysable"]` |
| fetchAliases | the bare spelling | `const fetchAliases = new Set<string>([FETCH_GLOBAL]);` | `["outbound-fetch"]` |
| fetchAliases | a declaration | `collect > if (isFetchExpression(init)) fetchAliases.add(…)` | `["outbound-fetch"]` |
| fetchAliases | an assignment | `collect > if (isFetchExpression(node.right)) fetchAliases.add(…)` | `["outbound-fetch"]` |
| navigatorAliases | a declaration | `collect > if (isNavigatorReceiver(init)) navigatorAliases.add(…)` | `["outbound-beacon"]` |
| navigatorAliases | an assignment | `collect > if (isNavigatorReceiver(node.right)) navigatorAliases.add(…)` | `["outbound-beacon"]` |
| globalAliases | a declaration | `collect > if (aliased !== undefined) globalAliases.set(…)` | `["outbound-dynamic-code"]` |
| globalAliases | an assignment | `collect > globalAliases.set(node.left.text, aliasedRight);` | `["outbound-dynamic-code"]` |
| globalAliases | the object binding-pattern spelling | `collect > globalAliases.set(el.name.text, property);` | `["outbound-dynamic-code"]` |
| globalThisAliases | a declaration | `collect > if (isGlobalReceiver(init)) globalThisAliases.add(…)` | `["outbound-fetch"]` |
| globalThisAliases | an assignment | `collect > if (isGlobalReceiver(node.right)) globalThisAliases.add(…)` | `["outbound-fetch"]` |
| shadowedGlobals | a TOP-LEVEL function or class declaration | `collect > shadowedGlobals.add(node.name.text);` | `[]` |
| numericNames | a name bound only to provably numeric values | `collect > numericNames.add(node.name.text);` | `[]` |
| poisonedNumericNames | stops being an index | `collect > poisonedNumericNames.add(node.left.text);` | `["outbound-send"]` |
| isGlobalReceiver | one-hop resolution of a GLOBAL receiver | `const isGlobalReceiver = (node: ts.Expression): boolean =>` | `["outbound-fetch"]` |
| keyReceiver | watched assembly | `keyReceiver > assembledNames.has(assembledKey.text)` | `["outbound-unanalysable"]` |
| keyReceiver | any literal binding | `keyReceiver > for (const literal of literalsOf(key)) {` | `["outbound-send"]` |
| keyReceiver | inline assembly | `keyReceiver > if (isAssembledKey(key, …)) {` | `["outbound-unanalysable"]` |
| receiverKind | a bare operator written directly in call position | `receiverKind > const operator = operatorReceiver(inner, receiverKind);` | `["outbound-send"]` |
| literalsOf | the collected set | `literalsOf > return constStrings.get(node.text) ?? NO_LITERALS;` | `["outbound-send"]` |
| literalOf | two or more answer undefined | `literalOf > if (literals.size !== 1) return undefined;` | `["outbound-unanalysable"]` |
| memberName | read single-valued | `memberName > : literalOf(node.argumentExpression);` | `["outbound-send"]` |
| initializerReceiver | a NAME for receiverKind | `const initializerReceiver = (node: ts.Expression): ReceiverKind =>` | `["outbound-send"]` |
| isFetchExpression | on any of the four global receivers | `isFetchExpression > memberName(inner) === FETCH_GLOBAL && isGlobalReceiver(…)` | `["outbound-fetch"]` |
| isFetchExpression | through an alias | `isFetchExpression > if (ts.isIdentifier(inner)) return fetchAliases.has(…)` | `["outbound-fetch"]` |
| isNavigatorReceiver | through a global receiver | `isNavigatorReceiver > memberName(inner) === NAVIGATOR && isGlobalReceiver(…)` | `["outbound-beacon"]` |
| isNavigatorReceiver | through a one-hop alias | `isNavigatorReceiver > if (ts.isIdentifier(inner)) return navigatorAliases.has(…)` | `["outbound-beacon"]` |
| globalNameOf | a collected alias | `globalNameOf > return globalAliases.get(name);` | `["outbound-dynamic-code"]` |
| dynamicCodeOf | refused outright rather than analysed | `const dynamicCodeOf = (node: ts.Expression): string \| undefined => {` | `["outbound-dynamic-code"]` |
| outboundCtorOf | in construction position | `const outboundCtorOf = (node: ts.Expression): string \| undefined => {` | `["outbound-global-ctor"]` |
| outboundCtorOf | through an alias | `outboundCtorOf > return global !== undefined && OUTBOUND_CONSTRUCTORS.has(global)` | `["outbound-global-ctor"]` |
| aliasedGlobalOf | a bare identifier | `aliasedGlobalOf > return (DYNAMIC_CODE.has(name) \|\| OUTBOUND_CONSTRUCTORS.has(name)) &&` | `["outbound-dynamic-code"]` |
| aliasedGlobalOf | a member of a global receiver | `aliasedGlobalOf > (DYNAMIC_CODE.has(member) \|\| OUTBOUND_CONSTRUCTORS.has(member)) &&` | `["outbound-dynamic-code","outbound-dynamic-code"]` |
| aliasedGlobalOf | a destructure off one | `collect > globalAliases.set(el.name.text, property);` | `["outbound-dynamic-code"]` |
| unwrap | parentheses | `unwrap > ts.isParenthesizedExpression(current) \|\|` | `["outbound-send"]` |
| unwrap | non-null assertions | `unwrap > ts.isNonNullExpression(current) \|\|` | `["outbound-send"]` |
| unwrap | a COMMA SEQUENCE | `unwrap > current.operatorToken.kind === ts.SyntaxKind.CommaToken` | `["outbound-send"]` |
| operatorReceiver | any operand naming a receiver | `operatorReceiver > for (const kind of kinds) if (typeof kind === "string") return kind;` | `["outbound-send"]` |
| operatorReceiver | any unreadable operand | `operatorReceiver > if (kind === UNREADABLE_RECEIVER) return UNREADABLE_RECEIVER;` | `["outbound-unanalysable"]` |
| isProvablyNumeric | a numeric literal | `isProvablyNumeric > if (ts.isNumericLiteral(inner)) return true;` | `[]` |
| isProvablyNumeric | a collected numeric name | `isProvablyNumeric > return numeric.has(inner.text) && !poisoned.has(inner.text);` | `[]` |
| isProvablyNumeric | a member or call named in NUMERIC_MEMBERS | `isProvablyNumeric > return NUMERIC_MEMBERS.has(inner.name.text);` | `[]` |
| isAssembledKey | concatenated | `isAssembledKey > inner.operatorToken.kind === ts.SyntaxKind.PlusToken` | `["outbound-unanalysable"]` |
| isAssembledKey | interpolated | `isAssembledKey > if (ts.isTemplateExpression(inner)) return true;` | `["outbound-unanalysable"]` |
| isAssembledKey | returned by a call | `isAssembledKey > return ts.isCallExpression(inner);` | `["outbound-unanalysable"]` |
| isGlobalReceiverIn | one of the four global receivers | `isGlobalReceiverIn > return GLOBAL_RECEIVERS.has(inner.text) \|\| aliases.has(inner.text);` | `["outbound-fetch"]` |
| isGlobalReceiverIn | a collected one-hop alias of one | (same line — one line, two disjuncts) | `["outbound-fetch"]` |
| boundPropertyName | the RENAMED spelling | `boundPropertyName > const property = el.propertyName ?? el.name;` | `["outbound-unanalysable"]` |
| destructuredInitializer | object property | `destructuredInitializer > if (ts.isObjectLiteralExpression(init)) {` | `["outbound-unanalysable"]` |
| destructuredInitializer | array slot | `destructuredInitializer > if (ts.isArrayLiteralExpression(init)) {` | `["outbound-unanalysable"]` |
| silence-destructured-plain-literal-key | a declaration | `collect > if (ts.isStringLiteralLike(init)) {` | `["outbound-send"]` |

All 53 distinct anchors were verified to occur at the START of a trimmed line **before** any probe was written: `TOTAL 53 MISSING 0`.

## 3. PREDICTION-VS-MEASUREMENT DISCREPANCIES

Five, in the shape `01-27-SUMMARY.md` used. In every case the measurement won.

| # | Predicted | Measured | What it means |
|---|---|---|---|
| 1 | Task 1's vocabulary of 4 phrases would hit `assembledNames` only — **4 hits** | **5 hits**: `silence-destructured-plain-literal-key` also contains `a declaration` | Its clause says `constStrings reads only the identifier spelling of a declaration`, which IS a branch of `constStrings`. The guard was right and the prediction was a reading. A sixth branch was written and measured (`["outbound-send"]`) rather than the guard being narrowed. |
| 2 | `aliasedGlobalOf / a member of a global receiver` would report ONE violation | **TWO**: `["outbound-dynamic-code","outbound-dynamic-code"]` | `const e = globalThis.eval; e(src)` reports at both the binding site and the call site. The `expect` records what was measured, not the tidier number. |
| 3 | Task 2's vocabulary would produce a clean hit set | **THREE collisions**, all real: `assembledNames :: any literal binding` (that phrase names *keyReceiver*'s precedence, not a branch of `assembledNames`), `globalThisAliases :: one of the four global receivers` (names the receiver SET, `isGlobalReceiverIn` owns it), and the task-1 branch `names` still spelling `a compound assignment` after the clause was corrected to `` a `+=` compound assignment `` | All three fixed at the CLAUSE, never at the guard. Recorded as clause edits below. |
| 4 | The three known falsified clauses (CR-11/12/13) | **SIX** rows measured falsified — `literalsOf` shares CR-13's shape, and `receiverAliases` and `isFetchExpression` share CR-12's | `FALSIFIED_HANDOFFS` carries six entries rather than three. |
| 5 | `globalNameOf`'s clause names `member of a global receiver` as one of its own branches | **FALSE**: `globalNameOf` returns `undefined` for any non-identifier (`if (!ts.isIdentifier(inner)) return undefined;`). `globalThis.eval(src)` reports through a different path. The same is true of `outboundCtorOf`'s `on a global receiver`. | **No branch was invented for either.** Those two phrasings were deliberately left OUT of `BRANCH_VOCABULARY`, so they are unmatched and therefore unbound — a live demonstration of limit (b), disclosed here rather than papered over. Widening or correcting those two clauses is not this plan's to do; it is recorded so round 7 does not rediscover it as a surprise. |

## 4. Clause edits (beyond the six FALSIFIED corrections)

| Row | Before | After | Reason |
|---|---|---|---|
| assembledNames | `…takes precedence over **any literal binding** of the same name` | `…takes precedence over **a literal binding** of the same name` | `any literal binding` is `keyReceiver`'s branch phrase. Two clauses naming one branch in one spelling is what makes a vocabulary silently stop matching. |
| globalThisAliases | `bound to **one of the four global receivers**` | `bound to **one of the four GLOBAL_RECEIVERS**` | Names the set constant, not `isGlobalReceiverIn`'s branch phrase. |
| receiverAliases, fetchAliases, navigatorAliases, globalAliases, globalThisAliases | (no binding shapes named) | `…at a declaration or an assignment…` / `…at a declaration, an assignment or the object binding-pattern spelling…` | These collectors HAVE those branches; their clauses did not name them, so nothing bound them. Naming them is what makes the probes enforceable. |

## 5. `BRANCH_VOCABULARY` — 47 phrases, each spelled as a clause spells it

Non-vacuity asserted **before** the rule; the hit count pinned by equality:

```ts
expect(BRANCH_VOCABULARY.length, "…").toBeGreaterThan(0);
expect(unused, "…phrase(s) … occur in NO clause…").toEqual([]);
expect(hits.length, "…A SHRINKING enumeration is the failure this pin exists to catch.").toBe(59);
```

**Counts this run found:** `BRANCH_VOCABULARY` **47** phrases · **59** clause-phrase hits · **60** branch probes · **32** rows carrying at least one.

Coverage-guard failure message, pasted:

> clause(s) name a branch that NO branch probe answers: … There are exactly two ways out and softening the clause silently is neither. EITHER write the BranchProbe — read it off the branch, run it, record what it measured — OR stop the clause naming the branch, which means correcting it to its MEASURED reach, preserving the falsified phrase with a dated marker and its finding id, and handing the widening on as a FALSIFIED_HANDOFFS entry.

Branch-anchor assertion comment, naming all **three** self-satisfying surfaces:

> The anchor text occurs (1) inside the BranchProbe literal itself, (2) inside the generated block's `read off:` line where a row's `site` shares the same convention, and now (3) inside the generated block's `branch:` line that renders this very anchor. So `gateText.includes(anchor)` would pass with the branch DELETED — the provenance would be checking itself, three times over.

## 6. The six corrected clauses, AFTER (pasted from the shipped block)

```
* constStrings - a receiver or global KEY resolves when a string literal bound at a string-literal
  declaration or a string-literal assignment names an outbound receiver; … FALSIFIED 2026-08-24
  (CR-13), the phrase this clause used to carry: "ANY string literal the name is bound to anywhere in
  the file" - measured, a conditional, ?? or || initializer binds a literal neither this collector nor
  literalsOf reads

* assembledNames - … at a declaration, an assignment, a `+=` compound assignment, or either
  binding-pattern spelling … FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry:
  "a compound assignment" - measured, the logical-assignment spellings ||=, &&= and ??= grow nothing

* receiverAliases - a name bound to an outbound RECEIVER expression at a declaration or an assignment
  … FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "a name bound to an outbound
  RECEIVER expression" without qualification - measured, a logical-assignment binding grows nothing

* literalsOf - … the collected set of literals constStrings recorded for a name … FALSIFIED
  2026-08-24 (CR-13), the phrase this clause used to carry: "every literal a name carries" -
  measured, a literal reached only through a conditional, ?? or || initializer is in no collected set

* isFetchExpression - the global fetch in three spellings … FALSIFIED 2026-08-24 (CR-12), the phrase
  this clause used to carry: "in every reachable spelling" - measured, an operator wrapping the bare
  global, (ok && fetch)(url), reaches no branch here

* silence-operator-around-global-receiver - … silent in the four RECEIVER_OPERATORS spellings …
  FALSIFIED 2026-08-24 (CR-11), the phrase this clause used to carry: "silent in every spelling" -
  measured, the comma-sequence, parenthesis, as-assertion and non-null-assertion spellings all report,
  because unwrap strips them before the resolver is ever reached
```

## 7. `FALSIFIED_HANDOFFS` — the handoff as DATA, with an executed probe

Every `openAnswer` MEASURED in this session, never predicted:

```
HANDOFF|constStrings                            |CR-13|wave 30|"const r = ok ? \"requests\" : \"x\";\nsdk[r].send(req);"|open=[]
HANDOFF|literalsOf                              |CR-13|wave 30|"const r = ok ? \"requests\" : \"x\";\nsdk[r].send(req);"|open=[]
HANDOFF|assembledNames                          |CR-12|wave 31|"let k;\nk ||= \"req\" + \"uests\";\nsdk[k].send(req);"|open=[]
HANDOFF|receiverAliases                         |CR-12|wave 31|"let r;\nr ||= sdk.requests;\nr.send(req);"|open=[]
HANDOFF|isFetchExpression                       |CR-12|wave 31|"(ok && fetch)(url);"|open=[]
HANDOFF|silence-operator-around-global-receiver |CR-11|wave 32|"(ok && globalThis).fetch(url);"|open=[]
```

`✓ handoff … — the falsified phrase is STILL false, measured against the code as it stands` — 6 cases, all pass.

**The count is pinned by equality at 6 and carries NO non-vacuity assertion.** Docblock, pasted:

> NO NON-VACUITY ASSERTION HERE, AND THAT IS DELIBERATE. Every other enumeration in this file asserts non-empty before its rule … This one is the exception: it is pinned by EQUALITY and its correct final value is ZERO. Asserting `toBeGreaterThan(0)` would mean wave 32, on discharging the last handoff, had to DELETE an assertion installed here — and an assertion a later wave is required to delete is worse than none.

**What the handoff probe does NOT prove**, pasted:

> It is an EXAMPLE, like every other probe in this file, so it establishes the phrase is still false OF THAT PROBE rather than of the phrase's whole domain. And it covers only the phrases WAVE 29 MARKED: a clause understated in a way nobody marked is bound to nothing here.

**No owning wave is recorded as prose inside a clause** — verified by execution:
```
CLAUSES NAMING AN OWNING WAVE IN PROSE: []
grep -cE 'wave 3[012]' <registry region>  =>  0
```

## 8. `UNBOUNDED_QUANTIFIERS` and `QUANTIFIED_CLAUSES`

```ts
export const UNBOUNDED_QUANTIFIERS = Object.freeze([
  "anywhere in the file", "everywhere in the file", "any depth", "every literal",
  "ANY of them", "every spelling", "every reachable spelling", "ANY string literal",
  "ANY-BINDING-WINS",
]);
```

Scan output — **all three of this round's false universals are hits** (11 pairs, pinned):

```
constStrings :: anywhere in the file | constStrings :: ANY string literal | constStrings :: ANY-BINDING-WINS
receiverAliases :: everywhere in the file | receiverAliases :: any depth | poisonedNumericNames :: anywhere in the file
keyReceiver :: any depth | literalsOf :: every literal | literalsOf :: ANY of them
isFetchExpression :: every reachable spelling | silence-operator-around-global-receiver :: every spelling
```

`✓ the quantifier scan catches ALL THREE universals this round falsified`

`QUANTIFIED_CLAUSES` — 7 entries, each a MEASURED statement beside the probe that measured it:

| Row | Bound (measured) |
|---|---|
| constStrings | The TWO branches that call `bindString`. `const r = ok ? "requests" : "x"; sdk[r].send(req)` → `[]` |
| poisonedNumericNames | The ARMS of the numeric pass. `function f(i) { return sdk[i].send(req); }` → `[]` |
| receiverAliases | DECLARATION ORDER inside the single collect pass. `const b = a; const a = sdk.requests; b.send(req)` → `[]` |
| keyReceiver | `operatorReceiver`'s FOUR `RECEIVER_OPERATORS`. `sdk[b ? (c ? "requests" : "x") : "y"].send(req)` → `["outbound-send"]` |
| literalsOf | Inherits `constStrings`' bound exactly; same probe → `[]` |
| isFetchExpression | The THREE spellings it branches on. `(ok && fetch)(url)` → `[]` |
| silence-operator-around-global-receiver | The FOUR `RECEIVER_OPERATORS` and NOT what `unwrap` strips first. `(0, globalThis).fetch(url)`, `(globalThis).fetch(url)`, `(globalThis as any).fetch(url)`, `globalThis!.fetch(url)` → all `["outbound-fetch"]`; only `(ok && globalThis).fetch(url)` → `[]` |

**The guard's bound is DECLARED-PHRASING OR NOTHING** — the same words `must_haves` and the threat register use. A universal spelled outside `UNBOUNDED_QUANTIFIERS` is unmatched, raises no obligation and passes. No sentence in this plan or its artifacts claims the guard catches every universal.

## 9. Preamble point 1 — corrected, not truncated

**BEFORE:**
```
1. Each entry below is verified by EXECUTION: its probe and its counter-probe
   are run through auditSource and asserted against the rule identifiers
   recorded here, so a branch removed from the walk turns its own entry red.
```

**AFTER (pasted from the shipped block):**
```
1. Each entry below is verified by EXECUTION, at TWO granularities. Its probe
   and its counter-probe are run through auditSource and asserted against the
   rule identifiers recorded here; and every branch the entry's CLAUSE NAMES
   carries its own probe, listed under it and executed the same way. So a
   NAMED branch removed from the walk turns its own entry red. A branch the
   clause does NOT name is covered by nothing here - see point 3, which this
   point used to contradict. Until 2026-08-24 this point claimed that ANY
   branch removed from the walk turned its entry red; it was FALSIFIED by
   mutation (WR-32) and is corrected rather than deleted, because the
   per-branch probes now support the narrower claim it makes.
```

**Why it no longer contradicts point 3, in one sentence:** point 3 says each entry's probes are EXAMPLES that do not cover a resolver's whole domain, and the corrected point 1 now claims red-on-removal only for a branch the clause NAMES — so the two describe the same reach from opposite sides instead of one asserting what the other denies.

## 10. The FOUR limits, pasted from the shipped block

```
5. WHAT CLAUSE-TO-BRANCH BINDING CANNOT PROVE - FOUR THINGS, STATED FLATLY.
   (a) It does NOT prove a clause NAMES every branch the code has. A branch
       the clause is silent about is bound to nothing, exactly as before.
   (b) It does NOT prove BRANCH_VOCABULARY covers every way a branch can be
       named in English. A clause phrased outside that list is unmatched, and
       therefore unbound; its pinned hit count is what makes a vocabulary
       that stopped matching visible, not a claim that it matches everything.
   (c) It does NOT prove UNBOUNDED_QUANTIFIERS covers every way a universal
       can be SPELLED. That list is the same kind of frozen, hand-maintained
       phrase list, so a clause asserting a universal in an UNDECLARED
       phrasing raises no obligation and passes. The quantifier guard reaches
       the phrasings it declares and NO FURTHER. This is disclosed here on
       the same terms as (b) rather than left for a later round to find by
       rephrasing one clause.
   (d) It does NOT prove the registry ENUMERATES every mechanism, which point
       2 above already states and which is restated here only to keep the
       four limits together.
```

Four, not three — and no fifth sentence claiming the class is closed.

**The ledger's one-sentence version**, from `.planning/REQUIREMENTS.md` beside the block:

> **THE LIMITS OF CLAUSE-TO-BRANCH BINDING, IN ONE SENTENCE, ADDED 2026-08-24 (wave 29, WR-32):** binding a clause to the branches it NAMES makes a NAMED branch's removal detectable and does NOT make an UNNAMED branch detectable, does not make either phrase list exhaustive — a branch named outside `BRANCH_VOCABULARY`, or a universal spelled outside `UNBOUNDED_QUANTIFIERS`, is unmatched and therefore unbound — and does not close the class.

## 11. FIVE MUTATION PROOFS — each executed SEPARATELY, never combined

**Run order: 1 → 2 → 3 → 4 → 5.** `git diff --exit-code` was run and returned clean between every one, and the suite was re-run green after each restore.

| # | Mutation | Test that went RED | Assertion message it carried | Restore | Re-run |
|---|---|---|---|---|---|
| **1** | **The verifier's own**: compound-assignment assembly branch deleted (`:2713-2721`) | **`branch assembledNames / a compound assignment / … PlusEqualsToken && — its probe is executed against auditSource`** plus `every branch anchor still EXISTS…` | `registry row `assembledNames`'s clause names "a compound assignment" and says the branch at `…PlusEqualsToken &&` reports [outbound-unanalysable]. It does not. Either that branch was DELETED … The row's own probe can stay green through this: that is precisely why this case exists.` | `git diff --exit-code` clean | 271/271 green |
| **2** | A SECOND named branch, different row and mechanism: `unwrap`'s COMMA SEQUENCE deleted | `branch unwrap / a COMMA SEQUENCE / … CommaToken — its probe is executed against auditSource` plus the anchor case and the ROW case | `registry row `unwrap`'s clause names "a COMMA SEQUENCE" … reports [outbound-send]. It does not.` | clean | 334/334 green |
| **3** | A branch ENTRY removed from a row whose clause names it: `isAssembledKey / interpolated` | `every BRANCH_VOCABULARY phrase present in a clause has a BRANCH answering it` | `clause(s) name a branch that NO branch probe answers: isAssembledKey names "interpolated". There are exactly two ways out and softening the clause silently is neither…` (+ the pin: `expected 59 to be 60`) | clean | 334/334 green |
| **4** | One row's `branches` list EMPTIED: `memberName` | `every RESOLVER row carries at least one branch` | `resolver row(s) memberName carry NO branches. A resolver is a mechanism with a code site … A resolver row with an empty `branches` list is a clause bound to nothing — which is exactly the state WR-32 found the whole registry in.` | clean | 334/334 green |
| **5** | An UNDECLARED universal: `anywhere in the file` added to `memberName`'s clause, which has no `QUANTIFIED_CLAUSES` entry | `every clause carrying a DECLARED quantifier phrasing names a MEASURED bound` | `clause(s) assert a universal with NO named bound: memberName asserts "anywhere in the file". There are two ways out… A universal nobody can disagree with is an unnamed blind spot wearing a quantifier, and this round exists because two of them shipped green.` (+ pin `expected 12 to be 11`) | clean | 337/337 green |

### The proof is at ROW granularity, not fixture granularity

Under mutation 1, **three** tests went red. Two of them are inside the derived block and both name the row:

- `branch **assembledNames** / a compound assignment / … — its probe is executed against auditSource`
- `every branch anchor still EXISTS…` → *"row **`assembledNames`**'s branch for "a compound assignment" …"*
- (and the distant hand-written fixture at `:4844`, the only one the verifier saw)

And the **row-level** case stayed GREEN, exactly as the verifier measured:

```
✓ registry row assembledNames — its probe AND its counter-probe are executed against auditSource
✓ the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte
✓ the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY), byte for byte
```

That is the seam closed: the binding that existed is untouched, and the one that did not exist is what caught the mutation.

## 12. No rule was widened

The walk and resolver bodies are **byte-identical** to the pre-plan tree (`b85ac63`):

```
$ diff -q <(git show b85ac63:…spec.ts | sed -n '1094,3007p') <(sed -n '1154,3067p' …spec.ts)
IDENTICAL

changed hunks in the WALK + RESOLVER region (NEW lines 1154..3145): [3068, 3128]
  3068 → the BranchProbe TYPE declaration
  3128 → the `branches` FIELD on ResolverRecord
```

No change to any branch of `collect`, `visit`, `keyReceiver`, `receiverKind`, `isGlobalReceiver`, `isFetchExpression`, `isNavigatorReceiver` or `aliasedGlobalOf`.

```
 packages/backend/src/outbound-prohibition.spec.ts | 1233 ++++++++++++++++++++-
 5 files changed, 1328 insertions(+), 46 deletions(-)
```

## 13. Both spans — sha256, line count, entry count, side by side

```
gate header   sha256=5a8d48d37708f3a1359123854e94c4da3788a030ed6b9aa89c057690c8c87a37  lines=379  entries=38  branch-lines=60
REQUIREMENTS  sha256=5a8d48d37708f3a1359123854e94c4da3788a030ed6b9aa89c057690c8c87a37  lines=379  entries=38  branch-lines=60
IDENTICAL: True
```

`ENTRY_MARK` still counts ROWS, not branches — **confirmed by RUNNING both cases**, not by reading them:

```
✓ the shipped block carries exactly ONE entry per registry row — a truncated block FAILS
✓ the ledger's block carries exactly ONE entry per registry row — a truncated ledger block FAILS
```

## 14. Append-never-rewrite, verified POSITIVELY

`.planning/REQUIREMENTS.md` — each prior correction anchor still matches exactly once:

```
THE DERIVED RESIDUAL, INSTALLED 2026-08-24 BY PLAN 01-27      => 1
WHICH HALF OF THIS ENTRY EACH RULE APPLIES TO                 => 1
WHY THIS ENTRY CARRIES THE TEXT AND NOT A POINTER             => 1
THE SURFACE DECISION, wave 27                                 => 1
THE LIMITS, IN ONE SENTENCE, BECAUSE THE LEDGER IS WHERE…     => 1
THE BOX IS DELIBERATELY STILL                                 => 2   (2 at base b85ac63 too — pre-existing, unchanged)
```

`.planning/STATE.md` — each prior P9-D3 amendment opening matches exactly once, and the prior text is a **byte-identical prefix**:

```
POINTER AMENDMENT … plan 01-18 task 3     => 1
SECOND POINTER AMENDMENT … plan 01-19     => 1
THIRD POINTER AMENDMENT … plan 01-23      => 1
FOURTH POINTER AMENDMENT … plan 01-27     => 1
FIFTH POINTER AMENDMENT … plan 01-28      => 1
SIXTH POINTER AMENDMENT … plan 01-29      => 1

PRIOR TEXT IS A BYTE-IDENTICAL PREFIX: True
appended chars: 3219
```

The sixth amendment restates no bound and restates that **the pointer-not-a-bound rule is a PROHIBITION WITH NO MECHANICAL CHECK** — the byte comparison reaches the gate header and `REQUIREMENTS.md` and no further.

## 15. `WINDOWS.md` — through the tool, raw output

```
$ gsd-tools windows status          (before)   open_count: 19  fixed_count: 14  total_count: 33
$ gsd-tools windows fixed 33        {"ok": true, …}  open_count: 18  fixed_count: 15  total_count: 33
$ gsd-tools windows append --kind deviation --phase 01 \
    --file packages/backend/src/outbound-prohibition.spec.ts --description "<pointer>"
                                    {"ok": true, "entry": {"id": 34, … "status": "open"}}
$ gsd-tools windows status          (after)    open_count: 19  fixed_count: 15  total_count: 34

entries on this gate file:  13 20 22 23 25 26 27 28 31 32 33 (all fixed) · 34 (open)
OPEN entries on this gate file: [34]        ← exactly one
```

The tool refused nothing. **Not hand-edited** — the frontmatter counters and the JSON block moved together in one diff:

```
-fixed_count: 14        +fixed_count: 15
-total_count: 33        +total_count: 34
-last_updated: 2026-08-24T14:05:59.349Z   +last_updated: 2026-08-24T19:03:12.830Z
```

## 16. CORE-11's box is exactly as wave 28 left it

```
$ grep -cE '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
1
$ git diff b85ac63 -- .planning/REQUIREMENTS.md | grep -E "^[+-].*\*\*CORE-11\*\*"
CORE-11 row: NO DIFF (exactly as wave 28 left it)
```

It reads `- [ ]`. **Wave 32 owns it.** This plan does not flip it and does not argue that it could be flipped.

## 17. Real-tree run — ZERO, with the four measured-exempt sites named individually

```
23 files under packages/backend/src and packages/engine/src — every one "reaches no outbound surface"
Tests  29 passed | 305 skipped

EXEMPT|compat.ts cur[key]        |packages/backend/src/compat.ts            |[]
EXEMPT|compat.ts ctx[root]       |packages/backend/src/compat.ts            |[]
EXEMPT|observations.ts segments[i]|packages/backend/src/store/observations.ts|[]
EXEMPT|MIGRATIONS index          |packages/backend/src/store/migrations.ts  |[]
```

No rule changed here, so the zero is a regression check.

## 18. Final gate results

```
$ pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts   →  337 passed (337)
$ pnpm test                                                                →  31 files, 1275 passed (1275)
$ pnpm typecheck                                                           →  exit 0
$ pnpm lint                                                                →  exit 0
$ pnpm knip                                                                →  exit 0
$ pnpm build:backend && pnpm check:bundle
  packages/backend/dist/index.js: 1 import specifier(s): crypto
$ git diff --exit-code b85ac63 -- 01-01..01-28 PLANs, 01-VERIFICATION.md, 01-REVIEW.md, 01-UAT.md
  CLEAN
```

Baseline entering the wave was 31 files / 1200 tests; the wave added 75 assertions and removed none.

## 19. Assumption-delta disposition

```
$ gsd-tools query assumption-delta scan 01 --json
{ "detected": true, "signals": [ { "kind": "pluralization", "term": "another",
  "snippet": "… own code and CI-checked — rather than correcting another instance of it, plus 4 further gap-closure plans …" } ] }
```

One signal, matched against `.planning/ROADMAP.md:70` — the Roadmap's own narrative sentence describing this phase's gap-closure rounds. It is a match on planning prose about the recurrence, not a scope or pluralization delta in any requirement. **Examined and DISMISSED**, with the matched line recorded so round 7 does not re-raise it as an unexamined detection.

## What this makes detectable, and what it does not

**In one sentence:** clause-to-branch binding makes a **NAMED** branch's removal detectable — proven by reproducing the verifier's own mutation and watching the ROW go red — and it does **not** make an UNNAMED branch detectable, does not make either hand-maintained phrase list exhaustive, and **does not close the class**.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `git checkout --` destroyed Task 1's uncommitted work mid-mutation-proof**
- **Found during:** Task 1 (mutation proof 1, first attempt)
- **Issue:** The plan's restore step is `git checkout --` cross-checked by `git diff --exit-code`. Run against an UNCOMMITTED task, that reverts the task itself, not just the mutation. Task 1's entire implementation was lost.
- **Fix:** Rebuilt Task 1 from the same scripted edits, then **committed the task BEFORE planting any mutation**. From that point `git checkout --` restores to the committed state and `git diff --exit-code` is a meaningful cross-check — which is the only ordering under which the plan's own restore contract holds. Every subsequent mutation (2–5) followed commit-then-mutate.
- **Files modified:** none beyond the rebuild (the rebuilt file is byte-equivalent — the regenerated span's sha256 `ca0c72e8…` matched the pre-loss run exactly, which is itself the evidence the rebuild was faithful)
- **Verification:** `git diff --exit-code` clean after each of the five restores; suite re-run green after each
- **Committed in:** `4d61c73`

**2. [Rule 1 - Bug] Three `BRANCH_VOCABULARY` collisions, all fixed at the clause**
- **Found during:** Task 2, by the coverage guard itself
- **Issue:** `assembledNames :: any literal binding` and `globalThisAliases :: one of the four global receivers` are phrases naming *other* rows' branches; the task-1 branch `names` also went stale when its clause was corrected to `` a `+=` compound assignment ``.
- **Fix:** Reworded the two clauses and re-spelled the branch `names`. **Never the guard.**
- **Verification:** coverage guard green; counts re-pinned at 59/60/32 from the measured run
- **Committed in:** `8eb82cc`

**3. [Rule 2 - Missing Critical] Six falsified clauses, not three**
- **Found during:** Task 2, by re-measuring rather than taking the review on trust
- **Issue:** The plan named three known falsified clauses. Measurement found `literalsOf` shares CR-13's shape and `receiverAliases` and `isFetchExpression` share CR-12's.
- **Fix:** All six corrected, preserved and handed on. `FALSIFIED_HANDOFFS` carries six entries and its pin says 6.
- **Committed in:** `8eb82cc`

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 bug, 1 missing critical)
**Impact on plan:** No scope creep. Deviation 1 corrected the plan's own restore ordering; 2 and 3 are the guards and the measurement discipline working as designed.

## Issues Encountered

None beyond the deviations above. Two prettier round-trips were needed after generated code insertion (`pnpm lint --fix`), neither changing behaviour or the generated span.

## Known Stubs

None.

## Threat Flags

None — this plan touches no rule, adds no widening, and introduces no network, auth, file-access or schema surface. `T-01-SC` is NOT APPLICABLE: no package was installed and no manifest was modified.

## User Setup Required

None.

## Next Phase Readiness

- **Wave 30 (CR-13)** must re-add `ANY string literal the name is bound to anywhere in the file` / `every literal a name carries` to `constStrings` and `literalsOf` **with their branch probes**, and DELETE those two `FALSIFIED_HANDOFFS` entries and update the pin to 4, in the same commit as the code. Until it does, its widening turns `handoff constStrings / CR-13 / wave 30` RED.
- **Wave 31 (CR-12)** owns `assembledNames`, `receiverAliases` and `isFetchExpression` — pin falls to 1.
- **Wave 32 (CR-11)** owns `silence-operator-around-global-receiver` — pin falls to 0 — **and owns CORE-11's checkbox**, against a discharge table whose every row is discharged.
- Recorded for round 7 rather than left to be rediscovered: `globalNameOf`'s clause names `member of a global receiver` and `outboundCtorOf`'s names `on a global receiver`, and NEITHER function has that branch (both return `undefined` for a non-identifier). Those two phrasings were deliberately left out of `BRANCH_VOCABULARY` — a live instance of limit (b), unbound and disclosed, and nobody's wave yet.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*

## Post-Plan Note — one transient suite failure, recorded rather than absorbed

The first `pnpm test` run issued immediately after `state.record-session` and
`roadmap.update-plan-progress` reported `1 failed | 1274 passed`. Three consecutive
re-runs are clean at `31 files / 1275 tests`. The cause is a read-during-write race:
`tests/pins.spec.ts` reads `.planning/STATE.md` at test time and the state handler was
still writing it. Not a defect in this plan's changes, and recorded here rather than
smoothed because a single transient failure that nobody writes down is how a real one
gets dismissed later.

## Self-Check: PASSED

All modified files exist on disk; all four commits (`4d61c73`, `8eb82cc`, `006756d`, `47e0d0d`) exist in git history; `git diff --diff-filter=D b85ac63 HEAD` reports no deleted files.
