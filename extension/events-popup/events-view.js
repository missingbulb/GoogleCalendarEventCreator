// Events view: turns the extracted events into the popup's cards. An event keeps
// its showings in times[] (the multi-instance model in
// event-extractors/assemble-events.js); this module decides how those instances become
// cards and renders them. Loaded on demand by the popup controller (popup.js)
// via dynamic import().
//
// Aggregation (toCards): an event's instances are grouped BY MONTH (same
// calendar month and year). Instances are NEVER merged — a card built from X
// instances always exposes X addable buttons (a genuinely multi-day event is a
// SINGLE instance whose start/end span days, shown as a range; it is not N
// separate dates collapsed into one). A month with a single showing is a plain
// single-occurrence card (the whole card is clickable, like an ordinary event);
// a month with two or more showings is one "month" card (NOT clickable): a
// title/location header (plus a shared time when every showing shares one) over a
// button per showing. A day with two or more showings keeps a button per showing
// in that same card — showings are never peeled off into their own card.
//
// `toCards` and `renderCard` are the controller's entry points; the pure display
// helpers (formatWhen, summarize, dateChip, sameDayLabel) are also exported for
// the unit tests and the UI-snapshot renderer.
import { buildCalendarUrl } from "./build-calendar-url.js";
import { GCalConfig } from "../config.js";

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
// "month" (a grouped card).
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

// The card descriptors for one event: its dated instances are grouped by month
// (see monthCards), and any instance with no usable date renders as its own
// plain single card.
function eventCards(event) {
  const instances = instancesOf(event).map((t, i) => ({ t, i }));

  const byMonth = new Map();
  const dateless = [];
  for (const it of instances) {
    const key = monthKey(it.t.start);
    if (!key) dateless.push(it);
    else pushInto(byMonth, key, it);
  }

  const cards = [];
  for (const group of byMonth.values()) cards.push(...monthCards(event, group));
  for (const it of dateless) cards.push({ event, kind: "single", instances: [it] });

  return cards;
}

// The single card for one month's worth of an event's instances: a "single" card
// when there's just one showing, otherwise one "month" card holding EVERY showing
// that month as its own button (a day with two showings contributes two buttons —
// showings are never peeled off into a separate card). Instances are never merged.
function monthCards(event, instances) {
  if (instances.length === 1) return [{ event, kind: "single", instances }];
  return [{ event, kind: "month", instances }];
}

function pushInto(map, key, value) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

// Render one card descriptor into a DOM node. The calendar CHIP is the popup's
// single "addable event" motif: on a single occurrence it's the date indicator
// and the WHOLE card is the click target; on a grouped card (same-day or month)
// each showing is its OWN chip BUTTON — a day chip per date (month card) or a
// time chip per showing (same-day card). `currentYear` decides which chips carry
// a year pill (any year but this one); it defaults to the real current year and
// is threaded down from render() so the UI snapshots can pin it.
export function renderCard(card, tab, currentYear = new Date().getFullYear()) {
  if (card.kind === "single") {
    return makeSingleCard(card.event, card.instances[0], tab, currentYear);
  }
  // A grouped "month" card: every showing that month as its own chip button.
  // When the showings all share one time, that time leads the header (commonTime)
  // and each chip is a bare DAY chip (month banner + day). When they have
  // DIFFERENT times — including two showings on the same day — there's no header
  // time to show, so each chip becomes a TIME chip (date banner + that showing's
  // time) so the showings are told apart. Any all-day/dateless session falls back
  // to plain day chips.
  const preferTime = showPerDayTimes(card.instances);
  return makeGroupCard(card, tab, (it) => chipForInstance(it.t, currentYear, preferTime));
}

// A single clickable event button. A calendar-style date chip on the left, then
// the title over a muted time (plus location); clicking opens the instance's
// Calendar template.
function makeSingleCard(event, it, tab, currentYear) {
  const url = buildCalendarUrl({ ...event, title: event.title || tab.title }, tab, it.i);

  const btn = document.createElement("button");
  btn.className = "event-btn";

  const chip = chipForInstance(it.t, currentYear, false);
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
  btn.appendChild(goChevron());
  btn.addEventListener("click", () => openTemplate(url, tab));
  return btn;
}

// A grouped card: an UNCLICKABLE container for an event with several showings —
// a title/location header over a centered, full-width row of per-instance
// calendar-chip BUTTONS (built by `chipFor`). There is NO left indicator icon:
// the instance chips ARE the calendar visuals here (a day chip per date on a
// month card, a time chip per showing on a same-day card), so the same chip
// motif marks the addable events whether the card is one whole-card button or a
// row of several.
function makeGroupCard(card, tab, chipFor) {
  const { event, instances } = card;

  const cardEl = document.createElement("div");
  cardEl.className = "event-group";

  // Header: the title over the "when · where" line, full width. A leading time
  // label (groupHeaderTime) precedes the location when one fits — the shared time
  // when every session starts (and ends) alike, or "All day" when every session
  // is all-day; otherwise just the location.
  const head = document.createElement("span");
  head.className = "e-group-head";
  head.appendChild(titleEl(event, tab));
  const detail = [groupHeaderTime(instances), event.location].filter(Boolean).join(" · ");
  if (detail) {
    const loc = document.createElement("span");
    loc.className = "e-when";
    loc.textContent = detail;
    head.appendChild(loc);
  }
  cardEl.appendChild(head);

  // The instance chip-buttons: a wrapping, centered, full-width row.
  const list = document.createElement("span");
  list.className = "e-instances";
  for (const it of instances) {
    list.appendChild(chipButton(event, it, chipFor(it), tab));
  }
  cardEl.appendChild(list);

  return cardEl;
}

// One instance rendered AS a clickable calendar chip — a grouped card's button.
// Same chip motif as a single card's date indicator, so "an event you can add"
// looks the same whether it's a whole card or one of several buttons.
function chipButton(event, it, chip, tab) {
  const url = buildCalendarUrl({ ...event, title: event.title || tab.title }, tab, it.i);
  const btn = document.createElement("button");
  btn.className = "chip-btn";
  btn.appendChild(chipEl(chip));
  btn.addEventListener("click", () => openTemplate(url, tab));
  return btn;
}

// A trailing "tap to add" chevron for a whole-card button (a single occurrence):
// the resting-state cue that the ENTIRE card is the click target, unlike a
// grouped card whose individual instance buttons are. Decorative, so it's hidden
// from assistive tech.
function goChevron() {
  const el = document.createElement("span");
  el.className = "e-go";
  el.textContent = "›";
  el.setAttribute("aria-hidden", "true");
  return el;
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

// Build a calendar chip from a descriptor { banner, body, kind, year?, yearPast? }
// — the popup's single "addable event" motif: a colored banner (the shared
// context — a month, or a full date) over a prominent body (the pick — a day or
// a time). `kind` ("day" | "time") tunes the body font (see .e-chip-body.* in
// popup.css). An off-`currentYear` chip carries a small
// year pill stacked on its corner (then the chip is wrapped so the pill can sit
// over it); a current-year chip returns the bare chip.
function chipEl({ banner, body, kind = "day", year, yearPast }) {
  const el = document.createElement("span");
  el.className = "e-chip";

  const bannerEl = document.createElement("span");
  bannerEl.className = "e-chip-banner";
  bannerEl.textContent = banner;
  el.appendChild(bannerEl);

  const bodyEl = document.createElement("span");
  bodyEl.className = `e-chip-body ${kind}`;
  bodyEl.textContent = body;
  el.appendChild(bodyEl);

  if (!year) return el;

  const wrap = document.createElement("span");
  wrap.className = "e-cal";
  wrap.appendChild(el);
  const yearEl = document.createElement("span");
  yearEl.className = yearPast ? "e-year past" : "e-year future";
  yearEl.textContent = year;
  wrap.appendChild(yearEl);
  return wrap;
}

// The instance's effective end as a Date: its explicit end, or start +
// eventLengthInMinutes for a timed instance, else null.
function effectiveEnd(instance) {
  if (instance.end) {
    const d = new Date(floatLocal(instance.end));
    return isNaN(d) ? null : d;
  }
  if (instance.eventLengthInMinutes != null && instance.start && !isAllDay(instance.start)) {
    const s = eventStart(instance.start);
    if (s) return new Date(s.getTime() + instance.eventLengthInMinutes * 60000);
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

// The month a start falls in, as a grouping key ("YYYY-MM"). Includes the year
// so the same month in different years never merges into one card. "" when
// there's no usable start.
function monthKey(start) {
  const key = dateKey(start);
  return key ? key.slice(0, 7) : "";
}

// Strip a trailing UTC offset (`+01:00`) or `Z` from a timed value so it parses
// as floating local time — a PRESENTATION-only step. The card/button should show
// the wall-clock time as written on the page (e.g. 21:00 from
// `2026-12-07T21:00:00+01:00`), not re-zoned to the runtime's timezone by
// toLocale*. This mirrors GCal.localizeToZone but needs no tz: it keeps the
// literal clock digits. The Calendar URL still gets the original instant (the
// `ctz` param places it) — build-calendar-url.js is untouched. All-day,
// already-floating, and empty values pass through unchanged.
function floatLocal(value) {
  if (typeof value !== "string") return value;
  return value.replace(/(?:Z|[+-]\d{2}:?\d{2})$/i, "");
}

// Parse an event start into a Date, or null when it's absent/unparseable. A
// bare YYYY-MM-DD (all-day) is anchored to local midnight so the day is right.
// A timed value's offset/Z is stripped first (see floatLocal) so the displayed
// time/day match the page rather than the runtime's timezone.
function eventStart(start) {
  if (!start) return null;
  if (isAllDay(start)) return new Date(`${start}T00:00:00`);
  const date = new Date(floatLocal(start));
  return isNaN(date) ? null : date;
}

// The left date chip's two lines (short month + day-of-month), or null when
// there's no usable date — then the button shows just title + "when" text. A
// chip whose year isn't `currentYear` also carries that year (rendered as a pill
// on top of the calendar icon); a current-year chip omits it.
export function dateChip(start, currentYear = new Date().getFullYear()) {
  const date = eventStart(start);
  if (!date) return null;
  return {
    month: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: String(date.getDate()),
    ...offYear(date, currentYear),
  };
}

// --- Chip descriptors: map the tested chip data (dateChip / sameDayLabel) onto
// the { banner, body, kind } the chipEl renderer takes. ---

// A single day: month banner over the day-of-month body. Used as a single card's
// indicator and as each per-date button on a month card. null with no date.
function dayChip(start, currentYear) {
  const c = dateChip(start, currentYear);
  return c && { banner: c.month, body: c.day, kind: "day", year: c.year, yearPast: c.yearPast };
}

// One showing among several on the same date: the DATE is the banner (the shared
// context) and the TIME is the body (what tells the showings apart) — e.g.
// "JUN 19" over "4:30 PM – 6:18 PM". Falls back to a bare time when undated.
function timeChip(instance, currentYear) {
  const c = dateChip(instance.start, currentYear);
  return {
    banner: c ? `${c.month} ${c.day}` : "",
    body: sameDayLabel(instance),
    kind: "time",
    year: c && c.year,
    yearPast: c && c.yearPast,
  };
}

// The end of an instance as a Date, parsed the SAME way as the start so an all-day
// end (a bare YYYY-MM-DD) anchors to LOCAL midnight (not UTC) and lands on the
// right day: an explicit end first, else the duration-derived end (effectiveEnd),
// else null.
function instanceEndDate(instance) {
  if (instance.end) return eventStart(instance.end);
  return effectiveEnd(instance);
}

// True when a single instance spans 2+ distinct calendar days (its end falls on a
// later day than its start) — a genuinely multi-day event (an all-day run, or a
// timed event crossing midnight). It stays ONE card/button showing a date RANGE,
// never split per day.
function isMultiDaySpan(instance) {
  const s = eventStart(instance.start);
  const e = instanceEndDate(instance);
  if (!s || !e) return false;
  return e.getFullYear() !== s.getFullYear() || e.getMonth() !== s.getMonth() || e.getDate() !== s.getDate();
}

// A date-RANGE chip for a multi-day span: the month(s) as the banner over the day
// range as the body — "SEP" over "15–18" within one month, "JUN–JUL" over "28–3"
// across months. The off-year pill (if any) follows the START year.
function rangeChip(instance, currentYear) {
  const s = eventStart(instance.start);
  const e = instanceEndDate(instance);
  if (!s || !e) return null;
  const mon = (d) => d.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  const sMon = mon(s);
  const eMon = mon(e);
  const sameMonth = sMon === eMon && s.getFullYear() === e.getFullYear();
  return {
    banner: sameMonth ? sMon : `${sMon}–${eMon}`,
    body: `${s.getDate()}–${e.getDate()}`,
    kind: "range",
    ...offYear(s, currentYear),
  };
}

// The chip for one instance: a date-range chip for a multi-day span, else a time
// chip (when the card shows per-showing times) or a plain day chip. Used by both a
// single card's indicator and a grouped card's per-instance buttons, so a span
// renders identically whether it stands alone or sits among other showings.
function chipForInstance(instance, currentYear, preferTime) {
  if (isMultiDaySpan(instance)) return rangeChip(instance, currentYear);
  if (preferTime) return timeChip(instance, currentYear);
  return dayChip(instance.start, currentYear);
}

// The chip's year-pill fields when `date` falls outside `currentYear`: { year }
// plus `yearPast` true for a past year (rendered as a gray pill) vs false for a
// future one (an accent pill). An empty object for a current-year date, so the
// chip carries no `year` and shows no pill.
function offYear(date, currentYear) {
  const y = date.getFullYear();
  if (y === currentYear) return {};
  return { year: String(y), yearPast: y < currentYear };
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

// The time a group card's sessions all share, for the header above the icons —
// only when EVERY instance is timed and resolves to the same time(s)
// (e.g. scattered dates that all start at 7 PM). "" when the sessions differ, or
// any is all-day/dateless (no single time to show), so the header then carries
// just the location, unchanged. A same-day card's instances have distinct times
// by construction, so this naturally yields "" there — the time lives on each
// chip instead.
export function commonTime(instances) {
  const times = instances.map((it) => timeRange(it.t));
  if (times.some((t) => !t)) return "";
  return times.every((t) => t === times[0]) ? times[0] : "";
}

// The label that leads a grouped card's header line, before the location: the
// shared time when every showing has one (commonTime), else "All day" when EVERY
// showing is all-day (so an all-day month card reads "All day · <location>", like
// a single all-day card's line — #441), else "" when the showings differ or mix
// timed with all-day (no single label fits; each chip then carries its own time).
export function groupHeaderTime(instances) {
  const shared = commonTime(instances);
  if (shared) return shared;
  return instances.every((it) => it.t.start && isAllDay(it.t.start)) ? "All day" : "";
}

// True when a month card's days carry DIFFERENT times that all deserve showing:
// every session is timed (no all-day/dateless one to muddy it) and they aren't
// all the same time. Then each chip shows its day's own time (a time chip)
// rather than a bare day; a shared time goes in the header via commonTime
// instead, and a mix with an all-day session keeps plain day chips.
export function showPerDayTimes(instances) {
  const times = instances.map((it) => timeRange(it.t));
  if (times.some((t) => !t)) return false;
  return !times.every((t) => t === times[0]);
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

  // `end` may be a string (with an offset/Z to strip) or an already-floating
  // Date from effectiveEnd; floatLocal passes a Date through untouched.
  const endDate = end ? new Date(floatLocal(end)) : null;
  if (endDate && !isNaN(endDate) && endDate > startDate) {
    text += ` – ${formatTime(endDate)}`;
  }

  return text;
}
