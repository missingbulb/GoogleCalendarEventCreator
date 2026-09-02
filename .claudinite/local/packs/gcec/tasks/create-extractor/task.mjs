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
  agent_model: 'sonnet',               // writing one extract() against a recorded page — bounded, well-specified judgment
  expected_outcome: 'pr',
  automerge: 'nothing',                   // a human always reviews the extraction; the pipeline never merges

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

  // Eligibility, and nothing more — as the `request-eligible` term in
  // preconditions.mjs beside this file. Task-local because its subject is this
  // repo's own request labels rather than a window of activity the shared
  // vocabulary knows about.
  preconditions: ['extractor-request-eligible'],
};
