// State 2: a denylisted host. The heading reads "No events found on this page"
// (1.3) and the event area shows the calendar glyph (2.1) ALONE — no link beneath
// it (2.3), because the decision not to extract here is deliberate. This is the
// same glyph-only empty state an event-less supported host shows, so the two need
// only one snapshot between them.
"use strict";

module.exports = {
  description:
    "Denylisted host (or a supported host that found nothing): the 'No events found' heading over the calendar glyph alone — no policy link",
  requirements: ["1.3", "2.1", "2.3"],
  data: { supported: false, events: [] },
  listing: "deny",
};
