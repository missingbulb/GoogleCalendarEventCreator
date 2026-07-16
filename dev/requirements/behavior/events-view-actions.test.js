// Behavior contract for the popup's CLICK actions — the leaf requirements that a
// UI snapshot structurally cannot verify (3.4, 9.1, 9.2, 9.3, 9.4): clicking a
// card, a grouped instance button (and, for a multi-venue event, getting that
// showing's own venue), or a NAVIGATING affordance link OPENS the right URL in an
// ADJACENT new tab and CLOSES the popup. A PNG has no pixels for "a tab opened",
// so these leaves declare `kind: "behavior"` in their case and are routed here
// instead of onto a snapshot image (see the engineering practices doc, issue #429).
// Also here (supporting the image leaf 3.5): the "Disagree?" link's NON-navigating
// behavior — it expands the explanation inline rather than opening a tab.
//
// =====================================================================
// !!!  INCOMPLETE VERIFICATION — READ BEFORE TRUSTING THIS TEST  !!!
// ---------------------------------------------------------------------
// This test STUBS the exact boundary the behavior crosses: it replaces
// `chrome.tabs.create` and `window.close` with spies and asserts they were
// called with the right arguments. Per the engineering practices doc ("a test
// that stubs the exact boundary where the bug lives can't catch that bug"), this
// CANNOT confirm that a REAL Chrome actually opens the tab, places it adjacent,
// or tears the popup down — only that our code asked it to. A faithful (non-stub)
// verification of these leaves is still owed; the approach is TBD by the repo
// owner — see the UI-testing tracking issue (#435, per the gcec testing-guide skill).
// Until then, 3.4/9.1/9.2/9.3 are only PARTIALLY verified.
// =====================================================================
"use strict";

const { test, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { JSDOM } = require("jsdom");
const { loadCases, leafIdOf } = require("../shared/cases");
const { REFERENCE_NOW } = require("../shared/reference-time");

const ROOT = path.join(__dirname, "..", "..", "..");
const TAB = { url: "https://example.com/events", title: "Example event page", index: 3 };
// Render cards against the pinned reference "now" (not the real clock), so a card's
// corner-pill decision is deterministic forever — the same fixed instant the
// snapshots use.

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
  const el = renderCard(card, TAB, REFERENCE_NOW);
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
  const el = renderCard(card, TAB, REFERENCE_NOW);
  const buttons = el.querySelectorAll("button.chip-btn");
  assert.equal(buttons.length, 2, "one button per showing");

  await click(buttons[1]);
  assert.equal(created.length, 1, "exactly one tab opened for the clicked showing");
  assert.match(created[0].url, /calendar\.google\.com/);
  assert.equal(created[0].index, TAB.index + 1, "adjacent tab");
  assert.equal(closed, 1, "popup closes");
});

// 9.4: when the showings sit at different venues, clicking an instance chip opens
// the template with THAT showing's own venue (the per-instance location), not the
// event-level one.
test("9.4: clicking an instance chip at a differing venue opens the template with that showing's venue", async () => {
  const [card] = toCards([
    {
      title: "On Tour",
      times: [
        { start: "2026-07-04T20:00:00", location: "Paradiso, Amsterdam" },
        { start: "2026-07-11T20:00:00", location: "La Cigale, Paris" },
      ],
    },
  ]);
  assert.equal(card.kind, "month", "two showings in one month form a grouped card");
  const el = renderCard(card, TAB, REFERENCE_NOW);
  const buttons = el.querySelectorAll("button.chip-btn");
  assert.equal(buttons.length, 2, "one button per showing");

  await click(buttons[1]);
  assert.equal(created.length, 1, "exactly one tab opened for the clicked showing");
  const loc = new URL(created[0].url).searchParams.get("location");
  assert.equal(loc, "La Cigale, Paris", "the clicked showing's own venue fills the Calendar location");
});

// Reveal the inline explanation panel the way the extension does — append the
// "Disagree?" link, then click it so its handler replaces it in place — and return
// that panel (replaceWith is a no-op on a parentless node, so it must be attached
// first). Used both to check the expand itself and to reach the panel's "open an
// issue" continuation link.
function revealPolicyPanel() {
  document.body.replaceChildren();
  const link = makePolicyLink(TAB);
  document.body.appendChild(link);
  link.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
  return { link, panel: document.querySelector(".policy-panel") };
}

// 3.5: clicking "Disagree?" expands the explanation INLINE (replacing the link in
// place) — it does NOT open a tab or close the popup. The negative half of 3.4.
test('3.5: clicking "Disagree?" expands the explanation inline, opening no tab and leaving the popup open', () => {
  const { link, panel } = revealPolicyPanel();
  assert.ok(panel, "the inline explanation panel is revealed");
  assert.equal(created.length, 0, "no tab is opened");
  assert.equal(closed, 0, "the popup stays open");
  assert.ok(!document.body.contains(link), "the Disagree? link is replaced in place by the panel");
  assert.ok(panel.querySelector(".heading-link"), "the panel carries an \"open an issue\" continuation link");
});

// 3.4: each NAVIGATING affordance link — "Suggest Correction" and the inline
// panel's "open an issue" — opens its target in an adjacent new tab and closes the
// popup, suppressing the default <a> nav. ("Disagree?" is NOT here: it expands
// inline, verified above.)
for (const [label, build] of [
  ["Suggest Correction", () => makeSourceRequestLink(TAB, { title: "X", start: "2026-06-19T19:00:00" }, 1)],
  ["open an issue", () => revealPolicyPanel().panel.querySelector(".heading-link")],
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
    ["3.4", "9.1", "9.2", "9.3", "9.4"],
    "the kind:\"behavior\" cases drifted from what this test actually verifies"
  );
});
