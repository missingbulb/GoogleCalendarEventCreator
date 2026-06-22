// Extractor-support leaf 11.12: secrettelaviv.com has a dedicated extractor
// (extension/event-extractors/custom/secrettelaviv.js), validated against the real cached page
// dev/requirements/extractor/data/secrettelaviv-world-cup-eve.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  description: "secrettelaviv.com — extracted by custom/secrettelaviv.js",
  host: "secrettelaviv.com",
  source: "extension/event-extractors/custom/secrettelaviv.js",
  page: "secrettelaviv-world-cup-eve",
};
