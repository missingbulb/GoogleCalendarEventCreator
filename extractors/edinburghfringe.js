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
//   eventCount  number of performances listed (a show usually runs on most
//               days of the festival, but main.js only suggests the first)
//
// Every Fringe show runs in Edinburgh, so `ctz` is always "GB" — even on
// pages where the event JSON couldn't be found.
(() => {
  const { clean } = GCal;

  function readEvent() {
    const script = document.getElementById("__NEXT_DATA__");
    if (!script) return null;
    try {
      return JSON.parse(script.textContent).props.pageProps.data.event;
    } catch (e) {
      return null;
    }
  }

  function flattenLocation(event) {
    const venue = (event.venues || [])[0];
    const space = (event.spaces || [])[0];
    const parts = [];
    const add = (value) => {
      value = clean(value || "");
      if (value && !parts.includes(value)) parts.push(value);
    };
    add((space && space.venueName) || (venue && venue.title));
    if (venue) {
      add(venue.address1);
      add(venue.address2);
      add(venue.postCode);
    }
    return parts.join(", ");
  }

  GCal.sites.push({
    name: "edinburghfringe",
    matches: GCal.siteHosts.find((s) => s.name === "edinburghfringe").matches,
    extract() {
      const event = readEvent();
      if (!event) return { ctz: "GB" };

      const performances = event.performances || [];
      const first = performances[0];

      return {
        title: clean(event.title),
        start: first ? first.dateTime : "",
        end: first ? first.estimatedEndDateTime : "",
        location: flattenLocation(event),
        description: clean(event.description),
        ctz: "GB",
        eventCount: performances.length,
      };
    },
  });
})();
