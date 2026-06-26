// Logic leaf 15.1 (tracked, untested in the executable runner): A timed date with NO timezone is a floating local time: the event shows the same wall-clock time the page displayed, wherever the viewer is.
// Currently covered by extraction.test.js. Marked tbd until a faithful executable
// validation is wired here (see testing.md on the kind:"logic" path).
"use strict";

module.exports = {
  tbd: true,
  description: "A timed date with NO timezone is a floating local time: the event shows the same wall-clock time the page displayed, wherever the viewer is.",
  coveredBy: "extension-test/event-extractors/extraction.test.js",
};
