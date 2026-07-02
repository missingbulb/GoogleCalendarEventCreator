# File cross-reference report

Extracted from **comment regions and doc prose** across all tracked text files. An edge *A → B* means a comment (or doc link / `@import` / HTML asset ref) in file **A** names file **B**, and **B** is a real tracked file in the repo. External URLs, issue numbers (`#146`), and npm packages are dropped because they don't resolve to a repo file. `dev/requirements/requirements.md` and `dev/procedures/this_project/fileDescriptions.md` are excluded (their galleries/catalogs swamp the real signal — see `EXCLUDE` in `extract.js`). **Immediate parent↔subfolder edges are omitted**: a file directly in folder P and a file directly in an immediate subfolder of P never link (either direction) — same-folder, sibling, and grandchild-or-deeper references are kept.

Text files scanned: **297**.

## Totals

- Files that reference others: **124**
- Distinct referenced files: **116**
- Total reference edges: **441** (485 incl. duplicate mentions)
- Ambiguous basename mentions (unresolved): **19**

## Most reference-heavy files (out-degree)

| Out | File |
|----:|------|
| 57 | `dev/procedures/this_project/testing.md` |
| 29 | `dev/create-extractor/auto-extractor.md` |
| 20 | `dev/create-extractor/README.md` |
| 19 | `CLAUDE.md` |
| 18 | `dev/incremental-maintenance/auto-fallback-coverage.md` |
| 18 | `dev/requirements/README.md` |
| 17 | `dev/procedures/this_project/technicalGotchas.md` |
| 16 | `dev/procedures/this_project/github.md` |
| 16 | `dev/procedures/this_project/workflow.md` |
| 13 | `dev/procedures/this_project/highLevelDesign.md` |
| 11 | `dev/create-extractor/adding-a-source.md` |
| 9 | `dev/requirements/extractor/fallback/fallback-coverage.js` |
| 8 | `dev/requirements/shared/render/popup-renderer.js` |
| 7 | `README.md` |
| 7 | `dev/build/release/releasing.md` |
| 6 | `.github/workflows/auto-implement-extractor.yml` |
| 6 | `dev/build/release/store_artifacts/README.md` |
| 6 | `extension/events-popup/popup.js` |
| 5 | `.github/workflows/finalize-extractor.yml` |
| 5 | `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` |

## Most referenced files (in-degree)

| In | File |
|----:|------|
| 19 | `extension/events-popup/popup.js` |
| 17 | `dev/procedures/this_project/workflow.md` |
| 14 | `dev/create-extractor/auto-extractor.md` |
| 13 | `dev/procedures/this_project/testing.md` |
| 11 | `extension/config.js` |
| 11 | `dev/procedures/this_project/technicalGotchas.md` |
| 11 | `extension/event-extractors/assemble-events.js` |
| 10 | `dev/procedures/this_project/github.md` |
| 10 | `dev/create-extractor/phase1-prepare.sh` |
| 10 | `extension/event-extractors/load-order.generated.json` |
| 10 | `dev/requirements/shared/reference-time.js` |
| 9 | `extension/manifest.json` |
| 9 | `extension/events-popup/events-view.js` |
| 8 | `dev/procedures/this_project/highLevelDesign.md` |
| 8 | `extension/icon/toolbar-icon.js` |
| 8 | `extension/event-extractors/registry.js` |
| 8 | `dev/requirements/extractor/live.test.js` |
| 8 | `extension/events-popup/popup.css` |
| 7 | `package.json` |
| 7 | `extension/fallback-lists.json` |

## Folder-to-folder reference flow

| From folder | → | To folder | Edges |
|---|---|---|---:|
| `dev/create-extractor` | → | `extension/event-extractors` | 15 |
| `dev/procedures/this_project` | → | `dev/requirements` | 15 |
| `dev/procedures/this_project` | → | `dev/procedures/general` | 12 |
| `root` | → | `dev/procedures/general` | 11 |
| `dev/requirements/popup` | → | `dev/requirements` | 10 |
| `dev/requirements` | → | `extension/events-popup` | 10 |
| `dev/create-extractor` | → | `extension` | 9 |
| `dev/procedures/this_project` | → | `dev/requirements/extractor` | 9 |
| `dev/procedures/this_project` | → | `extension/events-popup` | 9 |
| `extension-test` | → | `extension/event-extractors` | 8 |
| `extension-test` | → | `extension/events-popup` | 8 |
| `root` | → | `dev/procedures/this_project` | 7 |
| `dev/procedures/this_project` | → | `extension/event-extractors` | 7 |
| `dev/procedures/this_project` | → | `extension-test` | 7 |
| `.github` | → | `dev/create-extractor` | 6 |
| `dev/procedures/general` | → | `dev/procedures/this_project` | 6 |
| `dev/procedures/this_project` | → | `.github` | 6 |
| `dev/procedures/this_project` | → | `extension` | 6 |
| `dev/procedures/this_project` | → | `root` | 6 |
| `dev/incremental-maintenance` | → | `dev/requirements/extractor` | 5 |
| `dev/procedures/this_project` | → | `dev/create-extractor` | 5 |
| `dev/requirements/extractor` | → | `extension/event-extractors` | 5 |
| `extension-test` | → | `extension` | 5 |
| `.github` | → | `dev/procedures/this_project` | 4 |
| `dev/build` | → | `extension/event-extractors` | 4 |
| `dev/build` | → | `extension` | 4 |
| `dev/create-extractor` | → | `dev/procedures/this_project` | 4 |
| `dev/create-extractor` | → | `.github` | 4 |
| `dev/requirements` | → | `dev/procedures/this_project` | 4 |
| `root` | → | `dev/build` | 3 |

## Full per-file references

Every file that names another file in its comments / prose, with each reference target.

### `.claude/cloud-setup.sh`

- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`

### `.claude/hooks/check-environment-version.sh`

- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`

### `.github/secret_scanning.yml`

- `dev/create-extractor/phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh`

### `.github/workflows/auto-implement-extractor.yml`

- `finalize-extractor.yml` → `.github/workflows/finalize-extractor.yml` _(by name)_
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

- `auto-implement-extractor.yml` → `.github/workflows/auto-implement-extractor.yml` _(by name)_
- `test.yml` → `.github/workflows/test.yml` _(by name)_
- `dev/create-extractor/auto-extractor.md` → `dev/create-extractor/auto-extractor.md`
- `dev/procedures/this_project/highLevelDesign.md` → `dev/procedures/this_project/highLevelDesign.md`
- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`

### `.github/workflows/publish-chrome-store.yml`

- `PRIVACY.md` → `dev/build/release/store_artifacts/PRIVACY.md` _(by name)_
- `deploy-privacy-page.yml` → `.github/workflows/deploy-privacy-page.yml` _(by name)_

### `.github/workflows/release.yml`

- `extension/manifest.json` → `extension/manifest.json`
- `dev/procedures/this_project/workflow.md` → `dev/procedures/this_project/workflow.md`
- `package.json` → `package.json` _(by name)_

### `.github/workflows/report-failure.yml`

- `test.yml` → `.github/workflows/test.yml` _(by name)_
- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`

### `.github/workflows/test.yml`

- `package.json` → `package.json` _(by name)_

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
- `CLAUDE.md` → `CLAUDE.md` _(by name)_

### `dev/build/gen-load-order.js`

- `event-extractors/load-order.generated.json` → `extension/event-extractors/load-order.generated.json` _(by name)_
- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_

### `dev/build/release/build-zip.js`

- `manifest.json` → `extension/manifest.json` _(by name)_
- `dev/build/release/shipping-files.js` → `dev/build/release/shipping-files.js`

### `dev/build/release/releasing.md`

- `dev/build/release/shipping-files.js` → `dev/build/release/shipping-files.js`
- `dev/build/release/shipping-files.test.js` → `dev/build/release/shipping-files.test.js`
- `extension/manifest.json` → `extension/manifest.json`
- `package.json` → `package.json` _(by name)_
- `dev/procedures/this_project/workflow.md` → `dev/procedures/this_project/workflow.md`
- `procedures/this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_
- `extension/icon/images/chromeStoreIcon.png` → `extension/icon/images/chromeStoreIcon.png`

### `dev/build/release/shipping-files.js`

- `dev/build/release/build-zip.js` → `dev/build/release/build-zip.js`
- `dev/build/release/shipping-files.test.js` → `dev/build/release/shipping-files.test.js`
- `manifest.json` → `extension/manifest.json` _(by name)_
- `config.js` → `extension/config.js` _(by name)_

### `dev/build/release/shipping-files.test.js`

- `shipping-files.js` → `dev/build/release/shipping-files.js` _(by name)_
- `event-extractors/load-order.generated.json` → `extension/event-extractors/load-order.generated.json` _(by name)_
- `popup.js` → `extension/events-popup/popup.js` _(by name)_
- `events-popup/popup.html` → `extension/events-popup/popup.html` _(by name)_

### `dev/build/release/store_artifacts/README.md`

- `chrome-store-screenshot-1280x800.png` → `dev/build/release/store_artifacts/chrome-store-screenshot-1280x800.png` _(by name)_
- `generate_icons.py` → `dev/build/release/store_artifacts/generate_icons.py` _(by name)_
- `PRIVACY.md` → `dev/build/release/store_artifacts/PRIVACY.md` _(by name)_
- `extension/icon/images/chromeStoreIcon.png` → `extension/icon/images/chromeStoreIcon.png`
- `extension/icon/images/chromeExtensionManagementIcon.png` → `extension/icon/images/chromeExtensionManagementIcon.png`
- `dev/build/release/store_artifacts/generate_icons.py` → `dev/build/release/store_artifacts/generate_icons.py`

### `dev/build/test/load-order-generated.test.js`

- `event-extractors/load-order.generated.json` → `extension/event-extractors/load-order.generated.json` _(by name)_

### `dev/create-extractor/README.md`

- `auto-extractor.md` → `dev/create-extractor/auto-extractor.md` _(by name)_
- `adding-a-source.md` → `dev/create-extractor/adding-a-source.md` _(by name)_
- `agent-prompt-extractor.md` → `dev/create-extractor/agent-prompt-extractor.md` _(by name)_
- `resolve-source.js` → `dev/create-extractor/resolve-source.js` _(by name)_
- `extractor-naming.js` → `dev/create-extractor/extractor-naming.js` _(by name)_
- `triage-extractor-request.js` → `dev/create-extractor/triage-extractor-request.js` _(by name)_
- `plan-names.js` → `dev/create-extractor/plan-names.js` _(by name)_
- `attach-sample-url.js` → `dev/create-extractor/attach-sample-url.js` _(by name)_
- `derive-names.js` → `dev/create-extractor/derive-names.js` _(by name)_
- `scaffold-source.js` → `dev/create-extractor/scaffold-source.js` _(by name)_
- `scaffold-case.js` → `dev/create-extractor/scaffold-case.js` _(by name)_
- `add-supported-domain.js` → `dev/create-extractor/add-supported-domain.js` _(by name)_
- `extension/fallback-lists.json` → `extension/fallback-lists.json`
- `case-quality.js` → `dev/create-extractor/case-quality.js` _(by name)_
- `phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh` _(by name)_
- `handoff-to-agent.sh` → `dev/create-extractor/handoff-to-agent.sh` _(by name)_
- `phase2-finalize.sh` → `dev/create-extractor/phase2-finalize.sh` _(by name)_
- `extension/config.js` → `extension/config.js`
- `extension/fallback-policy.js` → `extension/fallback-policy.js`
- `dev/build/gen-load-order.js` → `dev/build/gen-load-order.js`

### `dev/create-extractor/add-supported-domain.js`

- `fallback-lists.json` → `extension/fallback-lists.json` _(by name)_

### `dev/create-extractor/adding-a-source.md`

- `extension/event-extractors/assemble-events.js` → `extension/event-extractors/assemble-events.js`
- `extension/event-extractors/custom/meetup.js` → `extension/event-extractors/custom/meetup.js`
- `extension/event-extractors/load-order.generated.json` → `extension/event-extractors/load-order.generated.json`
- `registry.js` → `extension/event-extractors/registry.js` _(by name)_
- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_
- `extension/fallback-lists.json` → `extension/fallback-lists.json`
- `extension-test/integration/supported-domains.test.js` → `extension-test/integration/supported-domains.test.js`
- `extension/icon/toolbar-icon.js` → `extension/icon/toolbar-icon.js`
- `dev/procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md`
- `dev/requirements/extractor/extractor-support.test.js` → `dev/requirements/extractor/extractor-support.test.js`
- `requirements/README.md` → `dev/requirements/README.md` _(by name)_

### `dev/create-extractor/agent-prompt-extractor.md`

- `dev/create-extractor/resolve-source.js` → `dev/create-extractor/resolve-source.js`
- `extension/event-extractors/custom/meetup.js` → `extension/event-extractors/custom/meetup.js`
- `extension/event-extractors/custom/telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js`
- `meetup.js` → `extension/event-extractors/custom/meetup.js` _(by name)_

### `dev/create-extractor/attach-sample-url.js`

- `triage-extractor-request.js` → `dev/create-extractor/triage-extractor-request.js` _(by name)_
- `auto-extractor.md` → `dev/create-extractor/auto-extractor.md` _(by name)_

### `dev/create-extractor/auto-extractor.md`

- `plan-names.js` → `dev/create-extractor/plan-names.js` _(by name)_
- `resolve-source.js` → `dev/create-extractor/resolve-source.js` _(by name)_
- `telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js` _(by name)_
- `auto-implement-extractor.yml` → `.github/workflows/auto-implement-extractor.yml` _(by name)_
- `finalize-extractor.yml` → `.github/workflows/finalize-extractor.yml` _(by name)_
- `dev/create-extractor/adding-a-source.md` → `dev/create-extractor/adding-a-source.md`
- `extension/events-popup/source-request-view.js` → `extension/events-popup/source-request-view.js`
- `agent-prompt-extractor.md` → `dev/create-extractor/agent-prompt-extractor.md` _(by name)_
- `extractor-naming.js` → `dev/create-extractor/extractor-naming.js` _(by name)_
- `triage-extractor-request.js` → `dev/create-extractor/triage-extractor-request.js` _(by name)_
- `attach-sample-url.js` → `dev/create-extractor/attach-sample-url.js` _(by name)_
- `derive-names.js` → `dev/create-extractor/derive-names.js` _(by name)_
- `scaffold-source.js` → `dev/create-extractor/scaffold-source.js` _(by name)_
- `scaffold-case.js` → `dev/create-extractor/scaffold-case.js` _(by name)_
- `add-supported-domain.js` → `dev/create-extractor/add-supported-domain.js` _(by name)_
- `case-quality.js` → `dev/create-extractor/case-quality.js` _(by name)_
- `scraperapi-fetch.sh` → `dev/create-extractor/scraperapi-fetch.sh` _(by name)_
- `phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh` _(by name)_
- `handoff-to-agent.sh` → `dev/create-extractor/handoff-to-agent.sh` _(by name)_
- `phase2-finalize.sh` → `dev/create-extractor/phase2-finalize.sh` _(by name)_
- `extension/config.js` → `extension/config.js`
- `extension/fallback-policy.js` → `extension/fallback-policy.js`
- `dev/build/gen-load-order.js` → `dev/build/gen-load-order.js`
- `meetup.js` → `extension/event-extractors/custom/meetup.js` _(by name)_
- `dev/procedures/this_project/highLevelDesign.md` → `dev/procedures/this_project/highLevelDesign.md`
- `test.yml` → `.github/workflows/test.yml` _(by name)_
- `adding-a-source.md` → `dev/create-extractor/adding-a-source.md` _(by name)_
- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`
- `dev/create-extractor/agent-prompt-extractor.md` → `dev/create-extractor/agent-prompt-extractor.md`

### `dev/create-extractor/case-quality.js`

- `phase2-finalize.sh` → `dev/create-extractor/phase2-finalize.sh` _(by name)_

### `dev/create-extractor/derive-names.js`

- `phase2-finalize.sh` → `dev/create-extractor/phase2-finalize.sh` _(by name)_

### `dev/create-extractor/handoff-to-agent.sh`

- `dev/create-extractor/auto-extractor.md` → `dev/create-extractor/auto-extractor.md`
- `dev/procedures/this_project/github.md` → `dev/procedures/this_project/github.md`

### `dev/create-extractor/phase1-prepare.sh`

- `dev/create-extractor/auto-extractor.md` → `dev/create-extractor/auto-extractor.md`
- `scraperapi-fetch.sh` → `dev/create-extractor/scraperapi-fetch.sh` _(by name)_
- `live.test.js` → `dev/requirements/extractor/live.test.js` _(by name)_
- `dev/requirements/extractor/data-files.js` → `dev/requirements/extractor/data-files.js`

### `dev/create-extractor/phase2-finalize.sh`

- `dev/create-extractor/auto-extractor.md` → `dev/create-extractor/auto-extractor.md`
- `test.yml` → `.github/workflows/test.yml` _(by name)_
- `dev/create-extractor/case-quality.js` → `dev/create-extractor/case-quality.js`

### `dev/create-extractor/plan-names.js`

- `resolve-source.js` → `dev/create-extractor/resolve-source.js` _(by name)_
- `telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js` _(by name)_

### `dev/create-extractor/resolve-source.js`

- `auto-extractor.md` → `dev/create-extractor/auto-extractor.md` _(by name)_
- `telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js` _(by name)_
- `registry.js` → `extension/event-extractors/registry.js` _(by name)_

### `dev/create-extractor/scaffold-source.js`

- `event-extractors/custom/meetup.js` → `extension/event-extractors/custom/meetup.js` _(by name)_

### `dev/create-extractor/scraperapi-fetch.sh`

- `phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh` _(by name)_
- `auto-extractor.md` → `dev/create-extractor/auto-extractor.md` _(by name)_

### `dev/create-extractor/test/extractor-scaffold.test.js`

- `registry.js` → `extension/event-extractors/registry.js` _(by name)_

### `dev/create-extractor/test/resolve-source.test.js`

- `telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js` _(by name)_

### `dev/create-extractor/test/triage-extractor-request.test.js`

- `config.js` → `extension/config.js` _(by name)_
- `fallback-policy.test.js` → `extension-test/fallback-policy.test.js` _(by name)_
- `telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js` _(by name)_

### `dev/create-extractor/triage-extractor-request.js`

- `plan-names.js` → `dev/create-extractor/plan-names.js` _(by name)_
- `fallback-policy.js` → `extension/fallback-policy.js` _(by name)_
- `resolve-source.js` → `dev/create-extractor/resolve-source.js` _(by name)_

### `dev/incremental-maintenance/auto-fallback-coverage.md`

- `dev/requirements/extractor/data/**` → `dev/requirements/extractor/data`
- `extension/event-extractors/extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js`
- `extension/event-extractors/helpers/*` → `extension/event-extractors/helpers`
- `fallback-coverage.test.js` → `dev/requirements/extractor/fallback/fallback-coverage.test.js` _(by name)_
- `fallback-coverage.js` → `dev/requirements/extractor/fallback/fallback-coverage.js` _(by name)_
- `fallback-coverage.GENERATED.md` → `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` _(by name)_
- `fallback-coverage.baseline.GENERATED.json` → `dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json` _(by name)_
- `testing.md` → `dev/procedures/this_project/testing.md` _(by name)_
- `procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md` _(by name)_
- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_
- `procedures/this_project/technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_
- `extension-test/event-extractors/extraction.test.js` → `extension-test/event-extractors/extraction.test.js`
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
- `textAndFileManipulation.md` → `dev/procedures/general/textAndFileManipulation.md` _(by name)_
- `general/filePlacement.md` → `dev/procedures/general/filePlacement.md` _(by name)_

### `dev/procedures/general/engineeringPractices.md`

- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_
- `textAndFileManipulation.md` → `dev/procedures/general/textAndFileManipulation.md` _(by name)_

### `dev/procedures/general/filePlacement.md`

- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_

### `dev/procedures/general/git-and-github.md`

- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_

### `dev/procedures/general/testingPractices.md`

- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_

### `dev/procedures/general/textAndFileManipulation.md`

- `code-comments.md` → `dev/procedures/general/code-comments.md` _(by name)_

### `dev/procedures/general/working-discipline.md`

- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_

### `dev/procedures/test/docs-reachable.test.js`

- `CLAUDE.md` → `CLAUDE.md` _(by name)_
- `agenticBestPractices.md` → `dev/procedures/general/agenticBestPractices.md` _(by name)_
- `PRIVACY.md` → `dev/build/release/store_artifacts/PRIVACY.md` _(by name)_

### `dev/procedures/this_project/github.md`

- `workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_
- `general/git-and-github.md` → `dev/procedures/general/git-and-github.md` _(by name)_
- `general/working-discipline.md` → `dev/procedures/general/working-discipline.md` _(by name)_
- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_
- `auto-extractor.md` → `dev/create-extractor/auto-extractor.md` _(by name)_
- `create-extractor/auto-extractor.md` → `dev/create-extractor/auto-extractor.md` _(by name)_
- `test.yml` → `.github/workflows/test.yml` _(by name)_
- `auto-implement-extractor.yml` → `.github/workflows/auto-implement-extractor.yml` _(by name)_
- `finalize-extractor.yml` → `.github/workflows/finalize-extractor.yml` _(by name)_
- `publish-chrome-store.yml` → `.github/workflows/publish-chrome-store.yml` _(by name)_
- `release.yml` → `.github/workflows/release.yml` _(by name)_
- `deploy-privacy-page.yml` → `.github/workflows/deploy-privacy-page.yml` _(by name)_
- `dev/build/test/load-order-generated.test.js` → `dev/build/test/load-order-generated.test.js`
- `extension/event-extractors/load-order.generated.json` → `extension/event-extractors/load-order.generated.json`
- `dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json` → `dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json`
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
- `extension/event-extractors/load-order.generated.json` → `extension/event-extractors/load-order.generated.json`
- `extension/event-extractors/extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js`
- `extension/fallback-policy.js` → `extension/fallback-policy.js`
- `extension/event-extractors/assemble-events.js` → `extension/event-extractors/assemble-events.js`

### `dev/procedures/this_project/technicalGotchas.md`

- `this_project/highLevelDesign.md` → `dev/procedures/this_project/highLevelDesign.md` _(by name)_
- `highLevelDesign.md` → `dev/procedures/this_project/highLevelDesign.md` _(by name)_
- `CLAUDE.md` → `CLAUDE.md` _(by name)_
- `this_project/workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_
- `workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_
- `dev/create-extractor/phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh`
- `icon/toolbar-icon.js` → `extension/icon/toolbar-icon.js` _(by name)_
- `dev/requirements/heavy/extension-load.chrome.test.js` → `dev/requirements/heavy/extension-load.chrome.test.js`
- `general/engineeringPractices.md` → `dev/procedures/general/engineeringPractices.md` _(by name)_
- `general/testingPractices.md` → `dev/procedures/general/testingPractices.md` _(by name)_
- `extension-test/harness.js` → `extension-test/harness.js`
- `custom/telavivcinematheque.js` → `extension/event-extractors/custom/telavivcinematheque.js` _(by name)_
- `registry.js` → `extension/event-extractors/registry.js` _(by name)_
- `package.json` → `package.json` _(by name)_
- `general/git-and-github.md` → `dev/procedures/general/git-and-github.md` _(by name)_
- `dev/requirements/extractor/data/**` → `dev/requirements/extractor/data`
- `dev/requirements/shared/build-requirements-gallery.js` → `dev/requirements/shared/build-requirements-gallery.js`

### `dev/procedures/this_project/testing.md`

- `general/engineeringPractices.md` → `dev/procedures/general/engineeringPractices.md` _(by name)_
- `general/testingPractices.md` → `dev/procedures/general/testingPractices.md` _(by name)_
- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_
- `extension/events-popup/events-view.js` → `extension/events-popup/events-view.js`
- `extension-test/events-popup/events-view.test.js` → `extension-test/events-popup/events-view.test.js`
- `popup.html` → `extension/events-popup/popup.html` _(by name)_
- `manifest.json` → `extension/manifest.json` _(by name)_
- `fallback-lists.json` → `extension/fallback-lists.json` _(by name)_
- `extension-test/harness.js` → `extension-test/harness.js`
- `extension-test/**` → `extension-test`
- `package.json` → `package.json` _(by name)_
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
- `dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json` → `dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json`
- `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` → `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md`
- `extension-test/event-extractors/extraction.test.js` → `extension-test/event-extractors/extraction.test.js`
- `extension-test/events-popup/build-calendar-url.test.js` → `extension-test/events-popup/build-calendar-url.test.js`
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
- `workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_
- `fallback-coverage.test.js` → `dev/requirements/extractor/fallback/fallback-coverage.test.js` _(by name)_
- `fallback-coverage.GENERATED.md` → `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` _(by name)_
- `dev/requirements/shared/ui-requirements.js` → `dev/requirements/shared/ui-requirements.js`
- `dev/requirements/shared/requirements-gallery.test.js` → `dev/requirements/shared/requirements-gallery.test.js`
- `extension-test/integration/extension-loads.test.js` → `extension-test/integration/extension-loads.test.js`
- `dev/requirements/heavy/extension-load.chrome.test.js` → `dev/requirements/heavy/extension-load.chrome.test.js`
- `scraperapi-fetch.sh` → `dev/create-extractor/scraperapi-fetch.sh` _(by name)_
- `extension/events-popup/derive-wait-selector.js` → `extension/events-popup/derive-wait-selector.js`

### `dev/procedures/this_project/workflow.md`

- `github.md` → `dev/procedures/this_project/github.md` _(by name)_
- `general/testingPractices.md` → `dev/procedures/general/testingPractices.md` _(by name)_
- `extension/manifest.json` → `extension/manifest.json`
- `package.json` → `package.json` _(by name)_
- `dev/procedures/test/uber/shared_constants/version-sync.json` → `dev/procedures/test/uber/shared_constants/version-sync.json`
- `dev/procedures/general/agenticBestPractices.md` → `dev/procedures/general/agenticBestPractices.md`
- `dev/procedures/this_project/highLevelDesign.md` → `dev/procedures/this_project/highLevelDesign.md`
- `dev/procedures/this_project/technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md`
- `testing.md` → `dev/procedures/this_project/testing.md` _(by name)_
- `CLAUDE.md` → `CLAUDE.md` _(by name)_
- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_
- `extension-test/harness.js` → `extension-test/harness.js`
- `dev/procedures/general/engineeringPractices.md` → `dev/procedures/general/engineeringPractices.md`
- `auto-optimize-procedures.md` → `dev/procedures/general/auto-optimize-procedures.md` _(by name)_
- `general/auto-optimize-procedures.md` → `dev/procedures/general/auto-optimize-procedures.md` _(by name)_
- `dev/procedures/general/auto-lessons.md` → `dev/procedures/general/auto-lessons.md`

### `dev/requirements/README.md`

- `requirements-coverage.test.js` → `dev/requirements/requirements-coverage.test.js` _(by name)_
- `shared/render/visual-snapshots.test.js` → `dev/requirements/shared/render/visual-snapshots.test.js`
- `shared/render/render-snapshot.js` → `dev/requirements/shared/render/render-snapshot.js`
- `event-cards-appearance.5.6.1.case.js` → `dev/requirements/popup/cases/event-cards-appearance.5.6.1.case.js` _(by name)_
- `package.json` → `package.json` _(by name)_
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

### `dev/requirements/behavior/kind.js`

- `behavior/events-view-actions.test.js` → `dev/requirements/behavior/events-view-actions.test.js` _(by name)_

### `dev/requirements/extractor/cases/extractor-support.11.16.case.js`

- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_

### `dev/requirements/extractor/data-files.js`

- `dev/create-extractor/phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh`

### `dev/requirements/extractor/data/server-fetched/barby.html`

- `manifest.json` → `extension/manifest.json` _(by name)_

### `dev/requirements/extractor/data/server-fetched/eventer.html`

- `manifest.json` → `extension/manifest.json` _(by name)_

### `dev/requirements/extractor/data/user-submitted/README.md`

- `secret_scanning.yml` → `.github/secret_scanning.yml` _(by name)_
- `dev/requirements/extractor/data-files.js` → `dev/requirements/extractor/data-files.js`
- `live.test.js` → `dev/requirements/extractor/live.test.js` _(by name)_

### `dev/requirements/extractor/extractor-support.test.js`

- `events-view-actions.test.js` → `dev/requirements/behavior/events-view-actions.test.js` _(by name)_
- `dev/requirements/extractor/expected/*` → `dev/requirements/extractor/expected`
- `live.test.js` → `dev/requirements/extractor/live.test.js` _(by name)_

### `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md`

- `dev/requirements/extractor/fallback/fallback-coverage.test.js` → `dev/requirements/extractor/fallback/fallback-coverage.test.js`
- `dev/requirements/extractor/fallback/fallback-coverage.js` → `dev/requirements/extractor/fallback/fallback-coverage.js`
- `dev/procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md`
- `extension/event-extractors/extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js`
- `dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json` → `dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json`

### `dev/requirements/extractor/fallback/fallback-coverage.js`

- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_
- `testing.md` → `dev/procedures/this_project/testing.md` _(by name)_
- `fallback-coverage.test.js` → `dev/requirements/extractor/fallback/fallback-coverage.test.js` _(by name)_
- `fallback-coverage.GENERATED.md` → `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` _(by name)_
- `event-extractors/assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_
- `events-popup/popup.js` → `extension/events-popup/popup.js` _(by name)_
- `config.js` → `extension/config.js` _(by name)_
- `event-extractors/load-order.generated.json` → `extension/event-extractors/load-order.generated.json` _(by name)_
- `event-extractors/extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js` _(by name)_

### `dev/requirements/extractor/fallback/fallback-coverage.test.js`

- `event-extractors/extract-unsupported.js` → `extension/event-extractors/extract-unsupported.js` _(by name)_
- `fallback-coverage.js` → `dev/requirements/extractor/fallback/fallback-coverage.js` _(by name)_
- `fallback-coverage.baseline.GENERATED.json` → `dev/requirements/extractor/fallback/fallback-coverage.baseline.GENERATED.json` _(by name)_
- `fallback-coverage.GENERATED.md` → `dev/requirements/extractor/fallback/fallback-coverage.GENERATED.md` _(by name)_

### `dev/requirements/extractor/kind.js`

- `live.test.js` → `dev/requirements/extractor/live.test.js` _(by name)_
- `extractor/extractor-support.test.js` → `dev/requirements/extractor/extractor-support.test.js` _(by name)_

### `dev/requirements/extractor/live.test.js`

- `dev/create-extractor/phase1-prepare.sh` → `dev/create-extractor/phase1-prepare.sh`
- `events-popup/build-calendar-url.js` → `extension/events-popup/build-calendar-url.js` _(by name)_
- `build-calendar-url.js` → `extension/events-popup/build-calendar-url.js` _(by name)_

### `dev/requirements/heavy/cdp-client.js`

- `extension-load.chrome.test.js` → `dev/requirements/heavy/extension-load.chrome.test.js` _(by name)_

### `dev/requirements/heavy/extension-load.chrome.test.js`

- `manifest.json` → `extension/manifest.json` _(by name)_

### `dev/requirements/logic/kind.js`

- `logic/product-requirements.test.js` → `dev/requirements/logic/product-requirements.test.js` _(by name)_

### `dev/requirements/popup/cases/event-cards-appearance.5.6.1.case.js`

- `reference-time.js` → `dev/requirements/shared/reference-time.js` _(by name)_

### `dev/requirements/popup/cases/event-cards-appearance.5.6.2.case.js`

- `reference-time.js` → `dev/requirements/shared/reference-time.js` _(by name)_

### `dev/requirements/popup/cases/event-cards-appearance.5.6.3.case.js`

- `reference-time.js` → `dev/requirements/shared/reference-time.js` _(by name)_

### `dev/requirements/popup/cases/event-cards-appearance.5.6.4.case.js`

- `reference-time.js` → `dev/requirements/shared/reference-time.js` _(by name)_

### `dev/requirements/popup/cases/event-cards-appearance.5.6.5.case.js`

- `reference-time.js` → `dev/requirements/shared/reference-time.js` _(by name)_

### `dev/requirements/popup/cases/event-cards-appearance.5.6.6.case.js`

- `reference-time.js` → `dev/requirements/shared/reference-time.js` _(by name)_

### `dev/requirements/popup/cases/event-cards-appearance.5.6.7.case.js`

- `reference-time.js` → `dev/requirements/shared/reference-time.js` _(by name)_

### `dev/requirements/popup/cases/event-cards-appearance.5.6.8.case.js`

- `reference-time.js` → `dev/requirements/shared/reference-time.js` _(by name)_

### `dev/requirements/popup/cases/event-cards-appearance.5.6.9.case.js`

- `reference-time.js` → `dev/requirements/shared/reference-time.js` _(by name)_

### `dev/requirements/popup/kind.js`

- `shared/render/visual-snapshots.test.js` → `dev/requirements/shared/render/visual-snapshots.test.js` _(by name)_

### `dev/requirements/requirements-coverage.test.js`

- `render-snapshot.js` → `dev/requirements/shared/render/render-snapshot.js` _(by name)_

### `dev/requirements/shared/build-requirements-gallery.js`

- `requirements-gallery.test.js` → `dev/requirements/shared/requirements-gallery.test.js` _(by name)_
- `meetup.js` → `extension/event-extractors/custom/meetup.js` _(by name)_
- `live.test.js` → `dev/requirements/extractor/live.test.js` _(by name)_

### `dev/requirements/shared/cases.js`

- `kinds.js` → `dev/requirements/shared/kinds.js` _(by name)_

### `dev/requirements/shared/gen-states-flowchart.js`

- `dev/requirements/shared/popup-states-flowchart.png` → `dev/requirements/shared/popup-states-flowchart.png`
- `events-popup/popup.js` → `extension/events-popup/popup.js` _(by name)_

### `dev/requirements/shared/reference-time.js`

- `extension/events-popup/events-view.js` → `extension/events-popup/events-view.js`

### `dev/requirements/shared/render/actions.js`

- `testing.md` → `dev/procedures/this_project/testing.md` _(by name)_
- `popup.css` → `extension/events-popup/popup.css` _(by name)_
- `popup.js` → `extension/events-popup/popup.js` _(by name)_

### `dev/requirements/shared/render/fake-chrome.js`

- `extension/icon/toolbar-icon.js` → `extension/icon/toolbar-icon.js`
- `fallback-lists.json` → `extension/fallback-lists.json` _(by name)_

### `dev/requirements/shared/render/icon-renderer.js`

- `extension/icon/toolbar-icon.js` → `extension/icon/toolbar-icon.js`
- `fake-chrome.js` → `dev/requirements/shared/render/fake-chrome.js` _(by name)_
- `fallback-lists.json` → `extension/fallback-lists.json` _(by name)_

### `dev/requirements/shared/render/popup-renderer.js`

- `events-popup/popup.js` → `extension/events-popup/popup.js` _(by name)_
- `events-popup/popup.html` → `extension/events-popup/popup.html` _(by name)_
- `events-popup/popup.css` → `extension/events-popup/popup.css` _(by name)_
- `popup.css` → `extension/events-popup/popup.css` _(by name)_
- `events-view.js` → `extension/events-popup/events-view.js` _(by name)_
- `popup.js` → `extension/events-popup/popup.js` _(by name)_
- `config.js` → `extension/config.js` _(by name)_
- `popup.html` → `extension/events-popup/popup.html` _(by name)_

### `dev/requirements/shared/render/refresh-snapshots.js`

- `render-snapshot.js` → `dev/requirements/shared/render/render-snapshot.js` _(by name)_
- `events-popup/popup.css` → `extension/events-popup/popup.css` _(by name)_

### `dev/requirements/shared/render/render-snapshot.js`

- `popup-renderer.js` → `dev/requirements/shared/render/popup-renderer.js` _(by name)_
- `icon-renderer.js` → `dev/requirements/shared/render/icon-renderer.js` _(by name)_

### `dev/requirements/shared/render/visual-snapshots.test.js`

- `render-snapshot.js` → `dev/requirements/shared/render/render-snapshot.js` _(by name)_
- `events-popup/popup.css` → `extension/events-popup/popup.css` _(by name)_
- `dev/procedures/this_project/testing.md` → `dev/procedures/this_project/testing.md`
- `dev/requirements/behavior/events-view-actions.test.js` → `dev/requirements/behavior/events-view-actions.test.js`

### `dev/requirements/shared/ui-requirements.js`

- `build-requirements-gallery.js` → `dev/requirements/shared/build-requirements-gallery.js` _(by name)_

### `extension-test/event-extractors/extraction.test.js`

- `dev/requirements/extractor/live.test.js` → `dev/requirements/extractor/live.test.js`
- `meetup.js` → `extension/event-extractors/custom/meetup.js` _(by name)_

### `extension-test/events-popup/build-calendar-url.test.js`

- `events-popup/build-calendar-url.js` → `extension/events-popup/build-calendar-url.js` _(by name)_
- `build-calendar-url.js` → `extension/events-popup/build-calendar-url.js` _(by name)_

### `extension-test/events-popup/derive-wait-selector.test.js`

- `extension/events-popup/derive-wait-selector.js` → `extension/events-popup/derive-wait-selector.js`
- `popup.js` → `extension/events-popup/popup.js` _(by name)_

### `extension-test/events-popup/events-view.test.js`

- `events-popup/events-view.js` → `extension/events-popup/events-view.js` _(by name)_
- `events-view.js` → `extension/events-popup/events-view.js` _(by name)_

### `extension-test/events-popup/popup.test.js`

- `popup.js` → `extension/events-popup/popup.js` _(by name)_
- `fallback-policy.js` → `extension/fallback-policy.js` _(by name)_
- `config.js` → `extension/config.js` _(by name)_
- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_

### `extension-test/events-popup/source-request-view.test.js`

- `events-popup/source-request-view.js` → `extension/events-popup/source-request-view.js` _(by name)_
- `source-request-view.js` → `extension/events-popup/source-request-view.js` _(by name)_
- `dev/procedures/test/uber/shared_constants/repo-slug.json` → `dev/procedures/test/uber/shared_constants/repo-slug.json`

### `extension-test/fallback-policy.test.js`

- `fallback-policy.js` → `extension/fallback-policy.js` _(by name)_
- `popup.js` → `extension/events-popup/popup.js` _(by name)_

### `extension-test/harness.js`

- `helpers/dates.js` → `extension/event-extractors/helpers/dates.js` _(by name)_
- `event-extractors/load-order.generated.json` → `extension/event-extractors/load-order.generated.json` _(by name)_
- `popup.js` → `extension/events-popup/popup.js` _(by name)_

### `extension-test/icon/toolbar-icon.test.js`

- `extension-load.chrome.test.js` → `dev/requirements/heavy/extension-load.chrome.test.js` _(by name)_

### `extension-test/integration/extension-loads.test.js`

- `icon/toolbar-icon.js` → `extension/icon/toolbar-icon.js` _(by name)_
- `load-order.generated.json` → `extension/event-extractors/load-order.generated.json` _(by name)_

### `extension-test/integration/load-order.test.js`

- `registry.js` → `extension/event-extractors/registry.js` _(by name)_

### `extension-test/integration/registry-idempotent.test.js`

- `registry.js` → `extension/event-extractors/registry.js` _(by name)_

### `extension-test/integration/supported-domains.test.js`

- `config.js` → `extension/config.js` _(by name)_
- `fallback-lists.json` → `extension/fallback-lists.json` _(by name)_
- `extension-test/integration/extension-loads.test.js` → `extension-test/integration/extension-loads.test.js`
- `event-extractors/registry.js` → `extension/event-extractors/registry.js` _(by name)_
- `registry.js` → `extension/event-extractors/registry.js` _(by name)_

### `extension/event-extractors/assemble-events.js`

- `event-extractors/load-order.generated.json` → `extension/event-extractors/load-order.generated.json` _(by name)_
- `dev/procedures/this_project/highLevelDesign.md` → `dev/procedures/this_project/highLevelDesign.md`
- `events-popup/popup.js` → `extension/events-popup/popup.js` _(by name)_

### `extension/event-extractors/custom/tabitisrael.js`

- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_

### `extension/event-extractors/extract-unsupported.js`

- `events-popup/popup.js` → `extension/events-popup/popup.js` _(by name)_
- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_

### `extension/event-extractors/helpers/dates.js`

- `extension-test/harness.js` → `extension-test/harness.js`

### `extension/event-extractors/helpers/timezone-names.js`

- `helpers/timezones.js` → `extension/event-extractors/helpers/timezones.js` _(by name)_

### `extension/event-extractors/helpers/timezones.js`

- `helpers/timezone-names.js` → `extension/event-extractors/helpers/timezone-names.js` _(by name)_

### `extension/event-extractors/registry.js`

- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_

### `extension/events-popup/build-calendar-url.js`

- `events-view.js` → `extension/events-popup/events-view.js` _(by name)_
- `workflow.md` → `dev/procedures/this_project/workflow.md` _(by name)_
- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_

### `extension/events-popup/derive-wait-selector.js`

- `events-popup/source-request-view.js` → `extension/events-popup/source-request-view.js` _(by name)_
- `popup.js` → `extension/events-popup/popup.js` _(by name)_

### `extension/events-popup/events-view.js`

- `popup.js` → `extension/events-popup/popup.js` _(by name)_
- `popup.css` → `extension/events-popup/popup.css` _(by name)_
- `build-calendar-url.js` → `extension/events-popup/build-calendar-url.js` _(by name)_

### `extension/events-popup/popup.css`

- `popup.js` → `extension/events-popup/popup.js` _(by name)_
- `popup-renderer.js` → `dev/requirements/shared/render/popup-renderer.js` _(by name)_

### `extension/events-popup/popup.html`

- `popup.js` → `extension/events-popup/popup.js` _(by name)_
- `popup.css` → `extension/events-popup/popup.css` _(by name)_

### `extension/events-popup/popup.js`

- `events-view.js` → `extension/events-popup/events-view.js` _(by name)_
- `source-request-view.js` → `extension/events-popup/source-request-view.js` _(by name)_
- `gen-load-order.js` → `dev/build/gen-load-order.js` _(by name)_
- `dev/requirements/shared/render/actions.js` → `dev/requirements/shared/render/actions.js`
- `assemble-events.js` → `extension/event-extractors/assemble-events.js` _(by name)_
- `dev/requirements/shared/popup-states-flowchart.png` → `dev/requirements/shared/popup-states-flowchart.png`

### `extension/events-popup/source-request-view.js`

- `popup.js` → `extension/events-popup/popup.js` _(by name)_
- `derive-wait-selector.js` → `extension/events-popup/derive-wait-selector.js` _(by name)_

### `extension/fallback-policy.js`

- `config.js` → `extension/config.js` _(by name)_

### `extension/icon/toolbar-icon.js`

- `technicalGotchas.md` → `dev/procedures/this_project/technicalGotchas.md` _(by name)_

## Ambiguous references (basename matches >1 file)

- `dev/build/release/releasing.md` names `README.md` → could be: `README.md`, `dev/analysis/file-cross-references/README.md`, `dev/build/release/store_artifacts/README.md`, `dev/create-extractor/README.md`, `dev/requirements/README.md`, `dev/requirements/extractor/data/user-submitted/README.md`
- `dev/procedures/test/docs-reachable.test.js` names `README.md` → could be: `README.md`, `dev/analysis/file-cross-references/README.md`, `dev/build/release/store_artifacts/README.md`, `dev/create-extractor/README.md`, `dev/requirements/README.md`, `dev/requirements/extractor/data/user-submitted/README.md`
- `dev/procedures/this_project/testing.md` names `kind.js` → could be: `dev/requirements/behavior/kind.js`, `dev/requirements/extractor/kind.js`, `dev/requirements/icon/kind.js`, `dev/requirements/logic/kind.js`, `dev/requirements/popup/kind.js`
- `dev/requirements/README.md` names `kind.js` → could be: `dev/requirements/behavior/kind.js`, `dev/requirements/extractor/kind.js`, `dev/requirements/icon/kind.js`, `dev/requirements/logic/kind.js`, `dev/requirements/popup/kind.js`
- `dev/requirements/requirements-coverage.test.js` names `kind.js` → could be: `dev/requirements/behavior/kind.js`, `dev/requirements/extractor/kind.js`, `dev/requirements/icon/kind.js`, `dev/requirements/logic/kind.js`, `dev/requirements/popup/kind.js`
- `dev/requirements/shared/kinds.js` names `kind.js` → could be: `dev/requirements/behavior/kind.js`, `dev/requirements/extractor/kind.js`, `dev/requirements/icon/kind.js`, `dev/requirements/logic/kind.js`, `dev/requirements/popup/kind.js`
- `dev/requirements/shared/kinds.js` names `README.md` → could be: `README.md`, `dev/analysis/file-cross-references/README.md`, `dev/build/release/store_artifacts/README.md`, `dev/create-extractor/README.md`, `dev/requirements/README.md`, `dev/requirements/extractor/data/user-submitted/README.md`
