// Tel Aviv Cinematheque (cinema.co.il) pages, two kinds:
//
//   /series/<slug>/  — a season/festival page LISTING several different films
//                      (e.g. "Taiwan Film Week"). Each film is a `.box` under
//                      `.register-series-boxes`, with its own title, a single
//                      screening date+time ("17-06-2026 , רביעי / 20:00 / אולם 3"),
//                      cast, meta info (ul li: country/year/אורך, director,
//                      language), synopsis, and a "לפרטים נוספים" link to its
//                      /event/ page. These become the `events` list (one entry
//                      per film); the first film is the suggested (top-level)
//                      event. Each event carries its own per-film description
//                      (assembled from the box content) and eventLengthInMinutes
//                      (from "אורך: N" in the ul li elements).
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
//   description the full film details from the page body's
//               `.movie-section .text-wraper` block (the on-page <meta
//               og:description> is only a truncated "[…]" teaser), composed as:
//                 <h2>title</h2>            the film title, larger
//                 country/year/length       e.g. "נורבגיה/.../ 2025 / אורך: 132"
//                 <blank line>
//                 director / cast / language each on its own line (the <h5>'s
//                                            <br>-separated credit lines)
//                 <b>Hebrew | English</b>   the synopsis heading, bold
//                 <blank line>
//                 full synopsis paragraph   (untruncated)
//               Falls back to <meta og:description> when that block is absent.
//   start       the date options of the screening-date picker
//                 <select id="smdate_b"><option value="2026-06-17~20522">...
//               (date portion before the "~"), one all-day event per date.
//               Screening times load via AJAX into a second picker
//                 <select id="smtime_b"><option ...>16:30</option>...
//               only once a date is chosen, and only for the date currently
//               selected in #smdate_b. When those times are present, that one
//               date's all-day event is replaced by a timed event per show
//               (e.g. 2026-06-17 -> 16:30 and 20:30); the other dates stay
//               all-day
//   location    the venue name (<meta property="og:site_name">, e.g.
//               "סינמטק תל אביב") followed by the cinema's street address,
//               shown in the page footer next to a location-pin icon
//               (<img data-src="...images/location.png">'s enclosing <a>);
//               every screening happens at the same Tel Aviv Cinematheque
//               building, so this is fixed regardless of the film
//   ctz         always "Asia/Jerusalem" — every screening happens in Tel Aviv
(() => {
  const { clean, meta, richText } = GCal;

  // A category listing page shows many films, one per `.catagory-grid-box`.
  // Each box has a title (h3), next screening date+time (`.n_block_r p`), and
  // a description (`.paragraph p`). The date format is the same "DD-MM-YYYY"
  // as the series box, so parseBoxDate() handles it unchanged.
  function categoryEvents() {
    return [...document.querySelectorAll(".catagory-grid-box")]
      .map((box) => {
        const title = clean((box.querySelector(".title h3") || {}).textContent);
        const start = parseBoxDate(clean((box.querySelector(".n_block_r p") || {}).textContent));
        const description = clean((box.querySelector(".paragraph p") || {}).textContent);
        return title && start ? { title, start, location: location(), description } : null;
      })
      .filter(Boolean);
  }

  // A series/festival page lists several different films, one per `.box`.
  function seriesEvents() {
    return [...document.querySelectorAll(".register-series-boxes .box")]
      .map((box) => {
        const title = clean((box.querySelector(".title h3") || {}).textContent);
        const start = parseBoxDate(clean((box.querySelector(".title p") || {}).textContent));
        const duration = parseDuration(box);
        const end = duration && start.includes("T") ? addMinutes(start, duration) : null;
        const description = boxDescription(box);
        return title && start
          ? { title, start, end, location: location(), description, eventLengthInMinutes: duration || null }
          : null;
      })
      .filter(Boolean);
  }

  // Assembles a per-film description from a series `.box`: title, date, cast,
  // then the meta lines (country/year/length, director, language), then synopsis.
  function boxDescription(box) {
    const h3 = clean((box.querySelector(".title h3") || {}).textContent);
    const titlePs = [...box.querySelectorAll(".title p")].map((p) => clean(p.textContent)).filter(Boolean);
    const liTexts = [...box.querySelectorAll("ul li")].map((li) => clean(li.textContent)).filter(Boolean);
    const synopsis = clean((box.querySelector(".text-wraper > p") || {}).textContent);

    const parts = [];
    if (h3) parts.push(h3);
    if (titlePs[0]) parts.push(titlePs[0]);
    if (titlePs[1]) { parts.push(""); parts.push(titlePs[1]); }
    if (liTexts.length) { parts.push(""); parts.push(...liTexts); }
    if (synopsis) parts.push(synopsis);
    return parts.join("\n");
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

  // Screening times for the currently selected date, loaded via AJAX into the
  // #smtime_b picker once a date is chosen; before any selection it holds only a
  // "בחר שעה" ("choose a time") placeholder. Keep the options whose text is an
  // "HH:MM" clock time, zero-padding the hour.
  function screeningTimes() {
    return [...document.querySelectorAll("#smtime_b option")]
      .map((o) => clean(o.textContent))
      .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
      .map((t) => t.replace(/^(\d):/, "0$1:"));
  }

  // "... / 2025 / אורך: 108" in the single-event page's title/meta line -> 108.
  // (The series-page variant of this lives in parseDuration(), which reads from
  // each box's <ul><li> elements instead.)
  function parseSingleEventDuration() {
    const metaLine = clean((document.querySelector(".movie-section .text-wraper .title p") || {}).textContent);
    const m = metaLine && metaLine.match(/אורך:\s*(\d+)/);
    return m ? +m[1] : null;
  }

  // The date those #smtime_b times belong to: the option currently selected in
  // #smdate_b (a real browser reflects the chosen date in the select's value).
  // "" when it's the "בחר תאריך" placeholder rather than a real
  // "YYYY-MM-DD~<code>" date.
  function selectedDate() {
    const sel = document.querySelector("#smdate_b");
    const v = sel ? sel.value : "";
    return /^\d{4}-\d{2}-\d{2}~/.test(v) ? v.split("~")[0] : "";
  }

  function title() {
    return clean(meta("og:title")).replace(/\s*-\s*סינמטק תל אביב\s*$/, "");
  }

  // Both credit and synopsis blocks keep <strong>/<b> as bold (GCal.richText
  // with { bold: true }) so the synopsis heading survives into the Calendar
  // details; the per-block line handling below differs.

  // The credits <h5> separates each line with a <br> but also carries blank
  // source lines between them; keep one line per credit, dropping the blanks.
  function creditLines(el) {
    return richText(el, { bold: true })
      .split("\n")
      .map(clean)
      .filter(Boolean)
      .join("\n");
  }

  // The synopsis <p> is a bold heading, a <br><br>, then the body; keep that
  // single blank line and clean away the page's incidental whitespace.
  function synopsisText(el) {
    return richText(el, { bold: true })
      .split("\n")
      .map(clean)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\n+|\n+$/g, "");
  }

  // The full film details from the page body, or "" when the page has no such
  // block (so the caller can fall back to the og:description teaser).
  function eventDescription() {
    const wrap = document.querySelector(".movie-section .text-wraper");
    if (!wrap) return "";

    const h3 = clean((wrap.querySelector(".title h3") || {}).textContent);
    const metaLine = clean((wrap.querySelector(".title p") || {}).textContent);
    const credits = wrap.querySelector("h5");
    const synopsis = wrap.querySelector(":scope > p");
    if (!h3 && !synopsis) return "";

    const lines = [];
    if (h3) lines.push(`<h2>${h3}</h2>`);
    if (metaLine) lines.push(metaLine, "");
    if (credits) lines.push(creditLines(credits));
    if (synopsis) lines.push(synopsisText(synopsis));
    return lines.join("\n");
  }

  function location() {
    const icon = document.querySelector('img[data-src*="location.png"]');
    const link = icon && icon.closest("a");
    // Read only the link's own text nodes for the street address. The icon's
    // <a> wraps an <img> plus nested <noscript> fallbacks; in a real browser
    // (scripting enabled) <noscript> content is kept as a raw text node, so
    // link.textContent would splice that <img> markup into the address. The
    // direct text-node children are just the address. (jsdom parses <noscript>
    // as DOM, which is why the tests didn't surface this.)
    const address = link
      ? clean(
          [...link.childNodes]
            .filter((n) => n.nodeType === 3 /* TEXT_NODE */)
            .map((n) => n.textContent)
            .join(" ")
        )
      : "";
    const venue = clean(meta("og:site_name"));
    return venue && address ? `${venue}, ${address}` : address;
  }

  GCal.sources.push({
    name: "TelAvivCinematheque",
    matches: (host) => /(^|\.)cinema\.co\.il$/.test(host),
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

      const cats = categoryEvents();
      if (cats.length) {
        return { events: cats, ctz: "Asia/Jerusalem" };
      }

      const dates = screeningDates();
      const t = title();
      const loc = location();
      // The page body carries the full film details; fall back to the
      // truncated og:description teaser only when that block is missing.
      const desc = eventDescription() || clean(meta("og:description"));

      if (!dates.length) {
        return { title: t, description: desc, start: "", location: loc, ctz: "Asia/Jerusalem" };
      }

      // Times are present only for the date currently selected in #smdate_b;
      // that date becomes one timed event per show, the rest stay all-day.
      const times = screeningTimes();
      const selected = selectedDate();
      const dur = parseSingleEventDuration();
      const events = dates.flatMap((d) =>
        times.length && d === selected
          ? times.map((time) => ({ title: t, start: `${d}T${time}:00`, end: null, location: loc, eventLengthInMinutes: dur }))
          : [{ title: t, start: d, end: null, location: loc, eventLengthInMinutes: dur }]
      );

      return {
        events,
        description: desc,
        ctz: "Asia/Jerusalem",
      };
    },
  });
})();
