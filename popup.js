// Popup: runs the extractor in the active tab and shows one button per
// distinct event found. Clicking a button opens that event's pre-filled
// Google Calendar template in a new tab.
(async () => {
  const headingEl = document.getElementById("heading");
  const eventsEl = document.getElementById("events");
  const emptyEl = document.getElementById("empty");

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

  const events = data.events && data.events.length ? data.events : [];

  if (!events.length) {
    // Nothing structured found; still let the user create an event seeded
    // from the tab title.
    headingEl.textContent = "Add to Google Calendar";
    emptyEl.hidden = false;
    eventsEl.appendChild(makeButton({ title: tab.title || "New event" }, tab));
    return;
  }

  headingEl.textContent =
    events.length > 1 ? `${events.length} events on this page` : "Add to Google Calendar";

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

  const title = document.createElement("span");
  title.className = "e-title";
  title.textContent = event.title || tab.title || "New event";
  btn.appendChild(title);

  const whenText = summarize(event);
  if (whenText) {
    const when = document.createElement("span");
    when.className = "e-when";
    when.textContent = whenText;
    btn.appendChild(when);
  }

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

// Human-readable summary of the extracted date/time for the popup (separate
// from formatDatesParam's Google Calendar URL encoding).
function formatWhen(start, end) {
  if (!start) return "No date found";

  const dateOpts = { weekday: "short", year: "numeric", month: "short", day: "numeric" };

  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return new Date(`${start}T00:00:00`).toLocaleDateString(undefined, dateOpts);
  }

  const startDate = new Date(start);
  if (isNaN(startDate)) return start;

  const timeOpts = { hour: "numeric", minute: "2-digit" };
  let text = `${startDate.toLocaleDateString(undefined, dateOpts)}, ${startDate.toLocaleTimeString(undefined, timeOpts)}`;

  const endDate = end ? new Date(end) : null;
  if (endDate && !isNaN(endDate) && endDate > startDate) {
    text += ` – ${endDate.toLocaleTimeString(undefined, timeOpts)}`;
  }

  return text;
}
