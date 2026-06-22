// Extractor-support leaf 11.11: lu.ma has a dedicated extractor
// (extension/event-extractors/custom/luma.js), validated against the real cached page
// dev/requirements/data/luma-event.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "lu.ma — extracted by custom/luma.js",
  host: "lu.ma",
  source: "extension/event-extractors/custom/luma.js",
  page: "luma-event",
};
