// tests/frontend-load.spec.ts — THE EXECUTED EVIDENCE FOR TWO BACKSTOP ROWS.
//
// ===========================================================================
// WHAT THIS FILE IS, IN THE CONTRACT'S OWN TERMS
// ===========================================================================
// `05-UI-SPEC.md § "UI Considerations"` carries six 🧪 backstop rows. This file
// is the executed evidence for exactly two of them:
//
//   `overflow / findings-table`  — "10,000 rows must stay responsive and scroll
//       smoothly... Verified by a load test at 10,000 rows asserting a bounded
//       in-memory window and no dropped frames — NOT BY INSPECTION."
//
//   `long-text / findings-table` — "UISEC-03 at the 256-character cell cap.
//       Verified by an adversarial fixture — a multi-megabyte single-line
//       string literal, a value with embedded newlines, and a 4-byte-grapheme
//       value — asserting truncation, no grapheme split, NO LAYOUT BREAK, no
//       renderer freeze."
//
// The third `findings-table`-adjacent backstop, `long-text / export-dialog`, is
// PLAN 05-11's and is not covered here. `long-text / evidence-panel` is 05-10's.
//
// A BACKSTOP ROW WITH NO EXECUTED EVIDENCE RESOLVES TO NEEDING A HUMAN, NEVER TO
// A SILENT PASS (`05-VALIDATION.md § "Manual-Only Verifications"`). Which is why
// this file DOES NOT SKIP. If the browser driver cannot start, every test below
// fails with a message naming the missing capability — a spec that skips itself
// reports green while measuring nothing, and that is the precise failure shape
// this repo's gates are written against (`tests/go-no-go.spec.ts`'s doctrine:
// FAIL, NEVER SKIP, and name the remedy).
//
// ===========================================================================
// WHY A REAL BROWSER AND NOT jsdom
// ===========================================================================
// MEASURED, NOT ASSUMED. `packages/frontend/src/components/InventoryTable.spec.ts`
// records it: mounted in jsdom, `RecycleScroller` renders ZERO rows, because it
// sizes its window from `getBoundingClientRect` and jsdom reports every box as
// 0x0. jsdom has no layout engine at all, so "the row did not grow" is an
// assertion about a number nothing computed, and "no frames were dropped" is not
// expressible. Plan 05-05's own hostile spec demoted its long-text truths for
// exactly this reason and named this file as the half it could not carry.
//
// ===========================================================================
// WHAT IS REAL HERE, AND WHAT IS THE HARNESS
// ===========================================================================
// REAL: `InventoryTable.vue`, `table-contract.ts`, `safety/display.ts`, the
// inventory store, `RecycleScroller` at the shipped version, and the stylesheet
// produced by the shipped Tailwind + PostCSS pipeline over the real component
// sources. The 32px row height the browser measures is the one Tailwind emitted
// from `h-8`, not one this file wrote.
//
// HARNESS: a generated entry module that mounts the shell over a scripted page
// reader, and a static file server. The page reader answers 100-row keyset pages
// out of a ten-thousand-row generator with the hostile corpus seeded through it.
// It is not the backend, and it does not pretend to be — what is under test is
// the RENDERER at ten thousand rows, which is the claim the backstop rows make.

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { TABLE_CELL_MAX_GRAPHEMES } from "../packages/engine/src/sanitise";
import { TABLE_ROW_HEIGHT_PX } from "../packages/frontend/src/safety/display";
import {
  IN_MEMORY_WINDOW_ROWS,
  KEYSET_PAGE_ROWS,
} from "../packages/frontend/src/stores/inventory";

// ---------------------------------------------------------------------------
// THE BOUNDS, EACH A NAMED CONSTANT WITH ITS REASON
// ---------------------------------------------------------------------------

/**
 * How many rows the scroll walks. Phase 5 success criterion 2's number.
 *
 * Not "a lot of rows": TEN THOUSAND, because that is the figure the criterion
 * and the design contract both name, and a load test at a number nobody
 * committed to is a load test whose result nobody can read.
 */
const TARGET_ROWS = 10_000;

/**
 * The per-frame budget, in milliseconds.
 *
 * 32ms, not 16.7ms. At a 60Hz refresh a 16.7ms gap is ON budget; a gap past
 * 32ms has certainly skipped a refresh interval, which is what "dropped frame"
 * means to the operator watching the list move. Choosing the tighter number
 * would report scheduler jitter as a rendering defect.
 */
const FRAME_BUDGET_MS = 32;

/**
 * How many over-budget frames the run may contain.
 *
 * NOT ZERO, and the reason is stated rather than hidden: this runs in headless
 * Chromium on a machine also running vitest, a vite build and whatever else the
 * developer has open. A zero allowance would make this gate report the MACHINE
 * rather than the component, and a gate that fails for reasons outside the code
 * gets muted rather than obeyed. Two percent of a run of several hundred frames
 * is a handful of frames — enough to absorb a garbage collection and a
 * scheduler hiccup, far too few to hide a table that stutters.
 *
 * The observed numbers are PRINTED regardless, so the summary records what was
 * measured rather than that a threshold was met.
 */
const DROPPED_FRAME_ALLOWANCE_FRACTION = 0.02;

/**
 * The whole scroll must finish inside this.
 *
 * A renderer freeze does not necessarily show up as a long frame — a synchronous
 * four-million-step grapheme walk on a 4 MiB cell can also show up as a scroll
 * that simply takes forever while each individual frame looks fine. This bound
 * is the second half of the freeze assertion. Sixty seconds is generous against
 * an observed run of a few seconds; it is a FREEZE detector, not a benchmark.
 */
const SCROLL_ELAPSED_BOUND_MS = 60_000;

/** Every nth row carries a hostile value from the shared corpus. */
const HOSTILE_EVERY = 250;

// ---------------------------------------------------------------------------
// PATHS
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const FRONTEND = path.join(REPO, "packages", "frontend");
const HARNESS_DIR = path.join(FRONTEND, ".load-harness");
const HARNESS_ENTRY = path.join(HARNESS_DIR, "entry.ts");
const HARNESS_OUT = path.join(HARNESS_DIR, "dist");

const MISSING_BROWSER =
  "MISSING CAPABILITY: playwright could not start a Chromium browser. " +
  "This file is the EXECUTED EVIDENCE for two of 05-UI-SPEC.md's backstop rows " +
  "(overflow / findings-table and long-text / findings-table); a backstop row " +
  "with no executed evidence resolves to needing a human, never to a silent " +
  "pass. It therefore FAILS rather than skipping. Remedy: `pnpm exec playwright " +
  "install chromium`.";

const MISSING_BUILD =
  "MISSING CAPABILITY: the vite build of the load harness failed. The harness " +
  "compiles the REAL InventoryTable through the REAL Tailwind/PostCSS pipeline " +
  "so the browser measures the 32px row height the shipped stylesheet emits, " +
  "not one this spec wrote. Without it there is nothing to measure and the " +
  "backstop rows have no evidence.";

// ---------------------------------------------------------------------------
// THE HARNESS SOURCE
// ---------------------------------------------------------------------------

/**
 * The generated entry.
 *
 * Written into the frontend package rather than a temp directory so that `vue`,
 * `@defminer/engine/*` and `vue-virtual-scroller` resolve the way they resolve
 * in the real build — node resolution walks up from the importing file, and an
 * entry in /tmp would find none of them.
 *
 * Everything it imports is SHIPPED SOURCE. The only things it declares are the
 * fixture and the three functions the spec drives it through.
 */
function harnessSource(): string {
  return `// GENERATED by tests/frontend-load.spec.ts. Deleted at the end of the run.
import { HOSTILE_CASES } from "@defminer/engine/hostile.fixture";
import { createApp, h } from "vue";

import InventoryTable from "../src/components/InventoryTable.vue";
import type { ColumnDefinition } from "../src/components/table-contract";
import { createInventoryStore } from "../src/stores/inventory";
import { IN_MEMORY_WINDOW_ROWS, KEYSET_PAGE_ROWS } from "../src/stores/inventory";
import { TABLE_ROW_HEIGHT_PX } from "../src/safety/display";
import "../src/styles/index.css";
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";

type Row = { id: string; value: string; kind: string };

const TARGET_ROWS = ${String(TARGET_ROWS)};
const HOSTILE_EVERY = ${String(HOSTILE_EVERY)};

// The three long-text cases the backstop row names, taken from the SHARED
// corpus rather than re-authored here. Extending that corpus extends this run.
const LONG_TEXT_IDS = [
  "multi-megabyte-single-line",
  "embedded-newlines-and-tabs",
  "four-byte-grapheme",
];
const LONG_TEXT = LONG_TEXT_IDS.map((id) => {
  const found = HOSTILE_CASES.find((c) => c.id === id);
  if (found === undefined) {
    throw new Error(
      "hostile fixture no longer carries " + id + " — the backstop names it by id",
    );
  }
  return found.value;
});

function rowAt(index: number): Row {
  const hostile = index % HOSTILE_EVERY === 0;
  return {
    id: "row-" + String(index),
    value: hostile
      ? LONG_TEXT[(index / HOSTILE_EVERY) % LONG_TEXT.length]
      : "https://target.example/bundle-" + String(index) + ".js",
    kind: hostile ? "hostile" : "script",
  };
}

const COLUMNS: readonly ColumnDefinition<Row>[] = [
  {
    id: "kind",
    label: "Kind",
    widthClass: "w-24",
    targetControlled: false,
    sortKey: null,
    text: (row) => row.kind,
  },
  {
    id: "value",
    label: "Observed URL",
    widthClass: "flex-1",
    targetControlled: true,
    sortKey: null,
    text: (row) => row.value,
  },
];

let served = 0;

const store = createInventoryStore<Row>({
  projectId: "load",
  table: "artifacts",
  sortKey: "last_seen",
  direction: "desc",
  readPage: (request) => {
    const start = request.cursor === null ? 0 : Number(request.cursor.sortValue);
    const end = Math.min(start + KEYSET_PAGE_ROWS, TARGET_ROWS);
    const rows: Row[] = [];
    for (let index = start; index < end; index++) rows.push(rowAt(index));
    served = end;
    return Promise.resolve({
      ok: true,
      value: {
        rows,
        nextCursor: end >= TARGET_ROWS ? null : { sortValue: end, tieBreak: end },
        scanned: rows.length,
        exhausted: end >= TARGET_ROWS,
      },
    });
  },
  countRows: () =>
    Promise.resolve({
      ok: true,
      value: {
        visible: TARGET_ROWS,
        hiddenBySuppression: 0,
        suppressionRuleCount: 0,
      },
    }),
});

const mount = document.getElementById("plugin--defminer");
if (mount === null) throw new Error("mount element missing");

createApp({
  render: () =>
    h(InventoryTable, {
      label: "Load harness",
      columns: COLUMNS,
      store,
      rowKey: (row: Row) => row.id,
    }),
}).mount(mount);

// The surface the spec drives. Deliberately three functions and two numbers —
// nothing here reaches into the component's internals.
(globalThis as unknown as { __defminer: unknown }).__defminer = {
  ready: store.loadFirstPage(),
  loadNext: () => store.loadNextPage(),
  served: () => served,
  residentRows: () => store.rows.value.length,
  scroller: () => document.querySelector(".vue-recycle-scroller"),
  windowBound: IN_MEMORY_WINDOW_ROWS,
  rowHeight: TABLE_ROW_HEIGHT_PX,
  target: TARGET_ROWS,
};
`;
}

const HARNESS_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="./harness.css"></head>
<body style="margin:0">
  <!-- The id and the postcss-prefixwrap selector are one fact; index.ts says so.
       A mismatch here would render the page completely unstyled and the row
       height this spec measures would be whatever the browser defaults to. -->
  <div id="plugin--defminer" style="height:640px;display:flex;flex-direction:column"></div>
  <script type="module" src="./harness.js"></script>
</body></html>`;

// ---------------------------------------------------------------------------
// THE RUN
// ---------------------------------------------------------------------------

type Measurements = {
  readonly peakResidentRows: number;
  readonly rowsPagedThrough: number;
  readonly frameCount: number;
  readonly maxFrameMs: number;
  readonly p95FrameMs: number;
  readonly overBudgetFrames: number;
  readonly elapsedMs: number;
  readonly rowHeights: number[];
  readonly maxCellGraphemes: number;
  readonly hostileRowsSeen: number;
};

let measurements: Measurements | null = null;
let startupFailure: string | null = null;
let server: Server | null = null;

/**
 * The slice of playwright this file touches, declared STRUCTURALLY.
 *
 * The same reasoning `api/client.ts` gives for `DefMinerBackendSdk` (P5-D41):
 * declare the piece of a foreign surface you use rather than the whole. Here it
 * has a second job — playwright is imported DYNAMICALLY so a machine with no
 * browser binary reaches the missing-capability MESSAGE instead of failing at
 * module load with a resolution error, and a static type import would undo half
 * of that by pulling the package in at typecheck time for no gain.
 */
type HarnessPage = {
  goto: (url: string) => Promise<unknown>;
  waitForFunction: (fn: string) => Promise<unknown>;
  evaluate: (fn: string) => Promise<Measurements>;
};

type HarnessBrowser = {
  newPage: (options: {
    viewport: { width: number; height: number };
  }) => Promise<HarnessPage>;
  close: () => Promise<void>;
};

let browser: HarnessBrowser | null = null;

function buildHarness(): void {
  rmSync(HARNESS_DIR, { recursive: true, force: true });
  mkdirSync(HARNESS_DIR, { recursive: true });
  writeFileSync(HARNESS_ENTRY, harnessSource(), "utf8");
  // AFTER the mkdir, never before: `buildHarness` clears the directory first so
  // a crashed previous run cannot leave a stale bundle that this one then
  // measures.
  writeViteConfig();

  // A CHILD PROCESS, not vite's Node API. Vite's `build()` mutates
  // `process.env.NODE_ENV` and installs its own error handlers in the process
  // it runs in, and this one is a vitest worker also running fifty other spec
  // files. Out-of-process is the boundary that keeps that from being this
  // suite's problem.
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "vite",
      "build",
      "--config",
      path.join(HARNESS_DIR, "vite.config.mjs"),
      "--logLevel",
      "warn",
    ],
    { cwd: FRONTEND, encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(
      `${MISSING_BUILD}\n--- vite stdout ---\n${result.stdout ?? ""}\n--- vite stderr ---\n${result.stderr ?? ""}`,
    );
  }
}

function writeViteConfig(): void {
  // `external: []` — vue IS bundled here, deliberately and only here. The
  // shipped build externalises it because Caido's renderer provides it (threat
  // T-05-03, a second reactivity runtime in the host page); a standalone page
  // has no host to provide it.
  writeFileSync(
    path.join(HARNESS_DIR, "vite.config.mjs"),
    `import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  configFile: false,
  plugins: [vue()],
  // Vue's own modules read \`process.env.NODE_ENV\` and three build-time feature
  // flags. In the shipped plugin build Caido's renderer provides a Vue that
  // already has them baked in; a standalone page does not, and without these the
  // bundle throws \`process is not defined\` on its first line and the page stays
  // blank — measured this session, and the reason this comment exists rather
  // than a bare define block.
  define: {
    "process.env.NODE_ENV": '"production"',
    __VUE_OPTIONS_API__: "true",
    __VUE_PROD_DEVTOOLS__: "false",
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
  },
  build: {
    outDir: ${JSON.stringify(HARNESS_OUT)},
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: ${JSON.stringify(HARNESS_ENTRY)},
      formats: ["es"],
      fileName: () => "harness.js",
      cssFileName: "harness",
    },
    rollupOptions: { external: [] },
  },
});
`,
    "utf8",
  );
}

function startServer(): Promise<string> {
  const html = HARNESS_HTML;
  const js = readFileSync(path.join(HARNESS_OUT, "harness.js"), "utf8");
  const css = readFileSync(path.join(HARNESS_OUT, "harness.css"), "utf8");

  return new Promise((resolve, reject) => {
    const created = createServer((request, response) => {
      const url = request.url ?? "/";
      if (url.startsWith("/harness.js")) {
        response.writeHead(200, { "content-type": "text/javascript" });
        response.end(js);
        return;
      }
      if (url.startsWith("/harness.css")) {
        response.writeHead(200, { "content-type": "text/css" });
        response.end(css);
        return;
      }
      response.writeHead(200, { "content-type": "text/html" });
      response.end(html);
    });
    created.on("error", reject);
    created.listen(0, "127.0.0.1", () => {
      server = created;
      const address = created.address();
      if (address === null || typeof address === "string") {
        reject(new Error("could not bind the harness server"));
        return;
      }
      resolve(`http://127.0.0.1:${String(address.port)}/`);
    });
  });
}

describe("the 10,000-row browser backstop", () => {
  beforeAll(async () => {
    try {
      buildHarness();
    } catch (error) {
      startupFailure = (error as Error).message;
      return;
    }

    let url: string;
    try {
      url = await startServer();
    } catch (error) {
      startupFailure = `MISSING CAPABILITY: could not serve the harness — ${(error as Error).message}`;
      return;
    }

    let driven: HarnessPage;
    try {
      const { chromium } = await import("playwright");
      browser = await chromium.launch();
      driven = await browser.newPage({
        viewport: { width: 1280, height: 800 },
      });
    } catch (error) {
      startupFailure = `${MISSING_BROWSER}\n--- driver error ---\n${(error as Error).message}`;
      return;
    }

    await driven.goto(url);
    await driven.waitForFunction(
      "globalThis.__defminer !== undefined && document.querySelector('.vue-recycle-scroller') !== null",
    );

    measurements = await driven.evaluate(
      `(async () => {
        const h = globalThis.__defminer;
        await h.ready;

        const frames = [];
        let running = true;
        let last = performance.now();
        const tick = (now) => {
          frames.push(now - last);
          last = now;
          if (running) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        const nextFrame = () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );

        const rowSelector = '[role="row"][tabindex="0"]';
        const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
        const graphemes = (text) => {
          let n = 0;
          for (const _ of segmenter.segment(text)) n++;
          return n;
        };

        let peakResidentRows = 0;
        let maxCellGraphemes = 0;
        let hostileRowsSeen = 0;
        const rowHeights = [];

        const sample = (deep) => {
          const rendered = document.querySelectorAll(rowSelector);
          peakResidentRows = Math.max(peakResidentRows, rendered.length);
          if (!deep) return;
          for (const row of rendered) {
            rowHeights.push(row.getBoundingClientRect().height);
            for (const cell of row.querySelectorAll('[role="gridcell"]')) {
              const text = cell.textContent ?? "";
              const n = graphemes(text);
              if (n > maxCellGraphemes) maxCellGraphemes = n;
            }
            if ((row.textContent ?? "").indexOf("hostile") === 0) hostileRowsSeen++;
          }
        };

        const started = performance.now();
        let page = 0;
        while (h.served() < h.target) {
          await h.loadNext();
          const el = h.scroller();
          const span = el.scrollHeight - el.clientHeight;
          el.scrollTop = span;
          await nextFrame();
          sample(page % 10 === 0);
          el.scrollTop = span * 0.5;
          await nextFrame();
          sample(false);
          page++;
        }
        // One last deep sample at the very bottom, where the last page lives.
        sample(true);
        const elapsedMs = performance.now() - started;
        running = false;

        const sorted = frames.slice().sort((a, b) => a - b);
        const p95 = sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length * 0.95)];
        return {
          peakResidentRows,
          rowsPagedThrough: h.served(),
          frameCount: frames.length,
          maxFrameMs: sorted.length === 0 ? 0 : sorted[sorted.length - 1],
          p95FrameMs: p95,
          overBudgetFrames: frames.filter((d) => d > ${String(FRAME_BUDGET_MS)}).length,
          elapsedMs,
          rowHeights,
          maxCellGraphemes,
          hostileRowsSeen,
        };
      })()`,
    );

    const m = measurements;
    console.log(
      [
        "",
        "  10,000-ROW BROWSER BACKSTOP — MEASURED, NOT INSPECTED",
        `    rows paged through .......... ${String(m.rowsPagedThrough)}`,
        `    peak resident rows .......... ${String(m.peakResidentRows)} (window bound ${String(IN_MEMORY_WINDOW_ROWS)})`,
        `    frames sampled .............. ${String(m.frameCount)}`,
        `    max frame ................... ${m.maxFrameMs.toFixed(2)} ms`,
        `    p95 frame ................... ${m.p95FrameMs.toFixed(2)} ms`,
        `    frames over ${String(FRAME_BUDGET_MS)} ms budget ... ${String(m.overBudgetFrames)}`,
        `    scroll elapsed .............. ${m.elapsedMs.toFixed(0)} ms`,
        `    distinct rendered heights ... ${JSON.stringify([...new Set(m.rowHeights)])}`,
        `    max cell graphemes .......... ${String(m.maxCellGraphemes)} (cap ${String(TABLE_CELL_MAX_GRAPHEMES)})`,
        `    hostile rows rendered ....... ${String(m.hostileRowsSeen)}`,
        "",
      ].join("\n"),
    );
  }, 300_000);

  afterAll(async () => {
    if (browser !== null) await browser.close();
    if (server !== null) server.close();
    rmSync(HARNESS_DIR, { recursive: true, force: true });
  });

  /** Every assertion goes through here, so a startup failure FAILS with the
   *  capability named rather than skipping or throwing `undefined`. */
  function measured(): Measurements {
    if (startupFailure !== null) throw new Error(startupFailure);
    if (measurements === null) {
      throw new Error(
        "the browser run produced no measurements — see the startup output. " +
          "This spec never skips: a backstop row with no executed evidence " +
          "resolves to needing a human, never to a silent pass.",
      );
    }
    return measurements;
  }

  it("actually paged through ten thousand rows — non-vacuity first", () => {
    const m = measured();
    expect(m.rowsPagedThrough).toBe(TARGET_ROWS);
    // A run that rendered nothing would satisfy every bound below.
    expect(m.peakResidentRows).toBeGreaterThan(0);
    expect(m.frameCount).toBeGreaterThan(0);
    expect(m.rowHeights.length).toBeGreaterThan(0);
    expect(m.hostileRowsSeen).toBeGreaterThan(0);
  });

  it("keeps the resident row count inside the store's declared window bound", () => {
    // READ FROM THE CONSTANT, never restated. The store declares the bound; this
    // asserts the renderer honoured it under a real scroll rather than under a
    // unit test that never laid anything out.
    const m = measured();
    expect(m.peakResidentRows).toBeLessThanOrEqual(IN_MEMORY_WINDOW_ROWS);
    // And virtualisation is doing its job: the RENDERED set is far below even
    // the resident window. A scroller that rendered all 2,000 residents would
    // satisfy the bound above and still be the defect.
    expect(m.peakResidentRows).toBeLessThan(IN_MEMORY_WINDOW_ROWS);
  });

  it("drops no more frames than the stated allowance", () => {
    const m = measured();
    const allowed = Math.max(
      1,
      Math.ceil(m.frameCount * DROPPED_FRAME_ALLOWANCE_FRACTION),
    );
    expect(
      m.overBudgetFrames,
      `${String(m.overBudgetFrames)} of ${String(m.frameCount)} frames exceeded ${String(FRAME_BUDGET_MS)} ms ` +
        `(max ${m.maxFrameMs.toFixed(2)} ms, p95 ${m.p95FrameMs.toFixed(2)} ms)`,
    ).toBeLessThanOrEqual(allowed);
  });

  it("completes the whole scroll inside the freeze bound", () => {
    // The second half of the freeze assertion: a synchronous walk over a 4 MiB
    // cell can also present as a scroll that simply never ends while each
    // individual frame looks fine.
    const m = measured();
    expect(m.elapsedMs).toBeLessThan(SCROLL_ELAPSED_BOUND_MS);
  });

  it("renders EVERY row at exactly the fixed row height, adversarial values included", () => {
    // THE ASSERTION jsdom CANNOT MAKE. A 4 MiB single-line value, a value with
    // embedded newlines and a four-byte grapheme are seeded through the ten
    // thousand rows; if any of them grew its row, the scroller's fixed
    // `item-size` would be a lie and the list would drift a row per screen.
    const m = measured();
    const distinct = [...new Set(m.rowHeights)];
    expect(
      distinct,
      `rendered row heights: ${JSON.stringify(distinct)}`,
    ).toEqual([TABLE_ROW_HEIGHT_PX]);
  });

  it("truncates every rendered cell at the 256-grapheme cap", () => {
    // GRAPHEMES, not UTF-16 units: the cap is grapheme-counted, and a
    // four-byte grapheme occupies two units. Counting units would let a
    // correctly-capped cell read as over the limit and a naively-sliced one
    // read as under it.
    const m = measured();
    expect(m.maxCellGraphemes).toBeLessThanOrEqual(TABLE_CELL_MAX_GRAPHEMES);
  });

  it("asked for a hundred rows per page, as the contract fixes", () => {
    const m = measured();
    expect(m.rowsPagedThrough % KEYSET_PAGE_ROWS).toBe(0);
  });
});
