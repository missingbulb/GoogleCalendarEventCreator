// Facebook event pages: https://www.facebook.com/events/<id>/
//
// Facebook's markup is machine-generated and obfuscated (class names like
// "x1heor9g" that change between builds), so there are no stable selectors
// to hardcode. Expected HTML input (simplified):
//
//   <title>Summer Rooftop Party | Facebook</title>
//   <div role="main">
//     <span>Saturday, June 20, 2026 at 7 PM</span>   <- human-readable date
//     <h1>Summer Rooftop Party</h1>
//   </div>
//
// Where each field comes from:
//   title  the <h1> if present, otherwise the document title with the
//          trailing "| Facebook" removed
//   start  the first date-and-time pattern found in the page's visible text
//          (top 4000 chars — the event date is always near the top)
//
// Location and description are left for the jsonld.js / generic.js layers,
// which pick up Facebook's meta tags when the page exposes them.
(() => {
  const { clean, text, bodyText, parseDateFromText } = GCal;

  GCal.sites.push({
    name: "facebook",
    matches: (host) => /(^|\.)facebook\.com$/.test(host),
    extract() {
      let title = text('h1, [role="main"] h2 span');
      if (!title) {
        title = clean(document.title.replace(/\s*\|\s*Facebook\s*$/i, ""));
      }
      return {
        title,
        start: parseDateFromText(bodyText().slice(0, 4000)),
      };
    },
  });
})();
