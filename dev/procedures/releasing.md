# Releasing / publishing to the Chrome Web Store

## The package

`npm run build` produces `dist/google-calendar-event-creator.zip` — exactly the
files the extension ships (manifest, `extension/event-extractors/`, `extension/events-popup/`, `extension/icon/`, and the shared root modules), and
nothing else (no tests, cached HTML, dev tooling, or docs). The file list lives
in **`.github/workflows/shipping-files.js`** as the single source of truth, and
`.github/workflows/tests/shipping-files.test.js` asserts it stays in sync with what the
manifest and popup actually load — so the zip can't silently drop a runtime
file or smuggle in dead weight. This same zip is what testers load unpacked
(see [Install](../README.md#install-developer-mode)) and what you upload to the Web Store.

## Versioning

The version users see is `extension/manifest.json`'s `version` (the store reads only
that; `package.json` is kept in sync). **It is bumped deliberately, by a human,
not automatically** — and bumping is a separate step from releasing. Ask Claude
to **"bump version"** (it edits both files on a branch and lands on `main`
through a normal PR; default is the next minor — see
[`dev/procedures/claude/workflow.md`](claude/workflow.md)). The release workflow never
changes the version itself. The store rejects an upload whose version isn't
strictly higher than the live one, so each release must increment it first.

## Creating a release package

The **Create Release Package** workflow (`.github/workflows/release.yml`) runs
the tests, builds the zip, and publishes a GitHub Release with it attached, at
**whatever version is currently committed in `extension/manifest.json`**. It does **not**
change the version — bump it first (see above).

It runs **automatically when a version bump merges to `main`** (a push to `main`
that touches `extension/manifest.json`), so cutting a release is just merging the bump PR.
If that version already matches the latest published release (or a `vX.Y.Z` tag
already exists), the run is a **clean no-op** — so `extension/manifest.json` edits that
aren't version bumps don't cut a release. You can also run it manually from the
Actions tab → Create Release Package → "Run workflow".

On a real bump it tags `vX.Y.Z` at the released commit and attaches the zip under
a stable name, so the newest build is always at a fixed URL:
`…/releases/latest/download/google-calendar-event-creator.zip`. It does **not**
touch the store — pushing to the Chrome Web Store is the one remaining manual
step (see below).

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

To mint the OAuth credentials, in a Google Cloud project: enable the **Chrome Web
Store API**, **publish** the OAuth consent screen (External is fine — see the
gotcha below about leaving it in "Testing"), and create a **Desktop app** OAuth
client. That gives you `CHROME_CLIENT_ID` and `CHROME_CLIENT_SECRET`. Then do the
OAuth exchange by hand (this is the flow used for the first publish):

```sh
export CHROME_CLIENT_ID="…"
export CHROME_CLIENT_SECRET="…"

# 1. Open this URL (incognito, signed into only the developer account), approve.
echo "https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&access_type=offline&prompt=consent&redirect_uri=http://localhost&client_id=${CHROME_CLIENT_ID}"

# 2. The browser redirects to http://localhost/?code=… and FAILS TO LOAD (expected).
#    Copy the code= value out of the address bar.
export CHROME_AUTH_CODE="…"

# 3. Exchange it for the refresh token (the code is single-use).
curl -s "https://accounts.google.com/o/oauth2/token" \
  -d "client_id=${CHROME_CLIENT_ID}" \
  -d "client_secret=${CHROME_CLIENT_SECRET}" \
  -d "code=${CHROME_AUTH_CODE}" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost" | jq -r .refresh_token
```

The printed string is `CHROME_REFRESH_TOKEN`. Add those three plus
`CHROME_EXTENSION_ID` (from the dashboard URL) as the four secrets.

Two gotchas that will bite you (learned the hard way during the first publish):

- **The out-of-band (`urn:ietf:wg:oauth:2.0:oob`) flow is blocked by Google.**
  That's why a Desktop client with the `http://localhost` redirect is required,
  and why step 2 reads the `code=` out of the failing redirect URL instead of a
  copy/paste screen.
- **Publish the OAuth consent screen** (don't leave it in "Testing"). A consent
  screen still in Testing only issues refresh tokens that **expire after 7 days**,
  which silently breaks the publish workflow a week later; a published consent
  screen issues a non-expiring token.

If minting fails, the symptoms map to fixes like this:

| Symptom | Fix |
| --- | --- |
| `access_denied` / "app is being tested" | Add yourself as a test user, or **publish** the consent screen. |
| `invalid_request` / "OOB flow blocked" | Use a Desktop client (`http://localhost` redirect), not `urn:ietf:wg:oauth:2.0:oob`. |
| `500` on the consent page | Retry in an incognito window signed into a single account. |
| `invalid_grant` at token exchange | The authorization code is stale/used — restart the flow for a fresh one. |

## First publish to the Chrome Web Store

1. Register a developer account at the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   (one-time \$5 fee).
2. **Add new item** and upload the release zip.
3. Complete the store listing: the store icon (`dev/deployment/icon-128.png`),
   description, category, a screenshot (≥ 1280×800 or 640×400), and the privacy
   tab — justify each requested permission (`activeTab`, `scripting`,
   `declarativeContent`; see [Permissions](../README.md#permissions)) and declare
   data usage (this extension sends nothing anywhere).
4. Submit for review. Approval typically takes a few hours to a few days.

## Minor update

1. Make the change (open an issue first per the project workflow) and merge it.
2. Bump the version (ask Claude to "bump version" = next minor) and merge that
   PR — merging it to `main` cuts the GitHub Release automatically.
3. Run the **Publish to Chrome Web Store** workflow to ship it.

Once the store approves it, Chrome auto-pushes the update to existing users
within a few hours — no reinstall. (For the very first listing, do the one-time
[First publish](#first-publish-to-the-chrome-web-store) steps in the dashboard
first.)
