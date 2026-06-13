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

  const allEvents = data.events && data.events.length ? data.events : [];
  const events = allEvents.slice(0, MAX_EVENTS);

  if (!events.length) {
    // Nothing found on the page: show no buttons, just say so.
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

// Human-readable date/time line for the popup (separate from
// formatDatesParam's Google Calendar URL encoding). The month/day live in the
// date chip, so this line carries the weekday and time(s).
function formatWhen(start, end) {
  if (!start) return "No date found";

  const startDate = eventStart(start);
  if (!startDate) return start;

  const weekday = startDate.toLocaleDateString(undefined, { weekday: "short" });

  // All-day event (date only, no time): just the weekday.
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return weekday;

  const timeOpts = { hour: "numeric", minute: "2-digit" };
  let text = `${weekday} ${startDate.toLocaleTimeString(undefined, timeOpts)}`;

  const endDate = end ? new Date(end) : null;
  if (endDate && !isNaN(endDate) && endDate > startDate) {
    text += ` – ${endDate.toLocaleTimeString(undefined, timeOpts)}`;
  }

  return text;
}
