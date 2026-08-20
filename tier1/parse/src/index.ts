// DefMiner Phase 0 plan 00-02 — Tier-1 parse probe (SPIKE-06).
//
// Built by `caido-dev build` through Caido's own tsup config, NOT hand-zipped:
// for this spike the build pipeline is part of what is under test (DIST-05).
//
// The question in words: what are the real CPU and RSS budgets INSIDE Caido —
// not standalone quickjs-ng — and where does the 512 KiB stack actually break?
// This sets every size ceiling in the project.
//
// Every byte figure this probe produces is expressed in the quantity SPIKE-08's
// SIZE_GATE_SOURCE named: DECOMPRESSED identity bytes. Caido hands the plugin a
// decoded body, so the input read from disk here is the same quantity a real
// proxied body would be.
//
// Nothing here evaluates the corpus: `eval` and `new Function` appear nowhere.

import { readFileSync } from "fs";
import { createHash } from "crypto";
import * as acorn from "acorn";
import { parseScript, parseModule } from "meriyah";
import { decode as vlqDecode, encode as vlqEncode } from "@jridgewell/sourcemap-codec";

// ---------------------------------------------------------------------------
// structuredClone polyfill — UNCONDITIONAL, not defensive.
//
// SPIKE-07 measured `typeof structuredClone === "undefined"` on this exact
// build, so meriyah@7's use of it would throw a ReferenceError mid-parse. The
// guard is installed before any parse runs rather than wrapped in a "just in
// case" comment.
// ---------------------------------------------------------------------------
const g = globalThis as unknown as Record<string, unknown>;
let structuredClonePolyfilled = false;
if (typeof g.structuredClone !== "function") {
  const clone = (v: unknown, seen: Map<unknown, unknown>): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v)) return seen.get(v);
    if (v instanceof Date) return new Date(v.getTime());
    if (v instanceof RegExp) return new RegExp(v.source, v.flags);
    if (Array.isArray(v)) {
      const out: unknown[] = [];
      seen.set(v, out);
      for (const item of v) out.push(clone(item, seen));
      return out;
    }
    if (v instanceof Map) {
      const out = new Map();
      seen.set(v, out);
      for (const [k, val] of v) out.set(clone(k, seen), clone(val, seen));
      return out;
    }
    if (v instanceof Set) {
      const out = new Set();
      seen.set(v, out);
      for (const item of v) out.add(clone(item, seen));
      return out;
    }
    const out: Record<string, unknown> = {};
    seen.set(v, out);
    for (const k of Object.keys(v as Record<string, unknown>)) {
      out[k] = clone((v as Record<string, unknown>)[k], seen);
    }
    return out;
  };
  g.structuredClone = (v: unknown) => clone(v, new Map());
  structuredClonePolyfilled = true;
}

// ---------------------------------------------------------------------------
// Marker helper. Every marker carries BOTH clocks:
//   Date.now()        — ms wall clock, the ONLY bridge to the external RSS
//                       sampler and the host log. Measured agreement 0.26 ms.
//   performance.now() — ~1 us monotonic, but boot-relative. performance.timeOrigin
//                       is NOT a Unix epoch, so a timestamp is never computed
//                       from it.
// The elapsed figure always comes from performance.now(); the correlation keys
// always come from Date.now().
// ---------------------------------------------------------------------------
type Mark<T> = {
  label: string;
  elapsed_ms: number;
  start_date: number;
  end_date: number;
  start_qjs: number;
  end_qjs: number;
  ok: boolean;
  err: string | null;
  out: T | null;
};

function measured<T>(sdk: any, label: string, fn: () => T): Mark<T> {
  const startDate = Date.now();
  const t0 = performance.now();
  sdk.console.log(`MARK_START ${label} date=${startDate} qjs=${t0.toFixed(3)}`);
  let ok = true;
  let err: string | null = null;
  let out: T | null = null;
  try {
    out = fn();
  } catch (e: any) {
    ok = false;
    err = (e && e.constructor ? e.constructor.name + ": " : "") + String(e).slice(0, 400);
  }
  const t1 = performance.now();
  const endDate = Date.now();
  sdk.console.log(
    `MARK_END ${label} elapsed_ms=${(t1 - t0).toFixed(3)} ok=${ok} date=${endDate} qjs=${t1.toFixed(3)}`,
  );
  return {
    label,
    elapsed_ms: t1 - t0,
    start_date: startDate,
    end_date: endDate,
    start_qjs: t0,
    end_qjs: t1,
    ok,
    err,
    out,
  };
}

/** Strip the AST off a mark before it crosses the REST boundary. */
function slim<T>(m: Mark<T>) {
  return {
    label: m.label,
    elapsed_ms: m.elapsed_ms,
    start_date: m.start_date,
    end_date: m.end_date,
    start_qjs: m.start_qjs,
    end_qjs: m.end_qjs,
    ok: m.ok,
    err: m.err,
  };
}

// meriyah options fixed once, and RECORDED, because they change the answer.
// `ranges: true` is not optional realism: DefMiner reports findings at byte
// offsets, so Phase 9 will always parse with ranges and a measurement without
// them would understate both the AST size and the parse cost.
const MERIYAH_OPTIONS = { ranges: true, next: true, webcompat: true } as const;

function parseWith(source: string): { mode: string; top_level_nodes: number; ast: unknown } {
  // Try Script first: minified web bundles are overwhelmingly scripts, and a
  // Module parse imposes strict mode, which makes legitimate sloppy-mode bundles
  // fail for reasons that have nothing to do with size.
  try {
    const ast: any = parseScript(source, MERIYAH_OPTIONS);
    return { mode: "script", top_level_nodes: ast.body ? ast.body.length : -1, ast };
  } catch (scriptErr) {
    const ast: any = parseModule(source, MERIYAH_OPTIONS);
    return { mode: "module", top_level_nodes: ast.body ? ast.body.length : -1, ast };
  }
}

/**
 * Build a deterministic sourcemap `mappings` string proportional to the input.
 *
 * MAP-03 has to decide where the `sourcesContent` fast path stops paying and
 * real position attribution begins, and that decision rests on what a VLQ
 * decode of a realistic mappings payload actually costs. One segment per 40
 * source bytes and 60 segments per line is roughly the shape a real minified
 * bundle's map has.
 */
function syntheticMappings(sourceBytes: number): { mappings: string; segments: number } {
  const total = Math.max(1, Math.floor(sourceBytes / 40));
  const perLine = 60;
  const lines: number[][][] = [];
  let genCol = 0;
  let srcIdx = 0;
  let srcLine = 0;
  let srcCol = 0;
  let line: number[][] = [];
  for (let i = 0; i < total; i++) {
    // Deterministic, non-degenerate deltas: a mappings string of all-zero
    // deltas compresses into the cheapest possible VLQ and would flatter the
    // decode cost.
    genCol += 3 + (i % 7);
    srcCol += 1 + (i % 11);
    if (i % 97 === 0) {
      srcLine += 1;
      srcCol = i % 13;
    }
    if (i % 313 === 0) srcIdx = (srcIdx + 1) % 8;
    line.push([genCol, srcIdx, srcLine, srcCol]);
    if (line.length >= perLine) {
      lines.push(line);
      line = [];
      genCol = 0;
    }
  }
  if (line.length) lines.push(line);
  return { mappings: vlqEncode(lines as any), segments: total };
}

/** FNV-1a over UTF-16 code units, written as a plain per-character JS loop. */
function jsLoopHash(s: string): string {
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x01000193 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

type OpResult = ReturnType<typeof slim>;

/**
 * The full six-operation measurement at one size point.
 *
 * Operation ORDER matters and is fixed: RSS never falls in this runtime and
 * there is no gc(), so each operation's step delta is only meaningful as an
 * increment on what came before. The parse runs LAST because it is by far the
 * largest allocator and would otherwise swamp every measurement after it.
 *
 * Input comes from DISK, not through the proxy: the proxy path adds variance to
 * a measurement that is about parse cost.
 */
export async function measure(sdk: any, path: string) {
  const label = String(path);
  sdk.console.log(`LADDER_START path=${label} date=${Date.now()}`);

  // The read is deliberately OUTSIDE the decode marker: reading a file is I/O
  // and would be attributed to decoding.
  const readMark = measured(sdk, "read", () => readFileSync(label));
  if (!readMark.ok || !readMark.out) {
    return { input: { path: label, bytes: null }, error: readMark.err, ops: [slim(readMark)] };
  }
  const bytes: any = readMark.out;
  const inputBytes: number = bytes.length;

  const ops: OpResult[] = [slim(readMark)];

  // 1. decode — raw bytes to a JS string. There is NO TextDecoder on this build
  //    (exported by no module, measured in SPIKE-07), so Buffer.toString is the
  //    decode path ENC-01 actually has available.
  const decodeMark = measured(sdk, "decode", () => bytes.toString("utf8") as string);
  ops.push(slim(decodeMark));
  const source: string = (decodeMark.out as unknown as string) ?? "";

  // 2. hash — native.
  const hashMark = measured(sdk, "hash", () =>
    createHash("sha256").update(bytes).digest("hex"),
  );
  ops.push(slim(hashMark));

  // 3. hash_js_loop — the same job written as a per-character JS loop. This is
  //    the evidence DET-07 rests on: if a hand-written character loop is within
  //    a small factor of the native digest, a JS-side scanner is affordable; if
  //    it is orders of magnitude worse, every per-character design is dead.
  const jsHashMark = measured(sdk, "hash_js_loop", () => jsLoopHash(source));
  ops.push(slim(jsHashMark));

  // 4. vlq_decode — @jridgewell/sourcemap-codec on a synthetic mappings payload
  //    sized against the input. MAP-03 depends on this number.
  const mappingsBuilt = syntheticMappings(inputBytes);
  const vlqMark = measured(sdk, "vlq_decode", () => {
    const decoded = vlqDecode(mappingsBuilt.mappings);
    let n = 0;
    for (const l of decoded) n += l.length;
    return n;
  });
  ops.push(slim(vlqMark));

  // 5. tokenize — acorn.tokenizer(). This is the LOW-MEMORY degradation path
  //    Phase 9 falls back to when an artifact is over AST_MAX_BYTES: it streams
  //    tokens instead of building a tree.
  const tokenMark = measured(sdk, "tokenize", () => {
    let n = 0;
    const t = acorn.tokenizer(source, { ecmaVersion: "latest" as any });
    for (const _tok of t) n++;
    return n;
  });
  ops.push(slim(tokenMark));

  // 6. parse — full meriyah AST. Last, because it allocates the most.
  let parseMode: string | null = null;
  let topLevel: number | null = null;
  const parseMark = measured(sdk, "parse", () => {
    const r = parseWith(source);
    parseMode = r.mode;
    topLevel = r.top_level_nodes;
    // The AST is deliberately still reachable while this marker is open; it is
    // dropped when this closure returns, which RSS will not reflect (RSS never
    // falls here) but which keeps the peak attributable to the parse.
    return { mode: r.mode, top_level_nodes: r.top_level_nodes };
  });
  ops.push(slim(parseMark));

  sdk.console.log(`LADDER_END path=${label} date=${Date.now()}`);

  return {
    input: {
      path: label,
      bytes: inputBytes,
      // Reported so a later reader can confirm the ladder ran on the artifact it
      // claims, without the artifact itself crossing the REST boundary.
      sha256: hashMark.ok ? (hashMark.out as unknown as string) : null,
    },
    ops,
    structured_clone_polyfilled: structuredClonePolyfilled,
    meriyah_options: MERIYAH_OPTIONS,
    parse: { mode: parseMode, top_level_nodes: topLevel, ok: parseMark.ok, err: parseMark.err },
    tokens: tokenMark.ok ? (tokenMark.out as unknown as number) : null,
    vlq: {
      mappings_chars: mappingsBuilt.mappings.length,
      segments_encoded: mappingsBuilt.segments,
      segments_decoded: vlqMark.ok ? (vlqMark.out as unknown as number) : null,
    },
    hash: {
      native_sha256: hashMark.ok ? (hashMark.out as unknown as string) : null,
      js_loop: jsHashMark.ok ? (jsHashMark.out as unknown as string) : null,
      native_ms: hashMark.elapsed_ms,
      js_loop_ms: jsHashMark.elapsed_ms,
      js_loop_slowdown: hashMark.elapsed_ms > 0 ? jsHashMark.elapsed_ms / hashMark.elapsed_ms : null,
    },
  };
}

/**
 * Decode + parse only.
 *
 * Used by BOTH the stack-break sweep and the HARD_MAX_BYTES bisection, because
 * both need the parser and nothing else. The stack sweep needs the failure
 * recorded rather than swallowed: "it throws catchably" and "it kills the
 * process" produce completely different designs for MAP-05 and QUAL-05, and a
 * C-level abort under `panic = "abort"` never reaches the structured log — the
 * driver detects that case from the exit code and stderr instead.
 */
export async function parse_only(sdk: any, path: string) {
  const label = String(path);
  sdk.console.log(`PARSE_ONLY_START path=${label} date=${Date.now()}`);
  const readMark = measured(sdk, "read", () => readFileSync(label));
  if (!readMark.ok || !readMark.out) {
    return { path: label, bytes: null, read_ok: false, err: readMark.err };
  }
  const bytes: any = readMark.out;
  const decodeMark = measured(sdk, "decode", () => bytes.toString("utf8") as string);
  if (!decodeMark.ok) {
    return {
      path: label,
      bytes: bytes.length,
      read_ok: true,
      decode_ok: false,
      err: decodeMark.err,
      ops: [slim(readMark), slim(decodeMark)],
    };
  }
  const source = decodeMark.out as unknown as string;
  let mode: string | null = null;
  const parseMark = measured(sdk, "parse", () => {
    const r = parseWith(source);
    mode = r.mode;
    return r.top_level_nodes;
  });
  sdk.console.log(`PARSE_ONLY_END path=${label} ok=${parseMark.ok} date=${Date.now()}`);
  return {
    path: label,
    bytes: bytes.length,
    chars: source.length,
    read_ok: true,
    decode_ok: true,
    parse_ok: parseMark.ok,
    parse_mode: mode,
    // The full error string, not a boolean: whether it is a RangeError, an
    // InternalError("stack overflow"), or an out-of-memory is the answer
    // STACK_FAILURE_MODE records.
    parse_error: parseMark.err,
    parse_error_catchable: !parseMark.ok,
    ops: [slim(readMark), slim(decodeMark), slim(parseMark)],
  };
}

/** Capability echo so a run can prove which build and options it measured. */
export async function probe_info(sdk: any) {
  return {
    caido_version: String(sdk.runtime?.version ?? "unknown"),
    structured_clone_polyfilled: structuredClonePolyfilled,
    structured_clone_now: typeof (globalThis as any).structuredClone,
    meriyah_options: MERIYAH_OPTIONS,
    acorn_version: (acorn as any).version ?? null,
    date: Date.now(),
    qjs: performance.now(),
  };
}

export function init(sdk: any) {
  sdk.console.log("[tier1-parse] init");
  sdk.api.register("measure", measure);
  sdk.api.register("parse_only", parse_only);
  sdk.api.register("probe_info", probe_info);
  sdk.console.log("[tier1-parse] ready");
}
