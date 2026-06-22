// Contract for the popup controller's two pure builders, both exported from
// popup.js:
//   - chooseContent() — THE single decision behind what the popup renders;
//   - makeTruncationLabel() — the count label that caps the scrollable list.
// The host classifier and presentability gate chooseContent leans on live in
// fallback-policy.js and are tested in extension-test/fallback-policy.test.js.
//
// chooseContent renders three things off its { events, request, policyLink }:
// event buttons, a "request support" button (seeded with an event), and a quiet
// "Disagree?" link to the public policy doc. The five states, in the order they
// are decided (issue #192):
//
//   1  supported host                    -> events only
//   1b supported host, dedicated source   -> the generic fallback's events +
//      found nothing (#456)                  a "Suggest Correction" request link
//   2  denylisted host                   -> "No events found" (no link, no prompt)
//   3  not denylisted, nothing complete  -> "No events found" + Disagree? link
//   4  complete event, allowlisted       -> events only (no support ask)
//   5  complete event, on neither list   -> events + request button
//
// This supersedes the strict #101 rule that an unsupported host must NEVER
// surface a scraped event: #192 deliberately shows a *complete* fallback event
// (title + location + start) on an unsupported host. What still holds from #101
// is that `supported` (which colors the toolbar icon) is untouched — we never
// relabel such a host "supported"; the icon stays blue while the popup, which
// alone runs extraction, may show the event.
//
// makeTruncationLabel sits as the LAST item inside the popup's scrollable event
// list (so it's only seen once scrolled to the end), with its "show all"
// affordance. The popup lists up to maxCardsShown CARDS at first; the label says
// how many of the total EVENT INSTANCES are showing (a card can hold several)
// and, while the list can still grow, offers a "show all" link that expands it
// to the maxCardsExpanded hard cap. The cap is on cards; the numbers in the
// label are event instances, so the two can differ. It builds DOM, so the test
// gives popup.js a jsdom document (it reads the thresholds straight from the
// real config.js, so the edges below track the shipped values).
"use strict";

const { test, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { JSDOM } = require("jsdom");

// chooseContent + makeTruncationLabel live in the popup controller (popup.js),
// whose init() only runs when a real `document` exists, so importing it in Node
// is side-effect-free. makeTruncationLabel uses the global `document` when
// called, so install a jsdom one before importing.
let chooseContent, makeTruncationLabel, GCalConfig;
before(async () => {
  global.document = new JSDOM("<!doctype html><body></body>").window.document;
  ({ chooseContent, makeTruncationLabel } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "extension", "events-popup", "popup.js"))
  ));
  ({ GCalConfig } = await import(
    pathToFileURL(path.join(__dirname, "..", "..", "extension", "config.js"))
  ));
});

// A complete fallback event (presentable); and one missing a location (not).
const FULL = { title: "Some Show", location: "The Venue", start: "2026-07-01T20:00:00" };
const NO_LOCATION = { title: "Some Show", start: "2026-07-01T20:00:00" };

// --- chooseContent: the five states ------------------------------------------

test("State 1 — supported host: events only, no request, no policy link", () => {
  const view = chooseContent({ events: [FULL], supported: true }, "none");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false);
});

test("State 1 — supported host with no events: empty events, no extras", () => {
  const view = chooseContent({ events: [], supported: true }, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false);
});

// --- State 1b: supported host whose dedicated source found nothing (#456) ---
// The orchestrator (assemble-events.js) sets `fallback: true` when a SUPPORTED
// host's dedicated source returned no events and it therefore ran the generic
// extractor. The popup shows the fallback's complete events WITH the "Suggest
// Correction" link (the dedicated source missed them — a correction is exactly
// what we want), regardless of the host's allow/deny listing.

test("State 1b — supported host, dedicated source empty, fallback found a complete event: events AND a request link", () => {
  const view = chooseContent({ events: [FULL], supported: true, fallback: true }, "none");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, FULL);
  assert.equal(view.policyLink, false);
});

test("State 1b — the correction link shows even on an allowlisted supported host", () => {
  // meetup.com is both supported AND allowlisted; a dedicated miss is still a
  // defect worth reporting, so the request link shows regardless of listing.
  const view = chooseContent({ events: [FULL], supported: true, fallback: true }, "allow");
  assert.equal(view.request, FULL);
});

test("State 1b — fallback found only an incomplete event: bare empty state, no link", () => {
  const view = chooseContent({ events: [NO_LOCATION], supported: true, fallback: true }, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false); // a supported host isn't disputing policy
});

test("State 1 — a supported host's OWN events (fallback false) get no correction link", () => {
  const view = chooseContent({ events: [FULL], supported: true, fallback: false }, "none");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false);
});

test("State 2 — denylisted host: 'No events found' with NO link or prompt, even with a complete event", () => {
  // The denylist decision holds regardless of what the fallback scraped.
  const view = chooseContent({ events: [FULL], supported: false }, "deny");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false); // no "Disagree?" — the call was deliberate
});

test("State 2 — denylisted host with nothing scraped: still no link or prompt", () => {
  const view = chooseContent({ events: [], supported: false }, "deny");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false);
});

test("State 3 — not denylisted, nothing complete (no location): policy link", () => {
  const view = chooseContent({ events: [NO_LOCATION], supported: false }, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, true);
});

test("State 3 — allowlisted but nothing complete: still the policy link (allow only matters once an event is found)", () => {
  const view = chooseContent({ events: [NO_LOCATION], supported: false }, "allow");
  assert.equal(view.events.length, 0);
  assert.equal(view.policyLink, true);
});

test("State 3 — not denylisted, no events at all: policy link", () => {
  const view = chooseContent({ events: [], supported: false }, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.policyLink, true);
});

test("State 4 — complete event, allowlisted: events only, NO request", () => {
  const view = chooseContent({ events: [FULL], supported: false }, "allow");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, false);
});

test("State 5 — complete event, on neither list: events AND a request button seeded with the event", () => {
  const view = chooseContent({ events: [FULL], supported: false }, "none");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, FULL);
  assert.equal(view.policyLink, false);
});

test("only complete fallback events are shown; incomplete ones are dropped", () => {
  const view = chooseContent({ events: [NO_LOCATION, FULL], supported: false }, "none");
  assert.deepEqual(view.events, [FULL]);
  assert.equal(view.request, FULL);
});

test("a failed injection (restricted page, no result) shows the policy link", () => {
  const view = chooseContent({}, "none");
  assert.equal(view.events.length, 0);
  assert.equal(view.request, null);
  assert.equal(view.policyLink, true);
});

test("chooseContent defaults listing to 'none' when omitted", () => {
  const view = chooseContent({ events: [FULL], supported: false }); // -> State 5
  assert.equal(view.request, FULL);
  assert.deepEqual(view.events, [FULL]);
});

// --- makeTruncationLabel: the count label + "show all" affordance ------------

// shownEvents/totalEvents default to the card counts (the common case, where
// every card is a single-occurrence event); pass them explicitly to model
// multi-instance cards, where a card stands for several events.
function renderLabel(shownCards, totalCards, shownEvents = shownCards, totalEvents = totalCards) {
  let showAllCalls = 0;
  const el = makeTruncationLabel(shownCards, totalCards, shownEvents, totalEvents, () => showAllCalls++);
  return { el, link: el && el.querySelector(".show-all-link"), showAllCalls: () => showAllCalls };
}

test("whole list fits unscrolled: no label at all (null)", () => {
  const { el } = renderLabel(5, 5);
  assert.equal(el, null);
});

test("whole list shown but taller than fits: 'N events showing' scroll cue, no link, no 'out of'", () => {
  const total = GCalConfig.cardsVisibleBeforeScroll + 1;
  const { el, link } = renderLabel(total, total);
  assert.equal(el.textContent, `${total} events showing`);
  assert.ok(!el.textContent.includes("out of"), "no 'out of' when everything is shown");
  assert.equal(link, null, "no 'show all' when everything is already shown");
});

test("default cap reached, more remain: 'showing' with a 'show all' link", () => {
  const { el, link } = renderLabel(GCalConfig.maxCardsShown, 40);
  assert.match(el.textContent, new RegExp(`^${GCalConfig.maxCardsShown} out of 40 events showing`));
  assert.ok(link, "expected a 'show all' link while the list can still grow");
});

test("clicking 'show all' invokes the expand callback (and suppresses navigation)", () => {
  const { link, showAllCalls } = renderLabel(GCalConfig.maxCardsShown, 40);
  let defaultPrevented = false;
  link.addEventListener("click", (e) => (defaultPrevented = e.defaultPrevented));
  link.dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true, cancelable: true }));
  assert.equal(showAllCalls(), 1);
  assert.equal(defaultPrevented, true);
});

test("expanded to the hard cap, still more remain: 'shown' with NO link", () => {
  const { el, link } = renderLabel(GCalConfig.maxCardsExpanded, 500);
  assert.match(el.textContent, new RegExp(`^${GCalConfig.maxCardsExpanded} out of 500 events shown`));
  assert.equal(link, null, "no 'show all' once the hard cap is hit — it can't reveal more");
});

test("hard cap exactly equals the total: everything shown as a scroll cue, no link", () => {
  const cap = GCalConfig.maxCardsExpanded;
  const { el, link } = renderLabel(cap, cap);
  assert.equal(el.textContent, `${cap} events showing`);
  assert.equal(link, null);
});

test("the label is built as a <p id='truncated'> so the list's CSS targets it", () => {
  const { el } = renderLabel(GCalConfig.maxCardsShown, 40);
  assert.equal(el.tagName, "P");
  assert.equal(el.id, "truncated");
});

// --- The cap is on CARDS, but the numbers shown are EVENT INSTANCES ----------

test("a card can hold several events: the label counts events, the cap counts cards", () => {
  // 10 cards shown out of 12, but those cards hold 25 / 40 event instances. The
  // label reports the instance counts, not the card counts.
  const { el, link } = renderLabel(10, 12, 25, 40);
  assert.match(el.textContent, /^25 out of 40 events showing/);
  assert.ok(link, "still expandable (10 < the card hard cap)");
});

test("all cards shown but taller than fits: the cue counts total event instances", () => {
  // 8 cards (all shown) holding 20 instances total -> "20 events showing".
  const { el, link } = renderLabel(8, 8, 8, 20);
  assert.equal(el.textContent, "20 events showing");
  assert.equal(link, null);
});

test("'show all' link appears off the CARD cap, not the event count", () => {
  // Card hard cap reached even though events still vastly outnumber it: no link.
  const { link } = renderLabel(GCalConfig.maxCardsExpanded, GCalConfig.maxCardsExpanded + 5, 300, 999);
  assert.equal(link, null, "no 'show all' once the card cap is hit, regardless of event count");
});
