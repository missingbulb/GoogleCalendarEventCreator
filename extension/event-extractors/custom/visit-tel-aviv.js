// visit.tel-aviv.gov.il event pages: https://visit.tel-aviv.gov.il/Pages/EventLocation.aspx?ListType=Events&ItemId=2173
//
// Expected HTML input (simplified):
//
//   <h1 class="EventLocationTitle">Savta Stories - An Intergenerational Activity at the City Museum</h1>
//   <div class="EventLocationActivity">Jul 14-Aug 25, 2026</div>
//   <div class="EventLocationOpenHours">00:00-23:59</div>   (the structured OpeningTime)
//   <div class="EventLocationAddress">Bialik Street 27</div>
//   <div class="EventLocationAddress"><a href="...">City Museum Tel Aviv-Yafo</a></div>
//   <div class="EventLocationDescription">...description with &lt;br&gt; tags...</div>
//
//   JSON-LD (@type: Event) is present but its description contains raw newlines that
//   make JSON.parse() fail, so no JSON-LD fields are available via embeddedEvents.
//   All fields are read directly from the DOM.
//
// Where each field comes from:
//   title       h1.EventLocationTitle (bare h1 is a hidden "Event Location" header)
//   start       first date parsed from .EventLocationActivity ("Jul 14-Aug 25, 2026"),
//               carried to the day's opening time for a single-day event (see below)
//   end         second date parsed from .EventLocationActivity, or the opening-hours
//               closing time on the same single day
//   location    .EventLocationAddress a (venue name) + first .EventLocationAddress (street)
//   description .EventLocationDescription (block text, preserves <br> line breaks)
//   ctz         hardcoded Asia/Jerusalem (all events are in Tel Aviv, Israel)
//
// Opening hours / times (#508): the structured OpeningTime renders in
// .EventLocationOpenHours as "HH:MM-HH:MM" — "00:00-23:59" for an all-day run, or a
// real window like "10:00-14:00" for a timed event. text() reads the first match's
// textContent (Angular hides the unused copy via ng-hide, but textContent still
// returns it, so this works regardless of which copy is shown). A real window on a
// SINGLE-day event makes the start/end timed; the all-day sentinel and any
// multi-day run (applying one day's hours across the whole range would be wrong)
// stay an all-day date.
//
(() => {
  const { text, blockText, merge, embeddedEvents, endFromTimeRange } = GCal;

  // Parse the structured opening-hours window ("10:00-14:00") into { start, end }
  // "HH:MM" strings, or null when there's no real window: an absent/garbled value,
  // or the "00:00-23:59" all-day sentinel (which stays an all-day date).
  function parseOpeningHours(raw) {
    const m = (raw || "").match(/\b(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})\b/);
    if (!m) return null;
    const [sh, sm, eh, em] = m.slice(1).map(Number);
    if (sh > 23 || eh > 23 || sm > 59 || em > 59) return null;
    if (sh === 0 && sm === 0 && eh === 23 && em === 59) return null; // all-day sentinel
    const pad = (n) => String(n).padStart(2, "0");
    return { start: `${pad(sh)}:${pad(sm)}`, end: `${pad(eh)}:${pad(em)}` };
  }

  // Parse a date-range string like "Jul 14-Aug 25, 2026" or "Jul 14, 2026".
  // Builds dates directly from parts to avoid new Date() timezone ambiguity.
  function parseDateRange(raw) {
    const MONTHS = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (mon, day, yr) => {
      const mm = MONTHS[mon.slice(0, 3).toLowerCase()];
      return mm ? `${yr}-${pad(mm)}-${pad(+day)}` : "";
    };
    const m = (raw || "").match(
      /^(\w{3})\w*\s+(\d{1,2})(?:\s*[-–]\s*(\w{3})\w*\s+(\d{1,2}))?,?\s+(\d{4})/i
    );
    if (!m) return { start: "", end: "" };
    return {
      start: fmt(m[1], m[2], m[5]),
      end: m[3] ? fmt(m[3], m[4], m[5]) : "",
    };
  }

  GCal.sources.push({
    name: "visit-tel-aviv",
    matches: (host) => /(^|\.)visit\.tel-aviv\.gov\.il$/.test(host),
    extract() {
      let { start, end } = parseDateRange(text(".EventLocationActivity"));
      // A single-day event (no date range) with a real opening-hours window
      // becomes timed: start carries to the opening time, end to the closing
      // time on the same day. A multi-day run or the all-day sentinel stays a
      // date (parseOpeningHours returns null for the sentinel). See #508.
      const hours = start && !end && parseOpeningHours(text(".EventLocationOpenHours"));
      if (hours) {
        start = `${start}T${hours.start}:00`;
        end = endFromTimeRange(`${hours.start}-${hours.end}`, start) || `${start.slice(0, 10)}T${hours.end}:00`;
      }
      // Venue name is in .EventLocationAddress a (inside the sidebar/tickets section);
      // street address is in the first .EventLocationAddress (plain text, no <a>).
      const venue = text(".EventLocationAddress a");
      const street = text(".EventLocationAddress");
      const location = [venue, street].filter(Boolean).join(", ");
      const dom = {
        title: text("h1.EventLocationTitle"),
        start,
        end,
        location,
        description: blockText(document.querySelector(".EventLocationDescription")),
        ctz: "Asia/Jerusalem",
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
