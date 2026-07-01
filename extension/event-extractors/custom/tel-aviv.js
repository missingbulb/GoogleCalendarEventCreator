// tel-aviv.gov.il event pages: https://www.tel-aviv.gov.il/Pages/MainItemPage.aspx?ItemId=14073&ListID=9dd2da03-5c43-462a-b5b2-d087c179b16c&WebID=3af57d92-807c-43c5-8d5f-6fd455eb2776
//
// TODO(agent): document the page's structure and where each field is read from,
// mirroring event-extractors/custom/meetup.js. The real page is cached at
// dev/requirements/extractor/data/server-fetched/tel-aviv.html.
//
// A matched host runs THIS source only — it must produce every field itself; the
// generic fallback extractor does not run for a supported host. Lean on the
// page's own schema.org JSON-LD for the fields your DOM selectors miss via the
// merge() call below (your DOM values win where present).
(() => {
  const { text, firstText, blockText, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "tel-aviv",
    matches: (host) => /(^|\.)tel-aviv\.gov\.il$/.test(host),
    extract() {
      // TODO(agent): refine these selectors against dev/requirements/extractor/data/server-fetched/tel-aviv.html, and
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
