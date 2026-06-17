// The bottom edge fade. Eight single events overflow the height-capped list, and
// at rest at the top of scroll the LAST visible card dissolves into a bottom fade
// — the cue that there's more below. Only the bottom fade shows (we're at the
// top; the top edge fade is case 07). Eight is just enough to overflow; the events
// are uniform because they only need to fill past the cap.
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
  description:
    "Overflowing list at rest at the top: the bottom edge fades out to cue there's more below",
  data: { supported: true, events },
  listing: "none",
  action: restAtTop,
};
