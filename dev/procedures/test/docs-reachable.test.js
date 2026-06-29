// Guards against orphaned docs: every Markdown file under dev/procedures/ must be
// reachable from a root doc (CLAUDE.md or README.md) by following the same
// navigation an agent or reader uses — CLAUDE.md's `@imports` and Markdown
// `[text](path.md)` links. A new doc that nobody imports or links to is
// invisible (it bit agenticBestPractices.md, which sat orphaned between
// being created and being wired into CLAUDE.md). This catches that drift
// structurally, with no hand-maintained list to keep in sync.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..", "..");

// The entry points a human/agent starts from. Not docs themselves, so they're
// roots rather than required targets.
const ROOTS = ["CLAUDE.md", "README.md"];

// Every doc that must be reachable, repo-root-relative and POSIX-separated. We list
// only SOURCE-CONTROLLED docs (git's tracked-file list, not a filesystem walk), so
// anything gitignored — e.g. a read-only vendored canon synced in as an artifact —
// is never policed as an orphan, with no path to hardcode. (We own only what we
// commit; a synced corpus owns its own internal navigation.)
function allDocs() {
  return execSync("git ls-files -z -- dev/procedures", { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter((f) => f.endsWith(".md"));
}

// References out of one file, resolved to repo-root-relative .md targets:
//  - `@dev/procedures/foo.md`            — CLAUDE.md imports, repo-root-relative
//  - `](path.md)` / `](p.md#a)` — Markdown links, relative to the file's dir
function refsFrom(relFile) {
  const text = fs.readFileSync(path.join(ROOT, relFile), "utf8");
  const here = path.posix.dirname(relFile);
  const targets = new Set();

  for (const m of text.matchAll(/@([\w./-]+\.md)\b/g)) {
    targets.add(path.posix.normalize(m[1]));
  }
  for (const m of text.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)) {
    const link = m[1];
    if (/^[a-z]+:\/\//i.test(link)) continue; // skip external URLs
    targets.add(path.posix.normalize(path.posix.join(here, link)));
  }
  return [...targets];
}

test("every doc under dev/procedures/ is reachable from CLAUDE.md or README.md", () => {
  for (const r of ROOTS) {
    assert.ok(fs.existsSync(path.join(ROOT, r)), `root doc missing: ${r}`);
  }

  // BFS over every reachable Markdown file (not just dev/procedures/), so a doc reachable
  // only via README -> PRIVACY.md -> ... still counts.
  const visited = new Set();
  const queue = [...ROOTS];
  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file) || !fs.existsSync(path.join(ROOT, file))) continue;
    visited.add(file);
    for (const t of refsFrom(file)) if (!visited.has(t)) queue.push(t);
  }

  const orphans = allDocs().filter((d) => !visited.has(d));
  assert.deepEqual(
    orphans,
    [],
    `unreachable docs (import them from CLAUDE.md or link them from a reachable doc):\n  ${orphans.join("\n  ")}`,
  );
});
