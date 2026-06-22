// Behavior contract for the popup's CLICK actions — the leaf requirements that a
// UI snapshot structurally cannot verify (3.4, 9.1, 9.2, 9.3): clicking a card,
// a grouped instance button, or an affordance link OPENS the right URL in an
// ADJACENT new tab and CLOSES the popup. A PNG has no pixels for "a tab opened",
// so these leaves declare `kind: "behavior"` in their case and are routed here
// instead of onto a snapshot image (dev/procedures/engineeringPractices.md, issue #429).
//
// =====================================================================
// !!!  INCOMPLETE VERIFICATION — READ BEFORE TRUSTING THIS TEST  !!!
// ---------------------------------------------------------------------
// This test STUBS the exact boundary the behavior crosses: it replaces
// `chrome.tabs.create` and `window.close` with spies and asserts they were
// called with the right arguments. Per dev/procedures/engineeringPractices.md ("a test
// that stubs the exact boundary where the bug lives can't catch that bug"), this
// CANNOT confirm that a REAL Chrome actually opens the tab, places it adjacent,
// or tears the popup down — only that our code asked it to. A faithful (non-stub)
// verification of these leaves is still owed; the approach is TBD by the repo
// owner — see the UI-testing tracking issue referenced in dev/procedures/claude/testing.md.
// Until then, 3.4/9.1/9.2/9.3 are only PARTIALLY verified.
// =====================================================================
"use strict";

const { test, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { JSDOM } = require("jsdom");
const { loadCases, leafIdOf } = require("../shared/cases");
const { REFERENCE_YEAR } = require("../shared/reference-time");

const ROOT = path.join(__dirname, "..", "..", "..");
const TAB = { url: "https://example.com/events", title: "Example event page", index: 3 };
// Render cards against the pinned reference year (not the real clock), so a card's
// year-pill decision is deterministic forever — same fixed "now" the snapshots use.

let renderCard, toCards, makeSourceRequestLink, makePolicyLink;
let created; // captured chrome.tabs.create() calls
let closed; // window.close() call count

before(async () => {
  // renderCard/the link builders build DOM into the global `document` and call
  // the global `chrome`/`window` — install a jsdom world before importing.
  const dom = new JSDOM("<!doctype html><body></body>", { url: TAB.url });
  global.document = dom.window.document;
  global.window = dom.window;
  // Spy the two boundary calls. create() is async in the code under test, so it
  // returns a resolved promise; window.close() runs after it awaits.
  global.chrome = {
    tabs: {
      create: async (opts) => {
        created.push(opts);
      },
    },
  };
  dom.window.close = () => {
    closed += 1;
  };

  ({ renderCard, toCards } = await import(
    pathToFileURL(path.join(ROOT, "extension", "events-popup", "events-view.js"))
  ));
  ({ makeSourceRequestLink, makePolicyLink } = await import(
    pathToFileURL(path.join(ROOT, "extension", "events-popup", "source-request-view.js"))
  ));
});

beforeEach(() => {
  created = [];
  closed = 0;
});

// Dispatch a real click and let the async openTemplate/handler settle.
async function click(el) {
  el.dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// 9.1 + 9.3: clicking a single card opens its template in an adjacent new tab,
// then closes the popup.
test("9.1/9.3: clicking a single card opens its template in an adjacent tab and closes the popup", async () => {
  const [card] = toCards([{ title: "Solo Show", start: "2026-06-19T19:00:00", location: "The Venue" }]);
  const el = renderCard(card, TAB, REFERENCE_YEAR);
  await click(el);

  assert.equal(created.length, 1, "expected exactly one tab opened");
  assert.match(created[0].url, /calendar\.google\.com/, "opens the Google Calendar template");
  assert.equal(created[0].index, TAB.index + 1, "the new tab is adjacent to the current one (index+1)");
  assert.equal(closed, 1, "the popup closes after opening the tab");
});

// 9.2: a grouped (month) card's individual instance button opens THAT showing's
// template — and still adjacent + closing (9.3).
test("9.2/9.3: clicking a grouped card's instance button opens that showing's template adjacently and closes", async () => {
  const [card] = toCards([
    {
      title: "Festival",
      location: "Main Stage",
      times: [
        { start: "2026-07-03T20:00:00" },
        { start: "2026-07-05T18:00:00" },
      ],
    },
  ]);
  assert.equal(card.kind, "month", "two showings in one month form a grouped card");
  const el = renderCard(card, TAB, REFERENCE_YEAR);
  const buttons = el.querySelectorAll("button.chip-btn");
  assert.equal(buttons.length, 2, "one button per showing");

  await click(buttons[1]);
  assert.equal(created.length, 1, "exactly one tab opened for the clicked showing");
  assert.match(created[0].url, /calendar\.google\.com/);
  assert.equal(created[0].index, TAB.index + 1, "adjacent tab");
  assert.equal(closed, 1, "popup closes");
});

// 3.4: each affordance link (Suggest Correction / Disagree?) opens its target in
// an adjacent new tab and closes the popup — and suppresses the default <a> nav.
for (const [label, build] of [
  ["Suggest Correction", () => makeSourceRequestLink(TAB, { title: "X", start: "2026-06-19T19:00:00" }, 1)],
  ["Disagree?", () => makePolicyLink(TAB)],
]) {
  test(`3.4: the "${label}" link opens an adjacent new tab, closes the popup, and suppresses navigation`, async () => {
    const link = build();
    let defaultPrevented = false;
    link.addEventListener("click", (e) => (defaultPrevented = e.defaultPrevented));
    await click(link);

    assert.equal(created.length, 1, "one tab opened");
    assert.equal(created[0].index, TAB.index + 1, "adjacent tab");
    assert.equal(closed, 1, "popup closes");
    assert.equal(defaultPrevented, true, "the <a>'s default navigation is suppressed");
  });
}

// Guard the routing itself: this test must exercise exactly the leaves whose case
// declares `kind: "behavior"` — no more (a stale `kind`), no fewer (a behavior leaf
// the gate routes here but that this test forgot). The behavior cases are the
// single source of truth for which leaves are behavioral.
test("covers exactly the leaves whose case declares kind:\"behavior\"", () => {
  const behaviorLeaves = loadCases()
    .filter((c) => c.kind === "behavior")
    .map((c) => leafIdOf(c.name))
    .sort();
  assert.deepEqual(
    behaviorLeaves,
    ["3.4", "9.1", "9.2", "9.3"],
    "the kind:\"behavior\" cases drifted from what this test actually verifies"
  );
});
