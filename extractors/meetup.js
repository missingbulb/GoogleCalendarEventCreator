// Meetup event pages: https://www.meetup.com/<group>/events/<id>/
//
// Expected HTML input (simplified):
//
//   <h1>Intro to Rust: Hands-on Workshop</h1>
//   <div id="event-info">
//     <time datetime="2026-07-08T18:30:00-04:00">Wed, Jul 8, 6:30 PM</time>
//     <div data-testid="location-info">
//       <a data-testid="venue-name">Brooklyn Public Library</a>
//     </div>
//   </div>
//   <div id="event-details"> ...event description... </div>
//
// Where each field comes from:
//   title       the page's <h1>
//   start       datetime attribute of the first <time> inside #event-info
//               (ISO string, or epoch milliseconds on older pages)
//   location    venue name/info nodes, found by their data-testid attributes
//   description the #event-details section
//
// Meetup also embeds JSON-LD, so anything missing here is picked up by the
// jsonld.js layer during the merge in main.js.
(() => {
  const { text, firstText, normalizeDateValue } = GCal;

  GCal.sites.push({
    name: "meetup",
    matches: GCal.siteHosts.find((s) => s.name === "meetup").matches,
    extract() {
      const timeEl = document.querySelector(
        "#event-info time[datetime], main time[datetime], time[datetime]"
      );
      return {
        title: text("h1"),
        start: timeEl ? normalizeDateValue(timeEl.getAttribute("datetime")) : "",
        location: firstText([
          '[data-testid="venue-name"]',
          '[data-testid="location-info"]',
          'a[data-testid="venue-link"]',
          '[data-event-label="event-location"]',
        ]),
        description: firstText([
          "#event-details",
          '[data-event-label="body"]',
          '[data-testid="event-description"]',
        ]),
      };
    },
  });
})();
