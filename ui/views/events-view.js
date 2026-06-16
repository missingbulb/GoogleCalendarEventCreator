// Events view: turns the extracted events into the popup's cards. An event keeps
// its showings in times[] (the multi-instance model in
// pipeline/assemble-events.js); this module decides how those instances become
// cards and renders them. Loaded on demand by the popup controller (popup.js)
// via dynamic import().
//
// Aggregation (toCards): an event's instances are split into cards strictly BY
// DATE — one card per distinct day. A day with a single time is a plain
// single-occurrence card (the whole card is clickable, like an ordinary event);
// a day with two or more times is a "same-day" card (NOT itself clickable) whose
// left icon shows that date and whose buttons each open one of that day's
// showings. Because every card is a single day, cards order cleanly by date: no
// card spans several days, so none can jump ahead of a later one.
//
// `toCards` and `renderCard` are the controller's entry points; the pure display
// helpers (formatWhen, summarize, dateChip, sameDayLabel) are also exported for
// the unit tests and the UI-snapshot renderer.
import { buildCalendarUrl } from "../../pipeline/build-calendar-url.js";
import { GCalConfig } from "../../config.js";

// An event's instances (showings) — the times[] of the multi-instance model.
// A flat single-occurrence event ({ start, end, eventLengthInMinutes } on the
// object itself) is synthesized into one instance, so both shapes render.
function instancesOf(event) {
  if (Array.isArray(event.times) && event.times.length) return event.times;
  return [{ start: event.start, end: event.end, eventLengthInMinutes: event.eventLengthInMinutes }];
}

// Lexicographic start compare with empty/absent sorting last (matches the
// assembler's instance/event ordering).
function cmpStart(a, b) {
  if (!a) return b ? 1 : 0;
  if (!b) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

// Split every event's instances into card descriptors, ordered by date. A
// descriptor is { event, kind, instances } where instances is an array of
// { t, i } (the instance and its original index in event.times, so
// buildCalendarUrl can schedule exactly that showing). kind is "single" or
// "sameDay".
export function toCards(events) {
  const cards = events.flatMap(eventCards);
  for (const c of cards) c.instances.sort((a, b) => cmpStart(a.t.start, b.t.start));
  cards.sort((a, b) => cmpStart(earliest(a), earliest(b)));
  return cards;
}

function earliest(card) {
  return card.instances.reduce(
    (min, it) => (min === null || cmpStart(it.t.start, min) < 0 ? it.t.start : min),
    null
  );
}

// The card descriptors for one event: one card per distinct day. A day with a
// single time is a plain single card; a day with two or more times is a same-day
// card. Instances with no usable date render as plain single cards.
function eventCards(event) {
  const instances = instancesOf(event).map((t, i) => ({ t, i }));

  const byDate = new Map();
  const dateless = [];
  for (const it of instances) {
    const key = dateKey(it.t.start);
    if (!key) dateless.push(it);
    else pushInto(byDate, key, it);
  }

  const cards = [];
  for (const group of byDate.values()) {
    cards.push({ event, kind: group.length >= 2 ? "sameDay" : "single", instances: group });
  }
  for (const it of dateless) cards.push({ event, kind: "single", instances: [it] });

  return cards;
}

function pushInto(map, key, value) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

// Render one card descriptor into a DOM node: a clickable button for a single
// occurrence, or an unclickable grouped card with a button per showing.
export function renderCard(card, tab) {
  return card.kind === "single"
    ? makeSingleCard(card.event, card.instances[0], tab)
    : makeGroupCard(card, tab);
}

// A single clickable event button. A calendar-style date chip on the left, then
// the title over a muted time (plus location); clicking opens the instance's
// Calendar template.
function makeSingleCard(event, it, tab) {
  const url = buildCalendarUrl({ ...event, title: event.title || tab.title }, tab, it.i);

  const btn = document.createElement("button");
  btn.className = "event-btn";

  const chip = dateChip(it.t.start);
  if (chip) btn.appendChild(chipEl(chip));

  const body = document.createElement("span");
  body.className = "e-body";
  body.appendChild(titleEl(event, tab));

  const whenText = summarizeInstance(event, it.t);
  if (whenText) {
    const when = document.createElement("span");
    when.className = "e-when";
    when.textContent = whenText;
    body.appendChild(when);
  }

  btn.appendChild(body);
  btn.addEventListener("click", () => openTemplate(url, tab));
  return btn;
}

// The same-day card: an UNCLICKABLE container (no whole-card click target —
// unlike a single-occurrence card) with the title, the location, and a clickable
// button per showing on that day. The icon shows the shared date; each button
// shows a time.
function makeGroupCard(card, tab) {
  const { event, instances } = card;

  const cardEl = document.createElement("div");
  cardEl.className = "event-group";

  const icon = dateChip(instances[0].t.start);
  if (icon) cardEl.appendChild(chipEl(icon));

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
  for (const it of instances) {
    list.appendChild(instanceButton(event, it, sameDayLabel(it.t), tab));
  }
  body.appendChild(list);

  cardEl.appendChild(body);
  return cardEl;
}

// One small clickable button for a single instance inside a grouped card.
function instanceButton(event, it, label, tab) {
  const url = buildCalendarUrl({ ...event, title: event.title || tab.title }, tab, it.i);
  const btn = document.createElement("button");
  btn.className = "instance-btn";
  btn.textContent = label;
  btn.addEventListener("click", () => openTemplate(url, tab));
  return btn;
}

async function openTemplate(url, tab) {
  await chrome.tabs.create({ url, index: tab.index + 1 });
  window.close();
}

// The button label inside a same-day card: the time (range), or "All day".
export function sameDayLabel(instance) {
  return timeRange(instance) || "All day";
}

// Second line of a single-occurrence button: the date/time, plus the location
// when there's one.
export function summarize(event) {
  return summarizeInstance(event, instancesOf(event)[0]);
}

function summarizeInstance(event, instance) {
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

// Build the left date-chip element from { month, day }.
function chipEl({ month, day }) {
  const el = document.createElement("span");
  el.className = "e-date";

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
// or "" for an all-day/dateless instance (used in the same-day card buttons,
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
