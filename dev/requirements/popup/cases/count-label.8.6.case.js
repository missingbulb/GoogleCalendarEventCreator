// Per-leaf snapshot for requirement 8.6: past the expanded cap it reads "N out of M events shown" with no link.
// The filename (count-label.8.6) is the link; build-requirements-gallery.js embeds this
// image inline beneath 8.6 in dev/requirements/requirements.md.
//
// Shrunken per issue #439: tiny maxCardsShown/maxCardsExpanded caps + a short
// viewport reach the capped "shown" (no-link) state with a handful of events
// instead of 100 — the slowest render in the suite at the old size.
"use strict";

const { scrollToBottom } = require("../../shared/render/actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "past the expanded cap it reads \"N out of M events shown\" with no link",
  data: { supported: true, events: filler(6) },
  listing: "none",
  configurationOverrides: { maxCardsShown: 3, maxCardsExpanded: 4 },
  nonConfigurableUiSettingsOverrides: { viewportPx: 170 },
  // Expand the list (click \"show all\" \u2192 renderList(maxCardsExpanded), synchronous)
  // to reach the capped \"shown\" state, then pin to the bottom to see the label.
  action(doc) {
    const link = doc.querySelector(".show-all-link");
    if (link) link.dispatchEvent(new doc.defaultView.MouseEvent("click", { bubbles: true, cancelable: true }));
    scrollToBottom(doc);
  },
};
