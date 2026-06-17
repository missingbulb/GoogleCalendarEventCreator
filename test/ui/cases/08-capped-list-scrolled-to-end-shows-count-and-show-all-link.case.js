// The bottom count label and its "show all" affordance. The list is capped at
// maxCardsShown CARDS (31), so with 40 single events it shows 31 and the list's
// LAST item reads "31 out of 40 events showing" with a "show all" link (the list
// can still grow, below the maxCardsExpanded cap). Scrolled to the end so that
// label is in view; at the end there's no bottom fade, but the TOP edge fades out
// (more above — case 08 is the bottom edge). The events are uniform on purpose:
// they exist only to overflow the cap, so none needs to differ.
"use strict";

const { scrollToBottom } = require("../actions");

const pad = (n) => String(n).padStart(2, "0");
const events = Array.from({ length: 40 }, (_, i) => {
  const d = new Date(2026, 5, 25 + i, 18, 0, 0);
  return {
    title: `Community Event #${i + 1}`,
    start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`,
    location: "Pioneer Works, Brooklyn",
  };
});

module.exports = {
  description:
    "Capped list scrolled to the end: the 'N out of M events showing' count, a 'show all' link, and the top edge fade",
  data: { supported: true, events },
  listing: "none",
  action: scrollToBottom,
};
