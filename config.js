// config.js — single source of truth for the extension's tunable product
// decisions. Each value here is a deliberate product choice: change it to
// change behavior, and a diff to this file is a diff of product decisions
// (not something buried in a refactor).
//
// An ES module imported by the popup-document scripts that need these values
// (pipeline/build-calendar-url.js, ui/popup.js, ui/views/events-view.js) and,
// in Node, by the tests via dynamic import(). It is never injected into pages
// — the extractors don't read product config — so it stays a plain module
// rather than the GCal-global classic scripts the page injection uses.

// The fallback allow/denylists live in their own JSON file so both this ES
// module and the service worker's classic-script context (which can't import
// ES modules) can read from the same source.  The classic-script wrapper
// pipeline/fallback-lists.js is generated from that JSON by `npm run index`.
import fallbackLists from "./pipeline/fallback-lists.json" with { type: "json" };

export const GCalConfig = {
  // Event length when a page gives a start time but no end. Timed events only;
  // all-day events stay all-day. Applied only at Calendar-URL build time.
  defaultEventDurationMs: 2 * 60 * 60 * 1000,

  // Most events the popup lists from one page; beyond this it shows
  // "Showing first N of M".
  maxEventsShown: 7,

  // Hard cap on the whole Google Calendar template URL; only the trailing
  // details field is trimmed to fit (never the other fields).
  maxEventUrlLength: 6000,

  // Title used when neither the page nor the tab gave one.
  fallbackEventTitle: "New event",

  // Host classifier for the generic FALLBACK extractor — the events scraped on
  // a host that has no per-site source (pipeline/sources/<site>.js). The
  // fallback only ever surfaces an event with a title, a location AND a start
  // time; these two lists then decide what the popup does with it. A host on
  // NEITHER list is "unknown": its fallback events are shown AND the popup
  // offers a "request support for this site" link (so a good page can become a
  // first-class source). These lists override that default:
  //   sourceFallbackAllowlist — trust the fallback here: show its events but
  //     DON'T pester for support (generic extraction already works site-wide).
  //   sourceFallbackDenylist  — generic guesses here are noise (e.g. a news
  //     site where a date in an article reads as an event): never surface a
  //     fallback event; the popup shows "no events found" instead.
  // Matching is by exact host or any subdomain — "example.com" also covers
  // "www.example.com" and "sub.example.com". The default (show fallback events
  // + invite a support request) is the common case; these are the escape
  // hatches you populate as specific hosts warrant.
  //
  // Note meetup.com also has a per-site source, so the popup never consults
  // these lists for it (a supported host short-circuits before classifyHost).
  // Its allowlist entry only lets the auto-extractor triage close a redundant
  // "please support meetup.com" request without spinning up an agent.
  sourceFallbackAllowlist: fallbackLists.allowlist,
  sourceFallbackDenylist: fallbackLists.denylist,

  // Hosts that already have a dedicated per-site source (pipeline/sources/
  // <site>.js). This is NOT a fallback list — it's a static mirror of the
  // sources' own matches(), used ONLY by the auto-extractor triage
  // (tools/triage-extractor-request.js) to close a "please support <host>"
  // request for a site we already cover, before spending an agent run. The
  // runtime never reads it: the extension derives "is this supported?" straight
  // from the sources via GCal.isSupportedHost (pipeline/registry.js). The list
  // can't silently drift from the sources — test/unit/supported-domains.test.js
  // loads the real sources and asserts each entry is matched by a source and
  // each source is matched by an entry.
  supportedDomains: fallbackLists.supportedDomains,
};
