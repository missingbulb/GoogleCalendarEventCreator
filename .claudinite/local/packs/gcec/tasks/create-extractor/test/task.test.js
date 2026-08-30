// The create-extractor task's PRECONDITION — the cheap hourly gate the scheduler
// runs in code before anything else exists. Its whole job is eligibility over the
// `issues` signal; everything it must NOT do (parse a body, classify a host, close
// anything) belongs to preprocessing, and the absence of that here is the point of
// the split, so it is worth asserting the gate stays that shape.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../task.mjs").then((m) => m.default);

const signals = (open) => ({ issues: { open, touched: [] } });
const req = (number, labels = ["extractor-request"]) => ({ number, title: `Event source request - #${number}`, labels });

test("no open request and no page churn → skip, with a reason a human can read in the job summary", async () => {
  const task = await load();
  const v = task.precondition(signals([]));
  assert.equal(v.run, false);
  assert.match(v.reason, /no open extractor-request issue is eligible/);
});

test("no request, but a cached-page file moved → run anyway, to sweep for a page needing a record", async () => {
  const task = await load();
  const v = task.precondition({
    issues: { open: [] },
    commits: { touchedPaths: ["dev/requirements/extractor/data/server-fetched/dice.url"] },
  });
  assert.equal(v.run, true);
  assert.match(v.reason, /sweep for a page needing a record/);
});

test("a commit elsewhere is not a reason to run", async () => {
  const task = await load();
  const v = task.precondition({ issues: { open: [] }, commits: { touchedPaths: ["extension/popup.js"] } });
  assert.equal(v.run, false);
});

test("an unrelated open issue is not a request", async () => {
  const task = await load();
  assert.equal(task.precondition(signals([req(3, ["bug"])])).run, false);
});

test("an open request fires the task and names it as binding scope", async () => {
  const task = await load();
  const v = task.precondition(signals([req(12)]));
  assert.equal(v.run, true);
  assert.match(v.reason, /1 eligible extractor request\(s\): #12/);
  assert.match(v.context.join("\n"), /#12/);
});

test("a request already handed to a human (needs-human) is not eligible", async () => {
  const task = await load();
  const v = task.precondition(signals([req(4, ["extractor-request", "needs-human"])]));
  assert.equal(v.run, false);
});

test("a request claimed by a run (agent-running) is not eligible — this is what stops an hourly re-scaffold", async () => {
  const task = await load();
  const v = task.precondition(signals([req(4, ["extractor-request", "agent-running"])]));
  assert.equal(v.run, false);
});

test("eligible requests are listed oldest-first, matching the order preprocessing acts in", async () => {
  const task = await load();
  const v = task.precondition(signals([req(31), req(7), req(19)]));
  assert.match(v.reason, /#7, #19, #31/);
});

test("the declaration carries the full contract, including the secret preprocessing spends", async () => {
  const task = await load();
  assert.equal(task.id, "create-extractor");
  // `daily`, not `hourly`: the canon retired that token and normalizes it away at the
  // declaration door, so this task has run daily since — and #1060 accepts a slow cycle
  // until an event trigger replaces the poll. Pinned so the declaration cannot drift back
  // to a cadence the queue will not honour.
  assert.equal(task.frequency, "daily");
  assert.deepEqual(task.precondition_signals, ["issues", "commits"]);  // requests, plus the pending-page sweep
  // The pair the canon's auto-merge contract splits the old `open-pr` ceiling into:
  // a run may open a PR, and nothing it produces may land without a person.
  assert.equal(task.expected_outcome, "pr");
  assert.equal(task.automerge, "nothing");         // a human always reviews the extraction
  assert.equal(task.agent_preprocessing, "node prepare.mjs");
  assert.deepEqual(task.required_secrets, ["SCRAPER_API_KEY"]);
  assert.ok(task.agent_preprocessing_timeout > 0 && task.agent_execution_timeout > 0);
});

test("the precondition is pure — it never reads a body or reaches for I/O", async () => {
  const task = await load();
  // A signal object with ONLY what `issues` collects (no bodies) must be enough.
  const v = task.precondition({ issues: { open: [{ number: 1, title: "t", labels: ["extractor-request"] }] } });
  assert.equal(v.run, true);
  // And a missing signal must not throw — a collector error can't sink the gate.
  assert.equal(task.precondition({}).run, false);
});
