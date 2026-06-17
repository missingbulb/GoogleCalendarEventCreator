// State 3 — not denylisted, and the fallback found nothing complete: the empty
// state's muted, CSS-drawn calendar glyph plus the quiet right-aligned "Disagree?"
// link to the policy doc. No events, so this is purely the empty-state-with-link
// picture. (Contrast case 04, whose glyph stands alone with no link.)
"use strict";

module.exports = {
  description: "No events found: the empty calendar glyph and a 'Disagree?' policy link",
  data: { supported: false, events: [] },
  listing: "none",
};
