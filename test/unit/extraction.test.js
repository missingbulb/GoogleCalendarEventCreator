// Offline unit tests for the extraction layers, using small synthetic HTML
// snippets inline (no network, no committed cached HTML files). These pin down
// the extractor's behavior deterministically; test/integration/live.test.js
// is the suite that checks the real sites still serve parseable markup.
//
// extractFromHtml returns { events: [...] }; `firstEvent` grabs the single
// (or suggested first) event for the common single-event assertions.
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
  assert.equal(e.title, "Intro to Rust Workshop");
  assert.equal(e.start, "2026-07-08T18:30:00-04:00");
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
  assert.equal(e.start, "2026-09-12T10:00:00-07:00");
  assert.equal(e.end, "2026-09-12T16:00:00-07:00"); // only present in JSON-LD
  assert.equal(e.location, "Oregon Convention Center, Portland, OR");
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
  assert.equal(e.start, "2026-06-20T19:00:00");
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
  assert.equal(e.start, "2026-07-01T20:00:00+02:00");
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
  assert.equal(e.start, "2026-04-19T09:00:00");
  assert.equal(e.location, "Riverside Park boathouse, 120 River Rd");
  assert.equal(e.description, "Gloves and trash grabbers provided.");
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
  assert.equal(ev.events[0].start, "2026-10-03"); // date-only -> all-day event
  assert.equal(ev.events[0].location, "Market Square");
  assert.equal(ev.events[1].start, "2026-10-10T19:00:00");
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
  assert.equal(ev.events[0].start, "2026-06-18T20:00:00");
  assert.equal(ev.events[1].start, "2026-06-19T20:00:00");
  assert.equal(ev.events[2].start, "2026-06-20T20:00:00");
  assert.equal(ev.events[0].end, "2026-06-18T21:30:00");
  assert.equal(ev.events[1].end, "2026-06-19T21:30:00");
  assert.equal(ev.events[2].end, "2026-06-20T21:30:00");
  // Page-level description/ctz are filled into each film.
  assert.equal(ev.events[0].ctz, "Asia/Jerusalem");
  assert.equal(ev.events[0].description, "A week of films.");
  assert.ok(ev.events[0].location.includes("סינמטק תל אביב"));
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
  assert.equal(e.start, "2026-08-10T23:55:00");
  assert.equal(e.end, "2026-08-11T00:55:00");
  assert.equal(e.location, "Monkey Barrel 4 at Monkey Barrel Comedy, 9-12 Blair Street, EH1 1QR");
  assert.ok(e.description.includes("vague energy"));
  assert.equal(e.ctz, "GB");
});

test("Edinburgh Fringe: a multi-performance show yields one event per performance", () => {
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
  assert.equal(ev.events.length, 3);
  // 19:30Z reads as 20:30 local (GB is BST in August).
  assert.equal(ev.events[0].start, "2026-08-05T20:30:00");
  assert.equal(ev.events[1].start, "2026-08-06T20:30:00");
  assert.equal(ev.events[2].start, "2026-08-07T20:30:00");
  assert.equal(ev.events[0].ctz, "GB");
});

test("Edinburgh Fringe: ctz is GB even when the event JSON can't be found", () => {
  const html = `<h1>Some other edfringe.com page</h1>`;
  const e = firstEvent(html, "https://www.edfringe.com/tickets/some-other-page");
  assert.equal(e.ctz, "GB");
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
  assert.equal(e.start, "2026-07-08T18:30:00");
});

test("Meetup: an unrecognized timezone string is ignored", () => {
  const html = `
    <h1>Intro to Rust Workshop</h1>
    <script type="application/json">{"group":{"timezone":"Not/A_Timezone"}}</script>`;

  const e = firstEvent(html, "https://www.meetup.com/brooklyn-rustaceans/events/304218765/");
  assert.equal(e.ctz, ""); // no usable timezone -> empty
});

test("Page with no event information at all: still returns a single usable title", () => {
  const html = `<title>Just an Article</title><h1>Ten Tips for Houseplants</h1><p>Water them.</p>`;

  const ev = extractFromHtml(html, "https://www.blog.example/houseplants");
  assert.equal(ev.events.length, 1);
  assert.equal(ev.events[0].title, "Ten Tips for Houseplants");
  assert.equal(ev.events[0].start, "");
});
