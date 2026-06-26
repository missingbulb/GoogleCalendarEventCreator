// Re-derive the deterministic names for the finalize workflow. That workflow
// fires on the `extractor-agent-done` label and gets only the issue in its
// event payload — not
// the branch — so it recomputes the same names Phase 1 used, from the same event
// URL + issue number, with the same code (planNames). Pure + offline.
//
// Mode-aware (planNames → resolve-source): in **supported** mode the source is an
// EXISTING file (not the slug) and the case/branch carry the issue number, so this
// must run against the DEFAULT-branch tree — where a new-mode source doesn't exist
// yet but a supported host's source does. The finalize workflow's checkout lands on
// the default branch (an `issues` event), so that's exactly what it sees here,
// before phase2-finalize.sh switches to the agent's branch.
//
//   in  (env): ISSUE_BODY, ISSUE_TITLE, ISSUE_NUMBER
//   out (GITHUB_OUTPUT): mode, slug, sourceBase, caseName, host, branch,
//                        sourcePath, casePath
"use strict";

const fs = require("node:fs");
const { firstUrl } = require("./triage-extractor-request");
const { planNames } = require("./plan-names");

const url = firstUrl(process.env.ISSUE_BODY) || firstUrl(process.env.ISSUE_TITLE);
const issueNumber = Number(process.env.ISSUE_NUMBER);
const n = planNames(url, issueNumber);

if (!n.slug) {
  console.error("Could not derive a slug — no parseable event URL in the issue.");
  process.exit(1);
}

console.log(
  `Derived mode=${n.mode} sourceBase=${n.sourceBase} caseName=${n.caseName} ` +
    `host=${n.host} branch=${n.branch} from ${url}`
);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `mode=${n.mode}\nslug=${n.slug}\nsourceBase=${n.sourceBase}\ncaseName=${n.caseName}\n` +
      `host=${n.host}\nbranch=${n.branch}\nsourcePath=${n.sourcePath}\ncasePath=${n.casePath}\n`
  );
}
