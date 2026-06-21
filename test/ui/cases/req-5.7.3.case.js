// Per-leaf snapshot for requirement 5.7.3: an all-day month card shows a location-only header with day chips.
// The filename (req-5.7.3) is the link; build-requirements-gallery.js embeds this
// image inline beneath 5.7.3 in docs/uiRequirements.md.
"use strict";

module.exports = {
  description: "an all-day month card shows a location-only header with day chips",
  data: { supported: true, events: [
    { title: "Open Studios Month", location: "Hamiffal", times: [
      { start: "2026-08-05" }, { start: "2026-08-14" }, { start: "2026-08-25" },
    ] },
  ] },
  listing: "none",
};
