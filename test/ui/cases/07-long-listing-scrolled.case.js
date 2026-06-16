// The same long listing as 06, scrolled all the way down: the bottom rows plus
// the count label — "31 out of 40 events showing" with a right-aligned "show all"
// link (the list is capped at maxEventsShown and can still expand to
// maxEventsExpanded). The count label only exists at the END of the list, so this
// scrolled view is the only way to snapshot it — the static gallery used to fake
// it by hand-placing a few cards next to the label.
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
  description: "Long listing, scrolled to bottom: 'N out of M events showing' + 'show all' link",
  data: { supported: true, events },
  listing: "none",
  action: scrollToBottom,
};
