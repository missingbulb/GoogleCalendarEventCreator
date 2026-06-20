// Per-leaf snapshot for requirement 7.1: the height cap clips both ends, showing a peek of the cut cards.
// The filename (req-7.1) is the link; build-requirements-gallery.js embeds this
// image inline beneath 7.1 in docs/uiRequirements.md.
"use strict";

const { scrollToMiddle } = require("../actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "the height cap clips both ends, showing a peek of the cut cards",
  data: { supported: true, events: filler(16) },
  listing: "none",
  action: scrollToMiddle,
};
