// Recording an event page through ScraperAPI — the project's ONE page-fetching
// surface (the gcec RULES.md extractor-pipeline rule). Lives at the pack root
// rather than inside a task because two tasks need it: `create-extractor` records
// the page for a new request, and `record-page` records any case whose `.url` has
// no committed `.html` yet. Lifting it to their common ancestor keeps one
// implementation of "how this project fetches a page" — swap the vendor here if
// ScraperAPI underperforms, and both tasks follow.
//
// Only usable from a task's `agent_preprocessing` worker: it needs
// SCRAPER_API_KEY, which both tasks name in `required_secrets` — the wiring
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

// Record `pageUrl` to `outPath`. Returns the byte count written, or throws with a
// message written to land verbatim on a GitHub issue — the caller's job is to
// decide whether an unfetchable page is a dead end (hand it to a human) or a
// failure, not to re-diagnose it.
export async function recordPage(key, { url, waitSelector }, outPath, { timeoutMs = 180_000 } = {}) {
  const res = await fetch(scraperUrl(key, url, waitSelector), { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`ScraperAPI returned HTTP ${res.status} for ${url}`);
  const html = await res.text();
  if (!html.trim()) throw new Error(`ScraperAPI returned an empty document for ${url}`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  return statSync(outPath).size;
}
