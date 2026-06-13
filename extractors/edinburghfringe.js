// Edinburgh Festival Fringe show pages:
// https://www.edfringe.com/tickets/whats-on/<slug>
//
// Every Fringe show runs in Edinburgh, so regardless of how a date/time is
// written on the page, it's always UK local time — this extractor's main job
// is to pin that down with `ctz: "GB"` so the Calendar event keeps the
// correct wall-clock time for viewers in any timezone. Title, start/end,
// location and description are left to the jsonld.js / generic.js layers.
//
// Many Fringe shows run on most days for the whole festival; when the page
// lists several performances, `eventCount` counts every `<time datetime>` in
// the performance/date list so the multiple-events note reflects the true
// total (schema.org JSON-LD on these pages typically only describes one
// performance).
(() => {
  GCal.sites.push({
    name: "edinburghfringe",
    matches: (host) => /(^|\.)edfringe\.com$/.test(host),
    extract() {
      const performanceTimes = document.querySelectorAll(
        '[class*="performance" i] time[datetime], [class*="date" i] time[datetime], time[datetime]'
      );
      return {
        ctz: "GB",
        eventCount: performanceTimes.length,
      };
    },
  });
})();
