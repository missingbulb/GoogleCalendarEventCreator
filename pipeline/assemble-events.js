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
// The popup reads `supported` (with the events) to decide what to render: a
// supported host shows its events; an unsupported host shows the generic
// fallback's events when they're complete enough (title + location + start),
// and otherwise/also offers a "request this source" link — see ui/popup.js's
// chooseContent. `supported` is the same answer GCal.isSupportedHost gives the
// toolbar icon, so the popup's supported/unsupported split and the icon can
// never disagree.
//
// Two distinct paths, depending on whether a site source matches:
//   - Supported host: the matching site source is SELF-CONTAINED — it produces
//     every field of its events itself (reusing shared helpers, including the
//     GCal.embeddedEvents reader, as it sees fit). No other extractor's output
//     is merged over it. A source may return a single partial event, or its own
//     `events` array (e.g. sources/telavivcinematheque.js for a series page)
//     with page-level description/ctz that fill any field an individual event
//     didn't carry.
//   - Unsupported host: no per-site extractor exists, so we defer to the
//     unsupported-site extractor (GCal.unsupportedSiteEvents) for a best-effort
//     event. The popup presents it when it's complete enough (title + location +
//     start) and otherwise falls back to the "request this source" flow.
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

    const events = site ? supportedEvents(site, norm) : fallbackEvents(norm);

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

  // Supported host: the matching source is self-contained. Use its result as-is
  // — no generic/JSON-LD merge over it.
  function supportedEvents(site, norm) {
    const result = site.extract();
    if (Array.isArray(result.events) && result.events.length) {
      // A site that returned several distinct events; fall back to its own
      // page-level description/ctz for any event that didn't carry its own.
      const pageDefaults = { description: result.description, ctz: result.ctz };
      return result.events.map((e) => norm(GCal.merge(e, pageDefaults)));
    }
    // A single partial event. A matched host alone is not an event: a supported
    // site's home/listing page (e.g. cinema.co.il's front page) still carries
    // the host's og/footer metadata but describes no specific event. Treat it as
    // a real event only when the source actually parsed a date.
    const event = norm(result);
    return event.start ? [event] : [];
  }

  // Unsupported host: no per-site extractor, so defer to the unsupported-site
  // extractor for a best-effort event. The popup (chooseContent) decides whether
  // it's complete enough to present, and whether to offer a source request.
  function fallbackEvents(norm) {
    return GCal.unsupportedSiteEvents.extract().map(norm);
  }

  GCal.extract = extract;
  return extract();
})();
