// Extractor-support leaf 11.8: dash.datadoghq.com has a dedicated extractor
// (extension/event-extractors/custom/dash-datadoghq.js), validated against the real cached page
// dev/requirements/extractor/data/server-fetched/dash-datadoghq.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  description: "dash.datadoghq.com — extracted by custom/dash-datadoghq.js",
  host: "dash.datadoghq.com",
  source: "extension/event-extractors/custom/dash-datadoghq.js",
  page: "dash-datadoghq",
};
