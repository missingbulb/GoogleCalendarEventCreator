// CI-only render fallback for the SPA-shell class (issue #310). Loads a URL in a
// real *headless* Chrome over the DevTools Protocol (zero npm deps — the same
// machinery as dev/requirements/fullBrowserHeavyTests/extension-load.chrome.test.js, sharing
// dev/requirements/infra/data/cdp-client.js) and returns the post-JS rendered HTML, so a JS
// single-page-app shell becomes extractable like a normal page. Only
// dev/requirements/infra/data/refresh-cache.js calls it, and only when dev/requirements/infra/data/spa-shell.js says the plain
// fetch returned a data-less framework shell.
//
// SECURITY — this executes untrusted, user-supplied page JavaScript (the event
// URL comes from a requester via the popup / issue form). Unlike the e2e test,
// which loads *our own* extension and so can use --no-sandbox, this loads
// arbitrary third-party URLs, so it is hardened differently:
//   * the Chrome sandbox stays ON by default; set RENDER_NO_SANDBOX=1 only where
//     the runner genuinely can't support it, consciously accepting the ephemeral
//     disposable CI runner as the isolation boundary;
//   * NO extension is loaded, and a fresh throwaway --user-data-dir is used per
//     render, so cookies / localStorage / service workers can't carry between
//     pages;
//   * a hard timeout + SIGKILL bounds a malicious or runaway page;
//   * keep workflow secrets out of this step's environment (a page can't read
//     process env, but don't hand the browser anything it doesn't need).
//
// It needs a Chrome binary via CHROME_PATH (the cloud sandbox is bot-blocked and
// can't even download Chrome for Testing — see dev/procedures/technicalGotchas.md), so a
// caller must treat a NO_CHROME error as "skip rendering", not a failure.
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { connectCDP } = require("./cdp-client");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function resolveChromePath(explicit) {
  return [explicit, process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH].find(
    (p) => p && fs.existsSync(p)
  );
}

// Launch headless Chrome and resolve its DevTools WebSocket endpoint (printed to
// stderr for --remote-debugging-port=0). Mirrors the e2e test's launcher, but
// headless (no xvfb), with no extension, and the sandbox left ON unless asked.
function launchChrome(chromePath, { userDataDir, noSandbox, timeoutMs }) {
  const args = [
    "--headless=new",
    `--user-data-dir=${userDataDir}`,
    "--remote-debugging-port=0",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-dev-shm-usage", // CI containers have a tiny /dev/shm
    "--disable-gpu",
    "about:blank",
  ];
  // Sandbox stays on for untrusted content; opt out only where the runner can't.
  if (noSandbox) args.unshift("--no-sandbox");

  const proc = spawn(chromePath, args, { stdio: ["ignore", "ignore", "pipe"] });
  const endpoint = new Promise((resolve, reject) => {
    let out = "";
    const onData = (chunk) => {
      out += chunk;
      const m = out.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) finish(() => resolve(m[1]));
    };
    const onExit = (code) =>
      finish(() => reject(new Error(`Chrome exited early (code ${code}).\n${out}`)));
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

// Render `url` in headless Chrome and return the post-JS HTML. Options:
//   chromePath  — Chrome binary (defaults to CHROME_PATH / PUPPETEER_EXECUTABLE_PATH)
//   timeoutMs   — overall cap on navigation+idle (default 30s)
//   settleMs    — extra wait after network-idle before dumping (default 1.5s)
//   noSandbox   — disable Chrome's sandbox (default from RENDER_NO_SANDBOX=1)
// Throws an error with code "NO_CHROME" when no Chrome binary is available, so
// callers can skip rather than fail.
async function renderPage(url, opts = {}) {
  const chromePath = resolveChromePath(opts.chromePath);
  if (!chromePath) {
    const err = new Error("no Chrome binary available (set CHROME_PATH)");
    err.code = "NO_CHROME";
    throw err;
  }
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const settleMs = opts.settleMs ?? 1_500;
  const noSandbox = opts.noSandbox ?? process.env.RENDER_NO_SANDBOX === "1";

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gcal-render-"));
  const { proc, endpoint } = launchChrome(chromePath, { userDataDir, noSandbox, timeoutMs });
  let cdp;
  try {
    cdp = connectCDP(await endpoint);
    await cdp.ready;

    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Page.setLifecycleEventsEnabled", { enabled: true }, sessionId);

    // Resolve as soon as the page reports network-idle for this session; the
    // outer Promise.race caps the wait so a page that never idles can't wedge us.
    const idle = new Promise((resolve) => {
      const onMsg = (msg) => {
        if (
          msg.method === "Page.lifecycleEvent" &&
          msg.sessionId === sessionId &&
          msg.params.name === "networkIdle"
        ) {
          cdp.off(onMsg);
          resolve();
        }
      };
      cdp.on(onMsg);
    });

    await cdp.send("Page.navigate", { url }, sessionId);
    await Promise.race([idle, delay(timeoutMs)]);
    await delay(settleMs); // let post-idle microtasks paint

    const { result, exceptionDetails } = await cdp.send(
      "Runtime.evaluate",
      { expression: "document.documentElement.outerHTML", returnByValue: true },
      sessionId
    );
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    }
    return result.value;
  } finally {
    if (cdp) cdp.close();
    proc.kill("SIGKILL");
    // SIGKILL doesn't wait for Chrome to exit and release the profile dir, so an
    // immediate removal can race the still-open files and throw ENOTEMPTY; rmSync's
    // built-in EBUSY/ENOTEMPTY/EPERM backoff retries until the kill lands (#358).
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

module.exports = { renderPage, resolveChromePath };
