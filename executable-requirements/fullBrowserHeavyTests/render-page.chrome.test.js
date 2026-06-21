// Real-Chrome smoke test for the SPA-shell render fallback (data/render-page.js,
// issue #310): a JS single-page-app shell whose content only appears after its
// script runs must come back from renderPage() with that content present.
//
// Self-contained and deterministic: it renders a `data:` URL we author here (no
// network, so the bot-blocked sandbox/runners can't flake it), whose body is an
// empty React-style root that a script fills on a timer — exactly the shape
// data/spa-shell.js flags. The static shell must read as "render me" and the
// rendered HTML must read as "has data", closing the loop the recorder relies on.
//
// CI-only, like extension-load.chrome.test.js: it SKIPS without an
// extension-capable Chrome (CHROME_PATH), since the cloud sandbox can't download
// one. The data: URL is our own trusted content, so it renders --no-sandbox to
// match the proven-working CI Chrome flags; production renders untrusted URLs
// with the sandbox on (see render-page.js).
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const { renderPage } = require("../../data/render-page");
const { shouldRender, hasExtractableData } = require("../../data/spa-shell");

const chromePath = [process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH].find(
  (p) => p && fs.existsSync(p)
);
const skip = !chromePath
  ? "no Chrome given (set CHROME_PATH to a Chrome for Testing binary)"
  : typeof WebSocket === "undefined"
    ? "global WebSocket unavailable (needs Node >= 22)"
    : false;

const MARKER = "RENDERED-EVENT-CONTENT-".repeat(40); // well past the visible-text bar

// An empty React-style root that JS fills shortly after load — a minimal SPA shell.
const SHELL = `<!doctype html><html><head><title>app</title></head><body>` +
  `<div id="root"></div>` +
  `<script>setTimeout(function(){document.getElementById('root').textContent='${MARKER}';},30);</script>` +
  `</body></html>`;
const DATA_URL = "data:text/html;base64," + Buffer.from(SHELL).toString("base64");

test("renderPage runs the page's JS so a SPA shell becomes extractable", { skip }, async () => {
  // Sanity: the static shell is exactly what the detector targets.
  assert.equal(shouldRender(SHELL), true, "the static shell should read as render-me");
  assert.equal(hasExtractableData(SHELL), false, "the static shell has no extractable data");

  const rendered = await renderPage(DATA_URL, {
    noSandbox: true, // our own trusted content; matches the proven CI Chrome flags
    timeoutMs: 20000,
    settleMs: 300,
  });

  assert.match(rendered, new RegExp(MARKER), "the JS-injected content must be in the rendered HTML");
  assert.equal(hasExtractableData(rendered), true, "rendered HTML should now have extractable data");
});

test("renderPage reports NO_CHROME when no binary is available", async () => {
  // Independent of CHROME_PATH: an explicit bad path with the env cleared.
  const saved = { c: process.env.CHROME_PATH, p: process.env.PUPPETEER_EXECUTABLE_PATH };
  delete process.env.CHROME_PATH;
  delete process.env.PUPPETEER_EXECUTABLE_PATH;
  try {
    await assert.rejects(
      () => renderPage("data:text/html,<p>x</p>", { chromePath: "/no/such/chrome" }),
      (err) => err.code === "NO_CHROME"
    );
  } finally {
    if (saved.c) process.env.CHROME_PATH = saved.c;
    if (saved.p) process.env.PUPPETEER_EXECUTABLE_PATH = saved.p;
  }
});
