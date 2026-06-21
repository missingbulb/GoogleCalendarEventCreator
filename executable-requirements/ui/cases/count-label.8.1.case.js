// Per-leaf snapshot for requirement 8.1: the count label is the list's last item, in view at the bottom.
// The filename (count-label.8.1) is the link; build-requirements-gallery.js embeds this
// image inline beneath 8.1 in executable-requirements/Requirements.md.
//
// Shrunken per issue #439: a tiny cardsVisibleBeforeScroll + short viewport puts
// the count label at the bottom of an overflowing list with a few events not 12.
"use strict";

const { scrollToBottom } = require("../../infrastructure/actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "the count label is the list's last item, in view at the bottom",
  data: { supported: true, events: filler(4) },
  listing: "none",
  configurationOverrides: { cardsVisibleBeforeScroll: 2 },
  nonConfigurableUiSettingsOverrides: { viewportPx: 170 },
  action: scrollToBottom,
};
