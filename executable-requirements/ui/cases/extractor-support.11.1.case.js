// Extractor-support leaf 11.1: meetup.com has a dedicated extractor
// (extension/pipeline/sources/meetup.js), validated against the real cached page
// executable-requirements/data/meetup-nyc-tech-mixer.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  kind: "extractor",
  description: "meetup.com — extracted by sources/meetup.js",
  host: "meetup.com",
  source: "extension/pipeline/sources/meetup.js",
  page: "meetup-nyc-tech-mixer",
};
