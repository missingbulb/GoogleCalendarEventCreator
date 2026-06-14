// Real-Chrome smoke test: load the unpacked extension in headless Chrome and
// confirm its MV3 service worker actually registers and runs. This is the only
// layer that exercises Chrome's *real* extension loader — the layer that broke
// in #146 — so it catches startup failures (bad importScripts path, manifest
// error, MV3 type/CSP mismatch) that a Node simulation can only approximate.
// The deterministic Node-level equivalent is test/integration/extension-loads.test.js.
//
// Runs in CI via `npm run test:e2e` against the Chrome preinstalled on
// ubuntu-latest. SKIPS when neither puppeteer-core nor a Chrome binary is
// present (e.g. the offline dev sandbox), so it never blocks the default suite.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");

let puppeteer = null;
try {
  puppeteer = require("puppeteer-core");
} catch {
  // devDependency not installed (or pruned) — the test below skips.
}

// puppeteer-core ships no browser, so point it at a system Chrome. Honor the
// usual overrides first, then the common install locations.
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/opt/google/chrome/chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((p) => p && fs.existsSync(p)) || null;
}

const chromePath = findChrome();
const skip = !puppeteer
  ? "puppeteer-core not installed"
  : !chromePath
    ? "no Chrome binary found (set CHROME_PATH)"
    : false;

test(
  "the unpacked extension loads in Chrome: the service worker registers and GCal is built",
  { skip },
  async () => {
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      // `true` is new headless in puppeteer v23 — the only headless mode that
      // loads MV3 extensions (old headless ignored --load-extension).
      headless: true,
      args: [
        `--disable-extensions-except=${ROOT}`,
        `--load-extension=${ROOT}`,
        "--no-sandbox", // CI runners run as root; Chrome's sandbox needs this off
        "--disable-dev-shm-usage", // CI containers have a tiny /dev/shm
        "--disable-gpu",
      ],
    });
    try {
      // The MV3 background is a service_worker target under chrome-extension://.
      // It only appears once the worker has registered — i.e. once its first
      // importScripts succeeded. If a path is wrong this never fires (timeout).
      const target = await browser.waitForTarget(
        (t) => t.type() === "service_worker" && t.url().endsWith("toolbar-icon.js"),
        { timeout: 15000 }
      );
      const worker = await target.worker();

      assert.equal(
        await worker.evaluate(() => typeof globalThis.GCal?.isSupportedHost),
        "function",
        "importScripts must have run inside the worker and built GCal.isSupportedHost"
      );
      assert.equal(
        await worker.evaluate((u) => GCal.isSupportedHost(u), "https://www.meetup.com/group/events/1/"),
        true,
        "a known supported host must read as supported inside the live worker"
      );
    } finally {
      await browser.close();
    }
  }
);
