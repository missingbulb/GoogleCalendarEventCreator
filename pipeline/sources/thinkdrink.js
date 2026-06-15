// ThinkDrink event pages: https://thinkdrink.co.il/<lang>/<slug>/
//
// Expected HTML (simplified):
//   <h1 class="hero_workshop__title">Event Title</h1>
//   <a class="hero_workshop__location">Venue name, Address</a>
//   <div class="hero_workshop__item_descr">
//     ...venue/price text...
//     15.6.2026
//     פתיחת דלתות: 18:30 תחילת הרצאה: 19:00
//   </div>
//   <div class="hero_workshop__link_info rgbc-workshop-link__info">
//     Event description text
//   </div>
//
// Where each field comes from:
//   title       h1.hero_workshop__title
//   start       DD.MM.YYYY date + first HH:MM time extracted from
//               .hero_workshop__item_descr (doors-open time comes first)
//   location    a.hero_workshop__location
//   description .hero_workshop__link_info block
//   ctz         always "Asia/Jerusalem" — events are in Tel Aviv
//
// The page's JSON-LD is WebPage type only (no schema.org Event), so there is no
// embedded event to merge with.
(() => {
  const { text, blockText } = GCal;

  // "15.6.2026 \nפתיחת דלתות: 18:30 תחילת הרצאה: 19:00"
  // -> "2026-06-15T18:30:00"
  function parseEventDateTime(s) {
    const dateMatch = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (!dateMatch) return "";
    const [, dd, mm, yyyy] = dateMatch;
    const pad = (n) => String(n).padStart(2, "0");
    const date = `${yyyy}-${pad(mm)}-${pad(dd)}`;
    const afterDate = s.slice(s.indexOf(dateMatch[0]) + dateMatch[0].length);
    const timeMatch = afterDate.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return date;
    return `${date}T${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}:00`;
  }

  GCal.sources.push({
    name: "thinkdrink",
    matches: (host) => /(^|\.)thinkdrink\.co\.il$/.test(host),
    extract() {
      const descrEl = document.querySelector(".hero_workshop__item_descr");
      return {
        title: text("h1.hero_workshop__title"),
        start: parseEventDateTime(descrEl ? descrEl.textContent : ""),
        location: text("a.hero_workshop__location"),
        description: blockText(document.querySelector(".hero_workshop__link_info")),
        ctz: "Asia/Jerusalem",
      };
    },
  });
})();
