// schema.org JSON-LD extractor — the strongest generic signal, since most
// event pages embed it for search engines.
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
// "itemListElement" wrappers; findEvents() collects them all, in document
// order, so listing pages yield every event (main.js suggests the first).
//
// Field mapping: title/start/end/description come straight from the
// name/startDate/endDate/description properties (description with HTML tags
// stripped); location flattens Place name + PostalAddress parts into one
// comma-separated string.
(() => {
  const { clean, normalizeDateValue } = GCal;

  function findEvents() {
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
      title: clean(ld.name),
      start: normalizeDateValue(ld.startDate),
      end: normalizeDateValue(ld.endDate),
      location: flattenLocation(ld.location),
      description: stripHtml(ld.description),
    };
  }

  function flattenLocation(loc) {
    if (!loc) return "";
    if (Array.isArray(loc)) loc = loc[0];
    if (typeof loc === "string") return clean(loc);
    const parts = [];
    if (loc.name) parts.push(clean(loc.name));
    const addr = loc.address;
    if (typeof addr === "string") {
      parts.push(clean(addr));
    } else if (addr && typeof addr === "object") {
      parts.push(
        [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, addr.addressCountry]
          .map(clean)
          .filter(Boolean)
          .join(", ")
      );
    }
    return parts.filter(Boolean).join(", ");
  }

  function stripHtml(s) {
    if (!s) return "";
    const div = document.createElement("div");
    div.innerHTML = s;
    return clean(div.textContent);
  }

  GCal.jsonLd = { findEvents, toEvent };
})();
