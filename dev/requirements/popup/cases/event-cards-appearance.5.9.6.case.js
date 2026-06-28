// A single showing carrying its OWN per-instance location: it surfaces on the
// single card's date/time line just like an event-level location.
"use strict";

module.exports = {
  description: "a lone showing's own per-instance venue shows on the single card's line",
  data: { supported: true, events: [
    { title: "Jazz Night", times: [
      { start: "2026-07-09T21:00:00", location: "Beit HaAmudim" },
    ] },
  ] },
  listing: "none",
};
