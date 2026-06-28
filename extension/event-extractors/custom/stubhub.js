// StubHub event and performer listing pages.
//
// Two page types share this source:
//
//   /performer/<id>  — a listing page for an artist showing all upcoming shows.
//                      Carries a @graph JSON-LD block with one MusicEvent per show.
//   /event/<id>/     — a single-event page with one MusicEvent in JSON-LD.
//
// All fields come from JSON-LD; no <h1> or <time datetime> elements are present.
// startDate is a floating local datetime (no UTC offset, no timezone name), so
// ctz is not set — StubHub is a global platform and timezone can't be inferred.
//
// Where each field comes from (via embeddedEvents.toEvent()):
//   title       MusicEvent "name"
//   start       MusicEvent "startDate"
//   location    MusicEvent "location.name" + PostalAddress parts (flattened)
//   description MusicEvent "description" (StubHub ticket-sale boilerplate)
(() => {
  const { embeddedEvents } = GCal;

  GCal.sources.push({
    name: "stubhub",
    matches: (host) => /(^|\.)stubhub\.com$/.test(host),
    extract() {
      const found = embeddedEvents.find();
      if (found.length > 1) {
        return { events: found.map((e) => embeddedEvents.toEvent(e)) };
      }
      return embeddedEvents.toEvent(found[0]);
    },
  });
})();
