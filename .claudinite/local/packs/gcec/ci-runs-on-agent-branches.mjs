// gcec local check: the workflow that gates PRs also runs on this repo's agent
// branches. The rule this converts is the merge-and-ci skill's "The push-run
// exists — don't dispatch a duplicate": `test.yml`'s `push` trigger covers `main`
// AND `claude/**` "precisely so an agent branch gets CI without a PR", and the
// whole poll-and-merge discipline downstream is written on top of that fact.
//
// Why a check and not just prose: this is a fact stated in prose ABOUT a file
// nothing else reads. Narrow that branch list (a tidy-up, a canon-shaped rewrite,
// a copy of another repo's stub) and nothing goes red — PRs still get their
// `pull_request` run, every suite still passes, and the branch list is the one
// place the change is visible. What breaks is quieter and one step away: the
// unattended tasks (create-extractor, generic-extractor-improvements) push a
// `claude/**` branch and expect CI to have started by the time they look, and the
// skill tells every session NOT to dispatch a run because "the push-run exists".
// With the pattern gone, that advice is simply wrong — a run that follows it waits
// for a check that will never appear, and one that doesn't buys a duplicate. The
// pre-PR real-Chrome e2e smoke that only the push run gives a dev branch goes with
// it. A prose fact about a config file with no reader is exactly the drift a static
// scan is for.
//
// SCOPE, and why it is not "test.yml must say claude/**": the filename is not the
// rule. What matters is that the workflow gating pull requests ALSO fires on an
// agent branch push, so the check finds that workflow by shape — a `pull_request`
// trigger plus a `push` trigger with an explicit `branches:` allow-list — and asks
// whether the list reaches `claude/<branch>`. Consequences of that framing, all in
// the safe direction:
//   * a `push:` with NO `branches:` key already fires on every branch — nothing to
//     check, so the rule stays quiet.
//   * a workflow that pushes but never gates PRs (chrome-extension-release.yml,
//     `push: branches: [main]`) is not a CI gate and is never flagged.
//   * a renamed or inline-`on:` workflow simply isn't matched. Under-reporting is
//     the safe error for a rule about a trigger.
//
// The branch patterns are matched as GITHUB BRANCH FILTERS, not as text: `*` does
// not cross a `/` and `**` does, so `main` and a bare `*` correctly fail to cover
// `claude/x` while `claude/*`, `claude/**` and `**` all pass. Negated entries
// (`!claude/wip`) are exclusions, never coverage, and are skipped.
//
// The `on:` block is PARSED (indentation-scoped) rather than grepped: `branches:`
// appears under `pull_request` too, and that one is legitimately `[main]` — a grep
// for the pattern anywhere in the file would pass a workflow whose push trigger had
// lost it entirely.
//
// Local-pack check modules are dependency-free on purpose (see
// test-offline-list-sync.mjs's header): plain finding objects, no engine imports,
// so they also load under the repo's own `npm test` (pack.test.mjs).
const id = 'ci-runs-on-agent-branches';
const severity = 'blocking';
const doc = '.claudinite/local/packs/gcec/skills/merge-and-ci/SKILL.md';
const why =
  "the unattended tasks push a claude/** branch and the merge-and-ci skill tells every session " +
  'the push-run already exists — drop the pattern and that advice waits for a check that never ' +
  'appears, and the pre-PR real-Chrome smoke a dev branch only gets from the push run goes too';

// The branch namespace every agent/unattended run in this repo works on. A probe,
// not a pattern: the check asks "does the allow-list reach a branch named like
// this?", so any covering pattern (claude/*, claude/**, **) passes.
const AGENT_BRANCH = 'claude/example-work';

const WORKFLOW = /^\.github\/workflows\/[^/]+\.ya?ml$/;

const indentOf = (line) => line.length - line.trimStart().length;
const isBlank = (line) => !line.trim() || line.trimStart().startsWith('#');

// The lines of the top-level `on:` mapping, each with its 1-based file line
// number. Returns null for a file with no `on:` key or an inline one
// (`on: [push, pull_request]`) — an inline form declares no branch list at all.
function onBlock(text) {
  const lines = (text || '').split('\n');
  const start = lines.findIndex((l) => /^on:/.test(l));
  if (start === -1) return null;
  if (lines[start].slice(3).trim()) return null; // inline mapping/sequence
  const block = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (isBlank(line)) continue;
    if (indentOf(line) === 0) break; // back to column 0: the `on:` mapping ended
    block.push({ line, n: i + 1 });
  }
  return block.length ? block : null;
}

// The entries of `block` nested under `key:`, plus the key's own line — i.e. the
// lines indented deeper than the key, up to the next sibling.
function child(block, key) {
  const at = block.findIndex(({ line }) => new RegExp(`^\\s*${key}:\\s*(#.*)?$`).test(line));
  if (at === -1) return null;
  const base = indentOf(block[at].line);
  const body = [];
  for (let i = at + 1; i < block.length; i += 1) {
    if (indentOf(block[i].line) <= base) break;
    body.push(block[i]);
  }
  return { keyLine: block[at].n, body };
}

const unquote = (s) => s.trim().replace(/^["']|["']$/g, '');

// A `branches:` allow-list in either YAML form: the flow sequence this repo uses
// (`branches: [main, "claude/**"]`) or a block sequence of `- ` items.
function branchList(body) {
  const at = body.findIndex(({ line }) => /^\s*branches:/.test(line));
  if (at === -1) return null;
  const rest = body[at].line.replace(/^\s*branches:/, '').trim();
  if (rest.startsWith('[')) {
    const inner = rest.slice(1, rest.lastIndexOf(']') === -1 ? rest.length : rest.lastIndexOf(']'));
    return { line: body[at].n, entries: inner.split(',').map(unquote).filter(Boolean) };
  }
  if (rest && !rest.startsWith('#')) return { line: body[at].n, entries: [unquote(rest)] };
  const base = indentOf(body[at].line);
  const entries = [];
  for (let i = at + 1; i < body.length; i += 1) {
    if (indentOf(body[i].line) <= base) break;
    const item = /^\s*-\s*(.+)$/.exec(body[i].line);
    if (item) entries.push(unquote(item[1].replace(/\s+#.*$/, '')));
  }
  return { line: body[at].n, entries };
}

// GitHub branch-filter globbing: `*` stops at a `/`, `**` crosses it.
function globToRe(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i += 1;
      } else {
        out += '[^/]*';
      }
      continue;
    }
    if (ch === '?') {
      out += '[^/]';
      continue;
    }
    out += ch.replace(/[.+^${}()|[\]\\]/, '\\$&');
  }
  return new RegExp(`^${out}$`);
}

export default {
  id,
  severity,
  description: "the PR-gating workflow's push trigger also covers this repo's claude/** agent branches",
  doc,
  why,

  run(ctx) {
    const findings = [];
    // ctx.files is the whole repo under the engine's default `all` sweep; a
    // --changed run narrows it, which only ever under-reports.
    for (const file of ctx.files) {
      if (!WORKFLOW.test(file)) continue;
      const block = onBlock(ctx.read(file));
      if (!block) continue;
      if (!child(block, 'pull_request')) continue; // not the PR gate
      const push = child(block, 'push');
      if (!push) continue;
      const branches = branchList(push.body);
      if (!branches) continue; // `push:` with no allow-list already fires on every branch
      const covered = branches.entries
        .filter((entry) => !entry.startsWith('!'))
        .some((entry) => globToRe(entry).test(AGENT_BRANCH));
      if (covered) continue;
      findings.push({
        rule: id,
        severity,
        file,
        line: branches.line,
        what: `${file} gates pull requests but its push trigger does not cover claude/** — its branches are [${branches.entries.join(', ')}]`,
        why,
        fix: `add "claude/**" to this workflow's \`push: branches:\` list (beside main), so a pushed agent branch gets CI — including the real-Chrome e2e smoke — before any PR exists`,
        doc,
      });
    }
    return findings;
  },
};
