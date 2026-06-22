// Logic leaf 15.1 (tracked, untested in the executable runner): A timed date with NO timezone is a floating local time: the event shows the same wall-clock time the page displayed, wherever the viewer is.
// Currently covered by extension-test/unit/extraction.test.js. Marked tbd until a faithful executable
// validation is wired here (see dev/procedures/claude/testing.md on the kind:"logic" path).
"use strict";

module.exports = {
  kind: "logic",
  tbd: true,
  description: "A timed date with NO timezone is a floating local time: the event shows the same wall-clock time the page displayed, wherever the viewer is.",
  coveredBy: "extension-test/unit/extraction.test.js",
};
