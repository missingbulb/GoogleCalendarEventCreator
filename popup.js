// Popup: runs the extractor in the active tab and shows one button per
// distinct event found. Clicking a button opens that event's pre-filled
// Google Calendar template in a new tab.
(async () => {
  const headingEl = document.getElementById("heading");
  const eventsEl = document.getElementById("events");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  let data = {};
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: EXTRACTOR_FILES,
    });
    data = (injection && injection.result) || {};
  } catch (e) {
    // Restricted page (chrome://, Web Store, etc.) — fall back to tab metadata.
    console.warn("Could not extract from page:", e);
  }

  const MAX_EVENTS = 7;
  const view = chooseContent(tab.url, data);

  if (view.mode === "request") {
    // Unsupported site (red toolbar border). Never surface scraped events
    // here — that's exactly the border/popup mismatch we avoid — so offer the
    // embedded "request this source" form, prefilled with whatever little the
    // generic/JSON-LD layers managed to find.
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

  events.forEach((event) => {
    eventsEl.appendChild(makeButton(event, tab));
  });
})().catch((e) => console.error("Popup failed to initialize:", e));

// The one decision behind what the popup renders, derived from the same
// supported-host check (GCal.isSupportedHost, in extractors/site-hosts.js)
// that colors the toolbar icon — so the popup and the icon can never disagree.
// Returns either:
//   { mode: "request", prefill }  — unsupported host (red border): only the
//       "request this source" flow, seeded with any scraped event, never an
//       event button (even when the generic/JSON-LD layers found something).
//   { mode: "events", events }    — supported host (green border): the
//       extracted events, which may be empty ("No events found").
function chooseContent(url, data) {
  const allEvents = data && data.events && data.events.length ? data.events : [];
  if (!GCal.isSupportedHost(url)) {
    return { mode: "request", prefill: allEvents[0] };
  }
  return { mode: "events", events: allEvents };
}

// On an unsupported page with no event found, a button that opens a prefilled
// GitHub "new issue" page (in a new tab) requesting this site be added as a
// source. Styled like the event buttons for consistency, but with a GitHub
// mark instead of a date chip. A logged-in GitHub user just submits the
// already-filled issue.
function makeSourceRequestButton(tab, event) {
  const url = buildSourceRequestUrl(sourceRequestPrefill(tab, event));

  const btn = document.createElement("button");
  btn.className = "event-btn";

  const body = document.createElement("span");
  body.className = "e-body";

  const title = document.createElement("span");
  title.className = "e-title";
  title.textContent = "Request support for this site";
  body.appendChild(title);

  const sub = document.createElement("span");
  sub.className = "e-when";
  sub.textContent = "Opens a prefilled GitHub issue";
  body.appendChild(sub);

  btn.appendChild(body);

  btn.addEventListener("click", async () => {
    await chrome.tabs.create({ url, index: tab.index + 1 });
    window.close();
  });
  return btn;
}

// The fields that seed the source-request form: the page URL and title, plus
// any event details extraction managed to find. On an unsupported page that's
// often just the URL and title (no event was parsed), so the user completes
// the rest in the form itself.
function sourceRequestPrefill(tab, event) {
  event = event || {};
  return {
    url: tab.url || "",
    name: event.title || tab.title || "",
    start: event.start || "",
    end: event.end || "",
    timezone: event.ctz || "",
    location: event.location || "",
    description: event.description || "",
  };
}

// Build one event button. Each event is self-contained (title, start, end,
// location, description, ctz), so its Calendar URL is built directly.
function makeButton(event, tab) {
  const url = buildCalendarUrl({ ...event, title: event.title || tab.title }, tab);

  const btn = document.createElement("button");
  btn.className = "event-btn";

  // Left date chip (month + day), when we have a usable date.
  const chip = dateChip(event.start);
  if (chip) {
    const chipEl = document.createElement("span");
    chipEl.className = "e-date";

    const monthEl = document.createElement("span");
    monthEl.className = "e-month";
    monthEl.textContent = chip.month;
    chipEl.appendChild(monthEl);

    const dayEl = document.createElement("span");
    dayEl.className = "e-day";
    dayEl.textContent = chip.day;
    chipEl.appendChild(dayEl);

    btn.appendChild(chipEl);
  }

  const body = document.createElement("span");
  body.className = "e-body";

  const title = document.createElement("span");
  title.className = "e-title";
  title.textContent = event.title || tab.title || "New event";
  body.appendChild(title);

  const whenText = summarize(event);
  if (whenText) {
    const when = document.createElement("span");
    when.className = "e-when";
    when.textContent = whenText;
    body.appendChild(when);
  }

  btn.appendChild(body);

  btn.addEventListener("click", async () => {
    await chrome.tabs.create({ url, index: tab.index + 1 });
    window.close();
  });
  return btn;
}

// Second line of a button: the date/time, plus the location when there's one.
function summarize(event) {
  const when = formatWhen(event.start, event.end);
  if (event.location) return `${when} · ${event.location}`;
  return when;
}

// Parse an event start into a Date, or null when it's absent/unparseable. A
// bare YYYY-MM-DD (all-day) is anchored to local midnight so the day is right.
function eventStart(start) {
  if (!start) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return new Date(`${start}T00:00:00`);
  const date = new Date(start);
  return isNaN(date) ? null : date;
}

// The left date chip's two lines (short month + day-of-month), or null when
// there's no usable date — then the button shows just title + "when" text.
function dateChip(start) {
  const date = eventStart(start);
  if (!date) return null;
  return {
    month: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: String(date.getDate()),
  };
}

// Format a clock time, dropping ":00" for round hours ("10 AM", not
// "10:00 AM"; "6:30 PM" stays as-is).
function formatTime(date) {
  const opts = date.getMinutes() === 0 ? { hour: "numeric" } : { hour: "numeric", minute: "2-digit" };
  return date.toLocaleTimeString(undefined, opts);
}

// Human-readable date/time line for the popup (separate from
// formatDatesParam's Google Calendar URL encoding). The month/day live in the
// date chip, so this terse line carries just the time(s).
function formatWhen(start, end) {
  if (!start) return "No date found";

  const startDate = eventStart(start);
  if (!startDate) return start;

  // All-day event (date only): the date is in the chip, so just label it.
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return "All day";

  let text = formatTime(startDate);

  const endDate = end ? new Date(end) : null;
  if (endDate && !isNaN(endDate) && endDate > startDate) {
    text += ` – ${formatTime(endDate)}`;
  }

  return text;
}
