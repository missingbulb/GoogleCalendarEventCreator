// gcec local check: every file in extension/event-extractors/custom/ actually
// REGISTERS a source. A per-site file exists for exactly one reason — to push a
// { name, matches, extract } layer of overrides onto GCal.sources — so a file
// there that pushes nothing is a placeholder, and the architecture rule it
// breaks is RULES.md's "Architecture rules of the road": never register a
// placeholder source just to make a host count as supported, and never keep a
// file whose only content is a restatement of the generic base ("when a
// custom/<site>.js shrinks to nothing, just delete it").
//
// This is the inside half of the pair custom-sources-flat opens: that rule
// guards WHAT MAY SIT in custom/ (flat, .js, no pipeline files); this one guards
// that what sits there DOES ITS JOB.
//
// Why a check and not just prose: a registering-nothing file is invisible to
// every existing guard, so the repo goes green while the site quietly runs on
// the bare generic base.
//   * gen-load-order.js lists it (it is a .js in custom/) and the page loads it —
//     an IIFE that registers nothing throws nothing.
//   * extension-test/integration/supported-domains.test.js walks GCal.sources, so
//     a file that pushed no source simply isn't there to check — it asserts over
//     a set the file never joined.
//   * dev/requirements/extractor/extractor-support.test.js asserts recognition +
//     completeness, which the generic base already delivers on a host we support,
//     so the case for that host keeps passing with the override gone.
// The one thing that changes is the extraction the file claims to fix, and
// nothing anywhere says so. That silence is what a static scan is for — and it
// bites in the exact direction RULES.md pushes work: the generic-coverage gate
// reporting no gap is a standing invitation to gut a per-site source, and a
// half-done gutting leaves this file behind.
//
// DETECTION, and why it can't false-alarm on a real source: registry.js owns
// `GCal.sources` as the one array, and a source joins it by pushing. The scan
// therefore asks only for a `sources.push(` call — which matches both the
// spelled-out `GCal.sources.push(` every source uses today and a destructured
// `const { sources } = GCal; sources.push(`. Comments are blanked first (shared
// with pipeline-site-agnostic, so a `//` inside a 'https://…' string is not
// mistaken for one), so a commented-out registration reads as the absence it is.
// Anything cleverer than a push — a source assembled by code no scan can follow —
// would under-report here, which is the safe direction.
//
// Local-pack check modules are dependency-free on purpose (see
// test-offline-list-sync.mjs's header): plain finding objects, no engine imports,
// so they also load under the repo's own `npm test` (pack.test.mjs).
import { blankComments } from './pipeline-site-agnostic.mjs';

const id = 'custom-source-registers';
const severity = 'blocking';
const doc = '.claudinite/local/packs/gcec/RULES.md';
const why =
  'a per-site file that pushes no source loads without error and shows up in no suite — the ' +
  'site silently falls back to the bare generic base while the file claims to override it';

const DIR = 'extension/event-extractors/custom/';

export default {
  id,
  severity,
  description: 'every extension/event-extractors/custom/ source registers itself on GCal.sources',
  doc,
  why,

  run(ctx) {
    const findings = [];
    // ctx.files is the whole repo under the engine's default `all` sweep; a
    // --changed run narrows it, which only ever under-reports.
    for (const file of ctx.files) {
      if (!file.startsWith(DIR)) continue;
      const rest = file.slice(DIR.length);
      // Subdirectories and non-.js files are custom-sources-flat's finding, not
      // this one's — one violation, one report.
      if (rest.includes('/') || !rest.endsWith('.js')) continue;

      const src = ctx.read(file);
      if (src === null || src === undefined) continue;
      if (/sources\s*\.\s*push\s*\(/.test(blankComments(src))) continue;

      findings.push({
        rule: id,
        severity,
        file,
        line: null,
        what: `${file} is a per-site source that never pushes onto GCal.sources`,
        why,
        fix:
          'register the site with `GCal.sources.push({ name, matches, extract })` — or, if the core ' +
          'generic extractor already gets this site right, DELETE the file: the host stays in ' +
          "host-lists.json's supportedDomains and the site stays fully supported with no file at all",
        doc,
      });
    }
    return findings;
  },
};
