// A short listing that fits the height cap: three events, no scrolling, so
// neither edge fade shows. The resting state that contrasts with the overflowing
// cases below (07–10).
"use strict";

const pad = (n) => String(n).padStart(2, "0");

const events = Array.from({ length: 3 }, (_, i) => {
  const d = new Date(2026, 5, 25 + i, 18, 0, 0);
  return {
    title: `Community Event #${i + 1}`,
    start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`,
    location: "Pioneer Works, Brooklyn",
  };
});

module.exports = {
  description: "Short listing that fits: no scroll, no edge fades",
  data: { supported: true, events },
  listing: "none",
};
