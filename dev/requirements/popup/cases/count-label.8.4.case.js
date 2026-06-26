// Shrunken (#439): tiny cardsVisibleBeforeScroll + short viewport give the "all shown but taller than fits" cue with a few events, not 10.
"use strict";

const { scrollToBottom } = require("../../shared/render/actions");
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
