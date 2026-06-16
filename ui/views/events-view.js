// Events view: renders one card per extracted event. A single-occurrence event
// is a clickable button that opens its pre-filled Google Calendar template; a
// multi-instance event (a showing with several dates/times — the times[] model
// in pipeline/assemble-events.js) is an UNCLICKABLE card holding one small
// clickable button per instance, each opening that instance's template.
//
// An ES module, loaded on demand by the popup controller (popup.js) via
// dynamic import() when there are events to show. `makeEventCard` is the
// controller's entry point; the pure display helpers (formatWhen, summarize,
// dateChip, instanceLabel) are also exported for the unit tests and the
// UI-snapshot renderer.
import { buildCalendarUrl } from "../../pipeline/build-calendar-url.js";
import { GCalConfig } from "../../config.js";

// An event's instances (showings) — the times[] of the multi-instance model.
// A flat single-occurrence event ({ start, end, eventLengthInMinutes } on the
// object itself) is synthesized into one instance, so both shapes render.
function instancesOf(event) {
  if (Array.isArray(event.times) && event.times.length) return event.times;
  return [{ start: event.start, end: event.end, eventLengthInMinutes: event.eventLengthInMinutes }];
}

// Top-level entry: build the card for one event. Single instance -> a clickable
// button; several instances -> a grouped card with a button per instance.
export function makeEventCard(event, tab) {
  const times = instancesOf(event);
  return times.length > 1 ? makeGroup(event, times, tab) : makeButton(event, tab);
}

// One clickable event button (the single-instance card). A calendar-style date
// chip on the left, then the title over a muted time (plus location) on the
// right; clicking opens the event's Calendar template.
export function makeButton(event, tab) {
  const instance = instancesOf(event)[0];
  const url = buildCalendarUrl({ ...event, title: event.title || tab.title }, tab, 0);

  const btn = document.createElement("button");
  btn.className = "event-btn";

  const chip = dateChip(instance.start);
  if (chip) btn.appendChild(chipEl(chip));

  const body = document.createElement("span");
  body.className = "e-body";
  body.appendChild(titleEl(event, tab));

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

// The multi-instance card: an unclickable container with the title, the
// location, and one small clickable button per instance. Instances are
// aggregated by DATE for the left icon: when every instance falls on the SAME
// day the icon shows that date and the instance buttons show their times; when
// the instances span SEVERAL days the icon is a question mark and the buttons
// show their dates (with the time appended when there is one).
function makeGroup(event, times, tab) {
  const card = document.createElement("div");
  card.className = "event-group";

  const multiDate = distinctDates(times).length > 1;

  const chip = multiDate ? { month: "", day: "?", unknown: true } : dateChip(times[0].start);
  if (chip) card.appendChild(chipEl(chip));

  const body = document.createElement("span");
  body.className = "e-body";
  body.appendChild(titleEl(event, tab));

  if (event.location) {
    const loc = document.createElement("span");
    loc.className = "e-when";
    loc.textContent = event.location;
    body.appendChild(loc);
  }

  const list = document.createElement("span");
  list.className = "e-instances";
  times.forEach((instance, i) => list.appendChild(instanceButton(event, instance, i, multiDate, tab)));
  body.appendChild(list);

  card.appendChild(body);
  return card;
}

// One small clickable button for a single instance inside a grouped card.
function instanceButton(event, instance, index, multiDate, tab) {
  const url = buildCalendarUrl({ ...event, title: event.title || tab.title }, tab, index);
  const btn = document.createElement("button");
  btn.className = "instance-btn";
  btn.textContent = instanceLabel(instance, multiDate);
  btn.addEventListener("click", async () => {
    await chrome.tabs.create({ url, index: tab.index + 1 });
    window.close();
  });
  return btn;
}

// The label on a grouped card's instance button. When the card spans several
// dates the date leads (so the buttons distinguish themselves by day), with the
// time appended for a timed instance; when every instance shares one date the
// date is already in the icon, so the button shows just the time (range).
export function instanceLabel(instance, multiDate) {
  const start = instance.start;
  if (!start) return "TBD";
  const date = eventStart(start);
  const allDay = isAllDay(start);
  if (multiDate) {
    const dateStr = date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : start;
    return allDay ? dateStr : `${dateStr} · ${formatTime(date)}`;
  }
  return timeRange(instance) || "All day";
}

// Second line of a single-instance button: the date/time, plus the location
// when there's one.
export function summarize(event) {
  const instance = instancesOf(event)[0];
  const when = formatWhen(instance.start, effectiveEnd(instance));
  if (event.location) return `${when} · ${event.location}`;
  return when;
}

// The title span shared by every card.
function titleEl(event, tab) {
  const el = document.createElement("span");
  el.className = "e-title";
  el.textContent = event.title || tab.title || GCalConfig.fallbackEventTitle;
  return el;
}

// Build the left date-chip element from { month, day } (or the { unknown }
// question-mark variant for a multi-date group).
function chipEl({ month, day, unknown }) {
  const el = document.createElement("span");
  el.className = unknown ? "e-date unknown" : "e-date";

  const monthEl = document.createElement("span");
  monthEl.className = "e-month";
  monthEl.textContent = month;
  el.appendChild(monthEl);

  const dayEl = document.createElement("span");
  dayEl.className = "e-day";
  dayEl.textContent = day;
  el.appendChild(dayEl);

  return el;
}

// The instance's effective end as a Date: its explicit end, or start +
// eventLengthInMinutes for a timed instance, else null.
function effectiveEnd(instance) {
  if (instance.end) {
    const d = new Date(instance.end);
    return isNaN(d) ? null : d;
  }
  if (instance.eventLengthInMinutes != null && instance.start && !isAllDay(instance.start)) {
    const s = new Date(instance.start);
    if (!isNaN(s)) return new Date(s.getTime() + instance.eventLengthInMinutes * 60000);
  }
  return null;
}

// True for a date-only (all-day) start.
function isAllDay(start) {
  return /^\d{4}-\d{2}-\d{2}$/.test(start);
}

// The day a start falls on, as a grouping key (the date for an all-day value,
// the date portion for a timed one). "" when there's no usable start.
function dateKey(start) {
  if (!start) return "";
  return isAllDay(start) ? start : start.slice(0, 10);
}

// The distinct days an event's instances fall on — what decides whether the
// group icon is a shared date or a question mark.
function distinctDates(times) {
  return [...new Set(times.map((t) => dateKey(t.start)).filter(Boolean))];
}

// Parse an event start into a Date, or null when it's absent/unparseable. A
// bare YYYY-MM-DD (all-day) is anchored to local midnight so the day is right.
function eventStart(start) {
  if (!start) return null;
  if (isAllDay(start)) return new Date(`${start}T00:00:00`);
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

// The time (range) for a timed instance — "6:30 PM" or "6:30 PM – 8:30 PM" —
// or "" for an all-day/dateless instance (used in the same-date group buttons,
// where the date lives in the icon).
function timeRange(instance) {
  const start = instance.start;
  if (!start || isAllDay(start)) return "";
  const startDate = eventStart(start);
  if (!startDate) return "";
  let text = formatTime(startDate);
  const end = effectiveEnd(instance);
  if (end && end > startDate) text += ` – ${formatTime(end)}`;
  return text;
}

// Human-readable date/time line for the popup (separate from
// formatDatesParam's Google Calendar URL encoding). The month/day live in the
// date chip, so this terse line carries just the time(s). `end` may be a string
// or a Date (from effectiveEnd).
export function formatWhen(start, end) {
  if (!start) return "No date found";

  const startDate = eventStart(start);
  if (!startDate) return start;

  // All-day event (date only): the date is in the chip, so just label it.
  if (isAllDay(start)) return "All day";

  let text = formatTime(startDate);

  const endDate = end ? new Date(end) : null;
  if (endDate && !isNaN(endDate) && endDate > startDate) {
    text += ` – ${formatTime(endDate)}`;
  }

  return text;
}
