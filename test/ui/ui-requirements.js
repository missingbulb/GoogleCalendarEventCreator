// Parses docs/uiRequirements.md into its numbered requirement IDs — the single
// source of truth for the requirement list, shared by the coverage ubertest
// (test/uber/ui-requirements-coverage.test.js) and the gallery generator
// (build-requirements-gallery.js), so neither hard-codes it.
//
// A requirement is a line whose first token is a backtick-wrapped dotted number,
// e.g. "- `5.6.1` A past year shows a gray pill." The leading list dash is
// OPTIONAL: a requirement may also lead a two-column gallery table cell as bare
// "`5.6.1` …" (see build-requirements-gallery.js). Section headings ("## 5. Event
// cards") and in-prose cross-references ("(→ `5.7.2`)") are not at a line's start,
// so they're ignored. A "leaf" is a requirement with no finer-grained child (5.6
// is not a leaf because 5.6.1 exists); every leaf must have exactly one case.
//
// This file only enumerates the requirement NUMBERS. How each leaf is verified —
// a popup snapshot, the toolbar-icon snapshot, a behavior click test, or a TBD
// placeholder — is declared by the leaf's CASE (its `kind` / `tbd` fields; see
// test/ui/render-snapshot.js and the coverage ubertest), NOT tagged in the spec.
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

module.exports = {
  allRequirementIds,
  leafRequirementIds,
  DOC_PATH,
};
