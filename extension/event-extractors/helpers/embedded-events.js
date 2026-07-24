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
      visit(node.subEvent);
      if (Array.isArray(node.itemListElement)) {
        visit(node.itemListElement.map((it) => (it && it.item) || it));
      }
    };
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      const parsed = parseLd(script.textContent);
      if (parsed !== undefined) visit(parsed);
    }
    return found;
  }

  // Parse a JSON-LD block, tolerating the single most common real-world defect:
  // RAW (unescaped) control characters — literal newlines, tabs, carriage
  // returns — sitting inside a string value. The JSON spec forbids them, but
  // server-side templating that drops a multi-line description straight into a
  // schema.org "description" emits them anyway (seen on ASP.NET/SharePoint and
  // hand-built CMSes), which makes a strict JSON.parse throw and silently
  // discards an otherwise-perfectly-good Event. So on a parse failure, escape
  // only the control characters that appear INSIDE strings and retry once —
  // this rewrites nothing structural (control chars between tokens are already
  // valid whitespace and are left untouched) and never fabricates data. Returns
  // undefined when even the salvaged text won't parse.
  function parseLd(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      try {
        return JSON.parse(escapeControlCharsInStrings(text));
      } catch (e2) {
        return undefined;
      }
    }
  }

  // Escape raw control characters (code point < 0x20) that occur inside a JSON
  // string literal, leaving everything else — including whitespace between
  // tokens — byte-for-byte identical. Tracks string/escape state so a control
  // char outside a string (structural whitespace) is not rewritten.
  function escapeControlCharsInStrings(text) {
    let out = "";
    let inStr = false;
    let escaped = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (!inStr) {
        out += ch;
        if (ch === '"') inStr = true;
        continue;
      }
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inStr = false;
        continue;
      }
      const code = text.charCodeAt(i);
      if (code < 0x20) {
        if (ch === "\n") out += "\\n";
        else if (ch === "\r") out += "\\r";
        else if (ch === "\t") out += "\\t";
        else out += "\\u" + code.toString(16).padStart(4, "0");
        continue;
      }
      out += ch;
    }
    return out;
  }

  // `dayFirst` (default false) is forwarded to normalizeDateValue so a non-ISO
  // startDate/endDate written as an ambiguous DD/MM/YYYY slash date (which
  // schema.org shouldn't carry, but non-US sites emit anyway) is read day-first
  // when the caller knows the page's locale is day-first.
  function toEvent(ld, dayFirst) {
    if (!ld) return {};
    return {
      title: GCal.clean(ld.name),
      start: GCal.normalizeDateValue(ld.startDate, dayFirst),
      end: GCal.normalizeDateValue(ld.endDate, dayFirst),
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
    const addr = loc.address;
    // Some sites put the venue's whole formatted postal address into Place.name
    // AND repeat the pieces in `address`. When the name already spells out both
    // the city and the street, it's a complete address on its own — appending
    // the parsed parts only duplicates them and tacks on noise (the district),
    // so use the name verbatim, the way a dedicated source reads it.
    if (nameIsFullAddress(loc.name, addr)) return GCal.clean(loc.name);
    const p = GCal.parts((cand, kept) => kept.toLowerCase().includes(cand.toLowerCase()));
    p.add(loc.name);
    if (typeof addr === "string") {
      p.add(addr);
    } else if (addr && typeof addr === "object") {
      p.add(addr.streetAddress).add(addr.addressLocality).add(addr.addressRegion).add(addr.postalCode);
      // A country code after a region is noise ("..., NY, us"); keep the
      // country only when it's the most specific thing we have.
      if (!addr.addressRegion) p.add(countryName(addr.addressCountry));
    }
    return p.join();
  }

  // Whether Place.name is ITSELF the full formatted address — a comma-separated
  // string that already contains both the city (addressLocality) and the street
  // (streetAddress with its house number removed, since the name may reorder or
  // drop the number). Only then is re-composing the structured parts redundant.
  // Requiring BOTH the city and a substantive (≥4 char) street core keeps a
  // venue merely named after its city ("Zappa Tel Aviv", street elsewhere) from
  // qualifying, so its street is still composed in.
  function nameIsFullAddress(name, addr) {
    if (!addr || typeof addr !== "object") return false;
    const hay = GCal.clean(name).toLowerCase();
    if (!hay.includes(",")) return false;
    const locality = GCal.clean(addr.addressLocality).toLowerCase();
    const streetCore = GCal.clean(String(addr.streetAddress || "").replace(/\d+/g, " ")).toLowerCase();
    if (!locality || streetCore.length < 4) return false;
    return hay.includes(locality) && hay.includes(streetCore);
  }

  // schema.org allows addressCountry to be a plain string OR a Country object
  // ({ "@type": "Country", "name": "..." }, seen on livenation.de) — read the
  // name out of either shape so an object doesn't stringify to "[object
  // Object]". A short code held in the object form ("US") is dropped as
  // noise, the same convention custom/livenation.js already applies locally
  // for this exact shape; a plain-string code is passed through unchanged
  // (sites publish those directly, and existing sources rely on seeing it).
  function countryName(v) {
    if (typeof v === "string") return v;
    if (v && typeof v.name === "string") return v.name.length > 2 ? v.name : "";
    return "";
  }

  return { embeddedEvents: { find, toEvent } };
})());
