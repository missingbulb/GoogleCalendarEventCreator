// Extractor-support leaf 11.1: meetup.com has a dedicated extractor
// (extension/event-extractors/custom/meetup.js), validated against the real cached page
// dev/requirements/extractor/data/server-fetched/meetup-nyc-tech-mixer.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  description: "meetup.com — extracted by custom/meetup.js",
  host: "meetup.com",
  source: "extension/event-extractors/custom/meetup.js",
  page: "meetup-nyc-tech-mixer",
};
