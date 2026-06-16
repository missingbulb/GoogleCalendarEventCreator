// StubHub event pages: https://www.stubhub.com/<name>-tickets-<date>/event/<id>
// Also performer pages: https://www.stubhub.com/<name>-tickets/performer/<id>
//
// A Next.js app. Event pages publish a schema.org MusicEvent in JSON-LD;
// performer/listing pages do not carry per-event JSON-LD.
//
// Expected HTML input (simplified, event page):
//
//   <h1>Shlomo Artzi</h1>
//   <script type="application/ld+json">
//   { "@type": "MusicEvent",
//     "name": "Shlomo Artzi",
//     "startDate": "2026-06-23T20:30:00+03:00",
//     "location": { "@type": "Place", "name": "Anaba Park Modiin",
//                   "address": { "streetAddress": "...", "addressLocality": "Modi'in", ... } },
//     "description": "..." }
//   </script>
//
// Where each field comes from:
//   title       the page's <h1>; falls back to JSON-LD name
//   start/end   JSON-LD startDate/endDate (carries venue's UTC offset)
//   location    JSON-LD location (Place name + address)
//   description JSON-LD description
//   ctz         IANA timezone from inline scripts (when present)
//
(() => {
  const { text, normalizeDateValue, findTimezone, scriptsText, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "stubhub",
    matches: (host) => /(^|\.)stubhub\./.test(host),
    extract() {
      const dom = {
        title: text("h1"),
        start: (() => {
          const el = document.querySelector("time[datetime]");
          return el ? normalizeDateValue(el.getAttribute("datetime")) : "";
        })(),
        ctz: findTimezone(scriptsText(), /"timezone"\s*:\s*"([^"]+)"/),
      };
      // JSON-LD fills start/end/location/description on specific event pages;
      // DOM selectors above win where they match.
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
