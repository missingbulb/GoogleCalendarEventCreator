// The extractor for UNSUPPORTED sites — pages whose host has no per-site source
// (pipeline/sources/<site>.js). Its only job is to scrape a best-effort event so
// the popup can pre-fill the "request this source" form on a red-bordered page;
// it never renders calendar buttons (assemble-events.js only calls it when no
// source matched). It is not a "layer" that supported sources lean on: those are
// self-contained.
//
// extract() returns an array of the page's best-effort events (empty when the
// page describes none), which assemble-events.js normalizes and presents. It
// combines two best-effort signals, first non-empty value per field winning:
//   1. events the page embeds about itself (GCal.embeddedEvents — schema.org)
//   2. generic heuristics over the page's meta tags, microdata, <time>, and text
//
// Generic heuristics, each tried against progressively weaker signals:
//   title       og:title meta tag -> the page's <h1> -> document title
//   start/end   microdata (itemprop="startDate"/"endDate", on <meta> or
//               <time> elements) -> event:start_time/end_time meta tags ->
//               the first <time datetime="..."> on the page -> the first
//               date-and-time pattern in the page's visible text
//               ("June 14, 2026 at 7 PM", "14 June 2026", "6/14/2026", ISO)
//   location    itemprop="location" -> <address> -> the first reasonably
//               short element whose class/id mentions "venue" or "location"
//   description og:description or description meta tag ->
//               itemprop="description" (line breaks preserved)
(() => {
  const { clean, text, meta, blockText, bodyText, normalizeDateValue, parseDateFromText, merge, embeddedEvents } = GCal;

  function extract() {
    const embedded = embeddedEvents.find();
    // Several embedded events => a listing page; surface each.
    if (embedded.length > 1) return embedded.map(embeddedEvents.toEvent);

    const event = merge(embeddedEvents.toEvent(embedded[0]), heuristics());
    // The heuristics always fill a title (og:title -> <h1> -> document title),
    // present on essentially every page, so a title alone is not an event. Treat
    // this as an event only when the page embedded one or a date was parsed.
    return embedded.length > 0 || event.start ? [event] : [];
  }

  // Best-effort scrape of any page's meta tags / microdata / text.
  function heuristics() {
    const out = {};

    out.title = meta("og:title") || text("h1") || clean(document.title);

    const startProp = document.querySelector('[itemprop="startDate"]');
    if (startProp) {
      out.start = normalizeDateValue(
        startProp.getAttribute("content") || startProp.getAttribute("datetime") || startProp.textContent
      );
    }
    const endProp = document.querySelector('[itemprop="endDate"]');
    if (endProp) {
      out.end = normalizeDateValue(
        endProp.getAttribute("content") || endProp.getAttribute("datetime") || endProp.textContent
      );
    }
    if (!out.start) {
      out.start = meta("event:start_time");
      out.end = out.end || meta("event:end_time");
    }
    if (!out.start) {
      const timeEl = document.querySelector("time[datetime]");
      if (timeEl) out.start = normalizeDateValue(timeEl.getAttribute("datetime"));
    }
    if (!out.start) {
      out.start = parseDateFromText(bodyText().slice(0, 8000));
    }

    out.location =
      text('[itemprop="location"]') ||
      text("address") ||
      shortText('[class*="venue" i], [class*="location" i], [id*="location" i]');

    // Preserve the description's line breaks rather than flattening it.
    out.description = meta("og:description") || meta("description") || blockText('[itemprop="description"]');

    return out;
  }

  // First element matching `sel` whose text is plausibly a venue string
  // (short, non-empty) rather than a whole section of the page.
  function shortText(sel) {
    for (const el of document.querySelectorAll(sel)) {
      const t = clean(el.textContent);
      if (t && t.length >= 3 && t.length <= 140) return t;
    }
    return "";
  }

  GCal.unsupportedSiteEvents = { extract };
})();
