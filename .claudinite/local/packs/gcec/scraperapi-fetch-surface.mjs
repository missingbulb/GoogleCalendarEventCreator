// gcec local check: page fetching stays confined to the one ScraperAPI module,
// reached from a task's preprocessing worker — and no workflow exists just to hold
// the API key for an agent. Two static signatures of the same rule (the "Extractor
// pipeline" section of RULES.md), each a shape a post-hoc scan can see:
//
//   1. Only the vendored scheduler workflow may name SCRAPER_API_KEY. A task puts
//      the secret in the workflow's env by declaring `required_secrets`; any OTHER
//      workflow naming it is the retired `fetch-page.yml` pattern coming back — a
//      workflow whose only job is to hold a secret an agent session can't, which
//      costs the agent a dispatch/poll/pull round-trip that preprocessing removed.
//   2. The ScraperAPI endpoint appears in exactly one module. `scraperapi.mjs` IS
//      the fetching surface (retry/backoff, render=true, the timeout), so a second
//      caller building the URL itself both bypasses that hardening and defeats the
//      "swap the vendor in one module" property. Keyed on the module's BASENAME,
//      not a pinned path, so moving it doesn't turn the check into a lie.
//
// Local-pack check modules are dependency-free on purpose (see
// test-offline-list-sync.mjs's header): plain finding objects, no engine imports,
// so they also load under the repo's own `npm test` (pack.test.mjs).
const id = 'scraperapi-fetch-surface';
const severity = 'blocking';
const doc = '.claudinite/local/packs/gcec/RULES.md';

const SECRET = 'SCRAPER_API_KEY';
const ENDPOINT = 'api.scraperapi.com';

// The one workflow allowed to carry the secret: the vendored per-repo scheduler,
// which is where a task's `required_secrets` declaration lands.
const SCHEDULER_WORKFLOW = '.github/workflows/claudinite-scheduler.yml';
const isWorkflow = (p) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(p);

// The fetching surface: code that could actually perform a page fetch — the
// extension, the dev tooling, and the local packs' task trees (where preprocessing
// workers live). Deliberately excludes the packs' own check modules and their
// fixtures, which must be able to spell the endpoint to test for it.
const isFetchingCode = (p) =>
  /\.(?:js|mjs|cjs)$/.test(p) &&
  (p.startsWith('extension/') || p.startsWith('dev/') || /^\.claudinite\/local\/packs\/[^/]+\/tasks\//.test(p));

// The vendor module and its own unit test may name the endpoint; nothing else may.
const basename = (p) => p.slice(p.lastIndexOf('/') + 1);
const isVendorModule = (p) => basename(p) === 'scraperapi.mjs' || basename(p) === 'scraperapi.test.js';

// Match code, not prose: a comment explaining the rule carries the same words.
const isComment = (ln) => {
  const t = ln.trimStart();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('#');
};

export default {
  id,
  severity,
  description: 'ScraperAPI page fetching lives in one module; no workflow holds its key for an agent',
  doc,
  why:
    'the page fetch is preprocessing\'s, inside Actions where the secret already is — a ' +
    'workflow holding the key for an agent is the dispatch/poll/pull round-trip that ' +
    'preprocessing retired, and a second endpoint caller bypasses the module\'s retry/render hardening',

  run(ctx) {
    const findings = [];

    // Direction 1 — a workflow other than the scheduler naming the secret.
    for (const file of ctx.files.filter(isWorkflow)) {
      if (file === SCHEDULER_WORKFLOW) continue;
      const text = ctx.read(file);
      if (text === null) continue;
      text.split('\n').forEach((ln, i) => {
        if (!ln.includes(SECRET)) return;
        findings.push({
          rule: id, severity, file, line: i + 1,
          what: `${file} names ${SECRET} — only the scheduler workflow may carry it`,
          why: 'a workflow whose job is to hold the fetch key for an agent is the retired fetch-page.yml pattern',
          fix: `declare ${SECRET} in the task's required_secrets (task.mjs) and fetch from its preprocessing worker; delete this workflow`,
          doc,
        });
      });
    }

    // Direction 2 — the endpoint built outside the one vendor module. ctx.files is
    // the whole repo under the default `all` sweep; a --changed run narrows it,
    // which only ever under-reports.
    for (const file of ctx.files.filter(isFetchingCode)) {
      if (isVendorModule(file)) continue;
      const text = ctx.read(file);
      if (text === null) continue;
      text.split('\n').forEach((ln, i) => {
        if (isComment(ln) || !ln.includes(ENDPOINT)) return;
        findings.push({
          rule: id, severity, file, line: i + 1,
          what: `${file} builds a ${ENDPOINT} request itself`,
          why: 'ScraperAPI is the whole fetching surface, held in one module so the vendor can be swapped there and every fetch keeps its retry/backoff and render=true',
          fix: 'import the fetch helper from tasks/create-extractor/scraperapi.mjs instead of calling the endpoint here',
          doc,
        });
      });
    }

    return findings;
  },
};
