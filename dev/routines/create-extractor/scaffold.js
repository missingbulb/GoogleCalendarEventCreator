// Deterministic scaffolding for the create-extractor routine's prepare stage
// (3-prepare.sh), merged from what used to be three files (scaffold-source /
// scaffold-case / add-supported-domain). Everything here is derivable from the
// event URL + mode before the agent runs; the agent's only job is to fill
// extract() + the case against the real cached page.
//
//   node scaffold.js <mode> <caseName> <host> [event-url]
//     supported : write ONLY the placeholder case for the existing source
//     new       : write the source stub (matches() filled) + the placeholder case,
//                 and register <host> in supportedDomains. (3-prepare then runs
//                 `npm run index`.)
//
// Refuses to overwrite an existing source or case (a real one must never be
// clobbered by a re-run). Pure functions are exported for the unit tests; the CLI
// is just file I/O around them.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { hostname, slugFor, matchesRegexFor, namesFor } = require("./extractor-naming");

const ROOT = path.join(__dirname, "..", "..", "..");
const sourcePath = (slug) => path.join(ROOT, "extension", "event-extractors", "custom", `${slug}.js`);
const casePath = (name) => path.join(ROOT, "dev", "requirements", "extractor", "expected", `${name}.json`);
const LISTS_FILE = path.join(ROOT, "extension", "fallback-lists.json");

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

// Pure: the placeholder case object for a host. Empty `events` means "not filled
// yet" — the routine's quality floor treats a still-empty case as a bail.
function caseStub(host) {
  return {
    description: `${host}: TODO(agent) — one line on what this case tests`,
    expected: { events: [] },
  };
}

// Pure: return `list` with `host` present, sorted and de-duplicated.
function withDomain(list, host) {
  return [...new Set([...(list || []), host])].sort();
}

module.exports = { sourceStub, caseStub, withDomain };

function writeNew(file, contents, label) {
  if (fs.existsSync(file)) {
    console.error(`scaffold: ${file} already exists — refusing to overwrite`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  console.log(`scaffold: wrote ${label}`);
}

if (require.main === module) {
  const [mode, caseName, host = "", url = ""] = process.argv.slice(2);
  if (!mode || !caseName) {
    console.error("scaffold: usage: scaffold.js <mode> <caseName> <host> [event-url]");
    process.exit(1);
  }

  // The placeholder case — both modes.
  writeNew(casePath(caseName), JSON.stringify(caseStub(host), null, 2) + "\n",
    `dev/requirements/extractor/expected/${caseName}.json`);

  if (mode === "new") {
    const slug = slugFor(url);
    if (!url || !slug) {
      console.error(`scaffold: new mode needs a usable event URL (got ${JSON.stringify(url)})`);
      process.exit(1);
    }
    writeNew(sourcePath(slug), sourceStub(url), `extension/event-extractors/custom/${slug}.js`);

    const lists = JSON.parse(fs.readFileSync(LISTS_FILE, "utf8"));
    lists.supportedDomains = withDomain(lists.supportedDomains, host);
    fs.writeFileSync(LISTS_FILE, JSON.stringify(lists, null, 2) + "\n");
    console.log(`scaffold: "${host}" registered in supportedDomains (${lists.supportedDomains.length} total)`);
  }
}
