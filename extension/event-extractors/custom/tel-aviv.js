// tel-aviv.gov.il event pages: https://www.tel-aviv.gov.il/Pages/MainItemPage.aspx?ItemId=14073&ListID=9dd2da03-5c43-462a-b5b2-d087c179b16c&WebID=3af57d92-807c-43c5-8d5f-6fd455eb2776
//
// A SharePoint + AngularJS municipal listing, server-rendered (ScraperAPI) so
// the ng-bound values are already in the markup:
//
//   title       the page's <h1> (rendered twice, identically, for two
//               responsive breakpoints)
//   showings    an event with several performances (a run/exhibition) lists
//               each as a `.childOut` card: a "when" line (`.childDate`, e.g.
//               "5.7.26<br> יום ראשון, 19:00" — day-first D.M.YY plus a Hebrew
//               weekday and clock time) and a "where" line
//               (`.chldLocationDiv`, e.g. "ביתן איל עופר<br>תרס\"ט[שדרות] 6").
//               Each card becomes one entry in the `events` array (same
//               title/description/ctz), which the orchestrator folds into one
//               multi-instance event.
//   description assembled in reading order from three DOM blocks: the price/
//               promotion line (`.benefitDescription`), the long body text
//               (`.benefitRemarks`), and the "important to know" instructions
//               block (`.BenefitInstructions`, with its own heading)
//   ctz         always "Asia/Jerusalem" — a Tel Aviv municipality listing
//
// A one-off event page (no `.childOut` cards) falls back to the page's own
// schema.org JSON-LD for a single start/end/location.
(() => {
  const { clean, text, blockText, merge, embeddedEvents } = GCal;

  // "5.7.26<br> יום ראשון, 19:00" (the <br> renders as a newline via blockText)
  // -> "2026-07-05T19:00:00".
  function parseChildDate(el) {
    const raw = clean(blockText(el).replace(/\n/g, " "));
    const m = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})\D*(\d{1,2}):(\d{2})/);
    if (!m) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${pad(m[2])}-${pad(m[1])}T${pad(m[4])}:${m[5]}:00`;
  }

  // "ביתן איל עופר<br>תרס\"ט[שדרות] 6" -> "ביתן איל עופר, תרס\"ט[שדרות] 6".
  function parseChildLocation(el) {
    return blockText(el).replace(/\n+/g, ", ");
  }

  function childEvents() {
    const title = text("h1");
    return [...document.querySelectorAll(".childOut")]
      .map((card) => {
        const dateEl = card.querySelector(".childDate");
        const locEl = card.querySelector(".chldLocationDiv");
        const start = dateEl ? parseChildDate(dateEl) : "";
        return start ? { title, start, location: locEl ? parseChildLocation(locEl) : "" } : null;
      })
      .filter(Boolean);
  }

  // Angular's ng-bind-html fills these <p>s via innerHTML with a value that
  // itself contains a <div> — which the HTML content model doesn't allow
  // inside a <p>, so the parser (browser or jsdom, same rule) auto-closes the
  // <p> and the actual content lands as its next sibling, leaving the <p>
  // itself empty. Read the sibling instead of the (permanently empty) <p>.
  function siblingBlockText(p) {
    return p && p.nextElementSibling ? blockText(p.nextElementSibling) : "";
  }

  function description() {
    const price = text(".benefitDescription");
    const remarks = siblingBlockText(document.querySelector(".benefitRemarks"));
    const instructionsHeader = text(".BenefitInstructions h3");
    const instructionsBody = siblingBlockText(document.querySelector(".BenefitInstructions .left-data p"));
    const instructions = instructionsBody
      ? [instructionsHeader, instructionsBody].filter(Boolean).join("\n")
      : "";
    return [price, remarks, instructions].filter(Boolean).join("\n\n");
  }

  GCal.sources.push({
    name: "tel-aviv",
    // Anchored to the apex/www host only — NOT "(^|\.)tel-aviv\.gov\.il$" — because
    // visit.tel-aviv.gov.il is a distinct subdomain with its own dedicated source
    // (custom/visit-tel-aviv.js) and its own fallback-lists.json entry; a
    // subdomain-matching regex here would shadow it (this source loads first,
    // alphabetically).
    matches: (host) => /^(www\.)?tel-aviv\.gov\.il$/.test(host),
    extract() {
      const events = childEvents();
      if (events.length) {
        return { events, description: description(), ctz: "Asia/Jerusalem" };
      }
      const dom = { title: text("h1"), description: description(), ctz: "Asia/Jerusalem" };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
