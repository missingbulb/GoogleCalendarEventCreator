// Parses docs/uiRequirements.md into its numbered requirement IDs — the single
// source of truth shared by the coverage ubertest
// (test/uber/ui-requirements-coverage.test.js) and the gallery README generator
// (build-readme.js), so neither hard-codes the list.
//
// A requirement is a Markdown bullet whose first token is a backtick-wrapped
// dotted number, e.g. "- `5.6.1` A past year shows a gray pill." Section headings
// ("## 5. Event cards") and in-prose cross-references ("(→ `5.7.2`)") are not at a
// bullet's start, so they're ignored. A "leaf" is a requirement with no
// finer-grained child (5.6 is not a leaf because 5.6.1 exists); leaves are what a
// case must cover.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DOC_PATH = path.join(__dirname, "..", "..", "docs", "uiRequirements.md");

// All requirement IDs, in document order, deduped.
function allRequirementIds(docPath = DOC_PATH) {
  const text = fs.readFileSync(docPath, "utf8");
  const ids = [];
  const seen = new Set();
  for (const line of text.split("\n")) {
    const m = /^\s*-\s+`(\d+(?:\.\d+)+)`/.exec(line);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      ids.push(m[1]);
    }
  }
  return ids;
}

// The leaf IDs: those with no descendant (no other ID prefixed by `id + "."`).
function leafRequirementIds(docPath = DOC_PATH) {
  const ids = allRequirementIds(docPath);
  return ids.filter((id) => !ids.some((other) => other !== id && other.startsWith(`${id}.`)));
}

// GitHub builds a heading's in-page anchor by lowercasing the text, stripping
// punctuation, and turning each remaining space into a hyphen (the
// github-slugger algorithm). Spaces aren't collapsed first, so a stripped
// punctuation mark surrounded by spaces yields a double hyphen — matching what
// GitHub actually renders. We replicate it (rather than depend on the package)
// so the gallery README's requirement links resolve to the right section.
const SLUG_STRIP = new RegExp("[\\u2000-\\u206F\\u2E00-\\u2E7F\\\\'!\"#$%&()*+,./:;<=>?@[\\]^`{|}~]", "g");
function githubSlug(heading) {
  return heading.toLowerCase().replace(SLUG_STRIP, "").replace(/ /g, "-");
}

// Maps each requirement ID to the anchor of the `## ` section it lives under, so
// a cited ID can deep-link into docs/uiRequirements.md at that section.
function requirementSectionAnchors(docPath = DOC_PATH) {
  const text = fs.readFileSync(docPath, "utf8");
  const anchors = {};
  let currentAnchor = null;
  for (const line of text.split("\n")) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      currentAnchor = githubSlug(h[1]);
      continue;
    }
    const m = /^\s*-\s+`(\d+(?:\.\d+)+)`/.exec(line);
    if (m && currentAnchor) anchors[m[1]] = currentAnchor;
  }
  return anchors;
}

module.exports = {
  allRequirementIds,
  leafRequirementIds,
  githubSlug,
  requirementSectionAnchors,
  DOC_PATH,
};
