// eventer.co.il event pages: https://www.eventer.co.il/8lfff
//
// This is an AngularJS app whose templating never resolves without running the
// page's JS — but the server-rendered HTML still carries the real data in two
// places: a few SEO-facing DOM nodes (the <h1>, the location block) hold actual
// resolved text alongside the still-literal `{{...}}` bindings elsewhere, and the
// page embeds a complete schema.org JSON-LD block.
//
// Expected HTML input (simplified):
//
//   <h1 class="descriptionHeader ...">לילה לא שקט ✴︎ לבונטין 7 במוזיאון תל אביב</h1>
//   <div class="locationDescription ...">
//     <div class="flipFloat"><span>כתובת:</span></div>
//     <div class="ng-binding">מוזיאון תל אביב לאמנות, שדרות שאול המלך, תל אביב-יפו, ישראל</div>
//   </div>
//   <div class="extendedInfo boxDetailsItem">
//     <p id="eventDescription" ng-bind-html="...">...</p>  <!-- a nested <p> inside this
//          one auto-closes it empty; the parser promotes the real body to sibling <p>s,
//          all still under this same parent div -->
//     <p>...full description...</p>
//   </div>
//   <script type="application/ld+json">{ "@type": "Event", "name": "...",
//     "startDate": "2026-07-09T16:30:00.000Z", "endDate": "2026-07-09T20:30:00.000Z",
//     "description": "<155-char truncated snippet>", "location": {...} }</script>
//
// Where each field comes from:
//   title       the page's <h1>
//   start/end   schema.org JSON-LD (startDate/endDate) via embeddedEvents — the
//               page has no resolved <time> element
//   location    the resolved text node inside .locationDescription, rather than
//               JSON-LD's flattened address (which would also restate the street/
//               city already folded into the venue name)
//   description full text of .extendedInfo.boxDetailsItem (see the markup note
//               above) — JSON-LD's own description is only a 155-char snippet
//   ctz         always "Asia/Jerusalem" — eventer.co.il is Israel-only
(() => {
  const { text, blockText, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "eventer",
    matches: (host) => /(^|\.)eventer\.co\.il$/.test(host),
    extract() {
      const dom = {
        title: text("h1"),
        location: text(".locationDescription div.ng-binding"),
        description: blockText(".extendedInfo.boxDetailsItem"),
        ctz: "Asia/Jerusalem",
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
