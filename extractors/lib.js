// Shared toolbox for the extractors. Injected first; the site-specific
// extractors, jsonld.js, generic.js, and finally main.js follow (the
// injection order is the EXTRACTOR_FILES list in background.js).
//
// Every extractor produces a partial event object with these optional fields:
//   title, location, description : plain strings
//   start, end                   : one of
//       "YYYY-MM-DD"                  -> all-day event
//       "YYYY-MM-DDTHH:MM[:SS]"       -> floating local time
//       full ISO with offset or "Z"   -> exact instant
//   (background.js turns these into the Google Calendar `dates` parameter)
//
// `GCal.sites` is the registry: each site-specific extractor pushes
//   { name, matches(hostname), extract() }
// onto it, and main.js runs the first one whose `matches` returns true.

globalThis.GCal = (() => {
  const MONTH =
    "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const TIME = "\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)|\\d{1,2}:\\d{2}";

  // ---- DOM helpers ---------------------------------------------------------

  function clean(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function text(sel, root) {
    const el = (root || document).querySelector(sel);
    return el ? clean(el.textContent) : "";
  }

  function firstText(selectors, root) {
    for (const sel of selectors) {
      const t = text(sel, root);
      if (t) return t;
    }
    return "";
  }

  function meta(nameOrProp) {
    const el = document.querySelector(
      `meta[property="${nameOrProp}"], meta[name="${nameOrProp}"], meta[itemprop="${nameOrProp}"]`
    );
    return el ? clean(el.getAttribute("content")) : "";
  }

  function bodyText() {
    const body = document.body;
    if (!body) return "";
    return body.innerText || body.textContent || "";
  }

  // ---- date helpers --------------------------------------------------------

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
    raw = clean(raw);
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
    s = clean(s);
    if (!s) return "";

    const isoMatch = s.match(/\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?/);
    if (isoMatch) return normalizeIso(isoMatch[0]);

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

  // ---- merging ---------------------------------------------------------------

  // Combine partial results field-by-field; the first source with a non-empty
  // value for a field wins.
  function merge(...sources) {
    const out = {};
    for (const key of ["title", "start", "end", "location", "description"]) {
      for (const src of sources) {
        if (src && src[key]) {
          out[key] = src[key];
          break;
        }
      }
    }
    return out;
  }

  return {
    sites: [],
    clean,
    text,
    firstText,
    meta,
    bodyText,
    dateToString,
    normalizeDateValue,
    parseDateFromText,
    merge,
  };
})();
