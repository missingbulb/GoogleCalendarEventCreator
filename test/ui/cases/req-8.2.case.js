// Per-leaf snapshot for requirement 8.2: the label counts event instances, not cards.
// The filename (req-8.2) is the link; build-requirements-gallery.js embeds this
// image inline beneath 8.2 in docs/uiRequirements.md.
//
// Shrunken per issue #439: a tiny cardsVisibleBeforeScroll + short viewport shows
// the instances-vs-cards count (5 instances across 3 cards) without a long list.
"use strict";

const { scrollToBottom } = require("../actions");
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
  caps: { cardsVisibleBeforeScroll: 2 },
  viewportPx: 170,
  action: scrollToBottom,
};
