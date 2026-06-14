# Releasing / publishing to the Chrome Web Store

## The package

`npm run build` produces `dist/google-calendar-event-creator.zip` — exactly the
files the extension ships (manifest, scripts, `pipeline/`, `icons/`), and
nothing else (no tests, cached HTML, dev tooling, or docs). The file list lives
in **`tools/shipping-files.js`** as the single source of truth, and
`test/unit/shipping-files.test.js` asserts it stays in sync with what the
manifest and popup actually load — so the zip can't silently drop a runtime
file or smuggle in dead weight. This same zip is what testers load unpacked
(see [Install](../README.md#install-developer-mode)) and what you upload to the Web Store.

## Versioning

The version users see is `manifest.json`'s `version` (the store reads only
that; `package.json` is kept in sync). **It is bumped deliberately, not
automatically per commit** — it's set when you cut a release (the Release
workflow writes it for you; see below). The store rejects an upload whose
version isn't strictly higher than the live one, so each release must increment
it.

## Creating a release package

The **Create Release Package** workflow (`.github/workflows/release.yml`) sets
the version, runs the tests, builds the zip, and publishes a GitHub Release with
it attached. It does **not** touch the store — pushing to the Chrome Web Store
is a separate, manual step (see below).

- **Run workflow** (Actions tab → Create Release Package → "Run workflow") is
  the normal path. Optionally type the version; **leave it blank to bump the
  current minor version** (`1.0.0` → `1.1.0`). The workflow writes that version
  into `manifest.json` / `package.json`, commits it, tags `vX.Y.Z`, and
  releases.

  > GitHub can't pre-fill the input with a *computed* value — `workflow_dispatch`
  > defaults are static text — so "blank = next minor" is the convenience
  > instead. The version it settled on is printed in the run summary.

- **Push a tag `vX.Y.Z` by hand** if you'd rather bump `manifest.json` yourself.
  The workflow then **verifies the tag matches the manifest version** (a
  mismatch fails the build) before releasing.

Either way the zip is attached under a stable name, so the newest build is
always at a fixed URL:
`…/releases/latest/download/google-calendar-event-creator.zip`.

## Publishing to the store

The **Publish to Chrome Web Store** workflow
(`.github/workflows/publish-chrome-store.yml`) takes the zip from a GitHub
Release and uploads it to the store (publishing to users by default), via the
[Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api)
(`chrome-webstore-upload-cli`). It's **manual** — run it from the Actions tab
once a release package exists and you're ready to ship: leave the tag blank to
publish the **latest** release, or name a tag; uncheck **auto_publish** to
upload as a draft and publish manually from the dashboard.

It needs four repository secrets (Settings → Secrets and variables → Actions);
the workflow fails fast with a clear message if any are missing:

| Secret | Where it comes from |
| --- | --- |
| `CHROME_EXTENSION_ID` | the item ID in the dashboard URL for the extension |
| `CHROME_CLIENT_ID` | an OAuth client created against the Chrome Web Store API |
| `CHROME_CLIENT_SECRET` | …same OAuth client |
| `CHROME_REFRESH_TOKEN` | generated once for that client |

To mint the OAuth credentials, follow
[`chrome-webstore-upload`'s setup guide](https://github.com/fregante/chrome-webstore-upload/blob/main/How%20to%20generate%20Google%20API%20keys.md)
(enable the Chrome Web Store API in a Google Cloud project, create an OAuth
client, and exchange it for a refresh token), then add the four values as
secrets.

## First publish to the Chrome Web Store

1. Register a developer account at the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   (one-time \$5 fee).
2. **Add new item** and upload the release zip.
3. Complete the store listing: the store icon (`store-assets/icon-128.png`),
   description, category, a screenshot (≥ 1280×800 or 640×400), and the privacy
   tab — justify each requested permission (`activeTab`, `scripting`, `tabs`;
   see [Permissions](../README.md#permissions)) and declare data usage (this extension sends
   nothing anywhere).
4. Submit for review. Approval typically takes a few hours to a few days.

## Minor update

1. Make the change (open an issue first per the project workflow) and merge it.
2. Run the **Create Release Package** workflow (blank version = next minor) to
   bump the version and cut the GitHub Release.
3. Run the **Publish to Chrome Web Store** workflow to ship it.

Once the store approves it, Chrome auto-pushes the update to existing users
within a few hours — no reinstall. (For the very first listing, do the one-time
[First publish](#first-publish-to-the-chrome-web-store) steps in the dashboard
first.)
