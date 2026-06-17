// Events view: turns the extracted events into the popup's cards. An event keeps
// its showings in times[] (the multi-instance model in
// pipeline/assemble-events.js); this module decides how those instances become
// cards and renders them. Loaded on demand by the popup controller (popup.js)
// via dynamic import().
//
// Aggregation (toCards): an event's instances are grouped BY MONTH (same
// calendar month and year). What a month becomes depends on its days:
//   - One day, one time -> a plain single-occurrence card (the whole card is
//     clickable, like an ordinary event).
//   - One day, two or more times -> a "same-day" card (NOT clickable) whose left
//     icon shows that date and whose buttons each open one of that day's times.
//   - A run of two or more CONSECUTIVE days with a single time each -> a
//     "multi-day" card (clickable): the icon shows the month over the day-range
//     (e.g. JUN / 5–7) and the line reads "Jun 5 – 7 · <location>".
//   - Whatever single-time days are left (scattered, non-consecutive) -> one
//     "month" card (NOT clickable): the icon shows the month over the spanned
//     day-range (JUN / 14–25) and a button per day (5, 14, 25). A lone leftover
//     day is just a single card.
// Cards still order by their earliest instance, so a month with a same-day card
// interleaved among scattered days can read out of strict day order — the
// month grouping is the deliberate trade.
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
// buildCalendarUrl can schedule exactly that showing). kind is "single",
// "sameDay", "multiDay", or "month".
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

// The card(s) for one month's worth of an event's instances. A month with a
// single day is the unchanged single/same-day card; a month spanning several
// days peels off each run of consecutive single-time days as a multi-day card
// and collects whatever single-time days remain into one month card (a lone
// leftover stays a single card).
function monthCards(event, instances) {
  const byDay = new Map();
  for (const it of instances) pushInto(byDay, dateKey(it.t.start), it);
  const days = [...byDay.keys()].sort();

  // One-day month: unchanged behavior (single occurrence, or a same-day card).
  if (days.length === 1) {
    const group = byDay.get(days[0]);
    return [{ event, kind: group.length >= 2 ? "sameDay" : "single", instances: group }];
  }

  const cards = [];
  const leftover = [];
  for (let i = 0; i < days.length; ) {
    const group = byDay.get(days[i]);
    if (group.length >= 2) {
      // A day with several times stays its own same-day card.
      cards.push({ event, kind: "sameDay", instances: group });
      i++;
      continue;
    }
    // A single-time day: extend a run of consecutive single-time days.
    let j = i;
    while (j + 1 < days.length && byDay.get(days[j + 1]).length === 1 && isNextDay(days[j], days[j + 1])) {
      j++;
    }
    if (j > i) {
      const run = days.slice(i, j + 1).map((d) => byDay.get(d)[0]);
      cards.push({ event, kind: "multiDay", instances: run });
    } else {
      leftover.push(group[0]);
    }
    i = j + 1;
  }

  if (leftover.length >= 2) cards.push({ event, kind: "month", instances: leftover });
  else if (leftover.length === 1) cards.push({ event, kind: "single", instances: leftover });

  return cards;
}

function pushInto(map, key, value) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

// Render one card descriptor into a DOM node. The calendar CHIP is the popup's
// single "addable event" motif: on a single occurrence or a multi-day run it's
// the date indicator and the WHOLE card is the click target; on a grouped card
// (same-day or month) each showing is its OWN chip BUTTON — a day chip per date
// (month card) or a time chip per showing (same-day card). `currentYear` decides
// which chips carry a year pill (any year but this one); it defaults to the real
// current year and is threaded down from render() so the UI snapshots can pin it.
export function renderCard(card, tab, currentYear = new Date().getFullYear()) {
  switch (card.kind) {
    case "single":
      return makeSingleCard(card.event, card.instances[0], tab, currentYear);
    case "multiDay":
      return makeMultiDayCard(card, tab, currentYear);
    case "month":
      // Scattered days. When they all share one time, that time leads the header
      // (commonTime) and each chip is a bare DAY chip (month banner + day). When
      // the days have DIFFERENT times, there's no header time to show, so each
      // chip becomes a TIME chip (date banner + that day's time) so no time is
      // lost. Days with any all-day/dateless session fall back to plain day chips.
      return makeGroupCard(
        card,
        tab,
        showPerDayTimes(card.instances)
          ? (it) => timeChip(it.t, currentYear)
          : (it) => dayChip(it.t.start, currentYear)
      );
    default: // "sameDay"
      // Several showings on one date: one TIME chip (date banner + time) each.
      return makeGroupCard(card, tab, (it) => timeChip(it.t, currentYear));
  }
}

// A single clickable event button. A calendar-style date chip on the left, then
// the title over a muted time (plus location); clicking opens the instance's
// Calendar template.
function makeSingleCard(event, it, tab, currentYear) {
  const url = buildCalendarUrl({ ...event, title: event.title || tab.title }, tab, it.i);

  const btn = document.createElement("button");
  btn.className = "event-btn";

  const chip = dayChip(it.t.start, currentYear);
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

  // Header: the title over the "when · where" line, full width. When every
  // session shares one time (a month card whose scattered dates all start — and
  // end — alike), that common time leads the line; otherwise just the location.
  const head = document.createElement("span");
  head.className = "e-group-head";
  head.appendChild(titleEl(event, tab));
  const detail = [commonTime(instances), event.location].filter(Boolean).join(" · ");
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

// The multi-day card: a run of consecutive single-time days read as one event,
// clickable like a single occurrence. The chip shows the month over the
// day-range; the line reads "Jun 5 – 7 · <location>". Clicking schedules one
// calendar event spanning the whole run.
function makeMultiDayCard(card, tab, currentYear) {
  const { event, instances } = card;
  const first = instances[0].t;
  const last = instances[instances.length - 1].t;
  const span = { ...event, title: event.title || tab.title, times: null, start: first.start, end: last.end || last.start, eventLengthInMinutes: null };
  const url = buildCalendarUrl(span, tab);

  const btn = document.createElement("button");
  btn.className = "event-btn";

  const chip = rangeChip(instances, currentYear);
  if (chip) btn.appendChild(chipEl(chip));

  const body = document.createElement("span");
  body.className = "e-body";
  body.appendChild(titleEl(event, tab));

  const when = document.createElement("span");
  when.className = "e-when";
  const range = formatDateRange(first.start, last.start);
  when.textContent = event.location ? `${range} · ${event.location}` : range;
  body.appendChild(when);

  btn.appendChild(body);
  btn.appendChild(goChevron());
  btn.addEventListener("click", () => openTemplate(url, tab));
  return btn;
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

// A trailing "tap to add" chevron for a whole-card button (single occurrence or
// multi-day run): the resting-state cue that the ENTIRE card is the click target,
// unlike a grouped card whose individual instance buttons are. Decorative, so
// it's hidden from assistive tech.
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
// context — a month, or a full date) over a prominent body (the pick — a day, a
// day-range, or a time). `kind` ("day" | "range" | "time") tunes the body font
// (see .e-chip-body.* in popup.css). An off-`currentYear` chip carries a small
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

// True when dayB (a "YYYY-MM-DD" key) is the calendar day right after dayA.
// Date.UTC arithmetic so it's immune to local-timezone/DST shifts.
function isNextDay(dayA, dayB) {
  const [y, m, d] = dayA.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const pad = (n) => String(n).padStart(2, "0");
  const key = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  return key === dayB;
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

// The chip for a month or multi-day card: the short month of the earliest
// instance over the spanned day-range ("14–25", or just "14" if they share a
// day). null when none of the instances has a usable date. (A card's instances
// are grouped by month AND year — see monthKey — so they share one year.)
export function monthRangeChip(instances, currentYear = new Date().getFullYear()) {
  const dates = instances.map((it) => eventStart(it.t.start)).filter(Boolean);
  if (!dates.length) return null;
  const dayNums = dates.map((d) => d.getDate());
  const min = Math.min(...dayNums);
  const max = Math.max(...dayNums);
  return {
    month: dates[0].toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: min === max ? String(min) : `${min}-${max}`,
    ...offYear(dates[0], currentYear),
  };
}

// --- Chip descriptors: map the tested chip data (dateChip / monthRangeChip /
// sameDayLabel) onto the { banner, body, kind } the chipEl renderer takes. ---

// A single day: month banner over the day-of-month body. Used as a single card's
// indicator and as each per-date button on a month card. null with no date.
function dayChip(start, currentYear) {
  const c = dateChip(start, currentYear);
  return c && { banner: c.month, body: c.day, kind: "day", year: c.year, yearPast: c.yearPast };
}

// A multi-day run: month banner over the day-range body ("5-7"), at a tighter
// "range" font. A lone shared day renders as a plain day chip. null with no date.
function rangeChip(instances, currentYear) {
  const c = monthRangeChip(instances, currentYear);
  return c && { banner: c.month, body: c.day, kind: /\D/.test(c.day) ? "range" : "day", year: c.year, yearPast: c.yearPast };
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

// The chip's year-pill fields when `date` falls outside `currentYear`: { year }
// plus `yearPast` true for a past year (rendered as a gray pill) vs false for a
// future one (an accent pill). An empty object for a current-year date, so the
// chip carries no `year` and shows no pill.
function offYear(date, currentYear) {
  const y = date.getFullYear();
  if (y === currentYear) return {};
  return { year: String(y), yearPast: y < currentYear };
}

// The "when" line for a multi-day card: "Jun 5 – 7" (same month) — the days the
// run spans, with no times (a multi-day run reads as one span, not a schedule).
export function formatDateRange(firstStart, lastStart) {
  const first = eventStart(firstStart);
  const last = eventStart(lastStart);
  if (!first) return "";
  const month = first.toLocaleDateString(undefined, { month: "short" });
  if (!last || last.getDate() === first.getDate()) return `${month} ${first.getDate()}`;
  return `${month} ${first.getDate()} – ${last.getDate()}`;
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
