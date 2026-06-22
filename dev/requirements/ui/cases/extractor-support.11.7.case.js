// Extractor-support leaf 11.7: barby.co.il has a dedicated extractor
// (extension/event-extractors/custom/barby.js), validated against the real cached page
// dev/requirements/data/barby.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "barby.co.il — extracted by custom/barby.js",
  host: "barby.co.il",
  source: "extension/event-extractors/custom/barby.js",
  page: "barby",
};
