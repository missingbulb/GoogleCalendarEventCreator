// Per-leaf snapshot for requirement 8.7: the "show all" link's presence keys off the card cap, not the event count.
// The filename (count-label.8.7) is the link; build-requirements-gallery.js embeds this
// image inline beneath 8.7 in executable-requirements/Requirements.md.
//
// Shrunken per issue #439: a tiny maxCardsShown cap + short viewport shows the
// "show all" link off the card cap with a handful of events instead of 40.
"use strict";

const { scrollToBottom } = require("../../infrastructure/actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "the \"show all\" link's presence keys off the card cap, not the event count",
  data: { supported: true, events: filler(6) },
  listing: "none",
  configurationOverrides: { maxCardsShown: 3 },
  nonConfigurableUiSettingsOverrides: { viewportPx: 170 },
  action: scrollToBottom,
};
