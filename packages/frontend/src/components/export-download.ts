// packages/frontend/src/components/export-download.ts — decision D-04's
// mechanism, and the two DOM reaches the export dialog needs.
//
// ===========================================================================
// WHY THIS IS A MODULE AND NOT SIX LINES INSIDE THE COMPONENT
// ===========================================================================
// Two reasons, and the second is the load-bearing one. It keeps the dialog's
// assembly loop testable without a DOM that can download — a spec injects its
// own delivery and asserts what was assembled, rather than mocking the browser.
// And it puts the browser reaches in a `.ts` file, which is where this package
// already keeps them: `safety/display.ts`'s `copyToClipboard` declares the
// clipboard STRUCTURALLY off `globalThis` for the same reason it does here —
// the lint program (tsconfig.eslint.json) carries no DOM lib, so naming `Blob`,
// `URL` or `HTMLAnchorElement` reports as an unsupported Node builtin.
//
// ===========================================================================
// NOTHING HERE NAMES A LOCATION ON A SERVER, AND THAT IS THE POINT
// ===========================================================================
// The backend returns BYTES. This module turns them into a download onto the
// operator's own machine. No path is sent, none is received, and none is
// constructed — which is what makes the export behave identically on a desktop
// install, a remote command-line install and a container, and what keeps a raw
// export off shared server disk (decision D-04).

import type { ExportRedactionMode } from "@defminer/engine/contract";

/** The bytes a finished export hands to the browser. */
export type ExportFile = {
  readonly filename: string;
  readonly contentType: string;
  readonly text: string;
};

/**
 * The browser-side surface this module touches, declared STRUCTURALLY.
 *
 * Every member is optional, and that is what makes the absent path REACHABLE
 * rather than assumed — the same shape `safety/display.ts` uses.
 */
type DownloadDom = {
  Blob?: new (parts: string[], options: { type: string }) => object;
  URL?: {
    createObjectURL(blob: object): string;
    revokeObjectURL(url: string): void;
  };
  document?: {
    createElement(tag: string): {
      href: string;
      download: string;
      click(): void;
    };
    getElementById(id: string): { focus?: () => void } | null;
  };
};

/**
 * The host, as the shape above.
 *
 * THE HOP THROUGH `unknown` IS NOT CEREMONY. Two TypeScript programs read this
 * file and they disagree about `globalThis`: the package typecheck carries the
 * DOM lib and the lint program (tsconfig.eslint.json) does not, so a direct
 * `globalThis as DownloadDom` is REQUIRED by one and reported as an unnecessary
 * assertion by the other. Widening to `unknown` first is true under both.
 */
function dom(): DownloadDom {
  const host: unknown = globalThis;
  return host as DownloadDom;
}

/**
 * The browser download. THE WHOLE OF D-04's MECHANISM.
 *
 * A Blob, an object URL, a synthetic anchor carrying the backend's filename, a
 * click, and the URL revoked.
 *
 * THE ANCHOR IS NOT AN R1 VIOLATION, and the difference is worth stating
 * because the shape looks like one. R1 forbids offering an EXTRACTED url as a
 * destination: an extracted url is data to be displayed. This one is minted from
 * bytes this bundle assembled, and the filename is DefMiner-authored on the
 * backend from no target byte at all. Neither is target-controlled.
 */
export function browserDownload(file: ExportFile): void {
  const { Blob: BlobCtor, URL: urls, document: doc } = dom();
  if (BlobCtor === undefined || urls === undefined || doc === undefined) {
    // A THROW RATHER THAN A SILENT NO-OP. A download that quietly did nothing
    // would leave the operator believing a file was written.
    throw new Error(
      "Download unavailable: this host has no Blob, URL or document. " +
        "DefMiner deliberately has no server-side fallback — decision D-04 is " +
        "that an export is a download onto the operator's own machine and that " +
        "no file is ever written on the Caido server.",
    );
  }
  const blob = new BlobCtor([file.text], { type: file.contentType });
  const url = urls.createObjectURL(blob);
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  urls.revokeObjectURL(url);
}

/**
 * One redaction radio's element id.
 *
 * BUILT FROM THE CONTRACT'S OWN MEMBER NAME, which is what keeps "pre-selected"
 * and "focused" the SAME option mechanically rather than by two literals that
 * happen to agree today. The dialog focuses
 * `redactionRadioId(EXPORT_REDACTION_MODES[0])` — the same `[0]` it initialises
 * the selection from.
 */
export function redactionRadioId(option: ExportRedactionMode): string {
  return `defminer-export-redaction-${option}`;
}

/** Focus an element by id, through the structural document. A no-op where there
 *  is no document, which is a real state in a non-browser host rather than an
 *  error worth throwing over. */
export function focusById(id: string): void {
  dom().document?.getElementById(id)?.focus?.();
}
