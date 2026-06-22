// Secret Tel Aviv event pages: https://www.secrettelaviv.com/tickets/<event-slug>
//
// Expected HTML input (simplified):
//
//   <h1>Event Name @ Venue, City</h1>
//   <div class="post-content">
//     <div class="em em-view-container">
//       <div class="em-event-single">
//         <p>Tue 16 June 2026  | <i>6:30 pm - 10:00 pm</i><br/>...</p>
//       </div>
//     </div>
//     <p><strong>English 🇺🇸</strong></p>
//     <p>Event description text...</p>
//     <hr />
//     ...
//   </div>
//
// Where each field comes from:
//   title       the page's <h1>
//   start/end   text inside the WordPress Events Manager widget first <p>:
//               "16 June 2026 | 6:30 pm - 10:00 pm"
//   location    the part of the <h1> after " @ "
//   description first substantial paragraph inside .post-content before the
//               first <hr> (the one following the event meta widget)
//
(() => {
  const { text, blockText, parseDateFromText } = GCal;

  GCal.sources.push({
    name: "secrettelaviv",
    matches: (host) => /(^|\.)secrettelaviv\.com$/.test(host),
    extract() {
      const title = text("h1");

      // Location: "Event Name @ Venue, City" → "Venue, City"
      const atIdx = title.indexOf(" @ ");
      const location = atIdx >= 0 ? title.slice(atIdx + 3).trim() : "";

      // Date/time from the WordPress Events Manager widget:
      // "Tue 16 June 2026  | <i>6:30 pm - 10:00 pm</i>"
      const eventEl = document.querySelector('[class*="em-event-single"]');
      const datePara = eventEl && eventEl.querySelector("p");
      const dateText = datePara ? datePara.textContent : "";

      const dtMatch = dateText.match(/(\d{1,2}\s+\w+\s+\d{4})\s*\|\s*(\d{1,2}(?::\d{2})?\s*[ap]m)/i);
      if (!dtMatch) return {};
      const start = parseDateFromText(`${dtMatch[1]} ${dtMatch[2]}`);
      if (!start) return {};

      const endMatch = dateText.match(/[–-]\s*(\d{1,2}(?::\d{2})?\s*[ap]m)/i);
      const end = endMatch ? parseDateFromText(`${dtMatch[1]} ${endMatch[1]}`) : "";

      // Description: first substantial paragraph inside em-event-single after the
      // event metadata first <p>, before the first <hr>
      // (skips image-only and short heading paragraphs)
      let description = "";
      let skippedMeta = false;
      for (const el of (eventEl ? eventEl.children : [])) {
        if (!skippedMeta && el.tagName === "P") { skippedMeta = true; continue; }
        if (!skippedMeta) continue;
        if (el.tagName === "HR") break;
        if (el.querySelector("img")) continue;
        const txt = blockText(el);
        if (txt.length > 50) { description = txt; break; }
      }

      return { title, start, end, location, description, ctz: "Asia/Jerusalem" };
    },
  });
})();
