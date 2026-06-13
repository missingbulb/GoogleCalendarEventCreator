// Cinema.co.il event pages (Tel Aviv Cinematheque):
// https://www.cinema.co.il/event/<slug>/
//
// A WordPress site with no schema.org Event JSON-LD. Each field comes from:
//
//   title       the page's <meta property="og:title"> with the
//               " - סינמטק תל אביב" ("- Tel Aviv Cinematheque") site-name
//               suffix stripped, e.g.
//               "הילדה השמאלית | טרום בכורה | שבוע טאיוואן - סינמטק תל אביב"
//               -> "הילדה השמאלית | טרום בכורה | שבוע טאיוואן"
//   description <meta property="og:description">
//   start       the first date option of the screening-date picker
//                 <select id="smdate_b"><option value="2026-06-17~20522">...
//               (date portion before the "~"); screening times are loaded
//               via AJAX and aren't present in the static page, so this
//               becomes an all-day event
//   eventCount  number of date options in the picker (one per scheduled
//               screening of this film)
//   location    the cinema's street address, shown in the page footer next
//               to a location-pin icon
//               (<img data-src="...images/location.png">'s enclosing <a>);
//               every screening happens at the same Tel Aviv Cinematheque
//               building, so this is fixed regardless of the film
(() => {
  const { clean, meta } = GCal;

  // The picker's "choose a date" placeholder option has a non-date value
  // (e.g. "בחר תאריך"), so only options whose value looks like
  // "YYYY-MM-DD~<code>" are real screening dates.
  function screeningDates() {
    return [...document.querySelectorAll("#smdate_b option")]
      .map((o) => o.value)
      .filter((v) => /^\d{4}-\d{2}-\d{2}~/.test(v))
      .map((v) => v.split("~")[0]);
  }

  function title() {
    return clean(meta("og:title")).replace(/\s*-\s*סינמטק תל אביב\s*$/, "");
  }

  function location() {
    const icon = document.querySelector('img[data-src*="location.png"]');
    const link = icon && icon.closest("a");
    return link ? clean(link.textContent) : "";
  }

  GCal.sites.push({
    name: "cinema.co.il",
    matches: GCal.siteHosts.find((s) => s.name === "cinema").matches,
    extract() {
      const dates = screeningDates();
      return {
        title: title(),
        description: clean(meta("og:description")),
        start: dates[0] || "",
        location: location(),
        eventCount: dates.length,
      };
    },
  });
})();
