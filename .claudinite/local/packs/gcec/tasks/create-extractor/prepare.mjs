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
//   3. for the first request that genuinely needs an extractor: claim it
//      (`agent-running`, the scheduler's own label — no custom vocabulary here),
//      branch, scaffold, prove the offline baseline green, and commit;
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
// Almost no code→agent data channel (agent-preprocessing DESIGN §3): everything the
// agent needs is IN THE REPO — the pushed branch, its scaffold, the recorded page.
// The one exception §3 now names is the IDENTITY of what this run created: the branch
// and draft-PR number ride the agent-request file into the dispatch issue, because the
// alternative — the agent finding its own PR by head-branch prefix — cannot tell "no
// PR exists" from "my search missed it" (Claudinite #649).
//
// Exit codes are the task's contract: 0 = handled (with or without an agent),
// non-zero = the task FAILED and the scheduler converges it to `needs-human`. A
// request we deliberately hand to a human (unfetchable page) is a 0 — it is a
// correct outcome, not a broken run.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { recordPage } from './scraperapi.mjs';

const require = createRequire(import.meta.url);
const { runTriage } = require('./triage.js');
const { addSample } = require('./attach-sample-url.js');

const API = 'https://api.github.com';
// `extractor-request` marks the issue KIND (the form applies it; it stays for the
// issue's life). Its STATE uses the scheduler's own labels rather than any
// invented here — the scheduler guarantees they exist before preprocessing runs,
// so nothing below has to create them:
//   agent-running — this pipeline owns the request (from claim until its PR lands)
//   needs-human   — handed over; the pipeline will not pick it up again
// `ready-for-agent` is never applied to a request: it is the executor's trigger.
const REQUEST_LABEL = 'extractor-request';
const CLAIMED_LABEL = 'agent-running';
const BLOCKED_LABEL = 'needs-human';
const BRANCH_PREFIX = 'claude/extractor/';
const RECORD_PREFIX = 'claude/record-pages';
const DATA_DIR = 'dev/requirements/extractor/data/server-fetched';

// How long a claimed request with nothing to show for it may sit before this
// pipeline releases it. The executor's stale-`agent-running` sweep covers dispatch
// issues only (it cannot know that a request stays claimed while its PR is in
// review), so releasing our OWN stale claims is this worker's job.
const STALE_CLAIM_MS = 6 * 60 * 60 * 1000;

// --- pure helpers (unit-tested; no I/O) --------------------------------------

// The requests this run may act on, oldest first. Mirrors the precondition's
// eligibility exactly so the gate and the worker can never disagree about what
// "eligible" means — the worker re-derives it from full issue objects rather than
// trusting the gate's older snapshot.
export const labelsOf = (i) => (i.labels ?? []).map((l) => (typeof l === 'string' ? l : l?.name ?? ''));

export function eligible(issues) {
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

// Claimed requests whose claim is stale: nothing this pipeline produced is still
// open for them (no `claude/extractor/*` PR says `Closes #N`) and the issue has
// been quiet past the grace period — so a run died between claiming and delivering.
// Releasing the claim makes them eligible again next hour. `openPrs` is the repo's
// open PRs; `now` is passed in so this is pure.
export function staleClaims(issues, openPrs, now) {
  const claimedByPr = new Set(
    (openPrs ?? [])
      .filter((pr) => String(pr?.head?.ref ?? '').startsWith(BRANCH_PREFIX))
      .flatMap((pr) => [...String(pr?.body ?? '').matchAll(/\bCloses #(\d+)/gi)].map((m) => Number(m[1]))),
  );
  return (issues ?? [])
    .filter((i) => (i.labels ?? []).some((l) => (typeof l === 'string' ? l : l?.name) === CLAIMED_LABEL))
    .filter((i) => !claimedByPr.has(i.number))
    .filter((i) => now - new Date(i.updated_at ?? 0).getTime() > STALE_CLAIM_MS)
    .map((i) => i.number);
}

// --- the pending-page sweep (was the record-page task) ------------------------
// A `.url` with no `.html` beside it is a case whose page is missing, which keeps
// `test:live` red until someone records it. Only gardening produces that state — a
// maintainer re-points a taken-down event and deletes the stale page — because a
// full pipeline run always writes the two together. It is a handful of lines over
// the recorder this file already owns, so it lives here rather than in a task of
// its own.

// The case names needing a record. `entries` is a directory listing; `has` answers
// "is this file present".
export function pendingCases(entries, has) {
  return entries
    .filter((f) => f.endsWith('.url'))
    .map((f) => f.slice(0, -'.url'.length))
    .filter((name) => !has(`${name}.html`))
    .sort();
}

// The head branch of the sweep's open PR, found by prefix, so repeated runs
// accumulate onto one PR instead of opening a new one each time. null → mint one.
export function openFamilyBranch(pulls, prefix = RECORD_PREFIX) {
  const pr = (pulls ?? []).find((p) => String(p?.head?.ref ?? '').startsWith(prefix));
  return pr ? pr.head.ref : null;
}

// A page fetch retries a transient 5xx (scraperapi.mjs), so a backlog can outlast
// `agent_preprocessing_timeout` — a hard SIGKILL that would land mid-loop and throw
// away pages already recorded, since the commit comes after the loop. So only START
// a fetch while a worst case still fits with room to deliver; anything skipped
// keeps no `.html` and is picked up next run.
//
// worstCaseFetchMs: recordPage's 4 attempts x 120s + ~50s of backoff.
export function hasRoomToStart(elapsedMs, budgetMs, worstCaseFetchMs = 530_000, deliveryMs = 60_000) {
  return elapsedMs + worstCaseFetchMs + deliveryMs <= budgetMs;
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

// Push, retrying transient network failures on the same 0/2/4/8/16s back-off
// 3-prepare.sh used. A push that fails once here would otherwise throw away a
// scaffold, an offline-suite run and a paid page fetch.
function push(branch, waitMs = [2000, 4000, 8000, 16000]) {
  const remote = `https://x-access-token:${TOKEN}@github.com/${REPO}.git`;
  for (let attempt = 0; ; attempt += 1) {
    try {
      git('push', '--force', remote, `HEAD:refs/heads/${branch}`);
      return;
    } catch (e) {
      if (attempt >= waitMs.length) throw e;
      execFileSync(process.execPath, ['-e', `setTimeout(()=>{}, ${waitMs[attempt]})`]);
    }
  }
}

// The draft PR the agent continues on. Its NUMBER is handed to the agent through the
// dispatch issue (see the handoff at the foot of main), so the agent never searches for
// it; the `claude/extractor/` prefix below survives only as this task's own bookkeeping
// — reclaiming stale requests — and no longer as anyone's lookup key. DRAFT because the
// extractor is not written yet; the agent marks it ready when the postconditions pass.
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

// Record every case whose `.url` is committed but whose `.html` is not, and deliver
// them on the sweep's own branch/PR (separate from any extractor PR — a missing page
// is a repo-maintenance fix, not part of implementing a site). Returns the number
// recorded. A page that will not record does NOT sink the run: the others still
// land and the failure is reported in the PR body.
async function sweepPendingPages(key, base, budgetMs) {
  const dir = join(ROOT, DATA_DIR);
  if (!existsSync(dir)) return 0;
  const pending = pendingCases(readdirSync(dir), (f) => existsSync(join(dir, f)));
  if (!pending.length) return 0;

  const { json: pulls } = await gh(`/repos/${REPO}/pulls?state=open&per_page=100`);
  const existing = openFamilyBranch(Array.isArray(pulls) ? pulls : []);
  const branch = existing ?? `${RECORD_PREFIX}-${new Date().toISOString().slice(0, 10)}`;
  git('checkout', '-B', branch);

  const startedAt = Date.now();
  const recorded = [];
  const failed = [];
  const deferred = [];
  for (const name of pending) {
    // Always attempt the first: a budget too small for even one page is a
    // declaration bug, and failing loudly beats silently recording nothing.
    if (recorded.length + failed.length > 0 && !hasRoomToStart(Date.now() - startedAt, budgetMs)) {
      deferred.push(name);
      continue;
    }
    const url = readFileSync(join(dir, `${name}.url`), 'utf8').trim();
    try {
      const bytes = await recordPage(key, { url }, join(dir, `${name}.html`));
      recorded.push(name);
      console.log(`create-extractor: recorded ${bytes} bytes for the pending case ${name}`);
    } catch (e) {
      failed.push(`${name}: ${e.message}`);
      console.log(`! create-extractor: pending case ${name} — ${e.message}`);
    }
  }
  if (deferred.length) console.log(`create-extractor: ${deferred.length} pending page(s) left for the next run: ${deferred.join(', ')}`);
  if (!recorded.length) {
    git('checkout', base);
    console.log(`create-extractor: no pending page recorded (${failed.length} failed)`);
    return 0;
  }

  git('add', '--', DATA_DIR);
  git('-c', 'user.name=claudinite[bot]', '-c', 'user.email=claudinite@users.noreply.github.com',
    'commit', '-m', `chore: record ${recorded.length} cached event page(s) via ScraperAPI [skip ci]`);
  push(branch);
  if (!existing) {
    const body = [
      'Recorded the cached event page(s) for live cases whose `.url` is committed but whose page was not.',
      '',
      ...recorded.map((n) => `- \`${n}\``),
      ...(failed.length ? ['', 'Could not be recorded (re-point the `.url`, or drop the case):', ...failed.map((f) => `- ${f}`)] : []),
      '',
      'Filed by the `gcec/create-extractor` task. Merging this makes `test:live` green for these cases.',
    ].join('\n');
    const { status } = await gh(`/repos/${REPO}/pulls`, {
      method: 'POST', body: { head: branch, base, title: 'Record cached event pages', body },
    });
    if (status >= 300) throw new Error(`could not open the recorded-pages PR: ${status}`);
  }
  git('checkout', base);
  console.log(`create-extractor: delivered ${recorded.length} recorded page(s) on ${branch}`);
  return recorded.length;
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

  // The pending-page sweep first: it is independent of any request, and cheap when
  // there is nothing to do (one directory listing).
  const { default: decl } = await import('./task.mjs');
  await sweepPendingPages(scraperKey, base, decl.agent_preprocessing_timeout * 1000);

  const allRequests = await openRequests();

  // Release our own stale claims first (the executor's sweep covers dispatch
  // issues only). A request claimed by a run that died before delivering becomes
  // eligible again; one whose PR is still open stays claimed however long review
  // takes.
  const { json: openPrs } = await gh(`/repos/${REPO}/pulls?state=open&per_page=100`);
  for (const number of staleClaims(allRequests, Array.isArray(openPrs) ? openPrs : [], Date.now())) {
    await removeLabel(number, CLAIMED_LABEL);
    await comment(number, 'Releasing this request: an automated run claimed it but never delivered a pull request. The pipeline will pick it up again on its next pass.');
    console.log(`create-extractor: released a stale claim on #${number}`);
  }

  const requests = eligible(allRequests);
  if (!requests.length) {
    console.log('create-extractor: nothing eligible to act on this run');
    return;
  }

  // Triage oldest-first, closing everything that needs no extractor. Closing is
  // cheap, so a backlog of denied/duplicate requests drains in ONE run rather than
  // one per hour; the first request that genuinely needs an extractor stops the
  // loop and gets the branch.
  //
  // `peers` is what triage's duplicate detection sees, and it must be EVERY open
  // request, not just the eligible ones. The `sample` disposition exists precisely
  // for "another request for this host is already in flight" — and an in-flight
  // request is CLAIMED, so filtering peers down to eligible would hide the leader
  // and let a second request scaffold a rival branch and PR for the same host.
  // Requests already handed to a human are the one exclusion: a parked leader
  // would otherwise black-hole every later request for its host forever.
  const peers = allRequests
    .filter((i) => !labelsOf(i).includes(BLOCKED_LABEL))
    .map((i) => ({ number: i.number, title: i.title, body: i.body ?? '' }));

  let target = null;
  let decision = null;
  for (const issue of requests) {
    // Per-issue isolation, carrying over the retired CLI's fail-open stance: one
    // unparseable request must never sink the run for every other request.
    let d = null;
    try {
      d = await runTriage({ body: issue.body ?? '', title: issue.title, number: issue.number }, undefined, peers);
    } catch (e) {
      await handToHuman(issue.number, `Triage could not read this request: ${e.message}\n\nEdit the issue (the event page URL is the field that matters) and remove the \`${BLOCKED_LABEL}\` label to retry.`);
      continue;
    }
    if (d.skipAgent) { await closeSkipped(issue, d); continue; }
    if (!d.url || !d.branch) {
      await handToHuman(issue.number, `This request has no parseable event URL, so the pipeline could not act on it. Edit the issue to include the event page URL and remove the \`${BLOCKED_LABEL}\` label to retry.`);
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
  await addLabel(target.number, CLAIMED_LABEL);
  console.log(`create-extractor: #${target.number} → ${decision.host} (${decision.mode} mode, case ${decision.caseName})`);

  // Everything from here is the old 3-prepare.sh, whose failure contract was
  // "comment the failure and label the issue, then stop" — the request itself is
  // where a human looks. A throw would instead leave it silently CLAIMED until the
  // stale sweep, so converge on the issue first, then rethrow: the request is
  // parked with a reason, and the task still fails loudly (a scaffold that cannot
  // go green is a defect in the pipeline, not a fact about this one page).
  try {
    npm('ci');
    scaffold(decision);
    commitAll(decision.mode === 'supported'
      ? `chore: scaffold ${decision.caseName} case for ${decision.host} (Refs #${target.number})`
      : `chore: scaffold ${decision.caseName} extractor (Refs #${target.number})`);
  } catch (e) {
    await handToHuman(target.number, `Scaffolding failed, so no extractor was attempted: ${e.message}\n\nThis is a pipeline defect rather than a problem with the page. Remove the \`${BLOCKED_LABEL}\` label to retry once it is fixed.`);
    throw e;
  }

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
    await handToHuman(target.number, [
      `The event page could not be recorded, so no extractor was attempted: ${e.message}`,
      '',
      'A recorder failure (a 5xx that outlasted its retries) is usually transient and worth simply retrying.',
      'A refusal or an empty render points at the page itself — a bot wall, a dead URL, or content that needs interaction.',
      '',
      `Remove the \`${BLOCKED_LABEL}\` label to retry.`,
    ].join('\n'));
    return;
  }
  // `[skip ci]` as the retired fetch-page.yml carried: a recorded page is not a
  // reason to run CI, and test.yml's paths-ignore covers data/** anyway.
  commitAll(`chore: record ${decision.caseName} page via ScraperAPI (Refs #${target.number}) [skip ci]`);

  let pr;
  try {
    push(decision.branch);
    pr = await openDraftPr(decision, base, target.number);
  } catch (e) {
    await handToHuman(target.number, `The scaffold and recorded page could not be delivered: ${e.message}\n\nRemove the \`${BLOCKED_LABEL}\` label to retry.`);
    throw e;
  }
  console.log(`create-extractor: pushed ${decision.branch} and opened draft PR #${pr}`);

  // Request the agent stage: a real page is recorded and an extract() is left to
  // write — and NAME what this run created, so the scheduler records it in the
  // dispatch issue and the agent never has to find it.
  //
  // It used to be a pure control signal, leaving the agent to discover the branch by
  // searching for the `claude/extractor/` head-branch prefix. That is a silent-error
  // generator: a search that finds nothing is indistinguishable from nothing having
  // been created, and the agent believes it. Claudinite #649 has the incident this
  // came from — a delivered-and-merged PR read as "this cycle delivered nothing".
  // Everything else the agent needs (the scaffold, the recorded page) still comes
  // from reading the repo, per agent-preprocessing DESIGN §3.
  if (requestFile) {
    writeFileSync(requestFile, `${JSON.stringify({
      marker: 'agent-requested',
      delivered: { branch: decision.branch, pr, merged: false },
    })}\n`);
  }
  console.log('create-extractor: requested the agent stage');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`create-extractor preprocessing failed: ${e.message}`); process.exit(1); });
}
