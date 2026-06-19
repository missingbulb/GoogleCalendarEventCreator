// Pins the requirement-ID → docs/uiRequirements.md section-anchor mapping that
// the gallery README links through (build-readme.js). The anchors must match
// what GitHub generates for the `## ` headings, so a reader can click a cited ID
// and land on its section; githubSlug replicates GitHub's slug algorithm and is
// checked against known headings here.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { githubSlug, requirementSectionAnchors, leafRequirementIds } = require("./ui-requirements");

test("githubSlug matches GitHub's heading-anchor algorithm", () => {
  assert.equal(githubSlug("1. Heading"), "1-heading");
  // Punctuation is stripped, not collapsed first — an em dash between spaces
  // leaves a double hyphen, exactly as GitHub renders it.
  assert.equal(githubSlug("5. Event cards — appearance"), "5-event-cards--appearance");
  assert.equal(githubSlug("4. Event cards — grouping & ordering"), "4-event-cards--grouping--ordering");
  assert.equal(githubSlug("6. Date & time display"), "6-date--time-display");
});

test("each requirement maps to its section anchor", () => {
  const anchors = requirementSectionAnchors();
  assert.equal(anchors["1.1"], "1-heading");
  assert.equal(anchors["5.6.1"], "5-event-cards--appearance");
  assert.equal(anchors["6.6"], "6-date--time-display");
  assert.equal(anchors["9.3"], "9-opening-an-event");
});

test("every leaf requirement has a section anchor", () => {
  const anchors = requirementSectionAnchors();
  const missing = leafRequirementIds().filter((id) => !anchors[id]);
  assert.deepEqual(missing, [], "these leaf requirements got no section anchor (heading parse gap):");
});
