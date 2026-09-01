// packages/frontend/src/components/scan-contract.spec.ts — the Scan tab's
// vocabulary, tested WITHOUT MOUNTING ANYTHING.
//
// ===========================================================================
// WHY THESE LIVE OUTSIDE THE COMPONENT AND ARE TESTED OUTSIDE IT
// ===========================================================================
// The two hardest things on this surface are a DATE FORMAT and a PRECEDENCE
// ORDER, and neither of them needs a DOM. Keeping them in the contract module
// means a case can drive `scanStatusWord` through all seven of its answers in
// seven lines, where the same coverage through a mounted component would be
// seven mounts, seven payload fixtures and seven fake clocks — and would report
// a rendering failure and a precedence failure with the same message.
//
// NO `@vitest-environment` LINE HERE, AND ITS ABSENCE IS THE POINT. Every
// frontend spec that mounts declares jsdom per file (vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key). This one
// mounts nothing, so it runs in the default node environment — which is also a
// standing proof that the module it tests has no DOM dependency and can be
// consumed by the toolbar indicator, the history list and anything else that
// needs the same words.
//
// ===========================================================================
// THE PRECEDENCE ORDER IS THE ONE THING THAT CAN FAIL SILENTLY
// ===========================================================================
// Every other case here fails loudly if the code is wrong: a wrong month
// renders a wrong month. The watermark-hold case does not. If the hold ever
// stopped outranking the stall threshold, the surface would still render a
// word, that word would still be one of the seven, and it would still change
// over time — it would simply say `Not advancing` on the single most common
// healthy state of a long backfill, and an operator who learns to ignore a
// stall marker is worse off than one who never had it. That case is written
// with the elapsed time DELIBERATELY PAST the threshold, so it fails the moment
// the branches are reordered.

import {
  SCAN_LIFECYCLE_STATES,
  SUSPEND_REASONS,
} from "@defminer/engine/contract";
import { ARTIFACT_DEADLINE_MS } from "@defminer/engine/thresholds";
import { describe, expect, it } from "vitest";

import {
  clauseRejectedLine,
  composedPreview,
  counterText,
  dateOnlyText,
  discardConfirmBody,
  positionText,
  rejectBreakdownUnavailable,
  resumePositionClause,
  SCAN_CLAUSE_REJECTION_COPY,
  SCAN_DETAIL_COUNTERS,
  SCAN_DISCARD_CTA,
  SCAN_DISCARD_KEEP_LABEL,
  SCAN_NOT_ADVANCING_LINE,
  SCAN_ONE_AT_A_TIME_RUNNING,
  SCAN_ONE_AT_A_TIME_SUSPENDED,
  SCAN_OPERATOR_CLAUSE_HELP,
  SCAN_OPERATOR_CLAUSE_LABEL,
  SCAN_REFUSAL_COPY,
  SCAN_REJECT_OUT_OF_SCOPE_BODY,
  SCAN_STATUS_DISCARDED,
  SCAN_STATUS_FINISHED,
  SCAN_STATUS_NOT_ADVANCING,
  SCAN_STATUS_SCANNING,
  SCAN_STATUS_STARTING,
  SCAN_STATUS_SUSPENDED,
  SCAN_STATUS_WAITING_FOR_QUEUE,
  SCAN_STRIP_COUNTERS,
  SCAN_SUSPEND_COPY,
  scanStaleBody,
  scanStatusWord,
} from "./scan-contract";

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------

/**
 * A capture instant with a two-digit day, a two-digit hour and a two-digit
 * minute, so a formatter that padded nothing and one that padded everything
 * would both pass — which is why the December and January cases below exist.
 *
 * Built from local-time components rather than from a UTC epoch literal,
 * because the formatter renders LOCAL time deliberately (the operator's mental
 * model of "when was I browsing" is their own clock) and a UTC literal would
 * make this file's result depend on the machine's zone.
 */
const AUG_14 = new Date(2026, 7, 14, 9, 41, 30, 500).getTime();
const DEC_31 = new Date(2026, 11, 31, 23, 59, 0, 0).getTime();
const JAN_01 = new Date(2027, 0, 1, 0, 5, 0, 0).getTime();

const NOW = 1_700_000_000_000;

type StatusInput = Parameters<typeof scanStatusWord>[0];

/** A `running` scan with a page behind it, nothing held and a counter that
 *  moved a moment ago. Every case below perturbs exactly one field of it, so a
 *  failure names the field that decided the answer. */
function running(over: Partial<StatusInput> = {}): StatusInput {
  return {
    state: "running",
    heldAtWatermark: false,
    pagesWalked: 3,
    lastCounterChangeAt: NOW - 1_000,
    now: NOW,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// THE DATE FORMATTER
// ---------------------------------------------------------------------------

describe("the DefMiner-authored date formatter", () => {
  it("renders the contract's format to the minute", () => {
    expect(positionText(AUG_14)).toBe("14 Aug 2026, 09:41");
  });

  it("renders the date-only form the toolbar's bounded slot takes", () => {
    // ONE FORMATTER, TWO PRECISIONS. The toolbar is a bounded slot and renders
    // date only; the tab is the detail surface and renders to the minute. A
    // second formatter for the second precision is how a toolbar and a tab come
    // to disagree about the same scan.
    expect(dateOnlyText(AUG_14)).toBe("14 Aug 2026");
    expect(positionText(AUG_14)).toContain(dateOnlyText(AUG_14) ?? "");
  });

  it("is a pure function — the same input twice is the same string twice", () => {
    expect(positionText(AUG_14)).toBe(positionText(AUG_14));
    expect(dateOnlyText(DEC_31)).toBe(dateOnlyText(DEC_31));
  });

  it("indexes the frozen table at both ends of the year", () => {
    // MONTH TWELVE AND MONTH ONE. A table indexed with an off-by-one renders
    // the neighbouring month for every date in the year and is invisible until
    // somebody checks a specific one; these two are where it is loudest.
    expect(dateOnlyText(DEC_31)).toBe("31 Dec 2026");
    expect(dateOnlyText(JAN_01)).toBe("1 Jan 2027");
  });

  it("pads the clock and never the day", () => {
    // `09:41` and `1 Jan`, not `9:41` and `01 Jan`. The clock is a fixed-width
    // field the eye scans down; the day is prose.
    expect(positionText(JAN_01)).toBe("1 Jan 2027, 00:05");
  });

  it("answers ABSENT for a value the backend did not supply", () => {
    // NEVER A PLACEHOLDER DATE AND NEVER THE EPOCH. Before the first page
    // resolves DefMiner does not know where the walk is, and the status line
    // carries the starting word instead.
    expect(positionText(null)).toBeNull();
    expect(dateOnlyText(null)).toBeNull();
    expect(positionText(Number.NaN)).toBeNull();
    expect(dateOnlyText(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("contains no locale-formatting call anywhere in the module", async () => {
    // THE MECHANISM, NOT THE OUTPUT. A locale-formatted string reads
    // differently under a different locale and these strings are compared
    // literally by the cases above — so the assertion that matters is that the
    // module cannot produce one, which is a property of its SOURCE.
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("./scan-contract.ts", import.meta.url), "utf8"),
    );
    // THE CALL, NOT THE WORD. The module NAMES `toLocaleString` in its own
    // argument for why it does not use one — an assertion over the bare word
    // would fail on the sentence that explains the rule, and the usual repair
    // for that is deleting the explanation. `.toLocale…(` is a member call and
    // cannot appear in prose.
    expect(source.includes(".toLocaleString(")).toBe(false);
    expect(source.includes(".toLocaleDateString(")).toBe(false);
    expect(source.includes(".toLocaleTimeString(")).toBe(false);
    expect(source.includes("Intl.DateTimeFormat(")).toBe(false);
  });

  it("declares the stall threshold nowhere — it imports it", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("./scan-contract.ts", import.meta.url), "utf8"),
    );
    expect(source).toContain("ARTIFACT_DEADLINE_MS");
    // The shipped ceiling is 30,000 ms. A local literal for it — in any of the
    // three spellings a developer reaches for — is the drift this asserts
    // against: a threshold that says one number here and another in the engine
    // is a threshold that cries wolf on exactly the builds it was raised for.
    expect(source.includes("30_000")).toBe(false);
    expect(source.includes("30000")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// THE COMPUTED STATUS WORD
// ---------------------------------------------------------------------------

describe("the computed status word", () => {
  it("says the starting word for a running scan that has resolved no page", () => {
    expect(scanStatusWord(running({ pagesWalked: 0 }))).toBe(
      SCAN_STATUS_STARTING,
    );
  });

  it("says the scanning word when any counter moved inside the threshold", () => {
    expect(scanStatusWord(running())).toBe(SCAN_STATUS_SCANNING);
  });

  it("says the backpressure word when the payload reports the hold", () => {
    expect(scanStatusWord(running({ heldAtWatermark: true }))).toBe(
      SCAN_STATUS_WAITING_FOR_QUEUE,
    );
  });

  it("lets the hold OUTRANK the stall marker — the reason the field exists", () => {
    // THE CASE THAT CANNOT FAIL LOUDLY. Elapsed time is deliberately well past
    // the threshold: from outside the backend a watermark hold and a blocked
    // QuickJS thread are indistinguishable, both show counters that stop
    // advancing, and only the payload can tell them apart. Reorder the branches
    // and every legitimate hold on a long backfill renders as the stall marker.
    const held = running({
      heldAtWatermark: true,
      lastCounterChangeAt: NOW - ARTIFACT_DEADLINE_MS * 4,
    });
    expect(scanStatusWord(held)).toBe(SCAN_STATUS_WAITING_FOR_QUEUE);
    expect(scanStatusWord(held)).not.toBe(SCAN_STATUS_NOT_ADVANCING);
  });

  it("says the stall word past the threshold with no hold", () => {
    expect(
      scanStatusWord(
        running({ lastCounterChangeAt: NOW - ARTIFACT_DEADLINE_MS - 1 }),
      ),
    ).toBe(SCAN_STATUS_NOT_ADVANCING);
  });

  it("does not fire the stall marker AT the threshold, only past it", () => {
    // A full maximum-size artifact takes seconds to walk on a strictly serial
    // thread; the boundary belongs to the healthy side.
    expect(
      scanStatusWord(
        running({ lastCounterChangeAt: NOW - ARTIFACT_DEADLINE_MS }),
      ),
    ).toBe(SCAN_STATUS_SCANNING);
  });

  it("never fires the stall marker before any counter has been observed", () => {
    // `null` means "this reader has not yet seen a counter change", which is
    // not the same claim as "no counter has moved for thirty seconds". Treating
    // the two alike would put the stall marker on screen one paint after mount.
    expect(scanStatusWord(running({ lastCounterChangeAt: null }))).toBe(
      SCAN_STATUS_SCANNING,
    );
  });

  it("gives each persisted state that is not running its own word", () => {
    expect(scanStatusWord(running({ state: "suspended" }))).toBe(
      SCAN_STATUS_SUSPENDED,
    );
    expect(scanStatusWord(running({ state: "completed" }))).toBe(
      SCAN_STATUS_FINISHED,
    );
    expect(scanStatusWord(running({ state: "discarded" }))).toBe(
      SCAN_STATUS_DISCARDED,
    );
  });

  it("answers for EVERY member of the persisted vocabulary", () => {
    // Exhaustiveness over the closed union rather than over the four states
    // this file happened to write a case for: a fifth lifecycle state added to
    // the engine contract fails here rather than rendering an empty status
    // line, and a scan whose state renders as nothing is a scan the operator
    // believes is not there.
    for (const state of SCAN_LIFECYCLE_STATES) {
      expect(scanStatusWord(running({ state })).length).toBeGreaterThan(0);
    }
  });

  it("derives the stall sentence from the imported threshold", () => {
    // The sentence quotes a number of seconds. It is COMPUTED from the engine's
    // ceiling, so raising the ceiling rewrites the copy rather than leaving it
    // claiming thirty seconds for a build that waits sixty.
    expect(SCAN_NOT_ADVANCING_LINE).toContain(
      String(ARTIFACT_DEADLINE_MS / 1000),
    );
  });
});

// ---------------------------------------------------------------------------
// THE CLOSED MAPS
// ---------------------------------------------------------------------------

describe("the closed copy maps", () => {
  it("gives every suspension reason its own sentence", () => {
    const sentences = new Set<string>();
    for (const reason of SUSPEND_REASONS) {
      const text = SCAN_SUSPEND_COPY[reason]({ at: AUG_14, rowCap: 5_000 });
      expect(text.length).toBeGreaterThan(0);
      sentences.add(text);
    }
    // DISTINCT, not merely present. A map whose four entries are the same
    // sentence satisfies "every reason has copy" and tells the operator
    // nothing about who or what stopped their scan.
    expect(sentences.size).toBe(SUSPEND_REASONS.length);
  });

  it("names the operator and the moment when the operator paused it", () => {
    expect(
      SCAN_SUSPEND_COPY.operator_paused({ at: AUG_14, rowCap: null }),
    ).toContain("14 Aug 2026, 09:41");
  });

  it("omits a number it does not have rather than fabricating one", () => {
    // The retention cap is not on the status payload. A sentence that named a
    // cap DefMiner cannot read would be a fabricated number on the one surface
    // whose whole subject is refusing to claim more than is known.
    const withCap = SCAN_SUSPEND_COPY.retention_eviction({
      at: AUG_14,
      rowCap: 5_000,
    });
    const without = SCAN_SUSPEND_COPY.retention_eviction({
      at: AUG_14,
      rowCap: null,
    });
    expect(withCap).toContain("5,000");
    expect(without).not.toContain("null");
    expect(without).not.toContain("0-row");
  });

  it("appends the resume position, and drops it when there is none", () => {
    expect(resumePositionClause(AUG_14)).toContain("14 Aug 2026, 09:41");
    expect(resumePositionClause(null)).toBeNull();
  });

  it("gives every start refusal its own sentence, and names which state holds the slot", () => {
    for (const reason of [
      "no-project",
      "already-running",
      "already-suspended",
      "write-failed",
    ] as const) {
      expect(SCAN_REFUSAL_COPY[reason].length).toBeGreaterThan(0);
    }
    // THE TWO OCCUPIED STATES ARE NOT ONE SENTENCE. The operator's next action
    // differs — pause or discard for one, resume or discard for the other —
    // and a merged sentence tells them to press a control that is not on
    // screen.
    expect(SCAN_REFUSAL_COPY["already-running"]).toBe(
      SCAN_ONE_AT_A_TIME_RUNNING,
    );
    expect(SCAN_REFUSAL_COPY["already-suspended"]).toBe(
      SCAN_ONE_AT_A_TIME_SUSPENDED,
    );
    expect(SCAN_ONE_AT_A_TIME_RUNNING).not.toBe(SCAN_ONE_AT_A_TIME_SUSPENDED);
  });

  it("states a DefMiner-authored reason for every clause rejection", () => {
    for (const reason of [
      "comment_construct",
      "unbalanced_parentheses",
      "whitespace_only",
      "too_long",
    ] as const) {
      const line = clauseRejectedLine(reason);
      expect(line).toContain(SCAN_CLAUSE_REJECTION_COPY[reason]);
      // The contract's wording, and the half that matters most: nothing ran.
      expect(line).toContain("Nothing was started.");
    }
  });
});

// ---------------------------------------------------------------------------
// THE COMPOSED PREVIEW AND THE NUMBERS
// ---------------------------------------------------------------------------

describe("the composed preview", () => {
  const OWN = 'resp.raw.like:"%javascript%"';

  it("shows DefMiner's clause first and the operator's last", () => {
    expect(composedPreview(OWN, "req.host.eq:target.example")).toBe(
      `(${OWN}) AND (req.host.eq:target.example)`,
    );
  });

  it("emits no empty parenthesis pair for an empty operator clause", () => {
    // AN EMPTY CLAUSE IS A VALID, COMPLETE INPUT — most scans carry none — and
    // `()` on the wire is a filter Caido would refuse for a reason the operator
    // did not cause.
    expect(composedPreview(OWN, "")).toBe(`(${OWN})`);
    expect(composedPreview(OWN, "")).not.toContain("()");
  });
});

describe("the numbers", () => {
  it("groups every counter and marks an absent one absent", () => {
    expect(counterText(1_234_567)).toBe("1,234,567");
    expect(counterText(0)).toBe("0");
    // `analysed` is `null` until DefMiner can attribute an analysis to a scan.
    // A zero there reads as "nothing has been analysed" on a scan that is
    // analysing.
    expect(counterText(null)).toBe("—");
  });

  it("carries four counters in the strip and three below it, with no overlap", () => {
    expect(SCAN_STRIP_COUNTERS).toHaveLength(4);
    expect(SCAN_DETAIL_COUNTERS).toHaveLength(3);
    const stripIds = SCAN_STRIP_COUNTERS.map((c) => c.id);
    for (const counter of SCAN_DETAIL_COUNTERS) {
      expect(stripIds).not.toContain(counter.id);
    }
  });

  it("reports the real rejected total rather than six zeroes", () => {
    // The per-reason breakdown is not durable — only the aggregate lives on the
    // scan row. Six zeroes would claim nothing was rejected for any reason.
    const line = rejectBreakdownUnavailable(12_345);
    expect(line).toContain("12,345");
    expect(line).not.toContain("0, 0");
    expect(SCAN_REJECT_OUT_OF_SCOPE_BODY.length).toBeGreaterThan(0);
  });

  it("quantifies what a discard destroys and states what it does not", () => {
    const body = discardConfirmBody(AUG_14, 4_210);
    expect(body).toContain("14 Aug 2026, 09:41");
    // `counted`, never a parenthesised plural suffix.
    expect(body).toContain("4,210 requests");
    expect(body).not.toContain("request(s)");
    // WHAT IS NOT DESTROYED, named. "Discard a scan" reads to most operators as
    // "delete what it found", and it does not.
    expect(body).toContain("artifacts and observations are not touched");
    expect(discardConfirmBody(null, 1)).toContain("1 request");
    // And the escape is the non-action, which has to be a distinct label from
    // the destructive one or the dialog offers the same word twice.
    expect(SCAN_DISCARD_KEEP_LABEL).not.toBe(SCAN_DISCARD_CTA);
  });

  it("marks stale numbers stale in words, with the moment they are from", () => {
    const body = scanStaleBody(AUG_14);
    expect(body).toContain("14 Aug 2026, 09:41");
    expect(body).toContain("not updating");
    // Careful NOT to claim the scan stopped — a different fact, and one the
    // frontend cannot observe.
    expect(body).toContain("may still be running");
  });

  it("carries the operator-clause field's label and help", () => {
    expect(SCAN_OPERATOR_CLAUSE_LABEL.length).toBeGreaterThan(0);
    expect(SCAN_OPERATOR_CLAUSE_HELP).toContain("narrow");
    expect(SCAN_OPERATOR_CLAUSE_HELP).toContain("cannot widen");
  });
});
