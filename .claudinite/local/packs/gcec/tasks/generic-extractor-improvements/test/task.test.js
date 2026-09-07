// The generic-extractor-improvements task's PRECONDITION. It used to hand-roll the
// `substantiveChange` read that the canon's built-in `substantive-change` term
// already performs, and named EVERY window sha in its Context with no cap — where
// the built-in routes the list through `cappedContext` (MAX_CONTEXT_ITEMS, plus a
// count of what it dropped). A busy week therefore flooded the one section this
// opus run is told to read as its scope.
//
// These drive the VENDORED evaluator, not a local re-implementation: the mount is
// what decides this task at the anchor and again at pick, so a test against
// anything else would prove the wrong thing.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const MOUNT = "../../../../../../shared/packs/claudinite-tasks";
const load = async () => {
  const { findTaskDeclaration, loadTaskDeclaration } = await import(`${MOUNT}/task-declaration.mjs`);
  return {
    task: await loadTaskDeclaration(findTaskDeclaration(`${__dirname}/..`)),
    policy: await import(`${MOUNT}/precondition-policy.mjs`),
  };
};

// `runs` and `now` are here for the cadence term the declaration leads with, not
// for anything these cases assert: `due:weekly` reads the task's own run history
// against an anchor, and no run at all is the state in which it holds, so every
// verdict below turns purely on `substantive-change`. Omitting them is not a
// neutral simplification — a cadence term with no instant to anchor on makes
// evaluatePreconditions return an error rather than a verdict, and every `v.run`
// reads `undefined`.
const commits = (list) => ({
  commits: { substantiveChange: list.length > 0, list },
  runs: { list: [], horizonDays: 30 },
});
const sub = (sha) => ({ sha, substantive: true });
const verdict = ({ task, policy }, signals) =>
  policy.evaluatePreconditions({
    preconditions: task.preconditions, signals, windowDays: 8, now: new Date("2026-09-07T00:00:00Z"),
  });

test("the gate is the canon term, not a local copy of it", async () => {
  const { task } = await load();
  // The cadence leads the list as its own term (missingbulb/Claudinite#1725): the
  // retired `frequency` field said weekly, and `due:weekly` is what it became.
  assert.deepEqual(task.preconditions, ["due:weekly", "substantive-change"]);
  // The legacy pair is gone: declaring either beside `preconditions` is a contract
  // violation the shape check reds, and the signal union is derived from the term.
  assert.equal(task.precondition, undefined);
  assert.equal(task.precondition_signals, undefined);
});

test("a window of only docs/generated churn declines — an opus run over unchanged source buys nothing", async () => {
  const m = await load();
  const v = verdict(m, commits([]));
  assert.equal(v.run, false);
  assert.match(v.reason, /no substantive default-branch change/);
});

test("a substantive window runs, and its Context names the commits as scope", async () => {
  const m = await load();
  const v = verdict(m, commits([sub("aaaaaaa1"), sub("bbbbbbb2")]));
  assert.equal(v.run, true);
  const context = v.context.join(" ");
  assert.match(context, /aaaaaaa/);
  assert.match(context, /bbbbbbb/);
});

// The reason the conversion is worth making rather than merely tidier.
test("a flood of commits is capped, and says how many it dropped", async () => {
  const m = await load();
  const { MAX_CONTEXT_ITEMS } = m.policy;
  const many = Array.from({ length: MAX_CONTEXT_ITEMS + 12 }, (_, i) => sub(String(i).padStart(7, "0")));
  const v = verdict(m, commits(many));
  assert.equal(v.run, true);

  const context = v.context.join(" ");
  const named = context.match(/\b\d{7}\b/g) ?? [];
  assert.equal(named.length, MAX_CONTEXT_ITEMS, "the scope list is capped");
  assert.match(context, /12 further commit\(s\) are not named here/);
});
