// Unit tests for the SPA-shell detector (data/spa-shell.js) — the explicit
// trigger for the headless-render fallback (issues #310, #328). Two predicates:
//   shouldRender (TRIGGER) fires ONLY on a framework shell with no machine
//     start date (a <time datetime> or JSON-LD startDate) — NOT on og:title or
//     boilerplate text, which a data-less shell can still carry (#328 / #277).
//   hasExtractableData (KEEP) is the content check refresh-cache.js uses to
//     decide a render was worth keeping; og:title / JSON-LD / text all count.
// Pure functions; the browser render around them isn't exercised here.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  shouldRender,
  isSpaShell,
  hasEventData,
  hasExtractableData,
} = require("../../data/spa-shell");

// Pad past the visible-text bar with real words (whitespace is collapsed/trimmed).
const lots = (s) => s + " lorem ipsum dolor sit amet".repeat(40);

// ---- shouldRender: the render TRIGGER (framework shell, no machine date) ----

test("renders an empty Angular shell (the visit.tel-aviv.gov.il / #277 case)", () => {
  const shell =
    `<!doctype html><html ng-app="spApp"><head><title>City Events</title></head>` +
    `<body><app-root></app-root><div ng-view>{{ event.title }}</div></body></html>`;
  assert.equal(isSpaShell(shell), true);
  assert.equal(hasEventData(shell), false);
  assert.equal(shouldRender(shell), true);
});

test("#328 regression: renders a shell with og:title + lots of chrome text but NO date", () => {
  // The shape that defeated the old gate: a framework shell carrying an og:title
  // (the event NAME) and kilobytes of nav/footer chrome, but no start date.
  const shell = lots(
    `<!doctype html><html ng-app="spApp"><head>` +
      `<meta property="og:title" content="Savta Stories at the City Museum">` +
      `</head><body>Home Info About Areas beach Jaffa nightlife LGBTQ Transit ` +
      `<app-root></app-root><div ng-bind="event.OpeningTime"></div></body></html>`
  );
  assert.equal(isSpaShell(shell), true);
  assert.equal(hasEventData(shell), false, "no machine start date present");
  assert.equal(hasExtractableData(shell), true, "og:title + text => 'has content' for KEEP");
  assert.equal(shouldRender(shell), true, "but the TRIGGER must still fire");
});

test("renders an empty React root with no static content", () => {
  const shell = `<!doctype html><html><head></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`;
  assert.equal(shouldRender(shell), true);
});

test("does NOT render once a <time datetime> machine date is present", () => {
  const page =
    `<html><body ng-version="17.0"><app-root><h1>Summer Gala</h1>` +
    `<time datetime="2026-07-04T19:00">July 4th</time></app-root></body></html>`;
  assert.equal(isSpaShell(page), true);
  assert.equal(hasEventData(page), true);
  assert.equal(shouldRender(page), false);
});

test("does NOT render a shell that already carries JSON-LD with a startDate", () => {
  const page =
    `<html><body><div id="root"></div>` +
    `<script type="application/ld+json">{"@type":"Event","name":"Gala","startDate":"2026-09-01T18:00"}</script></body></html>`;
  assert.equal(isSpaShell(page), true);
  assert.equal(hasEventData(page), true);
  assert.equal(shouldRender(page), false);
});

test("does NOT render a fully server-rendered event page (no framework marker)", () => {
  const page = lots(
    `<html><head><title>The Mary Wallopers</title></head><body><h1>The Mary Wallopers</h1>` +
      `<p>Edinburgh Corn Exchange. Doors 6pm.</p></body></html>`
  );
  assert.equal(isSpaShell(page), false);
  assert.equal(shouldRender(page), false);
});

test("does NOT render a generic small/error body (no framework marker)", () => {
  const body = "<html><body>Something went wrong.</body></html>";
  assert.equal(isSpaShell(body), false);
  assert.equal(shouldRender(body), false);
});

test("does NOT render a bot-challenge interstitial (no framework marker)", () => {
  const cf = `<html><head><title>Just a moment...</title></head><body>Checking your browser before accessing</body></html>`;
  assert.equal(isSpaShell(cf), false);
  assert.equal(shouldRender(cf), false);
});

// ---- hasEventData: only a machine-readable start date counts ----

test("hasEventData is true only for a machine start date, not a name or prose", () => {
  assert.equal(hasEventData(`<meta property="og:title" content="Gala 2026">`), false);
  assert.equal(hasEventData(`<p>Join us on July 4th, 2026 downtown!</p>`), false, "prose date is not machine-readable");
  assert.equal(hasEventData(`<time datetime="2026-07-04">Jul 4</time>`), true);
  assert.equal(hasEventData(`{"startDate":"2026-07-04T19:00:00"}`), true);
});

// ---- hasExtractableData: the KEEP check (unchanged behaviour) ----

test("hasExtractableData (KEEP) still counts og:title, JSON-LD, or substantial text", () => {
  assert.equal(hasExtractableData(`<meta property="og:title" content="Gala">`), true);
  assert.equal(hasExtractableData(lots(`<p>plenty of rendered words here</p>`)), true);
  assert.equal(hasExtractableData(`<html><body><div id="root"></div></body></html>`), false);
});

test("does not throw on non-string input", () => {
  assert.equal(shouldRender(undefined), false);
  assert.equal(shouldRender(null), false);
  assert.equal(hasEventData(undefined), false);
  assert.equal(hasExtractableData(undefined), false);
  assert.equal(isSpaShell(null), false);
});
