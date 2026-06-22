// Logic leaf 13.1 (tracked, untested in the executable runner): One card per distinct event on the page: an ordinary event page yields one; a listing or series page (a film week, a festival) yields one card per event.
// Currently covered by extension-test/events-popup/events-view.test.js. Marked tbd until a faithful executable
// validation is wired here (see dev/procedures/claude/testing.md on the kind:"logic" path).
"use strict";

module.exports = {
  kind: "logic",
  tbd: true,
  description: "One card per distinct event on the page: an ordinary event page yields one; a listing or series page (a film week, a festival) yields one card per event.",
  coveredBy: "extension-test/events-popup/events-view.test.js",
};
