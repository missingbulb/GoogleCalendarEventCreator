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
// A site extractor can instead supply its own `events` array (e.g. cinema.js
// for a series page); the page-level description/ctz then fill any field an
// individual event didn't carry. Otherwise, when the page's JSON-LD lists
// several events, each becomes an event.
//
// To support a new event platform, add extractors/<site>.js that pushes onto
// GCal.sites (see meetup.js for the pattern), list it in EXTRACTOR_FILES in
// background.js, and add a test case under test/integration/cases/.
(() => {
  const host = location.hostname.replace(/^www\./, "");
  const site = GCal.sites.find((s) => s.matches(host));

  const siteResult = site ? site.extract() : {};
  const ldEvents = GCal.jsonLd.findEvents();

  const norm = (e) => ({
    title: e.title || "",
    start: e.start || "",
    end: e.end || null,
    location: e.location || "",
    description: e.description || "",
    ctz: e.ctz || "",
  });

  let events;
  if (Array.isArray(siteResult.events) && siteResult.events.length) {
    // A site that found several distinct events; fall back to its page-level
    // description/ctz for any event that didn't carry its own.
    const pageDefaults = { description: siteResult.description, ctz: siteResult.ctz };
    events = siteResult.events.map((e) => norm(GCal.merge(e, pageDefaults)));
  } else if (ldEvents.length > 1) {
    events = ldEvents.map((ld) => norm(GCal.jsonLd.toEvent(ld)));
  } else {
    events = [norm(GCal.merge(siteResult, GCal.jsonLd.toEvent(ldEvents[0]), GCal.generic.extract()))];
  }

  return { events };
})();
