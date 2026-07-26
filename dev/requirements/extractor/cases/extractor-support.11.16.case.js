// facebook.com is bot-blocked from the recorder/CI (see the gcec pack’s RULES.md), so
// there's no cached page — its extraction is covered by unit tests only (tbd).
"use strict";

module.exports = {
  tbd: true,
  description:
    "facebook.com — fully covered by the core generic extractor, with no per-site file; " +
    "unit-tested only, bot-blocked from caching",
  host: "facebook.com",
  source: "extension/event-extractors/generic-extractor.js",
};
