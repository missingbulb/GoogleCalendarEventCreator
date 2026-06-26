# `user-submitted/` — hand-supplied fixture pages

Recorded fixture pages (`<name>.html` + `<name>.url`) that a **user or developer
supplied by hand**, rather than the auto-extractor pipeline fetching them via
ScraperAPI. The intended use is the case the pipeline can't cover itself: when the
CI datacenter is bot-blocked from a target site, a person pastes the page's HTML in
so the site can still get a reviewed integration case.

This folder is empty today — it exists to mark the convention for that future flow.

## Why a separate folder from `server-fetched/`

The split is by **provenance**, and it's structural on purpose. GitHub secret
scanning / push protection can only be scoped by **path** (`secret_scanning.yml`
has a single `paths-ignore` knob — no per-secret or per-source option), so the
trust boundary has to *be* the folder:

- [`../server-fetched/`](../server-fetched/) — pipeline-recorded third-party pages.
  Their only embedded tokens are the **site's own** (e.g. a Mapbox key in the
  markup), never ours or a user's, so `.github/secret_scanning.yml` excludes that
  folder from push protection (a block there only wedges the pipeline — see #286).
- **this folder** — hand-supplied HTML, which could carry a **real** secret, so it
  is **not** excluded: push protection stays on and will block an accidental one at
  push time.

The test suite resolves a case's page from **either** folder
(`dev/requirements/extractor/data-files.js`), so dropping a `<name>.{html,url}` pair
here (plus its `expected/<name>.json`) wires it into `live.test.js` with no other
change.
