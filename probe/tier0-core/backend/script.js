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

export function init(sdk) {
  sdk.console.log("[defminer-tier0-core] init");
  sdk.api.register("capabilities", capabilities);
}
