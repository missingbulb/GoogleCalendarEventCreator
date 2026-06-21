// Extractor-support leaf 11.7: barby.co.il has a dedicated extractor
// (extension/pipeline/sources/barby.js), validated against the real cached page
// executable-requirements/data/barby.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "barby.co.il — extracted by sources/barby.js",
  host: "barby.co.il",
  source: "extension/pipeline/sources/barby.js",
  page: "barby",
};
