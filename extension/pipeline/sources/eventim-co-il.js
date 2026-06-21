// Eventim Israel (eventim.co.il) pages:
//   https://www.eventim.co.il/en/artist/<slug>/
//   https://www.eventim.co.il/en/event/<slug>/tickets/...
//
// Expected HTML input (simplified):
//
//   <h1>מופע שנות ה-90</h1>
//   <time datetime="2026-07-02T21:30:00+03:00">...</time>
//   <span class="venue-name">Zappa Tel Aviv</span>
//   <!-- artist pages: full description in a .moretext-teaser inside .external-content -->
//
// Where each field comes from:
//   title       the page's <h1>
//   start       datetime attribute of the first <time> element
//   end/location  schema.org JSON-LD subEvent (MusicEvent) via embeddedEvents
//   description full text from .external-content .moretext-teaser (<br> → newlines)
//   ctz         always "Asia/Jerusalem" — eventim.co.il is Israel-only
(() => {
  const { text, firstText, blockText, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "eventim-co-il",
    matches: (host) => /(^|\.)eventim\.co\.il$/.test(host),
    extract() {
      const timeEl = document.querySelector("time[datetime]");
      const dom = {
        title: text("h1"),
        start: timeEl ? normalizeDateValue(timeEl.getAttribute("datetime")) : "",
        location: firstText([".venue-name", ".event-venue"]),
        description: blockText(".external-content .moretext-teaser"),
        ctz: "Asia/Jerusalem",
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
