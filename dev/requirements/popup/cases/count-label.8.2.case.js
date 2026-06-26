// Shrunken (#439): tiny cardsVisibleBeforeScroll + short viewport show the instances-vs-cards count (5 instances across 3 cards) without a long list.
"use strict";

const { scrollToBottom } = require("../../shared/render/actions");
const single = (n, day) => ({ title: `Community Meetup #${n}`, start: `2026-06-${day}T18:00:00`, end: `2026-06-${day}T20:00:00`, location: "Pioneer Works, Brooklyn" });
const screenings = (title, day, times) => ({ title, location: "Tel Aviv Cinematheque", times: times.map((t) => ({ start: `2026-06-${day}T${t}:00`, end: null })) });

module.exports = {
  description: "the label counts event instances, not cards",
  data: { supported: true, events: [
    single(1, "10"),
    screenings("Poetry in the Bookstores", "13", ["11:00", "14:00", "17:00"]),
    single(2, "11"),
  ] },
  listing: "none",
  configurationOverrides: { cardsVisibleBeforeScroll: 2 },
  nonConfigurableUiSettingsOverrides: { viewportPx: 170 },
  action: scrollToBottom,
};
