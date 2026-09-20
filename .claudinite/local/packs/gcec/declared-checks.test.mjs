// Red-first fixture tests for gcec's declared-checks.json — unlike the rule
// modules beside this file (dependency-free so they also run with no mount),
// a declared check's real behavior only exists once the engine's own compiler
// and PreToolUse guard runtime have read it, so these tests import that engine
// straight from the vendored, tracked .claudinite/shared/ tree (see .gitignore:
// "canon at .claudinite/shared/ and the local packs are tracked") rather than
// re-implementing the guardToolCalls semantics by hand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDeclaredChecks, guardFindings } from '../../../shared/engine/checks/helpers/pattern-rules.mjs';

const rules = loadDeclaredChecks(new URL('.', import.meta.url).pathname.replace(/\/$/, ''));
const ruleById = (id) => {
  const rule = rules.find((r) => r.id === id);
  assert.ok(rule, `declared-checks.json has no rule "${id}"`);
  return rule;
};

test('github-list-search-missing-perpage: fires on search_issues/list_issues/actions_list with no perPage', () => {
  const rule = ruleById('github-list-search-missing-perpage');
  for (const tool of ['mcp__github__search_issues', 'mcp__github__list_issues', 'mcp__github__actions_list']) {
    const findings = guardFindings(rule, { name: tool, input: { owner: 'a', repo: 'b' } });
    assert.equal(findings.length, 1, `${tool} with no perPage should fire`);
    assert.match(findings[0].what, /no perPage cap/);
  }
});

test('github-list-search-missing-perpage: quiet once perPage is set, and for an unrelated tool', () => {
  const rule = ruleById('github-list-search-missing-perpage');
  assert.deepEqual(
    guardFindings(rule, { name: 'mcp__github__search_issues', input: { owner: 'a', repo: 'b', perPage: 10 } }),
    [],
  );
  assert.deepEqual(
    guardFindings(rule, { name: 'mcp__github__list_pull_requests', input: { owner: 'a', repo: 'b' } }),
    [],
  );
});

test('github-job-logs-guessed-tail-lines: fires on a guessed large tail_lines (the #1101 shape)', () => {
  const rule = ruleById('github-job-logs-guessed-tail-lines');
  const findings = guardFindings(rule, {
    name: 'mcp__github__get_job_logs',
    input: { owner: 'a', repo: 'b', run_id: 1, tail_lines: 2406 },
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0].what, /tail_lines=2406/);
});

test('github-job-logs-guessed-tail-lines: quiet at the tool default, with no tail_lines, and for an unrelated tool', () => {
  const rule = ruleById('github-job-logs-guessed-tail-lines');
  assert.deepEqual(
    guardFindings(rule, { name: 'mcp__github__get_job_logs', input: { owner: 'a', repo: 'b', run_id: 1, tail_lines: 500 } }),
    [],
  );
  assert.deepEqual(
    guardFindings(rule, { name: 'mcp__github__get_job_logs', input: { owner: 'a', repo: 'b', run_id: 1 } }),
    [],
  );
  assert.deepEqual(
    guardFindings(rule, { name: 'mcp__github__actions_list', input: { method: 'list_workflow_jobs', tail_lines: 2406 } }),
    [],
  );
});

test('git-checkout-paths-and-branch-move-combined: fires on the #734 shape, either order', () => {
  const rule = ruleById('git-checkout-paths-and-branch-move-combined');
  const forward = guardFindings(rule, {
    name: 'Bash',
    input: { command: 'git checkout old-branch -- src/foo.js && git checkout -b new-branch origin/main' },
  });
  assert.equal(forward.length, 1);
  assert.match(forward[0].what, /path-restoring/);

  const reversed = guardFindings(rule, {
    name: 'Bash',
    input: { command: 'git checkout -b new-branch origin/main && git checkout old-branch -- src/foo.js src/bar.js' },
  });
  assert.equal(reversed.length, 1);
});

test('git-checkout-paths-and-branch-move-combined: quiet on either alone, and for an unrelated command', () => {
  const rule = ruleById('git-checkout-paths-and-branch-move-combined');
  assert.deepEqual(
    guardFindings(rule, { name: 'Bash', input: { command: 'git checkout -b new-branch origin/main' } }),
    [],
  );
  assert.deepEqual(
    guardFindings(rule, { name: 'Bash', input: { command: 'git checkout old-branch -- src/foo.js' } }),
    [],
  );
  assert.deepEqual(
    guardFindings(rule, { name: 'Bash', input: { command: 'npm run build -- --prod && git checkout -b feature' } }),
    [],
  );
  assert.deepEqual(
    guardFindings(rule, { name: 'Bash', input: { command: 'git checkout main' } }),
    [],
  );
});
