// Red-first fixture tests for the gcec pack's checks, runnable by this repo's own
// `npm test` (no imports from the gitignored .claudinite mount — see the check
// module's header). Each rule is shown firing on a violating fixture and staying
// quiet on a clean one.
import test from 'node:test';
import assert from 'node:assert/strict';
import testOfflineListSync from './test-offline-list-sync.mjs';
import customSourcesFlat from './custom-sources-flat.mjs';
import npmTestGlobCoverage from './npm-test-glob-coverage.mjs';
import pipelineSiteAgnostic from './pipeline-site-agnostic.mjs';

function ctx({ files = [], pkg }) {
  const disk = new Set([...files, 'package.json']);
  return {
    files,
    read: (p) => (p === 'package.json' ? JSON.stringify(pkg) : null),
    exists: (p) => disk.has(p),
  };
}

const pkgWith = (offline) => ({ scripts: { 'test:offline': `node --test ${offline.join(' ')}` } });

test('test-offline-list-sync: fires when a mirror test is missing from the list', () => {
  const findings = testOfflineListSync.run(
    ctx({
      files: ['extension-test/a.test.js', 'extension-test/b.test.js'],
      pkg: pkgWith(['extension-test/a.test.js']),
    }),
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0].what, /missing extension-test\/b\.test\.js/);
  assert.equal(findings[0].severity, 'blocking');
});

test('test-offline-list-sync: fires when the list names a file that does not exist', () => {
  const findings = testOfflineListSync.run(
    ctx({
      files: ['extension-test/a.test.js'],
      pkg: pkgWith(['extension-test/a.test.js', 'extension-test/gone.test.js']),
    }),
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0].what, /extension-test\/gone\.test\.js, which does not exist/);
});

test('test-offline-list-sync: quiet when list and tree agree (non-mirror entries ignored)', () => {
  const findings = testOfflineListSync.run(
    ctx({
      files: ['extension-test/a.test.js', 'dev/build/test/other.test.js'],
      pkg: pkgWith(['extension-test/a.test.js', 'dev/build/release/shipping-files.test.js']),
    }),
  );
  assert.deepEqual(findings, []);
});

test('test-offline-list-sync: quiet when package.json has no test:offline script', () => {
  const findings = testOfflineListSync.run(
    ctx({ files: ['extension-test/a.test.js'], pkg: { scripts: {} } }),
  );
  assert.deepEqual(findings, []);
});

// A context whose files ARE the keys of a path → content map, for the rules that
// read file text rather than package.json.
const treeCtx = (tree) => ({
  files: Object.keys(tree),
  read: (p) => (p in tree ? tree[p] : null),
  exists: (p) => p in tree,
});

test('custom-sources-flat: fires on a subdirectory, a non-source file, and a pipeline file in custom/', () => {
  const findings = customSourcesFlat.run(
    treeCtx({
      'extension/event-extractors/custom/barby.js': '',
      'extension/event-extractors/custom/shared/util.js': '',
      'extension/event-extractors/custom/README.md': '',
      'extension/event-extractors/custom/generic-extractor.js': '',
    }),
  );
  assert.equal(findings.length, 3);
  assert.match(findings[0].what, /sits in a subdirectory/);
  assert.match(findings[1].what, /is not a per-site source/);
  assert.match(findings[2].what, /is a pipeline file/);
  assert.ok(findings.every((f) => f.severity === 'blocking'));
});

test('custom-sources-flat: quiet on a flat tree of per-site sources beside the pipeline', () => {
  const findings = customSourcesFlat.run(
    treeCtx({
      'extension/event-extractors/custom/barby.js': '',
      'extension/event-extractors/custom/tel-aviv.js': '',
      'extension/event-extractors/generic-extractor.js': '',
      'extension/event-extractors/registry.js': '',
      'extension/event-extractors/helpers/dates.js': '',
      'extension/event-extractors/load-order.generated.json': '',
    }),
  );
  assert.deepEqual(findings, []);
});

// npm-test-glob-coverage reads package.json's `test` (and `test:e2e`) scripts, so its
// fixtures pair a file list with a scripts object — the real shape of both scripts,
// quoted globs included.
const globCtx = (files, scripts) =>
  ctx({ files, pkg: { scripts } });

const SCRIPTS = {
  test: 'node --disable-warning=X --test "extension-test/**/*.test.js" "dev/build/test/**/*.test.js" ".claudinite/local/packs/**/*.test.mjs" "dev/requirements/logic/**/*.test.js" dev/requirements/requirements-coverage.test.js',
  'test:e2e': 'node --test "dev/requirements/heavy/**/*.test.js"',
};

test('npm-test-glob-coverage: fires on a test file no `test` pattern reaches', () => {
  const findings = npmTestGlobCoverage.run(
    globCtx(
      ['extension-test/host-policy.test.js', 'dev/security/csp.test.js'],
      SCRIPTS,
    ),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, 'dev/security/csp.test.js');
  assert.match(findings[0].what, /reached by no pattern/);
  assert.equal(findings[0].severity, 'blocking');
});

test('npm-test-glob-coverage: quiet when every pattern shape reaches its files', () => {
  const findings = npmTestGlobCoverage.run(
    globCtx(
      [
        'extension-test/host-policy.test.js', // `**/` must match ZERO directories too
        'extension-test/events-popup/popup.test.js',
        'dev/build/test/load-order-generated.test.js',
        '.claudinite/local/packs/gcec/pack.test.mjs', // .mjs counts as a test file
        'dev/requirements/logic/product-requirements.test.js',
        'dev/requirements/requirements-coverage.test.js', // a literal path, not a glob
        'extension/host-policy.js', // not a test file at all
      ],
      SCRIPTS,
    ),
  );
  assert.deepEqual(findings, []);
});

test('npm-test-glob-coverage: the heavy e2e suite is exempt via scripts["test:e2e"]', () => {
  const heavy = 'dev/requirements/heavy/extension-load.chrome.test.js';
  assert.deepEqual(npmTestGlobCoverage.run(globCtx([heavy], SCRIPTS)), []);
  // …and only because test:e2e declares it: drop that script and the carve-out goes.
  const findings = npmTestGlobCoverage.run(globCtx([heavy], { test: SCRIPTS.test }));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, heavy);
});

test('npm-test-glob-coverage: quiet when the test script is not a `node --test` runner', () => {
  const findings = npmTestGlobCoverage.run(
    globCtx(['dev/security/csp.test.js'], { test: 'jest' }),
  );
  assert.deepEqual(findings, []);
});

// pipeline-site-agnostic reads the host list out of the repo, so every fixture
// tree carries a host-lists.json — the check follows that declaration, never a
// copy of it.
const HOSTS = JSON.stringify({
  supportedDomains: ['stubhub.com', 'tel-aviv.gov.il', 'visit.tel-aviv.gov.il', 'lu.ma'],
});
const pipelineCtx = (tree) => treeCtx({ 'extension/host-lists.json': HOSTS, ...tree });

test('pipeline-site-agnostic: fires on a host in shipped pipeline code, in the generic extractor and in a helper', () => {
  const findings = pipelineSiteAgnostic.run(
    pipelineCtx({
      'extension/event-extractors/generic-extractor.js':
        'function read(doc) {\n  if (host.endsWith("stubhub.com")) return special(doc);\n  return generic(doc);\n}\n',
      'extension/event-extractors/helpers/derive-timezone.js':
        'const OVERRIDE = { "visit.tel-aviv.gov.il": "Asia/Jerusalem" };\n',
    }),
  );
  assert.equal(findings.length, 2);
  assert.equal(findings[0].file, 'extension/event-extractors/generic-extractor.js');
  assert.equal(findings[0].line, 2); // the blanked comments keep line numbers true
  assert.match(findings[0].what, /names the supported site stubhub\.com/);
  // the longest matching entry wins, not the one it contains
  assert.match(findings[1].what, /visit\.tel-aviv\.gov\.il/);
  assert.ok(findings.every((f) => f.severity === 'blocking'));
});

test('pipeline-site-agnostic: fires on a host hidden in a URL string (the `//` must not read as a comment)', () => {
  const findings = pipelineSiteAgnostic.run(
    pipelineCtx({
      'extension/event-extractors/assemble-events.js':
        'const FEED = "https://lu.ma/api/events";\n',
    }),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 1);
  assert.match(findings[0].what, /lu\.ma/);
});

test('pipeline-site-agnostic: quiet when the sites are only cited in comments, or live in custom/', () => {
  const findings = pipelineSiteAgnostic.run(
    pipelineCtx({
      // citing where a generic pattern was observed is how this codebase records
      // evidence — both comment forms, and one on the same line as real code
      'extension/event-extractors/generic-extractor.js':
        '// or is merely the site\'s domain ("stubhub.com" is not a venue).\n' +
        '/* seen on visit.tel-aviv.gov.il\n   and lu.ma */\n' +
        'const venue = readVenue(doc); // not stubhub.com-specific\n',
      // per-site knowledge belongs here, and this check must never flag it
      'extension/event-extractors/custom/stubhub.js':
        'GCal.sources.push({ matches: (h) => /(^|\\.)stubhub\\.com$/.test(h) });\n',
      // a host-shaped substring is not the host
      'extension/event-extractors/helpers/text.js': 'const s = "notstubhub.combo";\n',
      // non-.js pipeline files are out of scope
      'extension/event-extractors/load-order.generated.json': '["stubhub.com"]',
    }),
  );
  assert.deepEqual(findings, []);
});

test('pipeline-site-agnostic: quiet when the host list is missing or declares nothing', () => {
  const tree = {
    'extension/event-extractors/generic-extractor.js': 'if (h === "stubhub.com") {}\n',
  };
  assert.deepEqual(pipelineSiteAgnostic.run(treeCtx(tree)), []);
  assert.deepEqual(
    pipelineSiteAgnostic.run(treeCtx({ ...tree, 'extension/host-lists.json': '{"supportedDomains":[]}' })),
    [],
  );
});
