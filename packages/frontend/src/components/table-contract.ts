// packages/frontend/src/components/table-contract.ts — the column contract the
// inventory tables are built against, and the one place the fixed row height is
// turned into a class.
//
// ===========================================================================
// WHY THE ROW HEIGHT NEEDS A SECOND EXPRESSION AND NOT A SECOND NUMBER
// ===========================================================================
// `TABLE_ROW_HEIGHT_PX` (safety/display.ts) is THE number: `RecycleScroller`'s
// `item-size`, the skeleton row's height and every cell's height are all it.
// But a Vue template cannot apply it as a number — it applies a Tailwind class,
// and Tailwind's JIT only emits a utility it can SEE as a literal in the
// scanned source. `h-[${TABLE_ROW_HEIGHT_PX}px]` would scan as nothing and the
// built stylesheet would carry no rule at all, which is the failure mode
// tailwind.config.ts's header already records once: a content glob that matches
// nothing is not an error, it is a page that renders unstyled.
//
// So the class is a LOOKUP KEYED BY THE CONSTANT rather than a second copy of
// it. Change `TABLE_ROW_HEIGHT_PX` to a value with no entry and this module
// throws while it is being imported — before a single row is laid out, and with
// a message naming both halves. The alternative, a `32` written twice, drifts by
// four pixels and the virtualised list loses a row per screen with nothing
// failing.
//
// ===========================================================================
// WHY THE COLUMN CONTRACT IS A TYPE AND NOT A PARAGRAPH
// ===========================================================================
// 05-UI-SPEC.md § "Table contract" binds three things on every entity table:
// the four columns come first in a fixed order, EXACTLY ONE column carries the
// target-controlled value, and every column rendering target-controlled bytes
// obeys R1 and R2. The second of those is the one a person adding a column
// forgets, so {@link assertColumnContract} is a runtime check the concrete
// tables run over their own list — the same argument
// `@defminer/engine/contract`'s `EntityRowBase` makes for stating it on a type
// rather than in prose.

import { TABLE_ROW_HEIGHT_PX } from "../safety/display";

/**
 * The fixed height of one RECOVERED SOURCE LINE, in CSS pixels — the second
 * row height on this page, and a SIBLING of {@link TABLE_ROW_HEIGHT_PX} rather
 * than a change to it.
 *
 * ONE NUMBER IN ONE PLACE, AGAIN, AND A SECOND NUMBER BECAUSE THERE ARE TWO
 * SURFACES. The tables and the source TREE render at 32px; the source VIEWER
 * renders code, where 24px is the line height a monospaced 14px face wants and
 * where a 32px row would waste a third of a column the operator is reading a
 * file in. `TABLE_ROW_HEIGHT_PX` is byte-unchanged and stays THE number for
 * every list on this page — plan 07-08's viewer scroller binds `item-size` to
 * this one, and plan 07-07's tree binds it to that one.
 *
 * WHAT MUST NOT HAPPEN IS A THIRD, UNNAMED NUMBER AT A CALL SITE. A
 * `RecycleScroller` handed a literal that disagrees with the class its rows
 * carry drifts by the difference every screen, and nothing fails.
 */
export const SOURCE_LINE_HEIGHT_PX = 24;

/**
 * The Tailwind utilities that produce the two fixed row heights.
 *
 * Keyed by the constants, never restated beside them. `h-8` is the `xl` value
 * in 05-UI-SPEC.md § "Spacing Scale", which is the same 32px; `h-6` is the `lg`
 * value, the same 24px, and it is written here AS A LITERAL for the reason this
 * file's header gives and the resolver's own message repeats — Tailwind's JIT
 * only emits a utility it can see spelled out in the scanned source, so an
 * interpolated arbitrary height scans as nothing and the built stylesheet
 * carries no rule.
 *
 * TWO ENTRIES, ONE MAP. A second map would be a second place for a number and
 * its class to part company, which is the whole defect this lookup prevents.
 */
const ROW_HEIGHT_CLASSES: Readonly<Record<number, string>> = Object.freeze({
  24: "h-6",
  32: "h-8",
});

/**
 * The Tailwind row-height class for a fixed pixel height.
 *
 * THROWS RATHER THAN FALLS BACK. A missing entry means the number and the class
 * have parted company, and a fallback would render rows at one height while the
 * scroller computed geometry at another — a drift that produces no error and
 * misplaces a row per screen.
 *
 * FACTORED OUT OF ITS FORMER IIFE BY PLAN 07-07 rather than copied for the
 * second height. The message is the part that matters and it is stated once: a
 * copy of it beside a second constant stops matching the first the moment
 * either is edited.
 *
 * EXPORTED SO ITS FAILING PATH CAN BE EXECUTED. A gate whose failure path has
 * never run is a gate nobody has tested — `frontend-safety.spec.ts` states that
 * rule for itself and builds its whole fixture block around it. The two
 * constants below take the succeeding path at import; `display.spec.ts` drives
 * this one with an unregistered height and asserts the message, which is the
 * same demonstration as deleting a map entry by hand without leaving the
 * deletion in the tree.
 *
 * @internal
 */
export function rowHeightClass(heightPx: number): string {
  const found = ROW_HEIGHT_CLASSES[heightPx];
  if (found === undefined) {
    throw new Error(
      `table-contract: a fixed row height of ${String(heightPx)}px is in use ` +
        `but no Tailwind utility is registered for it. Add the class to ` +
        `ROW_HEIGHT_CLASSES as a LITERAL — Tailwind's JIT only emits a utility ` +
        `it can see spelled out in the scanned source, so an interpolated ` +
        `h-[${String(heightPx)}px] would emit nothing and the table ` +
        `would render unstyled without failing.`,
    );
  }
  return found;
}

/** The table and tree row-height class, resolved from
 *  {@link TABLE_ROW_HEIGHT_PX} at import. */
export const ROW_HEIGHT_CLASS: string = rowHeightClass(TABLE_ROW_HEIGHT_PX);

/** The source-viewer line-height class, resolved from
 *  {@link SOURCE_LINE_HEIGHT_PX} at import. Same lookup, same throw, same
 *  literal requirement — see {@link rowHeightClass}. Plan 07-08's viewer
 *  scroller is what consumes it. */
export const SOURCE_LINE_HEIGHT_CLASS: string = rowHeightClass(
  SOURCE_LINE_HEIGHT_PX,
);

/**
 * The classes every cell carries, target-controlled or not.
 *
 * `whitespace-pre` and `overflow-hidden` are what keep the row at
 * {@link TABLE_ROW_HEIGHT_PX}: a value containing a newline would otherwise
 * grow the row, and a variable row height degrades `RecycleScroller` to its
 * dynamic variant and costs the 10,000-row target outright. That is why
 * truncation on this surface is mandatory rather than cosmetic.
 *
 * A TARGET-CONTROLLED cell carries `safety/display.ts`'s `CELL_TEXT_CLASS`
 * instead, which is these two plus the mandatory `font-mono`.
 */
export const CELL_CLASS = "whitespace-pre overflow-hidden";

/**
 * The accent focus ring — accent use #3 of the five 05-UI-SPEC.md § "Color"
 * reserves. Every interactive element on this surface carries it: a
 * 10,000-row triage surface is a keyboard surface.
 */
export const FOCUS_RING_CLASS = "focus:ring-2 focus:ring-primary-500";

/**
 * The 2px left-edge bar on the selected row — accent use #4, and the ONLY
 * accent this table paints on a row.
 *
 * Deliberately spelled with `border-primary-500` rather than the ring token, so
 * "how many elements carry the row accent" is a question a spec can answer by
 * counting one class. No sort indicator, filter chip, header or row hover
 * carries an accent; 05-UI-SPEC.md's not-list names all four.
 */
export const SELECTED_ROW_ACCENT_CLASS = "border-l-2 border-primary-500";

/**
 * One column of an inventory table.
 *
 * `text` returns a plain string for EVERY column including the target-controlled
 * one — the shell decides what happens to it. A column cannot hand the shell
 * markup, a node or an element, which is what keeps R1's "text, never markup"
 * a property of the shape rather than a rule each table has to remember.
 */
export type ColumnDefinition<TRow> = {
  /** Stable identifier. Names the per-column slot (`cell-{id}`) and the DOM id. */
  readonly id: string;
  /** DefMiner-authored header text. Never target-controlled. */
  readonly label: string;
  /** The Tailwind width utility. A literal, so Tailwind's JIT can see it. */
  readonly widthClass: string;
  /**
   * TARGET-CONTROLLED — the bytes came off the wire from a possibly hostile
   * host. EXACTLY ONE column per table sets this (asserted by
   * {@link assertColumnContract}); the shell routes it through
   * `safety/display.ts`'s `forCell` and renders it in `font-mono`.
   */
  readonly targetControlled: boolean;
  /**
   * The server-side sort key this column offers, or `null` when the column is
   * not sortable.
   *
   * NULL IS NOT "SORT IT HERE INSTEAD". Client-side sorting is banned by
   * 05-UI-SPEC.md § "Table contract": the resident window is at most 2,000 rows
   * out of a set that can be ten thousand, so arranging the residents would
   * arrange a SUBSET and present it as the whole set.
   */
  readonly sortKey: string | null;
  /** The cell's text. Pure — called during render, once per visible row. */
  readonly text: (row: TRow) => string;
};

/**
 * The column contract, checked rather than remembered.
 *
 * Returns the list so a concrete table can write
 * `const COLUMNS = assertColumnContract([...])` and get the check for free at
 * module load, which is before the first row is fetched.
 */
export function assertColumnContract<TRow>(
  table: string,
  columns: readonly ColumnDefinition<TRow>[],
): readonly ColumnDefinition<TRow>[] {
  const targetControlled = columns.filter((column) => column.targetControlled);
  if (targetControlled.length !== 1) {
    throw new Error(
      `${table}: 05-UI-SPEC.md § "Table contract" binds EXACTLY ONE ` +
        `target-controlled column per table, but ${String(targetControlled.length)} ` +
        `are marked (${targetControlled.map((c) => c.id).join(", ") || "none"}). ` +
        `A second one added without R1/R2 applied is threat T-05-15; zero means ` +
        `the column that carries the host's bytes is not being routed through ` +
        `safety/display.ts at all.`,
    );
  }

  const ids = new Set<string>();
  for (const column of columns) {
    if (ids.has(column.id)) {
      throw new Error(
        `${table}: duplicate column id \`${column.id}\`. Ids name the per-column ` +
          `slot, so two columns sharing one would silently render the same cell twice.`,
      );
    }
    ids.add(column.id);
  }

  return columns;
}

/**
 * Thousands separators, applied by hand.
 *
 * NOT `toLocaleString`, for the reason `safety/display.ts`'s private `grouped`
 * gives beside its own copy: it reads differently under a different locale and
 * these strings are compared literally by specs. It is also the kind of
 * dependency that is present in the renderer and absent in QuickJS.
 *
 * EXPORTED BY PLAN 05-12 rather than copied a third time. It was inlined in
 * {@link counted} until the health strip needed the same grouping without a
 * noun; `display.ts` keeps its own copy because that module is the safety layer
 * and importing a components-level contract into it would invert the layering
 * for five characters of regex.
 */
export function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * A count with its noun in agreement — "1 secret", "3,412 secrets".
 *
 * 05-UI-SPEC.md § "UI Considerations" (zero-one-many / findings-table) forbids
 * the parenthesised suffix outright: counts are never rendered as "1 secret(s)".
 */
export function counted(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${groupThousands(count)} ${count === 1 ? singular : plural}`;
}

/**
 * A DefMiner-formatted timestamp — `YYYY-MM-DD HH:MM:SS`, UTC.
 *
 * DECLARED HERE, ONCE, RATHER THAN COPIED A THIRD TIME. `ArtifactsTable.vue`
 * and `ObservationsTable.vue` each carry a private copy of this one line; plan
 * 07-08 needed a third for the two producibility tombstone sentences, and three
 * copies of a format is how one of them comes to disagree with the other two
 * about a timezone. The two pre-existing copies are NOT rewritten by that plan
 * — they are outside its scope and are recorded in `deferred-items.md` — but
 * nothing new copies the line.
 *
 * `toISOString` and not `toLocaleString`: the copy contract calls this a
 * DefMiner-FORMATTED date, and a locale-sensitive one reads differently on two
 * operators' machines and cannot be compared byte-for-byte by a spec.
 */
export function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}
