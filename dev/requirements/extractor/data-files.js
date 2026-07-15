"use strict";
// Resolve a recorded fixture file (<name>.html / <name>.url) to its on-disk path.
//
// Fixtures are split into two sibling folders under data/ by PROVENANCE, because
// GitHub secret scanning / push protection can only be scoped by PATH — its
// .github/secret_scanning.yml has a single `paths-ignore` knob, with no per-secret
// or per-source option (issue #286). So provenance is encoded structurally, as the
// folder a page lives in:
//   data/server-fetched/ — recorded by the auto-extractor pipeline via ScraperAPI
//                          (.claudinite/local_packs/extractor-pipeline/run_daily/create-extractor/3-prepare.sh).
//                          These are third-party pages — they can embed the SITE's
//                          own tokens (e.g. a Mapbox key in the markup), never our
//                          or a user's secret — so .github/secret_scanning.yml
//                          excludes this folder from secret scanning + push
//                          protection (a block here would only wedge the pipeline).
//   data/user-submitted/ — HTML supplied by a user/developer (e.g. when the CI
//                          datacenter is bot-blocked from the target site). This is
//                          deliberately NOT excluded: a hand-supplied page could
//                          carry a REAL secret, so push protection stays on here.
//
// A case names only the basename of its page; the suite shouldn't care which folder
// holds it, so this looks in each and returns the first hit — falling back to the
// server-fetched path for a not-found file so a "missing fixture" error reads
// sensibly (and points at where the pipeline records pages).
const fs = require("node:fs");
const path = require("node:path");

const DATA_ROOT = path.join(__dirname, "data");
// server-fetched first: the common case, and the not-found fallback path.
const SUBFOLDERS = ["server-fetched", "user-submitted"];

function dataFile(filename) {
  for (const sub of SUBFOLDERS) {
    const candidate = path.join(DATA_ROOT, sub, filename);
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(DATA_ROOT, SUBFOLDERS[0], filename);
}

module.exports = { DATA_ROOT, SUBFOLDERS, dataFile };
