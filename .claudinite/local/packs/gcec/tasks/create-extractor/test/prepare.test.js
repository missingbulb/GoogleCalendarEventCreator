// Offline unit tests for the pure parts of the create-extractor preprocessing
// worker (prepare.mjs). The worker's I/O shell — GitHub reads/writes, git, npm,
// the ScraperAPI call — is validated by real runs, not mocked here; what is
// unit-tested is the decision surface that would otherwise be invisible: which
// requests a run may touch, and the exact fetch URL a secret is spent on.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

// prepare.mjs is ESM (it is the scheduler's `node prepare.mjs` entry); the suite is
// CJS, so load it through a dynamic import.
const load = () => import("../prepare.mjs");

const issue = (number, labels, extra = {}) => ({ number, labels: labels.map((name) => ({ name })), ...extra });

test("eligible: an open extractor-request with no blocking label is in scope", async () => {
  const { eligible } = await load();
  assert.deepEqual(eligible([issue(7, ["extractor-request"])]).map((i) => i.number), [7]);
});

test("eligible: blocked and in-flight requests are out of scope", async () => {
  const { eligible } = await load();
  const got = eligible([
    issue(1, ["extractor-request", "extractor-blocked-needs-human"]),
    issue(2, ["extractor-request", "extractor-in-progress"]),
    issue(3, ["extractor-request"]),
  ]);
  assert.deepEqual(got.map((i) => i.number), [3]);
});

test("eligible: an issue without the request label, and a PR, are both ignored", async () => {
  const { eligible } = await load();
  const got = eligible([
    issue(1, ["bug"]),
    issue(2, ["extractor-request"], { pull_request: {} }),
    issue(3, ["extractor-request"]),
  ]);
  assert.deepEqual(got.map((i) => i.number), [3]);
});

test("eligible: oldest first — the elder request is the one a run acts on", async () => {
  const { eligible } = await load();
  const got = eligible([issue(9, ["extractor-request"]), issue(4, ["extractor-request"]), issue(6, ["extractor-request"])]);
  assert.deepEqual(got.map((i) => i.number), [4, 6, 9]);
});

test("eligible: plain-string labels (some API shapes) are read the same way", async () => {
  const { eligible } = await load();
  assert.deepEqual(eligible([{ number: 5, labels: ["extractor-request"] }]).map((i) => i.number), [5]);
});

test("prTitle: names the mode's actual work", async () => {
  const { prTitle } = await load();
  assert.match(prTitle("new", "dice.fm", "dice"), /^Implement the extractor for dice\.fm$/);
  assert.match(prTitle("supported", "cinema.co.il", "telavivcinematheque"), /case for cinema\.co\.il \(hardens telavivcinematheque\)/);
});
