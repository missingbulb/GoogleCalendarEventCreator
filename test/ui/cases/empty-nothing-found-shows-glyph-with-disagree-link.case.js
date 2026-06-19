// State 3: not denylisted, and the generic fallback found nothing complete. The
// heading reads "No events found on this page" (1.3) and the event area shows the
// muted calendar glyph (2.1) with a small, understated "Disagree?" link beneath
// it (2.2, 3.2, 3.3) that opens the public policy doc in a new tab (3.4 —
// behavior).
"use strict";

module.exports = {
  description:
    "Nothing found (non-denylisted): the 'No events found' heading over the calendar glyph, with a quiet 'Disagree?' policy link beneath it",
  requirements: ["1.3", "2.1", "2.2", "3.2", "3.3", "3.4"],
  data: { supported: false, events: [] },
  listing: "none",
};
