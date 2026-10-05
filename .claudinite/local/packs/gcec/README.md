# gcec pack (local)

This project's general working pack — a **local pack**
(`.claudinite/local/packs/` — tracked project content, run by the same
Claudinite engine as the canon packs). Declared by hand in
[`.claudinite/settings.yaml`](../../../settings.yaml); never
fingerprinted or seeded.

## Contents

| Slot | What |
|---|---|
| Prose | [RULES.md](RULES.md) — working rules, owner commands, testing invariants, codebase gotchas, workflow-failure classification, architecture rules of the road, the capture policy |
| Checks | Go, in [checks/](checks/): [test-offline-list-sync](checks/test_offline_list_sync.go) · [custom-sources-flat](checks/custom_sources_flat.go) · [npm-test-glob-coverage](checks/npm_test_glob_coverage.go) · [pipeline-site-agnostic](checks/pipeline_site_agnostic.go) · [regen-artifacts-merge-ours](checks/regen_artifacts_merge_ours.go) · [generic-coverage-scope-agrees](checks/generic_coverage_scope_agrees.go) (+ fixtures in [checks_test.go](checks/checks_test.go), run by [checks/test.sh](checks/test.sh)) |
| Daily tasks | none |
| Skills | [snapshot-approval](skills/snapshot-approval/SKILL.md) · [merge-and-ci](skills/merge-and-ci/SKILL.md) · [testing-guide](skills/testing-guide/SKILL.md) |

## Rules

| Rule (≤5 words) | How enforced |
|---|---|
| test:offline list matches tree | **hardcoded** (`test-offline-list-sync`) |
| npm test reaches every test | **hardcoded** (`npm-test-glob-coverage`) |
| Cap/qualify GitHub MCP queries | prose |
| CI green before merge (2× heavy) | prose (canon owns method/title) |
| Generated files: regen, never hand-merge | prose (+ each artifact's own gate) |
| Regen artifacts on the `ours` driver | **hardcoded** (`regen-artifacts-merge-ours`; canon `basics/generated-merge-driver` owns the `GENERATED`-named half) |
| Branch sync: rebase main + regen | prose |
| Snapshot moves need owner approval | skill (snapshot-approval) |
| Post-merge: fetch main, never check out | skill (merge-and-ci) |
| Green PR that won't arm: merge it | skill (merge-and-ci) |
| Post-merge fetch denied: retry once, move on | skill (merge-and-ci) |
| bump version = full release | prose (owner command) |
| learned lessons = canon pass | prose (owner command) |
| Integration cases are the contract | prose |
| Mirror tree, one test per file | prose (list half is the check) |
| Pin cases to REFERENCE_NOW floor | prose |
| MV3/jsdom/GCal/clean() gotchas | prose (see RULES.md) |
| Unattended workflows wire the reporter | **advisory** (canon `gha/scheduled-failure-escalation`) + prose (the non-`schedule:` gap) |
| Single-file-per-host architecture | **hardcoded** (`custom-sources-flat`) + prose |
| Pipeline knows no specific site | **hardcoded** (`pipeline-site-agnostic`, host literals only) + prose |
| Capture into the owning pack | prose (the policy itself) |
