// Luma event pages: https://luma.com/<slug> (also lu.ma/<slug>)
//
// A Next.js app with no JSON-LD and no server-rendered <time> markup — the
// generic layer would only get the <h1> title (and a noisy " · Luma" suffix
// from og:title). Everything else lives as JSON in:
//
//   <script id="__NEXT_DATA__" type="application/json">
//     { "props": { "pageProps": { "initialData": {
//       "kind": "event",
//       "data": {
//         "event": {
//           "name": "Monet X Manet",
//           "start_at": "2026-06-17T17:30:00.000Z",   // exact UTC instants
//           "end_at":   "2026-06-17T20:30:00.000Z",
//           "timezone": "Asia/Jerusalem",
//           "geo_address_info": { "city_state": "Tel Aviv-Yafo, Israel",
//                                 "sublocality": "Florentin", ... }
//         },
//         "description_mirror": { "type": "doc", "content": [ ...ProseMirror... ] }
//       }
//     } } } }
//   </script>
//
// Where each field comes from:
//   title       event.name
//   start/end   event.start_at / event.end_at (exact UTC instants)
//   ctz         event.timezone — the event's own IANA zone; main.js re-expresses
//               the UTC start/end as floating local time in it, so the Calendar
//               event reads as the event's city shows
//   location    event.geo_address_info — the street address when public, else
//               the obfuscated neighbourhood/city ("guests-only" events only
//               reveal an approximate area until you RSVP)
//   description description_mirror, a ProseMirror doc, flattened to plain text
//               (one line per block; link/text nodes concatenated in order)
(() => {
  const { clean, isValidTimezone } = GCal;

  function readData() {
    const script = document.getElementById("__NEXT_DATA__");
    if (!script) return null;
    try {
      const initial = JSON.parse(script.textContent).props.pageProps.initialData;
      return initial && initial.kind === "event" ? initial.data : null;
    } catch (e) {
      return null;
    }
  }

  function flattenLocation(event) {
    const geo = event.geo_address_info || {};
    const parts = [];
    const add = (value) => {
      value = clean(value || "");
      if (value && !parts.some((p) => p.toLowerCase() === value.toLowerCase())) {
        parts.push(value);
      }
    };
    add(geo.name);
    add(geo.full_address || geo.address);
    // An obfuscated ("guests-only") location carries no street address; fall
    // back to the approximate neighbourhood and city it does expose.
    if (!parts.length) {
      add(geo.sublocality);
      add(geo.city_state || geo.city);
      if (!geo.city_state) {
        add(geo.region);
        add(geo.country);
      }
    }
    return parts.join(", ");
  }

  // Render a ProseMirror document to plain text: one line per top-level block,
  // each block the concatenation of its (possibly nested) text nodes.
  function renderDoc(doc) {
    if (!doc || !Array.isArray(doc.content)) return "";
    const renderNode = (node) => {
      if (!node) return "";
      if (node.type === "text") return node.text || "";
      if (Array.isArray(node.content)) return node.content.map(renderNode).join("");
      return "";
    };
    return doc.content
      .map((block) => renderNode(block).trim())
      .filter((line) => line !== "")
      .join("\n");
  }

  GCal.sources.push({
    name: "luma",
    matches: (host) => /(^|\.)(luma\.com|lu\.ma)$/.test(host),
    extract() {
      const data = readData();
      if (!data || !data.event) return {};
      const event = data.event;
      const tz = clean(event.timezone);
      return {
        title: clean(event.name),
        start: event.start_at || "",
        end: event.end_at || null,
        location: flattenLocation(event),
        description: renderDoc(data.description_mirror),
        ctz: isValidTimezone(tz) ? tz : "",
      };
    },
  });
})();
