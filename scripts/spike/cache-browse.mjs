#!/usr/bin/env node
// scripts/spike/cache-browse.mjs — SPIKE-11's driver.
//
// SPIKE-11 in words (REQUIREMENTS.md is the ID authority; SPIKE-11 is absent
// from PITFALLS.md entirely):
//
//   Do 304s and browser-cached responses reach onInterceptResponse at all?
//
// The answer decides whether FIND-03's retroactive scan of already-captured
// traffic is a convenience feature or a CORRECTNESS REQUIREMENT. If a returning
// visitor's bundles never reach the hook because the browser served them from
// its own cache, then passive-only analysis has a permanent blind spot on
// exactly the traffic an operator generates most: repeat visits to a target.
//
// THIS MUST BE DRIVEN BY A REAL BROWSER. A 304 is the tail end of a CACHE
// DECISION, and `curl -H 'If-None-Match: ...'` produces a 304 response without
// producing the decision path the spike is about — it proves the origin can
// emit a 304, which nobody doubted, and proves nothing about what a browser
// does with its own cache.
//
// Five scenarios, each drained around and each with three independent
// witnesses:
//   * the browser, via CDP: was a request actually put on the wire, was it
//     served from cache, and what status came back ON THE WIRE (which is where
//     the 304 is visible — Chromium reports the revalidated 200 to the page)
//   * the origin's own log: did a request reach it
//   * the plugin: did onInterceptResponse fire, with what status and body
//
// Every scenario also loads a `no-store` HTML wrapper through the same proxy.
// That navigation firing the hook is an in-scenario control: it proves the hook
// was live AT THAT MOMENT, so a subresource that did not fire cannot be blamed
// on a dead handler.

import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && argv[i + 1] !== undefined) return argv[i + 1];
  if (dflt === undefined) {
    console.error(`cache-browse: --${name} is required`);
    process.exit(2);
  }
  return dflt;
}

const PORT = Number(arg("port", "8996"));
const RUN_ID = arg("run-id");
const BACKEND = arg("backend");
const ORIGIN = arg("origin", "127.0.0.1:8083");
const PROFILE = arg("profile");
const ORIGIN_LOG = arg("origin-log", "");
const RESULTS = process.env.OUT || ".planning/phases/00-runtime-reality-check/results";
const OUT = arg("out", `${RESULTS}/runs/${RUN_ID}/raw/spike-11-cache.json`);

const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = readFileSync(`${RESULTS}/runs/${RUN_ID}/token`, "utf8").trim();
// The tag is minted by run-spike-11.sh and passed in, because the HTML wrappers
// on disk already embed it in their <script src>. Minting a second one here
// would give the driver and the web root different markers and every resource
// event would fail to attribute.
const TAG = arg("tag");

// Markers are per RESOURCE, not per scenario, because caching requires a stable
// URL: the cold load and the cached load must ask for the same cache key. The
// SCENARIO is established by the drain window instead — the log is drained to
// empty before each scenario, so every event collected inside a window belongs
// to that window. That is the same attribution rule SPIKE-05 uses, applied on
// the other axis.
const M = {
  fresh: `freshres-${TAG}`,
  reval: `revalres-${TAG}`,
  p1: `page1-${TAG}`,
  p2: `page2-${TAG}`,
  p3: `page3-${TAG}`,
  p4: `page4-${TAG}`,
};
const U = {
  fresh: `http://${ORIGIN}/fresh.js?dfm=${M.fresh}`,
  reval: `http://${ORIGIN}/revalidate.js?dfm=${M.reval}`,
  p1: `http://${ORIGIN}/p1.html?dfm=${M.p1}`,
  p2: `http://${ORIGIN}/p2.html?dfm=${M.p2}`,
  p3: `http://${ORIGIN}/p3.html?dfm=${M.p3}`,
  p4: `http://${ORIGIN}/p4.html?dfm=${M.p4}`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gql(query, variables) {
  const res = await fetch(`${BASE}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ query, variables: variables ?? {} }),
  });
  const json = await res.json();
  if (json.errors) throw new Error("graphql: " + JSON.stringify(json.errors).slice(0, 500));
  return json.data;
}

async function probe(name, ...values) {
  const res = await fetch(`${BASE}/plugin/backend/${BACKEND}/function`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ name, args: values.map((v) => JSON.stringify(v)) }),
  });
  const env = await res.json();
  if (env.kind !== "success") {
    throw new Error(`probe ${name} failed: ${JSON.stringify(env).slice(0, 400)}`);
  }
  return JSON.parse(env.returns);
}

async function collect({ settleEmptyPolls = 6, pollMs = 250, maxMs = 20000 } = {}) {
  const events = [];
  const started = Date.now();
  let empty = 0;
  while (Date.now() - started < maxMs && empty < settleEmptyPolls) {
    await sleep(pollMs);
    const d = await probe("drain");
    if (d.count === 0) empty += 1;
    else {
      empty = 0;
      events.push(...d.events);
    }
  }
  return events;
}

function originLines() {
  if (!ORIGIN_LOG) return [];
  try {
    return readFileSync(ORIGIN_LOG, "utf8").split("\n");
  } catch (e) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// CDP witness
// ---------------------------------------------------------------------------
const cdpEvents = [];
function attachCdp(cdp) {
  cdp.on("Network.requestWillBeSent", (e) =>
    cdpEvents.push({ kind: "willBeSent", id: e.requestId, url: e.request.url, at: Date.now() }),
  );
  cdp.on("Network.requestServedFromCache", (e) =>
    cdpEvents.push({ kind: "servedFromCache", id: e.requestId, at: Date.now() }),
  );
  cdp.on("Network.responseReceived", (e) =>
    cdpEvents.push({
      kind: "responseReceived",
      id: e.requestId,
      url: e.response.url,
      status: e.response.status,
      fromDiskCache: !!e.response.fromDiskCache,
      fromPrefetchCache: !!e.response.fromPrefetchCache,
      at: Date.now(),
    }),
  );
  // responseReceivedExtraInfo carries the status Chromium actually got ON THE
  // WIRE. This is the ONLY place a 304 is visible: `responseReceived` reports
  // the revalidated 200 that the page sees, so a 304 measured from that event
  // alone would be invisible.
  cdp.on("Network.responseReceivedExtraInfo", (e) =>
    cdpEvents.push({
      kind: "extraInfo",
      id: e.requestId,
      status: e.statusCode,
      at: Date.now(),
    }),
  );
}

function cdpSlice(from) {
  return cdpEvents.slice(from);
}

function witnessFor(slice, url) {
  const ids = new Set(
    slice.filter((e) => e.kind === "willBeSent" && e.url === url).map((e) => e.id),
  );
  const served = slice.filter((e) => e.kind === "servedFromCache" && ids.has(e.id));
  const responses = slice.filter((e) => e.kind === "responseReceived" && ids.has(e.id));
  const extra = slice.filter((e) => e.kind === "extraInfo" && ids.has(e.id));
  return {
    will_be_sent: ids.size,
    served_from_cache: served.length,
    from_disk_cache: responses.filter((r) => r.fromDiskCache).length,
    page_visible_statuses: responses.map((r) => r.status),
    wire_statuses: extra.map((r) => r.status),
  };
}

// ---------------------------------------------------------------------------
const scenarios = [];

async function scenario(name, resourceUrl, pageUrl, description, act) {
  // Drain to empty so the window starts clean.
  await probe("drain");
  const cdpFrom = cdpEvents.length;
  const originFrom = originLines().length;
  const started = new Date().toISOString();

  let error = null;
  let action = null;
  try {
    action = await act();
  } catch (e) {
    error = String(e && e.message ? e.message : e).slice(0, 600);
  }

  const events = await collect();
  const resEvents = events.filter((e) => e.url && e.url.includes(resourceUrl.split("?")[0]));
  const pageEvents = events.filter((e) => e.url && e.url.includes(pageUrl.split("?")[0]));
  const w = witnessFor(cdpSlice(cdpFrom), resourceUrl);

  const originWindow = originLines().slice(originFrom);
  const originResource = originWindow.filter((l) =>
    l.includes(resourceUrl.split("/").pop().split("?")[0]),
  );

  const row = {
    scenario: name,
    description,
    resource_url: resourceUrl,
    page_url: pageUrl,
    started_at: started,
    finished_at: new Date().toISOString(),
    error,
    action,

    // --- witness 1: the browser -------------------------------------------
    // TRUE means the browser actually put a request for the resource on the
    // wire. Chromium emits requestWillBeSent even for a cache hit, so the
    // presence of an on-the-wire status is the honest test, not the presence of
    // a request event.
    browser_issued_request: w.wire_statuses.length > 0,
    browser_request_events: w.will_be_sent,
    browser_served_from_cache: w.served_from_cache,
    browser_from_disk_cache: w.from_disk_cache,
    browser_wire_statuses: w.wire_statuses,
    browser_page_visible_statuses: w.page_visible_statuses,

    // --- witness 2: the origin --------------------------------------------
    origin_requests: originResource.length,
    origin_lines: originResource.map((l) => l.slice(-160)),

    // --- witness 3: the plugin --------------------------------------------
    hook_fired: resEvents.length > 0,
    hook_deliveries: resEvents.length,
    delivered_status: resEvents.length ? resEvents[0].status : null,
    delivered_body_length: resEvents.length ? resEvents[0].body_length : null,
    delivered_raw_length: resEvents.length ? resEvents[0].raw_length : null,
    delivered_response_headers: resEvents.length ? resEvents[0].response_headers : null,
    delivered_request_headers: resEvents.length ? resEvents[0].request_headers : null,

    // In-scenario control: the no-store HTML wrapper is proxied on every
    // navigation, so if IT fired the hook was demonstrably alive in this
    // window and a not-fired subresource is a real negative.
    page_hook_fired: pageEvents.length > 0,
    page_hook_deliveries: pageEvents.length,
    total_events_in_window: events.length,
  };
  scenarios.push(row);
  console.error(
    `scenario ${name}: wire=${JSON.stringify(w.wire_statuses)} cache=${w.served_from_cache} ` +
      `origin=${row.origin_requests} hook=${row.hook_fired}(${row.delivered_status}) ` +
      `pageHook=${row.page_hook_fired}${error ? " error=" + error.slice(0, 100) : ""}`,
  );
  return row;
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });

  // A fresh Caido has NO project, and with none selected the proxy returns
  // `Proxying error: Internal` and the hook never fires (wave 1). A guest can
  // create temporary projects only, and only one.
  const projects = await gql(`{ projects { id name } }`);
  let projectId = projects.projects.length ? projects.projects[0].id : null;
  if (!projectId) {
    const created = await gql(
      `mutation{ createProject(input:{name:"spike-11-cache", temporary:true}){ project{ id } error{ __typename } } }`,
    );
    if (created.createProject.error) {
      throw new Error("createProject: " + JSON.stringify(created.createProject.error));
    }
    projectId = created.createProject.project.id;
  }
  const sel = await gql(`mutation($id: ID!){ selectProject(id:$id){ error{ __typename } } }`, {
    id: String(projectId),
  });
  if (sel.selectProject.error) {
    throw new Error("selectProject: " + JSON.stringify(sel.selectProject.error));
  }
  console.error(`project selected: ${projectId}`);

  await probe("reset");

  // The instance mints its OWN CA under --data-path. It is fetched into the run
  // directory so an HTTPS origin would work through this proxy, and
  // --ignore-certificate-errors covers the interception. The origin in this
  // spike is HTTP, because scripts/spike/origin.py (owned by plan 00-01 and not
  // modifiable here) serves HTTP only — and Chromium's HTTP cache, its
  // freshness arithmetic and its revalidation path are scheme-independent, so
  // the cache decision under test is unchanged.
  let caBytes = null;
  try {
    const res = await fetch(`${BASE}/ca.crt`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(`${RESULTS}/runs/${RUN_ID}/raw/instance-ca.crt`, buf);
    caBytes = buf.length;
  } catch (e) {
    caBytes = null;
  }

  // A persistent context on a THROWAWAY profile, so the DISK cache survives
  // between scenarios. A fresh context per scenario would discard the cache and
  // make every scenario a cold load, which is precisely the measurement error
  // this spike exists to avoid (T-00-33: throwaway profile, local origin only,
  // no real site and no operator session).
  //
  // `<-loopback>` is load-bearing: Chromium bypasses any configured proxy for
  // loopback addresses BY DEFAULT, so without it the browser would talk to the
  // origin directly, Caido would see nothing, and every scenario would report
  // not-fired for a reason that has nothing to do with caching.
  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: true,
    proxy: { server: `http://127.0.0.1:${PORT}`, bypass: "<-loopback>" },
    ignoreHTTPSErrors: true,
    args: ["--ignore-certificate-errors"],
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  attachCdp(cdp);

  const goto = async (url) => {
    await page.goto(url, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(800);
    return { navigated: url };
  };

  // 1. COLD. Empty profile, first fetch. The control: the hook MUST fire.
  await scenario("cold", U.fresh, U.p1, "empty browser profile, first ever fetch of the resource", () =>
    goto(U.p1),
  );

  // 2. CACHED. A DIFFERENT page referencing the SAME resource, still inside its
  //    max-age. The browser should serve it from its own cache without touching
  //    the network at all — and if no request leaves the browser, the proxy
  //    never sees it and the hook cannot fire no matter what Caido does. This is
  //    the sharpest scenario in the spike.
  //
  //    A different page rather than page.reload() on purpose: Chromium treats a
  //    same-URL navigation as a reload and attaches `Cache-Control: max-age=0`,
  //    which forces revalidation and would silently convert this scenario into
  //    scenario 4.
  await scenario(
    "cached-fresh",
    U.fresh,
    U.p2,
    "second page referencing the same resource while still within Cache-Control max-age",
    () => goto(U.p2),
  );

  // 3. PRIME the revalidation resource. Recorded rather than hidden: it is the
  //    200 that puts a validator in the cache, and its numbers are the baseline
  //    scenario 4 is read against.
  await scenario(
    "revalidate-prime",
    U.reval,
    U.p3,
    "first fetch of the no-cache resource — puts ETag and Last-Modified in the browser cache",
    () => goto(U.p3),
  );

  // 4. REVALIDATE. `Cache-Control: no-cache` with a valid validator: the browser
  //    MUST revalidate, the origin returns 304, and the question is whether that
  //    304 — which carries no body — reaches the hook, and if so what
  //    Body.length and toRaw().length report for it.
  await scenario(
    "revalidate-304",
    U.reval,
    U.p4,
    "no-cache resource with a valid validator: browser must revalidate, origin answers 304",
    () => goto(U.p4),
  );

  // 5. HARD RELOAD. Cache bypassed, full 200 with body. Confirms the apparatus
  //    still delivers after the other four, so a not-fired above cannot be an
  //    artifact of a handler that stopped working partway through.
  //
  //    The browser must be POSITIONED on p2 first, because Page.reload reloads
  //    whatever is currently loaded and scenario 4 left it on p4. scenario()
  //    drains the event log before opening its window, so this positioning
  //    navigation contributes nothing to the measurement — and it must stay
  //    outside the window for exactly that reason.
  await page.goto(U.p2, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(800);
  await scenario(
    "hard-reload",
    U.fresh,
    U.p2,
    "CDP Page.reload({ignoreCache:true}) — cache bypassed, full 200 with body",
    async () => {
      await cdp.send("Page.enable");
      await cdp.send("Page.reload", { ignoreCache: true });
      await page.waitForLoadState("load", { timeout: 45000 });
      await page.waitForTimeout(1200);
      return { hard_reloaded: U.p2 };
    },
  );

  const status = await probe("status");
  await context.close();

  const out = {
    generated_at: new Date().toISOString(),
    run_id: RUN_ID,
    instance: BASE,
    origin: ORIGIN,
    profile: PROFILE,
    origin_log: ORIGIN_LOG || null,
    instance_ca_bytes: caBytes,
    project_id: projectId,
    markers: M,
    urls: U,
    probe_status_at_end: status,
    scenarios,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.error(`wrote ${OUT} (${scenarios.length} scenarios)`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("cache-browse FAILED:", e && e.stack ? e.stack : e);
    try {
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(
        OUT,
        JSON.stringify({ generated_at: new Date().toISOString(), fatal: String(e), scenarios }, null, 2) + "\n",
      );
    } catch (_) {}
    process.exit(1);
  },
);
