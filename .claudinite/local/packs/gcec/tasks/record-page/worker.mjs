// record-page worker — record every live case whose `.url` is committed but whose
// `.html` is not, and deliver them as one PR. Agentless: the scheduler runs this
// file as a subprocess and there is no agent stage after it.
//
// Replaces the hand-dispatched `fetch-page.yml`. The old flow was: push a branch,
// dispatch a workflow with case_name/url/wait_for_selector inputs, poll it to
// completion, pull its commit. The new one has no inputs and no dispatch — the
// committed `.url` files ARE the request, and a missing sibling `.html` is the
// whole trigger condition. Anything already recorded is skipped, so re-running is
// free and a partially-failed run resumes on the next one.
//
// The `.url` is the single source of truth for a page's URL (live.test.js reads it
// to set the DOM origin), which is what makes this derivable rather than declared
// twice.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { recordPage } from '../../scraperapi.mjs';

const DATA_DIR = 'dev/requirements/extractor/data/server-fetched';
const BRANCH_PREFIX = 'claude/record-pages';
const API = 'https://api.github.com';

// --- pure helpers (unit-tested) ----------------------------------------------

// The case names needing a record: a `<name>.url` with no `<name>.html` beside it.
// `entries` is a directory listing; `has` answers "is this file present".
export function pendingCases(entries, has) {
  return entries
    .filter((f) => f.endsWith('.url'))
    .map((f) => f.slice(0, -'.url'.length))
    .filter((name) => !has(`${name}.html`))
    .sort();
}

// The head branch of the family's open PR, found by prefix, so repeated runs
// accumulate onto one PR instead of opening a new one each time. null → mint one.
export function openFamilyBranch(pulls, prefix = BRANCH_PREFIX) {
  const pr = (pulls ?? []).find((p) => String(p?.head?.ref ?? '').startsWith(prefix));
  return pr ? pr.head.ref : null;
}

// --- I/O shell ---------------------------------------------------------------

let ROOT;
let REPO;
let TOKEN;

const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

async function gh(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, json };
}

export async function main() {
  ROOT = process.env.CLAUDINITE_REPO_ROOT || process.cwd();
  REPO = process.env.CLAUDINITE_REPO || process.env.GITHUB_REPOSITORY;
  TOKEN = process.env.GITHUB_TOKEN;
  const base = process.env.CLAUDINITE_DEFAULT_BRANCH || 'main';
  const key = process.env.SCRAPER_API_KEY;
  if (!REPO || !TOKEN) throw new Error('no CLAUDINITE_REPO/GITHUB_TOKEN — not in an Actions context');
  if (!key) throw new Error('SCRAPER_API_KEY is not set');

  const dir = join(ROOT, DATA_DIR);
  if (!existsSync(dir)) { console.log('record-page: no cached-page directory — nothing to record'); return; }
  const pending = pendingCases(readdirSync(dir), (f) => existsSync(join(dir, f)));
  if (!pending.length) { console.log('record-page: every committed .url already has its page — nothing to record'); return; }

  const { json: pulls } = await gh(`/repos/${REPO}/pulls?state=open&per_page=100`);
  const existing = openFamilyBranch(Array.isArray(pulls) ? pulls : []);
  const branch = existing ?? `${BRANCH_PREFIX}-${new Date().toISOString().slice(0, 10)}`;
  git('checkout', '-B', branch);

  // Record each pending page. A page that cannot be recorded does NOT sink the run:
  // the others still land, and the failure is reported in the job summary and in the
  // PR body — a dead URL is a maintainer's call (re-point the .url), not a task
  // failure the scheduler should converge to needs-human.
  const recorded = [];
  const failed = [];
  for (const name of pending) {
    const url = readFileSync(join(dir, `${name}.url`), 'utf8').trim();
    try {
      const bytes = await recordPage(key, { url }, join(dir, `${name}.html`));
      recorded.push(name);
      console.log(`record-page: recorded ${bytes} bytes for ${name}`);
    } catch (e) {
      failed.push(`${name}: ${e.message}`);
      console.log(`! record-page: ${name} — ${e.message}`);
    }
  }
  if (!recorded.length) {
    git('checkout', base);
    console.log(`record-page: nothing recorded (${failed.length} failed) — no PR`);
    return;
  }

  git('add', '--', DATA_DIR);
  git('-c', 'user.name=claudinite[bot]', '-c', 'user.email=claudinite@users.noreply.github.com',
    'commit', '-m', `chore: record ${recorded.length} cached event page(s) via ScraperAPI`);
  git('push', '--force', `https://x-access-token:${TOKEN}@github.com/${REPO}.git`, `HEAD:refs/heads/${branch}`);

  if (!existing) {
    const body = [
      'Recorded the cached event page(s) for live cases whose `.url` is committed but whose page was not.',
      '',
      ...recorded.map((n) => `- \`${n}\``),
      ...(failed.length ? ['', 'Could not be recorded (re-point the `.url`, or drop the case):', ...failed.map((f) => `- ${f}`)] : []),
      '',
      'Filed by the `gcec/record-page` task. Merging this makes `test:live` green for these cases.',
    ].join('\n');
    const { status } = await gh(`/repos/${REPO}/pulls`, {
      method: 'POST', body: { head: branch, base, title: 'Record cached event pages', body },
    });
    if (status >= 300) throw new Error(`could not open the PR: ${status}`);
  }
  console.log(`record-page: delivered ${recorded.length} page(s) on ${branch}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`record-page preprocessing failed: ${e.message}`); process.exit(1); });
}
