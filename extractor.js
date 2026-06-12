// Injected into the active tab when the toolbar button is clicked.
// Extracts event details and returns them as the script's completion value.
//
// Returned shape (all fields optional strings unless noted):
//   {
//     title:       string,
//     start:       "YYYY-MM-DD" (all-day) | "YYYY-MM-DDTHH:MM[:SS]" (floating)
//                  | full ISO with offset/Z (fixed instant),
//     end:         same formats as start,
//     location:    string,
//     description: string,
//     multipleEvents: boolean  // true when the page appears to list several events
//   }
(() => {
  const MONTH =
    "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const TIME = "\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)|\\d{1,2}:\\d{2}";

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

  function bodyText() {
    const body = document.body;
    if (!body) return "";
    return body.innerText || body.textContent || "";
  }

  function meta(nameOrProp) {
    const el = document.querySelector(
      `meta[property="${nameOrProp}"], meta[name="${nameOrProp}"], meta[itemprop="${nameOrProp}"]`
    );
    return el ? clean(el.getAttribute("content")) : "";
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  // ---- date handling -------------------------------------------------------

  // Convert a Date plus a "did the source include a clock time" flag into the
  // string contract described at the top of the file. Floating local time is
  // used so the calendar template shows the same wall-clock time the page did.
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
    const parsed = parseDateFromText(raw);
    return parsed || "";
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
      candidate = candidate.replace(/(\d{1,2})\s*([ap])\.?m\.?/gi, "$1:00 $2m").replace(/(\d{1,2}:\d{2}):00 ([ap])m/gi, "$1 $2m");
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

  // ---- JSON-LD (schema.org) ------------------------------------------------

  function jsonLdEvents() {
    const found = [];
    const visit = (node) => {
      if (!node) return;
      if (Array.isArray(node)) return node.forEach(visit);
      if (typeof node !== "object") return;
      const types = [].concat(node["@type"] || []);
      if (types.some((t) => typeof t === "string" && /event$/i.test(t))) found.push(node);
      visit(node["@graph"]);
      if (Array.isArray(node.itemListElement)) {
        visit(node.itemListElement.map((it) => (it && it.item) || it));
      }
    };
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        visit(JSON.parse(script.textContent));
      } catch (e) {
        /* malformed JSON-LD; ignore */
      }
    }
    return found;
  }

  function jsonLdLocation(loc) {
    if (!loc) return "";
    if (Array.isArray(loc)) loc = loc[0];
    if (typeof loc === "string") return clean(loc);
    const parts = [];
    if (loc.name) parts.push(clean(loc.name));
    const addr = loc.address;
    if (typeof addr === "string") {
      parts.push(clean(addr));
    } else if (addr && typeof addr === "object") {
      parts.push(
        [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, addr.addressCountry]
          .map(clean)
          .filter(Boolean)
          .join(", ")
      );
    }
    return parts.filter(Boolean).join(", ");
  }

  function stripHtml(s) {
    if (!s) return "";
    const div = document.createElement("div");
    div.innerHTML = s;
    return clean(div.textContent);
  }

  function fromJsonLd(ev) {
    if (!ev) return {};
    return {
      title: clean(ev.name),
      start: normalizeDateValue(ev.startDate),
      end: normalizeDateValue(ev.endDate),
      location: jsonLdLocation(ev.location),
      description: stripHtml(ev.description),
    };
  }

  // ---- site-specific extractors ---------------------------------------------

  function extractMeetup() {
    const timeEl = document.querySelector("#event-info time[datetime], main time[datetime], time[datetime]");
    return {
      title: text("h1"),
      start: timeEl ? normalizeDateValue(timeEl.getAttribute("datetime")) : "",
      location: firstText([
        '[data-testid="venue-name"]',
        '[data-testid="location-info"]',
        'a[data-testid="venue-link"]',
        '[data-event-label="event-location"]',
      ]),
      description: firstText(["#event-details", '[data-event-label="body"]', '[data-testid="event-description"]']),
    };
  }

  function extractFacebook() {
    // Facebook's DOM is obfuscated, so rely on the page title plus a date
    // pattern in the visible text near the top of the event page.
    let title = text('h1, [role="main"] h2 span');
    if (!title) {
      title = clean(document.title.replace(/\s*\|\s*Facebook\s*$/i, ""));
    }
    const topText = bodyText().slice(0, 4000);
    return {
      title,
      start: parseDateFromText(topText),
      // Location/description fall through to JSON-LD and generic heuristics.
    };
  }

  function extractEventbrite() {
    const timeEl = document.querySelector("time[datetime]");
    return {
      title: firstText(["h1.event-title", "h1"]),
      start: timeEl
        ? normalizeDateValue(timeEl.getAttribute("datetime"))
        : parseDateFromText(firstText([".date-info__full-datetime", '[data-testid="dateAndTime"]'])),
      location: firstText([".location-info__address", '[data-testid="location"]']),
      description: firstText(['[data-testid="structured-content"]', ".event-description", "#event-description"]),
    };
  }

  // ---- generic fallback ------------------------------------------------------

  function extractGeneric() {
    const out = {};

    out.title = meta("og:title") || text("h1") || clean(document.title);

    const startProp = document.querySelector('[itemprop="startDate"]');
    if (startProp) {
      out.start = normalizeDateValue(startProp.getAttribute("content") || startProp.getAttribute("datetime") || startProp.textContent);
    }
    const endProp = document.querySelector('[itemprop="endDate"]');
    if (endProp) {
      out.end = normalizeDateValue(endProp.getAttribute("content") || endProp.getAttribute("datetime") || endProp.textContent);
    }
    if (!out.start) {
      out.start = meta("event:start_time");
      out.end = out.end || meta("event:end_time");
    }
    if (!out.start) {
      const timeEl = document.querySelector("time[datetime]");
      if (timeEl) out.start = normalizeDateValue(timeEl.getAttribute("datetime"));
    }
    if (!out.start) {
      out.start = parseDateFromText(bodyText().slice(0, 8000));
    }

    out.location =
      text('[itemprop="location"]') ||
      text("address") ||
      shortText('[class*="venue" i], [class*="location" i], [id*="location" i]');

    out.description = meta("og:description") || meta("description") || text('[itemprop="description"]');

    return out;
  }

  // First element matching `sel` whose text is plausibly a venue string
  // (short, non-empty) rather than a whole section of the page.
  function shortText(sel) {
    for (const el of document.querySelectorAll(sel)) {
      const t = clean(el.textContent);
      if (t && t.length >= 3 && t.length <= 140) return t;
    }
    return "";
  }

  // ---- multiple-event detection ----------------------------------------------

  function detectMultipleEvents(ldEvents) {
    if (ldEvents.length > 1) return true;
    const micro = document.querySelectorAll('[itemtype*="schema.org/Event" i]');
    if (micro.length > 1) return true;
    // Heuristic: several sibling "card"-like containers each carrying a
    // machine-readable timestamp usually means an event listing page.
    const times = document.querySelectorAll("article time[datetime], li time[datetime]");
    return times.length > 2;
  }

  // ---- assemble ---------------------------------------------------------------

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

  const host = location.hostname.replace(/^www\./, "");
  let siteSpecific = {};
  if (/(^|\.)meetup\.com$/.test(host)) siteSpecific = extractMeetup();
  else if (/(^|\.)facebook\.com$/.test(host)) siteSpecific = extractFacebook();
  else if (/(^|\.)eventbrite\./.test(host)) siteSpecific = extractEventbrite();

  const ldEvents = jsonLdEvents();
  // If the page lists several events, suggest the first one.
  const result = merge(siteSpecific, fromJsonLd(ldEvents[0]), extractGeneric());
  result.multipleEvents = detectMultipleEvents(ldEvents);
  return result;
})();
