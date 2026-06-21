// Extractor-support leaf 11.12: secrettelaviv.com has a dedicated extractor
// (extension/pipeline/sources/secrettelaviv.js), validated against the real cached page
// executable-requirements/data/secrettelaviv-world-cup-eve.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "secrettelaviv.com — extracted by sources/secrettelaviv.js",
  host: "secrettelaviv.com",
  source: "extension/pipeline/sources/secrettelaviv.js",
  page: "secrettelaviv-world-cup-eve",
};
