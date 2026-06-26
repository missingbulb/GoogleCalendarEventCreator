// chooseContent State 1: data.supported true, no data.fallback — a dedicated
// extractor's events, shown WITHOUT the "Suggest Correction" label.
"use strict";

module.exports = {
  description: "supported host, dedicated extractor returned events — no \"Suggest Correction\" label",
  data: { supported: true, events: [{ title: "Neighborhood Mixer", start: "2026-06-19T19:00:00", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
