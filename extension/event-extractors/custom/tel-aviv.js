// tel-aviv.gov.il event pages: https://www.tel-aviv.gov.il/Pages/MainItemPage.aspx?ItemId=14073&ListID=9dd2da03-5c43-462a-b5b2-d087c179b16c&WebID=3af57d92-807c-43c5-8d5f-6fd455eb2776
//
// A SharePoint + AngularJS municipal listing, server-rendered (ScraperAPI) so
// the ng-bound values are already in the markup:
//
//   title       the page's <h1> (rendered twice, identically, for two
//               responsive breakpoints)
//   showings    an event with several performances (a run/exhibition), or a
//               festival/listing page bundling several distinct events, lists
//               each as a `.childOut` card: a "when" line (`.childDate`, e.g.
//               "5.7.26<br> יום ראשון, 19:00" — day-first D.M.YY plus a Hebrew
//               weekday and clock time), a "where" line (`.chldLocationDiv`,
//               e.g. "ביתן איל עופר<br>תרס\"ט[שדרות] 6"), and a "what" line
//               (`.chldLinkTitleDiv`). Each card becomes one entry in the
//               `events` array; the orchestrator groups same-titled entries
//               into one multi-instance event, so a run's repeated
//               performances (identical card titles) fold together while a
//               festival's distinct shows (distinct card titles) stay
//               separate. The page's own `<h1>` is used as the shared title
//               only when every card's own title agrees with the others — a
//               single show's cards carry a shorter repeated name than the
//               fuller `<h1>` (kept for that case, matching the reviewed
//               tel-aviv.json baseline); a festival's cards, each a distinct
//               event, are trusted over the `<h1>` (which is also sometimes
//               visually truncated in the markup for a responsive breakpoint,
//               e.g. "...70...").
//   description assembled in reading order from three DOM blocks: the price/
//               promotion line (`.benefitDescription`), the long body text
//               (`.benefitRemarks`), and the "important to know" instructions
//               block (`.BenefitInstructions`, with its own heading)
//   ctz         always "Asia/Jerusalem" — a Tel Aviv municipality listing
//
// A one-off event page (no `.childOut` cards) leaves the single start/end/
// location to the generic base's read of the page's own schema.org JSON-LD.
(() => {
  const { clean, text, blockText } = GCal;

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
    const h1 = text("h1");
    const cards = [...document.querySelectorAll(".childOut")];
    const cardTitles = cards.map((card) => text(".chldLinkTitleDiv", card));
    // Distinct non-empty card titles => a festival/listing page bundling
    // separate events, each trusted with its own title. All-identical (or
    // absent) card titles => one show's repeated performances, kept under the
    // shared (fuller) <h1> title as before.
    const distinct = new Set(cardTitles.filter(Boolean));
    const usePerCardTitle = distinct.size > 1;
    return cards
      .map((card, i) => {
        const dateEl = card.querySelector(".childDate");
        const locEl = card.querySelector(".chldLocationDiv");
        const start = dateEl ? parseChildDate(dateEl) : "";
        const title = (usePerCardTitle && cardTitles[i]) || h1;
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
    // (custom/visit-tel-aviv.js) and its own host-lists.json entry; a
    // subdomain-matching regex here would shadow it (this source loads first,
    // alphabetically).
    matches: (host) => /^(www\.)?tel-aviv\.gov\.il$/.test(host),
    extract() {
      const events = childEvents();
      if (events.length) {
        return { events, description: description(), ctz: "Asia/Jerusalem" };
      }
      return { title: text("h1"), description: description(), ctz: "Asia/Jerusalem" };
    },
  });
})();
