// gcec local check: extension/event-extractors/custom/ holds per-site sources and
// nothing else — one flat `<site>.js` per site, no subdirectories, no other file
// kinds, and never a pipeline file (the registry, the orchestrator, the shared
// helpers, or the one core generic extractor, which is a different kind of thing
// from a per-site source). The architecture rule this converts is in RULES.md's
// "Architecture rules of the road": custom/ is THE extensibility point, which is
// what keeps adding a host a single-file change.
//
// Why a check and not just prose: the load-order generator (dev/build/gen-load-order.js)
// reads custom/ with `readdirSync(...).filter(f => f.endsWith('.js'))` — one level,
// name-filtered. A nested directory or a non-.js file is therefore SILENTLY dropped
// from load-order.generated.json: no error anywhere, the code simply never loads and
// the site quietly stops extracting. That silence is exactly what a static scan is for.
//
// Local-pack check modules are dependency-free on purpose (see
// test-offline-list-sync.mjs's header): plain finding objects, no engine imports,
// so they also load under the repo's own `npm test` (pack.test.mjs).
const id = 'custom-sources-flat';
const severity = 'blocking';
const doc = '.claudinite/local/packs/gcec/RULES.md';
const why =
  'gen-load-order.js reads custom/ one level deep and keeps only *.js — anything else ' +
  'is silently omitted from the load order and never runs';

const DIR = 'extension/event-extractors/custom/';

// The pipeline itself: these live in event-extractors/, never in custom/.
const PIPELINE_FILES = ['registry.js', 'generic-extractor.js', 'assemble-events.js'];

export default {
  id,
  severity,
  description: 'extension/event-extractors/custom/ holds only flat per-site <site>.js sources',
  doc,
  why,

  run(ctx) {
    const findings = [];
    // ctx.files is the whole repo under the default `all` sweep; a --changed run
    // narrows it, which only ever under-reports.
    for (const file of ctx.files) {
      if (!file.startsWith(DIR)) continue;
      const rest = file.slice(DIR.length);

      if (rest.includes('/')) {
        findings.push({
          rule: id, severity, file, line: null,
          what: `${file} sits in a subdirectory of custom/`,
          why,
          fix: 'flatten it to extension/event-extractors/custom/<site>.js, or move shared code to event-extractors/helpers/',
          doc,
        });
        continue;
      }

      if (!rest.endsWith('.js')) {
        findings.push({
          rule: id, severity, file, line: null,
          what: `${file} is not a per-site source (custom/ holds only <site>.js files)`,
          why,
          fix: 'move it out of custom/ — that directory is the per-site extensibility point and nothing else',
          doc,
        });
        continue;
      }

      if (PIPELINE_FILES.includes(rest)) {
        findings.push({
          rule: id, severity, file, line: null,
          what: `${file} is a pipeline file, not a per-site source`,
          why: 'the registry, the orchestrator and the core generic extractor are the pipeline itself — a different kind of thing from a per-site override',
          fix: `move ${rest} back to extension/event-extractors/`,
          doc,
        });
      }
    }
    return findings;
  },
};
