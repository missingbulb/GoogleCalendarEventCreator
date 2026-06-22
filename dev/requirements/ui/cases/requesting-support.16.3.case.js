// Logic leaf 16.3 (tracked, untested in the executable runner): A request whose host is already on the allow- or denylist is closed automatically, without a run.
// Currently covered by dev/tools/test/triage-extractor-request.test.js. Marked tbd until a faithful executable
// validation is wired here (see dev/procedures/claude/testing.md on the kind:"logic" path).
"use strict";

module.exports = {
  kind: "logic",
  tbd: true,
  description: "A request whose host is already on the allow- or denylist is closed automatically, without a run.",
  coveredBy: "dev/tools/test/triage-extractor-request.test.js",
};
