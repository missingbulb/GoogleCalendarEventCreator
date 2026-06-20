// Per-leaf snapshot for requirement 8.4: every card shown but taller than fits reads "N events showing" with no link.
// The filename (req-8.4) is the link; build-requirements-gallery.js embeds this
// image inline beneath 8.4 in docs/uiRequirements.md.
"use strict";

const { scrollToBottom } = require("../actions");
const pad = (n) => String(n).padStart(2, "0");
const filler = (count) => Array.from({ length: count }, (_, i) => {
  const d = new Date(2026, 5, 1 + i);
  return { title: `Community Event #${i + 1}`, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00:00`, location: "Pioneer Works, Brooklyn" };
});

module.exports = {
  description: "every card shown but taller than fits reads \"N events showing\" with no link",
  data: { supported: true, events: filler(10) },
  listing: "none",
  action: scrollToBottom,
};
