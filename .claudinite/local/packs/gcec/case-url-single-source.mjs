// gcec local check: a live integration case never declares the page URL itself.
// The rule this converts is the testing-guide skill's "Live integration tests"
// rule — the page URL lives ONLY in `dev/requirements/extractor/data/<provenance>/
// <name>.url`, the single source of truth the recorder writes and `live.test.js`
// reads; it is never repeated in `expected/<name>.json`.
//
// Why a check and not just prose: the duplicate is INERT, so nothing goes red.
// live.test.js reads exactly three keys off a case object (`description`,
// `referenceNow`, `expected`) and resolves the URL from the sibling `.url` file;
// any other key is silently ignored. So a `"url"` added to a case file — the
// natural thing to write when hand-authoring a case, and what the pre-`.url`
// shape actually looked like — is never read, never asserted, and never printed.
// It just sits there as a second declaration of the one fact, going stale the
// first time the page is re-pointed at a newer event during gardening (the `.url`
// moves, the copy does not), misleading the next reader of the reviewed contract
// about which page the assertions came from.
//
// PARSE, DON'T GREP — this rule is the worked case for it. Every committed case's
// `details` field opens with the link back to the source page (that is what
// buildCalendarUrl puts in the `details=` param), so a text search for the URL
// reports all 36 cases and is useless. Only a url-shaped KEY is the violation, so
// the check parses the JSON and walks its structure. That is also why a string
// value is never inspected: `details`, `location` and `description` may all
// legitimately contain a URL.
//
// Scope is the extractor kind's `expected/*.json` contract files — the JSON the
// recorder writes and the suite deep-equals against. The `cases/*.case.js`
// descriptors beside them are JS modules that reference a page by NAME (`page:
// "meetup-nyc-tech-mixer"`), never by URL, so parsing them would be a second
// mechanism for no second class of violation.
//
// Local-pack check modules are dependency-free on purpose (see
// test-offline-list-sync.mjs's header): plain finding objects, no engine imports,
// so they also load under the repo's own `npm test` (pack.test.mjs).
const id = 'case-url-single-source';
const severity = 'blocking';
const doc = '.claudinite/local/packs/gcec/skills/testing-guide/SKILL.md';
const why =
  'live.test.js reads the page URL only from the sibling .url file — a URL repeated in the ' +
  'case file is never read and goes stale the first time the case is re-pointed';

// The live cases' reviewed contract files.
const CASE_FILE = /^dev\/requirements\/extractor\/expected\/([^/]+)\.json$/;

// A key that declares the page URL. Case, `_` and `-` are noise; the qualifier
// (page/source/event/case) is optional. `urls`, `urlSlug` and the like are NOT
// this declaration and must not fire.
const URL_KEY = /^(page|source|event|case)?url$/;
const isUrlKey = (key) => URL_KEY.test(key.toLowerCase().replace(/[_-]/g, ''));

// Every url-shaped key in the parsed case, as a readable path (`expected.events[0].url`).
function urlKeyPaths(value, path = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => urlKeyPaths(item, `${path}[${i}]`));
  }
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const here = path ? `${path}.${key}` : key;
    // A url-shaped key is the finding wherever it sits; don't also descend into it.
    return isUrlKey(key) ? [{ path: here, key }] : urlKeyPaths(child, here);
  });
}

// 1-based line of a key's first appearance in the raw text, so the finding points
// at the line to delete. Null when the file is minified onto one JSON line.
function lineOfKey(raw, key) {
  const re = new RegExp(`"${key}"\\s*:`);
  const lines = raw.split('\n');
  const i = lines.findIndex((l) => re.test(l));
  return i === -1 || lines.length === 1 ? null : i + 1;
}

export default {
  id,
  severity,
  description: 'a live case file never repeats the page URL — the .url file is the single source',
  doc,
  why,

  run(ctx) {
    return ctx.files.flatMap((file) => {
      const match = CASE_FILE.exec(file);
      if (!match) return [];
      const raw = ctx.read(file);
      if (!raw) return [];
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return []; // an unparseable case fails `npm run test:live` loudly — not this check's finding
      }
      const name = match[1];
      return urlKeyPaths(parsed).map(({ path, key }) => ({
        rule: id,
        severity,
        file,
        line: lineOfKey(raw, key),
        what: `${file} declares a page URL of its own (\`${key}\`) at \`${path}\``,
        why,
        fix:
          `delete \`${path}\` from the case file — the page URL belongs only in ` +
          `dev/requirements/extractor/data/server-fetched/${name}.url (or data/user-submitted/${name}.url), ` +
          'which the recorder writes and live.test.js reads to load the cached HTML at the right hostname',
        doc,
      }));
    });
  },
};
