// Ticketmaster Israel (ticketmaster.co.il) event pages:
//   https://www.ticketmaster.co.il/event/<id>/ALL/iw
//
// A server-rendered Angular app, in Hebrew, with NO schema.org JSON-LD and an
// og:description that carries literal "<br />" markup — so the generic and
// JSON-LD layers can't supply usable fields. Everything is read from the
// rendered DOM here.
//
// An event page can have several performances (e.g. a multi-night run), each a
// "btx-list-item" in the "תאריכים" (dates) list, so this returns one event per
// performance. The list rows show a day + Hebrew month but NO year; only the
// event header (a "btx-event-description" hero showing the next performance,
// "4 ביולי 2026") carries a year, so that header year seeds the list and rolls
// forward whenever a later row's month wraps past December.
//
// Expected HTML input (simplified):
//
//   <h1 class="btx-title">רביד פלוטניק</h1>
//   <div class="event-location">
//     <a class="venue-link" href=".../venue/...">רדינג 3, תל אביב - יפו</a>
//   </div>
//   <div class="perf-date"><span>4 ביולי 2026</span>•<span>21:00</span></div>
//   ...
//   <btx-performance-list>
//     <btx-list-item><div class="performance-listing">
//       <div class="date-box"><span class="day">4</span><span class="month">יולי</span></div>
//       <div class="time">יום שבת • 21:00</div>
//       <div class="performance-listing-venue">רדינג 3</div>
//     </div></btx-list-item>
//     …one per performance…
//   </btx-performance-list>
//   <btx-read-more><div class="read-more-content">
//     <div class="current-text">…about the show, lines split by <br>…</div>
//   </div></btx-read-more>
//
// Where each field comes from:
//   title       the page's <h1> (same for every performance)
//   start       each row's day + Hebrew month (.date-box) + time (.time),
//               with the year derived from the header, as floating local time;
//               no end time is shown
//   location    the venue link in .event-location (the full "venue, city"
//               string, richer than the row's bare venue name)
//   description the "about the show" block (.read-more-content), with its
//               <br> line breaks turned into spaces so words don't run together
//   ctz         always "Asia/Jerusalem" — ticketmaster.co.il is Israel-only
(() => {
  const { clean, text } = GCal;

  // Hebrew month names as they appear in the date. The header date uses the
  // "d בMMMM y" format, prepending a "ב" ("in") to the month ("ביולי"); the
  // list rows show the bare name ("יולי"). Lookups strip a leading "ב".
  const HEBREW_MONTHS = {
    "ינואר": 1, "פברואר": 2, "מרץ": 3, "אפריל": 4, "מאי": 5, "יוני": 6,
    "יולי": 7, "אוגוסט": 8, "ספטמבר": 9, "אוקטובר": 10, "נובמבר": 11, "דצמבר": 12,
  };

  const pad = (n) => String(n).padStart(2, "0");

  function monthNumber(name) {
    return HEBREW_MONTHS[clean(name).replace(/^ב/, "")] || 0;
  }

  // First "HH:MM" in `s`, or "" if none.
  function timeOf(s) {
    const t = clean(s).match(/(\d{1,2}):(\d{2})/);
    return t ? `${pad(+t[1])}:${t[2]}` : "";
  }

  // The header shows the next performance with a full year ("4 ביולי 2026");
  // that year seeds the (yearless) performance rows. Falls back to the current
  // year if the header is missing.
  function headerYear() {
    const m = text(".perf-date").match(/(\d{4})/);
    return m ? +m[1] : new Date().getFullYear();
  }

  // One event per performance row. The rows are chronological but carry no
  // year, so start from the header year and bump it whenever a row's month is
  // earlier than the previous row's (the list crossed into the next year).
  function performances(title, location) {
    let year = headerYear();
    let prevMonth = null;
    const out = [];
    for (const row of document.querySelectorAll(".performance-listing")) {
      const day = +clean(text(".date-box .day", row));
      const month = monthNumber(text(".date-box .month", row));
      if (!day || !month) continue;
      if (prevMonth !== null && month < prevMonth) year++;
      prevMonth = month;
      const date = `${year}-${pad(month)}-${pad(day)}`;
      const time = timeOf(text(".time", row));
      out.push({ title, start: time ? `${date}T${time}:00` : date, end: null, location });
    }
    return out;
  }

  // textContent of `el` with <br> turned into spaces, so the description's
  // line breaks don't glue adjacent words together once whitespace is collapsed.
  function blockText(sel) {
    const el = document.querySelector(sel);
    if (!el) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = el.innerHTML.replace(/<br\s*\/?>/gi, " ");
    return clean(tmp.textContent);
  }

  GCal.sources.push({
    name: "ticketmaster",
    matches: (host) => /(^|\.)ticketmaster\.co\.il$/.test(host),
    extract() {
      const title = text("h1");
      const location = text(".event-location .venue-link, .event-location");
      const description = blockText(".read-more-content");
      const events = performances(title, location);
      if (events.length) {
        return { events, description, ctz: "Asia/Jerusalem" };
      }
      // No performance list (e.g. layout change) — fall back to the header date.
      const m = text(".perf-date").match(/(\d{1,2})\s+ב?([\u0590-\u05FF]+)\s+(\d{4})/);
      const month = m ? monthNumber(m[2]) : 0;
      const date = m && month ? `${m[3]}-${pad(month)}-${pad(+m[1])}` : "";
      const time = timeOf(text(".perf-date"));
      return {
        title,
        start: date ? (time ? `${date}T${time}:00` : date) : "",
        location,
        description,
        ctz: "Asia/Jerusalem",
      };
    },
  });
})();
