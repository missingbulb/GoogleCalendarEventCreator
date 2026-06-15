// Bootstraps the shared GCal namespace and the source registry. Loads FIRST in
// the generated load order, and is DOM-free so it runs identically in the page
// (injected content script), the popup, and the service worker.
//
// `GCal.sources` is the registry: each pipeline/sources/<site>.js pushes
//   { name, matches(hostname), extract() }
// onto it, and assemble-events.js runs the first source whose `matches` returns
// true. Each source produces a partial event object with these optional fields:
//   title, location, description : plain strings
//   start, end                   : one of
//       "YYYY-MM-DD"                  -> all-day event
//       "YYYY-MM-DDTHH:MM[:SS]"       -> floating local time
//       full ISO with offset or "Z"   -> exact instant
//   ctz                          : IANA/legacy timezone name (e.g. "GB") to pin
//       a floating start/end to a specific zone regardless of the viewer's own.
//       Must be one of GCal.VALID_TIMEZONES (see helpers/timezones.js). When set,
//       assemble-events.js re-expresses an absolute start/end as the floating
//       local time in that zone via GCal.localizeToZone.
//
// We *augment* any existing globalThis.GCal (Object.assign) rather than
// replacing it, so a helper that loaded first keeps its contributions. The
// `sources` registry is the exception: it's RESET to a fresh array on each
// load. This file is pinned FIRST in the load order (and first in the worker's
// importScripts), so it always runs before any source pushes — the reset can't
// clobber a source's contribution, and it's what makes injection idempotent:
// the popup re-injects the whole pipeline on every open (into a page world that
// persists between opens), so without it each source's `GCal.sources.push(...)`
// would stack a duplicate matcher on every reopen.
//
// `GCal.sourceFallbackDenylist` is set asynchronously by the service worker
// (ui/toolbar-icon.js fetches pipeline/fallback-lists.json at startup).
// It is not available in the page-injection context — extractors don't need it.
// isDeniedHost() reads it at call time via `|| []` so it degrades gracefully.
globalThis.GCal = Object.assign(globalThis.GCal || {}, {
  sources: [],

  // THE single source of truth for "is this page a supported site": its
  // hostname has a registered source whose `matches` returns true. The toolbar
  // service worker (ui/toolbar-icon.js) derives the icon color from this;
  // the popup gets the same answer from the injected extraction result
  // (assemble-events.js reports whether a source matched). DOM-free, so it runs
  // the same in the service worker, the popup, and content-script contexts.
  isSupportedHost(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return GCal.sources.some((s) => s.matches(host));
    } catch (e) {
      return false; // no URL yet (new tab) or a non-http(s) URL (chrome://, etc.)
    }
  },

  // True when the host is on the fallback denylist — the popup suppresses
  // fallback events there, and the toolbar icon shows a gray tile.
  // Reads GCal.sourceFallbackDenylist populated by pipeline/fallback-lists.js.
  isDeniedHost(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return (GCal.sourceFallbackDenylist || []).some(
        (entry) => host === entry || host.endsWith("." + entry)
      );
    } catch (e) {
      return false;
    }
  },
});
