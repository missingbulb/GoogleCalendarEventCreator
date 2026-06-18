#!/usr/bin/env node
// Pre-flight URL probe for the auto-implement-extractor workflow. Given an event
// URL, fetch it the same way data/refresh-cache.js records pages (shared
// data/fetch-page.js — browser headers, retries), then decide whether the page
// is actually usable as a static test case.
//
// The workflow runs this BEFORE npm ci and the agent. Two ways a page is "not
// usable", both of which mean an agent run would only produce synthetic/
// hand-written coverage — so stop instead and tell the requester:
//   1. The fetch fails outright (non-2xx, DNS failure, timeout, login wall).
//      fetchPage throws; its message (e.g. "HTTP 403") is the reason.
//   2. The fetch returns 2xx but the body is a bot-challenge / CAPTCHA
//      interstitial, not the real page (e.g. StubHub's AWS WAF page, #279).
//      A status-only probe can't see this, so detectChallenge() sniffs the body
//      for known vendor markers + a suspiciously-small size. This is the only
//      soft-200 case we can catch cheaply here; a JS-rendered SPA shell that
//      returns a full-but-empty page still falls through to the agent's
//      judgment step (it bails and the workflow opens no PR).
//
// Exit codes (the reason is on stdout for the workflow to quote in its issue
// comment): 0 = usable (proceed); 1 = fetched but not usable (a 2xx
// bot-challenge / interstitial); 2 = misuse (no URL); 3 = the page couldn't be
// downloaded at all (the fetch threw — non-2xx like 403, DNS failure, timeout,
// login wall). The workflow treats 3 specially: an outright download failure is
// not something a re-run or the agent can fix, so it hands the issue to a human
// (drops the trigger label, adds "human involvement required").
//
// Usage: node tools/new-extractors-creation/probe-url.js "<url>"
"use strict";

const { fetchPage } = require("../../data/fetch-page");

// Real event pages are tens to hundreds of KB. A 2xx body smaller than this is
// almost never a real page — it's an interstitial/stub — so treat it as a
// challenge even when no named marker matches (a backstop for unknown vendors).
const MIN_REAL_PAGE_BYTES = 1500;

// Substrings that only appear on a bot-challenge / CAPTCHA / interstitial page,
// not a real event page. Each pairs a vendor name (for the human-readable
// reason) with a marker distinctive enough to keep false positives near zero.
const CHALLENGE_MARKERS = [
  ["AWS WAF", /AwsWafIntegration/i],
  ["AWS WAF", /aws-waf-token/i],
  ["Cloudflare", /Just a moment\.\.\./i],
  ["Cloudflare", /\/cdn-cgi\/challenge-platform\//i],
  ["Cloudflare", /_cf_chl_opt/i],
  ["Cloudflare", /cf-browser-verification/i],
  ["Cloudflare", /Checking your browser before accessing/i],
  ["Imperva/Incapsula", /_Incapsula_Resource/i],
  ["Imperva/PerimeterX", /Pardon Our Interruption/i],
  ["DataDome", /geo\.captcha-delivery\.com/i],
  ["PerimeterX", /px-captcha/i],
  ["reCAPTCHA", /g-recaptcha/i],
  ["hCaptcha", /\bhcaptcha\b/i],
  ["generic interstitial", /Enable JavaScript and cookies to continue/i],
];

// Inspect a fetched 2xx body. Returns a human-readable reason string if it looks
// like a challenge/interstitial rather than a real page, or null if it's usable.
function detectChallenge(html) {
  const body = typeof html === "string" ? html : "";
  for (const [vendor, marker] of CHALLENGE_MARKERS) {
    if (marker.test(body)) {
      return `the page is a bot-challenge / interstitial, not the event page (${vendor} marker found)`;
    }
  }
  if (body.length < MIN_REAL_PAGE_BYTES) {
    return `the response is only ${body.length} bytes — too small to be a real event page (likely an interstitial or empty stub)`;
  }
  return null;
}

function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("probe-url: no URL given");
    process.exit(2);
  }

  fetchPage(url)
    .then((html) => {
      const reason = detectChallenge(html);
      if (reason) {
        console.log(reason);
        process.exit(1);
      }
      console.log(`reachable (2xx, ${html.length} bytes)`);
      process.exit(0);
    })
    .catch((err) => {
      // The page couldn't be downloaded at all (non-2xx like 403, DNS failure,
      // timeout, login/bot wall). Exit 3 so the workflow can route this to a
      // human instead of silently ending green like a soft-200 challenge.
      console.log(`the HTML couldn't be downloaded from the server (${err.message})`);
      process.exit(3);
    });
}

if (require.main === module) {
  main();
}

module.exports = { detectChallenge, CHALLENGE_MARKERS, MIN_REAL_PAGE_BYTES };
