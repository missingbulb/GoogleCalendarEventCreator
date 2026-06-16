#!/usr/bin/env node
// Pre-flight URL probe for the auto-implement-extractor workflow. Given an event
// URL, fetch it the same way data/refresh-cache.js records pages (shared
// data/fetch-page.js — browser headers, retries) and exit 0 only on a 2xx.
//
// The workflow runs this BEFORE npm ci and the agent: if the page can't be
// fetched (non-2xx, DNS failure, timeout, login wall), there's nothing to
// record, so an agent run would only produce synthetic/hand-written coverage —
// stop instead. A throw from fetchPage (which covers non-2xx) is the "stop"
// signal; its message (e.g. "HTTP 403") goes to stderr for the failure comment.
//
// Usage: node tools/probe-url.js "<url>"   # exit 0 = reachable, 1 = not
"use strict";

const { fetchPage } = require("../data/fetch-page");

const url = process.argv[2];

if (!url) {
  console.error("probe-url: no URL given");
  process.exit(2);
}

fetchPage(url)
  .then(() => {
    console.log(`probe-url: ${url} is reachable (2xx)`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`probe-url: ${url} not fetchable — ${err.message}`);
    process.exit(1);
  });
