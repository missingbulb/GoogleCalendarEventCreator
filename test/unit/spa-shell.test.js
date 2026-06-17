// Unit tests for the SPA-shell detector (data/spa-shell.js) — the explicit
// trigger for the headless-render fallback (issue #310). shouldRender must fire
// ONLY on a framework shell with no extractable static data, and must NOT fire
// on a normal page, a content-rich framework page, a generic small/error body,
// or a bot-challenge interstitial. Pure functions; the browser render around
// them isn't exercised here.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  shouldRender,
  isSpaShell,
  hasExtractableData,
  TEXT_THRESHOLD,
} = require("../../data/spa-shell");

// Pad past the visible-text bar with real words (whitespace is collapsed/trimmed).
const lots = (s) => s + " lorem ipsum dolor sit amet".repeat(40);

test("renders an empty Angular shell (the visit.tel-aviv.gov.il / #277 case)", () => {
  const shell =
    `<!doctype html><html ng-app="spApp"><head><title>City Events</title></head>` +
    `<body><app-root></app-root><div ng-view>{{ event.title }}</div></body></html>`;
  assert.equal(isSpaShell(shell), true);
  assert.equal(hasExtractableData(shell), false);
  assert.equal(shouldRender(shell), true);
});

test("renders an empty React root with no static content", () => {
  const shell = `<!doctype html><html><head></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`;
  assert.equal(shouldRender(shell), true);
});

test("does NOT render a fully server-rendered event page (no framework marker)", () => {
  const page = lots(
    `<html><head><title>The Mary Wallopers</title></head><body><h1>The Mary Wallopers</h1>` +
      `<p>Edinburgh Corn Exchange, Oct 13 2026, 7pm. Doors 6pm. Support from ...</p></body></html>`
  );
  assert.equal(isSpaShell(page), false);
  assert.equal(shouldRender(page), false);
});

test("does NOT render a content-rich framework page (marker present, but has text)", () => {
  // A fully-rendered Angular page matches a marker (ng-version) yet has body text,
  // so (A) hasExtractableData is true → no render.
  const page = lots(
    `<html><body ng-version="17.0"><app-root><h1>Summer Gala</h1>` +
      `<p>Join us at the Town Hall on July 4th for an evening of music and food.</p></app-root></body></html>`
  );
  assert.equal(isSpaShell(page), true);
  assert.equal(hasExtractableData(page), true);
  assert.equal(shouldRender(page), false);
});

test("does NOT render a shell that already carries JSON-LD", () => {
  const page =
    `<html><body><div id="root"></div>` +
    `<script type="application/ld+json">{"@type":"Event","name":"Gala"}</script></body></html>`;
  assert.equal(isSpaShell(page), true);
  assert.equal(hasExtractableData(page), true);
  assert.equal(shouldRender(page), false);
});

test("does NOT render a shell that already carries an og:title", () => {
  const page = `<html><head><meta property="og:title" content="Summer Gala 2026"></head><body><div id="app"></div></body></html>`;
  assert.equal(hasExtractableData(page), true);
  assert.equal(shouldRender(page), false);
});

test("does NOT render a generic small/error body (no framework marker)", () => {
  const body = "<html><body>Something went wrong.</body></html>";
  assert.equal(isSpaShell(body), false);
  assert.equal(shouldRender(body), false);
});

test("does NOT render a bot-challenge interstitial (no framework marker)", () => {
  // Excluded for free: a challenge page carries no framework-root marker.
  const cf = `<html><head><title>Just a moment...</title></head><body>Checking your browser before accessing</body></html>`;
  assert.equal(isSpaShell(cf), false);
  assert.equal(shouldRender(cf), false);
});

test("a non-empty React root (data-reactroot, hydrated) still needs text to count as data", () => {
  // Marker present; whether it renders hinges on extractable data, not the marker.
  const hydrated = lots(`<div data-reactroot><h1>Festival</h1><p>All weekend long downtown.</p></div>`);
  assert.equal(isSpaShell(hydrated), true);
  assert.equal(shouldRender(hydrated), false);
});

test("does not throw on non-string input", () => {
  assert.equal(shouldRender(undefined), false);
  assert.equal(shouldRender(null), false);
  assert.equal(hasExtractableData(undefined), false);
  assert.equal(isSpaShell(null), false);
});
