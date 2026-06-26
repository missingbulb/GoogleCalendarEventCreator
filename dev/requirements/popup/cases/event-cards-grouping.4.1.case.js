"use strict";

module.exports = {
  description: "one card per distinct event on the page",
  data: { supported: true, events: [
    { title: "Morning Run Club", start: "2026-06-12T08:00:00", location: "Prospect Park" },
    { title: "Afternoon Talk", start: "2026-06-15T15:00:00", location: "Central Library" },
    { title: "Evening Mixer", start: "2026-06-19T19:00:00", location: "The Annex, Brooklyn" },
  ] },
  listing: "none",
};
