# File cross-reference report

Extracted from **comment regions and doc prose** across all tracked text files. An edge *A → B* means a comment (or doc link / `@import` / HTML asset ref) in file **A** names file **B**, and **B** is a real tracked file in the repo. External URLs, issue numbers (`#146`), and npm packages are dropped because they don't resolve to a repo file. `dev/requirements/requirements.md` and `dev/procedures/this_project/fileDescriptions.md` are excluded (their galleries/catalogs swamp the real signal — see `EXCLUDE` in `extract.js`). **Same-folder and immediate parent↔subfolder edges are omitted**: two files in the same folder never link, and a file directly in folder P never links to a file directly in an immediate subfolder of P (either direction). Sibling-folder and grandchild-or-deeper references are kept.

Also excluded entirely (never a node): **json / html / image files**, **test folders** (a path segment named `test`/`tests` or ending `-test`/`-tests`), and **`*.case.js`** requirement cases.

Text files scanned: **134**.

## Totals

- Files that reference others: **68**
- Distinct referenced files: **75**
- Total reference edges: **224** (257 incl. duplicate mentions)
- Ambiguous basename mentions (unresolved): **18**

## Most reference-heavy files (out-degree)

| Out | File |
|----:|------|
| 45 | `dev/procedures/this_project/testing.md` |
| 19 | `CLAUDE.md` |
| 16 | `dev/incremental-maintenance/auto-fallback-coverage.md` |
| 15 | `dev/requirements/README.md` |
| 12 | `dev/procedures/this_project/highLevelDesign.md` |
| 11 | `dev/create-extractor/auto-extractor.md` |
| 11 | `dev/procedures/this_project/github.md` |
| 11 | `dev/procedures/this_project/technicalGotchas.md` |
| 8 | `dev/create-extractor/adding-a-source.md` |
| 7 | `dev/procedures/this_project/workflow.md` |
| 6 | `README.md` |
| 6 | `dev/requirements/extractor/fallback/fallback-coverage.js` |
| 6 | `dev/requirements/shared/render/popup-renderer.js` |
| 5 | `.github/workflows/auto-implement-extractor.yml` |
| 3 | `.github/workflows/finalize-extractor.yml` |
| 3 | `dev/create-extractor/README.md` |
| 3 | `dev/create-extractor/agent-prompt-extractor.md` |
| 3 | `dev/requirements/extractor/data/user-submitted/README.md` |
| 3 | `dev/requirements/extractor/live.test.js` |
| 3 | `dev/requirements/shared/render/actions.js` |

## Most referenced files (in-degree)

| In | File |
|----:|------|
| 13 | `dev/procedures/this_project/workflow.md` |
| 12 | `dev/procedures/this_project/testing.md` |
| 10 | `extension/events-popup/popup.js` |
| 9 | `dev/procedures/this_project/github.md` |
| 8 | `extension/event-extractors/assemble-events.js` |
| 7 | `dev/create-extractor/phase1-prepare.sh` |
| 7 | `dev/create-extractor/auto-extractor.md` |
| 7 | `extension/config.js` |
| 7 | `extension/icon/toolbar-icon.js` |
| 7 | `extension/event-extractors/extract-unsupported.js` |
| 6 | `dev/procedures/this_project/technicalGotchas.md` |
| 6 | `extension/event-extractors/custom/meetup.js` |
| 6 | `extension/events-popup/popup.css` |
| 5 | `dev/procedures/this_project/highLevelDesign.md` |
| 5 | `dev/requirements/README.md` |
| 5 | `extension/event-extractors/custom/telavivcinematheque.js` |
| 5 | `dev/requirements/extractor/live.test.js` |
| 5 | `extension/events-popup/events-view.js` |
| 5 | `dev/requirements/shared/render/visual-snapshots.test.js` |
| 4 | `dev/build/release/store_artifacts/PRIVACY.md` |

## Folder-to-folder reference flow

| From folder | → | To folder | Edges |
|---|---|---|---:|
| `dev/procedures/this_project` | → | `dev/requirements` | 15 |
| `dev/procedures/this_project` | → | `dev/procedures/general` | 12 |
| `root` | → | `dev/procedures/general` | 11 |
| `dev/create-extractor` | → | `extension/event-extractors` | 11 |
| `dev/requirements` | → | `extension/events-popup` | 9 |
| `dev/procedures/this_project` | → | `extension/events-popup` | 8 |
| `root` | → | `dev/procedures/this_project` | 7 |
| `dev/procedures/this_project` | → | `dev/requirements/extractor` | 7 |
| `.github` | → | `dev/create-extractor` | 6 |
| `dev/procedures/general` | → | `dev/procedures/this_project` | 6 |
| `dev/procedures/this_project` | → | `.github` | 6 |
| `dev/create-extractor` | → | `extension` | 5 |
| `dev/procedures/this_project` | → | `dev/create-extractor` | 5 |
| `dev/procedures/this_project` | → | `extension/event-extractors` | 5 |
| `.github` | → | `dev/procedures/this_project` | 4 |
| `dev/create-extractor` | → | `dev/procedures/this_project` | 4 |
| `dev/create-extractor` | → | `.github` | 4 |
| `dev/incremental-maintenance` | → | `dev/requirements/extractor` | 4 |
| `dev/requirements` | → | `dev/procedures/this_project` | 4 |
| `dev/requirements/extractor` | → | `extension/event-extractors` | 4 |
| `root` | → | `dev/build` | 3 |
| `dev/create-extractor` | → | `dev/requirements/extractor` | 3 |
| `dev/incremental-maintenance` | → | `dev/procedures/this_project` | 3 |
| `dev/procedures/this_project` | → | `extension` | 3 |
| `dev/procedures/this_project` | → | `extension/icon` | 3 |
| `dev/procedures/this_project` | → | `root` | 3 |
| `.claude` | → | `dev/procedures/this_project` | 2 |
| `.github` | → | `dev/build` | 2 |
| `root` | → | `dev/requirements` | 2 |
| `dev/create-extractor` | → | `dev/build` | 2 |

## Full per-file references

Every file that names another file in its comments / prose, with each reference target.

### `.claude/cloud-setup.sh`

- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`

### `.claude/hooks/check-environment-version.sh`

- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`

### `.github/secret_scanning.yml`

- `dev/create-extractor/phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh`

### `.github/workflows/auto-implement-extractor.yml`

- `dev/create-extractor/auto-extractor.md` → `dev/create-extractor/auto-extractor.md`
- `phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh` _(by name)_
- `extension/config.js` → `extension/config.js`
- `attach-sample-url.js` → `dev/create-extractor/attach-sample-url.js` _(by name)_
- `dev/create-extractor/handoff-to-agent.sh` → `dev/create-extractor/handoff-to-agent.sh`

### `.github/workflows/claudinite-lesson-handoff.yml`

- `dev/procedures/general/claudinite-handoff.md` → `dev/procedures/general/claudinite-handoff.md`

### `.github/workflows/deploy-privacy-page.yml`

- `PRIVACY.md` → `dev/build/release/store_artifacts/PRIVACY.md` _(by name)_
- `dev/build/release/store_artifacts/PRIVACY.md` → `dev/build/release/store_artifacts/PRIVACY.md`

### `.github/workflows/finalize-extractor.yml`

- `dev/create-extractor/auto-extractor.md` → `dev/create-extractor/auto-extractor.md`
- `dev/procedures/this_project/highLevelDesign.md` → `dev/procedures/this_project/highLevelDesign.md`
- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`

### `.github/workflows/publish-chrome-store.yml`

- `PRIVACY.md` → `dev/build/release/store_artifacts/PRIVACY.md` _(by name)_

### `.github/workflows/release.yml`

- `dev/procedures/this_project/workflow.md` → `dev/procedures/this_project/workflow.md`

### `.github/workflows/report-failure.yml`

- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`

### `CLAUDE.md`

- `dev/procedures/this_project/workflow.md` → `dev/procedures/this_project/workflow.md`
- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`
- `dev/procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md`
- `dev/procedures/general/auto-lessons.md` → `dev/procedures/general/auto-lessons.md`
- `dev/procedures/general/auto-branch-report.md` → `dev/procedures/general/auto-branch-report.md`
- `dev/procedures/general/claudinite-handoff.md` → `dev/procedures/general/claudinite-handoff.md`
- `dev/procedures/general/auto-optimize-procedures.md` → `dev/procedures/general/auto-optimize-procedures.md`
- `dev/procedures/general/textAndFileManipulation.md` → `dev/procedures/general/textAndFileManipulation.md`
- `dev/procedures/this_project/highLevelDesign.md` → `dev/procedures/this_project/highLevelDesign.md`
- `dev/requirements/README.md` → `dev/requirements/README.md`
- `dev/build/release/releasing.md` → `dev/build/release/releasing.md`
- `dev/create-extractor/auto-extractor.md` → `dev/create-extractor/auto-extractor.md`
- `dev/procedures/this_project/technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md`
- `dev/procedures/general/engineeringPractices.md` → `dev/procedures/general/engineeringPractices.md`
- `dev/procedures/general/agenticBestPractices.md` → `dev/procedures/general/agenticBestPractices.md`
- `dev/procedures/general/git-and-github.md` → `dev/procedures/general/git-and-github.md`
- `dev/procedures/general/working-discipline.md` → `dev/procedures/general/working-discipline.md`
- `dev/procedures/general/testingPractices.md` → `dev/procedures/general/testingPractices.md`
- `dev/procedures/general/filePlacement.md` → `dev/procedures/general/filePlacement.md`

### `README.md`

- `dev/procedures/this_project/highLevelDesign.md` → `dev/procedures/this_project/highLevelDesign.md`
- `dev/build/release/releasing.md` → `dev/build/release/releasing.md`
- `dev/build/release/store_artifacts/PRIVACY.md` → `dev/build/release/store_artifacts/PRIVACY.md`
- `extension/icon/toolbar-icon.js` → `extension/icon/toolbar-icon.js`
- `dev/requirements/README.md` → `dev/requirements/README.md`
- `dev/procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md`

### `dev/build/gen-load-order.js`

- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_

### `dev/build/release/releasing.md`

- `dev/procedures/this_project/workflow.md` → `dev/procedures/this_project/workflow.md`
- `procedures/this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_

### `dev/build/release/shipping-files.js`

- `config.js` → `extension/config.js` _(by name)_

### `dev/build/release/shipping-files.test.js`

- `popup.js` → `extension/events-popup/popup.js` _(by name)_

### `dev/create-extractor/README.md`

- `extension/config.js` → `extension/config.js`
- `extension/fallback-policy.js` → `extension/fallback-policy.js`
- `dev/build/gen-load-order.js` → `dev/build/gen-load-order.js`

### `dev/create-extractor/adding-a-source.md`

- `extension/event-extractors/assemble-events.js` → `extension/event-extractors/assemble-events.js`
- `extension/event-extractors/custom/meetup.js` → `extension/event-extractors/custom/meetup.js`
- `registry.js` → `extension/event-extractors/registry.js` _(by name)_
- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_
- `extension/icon/toolbar-icon.js` → `extension/icon/toolbar-icon.js`
- `dev/procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md`
- `dev/requirements/extractor/extractor-support.test.js` → `dev/requirements/extractor/extractor-support.test.js`
- `requirements/README.md` → `dev/requirements/README.md` _(by name)_

### `dev/create-extractor/agent-prompt-extractor.md`

- `extension/event-extractors/custom/meetup.js` → `extension/event-extractors/custom/meetup.js`
- `extension/event-extractors/custom/telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js`
- `meetup.js` → `extension/event-extractors/custom/meetup.js` _(by name)_

### `dev/create-extractor/auto-extractor.md`

- `telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js` _(by name)_
- `auto-implement-extractor.yml` → `.github/workflows/auto-implement-extractor.yml` _(by name)_
- `finalize-extractor.yml` → `.github/workflows/finalize-extractor.yml` _(by name)_
- `extension/events-popup/source-request-view.js` → `extension/events-popup/source-request-view.js`
- `extension/config.js` → `extension/config.js`
- `extension/fallback-policy.js` → `extension/fallback-policy.js`
- `dev/build/gen-load-order.js` → `dev/build/gen-load-order.js`
- `meetup.js` → `extension/event-extractors/custom/meetup.js` _(by name)_
- `dev/procedures/this_project/highLevelDesign.md` → `dev/procedures/this_project/highLevelDesign.md`
- `test.yml` → `.github/workflows/test.yml` _(by name)_
- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`

### `dev/create-extractor/handoff-to-agent.sh`

- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`

### `dev/create-extractor/phase1-prepare.sh`

- `live.test.js` → `dev/requirements/extractor/live.test.js` _(by name)_
- `dev/requirements/extractor/data-files.js` → `dev/requirements/extractor/data-files.js`

### `dev/create-extractor/phase2-finalize.sh`

- `test.yml` → `.github/workflows/test.yml` _(by name)_

### `dev/create-extractor/plan-names.js`

- `telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js` _(by name)_

### `dev/create-extractor/resolve-source.js`

- `telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js` _(by name)_
- `registry.js` → `extension/event-extractors/registry.js` _(by name)_

### `dev/create-extractor/scaffold-source.js`

- `event-extractors/custom/meetup.js` → `extension/event-extractors/custom/meetup.js` _(by name)_

### `dev/create-extractor/triage-extractor-request.js`

- `fallback-policy.js` → `extension/fallback-policy.js` _(by name)_

### `dev/incremental-maintenance/auto-fallback-coverage.md`

- `dev/requirements/extractor/data/**` → `dev/requirements/extractor/data`
- `extension/event-extractors/extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js`
- `extension/event-extractors/helpers/*` → `extension/event-extractors/helpers`
- `fallback-coverage.test.js` → `dev/requirements/extractor/fallback/fallback-coverage.test.js` _(by name)_
- `fallback-coverage.js` → `dev/requirements/extractor/fallback/fallback-coverage.js` _(by name)_
- `fallback-coverage.GENERATED.md` → `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` _(by name)_
- `testing.md` → `dev/procedures/this_project/testing.md` _(by name)_
- `procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md` _(by name)_
- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_
- `procedures/this_project/technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_
- `github.md` → `dev/procedures/this_project/github.md` _(by name)_
- `procedures/this_project/github.md` → `dev/procedures/this_project/github.md` _(by name)_
- `auto-branch-report.md` → `dev/procedures/general/auto-branch-report.md` _(by name)_
- `procedures/general/auto-branch-report.md` → `dev/procedures/general/auto-branch-report.md` _(by name)_
- `auto-lessons.md` → `dev/procedures/general/auto-lessons.md` _(by name)_
- `procedures/general/auto-lessons.md` → `dev/procedures/general/auto-lessons.md` _(by name)_

### `dev/procedures/general/agenticBestPractices.md`

- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_
- `CLAUDE.md` → `CLAUDE.md` _(by name)_

### `dev/procedures/general/auto-optimize-procedures.md`

- `CLAUDE.md` → `CLAUDE.md` _(by name)_

### `dev/procedures/general/code-comments.md`

- `extractor-support.test.js` → `dev/requirements/extractor/extractor-support.test.js` _(by name)_

### `dev/procedures/general/engineeringPractices.md`

- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_

### `dev/procedures/general/filePlacement.md`

- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_

### `dev/procedures/general/git-and-github.md`

- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_

### `dev/procedures/general/testingPractices.md`

- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_

### `dev/procedures/general/working-discipline.md`

- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_

### `dev/procedures/this_project/github.md`

- `general/git-and-github.md` → `dev/procedures/general/git-and-github.md` _(by name)_
- `general/working-discipline.md` → `dev/procedures/general/working-discipline.md` _(by name)_
- `auto-extractor.md` → `dev/create-extractor/auto-extractor.md` _(by name)_
- `create-extractor/auto-extractor.md` → `dev/create-extractor/auto-extractor.md` _(by name)_
- `test.yml` → `.github/workflows/test.yml` _(by name)_
- `auto-implement-extractor.yml` → `.github/workflows/auto-implement-extractor.yml` _(by name)_
- `finalize-extractor.yml` → `.github/workflows/finalize-extractor.yml` _(by name)_
- `publish-chrome-store.yml` → `.github/workflows/publish-chrome-store.yml` _(by name)_
- `release.yml` → `.github/workflows/release.yml` _(by name)_
- `deploy-privacy-page.yml` → `.github/workflows/deploy-privacy-page.yml` _(by name)_
- `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` → `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md`

### `dev/procedures/this_project/highLevelDesign.md`

- `extension/config.js` → `extension/config.js`
- `toolbar-icon.js` → `extension/icon/toolbar-icon.js` _(by name)_
- `popup.js` → `extension/events-popup/popup.js` _(by name)_
- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_
- `extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js` _(by name)_
- `build-calendar-url.js` → `extension/events-popup/build-calendar-url.js` _(by name)_
- `events-view.js` → `extension/events-popup/events-view.js` _(by name)_
- `auto-extractor.md` → `dev/create-extractor/auto-extractor.md` _(by name)_
- `create-extractor/auto-extractor.md` → `dev/create-extractor/auto-extractor.md` _(by name)_
- `extension/event-extractors/extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js`
- `extension/fallback-policy.js` → `extension/fallback-policy.js`
- `extension/event-extractors/assemble-events.js` → `extension/event-extractors/assemble-events.js`

### `dev/procedures/this_project/technicalGotchas.md`

- `CLAUDE.md` → `CLAUDE.md` _(by name)_
- `dev/create-extractor/phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh`
- `icon/toolbar-icon.js` → `extension/icon/toolbar-icon.js` _(by name)_
- `dev/requirements/heavy/extension-load.chrome.test.js` → `dev/requirements/heavy/extension-load.chrome.test.js`
- `general/engineeringPractices.md` → `dev/procedures/general/engineeringPractices.md` _(by name)_
- `general/testingPractices.md` → `dev/procedures/general/testingPractices.md` _(by name)_
- `custom/telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js` _(by name)_
- `registry.js` → `extension/event-extractors/registry.js` _(by name)_
- `general/git-and-github.md` → `dev/procedures/general/git-and-github.md` _(by name)_
- `dev/requirements/extractor/data/**` → `dev/requirements/extractor/data`
- `dev/requirements/shared/build-requirements-gallery.js` → `dev/requirements/shared/build-requirements-gallery.js`

### `dev/procedures/this_project/testing.md`

- `general/engineeringPractices.md` → `dev/procedures/general/engineeringPractices.md` _(by name)_
- `general/testingPractices.md` → `dev/procedures/general/testingPractices.md` _(by name)_
- `extension/events-popup/events-view.js` → `extension/events-popup/events-view.js`
- `extension-test/**` → `extension-test`
- `dev/requirements/README.md` → `dev/requirements/README.md`
- `requirements/README.md` → `dev/requirements/README.md` _(by name)_
- `dev/requirements/shared/kinds.js` → `dev/requirements/shared/kinds.js`
- `dev/requirements/shared/render/render-snapshot.js` → `dev/requirements/shared/render/render-snapshot.js`
- `dev/requirements/shared/render/popup-renderer.js` → `dev/requirements/shared/render/popup-renderer.js`
- `dev/requirements/shared/build-requirements-gallery.js` → `dev/requirements/shared/build-requirements-gallery.js`
- `extension/icon/toolbar-icon.js` → `extension/icon/toolbar-icon.js`
- `dev/requirements/shared/render/icon-renderer.js` → `dev/requirements/shared/render/icon-renderer.js`
- `dev/requirements/shared/render/fake-chrome.js` → `dev/requirements/shared/render/fake-chrome.js`
- `dev/requirements/behavior/events-view-actions.test.js` → `dev/requirements/behavior/events-view-actions.test.js`
- `dev/requirements/extractor/extractor-support.test.js` → `dev/requirements/extractor/extractor-support.test.js`
- `dev/requirements/logic/product-requirements.test.js` → `dev/requirements/logic/product-requirements.test.js`
- `dev/requirements/requirements-coverage.test.js` → `dev/requirements/requirements-coverage.test.js`
- `events-view.js` → `extension/events-popup/events-view.js` _(by name)_
- `dev/requirements/shared/reference-time.js` → `dev/requirements/shared/reference-time.js`
- `dev/requirements/extractor/live.test.js` → `dev/requirements/extractor/live.test.js`
- `live.test.js` → `dev/requirements/extractor/live.test.js` _(by name)_
- `dev/create-extractor/phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh`
- `phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh` _(by name)_
- `dev/requirements/extractor/fallback/fallback-coverage.test.js` → `dev/requirements/extractor/fallback/fallback-coverage.test.js`
- `extension/event-extractors/extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js`
- `dev/requirements/extractor/fallback/fallback-coverage.js` → `dev/requirements/extractor/fallback/fallback-coverage.js`
- `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` → `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md`
- `dev/requirements/shared/render/visual-snapshots.test.js` → `dev/requirements/shared/render/visual-snapshots.test.js`
- `extension/events-popup/popup.js` → `extension/events-popup/popup.js`
- `source-request-view.js` → `extension/events-popup/source-request-view.js` _(by name)_
- `icon-renderer.js` → `dev/requirements/shared/render/icon-renderer.js` _(by name)_
- `fake-chrome.js` → `dev/requirements/shared/render/fake-chrome.js` _(by name)_
- `dev/requirements/shared/render/actions.js` → `dev/requirements/shared/render/actions.js`
- `extension/events-popup/popup.css` → `extension/events-popup/popup.css`
- `popup-renderer.js` → `dev/requirements/shared/render/popup-renderer.js` _(by name)_
- `visual-snapshots.test.js` → `dev/requirements/shared/render/visual-snapshots.test.js` _(by name)_
- `extension/events-popup/*` → `extension/events-popup`
- `dev/requirements/shared/snapshot-artifacts-dir.js` → `dev/requirements/shared/snapshot-artifacts-dir.js`
- `fallback-coverage.test.js` → `dev/requirements/extractor/fallback/fallback-coverage.test.js` _(by name)_
- `fallback-coverage.GENERATED.md` → `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` _(by name)_
- `dev/requirements/shared/ui-requirements.js` → `dev/requirements/shared/ui-requirements.js`
- `dev/requirements/shared/requirements-gallery.test.js` → `dev/requirements/shared/requirements-gallery.test.js`
- `dev/requirements/heavy/extension-load.chrome.test.js` → `dev/requirements/heavy/extension-load.chrome.test.js`
- `scraperapi-fetch.sh` → `dev/create-extractor/scraperapi-fetch.sh` _(by name)_
- `extension/events-popup/derive-wait-selector.js` → `extension/events-popup/derive-wait-selector.js`

### `dev/procedures/this_project/workflow.md`

- `general/testingPractices.md` → `dev/procedures/general/testingPractices.md` _(by name)_
- `dev/procedures/general/agenticBestPractices.md` → `dev/procedures/general/agenticBestPractices.md`
- `CLAUDE.md` → `CLAUDE.md` _(by name)_
- `dev/procedures/general/engineeringPractices.md` → `dev/procedures/general/engineeringPractices.md`
- `auto-optimize-procedures.md` → `dev/procedures/general/auto-optimize-procedures.md` _(by name)_
- `general/auto-optimize-procedures.md` → `dev/procedures/general/auto-optimize-procedures.md` _(by name)_
- `dev/procedures/general/auto-lessons.md` → `dev/procedures/general/auto-lessons.md`

### `dev/requirements/README.md`

- `shared/render/visual-snapshots.test.js` → `dev/requirements/shared/render/visual-snapshots.test.js`
- `shared/render/render-snapshot.js` → `dev/requirements/shared/render/render-snapshot.js`
- `dev/procedures/this_project/workflow.md` → `dev/procedures/this_project/workflow.md`
- `procedures/this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_
- `render-snapshot.js` → `dev/requirements/shared/render/render-snapshot.js` _(by name)_
- `popup-renderer.js` → `dev/requirements/shared/render/popup-renderer.js` _(by name)_
- `icon-renderer.js` → `dev/requirements/shared/render/icon-renderer.js` _(by name)_
- `fake-chrome.js` → `dev/requirements/shared/render/fake-chrome.js` _(by name)_
- `actions.js` → `dev/requirements/shared/render/actions.js` _(by name)_
- `refresh-snapshots.js` → `dev/requirements/shared/render/refresh-snapshots.js` _(by name)_
- `visual-snapshots.test.js` → `dev/requirements/shared/render/visual-snapshots.test.js` _(by name)_
- `dev/create-extractor/adding-a-source.md` → `dev/create-extractor/adding-a-source.md`
- `create-extractor/adding-a-source.md` → `dev/create-extractor/adding-a-source.md` _(by name)_
- `dev/procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md`
- `procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md` _(by name)_

### `dev/requirements/behavior/events-view-actions.test.js`

- `testing.md` → `dev/procedures/this_project/testing.md` _(by name)_

### `dev/requirements/extractor/data-files.js`

- `dev/create-extractor/phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh`

### `dev/requirements/extractor/data/user-submitted/README.md`

- `secret_scanning.yml` → `.github/secret_scanning.yml` _(by name)_
- `dev/requirements/extractor/data-files.js` → `dev/requirements/extractor/data-files.js`
- `live.test.js` → `dev/requirements/extractor/live.test.js` _(by name)_

### `dev/requirements/extractor/extractor-support.test.js`

- `events-view-actions.test.js` → `dev/requirements/behavior/events-view-actions.test.js` _(by name)_

### `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md`

- `dev/procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md`
- `extension/event-extractors/extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js`

### `dev/requirements/extractor/fallback/fallback-coverage.js`

- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_
- `testing.md` → `dev/procedures/this_project/testing.md` _(by name)_
- `event-extractors/assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_
- `events-popup/popup.js` → `extension/events-popup/popup.js` _(by name)_
- `config.js` → `extension/config.js` _(by name)_
- `event-extractors/extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js` _(by name)_

### `dev/requirements/extractor/fallback/fallback-coverage.test.js`

- `event-extractors/extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js` _(by name)_

### `dev/requirements/extractor/live.test.js`

- `dev/create-extractor/phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh`
- `events-popup/build-calendar-url.js` → `extension/events-popup/build-calendar-url.js` _(by name)_
- `build-calendar-url.js` → `extension/events-popup/build-calendar-url.js` _(by name)_

### `dev/requirements/popup/kind.js`

- `shared/render/visual-snapshots.test.js` → `dev/requirements/shared/render/visual-snapshots.test.js` _(by name)_

### `dev/requirements/requirements-coverage.test.js`

- `render-snapshot.js` → `dev/requirements/shared/render/render-snapshot.js` _(by name)_

### `dev/requirements/shared/build-requirements-gallery.js`

- `meetup.js` → `extension/event-extractors/custom/meetup.js` _(by name)_
- `live.test.js` → `dev/requirements/extractor/live.test.js` _(by name)_

### `dev/requirements/shared/gen-states-flowchart.js`

- `events-popup/popup.js` → `extension/events-popup/popup.js` _(by name)_

### `dev/requirements/shared/reference-time.js`

- `extension/events-popup/events-view.js` → `extension/events-popup/events-view.js`

### `dev/requirements/shared/render/actions.js`

- `testing.md` → `dev/procedures/this_project/testing.md` _(by name)_
- `popup.css` → `extension/events-popup/popup.css` _(by name)_
- `popup.js` → `extension/events-popup/popup.js` _(by name)_

### `dev/requirements/shared/render/fake-chrome.js`

- `extension/icon/toolbar-icon.js` → `extension/icon/toolbar-icon.js`

### `dev/requirements/shared/render/icon-renderer.js`

- `extension/icon/toolbar-icon.js` → `extension/icon/toolbar-icon.js`

### `dev/requirements/shared/render/popup-renderer.js`

- `events-popup/popup.js` → `extension/events-popup/popup.js` _(by name)_
- `events-popup/popup.css` → `extension/events-popup/popup.css` _(by name)_
- `popup.css` → `extension/events-popup/popup.css` _(by name)_
- `events-view.js` → `extension/events-popup/events-view.js` _(by name)_
- `popup.js` → `extension/events-popup/popup.js` _(by name)_
- `config.js` → `extension/config.js` _(by name)_

### `dev/requirements/shared/render/refresh-snapshots.js`

- `events-popup/popup.css` → `extension/events-popup/popup.css` _(by name)_

### `dev/requirements/shared/render/visual-snapshots.test.js`

- `events-popup/popup.css` → `extension/events-popup/popup.css` _(by name)_
- `dev/procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md`
- `dev/requirements/behavior/events-view-actions.test.js` → `dev/requirements/behavior/events-view-actions.test.js`

### `extension/event-extractors/assemble-events.js`

- `dev/procedures/this_project/highLevelDesign.md` → `dev/procedures/this_project/highLevelDesign.md`
- `events-popup/popup.js` → `extension/events-popup/popup.js` _(by name)_

### `extension/event-extractors/custom/tabitisrael.js`

- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_

### `extension/event-extractors/extract-unsupported.js`

- `events-popup/popup.js` → `extension/events-popup/popup.js` _(by name)_

### `extension/events-popup/build-calendar-url.js`

- `workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_
- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_

### `extension/events-popup/popup.css`

- `popup-renderer.js` → `dev/requirements/shared/render/popup-renderer.js` _(by name)_

### `extension/events-popup/popup.js`

- `gen-load-order.js` → `dev/build/gen-load-order.js` _(by name)_
- `dev/requirements/shared/render/actions.js` → `dev/requirements/shared/render/actions.js`
- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_

### `extension/icon/toolbar-icon.js`

- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_

## Ambiguous references (basename matches >1 file)

- `dev/build/release/releasing.md` names `README.md` → could be: `README.md`, `dev/analysis/file-cross-references/README.md`, `dev/build/release/store_artifacts/README.md`, `dev/create-extractor/README.md`, `dev/requirements/README.md`, `dev/requirements/extractor/data/user-submitted/README.md`
- `dev/procedures/this_project/testing.md` names `kind.js` → could be: `dev/requirements/behavior/kind.js`, `dev/requirements/extractor/kind.js`, `dev/requirements/icon/kind.js`, `dev/requirements/logic/kind.js`, `dev/requirements/popup/kind.js`
- `dev/requirements/README.md` names `kind.js` → could be: `dev/requirements/behavior/kind.js`, `dev/requirements/extractor/kind.js`, `dev/requirements/icon/kind.js`, `dev/requirements/logic/kind.js`, `dev/requirements/popup/kind.js`
- `dev/requirements/requirements-coverage.test.js` names `kind.js` → could be: `dev/requirements/behavior/kind.js`, `dev/requirements/extractor/kind.js`, `dev/requirements/icon/kind.js`, `dev/requirements/logic/kind.js`, `dev/requirements/popup/kind.js`
- `dev/requirements/shared/kinds.js` names `kind.js` → could be: `dev/requirements/behavior/kind.js`, `dev/requirements/extractor/kind.js`, `dev/requirements/icon/kind.js`, `dev/requirements/logic/kind.js`, `dev/requirements/popup/kind.js`
- `dev/requirements/shared/kinds.js` names `README.md` → could be: `README.md`, `dev/analysis/file-cross-references/README.md`, `dev/build/release/store_artifacts/README.md`, `dev/create-extractor/README.md`, `dev/requirements/README.md`, `dev/requirements/extractor/data/user-submitted/README.md`
