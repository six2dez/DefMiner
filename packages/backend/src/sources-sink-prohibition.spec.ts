// packages/backend/src/sources-sink-prohibition.spec.ts — D-12's wired gate.
//
// THE RULE: no value that originated as a source map's `sources` entry may reach
// a path-like sink, from any module the plugin SHIPS under
// `packages/backend/src` or `packages/engine/src`.
//
// ===========================================================================
// THIS IS NOT A DEFENCE. IT IS A PROOF OF UNREACHABILITY, AND THE DIFFERENCE
// IS THE WHOLE POINT
// ===========================================================================
// MAP-04 asks that a `sources` entry never escape a containment root and never
// reach a path-like sink. Under D-17 the FIRST clause has no subject: the plugin
// writes nothing to disk, so there is no containment root for anything to escape
// FROM. That is a DISSOLUTION, and it is recorded here as one — in the register
// `filesystem-prohibition.spec.ts` uses at its own DEPLOY-03 expiry clause. It is
// NOT a box ticked and this file does not claim it as compliance.
//
// The SECOND clause survives, and this file makes it mechanical. The sink set
// below is real, named and frozen; what makes it currently unreachable is a
// DIFFERENT gate — the sibling `filesystem-prohibition.spec.ts` bans every
// specifier through which a filesystem could be obtained. So today this gate
// reports nothing and CANNOT report anything from the real tree, and that is
// exactly the claim: MAP-04's second clause holds by construction rather than by
// vigilance.
//
// AND IT GOES RED THE DAY A FILESYSTEM RETURNS. If D-17 is ever relaxed — a
// later phase decides the plugin must write an export to disk after all — the
// sink it forbids would exist, and the first module that hands a `sources` value
// to it fails HERE, at that plan's own verify gate. That is this repository's
// established shape: prove the branch unreachable rather than shipping a defence
// for it, and leave behind the thing that notices when it becomes reachable.
//
// ===========================================================================
// WHY THE FIXTURE CORPUS IS 23 MEASURED STRINGS AND NOT A HANDFUL OF `../`
// ===========================================================================
// The firing corpus is `SOURCES_LABEL_CASES` from
// `packages/engine/src/sourcemap/map-fixture.ts` — SPIKE-12's 22-string
// `path_resolution` corpus VERBATIM plus D-12's 4 KB label. IMPORTED, NEVER
// FORKED: there is no second traversal corpus in this repository, and a gate with
// its own private copy of the hostile strings is a gate that stops tracking them.
//
// WHAT SPIKE-12 ACTUALLY MEASURED, as facts rather than as advice:
//
//   `escapes_via_resolve: true` on FIVE of the twenty-two —
//     `relative_traversal`, `absolute_posix`, `absolute_posix_etc`, `null_byte`
//     and `trailing_dots_spaces`. `path.resolve` did not contain them; it took
//     them out.
//   `path.normalize` SILENTLY REWROTE the `unicode_rtl_override` fixture to a
//     bare `defminer-escape.txt` — it CONSUMED the RTL run and FOLLOWED the
//     climbs, so a normaliser turned a label that looks nested into an escape.
//   `trailing_dots_spaces` carried its trailing whitespace INTO the resolved
//     path rather than losing it.
//   `symlink_write_through_scratch_root: true` — the finding that broke lexical
//     containment outright. A path that is inside the root by string comparison
//     is not necessarily inside the root on disk.
//
// SO HERE THE GENERAL-PURPOSE LIBRARY IS THE HAZARD, and that is the INVERSION
// of this repository's usual don't-hand-roll advice. It is stated as an
// inversion, and it is MEASURED rather than argued: `node:path` is the thing
// this gate names as a sink, not the thing it recommends reaching for.
//
// THE ENCODINGS ARE THE POINT. A corpus of `../../etc/passwd` proves a check
// fires on the one spelling somebody thought of. The NUL byte, the RTL override,
// the FULLWIDTH FULL STOP pairs and the trailing-dots-and-spaces label are the
// spellings that defeat a naive check, so "never reaches a path-like sink" is
// asserted against those rather than against ASCII.
//
// AND THERE IS A LEGAL CONTROL, because a corpus in which every case fires
// proves only that the check fires. `src/app/index.js` — SPIKE-12 fixture 22 —
// passed to a NON-sink asserts the EMPTY set.
//
// ===========================================================================
// WHY AN AST WALK AND NOT A TEXT SCAN
// ===========================================================================
// The same argument the three sibling gates make, and it is load-bearing here
// too: this file names `sources`, `resolve`, `normalize` and `join` hundreds of
// times in prose and inside fixture string literals that are themselves whole
// modules. A substring scan would fail on its own documentation, and the only
// way to make it pass would be deleting the reasoning. The self-audit case below
// asserts the mechanical proof on this very file.
//
// ===========================================================================
// THE FAMILY, AND WHAT IS COPIED
// ===========================================================================
// The FIFTH member of the static-gate family, after `store/sql-discipline`,
// `outbound-prohibition`, `scan/httpql-discipline` and `filesystem-prohibition`:
// same walk skeleton, same POSIX source-root enumeration, same by-name
// non-vacuity block, same firing-and-legal fixture pair per rule, same pure
// `auditSource(file, source)`, same self-audit. The two derived sets are read
// out of OTHER FILES' SOURCE TEXT rather than restated here — the sink set from
// the sibling gate, the binding names from `parse.ts`'s own `RecoveredSource` —
// so a rename over there cannot silently orphan this gate.

import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";

import {
  SOURCES_LABEL_CASE_IDS,
  SOURCES_LABEL_CASES,
} from "@defminer/engine/sourcemap/map-fixture";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * THE SOURCE ROOTS THE PLUGIN SHIPS — the same two every sibling enumerates, and
 * DUPLICATED RATHER THAN IMPORTED for the mechanical reason those files give:
 * importing a symbol from a spec module EXECUTES it, registering its whole suite
 * a second time under this file's name. The duplication is held honest by the
 * agreement assertion below, which reads the parent's declaration off disk.
 */
export const SOURCE_ROOTS: readonly string[] = Object.freeze([
  "packages/backend/src",
  "packages/engine/src",
]);

const BACKEND_SRC = SOURCE_ROOTS[0];
const ENGINE_SRC = SOURCE_ROOTS[1];

/** This file, as the walk names it — the subject of the self-audit case. */
const SELF = posix.join(BACKEND_SRC, "sources-sink-prohibition.spec.ts");

/** The sibling whose declarations this gate's sink set is DERIVED from. */
const FS_GATE = posix.join(BACKEND_SRC, "filesystem-prohibition.spec.ts");

/** The parent gate, read for the source-root agreement assertion. */
const OUTBOUND_GATE = posix.join(BACKEND_SRC, "outbound-prohibition.spec.ts");

/** The module whose exported type the binding-name set is DERIVED from. */
const PARSE_MODULE = posix.join(ENGINE_SRC, "sourcemap/parse.ts");

// ---------------------------------------------------------------------------
// TWO DERIVATIONS, BOTH READ OUT OF ANOTHER FILE'S SOURCE TEXT
// ---------------------------------------------------------------------------

function parseModule(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(
    file.split("/").pop() ?? file,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
}

/**
 * The value of a `const NAME = "literal";` declaration in another file.
 *
 * BY THE TYPESCRIPT AST, not by a pattern, for the same reason the rest of this
 * file is: a text scan over a file that DOCUMENTS its own constants in prose
 * cannot tell a declaration from a mention of one.
 *
 * IT THROWS RATHER THAN DEFAULTING. A missing declaration means the derivation
 * has been orphaned, and a default would turn that into a gate that silently
 * enforces less. The throw fails collection loudly, naming the constant.
 */
function stringConstFrom(file: string, source: string, name: string): string {
  const sf = parseModule(file, source);
  let found: string | undefined;
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer !== undefined &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      found = node.initializer.text;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (found === undefined) {
    throw new Error(
      `${file} no longer declares \`${name}\` as a string constant, so ` +
        `sources-sink-prohibition.spec.ts has lost the derivation its sink set ` +
        `is built from. Restore the declaration, or restate the derivation here ` +
        `deliberately rather than letting this gate quietly enforce less.`,
    );
  }
  return found;
}

/**
 * The property names of an exported object-type alias in another file.
 *
 * Same argument as `stringConstFrom`, and the same refusal to default.
 */
function typeFieldNames(
  file: string,
  source: string,
  typeName: string,
): readonly string[] {
  const sf = parseModule(file, source);
  let found: string[] | undefined;
  const visit = (node: ts.Node): void => {
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === typeName &&
      ts.isTypeLiteralNode(node.type)
    ) {
      found = node.type.members
        .filter(ts.isPropertySignature)
        .map((member) =>
          ts.isIdentifier(member.name) ? member.name.text : undefined,
        )
        .filter((name): name is string => name !== undefined);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (found === undefined || found.length === 0) {
    throw new Error(
      `${file} no longer declares \`${typeName}\` as an object type with named ` +
        `fields, so sources-sink-prohibition.spec.ts cannot derive which bindings ` +
        `carry a \`sources\` value. This gate would otherwise enforce nothing.`,
    );
  }
  return Object.freeze([...found].sort());
}

const FS_GATE_SOURCE = readFileSync(FS_GATE, "utf8");
const PARSE_SOURCE = readFileSync(PARSE_MODULE, "utf8");

// --- the binding names ------------------------------------------------------

/**
 * The field names of `parse.ts`'s exported `RecoveredSource`, read off disk.
 *
 * `sourcesIndex`, `sourcesVerbatim` and `content` today. The list is DERIVED so
 * a rename in `parse.ts` cannot silently orphan this gate, and the assertion
 * below pins the expected members so a rename is LOUD rather than merely
 * followed — a derivation that quietly tracks whatever it finds proves nothing.
 */
export const RECOVERED_SOURCE_FIELDS: readonly string[] = typeFieldNames(
  PARSE_MODULE,
  PARSE_SOURCE,
  "RecoveredSource",
);

/**
 * The ECMA-426 member the recovered fields are recovered FROM. `parse.ts` reads
 * it as `map["sources"]`, and it is the name a shipped module would bind.
 */
const SOURCES_MEMBER = "sources";

/**
 * The bindings that CARRY a `sources` value, and the derivation is stated.
 *
 * Every `RecoveredSource` field whose name begins with `sources`, plus the map
 * member itself. `content` is DELIBERATELY EXCLUDED and the reason is not
 * convenience: `content` is the recovered FILE BODY, not the label, and MAP-04's
 * second clause is about the LABEL reaching a path-like API. Including a name
 * that generic would make this gate report on every module that has a variable
 * called `content` — which is a gate that gets deleted rather than fixed, the
 * lesson `outbound-prohibition.spec.ts` recorded from measuring exactly that.
 */
export const SOURCES_BINDING_NAMES: ReadonlySet<string> = Object.freeze(
  new Set<string>([
    SOURCES_MEMBER,
    ...RECOVERED_SOURCE_FIELDS.filter((field) =>
      field.startsWith(SOURCES_MEMBER),
    ),
  ]),
);

// --- the sink set -----------------------------------------------------------

/**
 * The Node path module's own public surface, read from the module at runtime.
 *
 * DERIVED, NEVER TYPED OUT. `Object.keys(posix)` is the package's own answer to
 * "what can be called here", so a Node release that adds a member adds it to
 * this ban with no edit — which is the difference between a sink set that tracks
 * the platform and one that tracks whoever last remembered to update it.
 * Underscore-prefixed members are dropped: `_makeLong` is private surface.
 */
const PATH_MODULE_SURFACE: readonly string[] = Object.freeze(
  Object.keys(posix)
    .filter(
      (key) =>
        !key.startsWith("_") &&
        typeof (posix as unknown as Record<string, unknown>)[key] ===
          "function",
    )
    .sort(),
);

/**
 * Two members of that surface held OUT of the sink set, on a NAME COLLISION and
 * never on the capability.
 *
 * `parse` and `format` are `node:path` functions AND the names of the two most
 * ubiquitous non-path APIs in any JavaScript codebase — `JSON.parse`,
 * `Date.parse`, `Intl.NumberFormat.prototype.format`. A rule that reported
 * `JSON.parse(sourcesVerbatim)` as a path sink would not be over-approximating
 * in the fail-closed direction; it would be MISLABELLING, and a gate that is
 * loud rather than right gets deleted rather than fixed.
 *
 * THE EXCLUSION IS ON THE NAME, NOT ON THE CAPABILITY. If a `sources` value ever
 * genuinely needs `path.parse`, the answer is the same as for every other member
 * of this set: it must not, and the call must be restructured. The assertion
 * below proves each exclusion is still IN the derived surface, so an exclusion
 * that has stopped being needed is reported as stale rather than sitting here
 * hiding the next real one.
 */
const PATH_MODULE_EXCLUSIONS: readonly string[] = Object.freeze([
  "parse",
  "format",
]);

const PATH_MODULE_SINKS: readonly string[] = Object.freeze(
  PATH_MODULE_SURFACE.filter((name) => !PATH_MODULE_EXCLUSIONS.includes(name)),
);

/**
 * The filesystem surface a `sources` value must never be handed to.
 *
 * READ AND WRITE BOTH, because the hazard SPIKE-12 measured is not "the plugin
 * overwrites a file" — it is `escapes_via_resolve` and
 * `symlink_write_through_scratch_root`, and a READ that escapes the root is the
 * same escape with a different verb. Named as a frozen list because there is no
 * runtime module to enumerate: `node:fs` cannot be imported here to ask it, for
 * the reason the sibling gate exists.
 *
 * THIS HALF OF THE SET IS UNREACHABLE BY CONSTRUCTION TODAY, and that is the
 * claim rather than an apology: `filesystem-prohibition.spec.ts` bans every
 * specifier through which any of these could be obtained, over the IDENTICAL
 * file set. The agreement assertion below reads that ban out of the sibling's
 * source text, so if it ever disappears this gate says so instead of continuing
 * to look watchful.
 */
const FS_SURFACE_SINKS: readonly string[] = Object.freeze([
  "appendFile",
  "appendFileSync",
  "copyFile",
  "copyFileSync",
  "cp",
  "cpSync",
  "createReadStream",
  "createWriteStream",
  "mkdir",
  "mkdirSync",
  "open",
  "openSync",
  "readFile",
  "readFileSync",
  "readdir",
  "readdirSync",
  "readlink",
  "readlinkSync",
  "realpath",
  "realpathSync",
  "rename",
  "renameSync",
  "rm",
  "rmSync",
  "stat",
  "statSync",
  "symlink",
  "symlinkSync",
  "unlink",
  "unlinkSync",
  "writeFile",
  "writeFileSync",
]);

/**
 * The hosted-file surface, READ OUT OF THE SIBLING GATE'S SOURCE TEXT.
 *
 * `sdk.hostedFile.create({ name, content })` takes a NAME, and a `sources` label
 * handed to it becomes a permanent, unreclaimable server artifact carrying a
 * target-controlled string — which is the same defect with a different sink.
 * Restating `"hostedFile"` here would let the two files drift; reading it means
 * a rename over there fails HERE, loudly, rather than leaving this gate matching
 * a name nothing is called any more.
 */
const HOSTED_FILE_MEMBER = stringConstFrom(
  FS_GATE,
  FS_GATE_SOURCE,
  "HOSTED_FILE_MEMBER",
);

/**
 * Every name that makes a call a path-like sink.
 *
 * MATCHED ANYWHERE IN THE CALLEE'S NAME CHAIN, not only at its tail — which is
 * what lets one uniform rule cover `resolve(label)`, `path.resolve(label)` and
 * `sdk.hostedFile.create(label)` without three special cases. The receiver is
 * part of what a call reaches.
 */
export const PATH_LIKE_SINKS: ReadonlySet<string> = Object.freeze(
  new Set<string>([
    ...PATH_MODULE_SINKS,
    ...FS_SURFACE_SINKS,
    HOSTED_FILE_MEMBER,
  ]),
);

type SourcesRule = Readonly<{ rule: string; surface: string; why: string }>;

const RULES = Object.freeze({
  "sources-to-path-sink": Object.freeze({
    rule: "sources-to-path-sink",
    surface: `a call whose callee chain names a member of PATH_LIKE_SINKS, with an argument reachable from one of ${[...SOURCES_BINDING_NAMES].sort().join(", ")}`,
    why:
      "MAP-04's second clause. SPIKE-12 MEASURED `escapes_via_resolve: true` — path.resolve " +
      "taking the value OUT of the containment root — on FIVE of its twenty-two labels: " +
      "relative_traversal, absolute_posix, absolute_posix_etc, " +
      "null_byte and trailing_dots_spaces — and MEASURED path.normalize SILENTLY REWRITING the " +
      "RTL-override label to a bare defminer-escape.txt by CONSUMING the RTL run and FOLLOWING " +
      "the climbs. It also measured symlink_write_through_scratch_root: true, which is the " +
      "finding that broke LEXICAL containment outright — a path inside the root by string " +
      "comparison is not necessarily inside the root on disk. HERE THE GENERAL-PURPOSE LIBRARY " +
      "IS THE HAZARD, which inverts this repository's usual don't-hand-roll advice, and the " +
      "inversion is measured rather than asserted. THIS IS NOT A DEFENCE: under D-17 nothing " +
      "is written at all, so this rule is a PROOF OF UNREACHABILITY that goes red the day a " +
      "filesystem returns and the sink it forbids exists again. A sources label is EVIDENCE — " +
      "parse.ts keeps it verbatim and D-06 sanitises at DISPLAY time only — so the answer is " +
      "never to normalise it here; it is to not hand it to a path API at all.",
  }),
  "sources-unanalysable": Object.freeze({
    rule: "sources-unanalysable",
    surface:
      "a value reachable from a `sources` binding, passed through a call whose callee this walk cannot read",
    why:
      "THIS IS THE ARGUMENT, NOT THE RULE, and it is the codec gate's second rule again for the " +
      "same reason. A call assembled from pieces — a computed member whose key does not reduce, " +
      "or a callee that is itself the result of another call — is the ONE shape that defeats an " +
      "AST gate SILENTLY: the walk returns nothing and the file reports clean, which is " +
      "INDISTINGUISHABLE FROM A PASS. Every other rule here fails loudly when it fails. RESOLVE " +
      "THE VALUE, OR DELETE THE INDIRECTION. The narrowing to calls carrying a TAINTED argument " +
      "is deliberate and is outbound-prohibition.spec.ts's measured lesson: a rule that reported " +
      "every unreadable callee fired on ordinary dotted-path walks and on loop indices, and a " +
      "gate that calls those a path sink gets deleted rather than fixed.",
  }),
});

type RuleId = keyof typeof RULES;

/**
 * The same rule set as an ARRAY, derived from `RULES` so the two cannot disagree
 * about what the gate enforces — never a hand-maintained parallel list.
 */
export const FORBIDDEN_SOURCES_SINKS: readonly SourcesRule[] = Object.freeze(
  Object.values(RULES),
);

type Violation = { file: string; rule: RuleId; detail: string };

// ---------------------------------------------------------------------------
// THE FILE SET
// ---------------------------------------------------------------------------

/**
 * Every non-spec module the plugin SHIPS, under either source root, at any depth.
 *
 * ONE PATH CONVENTION, POSIX, END TO END, for the reason the parent gates give:
 * paths built with the platform separator and compared against a hard-coded `/`
 * work on this host and make every by-name assertion below silently stop
 * matching on a non-POSIX one — and a gate that quietly matches nothing is the
 * same defect as a gate that quietly scans nothing.
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

/** Every `"packages/..."` literal in a declaration block, by `indexOf`. */
function quotedRootsIn(block: string): string[] {
  const marker = '"packages/';
  const out: string[] = [];
  let at = block.indexOf(marker);
  while (at !== -1) {
    const close = block.indexOf('"', at + 1);
    if (close === -1) break;
    out.push(block.slice(at + 1, close));
    at = block.indexOf(marker, close + 1);
  }
  return out;
}

/** How many times does `needle` occur in `haystack`? Non-overlapping. */
function occurrences(haystack: string, needle: string): number {
  let count = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    count += 1;
    at = haystack.indexOf(needle, at + needle.length);
  }
  return count;
}

// ---------------------------------------------------------------------------
// THE WALK
// ---------------------------------------------------------------------------

/** Strip the wrappers that hide an expression from a syntactic match. */
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
    return current;
  }
}

/**
 * The assignment operators that BIND a value to the name on their left. The
 * three logical spellings are in the set because `outbound-prohibition.spec.ts`
 * MEASURED what leaving them out costs; the NUMERIC compound assignments are
 * absent because they bind a number whatever their right-hand side was.
 */
const ASSIGNING_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
]);

/** The marker a callee chain carries when the walk could not read a link in it. */
const UNREADABLE = "\u0000unreadable";

/**
 * Audit one source file.
 *
 * PURE — takes text, returns findings — which is what makes every fixture below
 * possible without touching the filesystem, and what lets the failing path of
 * every rule actually RUN.
 */
export function auditSource(file: string, source: string): Violation[] {
  const base = file.split("/").pop() ?? file;
  const violations: Violation[] = [];

  const add = (rule: RuleId, where: string): void => {
    const surface = RULES[rule];
    violations.push({
      file: base,
      rule,
      detail: `${where} — ${surface.surface}. ${surface.why}`,
    });
  };

  const sf = parseModule(base, source);

  // --- pass 1: which names carry a `sources` value? -------------------------
  //
  // NO SYMBOL TABLE IS BUILT. The set is file-wide rather than scope-aware and is
  // only ever GROWN, so it OVER-approximates — the fail-closed direction — and a
  // two-hop chain resolves for free because the first hop is already in the set
  // when the second is read.

  const tainted = new Set<string>(SOURCES_BINDING_NAMES);
  const constStrings = new Map<string, Set<string>>();

  const literalOf = (node: ts.Node | undefined): string | undefined => {
    if (node === undefined) return undefined;
    const inner = unwrap(node as ts.Expression);
    if (ts.isStringLiteralLike(inner) && !ts.isTemplateExpression(inner)) {
      return inner.text;
    }
    if (ts.isIdentifier(inner)) {
      const bound = constStrings.get(inner.text);
      if (bound !== undefined && bound.size === 1) {
        for (const only of bound) return only;
      }
    }
    return undefined;
  };

  /**
   * Does this subtree READ a tainted name anywhere?
   *
   * Property access member names COUNT — `row.sourcesVerbatim` is exactly how a
   * `RecoveredSource` label is read off a row, and a walk that only looked at
   * bare identifiers would miss the single most likely spelling. An object
   * literal KEY also counts, which over-approximates slightly; that is the
   * fail-closed direction and it is said out loud rather than left to be found.
   */
  const readsTainted = (node: ts.Node): boolean => {
    let hit = false;
    const visit = (current: ts.Node): void => {
      if (hit) return;
      if (ts.isIdentifier(current) && tainted.has(current.text)) {
        hit = true;
        return;
      }
      ts.forEachChild(current, visit);
    };
    visit(node);
    return hit;
  };

  const collect = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const init = unwrap(node.initializer);
      if (ts.isIdentifier(node.name)) {
        if (ts.isStringLiteralLike(init) && !ts.isTemplateExpression(init)) {
          const bound = constStrings.get(node.name.text);
          if (bound === undefined) {
            constStrings.set(node.name.text, new Set([init.text]));
          } else {
            bound.add(init.text);
          }
        }
        if (readsTainted(init)) tainted.add(node.name.text);
      } else if (ts.isObjectBindingPattern(node.name)) {
        // `const { sourcesVerbatim: label } = row` — the RENAMED spelling is the
        // one that would otherwise launder a label into an innocent name.
        for (const el of node.name.elements) {
          const from = el.propertyName ?? el.name;
          const fromName =
            ts.isIdentifier(from) || ts.isStringLiteralLike(from)
              ? from.text
              : undefined;
          if (
            fromName !== undefined &&
            tainted.has(fromName) &&
            ts.isIdentifier(el.name)
          ) {
            tainted.add(el.name.text);
          }
        }
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      ASSIGNING_OPERATORS.has(node.operatorToken.kind) &&
      ts.isIdentifier(node.left) &&
      readsTainted(node.right)
    ) {
      tainted.add(node.left.text);
    }

    ts.forEachChild(node, collect);
  };
  // TWICE, so a binding declared AFTER its first read still taints. The set only
  // ever grows, so a second pass is idempotent once nothing new is found.
  collect(sf);
  collect(sf);

  // --- pass 2: apply the rules ----------------------------------------------

  /**
   * Every name in a callee's chain, tail first, with `UNREADABLE` standing in
   * for a link this walk could not reduce to a name.
   */
  const calleeChain = (expr: ts.Expression): string[] => {
    const out: string[] = [];
    let current = unwrap(expr);
    for (let hops = 0; hops < 32; hops += 1) {
      if (ts.isPropertyAccessExpression(current)) {
        out.push(current.name.text);
        current = unwrap(current.expression);
        continue;
      }
      if (ts.isElementAccessExpression(current)) {
        out.push(literalOf(current.argumentExpression) ?? UNREADABLE);
        current = unwrap(current.expression);
        continue;
      }
      if (ts.isIdentifier(current)) {
        out.push(current.text);
        return out;
      }
      if (ts.isCallExpression(current)) {
        // A callee that is itself the RESULT of a call. The walk cannot read
        // into it, and that is the shape the second rule exists for.
        out.push(UNREADABLE);
        return out;
      }
      return out;
    }
    return out;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const carrying = node.arguments.filter((argument) =>
        readsTainted(argument),
      );
      if (carrying.length > 0) {
        const chain = calleeChain(node.expression);
        const sink = chain.find((name) => PATH_LIKE_SINKS.has(name));
        if (sink !== undefined) {
          add(
            "sources-to-path-sink",
            `\`${sink}\` reached with a value from a \`${SOURCES_MEMBER}\` binding`,
          );
        } else if (chain.includes(UNREADABLE)) {
          add(
            "sources-unanalysable",
            `a value from a \`${SOURCES_MEMBER}\` binding passed to a call this walk cannot name`,
          );
        }
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
describe(`MAP-04 — no \`${SOURCES_MEMBER}\` value reaches a path-like sink from ${SOURCE_ROOTS.join(" or ")}`, () => {
  const files = shippedFiles();

  it("enumerates a NON-EMPTY set of shipped modules, BY NAME, ACROSS BOTH ROOTS", () => {
    expect(
      files.length,
      `no .ts modules found under ${SOURCE_ROOTS.join(" or ")}`,
    ).toBeGreaterThan(0);
    for (const expected of [
      "index.ts",
      "lifecycle.ts",
      "store/export.ts",
      "scan/producer.ts",
      "pipeline.ts",
      // THE PHASE'S OWN SUBJECT. `parse.ts` is the module that produces every
      // `sources` value in this codebase, so a walk that did not reach it would
      // be proving MAP-04 about a tree with no `sources` in it at all.
      "sourcemap/parse.ts",
      "sourcemap/announce.ts",
      "sourcemap/map-fixture.ts",
    ]) {
      expect(
        files.some((f) => f.endsWith(`/${expected}`)),
        `${expected} is not being audited`,
      ).toBe(true);
    }
  });

  it("every root contributes at least one file to the scan", () => {
    for (const root of SOURCE_ROOTS) {
      expect(
        files.filter((f) => f.startsWith(`${root}/`)).length,
        `no file under ${root} reached the scan`,
      ).toBeGreaterThan(0);
    }
  });

  it("the walk really DESCENDED into subdirectories, per root", () => {
    for (const root of SOURCE_ROOTS) {
      expect(
        readdirSync(root, { withFileTypes: true }).some((e) => e.isDirectory()),
        `${root} has no subdirectory at all, so this walk cannot be shown to descend`,
      ).toBe(true);
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
    expect(shippedFiles()).toEqual(files);
  });

  it("scans the SAME roots the outbound gate does, read off that file rather than assumed", () => {
    const parent = readFileSync(OUTBOUND_GATE, "utf8");
    const start = parent.indexOf("export const SOURCE_ROOTS");
    expect(
      start,
      "outbound-prohibition.spec.ts no longer declares SOURCE_ROOTS, so this agreement check is vacuous",
    ).toBeGreaterThan(-1);
    const block = parent.slice(start, parent.indexOf("]);", start));
    expect(
      quotedRootsIn(block).filter((root) => !SOURCE_ROOTS.includes(root)),
      "the outbound gate scans a root this gate does not, so part of the shipped tree is ungated for MAP-04 while the outbound rules still cover it",
    ).toEqual([]);
    expect(occurrences(block, '"packages/')).toBe(SOURCE_ROOTS.length);
  });

  it.each(files)(
    `%s hands no \`${SOURCES_MEMBER}\` value to a path-like sink`,
    (file) => {
      const violations = auditSource(file, readFileSync(file, "utf8"));
      expect(
        violations.map((v) => `${v.rule}: ${v.detail}`),
        `${file} reaches a path-like sink with a \`${SOURCES_MEMBER}\` value, which MAP-04 forbids in every module the plugin ships`,
      ).toEqual([]);
    },
  );

  it("reports NOTHING on ITSELF, while a substring scan of the same bytes FIRES", () => {
    // THE MECHANICAL PROOF THAT THIS IS AN AST WALK, on the most adversarial file
    // available — this one, which names every sink and every binding hundreds of
    // times in prose and inside fixture string literals that are whole modules.
    const source = readFileSync(SELF, "utf8");

    const substringHits = occurrences(source, "resolve(");
    expect(
      substringHits,
      "this file no longer names a path sink as text, so the AST-vs-text case has no subject",
    ).toBeGreaterThan(0);
    expect(
      occurrences(source, SOURCES_MEMBER),
      `this file no longer names \`${SOURCES_MEMBER}\`, so the AST-vs-text case has no subject`,
    ).toBeGreaterThan(20);

    expect(auditSource(SELF, source)).toEqual([]);

    // ADDING PROSE DOES NOT CHANGE IT — the half that proves the gate cannot be
    // weakened by deleting its own documentation.
    const withMoreProse = [
      source,
      `// A ${SOURCES_MEMBER} label must never reach resolve(), join() or normalize().`,
      `const documented = "const ${SOURCES_MEMBER} = x; resolve(${SOURCES_MEMBER});";`,
    ].join("\n");
    expect(auditSource(SELF, withMoreProse)).toEqual([]);

    // AND THE GATE IS NOT BLIND ON ITS OWN FILE EITHER: one real sink call
    // appended to these same bytes reports, and reports exactly once.
    const withRealSink = [
      source,
      `const ${SOURCES_MEMBER}Verbatim = label;`,
      `const target = resolve(${SOURCES_MEMBER}Verbatim);`,
    ].join("\n");
    expect(auditSource(SELF, withRealSink).map((v) => v.rule)).toEqual([
      "sources-to-path-sink",
    ]);
  });
});

// ---------------------------------------------------------------------------
// THE DERIVATIONS, HELD HONEST
// ---------------------------------------------------------------------------
describe("the two derived sets track the files they are derived from", () => {
  it("RECOVERED_SOURCE_FIELDS is read off parse.ts and pins its members BY NAME", () => {
    // DERIVED SO IT TRACKS, PINNED SO A RENAME IS LOUD. A derivation that
    // quietly follows whatever it finds proves nothing: renaming
    // `sourcesVerbatim` would silently move this gate onto the new name and
    // nobody would be told that MAP-04's subject had changed shape.
    expect(RECOVERED_SOURCE_FIELDS).toEqual([
      "content",
      "sourcesIndex",
      "sourcesVerbatim",
    ]);
  });

  it("SOURCES_BINDING_NAMES is derived from those fields and EXCLUDES `content`", () => {
    expect([...SOURCES_BINDING_NAMES].sort()).toEqual([
      "sources",
      "sourcesIndex",
      "sourcesVerbatim",
    ]);
    expect(
      SOURCES_BINDING_NAMES.has("content"),
      "`content` is the recovered FILE BODY, not the label — including it would report on every module with a variable called content",
    ).toBe(false);
    expect(Object.isFrozen(SOURCES_BINDING_NAMES)).toBe(true);
  });

  it("PATH_LIKE_SINKS carries the path surface, the filesystem surface, and the sibling's hosted-file name", () => {
    // NON-VACUITY OF EACH CONTRIBUTOR, named separately so a derivation that
    // collapsed to nothing could not hide behind the other two.
    for (const member of ["resolve", "normalize", "join", "basename"]) {
      expect(
        PATH_LIKE_SINKS.has(member),
        `${member} is no longer a declared sink, so SPIKE-12's measured escape has no gate`,
      ).toBe(true);
    }
    for (const member of ["writeFileSync", "realpath", "symlink"]) {
      expect(PATH_LIKE_SINKS.has(member)).toBe(true);
    }
    expect(
      PATH_LIKE_SINKS.has(HOSTED_FILE_MEMBER),
      "the hosted-file member read from the sibling gate is not in the sink set",
    ).toBe(true);
    expect(HOSTED_FILE_MEMBER).toBe("hostedFile");
    expect(Object.isFrozen(PATH_LIKE_SINKS)).toBe(true);
  });

  it("the path-module surface is DERIVED from node:path, not typed out", () => {
    expect(PATH_MODULE_SURFACE.length).toBeGreaterThan(8);
    expect(PATH_MODULE_SURFACE).toContain("resolve");
    // The private member is dropped mechanically, by its prefix.
    expect(PATH_MODULE_SURFACE.every((name) => !name.startsWith("_"))).toBe(
      true,
    );
  });

  it("every PATH_MODULE_EXCLUSION is still IN the derived surface, so a stale one is reported", () => {
    // An exclusion that has stopped being needed is an exclusion that starts
    // hiding the next real one — knip.json's own doctrine, applied here.
    for (const excluded of PATH_MODULE_EXCLUSIONS) {
      expect(
        PATH_MODULE_SURFACE,
        `${excluded} is no longer a member of node:path, so this exclusion is stale`,
      ).toContain(excluded);
      expect(PATH_LIKE_SINKS.has(excluded)).toBe(false);
    }
  });

  it("the filesystem half of the sink set is UNREACHABLE by the sibling gate's ban, read off that file", () => {
    // THE CLAIM THIS WHOLE FILE RESTS ON, asserted rather than described. If the
    // filesystem ban ever disappears, this gate stops being a proof of
    // unreachability and becomes a defence — and it must say so rather than
    // continuing to look watchful.
    expect(
      FS_GATE_SOURCE.indexOf("const FS_SPECIFIER_LIST"),
      "filesystem-prohibition.spec.ts no longer declares FS_SPECIFIER_LIST, so the claim that this gate's filesystem sinks are unreachable has lost its evidence",
    ).toBeGreaterThan(-1);
    expect(FS_GATE_SOURCE).toContain('const FS_MODULE = "fs"');
  });

  it("FORBIDDEN_SOURCES_SINKS is DERIVED from RULES and cannot disagree with it", () => {
    expect(FORBIDDEN_SOURCES_SINKS.map((r) => r.rule).sort()).toEqual(
      Object.keys(RULES).sort(),
    );
    expect(Object.isFrozen(FORBIDDEN_SOURCES_SINKS)).toBe(true);
    for (const rule of FORBIDDEN_SOURCES_SINKS) {
      expect(Object.isFrozen(rule)).toBe(true);
      expect(rule.surface.length).toBeGreaterThan(0);
      expect(rule.why.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// EVERY RULE'S FAILING PATH, EXECUTED — against the 23 MEASURED LABELS
// ---------------------------------------------------------------------------

const rulesOf = (src: string, file = "fixture.ts"): string[] =>
  auditSource(file, src).map((v) => v.rule);

/**
 * A synthetic module that binds one measured label and hands it to a sink.
 *
 * `JSON.stringify` writes the literal, which is what makes the NUL byte, the RTL
 * override and the 4 KB label expressible as TypeScript source at all — and it
 * is the same delivery idiom `parse.spec.ts` adopted for the same corpus.
 */
const firingModule = (label: string): string =>
  [
    `const sourcesVerbatim = ${JSON.stringify(label)};`,
    "const target = resolve(sourcesVerbatim);",
  ].join("\n");

/** The same label, handed to something that is NOT a sink. */
const legalModule = (label: string): string =>
  [
    `const sourcesVerbatim = ${JSON.stringify(label)};`,
    "const shown = forDisplay(sourcesVerbatim);",
  ].join("\n");

const LABEL_BY_ID = new Map(
  SOURCES_LABEL_CASES.map((labelCase) => [labelCase.id, labelCase.value]),
);

/** The legal control — SPIKE-12 fixture 22, the one benign label. */
const BENIGN_CONTROL = LABEL_BY_ID.get("benign-control") ?? "";

const FIRING_FIXTURES: readonly Readonly<{
  rule: RuleId;
  name: string;
  source: string;
  expected: readonly RuleId[];
}>[] = Object.freeze([
  {
    rule: "sources-to-path-sink",
    name: "the label read off a RecoveredSource ROW rather than through a bare name",
    source: "const target = join(root, row.sourcesVerbatim);",
    expected: ["sources-to-path-sink"],
  },
  {
    rule: "sources-to-path-sink",
    name: "a RENAMED destructure, the spelling that would otherwise launder the label",
    source: [
      "const { sourcesVerbatim: label } = row;",
      "const target = normalize(label);",
    ].join("\n"),
    expected: ["sources-to-path-sink"],
  },
  {
    rule: "sources-to-path-sink",
    name: "a two-hop alias, which resolves because the taint set grows from the LIVE set",
    source: [
      "const a = row.sourcesVerbatim;",
      "const b = a;",
      "const target = resolve(b);",
    ].join("\n"),
    expected: ["sources-to-path-sink"],
  },
  {
    rule: "sources-to-path-sink",
    name: "a lazy-init logical assignment, the spelling two characters from `=`",
    source: [
      "let label;",
      "label ??= row.sourcesVerbatim;",
      "const target = basename(label);",
    ].join("\n"),
    expected: ["sources-to-path-sink"],
  },
  {
    rule: "sources-to-path-sink",
    name: "an `as` cast around the argument, the wrapper that defeats a naive match",
    source: "const target = resolve(sourcesVerbatim as string);",
    expected: ["sources-to-path-sink"],
  },
  {
    rule: "sources-to-path-sink",
    name: "the filesystem half of the sink set, unreachable today and named anyway",
    source: "writeFileSync(sourcesVerbatim, body);",
    expected: ["sources-to-path-sink"],
  },
  {
    rule: "sources-to-path-sink",
    name: "the hosted-file surface, whose name is read out of the sibling gate",
    source: "await sdk.hostedFile.create({ name: sourcesVerbatim, content });",
    expected: ["sources-to-path-sink"],
  },
  {
    rule: "sources-to-path-sink",
    name: "a template that EMBEDS the label, so the escape travels inside a bigger string",
    source: "const target = resolve(`${root}/${sourcesVerbatim}`);",
    expected: ["sources-to-path-sink"],
  },
  {
    rule: "sources-unanalysable",
    name: "a computed callee whose key this walk cannot reduce",
    source: "const target = fsModule[verb](sourcesVerbatim);",
    expected: ["sources-unanalysable"],
  },
  {
    rule: "sources-unanalysable",
    name: "a callee that is itself the RESULT of a call",
    source: "const target = pick(kind)(sourcesVerbatim);",
    expected: ["sources-unanalysable"],
  },
]);

const LEGAL_FIXTURES: readonly Readonly<{ name: string; source: string }>[] =
  Object.freeze([
    {
      name: "the benign control label handed to a NON-sink",
      source: legalModule(BENIGN_CONTROL),
    },
    {
      name: "a sink called with something that is NOT a sources value",
      source: "const target = resolve(pluginDataDir, exportName);",
    },
    {
      name: "the label handed to the DISPLAY sanitiser, which is where D-06 puts it",
      source: "const shown = forDisplay(row.sourcesVerbatim);",
    },
    {
      name: "the label written to a row, which is storage and not a path",
      source: "rows.push({ sourcesIndex, sourcesVerbatim, content });",
    },
    {
      name: "an ordinary length read on the sources array, which is not a call at all",
      source: "const declared = sources.length;",
    },
    {
      name: "the array guard parse.ts actually uses on the sources member",
      source:
        'const sources = map["sources"];\nif (!Array.isArray(sources)) return;',
    },
    {
      name: "JSON.parse, whose NAME collides with node:path's — the measured exclusion",
      source: "const parsed = JSON.parse(sourcesVerbatim);",
    },
    {
      name: "a computed callee with a NON-tainted argument — an ordinary dispatch table",
      source: "const out = handlers[kind](payload);",
    },
    {
      name: "a comment naming every sink and every binding",
      source: [
        "// This module never calls resolve(sources), normalize(sourcesVerbatim),",
        "// join(sourcesIndex) or sdk.hostedFile.create(sourcesVerbatim).",
        "export const NOTHING = 0;",
      ].join("\n"),
    },
    {
      name: "a string literal that IS a firing module — the shape a substring scan cannot tell from code",
      source:
        'const documented = "const sourcesVerbatim = x; resolve(sourcesVerbatim);";',
    },
  ]);

describe("the gate's own failure paths, every one of them executed", () => {
  it.each(SOURCES_LABEL_CASE_IDS)(
    "sources-to-path-sink fires on the %s label reaching resolve()",
    (id) => {
      const label = LABEL_BY_ID.get(id);
      expect(label, `${id} is not in SOURCES_LABEL_CASES`).toBeDefined();
      expect(rulesOf(firingModule(label as string))).toEqual([
        "sources-to-path-sink",
      ]);
    },
  );

  it.each(SOURCES_LABEL_CASE_IDS)(
    "stays QUIET on the %s label handed to a NON-sink",
    (id) => {
      // BOTH DIRECTIONS FOR EVERY LABEL, not only for the benign control. The
      // claim is about the SINK, not about the string: a gate that fired on
      // `../../etc/passwd` wherever it appeared would be banning a vocabulary.
      expect(rulesOf(legalModule(LABEL_BY_ID.get(id) as string))).toEqual([]);
    },
  );

  it.each(FIRING_FIXTURES)("$rule fires on $name", ({ source, expected }) => {
    expect(rulesOf(source)).toEqual(expected);
  });

  it.each(LEGAL_FIXTURES)("stays QUIET on $name", ({ source }) => {
    expect(rulesOf(source)).toEqual([]);
  });

  it("the two DEGENERATE labels are exercised in both directions, explicitly", () => {
    // MAP-04/empty. The empty string and the lone dot are the two labels most
    // likely to be dropped from a corpus as "not really a case", and they are
    // exactly the two that collide after normalisation — `.` normalises to the
    // empty string, so the two become one input while remaining two labels.
    for (const id of ["empty", "dot-only"]) {
      const label = LABEL_BY_ID.get(id);
      expect(label, `${id} is no longer in the corpus`).toBeDefined();
      expect(rulesOf(firingModule(label as string))).toEqual([
        "sources-to-path-sink",
      ]);
      expect(rulesOf(legalModule(label as string))).toEqual([]);
    }
    expect(LABEL_BY_ID.get("empty")).toBe("");
    expect(LABEL_BY_ID.get("dot-only")).toBe(".");
  });

  it("the ENCODINGS SPIKE-12 measured are in the corpus, by their measured bytes", () => {
    // Named individually because these four are the whole reason the corpus is
    // 23 measured strings rather than a handful of `../`. If any of them is
    // reworded upstream, this fails rather than quietly testing ASCII.
    expect(LABEL_BY_ID.get("null-byte")).toContain("\u0000");
    expect(LABEL_BY_ID.get("unicode-rtl-override")).toContain("‮");
    expect(LABEL_BY_ID.get("unicode-fullwidth")).toContain("．");
    expect(LABEL_BY_ID.get("trailing-dots-spaces")).toContain("   ");
    expect((LABEL_BY_ID.get("four-kilobyte-label") ?? "").length).toBe(4096);
  });
});

describe("the fixture set covers the rule set, and the corpus is the WHOLE corpus", () => {
  it("the exercised label-id set EQUALS SOURCES_LABEL_CASE_IDS, in full", () => {
    // The `exercised` Set idiom from sanitise.spec.ts, and the assert-the-array-
    // IN-FULL doctrine from hostile.fixture.ts. This is what makes adding a case
    // to map-fixture.ts fail HERE until it is accounted for, which is the
    // intended cost — and what stops this gate quietly testing the subset
    // somebody happened to write cases for.
    const exercised = new Set<string>();
    for (const id of SOURCES_LABEL_CASE_IDS) {
      expect(rulesOf(firingModule(LABEL_BY_ID.get(id) as string))).toEqual([
        "sources-to-path-sink",
      ]);
      exercised.add(id);
    }
    expect([...exercised].sort()).toEqual([...SOURCES_LABEL_CASE_IDS].sort());
    expect(SOURCES_LABEL_CASE_IDS.length).toBe(23);
  });

  it("EVERY declared rule id has at least one firing fixture", () => {
    const covered = new Set<string>(FIRING_FIXTURES.map((f) => f.rule));
    expect([...covered].sort()).toEqual(Object.keys(RULES).sort());
  });

  it("EVERY declared rule id has at least one legal fixture proving it stays quiet", () => {
    expect(
      LEGAL_FIXTURES.some((f) => f.source.includes("forDisplay")),
      "no legal fixture hands a sources value to a non-sink, so sources-to-path-sink has no counter-case",
    ).toBe(true);
    expect(
      LEGAL_FIXTURES.some((f) => f.source.includes("handlers[kind]")),
      "no legal fixture exercises a computed callee with an untainted argument, so sources-unanalysable has no counter-case",
    ).toBe(true);
  });

  it("the failure message carries the WHY, not just the rule id", () => {
    const [violation] = auditSource(
      "f.ts",
      "const target = resolve(sourcesVerbatim);",
    );
    expect(violation?.detail).toContain("escapes_via_resolve");
    expect(violation?.detail).toContain("symlink_write_through_scratch_root");
    expect(violation?.detail).toContain("PROOF OF UNREACHABILITY");
  });
});
