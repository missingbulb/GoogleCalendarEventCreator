// The create-extractor task's PRECONDITION TERM (`extractor-request-eligible` in
// preconditions.mjs) — the cheap gate the scheduler runs in code before anything
// else exists. Its whole job is eligibility over the
// `issues` signal; everything it must NOT do (parse a body, classify a host, close
// anything) belongs to preprocessing, and the absence of that here is the point of
// the split, so it is worth asserting the gate stays that shape.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const load = async () => {
  const { terms } = await import("../preconditions.mjs");
  return terms["extractor-request-eligible"];
};

const signals = (open) => ({ issues: { open, touched: [] } });
const req = (number, labels = ["extractor-request"]) => ({ number, title: `Event source request - #${number}`, labels });

test("no open request and no page churn → skip, with a reason a human can read in the job summary", async () => {
  const term = await load();
  const v = term.holds(signals([]));
  assert.equal(v.holds, false);
  assert.match(v.reason, /no open extractor-request issue is eligible/);
});

test("no request, but a cached-page file moved → run anyway, to sweep for a page needing a record", async () => {
  const term = await load();
  const v = term.holds({
    issues: { open: [] },
    commits: { touchedPaths: ["dev/requirements/extractor/data/server-fetched/dice.url"] },
  });
  assert.equal(v.holds, true);
  assert.match(v.reason, /sweep for a page needing a record/);
});

test("a commit elsewhere is not a reason to run", async () => {
  const term = await load();
  const v = term.holds({ issues: { open: [] }, commits: { touchedPaths: ["extension/popup.js"] } });
  assert.equal(v.holds, false);
});

test("an unrelated open issue is not a request", async () => {
  const term = await load();
  assert.equal(term.holds(signals([req(3, ["bug"])])).holds, false);
});

test("an open request fires the task and names it as binding scope", async () => {
  const term = await load();
  const v = term.holds(signals([req(12)]));
  assert.equal(v.holds, true);
  assert.match(v.reason, /1 eligible extractor request\(s\): #12/);
  assert.match(v.context.join("\n"), /#12/);
});

test("a request already handed to a human (needs-human) is not eligible", async () => {
  const term = await load();
  const v = term.holds(signals([req(4, ["extractor-request", "needs-human"])]));
  assert.equal(v.holds, false);
});

test("a request claimed by a run (agent-running) is not eligible — this is what stops an hourly re-scaffold", async () => {
  const term = await load();
  const v = term.holds(signals([req(4, ["extractor-request", "agent-running"])]));
  assert.equal(v.holds, false);
});

test("eligible requests are listed oldest-first, matching the order preprocessing acts in", async () => {
  const term = await load();
  const v = term.holds(signals([req(31), req(7), req(19)]));
  assert.match(v.reason, /#7, #19, #31/);
});

test("the declaration carries the full contract, including the secret preprocessing spends", async () => {
  const { findTaskDeclaration, loadTaskDeclaration } = await import("../../../../../../shared/packs/claudinite-tasks/task-declaration.mjs");
  const task = await loadTaskDeclaration(findTaskDeclaration(`${__dirname}/..`));
  assert.equal(task.id, "create-extractor");
  // `daily`, not `hourly`: the canon retired that token and normalizes it away at the
  // declaration door, so this task has run daily since — and #1060 accepts a slow cycle
  // until an event trigger replaces the poll. Pinned so the declaration cannot drift back
  // to a cadence the queue will not honour.
  assert.equal(task.frequency, "daily");
  // The declarative expression is the ONLY gate mechanism: the `precondition`
  // function and its `precondition_signals` companion are retired, and the signal
  // union is DERIVED from the term rather than restated here
  // (missingbulb/Claudinite#1617).
  assert.deepEqual(task.preconditions, ["extractor-request-eligible"]);
  assert.equal(task.precondition, undefined);
  assert.equal(task.precondition_signals, undefined);
  // The pair the canon's auto-merge contract splits the old `open-pr` ceiling into:
  // a run may open a PR, and nothing it produces may land without a person.
  assert.equal(task.expected_outcome, "pr");
  assert.equal(task.automerge, "nothing");         // a human always reviews the extraction
  assert.equal(task.agent_preprocessing, "node prepare.mjs");
  assert.deepEqual(task.required_secrets, ["SCRAPER_API_KEY"]);
  assert.ok(task.agent_preprocessing_timeout > 0 && task.agent_execution_timeout > 0);
});

test("the precondition is pure — it never reads a body or reaches for I/O", async () => {
  const term = await load();
  // A signal object with ONLY what `issues` collects (no bodies) must be enough.
  const v = term.holds({ issues: { open: [{ number: 1, title: "t", labels: ["extractor-request"] }] } });
  assert.equal(v.holds, true);
  // And a missing signal must not throw — a collector error can't sink the gate.
  assert.equal(term.holds({}).holds, false);
});
