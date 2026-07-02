// Tests for scraperapi_fetch (dev/create-extractor/scraperapi-fetch.sh) — our single
// ScraperAPI page fetch and the home of its API-specific handling.
//
// Retry policy under test (the deliberate #279/#587 rule): retry on FAILURE, never
// on a 200.
//   - a transport/HTTP failure (non-2xx) escalates the proxy tier: standard →
//     premium → ultra_premium, failing red only when the top tier is exhausted (the
//     seatgeek.com #281 ladder);
//   - a 200 is FINAL: real HTML is kept; a non-HTML body (ScraperAPI's render=true
//     can return the SPA's rendered TEXT with zero markup — #279 stubhub) is a bad
//     render we FAIL on, never re-fetching or escalating a 200.
//   - #603: an optional wait_for_selector arg is url-encoded into the request.
//
// scraperapi_fetch is bash, so we drive scraperapi-fetch.sh directly with a FAKE curl
// on PATH (real jq stays available — PATH is prepended, not replaced). The fake reads
// the tier off the ScraperAPI URL, logs each call (and the full URL), and per
// FAKE_CURL_SPEC returns one of: html (a real page), text (plaintext, no markup), or
// a 22 failure.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "..", "scraperapi-fetch.sh");

// A curl stand-in: finds the -o target and the ScraperAPI URL, derives the tier,
// logs the tier and the URL, then emits a body per the tier's entry in
// $FAKE_CURL_SPEC (e.g. "standard:text,premium:html").
const FAKE_CURL = `#!/usr/bin/env bash
out=""; url=""
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2;;
    https://api.scraperapi.com/*) url="$1"; shift;;
    *) shift;;
  esac
done
tier=standard
case "$url" in
  *ultra_premium=true*) tier=ultra_premium;;
  *premium=true*) tier=premium;;
esac
echo "$tier" >> "$FAKE_CURL_LOG"
[ -n "\${FAKE_CURL_URLLOG:-}" ] && echo "$url" >> "$FAKE_CURL_URLLOG"
outcome=fail
IFS=',' read -ra pairs <<< "$FAKE_CURL_SPEC"
for p in "\${pairs[@]}"; do
  [ "\${p%%:*}" = "$tier" ] && outcome="\${p#*:}"
done
case "$outcome" in
  html) printf '<!doctype html><html><body><h1>Event</h1></body></html>' > "$out"; exit 0;;
  text) printf 'Buy tickets\\nShlomo Artzi\\n8:30 PM Tel Aviv, Israel' > "$out"; exit 0;;
  *)    exit 22;;
esac
`;

function runFetch(spec, waitSelector) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scraperapi-fetch-"));
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "curl"), FAKE_CURL, { mode: 0o755 });
  const log = path.join(dir, "curl.log");
  const urlLog = path.join(dir, "curl-urls.log");
  const out = path.join(dir, "page.html");
  const args = [SCRIPT, "https://www.stubhub.com/shlomo-artzi/event/1", out];
  if (waitSelector !== undefined) args.push(waitSelector);
  const res = spawnSync("bash", args, {
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      SCRAPER_API_KEY: "test-key",
      FAKE_CURL_SPEC: spec,
      FAKE_CURL_LOG: log,
      FAKE_CURL_URLLOG: urlLog,
    },
    encoding: "utf8",
  });
  const tiers = fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean) : [];
  const urls = fs.existsSync(urlLog) ? fs.readFileSync(urlLog, "utf8").trim().split("\n").filter(Boolean) : [];
  const body = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
  return { status: res.status, stderr: res.stderr, tiers, urls, body };
}

test("real HTML at the standard tier is kept without escalating", () => {
  const r = runFetch("standard:html");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.tiers, ["standard"]); // no needless credit spend
  assert.match(r.body, /<html/i);
});

test("a non-2xx failure escalates the proxy tier and retries", () => {
  const r = runFetch("standard:fail,premium:html");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.tiers, ["standard", "premium"]);
  assert.match(r.body, /<html/i);
});

test("a failure at every tier (incl. ultra_premium) is a hard failure", () => {
  const r = runFetch("standard:fail,premium:fail,ultra_premium:fail");
  assert.notEqual(r.status, 0);
  assert.deepEqual(r.tiers, ["standard", "premium", "ultra_premium"]);
});

// The #279/#587 rule: a 200 is final. Bad HTML fails; we do NOT re-fetch or escalate.
test("a non-HTML 200 FAILS without re-fetching or escalating", () => {
  const r = runFetch("standard:text,premium:html"); // premium would succeed, but we never reach it
  assert.notEqual(r.status, 0); // bad render => fail
  assert.deepEqual(r.tiers, ["standard"]); // one call only — no escalation on a 200
});

// #603: an optional wait_for_selector arg is url-encoded into the ScraperAPI query.
test("a wait selector is url-encoded into the ScraperAPI request", () => {
  const r = runFetch("standard:html", "#eventDescription");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.urls[0], /wait_for_selector=%23eventDescription/); // '#' -> %23
  assert.match(r.urls[0], /render=true/); // still rendering
});

test("no wait selector omits the param entirely", () => {
  const r = runFetch("standard:html");
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.urls[0], /wait_for_selector/);
});

test("an empty wait selector omits the param (blank form field)", () => {
  const r = runFetch("standard:html", "");
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.urls[0], /wait_for_selector/);
});
