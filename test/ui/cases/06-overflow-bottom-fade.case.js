// An overflowing listing at rest at the top of scroll: eight events spill past
// the height cap, so the LAST visible card fades out at the bottom edge — the cue
// that there's more below. Only the bottom fade shows (we're at the top).
"use strict";

const { restAtTop } = require("../actions");

const pad = (n) => String(n).padStart(2, "0");

const events = Array.from({ length: 8 }, (_, i) => {
  const d = new Date(2026, 5, 25 + i, 18, 0, 0);
  return {
    title: `Community Event #${i + 1}`,
    start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`,
    location: "Pioneer Works, Brooklyn",
  };
});

module.exports = {
  description: "Overflowing list, top of scroll: bottom edge fades out (more below)",
  data: { supported: true, events },
  listing: "none",
  action: restAtTop,
};
