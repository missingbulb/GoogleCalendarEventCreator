// Offline unit tests for the extraction layers, using small synthetic HTML
// snippets inline (no network, no committed cached HTML files). These pin down
// the extractor's behavior deterministically; dev/requirements/extractor/live.test.js
// is the suite that checks the real sites still serve parseable markup.
//
// extractFromHtml returns { events: [...] }, where each event carries its timing
// AND place in times[] (the multi-instance model). `firstEvent` grabs the
// suggested first event; its start/end/duration/location live on its first
// instance (`firstEvent(...).times[0]`), while title/description/ctz stay on the
// event itself (there is no top-level location).
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { extractFromHtml } = require("../harness");

function firstEvent(html, url) {
  return extractFromHtml(html, url).events[0];
}

test("Meetup: hardcoded selectors (title, time, venue, details)", () => {
  const html = `
    <h1>Intro to Rust Workshop</h1>
    <div id="event-info">
      <time datetime="2026-07-08T18:30:00-04:00">Wed, Jul 8</time>
      <div data-testid="location-info"><a data-testid="venue-name">Brooklyn Public Library</a></div>
    </div>
    <div id="event-details"><p>Bring your laptop! We cover ownership and borrowing.</p></div>`;

  const ev = extractFromHtml(html, "https://www.meetup.com/brooklyn-rustaceans/events/304218765/");
  assert.equal(ev.events.length, 1); // a single event still yields one entry
  const e = ev.events[0];
  assert.equal(e.times.length, 1); // with a single instance
  assert.equal(e.title, "Intro to Rust Workshop");
  assert.equal(e.times[0].start, "2026-07-08T18:30:00-04:00");
  assert.equal(e.times[0].location, "Brooklyn Public Library");
  assert.ok(e.description.includes("ownership and borrowing"));
});

test("Eventbrite: site selectors, with end time filled from JSON-LD", () => {
  const html = `
    <script type="application/ld+json">
    { "@type": "Event", "name": "Coffee Festival",
      "startDate": "2026-09-12T10:00:00-07:00", "endDate": "2026-09-12T16:00:00-07:00" }
    </script>
    <h1 class="event-title">Coffee Festival</h1>
    <time datetime="2026-09-12T10:00:00-07:00">Sep 12</time>
    <p class="location-info__address">Oregon Convention Center, Portland, OR</p>
    <div class="event-description">Taste 50+ local roasters.</div>`;

  const e = firstEvent(html, "https://www.eventbrite.com/e/coffee-festival-tickets-998877665544");
  assert.equal(e.title, "Coffee Festival");
  assert.equal(e.times[0].start, "2026-09-12T10:00:00-07:00");
  assert.equal(e.times[0].end, "2026-09-12T16:00:00-07:00"); // only present in JSON-LD
  assert.equal(e.times[0].location, "Oregon Convention Center, Portland, OR");
});

test("Facebook: title from <h1>, date parsed from visible text", () => {
  const html = `
    <title>Summer Rooftop Party | Facebook</title>
    <meta property="og:description" content="Sunset views, live DJ.">
    <div role="main">
      <span class="x193iq5w">Saturday, June 20, 2026 at 7 PM</span>
      <h1 class="x1heor9g">Summer Rooftop Party</h1>
    </div>`;

  const e = firstEvent(html, "https://www.facebook.com/events/1234567890123456/");
  assert.equal(e.title, "Summer Rooftop Party");
  assert.equal(e.times[0].start, "2026-06-20T19:00:00");
  assert.ok(e.description.includes("Sunset views"));
});

test("Generic site: JSON-LD inside @graph, location flattened, HTML stripped", () => {
  const html = `
    <script type="application/ld+json">
    { "@graph": [
        { "@type": "Organization", "name": "Blue Door Hall" },
        { "@type": "MusicEvent", "name": "Late Night Jazz",
          "startDate": "2026-07-01T20:00:00+02:00",
          "location": { "@type": "Place", "name": "Blue Door Hall",
                        "address": { "streetAddress": "Hauptstr. 12", "addressLocality": "Berlin" } },
          "description": "<p>An <b>intimate</b> evening of jazz.</p>" } ] }
    </script>
    <h1>Our shows</h1>`;

  const e = firstEvent(html, "https://www.bluedoorhall.example/shows/jazz-night");
  assert.equal(e.title, "Late Night Jazz");
  assert.equal(e.times[0].start, "2026-07-01T20:00:00+02:00");
  assert.equal(e.times[0].location, "Blue Door Hall, Hauptstr. 12, Berlin");
  assert.equal(e.description, "An intimate evening of jazz.");
});

test("JSON-LD location: city/state repeated inside streetAddress is not duplicated", () => {
  const html = `
    <script type="application/ld+json">
    { "@type": "Event", "name": "Tech Mixer", "startDate": "2026-06-25T18:00:00-04:00",
      "location": { "@type": "Place", "name": "The Williamsburg Hotel Bar",
                    "address": { "streetAddress": "96 Wythe Ave, Brooklyn, NY",
                                 "addressLocality": "Brooklyn", "addressRegion": "NY",
                                 "addressCountry": "us" } } }
    </script>`;

  const e = firstEvent(html, "https://www.someevents.example/mixer");
  assert.equal(e.times[0].location, "The Williamsburg Hotel Bar, 96 Wythe Ave, Brooklyn, NY");
});

test("JSON-LD location: a Place name that is already a full formatted address is used verbatim, not re-appended", () => {
  // Some sites stuff the venue's whole formatted postal address into Place.name
  // ("Museum, Kaplan Street, Springfield, USA") AND repeat the pieces in the
  // structured `address`. When the name already contains BOTH the city
  // (addressLocality) and the street core (streetAddress minus its house
  // number), the parsed-out parts only duplicate it and tack on noise (the
  // administrative district), so the name is taken as-is — the way a dedicated
  // source reads it. Mirrors eventer.co.il's JSON-LD.
  const html = `
    <script type="application/ld+json">
    { "@type": "Event", "name": "Spring Gala", "startDate": "2026-07-01T20:00:00",
      "location": { "@type": "Place", "name": "Riverside Museum, Kaplan Street, Springfield, USA",
                    "address": { "streetAddress": "27 Kaplan Street", "addressLocality": "Springfield",
                                 "addressRegion": "Greater Springfield" } } }
    </script>`;

  const e = firstEvent(html, "https://www.somevenue.example/show");
  assert.equal(e.times[0].location, "Riverside Museum, Kaplan Street, Springfield, USA");
});

test("JSON-LD location: a Place name holding only the city (not the street) still gets the street composed in", () => {
  // Guard for the full-address shortcut above: a venue merely named after its
  // city ("Zappa Tel Aviv") is NOT a complete address — the street must still
  // be composed in. Mirrors eventim.co.il's JSON-LD.
  const html = `
    <script type="application/ld+json">
    { "@type": "Event", "name": "The 90s Show", "startDate": "2026-07-01T20:00:00",
      "location": { "@type": "Place", "name": "Zappa Tel Aviv - Midtown",
                    "address": { "streetAddress": "Menachem Begin Road 144", "addressLocality": "Tel Aviv",
                                 "postalCode": "6492102" } } }
    </script>`;

  const e = firstEvent(html, "https://www.somevenue.example/90s");
  assert.equal(e.times[0].location, "Zappa Tel Aviv - Midtown, Menachem Begin Road 144, 6492102");
});

test("JSON-LD location: an addressCountry Country object (not a plain string) contributes its name, not '[object Object]'", () => {
  // schema.org allows addressCountry to be a Country object ({ "@type":
  // "Country", "name": "..." }) rather than a plain string — seen on
  // livenation.de. A full name is kept, same as a plain-string country would be.
  const html = `
    <script type="application/ld+json">
    { "@type": "MusicEvent", "name": "Border City Blues", "startDate": "2026-08-01T20:00:00Z",
      "location": { "@type": "Place", "name": "RBC Amphitheatre",
                    "address": { "streetAddress": "909 Lakeshore Blvd. W.", "addressLocality": "Toronto",
                                 "addressCountry": { "@type": "Country", "name": "Canada" } } } }
    </script>`;

  const e = firstEvent(html, "https://www.example.com/border-city-blues");
  assert.equal(e.times[0].location, "RBC Amphitheatre, 909 Lakeshore Blvd. W., Toronto, Canada");
});

test("JSON-LD location: an addressCountry Country object holding a short code is dropped as noise", () => {
  // A Country object's name is meant to be the country's proper name; a short
  // code parked there (as livenation.de does, { "name": "US" }) adds little
  // value once the locality/postal code are already present — dropped, same
  // as custom/livenation.js's own established convention for this shape.
  const html = `
    <script type="application/ld+json">
    { "@type": "MusicEvent", "name": "Amphitheater Night", "startDate": "2026-08-02T19:00:00Z",
      "location": { "@type": "Place", "name": "Hollywood Casino Amphitheater",
                    "address": { "streetAddress": "14141 Riverport Dr", "addressLocality": "Maryland Heights",
                                 "postalCode": "63043", "addressCountry": { "@type": "Country", "name": "US" } } } }
    </script>`;

  const e = firstEvent(html, "https://www.example.com/amphitheater-night");
  assert.equal(e.times[0].location, "Hollywood Casino Amphitheater, 14141 Riverport Dr, Maryland Heights, 63043");
});

test("JSON-LD with raw (unescaped) control chars inside a string value is still parsed (tolerant recovery)", () => {
  // Server-side templating that drops a multi-line description straight into a
  // schema.org "description" emits RAW newlines inside the JSON string — invalid
  // JSON that makes a strict JSON.parse() throw, silently discarding an
  // otherwise-valid Event (seen on ASP.NET/SharePoint, e.g. visit.tel-aviv.gov.il).
  // The reader escapes the control characters inside the string and recovers the
  // Event. The recovered location — assembled from separate JSON-LD fields, so it
  // can never leak out of the raw <script> text as one contiguous string — is the
  // assertion that pins the parse actually succeeding. The literal newline below
  // is intentional (it is the defect being tolerated).
  const html = `
    <script type="application/ld+json">
    { "@context": "http://www.schema.org", "@type": "Event",
      "name": "Heritage Talk",
      "description": "First line of the talk.
Second line, after a raw newline.",
      "startDate": "2026-07-05T18:00:00",
      "endDate": "2026-07-05T20:00:00",
      "location": { "@type": "Place", "name": "City Museum",
                    "address": { "streetAddress": "Bialik St 27", "addressCountry": "Israel" } } }
    </script>
    <h1>Heritage Talk</h1>`;

  const e = firstEvent(html, "https://www.some-cms.example/events/heritage-talk");
  assert.equal(e.title, "Heritage Talk");
  assert.equal(e.times[0].start, "2026-07-05T18:00:00");
  assert.equal(e.times[0].end, "2026-07-05T20:00:00");
  assert.equal(e.times[0].location, "City Museum, Bialik St 27, Israel");
  assert.ok(
    e.description.includes("First line") && e.description.includes("Second line"),
    "both lines of the raw-newline description survive"
  );
});

test("Generic site with no structured data: heuristics only", () => {
  const html = `
    <meta name="description" content="Gloves and trash grabbers provided.">
    <h1>Annual Neighborhood Cleanup</h1>
    <p>Join us on Sunday, April 19, 2026 from 9:00 AM until noon.</p>
    <address>Riverside Park boathouse, 120 River Rd</address>`;

  const e = firstEvent(html, "https://www.riversideneighbors.example/news/spring-cleanup");
  assert.equal(e.title, "Annual Neighborhood Cleanup");
  assert.equal(e.times[0].start, "2026-04-19T09:00:00");
  assert.equal(e.times[0].location, "Riverside Park boathouse, 120 River Rd");
  assert.equal(e.description, "Gloves and trash grabbers provided.");
});

test("Generic site: a day-first dotted date (D.M.YYYY) with no following time yields an all-day event", () => {
  // The everyday non-US format. When no HH:MM time appears in the window after
  // the date (even with Hebrew prose around it), the result is an all-day event.
  const html = `<h1>Standup Night</h1><p>הופעה בתאריך 15.6.2026 ללא שעה מוגדרת</p>`;

  const e = firstEvent(html, "https://www.example.com/standup");
  assert.equal(e.title, "Standup Night");
  assert.equal(e.times[0].start, "2026-06-15");
});

test("Generic site: a day-first date with a time separated by a Hebrew label is extracted as timed", () => {
  // "15.6.2026 פתיחת דלתות 18:30" — the Hebrew label ("doors open") intervenes
  // between the date and the time, so the inline SEP-based capture misses it.
  // The look-ahead finds the first HH:MM within 150 chars after the date.
  const html = `<h1>Standup Night</h1><p>הופעה בתאריך 15.6.2026 פתיחת דלתות 18:30</p>`;

  const e = firstEvent(html, "https://www.example.com/standup");
  assert.equal(e.title, "Standup Night");
  assert.equal(e.times[0].start, "2026-06-15T18:30:00");
});

test("Generic site: a slash date with a time separated by a Hebrew label is extracted as timed", () => {
  // "16/06/2026 | שעת פתיחת דלתות: 21:00" — pipe + Hebrew label before the
  // time; the inline SEP sees only the pipe, not the time (which follows the
  // Hebrew). The look-ahead recovers the time.
  const html = `<h1>Show Night</h1><p>16/06/2026 | שעת פתיחת דלתות: 21:00</p>`;

  const e = firstEvent(html, "https://www.example.com/show");
  assert.equal(e.times[0].start, "2026-06-16T21:00:00");
});

test("Generic site: a dotted date with an adjacent time becomes a timed event", () => {
  const html = `<h1>Standup Night</h1><p>15.6.2026 19:00</p>`;

  const e = firstEvent(html, "https://www.example.com/standup");
  assert.equal(e.times[0].start, "2026-06-15T19:00:00");
});

test("Generic site: a date and time separated by a pipe become a timed event", () => {
  // "Date | Time" is a common display format; the pipe is a date/time separator
  // just like "at" or a comma, not a reason to fall back to an all-day event.
  const html = `<h1>Trivia Night</h1><p>16 June 2026 | 6:30 pm</p>`;

  const e = firstEvent(html, "https://www.example.com/trivia");
  assert.equal(e.times[0].start, "2026-06-16T18:30:00");
});

test("Generic site: a start–end time range fills the event end", () => {
  // A "start - end" range next to the date yields both start and end; the end
  // is the same date carried to the second time.
  const html = `<h1>Open Studio</h1><p>16 June 2026 | 6:30 pm - 10:00 pm</p>`;

  const e = firstEvent(html, "https://www.example.com/studio");
  assert.equal(e.times[0].start, "2026-06-16T18:30:00");
  assert.equal(e.times[0].end, "2026-06-16T22:00:00");
});

test("Generic site: a time range that crosses midnight rolls the end to the next day", () => {
  const html = `<h1>Late Set</h1><p>10 Aug 2026, 11:00 pm to 1:00 am</p>`;

  const e = firstEvent(html, "https://www.example.com/late");
  assert.equal(e.times[0].start, "2026-08-10T23:00:00");
  assert.equal(e.times[0].end, "2026-08-11T01:00:00");
});

test("Generic site: a day-first hyphenated date (DD-MM-YYYY) is parsed day-first", () => {
  // The same day-first reading as the dotted form, with "-" as the separator.
  const html = `<h1>Film Screening</h1><p>הקרנה 18-06-2026</p>`;

  const e = firstEvent(html, "https://www.example.com/screening");
  assert.equal(e.times[0].start, "2026-06-18");
});

test("Generic site: an unambiguous day-first slash date (DD/MM/YYYY, DD>12) is parsed day-first", () => {
  // DD/MM/YYYY with "/" is the everyday format in Europe and Israel. When the day
  // component is > 12 the reading is unambiguous — V8's Date() would reject it
  // (month=16 is invalid) — so we build the date from parts, day-first.
  // Ambiguous cases (DD ≤ 12) fall through to V8's US month-first parsing.
  const html = `<h1>Show Night</h1><p>16/06/2026</p>`;

  const e = firstEvent(html, "https://www.example.com/show");
  assert.equal(e.times[0].start, "2026-06-16");
});

test("Generic site: an AMBIGUOUS slash date is read day-first when the page declares a non-US locale", () => {
  // "05/07/2026" is genuinely ambiguous (day and month both ≤ 12). A page that
  // declares a day-first locale — <html lang="he">, an "en_IL"/"en-GB" og:locale,
  // any explicit region that isn't US — is telling us it writes DD/MM/YYYY, so we
  // read the 5th of July, not May 7th. This is what a per-site source for a
  // non-US host does; it's the everyday case for European/Israeli event pages
  // that emit "05/07/2026" in JSON-LD startDate or visible text (tel-aviv.gov.il).
  const html = `<!DOCTYPE html><html lang="he"><head>
      <meta property="og:title" content="מופע המחול">
    </head><body><h1>מופע המחול</h1><p>05/07/2026 19:00</p></body></html>`;

  const e = firstEvent(html, "https://www.example.com/dance");
  assert.equal(e.times[0].start, "2026-07-05T19:00:00");
});

test("Generic site: an ambiguous slash date stays month-first when no day-first locale is declared", () => {
  // The guard for the rule above: with no positive non-US locale signal (a bare
  // "en", or no <html lang> at all), the ambiguous "05/07/2026" keeps V8's US
  // month-first reading (May 7th) — we never GUESS day-first, we only follow a
  // locale the page itself states.
  const html = `<h1>Show</h1><p>05/07/2026</p>`;

  const e = firstEvent(html, "https://www.example.com/show");
  assert.equal(e.times[0].start, "2026-05-07");
});

test("Generic site: an ambiguous slash date stays month-first on an explicit en-US locale", () => {
  // An explicit US region is the one locale that keeps the month-first reading.
  const html = `<!DOCTYPE html><html lang="en-US"><head>
      <meta property="og:title" content="Show">
    </head><body><h1>Show</h1><p>05/07/2026</p></body></html>`;

  const e = firstEvent(html, "https://www.example.com/show");
  assert.equal(e.times[0].start, "2026-05-07");
});

test("Generic site: a Hebrew month date with bullet-separated time is parsed", () => {
  // Israeli sites write dates as "4 ביולי 2026•21:00" — day, Hebrew month name,
  // year, bullet separator, 24-hour time. V8 can't parse Hebrew months with new
  // Date(), so we build the date from parts, as with day-first numeric dates.
  // The bullet (•) is already in SEP; the month lookup covers all 12 Hebrew names.
  const html = `<h1>רביד פלוטניק</h1><span>4 ביולי 2026•21:00</span>`;

  const e = firstEvent(html, "https://www.example.com/show");
  assert.equal(e.times[0].start, "2026-07-04T21:00:00");
});

test("Generic site: a Hebrew month date without a time is all-day", () => {
  // Also covers the ב-prefixed form ("בינואר" = "in January") — both are used on Israeli sites.
  const html = `<h1>תערוכה</h1><p>17 בינואר 2027</p>`;

  const e = firstEvent(html, "https://www.example.com/exhibition");
  assert.equal(e.times[0].start, "2027-01-17");
});

test("Generic site: og:title's trailing site-name suffix is stripped", () => {
  // og:site_name appended to og:title ("Event - Site") is dropped, so the
  // generic title is the event alone — matching what a per-site source reads.
  const html = `
    <meta property="og:title" content="Quantum Lecture - ThinkLabs">
    <meta property="og:site_name" content="ThinkLabs">
    <p>15.6.2026</p>`;

  const e = firstEvent(html, "https://www.example.com/lecture");
  assert.equal(e.title, "Quantum Lecture");
});

test("Generic site: location falls back to Open Graph place meta tags", () => {
  // No microdata/<address>/venue-class on the page, so the location comes from
  // the OG place fields, composed most-specific-first.
  const html = `
    <meta property="og:title" content="Harvest Market">
    <meta property="og:street-address" content="500 Main St">
    <meta property="og:locality" content="Springfield">
    <meta property="og:region" content="IL">
    <p>Sunday, October 4, 2026 at 10 AM</p>`;

  const e = firstEvent(html, "https://www.example.com/market");
  assert.equal(e.title, "Harvest Market");
  assert.equal(e.times[0].location, "500 Main St, Springfield, IL");
});

test("Generic site: location falls back to 'Event @ Venue' in the page title", () => {
  // Listing/ticketing sites often title a page "Event @ Venue" (bandsintown,
  // secrettelaviv, Songkick). With no microdata/<address>/venue-class/place
  // meta, the part after " @ " in the title is the best-effort venue. The title
  // itself is left intact (a per-site source decides whether to strip it).
  const html = `
    <meta property="og:title" content="Berry Sakharof @ Peace Forest, Jerusalem">
    <p>16 June 2026 7:00 pm</p>`;

  const e = firstEvent(html, "https://www.example.com/show");
  assert.equal(e.title, "Berry Sakharof @ Peace Forest, Jerusalem");
  assert.equal(e.times[0].location, "Peace Forest, Jerusalem");
});

test("Generic site: 'Event @ Venue' title is trimmed when a fuller structured location is known", () => {
  // The "Event @ Venue" convention duplicates the venue in the title. When a
  // structured signal (here place meta) gives a FULLER location that leads with
  // that same venue, the "@ Venue" tail is redundant — trim the title to the
  // event name alone (matching how a dedicated source reads it). The location is
  // untouched.
  const html = `
    <meta property="og:title" content="Berry Sakharof @ Peace Forest">
    <meta property="og:street-address" content="Peace Forest">
    <meta property="og:locality" content="Jerusalem">
    <meta property="og:country-name" content="Israel">
    <p>16 June 2026 7:00 pm</p>`;

  const e = firstEvent(html, "https://www.example.com/show");
  assert.equal(e.title, "Berry Sakharof");
  assert.equal(e.times[0].location, "Peace Forest, Jerusalem, Israel");
});

test("Generic site: midnight-UTC <time datetime> is refined using the start time from og:description", () => {
  // Sites sometimes set <time datetime="YYYY-MM-DDT00:00:00.000Z"> as a date
  // placeholder while the actual start time is only in the visible text or
  // og:description ("Join us on June 23, 2026 at 10:00 AM!"). The fallback
  // should prefer the timed value over the midnight placeholder.
  const html = `
    <meta property="og:description" content="Join us on June 23, 2026 at 10:00 AM!">
    <h1>Datadog Live</h1>
    <time datetime="2026-06-23T00:00:00.000Z">Tuesday, June 23, 2026</time>`;

  const e = firstEvent(html, "https://events.example.com/datadog-live");
  assert.equal(e.times[0].start, "2026-06-23T10:00:00");
});

test("Generic site: midnight-UTC <time datetime> keeps its date when body text has no timed match on that date", () => {
  // If body text / metadata can't provide a timed refinement, the midnight
  // placeholder date is preserved — a date-only all-day hint is better than nothing.
  const html = `
    <meta property="og:description" content="A great event about technology.">
    <h1>Tech Conf</h1>
    <time datetime="2026-09-01T00:00:00.000Z">September 2026</time>`;

  const e = firstEvent(html, "https://events.example.com/tech-conf");
  assert.equal(e.times[0].start, "2026-09-01T00:00:00.000Z");
});

test("Generic site: '(Virtual)' or '(Online)' parenthetical in the title signals Online location", () => {
  // Many virtual-event pages mark the event mode as "(Virtual)" or "(Online)"
  // in the og:title — a convention used across event platforms (EventBrite,
  // Meetup, Luma, datadoghq.com/events, …). When no venue/address/place element
  // is found via any other heuristic, infer location = "Online" from the parenthetical.
  for (const label of ["(Virtual)", "(Online)", "(Webinar)"]) {
    const html = `
      <meta property="og:title" content="Tech Summit ${label}">
      <p>July 8, 2026 at 2 PM</p>`;
    const e = firstEvent(html, "https://www.example.com/summit");
    assert.equal(e.times[0].location, "Online", `title with ${label} should yield Online location`);
  }
});

test("Generic site: location falls back to the footer's maps-service link (single-venue site)", () => {
  // A single-venue site (a club, a cinema, a theater) rarely repeats its address
  // in each event's details — it publishes it once, in the page chrome. A footer
  // link to a maps service ("directions to us") whose text is the street address
  // is the strongest such marker (barby.co.il's footer is this exact shape).
  const html = `
    <h1>אפרת גוש</h1>
    <p>16/06/2026 21:00</p>
    <div class="footer">
      <a href="https://www.google.com/maps/dir/?api=1&destination=Barby">הנמל 1 - נמל יפו</a>
      <a href="tel:+97235188123">03-5188123</a>
    </div>`;

  const e = firstEvent(html, "https://www.club.example/show/4401");
  assert.equal(e.times[0].location, "הנמל 1 - נמל יפו");
});

test("Generic site: footer chrome address is composed with og:site_name — on a single-venue site the site IS the venue", () => {
  // The location-pin icon link (an <img> named location/map-pin/map-marker) is a
  // footer convention for "our address" (cinema.co.il's footer is this shape,
  // <noscript> fallback and all). In a real, scripting-enabled Chrome the
  // <noscript> content is a RAW TEXT node — reading textContent naively would
  // splice image markup into the address (see the gcec pack’s RULES.md), so the
  // noscript subtree must be dropped before reading. The site's own name
  // (og:site_name) then leads the composed location, the way a dedicated
  // single-venue source (and a human typing into Calendar) writes it.
  const html = `
    <meta property="og:site_name" content="סינמטק תל אביב">
    <h1>הילדה השמאלית</h1>
    <time datetime="2026-06-17T20:00:00"></time>
    <div id="colophon" class="site-footer">
      <ul><li>
        <a href="#"><img data-src="https://cdn.example/images/location.png"><noscript><img src="https://cdn.example/images/location.png" alt="img"></noscript>רחוב הארבעה 5, תל אביב</a>
      </li></ul>
    </div>`;

  const e = firstEvent(html, "https://www.cinema.example/event/left-handed-girl/");
  assert.equal(e.times[0].location, "סינמטק תל אביב, רחוב הארבעה 5, תל אביב");
});

test("Generic site: an address-marked footer element is read; phone and copyright lines never qualify", () => {
  // class/id mentioning "addres" (matching the common misspelling seen in the
  // wild as well as "address") marks the element that carries the street
  // address. The looks-like-an-address bar — short, a street number, more
  // letters than digits, no ©/email/URL — is what keeps the neighboring footer
  // furniture (phone numbers, copyright lines) from ever qualifying.
  const html = `
    <h1>Efrat Gosh Premiere</h1>
    <p>June 16, 2026 at 9 PM</p>
    <footer>
      <span id="footer-phone">03-5188123</span>
      <div class="copyright-address">© 2026 The Club. All rights reserved.</div>
      <span id="footer-addres">HaNamal 1, Jaffa Port</span>
    </footer>`;

  const e = firstEvent(html, "https://www.club.example/show");
  assert.equal(e.times[0].location, "HaNamal 1, Jaffa Port");
});

test("Generic site: footer with no address-like text yields no location at all", () => {
  // A maps link whose text is just a call to action ("Get Directions") and an
  // address-marked element holding only a phone number both fail the
  // looks-like-an-address bar — better no location than footer noise.
  const html = `
    <h1>Community Picnic</h1>
    <p>Sunday, October 4, 2026 at 10 AM</p>
    <footer>
      <a href="https://maps.google.com/?q=somewhere">Get Directions</a>
      <div class="address">03-5188123</div>
    </footer>`;

  const e = firstEvent(html, "https://www.example.com/picnic");
  assert.equal(e.times[0].location, undefined);
});

test("Generic site: any event-specific location signal beats the footer chrome address", () => {
  // Site chrome describes the SITE, not the event: on a multi-venue platform the
  // footer address is the operator's office (ticketmaster.co.il's footer names
  // the ticketing company's own address). Every event-specific signal — here the
  // OG place meta — must win over it.
  const html = `
    <meta property="og:title" content="Harvest Market">
    <meta property="og:street-address" content="500 Main St">
    <meta property="og:locality" content="Springfield">
    <p>Sunday, October 4, 2026 at 10 AM</p>
    <footer>
      <div class="footer-address">Address: 2 HaYarkon St, Bnei Brak, Floor 19</div>
    </footer>`;

  const e = firstEvent(html, "https://www.example.com/market");
  assert.equal(e.times[0].location, "500 Main St, Springfield");
});

test("Generic site: an '(Online)' title beats the footer chrome address", () => {
  // A virtual event's page often still carries the organizer's office address in
  // the footer; the event-specific "(Online)" parenthetical wins.
  const html = `
    <meta property="og:title" content="Tech Summit (Online)">
    <p>July 8, 2026 at 2 PM</p>
    <footer><div class="address">500 Main St, Springfield</div></footer>`;

  const e = firstEvent(html, "https://www.example.com/summit");
  assert.equal(e.times[0].location, "Online");
});

test("Generic site: a domain-shaped og:site_name is not prepended to the chrome address", () => {
  // Some sites set og:site_name to their bare domain ("stubhub.com",
  // "www.livenation.de") — a domain is not a venue name, so the address stands
  // alone. An 'Address:'-style label ahead of the street address is dropped.
  const html = `
    <meta property="og:site_name" content="www.club.example">
    <h1>Album Premiere</h1>
    <p>June 16, 2026 at 9 PM</p>
    <footer><div class="street-address">Address: HaNamal 1, Jaffa Port</div></footer>`;

  const e = firstEvent(html, "https://www.club.example/show");
  assert.equal(e.times[0].location, "HaNamal 1, Jaffa Port");
});

test("Generic site: a header address is read when the footer has none", () => {
  // Some venue sites put the address in a top contact bar instead of the footer
  // (tabitisrael.co.il's restaurant pages do); the footer is preferred, the
  // header is the runner-up.
  const html = `
    <h1>Wine Tasting Dinner</h1>
    <p>June 20, 2026 at 8 PM</p>
    <header class="top-bar">
      <span class="restaurant-address">שדרות חן 52, תל אביב</span>
    </header>
    <footer><span>© The Restaurant</span></footer>`;

  const e = firstEvent(html, "https://www.restaurant.example/events/wine");
  assert.equal(e.times[0].location, "שדרות חן 52, תל אביב");
});

test("Generic site: the date/time body-text scan reaches past a long nav block before the real content", () => {
  // A heavy nav/menu (a WordPress mega-menu, category list, …) can push a page's
  // real content well past a short prefix of the body text; the scan window
  // must be generous enough to still reach the date. Padding sized so the date
  // sits past 8000 chars of body text but within the scan limit.
  const nav = "Menu Item ".repeat(850); // ~8500 chars
  const html = `<nav>${nav}</nav><h1>Sentimental Value</h1><p>18-06-2026 Thursday, 19:00</p>`;
  const e = firstEvent(html, "https://www.example.com/event/sentimental-value");
  assert.equal(e.times[0].start, "2026-06-18T19:00:00");
});

test("Listing page with several events: every JSON-LD event is returned, in order", () => {
  const html = `
    <script type="application/ld+json">
    [ { "@type": "Event", "name": "Sculpture Fair", "startDate": "2026-10-03",
        "location": { "@type": "Place", "name": "Market Square" } },
      { "@type": "Event", "name": "Poetry Slam", "startDate": "2026-10-10T19:00:00" },
      { "@type": "Event", "name": "Chamber Music", "startDate": "2026-10-18T15:00:00" } ]
    </script>
    <h1>Upcoming Events</h1>`;

  const ev = extractFromHtml(html, "https://www.townartscouncil.example/calendar");
  assert.equal(ev.events.length, 3);
  assert.deepEqual(
    [...ev.events].map((e) => e.title),
    ["Sculpture Fair", "Poetry Slam", "Chamber Music"]
  );
  assert.equal(ev.events[0].times[0].start, "2026-10-03"); // date-only -> all-day event
  assert.equal(ev.events[0].times[0].location, "Market Square");
  assert.equal(ev.events[1].times[0].start, "2026-10-10T19:00:00");
});

test("Several events listed out of order are returned sorted by start time", () => {
  const html = `
    <script type="application/ld+json">
    [ { "@type": "Event", "name": "Evening Show", "startDate": "2026-08-08T17:30:00" },
      { "@type": "Event", "name": "Matinee", "startDate": "2026-08-08T14:00:00" },
      { "@type": "Event", "name": "Next Day", "startDate": "2026-08-09T11:00:00" },
      { "@type": "Event", "name": "Opening", "startDate": "2026-08-07T20:00:00" } ]
    </script>
    <h1>Festival Run</h1>`;

  const ev = extractFromHtml(html, "https://www.festival.example/run");
  assert.deepEqual(
    [...ev.events].map((e) => e.times[0].start),
    ["2026-08-07T20:00:00", "2026-08-08T14:00:00", "2026-08-08T17:30:00", "2026-08-09T11:00:00"]
  );
});

test("Tel Aviv Cinematheque series page: one event per film card", () => {
  const html = `
    <meta property="og:title" content="Demo Film Week - סינמטק תל אביב">
    <meta property="og:site_name" content="סינמטק תל אביב">
    <meta property="og:description" content="A week of films.">
    <div class="register-series-boxes">
      <div class="box"><div class="text-wraper"><div class="title">
        <h3>First Film</h3><p>18-06-2026 , חמישי / 20:00 / אולם 1</p></div>
        <ul><li>Israel / 2026 / אורך: 90</li></ul>
        <div class="content-detail"><a href="https://www.cinema.co.il/event/first/">details</a></div>
      </div></div>
      <div class="box"><div class="text-wraper"><div class="title">
        <h3>Second Film</h3><p>19-06-2026 , שישי / 20:00 / אולם 1</p></div>
        <ul><li>Israel / 2026 / אורך: 90</li></ul>
        <div class="content-detail"><a href="https://www.cinema.co.il/event/second/">details</a></div>
      </div></div>
      <div class="box"><div class="text-wraper"><div class="title">
        <h3>Third Film</h3><p>20-06-2026 , שבת / 20:00 / אולם 1</p></div>
        <ul><li>Israel / 2026 / אורך: 90</li></ul>
        <div class="content-detail"><a href="https://www.cinema.co.il/event/third/">details</a></div>
      </div></div>
    </div>
    <a href="#"><img data-src="https://www.cinema.co.il/x/location.png">רחוב הארבעה 5, תל אביב</a>`;

  const ev = extractFromHtml(html, "https://www.cinema.co.il/series/demo-film-week/");
  assert.equal(ev.events.length, 3);
  assert.deepEqual(
    [...ev.events].map((e) => e.title),
    ["First Film", "Second Film", "Third Film"]
  );
  // Distinct films (different title + description) stay separate single-instance
  // events; only identical-detail showings would group into one card.
  assert.equal(ev.events[0].times[0].start, "2026-06-18T20:00:00");
  assert.equal(ev.events[1].times[0].start, "2026-06-19T20:00:00");
  assert.equal(ev.events[2].times[0].start, "2026-06-20T20:00:00");
  assert.equal(ev.events[0].times[0].end, "2026-06-18T21:30:00");
  assert.equal(ev.events[1].times[0].end, "2026-06-19T21:30:00");
  assert.equal(ev.events[2].times[0].end, "2026-06-20T21:30:00");
  // Each film's description is assembled from its own box content; ctz is page-level.
  assert.equal(ev.events[0].ctz, "Asia/Jerusalem");
  assert.equal(
    ev.events[0].description,
    "First Film\n18-06-2026 , חמישי / 20:00 / אולם 1\n\nIsrael / 2026 / אורך: 90"
  );
  assert.equal(ev.events[0].times[0].eventLengthInMinutes, 90);
  assert.ok(ev.events[0].times[0].location.includes("סינמטק תל אביב"));
});

test("Tel Aviv Cinematheque: location is the address text only, not <img>/<noscript> markup", () => {
  // The location-pin <a> wraps an <img> plus a <noscript> fallback. Parse this
  // the way a real browser does (scripting on): jsdom then keeps the <noscript>
  // content as a raw text node, so reading link.textContent would splice that
  // <img> markup into the address. The fragment is script-free, so "dangerously"
  // executes nothing — it only flips jsdom's <noscript> parsing to match Chrome.
  const html = `
    <meta property="og:title" content="Some Film - סינמטק תל אביב">
    <meta property="og:site_name" content="סינמטק תל אביב">
    <select id="smdate_b"><option value="select">בחר תאריך</option><option value="2026-06-17~20522">17.6</option></select>
    <a href="#"><img data-src="https://www.cinema.co.il/x/location.png" alt="img"><noscript><img src="https://www.cinema.co.il/x/location.png" alt="img"></noscript>רחוב הארבעה 5, תל אביב</a>`;

  const ev = extractFromHtml(html, "https://www.cinema.co.il/event/some-film/", { runScripts: "dangerously" });
  assert.equal(ev.events[0].times[0].location, "סינמטק תל אביב, רחוב הארבעה 5, תל אביב");
});

test("Tel Aviv Cinematheque: a film's screenings group into one multi-instance event", () => {
  // Times aren't in the static page — they load via AJAX into #smtime_b only
  // after a date is chosen, and only for that date. When present, the selected
  // date's all-day showing is replaced by one timed showing per time; any other
  // (unselected) date stays all-day. All these showings share the film's
  // title/location/description, so they fold into ONE event whose times[] holds
  // every screening (the all-day date plus the two timed shows).
  const html = `
    <meta property="og:title" content="Some Film - סינמטק תל אביב">
    <select id="smdate_b">
      <option value="2026-06-18~111">18-06-2026 חמישי</option>
      <option value="2026-06-19~222" selected>19-06-2026 שישי</option>
    </select>
    <select id="smtime_b">
      <option>בחר שעה</option>
      <option value="333" data-time="16:30">16:30</option>
      <option value="444" data-time="20:30">20:30</option>
    </select>`;

  const ev = extractFromHtml(html, "https://www.cinema.co.il/event/some-film/");
  assert.equal(ev.events.length, 1); // one event...
  const e = ev.events[0];
  assert.deepEqual(
    [...e.times].map((t) => t.start),
    ["2026-06-18", "2026-06-19T16:30:00", "2026-06-19T20:30:00"] // ...with every screening
  );
  assert.equal(e.title, "Some Film");
  assert.equal(e.ctz, "Asia/Jerusalem");
});

test("Edinburgh Fringe: __NEXT_DATA__ event JSON, ctz always GB", () => {
  const nextData = {
    props: {
      pageProps: {
        data: {
          event: {
            title: "Mr Chonkers: Work in Chonkers",
            description: "Goofs, gags, musings, bits and vague energy.",
            venues: [{ title: "Monkey Barrel Comedy", address1: "9-12 Blair Street", postCode: "EH1 1QR" }],
            spaces: [{ venueName: "Monkey Barrel 4 at Monkey Barrel Comedy" }],
            performances: [{ dateTime: "2026-08-10T22:55:00.000Z", estimatedEndDateTime: "2026-08-10T23:55:00.000Z" }],
          },
        },
      },
    },
  };
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`;

  const e = firstEvent(html, "https://www.edfringe.com/tickets/whats-on/mr-chonkers-work-in-chonkers");
  assert.equal(e.title, "Mr Chonkers: Work in Chonkers");
  // The source instants are UTC; with ctz GB (BST in August) they're stored as
  // floating local wall-clock time, so 22:55Z reads as 23:55 and rolls the end
  // past midnight.
  assert.equal(e.times[0].start, "2026-08-10T23:55:00");
  assert.equal(e.times[0].end, "2026-08-11T00:55:00");
  assert.equal(e.times[0].location, "Monkey Barrel 4 at Monkey Barrel Comedy, 9-12 Blair Street, EH1 1QR");
  assert.ok(e.description.includes("vague energy"));
  assert.equal(e.ctz, "GB");
});

test("Edinburgh Fringe: a multi-performance show groups into one multi-instance event", () => {
  const nextData = {
    props: {
      pageProps: {
        data: {
          event: {
            title: "Sophie Duker: Hot Beef Injection",
            description: "The people's princess of provocation returns.",
            venues: [{ title: "Pleasance Courtyard", address1: "60 Pleasance", postCode: "EH8 9TJ" }],
            spaces: [{ venueName: "Forth at Pleasance Courtyard" }],
            performances: [
              { dateTime: "2026-08-05T19:30:00.000Z", estimatedEndDateTime: "2026-08-05T21:00:00.000Z" },
              { dateTime: "2026-08-06T19:30:00.000Z", estimatedEndDateTime: "2026-08-06T21:00:00.000Z" },
              { dateTime: "2026-08-07T19:30:00.000Z", estimatedEndDateTime: "2026-08-07T21:00:00.000Z" },
            ],
          },
        },
      },
    },
  };
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`;

  const ev = extractFromHtml(html, "https://www.edfringe.com/tickets/whats-on/sophie-duker-hot-beef-injection");
  // Every performance shares the show's title/location/description, so they fold
  // into one event whose times[] holds all three nights.
  assert.equal(ev.events.length, 1);
  const e = ev.events[0];
  assert.equal(e.times.length, 3);
  // 19:30Z reads as 20:30 local (GB is BST in August).
  assert.equal(e.times[0].start, "2026-08-05T20:30:00");
  assert.equal(e.times[1].start, "2026-08-06T20:30:00");
  assert.equal(e.times[2].start, "2026-08-07T20:30:00");
  assert.equal(e.ctz, "GB");
});

test("A touring show at several venues groups into one multi-instance event, each instance keeping its own location", () => {
  // The same title/description at different venues+dates is a touring show: the
  // grouping key is title+description+ctz (NOT location), so the dates fold into
  // ONE event whose instances differ by date AND venue. There is no top-level
  // location; each instance carries its own.
  const html = `
    <script type="application/ld+json">
    [ { "@type": "MusicEvent", "name": "The Wallflowers — On Tour", "description": "Live across the country.",
        "startDate": "2026-09-04T20:00:00", "location": { "@type": "Place", "name": "Paradiso, Amsterdam" } },
      { "@type": "MusicEvent", "name": "The Wallflowers — On Tour", "description": "Live across the country.",
        "startDate": "2026-09-11T20:00:00", "location": { "@type": "Place", "name": "Ancienne Belgique, Brussels" } },
      { "@type": "MusicEvent", "name": "The Wallflowers — On Tour", "description": "Live across the country.",
        "startDate": "2026-09-18T20:00:00", "location": { "@type": "Place", "name": "La Cigale, Paris" } } ]
    </script>
    <h1>Tour dates</h1>`;

  const ev = extractFromHtml(html, "https://www.example-tickets.com/the-wallflowers");
  assert.equal(ev.events.length, 1);
  const e = ev.events[0];
  assert.equal(e.title, "The Wallflowers — On Tour");
  assert.equal("location" in e, false, "no top-level location — it lives on each showing");
  assert.equal(e.times.length, 3);
  assert.deepEqual(
    [...e.times].map((t) => [t.start, t.location]),
    [
      ["2026-09-04T20:00:00", "Paradiso, Amsterdam"],
      ["2026-09-11T20:00:00", "Ancienne Belgique, Brussels"],
      ["2026-09-18T20:00:00", "La Cigale, Paris"],
    ]
  );
});

test("Same title at one shared venue groups into one event; the venue repeats on each showing (no top-level location)", () => {
  // The showings share a venue, but location is per-showing (no top-level field),
  // so each instance carries the venue — a single-venue event simply repeats it.
  const html = `
    <script type="application/ld+json">
    [ { "@type": "Event", "name": "Yoga in the Park", "description": "Morning flow.",
        "startDate": "2026-07-04T08:00:00", "location": { "@type": "Place", "name": "Riverside Lawn" } },
      { "@type": "Event", "name": "Yoga in the Park", "description": "Morning flow.",
        "startDate": "2026-07-11T08:00:00", "location": { "@type": "Place", "name": "Riverside Lawn" } } ]
    </script>
    <h1>Weekly yoga</h1>`;

  const ev = extractFromHtml(html, "https://www.example.org/yoga");
  assert.equal(ev.events.length, 1);
  const e = ev.events[0];
  assert.equal("location" in e, false, "no top-level location");
  assert.equal(e.times.length, 2);
  assert.deepEqual([...e.times].map((t) => t.location), ["Riverside Lawn", "Riverside Lawn"]);
});

test("Same time, different venues are distinct instances (not deduplicated)", () => {
  // dedupeInstances keys on start+end+duration+LOCATION, so two showings at the
  // same instant but different venues are kept as two instances.
  const html = `
    <script type="application/ld+json">
    [ { "@type": "Event", "name": "Simulcast Premiere", "description": "Two screens, one start.",
        "startDate": "2026-08-01T19:00:00", "location": { "@type": "Place", "name": "Hall A" } },
      { "@type": "Event", "name": "Simulcast Premiere", "description": "Two screens, one start.",
        "startDate": "2026-08-01T19:00:00", "location": { "@type": "Place", "name": "Hall B" } } ]
    </script>
    <h1>Premiere</h1>`;

  const ev = extractFromHtml(html, "https://www.example.org/premiere");
  assert.equal(ev.events.length, 1);
  assert.equal(ev.events[0].times.length, 2);
  assert.deepEqual([...ev.events[0].times].map((t) => t.location), ["Hall A", "Hall B"]);
});

test("Edinburgh Fringe: a page with no event JSON yields no event", () => {
  // A supported host alone is not an event signal: an edfringe.com page that
  // carries no performance JSON (and no parseable date) describes no event, so
  // the popup shows nothing rather than a dateless suggestion. (The source's
  // ctz=GB still applies to real events — see the cases above.)
  const html = `<h1>Some other edfringe.com page</h1>`;
  const ev = extractFromHtml(html, "https://www.edfringe.com/tickets/some-other-page");
  assert.equal(ev.events.length, 0);
});

test("Tel Aviv Cinematheque: ctz is always Asia/Jerusalem", () => {
  const html = `
    <meta property="og:title" content="Some Film - סינמטק תל אביב">
    <select id="smdate_b"><option value="select">בחר תאריך</option><option value="2026-06-17~20522">17.6</option></select>`;

  const e = firstEvent(html, "https://www.cinema.co.il/event/some-film/");
  assert.equal(e.ctz, "Asia/Jerusalem");
});

test("Meetup: ctz read from the group's timezone embedded in page scripts", () => {
  const html = `
    <h1>Intro to Rust Workshop</h1>
    <div id="event-info">
      <time datetime="2026-07-08T18:30:00-04:00">Wed, Jul 8</time>
    </div>
    <script type="application/json">{"group":{"timezone":"America/New_York"}}</script>`;

  const e = firstEvent(html, "https://www.meetup.com/brooklyn-rustaceans/events/304218765/");
  assert.equal(e.ctz, "America/New_York");
  // With the timezone known, the offset start is stored as floating local
  // wall-clock time in that zone (the ctz param then places it).
  assert.equal(e.times[0].start, "2026-07-08T18:30:00");
});

test("Meetup: an unrecognized timezone string is ignored", () => {
  const html = `
    <h1>Intro to Rust Workshop</h1>
    <div id="event-info">
      <time datetime="2026-07-08T18:30:00-04:00">Wed, Jul 8</time>
    </div>
    <script type="application/json">{"group":{"timezone":"Not/A_Timezone"}}</script>`;

  const e = firstEvent(html, "https://www.meetup.com/brooklyn-rustaceans/events/304218765/");
  assert.equal(e.ctz, ""); // no usable timezone -> empty
});

// --- Generic (unsupported-site) ctz derivation (#674) ----------------------
// The fallback derives an event timezone only when two independent
// page-declared hints agree — helpers/derive-timezone.js pins the acceptance
// rules unit-by-unit (extension-test/event-extractors/helpers/); these pin the
// end-to-end effect: the event gains the ctz and its times localize to it.

test("Generic site: ctz from a stated timezone corroborated by the event's own offset; times localize", () => {
  const html = `
    <script>self.__APP__ = {"event":{"timezone":"Asia/Jerusalem"}};</script>
    <script type="application/ld+json">
    { "@type": "Event", "name": "Rooftop Concert",
      "startDate": "2026-07-07T20:00:00+03:00", "endDate": "2026-07-07T23:00:00+03:00",
      "location": { "@type": "Place", "name": "HaTachana" } }
    </script>`;

  const e = firstEvent(html, "https://www.tickets.example/rooftop");
  assert.equal(e.ctz, "Asia/Jerusalem");
  // With the zone known, offset times are stored as floating wall-clock in it —
  // exactly what a dedicated source would produce.
  assert.equal(e.times[0].start, "2026-07-07T20:00:00");
  assert.equal(e.times[0].end, "2026-07-07T23:00:00");
});

test("Generic site: ctz from the JSON-LD venue country + the declared offset (no stated zone)", () => {
  // US + -04:00 in June is Eastern time and nothing else.
  const html = `
    <script type="application/ld+json">
    { "@type": "Event", "name": "DevConf", "startDate": "2026-06-09T08:00:00-04:00",
      "location": { "@type": "Place", "name": "Javits Center",
                    "address": { "addressLocality": "New York", "addressCountry": "US" } } }
    </script>`;

  const e = firstEvent(html, "https://www.devconf.example/2026");
  assert.equal(e.ctz, "America/New_York");
  assert.equal(e.times[0].start, "2026-06-09T08:00:00");
});

test("Generic site: a UTC-serialized time gains the zone of a single-zone country corroborated by the page language", () => {
  // eventer.co.il-style: the JSON-LD instant is in UTC (Z — deliberately not an
  // offset hint), but address country IL and the Hebrew page agree.
  const html = `<html lang="he"><body>
    <script type="application/ld+json">
    { "@type": "Event", "name": "לילה לא שקט", "startDate": "2026-07-09T16:30:00.000Z",
      "location": { "@type": "Place", "name": "מוזיאון תל אביב",
                    "address": { "addressLocality": "תל אביב", "addressCountry": "IL" } } }
    </script></body></html>`;

  const e = firstEvent(html, "https://www.tickets.example/8lfff");
  assert.equal(e.ctz, "Asia/Jerusalem");
  assert.equal(e.times[0].start, "2026-07-09T19:30:00"); // 16:30Z shown as Israel wall-clock
});

test("Generic site: one hint alone derives no ctz — the offset-bearing time is kept as-is", () => {
  // An offset with nothing independent to corroborate it (no stated zone, no
  // country, no locale) must not be turned into a zone.
  const html = `
    <script type="application/ld+json">
    { "@type": "MusicEvent", "name": "Club Night", "startDate": "2026-07-01T20:00:00+02:00",
      "location": { "@type": "Place", "name": "Warehouse 9",
                    "address": { "addressLocality": "Somewhere" } } }
    </script>`;

  const e = firstEvent(html, "https://www.club.example/night");
  assert.equal(e.ctz, "");
  assert.equal(e.times[0].start, "2026-07-01T20:00:00+02:00"); // exact instant preserved, unzoned
});

test("Generic site: a stated venue country alone (floating times, non-agreeing locale) derives no ctz", () => {
  // stubhub-style: the address names Israel but the page is en-US boilerplate
  // and the times are floating — a single hint, so the event ships without a
  // ctz rather than with a guessed one.
  const html = `<html lang="en-US"><body>
    <script type="application/ld+json">
    { "@type": "Event", "name": "Concert", "startDate": "2026-07-04T20:30:00",
      "location": { "@type": "Place", "name": "Park HaYarkon",
                    "address": { "addressLocality": "Tel Aviv", "addressCountry": "Israel" } } }
    </script></body></html>`;

  const e = firstEvent(html, "https://www.resale.example/concert");
  assert.equal(e.ctz, "");
  assert.equal(e.times[0].start, "2026-07-04T20:30:00");
});

test("Page with no event information at all: returns no events", () => {
  // A title (og:title / <h1> / document title) is present on essentially every
  // page, so a title with no date is not an event — the popup shows nothing.
  const html = `<title>Just an Article</title><h1>Ten Tips for Houseplants</h1><p>Water them.</p>`;

  const ev = extractFromHtml(html, "https://www.blog.example/houseplants");
  assert.equal(ev.events.length, 0);
});

test("Supported host, no event on the page: returns no events", () => {
  // Regression (#133): the home page of a supported site (cinema.co.il) carries
  // the site's og:title and the footer location that appears on every page, but
  // no screening picker and no date. A matched host must not be enough on its
  // own to suggest an event — without a parsed date or JSON-LD event the popup
  // shows nothing instead of a dateless "עמוד ראשי" / footer-location suggestion.
  const html = `
    <meta property="og:title" content="עמוד ראשי - סינמטק תל אביב">
    <meta property="og:site_name" content="סינמטק תל אביב">
    <meta property="og:description" content="ברוכים הבאים לסינמטק תל אביב.">
    <h1>עמוד ראשי</h1>
    <a href="#"><img data-src="https://www.cinema.co.il/x/location.png">רחוב הארבעה 5, תל אביב</a>`;

  const ev = extractFromHtml(html, "https://www.cinema.co.il/");
  assert.equal(ev.events.length, 0); // nothing suggested
  assert.equal(ev.supported, true); // but the host is still recognized (green icon)
});

test("Supported host, dedicated extractor finds nothing but the page has a generic event: falls back and flags it (#456)", () => {
  // meetup.js reads <time datetime> / JSON-LD only; with neither present it finds
  // no event, so the orchestrator runs the generic fallback, which reads the
  // og:title + event:start_time meta + <address> the dedicated source ignores.
  const html = `
    <meta property="og:title" content="Indie Rock Night">
    <meta property="event:start_time" content="2026-09-12T20:00:00">
    <address>The Echo, Los Angeles</address>`;

  const ev = extractFromHtml(html, "https://www.meetup.com/some-group/events/123/");
  assert.equal(ev.supported, true); // the host stays supported (green icon)
  assert.equal(ev.fallback, true);  // the events came from the generic fallback
  assert.equal(ev.events.length, 1);
  assert.equal(ev.events[0].title, "Indie Rock Night");
  assert.equal(ev.events[0].times[0].location, "The Echo, Los Angeles");
  assert.equal(ev.events[0].times[0].start, "2026-09-12T20:00:00");
});

test("Supported host, neither dedicated nor fallback finds an event: nothing, fallback flag stays false (#456)", () => {
  const html = `<h1>Brooklyn Rustaceans</h1><p>Welcome to our group.</p>`;

  const ev = extractFromHtml(html, "https://www.meetup.com/brooklyn-rustaceans/");
  assert.equal(ev.events.length, 0);
  assert.equal(ev.supported, true);
  assert.equal(ev.fallback, false);
});

test("Page with a parseable date but no site/JSON-LD: still yields the event", () => {
  // A date is a real event signal, so the generic fallback keeps the event.
  const html = `<h1>Block Party</h1><p>Join us on Saturday, July 11, 2026 at 2 PM.</p>`;

  const ev = extractFromHtml(html, "https://www.blog.example/block-party");
  assert.equal(ev.events.length, 1);
  assert.equal(ev.events[0].title, "Block Party");
  assert.equal(ev.events[0].times[0].start, "2026-07-11T14:00:00");
});

test("Generic (unsupported) site: HTML markup in og:description is converted to plain text", () => {
  // Sites like ticketmaster.co.il embed literal HTML (e.g. "<br />") in their
  // og:description attribute value. The fallback should convert it to newlines
  // rather than returning the raw markup string.
  const html = `
    <meta property="og:description" content="Line one<br />Line two<br /><br />Line three">
    <h1>Rock Concert</h1>
    <time datetime="2026-07-04T21:00:00">July 4, 2026</time>`;
  const e = firstEvent(html, "https://www.example.com/concert");
  assert.equal(e.description, "Line one\nLine two\n\nLine three");
});
