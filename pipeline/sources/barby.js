// barby.co.il event pages: https://barby.co.il/show/4401
//
// Expected HTML input (simplified):
//
//   <div class="showScreen">
//     <div class="show-card-body-2">
//       <h1 class="show-card-showname">אפרת גוש- הופעת בכורה לאלבום החדש</h1>
//       <div class="show-card-showdate">
//         <h4>16/06/2026 | שעת פתיחת דלתות: 21:00</h4>
//       </div>
//     </div>
//     <div class="show1-description">...event description HTML...</div>
//   </div>
//   <span id="footer-addres">הנמל 1 - נמל יפו</span>
//
// Where each field comes from:
//   title       h1.show-card-showname
//   start       div.show-card-showdate h4 text, parsed from "DD/MM/YYYY | ... HH:MM"
//               (Israeli day-first format, doors-opening time used as event start)
//   location    "בארבי" (fixed venue name) + footer span#footer-addres address
//   description div.show1-description (HTML rendered to text)
//   ctz         fixed to Asia/Jerusalem (Barby is in Tel Aviv)
//
(() => {
  const { text, blockText, merge, embeddedEvents } = GCal;

  // Parse "DD/MM/YYYY | שעת פתיחת דלתות: HH:MM" (Israeli day-first date).
  function parseBarbyDate(raw) {
    const m = (raw || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:.*?(\d{2}:\d{2}))?/);
    if (!m) return "";
    const [, d, mo, y, t] = m;
    const date = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return t ? `${date}T${t}:00` : date;
  }

  GCal.sources.push({
    name: "barby",
    matches: (host) => /(^|\.)barby\.co\.il$/.test(host),
    extract() {
      const addr = text("#footer-addres");
      const dom = {
        title: text("h1.show-card-showname"),
        start: parseBarbyDate(text(".show-card-showdate h4")),
        location: addr ? `בארבי, ${addr}` : "בארבי, הנמל 1, נמל יפו",
        description: blockText(".show1-description"),
        ctz: "Asia/Jerusalem",
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
