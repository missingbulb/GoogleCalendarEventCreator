// tabitisrael.co.il event pages: https://tabitisrael.co.il/%D7%94%D7%96%D7%9E%D7%A0%D7%AA-%D7%9E%D7%A7%D7%95%D7%9D/create-reservation?step=summary&reservationId=6a33bcc52be576d72af18276&orgId=599ac32e5eb82a2200ba84e9&type=future_reservation&source=tabit&saved=1
//
// TODO(agent): document the page's structure and where each field is read from,
// mirroring pipeline/sources/meetup.js. The real page is cached at
// data/tabitisrael.html.
//
// A matched host runs THIS source only — it must produce every field itself; the
// generic fallback extractor does not run for a supported host. Lean on the
// page's own schema.org JSON-LD for the fields your DOM selectors miss via the
// merge() call below (your DOM values win where present).
(() => {
  const { text, firstText, blockText, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "tabitisrael",
    matches: (host) => /(^|\.)tabitisrael\.co\.il$/.test(host),
    extract() {
      // TODO(agent): refine these selectors against data/tabitisrael.html, and
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
