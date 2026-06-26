// Extractor-support leaf 11.16: facebook.com has a dedicated extractor
// (facebook.js). No cached live case — facebook.com is bot-blocked from the
// recorder/CI (see technicalGotchas.md), so its extractor is covered by unit
// tests only. Marked `tbd` (untested here): no cached page validation.
"use strict";

module.exports = {
  tbd: true,
  description: "facebook.com — extracted by custom/facebook.js (unit-tested only; bot-blocked from caching)",
  host: "facebook.com",
  source: "extension/event-extractors/custom/facebook.js",
};
