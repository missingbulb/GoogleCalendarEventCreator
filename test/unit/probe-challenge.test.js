// Unit tests for the auto-implement-extractor probe's soft-200 detection
// (tools/new-extractors-creation/probe-url.js's detectChallenge). The probe
// fetches a candidate event page before any agent run; a 2xx body that is
// actually a bot-challenge / interstitial would otherwise burn an agent run on
// a page with nothing to extract (StubHub's AWS WAF page, #279). detectChallenge
// is the cheap string/size heuristic that stops those up front. Pure function;
// the network fetch around it isn't exercised here.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  detectChallenge,
  MIN_REAL_PAGE_BYTES,
} = require("../../tools/new-extractors-creation/probe-url");

// A realistic-sized "real page" body so the size backstop doesn't fire when we
// only mean to test marker matching (and vice versa).
const padded = (s) => s + " ".repeat(MIN_REAL_PAGE_BYTES);

test("flags an AWS WAF challenge page (the StubHub case, #279)", () => {
  const waf = padded(
    `<html><head><script src="https://...">window.AwsWafIntegration={};</script></head><body></body></html>`
  );
  const reason = detectChallenge(waf);
  assert.ok(reason, "expected a challenge reason");
  assert.match(reason, /AWS WAF/);
});

test("flags a Cloudflare interstitial", () => {
  const cf = padded(`<html><head><title>Just a moment...</title></head><body>Checking your browser before accessing</body></html>`);
  assert.match(detectChallenge(cf), /Cloudflare/);
});

test("flags a suspiciously small body even with no known marker", () => {
  const tiny = "<html><body>blocked</body></html>";
  assert.ok(tiny.length < MIN_REAL_PAGE_BYTES);
  assert.match(detectChallenge(tiny), /too small/);
});

test("passes a real, sufficiently large event page with no challenge marker", () => {
  const real = padded(
    `<html><head><title>The Mary Wallopers — Edinburgh Corn Exchange</title>` +
      `<script type="application/ld+json">{"@type":"MusicEvent"}</script></head>` +
      `<body><h1>The Mary Wallopers</h1><time datetime="2026-10-13T18:00">Oct 13</time></body></html>`
  );
  assert.equal(detectChallenge(real), null);
});

test("does not throw on non-string input", () => {
  assert.match(detectChallenge(undefined), /too small/);
  assert.match(detectChallenge(null), /too small/);
});
