// DefMiner Phase 6 plan 06-02 — O-07 read-path probe.
//
// Its own manifest id (`defminer-phase6-o07`), distinct from every Phase 0
// probe, so it can never collide with them or with the long-lived recorder.
//
// THE ONE QUESTION: does `Body.length` on a response returned by
// `sdk.requests.get(id)` and by `sdk.requests.query()…execute()` report the
// DECOMPRESSED identity byte count, or the WIRE byte count?
//
// WHY A PROBE AND NOT THE SHIPPED PLUGIN. The shipped plugin answers the get()
// half already — `counters.byteLenMismatch` compares the hook's `Body.length`
// against `toRaw().length` on the RELOADED response and has shipped since Phase 1
// — but that comparison is hook-versus-reload, which cannot by itself say what
// EITHER number is. And nothing in the shipped build reaches the query() path at
// all: `startScan` refuses a non-empty operator clause until plan 06-04 ships the
// validator, and `runScanProducer` deliberately has no caller until 06-03 ships
// the watermark. So the numbers this file returns are the direct measurement, and
// `byteLenMismatch` is the shipped instrument corroborating it.
//
// NOTHING HERE RECORDS BODY CONTENT. Lengths, ids, status codes and one header
// per response. The bytes are read only to take `.length` of them.
//
// Plain ESM, no `caido:` imports — the SDK arrives as the `init` argument.
// Nothing here evaluates corpus content: `eval` and `new Function` appear
// nowhere in this phase.

const HOOK_ROWS = [];
const MAX_ROWS = 200;

function headerOf(headers, name) {
  // Header names are case-insensitive on the getter but getHeaders() returns a
  // plain record, so check both spellings rather than assuming which one Caido
  // normalises to. Lifted verbatim in shape from probe/tier0-budgets.
  const lower = name.toLowerCase();
  const upper = name.replace(/(^|-)([a-z])/g, (_m, p, c) => p + c.toUpperCase());
  const v = headers[lower] !== undefined ? headers[lower] : headers[upper];
  if (v === undefined || v === null) return null;
  return Array.isArray(v) ? v.join(", ") : String(v);
}

// THE HOOK LEG. Recorded for CONTINUITY, not as evidence about either read
// path: SPIKE-08 already measured the hook, and re-quoting it as an answer about
// `get()` or `query()` is the "asserted in four places, gated in one" shape this
// project keeps having to stamp out. What it is genuinely for is the REQUEST ID —
// without it the two read legs below have nothing to look up.
function onInterceptResponse(sdk, request, response) {
  try {
    if (HOOK_ROWS.length >= MAX_ROWS) return;
    const body = response.getBody();
    HOOK_ROWS.push({
      id: String(request.getId()),
      url: String(request.getUrl()),
      status: response.getCode(),
      content_encoding: headerOf(response.getHeaders(), "content-encoding"),
      content_length: headerOf(response.getHeaders(), "content-length"),
      body_present: !!body,
      body_length: body ? body.length : null,
      raw_length: body ? body.toRaw().length : null,
    });
  } catch (e) {
    try {
      sdk.console.log("[phase6-o07] intercept skip: " + String(e).slice(0, 200));
    } catch (_) {
      /* nothing left to do */
    }
  }
}

function hookRows(sdk) {
  sdk.console.log("[phase6-o07] hookRows n=" + HOOK_ROWS.length);
  return { rows: HOOK_ROWS.slice(), count: HOOK_ROWS.length };
}

// THE get() LEG. One `sdk.requests.get(id)` per id, and BOTH spellings of the
// count recorded side by side: `Body.length` is what `admit()`'s size axis reads,
// `toRaw().length` is what the consumer's own comparison reads. If those two ever
// disagree on a stored response, the size gate and the instrument watching it are
// measuring different quantities — which is worth knowing separately from the
// identity-versus-wire question.
async function reloadMeasure(sdk, idsJson) {
  // ARGS CROSS THIS BOUNDARY AS DOUBLE-ENCODED STRINGS, measured on this build
  // in two steps. `{"args":[["a","b"]]}` is rejected outright — `invalid type:
  // sequence, expected a string` — so every element must be a string. And the
  // route JSON-DECODES each element once before the handler sees it, so a singly
  // encoded list arrives as an array, `String()`s to `1,2` and fails to re-parse
  // with `unexpected data at the end`. The caller therefore double-encodes (the
  // `jargs` shape from scripts/spike/run-spike-09-12.sh) and this parses once.
  let ids;
  try {
    ids = JSON.parse(String(idsJson || "[]"));
  } catch (e) {
    return { rows: [], count: 0, error: "unparseable id list: " + String(e).slice(0, 200) };
  }
  if (!Array.isArray(ids)) {
    return { rows: [], count: 0, error: "id list is not an array" };
  }
  const out = [];
  for (const raw of ids) {
    const id = String(raw);
    const row = { id: id };
    try {
      const rr = await sdk.requests.get(id);
      if (!rr) {
        row.error = "get() resolved undefined";
      } else if (!rr.response) {
        row.error = "get() resolved a pair with no response";
      } else {
        const body = rr.response.getBody();
        row.status = rr.response.getCode();
        row.content_encoding = headerOf(
          rr.response.getHeaders(),
          "content-encoding",
        );
        row.body_present = !!body;
        row.body_length = body ? body.length : null;
        row.raw_length = body ? body.toRaw().length : null;
      }
    } catch (e) {
      row.error = String(e).slice(0, 300);
    }
    out.push(row);
  }
  return { rows: out, count: out.length };
}

// THE query() LEG — the half that matters for the retro path.
//
// UNFILTERED, AND THAT IS DELIBERATE. The obvious shape is
// `.filter(<the fixture's path>)`, and it would confound the measurement: Caido's
// `req.path` / `req.query` / `cont` implementations are unmeasured (this phase's
// own O-03 and O-06), so a filtered walk that returned nothing would leave "the
// query path reports no body" and "the clause did not match" indistinguishable.
// The walk is instead ordered descending on the request id — the same total order
// the shipped producer uses, because `id` is a unique integer and `created_at`
// ties — and the caller matches items by the id the hook already recorded. The
// filter is `admit()`'s subject, not `Body.length`'s.
async function queryMeasure(sdk, limitStr) {
  // A STRING for the same reason reloadMeasure's id list is one.
  const parsed = parseInt(String(limitStr || "50"), 10);
  const n = Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
  try {
    const page = await sdk.requests
      .query()
      .descending("req", "id")
      .first(n)
      .execute();
    const rows = [];
    for (const it of page.items || []) {
      const row = {
        id: String(it.request.getId()),
        url: String(it.request.getUrl()),
        cursor_present: it.cursor !== undefined && it.cursor !== null,
        has_response: it.response !== undefined && it.response !== null,
      };
      if (it.response) {
        const body = it.response.getBody();
        row.status = it.response.getCode();
        row.content_encoding = headerOf(
          it.response.getHeaders(),
          "content-encoding",
        );
        row.body_present = !!body;
        row.body_length = body ? body.length : null;
        row.raw_length = body ? body.toRaw().length : null;
      }
      rows.push(row);
    }
    return {
      rows: rows,
      count: rows.length,
      has_next_page: !!(page.pageInfo && page.pageInfo.hasNextPage),
    };
  } catch (e) {
    // A THROW IS A RESULT, not a crash. `execute()` throws on an invalid query
    // parameter, and a probe that died here would leave the caller unable to tell
    // "the query path reports nothing" from "the probe fell over".
    return { rows: [], count: 0, error: String(e).slice(0, 300) };
  }
}

export function init(sdk) {
  sdk.console.log("[phase6-o07] init");

  // REGISTERED WHILE init IS STILL ON THE STACK, and this is a measured
  // constraint rather than a style: probe/tier0-budgets recorded that an event
  // handler registered after init returns is SILENTLY DROPPED — 34 proxied
  // responses, zero rows, no error anywhere. This file needs no imports at all,
  // so there is nothing to await before the registration and the hazard cannot
  // arise here.
  sdk.events.onInterceptResponse((s, request, response) =>
    onInterceptResponse(s, request, response),
  );

  sdk.api.register("hookRows", hookRows);
  sdk.api.register("reloadMeasure", reloadMeasure);
  sdk.api.register("queryMeasure", queryMeasure);
  sdk.console.log("[phase6-o07] ready");
}
