// Shrunken (#439): short viewport leaves list above and below (both fades) with a handful of cards, not 16.
"use strict";

const { scrollToMiddle } = require("../../shared/render/actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "with list above and below, both edge fades show",
  data: { supported: true, events: filler(6) },
  listing: "none",
  nonConfigurableUiSettingsOverrides: { viewportPx: 170 },
  action: scrollToMiddle,
};
