// Extractor-support leaf 11.4: cinema.co.il has a dedicated extractor
// (extension/pipeline/sources/telavivcinematheque.js), validated against the real cached page
// executable-requirements/data/telavivcinematheque-sentimental-value.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "cinema.co.il — extracted by sources/telavivcinematheque.js",
  host: "cinema.co.il",
  source: "extension/pipeline/sources/telavivcinematheque.js",
  page: "telavivcinematheque-sentimental-value",
};
