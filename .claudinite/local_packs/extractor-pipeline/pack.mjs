import createExtractor from './run_daily/create-extractor.mjs';
import autoFallbackCoverage from './run_daily/auto-fallback-coverage.mjs';

// The extractor-pipeline pack: this repo's extractor-automation domain as a LOCAL
// Claudinite pack (.claudinite/local_packs/ — tracked project content, discovered
// and run by the same engine as the canon packs). It owns the two unattended
// routines that grow and improve site support — create-extractor (an
// `extractor-request` issue → a PR adding site support) and auto-fallback-coverage
// (widen the generic fallback's field coverage) — as run_daily tasks, the
// live-case authoring skill, and the pipeline's standing rules (RULES.md).
//
// A local pack is always declared by hand in .claudinite-checks.json (never
// fingerprinted by --init, never seeded), so detect/marker stay null. Its skills
// live INSIDE the pack (skills/<name>/SKILL.md) — a local pack is self-contained;
// the engine mounts them from here, not from the canon skills tree.
export default {
  id: 'extractor-pipeline',
  detect: null,
  marker: null,
  prose: 'RULES.md',
  rules: [],
  skills: ['add-live-case'],
  run_daily: [createExtractor, autoFallbackCoverage],
};
