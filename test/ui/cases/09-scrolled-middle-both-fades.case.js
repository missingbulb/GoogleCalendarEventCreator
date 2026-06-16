// A long listing scrolled to the middle: there's more list both above and below,
// so BOTH edges fade out. (40 events; the count label lives at the very end, so
// it isn't in view here.)
"use strict";

const { scrollToMiddle } = require("../actions");

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
  description: "Scrolled to the middle of a long list: both edges fade out",
  data: { supported: true, events },
  listing: "none",
  action: scrollToMiddle,
};
