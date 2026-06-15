// Secret Tel Aviv event pages: https://www.secrettelaviv.com/tickets/<event-slug>
//
// Expected HTML input (simplified):
//
//   <h1>Event Title</h1>
//   <div class="event-time">
//     <time datetime="2026-06-16T18:30:00+03:00">...</time>
//   </div>
//   <div class="event-location">Venue Name</div>
//   <div class="event-description">Event details...</div>
//
// Where each field comes from:
//   title       the page's <h1>
//   start       datetime attribute of <time>
//   location    event location text or data attributes
//   description event description section
//
(() => {
  const { text, firstText, blockText, normalizeBlock, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "secrettelaviv",
    matches: (host) => /(^|\.)secrettelaviv\.com$/.test(host),
    extract() {
      const timeEl = document.querySelector("time[datetime]");
      const dom = {
        title: text("h1"),
        start: timeEl ? normalizeDateValue(timeEl.getAttribute("datetime")) : "",
        location: firstText([
          '[class*="location"]',
          '[class*="venue"]',
          '.event-location',
          'div[data-testid*="location"]',
        ]),
        description: (() => {
          const el = [
            '[class*="description"]',
            '[class*="details"]',
            '.event-description',
            'div[data-testid*="description"]',
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
