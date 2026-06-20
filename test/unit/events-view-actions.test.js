// Behavior contract for the popup's CLICK actions — the leaf requirements that a
// UI snapshot structurally cannot verify (3.4, 9.1, 9.2, 9.3): clicking a card,
// a grouped instance button, or an affordance link OPENS the right URL in an
// ADJACENT new tab and CLOSES the popup. A PNG has no pixels for "a tab opened",
// so these are routed here instead of onto a snapshot case (the segmented gate —
// test/ui/behavior-coverage.js, docs/engineeringPractices.md, issue #429).
//
// =====================================================================
// !!!  INCOMPLETE VERIFICATION — READ BEFORE TRUSTING THIS TEST  !!!
// ---------------------------------------------------------------------
// This test STUBS the exact boundary the behavior crosses: it replaces
// `chrome.tabs.create` and `window.close` with spies and asserts they were
// called with the right arguments. Per docs/engineeringPractices.md ("a test
// that stubs the exact boundary where the bug lives can't catch that bug"), this
// CANNOT confirm that a REAL Chrome actually opens the tab, places it adjacent,
// or tears the popup down — only that our code asked it to. A faithful (non-stub)
// verification of these leaves is still owed; the approach is TBD by the repo
// owner — see the UI-testing tracking issue referenced in docs/claude/testing.md.
// Until then, 3.4/9.1/9.2/9.3 are only PARTIALLY verified.
// =====================================================================
"use strict";

const { test, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { JSDOM } = require("jsdom");
const { BEHAVIOR_COVERAGE } = require("../ui/behavior-coverage");

const ROOT = path.join(__dirname, "..", "..");
const TAB = { url: "https://example.com/events", title: "Example event page", index: 3 };

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
    pathToFileURL(path.join(ROOT, "ui", "views", "events-view.js"))
  ));
  ({ makeSourceRequestLink, makePolicyLink } = await import(
    pathToFileURL(path.join(ROOT, "ui", "views", "source-request-view.js"))
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
  const el = renderCard(card, TAB);
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
  const el = renderCard(card, TAB);
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

// Guard the segmentation manifest itself: this test must exercise exactly the
// leaves behavior-coverage.js claims — no more (a stale claim), no fewer (a leaf
// the gate thinks is covered here but isn't).
test("covers exactly the leaves behavior-coverage.js routes to it", () => {
  assert.deepEqual(
    Object.keys(BEHAVIOR_COVERAGE).sort(),
    ["3.4", "9.1", "9.2", "9.3"],
    "the behavioral-leaf manifest drifted from what this test actually verifies"
  );
});
