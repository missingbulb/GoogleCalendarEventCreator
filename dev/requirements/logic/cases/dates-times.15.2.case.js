// Logic leaf 15.2 (tracked, untested in the executable runner): A date with an explicit offset (or trailing `Z`) is an exact instant: the same moment regardless of the viewer's timezone.
// Currently covered by extraction.test.js. Marked tbd until a faithful executable
// validation is wired here (see testing.md on the kind:"logic" path).
"use strict";

module.exports = {
  tbd: true,
  description: "A date with an explicit offset (or trailing `Z`) is an exact instant: the same moment regardless of the viewer's timezone.",
  coveredBy: "extension-test/event-extractors/extraction.test.js",
};
