// gcec local task: create-extractor — an `extractor-request` issue becomes a PR
// adding site support (per-project-scheduling DESIGN §6, revised by
// agent-preprocessing DESIGN §9). Three stages, each doing only what it is the
// right place for:
//
//   precondition (here)   — pure code over the collected signals. "Is there any
//                           request to act on?" Nothing else: no I/O, no writes,
//                           no page reads. Almost every hour answers no, and the
//                           hour then costs nothing at all.
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
  frequency: 'hourly',           // a submitted request should become a PR in minutes, not overnight
  precondition_signals: ['issues'],
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

  // The ScraperAPI credential, handed to the worker and to nothing else
  // (agent-preprocessing DESIGN §9). This declaration is what retired
  // `.github/workflows/fetch-page.yml`: that workflow existed only because the
  // page fetch needed a secret an agent session cannot hold, so the agent had to
  // dispatch it, poll it, and pull its commit. Preprocessing runs inside Actions,
  // where the secret already is.
  agent_preprocessing_secrets: ['SCRAPER_API_KEY'],

  // Eligibility, and nothing more. A request is eligible when it is an open
  // `extractor-request` that is neither already handed to a human nor claimed by a
  // run in flight — the claim label is what keeps this correct hour over hour,
  // since preprocessing runs before (and independently of) the dispatch issue's
  // at-most-one-open guard, and would otherwise re-scaffold a live request.
  //
  // Deliberately NOT here: parsing the URL out of a body (the signal has no
  // bodies), running the sources' matches() (that is filesystem work over the
  // checkout), duplicate detection, and closing anything (a precondition performs
  // no writes). Those are preprocessing's, in prepare.mjs.
  precondition(signals) {
    const open = signals.issues?.open ?? [];
    const eligible = open.filter((i) => {
      const labels = i.labels ?? [];
      return labels.includes('extractor-request')
        && !labels.includes('extractor-blocked-needs-human')
        && !labels.includes('extractor-in-progress');
    });
    if (!eligible.length) {
      return { run: false, reason: 'no open extractor-request issue is eligible (none open, or all blocked / already in flight)' };
    }
    const numbers = eligible.map((i) => i.number).sort((a, b) => a - b);
    return {
      run: true,
      reason: `${numbers.length} eligible extractor request(s): ${numbers.map((n) => `#${n}`).join(', ')}`,
      context: [
        `Eligible requests this run: ${numbers.map((n) => `#${n}`).join(', ')} — preprocessing acts on the lowest-numbered one that needs an extractor and closes the rest.`,
        'Requests labelled extractor-blocked-needs-human or extractor-in-progress are out of scope — do not touch them.',
        'Preprocessing has already branched, scaffolded, recorded the page, and opened a DRAFT PR. Continue on that PR; do not re-scaffold and do not re-fetch the page.',
      ],
    };
  },
};
