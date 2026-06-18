// visit.tel-aviv.gov.il event pages: https://visit.tel-aviv.gov.il/Pages/EventLocation.aspx?ListType=Events&ItemId=2173
//
// Expected HTML input (simplified):
//
//   <h1 class="EventLocationTitle">Savta Stories - An Intergenerational Activity at the City Museum</h1>
//   <div class="EventLocationActivity">Jul 14-Aug 25, 2026</div>
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
//   start       first date parsed from .EventLocationActivity ("Jul 14-Aug 25, 2026")
//   end         second date parsed from .EventLocationActivity
//   location    .EventLocationAddress a (venue name) + first .EventLocationAddress (street)
//   description .EventLocationDescription (block text, preserves <br> line breaks)
//   ctz         hardcoded Asia/Jerusalem (all events are in Tel Aviv, Israel)
//
(() => {
  const { text, blockText, merge, embeddedEvents } = GCal;

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
      const { start, end } = parseDateRange(text(".EventLocationActivity"));
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
