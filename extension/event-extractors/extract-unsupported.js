// The extractor for UNSUPPORTED sites — pages whose host has no per-site source
// (event-extractors/custom/<site>.js). It scrapes a best-effort event from the page;
// the popup then shows it as a calendar button when it's complete enough (title
// + location + start) and the host isn't denylisted, and otherwise/also uses it
// to pre-fill the "request this source" form — see events-popup/popup.js's chooseContent.
// assemble-events.js only calls it when no source matched. It is not a "layer"
// that supported sources lean on: those are self-contained.
//
// extract() returns an array of the page's best-effort events (empty when the
// page describes none), which assemble-events.js normalizes and presents. It
// combines two best-effort signals, first non-empty value per field winning:
//   1. events the page embeds about itself (GCal.embeddedEvents — schema.org)
//   2. generic heuristics over the page's meta tags, microdata, <time>, and text
//
// Generic heuristics, each tried against progressively weaker signals:
//   title       og:title meta tag -> the page's <h1> -> document title
//   start/end   microdata (itemprop="startDate"/"endDate", on <meta> or
//               <time> elements) -> event:start_time/end_time meta tags ->
//               the first <time datetime="..."> on the page -> the first
//               date-and-time pattern in the page's visible text
//               ("June 14, 2026 at 7 PM", "14 June 2026", "6/14/2026", ISO)
//   location    itemprop="location" -> <address> -> the first reasonably
//               short element whose class/id mentions "venue" or "location"
//   description og:description or description meta tag ->
//               itemprop="description" (line breaks preserved)
(() => {
  const { clean, text, meta, blockText, bodyText, normalizeDateValue, parseDateFromText, endFromTimeRange, merge, embeddedEvents, parts } = GCal;

  function extract() {
    const embedded = embeddedEvents.find();
    // Several embedded events => a listing page; surface each.
    if (embedded.length > 1) return embedded.map(embeddedEvents.toEvent);

    const event = merge(embeddedEvents.toEvent(embedded[0]), heuristics());
    // The heuristics always fill a title (og:title -> <h1> -> document title),
    // present on essentially every page, so a title alone is not an event. Treat
    // this as an event only when the page embedded one or a date was parsed.
    return embedded.length > 0 || event.start ? [event] : [];
  }

  // Best-effort scrape of any page's meta tags / microdata / text.
  function heuristics() {
    const out = {};

    out.title = stripSiteSuffix(meta("og:title")) || text("h1") || clean(document.title);

    const startProp = document.querySelector('[itemprop="startDate"]');
    if (startProp) {
      out.start = normalizeDateValue(
        startProp.getAttribute("content") || startProp.getAttribute("datetime") || startProp.textContent
      );
    }
    const endProp = document.querySelector('[itemprop="endDate"]');
    if (endProp) {
      out.end = normalizeDateValue(
        endProp.getAttribute("content") || endProp.getAttribute("datetime") || endProp.textContent
      );
    }
    if (!out.start) {
      out.start = meta("event:start_time");
      out.end = out.end || meta("event:end_time");
    }
    if (!out.start) {
      const timeEl = document.querySelector("time[datetime]");
      if (timeEl) out.start = normalizeDateValue(timeEl.getAttribute("datetime"));
    }
    if (!out.start) {
      const body = bodyText().slice(0, 8000);
      out.start = parseDateFromText(body);
      // A start scraped from text often sits next to its end as a time range
      // ("6:30 pm - 10:00 pm"); recover the end when nothing structured gave one.
      if (out.start && !out.end) out.end = endFromTimeRange(body, out.start);
    }

    out.location =
      text('[itemprop="location"]') ||
      text("address") ||
      shortText('[class*="venue" i], [class*="location" i], [id*="location" i]') ||
      metaLocation() ||
      venueFromTitle(out.title);

    // Preserve the description's line breaks rather than flattening it.
    out.description = meta("og:description") || meta("description") || blockText('[itemprop="description"]');

    return out;
  }

  // og:title often ends with the site's own name (" - Tel Aviv Cinematheque",
  // "… - Think&Drink"); drop that trailing " <sep> <site name>" so the generic
  // title is just the event, the way a per-site source would read it. Only the
  // exact og:site_name is stripped, so a real title that merely contains a dash
  // is left alone.
  function stripSiteSuffix(title) {
    title = clean(title);
    const site = clean(meta("og:site_name"));
    if (!title || !site) return title;
    for (const sep of [" - ", " | ", " – ", " — "]) {
      const suffix = sep + site;
      if (title.endsWith(suffix)) return clean(title.slice(0, -suffix.length));
    }
    return title;
  }

  // Last-resort location: the place meta tags some pages publish (the Open Graph
  // "place"/"business" address fields, or the geo.* tags) when nothing on the
  // page exposed a location via microdata, <address>, or a venue/location class.
  // Composed into one comma-separated string, most specific part first; the
  // coordinate (lat/long) tags are deliberately ignored — they're not a venue.
  function metaLocation() {
    const p = parts();
    p.add(meta("og:title:place") || meta("place:name") || meta("geo.placename"));
    p.add(meta("og:street-address") || meta("business:contact_data:street_address"));
    p.add(meta("og:locality") || meta("business:contact_data:locality"));
    p.add(meta("og:region") || meta("business:contact_data:region") || meta("geo.region"));
    p.add(meta("og:postal-code") || meta("business:contact_data:postal_code"));
    p.add(meta("og:country-name") || meta("business:contact_data:country_name"));
    return p.join();
  }

  // Last-resort location: many event/listing pages title themselves
  // "Event @ Venue" (bandsintown, secrettelaviv, Songkick, …). When nothing more
  // structured exposed a location, take the part after the first " @ " in the
  // page title as a best-effort venue. Bounded in length so a stray "@" in a
  // long title doesn't turn a whole sentence into a location.
  function venueFromTitle(title) {
    const i = (title || "").indexOf(" @ ");
    if (i < 0) return "";
    const venue = clean(title.slice(i + 3));
    return venue.length <= 80 ? venue : "";
  }

  // First element matching `sel` whose text is plausibly a venue string
  // (short, non-empty) rather than a whole section of the page.
  function shortText(sel) {
    for (const el of document.querySelectorAll(sel)) {
      const t = clean(el.textContent);
      if (t && t.length >= 3 && t.length <= 140) return t;
    }
    return "";
  }

  GCal.unsupportedSiteEvents = { extract };
})();
