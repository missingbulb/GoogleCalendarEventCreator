// Eight events — under maxEventsShown, so the whole list is shown, but taller
// than the viewport. Scrolled to the bottom, the list's last item is the plain
// "8 events showing" scroll cue: no "out of", no "show all" link (everything is
// already shown).
"use strict";

const { scrollToBottom } = require("../actions");

const pad = (n) => String(n).padStart(2, "0");

const events = Array.from({ length: 8 }, (_, i) => {
  const d = new Date(2026, 5, 25 + i, 19, 0, 0);
  return {
    title: `Rooftop Session #${i + 1}`,
    start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00:00`,
    location: "The Brooklyn Grange",
  };
});

module.exports = {
  description: "Eight events, scrolled to bottom: the plain 'N events showing' cue (no link)",
  data: { supported: true, events },
  listing: "none",
  action: scrollToBottom,
};
