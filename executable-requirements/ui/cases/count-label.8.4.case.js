// Per-leaf snapshot for requirement 8.4: every card shown but taller than fits reads "N events showing" with no link.
// The filename (count-label.8.4) is the link; build-requirements-gallery.js embeds this
// image inline beneath 8.4 in executable-requirements/requirements.md.
//
// Shrunken per issue #439: a tiny cardsVisibleBeforeScroll + short viewport gives
// the "all shown but taller than fits" cue with a few events instead of 10.
"use strict";

const { scrollToBottom } = require("../../infra/actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "every card shown but taller than fits reads \"N events showing\" with no link",
  data: { supported: true, events: filler(5) },
  listing: "none",
  configurationOverrides: { cardsVisibleBeforeScroll: 2 },
  nonConfigurableUiSettingsOverrides: { viewportPx: 170 },
  action: scrollToBottom,
};
