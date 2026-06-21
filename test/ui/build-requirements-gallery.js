// Maintains the two-column gallery embedded in docs/uiRequirements.md: each leaf
// requirement is laid out as a small HTML <table> row — LEFT cell the generated
// snapshot image (for a render leaf) or a behavior-test note (for a behavior
// leaf), RIGHT cell the hand-authored requirement text. GitHub renders the
// markdown inside a <td> as long as it's surrounded by blank lines, which is how
// the image and the prose both render in the two columns.
//
// SPLIT OF OWNERSHIP — the crux of why this stays drift-free:
//   - The <table> scaffolding and the RIGHT-cell requirement prose are
//     hand-authored (the spec). This generator never rewrites them.
//   - The LEFT-cell content is a single MANAGED line, tagged with an
//     ID-bearing marker `<!-- req-gallery:<id> -->`. This generator rewrites ONLY
//     those marker lines (to the right image path, or the behavior note), keyed
//     off the leaf's kind. The marker is the LAST token on the line so the line
//     starts as real markdown (an image / italic note) that GitHub renders.
//
// So a re-run only ever changes a left-cell image line; the gate
// (requirements-gallery.test.js) checks (a) the committed file equals this
// generator's output and (b) every leaf has exactly one marker. Deterministic, no
// timestamps. docs/uiRequirements.md is therefore part-generated / part-authored
// and is NOT on the `ours` merge driver — a prose conflict is resolved by hand.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DOC_PATH } = require("./ui-requirements");
const { loadCases } = require("./cases");

const CASES_DIR = path.join(__dirname, "cases");
// docs/uiRequirements.md → test/ui/cases/ is two levels up then back down.
const IMG_REL = "../test/ui/cases";
const BEHAVIOR_TEST = "test/ui/events-view-actions.test.js";

// The ID-bearing marker that tags a managed left-cell line.
const MARKER_RE = /<!--\s*req-gallery:(\d+(?:\.\d+)+)\s*-->/;

function marker(id) {
  return `<!-- req-gallery:${id} -->`;
}

// The canonical managed left-cell content for one leaf, derived from its CASE (its
// `kind` / `tbd` fields), with the marker as the trailing token: a note for a
// `kind: "behavior"` case (no image — a click a snapshot can't show); otherwise the
// req-<id>.png image (popup or icon — same embed either way), prefixed with a loud
// "TO BE DECIDED" banner when the case is `tbd` (so a reviewer sees the provisional
// render of CURRENT behavior under the banner).
function managedLine(id, testCase) {
  const kind = (testCase && testCase.kind) || "popup";
  if (kind === "behavior") {
    return `\u{1F6A9} _Behavior leaf — verified by \`${BEHAVIOR_TEST}\` (a click a snapshot can't show), not an image._ ${marker(id)}`;
  }
  const img = `![req-${id}](${IMG_REL}/req-${id}.png)`;
  if (testCase && testCase.tbd) {
    const hasProvisional = fs.existsSync(path.join(CASES_DIR, `req-${id}.png`));
    const banner = "⚠️ **TO BE DECIDED** — behavior not yet decided";
    return hasProvisional
      ? `${banner}; provisional render of CURRENT behavior: ${img} ${marker(id)}`
      : `${banner}. ${marker(id)}`;
  }
  return `${img} ${marker(id)}`;
}

// All leaf IDs that carry a marker line in the doc, with their line indices.
function markerLines(lines) {
  const out = [];
  lines.forEach((line, i) => {
    const m = MARKER_RE.exec(line);
    if (m) out.push({ id: m[1], i });
  });
  return out;
}

// Rewrite every managed marker line to its canonical content (preserving the
// line's leading indentation); leave every other line — scaffolding and prose —
// untouched.
function buildGallery(docPath = DOC_PATH) {
  const caseById = new Map(loadCases().map((c) => [c.name.replace(/^req-/, ""), c]));
  const lines = fs.readFileSync(docPath, "utf8").split("\n");
  const out = lines.map((line) => {
    const m = MARKER_RE.exec(line);
    if (!m) return line;
    const lead = line.match(/^\s*/)[0];
    return `${lead}${managedLine(m[1], caseById.get(m[1]))}`;
  });
  return out.join("\n");
}

module.exports = { buildGallery, markerLines, MARKER_RE, DOC_PATH };

if (require.main === module) {
  fs.writeFileSync(DOC_PATH, buildGallery());
  console.log(`Refreshed the two-column gallery in ${DOC_PATH}`);
}
