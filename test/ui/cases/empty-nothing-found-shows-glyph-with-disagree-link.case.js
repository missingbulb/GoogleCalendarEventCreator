// State 3: not denylisted, and the generic fallback found nothing complete. The
// heading reads "No events found on this page" (1.3) and the event area shows the
// muted calendar glyph (2.1) with a small, understated "Disagree?" link beneath
// it (2.2, 3.2, 3.3). (That the link opens the policy doc in a new tab and closes
// the popup — 3.4 — is a behavior verified in
// test/unit/events-view-actions.test.js, not by this image.)
"use strict";

module.exports = {
  description:
    "Nothing found (non-denylisted): the 'No events found' heading over the calendar glyph, with a quiet 'Disagree?' policy link beneath it",
  requirements: {
    "1.3": "nothing shown, so the heading reads \"No events found on this page\"",
    "2.1": "the event area shows the single muted calendar glyph",
    "2.2": "the \"Disagree?\" link sits beneath the glyph",
    "3.2": "the \"Disagree?\" link is shown (state 3 opens the policy doc)",
    "3.3": "the link uses the small, understated accent-blue treatment",
  },
  data: { supported: false, events: [] },
  listing: "none",
};
