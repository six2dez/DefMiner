// packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wired gate.
//
// THE RULE: no non-spec module the plugin SHIPS may reach an outbound network
// surface. CORE-11's statement covers them in one breath — "no caido:http fetch,
// no sdk.requests.send in any spelling, no method of an identified requests or
// net receiver outside a read-only allowlist, no global fetch by any receiver or
// alias, no XMLHttpRequest, WebSocket or EventSource, and no speculative
// retrieval of any kind". Two more surfaces joined the enumeration on 2026-08-22
// under that same "of any kind": navigator.sendBeacon, and dynamic code
// construction (eval, new Function) — a string this gate cannot read into is a
// way to reach every surface above while reporting clean.
//
// WHICH REQUIREMENT, AND WHY IT CHANGED ON 2026-08-21. This prohibition was
// tagged CORE-01 until that date. `REQUIREMENTS.md`'s CORE-01 is the
// NON-ASYNC-HANDLER requirement and says nothing about outbound traffic, so one
// id meant two different things and a reader could not tell which of them a gate
// tagged CORE-01 was enforcing. The prohibition is now CORE-11, opened in
// `REQUIREMENTS.md:46` by plan 01-10 (wave 10) before this gate declared it. The
// split reason lives there and in `.planning/STATE.md` (decision P9-D1).
// `hooks/passive.ts`'s non-async handler is still CORE-01 and stays that way.
//
// WHY THIS NEEDS A GATE AT ALL, when the phase ships no outbound call today.
// Three facts measured in Phase 0 make a regression here worse than it sounds:
//
//   SURFACES_FIRING_INTERCEPT = "proxy" — plugin-originated sends do NOT come
//     back through `onInterceptResponse`. Traffic this plugin generated would be
//     invisible to this plugin: there is no counter anywhere that would move.
//   `sdk.requests.send()` does not re-fire the hook under any save/plugins
//     combination, so there is no self-observation to fall back on either.
//   caido/caido#2211 was filed against 0.57.1 — the exact target build — and
//     cumulative sends can abort `caido-cli`, taking the operator's real project
//     data with it.
//
// So the failure is SILENT in the tool whose entire pitch to the operator is that
// it is passive. Reading the SOURCE catches every call site including the ones
// written next year, which is the argument `store/sql-discipline.spec.ts` makes
// for itself and the reason this file copies its SHAPE — a pure
// `auditSource(file, source)`, a named non-vacuity assertion, and every rule's
// failing path executed against an inline fixture — rather than its rules.
//
// ===========================================================================
// WHY AN AST WALK AND NOT A TEXT SCAN, AND IT IS LOAD-BEARING HERE
// ===========================================================================
// `packages/backend/src/telemetry.ts` NAMES `caido:http` in its header comment,
// in the paragraph explaining why the plugin's coverage is structurally partial.
// A substring scan would fail on that documentation and the only way to make it
// pass would be deleting the reasoning — which is precisely backwards. It is
// asserted below as its own case, the same way `hooks/admit.spec.ts` asserts it
// for `toRaw()`/`toText()`. A regex also misses a template that spans a line
// break, an `export ... from`, and any call whose receiver is on the previous
// line: the three shapes prettier is most likely to produce in this package.
//
// ===========================================================================
// WHAT THIS GATE IS NOT: `scripts/ci/check-bundle-imports.mjs`
// ===========================================================================
// That gate answers a DIFFERENT question — which specifiers Caido's QuickJS was
// MEASURED to resolve — and `caido:http` is on its allowlist because the Phase 0
// probe loaded it successfully. It is deliberately left alone: removing an entry
// would quietly redefine it from "measured loadable" to "permitted". The bundle
// gate bounds what can LOAD; this one bounds what the source may CALL. They
// coexist, and the asymmetry is why this one has to exist at all —
// `sdk.requests.send` needs no import, and neither does `globalThis.fetch`, so no
// bundle gate can ever see either.
//
// ===========================================================================
// THREE BOUNDARIES, STATED RATHER THAN LEFT TO BE DISCOVERED
// ===========================================================================
// 1. IT SKIPS `.spec.ts`. That is what lets this file's own fixtures — which
//    necessarily contain the forbidden shapes as source text — live inline with
//    no temp file and no stray module for `tsc --build` to trip over. It costs
//    something real: a spec file could call an outbound surface unnoticed. That
//    residual is bounded by `pnpm check:bundle`, which reports the shipped
//    bundle's entire import set (one specifier, `crypto`) and which specs never
//    enter.
// 2. WHAT THE WALK RESOLVES, AND WHAT IT REPORTS INSTEAD OF GUESSING.
//    Rewritten on 2026-08-21. This boundary used to read "an alias rebound in an
//    INNER SCOPE is outside its reach". That was true and it was the wrong
//    sentence: an independent probe of 22 shapes found FOURTEEN missed, and not
//    one of them was an inner-scope rebind. A reader who trusted the header was
//    misled in the direction that gets trusted. What the walk actually does:
//
//      - It collects in ONE document-order pass and builds NO symbol table.
//        Bindings are file-wide, not scope-aware.
//        WHICH DIRECTION THAT ERRS IN IS A FACT ABOUT EACH COLLECTOR FAMILY AND
//        NOT ABOUT THE GATE, CORRECTED 2026-08-24 (CR-10). The sentence that
//        stood here stated ONE error direction for the whole pass — call it THE
//        SINGLE-DIRECTION CLAIM; its exact superseded words are preserved in
//        `01-VERIFICATION.md`'s CR-10 entry and in `01-REVIEW.md`, and are
//        deliberately not requoted, because a file that states a direction and
//        also quotes its own false version of it gives a skimmer two sentences
//        and no way to tell which is live. It was HALF TRUE, which is why it
//        survived five rounds: true of the ALIAS families, false of the STRING
//        maps, and a reader could not tell because one sentence covered both.
//        The two families, each with the direction it errs in:
//          ALIAS FAMILIES — `receiverAliases`, `fetchAliases`, `navigatorAliases`,
//          `globalAliases`, `globalThisAliases`, `unreadableAliases`. Grown from
//          the LIVE set at the declaration branch and at the assignment branch,
//          never removed from. They OVER-approximate: a name bound to an outbound
//          receiver AT EITHER COLLECTING BRANCH is treated as one at every later
//          read, inner scopes and later rebindings included.
//          CORRECTED 2026-08-24 (CR-12, wave 31), AND WHAT WAS WRONG WITH IT.
//          This sentence read `at both the declaration and the assignment
//          branch`, and `the assignment branch` meant ONE OPERATOR: the branch
//          was gated on an inline `EqualsToken` comparison. So `let r; r ??=
//          sdk.requests; r.send(req)` grew NOTHING while `let r; r =
//          sdk.requests; r.send(req)` reported `outbound-send` — two characters
//          apart, on the ordinary lazy-init spelling of the reported line. Eleven
//          lines below that test, in the same function, the numeric-poisoning arm
//          read `ASSIGNMENT_OPERATORS` and named `x ||= sdk.requests` in its own
//          comment: the file knew the spelling existed, reacted to it in the
//          NARROWING collector, and grew nothing from it in the widening ones.
//          THE BRANCHES ARE NAMED RATHER THAN QUANTIFIED OVER, and the assignment
//          branch now reads `ASSIGNING_OPERATORS` — `=`, `??=`, `||=` and `&&=`.
//          `+=` is NOT in that set and that is not a gap: it is the ASSEMBLY
//          spelling with its own branch and its own numeric guard, and the
//          NUMERIC compound assignments (`-=`, `*=`, `>>>=` and the rest) bind a
//          number whatever their right-hand side was. MEASURED STILL OUTSIDE the
//          branch, in this same session: a parameter, a loop binding, a value
//          crossing a function boundary, a name bound in another file, a binding
//          written in INVERTED order, and a MEMBER target (`o.r ??= sdk.requests`
//          — the branch requires an IDENTIFIER on the left).
//          NOTHING MECHANICAL CHECKS THIS PARAGRAPH. The byte comparison reaches
//          the generated span and `REQUIREMENTS.md` and no further, so it was
//          corrected BY HAND in the same commit as the registry, and where the
//          two disagree the derived block is authoritative and this paragraph is
//          the defect.
//          STRING MAPS — `constStrings` and `assembledNames`. These UNDER-
//          approximated until 2026-08-24. `constStrings` held ONE literal per
//          name, written only at the declaration branch, and `keyReceiver` read
//          it FIRST — so `let k = "harmless"; k = "requests"; sdk[k].send(req)`
//          resolved `k` to "harmless" forever and was SILENT, which is exactly
//          the direction the old sentence told a reader could not happen. As of
//          CR-10 `constStrings` holds every literal a name is bound to at ANY OF
//          ITS COLLECTING BRANCHES and reports if ANY of them names a receiver,
//          so this family now errs in the SAME direction as the alias families
//          and the old sentence has become true of it — but it is stated per
//          family rather than for the gate, because the next collector added here
//          can err either way and one sentence covering both is what let this one
//          sit under a disclosure claiming it could not happen.
//          CORRECTED 2026-08-24 (CR-13, wave 30), AND WHAT WAS WRONG WITH IT.
//          This paragraph said `EVERY literal a name is bound to ANYWHERE IN THE
//          FILE`, in the hand-written half of this header, and that sentence was
//          FALSE for the same reason and on the same day the `constStrings`
//          REGISTRY ROW's universal was: `const k = b ? "requests" : "net";
//          sdk[k].send(req)` bound nothing and reported nothing, on a site whose
//          literal is written out in full. THE BRANCHES ARE NAMED RATHER THAN
//          QUANTIFIED OVER, and there are now THREE — a string-literal
//          declaration, a string-literal assignment, and an operator initializer
//          (`? :`, `??`, `||`, at either a declaration or an assignment, read by
//          `operatorLiteralBinding`). WIDENED AGAIN 2026-08-24 (CR-12, wave 31):
//          the string-literal ASSIGNMENT branch reads `ASSIGNING_OPERATORS`, so
//          `let k; k ??= "requests"; sdk[k].send(req)` binds through it and the
//          `||=` and `&&=` spellings with it — the branch COUNT is unchanged and
//          its POPULATION grew. MEASURED STILL OUTSIDE ALL THREE, in this
//          same session: a parameter, a loop binding, a value crossing a function
//          boundary, a name bound in another file, and a SECOND hop of key.
//          NOTHING MECHANICAL CHECKS THIS PARAGRAPH. The byte comparison reaches
//          the generated span and `REQUIREMENTS.md` and no further, so this
//          sentence was corrected BY HAND in the same commit as the registry, and
//          where the two ever disagree the derived block is authoritative and
//          this paragraph is the defect.
//          `literalOf`, THE SINGLE-VALUED READER, IS THE ONE DELIBERATE EXCEPTION
//          AND IT ALSO ERRS TOWARD REPORTING. Member names and module specifiers
//          need ONE string, not a set, so `literalOf` answers `undefined` for a
//          name carrying more than one binding — and `undefined` means COULD NOT
//          READ at every one of its call sites, which reports. Both families and
//          the reader now err toward reporting; they simply do it by different
//          mechanisms.
//      - Receivers resolve through a declaration (`const r = sdk.requests`), an
//        object destructure (`const { requests, net } = sdk`), an assignment
//        (`r = sdk.requests`), a conditional initializer, and a computed key
//        whose value is a `const` string, a `let`/`var` string, a name REBOUND
//        to one at any of the three collecting branches (`const r = "requests"`,
//        `let k = "harmless"; k = "requests"`), or a name bound through an
//        OPERATOR INITIALIZER at a declaration or an assignment
//        (`const k = b ? "requests" : "net"`, `let k; k = b ?? "requests"`).
//        THE LAST CLAUSE WAS ADDED 2026-08-24 (CR-13, wave 30) and the phrase
//        `anywhere in the file` was REMOVED from the one before it, for the same
//        reason and in the same commit: this list is hand-written, nothing
//        mechanical checks it, and it had been claiming a reach the walk did not
//        have. What it does NOT reach is stated in the residual below, from
//        measurement rather than from intent.
//      - Member names and module specifiers resolve through that same string map
//        via `literalOf`, which reads it single-valued: one binding resolves, two
//        or more report as unreadable.
//      - Once a receiver is positively identified, ANY member of it outside an
//        explicit read-only allowlist fails — referenced, called, aliased,
//        returned, or handed to `.call`/`.apply`/`Reflect.apply`.
//      - Anything it CANNOT read on an identified receiver, and any module
//        specifier it cannot reduce to a literal, is REPORTED as
//        `outbound-unanalysable`. "Could not read" does not mean "clean"; that
//        equivalence is the specific defect this rewrite removes.
//      - EXTENDED 2026-08-22 (WR-19), because the sentence above was true of
//        computed MEMBERS and false of computed RECEIVERS, which is the same
//        equivalence standing one level up. `sdk["req" + "uests"].send(req)` and
//        `globalThis["fet" + "ch"](u)` both returned an EMPTY list while
//        `import("caido:" + "http")` correctly reported. Now:
//          - an element access whose key the walk can see being ASSEMBLED —
//            concatenated, interpolated, or returned by a call — is an
//            UNREADABLE RECEIVER, a third state distinct from "not a receiver",
//            and it is reported wherever that value is used as one, including
//            through a one-hop binding and through a destructure;
//          - a member of a POSITIVELY IDENTIFIED global receiver whose name will
//            not reduce is reported, which is the `globalThis["fet"+"ch"]` half.
//      - CORRECTED AND WIDENED 2026-08-24 (CR-08), AND THE CORRECTION MATTERS AS
//        MUCH AS THE WIDENING. The clause immediately above — "reported wherever
//        that value is used as one, including through a one-hop binding" — was
//        FALSE WHEN IT WAS WRITTEN. It described the assembled RECEIVER
//        EXPRESSION (`const r = sdk["re"+"quests"]; r.send(req)`), which was
//        indeed caught, and a reader took it for the assembled KEY
//        (`const k = "req"+"uests"; sdk[k].send(req)`), which was not: one `const`
//        disproved it, while the MEMBER-level twin (`const m = "se"+"nd";
//        sdk.requests[m](req)`) and the GLOBAL-level twin (`const k = "fet"+"ch";
//        globalThis[k](url)`) both reported. That is the WR-19 asymmetry standing
//        one level up, inside the paragraph WR-19 rewrote. The paragraph also
//        described ONLY inline assembly and said nothing whatever about a
//        conditional key or a comma sequence, both of which the walk could read
//        completely and reported nothing on. What the walk resolves in
//        RECEIVER-KEY position, as the code now behaves and as the table below
//        enumerates mechanism by mechanism:
//          - a key bound ONE HOP to an assembly, in EVERY spelling — `+`, a
//            template, `.join("")`, an opaque call — and through a declaration,
//            an assignment, or a COMPOUND ASSIGNMENT (`assembledNames`).
//            CORRECTED AND WIDENED 2026-08-24 (CR-10), READ OFF THE BRANCHES
//            RATHER THAN OFF THIS PARAGRAPH. The clause here said "either a
//            declaration or an assignment" and the collector's own comment said
//            the assignment spelling was covered by construction. BOTH WERE
//            FALSE IN THE SAME WAY: the assignment branch's `assembledNames`
//            write did exist, but `keyReceiver` consulted the stale declaration
//            literal FIRST and returned before reaching it — so the assignment
//            spelling was defeated by ANY preceding string initializer. It is
//            reachable now because that lookup no longer early-returns and
//            because a WATCHED ASSEMBLY takes precedence over a literal binding
//            of the same name.
//            AND `+=` WAS NEVER READ AT ALL, in a paragraph claiming every
//            spelling. `let k = "req"; k += "uests"` builds a receiver name out
//            of pieces and was silent. The branch now marks it, guarded by the
//            same numeric test the numeric poisoning arm beside it uses, so
//            `i += 1` stays an index. The sibling gate one directory away closed
//            exactly this gap for exactly this reason at WR-17.
//          - a CONDITIONAL key, resolved on BOTH branches with
//            `initializerReceiver`'s semantics, so `sdk[b ? "requests" : "net"]`
//            reports `outbound-send` and NOT `outbound-unanalysable` — it hides
//            nothing, and calling a completely readable site unreadable would be
//            the same overclaim running the other way;
//          - a COMMA SEQUENCE, resolved to its rightmost operand in `unwrap`, so
//            `sdk[(0, "requests")]` and `(0, sdk.requests).send(req)` both report.
//        ONE HOP REMAINS THE LIMIT IN EVERY DIRECTION. Two hops is residual (a).
//      - `navigator.sendBeacon` is covered, RECEIVER-ANCHORED (the bare receiver,
//        any of the four global receivers, or a one-hop alias) so that an
//        ordinary object defining a method of that name stays quiet; and `eval`
//        and `new Function` are refused outright, bare or on a global receiver,
//        because no AST gate can see inside a string. Both surfaces were added
//        2026-08-22 after the verifier probed them; both were previously quiet
//        AND absent from this list, which is the failure mode this enumeration
//        exists to prevent.
//
//    WHICH MECHANISM READS WHICH SPELLING — THE TABLE, added 2026-08-24 (CR-08),
//    and it is the part of this fix meant to stop the defect RECURRING rather
//    than to fix this instance of it. CR-08's finding was not only that shapes
//    were missed; it was that a fixture resolving through `constStrings` sat
//    under the assembled-key rule as that rule's bound, green whether or not the
//    rule worked. A reader with this table cannot make that substitution again,
//    because every fixture below names its mechanism in its own title and every
//    mechanism here names the shapes it — and only it — resolves.
//
//    THE TABLE'S FATE, DECIDED 2026-08-24 (wave 27) RATHER THAN LEFT AS TWO
//    HAND-MAINTAINED LISTS OF ONE FACT. It STAYS HAND-WRITTEN, and the derived
//    block above it is AUTHORITATIVE. The reason is that the two are indexed on
//    different things and neither index can be rendered from the other: this
//    table is organised by SPELLING — what a reader arrives holding — while
//    `RESOLVER_REGISTRY` is organised by MECHANISM, which is what the code has.
//    Rendering this table from the registry would cost the spelling index, which
//    is the only reason the table exists; rendering the registry from this table
//    would make the executed probes secondary to a paragraph, which is the defect
//    wave 27 removes. WHERE THEY DISAGREE, THE DERIVED BLOCK WINS AND A ROW HERE
//    IS THE DEFECT — the derived block's entries are executed against
//    `auditSource`; these rows are not. A future wave that wants one list should
//    widen the registry to carry spellings and render this table from it; that is
//    a separate decision needing its own measurement, and this wave changes no
//    rule.
//
//      SPELLING (const, receiver-key position)  RESOLVED BY          REPORTS
//      -------------------------------------    -----------------    ---------------------
//      sdk["requests"]                          literalOf            outbound-send
//      const r = "requests"; sdk[r]             constStrings         outbound-send
//      sdk["req" + "uests"]                     isAssembledKey       outbound-unanalysable
//      const k = "req"+"uests"; sdk[k]          assembledNames       outbound-unanalysable
//        (and the let/assignment, template, .join("") and opaque-call spellings
//         of that same one-hop binding — all `assembledNames`)
//
//      ROWS ADDED 2026-08-24 (CR-10). The table enumerated the `const`
//      spellings and said NOTHING about `let`, nothing about a rebinding and
//      nothing about a compound assignment — so a reader had no row to check the
//      shapes below against, which is precisely the substitution this table
//      exists to prevent, running one spelling out. One row per spelling this
//      round closed, plus the mirror:
//
//      SPELLING (rebind, receiver-key position) RESOLVED BY          REPORTS
//      -------------------------------------    -----------------    ---------------------
//      let k = "requests"; sdk[k]               constStrings         outbound-send
//      let k = "harmless";                      constStrings,        outbound-send
//        k = "requests"; sdk[k]                   ANY-BINDING-WINS
//      var k = "harmless";                      constStrings,        outbound-send
//        k = "requests"; sdk[k]                   ANY-BINDING-WINS
//      let k; k = "requests"; sdk[k]            constStrings'        outbound-send
//                                                 ASSIGNMENT WRITE
//      let k = "requests";                      constStrings,        outbound-send
//        k = "harmless"; sdk[k]                   ANY-BINDING-WINS   — THE MIRROR, and it
//                                                                      errs by OVER-approximating
//      let k = "harmless";                      assembledNames'      outbound-unanalysable
//        k = "req"+"uests"; sdk[k]                ASSIGNMENT branch,
//                                                 reachable at last
//      let k = "req"; k += "uests"; sdk[k]      assembledNames'      outbound-unanalysable
//                                                 COMPOUND-ASSIGNMENT
//                                                 branch
//      let k = "requests"; k = a + b; sdk[k]    assembledNames       outbound-unanalysable
//                                                 OVER constStrings  — THE PRECEDENCE
//      let i = 0; i += 1; sdk[i]                isProvablyNumeric    [] — an index, not a name
//      let k = "harmless"; k = "fetch";         constStrings via     outbound-unanalysable
//        globalThis[k](url)                       literalOf, which     (two bindings — the walk
//                                                 is SINGLE-VALUED     will not pick one)
//      let k; k = "fetch"; globalThis[k](url)   constStrings via     outbound-fetch
//                                                 literalOf            (one binding — resolves)
//      let m = "harmless"; m = "send";          literalOf returns    outbound-unanalysable
//        sdk.requests[m](req)                     undefined
//      let s = "harmless"; s = "caido:http";    literalOf returns    outbound-unanalysable
//        await import(s)                          undefined
//      sdk[b ? "requests" : "net"]              operatorReceiver     outbound-send
//                                               via keyReceiver      — ROW CORRECTED
//                                                                      2026-08-24 (WR-27):
//                                                                      the mechanism MOVED.
//                                                                      It named a hand-written
//                                                                      block in receiverKind's
//                                                                      element-access arm; that
//                                                                      block is gone and the arm
//                                                                      calls keyReceiver, which
//                                                                      descends through the ONE
//                                                                      shared operator resolver.
//                                                                      Behaviour unchanged.
//      const k = b ? "requests" : "net";        operatorLiteral-     outbound-send
//        sdk[k]                                   Binding, then        — ROW ADDED 2026-08-24
//      let k; k = b ?? "requests"; sdk[k]         constStrings           (CR-13). The spelling a
//        (and the `||` and `&&` spellings,        via keyReceiver's      reader arrives holding,
//         and the assignment spelling of          literal lookup         and the table had NO row
//         each, all one binding shape)                                   for a key bound to an
//                                                                        OPERATOR. The INLINE
//                                                                        twin one row down was
//                                                                        the only operator-key
//                                                                        row and it resolves by
//                                                                        a DIFFERENT mechanism,
//                                                                        which is exactly the
//                                                                        substitution this table
//                                                                        exists to prevent.
//      ROW ADDED 2026-08-24 (CR-12). The table enumerated `const`, `let`, a
//      rebinding and `+=`, and said NOTHING about a LOGICAL assignment — which is
//      the spelling a reader arrives holding when they write lazy init. One row,
//      covering the receiver, the global and the key in the table's existing
//      three-column shape:
//
//      SPELLING (??=, receiver-key position)    RESOLVED BY          REPORTS
//      -------------------------------------    -----------------    ---------------------
//      let r; r ??= sdk.requests; r.send(req)   receiverAliases via  outbound-send
//        (and the `||=` and `&&=` spellings)      ASSIGNING_OPERATORS
//      let g; g ??= globalThis; g.fetch(url)    globalThisAliases    outbound-fetch
//        (likewise `f ??= fetch`, `e ??= eval`,   via the same set    (fetch / dynamic-code /
//         `n ??= navigator`)                                           beacon respectively)
//      let k; k ??= "requests"; sdk[k]          constStrings'        outbound-send
//                                                 ASSIGNMENT WRITE,
//                                                 now operator-wide
//      let k; k ??= "req"+"uests"; sdk[k]       assembledNames'      outbound-unanalysable
//                                                 ASSIGNMENT branch
//      let i = 0; i ||= 1; sdk[i]               isProvablyNumeric    [] — an index, not a name
//
//      const k = b ? "req" + "uests" : "net";   operatorLiteral-     outbound-unanalysable
//        sdk[k]                                   Binding's assembly   — an operand the walk
//                                                 arm, then            WATCHES BEING ASSEMBLED
//                                                 assembledNames        makes the NAME an
//                                                                       assembly. NOTE the
//                                                                       INLINE twin of this
//                                                                       exact source reports
//                                                                       outbound-NET instead,
//                                                                       because operatorReceiver
//                                                                       prefers a NAMED operand
//                                                                       over an unreadable one
//                                                                       while keyReceiver gives
//                                                                       a WATCHED ASSEMBLY
//                                                                       precedence over a
//                                                                       literal binding. Both
//                                                                       REPORT; they name
//                                                                       different rules, and
//                                                                       that is MEASURED, not
//                                                                       predicted.
//      const k = b ? someName : otherName;      NOTHING              [] — and the INLINE twin
//        sdk[k]                                                          is silent too. The
//                                                                        descent marks a name
//                                                                        an assembly ONLY for an
//                                                                        operand the walk
//                                                                        WATCHES being built,
//                                                                        never for one it merely
//                                                                        cannot follow.
//      sdk[(0, "requests")]                     unwrap's CommaToken  outbound-send
//                                               arm, then literalOf
//      const a="requests"; const b=a; sdk[b]    NOTHING              [] — residual (a)
//      ctx[root] where root is a PARAMETER      NOTHING              [] — residual (b)
//      cur[key] where key is a LOOP BINDING     NOTHING              [] — residual (b)
//      x[i + 1] / MIGRATIONS[len - 1]           isProvablyNumeric    [] — an index, not a name
//
//      ROWS ADDED 2026-08-24 (WR-27), ONE PER POSITION AN OPERATOR CAN OCCUPY.
//      The table had exactly ONE operator row — the conditional KEY — and a
//      reader checking this gate's treatment of an operator would have found it,
//      matched their shape against it and stopped. Two of the four positions
//      below were silent. The point of the four rows is that a reader can now
//      see that all four go through ONE descent, so the next operator question
//      is answered in one place or in none:
//
//      SPELLING (operator, by POSITION)         RESOLVED BY          REPORTS
//      -------------------------------------    -----------------    ---------------------
//      (b ? sdk.requests : sdk.net).send(req)   operatorReceiver     outbound-send
//        CALL-RECEIVER position                   via receiverKind     — WR-27, and it was
//                                                                       `[]` before wave 25
//      (sdk.requests ?? sdk.net).send(req)      operatorReceiver     outbound-send
//      (sdk.requests || sdk.net).send(req)        via receiverKind,    — the same class as the
//      (ok && sdk.requests).send(req)             RECEIVER_OPERATORS    conditional; `&&` is in
//        CALL-RECEIVER position                                         the set BY MEASUREMENT
//      sdk[b ? "requests" : "net"]              operatorReceiver     outbound-send
//        KEY position                             via keyReceiver
//      const r = b ? sdk.requests : sdk.net;    operatorReceiver     outbound-send
//        r.send(req)                              via receiverKind,    — initializerReceiver is
//        INITIALIZER position                      which initializer-    now a NAME for
//                                                  Receiver now IS      receiverKind
//      sdk[b ? (c ? "requests" : "x") : "y"]    operatorReceiver     outbound-send
//        NESTED KEY position                      via keyReceiver      — keyReceiver passes
//                                                 recursing on itself   ITSELF as the resolver,
//                                                                       so nesting resolves at
//                                                                       any depth
//      (b ? cache : client).send(req)           operatorReceiver     [] — the third state:
//      (cache ?? client).send(req)                returns undefined    NOT A RECEIVER, and the
//      (ready && cache).send(req)                                      twin of every row above
//      (ok && globalThis).fetch(url)            NOTHING              [] — the descent is NOT
//      (b ? navigator : x).sendBeacon(u, d)                            reached from
//      (b ? eval : x)(src)                                             isGlobalReceiver /
//        an operator around a GLOBAL receiver                          isFetchExpression /
//                                                                      isNavigatorReceiver.
//                                                                      OPEN and UNOWNED,
//                                                                      MEASURED IDENTICAL
//                                                                      before and after wave 25
//
//    Everything in the NOTHING rows is a measured silence, not a bound: reverting
//    any branch in this file leaves those rows green. They are asserted below as
//    silences and labelled as such, so none of them can ever again be cited as
//    evidence that some rule holds.
//
//    THE RESIDUAL, precisely. THREE parts, RESTATED 2026-08-24 (CR-08) against
//    what the code does rather than against what it was intended to do. This is
//    THE ONE BOUND, and the same statement appears in `REQUIREMENTS.md`'s CORE-11
//    correction, in `.planning/STATE.md`'s P9-D3 amendment, and in the
//    `WINDOWS.md` entry appended by plan 01-18. If a reader finds those four
//    disagreeing, the code wins and the prose is the defect — that disagreement
//    IS what CR-08 was:
//      (a) MORE THAN ONE HOP of indirection, or a value crossing a FUNCTION
//          BOUNDARY, is beyond the walk. `const a = "requests"; const b = a;
//          sdk[b].send(req)` reports nothing, and that is asserted below as a
//          MEASURED SILENCE rather than left to be discovered.
//          RESTATED, because the old wording bounded the walk at "more than one
//          hop" and thereby affirmatively implied one hop was inside — which was
//          FALSE for an assembled key until 2026-08-24 and is TRUE now. One hop
//          is inside for a literal binding, for an assembled binding in every
//          spelling, for a conditional and for a comma sequence. Two hops is out.
//          SPLIT IN TWO 2026-08-24 (plan 01-19), BECAUSE "ONE HOP" WAS RIGHT
//          ABOUT KEYS AND UNDERSTATED THE WALK FOR ALIASES, AND A SINGLE
//          SENTENCE CANNOT BE BOTH. Measured, not reasoned:
//            KEYS stop at exactly one hop. `constStrings` and `assembledNames`
//            read the INITIALIZER's shape, never the live set, so they do not
//            chain: `const a = "requests"; const b = a; sdk[b].send(req)` and
//            the assembled twin are both silent. That is what (a) has always
//            said and it is correct.
//            ALIASES DO NOT. Every alias set here — `receiverAliases`,
//            `fetchAliases`, `navigatorAliases`, `globalAliases`,
//            `globalThisAliases` — is grown by consulting the LIVE set, so a
//            chain resolves to ARBITRARY DEPTH: `const a = globalThis; const b
//            = a; const g = b; g.fetch(u)` REPORTS, and so does
//            `const r = sdk.requests; const r2 = r; r2.send(req)`. This was
//            true of the first two sets from the day they were written and no
//            residual list had ever said so — the same defect this file keeps
//            finding, running for once in the direction of the gate reaching
//            FURTHER than its own disclosure.
//            CORRECTED 2026-08-24 (CR-09), AND THE CORRECTION IS THE SAME
//            DEFECT ONE LEVEL DEEPER. The sentence that stood here bounded the
//            walk by WHERE A NAME IS READ — call it THE READ-POSITION BOUND;
//            its exact superseded words are preserved in
//            `01-VERIFICATION.md`'s CR-09 entry and are deliberately NOT
//            requoted here, because a file that states a bound and also quotes
//            its own false version of it gives a skimmer two sentences and no
//            way to tell which is live. It was FALSE, and the mechanism says so
//            in two lines of code: `auditSource` runs `collect(sf)` to
//            COMPLETION and only THEN runs `visit(sf)`. Every alias set, every
//            string map and every poisoned name is fully populated before the
//            first violation is considered, so the position of a USE bounds
//            NOTHING AT ALL — it may sit above every declaration in the file.
//            WHAT ACTUALLY BOUNDS AN ALIAS CHAIN, measured: the DECLARATION
//            ORDER OF THE BINDINGS RELATIVE TO EACH OTHER. Because each set is
//            grown by consulting the LIVE set during that one document-order
//            collect pass, a chain resolves to ANY DEPTH provided each link's
//            DECLARATION appears after the declaration of the name it is grown
//            from. `const a = fetch; const b = a; const c = b; const d = c;`
//            reports at four hops with `d(u)` written ABOVE all four. Invert
//            one link — `const b = a; const a = fetch;` — and it is silent
//            whether `b(u)` is read first or last, because `a` is not yet in
//            the set when `b`'s declaration is read. Asserted below as a
//            three-case discrimination that varies the bindings and the read
//            SEPARATELY, which is the pair the single case here before could
//            not distinguish.
//      (b) A KEY THE WALK NEVER SAW BOUND — a parameter, a `for…of` or `for(;;)`
//          loop binding, or a name bound in another file — is NOT reported. The
//          third of those three got its own executed row on 2026-08-24 (CR-13);
//          see (b4).
//          NARROWED BY DELETION 2026-08-24 (CR-09): this list used to carry a
//          third item between the loop binding and the other file, exempting a
//          name by WHERE IN THE FILE its binding sits. That item was THE
//          READ-POSITION BOUND wearing an exemption's clothes and it was false
//          for the reason (a) now states — the collect pass finishes first, so
//          a binding anywhere in the file is seen. It is deleted, not softened.
//          The two items that remain are unchanged. That bound was set by MEASUREMENT and
//          the measurement is kept here because it is the evidence: reporting
//          every key that would not reduce fired twice on the real tree, on
//          `compat.ts`'s documented `at()` dotted-path walk (`cur[key]`, `key` a
//          `for…of` binding) and on `compat.ts:141`'s `ctx[root]` (`root` a
//          parameter); `store/observations.ts`'s `segments[i]` and
//          `MIGRATIONS[MIGRATIONS.length - 1]` are held quiet by
//          `isProvablyNumeric` instead. A gate that calls those four an outbound
//          network surface gets deleted rather than fixed. All four are asserted
//          quiet below, BY NAME.
//          RESTATED, because the old wording said "a merely DYNAMIC key — a bare
//          identifier or a parameter" and that JUSTIFICATION was doing double
//          duty: the measurement exempted a key the walk never watched being
//          bound, and it was being read as ALSO exempting one it had watched
//          being assembled. It does not. The walk reports what it can see being
//          HIDDEN and discloses what it merely cannot FOLLOW, and a name it
//          watched being assembled is the first, not the second.
//          RE-MEASURED 2026-08-24 after the CR-08 widening landed: the full gate
//          over both `SOURCE_ROOTS`, 23 files, ZERO violations. The exemption is
//          preserved by measurement, not by argument.
//      (b2) A DESTRUCTURED PLAIN LITERAL used as a key — `const { k } = { k:
//          "requests" }; sdk[k].send(req)` — is NOT reported. NAMED 2026-08-24
//          (this wave), by measurement rather than by review: closing IN-26 gave
//          `assembledNames` the two binding-pattern spellings, and measuring the
//          result surfaced that `constStrings` reads only the identifier
//          spelling of the same declaration. IN-26 named the ASSEMBLY spellings
//          and those are closed; this one is DISCLOSED rather than folded in,
//          because widening `constStrings` through binding patterns is a
//          separate decision that needs its own real-tree measurement. Asserted
//          below as a MEASURED SILENCE, so it goes red the day it is closed.
//      (b3) A DESTRUCTURED OPERATOR LITERAL used as a key — `const { k } = { k:
//          b ? "requests" : "net" }; sdk[k].send(req)` — is NOT reported. NAMED
//          2026-08-24 (CR-13), BY MEASUREMENT WHILE WIDENING AND NOT BY REVIEW:
//          the operator-literal descent was wired into `collect`'s two IDENTIFIER
//          branches — the declaration and the assignment — and the two
//          binding-pattern branches read `destructuredInitializer` through
//          `isAssembledKey` alone. It is (b2)'s shape one operator over, it was
//          RUN and found silent, and it is DISCLOSED rather than folded in for
//          exactly (b2)'s reason: widening `constStrings` through binding
//          patterns is a separate decision needing its own real-tree measurement.
//          Asserted below as a MEASURED SILENCE, so it goes red the day it is
//          closed.
//      (b4) A KEY BOUND IN ANOTHER FILE is NOT reported, and until 2026-08-24
//          (CR-13) it had no assertion of its own — it was named in (b)'s prose
//          and executed nowhere. `auditSource` takes ONE file's text; there is no
//          program, no module graph and no symbol table. Nothing about this
//          changed in this plan; what changed is that the sentence is now a row
//          with an executed probe and counter-probe, because a bound nobody has
//          ever run is the artifact this whole round replaces.
//      (b5) NOT SILENT, AND RECORDED HERE BECAUSE THIS PLAN PREDICTED OTHERWISE.
//          A key bound to a FUNCTION RETURN — `function g() { return "requests";
//          } const k = g(); sdk[k].send(req)` — REPORTS `outbound-unanalysable`,
//          through `isAssembledKey`'s `returned by a call` branch. Plan 01-30
//          listed it among the shapes still outside the walk; MEASURED, it is
//          not, and the measurement wins. The RECEIVER half of the same boundary
//          IS silent and is (a)'s function-boundary clause, asserted by
//          `silence-function-boundary`; the KEY half is not the same fact and had
//          been folded into it.
//      (b6) A LOGICAL-ASSIGNMENT BINDING WHOSE TARGET IS A MEMBER — `o.r ??=
//          sdk.requests; o.r.send(req)` — is NOT reported. NAMED 2026-08-24
//          (CR-12), BY MEASUREMENT WHILE WIDENING AND NOT BY REVIEW: the widened
//          branch reads `ASSIGNING_OPERATORS` for the OPERATOR and still requires
//          `ts.isIdentifier(node.left)` for the TARGET, so a member target binds
//          nothing. THE PLAIN-ASSIGNMENT SPELLING `o.r = sdk.requests` WAS ALSO
//          SILENT BEFORE THIS PLAN and had no row either — this is not a cost of
//          the widening, it is a shape the widening made visible. DISCLOSED
//          rather than folded in, on (b2)'s and (b3)'s precedent: growing an
//          alias keyed on a member path is a different collector, not a wider
//          operator set, and it needs its own real-tree measurement. Asserted
//          below as a MEASURED SILENCE, so it goes red the day it is closed.
//      (c) `navigator` RETURNED BY A HELPER is outside the beacon rule, for the
//          same reason as (a)'s function-boundary half.
//          CORRECTED 2026-08-24 (WR-30). This item used to also exempt
//          `navigator` reached through MORE THAN ONE HOP, and pointed at (a) for
//          the reason — but (a) was split in two on 2026-08-24 and its ALIAS half
//          says the opposite: `navigatorAliases` is grown from the live set and
//          chains to any depth. Executed: `const a = navigator; const b = a;
//          b.sendBeacon(u, d)` reports `outbound-beacon`, and so does the
//          three-hop spelling. The hop clause is DELETED, not softened, and the
//          depth question is answered in (a) and nowhere else. Asserted below in
//          the five-set transitivity case.
//    NOT RESIDUAL, AND THE DISTINCTION IS DELIBERATE: a provably numeric key is
//    an INDEX rather than a hidden name, and is EXCLUDED by `isProvablyNumeric`
//    before any of the above runs. That is a different kind of quiet.
//    That is the honest bound, and `pnpm check:bundle` plus the mutation runs
//    recorded in `01-12-SUMMARY.md`, `01-16-SUMMARY.md`, `01-18-SUMMARY.md` and
//    `01-19-SUMMARY.md` are what stand behind it.
//
//    ================= THE FINAL RESIDUAL, AFTER PLAN 01-25 =================
//    RE-DERIVED from the branches above and RENDERED PROGRAMMATICALLY into
//    `.planning/WINDOWS.md` from one canonical source, so "the same words
//    rather than two paraphrases" is a machine check and not a promise. If the
//    two disagree, the code wins and the prose is the defect. `REQUIREMENTS.md`
//    and `STATE.md` still carry OLDER text and are deliberately untouched here
//    — see the last paragraph.
//    WIDENED 2026-08-24 (WR-27), and the widening is why this block now says
//    01-25 rather than 01-24. NOTHING HERE IS SUPERSEDED BY WR-27 AND THAT IS
//    THE POINT OF IT: the shape it closed — an operator in CALL-RECEIVER
//    position — was named by NO clause in any previous version of this block,
//    so this round WIDENS a self-declared-open enumeration rather than
//    correcting a false one. The omission is recorded as the finding inside the
//    residual itself, three paragraphs down, because that is where a reader
//    auditing this list for completeness will be standing.
//    NARROWED 2026-08-24 (CR-10), one wave earlier. THREE CLAUSES ARE
//    SUPERSEDED BY THAT ROUND AND THEY ARE NAMED
//    RATHER THAN REQUOTED, because a block that states a bound and also carries
//    its own false version gives a skimmer two sentences and no way to tell
//    which is live: THE SINGLE-DIRECTION CLAIM in boundary 2, THE EVERY-SPELLING
//    CLAIM in the receiver-key list, and THE COVERED-BY-CONSTRUCTION CLAIM on
//    the assignment collector. Their exact superseded words are preserved in
//    `01-REVIEW.md`'s CR-10 entry, in `01-VERIFICATION.md`, and in the
//    correction paragraphs at each of the three sites. All three were false in
//    the same place: a stale first literal shadowed every later rebinding of the
//    same name, so `let k = "harmless"; k = "requests"; sdk[k].send(req)` was
//    SILENT — the direction a reader was told could not happen — and `+=` was
//    not read at all. THAT WAS THE SIXTH CONSECUTIVE ROUND IN WHICH A BOUND WAS
//    AUTHORED RATHER THAN DERIVED; WR-27 IS THE SEVENTH, and each closes an
//    INSTANCE, not the class. Wave 27 owns the derivation that would.
//
//    CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND,
//    AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must
//    not be read as one. RE-DERIVED FOR WAVE 25 BY READING THE BRANCHES:
//    `receiverKind`'s four arms, `keyReceiver`'s steps including the
//    operator step above step 0, `initializerReceiver` (which is now a
//    NAME for `receiverKind`), `operatorReceiver` and the
//    `RECEIVER_OPERATORS` set — not by narrowing the previous paragraph,
//    which is the method plan 01-21 recorded as having enumerated two
//    classes while missing a third sitting in the same function.
//
//    THE OPERATOR CLASS IS CLOSED IN ALL FOUR POSITIONS AS OF WAVE 25,
//    THROUGH ONE DESCENT AND NOT THREE COPIES. `? :`, `??`, `||` and `&&`
//    are read in CALL-RECEIVER position (`(b ? sdk.requests :
//    sdk.net).send(req)`), in KEY position (`sdk[b ? "requests" :
//    "net"]`), in INITIALIZER position (`const r = sdk.requests ??
//    sdk.net; r.send(req)`) and in NESTED KEY position (`sdk[b ? (c ?
//    "requests" : "x") : "y"]`), by `operatorReceiver` — ONE function,
//    reached from `receiverKind` and from `keyReceiver`, each passing
//    ITSELF as the leaf resolver, so a NESTED operator resolves through the
//    same four `RECEIVER_OPERATORS` at each level. THE
//    THREE-STATE ANSWER, in the order the element-access arm already used
//    and copied from there rather than reinvented: any operand naming a
//    receiver makes the expression THAT RECEIVER; else any operand the
//    walk cannot read makes it UNREADABLE; else it is NOT A RECEIVER.
//
//    AND THE SHAPE THIS WAVE CLOSED WAS NAMED BY NO PRIOR RESIDUAL LIST
//    AT ALL — NOT UNDERSTATED BY THEM, OMITTED FROM THEM. Before wave 25
//    no clause here named a call-position operator: not the two-hop
//    clause, not the function-boundary clause, not the parameter or
//    loop-binding clauses, not the another-file clause. A reader
//    enumerating this gate's blind spots would have finished the list and
//    stopped, and been wrong. THAT OMISSION IS THE FINDING, and it is
//    recorded here where the list is rather than only in a summary,
//    because an enumeration that grows silently is one nobody can audit
//    for completeness in either direction. WHAT THIS IS NOT, SAID SO THE
//    ROUND DOES NOT INFLATE ITSELF: it is not the correction of a false
//    sentence. This list declares itself open and WR-27 WIDENED it,
//    exactly as round 4's wave 21 framed WR-24; CR-09 by contrast was a
//    residual that ASSERTED something false, which is the heavier
//    finding, and this wave does not borrow its weight. Equally, an
//    omitted shape is not a harmless one — completeness in both
//    directions is precisely what a residual list is trusted for.
//
//    `&&` IS IN THE SET AND WAS SETTLED BY MEASUREMENT, NOT BY SYMMETRY
//    WITH THE OTHER THREE, because the symmetry argument genuinely does
//    not carry: `a && b` yields `a` when `a` is FALSY, so its left
//    operand is usually a guard rather than a value. BOTH READINGS WERE
//    IMPLEMENTED AND RUN. THE REAL TREE DID NOT DISCRIMINATE — 23 files,
//    ZERO violations, under `&&` in and under `&&` out alike — so nothing
//    about shipped code chose this and no claim is made that it did. THE
//    SHAPES DISCRIMINATED: excluding `&&` left `(ok &&
//    sdk.requests).send(req)`, the ordinary way to write a guarded
//    outbound call and one with `sdk.requests` written out in full,
//    SILENT — which is WR-27's own finding reproduced one operator over,
//    inside the wave closing it. THE COST IS DISCLOSED AND PINNED BY ITS
//    OWN ASSERTION: `(sdk.requests && ok).send(req)`, where the receiver
//    is the guard and the value is something else, REPORTS. That
//    OVER-approximates, in the direction every other set in this file
//    errs. `+` is deliberately absent from `RECEIVER_OPERATORS` and must
//    stay absent — every operator in that set yields one of its operands
//    UNCHANGED, which is what makes either-side semantics sound, while
//    `"req" + "uests"` is the ASSEMBLY `isAssembledKey` owns. The sibling
//    gate one directory over, `store/error-redaction.spec.ts`'s
//    `derivesFrom`, already descends this same set of four with
//    either-side semantics (WR-24, plan 01-21) and cites
//    `initializerReceiver` in THIS file as its reason; excluding `&&`
//    here would have manufactured the disagreement that docblock was
//    written to prevent. That is corroboration, not the reason.
//
//    THE DESCENT EXISTED THREE TIMES AND THEREFORE EXISTED TWICE, WHICH
//    IS WHY THE THIRD FACE WENT UNTAUGHT WHILE THE OTHER TWO WERE TAUGHT
//    IN THE SAME ROUND. `initializerReceiver` unwrapped a conditional,
//    `receiverKind`'s element-access arm unwrapped one, and
//    `receiverKind` ITSELF did not — so a conditional written directly in
//    call position fell through every branch to `return undefined`, the
//    state every caller reads as NOT A RECEIVER, for a site with a
//    literal `sdk.requests` in it. Wave 25 collapsed the copies:
//    `initializerReceiver` is now a name for `receiverKind`, the
//    element-access arm calls `keyReceiver`, and both reach
//    `operatorReceiver`. THE COLLAPSE ALSO CORRECTED A PRECEDENCE NO LIST
//    NAMED EITHER, found by reading the three copies side by side rather
//    than predicted: `initializerReceiver` was `receiverKind(whenTrue) ??
//    receiverKind(whenFalse)`, and `??` does not skip
//    `UNREADABLE_RECEIVER` because a symbol is neither null nor undefined
//    — so an UNREADABLE LEFT branch shadowed a NAMED RIGHT branch in
//    initializer position and in no other position. `const r = b ? sdk[k1
//    + k2] : sdk.net` reported `outbound-unanalysable` while `const r = b
//    ? sdk.net : sdk[k1 + k2]` reported `outbound-net`: two spellings of
//    one shape answered differently by operand ORDER. Both now report the
//    named receiver; both REPORTED before and after, so the correction
//    changed WHICH rule is named and nothing went quiet.
//
//    `keyReceiver`'s DOCBLOCK CLAIM IS NOW TRUE OF THE CODE rather than
//    true of two callers. It has said since CR-08 that it is the single
//    definition of what a readable key is, called from the direct key and
//    both conditional branches "so they cannot disagree about what the
//    walk can read" — a claim made by a function that did not itself
//    handle a conditional, so a conditional INSIDE a branch was exactly
//    where they disagreed and `sdk[b ? (c ? "requests" : "x") : "y"]` was
//    silent. `keyReceiver` now recurses through `operatorReceiver`
//    passing itself.
//
//    WHAT REMAINS SILENT, READ OFF THE BRANCHES: TWO HOPS OF KEY — `const
//    a = "requests"; const b = a; sdk[b]` — because `constStrings` and
//    `assembledNames` read the INITIALIZER'S SHAPE and never the live
//    set, so a key cannot be grown from a name already in a set; a value
//    crossing a FUNCTION BOUNDARY; a PARAMETER; a LOOP BINDING; and a
//    name bound in ANOTHER FILE. And one thing is ASSUMED rather than
//    proven: a member or method call named in `NUMERIC_MEMBERS` is taken
//    to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails
//    OPEN (WR-26), disclosed rather than narrowed because narrowing it
//    was measured to change nothing except to re-poison ordinary `+`
//    indexing.
//
//    WHAT STOOD HERE, AND WHY IT IS GONE RATHER THAN CORRECTED. Two
//    paragraphs occupied this spot until 2026-08-25 (wave 33, CR-14). The
//    first asserted that an operator wrapping a global receiver was STILL
//    SILENT, named six probes and claimed all six reported `[]`, and closed
//    by pointing at a fixture titled as a measured silence. The second listed
//    that same shape as open and unowned, with no plan in this phase claiming
//    it. BOTH WERE FALSE BY THE TIME A READER MET THEM: wave 32 closed the
//    shape through `operatorOperandMatching` and `bareFetchCallee`, the
//    fixture they pointed at is now titled CLOSED (CR-11), and the registry
//    row they rested on — `silence-operator-around-global-receiver` — was
//    REMOVED, with a guard below asserting it never comes back.
//
//    THEY ARE DELETED RATHER THAN RE-DATED, and that choice is the whole of
//    wave 33. A corrected sentence is still an AUTHORED bound standing beside
//    a DERIVED one, which is how seven consecutive waves each fixed a stale
//    claim here and each acquired the next. THE RESIDUAL OF RECORD IS THE
//    GENERATED SPAN BELOW, between the two sentinel lines, byte-compared to
//    deriveResidual(RESOLVER_REGISTRY) by this suite. THIS PARAGRAPH RESTATES
//    NO BOUND OF ITS OWN, deliberately, for the same reason
//    `.planning/STATE.md` and `.planning/WINDOWS.md` do not. What was
//    believed about this shape, when, and which six probes were run against
//    it is preserved in `01-33-SUMMARY.md`, with the rule identifiers each
//    one produces today — because a history is a record, not a bound.
//
//    Every exemption here is preserved BY MEASUREMENT, re-run after each
//    widening and again in wave 25: 23 files over both `SOURCE_ROOTS`,
//    ZERO violations, with `compat.ts`'s `at()` `cur[key]` and
//    `ctx[root]`, `observations.ts`'s `segments[i]` and
//    `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name. AN
//    OPERATOR DESCENT IN CALL-RECEIVER POSITION IS THE WIDENING MOST
//    LIKELY TO FIRE ON ORDINARY SHIPPED CODE — picking one of two
//    ordinary collaborators with `? :`, `??`, `||` or `&&` is common, and
//    a gate that flags it gets deleted rather than fixed — so every
//    widening in this wave shipped with its must-stay-quiet twin IN THE
//    SAME COMMIT: `(useCache ? cache : client)`, `(cache ?? client)`,
//    `(cache || client)`, `(ready && cache)` and an ordinary object
//    defining a method named `send` all report `[]`.
//
//    WAVE 27 REPLACES THIS AUTHORED TEXT WITH ONE DERIVED FROM THE CODE.
//    This wave closes WR-27's INSTANCE and does not close the class that
//    produced it — an authored bound nobody re-derived — which is now
//    SEVEN consecutive rounds. `REQUIREMENTS.md` and `STATE.md` are
//    deliberately NOT amended in this wave, for the reason wave 24
//    recorded: both carry an authored residual, wave 27 derives the
//    replacement and wave 28 reconciles both requirement-tier ledgers to
//    it in ONE move, and another hand-authored copy would be another
//    place the next drift can start. [A SENTENCE STOOD HERE STATING
//    CORE-11's BOX STATE AND NAMING A LATER WAVE AS THE OWNER OF THE
//    CHANGE. DELETED 2026-08-26 (wave 41, WINDOWS 41), under the same
//    pointer-not-a-bound disposition wave 33 applied to the paragraph a
//    hundred lines below: it was unmarked, present-tense, and its owner
//    clause was false on its own terms — no wave ever owned that change.
//    The authoritative surfaces are `CORE11_BOX_EXPECTED` below and the
//    CORE-11 row in `.planning/REQUIREMENTS.md`; this block now POINTS at
//    them and asserts nothing.] NOTHING LEAKED:
//    WR-27 is a PROSPECTIVE BLINDNESS in a test-only gate, no outbound
//    call exists in any non-spec source under either root, the gate runs
//    green over the real tree — 23 files, ZERO violations — inside a
//    1143-test suite, and `pnpm check:bundle` reports the shipped
//    bundle's entire import set as one specifier, `crypto`.
//
//    ============= THE NARROWING, AFTER PLAN 01-26 =============
//    AUTHORED ONCE and rendered into this block and into `.planning/WINDOWS.md`
//    from the same bytes, exactly as the wave-25 block above was, so "the same
//    words rather than two paraphrases" stays a check rather than a promise.
//    THE NARROWING AFTER WAVE 26 (plan 01-26, closing IN-26). This block
//    AMENDS the wave-25 residual above rather than replacing it:
//    everything in it still holds except the one clause named here, and
//    wave 27 still owns the derivation that replaces the whole authored
//    text. WHAT CHANGED, and it is one clause. Wave 25's STILL OPEN
//    paragraph named "the DESTRUCTURED KEY BINDING, `const { k } = o;
//    sdk[k].send(req)` — WAVE 26 (IN-26)" as a single open shape.
//    Measured, it is THREE shapes with three different answers, and only
//    one of them was ever IN-26. CLOSED HERE, both spellings, by giving
//    the assembled-name collector the binding-pattern reading its
//    RECEIVER sibling already had: `const { k } = { k: "req" + "uests" };
//    sdk[k].send(req)` and `const [k] = ["req" + "uests"];
//    sdk[k].send(req)` both reported `[]` before this wave and both
//    report `outbound-unanalysable` after it, as do the renamed-key
//    spelling `const { p: k } = { p: "req" + "uests" }` and a non-zero
//    array slot. That is what the header two hundred lines up already
//    claimed when it said an assembly is read "through EITHER a
//    declaration or an assignment" — both of these are declarations, and
//    the claim was true of one spelling out of three. STILL OPEN, AND NOT
//    IN-26: `const { k } = o; sdk[k].send(req)` — the exact string wave
//    25's paragraph used — is a value crossing a boundary the walk does
//    not follow, which is residual (a)'s function/value half, unchanged
//    and NOT closed by this wave. Wave 25's paragraph named it with
//    IN-26's identifier and IN-26 is not about it; that conflation is
//    corrected here rather than left for the derivation to inherit. NEWLY
//    OPEN AND NAMED BY MEASUREMENT RATHER THAN BY REVIEW, residual (b2):
//    a destructured PLAIN LITERAL — `const { k } = { k: "requests" };
//    sdk[k].send(req)` — stays `[]`, because `constStrings` reads only
//    the identifier spelling of the same declaration that
//    `assembledNames` now reads three ways. It was found by measuring the
//    result of closing IN-26, not predicted by IN-26 or by this plan, and
//    it is DISCLOSED rather than folded in: widening `constStrings`
//    through binding patterns is a separate decision that needs its own
//    real-tree measurement, and a wave that closes a shape while quietly
//    opening its sibling is exactly the omission the wave-25 paragraph
//    above exists to stop. Pinned as a MEASURED SILENCE so the day it is
//    closed a test moves. THE OPERATOR AROUND A GLOBAL RECEIVER — `(ok &&
//    globalThis).fetch(url)` and its five twins — is UNCHANGED, still
//    OPEN and still UNOWNED; this wave neither closed it nor broke it and
//    claims nothing about it. THE ALIAS BOUND IS NOW STATED IN ONE PLACE
//    AND POINTED AT FROM THREE (WR-30). Three docblocks — on
//    `isGlobalReceiverIn`, on `globalAliases` and residual (c) itself —
//    each asserted a ONE-HOP bound and each named a source string as
//    silent. All three were EXECUTED before being edited and all three
//    REPORT: `const a = globalThis; const g = a; g.fetch(u)` gives
//    `outbound-fetch`, `const a = eval; const b = a; b(s)` gives
//    `outbound-dynamic-code`, `const a = navigator; const n = a;
//    n.sendBeacon(u, d)` gives `outbound-beacon`. The first of those was
//    contradicted by a PASSING test 1,800 lines below it in the same file
//    asserting the identical string reports; two passing assertions that
//    cannot both be true is the sharpest form of the defect this phase
//    keeps finding. Each is now a POINTER to residual (a) plus the local
//    fact that is genuinely about that symbol, because a bound restated
//    in four places is a bound that drifts in three. THE FOURTH IDENTICAL
//    SENTENCE SURVIVES AND IS CORRECT: on `assembledNames`, keys read the
//    INITIALIZER'S SHAPE and never the live set, so they cannot chain —
//    executed, `const a = "req" + "uests"; const b = a; sdk[b].send(req)`
//    is `[]`. That it is true there is precisely why the other three read
//    as true to a skimming reader, and it is marked as the one place the
//    one-hop bound is stated so the next author does not delete the
//    correct one with the stale ones. THE TRANSITIVITY ASSERTION NOW
//    COVERS ALL FIVE ALIAS SETS at three hops, where it covered three at
//    two. RECORDED DISCREPANCY, because the plan's prediction did not
//    survive measurement: `navigatorAliases` and `globalAliases` were NOT
//    uncovered — two sibling cases already asserted both chaining at two
//    hops — so this is a consolidation into the one place residual (a)
//    sends a reader, plus a depth widening, and not the closure of a
//    hole. THE DIRECTION OF ALL OF WR-30 IS SAFE: the gate reaches
//    FURTHER than those three sentences said, so nothing was hidden by
//    them. They are still overclaims and are named as such, because a
//    residual list is trusted for its completeness in both directions.
//    EVERY EXEMPTION RE-MEASURED AFTER THE COLLECTOR WIDENING, not
//    argued: 23 files over both `SOURCE_ROOTS`, ZERO violations, with
//    `compat.ts`'s `at()` dotted-path walk (the `for…of` key, written
//    `(cur as Record<string, unknown>)[key]`) and its `ctx[root]`
//    parameter, `observations.ts`'s `segments[i]` and
//    `MIGRATIONS[MIGRATIONS.length - 1]` all quiet. Destructuring is
//    ordinary in this codebase, so the widening shipped with its
//    must-stay-quiet twins IN THE SAME COMMIT: an ordinary destructure
//    used as an ordinary lookup, a numeric slot, a rest element, and a
//    destructure of a value the walk cannot read all report `[]`. NOTHING
//    LEAKED: IN-26 was unreachable in the real tree today, WR-30 ran in
//    the safe direction, and the gate runs green over the real tree — 23
//    files, ZERO violations — inside a 1148-test suite, with `pnpm
//    check:bundle` reporting the shipped bundle's entire import set as
//    one specifier, `crypto`. `REQUIREMENTS.md` and `STATE.md` stay
//    deliberately untouched, for the reason waves 24 and 25 recorded:
//    wave 27 derives the replacement text and wave 28 reconciles both
//    requirement-tier ledgers to it in ONE move. [A CLAUSE STATING
//    CORE-11's BOX STATE STOOD INSIDE THIS SENTENCE AND IS DELETED,
//    2026-08-26 (wave 41, WINDOWS 41), for the same reason as the deletion
//    in the wave-27 block above. The ledger-reconciliation clause is LEFT
//    STANDING: it is the same dated record of intent the wave-27 block
//    already carries, it names no box state, and reconciling the two
//    ledgers is a thing that wave did. The authoritative surfaces are
//    named in the note directly below.]
//
//    CORE-11's BOX IS NOT STATED HERE, AS OF 2026-08-25 (wave 33, WR-38). A
//    paragraph asserting the box was NOW MARKED COMPLETE stood at this spot
//    and is DELETED. It contradicted the ledger row it named, roughly 8,100
//    lines below it, and a header is the first thing a reader and a later
//    planner meet — the worst available place to keep a second copy of a fact
//    that has already been flipped early and reverted twice, at `e7cc4b6`
//    and `faca607`. THE SITE COUNT THIS PARAGRAPH USED TO STATE HERE WAS
//    FALSE, AND IS REPLACED 2026-08-26 (wave 41, WINDOWS 41). It claimed a
//    two-site total. Verification pass 9 measured FOUR sites stating the
//    box's state and found all four in agreement — so there was no
//    contradiction of FACT, and this was never what held the box where it
//    is — but a false count standing on a reader surface is exactly the
//    class the third criterion is about. NO COUNT REPLACES IT. The
//    AUTHORITATIVE surfaces are the CORE-11 row in
//    `.planning/REQUIREMENTS.md` and `CORE11_BOX_EXPECTED` below, which
//    pins that row BY BYTES. WHAT THIS FILE CANNOT SEE IS NAMED RATHER
//    THAN SILENTLY COUNTED: the ledger row lives in a different file, and
//    no mechanism in this file enumerates the places IT states the box's
//    state; `.planning/STATE.md` is governed by the pointer-not-a-bound
//    rule below with no mechanical check at all. A count stated wider than
//    the grep that produced it is the defect being corrected here. This
//    paragraph POINTS at both authoritative surfaces and asserts nothing
//    about the box's state itself, so the contradiction cannot recur. The
//    item-by-item discharge table is in `01-28-SUMMARY.md`; the table is
//    the evidence and the checkbox is not.
//    ========================================================================
// 3. THE FILE WALK below duplicates `store/sql-discipline.spec.ts`'s private walk
//    by about fifteen lines, and the wrapper-unwrapping helper duplicates the one
//    `store/error-redaction.spec.ts` needs — both DELIBERATELY. Exporting one
//    gate's internals into another means one gate's refactor can silently change
//    the other's scope; the named non-vacuity assertion is the real protection
//    against a walk that shrinks.

/*
THE GENERATED RESIDUAL LIVES BETWEEN THE TWO SENTINEL LINES BELOW.
Everything between them is the output of deriveResidual(RESOLVER_REGISTRY),
declared further down this file, and is compared to that output BY BYTES by the
suite. Do not hand-edit the span: edit the registry and regenerate.

THE SURFACE DECISION, wave 27, written here because this is one of the four
places the difference is visible. The DERIVED text ships in exactly TWO surfaces
- this gate header and `.planning/REQUIREMENTS.md`'s CORE-11 entry - and BOTH are
byte-compared to deriveResidual(RESOLVER_REGISTRY) by this suite.
`.planning/STATE.md` and `.planning/WINDOWS.md` carry a POINTER to those two and
restate NO bound of their own, because they are append-only DATED HISTORIES: a
block regenerated inside one would rewrite the record of what was believed and
when, which is the only thing that makes a history worth keeping. THAT
POINTER-NOT-A-BOUND RULE IS A PROHIBITION WITH NO MECHANICAL CHECK - the byte
comparison reaches these two surfaces and no further - and it is named as an
unguarded limit rather than left implicit.

CORE-11's COMPLETION, wave 28, recorded here because this is where a reader
arrives looking for the basis of the box. CORE-11's own first sentence was
discharged ITEM BY ITEM against executed evidence: one row per surface that
sentence enumerates, plus one row per shape gap-closure round 5 closed, each row
carrying the probe run through auditSource in that session, the rule identifier
it produced, the fixture title that asserts it, and the plan and summary that
watched that fixture fail. THAT TABLE IS IN `01-28-SUMMARY.md`, and the table is
the evidence - the checkbox is not. THE RESIDUAL OF RECORD IS THE GENERATED SPAN
BELOW: this note restates NO bound of its own, deliberately, for the same reason
`.planning/STATE.md` and `.planning/WINDOWS.md` do not - an authored bound
standing beside a derived one is how five consecutive rounds each went wrong.
Wave 28 changed no rule, no fixture, no resolver and no registry row; its entire
diff in this file is this comment.
BEGIN DERIVED RESIDUAL - generated by deriveResidual(RESOLVER_REGISTRY) in packages/backend/src/outbound-prohibition.spec.ts - MACHINE-OWNED, DO NOT HAND-EDIT
THE RESIDUAL OF CORE-11's OUTBOUND WALK - DERIVED, NOT AUTHORED.
This text is the output of deriveResidual(RESOLVER_REGISTRY) in
packages/backend/src/outbound-prohibition.spec.ts. It is machine-owned: a test
reads this file's own bytes, extracts the span between the sentinels, and
compares it to that output. If the two disagree the GENERATED text is
authoritative and the shipped text is the defect.

WHAT THIS TEXT ESTABLISHES, AND WHAT IT DOES NOT.
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
2. It does NOT prove the registry enumerates every mechanism the walk has. A
   coverage guard enumerates TWO populations out of this file's own source -
   collectors matching a declared naming convention, and resolver functions
   declared inside the audit function or at module scope in the resolver
   region - and requires each member to be an entry below OR a NAMED, reasoned
   entry on an explicit exemption list. The bound is REGISTERED OR LISTED over
   those two populations. It is NOT `detectable`: a resolver written as NEITHER
   shape - an inline branch in the walk, a differently-shaped binding, a
   resolver declared inside another function - is enumerated by neither half
   and is NOT caught.
3. Each entry's probes are EXAMPLES. They prove the entry true OF ITSELF and
   do not cover that resolver's whole domain.
4. The MEASURED SILENCE entries are NOT proven exhaustive: a shape nobody
   thought of is still silent and still unlisted here.
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

RESOLVERS - 35 entries.

* constStrings - a receiver or global KEY resolves when a string literal bound at a string-literal declaration, a string-literal assignment, a logical assignment or an operator initializer names an outbound receiver; bindings are file-wide and ANY-BINDING-WINS, so this collector OVER-approximates. FALSIFIED 2026-08-24 (CR-13), the phrase this clause used to carry: "ANY string literal the name is bound to anywhere in the file" - measured, a conditional, ?? or || initializer bound a literal neither this collector nor literalsOf read; that shape is CLOSED 2026-08-24 by operatorLiteralBinding and the branch below is its probe; the string-literal assignment branch has since 2026-08-24 (CR-12) read ASSIGNING_OPERATORS, so the three logical spellings bind through it too; and the phrase STAYS falsified because a parameter, a loop binding, a name bound in another file and a second hop of key each still bind nothing
    read off:  auditSource > const constStrings = new Map<string, Set<string>>()
    probe:     "const r = \"requests\";\nsdk[r].send(req);"
    reports:   outbound-send
    counter:   "const r = \"harmless\";\nsdk[r].send(req);"
    reports:   [] - nothing
    branch:    "a string-literal declaration" at auditSource > collect > if (ts.isStringLiteralLike(init)) { - probe "const r = \"requests\";\nsdk[r].send(req);" - reports outbound-send
    branch:    "a string-literal assignment" at auditSource > collect > if (ts.isStringLiteralLike(assignedString)) { - probe "let r;\nr = \"requests\";\nsdk[r].send(req);" - reports outbound-send
    branch:    "an operator initializer" at auditSource > collect > for (const literal of operatorBinding.literals) { - probe "const k = b ? \"requests\" : \"net\";\nsdk[k].send(req);" - reports outbound-send
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken, - probe "let k;\nk ??= \"requests\";\nsdk[k].send(req);" - reports outbound-send
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken, - probe "let k;\nk ||= \"requests\";\nsdk[k].send(req);" - reports outbound-send
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken, - probe "let k;\nk &&= \"requests\";\nsdk[k].send(req);" - reports outbound-send

* assembledNames - a name the walk WATCHED being assembled - at a declaration, an assignment, a `+=` compound assignment, a logical assignment, or either binding-pattern spelling - is an UNREADABLE key, and takes precedence over a literal binding of the same name. FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "a compound assignment" - measured, the logical-assignment spellings ||=, &&= and ??= grew nothing; those three are CLOSED 2026-08-24 by ASSIGNING_OPERATORS and the three branches below are their probes, and the phrase STAYS falsified because the NUMERIC compound assignments (-=, *=, >>>= and the rest of NUMERIC_COMPOUND_ASSIGNMENTS) deliberately assemble nothing
    read off:  auditSource > const assembledNames = new Set<string>()
    probe:     "const k = \"req\" + \"uests\";\nsdk[k].send(req);"
    reports:   outbound-unanalysable
    counter:   "let i = 0;\ni += 1;\nsdk[i].send(req);"
    reports:   [] - nothing
    branch:    "a declaration" at auditSource > collect > if (isAssembledKey(init, numericNames, poisonedNumericNames)) { - probe "const k = \"req\" + \"uests\";\nsdk[k].send(req);" - reports outbound-unanalysable
    branch:    "an assignment" at auditSource > collect > if (isAssembledKey(node.right, numericNames, poisonedNumericNames)) { - probe "let k;\nk = \"req\" + \"uests\";\nsdk[k].send(req);" - reports outbound-unanalysable
    branch:    "a `+=` compound assignment" at auditSource > collect > node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken && - probe "let k = \"re\";\nk += \"quests\";\nsdk[k].send(req);" - reports outbound-unanalysable
    branch:    "either binding-pattern spelling" at auditSource > collect > destructuredInitializer(init, el, 0), - probe "const { k } = { k: \"req\" + \"uests\" };\nsdk[k].send(req);" - reports outbound-unanalysable
    branch:    "either binding-pattern spelling" at auditSource > collect > destructuredInitializer(init, el, index), - probe "const [k] = [\"req\" + \"uests\"];\nsdk[k].send(req);" - reports outbound-unanalysable
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken, - probe "let k;\nk ??= \"req\" + \"uests\";\nsdk[k].send(req);" - reports outbound-unanalysable
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken, - probe "let k;\nk ||= \"req\" + \"uests\";\nsdk[k].send(req);" - reports outbound-unanalysable
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken, - probe "let k;\nk &&= \"req\" + \"uests\";\nsdk[k].send(req);" - reports outbound-unanalysable

* receiverAliases - a name bound to an outbound RECEIVER expression at a declaration, an assignment or a logical assignment is that receiver everywhere in the file; grown from the LIVE set during the collect pass, so a chain resolves to any depth in DECLARATION order. FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "a name bound to an outbound RECEIVER expression" without qualification - measured, a logical-assignment binding grew nothing; that shape is CLOSED 2026-08-24 by ASSIGNING_OPERATORS and the three branches below are its probes, and the phrase STAYS falsified because a parameter, a loop binding, a name bound in another file, a binding written in inverted order and a MEMBER target (o.r ??= sdk.requests) each still grow nothing
    read off:  auditSource > const receiverAliases = new Map<string, string>()
    probe:     "const r = sdk.requests;\nr.send(req);"
    reports:   outbound-send
    counter:   "const r = sdk.other;\nr.send(req);"
    reports:   [] - nothing
    branch:    "a declaration" at auditSource > collect > receiverAliases.set(node.name.text, kind); - probe "const r = sdk.requests;\nr.send(req);" - reports outbound-send
    branch:    "an assignment" at auditSource > collect > receiverAliases.set(node.left.text, kind); - probe "let r;\nr = sdk.requests;\nr.send(req);" - reports outbound-send
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken, - probe "let r;\nr ??= sdk.requests;\nr.send(req);" - reports outbound-send
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken, - probe "let r;\nr ||= sdk.requests;\nr.send(req);" - reports outbound-send
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken, - probe "let r;\nr &&= sdk.requests;\nr.send(req);" - reports outbound-send

* unreadableAliases - a name bound to a receiver EXPRESSION the walk could not read is reported where the name is USED as a receiver, not where it was bound - so an ordinary dynamic lookup never used as a receiver stays quiet
    read off:  auditSource > const unreadableAliases = new Set<string>()
    probe:     "const r = sdk[\"req\" + \"uests\"];\nr.send(req);"
    reports:   outbound-unanalysable
    counter:   "const v = record[\"na\" + \"me\"];\nconsole.log(v);"
    reports:   [] - nothing
    branch:    "where the name is USED as a receiver" at auditSource > receiverKind > return unreadableAliases.has(inner.text) - probe "const k = \"a\" + b;\nconst r = sdk[k];\nr.send(req);" - reports outbound-unanalysable

* fetchAliases - a name bound to the global fetch at a declaration, an assignment or a logical assignment is the global fetch; seeded with the bare spelling and grown from the live set, so it chains in declaration order
    read off:  auditSource > const fetchAliases = new Set<string>([FETCH_GLOBAL])
    probe:     "const f = fetch;\nf(url);"
    reports:   outbound-fetch
    counter:   "const f = cache.fetch;\nf(url);"
    reports:   [] - nothing
    branch:    "the bare spelling" at auditSource > const fetchAliases = new Set<string>([FETCH_GLOBAL]); - probe "fetch(url);" - reports outbound-fetch
    branch:    "a declaration" at auditSource > collect > if (isFetchExpression(init)) fetchAliases.add(node.name.text); - probe "const f = fetch;\nf(url);" - reports outbound-fetch
    branch:    "an assignment" at auditSource > collect > if (isFetchExpression(node.right)) fetchAliases.add(node.left.text); - probe "let f;\nf = fetch;\nf(url);" - reports outbound-fetch
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken, - probe "let f;\nf ??= fetch;\nf(url);" - reports outbound-fetch
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken, - probe "let f;\nf ||= fetch;\nf(url);" - reports outbound-fetch
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken, - probe "let f;\nf &&= fetch;\nf(url);" - reports outbound-fetch

* navigatorAliases - a name bound to navigator at a declaration, an assignment or a logical assignment is navigator; RECEIVER-ANCHORED, so an ordinary object defining a method of the same name grows nothing
    read off:  auditSource > const navigatorAliases = new Set<string>([NAVIGATOR])
    probe:     "const n = navigator;\nn.sendBeacon(u, d);"
    reports:   outbound-beacon
    counter:   "const o = { sendBeacon(u, d) { return d; } };\no.sendBeacon(u, d);"
    reports:   [] - nothing
    branch:    "a declaration" at auditSource > collect > if (isNavigatorReceiver(init)) navigatorAliases.add(node.name.text); - probe "const n = navigator;\nn.sendBeacon(url);" - reports outbound-beacon
    branch:    "an assignment" at auditSource > collect > if (isNavigatorReceiver(node.right)) navigatorAliases.add(node.left.text); - probe "let n;\nn = navigator;\nn.sendBeacon(url);" - reports outbound-beacon
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken, - probe "let n;\nn ??= navigator;\nn.sendBeacon(url);" - reports outbound-beacon
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken, - probe "let n;\nn ||= navigator;\nn.sendBeacon(url);" - reports outbound-beacon
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken, - probe "let n;\nn &&= navigator;\nn.sendBeacon(url);" - reports outbound-beacon

* globalAliases - a name bound to eval, Function or an outbound constructor at a declaration, an assignment, a logical assignment or the object binding-pattern spelling maps to the global it names, so the violation detail can name the surface the local aliases; RECEIVER-ANCHORED off the four global receivers
    read off:  auditSource > const globalAliases = new Map<string, string>()
    probe:     "const e = eval;\ne(src);"
    reports:   outbound-dynamic-code
    counter:   "const o = { eval(s) { return s; } };\nconst e = o.eval;\ne(src);"
    reports:   [] - nothing
    branch:    "a declaration" at auditSource > collect > if (aliased !== undefined) globalAliases.set(node.name.text, aliased); - probe "const e = eval;\ne(src);" - reports outbound-dynamic-code
    branch:    "an assignment" at auditSource > collect > globalAliases.set(node.left.text, aliasedRight); - probe "let e;\ne = eval;\ne(src);" - reports outbound-dynamic-code
    branch:    "the object binding-pattern spelling" at auditSource > collect > globalAliases.set(el.name.text, property); - probe "const { eval: ev } = globalThis;\nev(src);" - reports outbound-dynamic-code
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken, - probe "let e;\ne ??= eval;\ne(src);" - reports outbound-dynamic-code
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken, - probe "let e;\ne ||= eval;\ne(src);" - reports outbound-dynamic-code
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken, - probe "let e;\ne &&= eval;\ne(src);" - reports outbound-dynamic-code

* globalThisAliases - a name WATCHED being bound to one of the four GLOBAL_RECEIVERS at a declaration, an assignment or a logical assignment is a global receiver; seeded EMPTY so the bare-identifier answer is unchanged and the new behaviour is reachable only through what the walk saw bound
    read off:  auditSource > const globalThisAliases = new Set<string>()
    probe:     "const g = globalThis;\ng.fetch(url);"
    reports:   outbound-fetch
    counter:   "const g = helper;\ng.fetch(url);"
    reports:   [] - nothing
    branch:    "a declaration" at auditSource > collect > if (isGlobalReceiver(init)) globalThisAliases.add(node.name.text); - probe "const g = globalThis;\ng.fetch(url);" - reports outbound-fetch
    branch:    "an assignment" at auditSource > collect > if (isGlobalReceiver(node.right)) globalThisAliases.add(node.left.text); - probe "let g;\ng = globalThis;\ng.fetch(url);" - reports outbound-fetch
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken, - probe "let g;\ng ??= globalThis;\ng.fetch(url);" - reports outbound-fetch
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken, - probe "let g;\ng ||= globalThis;\ng.fetch(url);" - reports outbound-fetch
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken, - probe "let g;\ng &&= globalThis;\ng.fetch(url);" - reports outbound-fetch

* shadowedGlobals - a NARROWING collector: a TOP-LEVEL function or class declaration of a dynamic-code or outbound-constructor name provably rebinds that name for the module, so the bare call is not the global. Its probe is the shape that stays QUIET and its counter-probe is the shape that REPORTS
    read off:  auditSource > const shadowedGlobals = new Set<string>()
    probe:     "function Function(a) { return a; }\nFunction(\"x\");"
    reports:   [] - nothing
    counter:   "Function(\"x\");"
    reports:   outbound-dynamic-code
    branch:    "a TOP-LEVEL function or class declaration" at auditSource > collect > shadowedGlobals.add(node.name.text); - probe "function eval(s) { return s; }\neval(src);" - reports [] - nothing

* numericNames - a NARROWING collector: a name bound only to provably numeric values is an INDEX rather than a hidden receiver name, and is excluded before any receiver rule runs. Probe stays quiet, counter-probe reports
    read off:  auditSource > const numericNames = new Set<string>()
    probe:     "let i = 0;\nsdk[i].send(req);"
    reports:   [] - nothing
    counter:   "let i = \"requests\";\nsdk[i].send(req);"
    reports:   outbound-send
    branch:    "a name bound only to provably numeric values" at auditSource > collect > numericNames.add(node.name.text); - probe "const i = 0;\nsdk[i].send(req);" - reports [] - nothing

* poisonedNumericNames - the negative half of the numeric exemption: a name bound to ANYTHING non-numeric anywhere in the file stops being an index, so a numeric accumulator later assigned a receiver name reports
    read off:  auditSource > const poisonedNumericNames = new Set<string>()
    probe:     "let i = 0;\ni = \"requests\";\nsdk[i].send(req);"
    reports:   outbound-send
    counter:   "let i = 0;\ni = 2;\nsdk[i].send(req);"
    reports:   [] - nothing
    branch:    "stops being an index" at auditSource > collect > poisonedNumericNames.add(node.left.text); - probe "let i = 0;\ni = \"requests\";\nsdk[i].send(req);" - reports outbound-send

* isGlobalReceiver - one-hop resolution of a GLOBAL receiver closed over the live alias set, so a member of an aliased global receiver that will not reduce is reported rather than dropped
    read off:  auditSource > const isGlobalReceiver = (node: ts.Expression): boolean =>
    probe:     "const g = globalThis;\ng[\"fet\" + \"ch\"](url);"
    reports:   outbound-unanalysable
    counter:   "const g = helper;\ng[\"fet\" + \"ch\"](url);"
    reports:   [] - nothing
    branch:    "one-hop resolution of a GLOBAL receiver" at auditSource > const isGlobalReceiver = (node: ts.Expression): boolean => - probe "const g = globalThis;\ng.fetch(url);" - reports outbound-fetch

* keyReceiver - the SINGLE definition of what a readable key is, in the order: watched assembly, then any literal binding, then inline assembly, then not a receiver; it descends operators through operatorReceiver passing ITSELF, so nesting resolves at any depth
    read off:  auditSource > const keyReceiver = (key: ts.Expression): ReceiverKind => {
    probe:     "sdk[b ? \"requests\" : \"net\"].send(req);"
    reports:   outbound-send
    counter:   "sdk[b ? \"x\" : \"y\"].send(req);"
    reports:   [] - nothing
    branch:    "watched assembly" at auditSource > keyReceiver > assembledNames.has(assembledKey.text) - probe "const k = \"req\" + \"uests\";\nsdk[k].send(req);" - reports outbound-unanalysable
    branch:    "any literal binding" at auditSource > keyReceiver > for (const literal of literalsOf(key)) { - probe "const k = \"requests\";\nsdk[k].send(req);" - reports outbound-send
    branch:    "inline assembly" at auditSource > keyReceiver > if (isAssembledKey(key, numericNames, poisonedNumericNames)) { - probe "sdk[\"req\" + \"uests\"].send(req);" - reports outbound-unanalysable

* receiverKind - the three-state answer for an expression in RECEIVER position - THAT RECEIVER, UNREADABLE, or NOT A RECEIVER - including a bare operator written directly in call position, which fell through every branch before wave 25
    read off:  auditSource > const receiverKind = (node: ts.Expression): ReceiverKind => {
    probe:     "(b ? sdk.requests : sdk.net).send(req);"
    reports:   outbound-send
    counter:   "(b ? cache : client).send(req);"
    reports:   [] - nothing
    branch:    "a bare operator written directly in call position" at auditSource > receiverKind > const operator = operatorReceiver(inner, receiverKind); - probe "(b ? sdk.requests : sdk.net).send(req);" - reports outbound-send

* literalsOf - the MULTI-valued string reader keyReceiver consults: the collected set of literals constStrings recorded for a name - which since 2026-08-24 includes every literal an operator initializer bound and every literal a logical assignment bound - so ANY of them naming a receiver reports. FALSIFIED 2026-08-24 (CR-13), the phrase this clause used to carry: "every literal a name carries" - measured, a literal reached only through a conditional, ?? or || initializer was in no collected set and was not read; that shape is CLOSED 2026-08-24 by operatorLiteralBinding and the branch below is its probe, the logical-assignment spellings are CLOSED 2026-08-24 by ASSIGNING_OPERATORS and the three branches below are their probes, and the phrase STAYS falsified because a literal reached only through a parameter, a loop binding, a name bound in another file or a second hop of key is still in no collected set
    read off:  auditSource > function literalsOf(node: ts.Node | undefined): ReadonlySet<string> {
    probe:     "let k = \"harmless\";\nk = \"requests\";\nsdk[k].send(req);"
    reports:   outbound-send
    counter:   "let k = \"harmless\";\nk = \"other\";\nsdk[k].send(req);"
    reports:   [] - nothing
    branch:    "the collected set" at auditSource > literalsOf > return constStrings.get(node.text) ?? NO_LITERALS; - probe "const k = \"requests\";\nsdk[k].send(req);" - reports outbound-send
    branch:    "an operator initializer" at auditSource > literalsOf > return constStrings.get(node.text) ?? NO_LITERALS; - probe "const k = b ? \"requests\" : \"net\";\nsdk[k].send(req);" - reports outbound-send
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken, - probe "let k = \"harmless\";\nk ??= \"requests\";\nsdk[k].send(req);" - reports outbound-send
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken, - probe "let k = \"harmless\";\nk ||= \"requests\";\nsdk[k].send(req);" - reports outbound-send
    branch:    "a logical assignment" at auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken, - probe "let k = \"harmless\";\nk &&= \"requests\";\nsdk[k].send(req);" - reports outbound-send

* literalOf - the SINGLE-valued string reader member names and module specifiers need: one binding resolves, two or more answer undefined, and undefined means COULD NOT READ at every call site - which reports
    read off:  auditSource > function literalOf(node: ts.Node | undefined): string | undefined {
    probe:     "const s = \"caido:http\";\nawait import(s);"
    reports:   outbound-import
    counter:   "const s = \"crypto\";\nawait import(s);"
    reports:   [] - nothing
    branch:    "two or more answer undefined" at auditSource > literalOf > if (literals.size !== 1) return undefined; - probe "let m = \"send\";\nm = \"get\";\nsdk.requests[m](req);" - reports outbound-unanalysable

* memberName - the member name of a positively identified receiver, read single-valued; a name that will not reduce to exactly one literal is reported as unreadable rather than assumed harmless
    read off:  auditSource > const memberName = (
    probe:     "let m = \"harmless\";\nm = \"send\";\nsdk.requests[m](req);"
    reports:   outbound-unanalysable
    counter:   "const m = \"get\";\nsdk.requests[m](id);"
    reports:   [] - nothing
    branch:    "read single-valued" at auditSource > memberName > : literalOf(node.argumentExpression); - probe "sdk.requests[\"send\"](req);" - reports outbound-send

* initializerReceiver - a NAME for receiverKind since wave 25, so initializer position and call position give the same answer and the `??` precedence bug that let an UNREADABLE left branch shadow a NAMED right branch is gone. CORRECTED 2026-08-24 (CR-11): that promise was true of THIS resolver and FALSE of the global ones, which is what actively misled a reader about `const g = globalThis ?? self` - an initializer that aliased a global receiver through an operator grew nothing while the SDK twin resolved; the global resolvers now answer the same in both positions through the shared operator descent, and the branch below is its probe
    read off:  auditSource > const initializerReceiver = (node: ts.Expression): ReceiverKind =>
    probe:     "const r = b ? sdk.requests : sdk.net;\nr.send(req);"
    reports:   outbound-send
    counter:   "const r = b ? cache : client;\nr.send(req);"
    reports:   [] - nothing
    branch:    "a NAME for receiverKind" at auditSource > const initializerReceiver = (node: ts.Expression): ReceiverKind => - probe "const r = b ? sdk.requests : sdk.net;\nr.send(req);" - reports outbound-send
    branch:    "the shared operator descent" at auditSource > collect > if (isGlobalReceiver(init)) globalThisAliases.add(node.name.text); - probe "const g = globalThis ?? self;\ng.fetch(url);" - reports outbound-fetch

* isFetchExpression - the global fetch in four spellings - bare, on any of the four global receivers, through an alias, or an operator around the bare global - and NOT a fetch method of an ordinary object. FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "in every reachable spelling" - measured, an operator wrapping the bare global, (ok && fetch)(url), reached no branch here; that shape is CLOSED 2026-08-24 (CR-11) by operatorOperandMatching and the branch below is its probe, and closing it took a SIXTH site as well - bareFetchCallee - because the bare-call rule asked the same question INLINE and never consulted this function at all; and the phrase STAYS falsified because a receiver crossing a function boundary, a parameter, an array-slot binding and a class field each still reach no branch here
    read off:  auditSource > const isFetchExpression = (node: ts.Expression): boolean => {
    probe:     "globalThis.fetch(url);"
    reports:   outbound-fetch
    counter:   "client.fetch(url);"
    reports:   [] - nothing
    branch:    "on any of the four global receivers" at auditSource > isFetchExpression > memberName(inner) === FETCH_GLOBAL && isGlobalReceiver(inner.expression) - probe "globalThis.fetch(url);" - reports outbound-fetch
    branch:    "through an alias" at auditSource > isFetchExpression > if (ts.isIdentifier(inner)) return fetchAliases.has(inner.text); - probe "const f = fetch;\nf(url);" - reports outbound-fetch
    branch:    "an operator around the bare global" at auditSource > isFetchExpression > if (operatorOperandMatching(inner, isFetchExpression) !== undefined) { - probe "const f = fetch ?? x;\nf(url);" - reports outbound-fetch

* bareFetchCallee - the local NAME a call's callee spells when the walk knows that name to be the global fetch: the bare spelling, or an operator around the bare global read through the shared descent. Deliberately NARROWER than isFetchExpression, which also answers for a fetch member of a global receiver - a spelling the member rule already reports from the node it visits in its own right, so routing this rule through that function would report it TWICE
    read off:  auditSource > const bareFetchCallee = (node: ts.Expression): string | undefined => {
    probe:     "fetch(url);"
    reports:   outbound-fetch
    counter:   "cache.fetch(url);"
    reports:   [] - nothing
    branch:    "the bare spelling" at auditSource > bareFetchCallee > return fetchAliases.has(inner.text) ? inner.text : undefined; - probe "fetch(url);" - reports outbound-fetch
    branch:    "an operator around the bare global" at auditSource > bareFetchCallee > const operand = operatorOperandMatching( - probe "(ok && fetch)(url);" - reports outbound-fetch

* isNavigatorReceiver - navigator reached bare, through a global receiver, or through a one-hop alias; RECEIVER-ANCHORED so a member named sendBeacon on an ordinary object stays quiet
    read off:  auditSource > const isNavigatorReceiver = (node: ts.Expression): boolean => {
    probe:     "globalThis.navigator.sendBeacon(u, d);"
    reports:   outbound-beacon
    counter:   "o.navigator.sendBeacon(u, d);"
    reports:   [] - nothing
    branch:    "through a global receiver" at auditSource > isNavigatorReceiver > memberName(inner) === NAVIGATOR && isGlobalReceiver(inner.expression) - probe "globalThis.navigator.sendBeacon(url);" - reports outbound-beacon
    branch:    "through a one-hop alias" at auditSource > isNavigatorReceiver > if (ts.isIdentifier(inner)) return navigatorAliases.has(inner.text); - probe "const n = navigator;\nn.sendBeacon(url);" - reports outbound-beacon

* globalNameOf - which global a spelling names - bare identifier, member of a global receiver, or a collected alias - so the violation detail names the aliased surface instead of leaving a reader to find the binding
    read off:  auditSource > const globalNameOf = (node: ts.Expression): string | undefined => {
    probe:     "const F = Function;\nnew F(src);"
    reports:   outbound-dynamic-code
    counter:   "const F = o.Function;\nnew F(src);"
    reports:   [] - nothing
    branch:    "a collected alias" at auditSource > globalNameOf > return globalAliases.get(name); - probe "const e = eval;\ne(src);" - reports outbound-dynamic-code

* dynamicCodeOf - eval and Function in call position, refused outright rather than analysed, because no AST gate can see inside a string
    read off:  auditSource > const dynamicCodeOf = (node: ts.Expression): string | undefined => {
    probe:     "eval(src);"
    reports:   outbound-dynamic-code
    counter:   "o.eval(src);"
    reports:   [] - nothing
    branch:    "refused outright rather than analysed" at auditSource > const dynamicCodeOf = (node: ts.Expression): string | undefined => { - probe "eval(src);" - reports outbound-dynamic-code

* outboundCtorOf - XMLHttpRequest, WebSocket and EventSource in construction position, bare or on a global receiver or through an alias
    read off:  auditSource > const outboundCtorOf = (node: ts.Expression): string | undefined => {
    probe:     "new XMLHttpRequest();"
    reports:   outbound-global-ctor
    counter:   "new Foo();"
    reports:   [] - nothing
    branch:    "in construction position" at auditSource > const outboundCtorOf = (node: ts.Expression): string | undefined => { - probe "new WebSocket(u);" - reports outbound-global-ctor
    branch:    "through an alias" at auditSource > outboundCtorOf > return global !== undefined && OUTBOUND_CONSTRUCTORS.has(global) - probe "const W = WebSocket;\nnew W(u);" - reports outbound-global-ctor

* aliasedGlobalOf - the three binding shapes an outbound global can be aliased through - a bare identifier, a member of a global receiver, and a destructure off one - anchored so a destructure off an ordinary object grows nothing
    read off:  auditSource > const aliasedGlobalOf = (init: ts.Expression): string | undefined => {
    probe:     "const { eval: ev } = globalThis;\nev(src);"
    reports:   outbound-dynamic-code
    counter:   "const { eval: ev } = o;\nev(src);"
    reports:   [] - nothing
    branch:    "a bare identifier" at auditSource > aliasedGlobalOf > return (DYNAMIC_CODE.has(name) || OUTBOUND_CONSTRUCTORS.has(name)) && - probe "const e = eval;\ne(src);" - reports outbound-dynamic-code
    branch:    "a member of a global receiver" at auditSource > aliasedGlobalOf > (DYNAMIC_CODE.has(member) || OUTBOUND_CONSTRUCTORS.has(member)) && - probe "const e = globalThis.eval;\ne(src);" - reports outbound-dynamic-code, outbound-dynamic-code
    branch:    "a destructure off one" at auditSource > collect > globalAliases.set(el.name.text, property); - probe "const { eval: ev } = globalThis;\nev(src);" - reports outbound-dynamic-code

* unwrap - strips parentheses, `as`/satisfies assertions, an angle-bracket type assertion, non-null assertions and a COMMA SEQUENCE down to its rightmost operand, so a wrapped receiver is still that receiver. CORRECTED 2026-08-24 (IN-29): the angle-bracket form was one of the five wrappers the code strips and the only one this clause did not name, which is the direction of MORE stripping rather than less - it is probeable in .ts source and the branch below is its probe
    read off:  module scope > function unwrap(node: ts.Expression): ts.Expression {
    probe:     "(0, sdk.net).connect(x);"
    reports:   outbound-net
    counter:   "(0, cache).send(req);"
    reports:   [] - nothing
    branch:    "parentheses" at module scope > unwrap > ts.isParenthesizedExpression(current) || - probe "(sdk.requests).send(req);" - reports outbound-send
    branch:    "non-null assertions" at module scope > unwrap > ts.isNonNullExpression(current) || - probe "sdk.requests!.send(req);" - reports outbound-send
    branch:    "a COMMA SEQUENCE" at module scope > unwrap > current.operatorToken.kind === ts.SyntaxKind.CommaToken - probe "(0, sdk.requests).send(req);" - reports outbound-send
    branch:    "an angle-bracket type assertion" at module scope > unwrap > ts.isTypeAssertionExpression(current) - probe "const g = <any>globalThis;\ng.fetch(url);" - reports outbound-fetch

* operatorReceiver - ONE descent for the four RECEIVER_OPERATORS (`? :`, `??`, `||`, `&&`) reached from receiverKind and keyReceiver and from NOWHERE ELSE: any operand naming a receiver makes the expression that receiver, else any unreadable operand makes it unreadable, else it is not a receiver
    read off:  module scope > const operatorReceiver = (
    probe:     "(sdk.requests ?? sdk.net).send(req);"
    reports:   outbound-send
    counter:   "(cache ?? client).send(req);"
    reports:   [] - nothing
    branch:    "any operand naming a receiver" at module scope > operatorReceiver > for (const kind of kinds) if (typeof kind === "string") return kind; - probe "(b ? sdk.requests : x).send(req);" - reports outbound-send
    branch:    "any unreadable operand" at module scope > operatorReceiver > if (kind === UNREADABLE_RECEIVER) return UNREADABLE_RECEIVER; - probe "const k = \"a\" + b;\n(c ? sdk[k] : x).send(req);" - reports outbound-unanalysable

* operatorOperandMatching - the one descent the global resolvers read an operator through: it answers which operand the caller's own resolver recognises, with either-side semantics, so an operator SELECTING a global surface IS that surface in call position and in initializer position alike. A third consumer of the operatorOperands statement rather than a sixth copy of the operand loop, and a nested operator resolves because each caller passes ITSELF
    read off:  module scope > function operatorOperandMatching(
    probe:     "(ok && globalThis).fetch(url);"
    reports:   outbound-fetch
    counter:   "(ok && cache).fetch(url);"
    reports:   [] - nothing
    branch:    "which operand the caller's own resolver recognises" at module scope > operatorOperandMatching > for (const operand of operands) if (matches(operand)) return operand; - probe "(ok && globalThis).fetch(url);" - reports outbound-fetch
    branch:    "a nested operator" at module scope > isGlobalReceiverIn > operatorOperandMatching(inner, (operand) => - probe "(ok && (b ? globalThis : self)).fetch(url);" - reports outbound-fetch

* operatorLiteralBinding - an operator-shaped INITIALIZER is read on every operand: at a declaration or an assignment, a conditional, ?? or || initializer binds a literal operand into constStrings, while an operand the walk WATCHES BEING ASSEMBLED makes the bound name an UNREADABLE key instead; a nested operator descends through operatorOperands - the SAME set operatorReceiver reads - so this is a second CONSUMER of that set and not a fourth copy of it
    read off:  module scope > function operatorLiteralBinding(
    probe:     "const k = b ? \"requests\" : \"net\";\nsdk[k].send(req);"
    reports:   outbound-send
    counter:   "const k = b ? \"harmless\" : \"other\";\nsdk[k].send(req);"
    reports:   [] - nothing
    branch:    "a declaration" at auditSource > collect > const operatorBinding = operatorLiteralBinding( - probe "const k = b ? \"requests\" : \"net\";\nsdk[k].send(req);" - reports outbound-send
    branch:    "an assignment" at auditSource > collect > const assignedOperator = operatorLiteralBinding( - probe "let k;\nk = b ? \"requests\" : \"net\";\nsdk[k].send(req);" - reports outbound-send
    branch:    "a literal operand" at module scope > operatorLiteralBinding > for (const literal of read(inner)) literals.add(literal); - probe "const k = b ?? \"requests\";\nsdk[k].send(req);" - reports outbound-send
    branch:    "an operand the walk WATCHES BEING ASSEMBLED" at module scope > operatorLiteralBinding > isAssembledKey(inner, numeric, poisoned) || - probe "const k = b ? \"req\" + \"uests\" : \"net\";\nsdk[k].send(req);" - reports outbound-unanalysable
    branch:    "a nested operator" at module scope > operatorLiteralBinding > const nested = operatorLiteralBinding( - probe "const k = b ? (c ? \"requests\" : \"x\") : \"y\";\nsdk[k].send(req);" - reports outbound-send

* isProvablyNumeric - a NARROWING resolver: a key provably numeric - a numeric literal, a collected numeric name, `+`/`-` over two numeric operands, or a member or call named in NUMERIC_MEMBERS - is an INDEX and is excluded before any receiver rule runs. The NUMERIC_MEMBERS half is a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed
    read off:  module scope > function isProvablyNumeric(
    probe:     "let i = 0;\nsdk[i + 1].send(req);"
    reports:   [] - nothing
    counter:   "const o = { max: \"requests\" };\nsdk[o.max + \"\"].send(req);"
    reports:   outbound-unanalysable
    branch:    "a numeric literal" at module scope > isProvablyNumeric > if (ts.isNumericLiteral(inner)) return true; - probe "sdk[0].send(req);" - reports [] - nothing
    branch:    "a collected numeric name" at module scope > isProvablyNumeric > return numeric.has(inner.text) && !poisoned.has(inner.text); - probe "const i = 0;\nsdk[i].send(req);" - reports [] - nothing
    branch:    "a member or call named in NUMERIC_MEMBERS" at module scope > isProvablyNumeric > return NUMERIC_MEMBERS.has(inner.name.text); - probe "sdk[xs.length].send(req);" - reports [] - nothing

* isAssembledKey - a key the walk WATCHES being built inline - concatenated, interpolated, or returned by a call that is not provably numeric - is UNREADABLE, a third state distinct from `not a receiver`
    read off:  module scope > function isAssembledKey(
    probe:     "sdk[\"req\" + \"uests\"].send(req);"
    reports:   outbound-unanalysable
    counter:   "sdk[\"requests\"].send(req);"
    reports:   outbound-send
    branch:    "concatenated" at module scope > isAssembledKey > inner.operatorToken.kind === ts.SyntaxKind.PlusToken - probe "sdk[\"req\" + \"uests\"].send(req);" - reports outbound-unanalysable
    branch:    "interpolated" at module scope > isAssembledKey > if (ts.isTemplateExpression(inner)) return true; - probe "sdk[`req${x}`].send(req);" - reports outbound-unanalysable
    branch:    "returned by a call" at module scope > isAssembledKey > return ts.isCallExpression(inner); - probe "sdk[name()].send(req);" - reports outbound-unanalysable

* isGlobalReceiverIn - whether an expression is one of the four global receivers or a collected one-hop alias of one; the depth question is answered by the alias entries above and NOT restated here (WR-30)
    read off:  module scope > function isGlobalReceiverIn(
    probe:     "globalThis[\"fet\" + \"ch\"](url);"
    reports:   outbound-unanalysable
    counter:   "o[\"fet\" + \"ch\"](url);"
    reports:   [] - nothing
    branch:    "one of the four global receivers" at module scope > isGlobalReceiverIn > return GLOBAL_RECEIVERS.has(inner.text) || aliases.has(inner.text); - probe "globalThis.fetch(url);" - reports outbound-fetch
    branch:    "a collected one-hop alias of one" at module scope > isGlobalReceiverIn > return GLOBAL_RECEIVERS.has(inner.text) || aliases.has(inner.text); - probe "const g = globalThis;\ng.fetch(url);" - reports outbound-fetch

* boundPropertyName - the property a binding element reads, including the RENAMED spelling `{ p: k }`, so a destructured assembly is bound to the local name rather than the source key
    read off:  module scope > function boundPropertyName(el: ts.BindingElement): string | undefined {
    probe:     "const { p: k } = { p: \"req\" + \"uests\" };\nsdk[k].send(req);"
    reports:   outbound-unanalysable
    counter:   "const { p: k } = { p: \"harmless\" };\nsdk[k].send(req);"
    reports:   [] - nothing
    branch:    "the RENAMED spelling" at module scope > boundPropertyName > const property = el.propertyName ?? el.name; - probe "const { p: k } = { p: \"req\" + \"uests\" };\nsdk[k].send(req);" - reports outbound-unanalysable

* reportReceiverMembers - the members a destructure off a POSITIVELY IDENTIFIED receiver binds, minus the read-only allowlist - defined once and reached from the flat spelling and from a nested pattern of an identified receiver, so `const { requests: { send } } = sdk` reports what its two halves already reported one at a time. RECEIVER-ANCHORED: an ordinary object destructured the same way binds nothing, which is the counter-probe. BOUNDED BY DEPTH AND BY PATTERN KIND, MEASURED 2026-08-25 (IN-33, wave 34): the composition descends ONE element and only into an object binding pattern, so a three-deep spelling reports NOTHING and an array binding pattern wrapping the same member reports NOTHING - both executed in that session and both rowed
    read off:  auditSource > const reportReceiverMembers = (
    probe:     "const { requests: { send } } = sdk;\nsend(req);"
    reports:   outbound-send
    counter:   "const { cache: { send } } = app;\nsend(req);"
    reports:   [] - nothing
    branch:    "the flat spelling" at auditSource > visit > reportReceiverMembers(node.name, kind); - probe "const { send } = sdk.requests;\nsend(req);" - reports outbound-send
    branch:    "a nested pattern of an identified receiver" at auditSource > visit > reportReceiverMembers(el.name, property); - probe "const { requests: { send } } = sdk;\nsend(req);" - reports outbound-send

* destructuredInitializer - the initializer a binding element resolves to in BOTH binding-pattern spellings - object property and array slot - so a declared assembly reached through a destructure is read (IN-26). CORRECTED 2026-08-24 (WR-37): what it reads is the ASSEMBLY a KEY is built from and nothing else. A RECEIVER bound through an array ELEMENT position reaches no branch here and is carried as its own measured silence below; a NESTED pattern reaches no branch here either and is closed at reportReceiverMembers instead, because that one is a COMPOSITION of two shapes already resolved rather than a widening
    read off:  module scope > function destructuredInitializer(
    probe:     "const [k] = [\"req\" + \"uests\"];\nsdk[k].send(req);"
    reports:   outbound-unanalysable
    counter:   "const [k] = [1];\nsdk[k].send(req);"
    reports:   [] - nothing
    branch:    "object property" at module scope > destructuredInitializer > if (ts.isObjectLiteralExpression(init)) { - probe "const { k } = { k: \"req\" + \"uests\" };\nsdk[k].send(req);" - reports outbound-unanalysable
    branch:    "array slot" at module scope > destructuredInitializer > if (ts.isArrayLiteralExpression(init)) { - probe "const [k] = [\"req\" + \"uests\"];\nsdk[k].send(req);" - reports outbound-unanalysable

MEASURED SILENCES - 26 entries.

* silence-two-hop-key - residual (a), KEY half: TWO HOPS of key is silent. constStrings and assembledNames read the INITIALIZER'S SHAPE and never the live set, so a key cannot be grown from a name already in a set and therefore cannot chain. ONE hop reports - that is the counter-probe
    read off:  auditSource > const constStrings = new Map<string, Set<string>>()
    probe:     "const a = \"requests\";\nconst b = a;\nsdk[b].send(req);"
    reports:   [] - nothing
    counter:   "const b = \"requests\";\nsdk[b].send(req);"
    reports:   outbound-send

* silence-function-boundary - residual (a), FUNCTION half: a receiver crossing a function boundary is silent. The walk builds no symbol table and does not follow a return value. The one-hop binding of the same receiver reports - that is the counter-probe
    read off:  auditSource > const receiverKind = (node: ts.Expression): ReceiverKind => {
    probe:     "function pick() { return sdk.requests; }\npick().send(req);"
    reports:   [] - nothing
    counter:   "const r = sdk.requests;\nr.send(req);"
    reports:   outbound-send

* silence-parameter-key - residual (b): a key the walk never saw BOUND - here a parameter - is not reported. Set by real-tree MEASUREMENT, not preference: reporting every unreduced key fired on compat.ts:141's ctx[root]. The same site with a bound literal reports
    read off:  auditSource > const keyReceiver = (key: ts.Expression): ReceiverKind => {
    probe:     "function at(root) { return sdk[root].send(req); }"
    reports:   [] - nothing
    counter:   "const root = \"requests\";\nsdk[root].send(req);"
    reports:   outbound-send

* silence-loop-binding-key - residual (b): a key bound by a for...of or for(;;) header is not reported. Measured on compat.ts's documented at() dotted-path walk. The same lookup with a bound literal reports
    read off:  auditSource > const keyReceiver = (key: ts.Expression): ReceiverKind => {
    probe:     "for (const key of path.split(\".\")) { sdk[key].send(req); }"
    reports:   [] - nothing
    counter:   "const key = \"requests\";\nsdk[key].send(req);"
    reports:   outbound-send

* silence-destructured-plain-literal-key - residual (b2), NAMED BY MEASUREMENT in wave 26: a DESTRUCTURED PLAIN LITERAL used as a key is silent, because constStrings reads only the identifier spelling of a declaration that assembledNames now reads three ways. The ASSEMBLED twin of the same destructure reports - that is the counter-probe, and it is the shape IN-26 closed
    read off:  auditSource > const constStrings = new Map<string, Set<string>>()
    probe:     "const { k } = { k: \"requests\" };\nsdk[k].send(req);"
    reports:   [] - nothing
    counter:   "const { k } = { k: \"req\" + \"uests\" };\nsdk[k].send(req);"
    reports:   outbound-unanalysable
    branch:    "a declaration" at auditSource > collect > if (ts.isStringLiteralLike(init)) { - probe "const k = \"requests\";\nsdk[k].send(req);" - reports outbound-send

* silence-destructured-operator-key - residual (b3), NAMED BY MEASUREMENT on 2026-08-24 (CR-13): a DESTRUCTURED OPERATOR literal used as a key is silent, because the operator-literal descent is wired at the two IDENTIFIER branches and not at either binding-pattern branch. The IDENTIFIER spelling of the same operator initializer reports - that is the counter-probe
    read off:  auditSource > const collect = (node: ts.Node): void => {
    probe:     "const { k } = { k: b ? \"requests\" : \"net\" };\nsdk[k].send(req);"
    reports:   [] - nothing
    counter:   "const k = b ? \"requests\" : \"net\";\nsdk[k].send(req);"
    reports:   outbound-send

* silence-cross-file-key - residual (b4), NAMED BY MEASUREMENT on 2026-08-24 (CR-13): a key bound in ANOTHER FILE is silent, because auditSource reads one file's text and builds no module graph. The same name bound in THIS file reports - that is the counter-probe
    read off:  auditSource > export function auditSource(file: string, source: string): Violation[] {
    probe:     "import { k } from \"./other\";\nsdk[k].send(req);"
    reports:   [] - nothing
    counter:   "const k = \"requests\";\nsdk[k].send(req);"
    reports:   outbound-send

* silence-logical-assignment-member-target - residual (b6), NAMED BY MEASUREMENT on 2026-08-24 (CR-12): a logical-assignment binding whose TARGET is a MEMBER rather than a bare name is silent, because collect's ASSIGNING_OPERATORS branch requires an IDENTIFIER on the left. The bare-name spelling of the same operator reports - that is the counter-probe
    read off:  auditSource > const collect = (node: ts.Node): void => {
    probe:     "o.r ??= sdk.requests;\no.r.send(req);"
    reports:   [] - nothing
    counter:   "let r;\nr ??= sdk.requests;\nr.send(req);"
    reports:   outbound-send

* silence-inverted-binding-order - what actually bounds an ALIAS chain, corrected in wave 23: not where a name is READ but the DECLARATION ORDER of the bindings relative to each other. collect() finishes before visit() begins, so a use may sit above every declaration; invert one link and the root is not yet in the live set. The dependency-ordered spelling reports
    read off:  auditSource > const collect = (node: ts.Node): void => {
    probe:     "const b = a;\nconst a = fetch;\nb(url);"
    reports:   [] - nothing
    counter:   "const a = fetch;\nconst b = a;\nb(url);"
    reports:   outbound-fetch

* silence-array-slot-receiver - a RECEIVER bound through an array ELEMENT position is silent. The binding-pattern branch beside it reads only an assembled KEY and grows no receiver, so neither `const [r] = [sdk.requests]` nor `const a = [sdk.requests]; a[0]` binds anything. The one-hop binding of the same receiver REPORTS - that is the counter-probe. Residual (b) is written about KEYS ONLY and does not cover this
    read off:  auditSource > collect > } else if (ts.isArrayBindingPattern(node.name)) {
    probe:     "const [r] = [sdk.requests];\nr.send(req);"
    reports:   [] - nothing
    counter:   "const r = sdk.requests;\nr.send(req);"
    reports:   outbound-send

* silence-object-literal-property-receiver - a RECEIVER reached as a named member of an object LITERAL is silent: `const o = { r: sdk.requests }; o.r.send(req)` binds nothing, because the collector reads an initializer that IS a receiver and never one that CONTAINS one. The one-hop binding REPORTS - that is the counter-probe. Residual (b) is written about KEYS ONLY and does not cover this
    read off:  auditSource > const receiverAliases = new Map<string, string>()
    probe:     "const o = { r: sdk.requests };\no.r.send(req);"
    reports:   [] - nothing
    counter:   "const r = sdk.requests;\nr.send(req);"
    reports:   outbound-send

* silence-class-field-receiver - a RECEIVER held in a CLASS FIELD is silent: `class C { r = sdk.requests; m() { this.r.send(req); } }` binds nothing, because the collector reads variable declarations and assignments and not property declarations. The same call written directly inside the method REPORTS - that is the counter-probe. Residual (b) is written about KEYS ONLY and does not cover this
    read off:  auditSource > const collect = (node: ts.Node): void => {
    probe:     "class C { r = sdk.requests; m() { this.r.send(req); } }"
    reports:   [] - nothing
    counter:   "class C { m() { sdk.requests.send(req); } }"
    reports:   outbound-send

* silence-parameter-default-receiver - a RECEIVER supplied as a PARAMETER DEFAULT is silent: `function f(r = sdk.requests) { r.send(req); }` binds nothing, because a parameter is never bound in the collect pass at all. The same receiver bound outside the function REPORTS - that is the counter-probe. Residual (b) names a parameter for KEYS ONLY, so a reader checking it there will not find this RECEIVER twin
    read off:  auditSource > const receiverAliases = new Map<string, string>()
    probe:     "function f(r = sdk.requests) { r.send(req); }"
    reports:   [] - nothing
    counter:   "const r = sdk.requests;\nfunction f() { r.send(req); }"
    reports:   outbound-send

* silence-for-of-binding-receiver - a RECEIVER bound by a `for…of` head is silent: `for (const r of [sdk.requests]) { r.send(req); }` binds nothing, because the loop binding has no initializer the collector can read - the value comes from the iterable. The same receiver bound outside the loop REPORTS - that is the counter-probe. Residual (b) names a loop binding for KEYS ONLY, so a reader checking it there will not find this RECEIVER twin
    read off:  auditSource > const receiverAliases = new Map<string, string>()
    probe:     "for (const r of [sdk.requests]) { r.send(req); }"
    reports:   [] - nothing
    counter:   "const r = sdk.requests;\nfor (const x of xs) { r.send(req); }"
    reports:   outbound-send

* silence-tagged-template-key - a KEY built by a TAGGED TEMPLATE is silent: `const k = String.raw`requests`` binds nothing, because the string readers test ts.isStringLiteralLike and a tagged template is a call on a template rather than a literal. The plain literal binding REPORTS - that is the counter-probe. CONTRIVED and unreachable in this codebase; recorded rather than closed
    read off:  auditSource > function literalsOf(node: ts.Node | undefined): ReadonlySet<string> {
    probe:     "const k = String.raw`requests`;\nsdk[k].send(req);"
    reports:   [] - nothing
    counter:   "const k = \"requests\";\nsdk[k].send(req);"
    reports:   outbound-send

* silence-doubled-global-receiver - a GLOBAL RECEIVER reached through ITSELF is silent: `globalThis.globalThis.fetch(url)` reports nothing, because the inner member name is not one of the surfaces any rule tests and the receiver rules anchor on a member NAME rather than on the receiver alone. The single-hop spelling REPORTS - that is the counter-probe. CONTRIVED and unreachable in this codebase; recorded rather than closed
    read off:  auditSource > const isGlobalReceiver = (node: ts.Expression): boolean =>
    probe:     "globalThis.globalThis.fetch(url);"
    reports:   [] - nothing
    counter:   "globalThis.fetch(url);"
    reports:   outbound-fetch

* silence-global-fetch-receiver-position - NARROWED BY MEASUREMENT 2026-08-25 (wave 34): the readable spellings this row was written for - `fetch.call(null, url)`, `fetch.apply(...)`, `fetch.bind(...)` - now report through the receiver-position arm this wave added, so the row is cut back to the mechanism that SURVIVES rather than deleted. What survives: an UNREADABLE computed member of the bare global fetch is silent, because the catch-all that reports an unreadable member is guarded on `isGlobalReceiver` and the bare global fetch is not one of the four receivers that guard accepts. The identical unreadable-member shape on a receiver the guard DOES accept reports outbound-unanalysable - that is the counter-probe, and the asymmetry between the two is the whole content of the row. `could not read` still does not mean `clean` here. DISCLOSED, not ended
    read off:  auditSource > (isGlobalReceiver(node.expression) ||
    probe:     "fetch[\"ca\" + \"ll\"](null, url);"
    reports:   [] - nothing
    counter:   "globalThis[\"fet\" + \"ch\"](url);"
    reports:   outbound-unanalysable

* silence-fetch-alias-receiver-position - NARROWED BY MEASUREMENT 2026-08-25 (wave 34): `const f = fetch; f.call(null, url)` was silent while `f(url)` on the next line reported - one binding, one position over, two answers - and the receiver-position arm this wave added closed that particular spelling. What SURVIVES is the unreadable half: an unreadable computed member of an identified fetch alias is silent, because the arm that was added requires a member name it can read and the unreadable catch-all beyond it accepts only the four global receivers. The SAME alias with a readable member REPORTS - that is the counter-probe, so the two differ by readability alone. DISCLOSED, not ended
    read off:  auditSource > (isGlobalReceiver(node.expression) ||
    probe:     "const f = fetch;\nf[\"ca\" + \"ll\"](null, url);"
    reports:   [] - nothing
    counter:   "const f = fetch;\nf.call(null, url);"
    reports:   outbound-fetch

* silence-bare-global-argument-position - a bare global handed to a call as an ARGUMENT is silent: `Reflect.apply(fetch, null, [url])` reports nothing, because an identifier with no member written beside it is interrogated only where a CALLEE is expected and this shape writes down no member of it for the member arm to read. The member-qualified twin of the identical shape REPORTS - that is the counter-probe - and the difference between the two is that one NAMES a member and the other does not. A mechanism distinct from receiver position, rowed separately for that reason. DISCLOSED, not ended
    read off:  auditSource > const bareFetchCallee = (node: ts.Expression): string | undefined => {
    probe:     "Reflect.apply(fetch, null, [url]);"
    reports:   [] - nothing
    counter:   "Reflect.apply(sdk.requests.send, sdk.requests, [req]);"
    reports:   outbound-send

* silence-dynamic-code-global-receiver-position - NARROWED BY MEASUREMENT 2026-08-25 (wave 34): `eval.call(null, src)` and `Function.call(null, src)` were silent and now report through the dynamic-code receiver arm this wave added - a SECOND arm and a second decision, because this family resolves through `dynamicCodeOf` rather than through `isFetchExpression`. What SURVIVES is the unreadable half: an unreadable computed member of a dynamic-code global is silent, because the arm requires a member name it can read and the unreadable catch-all beyond it accepts only the four global receivers and `navigator`. The SAME receiver with a readable member REPORTS - that is the counter-probe, so the two differ by readability alone. DISCLOSED, not ended
    read off:  auditSource > dynamicCodeOf(node.expression) !== undefined
    probe:     "eval[\"ca\" + \"ll\"](null, src);"
    reports:   [] - nothing
    counter:   "eval.call(null, src);"
    reports:   outbound-dynamic-code

* silence-outbound-ctor-receiver-position - an OUTBOUND CONSTRUCTOR global in RECEIVER position is silent: `WebSocket.call(null, u)` reports nothing, because the constructor arm reads OUTBOUND_CONSTRUCTORS against the MEMBER and is guarded on the receiver being reached THROUGH a global, while `outboundCtorOf` is consulted where a `new` target or a callee is expected rather than on a receiver. The member-qualified spelling of the identical shape REPORTS - that is the counter-probe. MEASURED after the two arms this wave added, neither of which reaches this family. DISCLOSED, not ended
    read off:  auditSource > OUTBOUND_CONSTRUCTORS.has(member) &&
    probe:     "WebSocket.call(null, u);"
    reports:   [] - nothing
    counter:   "globalThis.WebSocket.call(null, u);"
    reports:   outbound-global-ctor

* silence-aliased-module-loader-specifier - a MODULE LOADER reached by way of a local binding is silent in BOTH directions: `const r = require; r("caido:http")` reports nothing, and so does `const r = require; r(s)` where the specifier will not reduce - so the `could not read does not mean clean` half of that rule is unreachable once the loader is bound to a local name, and an unreadable specifier behind such a name is treated as clean. The DIRECT spelling reports in both directions - that is the counter-probe. DISPOSITION AND ITS REASON, so this is a decision rather than an omission: NOT widened, because the surface it protects is bounded from the other end by a check on the SHIPPED BUNDLE, which is asserted at exactly one import specifier and which a spec file never enters; growing the resolver machinery here would add reach the bundle check already has. Recorded so a later round finds a decision instead of a blank. DISCLOSED, not ended
    read off:  auditSource > } else if (specifier === undefined) {
    probe:     "const r = require;\nr(s);"
    reports:   [] - nothing
    counter:   "require(s);"
    reports:   outbound-unanalysable

* silence-tagged-template-fetch-call - the global fetch INVOKED AS A TAGGED TEMPLATE is silent: `fetch`, applied to a template rather than to an argument list, reports nothing, because the rule that answers for the bare global is anchored on a call expression and a tagged template is not one, so neither that rule nor the resolver it reads is reached at all. The ordinary call spelling REPORTS - that is the counter-probe. NOT THE SAME MECHANISM as `silence-tagged-template-key`, which is named here so the redirection is explicit: that row is about a tagged template BUILDING A LOOKUP KEY and the strings collector declining to read it, and it says nothing about this shape. CONTRIVED, and rowed rather than branched. DISCLOSED, not ended
    read off:  auditSource > if (ts.isCallExpression(node)) {
    probe:     "fetch`https://example.test/${p}`;"
    reports:   [] - nothing
    counter:   "fetch(\"https://example.test\");"
    reports:   outbound-fetch

* silence-destructure-deeper-than-one - a destructure NESTED MORE THAN ONE ELEMENT DEEP is silent: `const { a: { requests: { send } } } = wrap; send(req)` reports nothing, because the composition descends one element and asks its receiver question there, so a third level is never reached and the outer object is not an identified receiver anyway. The ONE-deep spelling off an identified receiver REPORTS - that is the counter-probe. The bound is DEPTH, stated in `reportReceiverMembers`' own clause since this date rather than left implicit in a closure claim. DISCLOSED, not ended
    read off:  auditSource > reportReceiverMembers(el.name, property);
    probe:     "const { a: { requests: { send } } } = wrap;\nsend(req);"
    reports:   [] - nothing
    counter:   "const { requests: { send } } = sdk;\nsend(req);"
    reports:   outbound-send

* silence-destructure-array-nested - a destructure whose nesting is an ARRAY BINDING PATTERN is silent: `const [{ send }] = [sdk.requests]; send(req)` reports nothing, and so does `const { requests: [first] } = sdk; first(req)`, because the composition looks at an object binding pattern and an array one is a different node kind. The object-nested spelling off the same receiver REPORTS - that is the counter-probe. The bound is PATTERN KIND, distinct from the depth bound its neighbour row measures, which is why the two are separate rows. DISCLOSED, not ended
    read off:  auditSource > reportReceiverMembers(el.name, property);
    probe:     "const [{ send }] = [sdk.requests];\nsend(req);"
    reports:   [] - nothing
    counter:   "const { requests: { send } } = sdk;\nsend(req);"
    reports:   outbound-send

* silence-unreadable-member-of-navigator - NARROWED BY MEASUREMENT 2026-08-25 (wave 34), AND THE MEASUREMENT CONTRADICTED THE PREDICTION. This row was written for the five spellings of an unreadable computed member on a positively identified `navigator` receiver, ALL silent; the arm this wave widened now reports every one of them, INCLUDING the parameter-key spelling the plan predicted would survive. It does not survive: on a receiver this arm accepts, an unreadable member reports whatever the reason the key would not reduce, so the reason the key is unbound never comes up. What DOES survive is the RESOLUTION boundary rather than the readability one: an unreadable member of a `navigator` handed across a FUNCTION BOUNDARY is silent, because the parameter is never bound to the receiver and no resolver answers for it - the same limit the `isFetchExpression` entry of QUANTIFIED_CLAUSES already bounds for global receivers, met here on the navigator family. The identical shape written one function boundary nearer REPORTS - that is the counter-probe. DISCLOSED, not ended
    read off:  auditSource > const isNavigatorReceiver = (node: ts.Expression): boolean => {
    probe:     "function h(n) { const m = \"send\" + \"Beacon\"; return n[m](u, d); }\nh(navigator);"
    reports:   [] - nothing
    counter:   "const m = \"send\" + \"Beacon\";\nnavigator[m](u, d);"
    reports:   outbound-unanalysable
END DERIVED RESIDUAL
*/

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * THE SOURCE ROOTS THE PLUGIN SHIPS. Both of them, and the second one is a FACT
 * rather than a preference.
 *
 * `packages/engine/src` is bundled into `packages/backend/dist` — seven modules —
 * and production backend code imports it by name: `index.ts:41-42`
 * (`@defminer/engine/queue`, `/thresholds`) and `ingest/consumer.ts:38-46`
 * (`/digest`, `/pipeline`, `/yield`). `packages/engine/src/boundary.spec.ts`
 * guards that package, but it checks IMPORTS — that the engine stays SDK-free for
 * DET-03 — so a `globalThis.fetch(url)` in `pipeline.ts` needed no import and was
 * invisible to EVERY gate in this repository at once: to boundary.spec.ts (no
 * import), to check-bundle-imports.mjs (imports only), and to this one (wrong
 * root). `pipeline.ts` is the detector walk, the module most likely to grow a
 * "just fetch the sourcemap" line, and "no speculative retrieval of any kind" is
 * CORE-11's literal wording.
 *
 * Exported so a reader can enumerate the scanned tree without re-deriving it.
 */
export const SOURCE_ROOTS: readonly string[] = Object.freeze([
  "packages/backend/src",
  "packages/engine/src",
]);

const BACKEND_SRC = SOURCE_ROOTS[0];

// The surfaces, as tokens the walk matches on, so the rule table below and the
// walk cannot drift apart.
const SEND_RECEIVER = "requests";
const SEND_METHOD = "send";
const NET_RECEIVER = "net";
const FETCH_GLOBAL = "fetch";
const HTTP_SPECIFIER = "caido:http";

const RECEIVERS = new Set<string>([SEND_RECEIVER, NET_RECEIVER]);

/**
 * The methods of a `requests` receiver that are NOT outbound.
 *
 * Derived from what this backend actually calls plus the read-only surfaces
 * COVERAGE.md marks OPT-OUT: `sdk.requests.get` (`ingest/consumer.ts:344`, the
 * CORE-05 reload the consumer cannot work without), `sdk.requests.inScope`
 * (`hooks/admit.ts:197`), and `query`/`matches` (COVERAGE.md rows 7 and 8, both
 * OPT-OUT-but-read-only, both deferred to Phase 6).
 *
 * EVERY ONE OF THESE READS EXISTING TRAFFIC AND GENERATES NONE. That is the whole
 * membership test, and it is why the rule can be "any member NOT on this list"
 * rather than "these named methods": a `sendRaw` or a `replay` added by a future
 * SDK fails here without anybody having to enumerate it first.
 */
const REQUESTS_READ_ONLY = new Set<string>([
  "get",
  "query",
  "inScope",
  "matches",
]);

/**
 * The receivers a member named `fetch` is the GLOBAL fetch on.
 *
 * Restricted to these four rather than matching any receiver, and the restriction
 * is load-bearing: `cache.fetch(url)` and `client.fetch(u)` are methods of
 * ordinary objects that reach nothing outside the process, and a gate that broke
 * them would be reverted within the hour. Both are asserted as must-stay-quiet
 * fixtures below.
 */
const GLOBAL_RECEIVERS = new Set<string>([
  "globalThis",
  "self",
  "global",
  "window",
]);

/**
 * Outbound globals reached by CONSTRUCTION rather than by a call on a receiver.
 *
 * Phase 0's capability probe suggests none of these exists in Caido's QuickJS.
 * That is an argument for the rule being CHEAP, not for omitting it: a surface
 * excluded because it probably does not exist is a surface nobody checked, the
 * cost here is three identifiers, and CORE-11's own words are "of any kind".
 */
const OUTBOUND_CONSTRUCTORS = new Set<string>([
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
]);

/**
 * The BEACON surface, and the receiver it lives on.
 *
 * Added 2026-08-22. `navigator.sendBeacon(url, data)` is an outbound POST that
 * needs no import, no SDK call and no constructor, and it is the outbound global
 * MOST likely to exist in a host that has none of the three above — it is part of
 * the same "page teardown telemetry" cluster a browser-shaped runtime ships first.
 * It was quiet AND undisclosed until this date, which is the worse of the two
 * failure modes: the header enumerated what the gate covered and this was not on
 * the list, so a reader had no way to know it was missing.
 *
 * The rule is RECEIVER-ANCHORED, not member-name-only, for the same reason
 * `GLOBAL_RECEIVERS` restricts `fetch`: an ordinary object may perfectly well
 * define a method called `sendBeacon`, and a gate that broke it would be reverted
 * within the hour. What is flagged is a `sendBeacon` member of `navigator`, of
 * `navigator` reached through any of the four global receivers, or of a one-hop
 * alias of either — asserted both ways below.
 *
 * IN-32, 2026-08-25, wave 34 — WHAT `asserted both ways` REACHES, MEASURED. The
 * two directions are asserted for keys written PLAINLY. A key wrapped in
 * computed-property brackets is a different matter even when what is inside the
 * brackets is an ordinary string literal: `boundPropertyName` tests the property
 * for an identifier or a string literal and a ComputedPropertyName is neither, so
 * `const { ["sendBeacon"]: b } = navigator` takes the UNREADABLE arm and reports
 * outbound-unanalysable rather than outbound-beacon. That errs in the SAFE
 * direction — the shape is reported, loudly — and the cost is a debugging reader
 * being handed the wrong rule identifier for a key the walk could in fact have
 * read. Measured beside it: the plain spelling of the same destructure reports
 * outbound-beacon. The claim above is bounded here rather than widened.
 */
const NAVIGATOR = "navigator";
const BEACON_METHOD = "sendBeacon";

/**
 * DYNAMIC CODE CONSTRUCTION, refused rather than analysed.
 *
 * Added 2026-08-22. `eval("sdk.requests.send(r)")` and
 * `new Function("r", "return fetch(r)")` reached every surface this file forbids
 * and reported CLEAN, because no AST gate can see inside a string literal — and
 * that is precisely the argument for refusing the construct instead of trying to
 * analyse it. It is the same two-identifier posture `OUTBOUND_CONSTRUCTORS` takes
 * one paragraph up: the cost is two names, and a surface excluded because it is
 * unlikely is a surface nobody checked.
 *
 * Both spellings of each are covered: the bare call (`eval(s)`, `Function(a, b)`),
 * the construction (`new Function(...)`), and the member on a global receiver
 * (`globalThis.eval`, `new globalThis.Function(...)`) — including a bare member
 * REFERENCE with no call, the same way the receiver rules already catch
 * `const s = sdk.requests.send`.
 *
 * THE PARAGRAPH ABOVE WAS FALSE WHEN IT WAS WRITTEN, AND THE CORRECTION MATTERS
 * AS MUCH AS THE WIDENING (WR-23, 2026-08-24). It told a reader this rule reached
 * "the same way the receiver rules already catch `const s = sdk.requests.send`".
 * It did not. `fetchAliases` was seeded with the global and grown from three
 * spellings; `navigatorAliases` mirrored it exactly; this rule was written
 * BETWEEN the two and given neither, so it reached one spelling less far than
 * either of its neighbours while citing them as its model:
 *
 *     eval(s)                                        ["outbound-dynamic-code"]
 *     const e = eval; e(s)                           []
 *     const { eval: ev } = globalThis as any; ev(s)  []
 *     const F = Function; new F("a", s)              []
 *     const W = WebSocket; new W(url)                []      (the same gap on
 *                                                             OUTBOUND_CONSTRUCTORS,
 *                                                             two lines away)
 *
 * ALL FIVE NOW REPORT, through `globalAliases` and the single `globalNameOf`
 * lookup both the call rule and the `new` rule consult. The sentence above is
 * therefore true as of that date, and it is left standing WITH this correction
 * beneath it rather than quietly rewritten, because what a reader was told and
 * when is the record.
 *
 * THE NEGATIVE SIDE IS PART OF THE RULE, NOT AN AFTERTHOUGHT. The member and
 * destructure spellings only grow an alias off one of the four
 * `GLOBAL_RECEIVERS`, so an ordinary object that defines a method named `eval`
 * grows nothing and stays quiet — the same receiver anchoring the beacon rule
 * uses, for the same reason. The bare-identifier test remains a NAME test and is
 * narrowed by exactly one provable fact: a module that declares
 * `function Function(...)` or `class WebSocket {}` at TOP LEVEL has bound that
 * name for the whole module, so the bare call in that file provably is not the
 * global (`shadowedGlobals`). A nested declaration proves nothing about module
 * scope in a scope-blind walk and still reports, which is the fail-CLOSED
 * direction and is deliberate.
 */
const DYNAMIC_CODE = new Set<string>(["eval", "Function"]);

type OutboundRule = Readonly<{ rule: string; surface: string; why: string }>;

/**
 * The rule set as DATA a reader can enumerate rather than logic they must trace,
 * KEYED BY RULE ID.
 *
 * Keyed, not a bare array, because `add()` below used to look a rule up in an
 * array and throw `no such rule` if it was absent — a branch every call site made
 * unreachable and no test could execute (IN-12). Indexing this record makes the
 * lookup TOTAL BY CONSTRUCTION: `RuleId` is `keyof typeof RULES`, so a typo is a
 * compile error and there is no failure branch left to leave untested.
 *
 * A seventh outbound surface discovered in a later phase is one entry here plus
 * one branch in the walk, and the `why` travels with it into the failure message
 * — which is the difference between a gate that explains itself at 2am and a bare
 * rule id.
 */
const RULES = Object.freeze({
  "outbound-send": Object.freeze({
    rule: "outbound-send",
    surface: `sdk.${SEND_RECEIVER}.${SEND_METHOD}, or any other non-read-only member of a ${SEND_RECEIVER} receiver`,
    why:
      "plugin-originated traffic does not come back through onInterceptResponse " +
      '(SURFACES_FIRING_INTERCEPT = "proxy"), so a leak would move no counter in this ' +
      "plugin and leave no trace in its own telemetry; and caido/caido#2211, filed " +
      "against 0.57.1, means cumulative sends can abort caido-cli with the operator's " +
      "project data. Active retrieval is Phase 8 (ACTIVE-*) and it arrives with the send " +
      "counter and the write-ahead journal Phase 0 built for it — not by someone adding a call. " +
      "CORE-11 is the requirement whose text states this prohibition.",
  }),
  "outbound-net": Object.freeze({
    rule: "outbound-net",
    surface: `sdk.${NET_RECEIVER}.*`,
    why:
      "a raw outbound connection is outbound traffic by any definition and is invisible " +
      "to this plugin's own counters for the same measured reason. COVERAGE.md row 27 " +
      "places it under the same CORE-11 prohibition as sdk.requests.send.",
  }),
  "outbound-fetch": Object.freeze({
    rule: "outbound-fetch",
    surface: `the global ${FETCH_GLOBAL}(), by any receiver or alias`,
    why:
      "the global fetch reaches any host, including one that is not the target at all. " +
      "The operator authorised a PASSIVE observer; this is a boundary they were told " +
      "does not exist. COVERAGE.md row 38 places it under the same CORE-11 prohibition. " +
      "telemetry.ts already reaches globalThis for `performance`, so the codebase's own " +
      "idiom for reaching a global is the spelling this rule exists to see.",
  }),
  "outbound-import": Object.freeze({
    rule: "outbound-import",
    surface: `an import of "${HTTP_SPECIFIER}"`,
    why:
      "caido:http loads successfully inside Caido, and the DIST-05 bundle allowlist " +
      "admits it because Phase 0 MEASURED it loadable — a different question from " +
      "whether it is permitted, and the reason CORE-11 needs a SOURCE gate. Phase 0 also " +
      "measured that traffic it issues delivers nothing back to onInterceptResponse.",
  }),
  "outbound-global-ctor": Object.freeze({
    rule: "outbound-global-ctor",
    surface:
      "an outbound global constructor (XMLHttpRequest, WebSocket, EventSource)",
    why:
      "CORE-11 forbids outbound traffic OF ANY KIND, and each of these opens a channel to " +
      "any host with no import and no SDK call, so neither the bundle allowlist nor the " +
      "receiver rules above can see one. Phase 0's capability probe suggests they are " +
      "absent from Caido's QuickJS: that makes the rule cheap, not unnecessary — a surface " +
      "excluded because it probably does not exist is a surface nobody checked.",
  }),
  "outbound-beacon": Object.freeze({
    rule: "outbound-beacon",
    surface: `${NAVIGATOR}.${BEACON_METHOD}, by any receiver or one-hop alias`,
    why:
      "sendBeacon is an outbound POST that needs no import, no SDK call and no constructor, " +
      "and it is the outbound global most likely to EXIST in a host that has none of " +
      "XMLHttpRequest, WebSocket or EventSource. CORE-11 forbids outbound traffic of any kind, " +
      "and this one is fire-and-forget by design — it returns a boolean and delivers no " +
      "response, so a leak through it would leave nothing behind to notice, not even a " +
      "rejected promise. It was quiet AND undisclosed until 2026-08-22.",
  }),
  "outbound-dynamic-code": Object.freeze({
    rule: "outbound-dynamic-code",
    surface: "dynamic code construction (eval, new Function)",
    why:
      'no AST gate can see inside a string, so eval("sdk.requests.send(r)") defeats every ' +
      "other rule in this file at once while reporting clean — the one shape that makes a " +
      "passing gate meaningless rather than merely incomplete. The answer is to refuse the " +
      "construct rather than to analyse it: this plugin has no legitimate use for either, " +
      'the cost is two identifiers, and CORE-11\'s words are "of any kind".',
  }),
  "outbound-unanalysable": Object.freeze({
    rule: "outbound-unanalysable",
    surface: "an outbound surface this walk cannot rule out",
    why:
      "this is the argument, not the rule. A computed key on a POSITIVELY IDENTIFIED " +
      "outbound receiver, a computed key that SELECTS the receiver itself, a computed " +
      "member of an identified global receiver, and a module specifier that will not " +
      "reduce to a literal, are " +
      "the one shape that defeats an AST gate SILENTLY — the walk returns nothing and the " +
      "file reports clean, which is indistinguishable from a pass. And an import() in a " +
      "plugin whose entire shipped import set is one specifier, `crypto`, is worth failing " +
      "on by itself: check-bundle-imports.mjs ALLOWLISTS caido:http, so a dynamic import " +
      "through a variable was invisible to both gates at once — the single combination the " +
      "two-gate design exists to rule out. Resolve the value, or delete the indirection.",
  }),
});

type RuleId = keyof typeof RULES;

/**
 * The same rule set as an ARRAY, for readers and for the enumeration assertion.
 * Derived from `RULES` so the two cannot disagree about what the gate enforces.
 */
export const FORBIDDEN_OUTBOUND: readonly OutboundRule[] = Object.freeze(
  Object.values(RULES),
);

type Violation = { file: string; rule: string; detail: string };

/**
 * Every non-spec module the plugin SHIPS, under either source root, at any depth.
 *
 * Not "the backend directory": `sdk.requests.send` needs no import and
 * `globalThis.fetch` needs no import either, so the surface an outbound call
 * could appear on is every module that reaches the bundle — which is both roots.
 * `hooks/`, `ingest/` and the engine's `pipeline.ts` are where a regression would
 * most plausibly land.
 *
 * ONE PATH CONVENTION, POSIX, END TO END (IN-09). Paths are built with
 * `posix.join` and compared with `/`, rather than built with the platform
 * separator and then compared against a hard-coded `/`. The old mix worked on
 * this host and would have made every by-name assertion below silently stop
 * matching on a non-POSIX one — a gate that quietly matches nothing is the same
 * defect as a gate that quietly scans nothing. Adding a second root is exactly
 * when that stops being theoretical. Node accepts `/` on every platform it
 * supports, so building with it costs nothing.
 */
function shippedFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = posix.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".spec.ts")
      ) {
        out.push(full);
      }
    }
  };
  for (const root of SOURCE_ROOTS) walk(root);
  return out.sort();
}

/** Does this root have a subdirectory to descend INTO? */
function rootHasSubdirectory(root: string): boolean {
  return readdirSync(root, { withFileTypes: true }).some((e) =>
    e.isDirectory(),
  );
}

/**
 * Strip the wrappers that hide an expression from a syntactic match.
 *
 * `(globalThis as any).fetch(url)` is an `AsExpression` where a bare identifier
 * was expected, and that single wrapper is why the round-1 gate reported it
 * clean. Parens, `as`, `satisfies`, `!` and the legacy `<T>x` assertion all mean
 * "the same value, differently typed", so all five unwrap.
 *
 * A COMMA SEQUENCE UNWRAPS TOO, ADDED 2026-08-24 (CR-08), AND THE PLACEMENT IS A
 * DECISION WITH A BLAST RADIUS — RECORDED HERE RATHER THAN LEFT TO BE FOUND.
 * `(0, "requests")` IS `"requests"`: a comma expression's value is its rightmost
 * operand, universally, at every call site. That is the same claim the five
 * wrappers above make — "the same value, differently expressed" — so it belongs
 * here and not in one caller.
 *
 * BLAST RADIUS, STATED EXPLICITLY BECAUSE IT IS WIDE, AND MEASURED RATHER THAN
 * ASSUMED. `unwrap` is called from `isProvablyNumeric`, `isAssembledKey`,
 * `receiverKind`, `literalOf`, `isFetchExpression`, `isNavigatorReceiver` and
 * `isGlobalReceiver` — SEVEN callers, all of which change at once. That is the
 * point rather than a cost: the alternative, resolving commas only in key
 * position, would leave `sdk[(0, "requests")]` reported while `(0, sdk.requests)
 * .send(req)` stayed silent, which is a NEW asymmetry of exactly the kind CR-08
 * was raised to remove.
 *
 * WHAT THE WIDENING ACTUALLY CHANGED, executed with the block removed and
 * restored rather than predicted — three shapes moved from `[]` to reported:
 * `(0, sdk.requests).send(req)`, `const r = (0, sdk.requests); r.send(req)`, and
 * `(0, eval)(s)`. `(0, globalThis.fetch)(url)` already reported by another path
 * and is NOT a gain of this change; it is named here so nobody credits it to one.
 *
 * REAL-TREE COST: none measured. 23 files over both `SOURCE_ROOTS`, zero
 * violations, run after the block landed.
 *
 * A NOTE ON WRITING FIXTURES FOR THIS. `await (X).send(req)` does NOT parse as an
 * await of a parenthesised expression — TS reads `await(X)` as a CALL and `.send`
 * as a member of its result, so such a fixture is green for a reason that has
 * nothing to do with any rule here. Comma fixtures below therefore omit `await`.
 */
function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  for (;;) {
    if (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isTypeAssertionExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    if (
      ts.isBinaryExpression(current) &&
      current.operatorToken.kind === ts.SyntaxKind.CommaToken
    ) {
      current = current.right;
      continue;
    }
    return current;
  }
}

/**
 * THE THIRD STATE, and why `receiverKind` needs one.
 *
 * Added 2026-08-22 (WR-19). `receiverKind` used to answer a yes/no question — "is
 * this receiver `requests` or `net`?" — and answered `undefined` for BOTH "no" and
 * "I cannot tell". Every caller then treated the second as the first, so
 * `sdk["req" + "uests"].send(req)` returned an EMPTY violation list while
 * `sdk.requests[m](req)` and `import("caido:" + "http")` correctly reported
 * `outbound-unanalysable` for the identical class of unreadable expression.
 *
 * That is the exact equivalence boundary 2 says this gate's rewrite removed —
 * "could not read does not mean clean" — applied one level down and not one level
 * up. This symbol is the third answer, and the walk now says it out loud.
 */
const UNREADABLE_RECEIVER = Symbol("unreadable-receiver");

/** The empty answer from `literalsOf` — one allocation, never mutated. */
const NO_LITERALS: ReadonlySet<string> = new Set<string>();

/** A named outbound receiver, a receiver the walk cannot read, or neither. */
type ReceiverKind = string | typeof UNREADABLE_RECEIVER | undefined;

/**
 * "This expression is not an operator expression at all" — distinct from an
 * operator expression that resolved to nothing.
 *
 * `ReceiverKind` already uses `undefined` for "not a receiver", so a descent that
 * returned `undefined` for BOTH "no operator here" and "an operator whose operands
 * name nothing" would force every caller to re-test the node kind to tell them
 * apart. That re-test is a fourth copy of the question this function exists to
 * answer once.
 */
const NOT_AN_OPERATOR = Symbol("not-an-operator");

/**
 * THE ONE DEFINITION OF HOW AN OPERATOR EXPRESSION IS READ FOR A RECEIVER.
 * Added 2026-08-24 (WR-27).
 *
 * WHY IT EXISTS AT ALL, which is the finding and not a refactoring preference.
 * Before this function the conditional descent was written THREE TIMES and
 * therefore existed only TWICE: `initializerReceiver` unwrapped a conditional in
 * INITIALIZER position, `receiverKind`'s element-access arm unwrapped one in KEY
 * position, and CALL position — `(b ? sdk.requests : sdk.net).send(req)` — fell
 * through every branch of `receiverKind` to `return undefined`, which every caller
 * reads as "not a receiver". Both of the other two faces were TAUGHT IN THE SAME
 * ROUND (CR-08, round 4) and the third was not, because there was no one place to
 * teach. Three copies of one idea is how that happens.
 *
 * AND THE TWO COPIES DID NOT AGREE, MEASURED BEFORE THE COLLAPSE. Key position
 * preferred a NAMED branch over an UNREADABLE one whichever side it sat on;
 * initializer position was written as `receiverKind(whenTrue) ?? receiverKind(whenFalse)`,
 * and `??` does not skip a symbol — so an UNREADABLE LEFT BRANCH SHADOWED A NAMED
 * RIGHT BRANCH there and nowhere else:
 *   `const r = b ? sdk[k1 + k2] : sdk.net; r.send(req)`  ->  outbound-unanalysable
 *   `const r = b ? sdk.net : sdk[k1 + k2]; r.send(req)`  ->  outbound-net
 * Two spellings of one shape, answered differently by operand ORDER. That was not
 * in any residual list either. After the collapse both report `outbound-net`, and
 * the pair is pinned by a fixture below.
 *
 * THE THREE-STATE ANSWER, IN THE ORDER THE ELEMENT-ACCESS ARM ALREADY USED — it is
 * copied from there rather than reinvented with a second precedence:
 *   1. ANY operand resolving to a NAMED receiver makes the whole expression that
 *      receiver. A receiver that is outbound on one path is outbound; the site
 *      hides nothing, so calling it unreadable would be an overclaim in the
 *      quieter direction.
 *   2. Otherwise, ANY operand the walk CANNOT READ makes the whole expression
 *      unreadable. The third state survives the operator rather than collapsing
 *      into silence.
 *   3. Otherwise it is NOT A RECEIVER — which is the state that keeps
 *      `(cache ?? client).send(req)` quiet, and which a widening gets wrong by
 *      being too eager rather than too shy.
 *
 * `resolve` is the caller's own leaf resolver, so the SAME descent serves call
 * position (`receiverKind`), key position (`keyReceiver`) and initializer position
 * (`initializerReceiver`, which is now `receiverKind`). Recursion is the caller's
 * too: each passes itself, so a nested operator resolves by construction.
 */
const operatorReceiver = (
  node: ts.Expression,
  resolve: (operand: ts.Expression) => ReceiverKind,
): ReceiverKind | typeof NOT_AN_OPERATOR => {
  const operands = operatorOperands(node);
  if (operands === undefined) return NOT_AN_OPERATOR;
  const kinds = operands.map((operand) => resolve(operand));
  for (const kind of kinds) if (typeof kind === "string") return kind;
  for (const kind of kinds) {
    if (kind === UNREADABLE_RECEIVER) return UNREADABLE_RECEIVER;
  }
  return undefined;
};

/**
 * The operands an operator expression selects between, or `undefined` if this is
 * not one of the operators the descent covers.
 *
 * Kept separate from `operatorReceiver` so that WHAT COUNTS AS AN OPERATOR and HOW
 * ITS OPERANDS COMBINE are two facts a reader can check independently — the second
 * is the same for every entry, the first is the list that grows.
 */
const operatorOperands = (
  node: ts.Expression,
): readonly ts.Expression[] | undefined => {
  if (ts.isConditionalExpression(node)) return [node.whenTrue, node.whenFalse];
  if (
    ts.isBinaryExpression(node) &&
    RECEIVER_OPERATORS.has(node.operatorToken.kind)
  ) {
    return [node.left, node.right];
  }
  return undefined;
};

/**
 * The BINARY operators that SELECT ONE OF THEIR OPERANDS rather than combining
 * them — the operator class a receiver can hide in. Added 2026-08-24 (WR-27).
 *
 * A NAMED SET RATHER THAN THREE INLINE COMPARISONS, which is the convention
 * `NUMERIC_BINARY_OPERATORS`, `NUMERIC_COMPOUND_ASSIGNMENTS` and
 * `ASSIGNMENT_OPERATORS` below already follow and the same argument the rule table
 * makes for itself: a future operator is ONE ENTRY here rather than a fourth
 * branch inside a resolver. `? :` is absent because it is not a `BinaryExpression`
 * at all — `operatorOperands` names it directly, one line up.
 *
 * `+` IS DELIBERATELY ABSENT AND MUST STAY ABSENT. `"req" + "uests"` is the
 * ASSEMBLY this gate exists to see and `isAssembledKey` owns it. Every operator
 * listed here yields ONE OF ITS OPERANDS UNCHANGED, which is exactly what makes
 * either-side semantics sound for them and nonsense for `+`.
 *
 * `&&` IS IN THE SET, AND IT WAS SETTLED BY MEASUREMENT RATHER THAN BY SYMMETRY
 * WITH THE OTHER THREE. The plan required this because the symmetry argument is
 * genuinely weaker for `&&`: `a && b` evaluates to `a` when `a` is FALSY, so its
 * left operand is usually a GUARD rather than a value, and either-side semantics
 * say a guard that happens to be a receiver makes the whole expression one. BOTH
 * READINGS WERE IMPLEMENTED AND RUN — see `01-25-SUMMARY.md` section 3 for the
 * full table. What decided it:
 *
 *   READING A, `&&` IN     (sdk.requests && sdk.net).send(req)  ["outbound-send"]
 *                          (ok && sdk.requests).send(req)       ["outbound-send"]
 *                          (sdk.requests && ok).send(req)       ["outbound-send"]
 *                          const r = ok && sdk.requests; r.send(req)
 *                                                               ["outbound-send"]
 *                          (ok && cache).send(req)              []
 *                          real tree, both roots                23 files, 0 violations
 *
 *   READING B, `&&` OUT    (sdk.requests && sdk.net).send(req)  []
 *                          (ok && sdk.requests).send(req)       []
 *                          (sdk.requests && ok).send(req)       []
 *                          const r = ok && sdk.requests; r.send(req)
 *                                                               []
 *                          (ok && cache).send(req)              []
 *                          real tree, both roots                23 files, 0 violations
 *
 * THE REAL TREE DID NOT DISCRIMINATE — both readings are ZERO on it, so nothing
 * about shipped code chose this and it would be dishonest to claim it did. THE
 * SHAPES DISCRIMINATED. `(ok && sdk.requests).send(req)` is the ORDINARY way to
 * write a guarded outbound call, it has `sdk.requests` written out in full, and
 * reading B calls it "not a receiver" — which is WR-27's own finding reproduced
 * one operator over, in the same wave that closes it. Reading A's cost is the
 * mirror case `(sdk.requests && ok).send(req)`, where the receiver is the guard
 * and the VALUE is something else: it reports. That is an OVER-approximation, it
 * is the direction every other set in this file errs in, and it is pinned by its
 * own fixture below rather than left implicit.
 *
 * THE SIBLING GATE ONE DIRECTORY OVER ALREADY COVERS THIS EXACT SET OF FOUR, and
 * that is corroboration rather than the reason. `store/error-redaction.spec.ts`'s
 * `derivesFrom` descends `? :`, `??`, `||` and `&&` with either-side semantics
 * (WR-24, plan 01-21), and its docblock cites `initializerReceiver` in THIS file
 * as its justification, saying that "stating the symmetry here is what keeps the
 * two gates from drifting into disagreeing about the same operator". Excluding
 * `&&` here would have manufactured the disagreement that sentence was written to
 * prevent.
 */
const RECEIVER_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.AmpersandAmpersandToken,
]);

/**
 * THE ONE DEFINITION OF HOW AN OPERATOR EXPRESSION IS READ FOR A GLOBAL SURFACE.
 * Added 2026-08-24 (CR-11).
 *
 * WHY IT EXISTS, AND IT IS THE SAME FINDING WR-27 WAS, ONE RESOLVER FAMILY OVER.
 * `operatorReceiver` above is reached from `receiverKind` and `keyReceiver` and
 * from nowhere else, so the operator class existed for the SDK receivers and did
 * not exist for the GLOBAL ones. Measured before this function was written:
 *
 *   (ok && sdk.requests).send(req)             ["outbound-send"]
 *   (ok && globalThis).fetch(url)              []
 *   (ok && fetch)(url)                         []
 *   (ok && eval)(src)                          []
 *   new (ok && WebSocket)()                    []
 *   (ok && navigator).sendBeacon(u, d)         []
 *   const g = globalThis ?? self; g.fetch(url) []
 *   const f = fetch ?? x; f(url)               []
 *   const e = eval ?? x; e(src)                []
 *   const n = navigator ?? x; n.sendBeacon(u, d)  []
 *
 * `const g = globalThis ?? self` is a PLAUSIBLE DEFENSIVE IDIOM rather than a
 * contrivance — it is how portable code reaches the global object — and it
 * created a fully aliased global receiver this gate could not see, while
 * `initializerReceiver`'s own clause told a reader that initializer position and
 * call position give the same answer. That sentence was true of the SDK resolver
 * and false of these five, which is worse than an undisclosed gap: a reader was
 * actively told the case was covered.
 *
 * THE SHAPE DECISION, STATED WITH ITS REASON, BECAUSE THE ALTERNATIVE WAS FIVE
 * COPIES. `operatorReceiver` is typed for a `ReceiverKind` — a THREE-state answer
 * (a named receiver, an unreadable one, neither) — and the five global resolvers
 * answer TWO states each: a boolean, or a name. They cannot consume
 * `operatorReceiver` without inventing a third state they have no use for. What
 * they CAN share, and what this function shares, is the `operatorOperands`
 * statement of WHAT COUNTS AS AN OPERATOR: this is a second consumer of that one
 * statement in exactly the sense `operatorLiteralBinding` is, and NOT a fourth
 * copy of it. Five independent inline operand loops would be WR-27's finding — one
 * idea written three times and therefore existing twice — reproduced at scale, in
 * the plan that closes WR-27's last face.
 *
 * WHAT IT ANSWERS: THE OPERAND, NOT THE ANSWER. Each caller asks its own question
 * of the operand it gets back, so this function needs no generic type parameter
 * and no knowledge of what any of the five resolvers considers a hit. That is also
 * what keeps it inside the coverage guard's POPULATION 2 convention — a generic
 * `function f<T>(` matches neither declaration pattern the guard enumerates, so a
 * generic here would have been a resolver the guard could not see, which is the
 * artifact this file exists to remove.
 *
 * EITHER-SIDE SEMANTICS, THE SAME OVER-APPROXIMATION `RECEIVER_OPERATORS` ALREADY
 * DECIDED FOR `&&` BY MEASUREMENT. Any operand the caller recognises makes the
 * whole expression that surface. Its COST is the mirror case, where the surface is
 * the GUARD rather than the value — `(globalThis && ok).fetch(url)` reports even
 * though the value is `ok`. That is an over-approximation in the direction every
 * other set in this file errs in, and it is pinned by its own fixture below rather
 * than left implicit, exactly as the SDK side pins `(sdk.requests && ok)`.
 *
 * RECURSION IS THE CALLER'S, as it is for `operatorReceiver`: each of the five
 * passes ITSELF, so a nested operator resolves by construction rather than by a
 * depth this function would have to own.
 *
 * ONE ANSWER FOR "NOT AN OPERATOR" AND FOR "AN OPERATOR NAMING NOTHING", WHICH IS
 * WHY THERE IS NO `NOT_AN_OPERATOR` HERE. `operatorReceiver` needs that symbol
 * because its callers distinguish "this is not an operator" from "this operator
 * resolved to nothing" — they have a third state to fall through to. These five do
 * not: both cases mean the same thing to every one of them, which is `false` or
 * `undefined`. Inventing the distinction would force five callers to re-test a
 * node kind they never ask about.
 */
function operatorOperandMatching(
  node: ts.Expression,
  matches: (operand: ts.Expression) => boolean,
): ts.Expression | undefined {
  const operands = operatorOperands(node);
  if (operands === undefined) return undefined;
  for (const operand of operands) if (matches(operand)) return operand;
  return undefined;
}

/**
 * The binary operators whose RESULT IS ALWAYS A NUMBER, whatever the operands.
 *
 * `+` is deliberately ABSENT and that absence is the point: `"req" + "uests"` is
 * the assembly this gate exists to see, and `+` is the one arithmetic-looking
 * operator that can produce a string. Every operator listed here coerces both
 * operands with ToNumber (or ToNumeric) by the language definition, so an element
 * access keyed on one of them cannot be spelling `requests`, `net` or `fetch`.
 */
const NUMERIC_BINARY_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.AsteriskToken,
  ts.SyntaxKind.AsteriskAsteriskToken,
  ts.SyntaxKind.SlashToken,
  ts.SyntaxKind.PercentToken,
  ts.SyntaxKind.AmpersandToken,
  ts.SyntaxKind.BarToken,
  ts.SyntaxKind.CaretToken,
  ts.SyntaxKind.LessThanLessThanToken,
  ts.SyntaxKind.GreaterThanGreaterThanToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
]);

/**
 * The compound assignments whose result is always a number when the target
 * already was one, and every other assignment operator — which is what poisons a
 * name the walk would otherwise have exempted.
 */
const NUMERIC_COMPOUND_ASSIGNMENTS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.BarEqualsToken,
  ts.SyntaxKind.CaretEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
]);

const ASSIGNMENT_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.PlusEqualsToken,
  ...NUMERIC_COMPOUND_ASSIGNMENTS,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);

/**
 * THE ASSIGNMENT OPERATORS THAT BIND A NAME TO WHATEVER IS ON THEIR RIGHT — the
 * population `collect`'s ALIAS-GROWING branch reads. Added 2026-08-24 (CR-12).
 *
 * WHY THIS SET EXISTS AT ALL, WHICH IS THE WHOLE OF CR-12. Until this set landed,
 * the alias-growing branch was gated on ONE INLINE TOKEN COMPARISON against
 * `EqualsToken`, while the numeric-POISONING arm ELEVEN LINES BELOW IT, in the
 * same function, read `ASSIGNMENT_OPERATORS` and carried a comment naming the
 * exact expression `x ||= sdk.requests`. So the two halves of one statement
 * DISAGREED ABOUT WHICH ASSIGNMENTS EXIST: the narrowing half saw `r ??=
 * sdk.requests` and removed a numeric exemption from `r`; the widening half did
 * not see it at all and grew nothing. `let r; r = sdk.requests; r.send(req)`
 * reported `outbound-send` and `let r; r ??= sdk.requests; r.send(req)` reported
 * NOTHING, two characters apart. Both halves now read a DECLARED SET, which is
 * what makes that disagreement unrepresentable rather than merely absent.
 *
 * WHY IT IS NOT `ASSIGNMENT_OPERATORS` ITSELF. That set is the population the
 * NUMERIC arm asks about — "did anything at all rebind this name" — so it contains
 * every compound spelling including `-=`, `*=` and `>>>=`. Those bind a NUMBER by
 * the language definition whatever their right-hand side was, so growing a
 * receiver alias, a global alias or a string binding from them would be growing it
 * from an expression the assignment does not actually store. `+=` is excluded for
 * the opposite reason and is NOT a gap: it is the ASSEMBLY spelling, it already
 * has its own branch below with its own numeric guard, and it is the one operator
 * whose result is a FUNCTION of the old value rather than the right-hand side
 * alone. This set is the operators that bind the right-hand expression THROUGH,
 * unchanged, to the name.
 *
 * MEMBERSHIP WAS SETTLED BY MEASUREMENT, NOT BY SYMMETRY WITH THE NUMERIC ARM,
 * and both readings were implemented and run — the shape `RECEIVER_OPERATORS`'
 * docblock above uses for its `&&` decision, and for the same reason: an operator
 * set is exactly the kind of question that looks obvious and is not.
 *
 *   READING A, THE THREE LOGICAL ASSIGNMENTS IN
 *              let r; r ??= sdk.requests; r.send(req)   ["outbound-send"]
 *              let r; r ||= sdk.requests; r.send(req)   ["outbound-send"]
 *              let r; r &&= sdk.requests; r.send(req)   ["outbound-send"]
 *              let g; g ||= globalThis;   g.fetch(url)  ["outbound-fetch"]
 *              let f; f ??= fetch;        f(url)        ["outbound-fetch"]
 *              let e; e ||= eval;         e(src)        ["outbound-dynamic-code"]
 *              let n; n ??= navigator;    n.sendBeacon() ["outbound-beacon"]
 *              let k; k ??= "requests";   sdk[k].send()  ["outbound-send"]
 *              let k; k ??= "req"+"uests"; sdk[k].send() ["outbound-unanalysable"]
 *              let i = 0; i ||= 1;        sdk[i].send()  []
 *              real tree, both roots                     23 files, 0 violations
 *
 *   READING B, THE SINGLE `EqualsToken` TOKEN TEST (what shipped before CR-12)
 *              every one of the nine shapes above           []
 *              let i = 0; i ||= 1;        sdk[i].send()     []
 *              real tree, both roots                     23 files, 0 violations
 *
 * THE REAL TREE DID NOT DISCRIMINATE — both readings are ZERO on it, so nothing
 * about shipped code chose this and it would be dishonest to claim it did. THE
 * SHAPES DISCRIMINATED: `r ??= sdk.requests` is the ORDINARY lazy-init spelling of
 * a line this gate already reports on, and reading B calls it "not a binding".
 * The four `=`/`+=` CONTROLS fire under BOTH readings, which is what makes the
 * nine silences real misses rather than an artefact of the fixture harness.
 *
 * WHAT READING A COSTS, STATED RATHER THAN LEFT IMPLICIT. `r &&= sdk.requests`
 * only assigns when `r` is already TRUTHY, and `r ??= sdk.requests` only when it
 * is nullish, so in both spellings the name MAY hold something else at the use
 * site. Reading A treats a name that MAY be bound to `sdk.requests` as one. That
 * is an OVER-approximation, it is the direction every alias set in this file errs
 * in, and it is the same call `RECEIVER_OPERATORS` made for `&&` by measurement.
 */
const ASSIGNING_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
]);

/**
 * Members and functions whose result is a NUMBER by their own definition.
 *
 * Enumerated rather than inferred, because the alternative is a type checker.
 * Every entry is a length, an index, or an arithmetic rounding — none of them can
 * return the string `requests`, `net` or `fetch`, which is the only question this
 * set is asked. `store/observations.ts` computes `const i = s.indexOf(d, start)`
 * and then indexes with it, so without `indexOf` here the walk would poison `i`
 * and flag `segments[i + 1]` in a file that is doing ordinary string surgery.
 */
const NUMERIC_MEMBERS: ReadonlySet<string> = new Set([
  "length",
  "size",
  "indexOf",
  "lastIndexOf",
  "search",
  "charCodeAt",
  "codePointAt",
  "floor",
  "ceil",
  "round",
  "trunc",
  "abs",
  "min",
  "max",
]);

const NUMERIC_FUNCTIONS: ReadonlySet<string> = new Set([
  "parseInt",
  "parseFloat",
  "Number",
]);

/**
 * Can the walk PROVE this key is a number?
 *
 * A number cannot spell a property name this gate cares about, so a provably
 * numeric key hides nothing. It PROVES rather than assumes and it fails SAFE:
 * anything it cannot prove numeric is treated as possibly a name. `numeric` holds
 * names seen bound to a provably numeric value; `poisoned` holds names seen bound
 * to anything else ANYWHERE in the file, so `let k = 0; k = "requests";
 * sdk[k].send(req)` is not exempted by the `0`.
 *
 * `+` is numeric ONLY when BOTH operands are — `i + 1` is an index and
 * `"req" + "uests"` is an assembled name, and the difference is the whole point.
 *
 * CORRECTED 2026-08-24 (WR-26). THE PARAGRAPH ABOVE OVERCLAIMS, AND THE FUNCTION
 * DOES NOT DO WHAT ITS OWN SECOND SENTENCE SAYS. Three of the branches below —
 * the numeric literal, the arithmetic operators, the sign prefix — do prove.
 * TWO DO NOT. The PROPERTY-ACCESS branch and the METHOD-CALL branch decide by
 * MEMBER NAME alone, regardless of what the member is a member OF, and they fail
 * OPEN: `{ max: "requests" }.max` is a string and this function calls it a
 * number. `NUMERIC_MEMBERS` already conceded the mechanism ("Enumerated rather
 * than inferred, because the alternative is a type checker") without conceding
 * the direction. The direction is conceded here.
 *
 * SO READ THIS FUNCTION AS: PROVES for literals and arithmetic; ASSUMES BY NAME,
 * AND FAILS OPEN, for a member or a method call — exactly the way
 * `ERROR_BINDING_NAMES` states itself one directory away, as a coverage bound
 * rather than as a proof.
 *
 * THE RESOLUTION WAS PICKED BY MEASUREMENT, NOT BY PREFERENCE, AND THE
 * MEASUREMENT IS KEPT HERE BECAUSE IT IS THE EVIDENCE. WR-26 proposed narrowing
 * the property-access branch to require an identifier receiver. That narrowing
 * was applied and RUN, and it changed NOTHING — not its own motivating shape,
 * not the exempt shapes, not the real tree. Removing the branch ENTIRELY was
 * then applied and run, and the executed difference was exactly two shapes:
 *
 *     SHAPE                         as shipped   branch removed
 *     sdk[o.length].send(req)       []           []        <- the MOTIVATING shape
 *     sdk[o.length + 1].send(req)   []           outbound-unanalysable
 *     sdk[buf.length + i].send(req) []           outbound-unanalysable
 *     x[a.length + 1] (non-receiver)[]           []
 *     real tree, 23 files            0            0
 *
 * TWO THINGS FOLLOW, AND BOTH ARE WHY THE DOCBLOCK IS WHAT CHANGED. First, the
 * motivating shape `sdk[o.length].send(req)` is silent under EVERY variant,
 * including the branch removed entirely — because a bare member is not an
 * ASSEMBLED key either, so it is residual (b) that silences it and never this
 * exemption. No narrowing available here can close WR-26's own example.
 * Second, the only place the branch is load-bearing is `+` COMPOSITION —
 * `sdk[o.length + 1]`, `sdk[buf.length + i]` — which is precisely the
 * ordinary-indexing false-positive class that got the broad WR-19 rule narrowed
 * by measurement, and `store/observations.ts`'s `segments[i + 1]` is a live
 * instance of it. Narrowing would have bought nothing and cost the gate exactly
 * the kind of false positive that gets a gate deleted rather than fixed.
 *
 * THE BOUND THAT REMAINS, BY NAME: a member or method call named in
 * `NUMERIC_MEMBERS` is ASSUMED numeric whatever its receiver, so an object that
 * happens to spell a receiver name under one of those keys is not seen. Nothing
 * in either scanned root indexes an outbound receiver by a member-named key —
 * measured, 23 files, zero violations — so the exposure today is nil and the
 * exposure the day the exemption is relied on is silent. Both shapes are pinned
 * by fixtures below, titled to say which resolution they encode.
 */
function isProvablyNumeric(
  node: ts.Expression | undefined,
  numeric: ReadonlySet<string>,
  poisoned: ReadonlySet<string>,
): boolean {
  if (node === undefined) return false;
  const inner = unwrap(node);
  if (ts.isNumericLiteral(inner)) return true;
  if (
    ts.isPrefixUnaryExpression(inner) &&
    (inner.operator === ts.SyntaxKind.MinusToken ||
      inner.operator === ts.SyntaxKind.PlusToken ||
      inner.operator === ts.SyntaxKind.TildeToken)
  ) {
    return isProvablyNumeric(inner.operand, numeric, poisoned);
  }
  if (ts.isBinaryExpression(inner)) {
    if (NUMERIC_BINARY_OPERATORS.has(inner.operatorToken.kind)) return true;
    if (inner.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      return (
        isProvablyNumeric(inner.left, numeric, poisoned) &&
        isProvablyNumeric(inner.right, numeric, poisoned)
      );
    }
    return false;
  }
  // ASSUMES BY NAME AND FAILS OPEN (WR-26). Not a proof: the receiver is not
  // examined, so `{ max: "requests" }.max` is called a number. Kept because
  // narrowing it was measured to change nothing except to re-poison the `+`
  // index composition this set exists to protect — see the docblock's table.
  if (ts.isPropertyAccessExpression(inner)) {
    return NUMERIC_MEMBERS.has(inner.name.text);
  }
  if (ts.isCallExpression(inner)) {
    const callee = unwrap(inner.expression);
    if (ts.isIdentifier(callee)) return NUMERIC_FUNCTIONS.has(callee.text);
    // ASSUMES BY NAME AND FAILS OPEN (WR-26), for the same reason as above:
    // `o.indexOf` is trusted whatever `o` is.
    if (ts.isPropertyAccessExpression(callee)) {
      return NUMERIC_MEMBERS.has(callee.name.text);
    }
    return false;
  }
  if (ts.isIdentifier(inner)) {
    return numeric.has(inner.text) && !poisoned.has(inner.text);
  }
  return false;
}

/**
 * Is this key ASSEMBLED — built rather than merely dynamic?
 *
 * THIS IS THE BOUND ON WR-19, AND IT WAS DECIDED BY MEASUREMENT, NOT BY TASTE.
 * The first implementation reported EVERY key that would not reduce to a literal.
 * Run over the real tree it fired twice, and both hits were ordinary code doing
 * exactly what it says: `compat.ts`'s `at()` walking a dotted path
 * (`cur = (cur as Record<string, unknown>)[key]`), and `compat.ts:141`'s
 * `ctx[root]`. A gate that calls a documented path walk an outbound network
 * surface is a gate that gets deleted rather than fixed, and it would have told
 * the reader nothing true.
 *
 * So the walk reports what it can SEE BEING HIDDEN — a key assembled out of
 * pieces, interpolated, or returned by a call — and DISCLOSES what it merely
 * cannot follow. A bare identifier key is the second: it is the one-more-hop
 * residual boundary 2 already states, not evidence of concealment.
 *
 * Provably numeric keys are excluded first, so `x[i + 1]` and
 * `MIGRATIONS[MIGRATIONS.length - 1]` are indexes rather than assembled names.
 */
function isAssembledKey(
  node: ts.Expression | undefined,
  numeric: ReadonlySet<string>,
  poisoned: ReadonlySet<string>,
): boolean {
  if (node === undefined) return false;
  if (isProvablyNumeric(node, numeric, poisoned)) return false;
  const inner = unwrap(node);
  if (
    ts.isBinaryExpression(inner) &&
    inner.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    return true;
  }
  if (ts.isTemplateExpression(inner)) return true;
  return ts.isCallExpression(inner);
}

/** What an operator INITIALIZER binds: the literals it can carry, and whether it hides one. */
type OperatorLiteralBinding = {
  /** Every literal reachable on any operand. */
  readonly literals: ReadonlySet<string>;
  /** Whether any operand is one the walk WATCHES BEING ASSEMBLED. */
  readonly assembled: boolean;
};

/**
 * THE LITERAL DESCENT OVER AN OPERATOR INITIALIZER — THE SECOND CONSUMER OF
 * `operatorOperands`, NOT A SECOND COPY OF IT. Added 2026-08-24 (CR-13).
 *
 * WHY IT EXISTS. `keyReceiver` descends an operator INLINE at the KEY site
 * through `operatorReceiver(unwrap(key), keyReceiver)`. `collect` did not descend
 * one at the BINDING site: `bindString` requires a bare `isStringLiteralLike`
 * initializer after `unwrap`, and `isAssembledKey` answers false for a
 * `ConditionalExpression`. So `const k = b ? "requests" : "net"; sdk[k].send(req)`
 * landed in NEITHER `constStrings` NOR `assembledNames` and the key lookup
 * answered "not a receiver" — CLEAN, on a site with the literal `"requests"`
 * written out in full. One expression shape, answered differently depending only
 * on which POSITION it was bound for, and the answer at the silent position was
 * the quiet one. All four twins of the identical conditional already reported.
 *
 * IT IS BUILT ON `operatorOperands` AND MUST STAY BUILT ON IT — WR-27 IS THE
 * REASON, NAMED HERE RATHER THAN LEFT AS STYLE. WR-27 was ONE idea — the
 * conditional descent — written THREE TIMES and therefore existing only TWICE,
 * and the face nobody had was silent. A literal-reading descent carrying its own
 * inline list of operator kinds would be the FOURTH copy of that list, free to
 * disagree with `operatorReceiver` about which operators exist the day either
 * one grows a fifth. `operatorOperands` is the separated statement of WHAT
 * COUNTS AS AN OPERATOR; this function is its second CONSUMER, and
 * `operatorReceiver` is the first. HOW THE OPERANDS COMBINE differs between the
 * two — one selects a receiver, one collects literals — and that is exactly the
 * half `operatorOperands`' own docblock says is allowed to differ.
 *
 * THE RECURSION IS THIS FUNCTION'S OWN, AND THAT IS A DEPARTURE FROM
 * `operatorReceiver` WORTH STATING. `operatorReceiver` takes the caller's leaf
 * resolver and lets the caller pass ITSELF, so nesting resolves by construction.
 * That is not available here: the leaf reader is `literalsOf`, which returns a
 * `ReadonlySet<string>` and has no third state to carry an "unreadable" answer
 * back through, and making it operator-aware would put a fifth copy of the
 * descent inside a function whose whole job is reading a map. So the descent
 * recurses on itself and takes the reader as a leaf, which keeps the nesting
 * property without teaching `literalsOf` a shape it has no vocabulary for.
 *
 * WHAT COUNTS AS AN UNREADABLE OPERAND — SETTLED BY MEASUREMENT, NOT BY THE FIX
 * SKETCH, AND THE REJECTED READING IS RECORDED HERE THE WAY `RECEIVER_OPERATORS`
 * RECORDS `&&`. The review proposed marking the name an assembly if ANY operand
 * is unreadable. BOTH READINGS WERE IMPLEMENTED AND RUN — see `01-30-SUMMARY.md`
 * section 3 for the full table. What decided it:
 *
 *   READING A, ANY OPERAND WITH NO LITERAL
 *       const k = b ? "requests" : someName    ["outbound-unanalysable"]
 *         but the INLINE twin sdk[b ? "requests" : someName]
 *                                              ["outbound-send"]
 *       const k = b ? someName : otherName     ["outbound-unanalysable"]
 *         but the INLINE twin sdk[b ? someName : otherName]
 *                                              []
 *       const i = b ? 0 : 1; sdk[i]            ["outbound-unanalysable"]
 *       const k = b ?? "requests"              ["outbound-unanalysable"]
 *       real tree, both roots                  23 files, 0 violations
 *
 *   READING B, ONLY AN OPERAND THE WALK WATCHES BEING ASSEMBLED (implemented)
 *       const k = b ? "requests" : someName    ["outbound-send"]
 *       const k = b ? someName : otherName     []
 *       const i = b ? 0 : 1; sdk[i]            []
 *       const k = b ?? "requests"              ["outbound-send"]
 *       const k = b ? "req" + "uests" : "net"  ["outbound-unanalysable"]
 *       real tree, both roots                  23 files, 0 violations
 *
 * THE REAL TREE DID NOT DISCRIMINATE — both readings are ZERO on it, so nothing
 * about shipped code chose this and it would be dishonest to claim it did. THE
 * SHAPES DISCRIMINATED, IN THREE PLACES, AND ALL THREE ARE READING A OVER-
 * APPROXIMATING FURTHER THAN THE TWINS THIS PLAN EXISTS TO MATCH:
 *   1. `b ? "requests" : someName` is a site the walk reads COMPLETELY on one
 *      branch, and the inline twin reports `outbound-send` for it. Reading A
 *      answers `outbound-unanalysable` — the gate saying "I could not read this"
 *      about something it read perfectly, which is the second overclaim the
 *      round-4 fixtures were written to forbid.
 *   2. `b ? someName : otherName` is SILENT at the inline site. Reading A reports
 *      there — a NEW asymmetry between binding and use, in the opposite
 *      direction from CR-13's, created by the commit closing CR-13.
 *   3. `const i = b ? 0 : 1; sdk[i]` is an ORDINARY INDEX. Reading A calls it an
 *      assembled name, which is the first WR-19 implementation's own rejected
 *      behaviour — `isAssembledKey`'s docblock records that it fired on
 *      `compat.ts`'s documented path walk and that "a gate that calls a
 *      documented path walk an outbound network surface is a gate that gets
 *      deleted rather than fixed".
 *   And separately, reading A fails this plan's own stated requirement that the
 *   `??` and `||` initializers answer as the conditional does: `b ?? "requests"`
 *   has one operand with no literal BY CONSTRUCTION.
 *
 * SO THE ARM IS READ OFF `keyReceiver`, WHICH IS THE FUNCTION THE TWINS GO
 * THROUGH: it produces UNREADABLE from exactly two branches — a name already in
 * `assembledNames`, and `isAssembledKey` — and this descent marks an operand
 * unreadable in exactly those two cases and no others. `isAssembledKey` excludes
 * provably numeric expressions on its own first line, which is what keeps case 3
 * an index without a second numeric guard here.
 *
 * WHAT READING B COSTS, STATED RATHER THAN LEFT IMPLICIT: an operand the walk
 * genuinely cannot follow — a parameter, a call result already covered by
 * `isAssembledKey`, a name bound in another file — contributes NO literal and NO
 * unreadability, so `const k = b ? "requests" : mystery; sdk[k]` reports
 * `outbound-send` off the readable branch and says nothing about the other one.
 * That is the same either-side over-approximation `RECEIVER_OPERATORS` chose and
 * for the same reason: a receiver named on one path is named.
 */
function operatorLiteralBinding(
  node: ts.Expression | undefined,
  read: (operand: ts.Expression) => ReadonlySet<string>,
  assembled: ReadonlySet<string>,
  numeric: ReadonlySet<string>,
  poisoned: ReadonlySet<string>,
): OperatorLiteralBinding | undefined {
  if (node === undefined) return undefined;
  const operands = operatorOperands(unwrap(node));
  if (operands === undefined) return undefined;
  const literals = new Set<string>();
  let watched = false;
  for (const operand of operands) {
    const nested = operatorLiteralBinding(
      operand,
      read,
      assembled,
      numeric,
      poisoned,
    );
    if (nested !== undefined) {
      for (const literal of nested.literals) literals.add(literal);
      if (nested.assembled) watched = true;
      continue;
    }
    const inner = unwrap(operand);
    // THE UNREADABLE-OPERAND ARM. An operand the walk WATCHES BEING ASSEMBLED
    // makes the BOUND NAME an assembly, exactly as the inline key site already
    // treats the same operand. `keyReceiver` produces UNREADABLE from precisely
    // two branches — a name already in `assembledNames`, and `isAssembledKey` —
    // and those two are what this arm tests. See the docblock for why it is NOT
    // "any operand that yielded no literal".
    if (
      isAssembledKey(inner, numeric, poisoned) ||
      (ts.isIdentifier(inner) && assembled.has(inner.text))
    ) {
      watched = true;
      continue;
    }
    for (const literal of read(inner)) literals.add(literal);
  }
  return { literals, assembled: watched };
}

/**
 * How a violation NAMES a global reached through a local binding.
 *
 * Added 2026-08-24 (WR-23). The message says both the spelling at the call site
 * and the surface it resolves to, because "a call to `e(...)`" alone tells a
 * reader nothing about why their file failed a gate named `outbound-dynamic-code`.
 */
function aliasSuffix(spelling: string, global: string): string {
  return spelling === global ? "" : `, an alias of \`${global}\``;
}

function callDetail(callee: ts.Expression, global: string): string {
  const spelling = ts.isIdentifier(callee) ? callee.text : global;
  return `a call to \`${spelling}(...)\`${aliasSuffix(spelling, global)}`;
}

function constructionDetail(target: ts.Expression, global: string): string {
  const spelling = ts.isIdentifier(target) ? target.text : global;
  return `a construction of \`${spelling}\`${aliasSuffix(spelling, global)}`;
}

/**
 * Is this expression one of the four receivers a global lives on — bare, or
 * through ONE HOP, which is the hop its own alias sets already resolve?
 *
 * WIDENED 2026-08-24 (IN-20). `fetchAliases` and `navigatorAliases` both resolve
 * `const f = fetch` and `const n = navigator`; the RECEIVER those aliases sit on
 * did not, so `const g = globalThis; g.fetch(u)` and
 * `const g = globalThis; g["fet" + "ch"](u)` were both silent. That is the same
 * asymmetry between a thing and its members that CR-08 was, standing one level
 * further out — and it is what makes it a two-line fix rather than a new
 * mechanism: the same `Set<string>` pattern, grown in the same collect pass.
 *
 * The set is passed in rather than closed over because this function is also
 * called from module scope by `aliasedGlobalOf`'s helpers during collect, where
 * the aliases are still being grown; every caller inside `auditSource` passes
 * the live set, and the bare-identifier answer is unchanged for all of them.
 *
 * HOW FAR AN ALIAS CHAIN REACHES IS STATED IN EXACTLY ONE PLACE — residual (a),
 * under `ALIASES DO NOT`. It is not restated here (WR-30). The sentence that
 * stood here bounded this function at one hop and named
 * `const a = globalThis; const g = a; g.fetch(u)` as silent; executed, that
 * string reports `outbound-fetch`, and a passing case further down this same
 * file asserts that it does. A bound restated in four docblocks is a bound that
 * drifts in three of them, which is what happened.
 *
 * The local fact, which IS about this function: the set it consults is grown
 * from the LIVE set during collect, so what this function answers depends on
 * what has been declared, never on where the answer is read.
 */
function isGlobalReceiverIn(
  node: ts.Expression,
  aliases: ReadonlySet<string>,
): boolean {
  const inner = unwrap(node);
  // CR-11, 2026-08-24: an operator SELECTING a global receiver is a global
  // receiver, through the one shared descent the other four global resolvers
  // reach. `(b ? globalThis : self).fetch(url)` and `const g = globalThis ?? self`
  // were both silent while the SDK twin one resolver over reported.
  if (
    operatorOperandMatching(inner, (operand) =>
      isGlobalReceiverIn(operand, aliases),
    ) !== undefined
  ) {
    return true;
  }
  if (!ts.isIdentifier(inner)) return false;
  return GLOBAL_RECEIVERS.has(inner.text) || aliases.has(inner.text);
}

/**
 * The property name a binding element takes FROM the object being destructured.
 *
 * BOUNDED, AND THE BOUND IS MEASURED (IN-32, 2026-08-25, wave 34): an identifier
 * or a string literal reduces; a ComputedPropertyName does not, EVEN WHEN the
 * expression inside the brackets is a plain string literal. Callers therefore see
 * `undefined` for `{ ["sendBeacon"]: b }` and route it to their unreadable arm,
 * which reports the unanalysable surface instead of the surface the key names.
 * The direction is safe and the rule identifier is wrong; that trade is recorded
 * here rather than left for a reader to discover from a confusing report.
 */
function boundPropertyName(el: ts.BindingElement): string | undefined {
  const property = el.propertyName ?? el.name;
  return ts.isIdentifier(property) || ts.isStringLiteralLike(property)
    ? property.text
    : undefined;
}

/**
 * The expression a destructured binding element actually takes its value FROM,
 * when the thing being destructured is written out as a literal in the same
 * declaration.
 *
 * IN-26, and it is narrow on purpose. `const { k } = { k: "req" + "uests" }` and
 * `const [k] = ["req" + "uests"]` are DECLARATIONS of an assembled key, exactly
 * as `const k = "req" + "uests"` is, and the residual header says an assembly is
 * read "through EITHER a declaration or an assignment". The collector read only
 * the identifier spelling, so both of these were silent while their own
 * one-identifier twin reported.
 *
 * It resolves only against an object or array LITERAL written in the initializer
 * position, because that is the only place the assembly's SHAPE still exists to
 * be read. `const { k } = someObject` is a value crossing a boundary the walk
 * does not follow and stays residual (a); nothing here changes that.
 */
function destructuredInitializer(
  init: ts.Expression,
  el: ts.BindingElement,
  index: number,
): ts.Expression | undefined {
  if (ts.isObjectLiteralExpression(init)) {
    const property = boundPropertyName(el);
    if (property === undefined) return undefined;
    for (const member of init.properties) {
      if (!ts.isPropertyAssignment(member)) continue;
      const name = member.name;
      const text =
        ts.isIdentifier(name) || ts.isStringLiteralLike(name)
          ? name.text
          : undefined;
      if (text === property) return member.initializer;
    }
    return undefined;
  }
  if (ts.isArrayLiteralExpression(init)) {
    // A rest element consumes the tail rather than one slot, so positional
    // matching stops meaning anything past it and nothing is read.
    if (el.dotDotDotToken !== undefined) return undefined;
    return init.elements[index];
  }
  return undefined;
}

/**
 * Audit one source file.
 *
 * PURE — takes text, returns findings — which is what makes every fixture below
 * possible without touching the filesystem, and what lets the failing path of
 * every rule actually RUN. A gate whose failure path has never run is a gate
 * nobody has tested, and this phase has been bitten by exactly that four times —
 * plus once more by a gate that passed every fixture it had and missed fourteen
 * of the twenty-two shapes an independent probe threw at it.
 */
export function auditSource(file: string, source: string): Violation[] {
  const base = file.split("/").pop() ?? file;
  const violations: Violation[] = [];

  const add = (rule: RuleId, where: string): void => {
    const surface = RULES[rule];
    violations.push({
      file: base,
      rule,
      detail:
        `${file}: ${where} reaches ${surface.surface}, which CORE-11 forbids in this phase — ` +
        surface.why,
    });
  };

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  /**
   * Identifiers aliasing an outbound RECEIVER, identifiers a global `fetch` was
   * bound to, and `const` names bound to a single string literal. All three are
   * collected in one pass over the file in document order — see header boundary
   * 2 for exactly how far that reaches and what it reports instead of guessing.
   */
  const receiverAliases = new Map<string, string>();
  const fetchAliases = new Set<string>([FETCH_GLOBAL]);
  /**
   * EVERY string literal a name is bound to ANYWHERE IN THE FILE, not the first
   * one the walk happened to read.
   *
   * WIDENED 2026-08-24 (CR-10), and the shape of the map is the fix. It used to
   * be `Map<string, string>` written ONLY at the declaration branch, so
   * `let k = "harmless"; k = "requests"; sdk[k].send(req)` resolved `k` to
   * `"harmless"` FOREVER and reported nothing — while `k = "requests"` sat in
   * the AST twelve tokens away, a value the walk READS and then discarded in
   * favour of an older one. That is the reporting side of this file's own
   * reported-versus-followed distinction, and it was silent.
   */
  const constStrings = new Map<string, Set<string>>();
  /**
   * Names whose binding the walk WATCHED BEING ASSEMBLED — `const k = "req" +
   * "uests"`, a template, or a call whose result is not provably numeric.
   *
   * Added 2026-08-24 (CR-08). `constStrings` remembers a name bound to a string
   * the walk could READ; this remembers a name bound to a string the walk could
   * see being BUILT. The distinction is the whole of WR-19 standing one hop back:
   * a key the walk watched being assembled is a key the walk saw being hidden,
   * and binding it to a name first hides nothing more. Before this set existed
   * `sdk["req" + "uests"].send(req)` reported and `const k = "req" + "uests";
   * sdk[k].send(req)` did not, while the MEMBER-level twin (`const m = "se" +
   * "nd"; sdk.requests[m](req)`) and the GLOBAL-level twin (`const k = "fet" +
   * "ch"; globalThis[k](url)`) both reported — the asymmetry WR-19 was raised to
   * remove, surviving one level up.
   *
   * ONE HOP AND NO MORE, exactly like `constStrings`: `const a = "req" + "uests";
   * const b = a; sdk[b].send(req)` is still silent, and that is residual (a).
   * THIS SENTENCE IS THE ONE PLACE THAT ONE-HOP BOUND IS STILL STATED, and it
   * is stated here because it is TRUE HERE and nowhere else: this collector
   * reads the INITIALIZER'S SHAPE and never the live set, so it cannot chain.
   * Three sibling docblocks carried the identical sentence about ALIAS sets,
   * which are grown from the live set and DO chain, link after link; all three
   * were deleted on 2026-08-24 (WR-30) after being executed and found to report.
   * That they read as true to a skimmer is precisely because THIS one is.
   *
   * WHAT COUNTS AS A DECLARATION HERE, WIDENED 2026-08-24 (IN-26). Three
   * spellings, not one: `const k = "req" + "uests"`, `const { k } = { k: "req"
   * + "uests" }` and `const [k] = ["req" + "uests"]`. The two binding-pattern
   * spellings were silent while the header two hundred lines up said an
   * assembly is read through EITHER a declaration or an assignment, and the
   * RECEIVER branch beside this one already read an object binding pattern. A
   * destructure of anything the walk cannot read as a literal — `const { k } =
   * someObject` — reads nothing and is residual (a), unchanged.
   *
   * WHAT ACTUALLY BOUNDS A KEY, CORRECTED 2026-08-24 (CR-09). The paragraph
   * that stood here bounded key resolution by where a declaration is read
   * RELATIVE TO A USE — THE READ-POSITION BOUND, whose superseded words are
   * preserved in `01-VERIFICATION.md`'s CR-09 entry and are not requoted here.
   * It was false: `collect(sf)` completes before `visit(sf)` begins, so a
   * binding is seen from EVERY use site the module has, those written above it
   * included. `sdk[k].send(req);\nconst k = "req"+"uests";` reports.
   * What DOES bound a key is the ONE HOP above, and the mechanism behind it is
   * the mechanism that makes keys different from aliases: this collector and
   * `constStrings` read the INITIALIZER'S SHAPE and never the live set, so a
   * key cannot be grown from a name already in the set and therefore cannot
   * chain — while every ALIAS set is grown FROM the live set and therefore
   * chains link after link. Bindings remain file-wide, which over-approximates
   * (a name bound anywhere counts everywhere), which is the posture every other
   * set in this pass already takes.
   *
   * THE NUMERIC SETS ARE READ AS THEY STAND AT THE DECLARATION, DELIBERATELY.
   * `isAssembledKey` runs `isProvablyNumeric` first, and the numeric sets are
   * populated further down this SAME document-order pass — so a declaration is
   * judged against what the walk knew about numbers at that point in the file,
   * not against the finished sets. That is the identical posture the existing
   * numeric-collection call takes and it is a choice, not an oversight: turning
   * this into a two-pass walk would change what `x[i + 1]` means depending on
   * where `i` is declared relative to its use, for no measured gain.
   */
  const assembledNames = new Set<string>();
  /**
   * Names bound to a receiver the walk COULD NOT READ — `const r = sdk[k]`.
   *
   * Remembering the unreadable binding is how the third state is handled at the
   * COLLECT call site: the report is deferred to wherever the binding is actually
   * used as a receiver, so `const r = sdk[k]; r.send(req)` fails at `r.send`,
   * while an ordinary dictionary read that is never used as a receiver —
   * `const v = record[name];` — stays quiet. Reporting at the binding instead
   * would have flagged every dynamic lookup in the codebase, which is the kind of
   * rule that gets a gate deleted rather than fixed.
   */
  const unreadableAliases = new Set<string>();
  /** One-hop aliases of `navigator`, mirroring `fetchAliases` exactly. */
  const navigatorAliases = new Set<string>([NAVIGATOR]);
  /**
   * One-hop aliases of `eval`, `Function` and the outbound CONSTRUCTORS —
   * `localName -> the global it names`.
   *
   * Added 2026-08-24 (WR-23). DELIBERATELY SHAPED LIKE `fetchAliases` AND
   * `navigatorAliases`, AND SAYING SO IS THE POINT: the dynamic-code rule was
   * written between those two and given neither, while its own docblock told the
   * reader it reached "the same way the receiver rules already catch
   * `const s = sdk.requests.send`". It reached one spelling less far than either
   * of its neighbours. `eval(s)` reported and `const e = eval; e(s)` did not — on
   * the one surface that reaches every other surface in CORE-11's enumeration,
   * through a string no AST gate can read into. A rule for that surface which one
   * `const` defeats enforces nothing.
   *
   * Grown from the SAME THREE SHAPES `fetchAliases` is grown from, so a spelling
   * added to one is added to all by construction rather than by a second edit:
   *   `const e = eval;`                   -> e  -> "eval"
   *   `const F = globalThis.Function;`    -> F  -> "Function"
   *   `const { eval: ev } = globalThis;`  -> ev -> "eval"
   *   `let W; W = WebSocket;`             -> W  -> "WebSocket"
   *
   * A MAP RATHER THAN A SET, so the violation message can name the surface the
   * local actually aliases (`a call to \`e(...)\`, an alias of \`eval\``) instead
   * of leaving a reader to find the binding themselves.
   *
   * HOW FAR THIS MAP CHAINS IS STATED IN EXACTLY ONE PLACE — residual (a),
   * under `ALIASES DO NOT`. Not restated here (WR-30): the sentence that stood
   * here bounded this map at one hop and named `const a = eval; const b = a;
   * b(s)` as silent. Executed, it reports `outbound-dynamic-code`, at two hops
   * and at three.
   *
   * The local fact: this map is grown by consulting itself during the collect
   * pass, which is why it chains at all and why the ordering of the
   * DECLARATIONS — not of the uses — is what bounds it.
   *
   * The RECEIVER anchoring is inherited, not re-derived: the member and
   * destructure spellings only grow this map off one of the four
   * `GLOBAL_RECEIVERS`, so `const o = { eval(s) {} }; const e = o.eval; e("x")`
   * grows nothing and stays quiet. That twin is asserted below.
   */
  const globalAliases = new Map<string, string>();
  /**
   * Names in `DYNAMIC_CODE` or `OUTBOUND_CONSTRUCTORS` that this MODULE SHADOWS
   * with a top-level `function`/`class` declaration of the same name.
   *
   * Added 2026-08-24 (WR-23's negative side). The bare-identifier test for these
   * five names is a NAME test, and a module that declares `function Function(a)`
   * at top level has bound that name for the whole module by ordinary JS scoping
   * — so the bare call `Function("x")` in that module provably is NOT the global.
   * That is a proof from the AST, not a heuristic, which is why it is allowed to
   * narrow a deliberately fail-closed rule.
   *
   * TOP LEVEL ONLY, AND ONLY A `function`/`class` DECLARATION. This walk is
   * scope-blind on purpose (T-01-51), so a declaration nested inside a block or a
   * function proves nothing about the module scope and is NOT collected — the
   * bare call still reports, which is the fail-CLOSED direction. A VARIABLE
   * declaration is not collected either: `const Function = globalThis.Function`
   * re-binds the name to the global itself, and the cheap way to be right about
   * that is to leave the variable spelling reporting.
   */
  const shadowedGlobals = new Set<string>();
  /**
   * One-hop aliases of the four `GLOBAL_RECEIVERS` (IN-20), mirroring
   * `fetchAliases` and `navigatorAliases` exactly — which is the finding: those
   * two resolved a hop that the receiver they sit on did not.
   *
   * Seeded EMPTY rather than with the four names, because `isGlobalReceiverIn`
   * tests `GLOBAL_RECEIVERS` first; this set holds only what the walk WATCHED
   * being bound, which keeps the bare-identifier answer literally unchanged and
   * makes the new behaviour reachable only through this set.
   */
  const globalThisAliases = new Set<string>();
  /** One-hop resolution of the receiver, closed over the live alias set. */
  const isGlobalReceiver = (node: ts.Expression): boolean =>
    isGlobalReceiverIn(node, globalThisAliases);
  /** Names bound only to provably numeric values, and names bound to anything else. */
  const numericNames = new Set<string>();
  const poisonedNumericNames = new Set<string>();

  /**
   * WHAT A READABLE KEY IS — DEFINED EXACTLY ONCE, CALLED FROM EVERY BRANCH.
   *
   * Factored out 2026-08-24 (CR-08). A conditional key needs this same resolution
   * run twice, once per branch, and TWO COPIES OF "WHAT A READABLE KEY IS" IS HOW
   * boundary 2 AND THE CODE CAME APART IN THE FIRST PLACE. One definition, three
   * call sites (the direct key and both conditional branches), so they cannot
   * disagree about what the walk can read.
   *
   * The ORDER is load-bearing and is the order below:
   *   0. a key the walk WATCHED BEING ASSEMBLED — at a declaration, an
   *      assignment, or a COMPOUND ASSIGNMENT — is UNREADABLE
   *      (`assembledNames`). THE PRECEDENCE, added 2026-08-24 (CR-10), and it
   *      exists only because step 1 widened: a name can now carry BOTH a
   *      literal binding and a watched assembly, and something has to win. THE
   *      ASSEMBLY DOES. A name the walk watched being reassembled is a name
   *      whose literal answer stopped being trustworthy, so an assembly it SAW
   *      is stronger evidence than a literal it saw earlier — the site reports
   *      `outbound-unanalysable` rather than naming a surface off a string the
   *      file has since rebuilt. Both directions REPORT; this one is the true
   *      one. It is numbered 0 rather than renumbering the four below, because
   *      "step 1" names the literal lookup in three other docblocks and in the
   *      fixtures, and silently renumbering a load-bearing order is its own
   *      small version of this file's recurring defect.
   *      STEP 1's CASE IS UNTOUCHED BY IT: `const r = "requests"` is never in
   *      `assembledNames`, so a single-hop literal binding still reports
   *      `outbound-send` and is still never downgraded.
   *   1. a key ANY OF WHOSE BINDINGS names an outbound receiver IS one
   *      (`constStrings`) — first, so `const r = "requests"; sdk[r].send(req)`
   *      keeps reporting `outbound-send` and is never downgraded to
   *      unanalysable;
   *   2. a key the walk WATCHES being assembled inline is UNREADABLE
   *      (`isAssembledKey`);
   *   3. a key bound ONE HOP back to such an assembly is UNREADABLE
   *      (`assembledNames`) — FOLDED INTO STEP 0 on 2026-08-24 (CR-10). It
   *      tested the identical condition and, once step 0 ran first, was
   *      unreachable; the duplicate was deleted rather than left standing;
   *   4. anything else — a parameter, a loop binding, a name the walk never saw
   *      bound, more than one hop — is NOT a receiver. That is residual (b), set
   *      by real-tree measurement rather than by preference.
   *
   * STEP 1 WIDENED 2026-08-24 (CR-10), AND THE WIDENING IS WHY IT STILL COMES
   * FIRST. It used to read "a key that REDUCES to a literal", singular, against a
   * map holding ONE literal per name — the FIRST one, written only at the
   * declaration branch. `let k = "harmless"; k = "requests"; sdk[k].send(req)`
   * therefore resolved to "harmless" forever and steps 2 and 3 were unreachable
   * for that name. The map now holds EVERY literal a name is bound to at ANY OF
   * ITS COLLECTING BRANCHES, and step 1 asks whether ANY of them names a receiver.
   * WHICH DIRECTION THAT ERRS IN, SAID PLAINLY: ANY-BINDING-WINS
   * OVER-approximates — `let k = "requests"; k = "harmless"` reports, and it is
   * asserted below as THE MIRROR. The rejected alternative, a POISONED map in the
   * shape of `poisonedNumericNames`, would have UNDER-approximated in both
   * directions: measured, it left CR-10's own shapes 1 and 2 silent. Both
   * mechanisms were run over the real tree; both reported ZERO. See
   * `01-24-SUMMARY.md` section 2.
   */
  const keyReceiver = (key: ts.Expression): ReceiverKind => {
    // WR-27 step -1: AN OPERATOR KEY IS READ ON EVERY OPERAND, through the ONE
    // shared descent. This is the recursion `keyReceiver`'s docblock has claimed
    // since CR-08 — "called from the direct key and both conditional branches, so
    // they cannot disagree about what the walk can read". It was a claim about two
    // CALLERS, made by a function that did not itself handle the shape, so the
    // moment a conditional appeared INSIDE a conditional branch the two did
    // disagree: `sdk[b ? (c ? "requests" : "x") : "y"]` was silent. Recursing here
    // makes the sentence a fact about the code.
    // It runs FIRST and that is a no-op for every non-operator key: step 0 tests
    // `isIdentifier`, the literal loop tests literals and identifiers, and
    // `isAssembledKey` answers false for a conditional — an operator key reached
    // `return undefined` by falling through all three.
    const operatorKey = operatorReceiver(unwrap(key), keyReceiver);
    if (operatorKey !== NOT_AN_OPERATOR) return operatorKey;
    // CR-10 step 0, THE PRECEDENCE, and it exists only because step 1 widened.
    // A name can now carry BOTH a literal binding and a watched assembly —
    // `let k = "requests"; k = a + b; sdk[k].send(req)`. The ASSEMBLY WINS: a
    // name the walk WATCHED being reassembled is a name whose literal answer
    // stopped being trustworthy, and an assembly it SAW is stronger evidence
    // than a literal it saw earlier. It reports `outbound-unanalysable` rather
    // than `outbound-send` — both report; the difference is that the walk says
    // it can no longer read the site rather than naming a surface off a string
    // the file has since rebuilt.
    // STEP 1's CASE IS UNTOUCHED BY THIS: `const r = "requests"` is never in
    // `assembledNames`, so a single-hop literal binding still reports
    // `outbound-send` and is still never downgraded.
    const assembledKey = unwrap(key);
    if (
      ts.isIdentifier(assembledKey) &&
      assembledNames.has(assembledKey.text)
    ) {
      return UNREADABLE_RECEIVER;
    }
    // CR-10 step 1: ANY binding of this name that names an outbound receiver
    // makes the key one. A single-binding name behaves exactly as before, so
    // `const r = "requests"; sdk[r].send(req)` still reports `outbound-send`
    // and is still never downgraded to unanalysable.
    for (const literal of literalsOf(key)) {
      if (RECEIVERS.has(literal)) return literal;
    }
    // The key names no receiver. If the walk can SEE it being assembled, it says
    // so rather than treating the result as an ordinary object; a key it merely
    // cannot follow is the disclosed one-more-hop residual, not concealment.
    if (isAssembledKey(key, numericNames, poisonedNumericNames)) {
      return UNREADABLE_RECEIVER;
    }
    // CR-08's step 3 — "the SAME assembly, one hop back" — USED TO STAND HERE
    // and is now UNREACHABLE, because step 0 above tests the identical
    // condition and returns first. It was deleted rather than left in place:
    // two identical tests in one function is how a reader learns to stop
    // trusting the order the docblock claims is load-bearing. The behaviour it
    // encoded is unchanged and is asserted by the same fixtures it always was —
    // step 0 is that test, moved above the literal lookup and given a reason.
    return undefined;
  };

  /**
   * The outbound receiver an expression denotes — or the admission that the walk
   * cannot tell, which is the third state and NOT the same as "not a receiver".
   */
  const receiverKind = (node: ts.Expression): ReceiverKind => {
    const inner = unwrap(node);
    // WR-27: AN OPERATOR IN CALL-RECEIVER POSITION, read through the same descent
    // key position and initializer position use. THE FALL-THROUGH BELOW IS THE
    // FINDING: before this line `(b ? sdk.requests : sdk.net).send(req)` matched no
    // branch and returned `undefined`, which every caller reads as "not a
    // receiver" — a site with a literal `sdk.requests` written out in full,
    // hiding nothing, classified as a site with nothing in it. That is the same
    // equivalence boundary 2 exists to remove, one position over.
    const operator = operatorReceiver(inner, receiverKind);
    if (operator !== NOT_AN_OPERATOR) return operator;
    if (
      ts.isPropertyAccessExpression(inner) &&
      RECEIVERS.has(inner.name.text)
    ) {
      return inner.name.text;
    }
    if (ts.isElementAccessExpression(inner)) {
      // THE COLLAPSE, 2026-08-24 (WR-27). A hand-written conditional block stood
      // here, calling `keyReceiver` on each branch and combining the three states
      // itself. It is now `keyReceiver`'s own recursion through
      // `operatorReceiver`, so the precedence exists in ONE place. Its behaviour
      // for `sdk[b ? "requests" : "net"]` is unchanged and asserted by the
      // round-4 fixture it was written for; what changed is that a NESTED
      // conditional now resolves too, because the recursion is the resolver's
      // rather than this arm's.
      return keyReceiver(inner.argumentExpression);
    }
    if (ts.isIdentifier(inner)) {
      const alias = receiverAliases.get(inner.text);
      if (alias !== undefined) return alias;
      return unreadableAliases.has(inner.text)
        ? UNREADABLE_RECEIVER
        : undefined;
    }
    return undefined;
  };

  /**
   * EVERY string an expression can denote: the literal itself, or the whole
   * collected set of literals `constStrings` recorded for a name — which is every
   * literal that name is bound to through a declaration, an assignment, a
   * logical assignment or an operator initializer, whatever the
   * `const`/`let`/`var` spelling. It returns a SET and it can return an EMPTY one;
   * it never returns `undefined`, and its callers ask about SIZE rather than about
   * absence.
   *
   * CORRECTED 2026-08-24 (IN-27), AND THE PARAGRAPH THAT STOOD HERE WAS NOT WRONG
   * SO MUCH AS ON THE WRONG FUNCTION. It read "the string an expression denotes: a
   * literal, or a single-hop `const` bound to one. `undefined` means THE WALK
   * COULD NOT READ IT" — a correct description of `literalOf`, which is directly
   * below and which had no docblock at all. It went stale the day CR-10 split the
   * single-valued reader from the multi-valued one and left the paragraph on the
   * half it stopped describing. Both registry rows were and are correct, so this
   * was a code comment and nothing else — which is exactly the kind of drift a
   * reader has no way to detect, because a docblock is the one artifact in this
   * file that no assertion reads.
   */
  function literalsOf(node: ts.Node | undefined): ReadonlySet<string> {
    if (node === undefined) return NO_LITERALS;
    if (ts.isStringLiteralLike(node)) return new Set([node.text]);
    if (ts.isIdentifier(node))
      return constStrings.get(node.text) ?? NO_LITERALS;
    if (ts.isExpression(node)) {
      const inner = unwrap(node);
      if (inner !== node) return literalsOf(inner);
    }
    return NO_LITERALS;
  }

  /**
   * The ONE string an expression denotes, for the callers that need exactly one:
   * a member name, a module specifier. `undefined` means THE WALK COULD NOT READ
   * IT — never "there was nothing there" — and it is returned for BOTH the
   * no-binding case and the two-or-more-bindings case, because a name the file
   * rebinds is a name this reader cannot answer for. Every caller treats that
   * `undefined` as `outbound-unanalysable` rather than as clean.
   *
   * MOVED HERE 2026-08-24 (IN-27) from `literalsOf` above, which is multi-valued
   * and cannot return `undefined` at all.
   */
  function literalOf(node: ts.Node | undefined): string | undefined {
    const literals = literalsOf(node);
    if (literals.size !== 1) return undefined;
    for (const only of literals) return only;
    return undefined;
  }

  /** Record one more string literal this name is bound to. */
  const bindString = (name: string, literal: string): void => {
    const bound = constStrings.get(name);
    if (bound === undefined) constStrings.set(name, new Set([literal]));
    else bound.add(literal);
  };

  /** The member name a property or element access reads, if the walk can read it. */
  const memberName = (
    node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
  ): string | undefined =>
    ts.isPropertyAccessExpression(node)
      ? node.name.text
      : literalOf(node.argumentExpression);

  /**
   * The receiver an INITIALIZER denotes, including through an operator: any
   * operand resolving to an outbound receiver makes the binding one, because a
   * receiver that is outbound on one path is outbound.
   *
   * THE COLLAPSE, 2026-08-24 (WR-27), AND IT IS THE HALF THAT STOPS THIS
   * RECURRING. This function used to carry its own conditional unwrapping — the
   * ONLY position that had one — and `receiverKind`, which it calls, did not. So
   * the sentence above was true of a `const` binding and false of the identical
   * expression written directly in call position. It is now a NAME for
   * `receiverKind`, kept rather than inlined at its three call sites because
   * "the receiver an INITIALIZER denotes" is the question those sites ask and the
   * name is the disclosure that the answer is now the same one call position gets.
   *
   * IT ALSO CORRECTS A PRECEDENCE THIS FUNCTION HAD TO ITSELF. The old body read
   * `receiverKind(whenTrue) ?? receiverKind(whenFalse)`, and `??` does not skip
   * `UNREADABLE_RECEIVER` — a symbol is neither `null` nor `undefined` — so an
   * unreadable LEFT branch shadowed a named RIGHT branch here and in no other
   * position. Measured before the collapse and pinned by a fixture after it.
   */
  const initializerReceiver = (node: ts.Expression): ReceiverKind =>
    receiverKind(node);

  /** Is this expression the global fetch, in any spelling the walk resolves? */
  const isFetchExpression = (node: ts.Expression): boolean => {
    const inner = unwrap(node);
    // CR-11, 2026-08-24 — the shared descent. `(ok && fetch)(url)` and
    // `const f = fetch ?? x; f(url)` reached no branch below.
    if (operatorOperandMatching(inner, isFetchExpression) !== undefined) {
      return true;
    }
    if (ts.isIdentifier(inner)) return fetchAliases.has(inner.text);
    if (
      ts.isPropertyAccessExpression(inner) ||
      ts.isElementAccessExpression(inner)
    ) {
      return (
        memberName(inner) === FETCH_GLOBAL && isGlobalReceiver(inner.expression)
      );
    }
    return false;
  };

  /**
   * THE LOCAL NAME A CALL'S CALLEE SPELLS WHEN THAT NAME IS THE GLOBAL FETCH —
   * THE BARE SPELLING ONLY.
   *
   * ADDED 2026-08-24 (CR-11), AND ITS EXISTENCE IS A FINDING RATHER THAN A
   * REFACTORING. Wiring the shared descent into `isFetchExpression` closed every
   * operator spelling of the global fetch EXCEPT ONE — `(ok && fetch)(url)`, which
   * is the very probe `isFetchExpression`'s own FALSIFIED_HANDOFFS entry was
   * carrying. Measured with the descent already wired, that shape still answered
   * `[]`. The reason is that the bare-call rule in the visit pass never consulted
   * `isFetchExpression` at all: it asked `ts.isIdentifier(callee) &&
   * fetchAliases.has(callee.text)` INLINE. That is a SIXTH copy of "is this the
   * global fetch", written where nobody was looking for one, and it is WR-27's
   * finding — one idea written N times and therefore existing N-1 times — found a
   * third time in this file by measurement rather than by reading.
   *
   * WHY IT IS NARROWER THAN `isFetchExpression` AND MUST STAY SO. That function
   * also answers TRUE for `globalThis.fetch`, and the member rule two branches up
   * already reports that spelling from the PropertyAccessExpression the walk
   * visits in its own right. Routing this rule through `isFetchExpression` would
   * therefore report `globalThis.fetch(url)` TWICE — a behaviour change dressed as
   * a collapse. The two questions are genuinely different; what they now SHARE is
   * the operator descent, which is the part that was copied.
   *
   * It answers the NAME rather than a boolean because the violation detail names
   * the local spelling (`a call to \`f(...)\``), which is the whole reason the
   * inline test read `callee.text` in the first place.
   */
  const bareFetchCallee = (node: ts.Expression): string | undefined => {
    const inner = unwrap(node);
    if (ts.isIdentifier(inner)) {
      return fetchAliases.has(inner.text) ? inner.text : undefined;
    }
    // CR-11, 2026-08-24 — the SAME shared descent the other five global resolvers
    // reach, so `(ok && fetch)(url)` resolves here exactly as
    // `(ok && globalThis).fetch(url)` resolves in `isGlobalReceiverIn`.
    const operand = operatorOperandMatching(
      inner,
      (candidate) => bareFetchCallee(candidate) !== undefined,
    );
    return operand === undefined ? undefined : bareFetchCallee(operand);
  };

  /**
   * Is this expression `navigator`, in any spelling the walk resolves?
   *
   * Deliberately shaped like `isFetchExpression`: the bare identifier and its
   * one-hop aliases, or a `navigator` member of one of the four global receivers.
   * An ordinary object that defines `sendBeacon` is not one of those, which is the
   * whole reason the beacon rule is anchored here rather than on the method name.
   */
  const isNavigatorReceiver = (node: ts.Expression): boolean => {
    const inner = unwrap(node);
    // CR-11, 2026-08-24 — the shared descent. `(ok && navigator).sendBeacon(u, d)`
    // and `const n = navigator ?? x; n.sendBeacon(u, d)` reached no branch below.
    if (operatorOperandMatching(inner, isNavigatorReceiver) !== undefined) {
      return true;
    }
    if (ts.isIdentifier(inner)) return navigatorAliases.has(inner.text);
    if (
      ts.isPropertyAccessExpression(inner) ||
      ts.isElementAccessExpression(inner)
    ) {
      return (
        memberName(inner) === NAVIGATOR && isGlobalReceiver(inner.expression)
      );
    }
    return false;
  };

  /**
   * THE GLOBAL AN EXPRESSION NAMES — DEFINED EXACTLY ONCE, CALLED FROM BOTH THE
   * CALL RULE AND THE `new` RULE.
   *
   * Added 2026-08-24 (WR-23). One definition of "this callee is `eval`, or
   * `Function`, or one of the outbound constructors", so a spelling added later
   * lands in both rules instead of in whichever one the fixture happened to
   * exercise. Closing the call half and leaving the `new` half open, two lines
   * apart, is how this file acquired the asymmetry CR-08 was.
   *
   * Returns the GLOBAL's name, never the local's, so both rules report the
   * surface rather than the spelling.
   */
  const globalNameOf = (node: ts.Expression): string | undefined => {
    const inner = unwrap(node);
    // CR-11, 2026-08-24 — the shared descent, and it serves BOTH rules that read
    // this one definition: `(ok && eval)(src)` and `new (ok && WebSocket)()` were
    // each silent, and the verifier found both while re-executing wave 28's
    // discharge table. The operand is re-asked rather than cached because the
    // descent answers WHICH OPERAND matched and each caller asks its own question
    // of it — see `operatorOperandMatching`.
    const operand = operatorOperandMatching(
      inner,
      (candidate) => globalNameOf(candidate) !== undefined,
    );
    if (operand !== undefined) return globalNameOf(operand);
    if (!ts.isIdentifier(inner)) return undefined;
    const name = inner.text;
    if (DYNAMIC_CODE.has(name) || OUTBOUND_CONSTRUCTORS.has(name)) {
      return shadowedGlobals.has(name) ? undefined : name;
    }
    return globalAliases.get(name);
  };

  /** Does this expression name `eval` or `Function`, bare or through one hop? */
  const dynamicCodeOf = (node: ts.Expression): string | undefined => {
    const global = globalNameOf(node);
    return global !== undefined && DYNAMIC_CODE.has(global)
      ? global
      : undefined;
  };

  /** Does this expression name an outbound constructor, bare or through one hop? */
  const outboundCtorOf = (node: ts.Expression): string | undefined => {
    const global = globalNameOf(node);
    return global !== undefined && OUTBOUND_CONSTRUCTORS.has(global)
      ? global
      : undefined;
  };

  /**
   * The global `eval`/`Function`/constructor an INITIALIZER denotes, in the three
   * spellings `fetchAliases` is grown from. Feeds `globalAliases` only.
   */
  const aliasedGlobalOf = (init: ts.Expression): string | undefined => {
    const inner = unwrap(init);
    // CR-11, 2026-08-24 — the shared descent, in INITIALIZER position:
    // `const e = eval ?? x; e(src)` grew no alias, so the initializer half of the
    // finding lived here as well as at the four call-position resolvers.
    const operand = operatorOperandMatching(
      inner,
      (candidate) => aliasedGlobalOf(candidate) !== undefined,
    );
    if (operand !== undefined) return aliasedGlobalOf(operand);
    if (ts.isIdentifier(inner)) {
      const name = inner.text;
      return (DYNAMIC_CODE.has(name) || OUTBOUND_CONSTRUCTORS.has(name)) &&
        !shadowedGlobals.has(name)
        ? name
        : globalAliases.get(name);
    }
    if (
      ts.isPropertyAccessExpression(inner) ||
      ts.isElementAccessExpression(inner)
    ) {
      const member = memberName(inner);
      if (
        member !== undefined &&
        (DYNAMIC_CODE.has(member) || OUTBOUND_CONSTRUCTORS.has(member)) &&
        isGlobalReceiver(inner.expression)
      ) {
        return member;
      }
    }
    return undefined;
  };

  /**
   * THE MEMBERS A DESTRUCTURE OFF A POSITIVELY IDENTIFIED RECEIVER BINDS —
   * DEFINED ONCE, REACHED FROM THE FLAT SPELLING AND FROM THE NESTED ONE.
   *
   * WR-37, 2026-08-24. `const { send } = sdk.requests` reported and
   * `const { requests } = sdk` reported, and the COMBINED spelling —
   * `const { requests: { send } } = sdk` — reported NOTHING, because the rule
   * below read a binding pattern exactly one level deep and skipped any element
   * whose own name was a pattern.
   *
   * WHY THIS ONE IS CLOSED AND ITS FIVE SIBLINGS ARE NOT, WHICH IS A DISTINCTION
   * ABOUT CLASS AND NOT ABOUT EFFORT. The nested destructure is a COMPOSITION of
   * two shapes this gate already resolves: the outer element names a receiver the
   * way `const { requests } = sdk` does, and the inner names are members of it the
   * way `const { send } = sdk.requests` are. Nothing new has to be decided. Its
   * five siblings — an array-slot receiver, an object-literal property, a class
   * field, a parameter default and a `for…of` binding — are each a GENUINE
   * WIDENING: each teaches the walk to read an initializer SHAPE it has never
   * read, each therefore needs its own real-tree measurement, and each is carried
   * as a MEASURED SILENCE row with an executed probe rather than closed here
   * without one.
   */
  const reportReceiverMembers = (
    pattern: ts.ObjectBindingPattern,
    kind: string,
  ): void => {
    for (const el of pattern.elements) {
      const property = boundPropertyName(el);
      if (property === undefined) {
        add(
          "outbound-unanalysable",
          `a destructure off a \`${kind}\` receiver whose property name this walk cannot read`,
        );
        continue;
      }
      if (kind === SEND_RECEIVER && REQUESTS_READ_ONLY.has(property)) continue;
      add(
        kind === NET_RECEIVER ? "outbound-net" : "outbound-send",
        `\`${property}\`, destructured from a \`${kind}\` receiver`,
      );
    }
  };

  const collect = (node: ts.Node): void => {
    // WR-23's negative side. A top-level `function Function(...)` / `class
    // WebSocket {}` binds that name for the whole module, so the bare call in
    // this file provably is not the global. Nested declarations prove nothing
    // about module scope in a scope-blind walk and are deliberately not read.
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name !== undefined &&
      node.parent === sf &&
      (DYNAMIC_CODE.has(node.name.text) ||
        OUTBOUND_CONSTRUCTORS.has(node.name.text))
    ) {
      shadowedGlobals.add(node.name.text);
    }

    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const init = unwrap(node.initializer);

      if (ts.isIdentifier(node.name)) {
        // `const m = "send"` / `const spec = "caido:http"` — one hop, no more.
        if (ts.isStringLiteralLike(init)) {
          bindString(node.name.text, init.text);
        }
        // `const k = "req" + "uests"` — the assembly the walk WATCHED. Read
        // against the numeric sets as they stand here; see `assembledNames`.
        if (isAssembledKey(init, numericNames, poisonedNumericNames)) {
          assembledNames.add(node.name.text);
        }
        // CR-13: `const k = b ? "requests" : "net"` — the operator initializer,
        // read through the descent the KEY site has always performed inline.
        // THE ASSIGNMENT SPELLING IS WIRED IN THE SAME PLAN, beside the CR-10
        // string binding below. Task 1 of plan 01-30 carried an interim note here
        // saying it was coming; task 2 wired it and deleted the note, because the
        // CR-10 correction eleven lines down is the record of what growing one
        // spelling and leaving its sibling costs.
        const operatorBinding = operatorLiteralBinding(
          init,
          literalsOf,
          assembledNames,
          numericNames,
          poisonedNumericNames,
        );
        if (operatorBinding !== undefined) {
          for (const literal of operatorBinding.literals) {
            bindString(node.name.text, literal);
          }
          if (operatorBinding.assembled) assembledNames.add(node.name.text);
        }
        if (isFetchExpression(init)) fetchAliases.add(node.name.text);
        if (isNavigatorReceiver(init)) navigatorAliases.add(node.name.text);
        // WR-23: `const e = eval` / `const F = globalThis.Function` — the same
        // declaration shape the two lines above already read, for the surface
        // they were written beside and that was given neither.
        const aliased = aliasedGlobalOf(init);
        if (aliased !== undefined) globalAliases.set(node.name.text, aliased);
        // IN-20: `const g = globalThis` — the receiver the two alias sets above
        // sit on, given the hop they already resolve.
        if (isGlobalReceiver(init)) globalThisAliases.add(node.name.text);
        const kind = initializerReceiver(init);
        if (typeof kind === "string") {
          receiverAliases.set(node.name.text, kind);
        } else if (kind === UNREADABLE_RECEIVER) {
          // Remember it; report where it is USED as a receiver. See the comment
          // on `unreadableAliases`.
          unreadableAliases.add(node.name.text);
        }
      } else if (ts.isObjectBindingPattern(node.name)) {
        // `const { requests, net } = sdk` — keyed on the PROPERTY name, exactly
        // as the inner method destructure already worked one level down. This is
        // ordinary TypeScript and it is what anyone writes who touches
        // `sdk.requests` twice in a function.
        for (const el of node.name.elements) {
          const property = boundPropertyName(el);
          if (property === undefined || !ts.isIdentifier(el.name)) continue;
          if (RECEIVERS.has(property)) {
            receiverAliases.set(el.name.text, property);
          }
          if (property === FETCH_GLOBAL && isGlobalReceiver(init)) {
            fetchAliases.add(el.name.text);
          }
          // WR-23: `const { eval: ev } = globalThis` — the destructure spelling,
          // anchored on the RECEIVER exactly as the `fetch` line above is, so an
          // ordinary object with an `eval` property grows nothing.
          if (
            (DYNAMIC_CODE.has(property) ||
              OUTBOUND_CONSTRUCTORS.has(property)) &&
            isGlobalReceiver(init)
          ) {
            globalAliases.set(el.name.text, property);
          }
          // IN-26: `const { k } = { k: "req" + "uests" }` — the destructure
          // spelling of the assembly the IDENTIFIER branch above already reads,
          // through the same `isAssembledKey` against the same numeric sets.
          // Both spellings are declarations; only one of them was read.
          if (
            isAssembledKey(
              destructuredInitializer(init, el, 0),
              numericNames,
              poisonedNumericNames,
            )
          ) {
            assembledNames.add(el.name.text);
          }
        }
      } else if (ts.isArrayBindingPattern(node.name)) {
        // IN-26's array twin. Positional rather than keyed, and read no further:
        // this branch exists for `const [k] = ["req" + "uests"]` and grows
        // NOTHING else — no receiver, no alias, no string binding. Widening any
        // of those is a separate decision with its own real-tree measurement,
        // and this one is scoped to the shape the residual header already
        // claimed was covered.
        node.name.elements.forEach((el, index) => {
          if (ts.isOmittedExpression(el) || !ts.isIdentifier(el.name)) return;
          if (
            isAssembledKey(
              destructuredInitializer(init, el, index),
              numericNames,
              poisonedNumericNames,
            )
          ) {
            assembledNames.add(el.name.text);
          }
        });
      }
    }

    // `let r; r = sdk.requests;` — the form the round-1 walk missed while
    // catching the `const` one, because it read declarations only.
    //
    // AND `let r; r ??= sdk.requests;` — CR-12, 2026-08-24. This test used to be
    // an INLINE COMPARISON against `EqualsToken` alone, while the numeric arm
    // eleven lines below read `ASSIGNMENT_OPERATORS` and named `x ||= sdk.requests`
    // in its own comment. It reads `ASSIGNING_OPERATORS` now, so the widening half
    // and the narrowing half of the same statement cannot disagree about which
    // assignments exist. THE BODY IS UNCHANGED: every collector below runs for the
    // widened population BY CONSTRUCTION, with no per-collector special case.
    //
    // THIS OPERATOR TEST IS POPULATION 3 IN THE COVERAGE GUARD'S OWN TERMS — "an
    // inline branch in `collect` or `visit`" — and it is named here rather than
    // left to be rediscovered. `enumerateResolverPopulations` reads DECLARED
    // resolvers and `RESOLVER_EXEMPTIONS`; it enumerates neither `collect` nor any
    // branch inside it, so this decision is UNREGISTERED. What covers it instead
    // is the fixtures below and the per-operator `BranchProbe`s on the eight
    // clauses it feeds. Rewriting `RESOLVER_EXEMPTIONS`' `collect` entry to say
    // the same thing is WR-33's finding and wave 32 owns it; a plan that silently
    // absorbed another plan's finding would make both harder to verify.
    if (
      ts.isBinaryExpression(node) &&
      ASSIGNING_OPERATORS.has(node.operatorToken.kind) &&
      ts.isIdentifier(node.left)
    ) {
      const kind = initializerReceiver(node.right);
      if (typeof kind === "string") {
        receiverAliases.set(node.left.text, kind);
      } else if (kind === UNREADABLE_RECEIVER) {
        unreadableAliases.add(node.left.text);
      }
      if (isFetchExpression(node.right)) fetchAliases.add(node.left.text);
      if (isNavigatorReceiver(node.right)) navigatorAliases.add(node.left.text);
      // WR-23: `let e; e = eval;` — the assignment spelling, grown from the same
      // shape as the two lines above for the same reason.
      const aliasedRight = aliasedGlobalOf(node.right);
      if (aliasedRight !== undefined) {
        globalAliases.set(node.left.text, aliasedRight);
      }
      // IN-20, the assignment spelling of `const g = globalThis`.
      if (isGlobalReceiver(node.right)) globalThisAliases.add(node.left.text);
      // `let k; k = "req" + "uests";` — the assignment spelling of the same
      // assembly.
      // THE CLAIM THAT STOOD HERE WAS FALSE AND IS CORRECTED 2026-08-24 (CR-10).
      // It said this spelling was "covered by construction rather than by a
      // second edit". The WRITE was covered by construction; the READ was not.
      // `keyReceiver` consulted the declaration's stale literal first and
      // returned, so this line was UNREACHABLE for any name whose declaration
      // carried a string initializer — `let k = "harmless"; k = "req"+"uests";
      // sdk[k].send(req)` was silent while `let k; k = "req"+"uests"` reported.
      // Covered by construction is a claim about the whole path, and this branch
      // only ever owned half of it. It is reachable now because the literal
      // lookup no longer early-returns and because a watched assembly takes
      // precedence over a literal binding of the same name.
      if (isAssembledKey(node.right, numericNames, poisonedNumericNames)) {
        assembledNames.add(node.left.text);
      }
      // CR-10: `k = "requests"` — the STRING the assignment binds. This branch
      // grew every OTHER set from its right-hand side and never this one, which
      // is why a declaration's harmless first literal outlived every rebinding
      // of the same name.
      const assignedString = unwrap(node.right);
      if (ts.isStringLiteralLike(assignedString)) {
        bindString(node.left.text, assignedString.text);
      }
      // CR-13's assignment spelling: `let k; k = b ? "requests" : "net"`. It
      // lands HERE, beside the CR-10 correction directly above, and in the SAME
      // PLAN as the declaration spelling. That paragraph is this file's own
      // record of what closing one spelling and leaving its sibling open costs —
      // a declaration's harmless first literal outliving every rebinding — and
      // repeating it a few lines further down would be the same defect with a
      // fresher date on it.
      const assignedOperator = operatorLiteralBinding(
        node.right,
        literalsOf,
        assembledNames,
        numericNames,
        poisonedNumericNames,
      );
      if (assignedOperator !== undefined) {
        for (const literal of assignedOperator.literals) {
          bindString(node.left.text, literal);
        }
        if (assignedOperator.assembled) assembledNames.add(node.left.text);
      }
    }

    // `let k = "req"; k += "uests";` — A COMPOUND ASSIGNMENT IS AN ASSEMBLY.
    //
    // CR-10, and the sibling gate one directory away learned this exact lesson
    // first: `store/error-redaction.spec.ts` matched `PlusToken` only until
    // WR-17 widened it to `PlusEqualsToken`, on the argument that the ACCUMULATE
    // idiom is one token from a form already covered and produces the same
    // value. It is the same argument here. `k += "uests"` builds a string out of
    // pieces exactly as `k = k + "uests"` does, and this file's own header
    // claimed the assignment spelling was covered by construction.
    //
    // GUARDED BY THE SAME NUMERIC TEST THE POISONING ARM BELOW ALREADY USES, so
    // an ordinary integer accumulator stays exempt: `i += 1` is an index, not a
    // name. `isProvablyNumeric` reads the numeric sets AS THEY STAND HERE, which
    // is the identical posture the declaration-side `isAssembledKey` call takes.
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken &&
      ts.isIdentifier(node.left) &&
      !isProvablyNumeric(node.right, numericNames, poisonedNumericNames)
    ) {
      assembledNames.add(node.left.text);
    }

    // --- what the walk knows about a name being a NUMBER ---------------------
    // Collected in the same document-order pass, and poisoned by ANY binding the
    // walk cannot prove numeric — a name is exempt only if every binding of it in
    // the file is a number. This is what the numeric key exemption reads.
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (
        node.initializer !== undefined &&
        isProvablyNumeric(node.initializer, numericNames, poisonedNumericNames)
      ) {
        numericNames.add(node.name.text);
      } else {
        poisonedNumericNames.add(node.name.text);
      }
    }
    if (ts.isBinaryExpression(node) && ts.isIdentifier(node.left)) {
      const op = node.operatorToken.kind;
      const rightIsNumber = isProvablyNumeric(
        node.right,
        numericNames,
        poisonedNumericNames,
      );
      if (op === ts.SyntaxKind.EqualsToken) {
        if (rightIsNumber) numericNames.add(node.left.text);
        else poisonedNumericNames.add(node.left.text);
      } else if (op === ts.SyntaxKind.PlusEqualsToken) {
        // `i += 1` leaves a numeric name numeric; `s += "requests"` does not.
        if (!rightIsNumber) poisonedNumericNames.add(node.left.text);
      } else if (
        ASSIGNMENT_OPERATORS.has(op) &&
        !NUMERIC_COMPOUND_ASSIGNMENTS.has(op)
      ) {
        // `x ||= sdk.requests` and friends can assign anything at all.
        poisonedNumericNames.add(node.left.text);
      }
    }

    ts.forEachChild(node, collect);
  };
  collect(sf);

  const visit = (node: ts.Node): void => {
    // --- static import and `export ... from` ---------------------------------
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      literalOf(node.moduleSpecifier) === HTTP_SPECIFIER
    ) {
      add(
        "outbound-import",
        ts.isImportDeclaration(node)
          ? "a static import"
          : "an `export ... from`",
      );
    }

    // --- a member destructured off an identified receiver ---------------------
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer !== undefined &&
      ts.isObjectBindingPattern(node.name)
    ) {
      if (isNavigatorReceiver(node.initializer)) {
        for (const el of node.name.elements) {
          const property = boundPropertyName(el);
          if (property === undefined) {
            add(
              "outbound-unanalysable",
              `a destructure off a \`${NAVIGATOR}\` receiver whose property name this walk cannot read`,
            );
          } else if (property === BEACON_METHOD) {
            add(
              "outbound-beacon",
              `\`${property}\`, destructured from a \`${NAVIGATOR}\` receiver`,
            );
          }
        }
      }
      const kind = initializerReceiver(node.initializer);
      if (kind === UNREADABLE_RECEIVER) {
        add(
          "outbound-unanalysable",
          "a destructure off an element access whose key this walk cannot read, so the receiver it selects could be `requests` or `net`",
        );
      } else if (kind !== undefined) {
        reportReceiverMembers(node.name, kind);
      } else {
        // WR-37, 2026-08-24 — THE NESTED SPELLING. The initializer is not itself
        // a receiver (`sdk` is not), but an ELEMENT of the pattern names one the
        // same way `const { requests } = sdk` does, and that element's own name is
        // a pattern whose members are members of it. Both halves already resolved;
        // only their composition did not.
        for (const el of node.name.elements) {
          const property = boundPropertyName(el);
          if (
            property !== undefined &&
            ts.isObjectBindingPattern(el.name) &&
            RECEIVERS.has(property)
          ) {
            reportReceiverMembers(el.name, property);
          }
        }
      }
    }

    // --- ANY member of a positively identified receiver -----------------------
    // A member REFERENCE, not only a call. That is the single change that catches
    // `.call`, `.apply`, `Reflect.apply`, `const s = sdk.requests.send` and the
    // arrow-returned `g()(req)` together: each MENTIONS the member somewhere even
    // though none of them calls it directly.
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const kind = receiverKind(node.expression);
      const member = memberName(node);
      if (kind === UNREADABLE_RECEIVER) {
        // WR-19: boundary 2's own rule, applied to the RECEIVER. The walk can see
        // that a property is being selected by a key it cannot read, and that the
        // result is then being used as a receiver — so it says so, rather than
        // treating an unreadable receiver as an ordinary object.
        add(
          "outbound-unanalysable",
          member === undefined
            ? "a computed member on a receiver this walk cannot read either"
            : `a reference to \`${member}\` on a receiver selected by a key this walk cannot read`,
        );
      } else if (kind === SEND_RECEIVER || kind === NET_RECEIVER) {
        if (member === undefined) {
          add(
            "outbound-unanalysable",
            `a computed member access on an identified \`${kind}\` receiver`,
          );
        } else if (kind === NET_RECEIVER) {
          add(
            "outbound-net",
            `a reference to \`${member}\` on a \`${NET_RECEIVER}\` receiver`,
          );
        } else if (!REQUESTS_READ_ONLY.has(member)) {
          add(
            "outbound-send",
            `a reference to \`${member}\` on a \`${SEND_RECEIVER}\` receiver`,
          );
        }
      } else if (member === FETCH_GLOBAL && isGlobalReceiver(node.expression)) {
        add(
          "outbound-fetch",
          `a \`${FETCH_GLOBAL}\` member of \`${unwrap(node.expression).getText()}\``,
        );
      } else if (
        member !== undefined &&
        ts.isIdentifier(unwrap(node.expression)) &&
        isFetchExpression(node.expression)
      ) {
        // CR-15, 2026-08-25, wave 34 — THE RECEIVER-POSITION ARM, AND IT WIDENS
        // ONE MECHANISM RATHER THAN ENDING A CLASS. `fetch.call(null, url)` and
        // `const f = fetch; f.call(null, url)` reached no arm above: each names
        // the fetch surface as a RECEIVER and the arm that reports that surface
        // reads the MEMBER. The receiver is asked the same question here that
        // `isFetchExpression` already answers for a callee, so the answer is the
        // GLOBAL's surface rather than the local spelling — the rule
        // `globalNameOf`'s docblock sets for the two rules that read it.
        //
        // THE IDENTIFIER RESTRICTION IS LOAD-BEARING, NOT TIDINESS. Without it
        // `globalThis.fetch.call(url)` reports TWICE: once from the arm above on
        // the inner `globalThis.fetch`, and again here on the outer node. A
        // member-qualified receiver is already answered one visit down, so this
        // arm takes only the spelling that writes the global as a bare name.
        //
        // WHAT IT DOES NOT REACH IS ROWED, NOT ASSUMED. The argument-position
        // shape and the unreadable-member spelling of this same receiver stay
        // silent after this arm and each carries its own registry row.
        add(
          "outbound-fetch",
          `a reference to \`${member}\` on the global \`${FETCH_GLOBAL}\``,
        );
      } else if (
        member === BEACON_METHOD &&
        isNavigatorReceiver(node.expression)
      ) {
        add(
          "outbound-beacon",
          `a reference to \`${BEACON_METHOD}\` on a \`${NAVIGATOR}\` receiver`,
        );
      } else if (
        member !== undefined &&
        DYNAMIC_CODE.has(member) &&
        isGlobalReceiver(node.expression)
      ) {
        add(
          "outbound-dynamic-code",
          `a reference to \`${member}\` on a global receiver`,
        );
      } else if (
        member !== undefined &&
        ts.isIdentifier(unwrap(node.expression)) &&
        dynamicCodeOf(node.expression) !== undefined
      ) {
        // CR-15's SECOND branch, 2026-08-25, wave 34, and it is a second decision
        // rather than a footnote on the first. `eval.call(null, src)` and
        // `Function.call(null, src)` resolve through `dynamicCodeOf`, not through
        // `isFetchExpression`, so the fetch arm above answers nothing for them and
        // they were measured separately, dispositioned separately and rowed
        // separately. Reports the GLOBAL's name rather than the local spelling,
        // which is the rule `globalNameOf`'s docblock sets for both rules that
        // read it. The identifier restriction is here for the same reason it is
        // on the fetch arm: `globalThis.eval.call(src)` is already answered one
        // visit down and would otherwise report twice.
        add(
          "outbound-dynamic-code",
          `a reference to \`${member}\` on the global \`${dynamicCodeOf(node.expression) ?? ""}\``,
        );
      } else if (
        member !== undefined &&
        OUTBOUND_CONSTRUCTORS.has(member) &&
        isGlobalReceiver(node.expression)
      ) {
        add(
          "outbound-global-ctor",
          `a reference to \`${member}\` on a global receiver`,
        );
      } else if (
        member === undefined &&
        (isGlobalReceiver(node.expression) ||
          isNavigatorReceiver(node.expression))
      ) {
        // CR-16, 2026-08-25, wave 34 — `navigator` JOINS THE RECEIVERS THIS ARM
        // ACCEPTS, and that is the whole of the change. Before it, `const m =
        // "send" + "Beacon"; navigator[m](u, d)` fell through the entire chain:
        // the beacon arm above tests the MEMBER name and there is none to test,
        // and this arm accepted only the four global receivers. The identical
        // shape on `globalThis`, on `window`, on an identified send receiver AND
        // on a navigator DESTRUCTURE twenty lines away all reported already, so
        // the machinery existed and one receiver family was not reaching it.
        //
        // WHAT IT DOES NOT REACH IS ROWED. A member whose key is a function
        // PARAMETER stays silent after this arm for the reason
        // `silence-parameter-key` already records — the key is never bound at
        // all, so nothing marks it unreadable. That is an existing mechanism and
        // it is cross-referenced rather than given a duplicate row.
        //
        // The other half of WR-19, and the sharper of the two shapes:
        // `globalThis["fet" + "ch"](u)`. The receiver is POSITIVELY identified —
        // `isGlobalReceiver` says so — and the member name is the part that will
        // not reduce, so the global branches above simply never ran and the file
        // reported clean.
        add(
          "outbound-unanalysable",
          `a computed member of \`${unwrap(node.expression).getText()}\` whose name this walk cannot read`,
        );
      }
    }

    // --- construction of an outbound global -----------------------------------
    if (ts.isNewExpression(node)) {
      const target = unwrap(node.expression);
      // WR-23, the CONSTRUCTOR half — closed in the same commit as the call half
      // and through the SAME lookup. `const W = WebSocket; new W(url)` and
      // `const F = Function; new F("a", s)` were the identical gap two lines
      // apart; fixing one and not the other is the asymmetry this file keeps
      // acquiring.
      const ctor = outboundCtorOf(target);
      if (ctor !== undefined) {
        add("outbound-global-ctor", constructionDetail(target, ctor));
      }
      const dynamicNew = dynamicCodeOf(target);
      if (dynamicNew !== undefined) {
        add("outbound-dynamic-code", constructionDetail(target, dynamicNew));
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = unwrap(node.expression);

      // --- dynamic import() and require() ------------------------------------
      if (
        callee.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(callee) && callee.text === "require")
      ) {
        const how =
          callee.kind === ts.SyntaxKind.ImportKeyword
            ? "a dynamic import()"
            : "a require()";
        const specifier = literalOf(node.arguments[0]);
        if (specifier === HTTP_SPECIFIER) {
          add("outbound-import", how);
        } else if (specifier === undefined) {
          add(
            "outbound-unanalysable",
            `${how} whose specifier this walk cannot reduce to a literal`,
          );
        }
      }

      // --- the global fetch, by name or by alias ------------------------------
      // CR-11, 2026-08-24: this test used to be written INLINE as
      // `ts.isIdentifier(callee) && fetchAliases.has(callee.text)`, which is why
      // `(ok && fetch)(url)` stayed silent after the shared descent was wired into
      // `isFetchExpression`. It reads `bareFetchCallee` now — see that function's
      // docblock for why it is narrower than `isFetchExpression` and must stay so.
      const bareFetch = bareFetchCallee(callee);
      if (bareFetch !== undefined) {
        add("outbound-fetch", `a call to \`${bareFetch}(...)\``);
      }

      // --- code built from a string ------------------------------------------
      // WR-23: `dynamicCodeOf`, not a bare `DYNAMIC_CODE.has`, so a bound `eval`
      // is the same kind of fact as a bound `fetch` one branch up.
      const dynamic = dynamicCodeOf(callee);
      if (dynamic !== undefined) {
        add("outbound-dynamic-code", callDetail(callee, dynamic));
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sf);

  return violations;
}

// ---------------------------------------------------------------------------
// THE DERIVED RESIDUAL — A REGISTRY, A GENERATOR, AN EXTRACTOR
// ---------------------------------------------------------------------------
//
// WHY THIS EXISTS. The residual above was AUTHORED — a person read the branches
// once and wrote a sentence. That produced a bound which was wrong in five
// consecutive rounds (CR-08, CR-09, CR-10, WR-27, WR-30), every time because
// nothing in the repository could tell the sentence from the code. The three
// declarations below replace the mechanism rather than the sentence:
//
//   RESOLVER_REGISTRY  binds a CLAIM to the CODE — every row carries a probe and
//                      a counter-probe that are executed through `auditSource`.
//   deriveResidual     renders the residual text from that registry alone.
//   extractDerivedBlock pulls the shipped span out of a file's own bytes so the
//                      shipped text can be compared to the rendered text.
//
// WHAT IT STILL CANNOT DO IS STATED IN THE GENERATED TEXT ITSELF, not only here,
// so it travels to every surface the block feeds.

/**
 * ONE RECORD PER MECHANISM THE WALK CONSULTS, AND PER SILENCE THIS FILE ASSERTS.
 *
 * `expect` and `counterExpect` are typed against `RuleId`, which is
 * `keyof typeof RULES` — so a mistyped rule identifier is a COMPILE error rather
 * than a wrong sentence. That is the same construction `RULES` itself uses and
 * the reason `FORBIDDEN_OUTBOUND` is derived from `RULES` rather than written
 * beside it.
 *
 * `counterExpect` is an explicit list rather than a hardcoded empty one, and that
 * is a FINDING recorded rather than a preference: three mechanisms in this file —
 * `shadowedGlobals`, `numericNames` and `isProvablyNumeric` — NARROW the walk, so
 * their probe is the shape that stays QUIET and their counter-probe is the shape
 * that REPORTS. A registry that hardcoded "the counter-probe produces none" could
 * not express them and would have had to leave them out, which is how a register
 * of mechanisms acquires its first blind spot. What is asserted instead is that a
 * row's two directions DIFFER: a row whose probe and counter-probe answer the
 * same thing proves nothing about the mechanism it names.
 *
 * `site` is a GREPPABLE ANCHOR, not a line number. Line numbers go stale on the
 * first edit above them — this very block shifted every number in this file when
 * it landed — and a stale provenance note is worse than none, because it reads as
 * checked. The anchor is asserted to occur in this file's own source, so a row
 * whose provenance stops existing is a failing test rather than a dead reference.
 */
/**
 * ONE CLAUSE-NAMED BRANCH, WITH ITS OWN EXECUTED PROBE.
 *
 * THE THIRD BINDING, ADDED 2026-08-24 (WR-32). The two bindings that already
 * existed are real and were mutation-proved by the verifier: the shipped TEXT is
 * bound to the REGISTRY by bytes, and each row's PROBE is bound to the walk by
 * execution. The third did not exist. A row's `clause` was hand-written prose
 * that no assertion read, and the verifier proved it by deleting the
 * compound-assignment assembly branch — a branch `assembledNames`' clause names
 * in so many words — and watching the entire derived block stay at 52 passed, 0
 * failed. Only a hand-written fixture 1,400 lines away went red.
 *
 * WHY THIS IS `branches` WITH A `names` FIELD AND NOT A FLAT `probes` ARRAY, AND
 * A LATER AUTHOR MUST NOT SIMPLIFY IT BACK. The cheaper repair WR-32 offered was
 * a flat list of extra probes per row. A flat array proves that N probes RUN. It
 * does not prove they CORRESPOND to the N branches the CLAUSE names, and the
 * correspondence is the whole finding — each row's single probe already happened
 * to exercise one branch, and that is exactly what stayed green under the
 * mutation. `names` carries the clause phrase VERBATIM, which is what lets
 * `BRANCH_VOCABULARY` turn "this clause names that branch" into a string test
 * rather than a reading. Collapsing `branches` into an unnamed list would delete
 * the guard and keep the tests, which is the shape of every finding in this
 * phase.
 *
 * `anchor` follows `site`'s convention exactly, and for the same reason: line
 * numbers go stale on the first edit above them, so the anchor is greppable text
 * asserted to occur at the START of a trimmed line in this file.
 */
export type BranchProbe = {
  /**
   * The clause phrase this branch answers, spelled EXACTLY as `BRANCH_VOCABULARY`
   * spells it. Equality, not paraphrase — a paraphrase is a reading, and a
   * reading is what this mechanism exists to replace.
   */
  readonly names: string;
  /** A greppable anchor for THIS branch's own code site, in `site`'s convention. */
  readonly anchor: string;
  /** A source string exercising THAT branch and no other. */
  readonly probe: string;
  /** What `auditSource` reports for `probe`. MEASURED, never predicted. */
  readonly expect: readonly RuleId[];
};

export type ResolverRecord = {
  /** The mechanism's identifier EXACTLY as it is spelled in the code. */
  readonly id: string;
  /** Whether this row names a resolver, or a silence the file measures and pins. */
  readonly kind: "resolver" | "measured-silence";
  /** One mechanical clause saying what it reads. Read off the branch, not off prose. */
  readonly clause: string;
  /** A greppable anchor naming the code site the clause was read from. */
  readonly site: string;
  /** A source string exercising the mechanism. */
  readonly probe: string;
  /** What `auditSource` reports for `probe`. MEASURED, never predicted. */
  readonly expect: readonly RuleId[];
  /** The neighbouring shape that must answer DIFFERENTLY. */
  readonly counterProbe: string;
  /** What `auditSource` reports for `counterProbe`. MEASURED, never predicted. */
  readonly counterExpect: readonly RuleId[];
  /**
   * One entry per branch this row's CLAUSE names. OPTIONAL on the type and
   * REQUIRED on resolvers by the guard below, which states why the two kinds are
   * treated differently rather than leaving a reader to infer it from which rows
   * happen to carry one.
   */
  readonly branches?: readonly BranchProbe[];
};

/**
 * THE REGISTRY. Every row was read off its own branch and every row is executed.
 *
 * A ROW TRANSCRIBED FROM THE RESIDUAL PARAGRAPH WOULD BE THE DEFECT INSTALLED AS
 * THE FIX — it would inherit the paragraph's errors and give them a mechanical
 * blessing. The probes below were RUN before they were written down, and where a
 * prediction disagreed with the measurement the measurement won and the
 * disagreement is recorded in `01-27-SUMMARY.md`.
 */
export const RESOLVER_REGISTRY: readonly ResolverRecord[] = Object.freeze([
  Object.freeze({
    id: "constStrings",
    kind: "resolver",
    clause:
      'a receiver or global KEY resolves when a string literal bound at a string-literal declaration, a string-literal assignment, a logical assignment or an operator initializer names an outbound receiver; bindings are file-wide and ANY-BINDING-WINS, so this collector OVER-approximates. FALSIFIED 2026-08-24 (CR-13), the phrase this clause used to carry: "ANY string literal the name is bound to anywhere in the file" - measured, a conditional, ?? or || initializer bound a literal neither this collector nor literalsOf read; that shape is CLOSED 2026-08-24 by operatorLiteralBinding and the branch below is its probe; the string-literal assignment branch has since 2026-08-24 (CR-12) read ASSIGNING_OPERATORS, so the three logical spellings bind through it too; and the phrase STAYS falsified because a parameter, a loop binding, a name bound in another file and a second hop of key each still bind nothing',
    site: "auditSource > const constStrings = new Map<string, Set<string>>()",
    probe: 'const r = "requests";\nsdk[r].send(req);',
    expect: Object.freeze(["outbound-send"] as const),
    counterProbe: 'const r = "harmless";\nsdk[r].send(req);',
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a string-literal declaration",
        anchor: "auditSource > collect > if (ts.isStringLiteralLike(init)) {",
        probe: 'const r = "requests";\nsdk[r].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "a string-literal assignment",
        anchor:
          "auditSource > collect > if (ts.isStringLiteralLike(assignedString)) {",
        probe: 'let r;\nr = "requests";\nsdk[r].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        // CR-13, closed 2026-08-24. The third binding shape that reaches
        // `bindString`, and the one whose absence made this clause's universal
        // false: the literals an operator initializer carries. BOTH SPELLINGS,
        // declaration and assignment, are wired in one plan — the row's
        // `an operator initializer` phrase covers the shape and the
        // operatorLiteralBinding row's own `a declaration` / `an assignment`
        // branches cover the two wiring sites.
        names: "an operator initializer",
        anchor:
          "auditSource > collect > for (const literal of operatorBinding.literals) {",
        probe: 'const k = b ? "requests" : "net";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      // CR-12, closed 2026-08-24. ONE PHRASE, THREE SPELLINGS, anchored at the
      // SET MEMBERS rather than at the shared branch opening so a mutation that
      // removes ONE operator turns ONE case red BY NAME. Each probe was RUN
      // before its `expect` was written down.
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken,",
        probe: 'let k;\nk ??= "requests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken,",
        probe: 'let k;\nk ||= "requests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken,",
        probe: 'let k;\nk &&= "requests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "assembledNames",
    kind: "resolver",
    clause:
      'a name the walk WATCHED being assembled - at a declaration, an assignment, a `+=` compound assignment, a logical assignment, or either binding-pattern spelling - is an UNREADABLE key, and takes precedence over a literal binding of the same name. FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "a compound assignment" - measured, the logical-assignment spellings ||=, &&= and ??= grew nothing; those three are CLOSED 2026-08-24 by ASSIGNING_OPERATORS and the three branches below are their probes, and the phrase STAYS falsified because the NUMERIC compound assignments (-=, *=, >>>= and the rest of NUMERIC_COMPOUND_ASSIGNMENTS) deliberately assemble nothing',
    site: "auditSource > const assembledNames = new Set<string>()",
    probe: 'const k = "req" + "uests";\nsdk[k].send(req);',
    expect: Object.freeze(["outbound-unanalysable"] as const),
    counterProbe: "let i = 0;\ni += 1;\nsdk[i].send(req);",
    counterExpect: Object.freeze([] as const),
    // THE ROW THE VERIFIER FALSIFIED. Its clause enumerates FOUR branch phrases
    // and its single probe above exercises ONE of them. Every phrase below was
    // read off its own code site and every probe was RUN before its `expect` was
    // written down.
    branches: Object.freeze([
      Object.freeze({
        names: "a declaration",
        anchor:
          "auditSource > collect > if (isAssembledKey(init, numericNames, poisonedNumericNames)) {",
        probe: 'const k = "req" + "uests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      Object.freeze({
        names: "an assignment",
        anchor:
          "auditSource > collect > if (isAssembledKey(node.right, numericNames, poisonedNumericNames)) {",
        probe: 'let k;\nk = "req" + "uests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      Object.freeze({
        // THE BRANCH THE VERIFIER DELETED. Guarded by the numeric test, which is
        // why this probe accumulates a STRING and why the row's counter-probe
        // (`i += 1`) is the control that keeps that guard honest.
        names: "a `+=` compound assignment",
        anchor:
          "auditSource > collect > node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken &&",
        probe: 'let k = "re";\nk += "quests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      Object.freeze({
        // ONE PHRASE, TWO SPELLINGS — the clause says "either", so both the
        // object and the array branch answer it and both are executed.
        names: "either binding-pattern spelling",
        anchor: "auditSource > collect > destructuredInitializer(init, el, 0),",
        probe: 'const { k } = { k: "req" + "uests" };\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      Object.freeze({
        names: "either binding-pattern spelling",
        anchor:
          "auditSource > collect > destructuredInitializer(init, el, index),",
        probe: 'const [k] = ["req" + "uests"];\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      // CR-12, closed 2026-08-24. DISTINCT FROM THE `+=` BRANCH ABOVE AND THAT
      // DISTINCTION IS THE POINT: `+=` has its OWN opening, its OWN numeric guard
      // and its own anchor, and it is the branch the verifier deleted to prove
      // WR-32. These three reach `isAssembledKey(node.right, ...)` through the
      // WIDENED alias branch instead, so deleting either one leaves the other
      // green and the clause names both.
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken,",
        probe: 'let k;\nk ??= "req" + "uests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken,",
        probe: 'let k;\nk ||= "req" + "uests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken,",
        probe: 'let k;\nk &&= "req" + "uests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "receiverAliases",
    kind: "resolver",
    clause:
      'a name bound to an outbound RECEIVER expression at a declaration, an assignment or a logical assignment is that receiver everywhere in the file; grown from the LIVE set during the collect pass, so a chain resolves to any depth in DECLARATION order. FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "a name bound to an outbound RECEIVER expression" without qualification - measured, a logical-assignment binding grew nothing; that shape is CLOSED 2026-08-24 by ASSIGNING_OPERATORS and the three branches below are its probes, and the phrase STAYS falsified because a parameter, a loop binding, a name bound in another file, a binding written in inverted order and a MEMBER target (o.r ??= sdk.requests) each still grow nothing',
    site: "auditSource > const receiverAliases = new Map<string, string>()",
    probe: "const r = sdk.requests;\nr.send(req);",
    expect: Object.freeze(["outbound-send"] as const),
    counterProbe: "const r = sdk.other;\nr.send(req);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a declaration",
        anchor:
          "auditSource > collect > receiverAliases.set(node.name.text, kind);",
        probe: "const r = sdk.requests;\nr.send(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "an assignment",
        anchor:
          "auditSource > collect > receiverAliases.set(node.left.text, kind);",
        probe: "let r;\nr = sdk.requests;\nr.send(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
      // CR-12, closed 2026-08-24. ONE PHRASE, THREE SPELLINGS, and the anchors
      // are the SET MEMBERS rather than the shared branch opening ON PURPOSE:
      // three probes sharing one anchor would render three cases with the SAME
      // title, and a mutation that removes ONE operator could not then be told
      // apart from one that removed the branch. Anchored this way, deleting
      // `BarBarEqualsToken` from ASSIGNING_OPERATORS turns the `||=` case red BY
      // NAME while the other two stay green — which is what makes the proof
      // per-OPERATOR rather than per-set.
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken,",
        probe: "let r;\nr ??= sdk.requests;\nr.send(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken,",
        probe: "let r;\nr ||= sdk.requests;\nr.send(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken,",
        probe: "let r;\nr &&= sdk.requests;\nr.send(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "unreadableAliases",
    kind: "resolver",
    clause:
      "a name bound to a receiver EXPRESSION the walk could not read is reported where the name is USED as a receiver, not where it was bound - so an ordinary dynamic lookup never used as a receiver stays quiet",
    site: "auditSource > const unreadableAliases = new Set<string>()",
    probe: 'const r = sdk["req" + "uests"];\nr.send(req);',
    expect: Object.freeze(["outbound-unanalysable"] as const),
    counterProbe: 'const v = record["na" + "me"];\nconsole.log(v);',
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "where the name is USED as a receiver",
        anchor:
          "auditSource > receiverKind > return unreadableAliases.has(inner.text)",
        probe: 'const k = "a" + b;\nconst r = sdk[k];\nr.send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "fetchAliases",
    kind: "resolver",
    clause:
      "a name bound to the global fetch at a declaration, an assignment or a logical assignment is the global fetch; seeded with the bare spelling and grown from the live set, so it chains in declaration order",
    site: "auditSource > const fetchAliases = new Set<string>([FETCH_GLOBAL])",
    probe: "const f = fetch;\nf(url);",
    expect: Object.freeze(["outbound-fetch"] as const),
    counterProbe: "const f = cache.fetch;\nf(url);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "the bare spelling",
        anchor:
          "auditSource > const fetchAliases = new Set<string>([FETCH_GLOBAL]);",
        probe: "fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      Object.freeze({
        names: "a declaration",
        anchor:
          "auditSource > collect > if (isFetchExpression(init)) fetchAliases.add(node.name.text);",
        probe: "const f = fetch;\nf(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      Object.freeze({
        names: "an assignment",
        anchor:
          "auditSource > collect > if (isFetchExpression(node.right)) fetchAliases.add(node.left.text);",
        probe: "let f;\nf = fetch;\nf(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      // CR-12, closed 2026-08-24. ONE PHRASE, THREE SPELLINGS, anchored at the
      // SET MEMBERS rather than at the shared branch opening so a mutation that
      // removes ONE operator turns ONE case red BY NAME. Each probe was RUN
      // before its `expect` was written down.
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken,",
        probe: "let f;\nf ??= fetch;\nf(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken,",
        probe: "let f;\nf ||= fetch;\nf(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken,",
        probe: "let f;\nf &&= fetch;\nf(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "navigatorAliases",
    kind: "resolver",
    clause:
      "a name bound to navigator at a declaration, an assignment or a logical assignment is navigator; RECEIVER-ANCHORED, so an ordinary object defining a method of the same name grows nothing",
    site: "auditSource > const navigatorAliases = new Set<string>([NAVIGATOR])",
    probe: "const n = navigator;\nn.sendBeacon(u, d);",
    expect: Object.freeze(["outbound-beacon"] as const),
    counterProbe:
      "const o = { sendBeacon(u, d) { return d; } };\no.sendBeacon(u, d);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a declaration",
        anchor:
          "auditSource > collect > if (isNavigatorReceiver(init)) navigatorAliases.add(node.name.text);",
        probe: "const n = navigator;\nn.sendBeacon(url);",
        expect: Object.freeze(["outbound-beacon"] as const),
      }),
      Object.freeze({
        names: "an assignment",
        anchor:
          "auditSource > collect > if (isNavigatorReceiver(node.right)) navigatorAliases.add(node.left.text);",
        probe: "let n;\nn = navigator;\nn.sendBeacon(url);",
        expect: Object.freeze(["outbound-beacon"] as const),
      }),
      // CR-12, closed 2026-08-24. ONE PHRASE, THREE SPELLINGS, anchored at the
      // SET MEMBERS rather than at the shared branch opening so a mutation that
      // removes ONE operator turns ONE case red BY NAME. Each probe was RUN
      // before its `expect` was written down.
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken,",
        probe: "let n;\nn ??= navigator;\nn.sendBeacon(url);",
        expect: Object.freeze(["outbound-beacon"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken,",
        probe: "let n;\nn ||= navigator;\nn.sendBeacon(url);",
        expect: Object.freeze(["outbound-beacon"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken,",
        probe: "let n;\nn &&= navigator;\nn.sendBeacon(url);",
        expect: Object.freeze(["outbound-beacon"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "globalAliases",
    kind: "resolver",
    clause:
      "a name bound to eval, Function or an outbound constructor at a declaration, an assignment, a logical assignment or the object binding-pattern spelling maps to the global it names, so the violation detail can name the surface the local aliases; RECEIVER-ANCHORED off the four global receivers",
    site: "auditSource > const globalAliases = new Map<string, string>()",
    probe: "const e = eval;\ne(src);",
    expect: Object.freeze(["outbound-dynamic-code"] as const),
    counterProbe:
      "const o = { eval(s) { return s; } };\nconst e = o.eval;\ne(src);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a declaration",
        anchor:
          "auditSource > collect > if (aliased !== undefined) globalAliases.set(node.name.text, aliased);",
        probe: "const e = eval;\ne(src);",
        expect: Object.freeze(["outbound-dynamic-code"] as const),
      }),
      Object.freeze({
        names: "an assignment",
        anchor:
          "auditSource > collect > globalAliases.set(node.left.text, aliasedRight);",
        probe: "let e;\ne = eval;\ne(src);",
        expect: Object.freeze(["outbound-dynamic-code"] as const),
      }),
      Object.freeze({
        names: "the object binding-pattern spelling",
        anchor:
          "auditSource > collect > globalAliases.set(el.name.text, property);",
        probe: "const { eval: ev } = globalThis;\nev(src);",
        expect: Object.freeze(["outbound-dynamic-code"] as const),
      }),
      // CR-12, closed 2026-08-24. ONE PHRASE, THREE SPELLINGS, anchored at the
      // SET MEMBERS rather than at the shared branch opening so a mutation that
      // removes ONE operator turns ONE case red BY NAME. Each probe was RUN
      // before its `expect` was written down.
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken,",
        probe: "let e;\ne ??= eval;\ne(src);",
        expect: Object.freeze(["outbound-dynamic-code"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken,",
        probe: "let e;\ne ||= eval;\ne(src);",
        expect: Object.freeze(["outbound-dynamic-code"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken,",
        probe: "let e;\ne &&= eval;\ne(src);",
        expect: Object.freeze(["outbound-dynamic-code"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "globalThisAliases",
    kind: "resolver",
    clause:
      "a name WATCHED being bound to one of the four GLOBAL_RECEIVERS at a declaration, an assignment or a logical assignment is a global receiver; seeded EMPTY so the bare-identifier answer is unchanged and the new behaviour is reachable only through what the walk saw bound",
    site: "auditSource > const globalThisAliases = new Set<string>()",
    probe: "const g = globalThis;\ng.fetch(url);",
    expect: Object.freeze(["outbound-fetch"] as const),
    counterProbe: "const g = helper;\ng.fetch(url);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a declaration",
        anchor:
          "auditSource > collect > if (isGlobalReceiver(init)) globalThisAliases.add(node.name.text);",
        probe: "const g = globalThis;\ng.fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      Object.freeze({
        names: "an assignment",
        anchor:
          "auditSource > collect > if (isGlobalReceiver(node.right)) globalThisAliases.add(node.left.text);",
        probe: "let g;\ng = globalThis;\ng.fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      // CR-12, closed 2026-08-24. ONE PHRASE, THREE SPELLINGS, anchored at the
      // SET MEMBERS rather than at the shared branch opening so a mutation that
      // removes ONE operator turns ONE case red BY NAME. Each probe was RUN
      // before its `expect` was written down.
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken,",
        probe: "let g;\ng ??= globalThis;\ng.fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken,",
        probe: "let g;\ng ||= globalThis;\ng.fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken,",
        probe: "let g;\ng &&= globalThis;\ng.fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "shadowedGlobals",
    kind: "resolver",
    clause:
      "a NARROWING collector: a TOP-LEVEL function or class declaration of a dynamic-code or outbound-constructor name provably rebinds that name for the module, so the bare call is not the global. Its probe is the shape that stays QUIET and its counter-probe is the shape that REPORTS",
    site: "auditSource > const shadowedGlobals = new Set<string>()",
    probe: 'function Function(a) { return a; }\nFunction("x");',
    expect: Object.freeze([] as const),
    counterProbe: 'Function("x");',
    counterExpect: Object.freeze(["outbound-dynamic-code"] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a TOP-LEVEL function or class declaration",
        anchor: "auditSource > collect > shadowedGlobals.add(node.name.text);",
        probe: "function eval(s) { return s; }\neval(src);",
        expect: Object.freeze([] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "numericNames",
    kind: "resolver",
    clause:
      "a NARROWING collector: a name bound only to provably numeric values is an INDEX rather than a hidden receiver name, and is excluded before any receiver rule runs. Probe stays quiet, counter-probe reports",
    site: "auditSource > const numericNames = new Set<string>()",
    probe: "let i = 0;\nsdk[i].send(req);",
    expect: Object.freeze([] as const),
    counterProbe: 'let i = "requests";\nsdk[i].send(req);',
    counterExpect: Object.freeze(["outbound-send"] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a name bound only to provably numeric values",
        anchor: "auditSource > collect > numericNames.add(node.name.text);",
        probe: "const i = 0;\nsdk[i].send(req);",
        expect: Object.freeze([] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "poisonedNumericNames",
    kind: "resolver",
    clause:
      "the negative half of the numeric exemption: a name bound to ANYTHING non-numeric anywhere in the file stops being an index, so a numeric accumulator later assigned a receiver name reports",
    site: "auditSource > const poisonedNumericNames = new Set<string>()",
    probe: 'let i = 0;\ni = "requests";\nsdk[i].send(req);',
    expect: Object.freeze(["outbound-send"] as const),
    counterProbe: "let i = 0;\ni = 2;\nsdk[i].send(req);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "stops being an index",
        anchor:
          "auditSource > collect > poisonedNumericNames.add(node.left.text);",
        probe: 'let i = 0;\ni = "requests";\nsdk[i].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "isGlobalReceiver",
    kind: "resolver",
    clause:
      "one-hop resolution of a GLOBAL receiver closed over the live alias set, so a member of an aliased global receiver that will not reduce is reported rather than dropped",
    site: "auditSource > const isGlobalReceiver = (node: ts.Expression): boolean =>",
    probe: 'const g = globalThis;\ng["fet" + "ch"](url);',
    expect: Object.freeze(["outbound-unanalysable"] as const),
    counterProbe: 'const g = helper;\ng["fet" + "ch"](url);',
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "one-hop resolution of a GLOBAL receiver",
        anchor:
          "auditSource > const isGlobalReceiver = (node: ts.Expression): boolean =>",
        probe: "const g = globalThis;\ng.fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "keyReceiver",
    kind: "resolver",
    clause:
      "the SINGLE definition of what a readable key is, in the order: watched assembly, then any literal binding, then inline assembly, then not a receiver; it descends operators through operatorReceiver passing ITSELF, so nesting resolves at any depth",
    site: "auditSource > const keyReceiver = (key: ts.Expression): ReceiverKind => {",
    probe: 'sdk[b ? "requests" : "net"].send(req);',
    expect: Object.freeze(["outbound-send"] as const),
    counterProbe: 'sdk[b ? "x" : "y"].send(req);',
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "watched assembly",
        anchor:
          "auditSource > keyReceiver > assembledNames.has(assembledKey.text)",
        probe: 'const k = "req" + "uests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      Object.freeze({
        names: "any literal binding",
        anchor:
          "auditSource > keyReceiver > for (const literal of literalsOf(key)) {",
        probe: 'const k = "requests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "inline assembly",
        anchor:
          "auditSource > keyReceiver > if (isAssembledKey(key, numericNames, poisonedNumericNames)) {",
        probe: 'sdk["req" + "uests"].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "receiverKind",
    kind: "resolver",
    clause:
      "the three-state answer for an expression in RECEIVER position - THAT RECEIVER, UNREADABLE, or NOT A RECEIVER - including a bare operator written directly in call position, which fell through every branch before wave 25",
    site: "auditSource > const receiverKind = (node: ts.Expression): ReceiverKind => {",
    probe: "(b ? sdk.requests : sdk.net).send(req);",
    expect: Object.freeze(["outbound-send"] as const),
    counterProbe: "(b ? cache : client).send(req);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a bare operator written directly in call position",
        anchor:
          "auditSource > receiverKind > const operator = operatorReceiver(inner, receiverKind);",
        probe: "(b ? sdk.requests : sdk.net).send(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "literalsOf",
    kind: "resolver",
    clause:
      'the MULTI-valued string reader keyReceiver consults: the collected set of literals constStrings recorded for a name - which since 2026-08-24 includes every literal an operator initializer bound and every literal a logical assignment bound - so ANY of them naming a receiver reports. FALSIFIED 2026-08-24 (CR-13), the phrase this clause used to carry: "every literal a name carries" - measured, a literal reached only through a conditional, ?? or || initializer was in no collected set and was not read; that shape is CLOSED 2026-08-24 by operatorLiteralBinding and the branch below is its probe, the logical-assignment spellings are CLOSED 2026-08-24 by ASSIGNING_OPERATORS and the three branches below are their probes, and the phrase STAYS falsified because a literal reached only through a parameter, a loop binding, a name bound in another file or a second hop of key is still in no collected set',
    site: "auditSource > function literalsOf(node: ts.Node | undefined): ReadonlySet<string> {",
    probe: 'let k = "harmless";\nk = "requests";\nsdk[k].send(req);',
    expect: Object.freeze(["outbound-send"] as const),
    counterProbe: 'let k = "harmless";\nk = "other";\nsdk[k].send(req);',
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "the collected set",
        anchor:
          "auditSource > literalsOf > return constStrings.get(node.text) ?? NO_LITERALS;",
        probe: 'const k = "requests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        // CR-13, closed 2026-08-24. THE SAME LINE as the branch above, and that
        // is the honest anchor rather than a defect: this reader has ONE code
        // branch and its reach is entirely inherited from what constStrings
        // collected. What the probe proves is that the SET now contains a
        // literal only an operator initializer could have put there - delete
        // the descent and this probe answers [] while the branch above stays
        // green, which is exactly the granularity WR-32 was about.
        names: "an operator initializer",
        anchor:
          "auditSource > literalsOf > return constStrings.get(node.text) ?? NO_LITERALS;",
        probe: 'const k = b ? "requests" : "net";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      // CR-12, closed 2026-08-24. THE ANCHORS ARE THE OPERATOR-SET MEMBERS AND
      // NOT THIS READER'S OWN LINE, and that is the honest site rather than a
      // shortcut: this reader has ONE code branch and its reach is entirely
      // inherited from what `constStrings` collected, so what DECIDES whether
      // these probes answer is membership of ASSIGNING_OPERATORS. Each probe
      // binds TWO literals to one name - the declaration's harmless one and the
      // logical assignment's - which is the multi-valued read only this row does.
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken,",
        probe: 'let k = "harmless";\nk ??= "requests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken,",
        probe: 'let k = "harmless";\nk ||= "requests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "a logical assignment",
        anchor:
          "auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken,",
        probe: 'let k = "harmless";\nk &&= "requests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "literalOf",
    kind: "resolver",
    clause:
      "the SINGLE-valued string reader member names and module specifiers need: one binding resolves, two or more answer undefined, and undefined means COULD NOT READ at every call site - which reports",
    site: "auditSource > function literalOf(node: ts.Node | undefined): string | undefined {",
    probe: 'const s = "caido:http";\nawait import(s);',
    expect: Object.freeze(["outbound-import"] as const),
    counterProbe: 'const s = "crypto";\nawait import(s);',
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "two or more answer undefined",
        anchor:
          "auditSource > literalOf > if (literals.size !== 1) return undefined;",
        probe: 'let m = "send";\nm = "get";\nsdk.requests[m](req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "memberName",
    kind: "resolver",
    clause:
      "the member name of a positively identified receiver, read single-valued; a name that will not reduce to exactly one literal is reported as unreadable rather than assumed harmless",
    site: "auditSource > const memberName = (",
    probe: 'let m = "harmless";\nm = "send";\nsdk.requests[m](req);',
    expect: Object.freeze(["outbound-unanalysable"] as const),
    counterProbe: 'const m = "get";\nsdk.requests[m](id);',
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "read single-valued",
        anchor:
          "auditSource > memberName > : literalOf(node.argumentExpression);",
        probe: 'sdk.requests["send"](req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "initializerReceiver",
    kind: "resolver",
    clause:
      "a NAME for receiverKind since wave 25, so initializer position and call position give the same answer and the `??` precedence bug that let an UNREADABLE left branch shadow a NAMED right branch is gone. CORRECTED 2026-08-24 (CR-11): that promise was true of THIS resolver and FALSE of the global ones, which is what actively misled a reader about `const g = globalThis ?? self` - an initializer that aliased a global receiver through an operator grew nothing while the SDK twin resolved; the global resolvers now answer the same in both positions through the shared operator descent, and the branch below is its probe",
    site: "auditSource > const initializerReceiver = (node: ts.Expression): ReceiverKind =>",
    probe: "const r = b ? sdk.requests : sdk.net;\nr.send(req);",
    expect: Object.freeze(["outbound-send"] as const),
    counterProbe: "const r = b ? cache : client;\nr.send(req);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a NAME for receiverKind",
        anchor:
          "auditSource > const initializerReceiver = (node: ts.Expression): ReceiverKind =>",
        probe: "const r = b ? sdk.requests : sdk.net;\nr.send(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
      // CR-11, closed 2026-08-24. The GLOBAL half of the promise this clause has
      // made since wave 25, wired at the same declaration branch the SDK half
      // already used. Its probe is the plausible defensive idiom the finding is
      // about, not a contrivance.
      Object.freeze({
        names: "the shared operator descent",
        anchor:
          "auditSource > collect > if (isGlobalReceiver(init)) globalThisAliases.add(node.name.text);",
        probe: "const g = globalThis ?? self;\ng.fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "isFetchExpression",
    kind: "resolver",
    clause:
      'the global fetch in four spellings - bare, on any of the four global receivers, through an alias, or an operator around the bare global - and NOT a fetch method of an ordinary object. FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "in every reachable spelling" - measured, an operator wrapping the bare global, (ok && fetch)(url), reached no branch here; that shape is CLOSED 2026-08-24 (CR-11) by operatorOperandMatching and the branch below is its probe, and closing it took a SIXTH site as well - bareFetchCallee - because the bare-call rule asked the same question INLINE and never consulted this function at all; and the phrase STAYS falsified because a receiver crossing a function boundary, a parameter, an array-slot binding and a class field each still reach no branch here',
    site: "auditSource > const isFetchExpression = (node: ts.Expression): boolean => {",
    probe: "globalThis.fetch(url);",
    expect: Object.freeze(["outbound-fetch"] as const),
    counterProbe: "client.fetch(url);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "on any of the four global receivers",
        anchor:
          "auditSource > isFetchExpression > memberName(inner) === FETCH_GLOBAL && isGlobalReceiver(inner.expression)",
        probe: "globalThis.fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      Object.freeze({
        names: "through an alias",
        anchor:
          "auditSource > isFetchExpression > if (ts.isIdentifier(inner)) return fetchAliases.has(inner.text);",
        probe: "const f = fetch;\nf(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      // CR-11, closed 2026-08-24. The operator spelling, through the shared
      // descent. Its probe is `const f = fetch ?? x` rather than `(ok && fetch)`
      // DELIBERATELY: the call-position spelling is answered by `bareFetchCallee`
      // one row down, and a probe that exercised the neighbouring resolver would
      // leave this branch bound to nothing.
      Object.freeze({
        names: "an operator around the bare global",
        anchor:
          "auditSource > isFetchExpression > if (operatorOperandMatching(inner, isFetchExpression) !== undefined) {",
        probe: "const f = fetch ?? x;\nf(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  // CR-11, 2026-08-24. THE SIXTH SITE, AND ITS EXISTENCE IS THE FINDING.
  // Wiring the shared descent into `isFetchExpression` closed every operator
  // spelling of the global fetch EXCEPT `(ok && fetch)(url)` - the very probe
  // `isFetchExpression`'s own falsified-handoff entry carried - because the
  // bare-call rule never consulted `isFetchExpression`. It asked
  // `ts.isIdentifier(callee) && fetchAliases.has(callee.text)` inline.
  Object.freeze({
    id: "bareFetchCallee",
    kind: "resolver",
    clause:
      "the local NAME a call's callee spells when the walk knows that name to be the global fetch: the bare spelling, or an operator around the bare global read through the shared descent. Deliberately NARROWER than isFetchExpression, which also answers for a fetch member of a global receiver - a spelling the member rule already reports from the node it visits in its own right, so routing this rule through that function would report it TWICE",
    site: "auditSource > const bareFetchCallee = (node: ts.Expression): string | undefined => {",
    probe: "fetch(url);",
    expect: Object.freeze(["outbound-fetch"] as const),
    counterProbe: "cache.fetch(url);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "the bare spelling",
        anchor:
          "auditSource > bareFetchCallee > return fetchAliases.has(inner.text) ? inner.text : undefined;",
        probe: "fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      Object.freeze({
        names: "an operator around the bare global",
        anchor:
          "auditSource > bareFetchCallee > const operand = operatorOperandMatching(",
        probe: "(ok && fetch)(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "isNavigatorReceiver",
    kind: "resolver",
    clause:
      "navigator reached bare, through a global receiver, or through a one-hop alias; RECEIVER-ANCHORED so a member named sendBeacon on an ordinary object stays quiet",
    site: "auditSource > const isNavigatorReceiver = (node: ts.Expression): boolean => {",
    probe: "globalThis.navigator.sendBeacon(u, d);",
    expect: Object.freeze(["outbound-beacon"] as const),
    counterProbe: "o.navigator.sendBeacon(u, d);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "through a global receiver",
        anchor:
          "auditSource > isNavigatorReceiver > memberName(inner) === NAVIGATOR && isGlobalReceiver(inner.expression)",
        probe: "globalThis.navigator.sendBeacon(url);",
        expect: Object.freeze(["outbound-beacon"] as const),
      }),
      Object.freeze({
        names: "through a one-hop alias",
        anchor:
          "auditSource > isNavigatorReceiver > if (ts.isIdentifier(inner)) return navigatorAliases.has(inner.text);",
        probe: "const n = navigator;\nn.sendBeacon(url);",
        expect: Object.freeze(["outbound-beacon"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "globalNameOf",
    kind: "resolver",
    clause:
      "which global a spelling names - bare identifier, member of a global receiver, or a collected alias - so the violation detail names the aliased surface instead of leaving a reader to find the binding",
    site: "auditSource > const globalNameOf = (node: ts.Expression): string | undefined => {",
    probe: "const F = Function;\nnew F(src);",
    expect: Object.freeze(["outbound-dynamic-code"] as const),
    counterProbe: "const F = o.Function;\nnew F(src);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a collected alias",
        anchor: "auditSource > globalNameOf > return globalAliases.get(name);",
        probe: "const e = eval;\ne(src);",
        expect: Object.freeze(["outbound-dynamic-code"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "dynamicCodeOf",
    kind: "resolver",
    clause:
      "eval and Function in call position, refused outright rather than analysed, because no AST gate can see inside a string",
    site: "auditSource > const dynamicCodeOf = (node: ts.Expression): string | undefined => {",
    probe: "eval(src);",
    expect: Object.freeze(["outbound-dynamic-code"] as const),
    counterProbe: "o.eval(src);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "refused outright rather than analysed",
        anchor:
          "auditSource > const dynamicCodeOf = (node: ts.Expression): string | undefined => {",
        probe: "eval(src);",
        expect: Object.freeze(["outbound-dynamic-code"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "outboundCtorOf",
    kind: "resolver",
    clause:
      "XMLHttpRequest, WebSocket and EventSource in construction position, bare or on a global receiver or through an alias",
    site: "auditSource > const outboundCtorOf = (node: ts.Expression): string | undefined => {",
    probe: "new XMLHttpRequest();",
    expect: Object.freeze(["outbound-global-ctor"] as const),
    counterProbe: "new Foo();",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "in construction position",
        anchor:
          "auditSource > const outboundCtorOf = (node: ts.Expression): string | undefined => {",
        probe: "new WebSocket(u);",
        expect: Object.freeze(["outbound-global-ctor"] as const),
      }),
      Object.freeze({
        names: "through an alias",
        anchor:
          "auditSource > outboundCtorOf > return global !== undefined && OUTBOUND_CONSTRUCTORS.has(global)",
        probe: "const W = WebSocket;\nnew W(u);",
        expect: Object.freeze(["outbound-global-ctor"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "aliasedGlobalOf",
    kind: "resolver",
    clause:
      "the three binding shapes an outbound global can be aliased through - a bare identifier, a member of a global receiver, and a destructure off one - anchored so a destructure off an ordinary object grows nothing",
    site: "auditSource > const aliasedGlobalOf = (init: ts.Expression): string | undefined => {",
    probe: "const { eval: ev } = globalThis;\nev(src);",
    expect: Object.freeze(["outbound-dynamic-code"] as const),
    counterProbe: "const { eval: ev } = o;\nev(src);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a bare identifier",
        anchor:
          "auditSource > aliasedGlobalOf > return (DYNAMIC_CODE.has(name) || OUTBOUND_CONSTRUCTORS.has(name)) &&",
        probe: "const e = eval;\ne(src);",
        expect: Object.freeze(["outbound-dynamic-code"] as const),
      }),
      Object.freeze({
        names: "a member of a global receiver",
        anchor:
          "auditSource > aliasedGlobalOf > (DYNAMIC_CODE.has(member) || OUTBOUND_CONSTRUCTORS.has(member)) &&",
        probe: "const e = globalThis.eval;\ne(src);",
        expect: Object.freeze([
          "outbound-dynamic-code",
          "outbound-dynamic-code",
        ] as const),
      }),
      Object.freeze({
        names: "a destructure off one",
        anchor:
          "auditSource > collect > globalAliases.set(el.name.text, property);",
        probe: "const { eval: ev } = globalThis;\nev(src);",
        expect: Object.freeze(["outbound-dynamic-code"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "unwrap",
    kind: "resolver",
    clause:
      "strips parentheses, `as`/satisfies assertions, an angle-bracket type assertion, non-null assertions and a COMMA SEQUENCE down to its rightmost operand, so a wrapped receiver is still that receiver. CORRECTED 2026-08-24 (IN-29): the angle-bracket form was one of the five wrappers the code strips and the only one this clause did not name, which is the direction of MORE stripping rather than less - it is probeable in .ts source and the branch below is its probe",
    site: "module scope > function unwrap(node: ts.Expression): ts.Expression {",
    probe: "(0, sdk.net).connect(x);",
    expect: Object.freeze(["outbound-net"] as const),
    counterProbe: "(0, cache).send(req);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "parentheses",
        anchor:
          "module scope > unwrap > ts.isParenthesizedExpression(current) ||",
        probe: "(sdk.requests).send(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "non-null assertions",
        anchor: "module scope > unwrap > ts.isNonNullExpression(current) ||",
        probe: "sdk.requests!.send(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "a COMMA SEQUENCE",
        anchor:
          "module scope > unwrap > current.operatorToken.kind === ts.SyntaxKind.CommaToken",
        probe: "(0, sdk.requests).send(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
      // IN-29, 2026-08-24. The fifth wrapper. It IS probeable in `.ts` source —
      // this file parses every fixture with `ts.ScriptKind.TS`, where
      // `<any>x` is a type assertion rather than JSX — so no limit is recorded
      // and a real probe is written instead.
      Object.freeze({
        names: "an angle-bracket type assertion",
        anchor: "module scope > unwrap > ts.isTypeAssertionExpression(current)",
        probe: "const g = <any>globalThis;\ng.fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "operatorReceiver",
    kind: "resolver",
    clause:
      "ONE descent for the four RECEIVER_OPERATORS (`? :`, `??`, `||`, `&&`) reached from receiverKind and keyReceiver and from NOWHERE ELSE: any operand naming a receiver makes the expression that receiver, else any unreadable operand makes it unreadable, else it is not a receiver",
    site: "module scope > const operatorReceiver = (",
    probe: "(sdk.requests ?? sdk.net).send(req);",
    expect: Object.freeze(["outbound-send"] as const),
    counterProbe: "(cache ?? client).send(req);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "any operand naming a receiver",
        anchor:
          'module scope > operatorReceiver > for (const kind of kinds) if (typeof kind === "string") return kind;',
        probe: "(b ? sdk.requests : x).send(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "any unreadable operand",
        anchor:
          "module scope > operatorReceiver > if (kind === UNREADABLE_RECEIVER) return UNREADABLE_RECEIVER;",
        probe: 'const k = "a" + b;\n(c ? sdk[k] : x).send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  // CR-11, 2026-08-24. THE THIRD CONSUMER OF `operatorOperands`, for the GLOBAL
  // surfaces, added because the alternative was SIX copies of one operand loop —
  // WR-27's finding at scale, in the plan that closes WR-27's last face.
  Object.freeze({
    id: "operatorOperandMatching",
    kind: "resolver",
    clause:
      "the one descent the global resolvers read an operator through: it answers which operand the caller's own resolver recognises, with either-side semantics, so an operator SELECTING a global surface IS that surface in call position and in initializer position alike. A third consumer of the operatorOperands statement rather than a sixth copy of the operand loop, and a nested operator resolves because each caller passes ITSELF",
    site: "module scope > function operatorOperandMatching(",
    probe: "(ok && globalThis).fetch(url);",
    expect: Object.freeze(["outbound-fetch"] as const),
    counterProbe: "(ok && cache).fetch(url);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "which operand the caller's own resolver recognises",
        anchor:
          "module scope > operatorOperandMatching > for (const operand of operands) if (matches(operand)) return operand;",
        probe: "(ok && globalThis).fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      Object.freeze({
        names: "a nested operator",
        anchor:
          "module scope > isGlobalReceiverIn > operatorOperandMatching(inner, (operand) =>",
        probe: "(ok && (b ? globalThis : self)).fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    // CR-13. The SECOND CONSUMER of `operatorOperands`, sitting beside the first
    // deliberately: the two descents read ONE operator set and differ only in
    // what they do with the operands, which is the half `operatorOperands`' own
    // docblock says may differ.
    id: "operatorLiteralBinding",
    kind: "resolver",
    clause:
      "an operator-shaped INITIALIZER is read on every operand: at a declaration or an assignment, a conditional, ?? or || initializer binds a literal operand into constStrings, while an operand the walk WATCHES BEING ASSEMBLED makes the bound name an UNREADABLE key instead; a nested operator descends through operatorOperands - the SAME set operatorReceiver reads - so this is a second CONSUMER of that set and not a fourth copy of it",
    site: "module scope > function operatorLiteralBinding(",
    probe: 'const k = b ? "requests" : "net";\nsdk[k].send(req);',
    expect: Object.freeze(["outbound-send"] as const),
    counterProbe: 'const k = b ? "harmless" : "other";\nsdk[k].send(req);',
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        // THE WIRING. Task 2 of plan 01-30 adds `an assignment` beside it, in
        // the same plan, because closing one spelling and leaving its sibling
        // open is how this file acquired CR-08 and CR-10.
        names: "a declaration",
        anchor:
          "auditSource > collect > const operatorBinding = operatorLiteralBinding(",
        probe: 'const k = b ? "requests" : "net";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        // CLOSED IN THE SAME PLAN AS `a declaration`, not a later one.
        names: "an assignment",
        anchor:
          "auditSource > collect > const assignedOperator = operatorLiteralBinding(",
        probe: 'let k;\nk = b ? "requests" : "net";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        // The `??` spelling and not the `? :` one, so this probe exercises the
        // literal arm through a DIFFERENT operator from the row's own probe.
        names: "a literal operand",
        anchor:
          "module scope > operatorLiteralBinding > for (const literal of read(inner)) literals.add(literal);",
        probe: 'const k = b ?? "requests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "an operand the walk WATCHES BEING ASSEMBLED",
        anchor:
          "module scope > operatorLiteralBinding > isAssembledKey(inner, numeric, poisoned) ||",
        probe: 'const k = b ? "req" + "uests" : "net";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      Object.freeze({
        names: "a nested operator",
        anchor:
          "module scope > operatorLiteralBinding > const nested = operatorLiteralBinding(",
        probe: 'const k = b ? (c ? "requests" : "x") : "y";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "isProvablyNumeric",
    kind: "resolver",
    clause:
      "a NARROWING resolver: a key provably numeric - a numeric literal, a collected numeric name, `+`/`-` over two numeric operands, or a member or call named in NUMERIC_MEMBERS - is an INDEX and is excluded before any receiver rule runs. The NUMERIC_MEMBERS half is a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed",
    site: "module scope > function isProvablyNumeric(",
    probe: "let i = 0;\nsdk[i + 1].send(req);",
    expect: Object.freeze([] as const),
    counterProbe: 'const o = { max: "requests" };\nsdk[o.max + ""].send(req);',
    counterExpect: Object.freeze(["outbound-unanalysable"] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "a numeric literal",
        anchor:
          "module scope > isProvablyNumeric > if (ts.isNumericLiteral(inner)) return true;",
        probe: "sdk[0].send(req);",
        expect: Object.freeze([] as const),
      }),
      Object.freeze({
        names: "a collected numeric name",
        anchor:
          "module scope > isProvablyNumeric > return numeric.has(inner.text) && !poisoned.has(inner.text);",
        probe: "const i = 0;\nsdk[i].send(req);",
        expect: Object.freeze([] as const),
      }),
      Object.freeze({
        names: "a member or call named in NUMERIC_MEMBERS",
        anchor:
          "module scope > isProvablyNumeric > return NUMERIC_MEMBERS.has(inner.name.text);",
        probe: "sdk[xs.length].send(req);",
        expect: Object.freeze([] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "isAssembledKey",
    kind: "resolver",
    clause:
      "a key the walk WATCHES being built inline - concatenated, interpolated, or returned by a call that is not provably numeric - is UNREADABLE, a third state distinct from `not a receiver`",
    site: "module scope > function isAssembledKey(",
    probe: 'sdk["req" + "uests"].send(req);',
    expect: Object.freeze(["outbound-unanalysable"] as const),
    counterProbe: 'sdk["requests"].send(req);',
    counterExpect: Object.freeze(["outbound-send"] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "concatenated",
        anchor:
          "module scope > isAssembledKey > inner.operatorToken.kind === ts.SyntaxKind.PlusToken",
        probe: 'sdk["req" + "uests"].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      Object.freeze({
        names: "interpolated",
        anchor:
          "module scope > isAssembledKey > if (ts.isTemplateExpression(inner)) return true;",
        probe: "sdk[`req${x}`].send(req);",
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      Object.freeze({
        names: "returned by a call",
        anchor:
          "module scope > isAssembledKey > return ts.isCallExpression(inner);",
        probe: "sdk[name()].send(req);",
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "isGlobalReceiverIn",
    kind: "resolver",
    clause:
      "whether an expression is one of the four global receivers or a collected one-hop alias of one; the depth question is answered by the alias entries above and NOT restated here (WR-30)",
    site: "module scope > function isGlobalReceiverIn(",
    probe: 'globalThis["fet" + "ch"](url);',
    expect: Object.freeze(["outbound-unanalysable"] as const),
    counterProbe: 'o["fet" + "ch"](url);',
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "one of the four global receivers",
        anchor:
          "module scope > isGlobalReceiverIn > return GLOBAL_RECEIVERS.has(inner.text) || aliases.has(inner.text);",
        probe: "globalThis.fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
      Object.freeze({
        names: "a collected one-hop alias of one",
        anchor:
          "module scope > isGlobalReceiverIn > return GLOBAL_RECEIVERS.has(inner.text) || aliases.has(inner.text);",
        probe: "const g = globalThis;\ng.fetch(url);",
        expect: Object.freeze(["outbound-fetch"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "boundPropertyName",
    kind: "resolver",
    clause:
      "the property a binding element reads, including the RENAMED spelling `{ p: k }`, so a destructured assembly is bound to the local name rather than the source key",
    site: "module scope > function boundPropertyName(el: ts.BindingElement): string | undefined {",
    probe: 'const { p: k } = { p: "req" + "uests" };\nsdk[k].send(req);',
    expect: Object.freeze(["outbound-unanalysable"] as const),
    counterProbe: 'const { p: k } = { p: "harmless" };\nsdk[k].send(req);',
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "the RENAMED spelling",
        anchor:
          "module scope > boundPropertyName > const property = el.propertyName ?? el.name;",
        probe: 'const { p: k } = { p: "req" + "uests" };\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  // WR-37, 2026-08-24. One definition of what a destructure off an identified
  // receiver binds, reached from the flat spelling and from the nested one.
  Object.freeze({
    id: "reportReceiverMembers",
    kind: "resolver",
    clause:
      "the members a destructure off a POSITIVELY IDENTIFIED receiver binds, minus the read-only allowlist - defined once and reached from the flat spelling and from a nested pattern of an identified receiver, so `const { requests: { send } } = sdk` reports what its two halves already reported one at a time. RECEIVER-ANCHORED: an ordinary object destructured the same way binds nothing, which is the counter-probe. BOUNDED BY DEPTH AND BY PATTERN KIND, MEASURED 2026-08-25 (IN-33, wave 34): the composition descends ONE element and only into an object binding pattern, so a three-deep spelling reports NOTHING and an array binding pattern wrapping the same member reports NOTHING - both executed in that session and both rowed",
    site: "auditSource > const reportReceiverMembers = (",
    probe: "const { requests: { send } } = sdk;\nsend(req);",
    expect: Object.freeze(["outbound-send"] as const),
    counterProbe: "const { cache: { send } } = app;\nsend(req);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "the flat spelling",
        anchor: "auditSource > visit > reportReceiverMembers(node.name, kind);",
        probe: "const { send } = sdk.requests;\nsend(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
      Object.freeze({
        names: "a nested pattern of an identified receiver",
        anchor:
          "auditSource > visit > reportReceiverMembers(el.name, property);",
        probe: "const { requests: { send } } = sdk;\nsend(req);",
        expect: Object.freeze(["outbound-send"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "destructuredInitializer",
    kind: "resolver",
    clause:
      "the initializer a binding element resolves to in BOTH binding-pattern spellings - object property and array slot - so a declared assembly reached through a destructure is read (IN-26). CORRECTED 2026-08-24 (WR-37): what it reads is the ASSEMBLY a KEY is built from and nothing else. A RECEIVER bound through an array ELEMENT position reaches no branch here and is carried as its own measured silence below; a NESTED pattern reaches no branch here either and is closed at reportReceiverMembers instead, because that one is a COMPOSITION of two shapes already resolved rather than a widening",
    site: "module scope > function destructuredInitializer(",
    probe: 'const [k] = ["req" + "uests"];\nsdk[k].send(req);',
    expect: Object.freeze(["outbound-unanalysable"] as const),
    counterProbe: "const [k] = [1];\nsdk[k].send(req);",
    counterExpect: Object.freeze([] as const),
    branches: Object.freeze([
      Object.freeze({
        names: "object property",
        anchor:
          "module scope > destructuredInitializer > if (ts.isObjectLiteralExpression(init)) {",
        probe: 'const { k } = { k: "req" + "uests" };\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
      Object.freeze({
        names: "array slot",
        anchor:
          "module scope > destructuredInitializer > if (ts.isArrayLiteralExpression(init)) {",
        probe: 'const [k] = ["req" + "uests"];\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-unanalysable"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    id: "silence-two-hop-key",
    kind: "measured-silence",
    clause:
      "residual (a), KEY half: TWO HOPS of key is silent. constStrings and assembledNames read the INITIALIZER'S SHAPE and never the live set, so a key cannot be grown from a name already in a set and therefore cannot chain. ONE hop reports - that is the counter-probe",
    site: "auditSource > const constStrings = new Map<string, Set<string>>()",
    probe: 'const a = "requests";\nconst b = a;\nsdk[b].send(req);',
    expect: Object.freeze([] as const),
    counterProbe: 'const b = "requests";\nsdk[b].send(req);',
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-function-boundary",
    kind: "measured-silence",
    clause:
      "residual (a), FUNCTION half: a receiver crossing a function boundary is silent. The walk builds no symbol table and does not follow a return value. The one-hop binding of the same receiver reports - that is the counter-probe",
    site: "auditSource > const receiverKind = (node: ts.Expression): ReceiverKind => {",
    probe: "function pick() { return sdk.requests; }\npick().send(req);",
    expect: Object.freeze([] as const),
    counterProbe: "const r = sdk.requests;\nr.send(req);",
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-parameter-key",
    kind: "measured-silence",
    clause:
      "residual (b): a key the walk never saw BOUND - here a parameter - is not reported. Set by real-tree MEASUREMENT, not preference: reporting every unreduced key fired on compat.ts:141's ctx[root]. The same site with a bound literal reports",
    site: "auditSource > const keyReceiver = (key: ts.Expression): ReceiverKind => {",
    probe: "function at(root) { return sdk[root].send(req); }",
    expect: Object.freeze([] as const),
    counterProbe: 'const root = "requests";\nsdk[root].send(req);',
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-loop-binding-key",
    kind: "measured-silence",
    clause:
      "residual (b): a key bound by a for...of or for(;;) header is not reported. Measured on compat.ts's documented at() dotted-path walk. The same lookup with a bound literal reports",
    site: "auditSource > const keyReceiver = (key: ts.Expression): ReceiverKind => {",
    probe: 'for (const key of path.split(".")) { sdk[key].send(req); }',
    expect: Object.freeze([] as const),
    counterProbe: 'const key = "requests";\nsdk[key].send(req);',
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-destructured-plain-literal-key",
    kind: "measured-silence",
    clause:
      "residual (b2), NAMED BY MEASUREMENT in wave 26: a DESTRUCTURED PLAIN LITERAL used as a key is silent, because constStrings reads only the identifier spelling of a declaration that assembledNames now reads three ways. The ASSEMBLED twin of the same destructure reports - that is the counter-probe, and it is the shape IN-26 closed",
    site: "auditSource > const constStrings = new Map<string, Set<string>>()",
    probe: 'const { k } = { k: "requests" };\nsdk[k].send(req);',
    expect: Object.freeze([] as const),
    counterProbe: 'const { k } = { k: "req" + "uests" };\nsdk[k].send(req);',
    counterExpect: Object.freeze(["outbound-unanalysable"] as const),
    // A SILENCE ROW'S BRANCH NAMES THE SITE THE SILENCE IS MEASURED AT, not a
    // branch that fires — see the coverage guard's docblock. This clause names
    // `the identifier spelling of a declaration`, which IS a branch of
    // `constStrings`, so the vocabulary guard demands a probe for it and gets
    // one: the branch whose deletion would make this silence total rather than
    // local. Found by MEASUREMENT, not prediction — see `01-29-SUMMARY.md`.
    branches: Object.freeze([
      Object.freeze({
        names: "a declaration",
        anchor: "auditSource > collect > if (ts.isStringLiteralLike(init)) {",
        probe: 'const k = "requests";\nsdk[k].send(req);',
        expect: Object.freeze(["outbound-send"] as const),
      }),
    ] as readonly BranchProbe[]),
  }),
  Object.freeze({
    // OPENED BY MEASUREMENT WHILE WIDENING, wave 30 (CR-13). The descent was
    // wired into `collect`'s two IDENTIFIER branches - the declaration and the
    // assignment - and NOT into the two binding-pattern branches, which read
    // `destructuredInitializer` through `isAssembledKey` only. This row exists
    // because the shape was RUN and found silent, not because the widening
    // intended to leave it: naming it is what stops the next round rediscovering
    // it as a surprise. Closing it is a separate decision with its own real-tree
    // measurement, exactly as IN-26 was for the plain-literal twin.
    id: "silence-destructured-operator-key",
    kind: "measured-silence",
    clause:
      "residual (b3), NAMED BY MEASUREMENT on 2026-08-24 (CR-13): a DESTRUCTURED OPERATOR literal used as a key is silent, because the operator-literal descent is wired at the two IDENTIFIER branches and not at either binding-pattern branch. The IDENTIFIER spelling of the same operator initializer reports - that is the counter-probe",
    site: "auditSource > const collect = (node: ts.Node): void => {",
    probe: 'const { k } = { k: b ? "requests" : "net" };\nsdk[k].send(req);',
    expect: Object.freeze([] as const),
    counterProbe: 'const k = b ? "requests" : "net";\nsdk[k].send(req);',
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    // MEASURED IN WAVE 30 AND FOUND TO HAVE NO ROW AT ALL. `auditSource` takes
    // ONE file's text; there is no program, no module graph and no symbol table,
    // so a name imported from another module is exactly a name the walk never saw
    // bound. That was true before this plan and is unchanged by it - it is
    // written down here because this plan's residual claims what a session
    // MEASURED, and a bound nobody ever ran is the artifact this whole round
    // replaces.
    id: "silence-cross-file-key",
    kind: "measured-silence",
    clause:
      "residual (b4), NAMED BY MEASUREMENT on 2026-08-24 (CR-13): a key bound in ANOTHER FILE is silent, because auditSource reads one file's text and builds no module graph. The same name bound in THIS file reports - that is the counter-probe",
    site: "auditSource > export function auditSource(file: string, source: string): Violation[] {",
    probe: 'import { k } from "./other";\nsdk[k].send(req);',
    expect: Object.freeze([] as const),
    counterProbe: 'const k = "requests";\nsdk[k].send(req);',
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    // OPENED BY MEASUREMENT WHILE WIDENING, wave 31 (CR-12). The widened branch
    // still requires `ts.isIdentifier(node.left)`, so `o.r ??= sdk.requests`
    // binds nothing - and neither does `o.r = sdk.requests`, which was true
    // before this plan and had no row either. This row exists because the shape
    // was RUN and found silent, not because the widening intended to leave it.
    //
    // THE CLAUSE SPELLS THE SHAPE HYPHENATED, `a logical-assignment binding`,
    // AND THAT IS DELIBERATE RATHER THAN AN EVASION OF THE COVERAGE GUARD. The
    // vocabulary phrase `a logical assignment` names a branch that FIRES; this
    // clause names an ABSENCE at that branch, so a BranchProbe answering the
    // phrase would have to probe a shape this row is not about. What binds this
    // row to the code is its own probe and counter-probe, executed like every
    // other measured silence - the counter is the IDENTIFIER spelling of the
    // same operator, which reports.
    id: "silence-logical-assignment-member-target",
    kind: "measured-silence",
    clause:
      "residual (b6), NAMED BY MEASUREMENT on 2026-08-24 (CR-12): a logical-assignment binding whose TARGET is a MEMBER rather than a bare name is silent, because collect's ASSIGNING_OPERATORS branch requires an IDENTIFIER on the left. The bare-name spelling of the same operator reports - that is the counter-probe",
    site: "auditSource > const collect = (node: ts.Node): void => {",
    probe: "o.r ??= sdk.requests;\no.r.send(req);",
    expect: Object.freeze([] as const),
    counterProbe: "let r;\nr ??= sdk.requests;\nr.send(req);",
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-inverted-binding-order",
    kind: "measured-silence",
    clause:
      "what actually bounds an ALIAS chain, corrected in wave 23: not where a name is READ but the DECLARATION ORDER of the bindings relative to each other. collect() finishes before visit() begins, so a use may sit above every declaration; invert one link and the root is not yet in the live set. The dependency-ordered spelling reports",
    site: "auditSource > const collect = (node: ts.Node): void => {",
    probe: "const b = a;\nconst a = fetch;\nb(url);",
    expect: Object.freeze([] as const),
    counterProbe: "const a = fetch;\nconst b = a;\nb(url);",
    counterExpect: Object.freeze(["outbound-fetch"] as const),
  }),
  // WR-37's FIVE SIBLINGS, 2026-08-24. Each is a RECEIVER bound through an
  // initializer shape the collector has never read, and each is therefore a
  // GENUINE WIDENING with its own real-tree measurement to do — a different class
  // from the nested destructure closed in this same plan, which was a composition
  // of two shapes already resolved. All five probes and all five counter-probes
  // were RUN before these rows were written.
  //
  // THEY SAY SO HERE BECAUSE RESIDUAL (b) DOES NOT. Residual (b) is written about
  // KEYS - a parameter, a loop binding, a name bound in another file - so a reader
  // checking whether the RECEIVER twins are covered will not find them there. That
  // gap is the reason these are rows rather than a sentence in (b).
  Object.freeze({
    id: "silence-array-slot-receiver",
    kind: "measured-silence",
    clause:
      "a RECEIVER bound through an array ELEMENT position is silent. The binding-pattern branch beside it reads only an assembled KEY and grows no receiver, so neither `const [r] = [sdk.requests]` nor `const a = [sdk.requests]; a[0]` binds anything. The one-hop binding of the same receiver REPORTS - that is the counter-probe. Residual (b) is written about KEYS ONLY and does not cover this",
    site: "auditSource > collect > } else if (ts.isArrayBindingPattern(node.name)) {",
    probe: "const [r] = [sdk.requests];\nr.send(req);",
    expect: Object.freeze([] as const),
    counterProbe: "const r = sdk.requests;\nr.send(req);",
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-object-literal-property-receiver",
    kind: "measured-silence",
    clause:
      "a RECEIVER reached as a named member of an object LITERAL is silent: `const o = { r: sdk.requests }; o.r.send(req)` binds nothing, because the collector reads an initializer that IS a receiver and never one that CONTAINS one. The one-hop binding REPORTS - that is the counter-probe. Residual (b) is written about KEYS ONLY and does not cover this",
    site: "auditSource > const receiverAliases = new Map<string, string>()",
    probe: "const o = { r: sdk.requests };\no.r.send(req);",
    expect: Object.freeze([] as const),
    counterProbe: "const r = sdk.requests;\nr.send(req);",
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-class-field-receiver",
    kind: "measured-silence",
    clause:
      "a RECEIVER held in a CLASS FIELD is silent: `class C { r = sdk.requests; m() { this.r.send(req); } }` binds nothing, because the collector reads variable declarations and assignments and not property declarations. The same call written directly inside the method REPORTS - that is the counter-probe. Residual (b) is written about KEYS ONLY and does not cover this",
    site: "auditSource > const collect = (node: ts.Node): void => {",
    probe: "class C { r = sdk.requests; m() { this.r.send(req); } }",
    expect: Object.freeze([] as const),
    counterProbe: "class C { m() { sdk.requests.send(req); } }",
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-parameter-default-receiver",
    kind: "measured-silence",
    clause:
      "a RECEIVER supplied as a PARAMETER DEFAULT is silent: `function f(r = sdk.requests) { r.send(req); }` binds nothing, because a parameter is never bound in the collect pass at all. The same receiver bound outside the function REPORTS - that is the counter-probe. Residual (b) names a parameter for KEYS ONLY, so a reader checking it there will not find this RECEIVER twin",
    site: "auditSource > const receiverAliases = new Map<string, string>()",
    probe: "function f(r = sdk.requests) { r.send(req); }",
    expect: Object.freeze([] as const),
    counterProbe: "const r = sdk.requests;\nfunction f() { r.send(req); }",
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-for-of-binding-receiver",
    kind: "measured-silence",
    clause:
      "a RECEIVER bound by a `for…of` head is silent: `for (const r of [sdk.requests]) { r.send(req); }` binds nothing, because the loop binding has no initializer the collector can read - the value comes from the iterable. The same receiver bound outside the loop REPORTS - that is the counter-probe. Residual (b) names a loop binding for KEYS ONLY, so a reader checking it there will not find this RECEIVER twin",
    site: "auditSource > const receiverAliases = new Map<string, string>()",
    probe: "for (const r of [sdk.requests]) { r.send(req); }",
    expect: Object.freeze([] as const),
    counterProbe:
      "const r = sdk.requests;\nfor (const x of xs) { r.send(req); }",
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  // IN-30, 2026-08-24. TWO CONTRIVED SPELLINGS, RECORDED SO THAT A SEVENTH ROUND
  // DOES NOT SPEND A FINDING ON THEM. Neither is reachable in this codebase and
  // neither is worth a branch; what they are worth is a row, because a shape
  // measured and then left unwritten is a shape somebody rediscovers.
  Object.freeze({
    id: "silence-tagged-template-key",
    kind: "measured-silence",
    clause:
      "a KEY built by a TAGGED TEMPLATE is silent: `const k = String.raw`requests`` binds nothing, because the string readers test ts.isStringLiteralLike and a tagged template is a call on a template rather than a literal. The plain literal binding REPORTS - that is the counter-probe. CONTRIVED and unreachable in this codebase; recorded rather than closed",
    site: "auditSource > function literalsOf(node: ts.Node | undefined): ReadonlySet<string> {",
    probe: "const k = String.raw`requests`;\nsdk[k].send(req);",
    expect: Object.freeze([] as const),
    counterProbe: 'const k = "requests";\nsdk[k].send(req);',
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-doubled-global-receiver",
    kind: "measured-silence",
    clause:
      "a GLOBAL RECEIVER reached through ITSELF is silent: `globalThis.globalThis.fetch(url)` reports nothing, because the inner member name is not one of the surfaces any rule tests and the receiver rules anchor on a member NAME rather than on the receiver alone. The single-hop spelling REPORTS - that is the counter-probe. CONTRIVED and unreachable in this codebase; recorded rather than closed",
    site: "auditSource > const isGlobalReceiver = (node: ts.Expression): boolean =>",
    probe: "globalThis.globalThis.fetch(url);",
    expect: Object.freeze([] as const),
    counterProbe: "globalThis.fetch(url);",
    counterExpect: Object.freeze(["outbound-fetch"] as const),
  }),
  // CR-15 AND THE RECEIVER-POSITION FAMILY, 2026-08-25, wave 34. FOUR ROWS AND NOT
  // ONE, because four different mechanisms drop these shapes and a single row would
  // file three of them under a mechanism they do not exhibit — the defect this phase
  // has now found five times. THESE ROWS DISCLOSE. They do not end anything: the set
  // of ways a value can be handed to a call is open, so no row here and no branch
  // beside it is a terminal condition. What the rows change is that the shapes sit on
  // a list generated from the code, which is what the adopted bar asks for.
  Object.freeze({
    id: "silence-global-fetch-receiver-position",
    kind: "measured-silence",
    clause:
      "NARROWED BY MEASUREMENT 2026-08-25 (wave 34): the readable spellings this row was written for - `fetch.call(null, url)`, `fetch.apply(...)`, `fetch.bind(...)` - now report through the receiver-position arm this wave added, so the row is cut back to the mechanism that SURVIVES rather than deleted. What survives: an UNREADABLE computed member of the bare global fetch is silent, because the catch-all that reports an unreadable member is guarded on `isGlobalReceiver` and the bare global fetch is not one of the four receivers that guard accepts. The identical unreadable-member shape on a receiver the guard DOES accept reports outbound-unanalysable - that is the counter-probe, and the asymmetry between the two is the whole content of the row. `could not read` still does not mean `clean` here. DISCLOSED, not ended",
    site: "auditSource > (isGlobalReceiver(node.expression) ||",
    probe: 'fetch["ca" + "ll"](null, url);',
    expect: Object.freeze([] as const),
    counterProbe: 'globalThis["fet" + "ch"](url);',
    counterExpect: Object.freeze(["outbound-unanalysable"] as const),
  }),
  Object.freeze({
    id: "silence-fetch-alias-receiver-position",
    kind: "measured-silence",
    clause:
      "NARROWED BY MEASUREMENT 2026-08-25 (wave 34): `const f = fetch; f.call(null, url)` was silent while `f(url)` on the next line reported - one binding, one position over, two answers - and the receiver-position arm this wave added closed that particular spelling. What SURVIVES is the unreadable half: an unreadable computed member of an identified fetch alias is silent, because the arm that was added requires a member name it can read and the unreadable catch-all beyond it accepts only the four global receivers. The SAME alias with a readable member REPORTS - that is the counter-probe, so the two differ by readability alone. DISCLOSED, not ended",
    site: "auditSource > (isGlobalReceiver(node.expression) ||",
    probe: 'const f = fetch;\nf["ca" + "ll"](null, url);',
    expect: Object.freeze([] as const),
    counterProbe: "const f = fetch;\nf.call(null, url);",
    counterExpect: Object.freeze(["outbound-fetch"] as const),
  }),
  Object.freeze({
    id: "silence-bare-global-argument-position",
    kind: "measured-silence",
    clause:
      "a bare global handed to a call as an ARGUMENT is silent: `Reflect.apply(fetch, null, [url])` reports nothing, because an identifier with no member written beside it is interrogated only where a CALLEE is expected and this shape writes down no member of it for the member arm to read. The member-qualified twin of the identical shape REPORTS - that is the counter-probe - and the difference between the two is that one NAMES a member and the other does not. A mechanism distinct from receiver position, rowed separately for that reason. DISCLOSED, not ended",
    site: "auditSource > const bareFetchCallee = (node: ts.Expression): string | undefined => {",
    probe: "Reflect.apply(fetch, null, [url]);",
    expect: Object.freeze([] as const),
    counterProbe: "Reflect.apply(sdk.requests.send, sdk.requests, [req]);",
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-dynamic-code-global-receiver-position",
    kind: "measured-silence",
    clause:
      "NARROWED BY MEASUREMENT 2026-08-25 (wave 34): `eval.call(null, src)` and `Function.call(null, src)` were silent and now report through the dynamic-code receiver arm this wave added - a SECOND arm and a second decision, because this family resolves through `dynamicCodeOf` rather than through `isFetchExpression`. What SURVIVES is the unreadable half: an unreadable computed member of a dynamic-code global is silent, because the arm requires a member name it can read and the unreadable catch-all beyond it accepts only the four global receivers and `navigator`. The SAME receiver with a readable member REPORTS - that is the counter-probe, so the two differ by readability alone. DISCLOSED, not ended",
    site: "auditSource > dynamicCodeOf(node.expression) !== undefined",
    probe: 'eval["ca" + "ll"](null, src);',
    expect: Object.freeze([] as const),
    counterProbe: "eval.call(null, src);",
    counterExpect: Object.freeze(["outbound-dynamic-code"] as const),
  }),
  // FOUND BY RE-MEASURING AFTER THE DYNAMIC-CODE ARM, NOT PREDICTED BY THE PLAN.
  // The arm answers for the two dynamic-code globals and for nothing else, so the
  // outbound CONSTRUCTORS in the same position are a third mechanism, still
  // silent, and they get their own row rather than a footnote on the row above.
  Object.freeze({
    id: "silence-outbound-ctor-receiver-position",
    kind: "measured-silence",
    clause:
      "an OUTBOUND CONSTRUCTOR global in RECEIVER position is silent: `WebSocket.call(null, u)` reports nothing, because the constructor arm reads OUTBOUND_CONSTRUCTORS against the MEMBER and is guarded on the receiver being reached THROUGH a global, while `outboundCtorOf` is consulted where a `new` target or a callee is expected rather than on a receiver. The member-qualified spelling of the identical shape REPORTS - that is the counter-probe. MEASURED after the two arms this wave added, neither of which reaches this family. DISCLOSED, not ended",
    site: "auditSource > OUTBOUND_CONSTRUCTORS.has(member) &&",
    probe: "WebSocket.call(null, u);",
    expect: Object.freeze([] as const),
    counterProbe: "globalThis.WebSocket.call(null, u);",
    counterExpect: Object.freeze(["outbound-global-ctor"] as const),
  }),
  // WR-41, 2026-08-25, wave 34. THE SCOPE DECISION IS STATED IN THE CLAUSE RATHER
  // THAN LEFT TO FALL OUT OF A BRANCH, because two dispositions were legitimate
  // here and a reader is owed which one was taken and why.
  Object.freeze({
    id: "silence-aliased-module-loader-specifier",
    kind: "measured-silence",
    clause:
      'a MODULE LOADER reached by way of a local binding is silent in BOTH directions: `const r = require; r("caido:http")` reports nothing, and so does `const r = require; r(s)` where the specifier will not reduce - so the `could not read does not mean clean` half of that rule is unreachable once the loader is bound to a local name, and an unreadable specifier behind such a name is treated as clean. The DIRECT spelling reports in both directions - that is the counter-probe. DISPOSITION AND ITS REASON, so this is a decision rather than an omission: NOT widened, because the surface it protects is bounded from the other end by a check on the SHIPPED BUNDLE, which is asserted at exactly one import specifier and which a spec file never enters; growing the resolver machinery here would add reach the bundle check already has. Recorded so a later round finds a decision instead of a blank. DISCLOSED, not ended',
    site: "auditSource > } else if (specifier === undefined) {",
    probe: "const r = require;\nr(s);",
    expect: Object.freeze([] as const),
    counterProbe: "require(s);",
    counterExpect: Object.freeze(["outbound-unanalysable"] as const),
  }),
  // IN-31, 2026-08-25, wave 34. THE ROW EXISTS FOR A READER WHO SEARCHES, and the
  // measurement that made it worth writing is about the SPAN rather than the code:
  // before this wave the derived span mentioned a tagged template exactly once and
  // that mention was about KEYS, so a reader searching for these words found a row
  // that does not cover this shape and stopped looking.
  Object.freeze({
    id: "silence-tagged-template-fetch-call",
    kind: "measured-silence",
    clause:
      "the global fetch INVOKED AS A TAGGED TEMPLATE is silent: `fetch`, applied to a template rather than to an argument list, reports nothing, because the rule that answers for the bare global is anchored on a call expression and a tagged template is not one, so neither that rule nor the resolver it reads is reached at all. The ordinary call spelling REPORTS - that is the counter-probe. NOT THE SAME MECHANISM as `silence-tagged-template-key`, which is named here so the redirection is explicit: that row is about a tagged template BUILDING A LOOKUP KEY and the strings collector declining to read it, and it says nothing about this shape. CONTRIVED, and rowed rather than branched. DISCLOSED, not ended",
    site: "auditSource > if (ts.isCallExpression(node)) {",
    probe: "fetch`https://example.test/${p}`;",
    expect: Object.freeze([] as const),
    counterProbe: 'fetch("https://example.test");',
    counterExpect: Object.freeze(["outbound-fetch"] as const),
  }),
  // IN-33, 2026-08-25, wave 34. TWO NEIGHBOURS OF A CLOSURE THAT DID NOT STATE ITS
  // DEPTH. Both measured; the bound now sits in `reportReceiverMembers`' own clause
  // and the shapes sit here.
  Object.freeze({
    id: "silence-destructure-deeper-than-one",
    kind: "measured-silence",
    clause:
      "a destructure NESTED MORE THAN ONE ELEMENT DEEP is silent: `const { a: { requests: { send } } } = wrap; send(req)` reports nothing, because the composition descends one element and asks its receiver question there, so a third level is never reached and the outer object is not an identified receiver anyway. The ONE-deep spelling off an identified receiver REPORTS - that is the counter-probe. The bound is DEPTH, stated in `reportReceiverMembers`' own clause since this date rather than left implicit in a closure claim. DISCLOSED, not ended",
    site: "auditSource > reportReceiverMembers(el.name, property);",
    probe: "const { a: { requests: { send } } } = wrap;\nsend(req);",
    expect: Object.freeze([] as const),
    counterProbe: "const { requests: { send } } = sdk;\nsend(req);",
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  Object.freeze({
    id: "silence-destructure-array-nested",
    kind: "measured-silence",
    clause:
      "a destructure whose nesting is an ARRAY BINDING PATTERN is silent: `const [{ send }] = [sdk.requests]; send(req)` reports nothing, and so does `const { requests: [first] } = sdk; first(req)`, because the composition looks at an object binding pattern and an array one is a different node kind. The object-nested spelling off the same receiver REPORTS - that is the counter-probe. The bound is PATTERN KIND, distinct from the depth bound its neighbour row measures, which is why the two are separate rows. DISCLOSED, not ended",
    site: "auditSource > reportReceiverMembers(el.name, property);",
    probe: "const [{ send }] = [sdk.requests];\nsend(req);",
    expect: Object.freeze([] as const),
    counterProbe: "const { requests: { send } } = sdk;\nsend(req);",
    counterExpect: Object.freeze(["outbound-send"] as const),
  }),
  // CR-16, 2026-08-25, wave 34. THE ASYMMETRY THAT SURVIVED ON ONE RECEIVER
  // FAMILY after being closed twice on others, and it is DISCLOSED here before
  // anything is done about it, because the disclosure is what the adopted bar
  // asks for and a branch beside it is a bonus.
  Object.freeze({
    id: "silence-unreadable-member-of-navigator",
    kind: "measured-silence",
    clause:
      "NARROWED BY MEASUREMENT 2026-08-25 (wave 34), AND THE MEASUREMENT CONTRADICTED THE PREDICTION. This row was written for the five spellings of an unreadable computed member on a positively identified `navigator` receiver, ALL silent; the arm this wave widened now reports every one of them, INCLUDING the parameter-key spelling the plan predicted would survive. It does not survive: on a receiver this arm accepts, an unreadable member reports whatever the reason the key would not reduce, so the reason the key is unbound never comes up. What DOES survive is the RESOLUTION boundary rather than the readability one: an unreadable member of a `navigator` handed across a FUNCTION BOUNDARY is silent, because the parameter is never bound to the receiver and no resolver answers for it - the same limit the `isFetchExpression` entry of QUANTIFIED_CLAUSES already bounds for global receivers, met here on the navigator family. The identical shape written one function boundary nearer REPORTS - that is the counter-probe. DISCLOSED, not ended",
    site: "auditSource > const isNavigatorReceiver = (node: ts.Expression): boolean => {",
    probe:
      'function h(n) { const m = "send" + "Beacon"; return n[m](u, d); }\nh(navigator);',
    expect: Object.freeze([] as const),
    counterProbe: 'const m = "send" + "Beacon";\nnavigator[m](u, d);',
    counterExpect: Object.freeze(["outbound-unanalysable"] as const),
  }),
  // `silence-operator-around-global-receiver` STOOD HERE AND IS REMOVED, 2026-08-24
  // (CR-11). It is not reworded and it is not narrowed: the silence it measured
  // NO LONGER EXISTS. Re-measured after the shared descent landed, every one of
  // the ten spellings the row and its falsified marker between them named now
  // reports — `(ok && globalThis).fetch(url)`, the `??`, `||` and `? :` twins,
  // `(ok && fetch)(url)`, `(ok && eval)(src)`, `new (ok && WebSocket)()`,
  // `(ok && navigator).sendBeacon(u, d)` and both initializer forms — and the
  // comma, parenthesis, `as` and non-null spellings its marker recorded already
  // did. A measured-silence row that no longer measures a silence is a fiction,
  // and re-wording it into a narrower silence that also does not exist would be
  // the same defect with a fresher date. The shapes it used to assert are
  // asserted in the OTHER direction by the four fixtures titled
  // `through operatorOperandMatching`, and the mechanism now carries its own
  // resolver row. Its `QUANTIFIED_CLAUSES` entry and its `FALSIFIED_HANDOFFS`
  // entry are deleted in this same commit, because an entry pointing at a row
  // that no longer exists is a stale claim inside a machine-owned span.
] as readonly ResolverRecord[]);

/**
 * THE DECLARED BRANCH-NAMING PHRASES.
 *
 * WHAT THIS TURNS INTO A MECHANICAL TEST. "This clause names that branch" was a
 * READING until this list existed, and a reading is what let CR-11, CR-12 and
 * CR-13 all land inside a mechanism that was 100% green. With the vocabulary
 * declared, a phrase present in a clause and absent from that row's `branches`
 * is a FAILING TEST rather than a reviewer's finding.
 *
 * EVERY PHRASE IS SPELLED AS SOME CLAUSE ALREADY SPELLS IT, and the non-vacuity
 * assertion below proves it — a vocabulary written in words the clauses do not
 * use would match nothing and pass, which is round 5's coverage blind spot
 * reintroduced by the guard built to remove it.
 *
 * ITS REACH, STATED RATHER THAN IMPLIED. This list does NOT cover every way a
 * branch can be named in English. A clause phrased outside it is unmatched,
 * raises no obligation and passes. That limit is emitted into the generated
 * block so it travels to every surface the block reaches; it is disclosed, not
 * covered.
 */
export const BRANCH_VOCABULARY: readonly string[] = Object.freeze([
  // The BINDING SHAPES. Six collectors name these, and the phrase is spelled the
  // SAME WAY in every one of them — a vocabulary that needed a synonym per row
  // would silently stop matching the day a row was reworded, so where two clauses
  // named one branch in two words the clause was corrected rather than the list
  // grown. Those clause edits are listed in `01-29-SUMMARY.md`.
  "a declaration",
  "an assignment",
  "a `+=` compound assignment",
  // CR-12, 2026-08-24. The binding shape the WIDENED alias branch added. Spelled
  // so it does NOT contain "an assignment" as a substring - a phrase that did
  // would make every clause naming the logical spelling also claim the plain one,
  // and the coverage guard would be satisfied by the wrong probe. A clause that
  // means both says both, and then owes a probe for each.
  "a logical assignment",
  "either binding-pattern spelling",
  "the object binding-pattern spelling",
  "a string-literal declaration",
  "a string-literal assignment",
  // CR-13, 2026-08-24. The binding shape `constStrings` and `literalsOf` name.
  // Spelled in lower case, which is what keeps it DISTINCT from
  // `operatorLiteralBinding`'s own clause opening - that row names its OWN
  // branches (`a literal operand`, `a nested operator`), and a phrase matching
  // both rows would bind each to the other's branch. The two spellings are a
  // decision, not an accident; see `01-30-SUMMARY.md`.
  "an operator initializer",
  // The RESOLUTION-ORDER branches `keyReceiver`'s clause enumerates.
  "watched assembly",
  "any literal binding",
  "inline assembly",
  // The SPELLINGS the global resolvers name.
  "the bare spelling",
  // CR-11, 2026-08-24. The operator spelling of a global surface, and the descent
  // that reads it. Spelled so that NONE of the three contains another as a
  // substring and none contains "the bare spelling" - a phrase that did would make
  // one clause claim a branch it does not have, which is the trap wave 31 recorded
  // when it spelled "a logical assignment" to avoid containing "an assignment".
  "an operator around the bare global",
  "the shared operator descent",
  "which operand the caller's own resolver recognises",
  "on any of the four global receivers",
  "through an alias",
  "through a global receiver",
  "through a one-hop alias",
  "a collected alias",
  "a bare identifier",
  "a member of a global receiver",
  "a destructure off one",
  "in construction position",
  "one of the four global receivers",
  "a collected one-hop alias of one",
  // The SHAPES `unwrap` strips and the OPERAND rules `operatorReceiver` applies.
  "parentheses",
  "non-null assertions",
  "a COMMA SEQUENCE",
  "any operand naming a receiver",
  "any unreadable operand",
  // The OPERAND rules the LITERAL descent applies. Spelled differently from
  // `operatorReceiver`'s two above ON PURPOSE: the two descents read the same
  // operator set and do DIFFERENT things with the operands, so one phrase
  // matching both rows would bind each row to the other's branch.
  "a literal operand",
  "an operand the walk WATCHES BEING ASSEMBLED",
  "a nested operator",
  // The NUMERIC narrowing and the ASSEMBLY shapes.
  "a numeric literal",
  "a collected numeric name",
  "a member or call named in NUMERIC_MEMBERS",
  "concatenated",
  "interpolated",
  "returned by a call",
  "a name bound only to provably numeric values",
  "stops being an index",
  "a TOP-LEVEL function or class declaration",
  // The remaining single-branch resolvers.
  "where the name is USED as a receiver",
  "one-hop resolution of a GLOBAL receiver",
  "a bare operator written directly in call position",
  "the collected set",
  "two or more answer undefined",
  "read single-valued",
  "a NAME for receiverKind",
  "refused outright rather than analysed",
  "the RENAMED spelling",
  "object property",
  "array slot",
  // IN-29 and WR-37, 2026-08-24. The fifth wrapper `unwrap` strips, and the two
  // sites the destructure reporter is reached from. Spelled so that none of the
  // three contains another, and so that "the flat spelling" does not contain and
  // is not contained by "the bare spelling" — the substring trap this list has
  // now avoided three times, first recorded when "a logical assignment" was
  // spelled so as not to contain "an assignment".
  "an angle-bracket type assertion",
  "the flat spelling",
  "a nested pattern of an identified receiver",
]);

/**
 * THE HANDOFFS: CLAUSES THAT NAMED A BRANCH THE CODE DOES NOT HAVE.
 *
 * WHY THIS IS DATA AND NOT A NOTE. Where a clause overstated its reach, wave 29
 * corrected the clause to what it MEASURES, preserved the falsified phrase inline
 * with a dated marker and the finding id, and recorded the owning wave HERE.
 * Recording the owner as data rather than as prose inside the clause means
 * DISCHARGING the handoff and REMOVING the note are ONE act — an owner sentence
 * left inside a corrected clause would ship, in a machine-owned span, for as long
 * as somebody forgot to delete it.
 *
 * WHY EACH ENTRY CARRIES A PROBE, AND WHAT THAT CLOSES. The vocabulary guard fires
 * on PHRASE-WITHOUT-PROBE. On its own it cannot fire on the opposite and more
 * likely failure — the code widened and the phrase never re-added — because the
 * clause was corrected to the NARROW reach, and a narrow clause with a matching
 * probe is green everywhere. So each entry records the probe that measured its
 * phrase falsified and the answer that probe gives WHILE THE HANDOFF IS OPEN, and
 * a parameterised case asserts that probe STILL answers that way. The moment a
 * later wave widens the code without re-widening the clause, that case goes RED
 * and names the row, the phrase and the owning wave.
 *
 * WHAT THE HANDOFF PROBE DOES NOT PROVE. It is an EXAMPLE, like every other probe
 * in this file, so it establishes the phrase is still false OF THAT PROBE rather
 * than of the phrase's whole domain. And it covers only the phrases WAVE 29
 * MARKED: a clause understated in a way nobody marked is bound to nothing here,
 * which is the same limit `BRANCH_VOCABULARY` and `UNBOUNDED_QUANTIFIERS` carry,
 * stated a third time because this is the third hand-maintained list.
 *
 * THE COUNT IS PINNED AND IS EXPECTED TO FALL TO ZERO. Wave 30 owns CR-13, wave 31
 * owns CR-12 and wave 32 owns CR-11. Each discharging wave DELETES its entries and
 * updates the pin IN THE SAME COMMIT AS ITS CODE — that is what makes the widening
 * provable at branch granularity rather than at fixture granularity.
 */
export type FalsifiedHandoff = {
  /** The registry row whose clause was corrected. */
  readonly row: string;
  /** The falsified phrase, preserved VERBATIM as the clause used to carry it. */
  readonly phrase: string;
  /** The finding that falsified it. */
  readonly finding: string;
  /** The wave that owns the widening. Discharging means DELETING this entry. */
  readonly wave: string;
  /** The probe that MEASURED the phrase falsified. */
  readonly probe: string;
  /** What that probe answers WHILE THE HANDOFF IS OPEN. MEASURED, never predicted. */
  readonly openAnswer: readonly RuleId[];
};

/**
 * THE DECLARED QUANTIFIER PHRASINGS.
 *
 * WHY THIS LIST EXISTS. Two clauses in this registry asserted a UNIVERSAL, were
 * green, and were FALSE: `ANY string literal the name is bound to anywhere in the
 * file` and `silent in every spelling`. A universal a reviewer cannot execute and
 * disagree with is the same artifact as an unnamed blind spot — it just wears a
 * quantifier. Every clause carrying one of the phrasings below must appear on
 * `QUANTIFIED_CLAUSES` with a MEASURED statement of what bounds it.
 *
 * THIS LIST WAS CHECKED AGAINST THE THREE UNIVERSALS THIS ROUND FALSIFIED, by
 * running the scan rather than by reading: `constStrings`, `literalsOf` and
 * `silence-operator-around-global-receiver` are all hits. A quantifier list that
 * missed the universals that produced this round's blockers would miss round 7's.
 *
 * ITS REACH IS THE DECLARED PHRASINGS AND NO FURTHER, AND THAT IS STATED HERE
 * RATHER THAN LEFT TO BE FOUND. This is the same class of frozen, hand-maintained
 * phrase list as `BRANCH_VOCABULARY`, and English has many spellings for one
 * universal. A clause asserting one OUTSIDE this list is unmatched, raises no
 * `QUANTIFIED_CLAUSES` obligation and passes silently. NO SENTENCE IN THIS FILE MAY
 * CLAIM THIS GUARD CATCHES EVERY UNIVERSAL. Caveating `BRANCH_VOCABULARY` and
 * leaving this one uncaveated would be this round's own defect, one guard over —
 * and it would invite round 7 to falsify the whole mechanism by rephrasing a
 * single clause. The limit ships in the generated block on every surface.
 */
export const UNBOUNDED_QUANTIFIERS: readonly string[] = Object.freeze([
  "anywhere in the file",
  "everywhere in the file",
  "any depth",
  "every literal",
  "ANY of them",
  "every spelling",
  "every reachable spelling",
  "ANY string literal",
  "ANY-BINDING-WINS",
]);

/**
 * WHAT MEASURABLY BOUNDS EACH QUANTIFIED CLAUSE.
 *
 * Written in `RESOLVER_EXEMPTIONS`' shape and for the argument that list's own
 * docblock already makes: a NAMED, REASONED entry is something a reviewer can
 * execute and disagree with, and an unnamed blind spot is not. Each entry below
 * is a STATEMENT OF WHAT WAS MEASURED — not a justification and not an excuse.
 * Every probe quoted in it was RUN in wave 29 and its answer recorded in
 * `01-29-SUMMARY.md`.
 */
export const QUANTIFIED_CLAUSES: Readonly<Record<string, string>> =
  Object.freeze({
    constStrings:
      'Bounded by the branches that call bindString: a string-literal declaration, a string-literal assignment and an operator initializer (2026-08-24, CR-13) - and since 2026-08-24 (CR-12) the assignment branch reads ASSIGNING_OPERATORS, so the three logical spellings bind through it. MEASURED: `let k; k ??= "requests"; sdk[k].send(req)` reports outbound-send. MEASURED after the widening: `const r = ok ? "requests" : "x"; sdk[r].send(req)` reports outbound-send. The universal is STILL false and the bound is what remains outside those three branches, each MEASURED silent in this same session: a parameter (`function f(k) { return sdk[k].send(req); } f("requests")`), a loop binding (`for (const k of ["requests"]) { sdk[k].send(req); }`), a second hop of key (`const a = b ? "requests" : "net"; const k = a; sdk[k].send(req)`) and a name bound in another file - all four report NOTHING.',
    poisonedNumericNames:
      "Bounded by the ARMS of the numeric pass that write it: a non-numeric VariableDeclaration initializer, an EqualsToken assignment, a += whose right side is non-numeric, and any other ASSIGNMENT_OPERATORS spelling. A binding shape outside those arms poisons nothing. MEASURED: `function f(i) { return sdk[i].send(req); }` reports NOTHING — a parameter is never poisoned because it is never bound in the pass.",
    receiverAliases:
      "Bounded by DECLARATION ORDER inside the single collect pass, and by the branches that write the map — the declaration branch and the assignment branch, the second of which since 2026-08-24 (CR-12) reads ASSIGNING_OPERATORS and so covers the three logical-assignment spellings too. `everywhere in the file` is true of WHERE the alias is READ, not of where it may be BOUND. MEASURED: `const b = a; const a = sdk.requests; b.send(req)` reports NOTHING, while the dependency-ordered spelling reports — that inversion has its own registry row, silence-inverted-binding-order. MEASURED after the widening: `let b; b ??= a; let a; a ??= sdk.requests; b.send(req)` reports NOTHING for the same reason, and `o.r ??= sdk.requests; o.r.send(req)` reports NOTHING because the branch requires an IDENTIFIER on the left.",
    keyReceiver:
      'Bounded by operatorReceiver\'s FOUR RECEIVER_OPERATORS and by keyReceiver passing ITSELF as the leaf resolver. `any depth` is unbounded only WITHIN those four operators; a fifth operator spelling is not descended at any depth. MEASURED: `sdk[b ? (c ? "requests" : "x") : "y"].send(req)` reports outbound-send.',
    literalsOf:
      'Bounded by the collected set constStrings recorded — the SAME branches, so this clause inherits constStrings\' bound exactly, widening with it (2026-08-24, CR-13). MEASURED with the same probe: `const r = ok ? "requests" : "x"; sdk[r].send(req)` now reports outbound-send. The universal is STILL false and inherits the same residual: parameter, loop binding, second hop of key and cross-file binding are each MEASURED silent.',
    isFetchExpression:
      'Bounded by the FOUR spellings the function branches on: a bare identifier in fetchAliases, a FETCH_GLOBAL member of a global receiver, a one-hop alias, and - since 2026-08-24 (CR-11) - an operator around any of those, read through operatorOperandMatching. MEASURED after that widening: `const f = fetch ?? x; f(url)` reports outbound-fetch, and so does `(ok && fetch)(url)`, which needed a SIXTH site (bareFetchCallee) because the bare-call rule asked its own inline question. The universal is STILL false and the bound is what remains outside those four branches, each MEASURED silent in this same session: a function boundary (`function h(g) { g.fetch(url); } h(globalThis)`), an array-slot binding (`[globalThis][0].fetch(url)`), a class field and a parameter default - all report NOTHING. WIDENED 2026-08-25 (CR-15, wave 34) with RECEIVER POSITION, which this entry did not name at all before: the member arm now asks this same question of a receiver written as a bare name, so MEASURED after that widening `fetch.call(null, url)` reports outbound-fetch and so does `const f = fetch; f.call(null, url)`, while `globalThis.fetch.call(null, url)` still reports EXACTLY ONCE because the arm takes only the bare-name spelling. The bound after it is still not empty and is MEASURED, not assumed: `Reflect.apply(fetch, null, [url])` reports NOTHING because the global is an argument and no member of it is written down, and `fetch["ca" + "ll"](null, url)` reports NOTHING because the member will not reduce - each has its own registry row, and the set of ways a value reaches a call is open.',
  });

export const FALSIFIED_HANDOFFS: readonly FalsifiedHandoff[] = Object.freeze([
  // EMPTY AS OF 2026-08-24, AND THAT IS THE DESIGNED END STATE RATHER THAN AN
  // ABSENCE. Six entries were recorded by wave 29 when it corrected six clauses
  // to their measured reach. Waves 30 (CR-13) and 31 (CR-12) discharged two each;
  // the last two were CR-11's and are discharged HERE, in the same commit as
  // `operatorOperandMatching` and `bareFetchCallee`. Both were OBSERVED RED
  // first: with the widening applied and the entries still present, the two
  // parameterised cases named the row, the phrase and the owning wave before
  // anything was deleted. One of the two rows — `silence-operator-around-global-receiver`
  // — was itself REMOVED rather than corrected, because the silence it named
  // stopped existing; leaving a handoff entry pointing at a row that no longer
  // exists would be a stale claim inside a machine-owned span, which is this
  // phase's defect in its purest form.
]);

/**
 * THE SENTINELS. They say what they are, in the text, at the point a hand-editor
 * would be standing.
 */
const DERIVED_MARK = "DERIVED RESIDUAL";
export const DERIVED_BEGIN = `BEGIN ${DERIVED_MARK} - generated by deriveResidual(RESOLVER_REGISTRY) in packages/backend/src/outbound-prohibition.spec.ts - MACHINE-OWNED, DO NOT HAND-EDIT`;
export const DERIVED_END = `END ${DERIVED_MARK}`;

/** The prefix every generated entry line carries, and what the entry count counts. */
const ENTRY_MARK = "* ";

const formatRules = (ids: readonly RuleId[]): string =>
  ids.length === 0 ? "[] - nothing" : ids.join(", ");

const plural = (n: number): string => `${n} ${n === 1 ? "entry" : "entries"}`;

const formatEntry = (row: ResolverRecord): string[] => [
  "",
  `${ENTRY_MARK}${row.id} - ${row.clause}`,
  `    read off:  ${row.site}`,
  `    probe:     ${JSON.stringify(row.probe)}`,
  `    reports:   ${formatRules(row.expect)}`,
  `    counter:   ${JSON.stringify(row.counterProbe)}`,
  `    reports:   ${formatRules(row.counterExpect)}`,
  // ONE LINE PER CLAUSE-NAMED BRANCH, PREFIXED so it cannot satisfy its own
  // anchor assertion: that assertion requires a match at the START of a trimmed
  // line, and `branch:` is what a trimmed line here begins with.
  ...(row.branches ?? []).map(
    (b) =>
      `    branch:    ${JSON.stringify(b.names)} at ${b.anchor} - probe ${JSON.stringify(b.probe)} - reports ${formatRules(b.expect)}`,
  ),
];

/**
 * RENDER THE RESIDUAL FROM THE REGISTRY ALONE.
 *
 * PURE, AND THE PURITY IS THE WHOLE MECHANISM. No file reads, no environment, no
 * dates, no ordering that depends on anything but the registry's own order. A
 * generator whose output is not a function of its input alone CANNOT be
 * byte-compared, and the byte comparison is the only thing that makes the shipped
 * text bound to the code rather than adjacent to it.
 *
 * THE VOICE IS MECHANICAL ON PURPOSE AND MUST NOT BE SMOOTHED INTO PROSE. A later
 * author reading this will want to make the sentences read better. Do not. Every
 * fluent version of this text that has ever shipped in this file drifted from the
 * code within one wave, because a sentence a person can improve is a sentence a
 * person can change without re-reading the branch it describes. A mechanical
 * sentence that is TRUE beats a fluent one that drifts. If the shape of an entry has to change, change it HERE and regenerate;
 * the byte comparison will name every surface that needs the new bytes.
 */
export function deriveResidual(registry: readonly ResolverRecord[]): string {
  const resolvers = registry.filter((r) => r.kind === "resolver");
  const silences = registry.filter((r) => r.kind === "measured-silence");

  const lines: string[] = [
    "THE RESIDUAL OF CORE-11's OUTBOUND WALK - DERIVED, NOT AUTHORED.",
    "This text is the output of deriveResidual(RESOLVER_REGISTRY) in",
    "packages/backend/src/outbound-prohibition.spec.ts. It is machine-owned: a test",
    "reads this file's own bytes, extracts the span between the sentinels, and",
    "compares it to that output. If the two disagree the GENERATED text is",
    "authoritative and the shipped text is the defect.",
    "",
    "WHAT THIS TEXT ESTABLISHES, AND WHAT IT DOES NOT.",
    "1. Each entry below is verified by EXECUTION, at TWO granularities. Its probe",
    "   and its counter-probe are run through auditSource and asserted against the",
    "   rule identifiers recorded here; and every branch the entry's CLAUSE NAMES",
    "   carries its own probe, listed under it and executed the same way. So a",
    "   NAMED branch removed from the walk turns its own entry red. A branch the",
    "   clause does NOT name is covered by nothing here - see point 3, which this",
    "   point used to contradict. Until 2026-08-24 this point claimed that ANY",
    "   branch removed from the walk turned its entry red; it was FALSIFIED by",
    "   mutation (WR-32) and is corrected rather than deleted, because the",
    "   per-branch probes now support the narrower claim it makes.",
    "2. It does NOT prove the registry enumerates every mechanism the walk has. A",
    "   coverage guard enumerates TWO populations out of this file's own source -",
    "   collectors matching a declared naming convention, and resolver functions",
    "   declared inside the audit function or at module scope in the resolver",
    "   region - and requires each member to be an entry below OR a NAMED, reasoned",
    "   entry on an explicit exemption list. The bound is REGISTERED OR LISTED over",
    "   those two populations. It is NOT `detectable`: a resolver written as NEITHER",
    "   shape - an inline branch in the walk, a differently-shaped binding, a",
    "   resolver declared inside another function - is enumerated by neither half",
    "   and is NOT caught.",
    "3. Each entry's probes are EXAMPLES. They prove the entry true OF ITSELF and",
    "   do not cover that resolver's whole domain.",
    "4. The MEASURED SILENCE entries are NOT proven exhaustive: a shape nobody",
    "   thought of is still silent and still unlisted here.",
    "5. WHAT CLAUSE-TO-BRANCH BINDING CANNOT PROVE - FOUR THINGS, STATED FLATLY.",
    "   (a) It does NOT prove a clause NAMES every branch the code has. A branch",
    "       the clause is silent about is bound to nothing, exactly as before.",
    "   (b) It does NOT prove BRANCH_VOCABULARY covers every way a branch can be",
    "       named in English. A clause phrased outside that list is unmatched, and",
    "       therefore unbound; its pinned hit count is what makes a vocabulary",
    "       that stopped matching visible, not a claim that it matches everything.",
    "   (c) It does NOT prove UNBOUNDED_QUANTIFIERS covers every way a universal",
    "       can be SPELLED. That list is the same kind of frozen, hand-maintained",
    "       phrase list, so a clause asserting a universal in an UNDECLARED",
    "       phrasing raises no obligation and passes. The quantifier guard reaches",
    "       the phrasings it declares and NO FURTHER. This is disclosed here on",
    "       the same terms as (b) rather than left for a later round to find by",
    "       rephrasing one clause.",
    "   (d) It does NOT prove the registry ENUMERATES every mechanism, which point",
    "       2 above already states and which is restated here only to keep the",
    "       four limits together.",
    "",
    `RESOLVERS - ${plural(resolvers.length)}.`,
  ];
  for (const row of resolvers) lines.push(...formatEntry(row));
  lines.push("", `MEASURED SILENCES - ${plural(silences.length)}.`);
  for (const row of silences) lines.push(...formatEntry(row));
  return lines.join("\n");
}

/**
 * A SENTINEL IS MISSING FROM A FILE THAT WAS SUCCESSFULLY READ.
 *
 * Its own class rather than a bare `Error` so a reader of the failure message
 * alone can tell it from `PlanningLedgerAbsentError` (the FILE is gone) and from a
 * divergence assertion (the file and the sentinels are there and the BYTES
 * differ). Those three call for three different actions.
 */
export class SentinelMissingError extends Error {
  override readonly name = "SentinelMissingError";
}

/**
 * PULL THE SENTINEL-DELIMITED SPAN OUT OF A FILE'S OWN BYTES.
 *
 * THROWS rather than returning an empty string when a marker is missing. A helper
 * that answers "" for a vanished block is a gate that PASSES when its target
 * disappears, which is the exact failure mode this whole mechanism exists to
 * remove — and it would remove it by hand at the first refactor.
 *
 * The span is everything strictly between the line carrying `begin` and the line
 * carrying `end`, so each surface may wrap the markers in its own comment syntax
 * (a block comment here, an HTML comment in a markdown ledger) while the span itself is
 * byte-identical across surfaces.
 */
export function extractDerivedBlock(
  text: string,
  begin: string,
  end: string,
): string {
  const lines = text.split("\n");
  const first = lines.findIndex((l) => l.includes(begin));
  const last = lines.findIndex((l) => l.includes(end));
  if (first === -1) {
    throw new SentinelMissingError(
      `the BEGIN sentinel is absent. Looked for a line containing: ${begin}. The generated block is machine-owned; restore the sentinel and paste deriveResidual(RESOLVER_REGISTRY)'s output between the markers.`,
    );
  }
  if (last === -1) {
    throw new SentinelMissingError(
      `the END sentinel is absent. Looked for a line containing: ${end}. The generated block is machine-owned; restore the sentinel and paste deriveResidual(RESOLVER_REGISTRY)'s output between the markers.`,
    );
  }
  if (last <= first) {
    throw new SentinelMissingError(
      `the END sentinel precedes the BEGIN sentinel (END at line ${last + 1}, BEGIN at line ${first + 1}). The span is unreadable; restore the marker order.`,
    );
  }
  return lines.slice(first + 1, last).join("\n");
}

/**
 * THE PLANNING LEDGER IS ABSENT FROM THIS TREE.
 *
 * Its own class, distinct from `SentinelMissingError`, because a reader of the
 * failure message ALONE must be able to tell three situations apart — they call
 * for three different actions:
 *
 *   PlanningLedgerAbsentError  the FILE is gone. You are probably on a tree the
 *                              `gsd-pr-branch` workflow produced, which exists to
 *                              strip `.planning/` commits. Run the suite on the
 *                              full tree.
 *   SentinelMissingError       the file is there and a MARKER was removed. Restore
 *                              the marker and regenerate the span.
 *   the divergence assertion   the file and both markers are there and the BYTES
 *                              differ. Paste the generated block from the failure
 *                              message.
 */
export class PlanningLedgerAbsentError extends Error {
  override readonly name = "PlanningLedgerAbsentError";
}

/**
 * READ A `.planning/` LEDGER, RAISING A NAMED ERROR RATHER THAN AN OPAQUE ENOENT.
 *
 * THE COUPLING THIS INTRODUCES, DECLARED AS A DECISION RATHER THAN SLIPPED IN.
 * This is the FIRST dependency in this repository from a test under
 * `packages/backend/src` on the `.planning/` directory. `tests/pins.spec.ts` is
 * NOT a precedent for it and must not be cited as one: it reads
 * `pnpm-workspace.yaml`, `pnpm-lock.yaml`, three `package.json` files and
 * `scripts/phase1/tracer-e2e.sh`, and no planning file at all. What it IS a
 * precedent for is the repo-root relative PATH CONVENTION, which this reader
 * follows.
 *
 * WHY THE LEDGER IS DERIVED RATHER THAN POINTED AT. `.planning/REQUIREMENTS.md`
 * carries the text a requirement's COMPLETION is read against, and it is the copy
 * that drifted through five consecutive rounds — CORE-11's `[x]` was flipped
 * against it once and reverted twice. A pointer there would leave the ledger a
 * reader trusts most as the one surface that can still be wrong.
 *
 * WHAT THE SUITE DOES ON A TREE WHERE `.planning/` IS ABSENT: IT FAILS, LOUDLY
 * AND BY NAME. This toolchain ships a `gsd-pr-branch` workflow whose stated
 * purpose is producing a branch with the `.planning/` commits filtered out, so
 * that tree is not hypothetical. Failing is a DELIBERATE choice over skipping. A
 * check that silently skips when its target is missing is exactly how a gate ends
 * up green having read nothing, which is the failure mode this entire mechanism is
 * built against — and it is the failure this file has now found five times. A
 * later author reaching for a conditional skip here has to argue with this
 * paragraph first.
 */
export function readPlanningLedger(path: string): string {
  if (!existsSync(path)) {
    throw new PlanningLedgerAbsentError(
      `${path} does not exist on this tree, so CORE-11's derived residual could not be read. This is NOT a skip: the check fails deliberately. If you are on a branch produced by the \`gsd-pr-branch\` workflow, the \`.planning/\` commits were filtered out by design — run this suite on the full tree.`,
    );
  }
  return readFileSync(path, "utf8");
}

/**
 * THE COVERAGE GUARD'S EXEMPTION LIST — EVERY ENTRY NAMED, EVERY ENTRY REASONED.
 *
 * THIS LIST IS THE POINT, NOT A LOOPHOLE. A function inside the enumerated
 * populations that is genuinely not a resolver goes here BY NAME with one clause
 * saying why. That converts an invisible population into a LISTED one: adding a
 * resolver function is a failing test until somebody either registers it or
 * writes it down here, and a reviewer can read this list and DISAGREE with an
 * entry. An unnamed blind spot cannot be disagreed with — which is exactly what
 * five rounds of authored residual were.
 *
 * An EMPTY list would also be a failure of this design, not a success: it would
 * mean the enumeration is matching nothing that needs excusing, which in a file
 * this size means the enumeration stopped matching.
 */
const RESOLVER_EXEMPTIONS: Readonly<Record<string, string>> = Object.freeze({
  // --- declared inside auditSource ---
  add: "records a Violation into the output array; it resolves no expression and reads no binding.",
  bindString:
    "WRITES a literal into constStrings; it is the collector's setter, and what it feeds is stated by the constStrings row.",
  // WR-33, REWRITTEN 2026-08-24 AT FULL WEIGHT. What stood here said `collect`
  // "decides nothing about what an expression IS". That is MATERIALLY FALSE, and
  // it was false in the worst available place: the guard's own POPULATION 3
  // paragraph names "an inline branch in `collect`" as residue it cannot see, and
  // this entry — the entry ON that function — told a reader the residue was not
  // there. A declared blind spot and the list that excuses it agreeing that
  // nothing is there is how a blind spot survives a review.
  collect:
    "the first document-order pass: it invokes the collectors and records bindings. IT ALSO DECIDES TWO THINGS INLINE, and both are POPULATION 3 in this guard's own terms - residue enumerated by neither half. (1) Its ASSIGNING_OPERATORS test decides which right-hand expressions ever reach a resolver at all, which is the entirety of CR-12. (2) Its `+=` compound-assembly branch decides that a string accumulation makes a name an UNREADABLE key. Neither decision is a registered mechanism; what covers them instead is the fixtures and the per-operator BranchProbes on the clauses they feed.",
  // WR-33, REWRITTEN 2026-08-24 AT THE VERIFIER'S WEIGHT, WHICH IS LOWER THAN THE
  // REVIEWER'S AND THE DIFFERENCE IS THE POINT. The verifier SPLIT this finding:
  // `collect`'s reason is materially false, `visit`'s is MISLEADING RATHER THAN
  // FALSE, because each individual resolution genuinely IS delegated. Writing this
  // one as flatly false would be borrowing weight a measurement declined to give
  // it — the same defect as an overstated residual, one list over.
  visit:
    "the second document-order pass: it applies the rules to the bindings collect() produced, and each INDIVIDUAL resolution it performs is delegated to a registered mechanism - unwrap, receiverKind, literalOf and the global resolvers are all registry rows. WHAT IS NOT REGISTERED IS THE DISPATCH: which resolver is consulted where. visit chooses unwrap for a call callee and never operatorReceiver, and that choice is the seam CR-11 lived in. TWO FURTHER RULES ARE DECIDED INLINE HERE and are POPULATION 3 for the same reason collect's two are: the require(...) specifier rule, and the navigator-destructure rule.",
  // --- declared at module scope, in the resolver region ---
  shippedFiles:
    "enumerates the .ts files under both SOURCE_ROOTS. A filesystem walk, not an expression resolver.",
  rootHasSubdirectory:
    "a non-vacuity check on that filesystem walk — it answers whether a root has any subdirectory at all.",
  operatorOperands:
    "extracts the operands its two consumers descend into. Its behaviour is stated by the operatorReceiver and operatorLiteralBinding rows and it has no independent answer.",
  aliasSuffix:
    "formats the ` (an alias of \\`x\\`)` fragment of a violation message.",
  callDetail: "formats the violation detail for a call site.",
  constructionDetail: "formats the violation detail for a `new` site.",
  auditSource:
    "the entry point that HOSTS every resolver. It is the subject the registry describes, not a member of it.",
  formatRules: "renders a rule-id list into the generated text.",
  plural: "renders a count into the generated text.",
  formatEntry: "renders one registry row into the generated text.",
  deriveResidual:
    "renders the residual text from the registry. It reads no AST and resolves no expression.",
  extractDerivedBlock:
    "pulls a sentinel-delimited span out of a file's TEXT. It reads no AST and resolves no expression.",
  readPlanningLedger:
    "reads a `.planning/` ledger's TEXT behind a named-error guard. It reads no AST and resolves no expression.",
  enumerateResolverPopulations:
    "reads this file's own source TEXT to enumerate the two populations the guard checks. It is the guard's input, not a mechanism of the walk.",
});

/**
 * THE COVERAGE GUARD — WHAT IT ENUMERATES, AND WHAT IT CANNOT SEE.
 *
 * THE BOUND IS "REGISTERED OR LISTED OVER TWO ENUMERATED POPULATIONS". It is NOT
 * "every new resolver is detectable", and no sentence in this file, in the
 * generated text or in any summary may say that it is. Stating a stronger bound
 * than the mechanism has is the exact defect this whole plan exists to reduce, and
 * a guard that overclaims about itself is the sixth instance of it.
 *
 * POPULATION 1 — COLLECTORS. Every `const <name> = new Map<…>` or
 * `new Set<…>` declared at auditSource's own indentation, inside auditSource's own
 * line span. That naming convention is DECLARED here rather than inferred, so a
 * later author who renames a collector out of it is renaming out of a stated rule.
 *
 * POPULATION 2 — RESOLVER FUNCTIONS, IN BOTH SCOPES. Every `function <name>(` and
 * every `const <name> = (` declared at auditSource's own indentation inside
 * auditSource, AND every one declared at column zero in the resolver region — from
 * the first `import` to the first `describe(`.
 *
 * WHY BOTH SCOPES, RECORDED AS A DISCREPANCY RATHER THAN SMOOTHED OVER. The plan
 * that commissioned this guard described population 2 as "function declarations
 * inside the audit function" and named `isAssembledKey`, `isProvablyNumeric` and
 * `unwrap` as members of it. MEASURED, all three are declared at MODULE scope, so
 * the literal reading of that sentence would have excluded the three functions the
 * sentence itself cited. The population spans both scopes because the measurement
 * said so, not because the plan did. The half that matters most is the
 * auditSource half — WR-27 was a defect in `receiverKind`, wave 24 edited
 * `keyReceiver` and wave 25 edited `initializerReceiver` — so a guard blind to the
 * function-shaped population would have been blind exactly where this round's
 * findings came from.
 *
 * POPULATION 3 — ENUMERATED BY NEITHER HALF, AND THEREFORE NOT CAUGHT. A resolver
 * written as NEITHER a matching collector NOR a declared function: an inline branch
 * in `collect` or `visit`, a differently-shaped binding (`const f = function () {}`,
 * a class method, a resolver reached through an object literal), or a resolver
 * declared inside another function. Nothing below sees any of those. That residue
 * is named HERE rather than left to be discovered, because an undeclared blind spot
 * is the artifact this mechanism replaces.
 *
 * NON-VACUITY IS ASSERTED FOR BOTH POPULATIONS BEFORE THE RULE. A convention that
 * stops matching — because a later author renames a collector, wraps the functions
 * differently, or moves auditSource — must FAIL LOUDLY rather than pass having
 * enumerated nothing. That failure mode is the one this whole mechanism exists to
 * remove and it must not be reintroduced by its own guard.
 */
const AUDIT_FN_OPEN =
  "export function auditSource(file: string, source: string): Violation[] {";
const COLLECTOR_CONVENTION = /^const (\w+) = new (?:Map|Set)</;
const FUNCTION_CONVENTION =
  /^(?:export )?(?:function (\w+)\(|const (\w+) = \()/;

type Populations = {
  readonly collectors: readonly string[];
  readonly functions: readonly string[];
};

/**
 * Enumerate both populations out of the gate file's OWN SOURCE TEXT.
 *
 * Exported so the guard's input can be inspected rather than trusted, and because
 * `knip`'s `ignoreExportsUsedInFile` makes an in-file export honest here.
 */
export function enumerateResolverPopulations(text: string): Populations {
  const lines = text.split("\n");
  const open = lines.indexOf(AUDIT_FN_OPEN);
  if (open === -1) {
    throw new SentinelMissingError(
      `the audit function's opening line was not found. Looked for exactly: ${AUDIT_FN_OPEN}. The coverage guard cannot bound its first population without it — fix the anchor rather than deleting the guard.`,
    );
  }
  let close = open + 1;
  while (close < lines.length && lines[close] !== "}") close += 1;

  const importAt = lines.findIndex((l) => l.startsWith("import "));
  const describeAt = lines.findIndex((l) => l.startsWith("describe("));

  const collectors: string[] = [];
  const functions: string[] = [];

  for (let k = open + 1; k < close; k += 1) {
    const line = lines[k] ?? "";
    // auditSource's own indentation, exactly: two spaces and not three.
    if (!line.startsWith("  ") || line.startsWith("   ")) continue;
    const body = line.slice(2);
    const collector = COLLECTOR_CONVENTION.exec(body);
    if (collector?.[1] !== undefined) {
      collectors.push(collector[1]);
      continue;
    }
    const fn = FUNCTION_CONVENTION.exec(body);
    const name = fn?.[1] ?? fn?.[2];
    if (name !== undefined) functions.push(name);
  }

  for (let k = importAt; k < describeAt; k += 1) {
    const line = lines[k] ?? "";
    if (line === "" || line.startsWith(" ")) continue;
    const fn = FUNCTION_CONVENTION.exec(line);
    const name = fn?.[1] ?? fn?.[2];
    if (name !== undefined) functions.push(name);
  }

  return Object.freeze({
    collectors: Object.freeze(collectors),
    functions: Object.freeze(functions),
  });
}

// ---------------------------------------------------------------------------
// THE REAL TREE
// ---------------------------------------------------------------------------
describe(`CORE-11 — no outbound surface is reachable from ${SOURCE_ROOTS.join(" or ")}`, () => {
  // BOUND ONCE, AND EVERY CASE BELOW READS THIS BINDING (IN-08). The previous
  // version called the walk twice: once for the non-vacuity assertions and again
  // for `it.each`. Two filesystem walks means the assertions that say "the scan
  // is not empty and contains these files" were made against a DIFFERENT array
  // than the per-file cases iterated — the two could disagree about what was
  // scanned and neither would say so. Asserted explicitly below.
  const files = shippedFiles();

  it("enumerates a NON-EMPTY set of shipped modules, BY NAME, ACROSS BOTH ROOTS", () => {
    // Without this the whole gate passes by measuring nothing. Names rather than
    // a count, so a rename or a moved directory is a VISIBLE change instead of a
    // silently shrunk scanned set.
    expect(
      files.length,
      `no .ts modules found under ${SOURCE_ROOTS.join(" or ")}`,
    ).toBeGreaterThan(0);
    for (const expected of [
      "index.ts",
      "lifecycle.ts",
      "telemetry.ts",
      "compat.ts",
      "hooks/admit.ts",
      "hooks/passive.ts",
      "ingest/consumer.ts",
      "store/observations.ts",
      "store/retention.ts",
      // IN-10: db.ts is scanned by both gates in this package and was named by
      // neither. It owns the pooled handle and it is the module whose rename
      // would be least noticed.
      "store/db.ts",
      // The engine, named so a package split or a moved module is a loud failure
      // rather than a quietly halved scan. pipeline.ts is the "no speculative
      // retrieval" module CR-04 rates the widest hole.
      "pipeline.ts",
      "decode.ts",
      "queue.ts",
    ]) {
      expect(
        files.some((f) => f.endsWith(`/${expected}`)),
        `${expected} is not being audited`,
      ).toBe(true);
    }
  });

  it("every root contributes at least one file to the scan", () => {
    // A root that vanishes, or a package that moves, must be a loud failure and
    // not a scan that quietly halved. Per root, by prefix, so neither can hide
    // behind the other's file count.
    for (const root of SOURCE_ROOTS) {
      expect(
        files.filter((f) => f.startsWith(`${root}/`)).length,
        `no file under ${root} reached the scan`,
      ).toBeGreaterThan(0);
    }
  });

  it("the walk really DESCENDED into subdirectories, per root", () => {
    // A non-recursive read would enumerate index.ts, lifecycle.ts, telemetry.ts
    // and compat.ts and pass every rule below having never opened the hook, the
    // consumer or the store.
    //
    // Asserted per root and CONDITIONED ON THE ROOT ACTUALLY HAVING A
    // SUBDIRECTORY, because packages/engine/src is flat today: an unconditional
    // per-root descent assertion would fail there for a reason that is a fact
    // about the engine's layout rather than a defect in this walk, and a test
    // that fails because a directory is flat teaches nobody anything. The
    // condition is read from disk, so the day the engine grows a subdirectory
    // this assertion starts holding it to the same standard with no edit here.
    for (const root of SOURCE_ROOTS) {
      if (!rootHasSubdirectory(root)) continue;
      const relative = files
        .filter((f) => f.startsWith(`${root}/`))
        .map((f) => f.slice(root.length + 1));
      expect(
        relative.filter((r) => r.includes("/")),
        `${root} has subdirectories but no enumerated path under it contains a separator, so the walk is flat there`,
      ).not.toEqual([]);
    }
  });

  it("the per-file cases iterate the SAME binding the assertions above measured", () => {
    // IN-08 made executable rather than asserted in a comment. `it.each` is given
    // `files`, so this compares the binding to a fresh walk: if the two ever
    // disagree, the non-vacuity guarantees above stop covering what is scanned.
    expect(shippedFiles()).toEqual(files);
  });

  it.each(files)("%s reaches no outbound surface", (file) => {
    const violations = auditSource(file, readFileSync(file, "utf8"));
    expect(
      violations.map((v) => `${v.rule}: ${v.detail}`),
      `${file} reaches an outbound network surface, which CORE-11 forbids in every module the plugin ships — ${SOURCE_ROOTS.join(" and ")}`,
    ).toEqual([]);
  });

  it("telemetry.ts NAMES caido:http in prose and still reports clean", () => {
    // The documentation hazard, live and asserted on the real file. If the header
    // is ever reworded this fails loudly rather than leaving a case that proves
    // nothing — the same reason sql-discipline.spec.ts asserts its PRAGMA
    // exemption is still exercised.
    const file = posix.join(BACKEND_SRC, "telemetry.ts");
    const source = readFileSync(file, "utf8");
    expect(
      source,
      "telemetry.ts no longer names caido:http, so the AST-vs-text case below is vacuous",
    ).toContain(HTTP_SPECIFIER);
    expect(auditSource(file, source)).toEqual([]);
  });

  it("telemetry.ts reaches globalThis the way this codebase reaches globals, and still reports clean", () => {
    // THE false positive that decides whether the fetch rule is usable, asserted
    // LIVE against the real file rather than only as an inline fixture. The
    // codebase's established idiom for reaching a global is
    // `(globalThis as { x?: ... }).x`, because in a runtime where you cannot
    // assume a bare global exists that is what you write — which is precisely why
    // `globalThis.fetch` was the spelling the round-1 gate could not see. The
    // widened rule matches a member NAMED `fetch` on a global receiver, so
    // `performance` on the same receiver stays quiet. If this file ever stops
    // using the idiom, the containment assertion fails rather than leaving a case
    // that proves nothing.
    const file = posix.join(BACKEND_SRC, "telemetry.ts");
    const source = readFileSync(file, "utf8");
    expect(
      source,
      "telemetry.ts no longer reaches globalThis, so the global-receiver false-positive case is vacuous",
    ).toContain("(globalThis as { performance?");
    expect(auditSource(file, source)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EVERY RULE'S FAILING PATH, EXECUTED — plus the legal shape it must stay quiet on
// ---------------------------------------------------------------------------
describe("the gate's own failure paths", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  // --- outbound-send -------------------------------------------------------

  it("outbound-send fires on the direct call", () => {
    expect(rulesOf("await sdk.requests.send(req);")).toContain("outbound-send");
  });

  it("outbound-send fires on the element-access form", () => {
    // `sdk.requests["send"](req)` is the same call and the obvious way around a
    // rule that only matched a property access.
    expect(rulesOf('await sdk.requests["send"](req);')).toContain(
      "outbound-send",
    );
  });

  it("outbound-send fires through a RECEIVER ALIAS", () => {
    expect(rulesOf("const r = sdk.requests;\nawait r.send(req);")).toContain(
      "outbound-send",
    );
  });

  it("outbound-send fires on a DESTRUCTURED method", () => {
    expect(
      rulesOf("const { send } = sdk.requests;\nawait send(req);"),
    ).toContain("outbound-send");
    // …including the renamed form, which is the same lift with a different label.
    expect(
      rulesOf("const { send: go } = sdk.requests;\nawait go(req);"),
    ).toContain("outbound-send");
  });

  it("outbound-send does NOT fire on sdk.requests.get — the reload the consumer depends on", () => {
    // THE most important false positive to rule out. A gate that broke the CORE-05
    // reload path would be reverted within the hour, and rightly.
    expect(rulesOf("const rr = await sdk.requests.get(id);")).toEqual([]);
  });

  it("outbound-send does NOT fire on other requests methods, or on a send elsewhere", () => {
    expect(rulesOf("await sdk.requests.query();")).toEqual([]);
    expect(rulesOf("await sdk.requests.inScope(request);")).toEqual([]);
    // `send` on an unrelated receiver is not an outbound surface at all.
    expect(rulesOf("logger.send(line);")).toEqual([]);
    expect(rulesOf("const { send } = logger;\nsend(line);")).toEqual([]);
  });

  // --- outbound-net --------------------------------------------------------

  it("outbound-net fires on sdk.net.connect and on any other method of that receiver", () => {
    expect(rulesOf("await sdk.net.connect(host, port);")).toContain(
      "outbound-net",
    );
    expect(rulesOf("await sdk.net.somethingElse(host);")).toContain(
      "outbound-net",
    );
    expect(
      rulesOf("const n = sdk.net;\nawait n.connect(host, port);"),
    ).toContain("outbound-net");
  });

  it("outbound-net does NOT fire on an identifier merely NAMED net", () => {
    expect(rulesOf("const net = { port: 443 };\nreturn net.port;")).toEqual([]);
  });

  // --- outbound-fetch ------------------------------------------------------

  it("outbound-fetch fires on a call to the bare global", () => {
    expect(rulesOf("const res = await fetch(url);")).toContain(
      "outbound-fetch",
    );
  });

  it("outbound-fetch does NOT fire on a fetch METHOD of some object", () => {
    // `cache.fetch(url)` is a method on an object, not the global, and reaches
    // nothing outside the process.
    expect(rulesOf("const res = await cache.fetch(url);")).toEqual([]);
  });

  // CR-15, 2026-08-25, wave 34. THE RECEIVER-POSITION ARM, WITH ITS FAILING PATH
  // AND ITS CONTROL IN ONE CASE. The pair below is the finding in two lines: the
  // SAME binding, silent as a receiver and reporting as a callee, until this arm
  // existed. Both directions are asserted here so that neutering the arm's EFFECT
  // while leaving its condition intact turns THIS case red.
  it("outbound-fetch fires on the global in RECEIVER position, and on an identified alias in the same position — with the CALLEE spelling of that alias as the control in the same case", () => {
    expect(rulesOf("fetch.call(null, url);")).toEqual(["outbound-fetch"]);
    expect(rulesOf("fetch.apply(null, [url]);")).toEqual(["outbound-fetch"]);
    expect(rulesOf("const f = fetch;\nf.call(null, url);")).toEqual([
      "outbound-fetch",
    ]);
    // The control: the same alias one position over. It reported BEFORE this arm
    // and reports after it, so a case that only asserted the receiver spelling
    // could not tell the arm from the rule it sits beside.
    expect(rulesOf("const f = fetch;\nf(url);")).toEqual(["outbound-fetch"]);
  });

  it("the member-qualified global fetch under `.call` reports EXACTLY ONCE — the receiver-position arm does not double the arm above it", () => {
    // The identifier restriction in the receiver-position arm exists for this
    // assertion. Drop it and this case reports twice.
    expect(rulesOf("globalThis.fetch.call(null, url);")).toEqual([
      "outbound-fetch",
    ]);
    expect(rulesOf("globalThis.fetch(url);")).toEqual(["outbound-fetch"]);
  });

  it("the SDK send member under `.call` reports — the structural twin that showed the machinery existed before the arm did", () => {
    expect(rulesOf("sdk.requests.send.call(null, req);")).toEqual([
      "outbound-send",
    ]);
  });

  // A MEASURED SILENCE, TITLED AS ONE. Neither line below can go red under the
  // mutation the cases above sit beside, because no branch answers either shape.
  // Each is measured by a registry row named here so a reader is sent to the
  // probe rather than left to infer one: `silence-bare-global-argument-position`
  // measured the first, `silence-global-fetch-receiver-position` the second.
  // Recording them beside the arm is what keeps the arm from reading as a class.
  it("MEASURED SILENCE — the global as a call ARGUMENT, and an unreadable member of it, are both still silent after the receiver-position arm", () => {
    expect(rulesOf("Reflect.apply(fetch, null, [url]);")).toEqual([]);
    expect(rulesOf('fetch["ca" + "ll"](null, url);')).toEqual([]);
  });

  // CR-16, 2026-08-25, wave 34. THE UNREADABLE-MEMBER ARM, ON THE ONE RECEIVER
  // FAMILY IT DID NOT ACCEPT, with the destructure that already reported as the
  // control in the same case.
  it("outbound-unanalysable fires on an unreadable computed member of an identified `navigator` receiver — with the DESTRUCTURE spelling that already reported as the control in the same case", () => {
    expect(
      rulesOf('const m = "send" + "Beacon";\nnavigator[m](u, d);'),
    ).toEqual(["outbound-unanalysable"]);
    expect(
      rulesOf(
        'const n = navigator;\nconst m = "send" + "Beacon";\nn[m](u, d);',
      ),
    ).toEqual(["outbound-unanalysable"]);
    // The control: the same receiver family, the same unreadable key, spelled as
    // a destructure. It reported twenty lines away in this rule BEFORE the arm
    // was widened, which is what made the asymmetry a finding rather than a
    // guess.
    expect(
      rulesOf(
        'const m = "send" + "Beacon";\nconst { [m]: b } = navigator;\nb(u, d);',
      ),
    ).toEqual(["outbound-unanalysable"]);
    // And the arm did not become a catch-all for ordinary objects.
    expect(rulesOf('const m = "se" + "nd";\nplain[m](x);')).toEqual([]);
  });

  // A MEASURED SILENCE, TITLED AS ONE. `silence-unreadable-member-of-navigator`
  // carries the probe; the mechanism is the resolution boundary, not readability.
  it("MEASURED SILENCE — an unreadable member of a `navigator` handed across a FUNCTION BOUNDARY is still silent after the arm was widened", () => {
    expect(
      rulesOf(
        'function h(n) { const m = "send" + "Beacon"; return n[m](u, d); }\nh(navigator);',
      ),
    ).toEqual([]);
  });

  // CR-15's SECOND ARM, 2026-08-25, wave 34, with its exactly-once control.
  it("outbound-dynamic-code fires on a dynamic-code global in RECEIVER position, and through an alias in the same position", () => {
    expect(rulesOf("eval.call(null, src);")).toEqual(["outbound-dynamic-code"]);
    expect(rulesOf("Function.call(null, src);")).toEqual([
      "outbound-dynamic-code",
    ]);
    expect(rulesOf("const e = eval;\ne.call(null, src);")).toEqual([
      "outbound-dynamic-code",
    ]);
    // Exactly once, both directions: the member-qualified receiver and the plain
    // call each answer through one arm only.
    expect(rulesOf("globalThis.eval.call(null, src);")).toEqual([
      "outbound-dynamic-code",
    ]);
    expect(rulesOf("eval(src);")).toEqual(["outbound-dynamic-code"]);
    // And it did not become a catch-all for a member merely NAMED eval.
    expect(rulesOf("obj.eval(src);")).toEqual([]);
  });

  // A MEASURED SILENCE, TITLED AS ONE. `silence-dynamic-code-global-receiver-position`
  // and `silence-outbound-ctor-receiver-position` carry the probes.
  it("MEASURED SILENCE — an unreadable member of a dynamic-code global, and an outbound CONSTRUCTOR in receiver position, are both still silent after the two arms this wave added", () => {
    expect(rulesOf('eval["ca" + "ll"](null, src);')).toEqual([]);
    expect(rulesOf("WebSocket.call(null, u);")).toEqual([]);
  });

  // IN-32, 2026-08-25, wave 34. THE RETRACTION MADE EXECUTABLE. The claim above
  // the beacon constants is now bounded rather than widened, and the bound is
  // asserted here so a later edit that "fixes" the computed key has to move this
  // case rather than leave a docblock claiming the old shape.
  it("a COMPUTED destructure key off `navigator` reports the UNANALYSABLE surface, not the beacon one — the safe direction with the wrong rule identifier, asserted so the bound cannot rot", () => {
    expect(
      rulesOf('const { ["sendBeacon"]: b } = navigator;\nb(u, d);'),
    ).toEqual(["outbound-unanalysable"]);
    // The plain spelling of the same destructure, one bracket pair apart.
    expect(rulesOf("const { sendBeacon: b } = navigator;\nb(u, d);")).toEqual([
      "outbound-beacon",
    ]);
  });

  // IN-33, 2026-08-25, wave 34. THE TWO NEIGHBOURS OF THE DESTRUCTURE CLOSURE,
  // executed rather than described, with the one-deep spelling as the control.
  it("MEASURED SILENCE — a destructure deeper than one element, and one nested through an array pattern, are both silent; the one-deep object spelling is the control", () => {
    expect(
      rulesOf("const { a: { requests: { send } } } = wrap;\nsend(req);"),
    ).toEqual([]);
    expect(rulesOf("const [{ send }] = [sdk.requests];\nsend(req);")).toEqual(
      [],
    );
    expect(rulesOf("const { requests: [first] } = sdk;\nfirst(req);")).toEqual(
      [],
    );
    expect(rulesOf("const { requests: { send } } = sdk;\nsend(req);")).toEqual([
      "outbound-send",
    ]);
  });

  // WR-41 and IN-31, 2026-08-25, wave 34. BOTH DISCLOSE-ONLY, both titled as
  // measured silences, each naming the row that carries its probe.
  it("MEASURED SILENCE — a module loader reached by way of a local binding, in BOTH directions, with the direct spelling as the control", () => {
    expect(rulesOf('const r = require;\nr("caido:http");')).toEqual([]);
    expect(rulesOf("const r = require;\nr(s);")).toEqual([]);
    expect(rulesOf('require("caido:http");')).toEqual(["outbound-import"]);
    expect(rulesOf("require(s);")).toEqual(["outbound-unanalysable"]);
  });

  it("MEASURED SILENCE — the global fetch invoked as a TAGGED TEMPLATE, with the ordinary call spelling as the control", () => {
    expect(rulesOf("fetch`https://example.test/${p}`;")).toEqual([]);
    expect(rulesOf('fetch("https://example.test");')).toEqual([
      "outbound-fetch",
    ]);
  });

  // --- outbound-import -----------------------------------------------------

  it("outbound-import fires on all four specifier forms", () => {
    expect(rulesOf('import { fetch } from "caido:http";')).toContain(
      "outbound-import",
    );
    expect(rulesOf('export { fetch } from "caido:http";')).toContain(
      "outbound-import",
    );
    expect(rulesOf('const m = await import("caido:http");')).toContain(
      "outbound-import",
    );
    expect(rulesOf('const m = require("caido:http");')).toContain(
      "outbound-import",
    );
  });

  it("outbound-import does NOT fire on any other specifier, crypto included", () => {
    expect(rulesOf('import { createHash } from "crypto";')).toEqual([]);
    expect(rulesOf('export { x } from "./telemetry";')).toEqual([]);
    expect(rulesOf('const m = await import("node:fs");')).toEqual([]);
    expect(rulesOf('const m = require("sqlite");')).toEqual([]);
  });

  // --- the documentation case ----------------------------------------------

  it("a file that DISCUSSES the forbidden surfaces in comments yields ZERO violations", () => {
    // The case that would have caught the mistake. This is what proves the gate
    // reads the AST and not the text, and it is why telemetry.ts can keep the
    // paragraph explaining the prohibition.
    const documented = [
      "// This module deliberately does NOT import caido:http and does NOT call",
      "// sdk.requests.send(request) — see CORE-11 and the header of telemetry.ts.",
      "/*",
      " * Historical note: an earlier draft called sdk.requests.send(req), reached",
      ' * sdk.net.connect(host, port), used fetch(url), and imported "caido:http".',
      " * Every one of those was removed before the phase shipped.",
      " */",
      "export const passive = true;",
    ].join("\n");
    expect(auditSource("documented.ts", documented)).toEqual([]);
  });

  // --- the failure message -------------------------------------------------

  it("a violation names the file, the surface and WHY, not a bare rule id", () => {
    const [v] = auditSource(
      "packages/backend/src/hooks/passive.ts",
      "await sdk.requests.send(req);",
    );
    expect(v).toBeDefined();
    expect(v.file).toBe("passive.ts");
    expect(v.detail).toContain("packages/backend/src/hooks/passive.ts");
    expect(v.detail).toContain("sdk.requests.send");
    expect(v.detail).toContain("onInterceptResponse");
  });
});

describe("the rule set is data, not logic to trace", () => {
  it("FORBIDDEN_OUTBOUND enumerates exactly the eight surfaces CORE-11 names", () => {
    // WHY THE SET GREW FROM FOUR TO SIX on 2026-08-21, so the next reader does
    // not read it as drift. Four rules covered the surfaces CORE-01's sentence
    // listed by name. CORE-11 says "of any kind", and the verifier's 22-shape
    // probe found two whole CLASSES outside the named four: a construction of an
    // outbound global (`new WebSocket`), and — worse — a construct the walk could
    // not READ, which the round-1 gate silently treated as clean. The second is
    // not a surface at all; it is the admission that a gate which cannot see
    // something must say so rather than pass it.
    //
    // AND FROM SIX TO EIGHT on 2026-08-22, for the same reason one level out. The
    // verifier probed two surfaces the round-2 review had not: `navigator.sendBeacon`
    // — the outbound global most likely to EXIST in a host that has none of the
    // three constructors — and dynamic code construction, where `eval("…send(r)")`
    // defeats every other rule in this file at once while reporting clean. Both
    // were quiet AND absent from the header's enumeration, which is the worse
    // failure: a reader had no way to know they were missing.
    expect(FORBIDDEN_OUTBOUND.map((f) => f.rule)).toEqual([
      "outbound-send",
      "outbound-net",
      "outbound-fetch",
      "outbound-import",
      "outbound-global-ctor",
      "outbound-beacon",
      "outbound-dynamic-code",
      "outbound-unanalysable",
    ]);
    // Every entry carries a consequence, because that is what the failure text is
    // built from. An entry with an empty `why` would produce a bare rule id.
    for (const f of FORBIDDEN_OUTBOUND) {
      expect(f.why.length, `${f.rule} carries no reason`).toBeGreaterThan(40);
      expect(f.surface.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// THE VERIFIER'S 22-SHAPE PROBE, RE-RUN AS EXECUTED CASES
// ---------------------------------------------------------------------------
// 01-VERIFICATION.md:150-171 imported `auditSource` and probed it with 22 shapes.
// Eight were caught and FOURTEEN were missed — several of them the idiomatic way
// to write the call. That probe lived in a verification document, where it could
// not fail a build; here it is the suite, so a regression that reopens any of the
// fourteen is a red test rather than a paragraph somebody has to re-read.
//
// The controls come first for the reason the verifier gave: a MISSED row cannot
// be read as the probe being broken if the CAUGHT rows still pass beside it.
describe("the 22-shape gate-reach probe from 01-VERIFICATION.md", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  /** The eight the round-1 gate caught. Every one must STILL be caught: this is
   *  the half of the probe that says the widening broke nothing. */
  const CAUGHT: ReadonlyArray<readonly [string, string]> = [
    ["sdk.requests.send(q)", "await sdk.requests.send(req);"],
    [
      "const r = sdk.requests; r.send(q)",
      "const r = sdk.requests;\nawait r.send(req);",
    ],
    [
      "const { send } = sdk.requests; send(q)",
      "const { send } = sdk.requests;\nawait send(req);",
    ],
    ["fetch(u) bare", "const res = await fetch(url);"],
    ['import ... from "caido:http"', 'import { fetch } from "caido:http";'],
    ["sdk.net.connect(h,p)", "await sdk.net.connect(host, port);"],
    ["this.sdk.requests.send(q)", "await this.sdk.requests.send(req);"],
    ["sdk.requests.send?.(q)", "await sdk.requests.send?.(req);"],
  ];

  /** The fourteen it missed. Each row is the shape verbatim from the probe
   *  table, so the before/after comparison is one artifact and not two. */
  const MISSED: ReadonlyArray<readonly [string, string]> = [
    ["globalThis.fetch(u)", "await globalThis.fetch(url);"],
    // The `export {};` is NOT decoration and NOT a weakening of the shape. A bare
    // top-level `await (x as any).f()` in a file with NO import and NO export is
    // parsed by TypeScript in SCRIPT context, where `await` is an ordinary
    // identifier — so `await (globalThis as any)` becomes a CALL to a function
    // named `await` and the cast stops being the callee's receiver. Every module
    // this gate actually walks has an import or an export, so this fixture
    // carries one for the same reason. Verified by parsing all four forms.
    [
      "(globalThis as any).fetch(u)",
      "export {};\nawait (globalThis as any).fetch(url);",
    ],
    ["window.fetch(u)", "await window.fetch(url);"],
    [
      "const { requests } = sdk; requests.send(q)",
      "const { requests } = sdk;\nawait requests.send(req);",
    ],
    [
      "let r; r = sdk.requests; r.send(q)",
      "let r;\nr = sdk.requests;\nawait r.send(req);",
    ],
    [
      "sdk.requests.send.call(...)",
      "await sdk.requests.send.call(sdk.requests, req);",
    ],
    [
      "sdk.requests.send.apply(...)",
      "await sdk.requests.send.apply(sdk.requests, [req]);",
    ],
    [
      "Reflect.apply(sdk.requests.send, ...)",
      "await Reflect.apply(sdk.requests.send, sdk.requests, [req]);",
    ],
    [
      "const s = sdk.requests.send; s(q)",
      "const s = sdk.requests.send;\nawait s(req);",
    ],
    [
      'const m = "send"; sdk.requests[m](q)',
      'const m = "send";\nawait sdk.requests[m](req);',
    ],
    [
      'const r = "requests"; sdk[r].send(q)',
      'const r = "requests";\nawait sdk[r].send(req);',
    ],
    ["sdk.requests.sendRaw(q)", "await sdk.requests.sendRaw(req);"],
    [
      'await import("caido:" + "http")',
      'const m = await import("caido:" + "http");',
    ],
    [
      "new XMLHttpRequest() ... .send()",
      "const x = new XMLHttpRequest();\nx.send(body);",
    ],
    [
      'new WebSocket("wss://...")',
      'const ws = new WebSocket("wss://cdn.test/s");',
    ],
  ];

  it.each(CAUGHT)("control — %s is still caught", (_shape, src) => {
    expect(rulesOf(src), `${_shape} is no longer caught`).not.toEqual([]);
  });

  it.each(MISSED)("previously MISSED — %s now reports", (_shape, src) => {
    expect(rulesOf(src), `${_shape} still reports clean`).not.toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// THE EVASIONS, ENUMERATED BEFORE THE RULE THAT CATCHES THEM
// ---------------------------------------------------------------------------
// Round 1's gate passed every fixture it had and missed fourteen of twenty-two
// shapes, because the fixtures were written by the same reasoning that wrote the
// rule. These were written and confirmed RED against the round-1 walk before a
// line of that walk was touched.
describe("the global fetch, in the four spellings isFetchExpression branches on", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it.each([
    ["globalThis.fetch", "await globalThis.fetch(url);"],
    ["globalThis['fetch']", 'await globalThis["fetch"](url);'],
    [
      "(globalThis as any).fetch",
      "export {};\nawait (globalThis as any).fetch(url);",
    ],
    ["window.fetch", "await window.fetch(url);"],
    ["self.fetch", "await self.fetch(url);"],
    ["global.fetch", "await global.fetch(url);"],
    ["const f = fetch", "const f = fetch;\nawait f(url);"],
    [
      "const f = globalThis.fetch",
      "const f = globalThis.fetch;\nawait f(url);",
    ],
    [
      "const { fetch: f } = globalThis",
      "const { fetch: f } = globalThis;\nawait f(url);",
    ],
  ])("outbound-fetch fires on %s", (_shape, src) => {
    expect(rulesOf(src)).toContain("outbound-fetch");
  });
});

describe("an outbound receiver, however it was bound", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it("fires on a DESTRUCTURED requests receiver", () => {
    expect(
      rulesOf("const { requests } = sdk;\nawait requests.send(req);"),
    ).toContain("outbound-send");
  });

  it("fires on a DESTRUCTURED net receiver", () => {
    expect(rulesOf("const { net } = sdk;\nawait net.connect(h, p);")).toContain(
      "outbound-net",
    );
  });

  it("fires on an ASSIGNMENT alias", () => {
    expect(rulesOf("let r;\nr = sdk.requests;\nawait r.send(req);")).toContain(
      "outbound-send",
    );
  });

  it("fires on a CONDITIONAL initializer", () => {
    expect(
      rulesOf(
        "const r = flag ? sdk.requests : sdk.requests;\nawait r.send(req);",
      ),
    ).toContain("outbound-send");
  });

  it("fires on a receiver resolved through a single-hop const string", () => {
    expect(rulesOf('const r = "requests";\nawait sdk[r].send(req);')).toContain(
      "outbound-send",
    );
  });

  it("through receiverAliases: A USE ABOVE ITS OWN BINDING REPORTS — `s.send(req);` written before `const s = sdk.requests;` — CR-09 shape 5 of 7", () => {
    // CR-09, shape 5. The verifier executed this and it reported, while four
    // artifacts said it was silent. The mechanism is not subtle and it is not a
    // widening: `collect(sf)` completes before `visit(sf)` begins, so
    // `receiverAliases` already holds `s` by the time any call is considered.
    // Nothing about the use site's POSITION has ever bounded this rule.
    expect(rulesOf("s.send(req);\nconst s = sdk.requests;")).toContain(
      "outbound-send",
    );
  });

  it("through receiverAliases' TRANSITIVITY: FOUR HOPS in dependency order, with the use written ABOVE all four declarations, REPORTS", () => {
    // The `ANY DEPTH` clause of residual (a), made checkable rather than
    // decorative, on the receiver family rather than the global one. Every
    // alias set is grown from the LIVE set during the collect pass, so each
    // link resolves from the previous one; and because that pass finishes
    // before the violation pass starts, the use may sit above all of them.
    expect(
      rulesOf(
        "r4.send(req);\nconst r1 = sdk.requests;\nconst r2 = r1;\nconst r3 = r2;\nconst r4 = r3;",
      ),
    ).toContain("outbound-send");
  });

  // -------------------------------------------------------------------------
  // CR-12 — A LOGICAL ASSIGNMENT BINDS. Nine shapes were silent across `??=`,
  // `||=` and `&&=` while all four `=`/`+=` controls fired, which is what made
  // them real misses rather than a fixture artefact.
  //
  // EACH SHAPE GETS ITS OWN CASE, TITLED FOR THE COLLECTOR IT EXERCISES, per plan
  // 01-18's convention and per WR-23's note below: a single combined case cannot
  // show WHICH collector is load-bearing, so a mutation that broke one of seven
  // would move one combined case and name none of them.
  // -------------------------------------------------------------------------

  it("through receiverAliases' LOGICAL-ASSIGNMENT branch: `let r; r ??= sdk.requests; r.send(req)` is the ORDINARY lazy-init spelling of the line above it — CR-12 shape 1 of 9", () => {
    // MEASURED `[]` BEFORE THIS PLAN and `["outbound-send"]` after. The control
    // two characters away — `r = sdk.requests` — reported throughout, and is
    // pinned by its own case below.
    //
    // MECHANISM: `collect`'s alias-growing branch used to test
    // `node.operatorToken.kind === ts.SyntaxKind.EqualsToken` inline while the
    // numeric-poisoning arm ELEVEN LINES BELOW read `ASSIGNMENT_OPERATORS` and
    // named `x ||= sdk.requests` in its own comment. The two halves of one
    // statement disagreed about which assignments exist. Both read declared sets
    // now.
    expect(rulesOf("let r;\nr ??= sdk.requests;\nr.send(req);")).toContain(
      "outbound-send",
    );
  });

  it("through receiverAliases' LOGICAL-ASSIGNMENT branch: the `||=` spelling of the same binding — CR-12 shape 2 of 9", () => {
    expect(rulesOf("let r;\nr ||= sdk.requests;\nr.send(req);")).toContain(
      "outbound-send",
    );
  });

  it("through receiverAliases' LOGICAL-ASSIGNMENT branch: the `&&=` spelling, WHICH ONLY ASSIGNS WHEN THE NAME IS ALREADY TRUTHY — CR-12 shape 3 of 9", () => {
    // THE COST OF THE OVER-APPROXIMATION, PINNED RATHER THAN LEFT IMPLICIT.
    // `r &&= sdk.requests` assigns only when `r` is already truthy, so at the use
    // site `r` MAY hold something else entirely. Reading it as the receiver is
    // the same either-side over-approximation `RECEIVER_OPERATORS` chose for `&&`
    // by measurement, and it is the direction every alias set in this file errs
    // in. It gets its own case so a later narrowing has to delete an assertion
    // rather than quietly stop firing.
    expect(rulesOf("let r;\nr &&= sdk.requests;\nr.send(req);")).toContain(
      "outbound-send",
    );
  });

  it("through globalThisAliases' LOGICAL-ASSIGNMENT branch: `let g; g ||= globalThis; g.fetch(url)` — CR-12 shape 4 of 9", () => {
    expect(rulesOf("let g;\ng ||= globalThis;\ng.fetch(url);")).toContain(
      "outbound-fetch",
    );
  });

  it("through fetchAliases' LOGICAL-ASSIGNMENT branch: `let f; f ??= fetch; f(url)` — CR-12 shape 5 of 9", () => {
    expect(rulesOf("let f;\nf ??= fetch;\nf(url);")).toContain(
      "outbound-fetch",
    );
  });

  it("through globalAliases' LOGICAL-ASSIGNMENT branch: `let e; e ||= eval; e(src)` — CR-12 shape 6 of 9", () => {
    expect(rulesOf("let e;\ne ||= eval;\ne(src);")).toContain(
      "outbound-dynamic-code",
    );
  });

  it("through navigatorAliases' LOGICAL-ASSIGNMENT branch: `let n; n ??= navigator; n.sendBeacon(url, data)` — CR-12 shape 7 of 9", () => {
    expect(
      rulesOf("let n;\nn ??= navigator;\nn.sendBeacon(url, data);"),
    ).toContain("outbound-beacon");
  });

  it('through constStrings\' LOGICAL-ASSIGNMENT branch: a KEY bound by `??=` — `let k; k ??= "requests"; sdk[k].send(req)` — CR-12 shape 8 of 9', () => {
    // The STRING half of the same branch. It reaches `bindString` through the
    // widened test, so the literal lands in `constStrings` and `keyReceiver`
    // reads it exactly as it reads a plain assignment's.
    expect(rulesOf('let k;\nk ??= "requests";\nsdk[k].send(req);')).toContain(
      "outbound-send",
    );
  });

  it('through assembledNames\' LOGICAL-ASSIGNMENT branch: an ASSEMBLED key bound by `??=` — `let k; k ??= "req" + "uests"; sdk[k].send(req)` — CR-12 shape 9 of 9', () => {
    // DISTINCT FROM THE `+=` BRANCH, and that distinction is why both are named
    // in the clause and both carry their own probe: `+=` has its own opening and
    // its own numeric guard, this reaches `isAssembledKey` through the widened
    // alias branch. `outbound-unanalysable`, because a key the walk watched being
    // built is a key it saw being hidden.
    expect(
      rulesOf('let k;\nk ??= "req" + "uests";\nsdk[k].send(req);'),
    ).toContain("outbound-unanalysable");
  });

  // -------------------------------------------------------------------------
  // THE FOUR `=` / `+=` CONTROLS, PINNED IN THE SAME COMMIT AS THE WIDENING.
  //
  // They fired BEFORE this plan and they are the evidence that made CR-12 a
  // FINDING rather than a measurement artefact: nine shapes silent while their
  // two-character-different twins reported. A later narrowing that silently took
  // one of them would erase that evidence and leave a reader unable to tell a
  // miss from a harness that never worked. Each is titled for the collector it
  // exercises, per the same convention as the nine above.
  // -------------------------------------------------------------------------

  it("through receiverAliases' PLAIN-ASSIGNMENT branch: CONTROL 1 of 4 — `let r; r = sdk.requests; r.send(req)` reported before CR-12 and still does", () => {
    expect(rulesOf("let r;\nr = sdk.requests;\nr.send(req);")).toContain(
      "outbound-send",
    );
  });

  it("through globalThisAliases' PLAIN-ASSIGNMENT branch: CONTROL 2 of 4 — `let g; g = globalThis; g.fetch(url)`", () => {
    expect(rulesOf("let g;\ng = globalThis;\ng.fetch(url);")).toContain(
      "outbound-fetch",
    );
  });

  it('through constStrings\' PLAIN-ASSIGNMENT branch: CONTROL 3 of 4 — `let k; k = "requests"; sdk[k].send(req)`', () => {
    expect(rulesOf('let k;\nk = "requests";\nsdk[k].send(req);')).toContain(
      "outbound-send",
    );
  });

  it('through assembledNames\' `+=` branch: CONTROL 4 of 4 — `let k = "req"; k += "uests"; sdk[k].send(req)`, the branch wave 29 probed and this plan must not disturb', () => {
    expect(
      rulesOf('let k = "req";\nk += "uests";\nsdk[k].send(req);'),
    ).toContain("outbound-unanalysable");
  });

  it("through NOTHING: the receiver chain's negation — ONE INVERTED LINK silences four hops, wherever the read sits — A MEASURED SILENCE", () => {
    // The silent direction for `receiverAliases`, and it is the BINDINGS that
    // silence it: `r2` is grown from `r1` before `r1` is in the set. Asserted
    // with the read both last and first, so this case cannot be mistaken for a
    // statement about read position. A MEASURED SILENCE in plan 01-18's
    // convention — it may never be cited as evidence that a rule holds.
    expect(
      rulesOf("const r2 = r1;\nconst r1 = sdk.requests;\nr2.send(req);"),
    ).toEqual([]);
    expect(
      rulesOf("r2.send(req);\nconst r2 = r1;\nconst r1 = sdk.requests;"),
    ).toEqual([]);
  });
});

describe("any non-allowlisted member of a positively identified receiver", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it.each([
    ["sendRaw", "await sdk.requests.sendRaw(req);"],
    ["replay", "await sdk.requests.replay(req);"],
    [".call", "await sdk.requests.send.call(sdk.requests, req);"],
    [".apply", "await sdk.requests.send.apply(sdk.requests, [req]);"],
    [
      "Reflect.apply",
      "await Reflect.apply(sdk.requests.send, sdk.requests, [req]);",
    ],
    ["an aliased member", "const s = sdk.requests.send;\nawait s(req);"],
    [
      "a member returned from an arrow",
      "const g = () => sdk.requests.send;\nawait g()(req);",
    ],
    ["a computed member", 'const m = "send";\nawait sdk.requests[m](req);'],
  ])("outbound-send fires on %s", (_shape, src) => {
    expect(rulesOf(src)).toContain("outbound-send");
  });
});

describe("a module specifier the walk can resolve, and one it cannot", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it("outbound-import fires on a specifier resolved one hop", () => {
    expect(
      rulesOf('const spec = "caido:http";\nconst m = await import(spec);'),
    ).toContain("outbound-import");
  });

  it('through literalOf\'s SINGLE-VALUED contract: a SPECIFIER rebound mid-file no longer resolves to the stale first literal — `let s = "harmless"; s = "caido:http"; await import(s)` — A WIDENING THIS PLAN MEASURED RATHER THAN PREDICTED', () => {
    // The third caller of the string map, and the one whose change is a NEW
    // REPORT rather than a redirected one. BEFORE this plan the walk resolved
    // `s` to the stale "harmless", compared it against `caido:http`, found no
    // match and said NOTHING — a dynamic import of the forbidden specifier,
    // silent, because the specifier was rebound after its declaration.
    //
    // AFTER: `literalOf` answers `undefined` for a name with two bindings, and an
    // unreducible specifier is REPORTED. It is `outbound-unanalysable` rather
    // than `outbound-import` for the same reason the global-key case above is:
    // the walk will not pick one of two strings it read.
    //
    // NOT ENUMERATED BY CR-10 AND NOT PREDICTED BY THIS PLAN. It was found by
    // probing every caller of the map, which is why task 1 required the call
    // sites be listed before the map was touched.
    expect(
      rulesOf('let s = "harmless";\ns = "caido:http";\nawait import(s);'),
    ).toContain("outbound-unanalysable");
  });

  it("outbound-unanalysable fires on an ASSEMBLED specifier", () => {
    expect(rulesOf('const m = await import("caido:" + "http");')).toContain(
      "outbound-unanalysable",
    );
  });

  it('through literalOf\'s SINGLE-VALUED contract: a MEMBER name rebound mid-file becomes UNREADABLE rather than resolving to the stale first literal — `let m = "harmless"; m = "send"; sdk.requests[m](req)`', () => {
    // THE OTHER CALLERS OF THE STRING MAP, ASSERTED RATHER THAN ASSUMED SAFE.
    // `memberName` resolves through the same map, so widening the map changes it
    // too — and this plan measured the change rather than reasoning about it.
    //
    // BEFORE this plan: `outbound-send`. `m` resolved to the stale "harmless",
    // which is not on the read-only allowlist, so the member rule fired — the
    // RIGHT answer for the WRONG reason, off a string the file had already
    // overwritten.
    // AFTER: `outbound-unanalysable`. `literalOf` is the SINGLE-valued reader and
    // answers `undefined` when a name carries more than one binding; an
    // unreadable member of an identified receiver is reported as unreadable.
    // BOTH REPORT. The direction changed and the disclosure changed with it.
    const rules = rulesOf(
      'let m = "harmless";\nm = "send";\nawait sdk.requests[m](req);',
    );
    expect(rules).toContain("outbound-unanalysable");
  });

  it("outbound-unanalysable fires on a computed member of an identified receiver", () => {
    expect(
      rulesOf(
        "export function go(sdk, key, req) {\n  return sdk.requests[key](req);\n}",
      ),
    ).toContain("outbound-unanalysable");
  });
});

// ---------------------------------------------------------------------------
// WR-19 — THE UNREADABLE RECEIVER, one level up from the unreadable member
// ---------------------------------------------------------------------------
// Every shape below returned an EMPTY violation list before 2026-08-22, while
// `sdk.requests[key](req)` and `import("caido:" + "http")` — the identical class
// of unreadable expression, one level down — correctly reported
// `outbound-unanalysable`. That asymmetry is what boundary 2 says this gate's
// rewrite removed, so it was the gate's own stated rule that was not being
// applied to itself.
describe("a receiver the walk cannot read is REPORTED, not dropped", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it("through isAssembledKey: an INLINE assembled receiver key is unreadable", () => {
    expect(
      rulesOf('await sdk["req" + "uests"].send(req);'),
      'sdk["req" + "uests"].send(req) still reports clean',
    ).toContain("outbound-unanalysable");
  });

  it("through unreadableAliases: an unreadable RECEIVER EXPRESSION bound to a name reports where the name is USED", () => {
    // The binding is remembered and the report lands where the name is USED as a
    // receiver, which is what keeps an ordinary dictionary read that is never a
    // receiver out of the violation list.
    expect(
      rulesOf('const r = sdk["re" + "quests"];\nawait r.send(req);'),
    ).toContain("outbound-unanalysable");
  });

  it('through assembledNames: an assembled KEY survives no const — `const k = "req" + "uests"; sdk[k].send(req)`', () => {
    // CR-08. THE MECHANISM IS `assembledNames`, NOT `constStrings`: the key never
    // reduces to a literal, so `literalOf` returns undefined and the resolution
    // comes entirely from the name having been WATCHED being assembled one hop
    // back. Reverting the `assembledNames` consultation in `receiverKind` drives
    // this red; reverting `constStrings` does not touch it.
    //
    // Before 2026-08-24 this reported `[]` while the MEMBER-level twin
    // (`const m = "se" + "nd"; sdk.requests[m](req)`) and the GLOBAL-level twin
    // (`const k = "fet" + "ch"; globalThis[k](url)`) both reported — the WR-19
    // asymmetry standing one level up. Both twins are asserted below so the three
    // paths can never drift apart again silently.
    expect(
      rulesOf('const k = "req" + "uests";\nawait sdk[k].send(req);'),
      'const k = "req" + "uests"; sdk[k].send(req) still reports clean',
    ).toContain("outbound-unanalysable");
    // The ASSIGNMENT spelling, proving the collector grew from both shapes rather
    // than from declarations only — the defect the round-1 walk shipped.
    expect(
      rulesOf('let k;\nk = "req" + "uests";\nawait sdk[k].send(req);'),
      'let k; k = "req" + "uests"; sdk[k].send(req) still reports clean',
    ).toContain("outbound-unanalysable");
    // The two twins, asserted HERE beside the shape they were asymmetric with.
    expect(
      rulesOf('const m = "se" + "nd";\nawait sdk.requests[m](req);'),
    ).toContain("outbound-unanalysable");
    expect(
      rulesOf('const k = "fet" + "ch";\nawait globalThis[k](url);'),
    ).toContain("outbound-unanalysable");
  });

  it.each<[label: string, binding: string]>([
    ["a `+` concatenation", 'const k = "req" + "uests";'],
    ["the ASSIGNMENT spelling", 'let k;\nk = "req" + "uests";'],
    ["a TEMPLATE interpolation", 'let k = `req${"uests"}`;'],
    ["an ARRAY join", 'const k = ["req", "uests"].join("");'],
    ["an opaque CALL result", "const k = g();"],
  ])(
    "through assembledNames: every spelling of a bound assembly is unreadable — %s",
    (_label, binding) => {
      // The five shapes 01-VERIFICATION.md's CR-08 probe executed, every one of
      // which returned `[]` before 2026-08-24. MECHANISM IS `assembledNames` for
      // all five: none of these keys reduces to a literal, so `constStrings` and
      // `literalOf` cannot resolve any of them and reverting them changes nothing
      // here. Reverting the `assembledNames` consultation drives all five red.
      expect(
        rulesOf(`${binding}\nawait sdk[k].send(req);`),
        `${binding} sdk[k].send(req) still reports clean`,
      ).toContain("outbound-unanalysable");
    },
  );

  it("through the global-member path: an assembled MEMBER of an identified global receiver is unreadable", () => {
    // The sharper of the two shapes: the receiver is POSITIVELY identified —
    // `isGlobalReceiver` says so — and it is the member name that will not
    // reduce, so every global branch simply never ran.
    expect(
      rulesOf('await globalThis["fet" + "ch"](url);'),
      'globalThis["fet" + "ch"](url) still reports clean',
    ).toContain("outbound-unanalysable");
    expect(
      rulesOf('export {};\nawait (globalThis as any)["fet" + "ch"](url);'),
    ).toContain("outbound-unanalysable");
  });

  it("through isAssembledKey plus the destructure collector: a DESTRUCTURE off an assembled key is unreadable", () => {
    expect(
      rulesOf('const { send } = sdk["req" + "uests"];\nawait send(req);'),
    ).toContain("outbound-unanalysable");
  });

  it("through nothing: the TWO-HOP shape is still the DISCLOSED residual, and this asserts what it ACTUALLY reports", () => {
    // Measured on 2026-08-22, not assumed: a bare identifier key the walk never
    // watched being bound to an assembly is not evidence of concealment, it is
    // the one-more-hop indirection boundary 2 states as the residual — so this
    // reports NOTHING, and that fact is written down here rather than left for
    // the next reader to discover with a probe.
    //
    // NO MECHANISM RESOLVES THIS, WHICH IS THE POINT. `constStrings` stops at one
    // hop, `assembledNames` stops at one hop, and neither `b` nor `a` is a
    // conditional or a comma. Reverting ANY branch in this file leaves it green,
    // so unlike every other case here it is asserted as a MEASURED SILENCE rather
    // than as a bound — and it must never again be used to stand in for one.
    expect(
      rulesOf('const a = "requests";\nconst b = a;\nawait sdk[b].send(req);'),
    ).toEqual([]);
    // WHAT USED TO SIT HERE, AND WHY IT DOES NOT ANY MORE (CR-08). A
    // `constStrings` assertion — `const r = "requests"; sdk[r].send(req)` — stood
    // at this spot under the sentence "The ONE-hop version of the same shape is
    // caught, which is what makes the residual a bound rather than a hole". That
    // sentence was FALSE and the placement was worse than the sentence: the case
    // resolves through `constStrings`, so it was green whether or not the
    // assembled-key rule could see a hop at all — a green-because-it-cannot-fail
    // assertion wearing the costume of a bound, read by the next reader as proof
    // that the bound held. It has moved to its own mechanism-named case below,
    // and the case that ACTUALLY exercises one hop of assembly is the
    // `assembledNames` case above.
  });

  it("through constStrings: a key bound ONE HOP to a LITERAL is a NAMED receiver, not an unreadable one", () => {
    // The positive control, restored to its own title with its real mechanism
    // named. `literalOf` consults `constStrings`, resolves `r` to "requests", and
    // `keyReceiver` returns the NAMED receiver before either unreadable branch is
    // reached — which is what keeps a readable site from being downgraded to
    // `outbound-unanalysable` by the CR-08 widening.
    //
    // This case bounds `constStrings` AND NOTHING ELSE. It does not bound the
    // assembled-key rule, it does not bound `assembledNames`, and it must never
    // again be cited as doing so.
    const rules = rulesOf('const r = "requests";\nawait sdk[r].send(req);');
    expect(rules).toContain("outbound-send");
    expect(
      rules,
      "a site the walk can read COMPLETELY was downgraded to unreadable",
    ).not.toContain("outbound-unanalysable");
  });

  it('through constStrings: A USE ABOVE ITS OWN BINDING REPORTS — `sdk[r].send(req);` written before `const r = "requests";` — CR-09 shape 3 of 7', () => {
    // CR-09, shape 3. Reported when four artifacts said it was silent.
    //
    // WHY KEYS AND ALIASES DIFFER, IN ONE PLACE, BESIDE THE KEY CASES — because
    // a reader who finds aliases chaining to four hops and keys stopping dead at
    // one should not have to guess whether one of the two is a bug. Both facts
    // are properties of the same single collect pass and neither is about where
    // a name is READ:
    //   KEYS DO NOT CHAIN because `constStrings` and `assembledNames` read the
    //   INITIALIZER'S SHAPE — is this a string literal, is this an assembly —
    //   and never consult the live set. A key therefore cannot be grown from a
    //   name already in a set, so `const a = "requests"; const b = a; sdk[b]`
    //   is silent at two hops and always will be.
    //   ALIASES DO CHAIN because every alias set is grown BY CONSULTING THE
    //   LIVE SET (`isFetchExpression`, `isNavigatorReceiver`, `aliasedGlobalOf`,
    //   `isGlobalReceiver`, `initializerReceiver`), so each new binding can
    //   resolve from the previous one, link after link.
    // And because `collect(sf)` runs to COMPLETION before `visit(sf)` begins,
    // NEITHER of them is bounded by the position of a use. That is what this
    // case asserts and it is the half CR-09 falsified.
    expect(rulesOf('sdk[r].send(req);\nconst r = "requests";')).toContain(
      "outbound-send",
    );
  });

  it('through assembledNames: A USE ABOVE ITS OWN BINDING REPORTS — `sdk[k].send(req);` written before `const k = "req" + "uests";` — CR-09 shape 4 of 7', () => {
    // CR-09, shape 4, and it lands on the set whose own docblock carried the
    // READ-POSITION BOUND until this round. `outbound-unanalysable` rather than
    // `outbound-send` because an assembled key is a key the walk WATCHED being
    // hidden — see the assembled-key cases above. The position of the use is
    // irrelevant here for the same reason it is irrelevant everywhere else.
    expect(rulesOf('sdk[k].send(req);\nconst k = "req" + "uests";')).toContain(
      "outbound-unanalysable",
    );
  });

  it('through constStrings\' WHOLE-FILE BINDINGS: a name REBOUND to a receiver name IS one — `let k = "harmless"; k = "requests"; sdk[k].send(req)` — CR-10 shape 1 of 5', () => {
    // CR-10, shape 1, and the mechanism named in the title is the whole fix.
    // `constStrings` used to be a `Map<string, string>` written ONLY at the
    // declaration branch, so `k` resolved to "harmless" FOREVER and the two
    // unreadable branches beneath `keyReceiver`'s literal lookup were
    // unreachable for that name. Both strings are string literals sitting in the
    // AST twelve tokens apart: this was never a value the walk could not FOLLOW,
    // it was a value the walk READ and discarded in favour of an older one.
    //
    // The map now holds EVERY literal a name is bound to at ANY OF ITS COLLECTING
    // BRANCHES and `keyReceiver` reports if ANY of them names a receiver — which is exactly
    // the property boundary 2 already claimed for file-wide bindings and did not
    // have. `outbound-send` and NOT `outbound-unanalysable`: the walk can read
    // this site completely.
    const rules = rulesOf(
      'let k = "harmless";\nk = "requests";\nawait sdk[k].send(req);',
    );
    expect(rules).toContain("outbound-send");
    expect(
      rules,
      "a site the walk can read COMPLETELY was downgraded to unreadable",
    ).not.toContain("outbound-unanalysable");
  });

  it("through constStrings' WHOLE-FILE BINDINGS: the `var` spelling of the same rebinding — CR-10 shape 2 of 5", () => {
    // Same mechanism, different declaration keyword. It is asserted separately
    // because `var` is the spelling a minified or transpiled bundle produces and
    // a reader must not have to infer it from the `let` case.
    expect(
      rulesOf('var k = "harmless";\nk = "requests";\nawait sdk[k].send(req);'),
    ).toContain("outbound-send");
  });

  it('through constStrings\' WHOLE-FILE BINDINGS, ANY-BINDING-WINS — THE MIRROR, and it errs by OVER-approximating: `let k = "requests"; k = "harmless"; sdk[k].send(req)` REPORTS', () => {
    // THE MIRROR OF THE WIDENING, ASSERTED RATHER THAN LEFT FOR NEXT ROUND.
    // Any mechanism that makes a later binding visible has to answer what
    // happens when the LAST binding is the harmless one. Two were honest and
    // both were MEASURED (01-24-SUMMARY section 2):
    //   ANY-BINDING-WINS (implemented) reports here — an OVER-approximation,
    //     acceptable only because the real tree was re-run and is still ZERO,
    //     and because it is the direction boundary 2 already claims.
    //   A POISONED MAP (rejected) would silence this — but it ALSO silenced
    //     shapes 1 and 2 above, which are the shapes CR-10 is about, and it
    //     would have created a NEW under-approximation here.
    // So this case errs toward REPORTING. It is not a residual; it is the
    // disclosed cost of the chosen mechanism.
    expect(
      rulesOf('let k = "requests";\nk = "harmless";\nawait sdk[k].send(req);'),
    ).toContain("outbound-send");
  });

  it("through constStrings' ASSIGNMENT-SIDE WRITE: the control that proves the misses were real — `let k; k = \"requests\"; sdk[k].send(req)` — AND THE PLAN'S OWN PREDICTION FOR IT WAS WRONG", () => {
    // RECORDED RATHER THAN SMOOTHED OVER. Both 01-REVIEW.md's CR-10 entry and
    // 01-24-PLAN.md list this as a CONTROL that already reported, offered as
    // proof that the shapes above were genuine misses rather than a fixture
    // artefact. MEASURED BEFORE ANY CHANGE IN THIS PLAN, it reported `[]`.
    //
    // The reason is one line stronger than CR-10 said: the assignment branch
    // never wrote `constStrings` AT ALL, so it was not that a stale literal beat
    // a later one — a name bound to a string ONLY by assignment resolved to
    // nothing whatever. The stale-literal path is real and shapes 1 and 2 pin
    // it; this control is a SECOND defect the same branch carried, and it is
    // closed by the same assignment-side write.
    expect(
      rulesOf('let k;\nk = "requests";\nawait sdk[k].send(req);'),
    ).toContain("outbound-send");
  });

  it('through assembledNames, unchanged by CR-10: the two assembly controls still report — `let k; k = "req" + "uests"` and `let k = 1; k = "req" + "uests"`', () => {
    // The controls that DID report before this plan and must still. They resolve
    // through `assembledNames`, whose assignment-side write already existed, so a
    // regression here would mean the new string write had shadowed the assembly
    // branch — the exact failure mode this plan is closing, running backwards.
    expect(
      rulesOf('let k;\nk = "req" + "uests";\nawait sdk[k].send(req);'),
    ).toContain("outbound-unanalysable");
    expect(
      rulesOf('let k = 1;\nk = "req" + "uests";\nawait sdk[k].send(req);'),
    ).toContain("outbound-unanalysable");
  });

  it('through assembledNames\' COMPOUND-ASSIGNMENT branch: a `+=` that builds a string is an ASSEMBLY — `let k = "req"; k += "uests"; sdk[k].send(req)` — CR-10 shape 4 of 5', () => {
    // CR-10, shape 4, and the sharpest of the five because the lesson was
    // already on record ONE DIRECTORY AWAY. `store/error-redaction.spec.ts`
    // matched `PlusToken` only until WR-17 widened it to `PlusEqualsToken`, on
    // the argument that `+=` is one token from a form already covered and
    // produces the same value. This file's own header meanwhile claimed assembly
    // was read "in every spelling" and through "either a declaration or an
    // assignment" — and `+=` was neither read nor excluded, just absent.
    //
    // MECHANISM IS `assembledNames`, NOT `constStrings`: `k` carries the literal
    // "req" from its declaration, and the ASSEMBLY WINS over it by the precedence
    // rule asserted below. `outbound-unanalysable`, because a key the walk
    // watched being built is a key it saw being hidden.
    expect(
      rulesOf('let k = "req";\nk += "uests";\nawait sdk[k].send(req);'),
    ).toContain("outbound-unanalysable");
  });

  it('through assembledNames\' ASSIGNMENT branch, reachable at last: `let k = "harmless"; k = "req" + "uests"; sdk[k].send(req)` — CR-10 shape 5 of 5', () => {
    // CR-10, shape 5. THE BRANCH THAT RESOLVES THIS ALREADY EXISTED — the
    // assignment-side `assembledNames.add` has been there since CR-08, with a
    // comment claiming it was "covered by construction". It was UNREACHABLE for
    // any name whose declaration carried a string initializer, because
    // `keyReceiver` consulted the stale literal FIRST and returned.
    //
    // MEASURED ATTRIBUTION, RECORDED RATHER THAN IMPLIED: this shape flipped from
    // `[]` to `outbound-unanalysable` at TASK 1, when the literal lookup stopped
    // early-returning — not at the compound-assignment branch it sits beside.
    // Its mutation proof is task 1's MA2, not task 2's MB1. Stating that is the
    // difference between a fixture and a fixture that proves something.
    expect(
      rulesOf(
        'let k = "harmless";\nk = "req" + "uests";\nawait sdk[k].send(req);',
      ),
    ).toContain("outbound-unanalysable");
  });

  it('through assembledNames\' BINDING-PATTERN branches: the two DESTRUCTURE spellings of a declared assembly report — `const { k } = { k: "req" + "uests" }` and `const [k] = ["req" + "uests"]` — IN-26', () => {
    // IN-26, and it is the last spelling of the sentence at the top of this file
    // that says an assembly is read "through EITHER a declaration or an
    // assignment". Both of these ARE declarations. Neither was read: the
    // collector's assembled-name write ran only under `ts.isIdentifier(node.name)`
    // while the RECEIVER branch sitting directly beside it already read an object
    // binding pattern. That asymmetry is the whole finding.
    //
    // MEASURED BEFORE THE FIX, both `[]`; measured after, both
    // `outbound-unanalysable`. Same rule as the one-identifier twin
    // (`const k = "req" + "uests"`), because a key the walk watched being built
    // is a key it saw being hidden, and how the binding is spelled changes
    // nothing about that.
    expect(
      rulesOf('const { k } = { k: "req" + "uests" };\nawait sdk[k].send(req);'),
    ).toContain("outbound-unanalysable");
    expect(
      rulesOf('const [k] = ["req" + "uests"];\nawait sdk[k].send(req);'),
    ).toContain("outbound-unanalysable");
    // The RENAMED key and a NON-ZERO array slot, so the branches are shown
    // resolving by property name and by position rather than by accident of
    // both being the first thing in the literal.
    expect(
      rulesOf(
        'const { p: k } = { p: "req" + "uests" };\nawait sdk[k].send(req);',
      ),
    ).toContain("outbound-unanalysable");
    expect(
      rulesOf(
        'const [x, k] = ["a", "req" + "uests"];\nawait sdk[k].send(req);',
      ),
    ).toContain("outbound-unanalysable");
  });

  it("through assembledNames' BINDING-PATTERN branches: the MUST-STAY-QUIET twins — an ordinary destructure used as an ordinary lookup, a numeric slot, a rest element, and a destructure of something the walk cannot read — IN-26", () => {
    // THE TWIN, IN THE SAME COMMIT AS THE WIDENING, because destructuring is
    // ordinary in this codebase and a gate that calls every destructured name an
    // assembled receiver key gets deleted rather than fixed.
    //
    // MEASURED NON-EVIDENCE, RECORDED SO NOBODY CITES THIS CASE FOR THE BRANCH.
    // Deleting both binding-pattern reads from the collector (mutation MB1,
    // 2026-08-24) drives the POSITIVE case above RED and leaves this entire case
    // GREEN. That is correct and expected — every assertion here is a silence,
    // and removing a branch cannot break a silence — but it means this case
    // proves the branch does not OVER-report and proves nothing whatever about
    // whether it reports at all. The rule that caught it is plan 01-18's: a
    // fixture that stays green under the mutation it sits beside is titled as
    // non-evidence rather than left looking like coverage.
    //
    // Ordinary strings are not assemblies, so nothing is collected and the
    // lookup stays quiet even in receiver position.
    expect(
      rulesOf('const { a, b } = { a: "x", b: "y" };\nsdk[a][b](req);'),
    ).toEqual([]);
    expect(rulesOf('const [a, b] = ["x", "y"];\no[a][b];')).toEqual([]);
    // `isProvablyNumeric` guards these branches exactly as it guards the
    // identifier and compound-assignment ones: an index is not a hidden name.
    expect(rulesOf("const [k] = [1 + 1];\nsegments[k];")).toEqual([]);
    // A rest element consumes the tail rather than one slot, so positional
    // matching stops meaning anything and the branch deliberately reads nothing.
    expect(
      rulesOf('const [...k] = ["req" + "uests"];\nawait sdk[k].send(req);'),
    ).toEqual([]);
    // A MEASURED SILENCE, and it is residual (a)'s function/value-boundary half
    // unchanged: destructuring something the walk cannot read reads nothing. It
    // is NOT evidence that any rule holds.
    expect(
      rulesOf("const { k } = someObject;\nawait sdk[k].send(req);"),
    ).toEqual([]);
    // A MEASURED SILENCE AND A NEWLY NAMED OPEN SHAPE, recorded here rather than
    // left for the next reviewer to find. A destructured PLAIN LITERAL —
    // `const { k } = { k: "requests" }` — is `constStrings`' territory, not this
    // branch's, and `constStrings` reads only the identifier spelling too. IN-26
    // named the ASSEMBLY spellings and those are what this wave closed; this
    // sibling is disclosed, not silently folded in, because widening
    // `constStrings` through binding patterns is a separate decision that needs
    // its own real-tree measurement.
    expect(
      rulesOf('const { k } = { k: "requests" };\nawait sdk[k].send(req);'),
    ).toEqual([]);
  });

  it("through isProvablyNumeric's guard on the COMPOUND-ASSIGNMENT branch: an INTEGER accumulator built with `+=` is an INDEX and stays quiet", () => {
    // THE MUST-STAY-QUIET TWIN of the case two above, and the reason the new
    // branch carries the same numeric test the poisoning arm beside it already
    // used. `i += 1` is the single most common statement in this codebase — 34
    // `+=` sites over both roots — and a gate that calls an integer accumulator
    // an assembled receiver name gets deleted rather than fixed.
    expect(
      rulesOf("let i = 0;\ni += 1;\nconst v = MIGRATIONS[i];\nuse(v);"),
    ).toEqual([]);
    expect(rulesOf("let i = 0;\ni += 1;\nconst v = sdk[i];\nuse(v);")).toEqual(
      [],
    );
  });

  it('through assembledNames OVER constStrings — THE PRECEDENCE, settled: a WATCHED ASSEMBLY beats a LITERAL BINDING of the same name — `let k = "requests"; k = a + b; sdk[k].send(req)` is UNANALYSABLE, not send', () => {
    // THE QUESTION TASK 1 CREATED AND THIS CASE ANSWERS. Before CR-10 a name
    // could not be both: `constStrings` held one literal, was read first, and
    // returned. Now a name can carry a literal binding AND a watched assembly,
    // and `keyReceiver` has to choose.
    //
    // THE ASSEMBLY WINS, and the reasoning is in the ordering docblock beside
    // the four steps: a name the walk WATCHED being reassembled is a name whose
    // literal answer stopped being trustworthy, so an assembly it SAW is stronger
    // evidence than a literal it saw earlier. BOTH DIRECTIONS REPORT — the
    // choice is between naming a surface off a string the file has since rebuilt
    // (`outbound-send`) and admitting the walk can no longer read the site
    // (`outbound-unanalysable`). The second is the true one.
    //
    // STEP 1's CASE IS NOT TOUCHED BY THIS and the assertion below says so:
    // `const r = "requests"` is never in `assembledNames`, so it still reports
    // `outbound-send` and is still never downgraded.
    const rules = rulesOf(
      'let k = "requests";\nk = a + b;\nawait sdk[k].send(req);',
    );
    expect(rules).toContain("outbound-unanalysable");
    expect(rules).not.toContain("outbound-send");
    const stepOne = rulesOf('const r = "requests";\nawait sdk[r].send(req);');
    expect(
      stepOne,
      "the precedence rule downgraded the single-hop literal case it was required to preserve",
    ).toContain("outbound-send");
    expect(stepOne).not.toContain("outbound-unanalysable");
  });

  it("through literalOf's SINGLE-VALUED contract: THE ALLOWLIST STILL HOLDS — a name bound TWICE TO THE SAME STRING resolves, so `sdk.requests.get` stays quiet", () => {
    // THE MUST-STAY-QUIET TWIN of the single-valued reader, and the one that
    // decides whether this change is safe or a gate-deleting over-report. Two
    // bindings of the SAME string are ONE entry in the set, so the name resolves
    // and the read-only allowlist answers normally. `sdk.requests.get` is the
    // reload the consumer depends on; a widening that reported it would be
    // reverted rather than argued about.
    expect(
      rulesOf('let m = "get";\nm = "get";\nawait sdk.requests[m](id);'),
    ).toEqual([]);
    // Two DIFFERENT allowlisted members is the honest opposite: the walk read
    // two strings and will not pick one, so it says so rather than guessing.
    expect(
      rulesOf('let m = "get";\nm = "getRaw";\nawait sdk.requests[m](id);'),
    ).toContain("outbound-unanalysable");
  });

  it("through ANY-BINDING-WINS and literalOf together: THE WIDENING CREATED NO NEW SILENCE — every mirror position REPORTS, measured in all four", () => {
    // THE CHECK TASK 3 REQUIRED BE STATED RATHER THAN OMITTED. A widening that
    // closes three shapes and opens a fourth without saying so is the pattern
    // this round was convened over, so every position where a name can now
    // resolve differently was probed for a NEW silence. THERE IS NONE: the rule
    // NAME changes — a named surface becomes `outbound-unanalysable` where the
    // walk read two strings — but nothing went quiet.
    //  receiver-key position
    expect(
      rulesOf('let k = "requests";\nk = "harmless";\nawait sdk[k].send(req);'),
    ).not.toEqual([]);
    //  member position
    expect(
      rulesOf('let m = "send";\nm = "harmless";\nawait sdk.requests[m](req);'),
    ).not.toEqual([]);
    //  module-specifier position
    expect(
      rulesOf('let s = "caido:http";\ns = "harmless";\nawait import(s);'),
    ).not.toEqual([]);
    //  global-key position, and the alias GROWN off one — `const f =
    //  globalThis[k]` no longer joins `fetchAliases` when `k` carries two
    //  bindings, and the unreadable-member rule reports at the binding instead.
    expect(
      rulesOf('let k = "fetch";\nk = "harmless";\nglobalThis[k](url);'),
    ).not.toEqual([]);
    expect(
      rulesOf(
        'let k = "fetch";\nk = "harmless";\nconst f = globalThis[k];\nf(u);',
      ),
    ).toContain("outbound-unanalysable");
  });

  it("through NOTHING: the KEY contrast — TWO HOPS is still silent whichever side of the bindings the use sits on — A MEASURED SILENCE", () => {
    // The contrast that keeps the corrected residual checkable in both
    // directions. Two hops of KEY is silent, and moving the read does not
    // change that either — so the silence cannot be attributed to read
    // position any more than the reports above can. A MEASURED SILENCE.
    expect(
      rulesOf('const a = "requests";\nconst b = a;\nsdk[b].send(req);'),
    ).toEqual([]);
    expect(
      rulesOf('sdk[b].send(req);\nconst a = "requests";\nconst b = a;'),
    ).toEqual([]);
  });

  it('through the CONDITIONAL resolver: `sdk[b ? "requests" : "net"]` hides nothing, so it reports outbound-send', () => {
    // CR-08's sharper half, and it was undisclosed everywhere: reported by no
    // rule and named by no residual list. Both keys are string literals naming
    // outbound receivers, so this is a site the walk can read COMPLETELY.
    //
    // MECHANISM, RESTATED 2026-08-24 (WR-27) BECAUSE THE MECHANISM MOVED: this
    // used to name "the conditional branch of `receiverKind`", a hand-written
    // block inside the element-access arm. That block is gone. The arm now calls
    // `keyReceiver`, which descends through `operatorReceiver` — THE ONE
    // definition, shared with call position and initializer position. Behaviour
    // for this shape is unchanged; reverting the descent drives this red.
    const rules = rulesOf('await sdk[b ? "requests" : "net"].send(req);');
    expect(
      rules,
      'sdk[b ? "requests" : "net"].send(req) still reports clean',
    ).toContain("outbound-send");
    // AND NOT UNANALYSABLE. Reporting a completely readable site as unreadable
    // would be a second overclaim, quieter and in the opposite direction — the
    // gate saying "I could not read this" about something it read perfectly.
    expect(
      rules,
      "a conditional of two receiver literals was reported as UNREADABLE",
    ).not.toContain("outbound-unanalysable");
    // One outbound branch is enough, exactly as `initializerReceiver` has it.
    expect(rulesOf('await sdk[b ? "requests" : "zzz"].send(req);')).toContain(
      "outbound-send",
    );
    // Neither branch a receiver, and neither branch hidden: still nothing.
    expect(rulesOf('await sdk[b ? "aaa" : "zzz"].send(req);')).toEqual([]);
    // A branch the walk WATCHES being assembled is unreadable, not silent — the
    // third state surviving through the conditional.
    expect(
      rulesOf('await sdk[b ? "req" + "uests" : "zzz"].send(req);'),
    ).toContain("outbound-unanalysable");
  });

  it('through operatorLiteralBinding: a receiver key BOUND to a conditional — `const k = b ? "requests" : "net"; sdk[k].send(req)` — reports outbound-send, exactly as its INLINE twin does — CR-13', () => {
    // CR-13, and the verifier put it first. ONE HOP, with the literal
    // `"requests"` written out in full, on both branches of a two-branch
    // operator this gate already resolves at four other positions — and it
    // answered CLEAN. `keyReceiver` descends the operator INLINE at the KEY
    // site; `collect` did not descend one at the BINDING site, so the name
    // landed in NEITHER `constStrings` NOR `assembledNames`.
    //
    // MECHANISM: `operatorLiteralBinding`, the second consumer of
    // `operatorOperands`, wired into `collect`'s declaration branch. Removing
    // the descent drives this red AND drives the row's own branch case red —
    // that is mutation proof 1 in `01-30-SUMMARY.md`.
    const rules = rulesOf(
      'const k = b ? "requests" : "net";\nsdk[k].send(req);',
    );
    expect(
      rules,
      'const k = b ? "requests" : "net"; sdk[k].send(req) is silent again — the BINDING site has stopped descending the operator the KEY site descends',
    ).toContain("outbound-send");
    // AND NOT UNANALYSABLE. Both branches are string literals the walk reads
    // perfectly; answering "I could not read this" would be the second overclaim
    // the round-4 fixtures forbid, in the quieter direction.
    expect(
      rules,
      "a conditional of two readable literals was reported as UNREADABLE at the binding site",
    ).not.toContain("outbound-unanalysable");
    // THE INLINE TWIN, PINNED BESIDE IT IN THE SAME CASE. The asymmetry between
    // these two spellings IS CR-13; a later narrowing that took one and left the
    // other would recreate it exactly.
    expect(rulesOf('sdk[b ? "requests" : "net"].send(req);')).toContain(
      "outbound-send",
    );
  });

  it('through operatorLiteralBinding, THE COUNTER-DIRECTION: a conditional of two HARMLESS literals stays silent — `const k = b ? "harmless" : "other"; sdk[k].send(req)`', () => {
    // PINNED IN THE SAME COMMIT AS THE WIDENING. A widening asserted only where
    // it fires is the one that gets a gate deleted rather than fixed: this case
    // is what makes `operatorLiteralBinding` a resolver rather than a rubber
    // stamp on every conditional-bound key. It is also the row's own
    // counter-probe, so the registry's vacuity rule and this fixture fail
    // together if the descent ever starts reporting unconditionally.
    expect(
      rulesOf('const k = b ? "harmless" : "other";\nsdk[k].send(req);'),
    ).toEqual([]);
  });

  it("through operatorLiteralBinding, THE WHOLE OPERATOR CLASS AT THE BINDING SITE: the `??`, `||` and `&&` initializers answer as the conditional does — CR-13", () => {
    // ONE CLASS, CLOSED TOGETHER. Closing `? :` and leaving `??` open is the
    // asymmetry CR-08 was and the asymmetry WR-27 was; the descent reads
    // `operatorOperands`, which reads `RECEIVER_OPERATORS`, so all four spellings
    // are one fact rather than four. Each was MEASURED before it was asserted.
    expect(rulesOf('const k = b ?? "requests";\nsdk[k].send(req);')).toContain(
      "outbound-send",
    );
    expect(rulesOf('const k = b || "requests";\nsdk[k].send(req);')).toContain(
      "outbound-send",
    );
    expect(rulesOf('const k = b && "requests";\nsdk[k].send(req);')).toContain(
      "outbound-send",
    );
    // NESTED, through the descent's own recursion — the property `keyReceiver`
    // has at the key site, now held at the binding site too.
    expect(
      rulesOf('const k = b ? (c ? "requests" : "x") : "y";\nsdk[k].send(req);'),
    ).toContain("outbound-send");
  });

  it('through operatorLiteralBinding\'s ASSEMBLY ARM: an operand the walk WATCHES BEING ASSEMBLED makes the NAME an assembly — `const k = b ? "req" + "uests" : "net"; sdk[k].send(req)` reports outbound-unanalysable — CR-13', () => {
    // THE THIRD STATE SURVIVING THE BINDING, which is what makes this descent
    // match the MEMBER-name and SPECIFIER twins rather than merely the key twin.
    // `keyReceiver` produces UNREADABLE from exactly two branches — a name in
    // `assembledNames`, and `isAssembledKey` — and the descent's assembly arm is
    // read off those two and no others. See `operatorLiteralBinding`'s docblock
    // for the reading this REPLACED and the three measurements that rejected it.
    expect(
      rulesOf('const k = b ? "req" + "uests" : "net";\nsdk[k].send(req);'),
    ).toContain("outbound-unanalysable");
    // MEASURED, NOT PREDICTED, AND RECORDED BECAUSE IT SURPRISED THIS PLAN: the
    // INLINE twin of that same source reports `outbound-net`, NOT
    // `outbound-unanalysable`. `operatorReceiver` prefers a NAMED operand over an
    // unreadable one — `"net"` is a receiver — while `keyReceiver` gives a
    // WATCHED ASSEMBLY precedence over a literal binding of the same name. Both
    // spellings REPORT; they name different rules. Pinned here so a later wave
    // reading "the twins agree" out of the SUMMARY finds the exact sense in which
    // they do not.
    expect(
      rulesOf('sdk[b ? "req" + "uests" : "net"].send(req);'),
      "the INLINE twin's precedence changed — see 01-30-SUMMARY.md discrepancy 1",
    ).toContain("outbound-net");
  });

  it('through operatorLiteralBinding, THE MIXED OPERAND: `const k = b ? "requests" : someName; sdk[k].send(req)` reports outbound-send off the READABLE branch — CR-13', () => {
    // THE EITHER-SIDE SEMANTICS `RECEIVER_OPERATORS` already chose, one consumer
    // over: a receiver named on one path is named, and an operand the walk merely
    // CANNOT FOLLOW contributes neither a literal nor unreadability. The INLINE
    // twin answers identically, which is the whole point — this is the shape that
    // rejected the review's "ANY operand with no literal" sketch, because that
    // sketch answered `outbound-unanalysable` here while the inline twin said
    // `outbound-send`.
    const rules = rulesOf(
      'const k = b ? "requests" : someName;\nsdk[k].send(req);',
    );
    expect(rules).toContain("outbound-send");
    expect(
      rules,
      "a site the walk read COMPLETELY on one branch was downgraded to unreadable",
    ).not.toContain("outbound-unanalysable");
    expect(rulesOf('sdk[b ? "requests" : someName].send(req);')).toContain(
      "outbound-send",
    );
    // AND THE PAIR WITH NEITHER OPERAND READABLE STAYS SILENT AT BOTH SITES.
    // Reporting here would be a NEW asymmetry between binding and use, in the
    // opposite direction from CR-13's, created by the commit that closes CR-13.
    expect(
      rulesOf("const k = b ? someName : otherName;\nsdk[k].send(req);"),
    ).toEqual([]);
    expect(rulesOf("sdk[b ? someName : otherName].send(req);")).toEqual([]);
    // AND AN ORDINARY NUMERIC CONDITIONAL INDEX IS STILL AN INDEX. The rejected
    // sketch called this an assembled name — the first WR-19 implementation's own
    // rejected behaviour, which fired on `compat.ts`'s documented path walk.
    expect(rulesOf("const i = b ? 0 : 1;\nsdk[i].send(req);")).toEqual([]);
  });

  it('through operatorLiteralBinding at the ASSIGNMENT branch: `let k; k = b ? "requests" : "net"; sdk[k].send(req)` reports — closed in the SAME PLAN as the declaration spelling — CR-13', () => {
    // CR-10's correction, eleven lines above this branch in `collect`, is this
    // file's own record of what closing one spelling and leaving its sibling open
    // costs. Both spellings of the operator initializer are wired in plan 01-30,
    // and this case is the reason task 1's interim note could be deleted.
    expect(
      rulesOf('let k;\nk = b ? "requests" : "net";\nsdk[k].send(req);'),
    ).toContain("outbound-send");
    expect(
      rulesOf('let k;\nk = b ?? "requests";\nsdk[k].send(req);'),
    ).toContain("outbound-send");
    // The assembly arm at the assignment branch too — one descent, both wirings.
    expect(
      rulesOf('let k;\nk = b ? "req" + "uests" : "net";\nsdk[k].send(req);'),
    ).toContain("outbound-unanalysable");
    // And the counter-direction at the assignment branch.
    expect(
      rulesOf('let k;\nk = b ? "harmless" : "other";\nsdk[k].send(req);'),
    ).toEqual([]);
  });

  it("through the FOUR ALREADY-REPORTING TWINS, PINNED AS CONTROLS: the inline key, the member name, the module specifier and the global key all still answer — CR-13's asymmetry, pinned from the other side", () => {
    // THESE FOUR ARE WHY CR-13 IS A FINDING RATHER THAN A PREFERENCE. Every twin
    // of the identical conditional already reported while the SDK receiver key
    // bound through an initializer was silent. They are pinned in the same commit
    // as the widening because a later narrowing that silently took one of them
    // would recreate exactly the asymmetry this plan closes — and each is titled
    // for the mechanism that resolves it so none can later stand in as the bound
    // of a rule it does not exercise.
    //
    // (1) THE INLINE KEY — `operatorReceiver` via `keyReceiver`.
    expect(
      rulesOf('sdk[b ? "requests" : "net"].send(req);'),
      "control 1 of 4: the INLINE key twin, resolved by operatorReceiver via keyReceiver",
    ).toContain("outbound-send");
    // (2) THE MEMBER NAME — `literalOf`, which is SINGLE-VALUED: two bindings
    // answer `undefined`, and `undefined` means COULD NOT READ, which reports.
    expect(
      rulesOf('const m = b ? "send" : "get";\nsdk.requests[m](req);'),
      "control 2 of 4: the MEMBER-name twin, resolved by literalOf reading single-valued",
    ).toContain("outbound-unanalysable");
    // (3) THE MODULE SPECIFIER — the same `literalOf`, one rule over.
    expect(
      rulesOf('const s = b ? "caido:http" : "crypto";\nimport(s);'),
      "control 3 of 4: the SPECIFIER twin, resolved by literalOf reading single-valued",
    ).toContain("outbound-unanalysable");
    // (4) THE GLOBAL KEY — `literalOf` again, at the global-receiver rule.
    expect(
      rulesOf('const k = b ? "fetch" : "x";\nglobalThis[k](url);'),
      "control 4 of 4: the GLOBAL-key twin, resolved by literalOf reading single-valued",
    ).toContain("outbound-unanalysable");
    // MEASURED AND RECORDED: controls 2, 3 and 4 answer `outbound-unanalysable`
    // through `literalOf`'s SIZE test and NOT through the descent this plan adds.
    // The descent now puts BOTH literals into `constStrings` for those names,
    // which is what `literalOf` was already counting — so the widening moved
    // these three from "no bindings, size 0" to "two bindings, size 2" and both
    // answer `undefined`. Same rule, different arithmetic, and it is written down
    // because "unchanged" and "unchanged for the same reason" are not the same
    // claim.
  });

  it("through operatorReceiver in CALL position: `(b ? sdk.requests : sdk.net).send(req)` reports outbound-send — WR-27, the third face of the operator", () => {
    // THE FINDING, AND WHAT MAKES IT ONE. The two OTHER faces of this same
    // operator were both taught in round 4 and both report: the conditional KEY
    // `sdk[b ? "requests" : "net"]` and the conditional INITIALIZER
    // `const r = b ? sdk.requests : sdk.net`. The operator written directly as the
    // CALLEE'S RECEIVER was silent, for the reason the other two were not: the
    // descent was written three times and therefore existed twice, and
    // `receiverKind` — the function the property-access rule asks about a
    // receiver — had no copy. A conditional landed on its final `return undefined`,
    // which every caller reads as NOT A RECEIVER.
    //
    // This site hides NOTHING. `sdk.requests` is written out in full on one branch.
    // Calling it "not a receiver" is the same equivalence boundary 2 exists to
    // remove — "could not read does not mean clean" — with the extra insult that
    // the walk could read it perfectly.
    //
    // MECHANISM: `operatorReceiver`, reached from `receiverKind` after `unwrap`.
    //
    // NO `await` IN THESE FIXTURES, and the reason is in `unwrap`'s docblock:
    // `await (X).send(req)` parses as a CALL to something named `await` with
    // `.send` a member of its RESULT, so an awaited fixture would be green for a
    // parsing reason and prove nothing about any rule here. MEASURED: the awaited
    // spelling of this exact shape reports `[]` both before and after this change.
    const rules = rulesOf("(b ? sdk.requests : sdk.net).send(req);");
    expect(
      rules,
      "(b ? sdk.requests : sdk.net).send(req) still reports clean",
    ).toContain("outbound-send");
    // AND NOT UNANALYSABLE — the same second overclaim the key-position fixture
    // guards against, in the opposite direction from silence.
    expect(
      rules,
      "a conditional of two literal receiver members was reported as UNREADABLE",
    ).not.toContain("outbound-unanalysable");

    // THE THREE-STATE ANSWER, ASSERTED IN ALL THREE DIRECTIONS AND NOT ONLY THE
    // FIRING ONE. A widening asserted only where it fires is the one that gets a
    // gate deleted rather than fixed.
    // (1) NAMED — one outbound branch is enough, whichever side it sits on.
    expect(rulesOf("(b ? sdk.requests : cache).send(req);")).toContain(
      "outbound-send",
    );
    expect(rulesOf("(b ? cache : sdk.requests).send(req);")).toContain(
      "outbound-send",
    );
    // (2) UNREADABLE — the third state survives the operator rather than
    // collapsing into silence.
    expect(rulesOf("(b ? sdk[k1 + k2] : cache).send(req);")).toContain(
      "outbound-unanalysable",
    );
    // (3) NOT A RECEIVER — and this is the state the widening had to get right.
    expect(rulesOf("(b ? cache : client).send(req);")).toEqual([]);
  });

  it("through THE COLLAPSE: initializer position and call position now give the SAME answer, and the `??` precedence initializer position had to ITSELF is gone", () => {
    // MEASURED BEFORE THE COLLAPSE, NOT PREDICTED. `initializerReceiver` was
    // `receiverKind(whenTrue) ?? receiverKind(whenFalse)`, and `??` does not skip
    // `UNREADABLE_RECEIVER` — a symbol is neither `null` nor `undefined`. So an
    // unreadable LEFT branch shadowed a named RIGHT branch in initializer position
    // and in no other position:
    //   const r = b ? sdk[k1 + k2] : sdk.net;  ->  ["outbound-unanalysable"]
    //   const r = b ? sdk.net : sdk[k1 + k2];  ->  ["outbound-net"]
    // Two spellings of one shape, answered differently by operand ORDER, in a
    // function whose docblock promised "either branch resolving to an outbound
    // receiver makes the binding one". NO RESIDUAL LIST NAMED THIS EITHER; it was
    // found by reading the three copies side by side, which is the whole reason
    // this wave collapses them.
    //
    // After the collapse both spellings take the element-access arm's ordering —
    // a NAMED branch beats an UNREADABLE one whichever side it sits on — because
    // there is now one ordering and not two.
    expect(
      rulesOf("const r = b ? sdk[k1 + k2] : sdk.net;\nr.send(req);"),
      "an UNREADABLE left branch is shadowing a NAMED right branch again",
    ).toContain("outbound-net");
    expect(
      rulesOf("const r = b ? sdk.net : sdk[k1 + k2];\nr.send(req);"),
    ).toContain("outbound-net");
    // Both directions REPORTED before and after — this corrects WHICH rule is
    // named, and creates no new silence. Stated because a precedence change that
    // quietly silenced one side would be a much larger change than this is.
    expect(
      rulesOf("const r = b ? sdk[k1 + k2] : sdk.net;\nr.send(req);"),
    ).not.toEqual([]);
    // AND THE ROUND-4 CONTROLS STILL REPORT. A widening that breaks the cases it
    // was built beside has widened nothing.
    expect(rulesOf('sdk[b ? "requests" : "net"].send(req);')).toContain(
      "outbound-send",
    );
    expect(
      rulesOf("const r = b ? sdk.requests : sdk.net;\nr.send(req);"),
    ).toContain("outbound-send");
  });

  it("through RECEIVER_OPERATORS: `(sdk.requests ?? sdk.net).send(req)` and the `||` form report — the same operator class, the same descent", () => {
    // The `? :` fixture above and these two are ONE class and are closed
    // together, because closing two of three is the asymmetry CR-08 was and the
    // asymmetry WR-27 is. MECHANISM: `RECEIVER_OPERATORS` consulted by
    // `operatorOperands`, reached from `receiverKind` — one named set, not three
    // inline kind comparisons.
    expect(rulesOf("(sdk.requests ?? sdk.net).send(req);")).toContain(
      "outbound-send",
    );
    expect(rulesOf("(sdk.requests || sdk.net).send(req);")).toContain(
      "outbound-send",
    );
    // And in the OTHER TWO POSITIONS, through the same set — a binary operator is
    // not a call-position special case.
    expect(
      rulesOf("const r = sdk.requests ?? sdk.net;\nr.send(req);"),
    ).toContain("outbound-send");
    expect(rulesOf('sdk[k ?? "requests"].send(req);')).toContain(
      "outbound-send",
    );
    // The third state survives a binary operator exactly as it survives `? :`.
    expect(rulesOf("(sdk[k1 + k2] ?? cache).send(req);")).toContain(
      "outbound-unanalysable",
    );
  });

  it("through RECEIVER_OPERATORS: `&&` IS IN THE SET, DECIDED BY MEASUREMENT — and this pins BOTH what that buys and what it costs", () => {
    // THE DECISION IS NOT SYMMETRY WITH THE OTHER THREE, and the plan required it
    // not be. `a && b` yields `a` when `a` is FALSY, so its left operand is
    // usually a GUARD rather than a value — the argument that makes `? :`, `??`
    // and `||` obvious does not carry.
    //
    // BOTH READINGS WERE IMPLEMENTED AND RUN. THE REAL TREE DID NOT DISCRIMINATE:
    // 23 files, ZERO violations, under `&&` IN and under `&&` OUT alike. Nothing
    // about shipped code chose this and this fixture does not pretend otherwise.
    // THE SHAPES DISCRIMINATED, and the deciding one is the first assertion here:
    // a guarded outbound call is the ORDINARY way to write one, `sdk.requests` is
    // written out in full, and excluding `&&` calls it "not a receiver" — WR-27's
    // own finding, reproduced one operator over, inside the wave that closes it.
    expect(
      rulesOf("(ok && sdk.requests).send(req);"),
      "the guarded outbound call — the shape that decided `&&`",
    ).toContain("outbound-send");
    expect(rulesOf("(sdk.requests && sdk.net).send(req);")).toContain(
      "outbound-send",
    );
    expect(rulesOf("const r = ok && sdk.requests;\nr.send(req);")).toContain(
      "outbound-send",
    );

    // THE COST, PINNED RATHER THAN LEFT IMPLICIT. Where the RECEIVER is the guard
    // and the VALUE is something else, either-side semantics report anyway. This
    // OVER-approximates. It is the direction every other set in this file errs in
    // and the direction boundary 2 claims, but it is a cost and it gets a line.
    expect(
      rulesOf("(sdk.requests && ok).send(req);"),
      "the `&&` MIRROR — this over-approximation is disclosed, not accidental",
    ).toContain("outbound-send");

    // AND THE TWIN, IN THE SAME FIXTURE: `&&` over ordinary operands stays quiet.
    // A guard-and-collaborator idiom is common code and a gate that flags it gets
    // deleted rather than fixed.
    expect(rulesOf("(ok && cache).send(req);")).toEqual([]);
  });

  it('through keyReceiver\'s OWN recursion: `sdk[b ? (c ? "requests" : "x") : "y"]` resolves — the docblock\'s single-definition claim made TRUE of the code', () => {
    // `keyReceiver`'s ordering docblock has claimed since CR-08 that it is the
    // single definition of what a readable key is, "called from the direct key and
    // both conditional branches, so they cannot disagree about what the walk can
    // read". That was a claim about two CALLERS, made by a function that did not
    // itself handle a conditional — so the moment a conditional appeared INSIDE a
    // branch, the two DID disagree and this shape was silent. The claim is now a
    // fact: `keyReceiver` descends through `operatorReceiver`, passing ITSELF as
    // the resolver, so nesting resolves through the same four RECEIVER_OPERATORS
    // at each level.
    //
    // WHICH TASK ACTUALLY CLOSED THIS, RECORDED RATHER THAN ABSORBED. The plan
    // assigned this shape to its second task, alongside the binary operators.
    // MEASURED: it closed in the FIRST task, at the moment the element-access arm
    // stopped hand-rolling its own conditional block and started calling
    // `keyReceiver`. The recursion and the collapse are the same edit seen from
    // two sides. Emptying `RECEIVER_OPERATORS` therefore does NOT turn this red —
    // see the summary's mutation table, where it is named as MEASURED
    // NON-EVIDENCE under that mutation and proven by the descent's removal.
    expect(
      rulesOf('sdk[b ? (c ? "requests" : "x") : "y"].send(req);'),
    ).toContain("outbound-send");
    // THE TWIN: nested all the way down, and no branch names a receiver.
    expect(rulesOf('sdk[b ? (c ? "aaa" : "x") : "y"].send(req);')).toEqual([]);
    // A nested branch the walk WATCHES being assembled is unreadable, not silent
    // — the third state surviving two levels of operator.
    expect(
      rulesOf('sdk[b ? (c ? "req" + "uests" : "x") : "y"].send(req);'),
    ).toContain("outbound-unanalysable");
  });

  it("through operatorOperandMatching: AN OPERATOR AROUND A GLOBAL RECEIVER RESOLVES, IN CALL POSITION — the silence wave 25 measured and waves 25 through 31 carried forward, CLOSED (CR-11)", () => {
    // WHAT THIS CASE USED TO ASSERT, AND WHY THE REPLACEMENT IS NOT A SOFTENING.
    // Until 2026-08-24 this case asserted that all six shapes below reported
    // NOTHING, under the title "the GLOBAL receivers are untouched by it".
    // `operatorReceiver` was reached from `receiverKind` and `keyReceiver` and
    // from nowhere else, so the operator class existed for the SDK receivers and
    // did not exist for the global ones. That is the same asymmetry WR-27 was,
    // one resolver family over, and it survived six waves because it was
    // DISCLOSED — a measured silence with a row and a probe reads as handled.
    //
    // IT IS CLOSED BY ONE SHARED DESCENT, NOT BY SIX COPIES.
    // `operatorOperandMatching` is a second consumer of the SAME
    // `operatorOperands` statement `operatorReceiver` and `operatorLiteralBinding`
    // already read, and all six global resolvers reach it: `isGlobalReceiverIn`,
    // `isFetchExpression`, `bareFetchCallee`, `isNavigatorReceiver`,
    // `globalNameOf` and `aliasedGlobalOf`.
    expect(rulesOf("(ok && globalThis).fetch(url);")).toEqual([
      "outbound-fetch",
    ]);
    expect(rulesOf('(g ?? globalThis)["fetch"](url);')).toEqual([
      "outbound-fetch",
    ]);
    expect(rulesOf("(b ? globalThis : x).fetch(url);")).toEqual([
      "outbound-fetch",
    ]);
    expect(rulesOf("(b ? navigator : x).sendBeacon(u, d);")).toEqual([
      "outbound-beacon",
    ]);
    expect(rulesOf("(b ? fetch : x)(url);")).toEqual(["outbound-fetch"]);
    expect(rulesOf("(b ? eval : x)(src);")).toEqual(["outbound-dynamic-code"]);
    // THE TWO THE VERIFIER FOUND ITSELF while re-executing wave 28's discharge
    // table, on rows wave 28 had recorded as discharged. Both were the same
    // shape as the six above and neither was on any residual list.
    expect(rulesOf("new (ok && WebSocket)();")).toEqual([
      "outbound-global-ctor",
    ]);
    expect(rulesOf("(ok && eval)(src);")).toEqual(["outbound-dynamic-code"]);
    // AND THE ONE THE SHARED DESCENT DID NOT CLOSE ON ITS OWN, RECORDED BECAUSE
    // FINDING IT IS THE POINT. `(ok && fetch)(url)` — the probe
    // `isFetchExpression`'s own falsified-handoff entry carried — was STILL `[]`
    // after the descent was wired into `isFetchExpression`, because the bare-call
    // rule in the visit pass never consulted `isFetchExpression` at all: it asked
    // `ts.isIdentifier(callee) && fetchAliases.has(callee.text)` INLINE. A SIXTH
    // copy of one question, found by measuring rather than by reading. See
    // `bareFetchCallee`.
    expect(rulesOf("(ok && fetch)(url);")).toEqual(["outbound-fetch"]);
    // THE CONTRAST that showed the boundary was the RESOLVER and not the
    // operator. It is retained rather than deleted: it is now the statement that
    // the two families answer the SAME way, which is what the closure means.
    expect(rulesOf("(b ? sdk.requests : x).send(req);")).toContain(
      "outbound-send",
    );
  });

  it("through operatorOperandMatching: THE MUST-STAY-QUIET TWIN — an operator over two ORDINARY objects stays silent, in call position AND in initializer position", () => {
    // A widening is only worth what its negative side is worth. Every shape here
    // is the exact spelling of the shapes above with an ordinary object in place
    // of the global, and a gate that flagged `const c = cache ?? client` would be
    // reverted within the hour — which is the same argument `GLOBAL_RECEIVERS`
    // makes for anchoring `fetch` on four receiver names rather than on the
    // member name.
    expect(rulesOf("(ok && cache).fetch(url);")).toEqual([]);
    expect(rulesOf("(cache && client).fetch(url);")).toEqual([]);
    expect(rulesOf("(ok && cache).sendBeacon(u, d);")).toEqual([]);
    expect(rulesOf("new (ok && Widget)();")).toEqual([]);
    // INITIALIZER POSITION, which is the half `initializerReceiver`'s clause
    // promised gave the same answer as call position and which was the half that
    // made CR-11 a blocker rather than a disclosure.
    expect(rulesOf("const r = ok && cache;\nr.send(req);")).toEqual([]);
    expect(rulesOf("const c = cache ?? client;\nc.fetch(url);")).toEqual([]);
    // The RECEIVER anchoring survives the descent: an ordinary object with a
    // `fetch` member grows no alias even through an operator initializer.
    expect(
      rulesOf("const o = { fetch(u) {} };\nconst f = o.fetch ?? x;\nf(url);"),
    ).toEqual([]);
  });

  it("through operatorOperandMatching: AN OPERATOR AROUND A GLOBAL RECEIVER RESOLVES IN INITIALIZER POSITION TOO — `const g = globalThis ?? self` is a PLAUSIBLE DEFENSIVE IDIOM and it was the half nobody named", () => {
    // THE HALF THAT UPGRADED CR-11 FROM A DISCLOSED OVERREACH TO A BLOCKER.
    // `const g = globalThis ?? self` is how portable code reaches the global
    // object. It created a fully aliased global receiver this gate could not see,
    // no residual clause anywhere named it, and the `initializerReceiver` row
    // actively told a reader it was covered — its clause said initializer
    // position and call position give the same answer, which was true of the SDK
    // resolver and false of all six global ones.
    expect(rulesOf("const g = globalThis ?? self;\ng.fetch(url);")).toEqual([
      "outbound-fetch",
    ]);
    expect(rulesOf("const g = b ? globalThis : self;\ng.fetch(url);")).toEqual([
      "outbound-fetch",
    ]);
    expect(rulesOf("const f = fetch ?? x;\nf(url);")).toEqual([
      "outbound-fetch",
    ]);
    expect(rulesOf("const e = eval ?? x;\ne(src);")).toEqual([
      "outbound-dynamic-code",
    ]);
    expect(rulesOf("const n = navigator ?? x;\nn.sendBeacon(u, d);")).toEqual([
      "outbound-beacon",
    ]);
  });

  it("through operatorOperandMatching: THE MIRROR CASE AND ITS COST, PINNED — the surface as the GUARD rather than as the value REPORTS, which is the same over-approximation RECEIVER_OPERATORS settled by measurement", () => {
    // EITHER-SIDE SEMANTICS ARE AN OVER-APPROXIMATION AND THE COST IS NAMED HERE
    // RATHER THAN LEFT IMPLICIT. `a && b` evaluates to `a` when `a` is falsy, so
    // its left operand is usually a GUARD rather than a value — and a guard that
    // happens to be a global receiver makes the whole expression one. This is the
    // identical trade `RECEIVER_OPERATORS`' docblock records for the SDK side,
    // where `(sdk.requests && ok).send(req)` reports, and it errs in the
    // direction every other set in this file errs in.
    expect(rulesOf("(globalThis && ok).fetch(url);")).toEqual([
      "outbound-fetch",
    ]);
    expect(rulesOf("(fetch && ok)(url);")).toEqual(["outbound-fetch"]);
    expect(rulesOf("const g = globalThis && ok;\ng.fetch(url);")).toEqual([
      "outbound-fetch",
    ]);
  });

  it('through the COMMA SEQUENCE rule plus constStrings: `sdk[(0, "requests")]` is its rightmost operand', () => {
    // A comma expression's value IS its rightmost operand, so this hides nothing
    // either. MECHANISM: the `CommaToken` arm of `unwrap` (see its docblock for
    // the placement decision and its measured blast radius), which then hands a
    // plain string literal to `literalOf`.
    //
    // NOTE ON THE MISSING `await`: `await (X)` parses as a CALL to something named
    // `await`, not as an await of a parenthesised expression, so a fixture written
    // that way would be green for a parsing reason and prove nothing.
    expect(
      rulesOf('sdk[(0, "requests")].send(req);'),
      'sdk[(0, "requests")].send(req) still reports clean',
    ).toContain("outbound-send");
    // The same rule at the RECEIVER level rather than in key position — the
    // reason the comma arm lives in `unwrap` and not in the key resolver.
    expect(
      rulesOf("(0, sdk.requests).send(req);"),
      "(0, sdk.requests).send(req) still reports clean",
    ).toContain("outbound-send");
  });

  it("through NOTHING, and that is residual (b): an ordinary DYNAMIC lookup is not an assembled key and stays quiet", () => {
    // THE false positives that decided the bound, both lifted verbatim from the
    // real tree: `compat.ts`'s documented dotted-path walk, and array indexing in
    // `store/observations.ts`. A gate that called either an outbound network
    // surface would be deleted rather than fixed.
    expect(
      rulesOf(
        'let cur = root;\nfor (const key of path.split(".")) { cur = (cur as Record<string, unknown>)[key]; }',
      ),
    ).toEqual([]);
    // `compat.ts:141`'s `ctx[root]`, where `root` is a PARAMETER — the fourth of
    // the four real sites that bound residual (b), and the one that was measured
    // in 01-16 but never asserted here. A parameter is never a VariableDeclaration
    // so `assembledNames` cannot reach it, which is what keeps this quiet after
    // CR-08 as well as before it.
    expect(
      rulesOf(
        "export function pick(ctx: Record<string, unknown>, root: string) {\n  return ctx[root];\n}",
      ),
    ).toEqual([]);
    expect(rulesOf('const seg = segments[i].split(";");')).toEqual([]);
    expect(rulesOf("const v = MIGRATIONS[MIGRATIONS.length - 1].v;")).toEqual(
      [],
    );
    expect(
      rulesOf(
        "const x = [1, 2];\nlet i = 0;\ni += 1;\nconst y = x[i + 1].toString();",
      ),
    ).toEqual([]);
  });

  it("through isProvablyNumeric's poisoning: a numeric name POISONED by a string binding stops exempting the key", () => {
    // The over-approximation is deliberate and it fails SAFE: a name bound to a
    // number somewhere and to something else somewhere else is not a proven index.
    expect(
      rulesOf('let k = 0;\nk = "requ" + "ests";\nawait sdk[k + ""].send(req);'),
    ).toContain("outbound-unanalysable");
  });
});

describe("the beacon surface — receiver-anchored, not member-name-only", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it.each([
    ["the bare call", "navigator.sendBeacon(url, data);"],
    [
      "the call through a global receiver",
      "globalThis.navigator.sendBeacon(url, data);",
    ],
    ["the window spelling", "window.navigator.sendBeacon(url, data);"],
    [
      "a bare member REFERENCE with no call",
      "const s = navigator.sendBeacon;\ns(url, data);",
    ],
    [
      "a one-hop alias of navigator",
      "const n = navigator;\nn.sendBeacon(url, data);",
    ],
    [
      "a destructured sendBeacon",
      "const { sendBeacon } = navigator;\nsendBeacon(url, data);",
    ],
  ])("outbound-beacon fires on %s", (_shape, src) => {
    expect(rulesOf(src)).toContain("outbound-beacon");
  });

  it("outbound-beacon does NOT fire on an ordinary object that defines the same method", () => {
    // THE false positive the receiver anchor exists to rule out. Anything may
    // define a method called sendBeacon; only `navigator` is the outbound one.
    expect(
      rulesOf(
        "const o = { sendBeacon(u, d) { return d; } };\no.sendBeacon(url, data);",
      ),
    ).toEqual([]);
  });

  it("through navigatorAliases: A USE ABOVE ITS OWN BINDING REPORTS — `n.sendBeacon(u, d);` written before `const n = navigator;` — CR-09 shape 6 of 7", () => {
    // CR-09, shape 6. `navigatorAliases` is one of the two sets that has
    // chained since the day it was written — see residual (a) — and like every
    // other set here it is fully populated by the time the beacon rule runs,
    // because `collect(sf)` completes before `visit(sf)` begins.
    expect(rulesOf("n.sendBeacon(u, d);\nconst n = navigator;")).toContain(
      "outbound-beacon",
    );
  });

  it("through navigatorAliases' TRANSITIVITY vs its negation: dependency-ordered chain REPORTS, one inverted link is A MEASURED SILENCE", () => {
    // The pair, on the beacon family. The first varies nothing but the binding
    // ORDER against the second, and both are read from the same position — so
    // the difference between report and silence is attributable to the
    // bindings alone. The silent half is A MEASURED SILENCE.
    expect(
      rulesOf("n2.sendBeacon(u, d);\nconst n1 = navigator;\nconst n2 = n1;"),
    ).toContain("outbound-beacon");
    expect(
      rulesOf("n2.sendBeacon(u, d);\nconst n2 = n1;\nconst n1 = navigator;"),
    ).toEqual([]);
  });
});

describe("dynamic code construction — refused rather than analysed", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it.each([
    ["the bare eval call", 'eval("sdk.requests.send(r)");'],
    ["eval through a global receiver", 'globalThis.eval("fetch(u)");'],
    ["window.eval", 'window.eval("fetch(u)");'],
    [
      "new Function",
      'const f = new Function("r", "return sdk.requests.send(r)");',
    ],
    ["a bare Function call", 'const f = Function("r", "return fetch(r)");'],
    [
      "Function through a global receiver",
      'const f = globalThis.Function("r", "return r");',
    ],
  ])("outbound-dynamic-code fires on %s", (_shape, src) => {
    expect(rulesOf(src)).toContain("outbound-dynamic-code");
  });

  it("outbound-dynamic-code does NOT fire on a member of the same name on an ordinary object", () => {
    expect(
      rulesOf("const o = { eval(s) { return s; } };\no.eval(src);"),
    ).toEqual([]);
    expect(
      rulesOf("const parser = { Function: 1 };\nreturn parser.Function;"),
    ).toEqual([]);
  });

  // --- WR-23: the surface that reaches every other surface survives no binding
  //
  // Every title names the MECHANISM that resolves it, per plan 01-18's
  // convention, so no case here can later stand in as the bound of a rule it
  // does not exercise. Each of the three grow-spellings gets its OWN case
  // because each is a separate branch of the collect pass, and a single
  // combined case cannot show which branch is load-bearing.
  it.each([
    [
      "the DECLARATION spelling — `const e = eval; e(s)`",
      'const e = eval;\ne("sdk.requests.send(r)");',
    ],
    [
      "the GLOBAL-MEMBER declaration spelling — `const F = globalThis.Function` — WHICH THE PRE-EXISTING MEMBER-REFERENCE RULE ALSO CATCHES, MEASURED, so this row does NOT go red when the alias lookup is reverted and is NOT evidence for it",
      'const F = globalThis.Function;\nF("r", "return fetch(r)");',
    ],
    [
      "the DESTRUCTURE spelling — `const { eval: ev } = globalThis`",
      'const { eval: ev } = globalThis as any;\nev("fetch(u)");',
    ],
    [
      "the ASSIGNMENT spelling — `let e; e = eval;`",
      'let e;\ne = eval;\ne("fetch(u)");',
    ],
  ])(
    "through globalAliases plus globalNameOf, in the CALL rule: dynamic code survives no binding — %s",
    (_shape, src) => {
      // WR-23. All four returned `[]` before 2026-08-24 while the inline
      // `eval(s)` reported, in the rule whose own docblock cited the receiver
      // rules' alias handling as its model. Removing the `dynamicCodeOf` lookup
      // from the call rule drives all four red.
      expect(rulesOf(src)).toContain("outbound-dynamic-code");
    },
  );

  it("through globalAliases plus globalNameOf, in the `new` rule: `const F = Function; new F(...)` is a construction of Function", () => {
    // WR-23's constructor half for DYNAMIC_CODE. Reverting the `dynamicCodeOf`
    // lookup in the `new` rule drives this red and leaves the call-rule cases
    // above green, which is what proves the two branches independent.
    expect(rulesOf('const F = Function;\nnew F("a", body);')).toContain(
      "outbound-dynamic-code",
    );
  });

  it("through globalNameOf: a spelling the walk resolves is NAMED as an alias in the violation detail", () => {
    const detail = auditSource("fixture.ts", "const e = eval;\ne(src);")[0]
      ?.detail;
    expect(detail).toContain("`e(...)`");
    expect(detail).toContain("an alias of `eval`");
  });

  it('through globalAliases: A USE ABOVE ITS OWN BINDING REPORTS — `e("x");` written before `const e = eval;` — CR-09 shape 7 of 7', () => {
    // CR-09, shape 7, and the last of the seven. `globalAliases` was the set
    // WR-23 added one round ago, and it inherits the same two-pass structure
    // every other set here has: `collect(sf)` finishes, THEN `visit(sf)` runs.
    // A use above its binding was never outside this rule.
    expect(rulesOf('e("x");\nconst e = eval;')).toContain(
      "outbound-dynamic-code",
    );
  });

  it("through globalAliases' TRANSITIVITY vs its negation: dependency-ordered chain REPORTS, one inverted link is A MEASURED SILENCE", () => {
    // The pair, on the dynamic-code family. Read position held constant across
    // both; only the binding order moves.
    expect(rulesOf('e2("x");\nconst e1 = eval;\nconst e2 = e1;')).toContain(
      "outbound-dynamic-code",
    );
    expect(rulesOf('e2("x");\nconst e2 = e1;\nconst e1 = eval;')).toEqual([]);
  });

  // --- WR-23's negative side, in the SAME commit as the widening -------------
  it("through the RECEIVER anchoring: an alias taken off an ORDINARY object grows nothing and stays quiet", () => {
    // The member and destructure grow-branches require one of the four
    // GLOBAL_RECEIVERS, exactly as the beacon rule is receiver-anchored. This
    // is the must-stay-quiet twin of the `const F = globalThis.Function` case.
    expect(
      rulesOf(
        "const o = { eval(s) { return s; } };\nconst e = o.eval;\ne(src);",
      ),
    ).toEqual([]);
    expect(
      rulesOf("const o = { eval: 1 };\nconst { eval: ev } = o;\nev(src);"),
    ).toEqual([]);
  });

  it("through shadowedGlobals: a TOP-LEVEL `function Function(...)` provably is not the global, so the bare call stays quiet", () => {
    // The one provable narrowing of a deliberately fail-closed NAME test: a
    // top-level function declaration binds the name for the whole module.
    // Reverting `shadowedGlobals` drives this red.
    expect(
      rulesOf('function Function(a) { return a; }\nFunction("x");'),
    ).toEqual([]);
    expect(rulesOf("class WebSocket {}\nconst w = new WebSocket();")).toEqual(
      [],
    );
  });

  it("through shadowedGlobals' TOP-LEVEL bound: a NESTED declaration proves nothing about module scope and still REPORTS", () => {
    // The fail-CLOSED direction, asserted so the narrowing above can never be
    // widened into a scope-blind bypass without a fixture going red.
    expect(
      rulesOf(
        'function outer() { function Function(a) { return a; }\nreturn Function("x"); }',
      ),
    ).toContain("outbound-dynamic-code");
  });
});

describe('the outbound globals CORE-11 "of any kind" covers', () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it.each([
    ["XMLHttpRequest", "const x = new XMLHttpRequest();\nx.send(body);"],
    ["WebSocket", 'const ws = new WebSocket("wss://cdn.test/s");'],
    ["EventSource", 'const es = new EventSource("https://cdn.test/e");'],
  ])("outbound-global-ctor fires on new %s", (_shape, src) => {
    expect(rulesOf(src)).toContain("outbound-global-ctor");
  });

  // --- WR-23's constructor half: the identical gap, two lines away -----------
  it.each([
    [
      "the DECLARATION spelling — `const W = WebSocket; new W(url)`",
      'const W = WebSocket;\nnew W("wss://cdn.test/s");',
    ],
    [
      "the GLOBAL-MEMBER spelling — `const X = globalThis.XMLHttpRequest` — WHICH THE PRE-EXISTING MEMBER-REFERENCE RULE ALSO CATCHES, MEASURED, so this row does NOT go red when the alias lookup is reverted and is NOT evidence for it",
      "const X = globalThis.XMLHttpRequest;\nconst x = new X();",
    ],
    [
      "the DESTRUCTURE spelling — `const { EventSource: E } = globalThis`",
      'const { EventSource: E } = globalThis as any;\nnew E("https://cdn.test/e");',
    ],
  ])(
    "through globalAliases plus globalNameOf, in the `new` rule: an outbound CONSTRUCTOR survives no binding — %s",
    (_shape, src) => {
      // WR-23, constructor half. All three returned `[]` before 2026-08-24.
      // Reverting the `outboundCtorOf` lookup drives all three red while the
      // dynamic-code cases stay green.
      expect(rulesOf(src)).toContain("outbound-global-ctor");
    },
  );

  it("through the RECEIVER anchoring: a constructor alias taken off an ORDINARY object stays quiet", () => {
    expect(
      rulesOf(
        "const lib = { WebSocket: Shim };\nconst W = lib.WebSocket;\nnew W(u);",
      ),
    ).toEqual([]);
  });
});

describe("the RECEIVER the alias sets sit on resolves the hop they already resolve (IN-20)", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it.each([
    [
      "the global fetch — outbound-fetch",
      "const g = globalThis;\nawait g.fetch(u);",
      "outbound-fetch",
    ],
    [
      "a COMPUTED member whose name will not reduce — outbound-unanalysable",
      'const g = globalThis;\nawait g["fet" + "ch"](u);',
      "outbound-unanalysable",
    ],
    [
      "dynamic code on the aliased receiver — outbound-dynamic-code",
      "const g = globalThis;\ng.eval(src);",
      "outbound-dynamic-code",
    ],
    [
      "an outbound constructor on the aliased receiver — outbound-global-ctor",
      "const g = globalThis;\nnew g.WebSocket(url);",
      "outbound-global-ctor",
    ],
    [
      "the beacon receiver reached through the aliased receiver — outbound-beacon",
      "const g = globalThis;\ng.navigator.sendBeacon(u, d);",
      "outbound-beacon",
    ],
    [
      "the ASSIGNMENT spelling — `let g; g = globalThis;`",
      "let g;\ng = globalThis;\nawait g.fetch(u);",
      "outbound-fetch",
    ],
  ])(
    "through globalThisAliases: `const g = globalThis` is a global receiver — %s",
    (_shape, src, rule) => {
      // IN-20. Every one of these returned `[]` before 2026-08-24 while
      // `fetchAliases` and `navigatorAliases` — which SIT ON this receiver —
      // both resolved the identical hop. Reverting the `globalThisAliases`
      // consultation in `isGlobalReceiver` drives all six red.
      expect(rulesOf(src)).toContain(rule);
    },
  );

  it("through globalThisAliases' one-hop bound: an ordinary local is NOT a global receiver and its members stay quiet", () => {
    // The must-stay-quiet twin, in the same commit as the widening. `g` is an
    // ordinary object here, so nothing it defines becomes an outbound surface.
    expect(
      rulesOf('const g = { fetch(u) { return u; } };\ng.fetch("u");'),
    ).toEqual([]);
    expect(
      rulesOf('const g = { fetch(u) { return u; } };\ng["fet" + "ch"]("u");'),
    ).toEqual([]);
    expect(
      rulesOf("const g = { eval(s) { return s; } };\ng.eval(src);"),
    ).toEqual([]);
  });

  it("through ALL FIVE ALIAS SETS' TRANSITIVITY: an alias CHAIN resolves to ANY depth when each link's DECLARATION follows the declaration it is grown from — MEASURED, and not what residual (a) used to say", () => {
    // MEASURED, NOT ASSUMED, AND THE MEASUREMENT CONTRADICTED THE EXPECTATION
    // THIS CASE WAS FIRST WRITTEN WITH. Every alias set here is grown by
    // consulting the LIVE set, so each new binding can be resolved from the
    // previous one and the chain resolves to arbitrary depth. That is equally
    // true of `fetchAliases`, `navigatorAliases`, `receiverAliases` and
    // `globalAliases`, and it has been true of the first two since they were
    // written — so residual (a)'s "more than ONE HOP is beyond the walk"
    // UNDERSTATED the walk's reach for ALIASES while remaining exactly right
    // for KEYS. Corrected 2026-08-24 (plan 01-19); see residual (a).
    expect(
      rulesOf("const a = globalThis;\nconst g = a;\nawait g.fetch(u);"),
    ).toContain("outbound-fetch");
    expect(
      rulesOf(
        "const a = globalThis;\nconst b = a;\nconst g = b;\nawait g.fetch(u);",
      ),
    ).toContain("outbound-fetch");
    expect(rulesOf("const f = fetch;\nconst f2 = f;\nf2(u);")).toContain(
      "outbound-fetch",
    );
    expect(
      rulesOf("const r = sdk.requests;\nconst r2 = r;\nr2.send(req);"),
    ).toContain("outbound-send");

    // WIDENED TO ALL FIVE SETS 2026-08-24 (WR-30). This case asserted three of
    // the five, and the two it left out — `navigatorAliases` and
    // `globalAliases` — are exactly the two whose docblocks still carried the
    // measured-false one-hop bound this wave deleted. Leaving the assertion at
    // three of five is what let a reader check the clause against a majority and
    // find it true.
    //
    // MEASURED DISCREPANCY, RECORDED RATHER THAN GLOSSED: these two sets were
    // NOT uncovered. `navigatorAliases' TRANSITIVITY vs its negation` and
    // `globalAliases' TRANSITIVITY vs its negation` already assert both of them
    // chaining, in their own describes. What is added here is (i) all five in
    // ONE place, which is where residual (a) sends a reader, and (ii) THREE
    // hops, where those two siblings stop at two — so this is a consolidation
    // and a depth widening, not the closure of a hole.
    expect(
      rulesOf("const a = navigator;\nconst b = a;\nb.sendBeacon(u, d);"),
    ).toContain("outbound-beacon");
    expect(
      rulesOf(
        "const a = navigator;\nconst b = a;\nconst c = b;\nc.sendBeacon(u, d);",
      ),
    ).toContain("outbound-beacon");
    expect(rulesOf('const a = eval;\nconst b = a;\nb("x");')).toContain(
      "outbound-dynamic-code",
    );
    expect(
      rulesOf('const a = eval;\nconst b = a;\nconst c = b;\nc("x");'),
    ).toContain("outbound-dynamic-code");
  });

  it("through NOTHING: INVERTED BINDING ORDER is what silences an alias chain — the intermediate is declared before its root, so the root is not yet in the live set — A MEASURED SILENCE", () => {
    // A MEASURED SILENCE, labelled as one per plan 01-18's convention.
    //
    // SPLIT IN TWO 2026-08-24 (CR-09), AND THIS HALF WAS RETITLED BECAUSE ITS
    // OLD TITLE NAMED A VARIABLE ITS BODY IS INSENSITIVE TO. The title used to
    // name the READ POSITION. The verifier measured the body BOTH WAYS and the
    // read position does nothing: remove the function wrapper and move the read
    // LAST (`const g = a;\nconst a = globalThis;\ng.fetch(u);`) and it is still
    // `[]`; keep the wrapper and bind the root DIRECTLY
    // (`function z() { return g.fetch(u); }\nconst g = globalThis;`) and it
    // REPORTS. What this case varies, and the ONLY thing it varies, is the
    // BINDING ORDER: `g` is grown from `a` before `a` is in the live set, so
    // `g` never enters `globalThisAliases`. The half below varies the READ and
    // holds the bindings in dependency order; between them they can tell the
    // claim from its negation, which this case alone never could.
    expect(
      rulesOf(
        "function z() { return g.fetch(u); }\nconst g = a;\nconst a = globalThis;",
      ),
    ).toEqual([]);
    // The same inverted bindings with the read moved LAST — still silent. The
    // read is not what is doing the work here.
    expect(rulesOf("const g = a;\nconst a = globalThis;\ng.fetch(u);")).toEqual(
      [],
    );
  });

  it("through globalThisAliases: MOVING THE READ CHANGES NOTHING — a use written ABOVE its own binding REPORTS, because `collect(sf)` completes before `visit(sf)` begins", () => {
    // THE POSITIVE HALF, added 2026-08-24 (CR-09). This is the assertion that
    // would have caught the READ-POSITION BOUND the moment it was written, and
    // its absence is why four artifacts carried that bound for a round. The
    // bindings here are in DEPENDENCY ORDER and only the READ moves — the
    // mirror image of the half above, which holds the read fixed and inverts
    // the bindings.
    expect(
      rulesOf("function z() { return g.fetch(u); }\nconst g = globalThis;"),
    ).toContain("outbound-fetch");
    expect(rulesOf("g.fetch(u);\nconst g = globalThis;")).toContain(
      "outbound-fetch",
    );
    // And at depth: four hops in dependency order with the use written ABOVE
    // all four declarations. The `ANY DEPTH` clause in residual (a) is checkable
    // rather than decorative because of this line.
    expect(
      rulesOf(
        "d(u);\nconst a = fetch;\nconst b = a;\nconst c = b;\nconst d = c;",
      ),
    ).toContain("outbound-fetch");
  });

  it("through NOTHING then globalThisAliases: THE THREE-CASE DISCRIMINATION that separates binding order from read order — inverted+last `[]`, inverted+first `[]`, dependency-ordered+first REPORTS", () => {
    // The smallest set that distinguishes the two variables. Cases 1 and 2 hold
    // the BINDINGS inverted and move the READ: both silent, so the read is not
    // the mechanism. Cases 2 and 3 hold the READ first and change the BINDINGS:
    // the silence flips to a report, so the bindings are the mechanism. Cases 1
    // and 2 are MEASURED SILENCES and neither may ever be cited as evidence
    // that a rule holds.
    expect(rulesOf("const b = a;\nconst a = fetch;\nb(u);")).toEqual([]);
    expect(rulesOf("b(u);\nconst b = a;\nconst a = fetch;")).toEqual([]);
    expect(rulesOf("b(u);\nconst a = fetch;\nconst b = a;")).toContain(
      "outbound-fetch",
    );
  });

  it('through constStrings\' WHOLE-FILE BINDINGS in GLOBAL-KEY position: `let k = "harmless"; k = "fetch"; globalThis[k](url)` REPORTS — CR-10 shape 3 of 5', () => {
    // CR-10, shape 3. The same stale first literal, one level out: `memberName`
    // resolves the key through the SAME `constStrings` map, so `globalThis[k]`
    // read "harmless", found no outbound global of that name, and said nothing.
    //
    // WHY `outbound-unanalysable` AND NOT `outbound-fetch`, STATED SO NO READER
    // HAS TO GUESS: `literalOf` is the SINGLE-valued reader and it now answers
    // `undefined` for a name with more than one binding — the walk read two
    // different strings and will not pick one. An unreadable member of a
    // POSITIVELY IDENTIFIED global receiver is reported, which is the
    // `globalThis["fet"+"ch"]` half of WR-19. The single-binding control below
    // resolves completely and reports `outbound-fetch` instead; both report, and
    // the difference between them is what the walk could read.
    expect(
      rulesOf('let k = "harmless";\nk = "fetch";\nglobalThis[k](url);'),
    ).toContain("outbound-unanalysable");
  });

  it('through constStrings\' ASSIGNMENT-SIDE WRITE in GLOBAL-KEY position: `let k; k = "fetch"; globalThis[k](url)` resolves COMPLETELY and reports outbound-fetch', () => {
    // The single-binding control for the case above, and a second widening this
    // plan measured rather than predicted: before the assignment branch wrote
    // `constStrings`, this shape reported `outbound-unanalysable` — the walk knew
    // something was hidden but could not say what. It now reads `k` as "fetch"
    // and names the surface. A gate that can name the surface should.
    const rules = rulesOf('let k;\nk = "fetch";\nglobalThis[k](url);');
    expect(rules).toContain("outbound-fetch");
  });

  it("through NOTHING: a receiver KEY still stops at exactly ONE hop, which is where residual (a)'s original wording IS right", () => {
    // The contrast that makes the corrected residual checkable. `constStrings`
    // and `assembledNames` read the INITIALIZER's shape rather than the live
    // set, so they do not chain: two hops of KEY is silent, in both spellings.
    expect(
      rulesOf('const a = "requests";\nconst b = a;\nsdk[b].send(req);'),
    ).toEqual([]);
    expect(
      rulesOf('const a = "req" + "uests";\nconst b = a;\nsdk[b].send(req);'),
    ).toEqual([]);
  });
});

describe("what `isProvablyNumeric` ACTUALLY establishes, and what it merely assumes (WR-26)", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it("RESOLUTION 2 — THE DOCBLOCK CHANGED, NOT THE BRANCH: a member-named key is still `[]`, and this pins the DISCLOSED COST of a NAME heuristic", () => {
    // WR-26's motivating shape. It is silent, and the measurement recorded in
    // `isProvablyNumeric`'s docblock is why the branch was not narrowed: this
    // shape is silent under EVERY variant tried, including the property-access
    // branch removed entirely, because a bare member is not an ASSEMBLED key
    // either — residual (b) silences it and the numeric exemption never does.
    // No narrowing available at this branch can close it.
    expect(rulesOf("const o = q;\nsdk[o.length].send(req);")).toEqual([]);
    expect(
      rulesOf('const o = { max: "requests" };\nsdk[o.max].send(req);'),
    ).toEqual([]);
  });

  it("RESOLUTION 2's COST, MEASURED: the property-access branch is load-bearing ONLY in `+` composition, which is the ordinary-INDEX class it exists to protect", () => {
    // This is the case a revert CAN turn red, and it is what makes the
    // measurement in the docblock checkable rather than asserted. Removing the
    // property-access branch makes both of these report
    // `outbound-unanalysable` — the false-positive class that got the broad
    // WR-19 rule narrowed, with `observations.ts`'s `segments[i + 1]` live.
    expect(rulesOf("const o = q;\nsdk[o.length + 1].send(req);")).toEqual([]);
    expect(
      rulesOf("const i = 1;\nconst buf = q;\nsdk[buf.length + i].send(req);"),
    ).toEqual([]);
  });

  it("what the function DOES prove: an ASSEMBLED key composed with a member name is still unreadable, because `+` needs BOTH operands numeric", () => {
    // The half of the docblock that was always true, asserted so the correction
    // above cannot be read as saying the whole function assumes.
    expect(
      rulesOf('const o = { max: "requests" };\nsdk[o.max + ""].send(req);'),
    ).toContain("outbound-unanalysable");
  });
});

describe("the shapes that MUST stay quiet — each one real in or adjacent to this codebase", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it.each([
    [
      "sdk.requests.get — the CORE-05 reload",
      "const rr = await sdk.requests.get(id);",
    ],
    ["sdk.requests.query", "await sdk.requests.query();"],
    ["sdk.requests.inScope", "await sdk.requests.inScope(request);"],
    ["sdk.requests.matches", "sdk.requests.matches(r);"],
    [
      "an allowlisted method through an alias",
      "const r = sdk.requests;\nconst rr = await r.get(id);",
    ],
    [
      "the telemetry.ts globalThis.performance idiom",
      "const p = (globalThis as { performance?: { now?: () => number } }).performance;",
    ],
    ["cache.fetch", "const res = await cache.fetch(url);"],
    ["client.fetch", "client.fetch(u);"],
    ["logger.send", "logger.send(line);"],
    [
      "a send destructured from a logger",
      "const { send } = logger;\nsend(line);",
    ],
    [
      "an identifier merely NAMED net",
      "const net = { port: 443 };\nreturn net.port;",
    ],
    [
      "an ordinary object defining sendBeacon",
      "const o = { sendBeacon(u, d) { return d; } };\no.sendBeacon(url, data);",
    ],
    [
      "an ordinary object defining eval",
      "const o = { eval(s) { return s; } };\no.eval(src);",
    ],
    [
      "compat.ts's documented dotted-path walk",
      'let cur = root;\nfor (const key of path.split(".")) { cur = (cur as Record<string, unknown>)[key]; }',
    ],
    ["array indexing through a name", 'const seg = segments[i].split(";");'],
    // WR-27's TWINS, written in the SAME COMMIT as the operator descent rather
    // than after it. An operator descent in CALL-RECEIVER position is the widening
    // most likely to fire on ordinary shipped code — picking one of two ordinary
    // collaborators with `? :` or `??` is common — and a gate that flags that gets
    // deleted rather than fixed.
    [
      "an operator expression over two ORDINARY objects, in call position",
      "(useCache ? cache : client).send(payload);",
    ],
    [
      "the `??` fallback idiom over two ORDINARY objects",
      "(cache ?? client).send(payload);",
    ],
    [
      "the `||` fallback idiom over two ORDINARY objects",
      "(cache || client).send(payload);",
    ],
    [
      "the `&&` GUARD idiom over an ordinary collaborator",
      "(ready && cache).send(payload);",
    ],
    [
      "an ORDINARY object defining a method named send",
      "const bus = { send(x) { return x; } };\nbus.send(line);",
    ],
    ["a crypto import", 'import { createHash } from "crypto";'],
    ["a local re-export", 'export { x } from "./telemetry";'],
    ["a node:fs dynamic import", 'const m = await import("node:fs");'],
    ["a sqlite require", 'const m = require("sqlite");'],
  ])("%s reports ZERO violations", (_shape, src) => {
    expect(rulesOf(src)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// THE GATE FILE'S OWN BYTES CARRY NO BOUND OUTSIDE THE GENERATED SPAN
// ---------------------------------------------------------------------------
/**
 * WHY THIS EXISTS, AND WHAT IT IS NOT.
 *
 * Every other guard in this file reads `RESOLVER_REGISTRY[].clause` and nothing
 * else. The hand-written lines ahead of the registry are what a reader and a
 * later planner meet FIRST, and until 2026-08-25 they raised ZERO obligations.
 * Seven consecutive waves each corrected a stale claim there and each acquired
 * the next one, because a corrected sentence is still an AUTHORED bound standing
 * beside a DERIVED one.
 *
 * WAVE 33 DELETED THE BOUNDS RATHER THAN WIDENING THE SCAN OVER THEM. Widening
 * the existing guards to read the header would have converted twenty stale
 * sentences into twenty NEW obligations for the next author to keep true, on
 * prose that will drift again. THE DELETION IS WHAT MAKES THE HEADER CORRECT.
 * THIS GUARD ONLY KEEPS IT DELETED - it is the cheap, bounded thing that stops
 * the surface being re-populated, and no sentence anywhere may claim more of it
 * than that.
 *
 * ITS LIMITS, STATED HERE BECAUSE THIS IS WHERE IT IS CLAIMED:
 *
 * (1) IT IS A PHRASE LIST. Its reach is exactly the strings in
 *     `UNBOUNDED_QUANTIFIERS` and no further. A universal spelled in words that
 *     are not on that list passes it untouched - the same limit that list's own
 *     docblock already states, now stated of this guard too. Rewriting a matched
 *     sentence into a synonym would turn this guard green while preserving the
 *     bound, and that would be gaming it rather than satisfying it.
 *
 * (2) IT IS NORMALIZATION-DEPENDENT, AND THE CONVENTION IS NAMED IN CODE RATHER
 *     THAN LEFT IN A REGULAR EXPRESSION. Measured at wave 33 before any edit,
 *     the hand-written region scored 20 occurrences scanned line by line and 24
 *     scanned under the convention below. FOUR occurrences wrap across two
 *     comment lines. A line-based scan - which is what this round's review
 *     suggested - would report 20 while 24 exist: a stated reach exceeding an
 *     executed one, which is the exact defect this round is about, arriving
 *     inside its own fix. `normalizeGateLine` and `joinGateLines` are that
 *     convention, written out so a reader does not have to infer it.
 *
 * (3) IT REACHES BYTES, NOT MEANING. A sentence that asserts a universal without
 *     using a declared phrasing is invisible to it. It cannot read a claim; it
 *     can only find a string.
 *
 * (4) EXCLUSION THREE IS A LINE RANGE, WHICH IS WIDER THAN THE CLAUSE STRINGS
 *     IT STANDS FOR. It excludes the registry declaration's whole LINE RANGE —
 *     4135..5767, 1633 lines, re-measured at wave 37 — and a line range would
 *     also swallow a docblock sitting between two rows. That coarseness is
 *     NARROWED rather than merely disclosed: `exclusionThreeCarriesOnlyClauses`
 *     below pins the count inside that range against the count inside the live
 *     `clause` strings, so a phrasing written into a between-rows comment breaks
 *     an equality instead of vanishing. Measured at wave 33 and re-measured at
 *     wave 37 against the corrected range: 12 and 12, both times.
 *
 *     WR-48, 2026-08-26, WAVE 37: THE RANGE USED TO BE WIDER STILL, AND THE
 *     EXCLUSION'S NAME WAS FALSE OF THE EXTRA LINES. `closingBracketAfter`
 *     matched the exact line `"]);"`, so it walked past the registry's own
 *     closing line at 5767 and landed at 5884 on the close of
 *     `BRANCH_VOCABULARY`. The exclusion therefore ran 4135..5884 and swallowed
 *     117 lines of a DIFFERENT construct, for which its `name` and its `why`
 *     were both false, and its band of 500..3000 did not catch it because 1750
 *     lines sits inside that band. Correcting the recogniser returned those 117
 *     lines to the guarded surface, and the number of obligations they raised
 *     was MEASURED AFTER THE CHANGE rather than predicted before it: ZERO. The
 *     enforcement had erred safe the whole time — verification pass 8 planted a
 *     declared phrasing at 5800, inside the swallowed lines, and the suite went
 *     red through the clause-count equality — so nothing was laundered through
 *     the defect and nothing leaked. THAT IS WHY IT WAS A WARNING AND NOT A
 *     BLOCKER, AND IT WAS NEVER A REASON TO LEAVE A FALSE DESCRIPTION STANDING.
 *     One false description is now corrected. It does not follow that the other
 *     two exclusions are exact, and limits (1), (2), (3) and (5) are untouched
 *     by it.
 *
 * (5) THE CONSTRUCT ANCHOR REACHES THE NEAREST PRECEDING ACCEPTED LINE AND NO
 *     FURTHER, AND THAT IS NARROWER THAN IT SOUNDS. Added at wave 36 for
 *     CR-17; RESTATED AT WAVE 39, because what stood here was FALSE of the
 *     code beneath it. A key carries the masked construct token its occurrence
 *     sits under, so the three discharge checks are anchor-sensitive with no
 *     change to their logic.
 *
 *     WHAT THE PREVIOUS TEXT CLAIMED AND WHAT WAS EXECUTED AGAINST IT. It said
 *     flatly that an exemption written for one construct is NOT discharged by
 *     an occurrence sitting under a DIFFERENT one, and stated the whole
 *     residual as same-construct interchangeability. Verification pass 9
 *     executed TWO cross-construct relocations that the first sentence forbids
 *     and the second does not describe, both at 434 of 434 green: a shipped
 *     sentence moved 5,264 lines out of a docblock into an unrelated
 *     `describe`, and a shipped table cell moved between two identically
 *     headed tables. Seven of the 29 keys were relocatable that way. A stated
 *     reach exceeding an executed one, inside the paragraph written to state
 *     the reach of the fix for that exact defect.
 *
 *     WHAT WAVE 39 REMOVES, MEASURED RATHER THAN ARGUED. (a) SELF-ANCHORING.
 *     The backward scan now opens STRICTLY ABOVE the occurrence and the
 *     forward walk stops STRICTLY ABOVE it, so an occurrence that IS its own
 *     construct header no longer anchors to a prefix of its own line. Measured
 *     across all 29 keys before and after: 3 carried that shape, and 0 do.
 *     (b) AMBIGUOUS ANCHOR TOKENS. Every line's would-be token is censused and
 *     every anchor in use is asserted to have exactly ONE producer. Measured
 *     when the census first ran: 2 tokens with 4 keys between them — one
 *     produced by 10 lines, one by 3 — both disambiguated in their own bytes,
 *     and 0 remain.
 *
 *     WHAT REMAINS UNGUARDED, STATED AS A LIMIT AND NOT AS A SATISFIED CHECK.
 *     TWO OCCURRENCES UNDER THE SAME CONSTRUCT REMAIN INTERCHANGEABLE,
 *     separated only by the positional `#N` ordinal, which is assigned by scan
 *     order rather than by line. AND THE CONSTRUCT IS A PROXIMITY, NOT A
 *     CONTAINMENT: the anchor is the nearest preceding line five recognisers
 *     accept, and two of those recognisers climb to the top of a prose region.
 *     RE-MEASURED AT WAVE 39 AFTER BOTH CHANGES, the maximum distance from an
 *     occurrence to its anchor is 234 LINES — the occurrence on line 235 takes
 *     this file's own title line — so `the same construct` can span a couple
 *     of hundred lines and the interchangeability residual is that wide.
 *
 *     Removing two relocation shapes does not close the relocation class. The
 *     anchoring does not widen limit (1)'s phrase list, it does not change
 *     limit (2)'s normalization, and it reaches none of the surfaces limit (3)
 *     leaves out.
 */
const HEADER_QUANTIFIER_EXEMPTIONS: Readonly<Record<string, string>> =
  Object.freeze({
    // --- HEADER (1..956) ---
    "packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi… §§ CR-10 `constStrings` holds {q3} a name is bound to at ANY OF :: q3":
      "HEADER. The universal is bounded IN THE SAME SENTENCE by the clause that follows it, which names the collecting branches by name. Removing the phrasing would remove the thing the bound is stated about. The reach OF RECORD is the generated span.",
    "packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi… §§ ITS COLLECTING BRANCHES and reports if {q4} names a receiver, :: q4":
      "HEADER. The predicate half of the sentence above, bounded by the same clause naming the collecting branches. Exempt as one thought with the entry above it, not as a second claim.",
    "packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi… §§ `{q0}` was REMOVED from the one before it, for the same :: q0":
      "HEADER. A QUOTATION of a phrase recorded as REMOVED from a clause on 2026-08-24 (CR-13). Quoting a deleted bound in order to record that it was deleted is not asserting one.",
    "packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi… §§ AND `+=` WAS NEVER READ AT ALL, in a paragraph claiming every :: q5":
      "HEADER. Quotes the FALSE claim a superseded paragraph made, in order to record that it was false. WRAPPED across two comment lines: a line-based scan does not see this occurrence at all, which is why the scan is not line-based.",
    'SPELLING (rebind, receiver-key position) RESOLVED BY REPORTS §§ k = "requests"; sdk[k] {q8} :: q8':
      "HEADER. A cell in an ASCII table naming the RULE LABEL that fires for the row beside it. A label names a mechanism; it states no reach.",
    'SPELLING (rebind, receiver-key position) RESOLVED BY REPORTS §§ k = "requests"; sdk[k] {q8} :: q8 #2':
      "HEADER. The same table cell one row down, for the `var` spelling. Distinct occurrence, identical reasoning, listed separately because the guard counts occurrences rather than lines.",
    'SPELLING (rebind, receiver-key position) RESOLVED BY REPORTS §§ k = "harmless"; sdk[k] {q8} — THE MIRROR, and it :: q8':
      "HEADER. The same table cell for the MIRROR row, where the over-approximation is the point being shown.",
    "SPELLING (operator, by POSITION) RESOLVED BY REPORTS §§ {q2} :: q2":
      "HEADER. A wrapped cell in the same ASCII table, labelling what the keyReceiver row already carries. What bounds it is QUANTIFIED_CLAUSES.keyReceiver - the four RECEIVER_OPERATORS - and not this cell.",
    "SPELLING (operator, by POSITION) RESOLVED BY REPORTS §§ is inside for a literal binding, for an assembled binding in every :: q5":
      "HEADER. Bounded IN THE SAME SENTENCE by the four positions it enumerates and by the sentence after it, `Two hops is out`. WRAPPED across two comment lines.",
    "SPELLING (operator, by POSITION) RESOLVED BY REPORTS §§ a binding {q0} is seen. It is deleted, not softened. :: q0":
      "HEADER. Records WHY a former exemption was DELETED, quoting the reach that falsified it. The sentence is about a deletion; it makes no claim of its own.",
    "SPELLING (operator, by POSITION) RESOLVED BY REPORTS §§ chains to {q2}. Executed: `const a = navigator; const b = a; :: q2":
      "HEADER. Records a hop clause that was DELETED and pastes the probe executed against it. It points at (a) and at the generated span for the answer rather than answering.",

    // --- CODE ABOVE THE REGISTRY ---
    "type Violation = { file: string; rule: string; detail: string }; §§ Every non-spec module the plugin SHIPS, under either source root, at {q2}. :: q2":
      "CODE. Not a claim about the OUTBOUND WALK's resolution reach at all: it describes the FILE WALK's directory recursion, which really is unbounded in depth and is pinned by the 23-file non-vacuity assertion over both SOURCE_ROOTS. Two different walks, and only one of them has a residual.",
    "WHAT A READABLE KEY IS — DEFINED EXACTLY ONCE, CALLED FROM EVERY… §§ ITS COLLECTING BRANCHES, and step 1 asks whether {q4} names a receiver. :: q4":
      "CODE. Bounded IN THE SAME SENTENCE by the clause immediately before it, which names the collecting branches. The `anywhere` half of this sentence was REWRITTEN OUT in wave 33; what remains is the predicate that clause governs.",
    "WHAT A READABLE KEY IS — DEFINED EXACTLY ONCE, CALLED FROM EVERY… §§ WHICH DIRECTION THAT ERRS IN, SAID PLAINLY: {q8} :: q8":
      "CODE. A one-line RULE LABEL, defined by the table in the header and used here to name the direction the mechanism errs in. It states no reach; the sentence it labels states the direction.",
    "EVERY string an expression can denote: the literal itself, or th… §§ collected set of literals `constStrings` recorded for a name — which is every :: q3":
      "CODE. Bounded IN THE SAME SENTENCE by the four branches enumerated immediately after it - a declaration, an assignment, a logical assignment and an operator initializer. The redundant `anywhere` clause that sat between them was REWRITTEN OUT in wave 33.",

    // --- BELOW THE REGISTRY ---
    "THE DECLARED QUANTIFIER PHRASINGS. §§ green, and were FALSE: `{q7} the name is bound to anywhere in the :: q0":
      "BELOW REGISTRY, and one of THREE occurrences forming a single QUOTATION. This is the docblock of the list itself, quoting the two universals round 6 executed and DISPROVED. The quotation is the evidence for why the list exists; deleting it would leave the list without its reason.",
    "THE DECLARED QUANTIFIER PHRASINGS. §§ green, and were FALSE: `{q7} the name is bound to anywhere in the :: q7":
      "BELOW REGISTRY, and one of THREE occurrences forming a single QUOTATION. This is the docblock of the list itself, quoting the two universals round 6 executed and DISPROVED. The quotation is the evidence for why the list exists; deleting it would leave the list without its reason.",
    "THE DECLARED QUANTIFIER PHRASINGS. §§ file` and `silent in {q5}`. A universal a reviewer cannot execute and :: q5":
      "BELOW REGISTRY. The third occurrence of the same quotation begun on the line above - the second falsified universal, quoted for the same reason.",
    'export const QUANTIFIED_CLAUSES: Readonly<Record<string, string>… §§ "Bounded by DECLARATION ORDER inside the single collect pass, and by the branches that write the… :: q1':
      "BELOW REGISTRY, and a member of the QUANTIFIED_CLAUSES NAMED CLASS. Every value in that map exists to state what MEASURABLY BOUNDS a clause's universal, so it necessarily quotes the universal it bounds. The class cannot grow silently: it is bounded by QUANTIFIED_CLAUSES' own key set, which the coverage guard already pins one row at a time.",
    "export const QUANTIFIED_CLAUSES: Readonly<Record<string, string>… §§ 'Bounded by operatorReceiver\\'s FOUR RECEIVER_OPERATORS and by keyReceiver passing ITSELF as the… :: q2":
      "BELOW REGISTRY, QUANTIFIED_CLAUSES NAMED CLASS - see the entry above. Stating that a universal is unbounded only WITHIN four named operators is the act of bounding it, not of asserting it.",
    "export const QUANTIFIED_CLAUSES: Readonly<Record<string, string>… §§ 'Bounded by operatorReceiver\\'s FOUR RECEIVER_OPERATORS and by keyReceiver passing ITSELF as the… :: q2 #2":
      "BELOW REGISTRY, QUANTIFIED_CLAUSES NAMED CLASS - see the entry above. Stating that a universal is unbounded only WITHIN four named operators is the act of bounding it, not of asserting it.",
    'it.each<[label: string, binding: string]>([ §§ "through assembledNames: {q5} of a bound assembly is unreadable — %s", :: q5':
      "BELOW REGISTRY. A PARAMETERISED test title. The spellings it names are the case's own parameter table, sitting directly beneath it, so the title's universal is enumerated by data rather than claimed by prose.",
    "CR-10, shape 1, and the mechanism named in the title is the whol… §§ BRANCHES and `keyReceiver` reports if {q4} names a receiver — which is exactly :: q4":
      "BELOW REGISTRY. Bounded IN THE SAME SENTENCE by the clause on the line above naming the collecting branches; the `anywhere` half was REWRITTEN OUT in wave 33.",
    "Same mechanism, different declaration keyword. It is asserted se… §§ it('through constStrings\\' WHOLE-FILE BINDINGS, {q8} — THE MIRROR, and it errs by OVER-approxima… :: q8":
      "BELOW REGISTRY. A test TITLE naming the rule label under test. The title's job is to say which mechanism the case exercises, and the case beneath it is the assertion.",
    "THE MIRROR OF THE WIDENING, ASSERTED RATHER THAN LEFT FOR NEXT R… §§ {q8} (implemented) reports here — an OVER-approximation, :: q8":
      "BELOW REGISTRY. Names the rule label and states, in the same breath, the direction it errs in - an OVER-approximation. A label plus its direction is a description, not a reach.",
    'CR-10, shape 4, and the sharpest of the five because the lesson … §§ was read "in {q5}" and through "either a declaration or an :: q5':
      "BELOW REGISTRY. A QUOTATION, in quotation marks, of a claim this file's own header used to make and which the sentence after it records as FALSE. Quoting a claim in order to falsify it is not making it.",
    'Two DIFFERENT allowlisted members is the honest opposite: the wa… §§ it("through {q8} and literalOf together: THE WIDENING CREATED NO NEW SILENCE — every mirror posi… :: q8':
      "BELOW REGISTRY. A test TITLE naming the rule label under test, in the same shape as the case above it.",
    "THE LIST IS CHECKED AGAINST THE UNIVERSALS THIS ROUND FALSIFIED,… §§ universal — `silent in {q5}` — and that ROW WAS REMOVED when its :: q5":
      "BELOW REGISTRY. A QUOTATION, in backticks, of the universal carried by the registry row that was REMOVED on 2026-08-24 (CR-11). It records why the row went; it asserts nothing about what the walk reaches now.",
    'const row = RESOLVER_REGISTRY.find((r) => r.id === id); §§ "row `silence-operator-around-global-receiver` is BACK in the registry. It was removed on 2026-0… :: q5':
      "BELOW REGISTRY. An ASSERTION MESSAGE that fires only if the removed row comes back. It quotes the row's own named set - the spellings THAT ROW named - and is bounded by that set. A message complaining about a phrasing is not asserting it.",
  });

/**
 * THE WHITESPACE CONVENTION, NAMED. One comment line, stripped of its leading
 * `//`, `*` or `/**` marker and of one following space, with runs of whitespace
 * collapsed to a single space and the ends trimmed.
 */
const normalizeGateLine = (line: string): string =>
  line
    .replace(/^\s*(\/\/+|\*\/|\/\*\*|\/\*|\*)\s?/, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The joined form, with an index that maps every character back to the 1-based
 * line it came from. Joining is what makes a phrasing split across two comment
 * lines visible; the index is what lets the failure message still name a line.
 */
const joinGateLines = (
  lines: readonly string[],
  lineNumbers: readonly number[],
): { readonly text: string; readonly lineAt: readonly number[] } => {
  let text = "";
  const lineAt: number[] = [];
  for (const n of lineNumbers) {
    const t = normalizeGateLine(lines[n - 1] ?? "");
    if (text.length > 0) {
      text += " ";
      lineAt.push(n);
    }
    for (let k = 0; k < t.length; k++) lineAt.push(n);
    text += t;
  }
  return { text, lineAt };
};

/** Replaces each declared phrasing with a stable index token, longest first. */
const maskQuantifiers = (text: string): string => {
  let out = text;
  for (const { phrase, index } of [...UNBOUNDED_QUANTIFIERS.entries()]
    .map(([index, phrase]) => ({ index, phrase }))
    .sort((a, b) => b.phrase.length - a.phrase.length)) {
    out = out.split(phrase).join(`{q${index}}`);
  }
  return out;
};

/**
 * The token an occurrence carries when NO preceding construct resolves. NAMED
 * rather than empty on purpose: an empty anchor is the shape this mechanism
 * exists to forbid, and a named token makes a produced empty anchor VISIBLE
 * where an empty string would be silent.
 *
 * WHERE IT IS RETURNED, READ OFF THE CODE AS IT STANDS RATHER THAN OFF AN
 * OLDER DESCRIPTION OF IT. `constructAnchorFor` returns it from ONE site: the
 * fall-through below its backward scan, reached when the scan runs off the top
 * of the file having accepted no line. The SECOND return verification pass 9
 * named — a construct that DID resolve but named nothing strictly above the
 * occurrence — no longer yields this token at all. Wave 39's WR-53 extension
 * made that case CONTINUE the backward scan to the next enclosing construct,
 * so exhausting the scan is now the only route here, and a bare `/**` above an
 * occurrence resolves to the construct ABOVE IT instead of to this value.
 *
 * WHAT OBSERVES IT, AND HOW FAR THAT OBSERVATION REACHES. Two cases read this
 * value, and each reaches less than this file: `no occurrence on the SCANNED
 * SURFACE resolves to NO_PRECEDING_CONSTRUCT` bounds it over the occurrences
 * `quantifierOccurrences` finds across `SURFACE_LINES` on the scanned surface
 * and over nothing wider, and `no exemption key's ANCHOR reduces to nothing`
 * bounds it over the keys PRESENT IN `HEADER_QUANTIFIER_EXEMPTIONS` and over
 * nothing wider. A key written BY HAND and never added to that map is reached
 * by neither, and a line inside one of the three exclusions is reached by
 * neither. Until wave 40 this docblock said the shape `may not be produced
 * silently by the builder itself` while NOTHING read the value — `grep` found
 * the declaration, one docblock mention and the return, and not one `expect`
 * (CR-21, verification pass 9).
 */
const NO_PRECEDING_CONSTRUCT = "!NO-PRECEDING-CONSTRUCT!";

/**
 * WHAT REMAINS OF A TOKEN ONCE ITS MASKS AND PUNCTUATION ARE GONE. The letters
 * and digits, less the sentinel, and nothing else. A token whose remainder is
 * empty NAMES NOTHING: it is `{qN}` tokens, spaces and punctuation, and it
 * matches wherever the same masked shape occurs.
 */
const nameableRemainder = (text: string): string =>
  text
    // THE SENTINEL IS THE TOKEN THE BUILDER EMITS WHEN NOTHING WAS NAMED, SO
    // COUNTING ITS LETTERS AS NAMING SOMETHING IS THE ARITHMETIC THAT LET
    // CR-17's SHAPE BACK IN (CR-21). Removed BY REFERENCE to the constant and
    // never by re-spelling it, so renaming the constant cannot silently
    // un-fix this.
    .split(NO_PRECEDING_CONSTRUCT)
    .join("")
    .replace(/\{q\d+\}/g, "")
    .replace(/[^A-Za-z0-9]/g, "");

/**
 * The join between a key's two halves. Absent from this file's bytes apart from
 * this declaration and the keys built with it, so neither half can contain it.
 */
const EXEMPTION_ANCHOR_SEP = " §§ ";

/**
 * THE CONSTRUCT TOKEN'S TRUNCATION, NAMED ONCE AND READ BY BOTH THE BUILDER AND
 * THE CENSUS. The two used to be separate: the builder truncated inline and
 * anything else that wanted the same token had to repeat the width and the
 * ellipsis character. A census that computed the token in a slightly different
 * form would measure a DIFFERENT thing and pass having compared nothing, so the
 * form is derived from here on both sides rather than written twice.
 */
const CONSTRUCT_TOKEN_WIDTH = 64;
const CONSTRUCT_TOKEN_ELLIPSIS = "…";

/**
 * THE TOKEN ONE LINE WOULD CONTRIBUTE AS A CONSTRUCT ANCHOR, or `null` when it
 * would contribute none. `null` is the SKIP RULE, and it is the builder's rule
 * rather than a rule the census invented: a line whose masked normalized form
 * has an empty `nameableRemainder` is one the forward walk steps over, so it
 * can never BE an anchor and counting it as a producer would flag tokens no key
 * can carry.
 */
const constructTokenOf = (raw: string): string | null => {
  const token = maskQuantifiers(normalizeGateLine(raw));
  if (nameableRemainder(token).length === 0) return null;
  return token.length > CONSTRUCT_TOKEN_WIDTH
    ? `${token.slice(0, CONSTRUCT_TOKEN_WIDTH)}${CONSTRUCT_TOKEN_ELLIPSIS}`
    : token;
};

/**
 * EVERY LINE'S WOULD-BE ANCHOR TOKEN, COUNTED. Maps each token to the 1-based
 * lines that produce it. An anchor with more than one producer names NONE of
 * them, which is CR-20(b): the exemption written for the occurrence under one
 * producer is discharged just as well by an occurrence under another.
 */
const anchorTokenCensus = (
  lines: readonly string[],
): ReadonlyMap<string, readonly number[]> => {
  const out = new Map<string, number[]>();
  lines.forEach((raw, i) => {
    const token = constructTokenOf(raw);
    if (token === null) return;
    const at = out.get(token);
    if (at === undefined) out.set(token, [i + 1]);
    else at.push(i + 1);
  });
  return out;
};

/**
 * THE CONSTRUCT AN OCCURRENCE SITS UNDER, AS A TOKEN A KEY CAN CARRY.
 *
 * CR-17, 2026-08-26, wave 36. Each of the three EXCLUSIONS further down carries
 * a `proof` token pinning it to the construct it excludes, so an exclusion that
 * slides onto a different construct fails loudly. The EXEMPTION MAP one layer
 * down carried no equivalent: its keys were flat strings, not one of the three
 * discharge checks consults an occurrence's line, and so an exemption written
 * for one line was discharged just as well by an occurrence 9,001 lines away.
 * The verifier deleted the table cell one exemption was written for, planted a
 * fabricated hand-written bound outside all three exclusions, and measured the
 * suite green at 432 of 432.
 *
 * THE DERIVATION, STATED AS IT EXECUTES. Scan BACKWARD from the line STRICTLY
 * ABOVE the occurrence for the nearest preceding line one of five recognisers
 * accepts. They were chosen by reading the constructs the shipped occurrences
 * actually sit under, not guessed, and this list is the code's list: (1) a
 * declaration — `const`, `let`, `var`, `function`, `class`, `type`,
 * `interface`, `enum`, optionally behind `export`, `default` and `async`; (2) a
 * `describe` / `it` / `test` fixture title, with or without `.each`, `.skip`,
 * `.only` or `.todo`, opened by `(` or by a type argument `<`; (3) the opening
 * `/**` of a docblock; (4) the nearest non-blank, non-rule row ABOVE the rule
 * of a ruled ASCII table or banner; and (5) the opening line of a contiguous
 * `//` comment block.
 *
 * IT IS THE NEAREST PRECEDING ACCEPTED LINE, WHICH IS NOT THE SAME AS THE
 * FINEST ENCLOSING CONSTRUCT, AND THE DIFFERENCE IS MEASURED RATHER THAN
 * ESTIMATED. Recognisers (4) and (5) deliberately climb to the TOP of a prose
 * region, and in this file those regions are large: WR-49 measured four
 * occurrences taking the file's own title line as their anchor from up to 234
 * lines above them, and wave 39 re-measured the maximum after correcting the
 * scan bounds and got 234 again, at the occurrence on line 235. The word
 * `enclosing` would claim a containment this scan does not compute; what it
 * computes is proximity under those five recognisers.
 *
 * THE FORWARD WALK IS BOUNDED STRICTLY ABOVE THE OCCURRENCE, WHICH IS THE
 * CORRECTION CR-20(a) FORCED. A header that names nothing on its own line — a
 * bare `/**`, a rule of dashes — is walked FORWARD to the first line at or
 * below it that names anything, and that walk STOPS one line short of the
 * occurrence. Until wave 39 the bound was the occurrence itself, so an
 * occurrence that WAS its own header, or that was the first content line of a
 * docblock whose `/**` names nothing, resolved to a 64-character prefix of its
 * own line: an anchor that travelled with the sentence and named no site.
 * WR-53 measured that bound separately and independently.
 *
 * WHEN THE WALK NAMES NOTHING ABOVE THE OCCURRENCE THE BACKWARD SCAN CONTINUES
 * rather than returning the sentinel, so the next enclosing construct is tried.
 * Measured at wave 39 after both changes: ZERO of the 29 shipped occurrences
 * resolve to `NO_PRECEDING_CONSTRUCT`. That is a measurement of THIS surface,
 * not a property of the builder — a key WRITTEN BY HAND can still carry an
 * anchor that names nothing, and that shape is forbidden outright by a separate
 * case rather than left to this derivation.
 *
 * THE MASKING IS LOAD-BEARING HERE FOR THE SAME REASON IT IS IN THE LINE
 * ANCHOR. Several fixture titles in this file contain a declared phrasing. An
 * unmasked construct token would put one verbatim into a key, the scan would
 * find it inside the map, and the map would generate the obligations it exists
 * to discharge. `no exemption KEY carries a declared phrasing` pins that.
 */
const constructAnchorFor = (
  lines: readonly string[],
  lineNumber: number,
): string => {
  const DECLARATION =
    /^\s*(export\s+)?(default\s+)?(async\s+)?(const|let|var|function|class|type|interface|enum)\s+[A-Za-z_$]/;
  const FIXTURE_TITLE =
    /^\s*(describe|it|test)(\.each|\.skip|\.only|\.todo)?\s*[(<]/;
  const DOCBLOCK_OPEN = /^\s*\/\*\*/;
  const isRule = (raw: string): boolean => {
    const n = normalizeGateLine(raw);
    return n.length >= 4 && /^[-\s]+$/.test(n);
  };
  const isLineComment = (raw: string): boolean => /^\s*\/\//.test(raw);

  for (let i = lineNumber - 1; i >= 1; i--) {
    const raw = lines[i - 1] ?? "";
    let head = -1;
    if (isRule(raw)) {
      // The rule itself names nothing; the row ABOVE it is the header.
      for (let j = i - 1; j >= 1; j--) {
        const above = lines[j - 1] ?? "";
        if (normalizeGateLine(above).length === 0 || isRule(above)) continue;
        head = j;
        break;
      }
    } else if (
      DECLARATION.test(raw) ||
      FIXTURE_TITLE.test(raw) ||
      DOCBLOCK_OPEN.test(raw) ||
      (isLineComment(raw) && !isLineComment(lines[i - 2] ?? ""))
    ) {
      head = i;
    }
    if (head < 0) continue;
    for (let k = head; k < lineNumber; k++) {
      const token = constructTokenOf(lines[k - 1] ?? "");
      if (token !== null) return token;
    }
    // THE HEADER NAMED NOTHING STRICTLY ABOVE THE OCCURRENCE, SO THE SCAN
    // CONTINUES RATHER THAN GIVING UP. Falling out of this walk resumes the
    // backward scan one line higher, which resolves the NEXT enclosing
    // construct. Returning the sentinel here instead would hand a bare `/**`
    // an anchor that names no site at all, and CR-20(a) is the measurement
    // that the two-line docblock is exactly where that happens.
  }
  return NO_PRECEDING_CONSTRUCT;
};

/**
 * THE KEY AN EXEMPTION IS WRITTEN UNDER. The masked CONSTRUCT the occurrence
 * sits under, then the normalized line the occurrence STARTS on with the
 * phrasings masked and truncated, then the phrasing's own index.
 *
 * THE MASKING IS LOAD-BEARING, not cosmetic: an unmasked key would carry a
 * declared phrasing verbatim, the scan would find it inside this very map, and
 * the map would generate the obligations it exists to discharge. `no exemption
 * KEY carries a declared phrasing` pins that below.
 *
 * THE CONSTRUCT ANCHOR IS FOLDED INTO THE KEY RATHER THAN CHECKED BESIDE IT.
 * The three discharge checks match keys as flat strings, so a key that carries
 * its construct makes all three anchor-sensitive with NO change to their logic,
 * and the count equality still balances at exactly one entry per occurrence. A
 * fourth check reading the line separately would be a second mechanism for the
 * same fact.
 */
const exemptionKeyFor = (
  lines: readonly string[],
  lineNumber: number,
  quantifierIndex: number,
): string => {
  const masked = maskQuantifiers(
    normalizeGateLine(lines[lineNumber - 1] ?? ""),
  );
  const anchor = masked.length > 96 ? `${masked.slice(0, 96)}…` : masked;
  const construct = constructAnchorFor(lines, lineNumber);
  return `${construct}${EXEMPTION_ANCHOR_SEP}${anchor} :: q${quantifierIndex}`;
};

/**
 * THE SUPERSEDED KEY FORMAT, RETAINED AS A FIXTURE'S COUNTER-PROBE AND FOR
 * NOTHING ELSE. THIS MUST NEVER BE USED BY LIVE CODE — it is the format CR-17
 * falsified, kept here only so a fixture can demonstrate WHAT IT MISSED.
 *
 * It is `exemptionKeyFor` with the construct half removed: the masked normalized
 * line the occurrence starts on, then the phrasing's own index. Under it, an
 * occurrence relocated from one construct to another keeps the SAME key, so the
 * relocation is invisible to all three discharge checks. That is the shape the
 * verifier drove a fabricated hand-written bound through at 432 of 432 green.
 *
 * THAT STRUCTURAL SENTENCE IS AN ASSERTION RATHER THAN A DESCRIPTION SINCE WAVE
 * 40. The cross-construct fixture pins this helper's output to the LINE HALF of
 * `exemptionKeyFor`'s key — the portion after `EXEMPTION_ANCHOR_SEP` — for both
 * of its array pairs, over the fixture's SYNTHETIC inputs and no wider. Until
 * then the claim held nowhere: verification pass 9 replaced this body with
 * `return "CONSTANT";` and every one of the counter-probe's five assertions
 * still passed, at 434 of 434 green (WR-51).
 *
 * WHY THE OLD BUILDER IS KEPT RATHER THAN DESCRIBED. A fixture that shows the
 * new builder catching a relocation is equally consistent with a builder that
 * catches everything and with one that catches nothing that matters. Only
 * running the identical relocation through the OLD builder and watching it NOT
 * be caught tells those apart. Wave 34 established that probe-and-counter-probe
 * shape for measured silences; this is the same shape applied to a mechanism.
 */
const preAnchoringExemptionKeyForFixtureOnly = (
  lines: readonly string[],
  lineNumber: number,
  quantifierIndex: number,
): string => {
  const masked = maskQuantifiers(
    normalizeGateLine(lines[lineNumber - 1] ?? ""),
  );
  const anchor = masked.length > 96 ? `${masked.slice(0, 96)}…` : masked;
  return `${anchor} :: q${quantifierIndex}`;
};

/** Every occurrence of a declared phrasing in the joined form of a line set. */
const quantifierOccurrences = (
  lines: readonly string[],
  lineNumbers: readonly number[],
): readonly { line: number; endLine: number; quantifierIndex: number }[] => {
  const { text, lineAt } = joinGateLines(lines, lineNumbers);
  const found: { line: number; endLine: number; quantifierIndex: number }[] =
    [];
  UNBOUNDED_QUANTIFIERS.forEach((phrase, quantifierIndex) => {
    let from = 0;
    for (;;) {
      const at = text.indexOf(phrase, from);
      if (at < 0) break;
      found.push({
        line: lineAt[at] ?? -1,
        endLine: lineAt[at + phrase.length - 1] ?? -1,
        quantifierIndex,
      });
      from = at + phrase.length;
    }
  });
  return found.sort(
    (a, b) => a.line - b.line || a.quantifierIndex - b.quantifierIndex,
  );
};

/** The keys the surface actually produces, with duplicates ordinal-suffixed. */
const surfaceExemptionKeys = (
  lines: readonly string[],
  lineNumbers: readonly number[],
): readonly { key: string; line: number; endLine: number }[] => {
  const seen = new Map<string, number>();
  return quantifierOccurrences(lines, lineNumbers).map((o) => {
    const base = exemptionKeyFor(lines, o.line, o.quantifierIndex);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return {
      key: n === 1 ? base : `${base} #${n}`,
      line: o.line,
      endLine: o.endLine,
    };
  });
};

// ---------------------------------------------------------------------------
// THE THREE BINDINGS: REGISTRY TO CODE, TEXT TO REGISTRY, REGISTRY TO THE FILE
// ---------------------------------------------------------------------------
describe("the residual is DERIVED — the registry is bound to the walk, and the shipped text to the registry", () => {
  // The repo-root relative literal `tests/pins.spec.ts` uses for every file it
  // reads. `vitest.config.ts` declares no `projects` and no per-package root
  // (decision P2-D4) precisely so this convention holds from every spec.
  const GATE_FILE = "packages/backend/src/outbound-prohibition.spec.ts";
  const gateText = readFileSync(GATE_FILE, "utf8");
  const gateLines = gateText.split("\n");

  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  // NON-VACUITY BEFORE THE RULE. `tests/pins.spec.ts` puts this first for every
  // reader it has, and the reason is in its header: a gate that quietly read
  // nothing passes, and a passing gate that measured nothing is worse than no
  // gate because somebody is now relying on it.
  it("the gate file read is NON-EMPTY and carries BOTH sentinels — non-vacuity, asserted BEFORE the rule", () => {
    expect(
      gateText.length,
      `${GATE_FILE} read as EMPTY. Every assertion below would pass having measured nothing. Check the path — it is repo-root relative and vitest runs from the repo root.`,
    ).toBeGreaterThan(1000);
    expect(
      gateText.includes(DERIVED_BEGIN),
      `${GATE_FILE} no longer contains the BEGIN sentinel. The generated residual block was removed or its marker was edited; restore the marker and regenerate the span with deriveResidual(RESOLVER_REGISTRY).`,
    ).toBe(true);
    expect(
      gateText.includes(DERIVED_END),
      `${GATE_FILE} no longer contains the END sentinel. Restore it; extractDerivedBlock cannot bound the span without it.`,
    ).toBe(true);
  });

  // THE REGISTRY IS NOT ALLOWED TO BE EMPTY EITHER. A registry that lost its rows
  // would leave every parameterised case below enumerating nothing and passing.
  it("the registry is NON-EMPTY and every row's provenance anchor still EXISTS, AT A DECLARATION, in this file", () => {
    expect(
      RESOLVER_REGISTRY.length,
      "RESOLVER_REGISTRY is empty. Every per-row case below would enumerate nothing and the suite would pass having verified no mechanism at all.",
    ).toBeGreaterThan(0);

    // A PLAIN SUBSTRING SEARCH HERE WOULD BE VACUOUS AND IT IS WORTH SAYING WHY.
    // Each anchor occurs inside its own registry row (`site: "auditSource > …"`)
    // and again inside the generated block (`read off:  auditSource > …`), so
    // `gateText.includes(anchor)` would pass with the code site DELETED — the
    // provenance would be checking itself. The anchor must therefore occur at the
    // START of some line, which a string literal nested inside an object literal
    // and an indented `read off:` line both fail to do, and which only the
    // DECLARATION satisfies.
    const declarations = new Set(gateLines.map((l) => l.trimStart()));
    for (const row of RESOLVER_REGISTRY) {
      const parts = row.site.split(" > ");
      const anchor = parts[parts.length - 1] ?? row.site;
      const found = [...declarations].some((l) => l.startsWith(anchor));
      expect(
        found,
        `registry row \`${row.id}\` records its provenance as \`${row.site}\`, and no DECLARATION line in ${GATE_FILE} begins with \`${anchor}\`. Either the code site moved — update the row — or the mechanism is gone and the row is a fiction. (A match inside the registry row itself or inside the generated block does not count: see the comment above.)`,
      ).toBe(true);
    }
  });

  // EVERY RULE IDENTIFIER IS SPOKEN FOR, ASSERTED FROM `RULES`' OWN KEYS rather
  // than from a hand-copied list — a copy would drift the day a ninth surface is
  // added, which is the defect this whole file is about.
  it("every rule identifier in RULES appears in at least one registry row's expectation", () => {
    const declared = Object.keys(RULES);
    expect(
      declared.length,
      "RULES enumerates no rule identifiers. The coverage assertion below would be vacuous.",
    ).toBeGreaterThan(0);
    const covered = new Set<string>(
      RESOLVER_REGISTRY.flatMap((row) => [...row.expect, ...row.counterExpect]),
    );
    const uncovered = declared.filter((id) => !covered.has(id));
    expect(
      uncovered,
      `rule identifier(s) ${uncovered.join(", ")} appear in NO registry row. A rule with no row is a rule the derived residual says nothing about: the text would enumerate the walk's mechanisms while staying silent about a surface the gate claims to enforce. Add a row whose probe produces it.`,
    ).toEqual([]);
  });

  // THE REGISTRY IS BOUND TO THE CODE. Every row's probe and counter-probe are
  // EXECUTED. A branch removed from the walk moves its own row.
  it.each(RESOLVER_REGISTRY.map((row) => [row.id, row] as const))(
    "registry row %s — its probe AND its counter-probe are executed against auditSource",
    (_id, row) => {
      expect(
        rulesOf(row.probe),
        `registry row \`${row.id}\` says its probe reports [${row.expect.join(", ")}]. It does not. The row was read off \`${row.site}\`; either that branch changed and the row is now stale, or the row was transcribed from prose instead of from the branch.`,
      ).toEqual([...row.expect]);
      expect(
        rulesOf(row.counterProbe),
        `registry row \`${row.id}\`'s COUNTER-probe reports something other than [${row.counterExpect.join(", ")}]. A row that only records the firing direction is half a fact; this half moved.`,
      ).toEqual([...row.counterExpect]);
      // A row whose two directions agree proves nothing about the mechanism it
      // names — it would pass with the branch deleted.
      expect(
        [...row.expect].join(","),
        `registry row \`${row.id}\` has a probe and a counter-probe that answer IDENTICALLY. Such a row is vacuous: it would keep passing with the mechanism deleted. Pick a counter-probe that the mechanism answers differently.`,
      ).not.toEqual([...row.counterExpect].join(","));
    },
  );

  // ---------------------------------------------------------------------------
  // THE FOURTH BINDING: A ROW'S CLAUSE TO THE BRANCHES IT NAMES
  // ---------------------------------------------------------------------------
  // WR-32, 2026-08-24. The verifier deleted the compound-assignment assembly
  // branch — the branch `assembledNames`' clause names when it says `a compound
  // assignment` — and the whole derived block stayed at 52 passed, 0 failed.
  // Everything below exists so that mutation turns that ROW red.

  // NON-VACUITY BEFORE THE RULE, for the same reason `tests/pins.spec.ts` puts it
  // first for every reader it has.
  it("BRANCH_VOCABULARY is NON-EMPTY, every phrase in it occurs in at least one clause, and the hit count is PINNED", () => {
    expect(
      BRANCH_VOCABULARY.length,
      "BRANCH_VOCABULARY is empty. The coverage guard below would scan for nothing and pass having matched nothing — which is the exact failure this mechanism exists to remove, reintroduced by its own guard.",
    ).toBeGreaterThan(0);

    const unused = BRANCH_VOCABULARY.filter(
      (phrase) => !RESOLVER_REGISTRY.some((row) => row.clause.includes(phrase)),
    );
    expect(
      unused,
      `BRANCH_VOCABULARY phrase(s) ${unused.map((p) => JSON.stringify(p)).join(", ")} occur in NO clause. A vocabulary written in words the clauses do not use matches nothing and passes. Spell the phrase as the clause spells it, or drop it.`,
    ).toEqual([]);

    const hits = RESOLVER_REGISTRY.flatMap((row) =>
      BRANCH_VOCABULARY.filter((phrase) => row.clause.includes(phrase)).map(
        (phrase) => `${row.id} :: ${phrase}`,
      ),
    );
    // The count this run found, pinned so a SHRINKING enumeration is visible
    // rather than silent. DO NOT relax this number to match a new run: a
    // vocabulary that used to match 59 clause-phrase pairs and now matches 1 is
    // still "non-empty" and still broken. If a clause was legitimately reworded,
    // change the number in the SAME commit as the wording and say so.
    expect(
      hits.length,
      `BRANCH_VOCABULARY matched ${hits.length} clause-phrase pairs: ${hits.join(" | ")}. A SHRINKING enumeration is the failure this pin exists to catch.`,
    ).toBe(83);
  });

  // THE COVERAGE GUARD. A clause naming a branch with no probe is a failing test.
  it("every BRANCH_VOCABULARY phrase present in a clause has a BRANCH answering it", () => {
    const missing: string[] = [];
    for (const row of RESOLVER_REGISTRY) {
      for (const phrase of BRANCH_VOCABULARY) {
        if (!row.clause.includes(phrase)) continue;
        const answered = (row.branches ?? []).some((b) => b.names === phrase);
        if (!answered) {
          missing.push(`${row.id} names ${JSON.stringify(phrase)}`);
        }
      }
    }
    expect(
      missing,
      `clause(s) name a branch that NO branch probe answers: ${missing.join(" | ")}. There are exactly two ways out and softening the clause silently is neither. EITHER write the BranchProbe — read it off the branch, run it, record what it measured — OR stop the clause naming the branch, which means correcting it to its MEASURED reach, preserving the falsified phrase with a dated marker and its finding id, and handing the widening on as a FALSIFIED_HANDOFFS entry.`,
    ).toEqual([]);
  });

  it("every branch anchor still EXISTS, AT A DECLARATION OR A BRANCH OPENING, in this file", () => {
    const branches = RESOLVER_REGISTRY.flatMap((row) =>
      (row.branches ?? []).map((b) => [row.id, b] as const),
    );
    expect(
      branches.length,
      "NO registry row carries a `branches` list. Every per-branch case below would enumerate nothing and the suite would pass having bound no clause to any branch at all.",
    ).toBeGreaterThan(0);
    // Pinned for the same reason the vocabulary hit count is: an enumeration that
    // shrinks silently is the failure, not the fix.
    expect(
      branches.length,
      `the registry carries ${branches.length} branch probes. A SHRINKING enumeration is the failure this pin exists to catch.`,
    ).toBe(100);
    expect(
      new Set(branches.map(([id]) => id)).size,
      "the number of ROWS carrying at least one branch, pinned. A row that lost its branches is invisible to a total-count check alone if another row grew one. 35 resolvers plus the one measured-silence row whose clause names a branch of constStrings.",
    ).toBe(36);

    // A PLAIN SUBSTRING SEARCH HERE WOULD BE VACUOUS, AND THIS TASK ADDED A THIRD
    // SURFACE THAT WOULD SATISFY ONE. The anchor text occurs (1) inside the
    // BranchProbe literal itself, (2) inside the generated block's `read off:`
    // line where a row's `site` shares the same convention, and now (3) inside
    // the generated block's `branch:` line that renders this very anchor. So
    // `gateText.includes(anchor)` would pass with the branch DELETED — the
    // provenance would be checking itself, three times over. The anchor must
    // therefore occur at the START of a trimmed line, which a string nested in an
    // object literal and an indented `read off:` / `branch:` line all fail to do,
    // and which only the DECLARATION or the branch's own opening satisfies.
    const declarations = new Set(gateLines.map((l) => l.trimStart()));
    for (const [id, b] of branches) {
      const parts = b.anchor.split(" > ");
      const anchor = parts[parts.length - 1] ?? b.anchor;
      const found = [...declarations].some((l) => l.startsWith(anchor));
      expect(
        found,
        `row \`${id}\`'s branch for ${JSON.stringify(b.names)} records its site as \`${b.anchor}\`, and no line in ${GATE_FILE} begins with \`${anchor}\`. Either the branch moved — update the anchor — or the branch is GONE and the clause is now naming something the code does not have. (A match inside the BranchProbe literal, inside the \`read off:\` line or inside the rendered \`branch:\` line does not count: see the comment above.)`,
      ).toBe(true);
    }
  });

  // EVERY NAMED BRANCH IS EXECUTED. This is the case the verifier's mutation
  // turns red, and it names the ROW when it does.
  it.each(
    RESOLVER_REGISTRY.flatMap((row) =>
      (row.branches ?? []).map(
        (b) => [`${row.id} / ${b.names} / ${b.anchor}`, row, b] as const,
      ),
    ),
  )(
    "branch %s — its probe is executed against auditSource",
    (_label, row, b) => {
      expect(
        rulesOf(b.probe),
        `registry row \`${row.id}\`'s clause names ${JSON.stringify(b.names)} and says the branch at \`${b.anchor}\` reports [${b.expect.join(", ")}]. It does not. Either that branch was DELETED — in which case the clause is now naming a branch the code does not have — or it changed and this probe is stale. The row's own probe can stay green through this: that is precisely why this case exists.`,
      ).toEqual([...b.expect]);
      // The row-level vacuity rule, one level down. A branch answering exactly what
      // the row's COUNTER-probe answers proves nothing about the branch it names —
      // it would keep passing with that branch deleted.
      expect(
        [...b.expect].join(","),
        `row \`${row.id}\`'s branch for ${JSON.stringify(b.names)} answers IDENTICALLY to the row's counter-probe. Such a branch is vacuous: it would keep passing with the branch deleted. Pick a probe the branch answers differently.`,
      ).not.toEqual([...row.counterExpect].join(","));
    },
  );

  // EVERY RESOLVER ROW CARRIES AT LEAST ONE BRANCH — AND WHY MEASURED SILENCES ARE
  // TREATED DIFFERENTLY, STATED RATHER THAN LEFT TO BE INFERRED FROM WHICH ROWS
  // HAPPEN TO HAVE ONE. A RESOLVER is a mechanism with a code site: it has
  // branches by definition, and a resolver row with none is a clause bound to
  // nothing. A MEASURED SILENCE is the ABSENCE of a mechanism — there is no branch
  // to probe, because the finding IS that no branch fires. Where a silence row
  // does carry a branch it names the site the silence is measured AT, not a branch
  // that fires; `silence-destructured-plain-literal-key` is the one such row, and
  // it carries one because its clause names a branch of `constStrings`.
  it("every RESOLVER row carries at least one branch", () => {
    const resolvers = RESOLVER_REGISTRY.filter((r) => r.kind === "resolver");
    expect(
      resolvers.length,
      "the registry enumerates NO resolvers. The rule below would range over nothing and pass.",
    ).toBeGreaterThan(0);
    const bare = resolvers
      .filter((r) => (r.branches ?? []).length === 0)
      .map((r) => r.id);
    expect(
      bare,
      `resolver row(s) ${bare.join(", ")} carry NO branches. A resolver is a mechanism with a code site, so its clause names at least one branch and that branch needs an executed probe. A resolver row with an empty \`branches\` list is a clause bound to nothing — which is exactly the state WR-32 found the whole registry in.`,
    ).toEqual([]);
  });

  // THE DIRECTION THE VOCABULARY GUARD CANNOT REACH: CODE WIDENED, PHRASE NEVER
  // RE-ADDED. See FALSIFIED_HANDOFFS' docblock.
  it("FALSIFIED_HANDOFFS is well-formed and its count is PINNED — expected to FALL to zero", () => {
    // NO NON-VACUITY ASSERTION HERE, AND THAT IS DELIBERATE. Every other
    // enumeration in this file asserts non-empty before its rule, because an empty
    // enumeration passes having checked nothing. This one is the exception: it is
    // pinned by EQUALITY and its correct final value is ZERO. Asserting
    // `toBeGreaterThan(0)` would mean wave 32, on discharging the last handoff,
    // had to DELETE an assertion installed here — and an assertion a later wave is
    // required to delete is worse than none.
    expect(
      FALSIFIED_HANDOFFS.length,
      `FALSIFIED_HANDOFFS carries ${FALSIFIED_HANDOFFS.length} entries and the pin says ZERO. Each discharging wave DELETED its entries and updated this pin IN THE SAME COMMIT AS ITS CODE. A count that moved without a widening beside it is the failure. WAVE 30 DISCHARGED ITS TWO ON 2026-08-24 (CR-13): 6 became 4, in the same commit as operatorLiteralBinding. WAVE 31 DISCHARGED ITS TWO ON 2026-08-24 (CR-12): 4 became 2, in the same commit as ASSIGNING_OPERATORS - and the third entry naming wave 31, isFetchExpression, was MEASURED to be CR-11's shape rather than CR-12's and had its owner corrected instead of being discharged. THE LAST TWO WERE DISCHARGED ON 2026-08-24 (CR-11): 2 became 0, in the same commit as operatorOperandMatching and bareFetchCallee, with one of the two ROWS removed outright because its silence stopped existing. ZERO IS THE DESIGNED END STATE. A NON-ZERO count now means a LATER wave added a handoff — which is legitimate, and then this pin changes in the same commit as that entry and the clause it corrects.`,
    ).toBe(0);
    for (const h of FALSIFIED_HANDOFFS) {
      expect(
        RESOLVER_REGISTRY.some((r) => r.id === h.row),
        `FALSIFIED_HANDOFFS names row \`${h.row}\`, which is not in the registry.`,
      ).toBe(true);
      // The preserved phrase must still be readable in the corrected clause, with
      // its dated marker — a handoff whose phrase was quietly dropped from the
      // clause erases the record of what was believed.
      const row = RESOLVER_REGISTRY.find((r) => r.id === h.row);
      expect(
        row?.clause.includes(h.phrase),
        `row \`${h.row}\`'s clause no longer preserves the falsified phrase ${JSON.stringify(h.phrase)}. Softening a clause without preserving what it used to say erases the record of what was believed — keep the phrase with its dated FALSIFIED marker until ${h.finding} is discharged.`,
      ).toBe(true);
      expect(
        row?.clause.includes(`FALSIFIED 2026-08-24 (${h.finding})`),
        `row \`${h.row}\`'s clause preserves the phrase but carries no dated FALSIFIED marker naming ${h.finding}.`,
      ).toBe(true);
    }
  });

  it.each(
    FALSIFIED_HANDOFFS.map(
      (h) => [`${h.row} / ${h.finding} / wave ${h.wave}`, h] as const,
    ),
  )(
    "handoff %s — the falsified phrase is STILL false, measured against the code as it stands",
    (_label, h) => {
      expect(
        rulesOf(h.probe),
        `handoff \`${h.row}\` (${h.finding}) records that the phrase ${JSON.stringify(h.phrase)} is FALSE of this probe, and that the probe answers [${h.openAnswer.join(", ")}] while the handoff is OPEN. It no longer does. If wave ${h.wave} widened the code, that is the widening working — now RE-ADD the phrase to row \`${h.row}\`'s clause WITH its branch probe, and DELETE this handoff entry and its pin, in this same commit. This case exists because the vocabulary guard cannot see a widening that never re-adds its phrase.`,
      ).toEqual([...h.openAnswer]);
    },
  );

  // ---------------------------------------------------------------------------
  // A UNIVERSAL IN A DECLARED PHRASING NAMES WHAT BOUNDS IT
  // ---------------------------------------------------------------------------
  it("UNBOUNDED_QUANTIFIERS is NON-EMPTY, its scan finds a non-empty hit set, and the hit count is PINNED", () => {
    expect(
      UNBOUNDED_QUANTIFIERS.length,
      "UNBOUNDED_QUANTIFIERS is empty. The guard below would scan for nothing and pass having found no universal at all — a guard that enumerates zero is the failure this file exists to remove.",
    ).toBeGreaterThan(0);
    const hits = RESOLVER_REGISTRY.flatMap((row) =>
      UNBOUNDED_QUANTIFIERS.filter((q) => row.clause.includes(q)).map(
        (q) => `${row.id} :: ${q}`,
      ),
    );
    expect(
      hits.length,
      "the quantifier scan matched NOTHING. Either every universal was rewritten out of every clause — possible, and then this pin changes in the same commit — or the phrasings stopped matching, which is the same silent break the vocabulary pin catches.",
    ).toBeGreaterThan(0);
    expect(
      hits.length,
      `the quantifier scan matched ${hits.length} clause-phrase pairs: ${hits.join(" | ")}. A SHRINKING enumeration is the failure this pin exists to catch.`,
    ).toBe(10);
  });

  // THE LIST IS CHECKED AGAINST THE UNIVERSALS THIS ROUND FALSIFIED, BY RUNNING
  // THE SCAN. A quantifier list that misses the universals which produced this
  // round's blockers is a list that will miss round 7's.
  //
  // IT WAS THREE ROWS AND IT IS NOW THREE ROWS AND ONE ABSENCE, 2026-08-24
  // (CR-11). `silence-operator-around-global-receiver` carried the third
  // universal — `silent in every spelling` — and that ROW WAS REMOVED when its
  // silence stopped existing. Dropping it from this list silently would leave the
  // guard weaker by exactly one row with nothing recording why, so its absence is
  // asserted HERE, with the reason, beside the two that survive. `isFetchExpression`
  // is added in the same edit: it carries the round's fourth universal, its
  // widening is what removed the third row's subject, and a list that tracked the
  // rows this round STARTED with rather than the ones it ENDED with is a list
  // already going stale.
  it("the quantifier scan catches the universals this round falsified — and records the ROW that stopped existing", () => {
    const hit = (id: string): boolean => {
      const row = RESOLVER_REGISTRY.find((r) => r.id === id);
      return UNBOUNDED_QUANTIFIERS.some(
        (q) => row?.clause.includes(q) === true,
      );
    };
    for (const id of ["constStrings", "literalsOf", "isFetchExpression"]) {
      expect(
        hit(id),
        `row \`${id}\` carried one of the universals round 6 falsified and the quantifier scan does NOT hit it. The list has stopped matching the shapes it was written for.`,
      ).toBe(true);
    }
    expect(
      RESOLVER_REGISTRY.some(
        (r) => r.id === "silence-operator-around-global-receiver",
      ),
      "row `silence-operator-around-global-receiver` is BACK in the registry. It was removed on 2026-08-24 (CR-11) because the silence it measured stopped existing — every spelling it named now reports through `operatorOperandMatching`. If an operator around a global receiver has gone silent again, that is a REGRESSION in the descent and not a row to restore; if a NEW and genuinely different silence was found, give it its own id and its own measured probe.",
    ).toBe(false);
  });

  // -------------------------------------------------------------------------
  // THE GATE FILE'S OWN BYTES: NO BOUND OUTSIDE THE GENERATED SPAN
  // -------------------------------------------------------------------------
  // Anchored, never line-numbered. An exclusion pinned to a literal line number
  // silently slides the first time anything above it grows.
  const lineOf = (predicate: (l: string) => boolean, from = 0): number => {
    for (let i = from; i < gateLines.length; i++) {
      if (predicate(gateLines[i])) return i + 1;
    }
    return -1;
  };
  // WR-48, 2026-08-26, wave 37. THIS MATCHED THE EXACT LINE `"]);"`, WHICH IS
  // NOT THE FORM A FROZEN ARRAY LITERAL NECESSARILY CLOSES WITH.
  // `RESOLVER_REGISTRY` closes with `] as readonly ResolverRecord[]);`, which
  // did not match, so the scan walked past its real closing line at 5767 and
  // landed 117 lines later on the close of `BRANCH_VOCABULARY` at 5884 — a
  // DIFFERENT construct. Exclusion three therefore resolved to 4135..5884 and
  // swallowed that construct's docblock and declaration, for which the
  // exclusion's own `name` and `why` were both false. Its band of 500..3000 did
  // not catch it, because 1750 lines is inside the band.
  //
  // THE ENFORCEMENT ERRED SAFE THROUGHOUT AND THAT IS WHY THIS WAS A WARNING
  // RATHER THAN A BLOCKER. Verification pass 8 planted a declared phrasing at
  // 5800, inside the swallowed lines, and the suite went RED through the
  // clause-count equality below, which covers the range at the same reach as
  // the main guard. Nothing was laundered through the defect. That is not a
  // reason to leave a false `name` and a false `why` standing on an exclusion
  // in a file whose whole discipline is that a description match what it
  // describes.
  //
  // WHAT CHANGED IS THE RECOGNISER, NOT THE SEARCH. It still returns the FIRST
  // matching line after `start`. The route was chosen over bracket-matching
  // because it can be MEASURED to leave exclusion TWO resolving to exactly the
  // pair it resolved to before, and because a depth counter over these bytes
  // would have to reason about the brackets inside the registry's own clause
  // strings.
  //
  // THE RECOGNISER'S OWN REACH, STATED RATHER THAN IMPLIED, BECAUSE STATING A
  // WIDER REACH THAN THE ONE EXECUTED IS THE DEFECT THIS WHOLE FILE IS ABOUT.
  // It matches a bare `]);` and it matches a close carrying a trailing `as`
  // assertion that contains no closing parenthesis. A frozen array closed in
  // some third form is STILL unrecognised and the scan would STILL walk past
  // it, exactly as it walked past 5767. This is a narrower recogniser than "the
  // closing line of the construct", and IN-38 named the two constraints that
  // sentence still leaves out: the match is anchored to column 0 of the RAW,
  // un-normalized line, and it requires single spaces around `as`. Concretely
  // unmatched, then: `] as readonly (string | number)[]);` — an `as` type
  // containing a `)` — and any close that is indented, or spelled `]as const);`
  // without the space. Both anchored constructs are top level and
  // prettier-formatted today, so this is a stated reach and not a live defect.
  //
  // WHAT HOLDS THESE TWO RESOLUTIONS, AND WHAT DOES NOT — CORRECTED AT WAVE 41
  // (WR-54, WR-50). THE SENTENCE THAT STOOD HERE NAMED THE `proof` TOKENS AND
  // THE BANDS AS THE PIN. MEASUREMENT REFUTES ALL THREE CANDIDATES:
  //  (1) The `proof` check asks only whether the token occurs somewhere inside
  //      the RESOLVED RANGE. That predicate is MONOTONE IN RANGE WIDTH — a wider
  //      range still contains the token — so it cannot detect an over-walk BY
  //      CONSTRUCTION, not by accident. It was green across all 1750 wrong lines
  //      of WR-48.
  //  (2) The band did not catch WR-48 either. The over-walk resolved 1750 lines
  //      and exclusion three's band is 500..3000, so 1750 sat inside it. This
  //      paragraph says so itself, eleven lines up, and then used to name that
  //      same band as the pin.
  //  (3) The clause-count equality below would NOT have caught this one, which
  //      is the correction to WR-50 rather than a restatement of it.
  //      Verification pass 9 counted all nine declared phrasings across all 117
  //      swallowed lines and got ZERO, so `inRange` and `inClauses` both stayed
  //      at 12 and neither side of the equality moved. It WOULD catch an
  //      over-walk that swallowed declared phrasings — a shape change reaching
  //      the quantifier list, say — and that is the whole of what it holds.
  // Pass 9 established this by reverting this regex to its pre-fix form and
  // watching the suite stay GREEN at 434 of 434.
  //
  // WHAT HOLDS THEM NOW is the case titled "both `closingBracketAfter`
  // resolutions land on their OWN construct's closing line", which asserts each
  // resolution EQUAL to the line its construct actually closes on — the registry
  // located by its own closing text, the quantifier list by its own live
  // entries, each locator proved to match exactly ONE line before it is used.
  // THAT REACH AND NO WIDER. It pins WHERE THE SCAN LANDS FOR THESE TWO
  // CONSTRUCTS and says nothing about any other. It does not widen what this
  // recogniser matches: a frozen array closed in some third form is STILL
  // unrecognised and the scan would STILL walk past it. What changed is that
  // for these two constructs a walk-past now turns this suite RED instead of
  // passing silently. It does not make exclusion three exact either — that
  // exclusion is still a LINE RANGE wider than the clause strings it stands
  // for, narrowed only by the equality below.
  const CLOSES_FROZEN_ARRAY = /^\]( as [^)]*)?\);$/;
  const closingBracketAfter = (start: number): number =>
    lineOf((l) => CLOSES_FROZEN_ARRAY.test(l), start);

  const EXCLUSIONS = (() => {
    const spanStart = lineOf((l) => l.startsWith("BEGIN DERIVED RESIDUAL"));
    const spanEnd = lineOf((l) => l.startsWith("END DERIVED RESIDUAL"));
    const listStart = lineOf((l) =>
      l.startsWith("export const UNBOUNDED_QUANTIFIERS"),
    );
    const registryStart = lineOf((l) =>
      l.startsWith("export const RESOLVER_REGISTRY"),
    );
    return [
      {
        name: "the machine-owned span between the sentinels",
        from: spanStart,
        to: spanEnd,
        band: [100, 1500] as const,
        // A token only the generated span carries.
        proof:
          "THE RESIDUAL OF CORE-11's OUTBOUND WALK - DERIVED, NOT AUTHORED.",
        why: "it IS the derived residual; the phrasings in it are generated from the registry and byte-compared to deriveResidual(RESOLVER_REGISTRY).",
      },
      {
        name: "the UNBOUNDED_QUANTIFIERS declaration",
        from: listStart,
        to: closingBracketAfter(listStart),
        band: [5, 40] as const,
        proof: "export const UNBOUNDED_QUANTIFIERS",
        why: "it IS the list. It carries each declared phrasing by construction, and an exemption entry for it would be a second mechanism for the same fact.",
      },
      {
        name: "the RESOLVER_REGISTRY declaration",
        from: registryStart,
        to: closingBracketAfter(registryStart),
        band: [500, 3000] as const,
        proof: 'id: "constStrings"',
        why: "its clause strings are already obligated by the quantifier scan above plus QUANTIFIED_CLAUSES. NARROWED by the clause-count equality below, because the LINE RANGE is wider than the clauses.",
      },
    ];
  })();

  const EXCLUDED_LINES = new Set<number>(
    EXCLUSIONS.flatMap((e) => {
      const out: number[] = [];
      for (let n = e.from; n <= e.to; n++) out.push(n);
      return out;
    }),
  );
  const SURFACE_LINES = gateLines
    .map((_, i) => i + 1)
    .filter((n) => !EXCLUDED_LINES.has(n));

  // NON-VACUITY BEFORE THE RULE, IN BOTH DIRECTIONS. An exclusion that quietly
  // matches nothing turns the guard green by excluding zero. One that quietly
  // matches everything turns it green by excluding the file. Both are silent
  // successes and both must fail loudly.
  it("the three quantifier-surface exclusions are ANCHOR-DERIVED, NON-EMPTY, WITHIN A PINNED BAND and POSITIVELY IDENTIFIED — asserted BEFORE the rule", () => {
    for (const e of EXCLUSIONS) {
      expect(
        e.from,
        `exclusion \`${e.name}\` did not resolve: its opening anchor was not found in ${GATE_FILE}. An exclusion that resolves to nothing excludes nothing and the rule below would then demand an exemption for a construct that is legitimately allowed to carry the phrasings. Restore the anchor or re-point this exclusion at it.`,
      ).toBeGreaterThan(0);
      expect(
        e.to,
        `exclusion \`${e.name}\` found its opening anchor at line ${e.from} but no closing anchor after it. An unbounded exclusion runs to the end of the file and would exclude everything below line ${e.from}.`,
      ).toBeGreaterThan(e.from);
      const size = e.to - e.from + 1;
      expect(
        size,
        `exclusion \`${e.name}\` resolved to ${size} lines (${e.from}..${e.to}), outside its pinned band of ${e.band[0]}..${e.band[1]}. Too few means the anchors collapsed onto each other and the exclusion now excludes almost nothing; too many means it swallowed the constructs around it. Either way the number moved for a reason and the reason belongs in this commit.`,
      ).toBeGreaterThanOrEqual(e.band[0]);
      expect(
        size,
        `exclusion \`${e.name}\` resolved to ${size} lines (${e.from}..${e.to}), above its pinned band of ${e.band[0]}..${e.band[1]}. It has grown over the constructs around it and is now hiding lines it was never meant to cover.`,
      ).toBeLessThanOrEqual(e.band[1]);
      expect(
        gateLines.slice(e.from - 1, e.to).some((l) => l.includes(e.proof)),
        `exclusion \`${e.name}\` resolved to lines ${e.from}..${e.to}, but that range does NOT contain ${JSON.stringify(e.proof)} — a token only that construct carries. The anchors matched something else. This is the direction where an exclusion silently relocates onto a different construct and keeps passing.`,
      ).toBe(true);
    }
    expect(
      SURFACE_LINES.length,
      "the scanned surface is EMPTY: the three exclusions between them cover the whole file. The rule below would pass having read nothing.",
    ).toBeGreaterThan(1000);
  });
  // CR-22, 2026-08-26, wave 42. THE INTERCHANGEABILITY RESIDUAL IS THE ANCHOR'S
  // SHADOW, AND THIS IS THE PIN OVER IT.
  //
  // WHAT WAS PUBLISHED AND WHY IT WAS THE WRONG QUANTITY. Limit (5) and the
  // `constructAnchorFor` docblock both closed on the maximum distance from a
  // shipped occurrence to its anchor. That number is correct and it has been
  // re-measured three times. It is not the residual. Distance from an
  // occurrence to its anchor is a fact about where the 29 shipped sentences
  // happen to SIT. The residual is the width of the anchor's SHADOW — the set
  // of surface lines that resolve to the SAME anchor — because any two lines in
  // one shadow produce the same construct half, so an exemption written for one
  // is discharged just as well by an occurrence at the other. Verification pass
  // 10 measured the shadow with the live builder and moved the occurrence at
  // the wrapped table cell 514 lines and then 1,129 lines, both times for a
  // byte-identical key at 439 of 439 green, with the entry's stated reason false
  // in both new homes.
  //
  // WHY THE CENSUS BELOW CANNOT REACH THIS, STATED SO THE TWO ARE NOT CONFUSED.
  // The uniqueness census asserts that an anchor IN USE has exactly ONE PRODUCER
  // LINE. The header row this shadow belongs to IS one line. A shadow is wide
  // not because two lines produce the anchor but because 574 lines FIND it, and
  // that is a different measurement needing a different case.
  //
  // WHY THE EQUALITY IS EXACT RATHER THAN AN UPPER BOUND. An upper bound hides a
  // shadow that SHRANK, and a shadow that shrank is information about this
  // file's recogniser geometry that this gate should not discard in silence; an
  // exact equality makes both directions loud.
  //
  // THIS CASE'S REACH, STATED NARROWLY AND IN ITS OWN BYTES.
  //   (1) It bounds the MAXIMUM shadow over SURFACE_LINES under the grouping
  //       named above, and nothing wider.
  //   (2) IT DOES NOT BOUND A NON-MAXIMAL SHADOW. The second-widest measured at
  //       283 surface lines at wave 42, and it may grow to 573 without this case
  //       reporting a thing.
  //   (3) IT REACHES NO LINE INSIDE THE THREE EXCLUSIONS. SURFACE_LINES is the
  //       scanned surface and the excluded spans are not in it.
  //   (4) IT DOES NOT PREVENT A RELOCATION INSIDE A SHADOW. It makes the SIZE of
  //       the region that permits one measured and drift-detectable. Pass 10's
  //       relocation was re-run at wave 42 and stayed green; see the paragraph
  //       below this case.
  //   (5) IT DOES NOT MAKE THE ANCHOR A CONTAINMENT. The anchor is still the
  //       nearest preceding line the five recognisers accept — a proximity. No
  //       syntax tree, parser, compiler API or frame identity is computed here
  //       or anywhere in wave 42's diff.
  //
  // AND WHY ONLY THE MAXIMUM IS PINNED, WHICH IS A DISCLOSURE AND NOT AN EXCUSE.
  // Pinning the whole distribution would put a number under every one of the top
  // shadows, and each of those numbers would have to move on ordinary prose
  // edits inside a region hundreds of lines wide. A pin that must be re-derived
  // on routine edits is a pin nobody trusts and everybody re-derives without
  // reading. So the maximum is pinned here and the distribution is recorded as
  // evidence in `01-42-SUMMARY.md` instead.
  //
  // MEASURED AT WAVE 42 with the shipped builder from inside this describe over
  // all 8,846 surface lines. The widest shadow is the header row at `:417`,
  // `SPELLING (operator, by POSITION) RESOLVED BY REPORTS`, reached by
  // recogniser (4). It claims raw lines 419..1574 — 1,156 raw lines — of which
  // exactly the 582 lines the machine-owned span covers (its BEGIN sentinel to
  // its END sentinel) are removed by exclusion one, leaving 1156 - 582 = 574
  // surface lines. EVERY surface line in that range resolves to it, because
  // between the rule at `:418` and the imports no line at all is accepted by any
  // of the five recognisers. It already holds FOUR shipped occurrences.
  const WIDEST_ANCHOR_SHADOW = 574;

  it("the WIDEST ANCHOR SHADOW over the scanned surface is PINNED — an anchor's shadow is the set of lines interchangeable under it, so the shadow's width IS the residual and the occurrence-to-anchor distance is not", () => {
    // EXHAUSTIVE BY CONSTRUCTION. Every element of SURFACE_LINES is read. There
    // is no sampling, no early exit and no break: a maximum computed over part
    // of the surface would state a reach it did not execute, which is the defect
    // this whole file is organised against.
    const shadows = new Map<string, number[]>();
    for (const n of SURFACE_LINES) {
      const token = constructAnchorFor(gateLines, n);
      const at = shadows.get(token);
      if (at === undefined) shadows.set(token, [n]);
      else at.push(n);
    }

    // NON-VACUITY BEFORE THE RULE, ON FOUR COUNTS, EACH WITH ITS OWN MESSAGE.
    expect(
      SURFACE_LINES.length,
      "the scanned surface is too small for this measurement to mean anything: the shadow grouping below would run over a handful of lines and its maximum would be a number about nothing. Check the three exclusions before touching the pin.",
    ).toBeGreaterThan(1000);
    expect(
      shadows.size,
      "the shadow map is EMPTY: no surface line resolved to any anchor at all. The rule below would then take a maximum over nothing and pass having measured nothing.",
    ).toBeGreaterThan(0);
    expect(
      shadows.size,
      `every surface line resolved to a SINGLE anchor (${shadows.size} distinct), so the maximum below is just the surface size and this case would pass having measured a COLLAPSE rather than a shadow. Something has stopped the recognisers accepting lines they used to accept.`,
    ).toBeGreaterThan(1);

    let widest = "";
    let widestSize = 0;
    for (const [token, ns] of shadows) {
      if (ns.length > widestSize) {
        widest = token;
        widestSize = ns.length;
      }
    }
    expect(
      widestSize,
      "the widest shadow measured ZERO lines, which cannot happen while the map is non-empty. The grouping above is broken, not the pin.",
    ).toBeGreaterThan(0);

    // THE RULE.
    const ns = shadows.get(widest) ?? [];
    const lo = ns[0] ?? -1;
    const hi = ns[ns.length - 1] ?? -1;
    expect(
      widestSize,
      `THE WIDEST ANCHOR SHADOW IS NOW ${widestSize} SURFACE LINES AND THIS GATE PINS IT AT ${WIDEST_ANCHOR_SHADOW}. The anchor that owns it is ${JSON.stringify(widest)}, spanning raw lines ${lo}..${hi}. A SHADOW THAT GREW IS A RESIDUAL THAT GREW: every one of those ${widestSize} lines now produces the same construct half, so an exemption written for any one of them is discharged just as well by an occurrence at any other, and the reach this file publishes for its anchoring is that wide. THE CORRECT RESPONSES ARE (a) re-site or rewrite whatever widened it, or (b) re-derive this pin ONLY against growth attributed LINE BY LINE to lines the same commit added, with the diff shown. Moving the pin to fit a number it cannot account for is decoration that reports green, and it is the exact defect this file has spent eleven waves removing. If the number FELL, that is equally reportable: the equality is exact so that a shadow which shrank is visible too, and the reason belongs in the commit that shrank it.`,
    ).toBe(WIDEST_ANCHOR_SHADOW);
  });
  // WHAT THE PIN ABOVE DOES NOT DO, EXECUTED AT WAVE 42 RATHER THAN ARGUED.
  // Verification pass 10 relocated the shipped occurrence in the wrapped table
  // cell twice and got 439 of 439 green both times (`01-VERIFICATION.md`,
  // `### CR-20 is NOT CLOSED / CR-22`). BOTH WERE RE-RUN IN THIS SESSION AGAINST
  // THE PIN ABOVE, and the two answers are different for a reason worth writing
  // down rather than averaging.
  //
  //   (A) PASS 10's 514-LINE MOVE, out of the table to the paragraph closing
  //       `against a walk that shrinks` — still inside this anchor's shadow,
  //       with a `//` line above it so recogniser (5) does not accept it.
  //       RESULT: 440 of 440 GREEN, the pin included. The key is byte-identical
  //       and the entry's stated reason is false where the sentence now sits.
  //       THIS IS THE HONEST STATEMENT OF WHAT THE PIN DOES NOT DO: it does not
  //       prevent, detect or report a relocation inside a shadow. It makes the
  //       SIZE of the region that permits one measured and drift-detectable, and
  //       that is the whole of its contribution.
  //
  //   (B) PASS 10's ~1,130-LINE MOVE, to the top level above the imports.
  //       RESULT: the pin reported — but it reported a SHRINK, 574 -> 567, and
  //       NOT a relocation. THE MECHANISM, BECAUSE A REPORT NOBODY CAN EXPLAIN
  //       IS WORTH NOTHING: that destination puts the cell under a BLANK line,
  //       which makes it the OPENING line of a contiguous `//` block, which
  //       recogniser (5) accepts. Its own token is null — its whole normalized
  //       content masks to one quantifier token — so the forward walk steps over
  //       it and lands on the import line below, and the seven surface lines
  //       under that import left this anchor's shadow. The pin saw the shadow
  //       SPLIT. It did not see the sentence move. A destination that splits
  //       nothing, which is what (A) is, reports nothing at all.
  //       ALL 439 PRE-EXISTING CASES STAYED GREEN under (B), exactly as pass 10
  //       recorded; the only case that spoke was the one above.
  //
  // SO, STATED SO THAT READING ONLY THIS PARAGRAPH CANNOT MISLEAD: THE
  // RELOCATION CLASS IS NOT CLOSED. An occurrence inside this shadow can still
  // be moved to another line inside it, keep a byte-identical key, keep an
  // exemption reason that is false of its new home, and take the whole suite
  // green with it — (A) is that, executed, at wave 42, at 440 of 440. The
  // anchor is still a proximity and not a containment, criterion (3)'s mechanism
  // leg is not discharged by this case, and CORE-11 is not closed by it. What
  // changed at wave 42 is only this: the WIDTH of the region inside which that
  // move is invisible is now a measured number the suite defends, instead of a
  // published figure five times too small.

  // WR-54, 2026-08-26, wave 41. THE WIDTH ITSELF, PINNED. Everything above this
  // point checks that each exclusion resolves to SOMETHING, that the something
  // is inside a coarse band, and that the range still contains a token its
  // construct carries. Verification pass 9 showed that set is not enough: it
  // reverted `CLOSES_FROZEN_ARRAY` to its pre-fix form, re-introducing WR-48's
  // exact 117-line over-walk, and the suite stayed GREEN at 434 of 434. The two
  // resolutions are asserted DIRECTLY here, each against the line its own
  // construct actually closes on.
  //
  // NOT A SIZE PIN, DELIBERATELY. The verifier offered pinning the size as an
  // alternative. A size pin goes green again the day a construct legitimately
  // grows, and a width that moved with nothing noticing is the defect being
  // closed — so the endpoint is pinned to a LOCATED LINE instead, which stays
  // true as the file grows and fails the moment the resolution lands elsewhere.
  // The bands are left exactly as they are: coarse sanity checks, not the pin.
  it("both `closingBracketAfter` resolutions land on their OWN construct's closing line — the WIDTH is pinned, not merely banded", () => {
    const listStart = lineOf((l) =>
      l.startsWith("export const UNBOUNDED_QUANTIFIERS"),
    );
    const registryStart = lineOf((l) =>
      l.startsWith("export const RESOLVER_REGISTRY"),
    );

    // NON-VACUITY BEFORE THE RULE. A locator matching ZERO lines makes `lineOf`
    // answer -1, and a pin that compares -1 with -1 PASSES HAVING COMPARED
    // NOTHING — the silent success this whole file is organised against. A
    // locator matching MORE than one line pins to whichever line came first,
    // which is the same green wearing a different defect.
    const REGISTRY_CLOSE = "] as readonly ResolverRecord[]);";
    const registryCloseHits = gateLines.filter(
      (l) => l === REGISTRY_CLOSE,
    ).length;
    expect(
      registryCloseHits,
      `the locator ${JSON.stringify(REGISTRY_CLOSE)} matches ${registryCloseHits} line(s) of ${GATE_FILE}, not exactly one. At ZERO the pin below would compare -1 against -1 and pass having compared nothing; ABOVE ONE it would pin to whichever line came first. Re-point the locator at the registry's real closing line — do not delete the pin.`,
    ).toBe(1);
    const registryClose = lineOf((l) => l === REGISTRY_CLOSE);

    // The quantifier list closes with a BARE `]);`, which is not unique in this
    // file, so it cannot be located by its own closing text the way the registry
    // can. It is located by its own LIVE CONTENTS instead: each entry of
    // UNBOUNDED_QUANTIFIERS occupies exactly one line, and the list closes on
    // the line after the last of them. The literals are rebuilt with
    // JSON.stringify AT RUNTIME so that no declared phrasing is written into
    // this file's scanned surface by the pin that measures it.
    const entryLines = UNBOUNDED_QUANTIFIERS.map((phrase, index) => {
      const literal = `${JSON.stringify(phrase)},`;
      const hits = gateLines.filter((l) => l.trim() === literal).length;
      expect(
        hits,
        `the locator for UNBOUNDED_QUANTIFIERS entry ${index} matches ${hits} line(s) of ${GATE_FILE}, not exactly one. At ZERO the closing line below is derived from a -1 and the pin passes having compared nothing; ABOVE ONE it is derived from whichever line came first. The list must ship one entry per line, unindented duplicates included, for this pin to mean anything.`,
      ).toBe(1);
      return lineOf((l) => l.trim() === literal);
    });
    const listLastEntry = Math.max(...entryLines);
    const listClose = listLastEntry + 1;

    // THE PIN, FOR EXCLUSION THREE. This is the one that was unheld.
    const registryResolved = closingBracketAfter(registryStart);
    expect(
      registryResolved,
      `\`closingBracketAfter(registryStart)\` resolved to line ${registryResolved}, but RESOLVER_REGISTRY's own closing line is ${registryClose} — a gap of ${registryResolved - registryClose} line(s). The scan walked PAST the construct this exclusion is named for and stopped on a different one, so exclusion three's \`name\` and \`why\` are false of the lines it removes from the scanned surface. THIS IS WR-48 EXACTLY: before the recogniser was corrected the scan landed 117 lines late, on the close of a different frozen array. Correct CLOSES_FROZEN_ARRAY so it recognises this construct's closing form. Do NOT widen the band, do NOT change the \`proof\` token, and do NOT adjust this pin — a pin moved to fit the number it exists to catch is decoration that reports green.`,
    ).toBe(registryClose);
    expect(
      EXCLUSIONS[2].to,
      `exclusion three's realized \`to\` is ${EXCLUSIONS[2].to} while RESOLVER_REGISTRY closes at ${registryClose}. The assertion above pins the helper; this one pins the value the exclusion actually carries, because the exclusion — not the helper — is what removes lines from the scanned surface.`,
    ).toBe(registryClose);
    expect(
      EXCLUSIONS[2].from,
      `exclusion three's realized \`from\` is ${EXCLUSIONS[2].from} while RESOLVER_REGISTRY opens at ${registryStart}. Both endpoints are pinned because a width is two numbers, and pinning only the end leaves the other half free to move.`,
    ).toBe(registryStart);

    // THE SAME PIN FOR EXCLUSION TWO. The recogniser serves both, and correcting
    // one construct while leaving the other unpinned is the identical defect one
    // construct over. This resolution did NOT move across WR-48's correction —
    // measured then and re-measured here — which is why it is pinned rather than
    // assumed.
    const listResolved = closingBracketAfter(listStart);
    expect(
      listResolved,
      `\`closingBracketAfter(listStart)\` resolved to line ${listResolved}, but UNBOUNDED_QUANTIFIERS' last entry sits at line ${listLastEntry}, so the list closes at ${listClose} — a gap of ${listResolved - listClose} line(s). Either the scan walked past this list's closing line onto another construct's, or the list stopped shipping one entry per line. Correct whichever it is; do not widen the band and do not adjust this pin.`,
    ).toBe(listClose);
    expect(
      EXCLUSIONS[1].to,
      `exclusion two's realized \`to\` is ${EXCLUSIONS[1].to} while UNBOUNDED_QUANTIFIERS closes at ${listClose}. Same reason as exclusion three: the exclusion's own value is what shapes the scanned surface.`,
    ).toBe(listClose);
    expect(
      EXCLUSIONS[1].from,
      `exclusion two's realized \`from\` is ${EXCLUSIONS[1].from} while UNBOUNDED_QUANTIFIERS opens at ${listStart}.`,
    ).toBe(listStart);
  });

  // EXCLUSION THREE, NARROWED. Excluding the registry's whole LINE RANGE is
  // wider than excluding its clause strings: a docblock written between two rows
  // would also be swallowed. Rather than leave that as a disclosed coarseness,
  // the two counts are pinned against each other. Measured at wave 33: 12 inside
  // the line range and 12 inside the live clause strings. A phrasing written
  // into a between-rows comment makes those two numbers differ.
  //
  // RE-MEASURED AT WAVE 37 AGAINST THE CORRECTED RANGE (WR-48), because
  // narrowing the range changes both what this counts and what it means. The
  // range went from 4135..5884 to 4135..5767 and the pair held at 12 and 12
  // across the change. THE PIN WAS NOT WIDENED TO ACCOMMODATE THE NARROWING;
  // the two numbers agreed on their own, and had they disagreed the failure
  // message below states what to do instead, which is to move or delete the
  // offending sentence.
  it("exclusion three carries ONLY clause strings — the registry line range and the live clauses agree, occurrence for occurrence", () => {
    const registry = EXCLUSIONS[2];
    const registryLines: number[] = [];
    for (let n = registry.from; n <= registry.to; n++) registryLines.push(n);
    const inRange = quantifierOccurrences(gateLines, registryLines).length;
    let inClauses = 0;
    for (const row of RESOLVER_REGISTRY) {
      for (const phrase of UNBOUNDED_QUANTIFIERS) {
        let from = 0;
        for (;;) {
          const at = row.clause.indexOf(phrase, from);
          if (at < 0) break;
          inClauses++;
          from = at + phrase.length;
        }
      }
    }
    expect(
      inClauses,
      "the live clause strings carry NO declared phrasing at all. Either every clause was rewritten in one commit — possible, and then this case changes with it — or the phrasings stopped matching, and exclusion three is now excluding a range for a reason that no longer holds.",
    ).toBeGreaterThan(0);
    expect(
      inRange,
      `the registry's line range (${registry.from}..${registry.to}) carries ${inRange} declared-phrasing occurrences while its live \`clause\` strings carry ${inClauses}. The difference is ${inRange - inClauses} occurrence(s) sitting in the range but NOT in any clause — a docblock between two rows, or a comment inside one. Exclusion three is a LINE RANGE and would swallow it silently. Move the sentence out of the registry's range, or delete the phrasing from it; do not widen this pin.`,
    ).toBe(inClauses);
  });

  // THE RULE. Every declared phrasing in this file's own bytes, outside the
  // three exclusions above, is either GONE or carries a named, reasoned entry a
  // reviewer can execute and disagree with.
  it("the gate file's own bytes carry NO declared phrasing outside the three exclusions except by NAMED exemption", () => {
    const found = surfaceExemptionKeys(gateLines, SURFACE_LINES);
    const declared = Object.keys(HEADER_QUANTIFIER_EXEMPTIONS);
    const declaredSet = new Set(declared);

    expect(
      declared.length,
      "HEADER_QUANTIFIER_EXEMPTIONS is EMPTY. That is a legitimate END STATE — it means every declared phrasing outside the three exclusions was deleted — but it is reached by deleting sentences, not by emptying this map. If the surface really is clear, this expectation changes in the same commit as the last deletion.",
    ).toBeGreaterThan(0);

    // THE MASKING IS LOAD-BEARING. An unmasked key would carry a phrasing
    // verbatim, the scan would find it inside this map, and the map would
    // generate the obligations it exists to discharge.
    for (const key of declared) {
      for (const phrase of UNBOUNDED_QUANTIFIERS) {
        expect(
          key.includes(phrase),
          `exemption key ${JSON.stringify(key)} carries a declared phrasing verbatim. Keys are MASKED to \`{qN}\` tokens for exactly this reason: an unmasked key is itself scanned, so the map would raise an obligation for its own text and no amount of entries could ever discharge it. Rebuild the key with exemptionKeyFor().`,
        ).toBe(false);
      }
    }

    const foundKeys = found.map((f) => f.key);
    const missing = found.filter((f) => !declaredSet.has(f.key));
    expect(
      missing.map((m) => `line ${m.line}: ${m.key}`),
      missing.length === 0
        ? ""
        : `${missing.length} declared-phrasing occurrence(s) in ${GATE_FILE} sit outside all three exclusions and carry NO exemption entry:\n${missing
            .map(
              (m) =>
                `  line ${m.line}${m.endLine !== m.line ? ` (wraps to ${m.endLine})` : ""}: ${JSON.stringify(m.key)}`,
            )
            .join(
              "\n",
            )}\nYOU HAVE THREE CHOICES AND THE FIRST TWO ARE PREFERRED. (1) DELETE the sentence, if it states a bound on the walk's reach — the reach OF RECORD is the generated span between the sentinels and nothing hand-written beside it may restate it. (2) REWRITE it to say what the branch does WITHOUT the universal, naming the branches; do NOT swap the phrasing for a synonym, which turns this guard green while keeping the bound. (3) If the occurrence is not a claim about reach at all — a quotation, a test title, an assertion message complaining about the phrasing, a table label, or a QUANTIFIED_CLAUSES value stating what bounds a universal — add the key above to HEADER_QUANTIFIER_EXEMPTIONS with one clause saying WHICH of those it is. An exemption is a sentence a later author must keep true, so it is a cost; spend it deliberately.`,
    ).toEqual([]);

    const stale = declared.filter((k) => !foundKeys.includes(k));
    expect(
      stale,
      stale.length === 0
        ? ""
        : `${stale.length} HEADER_QUANTIFIER_EXEMPTIONS entr(ies) match NOTHING in ${GATE_FILE}:\n${stale.map((k) => `  ${JSON.stringify(k)}`).join("\n")}\nThe sentence each one excused was deleted or reworded. DELETE the entry in the same commit — a map that outlives its sentences is a list of claims nobody is checking, which is the artifact this mechanism replaces.`,
    ).toEqual([]);

    // The equality is MACHINE-PINNED rather than hand-counted: an exemption
    // covers exactly one occurrence, so the two totals move together or the
    // suite goes red.
    expect(
      foundKeys.length,
      `the surface carries ${foundKeys.length} declared-phrasing occurrence(s) outside the three exclusions while HEADER_QUANTIFIER_EXEMPTIONS holds ${declared.length} entr(ies). One entry excuses one occurrence; these two numbers are the same number or something is being counted twice.`,
    ).toBe(declared.length);

    // Every reason must actually say something. A blank excuse is an unnamed
    // blind spot wearing a name.
    for (const [key, reason] of Object.entries(HEADER_QUANTIFIER_EXEMPTIONS)) {
      expect(
        reason.trim().length,
        `exemption ${JSON.stringify(key)} carries an empty or near-empty reason. The entry has to say WHY the occurrence is not a claim about reach, in words a reviewer can disagree with. "it is fine" is not a reason.`,
      ).toBeGreaterThan(40);
    }
  });

  // CR-17's SECOND MECHANISM, TAKEN IN ADDITION TO THE CONSTRUCT ANCHORING AND
  // NOT INSTEAD OF IT. Two independent mechanisms fail independently; one
  // mechanism wearing two names fails once. The anchoring makes the three
  // discharge checks above construct-sensitive. THIS case forbids, outright,
  // the one key shape that names nothing at all and can therefore be satisfied
  // wherever the same masked form occurs.
  //
  // WHAT IS CHECKED IS THE ANCHOR AS A WHOLE, AND THAT IS NARROWER THAN
  // CHECKING EACH HALF. One shipped occurrence — the wrapped ASCII-table cell
  // whose entire normalized content IS a declared phrasing — has a line half
  // that legitimately reduces to nothing, and its construct half is what names
  // it. A key whose WHOLE anchor reduces to nothing names neither, and that is
  // the shape a fabricated bound was driven through at 432 of 432 green.
  it("no exemption key's ANCHOR reduces to nothing — a fully-masked anchor names no construct and no line", () => {
    for (const key of Object.keys(HEADER_QUANTIFIER_EXEMPTIONS)) {
      const anchor = key.replace(/ :: q\d+( #\d+)?$/, "");
      expect(
        nameableRemainder(anchor).length,
        `exemption key ${JSON.stringify(key)} carries an ANCHOR that reduces to NOTHING once its \`{qN}\` tokens, whitespace and punctuation are removed. An anchor made only of mask tokens names no construct and no line, so the entry is discharged by ANY occurrence whose normalized form masks to the same shape — wherever in this file that occurrence sits. That is how a fabricated hand-written bound was planted 9,001 lines from the cell its exemption was written for, with the suite reporting 432 of 432 green (CR-17, verification pass 8). Rebuild the entry with \`exemptionKeyFor\` rather than hand-writing a key; it derives the construct anchor for you. If the occurrence's own line genuinely normalizes to a bare declared phrasing, that is fine — the construct half is what names it — but if BOTH halves mask away, the line is the defect: REWRITE the sentence so it says what it is about, or DELETE it.`,
      ).toBeGreaterThan(0);
    }
  });

  // CR-21's SECOND HALF: THE VALUE NOTHING READ. At wave 40's arrival `grep`
  // found three references to `NO_PRECEDING_CONSTRUCT` — the declaration, one
  // mention inside `constructAnchorFor`'s docblock, and the single `return` —
  // and not one of them was an `expect`. A named token whose production
  // nothing checks is a comment with a type, and the docblock beside it
  // claimed the shape could not be produced silently while nothing anywhere
  // read the value (CR-21, verification pass 9). This case reads it.
  //
  // ITS REACH, STATED RATHER THAN IMPLIED, BECAUSE STATING A WIDER REACH THAN
  // THE ONE EXECUTED IS THE DEFECT THIS WHOLE FILE IS ABOUT. It bounds the
  // sentinel over the occurrences `quantifierOccurrences` finds across
  // `SURFACE_LINES` and over nothing wider. A key written by hand and never
  // produced by the surface is reached by the null-anchor case above instead;
  // a line inside one of the three exclusions is reached by neither.
  //
  // GREEN ON ARRIVAL, AND THAT IS WHY IT WAS WATCHED FAILING. Re-measured at
  // wave 40 over the scanned surface: 29 occurrences, 0 resolving to the
  // sentinel. It guards the next sentence somebody writes rather than a defect
  // standing now, so it was planted against twice before it was trusted.
  it("no occurrence on the SCANNED SURFACE resolves to NO_PRECEDING_CONSTRUCT — a sentinel anchor names no construct and no line", () => {
    const occurrences = quantifierOccurrences(gateLines, SURFACE_LINES);
    // NON-VACUITY BEFORE THE RULE. An empty occurrence set would make the
    // filter below produce nothing and this case pass having resolved not one
    // line — the failure mode this whole file is organised against.
    expect(
      occurrences.length,
      "the scanned surface carries NO declared-phrasing occurrence at all, so the rule below passed having resolved nothing. Either `SURFACE_LINES` collapsed, the three exclusions grew over the file, or the phrasing scan stopped matching. In all of those this case is a silent success and not a measurement.",
    ).toBeGreaterThan(0);
    const sentinelled = occurrences
      .filter(
        (o) => constructAnchorFor(gateLines, o.line) === NO_PRECEDING_CONSTRUCT,
      )
      .map(
        (o) =>
          `  line ${o.line}: ${JSON.stringify(
            maskQuantifiers(normalizeGateLine(gateLines[o.line - 1] ?? "")),
          )}`,
      );
    expect(
      sentinelled,
      sentinelled.length === 0
        ? ""
        : `${sentinelled.length} occurrence(s) on the scanned surface resolve to ${JSON.stringify(
            NO_PRECEDING_CONSTRUCT,
          )} — the builder found no construct above them:\n${sentinelled.join("\n")}\nAN ANCHOR THAT IS THE SENTINEL NAMES NO CONSTRUCT AND NO LINE. The exemption written for such an occurrence is discharged by ANY occurrence whose normalized form masks to the same shape, wherever in this file that occurrence sits — which is CR-17 verbatim. Verification pass 9 drove exactly that shape through twice, at 434 of 434 green each time: once with the occurrence and its matching entry planted together, and once with the same occurrence moved roughly 1,800 lines into an unrelated construct and the entry left untouched. YOU HAVE TWO CHOICES. (1) REWRITE the sentence so it says what it is about, which gives the line above it something to name. (2) RE-SITE it under a construct that names something. SOFTENING THIS ASSERTION IS NOT ONE OF THEM, and neither is exempting the occurrence nor special-casing the sentinel here: the sentinel is precisely what the builder emits when nothing was named, so an occurrence that produces it has no site an exemption could be written for.`,
    ).toEqual([]);
  });

  // CR-20(a)'s SHAPE, FORBIDDEN OUTRIGHT AND SEPARATELY FROM THE CASE ABOVE.
  // A fully-masked anchor names nothing; a SELF-ANCHORING one names something
  // and still names no SITE, because both halves were copied off the SAME
  // line. Two different defects, two cases, so they fail independently.
  it("no exemption key's CONSTRUCT half is a PREFIX of its LINE half — a self-anchoring key names no site", () => {
    const keys = Object.keys(HEADER_QUANTIFIER_EXEMPTIONS);
    // NON-VACUITY BEFORE THE RULE. An empty map, or a key set whose separator
    // stopped appearing, would make the loop below pass having compared
    // nothing at all.
    expect(
      keys.length,
      "HEADER_QUANTIFIER_EXEMPTIONS is EMPTY, so this case compared nothing. It is an assertion about the keys, and with no keys it is a silent success.",
    ).toBeGreaterThan(0);
    let compared = 0;
    for (const key of keys) {
      const at = key.indexOf(EXEMPTION_ANCHOR_SEP);
      expect(
        at,
        `exemption key ${JSON.stringify(key)} carries no ${JSON.stringify(EXEMPTION_ANCHOR_SEP)} separator, so it has no construct half to check. Rebuild it with \`exemptionKeyFor\`, which is the only thing that may author a key.`,
      ).toBeGreaterThan(0);
      const construct = key.slice(0, at);
      const line = key
        .slice(at + EXEMPTION_ANCHOR_SEP.length)
        .replace(/ :: q\d+( #\d+)?$/, "");
      // The two halves are truncated at DIFFERENT widths, so the comparison is
      // made against the construct token minus its trailing ellipsis. Without
      // that, a truncated construct half could never be a prefix of anything
      // and this case would be green by arithmetic rather than by measurement.
      const head = construct.endsWith("\u2026")
        ? construct.slice(0, -1)
        : construct;
      compared++;
      expect(
        line.startsWith(head),
        `exemption key ${JSON.stringify(key)} has a CONSTRUCT half that is a PREFIX of its LINE half. Both halves were read off the SAME line, so the key carries no positional information whatsoever: the entry is discharged by that masked text wherever in this file it sits, and the sentence the entry excuses can be moved into a construct its stated reason is FALSE of without any of the three discharge checks noticing. That is CR-20(a). It was measured at verification pass 9 by taking a shipped occurrence out of the docblock it belonged to and planting it 5,264 lines away inside an unrelated \`describe\`, for a byte-identical key, with the suite reporting 434 of 434 green. An occurrence sitting ON its own construct header — an \`it(\` title, or the first content line of a docblock — is the shape that produces it. Rebuild the entry with \`exemptionKeyFor\` rather than hand-writing a key. If the REBUILT key still has this shape, the defect is in \`constructAnchorFor\`'s scan bounds and not in the entry: its backward scan must open STRICTLY ABOVE the occurrence, and its forward walk must stop STRICTLY ABOVE it too, continuing the backward scan to the next enclosing construct when a header names nothing above the occurrence.`,
      ).toBe(false);
    }
    expect(
      compared,
      "the loop above compared no key, so this case is measuring nothing.",
    ).toBe(keys.length);
  });

  // CR-20(b)'s SHAPE, MADE LOUD. The anchor is a line of text and lines
  // repeat. `it.each([` was produced by TEN lines of this file and the
  // receiver-key table header by THREE, so an exemption written for the
  // occurrence under one of them was discharged just as well by an occurrence
  // under another — verification pass 9 moved a shipped table cell between two
  // identically-headed tables, 58 lines apart and about a different operator,
  // for a byte-identical key at 434 of 434 green.
  //
  // THE CENSUS IS ASSERTED FROM BOTH SIDES ON PURPOSE. The DECLARED map and
  // what the SURFACE produces are the same set today, and asserting only one
  // of them would let the other drift: an occurrence whose anchor is ambiguous
  // must be caught the moment it appears, BEFORE anyone writes an exemption
  // for it, and a declared entry whose anchor became ambiguous must be caught
  // even if its occurrence was deleted in the same commit.
  it("every anchor IN USE is produced by exactly ONE line of the file — an anchor with two producers names neither", () => {
    const census = anchorTokenCensus(gateLines);
    // NON-VACUITY BEFORE THE RULE, ON BOTH SIDES.
    expect(
      census.size,
      "the anchor census is EMPTY, so the rule below compares every anchor against nothing and passes by having counted no line at all. Either the file was read as empty or `constructTokenOf` stopped returning tokens.",
    ).toBeGreaterThan(0);
    const constructHalf = (k: string): string =>
      k.slice(0, k.indexOf(EXEMPTION_ANCHOR_SEP));
    const inUse = [
      ...new Set([
        ...Object.keys(HEADER_QUANTIFIER_EXEMPTIONS).map(constructHalf),
        ...surfaceExemptionKeys(gateLines, SURFACE_LINES).map((f) =>
          constructHalf(f.key),
        ),
      ]),
    ];
    expect(
      inUse.length,
      "no anchor is in use at all, from the declared map OR from the surface, so this case asserts uniqueness of nothing. Both sides are read here precisely so one of them going empty is loud.",
    ).toBeGreaterThan(0);

    const ambiguous = inUse
      .filter((token) => (census.get(token) ?? []).length !== 1)
      .map((token) => ({
        token,
        producers: [...(census.get(token) ?? [])],
        keys: Object.keys(HEADER_QUANTIFIER_EXEMPTIONS).filter(
          (k) => constructHalf(k) === token,
        ),
      }));
    expect(
      ambiguous.map((a) => `${a.producers.length}x ${a.token}`),
      ambiguous.length === 0
        ? ""
        : `${ambiguous.length} anchor(s) IN USE are not produced by exactly one line of ${GATE_FILE}:\n${ambiguous
            .map(
              (a) =>
                `  ${JSON.stringify(a.token)}\n    produced by ${a.producers.length} line(s): ${a.producers.join(", ")}\n    keys hanging off it:\n${a.keys.map((k) => `      ${JSON.stringify(k)}`).join("\n")}`,
            )
            .join(
              "\n",
            )}\nAN ANCHOR WITH MORE THAN ONE PRODUCER NAMES NONE OF THEM. The exemption written for the occurrence under one producer is discharged just as well by an occurrence under another, so the sentence the entry excuses can be moved between them and its stated reason can become FALSE without any of the three discharge checks noticing. That is CR-20(b). YOU HAVE THREE CHOICES. (i) DISAMBIGUATE THE HEADER IN ITS OWN BYTES — give the producing line a clause that names which table of spellings it heads or which parameter set the case runs; \`normalizeGateLine\` strips only a LEADING comment marker, and the construct token is truncated at ${CONSTRUCT_TOKEN_WIDTH} characters, so the distinguishing clause has to fall inside that width. Then regenerate every key anchored to that header with \`exemptionKeyFor\` in the same commit, carrying each reason across byte-unchanged. (ii) RE-SITE OR REWRITE THE OCCURRENCE so it sits under a construct whose header is already unique — only where the sentence still says what it is about afterwards. (iii) DELETE the occurrence, if it states a bound it should not be stating at all. A ZERO PRODUCER COUNT IS THIS SAME FAILURE FROM THE OTHER SIDE: the key was hand-written against a header that is not in the file. FORBIDDEN, ALL FOUR: widening this case to permit more than one producer; exempting a token from the census; appending an ordinal to launder the ambiguity; and folding the LINE NUMBER into the key. The last is the tempting one and it is the worst — it would make every key unique by construction, turn this case green having measured nothing, and break on every unrelated edit below it.`,
    ).toEqual([]);
  });

  // CR-17's FAILING PATH, EXECUTED — the relocation the anchoring was built for,
  // watched being caught, with the pre-anchoring builder watched MISSING the
  // identical relocation one line over.
  //
  // WHY THIS EXISTS AS A PERMANENT FIXTURE. Verification pass 8 deleted the
  // ASCII-table cell one exemption was written for, planted a fabricated
  // hand-written bound 9,001 lines away outside all three exclusions, and
  // measured 432 of 432 GREEN. Wave 36 folded a construct anchor into the key
  // so that relocation would fail. A guard against relocation that has never
  // been watched failing is the same species of unwatched assertion this file
  // has spent nine waves removing — the verifier's own words — so the mutation
  // is reproduced here over SYNTHETIC lines, in the shape the
  // `extractDerivedBlock` case below already uses for failing paths: executed
  // against a constructed array rather than by mutating the real file, so the
  // assertion is permanent and the tree stays clean.
  //
  // WHAT IT PROVES AND WHAT IT DOES NOT, restating limit (5) verbatim: TWO
  // OCCURRENCES UNDER THE SAME CONSTRUCT REMAIN INTERCHANGEABLE, separated only
  // by the positional `#N` ordinal, which is assigned by scan order rather than
  // by line. This fixture proves the CROSS-CONSTRUCT case and NOT the general
  // one. It does not close the relocation class, it does not widen limit (1)'s
  // phrase list, it does not change limit (2)'s normalization, and it reaches
  // none of the surfaces limit (3) leaves out.
  //
  // THE COVERAGE, RESTATED TO THE SPLIT IT ACTUALLY COVERS (WR-52, wave 39).
  // The sentence above used to stop at `the CROSS-CONSTRUCT case`, and that
  // overclaimed: this case ran ONE pair, whose occurrence line is deliberately
  // not its own construct header, and that excluded exactly the shape CR-20(a)
  // broke. RE-MEASURED THIS WAVE over the scanned surface: 29 shipped
  // occurrences, of which 26 do NOT sit on their own construct header and 3 do
  // — one the first content line of a docblock, two `it(` title lines. The
  // FIRST array pair below covers the 26. The SECOND pair, added this wave,
  // covers the 3, in both of their shapes.
  //
  // WHAT WAS WRONG WAS THE COVERAGE CLAIM AND NOT THE FIXTURE, and that is a
  // measured distinction rather than a charitable reading. The reviewer's
  // stronger reading of WR-52 was that the probe side would be green with
  // `constructAnchorFor` reduced to a masked normalized copy of the
  // occurrence's own line. Verification pass 9 applied exactly that reduction
  // to the real file and ran this case by name: it FAILED, with `the anchored
  // key did NOT change when the occurrence moved from one construct to
  // another`. The probe side catches a line-copying anchor. So this is a
  // WIDENING of a real fixture, not the rebuild of a vacuous one.
  //
  // EVERY SYNTHETIC PHRASING IS TAKEN FROM `UNBOUNDED_QUANTIFIERS` BY INDEX AND
  // NEVER SPELLED. This file's guard scans its own bytes, so a fixture that
  // wrote the phrasing out would raise the very obligation it exists to test.
  it("a CROSS-CONSTRUCT relocation yields a DIFFERENT anchored key and was INVISIBLE to the pre-anchoring one — the SAME-construct case is not covered here", () => {
    // Index 2 is the phrasing the verifier's own mutation used. Interpolated,
    // never written out, for the reason stated above.
    const phrasing = UNBOUNDED_QUANTIFIERS[2] ?? "";
    expect(
      phrasing.length,
      "UNBOUNDED_QUANTIFIERS has no entry at index 2, so this fixture would run against an empty phrasing and pass having measured nothing. Non-vacuity before the rule.",
    ).toBeGreaterThan(0);

    // ONE occurrence line, byte-identical in both arrays. What differs between
    // them is only the CONSTRUCT it sits under: a declaration in the first, a
    // fixture title in the second. The occurrence line is deliberately neither
    // a comment nor a declaration nor a title, so it is not its own construct
    // header and the backward scan has to leave it to find one.
    const cell = `  cell: "${phrasing}",`;
    const underDeclaration: readonly string[] = [
      "const alphaTable = {",
      cell,
      "};",
    ];
    const underFixtureTitle: readonly string[] = [
      'it("the beta case", () => {',
      cell,
      "});",
    ];

    // `surfaceExemptionKeys` in miniature, parameterised by the key builder so
    // the probe and the counter-probe run the SAME computation and differ in
    // exactly one thing. The ordinal logic is reproduced because a relocation
    // that changed the ordinal rather than the key would be a different finding.
    const keysUnder = (
      builder: (
        lines: readonly string[],
        lineNumber: number,
        quantifierIndex: number,
      ) => string,
      lines: readonly string[],
    ): readonly string[] => {
      const seen = new Map<string, number>();
      return quantifierOccurrences(
        lines,
        lines.map((_, i) => i + 1),
      ).map((o) => {
        const base = builder(lines, o.line, o.quantifierIndex);
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        return n === 1 ? base : `${base} #${n}`;
      });
    };

    // The three discharge checks, verbatim in form, over synthetic input.
    const discharge = (
      declared: readonly string[],
      foundKeys: readonly string[],
    ) => {
      const declaredSet = new Set(declared);
      return {
        missing: foundKeys.filter((k) => !declaredSet.has(k)),
        stale: declared.filter((k) => !foundKeys.includes(k)),
        balances: foundKeys.length === declared.length,
      };
    };

    // NON-VACUITY BEFORE THE RULE, IN BOTH ARRAYS. A synthetic array the scan
    // finds nothing in would make every assertion below pass having read
    // nothing, which is the failure mode this whole file is organised against.
    const beforeKeys = keysUnder(exemptionKeyFor, underDeclaration);
    const afterKeys = keysUnder(exemptionKeyFor, underFixtureTitle);
    expect(
      [beforeKeys.length, afterKeys.length],
      "one of the two synthetic arrays carries no declared-phrasing occurrence at all. The interpolation or the normalization convention changed and this fixture is now measuring nothing.",
    ).toEqual([1, 1]);

    // THE PROBE. The same occurrence under two different constructs produces
    // two different anchored keys.
    const beforeKey = beforeKeys[0] ?? "";
    const afterKey = afterKeys[0] ?? "";
    expect(
      afterKey,
      `the anchored key did NOT change when the occurrence moved from one construct to another.\n  under the declaration : ${JSON.stringify(beforeKey)}\n  under the title       : ${JSON.stringify(afterKey)}\nThat is the CR-17 shape: an exemption written for one construct discharged by an occurrence sitting under a different one. \`constructAnchorFor\` has stopped resolving the enclosing construct — check its recognisers before checking anything else.`,
    ).not.toBe(beforeKey);
    // And the difference is in the CONSTRUCT half specifically, not in the line
    // half, which is byte-identical by construction.
    const constructHalf = (k: string): string =>
      k.slice(0, k.indexOf(EXEMPTION_ANCHOR_SEP));
    const lineHalf = (k: string): string =>
      k.slice(k.indexOf(EXEMPTION_ANCHOR_SEP) + EXEMPTION_ANCHOR_SEP.length);
    expect(
      lineHalf(afterKey),
      "the LINE halves of the two keys differ, so this fixture is no longer isolating the construct anchor — the occurrence line is supposed to be byte-identical in both arrays.",
    ).toBe(lineHalf(beforeKey));
    expect(
      constructHalf(afterKey),
      "the CONSTRUCT halves of the two keys are the same, so the anchor is not resolving the enclosing construct.",
    ).not.toBe(constructHalf(beforeKey));

    // THE OUTCOME, WHICH IS WHAT ACTUALLY MATTERS. A different key is only the
    // mechanism. With a map holding exactly the ORIGINAL key, the relocated
    // array must raise an unexcused occurrence AND leave the entry matching
    // nothing.
    const declared = [beforeKey];
    const relocated = discharge(declared, afterKeys);
    expect(
      relocated.missing,
      "the relocated occurrence was DISCHARGED by an exemption written for its original construct. That is CR-17 exactly.",
    ).not.toEqual([]);
    expect(
      relocated.stale,
      "the exemption written for the ORIGINAL construct still matches something after the occurrence moved away from it.",
    ).not.toEqual([]);
    // AND THE COUNT STILL BALANCES, WHICH IS THE POINT. One occurrence removed,
    // one added: the totals agree. That agreement is what let the original
    // bypass through, so it is asserted here rather than left for a later
    // reader to assume the count would have caught it.
    expect(
      relocated.balances,
      "the count equality no longer balances across the relocation, so this fixture is no longer reproducing the shape that bypassed the gate — the original bypass balanced.",
    ).toBe(true);

    // THE COUNTER-PROBE. The identical relocation under the SUPERSEDED builder,
    // asserted to be INVISIBLE. Without this half the fixture shows only that
    // the new builder catches something; with it, the fixture shows that the
    // anchoring is what makes the difference.
    const preBefore = keysUnder(
      preAnchoringExemptionKeyForFixtureOnly,
      underDeclaration,
    );
    const preAfter = keysUnder(
      preAnchoringExemptionKeyForFixtureOnly,
      underFixtureTitle,
    );
    // THE PIN TO THE LIVE BUILDER, WHICH IS THE ONE ASSERTION A CONSTANT
    // CANNOT SATISFY (WR-51, wave 40). Everything below this point is
    // satisfied by `() => "CONSTANT"` — verification pass 9 replaced the
    // helper's body with exactly that and measured 434 of 434 green — because
    // the five assertions only ask that the OLD builder produce the SAME thing
    // on both sides and match itself. They never ask that it produce what
    // `exemptionKeyFor` produces minus its construct half, which is the
    // docblock's structural claim and was asserted nowhere. Pinned here to the
    // LINE HALF of the live key, through the fixture's own `lineHalf` helper
    // rather than a re-derived split, so a change to `EXEMPTION_ANCHOR_SEP`
    // cannot leave the two computations disagreeing silently.
    for (const [which, pre, live] of [
      ["under the declaration", preBefore, beforeKey],
      ["under the title", preAfter, afterKey],
    ] as readonly (readonly [string, readonly string[], string])[]) {
      expect(
        pre[0],
        `the pre-anchoring builder (${which}) is no longer \`exemptionKeyFor\` with its construct half removed, so the counter-probe is drawing its contrast against something other than the format CR-17 was measured in. Its output must be byte-identical to the portion of the live key after ${JSON.stringify(EXEMPTION_ANCHOR_SEP)} — that identity IS the docblock's structural claim, and without it any constant function satisfies every assertion below (WR-51, measured at 434 of 434 green).`,
      ).toBe(lineHalf(live));
    }
    expect(
      preAfter,
      "the PRE-ANCHORING builder produced different keys across the relocation. It is retained precisely because it did NOT, and if it now does, this counter-probe no longer demonstrates the contrast it was written for.",
    ).toEqual(preBefore);
    const preRelocated = discharge(preBefore, preAfter);
    expect(
      preRelocated.missing,
      "the pre-anchoring builder raised an unexcused occurrence for the relocation. It did not when CR-17 was measured, and the counter-probe depends on that.",
    ).toEqual([]);
    expect(
      preRelocated.stale,
      "the pre-anchoring builder left the original entry matching nothing. It did not when CR-17 was measured.",
    ).toEqual([]);
    expect(preRelocated.balances).toBe(true);

    // ------------------------------------------------------------------
    // THE SECOND PAIR: THE OCCURRENCE THAT IS ITS OWN CONSTRUCT HEADER.
    // WR-52, 2026-08-26, wave 39. The pair above deliberately picks an
    // occurrence that is NOT its own header, and says so — which is the one
    // shape CR-20(a) broke. Three of the 29 shipped occurrences are of this
    // shape, re-measured this wave, and for them the anchor used to be a
    // 64-character prefix of the occurrence's own line: it travelled WITH the
    // sentence, so relocation was invisible. Added HERE rather than as a new
    // case because it is the same claim about the same builder over a second
    // input, and the counter-probe below has to run against both.
    // ------------------------------------------------------------------
    const ownHeaderPairs = (
      occurrence: string,
    ): { readonly a: readonly string[]; readonly b: readonly string[] } => ({
      a: ['describe("alpha", () => {', occurrence, "});", "});"],
      b: ['describe("beta", () => {', occurrence, "});", "});"],
    });

    // SHAPE ONE: the occurrence IS an `it(` title line.
    const titleLine = `  it("the case, ${phrasing}", () => {`;
    // SHAPE TWO: the occurrence is the FIRST CONTENT LINE of a docblock, whose
    // opening `/**` names nothing at all, so the forward walk used to land on
    // the occurrence itself.
    const docFirstLine = `   * The note, ${phrasing}.`;
    const docBlock = (owner: string): readonly string[] => [
      owner,
      "  /**",
      docFirstLine,
      "   */",
      "  const documented = 1;",
      "});",
    ];

    for (const [shape, before, after] of [
      [
        "an `it(` TITLE line",
        ownHeaderPairs(titleLine).a,
        ownHeaderPairs(titleLine).b,
      ],
      [
        "a docblock's FIRST CONTENT line",
        docBlock('describe("alpha", () => {'),
        docBlock('describe("beta", () => {'),
      ],
    ] as readonly (readonly [string, readonly string[], readonly string[]])[]) {
      const bKeys = keysUnder(exemptionKeyFor, before);
      const aKeys = keysUnder(exemptionKeyFor, after);
      // NON-VACUITY BEFORE THE RULE, for this pair too.
      expect(
        [bKeys.length, aKeys.length],
        `the own-header pair for ${shape} carries no declared-phrasing occurrence in one of its two synthetic arrays, so every assertion about it below would pass having read nothing.`,
      ).toEqual([1, 1]);
      const bKey = bKeys[0] ?? "";
      const aKey = aKeys[0] ?? "";
      expect(
        aKey,
        `an occurrence sitting ON its own construct header (${shape}) kept the SAME anchored key when its enclosing construct changed. It anchored to ITSELF, so the anchor travels with the sentence and the relocation is invisible to all three discharge checks — CR-20(a), which verification pass 9 executed on the real tree at 434 of 434 green. \`constructAnchorFor\`'s backward scan must open STRICTLY ABOVE the occurrence and its forward walk must stop STRICTLY ABOVE it.`,
      ).not.toBe(bKey);
      expect(
        lineHalf(aKey),
        `the LINE halves differ for ${shape}, so this pair is no longer isolating the construct anchor — the occurrence line is byte-identical in both arrays by construction.`,
      ).toBe(lineHalf(bKey));
      expect(
        constructHalf(aKey),
        `the CONSTRUCT halves are the same for ${shape}, so the anchor is not resolving the ENCLOSING construct for an occurrence that is its own header.`,
      ).not.toBe(constructHalf(bKey));
      // AND THE SELF-ANCHORING SHAPE ITSELF, FORBIDDEN OVER SYNTHETIC LINES —
      // the same predicate the permanent case applies to the shipped map.
      for (const [which, k] of [
        ["before", bKey],
        ["after", aKey],
      ] as readonly (readonly [string, string])[]) {
        const head = constructHalf(k).endsWith(CONSTRUCT_TOKEN_ELLIPSIS)
          ? constructHalf(k).slice(0, -1)
          : constructHalf(k);
        expect(
          lineHalf(k).startsWith(head),
          `the ${which} key for ${shape} has a construct half that is a PREFIX of its line half: both halves were read off the occurrence's OWN line, so the key names no site.`,
        ).toBe(false);
      }
      const own = discharge([bKey], aKeys);
      expect(
        own.missing,
        `the relocated own-header occurrence (${shape}) was DISCHARGED by an exemption written for its original construct.`,
      ).not.toEqual([]);
      expect(
        own.stale,
        `the exemption written for the ORIGINAL construct still matches something after the own-header occurrence (${shape}) moved away from it.`,
      ).not.toEqual([]);
      expect(
        own.balances,
        `the count equality no longer balances across the own-header relocation (${shape}), so this pair is not reproducing the shape that bypassed the gate — the original bypass balanced.`,
      ).toBe(true);
      // THE COUNTER-PROBE, FOR THE SECOND PAIR TOO. Without it this pair shows
      // only that the new builder catches something.
      const preB = keysUnder(preAnchoringExemptionKeyForFixtureOnly, before);
      const preA = keysUnder(preAnchoringExemptionKeyForFixtureOnly, after);
      // THE PIN, HELD OVER THIS PAIR TOO (WR-51, wave 40). The contrast has to
      // be drawn against the live builder in BOTH shapes the fixture covers,
      // not only in the first.
      for (const [which, pre, live] of [
        ["before", preB, bKey],
        ["after", preA, aKey],
      ] as readonly (readonly [string, readonly string[], string])[]) {
        expect(
          pre[0],
          `the pre-anchoring builder (${which}, ${shape}) is no longer \`exemptionKeyFor\` with its construct half removed, so this pair's counter-probe is contrasting against something other than the format CR-17 was measured in.`,
        ).toBe(lineHalf(live));
      }
      expect(
        preA,
        `the PRE-ANCHORING builder produced different keys across the own-header relocation (${shape}). It is retained precisely because it did NOT.`,
      ).toEqual(preB);
      const preOwn = discharge(preB, preA);
      expect(
        [preOwn.missing, preOwn.stale, preOwn.balances],
        `the pre-anchoring builder caught the own-header relocation (${shape}). It did not when CR-20 was measured, and the contrast depends on that.`,
      ).toEqual([[], [], true]);
    }
  });

  // CR-20(b)'s FAILING PATH, OVER SYNTHETIC LINES. The census case above is
  // green today, and a census that has only ever seen unique tokens is
  // consistent with a census that cannot count. This is the other half: two
  // constructs with a BYTE-IDENTICAL header, one occurrence under each, and
  // the census asserted to report that anchor as having TWO producers.
  //
  // WHY IT IS A PAIR RATHER THAN ONE ASSERTION. The two occurrences sharing an
  // anchor is the DEFECT; the census reporting two producers is the DETECTION.
  // Asserting only the first would describe CR-20(b) without showing anything
  // catches it, and asserting only the second would count lines without
  // showing what the count is about.
  //
  // THE PHRASING IS TAKEN FROM `UNBOUNDED_QUANTIFIERS` BY INDEX AND NEVER
  // SPELLED, for the same reason the case above gives.
  it("TWO identically-headed constructs share ONE anchor, and the census reports that anchor as having TWO producers", () => {
    const phrasing = UNBOUNDED_QUANTIFIERS[2] ?? "";
    expect(
      phrasing.length,
      "UNBOUNDED_QUANTIFIERS has no entry at index 2, so this fixture would run against an empty phrasing and pass having measured nothing. Non-vacuity before the rule.",
    ).toBeGreaterThan(0);

    // Two constructs, byte-identical headers, the same occurrence line under
    // each. This is the shipped shape verification pass 9 exploited: it moved a
    // table cell out of one identically-headed table and into another, 57 lines
    // away and about a different operator, for a byte-identical key.
    const header = 'describe("the same header, twice", () => {';
    const cell = `  cell: "${phrasing}",`;
    const twice: readonly string[] = [header, cell, "});", header, cell, "});"];

    const occurrences = quantifierOccurrences(
      twice,
      twice.map((_, i) => i + 1),
    );
    expect(
      occurrences.map((o) => o.line),
      "the synthetic array does not carry exactly two declared-phrasing occurrences, one under each header, so this fixture is measuring something other than the shape it was written for.",
    ).toEqual([2, 5]);

    // THE DEFECT. Two occurrences under two DIFFERENT constructs, and one
    // anchor between them.
    const anchors = occurrences.map((o) => constructAnchorFor(twice, o.line));
    expect(
      anchors[1],
      "the two identically-headed constructs resolved to DIFFERENT anchors, so this fixture no longer reproduces the ambiguous-token shape and the detection asserted below is being demonstrated against nothing.",
    ).toBe(anchors[0]);

    // THE DETECTION. The census names both producing lines, which is what makes
    // the ambiguity LOUD instead of silent.
    const census = anchorTokenCensus(twice);
    expect(
      [...(census.get(anchors[0] ?? "") ?? [])],
      `the census did not report the shared anchor ${JSON.stringify(anchors[0])} as having TWO producers. An anchor with more than one producer names none of them, and a census that cannot count that is consistent with every anchor in this file being ambiguous and the case above being green anyway.`,
    ).toEqual([1, 4]);
  });

  it("every clause carrying a DECLARED quantifier phrasing names a MEASURED bound", () => {
    const unbounded: string[] = [];
    for (const row of RESOLVER_REGISTRY) {
      for (const q of UNBOUNDED_QUANTIFIERS) {
        if (!row.clause.includes(q)) continue;
        if (QUANTIFIED_CLAUSES[row.id] === undefined) {
          unbounded.push(`${row.id} asserts ${JSON.stringify(q)}`);
        }
      }
    }
    expect(
      unbounded,
      `clause(s) assert a universal with NO named bound: ${unbounded.join(" | ")}. There are two ways out. STATE THE BOUND — add a QUANTIFIED_CLAUSES entry saying what MEASURABLY limits it, in a sentence a reviewer can execute and disagree with. Or REWRITE THE CLAUSE so it does not assert a universal. A universal nobody can disagree with is an unnamed blind spot wearing a quantifier, and this round exists because two of them shipped green.`,
    ).toEqual([]);
    // Every entry carries a bound of a minimum length, exactly as the exemption
    // reasons are checked — a one-word bound is an unexplained exemption.
    for (const [id, bound] of Object.entries(QUANTIFIED_CLAUSES)) {
      expect(
        bound.trim().length,
        `QUANTIFIED_CLAUSES entry \`${id}\` carries no real bound. A bound that cannot be executed is a justification, which is the thing this list exists instead of.`,
      ).toBeGreaterThan(60);
    }
  });

  // NO OWNING WAVE IS RECORDED AS PROSE INSIDE A CLAUSE. The owner is DATA; a
  // clause that also names it would leave a note to go stale in a shipped span.
  it("no corrected clause names its owning wave in prose — the owner is DATA", () => {
    const offenders = RESOLVER_REGISTRY.filter((r) =>
      /wave 3[012]\b/i.test(r.clause),
    ).map((r) => r.id);
    expect(
      offenders,
      `clause(s) ${offenders.join(", ")} name an owning wave in PROSE. The owner belongs in FALSIFIED_HANDOFFS, where discharging the handoff and removing the note are ONE act. A wave named inside a clause is a note somebody has to remember to delete, inside a machine-owned span.`,
    ).toEqual([]);
  });

  // THE EXTRACTOR'S FAILING PATH, EXECUTED. A named error nobody has watched
  // being thrown is the same artifact as a claimed check nobody performs (WR-21).
  it("extractDerivedBlock THROWS a NAMED error when a sentinel is missing — executed against synthetic text", () => {
    const withoutEnd = ["noise", DERIVED_BEGIN, "body", "more noise"].join(
      "\n",
    );
    const withoutBegin = ["noise", "body", DERIVED_END].join("\n");
    const inverted = [DERIVED_END, "body", DERIVED_BEGIN].join("\n");

    expect(() =>
      extractDerivedBlock(withoutEnd, DERIVED_BEGIN, DERIVED_END),
    ).toThrow(SentinelMissingError);
    expect(() =>
      extractDerivedBlock(withoutEnd, DERIVED_BEGIN, DERIVED_END),
    ).toThrow(/the END sentinel is absent/);
    expect(() =>
      extractDerivedBlock(withoutBegin, DERIVED_BEGIN, DERIVED_END),
    ).toThrow(/the BEGIN sentinel is absent/);
    expect(() =>
      extractDerivedBlock(inverted, DERIVED_BEGIN, DERIVED_END),
    ).toThrow(/the END sentinel precedes the BEGIN sentinel/);

    // And it does NOT answer "" for a vanished block, which is the whole point.
    expect(
      extractDerivedBlock(
        [DERIVED_BEGIN, "a", "b", DERIVED_END].join("\n"),
        DERIVED_BEGIN,
        DERIVED_END,
      ),
    ).toBe("a\nb");
  });

  // ---------------------------------------------------------------------------
  // THE THIRD BINDING: THE REGISTRY TO THE FILE'S OWN POPULATIONS
  // ---------------------------------------------------------------------------
  it("BOTH resolver populations enumerate a NON-EMPTY set — non-vacuity, asserted BEFORE the rule", () => {
    const { collectors, functions } = enumerateResolverPopulations(gateText);
    expect(
      collectors.length,
      `the collector convention ${String(COLLECTOR_CONVENTION)} matched NOTHING inside auditSource. A guard that enumerates zero members passes having checked nothing, which is precisely the failure this mechanism exists to remove — reintroduced by its own guard. Either a collector was renamed out of the convention or auditSource's line span moved; fix the convention, do not delete the guard.`,
    ).toBeGreaterThan(0);
    expect(
      functions.length,
      `the function convention ${String(FUNCTION_CONVENTION)} matched NOTHING in either scope. Same failure, same instruction: fix the convention rather than the assertion.`,
    ).toBeGreaterThan(0);
    // The counts this run found, pinned so a SHRINKING enumeration is visible
    // rather than silent. A guard that used to see 47 members and now sees 3 is
    // still "non-empty" and still broken.
    expect(collectors.length).toBe(11);
    expect(functions.length).toBe(42);
  });

  it("every member of BOTH populations is a registry row OR a named, reasoned exemption", () => {
    const { collectors, functions } = enumerateResolverPopulations(gateText);
    const registered = new Set(RESOLVER_REGISTRY.map((r) => r.id));
    const exempt = new Set(Object.keys(RESOLVER_EXEMPTIONS));

    const unaccounted = [...collectors, ...functions].filter(
      (name) => !registered.has(name) && !exempt.has(name),
    );
    expect(
      unaccounted,
      `resolver-shaped declaration(s) ${unaccounted.join(", ")} are NEITHER a RESOLVER_REGISTRY row NOR an entry on RESOLVER_EXEMPTIONS. Either add a registry row — with a probe and a counter-probe you have RUN — or add an exemption naming it with one clause saying why it is not a resolver. Silently absent is the one option this guard removes.`,
    ).toEqual([]);
  });

  it("the exemption list is NON-EMPTY and every entry carries a reason", () => {
    const entries = Object.entries(RESOLVER_EXEMPTIONS);
    expect(
      entries.length,
      "RESOLVER_EXEMPTIONS is empty. In a file this size that means the enumeration stopped matching the things that need excusing — an empty list is a broken guard, not a clean one.",
    ).toBeGreaterThan(0);
    for (const [name, reason] of entries) {
      expect(
        reason.trim().length,
        `exemption \`${name}\` carries no reason. An unexplained exemption is an unnamed blind spot wearing a name.`,
      ).toBeGreaterThan(20);
    }
  });

  it("the shipped block carries exactly ONE entry per registry row — a truncated block FAILS", () => {
    const shipped = extractDerivedBlock(gateText, DERIVED_BEGIN, DERIVED_END);
    const entries = shipped
      .split("\n")
      .filter((l) => l.startsWith(ENTRY_MARK)).length;
    expect(
      entries,
      `the block shipped in ${GATE_FILE} carries ${entries} entries and the registry has ${RESOLVER_REGISTRY.length}. A block that was truncated, or pasted as a prefix, would otherwise pass every byte comparison it happens to still match. Regenerate the whole span.`,
    ).toBe(RESOLVER_REGISTRY.length);
  });

  // ---------------------------------------------------------------------------
  // THE SECOND SHIPPING SURFACE: THE LEDGER CORE-11's COMPLETION IS READ AGAINST
  // ---------------------------------------------------------------------------
  // The `include` globs in `vitest.config.ts` already cover this file
  // (`packages/*/src/**/*.spec.ts`), so no new include is needed for the check
  // below. CONFIRMED by reading that config rather than assumed: the third glob
  // is `scripts/ci/**/*.spec.ts` and the second is the one that matches here.
  const LEDGER = ".planning/REQUIREMENTS.md";

  /**
   * THE EXPECTED STATE OF CORE-11's CHECKBOX, AS A VALUE THE SUITE CAN SEE.
   *
   * WR-34, 2026-08-24, AND IT IS THE SMALLEST FINDING IN ITS REPORT SITTING
   * CLOSEST TO THE WOUND. The one case in this repository named for CORE-11's box
   * matched it with a regex whose checkbox position was the CHARACTER CLASS
   * `[<space>x]` — accepting a space OR an `x` — and then asserted a ROW COUNT. It would have stayed green
   * through the exact flip that has been reverted twice, at `e7cc4b6` and at
   * `faca607`. A test titled for an enforcement its body does not perform is this
   * phase's own recurring defect, and it had installed itself in the case named
   * for the box those two reverts are about.
   *
   * THE AUTOMATED VERIFY COMMAND IN EVERY PLAN THAT TOUCHES THIS LEDGER GREPS THE
   * SAME TWO-STATE CHARACTER CLASS — STATE-AGNOSTIC ON PURPOSE, in waves 19, 27, 28,
   * 29, 30, 31 and 32 alike, because `[ ]` is a legitimate outcome of a discharge
   * and a verify demanding `[x]` would be PRESSURE ON the discharge rather than a
   * check OF it. That grep asserts the entry is present and well formed. THIS
   * constant asserts WHICH STATE it is in. The two are complementary and neither
   * replaces the other.
   */
  const CORE11_BOX_EXPECTED = "- [ ] **CORE-11**";

  it("the planning ledger read is NON-EMPTY and carries BOTH sentinels — non-vacuity, asserted BEFORE the rule", () => {
    const text = readPlanningLedger(LEDGER);
    expect(
      text.length,
      `${LEDGER} read as EMPTY. The comparison below would pass having measured nothing.`,
    ).toBeGreaterThan(1000);
    expect(
      text.includes(DERIVED_BEGIN),
      `${LEDGER} no longer contains the BEGIN sentinel inside CORE-11's entry. The machine-owned span was removed; restore the marker and regenerate.`,
    ).toBe(true);
    expect(
      text.includes(DERIVED_END),
      `${LEDGER} no longer contains the END sentinel.`,
    ).toBe(true);
  });

  it("readPlanningLedger THROWS a NAMED error when the planning ledger is ABSENT — executed against a path that does not exist", () => {
    const missing = ".planning/__this-file-does-not-exist__.md";
    expect(existsSync(missing)).toBe(false);
    expect(() => readPlanningLedger(missing)).toThrow(
      PlanningLedgerAbsentError,
    );
    expect(() => readPlanningLedger(missing)).toThrow(
      /does not exist on this tree/,
    );
    // And it is DISTINGUISHABLE from the missing-sentinel error, which is the
    // whole reason it exists rather than an opaque ENOENT.
    expect(() => readPlanningLedger(missing)).not.toThrow(SentinelMissingError);
  });

  it("the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte", () => {
    const shipped = extractDerivedBlock(
      readPlanningLedger(LEDGER),
      DERIVED_BEGIN,
      DERIVED_END,
    );
    const generated = deriveResidual(RESOLVER_REGISTRY);
    expect(
      shipped,
      `the derived residual block in ${LEDGER} DIVERGED from deriveResidual(RESOLVER_REGISTRY).\n\nThe GENERATED text is authoritative and the shipped text is the defect. Replace the span between the sentinels with exactly this:\n\n----- BEGIN EXPECTED -----\n${generated}\n----- END EXPECTED -----\n`,
    ).toBe(generated);
  });

  it("the ledger's block carries exactly ONE entry per registry row — a truncated ledger block FAILS", () => {
    const shipped = extractDerivedBlock(
      readPlanningLedger(LEDGER),
      DERIVED_BEGIN,
      DERIVED_END,
    );
    const entries = shipped
      .split("\n")
      .filter((l) => l.startsWith(ENTRY_MARK)).length;
    expect(
      entries,
      `${LEDGER} carries ${entries} entries and the registry has ${RESOLVER_REGISTRY.length}. Regenerate the whole span.`,
    ).toBe(RESOLVER_REGISTRY.length);
  });

  it("CORE-11's entry is present and well-formed, and ITS BOX IS THE STATE `CORE11_BOX_EXPECTED` PINS", () => {
    const text = readPlanningLedger(LEDGER);
    const rows = text
      .split("\n")
      .filter((l) => /^- \[[ x]\] \*\*CORE-11\*\*/.test(l));
    // RETAINED, not replaced. The row-count assertion is what makes the state
    // assertion below meaningful: a state check against zero rows, or against the
    // first of two, would pass having measured the wrong thing.
    expect(
      rows.length,
      `${LEDGER} should carry exactly one CORE-11 checkbox row; it carries ${rows.length}.`,
    ).toBe(1);
    const row = rows[0] ?? "";
    expect(
      row.startsWith(CORE11_BOX_EXPECTED),
      `CORE-11's checkbox in ${LEDGER} is not the state this suite pins.\n  PINNED  : ${CORE11_BOX_EXPECTED}\n  SHIPPED : ${row.slice(0, 24)}\n\nThis box has been flipped early and REVERTED TWICE — at \`e7cc4b6\` after gap-closure round 3 and at \`faca607\` after round 4 — and until 2026-08-24 the one case named for it could not see it: its regex was the character class \`[ x]\`, which matches BOTH states, so it stayed green through both flips and both reverts.\n\nTHE TERMINAL CONDITION WAS RE-SCOPED BY THE OPERATOR ON 2026-08-25 (plan 01-35, wave 35) AND WHAT FOLLOWS IS THE CURRENT ONE. The superseded condition is NOT restated beside it, because two terminal conditions standing side by side is the exact contradiction the third criterion forbids. \`CORE11_BOX_EXPECTED\` changes in the SAME COMMIT as the ledger row, and only after a discharge in which EACH of three criteria was verified BY EXECUTION in that session: (1) DERIVED — the residual is generated from \`RESOLVER_REGISTRY\` rather than authored beside it; (2) DRIFT-DETECTABLE — a divergence between either shipped span and the generated form turns this suite red; (3) THE SOLE BOUND — the disclosure is the only bound stated on every surface a reader touches, contradicted nowhere. Editing this constant on its own is NOT a way out and never was. THIS BAR IS NARROWER THAN THE ONE IT REPLACES: it makes the gate's DESCRIPTION OF ITSELF derived, drift-detectable and singular, and it does NOT claim the walk catches everything — CR-15, CR-16 and the measured silences carried in the generated span are NAMED RESIDUALS under it, and the class stays open because the space of JavaScript spellings is open. If ANY criterion is unmet, the box stays \`[ ]\`, the blocking criterion is named in the ledger, and this constant says \`[ ]\`. \`[ ]\` IS A CORRECT OUTCOME; an unexamined \`[x]\` is not.`,
    ).toBe(true);
  });

  // THE TEXT IS BOUND TO THE REGISTRY, BY BYTES.
  it("the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY), byte for byte", () => {
    const shipped = extractDerivedBlock(gateText, DERIVED_BEGIN, DERIVED_END);
    const generated = deriveResidual(RESOLVER_REGISTRY);
    expect(
      shipped,
      `the derived residual block in ${GATE_FILE} DIVERGED from deriveResidual(RESOLVER_REGISTRY).\n\nThe GENERATED text is authoritative and the shipped text is the defect. Replace the span between the sentinels with exactly this:\n\n----- BEGIN EXPECTED -----\n${generated}\n----- END EXPECTED -----\n`,
    ).toBe(generated);
  });
});
