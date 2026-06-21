// Per-leaf snapshot for requirement 6.1.1: a round hour drops its minutes ("10 AM").
// The filename (date-time-display.6.1.1) is the link; build-requirements-gallery.js embeds this
// image inline beneath 6.1.1 in executable-requirements/requirements.md.
"use strict";

module.exports = {
  description: "a round hour drops its minutes (\"10 AM\")",
  data: { supported: true, events: [{ title: "Morning Briefing", start: "2026-06-19T10:00:00", location: "Central Library" }] },
  listing: "none",
};
