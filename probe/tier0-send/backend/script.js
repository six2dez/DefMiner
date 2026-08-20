// DefMiner Phase 0 — Tier-0 send probe (SPIKE-04 and SPIKE-04b).
//
// The question in words: at how many `sdk.requests.send()` calls does Caido
// 0.57.1 fail, and does the failure differ between `save:true`, `save:false`
// and `caido:http` `fetch`?
//
// This is a DIRECT REPRODUCTION, not an extrapolation: caido/caido#2211 is
// open, unfixed, and filed against 0.57.1 — the exact build under test — so the
// issue's reported ~54 clean / ~80 stall / ~120 abort thresholds are directly
// comparable to whatever this measures.
//
// TWO THINGS ARE UNDER TEST AT ONCE, deliberately:
//
//   1. the cliff itself, and
//   2. ACTIVE-02's WRITE-AHEAD JOURNAL, against a real host abort.
//
// (2) is not incidental. `llrt` builds with `panic = "abort"`, so the
// `gc_decref_child` assertion is a C-level abort() with no unwind and no
// graceful shutdown: a volatile counter disappears with the process, and this is
// exactly the case the journal exists to explain. A journal validated against a
// simulated crash proves nothing; this one is validated against the real thing.
//
// Nothing here evaluates any fetched content: `eval` and `new Function` appear
// nowhere in this phase.

// A NEW id per module instantiation. This is also SPIKE-04b's sharpest
// instrument: if toggling the plugin off and on produces a DIFFERENT session
// id, the QuickJS runtime was genuinely torn down and re-created, which is the
// mechanism by which a toggle could reset a cumulative refcount leak.
const RUNTIME_SESSION_ID =
  "rs-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);

let db = null;
let ready = false;
// Sends completed in THIS runtime instantiation, across all run() calls. The
// leak is cumulative across a runtime's lifetime, so the per-runtime total is
// the quantity that matters, not the per-call one.
let sendsThisRuntime = 0;

// The UNMITIGATED shape, kept deliberately reachable.
//
// ACTIVE-09's discipline — reduce wrappers to primitives immediately, never
// retain them across an await — is exactly the mitigation for #2211's live
// wrapper pressure. A probe that follows it and then reports "no cliff" has
// measured the MITIGATION, not the host. `retain` mode holds every wrapper
// alive so the naive shape a plugin author would write by accident can be
// measured against the disciplined one on its own instance.
const RETAINED = [];

function mark(sdk, label, extra) {
  sdk.console.log(
    "MARK " + label + " date=" + Date.now() + " qjs=" + performance.now().toFixed(3) +
      " rs=" + RUNTIME_SESSION_ID + (extra ? " " + extra : "")
  );
}

// ---------------------------------------------------------------------------
// normaliseCandidate — ACTIVE-02 requires query VALUES and credential headers
// redacted in the journal record. The probe has no credential headers, but the
// query-value rule is exercised rather than described: a `.map` candidate can
// carry a cache-busting token, and the journal is a persisted artifact.
// ---------------------------------------------------------------------------
function normaliseCandidate(url) {
  const s = String(url);
  const q = s.indexOf("?");
  if (q < 0) return s;
  const base = s.slice(0, q);
  const keys = s
    .slice(q + 1)
    .split("&")
    .map(function (kv) { return kv.split("=")[0]; })
    .filter(function (k) { return k.length > 0; });
  return base + "?" + keys.map(function (k) { return k + "=<redacted>"; }).join("&");
}

const JOURNAL_DDL =
  "CREATE TABLE IF NOT EXISTS send_journal (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "runtime_session_id TEXT NOT NULL," +
  "seq INTEGER NOT NULL," +
  "variant TEXT NOT NULL," +
  "normalized_candidate TEXT NOT NULL," +
  "reason TEXT," +
  "started_at INTEGER NOT NULL," +
  "finished_at INTEGER," +
  "status TEXT," +
  "http_code INTEGER," +
  "body_length INTEGER," +
  "request_id TEXT," +
  "response_id TEXT," +
  "elapsed_ms REAL," +
  "error TEXT" +
  ")";

const INSERT_SQL =
  "INSERT INTO send_journal " +
  "(runtime_session_id, seq, variant, normalized_candidate, reason, started_at) " +
  "VALUES (?, ?, ?, ?, ?, ?)";

// Keyed on (runtime_session_id, seq), NOT on last_insert_rowid().
//
// MEASURED DEFECT, and it is a first-order Phase 1 finding rather than a probe
// detail. The obvious implementation is INSERT then
// `SELECT last_insert_rowid()` then UPDATE ... WHERE id = ?. On this runtime
// that silently stops working: sdk.meta.db() is a connection POOL over worker
// threads, and once the pool grows past its first connection the
// last_insert_rowid() query lands on a DIFFERENT connection from the insert and
// returns a value that matches no row. The first run of this probe finalised a
// contiguous prefix — 5, 6 and 188 rows of 400 across the three variants — and
// then never finalised another, while every send kept succeeding. Nothing
// errored. The journal simply stopped closing rows.
//
// (runtime_session_id, seq) is unique by construction, it is the key ACTIVE-02
// already specifies, and it is connection-independent. It also removes a
// round-trip per send.
const FINISH_SQL =
  "UPDATE send_journal SET finished_at = ?, status = ?, http_code = ?, body_length = ?, " +
  "request_id = ?, response_id = ?, elapsed_ms = ?, error = ? " +
  "WHERE runtime_session_id = ? AND seq = ?";

// db.exec(sql) takes NO bind parameters — verified in plan 00-01 against
// @caido/quickjs-types (extra/sqlite.d.ts). Binding requires prepare() ->
// Statement.run(...params), SPREAD. And a statement is prepared per write
// rather than shared: sdk.meta.db() is a connection POOL over worker threads,
// so a shared mutable Statement could interleave bindings across connections
// and silently corrupt the only evidence a host abort leaves behind.
async function journalStart(values) {
  const stmt = await db.prepare(INSERT_SQL);
  await stmt.run.apply(stmt, values);
}

async function journalFinish(values) {
  const stmt = await db.prepare(FINISH_SQL);
  await stmt.run.apply(stmt, values);
}

// ---------------------------------------------------------------------------
// doSend — ONE send, returning PRIMITIVES ONLY.
//
// This is ACTIVE-09's discipline made structural rather than aspirational: the
// `Request`/`Response`/`RequestSpec` wrappers exist only inside this function's
// frame and are unreachable the moment it returns, so nothing is retained
// across the journal's `await`. Live wrapper pressure is the MECHANISM under
// test — holding wrappers would measure the probe rather than Caido.
// ---------------------------------------------------------------------------
async function doSend(sdk, variant, url, retain) {
  if (variant === "fetch") {
    const http = await import("caido:http");
    const res = await http.fetch(url);
    const code = res.status;
    let len = null;
    try {
      const text = await res.text();
      len = text.length;
    } catch (e) {
      len = null;
    }
    if (retain) RETAINED.push(res);
    return { code: code, body_length: len, request_id: null, response_id: null };
  }

  const spec = new RequestSpec(url);
  const payload = await sdk.requests.send(spec, { save: variant === "save-true" });
  const req = payload.request;
  const res = payload.response;
  const body = res ? res.getBody() : null;
  if (retain) RETAINED.push(spec, payload, req, res, body);
  return {
    code: res ? res.getCode() : null,
    body_length: body ? body.length : null,
    request_id: req ? String(req.getId()) : null,
    response_id: res ? String(res.getId()) : null,
  };
}

// ---------------------------------------------------------------------------
// run — the send loop. Reports every tenth send to the host log so the timeline
// survives even when the return value never does.
//
// Args arrive as JSON-decoded values from the function REST endpoint; numbers
// are passed as strings by the harness and coerced here.
// ---------------------------------------------------------------------------
async function run(sdk, variant, target, maxSendsRaw, startSeqRaw, retainRaw) {
  const maxSends = Number(maxSendsRaw);
  const startSeq = Number(startSeqRaw || 1);
  const retain = String(retainRaw) === "true" || retainRaw === true;
  const normalized = normaliseCandidate(target);
  const started = Date.now();

  mark(sdk, "RUN_START",
    "variant=" + variant + " max=" + maxSends + " start_seq=" + startSeq +
    " retain=" + retain + " runtime_sends_before=" + sendsThisRuntime +
    " retained_wrappers=" + RETAINED.length);

  let completed = 0;
  let firstError = null;
  let firstErrorSeq = null;
  const latencies = [];

  for (let i = 0; i < maxSends; i++) {
    const seq = startSeq + i;
    const startedAt = Date.now();

    // ---- WRITE AHEAD. Before the send, never after. -----------------------
    // If the host aborts inside the send, this row is what identifies the
    // candidate that was in flight. Its absence would make the whole technique
    // ACTIVE-02 and ACTIVE-13 rest on unfounded.
    let journalled = false;
    try {
      await journalStart([
        RUNTIME_SESSION_ID, seq, variant, normalized, "spike-04-send-cliff", startedAt,
      ]);
      journalled = true;
    } catch (e) {
      mark(sdk, "JOURNAL_START_FAILED", "seq=" + seq + " err=" + String(e).slice(0, 160));
    }

    if (seq % 10 === 0 || i === 0) {
      mark(sdk, "SEND_BATCH", "seq=" + seq + " completed=" + completed);
    }
    mark(sdk, "SEND_START", "seq=" + seq + " journalled=" + journalled);

    const t0 = performance.now();
    let out = null;
    let status = "ok";
    let error = null;
    try {
      out = await doSend(sdk, variant, target, retain);
    } catch (e) {
      status = "error";
      error = String(e).slice(0, 300);
      if (firstError === null) { firstError = error; firstErrorSeq = seq; }
    }
    const elapsed = performance.now() - t0;
    latencies.push(Number(elapsed.toFixed(2)));
    if (status === "ok") { completed++; sendsThisRuntime++; }

    mark(sdk, "SEND_END",
      "seq=" + seq + " status=" + status + " code=" + (out ? out.code : "null") +
      " ms=" + elapsed.toFixed(1) + " runtime_total=" + sendsThisRuntime);

    try {
      if (journalled) {
        await journalFinish([
          Date.now(), status,
          out ? out.code : null,
          out ? out.body_length : null,
          out ? out.request_id : null,
          out ? out.response_id : null,
          Number(elapsed.toFixed(3)),
          error,
          RUNTIME_SESSION_ID, seq,
        ]);
      }
    } catch (e) {
      mark(sdk, "JOURNAL_FINISH_FAILED", "seq=" + seq + " err=" + String(e).slice(0, 160));
    }
  }

  mark(sdk, "RUN_END", "variant=" + variant + " completed=" + completed);
  return {
    variant: variant,
    retain: retain,
    retained_wrappers: RETAINED.length,
    runtime_session_id: RUNTIME_SESSION_ID,
    target: target,
    normalized_candidate: normalized,
    requested: maxSends,
    start_seq: startSeq,
    completed: completed,
    runtime_total_sends: sendsThisRuntime,
    first_error: firstError,
    first_error_seq: firstErrorSeq,
    latencies_ms: latencies,
    wall_ms: Date.now() - started,
  };
}

// ---------------------------------------------------------------------------
// journal_read — reopen the journal and report the LAST UNFINALISED row.
//
// This is the measurement ACTIVE-02 and ACTIVE-13 are built on: after a host
// abort, does the journal correctly identify the send that was in flight? The
// answer must come from the database, not from the loop's own memory, so this
// reads it back rather than reporting what run() remembered.
// ---------------------------------------------------------------------------
async function journal_read(sdk) {
  const totals = await (await db.prepare(
    "SELECT COUNT(*) AS total, " +
    "SUM(CASE WHEN finished_at IS NULL THEN 1 ELSE 0 END) AS unfinalised, " +
    "SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS ok " +
    "FROM send_journal")).all();
  const inflight = await (await db.prepare(
    "SELECT id, runtime_session_id, seq, variant, normalized_candidate, reason, started_at " +
    "FROM send_journal WHERE finished_at IS NULL ORDER BY seq DESC LIMIT 5")).all();
  const lastDone = await (await db.prepare(
    "SELECT id, runtime_session_id, seq, status, http_code, elapsed_ms " +
    "FROM send_journal WHERE finished_at IS NOT NULL ORDER BY seq DESC LIMIT 3")).all();
  const sessions = await (await db.prepare(
    "SELECT runtime_session_id, COUNT(*) AS rows, MIN(seq) AS min_seq, MAX(seq) AS max_seq " +
    "FROM send_journal GROUP BY runtime_session_id ORDER BY MIN(id)")).all();
  return {
    current_runtime_session_id: RUNTIME_SESSION_ID,
    totals: totals && totals[0] ? totals[0] : null,
    unfinalised_rows: inflight,
    last_finalised_rows: lastDone,
    sessions: sessions,
    at: Date.now(),
  };
}

async function session(sdk) {
  return {
    runtime_session_id: RUNTIME_SESSION_ID,
    sends_this_runtime: sendsThisRuntime,
    retained_wrappers: RETAINED.length,
    ready: ready,
    at: Date.now(),
    qjs: performance.now(),
  };
}

async function alive(sdk) {
  return { alive: true, runtime_session_id: RUNTIME_SESSION_ID, at: Date.now() };
}

export async function init(sdk) {
  sdk.console.log("[defminer-tier0-send] init rs=" + RUNTIME_SESSION_ID);
  db = await sdk.meta.db();
  await db.exec(JOURNAL_DDL);
  await db.exec("CREATE INDEX IF NOT EXISTS idx_send_journal_seq ON send_journal (seq)");
  await db.exec(
    "CREATE INDEX IF NOT EXISTS idx_send_journal_open ON send_journal (finished_at)");
  ready = true;

  sdk.api.register("run", run);
  sdk.api.register("journal_read", journal_read);
  sdk.api.register("session", session);
  sdk.api.register("alive", alive);

  sdk.console.log("[defminer-tier0-send] ready rs=" + RUNTIME_SESSION_ID);
}
