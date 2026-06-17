// livenation.de event pages: https://www.livenation.de/muse-tickets-adp647#international
//
// Expected HTML input (simplified):
//
//   <h1>Muse</h1>
//   <time dateTime="2026-11-24T00:00:00.000Z">Nov. 24, 2026</time>
//   ... event details in page body ...
//
// Where each field comes from:
//   title       the page's <h1>
//   start       datetime attribute of the first <time> element
//   location    venue information embedded in the page body
//   description event details and description in the page body
//
// livenation.de embeds schema.org JSON-LD event data, which fills gaps in DOM
// extraction. The first h1 is the artist/event title; the time elements carry
// datetime attributes in ISO format. The page body contains venue and event details.
(() => {
  const { text, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "livenation",
    matches: (host) => /(^|\.)livenation\.de$/.test(host),
    extract() {
      const dom = {
        title: text("h1"),
        start: (() => {
          const el = document.querySelector("time[dateTime]");
          return el ? normalizeDateValue(el.getAttribute("dateTime")) : "";
        })(),
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
