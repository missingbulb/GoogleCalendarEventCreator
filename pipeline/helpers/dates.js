// Date helpers: normalize raw datetime attributes / JSON-LD values, and scan
// free-form text for the first date (optionally with a time), all reduced to
// the extractor's start/end string contract:
//   "YYYY-MM-DD"                  -> all-day event
//   "YYYY-MM-DDTHH:MM[:SS]"       -> floating local time
//   full ISO with offset or "Z"   -> exact instant
//
// Uses GCal.clean (helpers/dom.js) at call time. Augments globalThis.GCal
// (never replaces it) so load order can't clobber another file's contributions.
globalThis.GCal = Object.assign(globalThis.GCal || {}, (() => {
  const MONTH =
    "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const TIME = "\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)|\\d{1,2}:\\d{2}";
  // Punctuation or connector words that can sit between a date and the time
  // after it, seen across sites: "June 14, 2026 at 7 PM", "16 June 2026 | 6:30 pm",
  // "14 Jun • 19:00", "Jun 14 2026 - 7 PM". One list so every date pattern below
  // (and the cleanup that hands the match to Date()) recognize the same set,
  // instead of each re-listing a slightly different subset.
  const SEP = "(?:,|\\||·|•|@|—|–|-|at|from)";

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  // Convert a Date plus a "did the source include a clock time" flag into the
  // string contract above. Floating local time is used so the calendar
  // template shows the same wall-clock time the page did.
  function dateToString(d, hasTime) {
    const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return hasTime ? `${day}T${pad(d.getHours())}:${pad(d.getMinutes())}:00` : day;
  }

  // Normalize a raw datetime attribute / JSON-LD value to the string contract.
  function normalizeDateValue(raw) {
    raw = GCal.clean(raw);
    if (!raw) return "";
    if (/^\d{12,}$/.test(raw)) {
      // epoch milliseconds (Meetup historically used these in datetime attrs)
      const d = new Date(Number(raw));
      return isNaN(d) ? "" : d.toISOString();
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; // date only -> all-day
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(raw)) {
      return raw.replace(" ", "T"); // already ISO-ish; keep any offset/Z as-is
    }
    return parseDateFromText(raw);
  }

  // Find the first date (optionally with a time) inside free-form text and
  // return it in the string contract. Returns "" when nothing matches.
  function parseDateFromText(s) {
    s = GCal.clean(s);
    if (!s) return "";

    const isoMatch = s.match(/\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?/);
    if (isoMatch) return normalizeIso(isoMatch[0]);

    // Day-first numeric dates with "." or "-" separators ("15.6.2026",
    // "18-06-2026", "15.6.2026 19:00") — the everyday format outside the US,
    // which the English-only patterns below (built on V8's Date parsing) miss.
    // ("/" stays month-first American, handled in the patterns below.) Built
    // straight from the parts, read day-first, with an optional adjacent time. A
    // backreference pins both separators to the same character, and (?<!\d)…(?!\d)
    // (not \b) so an abutting letter is fine — block elements concatenate without
    // spaces in body text ("Night15.6.2026") — while a neighbouring digit (part
    // of a longer number) rules it out. matchAll lets an out-of-range leading
    // candidate ("50-12-2026") be skipped to reach a real date later in the text.
    for (const m of s.matchAll(
      new RegExp(`(?<!\\d)(\\d{1,2})([.\\-])(\\d{1,2})\\2(\\d{4})(?!\\d)(?:\\s*${SEP}?\\s*(\\d{1,2}):(\\d{2}))?`, "g")
    )) {
      const dd = +m[1];
      const mm = +m[3];
      if (dd < 1 || dd > 31 || mm < 1 || mm > 12) continue;
      const day = `${m[4]}-${pad(mm)}-${pad(dd)}`;
      return m[5] != null ? `${day}T${pad(+m[5])}:${m[6]}:00` : day;
    }

    // Hebrew month names, day-first: "4 ביולי 2026" / "4 ביולי 2026•21:00"
    // Widely used across Israeli websites. Built from parts (V8 can't parse Hebrew
    // month names with new Date()), mirroring the day-first numeric path above.
    const HEB = {
      ינואר: 1, פברואר: 2, מרץ: 3, אפריל: 4, מאי: 5, יוני: 6,
      יולי: 7, אוגוסט: 8, ספטמבר: 9, אוקטובר: 10, נובמבר: 11, דצמבר: 12,
    };
    // ב? absorbs the Hebrew preposition "in" that appears before months in dates
    // ("4 ביולי" = "4 in-July"); the capturing group captures the month alone for HEB[].
    const HEB_MONTH = "ב?(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)";
    for (const m of s.matchAll(
      new RegExp(`(?<!\\d)(\\d{1,2})\\s+${HEB_MONTH}\\s+(\\d{4})(?!\\d)(?:\\s*${SEP}?\\s*(${TIME}))?`, "g")
    )) {
      const dd = +m[1];
      const mm = HEB[m[2]];
      const yyyy = +m[3];
      if (dd < 1 || dd > 31 || !mm) continue;
      const day = `${yyyy}-${pad(mm)}-${pad(dd)}`;
      if (m[4] == null) return day;
      const tm = timeToMinutes(m[4]);
      if (tm == null) return day;
      return `${day}T${pad(Math.floor(tm / 60))}:${pad(tm % 60)}:00`;
    }

    const patterns = [
      // "June 14, 2026 at 7:00 PM" / "Jun 14 2026, 19:00" / "June 14, 2026 from 7 PM"
      new RegExp(`${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}(?:\\s*${SEP}?\\s*(${TIME}))?`, "i"),
      // "14 June 2026 at 7 PM"
      new RegExp(`\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\.?,?\\s+\\d{4}(?:\\s*${SEP}?\\s*(${TIME}))?`, "i"),
      // "Sunday, June 14 at 7 PM" (no year -> assume nearest upcoming)
      new RegExp(`${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:\\s*${SEP}\\s*(${TIME}))`, "i"),
      // "6/14/2026 7:00 PM"
      new RegExp(`\\d{1,2}/\\d{1,2}/\\d{4}(?:\\s*${SEP}?\\s*(${TIME}))?`, "i"),
    ];

    for (let i = 0; i < patterns.length; i++) {
      const m = s.match(patterns[i]);
      if (!m) continue;
      let candidate = m[0]
        .replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1")
        .replace(new RegExp(`\\s+${SEP}\\s+`, "gi"), " ")
        .replace(/,\s*(\d{1,2}[:\s])/g, " $1");
      const hasTime = new RegExp(TIME, "i").test(candidate);
      // V8 won't parse "7 PM" without minutes; expand it.
      candidate = candidate
        .replace(/(\d{1,2})\s*([ap])\.?m\.?/gi, "$1:00 $2m")
        .replace(/(\d{1,2}:\d{2}):00 ([ap])m/gi, "$1 $2m");
      if (i === 2 && !/\d{4}/.test(candidate)) {
        candidate += `, ${nearestYearFor(candidate)}`;
      }
      const d = new Date(candidate);
      if (!isNaN(d)) return dateToString(d, hasTime);
    }
    return "";
  }

  function nearestYearFor(monthDayText) {
    const now = new Date();
    const thisYear = new Date(`${monthDayText} ${now.getFullYear()}`);
    if (!isNaN(thisYear) && thisYear.getTime() < now.getTime() - 24 * 3600 * 1000) {
      return now.getFullYear() + 1;
    }
    return now.getFullYear();
  }

  function normalizeIso(s) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return s.replace(" ", "T");
  }

  // Parse a clock time ("6:30 pm", "19:00", "7 PM") to minutes-since-midnight,
  // or null when it isn't a real time. Used by endFromTimeRange below.
  function timeToMinutes(t) {
    const m = (t || "").match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
    if (!m || (m[2] == null && !m[3])) return null; // bare "10" isn't a time
    let h = +m[1];
    const min = m[2] == null ? 0 : +m[2];
    const ap = (m[3] || "").toLowerCase()[0];
    if (ap === "p" && h < 12) h += 12;
    if (ap === "a" && h === 12) h = 0;
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }

  function nextDay(ymd) {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  // Given free-form text and a `start` already parsed from it (string contract,
  // with a clock time), find a start–end TIME RANGE — "6:30 pm - 10:00 pm",
  // "19:00–22:00", "7 to 9 PM" — and return the END as `start`'s date carried to
  // the range's second time (rolling to the next day when it crosses midnight).
  // Generic: a start–end time range on one line is how most event pages show
  // their hours, and a date alone rarely repeats the end. Anchored to `start`'s
  // time-of-day (the range must BEGIN at it) so an unrelated time range elsewhere
  // on the page isn't mistaken for the event's end. Returns "" when there's no
  // such range. The caller localizes/zones the result like any other value.
  function endFromTimeRange(text, start) {
    const sm = (start || "").match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
    if (!sm) return ""; // start has no time-of-day to anchor a range to
    const startMin = +sm[2] * 60 + +sm[3];
    const re = new RegExp(`(${TIME})\\s*(?:to|until|till|[-–—])\\s*(${TIME})`, "ig");
    let m;
    while ((m = re.exec(GCal.clean(text)))) {
      const a = timeToMinutes(m[1]);
      const b = timeToMinutes(m[2]);
      if (a == null || b == null || a !== startMin) continue;
      const date = b <= a ? nextDay(sm[1]) : sm[1];
      return `${date}T${pad(Math.floor(b / 60))}:${pad(b % 60)}:00`;
    }
    return "";
  }

  return { dateToString, normalizeDateValue, parseDateFromText, endFromTimeRange };
})());
