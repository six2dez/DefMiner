// DefMiner Phase 0 plan 00-02 — Tier-0 budgets probe.
//
// Its own manifest id (`defminer-tier0-budgets`), distinct from
// `defminer-tier0-core` and `defminer-recorder`, so it can never collide with
// the wave-1 probes or with the long-lived recorder on 8998.
//
// Three independent questions share this one probe:
//   SPIKE-08  are proxied bodies stored decompressed, and does Body.length
//             equal toRaw().length?
//   SPIKE-09  do PRAGMA settings and BEGIN/COMMIT survive across separate exec
//             calls on the pooled SQLite connection?
//   SPIKE-12  how does llrt/fs behave for containment?
//
// Plain ESM, no `caido:` imports — the SDK arrives as the `init` argument.
// Nothing here evaluates corpus content: `eval` and `new Function` appear
// nowhere in this phase.

let sha256Bytes = null;
let Buf = null;

function mark(sdk, label, extra) {
  sdk.console.log(
    "MARK " + label + " date=" + Date.now() + " qjs=" + performance.now().toFixed(3) +
      (extra ? " " + extra : ""),
  );
}

// ===========================================================================
// SPIKE-08 — body semantics
// ===========================================================================

// Every response seen since the last drain(). Bounded so a stray page load
// during a run cannot grow this without limit.
const BODY_ROWS = [];
const MAX_ROWS = 400;

function toHex(bytes, n) {
  let out = "";
  const limit = Math.min(n, bytes.length);
  for (let i = 0; i < limit; i++) {
    const h = bytes[i].toString(16);
    out += h.length === 1 ? "0" + h : h;
  }
  return out;
}

// The DIRECT test of whether Caido decompressed before handing the body over.
//
// gzip and zstd carry container magic. Brotli deliberately does not — it has no
// magic number at all — so brotli can only be identified negatively: the leading
// bytes are not gzip, not zstd, and not plausible text. That asymmetry is why
// this returns an enum rather than a boolean.
function containerSignature(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) return "gzip-container";
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd
  ) {
    return "zstd-container";
  }
  // Plausible-JavaScript test over the leading window: printable ASCII plus the
  // usual whitespace. Minified JS and a source comment both pass; a brotli or
  // deflate stream essentially never does.
  const window = Math.min(64, bytes.length);
  if (window === 0) return "empty";
  let printable = 0;
  for (let i = 0; i < window; i++) {
    const b = bytes[i];
    if ((b >= 0x20 && b < 0x7f) || b === 0x09 || b === 0x0a || b === 0x0d) printable++;
  }
  if (printable === window) return "plain-text";
  return "opaque-binary";
}

function headerOf(headers, name) {
  // Header names are documented as case-insensitive on the getter but
  // getHeaders() returns a plain record, so check both spellings rather than
  // assuming which one Caido normalises to.
  const lower = name.toLowerCase();
  const upper = name.replace(/(^|-)([a-z])/g, (_m, p, c) => p + c.toUpperCase());
  const v = headers[lower] !== undefined ? headers[lower] : headers[upper];
  if (v === undefined || v === null) return null;
  return Array.isArray(v) ? v.join(", ") : String(v);
}

function onInterceptResponse(sdk, request, response) {
  try {
    if (BODY_ROWS.length >= MAX_ROWS) return;
    const url = String(request.getUrl());
    const reqHeaders = request.getHeaders();
    const resHeaders = response.getHeaders();
    const body = response.getBody();

    const row = {
      ts: Date.now(),
      url: url,
      status: response.getCode(),
      request_accept_encoding: headerOf(reqHeaders, "accept-encoding"),
      // As DELIVERED TO THE PLUGIN — not as the origin sent them. If Caido
      // decompresses before the hook, whether it also rewrites or strips these
      // headers is itself part of the answer CORE-02 needs.
      content_encoding: headerOf(resHeaders, "content-encoding"),
      content_length: headerOf(resHeaders, "content-length"),
      content_type: headerOf(resHeaders, "content-type"),
      // The origin echoes the true identity length here so the plugin-side view
      // can be compared against it without decompressing anything in-runtime
      // (zlib does not load in this runtime — measured in SPIKE-07).
      x_raw_length: headerOf(resHeaders, "x-raw-length"),
      body_present: !!body,
    };

    if (body) {
      const raw = body.toRaw();
      row.body_length = body.length;
      row.raw_length = raw.length;
      row.first16_hex = toHex(raw, 16);
      row.sha256_raw = sha256Bytes(raw);
      row.signature = containerSignature(raw);

      // The text view, recorded side by side with the raw view. toText()
      // substitutes U+FFFD for anything that is not valid UTF-8, so for the
      // non-UTF-8 fixture these two digests MUST differ — and that difference
      // is exactly the reason ENC-01 forbids taking byte offsets from text.
      const text = body.toText();
      row.text_length_utf16 = text.length;
      const textBytes = Buf.from(text, "utf8");
      row.text_utf8_bytes = textBytes.length;
      row.sha256_text_utf8 = sha256Bytes(textBytes);
      row.raw_equals_text_bytes =
        row.sha256_raw === row.sha256_text_utf8 && row.raw_length === row.text_utf8_bytes;
    }

    BODY_ROWS.push(row);
  } catch (e) {
    try {
      sdk.console.log("[tier0-budgets] intercept skip: " + String(e).slice(0, 200));
    } catch (_) {
      /* nothing left to do */
    }
  }
}

// drain — return everything recorded since the last call, and clear.
function drain(sdk) {
  const rows = BODY_ROWS.slice();
  BODY_ROWS.length = 0;
  mark(sdk, "DRAIN", "rows=" + rows.length);
  return { rows: rows, drained: rows.length };
}

export async function init(sdk) {
  sdk.console.log("[tier0-budgets] init");

  // `caido:crypto` does NOT load in this runtime; bare `crypto` does and exports
  // createHash/Sha256. Measured in SPIKE-07. Same for `buffer` -> Buffer, which
  // is how a JS string is turned into UTF-8 bytes without a TextEncoder (there
  // is none: TextEncoder/TextDecoder are exported by no module on this build).
  //
  // MEASURED, not stylistic: an earlier version of this file kept init
  // non-async and registered inside a .then() on the import promise. The
  // plugin logged "ready", sdk.api.register worked, drain() answered over
  // REST — and sdk.events.onInterceptResponse NEVER FIRED. 34 proxied
  // responses, zero rows, no error anywhere. An event handler registered after
  // init has returned is silently dropped; a function handler registered at the
  // same point is not. So the imports are AWAITED and the event registration
  // happens while init is still on the stack.
  const [crypto, buffer] = await Promise.all([import("crypto"), import("buffer")]);
  Buf = buffer.Buffer;
  sha256Bytes = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

  sdk.api.register("drain", drain);
  sdk.api.register("sqlite_contracts", sqliteContracts);
  sdk.api.register("sqlite_sentinel_write", sqliteSentinelWrite);
  sdk.api.register("sqlite_sentinel_read", sqliteSentinelRead);
  sdk.api.register("fs_surface", fsSurface);
  sdk.api.register("fs_containment", fsContainment);

  sdk.events.onInterceptResponse((s, request, response) =>
    onInterceptResponse(s, request, response),
  );
  sdk.console.log("[tier0-budgets] ready");
}

// ===========================================================================
// SPIKE-09 — SQLite contracts on the pooled connection
//
// The question in words: do PRAGMA settings and BEGIN/COMMIT survive across
// SEPARATE exec calls? sdk.meta.db() is a connection POOL over worker threads
// with no transaction API and no migration framework, so if a BEGIN issued in
// one exec does not reach the COMMIT issued in the next, every multi-statement
// invariant in Phase 1's storage layer is unsound and STORE-01..07 must be
// designed around single-statement idempotent upserts instead.
// ===========================================================================

async function safe(fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 300) };
  }
}

async function sqliteContracts(sdk) {
  mark(sdk, "SQLITE_START");
  const db = await sdk.meta.db();
  const out = { steps: [] };
  const step = (name, r) => {
    out.steps.push(Object.assign({ step: name }, r));
    return r;
  };

  // Fresh tables per call so a re-run is not confounded by the previous one.
  await safe(() => db.exec("DROP TABLE IF EXISTS tx_probe"));
  await safe(() => db.exec("DROP TABLE IF EXISTS batch_probe"));
  await step(
    "create_tx_probe",
    await safe(() =>
      db.exec("CREATE TABLE tx_probe (id INTEGER PRIMARY KEY, tag TEXT NOT NULL UNIQUE)"),
    ),
  );

  // ---- Q1: does a PRAGMA set in one exec survive into the next? -----------
  // user_version is a real persisted header field, so if the pool hands the
  // second exec a DIFFERENT connection the value still survives (it lives in
  // the database file). cache_size is per-CONNECTION, so it does NOT survive a
  // connection switch. Reading BOTH is what distinguishes "PRAGMA persisted"
  // from "same connection happened to be reused".
  await step("pragma_set_user_version", await safe(() => db.exec("PRAGMA user_version = 4242")));
  const uv = await safe(async () => (await db.prepare("PRAGMA user_version")).get());
  step("pragma_read_user_version", uv);
  out.pragma_user_version = uv.ok && uv.value ? uv.value.user_version : null;

  await step("pragma_set_cache_size", await safe(() => db.exec("PRAGMA cache_size = -8000")));
  const cs = await safe(async () => (await db.prepare("PRAGMA cache_size")).get());
  step("pragma_read_cache_size", cs);
  out.pragma_cache_size = cs.ok && cs.value ? cs.value.cache_size : null;

  // journal_mode: is WAL on? The type declaration says the pool opens with
  // wal:true by default, but sdk.meta.db() does not expose the open options, so
  // the only honest answer is to read it back.
  const jm = await safe(async () => (await db.prepare("PRAGMA journal_mode")).get());
  step("pragma_read_journal_mode", jm);
  out.journal_mode = jm.ok && jm.value ? jm.value.journal_mode : null;

  // ---- Q2: does BEGIN in one exec reach COMMIT in another? ----------------
  const begin = await safe(() => db.exec("BEGIN"));
  step("tx_begin", begin);
  const ins = await safe(() =>
    db.exec("INSERT INTO tx_probe (id, tag) VALUES (1, 'in-transaction')"),
  );
  step("tx_insert", ins);
  const commit = await safe(() => db.exec("COMMIT"));
  step("tx_commit", commit);
  const afterCommit = await safe(async () =>
    (await db.prepare("SELECT COUNT(*) AS n FROM tx_probe")).get(),
  );
  step("tx_read_after_commit", afterCommit);
  out.rows_after_split_commit =
    afterCommit.ok && afterCommit.value ? afterCommit.value.n : null;

  // And the mirror image: does a ROLLBACK in a later exec undo an insert from
  // an earlier one? If BEGIN did not survive, the insert is already durable and
  // the ROLLBACK errors with "cannot rollback - no transaction is active".
  const begin2 = await safe(() => db.exec("BEGIN"));
  step("tx2_begin", begin2);
  const ins2 = await safe(() =>
    db.exec("INSERT INTO tx_probe (id, tag) VALUES (2, 'should-roll-back')"),
  );
  step("tx2_insert", ins2);
  const rb = await safe(() => db.exec("ROLLBACK"));
  step("tx2_rollback", rb);
  const afterRb = await safe(async () =>
    (await db.prepare("SELECT COUNT(*) AS n FROM tx_probe")).get(),
  );
  step("tx2_read_after_rollback", afterRb);
  out.rows_after_split_rollback = afterRb.ok && afterRb.value ? afterRb.value.n : null;

  // ---- Q3: is a multi-statement SINGLE exec atomic? -----------------------
  // begin, three good inserts, one that violates a UNIQUE constraint, commit —
  // all in ONE exec string. If the whole batch rolls back, the count is 0 and
  // one exec is an atomic unit. If the good rows survive, it is not, and
  // Phase 1 cannot lean on it.
  await step(
    "create_batch_probe",
    await safe(() =>
      db.exec("CREATE TABLE batch_probe (id INTEGER PRIMARY KEY, tag TEXT NOT NULL UNIQUE)"),
    ),
  );
  const batch =
    "BEGIN;" +
    "INSERT INTO batch_probe (id, tag) VALUES (1, 'a');" +
    "INSERT INTO batch_probe (id, tag) VALUES (2, 'b');" +
    "INSERT INTO batch_probe (id, tag) VALUES (3, 'c');" +
    "INSERT INTO batch_probe (id, tag) VALUES (4, 'a');" + // forced UNIQUE failure
    "INSERT INTO batch_probe (id, tag) VALUES (5, 'e');" +
    "COMMIT;";
  const batchRes = await safe(() => db.exec(batch));
  step("batch_exec", batchRes);
  out.batch_threw = !batchRes.ok;
  const batchCount = await safe(async () =>
    (await db.prepare("SELECT COUNT(*) AS n FROM batch_probe")).get(),
  );
  step("batch_count", batchCount);
  out.batch_rows = batchCount.ok && batchCount.value ? batchCount.value.n : null;

  // A failed batch can leave a transaction open on whichever pooled connection
  // ran it, which would poison every later statement on that connection.
  // Recording whether a bare COMMIT now succeeds says whether that happened.
  const dangling = await safe(() => db.exec("COMMIT"));
  step("batch_dangling_commit", dangling);
  out.batch_left_transaction_open = dangling.ok;
  if (dangling.ok) await safe(() => db.exec("ROLLBACK"));

  // ---- Q4: pool concurrency across two rapid calls ------------------------
  // Fire a write and a read without awaiting the write first. On a pool these
  // can land on different connections; what matters is whether the read can
  // observe a write that has not resolved yet.
  await safe(() => db.exec("DROP TABLE IF EXISTS pool_probe"));
  await safe(() => db.exec("CREATE TABLE pool_probe (id INTEGER PRIMARY KEY, tag TEXT)"));
  const writeP = db
    .prepare("INSERT INTO pool_probe (id, tag) VALUES (?, ?)")
    .then((s) => s.run(1, "concurrent"));
  const readP = db.prepare("SELECT COUNT(*) AS n FROM pool_probe").then((s) => s.get());
  const settled = await safe(() => Promise.all([writeP, readP]));
  step("pool_interleave", settled);
  out.pool_read_saw_unawaited_write =
    settled.ok && settled.value && settled.value[1] ? settled.value[1].n : null;

  mark(sdk, "SQLITE_END");
  return out;
}

// ---- open research question 2: does the plugin database survive a genuine
// uninstall-and-reinstall, not merely a force-reinstall? ---------------------
//
// The UUID was verified stable across five force:true reinstalls in the
// research. What is unknown is whether an outright uninstall followed by a
// fresh install allocates a NEW uuid and therefore a new, empty database.
// UPGRADE-01 and UPGRADE-04 rest directly on the answer.
async function sqliteSentinelWrite(sdk, tag) {
  const db = await sdk.meta.db();
  await db.exec(
    "CREATE TABLE IF NOT EXISTS reinstall_sentinel (id INTEGER PRIMARY KEY, tag TEXT NOT NULL, ts INTEGER NOT NULL)",
  );
  const stmt = await db.prepare(
    "INSERT INTO reinstall_sentinel (tag, ts) VALUES (?, ?)",
  );
  await stmt.run(String(tag), Date.now());
  const n = await (await db.prepare("SELECT COUNT(*) AS n FROM reinstall_sentinel")).get();
  return { wrote: String(tag), rows: n ? n.n : null };
}

async function sqliteSentinelRead(sdk) {
  const db = await sdk.meta.db();
  // A missing table is the interesting answer, not an error: it means the
  // reinstall handed the plugin a brand new database.
  try {
    const rows = await (
      await db.prepare("SELECT tag, ts FROM reinstall_sentinel ORDER BY id")
    ).all();
    return { table_exists: true, rows: rows, row_count: rows.length };
  } catch (e) {
    return { table_exists: false, rows: [], row_count: 0, error: String(e).slice(0, 300) };
  }
}

// ===========================================================================
// SPIKE-12 — llrt/fs containment
//
// The question in words: how does llrt/fs behave for containment? JSMiner's
// canonical-path defence rests on realpath, which this runtime may not have, and
// MAP-04 still has to write attacker-controlled sourcemap `sources` entries to
// disk safely.
//
// ENUMERATE the real export surface rather than testing a hardcoded list: the
// type package under-declares this runtime by roughly a factor of thirteen, so
// enumeration is the only ground truth.
// ===========================================================================

async function fsSurface() {
  const out = { modules: {} };
  for (const spec of ["fs", "path", "os", "fs/promises"]) {
    try {
      const m = await import(spec);
      const exports = Object.keys(m).sort();
      const entry = { exports: exports };
      // `default` and `promises` are namespaces in their own right; the flat key
      // list above hides everything inside them.
      if (m.default && typeof m.default === "object") {
        entry.default_keys = Object.keys(m.default).sort();
      }
      if (m.promises && typeof m.promises === "object") {
        entry.promises_keys = Object.keys(m.promises).sort();
      }
      out.modules[spec] = entry;
    } catch (e) {
      out.modules[spec] = { error: String(e).slice(0, 200) };
    }
  }

  // The five that decide whether a canonical-path defence is portable at all.
  const fsMod = out.modules.fs || {};
  const flat = []
    .concat(fsMod.exports || [], fsMod.default_keys || [], fsMod.promises_keys || [])
    .map((k) => String(k));
  const promises = (fsMod.promises_keys || []).map((k) => String(k));
  const has = (base) =>
    flat.indexOf(base) !== -1 ||
    flat.indexOf(base + "Sync") !== -1 ||
    promises.indexOf(base) !== -1;
  out.capabilities = {
    realpath: has("realpath"),
    lstat: has("lstat"),
    readlink: has("readlink"),
    stat: has("stat"),
    symlink: has("symlink"),
    access: has("access"),
    mkdir: has("mkdir"),
    writeFile: has("writeFile"),
    rm: has("rm"),
  };
  return out;
}

// The hostile `sources` fixture set. Every one of these is a shape a real
// sourcemap can carry, because `sources` is attacker-controlled data.
const HOSTILE_SOURCES = [
  { id: "relative_traversal", value: "../../../../../../etc/defminer-escape.txt" },
  { id: "relative_traversal_encoded", value: "..%2f..%2f..%2fdefminer-escape.txt" },
  { id: "absolute_posix", value: "/tmp/defminer-absolute-escape.txt" },
  { id: "absolute_posix_etc", value: "/etc/defminer-escape.txt" },
  { id: "windows_drive", value: "C:\\Windows\\Temp\\defminer-escape.txt" },
  { id: "windows_unc", value: "\\\\server\\share\\defminer-escape.txt" },
  { id: "windows_reserved_device", value: "CON" },
  { id: "windows_reserved_device_ext", value: "NUL.js" },
  { id: "protocol_webpack", value: "webpack:///./src/app.js" },
  { id: "protocol_file", value: "file:///etc/defminer-escape.txt" },
  { id: "protocol_http", value: "http://evil.example/app.js" },
  { id: "null_byte", value: "safe.js\u0000/../../../etc/defminer-escape.txt" },
  // NFC and NFD spellings of the SAME directory name. These are distinct JS
  // strings, so any in-memory dedupe keyed on the raw `sources` value treats
  // them as two files — but APFS normalises, so on disk they may collide and
  // the second write silently overwrites the first. That is a MAP-04 hazard
  // with nothing to do with traversal.
  { id: "unicode_nfc", value: "caf\u00e9/app.js" },
  { id: "unicode_nfd", value: "cafe\u0301/app.js" },
  // Same question for case. APFS is case-INSENSITIVE by default on macOS and
  // case-sensitive on Linux, so this answer is platform-dependent by
  // construction — which is exactly why MAP-05 must repeat it off macOS.
  { id: "case_lower", value: "srcdir/app.js" },
  { id: "case_upper", value: "SRCDIR/app.js" },
  { id: "unicode_fullwidth", value: "\uff0e\uff0e/\uff0e\uff0e/defminer-escape.txt" },
  { id: "unicode_rtl_override", value: "sub/\u202eresrc\u202c/../../defminer-escape.txt" },
  { id: "trailing_dots_spaces", value: "sub/../../defminer-escape.txt   " },
  { id: "empty", value: "" },
  { id: "dot_only", value: "." },
  { id: "benign_control", value: "src/app/index.js" },
];

/**
 * Resolve every hostile fixture against a scratch root and report where a write
 * WOULD land, then actually attempt the write — but only ever under the scratch
 * root, and only after checking containment ourselves.
 *
 * `scratchRoot` is supplied by the driver and is always inside the disposable
 * instance's own data path (threat T-00-21). `linkTarget` is likewise inside
 * that data path but OUTSIDE `scratchRoot`, so the symlink experiment below can
 * prove an escape from the scratch root without ever escaping the data path —
 * which is what keeps `containment.escaped` an honest false rather than a
 * suppressed true.
 */
async function fsContainment(sdk, scratchRoot, linkTarget) {
  mark(sdk, "FS_START", "root=" + scratchRoot);
  const fs = await import("fs");
  const path = await import("path");
  const root = String(scratchRoot);
  const outside = String(linkTarget);

  try {
    fs.mkdirSync(root, { recursive: true });
    fs.mkdirSync(outside, { recursive: true });
  } catch (e) {
    return { error: "cannot create scratch root: " + String(e).slice(0, 200) };
  }

  const results = [];
  for (const fx of HOSTILE_SOURCES) {
    const r = { id: fx.id, source: fx.value };
    try {
      r.normalized = path.normalize(fx.value);
    } catch (e) {
      r.normalized = null;
      r.normalize_error = String(e).slice(0, 160);
    }
    try {
      r.resolved = path.resolve(root, fx.value);
    } catch (e) {
      r.resolved = null;
      r.resolve_error = String(e).slice(0, 160);
    }
    try {
      r.joined = path.join(root, fx.value);
    } catch (e) {
      r.joined = null;
      r.join_error = String(e).slice(0, 160);
    }
    r.is_absolute_input = (() => {
      try {
        return path.isAbsolute(fx.value);
      } catch (_) {
        return null;
      }
    })();

    // THE CANDIDATE CONTAINMENT PREDICATE, evaluated per fixture. This is the
    // strategy MAP-04 would adopt: resolve, then require the result to be the
    // root itself or to start with root + sep. It is purely lexical — no
    // realpath, no lstat — which is the point.
    const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
    r.contained_by_prefix_rule =
      r.resolved !== null && (r.resolved === root || r.resolved.indexOf(rootWithSep) === 0);
    // path.resolve DISCARDS everything before an absolute segment, so an
    // absolute or drive-letter `sources` entry escapes the root entirely. That
    // is why the rule is evaluated on the RESOLVED path and never on the join.
    r.escapes_via_resolve = r.resolved !== null && !r.contained_by_prefix_rule;

    // Only ever attempt a write for a fixture the rule ACCEPTS. A rule that
    // accepts an escaping path is a finding; deliberately writing outside the
    // scratch root to demonstrate it is not — the escape is already proven by
    // the resolved path, and the host filesystem is the ceiling here.
    if (r.contained_by_prefix_rule && fx.value !== "" && fx.value !== ".") {
      try {
        const target = r.resolved;
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, "defminer-spike-12\n");
        r.write_attempted = true;
        r.write_ok = true;
        r.write_path = target;
      } catch (e) {
        r.write_attempted = true;
        r.write_ok = false;
        r.write_error = String(e).slice(0, 200);
      }
    } else {
      r.write_attempted = false;
      r.write_ok = null;
      r.write_path = null;
      r.write_skipped_reason = r.escapes_via_resolve
        ? "rejected by the prefix rule — resolves outside the scratch root"
        : "degenerate fixture (empty or dot)";
    }
    results.push(r);
  }

  // ---- can a symlink be detected at all? ---------------------------------
  // Create one inside the scratch root pointing outside it, then try every
  // detection route the runtime actually offers.
  const symlink = { created: false };
  try {
    const linkPath = path.join(root, "escape-link");
    try {
      fs.rmSync(linkPath, { force: true });
    } catch (_) {
      /* first run */
    }
    // Points at a directory inside the instance data path but outside the
    // scratch root. A link to /tmp would demonstrate the same thing and would
    // also make this run write outside its own data path, which is precisely
    // the outcome the containment gate exists to forbid.
    fs.symlinkSync(outside, linkPath);
    symlink.created = true;
    symlink.link_path = linkPath;
    symlink.link_target = outside;

    symlink.lstat = (() => {
      if (typeof fs.lstatSync !== "function") return { available: false };
      try {
        const st = fs.lstatSync(linkPath);
        return {
          available: true,
          is_symlink:
            typeof st.isSymbolicLink === "function" ? st.isSymbolicLink() : null,
          is_directory: typeof st.isDirectory === "function" ? st.isDirectory() : null,
          keys: Object.keys(st).sort(),
        };
      } catch (e) {
        return { available: true, error: String(e).slice(0, 200) };
      }
    })();

    symlink.stat = (() => {
      if (typeof fs.statSync !== "function") return { available: false };
      try {
        const st = fs.statSync(linkPath);
        return {
          available: true,
          // statSync FOLLOWS the link, so a symlink to a directory reports as a
          // directory. stat alone therefore cannot distinguish a link from the
          // thing it points at — which is why lstat matters.
          is_directory: typeof st.isDirectory === "function" ? st.isDirectory() : null,
          is_symlink:
            typeof st.isSymbolicLink === "function" ? st.isSymbolicLink() : null,
        };
      } catch (e) {
        return { available: true, error: String(e).slice(0, 200) };
      }
    })();

    symlink.readlink_available = typeof fs.readlinkSync === "function";
    symlink.realpath_available = typeof fs.realpathSync === "function";

    // Does writing THROUGH the symlink escape? The prefix rule accepts
    // <root>/escape-link/x because it is lexically inside the root, so if the
    // write lands under `outside` then the lexical rule is insufficient on its
    // own and MAP-04 needs a second, non-lexical check.
    const through = path.join(linkPath, "defminer-through-symlink.txt");
    symlink.write_through_path = through;
    try {
      fs.writeFileSync(through, "defminer-spike-12-symlink\n");
      symlink.write_through_ok = true;
    } catch (e) {
      symlink.write_through_ok = false;
      symlink.write_through_error = String(e).slice(0, 200);
    }
  } catch (e) {
    symlink.error = String(e).slice(0, 250);
  }

  let listing = [];
  try {
    listing = fs.readdirSync(root).sort();
  } catch (e) {
    listing = ["<readdir failed: " + String(e).slice(0, 120) + ">"];
  }

  mark(sdk, "FS_END");
  let outsideListing = [];
  try {
    outsideListing = fs.readdirSync(outside).sort();
  } catch (e) {
    outsideListing = ["<readdir failed: " + String(e).slice(0, 120) + ">"];
  }

  return {
    root: root,
    outside_root: outside,
    outside_listing: outsideListing,
    sep: path.sep,
    results: results,
    symlink: symlink,
    scratch_listing: listing,
  };
}
