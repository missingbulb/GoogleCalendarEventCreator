# Release assets

Chrome Web Store **listing** assets and the icon generator — used when
publishing. The screenshot here is **not** shipped in the extension zip
(`dev/build/release/shipping-files.js` ships only `extension/`, so `dev/build/` is
excluded); the icons are generated into `extension/icon/images/` (which does
ship). For the end-to-end publish steps see the chrome-extension-release standard in Claudinite.

| File | What it is | Where it goes |
|------|------------|---------------|
| `chrome-store-screenshot-1280x800.png` | Listing screenshot (≥ 1280×800). | Uploaded by hand in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). |
| `generate_icons.py` | Generator (stdlib only) for **every** icon — both looks. | See below. |
| `PRIVACY.md` | The privacy policy (single source of truth; also linked from the root README). | Published to GitHub Pages at `https://missingbulb.github.io/GoogleCalendarEventCreator/privacy/` by the **Release: Publish to Chrome Web Store** workflow; that URL is the listing's Privacy Policy URL. Lives here (not the repo root) so its path isn't an external contract — the public URL is pinned by a Jekyll `permalink`, not the file location. |

The Web Store **listing icon** is not a separate file: upload
`extension/icon/images/chromeStoreIcon.png` (below) by hand in the Dashboard.

## Where each icon comes from

One generator, `generate_icons.py`, produces all the icons in two deliberately
different looks, writing each straight into `extension/icon/images/`:

**Polished calendar art** (anti-aliased, with a 16px safe zone so it doubles as
the store listing icon):

- `extension/icon/images/chromeStoreIcon.png` — the manifest 128px icon Chrome shows
  in the install dialog, and the file uploaded by hand as the store listing icon.
- `extension/icon/images/chromeExtensionManagementIcon.png` — the 48px icon the
  `chrome://extensions` management page shows.

**Small toolbar glyphs** (flatter, filling the frame for legibility):

- `extension/icon/images/icon{16,32}.png` plus the green `-supported` / gray `-denied`
  state variants the service worker swaps at runtime — the two toolbar-action
  sizes.

Regenerate (deterministic — an unchanged run produces no diff):

```sh
python3 dev/build/release/store_artifacts/generate_icons.py
```
