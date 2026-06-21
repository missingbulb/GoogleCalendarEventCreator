// Pre-creates the empty integration-case file the agent FILLS for the
// auto-implement-extractor workflow. The agent edits this file (and the source);
// it never creates one — so its whole write surface is two known files. Empty
// `events` means "not filled yet": Phase 2 treats a still-empty case as the
// agent having bailed (the page wasn't a real event page).
//
//   node dev/tools/new-extractors-creation/scaffold-case.js <case-name> <host>
"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Pure: the placeholder case object for a host.
function caseStub(host) {
  return {
    description: `${host}: TODO(agent) — one line on what this case tests`,
    expected: { events: [] },
  };
}

module.exports = { caseStub };

if (require.main === module) {
  const caseName = process.argv[2];
  const host = process.argv[3] || "";
  if (!caseName) {
    console.error("scaffold-case: no case name given");
    process.exit(1);
  }
  const dest = path.join(__dirname, "..", "..", "requirements", "extractors", "custom", `${caseName}.json`);
  if (fs.existsSync(dest)) {
    console.error(`scaffold-case: ${dest} already exists — refusing to overwrite`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(caseStub(host), null, 2) + "\n");
  console.log(`scaffold-case: wrote dev/requirements/extractors/custom/${caseName}.json`);
}
