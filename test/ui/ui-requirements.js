// Parses docs/uiRequirements.md into its numbered requirement IDs — the single
// source of truth shared by the coverage ubertest
// (test/uber/ui-requirements-coverage.test.js) and the gallery README generator
// (build-readme.js), so neither hard-codes the list.
//
// A requirement is a line whose first token is a backtick-wrapped dotted number,
// e.g. "- `5.6.1` A past year shows a gray pill." The leading list dash is
// OPTIONAL: a requirement may also lead a two-column gallery table cell as bare
// "`5.6.1` …" (see build-requirements-gallery.js). Section headings ("## 5. Event
// cards") and in-prose cross-references ("(→ `5.7.2`)") are not at a line's start,
// so they're ignored. A "leaf" is a requirement with no finer-grained child (5.6
// is not a leaf because 5.6.1 exists); leaves are what a case must cover.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DOC_PATH = path.join(__dirname, "..", "..", "docs", "uiRequirements.md");

// Matches a requirement at line start: optional list dash, then `<dotted-number>`.
const REQ_LINE = /^\s*(?:-\s+)?`(\d+(?:\.\d+)+)`/;

// All requirement IDs, in document order, deduped.
function allRequirementIds(docPath = DOC_PATH) {
  const text = fs.readFileSync(docPath, "utf8");
  const ids = [];
  const seen = new Set();
  for (const line of text.split("\n")) {
    const m = REQ_LINE.exec(line);
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

// A requirement tagged `_(behavior)_` right after its ID is verified by a
// BEHAVIOR test (a click/navigation a snapshot can't observe), not a UI snapshot
// — the segmentation behind the coverage gate (test/ui/behavior-coverage.js,
// docs/engineeringPractices.md #429). Everything else is a "render" leaf, pinned
// by a snapshot. Returns { "<leafId>": "behavior" | "render" }.
function leafRequirementKinds(docPath = DOC_PATH) {
  const text = fs.readFileSync(docPath, "utf8");
  const behavior = new Set();
  for (const line of text.split("\n")) {
    const m = /^\s*(?:-\s+)?`(\d+(?:\.\d+)+)`\s+_\(behavior\)_/.exec(line);
    if (m) behavior.add(m[1]);
  }
  const kinds = {};
  for (const id of leafRequirementIds(docPath)) kinds[id] = behavior.has(id) ? "behavior" : "render";
  return kinds;
}

// The leaf IDs of each kind, derived from leafRequirementKinds.
function behaviorLeafIds(docPath = DOC_PATH) {
  const kinds = leafRequirementKinds(docPath);
  return Object.keys(kinds).filter((id) => kinds[id] === "behavior");
}
function renderLeafIds(docPath = DOC_PATH) {
  const kinds = leafRequirementKinds(docPath);
  return Object.keys(kinds).filter((id) => kinds[id] === "render");
}

module.exports = {
  allRequirementIds,
  leafRequirementIds,
  leafRequirementKinds,
  behaviorLeafIds,
  renderLeafIds,
  DOC_PATH,
};
