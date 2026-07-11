// Derives an event timezone (`ctz`) from hints the page itself declares — the
// one field the UNSUPPORTED-site extractor could never fill (#674: 0%-recovered,
// and the main reason dedicated per-site sources stay non-retirable).
//
// THE CONTRACT: a wrong `ctz` is worse than none (it re-anchors the event's
// instant in Google Calendar), so a zone is returned ONLY when TWO INDEPENDENT
// page-declared hints agree — never guessed from one, "" whenever anything
// disagrees. The hint kinds:
//   stated   an IANA zone the page embeds in inline-script JSON — a
//            "timezone"/"timeZone" key, raw or JSON-escaped (Next.js-style
//            stringified state). Every such value must agree (a cross-venue
//            listing, e.g. seatgeek, states several → no hint) and be a valid
//            IANA name (GCal.VALID_TIMEZONES).
//   offset   the explicit UTC offset the event's own start/end values carry
//            ("…T18:00:00-04:00"). A trailing "Z" (or the absence of an offset)
//            is NOT a hint: pages habitually serialize instants in UTC no matter
//            where the venue is. Each offset+instant pair constrains the zone
//            independently, so a listing spanning a DST flip (+02:00 in January,
//            +03:00 in July) still resolves to the one zone matching both.
//   country  the venue country the page states: JSON-LD
//            location.address.addressCountry (string or Country object),
//            unanimous across the page's events — an international tour listing
//            (livenation) names several → no hint — else the og/business
//            country metas or geo.region.
//   locale   the page's own locale — <html lang> / og:locale region subtag, or
//            an effectively-single-country language (Hebrew → IL). The weakest
//            kind: it describes the site's audience, not the venue, so it only
//            ever CORROBORATES a country, never picks a zone on its own —
//            boilerplate en-US can neither mint nor veto anything.
//
// Accepted combinations (first match wins; "" otherwise):
//   stated+offset    the stated zone reproduces every declared offset at its
//                    instant (eventbrite, meetup, dice, luma).
//   stated+country   no offsets declared; the stated zone lies in the stated
//                    country (bandsintown: floating times + "Israel").
//   country+offset   exactly ONE of the country's zones reproduces every
//                    declared offset (dash.datadoghq: US + -04:00 in June →
//                    America/New_York; a US summer -07:00 is Phoenix OR Los
//                    Angeles → ambiguous → "").
//   country+locale   no offsets; locale agrees with the country AND the country
//                    has exactly one zone (eventer.co.il: addressCountry IL +
//                    lang="he" → Asia/Jerusalem). The accepted residual risk: a
//                    page whose own address AND locale both claim a single-zone
//                    country for an event actually held elsewhere — the same
//                    bet the hardcoded per-site sources already make.
//
// COUNTRY_TIMEZONES maps ISO-3166 alpha-2 → the country's zones, one canonical
// zone per distinct offset regime (not every tzdb alias/locality), ordered
// east→west. A country absent from the table never yields a hint (a safe miss,
// never a wrong zone). An omitted minor zone can at worst relabel an
// offset-verified event with an offset-equivalent listed zone — the instant is
// preserved by construction, because the offset rules only ever pick a zone
// that reproduces the page's own declared offsets.
//
// Uses GCal.clean / meta / scriptsText / isValidTimezone / embeddedEvents at
// call time. Augments globalThis.GCal (never replaces it) so load order can't
// clobber another file's contributions.
globalThis.GCal = Object.assign(globalThis.GCal || {}, (() => {
  const COUNTRY_TIMEZONES = {
    // Middle East & Africa
    IL: ["Asia/Jerusalem"],
    AE: ["Asia/Dubai"],
    SA: ["Asia/Riyadh"],
    QA: ["Asia/Qatar"],
    JO: ["Asia/Amman"],
    EG: ["Africa/Cairo"],
    ZA: ["Africa/Johannesburg"],
    MA: ["Africa/Casablanca"],
    KE: ["Africa/Nairobi"],
    NG: ["Africa/Lagos"],
    // Europe
    GB: ["Europe/London"],
    IE: ["Europe/Dublin"],
    PT: ["Europe/Lisbon", "Atlantic/Azores"],
    ES: ["Europe/Madrid", "Atlantic/Canary"],
    FR: ["Europe/Paris"],
    DE: ["Europe/Berlin"],
    AT: ["Europe/Vienna"],
    CH: ["Europe/Zurich"],
    IT: ["Europe/Rome"],
    NL: ["Europe/Amsterdam"],
    BE: ["Europe/Brussels"],
    LU: ["Europe/Luxembourg"],
    DK: ["Europe/Copenhagen"],
    NO: ["Europe/Oslo"],
    SE: ["Europe/Stockholm"],
    FI: ["Europe/Helsinki"],
    IS: ["Atlantic/Reykjavik"],
    PL: ["Europe/Warsaw"],
    CZ: ["Europe/Prague"],
    SK: ["Europe/Bratislava"],
    HU: ["Europe/Budapest"],
    RO: ["Europe/Bucharest"],
    BG: ["Europe/Sofia"],
    GR: ["Europe/Athens"],
    TR: ["Europe/Istanbul"],
    UA: ["Europe/Kyiv"],
    RS: ["Europe/Belgrade"],
    HR: ["Europe/Zagreb"],
    SI: ["Europe/Ljubljana"],
    EE: ["Europe/Tallinn"],
    LV: ["Europe/Riga"],
    LT: ["Europe/Vilnius"],
    MT: ["Europe/Malta"],
    CY: ["Asia/Nicosia"],
    // Asia & Oceania
    IN: ["Asia/Kolkata"],
    SG: ["Asia/Singapore"],
    MY: ["Asia/Kuala_Lumpur"],
    HK: ["Asia/Hong_Kong"],
    TW: ["Asia/Taipei"],
    JP: ["Asia/Tokyo"],
    KR: ["Asia/Seoul"],
    CN: ["Asia/Shanghai"],
    TH: ["Asia/Bangkok"],
    VN: ["Asia/Ho_Chi_Minh"],
    PH: ["Asia/Manila"],
    ID: ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"],
    AU: ["Australia/Sydney", "Australia/Brisbane", "Australia/Adelaide", "Australia/Darwin", "Australia/Perth"],
    NZ: ["Pacific/Auckland"],
    // Americas
    US: [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Phoenix",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
    ],
    CA: [
      "America/St_Johns",
      "America/Halifax",
      "America/Toronto",
      "America/Winnipeg",
      "America/Regina",
      "America/Edmonton",
      "America/Vancouver",
    ],
    MX: ["America/Mexico_City", "America/Cancun", "America/Mazatlan", "America/Tijuana"],
    BR: ["America/Noronha", "America/Sao_Paulo", "America/Manaus", "America/Rio_Branco"],
    AR: ["America/Argentina/Buenos_Aires"],
    CL: ["America/Santiago", "America/Punta_Arenas", "Pacific/Easter"],
    CO: ["America/Bogota"],
    PE: ["America/Lima"],
    UY: ["America/Montevideo"],
  };

  // Country names seen in the wild (addressCountry / og:country-name hold codes
  // or names, occasionally native) → alpha-2. Lowercased lookup; only countries
  // in COUNTRY_TIMEZONES are worth naming here.
  const COUNTRY_NAMES = {
    israel: "IL",
    "ישראל": "IL",
    "united states": "US",
    "united states of america": "US",
    usa: "US",
    "united kingdom": "GB",
    uk: "GB",
    "great britain": "GB",
    england: "GB",
    scotland: "GB",
    wales: "GB",
    ireland: "IE",
    portugal: "PT",
    spain: "ES",
    "españa": "ES",
    france: "FR",
    germany: "DE",
    deutschland: "DE",
    austria: "AT",
    "österreich": "AT",
    switzerland: "CH",
    schweiz: "CH",
    suisse: "CH",
    italy: "IT",
    italia: "IT",
    netherlands: "NL",
    "the netherlands": "NL",
    nederland: "NL",
    holland: "NL",
    belgium: "BE",
    luxembourg: "LU",
    denmark: "DK",
    norway: "NO",
    norge: "NO",
    sweden: "SE",
    sverige: "SE",
    finland: "FI",
    suomi: "FI",
    iceland: "IS",
    poland: "PL",
    polska: "PL",
    czechia: "CZ",
    "czech republic": "CZ",
    slovakia: "SK",
    hungary: "HU",
    romania: "RO",
    bulgaria: "BG",
    greece: "GR",
    turkey: "TR",
    "türkiye": "TR",
    ukraine: "UA",
    serbia: "RS",
    croatia: "HR",
    slovenia: "SI",
    estonia: "EE",
    latvia: "LV",
    lithuania: "LT",
    malta: "MT",
    cyprus: "CY",
    "united arab emirates": "AE",
    "saudi arabia": "SA",
    qatar: "QA",
    jordan: "JO",
    egypt: "EG",
    "south africa": "ZA",
    morocco: "MA",
    kenya: "KE",
    nigeria: "NG",
    india: "IN",
    singapore: "SG",
    malaysia: "MY",
    "hong kong": "HK",
    taiwan: "TW",
    japan: "JP",
    "south korea": "KR",
    korea: "KR",
    china: "CN",
    thailand: "TH",
    vietnam: "VN",
    philippines: "PH",
    indonesia: "ID",
    australia: "AU",
    "new zealand": "NZ",
    canada: "CA",
    mexico: "MX",
    "méxico": "MX",
    brazil: "BR",
    brasil: "BR",
    argentina: "AR",
    chile: "CL",
    colombia: "CO",
    peru: "PE",
    "perú": "PE",
    uruguay: "UY",
  };

  // Effectively-single-country languages → the country they pin. Deliberately
  // strict: a language with official standing in countries whose zones can
  // differ (en, es, fr, de, it, nl, pt, ar, ru, zh, sv, da, tr, el, ro, …) is
  // NOT here — a locale hint must never be able to point at the wrong country.
  const LANG_COUNTRY = {
    he: "IL",
    ja: "JP",
    ko: "KR",
    th: "TH",
    vi: "VN",
    pl: "PL",
    hu: "HU",
    cs: "CZ",
    sk: "SK",
    fi: "FI",
    is: "IS",
    uk: "UA",
    bg: "BG",
    hr: "HR",
    sl: "SI",
    lt: "LT",
    lv: "LV",
    et: "EE",
    nb: "NO",
    nn: "NO",
    no: "NO",
  };

  // Normalize a page-stated country (alpha-2 code in any case, or a name) to a
  // COUNTRY_TIMEZONES key; "" when it isn't a country we can place.
  function countryCode(raw) {
    const s = typeof raw === "string" ? GCal.clean(raw) : "";
    if (!s) return "";
    const code = s.toUpperCase();
    if (COUNTRY_TIMEZONES[code]) return code;
    return COUNTRY_NAMES[s.toLowerCase()] || "";
  }

  // The zone's UTC offset (in minutes) at `instant`, read off Intl so no tz data
  // of our own is needed; null when the zone can't be resolved.
  function zoneOffsetMinutes(tz, instant) {
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
      }).formatToParts(new Date(instant));
    } catch (e) {
      return null;
    }
    const g = (type) => Number((parts.find((p) => p.type === type) || {}).value);
    const localAsUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
    return Math.round((localAsUTC - instant) / 60000);
  }

  // Every explicit UTC offset among the extracted start/end values, paired with
  // its instant. "Z" and floating/date-only values contribute nothing (see
  // header); a zone must reproduce EVERY pair to count as matching.
  function offsetPairs(values) {
    const pairs = [];
    for (const v of values || []) {
      const m = /([+-])(\d{2}):?(\d{2})$/.exec(v || "");
      if (!m) continue;
      const instant = Date.parse(v);
      if (Number.isNaN(instant)) continue;
      pairs.push({ minutes: (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +m[3]), instant });
    }
    return pairs;
  }

  function zoneMatchesOffsets(tz, pairs) {
    return pairs.every((p) => zoneOffsetMinutes(tz, p.instant) === p.minutes);
  }

  // The single IANA zone the page's inline scripts state, or "" when they state
  // none — or several different ones (a cross-venue listing).
  function statedTimezone() {
    const found = new Set();
    const re = /\\?"time[zZ]one\\?"\s*:\s*\\?"([^"\\]{1,40})\\?"/g;
    const scripts = GCal.scriptsText();
    let m;
    while ((m = re.exec(scripts))) {
      if (GCal.isValidTimezone(m[1])) found.add(m[1]);
    }
    return found.size === 1 ? [...found][0] : "";
  }

  // The venue country the page's own structured data states: JSON-LD address
  // first (unanimous across the events that name one — several different
  // countries mean a multi-country listing, which also blocks the page-level
  // meta fallbacks), else the og/business place metas or geo.region.
  function venueCountry() {
    const fromLd = new Set();
    for (const ld of GCal.embeddedEvents.find()) {
      let loc = ld.location;
      if (Array.isArray(loc)) loc = loc[0];
      const addr = loc && typeof loc === "object" ? loc.address : null;
      let country = addr && typeof addr === "object" ? addr.addressCountry : null;
      if (country && typeof country === "object") country = country.name;
      const code = countryCode(country);
      if (code) fromLd.add(code);
    }
    if (fromLd.size) return fromLd.size === 1 ? [...fromLd][0] : "";
    return (
      countryCode(GCal.meta("og:country-name") || GCal.meta("business:contact_data:country_name")) ||
      countryCode((GCal.meta("geo.region") || "").split("-")[0])
    );
  }

  // The page's own locale country — "" unless every locale signal agrees. An
  // explicit region subtag ("he-IL", "en_US") wins over the language; a bare
  // language resolves only through the strict LANG_COUNTRY list.
  function localeCountry() {
    const found = new Set();
    const langAttr = document.documentElement ? document.documentElement.getAttribute("lang") : "";
    for (const raw of [langAttr, GCal.meta("og:locale")]) {
      const m = /^([a-z]{2,3})(?:[-_]([a-z]{2}))?\b/i.exec(GCal.clean(raw));
      if (!m) continue;
      const region = (m[2] || "").toUpperCase();
      if (region) {
        if (COUNTRY_TIMEZONES[region]) found.add(region);
        continue;
      }
      const byLang = LANG_COUNTRY[m[1].toLowerCase()];
      if (byLang) found.add(byLang);
    }
    return found.size === 1 ? [...found][0] : "";
  }

  // Decide the page's ctz. `values` are the extracted events' start/end strings
  // (they carry any UTC offset the page declared for the event itself). See the
  // header for the accepted hint combinations; anything less corroborated is "".
  function deriveCtz(values) {
    const pairs = offsetPairs(values);
    const stated = statedTimezone();
    if (stated) {
      // A stated zone still needs one independent agreeing hint — some
      // platforms embed the VIEWER's timezone, not the venue's.
      if (pairs.length) return zoneMatchesOffsets(stated, pairs) ? stated : "";
      const country = venueCountry();
      return country && COUNTRY_TIMEZONES[country].includes(stated) ? stated : "";
    }
    const country = venueCountry();
    if (!country) return "";
    const zones = COUNTRY_TIMEZONES[country];
    if (pairs.length) {
      const matching = zones.filter((z) => zoneMatchesOffsets(z, pairs));
      return matching.length === 1 ? matching[0] : "";
    }
    return zones.length === 1 && localeCountry() === country ? zones[0] : "";
  }

  return { deriveCtz, COUNTRY_TIMEZONES };
})());
