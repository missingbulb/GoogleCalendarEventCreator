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

    // Day-first dotted dates ("15.6.2026", "15.6.2026 19:00") — the everyday
    // format outside the US, where the generic patterns below (which lean on
    // V8's English-only Date parsing) can't help. Built straight from the parts,
    // read as D.M.Y (the dotted convention), so a yearless time after it is
    // optional. Only fires when day/month are in range, so it doesn't swallow
    // unrelated dotted numbers.
    // (?<!\d)…(?!\d) (not \b) so an abutting letter is fine — block elements
    // concatenate without spaces in body text ("Night15.6.2026") — while a
    // neighbouring digit (a longer number) still rules the match out.
    const dotted = s.match(/(?<!\d)(\d{1,2})\.(\d{1,2})\.(\d{4})(?!\d)(?:\s*(?:,|at|@|·)?\s*(\d{1,2}):(\d{2}))?/i);
    if (dotted) {
      const dd = +dotted[1];
      const mm = +dotted[2];
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
        const day = `${dotted[3]}-${pad(mm)}-${pad(dd)}`;
        return dotted[4] != null ? `${day}T${pad(+dotted[4])}:${dotted[5]}:00` : day;
      }
    }

    const patterns = [
      // "June 14, 2026 at 7:00 PM" / "Jun 14 2026, 19:00" / "June 14, 2026 from 7 PM"
      new RegExp(`${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}(?:\\s*(?:,|at|from|@|·|—|–|-)?\\s*(${TIME}))?`, "i"),
      // "14 June 2026 at 7 PM"
      new RegExp(`\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\.?,?\\s+\\d{4}(?:\\s*(?:,|at|from|@|·|—|–|-)?\\s*(${TIME}))?`, "i"),
      // "Sunday, June 14 at 7 PM" (no year -> assume nearest upcoming)
      new RegExp(`${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:\\s*(?:,|at|@|·)\\s*(${TIME}))`, "i"),
      // "6/14/2026 7:00 PM"
      new RegExp(`\\d{1,2}/\\d{1,2}/\\d{4}(?:\\s*(?:,|at|@)?\\s*(${TIME}))?`, "i"),
    ];

    for (let i = 0; i < patterns.length; i++) {
      const m = s.match(patterns[i]);
      if (!m) continue;
      let candidate = m[0]
        .replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1")
        .replace(/\s+(?:at|from|@|·|—|–)\s+/gi, " ")
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

  return { dateToString, normalizeDateValue, parseDateFromText };
})());
