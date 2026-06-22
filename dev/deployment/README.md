# Deployment assets

Chrome Web Store **listing** assets — used when publishing, **not** shipped in
the extension zip (`.github/workflows/shipping-files.js` excludes `dev/deployment/`).
For the end-to-end publish steps see [`../procedures/releasing.md`](../procedures/releasing.md).

| File | What it is | Where it goes |
|------|------------|---------------|
| `chromeStoreIcon.png` | 128×128 store **listing** icon (the face of the item on the Web Store; 96×96 art in a 16px transparent safe zone). | Uploaded by hand in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole) — not in the zip. |
| `chrome-store-screenshot-1280x800.png` | Listing screenshot (≥ 1280×800). | Uploaded by hand in the Dashboard. |
| `gen_store_icon.py` | Generator (stdlib only) for the polished calendar art. | See below. |

## Where each icon comes from

The polished calendar art is defined **once** in `gen_store_icon.py`, which writes
it straight to every consumer (no hand-copying, so the copies can't drift):

- `dev/deployment/chromeStoreIcon.png` — the store listing icon (above).
- `extension/icons/icon128.png` — the manifest 128px icon Chrome shows in the
  install dialog.
- `extension/icons/chromeExtensionManagementIcon.png` — the 48px icon the
  `chrome://extensions` management page shows.

`icon128.png` and `chromeStoreIcon.png` are the same art at the same size but must
exist as separate files: the first ships inside the package (Chrome can't reference
`dev/deployment/`), the second is uploaded to the Dashboard.

The **small toolbar glyphs** (`extension/icons/icon{16,32}*.png`, including the
green `-supported` / gray `-denied` state variants the service worker swaps at
runtime) are a different, flatter design and come from
[`../tools/gen_icons.py`](../tools/gen_icons.py) instead.

Regenerate:

```sh
python3 dev/deployment/gen_store_icon.py   # 48 + 128 polished art (+ store icon)
python3 dev/tools/gen_icons.py             # 16 + 32 toolbar glyphs (+ state variants)
```
