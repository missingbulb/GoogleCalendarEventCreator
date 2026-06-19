// A long list scrolled to the middle: there's more list both above and below, so
// the height cap clips both ends and BOTH edge fades show (7.3) over a peek of the
// partially-cut cards at each boundary (7.1). The count label lives at the very
// end of the list, so it isn't in view here. Sixteen identical single cards —
// filler whose only job is to overflow far enough that a middle window has content
// either way; they earn their place collectively, not individually.
"use strict";

const { scrollToMiddle } = require("../actions");

const pad = (n) => String(n).padStart(2, "0");

const events = Array.from({ length: 16 }, (_, i) => {
  const day = pad(5 + i);
  return {
    title: `Community Event #${i + 1}`,
    start: `2026-06-${day}T18:00:00`,
    location: "Pioneer Works, Brooklyn",
  };
});

module.exports = {
  description: "A long list scrolled to its middle: the height cap clips both ends, so both edge fades show over a peek of the cut cards",
  requirements: ["7.1", "7.3"],
  data: { supported: true, events },
  listing: "none",
  action: scrollToMiddle,
};
