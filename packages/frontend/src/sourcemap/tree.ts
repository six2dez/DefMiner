// packages/frontend/src/sourcemap/tree.ts — the O-08 display normaliser.
//
// ===========================================================================
// THE GENERAL-PURPOSE PATH LIBRARY IS THE HAZARD HERE, NOT THE SOLUTION
// ===========================================================================
// Every instinct says "this is what `node:path` is for". SPIKE-12 measured
// otherwise, on the exact corpus this module is driven over:
//
//   `path.resolve` ESCAPED on 5 of 22 fixtures — relative-traversal,
//   absolute-posix, absolute-posix-etc, null-byte and trailing-dots-spaces —
//   producing an absolute location outside anything DefMiner had asked about.
//
//   `path.normalize` SILENTLY REWROTE the RTL-override fixture
//   `sub/<RLO>resrc<PDF>/../../defminer-escape.txt` into the bare filename
//   `defminer-escape.txt`: the RTL run CONSUMED and the climbs FOLLOWED. The
//   operator would have been shown a filename the developer never wrote, with
//   nothing to indicate a rewrite had happened.
//
// So the rule is hand-written string work over segments, and the ABSENCE of the
// library is proved by an EXACT-SET assertion on this module's imports rather
// than by searching the source for a literal — `tree.spec.ts` asserts the
// module-specifier set equals `["../safety/display"]` and the named-import set
// equals `["forCellText"]`. An added import fails that equality without anyone
// having to think of the string it would have been spelled with. That second
// equality is simultaneously the proof that `forCell` is unreachable from here
// (threat T-07-12: the counting path costs a 37,395 ms scroll against 4,010 ms
// on a 4 MiB single-line value, measured in `safety/display.ts`).
//
// It is also why NOTHING is imported from `@defminer/engine/contract`. The row
// this module consumes is typed STRUCTURALLY below: a type-only import is still
// a module specifier, and an import set of one is the only set an assertion can
// state without qualification.
//
// ===========================================================================
// LOSSLESSNESS IS STRUCTURAL, NOT DISCIPLINED
// ===========================================================================
// `label` is NEVER the identity. Every read that needs the real string goes
// back to the stored row by `sourcesIndex` — the viewer resolves content by
// index, and the viewer header renders the VERBATIM `sources` entry, which is
// what makes the losslessness visible rather than merely provable.
//
// This module has NO WRITE PATH. It takes rows, returns nodes, and mutates
// nothing; the verbatim string is never rewritten, normalised, case-folded or
// re-encoded. `tree.spec.ts` proves it the way `schema.spec.ts`'s
// MUST-NOT-TOUCH half proves its own: a round-trip assertion that the input
// row's string is byte-identical after construction, over every fixture.
//
// ===========================================================================
// NO REGULAR EXPRESSION, ANYWHERE IN THIS FILE
// ===========================================================================
// The shape classification is `indexOf` / `startsWith` and the split is
// `String.split`. `admit.ts`'s ReDoS rule is a project rule and the fact that
// this one runs in a browser rather than on the proxy thread does not change
// what a catastrophic backtrack costs the operator — it changes only whose
// thread stops. The fixture cost is identical either way.

import { forCellText } from "../safety/display";

/**
 * The five shapes a `sources` entry can take, closed.
 *
 * EXACTLY THE SHAPES SPIKE-12 ENUMERATED, so the fixture set already exists and
 * this list is a reading of measured data rather than an invention. Each one
 * gets a SYNTHETIC DISPLAY ROOT so the operator can see which kind of thing the
 * developer's bundler declared; the shape is classified and NEVER REPAIRED.
 */
export const SOURCE_PATH_SHAPES = [
  /** A scheme and an authority separator — `webpack:///./src/app.js`, the single
   *  most common real shape in the wild, and it is a URL and not a path. */
  "protocol",
  /** A leading forward slash. */
  "absolute-posix",
  /** A drive letter followed by a separator — `C:\\Windows\\Temp\\x.txt`. */
  "windows-drive",
  /** A leading double backslash — `\\\\server\\share\\x.txt`. */
  "windows-unc",
  /** Everything else. The implicit root; no synthetic node is created. */
  "relative",
] as const;

/** One classified shape. Derived from {@link SOURCE_PATH_SHAPES}, never
 *  restated. */
export type SourcePathShape = (typeof SOURCE_PATH_SHAPES)[number];

/**
 * The two display notes, closed.
 *
 * 07-UI-SPEC.md § "Copywriting Contract" binds exactly these two and the words
 * they render as. THEY ARE NOT A VOCABULARY in the sense the three status
 * vocabularies are — they describe what the TREE did to a position or a label,
 * not what happened to the artifact — which is why they are notes on a node
 * rather than a presentation map with a tone.
 */
export const SOURCE_TREE_NOTES = [
  /** A parent-directory climb was resolved and bounded at the root. */
  "path-clamped",
  /** A segment was longer than the cell cap and was cut. */
  "label-truncated",
] as const;

/** One display note. */
export type SourceTreeNote = (typeof SOURCE_TREE_NOTES)[number];

/**
 * The deepest indent level the tree renders.
 *
 * An indent that grows without bound in a quarter-width column is an indent
 * that eventually leaves no room for the label the operator came to read. A
 * node deeper than this holds the maximum indent and does not grow further —
 * the node is still rendered, at its real depth, with its real ancestors; only
 * the leading whitespace stops increasing.
 */
export const SOURCE_TREE_MAX_INDENT_DEPTH = 8;

/**
 * What this module needs off a recovered-source row, structurally.
 *
 * DECLARED HERE RATHER THAN IMPORTED, and the reason is the import-set proof at
 * the top of this file: a type-only import is still a module specifier, and the
 * exact-set assertion is only unambiguous over a set of one. The two fields are
 * a subset of `RecoveredSourceRow`, so a real row is assignable without a cast
 * and a widening of that type cannot break this one.
 */
export type SourceTreeInputRow = {
  /** The index the MAP declared. The evidence, the sort order, and the ONLY
   *  identity — the label is never the identity. */
  readonly sourceIndex: number;
  /** TARGET-CONTROLLED and unsanitised, exactly as D-06 stores it. `null` when
   *  the map declared a hole at this index. */
  readonly sourcesVerbatim: string | null;
};

/**
 * One node of the display tree.
 *
 * `label` is DISPLAY-ONLY: sanitised, truncated, and never compared against
 * anything the backend holds. `sourcesIndex` is the identity.
 */
export type SourceTreeNode = {
  /** Stable, deterministic, and unique within one build. The scroller's
   *  `key-field`, and what an expansion set is keyed on. */
  readonly key: string;
  /** Display-only. Every segment through `forCellText`. */
  readonly label: string;
  /**
   * The row this node came from.
   *
   * For a `source` node it is the row the operator opens. For a `directory` or
   * a synthetic `root` it is the index of the FIRST row that created the node,
   * which is what makes sibling order ascending by construction and gives even
   * an interior node a way back to a real stored string.
   */
  readonly sourcesIndex: number;
  /** `true` when the rendered position or label is not a literal reading of the
   *  stored string — a resolved climb, or a cut label. */
  readonly degraded: boolean;
  /** Which of the two notes apply. Empty for an undegraded node. */
  readonly notes: readonly SourceTreeNote[];
  /**
   * How many parent-directory segments this node's path declared.
   *
   * COUNTED AND SHOWN RATHER THAN ERASED. The developer's real layout is the
   * evidence D-06 exists to preserve and a `..` is part of it: a node whose
   * position was COMPUTED from a climb is not in the place its string spells,
   * and the operator is entitled to know that before comparing it against
   * anything.
   */
  readonly climbs: number;
  /**
   * How many of those climbs would have popped PAST the root and were refused
   * there.
   *
   * Refused, not followed and not dropped. A climb past the root is the case
   * `path.resolve` turns into an escape; here it is a number on a node.
   */
  readonly clampedClimbs: number;
  /** `true` when a SIBLING carries a byte-identical label. Both siblings carry
   *  it — the index suffix is only meaningful on both or on neither. */
  readonly duplicate: boolean;
  /** `root` is synthetic (a scheme, `/`, a drive, a UNC prefix). `source` is a
   *  row the operator can open. `directory` is neither. */
  readonly kind: "root" | "directory" | "source";
  readonly children: readonly SourceTreeNode[];
};

/** One row of the flattened, virtualisable visible-node list. */
export type SourceTreeRow = {
  readonly node: SourceTreeNode;
  /** The real depth, zero-based. Never capped — this is the `aria-level`. */
  readonly depth: number;
  /** The depth the INDENT uses, capped at
   *  {@link SOURCE_TREE_MAX_INDENT_DEPTH}. */
  readonly indentDepth: number;
};

// ---------------------------------------------------------------------------
// STEP 1 — CLASSIFY THE SHAPE. DO NOT REPAIR IT.
// ---------------------------------------------------------------------------

/**
 * The schemes recognised without an authority separator.
 *
 * A LIST RATHER THAN A PATTERN. `webpack:` is the one that matters — it is the
 * most common real `sources` shape — and `http:`/`https:` are here so an entry
 * that is a fetchable URL is classified as one and rendered under its scheme,
 * which is the display that makes D-01's refusal legible: DefMiner shows the
 * URL and never becomes a request.
 */
const KNOWN_SCHEMES = ["webpack:", "file:", "https:", "http:"];

const SCHEME_SEPARATOR = "://";
const FORWARD_SLASH = "/";
const BACK_SLASH = "\\";
const UNC_PREFIX = "\\\\";
const CURRENT_DIRECTORY = ".";
const PARENT_DIRECTORY = "..";

/** The classified shape and the synthetic root label it implies. A `relative`
 *  entry has no synthetic root, which is what `rootLabel: null` means. */
type Classification = {
  readonly shape: SourcePathShape;
  readonly rootLabel: string | null;
  /** What remains once the root has been taken off. Split in step 2. */
  readonly remainder: string;
};

function classify(value: string): Classification {
  const separator = value.indexOf(SCHEME_SEPARATOR);
  const firstSlash = value.indexOf(FORWARD_SLASH);
  if (separator > 0 && firstSlash === separator + 1) {
    return {
      shape: "protocol",
      rootLabel: value.slice(0, separator + 1),
      remainder: value.slice(separator + SCHEME_SEPARATOR.length),
    };
  }
  for (const scheme of KNOWN_SCHEMES) {
    if (value.startsWith(scheme)) {
      return {
        shape: "protocol",
        rootLabel: scheme,
        remainder: value.slice(scheme.length),
      };
    }
  }
  if (value.startsWith(UNC_PREFIX)) {
    return {
      shape: "windows-unc",
      rootLabel: UNC_PREFIX,
      remainder: value.slice(UNC_PREFIX.length),
    };
  }
  if (
    value.length >= 3 &&
    value.charAt(1) === ":" &&
    (value.charAt(2) === BACK_SLASH || value.charAt(2) === FORWARD_SLASH)
  ) {
    return {
      shape: "windows-drive",
      rootLabel: value.slice(0, 2),
      remainder: value.slice(2),
    };
  }
  if (value.startsWith(FORWARD_SLASH)) {
    return {
      shape: "absolute-posix",
      rootLabel: FORWARD_SLASH,
      remainder: value.slice(1),
    };
  }
  return { shape: "relative", rootLabel: null, remainder: value };
}

/**
 * The shape of one verbatim `sources` entry, exported so a spec — and the
 * drill-down's own copy — can state it without re-deriving it.
 *
 * @internal
 */
export function sourcePathShape(value: string): SourcePathShape {
  return classify(value).shape;
}

// ---------------------------------------------------------------------------
// STEP 2 — SPLIT ON BOTH SEPARATORS
// ---------------------------------------------------------------------------

/**
 * Segments, on the forward slash AND the backslash.
 *
 * A Windows-authored entry uses backslashes, and a forward-slash-only split
 * renders `C:\\Windows\\Temp\\x.txt` as ONE ENORMOUS LEAF. This is display-only
 * and cannot corrupt anything, because the verbatim string is untouched — which
 * is the whole reason a display normaliser is allowed to make a decision a
 * storage normaliser would not be.
 */
function splitSegments(remainder: string): string[] {
  const out: string[] = [];
  for (const bySlash of remainder.split(FORWARD_SLASH)) {
    for (const segment of bySlash.split(BACK_SLASH)) out.push(segment);
  }
  return out;
}

// ---------------------------------------------------------------------------
// STEP 3 — RESOLVE `.` AND `..`, CLAMPED AT THE ROOT AND MARKED
// ---------------------------------------------------------------------------

type Resolved = {
  readonly segments: readonly string[];
  readonly climbs: number;
  readonly clampedClimbs: number;
};

/**
 * The climb resolution, for the TREE ONLY.
 *
 * `.` is dropped, `..` pops — and a `..` with nothing left to pop is CLAMPED AT
 * THE ROOT AND COUNTED, never followed and never silently deleted.
 * `../../../../../../etc/defminer-escape.txt` must render as a node the
 * operator can SEE, at a position that is honest about the climb, and must
 * never be rewritten as though the developer had written `etc/`.
 *
 * Empty segments are dropped: they come from a doubled separator or a leading
 * one, and a zero-width directory is not a thing the developer wrote.
 */
function resolveClimbs(segments: readonly string[]): Resolved {
  const stack: string[] = [];
  let climbs = 0;
  let clampedClimbs = 0;
  for (const segment of segments) {
    if (segment === "" || segment === CURRENT_DIRECTORY) continue;
    if (segment === PARENT_DIRECTORY) {
      climbs++;
      if (stack.length === 0) clampedClimbs++;
      else stack.pop();
      continue;
    }
    stack.push(segment);
  }
  return { segments: stack, climbs, clampedClimbs };
}

// ---------------------------------------------------------------------------
// STEP 4 — SANITISE EACH SEGMENT
// ---------------------------------------------------------------------------

/** A one-character probe, appended to decide whether the cap was reached. */
const CAP_PROBE = "x";

type DisplaySegment = { readonly label: string; readonly truncated: boolean };

/**
 * One segment, through the shipped text-only path.
 *
 * `forCellText` and never `forCell`: this is the SEGMENT of a label rendered in
 * a virtualised 32px row, and `forCell`'s `total` forces a walk of the whole
 * value for a number no tree node renders. Measured, in `safety/display.ts`:
 * 99 of 396 frames over the 32 ms budget and a 37,395 ms scroll through the
 * counting path, against 0 of 396 and 4,010 ms through this one.
 *
 * R2 STEPS 1-3 ARE ALL THREE OF THEM WHAT MAKES THIS SAFE: the C0/C1 strip
 * removes the NUL byte, the bidi strip removes the RTL override, and the
 * grapheme truncation caps the 4 KB label. None of them is written here.
 *
 * WHY TRUNCATION IS DETECTED BY A PROBE. The cap is bound inside `forCellText`
 * and reaching for the number would mean a second named import, which is
 * exactly the equality that proves `forCell` unreachable. So the question
 * "was this cut?" is asked of the function instead: append one character and
 * see whether the answer changes. A segment of EXACTLY the cap answers "cut"
 * although nothing was — a one-value over-report, stated rather than hidden,
 * and it errs in the safe direction: the note tells the operator to check the
 * verbatim string, which the viewer header always shows, and a false "this is
 * complete" would be the error that costs something.
 */
function displaySegment(segment: string): DisplaySegment {
  const label = forCellText(segment);
  return { label, truncated: forCellText(segment + CAP_PROBE) === label };
}

// ---------------------------------------------------------------------------
// STEP 5 — DISAMBIGUATE DUPLICATE SIBLINGS BY POSITION
// ---------------------------------------------------------------------------
//
// NO UNICODE NORMALISATION AND NO CASE FOLDING, and this is the step where the
// obvious tidy-up would destroy evidence. SPIKE-12 measured BOTH collisions in
// the wild: an NFD and an NFC spelling of `café/app.js`, which render
// identically and are different strings, and `srcdir` beside `SRCDIR`, which
// differ only in case. Collapsing either pair merges TWO GENUINELY DISTINCT
// SOURCE FILES into one node and loses the fact that the target shipped both.
//
// So directory nodes merge on a BYTE-IDENTICAL label and nothing weaker, and a
// leaf never merges at all: it is keyed by `(label, sourcesIndex)`, so two rows
// that normalise to the same display path render as two nodes and each carries
// its own index. The operator sees two `app.js` entries and can tell them apart
// by opening either.

/** A node under construction. The mutable half, private to one build. */
type Building = {
  key: string;
  label: string;
  sourcesIndex: number;
  climbs: number;
  clampedClimbs: number;
  truncated: boolean;
  kind: "root" | "directory" | "source";
  children: Building[];
};

function freezeNode(node: Building, duplicate: boolean): SourceTreeNode {
  const notes: SourceTreeNote[] = [];
  // ONE NOTE FOR EVERY RESOLVED CLIMB, not only for the ones refused at the
  // root. Both cases are the same fact from the operator's side: the node's
  // rendered position was COMPUTED from a climb rather than read off the
  // string, so comparing the position against the developer's real layout
  // needs the verbatim entry the viewer header shows. `clampedClimbs` is
  // carried separately for the harder half — how many climbs hit the floor.
  if (node.climbs > 0) notes.push("path-clamped");
  if (node.truncated) notes.push("label-truncated");

  const labels = new Map<string, number>();
  for (const child of node.children) {
    labels.set(child.label, (labels.get(child.label) ?? 0) + 1);
  }

  return Object.freeze({
    key: node.key,
    label: node.label,
    sourcesIndex: node.sourcesIndex,
    degraded: notes.length > 0,
    notes: Object.freeze(notes),
    climbs: node.climbs,
    clampedClimbs: node.clampedClimbs,
    duplicate,
    kind: node.kind,
    children: Object.freeze(
      node.children.map((child) =>
        freezeNode(child, (labels.get(child.label) ?? 0) > 1),
      ),
    ),
  });
}

/**
 * The display tree, from the verbatim `sources` strings.
 *
 * PURE. Takes rows, returns nodes, mutates nothing. The rows arrive in the
 * map's own `sources` declaration order — which is EVIDENCE rather than a
 * presentation choice, the order the developer's bundler declared — and that
 * order is preserved within every parent. The tree is never sorted here and the
 * column is not sortable, for the reason 05-UI-SPEC.md gives about presenting a
 * subset as the whole set.
 *
 * A row whose `sourcesVerbatim` is `null` is a hole the map declared. It is
 * rendered as a node with an empty label at the root rather than dropped: a row
 * that vanishes from the tree is a row the operator believes does not exist,
 * and the index is still openable.
 */
export function buildSourceTree(
  rows: readonly SourceTreeInputRow[],
): readonly SourceTreeNode[] {
  const roots: Building[] = [];
  const rootByLabel = new Map<string, Building>();
  let nextKey = 0;
  const key = (): string => `n${String(nextKey++)}`;

  for (const row of rows) {
    const verbatim = row.sourcesVerbatim ?? "";
    const { rootLabel, remainder } = classify(verbatim);
    const resolved = resolveClimbs(splitSegments(remainder));

    let siblings = roots;
    if (rootLabel !== null) {
      const existing = rootByLabel.get(rootLabel);
      if (existing === undefined) {
        const created: Building = {
          key: key(),
          label: forCellText(rootLabel),
          sourcesIndex: row.sourceIndex,
          climbs: 0,
          clampedClimbs: 0,
          truncated: false,
          kind: "root",
          children: [],
        };
        rootByLabel.set(rootLabel, created);
        roots.push(created);
        siblings = created.children;
      } else {
        siblings = existing.children;
      }
    }

    // The interior segments become directories, merged on a byte-identical
    // label. The FINAL segment becomes the source node and is never merged.
    const display = resolved.segments.map(displaySegment);
    for (let depth = 0; depth + 1 < display.length; depth++) {
      const segment = display[depth];
      let directory = siblings.find(
        (candidate) =>
          candidate.kind === "directory" && candidate.label === segment.label,
      );
      if (directory === undefined) {
        directory = {
          key: key(),
          label: segment.label,
          sourcesIndex: row.sourceIndex,
          climbs: 0,
          clampedClimbs: 0,
          truncated: segment.truncated,
          kind: "directory",
          children: [],
        };
        siblings.push(directory);
      }
      siblings = directory.children;
    }

    // THE CLIMB IS RECORDED ON THE LEAF, ALWAYS. The leaf is the node whose
    // POSITION moved and the node the operator opens; a directory is shared
    // between rows, so recording a climb there would attribute one row's
    // history to another row's ancestor — or lose it entirely when the
    // directory already existed.
    const last = display[display.length - 1];
    siblings.push({
      key: key(),
      label: last?.label ?? "",
      sourcesIndex: row.sourceIndex,
      climbs: resolved.climbs,
      clampedClimbs: resolved.clampedClimbs,
      truncated: last?.truncated ?? false,
      kind: "source",
      children: [],
    });
  }

  const rootLabels = new Map<string, number>();
  for (const node of roots) {
    rootLabels.set(node.label, (rootLabels.get(node.label) ?? 0) + 1);
  }
  return Object.freeze(
    roots.map((node) =>
      freezeNode(node, (rootLabels.get(node.label) ?? 0) > 1),
    ),
  );
}

/**
 * The flattened visible-node list the scroller renders.
 *
 * A COLLAPSED NODE'S CHILDREN ARE ABSENT FROM THE LIST, not hidden with a
 * class: `RecycleScroller` computes its geometry from the item count, and rows
 * it must not paint are rows it must not be handed.
 *
 * @param expandedKeys the keys of the directory and root nodes that are open.
 */
export function flattenSourceTree(
  nodes: readonly SourceTreeNode[],
  expandedKeys: ReadonlySet<string>,
): readonly SourceTreeRow[] {
  const rows: SourceTreeRow[] = [];
  const walk = (list: readonly SourceTreeNode[], depth: number): void => {
    for (const node of list) {
      rows.push({
        node,
        depth,
        indentDepth: Math.min(depth, SOURCE_TREE_MAX_INDENT_DEPTH),
      });
      if (node.children.length > 0 && expandedKeys.has(node.key)) {
        walk(node.children, depth + 1);
      }
    }
  };
  walk(nodes, 0);
  return rows;
}

/**
 * Every key in the forest that has children — the "expand everything" set.
 *
 * Exported so a caller can open the tree without walking it itself, which is
 * the only way the component can avoid holding a second, drifting copy of the
 * structure.
 */
export function expandableKeys(
  nodes: readonly SourceTreeNode[],
): ReadonlySet<string> {
  const keys = new Set<string>();
  const walk = (list: readonly SourceTreeNode[]): void => {
    for (const node of list) {
      if (node.children.length > 0) {
        keys.add(node.key);
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return keys;
}
