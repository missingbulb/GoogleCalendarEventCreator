// The top-level classifier for the generic FALLBACK extractor — the events
// scraped on a host that has no per-site source (event-extractors/custom/<site>.js).
// It answers two questions: is a scraped event complete enough to present, and
// how should we treat a given host?
//
// Shared (single source of truth) by:
//   - the popup (events-popup/popup.js's chooseContent) — to decide what to render;
//   - the auto-extractor triage (dev/tools/new-extractors-creation/triage-extractor-request.js) — to
//     auto-close a request whose host is already on a list, before spending an
//     agent run.
// So the popup and the workflow can never disagree about a host's listing.
//
// An ES module (imported by the popup and, in Node, by the tool and the tests).
// The host lists themselves live in config.js — the product-decisions module.
import { GCalConfig } from "./config.js";

// A host with no per-site source yields only best-effort guesses, so we present
// a fallback event only when it carries all three main fields — a title, a
// location AND a start time (on at least one of its instances) — not on a date
// alone. Reads the multi-instance `times[]` model, but also tolerates a flat
// { start } event so callers/tests can pass either shape.
export function isPresentableFallbackEvent(event) {
  if (!event || !event.title || !event.location) return false;
  const times = Array.isArray(event.times) ? event.times : [event];
  return times.some((t) => t && t.start);
}

// True when `host` equals `entry` or is a subdomain of it — the same shape of
// host match GCal.isSupportedHost uses for sources.
function hostMatchesList(host, list) {
  return (list || []).some((entry) => host === entry || host.endsWith("." + entry));
}

// The www-stripped host of a URL, or "" when it isn't a parseable http(s) URL
// (a new tab, a chrome:// page, …). Shared by the classifiers below.
function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

// True when `url`'s host already has a dedicated per-site source, per
// config.js's supportedDomains. That list is a static mirror of the sources'
// own matches(); the runtime truth is GCal.isSupportedHost
// (event-extractors/registry.js), which runs the matchers directly. Used ONLY by the
// auto-extractor triage to close a request for a site we already cover before
// spending an agent run. Subdomain-aware, same host match as the allow/deny
// lists. `lists` defaults to the shipped config; tests pass their own.
export function isSupportedDomain(url, lists = GCalConfig) {
  return hostMatchesList(hostFromUrl(url), lists.supportedDomains);
}

// Classify a host against config.js's fallback lists:
//   "deny"  — suppress its fallback events (generic guesses there are noise);
//   "allow" — show them, but don't ask for support (the fallback is trusted);
//   "none"  — on neither list (or an unparseable URL): show them AND invite a
//             support request.
// Deny wins if a host is somehow on both lists. `lists` defaults to the shipped
// config; tests pass their own.
export function classifyHost(url, lists = GCalConfig) {
  const host = hostFromUrl(url);
  if (host === "") return "none"; // no URL yet (new tab) or a non-http(s) URL (chrome://, etc.)
  if (hostMatchesList(host, lists.sourceFallbackDenylist)) return "deny";
  if (hostMatchesList(host, lists.sourceFallbackAllowlist)) return "allow";
  return "none";
}
