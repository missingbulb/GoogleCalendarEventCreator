// Extractor-support leaf 11.3: edfringe.com has a dedicated extractor
// (extension/pipeline/sources/edinburghfringe.js), validated against the real cached page
// executable-requirements/data/edinburghfringe-daniel-sloss.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "edfringe.com — extracted by sources/edinburghfringe.js",
  host: "edfringe.com",
  source: "extension/pipeline/sources/edinburghfringe.js",
  page: "edinburghfringe-daniel-sloss",
};
