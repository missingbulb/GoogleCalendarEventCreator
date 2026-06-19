// More cards than the first-render cap (maxCardsShown): only a prefix lists, so
// the end reads "N out of M events showing" with a "show all" link (8.5) that
// expands the list to the maxCardsExpanded cap (7.2). The link's presence keys off
// the CARD cap, not the event count (8.7); past the expanded cap it would read
// "shown" with no link (8.6 — reached only by clicking "show all", so it's the
// behavior this scenario carries). Forty single cards; scrolled to the bottom so
// the label (the list's last item, 8.1) and the top fade (7.3) are in view.
"use strict";

const { scrollToBottom } = require("../actions");

const pad = (n) => String(n).padStart(2, "0");

const events = Array.from({ length: 40 }, (_, i) => {
  const d = new Date(2026, 5, 1 + i); // June 1 onward, rolling into the next months
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return {
    title: `Community Event #${i + 1}`,
    start: `${date}T18:00:00`,
    location: "Pioneer Works, Brooklyn",
  };
});

module.exports = {
  description:
    "Forty cards exceed the first-render cap; scrolled to the bottom the end reads 'N out of M events showing' with a 'show all' link, over a faded top edge",
  requirements: {
    "7.2": "only a prefix of the 40 cards renders at first (the card cap)",
    "7.3": "scrolled to the bottom, the top edge fades",
    "8.1": "the count label is the list's last item, in view at the bottom",
    "8.5": "the prefix reads \"N out of M events showing\" with a \"show all\" link",
    "8.6": "past the expanded cap it would read \"shown\" with no link (behavior)",
    "8.7": "the \"show all\" link keys off the card cap, not the event count",
  },
  data: { supported: true, events },
  listing: "none",
  action: scrollToBottom,
};
