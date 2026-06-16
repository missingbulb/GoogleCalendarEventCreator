// AXS event pages: https://www.axs.com/event/<id>-<slug>-tickets
//                   https://www.axs.com/venues/<id>/<slug>-tickets (venue/event listing)
//
// Expected HTML input (simplified):
//
//   <h1>Ohio Bobcats at Penn State Nittany Lions Womens Volleyball</h1>
//   <time datetime="2026-09-12T19:59:00-04:00">...</time>
//   <script id="__NEXT_DATA__" type="application/json">
//     { "props": { "pageProps": { "event": { ... } } } }
//   </script>
//
// Where each field comes from:
//   title       h1 (page heading)
//   start       datetime attr on <time>, or parsed from __NEXT_DATA__
//   location    venue name + address from __NEXT_DATA__, or DOM address block
//   description event description from __NEXT_DATA__
//
// AXS also embeds schema.org JSON-LD — merge() lets that fill any gaps.
(() => {
  const { text, firstText, normalizeDateValue, parseDateFromText, blockText, merge, embeddedEvents, jsonScript, clean } = GCal;

  function nextDataEvent() {
    const d = jsonScript("#__NEXT_DATA__");
    if (!d) return null;
    const pp = d.props && d.props.pageProps;
    return (pp && (pp.event || pp.eventDetails || pp.data)) || null;
  }

  function locationFromNextData(ev) {
    if (!ev) return "";
    const v = ev.venue || ev.Venue || ev.venueName;
    if (!v) return "";
    if (typeof v === "string") return v;
    const parts = [];
    const name = clean(v.name || v.venueName || "");
    const city = clean(v.city || "");
    const state = clean(v.state || v.stateCode || "");
    const address = clean(v.address || v.street || "");
    if (name) parts.push(name);
    if (address) parts.push(address);
    if (city && state) parts.push(`${city}, ${state}`);
    else if (city) parts.push(city);
    return parts.join(", ");
  }

  GCal.sources.push({
    name: "axs",
    matches: (host) => /(^|\.)axs\.com$/.test(host),
    extract() {
      const ev = nextDataEvent();

      const timeEl = document.querySelector("time[datetime]");
      const startRaw = timeEl
        ? normalizeDateValue(timeEl.getAttribute("datetime"))
        : parseDateFromText(
            firstText([
              '[data-testid="event-date"]',
              '[class*="EventDate"]',
              '[class*="event-date"]',
              '[class*="date"]',
            ])
          );

      const dom = {
        title: firstText(["h1", 'h1[data-testid="event-name"]']),
        start: startRaw,
        location:
          locationFromNextData(ev) ||
          firstText([
            '[data-testid="venue-name"]',
            '[class*="VenueName"]',
            '[class*="venue-name"]',
            ".venue-name",
          ]),
        description:
          (ev && clean(ev.description || ev.eventDescription || "")) ||
          blockText('[class*="EventDescription"]') ||
          blockText('[data-testid="event-description"]'),
      };

      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
