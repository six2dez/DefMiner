// packages/frontend/src/components/help-contract.ts — every word the Help tab
// renders, and nothing else.
//
// ===========================================================================
// WHY A HELP TAB EXISTS AT ALL
// ===========================================================================
// DefMiner's surfaces are honest but terse, and three of its behaviours are
// genuinely surprising to somebody meeting the plugin for the first time:
//
//   1. A scan can report "Finished · 110 seen" having admitted NOTHING, because
//      every candidate was out of Caido's scope. The number that moves is not
//      the number that matters.
//   2. Coverage is proxy-only. Replay, Automate, workflows and browser-cache
//      hits never reach the passive hook, so an artifact the operator KNOWS the
//      target serves can be legitimately absent.
//   3. Traffic captured while a host was in scope becomes unscannable once that
//      host leaves scope, and no filter reaches it.
//
// Each of those already has copy on its own surface, but the operator only
// reads that copy AFTER the confusing thing has happened. This tab is where
// somebody who has not yet been confused can find out first.
//
// ===========================================================================
// EVERY CLAIM HERE IS A CLAIM ABOUT SHIPPED BEHAVIOUR
// ===========================================================================
// This file is documentation rendered as UI, which makes it the highest-traffic
// place in the plugin for a sentence the code contradicts — this project's
// signature defect class, and the reason `help-contract.spec.ts` pins the
// numbers below against the constants they describe rather than restating them.
// A threshold that moves must fail a test here, not mislead an operator.
//
// NOTHING IN THIS FILE IS INTERPOLATED FROM RUNTIME DATA. The Help tab renders
// static text and takes no props, so no target-controlled string can reach it.

import {
  MAP_MAX_BYTES,
  PASSIVE_MAX_BYTES,
  SCAN_PAGE_SIZE,
} from "@defminer/engine/thresholds";

/**
 * A section of the Help tab: one heading, one or more paragraphs.
 *
 * Deliberately flat. A nested shape would let a future section carry a link or
 * a raw fragment, and the whole point of this surface is that it renders
 * interpolated text nodes and nothing else.
 *
 * @internal
 */
export interface HelpSection {
  /** Anchors the section for the spec and for `data-defminer-help-section`. */
  readonly id: string;
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

/** The tab's own heading. */
export const HELP_HEADING = "How DefMiner works";

/** The one-sentence statement of what the plugin is, before any detail. */
export const HELP_PURPOSE =
  "DefMiner builds an inventory of the JavaScript a target actually served you. It watches proxied responses as you browse, stores each script once by digest, and records every place it was seen. It never sends a request of its own.";

/**
 * Bytes rendered as a whole number of MiB.
 *
 * The thresholds are powers of two, so this is exact for every value it is
 * given today; the spec asserts that rather than trusting it.
 */
function mib(bytes: number): string {
  return `${String(bytes / 1024 / 1024)} MiB`;
}

/**
 * The body of the tab.
 *
 * ORDER IS THE DESIGN. What it does, then what it deliberately does not do,
 * then the three surprises, then the two operations an operator performs, then
 * where the data lives. A reader who stops after two sections has still read
 * the two things most likely to mislead them.
 */
export const HELP_SECTIONS: readonly HelpSection[] = Object.freeze([
  {
    id: "what-it-does",
    heading: "What it does",
    paragraphs: Object.freeze([
      "As you browse through Caido, DefMiner looks at every proxied response. A response is admitted when it is a 2xx, has a body, is under the size ceiling, looks like a script by content type or by a .js or .mjs path, and its host is inside Caido's current scope.",
      "Admitted scripts are hashed and stored once per digest. The same file served from ten URLs is one artifact with ten observations, so the inventory counts distinct scripts rather than requests.",
      "When a script carries an inline source map, DefMiner reconstructs the original sources from it and shows them as a browsable tree. It reads maps embedded in the response as a data: URI — it does not fetch .map files.",
    ]),
  },
  {
    id: "what-it-does-not-do",
    heading: "What it does not do yet",
    paragraphs: Object.freeze([
      "DefMiner does not scan for secrets, endpoints or other findings. The detection engine is a later phase. Today the plugin is an inventory and a source-map reconstructor: it tells you what JavaScript exists and shows you its original source, and you do the finding.",
      "It never makes an outbound request. Every byte it analyses came from traffic Caido already captured, which is why an external source map referenced by URL is counted but never retrieved.",
    ]),
  },
  {
    id: "coverage",
    heading: "Coverage is proxy-only",
    paragraphs: Object.freeze([
      "Only traffic that passes through the proxy reaches DefMiner. Replay, Automate, workflows, plugin-originated sends and anything served from the browser cache do not.",
      "So an absent artifact does not mean the target does not serve it. DefMiner reports what it observed, never everything that exists.",
    ]),
  },
  {
    id: "scope",
    heading: "Caido's scope decides everything",
    paragraphs: Object.freeze([
      "Admission applies Caido's scope with no override of its own. If a host is not in the active scope, its scripts are rejected — during live browsing and during a retroactive scan alike.",
      "This has a consequence worth knowing before it surprises you: traffic captured while a host was in scope becomes unscannable once that host leaves scope. No filter you can write reaches it. The host has to be back in Caido's scope.",
      "If a scan finishes having admitted nothing, the scope is the first thing to check.",
    ]),
  },
  {
    id: "scanning",
    heading: "Scanning traffic you already captured",
    paragraphs: Object.freeze([
      "The Scan tab applies the same analysis to traffic Caido captured before DefMiner was installed, or before you added a host to scope. It walks backwards from now, newest first.",
      "You may add an HTTPQL clause to narrow a scan; it is combined with DefMiner's own filter using AND. You can narrow a scan, never widen it, and the composed filter is shown before you start so you can check that for yourself.",
      "A scan does not reload work already carried to a finished analysis. Anything partial or failed is re-offered, so running a scan again repairs earlier failures rather than cementing them.",
      "There is no percentage. Counting the matching requests would mean transferring every response body, which is the scan itself, so DefMiner reports what it has done rather than guessing what is left.",
      `One scan runs per project at a time, fetching ${String(SCAN_PAGE_SIZE)} requests per page. Pause keeps its position; discard gives that position up.`,
    ]),
  },
  {
    id: "counters",
    heading: "Reading the scan counters",
    paragraphs: Object.freeze([
      "Requests seen is the fastest-moving number and the one that means the walk is walking. It is not a measure of success.",
      "Admitted is what passed the gate. Rejected is what the gate turned away, most often because it was not JavaScript or its host was out of scope. A scan can be entirely healthy and admit nothing at all.",
      "Skipped counts requests already carried to a finished analysis, which DefMiner does not reload.",
    ]),
  },
  {
    id: "limits",
    heading: "Size limits",
    paragraphs: Object.freeze([
      `A response larger than ${mib(PASSIVE_MAX_BYTES)} is not analysed. The backend runs on a single thread and a very large bundle blocks it, so the ceiling protects the responsiveness of Caido itself.`,
      `Source maps have their own, smaller ceiling of ${mib(MAP_MAX_BYTES)}. A map above it is refused rather than truncated, because a partly-read map produces sources that look complete and are not.`,
    ]),
  },
  {
    id: "health",
    heading: "When the page looks frozen",
    paragraphs: Object.freeze([
      "The backend is single-threaded. A large bundle blocks it, and while it is blocked the interface cannot get an answer — which looks exactly like a hung interface.",
      "The Health tab exists to tell those apart. A backend that is working shows a queue depth that moves. If the four numbers there are stuck, the thread is busy or gone; if they move, the backend is fine and simply busy.",
    ]),
  },
  {
    id: "storage",
    heading: "Where the data lives",
    paragraphs: Object.freeze([
      "DefMiner's database lives on the Caido server, not on the machine you are reading this on. On a remote or containerised Caido that is a different disk.",
      "Data is scoped per Caido project. Switching projects switches the inventory, and nothing crosses between them.",
      "Storage is bounded. Old rows are evicted on a retention sweep, so an inventory left running does not grow without limit.",
    ]),
  },
  {
    id: "export",
    heading: "Exporting",
    paragraphs: Object.freeze([
      "Export inventory writes the inventory as a file. It offers a redacted mode, which is pre-selected, and a raw mode behind an explicit confirmation.",
      "Redacted mode withholds query strings from URLs and source labels, replacing them with a marker. Raw mode writes them whole. Choose raw only when you know where the file is going.",
    ]),
  },
] as const);

/**
 * The last line of the tab.
 *
 * It names the project rather than a URL: this text renders inside Caido, where
 * a bare string is not clickable, and a URL nobody can click is noise. The
 * README carries the links.
 */
export const HELP_FOOTER =
  "DefMiner is open source. The project's README covers installation, the full feature list and how to report a problem.";
