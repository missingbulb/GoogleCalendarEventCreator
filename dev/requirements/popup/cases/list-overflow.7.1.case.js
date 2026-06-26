// Per-leaf snapshot for requirement 7.1: the height cap clips both ends, showing a peek of the cut cards.
// The filename (list-overflow.7.1) is the link; build-requirements-gallery.js embeds this
// image inline beneath 7.1 in requirements.md.
//
// Shrunken per issue #439: a short viewport makes a handful of cards overflow
// (clipped both ends) instead of 16 — same requirement, fewer pixels.
"use strict";

const { scrollToMiddle } = require("../../shared/render/actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "the height cap clips both ends, showing a peek of the cut cards",
  data: { supported: true, events: filler(6) },
  listing: "none",
  nonConfigurableUiSettingsOverrides: { viewportPx: 170 },
  action: scrollToMiddle,
};
