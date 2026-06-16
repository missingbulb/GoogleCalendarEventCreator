// Contract for popup.js's makeTruncationLabel() — the count label that sits as
// the LAST item inside the popup's scrollable event list (so it's only seen once
// scrolled to the end), and its "show all" affordance. The popup lists up to
// maxCardsShown CARDS at first; this label says how many of the total EVENT
// INSTANCES are showing (a card can hold several) and, while the list can still
// grow, offers a "show all" link that expands it to the maxCardsExpanded hard
// cap. The cap is on cards; the numbers in the label are event instances, so the
// two can differ.
//
// makeTruncationLabel builds DOM, so the test gives popup.js a jsdom document to
// build into (it reads the thresholds straight from the real config.js, so the
// edges below track the shipped values).
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { JSDOM } = require("jsdom");

let makeTruncationLabel, GCalConfig;
before(async () => {
  // popup.js's makeTruncationLabel uses the global `document`; importing the
  // module is side-effect-free (init() only runs when a real document already
  // exists), but the helper needs one when called, so install a jsdom document.
  global.document = new JSDOM("<!doctype html><body></body>").window.document;
  ({ makeTruncationLabel } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "ui", "popup.js"))
  ));
  ({ GCalConfig } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "config.js"))
  ));
});

// shownEvents/totalEvents default to the card counts (the common case, where
// every card is a single-occurrence event); pass them explicitly to model
// multi-instance cards, where a card stands for several events.
function render(shownCards, totalCards, shownEvents = shownCards, totalEvents = totalCards) {
  let showAllCalls = 0;
  const el = makeTruncationLabel(shownCards, totalCards, shownEvents, totalEvents, () => showAllCalls++);
  return { el, link: el && el.querySelector(".show-all-link"), showAllCalls: () => showAllCalls };
}

test("whole list fits unscrolled: no label at all (null)", () => {
  const { el } = render(5, 5);
  assert.equal(el, null);
});

test("whole list shown but taller than fits: 'N events showing' scroll cue, no link, no 'out of'", () => {
  const total = GCalConfig.cardsVisibleBeforeScroll + 1;
  const { el, link } = render(total, total);
  assert.equal(el.textContent, `${total} events showing`);
  assert.ok(!el.textContent.includes("out of"), "no 'out of' when everything is shown");
  assert.equal(link, null, "no 'show all' when everything is already shown");
});

test("default cap reached, more remain: 'showing' with a 'show all' link", () => {
  const { el, link } = render(GCalConfig.maxCardsShown, 40);
  assert.match(el.textContent, new RegExp(`^${GCalConfig.maxCardsShown} out of 40 events showing`));
  assert.ok(link, "expected a 'show all' link while the list can still grow");
});

test("clicking 'show all' invokes the expand callback (and suppresses navigation)", () => {
  const { link, showAllCalls } = render(GCalConfig.maxCardsShown, 40);
  let defaultPrevented = false;
  link.addEventListener("click", (e) => (defaultPrevented = e.defaultPrevented));
  link.dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true, cancelable: true }));
  assert.equal(showAllCalls(), 1);
  assert.equal(defaultPrevented, true);
});

test("expanded to the hard cap, still more remain: 'shown' with NO link", () => {
  const { el, link } = render(GCalConfig.maxCardsExpanded, 500);
  assert.match(el.textContent, new RegExp(`^${GCalConfig.maxCardsExpanded} out of 500 events shown`));
  assert.equal(link, null, "no 'show all' once the hard cap is hit — it can't reveal more");
});

test("hard cap exactly equals the total: everything shown as a scroll cue, no link", () => {
  const cap = GCalConfig.maxCardsExpanded;
  const { el, link } = render(cap, cap);
  assert.equal(el.textContent, `${cap} events showing`);
  assert.equal(link, null);
});

test("the label is built as a <p id='truncated'> so the list's CSS targets it", () => {
  const { el } = render(GCalConfig.maxCardsShown, 40);
  assert.equal(el.tagName, "P");
  assert.equal(el.id, "truncated");
});

// --- The cap is on CARDS, but the numbers shown are EVENT INSTANCES ----------

test("a card can hold several events: the label counts events, the cap counts cards", () => {
  // 10 cards shown out of 12, but those cards hold 25 / 40 event instances. The
  // label reports the instance counts, not the card counts.
  const { el, link } = render(10, 12, 25, 40);
  assert.match(el.textContent, /^25 out of 40 events showing/);
  assert.ok(link, "still expandable (10 < the card hard cap)");
});

test("all cards shown but taller than fits: the cue counts total event instances", () => {
  // 8 cards (all shown) holding 20 instances total -> "20 events showing".
  const { el, link } = render(8, 8, 8, 20);
  assert.equal(el.textContent, "20 events showing");
  assert.equal(link, null);
});

test("'show all' link appears off the CARD cap, not the event count", () => {
  // Card hard cap reached even though events still vastly outnumber it: no link.
  const { link } = render(GCalConfig.maxCardsExpanded, GCalConfig.maxCardsExpanded + 5, 300, 999);
  assert.equal(link, null, "no 'show all' once the card cap is hit, regardless of event count");
});
