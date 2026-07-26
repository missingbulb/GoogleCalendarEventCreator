// The hosts that are FULLY SUPPORTED by the core generic extractor alone —
// sites whose pages describe themselves well enough (schema.org JSON-LD, Open
// Graph tags, microdata) that generic-extractor.js already produces the reviewed-
// correct event, with nothing left for a per-site extractor to state better.
//
// Each host here registers a source with a `matches` but NO `extract`: the
// pipeline treats it exactly like a host with a dedicated extractor — the
// toolbar icon goes green, GCal.isSupportedHost says yes, and the popup shows
// the events as a supported site's own (no "Suggest Correction" prompt) — while
// assemble-events.js simply has no overrides to merge over the generic base.
// That is the point: a site we fully support does NOT get a per-site file that
// only re-reads what the generic extractor already read.
//
// Promotion works both ways. When a site here starts needing a fix the generic
// extractor can't make site-agnostically, drop its host from this list and add
// event-extractors/custom/<site>.js stating just the fields it gets wrong; when
// an existing custom source shrinks to nothing, delete the file and add its host
// here. Either way the host stays fully supported and its
// extension/fallback-lists.json `supportedDomains` entry stays put.
//
// Loaded AFTER every event-extractors/custom/<site>.js (pinned in the generated
// load order), so a dedicated source always wins the host match if one is ever
// added for a host still listed here.
//
// Lives beside generic-extractor.js rather than in event-extractors/ for the same
// reason it does: that folder is the extensibility point for per-site extractors,
// and this file is the opposite — the list of sites that need none.
(() => {
  const HOSTS = [
    // Every page type (single events, tour and performer listings alike)
    // publishes complete schema.org Event JSON-LD — name, startDate, endDate,
    // location, description — which the generic extractor reads directly, one
    // event per entry on a listing.
    "seetickets.com",
    "stubhub.com",
    "bandsintown.com",
    "dice.fm",
    "dash.datadoghq.com",
    // Machine-generated, obfuscated markup with no stable selectors, so there is
    // nothing site-specific to read: the event name comes from og:title/<h1> and
    // the date from the visible-text scan, exactly as on any other page.
    "facebook.com",
  ];

  for (const host of HOSTS) {
    GCal.sources.push({
      name: host,
      matches: (h) => h === host || h.endsWith("." + host),
    });
  }
})();
