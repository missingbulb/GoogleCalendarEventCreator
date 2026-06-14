// Meetup event pages: https://www.meetup.com/<group>/events/<id>/
//
// Expected HTML input (simplified):
//
//   <h1>Intro to Rust: Hands-on Workshop</h1>
//   <div id="event-info">
//     <time datetime="2026-07-08T18:30:00-04:00">Wed, Jul 8, 6:30 PM</time>
//     <div data-testid="location-info">
//       <a data-testid="venue-name">Brooklyn Public Library</a>
//     </div>
//   </div>
//   <div id="event-details"> ...event description... </div>
//
// Where each field comes from:
//   title       the page's <h1>
//   start       datetime attribute of the first <time> inside #event-info
//               (ISO string, or epoch milliseconds on older pages)
//   location    venue name/info nodes, found by their data-testid attributes
//   description the #event-details section
//
// Meetup also embeds JSON-LD, but its `description` there is only a ~155-char
// truncated snippet (same as the og:description meta tag). The *full* event
// description lives in one of the page's inline JSON state blobs, as a
// `"description":"<markdown>"` string under the event object. When the
// #event-details DOM node isn't present (e.g. server-rendered/cached HTML),
// we read that full string so the calendar gets the complete description
// rather than the snippet the jsonld.js layer would otherwise supply.
//
// Meetup groups (and thus their events) can be based in any timezone. The
// group's IANA timezone name is embedded as plaintext in one of the page's
// inline JSON state blobs, e.g. `"timezone":"America/New_York"`. Since the
// extracted start/end times already carry a UTC offset, this `ctz` mainly
// makes the Calendar event's displayed timezone match the event's own
// (rather than the viewer's), so it's only used when it's a recognized IANA
// name.
(() => {
  const { text, firstText, blockText, normalizeBlock, normalizeDateValue, scriptsText, findTimezone, merge, embeddedEvents } = GCal;

  // The full event description, pulled from the inline JSON state. Meetup
  // embeds it (and several shorter snippets) as JSON-escaped
  // `"description":"..."` strings; the event body is the longest of them, so
  // scan every such value, JSON-parse each to undo the escaping, and keep the
  // longest. Returns "" when none are found.
  function fullDescription(scripts) {
    const re = /"description"\s*:\s*"(?:[^"\\]|\\.)*"/g;
    let best = "";
    let m;
    while ((m = re.exec(scripts))) {
      try {
        const value = JSON.parse(m[0].slice(m[0].indexOf(":") + 1).trim());
        if (typeof value === "string" && value.length > best.length) best = value;
      } catch (e) {
        // not a parseable JSON string; skip it
      }
    }
    return best;
  }

  GCal.sources.push({
    name: "meetup",
    matches: (host) => /(^|\.)meetup\.com$/.test(host),
    extract() {
      const timeEl = document.querySelector(
        "#event-info time[datetime], main time[datetime], time[datetime]"
      );
      const dom = {
        title: text("h1"),
        start: timeEl ? normalizeDateValue(timeEl.getAttribute("datetime")) : "",
        location: firstText([
          '[data-testid="venue-name"]',
          '[data-testid="location-info"]',
          'a[data-testid="venue-link"]',
          '[data-event-label="event-location"]',
        ]),
        // Keep the description's line breaks: render the DOM block (or, when
        // it's only in the inline JSON state, tidy that markdown) with the
        // shared block helpers rather than clean(), which would flatten every
        // newline to a space. The first of the selectors present wins, in order.
        description: (() => {
          const el = ["#event-details", '[data-event-label="body"]', '[data-testid="event-description"]']
            .map((sel) => document.querySelector(sel))
            .find(Boolean);
          return el ? blockText(el) : normalizeBlock(fullDescription(scriptsText()));
        })(),
        ctz: findTimezone(scriptsText(), /"timezone"\s*:\s*"([^"]+)"/),
      };
      // Self-contained: Meetup's own DOM/inline-JSON fields win (notably the
      // FULL description, where the page's embedded data only carries a
      // truncated snippet); the page's embedded event fills the gaps it leaves —
      // the end time, and the venue location on pages whose DOM venue nodes
      // aren't present.
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
