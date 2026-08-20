// packages/engine/src/decode.spec.ts — ENC-01, proven on a real non-UTF-8 file.
//
// The requirement is an INEQUALITY: the digest of an artifact's raw bytes is not
// the digest of its text round trip. Asserting the inequality explicitly is the
// whole point — it is what stops somebody "simplifying" the hash path to operate
// on a string, which would compile, pass every other test in this repo, and
// silently change what an artifact IS.
//
// The fixture is deliberately anchored. `OFFSET_ANCHOR_START` sits BEFORE the
// invalid bytes and `OFFSET_ANCHOR_END` sits after them, so the counterexample
// below can show not only THAT text-derived offsets are wrong but exactly WHERE
// they start being wrong.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DecodeDivergence,
  decodeUtf8,
  decodeViaBuffer,
  decodeViaStringDecoder,
} from "./decode";
import { sha256Hex } from "./digest";

const FIXTURE = fileURLToPath(
  new URL("../../../corpus/encoded/nonutf8.js", import.meta.url),
);

// The recorded identity of the fixture, from corpus/encoded/fixtures.json and
// from SPIKE-08's own measurement. Written as literals here so this file is the
// contract and not merely a re-derivation of whatever happens to be on disk.
const RAW_BYTES = 222;
const RAW_DIGEST =
  "4dc8826e5489007f1bb33a221aa67e0b7729c3c9ff0652cb0ad2a47758fee94d";
const ROUNDTRIP_BYTES = 242;
const ROUNDTRIP_DIGEST =
  "9197a051d895474fd1c928fc6401350a2c527568cfa364380100b366a05619e6";

// `corpus/` is GITIGNORED, so on a fresh clone this file does not exist. That
// must FAIL, loudly, naming both regeneration commands — never skip. A skipped
// ENC-01 proof is indistinguishable from a passing one in any summary line, and
// this is the only test in the repo that holds the byte path in place.
const REGENERATE =
  "corpus/ is gitignored, so this fixture is absent on a fresh clone. Regenerate it with:\n" +
  "    bash scripts/spike/fetch-corpus.sh\n" +
  "    node scripts/spike/make-encoded-fixtures.mjs\n" +
  "This spec is ENC-01's only proof that byte-derived and text-derived values differ; " +
  "it must fail rather than skip.";

/**
 * The fixture's bytes, or a THROW whose message names both regeneration commands.
 *
 * Read lazily inside each case rather than once at module scope, and never with a
 * bare `readFileSync`: a top-level read of a missing file fails the whole FILE
 * with a raw ENOENT, which tells whoever hit it nothing about what to do. Every
 * case below therefore fails individually, loudly, with the remedy attached.
 */
function rawBytes(): Uint8Array {
  if (!existsSync(FIXTURE)) throw new Error(REGENERATE);
  return new Uint8Array(readFileSync(FIXTURE));
}

describe("the fixture is present and is the one that was measured", () => {
  it("exists, and says how to regenerate it if it does not", () => {
    expect(existsSync(FIXTURE), REGENERATE).toBe(true);
  });

  it("is exactly 222 raw bytes", () => {
    expect(rawBytes().length).toBe(RAW_BYTES);
  });

  it("has the recorded raw digest", () => {
    expect(sha256Hex(rawBytes())).toBe(RAW_DIGEST);
  });
});

describe("ENC-01 — the byte path and the text path are NOT the same artifact", () => {
  const roundTrip = (): { raw: Uint8Array; roundTripped: Uint8Array } => {
    const raw = rawBytes();
    return {
      raw,
      roundTripped: new Uint8Array(Buffer.from(decodeUtf8(raw), "utf8")),
    };
  };

  it("a toText() round trip INFLATES 222 bytes to 242", () => {
    const { raw, roundTripped } = roundTrip();
    // Ten invalid bytes become ten U+FFFD, and each of those re-encodes to three
    // bytes: 222 - 10 + 30 = 242.
    expect(roundTripped.length).toBe(ROUNDTRIP_BYTES);
    expect(roundTripped.length - raw.length).toBe(20);
  });

  it("the round-tripped digest is the recorded one", () => {
    expect(sha256Hex(roundTrip().roundTripped)).toBe(ROUNDTRIP_DIGEST);
  });

  it("THE TWO DIGESTS DIFFER — this inequality IS the requirement", () => {
    const { raw, roundTripped } = roundTrip();
    expect(
      sha256Hex(roundTripped),
      "the raw digest and the text-round-trip digest came out EQUAL. Either the fixture is no " +
        "longer the non-UTF-8 one SPIKE-08 measured, or the hash path was changed to operate on " +
        "text. Hashing text makes an artifact's identity depend on how it was decoded (ENC-01).",
    ).not.toBe(sha256Hex(raw));
  });

  it("a VALID UTF-8 input round trips identically, so the inequality is about the input", () => {
    // The control. Without it, "the digests differ" could just as well mean the
    // round-trip helper is broken.
    const ascii = new Uint8Array(Buffer.from("var a = 1;\n", "utf8"));
    const back = new Uint8Array(Buffer.from(decodeUtf8(ascii), "utf8"));
    expect(sha256Hex(back)).toBe(sha256Hex(ascii));
  });
});

describe("a text-derived offset does not map back to the bytes", () => {
  /** Where `needle` starts, measured three ways. */
  function offsets(needle: string): {
    rawByte: number;
    charIndex: number;
    textDerivedByte: number;
  } {
    const rawBuf = Buffer.from(rawBytes());
    const text = decodeUtf8(rawBytes());
    return {
      rawByte: rawBuf.indexOf(Buffer.from(needle, "utf8")),
      charIndex: text.indexOf(needle),
      // What a mapper working in TEXT space would compute and hand back as a
      // "byte offset".
      textDerivedByte: Buffer.byteLength(
        text.slice(0, text.indexOf(needle)),
        "utf8",
      ),
    };
  }

  it("BEFORE the invalid bytes, all three agree — so the failure is localised", () => {
    const o = offsets("OFFSET_ANCHOR_START");
    expect(o.rawByte).toBe(106);
    expect(o.charIndex).toBe(106);
    expect(o.textDerivedByte).toBe(106);
  });

  it("AFTER the invalid bytes, the text-derived offset is 20 bytes WRONG", () => {
    // The failing counterexample the rule exists for. A finding reported at byte
    // 195 of a 222-byte file, pointing at something that lives at byte 175.
    const o = offsets("OFFSET_ANCHOR_END");
    expect(o.rawByte).toBe(175);
    expect(o.textDerivedByte).toBe(195);
    expect(
      o.textDerivedByte,
      "the text-derived byte offset now EQUALS the raw one for this fixture, which means the " +
        "counterexample stopped being one. ENC-01's rule that offsets derive from raw bytes " +
        "would still be stated and would no longer be demonstrated.",
    ).not.toBe(o.rawByte);
    expect(o.textDerivedByte - o.rawByte).toBe(20);
  });

  it("the raw offset points at the anchor and the text-derived one does not", () => {
    const rawBuf = Buffer.from(rawBytes());
    const o = offsets("OFFSET_ANCHOR_END");
    const needle = Buffer.from("OFFSET_ANCHOR_END", "utf8");
    expect(
      rawBuf.subarray(o.rawByte, o.rawByte + needle.length).equals(needle),
    ).toBe(true);
    expect(
      rawBuf
        .subarray(o.textDerivedByte, o.textDerivedByte + needle.length)
        .equals(needle),
    ).toBe(false);
  });
});

describe("the two decode paths agree (decision P3-D3)", () => {
  it("return an identical string for the non-UTF-8 fixture", () => {
    const raw = rawBytes();
    expect(decodeViaStringDecoder(raw)).toBe(decodeViaBuffer(raw));
  });

  it.each([
    ["plain ASCII", "var a = 1;\n"],
    ["multi-byte, valid", 'const s = "héllo — ✓ 𝄞";\n'],
    ["empty", ""],
  ])("return an identical string for %s", (_name, input) => {
    const bytes = new Uint8Array(Buffer.from(input, "utf8"));
    expect(decodeViaStringDecoder(bytes)).toBe(decodeViaBuffer(bytes));
    expect(decodeUtf8(bytes)).toBe(input);
  });

  it("flushes a TRAILING partial sequence rather than dropping it", () => {
    // `StringDecoder.write()` holds back an incomplete sequence waiting for more
    // input; `end()` flushes it. A body that ends mid-character is a real thing a
    // target can serve, and the difference between the two methods is one
    // silently missing character at the end of the file.
    const truncated = new Uint8Array([0x61, 0xe2, 0x9c]); // "a" + first 2 of 3
    expect(decodeViaStringDecoder(truncated)).toBe(decodeViaBuffer(truncated));
    expect(decodeViaStringDecoder(truncated).length).toBeGreaterThan(1);
  });

  it("does not leak state between calls", () => {
    // A shared StringDecoder would carry one artifact's trailing bytes into the
    // next one — a cross-artifact corruption that would only appear under load.
    const truncated = new Uint8Array([0xe2, 0x9c]);
    const first = decodeViaStringDecoder(truncated);
    const second = decodeViaStringDecoder(truncated);
    expect(second).toBe(first);
  });

  it("crossCheck: false skips the second decode and returns the Buffer path", () => {
    const raw = rawBytes();
    expect(decodeUtf8(raw, { crossCheck: false })).toBe(decodeViaBuffer(raw));
  });

  it("DecodeDivergence reports where the two paths parted company", () => {
    // Execute the failing path. The divergence class is unreachable while the two
    // decoders agree, so the only way to know its message is useful is to build
    // one.
    const d = new DecodeDivergence("abcdef", "abcXef");
    expect(d.firstDifferenceAt).toBe(3);
    expect(d.name).toBe("DecodeDivergence");
    expect(String(d)).toContain("disagree at character 3");
  });
});

describe("decoding is for DISPLAY, and the file says so", () => {
  it("decode.ts states that offsets and hashes derive from raw bytes", () => {
    // A rule that lives only in a plan document is a rule the next person does
    // not read. This asserts the reasoning is in the file somebody would edit.
    const source = readFileSync(
      fileURLToPath(new URL("./decode.ts", import.meta.url)),
      "utf8",
    );
    expect(source).toContain("ENC-01");
    expect(source.toLowerCase()).toContain("never from text");
  });
});
