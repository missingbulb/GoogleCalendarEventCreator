// Ticketmaster Israel (ticketmaster.co.il) event pages:
//   https://www.ticketmaster.co.il/event/<id>/ALL/iw
//
// A server-rendered Angular app, in Hebrew, with NO schema.org JSON-LD and an
// og:description that carries literal "<br />" markup — so the generic and
// JSON-LD layers can't supply usable fields. Everything is read from the
// rendered DOM here. The event header (a "btx-event-description" hero) shows
// the next/featured performance; the page may also list several other
// performance dates below, but only the header carries a full date *with a
// year* ("4 ביולי 2026"), so this extracts that single primary event.
//
// Expected HTML input (simplified):
//
//   <h1 class="btx-title">רביד פלוטניק</h1>
//   <div class="event-location">
//     <a class="venue-link" href=".../venue/...">רדינג 3, תל אביב - יפו</a>
//   </div>
//   <div class="perf-date">
//     <svg>…</svg><span>4 ביולי 2026</span><span>•</span><span>21:00</span>
//   </div>
//   <btx-read-more><div class="read-more-content">
//     <div class="current-text">…about the show, lines split by <br>…</div>
//   </div></btx-read-more>
//
// Where each field comes from:
//   title       the page's <h1>
//   start       the Hebrew date + time in .perf-date ("4 ביולי 2026 • 21:00")
//               parsed to floating local time; no end time is shown
//   location    the venue link in .event-location
//   description the "about the show" block (.read-more-content), with its
//               <br> line breaks turned into spaces so words don't run together
//   ctz         always "Asia/Jerusalem" — ticketmaster.co.il is Israel-only
(() => {
  const { clean, text } = GCal;

  // Hebrew month names as they appear in the date (without the "ב" prefix that
  // the "d בMMMM y" format prepends, e.g. "ביולי" -> "יולי").
  const HEBREW_MONTHS = {
    "ינואר": 1, "פברואר": 2, "מרץ": 3, "אפריל": 4, "מאי": 5, "יוני": 6,
    "יולי": 7, "אוגוסט": 8, "ספטמבר": 9, "אוקטובר": 10, "נובמבר": 11, "דצמבר": 12,
  };

  // "4 ביולי 2026 • 21:00" -> "2026-07-04T21:00:00" (floating local time, pinned
  // to Asia/Jerusalem via ctz). The month carries a leading "ב" ("in") in this
  // format, stripped before lookup. Falls back to an all-day date if no time is
  // present, and "" if no Hebrew date is found at all.
  function parsePerformanceDate(s) {
    s = clean(s);
    const m = s.match(/(\d{1,2})\s+ב?([\u0590-\u05FF]+)\s+(\d{4})/);
    if (!m) return "";
    const month = HEBREW_MONTHS[m[2]];
    if (!month) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const day = `${m[3]}-${pad(month)}-${pad(+m[1])}`;
    const time = s.match(/(\d{1,2}):(\d{2})/);
    return time ? `${day}T${pad(+time[1])}:${time[2]}:00` : day;
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

  GCal.sites.push({
    name: "ticketmaster",
    matches: GCal.siteHosts.find((s) => s.name === "ticketmaster").matches,
    extract() {
      return {
        title: text("h1"),
        start: parsePerformanceDate(text(".perf-date")),
        location: text(".event-location .venue-link, .event-location"),
        description: blockText(".read-more-content"),
        ctz: "Asia/Jerusalem",
      };
    },
  });
})();
