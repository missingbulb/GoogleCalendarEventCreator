// chooseContent State 1b: `data.fallback: true` is the flag the orchestrator sets
// when it falls back to the generic extractor, so the case sets it directly —
// events shown WITH the "Suggest Correction" label.
"use strict";

module.exports = {
  description: "supported host, dedicated extractor empty but fallback found events — shows \"Suggest Correction\"",
  data: { supported: true, fallback: true, events: [{ title: "Neighborhood Mixer", start: "2026-06-19T19:00:00", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
