// events.datadoghq.com event pages: https://events.datadoghq.com/events/datadog-live-israel-0626/
//
// Expected HTML input (simplified):
//
//   <h1 class="d2">
//     Virtual Datadog Live Israel
//     <span>with Viber</span>
//   </h1>
//   <section id="about">
//     <h2 class="h1 text-purple-600">Join us virtually on June 23, 2026 at 10:00 AM!</h2>
//     <div class="parse-markdown">
//       <p>We invite you to a virtual event in Hebrew...</p>
//       <p>During the event, Viber will share...</p>
//     </div>
//   </section>
//
// Where each field comes from:
//   title       the page's <h1> (may include a nested <span> for subtitle)
//   start       parsed from the #about h2 text, which contains the full date and
//               time (e.g. "June 23, 2026 at 10:00 AM"); the <time datetime>
//               attribute only carries a midnight-UTC date, not the event time
//   location    hardcoded "Online" — these are virtual events with no venue element
//   description the .parse-markdown block inside #about
//   ctz         hardcoded "Asia/Jerusalem" — agenda times are shown in IDT
//
(() => {
  const { text, blockText, parseDateFromText, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "events-datadoghq",
    matches: (host) => /(^|\.)events\.datadoghq\.com$/.test(host),
    extract() {
      const dom = {
        title: text("h1"),
        start: parseDateFromText(text("#about h2")),
        location: "Online",
        description: blockText("#about .parse-markdown"),
        ctz: "Asia/Jerusalem",
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
