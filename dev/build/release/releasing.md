# Releasing / publishing to the Chrome Web Store

This repo is the **reference implementation** of the shared Chrome-extension
release standard — the canon guide
(`.claudinite/technologies/chrome-extension-release.md`, "the canon release
guide" below) owns the cross-repo contract, the canonical workflow files, and
the manual store procedures; this file holds this repo's concrete names, paths,
and listing facts.

## The package

`npm run build` produces `dist/google-calendar-event-creator.zip` — exactly the
files the extension ships (manifest, `extension/event-extractors/`, `extension/events-popup/`, `extension/icon/`, and the shared root modules), and
nothing else (no tests, cached HTML, dev tooling, or docs). The file list lives
in **`dev/build/release/shipping-files.js`** as the single source of truth, and
`dev/build/release/shipping-files.test.js` asserts it stays in sync with what the
manifest and popup actually load — so the zip can't silently drop a runtime
file or smuggle in dead weight. This same zip is what testers load unpacked
(see [Install](../../../README.md#install)) and what you upload to the Web Store.

## Versioning

The version users see is `extension/manifest.json`'s `version` (the store reads only
that; `package.json` is kept in sync). **Minor and major bumps are deliberate,
by a human** — ask Claude to **"bump version"** (it edits both files on a branch
and lands on `main` through a normal PR; default is the next minor — see
[`dev/procedures/this_project/workflow.md`](../../procedures/this_project/workflow.md)). **Patch bumps are also made
automatically** by the [daily auto-release](#daily-auto-release) when it has
deployable changes to ship (the store rejects an upload whose version isn't
strictly higher than the live one, so each release must increment it first).
The Create-Package release workflow itself never changes the version.

## Creating a release package

The **Release: Create Package** workflow (`.github/workflows/release.yml`) runs
the tests, builds the zip, and publishes a GitHub Release with it attached, at
**whatever version is currently committed in `extension/manifest.json`**. It does **not**
change the version — bump it first (see above).

It runs **automatically when a version bump merges to `main`** (a push to `main`
that touches `extension/manifest.json`), so cutting a release is just merging the bump PR.
If that version already matches the latest published release (or a `vX.Y.Z` tag
already exists), the run is a **clean no-op** — so `extension/manifest.json` edits that
aren't version bumps don't cut a release. You can also run it manually from the
Actions tab → Release: Create Package → "Run workflow".

On a real bump it tags `vX.Y.Z` at the released commit and attaches the zip under
a stable name, so the newest build is always at a fixed URL:
`…/releases/latest/download/google-calendar-event-creator.zip`. It does **not**
touch the store — pushing to the Chrome Web Store is the one remaining manual
step (see below).

## Publishing to the store

The **Release: Publish to Chrome Web Store** workflow
(`.github/workflows/publish-chrome-store.yml`) takes the zip from a GitHub
Release and uploads it to the store (publishing to users by default), via the
[Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api)
(`chrome-webstore-upload-cli`). Run it **manually** from the Actions tab once a
release package exists and you're ready to ship: leave the tag blank to publish
the **latest** release, or name a tag; uncheck **auto_publish** to upload as a
draft and publish manually from the dashboard. The
[daily auto-release](#daily-auto-release) also calls it automatically with the
tag it just cut.

It needs four repository secrets (Settings → Secrets and variables → Actions);
the workflow fails fast with a clear message if any are missing:

| Secret | Where it comes from |
| --- | --- |
| `CHROME_EXTENSION_ID` | the item ID in the dashboard URL for the extension |
| `CHROME_CLIENT_ID` | an OAuth client created against the Chrome Web Store API |
| `CHROME_CLIENT_SECRET` | …same OAuth client |
| `CHROME_REFRESH_TOKEN` | generated once for that client |

Minting them is the standard cross-repo procedure — follow "Minting the API
credentials" in the canon release guide (which owns every step and its
gotchas; don't restate them here, they drift). These four names are the same
in every extension repo.

## Daily auto-release

The **Release: Daily Auto-Release** workflow
(`.github/workflows/daily-release.yml`) runs on a daily schedule (and by manual
dispatch) and ships to the store **only when a deployable file changed** since
the last release — the whole design (the shipping-set change filter, the
tag-not-24h baseline, the automated patch bump, and how it reuses the two
workflows above) is documented in the canon reusable workflow the stub calls. In short: no shipped-file change → clean no-op; otherwise it bumps a
patch version on `main` (`dev/build/release/bump-patch-version.js`), cuts the GitHub
Release, and publishes it to users. Docs/tests/dev-tooling-only days never
release: "deployable" is membership in `dev/build/release/shipping-files.js`'s shipping
set (filtered by `dev/build/release/filter-shipped-paths.js`), the same source of truth
the zip is built from. Failures land on the `workflow-failure` tracking issue
per the unattended-workflow rule in
[`dev/procedures/this_project/github.md`](../../procedures/this_project/github.md).

## First publish to the Chrome Web Store

The dashboard walkthrough (developer account, first item upload, listing,
privacy tab, review) is the standard procedure — "First publication" in the
canon release guide. Every dashboard answer for this repo — listing fields,
per-permission justifications, data-usage declarations, the privacy-policy URL
— is pre-written in the submission kit,
[`store_artifacts/STORE-LISTING.md`](store_artifacts/STORE-LISTING.md) (asset
map and icon generator: [`store_artifacts/README.md`](store_artifacts/README.md)).
The kit is also the resubmission source: a PR that changes the manifest's
permissions updates its justification table in the same PR and opens an issue
for the manual dashboard step (canon release guide, "When a change touches the
extension's permissions").

## Minor update

1. Make the change (open an issue first per the project workflow) and merge it.
2. Bump the version (ask Claude to "bump version" = next minor) and merge that
   PR — merging it to `main` cuts the GitHub Release automatically.
3. Run the **Release: Publish to Chrome Web Store** workflow to ship it.

Once the store approves it, Chrome auto-pushes the update to existing users
within a few hours — no reinstall. (For the very first listing, do the one-time
[First publish](#first-publish-to-the-chrome-web-store) steps in the dashboard
first.)
