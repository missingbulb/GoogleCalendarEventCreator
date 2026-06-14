// Tel Aviv Cinematheque (cinema.co.il) pages, two kinds:
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

  // Serialize an element's content to text, mapping <br> to a newline and
  // wrapping <strong>/<b> runs in <b> so the synopsis heading stays bold in
  // the Calendar details (which render as HTML). Other tags contribute their
  // text only.
  function richText(el) {
    let out = "";
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        out += node.textContent;
      } else if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();
        if (tag === "br") out += "\n";
        else if (tag === "strong" || tag === "b") out += `<b>${clean(node.textContent)}</b>`;
        else out += richText(node);
      }
    }
    return out;
  }

  // The credits <h5> separates each line with a <br> but also carries blank
  // source lines between them; keep one line per credit, dropping the blanks.
  function creditLines(el) {
    return richText(el)
      .split("\n")
      .map(clean)
      .filter(Boolean)
      .join("\n");
  }

  // The synopsis <p> is a bold heading, a <br><br>, then the body; keep that
  // single blank line and clean away the page's incidental whitespace.
  function synopsisText(el) {
    return richText(el)
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
    const address = link ? clean(link.textContent) : "";
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

      const dates = screeningDates();
      const t = title();
      const loc = location();
      // The page body carries the full film details; fall back to the
      // truncated og:description teaser only when that block is missing.
      const desc = eventDescription() || clean(meta("og:description"));

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
