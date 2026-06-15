// Barby event pages: https://barby.co.il/show/<id>
//
// LIMITATION: barby.co.il is a React single-page application that does not
// include event details in the initial HTML. The event data is loaded
// dynamically via JavaScript after page render. The static HTML extraction
// approach used by this extension cannot extract events from this site
// without JavaScript execution support.
//
// This extractor is registered so the toolbar icon shows green (supported)
// on barby.co.il pages, but it currently returns no events. A full
// implementation would require either:
// - Headless browser integration with JavaScript execution
// - An API-based extraction method if Barby exposes an event API
// - Manual site inspection to find structured data in script tags
//
(() => {
  const { text, firstText, blockText, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "barby",
    matches: (host) => /(^|\.)barby\.co\.il$/.test(host),
    extract() {
      const timeEl = document.querySelector("time[datetime]");
      const dom = {
        title: text("h1"),
        start: timeEl ? normalizeDateValue(timeEl.getAttribute("datetime")) : "",
        location: firstText([
          '[class*="location"]',
          '[class*="venue"]',
          '.event-location',
          '[itemprop="location"]',
        ]),
        description: (() => {
          const el = [
            '[class*="description"]',
            '.event-description',
            '[itemprop="description"]',
            'main',
          ]
            .map((sel) => document.querySelector(sel))
            .find(Boolean);
          return el ? blockText(el) : "";
        })(),
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
