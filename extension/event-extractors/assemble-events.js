// Orchestrator: picks the right extractors for the current page and returns
// the events found on it, plus whether the page is on a supported host.
//
// Must be the LAST file in the generated load list
// (event-extractors/load-order.generated.json) — its completion value is what
// chrome.scripting.executeScript returns to the popup.
//
// The result is always { events: [...], supported, fallback } — `events` holds
// the extracted events (possibly empty), `supported` is true when a registered
// source matched this page's host, and `fallback` is true only when a SUPPORTED
// host's dedicated source found nothing so we ran the generic extractor instead
// (#456) — the one signal the popup reads to add a "Suggest Correction" link for
// events the dedicated source missed. Each event is fully self-described —
// { title, location, description, ctz, times: [ { start, end,
// eventLengthInMinutes? }, ... ] } — so a caller (the popup) can build a Google
// Calendar URL for any of its instances without consulting page-level state.
//
// THE MULTI-INSTANCE MODEL: an event's timing lives in `times`, an array of one
// or more instances (showings), each carrying its own { start, end,
// eventLengthInMinutes? }. A plain single-occurrence event is just `times` of
// length 1; a film with several screenings, a nightly show, or a multi-night
// concert run is one event with several instances. `eventLengthInMinutes` is
// only present on an instance when a site extractor found an explicit duration
// (not derived from start/end). start/end follow the same string contract as
// before ("YYYY-MM-DD" all-day, "YYYY-MM-DDTHH:MM[:SS]" floating, or an exact
// instant with offset/Z).
//
// Sources still emit the FLAT shape per occurrence ({ title, start, end, ... },
// or an `events` array of them) — keeping "add a source" a single self-contained
// file (dev/procedures/architectureGuidelines.md). norm() wraps each into a one-instance
// event, and group() then folds together any events that share every non-time
// field (title + location + description + ctz), concatenating their instances.
// So a listing/series page's per-showing emissions (Edinburgh Fringe
// performances, Ticketmaster nights, a film's screening dates) collapse into one
// multi-instance event, while genuinely distinct events (a film week's different
// films) stay separate. A source that wants to may also return `times[]` on an
// event directly — norm() takes it as-is.
//
// The popup reads `supported` (with the events) to decide what to render: a
// supported host shows its events; an unsupported host shows the generic
// fallback's events when they're complete enough (title + location + start),
// and otherwise/also offers a "request this source" link — see events-popup/popup.js's
// chooseContent. A supported host whose dedicated source found nothing carries
// `fallback: true`, telling the popup to show the generic fallback's events with
// that request link too (#456). `supported` is the same answer
// GCal.isSupportedHost gives the toolbar icon, so the popup's supported/
// unsupported split and the icon can never disagree.
//
// Two distinct paths, depending on whether a site source matches:
//   - Supported host: the matching site source is SELF-CONTAINED — it produces
//     every field of its events itself (reusing shared helpers, including the
//     GCal.embeddedEvents reader, as it sees fit). No other extractor's output
//     is merged over it. A source may return a single partial event, or its own
//     `events` array (e.g. custom/telavivcinematheque.js for a series page)
//     with page-level description/ctz that fill any field an individual event
//     didn't carry. If it finds NO events, we run the generic fallback as a
//     last resort and flag the result `fallback: true` (#456) — never merged
//     over the source, only used when the source itself came up empty.
//   - Unsupported host: no per-site extractor exists, so we defer to the
//     unsupported-site extractor (GCal.unsupportedSiteEvents) for a best-effort
//     event. The popup presents it when it's complete enough (title + location +
//     start) and otherwise falls back to the "request this source" flow.
//
// To support a new event platform, add event-extractors/custom/<site>.js that pushes
// onto GCal.sources (see custom/meetup.js for the pattern), run `npm run index`
// to regenerate the load list, and add a test case under dev/requirements/extractor/expected/.
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
    // Each occurrence is normalized into one `times` instance; a source that
    // already returns `times[]` has its instances normalized in place.
    const normInstance = (t, ctz) => {
      const out = {
        start: GCal.localizeToZone(t.start || "", ctz),
        end: t.end ? GCal.localizeToZone(t.end, ctz) : null,
      };
      if (t.eventLengthInMinutes != null) out.eventLengthInMinutes = t.eventLengthInMinutes;
      return out;
    };
    const norm = (e) => {
      const ctz = e.ctz || "";
      const instances = Array.isArray(e.times) && e.times.length
        ? e.times
        : [{ start: e.start, end: e.end, eventLengthInMinutes: e.eventLengthInMinutes }];
      return {
        title: e.title || "",
        location: e.location || "",
        description: e.description || "",
        ctz,
        times: instances.map((t) => normInstance(t, ctz)),
      };
    };

    // Pick the events to show, and whether they came from the generic fallback.
    // A supported host's dedicated source is self-contained and runs alone — but
    // when it finds NO events on a page it's expected to handle, fall back to the
    // generic extractor rather than show an empty popup (#456). The user opened
    // the popup because they saw an event on the page, so the fallback's
    // best-effort events are a better answer than nothing; the popup surfaces a
    // "Suggest Correction" link for them, since the dedicated source missed them.
    // `fallback` is true ONLY in that case (a supported host's own events, and an
    // unsupported host's, leave it false) — it's the single signal the popup
    // (chooseContent) reads to add that correction link on a supported host.
    let events = group(site ? supportedEvents(site, norm) : fallbackEvents(norm));
    let fallback = false;
    if (site && !events.length) {
      events = group(fallbackEvents(norm));
      fallback = events.length > 0;
    }

    // Present everything chronologically regardless of the order the page (or a
    // site extractor's performance list) gave it in. start is an ISO-ish string
    // ("2026-08-05T14:00:00" or a date-only "2026-08-05"), so a lexicographic
    // compare sorts chronologically and an empty start sorts last. Each event's
    // instances are sorted, then the events by their earliest instance. Both
    // sorts are stable, so equal starts keep their order.
    for (const e of events) e.times.sort((a, b) => cmpStart(a.start, b.start));
    events.sort((a, b) => cmpStart(a.times[0].start, b.times[0].start));

    return { events, supported: Boolean(site), fallback };
  }

  // Lexicographic start compare with empty/absent sorting last.
  function cmpStart(a, b) {
    if (!a) return b ? 1 : 0;
    if (!b) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  }

  // Fold events that describe the same thing at different times into one
  // multi-instance event. The grouping key is every NON-time field
  // (title + location + description + ctz): two events that match on all of them
  // are the same event's separate showings, so their `times` are concatenated
  // (exact-duplicate instances dropped). Events that differ in any of those —
  // e.g. the different films on a series page — stay separate. Encounter order
  // is preserved (the later chronological sort orders them anyway).
  function group(events) {
    const byKey = new Map();
    const out = [];
    for (const e of events) {
      const key = JSON.stringify([e.title, e.location, e.description, e.ctz]);
      const existing = byKey.get(key);
      if (existing) {
        existing.times.push(...e.times);
      } else {
        const copy = { ...e, times: [...e.times] };
        byKey.set(key, copy);
        out.push(copy);
      }
    }
    for (const e of out) e.times = dedupeInstances(e.times);
    return out;
  }

  // Drop instances that are byte-identical to one already kept (same start, end,
  // and duration) — a page listing the same showing twice shouldn't yield two
  // buttons for it. Distinct showings (any field differs) are all kept.
  function dedupeInstances(times) {
    const seen = new Set();
    return times.filter((t) => {
      const k = JSON.stringify([t.start, t.end, t.eventLengthInMinutes ?? null]);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
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
    return event.times.some((t) => t.start) ? [event] : [];
  }

  // The generic best-effort extractor. Used for an unsupported host (no per-site
  // extractor exists), and as a last resort on a supported host whose dedicated
  // source found nothing (#456). The popup (chooseContent) decides whether the
  // result is complete enough to present, and whether to offer a source request.
  function fallbackEvents(norm) {
    return GCal.unsupportedSiteEvents.extract().map(norm);
  }

  GCal.extract = extract;
  return extract();
})();
