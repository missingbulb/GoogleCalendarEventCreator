// Different venues AND different times: each chip becomes a time chip carrying its
// own venue; the header is title-only (no shared time, no shared location).
"use strict";

module.exports = {
  description: "different venues and different times — time chips, each with its own venue; title-only header",
  data: { supported: true, events: [
    { title: "Indie Film Festival", times: [
      { start: "2026-07-05T18:00:00", location: "Cinematheque Hall 1" },
      { start: "2026-07-14T20:30:00", location: "Rooftop Cinema, Dizengoff" },
      { start: "2026-07-25T21:00:00", location: "Park Open-Air Screen" },
    ] },
  ] },
  listing: "none",
};
