// End-to-end extraction tests, driven entirely by declarative case files.
//
// Each JSON file in test/cases/ describes one scenario:
//
//   {
//     "description": "Meetup event page",
//     "url":         "https://www.meetup.com/group/events/123/",
//     "fixture":     "meetup-event.html",      // optional; defaults to <case-name>.html
//     "expected": {
//       "title":    "exact match",
//       "start":    "exact match (extractor string contract)",
//       "end":      "exact match",
//       "location": "exact match",
//       "descriptionIncludes": ["substring", "substring"],
//       "multipleEvents": false
//     }
//   }
//
// The matching HTML fixture in test/fixtures/ is the page content for that
// URL. To add coverage for a new website or event platform: drop in a new
// case file, then snapshot the live page with `node test/record.js
// test/cases/<your-case>.json` (or hand-craft the fixture). No runner
// changes needed.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { extractFromHtml } = require("./harness");

const CASES_DIR = path.join(__dirname, "cases");
const FIXTURES_DIR = path.join(__dirname, "fixtures");

const EXACT_FIELDS = ["title", "start", "end", "location", "multipleEvents"];

const caseFiles = fs
  .readdirSync(CASES_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

assert.ok(caseFiles.length > 0, `No test cases found in ${CASES_DIR}`);

for (const file of caseFiles) {
  const testCase = JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), "utf8"));
  const label = `${testCase.description || file} — ${testCase.url}`;

  test(label, () => {
    assert.ok(testCase.url, `${file}: "url" is required`);
    assert.ok(testCase.expected && Object.keys(testCase.expected).length > 0, `${file}: "expected" must list at least one field`);

    const fixtureName = testCase.fixture || file.replace(/\.json$/, ".html");
    const fixturePath = path.join(FIXTURES_DIR, fixtureName);
    assert.ok(
      fs.existsSync(fixturePath),
      `Missing fixture ${fixtureName}. Record it with: node test/record.js test/cases/${file}`
    );

    const html = fs.readFileSync(fixturePath, "utf8");
    const actual = extractFromHtml(html, testCase.url);

    for (const [field, want] of Object.entries(testCase.expected)) {
      if (EXACT_FIELDS.includes(field)) {
        assert.equal(actual[field], want, `"${field}" mismatch`);
      } else if (field === "descriptionIncludes") {
        for (const part of [].concat(want)) {
          assert.ok(
            (actual.description || "").includes(part),
            `description should include "${part}"\nactual description: "${actual.description}"`
          );
        }
      } else {
        assert.fail(
          `${file}: unknown expectation "${field}". Allowed: ${EXACT_FIELDS.join(", ")}, descriptionIncludes`
        );
      }
    }
  });
}
