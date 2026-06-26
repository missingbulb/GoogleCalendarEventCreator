"use strict";

module.exports = {
  description: "a month with 2+ showings is an unclickable card: a header over per-showing buttons",
  data: { supported: true, events: [
    { title: "Film Week", location: "The Cinematheque", times: [
      { start: "2026-08-04T20:00:00" }, { start: "2026-08-12T20:00:00" },
    ] },
  ] },
  listing: "none",
};
