// Builds test/ui/README.GENERATED.md — the reviewable gallery of the UI
// snapshots: every case's image with its description, in stable case order, so
// the current (or changed) popup state shows in GitHub's folder/diff viewer.
//
// It's DERIVED from the cases (loadCases gives { name, description } per
// test/ui/cases/<name>.case.js, each paired with its <name>.png), so there's no
// hand-maintained copy to drift: `npm run refresh:ui` regenerates it alongside
// the PNGs, and popup-snapshots.test.js asserts the committed file matches (a
// read-only gate in CI). Output is deterministic — no timestamps — so an
// unchanged run yields no diff.
"use strict";

const path = require("node:path");
const { loadCases } = require("./popup-renderer");

const README_PATH = path.join(__dirname, "README.GENERATED.md");

const HEADER = `# UI snapshots

> **Generated file — do not edit by hand.** Run \`npm run refresh:ui\` to
> regenerate; \`test/ui/popup-snapshots.test.js\` fails if it drifts.

Each popup state is a self-contained case in [\`cases/\`](cases/): a
\`<name>.case.js\` module supplying only *fake data*, paired with its reference
\`<name>.png\`. The renderer feeds that data to \`ui/popup.js\`'s real
\`render()\` — the same \`chooseContent\` + views the extension runs — and
rasterizes the result, so these images track the shipped popup directly. See
[\`docs/claude/testing.md\`](../../docs/claude/testing.md) for the mechanics.

The gallery below shows every case's reference image with its description, so the
current (or changed) state is reviewable straight from GitHub.
`;

function buildReadme() {
  const sections = loadCases().map(
    ({ name, description }) =>
      `## ${name}\n\n${description}\n\n![${name}](cases/${name}.png)\n`
  );
  return `${HEADER}\n${sections.join("\n")}`;
}

module.exports = { buildReadme, README_PATH };
