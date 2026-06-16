# Adding a site extractor

Extraction merges three layers (site-specific → schema.org JSON-LD → generic
heuristics), first non-empty value per field winning — see
`pipeline/assemble-events.js`. So a new source only needs to supply the fields
the generic/JSON-LD layers get wrong or miss. The flow:

1. Add `pipeline/sources/<site>.js` that pushes onto `GCal.sources` with
   `name`, an inline `matches(hostname)`, and an `extract()` returning a partial
   event object. The `matches` function is the single thing that makes a page
   count as supported — it both gates the source and drives the green
   ("supported") vs. red toolbar icon. Follow `pipeline/sources/meetup.js` as
   the template, including the header comment describing the HTML it expects.
   Use the shared helpers on `GCal` (see `pipeline/helpers/`); return only the
   fields this site needs.
2. Run `npm run index` to regenerate the two load lists from the sources on
   disk: `pipeline/load-order.generated.json` (the single source of truth the
   popup injects and the tests read) and `pipeline/worker-imports.generated.js`
   (the registry + sources the toolbar service worker importScripts at startup,
   since an MV3 worker can't read the JSON synchronously). The generator pins
   `registry.js`/`helpers/` first and `assemble-events.js` last and sorts the
   rest, so you never hand-edit either list — and adding a source touches no file
   in `ui/`; a CI test fails if either is stale.
3. Add an integration case for a real page on the site (see `docs/testing.md`).
