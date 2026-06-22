// Bandsintown event pages: https://www.bandsintown.com/e/<id>-<artist>-at-<venue>
//
// A concert-listing platform that publishes a complete schema.org MusicEvent
// in JSON-LD for every event page — name, startDate (with the venue's UTC
// offset), location (Place + PostalAddress), and a description — so almost
// everything is read from the page's own embedded event via the shared
// GCal.embeddedEvents helper.
//
// Expected HTML input (simplified):
//
//   <h1>Berry Sakharof</h1>
//   <script type="application/ld+json">
//   { "@type": "MusicEvent",
//     "name": "Berry Sakharof at Peace Forest",
//     "startDate": "2026-06-17T21:00:00+03:00",
//     "location": { "@type": "Place", "name": "Peace Forest",
//                   "address": { "addressLocality": "Jerusalem",
//                                "addressCountry": "Israel" } },
//     "description": "..." }
//   </script>
//
// Where each field comes from:
//   title       the page's <h1> (the headlining artist); the JSON-LD `name`
//               ("<artist> at <venue>") fills in when no <h1> is present
//   start/end   JSON-LD startDate/endDate — the start carries the venue's own
//               UTC offset, so the instant is exact
//   location    JSON-LD location (Place name + address), flattened to one line
//   description JSON-LD description
//   ctz         the venue's IANA timezone, scanned from the page's inline JSON
//               state, so the Calendar event reads in the show's local time
//
// Self-contained: the page's embedded event supplies the fields, and the <h1>
// (the artist name on its own) wins for the title where it's present.
(() => {
  const { text, findTimezone, scriptsText, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "bandsintown",
    matches: (host) => /(^|\.)bandsintown\.com$/.test(host),
    extract() {
      const dom = {
        title: text("h1"),
        ctz: findTimezone(scriptsText(), /"timezone"\s*:\s*"([^"]+)"/),
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
