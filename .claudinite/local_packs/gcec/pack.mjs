import testOfflineListSync from './test-offline-list-sync.mjs';

// The gcec pack: this project's general working pack, as a LOCAL Claudinite pack
// (.claudinite/local_packs/ — tracked project content, discovered and run by the
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
  detect: null,
  marker: null,
  prose: 'RULES.md',
  rules: [testOfflineListSync],
  skills: ['snapshot-approval', 'merge-and-ci', 'testing-guide', 'add-live-case'],
  run_daily: [],
};
