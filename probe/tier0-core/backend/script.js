// DefMiner Phase 0 — Tier-0 core probe.
//
// Plain ESM, no `caido:` imports: the SDK arrives as the `init` argument.
// Everything here is measurement code. It reads and times; it never evaluates
// corpus content (`eval` and `new Function` appear nowhere in this phase).

// ---------------------------------------------------------------------------
// Shared marker helper. Every marker carries BOTH clocks:
//   Date.now()        — millisecond wall clock, the bridge to host log timestamps
//   performance.now() — ~1 us monotonic, but boot-relative; NOT a timestamp.
// performance.timeOrigin is a monotonic boot origin, so timeOrigin + now() does
// NOT yield an epoch time. Measured host-log agreement for Date.now(): 0.26 ms.
// ---------------------------------------------------------------------------
function mark(sdk, label, extra) {
  sdk.console.log(
    `MARK ${label} date=${Date.now()} qjs=${performance.now().toFixed(3)}` +
      (extra ? ` ${extra}` : "")
  );
}

// ---------------------------------------------------------------------------
// capabilities — SPIKE-07.
// Enumerates rather than asserting. @caido/quickjs-types declares ~6 globals;
// the runtime exposes ~80. Only enumeration gives ground truth.
// ---------------------------------------------------------------------------
async function capabilities(sdk) {
  const startedAt = Date.now();
  mark(sdk, "CAPABILITIES_START");

  const globals = Object.getOwnPropertyNames(globalThis).sort();

  const typeofs = {};
  for (const n of [
    "WebAssembly", "structuredClone", "performance", "queueMicrotask",
    "setImmediate", "setTimeout", "setInterval", "TextDecoder", "TextEncoder",
    "atob", "btoa", "URL", "URLSearchParams", "Atomics", "SharedArrayBuffer",
    "WeakRef", "FinalizationRegistry", "Worker", "crypto", "Buffer", "fetch",
    "Blob", "ReadableStream", "AbortController", "gc",
  ]) {
    typeofs[n] = typeof globalThis[n];
  }

  // Dynamic import() of every candidate. A failure is data, not an error:
  // llrt:qjs / perf_hooks / process all failing is exactly why memory must be
  // measured externally as RSS.
  const modules = {};
  for (const spec of [
    "llrt:qjs", "qjs", "perf_hooks", "process", "os", "path", "fs",
    "sqlite", "caido:http", "caido:crypto", "crypto",
    "buffer", "string_decoder", "url", "util", "stream", "events", "zlib",
  ]) {
    try {
      const m = await import(spec);
      modules[spec] = Object.keys(m).sort();
    } catch (e) {
      modules[spec] = "ERR: " + String(e).slice(0, 160);
    }
  }

  // Open question 4: TextDecoder is not a global. Which module, if any, exports
  // it? ENC-01 and ENC-02 depend on the answer, so resolve it explicitly rather
  // than leaving it to be inferred from the module dump above.
  let textDecoderModule = null;
  let textEncoderModule = null;
  for (const spec of ["buffer", "string_decoder", "url", "util"]) {
    const exp = modules[spec];
    if (Array.isArray(exp)) {
      if (textDecoderModule === null && exp.includes("TextDecoder")) textDecoderModule = spec;
      if (textEncoderModule === null && exp.includes("TextEncoder")) textEncoderModule = spec;
    }
  }

  // Trivial 1-argument frame. Real AST-walk frames are far larger, so this is an
  // upper bound on depth, not the effective one — SPIKE-06 measures that with a
  // real parser. What matters here is whether the failure is CATCHABLE: "it
  // throws" and "it segfaults" produce completely different designs downstream.
  let stackDepth = -1;
  let stackError = null;
  let stackCatchable = false;
  try {
    (function d(n) { stackDepth = n; return d(n + 1); })(0);
  } catch (e) {
    stackCatchable = true;
    stackError = (e && e.constructor && e.constructor.name) || String(e).slice(0, 80);
  }

  // Smallest observable non-zero performance.now() delta.
  let minDelta = Infinity;
  if (typeof performance?.now === "function") {
    let last = performance.now();
    for (let i = 0; i < 200000; i++) {
      const n = performance.now();
      if (n !== last) { if (n - last < minDelta) minDelta = n - last; last = n; }
    }
  }

  mark(sdk, "CAPABILITIES_END");
  return {
    caido_version: String(sdk.runtime?.version ?? "unknown"),
    globals,
    globals_count: globals.length,
    typeofs,
    modules,
    text_decoder_module: textDecoderModule,
    text_encoder_module: textEncoderModule,
    stack: { depth: stackDepth, error: stackError, catchable: stackCatchable },
    clock: {
      min_delta_ms: minDelta === Infinity ? null : minDelta,
      time_origin: performance?.timeOrigin ?? null,
      time_origin_is_wall_clock: false,
      date_now: Date.now(),
    },
    started_at: startedAt,
    finished_at: Date.now(),
  };
}


// ===========================================================================
// SPIKE-02 — does setTimeout(fn, 0) actually yield the QuickJS event loop?
//
// METHODOLOGY NOTE, and it matters more than the code: a fixed ITERATION COUNT
// produced a FALSE NEGATIVE during research. A 50-iteration run completed in
// 0.355 ms — shorter than a single 4 ms timer period — so the timer never got a
// chance to fire and setTimeout looked like it did not yield. Every loop below
// therefore runs for a fixed WALL-CLOCK WINDOW and reports both the observed
// tick count and the count theoretically possible, plus a `valid` flag that is
// false when too few periods elapsed to observe anything at all.
// ===========================================================================

// Caido's POST /plugin/backend/<uuid>/function endpoint accepts `args` as an
// array of STRINGS ONLY — passing a JSON number returns
// 400 invalid_json "invalid type: integer `300`, expected a string".
// Every numeric parameter therefore arrives as a string and must be coerced.
function num(v, fallback) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const YIELDERS = {
  // setTimeout clamps to >=4 ms in this runtime, so setTimeout(fn,0) and
  // setTimeout(fn,1) are indistinguishable. Measured, not assumed, below.
  setTimeout0: () => new Promise((r) => setTimeout(r, 0)),
  setImmediate: () => new Promise((r) => setImmediate(r)),
  promiseResolve: () => Promise.resolve(),
  blocking: null, // baseline: no yield at all
};

async function runWindow(durationMs, syncSliceMs, name) {
  const yielder = YIELDERS[name];
  let ticks = 0;
  const iv = setInterval(() => { ticks++; }, 4);
  const t0 = performance.now();
  let yields = 0;
  while (performance.now() - t0 < durationMs) {
    const w0 = performance.now();
    // Representative synchronous work, not an empty spin: keep the optimiser
    // from eliding the slice entirely.
    let acc = 0;
    while (performance.now() - w0 < syncSliceMs) { acc += Math.sqrt(acc + 1); }
    if (acc === -1) throw new Error("unreachable");
    if (yielder) { await yielder(); yields++; }
  }
  clearInterval(iv);
  const total = performance.now() - t0;
  const possible = Math.floor(total / 4);
  return {
    primitive: name,
    duration_ms: Number(total.toFixed(3)),
    yields,
    timer_ticks: ticks,
    expected_ticks_if_free: possible,
    timer_service_ratio: Number((ticks / Math.max(1, possible)).toFixed(4)),
    valid: possible >= 20, // guards the fixed-iteration false negative
  };
}

function summarise(samples) {
  const s = [...samples].sort((a, b) => a - b);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return {
    n: s.length,
    median: Number(at(0.5).toFixed(4)),
    p95: Number(at(0.95).toFixed(4)),
    min: Number(s[0].toFixed(4)),
    max: Number(s[s.length - 1].toFixed(4)),
  };
}

async function yieldExperiment(sdk, durationMs, syncSliceMs, costSamples) {
  durationMs = num(durationMs, 300);
  syncSliceMs = num(syncSliceMs, 1);
  costSamples = num(costSamples, 48);
  mark(sdk, "YIELD_EXPERIMENT_START", `window=${durationMs} slice=${syncSliceMs}`);

  const windows = [];
  for (const name of ["setTimeout0", "setImmediate", "promiseResolve", "blocking"]) {
    windows.push(await runWindow(durationMs, syncSliceMs, name));
  }

  // The winner is the primitive that actually let timers run.
  const ranked = windows.filter((w) => YIELDERS[w.primitive])
                        .sort((a, b) => b.timer_service_ratio - a.timer_service_ratio);
  const winner = ranked[0].primitive;

  // Per-yield cost of the winner, isolated: time ONLY the await, with no
  // synchronous work in between.
  const costs = [];
  for (let i = 0; i < costSamples; i++) {
    const t = performance.now();
    await YIELDERS[winner]();
    costs.push(performance.now() - t);
  }

  // The clamp, MEASURED rather than assumed: if setTimeout(fn,0) and
  // setTimeout(fn,1) are indistinguishable, the runtime is clamping.
  const clamp = {};
  for (const d of [0, 1, 4, 10]) {
    const samples = [];
    for (let i = 0; i < 12; i++) {
      const t = performance.now();
      await new Promise((r) => setTimeout(r, d));
      samples.push(performance.now() - t);
    }
    clamp[`setTimeout_${d}`] = summarise(samples);
  }

  mark(sdk, "YIELD_EXPERIMENT_END");
  return {
    windows,
    winner,
    cost: { primitive: winner, ...summarise(costs), samples: costs.map((c) => Number(c.toFixed(4))) },
    clamp,
    clamp_observed_ms: clamp.setTimeout_0.median,
    clamp_setTimeout0_equals_setTimeout1:
      Math.abs(clamp.setTimeout_0.median - clamp.setTimeout_1.median) < 1.0,
  };
}

// ---------------------------------------------------------------------------
// yieldAtGeometry — the SAME question at the REAL CORE-06 geometry.
// 64 KB chunks with 4 KB overlap across a multi-megabyte string, with a
// representative prefilter scan in each slice rather than a spin loop. This is
// what sets MAX_SYNC_SLICE_MS, and it is why CORE-06 keeps the chunk geometry
// for matching-window reasons while making the YIELD TRIGGER temporal.
// ---------------------------------------------------------------------------
function buildInput(totalBytes) {
  // Distinct 1 KB seeds, so the string table and any literal prefilter see a
  // representative distinct-literal set rather than one interned repeat.
  const parts = [];
  let built = 0;
  let i = 0;
  while (built < totalBytes) {
    const seed = `/*${i}*/function f${i}(a,b){return a+"s${i}"+b;}var v${i}={k:"x${i}",n:${i}};`;
    const chunk = seed.repeat(Math.ceil(1024 / seed.length));
    parts.push(chunk);
    built += chunk.length;
    i++;
  }
  return parts.join("");
}

// A representative prefilter: literal scans of the kind CORE-06 would run
// before paying for a parse. Cheap, but real work over every byte.
const NEEDLES = ["function", "return", "var ", "\"", "=>", "require("];
function prefilterScan(text) {
  let hits = 0;
  for (const needle of NEEDLES) {
    let at = text.indexOf(needle);
    while (at !== -1) { hits++; at = text.indexOf(needle, at + needle.length); }
  }
  return hits;
}

async function yieldAtGeometry(sdk, totalBytes, chunkBytes, overlapBytes, sliceBudgetMs) {
  totalBytes = num(totalBytes, 8 * 1024 * 1024);
  chunkBytes = num(chunkBytes, 64 * 1024);
  overlapBytes = num(overlapBytes, 4 * 1024);
  sliceBudgetMs = num(sliceBudgetMs, 25);

  mark(sdk, "GEOMETRY_BUILD_START", `bytes=${totalBytes}`);
  const input = buildInput(totalBytes);
  mark(sdk, "GEOMETRY_BUILD_END", `len=${input.length}`);

  const step = chunkBytes - overlapBytes;
  const chunkCount = Math.ceil(input.length / step);

  // --- Policy 0: no yielding at all. The pure-work baseline both policies
  // are measured against; without it "overhead" is unattributable.
  mark(sdk, "GEOMETRY_BASELINE_START");
  const b0 = performance.now();
  let bhits = 0;
  for (let off = 0; off < input.length; off += step) {
    bhits += prefilterScan(input.slice(off, off + chunkBytes));
  }
  const baselineMs = performance.now() - b0;
  mark(sdk, "GEOMETRY_BASELINE_END", `ms=${baselineMs.toFixed(1)}`);

  const yielder = YIELDERS.setTimeout0;

  // --- Policy A: yield once per chunk (geometry-driven).
  mark(sdk, "GEOMETRY_PERCHUNK_START");
  const a0 = performance.now();
  let aYields = 0, aWork = 0, ahits = 0;
  for (let off = 0; off < input.length; off += step) {
    const w = performance.now();
    ahits += prefilterScan(input.slice(off, off + chunkBytes));
    aWork += performance.now() - w;
    await yielder(); aYields++;
  }
  const aTotal = performance.now() - a0;
  mark(sdk, "GEOMETRY_PERCHUNK_END", `ms=${aTotal.toFixed(1)} yields=${aYields}`);

  // --- Policy B: yield when accumulated synchronous time approaches the
  // slice budget (temporal). Same chunk geometry, different trigger.
  mark(sdk, "GEOMETRY_TEMPORAL_START");
  const c0 = performance.now();
  let cYields = 0, cWork = 0, chits = 0, since = 0;
  for (let off = 0; off < input.length; off += step) {
    const w = performance.now();
    chits += prefilterScan(input.slice(off, off + chunkBytes));
    const d = performance.now() - w;
    cWork += d; since += d;
    if (since >= sliceBudgetMs) { await yielder(); cYields++; since = 0; }
  }
  const cTotal = performance.now() - c0;
  mark(sdk, "GEOMETRY_TEMPORAL_END", `ms=${cTotal.toFixed(1)} yields=${cYields}`);

  const pct = (total, work) => Number((((total - work) / work) * 100).toFixed(1));
  return {
    input_bytes: input.length,
    chunk_bytes: chunkBytes,
    overlap_bytes: overlapBytes,
    chunk_count: chunkCount,
    slice_budget_ms: sliceBudgetMs,
    hits: { baseline: bhits, per_chunk: ahits, temporal: chits },
    baseline: { total_ms: Number(baselineMs.toFixed(1)), yields: 0 },
    per_chunk: {
      total_ms: Number(aTotal.toFixed(1)), work_ms: Number(aWork.toFixed(1)),
      yields: aYields, overhead_ms: Number((aTotal - aWork).toFixed(1)),
      overhead_pct_of_work: pct(aTotal, aWork),
    },
    temporal: {
      total_ms: Number(cTotal.toFixed(1)), work_ms: Number(cWork.toFixed(1)),
      yields: cYields, overhead_ms: Number((cTotal - cWork).toFixed(1)),
      overhead_pct_of_work: pct(cTotal, cWork),
    },
  };
}

// ---------------------------------------------------------------------------
// rssAttribution — validates the ONLY memory-measurement technique available
// before SPIKE-06 depends on it. There is no in-runtime introspection at all,
// so this proves the external sampler tracks in-runtime allocation.
// ---------------------------------------------------------------------------
function allocMB(mb, tag) {
  const held = [];
  for (let i = 0; i < mb; i++) {
    const seed = `${tag}-${i}-0123456789abcdefghijklmnopqrstuvwxyz`;
    // .repeat() produces a FLAT string, not a rope, so RSS reflects the bytes.
    held.push(seed.repeat(Math.ceil((1024 * 1024) / seed.length)));
  }
  return held;
}

async function rssAttribution(sdk, settleMs) {
  settleMs = num(settleMs, 900);
  const settle = () => new Promise((r) => setTimeout(r, settleMs));
  const steps = [];
  const note = (phase, bytes) => {
    const m = { phase, date: Date.now(), qjs: performance.now(), bytes_allocated: bytes };
    steps.push(m);
    // The external sampler correlates on THIS date= value.
    sdk.console.log(`RSS_MARK ${phase} date=${m.date} bytes=${bytes} qjs=${m.qjs.toFixed(3)}`);
  };

  note("baseline", 0);
  await settle();

  let a = allocMB(32, "alpha");
  note("held_32mb", a.reduce((n, s) => n + s.length, 0));
  await settle();

  let b = allocMB(64, "beta");
  note("held_96mb", a.reduce((n, s) => n + s.length, 0) + b.reduce((n, s) => n + s.length, 0));
  await settle();

  // Drop EVERY reference. There is no gc() to force collection, so this
  // measures what the allocator does on its own — which, per research, is
  // nothing: RSS is a high-water mark and does not fall.
  a = null; b = null;
  note("dropped", 0);
  await settle();

  return { steps, settle_ms: settleMs, gc_available: typeof globalThis.gc === "function" };
}

export function init(sdk) {
  sdk.console.log("[defminer-tier0-core] init");
  sdk.api.register("capabilities", capabilities);
  sdk.api.register("yieldExperiment", yieldExperiment);
  sdk.api.register("yieldAtGeometry", yieldAtGeometry);
  sdk.api.register("rssAttribution", rssAttribution);
}
