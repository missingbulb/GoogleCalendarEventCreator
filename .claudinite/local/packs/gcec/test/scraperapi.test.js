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
