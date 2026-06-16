// Contract for popup.js's makeTruncationLabel() — the count label that sits as
// the LAST item inside the popup's scrollable event list (so it's only seen once
// scrolled to the end), and its "show all" affordance. The popup lists up to
// maxEventsShown events at first; this label says how many of the total are
// showing and, while the list can still grow, offers a "show all" link that
// expands it to the maxEventsExpanded hard cap.
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

function render(shownCount, total) {
  let showAllCalls = 0;
  const el = makeTruncationLabel(shownCount, total, () => showAllCalls++);
  return { el, link: el && el.querySelector(".show-all-link"), showAllCalls: () => showAllCalls };
}

test("whole list fits unscrolled: no label at all (null)", () => {
  const { el } = render(5, 5);
  assert.equal(el, null);
});

test("whole list shown but taller than fits: 'N events showing' scroll cue, no link, no 'out of'", () => {
  const total = GCalConfig.eventsVisibleBeforeScroll + 1;
  const { el, link } = render(total, total);
  assert.equal(el.textContent, `${total} events showing`);
  assert.ok(!el.textContent.includes("out of"), "no 'out of' when everything is shown");
  assert.equal(link, null, "no 'show all' when everything is already shown");
});

test("default cap reached, more remain: 'showing' with a 'show all' link", () => {
  const { el, link } = render(GCalConfig.maxEventsShown, 40);
  assert.match(el.textContent, new RegExp(`^${GCalConfig.maxEventsShown} out of 40 events showing`));
  assert.ok(link, "expected a 'show all' link while the list can still grow");
});

test("clicking 'show all' invokes the expand callback (and suppresses navigation)", () => {
  const { link, showAllCalls } = render(GCalConfig.maxEventsShown, 40);
  let defaultPrevented = false;
  link.addEventListener("click", (e) => (defaultPrevented = e.defaultPrevented));
  link.dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true, cancelable: true }));
  assert.equal(showAllCalls(), 1);
  assert.equal(defaultPrevented, true);
});

test("expanded to the hard cap, still more remain: 'shown' with NO link", () => {
  const { el, link } = render(GCalConfig.maxEventsExpanded, 500);
  assert.match(el.textContent, new RegExp(`^${GCalConfig.maxEventsExpanded} out of 500 events shown`));
  assert.equal(link, null, "no 'show all' once the hard cap is hit — it can't reveal more");
});

test("hard cap exactly equals the total: everything shown as a scroll cue, no link", () => {
  const cap = GCalConfig.maxEventsExpanded;
  const { el, link } = render(cap, cap);
  assert.equal(el.textContent, `${cap} events showing`);
  assert.equal(link, null);
});

test("the label is built as a <p id='truncated'> so the list's CSS targets it", () => {
  const { el } = render(GCalConfig.maxEventsShown, 40);
  assert.equal(el.tagName, "P");
  assert.equal(el.id, "truncated");
});
