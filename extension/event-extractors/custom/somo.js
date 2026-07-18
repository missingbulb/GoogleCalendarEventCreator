// somo.social event pages: https://somo.social/en/e/anecdotes-presents-advanced-727
//
// The page is a React/Next.js app that server-renders one event, and publishes
// a complete schema.org Event JSON-LD block (name, startDate/endDate with UTC
// offsets, description as markdown, location as a Place). We take start/end
// straight from that embedded event (there is no <time datetime> node in the
// DOM), and override the three fields the DOM states better than the JSON-LD:
//
//   title       the page's first <h1> (the event headline; later <h1>s belong
//               to the cookie-consent dialog)
//   location    the header venue line — an <a> linking to a Google Maps search
//               whose <span> holds the full address ("<venue>, <street>,
//               <city>, <country>"). The JSON-LD location.name is only the bare
//               venue name, with an empty PostalAddress, so the DOM span is the
//               fuller value.
//   description the "About the event" block (EventDescriptionClamp), rendered
//               with the block helpers so its bullet list and links survive as
//               text. The JSON-LD description carries the same copy but as raw
//               markdown (** and [text](url)), so the rendered DOM reads cleaner.
//
// A matched host runs THIS source only — it must produce every field itself; the
// generic fallback extractor does not run for a supported host. The merge() below
// lets these DOM values win, with the page's embedded event filling start/end.
(() => {
  const { text, blockText, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "somo",
    matches: (host) => /(^|\.)somo\.social$/.test(host),
    extract() {
      const dom = {
        title: text("h1"),
        // The pin link at the top of the event header; only that maps anchor
        // wraps the address in a <span> (the "Get directions" buttons don't).
        location: text('a[href*="google.com/maps"] span'),
        // The description block minus its "Read more" button (a sibling).
        description: (() => {
          const el = document.querySelector(
            '[data-sentry-component="EventDescriptionClamp"] > div'
          );
          return el ? blockText(el) : "";
        })(),
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
