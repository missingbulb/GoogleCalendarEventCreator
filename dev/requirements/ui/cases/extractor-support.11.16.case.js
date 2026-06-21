// Extractor-support leaf 11.16: facebook.com has a dedicated extractor
// (extension/pipeline/sources/facebook.js). No cached live case — facebook.com is bot-blocked from the
// recorder/CI (see dev/procedures/technicalGotchas.md), so its extractor is covered by unit
// tests only. Marked `tbd` (untested here): no cached page validation.
"use strict";

module.exports = {
  kind: "extractor",
  tbd: true,
  description: "facebook.com — extracted by sources/facebook.js (unit-tested only; bot-blocked from caching)",
  host: "facebook.com",
  source: "extension/pipeline/sources/facebook.js",
};
