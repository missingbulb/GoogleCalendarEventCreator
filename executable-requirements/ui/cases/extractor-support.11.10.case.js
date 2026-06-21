// Extractor-support leaf 11.10: events.datadoghq.com has a dedicated extractor
// (extension/pipeline/sources/events-datadoghq.js), validated against the real cached page
// executable-requirements/data/events-datadoghq.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "events.datadoghq.com — extracted by sources/events-datadoghq.js",
  host: "events.datadoghq.com",
  source: "extension/pipeline/sources/events-datadoghq.js",
  page: "events-datadoghq",
};
