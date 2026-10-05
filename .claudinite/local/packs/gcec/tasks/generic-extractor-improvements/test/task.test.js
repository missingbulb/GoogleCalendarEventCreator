// The generic-extractor-improvements task's PRECONDITION. It used to hand-roll the
// `substantiveChange` read that the canon's built-in `substantive-change` term
// already performs, and named EVERY window sha in its Context with no cap — where
// the built-in caps the list it names, plus a count of what it dropped. A busy week
// therefore flooded the one section this opus run is told to read as its scope.
//
// These drive the pinned engine's evaluator, not a local re-implementation: the
// engine is what decides this task at the anchor and again at pick, so a test
// against anything else would prove the wrong thing.
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const { cnAnswer, loadTask, taskPolicy } = require("../../../lib/cn-answer.js");

// The declaration as the engine normalizes it; loadTask asserts the contract holds.
const load = () => ({ task: loadTask(`${__dirname}/..`) });

// `runs` and `now` are here for the cadence term the declaration leads with, not
// for anything these cases assert: the cadence reads the task's own run history
// against an anchor, and no run at all is the state in which it holds, so every
// verdict below turns purely on `substantive-change`.
const commits = (list) => ({
  commits: { substantiveChange: list.length > 0, list },
  runs: { list: [], horizonDays: 30 },
  // The declaration's pending-round term reads `prs`, and in full mode a signal
  // that was not collected is a term that does not hold — so every case below
  // states the empty open set to keep its verdict turning purely on `commits`.
  prs: { open: [], touched: [] },
});
const sub = (sha) => ({ sha, substantive: true });
const verdict = ({ task }, signals) => {
  const [v] = cnAnswer("precondition", {
    cases: [{ preconditions: task.preconditions, signals, now: "2026-09-07T00:00:00Z" }],
  });
  assert.equal(v.error, undefined, v.error);
  return v;
};

test("the gate is the canon term, not a local copy of it", () => {
  const { task } = load();
  // The cadence leads the list as its own term (missingbulb/Claudinite#1725): the
  // retired `frequency` field said weekly, and the schedule term is what it became.
  assert.ok(task.preconditions.includes("substantive-change"));
  // The legacy pair is gone: declaring either beside `preconditions` is a contract
  // violation, and the signal union is derived from the term.
  assert.equal(task.precondition, undefined);
  assert.equal(task.precondition_signals, undefined);
});

test("a window of only docs/generated churn declines — an opus run over unchanged source buys nothing", () => {
  const v = verdict(load(), commits([]));
  assert.equal(v.run, false);
  assert.match(v.reason, /no substantive default-branch change/);
});

test("a substantive window runs, and its Context names the commits as scope", () => {
  const v = verdict(load(), commits([sub("aaaaaaa1"), sub("bbbbbbb2")]));
  assert.equal(v.run, true);
  const context = v.context.join(" ");
  assert.match(context, /aaaaaaa/);
  assert.match(context, /bbbbbbb/);
});

// The reason the conversion is worth making rather than merely tidier. The cap's
// size is the engine's to choose, so a flood far past any plausible cap shows it:
// fewer shas named than given, and the rest counted exactly.
test("a flood of commits is capped, and says how many it dropped", () => {
  const flood = 500;
  const many = Array.from({ length: flood }, (_, i) => sub(String(i).padStart(7, "0")));
  const v = verdict(load(), commits(many));
  assert.equal(v.run, true);

  const context = v.context.join(" ");
  const named = context.match(/\b\d{7}\b/g) ?? [];
  assert.ok(named.length > 0 && named.length < flood, `the scope list is capped (named ${named.length} of ${flood})`);
  assert.match(context, new RegExp(`\\b${flood - named.length} further commit\\(s\\) are not named here`));
});

// The pending-round gate. A round edits the generic extractor and regenerates the
// coverage baseline off it, so a second round started while the first is still
// unreviewed measures itself against a baseline main has not accepted — and lands
// a second unreviewed change on the same files. The previous round's PR is
// recognized by the exact title prefix task.md tells the run to use.
const PREFIX = "Generic coverage:";

// The prefix is the whole handshake between task.md and the declaration, so a run
// that titles its PR anything else goes unrecognized and the next round stacks on
// it. Pinning the exact string here is what makes editing one side visible.
test("the prefix the declaration matches is the one task.md tells the run to write", () => {
  const taskMd = fs.readFileSync(`${__dirname}/../task.md`, "utf8");
  assert.ok(taskMd.includes(`\`${PREFIX} `),
    "task.md must instruct the run to title its PR with the prefix the precondition reads");
  const { task } = load();
  assert.ok(task.preconditions.includes(`no-open-pr-titled:${PREFIX}`));
});

// What a round may land unattended, judged by the pinned engine under the task's
// own automerge: the generic extractor ships, so its diff carries the patch bump.
const BUMP = [
  { file: "extension/manifest.json", kind: "modified" },
  { file: "package.json", kind: "modified" },
];
const ROUND = [
  { file: "extension/event-extractors/generic-extractor.js", kind: "modified" },
  { file: "extension/event-extractors/helpers/dates.js", kind: "modified" },
  { file: "extension-test/event-extractors/extraction.test.js", kind: "modified" },
  { file: "dev/requirements/extractor/generic-coverage/generic-coverage.baseline.GENERATED.json", kind: "modified" },
  { file: "dev/requirements/extractor/generic-coverage/generic-coverage.GENERATED.md", kind: "modified" },
];

test("the policy covers a round with its version bump", () => {
  const verdict = taskPolicy(`${__dirname}/..`)([...ROUND, ...BUMP]);
  assert.equal(verdict.mergeable, true, verdict.why);
});

test("a per-site source, a deleted helper or a deleted version record still parks the round", () => {
  const policy = taskPolicy(`${__dirname}/..`);
  for (const stray of [
    { file: "extension/event-extractors/custom/dice.js", kind: "modified" },
    { file: "extension/event-extractors/helpers/dates.js", kind: "deleted" },
    { file: "extension/manifest.json", kind: "deleted" },
    { file: "extension/host-lists.json", kind: "modified" },
  ]) {
    const verdict = policy([...ROUND.filter((c) => c.file !== stray.file), ...BUMP.filter((c) => c.file !== stray.file), stray]);
    assert.equal(verdict.mergeable, false, `${stray.file} (${stray.kind}) must not be coverable`);
    assert.ok(verdict.problems.some((p) => p.file === stray.file), `${stray.file} must be named as the refusal`);
  }
});
