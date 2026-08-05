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
import regenArtifactsMergeOurs from './regen-artifacts-merge-ours.mjs';
import mergeOursGeneratedOnly from './merge-ours-generated-only.mjs';

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

// regen-artifacts-merge-ours reads .gitattributes out of the fixture tree, so each
// tree pairs the artifacts with the driver list that is supposed to name them. The
// live repo's list, verbatim in shape, is the clean baseline every fixture varies.
const GITATTRIBUTES = [
  '# Generated/derived files — regenerated by `npm run regen`, never hand-merged.',
  '# extension/event-extractors/not-a-real-entry.json merge=ours   <- a comment, not an entry',
  'dev/requirements/extractor/data/**/*.html linguist-vendored',
  'extension/event-extractors/load-order.generated.json                merge=ours',
  'dev/requirements/extractor/generic-coverage/generic-coverage.baseline.GENERATED.json   merge=ours',
  'dev/requirements/popup/cases/*.png                                              merge=ours',
  'dev/requirements/icon/cases/*.png                                               merge=ours',
].join('\n');

const attrCtx = (files, gitattributes = GITATTRIBUTES) => ({
  files,
  allFiles: files,
  read: (p) => (p === '.gitattributes' ? gitattributes : null),
  exists: () => false,
});

test("regen-artifacts-merge-ours: fires on a new image kind's snapshots and on an unlisted generated file", () => {
  const findings = regenArtifactsMergeOurs.run(
    attrCtx([
      // a kind added by the self-contained folder drop kinds.js auto-discovers —
      // .gitattributes still names only popup/ and icon/
      'dev/requirements/badge/cases/badge-states.12.1.png',
      'extension/event-extractors/second-list.generated.json',
    ]),
  );
  assert.equal(findings.length, 2);
  assert.match(findings[0].what, /dev\/requirements\/badge\/cases\/badge-states\.12\.1\.png/);
  // the fix names the DIRECTORY glob for a snapshot, the file itself for a generated one
  assert.match(findings[0].fix, /dev\/requirements\/badge\/cases\/\*\.png merge=ours/);
  assert.match(findings[1].fix, /extension\/event-extractors\/second-list\.generated\.json merge=ours/);
  assert.ok(findings.every((f) => f.severity === 'blocking'));
});

test('regen-artifacts-merge-ours: quiet on the repo\'s real artifact set', () => {
  const findings = regenArtifactsMergeOurs.run(
    attrCtx([
      'extension/event-extractors/load-order.generated.json',
      'dev/requirements/popup/cases/count-label.8.1.png',
      'dev/requirements/icon/cases/toolbar-icon.10.1.png',
      'extension/events-popup/popup.js', // not an artifact at all
      'dev/build/release/store_artifacts/chrome-store-screenshot-1280x800.png', // a PNG outside <kind>/cases/
    ]),
  );
  assert.deepEqual(findings, []);
});

test('regen-artifacts-merge-ours: leaves the GENERATED-marked files to the canon rule', () => {
  // basics/generated-merge-driver owns every name carrying the uppercase marker, so
  // this rule must stay silent on one even with no entry in .gitattributes at all.
  const findings = regenArtifactsMergeOurs.run(
    attrCtx(
      ['dev/requirements/extractor/generic-coverage/generic-coverage.GENERATED.md'],
      '# nothing on the ours driver here',
    ),
  );
  assert.deepEqual(findings, []);
});

test('regen-artifacts-merge-ours: honors a basename-only pattern, and a `*` that must not cross a /', () => {
  // a pattern with no slash matches by basename at any depth (gitignore semantics)
  assert.deepEqual(
    regenArtifactsMergeOurs.run(attrCtx(['dev/requirements/popup/cases/count-label.8.1.png'], '*.png merge=ours')),
    [],
  );
  // a single `*` stops at the separator, so a path pattern does not reach a file
  // one directory deeper — only `**` does
  const deeper = ['extension/event-extractors/load-order.generated.json'];
  assert.equal(regenArtifactsMergeOurs.run(attrCtx(deeper, 'extension/*.generated.json merge=ours')).length, 1);
  assert.deepEqual(regenArtifactsMergeOurs.run(attrCtx(deeper, 'extension/**/*.generated.json merge=ours')), []);
});

test('regen-artifacts-merge-ours: quiet when there are no regen artifacts in scope', () => {
  assert.deepEqual(regenArtifactsMergeOurs.run(attrCtx(['extension/events-popup/popup.js'])), []);
});

// merge-ours-generated-only is the OTHER direction of the same .gitattributes
// list, so it reuses attrCtx and the live repo's driver block verbatim.
const GALLERY = 'dev/requirements/requirements.md';

test('merge-ours-generated-only: fires when a widened pattern pulls the part-authored gallery onto the driver', () => {
  const findings = mergeOursGeneratedOnly.run(
    attrCtx(
      [GALLERY, 'dev/requirements/popup/cases/count-label.8.1.png'],
      `${GITATTRIBUTES}\ndev/requirements/**/* merge=ours`,
    ),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, GALLERY);
  assert.match(findings[0].what, /authored by hand/);
  assert.match(findings[0].what, /dev\/requirements\/\*\*\/\* merge=ours/); // the entry to narrow is named
  assert.match(findings[0].fix, /narrow or remove/);
  assert.equal(findings[0].severity, 'blocking');
});

test('merge-ours-generated-only: fires on a basename-only pattern that reaches an authored file', () => {
  // `*.md merge=ours` looks like it is only for the GENERATED coverage report —
  // with no slash it matches by basename at any depth, so it takes the gallery too.
  const findings = mergeOursGeneratedOnly.run(
    attrCtx(
      [GALLERY, 'dev/requirements/extractor/generic-coverage/generic-coverage.GENERATED.md'],
      '*.md merge=ours',
    ),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, GALLERY); // the GENERATED report beside it is legitimately on the driver
});

test("merge-ours-generated-only: quiet on the repo's real .gitattributes and file set", () => {
  const findings = mergeOursGeneratedOnly.run(
    attrCtx([
      GALLERY, // part-authored prose, deliberately off the driver
      'dev/requirements/popup/cases/count-label.8.1.case.js', // an authored case beside the PNGs the block names
      'extension/event-extractors/load-order.generated.json',
      'dev/requirements/popup/cases/count-label.8.1.png',
      'dev/requirements/icon/cases/toolbar-icon.10.1.png',
      'dev/requirements/extractor/generic-coverage/generic-coverage.GENERATED.md',
      'extension/events-popup/popup.js',
    ]),
  );
  assert.deepEqual(findings, []);
});

test('merge-ours-generated-only: quiet when .gitattributes has no `ours` entries at all', () => {
  assert.deepEqual(
    mergeOursGeneratedOnly.run(attrCtx([GALLERY], '# nothing on the ours driver here')),
    [],
  );
});

test('merge-ours-generated-only: an entry matching no committed file is not a finding', () => {
  // dead weight, or an artifact not created yet — neither can lose anyone's work
  assert.deepEqual(
    mergeOursGeneratedOnly.run(attrCtx([GALLERY], 'docs/handbook.md merge=ours')),
    [],
  );
});
