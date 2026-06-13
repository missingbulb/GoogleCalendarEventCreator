// Entry point: picks the right extractors for the current page and merges
// their partial results into the final event object.
//
// Must be the LAST file in the EXTRACTOR_FILES list in background.js — its
// completion value is what chrome.scripting.executeScript returns to the
// background worker.
//
// Merge order (first non-empty value per field wins):
//   1. the site-specific extractor whose `matches(hostname)` is true, if any
//   2. the first schema.org JSON-LD event on the page
//   3. generic heuristics (meta tags, microdata, <time>, text scanning)
//
// To support a new event platform, add extractors/<site>.js that pushes
// onto GCal.sites (see meetup.js for the pattern), list it in
// EXTRACTOR_FILES in background.js, and add a test case under
// test/integration/cases/.
//
// `events` is the list of DISTINCT events found on the page, each
// { title, start, end, location } — one entry for an ordinary event page,
// several for a listing/series page (e.g. a film week with several different
// films). `events[0]` is the suggested event and matches the top-level
// fields. A site extractor can supply its own `events` array; otherwise the
// list comes from the page's schema.org JSON-LD events, falling back to a
// single entry built from the merged top-level fields.
//
// `eventCount` is the number of distinct events found on the page: the
// schema.org JSON-LD event count, or a site extractor's own count of
// performances/dates if it found more than that.
//
// `multipleEvents` is true if the page has more than one distinct event, or
// if JSON-LD/microdata/heuristics found several events, or if the site
// extractor itself says so (e.g. several scheduled screenings of one film).
(() => {
  const host = location.hostname.replace(/^www\./, "");
  const site = GCal.sites.find((s) => s.matches(host));

  const ldEvents = GCal.jsonLd.findEvents();
  const siteResult = site ? site.extract() : {};
  // If the page lists several events, suggest the first one.
  const result = GCal.merge(siteResult, GCal.jsonLd.toEvent(ldEvents[0]), GCal.generic.extract());

  const pick = (e) => ({
    title: e.title || "",
    start: e.start || "",
    end: e.end || null,
    location: e.location || "",
  });
  let events;
  if (Array.isArray(siteResult.events) && siteResult.events.length) {
    events = siteResult.events.map(pick);
  } else if (ldEvents.length > 1) {
    events = ldEvents.map((ld) => pick(GCal.jsonLd.toEvent(ld)));
  } else {
    events = [pick(result)];
  }
  // Keep the suggested (first) event aligned with the top-level fields.
  events[0] = pick(result);
  result.events = events;

  result.multipleEvents =
    events.length > 1 || GCal.generic.detectMultiple(ldEvents.length) || !!siteResult.multipleEvents;
  result.eventCount = Math.max(ldEvents.length, siteResult.eventCount || 0, events.length);
  result.end = result.end || null;
  return result;
})();
