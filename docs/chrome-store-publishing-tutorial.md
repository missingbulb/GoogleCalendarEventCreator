# Chrome Web Store publishing — from scratch

A terse, do-this-then-that guide to publishing this extension on the Chrome Web
Store and wiring up one-click CI releases. Every step is a snippet to run or a
`A → B → C` UI path. Written from a real first publish; the OAuth section is
where all the pain was.

Prerequisites: a Google account, and a release zip (built by the **Create
Release Package** workflow — see [releasing.md](releasing.md)).

## 1. Register + create the listing (one-time, manual)

1. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → pay the
   one-time **$5** fee.
2. **Add new item** → upload the release zip.
3. Fill the listing: description, category, ≥1 screenshot (≥ 1280×800 or
   640×400), store icon, and the **Privacy** tab (justify `activeTab`,
   `scripting`, `tabs`; declare "no data collected").
4. **Submit for review** (hours to days).
5. Copy the item ID from the dashboard URL — that's **`CHROME_EXTENSION_ID`**.

## 2. Create an OAuth client (Google Cloud Console)

1. [Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → Library** → search **"Chrome Web Store API"** → **Enable**.
3. **APIs & Services → OAuth consent screen** → configure (User type **External**)
   → **Publish app** (move status from *Testing* to *In production*).
   > Skipping the publish step means refresh tokens expire after 7 days.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   Application type **Desktop app** → Create.
5. Copy the **Client ID** (`CHROME_CLIENT_ID`) and **Client secret**
   (`CHROME_CLIENT_SECRET`).

## 3. Mint the refresh token

Export what you have:

```bash
export CHROME_CLIENT_ID="your-client-id"
export CHROME_CLIENT_SECRET="your-client-secret"
```

Print the authorization URL, open it in an **incognito window** signed into only
your developer account, and approve:

```bash
echo "https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&access_type=offline&prompt=consent&redirect_uri=http://localhost&client_id=${CHROME_CLIENT_ID}"
```

The browser redirects to `http://localhost/?code=...` — **the page won't load,
that's expected**. Copy the `code=` value out of the address bar:

```bash
export CHROME_AUTH_CODE="paste-the-code-from-the-url"
```

Exchange it for the refresh token (the code is single-use — re-run the URL above
if you get `invalid_grant`):

```bash
curl -s "https://accounts.google.com/o/oauth2/token" \
  -d "client_id=${CHROME_CLIENT_ID}" \
  -d "client_secret=${CHROME_CLIENT_SECRET}" \
  -d "code=${CHROME_AUTH_CODE}" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost" | jq -r .refresh_token
```

The printed string is **`CHROME_REFRESH_TOKEN`**.

### OAuth troubleshooting

| Symptom | Fix |
| --- | --- |
| `access_denied` / "app is being tested" | Add yourself as a test user, or **publish** the consent screen (step 2.3). |
| `invalid_request` / "OOB flow blocked" | Use `redirect_uri=http://localhost` (a Desktop app client), not `urn:ietf:wg:oauth:2.0:oob`. |
| `500` on the consent page | Retry in incognito signed into a single account; add `&login_hint=you@example.com`. |
| `invalid_grant` at exchange | The code is stale/used — re-open the auth URL for a fresh one. |

## 4. Add the repo secrets

**GitHub repo → Settings → Secrets and variables → Actions → New repository
secret**, add all four:

- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

## 5. Publish

1. Bump the version (ask Claude to "bump version") and merge — merging to `main`
   cuts the GitHub Release automatically.
2. **GitHub → Actions → Publish to Chrome Web Store → Run workflow** (blank tag =
   latest release; uncheck `auto_publish` to upload as a draft instead).
3. **Dashboard → your item → Status** shows "Under review" → "Published". Once
   live, Chrome auto-pushes the update to existing users within a few hours.

## Re-minting later

Refresh tokens can be revoked (password change, deleted client). If publishing
fails with `invalid_grant`, redo [step 3](#3-mint-the-refresh-token) and update
the `CHROME_REFRESH_TOKEN` secret — the client ID/secret stay the same.
