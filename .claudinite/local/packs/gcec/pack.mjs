import testOfflineListSync from './test-offline-list-sync.mjs';
import customSourcesFlat from './custom-sources-flat.mjs';
import npmTestGlobCoverage from './npm-test-glob-coverage.mjs';
import pipelineSiteAgnostic from './pipeline-site-agnostic.mjs';
import regenArtifactsMergeOurs from './regen-artifacts-merge-ours.mjs';
import genericCoverageScopeAgrees from './generic-coverage-scope-agrees.mjs';

// The gcec pack: this project's general working pack, as a LOCAL Claudinite pack
// (.claudinite/local/packs/). It carries the standing project rules (RULES.md),
// the project's own conformance checks, and its activity-scoped skills
// (skills/<name>/SKILL.md, mounted from here). Declared by hand in
// .claudinite-settings.json, so detect/marker stay null.
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
    genericCoverageScopeAgrees,
  ],
  skills: ['snapshot-approval', 'merge-and-ci', 'testing-guide'],
};
