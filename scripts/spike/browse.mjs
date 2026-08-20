#!/usr/bin/env node
// scripts/spike/browse.mjs — drive Playwright Chromium through the SPIKE-10
// recorder's proxy over the pinned site list, TWICE per session.
//
// The second pass is the point: it is what exposes WITHIN-SESSION hits. The
// browser's own HTTP cache is deliberately left enabled, because SPIKE-10 is
// measuring what a real user's traffic looks like at the proxy, not what an
// uncached crawler's does. A cache-disabled crawl would report a hit rate that
// no real browsing session ever produces.
//
// Usage: node scripts/spike/browse.mjs [--proxy 127.0.0.1:8998] [--passes 2]
//                                      [--timeout 20000] [--sites path]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : dflt;
};

const PROXY = arg("proxy", "127.0.0.1:8998");
const PASSES = Number(arg("passes", "2"));
const TIMEOUT = Number(arg("timeout", "20000"));
const SITES_PATH = arg("sites", "scripts/spike/sites.json");

const sites = JSON.parse(readFileSync(SITES_PATH, "utf8")).sites;
console.error(`browse: ${sites.length} sites x ${PASSES} passes via proxy ${PROXY}`);

const browser = await chromium.launch({
  proxy: { server: `http://${PROXY}` },
  args: ["--ignore-certificate-errors"], // the instance mints its own CA
});
// ONE context for the whole session, so the browser cache persists across both
// passes. A fresh context per pass would discard it and make pass 2 identical
// to pass 1, erasing the within-session signal this script exists to produce.
const context = await browser.newContext({ ignoreHTTPSErrors: true });

let ok = 0;
let failed = 0;
for (let pass = 1; pass <= PASSES; pass++) {
  for (const url of sites) {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "load", timeout: TIMEOUT });
      // Let late/lazy bundles land; many sites fetch chunks after `load`.
      await page.waitForTimeout(1200);
      ok++;
      console.error(`  pass${pass} ok   ${url}`);
    } catch (e) {
      // A dead or slow site must never abort the session — partial data is
      // still valid data, and the run is unattended twice a day.
      failed++;
      console.error(`  pass${pass} FAIL ${url}: ${String(e).slice(0, 90)}`);
    } finally {
      await page.close().catch(() => {});
    }
  }
}

await context.close();
await browser.close();
console.error(`browse: done ok=${ok} failed=${failed}`);
console.log(JSON.stringify({ sites: sites.length, passes: PASSES, ok, failed }));
