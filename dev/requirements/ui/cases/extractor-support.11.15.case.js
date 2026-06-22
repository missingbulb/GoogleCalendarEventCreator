// Extractor-support leaf 11.15: visit.tel-aviv.gov.il has a dedicated extractor
// (extension/event-extractors/custom/visit-tel-aviv.js), validated against the real cached page
// dev/requirements/data/visit-tel-aviv.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "visit.tel-aviv.gov.il — extracted by custom/visit-tel-aviv.js",
  host: "visit.tel-aviv.gov.il",
  source: "extension/event-extractors/custom/visit-tel-aviv.js",
  page: "visit-tel-aviv",
};
