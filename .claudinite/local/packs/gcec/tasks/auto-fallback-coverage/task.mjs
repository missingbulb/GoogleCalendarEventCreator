// gcec local task: auto-fallback-coverage — the daily attempt to make the GENERIC
// fallback extractor recover more of what the dedicated per-site sources get
// (per-project-scheduling DESIGN §6). Worker: task.md. Most runs correctly change
// nothing — the coverage gate already banks every prior win — so a forced or fake
// win is worse than none; no win → no branch, no PR.
//
// Self-contained (imports nothing): the whole contract is this default export.

export default {
  id: 'auto-fallback-coverage',
  frequency: 'daily',            // fires on the repo's daily anchor hour
  signals: ['commits'],
  model: 'opus',                 // closing a real generic-extractor gap is heavy judgment
  outcome: 'open-pr',            // a generic win lands as a PR the owner reviews; never auto-merged

  worker: 'task.md',

  // This is the old preconditions.sh, moved into code over the `commits` signal
  // (DESIGN §6): the result is a pure function of the source, and most days nothing
  // meaningful lands, so a run over unchanged code would re-derive yesterday's
  // answer while burning a full model run. `commits.substantiveChange` is exactly
  // the shell's "a commit touched real source, not only docs/GENERATED" notion —
  // fixing the live cadence bug the weekly cron caused (daily spec vs weekly fire).
  // When in doubt the day still runs: a run that finds nothing is cheap and makes
  // no PR; a too-clever skip that misses a real opportunity is not.
  precondition(signals) {
    const commits = signals.commits ?? {};
    if (!commits.substantiveChange) {
      return { run: false, reason: 'no meaningful code change in the window (idle, or docs/generated churn only)' };
    }
    const shas = (commits.list ?? []).filter((c) => c.substantive).map((c) => c.sha.slice(0, 7));
    return {
      run: true,
      reason: `${shas.length} meaningful commit(s) in the window`,
      context: [
        `Scope: the ${shas.length} substantive commit(s) in the window — ${shas.join(', ')}.`,
        'Most runs correctly change nothing — only open a PR on a real generic-extractor win that clears the coverage gate; a forced or fake win is worse than none.',
      ],
    };
  },
};
