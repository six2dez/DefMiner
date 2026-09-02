// @vitest-environment jsdom
//
// packages/frontend/src/components/ExportDialog.spec.ts — UI-06's two gates,
// decision D-04's assembly loop, and the amended confirmation copy.
//
// ===========================================================================
// WHAT THESE CASES ARE ACTUALLY GUARDING
// ===========================================================================
// Not "does a radio render". Four things, each of which fails SILENTLY and each
// of which is a disclosure when it does:
//
//   1. THE DEFAULT. Redacted is pre-selected and focused, and raw takes two
//      deliberate acts. A default that drifted would be a raw export taken by
//      accident (threat T-05-57), with the dialog looking exactly the same.
//   2. THE ABSENCE OF A "REMEMBER THIS CHOICE". You cannot assert the absence of
//      a control by looking for it, so the case below asserts the dialog's
//      control set EQUALS an expected list. A checkbox added here fails that,
//      which is the only shape of assertion that catches an addition.
//   3. THE COPY, VERBATIM. It was wrong twice — it described a file written on
//      the Caido server, and it promised live values in cleartext that URL query
//      values cannot honour. Both errors read perfectly well. So the assertion
//      is a byte comparison against 05-UI-SPEC.md's own row, read off disk at
//      test time, not a comparison against a second copy of it.
//   4. THE FAILURE PATH LEAVING THE CHOICE ALONE. A dialog that quietly
//      re-defaulted a raw selection to redacted after a failure would be a
//      dialog whose next confirmation means something other than what the
//      operator read.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  ExportRedactionMode,
  ExportTable,
} from "@defminer/engine/contract";
import {
  EXPORT_REDACTION_MODES,
  EXPORT_TABLES,
} from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ExportChunk,
  ExportChunkOutcome,
  ExportChunkRequest,
  RpcResult,
} from "../api/client";

import {
  CANCEL_LABEL,
  DESTRUCTIVE_BUTTON_CLASS,
  EXPORT_CTA,
  EXPORT_DIALOG_HEADINGS,
  EXPORT_FAILED_BODY,
  EXPORT_LABEL,
  EXPORT_MANIFEST_CTA,
  exportFloorLine,
  EXPORTING_LABEL,
  FORMAT_GROUP_LABEL,
  FORMAT_OPTION_LABELS,
  NOTHING_TO_EXPORT_LABEL,
  RAW_EXPORT_CONFIRM_BODY_TEMPLATE,
  RAW_EXPORT_CONFIRM_HEADING,
  RAW_EXPORT_CONFIRM_LABEL_TEMPLATE,
  RAW_EXPORT_ESCAPE_LABEL,
  rawExportConfirmBody,
  rawExportConfirmLabel,
  REDACTION_GROUP_LABEL,
  REDACTION_OPTION_LABELS,
} from "./export-contract";
import type { ExportFile } from "./export-download";
import { redactionRadioId } from "./export-download";
import ExportDialog from "./ExportDialog.vue";

/** The design contract itself, read at test time. NOT a second copy of the copy
 *  row: the whole point of the verbatim case is that nothing between this file
 *  and 05-UI-SPEC.md can retype the sentence. */
const UI_SPEC_PATH =
  ".planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md";

function chunk(over: Partial<ExportChunk> = {}): ExportChunkOutcome {
  return {
    outcome: "chunk",
    chunk: {
      filename: "defminer-observations-redacted-20260829T000000Z.csv",
      contentType: "text/csv;charset=utf-8",
      text: "part\r\n",
      chunkIndex: 0,
      rows: 1,
      hasMore: false,
      nextCursor: null,
      ...over,
    },
  };
}

type Harness = {
  wrapper: VueWrapper;
  requests: ExportChunkRequest[];
  delivered: ExportFile[];
  closes: () => number;
  /** Resolve the pending export call, in order. */
  release: () => void;
};

type MountOptions = {
  /** Which table the dialog was opened FOR. The toolbar's two entry points
   *  supply an inventory table; the drill-down supplies the manifest. */
  table?: ExportTable;
  /** The artifact a manifest export is scoped to. `null` on the inventory
   *  tables, which is what the toolbar sends. */
  scopeSha256?: string | null;
  reachableCount?: number | null;
  contributingTotal?: number;
  contributingDegraded?: number;
  /** Answers handed back in order, one per call. */
  outcomes?: RpcResult<ExportChunkOutcome>[];
  /** When true, each call parks until `release()` is called. */
  manual?: boolean;
};

let mounted: VueWrapper | null = null;

afterEach(() => {
  mounted?.unmount();
  mounted = null;
});

function harness(options: MountOptions = {}): Harness {
  const requests: ExportChunkRequest[] = [];
  const delivered: ExportFile[] = [];
  const pending: (() => void)[] = [];
  const outcomes = [...(options.outcomes ?? [{ ok: true, value: chunk() }])];

  const runExport = (
    request: ExportChunkRequest,
  ): Promise<RpcResult<ExportChunkOutcome>> => {
    requests.push(request);
    const answer = outcomes.shift() ?? { ok: true, value: chunk() };
    if (options.manual !== true) return Promise.resolve(answer);
    return new Promise((resolve) => {
      pending.push(() => {
        resolve(answer);
      });
    });
  };

  const wrapper = mount(ExportDialog, {
    attachTo: document.body,
    props: {
      open: true,
      table: options.table ?? ("observations" as const),
      scopeSha256: options.scopeSha256 ?? null,
      filter: null,
      sortKey: "observed_at",
      direction: "desc" as const,
      projectId: "server-scoped",
      reachableCount:
        options.reachableCount === undefined ? 7 : options.reachableCount,
      contributingTotal: options.contributingTotal ?? 12,
      contributingDegraded: options.contributingDegraded ?? 0,
      runExport,
      deliver: (file: ExportFile) => delivered.push(file),
    },
  });
  mounted = wrapper;

  return {
    wrapper,
    requests,
    delivered,
    closes: () => wrapper.emitted("close")?.length ?? 0,
    release: () => {
      const next = pending.shift();
      next?.();
    },
  };
}

const confirmButton = (w: VueWrapper) => w.get("#defminer-export-confirm");
const cancelButton = (w: VueWrapper) => w.get("#defminer-export-cancel");
const radio = (w: VueWrapper, option: ExportRedactionMode) =>
  w.get(`#${redactionRadioId(option)}`);

async function chooseRaw(w: VueWrapper): Promise<void> {
  await radio(w, "raw").setValue();
}

// ---------------------------------------------------------------------------
// THE DEFAULT
// ---------------------------------------------------------------------------

describe("the redaction choice (UI-06, R3)", () => {
  it("pre-selects AND focuses the redacted option on open", async () => {
    const h = harness();
    await h.wrapper.vm.$nextTick();

    const redacted = radio(h.wrapper, "redacted").element as HTMLInputElement;
    expect(redacted.checked).toBe(true);
    expect((radio(h.wrapper, "raw").element as HTMLInputElement).checked).toBe(
      false,
    );
    expect(document.activeElement).toBe(redacted);
  });

  it("renders the two options in the CONTRACT's order, redacted first", () => {
    const h = harness();
    const ids = h.wrapper
      .findAll('input[name="defminer-export-redaction"]')
      .map((input) => input.attributes("id"));
    expect(ids).toEqual(
      EXPORT_REDACTION_MODES.map((option) => redactionRadioId(option)),
    );
  });

  it("has NO remember-this-choice affordance — the control set EQUALS this list", () => {
    // AN EQUALITY OVER THE WHOLE SET, not a search for a checkbox. You cannot
    // assert the absence of a control by looking for it: a "remember this
    // choice" added under any name, of any type, fails this case.
    const h = harness();
    const controls = h.wrapper
      .findAll("input, select, textarea")
      .map(
        (el) =>
          `${el.attributes("type") ?? el.element.tagName}:${el.attributes("id") ?? el.attributes("name") ?? ""}`,
      );
    expect(controls.sort()).toEqual(
      [
        "radio:defminer-export-redaction-redacted",
        "radio:defminer-export-redaction-raw",
        "radio:defminer-export-format",
        "radio:defminer-export-format",
      ].sort(),
    );
    expect(h.wrapper.findAll('input[type="checkbox"]')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// THE SECOND GATE, AND ITS COPY
// ---------------------------------------------------------------------------

describe("the destructive confirmation (decision D-07)", () => {
  it("does NOT appear when the choice is redacted", async () => {
    const h = harness();
    await confirmButton(h.wrapper).trigger("click");
    await h.wrapper.vm.$nextTick();
    expect(h.wrapper.find("[data-defminer-raw-confirm]").exists()).toBe(false);
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]?.mode).toBe("redacted");
  });

  it("appears for raw, exports NOTHING yet, and focuses the way OUT of it", async () => {
    const h = harness();
    await chooseRaw(h.wrapper);
    await confirmButton(h.wrapper).trigger("click");
    await h.wrapper.vm.$nextTick();
    await h.wrapper.vm.$nextTick();

    expect(h.wrapper.find("[data-defminer-raw-confirm]").exists()).toBe(true);
    expect(h.requests, "raw exported on the FIRST act").toHaveLength(0);
    expect(document.activeElement).toBe(
      h.wrapper.get("#defminer-export-raw-escape").element,
    );
  });

  it("renders the amended copy, string-equal to the shared constant", async () => {
    const h = harness({ reachableCount: 7 });
    await chooseRaw(h.wrapper);
    await confirmButton(h.wrapper).trigger("click");
    await h.wrapper.vm.$nextTick();

    expect(h.wrapper.get("[data-defminer-raw-confirm-body]").text()).toBe(
      rawExportConfirmBody(7),
    );
    expect(h.wrapper.get("#defminer-export-raw-confirm").text()).toBe(
      rawExportConfirmLabel(7),
    );
    expect(h.wrapper.get("#defminer-export-raw-escape").text()).toBe(
      RAW_EXPORT_ESCAPE_LABEL,
    );
  });

  it("is VERBATIM — every string is inside 05-UI-SPEC.md's own copy row", () => {
    // READ OFF DISK AT TEST TIME. A comparison against a second copy of the
    // sentence would pass just as happily if both copies were the OLD one.
    const spec = readFileSync(UI_SPEC_PATH, "utf8");
    const row = spec
      .split("\n")
      .find(
        (line) =>
          line.includes("Destructive confirmation") &&
          line.includes("raw export"),
      );
    expect(row, "the copy row is gone from the design contract").toBeDefined();

    for (const piece of [
      RAW_EXPORT_CONFIRM_HEADING,
      RAW_EXPORT_CONFIRM_BODY_TEMPLATE,
      RAW_EXPORT_CONFIRM_LABEL_TEMPLATE,
      RAW_EXPORT_ESCAPE_LABEL,
    ]) {
      expect(row ?? "", `not verbatim: ${piece.slice(0, 48)}…`).toContain(
        piece,
      );
    }

    // AND THE TWO SENTENCES IT WAS AMENDED TO REMOVE ARE GONE. A `toContain`
    // sweep alone would still pass if the old text were appended beside the new.
    expect(RAW_EXPORT_CONFIRM_BODY_TEMPLATE).not.toContain("Caido server");
    expect(RAW_EXPORT_CONFIRM_BODY_TEMPLATE).not.toContain(
      "live secret values",
    );
    expect(RAW_EXPORT_CONFIRM_BODY_TEMPLATE).toContain(
      "downloaded to this machine",
    );
    expect(RAW_EXPORT_CONFIRM_BODY_TEMPLATE).toContain("stay redacted");
  });

  it("puts the destructive colour on EXACTLY ONE button, and it is the raw confirm", async () => {
    const h = harness();
    await chooseRaw(h.wrapper);
    await confirmButton(h.wrapper).trigger("click");
    await h.wrapper.vm.$nextTick();

    const destructive = h.wrapper
      .findAll("button")
      .filter((b) => (b.attributes("class") ?? "").includes("danger"));
    expect(destructive).toHaveLength(1);
    expect(destructive[0]?.attributes("id")).toBe(
      "defminer-export-raw-confirm",
    );
    expect(DESTRUCTIVE_BUTTON_CLASS).toContain("danger");
  });

  it("the escape moves the choice to redacted and exports redacted — an operator act, not an error path", async () => {
    const h = harness();
    await chooseRaw(h.wrapper);
    await confirmButton(h.wrapper).trigger("click");
    await h.wrapper.vm.$nextTick();
    await h.wrapper.get("#defminer-export-raw-escape").trigger("click");
    await h.wrapper.vm.$nextTick();

    expect(h.requests.map((r) => r.mode)).toEqual(["redacted"]);
  });
});

// ---------------------------------------------------------------------------
// THE ZERO-ROW RULE (Open Decision D3)
// ---------------------------------------------------------------------------

describe("a zero-row export", () => {
  it("is DISABLED with the reason on the button itself", async () => {
    const h = harness({ reachableCount: 0 });
    const button = confirmButton(h.wrapper);
    expect(button.attributes("disabled")).toBeDefined();
    expect(button.text()).toBe(NOTHING_TO_EXPORT_LABEL);

    await button.trigger("click");
    expect(h.requests, "a disabled button exported anyway").toHaveLength(0);
  });

  it("is ENABLED, with the plain label, once the count is non-zero", () => {
    const h = harness({ reachableCount: 1 });
    expect(confirmButton(h.wrapper).attributes("disabled")).toBeUndefined();
    expect(confirmButton(h.wrapper).text()).toBe(EXPORT_LABEL);
  });

  it("treats a still-resolving count as NOT zero — a count nobody measured disables nothing", () => {
    const h = harness({ reachableCount: null });
    expect(confirmButton(h.wrapper).attributes("disabled")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// IN FLIGHT
// ---------------------------------------------------------------------------

describe("while exporting", () => {
  it("disables with its own label, refuses dismissal, and issues no second call", async () => {
    const h = harness({ manual: true });
    await confirmButton(h.wrapper).trigger("click");
    await h.wrapper.vm.$nextTick();

    expect(confirmButton(h.wrapper).text()).toBe(EXPORTING_LABEL);
    expect(confirmButton(h.wrapper).attributes("disabled")).toBeDefined();
    expect(cancelButton(h.wrapper).attributes("disabled")).toBeDefined();

    // A SECOND INVOCATION ISSUES NO SECOND CALL. Driven at the handler rather
    // than through the disabled attribute, because `disabled` is the visible
    // half and the guard is the load-bearing one.
    await confirmButton(h.wrapper).trigger("click");
    await cancelButton(h.wrapper).trigger("click");
    expect(h.requests).toHaveLength(1);
    expect(h.closes(), "the dialog was dismissed mid-write").toBe(0);

    h.release();
    await h.wrapper.vm.$nextTick();
    await h.wrapper.vm.$nextTick();
    expect(h.delivered).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// ASSEMBLY — DECISION D-04's MECHANISM
// ---------------------------------------------------------------------------

describe("the download (decision D-04)", () => {
  it("requests three chunks IN ORDER and concatenates them IN ORDER before delivering", async () => {
    const h = harness({
      outcomes: [
        {
          ok: true,
          value: chunk({
            text: "A",
            chunkIndex: 0,
            hasMore: true,
            nextCursor: { sortValue: 1, tieBreak: "a" },
          }),
        },
        {
          ok: true,
          value: chunk({
            text: "B",
            chunkIndex: 1,
            hasMore: true,
            nextCursor: { sortValue: 2, tieBreak: "b" },
          }),
        },
        {
          ok: true,
          value: chunk({ text: "C", chunkIndex: 2, hasMore: false }),
        },
      ],
    });

    await confirmButton(h.wrapper).trigger("click");
    await vi.waitFor(() => expect(h.delivered).toHaveLength(1));

    expect(h.requests.map((r) => r.chunkIndex)).toEqual([0, 1, 2]);
    expect(h.requests.map((r) => r.cursor)).toEqual([
      null,
      { sortValue: 1, tieBreak: "a" },
      { sortValue: 2, tieBreak: "b" },
    ]);
    // CONCATENATED IN ORDER. "ACB" would satisfy a length assertion and would be
    // a corrupt file, which is why this compares the bytes.
    expect(h.delivered[0]?.text).toBe("ABC");
    expect(h.delivered[0]?.filename).toContain("defminer-observations-");
    expect(h.delivered[0]?.contentType).toContain("text/csv");
    expect(h.closes()).toBe(1);
  });

  it("sends `chunkRows: null` — the frontend does not choose what crosses in one call", async () => {
    const h = harness();
    await confirmButton(h.wrapper).trigger("click");
    await vi.waitFor(() => expect(h.requests).toHaveLength(1));
    expect(h.requests[0]?.chunkRows).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FAILURE
// ---------------------------------------------------------------------------

describe("a failed export", () => {
  it("stays open, says so, delivers nothing, and leaves a RAW selection RAW", async () => {
    const h = harness({
      outcomes: [
        {
          ok: true,
          value: chunk({
            text: "A",
            hasMore: true,
            nextCursor: { sortValue: 1, tieBreak: "a" },
          }),
        },
        { ok: false, reason: "rpc-rejected", versions: null },
      ],
    });

    await chooseRaw(h.wrapper);
    await confirmButton(h.wrapper).trigger("click");
    await h.wrapper.vm.$nextTick();
    await h.wrapper.get("#defminer-export-raw-confirm").trigger("click");
    await vi.waitFor(() =>
      expect(h.wrapper.find("[data-defminer-export-failure]").exists()).toBe(
        true,
      ),
    );

    expect(h.wrapper.get("[data-defminer-export-failure]").text()).toBe(
      EXPORT_FAILED_BODY,
    );
    expect(h.delivered, "a partial file was written").toHaveLength(0);
    expect(h.closes(), "the dialog closed over a failure").toBe(0);

    // THE CHOICE IS EXACTLY AS THE OPERATOR SET IT. Not reset, not defaulted,
    // not "helpfully" moved to redacted.
    expect((radio(h.wrapper, "raw").element as HTMLInputElement).checked).toBe(
      true,
    );
    expect(
      (radio(h.wrapper, "redacted").element as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("says the backend could not scope the request, without claiming a file", async () => {
    const h = harness({
      outcomes: [
        { ok: true, value: { outcome: "refused", reason: "no-project" } },
      ],
    });
    await confirmButton(h.wrapper).trigger("click");
    await vi.waitFor(() =>
      expect(h.wrapper.find("[data-defminer-export-failure]").exists()).toBe(
        true,
      ),
    );
    expect(h.wrapper.get("[data-defminer-export-failure]").text()).toContain(
      "Nothing was written",
    );
    expect(h.delivered).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// UI-09 IN THE DIALOG
// ---------------------------------------------------------------------------

describe("the floor statement before the confirmation (UI-09)", () => {
  it("is absent when every contributing artifact is complete", () => {
    const h = harness({ contributingDegraded: 0 });
    expect(h.wrapper.find("[data-defminer-export-floor]").exists()).toBe(false);
  });

  it("states the floor and the affected count when one is not", () => {
    const h = harness({ contributingDegraded: 3, contributingTotal: 12 });
    const line = h.wrapper.get("[data-defminer-export-floor]").text();
    expect(line).toContain("3 of 12 artifacts");
    expect(line).toContain("floor, not a total");
  });
});

// ---------------------------------------------------------------------------
// U7-3 — THE HEADING NAMES WHAT THE CTA NAMED
// ---------------------------------------------------------------------------
//
// A dialog headed "Export inventory" opened from "Export source manifest" is a
// small lie about what will leave the tool, on the one control whose entire
// ceremony is about the operator knowing that. Two separate cases below,
// because one case asserting a lookup would pass against a record with the
// same string in every slot.

describe("U7-3 — the dialog heading, keyed on the export table", () => {
  it("keeps the two SHIPPED entries byte-identical to the string that shipped", () => {
    // A WIDENING, NOT A REWORDING. Nothing an operator has already read
    // changes, and the byte comparison is what says so.
    expect(EXPORT_DIALOG_HEADINGS.artifacts).toBe("Export inventory");
    expect(EXPORT_DIALOG_HEADINGS.observations).toBe("Export inventory");
    expect(EXPORT_DIALOG_HEADINGS.sources).toBe(EXPORT_MANIFEST_CTA);
  });

  it("covers EVERY member of the contract's table list — a fourth cannot ship headless", () => {
    // THE POINT OF A RECORD RATHER THAN A PROP. The key set is asserted
    // against the engine contract's own frozen list, so a fourth export table
    // is a failure here rather than a blank `<h2>` in front of an operator.
    expect(Object.keys(EXPORT_DIALOG_HEADINGS).sort()).toEqual(
      [...EXPORT_TABLES].sort(),
    );
    for (const table of EXPORT_TABLES) {
      expect(EXPORT_DIALOG_HEADINGS[table].length).toBeGreaterThan(0);
    }
  });

  it("renders the INVENTORY heading when the toolbar opened it", () => {
    const h = harness({ table: "observations", scopeSha256: null });
    expect(h.wrapper.get("h2").text()).toBe("Export inventory");
    expect(h.wrapper.get('[role="dialog"]').attributes("aria-label")).toBe(
      "Export inventory",
    );
  });

  it("renders the MANIFEST heading when the drill-down opened it", () => {
    const h = harness({ table: "sources", scopeSha256: "a".repeat(64) });
    expect(h.wrapper.get("h2").text()).toBe(EXPORT_MANIFEST_CTA);
    expect(h.wrapper.get('[role="dialog"]').attributes("aria-label")).toBe(
      EXPORT_MANIFEST_CTA,
    );
  });

  it("carries the SCOPE on the manifest request and NULL on an inventory one", async () => {
    // A SCOPE, NOT A FILTER, and it is forwarded rather than derived from the
    // table — the entry point knows which artifact, and this component does
    // not.
    const scoped = harness({ table: "sources", scopeSha256: "b".repeat(64) });
    await confirmButton(scoped.wrapper).trigger("click");
    await vi.waitFor(() => expect(scoped.requests).toHaveLength(1));
    expect(scoped.requests[0]?.table).toBe("sources");
    expect(scoped.requests[0]?.scopeSha256).toBe("b".repeat(64));
    scoped.wrapper.unmount();

    const inventory = harness({ table: "observations" });
    await confirmButton(inventory.wrapper).trigger("click");
    await vi.waitFor(() => expect(inventory.requests).toHaveLength(1));
    expect(inventory.requests[0]?.table).toBe("observations");
    expect(inventory.requests[0]?.scopeSha256).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// THE TOOLBAR'S CTA IS BYTE-UNCHANGED
// ---------------------------------------------------------------------------

describe("UI-SPEC Named Conflict 1 — one mechanism, two entry points", () => {
  it("leaves the toolbar CTA's label exactly as it shipped", () => {
    // The resolution adds a SECOND place to start one export. It does not
    // touch the first, and the assertion is a byte comparison rather than a
    // description of one.
    expect(EXPORT_CTA).toBe("Export inventory");
  });

  it("gives the drill-down its own scoped CTA, naming what it will export", () => {
    expect(EXPORT_MANIFEST_CTA).toBe("Export source manifest");
    expect(EXPORT_MANIFEST_CTA).not.toBe(EXPORT_CTA);
  });
});

// ---------------------------------------------------------------------------
// T-07-46 — THE SECURITY CEREMONY IS NOT FORKED PER TABLE
// ---------------------------------------------------------------------------
//
// Forking a security ceremony's copy per table is how ceremonies drift: the
// second copy is edited, the first is not, and two tables then make two
// different promises about the same act. The scan below is over the SHIPPED
// FRONTEND SOURCE TREE and reports the number of files it read, so a scan that
// walked nothing cannot pass by finding nothing.

/** Every file under `packages/frontend/src`, recursively. */
function frontendSourceFiles(dir = "packages/frontend/src"): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...frontendSourceFiles(path));
    else if (/\.(ts|vue)$/.test(entry.name)) out.push(path);
  }
  return out;
}

/** The four constants that carry the destructive confirmation's whole promise. */
const RAW_CEREMONY_CONSTANTS: readonly [string, string][] = [
  ["RAW_EXPORT_CONFIRM_HEADING", RAW_EXPORT_CONFIRM_HEADING],
  ["RAW_EXPORT_CONFIRM_BODY_TEMPLATE", RAW_EXPORT_CONFIRM_BODY_TEMPLATE],
  ["RAW_EXPORT_CONFIRM_LABEL_TEMPLATE", RAW_EXPORT_CONFIRM_LABEL_TEMPLATE],
  ["RAW_EXPORT_ESCAPE_LABEL", RAW_EXPORT_ESCAPE_LABEL],
];

describe("the raw-export ceremony is declared ONCE and read from one module", () => {
  it("declares each of the four constants exactly once, over a NON-VACUOUS scan", () => {
    const files = frontendSourceFiles();
    // NON-VACUITY FIRST. A repository search that walked an empty list would
    // report "declared once" for a constant that does not exist at all.
    expect(
      files.length,
      "the frontend source scan found no files at all",
    ).toBeGreaterThan(40);
    expect(files).toContain(
      "packages/frontend/src/components/export-contract.ts",
    );

    const sources = files.map(
      (path) => [path, readFileSync(path, "utf8")] as const,
    );
    for (const [name] of RAW_CEREMONY_CONSTANTS) {
      const declaring = sources.filter(([, text]) =>
        new RegExp(`(^|\\n)\\s*(export\\s+)?const\\s+${name}\\s*[=:]`).test(
          text,
        ),
      );
      expect(
        declaring.map(([path]) => path),
        `${name} is not declared exactly once under packages/frontend/src`,
      ).toEqual(["packages/frontend/src/components/export-contract.ts"]);
    }
  });

  it("writes each of the four SENTENCES in exactly one file — no second copy to drift", () => {
    // THE STRONGER HALF: a fork does not have to reuse the constant NAME. It is
    // the SENTENCE that would drift, so the sentence is what is counted.
    //
    // COMMENT LINES ARE EXCLUDED, and the exclusion is narrow rather than a
    // comment-stripping parser: a line whose first non-space characters are
    // `//`, `*` or `/*` is prose. `ExportDialog.vue`'s own header QUOTES the
    // escape label while explaining what writes `mode`, and prose that quotes a
    // sentence is not a second copy of it — a copy is what a template renders.
    const isProse = (line: string): boolean => /^\s*(\/\/|\*|\/\*)/.test(line);

    const sources = frontendSourceFiles().map(
      (path) => [path, readFileSync(path, "utf8")] as const,
    );
    expect(sources.length).toBeGreaterThan(40);
    for (const [name, sentence] of RAW_CEREMONY_CONSTANTS) {
      const carrying = sources
        .filter(([, text]) =>
          text
            .split("\n")
            .some((line) => !isProse(line) && line.includes(sentence)),
        )
        .map(([path]) => path);
      expect(
        carrying,
        `${name}'s text appears in more than one frontend file`,
      ).toEqual(["packages/frontend/src/components/export-contract.ts"]);
    }
  });
});

// ---------------------------------------------------------------------------
// UI CONSIDERATIONS — manifest-export, five rows, one case each
// ---------------------------------------------------------------------------

describe("manifest-export / empty — the reason is ON the control", () => {
  it("disables the action with the SHIPPED nothing-to-export label and produces no file", async () => {
    const h = harness({
      table: "sources",
      scopeSha256: "c".repeat(64),
      reachableCount: 0,
    });
    const button = confirmButton(h.wrapper);
    expect((button.element as HTMLButtonElement).disabled).toBe(true);
    expect(button.text()).toBe(NOTHING_TO_EXPORT_LABEL);

    // AND THE HANDLER REFUSES TOO, not only the attribute. No request, no
    // file, and no destructive confirmation opened behind a disabled control.
    await chooseRaw(h.wrapper);
    await button.trigger("click");
    await h.wrapper.vm.$nextTick();
    expect(h.requests).toHaveLength(0);
    expect(h.delivered).toHaveLength(0);
    expect(h.wrapper.find("[data-defminer-raw-confirm]").exists()).toBe(false);
  });
});

describe("manifest-export / loading — legible without colour", () => {
  it("renders the SHIPPED exporting label and mounts no progress element", async () => {
    const h = harness({
      table: "sources",
      scopeSha256: "c".repeat(64),
      manual: true,
    });
    await confirmButton(h.wrapper).trigger("click");
    await vi.waitFor(() =>
      expect(confirmButton(h.wrapper).text()).toBe(EXPORTING_LABEL),
    );
    // ITS OWN WORDS, not a colour and not a spinner: a disabled state legible
    // in a screenshot and to a screen reader.
    expect(
      h.wrapper.findAll('[role="progressbar"], progress, [aria-busy="true"]'),
    ).toEqual([]);
    h.release();
  });
});

describe("manifest-export / error — it does not claim a file was written", () => {
  it("renders the SHIPPED failure body, and that body denies a file", async () => {
    const h = harness({
      table: "sources",
      scopeSha256: "c".repeat(64),
      outcomes: [{ ok: false, reason: "rpc-rejected", versions: null }],
    });
    await confirmButton(h.wrapper).trigger("click");
    await vi.waitFor(() =>
      expect(h.wrapper.find("[data-defminer-export-failure]").exists()).toBe(
        true,
      ),
    );
    const body = h.wrapper.get("[data-defminer-export-failure]").text();
    expect(body).toBe(EXPORT_FAILED_BODY);
    // THE WORDING IS THE ASSERTION, not just its identity: the sentence has to
    // deny the file rather than merely omit a claim about it.
    expect(body).toContain("no file was written");
    expect(h.delivered).toHaveLength(0);
  });
});

describe("manifest-export / zero-one-many — one sentence, substituted once", () => {
  it("agrees between the body and the button at ONE and at MANY", async () => {
    for (const count of [1, 4_211]) {
      const h = harness({
        table: "sources",
        scopeSha256: "c".repeat(64),
        reachableCount: count,
      });
      await chooseRaw(h.wrapper);
      await confirmButton(h.wrapper).trigger("click");
      await h.wrapper.vm.$nextTick();

      // BOTH SENTENCES COME FROM THE SHIPPED FUNCTIONS, so the number cannot
      // be right in one place and wrong in the other.
      expect(h.wrapper.get("[data-defminer-raw-confirm-body]").text()).toBe(
        rawExportConfirmBody(count),
      );
      expect(h.wrapper.get("#defminer-export-raw-confirm").text()).toBe(
        rawExportConfirmLabel(count),
      );
      // AND THEY AGREE WITH EACH OTHER about the count, which is the property
      // an independently-written second template would break.
      expect(
        h.wrapper.get("[data-defminer-raw-confirm-body]").text(),
      ).toContain(String(count));
      expect(h.wrapper.get("#defminer-export-raw-confirm").text()).toContain(
        String(count),
      );
      h.wrapper.unmount();
    }
  });
});

describe("manifest-export / long-text — every rendered string is DefMiner's", () => {
  it("renders NOTHING outside the union of the authored constants", async () => {
    // A PROPERTY OF THE SHAPE. The dialog's whole text output is compared
    // against the union of the copy constants; any other string — a `sources`
    // label, a host, a backend message — fails, because there is nowhere for
    // it to hide in a set equality.
    const count = 7;
    const h = harness({
      table: "sources",
      scopeSha256: "d".repeat(64),
      reachableCount: count,
      contributingDegraded: 2,
      contributingTotal: 9,
    });
    await chooseRaw(h.wrapper);
    await confirmButton(h.wrapper).trigger("click");
    await h.wrapper.vm.$nextTick();

    const allowed = new Set<string>([
      EXPORT_MANIFEST_CTA,
      REDACTION_GROUP_LABEL,
      ...Object.values(REDACTION_OPTION_LABELS),
      FORMAT_GROUP_LABEL,
      ...Object.values(FORMAT_OPTION_LABELS),
      EXPORT_LABEL,
      EXPORTING_LABEL,
      CANCEL_LABEL,
      NOTHING_TO_EXPORT_LABEL,
      RAW_EXPORT_CONFIRM_HEADING,
      RAW_EXPORT_ESCAPE_LABEL,
      rawExportConfirmBody(count),
      rawExportConfirmLabel(count),
      exportFloorLine(2, 9),
    ]);

    const texts: string[] = [];
    const walk = (node: Node): void => {
      if (node.nodeType === 3) {
        const text = (node.nodeValue ?? "").trim();
        if (text.length > 0) texts.push(text);
        return;
      }
      for (const child of node.childNodes) walk(child);
    };
    walk(h.wrapper.element);

    expect(texts.length, "the dialog rendered no text at all").toBeGreaterThan(
      6,
    );
    for (const text of texts) {
      // BARE DIGITS ARE PERMITTED and nothing else is: every count on this
      // path is a DefMiner-computed integer, and no target byte is one.
      if (/^[0-9]+$/.test(text)) continue;
      expect(
        allowed.has(text),
        `unexpected string in the dialog: ${text}`,
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// MAP-07 / CONCURRENCY — the two entry points do not cross
// ---------------------------------------------------------------------------

describe("an in-flight export names its OWN table", () => {
  it("keeps the manifest heading for the whole life of a manifest export", async () => {
    const h = harness({
      table: "sources",
      scopeSha256: "e".repeat(64),
      manual: true,
    });
    await confirmButton(h.wrapper).trigger("click");
    await vi.waitFor(() =>
      expect(confirmButton(h.wrapper).text()).toBe(EXPORTING_LABEL),
    );

    // SINGLE-INSTANCE: one dialog element in the document, not one per entry
    // point. Two dialogs would be two in-flight states with one visible
    // heading between them.
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(h.wrapper.get("h2").text()).toBe(EXPORT_MANIFEST_CTA);
    expect(h.requests[0]?.table).toBe("sources");
    h.release();
  });

  it("keeps the inventory heading for the whole life of an inventory export", async () => {
    const h = harness({ table: "artifacts", manual: true });
    await confirmButton(h.wrapper).trigger("click");
    await vi.waitFor(() =>
      expect(confirmButton(h.wrapper).text()).toBe(EXPORTING_LABEL),
    );
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(h.wrapper.get("h2").text()).toBe("Export inventory");
    expect(h.requests[0]?.table).toBe("artifacts");
    h.release();
  });
});
