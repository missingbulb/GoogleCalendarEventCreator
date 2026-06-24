// Unit tests for the ScraperAPI request-building in fetch-page.js. The network
// fetch/retry loop isn't exercised here (it needs a live endpoint); what we pin
// is the pure decision fetchPage delegates to: with SCRAPER_API_KEY set, route
// the target URL through ScraperAPI's residential-proxy endpoint; with no key,
// fetch directly. That branch is the whole point of the integration, so it gets a
// test that can't depend on the network.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { scraperApiUrl } = require("./fetch-page");

// scraperApiUrl reads process.env, so save/restore around each case.
function withKey(value, fn) {
  const had = Object.prototype.hasOwnProperty.call(process.env, "SCRAPER_API_KEY");
  const prev = process.env.SCRAPER_API_KEY;
  if (value === undefined) delete process.env.SCRAPER_API_KEY;
  else process.env.SCRAPER_API_KEY = value;
  try {
    fn();
  } finally {
    if (had) process.env.SCRAPER_API_KEY = prev;
    else delete process.env.SCRAPER_API_KEY;
  }
}

test("no key → null (direct fetch, the unchanged local/offline path)", () => {
  withKey(undefined, () => {
    assert.equal(scraperApiUrl("https://example.com/event"), null);
  });
});

test("empty key → null (an unset secret in CI must not proxy to a keyless endpoint)", () => {
  withKey("", () => {
    assert.equal(scraperApiUrl("https://example.com/event"), null);
  });
});

test("key set → routes through api.scraperapi.com with the key", () => {
  withKey("SECRET123", () => {
    const out = scraperApiUrl("https://example.com/event");
    const u = new URL(out);
    assert.equal(u.origin, "https://api.scraperapi.com");
    assert.equal(u.searchParams.get("api_key"), "SECRET123");
    assert.equal(u.searchParams.get("url"), "https://example.com/event");
    // render=true: ScraperAPI executes the page's JS, so a JS single-page-app
    // records with real data — this is why we carry no SPA-render code.
    assert.equal(u.searchParams.get("render"), "true");
  });
});

test("the target URL's own query string survives (nested-encoded, not flattened)", () => {
  withKey("k", () => {
    const target = "https://example.com/p?a=1&b=two words";
    const raw = scraperApiUrl(target);
    // URL parsing must hand back the exact original target, query and spaces intact.
    assert.equal(new URL(raw).searchParams.get("url"), target);
    // And the target's own `&` must be percent-encoded in the raw string, so
    // ScraperAPI sees one `url` param rather than `a`/`b` leaking up as siblings.
    const tail = raw.slice(raw.indexOf("url=") + 4);
    assert.ok(!tail.includes("&"), "target query separators must be encoded");
  });
});
