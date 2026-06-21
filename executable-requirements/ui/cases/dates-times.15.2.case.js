// Logic leaf 15.2 (tracked, untested in the executable runner): A date with an explicit offset (or trailing `Z`) is an exact instant: the same moment regardless of the viewer's timezone.
// Currently covered by test/unit/extraction.test.js. Marked tbd until a faithful executable
// validation is wired here (see docs/claude/testing.md on the kind:"logic" path).
"use strict";

module.exports = {
  kind: "logic",
  tbd: true,
  description: "A date with an explicit offset (or trailing `Z`) is an exact instant: the same moment regardless of the viewer's timezone.",
  coveredBy: "test/unit/extraction.test.js",
};
