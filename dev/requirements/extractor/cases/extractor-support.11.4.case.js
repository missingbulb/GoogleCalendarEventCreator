// Extractor-support leaf 11.4: cinema.co.il has a dedicated extractor
// (extension/event-extractors/custom/telavivcinematheque.js), validated against the real cached page
// dev/requirements/extractor/data/telavivcinematheque-sentimental-value.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  description: "cinema.co.il — extracted by custom/telavivcinematheque.js",
  host: "cinema.co.il",
  source: "extension/event-extractors/custom/telavivcinematheque.js",
  page: "telavivcinematheque-sentimental-value",
};
