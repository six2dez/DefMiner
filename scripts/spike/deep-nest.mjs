#!/usr/bin/env node
// scripts/spike/deep-nest.mjs — deterministic deep-nesting fixtures for the
// SPIKE-06 stack-break probe.
//
// Generated rather than downloaded: the point is a precise, reproducible nesting
// depth, and no real bundle offers one. Written into `corpus/nesting/` rather
// than `corpus/` itself because plan 00-03 is serving `corpus/` concurrently.
//
// WHY THE REAL PARSER AND NOT SYNTHETIC RECURSION. SPIKE-07 measured 1,021
// frames for a trivial one-argument function before a catchable RangeError. A
// meriyah parser frame carries locals, arguments and parser state and is far
// larger, so the effective depth is much lower and has to be MEASURED. What the
// driver is really after is not the number alone but HOW it fails: a catchable
// throw and a process death produce completely different designs for MAP-05 and
// QUAL-05.
//
// Usage:
//   node scripts/spike/deep-nest.mjs                 # the standard ladder
//   node scripts/spike/deep-nest.mjs --n 1234        # one depth, for bisection

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "corpus/nesting";
const LADDER = [100, 500, 1000, 2000, 5000, 10000, 20000];

// Two shapes, because they exercise different parser paths. Array literals
// recurse through the expression parser's element list; parenthesised
// expressions recurse through the primary-expression path, which is where a
// hand-written recursive-descent parser usually bottoms out first.
function shapes(n) {
  return [
    { kind: "brackets", body: "var a = " + "[".repeat(n) + "]".repeat(n) + ";\n" },
    { kind: "parens", body: "var b = " + "(".repeat(n) + "1" + ")".repeat(n) + ";\n" },
  ];
}

function emit(n) {
  const written = [];
  for (const { kind, body } of shapes(n)) {
    const name = `${kind}-${n}.js`;
    writeFileSync(join(OUT, name), body);
    written.push({ kind, n, file: name, bytes: Buffer.byteLength(body) });
  }
  return written;
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const i = process.argv.indexOf("--n");
  const ns = i !== -1 ? [Number(process.argv[i + 1])] : LADDER;
  if (ns.some((n) => !Number.isInteger(n) || n < 1)) {
    throw new Error("--n must be a positive integer");
  }
  const all = [];
  for (const n of ns) all.push(...emit(n));
  if (i === -1) {
    writeFileSync(
      join(OUT, "fixtures.json"),
      JSON.stringify({ generated_at: new Date().toISOString(), ladder: LADDER, fixtures: all }, null, 2) + "\n",
    );
  }
  for (const f of all) {
    process.stdout.write(`  ${f.file.padEnd(20)} n=${String(f.n).padStart(6)}  ${f.bytes} B\n`);
  }
}

main();
