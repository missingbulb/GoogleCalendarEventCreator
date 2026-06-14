// Popup controller (ES module): query the active tab, run the extractor in it,
// pick a view from the result, and dynamically import only that view to render.
// The two views — events-view.js and source-request-view.js — are loaded on
// demand with import() so the popup pulls in just what the page needs.

async function init() {
  const headingEl = document.getElementById("heading");
  const eventsEl = document.getElementById("events");

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

  const MAX_EVENTS = 7;
  const view = chooseContent(data);

  if (view.mode === "request") {
    // Unsupported site (red toolbar border). Never surface scraped events
    // here — that's exactly the border/popup mismatch we avoid — so offer the
    // embedded "request this source" form, prefilled with whatever little the
    // generic/JSON-LD layers managed to find.
    const { makeSourceRequestButton } = await import("./views/source-request-view.js");
    headingEl.textContent = "Add support for this site";
    eventsEl.appendChild(makeSourceRequestButton(tab, view.prefill));
    return;
  }

  const allEvents = view.events;
  const events = allEvents.slice(0, MAX_EVENTS);

  if (!events.length) {
    headingEl.textContent = "No events found on this page";
    return;
  }

  headingEl.textContent =
    allEvents.length > 1 ? `${allEvents.length} events on this page` : "Add to Google Calendar";

  if (allEvents.length > MAX_EVENTS) {
    const truncEl = document.getElementById("truncated");
    truncEl.textContent = `Showing first ${MAX_EVENTS} of ${allEvents.length}`;
    truncEl.hidden = false;
  }

  const { makeButton } = await import("./views/events-view.js");
  events.forEach((event) => {
    eventsEl.appendChild(makeButton(event, tab));
  });
}

// The one decision behind what the popup renders, driven by the injected
// extraction result's `supported` flag (set by assemble-events.js from the
// same GCal.isSupportedHost check that colors the toolbar icon — so the popup
// and the icon can never disagree). Returns either:
//   { mode: "request", prefill }  — unsupported host (red border): only the
//       "request this source" flow, seeded with any scraped event, never an
//       event button (even when the generic/JSON-LD layers found something).
//   { mode: "events", events }    — supported host (green border): the
//       extracted events, which may be empty ("No events found").
export function chooseContent(data) {
  const allEvents = data && data.events && data.events.length ? data.events : [];
  if (!data || !data.supported) {
    return { mode: "request", prefill: allEvents[0] };
  }
  return { mode: "events", events: allEvents };
}

// Run only in the real popup document; importing this module in Node (the
// tests) just pulls in chooseContent without touching the DOM/chrome APIs.
if (typeof document !== "undefined") {
  init().catch((e) => console.error("Popup failed to initialize:", e));
}
