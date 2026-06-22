// Logic leaf 13.2 (tracked, untested in the executable runner): A multi-instance event folds showings that match on title, location, description, and timezone (differing only in time) into ONE event with several instances; distinct events that merely share a title stay separate.
// Currently covered by extension-test/events-popup/events-view.test.js. Marked tbd until a faithful executable
// validation is wired here (see dev/procedures/claude/testing.md on the kind:"logic" path).
"use strict";

module.exports = {
  tbd: true,
  description: "A multi-instance event folds showings that match on title, location, description, and timezone (differing only in time) into ONE event with several instances; distinct events that merely share a title stay separate.",
  coveredBy: "extension-test/events-popup/events-view.test.js",
};
