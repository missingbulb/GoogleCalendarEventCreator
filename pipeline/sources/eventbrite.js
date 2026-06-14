// Eventbrite event pages: https://www.eventbrite.com/e/<slug>-tickets-<id>
// (also country domains like eventbrite.co.uk, eventbrite.de, ...)
//
// Expected HTML input (simplified):
//
//   <h1 class="event-title">Portland Coffee Festival 2026</h1>
//   <time datetime="2026-09-12T10:00:00-07:00" class="date-info__full-datetime">
//     Saturday, September 12, 10 AM – 4 PM PDT
//   </time>
//   <p class="location-info__address">Oregon Convention Center, ...</p>
//   <div class="event-description"> ...description... </div>
//
// Where each field comes from:
//   title       <h1 class="event-title"> (any <h1> as fallback)
//   start       datetime attribute of the first <time>; if absent, parsed
//               from the human-readable date text
//   location    the location-info address block
//   description the structured-content / event-description section
//
// Eventbrite embeds complete JSON-LD (including endDate), and its server-
// rendered markup varies a lot between pages, so this reads the page's own
// JSON-LD (via the shared GCal.jsonLd helper) and lets the DOM selectors below
// override it where they match. That keeps the source self-contained: it
// gathers every field itself — notably the end time, which only the JSON-LD
// carries — without depending on a later merge.
(() => {
  const { firstText, normalizeDateValue, parseDateFromText, merge, jsonLd } = GCal;

  GCal.sources.push({
    name: "eventbrite",
    matches: (host) => /(^|\.)eventbrite\./.test(host),
    extract() {
      const timeEl = document.querySelector("time[datetime]");
      const dom = {
        title: firstText(["h1.event-title", "h1"]),
        start: timeEl
          ? normalizeDateValue(timeEl.getAttribute("datetime"))
          : parseDateFromText(firstText([".date-info__full-datetime", '[data-testid="dateAndTime"]'])),
        location: firstText([".location-info__address", '[data-testid="location"]']),
        description: firstText([
          '[data-testid="structured-content"]',
          ".event-description",
          "#event-description",
        ]),
      };
      // DOM values win where present; the page's JSON-LD fills the rest
      // (end time, and location/description on pages whose selectors don't match).
      return merge(dom, jsonLd.toEvent(jsonLd.findEvents()[0]));
    },
  });
})();
