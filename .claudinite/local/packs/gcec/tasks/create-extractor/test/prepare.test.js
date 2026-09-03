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

// --- the pending-page sweep (absorbed from the retired record-page task) -------
// A `.url` with no `.html` keeps test:live red. This used to be a task of its own;
// it is a few lines over the recorder prepare.mjs already owns, so it lives here.

test("pendingCases: a .url with no .html is pending; one already recorded is not", async () => {
  const { pendingCases } = await load();
  const entries = ["dice.url", "dice.html", "meetup.url", "somo.url", "somo.html"];
  assert.deepEqual(pendingCases(entries, (f) => entries.includes(f)), ["meetup"]);
});

test("pendingCases: an .html with no .url is not a case to record", async () => {
  const { pendingCases } = await load();
  assert.deepEqual(pendingCases(["orphan.html"], (f) => f === "orphan.html"), []);
});

test("pendingCases: nothing to do on an empty or fully-recorded directory", async () => {
  const { pendingCases } = await load();
  assert.deepEqual(pendingCases([], () => false), []);
  assert.deepEqual(pendingCases(["a.url", "a.html"], () => true), []);
});

test("openFamilyBranch: repeated sweeps accumulate onto the open recorded-pages PR", async () => {
  const { openFamilyBranch } = await load();
  const pulls = [{ head: { ref: "claude/extractor/dice" } }, { head: { ref: "claude/record-pages-2026-07-20" } }];
  assert.equal(openFamilyBranch(pulls), "claude/record-pages-2026-07-20");
  assert.equal(openFamilyBranch([{ head: { ref: "some/other" } }]), null);
});

test("hasRoomToStart: leaves room for a worst-case fetch AND the delivery after it", async () => {
  const { hasRoomToStart } = await load();
  // 900s budget, 530s worst-case fetch, 60s delivery -> the last safe start is 310s in.
  assert.equal(hasRoomToStart(300_000, 900_000), true);
  assert.equal(hasRoomToStart(320_000, 900_000), false);
});

test("hasRoomToStart: the budget the worker reads is the task's own declaration", async () => {
  const { hasRoomToStart } = await load();
  const { findTaskDeclaration, loadTaskDeclaration } = await import("../../../../../../shared/packs/claudinite-tasks/task-declaration.mjs");
  const decl = await loadTaskDeclaration(findTaskDeclaration(`${__dirname}/..`));
  assert.equal(hasRoomToStart(0, decl.agent_preprocessing_timeout * 1000), true);
  assert.equal(hasRoomToStart(decl.agent_preprocessing_timeout * 1000, decl.agent_preprocessing_timeout * 1000), false);
});
