// Fixed extraction results used to render the popup deterministically for the
// UI snapshot tests. They mirror the extractor's shape: { events: [...] },
// each event self-described.
//
// SINGLE_EVENT is an ordinary event page (one button). MULTI_EVENT is a
// listing/series page (one button per event). The multi-event titles are
// synthetic English strings on purpose: the UI test fonts (Liberation Sans)
// have no Hebrew glyphs, and the test exercises the multi-button LAYOUT, not
// any specific page's text.
"use strict";

const SINGLE_EVENT = {
  events: [
    {
      title: "NYC Tech Mixer 2026",
      start: "2026-06-25T18:00:00-04:00",
      end: "2026-06-25T21:00:00-04:00",
      location: "The Williamsburg Hotel Bar, 96 Wythe Ave, Brooklyn, NY",
      description: "Join us for the best networking event in NYC!",
      ctz: "America/New_York",
    },
  ],
};

const film = (title, start) => ({
  title,
  start,
  end: null,
  location: "Main Cinematheque, Hall 1",
  description: "A week celebrating international cinema.",
  ctz: "Asia/Jerusalem",
});

const MULTI_EVENT = {
  events: [
    film("Opening Night Gala", "2026-06-17T20:00:00"),
    film("Restored Classics Matinee", "2026-06-18T18:30:00"),
    film("New Directors Showcase", "2026-06-19T21:00:00"),
    film("Documentary Spotlight", "2026-06-20T14:30:00"),
    film("Animation Marathon", "2026-06-20T19:45:00"),
    film("Closing Ceremony & Awards", "2026-06-21T18:30:00"),
  ],
};

const TRUNCATED_EVENT = {
  events: [
    film("Opening Night Gala", "2026-06-17T20:00:00"),
    film("Restored Classics Matinee", "2026-06-18T18:30:00"),
    film("New Directors Showcase", "2026-06-19T21:00:00"),
    film("Documentary Spotlight", "2026-06-20T14:30:00"),
    film("Animation Marathon", "2026-06-20T19:45:00"),
    film("Closing Ceremony & Awards", "2026-06-21T18:30:00"),
    film("Retrospective Highlights", "2026-06-22T16:00:00"),
    film("Short Films Competition", "2026-06-22T20:00:00"),
    film("Director in Focus", "2026-06-23T19:00:00"),
  ],
};

module.exports = { SINGLE_EVENT, MULTI_EVENT, TRUNCATED_EVENT };
