#!/usr/bin/env node
// Pre-flight URL probe for the auto-implement-extractor workflow. Given an event
// URL, fetch it the same way dev/requirements/extractor/page-infra/refresh-cache.js
// records pages (shared dev/requirements/extractor/page-infra/fetch-page.js — via
// ScraperAPI when SCRAPER_API_KEY is set), then decide whether the page can be
// downloaded at all. Because the probe fetches identically to the recorder, a
// green probe predicts a green record.
//
// The workflow runs this BEFORE npm ci and the agent, to avoid spending an agent
// run on a page that can't be fetched. ScraperAPI owns getting past proxies, bot
// walls, and CAPTCHAs — so this probe does NOT sniff bodies for challenge markers
// any more. There's exactly one not-usable outcome left: the fetch fails outright
// (ScraperAPI couldn't deliver the page → non-2xx, or a network error / timeout),
// fetchPage throws, and its message (e.g. "HTTP 500") is the reason. A page that
// downloads but turns out not to be a single event (a listing/index page) is left
// to the agent's judgment step (it bails and the workflow opens no PR).
//
// Exit codes (the reason is on stdout for the workflow to quote in its issue
// comment): 0 = downloadable (proceed); 2 = misuse (no URL); 3 = the page couldn't
// be downloaded (the fetch threw). Exit 3 isn't fixable by a re-run or the agent,
// so the workflow hands the issue to a human (drops the trigger label, adds
// "extractor-blocked-needs-human", with a "couldn't download the HTML" comment).
//
// Usage: node dev/tools/new-extractors-creation/probe-url.js "<url>"
"use strict";

const { fetchPage } = require("../../requirements/extractor/page-infra/fetch-page");

function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("probe-url: no URL given");
    process.exit(2);
  }

  fetchPage(url)
    .then((html) => {
      console.log(`reachable (2xx, ${html.length} bytes)`);
      process.exit(0);
    })
    .catch((err) => {
      // The page couldn't be downloaded at all — ScraperAPI couldn't deliver it
      // (non-2xx), or a network error / timeout. Exit 3 so the workflow routes
      // this to a human.
      console.log(`the HTML couldn't be downloaded from the server (${err.message})`);
      process.exit(3);
    });
}

if (require.main === module) {
  main();
}

module.exports = { main };
