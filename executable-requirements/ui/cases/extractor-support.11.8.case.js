// Extractor-support leaf 11.8: dash.datadoghq.com has a dedicated extractor
// (extension/pipeline/sources/dash-datadoghq.js), validated against the real cached page
// executable-requirements/data/dash-datadoghq.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "dash.datadoghq.com — extracted by sources/dash-datadoghq.js",
  host: "dash.datadoghq.com",
  source: "extension/pipeline/sources/dash-datadoghq.js",
  page: "dash-datadoghq",
};
