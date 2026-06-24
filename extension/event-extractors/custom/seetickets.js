// seetickets.com event pages: https://www.seetickets.com/tour/the-mary-wallopers?src=mk_hpmusicicon
//
// TODO(agent): document the page's structure and where each field is read from,
// mirroring event-extractors/custom/meetup.js. The real page is cached at
// dev/requirements/extractor/data/seetickets.html.
//
// A matched host runs THIS source only — it must produce every field itself; the
// generic fallback extractor does not run for a supported host. Lean on the
// page's own schema.org JSON-LD for the fields your DOM selectors miss via the
// merge() call below (your DOM values win where present).
(() => {
  const { text, firstText, blockText, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "seetickets",
    matches: (host) => /(^|\.)seetickets\.com$/.test(host),
    extract() {
      // TODO(agent): refine these selectors against dev/requirements/extractor/data/seetickets.html, and
      // add location / description / ctz as the page needs them.
      const dom = {
        title: text("h1"),
        start: (() => {
          const el = document.querySelector("time[datetime]");
          return el ? normalizeDateValue(el.getAttribute("datetime")) : "";
        })(),
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
