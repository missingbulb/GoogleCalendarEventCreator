// Timezone helpers: validate a scraped timezone name, re-express an absolute
// instant as the floating local wall-clock time in a given zone, and find a
// valid timezone name inside page text. The name table lives in
// helpers/timezone-names.js (GCal.VALID_TIMEZONES).
//
// Uses GCal.VALID_TIMEZONES and GCal.clean at call time. Augments
// globalThis.GCal (never replaces it) so load order can't clobber another
// file's contributions.
globalThis.GCal = Object.assign(globalThis.GCal || {}, (() => {
  function isValidTimezone(tz) {
    return GCal.VALID_TIMEZONES.has(tz);
  }

  // Render a datetime that carries an absolute offset/`Z` as the floating local
  // wall-clock time in `tz`, so the value reads as the time the event's own
  // city shows (e.g. "2026-08-05T19:30:00.000Z" in "GB" -> "2026-08-05T20:30:00").
  // When the event's timezone is known there's no need to keep it in UTC: the
  // Calendar URL's `ctz` param places a floating time correctly. Floating times,
  // all-day dates, empty values, and an empty/unresolvable `tz` are returned
  // unchanged.
  function localizeToZone(value, tz) {
    value = GCal.clean(value);
    if (!tz || !value) return value;
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return value; // already floating/all-day
    const d = new Date(value);
    if (isNaN(d)) return value;
    let parts;
    try {
      parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).formatToParts(d);
    } catch (e) {
      return value; // tz not resolvable -> leave the absolute instant as-is
    }
    const g = (type) => (parts.find((p) => p.type === type) || {}).value || "00";
    return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}`;
  }

  // Concatenated textContent of every <script> on the page — for sites that
  // embed a timezone name in inline JSON state rather than visible text.
  function scriptsText() {
    return [...document.querySelectorAll("script")].map((s) => s.textContent || "").join("\n");
  }

  // Search `text` for the first occurrence of `regex` (which must have a
  // capturing group) whose captured value is a valid timezone name.
  function findTimezone(text, regex) {
    const re = new RegExp(regex, "g");
    let m;
    while ((m = re.exec(text))) {
      if (isValidTimezone(m[1])) return m[1];
    }
    return "";
  }

  return { isValidTimezone, localizeToZone, scriptsText, findTimezone };
})());
