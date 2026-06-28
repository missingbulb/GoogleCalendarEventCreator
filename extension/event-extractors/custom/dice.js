// dice.fm event pages: https://dice.fm/event/<slug>
//
// Expected HTML input (the schema.org JSON-LD block dice.fm publishes):
//
//   <script type="application/ld+json">
//   { "@type": "ComedyEvent",
//     "name": "Daniele Tinti - Pesche Dure - Live a Napoli",
//     "startDate": "2026-12-07T21:00:00+01:00",
//     "endDate":   "2026-12-07T23:00:00+01:00",
//     "location": { "name": "Teatro Bellini",
//                   "address": "Via Conte di Ruvo 14, 80135 Napoli..." },
//     "description": "**PESCHE DURE** ..." }
//   </script>
//
//   Inline JSON state blob containing:  "timezone":"Europe/Rome"
//
// Where each field comes from:
//   title       JSON-LD "name" (via embeddedEvents)
//   start       JSON-LD "startDate" ISO datetime with UTC offset (via embeddedEvents)
//   end         JSON-LD "endDate" (via embeddedEvents)
//   location    JSON-LD location.name + location.address, comma-joined (via embeddedEvents)
//   description JSON-LD "description" markdown rendered to text (via embeddedEvents)
//   ctz         inline JSON state "timezone" field (IANA timezone name)
//
// The JSON-LD is comprehensive; no DOM selectors are needed beyond the ctz read.
(() => {
  const { findTimezone, scriptsText, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "dice",
    matches: (host) => /(^|\.)dice\.fm$/.test(host),
    extract() {
      const dom = {
        // The timezone lives inside a doubly-encoded JSON string in the Next.js
        // __NEXT_DATA__ blob, so the inner quotes appear as \" in textContent.
        ctz: findTimezone(scriptsText(), /\\"timezone\\"\s*:\s*\\"([^"\\]+)\\"/),
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
