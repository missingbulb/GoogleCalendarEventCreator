// gcec local check: package.json's hand-kept test:offline list must stay in sync
// with the extension-test/ mirror tree — it names every extension-test/**/*.test.js
// that exists, and only files that exist. `npm test` discovers by glob, so a test
// missing from test:offline still runs there; what this check catches is the
// offline suite silently thinning as tests are added, moved, or renamed (the rule
// this converts was prose in the project's old testing procedure doc).
//
// Local-pack check modules are dependency-free on purpose: they return plain
// finding objects ({ rule, severity, file, line, what, why, fix, doc }) instead of
// importing the engine's checks/lib helpers — the mount those helpers live in is
// gitignored and absent on a fresh checkout, and this module must also load under
// the repo's own `npm test` (pack.test.mjs).
const id = 'test-offline-list-sync';
const severity = 'blocking';
const doc = '.claudinite/local_packs/gcec/RULES.md';
const why =
  'npm test discovers by glob but test:offline is a hand-kept list — a new or ' +
  'moved extension-test file silently drops out of the offline suite';

const isMirrorTest = (p) => p.startsWith('extension-test/') && p.endsWith('.test.js');

export default {
  id,
  severity,
  description: 'package.json test:offline lists exactly the extension-test unit tests',
  doc,
  why,

  run(ctx) {
    const raw = ctx.read('package.json');
    if (!raw) return [];
    let script;
    try {
      script = JSON.parse(raw).scripts?.['test:offline'];
    } catch {
      return []; // malformed package.json breaks npm first — not this check's finding
    }
    if (typeof script !== 'string') return [];

    const listed = script.split(/\s+/).filter(isMirrorTest);
    const findings = [];
    // Direction 1 — a mirror-tree test the list is missing. ctx.files is the whole
    // repo under the engine's default `all` sweep (check-the-world); under a
    // --changed run it narrows to changed files, which only ever under-reports.
    for (const file of ctx.files.filter(isMirrorTest)) {
      if (!listed.includes(file)) {
        findings.push({
          rule: id, severity, file: 'package.json', line: null,
          what: `test:offline is missing ${file}`,
          why,
          fix: `add ${file} to the test:offline list in package.json`,
          doc,
        });
      }
    }
    // Direction 2 — a listed file that doesn't exist (moved/renamed away). Probed
    // via ctx.exists, not ctx.files, so a --changed run can't false-positive.
    for (const file of listed) {
      if (!ctx.exists(file)) {
        findings.push({
          rule: id, severity, file: 'package.json', line: null,
          what: `test:offline lists ${file}, which does not exist`,
          why,
          fix: `remove ${file} from the test:offline list or fix its path`,
          doc,
        });
      }
    }
    return findings;
  },
};
