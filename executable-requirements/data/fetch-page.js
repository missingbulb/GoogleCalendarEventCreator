#!/usr/bin/env node
// Shared page fetcher — the single definition of HOW we fetch a target event
// page from an automated environment (browser-like headers, retries, timeout).
//
// Two callers share it so they can never disagree:
//   - executable-requirements/data/refresh-cache.js  RECORDS a page into the data/ cache.
//   - tools/new-extractors-creation/probe-url.js  PROBES a URL before the
//                             auto-implement-extractor workflow spends an agent run on it.
// Because the probe fetches exactly the way the recorder does, a green probe
// predicts a green record. That matters specifically because event sites reject
// clients that don't look like a browser: a bare `curl` (default User-Agent)
// gets HTTP 403 from hosts that serve a real Chrome UA fine, so a curl-based
// probe would false-reject requests the recorder could actually fulfil.
"use strict";

const FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 20_000;
// Event sites tend to reject clients that don't look like a browser.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// Fetch a URL's HTML, retrying transient failures. Throws (after FETCH_ATTEMPTS)
// on any network error or non-2xx status — callers treat a throw as "can't get
// this page".
async function fetchPage(url) {
  let lastError;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < FETCH_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }
  throw new Error(`${lastError.message} (after ${FETCH_ATTEMPTS} attempts)`);
}

module.exports = { BROWSER_HEADERS, fetchPage, FETCH_ATTEMPTS, FETCH_TIMEOUT_MS };
