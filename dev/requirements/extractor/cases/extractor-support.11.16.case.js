// facebook.com is bot-blocked from the recorder/CI (see the extractor-pipeline pack’s RULES.md), so
// there's no cached page — its extractor is covered by unit tests only (tbd).
"use strict";

module.exports = {
  tbd: true,
  description: "facebook.com — extracted by custom/facebook.js (unit-tested only; bot-blocked from caching)",
  host: "facebook.com",
  source: "extension/event-extractors/custom/facebook.js",
};
