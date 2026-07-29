// gcec local check: `npm test` runs everything. Its `test` script is a single
// `node --test` invocation over a hand-kept list of glob patterns — one per test
// directory — so every committed *.test.{js,mjs,cjs} in the repo must be reached
// by one of them. The rule this converts is RULES.md's first testing invariant
// ("`npm test` runs everything ... `test:e2e` (heavy, CI-only)").
//
// Why a check and not just prose: the failure is silent in exactly the way a
// static scan is for. A test file in a directory no pattern reaches is simply
// never run — `node --test` doesn't error on a glob that matches nothing, npm
// exits 0, CI stays green, and the coverage is just gone with nothing red to say
// so. The pattern list has grown one entry at a time (extension-test/,
// dev/build/test/, dev/build/release/, four separate dev/requirements/ subtrees,
// the local pack's tasks, the pack's own .mjs fixtures); the next new test
// directory is one forgotten glob away from that silence.
//
// The one carve-out is READ FROM package.json, never hardcoded: the heavy,
// CI-only e2e suite is deliberately outside `npm test`, and it declares itself
// in `scripts["test:e2e"]`. A file matched by that script's patterns is covered
// by design, so the carve-out follows the e2e suite around instead of pinning a
// path here.
//
// ONE DIRECTION ONLY, on purpose (the same choice as
// extension-test/integration/supported-domains.test.js): a *stale* pattern — one
// matching nothing — is not asserted, because a literal path that no longer
// exists makes `node --test` fail loudly on the next run. Only the silent
// direction needs a guard.
//
// Local-pack check modules are dependency-free on purpose (see
// test-offline-list-sync.mjs's header): plain finding objects, no engine imports,
// so they also load under the repo's own `npm test` (pack.test.mjs). The engine
// already drops the vendored `.claudinite/shared/` canon from ctx.files, so the
// canon's own tests are structurally out of scope and need no exemption here.
const id = 'npm-test-glob-coverage';
const severity = 'blocking';
const doc = '.claudinite/local/packs/gcec/RULES.md';
const why =
  'node --test never errors on a glob that matches nothing — a test file no pattern ' +
  'reaches silently never runs, and npm test still exits 0';

const isTestFile = (p) => /\.test\.(js|mjs|cjs)$/.test(p);

// The file/glob arguments of a `node --test …` script line. Quotes come off (the
// globs are quoted so the shell can't expand them first); the binary and every
// flag drop out. A leftover non-pattern token can only ever fail to match, which
// under-reports rather than false-alarms.
function runnerPatterns(script) {
  if (typeof script !== 'string') return [];
  if (!/(^|\s)--test(\s|$)/.test(script)) return []; // not a glob-driven runner
  return script
    .split(/\s+/)
    .map((t) => t.replace(/^['"]/, '').replace(/['"]$/, ''))
    .filter((t) => t && t !== 'node' && !t.startsWith('-'));
}

const ESCAPE_RE = /[.+^${}()|[\]\\]/g;
const STAR_STAR = '\u0000'; // placeholder for a whole `**` path segment

// A minimal glob → matcher for those patterns, applied per path segment so `**`
// is only special as a segment of its own: `**` spans directories, `*` and `?`
// stay inside one segment. A pattern carrying no wildcard and no file extension
// is a DIRECTORY argument — `node --test <dir>` recurses — so it covers
// everything beneath it.
function toMatcher(pattern) {
  const p = pattern.replace(/\/+$/, '');
  if (!/[*?]/.test(p) && !/\.[a-z0-9]+$/i.test(p)) {
    return (f) => f === p || f.startsWith(`${p}/`);
  }
  const source = p
    .split('/')
    .map((seg) =>
      seg === '**'
        ? STAR_STAR
        : seg.replace(ESCAPE_RE, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]'),
    )
    .join('/')
    // A leading `**/` matches ZERO or more directories — that's what makes
    // extension-test/**/*.test.js cover extension-test/host-policy.test.js too.
    .split(`${STAR_STAR}/`)
    .join('(?:.*/)?')
    .split(`/${STAR_STAR}`)
    .join('(?:/.*)?')
    .split(STAR_STAR)
    .join('.*');
  const re = new RegExp(`^${source}$`);
  return (f) => re.test(f);
}

const matchers = (patterns) => patterns.map(toMatcher);
const anyMatch = (ms, file) => ms.some((m) => m(file));

export default {
  id,
  severity,
  description: "package.json's test script globs reach every committed test file",
  doc,
  why,

  run(ctx) {
    const raw = ctx.read('package.json');
    if (!raw) return [];
    let scripts;
    try {
      scripts = JSON.parse(raw).scripts || {};
    } catch {
      return []; // malformed package.json breaks npm first — not this check's finding
    }

    const covered = matchers(runnerPatterns(scripts.test));
    if (!covered.length) return []; // no glob-driven `test` script — nothing to enforce
    const exempt = matchers(runnerPatterns(scripts['test:e2e']));

    // ctx.files is the whole repo under the engine's default `all` sweep; a
    // --changed run narrows it, which only ever under-reports.
    return ctx.files
      .filter(isTestFile)
      .filter((f) => !anyMatch(covered, f) && !anyMatch(exempt, f))
      .map((file) => ({
        rule: id,
        severity,
        file,
        line: null,
        what: `${file} is reached by no pattern in package.json's \`test\` script`,
        why,
        fix:
          'add a glob covering it to the `test` script in package.json — or, if it is a heavy ' +
          'CI-only test, to `test:e2e` (which this check reads as the declared carve-out)',
        doc,
      }));
  },
};
