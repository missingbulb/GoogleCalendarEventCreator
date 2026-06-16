// Guards that test/ui/README.md stays in sync with the snapshot gallery: every
// reference PNG in test/ui/cases/ must be embedded in the README, so the file
// viewer's gallery never silently drops (or omits a freshly added) image. The
// README is hand-maintained, so this catches the drift; see test/ui/README.md.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { CASES_DIR } = require("./popup-renderer");

const README_PATH = path.join(__dirname, "README.md");

test("every snapshot PNG is embedded in test/ui/README.md", () => {
  const pngs = fs
    .readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".png"))
    .sort();
  assert.ok(pngs.length > 0, "no test/ui/cases/*.png found");

  const readme = fs.readFileSync(README_PATH, "utf8");
  const missing = pngs.filter((png) => !readme.includes(`cases/${png}`));

  assert.deepEqual(
    missing,
    [],
    `test/ui/README.md is missing image(s): ${missing.join(", ")}. ` +
      `Add a section embedding ![…](cases/<name>.png) for each.`
  );
});
