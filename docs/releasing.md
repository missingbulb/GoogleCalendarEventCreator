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
that; `package.json` is kept in sync). **It is bumped deliberately, by a human,
not automatically** — and bumping is a separate step from releasing. Ask Claude
to **"bump version"** (it edits both files on a branch and lands on `main`
through a normal PR; default is the next minor — see
[`docs/claude/workflow.md`](claude/workflow.md)). The release workflow never
changes the version itself. The store rejects an upload whose version isn't
strictly higher than the live one, so each release must increment it first.

## Creating a release package

The **Create Release Package** workflow (`.github/workflows/release.yml`) runs
the tests, builds the zip, and publishes a GitHub Release with it attached, at
**whatever version is currently committed in `manifest.json`**. It takes **no
inputs** and does **not** change the version — bump it first (see above). It
does **not** touch the store — pushing to the Chrome Web Store is a separate,
manual step (see below).

Run it from the Actions tab → Create Release Package → "Run workflow". It
**refuses to run** if `manifest.json`'s version already matches the latest
published release (or a matching `vX.Y.Z` tag already exists) — that means
nobody bumped the version. On success it tags `vX.Y.Z` at the released commit
and attaches the zip under a stable name, so the newest build is always at a
fixed URL:
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
2. Bump the version (ask Claude to "bump version" = next minor) and merge that PR.
3. Run the **Create Release Package** workflow to cut the GitHub Release.
4. Run the **Publish to Chrome Web Store** workflow to ship it.

Once the store approves it, Chrome auto-pushes the update to existing users
within a few hours — no reinstall. (For the very first listing, do the one-time
[First publish](#first-publish-to-the-chrome-web-store) steps in the dashboard
first.)
