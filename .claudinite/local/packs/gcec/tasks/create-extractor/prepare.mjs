// create-extractor preprocessing — everything deterministic about turning an
// `extractor-request` issue into a branch an agent can write `extract()` on.
//
// The scheduler runs THIS FILE as a subprocess (cwd = this task dir, Action-side,
// bounded by `agent_preprocessing_timeout`) when the precondition found an
// eligible request. It absorbs what used to be four numbered scripts, a JSON
// hand-off through the agent, and a whole second workflow:
//
//   1. read the open `extractor-request` issues (bodies included — the scheduler's
//      `issues` signal deliberately carries none, so the precondition cannot and
//      must not triage);
//   2. triage each eligible one oldest-first (triage.js, over the committed
//      sources' real matches() + the popup's classifyHost) and CLOSE every
//      deny/allow/duplicate with its canned message — no agent, no branch;
//   3. for the first request that genuinely needs an extractor: claim it, branch,
//      scaffold, prove the offline baseline green, and commit;
//   4. RECORD THE PAGE through ScraperAPI directly. Preprocessing runs inside
//      Actions, where SCRAPER_API_KEY already lives (the task names it in
//      `required_secrets`, which the wiring converge stamps into the workflow).
//      The `fetch-page.yml` workflow existed solely to hold that secret for an
//      agent that couldn't — dispatch, poll, pull. Deleted; this is one fetch in
//      the same process that needs the bytes;
//   5. push, open the DRAFT PR the agent continues on, and request the agent
//      (CLAUDINITE_REQUEST_AGENT).
//
// A run that finds only closeable requests, or cannot record a page, requests NO
// agent — the hours where nothing needs judgment cost no model at all.
//
// No code→agent data channel (agent-preprocessing DESIGN §3): everything the agent
// needs is IN THE REPO — the pushed branch, its scaffold, the recorded page, and
// the draft PR it finds by head-branch prefix. Nothing is threaded through the
// dispatch issue.
//
// Exit codes are the task's contract: 0 = handled (with or without an agent),
// non-zero = the task FAILED and the scheduler converges it to `needs-human`. A
// request we deliberately hand to a human (unfetchable page) is a 0 — it is a
// correct outcome, not a broken run.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { recordPage } from '../../scraperapi.mjs';

const require = createRequire(import.meta.url);
const { runTriage } = require('./triage.js');
const { addSample } = require('./attach-sample-url.js');

const API = 'https://api.github.com';
const REQUEST_LABEL = 'extractor-request';
const BLOCKED_LABEL = 'extractor-blocked-needs-human';
// The claim label. It is what makes the precondition's cheap gate correct across
// hours: the scheduler runs this task hourly and does NOT know a previous run is
// still in flight (preprocessing runs before, and independently of, the dispatch
// issue's at-most-one-open guard). A claimed request drops out of the precondition's
// eligible set, so an in-flight extractor is never scaffolded twice.
const CLAIMED_LABEL = 'extractor-in-progress';
const DATA_DIR = 'dev/requirements/extractor/data/server-fetched';

// --- pure helpers (unit-tested; no I/O) --------------------------------------

// The requests this run may act on, oldest first. Mirrors the precondition's
// eligibility exactly (task.mjs `eligibleRequests`) so the gate and the worker can
// never disagree about what "eligible" means — the worker re-derives it from full
// issue objects rather than trusting the gate's older snapshot.
export function eligible(issues) {
  const labelsOf = (i) => (i.labels ?? []).map((l) => (typeof l === 'string' ? l : l?.name ?? ''));
  return (issues ?? [])
    .filter((i) => !i.pull_request)
    .filter((i) => {
      const labels = labelsOf(i);
      return labels.includes(REQUEST_LABEL)
        && !labels.includes(BLOCKED_LABEL)
        && !labels.includes(CLAIMED_LABEL);
    })
    .sort((a, b) => a.number - b.number);
}

// The PR title for a finished run, by mode — the same two phrasings the routine
// spec used to ask the agent to write by hand.
export function prTitle(mode, host, sourceBase) {
  return mode === 'supported'
    ? `Add an integration case for ${host} (hardens ${sourceBase})`
    : `Implement the extractor for ${host}`;
}

// --- I/O shell ---------------------------------------------------------------

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });

let ROOT;
let REPO;
let TOKEN;

const git = (...args) => run('git', ['-C', ROOT, ...args]);
const npm = (...args) => run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] });

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

const comment = (n, text) => gh(`/repos/${REPO}/issues/${n}/comments`, { method: 'POST', body: { body: text } });

// GitHub 422s when an unknown label is applied and never creates one on demand, so
// the thing that assigns a label guarantees it first (idempotent; self-healing if
// someone deletes it).
async function ensureLabel(name, color, description) {
  const { status } = await gh(`/repos/${REPO}/labels`, { method: 'POST', body: { name, color, description } });
  if (status !== 201 && status !== 422) console.log(`! could not ensure label "${name}": ${status}`);
}

const addLabel = (n, name) => gh(`/repos/${REPO}/issues/${n}/labels`, { method: 'POST', body: { labels: [name] } });
const removeLabel = (n, name) => gh(`/repos/${REPO}/issues/${n}/labels/${encodeURIComponent(name)}`, { method: 'DELETE' });
const closeNotPlanned = (n) => gh(`/repos/${REPO}/issues/${n}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'not_planned' } });

// Every open issue carrying the request label, bodies included. The scheduler's
// `issues` signal drops bodies (they would bloat every task's collection), which is
// precisely why triage cannot live in the precondition.
async function openRequests() {
  const out = [];
  for (let page = 1; ; page += 1) {
    const { status, json } = await gh(`/repos/${REPO}/issues?state=open&labels=${REQUEST_LABEL}&per_page=100&page=${page}`);
    if (status !== 200 || !Array.isArray(json) || json.length === 0) break;
    out.push(...json);
    if (json.length < 100) break;
  }
  return out;
}

// Close a request that needs no extractor, with triage's canned message. `sample`
// additionally folds this page into the leader issue as an extra sample page, so a
// duplicate request's URL is banked rather than discarded.
async function closeSkipped(issue, decision) {
  if (decision.reason === 'sample' && decision.duplicateOf) {
    const { status, json: leader } = await gh(`/repos/${REPO}/issues/${decision.duplicateOf}`);
    if (status === 200) {
      const body = addSample(leader.body ?? '', decision.url);
      if (body !== (leader.body ?? '')) {
        await gh(`/repos/${REPO}/issues/${decision.duplicateOf}`, { method: 'PATCH', body: { body } });
      }
    }
  }
  await comment(issue.number, decision.message);
  await closeNotPlanned(issue.number);
  console.log(`create-extractor: closed #${issue.number} (${decision.reason})`);
}

// Hand a request to a human: say what went wrong on the issue, label it, and
// release the claim. Never a task failure — the pipeline correctly declining a page
// is a normal outcome.
async function handToHuman(number, why) {
  await ensureLabel(BLOCKED_LABEL, 'D93F0B', 'An automated extractor run stopped here and needs a maintainer');
  await comment(number, why);
  await addLabel(number, BLOCKED_LABEL);
  await removeLabel(number, CLAIMED_LABEL);
  console.log(`create-extractor: handed #${number} to a human — ${why}`);
}

// Branch, scaffold, prove the offline baseline green, and commit — the old
// 3-prepare.sh, minus the .url-only fetch dance. The offline suite does not read
// the recorded page (it runs on synthetic HTML), so proving green BEFORE the fetch
// is correct and keeps a bad scaffold from burning a ScraperAPI call.
function scaffold(decision) {
  git('checkout', '-B', decision.branch);
  const data = join(ROOT, DATA_DIR);
  mkdirSync(data, { recursive: true });
  // The .url is the single source of truth for the page's URL (live.test.js reads
  // it to set the DOM origin).
  writeFileSync(join(data, `${decision.caseName}.url`), decision.url);

  if (decision.mode === 'supported') {
    run(process.execPath, [join(import.meta.dirname, 'scaffold.js'), 'supported', decision.caseName, decision.host], { cwd: ROOT });
  } else {
    run(process.execPath, [join(import.meta.dirname, 'scaffold.js'), 'new', decision.caseName, decision.host, decision.url], { cwd: ROOT });
    npm('run', 'index');
  }
  npm('run', 'test:offline');
}

function commitAll(message) {
  git('add', '-A');
  git('-c', 'user.name=claudinite[bot]', '-c', 'user.email=claudinite@users.noreply.github.com', 'commit', '-m', message);
}

function push(branch) {
  git('push', '--force', `https://x-access-token:${TOKEN}@github.com/${REPO}.git`, `HEAD:refs/heads/${branch}`);
}

// The draft PR the agent continues on. Preprocessing pushed the branch, so the
// agent needs a way to find it that does not put a branch name in the dispatch
// issue — agent-preprocessing DESIGN §5's answer is exactly this: the family's open
// PR, discovered by head-branch prefix. DRAFT because the extractor is not written
// yet; the agent marks it ready for review when the postconditions pass.
async function openDraftPr(decision, base, issueNumber) {
  const body = [
    `Closes #${issueNumber}`,
    '',
    `Automated extractor pipeline for \`${decision.host}\` (${decision.mode === 'supported' ? 'adds an integration case to an existing source' : 'new source'}).`,
    '',
    'Scaffold, the recorded page, and a green offline baseline were prepared deterministically by the',
    '`gcec/create-extractor` task\'s preprocessing. The extractor implementation and the case values are',
    'the agent stage\'s work; this PR is a draft until they land and its postconditions pass.',
  ].join('\n');
  const { status, json } = await gh(`/repos/${REPO}/pulls`, {
    method: 'POST',
    body: { head: decision.branch, base, title: prTitle(decision.mode, decision.host, decision.sourceBase), body, draft: true },
  });
  if (status >= 300) throw new Error(`could not open the draft PR: ${status} ${JSON.stringify(json?.errors ?? json?.message ?? '')}`);
  return json.number;
}

export async function main() {
  ROOT = process.env.CLAUDINITE_REPO_ROOT || process.cwd();
  REPO = process.env.CLAUDINITE_REPO || process.env.GITHUB_REPOSITORY;
  TOKEN = process.env.GITHUB_TOKEN;
  const base = process.env.CLAUDINITE_DEFAULT_BRANCH || 'main';
  const requestFile = process.env.CLAUDINITE_REQUEST_AGENT;
  // Named in task.mjs's `required_secrets`, so the wiring converge put it in this
  // process's env and baselining has asked the owner for it if it isn't set.
  // Nothing gates on that ask, so check it here and say so plainly.
  const scraperKey = process.env.SCRAPER_API_KEY;
  if (!REPO || !TOKEN) throw new Error('no CLAUDINITE_REPO/GITHUB_TOKEN — not in an Actions context');
  if (!scraperKey) throw new Error('SCRAPER_API_KEY is not set');

  const requests = eligible(await openRequests());
  if (!requests.length) {
    console.log('create-extractor: no eligible request (the precondition\'s snapshot is stale) — nothing to do');
    return;
  }

  // Triage oldest-first, closing everything that needs no extractor. Closing is
  // cheap, so a backlog of denied/duplicate requests drains in ONE run rather than
  // one per hour; the first request that genuinely needs an extractor stops the
  // loop and gets the branch.
  const peers = requests.map((i) => ({ number: i.number, title: i.title, body: i.body ?? '' }));
  let target = null;
  let decision = null;
  for (const issue of requests) {
    const d = await runTriage({ body: issue.body ?? '', title: issue.title, number: issue.number }, undefined, peers);
    if (d.skipAgent) { await closeSkipped(issue, d); continue; }
    if (!d.url || !d.branch) {
      await handToHuman(issue.number, 'This request has no parseable event URL, so the pipeline could not act on it. Edit the issue to include the event page URL and remove the `extractor-blocked-needs-human` label to retry.');
      continue;
    }
    target = issue;
    decision = d;
    break;
  }
  if (!target) {
    console.log('create-extractor: every eligible request was triaged closed — no agent needed');
    return;
  }

  // Claim it before any expensive work, so the next hourly run's precondition sees
  // it as in flight even if this run dies partway.
  await ensureLabel(CLAIMED_LABEL, '0E8A16', 'An automated extractor run is working on this request');
  await addLabel(target.number, CLAIMED_LABEL);
  console.log(`create-extractor: #${target.number} → ${decision.host} (${decision.mode} mode, case ${decision.caseName})`);

  npm('ci');
  scaffold(decision);
  commitAll(decision.mode === 'supported'
    ? `chore: scaffold ${decision.caseName} case for ${decision.host} (Refs #${target.number})`
    : `chore: scaffold ${decision.caseName} extractor (Refs #${target.number})`);

  // Record the page. An unfetchable page (bot wall, dead URL, empty render) is a
  // legitimate dead end, not a task failure: hand the request to a human, drop the
  // branch, and end the run quietly with no agent.
  const outPath = join(ROOT, DATA_DIR, `${decision.caseName}.html`);
  try {
    const bytes = await recordPage(scraperKey, decision, outPath);
    console.log(`create-extractor: recorded ${bytes} bytes for ${decision.caseName}`);
  } catch (e) {
    git('checkout', base);
    git('branch', '-D', decision.branch);
    await handToHuman(target.number, `The event page could not be recorded, so no extractor was attempted: ${e.message}\n\nThis is usually a bot wall, a dead URL, or a page that renders nothing without interaction. Remove the \`${BLOCKED_LABEL}\` label to retry.`);
    return;
  }
  commitAll(`chore: record ${decision.caseName} page via ScraperAPI (Refs #${target.number})`);

  push(decision.branch);
  const pr = await openDraftPr(decision, base, target.number);
  console.log(`create-extractor: pushed ${decision.branch} and opened draft PR #${pr}`);

  // Request the agent stage: a real page is recorded and an extract() is left to
  // write. This is a pure control signal — the agent discovers the branch, the
  // scaffold, and the page by reading the repo (§3).
  if (requestFile) writeFileSync(requestFile, 'agent-requested\n');
  console.log('create-extractor: requested the agent stage');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`create-extractor preprocessing failed: ${e.message}`); process.exit(1); });
}
