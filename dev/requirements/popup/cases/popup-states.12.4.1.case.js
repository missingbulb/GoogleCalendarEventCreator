// Per-leaf snapshot for requirement 12.4.1: a SUPPORTED host whose dedicated
// extractor returned the events shows them WITHOUT the "Suggest Correction" label
// (chooseContent State 1 — data.supported true, no data.fallback). The snapshot
// pins the ABSENCE of the heading-line link: the dedicated source did its job.
"use strict";

module.exports = {
  description: "supported host, dedicated extractor returned events — no \"Suggest Correction\" label",
  data: { supported: true, events: [{ title: "Neighborhood Mixer", start: "2026-06-19T19:00:00", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
