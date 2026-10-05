// The pinned engine's task decision cores, for the gcec tasks' tests:
// `cn tasks <kind> --world <file>` answers one of them over a JSON world. The
// engine is the repo's own pinned cn, linked by `sh .claudinite/launch version`.
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const PACK = path.join(__dirname, "..");
const ROOT = path.join(PACK, "../../../..");

function cnAnswer(kind, world) {
  const cn = path.join(ROOT, ".claudinite/bin/cn");
  assert.ok(fs.existsSync(cn), `${cn} is missing; run \`sh .claudinite/launch version\` to link the pinned engine`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gcec-cn-"));
  try {
    fs.writeFileSync(path.join(dir, "world.json"), JSON.stringify(world));
    return JSON.parse(execFileSync(cn, ["tasks", kind, "--world", path.join(dir, "world.json")], { encoding: "utf8" }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// The task in taskDir as the engine normalizes it, asserting the contract holds.
// terms are the ones its preconditions.mjs exports, as the contract reads them.
function loadTask(taskDir, terms = {}) {
  const [{ normalized, problems }] = cnAnswer("contract", {
    declarations: [{ declaration: JSON.parse(fs.readFileSync(path.join(taskDir, "task.json"), "utf8")), terms }],
  });
  assert.deepEqual(problems, [], "the task declaration must satisfy the contract");
  return normalized;
}

// A judge of a diff under the task's own automerge and the pack's merge rules.
// A change is a path (an addition) or { file, kind: "modified" | "deleted" }.
function taskPolicy(taskDir, terms) {
  const { automerge } = loadTask(taskDir, terms);
  const rules = JSON.parse(fs.readFileSync(path.join(PACK, "merge-rules.json"), "utf8"));
  return (changes) => {
    const entries = changes.map((c) => {
      const { file, kind = "added" } = typeof c === "string" ? { file: c } : c;
      return { file, before: kind === "added" ? null : "x", after: kind === "deleted" ? null : "y" };
    });
    const { ruleErrors, verdicts } = cnAnswer("policy", {
      packs: [{ id: "local/gcec", rules }],
      cases: [{ policy: automerge, entries }],
    });
    assert.deepEqual(ruleErrors, [], "the pack's merge-rules.json must compile");
    return verdicts[0];
  };
}

module.exports = { cnAnswer, loadTask, taskPolicy };
