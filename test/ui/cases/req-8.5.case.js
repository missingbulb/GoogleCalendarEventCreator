// Per-leaf snapshot for requirement 8.5: a shown prefix reads "N out of M events showing" with a "show all" link.
// The filename (req-8.5) is the link; build-requirements-gallery.js embeds this
// image inline beneath 8.5 in docs/uiRequirements.md.
//
// Shrunken per issue #439: a tiny maxCardsShown cap + short viewport reaches the
// "N out of M showing" + "show all" state with a handful of events instead of 40.
"use strict";

const { scrollToBottom } = require("../actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "a shown prefix reads \"N out of M events showing\" with a \"show all\" link",
  data: { supported: true, events: filler(6) },
  listing: "none",
  caps: { maxCardsShown: 3 },
  viewportPx: 170,
  action: scrollToBottom,
};
