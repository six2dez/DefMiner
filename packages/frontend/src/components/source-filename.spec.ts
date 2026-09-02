// packages/frontend/src/components/source-filename.spec.ts — R6 asserted
// against the measured label corpus rather than against a reviewer's attention.
//
// The gate family's own shape: a FIRING fixture (a traversal-shaped label) and
// a LEGAL fixture, because a corpus in which every case fires proves only that
// the check fires.

import { HOSTILE_CASES } from "@defminer/engine/hostile.fixture";
import { SOURCES_LABEL_CASES } from "@defminer/engine/sourcemap/map-fixture";
import { describe, expect, it } from "vitest";

import {
  SOURCE_EXTENSION_ALLOWLIST,
  SOURCE_EXTENSION_FALLBACK,
  sourceDownloadName,
} from "./source-filename";

/** DefMiner-computed, and the ONE value in this file that reaches the output. */
const DIGEST =
  "9f2c4a17be0d3e5c8a1b6d4f70e29c3a5b8d1f4e7c0a3b6d9e2f5a8c1b4d7e0f";
const DIGEST_16 = "9f2c4a17be0d3e5c";

/** R6's pattern, VERBATIM from 07-UI-SPEC.md § "Rendering Safety Contract". */
const R6_PATTERN = /^[0-9a-f]{16}\.(ts|tsx|js|jsx|vue|css|scss|json|md|txt)$/;

const FIRING = SOURCES_LABEL_CASES.find(
  (labelCase) => labelCase.id === "relative-traversal",
);
const LEGAL = SOURCES_LABEL_CASES.find(
  (labelCase) => labelCase.id === "benign-control",
);

describe("R6 — a target string never becomes a filename", () => {
  it("has a FIRING fixture and a LEGAL fixture, both present in the corpus", () => {
    // Non-vacuity. A `find` that returned undefined would make every assertion
    // below run against `null` and pass by asking nothing.
    expect(FIRING?.value).toBe("../../../../../../etc/defminer-escape.txt");
    expect(LEGAL?.value).toBe("src/app/index.js");
  });

  it("gives the traversal-shaped label a name with no path in it", () => {
    const name = sourceDownloadName(DIGEST, FIRING?.value ?? null);
    expect(name).toBe(`${DIGEST_16}${SOURCE_EXTENSION_FALLBACK}`);
    expect(name).toMatch(R6_PATTERN);
    expect(name).not.toContain("/");
    expect(name).not.toContain("..");
    expect(name).not.toContain("etc");
  });

  it("gives the legal label the allowlist's OWN literal, not the label's", () => {
    const name = sourceDownloadName(DIGEST, LEGAL?.value ?? null);
    expect(name).toBe(`${DIGEST_16}.js`);
    expect(name).toMatch(R6_PATTERN);
  });

  it("matches case-INSENSITIVELY and still emits DefMiner's own casing", () => {
    expect(sourceDownloadName(DIGEST, "SRC/APP.TS")).toBe(`${DIGEST_16}.ts`);
    expect(sourceDownloadName(DIGEST, "src/App.Vue")).toBe(`${DIGEST_16}.vue`);
  });

  it("never lets a longer allowlist member be shadowed by a shorter one", () => {
    expect(sourceDownloadName(DIGEST, "a.tsx")).toBe(`${DIGEST_16}.tsx`);
    expect(sourceDownloadName(DIGEST, "a.jsx")).toBe(`${DIGEST_16}.jsx`);
    expect(sourceDownloadName(DIGEST, "a.scss")).toBe(`${DIGEST_16}.scss`);
  });

  it("is fail-closed on a digest DefMiner cannot vouch for", () => {
    // `null` rather than a throw: this runs on a render path. `null` rather
    // than a best-effort name: a best-effort name is a name that does not match
    // R6's pattern, which is the only thing this module promises.
    expect(sourceDownloadName("", "a.ts")).toBeNull();
    expect(sourceDownloadName("ZZZ", "a.ts")).toBeNull();
    expect(sourceDownloadName(DIGEST.toUpperCase(), "a.ts")).toBeNull();
    expect(sourceDownloadName(`${DIGEST}0`, "a.ts")).toBeNull();
    expect(sourceDownloadName(DIGEST.slice(0, 63), "a.ts")).toBeNull();
  });
});

describe("R6 over the whole measured corpus — the label has TEN degrees of freedom", () => {
  /** Every label DefMiner has ever measured, from both corpora. */
  const LABELS: readonly (string | null)[] = [
    ...SOURCES_LABEL_CASES.map((labelCase) => labelCase.value),
    ...HOSTILE_CASES.map((hostileCase) => hostileCase.value),
    null,
  ];

  it("drives both corpora and the null label", () => {
    expect(SOURCES_LABEL_CASES).toHaveLength(23);
    expect(LABELS.length).toBeGreaterThan(40);
  });

  it("produces ONLY names matching R6's exact pattern", () => {
    for (const label of LABELS) {
      expect(sourceDownloadName(DIGEST, label)).toMatch(R6_PATTERN);
    }
  });

  it("produces an output set of at most ten members, every one DefMiner's", () => {
    // THE PROOF, and it is stronger than any substring search could be. Over
    // every hostile label the repo has measured, holding the digest fixed, the
    // set of distinct outputs is bounded by the SIZE OF THE ALLOWLIST — so the
    // label's total influence on the filename is a choice among DefMiner's own
    // literals, and there is nowhere for a byte of it to be.
    const produced = new Set(
      LABELS.map((label) => sourceDownloadName(DIGEST, label)),
    );
    const permitted = new Set(
      [...SOURCE_EXTENSION_ALLOWLIST, SOURCE_EXTENSION_FALLBACK].map(
        (extension) => `${DIGEST_16}${extension}`,
      ),
    );
    expect(permitted.size).toBe(10);
    expect(produced.size).toBeLessThanOrEqual(permitted.size);
    for (const name of produced) {
      expect(permitted.has(name ?? "")).toBe(true);
    }
  });

  it("puts no 3-character run of the label into the DIGEST half", () => {
    // The acceptance criterion's substring assertion, in its honest form. It
    // cannot be stated over the WHOLE name, because a label ending `.txt`
    // shares those bytes with the fallback extension by definition — which is
    // the one place the two strings are permitted to agree, and it agrees
    // because DefMiner chose the literal, not because the label was copied.
    //
    // So it is stated over the digest half, where the claim has content, and
    // the extension half is proved by the exact-set assertion above.
    //
    // Stated as the EQUIVALENT intersection so the 4 MiB case does not cost
    // four million assertions: "no 3-run of the label is in the digest half" is
    // the same claim as "no 3-run OF THE DIGEST HALF is in the label", and the
    // digest half has exactly fourteen of them.
    const trigrams = Array.from({ length: DIGEST_16.length - 2 }, (_, at) =>
      DIGEST_16.slice(at, at + 3),
    );
    expect(trigrams).toHaveLength(14);
    for (const label of LABELS) {
      const name = sourceDownloadName(DIGEST, label);
      expect((name ?? "").slice(0, 16)).toBe(DIGEST_16);
      const text = label ?? "";
      for (const trigram of trigrams) {
        expect(text.includes(trigram)).toBe(false);
      }
    }
  });

  it("gives two different sources two different names, reading neither label", () => {
    // MAP-04/concurrency. The name is a pure function of the digest and the
    // matched extension, so two saves issued in quick succession cannot read
    // each other's label — there is no shared state to read it from.
    const other =
      "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809";
    const first = sourceDownloadName(DIGEST, "src/one.ts");
    const second = sourceDownloadName(other, "src/two.ts");
    expect(first).not.toBe(second);
    expect(first).toBe(`${DIGEST_16}.ts`);
    expect(second).toBe("1a2b3c4d5e6f7081.ts");
  });

  it("cannot be pushed onto — the allowlist is frozen", () => {
    expect(Object.isFrozen(SOURCE_EXTENSION_ALLOWLIST)).toBe(true);
  });
});
