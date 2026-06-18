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
  "the unpacked extension loads in Chrome: the service worker registers and GCal is built",
  { skip },
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

      // Attach and run code *inside the worker*: it ran end to end iff its
      // install handler registered the declarativeContent icon rules (which means
      // it fetched the host lists and decoded the packaged icons via
      // OffscreenCanvas — the whole startup path).
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
      // The service_worker target can appear before its async install handler has
      // finished registering the rules, so poll rather than racing a single read
      // (then let the assertion report the last value seen).
      const evaluateUntil = async (expression, want, timeoutMs = 10000) => {
        const deadline = Date.now() + timeoutMs;
        let value;
        do {
          value = await evaluate(expression);
          if (value === want) break;
          await new Promise((r) => setTimeout(r, 100));
        } while (Date.now() < deadline);
        return value;
      };

      // The install handler ran end to end iff declarativeContent now holds at
      // least one icon rule (gray for the denylist, green for supported hosts).
      assert.equal(
        await evaluateUntil(
          "new Promise((r) => chrome.declarativeContent.onPageChanged.getRules((rules) => r(rules.length > 0)))",
          true
        ),
        true,
        "the worker's install handler must register declarativeContent icon rules inside the live worker"
      );
    } finally {
      if (cdp) cdp.close();
      proc.kill("SIGKILL");
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  }
);
