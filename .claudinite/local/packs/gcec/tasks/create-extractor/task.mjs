// gcec local task: create-extractor — an `extractor-request` issue becomes a PR
// adding site support (per-project-scheduling DESIGN §6, revised by
// agent-preprocessing DESIGN §9). Three stages, each doing only what it is the
// right place for:
//
//   precondition (here)   — pure code over the collected signals. "Is there any
//                           request to act on?" Nothing else: no I/O, no writes,
//                           no page reads. Almost every run answers no, and the
//                           run then costs nothing at all.
//   preprocessing         — `prepare.mjs`, a subprocess Action-side: triage,
//                           closing the requests that need no extractor, branch,
//                           scaffold, the ScraperAPI page fetch, the draft PR.
//                           Everything deterministic, including all the GitHub
//                           writes and the one external fetch — none of which a
//                           precondition may do.
//   agent (task.md)       — only the judgment: read the recorded page, write
//                           extract(), fill the case from a real run.
//
// Self-contained (imports nothing): the whole contract is this default export.

export default {
  id: 'create-extractor',
  // NOT REALLY A PERIODICAL TASK. A request arriving is an event, and polling for it
  // is the wrong shape — the right one is a trigger on the issue itself. Until that
  // flow exists, a slow implementation cycle is the accepted trade (#1060), so this
  // says `daily` plainly. It has BEEN daily since `hourly` was retired: the canon
  // normalizes a retired token at the declaration door, so the anchor, the janitor's
  // stale bound and the signal window have all read daily regardless of what this
  // line claimed.
  frequency: 'daily',
  precondition_signals: ['issues', 'commits'],
  agent_model: 'sonnet',               // writing one extract() against a recorded page — bounded, well-specified judgment
  expected_outcome: 'open-pr',            // a human always reviews the extraction; the pipeline never merges

  agent_instructions: 'task.md',
  agent_execution_timeout: 3600,          // generous: a stubborn page can take several extract/verify rounds

  // The deterministic stage. It needs three things a precondition cannot have —
  // issue BODIES (the `issues` signal carries none), GitHub WRITES (closing
  // triaged-out requests, claiming one, opening the PR), and a network fetch of an
  // external page — so all of it lives here rather than being smeared across a
  // gate that must stay pure and cheap.
  agent_preprocessing: 'node prepare.mjs',
  agent_preprocessing_timeout: 1800,      // npm ci + the offline suite + a rendered ScraperAPI fetch

  // The repo Actions secret this task needs configured (agent-preprocessing
  // DESIGN §9). The wiring converge stamps it into the scheduler workflow, so the
  // worker reads it as ordinary env; baselining asks the owner if it isn't set.
  // Being able to read it at all is what retired `.github/workflows/fetch-page.yml`:
  // that workflow existed only because the page fetch needed a secret an agent
  // session cannot hold, so the agent had to dispatch it, poll it, and pull its
  // commit. Preprocessing runs inside Actions, where the secret already is.
  required_secrets: ['SCRAPER_API_KEY'],

  // Eligibility, and nothing more. `extractor-request` marks the issue KIND and
  // stays for its whole life; its STATE is the scheduler's own vocabulary rather
  // than labels invented here — `agent-running` (a run owns this) and
  // `needs-human` (handed over). The scheduler already guarantees both exist, and
  // the executor's stale-claim sweep is scoped to dispatch issues, so a request
  // may hold `agent-running` for as long as its PR sits in review.
  //
  // The claim is what keeps this correct hour over hour: preprocessing runs before
  // (and independently of) the dispatch issue's at-most-one-open guard, and would
  // otherwise re-scaffold a live request every hour. `ready-for-agent` is
  // deliberately never used here — it is the executor's trigger.
  //
  // Deliberately NOT here: parsing the URL out of a body (the signal has no
  // bodies), running the sources' matches() (that is filesystem work over the
  // checkout), duplicate detection, and closing anything (a precondition performs
  // no writes). Those are preprocessing's, in prepare.mjs.
  precondition(signals) {
    // A committed `.url` whose `.html` is missing keeps `test:live` red until the
    // page is recorded, and only gardening produces that state (a maintainer
    // re-points a taken-down event). The worker sweeps for it — a directory listing
    // over the recorder it already owns — but the gate cannot read disk, so a commit
    // touching that directory is the proxy that lets a pending page fire the task
    // with no request in sight.
    const touchedPages = (signals.commits?.touchedPaths ?? [])
      .filter((f) => f.startsWith('dev/requirements/extractor/data/server-fetched/'));

    const open = signals.issues?.open ?? [];
    const eligible = open.filter((i) => {
      const labels = i.labels ?? [];
      return labels.includes('extractor-request')
        && !labels.includes('agent-running')
        && !labels.includes('needs-human');
    });
    if (!eligible.length) {
      return touchedPages.length
        ? { run: true, reason: `no eligible request, but ${touchedPages.length} cached-page file(s) changed — sweep for a page needing a record`, context: [] }
        : { run: false, reason: 'no open extractor-request issue is eligible, and no cached-page file changed' };
    }
    const numbers = eligible.map((i) => i.number).sort((a, b) => a - b);
    return {
      run: true,
      reason: `${numbers.length} eligible extractor request(s): ${numbers.map((n) => `#${n}`).join(', ')}`,
      context: [
        `Eligible requests this run: ${numbers.map((n) => `#${n}`).join(', ')} — preprocessing acts on the lowest-numbered one that needs an extractor and closes the rest.`,
        'Requests labelled agent-running or needs-human are out of scope — do not touch them.',
        'Preprocessing has already branched, scaffolded, recorded the page, and opened a DRAFT PR. Continue on that PR; do not re-scaffold and do not re-fetch the page.',
      ],
    };
  },
};
