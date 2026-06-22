// Extractor-support leaf 11.2: eventbrite.com has a dedicated extractor
// (extension/event-extractors/custom/eventbrite.js), validated against the real cached page
// dev/requirements/data/eventbrite-games-for-change.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "eventbrite.com — extracted by custom/eventbrite.js",
  host: "eventbrite.com",
  source: "extension/event-extractors/custom/eventbrite.js",
  page: "eventbrite-games-for-change",
};
