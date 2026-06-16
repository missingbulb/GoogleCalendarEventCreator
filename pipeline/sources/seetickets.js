// SeeTickets event/tour pages: https://www.seetickets.com/event/<slug>
//                               https://www.seetickets.com/tour/<artist>
//
// Expected HTML input (simplified):
//
//   <h1 class="tour-name">The Mary Wallopers</h1>
//   <div class="event-listing-item">
//     <time datetime="2026-10-13T18:00:00Z">Tuesday 13 Oct 2026</time>
//     <span class="venue-name">Edinburgh Corn Exchange</span>
//     <span class="venue-location">Edinburgh</span>
//   </div>
//
// Where each field comes from:
//   title       <h1> (tour/artist name or event title)
//   start       datetime attribute of the first <time[datetime]>
//   location    venue name + city from the first event listing row
//   description meta description as fallback (seetickets JSON-LD fills gaps)
//
// SeeTickets embeds schema.org JSON-LD for the event; this source supplies
// selectors for fields the generic/JSON-LD layer misses or gets wrong, and
// merges the rest from the embedded data.
(() => {
  const { text, firstText, normalizeDateValue, parts, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "seetickets",
    matches: (host) => /(^|\.)seetickets\.com$/.test(host),
    extract() {
      const timeEl = document.querySelector("time[datetime]");

      const venueName = firstText([
        ".event-listing-item .venue-name",
        ".tour-listing-item .venue-name",
        ".venue-name",
        '[itemprop="name"]',
      ]);
      const venueCity = firstText([
        ".event-listing-item .venue-location",
        ".tour-listing-item .venue-location",
        ".venue-location",
        ".venue-city",
        '[itemprop="addressLocality"]',
      ]);

      const loc = parts();
      loc.add(venueName);
      loc.add(venueCity);

      const dom = {
        title: firstText(["h1.tour-name", "h1.event-name", "h1"]),
        start: timeEl ? normalizeDateValue(timeEl.getAttribute("datetime")) : "",
        location: loc.join(),
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
