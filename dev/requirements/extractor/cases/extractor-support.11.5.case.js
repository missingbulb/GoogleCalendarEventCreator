// Extractor-support leaf 11.5: ticketmaster.co.il has a dedicated extractor
// (ticketmaster.js), validated against the real cached page
// ticketmaster-ravid-plotnik.html by extractor-support.test.js — the
// page is recognized as supported and yields a complete event.
"use strict";

module.exports = {
  description: "ticketmaster.co.il — extracted by custom/ticketmaster.js",
  host: "ticketmaster.co.il",
  source: "extension/event-extractors/custom/ticketmaster.js",
  page: "ticketmaster-ravid-plotnik",
};
