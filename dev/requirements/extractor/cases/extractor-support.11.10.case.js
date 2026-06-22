// Extractor-support leaf 11.10: events.datadoghq.com has a dedicated extractor
// (extension/event-extractors/custom/events-datadoghq.js), validated against the real cached page
// dev/requirements/extractor/data/events-datadoghq.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  description: "events.datadoghq.com — extracted by custom/events-datadoghq.js",
  host: "events.datadoghq.com",
  source: "extension/event-extractors/custom/events-datadoghq.js",
  page: "events-datadoghq",
};
