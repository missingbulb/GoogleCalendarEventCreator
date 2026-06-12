// Cinema.co.il event pages (Tel Aviv Cinematheque):
// https://www.cinema.co.il/event/<slug>/
//
// TODO: this is a placeholder while we wait on cached HTML snapshots for
// cinema.co.il (the site returns HTTP 403 to automated fetchers, so the
// refresh-snapshots workflow has to record it first — see issue #16).
// Until then this extractor contributes nothing, and the jsonld.js /
// generic.js layers handle the page on their own. Fill in real selectors
// here once a snapshot is available, following the pattern in meetup.js /
// eventbrite.js (hardcoded title/start/end/location/description selectors,
// with anything missing picked up by the jsonld/generic merge).
(() => {
  GCal.sites.push({
    name: "cinema.co.il",
    matches: (host) => /(^|\.)cinema\.co\.il$/.test(host),
    extract() {
      return {};
    },
  });
})();
