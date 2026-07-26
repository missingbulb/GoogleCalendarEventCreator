// comy.co.il event pages: https://comy.co.il/event/adir-miller/
//
// TODO(agent): document the page's structure and where each field is read from,
// mirroring event-extractors/custom/meetup.js. The real page is cached at
// dev/requirements/extractor/data/server-fetched/comy.html.
//
// This source is a layer of OVERRIDES over the core generic extractor
// (generic-extractor.js), which has already read the page's own
// schema.org JSON-LD, Open Graph tags, microdata and visible dates. State ONLY
// the fields it gets wrong — anything you leave out comes from that base. If it
// turns out to get everything right, just delete this file — the host is already
// registered in supportedDomains, so the site stays fully supported without it.
(() => {
  const { text, firstText, blockText, normalizeDateValue } = GCal;

  GCal.sources.push({
    name: "comy",
    matches: (host) => /(^|\.)comy\.co\.il$/.test(host),
    extract() {
      // TODO(agent): refine these selectors against dev/requirements/extractor/data/server-fetched/comy.html,
      // dropping any the generic base already gets right and adding location /
      // description / ctz as the page needs them.
      return {
        title: text("h1"),
        start: (() => {
          const el = document.querySelector("time[datetime]");
          return el ? normalizeDateValue(el.getAttribute("datetime")) : "";
        })(),
      };
    },
  });
})();
