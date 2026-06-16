// A long listing at rest (top of scroll): the height-capped list shows the first
// rows plus a peek of the next, and the bottom count label sits below the fold —
// the realistic resting view when a supported page yields more events than fit.
// (Contrast 07, the same list scrolled to the bottom.)
"use strict";

const pad = (n) => String(n).padStart(2, "0");

// 40 events, one per day from Jun 25 2026 at 18:00 (floating local time, so the
// snapshot is timezone-independent).
const events = Array.from({ length: 40 }, (_, i) => {
  const d = new Date(2026, 5, 25 + i, 18, 0, 0);
  return {
    title: `Community Event #${i + 1}`,
    start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`,
    location: "Pioneer Works, Brooklyn",
  };
});

module.exports = {
  description: "Long listing, top of scroll: capped list, count label below the fold",
  data: { supported: true, events },
  listing: "none",
};
