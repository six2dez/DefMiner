#!/usr/bin/env node
// scripts/spike/make-encoded-fixtures.mjs — SPIKE-08 fixture generator.
//
// Produces pre-compressed variants of two pinned corpus artifacts plus one
// deliberately non-UTF-8 fixture, into `corpus/encoded/` — NOT into `corpus/`
// itself. Plan 00-03 serves `corpus/` concurrently on port 8083 from the same
// checkout, so a distinct subdirectory with distinct filenames is what keeps the
// two plans out of each other's way.
//
// Node's built-in zlib provides gzipSync, brotliCompressSync AND zstdCompressSync
// on v26, so no third-party compression dependency is added — adding one would
// bypass the package-legitimacy gate plan 00-01 cleared with the operator.
//
// WHAT THE COMPRESSED FILES ARE FOR, precisely.
// `scripts/spike/origin.py` (owned by plan 00-01, not modified here) compresses
// on the fly with Python's zlib when a request carries `?encoding=<enc>`; there
// is no passthrough mode that would let it serve these exact bytes under a
// Content-Encoding header. So these files are the DECLARED reference: they fix
// the compression ratio for each artifact reproducibly and give a Node-computed
// wire byte count. The driver additionally records the wire byte count actually
// OBSERVED from a direct, non-proxied fetch of the origin, because Python's and
// Node's codecs do not agree byte-for-byte at their default levels. Both numbers
// go into the result; the observed one is authoritative for "what the origin
// sent", the fixture one is the reproducible cross-check.
//
// Usage: node scripts/spike/make-encoded-fixtures.mjs [--out corpus/encoded]

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  brotliCompressSync,
  brotliDecompressSync,
  gunzipSync,
  gzipSync,
  zstdCompressSync,
  zstdDecompressSync,
} from "node:zlib";

const OUT = (() => {
  const i = process.argv.indexOf("--out");
  return i !== -1 ? process.argv[i + 1] : "corpus/encoded";
})();
const CORPUS = "corpus";

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// gzip and zstd carry container magic; brotli deliberately does not, which is
// itself the reason the probe cannot identify brotli by signature and has to
// fall back on "these leading bytes are not plausible JavaScript text".
const CODECS = {
  gzip: { compress: gzipSync, decompress: gunzipSync, magic: "1f8b" },
  br: { compress: brotliCompressSync, decompress: brotliDecompressSync, magic: null },
  zstd: { compress: zstdCompressSync, decompress: zstdDecompressSync, magic: "28b52ffd" },
};

// Two size points, both from the SHA-256-gated pinned corpus. Small and large
// on purpose: the compression ratio of minified JavaScript is what makes a size
// ceiling expressed against the wrong quantity wrong by a factor of three or
// four, and the ratio is not constant across artifact sizes.
const SOURCES = [
  { alias: "ace-small.js", source: "ace-1.36.5.js", label: "small" },
  { alias: "babel-large.js", source: "babel-7.26.4.js", label: "large" },
];

/**
 * A syntactically plausible JavaScript file whose string literal holds bytes
 * that are NOT valid UTF-8.
 *
 * This is the concrete hazard ENC-01 exists to prevent: `Body.toText()`
 * documents that "unprintable characters will be replaced with U+FFFD", and a
 * replacement is not length-preserving in bytes — so any offset taken from the
 * text view is wrong for every byte after the first bad sequence, and a finding
 * reported at that offset points at the wrong source location.
 *
 * The invalid sequences, chosen to cover the distinct failure classes:
 *   C3 28        truncated 2-byte sequence (valid lead, invalid continuation)
 *   A0 A1        bare continuation bytes with no lead
 *   E2 28 A1     truncated 3-byte sequence
 *   F0 28 8C BC  truncated 4-byte sequence
 *   FE FF        bytes that can never appear in UTF-8 at all
 */
function nonUtf8Fixture() {
  const head = Buffer.from(
    "// DefMiner SPIKE-08 / ENC-01 fixture — the string literal below is NOT valid UTF-8.\n" +
      "var marker_before = \"OFFSET_ANCHOR_START\";\nvar bad = \"",
    "latin1",
  );
  const bad = Buffer.from([
    0xc3, 0x28, 0xa0, 0xa1, 0xe2, 0x28, 0xa1, 0xf0, 0x28, 0x8c, 0xbc, 0xfe, 0xff,
  ]);
  const tail = Buffer.from(
    "\";\nvar marker_after = \"OFFSET_ANCHOR_END\";\nfunction f(a){return a+1;}\n",
    "latin1",
  );
  return Buffer.concat([head, bad, tail]);
}

function main() {
  mkdirSync(OUT, { recursive: true });

  const fixtures = [];
  const originHeaders = {};

  const emit = (alias, raw, note) => {
    // The identity copy is what origin.py actually reads and (re-)encodes.
    writeFileSync(join(OUT, alias), raw);
    const decodedSha = sha256(raw);
    fixtures.push({
      fixture: alias,
      encoding: "identity",
      note,
      wire_bytes: raw.length,
      decoded_bytes: raw.length,
      ratio: 1,
      sha256_wire: decodedSha,
      sha256_decoded: decodedSha,
      content_encoding: null,
      path: "/" + alias,
    });
    // no-store on every fixture: SPIKE-08 is about body semantics, and a cached
    // response would silently change WHICH bytes the plugin saw.
    originHeaders["/" + alias] = {
      content_encoding: "identity",
      cache_control: "no-store",
      content_type: "application/javascript",
    };

    for (const [enc, codec] of Object.entries(CODECS)) {
      const wire = codec.compress(raw);
      // Round-trip every codec before recording it. A fixture whose declared
      // decoded length does not reproduce is a fixture that would make the
      // whole spike's arithmetic wrong in a direction nobody would notice.
      const back = codec.decompress(wire);
      if (back.length !== raw.length || sha256(back) !== decodedSha) {
        throw new Error(`${alias}: ${enc} did not round-trip`);
      }
      const file = `${alias}.${enc}`;
      writeFileSync(join(OUT, file), wire);
      const record = {
        fixture: alias,
        encoding: enc,
        note,
        wire_bytes: wire.length,
        decoded_bytes: raw.length,
        ratio: Number((raw.length / wire.length).toFixed(4)),
        sha256_wire: sha256(wire),
        sha256_decoded: decodedSha,
        content_encoding: enc,
        container_magic_hex: codec.magic,
        first16_wire_hex: Buffer.from(wire.subarray(0, 16)).toString("hex"),
        // What origin.py must serve for this fixture+encoding.
        origin_request: `/${alias}?encoding=${enc}`,
        declared_headers: {
          "Content-Encoding": enc,
          "Content-Length": wire.length,
          "Content-Type": "application/javascript",
          "Cache-Control": "no-store",
        },
        file,
      };
      fixtures.push(record);
      // Per-fixture sidecar, as the plan requires: one JSON per fixture stating
      // the Content-Encoding and Content-Length the origin must serve.
      writeFileSync(join(OUT, `${file}.json`), JSON.stringify(record, null, 2) + "\n");
    }
  };

  for (const { alias, source, label } of SOURCES) {
    const raw = readFileSync(join(CORPUS, source));
    emit(alias, raw, `pinned corpus artifact ${basename(source)} (${label})`);
  }

  emit(
    "nonutf8.js",
    nonUtf8Fixture(),
    "deliberately invalid UTF-8 inside a string literal — toText() substitutes U+FFFD and every byte offset after the first bad sequence is wrong (ENC-01)",
  );

  writeFileSync(
    join(OUT, "origin-headers.json"),
    JSON.stringify(originHeaders, null, 2) + "\n",
  );
  writeFileSync(
    join(OUT, "fixtures.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        generator: "scripts/spike/make-encoded-fixtures.mjs",
        node: process.version,
        codecs: "node:zlib built-ins only (gzipSync, brotliCompressSync, zstdCompressSync)",
        fixtures,
      },
      null,
      2,
    ) + "\n",
  );

  for (const f of fixtures) {
    process.stdout.write(
      `  ${f.fixture.padEnd(16)} ${String(f.encoding).padEnd(9)} wire=${String(f.wire_bytes).padStart(9)}  decoded=${String(f.decoded_bytes).padStart(9)}  ratio=${f.ratio}\n`,
    );
  }
  process.stdout.write(`wrote ${fixtures.length} fixture records to ${OUT}\n`);
}

main();
