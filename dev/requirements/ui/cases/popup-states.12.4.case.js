// Logic leaf 12.4 (tracked, untested in the executable runner): Allowlisted host with an event shows the event and does NOT ask for support (the generic result is already trusted there).
// Currently covered by extension-test/unit/popup-content.test.js. Marked tbd until a faithful executable
// validation is wired here (see dev/procedures/claude/testing.md on the kind:"logic" path).
"use strict";

module.exports = {
  kind: "logic",
  tbd: true,
  description: "Allowlisted host with an event shows the event and does NOT ask for support (the generic result is already trusted there).",
  coveredBy: "extension-test/unit/popup-content.test.js",
};
