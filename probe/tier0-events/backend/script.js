// DefMiner Phase 0 plan 00-03 — Tier-0 events probe.
//
// Its own manifest id (`defminer-tier0-events`), distinct from
// `defminer-tier0-core`, `defminer-tier0-budgets` and `defminer-recorder`, so it
// can never collide with a wave-1/wave-2 probe or with the long-lived recorder
// on 8998.
//
// Three questions share this one apparatus, which is the point — SPIKE-05 and
// SPIKE-11 were split across plans in the original phase sketch and the research
// identified that as a defect, because both need exactly the same instrument:
// a delivered-event log plus a caching-aware origin.
//
//   SPIKE-05  which surfaces deliver onInterceptResponse, and does
//             sdk.requests.send() re-fire it under each save/plugins combination
//   SPIKE-11  do browser-cache hits and 304s reach the hook at all
//   SPIKE-03  what does Caido do with events a blocked handler cannot consume
//
// Plain ESM, no `caido:` static imports — the SDK arrives as the `init`
// argument, and `caido:http` is imported dynamically inside the one function
// that needs it. Nothing here evaluates any fetched content: `eval` and
// `new Function` appear nowhere in this phase.
//
// THE HANDLER IS NON-ASYNC, CHEAP, AND RETURNS IMMEDIATELY in its default
// (`idle`) mode. That is deliberate: it is modelling CORE-01's shape, and a
// handler that did real work would make the SPIKE-03 delivery count a
// measurement of the probe rather than of Caido. The blocking and
// error-injection behaviours are opt-in and armed explicitly.

// ---------------------------------------------------------------------------
// Delivered-event log.
//
// SEQ is monotonic for the life of the plugin and is NOT reset by drain(), only
// by reset(). That is what lets the driver prove no event was lost between two
// drains: the sequence numbers must be contiguous across the seam.
// ---------------------------------------------------------------------------
const EVENTS = [];
let SEQ = 0;
let DROPPED = 0;

// 4000 is above SPIKE-03's 500-request run by 8x, so the cap can never be the
// reason a delivered-event count comes back below the request count. If it were
// ever hit, DROPPED records it explicitly rather than silently truncating —
// "the plugin dropped it" and "Caido dropped it" are the two answers SPIKE-03
// has to tell apart.
const MAX_ROWS = 4000;

// ---------------------------------------------------------------------------
// Armed behaviour. `idle` is the default and the only mode any SPIKE-05 or
// SPIKE-11 measurement runs under.
// ---------------------------------------------------------------------------
const IDLE = "idle";
const BLOCK = "block";
const THROW_SYNC = "throw-sync";
const REJECT_ASYNC = "reject-async";

let mode = IDLE;
let modeMs = 0;
let modeRemaining = 0; // how many more delivered events the mode applies to
const MODE_LOG = [];

function mark(sdk, label, extra) {
  sdk.console.log(
    "MARK " + label + " date=" + Date.now() + " qjs=" + performance.now().toFixed(3) +
      (extra ? " " + extra : ""),
  );
}

function headerRecord(headers) {
  // getHeaders() returns a plain record whose values are arrays. Flattened to
  // strings so the driver can compare them without caring about the shape, and
  // capped so one pathological header cannot dominate the drained payload.
  const out = {};
  if (!headers) return out;
  for (const k of Object.keys(headers)) {
    const v = headers[k];
    out[String(k).toLowerCase()] = Array.isArray(v)
      ? v.join(", ").slice(0, 300)
      : String(v).slice(0, 300);
  }
  return out;
}

// The correlation marker the driver put in the query string. Every matrix cell
// carries a unique one, which is what makes attribution unambiguous (T-00-34) —
// without it a stray page load or a retry could be counted against the wrong
// surface.
function markerOf(url) {
  const s = String(url);
  const i = s.indexOf("dfm=");
  if (i === -1) return null;
  const tail = s.slice(i + 4);
  const end = tail.search(/[&#]/);
  return end === -1 ? tail : tail.slice(0, end);
}

function spin(ms) {
  // Synchronous, unyieldable, and deliberately so. SPIKE-02 established that
  // setTimeout(fn,0) is the ONLY primitive in this runtime that yields, so a
  // plain Date.now() loop holds the QuickJS thread for the whole duration —
  // which is exactly the condition SPIKE-03 is measuring Caido's reaction to.
  const start = Date.now();
  let iterations = 0;
  while (Date.now() - start < ms) {
    iterations++;
  }
  return { started_at: start, ended_at: Date.now(), iterations: iterations };
}

// ---------------------------------------------------------------------------
// The hook.
//
// The row is appended BEFORE any armed behaviour runs. A handler that throws or
// blocks must still leave evidence that the event was delivered, or SPIKE-03
// cannot tell "Caido never delivered it" from "the handler died holding it".
// ---------------------------------------------------------------------------
function onInterceptResponse(sdk, request, response) {
  const seq = ++SEQ;
  const qjs = performance.now();
  const date = Date.now();

  let row = null;
  try {
    const url = String(request.getUrl());
    const body = response.getBody();
    row = {
      seq: seq,
      date: date,
      qjs: qjs,
      marker: markerOf(url),
      url: url.slice(0, 400),
      method: request.getMethod(),
      request_id: String(request.getId()),
      response_id: String(response.getId()),
      status: response.getCode(),
      body_length: body ? body.length : null,
      raw_length: body ? body.toRaw().length : null,
      request_headers: headerRecord(request.getHeaders()),
      response_headers: headerRecord(response.getHeaders()),
      mode_at_delivery: mode,
    };
  } catch (e) {
    // A row that could not be built is still a delivered event. Recording the
    // failure keeps the count honest.
    row = { seq: seq, date: date, qjs: qjs, error: String(e).slice(0, 200) };
  }

  if (EVENTS.length < MAX_ROWS) {
    EVENTS.push(row);
  } else {
    DROPPED++;
  }

  if (mode === IDLE || modeRemaining <= 0) return;

  modeRemaining--;
  const applied = mode;
  if (modeRemaining <= 0) mode = IDLE;

  if (applied === BLOCK) {
    const info = spin(modeMs);
    info.kind = BLOCK;
    info.seq = seq;
    info.requested_ms = modeMs;
    info.actual_ms = info.ended_at - info.started_at;
    MODE_LOG.push(info);
    mark(sdk, "BLOCK_RELEASED", "seq=" + seq + " ms=" + info.actual_ms);
    return;
  }

  if (applied === THROW_SYNC) {
    MODE_LOG.push({ kind: THROW_SYNC, seq: seq, at: Date.now() });
    mark(sdk, "THROW_SYNC_ABOUT_TO_THROW", "seq=" + seq);
    throw new Error("defminer-spike-03 synchronous throw from onInterceptResponse seq=" + seq);
  }

  if (applied === REJECT_ASYNC) {
    MODE_LOG.push({ kind: REJECT_ASYNC, seq: seq, at: Date.now() });
    mark(sdk, "REJECT_ASYNC_RETURNING_REJECTION", "seq=" + seq);
    // A non-async function returning an already-rejected promise. This is the
    // asynchronous half of ERR-03's question and it is NOT the same as the
    // throw above: a rejection has no stack unwinding for the host to catch.
    return Promise.reject(
      new Error("defminer-spike-03 async rejection from onInterceptResponse seq=" + seq),
    );
  }
  return;
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

// drain — return and CLEAR the log. Every matrix cell drains before and after
// itself so no event can be attributed to two surfaces.
function drain(sdk) {
  const events = EVENTS.splice(0, EVENTS.length);
  const modes = MODE_LOG.splice(0, MODE_LOG.length);
  return {
    drained_at: Date.now(),
    count: events.length,
    seq_high_water: SEQ,
    dropped_by_probe: DROPPED,
    mode: mode,
    mode_remaining: modeRemaining,
    mode_log: modes,
    events: events,
  };
}

function reset(sdk) {
  EVENTS.length = 0;
  MODE_LOG.length = 0;
  SEQ = 0;
  DROPPED = 0;
  mode = IDLE;
  modeMs = 0;
  modeRemaining = 0;
  mark(sdk, "RESET");
  return { ok: true, at: Date.now() };
}

// arm — set the handler behaviour for the next `count` delivered events.
//   arm("block", 30000, 1)      block the first delivered event for 30 s
//   arm("throw-sync", 0, 1)     throw synchronously on the next event
//   arm("reject-async", 0, 1)   return a rejected promise on the next event
//   arm("idle", 0, 0)           disarm
function arm(sdk, kind, ms, count) {
  const allowed = [IDLE, BLOCK, THROW_SYNC, REJECT_ASYNC];
  if (allowed.indexOf(kind) === -1) {
    return { ok: false, error: "unknown mode: " + kind, allowed: allowed };
  }
  mode = kind;
  modeMs = typeof ms === "number" ? ms : 0;
  modeRemaining = typeof count === "number" ? count : 1;
  if (kind === IDLE) modeRemaining = 0;
  mark(sdk, "ARM", "mode=" + kind + " ms=" + modeMs + " count=" + modeRemaining);
  return { ok: true, mode: mode, ms: modeMs, count: modeRemaining, at: Date.now() };
}

function status(sdk) {
  return {
    at: Date.now(),
    mode: mode,
    mode_remaining: modeRemaining,
    pending_rows: EVENTS.length,
    seq_high_water: SEQ,
    dropped_by_probe: DROPPED,
  };
}

// send — SPIKE-05's sharp cell. Calls sdk.requests.send() with caller-supplied
// save/plugins and reports the identifiers that come back.
//
// Unsaved requests are documented to come back with request and response IDs of
// ZERO. ACTIVE-12 depends on that fact, so it is measured here rather than
// quoted: an id of "0" means the plugin has no handle it can later resolve.
async function send(sdk, url, save, plugins) {
  const started = Date.now();
  const options = {};
  if (save !== null && save !== undefined) options.save = save;
  if (plugins !== null && plugins !== undefined) options.plugins = plugins;
  mark(sdk, "SEND_START", "save=" + String(save) + " plugins=" + String(plugins));
  try {
    const spec = new RequestSpec(url);
    const payload = await sdk.requests.send(spec, options);
    const req = payload.request;
    const res = payload.response;
    const out = {
      ok: true,
      options: options,
      url: url,
      request_id: req ? String(req.getId()) : null,
      response_id: res ? String(res.getId()) : null,
      status: res ? res.getCode() : null,
      body_length: res && res.getBody() ? res.getBody().length : null,
      elapsed_ms: Date.now() - started,
    };
    out.ids_are_zero = out.request_id === "0" && out.response_id === "0";
    mark(sdk, "SEND_END", "req=" + out.request_id + " res=" + out.response_id);
    return out;
  } catch (e) {
    mark(sdk, "SEND_ERROR");
    return {
      ok: false,
      options: options,
      url: url,
      error: String(e).slice(0, 400),
      elapsed_ms: Date.now() - started,
    };
  }
}

// http_fetch — the `caido:http` module. The SDK documents this as NOT routing
// through the proxy, so the expected answer is that the hook does not fire.
// ACTIVE-03 routes third-party calls this way, so the observation is recorded
// rather than assumed.
async function httpFetch(sdk, url) {
  const started = Date.now();
  mark(sdk, "FETCH_START", url);
  try {
    const http = await import("caido:http");
    const res = await http.fetch(url);
    let length = null;
    try {
      const text = await res.text();
      length = text.length;
    } catch (e) {
      length = null;
    }
    mark(sdk, "FETCH_END");
    return {
      ok: true,
      url: url,
      status: res.status,
      body_length: length,
      elapsed_ms: Date.now() - started,
    };
  } catch (e) {
    mark(sdk, "FETCH_ERROR");
    return { ok: false, url: url, error: String(e).slice(0, 400), elapsed_ms: Date.now() - started };
  }
}

export async function init(sdk) {
  // init MUST be async and the event registration MUST happen while init is
  // still on the stack. Plan 00-02 measured the alternative: a handler
  // registered from a `.then()` after init returned was silently dropped — the
  // plugin logged ready, answered REST calls, and delivered ZERO of 34 proxied
  // responses with no error anywhere. Registering first, before anything that
  // could yield, is the whole reason this line is at the top.
  sdk.events.onInterceptResponse((s, request, response) =>
    onInterceptResponse(s, request, response),
  );

  sdk.api.register("drain", drain);
  sdk.api.register("reset", reset);
  sdk.api.register("arm", arm);
  sdk.api.register("status", status);
  sdk.api.register("send", send);
  sdk.api.register("http_fetch", httpFetch);

  mark(sdk, "EVENTS_PROBE_READY");
}
