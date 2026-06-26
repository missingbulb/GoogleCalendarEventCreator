// Dated 2027 vs the reference now 2026-06-01 (reference-time.js) so it's a future
// year → green (upcoming) pill.
"use strict";

module.exports = {
  description: "a future year shows a green (upcoming) pill",
  data: { supported: true, events: [
    { title: "Next Year's Summit", start: "2027-03-12T09:00:00", location: "Pioneer Works" },
  ] },
  listing: "none",
};
