// tzavta.co.il event pages: https://www.tzavta.co.il/event/5151
//
// Server-rendered page with no schema.org JSON-LD and no <time datetime>
// node, so the generic base finds a date but no time-of-day. Each show states
// its date/time/hall as three ".show_date_num" spans (in that order); the
// site-wide footer states the venue's street address (Tzavta is one fixed
// building with several halls).
//
//   title       h1.show_title
//   start       the date+time pair from .show_date_num, day-first (Israeli
//               "DD.MM.YYYY" format)
//   location    the hall name (third .show_date_num) + the footer address
//   description the show's full content block (credits, guest, duration) —
//               richer than the page's one-line og:description teaser
//   ctz         fixed to Asia/Jerusalem (Tzavta is in Tel Aviv)
(() => {
  const { text, clean, blockText, parseDateFromText } = GCal;

  GCal.sources.push({
    name: "tzavta",
    matches: (host) => /(^|\.)tzavta\.co\.il$/.test(host),
    extract() {
      const [dateText, timeText, hall] = [...document.querySelectorAll(".show_date_num")].map((el) =>
        clean(el.textContent)
      );
      const address = text(".footer_contact > div");
      return {
        title: text("h1.show_title"),
        start: dateText ? parseDateFromText(`${dateText} ${timeText || ""}`.trim()) : "",
        location: hall && address ? `${hall}, ${address}` : hall || address,
        description: blockText(".show_content_insert"),
        ctz: "Asia/Jerusalem",
      };
    },
  });
})();
