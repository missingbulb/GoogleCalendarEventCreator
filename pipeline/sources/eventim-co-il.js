// Eventim Israel (eventim.co.il) pages:
//   https://www.eventim.co.il/en/artist/<slug>/
//   https://www.eventim.co.il/en/event/<slug>/tickets/...
//
// Expected HTML input (simplified):
//
//   <h1>מופע שנות ה-90</h1>
//   <time datetime="2026-07-02T21:30:00+03:00">...</time>
//   <span class="venue-name">Zappa Tel Aviv</span>
//
// Where each field comes from:
//   title       the page's <h1>
//   start       datetime attribute of the first <time> element; Eventim also
//               embeds schema.org JSON-LD (used as fallback via embeddedEvents)
//   location    venue name/address near the date block
//   ctz         always "Asia/Jerusalem" — eventim.co.il is Israel-only
//
// Eventim embeds schema.org Event JSON-LD; the generic layer fills any gaps
// the DOM selectors miss (end time, fuller location, etc.).
(() => {
  const { text, firstText, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "eventim-co-il",
    matches: (host) => /(^|\.)eventim\.co\.il$/.test(host),
    extract() {
      const timeEl = document.querySelector("time[datetime]");
      const dom = {
        title: text("h1"),
        start: timeEl ? normalizeDateValue(timeEl.getAttribute("datetime")) : "",
        location: firstText([
          ".venue-name",
          ".event-venue",
          '[class*="venue"]',
          '[class*="location"]',
        ]),
        ctz: "Asia/Jerusalem",
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
