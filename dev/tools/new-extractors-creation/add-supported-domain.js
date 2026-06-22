// Adds a host to supportedDomains in fallback-lists.json — sorted, no
// duplicate. The auto-implement-extractor workflow runs this in Phase 1 to
// register a new source's host before the agent runs (the agent no longer edits
// the list). Idempotent: re-running for an existing host is a no-op write.
//
// The drift guard extension-test/integration/supported-domains.test.js still enforces that every
// entry is accepted by some source's matches() and vice-versa, so the workflow
// scaffolds the source (with its matches() filled) before calling this.
//
//   node dev/tools/new-extractors-creation/add-supported-domain.js <host>
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const FILE = path.join(__dirname, "..", "..", "..", "extension", "fallback-lists.json");

// Pure: return `list` with `host` present, sorted and de-duplicated.
function withDomain(list, host) {
  return [...new Set([...(list || []), host])].sort();
}

module.exports = { withDomain };

if (require.main === module) {
  const host = process.argv[2];
  if (!host) {
    console.error("add-supported-domain: no host given");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  data.supportedDomains = withDomain(data.supportedDomains, host);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(
    `add-supported-domain: "${host}" present in supportedDomains (${data.supportedDomains.length} total)`
  );
}
