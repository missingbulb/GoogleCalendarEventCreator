// tabitisrael.co.il reservation pages — Tabit is the online-reservation system
// many Israeli restaurants use. The supported page is a single saved booking's
// summary, e.g.
//   https://tabitisrael.co.il/.../create-reservation?step=summary&reservationId=...
//
// It's an Angular single-page app, so this works against the RENDERED DOM (the
// committed fixture is a browser outerHTML capture, not the empty index shell —
// a plain fetch of the URL is CloudFront-bot-blocked, see issue #345). The page
// embeds schema.org JSON-LD, but it's a `Restaurant`, not an `Event` (no date),
// so GCal.embeddedEvents can't help — every field is read straight from the DOM.
//
// Where each field comes from (rendered markup):
//   title       <organization-details> ._sub_title  ("Meatbar TLV")
//   location    title + ._address                   ("…, שדרות חן 52, תל אביב")
//   start       .reservation-details-item .value for the rsv-date + rsv-time
//               icons ("א׳ 21/6" + "12:00"). The displayed date has NO YEAR, so
//               the year is inferred as the nearest upcoming one (a reservation
//               is in the future) off GCal.now() — injectable in tests so the
//               asserted date can't rot.
//   end         not shown on the page -> omitted (single start time only)
//   description .description block (the saved-reservation confirmation message,
//               multi-line — blockText preserves its <br> line breaks)
//   ctz         hardcoded Asia/Jerusalem (every Tabit venue is in Israel)
//
// A matched host runs THIS source only — the generic fallback does not run for a
// supported host, so it produces every field itself.
(() => {
  const { text, blockText } = GCal;
  const pad = (n) => String(n).padStart(2, "0");

  // The summary lists date / time / guests as sibling .reservation-details-item
  // blocks, each an icon (mat-icon[svgicon="rsv-…"]) plus a .value. Read by icon
  // name rather than a positional/secondary class so reordering can't misread.
  function detailValue(icon) {
    const el = document.querySelector(`[svgicon="${icon}"]`);
    const item = el && el.closest(".reservation-details-item");
    return item ? text(".value", item) : "";
  }

  // Build "YYYY-MM-DDTHH:MM:00" (floating local time; ctz places it) from the
  // page's "<day-of-week> D/M" date and "HH:MM" time. The year is absent on the
  // page, so pick the nearest upcoming year for that day/month. Uses UTC
  // component math throughout to avoid the local-midnight/toISOString day shift
  // (see the gcec pack’s RULES.md gotchas).
  function buildStart(dateRaw, timeRaw) {
    const dm = (dateRaw || "").match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
    const tm = (timeRaw || "").match(/(\d{1,2}):(\d{2})/);
    if (!dm || !tm) return "";
    const day = +dm[1];
    const month = +dm[2];
    if (day < 1 || day > 31 || month < 1 || month > 12) return "";

    const ref = GCal.now();
    const refYmd = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
    let year = ref.getUTCFullYear();
    if (Date.UTC(year, month - 1, day) < refYmd) year += 1; // already past this year -> next

    return `${year}-${pad(month)}-${pad(day)}T${pad(+tm[1])}:${tm[2]}:00`;
  }

  GCal.sources.push({
    name: "tabitisrael",
    matches: (host) => /(^|\.)tabitisrael\.co\.il$/.test(host),
    extract() {
      const title = text("organization-details ._sub_title");
      const street = text("organization-details ._address");
      return {
        title,
        location: [title, street].filter(Boolean).join(", "),
        start: buildStart(detailValue("rsv-date"), detailValue("rsv-time")),
        description: blockText(document.querySelector(".description")),
        ctz: "Asia/Jerusalem",
      };
    },
  });
})();
