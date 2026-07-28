// Red-first fixture tests for the gcec pack's checks, runnable by this repo's own
// `npm test` (no imports from the gitignored .claudinite mount — see the check
// module's header). Each rule is shown firing on a violating fixture and staying
// quiet on a clean one.
import test from 'node:test';
import assert from 'node:assert/strict';
import testOfflineListSync from './test-offline-list-sync.mjs';
import scraperapiFetchSurface from './scraperapi-fetch-surface.mjs';
import customSourcesFlat from './custom-sources-flat.mjs';

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

const KEY = 'SCRAPER_API_KEY';
const ENDPOINT = 'api.scraperapi.com';

test('scraperapi-fetch-surface: fires when a workflow other than the scheduler names the key', () => {
  const findings = scraperapiFetchSurface.run(
    treeCtx({
      '.github/workflows/fetch-page.yml': `jobs:\n  fetch:\n    env:\n      KEY: \${{ secrets.${KEY} }}\n`,
      '.github/workflows/claudinite-scheduler.yml': `env:\n  ${KEY}: \${{ secrets.${KEY} }}\n`,
    }),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, '.github/workflows/fetch-page.yml');
  assert.match(findings[0].what, /only the scheduler workflow may carry it/);
  assert.equal(findings[0].severity, 'blocking');
});

test('scraperapi-fetch-surface: fires when fetching code outside the vendor module builds the endpoint', () => {
  const findings = scraperapiFetchSurface.run(
    treeCtx({
      '.claudinite/local/packs/gcec/tasks/create-extractor/prepare.mjs':
        `const res = await fetch(\`https://${ENDPOINT}/?api_key=\${key}\`);\n`,
    }),
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0].what, /builds a api\.scraperapi\.com request itself/);
  assert.match(findings[0].fix, /scraperapi\.mjs/);
});

test('scraperapi-fetch-surface: quiet for the vendor module, its test, comments, and prose', () => {
  const findings = scraperapiFetchSurface.run(
    treeCtx({
      '.claudinite/local/packs/gcec/tasks/create-extractor/scraperapi.mjs':
        `return \`https://${ENDPOINT}/?\${params}\`;\n`,
      '.claudinite/local/packs/gcec/tasks/create-extractor/test/scraperapi.test.js':
        `assert.equal(u.host, "${ENDPOINT}");\n`,
      '.claudinite/local/packs/gcec/tasks/create-extractor/prepare.mjs':
        `// the page fetch goes to ${ENDPOINT} through scraperapi.mjs\nconst x = 1;\n`,
      'dev/procedures/fileDescriptions.md': `Fetches through ${ENDPOINT} using ${KEY}.\n`,
      '.github/workflows/claudinite-scheduler.yml': `env:\n  ${KEY}: \${{ secrets.${KEY} }}\n`,
    }),
  );
  assert.deepEqual(findings, []);
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
