// Per-leaf snapshot for requirement 12.4.2: a SUPPORTED host whose dedicated
// extractor found nothing but the generic fallback did shows the events WITH the
// "Suggest Correction" label (chooseContent State 1b). `data.fallback: true` is
// the existing flag the orchestrator sets when it falls back to the generic
// extractor — the "from the fallback" signal — so the case sets it directly.
"use strict";

module.exports = {
  description: "supported host, dedicated extractor empty but fallback found events — shows \"Suggest Correction\"",
  data: { supported: true, fallback: true, events: [{ title: "Neighborhood Mixer", start: "2026-06-19T19:00:00", location: "The Annex, Brooklyn" }] },
  listing: "none",
};
