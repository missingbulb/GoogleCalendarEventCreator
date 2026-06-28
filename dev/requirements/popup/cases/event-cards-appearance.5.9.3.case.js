// Two showings on the SAME day at different venues: time chips (the date is shared)
// each carrying their own venue.
"use strict";

module.exports = {
  description: "same day, two venues — time chips, each carrying its own venue",
  data: { supported: true, events: [
    { title: "Swan Lake", times: [
      { start: "2026-07-12T14:00:00", location: "Opera House — Main Stage" },
      { start: "2026-07-12T20:00:00", location: "Opera House — Studio Hall" },
    ] },
  ] },
  listing: "none",
};
