// Generic fallback for any web page — the safety net when no site-specific
// extractor matches and the page has no (or incomplete) JSON-LD.
//
// Expected HTML input: anything. Each field is tried against progressively
// weaker signals, first hit wins:
//
//   title       og:title meta tag -> the page's <h1> -> document title
//   start/end   microdata (itemprop="startDate"/"endDate", on <meta> or
//               <time> elements) -> event:start_time/end_time meta tags ->
//               the first <time datetime="..."> on the page -> the first
//               date-and-time pattern in the page's visible text
//               ("June 14, 2026 at 7 PM", "14 June 2026", "6/14/2026", ISO)
//   location    itemprop="location" -> <address> -> the first reasonably
//               short element whose class/id mentions "venue" or "location"
//   description og:description or description meta tag ->
//               itemprop="description"
//
// Also decides whether the page lists MULTIPLE events (detectMultiple):
// several JSON-LD events, several schema.org/Event microdata items, or
// several timestamped list/article cards. assemble-events.js then suggests the
// first event and flags it.
(() => {
  const { clean, text, meta, blockText, bodyText, normalizeDateValue, parseDateFromText } = GCal;

  function extract() {
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

  function detectMultiple(jsonLdEventCount) {
    if (jsonLdEventCount > 1) return true;
    const micro = document.querySelectorAll('[itemtype*="schema.org/Event" i]');
    if (micro.length > 1) return true;
    // Heuristic: several sibling "card"-like containers each carrying a
    // machine-readable timestamp usually means an event listing page.
    const times = document.querySelectorAll("article time[datetime], li time[datetime]");
    return times.length > 2;
  }

  GCal.generic = { extract, detectMultiple };
})();
