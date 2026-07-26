// Eventbrite event pages: https://www.eventbrite.com/e/<slug>-tickets-<id>
// (also country domains like eventbrite.co.uk, eventbrite.de, ...)
//
// Expected HTML input (simplified):
//
//   <h1 class="event-title">Portland Coffee Festival 2026</h1>
//   <time datetime="2026-09-12T10:00:00-07:00" class="date-info__full-datetime">
//     Saturday, September 12, 10 AM – 4 PM PDT
//   </time>
//   <p class="location-info__address">Oregon Convention Center, ...</p>
//   <div class="event-description"> ...description... </div>
//
// Where each field comes from:
//   title       <h1 class="event-title"> (any <h1> as fallback)
//   start       datetime attribute of the first <time>; if absent, parsed
//               from the human-readable date text
//   location    the location-info address block
//   description summary + structuredContent.modules from __NEXT_DATA__; falls
//               back to DOM selectors, then the JSON-LD short description
//
// Eventbrite embeds complete JSON-LD (including endDate), which the generic base
// already reads, so this source only states what the DOM and __NEXT_DATA__ say
// better: the event title, the exact start, the address block, the FULL
// description (JSON-LD carries only a short one), the event's own timezone, and
// the explicit duration. Anything a page's selectors don't match — notably the
// end time — stays as the base read it.
(() => {
  const { firstText, normalizeDateValue, parseDateFromText, clean, jsonScript } = GCal;

  GCal.sources.push({
    name: "eventbrite",
    matches: (host) => /(^|\.)eventbrite\./.test(host),
    extract() {
      const { isValidTimezone, findTimezone, scriptsText } = GCal;
      const timeEl = document.querySelector("time[datetime]");
      const tz = findTimezone(scriptsText(), /"timezone"\s*:\s*"([^"]+)"/);

      const nextData = jsonScript("#__NEXT_DATA__");
      const ctx =
        nextData &&
        nextData.props &&
        nextData.props.pageProps &&
        nextData.props.pageProps.context;

      // Build the full description from __NEXT_DATA__: the short summary plus
      // the structured-content body paragraphs that don't appear in JSON-LD.
      let description = firstText([
        '[data-testid="structured-content"]',
        ".event-description",
        "#event-description",
      ]);
      if (!description && ctx) {
        const summary = (ctx.basicInfo && ctx.basicInfo.summary) || "";
        const modules = (ctx.structuredContent && ctx.structuredContent.modules) || [];
        const bodyHtml = modules.filter((m) => m.type === "text").map((m) => m.text).join("");
        if (bodyHtml) {
          // bodyHtml is page-controlled — parse it inertly with DOMParser (no
          // browsing context: scripts don't run, resources aren't fetched)
          // rather than assigning to a live element's .innerHTML.
          const doc = new DOMParser().parseFromString(bodyHtml, "text/html");
          const paras = [...doc.querySelectorAll("p")]
            .map((p) => clean(p.textContent))
            .filter(Boolean);
          const bodyText = paras.join("\n\n");
          description = summary && bodyText ? `${summary}\n\n${bodyText}` : summary || bodyText;
        } else {
          description = summary;
        }
      }

      const durationSeconds = ctx && ctx.basicInfo && ctx.basicInfo.eventDurationSeconds;
      return {
        title: firstText(["h1.event-title", "h1"]),
        start: timeEl
          ? normalizeDateValue(timeEl.getAttribute("datetime"))
          : parseDateFromText(firstText([".date-info__full-datetime", '[data-testid="dateAndTime"]'])),
        location: firstText([".location-info__address", '[data-testid="location"]']),
        description,
        ctz: isValidTimezone(tz) ? tz : "",
        eventLengthInMinutes: durationSeconds ? Math.round(durationSeconds / 60) : null,
      };
    },
  });
})();
