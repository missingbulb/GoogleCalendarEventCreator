// State 4 — a complete fallback event on an allowlisted host: show it, with no
// support ask (the fallback is trusted here).
"use strict";

module.exports = {
  description: "Allowlisted: show the event (no support request)",
  data: {
    supported: false,
    events: [
      { title: "Late Night Jazz", start: "2026-07-01T20:00:00", location: "Blue Door Hall, Berlin" },
    ],
  },
  listing: "allow",
};
