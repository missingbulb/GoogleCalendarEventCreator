// Orchestrator: picks the right extractors for the current page and returns
// the events found on it, plus whether the page is on a supported host.
//
// Must be the LAST file in the generated load list
// (pipeline/load-order.generated.json) — its completion value is what
// chrome.scripting.executeScript returns to the popup.
//
// The result is always { events: [...], supported } — `events` holds the
// extracted events (possibly empty) and `supported` is true when a registered
// source matched this page's host. Each event is fully self-described —
// { title, start, end, location, description, ctz } — so a caller (the popup)
// can build a Google Calendar URL for any of them without consulting page-level
// state. An ordinary event page yields one event; a listing/series page (e.g. a
// film week with several different films) yields one per event.
//
// The popup reads `supported` to choose between showing event buttons and the
// "request this source" flow — the same answer GCal.isSupportedHost gives the
// toolbar icon, so the popup and the icon can never disagree.
//
// Each event is assembled by merging, first non-empty value per field wins:
//   1. the site-specific source whose `matches(hostname)` is true, if any
//   2. the first schema.org JSON-LD event on the page
//   3. generic heuristics (meta tags, microdata, <time>, text scanning)
// A source can instead supply its own `events` array (e.g.
// sources/telavivcinematheque.js for a series page); the page-level
// description/ctz then fill any field an individual event didn't carry.
// Otherwise, when the page's JSON-LD lists several events, each becomes an event.
//
// To support a new event platform, add pipeline/sources/<site>.js that pushes
// onto GCal.sources (see sources/meetup.js for the pattern), run `npm run index`
// to regenerate the load list, and add a test case under test/integration/cases/.
//
// The orchestrator is exposed as GCal.extract() — THE single top-level
// extractor every caller goes through (the popup, the test harness). It picks
// the matching site source for the current page internally; nothing else calls
// a source's extract() directly. The file still ends by calling it so its
// completion value remains the injected-script result the popup reads.
(() => {
  function extract() {
    const host = location.hostname.replace(/^www\./, "");
    const site = GCal.sources.find((s) => s.matches(host));

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
      // event. A matched site host is not enough either: a supported site's
      // home/listing page (e.g. cinema.co.il's front page) still carries the
      // host's og/footer metadata but describes no specific event. Only treat
      // this as a real event when JSON-LD carried one or a date was actually
      // parsed from the page; otherwise the page describes no event and we
      // return none.
      const isEvent = ldEvents.length > 0 || Boolean(event.start);
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

    return { events, supported: Boolean(site) };
  }

  GCal.extract = extract;
  return extract();
})();
