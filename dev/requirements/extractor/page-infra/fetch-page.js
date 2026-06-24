#!/usr/bin/env node
// Shared page fetcher — the single definition of HOW we fetch a target event
// page from an automated environment (browser-like headers, retries, timeout).
//
// Two callers share it so they can never disagree:
//   - dev/requirements/extractor/page-infra/refresh-cache.js  RECORDS a page into the data/ cache.
//   - dev/tools/new-extractors-creation/probe-url.js  PROBES a URL before the
//                             auto-implement-extractor workflow spends an agent run on it.
// Because the probe fetches exactly the way the recorder does, a green probe
// predicts a green record. That matters specifically because event sites reject
// clients that don't look like a browser: a bare `curl` (default User-Agent)
// gets HTTP 403 from hosts that serve a real Chrome UA fine, so a curl-based
// probe would false-reject requests the recorder could actually fulfil.
//
// IP REPUTATION + the whole "get me the real page" job is delegated to ScraperAPI.
// Browser-like headers aren't enough from an automated environment: GitHub Actions
// and Claude Code web egress from DATACENTER IPs that Cloudflare / AWS WAF /
// DataDome block on sight, no matter the User-Agent — the block is the IP, not the
// headers. When SCRAPER_API_KEY is set we route every fetch through ScraperAPI,
// which owns the residential proxy, the bot/CAPTCHA bypass, AND the JS rendering
// (render=true) — so this repo carries NO parallel implementation of any of those.
// We hand it a URL and take back the rendered HTML; if it can't deliver the page
// it returns a non-2xx and we treat that as "can't get this page" (the caller's
// concern, not ours to diagnose). If ScraperAPI ever underperforms, swap the
// vendor here — this one function is the entire fetching surface. With NO key we
// fetch directly (the unchanged path) — a developer's own machine is already on a
// residential IP and needs no key. Every caller (recorder, probe, live tests)
// inherits this for free.
"use strict";

const FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 20_000;
// ScraperAPI proxies the request, renders JS, and retries upstream on its own
// side, so a single call legitimately takes far longer than a direct fetch — give
// it room before AbortSignal fires (their docs recommend a 60s+ client timeout).
const SCRAPER_TIMEOUT_MS = 70_000;
// Event sites tend to reject clients that don't look like a browser.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// The ScraperAPI request URL for a target page, or null when SCRAPER_API_KEY is
// unset/empty (→ fetch directly). `render=true` makes ScraperAPI execute the
// page's JS and return the post-render HTML, so a JS single-page-app records with
// real data instead of an empty shell — that's why this repo needs no SPA-render
// code of its own. URLSearchParams percent-encodes the target, including its own
// `&`/spaces, so its query can't leak up as sibling params.
function scraperApiUrl(url) {
  const key = process.env.SCRAPER_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({ api_key: key, render: "true", url });
  return `https://api.scraperapi.com/?${params}`;
}

// Fetch a URL's HTML, retrying transient failures. Throws (after FETCH_ATTEMPTS)
// on any network error or non-2xx status — callers treat a throw as "can't get
// this page".
async function fetchPage(url) {
  const proxied = scraperApiUrl(url);
  const requestUrl = proxied ?? url;
  const timeoutMs = proxied ? SCRAPER_TIMEOUT_MS : FETCH_TIMEOUT_MS;
  // When proxying, ScraperAPI applies its own browser headers to the target
  // request — we send none of ours to api.scraperapi.com.
  const headers = proxied ? undefined : BROWSER_HEADERS;
  let lastError;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(requestUrl, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
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

module.exports = {
  BROWSER_HEADERS,
  fetchPage,
  scraperApiUrl,
  FETCH_ATTEMPTS,
  FETCH_TIMEOUT_MS,
  SCRAPER_TIMEOUT_MS,
};
