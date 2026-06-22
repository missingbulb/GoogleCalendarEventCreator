// Kind: extractor — required explicit support for a host (§11): a dedicated
// per-site extractor, run against a REAL cached page (data/<page>.html), must
// recognize the page as supported and yield a complete event. The case names
// { host, source, page }; the owner-approved expected exact values live in
// expected/<page>.json (live.test.js). Runner: extractor/extractor-support.test.js.
"use strict";

module.exports = { image: false };
