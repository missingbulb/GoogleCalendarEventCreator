// Real-Chrome smoke test: load the unpacked extension and confirm its MV3
// service worker actually registers and runs — the one layer that exercises
// Chrome's *real* extension loader (the layer that broke in #146). The
// deterministic Node-level equivalent is test/extension/extension-loads.test.js.
//
// Zero dependencies: it drives Chrome straight over the DevTools Protocol using
// Node's built-in WebSocket + child_process (no puppeteer). It needs a Chrome
// that still honours --load-extension — branded Chrome 137+ dropped it, so CI
// uses Chrome for Testing (installed in .github/workflows/test.yml). MV3
// extensions only load HEADFUL, so CI runs it under xvfb. The test SKIPS when no
// such Chrome is given (e.g. the offline dev sandbox), so it never blocks the
// default suite. Point it at a binary with CHROME_PATH.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
// The DevTools Protocol client is shared with data/render-page.js (issue #310);
// Node has shipped a global WebSocket since v22 (global fetch since v18).
const { connectCDP } = require("../../data/cdp-client");

const ROOT = path.join(__dirname, "..", "..");

const chromePath = [process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH].find(
  (p) => p && fs.existsSync(p)
);
const skip = !chromePath
  ? "no extension-capable Chrome given (set CHROME_PATH to a Chrome for Testing binary)"
  : typeof WebSocket === "undefined"
    ? "global WebSocket unavailable (needs Node >= 22)"
    : false;

// Launch Chrome with the unpacked extension and resolve its DevTools WebSocket
// endpoint (printed to stderr for --remote-debugging-port=0).
function launchChrome(userDataDir, timeoutMs) {
  const proc = spawn(
    chromePath,
    [
      `--user-data-dir=${userDataDir}`,
      "--remote-debugging-port=0",
      `--disable-extensions-except=${ROOT}`,
      `--load-extension=${ROOT}`,
      // Branded Chrome 137+ gates --load-extension behind this feature; a no-op
      // on Chrome for Testing and older Chrome.
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-sandbox", // CI runs as root; Chrome's sandbox needs this off
      "--disable-dev-shm-usage", // CI containers have a tiny /dev/shm
      "--disable-gpu",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  const endpoint = new Promise((resolve, reject) => {
    let out = "";
    const onData = (chunk) => {
      out += chunk;
      const m = out.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) finish(() => resolve(m[1]));
    };
    const onExit = (code) => finish(() => reject(new Error(`Chrome exited early (code ${code}).\n${out}`)));
    const timer = setTimeout(
      () => finish(() => reject(new Error(`timed out waiting for the DevTools endpoint.\n${out}`))),
      timeoutMs
    );
    function finish(settle) {
      clearTimeout(timer);
      proc.stderr.off("data", onData);
      proc.off("exit", onExit);
      settle();
    }
    proc.stderr.on("data", onData);
    proc.on("exit", onExit);
  });
  return { proc, endpoint };
}

test(
  "the unpacked extension loads in Chrome: the service worker registers its declarativeContent icon rules",
  // A hard cap so a CI-only hang (e.g. an unsettled CDP await) fails fast with
  // this test's own diagnostics instead of burning the whole job's timeout.
  { skip, timeout: 120000 },
  async () => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gcal-e2e-"));
    const { proc, endpoint } = launchChrome(userDataDir, 30000);
    let cdp;
    try {
      cdp = connectCDP(await endpoint);
      await cdp.ready;

      // Find the extension's MV3 background as a service_worker target. It only
      // appears once the worker has registered. Opening a page (createTarget
      // below) wakes the lazy worker; its install handler then registers the
      // declarativeContent icon rules. Collect every target for a useful failure
      // message.
      const seen = [];
      let onWorker;
      const swTargetId = new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`service_worker (…/toolbar-icon.js) never appeared.\nTargets seen:\n${seen.join("\n") || "  (none)"}`)),
          30000
        );
        onWorker = (msg) => {
          if (msg.method !== "Target.targetCreated") return;
          const t = msg.params.targetInfo;
          seen.push(`  ${t.type}  ${t.url}`);
          if (t.type === "service_worker" && t.url.endsWith("toolbar-icon.js")) {
            clearTimeout(timer);
            resolve(t.targetId);
          }
        };
      });
      cdp.on(onWorker);
      await cdp.send("Target.setDiscoverTargets", { discover: true });
      await cdp.send("Target.createTarget", { url: "about:blank" }); // wake the worker
      const targetId = await swTargetId;

      // Attach and run code *inside the worker*: drive its real startup path
      // (installRules: fetch the host lists, decode the packaged icons via
      // OffscreenCanvas, register the declarativeContent rules) and confirm the
      // rules landed. Calling installRules() directly — rather than racing
      // whichever moment onInstalled/onStartup happens to wake the worker — keeps
      // this deterministic; onInstalled just calls the same function.
      const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
      const evaluate = async (expression) => {
        const { result, exceptionDetails } = await cdp.send(
          "Runtime.evaluate",
          { expression, returnByValue: true, awaitPromise: true },
          sessionId
        );
        if (exceptionDetails) {
          throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
        }
        return result.value;
      };

      // The probe always settles (every await is bounded by a timeout) and
      // returns a diagnostic string, so a CI-only failure reports the observed
      // state instead of hanging the job — see docs/engineeringPractices.md.
      const probe = `(async () => {
        const withTimeout = (p, ms, tag) =>
          Promise.race([Promise.resolve(p), new Promise((r) => setTimeout(() => r(tag), ms))]);
        try {
          if (typeof installRules !== "function") return "no-installRules-fn";
          await withTimeout(installRules(), 8000, "installRules-timeout");
          return await withTimeout(
            new Promise((resolve) =>
              chrome.declarativeContent.onPageChanged.getRules((rules) =>
                resolve("rules:" + (Array.isArray(rules) ? rules.length : "none"))
              )
            ),
            4000,
            "getRules-timeout"
          );
        } catch (e) {
          return "error:" + (e && e.message ? e.message : e);
        }
      })()`;

      // The worker ran its startup path end to end iff declarativeContent now
      // holds at least one icon rule (gray for the denylist, green for supported
      // hosts). "rules:0" / a timeout / an error all fail with the observed value.
      const result = await evaluate(probe);
      assert.match(
        result,
        /^rules:[1-9]/,
        `the worker's installRules() must register declarativeContent icon rules inside the live worker (probe returned "${result}")`
      );
    } finally {
      if (cdp) cdp.close();
      proc.kill("SIGKILL");
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  }
);
