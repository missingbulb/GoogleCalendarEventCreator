// Visit Tel Aviv (visit.tel-aviv.gov.il) event pages:
//   https://visit.tel-aviv.gov.il/Pages/EventLocation.aspx?ListType=Events&ItemId=<N>
//
// Expected HTML input (simplified):
//
//   <h1 class="item-title">Savta Stories – An Intergenerational Activity</h1>
//   <div class="event-date">14/07/2026 - 25/08/2026</div>
//   <div class="event-time">00:00 - 23:59</div>
//   <div class="location">Bialik Street 27</div>
//   <div class="event-description">What happens when Tel Aviv memories...</div>
//
// Where each field comes from:
//   title       the page's <h1> (class .item-title, or the first <h1>)
//   start/end   date range rendered in .event-date as "DD/MM/YYYY - DD/MM/YYYY"
//               plus time in .event-time as "HH:MM - HH:MM";
//               falls back to the first <time datetime> element if present
//   location    .location or .event-location text
//   description .event-description block
//   ctz         always "Asia/Jerusalem" — site is Israel-only
//
(() => {
  const { text, firstText, blockText, normalizeDateValue, parseDateFromText, merge, embeddedEvents } = GCal;

  // Parse a date string in DD/MM/YYYY format to YYYY-MM-DD.
  function parseDMY(s) {
    const m = (s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return "";
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // Combine a YYYY-MM-DD date with an "HH:MM" time string to a floating datetime.
  function withTime(date, timeStr) {
    const m = (timeStr || "").match(/(\d{1,2}):(\d{2})/);
    if (!date || !m) return date;
    return `${date}T${m[1].padStart(2, "0")}:${m[2]}:00`;
  }

  GCal.sources.push({
    name: "visit-tel-aviv",
    matches: (host) => /(^|\.)visit\.tel-aviv\.gov\.il$/.test(host),
    extract() {
      // Title: try the specific .item-title class first, then any h1.
      const title = firstText([".item-title", "h1", ".page-title", ".event-title"]);

      // Dates: the page renders a "DD/MM/YYYY - DD/MM/YYYY" range; if absent,
      // fall back to a <time datetime> attribute.
      const dateText = firstText([".event-date", ".date-range", ".dates", ".event-dates"]);
      const timeText = firstText([".event-time", ".time-range", ".event-hours"]);

      let start = "";
      let end = "";

      // Try the DD/MM/YYYY range pattern first.
      const rangeParts = (dateText || "").split(/\s*[-–]\s*/);
      if (rangeParts.length >= 1) {
        const s = parseDMY(rangeParts[0]);
        const e = parseDMY(rangeParts[1] || "");
        const timeParts = (timeText || "").split(/\s*[-–]\s*/);
        start = s ? withTime(s, timeParts[0]) : "";
        end = e ? withTime(e, timeParts[1] || timeParts[0]) : "";
      }

      // Fallback: <time datetime> element.
      if (!start) {
        const timeEl = document.querySelector("time[datetime]");
        start = timeEl ? normalizeDateValue(timeEl.getAttribute("datetime")) : "";
      }

      // If still nothing, try parsing the date from the visible date text.
      if (!start && dateText) {
        start = parseDateFromText(dateText);
      }

      const location = firstText([
        ".location",
        ".event-location",
        ".venue",
        ".address",
        '[class*="location"]',
        '[class*="address"]',
      ]);

      const description = blockText(
        [".event-description", ".description", ".content-area", ".event-body", ".field-body"]
          .map((sel) => document.querySelector(sel))
          .find(Boolean)
      );

      const dom = { title, start, end, location, description, ctz: "Asia/Jerusalem" };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
