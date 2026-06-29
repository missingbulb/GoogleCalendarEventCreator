// Showings at DIFFERENT venues: the venue rides inside each calendar chip (to the
// right of the date), the header keeps the shared time but no location.
"use strict";

module.exports = {
  description: "different venues, shared time — each chip carries its own venue beside the date; header keeps the shared time only",
  data: { supported: true, events: [
    { title: "Blumental Quartet — On Tour", times: [
      { start: "2026-07-04T19:00:00", location: "Felicja Blumental Center, Tel Aviv" },
      { start: "2026-07-11T19:00:00", location: "Jerusalem Theatre" },
      { start: "2026-07-18T19:00:00", location: "Haifa Auditorium" },
    ] },
  ] },
  listing: "none",
};
