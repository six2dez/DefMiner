#!/usr/bin/env node
// scripts/spike/event-matrix.mjs — SPIKE-05's driver.
//
// SPIKE-05 in words (REQUIREMENTS.md is the ID authority; PITFALLS.md numbers
// five of twelve spikes differently and must never be read for IDs):
//
//   Does sdk.requests.send() re-fire onInterceptResponse? Do Replay, Automate,
//   imports and workflows fire it? Does save:false or plugins:false change any
//   of that?
//
// The recursion question is the sharp one. RequestSendOptions.plugins defaults
// to true and is documented as sending through the UPSTREAM plugins, but the
// documentation never says whether the intercept hook re-fires. If it does,
// DefMiner fetching a .map triggers DefMiner analysing that .map, which may
// trigger further fetches. ACTIVE-06 is designed around the answer.
//
// Drives each surface in turn against the local origin, with a UNIQUE
// CORRELATION MARKER per cell in the query string (`?dfm=<marker>`), draining
// the probe's delivered-event log around every cell so no event can be
// attributed to two surfaces (threat T-00-34).
//
// Every cell resolves to exactly one of three states — fired, not-fired or
// blocked — and a blocked cell always carries its verbatim error (T-00-35). A
// cell is never silently absent.
//
//   node scripts/spike/event-matrix.mjs --port 8995 --run-id <id> \
//        --backend <uuid> --origin 127.0.0.1:8083 --out raw/matrix.json
//
// Transport note: @caido/sdk-client 0.5.0 covers project, replay, workflow,
// request and plugin. It has NO Automate SDK and no traffic-import SDK, so
// those two cells go over raw GraphQL on the same authenticated endpoint. That
// is a gap in the client SDK, not a different instrument: identical URL,
// identical bearer token, identical instance.

import { execFile } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Client } from "@caido/sdk-client";

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
function arg(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  if (i === -1 || i === process.argv.length - 1) {
    if (fallback === undefined) {
      console.error(`event-matrix: --${name} is required`);
      process.exit(2);
    }
    return fallback;
  }
  return process.argv[i + 1];
}

const PORT = Number(arg("port", "8995"));
const RUN_ID = arg("run-id");
const BACKEND = arg("backend");
const ORIGIN = arg("origin", "127.0.0.1:8083");
const RESULTS = process.env.OUT || ".planning/phases/00-runtime-reality-check/results";
const OUT = arg("out", `${RESULTS}/runs/${RUN_ID}/raw/spike-05-matrix.json`);
const CORPUS_PATH = arg("path", "/ace-1.36.5.js");
const ORIGIN_LOG = arg("origin-log", "");
const ACTION_TIMEOUT_MS = Number(arg("action-timeout-ms", "90000"));

const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = readFileSync(`${RESULTS}/runs/${RUN_ID}/token`, "utf8").trim();
const [ORIGIN_HOST, ORIGIN_PORT] = ORIGIN.split(":");

const RUN_TAG = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
let cellCounter = 0;
function nextMarker(surface) {
  cellCounter += 1;
  // Marker is [a-z0-9-] only so it survives a URL round trip untouched and the
  // probe's substring extraction cannot be confused by an escape.
  return `${surface.replace(/[^a-z0-9]/g, "")}-${RUN_TAG}-${cellCounter}`;
}
function urlFor(marker) {
  return `http://${ORIGIN}${CORPUS_PATH}?dfm=${marker}`;
}

// ---------------------------------------------------------------------------
// transports
// ---------------------------------------------------------------------------
async function gql(query, variables) {
  const res = await fetch(`${BASE}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ query, variables: variables ?? {} }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error("graphql: " + JSON.stringify(json.errors).slice(0, 600));
  }
  return json.data;
}

// The plugin REST function endpoint JSON.parses EACH `args` element
// individually (measured in wave 1 and completed in wave 2), so every value is
// JSON.stringify'd on the way in and the `returns` envelope is double-decoded
// on the way out. A bare number in the args array is a 400.
async function probe(name, ...values) {
  const res = await fetch(`${BASE}/plugin/backend/${BACKEND}/function`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ name, args: values.map((v) => JSON.stringify(v)) }),
  });
  const env = await res.json();
  if (env.kind !== "success") {
    throw new Error(`probe ${name} failed: ${JSON.stringify(env).slice(0, 500)}`);
  }
  return JSON.parse(env.returns);
}

function curl(args) {
  return new Promise((resolve) => {
    execFile("curl", args, { timeout: 60000 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: String(stdout).trim(), stderr: String(stderr).trim() });
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The instance's own stdout, used as an independent witness for surfaces whose
// execution the driver cannot otherwise observe.
function readInstanceLog() {
  try {
    return readFileSync(`${RESULTS}/runs/${RUN_ID}/caido.stdout.log`, "utf8").split("\n");
  } catch (e) {
    return [];
  }
}

// The ORIGIN's own log, which is the witness that separates the two ways a cell
// can come back not-fired: the surface never put a request on the wire, or it
// did and Caido simply did not deliver the response to the plugin. Without this
// the two are indistinguishable and the matrix would be guessing.
function originHits(marker) {
  if (!ORIGIN_LOG) return null;
  try {
    const text = readFileSync(ORIGIN_LOG, "utf8");
    return text.split("\n").filter((l) => l.includes(`dfm=${marker}`)).length;
  } catch (e) {
    return null;
  }
}

// A surface that hangs must not hang the matrix. Whatever it did before hanging
// is still evidence, and the cell still gets a state.
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} did not settle within ${ms} ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// event collection
//
// Poll-and-accumulate rather than one drain after a fixed sleep. A fixed sleep
// either truncates a slow delivery (undercount, which would read as "the
// surface does not fire") or wastes the run. Settling on consecutive empty
// polls makes the stopping rule a property of the data.
// ---------------------------------------------------------------------------
async function collect({ settleEmptyPolls = 6, pollMs = 250, maxMs = 20000 } = {}) {
  const events = [];
  const drains = [];
  const started = Date.now();
  let empty = 0;
  while (Date.now() - started < maxMs && empty < settleEmptyPolls) {
    await sleep(pollMs);
    const d = await probe("drain");
    drains.push({ at: d.drained_at, count: d.count, seq_high_water: d.seq_high_water });
    if (d.count === 0) {
      empty += 1;
    } else {
      empty = 0;
      events.push(...d.events);
    }
  }
  return { events, drains, waited_ms: Date.now() - started };
}

async function drainQuiet() {
  const d = await probe("drain");
  return d.count;
}

// Caido's own label for where a saved request came from. The plugin cannot see
// this — Request in the backend SDK has no getSource() — so it is read back
// over GraphQL and recorded beside the plugin-side view. Where they disagree,
// that disagreement is the finding.
async function sourceOf(requestId) {
  if (!requestId || requestId === "0") return null;
  try {
    const d = await gql(
      `query($id: ID!){ request(id:$id){ id source alteration host path } }`,
      { id: String(requestId) },
    );
    return d.request ? d.request.source : null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// the matrix
// ---------------------------------------------------------------------------
const cells = [];

async function runCell(surface, flags, notes, action) {
  const marker = nextMarker(surface);
  const cell = {
    surface,
    flags: flags ?? null,
    marker,
    url: urlFor(marker),
    notes: notes ?? null,
    state: null,
    fired: null,
    deliveries: 0,
    statuses: [],
    stray_events: 0,
    error: null,
    action: null,
    started_at: new Date().toISOString(),
  };
  // Clear anything left over so the cell starts from a known-empty log.
  const leftover = await drainQuiet();
  cell.leftover_drained_before = leftover;

  const originBefore = originHits(marker);
  try {
    cell.action = await withTimeout(
      Promise.resolve(action({ marker, url: urlFor(marker) })),
      ACTION_TIMEOUT_MS,
      `${surface} action`,
    );
  } catch (e) {
    cell.error = String(e && e.message ? e.message : e).slice(0, 900);
  }

  const collected = await collect();
  const mine = collected.events.filter((e) => e.marker === marker);
  const strays = collected.events.filter((e) => e.marker !== marker);
  cell.stray_events = strays.length;
  cell.stray_markers = [...new Set(strays.map((e) => e.marker))];
  cell.deliveries = mine.length;
  cell.statuses = mine.map((e) => e.status);
  cell.body_lengths = mine.map((e) => e.body_length);
  cell.raw_lengths = mine.map((e) => e.raw_length);
  cell.request_ids = mine.map((e) => e.request_id);
  cell.waited_ms = collected.waited_ms;
  cell.events = mine;

  cell.caido_sources = [];
  for (const id of [...new Set(cell.request_ids)]) {
    cell.caido_sources.push({ request_id: id, source: await sourceOf(id) });
  }

  // Independent, origin-side accounting of whether the request actually left
  // Caido for this marker.
  cell.origin_requests = originHits(marker);
  cell.origin_requests_before = originBefore;

  cell.fired = mine.length > 0;
  if (cell.fired) {
    // Delivery is delivery. If the driver's own call errored or timed out but
    // the hook still fired, the surface DOES fire and recording it as blocked
    // would be a false negative — the error is kept in `error` either way.
    cell.state = "fired";
  } else if (cell.error) {
    // The surface refused or never completed. `blocked` requires the verbatim
    // error, which is already in cell.error (T-00-35).
    cell.state = "blocked";
  } else {
    cell.state = "not-fired";
  }
  cell.finished_at = new Date().toISOString();
  cells.push(cell);
  console.error(
    `cell ${surface}${flags ? " " + JSON.stringify(flags) : ""}: ${cell.state} ` +
      `deliveries=${cell.deliveries}${cell.error ? " error=" + cell.error.slice(0, 120) : ""}`,
  );
  return cell;
}

// ---------------------------------------------------------------------------
function rawRequest(marker) {
  const path = `${CORPUS_PATH}?dfm=${marker}`;
  return (
    `GET ${path} HTTP/1.1\r\n` +
    `Host: ${ORIGIN}\r\n` +
    `Accept: */*\r\n` +
    `Accept-Encoding: identity\r\n` +
    `Connection: close\r\n\r\n`
  );
}

const b64 = (s) => Buffer.from(s, "utf8").toString("base64");

const connection = {
  host: ORIGIN_HOST,
  port: Number(ORIGIN_PORT),
  isTLS: false,
};

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });

  const client = new Client({ url: BASE, auth: { token: TOKEN } });
  await client.connect({ ready: true });
  const health = await client.health();
  console.error(`instance health: ${health.name} ${health.version}`);

  // A fresh Caido has NO project, and with none selected the proxy returns
  // "Proxying error: Internal" and onInterceptResponse never fires (wave 1).
  // Every traffic-observing cell below depends on this, so it is asserted here
  // rather than assumed. A guest can create temporary projects only.
  // A guest is entitlement-limited to a single project: creating a SECOND
  // temporary project returns PermissionDeniedUserError even though the first
  // succeeded. So reuse whatever project exists and only create when there is
  // none, exactly as recorder-up.sh does.
  const projects = await client.project.list();
  const project = projects.length
    ? projects[0]
    : await client.project.create({ name: "spike-05-matrix", temporary: true });
  await client.project.select(project.id);
  console.error(`project selected: ${project.id} (${project.name})`);

  await probe("reset");

  // -- 1. Proxy. The control. If this does not fire, the apparatus is broken
  //       and every other cell in the matrix is uninterpretable.
  const proxyCell = await runCell("proxy", null, "curl --proxy; the control cell", async ({ url }) => {
    const r = await curl([
      "-s", "-o", "/dev/null", "-w", "%{http_code}",
      "--proxy", BASE, "-m", "30", url,
    ]);
    return { http_code: r.stdout, curl_ok: r.ok, stderr: r.stderr.slice(0, 300) };
  });

  // A saved, proxied request id — Replay and the active workflow both need an
  // existing request to hang off.
  const seedRequestId = proxyCell.request_ids[0] ?? null;

  // -- 2. Replay.
  await runCell("replay", null, "createReplaySession(kind: HTTP) + startReplayTask via GraphQL", async ({ marker }) => {
    // Two @caido/sdk-client 0.5.0 defects made the SDK path unusable against
    // 0.57.1, both measured rather than assumed:
    //   1. replay.sessions.create() does NOT base64-encode requestSource.raw
    //      (replay.send() does), so the server rejects it with
    //      `Expected input type "Blob", found "GET /ace..."`.
    //   2. replay.send() never resolves: it awaits a task-completion
    //      subscription that did not arrive in 6+ minutes on a guest token,
    //      while the underlying startReplayTask mutation returns immediately
    //      with a created entry and no error.
    // The mutation pair below is the same server-side operation the SDK wraps,
    // so the surface under test is unchanged.
    const raw = rawRequest(marker);
    const created = await gql(
      `mutation($i: CreateReplaySessionInput!){
         createReplaySession(input:$i){ session{ id name } } }`,
      {
        i: {
          kind: "HTTP",
          requestSource: { raw: { raw: b64(raw), connectionInfo: connection } },
        },
      },
    );
    const sessionId = created.createReplaySession.session.id;
    const started = await gql(
      `mutation($id: ID!){
         startReplayTask(sessionId:$id){
           task{ id replayEntry{ id error } }
           error{ __typename }
         } }`,
      { id: String(sessionId) },
    );
    if (started.startReplayTask.error) {
      throw new Error("startReplayTask: " + JSON.stringify(started.startReplayTask.error));
    }
    const task = started.startReplayTask.task;
    return {
      session_id: sessionId,
      task_id: task ? task.id : null,
      entry_id: task && task.replayEntry ? task.replayEntry.id : null,
      entry_error: task && task.replayEntry ? task.replayEntry.error : null,
    };
  });

  // -- 3. Automate. No Automate SDK in @caido/sdk-client 0.5.0 — raw GraphQL on
  //       the same authenticated endpoint.
  await runCell("automate", null, "createAutomateSession + startAutomateTask via GraphQL", async ({ marker }) => {
    const raw = rawRequest(marker);
    const created = await gql(
      `mutation($input: CreateAutomateSessionInput!){
         createAutomateSession(input:$input){ session{ id } } }`,
      { input: { requestSource: { raw: { raw: b64(raw), connectionInfo: connection } } } },
    );
    const sessionId = created.createAutomateSession.session.id;

    // A single-byte placeholder over the trailing character of the marker with
    // a two-entry list gives exactly two requests, each still carrying the
    // marker prefix, so attribution survives the substitution.
    const anchor = `dfm=${marker}`;
    const start = raw.indexOf(anchor) + anchor.length;
    const updated = await gql(
      `mutation($id: ID!, $input: UpdateAutomateSessionInput!){
         updateAutomateSession(id:$id, input:$input){
           session{ id }
           error{ __typename }
         } }`,
      {
        id: sessionId,
        input: {
          connection,
          raw: b64(raw),
          settings: {
            payloads: [
              {
                options: { simpleList: { list: ["-a", "-b"] } },
                preprocessors: [],
              },
            ],
            placeholders: [{ start, end: start }],
            redirect: { strategy: "NEVER", max: 0 },
            strategy: "ALL",
            concurrency: { workers: 2, delay: 0 },
            retryOnFailure: { maximumRetries: 0, backoff: 0 },
            closeConnection: true,
            updateContentLength: true,
            extractors: [],
          },
        },
      },
    );
    if (updated.updateAutomateSession.error) {
      throw new Error(
        "updateAutomateSession: " + JSON.stringify(updated.updateAutomateSession.error),
      );
    }
    const started = await gql(
      `mutation($id: ID!){
         startAutomateTask(automateSessionId:$id){ automateTask{ id } } }`,
      { id: sessionId },
    );
    return {
      session_id: sessionId,
      task_id: started.startAutomateTask.automateTask
        ? started.startAutomateTask.automateTask.id
        : null,
    };
  });

  // -- 4. Import. `importData` in 0.57.1 imports tamper rules and findings only
  //       — there is no traffic-import mutation. The supported way to put
  //       externally-obtained traffic into a project headlessly is
  //       createRequest with source IMPORT, which is what RequestSDK.create
  //       maps onto. It never traverses the proxy, so the expected answer is
  //       not-fired; recorded rather than assumed.
  await runCell("import", null, "createRequest(source: IMPORT) — the only headless traffic-import path in 0.57.1", async ({ marker }) => {
    const raw = rawRequest(marker);
    const responseRaw =
      "HTTP/1.1 200 OK\r\nContent-Type: application/javascript\r\nContent-Length: 21\r\n\r\nvar dfmImported = 1;\n";
    const created = await gql(
      `mutation($input: CreateRequestInput!){
         createRequest(input:$input){ id responseId } }`,
      {
        input: {
          host: ORIGIN_HOST,
          port: Number(ORIGIN_PORT),
          method: "GET",
          path: CORPUS_PATH,
          query: `dfm=${marker}`,
          isTls: false,
          raw: b64(raw),
          source: "IMPORT",
          alteration: "NONE",
          response: {
            statusCode: 200,
            raw: b64(responseRaw),
            source: "IMPORT",
            alteration: "NONE",
            roundtripTime: 1,
          },
        },
      },
    );
    const importedId = created.createRequest.id;
    return {
      request_id: importedId,
      response_id: created.createRequest.responseId,
      caido_source: await sourceOf(importedId),
    };
  });

  // -- 5. Workflow. An ACTIVE workflow whose JavaScript node issues a request
  //       through sdk.requests.send(). Running the workflow itself moves no
  //       traffic; the node does. The question is whether traffic originating
  //       inside the workflow runtime reaches a backend plugin's hook.
  await runCell("workflow", null, "active workflow, caido/http-code-js node calling sdk.requests.send()", async ({ marker, url }) => {
    if (!seedRequestId) throw new Error("no seed request id from the proxy cell to run the workflow against");
    const code =
      "export async function run({ request, response }, sdk) {\n" +
      "  try {\n" +
      `    const spec = new RequestSpec(${JSON.stringify(url)});\n` +
      "    const sent = await sdk.requests.send(spec);\n" +
      `    sdk.console.log("DFMWF ok marker=${marker} status=" + (sent && sent.response ? sent.response.getCode() : "none"));\n` +
      "  } catch (e) {\n" +
      `    sdk.console.log("DFMWF err marker=${marker} " + String(e));\n` +
      "  }\n" +
      "  return { data: null };\n" +
      "}\n";
    const definition = {
      edition: 2,
      id: `dfm-wf-${marker}`,
      name: `DefMiner SPIKE-05 ${marker}`,
      description: "SPIKE-05: does workflow-originated traffic fire onInterceptResponse",
      kind: "active",
      graph: {
        nodes: [
          {
            id: 0,
            alias: "start",
            name: "Start",
            definition_id: "caido/active-start",
            version: "^0.1.0",
            inputs: [],
            display: { x: -220, y: 0 },
          },
          {
            id: 2,
            alias: "js",
            name: "Javascript",
            definition_id: "caido/http-code-js",
            version: "^0.1.0",
            inputs: [
              { alias: "request", value: { kind: "ref", data: "$start.request" } },
              { alias: "code", value: { kind: "string", data: code } },
            ],
            display: { x: 0, y: 0 },
          },
          {
            id: 1,
            alias: "end",
            name: "End",
            definition_id: "caido/active-end",
            version: "^0.1.0",
            inputs: [],
            display: { x: 240, y: 0 },
          },
        ],
        edges: [
          { source: { node_id: 0, exec_alias: "exec" }, target: { node_id: 2, exec_alias: "exec" } },
          { source: { node_id: 2, exec_alias: "exec" }, target: { node_id: 1, exec_alias: "exec" } },
        ],
      },
    };
    const workflow = await client.workflow.create({ definition, global: false });
    const task = await client.workflow.run({
      kind: "active",
      id: workflow.id,
      requestId: String(seedRequestId),
    });
    // The workflow task is asynchronous; give it room before the collector's
    // own settle window starts counting empty polls.
    await sleep(2500);
    // Independent witness that the node actually ran and actually issued a
    // request. Without it, "not-fired" would be indistinguishable from "the
    // workflow never executed", which is the failure this cell is most likely
    // to hit.
    const log = readInstanceLog().filter((l) => l.includes("DFMWF") && l.includes(marker));
    return {
      workflow_id: workflow.id,
      task_id: task.id,
      seed_request_id: seedRequestId,
      node_log_lines: log.map((l) => l.slice(-200)),
      node_ran: log.length > 0,
    };
  });

  // -- 6. Plugin-originated sends: all four combinations of save and plugins.
  //       This is the recursion question ACTIVE-06 is designed around.
  for (const save of [true, false]) {
    for (const plugins of [true, false]) {
      await runCell(
        "plugin-send",
        { save, plugins },
        "sdk.requests.send() from inside the probe",
        async ({ url }) => probe("send", url, save, plugins),
      );
    }
  }

  // -- 7. caido:http fetch. Documented as NOT routing through the proxy, so the
  //       expected answer is not-fired. ACTIVE-03 routes third-party calls this
  //       way, so it is measured.
  await runCell("caido-http-fetch", null, "fetch() from the caido:http module inside the probe", async ({ url }) =>
    probe("http_fetch", url),
  );

  // Closing control. A cell that reports not-fired late in the run is only
  // meaningful if the hook was still alive at that point; without this, a
  // handler that died silently halfway through would read as "these five
  // surfaces do not fire".
  await runCell("proxy", null, "curl --proxy; the CLOSING control, proving the hook was still live after every other cell", async ({ url }) => {
    const r = await curl([
      "-s", "-o", "/dev/null", "-w", "%{http_code}",
      "--proxy", BASE, "-m", "30", url,
    ]);
    return { http_code: r.stdout, curl_ok: r.ok, stderr: r.stderr.slice(0, 300) };
  });

  const status = await probe("status");

  const out = {
    generated_at: new Date().toISOString(),
    run_id: RUN_ID,
    instance: BASE,
    origin: ORIGIN,
    corpus_path: CORPUS_PATH,
    origin_log: ORIGIN_LOG || null,
    run_tag: RUN_TAG,
    project: { id: project.id, name: project.name, temporary: true },
    health: { name: health.name, version: health.version },
    probe_status_at_end: status,
    cells,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.error(`wrote ${OUT} (${cells.length} cells)`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("event-matrix FAILED:", e && e.stack ? e.stack : e);
    // Whatever cells completed are still evidence; write them before dying so a
    // late failure does not erase an otherwise-good matrix.
    try {
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(
        OUT,
        JSON.stringify(
          { generated_at: new Date().toISOString(), run_id: RUN_ID, fatal: String(e), cells },
          null,
          2,
        ) + "\n",
      );
    } catch (_) {}
    process.exit(1);
  },
);
