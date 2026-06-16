// Popup controller (ES module): query the active tab, run the extractor in it,
// then render — from the one chooseContent() decision — event buttons and/or
// the unsupported-host affordances (a "request support" button, a "Disagree?"
// policy link). The two view modules — events-view.js and source-request-view.js
// — are loaded on demand with import() so the popup pulls in just what the page
// needs.
import { GCalConfig } from "../config.js";
import { classifyHost, isPresentableFallbackEvent } from "../fallback-policy.js";

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

  const { events: allEvents, request, policyLink } = chooseContent(data, classifyHost(tab.url));

  if (allEvents.length) {
    headingEl.textContent = "Add to Google Calendar";

    const truncEl = document.getElementById("truncated");
    const { makeButton } = await import("./views/events-view.js");

    // Render the first `limit` events into the (height-capped, scrollable) list
    // and refresh the bottom count label. "show all" re-renders with the bigger
    // cap. The list shows maxEventsShown at first; "show all" expands it to the
    // maxEventsExpanded hard cap.
    const renderList = (limit) => {
      const shown = allEvents.slice(0, limit);
      eventsEl.replaceChildren(...shown.map((event) => makeButton(event, tab)));
      renderTruncation(truncEl, shown.length, allEvents.length, () => renderList(GCalConfig.maxEventsExpanded));
    };

    renderList(GCalConfig.maxEventsShown);
  } else {
    headingEl.textContent = "No events found on this page";
  }

  // A heading-line link on an unlisted host, right-aligned next to the heading
  // text: "Suggest Correction" when a complete event is shown (State 5), or
  // "Disagree?" when there's nothing to show (State 3). At most one fires.
  if (request || policyLink) {
    const view = await import("./views/source-request-view.js");
    headingEl.classList.add("with-link");
    headingEl.appendChild(request ? view.makeSourceRequestLink(tab, request) : view.makePolicyLink(tab));
  }
}

// The bottom-of-list count label. Hidden when every event is already shown.
// Otherwise reads "N out of M events showing" with a "show all" link while the
// list can still grow (we're showing fewer than the maxEventsExpanded cap), or
// "N out of M events shown" with no link once it's capped — the link can't
// reveal anything more. `onShowAll` re-renders the list at the expanded cap.
export function renderTruncation(el, shownCount, total, onShowAll) {
  el.replaceChildren();
  if (shownCount >= total) {
    el.hidden = true;
    return;
  }

  const canExpand = shownCount < GCalConfig.maxEventsExpanded;

  // Label on the left, "show all" link (when the list can still grow) pushed to
  // the right — laid out as a row by #truncated's flexbox.
  const label = document.createElement("span");
  label.textContent = `${shownCount} out of ${total} events ${canExpand ? "showing" : "shown"}`;
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

  el.hidden = false;
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
