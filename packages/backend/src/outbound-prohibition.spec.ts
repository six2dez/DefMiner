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
//        Bindings are file-wide, not scope-aware, which over-approximates rather
//        than under-approximates: a name bound to an outbound receiver anywhere
//        in the file is treated as one everywhere in it.
//      - Receivers resolve through a declaration (`const r = sdk.requests`), an
//        object destructure (`const { requests, net } = sdk`), an assignment
//        (`r = sdk.requests`), a conditional initializer, and a computed key
//        whose value is a single-hop `const` string (`const r = "requests"`).
//      - Member names and module specifiers resolve through that same single-hop
//        `const` string map.
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
//            template, `.join("")`, an opaque call — and through EITHER a
//            declaration or an assignment (`assembledNames`);
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
//      SPELLING (in receiver-key position)      RESOLVED BY          REPORTS
//      -------------------------------------    -----------------    ---------------------
//      sdk["requests"]                          literalOf            outbound-send
//      const r = "requests"; sdk[r]             constStrings         outbound-send
//      sdk["req" + "uests"]                     isAssembledKey       outbound-unanalysable
//      const k = "req"+"uests"; sdk[k]          assembledNames       outbound-unanalysable
//        (and the let/assignment, template, .join("") and opaque-call spellings
//         of that same one-hop binding — all `assembledNames`)
//      sdk[b ? "requests" : "net"]              conditional branch   outbound-send
//                                               of receiverKind
//      sdk[(0, "requests")]                     unwrap's CommaToken  outbound-send
//                                               arm, then literalOf
//      const a="requests"; const b=a; sdk[b]    NOTHING              [] — residual (a)
//      ctx[root] where root is a PARAMETER      NOTHING              [] — residual (b)
//      cur[key] where key is a LOOP BINDING     NOTHING              [] — residual (b)
//      x[i + 1] / MIGRATIONS[len - 1]           isProvablyNumeric    [] — an index, not a name
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
//          loop binding, or a name bound in another file — is NOT reported.
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
//      (c) `navigator` reached through more than one hop, or returned by a
//          helper, is outside the beacon rule for the same reason as (a).
//    NOT RESIDUAL, AND THE DISTINCTION IS DELIBERATE: a provably numeric key is
//    an INDEX rather than a hidden name, and is EXCLUDED by `isProvablyNumeric`
//    before any of the above runs. That is a different kind of quiet.
//    That is the honest bound, and `pnpm check:bundle` plus the mutation runs
//    recorded in `01-12-SUMMARY.md`, `01-16-SUMMARY.md`, `01-18-SUMMARY.md` and
//    `01-19-SUMMARY.md` are what stand behind it.
//
//    ================= THE FINAL RESIDUAL, AFTER PLAN 01-19 =================
//    Derived from the code above and copied WORD FOR WORD into
//    `.planning/REQUIREMENTS.md`'s CORE-11 correction, `.planning/STATE.md`'s
//    P9-D3 amendment and `.planning/WINDOWS.md`. If those four ever disagree,
//    the code wins and the prose is the defect.
//
//    CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS
//    IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as
//    one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, provided each
//    link's DECLARATION appears after the declaration of the name it is grown
//    from. The MECHANISM is why, and it is stated here rather than only its
//    consequence, because a consequence on its own is what the last four rounds
//    each paraphrased wrongly: `auditSource` runs `collect(sf)` to COMPLETION
//    and only then runs `visit(sf)`, and every alias set is grown by consulting
//    the LIVE set during that one collect pass. So `const a = globalThis;
//    const b = a; const g = b; g.fetch(u)` reports, the `sdk.requests` twin
//    reports, and a four-hop chain reports with the USE written ABOVE all four
//    declarations — the use site's POSITION IS IRRELEVANT. What is silent is an
//    INVERTED BINDING: `const b = a; const a = fetch; b(u)` reports nothing,
//    because `a` is not yet in the set when `b`'s declaration is read, and it
//    stays silent wherever the read is placed. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in
//    every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is
//    silent. Outside those, four things are beyond the walk: a value crossing a
//    FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER
//    FILE. And one thing is ASSUMED rather than proven: a member or method call
//    named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a
//    NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed
//    because narrowing it was MEASURED to change nothing except to re-poison
//    ordinary `+` indexing. Every exemption here is preserved BY MEASUREMENT,
//    re-run after each widening in plan 01-19: 23 files over both
//    `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and
//    `ctx[root]`, `observations.ts`'s `segments[i]` and
//    `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name.
//
//    CORE-11 IS NOW MARKED COMPLETE IN `REQUIREMENTS.md`, and the difference
//    from the `[x]` that commit `e7cc4b6` reverted is the reason it may be:
//    every surface the requirement's own first sentence enumerates now has a
//    fixture that has been OBSERVED FAILING. `const e = eval; e(s)` (WR-23) and
//    `const g = globalThis; g.fetch(u)` (IN-20) — the two shapes that were
//    silent when plan 01-18 deliberately left the box open — both report. The
//    discharge table, one row per enumerated surface with its rule identifier,
//    its fixture and the plan that watched that fixture fail, is in
//    `01-19-SUMMARY.md`.
//    ========================================================================
// 3. THE FILE WALK below duplicates `store/sql-discipline.spec.ts`'s private walk
//    by about fifteen lines, and the wrapper-unwrapping helper duplicates the one
//    `store/error-redaction.spec.ts` needs — both DELIBERATELY. Exporting one
//    gate's internals into another means one gate's refactor can silently change
//    the other's scope; the named non-vacuity assertion is the real protection
//    against a walk that shrinks.

import { readdirSync, readFileSync } from "node:fs";
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

/** A named outbound receiver, a receiver the walk cannot read, or neither. */
type ReceiverKind = string | typeof UNREADABLE_RECEIVER | undefined;

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
 * ONE HOP AND NO MORE: `const a = globalThis; const g = a; g.fetch(u)` is
 * silent, and that is residual (a).
 */
function isGlobalReceiverIn(
  node: ts.Expression,
  aliases: ReadonlySet<string>,
): boolean {
  const inner = unwrap(node);
  if (!ts.isIdentifier(inner)) return false;
  return GLOBAL_RECEIVERS.has(inner.text) || aliases.has(inner.text);
}

/** The property name a binding element takes FROM the object being destructured. */
function boundPropertyName(el: ts.BindingElement): string | undefined {
  const property = el.propertyName ?? el.name;
  return ts.isIdentifier(property) || ts.isStringLiteralLike(property)
    ? property.text
    : undefined;
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
  const constStrings = new Map<string, string>();
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
   *
   * WHAT ACTUALLY BOUNDS A KEY, CORRECTED 2026-08-24 (CR-09). The paragraph
   * that stood here bounded key resolution by where a declaration is read
   * RELATIVE TO A USE — THE READ-POSITION BOUND, whose superseded words are
   * preserved in `01-VERIFICATION.md`'s CR-09 entry and are not requoted here.
   * It was false: `collect(sf)` completes before `visit(sf)` begins, so a
   * binding anywhere in the file is seen from anywhere in the file, use sites
   * included above it. `sdk[k].send(req);\nconst k = "req"+"uests";` reports.
   * What DOES bound a key is the ONE HOP above, and the mechanism behind it is
   * the mechanism that makes keys different from aliases: this collector and
   * `constStrings` read the INITIALIZER'S SHAPE and never the live set, so a
   * key cannot be grown from a name already in the set and therefore cannot
   * chain — while every ALIAS set is grown FROM the live set and therefore
   * chains to any depth. Bindings remain file-wide, which over-approximates
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
   * ONE HOP AND NO MORE, exactly like every other set in this pass:
   * `const a = eval; const b = a; b(s)` is silent, and that is residual (a).
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
   *   1. a key that REDUCES to a literal is a NAMED receiver (`constStrings`) —
   *      first, so `const r = "requests"; sdk[r].send(req)` keeps reporting
   *      `outbound-send` and is never downgraded to unanalysable;
   *   2. a key the walk WATCHES being assembled inline is UNREADABLE
   *      (`isAssembledKey`);
   *   3. a key bound ONE HOP back to such an assembly is UNREADABLE
   *      (`assembledNames`);
   *   4. anything else — a parameter, a loop binding, a name the walk never saw
   *      bound, more than one hop — is NOT a receiver. That is residual (b), set
   *      by real-tree measurement rather than by preference.
   */
  const keyReceiver = (key: ts.Expression): ReceiverKind => {
    const literal = literalOf(key);
    if (literal !== undefined)
      return RECEIVERS.has(literal) ? literal : undefined;
    // The key will not reduce. If the walk can SEE it being assembled, it says
    // so rather than treating the result as an ordinary object; a key it merely
    // cannot follow is the disclosed one-more-hop residual, not concealment.
    if (isAssembledKey(key, numericNames, poisonedNumericNames)) {
      return UNREADABLE_RECEIVER;
    }
    // CR-08: the SAME assembly, one hop back. A name the walk watched being
    // assembled is a key it saw being hidden — binding it first hides nothing
    // more, and the member-level and global-level paths have always said so.
    const identifier = unwrap(key);
    if (ts.isIdentifier(identifier) && assembledNames.has(identifier.text)) {
      return UNREADABLE_RECEIVER;
    }
    return undefined;
  };

  /**
   * The outbound receiver an expression denotes — or the admission that the walk
   * cannot tell, which is the third state and NOT the same as "not a receiver".
   */
  const receiverKind = (node: ts.Expression): ReceiverKind => {
    const inner = unwrap(node);
    if (
      ts.isPropertyAccessExpression(inner) &&
      RECEIVERS.has(inner.name.text)
    ) {
      return inner.name.text;
    }
    if (ts.isElementAccessExpression(inner)) {
      const key = unwrap(inner.argumentExpression);
      // A CONDITIONAL KEY IS READ ON BOTH BRANCHES, with `initializerReceiver`'s
      // semantics mirrored rather than reinvented: a receiver that is outbound on
      // one path is outbound. `sdk[b ? "requests" : "net"]` HIDES NOTHING — both
      // keys are string literals naming outbound receivers — so it resolves to a
      // NAMED receiver and reports `outbound-send`. Calling it unanalysable would
      // be a second overclaim, quieter and in the opposite direction: a site the
      // walk can read COMPLETELY, reported as one it cannot read.
      if (ts.isConditionalExpression(key)) {
        const whenTrue = keyReceiver(key.whenTrue);
        const whenFalse = keyReceiver(key.whenFalse);
        if (typeof whenTrue === "string") return whenTrue;
        if (typeof whenFalse === "string") return whenFalse;
        return whenTrue === UNREADABLE_RECEIVER ||
          whenFalse === UNREADABLE_RECEIVER
          ? UNREADABLE_RECEIVER
          : undefined;
      }
      return keyReceiver(key);
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
   * The string an expression denotes: a literal, or a single-hop `const` bound to
   * one. `undefined` means THE WALK COULD NOT READ IT — never "there was nothing
   * there" — and every caller treats the two differently.
   */
  function literalOf(node: ts.Node | undefined): string | undefined {
    if (node === undefined) return undefined;
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isIdentifier(node)) return constStrings.get(node.text);
    if (ts.isExpression(node)) {
      const inner = unwrap(node);
      if (inner !== node) return literalOf(inner);
    }
    return undefined;
  }

  /** The member name a property or element access reads, if the walk can read it. */
  const memberName = (
    node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
  ): string | undefined =>
    ts.isPropertyAccessExpression(node)
      ? node.name.text
      : literalOf(node.argumentExpression);

  /**
   * The receiver an INITIALIZER denotes, including through a conditional: either
   * branch resolving to an outbound receiver makes the binding one, because a
   * receiver that is outbound on one path is outbound.
   */
  const initializerReceiver = (node: ts.Expression): ReceiverKind => {
    const inner = unwrap(node);
    if (ts.isConditionalExpression(inner)) {
      return receiverKind(inner.whenTrue) ?? receiverKind(inner.whenFalse);
    }
    return receiverKind(inner);
  };

  /** Is this expression the global fetch, in any spelling the walk resolves? */
  const isFetchExpression = (node: ts.Expression): boolean => {
    const inner = unwrap(node);
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
   * Is this expression `navigator`, in any spelling the walk resolves?
   *
   * Deliberately shaped like `isFetchExpression`: the bare identifier and its
   * one-hop aliases, or a `navigator` member of one of the four global receivers.
   * An ordinary object that defines `sendBeacon` is not one of those, which is the
   * whole reason the beacon rule is anchored here rather than on the method name.
   */
  const isNavigatorReceiver = (node: ts.Expression): boolean => {
    const inner = unwrap(node);
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
        const literal = literalOf(init);
        if (literal !== undefined && ts.isStringLiteralLike(init)) {
          constStrings.set(node.name.text, literal);
        }
        // `const k = "req" + "uests"` — the assembly the walk WATCHED. Read
        // against the numeric sets as they stand here; see `assembledNames`.
        if (isAssembledKey(init, numericNames, poisonedNumericNames)) {
          assembledNames.add(node.name.text);
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
        }
      }
    }

    // `let r; r = sdk.requests;` — the form the round-1 walk missed while
    // catching the `const` one, because it read declarations only.
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
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
      // assembly, grown from the same two shapes every other set here is grown
      // from, so it is covered by construction rather than by a second edit.
      if (isAssembledKey(node.right, numericNames, poisonedNumericNames)) {
        assembledNames.add(node.left.text);
      }
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
        for (const el of node.name.elements) {
          const property = boundPropertyName(el);
          if (property === undefined) {
            add(
              "outbound-unanalysable",
              `a destructure off a \`${kind}\` receiver whose property name this walk cannot read`,
            );
            continue;
          }
          if (kind === SEND_RECEIVER && REQUESTS_READ_ONLY.has(property)) {
            continue;
          }
          add(
            kind === NET_RECEIVER ? "outbound-net" : "outbound-send",
            `\`${property}\`, destructured from a \`${kind}\` receiver`,
          );
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
        OUTBOUND_CONSTRUCTORS.has(member) &&
        isGlobalReceiver(node.expression)
      ) {
        add(
          "outbound-global-ctor",
          `a reference to \`${member}\` on a global receiver`,
        );
      } else if (member === undefined && isGlobalReceiver(node.expression)) {
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
      if (ts.isIdentifier(callee) && fetchAliases.has(callee.text)) {
        add("outbound-fetch", `a call to \`${callee.text}(...)\``);
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
describe("the global fetch, in every reachable spelling", () => {
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

  it("outbound-unanalysable fires on an ASSEMBLED specifier", () => {
    expect(rulesOf('const m = await import("caido:" + "http");')).toContain(
      "outbound-unanalysable",
    );
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

  it.each([
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

  it('through the CONDITIONAL resolver: `sdk[b ? "requests" : "net"]` hides nothing, so it reports outbound-send', () => {
    // CR-08's sharper half, and it was undisclosed everywhere: reported by no
    // rule and named by no residual list. Both keys are string literals naming
    // outbound receivers, so this is a site the walk can read COMPLETELY.
    //
    // MECHANISM: the conditional branch of `receiverKind`, mirroring
    // `initializerReceiver`'s stated semantics — a receiver that is outbound on
    // one path is outbound. Reverting that branch drives this red.
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

  it("through globalThisAliases' TRANSITIVITY: an alias CHAIN resolves to ANY depth when each link's DECLARATION follows the declaration it is grown from — MEASURED, and not what residual (a) used to say", () => {
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
    expect(
      rulesOf("const g = a;\nconst a = globalThis;\ng.fetch(u);"),
    ).toEqual([]);
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
    ["a crypto import", 'import { createHash } from "crypto";'],
    ["a local re-export", 'export { x } from "./telemetry";'],
    ["a node:fs dynamic import", 'const m = await import("node:fs");'],
    ["a sqlite require", 'const m = require("sqlite");'],
  ])("%s reports ZERO violations", (_shape, src) => {
    expect(rulesOf(src)).toEqual([]);
  });
});
