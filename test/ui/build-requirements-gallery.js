// Embeds the UI snapshot gallery INLINE into docs/uiRequirements.md: under each
// leaf requirement, a generated "managed line" — for a RENDER leaf with a
// per-leaf case, its `req-<id>.png` image; for a BEHAVIOR leaf, a one-line note
// pointing at the behavior test. The requirement prose is the spine; the image
// sits right beside the words it verifies (no separate case-first gallery to
// drift). This is the requirement-first inversion of the old test/ui/README.md.
//
// Part-generated / part-authored file: this generator ONLY ever rewrites managed
// lines (recognized by their `![req-…]`/`<!-- req: … -->` shape), never the
// hand-written spec prose around them. It strips the existing managed lines and
// re-inserts the current ones, so it's idempotent and deterministic (no
// timestamps → an unchanged run yields no diff). refresh-popup-snapshots.js runs
// it after rendering the PNGs; requirements-gallery.test.js gates drift (a
// read-only check in CI).
//
// NOTE: docs/uiRequirements.md is NOT on the `ours` merge driver (unlike the
// fully-generated artifacts) because its prose is hand-authored — a prose
// conflict is resolved by hand, and only these image lines are regenerated.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { leafRequirementKinds, DOC_PATH } = require("./ui-requirements");

const CASES_DIR = path.join(__dirname, "cases");
// docs/uiRequirements.md → test/ui/cases/ is two levels up then back down.
const IMG_REL = "../test/ui/cases";
const BEHAVIOR_TEST = "test/unit/events-view-actions.test.js";

// A managed line carries this marker (a trailing HTML comment — invisible when
// rendered) so it is unambiguously generator-owned and can be stripped on every
// run regardless of its content. It's placed at the END so the line starts as
// real inline content (an image / a continuation), never as an HTML block.
const MARKER = "<!-- req-gallery -->";

// Recognize a previously-generated managed line (so a re-run replaces, not
// duplicates). Matches at any indentation.
function isManagedLine(line) {
  return line.includes(MARKER);
}

// The managed line for one leaf, at the given indentation, or null when a render
// leaf has no per-leaf image yet (migration in progress — emit nothing). The
// indentation keeps the line inside its (possibly nested) list item so the image
// renders as part of the requirement rather than breaking the list. The trailing
// marker is the last token.
function managedLine(id, kind, indent) {
  if (kind === "behavior") {
    return `${indent}\u{1F6A9} _Behavior leaf — verified by \`${BEHAVIOR_TEST}\` (a click a snapshot can't show), not an image._ ${MARKER}`;
  }
  const png = `req-${id}.png`;
  if (!fs.existsSync(path.join(CASES_DIR, png))) return null;
  return `${indent}![req-${id}](${IMG_REL}/${png}) ${MARKER}`;
}

// A leaf requirement bullet: `- \`<id>\`` at some indentation. Capture the indent
// so the managed line aligns with the bullet's text.
const LEAF_BULLET = /^(\s*)-\s+`(\d+(?:\.\d+)+)`/;

// Build the new doc text: walk lines, drop any existing managed lines, and after
// the LAST line of each leaf bullet insert that leaf's managed line. A leaf bullet
// owns its first line plus any following MORE-indented continuation (wrapped)
// lines; leaves never have child bullets, so the bullet ends at the next line
// that isn't deeper than its marker.
function buildGallery(docPath = DOC_PATH) {
  const kinds = leafRequirementKinds(docPath);
  const src = fs.readFileSync(docPath, "utf8").split("\n").filter((l) => !isManagedLine(l));

  const out = [];
  for (let i = 0; i < src.length; i++) {
    const line = src[i];
    out.push(line);
    const m = LEAF_BULLET.exec(line);
    if (!m || !(m[2] in kinds)) continue;

    const markerIndent = m[1].length;
    // Skip past this bullet's wrapped continuation lines (deeper than the marker,
    // non-blank), so the managed line lands after the whole bullet.
    while (
      i + 1 < src.length &&
      src[i + 1].trim() !== "" &&
      /^(\s*)/.exec(src[i + 1])[1].length > markerIndent &&
      !LEAF_BULLET.test(src[i + 1])
    ) {
      out.push(src[++i]);
    }
    const ml = managedLine(m[2], kinds[m[2]], " ".repeat(markerIndent + 2));
    if (ml) out.push(ml);
  }
  return out.join("\n");
}

module.exports = { buildGallery, DOC_PATH };

if (require.main === module) {
  fs.writeFileSync(DOC_PATH, buildGallery());
  console.log(`Wrote inline gallery into ${DOC_PATH}`);
}
