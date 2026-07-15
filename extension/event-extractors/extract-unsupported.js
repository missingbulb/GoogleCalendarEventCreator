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
//               short element whose class/id mentions "venue" or "location" ->
//               OG place/business/geo meta tags -> the "@ Venue" title tail ->
//               an "(Online)"-style title parenthetical -> the street address
//               in the page's footer/header chrome (single-venue sites)
//   description og:description or description meta tag ->
//               itemprop="description" (line breaks preserved)
//   ctz         derived only when two independent page-declared hints agree (a
//               stated inline-JSON timezone, the events' own UTC offsets, the
//               JSON-LD venue country, the page locale) — see
//               helpers/derive-timezone.js (#674); otherwise absent
(() => {
  const { clean, text, meta, blockText, htmlToText, bodyText, normalizeDateValue, parseDateFromText, endFromTimeRange, merge, embeddedEvents, parts, deriveCtz } = GCal;

  // How much of the page's body text the date/time scan below considers. Large
  // enough to reach past a long nav/menu block (e.g. a WordPress mega-menu)
  // that sits before the real content on some sites, small enough to stay a
  // deliberate "near the top of the page" heuristic rather than a full-page scan.
  const BODY_TEXT_SCAN_LIMIT = 16000;

  function extract() {
    const embedded = embeddedEvents.find();
    // Several embedded events => a listing page; surface each.
    if (embedded.length > 1) return withCtz(embedded.map(embeddedEvents.toEvent).map(trimVenueTitle));

    const event = trimVenueTitle(merge(embeddedEvents.toEvent(embedded[0]), heuristics()));
    // The heuristics always fill a title (og:title -> <h1> -> document title),
    // present on essentially every page, so a title alone is not an event. Treat
    // this as an event only when the page embedded one or a date was parsed.
    return embedded.length > 0 || event.start ? withCtz([event]) : [];
  }

  // The one field the heuristics can never scrape directly: the event's
  // timezone. deriveCtz (helpers/derive-timezone.js) answers only when two
  // independent page-declared hints agree; a "" answer leaves the events
  // exactly as before (#674). Page-level on purpose: every event on the page
  // shares the one corroborated zone, and a page whose events span zones never
  // gets one (the offset/country unanimity rules see to it).
  function withCtz(events) {
    const ctz = deriveCtz(events.flatMap((e) => [e.start, e.end]));
    if (ctz) for (const e of events) e.ctz = ctz;
    return events;
  }

  // "Event @ Venue" titles (bandsintown, Songkick, and many music/ticketing
  // listings — whether the title arrives via JSON-LD or og:title) repeat the venue
  // in the title. When a FULLER location is known — one that leads with that same
  // venue but carries more (street, city, country) — the "@ Venue" tail is
  // redundant, so trim the title to the event name alone, the way a dedicated
  // source reads it. Guarded to a strict superset (the location starts with the
  // venue but is longer) so we only strip when the venue is known independently: a
  // location that is exactly the title's tail (e.g. one parsed back out of the
  // title by venueFromTitle) leaves the title untouched.
  function trimVenueTitle(event) {
    if (!event || !event.title) return event;
    const at = event.title.indexOf(" @ ");
    if (at < 0) return event;
    const venueTail = clean(event.title.slice(at + 3));
    const loc = clean(event.location);
    if (venueTail && loc && loc !== venueTail && loc.startsWith(venueTail)) {
      event.title = clean(event.title.slice(0, at));
    }
    return event;
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
      const body = bodyText().slice(0, BODY_TEXT_SCAN_LIMIT);
      out.start = parseDateFromText(body);
      // A start scraped from text often sits next to its end as a time range
      // ("6:30 pm - 10:00 pm"); recover the end when nothing structured gave one.
      if (out.start && !out.end) out.end = endFromTimeRange(body, out.start);
    } else if (!out.start.includes("T") || /T00:00(?::00)?/.test(out.start)) {
      // <time datetime> (or microdata) gave date-only or midnight-UTC — a common
      // placeholder pattern. Try metadata descriptions first (curated, one focused
      // sentence vs the whole page), then body text, for a timed start on the same
      // date; if found, prefer it over the midnight placeholder.
      const datePrefix = out.start.slice(0, 10);
      const body = bodyText().slice(0, BODY_TEXT_SCAN_LIMIT);
      for (const src of [meta("og:description"), meta("description"), body]) {
        const refined = parseDateFromText(src);
        if (refined && refined.includes("T") && refined.startsWith(datePrefix)) {
          out.start = refined;
          if (!out.end) out.end = endFromTimeRange(src, out.start);
          break;
        }
      }
    }

    out.location =
      text('[itemprop="location"]') ||
      text("address") ||
      shortText('[class*="venue" i], [class*="location" i], [id*="location" i]') ||
      metaLocation() ||
      venueFromTitle(out.title);
    // A "(Virtual)", "(Online)", or "(Webinar)" parenthetical in the event title
    // signals a virtual event with no physical venue — a convention used by many
    // event platforms (EventBrite, Meetup, Luma, …).
    if (!out.location && /\((virtual|online|webinar)\)/i.test(out.title || "")) {
      out.location = "Online";
    }
    // Dead last — even the "(Online)" inference above outranks it, because site
    // chrome describes the site, not this event.
    if (!out.location) out.location = chromeAddress();

    // Preserve the description's line breaks. Meta descriptions often contain
    // literal HTML markup (e.g. "<br />") rather than real newlines — parse
    // them through htmlToText so markup becomes text structure.
    const rawDesc = meta("og:description") || meta("description");
    out.description = rawDesc ? htmlToText(rawDesc) : blockText('[itemprop="description"]');

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

  // Href of a maps service — a "directions to us" link marks its own text as
  // the site's street address.
  const MAPS_SERVICE = /(?:maps\.google\.|google\.[a-z.]+\/maps|waze\.com|openstreetmap\.org|maps\.apple\.com|bing\.com\/maps)/i;
  // An icon file whose name says "this is where we are" (location.png,
  // map-pin.svg, map_marker.webp, …) — the wrapping link's text is the address.
  const PIN_ICON = /(?:location|map[-_]?pin|map[-_]?marker)[^/]*\.(?:png|svg|gif|jpe?g|webp|ico)/i;

  // Last-resort location: the street address a single-venue site (a club, a
  // cinema, a theater) publishes once in its page chrome instead of repeating
  // it in every event's details. The footer is scanned first, then the header
  // (some venues use a top contact bar). Only deliberate "this is our address"
  // markers are read — never arbitrary chrome text — in signal-strength order:
  //   1. a maps-service link (Google Maps, Waze, OSM, Apple/Bing Maps)
  //   2. an element whose class/id mentions "addres" (covers "address" and the
  //      bare "addres" misspelling seen in the wild)
  //   3. a link marked by a location-pin icon (PIN_ICON above)
  // Each candidate must still read like a street address (looksLikeAddress), so
  // "Get Directions" links, phone numbers, and copyright lines never qualify.
  // Ranked below every event-specific signal (including the "(Online)" title
  // inference): chrome describes the site, so on a multi-venue platform an
  // office address in the footer must lose to any per-event location the page
  // exposes — platforms publish JSON-LD/meta locations, which win far earlier.
  function chromeAddress() {
    const markers = [
      (root) => [...root.querySelectorAll("a[href]")].filter((a) => MAPS_SERVICE.test(a.getAttribute("href"))),
      (root) => root.querySelectorAll('[class*="addres" i], [id*="addres" i]'),
      (root) =>
        [...root.querySelectorAll("a")].filter((a) =>
          [...a.querySelectorAll("img")].some((img) =>
            PIN_ICON.test(`${img.getAttribute("src") || ""} ${img.getAttribute("data-src") || ""}`)
          )
        ),
    ];
    for (const scope of ['footer, [class*="footer" i], [id*="footer" i]', 'header, [class*="header" i], [id*="header" i]']) {
      const roots = document.querySelectorAll(scope);
      for (const marked of markers) {
        for (const root of roots) {
          for (const el of marked(root)) {
            const address = addressText(el);
            if (address) return withSiteVenue(address);
          }
        }
      }
    }
    return "";
  }

  // The candidate's own visible text. In a real (scripting-enabled) Chrome a
  // <noscript>'s content is one RAW TEXT node — naive textContent would splice
  // image markup into the address (the gcec RULES.md jsdom-vs-Chrome trap
  // that bit custom/telavivcinematheque.js) — so noscript/script/style subtrees
  // are dropped from a clone before reading. A leading "Address:"-style label
  // is dropped too.
  function addressText(el) {
    const copy = el.cloneNode(true);
    for (const n of copy.querySelectorAll("noscript, script, style")) n.remove();
    const t = clean(copy.textContent).replace(/^(?:address|כתובת)\s*:\s*/i, "");
    return looksLikeAddress(t) ? t : "";
  }

  // A plausible one-line street address: short, carries a street number, is
  // mostly words rather than digits (a phone number is the reverse), and isn't
  // an email / URL / copyright line.
  function looksLikeAddress(t) {
    if (t.length < 5 || t.length > 120) return false;
    const letters = (t.match(/\p{L}/gu) || []).length;
    const digits = (t.match(/\d/g) || []).length;
    if (!digits || letters < 3 || letters < digits) return false;
    return !/[@©]|https?:|copyright|all rights reserved|כל הזכויות/i.test(t);
  }

  // On a single-venue site the site IS the venue, so when the page names itself
  // (og:site_name) the venue leads the composed location — "<venue>, <address>"
  // — the way a dedicated single-venue source (and a human typing a Calendar
  // location) writes it. Skipped when the name already appears in the address,
  // or is merely the site's domain ("stubhub.com" is not a venue).
  function withSiteVenue(address) {
    const site = clean(meta("og:site_name"));
    if (!site || address.includes(site) || /^[\w.-]+\.[a-z]{2,}$/i.test(site)) return address;
    return `${site}, ${address}`;
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
