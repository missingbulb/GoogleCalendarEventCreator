// Logic leaf 15.3 (tracked, untested in the executable runner): A site known to run in a fixed place pins the event to that city's timezone, so the time reads as that city shows it for every viewer.
// Currently covered by test/unit/extraction.test.js. Marked tbd until a faithful executable
// validation is wired here (see docs/claude/testing.md on the kind:"logic" path).
"use strict";

module.exports = {
  kind: "logic",
  tbd: true,
  description: "A site known to run in a fixed place pins the event to that city's timezone, so the time reads as that city shows it for every viewer.",
  coveredBy: "test/unit/extraction.test.js",
};
