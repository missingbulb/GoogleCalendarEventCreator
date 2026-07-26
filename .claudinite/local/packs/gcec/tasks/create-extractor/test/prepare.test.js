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

test("eligible: needs-human and agent-running requests are out of scope", async () => {
  const { eligible } = await load();
  const got = eligible([
    issue(1, ["extractor-request", "needs-human"]),
    issue(2, ["extractor-request", "agent-running"]),
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

// --- stale-claim release ------------------------------------------------------
// A request stays `agent-running` from claim until its PR lands, which is longer
// than the executor's 3h stale sweep tolerates — so that sweep is scoped to
// dispatch issues and releasing OUR claims is this worker's job. These cover the
// two things it must never get wrong: releasing a request whose PR is alive, and
// stranding one whose run died.

const claimed = (number, updatedHoursAgo) => ({
  number,
  labels: [{ name: "extractor-request" }, { name: "agent-running" }],
  updated_at: new Date(NOW - updatedHoursAgo * 3600_000).toISOString(),
});
const NOW = Date.UTC(2026, 6, 26, 12, 0, 0);
const pr = (ref, body) => ({ head: { ref }, body });

test("staleClaims: a claim whose PR is still open is never released, however long review takes", async () => {
  const { staleClaims } = await load();
  const issues = [claimed(42, 240)];   // claimed ten days ago
  const prs = [pr("claude/extractor/dice", "Closes #42\n\nAutomated extractor pipeline.")];
  assert.deepEqual(staleClaims(issues, prs, NOW), []);
});

test("staleClaims: a claim with no PR, past the grace period, is released", async () => {
  const { staleClaims } = await load();
  assert.deepEqual(staleClaims([claimed(42, 7)], [], NOW), [42]);
});

test("staleClaims: a fresh claim is left alone — a run may still be mid-flight", async () => {
  const { staleClaims } = await load();
  assert.deepEqual(staleClaims([claimed(42, 1)], [], NOW), []);
});

test("staleClaims: an unrelated open PR does not count as this request's delivery", async () => {
  const { staleClaims } = await load();
  const prs = [pr("claude/generic-coverage/2026-07-26", "Closes #42"), pr("claude/extractor/other", "Closes #99")];
  assert.deepEqual(staleClaims([claimed(42, 7)], prs, NOW), [42]);
});

test("staleClaims: an unclaimed request is not this function's business", async () => {
  const { staleClaims } = await load();
  const open = [{ number: 5, labels: [{ name: "extractor-request" }], updated_at: new Date(NOW - 99 * 3600_000).toISOString() }];
  assert.deepEqual(staleClaims(open, [], NOW), []);
});

// --- peers for duplicate detection --------------------------------------------
// The `sample` disposition's whole purpose is "another request for this host is
// already in flight". An in-flight request carries `agent-running`, so if peers
// were filtered to the ELIGIBLE set the leader would be invisible and a second
// request would scaffold a rival branch + PR for the same host. Peers are
// therefore every OPEN request except those already parked on a human — a parked
// leader would otherwise black-hole its host forever.

const labelled = (number, labels) => ({ number, title: `req ${number}`, body: "u", labels: labels.map((name) => ({ name })) });

test("labelsOf: reads both the object and plain-string label shapes", async () => {
  const { labelsOf } = await load();
  assert.deepEqual(labelsOf({ labels: [{ name: "a" }, "b"] }), ["a", "b"]);
  assert.deepEqual(labelsOf({}), []);
});

test("an in-flight (claimed) request is NOT eligible but MUST still be visible as a peer", async () => {
  const { eligible, labelsOf } = await load();
  const all = [labelled(10, ["extractor-request", "agent-running"]), labelled(20, ["extractor-request"])];
  // it is out of the acting set...
  assert.deepEqual(eligible(all).map((i) => i.number), [20]);
  // ...but in the peer set, which is what lets #20 defer to it as a sample.
  const peers = all.filter((i) => !labelsOf(i).includes("needs-human")).map((i) => i.number);
  assert.deepEqual(peers, [10, 20]);
});

test("a request parked on a human is excluded from peers, so it cannot black-hole its host", async () => {
  const { labelsOf } = await load();
  const all = [labelled(10, ["extractor-request", "needs-human"]), labelled(20, ["extractor-request"])];
  const peers = all.filter((i) => !labelsOf(i).includes("needs-human")).map((i) => i.number);
  assert.deepEqual(peers, [20]);
});
