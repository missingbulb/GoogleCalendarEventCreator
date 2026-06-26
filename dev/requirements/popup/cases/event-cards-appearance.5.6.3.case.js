// Dated 2026-06-19 vs the reference now 2026-06-01 (reference-time.js) so it's
// upcoming this year → no corner pill.
"use strict";

module.exports = {
  description: "a current, upcoming date (this year, not yet past) shows no pill",
  data: { supported: true, events: [{ title: "Neighborhood Mixer", start: "2026-06-19T19:00:00", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
