// Cinema.co.il pages (Tel Aviv Cinematheque), two kinds:
//
//   /series/<slug>/  — a season/festival page LISTING several different films
//                      (e.g. "Taiwan Film Week"). Each film is a `.box` under
//                      `.register-series-boxes`, with its own title, a single
//                      screening date+time ("17-06-2026 , רביעי / 20:00 / אולם 3"),
//                      and a "לפרטים נוספים" link to its /event/ page. These
//                      become the `events` list (one entry per film); the first
//                      film is the suggested (top-level) event.
//
//   /event/<slug>/   — a single film, with a screening-date picker. Handled below.
//
// A WordPress site with no schema.org Event JSON-LD. For an /event/ page each
// field comes from:
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
//   location    the venue name (<meta property="og:site_name">, e.g.
//               "סינמטק תל אביב") followed by the cinema's street address,
//               shown in the page footer next to a location-pin icon
//               (<img data-src="...images/location.png">'s enclosing <a>);
//               every screening happens at the same Tel Aviv Cinematheque
//               building, so this is fixed regardless of the film
//   ctz         always "Asia/Jerusalem" — every screening happens in Tel Aviv
(() => {
  const { clean, meta } = GCal;

  // A series/festival page lists several different films, one per `.box`.
  function seriesEvents() {
    return [...document.querySelectorAll(".register-series-boxes .box")]
      .map((box) => {
        const title = clean((box.querySelector(".title h3") || {}).textContent);
        const start = parseBoxDate(clean((box.querySelector(".title p") || {}).textContent));
        const duration = parseDuration(box);
        const end = duration && start.includes("T") ? addMinutes(start, duration) : null;
        return title && start ? { title, start, end, location: location() } : null;
      })
      .filter(Boolean);
  }

  // "... / 2025 / אורך: 108" -> 108 (minutes). Returns 0 if not found.
  function parseDuration(box) {
    for (const li of box.querySelectorAll("ul li")) {
      const m = li.textContent.match(/אורך:\s*(\d+)/);
      if (m) return +m[1];
    }
    return 0;
  }

  // Add minutes to a floating local datetime string "YYYY-MM-DDTHH:MM:SS".
  function addMinutes(start, minutes) {
    const m = start.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return null;
    const [, date, hh, mm, ss] = m;
    const total = +hh * 60 + +mm + minutes;
    const pad = (n) => String(n).padStart(2, "0");
    return `${date}T${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}:${ss}`;
  }

  // "17-06-2026 , רביעי / 20:00 / אולם 3" -> "2026-06-17T20:00:00" (floating
  // local time). The weekday and hall carry no "HH:MM", so the first
  // colon-separated number is the screening time.
  function parseBoxDate(text) {
    const day = text.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (!day) return "";
    const [, dd, mm, yyyy] = day;
    const time = text.match(/(\d{1,2}):(\d{2})/);
    if (!time) return `${yyyy}-${mm}-${dd}`;
    return `${yyyy}-${mm}-${dd}T${time[1].padStart(2, "0")}:${time[2]}:00`;
  }

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
    const address = link ? clean(link.textContent) : "";
    const venue = clean(meta("og:site_name"));
    return venue && address ? `${venue}, ${address}` : address;
  }

  GCal.sites.push({
    name: "cinema.co.il",
    matches: GCal.siteHosts.find((s) => s.name === "cinema").matches,
    extract() {
      const films = seriesEvents();
      if (films.length) {
        // A series page: one event per film. description/ctz are page-level
        // and main.js fills them into each event.
        return {
          events: films,
          description: clean(meta("og:description")),
          ctz: "Asia/Jerusalem",
        };
      }

      const dates = screeningDates();
      const t = title();
      const loc = location();
      const desc = clean(meta("og:description"));

      if (!dates.length) {
        return { title: t, description: desc, start: "", location: loc, ctz: "Asia/Jerusalem" };
      }

      return {
        events: dates.map((d) => ({ title: t, start: d, end: null, location: loc })),
        description: desc,
        ctz: "Asia/Jerusalem",
      };
    },
  });
})();
