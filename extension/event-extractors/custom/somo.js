// somo.social event pages: https://somo.social/en/e/anecdotes-presents-advanced-727
//
// The page is a React/Next.js app that server-renders one event, and publishes
// a complete schema.org Event JSON-LD block (name, startDate/endDate with UTC
// offsets, description as markdown, location as a Place). We take start/end
// straight from that embedded event (there is no <time datetime> node in the
// DOM), and override the fields the DOM states better than the JSON-LD:
//
//   title       the page's first <h1> (the event headline; later <h1>s belong
//               to the cookie-consent dialog)
//   location    the header venue line — an <a> linking to a Google Maps search
//               whose <span> holds the full address ("<venue>, <street>,
//               <city>, <country>"). The JSON-LD location.name is only the bare
//               venue name, with an empty PostalAddress, so the DOM span is the
//               fuller value.
//   description the "About the event" block (EventDescriptionClamp), rendered
//               with the block helpers so its bullet list and links survive as
//               text. The JSON-LD description carries the same copy but as raw
//               markdown (** and [text](url)), so the rendered DOM reads cleaner.
//   ctz         the venue's timezone — see ctzFromCountry below.
//
// TIMEZONE (ctz): somo hosts events worldwide, so the zone is per-event, not a
// fixed site constant. The page is no help by the usual routes: its schema.org
// PostalAddress is empty (no addressCountry), and the only IANA zone it embeds
// in inline JSON is "Europe/Stockholm" — the site's own rendering zone (it shows
// this event as "5:00 PM", i.e. 15:00 UTC in Stockholm), NOT the venue's — while
// the startDate/endDate are serialized in UTC (+00:00), so their offset doesn't
// reflect the venue either. The one venue-country signal the page gives is the
// country at the end of the address line, so we derive ctz from that. ctz only
// changes the Calendar event's displayed zone (the instant is fixed by the
// +00:00 start/end), so anchoring a Tel Aviv event to Asia/Jerusalem shows it at
// the correct local 18:00 rather than the viewer's zone.
//
// A matched host runs THIS source only — it must produce every field itself; the
// generic fallback extractor does not run for a supported host. The merge() below
// lets these DOM values win, with the page's embedded event filling start/end.
(() => {
  const { text, blockText, merge, embeddedEvents } = GCal;

  // Map the address's trailing country name to its IANA zone, reusing the
  // canon's country→zone table (COUNTRY_TIMEZONES, keyed by ISO region code)
  // with the codes inverted to English names via Intl. Only single-zone
  // countries yield a zone: a country alone can't pick between a multi-zone
  // country's regions, and an unrecognized name gives nothing — so we never
  // emit a wrong ctz, only a right one or none (the derive-timezone contract).
  function ctzFromCountry(location) {
    const country = (location.split(",").pop() || "").trim().toLowerCase();
    if (!country) return "";
    let names;
    try {
      names = new Intl.DisplayNames(["en"], { type: "region" });
    } catch (e) {
      return "";
    }
    for (const [code, zones] of Object.entries(GCal.COUNTRY_TIMEZONES || {})) {
      if (zones.length !== 1) continue;
      let name;
      try {
        name = names.of(code);
      } catch (e) {
        continue;
      }
      if (name && name.toLowerCase() === country) return zones[0];
    }
    return "";
  }

  GCal.sources.push({
    name: "somo",
    matches: (host) => /(^|\.)somo\.social$/.test(host),
    extract() {
      // The pin link at the top of the event header; only that maps anchor
      // wraps the address in a <span> (the "Get directions" buttons don't).
      const location = text('a[href*="google.com/maps"] span');
      const dom = {
        title: text("h1"),
        location,
        // The description block minus its "Read more" button (a sibling).
        description: (() => {
          const el = document.querySelector(
            '[data-sentry-component="EventDescriptionClamp"] > div'
          );
          return el ? blockText(el) : "";
        })(),
        ctz: ctzFromCountry(location),
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
