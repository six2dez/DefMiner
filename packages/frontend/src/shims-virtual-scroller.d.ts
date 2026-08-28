// Types for `vue-virtual-scroller@2.0.0-beta.8`, which ships none.
//
// The package has no `types` field and no bundled `.d.ts` — verified against the
// installed dist this session. Without this declaration `import { RecycleScroller }
// from "vue-virtual-scroller"` is an implicit-any error under both typecheckers,
// and the usual escape (a `// @ts-expect-error` at the import) would switch off
// checking for the ONE prop that has to be right: `item-size`.
//
// DECLARED NARROWLY, ON PURPOSE. Only the props DefMiner passes are named. A
// wider hand-written declaration would be a second, unverified description of a
// component nobody here maintains — and the wider it is, the more of it is
// guesswork that typechecks. `itemSize: number` is the one that matters: it is
// the fixed geometry 05-UI-SPEC.md § "Spacing Scale" makes load-bearing, and it
// is asserted against `TABLE_ROW_HEIGHT_PX` by InventoryTable.spec.ts.
declare module "vue-virtual-scroller" {
  import type { DefineComponent } from "vue";

  export const RecycleScroller: DefineComponent<{
    /** The rows to virtualise. Typed loosely because the component is generic
     *  over the row and this declaration is not the place to invent variance. */
    items: readonly unknown[];
    /** The FIXED item height in CSS pixels. A variable height here degrades the
     *  scroller to its dynamic variant and costs the 10,000-row target. */
    itemSize: number;
    /** The property on each item used as the `:key`. */
    keyField: string;
    /** Pixels of rendered overscan above and below the viewport. */
    buffer?: number;
  }>;
}
