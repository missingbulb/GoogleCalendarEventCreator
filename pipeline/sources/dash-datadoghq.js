// dash.datadoghq.com event pages: https://dash.datadoghq.com/
//
// The DASH conference site is built with Astro.js. No standard event-heading
// DOM structure; all event data is carried in a schema.org JSON-LD block:
//
//   <script type="application/ld+json">
//   {"@context":"https://schema.org","@type":"Event",
//    "name":"DASH by Datadog 2026",
//    "startDate":"2026-06-09T08:00:00-04:00",
//    "endDate":"2026-06-10T17:30:00-04:00",
//    "location":{"@type":"Place","name":"Javits Center North",
//      "address":{"streetAddress":"445 11th Ave","addressLocality":"New York",
//                 "addressRegion":"NY","postalCode":"10001"}},
//    "description":"DASH by Datadog annual conference in New York City (June 9–10, 2026)."}
//   </script>
//
// Where each field comes from:
//   title       JSON-LD event name
//   start       JSON-LD startDate (ISO with -04:00 EDT offset)
//   end         JSON-LD endDate
//   location    JSON-LD location flattened: "Javits Center North, 445 11th Ave, New York, NY, 10001"
//   description JSON-LD description
//   ctz         America/New_York — the DASH conference is always held in NYC;
//               the -04:00 UTC offset in the JSON-LD confirms US Eastern time
//
(() => {
  const { merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "dash-datadoghq",
    matches: (host) => /(^|\.)dash\.datadoghq\.com$/.test(host),
    extract() {
      const dom = {
        ctz: "America/New_York",
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
