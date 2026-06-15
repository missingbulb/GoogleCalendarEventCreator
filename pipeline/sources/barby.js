// Barby event pages: https://barby.co.il/show/<id>
//
// Expected HTML input (simplified):
//   <h1>Concert Title</h1>
//   <div class="event-date">
//     <time datetime="2026-06-25T21:00:00+03:00">...</time>
//   </div>
//   <div class="event-location">...</div>
//   <div class="event-description">...</div>
//
// Where each field comes from:
//   title       the page's <h1>
//   start       datetime attribute of <time> element
//   location    event location text/elements
//   description the event description section
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
