// barby.co.il event pages: https://barby.co.il/show/4401
//
// TODO(agent): document the page's structure and where each field is read from,
// mirroring pipeline/sources/meetup.js. The real page is cached at
// data/barby.html.
//
// A matched host runs THIS source only — it must produce every field itself; the
// generic fallback extractor does not run for a supported host. Lean on the
// page's own schema.org JSON-LD for the fields your DOM selectors miss via the
// merge() call below (your DOM values win where present).
(() => {
  const { text, firstText, blockText, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "barby",
    matches: (host) => /(^|\.)barby\.co\.il$/.test(host),
    extract() {
      // TODO(agent): refine these selectors against data/barby.html, and
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
