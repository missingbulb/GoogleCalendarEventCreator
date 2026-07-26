// Orchestrator: runs the core generic extractor over the current page, merges the
// matching per-site source's overrides onto it, and returns the events found.
//
// Must be the LAST file in the generated load list
// (event-extractors/load-order.generated.json) — its completion value is what
// chrome.scripting.executeScript returns to the popup.
//
// The result is always { events: [...], sourceMissed } — `events` holds the extracted
// events (possibly empty), and `sourceMissed` is true when a per-site source claimed
// this page but found nothing of its own, so what we're showing came from the
// generic base alone (#456) — the one signal the popup reads to add a
// "Suggest Correction" link for events the dedicated source missed.
//
// WHETHER THE HOST IS SUPPORTED IS NOT DECIDED HERE. That is a product
// declaration, not an extraction result: extension/host-lists.json's
// `supportedDomains` is the one list that says which hosts we claim, and both the
// toolbar icon (icon/toolbar-icon.js) and the popup (events-popup/popup.js, via
// host-policy.js's isSupportedDomain) read it directly — so they cannot
// disagree. The pipeline can't see that list anyway: it's injected into the page
// world, which has no access to the extension's product config.
//
// Each event is fully self-described —
// { title, description, ctz, times: [ { start, end, eventLengthInMinutes?,
// location? }, ... ] } — so a caller (the popup) can build a Google Calendar URL
// for any of its instances without consulting page-level state.
//
// THE MULTI-INSTANCE MODEL: an event's timing AND place live in `times`, an array
// of one or more instances (showings), each carrying its own { start, end,
// eventLengthInMinutes?, location? }. There is NO top-level `location` — a venue
// is a per-showing field like start/end, so a single-venue event simply repeats
// its venue across its instances, and a TOURING show at several venues carries a
// different one per instance. A plain single-occurrence event is just `times` of
// length 1; a film with several screenings, a nightly show, or a multi-night
// concert run is one event with several instances. `eventLengthInMinutes` is only
// present on an instance when a site extractor found an explicit duration (not
// derived from start/end); `location` is present when the showing has a venue.
// start/end follow the same string contract as before ("YYYY-MM-DD" all-day,
// "YYYY-MM-DDTHH:MM[:SS]" floating, or an exact instant with offset/Z).
//
// Sources still emit the FLAT shape per occurrence ({ title, start, end,
// location, ... }, or an `events` array of them) — keeping "add a source" a
// single self-contained file (dev/procedures/highLevelDesign.md).
// norm() wraps each into a one-instance event, moving the occurrence's `location`
// ONTO the instance, and group() then folds together any events that share the
// non-time, non-location identity (title + description + ctz), concatenating their
// instances. So a listing/series page's per-showing emissions (Edinburgh Fringe
// performances, Ticketmaster nights, a film's screening dates, a tour's
// city-by-city dates) collapse into one multi-instance event — each instance
// keeping its own venue — while genuinely distinct events (a film week's
// different films) stay separate. A source that wants to may also return `times[]`
// on an event directly, each instance optionally carrying its own `location` —
// norm() takes it as-is.
//
// The popup pairs these events with its own read of `supportedDomains` to decide
// what to render: a supported host shows its events; an unsupported host shows
// them when they're complete enough (title + location + start), and
// otherwise/also offers a "request this source" link — see events-popup/popup.js's
// chooseContent. A supported host whose dedicated source found nothing carries
// `sourceMissed: true`, telling the popup to show the generic events with
// that request link too (#456).
//
// ONE PATH, TWO LAYERS. The core generic extractor (generic-extractor.js) runs on
// EVERY page and produces the base events. A per-site source
// (custom/<site>.js) is a layer of OVERRIDES on top of it: its extract()
// returns only the fields it states better than the generic base, and they win
// field by field (GCal.merge). So a source never has to re-read what any page
// already says about itself — the page's own schema.org JSON-LD, Open Graph
// tags, microdata and visible dates all arrive from the base — and a site whose
// pages describe themselves completely needs NO source file at all: no source
// claims the page, so the base alone answers for it. Being *supported* is an
// independent, declared fact (see above), so such a site is fully supported with
// no extractor of its own.
//
// A source may instead return its own `events` array (e.g.
// custom/telavivcinematheque.js for a series page, custom/ticketmaster.js for a
// multi-night run) with page-level description/ctz filling any field an
// individual event didn't carry. A source that ENUMERATES the page's events that
// way replaces the base rather than overriding it: it has told us the page holds
// these N events, and the base's own reading of the same page can't be aligned
// with them event by event.
//
// To support a new event platform, add its host to `supportedDomains` in
// extension/host-lists.json, then check whether the core generic extractor
// already gets the page right — if it does, you are done, and the site has no
// extractor file at all. Only when it doesn't, add
// event-extractors/custom/<site>.js that pushes onto GCal.sources (see
// custom/meetup.js for the pattern) stating the fields it gets wrong, and run
// `npm run index` to regenerate the load list. Either way, add a test case under
// dev/requirements/extractor/expected/.
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
    const normInstance = (t, ctz, eventLocation) => {
      const out = {
        start: GCal.localizeToZone(t.start || "", ctz),
        end: t.end ? GCal.localizeToZone(t.end, ctz) : null,
      };
      if (t.eventLengthInMinutes != null) out.eventLengthInMinutes = t.eventLengthInMinutes;
      // Location is per-instance (the multi-instance model lets each showing carry
      // its own venue — a touring show, a film at several cinemas); fall back to
      // the event-level location when an instance doesn't name its own.
      const location = t.location != null ? t.location : eventLocation;
      if (location) out.location = location;
      return out;
    };
    const norm = (e) => {
      const ctz = e.ctz || "";
      const eventLocation = e.location || "";
      const instances = Array.isArray(e.times) && e.times.length
        ? e.times
        : [{ start: e.start, end: e.end, eventLengthInMinutes: e.eventLengthInMinutes, location: e.location }];
      return {
        title: e.title || "",
        description: e.description || "",
        ctz,
        times: instances.map((t) => normInstance(t, ctz, eventLocation)),
      };
    };

    // The core generic extractor runs on every page and is the base layer the
    // matching source's overrides are merged over. With no source for this host —
    // an unsupported site, or a supported one the generic extractor covers on its
    // own — there is nothing to override and the base IS the answer.
    const base = GCal.genericExtractor.extract();
    const overrides = (site && site.extract()) || {};
    const events = group(compose(overrides, base, norm));

    // `sourceMissed` says a per-site source claimed this page and came up empty,
    // so what we're showing is the generic base alone (#456). The popup
    // (chooseContent) reads it as the single signal to add a "Suggest Correction"
    // link. A host with no source at all leaves it false, whether or not we
    // support that host: where the generic extractor IS the support, nothing was
    // missed and there is nothing to correct.
    const sourceMissed = Boolean(site) && !sourceContributed(overrides) && events.length > 0;

    // Present everything chronologically regardless of the order the page (or a
    // site extractor's performance list) gave it in. start is an ISO-ish string
    // ("2026-08-05T14:00:00" or a date-only "2026-08-05"), so a lexicographic
    // compare sorts chronologically and an empty start sorts last. Each event's
    // instances are sorted, then the events by their earliest instance. Both
    // sorts are stable, so equal starts keep their order.
    for (const e of events) e.times.sort((a, b) => cmpStart(a.start, b.start));
    events.sort((a, b) => cmpStart(a.times[0].start, b.times[0].start));

    return { events, sourceMissed };
  }

  // Lexicographic start compare with empty/absent sorting last.
  function cmpStart(a, b) {
    if (!a) return b ? 1 : 0;
    if (!b) return -1;
    return a < b ? -1 : a > b ? 1 : 0;
  }

  // Fold events that describe the same thing at different times — or different
  // LOCATIONS — into one multi-instance event. The grouping key is the non-time,
  // non-location identity (title + description + ctz): two events matching on all
  // of them are the same event's separate showings, so their `times` are
  // concatenated (each instance keeping its own location, so a touring show's
  // venues stream in one card; exact-duplicate instances dropped). Events that
  // differ in title/description/ctz — e.g. the different films on a series page —
  // stay separate. Location is NOT a top-level field: it lives on each instance
  // (every showing carries its own venue), so a single-venue event simply repeats
  // its venue across its instances. Encounter order is preserved (the later
  // chronological sort orders them anyway).
  function group(events) {
    const byKey = new Map();
    const out = [];
    for (const e of events) {
      const key = JSON.stringify([e.title, e.description, e.ctz]);
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
  // duration, and location) — a page listing the same showing twice shouldn't
  // yield two buttons for it. Distinct showings (any field differs, including a
  // different venue at the same time) are all kept.
  function dedupeInstances(times) {
    const seen = new Set();
    return times.filter((t) => {
      const k = JSON.stringify([t.start, t.end, t.eventLengthInMinutes ?? null, t.location || ""]);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // Compose the page's events from the two layers: `overrides`, the matching
  // site source's result (`{}` when there is no source, or none was needed), and
  // `base`, the core generic extractor's best-effort events for the same page.
  function compose(overrides, base, norm) {
    // The source ENUMERATED the page's events (a series page, a multi-night run).
    // That list replaces the base — the base's own reading of the page can't be
    // matched to it event by event — with the source's page-level
    // description/ctz filling any field an individual event didn't carry.
    if (Array.isArray(overrides.events) && overrides.events.length) {
      const pageDefaults = { description: overrides.description, ctz: overrides.ctz };
      return overrides.events.map((e) => norm(GCal.merge(e, pageDefaults)));
    }

    // The source described ONE event while the base read the page as a listing.
    // Its per-event fields (title/start/end/location) can't say which of them
    // they belong to, so only its page-level ones carry across all of them.
    if (base.length > 1) {
      const pageDefaults = { description: overrides.description, ctz: overrides.ctz };
      return base.map((e) => norm(GCal.merge(pageDefaults, e)));
    }

    // The ordinary single-event page: the source's fields win, the base fills
    // everything it didn't state. A matched host alone is not an event — a
    // supported site's home/listing page (e.g. cinema.co.il's front page) still
    // carries the host's og/footer metadata but describes no specific event — so
    // this counts as a real event only once some layer parsed a date.
    const event = norm(GCal.merge(overrides, base[0] || {}));
    return event.times.some((t) => t.start) ? [event] : [];
  }

  // Whether the site source RECOGNIZED the page, as opposed to leaving it whole
  // to the generic base (which is what sets `sourceMissed`). It counts
  // as recognized when the source named the event or dated it — a title or a
  // start. Those are the two fields that identify WHICH event a page is about;
  // the rest deliberately don't count, because several sources state them as
  // flat site constants that are present even on a page the source read nothing
  // from: a single-venue site's fixed `location` (custom/barby.js), a
  // virtual-only platform's "Online", a fixed `ctz` ("Asia/Jerusalem").
  //
  // A source leaving the start to the base is normal now and is NOT a miss —
  // that's the whole point of the base layer (custom/tel-aviv.js's one-off event
  // pages take their start from the page's JSON-LD). It's a miss only when
  // the source contributed neither.
  function sourceContributed(overrides) {
    const identified = (e) => Boolean(e.title || e.start);
    if (Array.isArray(overrides.events) && overrides.events.length) {
      return overrides.events.some(identified);
    }
    return identified(overrides);
  }

  GCal.extract = extract;
  return extract();
})();
