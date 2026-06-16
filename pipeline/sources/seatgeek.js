// SeatGeek event pages: https://seatgeek.com/<slug>/<venue>-<date>-<time>/<type>/<id>
//
// SeatGeek is a Next.js app that server-renders schema.org JSON-LD on event
// detail pages; this extractor reads the embedded event data and supplements
// it with DOM selectors for fields JSON-LD may omit (title, description, ctz).
//
// Expected HTML input (simplified):
//
//   <h1 data-testid="event-header">The R&B Tour - Starring Usher Raymond & Chris Brown</h1>
//   <script type="application/ld+json">
//     { "@type": "MusicEvent",
//       "name": "The R&B Tour ...",
//       "startDate": "2026-07-11T19:00:00-04:00",
//       "endDate":   "2026-07-12T00:00:00-04:00",
//       "location": { "@type": "Place",
//                     "name": "Northwest Stadium",
//                     "address": { "streetAddress": "1600 Ring Rd",
//                                  "addressLocality": "Landover",
//                                  "addressRegion": "MD",
//                                  "postalCode": "20785" } },
//       "description": "..." }
//   </script>
//
// Where each field comes from:
//   title       schema.org JSON-LD name / <h1>
//   start       schema.org JSON-LD startDate
//   end         schema.org JSON-LD endDate
//   location    schema.org JSON-LD location, flattened to "venue, street, city, state"
//   description schema.org JSON-LD description
//   ctz         timezone from __NEXT_DATA__ event.datetime_local / performer timezone
//
(() => {
  const { text, firstText, blockText, normalizeDateValue, scriptsText, findTimezone, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "seatgeek",
    matches: (host) => /(^|\.)seatgeek\.com$/.test(host),
    extract() {
      const timeEl = document.querySelector("time[datetime]");
      const dom = {
        title: firstText(['[data-testid="event-header"]', "h1"]),
        start: timeEl ? normalizeDateValue(timeEl.getAttribute("datetime")) : "",
        description: blockText('[data-testid="event-description"], .event-description'),
        ctz: findTimezone(scriptsText(), /"timezone"\s*:\s*"([^"]+)"/),
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
