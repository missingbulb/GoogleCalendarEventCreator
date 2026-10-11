#!/usr/bin/env node
// The version half of an unattended gcec run's scope: a branch that ships
// anything raises the patch exactly once, and touches the two version records
// in nothing but their version. The merge policy covers those two files by path
// alone, so this is what holds their content when a task's postcondition runs.
//
//   node lib/version-change.mjs <base-ref>
//
// Exit 0 when the branch's version change is right for what it ships, 1 naming
// each problem otherwise. The version scheme and the release config are read
// through the vendored release actions, so the shipped set is the one the
// release pipeline and the chrome-extension pack's version-bumped check use.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// The base and head text of each version record, the files the branch changed,
// and the release config's ship roots, judged without I/O. A record's text is
// null where the side has no such file.
export function judgeVersionChange({ changed, roots, records, nextVersion, readVersion }) {
  const problems = [];
  const versions = {};
  for (const { path, base, head } of records) {
    if (base === null || head === null) {
      if (base !== head) problems.push(`${path} is ${base === null ? 'added' : 'deleted'} — only its version may change`);
      continue;
    }
    let from;
    let to;
    try {
      from = readVersion(path, base);
      to = readVersion(path, head);
    } catch (e) {
      problems.push(e.message);
      continue;
    }
    const token = (v) => `"version": "${v}"`;
    if (base.replace(token(from), '\0') !== head.replace(token(to), '\0')) {
      problems.push(`${path} changes beyond its "version" field — only the version may change here`);
    }
    versions[path] = { from, to };
  }
  if (problems.length) return problems;

  const recordPaths = new Set(records.map((r) => r.path));
  const shipped = changed.filter((f) => !recordPaths.has(f) && roots.some((r) => f === r || f.startsWith(`${r}/`)));
  for (const { path } of records) {
    const { from, to } = versions[path];
    if (shipped.length) {
      const want = nextVersion(from, 'patch');
      if (to !== want) {
        problems.push(`${path} is at ${to}, but this branch ships ${shipped[0]}${shipped.length > 1 ? `, +${shipped.length - 1} more` : ''} — raise it once, ${from} → ${want}`);
      }
    } else if (to !== from) {
      problems.push(`${path} moves ${from} → ${to}, but this branch ships nothing — a bump with no shipped change releases an identical build`);
    }
  }
  return problems;
}

function git(root, ...args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const [ref] = argv;
  if (!ref) {
    console.error('usage: version-change.mjs <base-ref>');
    return 2;
  }
  const root = git(process.cwd(), 'rev-parse', '--show-toplevel').trim();
  const actions = join(root, '.github/actions');
  const { parseConfig, CONFIG_PATH } = await import(pathToFileURL(join(actions, 'read-release-config/read-config.mjs')));
  const { nextVersion, readVersion } = await import(pathToFileURL(join(actions, 'bump-extension-patch/bump.mjs')));
  const { cfg, errors } = parseConfig(readFileSync(join(root, CONFIG_PATH), 'utf8'));
  if (errors.length) {
    console.error(errors.join('\n'));
    return 1;
  }
  const lines = (s) => (s ?? '').split('\n').filter(Boolean);
  const changed = [...new Set([
    ...lines(git(root, 'diff', '--name-only', `${ref}...HEAD`)),
    ...lines(git(root, 'diff', '--name-only', 'HEAD')),
    ...lines(git(root, 'ls-files', '--others', '--exclude-standard')),
  ])];
  const read = (p) => {
    try {
      return readFileSync(join(root, p), 'utf8');
    } catch {
      return null;
    }
  };
  const records = [cfg.manifest_path, cfg.package_json_path].map((path) => ({
    path,
    base: git(root, 'show', `${ref}:${path}`),
    head: read(path),
  }));
  const problems = judgeVersionChange({
    changed,
    roots: cfg.ship_paths.split(/\s+/).filter(Boolean),
    records,
    nextVersion,
    readVersion,
  });
  for (const p of problems) console.error(p);
  return problems.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = await main();
}
