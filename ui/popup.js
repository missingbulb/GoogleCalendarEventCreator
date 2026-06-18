// Popup controller (ES module): query the active tab, run the extractor in it,
// then render — from the one chooseContent() decision — event buttons and/or
// the unsupported-host affordances (a "request support" button, a "Disagree?"
// policy link). The two view modules — events-view.js and source-request-view.js
// — are loaded on demand with import() so the popup pulls in just what the page
// needs.
import { GCalConfig } from "../config.js";
import { classifyHost, isPresentableFallbackEvent } from "../fallback-policy.js";

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // The files to inject (and their order) come from the generated load list,
  // the single source of truth shared with the tests — see tools/index.js.
  const loadOrder = await fetch(chrome.runtime.getURL("pipeline/load-order.generated.json"));
  const files = await loadOrder.json();

  let data = {};
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files,
    });
    data = (injection && injection.result) || {};
  } catch (e) {
    // Restricted page (chrome://, Web Store, etc.) — fall back to tab metadata.
    console.warn("Could not extract from page:", e);
  }

  await render({ data, tab, listing: classifyHost(tab.url) });
}

// Render the popup's content from the one chooseContent() decision: the heading
// text, the (height-capped, scrollable) event list with its bottom count label,
// the State-5 "Suggest Correction" heading-line link when an event is shown, or
// (when there's nothing to show) an empty-state glyph with the State-3
// "Disagree?" link beneath it. Split out from init() — which does the
// chrome/fetch I/O to gather `data` — so the SAME real view code can be driven
// with fake data by the UI snapshot tests (test/ui/), which pass `data`, a stub
// `tab`, and the host `listing` directly. Builds into the global `document` (the
// popup document in the extension; a jsdom document under test).
// `currentYear` (the year against which a card decides whether to show a year
// pill — see events-view's chip helpers) defaults to the real current year; the
// UI snapshot tests pass a fixed one so their PNGs stay deterministic.
export async function render({ data, tab, listing, currentYear = new Date().getFullYear() }) {
  const headingEl = document.getElementById("heading");
  const eventsEl = document.getElementById("events");

  const { events: allEvents, request, policyLink } = chooseContent(data, listing);

  if (allEvents.length) {
    headingEl.textContent = "Add to Google Calendar";

    const { toCards, renderCard } = await import("./views/events-view.js");

    // Turn the events into cards: a single occurrence is one clickable card, and
    // a multi-instance event is grouped by month into one or more cards (a
    // same-day card with a button per time, a month card with a button per day,
    // or plain single cards — see events-view.js's toCards). Instances are never
    // merged, so one event can yield several cards and a card can stand for
    // several instances, each its own button.
    const cards = toCards(allEvents);
    const totalEvents = cards.reduce((n, c) => n + c.instances.length, 0);

    // Render the first `limit` CARDS into the (height-capped, scrollable) list.
    // The cap is on cards (a layout/height limit), but the count label counts
    // event instances (what the user picks between), so the two numbers can
    // differ. The label is appended as the list's LAST item — so it scrolls with
    // the cards and is only seen once you've scrolled to the end. "show all"
    // re-renders with the bigger cap; the list shows maxCardsShown at first and
    // "show all" expands to maxCardsExpanded.
    const renderList = (limit) => {
      const shown = cards.slice(0, limit);
      const items = shown.map((card) => renderCard(card, tab, currentYear));
      const shownEvents = shown.reduce((n, c) => n + c.instances.length, 0);
      const label = makeTruncationLabel(
        shown.length,
        cards.length,
        shownEvents,
        totalEvents,
        () => renderList(GCalConfig.maxCardsExpanded)
      );
      if (label) items.push(label);
      eventsEl.replaceChildren(...items);
      // Refresh the edge fades for the new content (also after a "show all"
      // re-render, which grows the list).
      updateScrollFades();
    };

    renderList(GCalConfig.maxCardsShown);

    // Edge fades: a scroll cue that there's more list above/below. Keep them in
    // sync as the user scrolls. In a real browser the scroll metrics are live;
    // under the static snapshot renderer they're 0, so a case drives the fade
    // state via its action instead (see test/ui/actions.js).
    eventsEl.addEventListener("scroll", updateScrollFades);

    // State 5: a complete fallback event on an unlisted host — a quiet
    // right-aligned "Suggest Correction" link next to the heading text. (Only
    // fires when events are shown, so it lives on the heading line.)
    if (request) {
      const view = await import("./views/source-request-view.js");
      headingEl.classList.add("with-link");
      // allEvents here is the fallback's presentable events; its length tells the
      // form whether the page carries multiple events (pre-selects the dropdown).
      headingEl.appendChild(view.makeSourceRequestLink(tab, request, allEvents.length));
    }
  } else {
    headingEl.textContent = "No events found on this page";

    // Empty state: a muted calendar glyph that gives the popup a face instead of
    // a bare line. State 3 (non-denylisted, nothing complete) adds the quiet
    // "Disagree?" policy link beneath the glyph; State 2 (denylist) and an
    // event-less supported host (policyLink false) show the glyph alone.
    let policyLinkEl = null;
    if (policyLink) {
      const view = await import("./views/source-request-view.js");
      policyLinkEl = view.makePolicyLink(tab);
    }
    eventsEl.appendChild(makeEmptyState(policyLinkEl));
  }
}

// The empty-state block rendered into the (otherwise empty) event list when
// there's nothing to add: a muted, CSS-drawn calendar glyph — the same
// box-only construction as the header brand mark, so the satori snapshot
// renderer paints it — with an optional quiet link beneath it (the "Disagree?"
// policy link on State 3; nothing on a denylisted host).
function makeEmptyState(linkEl) {
  const wrap = document.createElement("div");
  wrap.className = "empty-state";

  const cal = document.createElement("span");
  cal.className = "empty-cal";
  cal.setAttribute("aria-hidden", "true");
  const banner = document.createElement("span");
  banner.className = "empty-cal-banner";
  cal.appendChild(banner);
  wrap.appendChild(cal);

  if (linkEl) wrap.appendChild(linkEl);
  return wrap;
}

// Show/hide the top and bottom edge fades from the scroller's current position:
// the top fade once scrolled away from the top, the bottom fade while there's
// still list below the fold. A 1px slack absorbs sub-pixel scroll metrics.
function updateScrollFades() {
  const events = document.getElementById("events");
  const top = document.querySelector(".scroll-fade.top");
  const bottom = document.querySelector(".scroll-fade.bottom");
  if (!events || !top || !bottom) return;
  top.classList.toggle("show", events.scrollTop > 1);
  bottom.classList.toggle("show", events.scrollTop + events.clientHeight < events.scrollHeight - 1);
}

// Build the count label that sits as the LAST item inside the scrollable list
// (so it's only seen once scrolled to the end), or null when there's nothing to
// say. The list is capped by CARDS (`shownCards` of `totalCards`), but the label
// reports EVENT instances (`shownEvents` of `totalEvents`) — a card can hold
// several — so the two pairs can differ. Three cases:
//   - every card fits unscrolled (totalCards <= cardsVisibleBeforeScroll): null;
//   - every card shown but the list is taller than that: "N events showing" — a
//     scroll cue, no "out of", no link;
//   - a prefix of the cards shown: "N out of M events showing" with a "show all"
//     link while the list can still grow (we're below the maxCardsExpanded cap),
//     or "N out of M events shown" with no link once it's capped — the link
//     can't reveal anything more.
// `onShowAll` re-renders the list at the expanded card cap.
export function makeTruncationLabel(shownCards, totalCards, shownEvents, totalEvents, onShowAll) {
  const allShown = shownCards >= totalCards;
  if (allShown && totalCards <= GCalConfig.cardsVisibleBeforeScroll) return null;

  const el = document.createElement("p");
  el.id = "truncated";

  // Label on the left; the "show all" link (when present) is pushed to the
  // right — laid out as a row by #truncated's flexbox.
  const label = document.createElement("span");
  if (allShown) {
    label.textContent = `${totalEvents} events showing`;
    el.appendChild(label);
    return el;
  }

  const canExpand = shownCards < GCalConfig.maxCardsExpanded;
  label.textContent = `${shownEvents} out of ${totalEvents} events ${canExpand ? "showing" : "shown"}`;
  el.appendChild(label);

  if (canExpand) {
    const link = document.createElement("a");
    link.className = "show-all-link";
    link.href = "#";
    link.textContent = "show all";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      onShowAll();
    });
    el.appendChild(link);
  }

  return el;
}

// THE one decision behind what the popup renders, given the injected extraction
// result and the host's fallback classification (classifyHost, in
// fallback-policy.js). Returns { events, request, policyLink } — `events` are the
// buttons to show (possibly empty), `request` is the prefill for a "request
// support" button (or null), `policyLink` is whether to show the "Disagree?"
// link. The five states, in the order they're decided (specified in
// docs/productRequirements.md; diagram in docs/popup-states-flowchart.png):
//
//   State 1 — supported host (a per-site source matched): show its events.
//     `supported` is the same GCal.isSupportedHost check that colors the toolbar
//     icon, so the popup's supported/unsupported split and the icon agree.
//   State 2 — denylisted host: "No events found", and NO prompt — we've
//     explicitly decided not to extract there, so we don't surface a fallback
//     event, a support request, or even the policy link. Decided before the
//     fallback result, so it holds whether or not the fallback scraped anything.
//   State 3 — not denylisted, and the fallback found nothing complete: "No
//     events found" with the quiet "Disagree?" link to the policy doc.
//   State 4 — a complete fallback event (title + location + start), allowlisted:
//     show the event; don't ask for support (the fallback is trusted here).
//   State 5 — a complete fallback event, on neither list: show the event AND a
//     "request support" button, so a good page can become a first-class source.
export function chooseContent(data, listing = "none") {
  const all = data && data.events && data.events.length ? [...data.events] : [];

  // State 1.
  if (data && data.supported) {
    return { events: all, request: null, policyLink: false };
  }

  // State 2: a denylisted host shows nothing and prompts for nothing — that
  // decision is already made, regardless of what the fallback scraped.
  if (listing === "deny") {
    return { events: [], request: null, policyLink: false };
  }

  const presentable = all.filter(isPresentableFallbackEvent);

  // State 3: nothing complete to show — offer the quiet "how this works" link.
  if (!presentable.length) {
    return { events: [], request: null, policyLink: true };
  }

  // States 4 & 5: a complete event. Allowlisted hosts skip the support ask;
  // unlisted hosts also get the request button, seeded with the event.
  const request = listing === "allow" ? null : presentable[0];
  return { events: presentable, request, policyLink: false };
}

// Run only in the real popup document; importing this module in Node (the
// tests) just pulls in the exported helpers without touching the DOM/chrome APIs.
if (typeof document !== "undefined") {
  init().catch((e) => console.error("Popup failed to initialize:", e));
}
