// dash.datadoghq.com event pages: https://dash.datadoghq.com/?utm_source=events&utm_medium=internal&utm_campaign=summit-202606dash&_gl=1*16jytk3*_gcl_au*MTE5Mjc4MTU1OC4xNzgxNjI5MTgw*_ga*MTc4MDYxMDY2Mi4xNzgxNjI5MTk4*_ga_KN80RDFSQK*czE3ODE2NDczMDQkbzIkZzEkdDE3ODE2NDczNDAkajI0JGwwJGgyNzI0NTIyODM.*_fplc*N2tQYkJUcUJDUkFZUkZkUDR0TDE4TTROSXI4Q0ZBZiUyQlkxUXIzOHNscmQzZkttRUt0ZTB1bXRMSjFFZXBwSHh6biUyQmVYN1c0NDdaY0dUQ1JkMkh3Szl4MEcxcmw2cDUzSlJ3UHE3bXZTd01vU3JYMUQ2aXpGTnhYJTJCallYVm9BJTNEJTNE
//
// TODO(agent): document the page's structure and where each field is read from,
// mirroring pipeline/sources/meetup.js. The real page is cached at
// data/dash-datadoghq.html.
//
// A matched host runs THIS source only — it must produce every field itself; the
// generic fallback extractor does not run for a supported host. Lean on the
// page's own schema.org JSON-LD for the fields your DOM selectors miss via the
// merge() call below (your DOM values win where present).
(() => {
  const { text, firstText, blockText, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "dash-datadoghq",
    matches: (host) => /(^|\.)dash\.datadoghq\.com$/.test(host),
    extract() {
      // TODO(agent): refine these selectors against data/dash-datadoghq.html, and
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
