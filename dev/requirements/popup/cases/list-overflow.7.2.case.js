// Per-leaf snapshot for requirement 7.2: only a prefix of many cards renders at first (the card cap).
// The filename (list-overflow.7.2) is the link; build-requirements-gallery.js embeds this
// image inline beneath 7.2 in dev/requirements/requirements.md.
//
// Shrunken per issue #439: a tiny maxCardsShown cap + short viewport exercises
// the card cap with a handful of events instead of 40 — same requirement, far
// fewer pixels and render time.
"use strict";

const { restAtTop } = require("../../shared/render/actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "only a prefix of many cards renders at first (the card cap)",
  data: { supported: true, events: filler(6) },
  listing: "none",
  configurationOverrides: { maxCardsShown: 3 },
  nonConfigurableUiSettingsOverrides: { viewportPx: 170 },
  action: restAtTop,
};
