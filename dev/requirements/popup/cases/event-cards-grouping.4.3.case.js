// Per-leaf snapshot for requirement 4.3: instances are never merged: a consecutive run is one button per day.
// The filename (event-cards-grouping.4.3) is the link; build-requirements-gallery.js embeds this
// image inline beneath 4.3 in dev/requirements/requirements.md.
"use strict";

module.exports = {
  description: "instances are never merged: a consecutive run is one button per day",
  data: { supported: true, events: [
    { title: "Conversation Club", location: "Beit Ariela", times: [
      { start: "2026-06-05T19:00:00" }, { start: "2026-06-06T19:00:00" }, { start: "2026-06-07T19:00:00" },
    ] },
  ] },
  listing: "none",
};
