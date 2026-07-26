// comy.co.il event pages: https://comy.co.il/event/adir-miller/
//
// A WordPress ticketing site for touring shows (mostly standup/comedy). Each
// page is a single ARTIST/SHOW with a list of tour dates, one per venue — not a
// single-occurrence event. No schema.org Event JSON-LD; every field is read
// from the DOM.
//
//   title       "<h1> <h2>" inside ".te-details" — the show name (h1, e.g.
//               "אדיר מילר") followed by its genre/subtitle (h2, e.g.
//               "סטנדאפ") -> "אדיר מילר סטנדאפ". Scoped to ".te-details": a
//               site-wide accessibility-toolbar widget injects its OWN
//               <h2>תפריט נגישות</h2> ("accessibility menu") earlier in the DOM,
//               so a bare "h2" query would grab that instead. Same title for
//               every performance, so telavivcinematheque-style grouping
//               (assemble-events.js) folds all instances into one event.
//   events      one entry per `#events .single-page-event` tour date:
//                 date    ".date" div, "DD.MM" with NO YEAR (e.g. "28.07")
//                 time    ".single-light" span, "<weekday> HH:MM" (e.g.
//                         "יום ג' 21:45") — only the trailing clock time is read
//                 venue   ".single-place-string" (venue name only, no address)
//               The year isn't on each row, but the page header states the tour's
//               overall date range ("28/07/2026 - 16/12/2026" in ".te-date"); we
//               seed the running year from that range's first date and roll it
//               forward whenever a row's month is lower than the previous row's
//               (the listing is chronological), so a tour spanning a New Year's
//               boundary still gets each date's correct year.
//   description the ".te-details" teaser block: the show name/genre again, the
//               blurb paragraph, the photo-credit line, and the ticket-source
//               disclaimer — everything in that block except the date-range and
//               price rows (read separately above).
//   ctz         always "Asia/Jerusalem" — comy.co.il is an Israeli ticketing
//               site; every venue it lists is in Israel.
(() => {
  const { clean, text } = GCal;

  // The tour's overall date range is stated once, in the page header
  // (".te-date", e.g. "28/07/2026 - 16/12/2026"); read its first date's year as
  // the starting point for the per-row "DD.MM" dates below, which carry no year
  // of their own.
  function headerStartYear() {
    const m = clean(text(".te-date")).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? +m[3] : GCal.now().getFullYear();
  }

  // The teaser block above the tour-date list: the show name/genre, blurb,
  // photo credit and ticket-source disclaimer. Read every direct child's text
  // except the date-range and price rows, which are handled separately (and
  // would otherwise leak the "28/07/2026 - 16/12/2026" row into the description).
  function description(wrap) {
    if (!wrap) return "";
    return [...wrap.childNodes]
      .filter((n) => !(n.nodeType === 1 && (n.classList.contains("te-date") || n.classList.contains("ticket-price"))))
      .map((n) => clean(n.textContent))
      .filter(Boolean)
      .join("\n");
  }

  // One tour date per `.single-page-event` row: "DD.MM" (no year) + a weekday
  // + "HH:MM" clock time + a venue name. Rows are listed chronologically, so the
  // running `year` (seeded from the page header) only advances when a row's
  // month drops below the previous row's — i.e. the tour crossed a New Year.
  function performances(title) {
    let year = headerStartYear();
    let prevMonth = 0;
    return [...document.querySelectorAll("#events .single-page-event")]
      .map((el) => {
        const dm = clean(text(".date", el)).match(/(\d{2})\.(\d{2})/);
        const venue = clean(text(".single-place-string", el));
        if (!dm || !venue) return null;
        const [, dd, mm] = dm;
        if (+mm < prevMonth) year++;
        prevMonth = +mm;
        const tm = clean(text(".single-light", el)).match(/(\d{1,2}):(\d{2})/);
        const start = tm ? `${year}-${mm}-${dd}T${tm[1].padStart(2, "0")}:${tm[2]}:00` : `${year}-${mm}-${dd}`;
        return { title, start, location: venue };
      })
      .filter(Boolean);
  }

  GCal.sources.push({
    name: "comy",
    matches: (host) => /(^|\.)comy\.co\.il$/.test(host),
    extract() {
      const wrap = document.querySelector(".te-details");
      const title = clean([text("h1", wrap), text("h2", wrap)].filter(Boolean).join(" "));
      return {
        events: performances(title),
        description: description(wrap),
        ctz: "Asia/Jerusalem",
      };
    },
  });
})();
