// The project's one page-fetching surface (scraperapi.mjs). Only the URL builder is
// tested: it decides what a paid, secret-spending request actually asks for, and a
// mis-encoded target would silently fetch the wrong page (or leak the URL's own
// query into ScraperAPI's params).
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../scraperapi.mjs");

test("scraperUrl: renders the page and url-encodes the target so its query can't leak", async () => {
  const { scraperUrl } = await load();
  const u = new URL(scraperUrl("KEY", "https://site.example/e?a=1&b=2"));
  assert.equal(u.origin + u.pathname, "https://api.scraperapi.com/");
  assert.equal(u.searchParams.get("api_key"), "KEY");
  assert.equal(u.searchParams.get("render"), "true");   // an SPA records real content, not an empty shell
  assert.equal(u.searchParams.get("url"), "https://site.example/e?a=1&b=2");
  assert.equal(u.searchParams.get("wait_for_selector"), null);
});

test("scraperUrl: a wait-for selector rides along, encoded", async () => {
  const { scraperUrl } = await load();
  const u = new URL(scraperUrl("KEY", "https://site.example/e", "div.event > h1"));
  assert.equal(u.searchParams.get("wait_for_selector"), "div.event > h1");
});

test("scraperUrl: a blank selector is omitted rather than sent empty", async () => {
  const { scraperUrl } = await load();
  assert.equal(new URL(scraperUrl("KEY", "https://site.example/e", "")).searchParams.get("wait_for_selector"), null);
});

// --- retry (the regression #759 caught) ---------------------------------------
// The retired fetch-page.yml fetched with `curl --retry 5`, which covers exactly
// 408/429/500/502/503/504. Porting to fetch() dropped that, and the first real
// request through the new pipeline died on one transient 500. These pin the
// behaviour back down.

const withFetch = async (impl, fn) => {
  const real = globalThis.fetch;
  globalThis.fetch = impl;
  try { return await fn(); } finally { globalThis.fetch = real; }
};
const ok = (body) => ({ ok: true, status: 200, text: async () => body });
const status = (code) => ({ ok: false, status: code, text: async () => "" });
const outPath = () => require("node:path").join(
  require("node:fs").mkdtempSync(require("node:path").join(require("node:os").tmpdir(), "gcec-scraper-")), "page.html");

test("recordPage: a transient 500 is retried and the recovered page is written", async () => {
  const { recordPage } = await load();
  let calls = 0;
  const bytes = await withFetch(async () => { calls += 1; return calls < 3 ? status(500) : ok("<html>real</html>"); },
    () => recordPage("KEY", { url: "https://site.example/e" }, outPath(), { attempts: 4, backoffMs: 0 }));
  assert.equal(calls, 3);
  assert.ok(bytes > 0);
});

test("recordPage: a 4xx is NOT retried — it is about the request, and never improves", async () => {
  const { recordPage } = await load();
  let calls = 0;
  await assert.rejects(
    withFetch(async () => { calls += 1; return status(404); },
      () => recordPage("KEY", { url: "https://site.example/e" }, outPath(), { attempts: 4, backoffMs: 0 })),
    /HTTP 404/,
  );
  assert.equal(calls, 1);
});

test("recordPage: exhausting the retries reports that it did not recover, not that the page is bad", async () => {
  const { recordPage } = await load();
  let calls = 0;
  await assert.rejects(
    withFetch(async () => { calls += 1; return status(500); },
      () => recordPage("KEY", { url: "https://site.example/e" }, outPath(), { attempts: 3, backoffMs: 0 })),
    /HTTP 500 .*did not recover in 3 attempts/,
  );
  assert.equal(calls, 3);
});

test("recordPage: a network error is retried too (a timeout is not a verdict on the page)", async () => {
  const { recordPage } = await load();
  let calls = 0;
  const bytes = await withFetch(async () => {
    calls += 1;
    if (calls === 1) throw new Error("The operation was aborted due to timeout");
    return ok("<html>real</html>");
  }, () => recordPage("KEY", { url: "https://site.example/e" }, outPath(), { attempts: 3, backoffMs: 0 }));
  assert.equal(calls, 2);
  assert.ok(bytes > 0);
});

test("recordPage: a successful-but-empty body is a verdict on the page — no retry", async () => {
  const { recordPage } = await load();
  let calls = 0;
  await assert.rejects(
    withFetch(async () => { calls += 1; return ok("   "); },
      () => recordPage("KEY", { url: "https://site.example/e" }, outPath(), { attempts: 4, backoffMs: 0 })),
    /empty document/,
  );
  assert.equal(calls, 1);
});
