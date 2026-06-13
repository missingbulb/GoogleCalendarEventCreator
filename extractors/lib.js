// Shared toolbox for the extractors. Injected first; the site-specific
// extractors, jsonld.js, generic.js, and finally main.js follow (the
// injection order is the EXTRACTOR_FILES list in background.js).
//
// Every extractor produces a partial event object with these optional fields:
//   title, location, description : plain strings
//   start, end                   : one of
//       "YYYY-MM-DD"                  -> all-day event
//       "YYYY-MM-DDTHH:MM[:SS]"       -> floating local time
//       full ISO with offset or "Z"   -> exact instant
//   (background.js turns these into the Google Calendar `dates` parameter)
//   ctz                          : IANA/legacy timezone name (e.g. "GB") to
//       pin a floating start/end to a specific timezone regardless of the
//       viewer's own — set by site extractors that know the event's
//       location is fixed (e.g. a festival that only runs in one city), or
//       that can read the event's timezone off the page (e.g. Meetup). Must
//       be one of VALID_TIMEZONES (see isValidTimezone below) — extractors
//       should validate any timezone name scraped from page content before
//       setting this field.
//
// `GCal.sites` is the registry: each site-specific extractor pushes
//   { name, matches(hostname), extract() }
// onto it, and main.js runs the first one whose `matches` returns true.
//
// We *augment* any existing globalThis.GCal rather than replacing it, so this
// file can't clobber properties another file already set (notably
// site-hosts.js's `siteHosts`) if the injection happens to run out of order.

globalThis.GCal = Object.assign(globalThis.GCal || {}, (() => {
  const MONTH =
    "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
  const TIME = "\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)|\\d{1,2}:\\d{2}";

  // All IANA/legacy timezone names, per
  // https://en.wikipedia.org/wiki/List_of_tz_database_time_zones — used to
  // validate timezone names scraped from page text/scripts before using them
  // as `ctz`.
  const VALID_TIMEZONES = new Set([
    "Atlantic/Cape_Verde", "Africa/Abidjan", "Africa/Bissau", "Africa/Monrovia", "Africa/Sao_Tome", "Africa/Casablanca", "Africa/El_Aaiun", "Africa/Algiers",
    "Africa/Lagos", "Africa/Ndjamena", "Africa/Tunis", "Africa/Johannesburg", "Africa/Juba", "Africa/Khartoum", "Africa/Maputo", "Africa/Tripoli",
    "Africa/Windhoek", "Africa/Cairo", "Africa/Nairobi", "Indian/Mauritius", "Antarctica/Rothera", "Antarctica/Troll", "Antarctica/Mawson", "Antarctica/Vostok",
    "Antarctica/Davis", "Antarctica/Casey", "Asia/Beirut", "Asia/Famagusta", "Asia/Gaza", "Asia/Hebron", "Asia/Jerusalem", "Asia/Nicosia",
    "Asia/Amman", "Asia/Baghdad", "Asia/Damascus", "Asia/Qatar", "Asia/Riyadh", "Asia/Tehran", "Asia/Baku", "Asia/Dubai",
    "Asia/Tbilisi", "Asia/Yerevan", "Asia/Kabul", "Asia/Almaty", "Asia/Aqtobe", "Asia/Aqtau", "Asia/Ashgabat", "Asia/Atyrau",
    "Asia/Dushanbe", "Asia/Karachi", "Indian/Maldives", "Asia/Oral", "Asia/Qostanay", "Asia/Qyzylorda", "Asia/Samarkand", "Asia/Tashkent",
    "Asia/Colombo", "Asia/Kolkata", "Asia/Kathmandu", "Asia/Bishkek", "Indian/Chagos", "Asia/Dhaka", "Asia/Thimphu", "Asia/Urumqi",
    "Asia/Yangon", "Asia/Bangkok", "Asia/Ho_Chi_Minh", "Asia/Hovd", "Asia/Jakarta", "Asia/Pontianak", "Asia/Hong_Kong", "Asia/Kuching",
    "Asia/Macau", "Asia/Makassar", "Asia/Manila", "Asia/Shanghai", "Asia/Singapore", "Asia/Taipei", "Asia/Ulaanbaatar", "Asia/Dili",
    "Asia/Jayapura", "Asia/Pyongyang", "Asia/Seoul", "Asia/Tokyo", "Pacific/Niue", "Pacific/Pago_Pago", "Pacific/Rarotonga", "Pacific/Tahiti",
    "Pacific/Marquesas", "Pacific/Gambier", "Pacific/Pitcairn", "Australia/Perth", "Australia/Eucla", "Pacific/Palau", "Australia/Darwin", "Australia/Adelaide",
    "Australia/Broken_Hill", "Australia/Brisbane", "Pacific/Guam", "Australia/Lindeman", "Pacific/Port_Moresby", "Australia/Hobart", "Antarctica/Macquarie", "Australia/Melbourne",
    "Australia/Sydney", "Australia/Lord_Howe", "Pacific/Bougainville", "Pacific/Efate", "Pacific/Guadalcanal", "Pacific/Kosrae", "Pacific/Noumea", "Pacific/Norfolk",
    "Pacific/Fiji", "Pacific/Kwajalein", "Pacific/Nauru", "Pacific/Tarawa", "Pacific/Auckland", "Pacific/Chatham", "Pacific/Apia", "Pacific/Fakaofo",
    "Pacific/Kanton", "Pacific/Tongatapu", "Pacific/Kiritimati", "US/Samoa", "Pacific/Samoa", "Pacific/Midway", "US/Hawaii", "Pacific/Johnston",
    "HST", "US/Aleutian", "America/Atka", "US/Alaska", "US/Pacific", "PST8PDT", "Mexico/BajaNorte", "America/Ensenada",
    "America/Santa_Isabel", "Mexico/BajaSur", "MST", "US/Arizona", "America/Creston", "Canada/Pacific", "Canada/Yukon", "MST7MDT",
    "Navajo", "US/Mountain", "America/Shiprock", "Canada/Mountain", "America/Yellowknife", "Mexico/General", "Canada/Saskatchewan", "CST6CDT",
    "US/Central", "Chile/EasterIsland", "US/Indiana-Starke", "America/Knox_IN", "Canada/Central", "America/Rainy_River", "Jamaica", "EST",
    "America/Atikokan", "America/Cayman", "America/Coral_Harbour", "Brazil/Acre", "America/Porto_Acre", "US/Michigan", "Cuba", "US/East-Indiana",
    "America/Indianapolis", "America/Fort_Wayne", "America/Pangnirtung", "America/Louisville", "EST5EDT", "US/Eastern", "Canada/Eastern", "America/Nassau",
    "America/Montreal", "America/Nipigon", "America/Thunder_Bay", "Brazil/West", "America/Virgin", "America/Anguilla", "America/Antigua", "America/Aruba",
    "America/Blanc-Sablon", "America/Curacao", "America/Dominica", "America/Grenada", "America/Guadeloupe", "America/Kralendijk", "America/Lower_Princes", "America/Marigot",
    "America/Montserrat", "America/Port_of_Spain", "America/St_Barthelemy", "America/St_Kitts", "America/St_Lucia", "America/St_Thomas", "America/St_Vincent", "America/Tortola",
    "Canada/Atlantic", "Chile/Continental", "Canada/Newfoundland", "America/Buenos_Aires", "America/Catamarca", "America/Argentina/ComodRivadavia", "America/Cordoba", "America/Rosario",
    "America/Jujuy", "America/Mendoza", "Brazil/East", "Brazil/DeNoronha", "America/Godthab", "Etc/GMT+0", "Etc/GMT-0", "Etc/GMT0",
    "Etc/Greenwich", "GMT+0", "GMT-0", "GMT0", "Greenwich", "Etc/UCT", "Etc/Universal", "Etc/Zulu",
    "UCT", "UTC", "Universal", "Zulu", "Iceland", "Africa/Accra", "Africa/Bamako", "Africa/Banjul",
    "Africa/Conakry", "Africa/Dakar", "Africa/Freetown", "Africa/Lome", "Africa/Nouakchott", "Africa/Ouagadougou", "Atlantic/Reykjavik", "Atlantic/St_Helena",
    "Africa/Timbuktu", "Eire", "Atlantic/Faeroe", "Portugal", "WET", "GB", "GB-Eire", "Europe/Guernsey",
    "Europe/Isle_of_Man", "Europe/Jersey", "Europe/Belfast", "Africa/Bangui", "Africa/Brazzaville", "Africa/Douala", "Africa/Kinshasa", "Africa/Libreville",
    "Africa/Luanda", "Africa/Malabo", "Africa/Niamey", "Africa/Porto-Novo", "Europe/Ljubljana", "Europe/Podgorica", "Europe/Sarajevo", "Europe/Skopje",
    "Europe/Zagreb", "Arctic/Longyearbyen", "Europe/Copenhagen", "Europe/Oslo", "Europe/Stockholm", "Atlantic/Jan_Mayen", "CET", "MET",
    "Europe/Amsterdam", "Europe/Luxembourg", "Europe/Monaco", "Europe/Bratislava", "Europe/San_Marino", "Europe/Vatican", "Poland", "Europe/Busingen",
    "Europe/Vaduz", "Africa/Maseru", "Africa/Mbabane", "Africa/Blantyre", "Africa/Bujumbura", "Africa/Gaborone", "Africa/Harare", "Africa/Kigali",
    "Africa/Lubumbashi", "Africa/Lusaka", "Libya", "EET", "Egypt", "Europe/Tiraspol", "Europe/Mariehamn", "Israel",
    "Asia/Tel_Aviv", "Europe/Uzhgorod", "Europe/Zaporozhye", "Europe/Kiev", "Europe/Nicosia", "Turkey", "Asia/Istanbul", "W-SU",
    "Africa/Addis_Ababa", "Africa/Asmara", "Africa/Dar_es_Salaam", "Africa/Djibouti", "Africa/Kampala", "Africa/Mogadishu", "Indian/Antananarivo", "Indian/Comoro",
    "Indian/Mayotte", "Africa/Asmera", "Asia/Bahrain", "Antarctica/Syowa", "Asia/Aden", "Asia/Kuwait", "Iran", "Asia/Muscat",
    "Indian/Mahe", "Indian/Reunion", "Asia/Ashkhabad", "Indian/Kerguelen", "Asia/Calcutta", "Asia/Katmandu", "Asia/Dacca", "Asia/Thimbu",
    "Asia/Kashgar", "Indian/Cocos", "Asia/Rangoon", "Asia/Phnom_Penh", "Asia/Vientiane", "Indian/Christmas", "Asia/Saigon", "Hongkong",
    "Asia/Brunei", "Asia/Macao", "Asia/Ujung_Pandang", "Australia/West", "PRC", "Asia/Chongqing", "Asia/Harbin", "Asia/Chungking",
    "Singapore", "Asia/Kuala_Lumpur", "ROC", "Asia/Choibalsan", "Asia/Ulan_Bator", "ROK", "Japan", "Australia/North",
    "Australia/South", "Australia/Yancowinna", "Australia/Queensland", "Pacific/Saipan", "Antarctica/DumontDUrville", "Pacific/Chuuk", "Pacific/Yap", "Pacific/Truk",
    "Australia/Tasmania", "Australia/Currie", "Australia/Victoria", "Australia/ACT", "Australia/NSW", "Australia/Canberra", "Australia/LHI", "Pacific/Pohnpei",
    "Pacific/Ponape", "Kwajalein", "Pacific/Funafuti", "Pacific/Majuro", "Pacific/Wake", "Pacific/Wallis", "NZ", "Antarctica/McMurdo",
    "Antarctica/South_Pole", "NZ-CHAT", "Pacific/Enderbury", "America/Thule", "America/Nuuk", "America/Scoresbysund", "Atlantic/Azores", "America/Danmarkshavn",
    "Atlantic/Canary", "Europe/Dublin", "Atlantic/Faroe", "Europe/Lisbon", "Europe/London", "Atlantic/Madeira", "Europe/Andorra", "Europe/Belgrade",
    "Europe/Berlin", "Europe/Brussels", "Europe/Budapest", "Africa/Ceuta", "Europe/Gibraltar", "Europe/Madrid", "Europe/Malta", "Europe/Paris",
    "Europe/Prague", "Europe/Rome", "Europe/Tirane", "Europe/Vienna", "Europe/Warsaw", "Europe/Zurich", "Europe/Kaliningrad", "Europe/Athens",
    "Europe/Bucharest", "Europe/Chisinau", "Europe/Helsinki", "Europe/Kyiv", "Europe/Riga", "Europe/Sofia", "Europe/Tallinn", "Europe/Vilnius",
    "Europe/Istanbul", "Europe/Kirov", "Europe/Minsk", "Europe/Moscow", "Europe/Simferopol", "Europe/Volgograd", "Europe/Astrakhan", "Europe/Samara",
    "Europe/Saratov", "Europe/Ulyanovsk", "Asia/Yekaterinburg", "Asia/Omsk", "Asia/Barnaul", "Asia/Krasnoyarsk", "Asia/Novosibirsk", "Asia/Novokuznetsk",
    "Asia/Tomsk", "Asia/Irkutsk", "Asia/Chita", "Asia/Khandyga", "Asia/Yakutsk", "Asia/Ust-Nera", "Asia/Vladivostok", "Asia/Magadan",
    "Asia/Sakhalin", "Asia/Srednekolymsk", "Asia/Anadyr", "Asia/Kamchatka", "Factory", "Pacific/Honolulu", "America/Adak", "America/Anchorage",
    "America/Juneau", "America/Metlakatla", "America/Nome", "America/Sitka", "America/Yakutat", "America/Los_Angeles", "America/Tijuana", "America/Dawson_Creek",
    "America/Dawson", "America/Fort_Nelson", "America/Hermosillo", "America/Mazatlan", "America/Phoenix", "America/Vancouver", "America/Whitehorse", "America/Boise",
    "America/Cambridge_Bay", "America/Ciudad_Juarez", "America/Denver", "America/Edmonton", "America/Inuvik", "America/Bahia_Banderas", "America/Belize", "America/Chihuahua",
    "America/Costa_Rica", "America/El_Salvador", "America/Guatemala", "America/Managua", "America/Merida", "America/Mexico_City", "America/Monterrey", "America/Regina",
    "America/Swift_Current", "America/Tegucigalpa", "America/North_Dakota/Beulah", "America/North_Dakota/Center", "America/Chicago", "America/Indiana/Knox", "America/Matamoros", "America/Menominee",
    "America/North_Dakota/New_Salem", "America/Ojinaga", "America/Rankin_Inlet", "America/Resolute", "America/Indiana/Tell_City", "America/Winnipeg", "America/Cancun", "America/Jamaica",
    "America/Panama", "America/Detroit", "America/Grand_Turk", "America/Havana", "America/Indiana/Indianapolis", "America/Iqaluit", "America/Kentucky/Louisville", "America/Indiana/Marengo",
    "America/Kentucky/Monticello", "America/New_York", "America/Indiana/Petersburg", "America/Port-au-Prince", "America/Toronto", "America/Indiana/Vevay", "America/Indiana/Vincennes", "America/Indiana/Winamac",
    "America/Barbados", "America/Martinique", "America/Puerto_Rico", "America/Santo_Domingo", "Atlantic/Bermuda", "America/Glace_Bay", "America/Goose_Bay", "America/Halifax",
    "America/Moncton", "America/St_Johns", "America/Miquelon", "Pacific/Galapagos", "Pacific/Easter", "America/Bogota", "America/Eirunepe", "America/Guayaquil",
    "America/Lima", "America/Rio_Branco", "America/Boa_Vista", "America/Campo_Grande", "America/Caracas", "America/Cuiaba", "America/Guyana", "America/La_Paz",
    "America/Manaus", "America/Porto_Velho", "America/Santiago", "America/Araguaina", "America/Asuncion", "America/Bahia", "America/Belem", "America/Argentina/Buenos_Aires",
    "America/Argentina/Catamarca", "America/Cayenne", "America/Argentina/Cordoba", "America/Coyhaique", "America/Fortaleza", "America/Argentina/Jujuy", "America/Argentina/La_Rioja", "America/Maceio",
    "America/Argentina/Mendoza", "America/Montevideo", "Antarctica/Palmer", "America/Paramaribo", "America/Punta_Arenas", "America/Recife", "America/Argentina/Rio_Gallegos", "America/Argentina/Salta",
    "America/Argentina/San_Juan", "America/Argentina/San_Luis", "America/Santarem", "America/Sao_Paulo", "Atlantic/Stanley", "America/Argentina/Tucuman", "America/Argentina/Ushuaia", "America/Noronha",
    "Atlantic/South_Georgia",
  ]);

  // ---- DOM helpers ---------------------------------------------------------

  function clean(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function text(sel, root) {
    const el = (root || document).querySelector(sel);
    return el ? clean(el.textContent) : "";
  }

  function firstText(selectors, root) {
    for (const sel of selectors) {
      const t = text(sel, root);
      if (t) return t;
    }
    return "";
  }

  function meta(nameOrProp) {
    const el = document.querySelector(
      `meta[property="${nameOrProp}"], meta[name="${nameOrProp}"], meta[itemprop="${nameOrProp}"]`
    );
    return el ? clean(el.getAttribute("content")) : "";
  }

  function bodyText() {
    const body = document.body;
    if (!body) return "";
    return body.innerText || body.textContent || "";
  }

  // ---- date helpers --------------------------------------------------------

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  // Convert a Date plus a "did the source include a clock time" flag into the
  // string contract above. Floating local time is used so the calendar
  // template shows the same wall-clock time the page did.
  function dateToString(d, hasTime) {
    const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return hasTime ? `${day}T${pad(d.getHours())}:${pad(d.getMinutes())}:00` : day;
  }

  // Normalize a raw datetime attribute / JSON-LD value to the string contract.
  function normalizeDateValue(raw) {
    raw = clean(raw);
    if (!raw) return "";
    if (/^\d{12,}$/.test(raw)) {
      // epoch milliseconds (Meetup historically used these in datetime attrs)
      const d = new Date(Number(raw));
      return isNaN(d) ? "" : d.toISOString();
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; // date only -> all-day
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(raw)) {
      return raw.replace(" ", "T"); // already ISO-ish; keep any offset/Z as-is
    }
    return parseDateFromText(raw);
  }

  // Find the first date (optionally with a time) inside free-form text and
  // return it in the string contract. Returns "" when nothing matches.
  function parseDateFromText(s) {
    s = clean(s);
    if (!s) return "";

    const isoMatch = s.match(/\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?/);
    if (isoMatch) return normalizeIso(isoMatch[0]);

    const patterns = [
      // "June 14, 2026 at 7:00 PM" / "Jun 14 2026, 19:00" / "June 14, 2026 from 7 PM"
      new RegExp(`${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}(?:\\s*(?:,|at|from|@|·|—|–|-)?\\s*(${TIME}))?`, "i"),
      // "14 June 2026 at 7 PM"
      new RegExp(`\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}\\.?,?\\s+\\d{4}(?:\\s*(?:,|at|from|@|·|—|–|-)?\\s*(${TIME}))?`, "i"),
      // "Sunday, June 14 at 7 PM" (no year -> assume nearest upcoming)
      new RegExp(`${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:\\s*(?:,|at|@|·)\\s*(${TIME}))`, "i"),
      // "6/14/2026 7:00 PM"
      new RegExp(`\\d{1,2}/\\d{1,2}/\\d{4}(?:\\s*(?:,|at|@)?\\s*(${TIME}))?`, "i"),
    ];

    for (let i = 0; i < patterns.length; i++) {
      const m = s.match(patterns[i]);
      if (!m) continue;
      let candidate = m[0]
        .replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1")
        .replace(/\s+(?:at|from|@|·|—|–)\s+/gi, " ")
        .replace(/,\s*(\d{1,2}[:\s])/g, " $1");
      const hasTime = new RegExp(TIME, "i").test(candidate);
      // V8 won't parse "7 PM" without minutes; expand it.
      candidate = candidate
        .replace(/(\d{1,2})\s*([ap])\.?m\.?/gi, "$1:00 $2m")
        .replace(/(\d{1,2}:\d{2}):00 ([ap])m/gi, "$1 $2m");
      if (i === 2 && !/\d{4}/.test(candidate)) {
        candidate += `, ${nearestYearFor(candidate)}`;
      }
      const d = new Date(candidate);
      if (!isNaN(d)) return dateToString(d, hasTime);
    }
    return "";
  }

  function nearestYearFor(monthDayText) {
    const now = new Date();
    const thisYear = new Date(`${monthDayText} ${now.getFullYear()}`);
    if (!isNaN(thisYear) && thisYear.getTime() < now.getTime() - 24 * 3600 * 1000) {
      return now.getFullYear() + 1;
    }
    return now.getFullYear();
  }

  function normalizeIso(s) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return s.replace(" ", "T");
  }

  // ---- timezone helpers -----------------------------------------------------

  function isValidTimezone(tz) {
    return VALID_TIMEZONES.has(tz);
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

  // ---- merging ---------------------------------------------------------------

  // Combine partial results field-by-field; the first source with a non-empty
  // value for a field wins.
  function merge(...sources) {
    const out = {};
    for (const key of ["title", "start", "end", "location", "description", "ctz"]) {
      for (const src of sources) {
        if (src && src[key]) {
          out[key] = src[key];
          break;
        }
      }
    }
    return out;
  }

  return {
    sites: [],
    clean,
    text,
    firstText,
    meta,
    bodyText,
    dateToString,
    normalizeDateValue,
    parseDateFromText,
    isValidTimezone,
    scriptsText,
    findTimezone,
    merge,
  };
})());
