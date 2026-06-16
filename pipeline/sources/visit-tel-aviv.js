// Visit Tel Aviv (visit.tel-aviv.gov.il) event pages:
//   https://visit.tel-aviv.gov.il/Pages/EventLocation.aspx?ListType=Events&ItemId=<N>
//
// The page is a SharePoint/AngularJS SPA: all event data loads at runtime via
// the SharePoint REST API and is bound into the DOM by the Angular controller
// (ng-bind / ng-bind-html). After Angular bootstraps, the relevant elements are:
//
//   <h1 class="EventLocationTitle">Savta Stories – …</h1>
//   <div class="EventLocationActivity">14/07/2026 - 25/08/2026</div>
//   <div class="EventLocationOpenHours"><p>00:00 - 23:59</p></div>
//   <div class="EventLocationAddress">Bialik Street 27</div>
//   <div class="EventLocationDescription"><p>What happens when Tel Aviv…</p></div>
//
// Where each field comes from:
//   title       h1.EventLocationTitle (text content after Angular renders)
//   start/end   .EventLocationActivity: "DD/MM/YYYY - DD/MM/YYYY" date range,
//               optionally refined by a "HH:MM - HH:MM" time in
//               .EventLocationOpenHours when OpeningHours is empty
//   location    .EventLocationAddress (first occurrence)
//   description .EventLocationDescription block
//   ctz         always "Asia/Jerusalem" — site is Israel-only
//
// NOTE: This extractor requires JavaScript (AngularJS) to have run; the static
// cached HTML has empty template bindings and produces no events. The
// extension's content-script context runs AFTER Angular, so users always get
// the populated data. Tests use synthetic HTML (test/unit/extraction.test.js).
//
(() => {
  const { text, firstText, blockText, parseDateFromText } = GCal;

  // Parse "DD/MM/YYYY" → "YYYY-MM-DD".
  function parseDMY(s) {
    const m = (s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return "";
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // Attach "HH:MM" clock time to a "YYYY-MM-DD" date → "YYYY-MM-DDTHH:MM:00".
  function withTime(date, timeStr) {
    const m = (timeStr || "").match(/(\d{1,2}):(\d{2})/);
    if (!date || !m) return date;
    return `${date}T${m[1].padStart(2, "0")}:${m[2]}:00`;
  }

  GCal.sources.push({
    name: "visit-tel-aviv",
    matches: (host) => /(^|\.)visit\.tel-aviv\.gov\.il$/.test(host),
    extract() {
      const title = text("h1.EventLocationTitle");

      // Activity field: "DD/MM/YYYY - DD/MM/YYYY" date range.
      const activityText = text(".EventLocationActivity");
      const parts = activityText.split(/\s*[-–]\s*/);
      const startDate = parseDMY(parts[0]);
      const endDate   = parseDMY(parts[1] || "");

      // OpeningTime (shown when OpeningHours is empty): "HH:MM - HH:MM".
      const hoursText = text(".EventLocationOpenHours");
      const timeParts = hoursText.split(/\s*[-–]\s*/);
      const start = withTime(startDate, timeParts[0]) || parseDateFromText(activityText);
      const end   = withTime(endDate,   timeParts[1]) || (endDate || "");

      const location = firstText([".EventLocationAddress"]);

      const descEl = document.querySelector(".EventLocationDescription");
      const description = descEl ? blockText(descEl) : "";

      return { title, start, end, location, description, ctz: "Asia/Jerusalem" };
    },
  });
})();
