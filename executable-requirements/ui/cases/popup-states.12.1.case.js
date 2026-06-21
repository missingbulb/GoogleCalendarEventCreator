// Logic leaf 12.1 (tracked, untested in the executable runner): Supported host shows the dedicated extractor's events; when it finds none, the generic fallback is shown if it yields a complete event (with "Suggest Correction") and the empty state otherwise — the host stays classified supported throughout (icon green).
// Currently covered by test/unit/popup-content.test.js. Marked tbd until a faithful executable
// validation is wired here (see docs/claude/testing.md on the kind:"logic" path).
"use strict";

module.exports = {
  kind: "logic",
  tbd: true,
  description: "Supported host shows the dedicated extractor's events; when it finds none, the generic fallback is shown if it yields a complete event (with \"Suggest Correction\") and the empty state otherwise — the host stays classified supported throughout (icon green).",
  coveredBy: "test/unit/popup-content.test.js",
};
