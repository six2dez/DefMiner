// DefMiner SPIKE-10 — passive content-hash recorder.
//
// Separate manifest id from the spike probes on purpose, so this can sit on a
// long-lived instance without ever colliding with a disposable probe install.
//
// PRIVACY IS THE DESIGN CONSTRAINT (threat T-00-13). This runs against the
// operator's real proxied browsing for days. The row is EXACTLY:
//     {ts, url, sha256, bytes, content_type, status}
// and nothing else. No response bodies. No request or response headers. No
// cookies. No authorization material. The body is hashed and discarded; it is
// never stored, never logged, and never leaves the handler.
//
// The handler is also modelling CORE-01's shape: non-async, admission-gated,
// cheap, and returning immediately.

let db = null;
let ready = false;
let sha256 = null;

// db.exec(sql) takes NO parameters — verified against @caido/quickjs-types
// (extra/sqlite.d.ts: `exec(sql: string): Promise<void>`). Passing an array of
// bind values to exec() is silently IGNORED, which produced rows with every
// column NULL and a "NOT NULL constraint failed" that never surfaced. Binding
// requires prepare() -> Statement.run(...params), with params SPREAD, not an
// array. Named parameters are unsupported.
const INSERT_SQL =
  "INSERT INTO cache_log (ts, url, sha256, bytes, content_type, status) " +
  "VALUES (?, ?, ?, ?, ?, ?)";

const SCRIPTISH = [
  "javascript", "ecmascript", "application/x-javascript", "text/js", "module",
];

function isScriptish(contentType, url) {
  if (contentType) {
    const ct = String(contentType).toLowerCase();
    for (const needle of SCRIPTISH) {
      if (ct.indexOf(needle) !== -1) return true;
    }
  }
  if (url) {
    // Strip query and fragment before looking at the extension, or
    // `/app.js?v=2` would miss.
    const bare = String(url).split("#")[0].split("?")[0].toLowerCase();
    if (bare.endsWith(".js") || bare.endsWith(".mjs")) return true;
  }
  return false;
}

// Each insert starts from a FRESHLY INITIATED async operation.
//
// The obvious design — chain every insert onto one module-level promise to
// serialise them — does not work in this runtime. A continuation attached to an
// already-settled promise left over from a PREVIOUS event invocation is never
// driven: the handler logs, returns, and the .then() simply never runs. No row,
// no error, nothing in the log. Verified by instrumenting each step.
//
// Preparing per insert also avoids sharing one mutable Statement across
// concurrent responses. sdk.meta.db() is a connection POOL over worker threads,
// so two run() calls on a shared statement could land on different connections
// with interleaved bindings — which would silently corrupt the only data
// SPIKE-10's number rests on.
function enqueueInsert(sdk, values) {
  db.prepare(INSERT_SQL)
    .then((stmt) => stmt.run(...values))
    .catch((e) => {
      // Never let a recording failure disturb the proxied traffic, and never
      // let it vanish either: an async rejection in a non-async handler is
      // invisible unless it is caught here.
      try {
        sdk.console.log("[defminer-recorder] INSERT_FAILED " + String(e).slice(0, 200));
      } catch (_) { /* nothing left to do */ }
    });
}

function onInterceptResponse(sdk, request, response) {
  if (!ready) return;
  try {
    const url = request.getUrl();
    const headers = response.getHeaders();
    // Header lookup casing is not guaranteed; check both rather than assuming
    // which spelling Caido normalises to.
    const ctRaw = headers["content-type"] || headers["Content-Type"];
    const contentType = Array.isArray(ctRaw) ? ctRaw[0] : ctRaw;

    if (!isScriptish(contentType, url)) return;

    const body = response.getBody();
    if (!body) return;
    const raw = body.toRaw();
    const bytes = raw ? raw.length : 0;
    if (!bytes) return;

    // Hash and discard. `raw` goes out of scope here and is never persisted.
    const digest = sha256(raw);

    enqueueInsert(sdk, [
      Date.now(),
      // Strip the fragment; KEEP the query, because a cache-busting query
      // param is exactly what makes a re-served bundle a MISS, and dropping it
      // would inflate the hit rate this spike exists to measure.
      String(url).split("#")[0],
      digest,
      bytes,
      contentType ? String(contentType).slice(0, 120) : null,
      response.getCode(),
    ]);
  } catch (e) {
    try {
      sdk.console.log("[defminer-recorder] skip: " + String(e).slice(0, 160));
    } catch (_) { /* nothing left to do */ }
  }
}

export async function init(sdk) {
  sdk.console.log("[defminer-recorder] init");

  // `caido:crypto` does NOT load in this runtime; bare `crypto` does and
  // exports createHash/Sha256. Measured in SPIKE-07.
  const crypto = await import("crypto");
  sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

  db = await sdk.meta.db();
  await db.exec(
    "CREATE TABLE IF NOT EXISTS cache_log (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "ts INTEGER NOT NULL," +
      "url TEXT NOT NULL," +
      "sha256 TEXT NOT NULL," +
      "bytes INTEGER NOT NULL," +
      "content_type TEXT," +
      "status INTEGER" +
      ")",
  );
  await db.exec("CREATE INDEX IF NOT EXISTS idx_cache_log_sha ON cache_log (sha256)");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_cache_log_ts ON cache_log (ts)");

  ready = true;
  sdk.events.onInterceptResponse((s, request, response) =>
    onInterceptResponse(s, request, response));
  sdk.console.log("[defminer-recorder] cache_log ready");
}
