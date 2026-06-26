// Shrunken (#439): tiny maxCardsShown cap + short viewport reach the "N out of M showing" + "show all" state with a handful of events, not 40.
"use strict";

const { scrollToBottom } = require("../../shared/render/actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "a shown prefix reads \"N out of M events showing\" with a \"show all\" link",
  data: { supported: true, events: filler(6) },
  listing: "none",
  configurationOverrides: { maxCardsShown: 3 },
  nonConfigurableUiSettingsOverrides: { viewportPx: 170 },
  action: scrollToBottom,
};
