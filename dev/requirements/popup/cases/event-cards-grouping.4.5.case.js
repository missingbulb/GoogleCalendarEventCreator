"use strict";

module.exports = {
  description: "a day with two showings keeps a button per showing, not peeled off",
  data: { supported: true, events: [
    { title: "Comedy Series", location: "The Stand", times: [
      { start: "2026-06-11T18:00:00" }, { start: "2026-06-11T21:00:00" }, { start: "2026-06-12T18:00:00" },
    ] },
  ] },
  listing: "none",
};
