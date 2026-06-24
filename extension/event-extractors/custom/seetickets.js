// seetickets.com pages:
//   /tour/<slug>  — a tour listing; embeds a JSON-LD array of MusicEvent
//                   objects, one per tour date, each with title, startDate
//                   (ISO datetime+Z), endDate (date only), location (venue
//                   name + city), and description (generic marketing copy).
//   /event/<title>/<venue>/<id> — a single-event page; same JSON-LD, one
//                                 object rather than an array.
//
// Both page types carry all event data as schema.org MusicEvent JSON-LD, so
// no DOM selectors are needed for field extraction. For tour pages the JSON-LD
// array holds one entry per show date. The DOM listing shows local start times
// while the JSON-LD uses UTC (both are correct, UTC chosen for consistency).
//
// Where each field comes from:
//   title       ld.name
//   start       ld.startDate (e.g. "2026-10-13 18:00:00Z" → "2026-10-13T18:00:00Z")
//   end         ld.endDate (date-only, e.g. "2026-10-13")
//   location    ld.location.name + ld.location.address.addressLocality,
//               flattened by embeddedEvents.toEvent's flattenLocation helper
//   description ld.description
(() => {
  const { embeddedEvents } = GCal;

  GCal.sources.push({
    name: "seetickets",
    matches: (host) => /(^|\.)seetickets\.com$/.test(host),
    extract() {
      const found = embeddedEvents.find();
      if (found.length > 1) {
        // Tour listing: return all dates as separate calendar events.
        return { events: found.map((e) => embeddedEvents.toEvent(e)) };
      }
      // Single event page (or tour with only one date).
      return embeddedEvents.toEvent(found[0]);
    },
  });
})();
