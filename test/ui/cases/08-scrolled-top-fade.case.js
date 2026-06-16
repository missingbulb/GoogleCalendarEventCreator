// Twelve events (all shown — under the maxEventsShown cap) scrolled all the way
// down: the bottom is reached so the bottom fade is gone, but the top edge fades
// out (more above). The list's last item is the plain "12 events showing" cue.
"use strict";

const { scrollToBottom } = require("../actions");

const pad = (n) => String(n).padStart(2, "0");

const events = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 5, 25 + i, 18, 0, 0);
  return {
    title: `Community Event #${i + 1}`,
    start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`,
    location: "Pioneer Works, Brooklyn",
  };
});

module.exports = {
  description: "Scrolled to the bottom: top edge fades out, no bottom fade",
  data: { supported: true, events },
  listing: "none",
  action: scrollToBottom,
};
