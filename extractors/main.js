// Entry point: picks the right extractors for the current page and returns
// the list of events found on it.
//
// Must be the LAST file in the EXTRACTOR_FILES list in background.js — its
// completion value is what chrome.scripting.executeScript returns to the
// background worker.
//
// The result is always { events: [...] } with at least one entry. Each event
// is fully self-described — { title, start, end, location, description, ctz }
// — so a caller (the popup) can build a Google Calendar URL for any of them
// without consulting page-level state. An ordinary event page yields one
// event; a listing/series page (e.g. a film week with several different
// films) yields one per event.
//
// Each event is assembled by merging, first non-empty value per field wins:
//   1. the site-specific extractor whose `matches(hostname)` is true, if any
//   2. the first schema.org JSON-LD event on the page
//   3. generic heuristics (meta tags, microdata, <time>, text scanning)
// A site extractor can instead supply its own `events` array (e.g.
// telavivcinematheque.js for a series page); the page-level description/ctz
// then fill any field an individual event didn't carry. Otherwise, when the
// page's JSON-LD lists several events, each becomes an event.
//
// To support a new event platform, add extractors/<site>.js that pushes onto
// GCal.sites (see meetup.js for the pattern), list it in EXTRACTOR_FILES in
// background.js, and add a test case under test/integration/cases/.
(() => {
  const host = location.hostname.replace(/^www\./, "");
  const site = GCal.sites.find((s) => s.matches(host));

  const siteResult = site ? site.extract() : {};
  const ldEvents = GCal.jsonLd.findEvents();

  // When the event's timezone is known, store start/end as floating local
  // wall-clock times in that timezone rather than UTC instants: the Calendar
  // URL's `ctz` then places them, and the times read as the event's city shows.
  const norm = (e) => {
    const ctz = e.ctz || "";
    return {
      title: e.title || "",
      start: GCal.localizeToZone(e.start || "", ctz),
      end: e.end ? GCal.localizeToZone(e.end, ctz) : null,
      location: e.location || "",
      description: e.description || "",
      ctz,
    };
  };

  let events;
  if (Array.isArray(siteResult.events) && siteResult.events.length) {
    // A site that found several distinct events; fall back to its page-level
    // description/ctz for any event that didn't carry its own.
    const pageDefaults = { description: siteResult.description, ctz: siteResult.ctz };
    events = siteResult.events.map((e) => norm(GCal.merge(e, pageDefaults)));
  } else if (ldEvents.length > 1) {
    events = ldEvents.map((ld) => norm(GCal.jsonLd.toEvent(ld)));
  } else {
    const event = norm(GCal.merge(siteResult, GCal.jsonLd.toEvent(ldEvents[0]), GCal.generic.extract()));
    // The generic layer always fills a title (og:title -> <h1> -> document
    // title), present on essentially every page, so a title alone is not an
    // event. Only treat this as a real event when a site-specific or JSON-LD
    // extractor contributed, or a date was actually parsed from the page;
    // otherwise the page describes no event and we return none.
    const isEvent = Boolean(site) || ldEvents.length > 0 || Boolean(event.start);
    events = isEvent ? [event] : [];
  }

  // Present events in chronological order regardless of the order the page (or
  // a site extractor's performance list) happened to give them in. start is an
  // ISO-ish string ("2026-08-05T14:00:00" or a date-only "2026-08-05"), so a
  // lexicographic compare sorts chronologically; events with no start sort
  // last. The sort is stable, so events sharing a start keep their order.
  events.sort((a, b) => {
    if (!a.start) return b.start ? 1 : 0;
    if (!b.start) return -1;
    return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
  });

  return { events };
})();
