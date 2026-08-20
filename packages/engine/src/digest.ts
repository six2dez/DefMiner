// packages/engine/src/digest.ts — the ONE hashing path (DET-07).
//
// SDK-free by construction, so this runs under plain vitest on Node with no Caido
// present, and unchanged inside Caido's QuickJS.

// BARE `crypto`, never the `node:` prefix. Caido's capability probe loaded bare
// `crypto` and exposes createHash/Sha256; `caido:crypto` does not load at all, and
// only bare specifiers were ever probed inside the runtime (assumption A5).
import { createHash } from "crypto";

/**
 * SHA-256 over raw response bytes, lowercase hex.
 *
 * Native, never a hand-rolled loop: Phase 0 measured a JS djb2 hash at 187 ms/MB
 * against 0.34 ms/MB for native SHA-256, and an EMPTY per-character loop at
 * 9 ms/MB. DET-07 forbids the hand-rolled shapes outright.
 *
 * The input is always `toRaw()` bytes and never `toText()`: SPIKE-08 measured a
 * 222-byte non-UTF-8 fixture becoming 242 bytes across a toText() round trip, with
 * a different digest. Offsets computed on text would not map to raw bytes and the
 * hash would not identify the artifact (ENC-01).
 */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
