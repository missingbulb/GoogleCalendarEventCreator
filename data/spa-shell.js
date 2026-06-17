// Explicit detection of a JS single-page-app *shell*: an HTTP 200 whose static
// HTML carries none of the event data we extract — only an empty framework root
// that JavaScript would populate at runtime. This is the ONLY signal that
// justifies the headless-render fallback (data/render-page.js), so it must be
// narrow. See issue #310 (visit.tel-aviv.gov.il / #277 is the concrete case: a
// SharePoint/AngularJS SPA whose recorded HTML had only empty Angular bindings).
//
// The trigger is a positive conjunction, NOT "the body is small":
//
//   shouldRender(html) === isSpaShell(html) && !hasExtractableData(html)
//
//   (A) !hasExtractableData — no JSON-LD, no og:title, and little visible text;
//   (B) isSpaShell        — a framework-root / runtime marker is present.
//
// Both must hold, so it never fires on a generic small/error body (no framework
// marker) nor on a content-rich framework page (a fully-rendered Angular page
// matches (B) but has body text, so (A) is false → no render). Named
// bot-challenge pages (Cloudflare "Just a moment", AWS WAF, …) are excluded for
// free: they carry no framework-root marker, so (B) is false — and in the
// auto-extractor flow the probe already stops them upstream. These are cheap
// string checks (no jsdom), matching the probe's detectChallenge style.
"use strict";

// Visible-text length at or above which the static HTML already carries enough
// content to extract generically — so it isn't a data-less shell, even with no
// structured data. (A shell has a near-empty body; a server-rendered page does
// not.)
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

// Does the static HTML already contain something an extractor can use? Structured
// data (JSON-LD / og:title) or enough visible text. If true, there is nothing to
// gain from rendering.
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

// The render decision: a framework shell with no extractable static data.
function shouldRender(html) {
  return isSpaShell(html) && !hasExtractableData(html);
}

module.exports = {
  shouldRender,
  isSpaShell,
  hasExtractableData,
  visibleText,
  TEXT_THRESHOLD,
  SPA_MARKERS,
};
