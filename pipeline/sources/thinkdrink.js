// ThinkDrink event pages: https://thinkdrink.co.il/<lang>/<slug>/
//
// Expected HTML input (simplified):
//   <h1 class="entry-title">Event Title</h1>
//   <time class="entry-date" datetime="2026-06-15T18:30:00+03:00">...</time>
//   <div class="entry-content">
//     <p>Event description...</p>
//   </div>
//
// Where each field comes from:
//   title       the page's <h1>
//   start       datetime attribute of the first <time datetime> on the page;
//               falls back to parseDateFromText on visible date text
//   location    a venue paragraph or address element in the content,
//               or og:description meta fallback hint
//   description .entry-content or .post-content block
//   ctz         always "Asia/Jerusalem" — venue is in Tel Aviv
//
// ThinkDrink also embeds schema.org Event JSON-LD on some pages; merge() lets
// that fill any gaps this extractor leaves.
(() => {
  const { text, firstText, blockText, meta, normalizeDateValue, parseDateFromText, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "thinkdrink",
    matches: (host) => /(^|\.)thinkdrink\.co\.il$/.test(host),
    extract() {
      const timeEl = document.querySelector("time[datetime]");
      const dom = {
        title: firstText(["h1.entry-title", "h1.page-title", "h1"]),
        start: (() => {
          if (timeEl) return normalizeDateValue(timeEl.getAttribute("datetime"));
          // Fall back to scanning visible date text in common containers
          const dateEl = document.querySelector(".event-date, .tribe-event-schedule-details, .date");
          return dateEl ? parseDateFromText(dateEl.textContent) : "";
        })(),
        location: firstText([
          ".event-location",
          ".tribe-venue",
          ".tribe-venue-location",
          '[class*="location"]',
          '[class*="venue"]',
        ]),
        description: blockText(
          document.querySelector(".entry-content, .post-content, .tribe-events-single-section--description")
        ),
        ctz: "Asia/Jerusalem",
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
