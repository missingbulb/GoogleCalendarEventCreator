// Fixed extraction results + tab info used to render the popup
// deterministically for the UI snapshot tests.
//
// SINGLE_EVENT mirrors an ordinary event page (one button). MULTI_EVENT
// mirrors a listing/series page (one button per event). The multi-event
// titles are synthetic English strings on purpose: the UI test fonts
// (Liberation Sans) have no Hebrew glyphs, and the test exercises the
// multi-button LAYOUT, not any specific page's text.
"use strict";

const TAB = {
  id: 1,
  index: 0,
  title: "NYC Tech Mixer 2026 | Meetup",
  url: "https://www.meetup.com/nyctechmixer/events/311245599/",
};

const SINGLE_EVENT = {
  title: "NYC Tech Mixer 2026",
  start: "2026-06-25T18:00:00-04:00",
  end: "2026-06-25T21:00:00-04:00",
  location: "The Williamsburg Hotel Bar, 96 Wythe Ave, Brooklyn, NY",
  description: "Join us for the best networking event in NYC!",
  multipleEvents: false,
  events: [
    {
      title: "NYC Tech Mixer 2026",
      start: "2026-06-25T18:00:00-04:00",
      end: "2026-06-25T21:00:00-04:00",
      location: "The Williamsburg Hotel Bar, 96 Wythe Ave, Brooklyn, NY",
    },
  ],
};

const MULTI_EVENT = {
  title: "Opening Night Gala",
  start: "2026-06-17T20:00:00",
  end: null,
  location: "Main Cinematheque, Hall 3",
  description: "A week celebrating international cinema.",
  multipleEvents: true,
  ctz: "Asia/Jerusalem",
  events: [
    { title: "Opening Night Gala", start: "2026-06-17T20:00:00", end: null, location: "Main Cinematheque, Hall 3" },
    { title: "Restored Classics Matinee", start: "2026-06-18T18:30:00", end: null, location: "Main Cinematheque, Hall 1" },
    { title: "New Directors Showcase", start: "2026-06-19T21:00:00", end: null, location: "Main Cinematheque, Hall 1" },
    { title: "Documentary Spotlight", start: "2026-06-20T14:30:00", end: null, location: "Main Cinematheque, Hall 1" },
    { title: "Animation Marathon", start: "2026-06-20T19:45:00", end: null, location: "Main Cinematheque, Hall 1" },
    { title: "Closing Ceremony & Awards", start: "2026-06-21T18:30:00", end: null, location: "Main Cinematheque, Hall 3" },
  ],
};

module.exports = { TAB, SINGLE_EVENT, MULTI_EVENT };
