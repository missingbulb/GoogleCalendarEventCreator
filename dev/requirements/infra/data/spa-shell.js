// Explicit detection of a JS single-page-app *shell*: an HTTP 200 whose static
// HTML lacks the event data we extract — only an empty framework root that
// JavaScript would populate at runtime. This is the ONLY signal that justifies
// the headless-render fallback (dev/requirements/infra/data/render-page.js), so it must be narrow. See
// issue #310 (visit.tel-aviv.gov.il / #277 is the concrete case: a SharePoint/
// AngularJS SPA whose recorded HTML had only empty Angular bindings).
//
// TWO different questions, TWO predicates — do NOT conflate them (#328):
//
//   shouldRender(html) === isSpaShell(html) && !hasEventData(html)
//     The render TRIGGER. Render a framework shell that has no machine-readable
//     start date. The date is the event-defining field a static extractor needs
//     and an SPA shell omits; it's also the only language-agnostic signal (the
//     #277 page is Hebrew, so prose-date matching is out). Crucially we do NOT
//     gate on og:title or visible-text length here: a page can carry an og:title
//     (the event *name*) and kilobytes of nav/footer chrome yet still hide every
//     date+venue behind JS — that was the #277 regression (og:title + 1615 chars
//     of menu text made the old shared predicate read "has data" and skipped the
//     render). Named bot-challenge pages carry no framework marker, so isSpaShell
//     is false and they're excluded for free (the probe also stops them upstream).
//
//   hasExtractableData(html)
//     The KEEP question, used by refresh-cache.js's maybeRender (and the
//     CHROME_PATH render test): after rendering, did we gain content worth
//     keeping? Here og:title / JSON-LD / substantial visible text all count as
//     "the render produced something", because any is an improvement over an
//     empty shell. A render is kept only if it improves on the static HTML, so a
//     content-based check is right for KEEP even though it's wrong for TRIGGER.
//
// These are cheap string checks (no jsdom), matching the probe's detectChallenge
// style.
"use strict";

// Visible-text length at or above which rendered HTML carries enough content to
// be worth keeping over an empty shell (the KEEP side only — see hasExtractableData).
const TEXT_THRESHOLD = 500;

// Framework-root / runtime markers that only a JS-rendered app emits. Presence
// of any one means the page is built to be hydrated by JS at runtime.
const SPA_MARKERS = [
  /<app-root[\s>]/i, // Angular
  /\sng-version=/i, // Angular
  /\sng-app[=\s>]/i, // AngularJS
  /\{\{[^{}]+\}\}/, // unrendered Angular/Vue mustache bindings
  /<div[^>]*\sid=["']root["'][^>]*>\s*<\/div>/i, // empty React root
  /<div[^>]*\sid=["']app["'][^>]*>\s*<\/div>/i, // empty Vue root
  /data-reactroot/i, // React
  /id=["']__NEXT_DATA__["']/i, // Next.js
  /window\.__NUXT__/i, // Nuxt
  /window\.__INITIAL_STATE__/i, // common SPA bootstrap
];

// A machine-readable START DATE — the event-defining field. Either a
// <time datetime="YYYY-MM-DD…"> element or a JSON-LD "startDate": "YYYY-MM-DD…".
// ISO-anchored so it's language-agnostic (the #277 page is Hebrew).
const TIME_DATETIME = /<time[^>]+datetime\s*=\s*["']\s*\d{4}-\d{2}-\d{2}/i;
const JSONLD_START_DATE = /["']startDate["']\s*:\s*["']?\s*\d{4}-\d{2}-\d{2}/i;

// Strip scripts/styles/tags and collapse whitespace to approximate the page's
// visible text length. Deliberately crude — we only need "near-empty vs. not".
function visibleText(html) {
  const body = typeof html === "string" ? html : "";
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// TRIGGER side: does the static HTML already carry a usable event start date?
// If so, there is nothing the render needs to recover — don't render. (A name in
// og:title or a body full of site chrome is NOT event data: see #328.)
function hasEventData(html) {
  const body = typeof html === "string" ? html : "";
  return TIME_DATETIME.test(body) || JSONLD_START_DATE.test(body);
}

// KEEP side: does this HTML contain something an extractor can use — structured
// data (JSON-LD / og:title) or enough visible text? Used to decide whether a
// freshly-rendered page improved on the shell, NOT whether to render.
function hasExtractableData(html) {
  const body = typeof html === "string" ? html : "";
  const jsonLd = /<script[^>]+type=["']application\/ld\+json["'][^>]*>\s*[^\s<]/i;
  const ogTitle = /<meta[^>]+property=["']og:title["'][^>]+content=["']\s*[^"'\s]/i;
  if (jsonLd.test(body) || ogTitle.test(body)) return true;
  return visibleText(body).length >= TEXT_THRESHOLD;
}

// Does the page look like a JS-rendered framework shell (marker present)?
function isSpaShell(html) {
  const body = typeof html === "string" ? html : "";
  return SPA_MARKERS.some((re) => re.test(body));
}

// The render decision: a framework shell with no static event date to extract.
function shouldRender(html) {
  return isSpaShell(html) && !hasEventData(html);
}

module.exports = {
  shouldRender,
  isSpaShell,
  hasEventData,
  hasExtractableData,
  visibleText,
  TEXT_THRESHOLD,
  SPA_MARKERS,
};
