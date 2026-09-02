// create-extractor's own precondition term: is there anything for this run to do.
// Task-local because its subject is this repo's own request labels and recorder
// directory rather than a window of activity the shared vocabulary knows about.
//
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

export const terms = {
  'extractor-request-eligible': {
    signals: ['issues', 'commits'],
    holds(signals) {
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
          ? { holds: true, reason: `no eligible request, but ${touchedPages.length} cached-page file(s) changed — sweep for a page needing a record`, context: [] }
          : { holds: false, reason: 'no open extractor-request issue is eligible, and no cached-page file changed' };
      }
      const numbers = eligible.map((i) => i.number).sort((a, b) => a - b);
      return {
        holds: true,
        reason: `${numbers.length} eligible extractor request(s): ${numbers.map((n) => `#${n}`).join(', ')}`,
        context: [
          `Eligible requests this run: ${numbers.map((n) => `#${n}`).join(', ')} — preprocessing acts on the lowest-numbered one that needs an extractor and closes the rest.`,
          'Requests labelled agent-running or needs-human are out of scope — do not touch them.',
          'Preprocessing has already branched, scaffolded, recorded the page, and opened a DRAFT PR. Continue on that PR; do not re-scaffold and do not re-fetch the page.',
        ],
      };    },
    },
  };
