// Per-leaf snapshot for requirement 7.3: with list above and below, both edge fades show.
// The filename (req-7.3) is the link; build-requirements-gallery.js embeds this
// image inline beneath 7.3 in docs/uiRequirements.md.
//
// Shrunken per issue #439: a short viewport leaves list above and below (both
// fades) with a handful of cards instead of 16.
"use strict";

const { scrollToMiddle } = require("../actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "with list above and below, both edge fades show",
  data: { supported: true, events: filler(6) },
  listing: "none",
  viewportPx: 170,
  action: scrollToMiddle,
};
