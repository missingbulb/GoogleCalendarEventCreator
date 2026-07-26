// Recording an event page through ScraperAPI — the project's ONE page-fetching
// surface (the gcec RULES.md extractor-pipeline rule), beside its only caller.
// Swap the vendor here if ScraperAPI underperforms.
//
// Only usable from a task's `agent_preprocessing` worker: it needs
// SCRAPER_API_KEY, which the task names in `required_secrets` — the wiring
// converge stamps that into the scheduler workflow, so it reaches an Action-side
// worker and nothing else (an executor session holds no repo secrets). This
// sandbox is bot-blocked, so a direct fetch from a session would fail even with
// a key.

import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';

// The ScraperAPI request URL for a page. `render=true` executes the page's JS so a
// single-page app records real content instead of an empty shell; the optional
// wait-for selector (the extension derives it from the live page, #603) makes the
// snapshot wait for real content to appear first. Both are url-encoded, so their
// own &/?/# can never leak as sibling ScraperAPI params.
export function scraperUrl(key, pageUrl, waitSelector) {
  const params = new URLSearchParams({ api_key: key, render: 'true', url: pageUrl });
  if (waitSelector) params.set('wait_for_selector', waitSelector);
  return `https://api.scraperapi.com/?${params}`;
}

// Statuses worth another attempt. ScraperAPI answers **500** when its own proxy
// rotation gave up on a request — routinely transient, and re-requesting the same
// URL often succeeds. 429 is rate limiting; 502/503/504 are their gateway. A 4xx
// other than 429 is about the request itself and never improves on a retry.
//
// This list exists because the retired fetch-page.yml fetched with
// `curl --retry 5 --retry-max-time 300`, and curl's `--retry` covers exactly
// 408/429/500/502/503/504. Porting the fetch to `fetch()` silently dropped that,
// and the first real request through the new pipeline (#759) died on a single 500
// the old workflow would have ridden out.
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Record `pageUrl` to `outPath`. Returns the byte count written, or throws with a
// message written to land verbatim on a GitHub issue — the caller's job is to
// decide whether an unfetchable page is a dead end (hand it to a human) or a
// failure, not to re-diagnose it.
//
// `attempts` bounds the retries; the backoff is short because the whole call sits
// inside a task's `agent_preprocessing_timeout` (a hard SIGKILL), so the worst case
// has to stay well inside it: 4 attempts × 120s + ~50s of waiting. `backoffMs` is
// injectable so the tests exercise the retry path without sleeping through it — a
// suite that really waits 50s to prove a retry is one nobody runs.
export async function recordPage(key, { url, waitSelector }, outPath, { timeoutMs = 120_000, attempts = 4, backoffMs = [5_000, 15_000, 30_000] } = {}) {
  const waits = Array.isArray(backoffMs) ? backoffMs : [backoffMs];
  let lastError = '';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let res = null;
    try {
      res = await fetch(scraperUrl(key, url, waitSelector), { signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      lastError = `the request failed (${e.message})`;   // timeout / socket — always worth a retry
    }
    if (res?.ok) {
      const html = await res.text();
      // An empty body is the page telling us nothing rendered; retrying a
      // successful-but-empty fetch just spends the budget on the same answer.
      if (!html.trim()) throw new Error(`ScraperAPI returned an empty document for ${url}`);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, html);
      return statSync(outPath).size;
    }
    if (res && !RETRYABLE.has(res.status)) {
      throw new Error(`ScraperAPI returned HTTP ${res.status} for ${url}`);
    }
    if (res) lastError = `ScraperAPI returned HTTP ${res.status}`;
    if (attempt < attempts) await sleep(waits[Math.min(attempt - 1, waits.length - 1)]);
  }
  throw new Error(`${lastError} for ${url}, and did not recover in ${attempts} attempts`);
}
