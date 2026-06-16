// A long, capped listing scrolled all the way down: 40 events, of which the first
// maxEventsShown are listed, so the end carries "31 out of 40 events showing" with
// a "show all" link. At the bottom there's no bottom fade, but the top edge fades
// out (more above).
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
  description: "Long capped list scrolled to the bottom: 'N out of M' + top fade only",
  data: { supported: true, events },
  listing: "none",
  action: scrollToBottom,
};
