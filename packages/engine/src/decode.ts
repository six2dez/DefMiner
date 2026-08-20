// packages/engine/src/decode.ts — bytes to text, for HUMAN READING ONLY.
//
// ===========================================================================
// OFFSETS AND HASHES DERIVE FROM RAW BYTES. NEVER FROM TEXT. (ENC-01)
// ===========================================================================
// Decoding UTF-8 is LOSSY on real-world JavaScript. Caido's own `Body.toText()`
// documents that "unprintable characters will be replaced with U+FFFD", and so
// does every decoder here: an invalid byte becomes one replacement character,
// which re-encodes to THREE bytes.
//
// The project's fixture makes the consequence concrete. `corpus/encoded/nonutf8.js`
// is 222 raw bytes; decoded and re-encoded it is 242. The anchor string
// `OFFSET_ANCHOR_END` begins at raw byte 175 and at character 175 — but at byte
// 195 of the re-encoded text. An offset computed in text space and reported as a
// byte offset would point TWENTY BYTES past the thing it claims to describe, and
// nothing in the output would say so. The two digests differ for the same reason,
// which is why `digest.ts` hashes `toRaw()` bytes and this module's output is
// never hashed, never persisted and never used to compute an offset.
//
// So: decode to SHOW a human a line of code. Everything the store keeps comes
// from the bytes.
//
// ===========================================================================
// WHY TWO IMPLEMENTATIONS, CROSS-CHECKED (decision P3-D3)
// ===========================================================================
// TEXTDECODER_MODULE is "none": SPIKE-07 enumerated every export of `buffer`,
// `string_decoder`, `url` and `util` inside Caido 0.57.1 and found NO
// `TextDecoder`, and it is not a global either. So the two paths below are what
// ENC-01 actually has available on this runtime — and ENC-02 binds specifically
// to `string_decoder`.
//
// They should always agree. The cross-check exists precisely because "should
// always" is not a property anybody has measured across every input a target can
// serve, and a silent divergence between the decoder a future offset-mapper uses
// and the one a future UI uses would be invisible in both. The cost is paid ONCE
// PER ARTIFACT — never per window — because the walk operates on bytes.

// BARE specifiers, never the `node:` prefix. Caido's capability probe loaded bare
// `buffer` and bare `string_decoder`; the prefixed forms were never probed inside
// the runtime, and `scripts/ci/check-bundle-imports.mjs` treats a `node:` prefix
// in the shipped bundle as unresolvable (assumption A5).
import { StringDecoder } from "string_decoder";

/** `Buffer.from(bytes).toString("utf8")` — the path `tier1/parse` measured. */
export function decodeViaBuffer(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("utf8");
}

/** `new StringDecoder("utf8").end(...)` — the path ENC-02 names.
 *
 *  `end()` rather than `write()`: `write` HOLDS BACK a trailing partial sequence
 *  waiting for the next chunk, so a body ending mid-character would silently lose
 *  its last byte. `end` flushes, emitting the replacement character instead. A
 *  fresh decoder per call, because the class is stateful and a shared instance
 *  would carry one artifact's trailing bytes into the next one. */
export function decodeViaStringDecoder(bytes: Uint8Array): string {
  return new StringDecoder("utf8").end(Buffer.from(bytes));
}

export type DecodeOptions = {
  /** Run both decoders and assert they agree. Defaults to `true`. */
  crossCheck?: boolean;
};

/** Thrown when the two decoders disagree. Its own class so a caller can tell this
 *  apart from an ordinary failure — a divergence here would mean one of the two
 *  measured decode paths on this runtime had changed behaviour, which is a
 *  finding, not a bad input. */
export class DecodeDivergence extends Error {
  readonly bufferLength: number;
  readonly stringDecoderLength: number;
  readonly firstDifferenceAt: number;
  constructor(a: string, b: string) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
    super(
      `decodeUtf8: the two decode paths disagree at character ${i} ` +
        `(Buffer -> ${a.length} chars, StringDecoder -> ${b.length} chars). ` +
        `TEXTDECODER_MODULE is "none", so these two ARE the decode surface this ` +
        `runtime has; a divergence between them is a measurement that changed.`,
    );
    this.name = "DecodeDivergence";
    this.bufferLength = a.length;
    this.stringDecoderLength = b.length;
    this.firstDifferenceAt = i;
  }
}

/**
 * Decode `bytes` as UTF-8, for display.
 *
 * @param opts.crossCheck defaults to `true`. Set it to `false` only where the
 * second decode's cost is genuinely unaffordable — and note that "unaffordable"
 * means measured, since the cost is one extra pass per artifact against a walk
 * that reads the same bytes in 64 KiB windows.
 */
export function decodeUtf8(
  bytes: Uint8Array,
  opts: DecodeOptions = {},
): string {
  const viaBuffer = decodeViaBuffer(bytes);
  if (opts.crossCheck === false) return viaBuffer;
  const viaStringDecoder = decodeViaStringDecoder(bytes);
  if (viaBuffer !== viaStringDecoder) {
    throw new DecodeDivergence(viaBuffer, viaStringDecoder);
  }
  return viaBuffer;
}
