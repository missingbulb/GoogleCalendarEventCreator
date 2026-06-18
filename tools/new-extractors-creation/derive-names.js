// Re-derive the deterministic slug / caseName / host for the finalize workflow
// (.github/workflows/finalize-extractor.yml). That workflow fires on the
// `extractor-agent-done` label and gets only the issue in its event payload — not
// the branch — so it recomputes the same names Phase 1 used, from the same event
// URL, with the same code (firstUrl + namesFor). Pure + offline (it just parses
// the issue body), so it can't drift from the branch the prepare workflow made.
//
//   in  (env): ISSUE_BODY, ISSUE_TITLE — the issue's raw fields
//   out (GITHUB_OUTPUT): slug, caseName, host
"use strict";

const fs = require("node:fs");
const { firstUrl } = require("./triage-extractor-request");
const { namesFor } = require("./extractor-naming");

const url = firstUrl(process.env.ISSUE_BODY) || firstUrl(process.env.ISSUE_TITLE);
const { host, slug, caseName } = namesFor(url);

if (!slug) {
  console.error("Could not derive a slug — no parseable event URL in the issue.");
  process.exit(1);
}

console.log(`Derived slug=${slug} caseName=${caseName} host=${host} from ${url}`);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `slug=${slug}\ncaseName=${caseName}\nhost=${host}\n`
  );
}
