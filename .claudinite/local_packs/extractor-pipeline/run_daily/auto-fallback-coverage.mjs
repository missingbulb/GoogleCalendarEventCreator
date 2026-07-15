// extractor-pipeline run_daily task: auto-fallback-coverage — try to widen the
// generic fallback extractor's field coverage against the cached-case corpus.
// Worker: the co-located routine spec (pack-relative path, resolved against this
// pack's directory in the member repo). This gate is deliberately coarse — the
// project changed in the window; the routine's own preconditions.sh re-checks
// precisely (a meaningful non-docs/non-generated change) and exits early
// otherwise. Most runs correctly change nothing: the gate has banked every prior
// win, so a new generic win is rare and a forced one is worse than none.
//
// No full mode: the routine's freshness window is its own gate, and a quiet repo
// has nothing to gain from a weekly re-run — full_sweep_supported stays false.
export default {
  id: 'auto-fallback-coverage',
  worker: 'run_daily/auto-fallback-coverage/routine.md',
  order: null,
  full_sweep_supported: false,
  smarts: 'high', // routine.md: a daily Claude routine on a strong model

  async gate(repo, signals) {
    if (signals.projectChanged) {
      return {
        run: true,
        targets: {},
        reason: 'project changed in the window (preconditions.sh re-checks precisely)',
      };
    }
    return { run: false };
  },
};
