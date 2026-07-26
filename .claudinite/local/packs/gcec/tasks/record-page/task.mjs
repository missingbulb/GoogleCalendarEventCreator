// gcec local task: record-page — record any live case whose `.url` is committed
// but whose `.html` is not. Agentless: pure preprocessing, no model, no issue.
//
// This is the other half of retiring `.github/workflows/fetch-page.yml`. That
// workflow was dispatched by hand for the add-live-case flow (and for gardening: a
// case whose event page was taken down and re-pointed at a newer one), because a
// session cannot hold SCRAPER_API_KEY. A worker can — so the dispatch-and-poll
// surface becomes a declarative one: commit the `.url`, delete the stale `.html`,
// and the next scheduler run records the page and opens the PR.
//
// Self-contained (imports nothing): the whole contract is this default export.

export default {
  id: 'record-page',
  frequency: 'hourly',           // the add-live-case flow waits on this; an hour is the worst case
  precondition_signals: ['commits'],
  agent_model: 'none',                 // nothing to judge — a page either records or it doesn't
  expected_outcome: 'open-pr',            // the recorded page lands as a PR a maintainer merges

  agent_instructions: 'worker.mjs',      // vestigial for a none task; the real work is the preprocessing command below
  agent_preprocessing: 'node worker.mjs',
  agent_preprocessing_timeout: 900,       // several rendered ScraperAPI fetches, worst case
  agent_preprocessing_secrets: ['SCRAPER_API_KEY'],

  // Fire when a default-branch commit touched the cached-page directory — the only
  // way a `.url` gains or changes an entry needing a record. Cheap and exact: the
  // worker still re-derives the real work from disk, so a false positive costs one
  // directory scan and a quiet exit, while a quiet repo never runs at all.
  //
  // The pipeline's own scaffold commits cannot trigger this: they land on
  // `claude/extractor/*` branches, and the `commits` collector reads only the
  // default branch.
  precondition(signals) {
    const touched = signals.commits?.touchedPaths ?? [];
    const dataDir = 'dev/requirements/extractor/data/server-fetched/';
    const hits = touched.filter((p) => p.startsWith(dataDir));
    if (!hits.length) {
      return { run: false, reason: 'no commit touched the cached-page directory' };
    }
    return {
      run: true,
      reason: `${hits.length} cached-page file(s) changed on the default branch`,
      context: [`Changed cached-page files: ${hits.join(', ')}.`],
    };
  },
};
