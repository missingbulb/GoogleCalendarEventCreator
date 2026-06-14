// Reads the event(s) a page declares about itself in embedded schema.org
// JSON-LD — the strongest machine-readable signal, since most event pages
// publish it for search engines.
//
// This is a HELPER, not a pipeline extractor: it's a reusable reader that any
// extractor may call (a per-site source, e.g. eventbrite/meetup, to fill a
// field the page only states in JSON-LD; or the unsupported-site extractor, to
// produce a best-effort event). It never decides whether a page is supported,
// and nothing "merges" it behind a source's back — a source asks for it
// explicitly. Keeping it a helper is what lets sources stay self-contained
// without each reimplementing JSON-LD parsing.
//
// Expected HTML input — one or more script blocks anywhere in the page:
//
//   <script type="application/ld+json">
//   { "@type": "Event",                          // or MusicEvent, etc.
//     "name": "Concert",
//     "startDate": "2026-07-01T20:00:00+02:00",
//     "endDate":   "2026-07-01T23:00:00+02:00",
//     "location": { "@type": "Place", "name": "Blue Note",
//                   "address": { "streetAddress": "...", ... } },
//     "description": "<p>may contain HTML</p>" }
//   </script>
//
// Event objects may also be nested inside arrays, "@graph", or
// "itemListElement" wrappers; find() collects them all, in document order.
//
// Field mapping: title/start/end/description come straight from the
// name/startDate/endDate/description properties (description rendered to text,
// keeping its <br>/newline layout); location flattens Place name + PostalAddress
// parts into one comma-separated string.
//
// Uses GCal.clean / normalizeDateValue / htmlToText / parts at call time.
// Augments globalThis.GCal (never replaces it) so load order can't clobber
// another file's contributions.
globalThis.GCal = Object.assign(globalThis.GCal || {}, (() => {
  function find() {
    const found = [];
    const visit = (node) => {
      if (!node) return;
      if (Array.isArray(node)) return node.forEach(visit);
      if (typeof node !== "object") return;
      const types = [].concat(node["@type"] || []);
      if (types.some((t) => typeof t === "string" && /event$/i.test(t))) found.push(node);
      visit(node["@graph"]);
      if (Array.isArray(node.itemListElement)) {
        visit(node.itemListElement.map((it) => (it && it.item) || it));
      }
    };
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        visit(JSON.parse(script.textContent));
      } catch (e) {
        /* malformed JSON-LD; ignore */
      }
    }
    return found;
  }

  function toEvent(ld) {
    if (!ld) return {};
    return {
      title: GCal.clean(ld.name),
      start: GCal.normalizeDateValue(ld.startDate),
      end: GCal.normalizeDateValue(ld.endDate),
      location: flattenLocation(ld.location),
      // Render the (possibly HTML) description preserving its <br>/newline
      // layout, rather than collapsing it to a single line.
      description: GCal.htmlToText(ld.description),
    };
  }

  // Flatten a schema.org location (Place + PostalAddress) into one
  // comma-separated string. De-dup by substring, since sites often repeat the
  // city/state inside streetAddress (Meetup puts "96 Wythe Ave, Brooklyn, NY"
  // there AND fills addressLocality/Region): skip any part already contained in
  // one we've kept.
  function flattenLocation(loc) {
    if (!loc) return "";
    if (Array.isArray(loc)) loc = loc[0];
    if (typeof loc === "string") return GCal.clean(loc);
    const p = GCal.parts((cand, kept) => kept.toLowerCase().includes(cand.toLowerCase()));
    p.add(loc.name);
    const addr = loc.address;
    if (typeof addr === "string") {
      p.add(addr);
    } else if (addr && typeof addr === "object") {
      p.add(addr.streetAddress).add(addr.addressLocality).add(addr.addressRegion).add(addr.postalCode);
      // A country code after a region is noise ("..., NY, us"); keep the
      // country only when it's the most specific thing we have.
      if (!addr.addressRegion) p.add(addr.addressCountry);
    }
    return p.join();
  }

  return { embeddedEvents: { find, toEvent } };
})());
