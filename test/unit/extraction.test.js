// Offline unit tests for the extraction layers, using small synthetic HTML
// snippets inline (no network, no committed cached HTML files). These pin down
// the extractor's behavior deterministically; test/extractors/live.test.js
// is the suite that checks the real sites still serve parseable markup.
//
// extractFromHtml returns { events: [...] }, where each event carries its timing
// in times[] (the multi-instance model). `firstEvent` grabs the suggested first
// event; its start/end/duration live on its first instance (`firstEvent(...).
// times[0]`), while title/location/description/ctz stay on the event itself.
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
  assert.equal(e.location, "Brooklyn Public Library");
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
  assert.equal(e.location, "Oregon Convention Center, Portland, OR");
});

test("SeeTickets: title from h1, start from time[datetime], location assembled from venue elements", () => {
  // seetickets.com blocks automated fetchers (HTTP 403 from GitHub Actions),
  // so there is no cached integration case — this unit test uses synthetic HTML
  // that represents the site's event-page structure.
  const html = `
    <script type="application/ld+json">
    { "@type": "MusicEvent", "name": "The Mary Wallopers",
      "startDate": "2026-10-13T18:00:00Z",
      "location": { "@type": "Place", "name": "Edinburgh Corn Exchange",
                    "address": { "addressLocality": "Edinburgh", "addressCountry": "GB" } } }
    </script>
    <h1>The Mary Wallopers</h1>
    <time datetime="2026-10-13T18:00:00Z">Tuesday 13 October 2026</time>
    <div class="venue-name">Edinburgh Corn Exchange</div>
    <div class="venue-location">Edinburgh</div>`;

  const e = firstEvent(html, "https://www.seetickets.com/tour/the-mary-wallopers");
  assert.equal(e.title, "The Mary Wallopers");
  assert.equal(e.times[0].start, "2026-10-13T18:00:00Z");
  assert.ok(e.location.includes("Edinburgh Corn Exchange"));
  assert.ok(e.location.includes("Edinburgh"));
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
  assert.equal(e.location, "Blue Door Hall, Hauptstr. 12, Berlin");
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
  assert.equal(e.location, "The Williamsburg Hotel Bar, 96 Wythe Ave, Brooklyn, NY");
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
  assert.equal(e.location, "Riverside Park boathouse, 120 River Rd");
  assert.equal(e.description, "Gloves and trash grabbers provided.");
});

test("Generic site: a day-first dotted date (D.M.YYYY) yields an all-day event", () => {
  // The everyday non-US format. With no time directly after it (Hebrew text
  // intervenes here), it's an all-day event — read day-first, not month-first.
  const html = `<h1>Standup Night</h1><p>הופעה בתאריך 15.6.2026 פתיחת דלתות 18:30</p>`;

  const e = firstEvent(html, "https://www.example.com/standup");
  assert.equal(e.title, "Standup Night");
  assert.equal(e.times[0].start, "2026-06-15");
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
  assert.equal(e.location, "500 Main St, Springfield, IL");
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
  assert.equal(e.location, "Peace Forest, Jerusalem");
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
  assert.equal(ev.events[0].location, "Market Square");
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
  assert.ok(ev.events[0].location.includes("סינמטק תל אביב"));
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
  assert.equal(ev.events[0].location, "סינמטק תל אביב, רחוב הארבעה 5, תל אביב");
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
  assert.equal(e.location, "Monkey Barrel 4 at Monkey Barrel Comedy, 9-12 Blair Street, EH1 1QR");
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

test("Page with a parseable date but no site/JSON-LD: still yields the event", () => {
  // A date is a real event signal, so the generic fallback keeps the event.
  const html = `<h1>Block Party</h1><p>Join us on Saturday, July 11, 2026 at 2 PM.</p>`;

  const ev = extractFromHtml(html, "https://www.blog.example/block-party");
  assert.equal(ev.events.length, 1);
  assert.equal(ev.events[0].title, "Block Party");
  assert.equal(ev.events[0].times[0].start, "2026-07-11T14:00:00");
});
