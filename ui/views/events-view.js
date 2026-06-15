// Events view: renders one button per extracted event. Clicking a button opens
// that event's pre-filled Google Calendar template in a new tab.
//
// An ES module, loaded on demand by the popup controller (popup.js) via
// dynamic import() when the page is on a supported host. `makeButton` is the
// controller's entry point; the pure display helpers (formatWhen, summarize,
// dateChip) are also exported for the UI-snapshot renderer.
import { buildCalendarUrl } from "../../pipeline/build-calendar-url.js";
import { GCalConfig } from "../../config.js";

// Build one event button. Each event is self-contained (title, start, end,
// location, description, ctz), so its Calendar URL is built directly.
export function makeButton(event, tab) {
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
  title.textContent = event.title || tab.title || GCalConfig.fallbackEventTitle;
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
export function summarize(event) {
  let effectiveEnd = event.end;
  if (!effectiveEnd && event.eventLengthInMinutes != null && event.start && !/^\d{4}-\d{2}-\d{2}$/.test(event.start)) {
    const startDate = new Date(event.start);
    if (!isNaN(startDate)) effectiveEnd = new Date(startDate.getTime() + event.eventLengthInMinutes * 60000);
  }
  const when = formatWhen(event.start, effectiveEnd);
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
export function dateChip(start) {
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
export function formatWhen(start, end) {
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
