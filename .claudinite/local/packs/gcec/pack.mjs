import testOfflineListSync from './test-offline-list-sync.mjs';
import customSourcesFlat from './custom-sources-flat.mjs';
import npmTestGlobCoverage from './npm-test-glob-coverage.mjs';
import pipelineSiteAgnostic from './pipeline-site-agnostic.mjs';
import regenArtifactsMergeOurs from './regen-artifacts-merge-ours.mjs';

// The gcec pack: this project's general working pack, as a LOCAL Claudinite pack
// (.claudinite/local/packs/ — tracked project content, discovered and run by the
// same engine as the canon packs). It carries the standing project rules
// (RULES.md, injected at session start while the pack is declared), the project's
// own conformance checks (run at every Stop and in CI alongside the canon
// packs'), and the activity-scoped skills that used to live as always-loaded
// dev/procedures prose.
//
// A local pack is always declared by hand in .claudinite-checks.json (never
// fingerprinted by --init, never seeded), so detect/marker stay null. Its skills
// live INSIDE the pack (skills/<name>/SKILL.md); the engine mounts them from
// here, not from the canon skills tree.
export default {
  id: 'gcec',
  ruleRoutingGuidance: {
    belongs: "this project's standing rules — owner commands, testing invariants, codebase gotchas, extractor-pipeline rules, architecture rules of the road, capture policy",
    excludes: 'general software-engineering practices and portable procedures — those live in the vendored Claudinite canon, not here',
  },
  detect: null,
  marker: null,
  prose: 'RULES.md',
  worldRules: [
    testOfflineListSync,
    customSourcesFlat,
    npmTestGlobCoverage,
    pipelineSiteAgnostic,
    regenArtifactsMergeOurs,
  ],
  skills: ['snapshot-approval', 'merge-and-ci', 'testing-guide'],
};
