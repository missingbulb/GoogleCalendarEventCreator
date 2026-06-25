// livenation.de tour/artist pages: https://www.livenation.de/<artist>-tickets-<code>
//
// Expected HTML structure:
//   Multiple <script type="application/ld+json"> blocks, each a MusicEvent:
//     { "@type": "MusicEvent",
//       "name": "Muse - The Wow! Signal Tour",
//       "startDate": "2026-07-06T00:00:00Z",     <- UTC ISO for US shows,
//       "endDate":   "2026-07-06T00:00:00Z",        date-only for EU shows without time
//       "location": { "@type": "Place",
//                     "name": "Hollywood Casino Amphitheater",
//                     "address": { "streetAddress": "14141 Riverport Dr",
//                                  "addressLocality": "Maryland Heights",
//                                  "postalCode": "63043",
//                                  "addressCountry": { "@type": "Country", "name": "US" } } } }
//   A separate MusicGroup entry (the artist) is also present; embeddedEvents.find()
//   skips it (only types ending in "Event" are collected).
//
// "addressCountry" is an object { "@type": "Country", "name": "..." } rather than a
// plain string, so the shared flattenLocation helper would produce "[object Object]"
// for it. locationFromLd() below handles it locally.
//
// A tour/artist page shows all dates on one URL; each MusicEvent is one concert.
// Same-venue multi-night runs (e.g. two nights at The O2 London) are emitted as
// separate events and then collapsed by assemble-events.js's group() into one
// multi-instance event.
//
// Where each field comes from:
//   title       JSON-LD `name`
//   start       JSON-LD `startDate` via normalizeDateValue (UTC ISO or date-only)
//   end         JSON-LD `endDate` (omitted when equal to startDate)
//   location    place name + street + city [+ country name when a full name]
//   description omitted — the page's JSON-LD description is a machine-generated
//               one-liner not useful in a calendar
(() => {
  const { clean, normalizeDateValue, parts, embeddedEvents } = GCal;

  // Build a readable location from a schema.org Place object.
  // "addressCountry" on this page is always { "@type": "Country", "name": "..." }
  // (an object), not a plain string — handled here so it doesn't stringify to
  // "[object Object]". Country is included only when it's a multi-character name
  // (e.g. "United Kingdom", "Germany") — short codes like "US" add little value
  // and tend to overlap with other parts of the address anyway.
  function locationFromLd(loc) {
    if (!loc || typeof loc !== "object") return "";
    const addr = loc.address || {};
    const country = addr.addressCountry;
    const countryName =
      typeof country === "string"
        ? country
        : country && typeof country.name === "string"
        ? country.name
        : "";

    const p = parts((cand, kept) => kept.toLowerCase().includes(cand.toLowerCase()));
    p.add(loc.name);
    p.add(addr.streetAddress);
    p.add(addr.addressLocality);
    p.add(addr.postalCode);
    if (countryName.length > 2) p.add(countryName);
    return p.join();
  }

  GCal.sources.push({
    name: "livenation",
    matches: (host) => /(^|\.)livenation\.de$/.test(host),
    extract() {
      const events = embeddedEvents
        .find()
        .map((ld) => {
          const title = clean(ld.name);
          const start = normalizeDateValue(ld.startDate);
          const end = normalizeDateValue(ld.endDate);
          const location = locationFromLd(ld.location);
          if (!title || !start || !location) return null;
          // Omit end when it equals start (livenation sets endDate = startDate).
          return { title, start, end: end !== start ? end : null, location };
        })
        .filter(Boolean);

      return events.length ? { events } : {};
    },
  });
})();
