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
// `eventCount` is the number of distinct events found on the page: the
// schema.org JSON-LD event count, or a site extractor's own count of
// performances/dates if it found more than that.
(() => {
  const host = location.hostname.replace(/^www\./, "");
  const site = GCal.sites.find((s) => s.matches(host));

  const ldEvents = GCal.jsonLd.findEvents();
  const siteResult = site ? site.extract() : {};
  // If the page lists several events, suggest the first one.
  const result = GCal.merge(siteResult, GCal.jsonLd.toEvent(ldEvents[0]), GCal.generic.extract());
  result.multipleEvents = GCal.generic.detectMultiple(ldEvents.length);
  result.eventCount = Math.max(ldEvents.length, siteResult.eventCount || 0);
  return result;
})();
