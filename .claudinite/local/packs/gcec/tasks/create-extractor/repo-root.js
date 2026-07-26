// The repo root, for the create-extractor task's helpers.
//
// This task moved once already (dev/routines/create-extractor/ → here), and every
// helper that had counted "../.." levels from its own file broke silently in the
// move — the count is a fact about the folder's depth, not about the helper. So
// resolve it instead of counting: honour CLAUDINITE_REPO_ROOT when the scheduler
// set it (preprocessing runs with cwd = the task dir), else walk up from this file
// to the nearest directory carrying package.json.
//
// Pure Node, no dependencies, correct under both callers: the Action-side worker
// (env set) and a plain `node --test` run of the unit tests (env unset).
"use strict";

const fs = require("node:fs");
const path = require("node:path");

function findRepoRoot(from = __dirname) {
  const fromEnv = process.env.CLAUDINITE_REPO_ROOT;
  if (fromEnv && fs.existsSync(path.join(fromEnv, "package.json"))) return fromEnv;

  let dir = from;
  for (;;) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`repo-root: no package.json above ${from}`);
    dir = parent;
  }
}

module.exports = { findRepoRoot, ROOT: findRepoRoot() };
