// Extractor-support leaf 11.6: bandsintown.com has a dedicated extractor
// (extension/pipeline/sources/bandsintown.js), validated against the real cached page
// dev/requirements/data/bandsintown-berry-sakharof.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "bandsintown.com — extracted by sources/bandsintown.js",
  host: "bandsintown.com",
  source: "extension/pipeline/sources/bandsintown.js",
  page: "bandsintown-berry-sakharof",
};
