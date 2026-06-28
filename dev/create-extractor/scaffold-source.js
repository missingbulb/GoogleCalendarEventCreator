// Writes the initial event-extractors/custom/<slug>.js stub for the auto-implement-
// extractor workflow. Everything in the stub is deterministic from the event URL
// (slug, host, matches() regex), so the workflow can scaffold it — and then run
// `npm run index` + register the host — BEFORE the agent runs. The agent's only
// job is then to fill in extract() against the real cached page.
//
// Refuses to overwrite an existing source file (a real extractor must never be
// clobbered by a re-run).
//
//   node dev/create-extractor/scaffold-source.js <event-url>
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { hostname, slugFor, matchesRegexFor, namesFor } = require("./extractor-naming");

// Pure: the source-file text for a URL. The header + matches() are complete; the
// extract() body is a starting point the agent refines against the cached page.
function sourceStub(url) {
  const host = hostname(url);
  const slug = slugFor(url);
  const { caseName } = namesFor(url);
  const matchesRegex = matchesRegexFor(url);
  return `// ${host} event pages: ${url}
//
// TODO(agent): document the page's structure and where each field is read from,
// mirroring event-extractors/custom/meetup.js. The real page is cached at
// dev/requirements/extractor/data/server-fetched/${caseName}.html.
//
// A matched host runs THIS source only — it must produce every field itself; the
// generic fallback extractor does not run for a supported host. Lean on the
// page's own schema.org JSON-LD for the fields your DOM selectors miss via the
// merge() call below (your DOM values win where present).
(() => {
  const { text, firstText, blockText, normalizeDateValue, merge, embeddedEvents } = GCal;

  GCal.sources.push({
    name: "${slug}",
    matches: (host) => ${matchesRegex}.test(host),
    extract() {
      // TODO(agent): refine these selectors against dev/requirements/extractor/data/server-fetched/${caseName}.html, and
      // add location / description / ctz as the page needs them.
      const dom = {
        title: text("h1"),
        start: (() => {
          const el = document.querySelector("time[datetime]");
          return el ? normalizeDateValue(el.getAttribute("datetime")) : "";
        })(),
      };
      return merge(dom, embeddedEvents.toEvent(embeddedEvents.find()[0]));
    },
  });
})();
`;
}

module.exports = { sourceStub };

if (require.main === module) {
  const url = process.argv[2];
  const slug = slugFor(url);
  if (!url || !slug) {
    console.error(`scaffold-source: no usable slug from URL ${JSON.stringify(url)}`);
    process.exit(1);
  }
  const dest = path.join(__dirname, "..", "..", "extension", "event-extractors", "custom", `${slug}.js`);
  if (fs.existsSync(dest)) {
    console.error(`scaffold-source: ${dest} already exists — refusing to overwrite`);
    process.exit(1);
  }
  fs.writeFileSync(dest, sourceStub(url));
  console.log(`scaffold-source: wrote extension/event-extractors/custom/${slug}.js`);
}
