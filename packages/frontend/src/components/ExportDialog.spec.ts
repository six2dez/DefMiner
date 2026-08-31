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

import { readFileSync } from "node:fs";

import type { ExportRedactionMode } from "@defminer/engine/contract";
import { EXPORT_REDACTION_MODES } from "@defminer/engine/contract";
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
  DESTRUCTIVE_BUTTON_CLASS,
  EXPORT_FAILED_BODY,
  EXPORT_LABEL,
  EXPORTING_LABEL,
  NOTHING_TO_EXPORT_LABEL,
  RAW_EXPORT_CONFIRM_BODY_TEMPLATE,
  RAW_EXPORT_CONFIRM_HEADING,
  RAW_EXPORT_CONFIRM_LABEL_TEMPLATE,
  RAW_EXPORT_ESCAPE_LABEL,
  rawExportConfirmBody,
  rawExportConfirmLabel,
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
      table: "observations" as const,
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
