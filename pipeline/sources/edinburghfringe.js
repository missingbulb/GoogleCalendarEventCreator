// Edinburgh Festival Fringe show pages:
// https://www.edfringe.com/tickets/whats-on/<slug>
//
// A Next.js app: there's no JSON-LD or server-rendered <h1>/<time> markup,
// but every page embeds its data as JSON in:
//
//   <script id="__NEXT_DATA__" type="application/json">
//     { "props": { "pageProps": { "data": { "event": {
//       "title": "Sophie Duker: Hot Beef Injection",
//       "description": "...",
//       "venues": [ { "title": "Pleasance Courtyard",
//                      "address1": "60 Pleasance", "postCode": "EH8 9TJ" } ],
//       "spaces": [ { "venueName": "Forth at Pleasance Courtyard" } ],
//       "performances": [
//         { "dateTime": "2026-08-05T19:30:00.000Z",
//           "estimatedEndDateTime": "2026-08-05T21:00:00.000Z" },
//         ... one entry per performance ...
//       ]
//     } } } } }
//   </script>
//
// Where each field comes from:
//   title       event.title
//   start/end   the first performance's dateTime/estimatedEndDateTime
//               (already exact UTC instants)
//   location    the space's venueName (more specific than the venue name
//               alone, e.g. "Forth at Pleasance Courtyard") plus the venue's
//               address and postcode
//   description event.description
//
// A show usually runs on most days of the festival; we surface the first
// performance as the event. Every Fringe show runs in Edinburgh, so `ctz` is
// always "GB" — even on pages where the event JSON couldn't be found.
(() => {
  const { clean, jsonScript, parts } = GCal;

  function readEvent() {
    const next = jsonScript("#__NEXT_DATA__");
    const data = next && next.props && next.props.pageProps && next.props.pageProps.data;
    return (data && data.event) || null;
  }

  function flattenLocation(event) {
    const venue = (event.venues || [])[0];
    const space = (event.spaces || [])[0];
    // Case-sensitive de-dup: these are proper names/postcodes, not address
    // fragments that repeat with different casing.
    const loc = parts((a, b) => a === b);
    loc.add((space && space.venueName) || (venue && venue.title));
    if (venue) loc.add(venue.address1).add(venue.address2).add(venue.postCode);
    return loc.join();
  }

  GCal.sources.push({
    name: "edinburghfringe",
    matches: (host) => /(^|\.)edfringe\.com$/.test(host),
    extract() {
      const event = readEvent();
      if (!event) return { ctz: "GB" };

      const loc = flattenLocation(event);
      const t = clean(event.title);
      const performances = event.performances || [];

      if (!performances.length) {
        return { title: t, start: "", end: null, location: loc, description: clean(event.description), ctz: "GB" };
      }

      return {
        events: performances.map((p) => ({
          title: t,
          start: p.dateTime || "",
          end: p.estimatedEndDateTime || null,
          location: loc,
        })),
        description: clean(event.description),
        ctz: "GB",
      };
    },
  });
})();
