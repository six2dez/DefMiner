// DefMiner Phase 7 plan 07-01 — Tier-1 map-bytes probe (D-10 / MAP-01, MAP-02).
//
// THE QUESTION IN WORDS: what does it cost, INSIDE CAIDO, to find an inline
// sourcemap announcement in a response body, base64-decode the payload, and
// `JSON.parse` the result — and where does that stop being affordable on the
// proxy thread? That number is `MAP_MAX_BYTES`, and D-10 mandates it be
// MEASURED rather than borrowed.
//
// WHY NO EXISTING NUMBER SUBSTITUTES, verified rather than asserted. SPIKE-06's
// probe (tier1/parse/src/index.ts) measures exactly seven operations — `read`,
// `decode`, `hash`, `hash_js_loop`, `vlq_decode`, `tokenize`, `parse` — and its
// `decode` is `Buffer.toString("utf8")`, NOT a base64 decode and NOT
// `JSON.parse`. There is no `json_parse` measurement anywhere in Phase 0. The
// two constants most likely to be misappropriated are `AST_MAX_BYTES` (derived
// from a meriyah stall, a different cost curve and a different allocator
// profile) and `RSS_BYTES_PER_INPUT_BYTE` (whose go-no-go rationale scopes it
// verbatim to "the parse operation", at MEDIUM confidence).
//
// Built by `caido-dev build` through Caido's own tsup config, NOT hand-zipped,
// for the same reason tier1/parse is: for a measurement the build pipeline is
// part of what is under test (DIST-05).
//
// Nothing here evaluates the fixture: `eval` and `new Function` appear nowhere.
// The body is read, scanned, decoded, parsed and hashed.

import { readFileSync } from "fs";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Marker helper — REUSED VERBATIM from tier1/parse/src/index.ts.
//
// Every marker carries BOTH clocks:
//   Date.now()        — ms wall clock, the ONLY bridge to the external RSS
//                       sampler and the host log. Measured agreement 0.26 ms.
//   performance.now() — ~1 us monotonic, but boot-relative. performance.timeOrigin
//                       is NOT a Unix epoch, so a timestamp is never computed
//                       from it.
// The elapsed figure always comes from performance.now(); the correlation keys
// always come from Date.now(). It is copied rather than imported because these
// two probes are separate bundles with no shared module, and the MARK_START /
// MARK_END line format is the contract scripts/spike/rss-sampler.sh correlates
// against — a divergence would be silent.
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

/** Strip the payload off a mark before it crosses the REST boundary. */
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

// ---------------------------------------------------------------------------
// The two announcement spellings. TWO `lastIndexOf` CALLS, NEVER A REGEX.
//
// `//@ sourceMappingURL=` is a legal legacy spelling consumers accept — the
// ECMA-426 pattern is `^[@#]\s*sourceMappingURL=(\S*?)\s*$`. None of the three
// corpus bundles uses it, but a `lastIndexOf` for `//#` alone misses it, and a
// regex over a multi-megabyte body is the one thing this codebase has already
// measured itself into trouble with (SPIKE-01, a catastrophic regex held the
// executor for 27 s).
// ---------------------------------------------------------------------------
const MARKER_HASH = "//# sourceMappingURL=";
const MARKER_AT = "//@ sourceMappingURL=";

/**
 * The default tail window, in CHARACTERS.
 *
 * Deliberately the WHOLE structural span rather than a small constant, because
 * that is the worst case D-02 actually has and the number this probe exists to
 * price. For an EXTERNAL map the announcement sits 35-67 bytes from EOF; for an
 * INLINE map the marker sits `payload_length + ~45` bytes from the end — up to
 * ~8.4 MB. A 64 KB window would find every external announcement and no inline
 * one, and the phase would ship recovering nothing (RESEARCH § Pitfall 1).
 *
 * `PASSIVE_MAX_BYTES` (8,388,608) plus headroom for the announcement prefix.
 * This module cannot import @defminer/engine — it is a separate bundle built by
 * a different config — so the number is written here and the DERIVATION is what
 * `packages/engine/src/thresholds.ts` publishes.
 */
const DEFAULT_WINDOW_CHARS = 8_388_608 + 4_096;

/** The `data:` prefix forms an inline announcement may legally carry. */
const DATA_PREFIXES = [
  "data:application/json;base64,",
  "data:application/json;charset=utf-8;base64,",
  "data:application/json;charset=UTF-8;base64,",
];

type Announcement = {
  found: boolean;
  spelling: string | null;
  marker_index: number;
  bytes_from_eof: number | null;
  inline: boolean;
  payload_chars: number;
  window_chars: number;
  sliced: boolean;
};

/**
 * The D-02 announcement scan.
 *
 * UNMEASURED ANYWHERE before this probe — SPIKE-06's operation set contains no
 * string-search op at all — and D-02's whole cost model rests on it
 * (assumption A2). If it turns out expensive the recorded mitigation is a
 * 16-byte `lastIndexOf("sourceMappingURL")` prefilter before the two full
 * marker searches.
 *
 * THE SLICE IS PART OF THE OPERATION AND IS MEASURED AS SUCH. `lastIndexOf`
 * has no "stop at" parameter, so a genuinely windowed backwards search has to
 * materialise the tail. When the window covers the whole body — which at the
 * structural ceiling it does — no slice happens, which is exactly what a real
 * implementation would do and is recorded in `sliced`.
 */
function announceScan(source: string, windowChars: number): Announcement {
  const sliced = windowChars < source.length;
  const base = sliced ? source.length - windowChars : 0;
  const tail = sliced ? source.slice(base) : source;

  const atHash = tail.lastIndexOf(MARKER_HASH);
  const atAt = tail.lastIndexOf(MARKER_AT);
  const idx = Math.max(atHash, atAt);

  const out: Announcement = {
    found: idx >= 0,
    spelling: idx < 0 ? null : idx === atHash ? MARKER_HASH : MARKER_AT,
    marker_index: idx < 0 ? -1 : base + idx,
    bytes_from_eof: idx < 0 ? null : source.length - (base + idx),
    inline: false,
    payload_chars: 0,
    window_chars: windowChars,
    sliced,
  };
  if (idx < 0) return out;

  const after = tail.slice(idx + MARKER_HASH.length);
  for (const prefix of DATA_PREFIXES) {
    if (after.startsWith(prefix)) {
      out.inline = true;
      out.payload_chars = after.length - prefix.length;
      return out;
    }
  }
  return out;
}

/** The base64 payload, extracted OUTSIDE any marker so extraction is not timed. */
function payloadOf(source: string, a: Announcement): string {
  if (!a.found || !a.inline) return "";
  const after = source.slice(a.marker_index + MARKER_HASH.length);
  for (const prefix of DATA_PREFIXES) {
    if (after.startsWith(prefix)) return after.slice(prefix.length);
  }
  return "";
}

type OpResult = ReturnType<typeof slim>;

/**
 * The map-bytes measurement at one size point.
 *
 * OPERATION ORDER IS FIXED AND DECLARED, HEAVIEST LAST. RSS never falls in this
 * runtime, the allocator does not return pages to the OS, and there is no
 * `gc()` — so each operation's step delta is only meaningful as an INCREMENT on
 * what came before, and an operation that reorders invalidates every reading
 * after it. `json_parse` runs after both decodes because it is the largest
 * allocator of the three.
 *
 * Input comes from DISK, not through the proxy. SPIKE-06's `method` field
 * states the clause and it is reproduced here: proxy variance must not enter a
 * parse-cost measurement.
 */
export async function map_bytes(sdk: any, path: string, windowChars?: number) {
  const label = String(path);
  const windowSize = Number(windowChars ?? DEFAULT_WINDOW_CHARS);
  sdk.console.log(`MAPBYTES_START path=${label} date=${Date.now()}`);

  // The read and the utf-8 decode are deliberately OUTSIDE the five declared
  // operations: reading a file is I/O and decoding the CONTAINER is not one of
  // the costs D-08 puts on the proxy thread. They are still marked, because an
  // unattributed second of wall clock in the RSS trace is worse than a labelled
  // one.
  const readMark = measured(sdk, "read", () => readFileSync(label));
  if (!readMark.ok || !readMark.out) {
    return {
      input: { path: label, bytes: null },
      error: readMark.err,
      ops: [slim(readMark)],
    };
  }
  const bytes: any = readMark.out;
  const inputBytes: number = bytes.length;

  const containerMark = measured(sdk, "container_decode", () => bytes.toString("utf8") as string);
  const source: string = (containerMark.out as unknown as string) ?? "";

  const ops: OpResult[] = [slim(readMark), slim(containerMark)];

  // 1. announce_scan — D-02's cost, and assumption A2's only evidence.
  let announcement: Announcement | null = null;
  const announceMark = measured(sdk, "announce_scan", () => {
    announcement = announceScan(source, windowSize);
    return announcement;
  });
  ops.push(slim(announceMark));

  const a: Announcement =
    announcement ??
    ({
      found: false,
      spelling: null,
      marker_index: -1,
      bytes_from_eof: null,
      inline: false,
      payload_chars: 0,
      window_chars: windowSize,
      sliced: false,
    } as Announcement);
  const payload = payloadOf(source, a);

  // 2. b64_decode_atob — D-04's decode, primitive 1. `atob` IS a global on this
  //    build (measured: capabilities.json reports typeof "function", and the
  //    `buffer` module exports it too), but it decodes to a LATIN1 "binary
  //    string" — one UTF-16 code unit per BYTE. A UTF-8 multi-byte sequence
  //    becomes two or three separate characters, and `JSON.parse` may still
  //    SUCCEED because the corruption is inside string values rather than in
  //    the JSON structure. Nothing throws and the operator reads wrong source.
  //    Measured here so the choice between the two primitives is RECORDED AS
  //    MEASURED rather than reasoned (RESEARCH § Pitfall 4).
  const atobMark = measured(sdk, "b64_decode_atob", () => {
    const g = globalThis as any;
    if (typeof g.atob !== "function") throw new Error("atob is not a function on this build");
    return g.atob(payload) as string;
  });
  ops.push(slim(atobMark));
  const atobJson: string = (atobMark.out as unknown as string) ?? "";

  // 3. b64_decode_buffer — D-04's decode, primitive 2, and the CORRECT one for
  //    non-ASCII: it does the base64 and the UTF-8 in one step.
  const bufferMark = measured(
    sdk,
    "b64_decode_buffer",
    () => Buffer.from(payload, "base64").toString("utf8") as string,
  );
  ops.push(slim(bufferMark));
  const mapJson: string = (bufferMark.out as unknown as string) ?? "";

  // 4. json_parse — THE OPERATION THIS WHOLE PROBE EXISTS FOR. D-08 puts it on
  //    the proxy thread against a 25 ms slice. A deep-nesting hostile map fails
  //    here as a CATCHABLE RangeError (SPIKE-06 measured that the host survived
  //    all 18 probes), so it is caught and recorded rather than allowed to take
  //    the instance down (threat T-07-03).
  //
  //    The parsed object is deliberately still REACHABLE when this marker
  //    closes, and stays reachable through `sources_materialise` below: RSS
  //    never falls here, so releasing it would not show up anyway, and holding
  //    it is what keeps the peak attributable to the operation that caused it.
  let mapShape: Record<string, unknown> | null = null;
  let parsedMap: any = null;
  const parseMark = measured(sdk, "json_parse", () => {
    parsedMap = JSON.parse(mapJson);
    mapShape = {
      version: parsedMap?.version ?? null,
      sources: Array.isArray(parsedMap?.sources) ? parsedMap.sources.length : null,
      sources_content: Array.isArray(parsedMap?.sourcesContent)
        ? parsedMap.sourcesContent.length
        : null,
      mappings_chars:
        typeof parsedMap?.mappings === "string" ? parsedMap.mappings.length : null,
      has_sections: Object.prototype.hasOwnProperty.call(parsedMap ?? {}, "sections"),
    };
    return mapShape;
  });
  ops.push(slim(parseMark));

  // 5. sources_materialise — D-05's cost, and THE STEP WHERE PEAK RSS ACTUALLY
  //    LANDS. `JSON.parse` alone does not tell you what holding 781 source
  //    strings costs: the parse allocates them, and this is the first thing
  //    that TOUCHES every one of them. Hashed with the NATIVE createHash
  //    because that is the primitive D-05 would use — a per-character JS loop
  //    would measure the loop, and SPIKE-06 already priced that gap.
  //
  //    HEAVIEST LAST, and it is last for that reason. Sparse, null and absent
  //    `sourcesContent` are all legal (RESEARCH § Pitfall 3), so the guard is
  //    the shipped shape rather than defensive padding: iterate `sources` and
  //    condition on the content array's length, never the reverse.
  let materialised: Record<string, unknown> | null = null;
  const materialiseMark = measured(sdk, "sources_materialise", () => {
    const sources: unknown[] = Array.isArray(parsedMap?.sources) ? parsedMap.sources : [];
    const contents: unknown[] = Array.isArray(parsedMap?.sourcesContent)
      ? parsedMap.sourcesContent
      : [];
    const digests: string[] = [];
    let chars = 0;
    let skippedNull = 0;
    let skippedMissing = 0;
    for (let i = 0; i < sources.length; i++) {
      if (i >= contents.length) {
        skippedMissing++;
        continue;
      }
      const entry = contents[i];
      if (typeof entry !== "string") {
        skippedNull++;
        continue;
      }
      chars += entry.length;
      digests.push(createHash("sha256").update(entry).digest("hex"));
    }
    materialised = {
      sources_declared: sources.length,
      content_entries: contents.length,
      hashed: digests.length,
      skipped_null: skippedNull,
      skipped_missing: skippedMissing,
      content_chars: chars,
      // The digests are DROPPED rather than returned: 781 hex strings crossing
      // the REST boundary is 50 KB of payload that says nothing the counts do
      // not. The first one is kept as proof the loop ran.
      first_digest: digests.length > 0 ? digests[0] : null,
    };
    return materialised;
  });
  ops.push(slim(materialiseMark));

  sdk.console.log(`MAPBYTES_END path=${label} date=${Date.now()}`);

  return {
    input: {
      path: label,
      bytes: inputBytes,
      chars: source.length,
      // Reported so a later reader can confirm the point ran against the
      // artifact it claims, without the artifact crossing the REST boundary.
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
    announcement: a,
    decoded_bytes: mapJson.length,
    payload_chars: payload.length,
    map: mapShape,
    materialise: materialised,
    // THE PITFALL 4 EVIDENCE, as a comparison rather than as prose. Two digests
    // over the two decodes: equal means the payload was pure ASCII and the
    // choice does not matter for THIS fixture; different means `atob` produced
    // a different string from the same bytes, which is the corruption, caught
    // by measurement instead of asserted from documentation.
    decode_agreement: {
      atob_chars: atobJson.length,
      buffer_chars: mapJson.length,
      atob_sha256: atobMark.ok ? createHash("sha256").update(atobJson).digest("hex") : null,
      buffer_sha256: bufferMark.ok ? createHash("sha256").update(mapJson).digest("hex") : null,
      identical: atobMark.ok && bufferMark.ok ? atobJson === mapJson : null,
    },
    ops,
  };
}

/**
 * OPEN QUESTION 1, measured opportunistically while an instance is already up.
 *
 * The question: how long does Caido keep a request retrievable by
 * `sdk.requests.get`? D-22's tombstone design is correct whatever the answer —
 * lazy detection, sticky outcome, tombstone kept — so RESEARCH says do NOT
 * block on it and record it as an observation. This function is that paragraph.
 *
 * IT IS AN OBSERVATION AND NEVER A POLICY. It reports what it could and could
 * not do, with its own status, and the artifact schema REFUSES a `pass`-shaped
 * status on an observation for exactly this reason: a row that reads like a
 * gate result is a row that gets cited as a settled retention policy.
 *
 * Traffic is LOOPBACK ONLY, to the listener this very run started. Nothing
 * leaves the machine.
 */
export async function retention_probe(sdk: any, port: number, count: number, waitMs: number) {
  const surface = {
    requests_keys: [] as string[],
    has_send: false,
    has_get: false,
    has_create: false,
  };
  try {
    const r = sdk.requests ?? {};
    surface.requests_keys = Object.keys(r).concat(
      Object.getOwnPropertyNames(Object.getPrototypeOf(r) ?? {}),
    );
    surface.has_send = typeof r.send === "function";
    surface.has_get = typeof r.get === "function";
    surface.has_create = typeof r.create === "function";
  } catch (e: any) {
    return {
      status: "not_run",
      reason: "sdk.requests could not be enumerated: " + String(e).slice(0, 200),
      surface,
    };
  }

  if (!surface.has_send || !surface.has_get || !surface.has_create) {
    return {
      status: "not_run",
      reason:
        "this build's sdk.requests does not expose the create/send/get trio the measurement " +
        "needs (create=" +
        surface.has_create +
        ", send=" +
        surface.has_send +
        ", get=" +
        surface.has_get +
        "). Recorded as NOT RUN rather than as a retention finding.",
      surface,
    };
  }

  const stored: string[] = [];
  const sendErrors: string[] = [];
  for (let i = 0; i < count; i++) {
    try {
      const spec = sdk.requests.create();
      spec.setHost("127.0.0.1");
      spec.setPort(port);
      spec.setTls(false);
      spec.setMethod("GET");
      spec.setPath("/defminer-retention-probe/" + String(i));
      const sent = await sdk.requests.send(spec);
      const id = sent?.request?.getId?.();
      if (typeof id === "string") stored.push(id);
    } catch (e: any) {
      sendErrors.push(String(e).slice(0, 200));
    }
  }

  if (stored.length === 0) {
    return {
      status: "not_run",
      reason:
        "no request could be stored (" +
        String(sendErrors.length) +
        " send error(s); first: " +
        (sendErrors[0] ?? "none") +
        "). Recorded as NOT RUN rather than as evidence of eviction — a request that was " +
        "never stored says nothing about retention.",
      surface,
    };
  }

  const immediate = await countSurvivors(sdk, stored);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  const delayed = await countSurvivors(sdk, stored);

  return {
    status: "observed",
    surface,
    stored: stored.length,
    send_errors: sendErrors.length,
    wait_ms: waitMs,
    survival_curve: [
      { at_ms: 0, retrievable: immediate },
      { at_ms: waitMs, retrievable: delayed },
    ],
    reason: null,
  };
}

async function countSurvivors(sdk: any, ids: string[]): Promise<number> {
  let n = 0;
  for (const id of ids) {
    try {
      const got = await sdk.requests.get(id);
      if (got) n++;
    } catch {
      // A throw is a miss, and a miss is the datum. Swallowing it here is not
      // hiding an error — the count IS the measurement.
    }
  }
  return n;
}

/**
 * Capability echo, and the BACKEND DISCRIMINATOR.
 *
 * `scripts/spike/probe-run.sh` resolves `backends[0]` from the install response
 * and this package now ships THREE backends, so "the first one" is no longer
 * this one. probe-run.sh belongs to Phase 0 and is not modified; the Phase 7
 * driver instead calls this function against each installed backend id and
 * keeps the one that answers. That makes the resolution explicit and loud
 * rather than positional and silent.
 */
export async function mapbytes_info(sdk: any) {
  return {
    probe: "mapbytes",
    caido_version: String(sdk.runtime?.version ?? "unknown"),
    default_window_chars: DEFAULT_WINDOW_CHARS,
    markers: [MARKER_HASH, MARKER_AT],
    data_prefixes: DATA_PREFIXES,
    has_atob: typeof (globalThis as any).atob,
    has_buffer: typeof (globalThis as any).Buffer,
    date: Date.now(),
    qjs: performance.now(),
  };
}

export function init(sdk: any) {
  sdk.console.log("[tier1-mapbytes] init");
  sdk.api.register("map_bytes", map_bytes);
  sdk.api.register("mapbytes_info", mapbytes_info);
  sdk.api.register("retention_probe", retention_probe);
  sdk.console.log("[tier1-mapbytes] ready");
}
