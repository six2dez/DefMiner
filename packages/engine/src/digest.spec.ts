// packages/engine/src/digest.spec.ts — the ONE hashing path (DET-07, STORE-03).
//
// The permanent home for the empty-digest assertion plan 01-01 parked in a
// transient acceptance probe (01-01-SUMMARY.md § Next Phase Readiness), plus the
// two properties an artifact's identity actually rests on: that the digest is a
// function of the BYTES and nothing else, and that it stays native.
//
// DET-07's rule is not a style preference. Phase 0 measured a JS per-character
// hash at 187 ms/MB against 0.34 ms/MB for native SHA-256 — a factor of 550 — and
// measured an EMPTY per-character loop at 9 ms/MB, so even a loop that computed
// nothing would cost 26x the whole native hash. On an 8 MiB ceiling artifact that
// is 1.5 seconds of uninterruptible work on the one thread this runtime has,
// against 2.8 milliseconds.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { sha256Hex } from "./digest";

const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function bytesOf(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "utf8"));
}

describe("known-answer tests", () => {
  it("the empty byte string hashes to the published SHA-256 of nothing", () => {
    // A known answer, not a self-comparison: this is what pins the algorithm and
    // the encoding at once. `sha256("")` is the most widely published digest
    // there is, so a mismatch means the implementation is not SHA-256 or not
    // lowercase hex — either of which would silently redefine artifact identity.
    expect(sha256Hex(new Uint8Array(0))).toBe(EMPTY_SHA256);
  });

  it.each([
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "hello world",
      "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    ],
  ])("sha256Hex(%s)", (input, expected) => {
    expect(sha256Hex(bytesOf(input))).toBe(expected);
  });

  it("is lowercase hex of exactly 64 characters", () => {
    const d = sha256Hex(bytesOf("anything"));
    expect(d.length).toBe(64);
    expect(d).toBe(d.toLowerCase());
    expect([...d].every((c) => "0123456789abcdef".includes(c))).toBe(true);
  });
});

describe("the digest is a function of the BYTES and nothing else", () => {
  it("is stable across two calls on the same input", () => {
    const b = bytesOf("var a = 1;\n");
    expect(sha256Hex(b)).toBe(sha256Hex(b));
  });

  it("is stable across two SEPARATELY CONSTRUCTED equal inputs", () => {
    // Stability across two calls alone would also hold for a memoised-by-identity
    // implementation, which would be wrong for exactly the case that matters: the
    // same bundle arriving twice as two different arrays (STORE-03's whole point).
    expect(sha256Hex(bytesOf("same"))).toBe(sha256Hex(bytesOf("same")));
  });

  it("accepts a SUBARRAY VIEW and hashes only the view's bytes", () => {
    // `chunker.ts` hands out subarray views rather than copies, so a hash taken
    // over a view must not silently see the whole backing buffer. A `subarray`
    // shares the ArrayBuffer and carries a byteOffset; an implementation that
    // reached for `.buffer` would hash the wrong thing and there would be nothing
    // in the digest to show it.
    const whole = bytesOf("PREFIXpayloadSUFFIX");
    const view = whole.subarray(6, 13);
    expect(view.buffer).toBe(whole.buffer);
    expect(view.byteOffset).toBe(6);
    expect(sha256Hex(view)).toBe(sha256Hex(bytesOf("payload")));
    expect(sha256Hex(view)).not.toBe(sha256Hex(whole));
  });

  it("a view spanning the whole array equals the array's own digest", () => {
    const whole = bytesOf("console.log(1);");
    expect(sha256Hex(whole.subarray(0))).toBe(sha256Hex(whole));
  });

  it("distinguishes inputs that differ in one byte", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 4]);
    expect(sha256Hex(a)).not.toBe(sha256Hex(b));
  });

  it("distinguishes a byte sequence from its text round trip", () => {
    // The same inequality decode.spec.ts proves on the real fixture, in miniature
    // and without needing the corpus: 0xff is not valid UTF-8, so decoding and
    // re-encoding produces different bytes and therefore a different artifact.
    const raw = new Uint8Array([0x61, 0xff, 0x62]);
    const roundTripped = new Uint8Array(
      Buffer.from(Buffer.from(raw).toString("utf8"), "utf8"),
    );
    expect(roundTripped.length).not.toBe(raw.length);
    expect(sha256Hex(roundTripped)).not.toBe(sha256Hex(raw));
  });
});

describe("DET-07 — the hash stays native, across the whole engine", () => {
  const SRC = fileURLToPath(new URL("./", import.meta.url));
  const GENERATED = "thresholds.generated.ts";
  const files = readdirSync(SRC)
    .filter(
      (n) => n.endsWith(".ts") && !n.endsWith(".spec.ts") && n !== GENERATED,
    )
    .sort();

  /** Comments stripped, so the scans below test CODE. Both `digest.ts` and
   *  `decode.ts` NAME the rejected techniques in order to record the measurement
   *  that rejected them; a scan that banned the words could only be satisfied by
   *  deleting the reasoning. */
  function stripComments(source: string): string {
    let out = "";
    let i = 0;
    while (i < source.length) {
      if (source[i] === "/" && source[i + 1] === "/") {
        while (i < source.length && source[i] !== "\n") i += 1;
        continue;
      }
      if (source[i] === "/" && source[i + 1] === "*") {
        i += 2;
        while (
          i < source.length &&
          !(source[i] === "*" && source[i + 1] === "/")
        ) {
          i += 1;
        }
        i += 2;
        continue;
      }
      out += source[i];
      i += 1;
    }
    return out;
  }

  const PER_CHARACTER = [
    "charCodeAt",
    "codePointAt",
    ".charAt(",
    "fromCharCode",
  ];

  const REMEDY =
    "DET-07 forbids per-character iteration over an input: Phase 0 measured a JS FNV-1a loop at " +
    "187 ms/MB against 0.34 ms/MB for native SHA-256, and an EMPTY per-character loop at " +
    "9 ms/MB. On an 8 MiB artifact that is over a second of uninterruptible work on the single " +
    "thread, and SPIKE-01 measured that this runtime has no interrupt for it.";

  it("found engine sources to scan", () => {
    // NON-VACUITY: an empty enumeration would let both scans below pass having
    // read nothing.
    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain("digest.ts");
  });

  it.each(files)("%s contains no per-character index loop", (name) => {
    const code = stripComments(readFileSync(join(SRC, name), "utf8"));
    const found = PER_CHARACTER.filter((p) => code.includes(p));
    expect(found, `${name} uses ${found.join(", ")}. ${REMEDY}`).toEqual([]);
  });

  it("digest.ts contains NO loop of any kind", () => {
    // Stronger than the scan above, and only for this file: a native hash needs
    // no iteration at all, so any loop here is a hand-rolled path being
    // reintroduced. `jsLoopHash` in tier1/parse/src/index.ts is the shape this
    // forbids — it is the code that PRODUCED the 187 ms/MB figure, and it is
    // deliberately not in the engine.
    const code = stripComments(readFileSync(join(SRC, "digest.ts"), "utf8"));
    for (const loop of ["for (", "for(", "while (", "while(", ".reduce("]) {
      expect(
        code.includes(loop),
        `digest.ts contains \`${loop}\`. ${REMEDY}`,
      ).toBe(false);
    }
  });

  it("digest.ts uses createHash from the BARE `crypto` specifier", () => {
    // Bare, never `node:crypto` and never `caido:crypto`. SPIKE-07 loaded bare
    // `crypto` inside the runtime and got createHash/Sha256; `caido:crypto` does
    // not load at all, and the prefixed form was never probed there.
    const code = stripComments(readFileSync(join(SRC, "digest.ts"), "utf8"));
    expect(code).toContain('from "crypto"');
    expect(code).not.toContain('from "node:crypto"');
    expect(code).not.toContain("caido:");
  });

  it("the comment stripper strips comments and keeps code", () => {
    // Guards the guard: a stripper returning "" would make every scan above pass
    // unconditionally.
    expect(stripComments("// charCodeAt\nlet a;")).not.toContain("charCodeAt");
    expect(stripComments("/* for ( */ let b;")).toContain("let b;");
    expect(stripComments("s.charCodeAt(0);")).toContain("charCodeAt");
  });
});
