"use strict";

module.exports = {
  description: "a month card mixing an all-day and a timed showing shows each as a time chip so they differ",
  data: { supported: true, events: [
    { title: "Festival Days", location: "Town Square", times: [
      { start: "2026-09-12" }, { start: "2026-09-19T18:30:00" },
    ] },
  ] },
  listing: "none",
};
